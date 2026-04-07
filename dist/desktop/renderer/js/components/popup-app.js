import {
    OdooRpc,
    storage,
    readRemotes,
    writeRemotes,
    sendTimerStateToBackground,
    clearOdooSessionCookies,
    toCSV,
    downloadTextFile,
    formatDuration,
    formatHoursMins,
    priorityStars,
    matchesIssue,
    extractMessageSummary,
    notify,
    confirmDialog,
    promptDialog,
} from '../lib/common.js';
import { ReadMore, createReadMoreTemplate } from './readmore.js';

const { Component, mount, useState, onMounted, onWillUnmount } = owl;

const VIEW_LOADING = 'loading';
const VIEW_LOGIN   = 'login';
const VIEW_MAIN    = 'main';

const DATA_SOURCE_ISSUE = 'project.issue';
const DATA_SOURCE_TASK  = 'project.task';

const STORAGE_KEYS = {
    useExistingSession:          'useExistingSession',
    autoDownloadIssueTimesheet:  'auto_download_issue_timesheet',
    timerStartIso:               'start_date_time',
    activeTimerId:               'active_timer_id',
    currentHost:                 'current_host',
    currentDatabase:             'current_host_db',
    currentDataSource:           'current_host_datasrc',
    currentHostState:            'current_host_state',
    usersIssues:                 'users_issues',
    searchLimit:                 'search_limit',
    showAllItems:                'show_all_items',
};

const TIMEOUTS = { sessionRestoreMs: 6000 };

const DEFAULTS = {
    selectedRemoteIndex: '0',
    searchLimit:         '10',
    busyMessage:         'Loading current session and projects…',
    dataSource:          DATA_SOURCE_ISSUE,
};

// ─── Template registry ────────────────────────────────────────────────────────

function getTemplateRegistry() {
    return globalThis.__THERP_TIMER_TEMPLATES__ || {};
}

function resolveTemplate(name, fallbackTemplate) {
    const registry = getTemplateRegistry();
    return typeof registry[name] === 'function' ? registry[name] : fallbackTemplate;
}

// ─── Compiled template (identical to chrome build) ────────────────────────────

function createPopupAppTemplate(app, bdom, helpers) {
    const { createBlock, list } = bdom;
    const { prepareList, OwlError, withKey } = helpers;

    const readMoreStage          = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const readMoreIssueLabel     = app.createComponent('ReadMore', true, false, false, ['text', 'limit', 'href']);
    const readMoreEffectiveHours = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const readMoreRemainingHours = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const readMoreProject        = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);

    const rootBlock = createBlock(
        `<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text">Loading current session and projects…</div><div class="loader-subtext">Please wait — or grab a cup of coffee ☕</div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options</a></div></div><div id="wrapper" block-attribute-2="class"><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on the current item"><input id="auto_download_timesheet_input" type="checkbox" block-property-7="checked" block-handler-8="change"/> Auto Download Current Item Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-9="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-10="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-11="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-12="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-13="click"/><span class="msg-icon-wrap" title="Open Messages" block-handler-22="click"><i class="fa fa-comments fa-2x"/><span class="msg-unread-badge" block-attribute-25="style"><block-text-26/></span></span><i block-attribute-23="class" title="Record screen" block-handler-24="click"/><a href="options_main_page.html" class="options-btn" title="Options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table class="table table-responsive-sm table-bordered table-fixed" id="table-task-issues"><thead><tr><th class="action-col"><div><block-child-3/></div><block-child-4/></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-text-14/> [<block-text-15/>]</div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-16="checked" block-handler-17="input"/> Show for everyone</label></th><block-child-5/><block-child-6/><th class="project-col">Project</th></tr></thead><tbody><block-child-7/><block-child-8/></tbody></table></div><div class="info-footer mx-3"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <block-text-18/></span><br/><span><b>Host:</b> <block-text-19/></span><br/><span><b>Database:</b> <block-text-20/></span><br/><span><b>Current User:</b> <block-text-21/></span><br/></div></div></div></div></div>`
    );

    const bootErrorBlock   = createBlock(`<div><p class="odooError"><block-text-0/></p></div>`);
    const noRemotesBlock   = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning">Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below and add one.</div></div>`);
    const loginFormBlock   = createBlock(`<form block-handler-0="submit.prevent"><block-child-0/><block-child-1/><div class="password-field"><block-child-2/><block-child-3/></div><select id="remote-selection" class="form-control" block-handler-1="change"><block-child-4/></select><div class="checkbox"><label><input type="checkbox" block-property-2="checked" block-handler-3="change"/> Use Existing Session</label></div><button class="login" type="submit">Login <block-child-5/></button><block-child-6/></form>`);
    const loginErrorBlock  = createBlock(`<p class="odooError"><block-text-0/></p>`);
    const usernameInputBlock = createBlock(`<input type="text" placeholder="Username" block-property-0="value" block-handler-1="input"/>`);
    const passwordInputBlock = createBlock(`<input block-attribute-0="type" id="unique-password" placeholder="Password" block-property-1="value" block-handler-2="input"/>`);
    const passwordToggleBlock = createBlock(`<span class="pass-viewer" block-handler-0="click"><i class="fa" block-attribute-1="class"/></span>`);
    const remoteOptionBlock   = createBlock(`<option block-attribute-0="value" block-attribute-1="selected"><block-text-2/></option>`);
    const loginSpinnerBlock   = createBlock(`<i class="fa fa-cog fa-spin"/>`);
    const remoteInfoBlock     = createBlock(`<div class="remote-info small-note">Host: <block-text-0/> <span class="current-source-chip"><block-text-1/></span></div>`);
    const activeTimerDurationBlock = createBlock(`<span class="startTimeCount"><block-text-0/></span>`);
    const hoursSpentHeaderBlock    = createBlock(`<th>Hours Spent</th>`);
    const remainingHoursHeaderBlock = createBlock(`<th>Remaining Hours</th>`);
    const issueRowBlock = createBlock(`<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/></td><td class="priority-cell"><block-child-2/><block-child-3/></td><td class="stage-cell"><block-child-4/></td><td class="issue-desc-cell"><block-child-5/></td><block-child-6/><block-child-7/><td class="project-cell"><block-child-8/></td></tr>`);
    const startTimerButtonBlock = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`);
    const stopTimerButtonBlock  = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
    const priorityStarBlock        = createBlock(`<span class="fa fa-star checked"/>`);
    const priorityStarOutlineBlock = createBlock(`<i class="fa fa-star-o"/>`);
    const effectiveHoursCellBlock  = createBlock(`<td><block-child-0/></td>`);
    const remainingHoursCellBlock  = createBlock(`<td><block-child-0/></td>`);
    const emptyIssuesRowBlock = createBlock(`<tr><td block-attribute-0="colspan" class="text-center text-danger">No matching items are currently available</td></tr>`);

    return function template(ctx, node, key = '') {
        let bootErrorNode, noRemotesNode, loginFormNode;
        let timerDurationNode, hoursSpentHeaderNode, remainingHoursHeaderNode;
        let issuesListNode, emptyIssuesNode;

        const loaderClass = ctx.state.view === VIEW_LOADING ? '' : 'hide';
        const loginClass  = ctx.state.view === VIEW_LOGIN  ? '' : 'hide';
        const wrapperClass = ctx.state.view === VIEW_MAIN   ? '' : 'hide';

        if (ctx.state.bootError) bootErrorNode = bootErrorBlock([ctx.state.bootError]);
        if (!ctx.state.remotes.length) noRemotesNode = noRemotesBlock();

        if (ctx.state.remotes.length) {
            let loginErrorNode, usernameInputNode, passwordInputNode;
            let passwordToggleNode, remoteOptionsNode, loginSpinnerNode, remoteInfoNode;

            if (ctx.state.loginError) loginErrorNode = loginErrorBlock([ctx.state.loginError]);

            if (!ctx.state.useExistingSession) {
                usernameInputNode = usernameInputBlock([
                    ctx.state.username,
                    [(ev) => { ctx.state.username = ev.target.value; }],
                ]);
                passwordInputNode = passwordInputBlock([
                    ctx.state.showPassword ? 'text' : 'password',
                    ctx.state.password,
                    [(ev) => { ctx.state.password = ev.target.value; }],
                ]);
                passwordToggleNode = passwordToggleBlock([
                    [ctx.togglePassword, ctx],
                    ctx.state.showPassword ? 'fa-eye-slash' : 'fa-eye',
                ]);
            }

            ctx = Object.create(ctx);
            const [remoteItems,, remoteCount, remoteChildren] = prepareList(ctx.state.remotes);
            const seenRemoteKeys = new Set();
            for (let i = 0; i < remoteCount; i++) {
                ctx.remote = remoteItems[i];
                const rk = ctx.remote.database + ctx.remote.url;
                if (seenRemoteKeys.has(String(rk))) throw new OwlError(`Duplicate remote key: ${rk}`);
                seenRemoteKeys.add(String(rk));
                remoteChildren[i] = withKey(
                    remoteOptionBlock([String(ctx.remote.__index), ctx.state.selectedRemoteIndex === String(ctx.remote.__index), ctx.remote.name]),
                    rk
                );
            }
            ctx = ctx.__proto__;
            remoteOptionsNode = list(remoteChildren);

            if (ctx.state.loginLoading) loginSpinnerNode = loginSpinnerBlock();
            if (ctx.currentRemote) {
                remoteInfoNode = remoteInfoBlock([
                    ctx.currentRemote.url,
                    ctx.currentRemote.datasrc || DATA_SOURCE_ISSUE,
                ]);
            }

            loginFormNode = loginFormBlock(
                [
                    ['prevent', ctx.login, ctx],
                    [(ev) => { ctx.state.selectedRemoteIndex = ev.target.value; }],
                    ctx.state.useExistingSession,
                    [ctx.toggleUseExistingSession, ctx],
                ],
                [loginErrorNode, usernameInputNode, passwordInputNode, passwordToggleNode,
                 remoteOptionsNode, loginSpinnerNode, remoteInfoNode]
            );
        }

        const searchQueryHandler = [(ev) => { ctx.state.searchQuery = ev.target.value; }];
        const limitHandler = [(ev) => { ctx.updateLimitPreference(ev.target.value); }];
        const autoDownloadHandler = [ctx.toggleAutoDownload, ctx];
        const downloadTimesheetHandler = [ctx.downloadCurrentMonthTimesheets, ctx];
        const switchRemotesHandler  = [ctx.switchBetweenRemotes, ctx];
        const refreshHandler        = [ctx.refreshAll, ctx];
        const resetTimerHandler     = [ctx.resetTimer, ctx];
        const logoutHandler         = [ctx.logout, ctx];
        const openMessagesHandler   = [ctx.openMessages, ctx];
        const totalUnread           = ctx.state.msgUnreadTotal || 0;
        const msgBadgeStyle         = totalUnread > 0 ? '' : 'display:none';
        const msgBadgeText          = totalUnread > 99 ? '99+' : String(totalUnread || '');
        const recordIconClass     = 'fa fa-video-camera fa-2x';
        const toggleRecordHandler = [ctx.toggleRecording, ctx];

        if (ctx.state.timerStartIso) timerDurationNode = activeTimerDurationBlock([ctx.formattedTimer]);

        if (ctx.state.dataSource === DATA_SOURCE_TASK) {
            hoursSpentHeaderNode    = hoursSpentHeaderBlock();
            remainingHoursHeaderNode = remainingHoursHeaderBlock();
        }

        ctx = Object.create(ctx);
        const [issueItems,, issueCount, issueChildren] = prepareList(ctx.filteredIssues);
        const seenIssueKeys = new Set();
        for (let i = 0; i < issueCount; i++) {
            const ir  = issueItems[i];
            const ik  = ir.id;
            if (seenIssueKeys.has(String(ik))) throw new OwlError(`Duplicate issue key: ${ik}`);
            seenIssueKeys.add(String(ik));

            let startTimerNode, stopTimerNode;
            const rowClass = ctx.state.activeTimerId === ir.id ? 'active-row' : '';

            if (ctx.state.activeTimerId === ir.id) {
                stopTimerNode = stopTimerButtonBlock([[() => ctx.stopTimer(ir), ctx]]);
            } else {
                startTimerNode = startTimerButtonBlock([[() => ctx.startTimer(ir), ctx]]);
            }

            const priorityCount  = priorityStars(ir.priority);
            const starsNode      = list(priorityCount.map((_, si) => withKey(priorityStarBlock(), `star_${ik}_${si}`)));
            const outlineCount   = priorityStars(ir.priority).length;
            const maxStars       = 3;
            const outlines       = Array.from({ length: maxStars - outlineCount }, (_, oi) =>
                withKey(priorityStarOutlineBlock(), `outline_${ik}_${oi}`)
            );
            const outlineNode    = list(outlines);

            const stageNode      = readMoreStage({ text: String(ir.stage_id?.[1] || ''), limit: 14 }, key + `__stage__${ik}`, node, this, null);
            const labelNode      = readMoreIssueLabel({ text: ctx.issueLabel(ir), limit: 60, href: ctx.issueHref(ir) }, key + `__label__${ik}`, node, this, null);

            let effectiveHoursNode, remainingHoursNode;
            if (ctx.state.dataSource === DATA_SOURCE_TASK) {
                effectiveHoursNode = effectiveHoursCellBlock([], [
                    readMoreEffectiveHours({ text: ctx.formatHours(ir.effective_hours), limit: 10 }, key + `__eff__${ik}`, node, this, null),
                ]);
                remainingHoursNode = remainingHoursCellBlock([], [
                    readMoreRemainingHours({ text: ctx.formatHours(ir.remaining_hours), limit: 10 }, key + `__rem__${ik}`, node, this, null),
                ]);
            }

            const projectNode = readMoreProject({ text: String(ir.project_id?.[1] || ''), limit: 22 }, key + `__proj__${ik}`, node, this, null);

            issueChildren[i] = withKey(
                issueRowBlock([rowClass], [
                    startTimerNode, stopTimerNode,
                    starsNode, outlineNode,
                    stageNode, labelNode,
                    effectiveHoursNode, remainingHoursNode,
                    projectNode,
                ]),
                ik
            );
        }
        ctx = ctx.__proto__;
        if (issueCount) issuesListNode = list(issueChildren);
        else emptyIssuesNode = emptyIssuesRowBlock([ctx.state.dataSource === DATA_SOURCE_TASK ? '9' : '7']);

        return rootBlock(
            [
                loaderClass, loginClass, wrapperClass,
                ctx.state.searchQuery, searchQueryHandler,
                ctx.state.limitTo, limitHandler,
                ctx.state.autoDownloadIssueTimesheet, autoDownloadHandler,
                downloadTimesheetHandler, switchRemotesHandler,
                refreshHandler, resetTimerHandler, logoutHandler,
                ctx.itemLabelPlural, String(ctx.filteredIssues.length),
                ctx.state.allIssues, [(ev) => { ctx.updateShowAllPreference(ev.target.checked); }],
                ctx.state.serverVersion || 'N/A',
                ctx.state.currentHost, ctx.state.currentDatabase,
                ctx.state.user?.display_name || '—',
                openMessagesHandler,
                recordIconClass,
                toggleRecordHandler,
                msgBadgeStyle,
                msgBadgeText,
            ],
            [
                bootErrorNode, noRemotesNode, loginFormNode,
                timerDurationNode, null,
                hoursSpentHeaderNode, remainingHoursHeaderNode,
                issuesListNode, emptyIssuesNode,
            ]
        );
    };
}

// ─── PopupApp component ───────────────────────────────────────────────────────

class PopupApp extends Component {
    static components = { ReadMore };
    static template   = 'PopupApp';

    setup() {
        this.rpc   = new OdooRpc();
        this.state = useState({
            view:              VIEW_LOADING,
            remotes:           [],
            selectedRemoteIndex: DEFAULTS.selectedRemoteIndex,
            useExistingSession: true,
            username:          '',
            password:          '',
            showPassword:      false,
            loginLoading:      false,
            loginError:        '',
            bootError:         '',
            user:              null,
            projects:          [],
            issues:            [],
            searchQuery:       '',
            limitTo:           DEFAULTS.searchLimit,
            allIssues:         false,
            autoDownloadIssueTimesheet: false,
            activeTimerId:     null,
            timerStartIso:     null,
            timerNow:          Date.now(),
            currentHost:       '',
            currentDatabase:   '',
            dataSource:        DEFAULTS.dataSource,
            serverVersion:     '',
            supportedFields:   {},
            busyMessage:       DEFAULTS.busyMessage,
            loadingTable:      false,
            msgUnreadTotal:    0,
        });

        this._timerHandle = null;
        // Bind handlers referenced in template
        this.startTimer                  = this.startTimer.bind(this);
        this.stopTimer                   = this.stopTimer.bind(this);
        this.resetTimer                  = this.resetTimer.bind(this);
        this.refreshAll                  = this.refreshAll.bind(this);
        this.downloadCurrentMonthTimesheets = this.downloadCurrentMonthTimesheets.bind(this);
        this.switchBetweenRemotes        = this.switchBetweenRemotes.bind(this);
        this.logout                      = this.logout.bind(this);
        this.openMessages                = this.openMessages.bind(this);
        this.toggleRecording             = this.toggleRecording.bind(this);
        this.toggleAutoDownload          = this.toggleAutoDownload.bind(this);
        this.toggleUseExistingSession    = this.toggleUseExistingSession.bind(this);
        this.togglePassword              = this.togglePassword.bind(this);

        onMounted(() => {
            const bootLoader = document.getElementById('boot-loader');
            if (bootLoader) bootLoader.classList.add('hide');

            this._timerHandle = setInterval(() => {
                this.state.timerNow = Date.now();
            }, 1000);

            this.bootstrapWithTimeout();

            // Sync unread message total from messages window (via storage)
            this._unreadSyncHandle = setInterval(async () => {
                try {
                    const total = await storage.get('msg_total_unread', 0);
                    if (Number(total) !== this.state.msgUnreadTotal) {
                        this.state.msgUnreadTotal = Number(total) || 0;
                    }
                } catch (_) {}
            }, 3000);
        });

        onWillUnmount(() => {
            if (this._timerHandle) clearInterval(this._timerHandle);
            if (this._unreadSyncHandle) clearInterval(this._unreadSyncHandle);
        });
    }

    get currentRemote() {
        const idx = Number(this.state.selectedRemoteIndex || 0);
        return this.state.remotes[idx] || null;
    }

    get formattedTimer() {
        if (!this.state.timerStartIso) return '00:00:00';
        return formatDuration(this.state.timerNow - new Date(this.state.timerStartIso).getTime());
    }

    get itemLabelSingular() { return this.state.dataSource === DATA_SOURCE_TASK ? 'task' : 'issue'; }
    get itemLabelPlural()   { return this.state.dataSource === DATA_SOURCE_TASK ? 'Tasks' : 'Issues'; }

    async updateLimitPreference(value) {
        this.state.limitTo = value;
        await storage.set(STORAGE_KEYS.searchLimit, value);
    }

    async updateShowAllPreference(value) {
        this.state.allIssues = !!value;
        await storage.set(STORAGE_KEYS.showAllItems, !!value);
    }

    get filteredIssues() {
        const limit = this.state.limitTo ? Number(this.state.limitTo) : null;
        let issues = [...this.state.issues];

        issues.sort((a, b) => {
            if (a.id === this.state.activeTimerId) return -1;
            if (b.id === this.state.activeTimerId) return 1;
            const pd = Number(b.priority || 0) - Number(a.priority || 0);
            if (pd !== 0) return pd;
            const sd = Number(a.stage_sequence ?? 9999) - Number(b.stage_sequence ?? 9999);
            if (sd !== 0) return sd;
            return a.id - b.id;
        });

        if (!this.state.allIssues && this.state.user?.id) {
            issues = issues.filter(
                (issue) => issue.id === this.state.activeTimerId || issue.user_id?.[0] === this.state.user.id
            );
        }

        issues = issues.filter((issue) => matchesIssue(issue, this.state.searchQuery));
        return limit ? issues.slice(0, limit) : issues;
    }

    isSessionExpiredError(err) {
        const message = String(err?.message || '').toLowerCase();
        return (
            message.includes('session expired') || message.includes('expired session') ||
            message.includes('invalid session') || message.includes('session_id') ||
            message.includes('access denied')   || message.includes('unauthorized')
        );
    }

    async handleExpiredSession(reason = 'Your Odoo session expired. Please log in again.') {
        try { if (this.state.currentHost) await clearOdooSessionCookies(this.state.currentHost); } catch {}
        try { if (this.state.currentDatabase) await storage.remove(this.state.currentDatabase); } catch {}
        await storage.set(STORAGE_KEYS.currentHostState, 'Inactive');
        Object.assign(this.state, {
            user: null, projects: [], issues: [], serverVersion: '', supportedFields: {},
            view: VIEW_LOGIN, loginLoading: false, loadingTable: false,
            useExistingSession: false, loginError: reason, bootError: '',
        });
    }

    async withSessionGuard(action) {
        try { return await action(); }
        catch (err) {
            if (this.isSessionExpiredError(err)) {
                await this.handleExpiredSession();
            } else {
                throw err;
            }
        }
    }

    async bootstrapWithTimeout() {
        this.state.view      = VIEW_LOADING;
        this.state.bootError = '';
        this.state.busyMessage = DEFAULTS.busyMessage;
        try { await this.bootstrap(); }
        catch (err) {
            console.warn('Bootstrap fallback:', err);
            this.state.bootError = err.message || 'Startup error. Please log in manually.';
            this.state.view = VIEW_LOGIN;
        }
    }

    async clearLegacyIssueCache() {
        try { await storage.remove(STORAGE_KEYS.usersIssues); } catch {}
    }

    async loadStoredPopupState() {
        const [
            useExisting, autoDownload, timerStartIso, activeTimerIdRaw,
            currentHost, currentDb, currentSrc, searchLimit, showAllItems,
        ] = await Promise.all([
            storage.get(STORAGE_KEYS.useExistingSession, true),
            storage.get(STORAGE_KEYS.autoDownloadIssueTimesheet, false),
            storage.get(STORAGE_KEYS.timerStartIso, null),
            storage.get(STORAGE_KEYS.activeTimerId, null),
            storage.get(STORAGE_KEYS.currentHost, ''),
            storage.get(STORAGE_KEYS.currentDatabase, ''),
            storage.get(STORAGE_KEYS.currentDataSource, DEFAULTS.dataSource),
            storage.get(STORAGE_KEYS.searchLimit, DEFAULTS.searchLimit),
            storage.get(STORAGE_KEYS.showAllItems, false),
        ]);
        this.state.useExistingSession        = !!useExisting;
        this.state.autoDownloadIssueTimesheet = !!autoDownload;
        this.state.timerStartIso             = timerStartIso;
        this.state.activeTimerId             = activeTimerIdRaw ? Number(activeTimerIdRaw) : null;
        this.state.currentHost               = currentHost || '';
        this.state.currentDatabase           = currentDb || '';
        this.state.dataSource                = currentSrc || DEFAULTS.dataSource;
        this.state.limitTo                   = searchLimit ?? DEFAULTS.searchLimit;
        this.state.allIssues                 = !!showAllItems;
    }

    async bootstrap() {
        this.state.busyMessage = DEFAULTS.busyMessage;
        await this.clearLegacyIssueCache();

        this.state.remotes = (await readRemotes()).map((remote, idx) => ({
            ...remote, __index: String(idx),
        }));

        await this.loadStoredPopupState();

        if (!this.state.currentHost) { this.state.view = VIEW_LOGIN; return; }

        this.rpc.setHost(this.state.currentHost);

        const remoteIndex = this.state.remotes.findIndex(
            (r) => r.url === this.state.currentHost && r.database === this.state.currentDatabase
        );
        const currentRemoteObj = remoteIndex >= 0 ? this.state.remotes[remoteIndex] : null;
        if (remoteIndex >= 0) this.state.selectedRemoteIndex = String(remoteIndex);

        try {
            this.state.busyMessage = 'Restoring session…';

            // Electron uses Chromium session cookies — getSessionInfo() works
            // identically to the browser extension.
            const sessionInfo = await Promise.race([
                this.rpc.getSessionInfo(),
                new Promise((_, rej) =>
                    setTimeout(() => rej(new Error('Session restore timed out')), TIMEOUTS.sessionRestoreMs)
                ),
            ]);

            if (sessionInfo?.uid) {
                await this.completeSession(sessionInfo, currentRemoteObj);
                return;
            }

            this.state.view = VIEW_LOGIN;
            this.state.useExistingSession = false;
            this.state.loginError = 'No active Odoo session found. Please log in.';
        } catch (err) {
            console.warn('Session bootstrap failed', err);
            if (this.isSessionExpiredError(err)) {
                await this.handleExpiredSession('Your saved Odoo session expired. Please log in again.');
                return;
            }
            this.state.bootError = err.message || 'Could not restore session.';
            this.state.view = VIEW_LOGIN;
        }
    }

    togglePassword() { this.state.showPassword = !this.state.showPassword; }

    toggleUseExistingSession(ev) {
        this.state.useExistingSession = ev.target.checked;
        storage.set(STORAGE_KEYS.useExistingSession, !!this.state.useExistingSession);
    }

    toggleAutoDownload(ev) {
        this.state.autoDownloadIssueTimesheet = ev.target.checked;
        storage.set(STORAGE_KEYS.autoDownloadIssueTimesheet, !!this.state.autoDownloadIssueTimesheet);
    }

    normalizeText(value) {
        if (value == null || typeof value === 'function') return '';
        if (Array.isArray(value)) {
            if (value.length >= 2 && (typeof value[1] === 'string' || typeof value[1] === 'number'))
                return String(value[1]);
            return value.map((item) => this.normalizeText(item)).filter(Boolean).join(' ');
        }
        if (typeof value === 'object')
            return String(value.display_name || value.name || value.label || value.value || '');
        return String(value);
    }

    issueHref(issue) {
        if (!this.state.currentHost || !issue?.id) return null;
        return `${this.state.currentHost}/web#id=${issue.id}&model=${this.state.dataSource}&view_type=form`;
    }

    issueLabel(issue) {
        const name = this.normalizeText(
            issue.display_name || issue.name || issue.message_summary || issue.description || ''
        );
        if (this.state.dataSource === DATA_SOURCE_TASK) {
            const code = this.normalizeText(issue.code);
            return [code, name].filter(Boolean).join(' - ') || `#${issue.id}`;
        }
        return [`#${issue.id}`, name].filter(Boolean).join(' - ');
    }

    formatHours(value) { return formatHoursMins(value); }

    async login() {
        const remote = this.currentRemote;
        if (!remote) { this.state.loginError = 'Please configure a remote first.'; return; }

        this.state.loginLoading = true;
        this.state.loginError   = '';

        // Configure RPC from remote
        this.rpc.setHost(remote.url);

        this.state.currentHost     = remote.url;
        this.state.currentDatabase = remote.database;
        this.state.dataSource      = remote.datasrc || DEFAULTS.dataSource;

        await storage.set(STORAGE_KEYS.currentHost, remote.url);
        await storage.set(STORAGE_KEYS.currentDatabase, remote.database);
        await storage.set(STORAGE_KEYS.currentDataSource, this.state.dataSource);

        try {
            let sessionInfo;

            if (this.state.useExistingSession) {
                sessionInfo = await this.rpc.getSessionInfo();
                if (!sessionInfo?.uid) throw new Error('No active Odoo session found. Turn off "Use Existing Session" to log in manually.');
            } else {
                if (!this.state.username || !this.state.password) throw new Error('Username or password is missing');
                sessionInfo = await this.rpc.login(remote.database, this.state.username, this.state.password);
            }

            await this.completeSession(sessionInfo, remote);
            this.state.username = '';
            this.state.password = '';
        } catch (err) {
            console.error(err);
            this.state.loginError = err.message || 'Login failed';
            this.state.view = VIEW_LOGIN;
        } finally {
            this.state.loginLoading = false;
        }
    }

    async completeSession(sessionInfo, remote) {
        this.state.busyMessage   = 'Loading tasks…';
        this.state.loadingTable  = true;
        const remoteInfo = remote || this.currentRemote || null;

        this.state.currentDatabase = sessionInfo.db || remoteInfo?.database || this.state.currentDatabase;
        this.state.currentHost     = remoteInfo?.url || this.state.currentHost;
        this.state.dataSource      = remoteInfo?.datasrc || this.state.dataSource || DEFAULTS.dataSource;

        try { await storage.set(this.state.currentDatabase, JSON.stringify(sessionInfo)); } catch {}

        await storage.set(STORAGE_KEYS.currentHostState, 'Active');

        if (remoteInfo) {
            const remotes = await readRemotes();
            const updated = remotes.map((r) =>
                r.url === remoteInfo.url && r.database === remoteInfo.database
                    ? { ...r, state: 'Active' }
                    : r
            );
            await writeRemotes(updated);
            this.state.remotes = updated.map((r, idx) => ({ ...r, __index: String(idx) }));
        }

        const userPromise = this.rpc
            .searchRead('res.users', [['id', '=', sessionInfo.uid]], ['display_name'])
            .catch(() => ({ records: [] }));

        const serverInfoPromise = this.rpc.getServerInfo().catch(() => null);

        try {
            const [userResult, serverInfo] = await Promise.all([
                userPromise, serverInfoPromise,
                this.loadProjects().catch((err) => console.warn('loadProjects failed', err)),
                this.loadIssues().catch((err) => console.warn('loadIssues failed', err)),
            ]);

            this.state.user = userResult.records?.[0] || {
                id: sessionInfo.uid,
                display_name: sessionInfo.username || sessionInfo.name || 'Unknown',
            };

            if (serverInfo) {
                this.state.serverVersion = serverInfo.server_version || serverInfo.version?.server_version || '';
            }

            this.state.view = VIEW_MAIN;
        } finally {
            this.state.loadingTable = false;
        }
    }

    async loadProjects() {
        const result = await this.rpc.searchRead('project.project', [], ['analytic_account_id']);
        this.state.projects = result.records || [];
    }

    async getSupportedFieldsForModel(model) {
        let fields = this.state.supportedFields[model] || null;
        if (!fields) {
            try {
                fields = await this.rpc.fieldsGet(model, ['type', 'string']);
                this.state.supportedFields[model] = fields || {};
            } catch (err) {
                console.warn(`Could not inspect fields for ${model}`, err);
            }
        }
        return fields;
    }

    async searchReadWithInvalidFieldRetry(model, domain, requestedFields) {
        try { return await this.rpc.searchRead(model, domain, requestedFields); }
        catch (err) {
            const m = String(err?.message || '');
            const match = m.match(/Invalid field ['"]([\w.]+)['"]/i);
            if (!match) throw err;
            const invalid = match[1];
            const narrowed = requestedFields.filter((f) => f !== invalid);
            if (!narrowed.length || narrowed.length === requestedFields.length) throw err;
            console.warn(`Retrying ${model} without unsupported field: ${invalid}`);
            return this.searchReadWithInvalidFieldRetry(model, domain, narrowed);
        }
    }

    async loadIssues() {
        const model = this.state.dataSource;
        this.state.loadingTable = true;

        try {
            const domain = ['|', ['id', '=', this.state.activeTimerId || 0],
                '&', ['stage_id.name', 'not ilike', '%Done%'],
                '&', ['stage_id.name', 'not ilike', '%Cancel%'],
                     ['stage_id.name', 'not ilike', '%Hold%']];

            const baseFields   = ['id','name','user_id','project_id','stage_id','priority','create_date','analytic_account_id'];
            const extraByModel = {
                [DATA_SOURCE_ISSUE]: ['working_hours_open','message_summary','message_unread','description'],
                [DATA_SOURCE_TASK]:  ['effective_hours','remaining_hours','code','description','display_name'],
            };
            const desiredFields = [...baseFields, ...(extraByModel[model] || [])];
            const availableFields = await this.getSupportedFieldsForModel(model);

            let fields = availableFields
                ? desiredFields.filter((f) => Object.prototype.hasOwnProperty.call(availableFields, f))
                : desiredFields.filter((f) => f !== 'message_summary' && f !== 'message_unread');

            if (model === DATA_SOURCE_TASK) fields = fields.filter((f) => f !== 'message_summary' && f !== 'message_unread');

            const result = await this.searchReadWithInvalidFieldRetry(model, domain, fields);
            const records = result.records || [];

            let stageSeqMap = new Map();
            if (model === DATA_SOURCE_TASK) {
                const stageIds = [...new Set(records.map((r) => r.stage_id?.[0]).filter(Boolean))];
                if (stageIds.length) {
                    const stages = await this.rpc.searchRead('project.task.type', [['id','in',stageIds]], ['id','sequence']);
                    stageSeqMap = new Map((stages.records || []).map((s) => [s.id, Number(s.sequence || 0)]));
                }
            }

            this.state.issues = records.map((issue) => ({
                ...issue,
                message_summary: extractMessageSummary(
                    issue.message_summary || issue.description || issue.display_name || issue.name || ''
                ),
                priority_level: priorityStars(issue.priority),
                stage_sequence: stageSeqMap.get(issue.stage_id?.[0]) ?? 9999,
            }));
        } finally {
            this.state.loadingTable = false;
        }
    }

    async refreshAll() {
        try { await this.loadProjects(); await this.loadIssues(); }
        catch (err) { await notify(err.message || 'Failed to refresh items.'); }
    }

    async startTimer(issue) {
        const now = new Date().toISOString();
        this.state.activeTimerId  = issue.id;
        this.state.timerStartIso  = now;
        await storage.set(STORAGE_KEYS.timerStartIso, now);
        await storage.set(STORAGE_KEYS.activeTimerId, issue.id);
        const taskLabel = `#${issue.id} – ${(issue.name || '').slice(0, 60)}`;
        await sendTimerStateToBackground(true, taskLabel);
    }

    resolveAnalyticAccount(issue) {
        if (issue.analytic_account_id) return issue.analytic_account_id;
        const project = this.state.projects.find((p) => p.id === issue.project_id?.[0]);
        return project?.analytic_account_id;
    }

    async createIssueTimesheet(params) {
        const journalResult = await this.rpc.searchRead('account.analytic.journal', [['name','ilike','Timesheet']], ['name']);
        const journal = journalResult.records?.[0];
        if (!journal) throw new Error('No Timesheet analytic journal found in Odoo.');

        await this.rpc.call('hr.analytic.timesheet', 'create', [{
            date: params.date, user_id: this.state.user.id,
            name: params.issueName, journal_id: journal.id,
            account_id: params.analyticAccount[0],
            unit_amount: params.durationInHours,
            to_invoice: 1, issue_id: params.issue.id,
        }], {});
    }

    async createTaskTimesheet(params) {
        await this.rpc.call('account.analytic.line', 'create', [{
            date: params.date, user_id: this.state.user.id,
            name: params.issueName, account_id: params.analyticAccount[0],
            unit_amount: params.durationInHours,
            project_id: params.issue.project_id?.[0],
            task_id: params.issue.id,
        }], {});
    }

    async stopTimer(issue) {
        try {
            const issueDescription = (await promptDialog(
                `${this.itemLabelSingular.charAt(0).toUpperCase()}${this.itemLabelSingular.slice(1)} #${issue.id} Description`,
                issue.name
            )) || '';

            const startIso = this.state.timerStartIso || (await storage.get(STORAGE_KEYS.timerStartIso, null));
            if (!startIso) throw new Error('No start time found for the active timer.');

            const now             = new Date();
            const durationMinutes = Math.max(0, (now.getTime() - new Date(startIso).getTime()) / 60000);
            const roundedMinutes  = Math.round((durationMinutes % 60) / 15) * 15;
            const durationInHours = Math.floor(durationMinutes / 60) + roundedMinutes / 60;
            const analyticAccount = this.resolveAnalyticAccount(issue);
            if (!analyticAccount) throw new Error('No analytic account is defined on the project.');

            const issueName     = issueDescription.trim() || `${issue.name} (#${issue.id})`;
            const formattedDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            const payload = { issue, issueName, analyticAccount, durationInHours, date: formattedDate };

            if (this.state.dataSource === DATA_SOURCE_ISSUE) await this.createIssueTimesheet(payload);
            else await this.createTaskTimesheet(payload);

            await notify(`Time for ${this.itemLabelSingular} #${issue.id} was successfully recorded in Odoo timesheets.`);

            if (this.state.autoDownloadIssueTimesheet) await this.downloadCurrentIssueTimesheet(issue);

            this.state.activeTimerId = null;
            this.state.timerStartIso = null;
            await storage.remove(STORAGE_KEYS.timerStartIso);
            await storage.remove(STORAGE_KEYS.activeTimerId);
            await sendTimerStateToBackground(false);
            await this.loadIssues();
        } catch (err) {
            console.error(err);
            await notify(err.message || `Could not stop the ${this.itemLabelSingular} timer.`);
        }
    }

    async resetTimer() {
        if (!this.state.activeTimerId) return;
        const ok = await confirmDialog(`Discard the running ${this.itemLabelSingular} timer without saving to Odoo?`);
        if (!ok) return;
        this.state.activeTimerId = null;
        this.state.timerStartIso = null;
        await storage.remove(STORAGE_KEYS.timerStartIso);
        await storage.remove(STORAGE_KEYS.activeTimerId);
        await sendTimerStateToBackground(false);
        await this.loadIssues();
    }

    async downloadCurrentMonthTimesheets() {
        try {
            if (!this.state.user?.id) throw new Error('Login first.');
            const today    = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
            const now      = today.toISOString().slice(0, 10);
            const model    = this.state.dataSource === DATA_SOURCE_TASK ? 'account.analytic.line' : 'hr.analytic.timesheet';
            const result   = await this.rpc.searchRead(model, [
                ['user_id', '=', this.state.user.id],
                ['create_date', '>=', firstDay],
                ['create_date', '<=', now],
            ], []);
            const csv = toCSV(result.records || []);
            if (!csv) { await notify('No timesheet rows found for this month.'); return; }
            const filename = `Timesheet [${new Date().toGMTString()}].csv`;
            downloadTextFile(filename, csv, 'application/csv;charset=utf-8;');
            await notify(`Timesheet saved as ${filename}.`);
        } catch (err) { await notify(err.message || 'Could not download timesheet.'); }
    }

    async downloadCurrentIssueTimesheet(issue) {
        const today    = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        const now      = today.toISOString().slice(0, 10);
        const model    = this.state.dataSource === DATA_SOURCE_TASK ? 'account.analytic.line' : 'hr.analytic.timesheet';
        const keyField = this.state.dataSource === DATA_SOURCE_TASK ? 'task_id' : 'issue_id';
        const result   = await this.rpc.searchRead(model, [
            ['user_id', '=', this.state.user.id],
            ['create_date', '>=', firstDay],
            ['create_date', '<=', now],
            [keyField, '=', issue.id],
        ], []);
        const csv = toCSV(result.records || []);
        if (!csv) return;
        downloadTextFile(`Timesheet-#${issue.id}-[${new Date().toGMTString()}].csv`, csv, 'application/csv;charset=utf-8;');
    }

    async switchBetweenRemotes() {
        if (this.state.activeTimerId) {
            await notify(`Please stop timer for ${this.itemLabelSingular} #${this.state.activeTimerId} before switching.`);
            return;
        }
        this.state.view = VIEW_LOGIN;
        this.state.useExistingSession = true;
        await storage.set(STORAGE_KEYS.useExistingSession, true);
    }

    toggleRecording() {
        window.electronAPI?.recorder?.open?.();
    }

    openMessages() {
        window.electronAPI?.openMessages?.();
    }

    async logout() {
        if (this.state.activeTimerId) {
            await notify(`Please stop timer for ${this.itemLabelSingular} #${this.state.activeTimerId} before logging out.`);
            return;
        }
        const ok = await confirmDialog('Are you sure you want to logout?');
        if (!ok) return;

        const remote = this.currentRemote || {};
        try { await this.rpc.logout(); } catch {}
        await clearOdooSessionCookies(this.state.currentHost);
        await storage.remove(this.state.currentDatabase);
        await storage.set(STORAGE_KEYS.currentHostState, 'Inactive');
        Object.assign(this.state, {
            user: null, issues: [], projects: [], view: VIEW_LOGIN, useExistingSession: true,
        });
    }
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const compiledTemplates = globalThis.__THERP_TIMER_TEMPLATES__ || {};
// PopupApp uses its own code-based template — the XML source (popup_app.xml)
// is compiled only for reference/documentation. The code-based template is
// kept in sync and avoids Electron path / call-signature mismatches.
const templates = {
    ReadMore: compiledTemplates.ReadMore || createReadMoreTemplate,
    PopupApp: createPopupAppTemplate,
};

mount(PopupApp, document.getElementById('app'), { dev: false, templates });
