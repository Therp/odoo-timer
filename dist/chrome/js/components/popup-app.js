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

const {Component, mount, useState, onMounted, onWillUnmount} = owl;

const VIEW_LOADING = 'loading';
const VIEW_LOGIN = 'login';
const VIEW_MAIN = 'main';

const DATA_SOURCE_ISSUE = 'project.issue';
const DATA_SOURCE_TASK = 'project.task';

const STORAGE_KEYS = {
    useExistingSession: 'useExistingSession',
    autoDownloadIssueTimesheet: 'auto_download_issue_timesheet',
    timerStartIso: 'start_date_time',
    activeTimerId: 'active_timer_id',
    currentHost: 'current_host',
    currentDatabase: 'current_host_db',
    currentDataSource: 'current_host_datasrc',
    currentHostState: 'current_host_state',
    usersIssues: 'users_issues',
    odooOWLVersion: 'odoo_owl_version',
    searchLimit: 'search_limit',
    showAllItems: 'show_all_items',
};

const TIMEOUTS = {
    sessionRestoreMs: 4000,
};

const DEFAULTS = {
    selectedRemoteIndex: '0',
    searchLimit: '10',
    busyMessage: 'Loading current session and projects…',
    dataSource: DATA_SOURCE_ISSUE,
};


function getTemplateRegistry() {
  return globalThis.__THERP_TIMER_TEMPLATES__ || {};
}

function resolveTemplate(name, fallbackTemplate) {
    const registry = getTemplateRegistry();
    return typeof registry[name] === 'function'
        ? registry[name]
        : fallbackTemplate;
}

/**
 * Create the compiled template used by the popup application.
 */
function createPopupAppTemplate(app, bdom, helpers) {
    const {createBlock, list} = bdom;
    const {prepareList, OwlError, withKey} = helpers;

    const readMoreStage = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const readMoreIssueLabel = app.createComponent('ReadMore', true, false, false, ['text', 'limit', 'href']);
    const readMoreEffectiveHours = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const readMoreRemainingHours = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
    const readMoreProject = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);

    const rootBlock = createBlock(
        `<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text">Loading current session and projects…</div><div class="loader-subtext">Please wait — or grab a cup of coffee ☕</div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="/img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options</a></div></div><div id="wrapper" block-attribute-2="class"><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-7="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-8="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-9="click"/><i class="fa fa-undo fa-2x" title="Discard the active timer" block-handler-10="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-11="click"/><a href="options_main_page.html" class="options-btn" title="Go To options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table class="table table-responsive-sm table-bordered table-fixed" id="table-task-issues"><thead><tr><th class="action-col"><div><block-child-3/></div><block-child-4/></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-text-12/> [<block-text-13/>]</div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-14="checked" block-handler-15="input"/> Show for everyone</label></th><block-child-5/><block-child-6/><th class="project-col">Project</th></tr></thead><tbody><block-child-7/><block-child-8/></tbody></table></div><div class="info-footer mx-3"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <block-text-16/></span><br/><span><b>Host:</b> <block-text-17/></span><br/><span><b>Database:</b> <block-text-18/></span><br/><span><b>Current User:</b> <block-text-19/></span><br/></div></div></div></div></div>`
    );
    const bootErrorBlock = createBlock(`<div><p class="odooError"><block-text-0/></p></div>`);
    const noRemotesBlock = createBlock(
        `<div class="container no-remotes-set"><div class="alert alert-warning">Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below and add one.</div></div>`
    );
    const loginFormBlock = createBlock(
        `<form block-handler-0="submit.prevent"><block-child-0/><block-child-1/><div class="password-field"><block-child-2/><block-child-3/></div><select id="remote-selection" class="form-control" block-handler-1="change"><block-child-4/></select><div class="checkbox"><label><input type="checkbox" block-property-2="checked" block-handler-3="change"/> Use Existing Session</label></div><button class="login" type="submit">Login <block-child-5/></button><block-child-6/></form>`
    );
    const loginErrorBlock = createBlock(`<p class="odooError"><block-text-0/></p>`);
    const usernameInputBlock = createBlock(
        `<input type="text" placeholder="Username" block-property-0="value" block-handler-1="input"/>`
    );
    const passwordInputBlock = createBlock(
        `<input block-attribute-0="type" id="unique-password" placeholder="Password" block-property-1="value" block-handler-2="input"/>`
    );
    const passwordToggleBlock = createBlock(
        `<span class="pass-viewer" block-handler-0="click"><i class="fa" block-attribute-1="class"/></span>`
    );
    const remoteOptionBlock = createBlock(
        `<option block-attribute-0="value" block-attribute-1="selected"><block-text-2/></option>`
    );
    const loginSpinnerBlock = createBlock(`<i class="fa fa-cog fa-spin"/>`);
    const remoteInfoBlock = createBlock(
        `<div class="remote-info small-note">Host: <block-text-0/> <span class="current-source-chip"><block-text-1/></span></div>`
    );
    const activeTimerDurationBlock = createBlock(`<span class="startTimeCount"><block-text-0/></span>`);
    const hoursSpentHeaderBlock = createBlock(`<th class="text-center">Hours Spent</th>`);
    const remainingHoursHeaderBlock = createBlock(`<th class="text-center">Hours Left</th>`);
    const issueRowBlock = createBlock(
        `<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/></td><td class="priority-cell"><block-child-2/><block-child-3/></td><td class="stage-cell"><block-child-4/></td><td class="issue-desc-cell"><block-child-5/></td><block-child-6/><block-child-7/><td class="project-cell"><block-child-8/></td></tr>`
    );
    const startTimerButtonBlock = createBlock(
        `<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`
    );
    const stopTimerButtonBlock = createBlock(
        `<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`
    );
    const priorityStarBlock = createBlock(`<span class="fa fa-star checked"/>`);
    const priorityStarOutlineBlock = createBlock(`<i class="fa fa-star-o"/>`);
    const effectiveHoursCellBlock = createBlock(`<td class="text-center"><block-child-0/></td>`);
    const remainingHoursCellBlock = createBlock(`<td class="text-center"><block-child-0/></td>`);
    const emptyIssuesRowBlock = createBlock(
        `<tr><td block-attribute-0="colspan" class="text-center text-danger">No matching items are currently available</td></tr>`
    );

    return function template(ctx, node, key = '') {
        let bootErrorNode;
        let noRemotesNode;
        let loginFormNode;
        let timerDurationNode;
        let hoursSpentHeaderNode;
        let remainingHoursHeaderNode;
        let issuesListNode;
        let emptyIssuesNode;

        const loaderClass = ctx.state.view === VIEW_LOADING ? '' : 'hide';
        const loginClass = ctx.state.view === VIEW_LOGIN ? '' : 'hide';
        const wrapperClass = ctx.state.view === VIEW_MAIN ? '' : 'hide';

        if (ctx.state.bootError) {
            bootErrorNode = bootErrorBlock([ctx.state.bootError]);
        }

        if (!ctx.state.remotes.length) {
            noRemotesNode = noRemotesBlock();
        }

        if (ctx.state.remotes.length) {
            let loginErrorNode;
            let usernameInputNode;
            let passwordInputNode;
            let passwordToggleNode;
            let remoteOptionsNode;
            let loginSpinnerNode;
            let remoteInfoNode;

            const submitHandler = ['prevent', ctx.login, ctx];

            if (ctx.state.loginError) {
                loginErrorNode = loginErrorBlock([ctx.state.loginError]);
            }

            if (!ctx.state.useExistingSession) {
                const stateRef = ctx.state;
                const fieldName = 'username';
                const fieldValue = stateRef[fieldName];
                const inputHandler = [(ev) => {
                    stateRef[fieldName] = ev.target.value;
                }];
                usernameInputNode = usernameInputBlock([fieldValue, inputHandler]);
            }

            if (!ctx.state.useExistingSession) {
                const inputType = ctx.state.showPassword ? 'text' : 'password';
                const stateRef = ctx.state;
                const fieldName = 'password';
                const fieldValue = stateRef[fieldName];
                const inputHandler = [(ev) => {
                    stateRef[fieldName] = ev.target.value;
                }];
                passwordInputNode = passwordInputBlock([inputType, fieldValue, inputHandler]);
            }

            if (!ctx.state.useExistingSession) {
                const clickHandler = [ctx.togglePassword, ctx];
                const iconClass = ctx.state.showPassword ? 'fa-eye-slash' : 'fa-eye';
                passwordToggleNode = passwordToggleBlock([clickHandler, iconClass]);
            }

            const selectedRemoteIndex = ctx.state.selectedRemoteIndex;
            const remoteSelectHandler = [(ev) => {
                ctx.state.selectedRemoteIndex = ev.target.value;
            }];

            ctx = Object.create(ctx);
            const [remoteItems, , remoteCount, remoteChildren] = prepareList(ctx.state.remotes);
            const seenRemoteKeys = new Set();

            for (let i = 0; i < remoteCount; i++) {
                ctx.remote = remoteItems[i];
                const remoteKey = ctx.remote.database + ctx.remote.url;
                if (seenRemoteKeys.has(String(remoteKey))) {
                    throw new OwlError(`Got duplicate key in t-foreach: ${remoteKey}`);
                }
                seenRemoteKeys.add(String(remoteKey));
                const optionValue = String(ctx.remote.__index);
                const optionSelected = selectedRemoteIndex === String(ctx.remote.__index);
                const optionText = ctx.remote.name;
                remoteChildren[i] = withKey(remoteOptionBlock([optionValue, optionSelected, optionText]), remoteKey);
            }

            ctx = ctx.__proto__;
            remoteOptionsNode = list(remoteChildren);

            const useExistingSessionChecked = ctx.state.useExistingSession;
            const useExistingSessionHandler = [ctx.toggleUseExistingSession, ctx];

            if (ctx.state.loginLoading) {
                loginSpinnerNode = loginSpinnerBlock();
            }

            if (ctx.currentRemote) {
                remoteInfoNode = remoteInfoBlock([
                    ctx.currentRemote.url,
                    ctx.currentRemote.datasrc || DATA_SOURCE_ISSUE,
                ]);
            }

            loginFormNode = loginFormBlock(
                [submitHandler, remoteSelectHandler, useExistingSessionChecked, useExistingSessionHandler],
                [
                    loginErrorNode,
                    usernameInputNode,
                    passwordInputNode,
                    passwordToggleNode,
                    remoteOptionsNode,
                    loginSpinnerNode,
                    remoteInfoNode,
                ]
            );
        }

        const searchQueryValue = ctx.state.searchQuery;
        const searchQueryHandler = [(ev) => {
            ctx.state.searchQuery = ev.target.value;
        }];
        const limitValue = ctx.state.limitTo;
        const limitHandler = [(ev) => {
            ctx.updateLimitPreference(ev.target.value);
        }];
        const downloadTimesheetHandler = [ctx.downloadCurrentMonthTimesheets, ctx];
        const switchRemotesHandler = [ctx.switchBetweenRemotes, ctx];
        const refreshHandler = [ctx.refreshAll, ctx];
        const resetTimerHandler = [ctx.resetTimer, ctx];
        const logoutHandler = [ctx.logout, ctx];

        if (ctx.state.timerStartIso) {
            timerDurationNode = activeTimerDurationBlock([ctx.formattedTimer]);
        }

        const issueHeaderLabel = ctx.itemLabelPlural;
        const filteredIssuesCount = ctx.filteredIssues.length;
        const showAllIssuesChecked = ctx.state.allIssues;
        const showAllIssuesHandler = [(ev) => {
            ctx.updateShowAllPreference(ev.target.checked);
        }];

        if (ctx.state.dataSource === DATA_SOURCE_TASK) {
            hoursSpentHeaderNode = hoursSpentHeaderBlock();
            remainingHoursHeaderNode = remainingHoursHeaderBlock();
        }

        ctx = Object.create(ctx);
        const [issueItems, , issueCount, issueChildren] = prepareList(ctx.filteredIssues);
        const seenIssueKeys = new Set();

        for (let i = 0; i < issueCount; i++) {
            const issueRecord = issueItems[i];
            const issueKey = issueRecord.id;

            if (seenIssueKeys.has(String(issueKey))) {
                throw new OwlError(`Got duplicate key in t-foreach: ${issueKey}`);
            }
            seenIssueKeys.add(String(issueKey));

            let startTimerNode;
            let stopTimerNode;
            let priorityStarsNode;
            let priorityStarOutlineNode;
            let stageNode;
            let issueLabelNode;
            let effectiveHoursNode;
            let remainingHoursNode;
            let projectNode;

            const rowClass = ctx.state.activeTimerId === issueRecord.id ? 'active-row' : '';

            if (!ctx.state.activeTimerId) {
                const clickHandler = [() => ctx.startTimer(issueRecord), ctx];
                startTimerNode = startTimerButtonBlock([clickHandler]);
            }

            if (ctx.state.activeTimerId === issueRecord.id) {
                const clickHandler = [() => ctx.stopTimer(issueRecord), ctx];
                stopTimerNode = stopTimerButtonBlock([clickHandler]);
            }

            if (issueRecord.priority_level.length) {
                const [priorityItems, , priorityCount, priorityChildren] = prepareList(issueRecord.priority_level);
                const seenPriorityKeys = new Set();

                for (let j = 0; j < priorityCount; j++) {
                    const priorityKey = priorityItems[j];
                    if (seenPriorityKeys.has(String(priorityKey))) {
                        throw new OwlError(`Got duplicate key in t-foreach: ${priorityKey}`);
                    }
                    seenPriorityKeys.add(String(priorityKey));
                    priorityChildren[j] = withKey(priorityStarBlock(), `${priorityKey}_${j}`);
                }

                priorityStarsNode = list(priorityChildren);
            }

            if (!issueRecord.priority_level.length) {
                priorityStarOutlineNode = priorityStarOutlineBlock();
            }

            stageNode = readMoreStage({
                text: ctx.relationLabel(issueRecord.stage_id),
                limit: 15,
            }, key + `__2__${issueKey}`, node, this, null);

            issueLabelNode = readMoreIssueLabel({
                text: ctx.issueLabel(issueRecord),
                limit: 70,
                href: ctx.issueHref(issueRecord),
            }, key + `__3__${issueKey}`, node, this, null);

            if (ctx.state.dataSource === DATA_SOURCE_TASK) {
                const effectiveHoursComponent = readMoreEffectiveHours({
                    text: ctx.normalizeText(ctx.formatHours(issueRecord.effective_hours)),
                    limit: 9,
                }, key + `__4__${issueKey}`, node, this, null);
                effectiveHoursNode = effectiveHoursCellBlock([], [effectiveHoursComponent]);
            }

            if (ctx.state.dataSource === DATA_SOURCE_TASK) {
                const remainingHoursComponent = readMoreRemainingHours({
                    text: ctx.normalizeText(ctx.formatHours(issueRecord.remaining_hours)),
                    limit: 9,
                }, key + `__5__${issueKey}`, node, this, null);
                remainingHoursNode = remainingHoursCellBlock([], [remainingHoursComponent]);
            }

            projectNode = readMoreProject({
                text: ctx.relationLabel(issueRecord.project_id),
                limit: 15,
            }, key + `__6__${issueKey}`, node, this, null);

            issueChildren[i] = withKey(
                issueRowBlock([rowClass], [
                    startTimerNode,
                    stopTimerNode,
                    priorityStarsNode,
                    priorityStarOutlineNode,
                    stageNode,
                    issueLabelNode,
                    effectiveHoursNode,
                    remainingHoursNode,
                    projectNode,
                ]),
                issueKey
            );
        }

        ctx = ctx.__proto__;
        issuesListNode = list(issueChildren);

        if (!ctx.filteredIssues.length) {
            const colspan = ctx.state.dataSource === DATA_SOURCE_TASK ? 7 : 5;
            emptyIssuesNode = emptyIssuesRowBlock([colspan]);
        }

        const serverVersionText = ctx.state.serverVersion || 'Unknown';
        const odooOWLVersionText = ctx.state.odooOWLVersion || owl.__info__.version;
        const currentHostText = ctx.state.currentHost || '-';
        const currentDatabaseText = ctx.state.currentDatabase || '-';
        const currentUserText = ctx.state.user ? ctx.state.user.display_name : '-';

        return rootBlock(
            [
                loaderClass,
                loginClass,
                wrapperClass,
                searchQueryValue,
                searchQueryHandler,
                limitValue,
                limitHandler,
                downloadTimesheetHandler,
                switchRemotesHandler,
                refreshHandler,
                resetTimerHandler,
                logoutHandler,
                issueHeaderLabel,
                filteredIssuesCount,
                showAllIssuesChecked,
                showAllIssuesHandler,
                serverVersionText,
                odooOWLVersionText,
                currentHostText,
                currentDatabaseText,
                currentUserText,
            ],
            [
                bootErrorNode,
                noRemotesNode,
                loginFormNode,
                null,
                timerDurationNode,
                hoursSpentHeaderNode,
                remainingHoursHeaderNode,
                issuesListNode,
                emptyIssuesNode,
            ]
        );
    };
}

/**
 * Main popup application component.
 */
class PopupApp extends Component {
    static components = {ReadMore};
    static template = 'PopupApp';

    setup() {
        this.rpc = new OdooRpc();
        this.state = useState({
            view: VIEW_LOADING,
            remotes: [],
            selectedRemoteIndex: DEFAULTS.selectedRemoteIndex,
            useExistingSession: true,
            username: '',
            password: '',
            showPassword: false,
            loginLoading: false,
            loginError: '',
            bootError: '',
            user: null,
            projects: [],
            issues: [],
            searchQuery: '',
            limitTo: DEFAULTS.searchLimit,
            allIssues: false,
            autoDownloadIssueTimesheet: false,
            activeTimerId: null,
            timerStartIso: null,
            timerNow: Date.now(),
            currentHost: '',
            currentDatabase: '',
            dataSource: DEFAULTS.dataSource,
            serverVersion: '',
            odooOWLVersion: owl.__info__.version,
            supportedFields: {},
            busyMessage: DEFAULTS.busyMessage,
            loadingTable: false,
        });

        this._timerHandle = null;
        this.startTimer = this.startTimer.bind(this);
        this.stopTimer = this.stopTimer.bind(this);
        this.resetTimer = this.resetTimer.bind(this);
        this.refreshAll = this.refreshAll.bind(this);
        this.downloadCurrentMonthTimesheets = this.downloadCurrentMonthTimesheets.bind(this);
        this.switchBetweenRemotes = this.switchBetweenRemotes.bind(this);
        this.logout = this.logout.bind(this);
        this.toggleAutoDownload = this.toggleAutoDownload.bind(this);
        this.toggleUseExistingSession = this.toggleUseExistingSession.bind(this);
        this.togglePassword = this.togglePassword.bind(this);
        this.updateLimitPreference = this.updateLimitPreference.bind(this);
        this.updateShowAllPreference = this.updateShowAllPreference.bind(this);

        onMounted(() => {
            const bootLoader = document.getElementById('boot-loader');
            if (bootLoader) {
                bootLoader.classList.add('hide');
            }

            this._timerHandle = setInterval(() => {
                this.state.timerNow = Date.now();
            }, 1000);

            this.bootstrapWithTimeout();
        });

        onWillUnmount(() => {
            if (this._timerHandle) {
                clearInterval(this._timerHandle);
            }
        });
    }

    /**
     * Currently selected remote configuration.
     */
    get currentRemote() {
        const idx = Number(this.state.selectedRemoteIndex || 0);
        return this.state.remotes[idx] || null;
    }

    /**
     * Formatted active timer duration.
     */
    get formattedTimer() {
        if (!this.state.timerStartIso) {
            return '00:00:00';
        }
        return formatDuration(this.state.timerNow - new Date(this.state.timerStartIso).getTime());
    }

    get itemLabelSingular() {
        return this.state.dataSource === DATA_SOURCE_TASK ? 'task' : 'issue';
    }

    get itemLabelPlural() {
        return this.state.dataSource === DATA_SOURCE_TASK ? 'Tasks' : 'Issues';
    }

    async updateLimitPreference(value) {
        this.state.limitTo = value;
        await storage.set(STORAGE_KEYS.searchLimit, value);
    }

    async updateShowAllPreference(value) {
        this.state.allIssues = !!value;
        await storage.set(STORAGE_KEYS.showAllItems, !!value);
    }


    /**
     * Issues filtered by current UI settings.
     */ 
    get filteredIssues() {
        const limit = this.state.limitTo ? Number(this.state.limitTo) : null;
        const query = (this.state.searchQuery || '').trim();
        let issues = [...this.state.issues];

        issues.sort((a, b) => {
        if (a.id === this.state.activeTimerId) return -1;
        if (b.id === this.state.activeTimerId) return 1;
        const priorityDelta = Number(b.priority || 0) - Number(a.priority || 0);
        if (priorityDelta !== 0) return priorityDelta;
        const stageDelta = Number(a.stage_sequence ?? 9999) - Number(b.stage_sequence ?? 9999);
        if (stageDelta !== 0) return stageDelta;
        return a.id - b.id;
        });

        const matchesSearch = (issue) => matchesIssue(issue, query);

        if (this.state.allIssues) {
        issues = issues.filter(matchesSearch);
        } else if (this.state.user?.id) {
        issues = issues.filter(
            (issue) =>
            issue.id === this.state.activeTimerId ||
            (issue.user_id?.[0] === this.state.user.id && matchesSearch(issue))
        );
        } else {
        issues = issues.filter(matchesSearch);
        }

        return limit ? issues.slice(0, limit) : issues;
    }

    /**
     * 
     * @param {Integer} value 
     * @returns String
     */
    toStringValue(value) {
        return String(value);
    }

    /**
     * Return true when an error looks like an expired/invalid Odoo session.
     */
    isSessionExpiredError(err) {
        const message = String(err?.message || err || '').toLowerCase();
        return (
            message.includes('session expired') ||
            message.includes('expired session') ||
            message.includes('invalid session') ||
            message.includes('session_id') ||
            message.includes('access denied') ||
            message.includes('unauthorized')
        );
    }

    /**
     * Clear stale session state but keep timer data intact.
     */
    async handleExpiredSession(reason = 'Your Odoo session expired. Please log in again.') {
        try {
            if (this.state.currentHost) {
                await clearOdooSessionCookies(this.state.currentHost);
            }
        } catch (err) {
            console.warn('Could not clear expired Odoo cookies', err);
        }

        try {
            if (this.state.currentDatabase) {
                await storage.remove(this.state.currentDatabase);
            }
        } catch (err) {
            console.warn('Could not remove cached session snapshot', err);
        }

        await storage.set(STORAGE_KEYS.currentHostState, 'Inactive');

        this.state.user = null;
        this.state.projects = [];
        this.state.issues = [];
        this.state.serverVersion = '';
        this.state.odooOWLVersion = owl.__info__.version;
        this.state.supportedFields = {};
        this.state.view = VIEW_LOGIN;
        this.state.loginLoading = false;
        this.state.loadingTable = false;
        this.state.useExistingSession = false;
        this.state.loginError = reason;
        this.state.bootError = '';
    }

    /**
     * Run an async action and convert expired-session failures into login fallback.
     */
    async withSessionGuard(action) {
        try {
            return await action();
        } catch (err) {
            if (this.isSessionExpiredError(err)) {
                await this.handleExpiredSession('Your Odoo session expired. Please log in again.');
            }
            throw err;
        }
    }

    /**
     * Start popup bootstrap. Any unhandled error moves the popup to login view.
     */
    async bootstrapWithTimeout() {
        this.state.view = VIEW_LOADING;
        this.state.bootError = '';
        this.state.busyMessage = DEFAULTS.busyMessage;

        try {
            await this.bootstrap();
        } catch (err) {
            console.warn('Bootstrap fallback:', err);
            this.state.bootError = err.message || 'Startup took too long. Please log in manually.';
            this.state.view = VIEW_LOGIN;
        }
    }

    /**
     * Clear the legacy issue cache used by older extension builds.
     */
    async clearLegacyIssueCache() {
        try {
            await storage.remove(STORAGE_KEYS.usersIssues);
        } catch (err) {
            console.warn('Could not clear legacy users_issues cache', err);
        }
    }

    /**
     * Load persisted popup state from browser storage.
     */
    async loadStoredPopupState() {
        const [
            useExisting,
            autoDownloadIssueTimesheet,
            timerStartIso,
            activeTimerIdRaw,
            currentHost,
            currentDb,
            currentSrc,
            searchLimit,
            showAllItems,
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

        this.state.useExistingSession = !!useExisting;
        this.state.autoDownloadIssueTimesheet = !!autoDownloadIssueTimesheet;
        this.state.timerStartIso = timerStartIso;
        this.state.activeTimerId = activeTimerIdRaw ? Number(activeTimerIdRaw) : null;
        this.state.currentHost = currentHost || '';
        this.state.currentDatabase = currentDb || '';
        this.state.dataSource = currentSrc || DEFAULTS.dataSource;
        this.state.limitTo = searchLimit ?? DEFAULTS.searchLimit;
        this.state.allIssues = !!showAllItems;
    }

    /**
     * Initialize popup state and attempt session restore.
     *
     * FIX: The original cleanup was missing a `return` after a successful
     * `completeSession()` call, causing execution to always fall through to
     * `this.state.view = VIEW_LOGIN` at the bottom of the function.
     */
    async bootstrap() {
        this.state.busyMessage = DEFAULTS.busyMessage;
        await this.clearLegacyIssueCache();

        this.state.remotes = (await readRemotes()).map((remote, idx) => ({
            ...remote,
            __index: String(idx),
        }));

        await this.loadStoredPopupState();

        // No stored host means first run — go straight to login.
        if (!this.state.currentHost) {
            this.state.view = VIEW_LOGIN;
            return;
        }

        this.rpc.setHost(this.state.currentHost);

        const remoteIndex = this.state.remotes.findIndex(
            (remote) =>
                remote.url === this.state.currentHost &&
                remote.database === this.state.currentDatabase
        );

        if (remoteIndex >= 0) {
            this.state.selectedRemoteIndex = String(remoteIndex);
        }

        try {
            this.state.busyMessage = 'Restoring session…';

            const sessionInfo = await Promise.race([
                this.rpc.getSessionInfo(),
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error('Session restore timed out')),
                        TIMEOUTS.sessionRestoreMs
                    )
                ),
            ]);

            if (sessionInfo?.uid) {
                // FIX: must return here so we don't fall through to VIEW_LOGIN below.
                await this.completeSession(sessionInfo, this.state.remotes[remoteIndex] || null);
                return;
            }

            // Valid response but no uid — session is gone.
            this.state.view = VIEW_LOGIN;
            this.state.useExistingSession = false;
            this.state.loginError = 'No active Odoo session found. Please log in.';
        } catch (err) {
            console.warn('Session bootstrap failed', err);

            if (this.isSessionExpiredError(err)) {
                await this.handleExpiredSession('Your saved Odoo session expired. Please log in again.');
                return;
            }

            // Non-session error (e.g. network timeout) — show it on login screen.
            this.state.bootError = err.message || 'Could not restore session.';
            this.state.view = VIEW_LOGIN;
        }
    }

    togglePassword() {
        this.state.showPassword = !this.state.showPassword;
    }


    toggleUseExistingSession(ev) {
        this.state.useExistingSession = ev.target.checked;
        storage.set(STORAGE_KEYS.useExistingSession, !!this.state.useExistingSession);
    }

    toggleAutoDownload(ev) {
        this.state.autoDownloadIssueTimesheet = ev.target.checked;
        storage.set(
            STORAGE_KEYS.autoDownloadIssueTimesheet,
            !!this.state.autoDownloadIssueTimesheet
        );
    }

    normalizeText(value) {
        if (value == null) {
            return '';
        }
        if (typeof value === 'function') {
            return '';
        }
        if (Array.isArray(value)) {
            if (value.length >= 2 && (typeof value[1] === 'string' || typeof value[1] === 'number')) {
                return String(value[1]);
            }
            return value.map((item) => this.normalizeText(item)).filter(Boolean).join(' ');
        }
        if (typeof value === 'object') {
            return String(value.display_name || value.name || value.label || value.value || '');
        }
        return String(value);
    }

    relationLabel(value) {
        if (!value) {
            return '';
        }
        if (Array.isArray(value)) {
            return this.normalizeText(value[1] ?? value[0]);
        }
        return this.normalizeText(value);
    }

    issueHref(issue) {
        if (!this.state.currentHost || !issue?.id) {
            return null;
        }
        return `${this.state.currentHost}/web#id=${issue.id}&model=${this.state.dataSource}&view_type=form`;
    }

    issueLabel(issue) {
        if (this.state.dataSource === DATA_SOURCE_TASK) {
            const code = this.normalizeText(issue.code);
            const issueName = this.normalizeText(issue.name || issue.description || '');
            return [code, issueName].filter(Boolean).join(' - ') || `#${issue.id}`;
        }

        const issueName = this.normalizeText(
            issue.display_name || issue.name || issue.message_summary || issue.description || ''
        );
        return [`#${issue.id}`, issueName].filter(Boolean).join(' - ');
    }

    formatHours(value) {
        return formatHoursMins(value);
    }

    /**
     * Perform login or session attach for the currently selected remote.
     */
    async login() {
        const remote = this.currentRemote;
        if (!remote) {
            this.state.loginError = 'Please configure a remote first.';
            return;
        }

        this.state.loginLoading = true;
        this.state.loginError = '';
        this.rpc.setHost(remote.url);
        this.state.currentHost = remote.url;
        this.state.currentDatabase = remote.database;
        this.state.dataSource = remote.datasrc || DEFAULTS.dataSource;

        await storage.set(STORAGE_KEYS.currentHost, remote.url);
        await storage.set(STORAGE_KEYS.currentDatabase, remote.database);
        await storage.set(STORAGE_KEYS.currentDataSource, this.state.dataSource);

        try {
            let sessionInfo;
            if (this.state.useExistingSession) {
                sessionInfo = await this.rpc.getSessionInfo();
                if (!sessionInfo?.uid) {
                    throw new Error(
                        'No active Odoo session found for this remote. Turn off "Use Existing Session" to log in manually.'
                    );
                }
            } else {
                if (!this.state.username || !this.state.password) {
                    throw new Error('Username or password is missing');
                }
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

    /**
     * Finalize session setup after a successful restore or login.
     *
     * FIX: loadProjects() and loadIssues() are now individually guarded with
     * .catch() so that a field-loading failure (e.g. unsupported field on this
     * Odoo version) cannot abort session establishment and force the user back
     * to the login screen.
     */
    async completeSession(sessionInfo, remote) {
        this.state.busyMessage = 'Loading tasks…';
        this.state.loadingTable = true;

        const remoteInfo = remote || this.currentRemote || null;

        this.state.currentDatabase =
            sessionInfo.db || remoteInfo?.database || this.state.currentDatabase;
        this.state.currentHost =
            remoteInfo?.url || sessionInfo['web.base.url'] || this.state.currentHost;
        this.state.dataSource =
            remoteInfo?.datasrc || this.state.dataSource || DEFAULTS.dataSource;

        try {
            await storage.set(this.state.currentDatabase, JSON.stringify(sessionInfo));
        } catch (err) {
            console.warn('Could not persist session snapshot', err);
        }

        await storage.set(STORAGE_KEYS.currentHostState, 'Active');

        if (remoteInfo) {
            const remotes = await readRemotes();
            const updatedRemotes = remotes.map((currentRemote) =>
                currentRemote.url === remoteInfo.url &&
                currentRemote.database === remoteInfo.database
                    ? {...currentRemote, state: 'Active'}
                    : currentRemote
            );
            await writeRemotes(updatedRemotes);
            this.state.remotes = updatedRemotes.map((currentRemote, idx) => ({
                ...currentRemote,
                __index: String(idx),
            }));
        }

        const userPromise = this.rpc
            .searchRead('res.users', [['id', '=', sessionInfo.uid]], ['display_name'])
            .catch((err) => {
                console.warn('Could not read current user', err);
                return {records: []};
            });

        const serverInfoPromise = this.rpc.getServerInfo().catch((err) => {
            console.warn('Could not read version info', err);
            return null;
        });

        try {
            // FIX: loadProjects and loadIssues are wrapped in .catch() so that any
            // field-loading error (very common across Odoo versions) cannot reject
            // the Promise.all and abort the session. Without this, a single bad
            // field name would kick the user back to the login screen even though
            // authentication succeeded.
            const [userResult, serverInfo] = await Promise.all([
                userPromise,
                serverInfoPromise,
                this.loadProjects().catch((err) => console.warn('loadProjects failed', err)),
                this.loadIssues().catch((err) => console.warn('loadIssues failed', err)),
            ]);

            this.state.user = userResult.records?.[0] || {
                id: sessionInfo.uid,
                display_name: sessionInfo.username || 'Unknown',
            };

            if (serverInfo) {
                this.state.serverVersion = serverInfo.server_version || '';
                try {
                    await storage.set(STORAGE_KEYS.serverVersionInfo, JSON.stringify(serverInfo));
                } catch (err) {
                    console.warn('Could not cache version info', err);
                }
            }

            this.state.view = VIEW_MAIN;
        } finally {
            this.state.loadingTable = false;
        }
    }

    /**
     * Load project records required to resolve analytic accounts.
     */
    async loadProjects() {
        const result = await this.rpc.searchRead('project.project', [], ['analytic_account_id']);
        this.state.projects = result.records || [];
    }

    /**
     * Get field metadata for the current model, caching the response.
     */
    async getSupportedFieldsForModel(model) {
        let availableFields = this.state.supportedFields[model] || null;

        if (!availableFields) {
            try {
                availableFields = await this.rpc.fieldsGet(model, ['type', 'string']);
                this.state.supportedFields[model] = availableFields || {};
            } catch (err) {
                console.warn(`Could not inspect supported fields for ${model}`, err);
            }
        }

        return availableFields;
    }

    /**
     * Execute a search_read and remove unsupported fields recursively if Odoo
     * reports an invalid field.
     */
    async searchReadWithInvalidFieldRetry(model, domain, requestedFields) {
        try {
            return await this.rpc.searchRead(model, domain, requestedFields);
        } catch (err) {
            const message = String(err?.message || '');
            const invalidFieldMatch = message.match(/Invalid field ['"]([^'"]+)['"]/i);
            if (!invalidFieldMatch) {
                throw err;
            }

            const invalidField = invalidFieldMatch[1];
            const narrowedFields = requestedFields.filter((field) => field !== invalidField);
            if (!narrowedFields.length || narrowedFields.length === requestedFields.length) {
                throw err;
            }

            console.warn(`Retrying ${model} search_read without unsupported field: ${invalidField}`);
            return this.searchReadWithInvalidFieldRetry(model, domain, narrowedFields);
        }
    }

    /**
     * Load issue/task rows for the current datasource.
     */
    async loadIssues() {
        const model = this.state.dataSource;
        this.state.loadingTable = true;
        this.state.busyMessage = 'Loading tasks…';

        try {
            const domain = [
                '|',
                ['id', '=', this.state.activeTimerId || 0],
                '&',
                ['stage_id.name', 'not ilike', '%Done%'],
                '&',
                ['stage_id.name', 'not ilike', '%Cancel%'],
                ['stage_id.name', 'not ilike', '%Hold%'],
            ];

            const baseFields = [
                'id',
                'name',
                'user_id',
                'project_id',
                'stage_id',
                'priority',
                'create_date',
                'analytic_account_id',
            ];

            const extraFieldsByModel = {
                [DATA_SOURCE_ISSUE]: ['working_hours_open', 'message_summary', 'message_unread', 'description'],
                [DATA_SOURCE_TASK]: ['effective_hours', 'remaining_hours', 'code', 'description', 'display_name'],
            };

            const desiredFields = [...baseFields, ...(extraFieldsByModel[model] || [])];
            const availableFields = await this.getSupportedFieldsForModel(model);

            let fields = availableFields
                ? desiredFields.filter((field) =>
                    Object.prototype.hasOwnProperty.call(availableFields, field)
                )
                : desiredFields.filter(
                    (field) => field !== 'message_summary' && field !== 'message_unread'
                );

            if (model === DATA_SOURCE_TASK) {
                fields = fields.filter(
                    (field) => field !== 'message_summary' && field !== 'message_unread'
                );
            }

            const result = await this.searchReadWithInvalidFieldRetry(model, domain, fields);

            const records = result.records || [];

            let stageSequenceById = new Map();
            if (model === DATA_SOURCE_TASK) {
                const stageIds = [...new Set(records.map((issue) => issue.stage_id?.[0]).filter(Boolean))];
                if (stageIds.length) {
                    const stages = await this.rpc.searchRead('project.task.type', [['id', 'in', stageIds]], ['id', 'sequence']);
                    stageSequenceById = new Map((stages.records || []).map((stage) => [stage.id, Number(stage.sequence || 0)]));
                }
            }

            this.state.issues = records.map((issue) => ({
                ...issue,
                message_summary: extractMessageSummary(
                    issue.message_summary || issue.description || issue.display_name || issue.name || ''
                ),
                priority_level: priorityStars(issue.priority),
                stage_sequence: stageSequenceById.get(issue.stage_id?.[0]) ?? 9999,
            }));
        } finally {
            this.state.loadingTable = false;
        }
    }

    /**
     * Reload projects and issues.
     */
    async refreshAll() {
        try {
            await this.loadProjects();
            await this.loadIssues();
        } catch (err) {
            await notify(err.message || 'Failed to refresh items.');
        }
    }

    /**
     * Start timing the selected issue/task.
     */
    async startTimer(issue) {
        const now = new Date().toISOString();
        this.state.activeTimerId = issue.id;
        this.state.timerStartIso = now;
        await storage.set(STORAGE_KEYS.timerStartIso, now);
        await storage.set(STORAGE_KEYS.activeTimerId, issue.id);
        await sendTimerStateToBackground(true);
    }

    /**
     * Resolve the analytic account for the given issue/task.
     */
    resolveAnalyticAccount(issue) {
        if (issue.analytic_account_id) {
            return issue.analytic_account_id;
        }
        const project = this.state.projects.find(
            (currentProject) => currentProject.id === issue.project_id?.[0]
        );
        return project?.analytic_account_id;
    }

    /**
     * Create a timesheet entry for a project.issue row.
     */
    async createIssueTimesheet(params) {
        const journalResult = await this.rpc.searchRead(
            'account.analytic.journal',
            [['name', 'ilike', 'Timesheet']],
            ['name']
        );
        const journal = journalResult.records?.[0];
        if (!journal) {
            throw new Error('No Timesheet analytic journal found in Odoo.');
        }

        await this.rpc.call('hr.analytic.timesheet', 'create', [{
            date: params.date,
            user_id: this.state.user.id,
            name: params.issueName,
            journal_id: journal.id,
            account_id: params.analyticAccount[0],
            unit_amount: params.durationInHours,
            to_invoice: 1,
            issue_id: params.issue.id,
        }], {});
    }

    /**
     * Create a timesheet entry for a project.task row.
     */
    async createTaskTimesheet(params) {
        await this.rpc.call('account.analytic.line', 'create', [{
            date: params.date,
            user_id: this.state.user.id,
            name: params.issueName,
            account_id: params.analyticAccount[0],
            unit_amount: params.durationInHours,
            project_id: params.issue.project_id?.[0],
            task_id: params.issue.id,
        }], {});
    }

    /**
     * Stop the active timer and create the Odoo timesheet row.
     */
    async stopTimer(issue) {
        try {
            const issueDescription = (await promptDialog(`${this.itemLabelSingular.charAt(0).toUpperCase() + this.itemLabelSingular.slice(1)} #${issue.id} Description`, issue.name)) || '';

            const startIso =
                this.state.timerStartIso || (await storage.get(STORAGE_KEYS.timerStartIso, null));
            if (!startIso) {
                throw new Error('No start time found for the active timer.');
            }

            const now = new Date();
            const durationMinutes = Math.max(
                0,
                (now.getTime() - new Date(startIso).getTime()) / 60000
            );
            const roundedMinutes = Math.round((durationMinutes % 60) / 15) * 15;
            const durationInHours = Math.floor(durationMinutes / 60) + roundedMinutes / 60;
            const analyticAccount = this.resolveAnalyticAccount(issue);

            if (!analyticAccount) {
                throw new Error('No analytic account is defined on the project.');
            }

            const issueName = issueDescription.trim() || `${issue.name} (#${issue.id})`;
            const formattedDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            const commonPayload = {
                issue,
                issueName,
                analyticAccount,
                durationInHours,
                date: formattedDate,
            };

            if (this.state.dataSource === DATA_SOURCE_ISSUE) {
                await this.createIssueTimesheet(commonPayload);
                await notify(`Time for ${this.itemLabelSingular} #${issue.id} was successfully recorded in Odoo timesheets.`);
            } else {
                await this.createTaskTimesheet(commonPayload);
                await notify(`Time for ${this.itemLabelSingular} #${issue.id} was successfully recorded in Odoo timesheets.`);
            }

            if (this.state.autoDownloadIssueTimesheet) {
                await this.downloadCurrentIssueTimesheet(issue);
            }

            this.state.activeTimerId = null;
            this.state.timerStartIso = null;
            await storage.remove(STORAGE_KEYS.timerStartIso);
            await storage.remove(STORAGE_KEYS.activeTimerId);
            await sendTimerStateToBackground(false);
            await this.loadIssues();
        } catch (err) {
            console.error(err);
            await notify(err.message || `Could not stop the ${this.itemLabelSingular} timer and create a timesheet.`);
        }
    }

    /**
     * Discard the active timer without creating an Odoo record.
     */
    async resetTimer() {
        if (!this.state.activeTimerId) {
            return;
        }

        const confirmed = await confirmDialog(`Discard the running ${this.itemLabelSingular} timer without saving to Odoo?`);
        if (!confirmed) {
            return;
        }

        this.state.activeTimerId = null;
        this.state.timerStartIso = null;
        await storage.remove(STORAGE_KEYS.timerStartIso);
        await storage.remove(STORAGE_KEYS.activeTimerId);
        await sendTimerStateToBackground(false);
        await this.loadIssues();
    }

    /**
     * Download a CSV with current month timesheet rows.
     */
    async downloadCurrentMonthTimesheets() {
        const autoDownloadEnabled = await storage.get('auto_download_issue_timesheet', false);
        if (!autoDownloadEnabled) {
            const blockingText = 
              '<div style="text-align: center; padding: 20px;">' +
                '<h5 style="margin-bottom: 15px; color: #d32f2f;">⚠️ Auto-Download Not Enabled</h5>' +
                '<p style="margin-bottom: 15px; font-size: 16px;">' +
                  'Please enable <b>Auto Download Current Item Timesheet</b> ' +
                  'in the Options menu before downloading timesheets.' +
                '</p>' +
                '<p style="color: #666; font-size: 14px;">' +
                  'Click the <b>⚙️ Options</b> icon, then check the box under General Settings.' +
                '</p>' +
              '</div>';
            
            await alert.show(blockingText, ['OK']);
            return; // STOP - do not proceed with download
        }

        try {
            if (!this.state.user?.id) {
                throw new Error('Login first.');
            }

            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                .toISOString()
                .slice(0, 10);
            const currentDay = new Date().toISOString().slice(0, 10);
            const model =
                this.state.dataSource === DATA_SOURCE_TASK
                    ? 'account.analytic.line'
                    : 'hr.analytic.timesheet';
            const domain = [
                ['user_id', '=', this.state.user.id],
                ['create_date', '>=', firstDay],
                ['create_date', '<=', currentDay],
            ];

            const result = await this.rpc.searchRead(model, domain, []);
            const csv = toCSV(result.records || []);
            if (!csv) {
                await notify('No timesheet rows found for this month.');
                return;
            }

            const filename = `Timesheet [${new Date().toGMTString()}].csv`;
            downloadTextFile(filename, csv, 'application/csv;charset=utf-8;');
            await notify(
                `Timesheet for ${this.state.user.display_name} dated ${firstDay} to ${currentDay} has been saved locally as ${filename}.`
            );
        } catch (err) {
            await notify(err.message || 'Could not download current month timesheet.');
        }
    }

    /**
     * Download a CSV for the currently timed item and current month.
     */
    async downloadCurrentIssueTimesheet(issue) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
            .toISOString()
            .slice(0, 10);
        const currentDay = new Date().toISOString().slice(0, 10);
        const model =
            this.state.dataSource === DATA_SOURCE_TASK
                ? 'account.analytic.line'
                : 'hr.analytic.timesheet';
        const keyDomain =
            this.state.dataSource === DATA_SOURCE_TASK
                ? ['task_id', '=', issue.id]
                : ['issue_id', '=', issue.id];
        const domain = [
            ['user_id', '=', this.state.user.id],
            ['create_date', '>=', firstDay],
            ['create_date', '<=', currentDay],
            keyDomain,
        ];

        const result = await this.rpc.searchRead(model, domain, []);
        const csv = toCSV(result.records || []);
        if (!csv) {
            return;
        }

        const filename = `Timesheet-#${issue.id}-[${new Date().toGMTString()}].csv`;
        downloadTextFile(filename, csv, 'application/csv;charset=utf-8;');
    }

    /**
     * Switch back to login view without logging out.
     */
    async switchBetweenRemotes() {
        if (this.state.activeTimerId) {
            await notify(
                `Please stop timer for ${this.itemLabelSingular} #${this.state.activeTimerId} before switching out of the current session.`
            );
            return;
        }

        this.state.view = VIEW_LOGIN;
        this.state.useExistingSession = true;
        await storage.set(STORAGE_KEYS.useExistingSession, true);
    }

    /**
     * Log out from the current Odoo session and reset popup state.
     */
    async logout() {
        if (this.state.activeTimerId) {
            await notify(
                `Please stop timer for ${this.itemLabelSingular} #${this.state.activeTimerId} before logging out.`
            );
            return;
        }

        const confirmed = await confirmDialog(
            'Are you sure you want to logout? Session will be removed and a re-login will be required.'
        );
        if (!confirmed) {
            return;
        }

        try {
            await this.rpc.logout();
        } catch {
            // Ignore logout errors and continue with local cleanup.
        }

        await clearOdooSessionCookies(this.state.currentHost);
        await storage.remove(this.state.currentDatabase);
        await storage.set(STORAGE_KEYS.currentHostState, 'Inactive');

        this.state.user = null;
        this.state.issues = [];
        this.state.projects = [];
        this.state.view = VIEW_LOGIN;
        this.state.useExistingSession = true;
    }
}

// setup template to use, either from template.js or pre-set createBlock functions
const compiledTemplates = globalThis.__THERP_TIMER_TEMPLATES__ || {};

const templates = {
    ReadMore: compiledTemplates.ReadMore || createReadMoreTemplate,
    PopupApp: compiledTemplates.PopupApp || createPopupAppTemplate,
};

mount(PopupApp, document.getElementById('app'), {
    dev: true,
    templates,
});