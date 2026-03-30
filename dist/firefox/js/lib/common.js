

const browserApi = globalThis.browser || globalThis.chrome;

function getCustomAlert() {
  const alertFn = globalThis.alert;
  if (alertFn && typeof alertFn.show === 'function') {
    return alertFn;
  }
  return null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function notify(message, options = {}) {
  const customAlert = getCustomAlert();
  if (customAlert) {
    await customAlert.show(String(message ?? ''), ['OK'], options);
    return;
  }
  globalThis.alert(String(message ?? ''));
}

export async function confirmDialog(message, options = {}) {
  const customAlert = getCustomAlert();
  if (customAlert) {
    const result = await customAlert.show(String(message ?? ''), ['Cancel', 'OK'], options);
    return result === 'OK';
  }
  return globalThis.confirm(String(message ?? ''));
}

export async function promptDialog(title, defaultValue = '', options = {}) {
  const customAlert = getCustomAlert();
  if (!customAlert) {
    return globalThis.prompt(String(title ?? ''), String(defaultValue ?? ''));
  }

  const inputId = `therp-timer-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const escapedTitle = escapeHtml(title || 'Input');
  const escapedValue = escapeHtml(defaultValue || '');
  const accentColor = options.accentColor || customAlert.accentColor || 'orange';
  const html = `
    <div style="min-width:320px;max-width:520px;text-align:left;">
      <div style="margin-bottom:12px;font-weight:700;font-size:18px;color:#42475a;text-align:center;">${escapedTitle}</div>
      <textarea id="${inputId}" style="width:100%;min-height:180px;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:4px;resize:vertical;font:14px/1.4 Arial,Helvetica,sans-serif;color:#334155;background:#fff;">${escapedValue}</textarea>
    </div>
  `;

  const result = await customAlert.show(html, ['close', 'Save'], { ...options, accentColor });
  if (result !== 'Save') {
    return null;
  }

  const el = document.getElementById(inputId);
  return el ? el.value : String(defaultValue ?? '');
}

export const storage = {

  async get(key, fallback = null) {
    const obj = await browserApi.storage.local.get(key);
    return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback;
  },
  async set(key, value) {
    await browserApi.storage.local.set({ [key]: value });
  },
  async remove(key) {
    await browserApi.storage.local.remove(key);
  },
  async clear() {
    await browserApi.storage.local.clear();
  },
};

export function validURL(str) {
  try {
    const url = new URL(str);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export async function readRemotes() {
  const raw = await storage.get('remote_host_info', []);
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      try { return JSON.parse(item); } catch { return null; }
    }
    return item;
  }).filter(Boolean);
}

export async function writeRemotes(remotes) {
  const payload = remotes.map((r) => JSON.stringify(r));
  await storage.set('remote_host_info', payload);
}

export async function sendTimerStateToBackground(state) {
  try {
    await browserApi.runtime.sendMessage({ TimerActive: state });
  } catch (err) {
    console.warn('Could not notify background', err);
  }
}

export async function clearOdooSessionCookies(host) {
  if (!host) return;
  try {
    const cookies = await browserApi.cookies.getAll({ name: 'session_id', url: host });
    for (const cookie of cookies) {
      await browserApi.cookies.remove({
        url: host,
        name: cookie.name,
        storeId: cookie.storeId,
      });
    }
  } catch (err) {
    console.warn('Could not clear cookies for', host, err);
  }
}

export function normalizeHost(host) {
  if (!host) return '';
  let out = host.trim();
  if (!/^https?:\/\//i.test(out)) out = 'https://' + out;
  return out.replace(/\/$/, '');
}

export function toCSV(rows) {
  if (!rows || !rows.length) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (value) => {
    const text = value == null ? '' : String(value).replace(/"/g, '""');
    return `"${text}"`;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => esc(row[h])).join(','))].join('\n');
}

export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatHoursMins(decimalHours) {
  if (decimalHours == null || Number.isNaN(Number(decimalHours))) return '';
  const value = Number(decimalHours);
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const hours = Math.floor(abs);
  const minutes = Math.round((abs - hours) * 60);
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function priorityStars(priority) {
  const n = Number(priority || 0);
  return n > 0 ? Array.from({ length: n }, (_, i) => i) : [];
}

export function matchesIssue(issue, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    issue.id,
    issue.code,
    issue.name,
    issue.message_summary,
    issue.stage_id?.[1],
    issue.project_id?.[1],
    issue.user_id?.[1],
    issue.priority,
    issue.create_date,
  ].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

export function extractMessageSummary(summary) {
  if (!summary) return '';
  try {
    const match = String(summary).match(/(?=You have)(.*?)(?='><|$)/);
    return match ? match[0] : String(summary).replace(/<[^>]+>/g, ' ');
  } catch {
    return String(summary);
  }
}

export class OdooRpc {
  constructor(host = '') { this.host = host; }
  setHost(host) { this.host = normalizeHost(host); }
  async send(path, params = {}) {
    if (!this.host) throw new Error('No Odoo host selected');
    const response = await fetch(this.host + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    if (!response.ok || payload.error) {
      const err = payload.error || {};
      const msg = err.data?.message || err.message || `HTTP ${response.status}`;
      const e = new Error(msg);
      e.fullTrace = payload.error || payload;
      throw e;
    }
    return payload.result;
  }
  login(db, login, password) {
    return this.send('/web/session/authenticate', { db, login, password });
  }
  getSessionInfo() { return this.send('/web/session/get_session_info', {}); }
  getServerInfo() { return this.send('/web/webclient/version_info', {}); }
  searchRead(model, domain, fields = []) { return this.send('/web/dataset/search_read', { model, domain, fields }); }
  fieldsGet(model, attributes = []) { return this.send('/web/dataset/call_kw', { model, method: 'fields_get', args: [], kwargs: attributes.length ? { attributes } : {} }); }
  call(model, method, args = [], kwargs = {}) { return this.send('/web/dataset/call_kw', { model, method, args, kwargs }); }
  callBtn(model, method, args = [], kwargs = {}) { return this.send('/web/dataset/call_button', { model, method, args, kwargs }); }
  async logout() {
    try { await this.send('/web/session/destroy', {}); } catch (err) { console.warn('Logout endpoint failed', err); }
  }
}
