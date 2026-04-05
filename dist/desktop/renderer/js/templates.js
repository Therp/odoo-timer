export const templates = {
 "MessagesApp": function MessagesApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { prepareList, safeOutput, withKey } = helpers;
  
  let block1 = createBlock(`<div class="messages-layout"><aside class="messages-sidebar" id="tasksPane"><div class="messages-search"><input id="task-search" placeholder="Search tasks/issues..." block-property-0="value"/></div><div class="task-list"><block-child-0/><block-child-0/><block-child-1/></div></aside><main class="messages-main"><div class="messages-topbar"><div class="messages-topbar-title"><div class="messages-title">Inbox</div><div class="messages-subtitle"><block-child-2/> unread recent messages · latest 10 per tracked item · checking every <block-child-3/>s</div></div><div class="messages-top-actions"><button class="messages-btn" id="show-tasks-btn"><i class="fa fa-list"/> Tasks</button><button class="messages-btn" id="back-to-timer-btn"><i class="fa fa-clock-o"/> Back To Timer</button><button class="messages-btn" id="mark-task-read"><i class="fa fa-check"/> Read all</button><button class="messages-btn" id="refresh-messages"><i class="fa fa-refresh"/> Refresh</button></div></div><div class="message-thread-header"><div class="message-thread-title compact-title"><block-child-4/><block-child-5/></div><div class="messages-subtitle"><block-child-6/><block-child-7/></div><div class="message-legend"><block-child-8/></div></div><div class="messages-thread"/></main></div>`);
  let block3 = createBlock(`<div class="task-card" block-attribute-0="class" block-attribute-1="data-task-id"><div class="task-title"><block-child-0/></div><div class="task-meta"><span class="task-badge"><i class="fa fa-folder-open-o"/><block-child-1/></span><span><block-child-2/></span><span><block-child-3/></span></div></div>`);
  let block8 = createBlock(`<div class="tasks-empty">No matching tasks or issues.</div>`);
  let block11 = createBlock(`<a href="#" id="task-title-link"><block-child-0/></a>`);
  let block20 = createBlock(`<button class="filter-chip" block-attribute-0="class" block-attribute-1="data-filter"><span class="dot" block-attribute-2="style"/><block-child-0/></button>`);
  
  return function template(ctx, node, key = "") {
    let b2, b8, b9, b10, b11, b13, b14, b18, b19;
    let prop1 = new String((ctx['state'].search) === 0 ? 0 : ((ctx['state'].search) || ""));
    if (ctx['state'].tasks.length) {
      ctx = Object.create(ctx);
      const [k_block2, v_block2, l_block2, c_block2] = prepareList(ctx['state'].tasks);;
      for (let i1 = 0; i1 < l_block2; i1++) {
        ctx[`task`] = k_block2[i1];
        const key1 = ctx['task'].id;
        let attr1 = ctx['task'].id===ctx['state'].selectedTaskId?'task-card active':'task-card';
        let attr2 = ctx['task'].id;
        const b4 = safeOutput(ctx['issueLabel'](ctx['state'].dataSource,ctx['task']));
        const b5 = safeOutput(ctx['normalizeText'](ctx['task'].project_id)||'No project');
        const b6 = safeOutput(ctx['normalizeText'](ctx['task'].stage_id)||'No stage');
        const b7 = safeOutput(ctx['normalizeText'](ctx['task'].user_id)||'Unassigned');
        c_block2[i1] = withKey(block3([attr1, attr2], [b4, b5, b6, b7]), key1);
      }
      ctx = ctx.__proto__;
      b2 = list(c_block2);
    } else {
      b8 = block8();
    }
    b9 = safeOutput(ctx['state'].messageTotal);
    b10 = safeOutput(ctx['state'].polling);
    if (ctx['currentTask']()) {
      const b12 = safeOutput(ctx['issueLabel'](ctx['state'].dataSource,ctx['currentTask']()));
      b11 = block11([], [b12]);
    } else {
      b13 = text(`Select a task or issue`);
    }
    if (ctx['currentTask']()) {
      const b15 = safeOutput(ctx['normalizeText'](ctx['currentTask']().project_id)||'No project');
      const b16 = text(` · `);
      const b17 = safeOutput(ctx['normalizeText'](ctx['currentTask']().stage_id)||'No stage');
      b14 = multi([b15, b16, b17]);
    } else {
      b18 = text(`Choose a task from the left pane`);
    }
    ctx = Object.create(ctx);
    const [k_block19, v_block19, l_block19, c_block19] = prepareList(Object.entries(ctx['TYPE_META']));;
    for (let i1 = 0; i1 < l_block19; i1++) {
      ctx[`entry`] = k_block19[i1];
      const key1 = ctx['entry'][0];
      let attr3 = ctx['state'].filter===ctx['entry'][0]?'filter-chip active':'filter-chip';
      let attr4 = ctx['entry'][0];
      let attr5 = 'background:'+ctx['entry'][1].color;
      const b21 = safeOutput(ctx['entry'][1].label);
      c_block19[i1] = withKey(block20([attr3, attr4, attr5], [b21]), key1);
    }
    ctx = ctx.__proto__;
    b19 = list(c_block19);
    return block1([prop1], [b2, b8, b9, b10, b11, b13, b14, b18, b19]);
  }
},

"MessagesApp": function MessagesApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { prepareList, safeOutput, withKey } = helpers;
  
  let block1 = createBlock(`<div id="root"><!-- Sidebar --><aside class="sidebar"><div class="sidebar-header"><span class="sidebar-title"><i class="fa fa-comments"/> Messages </span><input id="task-search" type="text" placeholder="Filter tasks…" block-property-0="value" block-handler-1="input"/><label class="show-all-label"><input id="show-all-checkbox" type="checkbox" block-property-2="checked" block-handler-3="change"/> Show all tasks </label></div><div id="task-list"><block-child-0/><block-child-1/><block-child-2/><block-child-2/></div></aside><!-- Chat pane --><main class="chat-pane"><!-- No task selected --><block-child-3/><block-child-4/></main></div>`);
  let block2 = createBlock(`<div class="empty-state"><i class="fa fa-spinner fa-spin"/> Loading… </div>`);
  let block3 = createBlock(`<div class="empty-state"><block-child-0/><block-child-1/></div>`);
  let block6 = createBlock(`<br/>`);
  let block7 = createBlock(`<small>Check "Show all tasks" to see more.</small>`);
  let block10 = createBlock(`<div block-attribute-0="class" block-attribute-1="data-task-id" block-handler-2="click"><div class="task-item-main"><span class="task-item-name"><block-child-0/></span><block-child-1/></div><block-child-2/></div>`);
  let block12 = createBlock(`<span class="unread-badge" block-attribute-0="title"><block-child-0/></span>`);
  let block14 = createBlock(`<span class="task-project"><block-child-0/></span>`);
  let block16 = createBlock(`<div class="no-selection"><i class="fa fa-comments fa-4x"/><p>Select a task from the sidebar to view its messages</p><p class="no-sel-hint"> Showing recent <strong>10</strong> messages per task </p></div>`);
  let block18 = createBlock(`<div class="chat-view"><!-- Header --><div class="chat-header"><div class="chat-header-top"><a class="task-title-link" href="#" block-handler-0="click.prevent"> #<block-child-0/> — <block-child-1/></a><block-child-2/><div class="header-actions"><block-child-3/><button title="Refresh" block-handler-1="click"><i class="fa fa-refresh"/></button></div></div><div class="filter-bar"><button block-attribute-2="class" data-filter="all" block-handler-3="click">All</button><button block-attribute-4="class" data-filter="comment" block-handler-5="click">Public</button><button block-attribute-6="class" data-filter="note" block-handler-7="click">Internal</button><div class="legend"><span class="dot dot-comment"/> Public <span class="dot dot-note"/> Internal <span class="dot dot-system"/> System </div></div></div><!-- Messages list --><div class="messages-list" id="messages-list"><block-child-4/><block-child-5/><block-child-6/><block-child-6/></div><!-- Compose --><div class="compose"><div class="compose-type-tabs"><button block-attribute-8="class" data-compose-type="comment" block-handler-9="click"><i class="fa fa-globe"/> Message </button><button block-attribute-10="class" data-compose-type="note" block-handler-11="click"><i class="fa fa-lock"/> Internal Note </button></div><block-child-7/><div class="compose-body"><textarea id="compose-text" rows="3" placeholder="Write a message… type @ to mention someone (Ctrl+Enter to send)" block-property-12="value" block-handler-13="input" block-handler-14="keydown"/><block-child-8/></div><div class="compose-footer"><button id="attach-btn" title="Attach file" block-handler-15="click"><i class="fa fa-paperclip"/></button><span class="compose-hint"><block-child-9/></span><button class="send-btn" block-property-16="disabled" block-handler-17="click"><block-child-10/><block-child-11/></button></div></div></div>`);
  let block21 = createBlock(`<span class="unread-info-badge"><block-child-0/> new </span>`);
  let block23 = createBlock(`<button class="mark-read-btn" block-handler-0="click"><i class="fa fa-check-double"/> Mark all read </button>`);
  let block24 = createBlock(`<div class="loading-msg"><i class="fa fa-spinner fa-spin"/> Loading… </div>`);
  let block25 = createBlock(`<div class="empty-state">No messages match this filter</div>`);
  let block27 = createBlock(`<div block-attribute-0="class"><div class="msg-meta"><span class="msg-author"><block-child-0/></span><span class="msg-time" block-attribute-1="title"><block-child-1/></span><block-child-2/></div><div class="msg-body"><block-child-3/></div><block-child-4/></div>`);
  let block30 = createBlock(`<span class="msg-type-badge"><block-child-0/></span>`);
  let block33 = createBlock(`<div class="msg-attachments"><block-child-0/></div>`);
  let block35 = createBlock(`<a class="attachment-chip" href="#" block-attribute-0="data-att-id" block-handler-1="click.prevent"><i class="fa fa-paperclip"/><block-child-0/></a>`);
  let block37 = createBlock(`<div class="attachment-preview"><i class="fa fa-paperclip"/><span><block-child-0/></span><button block-handler-0="click">✕</button></div>`);
  let block39 = createBlock(`<div class="mention-list"><block-child-0/></div>`);
  let block41 = createBlock(`<div class="mention-item" block-attribute-0="data-user-id" block-handler-1="mousedown.prevent"><i class="fa fa-user"/><block-child-0/><block-child-1/></div>`);
  let block43 = createBlock(`<span class="mention-email"><block-child-0/></span>`);
  let block46 = createBlock(`<i class="fa fa-spinner fa-spin"/>`);
  let block48 = createBlock(`<i class="fa fa-paper-plane"/>`);
  
  return function template(ctx, node, key = "") {
    let b2, b3, b9, b16, b17;
    let prop1 = new String((ctx['state'].taskSearch) === 0 ? 0 : ((ctx['state'].taskSearch) || ""));
    const v1 = ctx['state'];
    let hdlr1 = [(_ev)=>{v1.taskSearch=_ev.target.value;}, ctx];
    let prop2 = new Boolean(ctx['state'].showAllTasks);
    let hdlr2 = [ctx['onShowAllChange'], ctx];
    if (ctx['state'].loading) {
      b2 = block2();
    } else if (!ctx['visibleTasks'].length) {
      let b4, b8;
      if (ctx['state'].allTasks&&ctx['state'].allTasks.length) {
        const b5 = text(` No assigned tasks found.`);
        const b6 = block6();
        const b7 = block7();
        b4 = multi([b5, b6, b7]);
      } else {
        b8 = text(`No tasks found`);
      }
      b3 = block3([], [b4, b8]);
    } else {
      ctx = Object.create(ctx);
      const [k_block9, v_block9, l_block9, c_block9] = prepareList(ctx['visibleTasks']);;
      for (let i1 = 0; i1 < l_block9; i1++) {
        ctx[`task`] = k_block9[i1];
        const key1 = ctx['task'].id;
        let b11, b12, b14;
        let attr1 = 'task-item'+(ctx['state'].selectedTask&&ctx['state'].selectedTask.id===ctx['task'].id?' active':'')+((ctx['state'].unreadMap[ctx['task'].id]||0)>0?' has-unread':'');
        let attr2 = ctx['task'].id;
        let hdlr3 = [ctx['onTaskItemClick'], ctx];
        b11 = safeOutput(ctx['task'].name);
        if ((ctx['state'].unreadMap[ctx['task'].id]||0)>0) {
          let attr3 = (ctx['state'].unreadMap[ctx['task'].id])+' unread message(s)';
          const b13 = safeOutput(ctx['state'].unreadMap[ctx['task'].id]);
          b12 = block12([attr3], [b13]);
        }
        if (ctx['task'].project_id&&ctx['task'].project_id[1]) {
          const b15 = safeOutput(ctx['task'].project_id[1]||'');
          b14 = block14([], [b15]);
        }
        c_block9[i1] = withKey(block10([attr1, attr2, hdlr3], [b11, b12, b14]), key1);
      }
      ctx = ctx.__proto__;
      b9 = list(c_block9);
    }
    if (!ctx['state'].selectedTask) {
      b16 = block16();
    } else {
      let b19, b20, b21, b23, b24, b25, b26, b37, b39, b45, b46, b47;
      let hdlr4 = ["prevent", ctx['openTaskInBrowser'], ctx];
      b19 = safeOutput(ctx['state'].selectedTask.id);
      b20 = safeOutput(ctx['state'].selectedTask.name);
      if ((ctx['state'].unreadMap[ctx['state'].selectedTask.id]||0)>0) {
        const b22 = safeOutput(ctx['state'].unreadMap[ctx['state'].selectedTask.id]||0);
        b21 = block21([], [b22]);
      }
      if ((ctx['state'].unreadMap[ctx['state'].selectedTask.id]||0)>0) {
        let hdlr5 = [ctx['markAllRead'], ctx];
        b23 = block23([hdlr5]);
      }
      let hdlr6 = [ctx['refreshMessages'], ctx];
      let attr4 = 'pill'+(ctx['state'].filterType==='all'?' active':'');
      let hdlr7 = [ctx['onFilterClick'], ctx];
      let attr5 = 'pill'+(ctx['state'].filterType==='comment'?' active':'');
      let hdlr8 = [ctx['onFilterClick'], ctx];
      let attr6 = 'pill'+(ctx['state'].filterType==='note'?' active':'');
      let hdlr9 = [ctx['onFilterClick'], ctx];
      if (ctx['state'].loadingMessages) {
        b24 = block24();
      } else if (!ctx['filteredMessages'].length) {
        b25 = block25();
      } else {
        ctx = Object.create(ctx);
        const [k_block26, v_block26, l_block26, c_block26] = prepareList(ctx['filteredMessages']);;
        for (let i1 = 0; i1 < l_block26; i1++) {
          ctx[`msg`] = k_block26[i1];
          const key1 = ctx['msg'].id;
          let b28, b29, b30, b32, b33;
          let attr7 = 'msg '+ctx['msgClass'](ctx['msg']);
          b28 = safeOutput(ctx['authorName'](ctx['msg']));
          let attr8 = ctx['msg'].date;
          b29 = safeOutput(ctx['timeAgo'](ctx['msg'].date));
          if (ctx['msg'].subtype_id&&ctx['msg'].subtype_id[1]) {
            const b31 = safeOutput(ctx['msg'].subtype_id[1]);
            b30 = block30([], [b31]);
          }
          b32 = safeOutput(ctx['msg'].body||'');
          if (ctx['msg'].attachment_ids&&ctx['msg'].attachment_ids.length) {
            ctx = Object.create(ctx);
            const [k_block34, v_block34, l_block34, c_block34] = prepareList(ctx['msg'].attachment_ids);;
            for (let i2 = 0; i2 < l_block34; i2++) {
              ctx[`attId`] = k_block34[i2];
              const key2 = ctx['attId'];
              let attr9 = ctx['attId'];
              let hdlr10 = ["prevent", ctx['onAttachmentClick'], ctx];
              const b36 = safeOutput(ctx['getAttachmentName'](ctx['attId']));
              c_block34[i2] = withKey(block35([attr9, hdlr10], [b36]), key2);
            }
            ctx = ctx.__proto__;
            const b34 = list(c_block34);
            b33 = block33([], [b34]);
          }
          c_block26[i1] = withKey(block27([attr7, attr8], [b28, b29, b30, b32, b33]), key1);
        }
        ctx = ctx.__proto__;
        b26 = list(c_block26);
      }
      let attr10 = 'ctab'+(ctx['state'].composeType==='comment'?' active':'');
      let hdlr11 = [ctx['onComposeTypeClick'], ctx];
      let attr11 = 'ctab'+(ctx['state'].composeType==='note'?' active':'');
      let hdlr12 = [ctx['onComposeTypeClick'], ctx];
      if (ctx['state'].attachment) {
        const b38 = safeOutput(ctx['state'].attachment.name);
        let hdlr13 = [ctx['clearAttachment'], ctx];
        b37 = block37([hdlr13], [b38]);
      }
      let prop3 = new String((ctx['state'].composeText) === 0 ? 0 : ((ctx['state'].composeText) || ""));
      let hdlr14 = [ctx['handleComposeInput'], ctx];
      let hdlr15 = [ctx['handleComposeKeydown'], ctx];
      if (ctx['state'].mentionResults&&ctx['state'].mentionResults.length) {
        ctx = Object.create(ctx);
        const [k_block40, v_block40, l_block40, c_block40] = prepareList(ctx['state'].mentionResults);;
        for (let i1 = 0; i1 < l_block40; i1++) {
          ctx[`user`] = k_block40[i1];
          const key1 = ctx['user'].id;
          let b42, b43;
          let attr12 = ctx['user'].id;
          let hdlr16 = ["prevent", ctx['onMentionClick'], ctx];
          b42 = safeOutput(ctx['user'].name);
          if (ctx['user'].email) {
            const b44 = safeOutput(ctx['user'].email);
            b43 = block43([], [b44]);
          }
          c_block40[i1] = withKey(block41([attr12, hdlr16], [b42, b43]), key1);
        }
        ctx = ctx.__proto__;
        const b40 = list(c_block40);
        b39 = block39([], [b40]);
      }
      let hdlr17 = [ctx['pickAttachment'], ctx];
      b45 = safeOutput(ctx['composeHint']);
      let prop4 = new Boolean(ctx['state'].sending);
      let hdlr18 = [ctx['sendMessage'], ctx];
      if (ctx['state'].sending) {
        b46 = block46();
      } else {
        const b48 = block48();
        const b49 = text(` Send `);
        b47 = multi([b48, b49]);
      }
      const b18 = block18([hdlr4, hdlr6, attr4, hdlr7, attr5, hdlr8, attr6, hdlr9, attr10, hdlr11, attr11, hdlr12, prop3, hdlr14, hdlr15, hdlr17, prop4, hdlr18], [b19, b20, b21, b23, b24, b25, b26, b37, b39, b45, b46, b47]);
      const b50 = comment(` end .chat-view `);
      b17 = multi([b18, b50]);
    }
    return block1([prop1, hdlr1, prop2, hdlr2], [b2, b3, b9, b16, b17]);
  }
},

"PopupApp": function PopupApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { safeOutput, prepareList, withKey } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit","href"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  
  let block1 = createBlock(`<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text"> Loading current session &amp;&amp; projects… </div><div class="loader-subtext"> Please wait — || grab a cup of coffee ☕ </div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options </a></div></div><div id="wrapper" block-attribute-2="class"><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on the current item"><input id="auto_download_timesheet_input" type="checkbox" block-property-7="checked" block-handler-8="change"/> Auto Download Current Item Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-9="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-10="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-11="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-12="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-13="click"/><a href="options_main_page.html" class="options-btn" title="Go To options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table id="table-task-issues" class="table table-responsive-sm table-bordered table-fixed"><thead><tr><th class="action-col"><div><block-child-3/></div><block-child-4/></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-child-5/> [<block-child-6/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-14="checked" block-handler-15="input"/> Show for everyone </label></th><block-child-7/><th class="project-col">Project</th></tr></thead><tbody><block-child-8/><block-child-8/><block-child-9/></tbody></table></div><div class="container footer info-footer"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <block-child-10/></span><br/><span><b>Host:</b> <block-child-11/></span><br/><span><b>Database:</b> <block-child-12/></span><br/><span><b>Current User:</b> <block-child-13/></span><br/></div></div></div></div></div>`);
  let block2 = createBlock(`<div><p class="odooError"><block-child-0/></p></div>`);
  let block4 = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning"> Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below &amp;&amp; add one. </div></div>`);
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
  let block30 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer &amp;&amp; record the time to Odoo timesheets" block-handler-0="click"/>`);
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
  
  let block1 = createBlock(`<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text"> Loading current session &amp;&amp; projects… </div><div class="loader-subtext"> Please wait — || grab a cup of coffee ☕ </div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img src="img/logo.png"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options </a></div></div><div id="wrapper" block-attribute-2="class"><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-3="value" block-handler-4="input"/><select id="limitTo" block-property-5="value" block-handler-6="change" block-handler-7="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on the current item"><input id="auto_download_timesheet_input" type="checkbox" block-property-8="checked" block-handler-9="change"/> Auto Download Current Item Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-10="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-11="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-12="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-13="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-14="click"/><a href="options_main_page.html" class="options-btn" title="Go To options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table id="table-task-issues" class="table table-responsive-sm table-bordered table-fixed"><thead><tr><th class="action-col"><div/><block-child-3/></th><th class="priority-col">Priority</th><th class="stage-col">Stage</th><th class="item-col"><div class="item-header-title"><block-child-4/> [<block-child-5/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-15="checked" block-handler-16="input"/> Show for everyone </label></th><block-child-6/><th class="project-col">Project</th></tr></thead><tbody><block-child-7/><block-child-7/><block-child-8/></tbody></table></div><div class="container footer info-footer"><div class="row"><div class="remote-info-block col-md-12"><span><b>Odoo:</b> <span class="remote-value"><block-child-9/></span></span><br/><span><b>OWL:</b> <span class="remote-value"><block-child-10/></span></span><br/><span><b>Host:</b> <span class="remote-value"><block-child-11/></span></span><br/><span><b>Database:</b> <span class="remote-value"><block-child-12/></span></span><br/><span><b>Current User:</b> <span class="remote-value"><block-child-13/></span></span><br/></div></div></div></div></div>`);
  let block2 = createBlock(`<div><p class="odooError"><block-child-0/></p></div>`);
  let block4 = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning"> Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below &amp;&amp; add one. </div></div>`);
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
  let block28 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer &amp;&amp; record the time to Odoo timesheets" block-handler-0="click"/>`);
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
