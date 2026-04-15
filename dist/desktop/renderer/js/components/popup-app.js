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
        this.openTimesheets              = this.openTimesheets.bind(this);
        this.openLogs                    = this.openLogs.bind(this);
        this.toggleRecording             = this.toggleRecording.bind(this);
        this.toggleAutoDownload          = this.toggleAutoDownload.bind(this);
        this.toggleUseExistingSession    = this.toggleUseExistingSession.bind(this);
        this.togglePassword              = this.togglePassword.bind(this);
        this.updateLimitPreference       = this.updateLimitPreference.bind(this);
        this.updateShowAllPreference     = this.updateShowAllPreference.bind(this);

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

    get formattedTimer() {
        if (!this.state.timerStartIso) return '00:00:00';
        return formatDuration(this.state.timerNow - new Date(this.state.timerStartIso).getTime());
    }

    get itemLabelSingular() { return this.state.dataSource === DATA_SOURCE_TASK ? 'task' : 'issue'; }
    get itemLabelPlural()   { return this.state.dataSource === DATA_SOURCE_TASK ? 'Tasks' : 'Issues'; }

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

        this.state.remotes = await readRemotes();

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
            this.state.remotes = updated;
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
            // promptDialog returns null when the user clicks "close" / cancels.
            // Treat null as a cancellation — do NOT record time.
            const descResult = await promptDialog(
                `${this.itemLabelSingular.charAt(0).toUpperCase()}${this.itemLabelSingular.slice(1)} #${issue.id} Description`,
                issue.name
            );
            if (descResult === null) return;   // user cancelled — nothing recorded
            const issueDescription = descResult || '';

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
            user: null, issues: [], projects: [], view: VIEW_LOGIN, useExistingSession: true,
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
