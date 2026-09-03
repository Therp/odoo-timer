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
    remoteIdentity,
    notify,
    confirmDialog,
    promptDialog,
} from '../lib/common.js';
import { ReadMore, createReadMoreTemplate } from './readmore.js';
import {
    DATA_SOURCE_ISSUE,
    DATA_SOURCE_TASK,
    DATA_SOURCE_HELPDESK,
    resourceLabels,
    inspectHelpdeskCapabilities,
    helpdeskUnavailableMessage,
    helpdeskTimesheetUnavailableMessage,
    isAssignedToUser,
    isHelpdeskTimesheetEnabled,
    resourceRelation,
    resourceHours,
    timesheetBinding,
} from '../lib/resource-adapters.js';

const {Component, mount, useState, onMounted, onWillUnmount} = owl;

const VIEW_LOADING = 'loading';
const VIEW_LOGIN = 'login';
const VIEW_MAIN = 'main';

const STORAGE_KEYS = {
    useExistingSession: 'useExistingSession',
    autoDownloadIssueTimesheet: 'auto_download_issue_timesheet',
    timerStartIso: 'start_date_time',
    activeTimerId: 'active_timer_id',
    activeTimerContext: 'active_timer_context',
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
    busyMessage: 'Loading current session…',
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
                const remoteKey = ctx.remoteKey(ctx.remote);
                if (seenRemoteKeys.has(String(remoteKey))) {
                    throw new OwlError(`Got duplicate key in t-foreach: ${remoteKey}`);
                }
                seenRemoteKeys.add(String(remoteKey));
                const optionValue = String(ctx.remote.__index);
                const optionSelected = selectedRemoteIndex === String(ctx.remote.__index);
                const optionText = ctx.remoteOptionLabel(ctx.remote);
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
            helpdeskStageFilter: '',
            limitTo: DEFAULTS.searchLimit,
            allIssues: false,
            autoDownloadIssueTimesheet: false,
            activeTimerId: null,
            timerStartIso: null,
            timerNow: Date.now(),
            currentHost: '',
            currentDatabase: '',
            dataSource: DEFAULTS.dataSource,
            currentCompanyId: null,
            allowedCompanyIds: [],
            availableCompanyIds: [],
            currentUserId: null,
            companyNames: {},
            serverVersion: '',
            odooOWLVersion: owl.__info__.version,
            supportedFields: {},
            sourceCapabilities: {},
            sourceError: '',
            activeTimerContext: null,
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


    remoteKey(remote) { return remoteIdentity(remote); }
    remoteOptionLabel(remote) {
        const source = remote?.datasrc || DATA_SOURCE_ISSUE;
        const sourceLabel = source === DATA_SOURCE_HELPDESK
            ? 'Helpdesk Tickets'
            : source === DATA_SOURCE_TASK ? 'Tasks' : 'Issues';
        return `${remote?.name || remote?.database || 'Remote'} — ${sourceLabel}`;
    }
    get currentRemoteLogoSrc() { return this.currentRemote?.logoDataUrl || '/img/logo.png'; }

    /**
     * Formatted active timer duration.
     */
    get formattedTimer() {
        if (!this.state.timerStartIso) {
            return '00:00:00';
        }
        return formatDuration(this.state.timerNow - new Date(this.state.timerStartIso).getTime());
    }

    get itemLabelSingular() { return resourceLabels(this.state.dataSource).singular; }
    get itemLabelPlural()   { return resourceLabels(this.state.dataSource).plural; }
    get isHelpdeskSource()  { return this.state.dataSource === DATA_SOURCE_HELPDESK; }
    get showHelpdeskAssignee() {
        return this.isHelpdeskSource && this.state.allIssues &&
            Boolean(this.state.sourceCapabilities.assignmentField);
    }
    get showHelpdeskTeam() { return this.isHelpdeskSource && Boolean(this.state.sourceCapabilities.teamField); }
    get showHelpdeskDescription() { return this.isHelpdeskSource && Boolean(this.state.sourceCapabilities.descriptionField); }
    get showHelpdeskTherpLink() { return this.isHelpdeskSource && Boolean(this.state.sourceCapabilities.therpLinkField); }
    get showHelpdeskProject() { return this.isHelpdeskSource && Boolean(this.state.sourceCapabilities.projectField); }
    get showHelpdeskHours() { return this.isHelpdeskSource && Boolean(this.state.sourceCapabilities.hoursField); }

    get helpdeskStageOptions() {
        if (!this.isHelpdeskSource) return [];
        const stages = new Map();
        for (const issue of this.state.issues) {
            const value = issue?.stage_id;
            if (!Array.isArray(value) || !value[0]) continue;
            const id = Number(value[0]);
            const candidate = {
                id,
                name: this.normalizeText(value[1]) || `#${id}`,
                sequence: Number(issue.stage_sequence ?? 9999),
            };
            const current = stages.get(id);
            if (!current || candidate.sequence < current.sequence) stages.set(id, candidate);
        }
        return [...stages.values()].sort((a, b) =>
            a.sequence - b.sequence || a.name.localeCompare(b.name)
        );
    }

    get relationHeaderLabel() {
        return this.isHelpdeskSource && !this.state.sourceCapabilities.projectField ? 'Team' : 'Project';
    }

    get tableColumnCount() {
        if (this.state.dataSource === DATA_SOURCE_TASK) return 7;
        if (!this.isHelpdeskSource) return 5;
        // Compact Helpdesk layout: action, optional Therp link, priority, ticket,
        // stage, optional assignee (only in Show for everyone), optional hours.
        return 4 +
            Number(this.showHelpdeskTherpLink) +
            Number(this.showHelpdeskAssignee) +
            Number(this.showHelpdeskHours);
    }

    loadingMessage(includeSession = false) {
        const noun = this.state.dataSource === DATA_SOURCE_HELPDESK
            ? 'Helpdesk tickets'
            : this.state.dataSource === DATA_SOURCE_TASK ? 'tasks' : 'issues';
        return includeSession ? `Loading current session and ${noun}…` : `Loading ${noun}…`;
    }

    relationId(value) {
        if (!value) return null;
        if (Array.isArray(value)) return Number(value[0]) || null;
        if (typeof value === 'object') return Number(value.id) || null;
        return Number(value) || null;
    }

    captureSessionCompanies(sessionInfo) {
        const contextIds = Array.isArray(sessionInfo?.user_context?.allowed_company_ids)
            ? sessionInfo.user_context.allowed_company_ids.map(Number).filter(Boolean)
            : [];
        const rawAllowed = sessionInfo?.user_companies?.allowed_companies;
        let availableIds = [];
        const companyNames = {};
        if (Array.isArray(rawAllowed)) {
            for (const item of rawAllowed) {
                const id = Number(typeof item === 'object' ? item?.id : item);
                if (!id) continue;
                availableIds.push(id);
                if (typeof item === 'object' && item?.name) companyNames[id] = String(item.name);
            }
        } else if (rawAllowed && typeof rawAllowed === 'object') {
            availableIds = Object.keys(rawAllowed).map(Number).filter(Boolean);
            for (const [id, item] of Object.entries(rawAllowed)) {
                if (item?.name) companyNames[Number(id)] = String(item.name);
            }
        }
        const current = Number(
            sessionInfo?.user_companies?.current_company || contextIds[0] || availableIds[0] || 0
        ) || null;
        this.state.currentUserId = Number(sessionInfo?.uid || 0) || null;
        this.state.currentCompanyId = current;
        this.state.availableCompanyIds = availableIds.length
            ? [...new Set(availableIds)]
            : [...new Set(contextIds.length ? contextIds : (current ? [current] : []))];
        this.state.allowedCompanyIds = contextIds.length
            ? [...new Set(contextIds)]
            : [...this.state.availableCompanyIds];
        this.state.companyNames = companyNames;
    }

    helpdeskTimesheetCompanyId(issue) {
        // hr_timesheet derives the timesheet company from project_id first, so
        // mirror that choice when building the RPC company context.
        const projectId = this.relationId(issue?.project_id);
        const project = this.state.projects.find((item) => Number(item.id) === Number(projectId));
        const projectCompany = this.relationId(project?.company_id);
        if (projectCompany) return projectCompany;
        const field = this.state.sourceCapabilities.companyField;
        const ticketCompany = this.relationId(field ? issue?.[field] : issue?.company_id);
        return ticketCompany || this.state.currentCompanyId || null;
    }

    helpdeskTimesheetContext(companyId) {
        if (!companyId) return {};
        const allowed = [
            companyId,
            ...(this.state.allowedCompanyIds || []).filter((id) => Number(id) !== Number(companyId)),
        ];
        return {allowed_company_ids: allowed};
    }


    helpdeskCompanyLabel(companyId) {
        if (!companyId) return 'the ticket/project company';
        return this.state.companyNames?.[companyId] || `company #${companyId}`;
    }

    helpdeskTimesheetBlocked(issue) {
        return this.isHelpdeskSource && issue?.__timesheetWritable === false;
    }

    helpdeskTimesheetBlockMessage(issue) {
        return issue?.__timesheetBlockMessage || 'Odoo is not currently able to create a timesheet for this ticket.';
    }

    async showHelpdeskTimesheetInfo(issue) {
        await notify(this.helpdeskTimesheetBlockMessage(issue));
    }

    staticHelpdeskTimesheetReadiness(issue) {
        if (!this.state.sourceCapabilities.canRecordTime) {
            return {writable: false, message: helpdeskTimesheetUnavailableMessage()};
        }
        if (!isHelpdeskTimesheetEnabled(issue, this.state.sourceCapabilities)) {
            return {
                writable: false,
                message: 'Timesheets are disabled for this ticket team/project. Enable Helpdesk Timesheets in Odoo before starting the timer.',
            };
        }
        const projectId = this.relationId(issue?.project_id);
        const analyticAccount = this.resolveAnalyticAccount(issue);
        if (!projectId && !analyticAccount) {
            return {
                writable: false,
                message: 'This Helpdesk ticket has no timesheet project or analytic account. Configure its Helpdesk team/project in Odoo before starting the timer.',
            };
        }
        const companyId = this.helpdeskTimesheetCompanyId(issue);
        const accessible = this.state.availableCompanyIds || [];
        if (companyId && accessible.length && !accessible.map(Number).includes(Number(companyId))) {
            return {
                writable: false,
                message: `The ticket/project belongs to ${this.helpdeskCompanyLabel(companyId)}, which is not an allowed company for this Odoo user.`,
            };
        }
        return {writable: null, message: '', companyId};
    }

    async annotateHelpdeskTimesheetReadiness(records) {
        if (!this.isHelpdeskSource) return records;
        const annotated = records.map((issue) => {
            const check = this.staticHelpdeskTimesheetReadiness(issue);
            return {
                ...issue,
                __timesheetWritable: check.writable,
                __timesheetBlockMessage: check.message || '',
                __timesheetCompanyId: check.companyId || this.helpdeskTimesheetCompanyId(issue),
            };
        });

        const pending = annotated.filter((issue) => issue.__timesheetWritable === null);
        if (!pending.length || !this.state.currentUserId) return annotated;

        const companyIds = [...new Set(pending.map((issue) => Number(issue.__timesheetCompanyId || 0)).filter(Boolean))];
        const domain = [
            ['user_id', '=', this.state.currentUserId],
            ['active', '=', true],
        ];
        if (companyIds.length) domain.push(['company_id', 'in', companyIds]);
        else if (this.state.allowedCompanyIds?.length) domain.push(['company_id', 'in', this.state.allowedCompanyIds]);

        let employees;
        try {
            const contextIds = companyIds.length
                ? [...new Set([...companyIds, ...(this.state.allowedCompanyIds || [])])]
                : (this.state.allowedCompanyIds || []);
            const result = await this.rpc.searchRead('hr.employee', domain, ['id', 'company_id'], {
                limit: 100,
                context: contextIds.length ? {allowed_company_ids: contextIds} : {},
            });
            employees = result.records || [];
        } catch (err) {
            // Some users cannot read hr.employee even though account.analytic.line
            // create() can resolve the employee with sudo. In that case the check
            // is inconclusive, so do not disable a timer that Odoo may accept.
            console.warn('Helpdesk timesheet employee preflight could not be verified', err);
            return annotated;
        }

        const employeeCompanies = new Set(
            employees.map((employee) => this.relationId(employee.company_id)).filter(Boolean)
        );
        for (const issue of annotated) {
            if (issue.__timesheetWritable !== null) continue;
            const companyId = Number(issue.__timesheetCompanyId || 0) || null;
            if (companyId) {
                if (employeeCompanies.has(companyId)) {
                    issue.__timesheetWritable = true;
                } else {
                    issue.__timesheetWritable = false;
                    issue.__timesheetBlockMessage =
                        `Odoo cannot create this timesheet because your user has no active employee in ${this.helpdeskCompanyLabel(companyId)}. ` +
                        'Check the employee company and allowed companies, then reconnect.';
                }
            } else if (!employees.length) {
                issue.__timesheetWritable = false;
                issue.__timesheetBlockMessage =
                    'Odoo cannot create this timesheet because your user has no active employee in the selected companies. ' +
                    'Check the employee company and allowed companies, then reconnect.';
            } else if (employees.length === 1) {
                issue.__timesheetWritable = true;
            }
        }
        return annotated;
    }

    async refreshHelpdeskTimesheetReadiness(issue) {
        if (!this.isHelpdeskSource) return issue;
        const [checked] = await this.annotateHelpdeskTimesheetReadiness([{...issue}]);
        if (!checked) return issue;
        const index = this.state.issues.findIndex((item) => Number(item.id) === Number(issue.id));
        if (index >= 0) this.state.issues[index] = {...this.state.issues[index], ...checked};
        return checked;
    }

    async updateLimitPreference(value) {
        this.state.limitTo = value;
        await storage.set(STORAGE_KEYS.searchLimit, value);
    }

    updateHelpdeskStageFilter(value) {
        this.state.helpdeskStageFilter = String(value || '');
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
            if (this.isActiveTimerItem(a)) return -1;
            if (this.isActiveTimerItem(b)) return 1;
            const priorityDelta = Number(b.priority || 0) - Number(a.priority || 0);
            if (priorityDelta !== 0) return priorityDelta;
            const stageDelta = Number(a.stage_sequence ?? 9999) - Number(b.stage_sequence ?? 9999);
            if (stageDelta !== 0) return stageDelta;
            return a.id - b.id;
        });

        if (this.isHelpdeskSource && this.state.helpdeskStageFilter) {
            const stageId = Number(this.state.helpdeskStageFilter);
            issues = issues.filter((issue) =>
                this.isActiveTimerItem(issue) || Number(issue.stage_id?.[0]) === stageId
            );
        }

        const matchesSearch = (issue) => this.matchesCurrentSearch(issue, query);

        if (this.state.allIssues) {
            issues = issues.filter((issue) => this.isActiveTimerItem(issue) || matchesSearch(issue));
        } else if (this.state.user?.id) {
            issues = issues.filter(
                (issue) =>
                    this.isActiveTimerItem(issue) ||
                    (isAssignedToUser(
                        issue,
                        this.state.sourceCapabilities.assignmentField || 'user_id',
                        this.state.user.id,
                        this.state.sourceCapabilities.assignmentType
                    ) && matchesSearch(issue))
            );
        } else {
            issues = issues.filter((issue) => this.isActiveTimerItem(issue) || matchesSearch(issue));
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
        this.state.currentCompanyId = null;
        this.state.allowedCompanyIds = [];
        this.state.availableCompanyIds = [];
        this.state.currentUserId = null;
        this.state.companyNames = {};
        this.state.serverVersion = '';
        this.state.odooOWLVersion = owl.__info__.version;
        this.state.supportedFields = {};
        this.state.sourceCapabilities = {};
        this.state.sourceError = '';
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
            activeTimerContext,
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
            storage.get(STORAGE_KEYS.activeTimerContext, null),
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
        this.state.activeTimerContext = activeTimerContext || (
            this.state.activeTimerId
                ? {
                    host: this.state.currentHost,
                    database: this.state.currentDatabase,
                    model: this.state.dataSource,
                    resId: this.state.activeTimerId,
                    startedAt: this.state.timerStartIso,
                }
                : null
        );
        this.state.limitTo = searchLimit ?? DEFAULTS.searchLimit;
        this.state.allIssues = !!showAllItems;
        this.state.busyMessage = this.loadingMessage(true);
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

        const storedRemoteKey = remoteIdentity({
            url: this.state.currentHost,
            database: this.state.currentDatabase,
            datasrc: this.state.dataSource,
        });
        let remoteIndex = this.state.remotes.findIndex(
            (remote) => remoteIdentity(remote) === storedRemoteKey
        );
        if (remoteIndex < 0) {
            remoteIndex = this.state.remotes.findIndex(
                (remote) => remote.url === this.state.currentHost && remote.database === this.state.currentDatabase
            );
        }

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

    helpdeskAssigneeValue(issue) {
        const field = this.state.sourceCapabilities.assignmentField;
        return field ? issue?.[field] : null;
    }

    helpdeskTeamValue(issue) {
        const field = this.state.sourceCapabilities.teamField;
        return field ? issue?.[field] : null;
    }

    helpdeskProjectValue(issue) {
        const field = this.state.sourceCapabilities.projectField;
        return field ? issue?.[field] : null;
    }

    helpdeskDescriptionText(issue) {
        const field = this.state.sourceCapabilities.descriptionField;
        return field ? extractMessageSummary(issue?.[field] || '') : '';
    }

    helpdeskTherpLinkValue(issue) {
        const field = this.state.sourceCapabilities.therpLinkField;
        return field ? this.normalizeText(issue?.[field]) : '';
    }

    helpdeskTherpLinkHref(issue) {
        const value = this.helpdeskTherpLinkValue(issue).trim();
        if (/^https?:\/\//i.test(value)) return value;
        if (value.startsWith('/') && this.state.currentHost) {
            return `${this.state.currentHost}${value}`;
        }
        return null;
    }

    matchesCurrentSearch(issue, query) {
        if (matchesIssue(issue, query)) return true;
        if (!query || !this.isHelpdeskSource) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [
            issue.stage_id?.[0],
            this.helpdeskDescriptionText(issue),
            this.helpdeskTherpLinkValue(issue),
            this.relationLabel(this.helpdeskAssigneeValue(issue)),
            this.relationLabel(this.helpdeskTeamValue(issue)),
            this.relationLabel(this.helpdeskProjectValue(issue)),
        ].filter(Boolean).join(' ').toLowerCase().includes(q);
    }

    resourceRelationValue(issue) {
        return resourceRelation(issue, this.state.dataSource, this.state.sourceCapabilities);
    }

    helpdeskHoursValue(issue) {
        return resourceHours(issue, this.state.dataSource, this.state.sourceCapabilities);
    }

    isActiveTimerItem(issue) {
        if (!issue?.id || Number(issue.id) !== Number(this.state.activeTimerId)) return false;
        const context = this.state.activeTimerContext;
        if (!context) return true;
        return (
            context.model === this.state.dataSource &&
            context.host === this.state.currentHost &&
            context.database === this.state.currentDatabase
        );
    }

    issueHref(issue) {
        if (!this.state.currentHost || !issue?.id) {
            return null;
        }
        return `${this.state.currentHost}/web#id=${issue.id}&model=${this.state.dataSource}&view_type=form`;
    }

    issueLabel(issue) {
        if (this.state.dataSource === DATA_SOURCE_HELPDESK) {
            const referenceField = this.state.sourceCapabilities.ticketReferenceField;
            const reference = this.normalizeText(referenceField ? issue[referenceField] : '');
            const name = this.normalizeText(issue.name || issue.display_name || issue.description || '');
            return [reference || `#${issue.id}`, name].filter(Boolean).join(' - ');
        }
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
        this.state.loadingTable = true;

        const remoteInfo = remote || this.currentRemote || null;

        this.state.currentDatabase =
            sessionInfo.db || remoteInfo?.database || this.state.currentDatabase;
        this.state.currentHost =
            remoteInfo?.url || sessionInfo['web.base.url'] || this.state.currentHost;
        this.state.dataSource =
            remoteInfo?.datasrc || this.state.dataSource || DEFAULTS.dataSource;
        this.captureSessionCompanies(sessionInfo);
        this.state.busyMessage = this.loadingMessage(true);

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
                (async () => {
                    await this.loadProjects().catch((err) => console.warn('loadProjects failed', err));
                    await this.loadIssues().catch((err) => console.warn('loadIssues failed', err));
                })(),
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
        const projectFields = await this.getSupportedFieldsForModel('project.project');
        if (!projectFields) {
            this.state.projects = [];
            return;
        }
        const fields = ['name', 'analytic_account_id', 'account_id', 'company_id'].filter((field) =>
            Object.prototype.hasOwnProperty.call(projectFields, field)
        );
        const result = await this.rpc.searchRead('project.project', [], fields);
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
     * Detect the installed Helpdesk implementation and its timesheet relation.
     * Enterprise uses helpdesk_ticket_id; OCA uses ticket_id.
     */
    async inspectSelectedSource() {
        this.state.sourceError = '';
        if (this.state.dataSource !== DATA_SOURCE_HELPDESK) {
            this.state.sourceCapabilities = { canRecordTime: true, assignmentField: 'user_id' };
            return true;
        }

        let ticketFields;
        try {
            ticketFields = await this.rpc.fieldsGet(DATA_SOURCE_HELPDESK, [
                'type', 'string', 'relation', 'required', 'readonly',
            ]);
            this.state.supportedFields[DATA_SOURCE_HELPDESK] = ticketFields || {};
        } catch (err) {
            this.state.sourceCapabilities = { available: false, canRecordTime: false };
            this.state.sourceError = helpdeskUnavailableMessage(err);
            this.state.issues = [];
            return false;
        }

        let timesheetFields = {};
        let timesheetError = null;
        try {
            timesheetFields = await this.rpc.fieldsGet('account.analytic.line', [
                'type', 'string', 'relation', 'required', 'readonly',
            ]);
            this.state.supportedFields['account.analytic.line'] = timesheetFields || {};
        } catch (err) {
            timesheetError = err;
        }

        const capabilities = inspectHelpdeskCapabilities(ticketFields, timesheetFields);
        this.state.sourceCapabilities = capabilities;

        const warnings = [];
        if (!capabilities.assignmentField) {
            warnings.push('The ticket assignment field could not be detected; assigned-only filtering is unavailable.');
        }
        if (!capabilities.canRecordTime) {
            warnings.push(helpdeskTimesheetUnavailableMessage(timesheetError));
        }
        this.state.sourceError = warnings.join(' ');
        return true;
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
        this.state.busyMessage = this.loadingMessage(false);

        try {
            if (!(await this.inspectSelectedSource())) return;

            const capabilities = this.state.sourceCapabilities;
            const availableFields = await this.getSupportedFieldsForModel(model);
            if (!availableFields) {
                if (model === DATA_SOURCE_HELPDESK) {
                    this.state.sourceError = helpdeskUnavailableMessage();
                    this.state.issues = [];
                    return;
                }
                throw new Error(`Could not inspect fields for ${model}.`);
            }

            let openDomain;
            if (model === DATA_SOURCE_HELPDESK && capabilities.closedField) {
                openDomain = [[capabilities.closedField, '=', false]];
            } else if (model === DATA_SOURCE_HELPDESK && capabilities.activeField) {
                openDomain = [[capabilities.activeField, '=', true]];
            } else {
                openDomain = [
                    '&',
                    ['stage_id.name', 'not ilike', '%Done%'],
                    '&',
                    ['stage_id.name', 'not ilike', '%Cancel%'],
                    ['stage_id.name', 'not ilike', '%Hold%'],
                ];
            }

            const timerContext = this.state.activeTimerContext;
            const activeId = this.state.activeTimerId && (
                !timerContext || (
                    timerContext.model === model &&
                    timerContext.host === this.state.currentHost &&
                    timerContext.database === this.state.currentDatabase
                )
            ) ? this.state.activeTimerId : null;
            const domain = activeId
                ? ['|', ['id', '=', activeId], ...openDomain]
                : openDomain;

            const baseFields = [
                'id',
                'name',
                'user_id',
                'project_id',
                'company_id',
                'stage_id',
                'priority',
                'create_date',
                'analytic_account_id',
                'account_id',
            ];

            const extraFieldsByModel = {
                [DATA_SOURCE_ISSUE]: ['working_hours_open', 'message_summary', 'message_unread', 'description'],
                [DATA_SOURCE_TASK]: ['effective_hours', 'remaining_hours', 'code', 'description', 'display_name'],
                [DATA_SOURCE_HELPDESK]: [
                    'display_name',
                    'description',
                    'partner_id',
                    capabilities.assignmentField,
                    capabilities.projectField,
                    capabilities.companyField,
                    capabilities.teamField,
                    capabilities.descriptionField,
                    capabilities.therpLinkField,
                    capabilities.analyticAccountField,
                    capabilities.stageField,
                    capabilities.timeEnabledField,
                    capabilities.hoursField,
                    capabilities.ticketReferenceField,
                    capabilities.closedField,
                    capabilities.activeField,
                ].filter(Boolean),
            };

            const desiredFields = [...new Set([...baseFields, ...(extraFieldsByModel[model] || [])])];

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
            const stageModel = model === DATA_SOURCE_TASK
                ? 'project.task.type'
                : capabilities.stageModel;
            if (stageModel) {
                const stageIds = [...new Set(records.map((issue) => issue.stage_id?.[0]).filter(Boolean))];
                if (stageIds.length) {
                    const stageFields = await this.getSupportedFieldsForModel(stageModel);
                    if (stageFields?.sequence) {
                        const stages = await this.rpc.searchRead(stageModel, [['id', 'in', stageIds]], ['id', 'sequence']);
                        stageSequenceById = new Map((stages.records || []).map((stage) => [stage.id, Number(stage.sequence || 0)]));
                    }
                }
            }

            let preparedRecords = records.map((issue) => ({
                ...issue,
                message_summary: extractMessageSummary(
                    issue.message_summary || issue.description || issue.display_name || issue.name || ''
                ),
                priority_level: priorityStars(issue.priority),
                stage_sequence: stageSequenceById.get(issue.stage_id?.[0]) ?? 9999,
            }));
            if (model === DATA_SOURCE_HELPDESK) {
                preparedRecords = await this.annotateHelpdeskTimesheetReadiness(preparedRecords);
            }
            this.state.issues = preparedRecords;
        } catch (err) {
            if (model === DATA_SOURCE_HELPDESK) {
                this.state.issues = [];
                this.state.sourceError = `Helpdesk tickets could not be loaded: ${err.message || err}`;
                return;
            }
            throw err;
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
        if (this.state.activeTimerId) {
            await notify(`Stop the active ${this.itemLabelSingular} timer before starting another one.`);
            return;
        }
        if (this.isHelpdeskSource) {
            const checkedIssue = await this.refreshHelpdeskTimesheetReadiness(issue);
            if (this.helpdeskTimesheetBlocked(checkedIssue)) {
                await this.showHelpdeskTimesheetInfo(checkedIssue);
                return;
            }
        }

        const now = new Date().toISOString();
        this.state.activeTimerId = issue.id;
        this.state.timerStartIso = now;
        this.state.activeTimerContext = {
            host: this.state.currentHost,
            database: this.state.currentDatabase,
            model: this.state.dataSource,
            resId: issue.id,
            startedAt: now,
        };
        await storage.set(STORAGE_KEYS.timerStartIso, now);
        await storage.set(STORAGE_KEYS.activeTimerId, issue.id);
        await storage.set(STORAGE_KEYS.activeTimerContext, this.state.activeTimerContext);
        await sendTimerStateToBackground(true);
    }

    /**
     * Resolve the analytic account for the given issue/task.
     */
    resolveAnalyticAccount(issue) {
        if (issue.analytic_account_id) return issue.analytic_account_id;
        if (issue.account_id) return issue.account_id;
        const project = this.state.projects.find(
            (currentProject) => currentProject.id === issue.project_id?.[0]
        );
        return project?.account_id || project?.analytic_account_id;
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
     * Create a native Enterprise or OCA Helpdesk timesheet entry.
     */
    async createHelpdeskTimesheet(params) {
        const capabilities = this.state.sourceCapabilities;
        const binding = timesheetBinding(DATA_SOURCE_HELPDESK, capabilities);
        if (!binding) throw new Error(helpdeskTimesheetUnavailableMessage());

        const values = {
            date: params.date,
            user_id: this.state.user.id,
            name: params.issueName,
            unit_amount: params.durationInHours,
            [binding.linkField]: params.issue.id,
        };
        const lineFields = capabilities.timesheetFields || {};
        const projectId = params.issue.project_id?.[0];
        const analyticAccountId = params.analyticAccount?.[0];
        const companyId = this.helpdeskTimesheetCompanyId(params.issue);
        if (projectId && Object.prototype.hasOwnProperty.call(lineFields, 'project_id')) {
            values.project_id = projectId;
        }
        if (analyticAccountId && Object.prototype.hasOwnProperty.call(lineFields, 'account_id')) {
            values.account_id = analyticAccountId;
        }
        if (companyId && Object.prototype.hasOwnProperty.call(lineFields, 'company_id')) {
            values.company_id = companyId;
        }

        try {
            await this.rpc.call(binding.model, 'create', [values], {
                context: this.helpdeskTimesheetContext(companyId),
            });
        } catch (err) {
            if (String(err?.message || '').includes('active employee in the selected companies')) {
                throw new Error(
                    'Odoo could not match your user to an active employee in the ticket/project company. ' +
                    'Check the employee company and allowed companies, then reconnect.'
                );
            }
            throw err;
        }
    }

    /**
     * Stop the active timer and create the Odoo timesheet row.
     */
    async stopTimer(issue) {
        try {
            if (!this.isActiveTimerItem(issue)) {
                throw new Error('This row does not match the active timer context. Return to the original remote and item before stopping it.');
            }
            if (this.isHelpdeskSource && !this.state.sourceCapabilities.canRecordTime) {
                throw new Error(helpdeskTimesheetUnavailableMessage());
            }
            if (this.isHelpdeskSource && !isHelpdeskTimesheetEnabled(issue, this.state.sourceCapabilities)) {
                throw new Error('Timesheets are disabled for this ticket team/project in Odoo.');
            }
            const promptTitle = this.isHelpdeskSource
                ? `Timesheet Description for Ticket #${issue.id}`
                : `${this.itemLabelSingular.charAt(0).toUpperCase() + this.itemLabelSingular.slice(1)} #${issue.id} Description`;
            const issueDescription = (await promptDialog(promptTitle, issue.name)) || '';

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

            if (!analyticAccount && this.state.dataSource !== DATA_SOURCE_HELPDESK) {
                throw new Error('No analytic account is defined on the project.');
            }
            if (
                this.state.dataSource === DATA_SOURCE_HELPDESK &&
                !analyticAccount &&
                !issue.project_id
            ) {
                throw new Error('This ticket has no timesheet project or analytic account. Configure one on its Helpdesk team/project first.');
            }

            const issueName = issueDescription.trim() || `${issue.name} (#${issue.id})`;
            const formattedDate = now.toISOString().slice(0, 10);
            const commonPayload = {
                issue,
                issueName,
                analyticAccount,
                durationInHours,
                date: formattedDate,
            };

            if (this.state.dataSource === DATA_SOURCE_ISSUE) {
                await this.createIssueTimesheet(commonPayload);
            } else if (this.state.dataSource === DATA_SOURCE_HELPDESK) {
                await this.createHelpdeskTimesheet(commonPayload);
            } else {
                await this.createTaskTimesheet(commonPayload);
            }
            await notify(`Time for ${this.itemLabelSingular} #${issue.id} was successfully recorded in Odoo timesheets.`);

            if (this.state.autoDownloadIssueTimesheet) {
                await this.downloadCurrentIssueTimesheet(issue);
            }

            this.state.activeTimerId = null;
            this.state.timerStartIso = null;
            this.state.activeTimerContext = null;
            await storage.remove(STORAGE_KEYS.timerStartIso);
            await storage.remove(STORAGE_KEYS.activeTimerId);
            await storage.remove(STORAGE_KEYS.activeTimerContext);
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
        this.state.activeTimerContext = null;
        await storage.remove(STORAGE_KEYS.timerStartIso);
        await storage.remove(STORAGE_KEYS.activeTimerId);
        await storage.remove(STORAGE_KEYS.activeTimerContext);
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
            const binding = timesheetBinding(this.state.dataSource, this.state.sourceCapabilities);
            if (!binding) throw new Error(helpdeskTimesheetUnavailableMessage());
            const model = binding.model;
            const domain = [
                ['user_id', '=', this.state.user.id],
                ['date', '>=', firstDay],
                ['date', '<=', currentDay],
            ];
            if (this.state.dataSource === DATA_SOURCE_HELPDESK) {
                domain.push([binding.linkField, '!=', false]);
            }

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
        const binding = timesheetBinding(this.state.dataSource, this.state.sourceCapabilities);
        if (!binding) throw new Error(helpdeskTimesheetUnavailableMessage());
        const model = binding.model;
        const keyDomain = [binding.linkField, '=', issue.id];
        const domain = [
            ['user_id', '=', this.state.user.id],
            ['date', '>=', firstDay],
            ['date', '<=', currentDay],
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
        this.state.currentCompanyId = null;
        this.state.allowedCompanyIds = [];
        this.state.availableCompanyIds = [];
        this.state.currentUserId = null;
        this.state.companyNames = {};
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
