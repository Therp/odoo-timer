export const templates = {
 "MessagesApp": function MessagesApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { prepareList, withKey, safeOutput } = helpers;
  
  let block1 = createBlock(`<div class="messages-layout"><!-- Sidebar --><aside class="messages-sidebar" id="tasksPane"><div class="messages-search"><input id="task-search" placeholder="Search tasks/issues..." block-property-0="value" block-handler-1="input"/></div><div class="task-list"><block-child-0/><block-child-1/><block-child-2/></div></aside><!-- Main pane --><main class="messages-main"><!-- Top bar --><div class="messages-topbar"><div class="messages-topbar-title"><div class="messages-title">Inbox</div><div class="messages-subtitle"><block-text-2/> unread · latest 10 per tracked item </div></div><div class="messages-top-actions"><button class="messages-btn" block-handler-3="click"><i class="fa fa-list"/><block-child-3/><block-child-4/></button><button class="messages-btn" block-handler-4="click"><i class="fa fa-external-link"/> Open in Odoo </button><button class="messages-btn" block-handler-5="click"><i class="fa fa-check"/> Read all </button><button class="messages-btn" block-handler-6="click"><i class="fa fa-refresh"/> Refresh </button></div></div><!-- Thread header --><block-child-5/><!-- Message thread --><div class="messages-thread" id="messages-list"><block-child-6/><block-child-7/><block-child-8/><block-child-9/></div><!-- Compose box --><block-child-10/></main></div>`);
  let block2 = createBlock(`<div class="tasks-empty"><i class="fa fa-cog fa-spin"/> Loading…</div>`);
  let block3 = createBlock(`<div class="tasks-empty">No matching tasks or issues.</div>`);
  let block5 = createBlock(`<div block-attribute-0="class" block-attribute-1="data-task-id" block-handler-2="click"><div class="task-title"><block-child-0/><block-child-1/><block-text-3/></div><div class="task-meta"><span class="task-badge"><i class="fa fa-folder-open-o"/><block-text-4/></span><span><block-text-5/></span><block-child-2/></div></div>`);
  let block6 = createBlock(`<span class="badge-follower">👁 Following</span>`);
  let block7 = createBlock(`<span class="badge-assigned">👤 Assigned</span>`);
  let block8 = createBlock(`<span class="msg-unread-badge"><block-text-0/></span>`);
  let block11 = createBlock(`<div class="message-thread-header"><div class="message-thread-title"><a href="#" block-handler-0="click.prevent"><block-text-1/></a><block-child-0/><block-child-1/></div><div class="message-legend"><button class="filter-chip" block-attribute-2="class" data-filter="all" block-handler-3="click"><span class="dot"/> All </button><button class="filter-chip" block-attribute-4="class" data-filter="comment" block-handler-5="click"><span class="dot"/> Comments </button><button class="filter-chip" block-attribute-6="class" data-filter="note" block-handler-7="click"><span class="dot"/> Notes </button></div></div>`);
  let block12 = createBlock(`<span class="badge-follower" style="margin-left:8px;">👁 Following</span>`);
  let block13 = createBlock(`<span class="badge-assigned" style="margin-left:8px;">👤 Assigned</span>`);
  let block14 = createBlock(`<div style="padding:32px;text-align:center;color:#94a3b8;"><i class="fa fa-cog fa-spin fa-2x"/></div>`);
  let block15 = createBlock(`<div style="padding:32px;text-align:center;color:#94a3b8;"> No messages found. </div>`);
  let block16 = createBlock(`<div style="padding:32px;text-align:center;color:#94a3b8;"> Select a task from the sidebar to view messages. </div>`);
  let block18 = createBlock(`<div block-attribute-0="class"><div class="msg-header"><span class="msg-author"><block-text-1/></span><span class="msg-time"><block-text-2/></span></div><div class="msg-body"><block-child-0/></div><block-child-1/></div>`);
  let block20 = createBlock(`<div class="msg-attachments"><block-child-0/></div>`);
  let block22 = createBlock(`<span class="att-chip" block-attribute-0="data-att-id" block-handler-1="click"><i class="fa fa-paperclip"/><block-text-2/></span>`);
  let block23 = createBlock(`<div class="messages-compose"><div class="compose-tabs"><button block-attribute-0="class" data-compose-type="comment" block-handler-1="click"><i class="fa fa-comment"/> Comment </button><button block-attribute-2="class" data-compose-type="note" block-handler-3="click"><i class="fa fa-sticky-note-o"/> Note </button></div><div style="position:relative;"><textarea id="compose-text" block-attribute-4="placeholder" block-property-5="value" rows="3" block-handler-6="input" block-handler-7="keydown"/><block-child-0/></div><div class="compose-actions"><block-child-1/><button class="messages-btn" block-handler-8="click"><i class="fa fa-paperclip"/> Attach </button><button class="messages-btn send-btn" block-property-9="disabled" block-handler-10="click"><i block-attribute-11="class"/><block-child-2/><block-child-3/></button></div></div>`);
  let block24 = createBlock(`<div class="mention-dropdown"><block-child-0/></div>`);
  let block26 = createBlock(`<div class="mention-item" block-attribute-0="data-user-id" block-handler-1="click"><block-text-2/></div>`);
  let block27 = createBlock(`<span class="att-chip"><i class="fa fa-paperclip"/><block-text-0/><i class="fa fa-times" style="cursor:pointer;margin-left:4px;" block-handler-1="click"/></span>`);
  
  return function template(ctx, node, key = "") {
    let b2, b3, b4, b9, b10, b11, b14, b15, b16, b17, b23;
    let prop1 = new String((ctx['state'].taskSearch) === 0 ? 0 : ((ctx['state'].taskSearch) || ""));
    const v1 = ctx['state'];
    let hdlr1 = [(_ev)=>{v1.taskSearch=_ev.target.value;}, ctx];
    if (ctx['state'].loading) {
      b2 = block2();
    } else if (!ctx['visibleTasks'].length) {
      b3 = block3();
    }
    ctx = Object.create(ctx);
    const [k_block4, v_block4, l_block4, c_block4] = prepareList(ctx['visibleTasks']);;
    for (let i1 = 0; i1 < l_block4; i1++) {
      ctx[`task`] = k_block4[i1];
      const key1 = ctx['task'].id;
      let b6, b7, b8;
      let attr1 = ctx['state'].selectedTask&&ctx['task'].id===ctx['state'].selectedTask.id?'task-card active':'task-card';
      let attr2 = ctx['task'].id;
      let hdlr2 = [ctx['onTaskItemClick'], ctx];
      if (ctx['task'].followerType==='follower') {
        b6 = block6();
      } else {
        b7 = block7();
      }
      let txt1 = ctx['task'].name;
      let txt2 = ctx['normalizeText'](ctx['task'].project_id)||'No project';
      let txt3 = ctx['normalizeText'](ctx['task'].stage_id)||'';
      if ((ctx['state'].unreadMap[ctx['task'].id]||0)>0) {
        let txt4 = ctx['state'].unreadMap[ctx['task'].id];
        b8 = block8([txt4]);
      }
      c_block4[i1] = withKey(block5([attr1, attr2, hdlr2, txt1, txt2, txt3], [b6, b7, b8]), key1);
    }
    ctx = ctx.__proto__;
    b4 = list(c_block4);
    let txt5 = ctx['totalUnread'];
    let hdlr3 = [ctx['toggleShowAll'], ctx];
    if (ctx['state'].showAllTasks) {
      b9 = text(`My Tasks`);
    } else {
      b10 = text(`All Tasks`);
    }
    let hdlr4 = [ctx['openTaskInBrowser'], ctx];
    let hdlr5 = [ctx['markAllRead'], ctx];
    let hdlr6 = [ctx['refreshMessages'], ctx];
    if (ctx['state'].selectedTask) {
      let b12, b13;
      let hdlr7 = ["prevent", ctx['openTaskInBrowser'], ctx];
      let txt6 = ctx['state'].selectedTask.name;
      if (ctx['state'].selectedTask.followerType==='follower') {
        b12 = block12();
      } else {
        b13 = block13();
      }
      let attr3 = ctx['filterAllClass'];
      let hdlr8 = [ctx['onFilterClick'], ctx];
      let attr4 = ctx['filterCommentClass'];
      let hdlr9 = [ctx['onFilterClick'], ctx];
      let attr5 = ctx['filterNoteClass'];
      let hdlr10 = [ctx['onFilterClick'], ctx];
      b11 = block11([hdlr7, txt6, attr3, hdlr8, attr4, hdlr9, attr5, hdlr10], [b12, b13]);
    }
    if (ctx['state'].loadingMessages) {
      b14 = block14();
    } else if (!ctx['filteredMessages'].length&&ctx['state'].selectedTask) {
      b15 = block15();
    } else if (!ctx['state'].selectedTask) {
      b16 = block16();
    }
    ctx = Object.create(ctx);
    const [k_block17, v_block17, l_block17, c_block17] = prepareList(ctx['filteredMessages']);;
    for (let i1 = 0; i1 < l_block17; i1++) {
      ctx[`msg`] = k_block17[i1];
      const key1 = ctx['msg'].id;
      let b19, b20;
      let attr6 = 'msg-bubble '+ctx['msgClass'](ctx['msg']);
      let txt7 = ctx['authorName'](ctx['msg']);
      let txt8 = ctx['timeAgo'](ctx['msg'].date);
      b19 = safeOutput(ctx['bodyMarkup'](ctx['msg']));
      if (ctx['msg'].attachment_ids&&ctx['msg'].attachment_ids.length) {
        ctx = Object.create(ctx);
        const [k_block21, v_block21, l_block21, c_block21] = prepareList(ctx['msg'].attachment_ids);;
        for (let i2 = 0; i2 < l_block21; i2++) {
          ctx[`attId`] = k_block21[i2];
          const key2 = ctx['attId'];
          let attr7 = ctx['attId'];
          let hdlr11 = [ctx['onAttachmentClick'], ctx];
          let txt9 = ctx['getAttachmentName'](ctx['attId']);
          c_block21[i2] = withKey(block22([attr7, hdlr11, txt9]), key2);
        }
        ctx = ctx.__proto__;
        const b21 = list(c_block21);
        b20 = block20([], [b21]);
      }
      c_block17[i1] = withKey(block18([attr6, txt7, txt8], [b19, b20]), key1);
    }
    ctx = ctx.__proto__;
    b17 = list(c_block17);
    if (ctx['state'].selectedTask) {
      let b24, b27, b28, b29;
      let attr8 = ctx['composeCommentClass'];
      let hdlr12 = [ctx['onComposeTypeClick'], ctx];
      let attr9 = ctx['composeNoteClass'];
      let hdlr13 = [ctx['onComposeTypeClick'], ctx];
      let attr10 = ctx['composeHint'];
      let prop2 = new String((ctx['state'].composeText) === 0 ? 0 : ((ctx['state'].composeText) || ""));
      let hdlr14 = [ctx['handleComposeInput'], ctx];
      let hdlr15 = [ctx['handleComposeKeydown'], ctx];
      if (ctx['state'].mentionResults.length) {
        ctx = Object.create(ctx);
        const [k_block25, v_block25, l_block25, c_block25] = prepareList(ctx['state'].mentionResults);;
        for (let i1 = 0; i1 < l_block25; i1++) {
          ctx[`user`] = k_block25[i1];
          const key1 = ctx['user'].id;
          let attr11 = ctx['user'].id;
          let hdlr16 = [ctx['onMentionClick'], ctx];
          let txt10 = ctx['user'].name;
          c_block25[i1] = withKey(block26([attr11, hdlr16, txt10]), key1);
        }
        ctx = ctx.__proto__;
        const b25 = list(c_block25);
        b24 = block24([], [b25]);
      }
      if (ctx['state'].attachment) {
        let txt11 = ctx['state'].attachment.name;
        let hdlr17 = [ctx['clearAttachment'], ctx];
        b27 = block27([txt11, hdlr17]);
      }
      let hdlr18 = [ctx['pickAttachment'], ctx];
      let prop3 = new Boolean(ctx['state'].sending);
      let hdlr19 = [ctx['sendMessage'], ctx];
      let attr12 = ctx['state'].sending?'fa fa-cog fa-spin':'fa fa-send';
      if (ctx['state'].sending) {
        b28 = text(`Sending…`);
      } else {
        b29 = text(`Send (Ctrl+Enter)`);
      }
      b23 = block23([attr8, hdlr12, attr9, hdlr13, attr10, prop2, hdlr14, hdlr15, hdlr18, prop3, hdlr19, attr12], [b24, b27, b28, b29]);
    }
    return block1([prop1, hdlr1, txt5, hdlr3, hdlr4, hdlr5, hdlr6], [b2, b3, b4, b9, b10, b11, b14, b15, b16, b17, b23]);
  }
},

"PopupApp": function PopupApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { prepareList, withKey } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit","href"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  
  let block1 = createBlock(`<div class="app-root"><!-- Loading --><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text">Loading current session and projects…</div><div class="loader-subtext">Please wait — or grab a cup of coffee ☕</div><i class="fa fa-cog fa-spin fa-5x"/></div></div><!-- Login --><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options</a></div></div><!-- Main --><div id="wrapper" block-attribute-2="class"><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on the current item"><input id="auto_download_timesheet_input" type="checkbox" block-property-7="checked" block-handler-8="change"/> Auto Download Current Item Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-9="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-10="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-11="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-12="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-13="click"/><span class="msg-icon-wrap" title="Open Messages" block-handler-14="click"><i class="fa fa-comments fa-2x"/><span class="msg-unread-badge" block-attribute-15="style"><block-text-16/></span></span><i class="fa fa-video-camera fa-2x" title="Record screen" block-handler-17="click"/><a href="options_main_page.html" class="options-btn" title="Options"><i class="fa fa-cogs fa-2x"/></a><i class="fa fa-bug fa-2x logs-btn" title="View Logs" block-handler-18="click"/></div></div></div><div class="table-scroll"><table class="table table-responsive-sm table-bordered table-fixed" id="table-task-issues"><thead><tr><th class="action-col"><div><block-child-3/></div></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-text-19/> [<block-text-20/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-21="checked" block-handler-22="input"/> Show for everyone </label></th><block-child-4/><th class="project-col">Project</th></tr></thead><tbody><block-child-5/><block-child-5/><block-child-6/></tbody></table></div><div class="info-footer mx-3"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <block-text-23/></span><br/><span><b>Host:</b> <block-text-24/></span><br/><span><b>OWL:</b> <block-text-25/></span><br/><span><b>Database:</b> <block-text-26/></span><br/><span><b>Current User:</b><block-text-27/></span><br/></div></div></div></div></div>`);
  let block2 = createBlock(`<div><p class="odooError"><block-text-0/></p></div>`);
  let block3 = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning"> Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below and add one. </div></div>`);
  let block4 = createBlock(`<form block-handler-0="submit.prevent"><block-child-0/><block-child-1/><select id="remote-selection" class="form-control" block-handler-1="change"><block-child-2/></select><div class="checkbox"><label><input type="checkbox" block-property-2="checked" block-handler-3="change"/> Use Existing Session </label></div><button class="login" type="submit"> Login <block-child-3/></button><block-child-4/></form>`);
  let block5 = createBlock(`<p class="odooError"><block-text-0/></p>`);
  let block7 = createBlock(`<input type="text" placeholder="Username" block-property-0="value" block-handler-1="input"/>`);
  let block8 = createBlock(`<div class="password-field"><input block-attribute-0="type" id="unique-password" placeholder="Password" block-property-1="value" block-handler-2="input"/><span class="pass-viewer" block-handler-3="click.prevent"><i class="fa" block-attribute-4="class"/></span></div>`);
  let block10 = createBlock(`<option block-attribute-0="value" block-property-1="selected"><block-text-2/></option>`);
  let block11 = createBlock(`<i class="fa fa-cog fa-spin"/>`);
  let block12 = createBlock(`<div class="remote-info small-note"> Host: <block-text-0/><span class="current-source-chip"><block-text-1/></span></div>`);
  let block13 = createBlock(`<span class="startTimeCount"><block-text-0/></span>`);
  let block15 = createBlock(`<th>Hours Spent</th>`);
  let block16 = createBlock(`<th>Remaining Hours</th>`);
  let block18 = createBlock(`<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/></td><td class="priority-cell"><block-child-2/><block-child-3/></td><td class="stage-cell"><block-child-4/></td><td class="issue-desc-cell"><block-child-5/></td><block-child-6/><td class="project-cell"><block-child-7/></td></tr>`);
  let block19 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
  let block20 = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`);
  let block22 = createBlock(`<span class="fa fa-star checked"/>`);
  let block24 = createBlock(`<i class="fa fa-star-o"/>`);
  let block28 = createBlock(`<td class="hours-spent-cell"><div class="hours-cell-inner"><block-child-0/><i class="fa fa-list-alt pointer" title="View Timesheets for this task" block-handler-0="click"/></div></td>`);
  let block30 = createBlock(`<td><block-child-0/></td>`);
  let block33 = createBlock(`<tr><td block-attribute-0="colspan" class="text-center text-danger"> No matching items are currently available </td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b3, b4, b13, b14, b17, b33;
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
      let b5, b6, b9, b11, b12;
      let hdlr1 = ["prevent", ctx['login'], ctx];
      if (ctx['state'].loginError) {
        let txt2 = ctx['state'].loginError;
        b5 = block5([txt2]);
      }
      if (!ctx['state'].useExistingSession) {
        let prop1 = new String((ctx['state'].username) === 0 ? 0 : ((ctx['state'].username) || ""));
        const v1 = ctx['state'];
        let hdlr2 = [(_ev)=>{v1.username=_ev.target.value;}, ctx];
        const b7 = block7([prop1, hdlr2]);
        let attr3 = ctx['state'].showPassword?'text':'password';
        let prop2 = new String((ctx['state'].password) === 0 ? 0 : ((ctx['state'].password) || ""));
        const v2 = ctx['state'];
        let hdlr3 = [(_ev)=>{v2.password=_ev.target.value;}, ctx];
        let hdlr4 = ["prevent", ctx['togglePassword'], ctx];
        let attr4 = ctx['state'].showPassword?'fa-eye-slash':'fa-eye';
        const b8 = block8([attr3, prop2, hdlr3, hdlr4, attr4]);
        b6 = multi([b7, b8]);
      }
      const v3 = ctx['state'];
      const v4 = ctx['Number'];
      let hdlr5 = [(_ev)=>{v3.selectedRemoteIndex=v4(_ev.target.value);}, ctx];
      ctx = Object.create(ctx);
      const [k_block9, v_block9, l_block9, c_block9] = prepareList(ctx['state'].remotes);;
      for (let i1 = 0; i1 < l_block9; i1++) {
        ctx[`remote`] = k_block9[i1];
        const key1 = ctx['remote'].url+ctx['remote'].database;
        let attr5 = ctx['remote'].__index;
        let prop3 = new Boolean(ctx['state'].selectedRemoteIndex===ctx['remote'].__index);
        let txt3 = ctx['remote'].name;
        c_block9[i1] = withKey(block10([attr5, prop3, txt3]), key1);
      }
      ctx = ctx.__proto__;
      b9 = list(c_block9);
      let prop4 = new Boolean(ctx['state'].useExistingSession);
      let hdlr6 = [ctx['toggleUseExistingSession'], ctx];
      if (ctx['state'].loginLoading) {
        b11 = block11();
      }
      if (ctx['currentRemote']) {
        let txt4 = ctx['currentRemote'].url;
        let txt5 = ctx['currentRemote'].datasrc||'project.issue';
        b12 = block12([txt4, txt5]);
      }
      b4 = block4([hdlr1, hdlr5, prop4, hdlr6], [b5, b6, b9, b11, b12]);
    }
    let attr6 = ctx['state'].view==='main'?'':'hide';
    let prop5 = new String((ctx['state'].searchQuery) === 0 ? 0 : ((ctx['state'].searchQuery) || ""));
    const v5 = ctx['state'];
    let hdlr7 = [(_ev)=>{v5.searchQuery=_ev.target.value;}, ctx];
    let prop6 = new String((ctx['state'].limitTo) === 0 ? 0 : ((ctx['state'].limitTo) || ""));
    const v6 = ctx['updateLimitPreference'];
    let hdlr8 = [(_ev)=>v6(_ev.target.value), ctx];
    let prop7 = new Boolean(ctx['state'].autoDownloadIssueTimesheet);
    let hdlr9 = [ctx['toggleAutoDownload'], ctx];
    let hdlr10 = [ctx['downloadCurrentMonthTimesheets'], ctx];
    let hdlr11 = [ctx['switchBetweenRemotes'], ctx];
    let hdlr12 = [ctx['refreshAll'], ctx];
    let hdlr13 = [ctx['resetTimer'], ctx];
    let hdlr14 = [ctx['logout'], ctx];
    let hdlr15 = [ctx['openMessages'], ctx];
    let attr7 = (ctx['state'].msgUnreadTotal||0)>0?'':'display:none';
    let txt6 = (ctx['state'].msgUnreadTotal||0)>99?'99+':ctx['String'](ctx['state'].msgUnreadTotal||'');
    let hdlr16 = [ctx['toggleRecording'], ctx];
    let hdlr17 = [ctx['openLogs'], ctx];
    if (ctx['state'].timerStartIso) {
      let txt7 = ctx['formattedTimer'];
      b13 = block13([txt7]);
    }
    let txt8 = ctx['itemLabelPlural'];
    let txt9 = ctx['String'](ctx['filteredIssues'].length);
    let prop8 = new Boolean(ctx['state'].allIssues);
    const v7 = ctx['updateShowAllPreference'];
    let hdlr18 = [(_ev)=>v7(_ev.target.checked), ctx];
    if (ctx['state'].dataSource==='project.task') {
      const b15 = block15();
      const b16 = block16();
      b14 = multi([b15, b16]);
    }
    if (ctx['filteredIssues'].length) {
      ctx = Object.create(ctx);
      const [k_block17, v_block17, l_block17, c_block17] = prepareList(ctx['filteredIssues']);;
      for (let i1 = 0; i1 < l_block17; i1++) {
        ctx[`ir`] = k_block17[i1];
        const key1 = ctx['ir'].id;
        let b19, b20, b21, b23, b25, b26, b27, b32;
        let attr8 = ctx['state'].activeTimerId===ctx['ir'].id?'active-row':'';
        if (ctx['state'].activeTimerId===ctx['ir'].id) {
          const v8 = ctx['stopTimer'];
          const v9 = ctx['ir'];
          let hdlr19 = [()=>v8(v9), ctx];
          b19 = block19([hdlr19]);
        } else {
          const v10 = ctx['startTimer'];
          const v11 = ctx['ir'];
          let hdlr20 = [()=>v10(v11), ctx];
          b20 = block20([hdlr20]);
        }
        ctx = Object.create(ctx);
        const [k_block21, v_block21, l_block21, c_block21] = prepareList(ctx['priorityStarsArr'](ctx['ir'].priority));;
        for (let i2 = 0; i2 < l_block21; i2++) {
          ctx[`s`] = k_block21[i2];
          const key2 = ctx['s'];
          c_block21[i2] = withKey(block22(), key2);
        }
        ctx = ctx.__proto__;
        b21 = list(c_block21);
        ctx = Object.create(ctx);
        const [k_block23, v_block23, l_block23, c_block23] = prepareList(ctx['priorityOutlineArr'](ctx['ir'].priority));;
        for (let i2 = 0; i2 < l_block23; i2++) {
          ctx[`o`] = k_block23[i2];
          const key2 = ctx['o'];
          c_block23[i2] = withKey(block24(), key2);
        }
        ctx = ctx.__proto__;
        b23 = list(c_block23);
        b25 = comp1({text: (ctx['ir'].stage_id&&ctx['ir'].stage_id[1])||'',limit: 14}, key + `__1__${key1}`, node, this, null);
        b26 = comp2({text: ctx['issueLabel'](ctx['ir']),limit: 60,href: ctx['issueHref'](ctx['ir'])}, key + `__2__${key1}`, node, this, null);
        if (ctx['state'].dataSource==='project.task') {
          const b29 = comp3({text: ctx['formatHours'](ctx['ir'].effective_hours),limit: 10}, key + `__3__${key1}`, node, this, null);
          const v12 = ctx['openTimesheets'];
          const v13 = ctx['ir'];
          let hdlr21 = [()=>v12(v13), ctx];
          const b28 = block28([hdlr21], [b29]);
          const b31 = comp4({text: ctx['formatHours'](ctx['ir'].remaining_hours),limit: 10}, key + `__4__${key1}`, node, this, null);
          const b30 = block30([], [b31]);
          b27 = multi([b28, b30]);
        }
        b32 = comp5({text: (ctx['ir'].project_id&&ctx['ir'].project_id[1])||'',limit: 22}, key + `__5__${key1}`, node, this, null);
        c_block17[i1] = withKey(block18([attr8], [b19, b20, b21, b23, b25, b26, b27, b32]), key1);
      }
      ctx = ctx.__proto__;
      b17 = list(c_block17);
    } else {
      let attr9 = ctx['state'].dataSource==='project.task'?'7':'6';
      b33 = block33([attr9]);
    }
    let txt10 = ctx['state'].serverVersion||'N/A';
    let txt11 = ctx['state'].currentHost;
    let txt12 = ctx['owlVersion'];
    let txt13 = ctx['state'].currentDatabase;
    let txt14 = (ctx['state'].user&&ctx['state'].user.display_name)||'—';
    return block1([attr1, attr2, attr6, prop5, hdlr7, prop6, hdlr8, prop7, hdlr9, hdlr10, hdlr11, hdlr12, hdlr13, hdlr14, hdlr15, attr7, txt6, hdlr16, hdlr17, txt8, txt9, prop8, hdlr18, txt10, txt11, txt12, txt13, txt14], [b2, b3, b4, b13, b14, b17, b33]);
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
      let txt1 = (ctx['state'].expanded||!ctx['needsTrim'])?(ctx['props'].text||''):ctx['shortText'];
      b2 = block2([attr1, txt1]);
    } else {
      b3 = text((ctx['state'].expanded||!ctx['needsTrim'])?(ctx['props'].text||''):ctx['shortText']);
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