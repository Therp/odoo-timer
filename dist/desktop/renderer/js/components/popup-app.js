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

const { Component, mount, useState, onMounted, onWillUnmount } = owl;

const VIEW_LOADING = 'loading';
const VIEW_LOGIN   = 'login';
const VIEW_MAIN    = 'main';

const STORAGE_KEYS = {
    useExistingSession:          'useExistingSession',
    autoDownloadIssueTimesheet:  'auto_download_issue_timesheet',
    timerStartIso:               'start_date_time',
    activeTimerId:               'active_timer_id',
    activeTimerContext:          'active_timer_context',
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
    busyMessage:         'Loading current session…',
    dataSource:          DATA_SOURCE_ISSUE,
};

// ─── Template registry ────────────────────────────────────────────────────────

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
            stageFilter: '',
            limitTo:           DEFAULTS.searchLimit,
            allIssues:         false,
            autoDownloadIssueTimesheet: false,
            activeTimerId:     null,
            timerStartIso:     null,
            timerNow:          Date.now(),
            currentHost:       '',
            currentDatabase:   '',
            dataSource:        DEFAULTS.dataSource,
            currentCompanyId:  null,
            allowedCompanyIds: [],
            availableCompanyIds: [],
            currentUserId:      null,
            companyNames:       {},
            serverVersion:     '',
            supportedFields:   {},
            sourceCapabilities: {},
            sourceError:       '',
            activeTimerContext: null,
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
        this.openTimesheets              = this.openTimesheets.bind(this);
        this.openLogs                    = this.openLogs.bind(this);
        this.toggleRecording             = this.toggleRecording.bind(this);
        this.toggleAutoDownload          = this.toggleAutoDownload.bind(this);
        this.toggleUseExistingSession    = this.toggleUseExistingSession.bind(this);
        this.togglePassword              = this.togglePassword.bind(this);
        this.updateLimitPreference       = this.updateLimitPreference.bind(this);
        this.updateShowAllPreference     = this.updateShowAllPreference.bind(this);
        this.updateStageFilter             = this.updateStageFilter.bind(this);
        this.showHelpdeskTimesheetInfo = this.showHelpdeskTimesheetInfo.bind(this);

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

            // Background message polling: poll Odoo directly when
            // the Messages window may not be open, so the badge stays current.
            this._bgMsgPollHandle = setInterval(async () => {
                await this._backgroundMsgPoll();
            }, 60000); // every 60 s
        });

        onWillUnmount(() => {
            if (this._timerHandle)     clearInterval(this._timerHandle);
            if (this._unreadSyncHandle) clearInterval(this._unreadSyncHandle);
            if (this._bgMsgPollHandle)  clearInterval(this._bgMsgPollHandle);
        });
    }

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
    get currentRemoteLogoSrc() { return this.currentRemote?.logoDataUrl || 'img/logo.png'; }
    get currentDataSourceLabel() {
        return this.state.dataSource === DATA_SOURCE_HELPDESK
            ? 'Helpdesk Tickets'
            : this.state.dataSource === DATA_SOURCE_TASK ? 'Tasks' : 'Issues';
    }
    get currentCompanyLabel() {
        const id = Number(this.state.currentCompanyId || 0);
        return id ? (this.state.companyNames?.[id] || `Company #${id}`) : '—';
    }
    get allowedCompanyLabels() {
        const ids = (this.state.allowedCompanyIds?.length
            ? this.state.allowedCompanyIds
            : this.state.availableCompanyIds) || [];
        const labels = ids.map((id) => this.state.companyNames?.[Number(id)] || `Company #${id}`);
        return labels.length ? labels.join(', ') : '—';
    }
    get allowedCompanySummary() {
        const text = this.allowedCompanyLabels;
        return text.length > 46 ? `${text.slice(0, 43)}…` : text;
    }

    get formattedTimer() {
        if (!this.state.timerStartIso) return '00:00:00';
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

    get stageOptions() {
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
        const rawCurrent = sessionInfo?.user_companies?.current_company;
        const current = Number(
            (typeof rawCurrent === 'object' ? rawCurrent?.id : rawCurrent) ||
            contextIds[0] || availableIds[0] || 0
        ) || null;
        if (current && typeof rawCurrent === 'object' && rawCurrent?.name) {
            companyNames[current] = String(rawCurrent.name);
        }
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
        return { allowed_company_ids: allowed };
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
        const message = issue?.__timesheetBlockMessage ||
            'Odoo is not currently able to create a timesheet for this ticket.';
        const companyDetails = [
            this?.currentCompanyLabel && `Current company: ${this.currentCompanyLabel}`,
            this?.allowedCompanyLabels && this.allowedCompanyLabels !== '—' &&
                `Allowed companies: ${this.allowedCompanyLabels}`,
        ].filter(Boolean);
        await notify([message, ...companyDetails].join('\n\n'));
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

    /** OWL version string for display in footer (avoids inline JS in XML template). */
    get owlVersion() { return `v${String(owl.__info__?.version || '?')}`; }

    /** Filled star array for priority display (replaces inline Array.from in XML). */
    priorityStarsArr(priority) {
        const n = Number(priority || 0);
        return n > 0 ? Array.from({ length: n }, (_, i) => i) : [];
    }

    /** Outline star array (3 - filled stars) for priority display. */
    priorityOutlineArr(priority) {
        const filled = this.priorityStarsArr(priority).length;
        return Array.from({ length: 3 - filled }, (_, i) => i);
    }

    async updateLimitPreference(value) {
        this.state.limitTo = value;
        await storage.set(STORAGE_KEYS.searchLimit, value);
    }

    updateStageFilter(value) {
        this.state.stageFilter = String(value || '');
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
        let issues = Array.isArray(this.state.issues) ? [...this.state.issues] : [];

        issues.sort((a, b) => {
            if (this.isActiveTimerItem(a)) return -1;
            if (this.isActiveTimerItem(b)) return 1;
            const priorityDelta = Number(b.priority || 0) - Number(a.priority || 0);
            if (priorityDelta !== 0) return priorityDelta;
            const stageDelta = Number(a.stage_sequence ?? 9999) - Number(b.stage_sequence ?? 9999);
            if (stageDelta !== 0) return stageDelta;
            return a.id - b.id;
        });

        if (this.isHelpdeskSource && this.state.stageFilter) {
            const stageId = Number(this.state.stageFilter);
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
            user: null, projects: [], issues: [], currentCompanyId: null, allowedCompanyIds: [], availableCompanyIds: [], currentUserId: null, companyNames: {},
            serverVersion: '', supportedFields: {},
            sourceCapabilities: {}, sourceError: '',
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
            activeTimerContext, currentHost, currentDb, currentSrc, searchLimit, showAllItems,
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
        this.state.useExistingSession        = !!useExisting;
        this.state.autoDownloadIssueTimesheet = !!autoDownload;
        this.state.timerStartIso             = timerStartIso;
        this.state.activeTimerId             = activeTimerIdRaw ? Number(activeTimerIdRaw) : null;
        this.state.currentHost               = currentHost || '';
        this.state.currentDatabase           = currentDb || '';
        this.state.dataSource                = currentSrc || DEFAULTS.dataSource;
        this.state.activeTimerContext        = activeTimerContext || (
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
        this.state.limitTo                   = searchLimit ?? DEFAULTS.searchLimit;
        this.state.allIssues                 = !!showAllItems;
        this.state.busyMessage               = this.loadingMessage(true);
    }

    async bootstrap() {
        this.state.busyMessage = DEFAULTS.busyMessage;
        await this.clearLegacyIssueCache();

        this.state.remotes = await readRemotes();

        await this.loadStoredPopupState();

        if (!this.state.currentHost) { this.state.view = VIEW_LOGIN; return; }

        this.rpc.setHost(this.state.currentHost);

        const storedRemoteKey = remoteIdentity({
            url: this.state.currentHost,
            database: this.state.currentDatabase,
            datasrc: this.state.dataSource,
        });
        let remoteIndex = this.state.remotes.findIndex((remote) => remoteIdentity(remote) === storedRemoteKey);
        if (remoteIndex < 0) {
            remoteIndex = this.state.remotes.findIndex(
                (remote) => remote.url === this.state.currentHost && remote.database === this.state.currentDatabase
            );
        }
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

    relationLabel(value) {
        if (!value) return '';
        if (Array.isArray(value)) return this.normalizeText(value[1] ?? value[0]);
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
        return context.model === this.state.dataSource &&
            context.host === this.state.currentHost &&
            context.database === this.state.currentDatabase;
    }

    issueHref(issue) {
        if (!this.state.currentHost || !issue?.id) return null;
        return `${this.state.currentHost}/web#id=${issue.id}&model=${this.state.dataSource}&view_type=form`;
    }

    issueLabel(issue) {
        if (this.state.dataSource === DATA_SOURCE_HELPDESK) {
            const referenceField = this.state.sourceCapabilities.ticketReferenceField;
            const reference = this.normalizeText(referenceField ? issue[referenceField] : '');
            const name = this.normalizeText(issue.name || issue.display_name || issue.description || '');
            return [reference || `#${issue.id}`, name].filter(Boolean).join(' - ');
        }
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
        this.state.loadingTable  = true;
        const remoteInfo = remote || this.currentRemote || null;

        this.state.currentDatabase = sessionInfo.db || remoteInfo?.database || this.state.currentDatabase;
        this.state.currentHost     = remoteInfo?.url || this.state.currentHost;
        this.state.dataSource      = remoteInfo?.datasrc || this.state.dataSource || DEFAULTS.dataSource;
        this.resetSupportedFieldCache();
        this.captureSessionCompanies(sessionInfo);
        this.state.busyMessage = this.loadingMessage(true);

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
            this.state.remotes = updated;
        }

        const userPromise = this.rpc
            .searchRead('res.users', [['id', '=', sessionInfo.uid]], ['display_name'])
            .catch(() => ({ records: [] }));

        const serverInfoPromise = this.rpc.getServerInfo().catch(() => null);

        try {
            const [userResult, serverInfo] = await Promise.all([
                userPromise, serverInfoPromise,
                (async () => {
                    await this.loadProjects().catch((err) => console.warn('loadProjects failed', err));
                    await this.loadIssues().catch((err) => console.warn('loadIssues failed', err));
                })(),
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

    resetSupportedFieldCache() {
        // Field metadata differs between Odoo versions and can also change with
        // installed modules. Never reuse one remote/session's fields_get result
        // for another remote.
        this.state.supportedFields = {};
        this.state.sourceCapabilities = {};
        this.state.sourceError = '';
    }

    async loadProjects() {
        const projectFields = await this.getSupportedFieldsForModel('project.project');
        if (!projectFields) { this.state.projects = []; return; }
        const fields = ['name', 'analytic_account_id', 'account_id', 'company_id'].filter((field) =>
            Object.prototype.hasOwnProperty.call(projectFields, field)
        );
        const result = await this.searchReadWithInvalidFieldRetry('project.project', [], fields);
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

    async searchReadWithInvalidFieldRetry(model, domain, requestedFields) {
        try { return await this.rpc.searchRead(model, domain, requestedFields); }
        catch (err) {
            const m = String(err?.message || '');
            const match = m.match(/Invalid field ['"]([\w.]+)['"]/i);
            if (!match) throw err;
            const invalid = match[1];
            const narrowed = requestedFields.filter((f) => f !== invalid);
            if (!narrowed.length || narrowed.length === requestedFields.length) throw err;
            const cachedFields = this.state.supportedFields[model];
            if (cachedFields && Object.prototype.hasOwnProperty.call(cachedFields, invalid)) {
                delete cachedFields[invalid];
            }
            console.warn(`Retrying ${model} without unsupported field: ${invalid}`);
            return this.searchReadWithInvalidFieldRetry(model, domain, narrowed);
        }
    }

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
                openDomain = ['&', ['stage_id.name', 'not ilike', '%Done%'],
                    '&', ['stage_id.name', 'not ilike', '%Cancel%'],
                         ['stage_id.name', 'not ilike', '%Hold%']];
            }
            const timerContext = this.state.activeTimerContext;
            const activeId = this.state.activeTimerId && (!timerContext || (
                timerContext.model === model &&
                timerContext.host === this.state.currentHost &&
                timerContext.database === this.state.currentDatabase
            )) ? this.state.activeTimerId : null;
            const domain = activeId ? ['|', ['id', '=', activeId], ...openDomain] : openDomain;

            const baseFields   = ['id','name','user_id','project_id','company_id','stage_id','priority','create_date','analytic_account_id','account_id'];
            const extraByModel = {
                [DATA_SOURCE_ISSUE]: ['working_hours_open','message_summary','message_unread','description'],
                [DATA_SOURCE_TASK]:  ['effective_hours','remaining_hours','code','description','display_name'],
                [DATA_SOURCE_HELPDESK]: [
                    'display_name', 'description', 'partner_id',
                    capabilities.assignmentField, capabilities.projectField,
                    capabilities.companyField, capabilities.teamField, capabilities.descriptionField,
                    capabilities.therpLinkField, capabilities.analyticAccountField,
                    capabilities.stageField, capabilities.timeEnabledField,
                    capabilities.hoursField, capabilities.ticketReferenceField,
                    capabilities.closedField, capabilities.activeField,
                ].filter(Boolean),
            };
            const desiredFields = [...new Set([...baseFields, ...(extraByModel[model] || [])])];

            let fields = availableFields
                ? desiredFields.filter((f) => Object.prototype.hasOwnProperty.call(availableFields, f))
                : desiredFields.filter((f) => f !== 'message_summary' && f !== 'message_unread');

            if (model === DATA_SOURCE_TASK) fields = fields.filter((f) => f !== 'message_summary' && f !== 'message_unread');

            const result = await this.searchReadWithInvalidFieldRetry(model, domain, fields);
            const records = result.records || [];

            let stageSeqMap = new Map();
            const stageModel = model === DATA_SOURCE_TASK ? 'project.task.type' : capabilities.stageModel;
            if (stageModel) {
                const stageIds = [...new Set(records.map((r) => r.stage_id?.[0]).filter(Boolean))];
                if (stageIds.length) {
                    const stageFields = await this.getSupportedFieldsForModel(stageModel);
                    if (stageFields?.sequence) {
                        const stages = await this.rpc.searchRead(stageModel, [['id','in',stageIds]], ['id','sequence']);
                        stageSeqMap = new Map((stages.records || []).map((s) => [s.id, Number(s.sequence || 0)]));
                    }
                }
            }

            let preparedRecords = records.map((issue) => ({
                ...issue,
                message_summary: extractMessageSummary(
                    issue.message_summary || issue.description || issue.display_name || issue.name || ''
                ),
                priority_level: priorityStars(issue.priority),
                stage_sequence: stageSeqMap.get(issue.stage_id?.[0]) ?? 9999,
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

    async refreshAll() {
        this.resetSupportedFieldCache();
        // Show spinner on the refresh icon while loading
        const refreshIcon = document.querySelector('.fa-refresh');
        if (refreshIcon) {
            refreshIcon.classList.remove('fa-refresh');
            refreshIcon.classList.add('fa-cog', 'fa-spin');
        }
        try {
            await this.loadProjects();
            await this.loadIssues();
        } catch (err) {
            await notify(err.message || 'Failed to refresh items.');
        } finally {
            const spinIcon = document.querySelector('.fa-spin.fa-cog');
            if (spinIcon && spinIcon.title && spinIcon.title.includes('Refresh')) {
                spinIcon.classList.remove('fa-cog', 'fa-spin');
                spinIcon.classList.add('fa-refresh');
            }
            // Re-query since DOM may have re-rendered
            document.querySelectorAll('.fa-cog.fa-spin').forEach((el) => {
                if (el.closest('.footer-btns')) {
                    el.classList.remove('fa-cog', 'fa-spin');
                    el.classList.add('fa-refresh');
                }
            });
        }
    }

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
        this.state.activeTimerId  = issue.id;
        this.state.timerStartIso  = now;
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
        const taskLabel = `#${issue.id} – ${(issue.name || '').slice(0, 60)}`;
        await sendTimerStateToBackground(true, taskLabel);
    }

    resolveAnalyticAccount(issue) {
        if (issue.analytic_account_id) return issue.analytic_account_id;
        if (issue.account_id) return issue.account_id;
        const project = this.state.projects.find((p) => p.id === issue.project_id?.[0]);
        return project?.account_id || project?.analytic_account_id;
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
        if (projectId && Object.prototype.hasOwnProperty.call(lineFields, 'project_id')) values.project_id = projectId;
        if (analyticAccountId && Object.prototype.hasOwnProperty.call(lineFields, 'account_id')) values.account_id = analyticAccountId;
        if (companyId && Object.prototype.hasOwnProperty.call(lineFields, 'company_id')) values.company_id = companyId;

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
            // promptDialog returns null when the user clicks "close" / cancels.
            // Treat null as a cancellation — do NOT record time.
            const promptTitle = this.isHelpdeskSource
                ? `Timesheet Description for Ticket #${issue.id}`
                : `${this.itemLabelSingular.charAt(0).toUpperCase()}${this.itemLabelSingular.slice(1)} #${issue.id} Description`;
            const descResult = await promptDialog(promptTitle, issue.name);
            if (descResult === null) return;   // user cancelled — nothing recorded
            const issueDescription = descResult || '';

            const startIso = this.state.timerStartIso || (await storage.get(STORAGE_KEYS.timerStartIso, null));
            if (!startIso) throw new Error('No start time found for the active timer.');

            const now             = new Date();
            const durationMinutes = Math.max(0, (now.getTime() - new Date(startIso).getTime()) / 60000);
            const roundedMinutes  = Math.round((durationMinutes % 60) / 15) * 15;
            const durationInHours = Math.floor(durationMinutes / 60) + roundedMinutes / 60;
            const analyticAccount = this.resolveAnalyticAccount(issue);
            if (!analyticAccount && this.state.dataSource !== DATA_SOURCE_HELPDESK) {
                throw new Error('No analytic account is defined on the project.');
            }
            if (this.state.dataSource === DATA_SOURCE_HELPDESK && !analyticAccount && !issue.project_id) {
                throw new Error('This ticket has no timesheet project or analytic account. Configure one on its Helpdesk team/project first.');
            }

            const issueName     = issueDescription.trim() || `${issue.name} (#${issue.id})`;
            const formattedDate = now.toISOString().slice(0, 10);
            const payload = { issue, issueName, analyticAccount, durationInHours, date: formattedDate };

            if (this.state.dataSource === DATA_SOURCE_ISSUE) await this.createIssueTimesheet(payload);
            else if (this.state.dataSource === DATA_SOURCE_HELPDESK) await this.createHelpdeskTimesheet(payload);
            else await this.createTaskTimesheet(payload);

            await notify(`Time for ${this.itemLabelSingular} #${issue.id} was successfully recorded in Odoo timesheets.`);

            if (this.state.autoDownloadIssueTimesheet) await this.downloadCurrentIssueTimesheet(issue);

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
            await notify(err.message || `Could not stop the ${this.itemLabelSingular} timer.`);
        }
    }

    async resetTimer() {
        if (!this.state.activeTimerId) return;
        const ok = await confirmDialog(`Discard the running ${this.itemLabelSingular} timer without saving to Odoo?`);
        if (!ok) return;
        this.state.activeTimerId = null;
        this.state.timerStartIso = null;
        this.state.activeTimerContext = null;
        await storage.remove(STORAGE_KEYS.timerStartIso);
        await storage.remove(STORAGE_KEYS.activeTimerId);
        await storage.remove(STORAGE_KEYS.activeTimerContext);
        await sendTimerStateToBackground(false);
        await this.loadIssues();
    }

    async downloadCurrentMonthTimesheets() {
        try {
            if (!this.state.user?.id) throw new Error('Login first.');
            const today    = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
            const now      = today.toISOString().slice(0, 10);
            const binding = timesheetBinding(this.state.dataSource, this.state.sourceCapabilities);
            if (!binding) throw new Error(helpdeskTimesheetUnavailableMessage());
            const domain = [
                ['user_id', '=', this.state.user.id],
                ['date', '>=', firstDay],
                ['date', '<=', now],
            ];
            if (this.state.dataSource === DATA_SOURCE_HELPDESK) domain.push([binding.linkField, '!=', false]);
            const result = await this.rpc.searchRead(binding.model, domain, []);
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
        const binding = timesheetBinding(this.state.dataSource, this.state.sourceCapabilities);
        if (!binding) throw new Error(helpdeskTimesheetUnavailableMessage());
        const result = await this.rpc.searchRead(binding.model, [
            ['user_id', '=', this.state.user.id],
            ['date', '>=', firstDay],
            ['date', '<=', now],
            [binding.linkField, '=', issue.id],
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
        this.resetSupportedFieldCache();
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

    /** Open the task timesheets window for a specific task. */
    openTimesheets(issue) {
        const taskName = this.issueLabel(issue) || `#${issue.id}`;
        window.electronAPI?.openTimesheets?.(issue.id, taskName);
    }

    /** Open the internal logs viewer window. */
    openLogs() {
        window.electronAPI?.logs?.openWindow?.();
    }

    async logout() {
        if (this.state.activeTimerId) {
            await notify(`Please stop timer for ${this.itemLabelSingular} #${this.state.activeTimerId} before logging out.`);
            return;
        }
        const ok = await confirmDialog('Are you sure you want to logout?');
        if (!ok) return;

        try { await this.rpc.logout(); } catch {}
        await clearOdooSessionCookies(this.state.currentHost);
        await storage.remove(this.state.currentDatabase);
        await storage.set(STORAGE_KEYS.currentHostState, 'Inactive');
        Object.assign(this.state, {
            user: null, issues: [], projects: [], currentCompanyId: null, allowedCompanyIds: [], availableCompanyIds: [], currentUserId: null, companyNames: {},
            view: VIEW_LOGIN, useExistingSession: true,
        });
    }

    /**
     * Background message poll.
     * Directly queries Odoo for latest message_ids on all visible tasks and
     * updates the unread badge in the popup toolbar, even when the Messages
     * window is closed.
     */
    async _backgroundMsgPoll() {
        try {
            if (!this.state.currentHost || !this.state.user?.id) return;
            if (this.state.dataSource !== DATA_SOURCE_TASK) return;
            if (!this.state.issues.length) return;

            // Only poll tasks ASSIGNED to the current user.
            // Follower-task unread counts are handled by messages-app.js (which has
            // the follower list) and stored in msg_total_unread when that window is open.
            // This prevents the badge from ballooning to 99+ by counting all team tasks.
            const myTasks = this.state.issues.filter(
                (t) => t.user_id?.[0] === this.state.user.id
            );
            if (!myTasks.length) return;

            const ids = myTasks.map((task) => task.id);
            const result = await this.rpc.searchRead(
                this.state.dataSource,
                [['id', 'in', ids]],
                ['id', 'message_ids'],
                { limit: 200 }
            );
            const freshMap = Object.fromEntries(
                (result.records || []).map((record) => [record.id, (record.message_ids || []).slice(0, 10)])
            );

            let totalUnread = 0;
            for (const task of myTasks) {
                const freshIds = freshMap[task.id] || [];
                const seenRaw  = await storage.get(`msg_seen_${task.id}`, []);
                const seenSet  = new Set(Array.isArray(seenRaw) ? seenRaw : []);
                const unread   = freshIds.filter((id) => !seenSet.has(id)).length;
                totalUnread   += unread;
            }

            // Only write if the messages window isn't already managing this value.
            // The messages window (when open) sets a more accurate total that includes
            // follower tasks — don't overwrite it with the narrower assigned-only count.
            const existing = Number(await storage.get('msg_total_unread', 0)) || 0;
            const finalTotal = Math.max(totalUnread, existing);
            await storage.set('msg_total_unread', finalTotal);
            if (finalTotal !== this.state.msgUnreadTotal) {
                this.state.msgUnreadTotal = finalTotal;
            }
        } catch (err) {
            // Non-critical — silently skip on error
            console.debug('[PopupApp] Background poll skipped:', err.message);
        }
    }
}

// ─── Mount ────────────────────────────────────────────────────────────────────

// Use the compiled XML templates from templates.js (loaded by popup.html).
// popup_app.xml + readmore.xml → compiled into globalThis.__THERP_TIMER_TEMPLATES__
const compiledTemplates = globalThis.__THERP_TIMER_TEMPLATES__ || {};
const templates = {
    ReadMore: compiledTemplates.ReadMore || createReadMoreTemplate,
    PopupApp: compiledTemplates.PopupApp,
};

try {
    if (!templates.PopupApp) throw new Error('PopupApp template missing — run: bash scripts/compile-templates.sh');
    mount(PopupApp, document.getElementById('app'), { dev: false, templates });
} catch (err) {
    console.error('[PopupApp] Mount failed:', err);
    const bootLoader = document.getElementById('boot-loader');
    if (bootLoader) bootLoader.classList.add('hide');
    const appRoot = document.getElementById('app');
    if (appRoot) {
        appRoot.innerHTML = `<div class="container no-remotes-set"><div class="alert alert-danger"><b>Startup error:</b> ${String(err?.message || err).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>`;
    }
}
