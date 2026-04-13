export const templates = {
 "MessagesApp": function MessagesApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { toNumber, prepareList, withKey, safeOutput } = helpers;
  
  let block1 = createBlock(`<div class="messages-layout"><!-- ── Sidebar ──────────────────────────────────────── --><aside class="messages-sidebar" id="tasksPane"><div class="messages-search"><input id="task-search" placeholder="Search tasks/issues..." block-property-0="value" block-handler-1="input"/></div><div class="task-list"><block-child-0/><block-child-1/><block-child-2/></div></aside><!-- ── Main thread pane ──────────────────────────────── --><main class="messages-main"><!-- Top bar --><div class="messages-topbar"><div class="messages-topbar-title"><div class="messages-title">Inbox</div><div class="messages-subtitle"><block-text-2/> unread recent messages · latest 10 per tracked item </div></div><div class="messages-top-actions"><button class="messages-btn" block-handler-3="click"><i class="fa fa-list"/> <block-child-3/><block-child-4/></button><button class="messages-btn" block-handler-4="click"><i class="fa fa-external-link"/> Open in Odoo </button><button class="messages-btn" block-handler-5="click"><i class="fa fa-check"/> Read all </button><button class="messages-btn" block-handler-6="click"><i class="fa fa-refresh"/> Refresh </button></div></div><!-- Thread header --><block-child-5/><!-- Message thread --><div class="messages-thread" id="messages-list"><block-child-6/><block-child-7/><block-child-8/><block-child-9/></div><!-- Compose box --><block-child-10/></main></div>`);
  let block2 = createBlock(`<div class="tasks-empty"><i class="fa fa-cog fa-spin"/> Loading…</div>`);
  let block3 = createBlock(`<div class="tasks-empty">No matching tasks or issues.</div>`);
  let block5 = createBlock(`<div class="task-card" block-attribute-0="class" block-attribute-1="data-task-id" block-handler-2="click"><div class="task-title"><!-- Follower badge (todo #3) --><span block-attribute-3="class" block-attribute-4="title"><block-child-0/><block-child-1/></span><block-text-5/></div><div class="task-meta"><span class="task-badge"><i class="fa fa-folder-open-o"/><block-text-6/></span><span><block-text-7/></span><span><block-child-2/></span></div></div>`);
  let block8 = createBlock(`<span class="msg-unread-badge"><block-text-0/></span>`);
  let block11 = createBlock(`<div class="message-thread-header"><div class="message-thread-title compact-title"><a href="#" id="task-title-link" block-handler-0="click.prevent"><block-text-1/></a><!-- Follower type label (todo #3) --><span block-attribute-2="class" style="margin-left:8px;"><block-child-0/><block-child-1/></span></div><div class="messages-subtitle"><block-text-3/></div><!-- Filter pills --><div class="message-legend"><block-child-2/></div></div>`);
  let block15 = createBlock(`<button class="filter-chip" block-attribute-0="class" block-attribute-1="data-filter" block-handler-2="click"><span class="dot"/><block-text-3/></button>`);
  let block16 = createBlock(`<div style="padding:32px;text-align:center;color:#94a3b8;"><i class="fa fa-cog fa-spin fa-2x"/></div>`);
  let block17 = createBlock(`<div style="padding:32px;text-align:center;color:#94a3b8;">No messages found.</div>`);
  let block18 = createBlock(`<div style="padding:32px;text-align:center;color:#94a3b8;"> ← Select a task from the sidebar to view messages. </div>`);
  let block20 = createBlock(`<div block-attribute-0="class"><div class="msg-header"><span class="msg-author"><block-text-1/></span><span class="msg-time"><block-text-2/></span></div><div class="msg-body"><block-child-0/></div><block-child-1/></div>`);
  let block22 = createBlock(`<div class="msg-attachments"><block-child-0/></div>`);
  let block24 = createBlock(`<span class="att-chip" block-attribute-0="data-att-id" block-handler-1="click"><i class="fa fa-paperclip"/><block-text-2/></span>`);
  let block25 = createBlock(`<div class="messages-compose"><div class="compose-tabs"><button block-attribute-0="class" data-compose-type="comment" block-handler-1="click"><i class="fa fa-comment"/> Comment </button><button block-attribute-2="class" data-compose-type="note" block-handler-3="click"><i class="fa fa-sticky-note-o"/> Note </button></div><div style="position:relative;"><textarea id="compose-text" block-attribute-4="placeholder" rows="3" block-property-5="value" block-handler-6="input" block-handler-7="input" block-handler-8="keydown"/><!-- @mention dropdown --><block-child-0/></div><div class="compose-actions"><block-child-1/><button class="messages-btn" block-handler-9="click"><i class="fa fa-paperclip"/> Attach </button><button class="messages-btn send-btn" block-property-10="disabled" block-handler-11="click"><i block-attribute-12="class"/><block-child-2/><block-child-3/></button></div></div>`);
  let block26 = createBlock(`<div class="mention-dropdown"><block-child-0/></div>`);
  let block28 = createBlock(`<div class="mention-item" block-attribute-0="data-user-id" block-handler-1="click"><block-text-2/></div>`);
  let block29 = createBlock(`<span class="att-chip"><i class="fa fa-paperclip"/><block-text-0/><i class="fa fa-times" style="cursor:pointer;margin-left:4px;" block-handler-1="click"/></span>`);
  
  return function template(ctx, node, key = "") {
    let b2, b3, b4, b9, b10, b11, b16, b17, b18, b19, b25;
    const bExpr1 = ctx['state'];
    const expr1 = 'taskSearch';
    let prop1 = bExpr1[expr1];
    let hdlr1 = [(ev) => { bExpr1[expr1] = ev.target.value; }];
    if (ctx['state'].loading) {
      b2 = block2();
    }
    if (!ctx['state'].loading&&!ctx['visibleTasks'].length) {
      b3 = block3();
    }
    ctx = Object.create(ctx);
    const [k_block4, v_block4, l_block4, c_block4] = prepareList(ctx['visibleTasks']);;
    for (let i1 = 0; i1 < l_block4; i1++) {
      ctx[`task`] = k_block4[i1];
      const key1 = ctx['task'].id;
      let b6, b7, b8;
      let attr1 = ctx['task'].id===ctx['state'].selectedTask?.id?'task-card active':'task-card';
      let attr2 = ctx['task'].id;
      let hdlr2 = [ctx['onTaskItemClick'], ctx];
      let attr3 = 'badge-'+(ctx['task'].followerType||'assigned');
      let attr4 = ctx['task'].followerType==='follower'?'You follow this task':'Assigned to you';
      if (ctx['task'].followerType==='follower') {
        b6 = text(`👁`);
      } else {
        b7 = text(`👤`);
      }
      let txt1 = ctx['task'].name;
      let txt2 = ctx['task'].project_id&&ctx['task'].project_id[1]||'No project';
      let txt3 = ctx['task'].stage_id&&ctx['task'].stage_id[1]||'No stage';
      if ((ctx['state'].unreadMap[ctx['task'].id]||0)>0) {
        let txt4 = ctx['state'].unreadMap[ctx['task'].id];
        b8 = block8([txt4]);
      }
      c_block4[i1] = withKey(block5([attr1, attr2, hdlr2, attr3, attr4, txt1, txt2, txt3], [b6, b7, b8]), key1);
    }
    ctx = ctx.__proto__;
    b4 = list(c_block4);
    let txt5 = ctx['totalUnread'];
    const v1 = ctx['state'];
    let hdlr3 = [()=>{v1.showAllTasks=!v1.showAllTasks;}, ctx];
    if (ctx['state'].showAllTasks) {
      b9 = text(`My Tasks`);
    } else {
      b10 = text(`All Tasks`);
    }
    let hdlr4 = [ctx['openTaskInBrowser'], ctx];
    let hdlr5 = [ctx['markAllRead'], ctx];
    let hdlr6 = [ctx['refreshMessages'], ctx];
    if (ctx['state'].selectedTask) {
      let b12, b13, b14;
      let hdlr7 = ["prevent", ctx['openTaskInBrowser'], ctx];
      let txt6 = ctx['state'].selectedTask.name;
      let attr5 = 'badge-'+(ctx['state'].selectedTask.followerType||'assigned');
      if (ctx['state'].selectedTask.followerType==='follower') {
        b12 = text(`👁 Follower`);
      } else {
        b13 = text(`👤 Assigned`);
      }
      let txt7 = ctx['state'].selectedTask.project_id&&ctx['state'].selectedTask.project_id[1]||'';
      ctx = Object.create(ctx);
      const [k_block14, v_block14, l_block14, c_block14] = prepareList([['all','All'],['comment','Comments'],['note','Notes']]);;
      for (let i1 = 0; i1 < l_block14; i1++) {
        ctx[`f`] = k_block14[i1];
        const key1 = ctx['f'][0];
        let attr6 = ctx['state'].filterType===ctx['f'][0]?'filter-chip active':'filter-chip';
        let attr7 = ctx['f'][0];
        let hdlr8 = [ctx['onFilterClick'], ctx];
        let txt8 = ctx['f'][1];
        c_block14[i1] = withKey(block15([attr6, attr7, hdlr8, txt8]), key1);
      }
      ctx = ctx.__proto__;
      b14 = list(c_block14);
      b11 = block11([hdlr7, txt6, attr5, txt7], [b12, b13, b14]);
    }
    if (ctx['state'].loadingMessages) {
      b16 = block16();
    }
    if (!ctx['state'].loadingMessages&&!ctx['filteredMessages'].length&&ctx['state'].selectedTask) {
      b17 = block17();
    }
    if (!ctx['state'].selectedTask&&!ctx['state'].loadingMessages) {
      b18 = block18();
    }
    ctx = Object.create(ctx);
    const [k_block19, v_block19, l_block19, c_block19] = prepareList(ctx['filteredMessages']);;
    for (let i1 = 0; i1 < l_block19; i1++) {
      ctx[`msg`] = k_block19[i1];
      const key1 = ctx['msg'].id;
      let b21, b22;
      let attr8 = 'msg-bubble '+ctx['msgClass'](ctx['msg']);
      let txt9 = ctx['authorName'](ctx['msg']);
      let txt10 = ctx['timeAgo'](ctx['msg'].date);
      b21 = safeOutput(ctx['bodyMarkup'](ctx['msg']));
      if (ctx['msg'].attachment_ids&&ctx['msg'].attachment_ids.length) {
        ctx = Object.create(ctx);
        const [k_block23, v_block23, l_block23, c_block23] = prepareList(ctx['msg'].attachment_ids);;
        for (let i2 = 0; i2 < l_block23; i2++) {
          ctx[`attId`] = k_block23[i2];
          const key2 = ctx['attId'];
          let attr9 = ctx['attId'];
          let hdlr9 = [ctx['onAttachmentClick'], ctx];
          let txt11 = ctx['getAttachmentName'](ctx['attId']);
          c_block23[i2] = withKey(block24([attr9, hdlr9, txt11]), key2);
        }
        ctx = ctx.__proto__;
        const b23 = list(c_block23);
        b22 = block22([], [b23]);
      }
      c_block19[i1] = withKey(block20([attr8, txt9, txt10], [b21, b22]), key1);
    }
    ctx = ctx.__proto__;
    b19 = list(c_block19);
    if (ctx['state'].selectedTask) {
      let b26, b29, b30, b31;
      let attr10 = ctx['state'].composeType==='comment'?'compose-tab active':'compose-tab';
      let hdlr10 = [ctx['onComposeTypeClick'], ctx];
      let attr11 = ctx['state'].composeType==='note'?'compose-tab active':'compose-tab';
      let hdlr11 = [ctx['onComposeTypeClick'], ctx];
      let attr12 = ctx['composeHint'];
      const bExpr2 = ctx['state'];
      const expr2 = 'composeText';
      let prop2 = bExpr2[expr2];
      let hdlr12 = [(ev) => { bExpr2[expr2] = ev.target.value; }];
      let hdlr13 = [ctx['handleComposeInput'], ctx];
      let hdlr14 = [ctx['handleComposeKeydown'], ctx];
      if (ctx['state'].mentionResults.length) {
        ctx = Object.create(ctx);
        const [k_block27, v_block27, l_block27, c_block27] = prepareList(ctx['state'].mentionResults);;
        for (let i1 = 0; i1 < l_block27; i1++) {
          ctx[`user`] = k_block27[i1];
          const key1 = ctx['user'].id;
          let attr13 = ctx['user'].id;
          let hdlr15 = [ctx['onMentionClick'], ctx];
          let txt12 = ctx['user'].name;
          c_block27[i1] = withKey(block28([attr13, hdlr15, txt12]), key1);
        }
        ctx = ctx.__proto__;
        const b27 = list(c_block27);
        b26 = block26([], [b27]);
      }
      if (ctx['state'].attachment) {
        let txt13 = ctx['state'].attachment.name;
        let hdlr16 = [ctx['clearAttachment'], ctx];
        b29 = block29([txt13, hdlr16]);
      }
      let hdlr17 = [ctx['pickAttachment'], ctx];
      let prop3 = new Boolean(ctx['state'].sending);
      let hdlr18 = [ctx['sendMessage'], ctx];
      let attr14 = ctx['state'].sending?'fa fa-cog fa-spin':'fa fa-send';
      if (ctx['state'].sending) {
        b30 = text(`Sending…`);
      } else {
        b31 = text(`Send (Ctrl+Enter)`);
      }
      b25 = block25([attr10, hdlr10, attr11, hdlr11, attr12, prop2, hdlr12, hdlr13, hdlr14, hdlr17, prop3, hdlr18, attr14], [b26, b29, b30, b31]);
    }
    return block1([prop1, hdlr1, txt5, hdlr3, hdlr4, hdlr5, hdlr6], [b2, b3, b4, b9, b10, b11, b16, b17, b18, b19, b25]);
  }
},

"PopupApp": function PopupApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { toNumber, prepareList, withKey } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit","href"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  
  let block2 = createBlock(`<div class="app-root"><!-- ── Loading screen ─────────────────────────────────────── --><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text">Loading current session and projects…</div><div class="loader-subtext">Please wait — or grab a cup of coffee ☕</div><i class="fa fa-cog fa-spin fa-5x"/></div></div><!-- ── Login screen ───────────────────────────────────────── --><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options</a></div></div><!-- ── Main timer view ────────────────────────────────────── --><div id="wrapper" block-attribute-2="class"><!-- Toolbar --><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change" block-handler-7="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><!-- Action bar --><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on the current item"><input id="auto_download_timesheet_input" type="checkbox" block-property-8="checked" block-handler-9="input" block-handler-10="change"/> Auto Download Current Item Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-11="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-12="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-13="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-14="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-15="click"/><!-- Messages icon with unread badge --><span class="msg-icon-wrap" title="Open Messages" block-handler-16="click"><i class="fa fa-comments fa-2x"/><span class="msg-unread-badge" block-attribute-17="style"><block-text-18/></span></span><!-- Screen recorder --><i class="fa fa-video-camera fa-2x" title="Record screen" block-handler-19="click"/><!-- Options --><a href="options_main_page.html" class="options-btn" title="Options"><i class="fa fa-cogs fa-2x"/></a><!-- Logs button (todo #4) --><i class="fa fa-bug fa-2x logs-btn" title="View Logs" block-handler-20="click"/></div></div></div><!-- Task / issue table --><div class="table-scroll"><table class="table table-responsive-sm table-bordered table-fixed" id="table-task-issues"><thead><tr><th class="action-col"><div><block-child-3/></div><block-child-4/><!-- placeholder child --></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-text-21/> [<block-text-22/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-23="checked" block-handler-24="input" block-handler-25="input"/> Show for everyone </label></th><block-child-5/><th class="project-col">Project</th></tr></thead><tbody><block-child-6/><block-child-6/><block-child-7/></tbody></table></div><!-- Footer info --><div class="info-footer mx-3"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <block-text-26/></span><br/><span><b>Host:</b> <block-text-27/></span><br/><span><b>OWL:</b> v<block-text-28/></span><br/><span><b>Database:</b> <block-text-29/></span><br/><span><b>Current User:</b> <block-text-30/></span><br/></div></div></div></div><!-- end #wrapper --></div>`);
  let block3 = createBlock(`<div><p class="odooError"><block-text-0/></p></div>`);
  let block4 = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning"> Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below and add one. </div></div>`);
  let block5 = createBlock(`<form block-handler-0="submit.prevent"><block-child-0/><block-child-1/><select id="remote-selection" class="form-control" block-handler-1="change"><block-child-2/></select><div class="checkbox"><label><input type="checkbox" block-property-2="checked" block-handler-3="input" block-handler-4="change"/> Use Existing Session </label></div><button class="login" type="submit"> Login <block-child-3/></button><block-child-4/></form>`);
  let block6 = createBlock(`<p class="odooError"><block-text-0/></p>`);
  let block8 = createBlock(`<input type="text" placeholder="Username" block-property-0="value" block-handler-1="input"/>`);
  let block9 = createBlock(`<div class="password-field"><input block-attribute-0="type" id="unique-password" placeholder="Password" block-property-1="value" block-handler-2="input"/><span class="pass-viewer" block-handler-3="click.prevent"><i class="fa" block-attribute-4="class"/></span></div>`);
  let block11 = createBlock(`<option block-attribute-0="value" block-property-1="selected"><block-text-2/></option>`);
  let block12 = createBlock(`<i class="fa fa-cog fa-spin"/>`);
  let block13 = createBlock(`<div class="remote-info small-note"> Host: <block-text-0/><span class="current-source-chip"><block-text-1/></span></div>`);
  let block14 = createBlock(`<span class="startTimeCount"><block-text-0/></span>`);
  let block17 = createBlock(`<th>Hours Spent</th>`);
  let block18 = createBlock(`<th>Remaining Hours</th>`);
  let block20 = createBlock(`<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/><!-- Timesheets button (todo #15, tasks only) --><block-child-2/></td><td class="priority-cell"><block-child-3/><block-child-4/></td><td class="stage-cell"><block-child-5/></td><td class="issue-desc-cell"><block-child-6/></td><block-child-7/><td class="project-cell"><block-child-8/></td></tr>`);
  let block21 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
  let block22 = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`);
  let block23 = createBlock(`<i class="fa fa-list-alt action-btn pointer text-info" title="View Timesheets for this task" block-handler-0="click"/>`);
  let block25 = createBlock(`<span class="fa fa-star checked"/>`);
  let block27 = createBlock(`<i class="fa fa-star-o"/>`);
  let block31 = createBlock(`<td><block-child-0/></td>`);
  let block33 = createBlock(`<td><block-child-0/></td>`);
  let block36 = createBlock(`<tr><td block-attribute-0="colspan" class="text-center text-danger"> No matching items are currently available </td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b3, b4, b5, b14, b15, b16, b19, b36;
    let attr1 = ctx['state'].view==='loading'?'':'hide';
    let attr2 = ctx['state'].view==='login'?'':'hide';
    if (ctx['state'].bootError) {
      let txt1 = ctx['state'].bootError;
      b3 = block3([txt1]);
    }
    if (!ctx['state'].remotes.length) {
      b4 = block4();
    }
    if (ctx['state'].remotes.length) {
      let b6, b7, b10, b12, b13;
      let hdlr1 = ["prevent", ctx['login'], ctx];
      if (ctx['state'].loginError) {
        let txt2 = ctx['state'].loginError;
        b6 = block6([txt2]);
      }
      if (!ctx['state'].useExistingSession) {
        const bExpr1 = ctx['state'];
        const expr1 = 'username';
        let prop1 = bExpr1[expr1];
        let hdlr2 = [(ev) => { bExpr1[expr1] = ev.target.value; }];
        const b8 = block8([prop1, hdlr2]);
        let attr3 = ctx['state'].showPassword?'text':'password';
        const bExpr2 = ctx['state'];
        const expr2 = 'password';
        let prop2 = bExpr2[expr2];
        let hdlr3 = [(ev) => { bExpr2[expr2] = ev.target.value; }];
        let hdlr4 = ["prevent", ctx['togglePassword'], ctx];
        let attr4 = ctx['state'].showPassword?'fa-eye-slash':'fa-eye';
        const b9 = block9([attr3, prop2, hdlr3, hdlr4, attr4]);
        b7 = multi([b8, b9]);
      }
      const v1 = ctx['state'];
      let hdlr5 = [(_ev)=>v1.selectedRemoteIndex=_ev.target.value, ctx];
      ctx = Object.create(ctx);
      const [k_block10, v_block10, l_block10, c_block10] = prepareList(ctx['state'].remotes);;
      for (let i1 = 0; i1 < l_block10; i1++) {
        ctx[`remote`] = k_block10[i1];
        const key1 = ctx['remote'].url+ctx['remote'].database;
        let attr5 = ctx['remote'].__index;
        let prop3 = new Boolean(ctx['state'].selectedRemoteIndex===ctx['remote'].__index);
        let txt3 = ctx['remote'].name;
        c_block10[i1] = withKey(block11([attr5, prop3, txt3]), key1);
      }
      ctx = ctx.__proto__;
      b10 = list(c_block10);
      const bExpr3 = ctx['state'];
      const expr3 = 'useExistingSession';
      let prop4 = bExpr3[expr3];
      let hdlr6 = [(ev) => { bExpr3[expr3] = ev.target.checked; }];
      let hdlr7 = [ctx['toggleUseExistingSession'], ctx];
      if (ctx['state'].loginLoading) {
        b12 = block12();
      }
      if (ctx['currentRemote']) {
        let txt4 = ctx['currentRemote'].url;
        let txt5 = ctx['currentRemote'].datasrc||'project.issue';
        b13 = block13([txt4, txt5]);
      }
      b5 = block5([hdlr1, hdlr5, prop4, hdlr6, hdlr7], [b6, b7, b10, b12, b13]);
    }
    let attr6 = ctx['state'].view==='main'?'':'hide';
    const bExpr4 = ctx['state'];
    const expr4 = 'searchQuery';
    let prop5 = bExpr4[expr4];
    let hdlr8 = [(ev) => { bExpr4[expr4] = ev.target.value; }];
    const bExpr5 = ctx['state'];
    const expr5 = 'limitTo';
    let prop6 = bExpr5[expr5];
    let hdlr9 = [(ev) => { bExpr5[expr5] = ev.target.value; }];
    const v2 = ctx['updateLimitPreference'];
    let hdlr10 = [(_ev)=>v2(_ev.target.value), ctx];
    const bExpr6 = ctx['state'];
    const expr6 = 'autoDownloadIssueTimesheet';
    let prop7 = bExpr6[expr6];
    let hdlr11 = [(ev) => { bExpr6[expr6] = ev.target.checked; }];
    let hdlr12 = [ctx['toggleAutoDownload'], ctx];
    let hdlr13 = [ctx['downloadCurrentMonthTimesheets'], ctx];
    let hdlr14 = [ctx['switchBetweenRemotes'], ctx];
    let hdlr15 = [ctx['refreshAll'], ctx];
    let hdlr16 = [ctx['resetTimer'], ctx];
    let hdlr17 = [ctx['logout'], ctx];
    let hdlr18 = [ctx['openMessages'], ctx];
    let attr7 = (ctx['state'].msgUnreadTotal||0)>0?'':'display:none';
    let txt6 = (ctx['state'].msgUnreadTotal||0)>99?'99+':ctx['String'](ctx['state'].msgUnreadTotal||'');
    let hdlr19 = [ctx['toggleRecording'], ctx];
    let hdlr20 = [ctx['openLogs'], ctx];
    if (ctx['state'].timerStartIso) {
      let txt7 = ctx['formattedTimer'];
      b14 = block14([txt7]);
    }
    if (null) {
      b15 = text(``);
    }
    let txt8 = ctx['itemLabelPlural'];
    let txt9 = ctx['String'](ctx['filteredIssues'].length);
    const bExpr7 = ctx['state'];
    const expr7 = 'allIssues';
    let prop8 = bExpr7[expr7];
    let hdlr21 = [(ev) => { bExpr7[expr7] = ev.target.checked; }];
    const v3 = ctx['updateShowAllPreference'];
    let hdlr22 = [(_ev)=>v3(_ev.target.checked), ctx];
    if (ctx['state'].dataSource==='project.task') {
      const b17 = block17();
      const b18 = block18();
      b16 = multi([b17, b18]);
    }
    if (ctx['filteredIssues'].length) {
      ctx = Object.create(ctx);
      const [k_block19, v_block19, l_block19, c_block19] = prepareList(ctx['filteredIssues']);;
      for (let i1 = 0; i1 < l_block19; i1++) {
        ctx[`ir`] = k_block19[i1];
        const key1 = ctx['ir'].id;
        let b21, b22, b23, b24, b26, b28, b29, b30, b35;
        let attr8 = ctx['state'].activeTimerId===ctx['ir'].id?'active-row':'';
        if (ctx['state'].activeTimerId===ctx['ir'].id) {
          const v4 = ctx['stopTimer'];
          const v5 = ctx['ir'];
          let hdlr23 = [()=>v4(v5), ctx];
          b21 = block21([hdlr23]);
        } else {
          const v6 = ctx['startTimer'];
          const v7 = ctx['ir'];
          let hdlr24 = [()=>v6(v7), ctx];
          b22 = block22([hdlr24]);
        }
        if (ctx['state'].dataSource==='project.task') {
          const v8 = ctx['openTimesheets'];
          const v9 = ctx['ir'];
          let hdlr25 = [()=>v8(v9), ctx];
          b23 = block23([hdlr25]);
        }
        ctx = Object.create(ctx);
        const [k_block24, v_block24, l_block24, c_block24] = prepareList(ctx['priorityStars'](ctx['ir'].priority));;
        for (let i2 = 0; i2 < l_block24; i2++) {
          ctx[`s`] = k_block24[i2];
          const key2 = ctx['s'];
          c_block24[i2] = withKey(block25(), key2);
        }
        ctx = ctx.__proto__;
        b24 = list(c_block24);
        ctx = Object.create(ctx);
        const [k_block26, v_block26, l_block26, c_block26] = prepareList(Array.from({length:3-ctx['priorityStars'](ctx['ir'].priority).length}));;
        for (let i2 = 0; i2 < l_block26; i2++) {
          ctx[`o`] = k_block26[i2];
          const key2 = ctx['o'];
          c_block26[i2] = withKey(block27(), key2);
        }
        ctx = ctx.__proto__;
        b26 = list(c_block26);
        b28 = comp1({text: ctx['ir'].stage_id&&ctx['ir'].stage_id[1]||'',limit: 14}, key + `__1__${key1}`, node, this, null);
        b29 = comp2({text: ctx['issueLabel'](ctx['ir']),limit: 60,href: ctx['issueHref'](ctx['ir'])}, key + `__2__${key1}`, node, this, null);
        if (ctx['state'].dataSource==='project.task') {
          const b32 = comp3({text: ctx['formatHours'](ctx['ir'].effective_hours),limit: 10}, key + `__3__${key1}`, node, this, null);
          const b31 = block31([], [b32]);
          const b34 = comp4({text: ctx['formatHours'](ctx['ir'].remaining_hours),limit: 10}, key + `__4__${key1}`, node, this, null);
          const b33 = block33([], [b34]);
          b30 = multi([b31, b33]);
        }
        b35 = comp5({text: ctx['ir'].project_id&&ctx['ir'].project_id[1]||'',limit: 22}, key + `__5__${key1}`, node, this, null);
        c_block19[i1] = withKey(block20([attr8], [b21, b22, b23, b24, b26, b28, b29, b30, b35]), key1);
      }
      ctx = ctx.__proto__;
      b19 = list(c_block19);
    } else {
      let attr9 = ctx['state'].dataSource==='project.task'?'9':'7';
      b36 = block36([attr9]);
    }
    let txt10 = ctx['state'].serverVersion||'N/A';
    let txt11 = ctx['state'].currentHost;
    let txt12 = ctx['owl'].__info__&&ctx['owl'].__info__.version||'?';
    let txt13 = ctx['state'].currentDatabase;
    let txt14 = ctx['state'].user&&ctx['state'].user.display_name||'—';
    const b2 = block2([attr1, attr2, attr6, prop5, hdlr8, prop6, hdlr9, hdlr10, prop7, hdlr11, hdlr12, hdlr13, hdlr14, hdlr15, hdlr16, hdlr17, hdlr18, attr7, txt6, hdlr19, hdlr20, txt8, txt9, prop8, hdlr21, hdlr22, txt10, txt11, txt12, txt13, txt14], [b3, b4, b5, b14, b15, b16, b19, b36]);
    const b37 = comment(` end .app-root `);
    return multi([b2, b37]);
  }
},

"ReadMore": function ReadMore(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  
  let block1 = createBlock(`<span class="readmore-inline"><block-child-0/><block-child-1/><block-child-2/></span>`);
  let block2 = createBlock(`<a block-attribute-0="href" class="remote-link" target="_blank" rel="noreferrer"><block-text-1/></a>`);
  let block4 = createBlock(`<a href="#" class="hmMoreClass" block-handler-0="click.prevent"><block-child-0/><block-child-1/></a>`);
  
  return function template(ctx, node, key = "") {
    let b2, b3, b4;
    if (ctx['props'].href) {
      let attr1 = ctx['props'].href;
      let txt1 = ctx['state'].expanded||!ctx['needsTrim']?(ctx['props'].text||''):ctx['shortText'];
      b2 = block2([attr1, txt1]);
    } else {
      b3 = text(ctx['state'].expanded||!ctx['needsTrim']?(ctx['props'].text||''):ctx['shortText']);
    }
    if (ctx['needsTrim']) {
      let b5, b6;
      let hdlr1 = ["prevent", ctx['toggle'], ctx];
      if (ctx['state'].expanded) {
        b5 = text(` ▲`);
      } else {
        b6 = text(` ...`);
      }
      b4 = block4([hdlr1], [b5, b6]);
    }
    return block1([], [b2, b3, b4]);
  }
},
 
}

// Added by cleanup packaging
globalThis.__THERP_TIMER_TEMPLATES__ = templates;
