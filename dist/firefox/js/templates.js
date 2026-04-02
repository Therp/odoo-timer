export const templates = {
 "PopupApp": function PopupApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { safeOutput, prepareList, withKey } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit","href"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  
  let block1 = createBlock(`<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text"> Loading current session and projects… </div><div class="loader-subtext"> Please wait — or grab a cup of coffee ☕ </div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="/img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options </a></div></div><div id="wrapper" block-attribute-2="class"><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on the current item"><input id="auto_download_timesheet_input" type="checkbox" block-property-7="checked" block-handler-8="change"/> Auto Download Current Item Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-9="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-10="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-11="click"/><i class="fa fa-undo fa-2x" title="Discard the active timer" block-handler-12="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-13="click"/><a href="options_main_page.html" class="options-btn" title="Go To options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table id="table-task-issues" class="table table-responsive-sm table-bordered table-fixed"><thead><tr><th class="action-col"><div><block-child-3/></div><block-child-4/></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-child-5/> [<block-child-6/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-14="checked" block-handler-15="input"/> Show for everyone </label></th><block-child-7/><th class="project-col">Project</th></tr></thead><tbody><block-child-8/><block-child-8/><block-child-9/></tbody></table></div><div class="container footer info-footer"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <block-child-10/></span><br/><span><b>Host:</b> <block-child-11/></span><br/><span><b>Database:</b> <block-child-12/></span><br/><span><b>Current User:</b> <block-child-13/></span><br/></div></div></div></div></div>`);
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
  let block18 = createBlock(`<span class="active-timer-running"><i class="fa fa-clock-o"/> #<block-child-0/></span>`);
  let block20 = createBlock(`<span class="startTimeCount"><block-child-0/></span>`);
  let block25 = createBlock(`<th>Hours Spent</th>`);
  let block26 = createBlock(`<th>Remaining Hours</th>`);
  let block28 = createBlock(`<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/></td><td class="priority-cell"><block-child-2/><block-child-2/><block-child-3/></td><td class="stage-cell"><block-child-4/></td><td class="issue-desc-cell"><block-child-5/></td><block-child-6/><td class="project-cell"><block-child-7/></td></tr>`);
  let block29 = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`);
  let block30 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
  let block32 = createBlock(`<span class="fa fa-star checked"/>`);
  let block33 = createBlock(`<i class="fa fa-star-o"/>`);
  let block37 = createBlock(`<td><block-child-0/></td>`);
  let block39 = createBlock(`<td><block-child-0/></td>`);
  let block42 = createBlock(`<tr><td class="text-center text-danger" block-attribute-0="colspan"> No matching items are currently available </td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b4, b5, b18, b20, b22, b23, b24, b27, b42, b43, b44, b45, b46;
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
    let prop5 = new String((ctx['state'].searchQuery) === 0 ? 0 : ((ctx['state'].searchQuery) || ""));
    const v4 = ctx['state'];
    let hdlr7 = [(_ev)=>v4.searchQuery=_ev.target.value, ctx];
    let prop6 = new String((ctx['state'].limitTo) === 0 ? 0 : ((ctx['state'].limitTo) || ""));
    const v5 = ctx['updateLimitPreference'];
    let hdlr8 = [(_ev)=>v5(_ev.target.value), ctx];
    let prop7 = new Boolean(ctx['state'].autoDownloadIssueTimesheet);
    let hdlr9 = [ctx['toggleAutoDownload'], ctx];
    let hdlr10 = [ctx['downloadCurrentMonthTimesheets'], ctx];
    let hdlr11 = [ctx['switchBetweenRemotes'], ctx];
    let hdlr12 = [ctx['refreshAll'], ctx];
    let hdlr13 = [ctx['resetTimer'], ctx];
    let hdlr14 = [ctx['logout'], ctx];
    if (ctx['state'].activeTimerId&&ctx['state'].timerStartIso) {
      const b19 = safeOutput(ctx['state'].activeTimerId);
      b18 = block18([], [b19]);
    }
    if (ctx['state'].timerStartIso) {
      const b21 = safeOutput(ctx['formattedTimer']);
      b20 = block20([], [b21]);
    }
    b22 = safeOutput(ctx['itemLabelPlural']);
    b23 = safeOutput(ctx['filteredIssues'].length);
    let prop8 = new Boolean(ctx['state'].allIssues);
    const v6 = ctx['updateShowAllPreference'];
    let hdlr15 = [(_ev)=>v6(_ev.target.checked), ctx];
    if (ctx['state'].dataSource==='project.task') {
      const b25 = block25();
      const b26 = block26();
      b24 = multi([b25, b26]);
    }
    if (ctx['filteredIssues'].length) {
      ctx = Object.create(ctx);
      const [k_block27, v_block27, l_block27, c_block27] = prepareList(ctx['filteredIssues']);;
      for (let i1 = 0; i1 < l_block27; i1++) {
        ctx[`issue`] = k_block27[i1];
        const key1 = ctx['issue'].id;
        let b29, b30, b31, b33, b34, b35, b36, b41;
        let attr7 = ctx['state'].activeTimerId===ctx['issue'].id?'active-row':'';
        if (!ctx['state'].activeTimerId) {
          const v7 = ctx['startTimer'];
          const v8 = ctx['issue'];
          let hdlr16 = [()=>v7(v8), ctx];
          b29 = block29([hdlr16]);
        }
        if (ctx['state'].activeTimerId===ctx['issue'].id) {
          const v9 = ctx['stopTimer'];
          const v10 = ctx['issue'];
          let hdlr17 = [()=>v9(v10), ctx];
          b30 = block30([hdlr17]);
        }
        if (ctx['issue'].priority_level.length) {
          ctx = Object.create(ctx);
          const [k_block31, v_block31, l_block31, c_block31] = prepareList(ctx['issue'].priority_level);;
          for (let i2 = 0; i2 < l_block31; i2++) {
            ctx[`priority`] = k_block31[i2];
            const key2 = ctx['priority']+'_'+ctx['issue'].id;
            c_block31[i2] = withKey(block32(), key2);
          }
          ctx = ctx.__proto__;
          b31 = list(c_block31);
        }
        if (!ctx['issue'].priority_level.length) {
          b33 = block33();
        }
        b34 = comp1({text: ctx['relationLabel'](ctx['issue'].stage_id),limit: 15}, key + `__1__${key1}`, node, this, null);
        b35 = comp2({text: ctx['issueLabel'](ctx['issue']),limit: 70,href: ctx['issueHref'](ctx['issue'])}, key + `__2__${key1}`, node, this, null);
        if (ctx['state'].dataSource==='project.task') {
          const b38 = comp3({text: ctx['normalizeText'](ctx['formatHours'](ctx['issue'].effective_hours)),limit: 9}, key + `__3__${key1}`, node, this, null);
          const b37 = block37([], [b38]);
          const b40 = comp4({text: ctx['normalizeText'](ctx['formatHours'](ctx['issue'].remaining_hours)),limit: 9}, key + `__4__${key1}`, node, this, null);
          const b39 = block39([], [b40]);
          b36 = multi([b37, b39]);
        }
        b41 = comp5({text: ctx['relationLabel'](ctx['issue'].project_id),limit: 15}, key + `__5__${key1}`, node, this, null);
        c_block27[i1] = withKey(block28([attr7], [b29, b30, b31, b33, b34, b35, b36, b41]), key1);
      }
      ctx = ctx.__proto__;
      b27 = list(c_block27);
    }
    if (!ctx['filteredIssues'].length) {
      let attr8 = ctx['state'].dataSource==='project.task'?7:5;
      b42 = block42([attr8]);
    }
    b43 = safeOutput(ctx['state'].serverVersion||'Unknown');
    b44 = safeOutput(ctx['state'].currentHost||'-');
    b45 = safeOutput(ctx['state'].currentDatabase||'-');
    b46 = safeOutput(ctx['state'].user?ctx['state'].user.display_name:'-');
    return block1([attr1, attr2, attr6, prop5, hdlr7, prop6, hdlr8, prop7, hdlr9, hdlr10, hdlr11, hdlr12, hdlr13, hdlr14, prop8, hdlr15], [b2, b4, b5, b18, b20, b22, b23, b24, b27, b42, b43, b44, b45, b46]);
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
  
  let block1 = createBlock(`<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text"> Loading current session and projects… </div><div class="loader-subtext"> Please wait — or grab a cup of coffee ☕ </div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="/img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options </a></div></div><div id="wrapper" block-attribute-2="class"><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change" block-handler-7="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on the current item"><input id="auto_download_timesheet_input" type="checkbox" block-property-8="checked" block-handler-9="change"/> Auto Download Current Item Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-10="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-11="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-12="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-13="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-14="click"/><a href="options_main_page.html" class="options-btn" title="Go To options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table id="table-task-issues" class="table table-responsive-sm table-bordered table-fixed"><thead><tr><th class="action-col"><div/><block-child-3/></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-child-4/> [<block-child-5/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-15="checked" block-handler-16="input"/> Show for everyone </label></th><block-child-6/><th class="project-col">Project</th></tr></thead><tbody><block-child-7/><block-child-7/><block-child-8/></tbody></table></div><div class="container footer info-footer"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <span class="remote-value"><block-child-9/></span></span><br/><span><b>OWL:</b> <span class="remote-value"><block-child-10/></span></span><br/><span><b>Host:</b> <span class="remote-value"><block-child-11/></span></span><br/><span><b>Database:</b> <span class="remote-value"><block-child-12/></span></span><br/><span><b>Current User:</b> <span class="remote-value"><block-child-13/></span></span><br/></div></div></div></div></div>`);
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
  let block18 = createBlock(`<span class="startTimeCount"><block-child-0/></span>`);
  let block23 = createBlock(`<th>Hours Spent</th>`);
  let block24 = createBlock(`<th>Remaining Hours</th>`);
  let block26 = createBlock(`<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/></td><td class="priority-cell"><block-child-2/><block-child-2/><block-child-3/></td><td class="stage-cell"><block-child-4/></td><td class="issue-desc-cell"><block-child-5/></td><block-child-6/><td class="project-cell"><block-child-7/></td></tr>`);
  let block27 = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`);
  let block28 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
  let block30 = createBlock(`<span class="fa fa-star checked"/>`);
  let block31 = createBlock(`<i class="fa fa-star-o"/>`);
  let block35 = createBlock(`<td><block-child-0/></td>`);
  let block37 = createBlock(`<td><block-child-0/></td>`);
  let block40 = createBlock(`<tr><td class="text-center text-danger" block-attribute-0="colspan"> No matching items are currently available </td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b4, b5, b18, b20, b21, b22, b25, b40, b41, b42, b43, b44, b45;
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
    let prop5 = new String((ctx['state'].searchQuery) === 0 ? 0 : ((ctx['state'].searchQuery) || ""));
    const v4 = ctx['state'];
    let hdlr7 = [(_ev)=>v4.searchQuery=_ev.target.value, ctx];
    const bExpr1 = ctx['state'];
    const expr1 = 'limitTo';
    let prop6 = bExpr1[expr1];
    let hdlr8 = [(ev) => { bExpr1[expr1] = ev.target.value; }];
    const v5 = ctx['updateLimitPreference'];
    let hdlr9 = [(_ev)=>v5(_ev.target.value), ctx];
    let prop7 = new Boolean(ctx['state'].autoDownloadIssueTimesheet);
    let hdlr10 = [ctx['toggleAutoDownload'], ctx];
    let hdlr11 = [ctx['downloadCurrentMonthTimesheets'], ctx];
    let hdlr12 = [ctx['switchBetweenRemotes'], ctx];
    let hdlr13 = [ctx['refreshAll'], ctx];
    let hdlr14 = [ctx['resetTimer'], ctx];
    let hdlr15 = [ctx['logout'], ctx];
    if (ctx['state'].timerStartIso) {
      const b19 = safeOutput(ctx['formattedTimer']);
      b18 = block18([], [b19]);
    }
    b20 = safeOutput(ctx['itemLabelPlural']);
    b21 = safeOutput(ctx['filteredIssues'].length);
    let prop8 = new Boolean(ctx['state'].allIssues);
    const v6 = ctx['updateShowAllPreference'];
    let hdlr16 = [(_ev)=>v6(_ev.target.checked), ctx];
    if (ctx['state'].dataSource==='project.task') {
      const b23 = block23();
      const b24 = block24();
      b22 = multi([b23, b24]);
    }
    if (ctx['filteredIssues'].length) {
      ctx = Object.create(ctx);
      const [k_block25, v_block25, l_block25, c_block25] = prepareList(ctx['filteredIssues']);;
      for (let i1 = 0; i1 < l_block25; i1++) {
        ctx[`issue`] = k_block25[i1];
        const key1 = ctx['issue'].id;
        let b27, b28, b29, b31, b32, b33, b34, b39;
        let attr7 = ctx['state'].activeTimerId===ctx['issue'].id?'active-row':'';
        if (!ctx['state'].activeTimerId) {
          const v7 = ctx['startTimer'];
          const v8 = ctx['issue'];
          let hdlr17 = [()=>v7(v8), ctx];
          b27 = block27([hdlr17]);
        }
        if (ctx['state'].activeTimerId===ctx['issue'].id) {
          const v9 = ctx['stopTimer'];
          const v10 = ctx['issue'];
          let hdlr18 = [()=>v9(v10), ctx];
          b28 = block28([hdlr18]);
        }
        if (ctx['issue'].priority_level.length) {
          ctx = Object.create(ctx);
          const [k_block29, v_block29, l_block29, c_block29] = prepareList(ctx['issue'].priority_level);;
          for (let i2 = 0; i2 < l_block29; i2++) {
            ctx[`priority`] = k_block29[i2];
            const key2 = ctx['priority']+'_'+ctx['issue'].id;
            c_block29[i2] = withKey(block30(), key2);
          }
          ctx = ctx.__proto__;
          b29 = list(c_block29);
        }
        if (!ctx['issue'].priority_level.length) {
          b31 = block31();
        }
        b32 = comp1({text: ctx['relationLabel'](ctx['issue'].stage_id),limit: 15}, key + `__1__${key1}`, node, this, null);
        b33 = comp2({text: ctx['issueLabel'](ctx['issue']),limit: 70,href: ctx['issueHref'](ctx['issue'])}, key + `__2__${key1}`, node, this, null);
        if (ctx['state'].dataSource==='project.task') {
          const b36 = comp3({text: ctx['normalizeText'](ctx['formatHours'](ctx['issue'].effective_hours)),limit: 9}, key + `__3__${key1}`, node, this, null);
          const b35 = block35([], [b36]);
          const b38 = comp4({text: ctx['normalizeText'](ctx['formatHours'](ctx['issue'].remaining_hours)),limit: 9}, key + `__4__${key1}`, node, this, null);
          const b37 = block37([], [b38]);
          b34 = multi([b35, b37]);
        }
        b39 = comp5({text: ctx['relationLabel'](ctx['issue'].project_id),limit: 15}, key + `__5__${key1}`, node, this, null);
        c_block25[i1] = withKey(block26([attr7], [b27, b28, b29, b31, b32, b33, b34, b39]), key1);
      }
      ctx = ctx.__proto__;
      b25 = list(c_block25);
    }
    if (!ctx['filteredIssues'].length) {
      let attr8 = ctx['state'].dataSource==='project.task'?7:5;
      b40 = block40([attr8]);
    }
    b41 = safeOutput(ctx['state'].serverVersion||'Unknown');
    b42 = safeOutput(ctx['state'].odooOWLVersion||'Unknown');
    b43 = safeOutput(ctx['state'].currentHost||'-');
    b44 = safeOutput(ctx['state'].currentDatabase||'-');
    b45 = safeOutput(ctx['state'].user?ctx['state'].user.display_name:'-');
    return block1([attr1, attr2, attr6, prop5, hdlr7, prop6, hdlr8, hdlr9, prop7, hdlr10, hdlr11, hdlr12, hdlr13, hdlr14, hdlr15, prop8, hdlr16], [b2, b4, b5, b18, b20, b21, b22, b25, b40, b41, b42, b43, b44, b45]);
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
