/**
 * messages.js — Therp Timer Desktop chatter panel
 *
 * Badge strategy
 * ══════════════
 * • For each task we keep the RECENT_COUNT (10) most recent message IDs.
 * • Unseen = recent IDs not yet stored in the per-task "seen" set.
 * • Badge in sidebar   = unseen count per task
 * • Badge total (tray) = sum across all visible tasks
 *
 * Notification strategy
 * ═════════════════════
 * • Background poll runs every N seconds (configured per remote, default 60).
 * • On each poll we compare freshly fetched recent IDs against a stored
 *   "last-notified ID" (the highest ID we have already notified about).
 * • Only message IDs strictly above that watermark trigger a notification.
 * • After notifying we update the watermark → no repeated spam.
 * • Notifications are only sent when the messages window is hidden or the
 *   timer is actively running.
 */

const RECENT_COUNT = 10;

// ─── Minimal JSON-RPC client ──────────────────────────────────────────────────
class Rpc {
  constructor() { this.host = ''; }
  setHost(h) { this.host = h.replace(/\/$/, ''); }
  async send(path, params) {
    const r = await fetch(this.host + path, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
    });
    const j = await r.json();
    if (j.error) { const e = new Error(j.error.data?.message || j.error.message || 'RPC error'); e.data = j.error; throw e; }
    return j.result;
  }
  searchRead(model, domain, fields, extra = {}) {
    return this.send('/web/dataset/search_read', { model, domain, fields, ...extra });
  }
  call(model, method, args, kwargs = {}) {
    return this.send('/web/dataset/call_kw', { model, method, args, kwargs });
  }
}

const rpc = new Rpc();
const api = window.electronAPI;

// ─── Seen / notified storage helpers ─────────────────────────────────────────

/** electron-store key for per-task seen message IDs */
const seenKey       = (id) => `msg_seen_${id}`;
/** electron-store key for per-task highest notified message ID (watermark) */
const notifiedKey   = (id) => `msg_notified_${id}`;
/** electron-store key: show-all-tasks preference */
const SHOW_ALL_KEY  = 'msg_show_all_tasks';

async function getSeenIds(taskId) {
  const v = await api.storage.get(seenKey(taskId), []);
  return Array.isArray(v) ? v : [];
}

async function saveSeenIds(taskId, ids) {
  // Keep at most 200 IDs to avoid bloat
  const trimmed = [...new Set(ids)].slice(-200);
  await api.storage.set(seenKey(taskId), trimmed);
}

async function getNotifiedWatermark(taskId) {
  return Number(await api.storage.get(notifiedKey(taskId), 0));
}

async function saveNotifiedWatermark(taskId, maxId) {
  await api.storage.set(notifiedKey(taskId), maxId);
}

// ─── App state ────────────────────────────────────────────────────────────────
const state = {
  host: '', database: '', datasrc: 'project.task',
  user: null,
  allTasks: [],          // full task list from Odoo
  showAllTasks: false,   // checkbox state
  selectedTask: null,
  messages: [],
  attachmentDetails: {},
  filterType: 'all',
  composeType: 'comment',
  attachment: null,
  composeText: '',
  users: [],
  taskSearch: '',
  unreadMap: {},         // taskId → unseen count from recent RECENT_COUNT
  loading: false,
  loadingMessages: false,
  sending: false,
  windowVisible: true,
};

// ─── DOM helpers ─────────────────────────────────────────────────────────────
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.textContent || '';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const ms = Date.now() - new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function msgClass(msg) {
  const stype = (msg.subtype_id?.[1] || '').toLowerCase();
  if (stype.includes('note') || stype.includes('internal')) return 'msg-note';
  if (msg.message_type === 'notification') return 'msg-system';
  return 'msg-comment';
}

function authorName(msg) {
  return msg.author_id?.[1] || msg.email_from || 'Unknown';
}

// ─── Computed ─────────────────────────────────────────────────────────────────
function visibleTasks() {
  const q = state.taskSearch.toLowerCase();
  let tasks = state.showAllTasks
    ? state.allTasks
    : state.allTasks.filter(t => !state.user?.id || t.user_id?.[0] === state.user.id);
  if (q) tasks = tasks.filter(t => t.name?.toLowerCase().includes(q));
  return tasks;
}

function totalUnread() {
  return visibleTasks().reduce((sum, t) => sum + (state.unreadMap[t.id] || 0), 0);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  state.host     = await api.storage.get('current_host', '');
  state.database = await api.storage.get('current_host_db', '');
  state.datasrc  = await api.storage.get('current_host_datasrc', 'project.task');
  state.showAllTasks = !!(await api.storage.get(SHOW_ALL_KEY, false));

  if (!state.host) {
    renderAll();
    showError('Not connected — log in from the Timer window first.');
    return;
  }

  rpc.setHost(state.host);

  // Resolve current user from stored session
  try {
    const sesRaw = await api.storage.get(state.database, null);
    if (sesRaw) {
      const ses = JSON.parse(sesRaw);
      state.user = { id: ses.uid, name: ses.username || ses.name || 'Me' };
    }
  } catch (_) {}

  wireUI();
  document.addEventListener('visibilitychange', () => {
    state.windowVisible = document.visibilityState === 'visible';
  });

  await Promise.all([loadTasks(), loadUsers()]);
}

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadTasks() {
  state.loading = true;
  renderTaskList();

  try {
    const domain = [
      ['stage_id.name', 'not ilike', '%Done%'],
      ['stage_id.name', 'not ilike', '%Cancel%'],
    ];
    const fields = ['id', 'name', 'project_id', 'user_id', 'stage_id', 'message_ids'];
    const result = await rpc.searchRead(state.datasrc, domain, fields, { limit: 200 });
    state.allTasks = result.records || [];

    // Compute unread counts from stored seen data
    await recomputeAllUnread();
  } catch (e) {
    showError('Failed to load tasks: ' + e.message);
  }

  state.loading = false;
  // Publish total unread so popup-app toolbar badge stays in sync
  await api.storage.set('msg_total_unread', totalUnread());
  renderAll();
}

async function recomputeAllUnread() {
  for (const task of state.allTasks) {
    const recentIds = getRecentIds(task);
    const seenIds   = new Set(await getSeenIds(task.id));
    state.unreadMap[task.id] = recentIds.filter(id => !seenIds.has(id)).length;
  }
}

/** Get the RECENT_COUNT most recent message IDs from a task record */
function getRecentIds(task) {
  const ids = task.message_ids || [];
  // In Odoo, message_ids are ordered newest-first
  return ids.slice(0, RECENT_COUNT);
}

async function loadMessages(task) {
  state.loadingMessages = true;
  renderChatArea();

  try {
    const msgIds = getRecentIds(task);

    if (!msgIds.length) {
      state.messages = [];
      state.loadingMessages = false;
      await markTaskAsSeen(task.id, []);
      renderChatArea();
      return;
    }

    const result = await rpc.searchRead(
      'mail.message', [['id', 'in', msgIds]],
      ['id','author_id','email_from','body','date','message_type','subtype_id','attachment_ids','partner_ids'],
      { limit: RECENT_COUNT, order: 'id asc' }
    );
    state.messages = result.records || [];

    // Fetch attachment details
    const attIds = state.messages.flatMap(m => m.attachment_ids || []);
    if (attIds.length) {
      try {
        const attRes = await rpc.searchRead('ir.attachment',
          [['id','in',attIds]], ['id','name','mimetype','file_size']);
        state.attachmentDetails = Object.fromEntries((attRes.records||[]).map(a => [a.id, a]));
      } catch (_) {}
    }

    // Mark shown messages as seen → resets unread badge for this task
    await markTaskAsSeen(task.id, state.messages.map(m => m.id));
  } catch (e) {
    state.messages = [];
    showError('Error loading messages: ' + e.message);
  }

  state.loadingMessages = false;
  renderAll();
  // Scroll to bottom
  setTimeout(() => {
    const list = $('#messages-list');
    if (list) list.scrollTop = list.scrollHeight;
  }, 50);
}

async function markTaskAsSeen(taskId, messageIds) {
  const existing = await getSeenIds(taskId);
  await saveSeenIds(taskId, [...existing, ...messageIds]);
  state.unreadMap[taskId] = 0;
  await api.storage.set('msg_total_unread', totalUnread());
  renderTaskList();
}

async function markAllRead() {
  if (!state.selectedTask) return;
  const ids = state.messages.map(m => m.id);
  await markTaskAsSeen(state.selectedTask.id, ids);
  renderChatArea();
}

async function loadUsers() {
  try {
    const r = await rpc.searchRead('res.partner', [['active','=',true]],
      ['id','name','email'], { limit: 200 });
    state.users = r.records || [];
  } catch (_) {}
}

// ─── Background polling ───────────────────────────────────────────────────────
let _pollHandle = null;

function startPolling(intervalSec) {
  if (_pollHandle) clearInterval(_pollHandle);
  if (!intervalSec || intervalSec <= 0) return;
  _pollHandle = setInterval(checkNewMessages, intervalSec * 1000);
}

async function checkNewMessages() {
  if (!state.host || !state.allTasks.length) return;

  // Only poll tasks visible to user (respects showAllTasks flag)
  const tasks = visibleTasks();
  if (!tasks.length) return;

  try {
    // Re-fetch message_ids for visible tasks (lightweight — only IDs)
    const taskIds = tasks.map(t => t.id);
    const result  = await rpc.searchRead(
      state.datasrc, [['id','in',taskIds]], ['id','message_ids'], { limit: 200 }
    );
    const freshMap = Object.fromEntries((result.records||[]).map(r => [r.id, r.message_ids || []]));

    for (const task of tasks) {
      const freshIds = (freshMap[task.id] || []).slice(0, RECENT_COUNT);
      if (!freshIds.length) continue;

      // Update the local task's message_ids silently (so getRecentIds stays current)
      const localTask = state.allTasks.find(t => t.id === task.id);
      if (localTask) localTask.message_ids = freshMap[task.id] || [];

      // Recompute unread using fresh IDs
      const seenIds = new Set(await getSeenIds(task.id));
      const unseenIds = freshIds.filter(id => !seenIds.has(id));
      state.unreadMap[task.id] = unseenIds.length;

      // If user is currently viewing this task, auto-mark as seen
      if (state.selectedTask?.id === task.id && state.windowVisible) {
        await markTaskAsSeen(task.id, freshIds);
        // Reload messages to show any new ones
        await loadMessages(task);
        continue;
      }

      // Notification: only fire for IDs above the watermark (never re-notify)
      const watermark   = await getNotifiedWatermark(task.id);
      const maxFreshId  = Math.max(...freshIds);
      const newAboveWatermark = freshIds.filter(id => id > watermark && !seenIds.has(id));

      if (newAboveWatermark.length > 0) {
        // Fetch the newest unseen message body for preview
        const newestId = Math.max(...newAboveWatermark);
        try {
          const msgRes = await rpc.searchRead(
            'mail.message', [['id','=',newestId]],
            ['id','author_id','body','date'], { limit: 1 }
          );
          const msg = msgRes.records?.[0];
          if (msg) {
            const preview = stripHtml(msg.body || '').slice(0, 100);
            const author  = msg.author_id?.[1] || 'Someone';
            await api.showNotification(
              `New message on: ${task.name}`,
              `${author}: ${preview || '(no preview)'}`
            );
          }
        } catch (_) {}

        // Advance watermark to avoid re-notifying same messages
        await saveNotifiedWatermark(task.id, maxFreshId);
      }
    }

    await api.storage.set('msg_total_unread', totalUnread());
    renderTaskList();
  } catch (_) { /* ignore poll errors silently */ }
}

// ─── Send message ─────────────────────────────────────────────────────────────
async function sendMessage() {
  const task = state.selectedTask;
  const text = state.composeText.trim();
  if (!task || !text) return;

  state.sending = true;
  renderChatArea();

  try {
    let attachmentIds = [];

    if (state.attachment) {
      const attId = await rpc.call('ir.attachment', 'create', [{
        name: state.attachment.name,
        datas: state.attachment.base64,
        res_model: state.datasrc,
        res_id: task.id,
      }]);
      attachmentIds = [attId];
    }

    // Parse @mentions
    const mentionMatches = [...text.matchAll(/@([\w][^@\n]*?)(?=\s|$|@)/g)].map(m => m[1].trim());
    const partnerIds = state.users
      .filter(u => mentionMatches.some(n => u.name?.toLowerCase() === n.toLowerCase()))
      .map(u => u.id);

    let body = text.replace(/\n/g, '<br>');
    mentionMatches.forEach(name => {
      const user = state.users.find(u => u.name?.toLowerCase() === name.toLowerCase());
      if (user) {
        body = body.replace(`@${name}`,
          `<a href="#" class="o_mail_redirect" data-oe-id="${user.id}" data-oe-model="res.partner">@${esc(name)}</a>`
        );
      }
    });

    const subtypeXmlid = state.composeType === 'note' ? 'mail.mt_note' : 'mail.mt_comment';
    await rpc.call(state.datasrc, 'message_post', [task.id], {
      body, message_type: 'comment', subtype_xmlid: subtypeXmlid,
      partner_ids: partnerIds, attachment_ids: attachmentIds,
    });

    state.composeText = '';
    state.attachment  = null;

    // Re-fetch the task's message_ids to get the new message in recent list
    const updatedTask = await rpc.searchRead(
      state.datasrc, [['id','=',task.id]], ['message_ids'], { limit: 1 }
    );
    if (updatedTask.records?.[0]) {
      const lt = state.allTasks.find(t => t.id === task.id);
      if (lt) lt.message_ids = updatedTask.records[0].message_ids || [];
    }

    await loadMessages(task);
  } catch (e) {
    showError('Send failed: ' + e.message);
  }

  state.sending = false;
  renderChatArea();
}

// ─── Attachment ───────────────────────────────────────────────────────────────
async function pickAttachment() {
  const file = await api.pickFile();
  if (!file) return;
  state.attachment = file;
  renderChatArea();
}

async function downloadAttachment(attId) {
  const att = state.attachmentDetails[attId];
  const name = att?.name || `attachment-${attId}`;
  try {
    const url  = `${state.host}/web/content/${attId}?download=true`;
    const resp = await fetch(url, { credentials: 'include' });
    const buf  = await resp.arrayBuffer();
    await api.saveRecording(new Uint8Array(buf), name);
  } catch (e) { showError('Download failed: ' + e.message); }
}

// ─── @mention ─────────────────────────────────────────────────────────────────
function handleMentionInput(ta) {
  const text   = ta.value;
  const pos    = ta.selectionStart;
  const before = text.slice(0, pos);
  const match  = before.match(/@([\w]*)$/);
  if (match) {
    const q = match[1].toLowerCase();
    return state.users.filter(u => u.name?.toLowerCase().includes(q)).slice(0, 8);
  }
  return [];
}

function insertMention(user, ta) {
  const val    = ta.value;
  const pos    = ta.selectionStart;
  const before = val.slice(0, pos);
  const after  = val.slice(pos);
  const replaced = before.replace(/@([\w]*)$/, `@${user.name} `);
  ta.value = replaced + after;
  ta.selectionStart = ta.selectionEnd = replaced.length;
  state.composeText = ta.value;
  renderMentionList([]);
  ta.focus();
}

function renderMentionList(users) {
  const ml = $('#mention-list');
  if (!ml) return;
  if (!users.length) { ml.style.display = 'none'; return; }
  ml.innerHTML = users.map(u =>
    `<div class="mention-item" data-id="${u.id}">
       <i class="fa fa-user"></i> ${esc(u.name)}
       ${u.email ? `<span class="mention-email">${esc(u.email)}</span>` : ''}
     </div>`
  ).join('');
  ml.style.display = 'block';
  $$('.mention-item').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const userId = Number(item.dataset.id);
      const user   = state.users.find(u => u.id === userId);
      if (user) insertMention(user, $('#compose-text'));
    });
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderAll() {
  renderTaskList();
  renderChatArea();
}

function renderTaskList() {
  const el  = $('#task-list');
  const cb  = $('#show-all-checkbox');
  if (cb) cb.checked = state.showAllTasks;

  const tasks = visibleTasks();
  const total = totalUnread();

  // Update window title with total unread
  document.title = total > 0
    ? `(${total}) Therp Timer — Messages`
    : 'Therp Timer — Messages';

  if (state.loading) {
    el.innerHTML = '<div class="empty-state"><i class="fa fa-spinner fa-spin"></i> Loading…</div>';
    return;
  }
  if (!tasks.length) {
    el.innerHTML = `<div class="empty-state">${state.allTasks.length ? 'No assigned tasks found.<br><small>Check "Show all tasks" to see more.</small>' : 'No tasks found.'}</div>`;
    return;
  }

  el.innerHTML = tasks.map(t => {
    const unread  = state.unreadMap[t.id] || 0;
    const isNew   = unread > 0;
    const isActive = state.selectedTask?.id === t.id;
    const proj    = t.project_id?.[1] ? `<span class="task-project">${esc(t.project_id[1])}</span>` : '';
    const badge   = isNew
      ? `<span class="unread-badge" title="${unread} unread message${unread>1?'s':''}">${unread}</span>`
      : '';
    return `<div class="task-item${isActive?' active':''}${isNew?' has-unread':''}" data-id="${t.id}">
      <div class="task-item-main">
        <span class="task-item-name">${esc(t.name)}</span>${badge}
      </div>
      ${proj}
    </div>`;
  }).join('');

  $$('.task-item').forEach(el => {
    el.addEventListener('click', () => selectTask(Number(el.dataset.id)));
  });
}

function renderChatArea() {
  const noSel = $('#no-selection');
  const cv    = $('#chat-view');
  if (!state.selectedTask) {
    if (noSel) noSel.style.display = 'flex';
    if (cv)  { cv.style.display = 'none'; }
    return;
  }
  if (noSel) noSel.style.display = 'none';
  if (cv)  { cv.style.display = 'flex'; }

  // Task title
  const link = $('#task-link');
  const unread = state.unreadMap[state.selectedTask.id] || 0;
  if (link) {
    link.textContent = `#${state.selectedTask.id} — ${state.selectedTask.name}`;
    const url = `${state.host}/web#id=${state.selectedTask.id}&model=${state.datasrc}&view_type=form`;
    link.href = url;
    link.onclick = (e) => { e.preventDefault(); api.openExternal(url); };
  }

  // Mark all read button visibility
  const marBtn = $('#mark-all-read-btn');
  if (marBtn) marBtn.style.display = unread > 0 ? 'inline-flex' : 'none';

  // Unread summary in header
  const unreadInfo = $('#unread-info');
  if (unreadInfo) {
    unreadInfo.textContent = unread > 0 ? `${unread} new` : '';
    unreadInfo.style.display = unread > 0 ? 'inline-block' : 'none';
  }

  // Compose area
  const ct = $('#compose-text');
  if (ct && ct.value !== state.composeText && document.activeElement !== ct) {
    ct.value = state.composeText;
  }
  const ap = $('#attachment-preview');
  const an = $('#attach-name');
  if (ap) ap.style.display = state.attachment ? 'flex' : 'none';
  if (an && state.attachment) an.textContent = state.attachment.name;

  // Send button
  const sb = $('#send-btn');
  if (sb) {
    sb.disabled = state.sending;
    sb.innerHTML = state.sending
      ? '<i class="fa fa-spinner fa-spin"></i>'
      : '<i class="fa fa-paper-plane"></i> Send';
  }

  // Type label
  const cl = $('#compose-type-label');
  if (cl) cl.textContent = state.composeType === 'note' ? 'Internal note' : 'Public message';

  renderMessages();
}

function renderMessages() {
  const list = $('#messages-list');
  if (!list) return;

  if (state.loadingMessages) {
    list.innerHTML = '<div class="loading-msg"><i class="fa fa-spinner fa-spin"></i> Loading…</div>';
    return;
  }

  let msgs = state.messages;
  if (state.filterType === 'comment') msgs = msgs.filter(m => !msgClass(m).includes('note') && !msgClass(m).includes('system'));
  if (state.filterType === 'note')    msgs = msgs.filter(m =>  msgClass(m).includes('note'));

  if (!msgs.length) {
    list.innerHTML = '<div class="empty-state">No messages match this filter</div>';
    return;
  }

  list.innerHTML = msgs.map(m => {
    const atts = (m.attachment_ids || []).map(id => {
      const att  = state.attachmentDetails[id];
      const nm   = att?.name || `Attachment #${id}`;
      return `<a class="attachment-chip" data-att="${id}" href="#">
        <i class="fa fa-paperclip"></i> ${esc(nm)}</a>`;
    }).join('');
    return `<div class="msg ${msgClass(m)}">
      <div class="msg-meta">
        <span class="msg-author">${esc(authorName(m))}</span>
        <span class="msg-time" title="${esc(m.date)}">${timeAgo(m.date)}</span>
        ${m.subtype_id?.[1] ? `<span class="msg-type-badge">${esc(m.subtype_id[1])}</span>` : ''}
      </div>
      <div class="msg-body">${m.body || '<em style="color:#aaa">Empty</em>'}</div>
      ${atts ? `<div class="msg-attachments">${atts}</div>` : ''}
    </div>`;
  }).join('');

  list.scrollTop = list.scrollHeight;

  $$('.attachment-chip').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); downloadAttachment(Number(a.dataset.att)); });
  });
}

// ─── Task selection ───────────────────────────────────────────────────────────
async function selectTask(taskId) {
  const task = state.allTasks.find(t => t.id === taskId);
  if (!task) return;
  state.selectedTask = task;
  state.messages     = [];
  state.filterType   = 'all';
  renderAll();
  await loadMessages(task);
}

// ─── Wire UI events ───────────────────────────────────────────────────────────
function wireUI() {
  // Task search
  $('#task-search').addEventListener('input', e => {
    state.taskSearch = e.target.value;
    renderTaskList();
  });

  // Show all tasks checkbox
  const showAllCb = $('#show-all-checkbox');
  if (showAllCb) {
    showAllCb.addEventListener('change', async () => {
      state.showAllTasks = showAllCb.checked;
      await api.storage.set(SHOW_ALL_KEY, state.showAllTasks);
      renderTaskList();
    });
  }

  // Filter pills
  $$('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filterType = btn.dataset.filter;
      renderMessages();
    });
  });

  // Compose type tabs
  $$('.ctab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.ctab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.composeType = btn.dataset.type;
      const cl = $('#compose-type-label');
      if (cl) cl.textContent = state.composeType === 'note' ? 'Internal note' : 'Public message';
    });
  });

  // Compose @mention
  const ta = $('#compose-text');
  if (ta) {
    ta.addEventListener('input', e => {
      state.composeText = e.target.value;
      const results = handleMentionInput(e.target);
      renderMentionList(results);
    });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Escape') renderMentionList([]);
      if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); sendMessage(); }
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mention-list') && !e.target.closest('#compose-text')) {
      renderMentionList([]);
    }
  });

  // Attachment
  $('#attach-btn')?.addEventListener('click', pickAttachment);
  $('#clear-attach')?.addEventListener('click', () => {
    state.attachment = null;
    renderChatArea();
  });

  // Send
  $('#send-btn')?.addEventListener('click', sendMessage);

  // Refresh
  $('#refresh-btn')?.addEventListener('click', async () => {
    await loadTasks();
    if (state.selectedTask) await loadMessages(state.selectedTask);
  });

  // Mark all read
  $('#mark-all-read-btn')?.addEventListener('click', markAllRead);
}

// ─── Error / info toasts ──────────────────────────────────────────────────────
function showError(msg) {
  let b = $('#error-banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'error-banner'; b.className = 'error-banner';
    document.getElementById('root').prepend(b);
  }
  b.textContent = msg; b.style.display = 'block';
  setTimeout(() => { b.style.display = 'none'; }, 6000);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
(async () => {
  await init();

  // Read poll interval from active remote config
  let pollSec = 60;
  try {
    const remotes = await api.storage.get('remote_host_info', []);
    const list    = Array.isArray(remotes)
      ? remotes.map(r => typeof r === 'string' ? JSON.parse(r) : r)
      : [];
    const current = list.find(r => r.url === state.host);
    if (current?.pollInterval) pollSec = Number(current.pollInterval);
  } catch (_) {}

  startPolling(pollSec);
})();
