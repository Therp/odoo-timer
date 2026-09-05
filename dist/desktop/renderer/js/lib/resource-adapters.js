export const DATA_SOURCE_ISSUE = 'project.issue';
export const DATA_SOURCE_TASK = 'project.task';
export const DATA_SOURCE_HELPDESK = 'helpdesk.ticket';

const RESOURCE_LABELS = {
  [DATA_SOURCE_ISSUE]: { singular: 'issue', plural: 'Issues' },
  [DATA_SOURCE_TASK]: { singular: 'task', plural: 'Tasks' },
  [DATA_SOURCE_HELPDESK]: { singular: 'ticket', plural: 'Helpdesk Tickets' },
};

function hasField(fields, name) {
  return Boolean(fields && Object.prototype.hasOwnProperty.call(fields, name));
}

function firstField(fields, candidates) {
  return candidates.find((name) => hasField(fields, name)) || null;
}

function firstFieldByLabel(fields, labels) {
  const wanted = new Set(labels.map((label) => String(label).trim().toLowerCase()));
  for (const [name, metadata] of Object.entries(fields || {})) {
    const label = String(metadata?.string || '').trim().toLowerCase();
    if (wanted.has(label)) return name;
  }
  return null;
}

export function resourceLabels(model) {
  return RESOURCE_LABELS[model] || { singular: 'item', plural: 'Items' };
}

export function inspectHelpdeskCapabilities(ticketFields, timesheetFields) {
  const assignmentField = firstField(ticketFields, [
    'user_id',
    'assigned_user_id',
    'assignee_id',
    'user_ids',
  ]);
  const projectField = firstField(ticketFields, ['project_id']);
  const companyField = firstField(ticketFields, ['company_id']);
  const teamField = firstField(ticketFields, ['team_id']);
  const descriptionField = firstField(ticketFields, ['description']);
  const therpLinkField = firstFieldByLabel(ticketFields, ['Therp link']) ||
    firstField(ticketFields, ['therp_link']);
  const analyticAccountField = firstField(ticketFields, [
    'analytic_account_id',
    'account_id',
  ]);
  const ticketLinkField = firstField(timesheetFields, [
    'helpdesk_ticket_id',
    'ticket_id',
  ]);

  return {
    available: Boolean(ticketFields),
    assignmentField,
    assignmentType: assignmentField ? ticketFields?.[assignmentField]?.type || null : null,
    projectField,
    companyField,
    teamField,
    descriptionField,
    therpLinkField,
    analyticAccountField,
    stageField: firstField(ticketFields, ['stage_id']),
    stageModel: ticketFields?.stage_id?.relation || null,
    timeEnabledField: firstField(ticketFields, [
      'use_helpdesk_timesheet',
      'allow_timesheet',
    ]),
    hoursField: firstField(ticketFields, [
      'total_hours_spent',
      'total_hours',
      'effective_hours',
    ]),
    closedField: firstField(ticketFields, ['fold', 'closed']),
    activeField: firstField(ticketFields, ['active']),
    ticketReferenceField: firstField(ticketFields, [
      'ticket_ref',
      'number',
    ]),
    ticketLinkField,
    canRecordTime: Boolean(ticketLinkField),
    timesheetFields: timesheetFields || {},
  };
}

export function helpdeskUnavailableMessage(error) {
  const rawMessage = String(error?.message || error || '');
  const details = [
    error?.fullTrace?.data?.name,
    error?.fullTrace?.name,
    rawMessage,
  ].filter(Boolean).join(' ').toLowerCase();

  if (details.includes('session expired') || details.includes('invalid session') || details.includes('unauthorized')) {
    return 'The Odoo session has expired. Reconnect to Odoo and try again.';
  }
  if (details.includes('access') || details.includes('permission')) {
    return 'Helpdesk is installed, but this user cannot access tickets. Grant Helpdesk user access and reconnect.';
  }
  if (!rawMessage || details.includes('keyerror') || details.includes('does not exist') || details.includes('not found')) {
    return 'Helpdesk Tickets are not available on this server. Install the Enterprise Helpdesk app or OCA helpdesk_mgmt, then reconnect.';
  }
  return `Could not inspect Helpdesk support: ${rawMessage}`;
}

export function helpdeskTimesheetUnavailableMessage(error = null) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('access') || message.includes('permission')) {
    return 'Helpdesk tickets can be shown, but this user cannot access timesheets. Grant Timesheets user access before recording time.';
  }
  return 'Helpdesk tickets can be shown, but Helpdesk Timesheets is unavailable. Install helpdesk_timesheet (Enterprise) or helpdesk_mgmt_timesheet (OCA), enable timesheets on the team/project, and reconnect.';
}

export function isAssignedToUser(record, assignmentField, userId, assignmentType = null) {
  if (!assignmentField || !userId) return true;
  const value = record?.[assignmentField];
  if (!value) return false;
  if (Array.isArray(value)) {
    if (assignmentType !== 'many2many' && value.length === 2 && !Array.isArray(value[0])) {
      return Number(value[0]) === Number(userId);
    }
    return value.some((item) => Number(Array.isArray(item) ? item[0] : item) === Number(userId));
  }
  return Number(value?.id ?? value) === Number(userId);
}

export function isHelpdeskTimesheetEnabled(record, capabilities) {
  const field = capabilities?.timeEnabledField;
  return !field || record?.[field] !== false;
}

export function resourceRelation(record, model, capabilities = {}) {
  if (model === DATA_SOURCE_HELPDESK) {
    return record?.[capabilities.projectField] || record?.[capabilities.teamField] || null;
  }
  return record?.project_id || null;
}

export function resourceHours(record, model, capabilities = {}) {
  if (model === DATA_SOURCE_HELPDESK && capabilities.hoursField) {
    return record?.[capabilities.hoursField];
  }
  return null;
}

export function timesheetBinding(model, capabilities = {}) {
  if (model === DATA_SOURCE_ISSUE) {
    return { model: 'hr.analytic.timesheet', linkField: 'issue_id' };
  }
  if (model === DATA_SOURCE_TASK) {
    return { model: 'account.analytic.line', linkField: 'task_id' };
  }
  if (model === DATA_SOURCE_HELPDESK && capabilities.ticketLinkField) {
    return { model: 'account.analytic.line', linkField: capabilities.ticketLinkField };
  }
  return null;
}
