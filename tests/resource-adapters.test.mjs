import assert from 'node:assert/strict';

import {
  DATA_SOURCE_HELPDESK,
  inspectHelpdeskCapabilities,
  isAssignedToUser,
  isHelpdeskTimesheetEnabled,
  resourceLabels,
  resourceRelation,
  timesheetBinding,
} from '../dist/chrome/js/lib/resource-adapters.js';

const enterpriseTicketFields = {
  user_id: { type: 'many2one', relation: 'res.users' },
  project_id: { type: 'many2one', relation: 'project.project' },
  company_id: { type: 'many2one', relation: 'res.company' },
  team_id: { type: 'many2one', relation: 'helpdesk.team' },
  description: { type: 'html', string: 'Description' },
  x_therp_url: { type: 'char', string: 'Therp link' },
  stage_id: { type: 'many2one', relation: 'helpdesk.stage' },
  analytic_account_id: { type: 'many2one', relation: 'account.analytic.account' },
  use_helpdesk_timesheet: { type: 'boolean' },
  total_hours_spent: { type: 'float' },
  fold: { type: 'boolean' },
  ticket_ref: { type: 'char' },
};
const enterpriseLineFields = {
  helpdesk_ticket_id: { type: 'many2one', relation: 'helpdesk.ticket' },
  project_id: { type: 'many2one', relation: 'project.project' },
  account_id: { type: 'many2one', relation: 'account.analytic.account' },
};

const enterprise = inspectHelpdeskCapabilities(enterpriseTicketFields, enterpriseLineFields);
assert.equal(enterprise.ticketLinkField, 'helpdesk_ticket_id');
assert.equal(enterprise.stageModel, 'helpdesk.stage');
assert.equal(enterprise.descriptionField, 'description');
assert.equal(enterprise.therpLinkField, 'x_therp_url');
assert.equal(enterprise.canRecordTime, true);
assert.equal(timesheetBinding(DATA_SOURCE_HELPDESK, enterprise).model, 'account.analytic.line');
assert.equal(timesheetBinding(DATA_SOURCE_HELPDESK, enterprise).linkField, 'helpdesk_ticket_id');
assert.equal(isHelpdeskTimesheetEnabled({ use_helpdesk_timesheet: true }, enterprise), true);
assert.equal(isHelpdeskTimesheetEnabled({ use_helpdesk_timesheet: false }, enterprise), false);

const oca = inspectHelpdeskCapabilities({
  user_id: { type: 'many2one', relation: 'res.users' },
  project_id: { type: 'many2one', relation: 'project.project' },
  team_id: { type: 'many2one', relation: 'helpdesk.ticket.team' },
  stage_id: { type: 'many2one', relation: 'helpdesk.ticket.stage' },
  allow_timesheet: { type: 'boolean' },
  total_hours: { type: 'float' },
  closed: { type: 'boolean' },
  number: { type: 'char' },
}, {
  ticket_id: { type: 'many2one', relation: 'helpdesk.ticket' },
  project_id: { type: 'many2one', relation: 'project.project' },
});
assert.equal(oca.ticketLinkField, 'ticket_id');
assert.equal(oca.stageModel, 'helpdesk.ticket.stage');
assert.equal(oca.timeEnabledField, 'allow_timesheet');
assert.equal(resourceRelation({ project_id: [9, 'Support'] }, DATA_SOURCE_HELPDESK, oca)[0], 9);

assert.deepEqual(resourceLabels(DATA_SOURCE_HELPDESK), {
  singular: 'ticket',
  plural: 'Helpdesk Tickets',
});
assert.equal(isAssignedToUser({ user_id: [7, 'Agent'] }, 'user_id', 7, 'many2one'), true);
assert.equal(isAssignedToUser({ user_ids: [5, 7] }, 'user_ids', 7, 'many2many'), true);
assert.equal(isAssignedToUser({ user_id: false }, 'user_id', 7, 'many2one'), false);

const missingTimesheets = inspectHelpdeskCapabilities(enterpriseTicketFields, {});
assert.equal(missingTimesheets.canRecordTime, false);
assert.equal(timesheetBinding(DATA_SOURCE_HELPDESK, missingTimesheets), null);

console.log('resource adapter tests passed');
