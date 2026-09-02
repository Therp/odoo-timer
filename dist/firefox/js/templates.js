export const templates = {
 "OptionsApp": function OptionsApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { safeOutput, prepareList, withKey } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  
  let block1 = createBlock(`<div><!-- ── Left navigation sidebar ─────────────────────────────────── --><div id="navigation"><h1 class="title-app">Timer Options</h1><ul class="list-group"><li class="chooser list-group-item" block-attribute-0="class" block-handler-1="click"><i class="fa fa-info-circle"/> <span>About Timer</span></li><li class="chooser list-group-item" block-attribute-2="class" block-handler-3="click"><i class="fa fa-cogs"/> <span>Options</span></li></ul><hr/><div class="footer-app"><a href="popup.html" class="back-left"><i class="fa fa-arrow-circle-left fa-2x"/></a></div></div><!-- ── About page ──────────────────────────────────────────────── --><div class="options-box box" block-attribute-4="class"><h1><div class="logo"><img src="/img/logo.png"/></div></h1><hr/><div class="about-app"><h4 class="title-app text-center">Description</h4><hr/> This is a standalone Owl rewrite of the original cross-platform timer extension for posting work hours to Odoo timesheets. <hr/><h4 class="title-app text-center">Features</h4><hr/><div class="timer-features"><ul class="list-group"><li class="list-group-item">Support for both tasks and issues</li><li class="list-group-item">Start and stop the timer for the selected item</li><li class="list-group-item">Create Odoo timesheet lines against the linked analytic account</li><li class="list-group-item">Show assigned items or everyone's items</li><li class="list-group-item">Add, remove, or clear remote hosts</li><li class="list-group-item">Switch between remote sessions</li><li class="list-group-item">Download current month or current item timesheets as CSV</li></ul></div></div></div><!-- ── Options / remotes page ──────────────────────────────────── --><div class="options-box box" block-attribute-5="class"><div class="form remote-options-form"><form block-handler-6="submit.prevent"><!-- [FIX #38] General Settings ──────────────────────────── --><h4 class="remote-title text-info">General Settings</h4><hr/><div class="form-group"><label class="general-setting-label"><input type="checkbox" class="defaultCheckbox" block-property-7="checked" block-handler-8="change"/> Auto Download Current Item Timesheet </label><p class="inline-help"> Store timesheet locally each time you stop the timer on an item. </p></div><hr/><!-- Add Remote form ─────────────────────────────────────── --><h4 class="remote-title text-info">Add Remote</h4><hr/><div class="form-group"><label for="remote-host">Odoo Host</label><input type="text" class="form-control" id="remote-host" placeholder="https://your-odoo-host.example" block-property-9="value" block-handler-10="input"/></div><div class="form-group"><label for="remote-name">Display Name</label><input type="text" class="form-control" id="remote-name" placeholder="Therp" block-property-11="value" block-handler-12="input"/></div><div class="form-group"><label for="remote-database">Odoo Database</label><input type="text" class="form-control" id="remote-database" placeholder="someodoodatabase" block-property-13="value" block-handler-14="input"/></div><div class="form-group"><label class="label">Data Source</label><ul class="data-source-list list-group"><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.issue" id="FromIssues" block-property-15="checked" block-handler-16="change"/><label class="form-check-label" for="FromIssues">From Issues</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.task" id="FromTasks" block-property-17="checked" block-handler-18="change"/><label class="form-check-label" for="FromTasks">From Tasks</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="helpdesk.ticket" id="FromHelpdeskTickets" block-property-19="checked" block-handler-20="change"/><label class="form-check-label" for="FromHelpdeskTickets">From Helpdesk Tickets</label></div></li></ul></div><span class="caption-remotes">Controls</span><div class="remotes-control-btns col-md-12 text-center text-info pointer"><i title="Add a remote host" class="fa fa-2x fa-plus-circle" block-handler-21="click"/><i title="Refresh list of remotes" class="fa fa-2x fa-refresh" block-handler-22="click"/><i title="View list of remotes" class="fa fa-2x fa-eye" block-handler-23="click"/><i title="Remove all remotes" class="fa fa-2x fa-minus-circle" block-handler-24="click"/></div><block-child-0/></form><!-- Saved remotes table ──────────────────────────────────── --><block-child-1/></div></div></div>`);
  let block2 = createBlock(`<div class="remote-error"><block-child-0/></div>`);
  let block4 = createBlock(`<div class="remotes-table-info"><table class="table table-bordered"><caption class="text-info caption-remotes"> List of Available Remotes </caption><thead><tr><th scope="col">Remote</th><th scope="col">Host</th><th scope="col">Database</th><th scope="col">Source</th><th scope="col">State</th><th/></tr></thead><tbody><block-child-0/></tbody></table></div>`);
  let block6 = createBlock(`<tr><td class="text-info"><block-child-0/></td><td><block-child-1/></td><td><block-child-2/></td><td><block-child-3/></td><td><block-child-4/></td><td class="remote-row-actions"><i class="fa fa-pencil text-primary" title="Edit remote" style="margin-right: 10px; cursor: pointer;" block-handler-0="click"/><i class="fa fa-trash text-danger" title="Remove remote" style="cursor: pointer;" block-handler-1="click"/></td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b4;
    let attr1 = ctx['state'].activePage==='about'?'selected':'notselected';
    const v1 = ctx['state'];
    let hdlr1 = [()=>v1.activePage='about', ctx];
    let attr2 = ctx['state'].activePage==='options'?'selected':'notselected';
    const v2 = ctx['state'];
    let hdlr2 = [()=>v2.activePage='options', ctx];
    let attr3 = ctx['state'].activePage==='about'?'active_page':'inactive_page';
    let attr4 = ctx['state'].activePage==='options'?'active_page':'inactive_page';
    let hdlr3 = ["prevent", ctx['addRemote'], ctx];
    let prop1 = new Boolean(ctx['state'].autoDownloadIssueTimesheet);
    let hdlr4 = [ctx['toggleAutoDownload'], ctx];
    let prop2 = new String((ctx['state'].form.remote_host) === 0 ? 0 : ((ctx['state'].form.remote_host) || ""));
    const v3 = ctx['state'];
    let hdlr5 = [(_ev)=>v3.form.remote_host=_ev.target.value, ctx];
    let prop3 = new String((ctx['state'].form.remote_name) === 0 ? 0 : ((ctx['state'].form.remote_name) || ""));
    const v4 = ctx['state'];
    let hdlr6 = [(_ev)=>v4.form.remote_name=_ev.target.value, ctx];
    let prop4 = new String((ctx['state'].form.remote_database) === 0 ? 0 : ((ctx['state'].form.remote_database) || ""));
    const v5 = ctx['state'];
    let hdlr7 = [(_ev)=>v5.form.remote_database=_ev.target.value, ctx];
    let prop5 = new Boolean(ctx['state'].form.remote_datasrc==='project.issue');
    const v6 = ctx['state'];
    let hdlr8 = [()=>v6.form.remote_datasrc='project.issue', ctx];
    let prop6 = new Boolean(ctx['state'].form.remote_datasrc==='project.task');
    const v7 = ctx['state'];
    let hdlr9 = [()=>v7.form.remote_datasrc='project.task', ctx];
    let prop7 = new Boolean(ctx['state'].form.remote_datasrc==='helpdesk.ticket');
    const v8 = ctx['state'];
    let hdlr10 = [()=>v8.form.remote_datasrc='helpdesk.ticket', ctx];
    let hdlr11 = [ctx['addRemote'], ctx];
    let hdlr12 = [ctx['loadRemotes'], ctx];
    const v9 = ctx['state'];
    let hdlr13 = [()=>v9.showList=!v9.showList, ctx];
    let hdlr14 = [ctx['removeAllRemotes'], ctx];
    if (ctx['state'].error) {
      const b3 = safeOutput(ctx['state'].error);
      b2 = block2([], [b3]);
    }
    if (ctx['state'].showList&&ctx['state'].remotes.length) {
      ctx = Object.create(ctx);
      const [k_block5, v_block5, l_block5, c_block5] = prepareList(ctx['state'].remotes);;
      for (let i1 = 0; i1 < l_block5; i1++) {
        ctx[`remote`] = k_block5[i1];
        const key1 = ctx['remote'].url+ctx['remote'].database;
        const b7 = comp1({text: ctx['remote'].name,limit: 18}, key + `__1__${key1}`, node, this, null);
        const b8 = comp2({text: ctx['remote'].url,limit: 25}, key + `__2__${key1}`, node, this, null);
        const b9 = comp3({text: ctx['remote'].database,limit: 18}, key + `__3__${key1}`, node, this, null);
        const b10 = comp4({text: ctx['remote'].datasrc||'project.issue',limit: 18}, key + `__4__${key1}`, node, this, null);
        const b11 = comp5({text: ctx['remote'].state||'Inactive',limit: 18}, key + `__5__${key1}`, node, this, null);
        const v10 = ctx['editRemote'];
        const v11 = ctx['remote'];
        let hdlr15 = [()=>v10(v11), ctx];
        const v12 = ctx['removeRemote'];
        const v13 = ctx['remote'];
        let hdlr16 = [()=>v12(v13), ctx];
        c_block5[i1] = withKey(block6([hdlr15, hdlr16], [b7, b8, b9, b10, b11]), key1);
      }
      ctx = ctx.__proto__;
      const b5 = list(c_block5);
      b4 = block4([], [b5]);
    }
    return block1([attr1, hdlr1, attr2, hdlr2, attr3, attr4, hdlr3, prop1, hdlr4, prop2, hdlr5, prop3, hdlr6, prop4, hdlr7, prop5, hdlr8, prop6, hdlr9, prop7, hdlr10, hdlr11, hdlr12, hdlr13, hdlr14], [b2, b4]);
  }
},

"PopupApp": function PopupApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { safeOutput, prepareList, withKey, toNumber } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit","href"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp6 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  
  let block1 = createBlock(`<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text"> Loading current session and projects… </div><div class="loader-subtext"> Please wait — or grab a cup of coffee ☕ </div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="/img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options </a></div></div><div id="wrapper" block-attribute-2="class"><block-child-3/><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change" block-handler-7="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-8="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-9="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-10="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-11="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-12="click"/><a href="options_main_page.html" class="options-btn" title="Go To options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table id="table-task-issues" class="table table-responsive-sm table-bordered table-fixed"><thead><tr><th class="action-col"><div/><block-child-4/></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-child-5/> [<block-child-6/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-13="checked" block-handler-14="input"/> Show for everyone </label></th><block-child-7/><block-child-8/><th class="project-col"><block-child-9/></th></tr></thead><tbody><block-child-10/><block-child-10/><block-child-11/></tbody></table></div><div class="container footer info-footer"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <span class="remote-value"><block-child-12/></span></span><br/><span><b>OWL:</b> <span class="remote-value"><block-child-13/></span></span><br/><span><b>Host:</b> <span class="remote-value"><block-child-14/></span></span><br/><span><b>Database:</b> <span class="remote-value"><block-child-15/></span></span><br/><span><b>Current User:</b> <span class="remote-value"><block-child-16/></span></span><br/></div></div></div></div></div>`);
  let block2 = createBlock(`<div><p class="odooError"><block-child-0/></p></div>`);
  let block4 = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning"> Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below and add one. </div></div>`);
  let block5 = createBlock(`<form block-handler-0="submit.prevent"><block-child-0/><block-child-1/><div class="password-field"><block-child-2/><block-child-3/></div><select id="remote-selection" class="form-control" block-handler-1="change"><block-child-4/></select><div class="checkbox"><label><input type="checkbox" block-property-2="checked" block-handler-3="change"/> Use Existing Session </label></div><button class="login" type="submit"> Login <block-child-5/></button><block-child-6/></form>`);
  let block6 = createBlock(`<p class="odooError"><block-child-0/></p>`);
  let block8 = createBlock(`<input type="text" placeholder="Username" block-property-0="value" block-handler-1="input"/>`);
  let block9 = createBlock(`<input id="unique-password" block-attribute-0="type" placeholder="Password" block-property-1="value" block-handler-2="input"/>`);
  let block10 = createBlock(`<span class="pass-viewer" block-handler-0="click"><i class="fa" block-attribute-1="class"/></span>`);
  let block12 = createBlock(`<option block-attribute-0="value" block-property-1="selected"><block-child-0/></option>`);
  let block14 = createBlock(`<i class="fa fa-cog fa-spin"/>`);
  let block15 = createBlock(`<div class="remote-info small-note"> Host: <block-child-0/><span class="current-source-chip"><block-child-1/></span></div>`);
  let block18 = createBlock(`<div class="odooError source-warning"><block-child-0/></div>`);
  let block20 = createBlock(`<span class="startTimeCount"><block-child-0/></span>`);
  let block25 = createBlock(`<th class="text-center">Hours Spent</th>`);
  let block26 = createBlock(`<th class="text-center">Hours Left</th>`);
  let block27 = createBlock(`<th class="text-center">Time Spent</th>`);
  let block30 = createBlock(`<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/></td><td class="priority-cell"><block-child-2/><block-child-2/><block-child-3/></td><td class="stage-cell"><block-child-4/></td><td class="issue-desc-cell"><block-child-5/></td><block-child-6/><block-child-7/><td class="project-cell"><block-child-8/></td></tr>`);
  let block31 = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`);
  let block32 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
  let block34 = createBlock(`<span class="fa fa-star checked"/>`);
  let block35 = createBlock(`<i class="fa fa-star-o"/>`);
  let block39 = createBlock(`<td class="text-center"><block-child-0/></td>`);
  let block41 = createBlock(`<td class="text-center"><block-child-0/></td>`);
  let block43 = createBlock(`<td class="text-center"><block-child-0/></td>`);
  let block46 = createBlock(`<tr><td class="text-center text-danger" block-attribute-0="colspan"> No matching items are currently available </td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b4, b5, b18, b20, b22, b23, b24, b27, b28, b29, b46, b47, b48, b49, b50, b51;
    let attr1 = ctx['state'].view==='loading'?'':'hide';
    let attr2 = ctx['state'].view==='login'?'login-view':'login-view hide';
    if (ctx['state'].bootError) {
      const b3 = safeOutput(ctx['state'].bootError);
      b2 = block2([], [b3]);
    }
    if (!ctx['state'].remotes.length) {
      b4 = block4();
    }
    if (ctx['state'].remotes.length) {
      let b6, b8, b9, b10, b11, b14, b15;
      let hdlr1 = ["prevent", ctx['login'], ctx];
      if (ctx['state'].loginError) {
        const b7 = safeOutput(ctx['state'].loginError);
        b6 = block6([], [b7]);
      }
      if (!ctx['state'].useExistingSession) {
        let prop1 = new String((ctx['state'].username) === 0 ? 0 : ((ctx['state'].username) || ""));
        const v1 = ctx['state'];
        let hdlr2 = [(_ev)=>v1.username=_ev.target.value, ctx];
        b8 = block8([prop1, hdlr2]);
      }
      if (!ctx['state'].useExistingSession) {
        let attr3 = ctx['state'].showPassword?'text':'password';
        let prop2 = new String((ctx['state'].password) === 0 ? 0 : ((ctx['state'].password) || ""));
        const v2 = ctx['state'];
        let hdlr3 = [(_ev)=>v2.password=_ev.target.value, ctx];
        b9 = block9([attr3, prop2, hdlr3]);
      }
      if (!ctx['state'].useExistingSession) {
        let hdlr4 = [ctx['togglePassword'], ctx];
        let attr4 = ctx['state'].showPassword?'fa fa-eye-slash':'fa fa-eye';
        b10 = block10([hdlr4, attr4]);
      }
      const v3 = ctx['state'];
      let hdlr5 = [(_ev)=>v3.selectedRemoteIndex=_ev.target.value, ctx];
      ctx = Object.create(ctx);
      const [k_block11, v_block11, l_block11, c_block11] = prepareList(ctx['state'].remotes);;
      for (let i1 = 0; i1 < l_block11; i1++) {
        ctx[`remote`] = k_block11[i1];
        const key1 = ctx['remote'].database+ctx['remote'].url;
        let attr5 = ctx['remote'].__index;
        let prop3 = new Boolean(ctx['state'].selectedRemoteIndex===ctx['remote'].__index);
        const b13 = safeOutput(ctx['remote'].name);
        c_block11[i1] = withKey(block12([attr5, prop3], [b13]), key1);
      }
      ctx = ctx.__proto__;
      b11 = list(c_block11);
      let prop4 = new Boolean(ctx['state'].useExistingSession);
      let hdlr6 = [ctx['toggleUseExistingSession'], ctx];
      if (ctx['state'].loginLoading) {
        b14 = block14();
      }
      if (ctx['currentRemote']) {
        const b16 = safeOutput(ctx['currentRemote'].url);
        const b17 = safeOutput(ctx['currentRemote'].datasrc||'project.issue');
        b15 = block15([], [b16, b17]);
      }
      b5 = block5([hdlr1, hdlr5, prop4, hdlr6], [b6, b8, b9, b10, b11, b14, b15]);
    }
    let attr6 = ctx['state'].view==='main'?'':'hide';
    if (ctx['state'].sourceError) {
      const b19 = safeOutput(ctx['state'].sourceError);
      b18 = block18([], [b19]);
    }
    let prop5 = new String((ctx['state'].searchQuery) === 0 ? 0 : ((ctx['state'].searchQuery) || ""));
    const v4 = ctx['state'];
    let hdlr7 = [(_ev)=>v4.searchQuery=_ev.target.value, ctx];
    const bExpr1 = ctx['state'];
    const expr1 = 'limitTo';
    let prop6 = bExpr1[expr1];
    let hdlr8 = [(ev) => { bExpr1[expr1] = ev.target.value; }];
    const v5 = ctx['updateLimitPreference'];
    let hdlr9 = [(_ev)=>v5(_ev.target.value), ctx];
    let hdlr10 = [ctx['downloadCurrentMonthTimesheets'], ctx];
    let hdlr11 = [ctx['switchBetweenRemotes'], ctx];
    let hdlr12 = [ctx['refreshAll'], ctx];
    let hdlr13 = [ctx['resetTimer'], ctx];
    let hdlr14 = [ctx['logout'], ctx];
    if (ctx['state'].timerStartIso) {
      const b21 = safeOutput(ctx['formattedTimer']);
      b20 = block20([], [b21]);
    }
    b22 = safeOutput(ctx['itemLabelPlural']);
    b23 = safeOutput(ctx['filteredIssues'].length);
    let prop7 = new Boolean(ctx['state'].allIssues);
    const v6 = ctx['updateShowAllPreference'];
    let hdlr15 = [(_ev)=>v6(_ev.target.checked), ctx];
    if (ctx['state'].dataSource==='project.task') {
      const b25 = block25();
      const b26 = block26();
      b24 = multi([b25, b26]);
    }
    if (ctx['showHelpdeskHours']) {
      b27 = block27();
    }
    b28 = safeOutput(ctx['relationHeaderLabel']);
    if (ctx['filteredIssues'].length) {
      ctx = Object.create(ctx);
      const [k_block29, v_block29, l_block29, c_block29] = prepareList(ctx['filteredIssues']);;
      for (let i1 = 0; i1 < l_block29; i1++) {
        ctx[`issue`] = k_block29[i1];
        const key1 = ctx['issue'].id;
        let b31, b32, b33, b35, b36, b37, b38, b43, b45;
        let attr7 = ctx['isActiveTimerItem'](ctx['issue'])?'active-row':'';
        if (!ctx['state'].activeTimerId) {
          const v7 = ctx['startTimer'];
          const v8 = ctx['issue'];
          let hdlr16 = [()=>v7(v8), ctx];
          b31 = block31([hdlr16]);
        }
        if (ctx['isActiveTimerItem'](ctx['issue'])) {
          const v9 = ctx['stopTimer'];
          const v10 = ctx['issue'];
          let hdlr17 = [()=>v9(v10), ctx];
          b32 = block32([hdlr17]);
        }
        if (ctx['issue'].priority_level.length) {
          ctx = Object.create(ctx);
          const [k_block33, v_block33, l_block33, c_block33] = prepareList(ctx['issue'].priority_level);;
          for (let i2 = 0; i2 < l_block33; i2++) {
            ctx[`priority`] = k_block33[i2];
            const key2 = ctx['priority']+'_'+ctx['issue'].id;
            c_block33[i2] = withKey(block34(), key2);
          }
          ctx = ctx.__proto__;
          b33 = list(c_block33);
        }
        if (!ctx['issue'].priority_level.length) {
          b35 = block35();
        }
        b36 = comp1({text: ctx['relationLabel'](ctx['issue'].stage_id),limit: 15}, key + `__1__${key1}`, node, this, null);
        b37 = comp2({text: ctx['issueLabel'](ctx['issue']),limit: 70,href: ctx['issueHref'](ctx['issue'])}, key + `__2__${key1}`, node, this, null);
        if (ctx['state'].dataSource==='project.task') {
          const b40 = comp3({text: ctx['normalizeText'](ctx['formatHours'](ctx['issue'].effective_hours)),limit: 9}, key + `__3__${key1}`, node, this, null);
          const b39 = block39([], [b40]);
          const b42 = comp4({text: ctx['normalizeText'](ctx['formatHours'](ctx['issue'].remaining_hours)),limit: 9}, key + `__4__${key1}`, node, this, null);
          const b41 = block41([], [b42]);
          b38 = multi([b39, b41]);
        }
        if (ctx['showHelpdeskHours']) {
          const b44 = comp5({text: ctx['normalizeText'](ctx['formatHours'](ctx['helpdeskHoursValue'](ctx['issue']))),limit: 9}, key + `__5__${key1}`, node, this, null);
          b43 = block43([], [b44]);
        }
        b45 = comp6({text: ctx['relationLabel'](ctx['resourceRelationValue'](ctx['issue'])),limit: 15}, key + `__6__${key1}`, node, this, null);
        c_block29[i1] = withKey(block30([attr7], [b31, b32, b33, b35, b36, b37, b38, b43, b45]), key1);
      }
      ctx = ctx.__proto__;
      b29 = list(c_block29);
    }
    if (!ctx['filteredIssues'].length) {
      let attr8 = ctx['tableColumnCount'];
      b46 = block46([attr8]);
    }
    b47 = safeOutput(ctx['state'].serverVersion||'Unknown');
    b48 = safeOutput(ctx['state'].odooOWLVersion||'Unknown');
    b49 = safeOutput(ctx['state'].currentHost||'-');
    b50 = safeOutput(ctx['state'].currentDatabase||'-');
    b51 = safeOutput(ctx['state'].user?ctx['state'].user.display_name:'-');
    return block1([attr1, attr2, attr6, prop5, hdlr7, prop6, hdlr8, hdlr9, hdlr10, hdlr11, hdlr12, hdlr13, hdlr14, prop7, hdlr15], [b2, b4, b5, b18, b20, b22, b23, b24, b27, b28, b29, b46, b47, b48, b49, b50, b51]);
  }
},

"ReadMore": function ReadMore(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { safeOutput } = helpers;
  
  let block1 = createBlock(`<span class="readmore-inline"><block-child-0/><block-child-1/><block-child-1/><block-child-2/></span>`);
  let block2 = createBlock(`<a block-attribute-0="href" class="remote-link" target="_blank" rel="noreferrer"><block-child-0/></a>`);
  let block5 = createBlock(`<a href="#" class="hmMoreClass" block-handler-0="click.prevent"><block-child-0/></a>`);
  
  return function template(ctx, node, key = "") {
    let b2, b4, b5;
    if (ctx['props'].href) {
      let attr1 = ctx['props'].href;
      const b3 = safeOutput(ctx['state'].expanded||!ctx['needsTrim']?(ctx['props'].text||''):ctx['shortText']);
      b2 = block2([attr1], [b3]);
    } else {
      b4 = safeOutput(ctx['state'].expanded||!ctx['needsTrim']?(ctx['props'].text||''):ctx['shortText']);
    }
    if (ctx['needsTrim']) {
      let hdlr1 = ["prevent", ctx['toggle'], ctx];
      const b6 = safeOutput(ctx['state'].expanded?' ▲':' ...');
      b5 = block5([hdlr1], [b6]);
    }
    return block1([], [b2, b4, b5]);
  }
},
 
}
// Added by scripts/compile_owl_templates.sh
globalThis.__THERP_TIMER_TEMPLATES__ = templates;
