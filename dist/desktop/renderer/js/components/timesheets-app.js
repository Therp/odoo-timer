/**
 * timesheets-app.js — Task Timesheets window.
 *
 * Responsive layout:
 *  - Title = task name (no generic "Task Timesheets" heading)
 *  - Refresh shows spinner + "Refreshing…" message
 *  - Table scrolls inside its container; summary stays visible
 *  - Summary totals right-aligned like Odoo invoice totals
 *  - Window title bar updated via document.title
 */

import { storage, OdooRpc, formatHoursMins } from '../lib/common.js';

/** @param {number|null} h  @returns {string} */
function hhmm(h) { return formatHoursMins(h ?? 0); }

/** @param {string} d  @returns {string} */
function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d.replace(' ', 'T') + (d.includes('Z') ? '' : 'Z'))
      .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

/** @param {*} v  @returns {string} */
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── State ─────────────────────────────────────────────────────────────────────
let _currentCtx = null;   // {taskId, taskName} — stored for refresh

// ─── Render ────────────────────────────────────────────────────────────────────
async function renderTimesheets({ taskId, taskName }, refreshing = false) {
  const app = document.getElementById('app');

  // Show spinner while loading / refreshing
  const spinMsg = refreshing ? 'Refreshing timesheets…' : 'Loading timesheets…';
  app.innerHTML = `
    <div class="ts-loading">
      <i class="fa fa-cog fa-spin fa-2x" style="color:var(--brand);"></i>
      <span>${esc(spinMsg)}</span>
    </div>`;

  try {
    // ── Session ──────────────────────────────────────────────────────────
    const host    = await storage.get('current_host', '');
    const datasrc = await storage.get('current_host_datasrc', 'project.task');
    if (!host) {
      app.innerHTML = `<div class="ts-error-wrap"><i class="fa fa-exclamation-circle"></i>
        Not connected — log in from the Timer window first.</div>`;
      return;
    }

    const rpc = new OdooRpc(host);

    // ── Task details ─────────────────────────────────────────────────────
    const taskRes = await rpc.searchRead(
      datasrc,
      [['id', '=', taskId]],
      ['id', 'name', 'project_id', 'planned_hours', 'effective_hours', 'remaining_hours'],
      { limit: 1 }
    );
    const task = taskRes.records?.[0];
    if (!task) {
      app.innerHTML = `<div class="ts-error-wrap">Task #${taskId} not found or not accessible.</div>`;
      return;
    }

    // ── Timesheet lines (current month) ─────────────────────────────────
    const today    = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const linesRes = await rpc.searchRead(
      'account.analytic.line',
      [['task_id', '=', taskId], ['date', '>=', firstDay], ['date', '<=', lastDay]],
      ['date', 'name', 'unit_amount', 'employee_id', 'user_id'],
      { order: 'date asc', limit: 500 }
    );
    const lines = linesRes.records || [];

    // ── Calculations ──────────────────────────────────────────────────────
    const planned   = Number(task.planned_hours  || 0);
    const spent     = Number(task.effective_hours || 0);
    const remaining = Number(task.remaining_hours ?? (planned - spent));
    const monthTotal = lines.reduce((s, l) => s + Number(l.unit_amount || 0), 0);
    const isOver    = planned > 0 && spent > planned;
    const isNeg     = remaining < 0;

    const project = Array.isArray(task.project_id)
      ? task.project_id[1] : (task.project_id || '—');
    const monthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Update window title to task name
    document.title = `${task.name || taskName} — Timesheets`;

    // ── Table rows ────────────────────────────────────────────────────────
    const rowsHtml = lines.length
      ? lines.map((l) => {
          const name = Array.isArray(l.employee_id) ? l.employee_id[1]
                     : Array.isArray(l.user_id)     ? l.user_id[1]
                     : '—';
          return `<tr>
            <td class="td-date">${fmtDate(l.date)}</td>
            <td class="td-name">${esc(name)}</td>
            <td>${esc(l.name || '')}</td>
            <td class="td-hours">${hhmm(Number(l.unit_amount || 0))}</td>
          </tr>`;
        }).join('') + `
        <tr class="ts-total-row">
          <td colspan="3" class="total-label">Month Total</td>
          <td class="td-hours total-amount">${hhmm(monthTotal)}</td>
        </tr>`
      : `<tr><td colspan="4" class="ts-empty-cell">
           <i class="fa fa-inbox"></i>&nbsp; No timesheet entries for ${monthLabel}.
         </td></tr>`;

    // ── Summary block — compact right-side panel like Odoo invoice totals ──
    const summaryHtml = `
      <div class="ts-summary-block">
        <div class="ts-summary-inner">
          <table class="ts-summary-table">
            <tr>
              <td class="ts-sum-label">Planned</td>
              <td class="ts-sum-value ts-sum-planned">${hhmm(planned)}</td>
            </tr>
            <tr>
              <td class="ts-sum-label">Total Spent</td>
              <td class="ts-sum-value ts-sum-spent${isOver ? ' over' : ''}">${hhmm(spent)}</td>
            </tr>
            <tr>
              <td class="ts-sum-label">Remaining</td>
              <td class="ts-sum-value ts-sum-remaining${isNeg ? ' negative' : ''}">
                ${isNeg ? '−' : ''}${hhmm(Math.abs(remaining))}
              </td>
            </tr>
          </table>
          ${isOver ? `<div class="ts-over-msg">
            <i class="fa fa-exclamation-triangle"></i>
            Over budget by ${hhmm(Math.abs(remaining))}.
          </div>` : ''}
        </div>
      </div>`;

    // ── Render ────────────────────────────────────────────────────────────
    app.innerHTML = `
      <div class="ts-header">
        <h2><i class="fa fa-table"></i>${esc(task.name || taskName)}</h2>
      </div>

      <div class="ts-toolbar">
        <button class="ts-btn" id="ts-refresh-btn">
          <i class="fa fa-refresh" id="ts-refresh-icon"></i>
          <span id="ts-refresh-label">Refresh</span>
        </button>
        <span class="ts-month-label">
          <i class="fa fa-calendar"></i>&nbsp;${monthLabel}
          &nbsp;·&nbsp; ${esc(project)}
        </span>
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

      ${summaryHtml}
    `;

    // Refresh button with spinner
    const refreshBtn  = document.getElementById('ts-refresh-btn');
    const refreshIcon = document.getElementById('ts-refresh-icon');
    const refreshLbl  = document.getElementById('ts-refresh-label');

    refreshBtn?.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshIcon.className = 'fa fa-cog fa-spin';
      refreshLbl.textContent = 'Refreshing…';
      await renderTimesheets(_currentCtx, true);
    });

  } catch (err) {
    console.error('[TimesheetsApp]', err);
    app.innerHTML = `
      <div class="ts-error-wrap">
        <i class="fa fa-exclamation-circle"></i> Error: ${esc(err.message)}
      </div>`;
  }
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
window.electronAPI?.on('timesheets:task', (ctx) => {
  _currentCtx = ctx;
  renderTimesheets(ctx);
});
