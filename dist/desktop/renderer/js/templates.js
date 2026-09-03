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
  let block8 = createBlock(`<span block-attribute-0="class"><block-text-1/></span>`);
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
      let attr1 = (ctx['state'].selectedTask&&ctx['task'].id===ctx['state'].selectedTask.id?'task-card active':'task-card')+((ctx['state'].unreadMap[ctx['task'].id]||0)>0?' has-unread '+(ctx['task'].followerType==='follower'?'is-follower':'is-assigned'):'');
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
        let attr3 = ctx['task'].followerType==='follower'?'msg-unread-badge msg-unread-follower':'msg-unread-badge msg-unread-assigned';
        let txt4 = ctx['state'].unreadMap[ctx['task'].id];
        b8 = block8([attr3, txt4]);
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
      let attr4 = ctx['filterAllClass'];
      let hdlr8 = [ctx['onFilterClick'], ctx];
      let attr5 = ctx['filterCommentClass'];
      let hdlr9 = [ctx['onFilterClick'], ctx];
      let attr6 = ctx['filterNoteClass'];
      let hdlr10 = [ctx['onFilterClick'], ctx];
      b11 = block11([hdlr7, txt6, attr4, hdlr8, attr5, hdlr9, attr6, hdlr10], [b12, b13]);
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
      let attr7 = 'msg-bubble '+ctx['msgClass'](ctx['msg']);
      let txt7 = ctx['authorName'](ctx['msg']);
      let txt8 = ctx['timeAgo'](ctx['msg'].date);
      b19 = safeOutput(ctx['bodyMarkup'](ctx['msg']));
      if (ctx['msg'].attachment_ids&&ctx['msg'].attachment_ids.length) {
        ctx = Object.create(ctx);
        const [k_block21, v_block21, l_block21, c_block21] = prepareList(ctx['msg'].attachment_ids);;
        for (let i2 = 0; i2 < l_block21; i2++) {
          ctx[`attId`] = k_block21[i2];
          const key2 = ctx['attId'];
          let attr8 = ctx['attId'];
          let hdlr11 = [ctx['onAttachmentClick'], ctx];
          let txt9 = ctx['getAttachmentName'](ctx['attId']);
          c_block21[i2] = withKey(block22([attr8, hdlr11, txt9]), key2);
        }
        ctx = ctx.__proto__;
        const b21 = list(c_block21);
        b20 = block20([], [b21]);
      }
      c_block17[i1] = withKey(block18([attr7, txt7, txt8], [b19, b20]), key1);
    }
    ctx = ctx.__proto__;
    b17 = list(c_block17);
    if (ctx['state'].selectedTask) {
      let b24, b27, b28, b29;
      let attr9 = ctx['composeCommentClass'];
      let hdlr12 = [ctx['onComposeTypeClick'], ctx];
      let attr10 = ctx['composeNoteClass'];
      let hdlr13 = [ctx['onComposeTypeClick'], ctx];
      let attr11 = ctx['composeHint'];
      let prop2 = new String((ctx['state'].composeText) === 0 ? 0 : ((ctx['state'].composeText) || ""));
      let hdlr14 = [ctx['handleComposeInput'], ctx];
      let hdlr15 = [ctx['handleComposeKeydown'], ctx];
      if (ctx['state'].mentionResults.length) {
        ctx = Object.create(ctx);
        const [k_block25, v_block25, l_block25, c_block25] = prepareList(ctx['state'].mentionResults);;
        for (let i1 = 0; i1 < l_block25; i1++) {
          ctx[`user`] = k_block25[i1];
          const key1 = ctx['user'].id;
          let attr12 = ctx['user'].id;
          let hdlr16 = [ctx['onMentionClick'], ctx];
          let txt10 = ctx['user'].name;
          c_block25[i1] = withKey(block26([attr12, hdlr16, txt10]), key1);
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
      let attr13 = ctx['state'].sending?'fa fa-cog fa-spin':'fa fa-send';
      if (ctx['state'].sending) {
        b28 = text(`Sending…`);
      } else {
        b29 = text(`Send (Ctrl+Enter)`);
      }
      b23 = block23([attr9, hdlr12, attr10, hdlr13, attr11, prop2, hdlr14, hdlr15, hdlr18, prop3, hdlr19, attr13], [b24, b27, b28, b29]);
    }
    return block1([prop1, hdlr1, txt5, hdlr3, hdlr4, hdlr5, hdlr6], [b2, b3, b4, b9, b10, b11, b14, b15, b16, b17, b23]);
  }
},

"OptionsApp": function OptionsApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { prepareList, withKey } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp6 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  
  let block1 = createBlock(`<div><!-- Sidebar --><div id="navigation"><h1 class="title-app">Timer Options</h1><ul class="list-group"><li class="chooser list-group-item" block-attribute-0="class" block-handler-1="click"><i class="fa fa-info-circle"/> <span>About Timer</span></li><li class="chooser list-group-item" block-attribute-2="class" block-handler-3="click"><i class="fa fa-question-circle"/> <span>Help</span></li><li class="chooser list-group-item" block-attribute-4="class" block-handler-5="click"><i class="fa fa-hdd-o"/> <span>Storage</span></li><li class="chooser list-group-item" block-attribute-6="class" block-handler-7="click"><i class="fa fa-shield"/> <span>Security</span></li><li class="chooser list-group-item" block-attribute-8="class" block-handler-9="click"><i class="fa fa-cogs"/> <span>Options</span></li></ul><hr/><div class="footer-app"><a href="popup.html" class="back-left"><i class="fa fa-arrow-circle-left fa-2x"/></a></div></div><!-- About --><div class="options-box box" block-attribute-10="class"><h1><div class="logo"><img src="img/logo.png"/></div></h1><hr/><div class="about-app"><h4 class="title-app text-center">Description</h4><hr/> Therp Timer Desktop is a native Electron application for logging work hours directly into Odoo timesheets. It supports Project Tasks, legacy Issues and Helpdesk Tickets, plus screen recording, chatter messaging and system-tray timing. <hr/><h4 class="title-app text-center">Features</h4><hr/><ul class="list-group"><li class="list-group-item"><i class="fa fa-clock-o"/> Start/stop timer — posts timesheet lines to Odoo</li><li class="list-group-item"><i class="fa fa-tasks"/> Project Tasks, legacy Issues and Helpdesk Tickets</li><li class="list-group-item"><i class="fa fa-life-ring"/> Helpdesk stage filtering and native Helpdesk timesheet recording when Odoo supports it</li><li class="list-group-item"><i class="fa fa-info-circle"/> Helpdesk readiness check before timing; blocked tickets explain the Odoo company/employee requirement</li><li class="list-group-item"><i class="fa fa-video-camera"/> Screen recorder — WebM, MP4, MKV</li><li class="list-group-item"><i class="fa fa-microphone"/> Audio recording — microphone or system audio</li><li class="list-group-item"><i class="fa fa-camera"/> Screenshot tool with configurable folder</li><li class="list-group-item"><i class="fa fa-film"/> Animated GIF capture</li><li class="list-group-item"><i class="fa fa-comments"/> Chatter — read/post messages, @mentions, attachments</li><li class="list-group-item"><i class="fa fa-bell"/> Desktop notifications for new messages</li><li class="list-group-item"><i class="fa fa-table"/> Task timesheets — planned vs. spent summary</li><li class="list-group-item"><i class="fa fa-download"/> Download monthly timesheet as CSV</li><li class="list-group-item"><i class="fa fa-exchange"/> Multi-remote — the same Odoo database may be saved separately for Tasks, Issues and Helpdesk Tickets</li><li class="list-group-item"><i class="fa fa-picture-o"/> Optional per-remote company logo with the Therp logo as fallback</li><li class="list-group-item"><i class="fa fa-database"/> Config backup and restore (JSON)</li><li class="list-group-item"><i class="fa fa-desktop"/> Runs in system tray — keeps timing in background</li></ul><h4 class="title-app text-center" style="margin-top:16px;">Packages</h4><hr/><ul class="list-group"><li class="list-group-item"><b>electron</b> ^29.4.6 — Desktop framework</li><li class="list-group-item"><b>electron-builder</b> ^24.13.3 — Packaging</li><li class="list-group-item"><b>electron-store</b> ^8.1.0 — Persistent storage</li><li class="list-group-item"><b>owl</b> 2.8.2 — Odoo Web Library UI framework</li><li class="list-group-item"><b>font-awesome</b> 4.6.3 — Icon set</li></ul></div></div><!-- Options / remotes form --><div class="options-box box" block-attribute-11="class"><div class="form remote-options-form"><form block-handler-12="submit.prevent"><h4 class="remote-title text-info">Add Remote</h4><hr/><div class="form-group"><label for="remote-host">Odoo Host</label><input type="text" class="form-control" id="remote-host" placeholder="https://your-odoo-host.example" block-property-13="value" block-handler-14="input"/></div><div class="form-group"><label for="remote-name">Display Name</label><input type="text" class="form-control" id="remote-name" placeholder="My Odoo" block-property-15="value" block-handler-16="input"/></div><div class="form-group"><label for="remote-database">Odoo Database</label><input type="text" class="form-control" id="remote-database" placeholder="myodoodatabase" block-property-17="value" block-handler-18="input"/></div><div class="form-group"><label for="remote-odoo-version">Odoo Version</label><input type="text" class="form-control" id="remote-odoo-version" placeholder="16.0" block-property-19="value" block-handler-20="input"/></div><div class="form-group"><label for="remote-poll">Message Poll Interval (seconds, 0=off)</label><input type="number" class="form-control" id="remote-poll" placeholder="60" min="0" block-property-21="value" block-handler-22="input"/></div><div class="form-group"><label>Data Source</label><ul class="data-source-list list-group"><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.issue" id="FromIssues" block-property-23="checked" block-handler-24="change"/><label class="form-check-label" for="FromIssues">From Issues</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.task" id="FromTasks" block-property-25="checked" block-handler-26="change"/><label class="form-check-label" for="FromTasks">From Tasks</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="helpdesk.ticket" id="FromHelpdeskTickets" block-property-27="checked" block-handler-28="change"/><label class="form-check-label" for="FromHelpdeskTickets">From Helpdesk Tickets</label></div></li></ul></div><div class="form-group"><label for="remote-logo">Company Logo <span class="text-muted">(optional)</span></label><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><img block-attribute-29="src" alt="Remote logo preview" style="width:76px;height:54px;object-fit:contain;border:1px solid #dbe3ea;border-radius:6px;background:#fff;padding:4px;"/><div style="min-width:220px;flex:1;"><input id="remote-logo" type="file" class="form-control" accept="image/png,image/jpeg,image/webp,image/gif" block-handler-30="change"/><div style="margin-top:5px;font-size:11px;color:#7b8794;line-height:1.35;"> PNG, JPEG, WebP or GIF; maximum 512 KB. The saved logo is shown on login and in the connected-remote summary. </div><button type="button" class="btn btn-sm btn-default" style="margin-top:7px;" block-handler-31="click"> Use Therp default logo </button></div></div></div><span class="caption-remotes">Controls</span><div class="remotes-control-btns col-md-12 text-center text-info pointer"><i title="Add a remote host" class="fa fa-2x fa-plus-circle" block-handler-32="click"/><i title="Refresh remotes" class="fa fa-2x fa-refresh" block-handler-33="click"/><i title="Toggle remote list" class="fa fa-2x fa-eye" block-handler-34="click"/><i title="Remove all remotes" class="fa fa-2x fa-minus-circle" block-handler-35="click"/></div><block-child-0/></form><block-child-1/></div></div><!-- Storage --><div class="options-box box" block-attribute-36="class"><h4 class="title-app"><i class="fa fa-hdd-o"/> Storage Preferences</h4><hr/><div class="about-app"><p class="text-muted" style="font-size:13px;"> Set save folders for recordings and screenshots. When set, files save directly without a dialog. </p><div class="form-group"><label>Screenshot Save Folder</label><div class="folder-row"><span class="folder-path-display"><block-text-37/></span><button class="btn btn-sm btn-default" block-handler-38="click">Browse…</button><button class="btn btn-sm btn-danger" block-handler-39="click">Clear</button></div></div><div class="form-group" style="margin-top:12px;"><label>Video / GIF Save Folder</label><div class="folder-row"><span class="folder-path-display"><block-text-40/></span><button class="btn btn-sm btn-default" block-handler-41="click">Browse…</button><button class="btn btn-sm btn-danger" block-handler-42="click">Clear</button></div></div><hr/><h4 class="title-app"><i class="fa fa-database"/> Backup and Restore</h4><p class="text-muted" style="font-size:13px;"> Export all configuration to JSON, or import a previous backup. </p><div style="display:flex;gap:10px;"><button class="btn btn-default" block-handler-43="click"><i class="fa fa-download"/> Export Config </button><button class="btn btn-default" block-handler-44="click"><i class="fa fa-upload"/> Import Config </button></div></div></div><!-- Security --><div class="options-box box" block-attribute-45="class"><h4 class="title-app"><i class="fa fa-shield"/> Security and Sandbox</h4><hr/><div class="about-app"><h5>Linux AppImage — Sandbox</h5><p class="text-muted" style="font-size:13px;"> On Linux the AppImage SUID sandbox helper may not be set up correctly. The app applies --no-sandbox automatically. To restore full sandboxing: </p><ul class="list-group"><li class="list-group-item"> sudo chown root /tmp/.mount_Therp-*/chrome-sandbox and sudo chmod 4755 /tmp/.mount_Therp-*/chrome-sandbox </li></ul><h5 style="margin-top:16px;">Session Cookies</h5><p class="text-muted" style="font-size:13px;"> Odoo session cookies are stored in the Electron Chromium session and cleared on logout. No passwords are stored in plain text. </p></div></div><!-- Help --><div class="options-box box" block-attribute-46="class"><h4 class="title-app"><i class="fa fa-question-circle"/> Help and Tutorial</h4><hr/><div class="about-app"><h5>Getting Started</h5><ol class="list-group"><li class="list-group-item">Go to Options → Options, configure the Odoo host/database and choose a data source, then click +. The same database can have separate saved remotes for Tasks and Helpdesk Tickets.</li><li class="list-group-item">Optionally add a company logo. Return to Timer, choose the saved remote and log in.</li><li class="list-group-item">Click the play icon next to an item to start timing. For Helpdesk, a blue info icon replaces Play when the ticket is known to be unable to create a timesheet.</li><li class="list-group-item">Click the info icon to see the exact readiness problem. Odoo Helpdesk timesheets normally require an active employee for the user in the ticket/project company.</li><li class="list-group-item">Click the stop icon to post time to Odoo timesheets. Helpdesk time appears in the ticket's normal Timesheets tab when the server supports it.</li></ol><h5 style="margin-top:16px;">Links</h5><ul class="list-group"><li class="list-group-item"><a href="https://github.com/Therp/odoo-timer/blob/master/README.md" block-handler-47="click.prevent"><i class="fa fa-book"/> README and Documentation </a></li><li class="list-group-item"><a href="https://github.com/Therp/odoo-timer/issues" block-handler-48="click.prevent"><i class="fa fa-bug"/> Report an Issue / Community Discussions </a></li></ul><h5 style="margin-top:16px;">Keyboard Shortcuts</h5><ul class="list-group"><li class="list-group-item">Ctrl+Enter — Send message in chatter compose box</li><li class="list-group-item">Escape — Close mention dropdown in chatter</li></ul></div></div></div>`);
  let block2 = createBlock(`<div class="remote-error"><block-text-0/></div>`);
  let block3 = createBlock(`<div class="remotes-table-info"><table class="table table-bordered"><caption class="text-info caption-remotes">Available Remotes</caption><thead><tr><th style="width:64px">Logo</th><th>Name</th><th>Host</th><th>Database</th><th>Version</th><th>Source</th><th>State</th><th/></tr></thead><tbody><block-child-0/></tbody></table></div>`);
  let block5 = createBlock(`<tr><td class="text-center" style="width:64px"><img block-attribute-0="src" alt="Remote logo" style="width:48px;height:34px;object-fit:contain;background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:2px;"/></td><td class="text-info"><block-child-0/></td><td><block-child-1/></td><td><block-child-2/></td><td><block-child-3/></td><td><block-child-4/></td><td><block-child-5/></td><td class="remote-row-actions"><i class="fa fa-pencil text-info" block-handler-1="click"/><i class="fa fa-trash text-danger" block-handler-2="click"/></td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b3;
    let attr1 = ctx['state'].activePage==='about'?'selected':'notselected';
    const v1 = ctx['state'];
    const v2 = ctx['refreshStoragePaths'];
    let hdlr1 = [()=>{v1.activePage='about';v2();}, ctx];
    let attr2 = ctx['state'].activePage==='help'?'selected':'notselected';
    const v3 = ctx['state'];
    let hdlr2 = [()=>{v3.activePage='help';}, ctx];
    let attr3 = ctx['state'].activePage==='storage'?'selected':'notselected';
    const v4 = ctx['state'];
    const v5 = ctx['refreshStoragePaths'];
    let hdlr3 = [()=>{v4.activePage='storage';v5();}, ctx];
    let attr4 = ctx['state'].activePage==='security'?'selected':'notselected';
    const v6 = ctx['state'];
    let hdlr4 = [()=>{v6.activePage='security';}, ctx];
    let attr5 = ctx['state'].activePage==='options'?'selected':'notselected';
    const v7 = ctx['state'];
    let hdlr5 = [()=>{v7.activePage='options';}, ctx];
    let attr6 = ctx['state'].activePage==='about'?'active_page':'inactive_page';
    let attr7 = ctx['state'].activePage==='options'?'active_page':'inactive_page';
    let hdlr6 = ["prevent", ctx['addRemote'], ctx];
    let prop1 = new String((ctx['state'].form.remote_host) === 0 ? 0 : ((ctx['state'].form.remote_host) || ""));
    const v8 = ctx['state'];
    let hdlr7 = [(_ev)=>{v8.form.remote_host=_ev.target.value;}, ctx];
    let prop2 = new String((ctx['state'].form.remote_name) === 0 ? 0 : ((ctx['state'].form.remote_name) || ""));
    const v9 = ctx['state'];
    let hdlr8 = [(_ev)=>{v9.form.remote_name=_ev.target.value;}, ctx];
    let prop3 = new String((ctx['state'].form.remote_database) === 0 ? 0 : ((ctx['state'].form.remote_database) || ""));
    const v10 = ctx['state'];
    let hdlr9 = [(_ev)=>{v10.form.remote_database=_ev.target.value;}, ctx];
    let prop4 = new String((ctx['state'].form.remote_odoo_version) === 0 ? 0 : ((ctx['state'].form.remote_odoo_version) || ""));
    const v11 = ctx['state'];
    let hdlr10 = [(_ev)=>{v11.form.remote_odoo_version=_ev.target.value;}, ctx];
    let prop5 = new String((ctx['state'].form.remote_poll_interval) === 0 ? 0 : ((ctx['state'].form.remote_poll_interval) || ""));
    const v12 = ctx['state'];
    let hdlr11 = [(_ev)=>{v12.form.remote_poll_interval=_ev.target.value;}, ctx];
    let prop6 = new Boolean(ctx['state'].form.remote_datasrc==='project.issue');
    const v13 = ctx['state'];
    let hdlr12 = [()=>{v13.form.remote_datasrc='project.issue';}, ctx];
    let prop7 = new Boolean(ctx['state'].form.remote_datasrc==='project.task');
    const v14 = ctx['state'];
    let hdlr13 = [()=>{v14.form.remote_datasrc='project.task';}, ctx];
    let prop8 = new Boolean(ctx['state'].form.remote_datasrc==='helpdesk.ticket');
    const v15 = ctx['state'];
    let hdlr14 = [()=>{v15.form.remote_datasrc='helpdesk.ticket';}, ctx];
    let attr8 = ctx['formLogoSrc'];
    let hdlr15 = [ctx['onRemoteLogoChange'], ctx];
    let hdlr16 = [ctx['clearRemoteLogo'], ctx];
    let hdlr17 = [ctx['addRemote'], ctx];
    let hdlr18 = [ctx['loadRemotes'], ctx];
    const v16 = ctx['state'];
    let hdlr19 = [()=>{v16.showList=!v16.showList;}, ctx];
    let hdlr20 = [ctx['removeAllRemotes'], ctx];
    if (ctx['state'].error) {
      let txt1 = ctx['state'].error;
      b2 = block2([txt1]);
    }
    if (ctx['state'].showList&&ctx['state'].remotes.length) {
      ctx = Object.create(ctx);
      const [k_block4, v_block4, l_block4, c_block4] = prepareList(ctx['state'].remotes);;
      for (let i1 = 0; i1 < l_block4; i1++) {
        ctx[`remote`] = k_block4[i1];
        const key1 = ctx['remoteKey'](ctx['remote']);
        let attr9 = ctx['remoteLogoSrc'](ctx['remote']);
        const b6 = comp1({text: ctx['remote'].name||'',limit: 18}, key + `__1__${key1}`, node, this, null);
        const b7 = comp2({text: ctx['remote'].url||'',limit: 28}, key + `__2__${key1}`, node, this, null);
        const b8 = comp3({text: ctx['remote'].database||'',limit: 18}, key + `__3__${key1}`, node, this, null);
        const b9 = comp4({text: ctx['remote'].odooVersion||'—',limit: 10}, key + `__4__${key1}`, node, this, null);
        const b10 = comp5({text: ctx['remote'].datasrc||'project.issue',limit: 18}, key + `__5__${key1}`, node, this, null);
        const b11 = comp6({text: ctx['remote'].state||'Inactive',limit: 12}, key + `__6__${key1}`, node, this, null);
        const v17 = ctx['editRemote'];
        const v18 = ctx['remote'];
        let hdlr21 = [()=>v17(v18), ctx];
        const v19 = ctx['removeRemote'];
        const v20 = ctx['remote'];
        let hdlr22 = [()=>v19(v20), ctx];
        c_block4[i1] = withKey(block5([attr9, hdlr21, hdlr22], [b6, b7, b8, b9, b10, b11]), key1);
      }
      ctx = ctx.__proto__;
      const b4 = list(c_block4);
      b3 = block3([], [b4]);
    }
    let attr10 = ctx['state'].activePage==='storage'?'active_page':'inactive_page';
    let txt2 = ctx['state'].screenshotFolder||'Not set (will prompt)';
    let hdlr23 = [ctx['pickScreenshotFolder'], ctx];
    let hdlr24 = [ctx['clearScreenshotFolder'], ctx];
    let txt3 = ctx['state'].videoFolder||'Not set (will prompt)';
    let hdlr25 = [ctx['pickVideoFolder'], ctx];
    let hdlr26 = [ctx['clearVideoFolder'], ctx];
    let hdlr27 = [ctx['exportConfig'], ctx];
    let hdlr28 = [ctx['importConfig'], ctx];
    let attr11 = ctx['state'].activePage==='security'?'active_page':'inactive_page';
    let attr12 = ctx['state'].activePage==='help'?'active_page':'inactive_page';
    let hdlr29 = ["prevent", ctx['openReadme'], ctx];
    let hdlr30 = ["prevent", ctx['openIssues'], ctx];
    return block1([attr1, hdlr1, attr2, hdlr2, attr3, hdlr3, attr4, hdlr4, attr5, hdlr5, attr6, attr7, hdlr6, prop1, hdlr7, prop2, hdlr8, prop3, hdlr9, prop4, hdlr10, prop5, hdlr11, prop6, hdlr12, prop7, hdlr13, prop8, hdlr14, attr8, hdlr15, hdlr16, hdlr17, hdlr18, hdlr19, hdlr20, attr10, txt2, hdlr23, hdlr24, txt3, hdlr25, hdlr26, hdlr27, hdlr28, attr11, attr12, hdlr29, hdlr30], [b2, b3]);
  }
},

"PopupApp": function PopupApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { prepareList, withKey } = helpers;
  const comp1 = app.createComponent(`ReadMore`, true, false, false, ["text","limit","href"]);
  const comp2 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp3 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp4 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp5 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp6 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp7 = app.createComponent(`ReadMore`, true, false, false, ["text","limit","href"]);
  const comp8 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp9 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  const comp10 = app.createComponent(`ReadMore`, true, false, false, ["text","limit"]);
  
  let block1 = createBlock(`<div class="app-root"><!-- Loading --><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text"><block-text-1/></div><div class="loader-subtext">Please wait — or grab a cup of coffee ☕</div><i class="fa fa-cog fa-spin fa-5x"/></div></div><!-- Login --><div id="login" class="login-view" block-attribute-2="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img block-attribute-3="src" alt="Remote logo"/></div><block-child-0/><block-child-1/><block-child-2/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options</a></div></div><!-- Main --><div id="wrapper" block-attribute-4="class"><block-child-3/><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-5="value" block-handler-6="input"/><block-child-4/><select id="limitTo" block-property-7="value" block-handler-8="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="auto_download_timesheet" title="Store timesheet locally when you stop timer on the current item"><input id="auto_download_timesheet_input" type="checkbox" block-property-9="checked" block-handler-10="change"/> Auto Download Current Item Timesheet </div><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-11="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-12="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-13="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-14="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-15="click"/><i class="fa fa-video-camera fa-2x" title="Record screen" block-handler-16="click"/><span class="msg-icon-wrap" title="Open Messages" block-handler-17="click"><i class="fa fa-comments fa-2x"/><span class="msg-unread-badge" block-attribute-18="style"><block-text-19/></span></span><i class="fa fa-bug fa-2x logs-btn" title="View Logs" block-handler-20="click"/><a href="options_main_page.html" class="options-btn" title="Options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table class="table table-responsive-sm table-bordered table-fixed" id="table-task-issues"><thead><tr><th class="action-col"><div><block-child-5/></div></th><block-child-6/><block-child-7/></tr></thead><tbody><block-child-8/><block-child-8/><block-child-9/></tbody></table></div><div class="info-footer mx-3" style="padding:12px 8px 10px;"><div class="text-center" style="margin-bottom:8px;"><img block-attribute-21="src" alt="Remote" style="width:72px;height:48px;object-fit:contain;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:4px;"/><div style="margin-top:4px;font-size:12px;font-weight:600;"><block-text-22/><span class="current-source-chip" style="margin-left:5px;"><block-text-23/></span></div></div><div class="row remote-info-block" style="display:flex;flex-wrap:wrap;font-size:12px;line-height:1.35;"><div class="col-4 text-center" style="flex:0 0 33.333%;max-width:33.333%;padding:5px;word-break:break-word;"><b>Odoo</b><br/><block-text-24/></div><div class="col-4 text-center" style="flex:0 0 33.333%;max-width:33.333%;padding:5px;word-break:break-word;"><b>Database</b><br/><block-text-25/></div><div class="col-4 text-center" style="flex:0 0 33.333%;max-width:33.333%;padding:5px;word-break:break-word;"><b>Host</b><br/><block-text-26/></div><div class="col-4 text-center" style="flex:0 0 33.333%;max-width:33.333%;padding:5px;word-break:break-word;"><b>User</b><br/><block-text-27/></div><div class="col-4 text-center" style="flex:0 0 33.333%;max-width:33.333%;padding:5px;word-break:break-word;"><b>Current Company</b><br/><block-text-28/></div><div class="col-4 text-center" style="flex:0 0 33.333%;max-width:33.333%;padding:5px;word-break:break-word;" block-attribute-29="title"><b>Allowed Companies</b><br/><block-text-30/></div></div><div class="text-center text-muted-soft" style="font-size:10px;margin-top:3px;"> OWL <block-text-31/></div></div></div></div>`);
  let block2 = createBlock(`<div><p class="odooError"><block-text-0/></p></div>`);
  let block3 = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning"> Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below and add one. </div></div>`);
  let block4 = createBlock(`<form block-handler-0="submit.prevent"><block-child-0/><block-child-1/><select id="remote-selection" class="form-control" block-handler-1="change"><block-child-2/></select><div class="checkbox"><label><input type="checkbox" block-property-2="checked" block-handler-3="change"/> Use Existing Session </label></div><button class="login" type="submit"> Login <block-child-3/></button><block-child-4/></form>`);
  let block5 = createBlock(`<p class="odooError"><block-text-0/></p>`);
  let block7 = createBlock(`<input type="text" placeholder="Username" block-property-0="value" block-handler-1="input"/>`);
  let block8 = createBlock(`<div class="password-field"><input block-attribute-0="type" id="unique-password" placeholder="Password" block-property-1="value" block-handler-2="input"/><span class="pass-viewer" block-handler-3="click.prevent"><i class="fa" block-attribute-4="class"/></span></div>`);
  let block10 = createBlock(`<option block-attribute-0="value" block-property-1="selected"><block-text-2/></option>`);
  let block11 = createBlock(`<i class="fa fa-cog fa-spin"/>`);
  let block12 = createBlock(`<div class="remote-info small-note"> Host: <block-text-0/><span class="current-source-chip"><block-text-1/></span></div>`);
  let block13 = createBlock(`<div class="odooError source-warning"><block-text-0/></div>`);
  let block14 = createBlock(`<select id="helpdeskStageFilter" block-property-0="value" block-handler-1="change"><option value="">All stages</option><block-child-0/></select>`);
  let block16 = createBlock(`<option block-attribute-0="value" block-property-1="selected"><block-text-2/></option>`);
  let block17 = createBlock(`<span class="startTimeCount"><block-text-0/></span>`);
  let block19 = createBlock(`<th class="text-center" style="width:72px">Therp Task</th>`);
  let block20 = createBlock(`<th class="priority-col">Priority</th>`);
  let block21 = createBlock(`<th class="item-col" style="width:280px"><div class="item-header-title"><block-text-0/> [<block-text-1/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-2="checked" block-handler-3="input"/> Show for everyone </label></th>`);
  let block22 = createBlock(`<th class="stage-col">Stage</th>`);
  let block23 = createBlock(`<th style="width:120px">Assigned To</th>`);
  let block24 = createBlock(`<th style="width:88px">Time Spent</th>`);
  let block26 = createBlock(`<th class="priority-col">Priority</th>`);
  let block27 = createBlock(`<th class="stage-col">Stage</th>`);
  let block28 = createBlock(`<th class="item-col"><div class="item-header-title"><block-text-0/> [<block-text-1/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-2="checked" block-handler-3="input"/> Show for everyone </label></th>`);
  let block30 = createBlock(`<th>Hours Spent</th>`);
  let block31 = createBlock(`<th>Remaining Hours</th>`);
  let block32 = createBlock(`<th class="project-col"><block-text-0/></th>`);
  let block34 = createBlock(`<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/><block-child-2/></td><block-child-3/><block-child-4/></tr>`);
  let block35 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
  let block36 = createBlock(`<i class="fa fa-info-circle action-btn pointer text-info" block-attribute-0="title" block-handler-1="click"/>`);
  let block37 = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`);
  let block39 = createBlock(`<td class="text-center" style="width:72px"><block-child-0/></td>`);
  let block40 = createBlock(`<a block-attribute-0="href" target="_blank" rel="noreferrer" class="btn btn-sm btn-outline-secondary" title="Open linked Therp task"><i class="fa fa-external-link"/></a>`);
  let block41 = createBlock(`<td class="priority-cell"><block-child-0/><block-child-1/></td>`);
  let block43 = createBlock(`<span class="fa fa-star checked"/>`);
  let block45 = createBlock(`<i class="fa fa-star-o"/>`);
  let block46 = createBlock(`<td class="issue-desc-cell" style="width:280px"><block-child-0/><block-child-1/></td>`);
  let block48 = createBlock(`<div class="text-muted-soft small" style="margin-top:3px;line-height:1.3"><block-child-0/></div>`);
  let block50 = createBlock(`<td class="stage-cell"><block-child-0/></td>`);
  let block52 = createBlock(`<td style="width:120px"><block-child-0/></td>`);
  let block54 = createBlock(`<td style="width:88px"><block-child-0/></td>`);
  let block57 = createBlock(`<td class="priority-cell"><block-child-0/><block-child-1/></td>`);
  let block59 = createBlock(`<span class="fa fa-star checked"/>`);
  let block61 = createBlock(`<i class="fa fa-star-o"/>`);
  let block62 = createBlock(`<td class="stage-cell"><block-child-0/></td>`);
  let block64 = createBlock(`<td class="issue-desc-cell"><block-child-0/></td>`);
  let block67 = createBlock(`<td class="hours-spent-cell"><div class="hours-cell-inner"><block-child-0/><i class="fa fa-list-alt pointer" title="View Timesheets for this task" block-handler-0="click"/></div></td>`);
  let block69 = createBlock(`<td><block-child-0/></td>`);
  let block71 = createBlock(`<td class="project-cell"><block-child-0/></td>`);
  let block73 = createBlock(`<tr><td block-attribute-0="colspan" class="text-center text-danger"> No matching items are currently available </td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b3, b4, b13, b14, b17, b18, b25, b33, b73;
    let attr1 = ctx['state'].view==='loading'?'':'hide';
    let txt1 = ctx['state'].busyMessage;
    let attr2 = ctx['state'].view==='login'?'':'hide';
    let attr3 = ctx['currentRemoteLogoSrc'];
    if (ctx['state'].bootError) {
      let txt2 = ctx['state'].bootError;
      b2 = block2([txt2]);
    }
    if (!ctx['state'].remotes.length) {
      b3 = block3();
    }
    if (ctx['state'].remotes.length) {
      let b5, b6, b9, b11, b12;
      let hdlr1 = ["prevent", ctx['login'], ctx];
      if (ctx['state'].loginError) {
        let txt3 = ctx['state'].loginError;
        b5 = block5([txt3]);
      }
      if (!ctx['state'].useExistingSession) {
        let prop1 = new String((ctx['state'].username) === 0 ? 0 : ((ctx['state'].username) || ""));
        const v1 = ctx['state'];
        let hdlr2 = [(_ev)=>{v1.username=_ev.target.value;}, ctx];
        const b7 = block7([prop1, hdlr2]);
        let attr4 = ctx['state'].showPassword?'text':'password';
        let prop2 = new String((ctx['state'].password) === 0 ? 0 : ((ctx['state'].password) || ""));
        const v2 = ctx['state'];
        let hdlr3 = [(_ev)=>{v2.password=_ev.target.value;}, ctx];
        let hdlr4 = ["prevent", ctx['togglePassword'], ctx];
        let attr5 = ctx['state'].showPassword?'fa-eye-slash':'fa-eye';
        const b8 = block8([attr4, prop2, hdlr3, hdlr4, attr5]);
        b6 = multi([b7, b8]);
      }
      const v3 = ctx['state'];
      let hdlr5 = [(_ev)=>{v3.selectedRemoteIndex=_ev.target.value;}, ctx];
      ctx = Object.create(ctx);
      const [k_block9, v_block9, l_block9, c_block9] = prepareList(ctx['state'].remotes);;
      for (let i1 = 0; i1 < l_block9; i1++) {
        ctx[`remote`] = k_block9[i1];
        ctx[`remote_index`] = i1;
        const key1 = ctx['remoteKey'](ctx['remote']);
        let attr6 = ''+ctx['remote_index'];
        let prop3 = new Boolean(ctx['state'].selectedRemoteIndex===''+ctx['remote_index']);
        let txt4 = ctx['remoteOptionLabel'](ctx['remote']);
        c_block9[i1] = withKey(block10([attr6, prop3, txt4]), key1);
      }
      ctx = ctx.__proto__;
      b9 = list(c_block9);
      let prop4 = new Boolean(ctx['state'].useExistingSession);
      let hdlr6 = [ctx['toggleUseExistingSession'], ctx];
      if (ctx['state'].loginLoading) {
        b11 = block11();
      }
      if (ctx['currentRemote']) {
        let txt5 = ctx['currentRemote'].url;
        let txt6 = ctx['currentRemote'].datasrc||'project.issue';
        b12 = block12([txt5, txt6]);
      }
      b4 = block4([hdlr1, hdlr5, prop4, hdlr6], [b5, b6, b9, b11, b12]);
    }
    let attr7 = ctx['state'].view==='main'?'':'hide';
    if (ctx['state'].sourceError) {
      let txt7 = ctx['state'].sourceError;
      b13 = block13([txt7]);
    }
    let prop5 = new String((ctx['state'].searchQuery) === 0 ? 0 : ((ctx['state'].searchQuery) || ""));
    const v4 = ctx['state'];
    let hdlr7 = [(_ev)=>{v4.searchQuery=_ev.target.value;}, ctx];
    if (ctx['isHelpdeskSource']) {
      let prop6 = new String((ctx['state'].helpdeskStageFilter) === 0 ? 0 : ((ctx['state'].helpdeskStageFilter) || ""));
      const v5 = ctx['updateHelpdeskStageFilter'];
      let hdlr8 = [(_ev)=>v5(_ev.target.value), ctx];
      ctx = Object.create(ctx);
      const [k_block15, v_block15, l_block15, c_block15] = prepareList(ctx['helpdeskStageOptions']);;
      for (let i1 = 0; i1 < l_block15; i1++) {
        ctx[`stage`] = k_block15[i1];
        const key1 = ctx['stage'].id;
        let attr8 = ''+ctx['stage'].id;
        let prop7 = new Boolean(ctx['state'].helpdeskStageFilter===''+ctx['stage'].id);
        let txt8 = ctx['stage'].name;
        c_block15[i1] = withKey(block16([attr8, prop7, txt8]), key1);
      }
      ctx = ctx.__proto__;
      const b15 = list(c_block15);
      b14 = block14([prop6, hdlr8], [b15]);
    }
    let prop8 = new String((ctx['state'].limitTo) === 0 ? 0 : ((ctx['state'].limitTo) || ""));
    const v6 = ctx['updateLimitPreference'];
    let hdlr9 = [(_ev)=>v6(_ev.target.value), ctx];
    let prop9 = new Boolean(ctx['state'].autoDownloadIssueTimesheet);
    let hdlr10 = [ctx['toggleAutoDownload'], ctx];
    let hdlr11 = [ctx['downloadCurrentMonthTimesheets'], ctx];
    let hdlr12 = [ctx['switchBetweenRemotes'], ctx];
    let hdlr13 = [ctx['refreshAll'], ctx];
    let hdlr14 = [ctx['resetTimer'], ctx];
    let hdlr15 = [ctx['logout'], ctx];
    let hdlr16 = [ctx['toggleRecording'], ctx];
    let hdlr17 = [ctx['openMessages'], ctx];
    let attr9 = (ctx['state'].msgUnreadTotal||0)>0?'':'display:none';
    let txt9 = (ctx['state'].msgUnreadTotal||0)>99?'99+':''+(ctx['state'].msgUnreadTotal||'');
    let hdlr18 = [ctx['openLogs'], ctx];
    if (ctx['state'].timerStartIso) {
      let txt10 = ctx['formattedTimer'];
      b17 = block17([txt10]);
    }
    if (ctx['isHelpdeskSource']) {
      let b19, b20, b21, b22, b23, b24;
      if (ctx['showHelpdeskTherpLink']) {
        b19 = block19();
      }
      b20 = block20();
      let txt11 = ctx['itemLabelPlural'];
      let txt12 = ''+ctx['filteredIssues'].length;
      let prop10 = new Boolean(ctx['state'].allIssues);
      const v7 = ctx['updateShowAllPreference'];
      let hdlr19 = [(_ev)=>v7(_ev.target.checked), ctx];
      b21 = block21([txt11, txt12, prop10, hdlr19]);
      b22 = block22();
      if (ctx['showHelpdeskAssignee']) {
        b23 = block23();
      }
      if (ctx['showHelpdeskHours']) {
        b24 = block24();
      }
      b18 = multi([b19, b20, b21, b22, b23, b24]);
    } else {
      let b26, b27, b28, b29, b32;
      b26 = block26();
      b27 = block27();
      let txt13 = ctx['itemLabelPlural'];
      let txt14 = ''+ctx['filteredIssues'].length;
      let prop11 = new Boolean(ctx['state'].allIssues);
      const v8 = ctx['updateShowAllPreference'];
      let hdlr20 = [(_ev)=>v8(_ev.target.checked), ctx];
      b28 = block28([txt13, txt14, prop11, hdlr20]);
      if (ctx['state'].dataSource==='project.task') {
        const b30 = block30();
        const b31 = block31();
        b29 = multi([b30, b31]);
      }
      let txt15 = ctx['relationHeaderLabel'];
      b32 = block32([txt15]);
      b25 = multi([b26, b27, b28, b29, b32]);
    }
    if (ctx['filteredIssues'].length) {
      ctx = Object.create(ctx);
      const [k_block33, v_block33, l_block33, c_block33] = prepareList(ctx['filteredIssues']);;
      for (let i1 = 0; i1 < l_block33; i1++) {
        ctx[`ir`] = k_block33[i1];
        const key1 = ctx['ir'].id;
        let b35, b36, b37, b38, b56;
        let attr10 = ctx['isActiveTimerItem'](ctx['ir'])?'active-row':'';
        if (ctx['isActiveTimerItem'](ctx['ir'])) {
          const v9 = ctx['stopTimer'];
          const v10 = ctx['ir'];
          let hdlr21 = [()=>v9(v10), ctx];
          b35 = block35([hdlr21]);
        } else if (ctx['isHelpdeskSource']&&ctx['helpdeskTimesheetBlocked'](ctx['ir'])) {
          let attr11 = ctx['helpdeskTimesheetBlockMessage'](ctx['ir']);
          const v11 = ctx['showHelpdeskTimesheetInfo'];
          const v12 = ctx['ir'];
          let hdlr22 = [()=>v11(v12), ctx];
          b36 = block36([attr11, hdlr22]);
        } else {
          const v13 = ctx['startTimer'];
          const v14 = ctx['ir'];
          let hdlr23 = [()=>v13(v14), ctx];
          b37 = block37([hdlr23]);
        }
        if (ctx['isHelpdeskSource']) {
          let b39, b41, b46, b50, b52, b54;
          if (ctx['showHelpdeskTherpLink']) {
            let b40;
            if (ctx['helpdeskTherpLinkHref'](ctx['ir'])) {
              let attr12 = ctx['helpdeskTherpLinkHref'](ctx['ir']);
              b40 = block40([attr12]);
            }
            b39 = block39([], [b40]);
          }
          ctx = Object.create(ctx);
          const [k_block42, v_block42, l_block42, c_block42] = prepareList(ctx['priorityStarsArr'](ctx['ir'].priority));;
          for (let i2 = 0; i2 < l_block42; i2++) {
            ctx[`s`] = k_block42[i2];
            const key2 = ctx['s'];
            c_block42[i2] = withKey(block43(), key2);
          }
          ctx = ctx.__proto__;
          const b42 = list(c_block42);
          ctx = Object.create(ctx);
          const [k_block44, v_block44, l_block44, c_block44] = prepareList(ctx['priorityOutlineArr'](ctx['ir'].priority));;
          for (let i2 = 0; i2 < l_block44; i2++) {
            ctx[`o`] = k_block44[i2];
            const key2 = ctx['o'];
            c_block44[i2] = withKey(block45(), key2);
          }
          ctx = ctx.__proto__;
          const b44 = list(c_block44);
          b41 = block41([], [b42, b44]);
          let b47, b48;
          b47 = comp1({text: ctx['issueLabel'](ctx['ir']),limit: 55,href: ctx['issueHref'](ctx['ir'])}, key + `__1__${key1}`, node, this, null);
          if (ctx['showHelpdeskDescription']&&ctx['helpdeskDescriptionText'](ctx['ir'])) {
            const b49 = comp2({text: ctx['helpdeskDescriptionText'](ctx['ir']),limit: 70}, key + `__2__${key1}`, node, this, null);
            b48 = block48([], [b49]);
          }
          b46 = block46([], [b47, b48]);
          const b51 = comp3({text: (ctx['ir'].stage_id&&ctx['ir'].stage_id[1])||'',limit: 14}, key + `__3__${key1}`, node, this, null);
          b50 = block50([], [b51]);
          if (ctx['showHelpdeskAssignee']) {
            const b53 = comp4({text: ctx['relationLabel'](ctx['helpdeskAssigneeValue'](ctx['ir'])),limit: 22}, key + `__4__${key1}`, node, this, null);
            b52 = block52([], [b53]);
          }
          if (ctx['showHelpdeskHours']) {
            const b55 = comp5({text: ctx['formatHours'](ctx['helpdeskHoursValue'](ctx['ir'])),limit: 10}, key + `__5__${key1}`, node, this, null);
            b54 = block54([], [b55]);
          }
          b38 = multi([b39, b41, b46, b50, b52, b54]);
        } else {
          let b57, b62, b64, b66, b71;
          ctx = Object.create(ctx);
          const [k_block58, v_block58, l_block58, c_block58] = prepareList(ctx['priorityStarsArr'](ctx['ir'].priority));;
          for (let i2 = 0; i2 < l_block58; i2++) {
            ctx[`s`] = k_block58[i2];
            const key2 = ctx['s'];
            c_block58[i2] = withKey(block59(), key2);
          }
          ctx = ctx.__proto__;
          const b58 = list(c_block58);
          ctx = Object.create(ctx);
          const [k_block60, v_block60, l_block60, c_block60] = prepareList(ctx['priorityOutlineArr'](ctx['ir'].priority));;
          for (let i2 = 0; i2 < l_block60; i2++) {
            ctx[`o`] = k_block60[i2];
            const key2 = ctx['o'];
            c_block60[i2] = withKey(block61(), key2);
          }
          ctx = ctx.__proto__;
          const b60 = list(c_block60);
          b57 = block57([], [b58, b60]);
          const b63 = comp6({text: (ctx['ir'].stage_id&&ctx['ir'].stage_id[1])||'',limit: 14}, key + `__6__${key1}`, node, this, null);
          b62 = block62([], [b63]);
          const b65 = comp7({text: ctx['issueLabel'](ctx['ir']),limit: 60,href: ctx['issueHref'](ctx['ir'])}, key + `__7__${key1}`, node, this, null);
          b64 = block64([], [b65]);
          if (ctx['state'].dataSource==='project.task') {
            const b68 = comp8({text: ctx['formatHours'](ctx['ir'].effective_hours),limit: 10}, key + `__8__${key1}`, node, this, null);
            const v15 = ctx['openTimesheets'];
            const v16 = ctx['ir'];
            let hdlr24 = [()=>v15(v16), ctx];
            const b67 = block67([hdlr24], [b68]);
            const b70 = comp9({text: ctx['formatHours'](ctx['ir'].remaining_hours),limit: 10}, key + `__9__${key1}`, node, this, null);
            const b69 = block69([], [b70]);
            b66 = multi([b67, b69]);
          }
          const b72 = comp10({text: ctx['relationLabel'](ctx['resourceRelationValue'](ctx['ir'])),limit: 22}, key + `__10__${key1}`, node, this, null);
          b71 = block71([], [b72]);
          b56 = multi([b57, b62, b64, b66, b71]);
        }
        c_block33[i1] = withKey(block34([attr10], [b35, b36, b37, b38, b56]), key1);
      }
      ctx = ctx.__proto__;
      b33 = list(c_block33);
    } else {
      let attr13 = ''+ctx['tableColumnCount'];
      b73 = block73([attr13]);
    }
    let attr14 = ctx['currentRemoteLogoSrc'];
    let txt16 = (ctx['currentRemote']&&(ctx['currentRemote'].name||ctx['currentRemote'].database))||'Odoo';
    let txt17 = ctx['currentDataSourceLabel'];
    let txt18 = ctx['state'].serverVersion||'N/A';
    let txt19 = ctx['state'].currentDatabase||'—';
    let txt20 = ctx['state'].currentHost||'—';
    let txt21 = (ctx['state'].user&&ctx['state'].user.display_name)||'—';
    let txt22 = ctx['currentCompanyLabel'];
    let attr15 = ctx['allowedCompanyLabels'];
    let txt23 = ctx['allowedCompanySummary'];
    let txt24 = ctx['owlVersion'];
    return block1([attr1, txt1, attr2, attr3, attr7, prop5, hdlr7, prop8, hdlr9, prop9, hdlr10, hdlr11, hdlr12, hdlr13, hdlr14, hdlr15, hdlr16, hdlr17, attr9, txt9, hdlr18, attr14, txt16, txt17, txt18, txt19, txt20, txt21, txt22, attr15, txt23, txt24], [b2, b3, b4, b13, b14, b17, b18, b25, b33, b73]);
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
// Added by scripts/compile-templates.sh
globalThis.__THERP_TIMER_TEMPLATES__ = templates;
