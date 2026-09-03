import { remoteIdentity } from '../dist/desktop/renderer/js/lib/common.js';
import assert from 'node:assert/strict';

import {
  DATA_SOURCE_HELPDESK,
  inspectHelpdeskCapabilities,
  isAssignedToUser,
  timesheetBinding,
} from '../dist/desktop/renderer/js/lib/resource-adapters.js';

const enterprise = inspectHelpdeskCapabilities({
  user_id: { type: 'many2one', relation: 'res.users' },
  project_id: { type: 'many2one', relation: 'project.project' },
  company_id: { type: 'many2one', relation: 'res.company' },
  team_id: { type: 'many2one', relation: 'helpdesk.team' },
  description: { type: 'html', string: 'Description' },
  x_therp_url: { type: 'char', string: 'Therp link' },
  stage_id: { type: 'many2one', relation: 'helpdesk.stage' },
  use_helpdesk_timesheet: { type: 'boolean' },
  total_hours_spent: { type: 'float' },
}, {
  helpdesk_ticket_id: { type: 'many2one', relation: 'helpdesk.ticket' },
  project_id: { type: 'many2one', relation: 'project.project' },
  company_id: { type: 'many2one', relation: 'res.company' },
});
assert.equal(enterprise.canRecordTime, true);
assert.equal(enterprise.ticketLinkField, 'helpdesk_ticket_id');
assert.equal(enterprise.stageModel, 'helpdesk.stage');
assert.equal(enterprise.companyField, 'company_id');
assert.equal(enterprise.teamField, 'team_id');
assert.equal(enterprise.descriptionField, 'description');
assert.equal(enterprise.therpLinkField, 'x_therp_url');
assert.equal(timesheetBinding(DATA_SOURCE_HELPDESK, enterprise).linkField, 'helpdesk_ticket_id');

const oca = inspectHelpdeskCapabilities({
  user_id: { type: 'many2one', relation: 'res.users' },
  stage_id: { type: 'many2one', relation: 'helpdesk.ticket.stage' },
  allow_timesheet: { type: 'boolean' },
}, {
  ticket_id: { type: 'many2one', relation: 'helpdesk.ticket' },
});
assert.equal(oca.ticketLinkField, 'ticket_id');
assert.equal(oca.timeEnabledField, 'allow_timesheet');
assert.equal(isAssignedToUser({ user_id: [7, 'Agent'] }, 'user_id', 7, 'many2one'), true);

const missing = inspectHelpdeskCapabilities({}, {});
assert.equal(missing.canRecordTime, false);
assert.equal(timesheetBinding(DATA_SOURCE_HELPDESK, missing), null);

console.log('desktop resource adapter tests passed');


assert.equal(
  remoteIdentity({url: 'https://example.test/', database: 'db', datasrc: 'project.task'}),
  remoteIdentity({url: 'https://example.test', database: 'db', datasrc: 'project.task'}),
  'remote identity normalizes host trailing slash'
);
assert.notEqual(
  remoteIdentity({url: 'https://example.test', database: 'db', datasrc: 'project.task'}),
  remoteIdentity({url: 'https://example.test', database: 'db', datasrc: 'helpdesk.ticket'}),
  'same host/database with a different source is a distinct remote'
);

assert.equal(
  remoteIdentity({url: 'https://example.test', database: 'db'}),
  remoteIdentity({url: 'https://example.test', database: 'db', datasrc: 'project.issue'}),
  'legacy remotes without datasrc keep project.issue identity'
);
