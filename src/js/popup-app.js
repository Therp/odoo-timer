
import {
  OdooRpc, storage, readRemotes, writeRemotes,
  sendTimerStateToBackground, clearOdooSessionCookies, toCSV, downloadTextFile,
  formatDuration, formatHoursMins, priorityStars, matchesIssue, extractMessageSummary
} from './common.js';

const { Component, mount, useState, onMounted, onWillUnmount, __info__ } = owl;
let owl_info = JSON.stringify(__info__, null, 2)
console.log(owl_info);

function ReadMoreTemplate(app, bdom, helpers) {
  const { text, createBlock } = bdom;
  const linkBlock = createBlock(`<a block-attribute-0="href" class="remote-link" target="_blank" rel="noreferrer"><block-text-1/></a>`);
  const wrapBlock = createBlock(`<span class="readmore-inline"><block-child-0/><block-child-1/></span>`);
  const toggleBlock = createBlock(`<a href="#" class="hmMoreClass" block-handler-0="click"><block-text-1/></a>`);
  return function template(ctx, node, key = "") {
    const display = ctx.state.expanded || !ctx.needsTrim ? (ctx.props.text || '') : ctx.shortText;
    const content = ctx.props.href ? linkBlock([ctx.props.href, display]) : text(display);
    let toggle = null;
    if (ctx.needsTrim) {
      const h = ["prevent", ctx.toggle, ctx];
      toggle = toggleBlock([h, ctx.state.expanded ? ' ▲' : ' ...']);
    }
    return wrapBlock([], [content, toggle]);
  };
}

class ReadMore extends Component {
  static props = ['text', 'limit?', 'href?', 'title?'];
  static template = 'ReadMore';
  setup() { this.state = useState({ expanded: false }); }
  get needsTrim() { return (this.props.text || '').length > (this.props.limit || 40); }
  get shortText() { return (this.props.text || '').slice(0, this.props.limit || 40); }
  toggle() { this.state.expanded = !this.state.expanded; }
}

function PopupAppTemplate(app, bdom, helpers) {
  let { text, createBlock, list } = bdom;
  let { prepareList, OwlError, withKey } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit","href"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp6 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);

  let block1 = createBlock(`<div class="app-root"><div id="loader-container" block-attribute-0="class"><i class="fa fa-cog fa-spin fa-5x"/></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="/img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options</a></div></div><div id="wrapper" block-attribute-2="class"><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search for Issue by ID, Name, user, priority, Stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on a specific issue"><input id="auto_download_timesheet_input" type="checkbox" block-property-7="checked" block-handler-8="change"/> Auto Download Issue Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-9="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-10="click"/><i class="fa fa-refresh fa-2x" title="Refresh employee issues" block-handler-11="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-12="click"/><a href="options_main_page.html" class="options-btn" title="Go To options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table class="table table-responsive-sm table-bordered table-fixed" id="table-task-issues"><thead><tr><th><div><block-child-3/></div><block-child-4/></th><th>Edit Desc</th><th>Create Date</th><th>Priority</th><th>Stage</th><th><block-text-13/> [<block-text-14/>] <span class="allIssues"><input id="showAllIssues" type="checkbox" block-property-15="checked" block-handler-16="input"/> Show for Everyone</span></th><block-child-5/><block-child-6/><th>Project</th></tr></thead><tbody><block-child-7/><block-child-8/></tbody></table></div><div class="container footer info-footer"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <block-text-17/></span><br/><span><b>Host:</b> <block-text-18/></span><br/><span><b>Database:</b> <block-text-19/></span><br/><span><b>Current User:</b> <block-text-20/></span><br/></div></div></div></div></div>`);
  let block2 = createBlock(`<div><p class="odooError"><block-text-0/></p></div>`);
  let block3 = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning">Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below and add one.</div></div>`);
  let block4 = createBlock(`<form block-handler-0="submit.prevent"><block-child-0/><block-child-1/><div class="password-field"><block-child-2/><block-child-3/></div><select id="remote-selection" class="form-control" block-handler-1="change"><block-child-4/></select><div class="checkbox"><label><input type="checkbox" block-property-2="checked" block-handler-3="change"/> Use Existing Session</label></div><button class="login" type="submit">Login <block-child-5/></button><block-child-6/></form>`);
  let block5 = createBlock(`<p class="odooError"><block-text-0/></p>`);
  let block6 = createBlock(`<input type="text" placeholder="Username" block-property-0="value" block-handler-1="input"/>`);
  let block7 = createBlock(`<input block-attribute-0="type" id="unique-password" placeholder="Password" block-property-1="value" block-handler-2="input"/>`);
  let block8 = createBlock(`<span class="pass-viewer" block-handler-0="click"><i class="fa" block-attribute-1="class"/></span>`);
  let block10 = createBlock(`<option block-attribute-0="value" block-attribute-1="selected"><block-text-2/></option>`);
  let block11 = createBlock(`<i class="fa fa-cog fa-spin"/>`);
  let block12 = createBlock(`<div class="remote-info small-note">Host: <block-text-0/> <span class="current-source-chip"><block-text-1/></span></div>`);
  let block13 = createBlock(`<span class="active-timer-running"><i class="fa fa-clock-o"/> #<block-text-0/></span>`);
  let block14 = createBlock(`<span class="startTimeCount"><block-text-0/></span>`);
  let block15 = createBlock(`<th>Hours Spent</th>`);
  let block16 = createBlock(`<th>Remaining Hours</th>`);
  let block18 = createBlock(`<tr block-attribute-0="class"><td class="text-center px-3 td-btn"><block-child-0/><block-child-1/></td><td class="text-center"><input type="checkbox" block-property-1="checked" block-handler-2="change"/></td><td><block-child-2/></td><td><block-child-3/><block-child-3/><block-child-4/></td><td class="issue-desc-cell"><block-child-5/></td><td class="issue-desc-cell"><block-child-6/></td><block-child-7/><block-child-8/><td><block-child-9/></td></tr>`);
  let block19 = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected issue" block-handler-0="click"/>`);
  let block20 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
  let block23 = createBlock(`<span class="fa fa-star checked"/>`);
  let block24 = createBlock(`<i class="fa fa-star-o"/>`);
  let block27 = createBlock(`<td><block-child-0/></td>`);
  let block29 = createBlock(`<td><block-child-0/></td>`);
  let block32 = createBlock(`<tr><td block-attribute-0="colspan" class="text-center text-danger">No issues available currently assigned to you</td></tr>`);

  return function template(ctx, node, key = "") {
    let b2, b3, b4, b13, b14, b15, b16, b17, b32;
    let attr1 = ctx['state'].view==='loading'?'':'hide';
    let attr2 = ctx['state'].view==='login'?'':'hide';
    if (ctx['state'].bootError) {
      let txt1 = ctx['state'].bootError;
      b2 = block2([txt1]);
    }
    if (!ctx['state'].remotes.length) {
      b3 = block3();
    }
    if (ctx['state'].remotes.length) {
      let b5, b6, b7, b8, b9, b11, b12;
      let hdlr1 = ["prevent", ctx['login'], ctx];
      if (ctx['state'].loginError) {
        let txt2 = ctx['state'].loginError;
        b5 = block5([txt2]);
      }
      if (!ctx['state'].useExistingSession) {
        const bExpr1 = ctx['state'];
        const expr1 = 'username';
        let prop1 = bExpr1[expr1];
        let hdlr2 = [(ev) => { bExpr1[expr1] = ev.target.value; }];
        b6 = block6([prop1, hdlr2]);
      }
      if (!ctx['state'].useExistingSession) {
        let attr3 = ctx['state'].showPassword?'text':'password';
        const bExpr2 = ctx['state'];
        const expr2 = 'password';
        let prop2 = bExpr2[expr2];
        let hdlr3 = [(ev) => { bExpr2[expr2] = ev.target.value; }];
        b7 = block7([attr3, prop2, hdlr3]);
      }
      if (!ctx['state'].useExistingSession) {
        let hdlr4 = [ctx['togglePassword'], ctx];
        let attr4 = ctx['state'].showPassword?'fa-eye-slash':'fa-eye';
        b8 = block8([hdlr4, attr4]);
      }
      const bExpr3 = ctx['state'];
      const expr3 = 'selectedRemoteIndex';
      const bValue1 = bExpr3[expr3];
      let hdlr5 = [(ev) => { bExpr3[expr3] = ev.target.value; }];
      ctx = Object.create(ctx);
      const [k_block9, v_block9, l_block9, c_block9] = prepareList(ctx['state'].remotes);
      const keys9 = new Set();
      for (let i1 = 0; i1 < l_block9; i1++) {
        ctx[`remote`] = k_block9[i1];
        const key1 = ctx['remote'].database+ctx['remote'].url;
        if (keys9.has(String(key1))) { throw new OwlError(`Got duplicate key in t-foreach: ${key1}`)}
        keys9.add(String(key1));
        let attr5 = String(ctx['remote'].__index);
        let attr6 = bValue1 === String(ctx['remote'].__index);
        let txt3 = ctx['remote'].name;
        c_block9[i1] = withKey(block10([attr5, attr6, txt3]), key1);
      }
      ctx = ctx.__proto__;
      b9 = list(c_block9);
      let prop3 = (ctx['state'].useExistingSession);
      let hdlr6 = [ctx['toggleUseExistingSession'], ctx];
      if (ctx['state'].loginLoading) {
        b11 = block11();
      }
      if (ctx['currentRemote']) {
        let txt4 = ctx['currentRemote'].url;
        let txt5 = ctx['currentRemote'].datasrc||'project.issue';
        b12 = block12([txt4, txt5]);
      }
      b4 = block4([hdlr1, hdlr5, prop3, hdlr6], [b5, b6, b7, b8, b9, b11, b12]);
    }
    let attr7 = ctx['state'].view==='main'?'':'hide';
    const bExpr4 = ctx['state'];
    const expr4 = 'searchQuery';
    let prop4 = bExpr4[expr4];
    let hdlr7 = [(ev) => { bExpr4[expr4] = ev.target.value; }];
    const bExpr5 = ctx['state'];
    const expr5 = 'limitTo';
    let prop5 = bExpr5[expr5];
    let hdlr8 = [(ev) => { bExpr5[expr5] = ev.target.value; }];
    let prop6 = (ctx['state'].autoDownloadIssueTimesheet);
    let hdlr9 = [ctx['toggleAutoDownload'], ctx];
    let hdlr10 = [ctx['downloadCurrentMonthTimesheets'], ctx];
    let hdlr11 = [ctx['switchBetweenRemotes'], ctx];
    let hdlr12 = [ctx['refreshAll'], ctx];
    let hdlr13 = [ctx['logout'], ctx];
    if (ctx['state'].activeTimerId && ctx['state'].timerStartIso) {
      let txt6 = ctx['state'].activeTimerId;
      b13 = block13([txt6]);
    }
    if (ctx['state'].timerStartIso) {
      let txt7 = ctx['formattedTimer'];
      b14 = block14([txt7]);
    }
    let txt8 = ctx['state'].dataSource==='project.task'?'Tasks':'Issues';
    let txt9 = ctx['filteredIssues'].length;
    const bExpr6 = ctx['state'];
    const expr6 = 'allIssues';
    let prop7 = bExpr6[expr6];
    let hdlr14 = [(ev) => { bExpr6[expr6] = ev.target.checked; }];
    if (ctx['state'].dataSource==='project.task') {
      b15 = block15();
    }
    if (ctx['state'].dataSource==='project.task') {
      b16 = block16();
    }
    ctx = Object.create(ctx);
    const [k_block17, v_block17, l_block17, c_block17] = prepareList(ctx['filteredIssues']);
    const keys17 = new Set();
    for (let i1 = 0; i1 < l_block17; i1++) {
      ctx[`issue`] = k_block17[i1];
      const key1 = ctx['issue'].id;
      if (keys17.has(String(key1))) { throw new OwlError(`Got duplicate key in t-foreach: ${key1}`)}
      keys17.add(String(key1));
      let b19, b20, b21, b22, b24, b25, b26, b27, b29, b31;
      let attr8 = ctx['state'].activeTimerId===ctx['issue'].id?'active-row':'';
      if (!ctx['state'].activeTimerId) {
        const v1 = ctx['startTimer'];
        const v2 = ctx['issue'];
        let hdlr15 = [()=>v1(v2), ctx];
        b19 = block19([hdlr15]);
      }
      if (ctx['state'].activeTimerId===ctx['issue'].id) {
        const v3 = ctx['stopTimer'];
        const v4 = ctx['issue'];
        let hdlr16 = [()=>v3(v4), ctx];
        b20 = block20([hdlr16]);
      }
      let prop8 = (ctx['issue'].editDesc);
      const v5 = ctx['onToggleEditDesc'];
      const v6 = ctx['issue'];
      let hdlr17 = [(_ev)=>v5(v6,_ev), ctx];
      const props1 = {text: ctx['issue'].create_date?ctx['issue'].create_date.split(' ')[0]:'',limit: 20};
      b21 = comp1(props1, key + `__1__${key1}`, node, this, null);
      if (ctx['issue'].priority_level.length) {
        ctx = Object.create(ctx);
        const [k_block22, v_block22, l_block22, c_block22] = prepareList(ctx['issue'].priority_level);
        const keys22 = new Set();
        for (let i2 = 0; i2 < l_block22; i2++) {
          ctx[`p`] = k_block22[i2];
          const key2 = ctx['p'];
          if (keys22.has(String(key2))) { throw new OwlError(`Got duplicate key in t-foreach: ${key2}`)}
          keys22.add(String(key2));
          c_block22[i2] = withKey(block23(), key2 + '_' + i2);
        }
        ctx = ctx.__proto__;
        b22 = list(c_block22);
      }
      if (!ctx['issue'].priority_level.length) {
        b24 = block24();
      }
      const props2 = {text: ctx['issue'].stage_id?ctx['issue'].stage_id[1]:'',limit: 15};
      b25 = comp2(props2, key + `__2__${key1}`, node, this, null);
      const props3 = {text: ctx['issueLabel'](ctx['issue']),limit: 70,href: ctx['issueHref'](ctx['issue'])};
      b26 = comp3(props3, key + `__3__${key1}`, node, this, null);
      if (ctx['state'].dataSource==='project.task') {
        const props4 = {text: ctx['formatHours'](ctx['issue'].effective_hours),limit: 9};
        const b28 = comp4(props4, key + `__4__${key1}`, node, this, null);
        b27 = block27([], [b28]);
      }
      if (ctx['state'].dataSource==='project.task') {
        const props5 = {text: ctx['formatHours'](ctx['issue'].remaining_hours),limit: 9};
        const b30 = comp5(props5, key + `__5__${key1}`, node, this, null);
        b29 = block29([], [b30]);
      }
      const props6 = {text: ctx['issue'].project_id?ctx['issue'].project_id[1]:'',limit: 15};
      b31 = comp6(props6, key + `__6__${key1}`, node, this, null);
      c_block17[i1] = withKey(block18([attr8, prop8, hdlr17], [b19, b20, b21, b22, b24, b25, b26, b27, b29, b31]), key1);
    }
    ctx = ctx.__proto__;
    b17 = list(c_block17);
    if (!ctx['filteredIssues'].length) {
      let attr9 = ctx['state'].dataSource==='project.task'?9:7;
      b32 = block32([attr9]);
    }
    let txt10 = ctx['state'].serverVersion||'Unknown';
    let txt11 = ctx['state'].currentHost||'-';
    let txt12 = ctx['state'].currentDatabase||'-';
    let txt13 = ctx['state'].user?ctx['state'].user.display_name:'-';
    return block1([attr1, attr2, attr7, prop4, hdlr7, prop5, hdlr8, prop6, hdlr9, hdlr10, hdlr11, hdlr12, hdlr13, txt8, txt9, prop7, hdlr14, txt10, txt11, txt12, txt13], [b2, b3, b4, b13, b14, b15, b16, b17, b32]);
  }
}

class PopupApp extends Component {
  static components = { ReadMore };
  static template = 'PopupApp';

  setup() {
    this.rpc = new OdooRpc();
    this.state = useState({
      view: 'loading',
      remotes: [],
      selectedRemoteIndex: '0',
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
      limitTo: '5',
      allIssues: false,
      autoDownloadIssueTimesheet: false,
      activeTimerId: null,
      timerStartIso: null,
      timerNow: Date.now(),
      currentHost: '',
      currentDatabase: '',
      dataSource: 'project.issue',
      serverVersion: '',
      supportedFields: {},
      busyMessage: 'Loading…',
      loadingTable: false,
    });

    this._timerHandle = null;
    this.startTimer = this.startTimer.bind(this);
    this.stopTimer = this.stopTimer.bind(this);
    this.refreshAll = this.refreshAll.bind(this);
    this.downloadCurrentMonthTimesheets = this.downloadCurrentMonthTimesheets.bind(this);
    this.switchBetweenRemotes = this.switchBetweenRemotes.bind(this);
    this.logout = this.logout.bind(this);
    this.toggleAutoDownload = this.toggleAutoDownload.bind(this);
    this.toggleUseExistingSession = this.toggleUseExistingSession.bind(this);
    this.togglePassword = this.togglePassword.bind(this);
    this.onToggleEditDesc = this.onToggleEditDesc.bind(this);

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
      if (this._timerHandle) clearInterval(this._timerHandle);
    });
  }

  async bootstrapWithTimeout() {
    this.state.view = 'loading';
    this.state.bootError = '';
    this.state.busyMessage = 'Loading…';

    try {
      await this.bootstrap();
    } catch (err) {
      console.warn('Bootstrap fallback:', err);
      this.state.bootError = err.message || 'Startup took too long. Please log in manually.';
      this.state.view = 'login';
    }
  }

  get currentRemote() {
    const idx = Number(this.state.selectedRemoteIndex || 0);
    return this.state.remotes[idx] || null;
  }
  get formattedTimer() {
    if (!this.state.timerStartIso) return '00:00:00';
    return formatDuration(this.state.timerNow - new Date(this.state.timerStartIso).getTime());
  }
  get filteredIssues() {
    const limit = this.state.limitTo ? Number(this.state.limitTo) : null;
    let issues = [...this.state.issues];
    issues.sort((a, b) => {
      if (a.id === this.state.activeTimerId) return -1;
      if (b.id === this.state.activeTimerId) return 1;
      return a.id - b.id;
    });
    if (!this.state.allIssues && this.state.user?.id) {
      issues = issues.filter((issue) => issue.id === this.state.activeTimerId || issue.user_id?.[0] === this.state.user.id);
    }
    issues = issues.filter((issue) => matchesIssue(issue, this.state.searchQuery));
    return limit ? issues.slice(0, limit) : issues;
  }

  async bootstrap() {
    this.state.busyMessage = 'Loading…';

    try {
      await storage.remove('users_issues');
    } catch (err) {
      console.warn('Could not clear legacy users_issues cache', err);
    }

    this.state.remotes = (await readRemotes()).map((r, idx) => ({ ...r, __index: idx }));

    const [
      useExisting,
      autoDownloadIssueTimesheet,
      timerStartIso,
      activeTimerIdRaw,
      currentHost,
      currentDb,
      currentSrc,
    ] = await Promise.all([
      storage.get('useExistingSession', true),
      storage.get('auto_download_issue_timesheet', false),
      storage.get('start_date_time', null),
      storage.get('active_timer_id', null),
      storage.get('current_host', ''),
      storage.get('current_host_db', ''),
      storage.get('current_host_datasrc', 'project.issue'),
    ]);

    this.state.useExistingSession = !!useExisting;
    this.state.autoDownloadIssueTimesheet = !!autoDownloadIssueTimesheet;
    this.state.timerStartIso = timerStartIso;
    this.state.activeTimerId = activeTimerIdRaw ? Number(activeTimerIdRaw) : null;
    this.state.currentHost = currentHost || '';
    this.state.currentDatabase = currentDb || '';
    this.state.dataSource = currentSrc || 'project.issue';

    if (currentHost) {
      this.rpc.setHost(currentHost);

      const idx = this.state.remotes.findIndex(
        (r) => r.url === currentHost && r.database === currentDb
      );
      if (idx >= 0) {
        this.state.selectedRemoteIndex = String(idx);
      }

      try {
        this.state.busyMessage = 'Restoring session…';

        const session = await Promise.race([
          this.rpc.getSessionInfo(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session restore timed out')), 4000)
          ),
        ]);

        if (session?.uid) {
          await this.completeSession(session, this.state.remotes[idx] || null);
          return;
        }
      } catch (err) {
        console.warn('Session bootstrap failed', err);
        this.state.bootError = err.message || '';
      }
    }

    this.state.view = 'login';
  }

  togglePassword() { this.state.showPassword = !this.state.showPassword; }
  onToggleEditDesc(issue, ev) { issue.editDesc = ev.target.checked; }

  toggleUseExistingSession(ev) {
    this.state.useExistingSession = ev.target.checked;
    storage.set('useExistingSession', !!this.state.useExistingSession);
  }

  toggleAutoDownload(ev) {
    this.state.autoDownloadIssueTimesheet = ev.target.checked;
    storage.set('auto_download_issue_timesheet', !!this.state.autoDownloadIssueTimesheet);
  }

  issueHref(issue) {
    if (!this.state.currentHost || !issue?.id) return null;
    const model = this.state.dataSource;
    return `${this.state.currentHost}/web#id=${issue.id}&model=${model}&view_type=form`;
  }
  issueLabel(issue) {
    const base = this.state.dataSource === 'project.task' ? `${issue.code || issue.id}-${issue.name}` : `${issue.id}-${issue.name}`;
    return base;
    //return issue.message_summary ? `${base} ----> (${issue.message_summary})` : base;
  }
  formatHours(v) { return formatHoursMins(v); }

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
    this.state.dataSource = remote.datasrc || 'project.issue';
    await storage.set('current_host', remote.url);
    await storage.set('current_host_db', remote.database);
    await storage.set('current_host_datasrc', this.state.dataSource);
    try {
      let session;
      if (this.state.useExistingSession) {
        session = await this.rpc.getSessionInfo();
        if (!session?.uid) throw new Error('No active Odoo session found for this remote. Turn off "Use Existing Session" to log in manually.');
      } else {
        if (!this.state.username || !this.state.password) throw new Error('Username or password is missing');
        session = await this.rpc.login(remote.database, this.state.username, this.state.password);
      }
      await this.completeSession(session, remote);
      this.state.username = '';
      this.state.password = '';
    } catch (err) {
      console.error(err);
      this.state.loginError = err.message || 'Login failed';
      this.state.view = 'login';
    } finally {
      this.state.loginLoading = false;
    }
  }

  async completeSession(sessionInfo, remote) {
    this.state.busyMessage = 'Loading tasks…';
    this.state.loadingTable = true;

    const remoteInfo = remote || this.currentRemote || null;

    this.state.currentDatabase = sessionInfo.db || remoteInfo?.database || this.state.currentDatabase;
    this.state.currentHost = remoteInfo?.url || sessionInfo['web.base.url'] || this.state.currentHost;
    this.state.dataSource = remoteInfo?.datasrc || this.state.dataSource || 'project.issue';

    try {
      await storage.set(this.state.currentDatabase, JSON.stringify(sessionInfo));
    } catch (err) {
      console.warn('Could not persist session snapshot', err);
    }

    await storage.set('current_host_state', 'Active');

    if (remoteInfo) {
      const remotes = await readRemotes();
      const updated = remotes.map((r) =>
        (r.url === remoteInfo.url && r.database === remoteInfo.database)
          ? { ...r, state: 'Active' }
          : r
      );
      await writeRemotes(updated);
      this.state.remotes = updated.map((r, idx) => ({ ...r, __index: idx }));
    }

    const userPromise = this.rpc
      .searchRead('res.users', [['id', '=', sessionInfo.uid]], ['display_name'])
      .catch((err) => {
        console.warn('Could not read current user', err);
        return { records: [] };
      });

    const serverInfoPromise = this.rpc.getServerInfo().catch((err) => {
      console.warn('Could not read version info', err);
      return null;
    });

    try {
      const [userResult, serverInfo] = await Promise.all([
        userPromise,
        serverInfoPromise,
        this.loadProjects(),
        this.loadIssues(),
      ]);

      this.state.user =
        userResult.records?.[0] ||
        { id: sessionInfo.uid, display_name: sessionInfo.username || 'Unknown' };

      if (serverInfo) {
        this.state.serverVersion = serverInfo.server_version || '';
        try {
          await storage.set('server_version_info', JSON.stringify(serverInfo));
        } catch (err) {
          console.warn('Could not cache version info', err);
        }
      }

      this.state.view = 'main';
    } finally {
      this.state.loadingTable = false;
    }
  }

  async loadProjects() {
    const res = await this.rpc.searchRead('project.project', [], ['analytic_account_id']);
    this.state.projects = res.records || [];
  }

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
        ['stage_id.name', 'not ilike', '%Hold%']
      ];

      const baseFields = [
        'id',
        'name',
        'user_id',
        'project_id',
        'stage_id',
        'priority',
        'create_date',
        'analytic_account_id'
      ];

      const extraFieldsByModel = {
        'project.issue': ['working_hours_open', 'message_summary', 'message_unread', 'description'],
        'project.task': ['effective_hours', 'remaining_hours', 'code', 'description', 'display_name'],
      };

      const desiredFields = [...baseFields, ...(extraFieldsByModel[model] || [])];

      let available = this.state.supportedFields[model] || null;

      if (!available) {
        try {
          available = await this.rpc.fieldsGet(model, ['type', 'string']);
          this.state.supportedFields[model] = available || {};
        } catch (err) {
          console.warn(`Could not inspect supported fields for ${model}`, err);
        }
      }

      let fields = available
        ? desiredFields.filter((field) => Object.prototype.hasOwnProperty.call(available, field))
        : desiredFields.filter((field) => field !== 'message_summary' && field !== 'message_unread');

      if (model === 'project.task') {
        fields = fields.filter((field) => field !== 'message_summary' && field !== 'message_unread');
      }

      const retryWithoutInvalidField = async (requestedFields) => {
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
          return await retryWithoutInvalidField(narrowedFields);
        }
      };

      const res = await retryWithoutInvalidField(fields);

      this.state.issues = (res.records || []).map((issue) => ({
        ...issue,
        message_summary: extractMessageSummary(
          issue.message_summary || issue.description || issue.display_name || issue.name || ''
        ),
        priority_level: priorityStars(issue.priority),
        editDesc: issue.editDesc ?? true,
      }));
    } finally {
      this.state.loadingTable = false;
    }
  }

  async refreshAll() {
    try {
      await this.loadProjects();
      await this.loadIssues();
    } catch (err) {
      alert(err.message || 'Failed to refresh issues');
    }
  }

  async startTimer(issue) {
    const now = new Date().toISOString();
    this.state.activeTimerId = issue.id;
    this.state.timerStartIso = now;
    await storage.set('start_date_time', now);
    await storage.set('active_timer_id', issue.id);
    await sendTimerStateToBackground(true);
  }

  async stopTimer(issue) {
    try {
      let issueDesc = '';
      if (issue.editDesc) {
        issueDesc = prompt(`#${issue.id} Description`, issue.name) || '';
        if (!issueDesc.trim()) {
          alert('You cannot submit an empty description when Edit Issue Desc is checked.');
          return;
        }
      }
      const startIso = this.state.timerStartIso || await storage.get('start_date_time', null);
      if (!startIso) throw new Error('No start time found for the active timer.');
      const now = new Date();
      const durationMins = Math.max(0, (now.getTime() - new Date(startIso).getTime()) / 60000);
      const mins = Math.round((durationMins % 60) / 15) * 15;
      const durationInHours = Math.floor(durationMins / 60) + mins / 60;

      let analyticAccount = issue.analytic_account_id;
      if (!analyticAccount) {
        const project = this.state.projects.find((p) => p.id === issue.project_id?.[0]);
        analyticAccount = project?.analytic_account_id;
      }
      if (!analyticAccount) throw new Error('No analytic account is defined on the project.');

      const issueName = issueDesc.trim() || `${issue.name} (#${issue.id})`;
      if (this.state.dataSource === 'project.issue') {
        const journalRes = await this.rpc.searchRead('account.analytic.journal', [['name', 'ilike', 'Timesheet']], ['name']);
        const journal = journalRes.records?.[0];
        if (!journal) throw new Error('No Timesheet analytic journal found in Odoo.');
        await this.rpc.call('hr.analytic.timesheet', 'create', [{
          date: `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`,
          user_id: this.state.user.id,
          name: issueName,
          journal_id: journal.id,
          account_id: analyticAccount[0],
          unit_amount: durationInHours,
          to_invoice: 1,
          issue_id: issue.id,
        }], {});
        alert(`Time for issue #${issue.id} was successfully recorded in Odoo timesheets.`);
      } else {
        await this.rpc.call('account.analytic.line', 'create', [{
          date: `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`,
          user_id: this.state.user.id,
          name: issueName,
          account_id: analyticAccount[0],
          unit_amount: durationInHours,
          project_id: issue.project_id?.[0],
          task_id: issue.id,
        }], {});
        alert(`Time for task #${issue.id} was successfully recorded in Odoo timesheets.`);
      }
      if (this.state.autoDownloadIssueTimesheet) {
        await this.downloadCurrentIssueTimesheet(issue);
      }
      this.state.activeTimerId = null;
      this.state.timerStartIso = null;
      await storage.remove('start_date_time');
      await storage.remove('active_timer_id');
      await sendTimerStateToBackground(false);
      await this.loadIssues();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not stop timer and create a timesheet.');
    }
  }

  async downloadCurrentMonthTimesheets() {
    try {
      if (!this.state.user?.id) throw new Error('Login first.');
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const current = new Date().toISOString().slice(0, 10);
      const model = this.state.dataSource === 'project.task' ? 'account.analytic.line' : 'hr.analytic.timesheet';
      const domain = [['user_id', '=', this.state.user.id], ['create_date', '>=', first], ['create_date', '<=', current]];
      const res = await this.rpc.searchRead(model, domain, []);
      const csv = toCSV(res.records || []);
      if (!csv) { alert('No timesheet rows found for this month.'); return; }
      const filename = `Timesheet [${new Date().toGMTString()}].csv`;
      downloadTextFile(filename, csv, 'application/csv;charset=utf-8;');
      alert(`Timesheet for ${this.state.user.display_name} dated ${first} to ${current} has been saved locally as ${filename}.`);
    } catch (err) {
      alert(err.message || 'Could not download current month timesheet.');
    }
  }

  async downloadCurrentIssueTimesheet(issue) {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const current = new Date().toISOString().slice(0, 10);
    const model = this.state.dataSource === 'project.task' ? 'account.analytic.line' : 'hr.analytic.timesheet';
    const keyDomain = this.state.dataSource === 'project.task' ? ['task_id', '=', issue.id] : ['issue_id', '=', issue.id];
    const domain = [['user_id', '=', this.state.user.id], ['create_date', '>=', first], ['create_date', '<=', current], keyDomain];
    const res = await this.rpc.searchRead(model, domain, []);
    const csv = toCSV(res.records || []);
    if (!csv) return;
    const filename = `Timesheet-#${issue.id}-[${new Date().toGMTString()}].csv`;
    downloadTextFile(filename, csv, 'application/csv;charset=utf-8;');
  }

  async switchBetweenRemotes() {
    if (this.state.activeTimerId) {
      alert(`Please stop timer for issue #${this.state.activeTimerId} before switching out of the current session.`);
      return;
    }
    this.state.view = 'login';
    this.state.useExistingSession = true;
    await storage.set('useExistingSession', true);
  }

  async logout() {
    if (this.state.activeTimerId) {
      alert(`Please stop timer for issue #${this.state.activeTimerId} before logging out.`);
      return;
    }
    const ok = confirm('Are you sure you want to logout? Session will be removed and a re-login will be required.');
    if (!ok) return;
    try { await this.rpc.logout(); } catch {}
    await clearOdooSessionCookies(this.state.currentHost);
    await storage.remove(this.state.currentDatabase);
    await storage.set('current_host_state', 'Inactive');
    this.state.user = null;
    this.state.issues = [];
    this.state.projects = [];
    this.state.view = 'login';
    this.state.useExistingSession = true;
  }
}

const templates = { ReadMore: ReadMoreTemplate, PopupApp: PopupAppTemplate };
mount(PopupApp, document.getElementById('app'), { dev: true, templates });
