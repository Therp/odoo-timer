/**
 * timesheets-app.js — Task Timesheets window (todo #15).
 *
 * Shows analytic line records for a specific task, grouped by month,
 * with planned_hours / effective_hours / remaining_hours summary.
 *
 * Data arrives via IPC event 'timesheets:task' sent from main.js
 * after the window opens.
 */

import { storage, OdooRpc, formatHoursMins } from '../lib/common.js';
import { log } from '../lib/logger.js';

// ─── RPC helper ───────────────────────────────────────────────────────────────
async function rpcSearchRead(rpc, model, domain, fields, extra = {}) {
  return rpc.searchRead(model, domain, fields, extra);
}

// ─── Format helpers ───────────────────────────────────────────────────────────
/**
 * Convert decimal hours to HH:MM string.
 * @param {number|null} h
 * @returns {string}
 */
function hhmm(h) { return formatHoursMins(h ?? 0); }

/**
 * Format ISO date string to locale date.
 * @param {string} d
 * @returns {string}
 */
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString(); } catch { return d; }
}

// ─── Render functions (no OWL needed — this is a simple non-reactive page) ───

/**
 * Render the full timesheets page into #app.
 * @param {{taskId:number, taskName:string}} context
 */
async function renderTimesheets({ taskId, taskName }) {
  const app = document.getElementById('app');

  try {
    // ── Load session / host ────────────────────────────────────────────────
    const host     = await storage.get('current_host', '');
    const database = await storage.get('current_host_db', '');
    const datasrc  = await storage.get('current_host_datasrc', 'project.task');

    if (!host) {
      app.innerHTML = `<div class="ts-error"><i class="fa fa-exclamation-circle"></i> Not connected — log in from the Timer window first.</div>`;
      return;
    }

    const rpc = new OdooRpc(host);

    // ── Fetch task details ─────────────────────────────────────────────────
    const taskResult = await rpcSearchRead(
      rpc, datasrc,
      [['id', '=', taskId]],
      ['id', 'name', 'project_id', 'planned_hours', 'effective_hours', 'remaining_hours'],
      { limit: 1 }
    );
    const task = taskResult.records?.[0];
    if (!task) {
      app.innerHTML = `<div class="ts-error">Task #${taskId} not found or not accessible.</div>`;
      return;
    }

    // ── Fetch analytic lines for this task (current month) ─────────────────
    const today    = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const linesResult = await rpcSearchRead(
      rpc,
      'account.analytic.line',
      [
        ['task_id', '=', taskId],
        ['date', '>=', firstDay],
        ['date', '<=', lastDay],
      ],
      ['date', 'name', 'unit_amount', 'employee_id', 'user_id'],
      { order: 'date asc', limit: 500 }
    );
    const lines = linesResult.records || [];

    // ── Compute summary ────────────────────────────────────────────────────
    const plannedHours   = Number(task.planned_hours   || 0);
    const effectiveHours = Number(task.effective_hours  || 0);
    const remainingHours = Number(task.remaining_hours  ?? (plannedHours - effectiveHours));
    const monthTotal     = lines.reduce((s, l) => s + Number(l.unit_amount || 0), 0);
    const isOverBudget   = effectiveHours > plannedHours && plannedHours > 0;
    const isNegativeRem  = remainingHours < 0;

    const projectName = Array.isArray(task.project_id) ? task.project_id[1] : (task.project_id || '—');

    // ── Build HTML ─────────────────────────────────────────────────────────
    const monthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });

    const rowsHtml = lines.length
      ? lines.map((l) => {
          const name     = Array.isArray(l.employee_id) ? l.employee_id[1]
                         : Array.isArray(l.user_id)    ? l.user_id[1]
                         : '—';
          const amt      = Number(l.unit_amount || 0);
          return `<tr>
            <td>${fmtDate(l.date)}</td>
            <td>${esc(name)}</td>
            <td>${esc(l.name || '')}</td>
            <td class="td-amount">${hhmm(amt)}</td>
          </tr>`;
        }).join('') +
        `<tr class="ts-total-row">
          <td colspan="3" style="text-align:right;">Month Total</td>
          <td class="td-amount">${hhmm(monthTotal)}</td>
        </tr>`
      : `<tr><td colspan="4" class="ts-empty">No timesheet entries for ${monthLabel}.</td></tr>`;

    app.innerHTML = `
      <div class="ts-header">
        <h2><i class="fa fa-table"></i> Task Timesheets</h2>
        <div class="ts-meta">
          <b>Project:</b> ${esc(projectName)} &nbsp;|&nbsp;
          <b>Task:</b> #${taskId} — ${esc(task.name || '')}
        </div>
      </div>

      <div class="ts-toolbar">
        <button class="ts-btn" id="ts-refresh-btn"><i class="fa fa-refresh"></i> Refresh</button>
        <span class="ts-month-label"><i class="fa fa-calendar"></i> ${monthLabel}</span>
      </div>

      <div class="ts-table-wrap">
        <table class="ts-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Description</th>
              <th style="text-align:right;">Hours</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <div class="ts-summary">
        <div class="ts-summary-card ts-card-planned">
          <div class="label">Planned</div>
          <div class="value">${hhmm(plannedHours)}</div>
        </div>
        <div class="ts-summary-card ts-card-total${isOverBudget ? ' over' : ''}">
          <div class="label">Total Spent</div>
          <div class="value">${hhmm(effectiveHours)}</div>
        </div>
        <div class="ts-summary-card ts-card-remaining${isNegativeRem ? ' negative' : ''}">
          <div class="label">Remaining</div>
          <div class="value">${isNegativeRem ? '−' : ''}${hhmm(Math.abs(remainingHours))}</div>
        </div>
      </div>
      ${isOverBudget
        ? `<p style="color:#c53030;font-size:13px;margin-top:12px;"><i class="fa fa-exclamation-triangle"></i> Over budget by ${hhmm(Math.abs(remainingHours))}.</p>`
        : ''
      }
    `;

    // Refresh button
    document.getElementById('ts-refresh-btn')?.addEventListener('click', () => renderTimesheets({ taskId, taskName }));

  } catch (err) {
    log.error('[TimesheetsApp]', err.message);
    app.innerHTML = `<div class="ts-error"><i class="fa fa-exclamation-circle"></i> Error: ${esc(err.message)}</div>`;
  }
}

/**
 * Simple HTML escape.
 * @param {*} v
 * @returns {string}
 */
function esc(v) {
  return String(v ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

// Listen for task context sent from main process
window.electronAPI?.on('timesheets:task', ({ taskId, taskName }) => {
  renderTimesheets({ taskId, taskName });
});
