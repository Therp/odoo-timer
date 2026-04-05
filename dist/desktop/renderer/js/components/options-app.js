import {
    readRemotes,
    writeRemotes,
    validURL,
    normalizeHost,
    storage,
    clearOdooSessionCookies,
    escapeHtml,
    notify,
    confirmDialog,
} from '../lib/common.js';
import { ReadMore, createReadMoreTemplate } from './readmore.js';

const { Component, mount, useState, onWillStart } = owl;

const PAGE_ABOUT   = 'about';
const PAGE_OPTIONS = 'options';
const DEFAULT_DATA_SOURCE = 'project.issue';

const STORAGE_KEYS = { remoteHostInfo: 'remote_host_info' };

// ─── Code-based OWL template ──────────────────────────────────────────────────

function createOptionsAppTemplate(app, bdom, helpers) {
    const { createBlock, list } = bdom;
    const { prepareList, OwlError, withKey } = helpers;

    const rmName     = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const rmHost     = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const rmDatabase = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const rmVersion  = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const rmPoll     = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const rmSource   = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const rmState    = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);

    const rootBlock = createBlock(
        `<div>` +
        // ── Sidebar navigation ──
        `<div id="navigation"><h1 class="title-app">Timer Options</h1><ul class="list-group">` +
        `<li class="chooser list-group-item" block-attribute-0="class" block-handler-1="click"><i class="fa fa-info-circle"/> <span>About Timer</span></li>` +
        `<li class="chooser list-group-item" block-attribute-2="class" block-handler-3="click"><i class="fa fa-cogs"/> <span>Options</span></li>` +
        `</ul><hr/><div class="footer-app"><a href="popup.html" class="back-left"><i class="fa fa-arrow-circle-left fa-2x"/></a></div></div>` +
        // ── About page ──
        `<div class="options-box box" block-attribute-4="class">` +
        `<h1><div class="logo"><img src="img/logo.png"/></div></h1><hr/>` +
        `<div class="about-app"><h4 class="title-app text-center">Description</h4><hr/>` +
        `This is a standalone Owl rewrite of the original cross-platform timer extension for posting work hours to Odoo timesheets. ` +
        `The <strong>Desktop</strong> edition runs as a native Electron application.<hr/>` +
        `<h4 class="title-app text-center">Features</h4><hr/><div class="timer-features"><ul class="list-group">` +
        `<li class="list-group-item">Support for both tasks and issues</li>` +
        `<li class="list-group-item">Start and stop the timer for the selected item</li>` +
        `<li class="list-group-item">Create Odoo timesheet lines against the linked analytic account</li>` +
        `<li class="list-group-item">Show assigned items or everyone's items</li>` +
        `<li class="list-group-item">Add, edit, remove, or clear remote hosts</li>` +
        `<li class="list-group-item">Switch between remote sessions</li>` +
        `<li class="list-group-item">Download current month or current item timesheets as CSV</li>` +
        `<li class="list-group-item">Runs in the system tray — close the window to keep timing</li>` +
        `</ul></div></div></div>` +
        // ── Options / Add-remote form ──
        `<div class="options-box box" block-attribute-5="class"><div class="form remote-options-form">` +
        `<form block-handler-6="submit.prevent">` +
        `<h4 class="remote-title text-info">Add Remote</h4><hr/>` +
        `<div class="form-group"><label for="remote-host">Odoo Host</label>` +
        `<input type="text" class="form-control" id="remote-host" placeholder="https://your-odoo-host.example" block-property-7="value" block-handler-8="input"/></div>` +
        `<div class="form-group"><label for="remote-name">Display Name</label>` +
        `<input type="text" class="form-control" id="remote-name" placeholder="My Odoo" block-property-9="value" block-handler-10="input"/></div>` +
        `<div class="form-group"><label for="remote-database">Odoo Database</label>` +
        `<input type="text" class="form-control" id="remote-database" placeholder="myodoodatabase" block-property-11="value" block-handler-12="input"/></div>` +
        `<div class="form-group"><label for="remote-odoo-version">Odoo Version <span class="text-muted">(e.g. 16.0)</span></label>` +
        `<input type="text" class="form-control" id="remote-odoo-version" placeholder="16.0" block-property-13="value" block-handler-14="input"/></div>` +
        `<div class="form-group"><label for="remote-poll">Message Poll Interval <span class="text-muted">(seconds, 0 = off)</span></label>` +
        `<input type="number" class="form-control" id="remote-poll" placeholder="60" min="0" block-property-15="value" block-handler-16="input"/></div>` +
        `<div class="form-group"><label class="label">Data Source</label><ul class="data-source-list list-group">` +
        `<li class="list-group-item"><div class="form-check">` +
        `<input class="form-check-input" type="radio" value="project.issue" id="FromIssues" block-property-17="checked" block-handler-18="change"/>` +
        `<label class="form-check-label" for="FromIssues">From Issues</label></div></li>` +
        `<li class="list-group-item"><div class="form-check">` +
        `<input class="form-check-input" type="radio" value="project.task" id="FromTasks" block-property-19="checked" block-handler-20="change"/>` +
        `<label class="form-check-label" for="FromTasks">From Tasks</label></div></li></ul></div>` +
        `<span class="caption-remotes">Controls</span>` +
        `<div class="remotes-control-btns col-md-12 text-center text-info pointer">` +
        `<i title="Add a remote host"      class="fa fa-2x fa-plus-circle"  block-handler-21="click"/>` +
        `<i title="Refresh list of remotes" class="fa fa-2x fa-refresh"      block-handler-22="click"/>` +
        `<i title="View list of remotes"    class="fa fa-2x fa-eye"          block-handler-23="click"/>` +
        `<i title="Remove all remotes"      class="fa fa-2x fa-minus-circle" block-handler-24="click"/>` +
        `</div><block-child-0/></form></div><block-child-1/></div></div>`
    );

    const errorBlock = createBlock(`<div class="remote-error"><block-text-0/></div>`);

    // Remotes table — Remote | Host | Database | Version | Source | State | actions
    const remotesTableBlock = createBlock(
        `<div class="remotes-table-info"><table class="table table-bordered">` +
        `<caption class="text-info caption-remotes">List of Available Remotes</caption>` +
        `<thead><tr>` +
        `<th>Remote</th><th>Host</th><th>Database</th>` +
        `<th>Version</th><th>Poll (s)</th><th>Source</th><th>State</th><th></th>` +
        `</tr></thead><tbody><block-child-0/></tbody></table></div>`
    );

    const remoteRowBlock = createBlock(
        `<tr>` +
        `<td class="text-info"><block-child-0/></td>` +
        `<td><block-child-1/></td><td><block-child-2/></td>` +
        `<td><block-child-3/></td><td><block-child-4/></td>` +
        `<td><block-child-5/></td><td><block-child-6/></td>` +
        `<td class="remote-row-actions">` +
        `<i class="fa fa-pencil text-info"  title="Edit remote"   block-handler-0="click"/>` +
        `<i class="fa fa-trash  text-danger" title="Remove remote" block-handler-1="click"/>` +
        `</td></tr>`
    );

    return function template(ctx, node, key = '') {
        let errorNode      = null;
        let remoteListNode = null;

        const aboutNavClass    = ctx.state.activePage === PAGE_ABOUT   ? 'selected' : 'notselected';
        const optionsNavClass  = ctx.state.activePage === PAGE_OPTIONS  ? 'selected' : 'notselected';
        const aboutPageClass   = ctx.state.activePage === PAGE_ABOUT   ? 'active_page' : 'inactive_page';
        const optionsPageClass = ctx.state.activePage === PAGE_OPTIONS  ? 'active_page' : 'inactive_page';

        const showAboutHandler   = [() => { ctx.state.activePage = PAGE_ABOUT; },   ctx];
        const showOptionsHandler = [() => { ctx.state.activePage = PAGE_OPTIONS; }, ctx];

        const fs = ctx.state.form;
        const formSubmitHandler    = ['prevent', ctx.addRemote, ctx];
        const hostInputHandler     = [(ev) => { fs.remote_host         = ev.target.value; }];
        const nameInputHandler     = [(ev) => { fs.remote_name         = ev.target.value; }];
        const databaseInputHandler = [(ev) => { fs.remote_database     = ev.target.value; }];
        const versionInputHandler  = [(ev) => { fs.remote_odoo_version = ev.target.value; }];
        const pollInputHandler     = [(ev) => { fs.remote_poll_interval = ev.target.value; }];
        const issuesRadioChecked   = fs.remote_datasrc === DEFAULT_DATA_SOURCE;
        const tasksRadioChecked    = fs.remote_datasrc === 'project.task';
        const issuesRadioHandler   = [(ev) => { if (ev.target.checked) fs.remote_datasrc = DEFAULT_DATA_SOURCE; }];
        const tasksRadioHandler    = [(ev) => { if (ev.target.checked) fs.remote_datasrc = 'project.task'; }];
        const addRemoteHandler     = [ctx.addRemote,      ctx];
        const reloadHandler        = [ctx.loadRemotes,    ctx];
        const toggleListHandler    = [() => { ctx.state.showList = !ctx.state.showList; }, ctx];
        const removeAllHandler     = [ctx.removeAllRemotes, ctx];

        if (ctx.state.error) errorNode = errorBlock([ctx.state.error]);

        if (ctx.state.showList && ctx.state.remotes.length) {
            ctx = Object.create(ctx);
            const [items,, count, children] = prepareList(ctx.state.remotes);
            const seen = new Set();

            for (let i = 0; i < count; i++) {
                ctx.remote = items[i];
                const rk = ctx.remote.url + ctx.remote.database;
                if (seen.has(String(rk))) throw new OwlError(`Duplicate remote key: ${rk}`);
                seen.add(String(rk));

                const nameN  = rmName(    { text: ctx.remote.name        || '',                  limit: 18 }, key+`__1__${rk}`, node, this, null);
                const hostN  = rmHost(    { text: ctx.remote.url         || '',                  limit: 28 }, key+`__2__${rk}`, node, this, null);
                const dbN    = rmDatabase({ text: ctx.remote.database    || '',                  limit: 18 }, key+`__3__${rk}`, node, this, null);
                const verN   = rmVersion( { text: ctx.remote.odooVersion || '\u2014',            limit: 10 }, key+`__4__${rk}`, node, this, null);
                const pollN  = rmPoll(    { text: String(ctx.remote.pollInterval ?? 60),         limit: 6  }, key+`__5__${rk}`, node, this, null);
                const srcN   = rmSource(  { text: ctx.remote.datasrc     || DEFAULT_DATA_SOURCE, limit: 18 }, key+`__6__${rk}`, node, this, null);
                const stateN = rmState(   { text: ctx.remote.state       || 'Inactive',          limit: 12 }, key+`__7__${rk}`, node, this, null);

                const r = ctx.remote;
                const editH   = [() => ctx.editRemote(r),   ctx];
                const deleteH = [() => ctx.removeRemote(r), ctx];

                children[i] = withKey(
                    remoteRowBlock([editH, deleteH], [nameN, hostN, dbN, verN, pollN, srcN, stateN]),
                    rk
                );
            }
            ctx = ctx.__proto__;
            remoteListNode = remotesTableBlock([], [list(children)]);
        }

        return rootBlock(
            [
                aboutNavClass, showAboutHandler,
                optionsNavClass, showOptionsHandler,
                aboutPageClass, optionsPageClass,
                formSubmitHandler,
                fs.remote_host,          hostInputHandler,
                fs.remote_name,          nameInputHandler,
                fs.remote_database,      databaseInputHandler,
                fs.remote_odoo_version,  versionInputHandler,
                fs.remote_poll_interval, pollInputHandler,
                issuesRadioChecked,      issuesRadioHandler,
                tasksRadioChecked,       tasksRadioHandler,
                addRemoteHandler, reloadHandler, toggleListHandler, removeAllHandler,
            ],
            [errorNode, remoteListNode]
        );
    };
}

// ─── OptionsApp component ─────────────────────────────────────────────────────

class OptionsApp extends Component {
    static components = { ReadMore };
    static template   = 'OptionsApp';

    setup() {
        this.state = useState({
            activePage: PAGE_OPTIONS,
            remotes:    [],
            showList:   true,
            error:      '',
            form: {
                remote_host:          '',
                remote_name:          '',
                remote_database:      '',
                remote_odoo_version:  '',
                remote_poll_interval: '60',
                remote_datasrc:       DEFAULT_DATA_SOURCE,
            },
        });
        onWillStart(async () => { await this.loadRemotes(); });
    }

    async loadRemotes() { this.state.remotes = await readRemotes(); }

    resetRemoteForm() {
        Object.assign(this.state.form, {
            remote_host: '', remote_name: '', remote_database: '',
            remote_odoo_version: '', remote_poll_interval: '60',
            remote_datasrc: DEFAULT_DATA_SOURCE,
        });
    }

    _validate(host, name, database) {
        if (!host || !name || !database) {
            this.state.error = 'Host, Display Name, and Database are required.';
            return false;
        }
        if (!validURL(host)) {
            this.state.error = 'Invalid URL — must start with http:// or https://';
            return false;
        }
        return true;
    }

    async addRemote() {
        this.state.error = '';
        const host          = normalizeHost(this.state.form.remote_host || '');
        const name          = (this.state.form.remote_name || '').trim();
        const database      = (this.state.form.remote_database || '').trim();
        const version       = (this.state.form.remote_odoo_version || '').trim();
        const pollInterval  = Number(this.state.form.remote_poll_interval ?? 60);
        const datasrc       = this.state.form.remote_datasrc || DEFAULT_DATA_SOURCE;

        if (!this._validate(host, name, database)) return;

        const remotes = await readRemotes();
        if (remotes.some((r) => r.url === host && r.database === database)) {
            this.state.error = `${host} / ${database} already exists.`;
            return;
        }

        remotes.push({ url: host, name, database, odooVersion: version, pollInterval, datasrc, state: 'Inactive' });
        await writeRemotes(remotes);
        await this.loadRemotes();
        this.resetRemoteForm();
        await notify(`Host [${host}] added successfully.`);
    }

    // ── Edit remote via alert.js inline form ──────────────────────────────────
    async editRemote(remote) {
        this.state.error = '';
        const pfx = `therp-edit-${Date.now()}`;

        const html = `
<div style="min-width:420px;max-width:560px;text-align:left;font-family:Arial,Helvetica,sans-serif;">
  <div style="margin-bottom:16px;font-weight:700;font-size:17px;color:#42475a;text-align:center;">Edit Remote</div>

  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Display Name</label>
    <input id="${pfx}-name" value="${escapeHtml(remote.name || '')}"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;"/>
  </div>

  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Odoo Host</label>
    <input id="${pfx}-host" value="${escapeHtml(remote.url || '')}"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;"/>
  </div>

  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Database</label>
    <input id="${pfx}-database" value="${escapeHtml(remote.database || '')}"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;"/>
  </div>

  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Odoo Version <span style="color:#999;">(e.g. 16.0)</span></label>
    <input id="${pfx}-version" value="${escapeHtml(remote.odooVersion || '')}" placeholder="16.0"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;"/>
  </div>

  <div style="margin-bottom:4px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Data Source</label>
    <select id="${pfx}-datasrc"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;">
      <option value="project.issue"${(remote.datasrc || 'project.issue') !== 'project.task' ? ' selected' : ''}>From Issues (project.issue)</option>
      <option value="project.task"${remote.datasrc === 'project.task' ? ' selected' : ''}>From Tasks (project.task)</option>
    </select>
  </div>
</div>`;

        const result = await alert.show(html, ['Cancel', 'Save'], { accentColor: 'orange' });
        if (result !== 'Save') return;

        const get      = (id) => document.getElementById(id)?.value ?? '';
        const newName  = get(`${pfx}-name`).trim();
        const newHost  = normalizeHost(get(`${pfx}-host`));
        const newDb    = get(`${pfx}-database`).trim();
        const newVer   = get(`${pfx}-version`).trim();
        const newSrc   = get(`${pfx}-datasrc`) || DEFAULT_DATA_SOURCE;

        if (!this._validate(newHost, newName, newDb)) return;

        const remotes = await readRemotes();
        const duplicate = remotes.some(
            (r) => r.url === newHost && r.database === newDb &&
                   !(r.url === remote.url && r.database === remote.database)
        );
        if (duplicate) {
            this.state.error = `${newHost} / ${newDb} already exists.`;
            return;
        }

        const updated = remotes.map((r) =>
            r.url === remote.url && r.database === remote.database
                ? { ...r, name: newName, url: newHost, database: newDb,
                         odooVersion: newVer, datasrc: newSrc }
                : r
        );
        await writeRemotes(updated);
        await this.loadRemotes();
        await notify('Remote updated successfully.');
    }

    async removeRemote(remote) {
        const ok = await confirmDialog(`Remove remote [${remote.url}]?`);
        if (!ok) return;
        await clearOdooSessionCookies(remote.url);
        const remotes = (await readRemotes()).filter(
            (r) => !(r.url === remote.url && r.database === remote.database)
        );
        await writeRemotes(remotes);
        await storage.remove(remote.database);
        await this.loadRemotes();
        await notify(`[${remote.url}] removed.`);
    }

    async removeAllRemotes() {
        const ok = await confirmDialog('Remove ALL remotes? This cannot be undone.');
        if (!ok) return;
        for (const r of await readRemotes()) {
            await clearOdooSessionCookies(r.url);
            await storage.remove(r.database);
        }
        await writeRemotes([]);
        await storage.remove(STORAGE_KEYS.remoteHostInfo);
        await this.loadRemotes();
        await notify('All remotes removed.');
    }

    get PAGE_ABOUT()          { return PAGE_ABOUT; }
    get PAGE_OPTIONS()        { return PAGE_OPTIONS; }
    get DEFAULT_DATA_SOURCE() { return DEFAULT_DATA_SOURCE; }
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const compiledTemplates = globalThis.__THERP_TIMER_TEMPLATES__ || {};
// OptionsApp uses its own code-based template — same reason as PopupApp.
const templates = {
    ReadMore:   compiledTemplates.ReadMore || createReadMoreTemplate,
    OptionsApp: createOptionsAppTemplate,
};
mount(OptionsApp, document.getElementById('app'), { dev: false, templates });
