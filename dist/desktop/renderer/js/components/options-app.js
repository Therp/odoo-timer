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

const PAGE_ABOUT    = 'about';
const PAGE_OPTIONS  = 'options';
const PAGE_STORAGE  = 'storage';
const PAGE_SECURITY = 'security';
const PAGE_HELP     = 'help';
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
        `<li class="chooser list-group-item" block-attribute-28="class" block-handler-29="click"><i class="fa fa-hdd-o"/> <span>Storage</span></li>` +
        `<li class="chooser list-group-item" block-attribute-30="class" block-handler-31="click"><i class="fa fa-shield"/> <span>Security</span></li>` +
        `<li class="chooser list-group-item" block-attribute-32="class" block-handler-33="click"><i class="fa fa-question-circle"/> <span>Help</span></li>` +
        `</ul><hr/><div class="footer-app"><a href="popup.html" class="back-left"><i class="fa fa-arrow-circle-left fa-2x"/></a></div></div>` +
        // ── About page ──
        `<div class="options-box box" block-attribute-4="class">` +
        `<h1><div class="logo"><img src="img/logo.png"/></div></h1><hr/>` +
        `<div class="about-app">` +
        `<h4 class="title-app text-center">Description</h4><hr/>` +
        `Therp Timer Desktop is a native Electron application for logging work hours directly into Odoo timesheets. ` +
        `It supports tasks and issues, built-in screen recording, chatter messaging, and runs silently in the system tray.<hr/>` +
        `<h4 class="title-app text-center">Features</h4><hr/><div class="timer-features"><ul class="list-group">` +
        `<li class="list-group-item"><i class="fa fa-clock-o"/> Start/stop timer — creates Odoo timesheet lines automatically</li>` +
        `<li class="list-group-item"><i class="fa fa-tasks"/> Supports project.task and project.issue data sources</li>` +
        `<li class="list-group-item"><i class="fa fa-video-camera"/> Screen recorder — WebM, MP4, MKV formats</li>` +
        `<li class="list-group-item"><i class="fa fa-microphone"/> Audio recording — microphone or system audio</li>` +
        `<li class="list-group-item"><i class="fa fa-camera"/> Screenshot tool with configurable save folder</li>` +
        `<li class="list-group-item"><i class="fa fa-film"/> Animated GIF capture</li>` +
        `<li class="list-group-item"><i class="fa fa-comments"/> Chatter — read and post task messages, @mentions, attachments</li>` +
        `<li class="list-group-item"><i class="fa fa-bell"/> Desktop notifications for new chatter messages</li>` +
        `<li class="list-group-item"><i class="fa fa-table"/> Task timesheets window with planned vs spent summary</li>` +
        `<li class="list-group-item"><i class="fa fa-download"/> Download monthly timesheet as CSV</li>` +
        `<li class="list-group-item"><i class="fa fa-exchange"/> Multi-remote support — switch between Odoo instances</li>` +
        `<li class="list-group-item"><i class="fa fa-database"/> Config backup and restore (import/export JSON)</li>` +
        `<li class="list-group-item"><i class="fa fa-desktop"/> Runs in the system tray — keeps timing in the background</li>` +
        `</ul></div>` +
        `<h4 class="title-app text-center" style="margin-top:16px;">Packages</h4><hr/>` +
        `<div class="timer-features"><ul class="list-group">` +
        `<li class="list-group-item"><b>electron</b> ^29.4.6 — Desktop app framework</li>` +
        `<li class="list-group-item"><b>electron-builder</b> ^24.13.3 — Cross-platform packaging</li>` +
        `<li class="list-group-item"><b>electron-store</b> ^8.1.0 — Persistent key-value storage</li>` +
        `<li class="list-group-item"><b>owl</b> 2.x — Odoo Web Library UI framework (renderer)</li>` +
        `<li class="list-group-item"><b>font-awesome</b> 4.6.3 — Icon set</li>` +
        `</ul></div></div></div>` +
        // ── Options / Add-remote form ──
        // ── Storage page ──
        `<div class="options-box box" block-attribute-34="class">` +
        `<h4 class="title-app"><i class="fa fa-hdd-o"/> Storage Preferences</h4><hr/>` +
        `<div class="about-app">` +
        `<p class="text-muted" style="font-size:13px;">Set persistent save folders for recordings and screenshots. When a folder is configured the save dialog is skipped and files are saved directly.</p>` +
        `<div class="form-group"><label>Screenshot Save Folder</label>` +
        `<div class="folder-row"><span class="folder-path-display" id="ss-folder-display">Not set (will prompt)</span>` +
        `<button class="btn btn-sm btn-default" block-handler-35="click">Browse…</button>` +
        `<button class="btn btn-sm btn-danger"  block-handler-36="click">Clear</button></div></div>` +
        `<div class="form-group"><label>Video / GIF Save Folder</label>` +
        `<div class="folder-row"><span class="folder-path-display" id="vid-folder-display">Not set (will prompt)</span>` +
        `<button class="btn btn-sm btn-default" block-handler-37="click">Browse…</button>` +
        `<button class="btn btn-sm btn-danger"  block-handler-38="click">Clear</button></div></div>` +
        `<hr/><h4 class="title-app"><i class="fa fa-database"/> Backup &amp; Restore</h4>` +
        `<p class="text-muted" style="font-size:13px;">Export all configuration to a JSON file, or import a previous backup.</p>` +
        `<div style="display:flex;gap:10px;">` +
        `<button class="btn btn-default" block-handler-39="click"><i class="fa fa-download"/> Export Config</button>` +
        `<button class="btn btn-default" block-handler-40="click"><i class="fa fa-upload"/> Import Config</button>` +
        `</div></div></div>` +
        // ── Security page ──
        `<div class="options-box box" block-attribute-41="class">` +
        `<h4 class="title-app"><i class="fa fa-shield"/> Security &amp; Sandbox</h4><hr/>` +
        `<div class="about-app">` +
        `<h5>Linux AppImage — Sandbox</h5>` +
        `<p class="text-muted" style="font-size:13px;">On Linux, the AppImage SUID sandbox helper may not be configured correctly. The app automatically applies <code>--no-sandbox</code> to stay functional. To restore full sandboxing you can either:</p>` +
        `<ul class="list-group">` +
        `<li class="list-group-item">Run: <code>sudo chown root /tmp/.mount_Therp-*/chrome-sandbox &amp;&amp; sudo chmod 4755 /tmp/.mount_Therp-*/chrome-sandbox</code></li>` +
        `<li class="list-group-item">Or run the AppImage with: <code>./Therp-Timer.AppImage --no-sandbox</code></li>` +
        `</ul>` +
        `<h5 style="margin-top:16px;">Session Cookies</h5>` +
        `<p class="text-muted" style="font-size:13px;">Odoo session cookies are stored in the Electron session and cleared on logout. No credentials are stored in plain text.</p>` +
        `<h5 style="margin-top:16px;">Data Storage</h5>` +
        `<p class="text-muted" style="font-size:13px;">All settings are stored in <b>electron-store</b> (OS user data directory). No data is sent to third parties.</p>` +
        `</div></div>` +
        // ── Help / Tutorial page ──
        `<div class="options-box box" block-attribute-42="class">` +
        `<h4 class="title-app"><i class="fa fa-question-circle"/> Help &amp; Tutorial</h4><hr/>` +
        `<div class="about-app">` +
        `<h5>Getting Started</h5>` +
        `<ol class="list-group">` +
        `<li class="list-group-item">Go to <b>Options → Options</b> and click <b>+</b> to add an Odoo remote host.</li>` +
        `<li class="list-group-item">Return to the Timer window and choose your remote from the dropdown on the login screen.</li>` +
        `<li class="list-group-item">Enable <em>Use Existing Session</em> if already logged into Odoo in the browser, or enter your credentials.</li>` +
        `<li class="list-group-item">Click <i class="fa fa-play-circle"/> on any task/issue row to start timing.</li>` +
        `<li class="list-group-item">Click <i class="fa fa-stop-circle"/> to stop and log the time to Odoo timesheets.</li>` +
        `</ol>` +
        `<h5 style="margin-top:16px;">Toolbar Buttons</h5>` +
        `<ul class="list-group">` +
        `<li class="list-group-item"><i class="fa fa-download"/> — Download current month timesheets as CSV</li>` +
        `<li class="list-group-item"><i class="fa fa-hand-o-left"/> — Switch between configured remotes</li>` +
        `<li class="list-group-item"><i class="fa fa-refresh"/> — Refresh task/issue list from Odoo</li>` +
        `<li class="list-group-item"><i class="fa fa-clock-o"/> — Discard active timer (no time recorded)</li>` +
        `<li class="list-group-item"><i class="fa fa-sign-out"/> — Log out from current remote</li>` +
        `<li class="list-group-item"><i class="fa fa-comments"/> — Open Messages/chatter window</li>` +
        `<li class="list-group-item"><i class="fa fa-video-camera"/> — Open screen recorder</li>` +
        `<li class="list-group-item"><i class="fa fa-list-alt"/> — View task timesheets (task rows only)</li>` +
        `<li class="list-group-item"><i class="fa fa-bug"/> — View internal application logs</li>` +
        `</ul>` +
        `<h5 style="margin-top:16px;">Keyboard Shortcuts</h5>` +
        `<ul class="list-group">` +
        `<li class="list-group-item"><kbd>Ctrl+Enter</kbd> — Send message in chatter compose box</li>` +
        `<li class="list-group-item"><kbd>Escape</kbd> — Close @mention dropdown in chatter</li>` +
        `</ul>` +
        `<h5 style="margin-top:16px;">Tray Menu</h5>` +
        `<p class="text-muted" style="font-size:13px;">Right-click the system tray icon to access Timer, Messages, Recorder, Screenshot, Options, Logs, and Quit. Closing the main window keeps the app running in the tray.</p>` +
        `</div></div>` +
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

        const aboutNavClass    = ctx.state.activePage === PAGE_ABOUT    ? 'selected' : 'notselected';
        const optionsNavClass  = ctx.state.activePage === PAGE_OPTIONS   ? 'selected' : 'notselected';
        const storageNavClass  = ctx.state.activePage === PAGE_STORAGE   ? 'selected' : 'notselected';
        const securityNavClass = ctx.state.activePage === PAGE_SECURITY  ? 'selected' : 'notselected';
        const helpNavClass     = ctx.state.activePage === PAGE_HELP      ? 'selected' : 'notselected';
        const aboutPageClass    = ctx.state.activePage === PAGE_ABOUT    ? 'active_page' : 'inactive_page';
        const optionsPageClass  = ctx.state.activePage === PAGE_OPTIONS  ? 'active_page' : 'inactive_page';
        const storagePageClass  = ctx.state.activePage === PAGE_STORAGE  ? 'active_page' : 'inactive_page';
        const securityPageClass = ctx.state.activePage === PAGE_SECURITY ? 'active_page' : 'inactive_page';
        const helpPageClass     = ctx.state.activePage === PAGE_HELP     ? 'active_page' : 'inactive_page';

        const showAboutHandler    = [() => { ctx.state.activePage = PAGE_ABOUT;    ctx.refreshStoragePaths(); }, ctx];
        const showOptionsHandler  = [() => { ctx.state.activePage = PAGE_OPTIONS;  }, ctx];
        const showStorageHandler  = [() => { ctx.state.activePage = PAGE_STORAGE;  ctx.refreshStoragePaths(); }, ctx];
        const showSecurityHandler = [() => { ctx.state.activePage = PAGE_SECURITY; }, ctx];
        const showHelpHandler     = [() => { ctx.state.activePage = PAGE_HELP;     }, ctx];

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

        // Storage action handlers
        const pickSsFolderHandler   = [ctx.pickScreenshotFolder, ctx];
        const clearSsFolderHandler  = [ctx.clearScreenshotFolder, ctx];
        const pickVidFolderHandler  = [ctx.pickVideoFolder, ctx];
        const clearVidFolderHandler = [ctx.clearVideoFolder, ctx];
        const exportConfigHandler   = [ctx.exportConfig, ctx];
        const importConfigHandler   = [ctx.importConfig, ctx];

        return rootBlock(
            [
                aboutNavClass,    showAboutHandler,
                optionsNavClass,  showOptionsHandler,
                aboutPageClass,   optionsPageClass,
                formSubmitHandler,
                fs.remote_host,          hostInputHandler,
                fs.remote_name,          nameInputHandler,
                fs.remote_database,      databaseInputHandler,
                fs.remote_odoo_version,  versionInputHandler,
                fs.remote_poll_interval, pollInputHandler,
                issuesRadioChecked,      issuesRadioHandler,
                tasksRadioChecked,       tasksRadioHandler,
                addRemoteHandler, reloadHandler, toggleListHandler, removeAllHandler,
                storageNavClass, showStorageHandler,
                securityNavClass, showSecurityHandler,
                helpNavClass, showHelpHandler,
                storagePageClass,
                pickSsFolderHandler, clearSsFolderHandler,
                pickVidFolderHandler, clearVidFolderHandler,
                exportConfigHandler, importConfigHandler,
                securityPageClass,
                helpPageClass,
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
            activePage:       PAGE_OPTIONS,
            remotes:          [],
            showList:         true,
            error:            '',
            screenshotFolder: '',
            videoFolder:      '',
            form: {
                remote_host:          '',
                remote_name:          '',
                remote_database:      '',
                remote_odoo_version:  '',
                remote_poll_interval: '60',
                remote_datasrc:       DEFAULT_DATA_SOURCE,
            },
        });
        onWillStart(async () => {
            await this.loadRemotes();
            await this.refreshStoragePaths();
        });
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

    /** Reload stored folder paths into state (for display). */
    async refreshStoragePaths() {
        try {
            this.state.screenshotFolder = (await window.electronAPI?.prefs?.get('screenshotFolder', '')) || '';
            this.state.videoFolder      = (await window.electronAPI?.prefs?.get('videoFolder',      '')) || '';
            // Update DOM spans if they exist
            const ss = document.getElementById('ss-folder-display');
            if (ss) ss.textContent = this.state.screenshotFolder || 'Not set (will prompt)';
            const vid = document.getElementById('vid-folder-display');
            if (vid) vid.textContent = this.state.videoFolder || 'Not set (will prompt)';
        } catch (_) {}
    }

    async pickScreenshotFolder() {
        const folder = await window.electronAPI?.recorder?.pickFolder?.();
        if (folder) {
            await window.electronAPI?.prefs?.set('screenshotFolder', folder);
            await this.refreshStoragePaths();
            await notify(`Screenshot folder set: ${folder}`);
        }
    }

    async clearScreenshotFolder() {
        await window.electronAPI?.prefs?.set('screenshotFolder', '');
        await this.refreshStoragePaths();
        await notify('Screenshot folder cleared — will prompt on each save.');
    }

    async pickVideoFolder() {
        const folder = await window.electronAPI?.recorder?.pickFolder?.();
        if (folder) {
            await window.electronAPI?.prefs?.set('videoFolder', folder);
            await this.refreshStoragePaths();
            await notify(`Video folder set: ${folder}`);
        }
    }

    async clearVideoFolder() {
        await window.electronAPI?.prefs?.set('videoFolder', '');
        await this.refreshStoragePaths();
        await notify('Video folder cleared — will prompt on each save.');
    }

    /** Open README in external browser. */
    openReadme() {
        window.electronAPI?.openExternal?.('https://github.com/Therp/odoo-timer/blob/master/README.md');
    }

    /** Open GitHub issues / community page. */
    openIssues() {
        window.electronAPI?.openExternal?.('https://github.com/Therp/odoo-timer/issues');
    }

    async exportConfig() {
        const result = await window.electronAPI?.config?.export?.();
        if (!result) { await notify('Export not available.'); return; }
        if (result.ok) await notify(`Configuration exported to:\n${result.path}`);
        else if (result.reason !== 'cancelled') await notify(`Export failed: ${result.reason}`);
    }

    async importConfig() {
        const result = await window.electronAPI?.config?.import?.();
        if (!result) { await notify('Import not available.'); return; }
        if (result.ok) {
            await notify('Configuration imported successfully. Some settings take effect after restart.');
            await this.loadRemotes();
        } else if (result.reason !== 'cancelled') {
            await notify(`Import failed: ${result.reason}`);
        }
    }

    get PAGE_ABOUT()          { return PAGE_ABOUT; }
    get PAGE_OPTIONS()        { return PAGE_OPTIONS; }
    get PAGE_STORAGE()        { return PAGE_STORAGE; }
    get PAGE_SECURITY()       { return PAGE_SECURITY; }
    get PAGE_HELP()           { return PAGE_HELP; }
    get DEFAULT_DATA_SOURCE() { return DEFAULT_DATA_SOURCE; }
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const compiledTemplates = globalThis.__THERP_TIMER_TEMPLATES__ || {};
// OptionsApp uses its own code-based template — same reason as PopupApp.
const templates = {
    ReadMore:   compiledTemplates.ReadMore || createReadMoreTemplate,
    OptionsApp: createOptionsAppTemplate,
};
try {
    mount(OptionsApp, document.getElementById('app'), { dev: false, templates });
} catch (err) {
    console.error('[OptionsApp] Mount failed:', err);
    const appRoot = document.getElementById('app');
    if (appRoot) {
        appRoot.innerHTML = `<div class="container no-remotes-set"><div class="alert alert-danger"><b>Startup error:</b> ${String(err?.message || err).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>`;
    }
}
