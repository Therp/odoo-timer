/**
 * messages-app.js — OWL component for the Therp Timer chatter panel.
 *
 * Template source : src/templates/messages_app.xml
 * Compiled output : dist/desktop/renderer/js/templates.js
 *
 * All state, getters and methods here correspond 1-to-1 with what
 * messages_app.xml references via t-*, t-on-*, and inline expressions.
 *
 * To compile the template:
 *   bash scripts/compile_owl_templates.sh --target=desktop
 */

import {
  storage,
  normalizeHost,
} from '../lib/common.js';

const { Component, mount, useState, onMounted, onWillUnmount, markup } = owl;

// ─── Constants ────────────────────────────────────────────────────────────────
const RECENT_COUNT = 10;
const SHOW_ALL_KEY = 'msg_show_all_tasks';

// ─── Storage key helpers ──────────────────────────────────────────────────────
const seenKey      = (id) => `msg_seen_${id}`;
const notifiedKey  = (id) => `msg_notified_${id}`;

// ─── Minimal JSON-RPC helper ──────────────────────────────────────────────────
async function rpcSend(host, path, params) {
  const r = await fetch(host + path, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
  });
  const j = await r.json();
  if (j.error) {
    const e = new Error(j.error.data?.message || j.error.message || 'RPC error');
    e.data = j.error; throw e;
  }
  return j.result;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function stripHtml(html) {
  const d = document.createElement('div'); d.innerHTML = html || '';
  return d.textContent || '';
}

// ─── MessagesApp OWL component ────────────────────────────────────────────────
class MessagesApp extends Component {
  static template = 'MessagesApp';

  // ── Setup ──────────────────────────────────────────────────────────────────
  setup() {
    this.state = useState({
      // session
      host:       '',
      database:   '',
      datasrc:    'project.task',
      user:       null,
      partnerId:  null,   // res.partner id of current user (for follower lookup)
      // task list
      allTasks:     [],   // each task may have followerType: 'assigned'|'follower'
      showAllTasks: false,
      taskSearch:   '',
      unreadMap:    {},
      loading:      false,
      // chat
      selectedTask:      null,
      messages:          [],
      attachmentDetails: {},
      filterType:   'all',
      loadingMessages: false,
      // compose
      composeType:    'comment',
      composeText:    '',
      attachment:     null,
      mentionResults: [],
      sending:        false,
      // users for @mention
      users: [],
    });

    this._pollHandle    = null;
    this._windowVisible = true;

    onMounted(async () => {
      document.addEventListener('visibilitychange', this._onVisibility);
      await this._init();
    });

    onWillUnmount(() => {
      if (this._pollHandle) clearInterval(this._pollHandle);
      document.removeEventListener('visibilitychange', this._onVisibility);
    });
  }

  _onVisibility = () => {
    this._windowVisible = document.visibilityState === 'visible';
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  async _init() {
    this.state.host     = await storage.get('current_host', '');
    this.state.database = await storage.get('current_host_db', '');
    this.state.datasrc  = await storage.get('current_host_datasrc', 'project.task');
    this.state.showAllTasks = !!(await storage.get(SHOW_ALL_KEY, false));

    if (!this.state.host) { this._showError('Not connected — log in from the Timer window first.'); return; }

    // Restore current user from stored session
    try {
      const raw = await storage.get(this.state.database, null);
      if (raw) {
        const ses = JSON.parse(raw);
        this.state.user = { id: ses.uid, name: ses.username || ses.name || 'Me' };
      }
    } catch (_) {}

    // Resolve partner_id for follower queries
    if (this.state.user?.id) {
      try {
        const ur = await this._searchRead('res.users', [['id','=',this.state.user.id]], ['partner_id'], { limit: 1 });
        const pid = ur.records?.[0]?.partner_id;
        this.state.partnerId = Array.isArray(pid) ? pid[0] : pid || null;
      } catch (_) {}
    }

    // Poll interval from active remote
    let pollSec = 60;
    try {
      const remotes = await storage.get('remote_host_info', []);
      const list    = Array.isArray(remotes)
        ? remotes.map(r => typeof r === 'string' ? JSON.parse(r) : r) : [];
      const current = list.find(r => normalizeHost(r.url) === normalizeHost(this.state.host));
      if (current?.pollInterval) pollSec = Number(current.pollInterval);
    } catch (_) {}

    await Promise.all([this._loadTasks(), this._loadUsers()]);
    this._startPolling(pollSec);
  }

  // ── RPC convenience ────────────────────────────────────────────────────────
  _send(path, params)           { return rpcSend(this.state.host, path, params); }
  _searchRead(model, domain, fields, extra = {}) {
    return this._send('/web/dataset/search_read', { model, domain, fields, ...extra });
  }
  _call(model, method, args, kwargs = {}) {
    return this._send('/web/dataset/call_kw', { model, method, args, kwargs });
  }

  // ── Computed getters (referenced in messages_app.xml) ──────────────────────
  get visibleTasks() {
    const q = this.state.taskSearch.toLowerCase();
    let tasks;
    if (this.state.showAllTasks) {
      tasks = this.state.allTasks;
    } else {
      // Show assigned tasks + follower tasks
      tasks = this.state.allTasks.filter(
        (t) => t.followerType === 'follower' ||
               !this.state.user?.id ||
               t.user_id?.[0] === this.state.user.id
      );
    }
    if (q) tasks = tasks.filter((t) => t.name?.toLowerCase().includes(q));
    return tasks;
  }

  /** Label for a task's relationship type. */
  followerLabel(task) {
    return task.followerType === 'follower' ? '👁 Follower' : '👤 Assigned';
  }

  /** CSS class for a task's relationship badge. */
  followerClass(task) {
    return task.followerType === 'follower' ? 'badge-follower' : 'badge-assigned';
  }

  /** Toggle show-all-tasks (used by XML template button). */
  toggleShowAll() {
    this.state.showAllTasks = !this.state.showAllTasks;
    storage.set('msg_show_all_tasks', this.state.showAllTasks);
  }

  /** normalizeText helper accessible from template. */
  normalizeText(val) {
    if (!val) return '';
    if (Array.isArray(val) && val.length >= 2) return String(val[1]);
    if (typeof val === 'object') return String(val.display_name || val.name || '');
    return String(val);
  }

  /** Filter chip CSS classes (avoids inline ternaries in XML). */
  get filterAllClass()     { return this.state.filterType === 'all'     ? 'filter-chip active' : 'filter-chip'; }
  get filterCommentClass() { return this.state.filterType === 'comment' ? 'filter-chip active' : 'filter-chip'; }
  get filterNoteClass()    { return this.state.filterType === 'note'    ? 'filter-chip active' : 'filter-chip'; }

  /** Compose tab CSS classes. */
  get composeCommentClass() { return this.state.composeType === 'comment' ? 'compose-tab active' : 'compose-tab'; }
  get composeNoteClass()    { return this.state.composeType === 'note'    ? 'compose-tab active' : 'compose-tab'; }

  get filteredMessages() {
    const f = this.state.filterType;
    let msgs = this.state.messages;
    if (f === 'comment') msgs = msgs.filter(m => !this.msgClass(m).includes('note') && !this.msgClass(m).includes('system'));
    if (f === 'note')    msgs = msgs.filter(m =>  this.msgClass(m).includes('note'));
    return msgs;
  }

  get composeHint() {
    return this.state.composeType === 'note' ? 'Internal note' : 'Public message';
  }

  get totalUnread() {
    return this.visibleTasks.reduce((s, t) => s + (this.state.unreadMap[t.id] || 0), 0);
  }

  // ── Template helper methods ────────────────────────────────────────────────
  msgClass(msg) {
    const stype = (msg.subtype_id?.[1] || '').toLowerCase();
    if (stype.includes('note') || stype.includes('internal')) return 'msg-note';
    if (msg.message_type === 'notification')                   return 'msg-system';
    return 'msg-comment';
  }

  authorName(msg) { return msg.author_id?.[1] || msg.email_from || 'Unknown'; }

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const ms = Date.now() - new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  getAttachmentName(attId) {
    return this.state.attachmentDetails[attId]?.name || `Attachment #${attId}`;
  }

  /**
   * Wrap msg.body in OWL's markup() so t-out renders it as real HTML
   * instead of escaping it as text. Odoo chatter HTML is server-trusted.
   */
  bodyMarkup(msg) {
    return markup(msg.body || '');
  }

  // ── Task loading ───────────────────────────────────────────────────────────
  /**
   * Load tasks: assigned tasks + tasks where user is a follower.
   * Each task record is annotated with followerType: 'assigned' | 'follower'.
   */
  async _loadTasks() {
    this.state.loading = true;
    try {
      const baseFields = ['id','name','project_id','user_id','stage_id','message_ids'];
      const domain = [['stage_id.name','not ilike','%Done%'], ['stage_id.name','not ilike','%Cancel%']];

      // Assigned / all tasks
      const result = await this._searchRead(this.state.datasrc, domain, baseFields, { limit: 200 });
      const assignedTasks = (result.records || []).map((t) => ({ ...t, followerType: 'assigned' }));
      const assignedIds   = new Set(assignedTasks.map((t) => t.id));

      // Follower tasks: tasks where current partner is a follower
      let followerTasks = [];
      if (this.state.partnerId) {
        try {
          const followerRes = await this._searchRead(
            'mail.followers',
            [['partner_id','=',this.state.partnerId], ['res_model','=',this.state.datasrc]],
            ['res_id'],
            { limit: 300 }
          );
          const followerIds = (followerRes.records || [])
            .map((r) => r.res_id)
            .filter((id) => !assignedIds.has(id));

          if (followerIds.length) {
            const ftRes = await this._searchRead(
              this.state.datasrc,
              [['id','in', followerIds], ...domain],
              baseFields,
              { limit: 200 }
            );
            followerTasks = (ftRes.records || []).map((t) => ({ ...t, followerType: 'follower' }));
          }
        } catch (fe) {
          console.warn('[MessagesApp] Follower lookup failed:', fe.message);
        }
      }

      this.state.allTasks = [...assignedTasks, ...followerTasks];
      await this._recomputeAllUnread();
    } catch (e) { this._showError('Failed to load tasks: ' + e.message); }
    this.state.loading = false;
    await storage.set('msg_total_unread', this.totalUnread);
  }

  async _recomputeAllUnread() {
    for (const task of this.state.allTasks) {
      const recent  = this._recentIds(task);
      const seenSet = new Set(await this._getSeenIds(task.id));
      this.state.unreadMap[task.id] = recent.filter(id => !seenSet.has(id)).length;
    }
  }

  _recentIds(task) { return (task.message_ids || []).slice(0, RECENT_COUNT); }

  async _loadUsers() {
    try {
      const r = await this._searchRead('res.partner', [['active','=',true]], ['id','name','email'], { limit: 200 });
      this.state.users = r.records || [];
    } catch (_) {}
  }

  // ── Seen / notified helpers ────────────────────────────────────────────────
  async _getSeenIds(taskId) {
    const v = await storage.get(seenKey(taskId), []);
    return Array.isArray(v) ? v : [];
  }

  async _saveSeenIds(taskId, ids) {
    await storage.set(seenKey(taskId), [...new Set(ids)].slice(-200));
  }

  async _markTaskAsSeen(taskId, messageIds) {
    const existing = await this._getSeenIds(taskId);
    await this._saveSeenIds(taskId, [...existing, ...messageIds]);
    this.state.unreadMap[taskId] = 0;
    await storage.set('msg_total_unread', this.totalUnread);
  }

  // ── Message loading ────────────────────────────────────────────────────────
  async _loadMessages(task) {
    this.state.loadingMessages = true;
    this.state.messages         = [];
    this.state.attachmentDetails = {};

    try {
      const msgIds = this._recentIds(task);
      if (!msgIds.length) { await this._markTaskAsSeen(task.id, []); this.state.loadingMessages = false; return; }

      const result = await this._searchRead(
        'mail.message', [['id','in',msgIds]],
        ['id','author_id','email_from','body','date','message_type','subtype_id','attachment_ids','partner_ids'],
        { limit: RECENT_COUNT, order: 'id asc' }
      );
      this.state.messages = result.records || [];

      const attIds = this.state.messages.flatMap(m => m.attachment_ids || []);
      if (attIds.length) {
        try {
          const ar = await this._searchRead('ir.attachment', [['id','in',attIds]], ['id','name','mimetype','file_size']);
          this.state.attachmentDetails = Object.fromEntries((ar.records||[]).map(a => [a.id, a]));
        } catch (_) {}
      }

      await this._markTaskAsSeen(task.id, this.state.messages.map(m => m.id));
    } catch (e) { this._showError('Error: ' + e.message); }

    this.state.loadingMessages = false;

    // Scroll after render
    setTimeout(() => {
      const el = document.getElementById('messages-list');
      if (el) el.scrollTop = el.scrollHeight;
    }, 60);
  }

  // ── Background poll ────────────────────────────────────────────────────────
  _startPolling(sec) {
    if (this._pollHandle) clearInterval(this._pollHandle);
    if (sec > 0) this._pollHandle = setInterval(() => this._poll(), sec * 1000);
  }

  async _poll() {
    if (!this.state.allTasks.length) return;
    const tasks = this.visibleTasks;
    if (!tasks.length) return;
    try {
      const ids    = tasks.map(t => t.id);
      const result = await this._searchRead(this.state.datasrc, [['id','in',ids]], ['id','message_ids'], { limit: 200 });
      const fresh  = Object.fromEntries((result.records||[]).map(r => [r.id, r.message_ids||[]]));

      for (const task of tasks) {
        const freshIds  = (fresh[task.id]||[]).slice(0, RECENT_COUNT);
        const lt = this.state.allTasks.find(t => t.id === task.id);
        if (lt) lt.message_ids = fresh[task.id] || [];

        const seenSet = new Set(await this._getSeenIds(task.id));
        this.state.unreadMap[task.id] = freshIds.filter(id => !seenSet.has(id)).length;

        // Auto-refresh if user is currently viewing this task
        if (this.state.selectedTask?.id === task.id && this._windowVisible) {
          await this._markTaskAsSeen(task.id, freshIds);
          await this._loadMessages(task);
          continue;
        }

        // Notify only for IDs above the watermark
        const watermark = Number(await storage.get(notifiedKey(task.id), 0));
        const above     = freshIds.filter(id => id > watermark && !seenSet.has(id));
        if (above.length) {
          const newestId = Math.max(...above);
          try {
            const mr = await this._searchRead('mail.message', [['id','=',newestId]], ['id','author_id','body','date'], { limit: 1 });
            const msg = mr.records?.[0];
            if (msg) {
              const author  = msg.author_id?.[1] || 'Someone';
              const preview = stripHtml(msg.body || '').slice(0, 100);
              await window.electronAPI?.showNotification?.(
                `New message on: ${task.name}`,
                `${author}: ${preview || '(no preview)'}`
              );
            }
          } catch (_) {}
          await storage.set(notifiedKey(task.id), Math.max(...freshIds));
        }
      }
      await storage.set('msg_total_unread', this.totalUnread);
    } catch (_) {}
  }

  // ── Template event handlers ────────────────────────────────────────────────

  // ── Data-attribute event handlers (OWL-safe for all versions) ───────────────

  /** Sidebar task item click — reads task id from data-task-id attribute */
  onTaskItemClick(ev) {
    const id = Number(ev.currentTarget.closest('[data-task-id]')?.dataset?.taskId);
    if (id) this.selectTask(id);
  }

  /** Filter pill click — reads filter value from data-filter attribute */
  onFilterClick(ev) {
    const filter = ev.currentTarget.dataset?.filter;
    if (filter) this.state.filterType = filter;
  }

  /** Compose type tab click — reads type from data-compose-type attribute */
  onComposeTypeClick(ev) {
    const type = ev.currentTarget.dataset?.composeType;
    if (type) this.state.composeType = type;
  }

  /** Attachment chip click — reads attachment id from data-att-id */
  onAttachmentClick(ev) {
    const attId = Number(ev.currentTarget.dataset?.attId);
    if (attId) this.downloadAttachment(attId);
  }

  /** Mention list item click — reads user id from data-user-id */
  onMentionClick(ev) {
    const userId = Number(ev.currentTarget.dataset?.userId);
    const user   = this.state.users.find(u => u.id === userId);
    if (user) this.insertMention(user);
  }

  // ── Core task selection ───────────────────────────────────────────────────

  /** Sidebar task click */
  async selectTask(taskId) {
    const task = this.state.allTasks.find(t => t.id === taskId);
    if (!task) return;
    this.state.selectedTask   = task;
    this.state.messages       = [];
    this.state.filterType     = 'all';
    this.state.composeText    = '';
    this.state.mentionResults = [];
    await this._loadMessages(task);
  }

  /** Open task in browser via Electron shell */
  openTaskInBrowser() {
    if (!this.state.selectedTask) return;
    const url = `${this.state.host}/web#id=${this.state.selectedTask.id}&model=${this.state.datasrc}&view_type=form`;
    window.electronAPI?.openExternal?.(url);
  }

  /** Mark all currently shown messages as read */
  async markAllRead() {
    if (!this.state.selectedTask) return;
    await this._markTaskAsSeen(this.state.selectedTask.id, this.state.messages.map(m => m.id));
  }

  /** Refresh messages for the selected task */
  async refreshMessages() {
    await this._loadTasks();
    if (this.state.selectedTask) await this._loadMessages(this.state.selectedTask);
  }

  /** Show-all-tasks checkbox */
  async onShowAllChange(ev) {
    this.state.showAllTasks = ev.target.checked;
    await storage.set(SHOW_ALL_KEY, this.state.showAllTasks);
  }

  /** Compose type toggle (public / internal note) */
  setComposeType(type) { this.state.composeType = type; }

  /** Compose textarea input — handles @mention lookup */
  handleComposeInput(ev) {
    this.state.composeText = ev.target.value;
    const text   = ev.target.value;
    const pos    = ev.target.selectionStart;
    const before = text.slice(0, pos);
    const match  = before.match(/@([\w]*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      this.state.mentionResults = this.state.users.filter(u => u.name?.toLowerCase().includes(q)).slice(0, 8);
    } else {
      this.state.mentionResults = [];
    }
  }

  /** Ctrl+Enter to send, Escape to close mention list */
  handleComposeKeydown(ev) {
    if (ev.key === 'Escape') { this.state.mentionResults = []; }
    if (ev.key === 'Enter' && ev.ctrlKey) { ev.preventDefault(); this.sendMessage(); }
  }

  /** Insert @mention into compose textarea */
  insertMention(user) {
    const ta     = document.getElementById('compose-text');
    if (!ta) return;
    const before  = ta.value.slice(0, ta.selectionStart);
    const after   = ta.value.slice(ta.selectionStart);
    const replaced = before.replace(/@([\w]*)$/, `@${user.name} `);
    ta.value = replaced + after;
    ta.selectionStart = ta.selectionEnd = replaced.length;
    this.state.composeText    = ta.value;
    this.state.mentionResults = [];
    ta.focus();
  }

  /** File attachment picker */
  async pickAttachment() {
    const file = await window.electronAPI?.pickFile?.();
    if (file) this.state.attachment = file;
  }

  clearAttachment() { this.state.attachment = null; }

  /** Download an attachment by ID */
  async downloadAttachment(attId) {
    const att  = this.state.attachmentDetails[attId];
    const name = att?.name || `attachment-${attId}`;
    try {
      const url  = `${this.state.host}/web/content/${attId}?download=true`;
      const resp = await fetch(url, { credentials: 'include' });
      const buf  = await resp.arrayBuffer();
      await window.electronAPI?.saveRecording?.(new Uint8Array(buf), name);
    } catch (e) { this._showError('Download failed: ' + e.message); }
  }

  /** Post message to Odoo chatter */
  async sendMessage() {
    const task = this.state.selectedTask;
    const text = this.state.composeText.trim();
    if (!task || !text) return;

    this.state.sending = true;
    try {
      let attachmentIds = [];
      if (this.state.attachment) {
        const id = await this._call('ir.attachment', 'create', [{
          name:      this.state.attachment.name,
          datas:     this.state.attachment.base64,
          res_model: this.state.datasrc,
          res_id:    task.id,
        }]);
        attachmentIds = [id];
      }

      // Parse @mentions
      const matched = [...text.matchAll(/@([\w][^@\n]*?)(?=\s|$|@)/g)].map(m => m[1].trim());
      const partnerIds = this.state.users
        .filter(u => matched.some(n => u.name?.toLowerCase() === n.toLowerCase()))
        .map(u => u.id);

      let body = text.replace(/\n/g, '<br>');
      matched.forEach(name => {
        const u = this.state.users.find(u2 => u2.name?.toLowerCase() === name.toLowerCase());
        if (u) body = body.replace(`@${name}`,
          `<a href="#" class="o_mail_redirect" data-oe-id="${u.id}" data-oe-model="res.partner">@${esc(name)}</a>`);
      });

      const xmlid = this.state.composeType === 'note' ? 'mail.mt_note' : 'mail.mt_comment';
      await this._call(this.state.datasrc, 'message_post', [task.id], {
        body, message_type: 'comment', subtype_xmlid: xmlid,
        partner_ids: partnerIds, attachment_ids: attachmentIds,
      });

      this.state.composeText = '';
      this.state.attachment  = null;

      // Re-fetch updated message_ids for this task
      const updated = await this._searchRead(this.state.datasrc, [['id','=',task.id]], ['message_ids'], { limit: 1 });
      if (updated.records?.[0]) {
        const lt = this.state.allTasks.find(t => t.id === task.id);
        if (lt) lt.message_ids = updated.records[0].message_ids || [];
      }
      await this._loadMessages(task);
    } catch (e) { this._showError('Send failed: ' + e.message); }
    this.state.sending = false;
  }

  // ── Error helper ───────────────────────────────────────────────────────────
  _showError(msg) {
    console.error('[MessagesApp]', msg);
    // Use alert.js if available, otherwise console only
    const ca = window.alert;
    if (ca && typeof ca.show === 'function') {
      ca.show(msg, ['OK'], { accentColor: '#e53e3e' });
    }
  }
}

// ─── Mount ────────────────────────────────────────────────────────────────────
const compiledTemplates = globalThis.__THERP_TIMER_TEMPLATES__ || {};

if (!compiledTemplates.MessagesApp) {
  console.warn(
    '[Therp Timer] MessagesApp template not compiled yet.\n' +
    'Run:  bash scripts/compile_owl_templates.sh --target=desktop\n' +
    'Then reload this window.'
  );
  document.getElementById('app').innerHTML =
    `<div style="padding:40px;text-align:center;font-family:sans-serif;color:#666;">
       <p style="font-size:24px">⚙️</p>
       <p><strong>Templates not compiled yet.</strong></p>
       <p style="font-size:13px">Run the following command, then reload:</p>
       <pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:12px;text-align:left;display:inline-block">bash scripts/compile_owl_templates.sh --target=desktop</pre>
     </div>`;
} else {
  mount(MessagesApp, document.getElementById('app'), {
    dev: false,
    templates: compiledTemplates,   // pass full registry from templates.js
  });
}
