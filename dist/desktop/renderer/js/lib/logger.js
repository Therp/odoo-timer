/**
 * logger.js — Client-side ring-buffer logger for Therp Timer renderer processes.
 *
 * Writes log entries both to the console and to an in-memory ring buffer that
 * can be queried and displayed in the Logs panel.  IPC bridge to main process
 * is used so entries survive renderer reload within the same app session.
 *
 * Usage:
 *   import { log } from './lib/logger.js';
 *   log.info('Component mounted');
 *   log.warn('Retrying request…');
 *   log.error('RPC failed', err);
 *
 * @module logger
 */

/** Maximum number of log entries kept in the ring buffer. */
const MAX_ENTRIES = 500;

/** In-memory ring buffer (used when IPC is unavailable). */
const _localBuffer = [];

/**
 * Pretty-print a value for log output.
 * @param {*} val
 * @returns {string}
 */
function _fmt(val) {
  if (val == null) return String(val);
  if (val instanceof Error) return `${val.message}\n${val.stack || ''}`;
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return String(val); }
  }
  return String(val);
}

/**
 * Core write function — adds entry to local buffer and forwards to main via IPC.
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} msg
 */
function _write(level, msg) {
  const entry = { ts: new Date().toISOString(), level, msg };
  _localBuffer.push(entry);
  if (_localBuffer.length > MAX_ENTRIES) _localBuffer.shift();

  // Forward to main-process ring buffer via IPC (best-effort)
  try {
    window.electronAPI?.logs?.append?.(level, msg);
  } catch (_) {}

  // Mirror to dev-tools console
  const fn = level === 'error' ? console.error
           : level === 'warn'  ? console.warn
           : level === 'debug' ? console.debug
           : console.log;
  fn(`[${level.toUpperCase()}]`, msg);
}

/**
 * Public logger API.
 * @namespace log
 */
export const log = {
  /**
   * Debug-level message (verbose, shown in Logs panel only in dev mode).
   * @param {...*} args
   */
  debug(...args) { _write('debug', args.map(_fmt).join(' ')); },

  /**
   * Informational message.
   * @param {...*} args
   */
  info(...args)  { _write('info',  args.map(_fmt).join(' ')); },

  /**
   * Warning — something unexpected but non-fatal.
   * @param {...*} args
   */
  warn(...args)  { _write('warn',  args.map(_fmt).join(' ')); },

  /**
   * Error — operation failed.
   * @param {...*} args
   */
  error(...args) { _write('error', args.map(_fmt).join(' ')); },

  /**
   * Return a copy of all local log entries.
   * @returns {Array<{ts:string, level:string, msg:string}>}
   */
  getEntries() { return [..._localBuffer]; },

  /**
   * Clear the local ring buffer.
   */
  clear() { _localBuffer.length = 0; },
};

export default log;
