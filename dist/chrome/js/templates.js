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
  
  let block1 = createBlock(`<div><!-- ── Left navigation sidebar ─────────────────────────────────── --><div id="navigation"><h1 class="title-app">Timer Options</h1><ul class="list-group"><li class="chooser list-group-item" block-attribute-0="class" block-handler-1="click"><i class="fa fa-info-circle"/> <span>About Timer</span></li><li class="chooser list-group-item" block-attribute-2="class" block-handler-3="click"><i class="fa fa-shield"/> <span>Privacy &amp; License</span></li><li class="chooser list-group-item" block-attribute-4="class" block-handler-5="click"><i class="fa fa-sliders"/> <span>Preferences</span></li><li class="chooser list-group-item" block-attribute-6="class" block-handler-7="click"><i class="fa fa-cogs"/> <span>Options</span></li></ul><hr/><div class="footer-app"><a href="popup.html" class="back-left nav-hand-button" title="Back to timer" aria-label="Back to timer"><i class="fa fa-hand-o-left"/></a></div></div><!-- ── About page ──────────────────────────────────────────────── --><div class="options-box box" block-attribute-8="class"><h1><div class="logo"><img src="/img/logo.png"/></div></h1><hr/><div class="about-app"><h4 class="title-app text-center">Description</h4><hr/> This is the Owl browser extension for posting work hours to Odoo timesheets. It supports Project Tasks, legacy Issues and Helpdesk Tickets across saved Odoo remotes. <hr/><h4 class="title-app text-center">Features</h4><hr/><div class="timer-features"><ul class="list-group"><li class="list-group-item">Project Tasks, legacy Issues and Helpdesk Tickets</li><li class="list-group-item">Start/stop timing and create native Odoo timesheet lines</li><li class="list-group-item">Helpdesk stage filtering plus a readiness check before starting a ticket timer</li><li class="list-group-item">A blue info icon explains when Odoo company/employee configuration prevents Helpdesk timesheets</li><li class="list-group-item">Filter by stage and show assigned items or everyone’s items</li><li class="list-group-item">Save the same Odoo database as separate Task, Issue or Helpdesk remotes</li><li class="list-group-item">Optional company logo per remote, with the Therp logo as fallback</li><li class="list-group-item">Switch between remote sessions and data sources and data sources and download timesheets as CSV</li></ul></div><!-- THERP UX PATCH: supported-version matrix. --><h4 class="title-app text-center" style="margin-top:16px;">Supported Odoo Versions</h4><hr/><div class="timer-features"><ul class="list-group"><li class="list-group-item"><b>Issues (project.issue):</b> Odoo 8.0–10.0 when the legacy Issue Tracking module is installed.</li><li class="list-group-item"><b>Project Tasks (project.task):</b> Odoo 14.0–19.0 is the current supported/tested compatibility range.</li><li class="list-group-item"><b>Helpdesk Tickets (helpdesk.ticket):</b> target compatibility is Odoo 16.0–19.0 when Helpdesk is installed; Helpdesk timesheet recording additionally requires a compatible server-side timesheet integration. Current acceptance testing focuses on 18.0–19.0.</li><li class="list-group-item"><i class="fa fa-info-circle"/> The timer also detects fields/capabilities from the connected server, so installed modules and customizations can affect what is available.</li></ul></div><h4 class="title-app text-center" style="margin-top:16px;">Helpdesk notes</h4><hr/><ul class="list-group"><li class="list-group-item">Choose <b>From Helpdesk Tickets</b> on the saved remote. The same host/database can also have a separate <b>From Tasks</b> remote.</li><li class="list-group-item">If a blue <i class="fa fa-info-circle"/> appears instead of Play, click it for the exact reason that Odoo cannot currently create a Helpdesk timesheet.</li><li class="list-group-item">Odoo normally requires an active employee linked to the current user in the ticket/project company. The extension checks this when the server permits it; Odoo remains the final authority.</li><li class="list-group-item">When available, the Therp Task button opens the ticket's linked Therp task. Tickets without a link simply show an empty cell.</li></ul></div></div><!-- THERP UX PATCH: privacy-license-page --><div class="options-box box" block-attribute-9="class"><div class="about-app"><h4 class="title-app text-center"><i class="fa fa-shield"/> Privacy &amp; License</h4><hr/><div class="timer-features"><ul class="list-group"><li class="list-group-item"><b>Local configuration:</b> saved Odoo remotes, data-source choices, preferences and optional remote logos are stored in browser-extension storage.</li><li class="list-group-item"><b>Odoo communication:</b> the extension communicates with the Odoo hosts you configure in order to authenticate, load work items and create/read timesheets.</li><li class="list-group-item"><b>Sessions:</b> after login the extension uses the Odoo session for subsequent RPC calls; do not share browser profiles containing active sessions.</li><li class="list-group-item"><b>Exports:</b> CSV files are produced only when you request a download.</li><li class="list-group-item"><b>Security:</b> keep Odoo permissions, employee/company access and browser profiles appropriately restricted for the people using this timer.</li></ul></div><h4 class="title-app text-center" style="margin-top:16px;">License</h4><hr/><p> Therp Timer is distributed under the repository's <b>Therp Timer License</b>. The full license text, conditions, warranty disclaimer and liability terms are maintained with the source code. </p><p class="text-center"><a href="https://github.com/Therp/odoo-timer/blob/master/LICENSE.md" target="_blank" rel="noreferrer"><i class="fa fa-file-text-o"/> Read the full software license </a></p><hr/><p class="text-muted" style="font-size:12px;line-height:1.5;"> This page is a product-oriented summary. For the current and authoritative Therp privacy statement, including how Therp B.V. processes personal data, retention, data-subject rights and contact information, use the link below. </p><p class="text-center"><a href="https://therp.nl/terms-and-conditions#Therp-Privacy-Statement" target="_blank" rel="noreferrer"><i class="fa fa-external-link"/> Open the current Therp Privacy Statement </a></p></div></div><!-- THERP ADVANCED LAYOUT PREFS V5 --><block-child-0/><!-- ── Options / remotes page ──────────────────────────────────── --><div class="options-box box" block-attribute-10="class"><div class="form remote-options-form"><form block-handler-11="submit.prevent"><!-- [FIX #38] General Settings ──────────────────────────── --><h4 class="remote-title text-info">General Settings</h4><hr/><div class="form-group" style="padding:0 2px;"><label class="general-setting-label" style="display:flex;align-items:center;gap:8px;margin:0;line-height:1.35;"><input type="checkbox" class="defaultCheckbox" style="margin:0;position:static;flex:0 0 auto;" block-property-12="checked" block-handler-13="change"/><span>Auto Download Current Item Timesheet</span></label><p class="inline-help" style="margin:6px 0 0 24px;line-height:1.35;"> Store the timesheet locally each time you stop the timer on an item. </p></div><hr/><!-- Add Remote form ─────────────────────────────────────── --><h4 class="remote-title text-info">Add Remote</h4><hr/><div class="form-group"><label for="remote-host">Odoo Host</label><input type="text" class="form-control" id="remote-host" placeholder="https://your-odoo-host.example" block-property-14="value" block-handler-15="input"/></div><div class="form-group"><label for="remote-name">Display Name</label><input type="text" class="form-control" id="remote-name" placeholder="Therp" block-property-16="value" block-handler-17="input"/></div><div class="form-group"><label for="remote-database">Odoo Database</label><input type="text" class="form-control" id="remote-database" placeholder="someodoodatabase" block-property-18="value" block-handler-19="input"/></div><div class="form-group"><label class="label">Data Source</label><ul class="data-source-list list-group"><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.issue" id="FromIssues" block-property-20="checked" block-handler-21="change"/><label class="form-check-label" for="FromIssues">From Issues</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.task" id="FromTasks" block-property-22="checked" block-handler-23="change"/><label class="form-check-label" for="FromTasks">From Tasks</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="helpdesk.ticket" id="FromHelpdeskTickets" block-property-24="checked" block-handler-25="change"/><label class="form-check-label" for="FromHelpdeskTickets">From Helpdesk Tickets</label></div></li></ul></div><div class="form-group"><label for="remote-logo">Company Logo <span class="text-muted">(optional)</span></label><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><img block-attribute-26="src" alt="Remote logo preview" style="width:76px;height:54px;object-fit:contain;border:1px solid #dbe3ea;border-radius:6px;background:#fff;padding:4px;"/><div style="min-width:220px;flex:1;"><input id="remote-logo" type="file" class="form-control" accept="image/png,image/jpeg,image/webp,image/gif" block-handler-27="change" block-handler-28="click"/><p class="inline-help logo-file-help">Choose a company logo for this remote. When Options is still inside the toolbar popup, Browse first opens the full Options tab so the native file picker can stay open. Click Browse again in that tab, then choose PNG, JPEG, WebP, or GIF up to 512 KB. Use the Therp default logo button to remove a saved custom logo.</p><div style="margin-top:5px;font-size:11px;color:#7b8794;line-height:1.35;"> PNG, JPEG, WebP or GIF; maximum 512 KB. <br/><b>Company logos are stored with each remote. If this Options page is running inside the extension popup, clicking Browse first opens the full Options tab so the browser file picker can stay open. Click Browse again in that tab to choose PNG, JPEG, WebP, or GIF up to 512 KB. Use the Therp default logo button to remove a saved custom logo.</b> if choosing a file closes the extension popup, open Inspect/DevTools for the popup first and then choose the logo. </div><button type="button" class="btn btn-sm btn-default" style="margin-top:7px;" block-handler-29="click"> Use Therp default logo </button></div></div></div><span class="caption-remotes">Controls</span><div class="remotes-control-btns col-md-12 text-center text-info pointer"><i title="Add a remote host" class="fa fa-2x fa-plus-circle" block-handler-30="click"/><i title="Refresh list of remotes" class="fa fa-2x fa-refresh" block-handler-31="click"/><i title="View list of remotes" class="fa fa-2x fa-eye" block-handler-32="click"/><i title="Remove all remotes" class="fa fa-2x fa-minus-circle" block-handler-33="click"/></div><block-child-1/></form><!-- Saved remotes table ──────────────────────────────────── --><block-child-2/></div></div></div>`);
  let block2 = createBlock(`<div class="options-box box" block-attribute-0="class"><h4 class="title-app">Preferences</h4><hr/><div class="layout-pref-card"><h5><block-child-0/> Layout</h5><p class="inline-help"> Defaults shown here mirror the current browser's source CSS. Until you press Save, the source CSS remains authoritative. Saved values are local to this browser, validated before storage, and revalidated every time the timer loads. </p><block-child-1/><details class="layout-pref-section" open="open"><summary>Main Timer Page</summary><div class="layout-pref-grid"><div class="layout-pref-field" block-attribute-1="class"><label>Internal width (px)</label><input type="number" step="1" inputmode="numeric" min="700" max="1200" block-property-2="value" block-handler-3="input"/><div class="layout-pref-help">Chrome may cap the visible action popup; this controls the internal layout width.</div></div><div class="layout-pref-field"><label>Internal height (px)</label><input type="number" step="1" inputmode="numeric" min="500" max="1000" block-property-4="value" block-handler-5="input"/></div><div class="layout-pref-field"><label>Horizontal padding (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="60" block-property-6="value" block-handler-7="input"/></div><div class="layout-pref-field"><label>Top padding (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="60" block-property-8="value" block-handler-9="input"/></div><div class="layout-pref-field"><label>Bottom padding (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="60" block-property-10="value" block-handler-11="input"/></div></div></details><details class="layout-pref-section"><summary>Toolbar &amp; Search</summary><div class="layout-pref-grid"><div class="layout-pref-field"><label>Search/control font (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-12="value" block-handler-13="input"/></div><div class="layout-pref-field"><label>Control height (px)</label><input type="number" step="1" inputmode="numeric" min="28" max="72" block-property-14="value" block-handler-15="input"/></div><div class="layout-pref-field"><label>Action icon size (px)</label><input type="number" step="1" inputmode="numeric" min="16" max="48" block-property-16="value" block-handler-17="input"/></div><div class="layout-pref-field"><label>Toolbar gap (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="30" block-property-18="value" block-handler-19="input"/></div></div></details><details class="layout-pref-section" open="open"><summary>Task / Ticket Table</summary><div class="layout-pref-grid"><div class="layout-pref-field"><label>Body font size (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-20="value" block-handler-21="input"/></div><div class="layout-pref-field"><label>Header font size (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-22="value" block-handler-23="input"/></div><div class="layout-pref-field"><label>Cell vertical padding (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="24" block-property-24="value" block-handler-25="input"/></div><div class="layout-pref-field" block-attribute-26="class"><label>Header wrapping</label><select block-property-27="value" block-handler-28="change"><option value="wrap">Wrap</option><option value="nowrap">No wrap</option></select></div><div class="layout-pref-field"><label>Cell wrapping</label><select block-property-29="value" block-handler-30="change"><option value="wrap">Wrap</option><option value="nowrap">No wrap</option></select></div><div class="layout-pref-field" block-attribute-31="class"><label>Column sizing</label><select block-property-32="value" block-handler-33="change"><option value="fixed">Fixed</option><option value="auto">Content-aware</option></select></div><div class="layout-pref-field" block-attribute-34="class"><label>Minimum table width (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="2400" block-property-35="value" block-handler-36="input"/><div class="layout-pref-help">0 keeps the table at the available width. Larger values enable horizontal table scrolling.</div></div><div class="layout-pref-field" block-attribute-37="class"><label><input type="checkbox" block-property-38="checked" block-handler-39="change"/> Alternating row stripes </label></div><div class="layout-pref-field"><label>Border radius (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="30" block-property-40="value" block-handler-41="input"/></div><div class="layout-pref-field" block-attribute-42="class"><label>Header background</label><input type="color" block-property-43="value" block-handler-44="input"/></div><div class="layout-pref-field"><label>Header text</label><input type="color" block-property-45="value" block-handler-46="input"/></div><div class="layout-pref-field"><label>Row background</label><input type="color" block-property-47="value" block-handler-48="input"/></div><div class="layout-pref-field" block-attribute-49="class"><label>Stripe background</label><input type="color" block-property-50="value" block-handler-51="input"/></div><div class="layout-pref-field"><label>Hover background</label><input type="color" block-property-52="value" block-handler-53="input"/></div><div class="layout-pref-field"><label>Active row background</label><input type="color" block-property-54="value" block-handler-55="input"/></div><div class="layout-pref-field"><label>Border color</label><input type="color" block-property-56="value" block-handler-57="input"/></div></div></details><details class="layout-pref-section"><summary>Table Column Widths</summary><div class="layout-pref-grid"><div class="layout-pref-field" block-attribute-58="class"><label>Action (px)</label><input type="number" step="1" inputmode="numeric" min="30" max="700" block-property-59="value" block-handler-60="input"/></div><div class="layout-pref-field"><label>Priority (px)</label><input type="number" step="1" inputmode="numeric" min="30" max="700" block-property-61="value" block-handler-62="input"/></div><div class="layout-pref-field"><label>Stage (px)</label><input type="number" step="1" inputmode="numeric" min="30" max="700" block-property-63="value" block-handler-64="input"/></div><div class="layout-pref-field"><label>Task / Ticket (px)</label><input type="number" step="1" inputmode="numeric" min="30" max="700" block-property-65="value" block-handler-66="input"/></div><div class="layout-pref-field"><label>Hours / Time (px)</label><input type="number" step="1" inputmode="numeric" min="30" max="700" block-property-67="value" block-handler-68="input"/></div><div class="layout-pref-field"><label>Project / Relation (px)</label><input type="number" step="1" inputmode="numeric" min="30" max="700" block-property-69="value" block-handler-70="input"/></div></div></details><details class="layout-pref-section"><summary>Info Footer</summary><div class="layout-pref-grid"><div class="layout-pref-field"><label>Label font size (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-71="value" block-handler-72="input"/></div><div class="layout-pref-field"><label>Value font size (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-73="value" block-handler-74="input"/></div><div class="layout-pref-field"><label>Vertical padding (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="60" block-property-75="value" block-handler-76="input"/></div><div class="layout-pref-field"><label>Horizontal padding (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="60" block-property-77="value" block-handler-78="input"/></div><div class="layout-pref-field"><label>Border radius (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="30" block-property-79="value" block-handler-80="input"/></div><div class="layout-pref-field"><label>Line height ×10</label><input type="number" step="1" inputmode="numeric" min="10" max="30" block-property-81="value" block-handler-82="input"/><div class="layout-pref-help">17 = line-height 1.7</div></div><div class="layout-pref-field"><label>Label color</label><input type="color" block-property-83="value" block-handler-84="input"/></div><div class="layout-pref-field"><label>Value color</label><input type="color" block-property-85="value" block-handler-86="input"/></div><div class="layout-pref-field"><label>Background</label><input type="color" block-property-87="value" block-handler-88="input"/></div><div class="layout-pref-field"><label>Border color</label><input type="color" block-property-89="value" block-handler-90="input"/></div></div></details><details class="layout-pref-section"><summary>Options Page</summary><div class="layout-pref-grid"><div class="layout-pref-field"><label>Page font size (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-91="value" block-handler-92="input"/></div><div class="layout-pref-field"><label>Sidebar font size (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-93="value" block-handler-94="input"/></div><div class="layout-pref-field"><label>Remotes table font (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-95="value" block-handler-96="input"/></div><div class="layout-pref-field"><label>Remotes header font (px)</label><input type="number" step="1" inputmode="numeric" min="10" max="22" block-property-97="value" block-handler-98="input"/></div><div class="layout-pref-field"><label>Remotes cell padding (px)</label><input type="number" step="1" inputmode="numeric" min="0" max="24" block-property-99="value" block-handler-100="input"/></div><div class="layout-pref-field"><label>Remotes table minimum width (px)</label><input type="number" step="1" inputmode="numeric" min="600" max="1800" block-property-101="value" block-handler-102="input"/></div><div class="layout-pref-field"><label>Remotes header wrapping</label><select block-property-103="value" block-handler-104="change"><option value="wrap">Wrap</option><option value="nowrap">No wrap</option></select></div></div></details><div class="layout-pref-actions"><button type="button" class="btn btn-info" block-handler-105="click"><i class="fa fa-save"/> Save </button><button type="button" class="btn btn-default" block-handler-106="click"><i class="fa fa-undo"/> Reset to source CSS defaults </button><button type="button" class="btn btn-default" block-handler-107="click"><i class="fa fa-table"/> Try suggested settings </button></div><block-child-2/></div></div>`);
  let block4 = createBlock(`<div class="layout-pref-error"><block-child-0/></div>`);
  let block6 = createBlock(`<div class="layout-suggestion-note"><i class="fa fa-lightbulb-o"/><div><strong>Suggested settings loaded.</strong> Review the blue-highlighted fields, then press <strong>Save</strong> to apply them. If you edit a highlighted field yourself, its suggestion highlight is removed automatically. </div></div>`);
  let block7 = createBlock(`<div class="remote-error"><block-child-0/></div>`);
  let block9 = createBlock(`<div class="remotes-table-info"><table class="table table-bordered"><caption class="text-info caption-remotes"> List of Available Remotes </caption><thead><tr><th scope="col" style="width:64px">Logo</th><th scope="col">Remote</th><th scope="col">Host</th><th scope="col">Database</th><th scope="col">Source</th><th scope="col">State</th><th/></tr></thead><tbody><block-child-0/></tbody></table></div>`);
  let block11 = createBlock(`<tr><td class="text-center" style="width:64px"><img block-attribute-0="src" alt="Remote logo" style="width:48px;height:34px;object-fit:contain;background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:2px;"/></td><td class="text-info"><block-child-0/></td><td><block-child-1/></td><td><block-child-2/></td><td><block-child-3/></td><td><block-child-4/></td><td class="remote-row-actions"><i class="fa fa-pencil text-primary" title="Edit remote" style="margin-right: 10px; cursor: pointer;" block-handler-1="click"/><i class="fa fa-trash text-danger" title="Remove remote" style="cursor: pointer;" block-handler-2="click"/></td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b7, b9;
    let attr1 = ctx['state'].activePage==='about'?'selected':'notselected';
    const v1 = ctx['state'];
    let hdlr1 = [()=>v1.activePage='about', ctx];
    let attr2 = ctx['state'].activePage==='privacy'?'selected':'notselected';
    const v2 = ctx['state'];
    let hdlr2 = [()=>v2.activePage='privacy', ctx];
    let attr3 = ctx['state'].activePage==='preferences'?'selected':'notselected';
    const v3 = ctx['state'];
    let hdlr3 = [()=>v3.activePage='preferences', ctx];
    let attr4 = ctx['state'].activePage==='options'?'selected':'notselected';
    const v4 = ctx['state'];
    let hdlr4 = [()=>v4.activePage='options', ctx];
    let attr5 = ctx['state'].activePage==='about'?'active_page':'inactive_page';
    let attr6 = ctx['state'].activePage==='privacy'?'active_page':'inactive_page';
    if (ctx['state'].layoutCanCustomize) {
      let b3, b4, b6;
      let attr7 = ctx['state'].activePage==='preferences'?'active_page':'inactive_page';
      b3 = safeOutput(ctx['state'].layoutBrowser);
      if (ctx['state'].layoutError) {
        const b5 = safeOutput(ctx['state'].layoutError);
        b4 = block4([], [b5]);
      }
      let attr8 = ctx['state'].layoutSuggestedFields['main.width']?'layout-pref-field layout-pref-suggested':'layout-pref-field';
      let prop1 = new String((ctx['state'].layoutPrefs.main.width) === 0 ? 0 : ((ctx['state'].layoutPrefs.main.width) || ""));
      const v5 = ctx['state'];
      const v6 = ctx['markLayoutFieldEdited'];
      let hdlr5 = [(_ev)=>{v5.layoutPrefs.main.width=_ev.target.value;v5.layoutError='';v6('main.width');}, ctx];
      let prop2 = new String((ctx['state'].layoutPrefs.main.height) === 0 ? 0 : ((ctx['state'].layoutPrefs.main.height) || ""));
      const v7 = ctx['state'];
      let hdlr6 = [(_ev)=>{v7.layoutPrefs.main.height=_ev.target.value;v7.layoutError='';}, ctx];
      let prop3 = new String((ctx['state'].layoutPrefs.main.wrapperPaddingX) === 0 ? 0 : ((ctx['state'].layoutPrefs.main.wrapperPaddingX) || ""));
      const v8 = ctx['state'];
      let hdlr7 = [(_ev)=>{v8.layoutPrefs.main.wrapperPaddingX=_ev.target.value;v8.layoutError='';}, ctx];
      let prop4 = new String((ctx['state'].layoutPrefs.main.wrapperPaddingTop) === 0 ? 0 : ((ctx['state'].layoutPrefs.main.wrapperPaddingTop) || ""));
      const v9 = ctx['state'];
      let hdlr8 = [(_ev)=>{v9.layoutPrefs.main.wrapperPaddingTop=_ev.target.value;v9.layoutError='';}, ctx];
      let prop5 = new String((ctx['state'].layoutPrefs.main.wrapperPaddingBottom) === 0 ? 0 : ((ctx['state'].layoutPrefs.main.wrapperPaddingBottom) || ""));
      const v10 = ctx['state'];
      let hdlr9 = [(_ev)=>{v10.layoutPrefs.main.wrapperPaddingBottom=_ev.target.value;v10.layoutError='';}, ctx];
      let prop6 = new String((ctx['state'].layoutPrefs.toolbar.searchFontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.toolbar.searchFontSize) || ""));
      const v11 = ctx['state'];
      let hdlr10 = [(_ev)=>{v11.layoutPrefs.toolbar.searchFontSize=_ev.target.value;v11.layoutError='';}, ctx];
      let prop7 = new String((ctx['state'].layoutPrefs.toolbar.controlHeight) === 0 ? 0 : ((ctx['state'].layoutPrefs.toolbar.controlHeight) || ""));
      const v12 = ctx['state'];
      let hdlr11 = [(_ev)=>{v12.layoutPrefs.toolbar.controlHeight=_ev.target.value;v12.layoutError='';}, ctx];
      let prop8 = new String((ctx['state'].layoutPrefs.toolbar.iconSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.toolbar.iconSize) || ""));
      const v13 = ctx['state'];
      let hdlr12 = [(_ev)=>{v13.layoutPrefs.toolbar.iconSize=_ev.target.value;v13.layoutError='';}, ctx];
      let prop9 = new String((ctx['state'].layoutPrefs.toolbar.gap) === 0 ? 0 : ((ctx['state'].layoutPrefs.toolbar.gap) || ""));
      const v14 = ctx['state'];
      let hdlr13 = [(_ev)=>{v14.layoutPrefs.toolbar.gap=_ev.target.value;v14.layoutError='';}, ctx];
      let prop10 = new String((ctx['state'].layoutPrefs.table.fontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.fontSize) || ""));
      const v15 = ctx['state'];
      let hdlr14 = [(_ev)=>{v15.layoutPrefs.table.fontSize=_ev.target.value;v15.layoutError='';}, ctx];
      let prop11 = new String((ctx['state'].layoutPrefs.table.headerFontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.headerFontSize) || ""));
      const v16 = ctx['state'];
      let hdlr15 = [(_ev)=>{v16.layoutPrefs.table.headerFontSize=_ev.target.value;v16.layoutError='';}, ctx];
      let prop12 = new String((ctx['state'].layoutPrefs.table.cellPaddingY) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.cellPaddingY) || ""));
      const v17 = ctx['state'];
      let hdlr16 = [(_ev)=>{v17.layoutPrefs.table.cellPaddingY=_ev.target.value;v17.layoutError='';}, ctx];
      let attr9 = ctx['state'].layoutSuggestedFields['table.headerWrap']?'layout-pref-field layout-pref-suggested':'layout-pref-field';
      let prop13 = new String((ctx['state'].layoutPrefs.table.headerWrap?'wrap':'nowrap') === 0 ? 0 : ((ctx['state'].layoutPrefs.table.headerWrap?'wrap':'nowrap') || ""));
      const v18 = ctx['state'];
      const v19 = ctx['markLayoutFieldEdited'];
      let hdlr17 = [(_ev)=>{v18.layoutPrefs.table.headerWrap=_ev.target.value==='wrap';v18.layoutError='';v19('table.headerWrap');}, ctx];
      let prop14 = new String((ctx['state'].layoutPrefs.table.cellWrap?'wrap':'nowrap') === 0 ? 0 : ((ctx['state'].layoutPrefs.table.cellWrap?'wrap':'nowrap') || ""));
      const v20 = ctx['state'];
      let hdlr18 = [(_ev)=>{v20.layoutPrefs.table.cellWrap=_ev.target.value==='wrap';v20.layoutError='';}, ctx];
      let attr10 = ctx['state'].layoutSuggestedFields['table.layoutMode']?'layout-pref-field layout-pref-suggested':'layout-pref-field';
      let prop15 = new String((ctx['state'].layoutPrefs.table.layoutMode) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.layoutMode) || ""));
      const v21 = ctx['state'];
      const v22 = ctx['markLayoutFieldEdited'];
      let hdlr19 = [(_ev)=>{v21.layoutPrefs.table.layoutMode=_ev.target.value;v21.layoutError='';v22('table.layoutMode');}, ctx];
      let attr11 = ctx['state'].layoutSuggestedFields['table.minWidth']?'layout-pref-field layout-pref-suggested':'layout-pref-field';
      let prop16 = new String((ctx['state'].layoutPrefs.table.minWidth) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.minWidth) || ""));
      const v23 = ctx['state'];
      const v24 = ctx['markLayoutFieldEdited'];
      let hdlr20 = [(_ev)=>{v23.layoutPrefs.table.minWidth=_ev.target.value;v23.layoutError='';v24('table.minWidth');}, ctx];
      let attr12 = ctx['state'].layoutSuggestedFields['table.stripeEnabled']?'layout-pref-field layout-pref-suggested':'layout-pref-field';
      let prop17 = new Boolean(ctx['state'].layoutPrefs.table.stripeEnabled);
      const v25 = ctx['state'];
      const v26 = ctx['markLayoutFieldEdited'];
      let hdlr21 = [(_ev)=>{v25.layoutPrefs.table.stripeEnabled=_ev.target.checked;v25.layoutError='';v26('table.stripeEnabled');}, ctx];
      let prop18 = new String((ctx['state'].layoutPrefs.table.borderRadius) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.borderRadius) || ""));
      const v27 = ctx['state'];
      let hdlr22 = [(_ev)=>{v27.layoutPrefs.table.borderRadius=_ev.target.value;v27.layoutError='';}, ctx];
      let attr13 = ctx['state'].layoutSuggestedFields['table.headerBg']?'layout-pref-field layout-pref-suggested':'layout-pref-field';
      let prop19 = new String((ctx['state'].layoutPrefs.table.headerBg) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.headerBg) || ""));
      const v28 = ctx['state'];
      const v29 = ctx['markLayoutFieldEdited'];
      let hdlr23 = [(_ev)=>{v28.layoutPrefs.table.headerBg=_ev.target.value;v28.layoutError='';v29('table.headerBg');}, ctx];
      let prop20 = new String((ctx['state'].layoutPrefs.table.headerColor) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.headerColor) || ""));
      const v30 = ctx['state'];
      let hdlr24 = [(_ev)=>{v30.layoutPrefs.table.headerColor=_ev.target.value;v30.layoutError='';}, ctx];
      let prop21 = new String((ctx['state'].layoutPrefs.table.rowBg) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.rowBg) || ""));
      const v31 = ctx['state'];
      let hdlr25 = [(_ev)=>{v31.layoutPrefs.table.rowBg=_ev.target.value;v31.layoutError='';}, ctx];
      let attr14 = ctx['state'].layoutSuggestedFields['table.stripeBg']?'layout-pref-field layout-pref-suggested':'layout-pref-field';
      let prop22 = new String((ctx['state'].layoutPrefs.table.stripeBg) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.stripeBg) || ""));
      const v32 = ctx['state'];
      const v33 = ctx['markLayoutFieldEdited'];
      let hdlr26 = [(_ev)=>{v32.layoutPrefs.table.stripeBg=_ev.target.value;v32.layoutError='';v33('table.stripeBg');}, ctx];
      let prop23 = new String((ctx['state'].layoutPrefs.table.hoverBg) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.hoverBg) || ""));
      const v34 = ctx['state'];
      let hdlr27 = [(_ev)=>{v34.layoutPrefs.table.hoverBg=_ev.target.value;v34.layoutError='';}, ctx];
      let prop24 = new String((ctx['state'].layoutPrefs.table.activeBg) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.activeBg) || ""));
      const v35 = ctx['state'];
      let hdlr28 = [(_ev)=>{v35.layoutPrefs.table.activeBg=_ev.target.value;v35.layoutError='';}, ctx];
      let prop25 = new String((ctx['state'].layoutPrefs.table.borderColor) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.borderColor) || ""));
      const v36 = ctx['state'];
      let hdlr29 = [(_ev)=>{v36.layoutPrefs.table.borderColor=_ev.target.value;v36.layoutError='';}, ctx];
      let attr15 = ctx['state'].layoutSuggestedFields['table.actionWidth']?'layout-pref-field layout-pref-suggested':'layout-pref-field';
      let prop26 = new String((ctx['state'].layoutPrefs.table.actionWidth) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.actionWidth) || ""));
      const v37 = ctx['state'];
      const v38 = ctx['markLayoutFieldEdited'];
      let hdlr30 = [(_ev)=>{v37.layoutPrefs.table.actionWidth=_ev.target.value;v37.layoutError='';v38('table.actionWidth');}, ctx];
      let prop27 = new String((ctx['state'].layoutPrefs.table.priorityWidth) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.priorityWidth) || ""));
      const v39 = ctx['state'];
      let hdlr31 = [(_ev)=>{v39.layoutPrefs.table.priorityWidth=_ev.target.value;v39.layoutError='';}, ctx];
      let prop28 = new String((ctx['state'].layoutPrefs.table.stageWidth) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.stageWidth) || ""));
      const v40 = ctx['state'];
      let hdlr32 = [(_ev)=>{v40.layoutPrefs.table.stageWidth=_ev.target.value;v40.layoutError='';}, ctx];
      let prop29 = new String((ctx['state'].layoutPrefs.table.itemWidth) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.itemWidth) || ""));
      const v41 = ctx['state'];
      let hdlr33 = [(_ev)=>{v41.layoutPrefs.table.itemWidth=_ev.target.value;v41.layoutError='';}, ctx];
      let prop30 = new String((ctx['state'].layoutPrefs.table.hoursWidth) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.hoursWidth) || ""));
      const v42 = ctx['state'];
      let hdlr34 = [(_ev)=>{v42.layoutPrefs.table.hoursWidth=_ev.target.value;v42.layoutError='';}, ctx];
      let prop31 = new String((ctx['state'].layoutPrefs.table.projectWidth) === 0 ? 0 : ((ctx['state'].layoutPrefs.table.projectWidth) || ""));
      const v43 = ctx['state'];
      let hdlr35 = [(_ev)=>{v43.layoutPrefs.table.projectWidth=_ev.target.value;v43.layoutError='';}, ctx];
      let prop32 = new String((ctx['state'].layoutPrefs.info.fontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.fontSize) || ""));
      const v44 = ctx['state'];
      let hdlr36 = [(_ev)=>{v44.layoutPrefs.info.fontSize=_ev.target.value;v44.layoutError='';}, ctx];
      let prop33 = new String((ctx['state'].layoutPrefs.info.valueFontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.valueFontSize) || ""));
      const v45 = ctx['state'];
      let hdlr37 = [(_ev)=>{v45.layoutPrefs.info.valueFontSize=_ev.target.value;v45.layoutError='';}, ctx];
      let prop34 = new String((ctx['state'].layoutPrefs.info.paddingY) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.paddingY) || ""));
      const v46 = ctx['state'];
      let hdlr38 = [(_ev)=>{v46.layoutPrefs.info.paddingY=_ev.target.value;v46.layoutError='';}, ctx];
      let prop35 = new String((ctx['state'].layoutPrefs.info.paddingX) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.paddingX) || ""));
      const v47 = ctx['state'];
      let hdlr39 = [(_ev)=>{v47.layoutPrefs.info.paddingX=_ev.target.value;v47.layoutError='';}, ctx];
      let prop36 = new String((ctx['state'].layoutPrefs.info.borderRadius) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.borderRadius) || ""));
      const v48 = ctx['state'];
      let hdlr40 = [(_ev)=>{v48.layoutPrefs.info.borderRadius=_ev.target.value;v48.layoutError='';}, ctx];
      let prop37 = new String((ctx['state'].layoutPrefs.info.lineHeight) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.lineHeight) || ""));
      const v49 = ctx['state'];
      let hdlr41 = [(_ev)=>{v49.layoutPrefs.info.lineHeight=_ev.target.value;v49.layoutError='';}, ctx];
      let prop38 = new String((ctx['state'].layoutPrefs.info.labelColor) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.labelColor) || ""));
      const v50 = ctx['state'];
      let hdlr42 = [(_ev)=>{v50.layoutPrefs.info.labelColor=_ev.target.value;v50.layoutError='';}, ctx];
      let prop39 = new String((ctx['state'].layoutPrefs.info.valueColor) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.valueColor) || ""));
      const v51 = ctx['state'];
      let hdlr43 = [(_ev)=>{v51.layoutPrefs.info.valueColor=_ev.target.value;v51.layoutError='';}, ctx];
      let prop40 = new String((ctx['state'].layoutPrefs.info.background) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.background) || ""));
      const v52 = ctx['state'];
      let hdlr44 = [(_ev)=>{v52.layoutPrefs.info.background=_ev.target.value;v52.layoutError='';}, ctx];
      let prop41 = new String((ctx['state'].layoutPrefs.info.borderColor) === 0 ? 0 : ((ctx['state'].layoutPrefs.info.borderColor) || ""));
      const v53 = ctx['state'];
      let hdlr45 = [(_ev)=>{v53.layoutPrefs.info.borderColor=_ev.target.value;v53.layoutError='';}, ctx];
      let prop42 = new String((ctx['state'].layoutPrefs.options.pageFontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.options.pageFontSize) || ""));
      const v54 = ctx['state'];
      let hdlr46 = [(_ev)=>{v54.layoutPrefs.options.pageFontSize=_ev.target.value;v54.layoutError='';}, ctx];
      let prop43 = new String((ctx['state'].layoutPrefs.options.sidebarFontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.options.sidebarFontSize) || ""));
      const v55 = ctx['state'];
      let hdlr47 = [(_ev)=>{v55.layoutPrefs.options.sidebarFontSize=_ev.target.value;v55.layoutError='';}, ctx];
      let prop44 = new String((ctx['state'].layoutPrefs.options.remotesTableFontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.options.remotesTableFontSize) || ""));
      const v56 = ctx['state'];
      let hdlr48 = [(_ev)=>{v56.layoutPrefs.options.remotesTableFontSize=_ev.target.value;v56.layoutError='';}, ctx];
      let prop45 = new String((ctx['state'].layoutPrefs.options.remotesHeaderFontSize) === 0 ? 0 : ((ctx['state'].layoutPrefs.options.remotesHeaderFontSize) || ""));
      const v57 = ctx['state'];
      let hdlr49 = [(_ev)=>{v57.layoutPrefs.options.remotesHeaderFontSize=_ev.target.value;v57.layoutError='';}, ctx];
      let prop46 = new String((ctx['state'].layoutPrefs.options.remotesCellPaddingY) === 0 ? 0 : ((ctx['state'].layoutPrefs.options.remotesCellPaddingY) || ""));
      const v58 = ctx['state'];
      let hdlr50 = [(_ev)=>{v58.layoutPrefs.options.remotesCellPaddingY=_ev.target.value;v58.layoutError='';}, ctx];
      let prop47 = new String((ctx['state'].layoutPrefs.options.remotesMinWidth) === 0 ? 0 : ((ctx['state'].layoutPrefs.options.remotesMinWidth) || ""));
      const v59 = ctx['state'];
      let hdlr51 = [(_ev)=>{v59.layoutPrefs.options.remotesMinWidth=_ev.target.value;v59.layoutError='';}, ctx];
      let prop48 = new String((ctx['state'].layoutPrefs.options.remotesHeaderWrap?'wrap':'nowrap') === 0 ? 0 : ((ctx['state'].layoutPrefs.options.remotesHeaderWrap?'wrap':'nowrap') || ""));
      const v60 = ctx['state'];
      let hdlr52 = [(_ev)=>{v60.layoutPrefs.options.remotesHeaderWrap=_ev.target.value==='wrap';v60.layoutError='';}, ctx];
      let hdlr53 = [ctx['saveLayoutPreferences'], ctx];
      let hdlr54 = [ctx['resetLayoutPreferences'], ctx];
      let hdlr55 = [ctx['loadSuggestedLayoutSettings'], ctx];
      if (ctx['state'].layoutSuggestionActive) {
        b6 = block6();
      }
      b2 = block2([attr7, attr8, prop1, hdlr5, prop2, hdlr6, prop3, hdlr7, prop4, hdlr8, prop5, hdlr9, prop6, hdlr10, prop7, hdlr11, prop8, hdlr12, prop9, hdlr13, prop10, hdlr14, prop11, hdlr15, prop12, hdlr16, attr9, prop13, hdlr17, prop14, hdlr18, attr10, prop15, hdlr19, attr11, prop16, hdlr20, attr12, prop17, hdlr21, prop18, hdlr22, attr13, prop19, hdlr23, prop20, hdlr24, prop21, hdlr25, attr14, prop22, hdlr26, prop23, hdlr27, prop24, hdlr28, prop25, hdlr29, attr15, prop26, hdlr30, prop27, hdlr31, prop28, hdlr32, prop29, hdlr33, prop30, hdlr34, prop31, hdlr35, prop32, hdlr36, prop33, hdlr37, prop34, hdlr38, prop35, hdlr39, prop36, hdlr40, prop37, hdlr41, prop38, hdlr42, prop39, hdlr43, prop40, hdlr44, prop41, hdlr45, prop42, hdlr46, prop43, hdlr47, prop44, hdlr48, prop45, hdlr49, prop46, hdlr50, prop47, hdlr51, prop48, hdlr52, hdlr53, hdlr54, hdlr55], [b3, b4, b6]);
    }
    let attr16 = ctx['state'].activePage==='options'?'active_page':'inactive_page';
    let hdlr56 = ["prevent", ctx['addRemote'], ctx];
    let prop49 = new Boolean(ctx['state'].autoDownloadIssueTimesheet);
    let hdlr57 = [ctx['toggleAutoDownload'], ctx];
    let prop50 = new String((ctx['state'].form.remote_host) === 0 ? 0 : ((ctx['state'].form.remote_host) || ""));
    const v61 = ctx['state'];
    let hdlr58 = [(_ev)=>v61.form.remote_host=_ev.target.value, ctx];
    let prop51 = new String((ctx['state'].form.remote_name) === 0 ? 0 : ((ctx['state'].form.remote_name) || ""));
    const v62 = ctx['state'];
    let hdlr59 = [(_ev)=>v62.form.remote_name=_ev.target.value, ctx];
    let prop52 = new String((ctx['state'].form.remote_database) === 0 ? 0 : ((ctx['state'].form.remote_database) || ""));
    const v63 = ctx['state'];
    let hdlr60 = [(_ev)=>v63.form.remote_database=_ev.target.value, ctx];
    let prop53 = new Boolean(ctx['state'].form.remote_datasrc==='project.issue');
    const v64 = ctx['state'];
    let hdlr61 = [()=>v64.form.remote_datasrc='project.issue', ctx];
    let prop54 = new Boolean(ctx['state'].form.remote_datasrc==='project.task');
    const v65 = ctx['state'];
    let hdlr62 = [()=>v65.form.remote_datasrc='project.task', ctx];
    let prop55 = new Boolean(ctx['state'].form.remote_datasrc==='helpdesk.ticket');
    const v66 = ctx['state'];
    let hdlr63 = [()=>v66.form.remote_datasrc='helpdesk.ticket', ctx];
    let attr17 = ctx['formLogoSrc'];
    let hdlr64 = [ctx['onRemoteLogoChange'], ctx];
    let hdlr65 = [ctx['onRemoteLogoPickerClick'], ctx];
    let hdlr66 = [ctx['clearRemoteLogo'], ctx];
    let hdlr67 = [ctx['addRemote'], ctx];
    let hdlr68 = [ctx['loadRemotes'], ctx];
    const v67 = ctx['state'];
    let hdlr69 = [()=>v67.showList=!v67.showList, ctx];
    let hdlr70 = [ctx['removeAllRemotes'], ctx];
    if (ctx['state'].error) {
      const b8 = safeOutput(ctx['state'].error);
      b7 = block7([], [b8]);
    }
    if (ctx['state'].showList&&ctx['state'].remotes.length) {
      ctx = Object.create(ctx);
      const [k_block10, v_block10, l_block10, c_block10] = prepareList(ctx['state'].remotes);;
      for (let i1 = 0; i1 < l_block10; i1++) {
        ctx[`remote`] = k_block10[i1];
        const key1 = ctx['remoteKey'](ctx['remote']);
        let attr18 = ctx['remoteLogoSrc'](ctx['remote']);
        const b12 = comp1({text: ctx['remote'].name,limit: 18}, key + `__1__${key1}`, node, this, null);
        const b13 = comp2({text: ctx['remote'].url,limit: 25}, key + `__2__${key1}`, node, this, null);
        const b14 = comp3({text: ctx['remote'].database,limit: 18}, key + `__3__${key1}`, node, this, null);
        const b15 = comp4({text: ctx['remote'].datasrc||'project.issue',limit: 18}, key + `__4__${key1}`, node, this, null);
        const b16 = comp5({text: ctx['remote'].state||'Inactive',limit: 18}, key + `__5__${key1}`, node, this, null);
        const v68 = ctx['editRemote'];
        const v69 = ctx['remote'];
        let hdlr71 = [()=>v68(v69), ctx];
        const v70 = ctx['removeRemote'];
        const v71 = ctx['remote'];
        let hdlr72 = [()=>v70(v71), ctx];
        c_block10[i1] = withKey(block11([attr18, hdlr71, hdlr72], [b12, b13, b14, b15, b16]), key1);
      }
      ctx = ctx.__proto__;
      const b10 = list(c_block10);
      b9 = block9([], [b10]);
    }
    return block1([attr1, hdlr1, attr2, hdlr2, attr3, hdlr3, attr4, hdlr4, attr5, attr6, attr16, hdlr56, prop49, hdlr57, prop50, hdlr58, prop51, hdlr59, prop52, hdlr60, prop53, hdlr61, prop54, hdlr62, prop55, hdlr63, attr17, hdlr64, hdlr65, hdlr66, hdlr67, hdlr68, hdlr69, hdlr70], [b2, b7, b9]);
  }
},

"PopupApp": function PopupApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { safeOutput, prepareList, withKey, toNumber } = helpers;
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
  
  let block1 = createBlock(`<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text"><block-child-0/></div><div class="loader-subtext"> Please wait — or grab a cup of coffee ☕ </div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><div class="popup-login-shell"><div class="form"><div class="logo"><img block-attribute-2="src" block-attribute-3="alt" block-handler-4="error"/></div><block-child-1/><block-child-2/><block-child-3/></div></div><div class="cta forgotpwd footer-app-opts login-footer-bar"><a href="options_main_page.html"><i class="fa fa-cogs"/> Options </a></div></div><div id="wrapper" block-attribute-5="class"><block-child-4/><div class="toolbar-row"><input id="searchIssue" type="text" placeholder="Search by ID, name, user, priority, stage..." block-property-6="value" block-handler-7="input"/><!-- THERP UX PATCH: one dynamic stage filter for all supported sources. --><block-child-5/><select id="limitTo" block-property-8="value" block-handler-9="change" block-handler-10="change"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="">All</option></select></div><div class="container footer top-actions"><div class="row"><div class="mx-3 col-md-12 footer-btns pointer"><i class="fa fa-download fa-2x" title="Download current month timesheet" block-handler-11="click"/><i class="fa fa-hand-o-left fa-2x" title="Switch between remotes" block-handler-12="click"/><i class="fa fa-refresh fa-2x" title="Refresh current items" block-handler-13="click"/><i class="fa fa-clock-o fa-2x" title="Discard the active timer" block-handler-14="click"/><i class="fa fa-sign-out fa-2x" title="Log out" block-handler-15="click"/><a href="options_main_page.html" class="options-btn" title="Go To options"><i class="fa fa-cogs fa-2x"/></a></div></div></div><div class="table-scroll"><table id="table-task-issues" class="table table-responsive-sm table-bordered table-fixed"><thead><tr><th class="action-col"><!-- THERP UX: inline discard active timer --><block-child-6/></th><block-child-7/><block-child-8/></tr></thead><tbody><block-child-9/><block-child-9/><block-child-10/></tbody></table></div><div class="container footer info-footer"><div class="row"><div class="remote-info-block col-md-12" style="position:relative;padding-right:68px;"><span><b>Odoo:</b> <span class="remote-value"><block-child-11/></span></span><br/><span><b>OWL:</b> <span class="remote-value"><block-child-12/></span></span><br/><span><b>Host:</b> <span class="remote-value"><block-child-13/></span></span><br/><span><b>Database:</b> <span class="remote-value"><block-child-14/></span></span><br/><span><b>Current User:</b> <span class="remote-value"><block-child-15/></span></span><br/><span><b>Current Company:</b> <span class="remote-value"><block-child-16/></span></span><br/><span block-attribute-16="title"><b>Allowed Companies:</b> <span class="remote-value"><block-child-17/></span></span><!-- THERP UX: Options shortcut inside info footer --><a href="options_main_page.html" title="Open Options" aria-label="Open Options" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border:2px solid #1aa7d7;border-radius:50%;background:#fff;color:#1aa7d7;text-decoration:none;box-sizing:border-box;"><i class="fa fa-hand-o-right" style="font-size:23px;"/></a></div></div></div></div></div>`);
  let block3 = createBlock(`<div><p class="odooError"><block-child-0/></p></div>`);
  let block5 = createBlock(`<div class="container no-remotes-set"><div class="alert alert-warning"> Hello <span class="fun-man">😉</span>, you have not configured any remotes. Open <b><i class="fa fa-cogs"/> Options</b> below and add one. </div></div>`);
  let block6 = createBlock(`<form block-handler-0="submit.prevent"><block-child-0/><block-child-1/><div class="password-field"><block-child-2/><block-child-3/></div><select id="remote-selection" class="form-control" block-handler-1="change"><block-child-4/></select><div class="checkbox"><label><input type="checkbox" block-property-2="checked" block-handler-3="change"/> Use Existing Session </label></div><button class="login" type="submit"> Login <block-child-5/></button><block-child-6/></form>`);
  let block7 = createBlock(`<p class="odooError"><block-child-0/></p>`);
  let block9 = createBlock(`<input type="text" placeholder="Username" block-property-0="value" block-handler-1="input"/>`);
  let block10 = createBlock(`<input id="unique-password" block-attribute-0="type" placeholder="Password" block-property-1="value" block-handler-2="input"/>`);
  let block11 = createBlock(`<span class="pass-viewer" block-handler-0="click"><i class="fa" block-attribute-1="class"/></span>`);
  let block13 = createBlock(`<option block-attribute-0="value" block-property-1="selected"><block-child-0/></option>`);
  let block15 = createBlock(`<i class="fa fa-cog fa-spin"/>`);
  let block16 = createBlock(`<div class="remote-info small-note"> Host: <block-child-0/><span class="current-source-chip"><block-child-1/></span></div>`);
  let block19 = createBlock(`<div class="odooError source-warning"><block-child-0/></div>`);
  let block21 = createBlock(`<select id="stageFilter" aria-label="Filter by stage" block-property-0="value" block-handler-1="change"><option value="">All stages</option><block-child-0/></select>`);
  let block23 = createBlock(`<option block-attribute-0="value" block-property-1="selected"><block-child-0/></option>`);
  let block25 = createBlock(`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;"><span class="startTimeCount"><block-child-0/></span><button type="button" title="Discard active timer without recording a timesheet" aria-label="Discard active timer without recording a timesheet" style="width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:50%;cursor:pointer;background:#dc3545;color:#fff;line-height:1;" block-handler-0="click"><i class="fa fa-times" style="font-size:11px;"/></button></div>`);
  let block28 = createBlock(`<th class="text-center" style="width:72px">Therp Task</th>`);
  let block29 = createBlock(`<th class="priority-col">Priority</th>`);
  let block30 = createBlock(`<th class="item-col" style="width:280px"><div class="item-header-title"><block-child-0/> [<block-child-1/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-0="checked" block-handler-1="input"/> Show for everyone </label></th>`);
  let block33 = createBlock(`<th class="stage-col">Stage</th>`);
  let block34 = createBlock(`<th style="width:120px">Assigned To</th>`);
  let block35 = createBlock(`<th class="text-center" style="width:88px">Time Spent</th>`);
  let block37 = createBlock(`<th class="priority-col">Priority</th>`);
  let block38 = createBlock(`<th class="stage-col">Stage</th>`);
  let block39 = createBlock(`<th class="item-col"><div class="item-header-title"><block-child-0/> [<block-child-1/>] </div><label class="allIssues"><input id="showAllIssues" type="checkbox" block-property-0="checked" block-handler-1="input"/> Show for everyone </label></th>`);
  let block43 = createBlock(`<th class="text-center">Hours Spent</th>`);
  let block44 = createBlock(`<th class="text-center">Hours Left</th>`);
  let block45 = createBlock(`<th class="project-col"><block-child-0/></th>`);
  let block48 = createBlock(`<tr block-attribute-0="class"><td class="text-center px-2 td-btn action-col"><block-child-0/><block-child-1/></td><block-child-2/><block-child-3/></tr>`);
  let block50 = createBlock(`<i class="fa fa-info-circle action-btn pointer text-info" block-attribute-0="title" block-handler-1="click"/>`);
  let block51 = createBlock(`<i class="fa fa-play-circle action-btn pointer" title="Start the timer for the selected item" block-handler-0="click"/>`);
  let block52 = createBlock(`<i class="text-danger fa fa-stop-circle action-btn pointer" title="Stop timer and record the time to Odoo timesheets" block-handler-0="click"/>`);
  let block54 = createBlock(`<td class="text-center" style="width:72px"><block-child-0/></td>`);
  let block55 = createBlock(`<a block-attribute-0="href" target="_blank" rel="noreferrer" class="btn btn-sm btn-outline-secondary" title="Open linked Therp task"><i class="fa fa-external-link"/></a>`);
  let block56 = createBlock(`<td class="priority-cell"><block-child-0/><block-child-0/><block-child-1/></td>`);
  let block58 = createBlock(`<span class="fa fa-star checked"/>`);
  let block59 = createBlock(`<i class="fa fa-star-o"/>`);
  let block60 = createBlock(`<td class="issue-desc-cell" style="width:280px"><block-child-0/><block-child-1/></td>`);
  let block62 = createBlock(`<div class="text-muted-soft small" style="margin-top:3px;line-height:1.3"><block-child-0/></div>`);
  let block64 = createBlock(`<td class="stage-cell"><block-child-0/></td>`);
  let block66 = createBlock(`<td style="width:120px"><block-child-0/></td>`);
  let block68 = createBlock(`<td class="text-center" style="width:88px"><block-child-0/></td>`);
  let block71 = createBlock(`<td class="priority-cell"><block-child-0/><block-child-0/><block-child-1/></td>`);
  let block73 = createBlock(`<span class="fa fa-star checked"/>`);
  let block74 = createBlock(`<i class="fa fa-star-o"/>`);
  let block75 = createBlock(`<td class="stage-cell"><block-child-0/></td>`);
  let block77 = createBlock(`<td class="issue-desc-cell"><block-child-0/></td>`);
  let block80 = createBlock(`<td class="text-center"><block-child-0/></td>`);
  let block82 = createBlock(`<td class="text-center"><block-child-0/></td>`);
  let block84 = createBlock(`<td class="project-cell"><block-child-0/></td>`);
  let block86 = createBlock(`<tr><td class="text-center text-danger" block-attribute-0="colspan"><block-child-0/><block-child-1/></td></tr>`);
  
  return function template(ctx, node, key = "") {
    let b2, b3, b5, b6, b19, b21, b25, b27, b36, b47, b86, b89, b90, b91, b92, b93, b94, b95;
    let attr1 = ctx['state'].view==='loading'?'':'hide';
    b2 = safeOutput(ctx['state'].busyMessage);
    let attr2 = ctx['state'].view==='login'?'login-view':'login-view hide';
    let attr3 = ctx['currentRemoteLogoSrc'];
    let attr4 = ctx['currentRemote']?ctx['currentRemote'].name+' logo':'Therp logo';
    let hdlr1 = [ctx['onLoginLogoError'], ctx];
    if (ctx['state'].bootError) {
      const b4 = safeOutput(ctx['state'].bootError);
      b3 = block3([], [b4]);
    }
    if (!ctx['state'].remotes.length) {
      b5 = block5();
    }
    if (ctx['state'].remotes.length) {
      let b7, b9, b10, b11, b12, b15, b16;
      let hdlr2 = ["prevent", ctx['login'], ctx];
      if (ctx['state'].loginError) {
        const b8 = safeOutput(ctx['state'].loginError);
        b7 = block7([], [b8]);
      }
      if (!ctx['state'].useExistingSession) {
        let prop1 = new String((ctx['state'].username) === 0 ? 0 : ((ctx['state'].username) || ""));
        const v1 = ctx['state'];
        let hdlr3 = [(_ev)=>v1.username=_ev.target.value, ctx];
        b9 = block9([prop1, hdlr3]);
      }
      if (!ctx['state'].useExistingSession) {
        let attr5 = ctx['state'].showPassword?'text':'password';
        let prop2 = new String((ctx['state'].password) === 0 ? 0 : ((ctx['state'].password) || ""));
        const v2 = ctx['state'];
        let hdlr4 = [(_ev)=>v2.password=_ev.target.value, ctx];
        b10 = block10([attr5, prop2, hdlr4]);
      }
      if (!ctx['state'].useExistingSession) {
        let hdlr5 = [ctx['togglePassword'], ctx];
        let attr6 = ctx['state'].showPassword?'fa fa-eye-slash':'fa fa-eye';
        b11 = block11([hdlr5, attr6]);
      }
      const v3 = ctx['state'];
      let hdlr6 = [(_ev)=>v3.selectedRemoteIndex=_ev.target.value, ctx];
      ctx = Object.create(ctx);
      const [k_block12, v_block12, l_block12, c_block12] = prepareList(ctx['state'].remotes);;
      for (let i1 = 0; i1 < l_block12; i1++) {
        ctx[`remote`] = k_block12[i1];
        const key1 = ctx['remoteKey'](ctx['remote']);
        let attr7 = ctx['remote'].__index;
        let prop3 = new Boolean(ctx['state'].selectedRemoteIndex===ctx['remote'].__index);
        const b14 = safeOutput(ctx['remoteOptionLabel'](ctx['remote']));
        c_block12[i1] = withKey(block13([attr7, prop3], [b14]), key1);
      }
      ctx = ctx.__proto__;
      b12 = list(c_block12);
      let prop4 = new Boolean(ctx['state'].useExistingSession);
      let hdlr7 = [ctx['toggleUseExistingSession'], ctx];
      if (ctx['state'].loginLoading) {
        b15 = block15();
      }
      if (ctx['currentRemote']) {
        const b17 = safeOutput(ctx['currentRemote'].url);
        const b18 = safeOutput(ctx['currentRemote'].datasrc||'project.issue');
        b16 = block16([], [b17, b18]);
      }
      b6 = block6([hdlr2, hdlr6, prop4, hdlr7], [b7, b9, b10, b11, b12, b15, b16]);
    }
    let attr8 = ctx['state'].view==='main'?'':'hide';
    if (ctx['state'].sourceError) {
      const b20 = safeOutput(ctx['state'].sourceError);
      b19 = block19([], [b20]);
    }
    let prop5 = new String((ctx['state'].searchQuery) === 0 ? 0 : ((ctx['state'].searchQuery) || ""));
    const v4 = ctx['state'];
    let hdlr8 = [(_ev)=>v4.searchQuery=_ev.target.value, ctx];
    if ((ctx['stageOptions']||[]).length) {
      let prop6 = new String((ctx['state'].stageFilter) === 0 ? 0 : ((ctx['state'].stageFilter) || ""));
      const v5 = ctx['state'];
      let hdlr9 = [(_ev)=>{v5.stageFilter=_ev.target.value;}, ctx];
      ctx = Object.create(ctx);
      const [k_block22, v_block22, l_block22, c_block22] = prepareList(ctx['stageOptions']||[]);;
      for (let i1 = 0; i1 < l_block22; i1++) {
        ctx[`stage`] = k_block22[i1];
        const key1 = ctx['stage'].id;
        let attr9 = ''+ctx['stage'].id;
        let prop7 = new Boolean(ctx['state'].stageFilter===''+ctx['stage'].id);
        const b24 = safeOutput(ctx['stage'].name);
        c_block22[i1] = withKey(block23([attr9, prop7], [b24]), key1);
      }
      ctx = ctx.__proto__;
      const b22 = list(c_block22);
      b21 = block21([prop6, hdlr9], [b22]);
    }
    const bExpr1 = ctx['state'];
    const expr1 = 'limitTo';
    let prop8 = bExpr1[expr1];
    let hdlr10 = [(ev) => { bExpr1[expr1] = ev.target.value; }];
    const v6 = ctx['updateLimitPreference'];
    let hdlr11 = [(_ev)=>v6(_ev.target.value), ctx];
    let hdlr12 = [ctx['downloadCurrentMonthTimesheets'], ctx];
    let hdlr13 = [ctx['switchBetweenRemotes'], ctx];
    let hdlr14 = [ctx['refreshAll'], ctx];
    let hdlr15 = [ctx['resetTimer'], ctx];
    let hdlr16 = [ctx['logout'], ctx];
    if (ctx['state'].timerStartIso) {
      const b26 = safeOutput(ctx['formattedTimer']);
      let hdlr17 = [ctx['resetTimer'], ctx];
      b25 = block25([hdlr17], [b26]);
    }
    if (ctx['isHelpdeskSource']) {
      let b28, b29, b30, b33, b34, b35;
      if (ctx['showHelpdeskTherpLink']) {
        b28 = block28();
      }
      b29 = block29();
      const b31 = safeOutput(ctx['itemLabelPlural']);
      const b32 = safeOutput(ctx['filteredIssues'].length);
      let prop9 = new Boolean(ctx['state'].allIssues);
      const v7 = ctx['updateShowAllPreference'];
      let hdlr18 = [(_ev)=>v7(_ev.target.checked), ctx];
      b30 = block30([prop9, hdlr18], [b31, b32]);
      b33 = block33();
      if (ctx['showHelpdeskAssignee']) {
        b34 = block34();
      }
      if (ctx['showHelpdeskHours']) {
        b35 = block35();
      }
      b27 = multi([b28, b29, b30, b33, b34, b35]);
    } else {
      let b37, b38, b39, b42, b45;
      b37 = block37();
      b38 = block38();
      const b40 = safeOutput(ctx['itemLabelPlural']);
      const b41 = safeOutput(ctx['filteredIssues'].length);
      let prop10 = new Boolean(ctx['state'].allIssues);
      const v8 = ctx['updateShowAllPreference'];
      let hdlr19 = [(_ev)=>v8(_ev.target.checked), ctx];
      b39 = block39([prop10, hdlr19], [b40, b41]);
      if (ctx['state'].dataSource==='project.task') {
        const b43 = block43();
        const b44 = block44();
        b42 = multi([b43, b44]);
      }
      const b46 = safeOutput(ctx['relationHeaderLabel']);
      b45 = block45([], [b46]);
      b36 = multi([b37, b38, b39, b42, b45]);
    }
    if (ctx['filteredIssues'].length) {
      ctx = Object.create(ctx);
      const [k_block47, v_block47, l_block47, c_block47] = prepareList(ctx['filteredIssues']);;
      for (let i1 = 0; i1 < l_block47; i1++) {
        ctx[`issue`] = k_block47[i1];
        const key1 = ctx['issue'].id;
        let b49, b52, b53, b70;
        let attr10 = ctx['isActiveTimerItem'](ctx['issue'])?'active-row':'';
        if (!ctx['state'].activeTimerId) {
          let b50, b51;
          if (ctx['isHelpdeskSource']&&ctx['helpdeskTimesheetBlocked'](ctx['issue'])) {
            let attr11 = ctx['helpdeskTimesheetBlockMessage'](ctx['issue']);
            const v9 = ctx['showHelpdeskTimesheetInfo'];
            const v10 = ctx['issue'];
            let hdlr20 = [()=>v9(v10), ctx];
            b50 = block50([attr11, hdlr20]);
          } else {
            const v11 = ctx['startTimer'];
            const v12 = ctx['issue'];
            let hdlr21 = [()=>v11(v12), ctx];
            b51 = block51([hdlr21]);
          }
          b49 = multi([b50, b51]);
        }
        if (ctx['isActiveTimerItem'](ctx['issue'])) {
          const v13 = ctx['stopTimer'];
          const v14 = ctx['issue'];
          let hdlr22 = [()=>v13(v14), ctx];
          b52 = block52([hdlr22]);
        }
        if (ctx['isHelpdeskSource']) {
          let b54, b56, b60, b64, b66, b68;
          if (ctx['showHelpdeskTherpLink']) {
            let b55;
            if (ctx['helpdeskTherpLinkHref'](ctx['issue'])) {
              let attr12 = ctx['helpdeskTherpLinkHref'](ctx['issue']);
              b55 = block55([attr12]);
            }
            b54 = block54([], [b55]);
          }
          let b57, b59;
          if (ctx['issue'].priority_level.length) {
            ctx = Object.create(ctx);
            const [k_block57, v_block57, l_block57, c_block57] = prepareList(ctx['issue'].priority_level);;
            for (let i2 = 0; i2 < l_block57; i2++) {
              ctx[`priority`] = k_block57[i2];
              const key2 = ctx['priority']+'_'+ctx['issue'].id;
              c_block57[i2] = withKey(block58(), key2);
            }
            ctx = ctx.__proto__;
            b57 = list(c_block57);
          }
          if (!ctx['issue'].priority_level.length) {
            b59 = block59();
          }
          b56 = block56([], [b57, b59]);
          let b61, b62;
          b61 = comp1({text: ctx['issueLabel'](ctx['issue']),limit: 55,href: ctx['issueHref'](ctx['issue'])}, key + `__1__${key1}`, node, this, null);
          if (ctx['showHelpdeskDescription']&&ctx['helpdeskDescriptionText'](ctx['issue'])) {
            const b63 = comp2({text: ctx['helpdeskDescriptionText'](ctx['issue']),limit: 70}, key + `__2__${key1}`, node, this, null);
            b62 = block62([], [b63]);
          }
          b60 = block60([], [b61, b62]);
          const b65 = comp3({text: ctx['relationLabel'](ctx['issue'].stage_id),limit: 15}, key + `__3__${key1}`, node, this, null);
          b64 = block64([], [b65]);
          if (ctx['showHelpdeskAssignee']) {
            const b67 = comp4({text: ctx['relationLabel'](ctx['helpdeskAssigneeValue'](ctx['issue'])),limit: 22}, key + `__4__${key1}`, node, this, null);
            b66 = block66([], [b67]);
          }
          if (ctx['showHelpdeskHours']) {
            const b69 = comp5({text: ctx['formatHours'](ctx['helpdeskHoursValue'](ctx['issue'])),limit: 10}, key + `__5__${key1}`, node, this, null);
            b68 = block68([], [b69]);
          }
          b53 = multi([b54, b56, b60, b64, b66, b68]);
        } else {
          let b71, b75, b77, b79, b84;
          let b72, b74;
          if (ctx['issue'].priority_level.length) {
            ctx = Object.create(ctx);
            const [k_block72, v_block72, l_block72, c_block72] = prepareList(ctx['issue'].priority_level);;
            for (let i2 = 0; i2 < l_block72; i2++) {
              ctx[`priority`] = k_block72[i2];
              const key2 = ctx['priority']+'_'+ctx['issue'].id;
              c_block72[i2] = withKey(block73(), key2);
            }
            ctx = ctx.__proto__;
            b72 = list(c_block72);
          }
          if (!ctx['issue'].priority_level.length) {
            b74 = block74();
          }
          b71 = block71([], [b72, b74]);
          const b76 = comp6({text: ctx['relationLabel'](ctx['issue'].stage_id),limit: 15}, key + `__6__${key1}`, node, this, null);
          b75 = block75([], [b76]);
          const b78 = comp7({text: ctx['issueLabel'](ctx['issue']),limit: 70,href: ctx['issueHref'](ctx['issue'])}, key + `__7__${key1}`, node, this, null);
          b77 = block77([], [b78]);
          if (ctx['state'].dataSource==='project.task') {
            const b81 = comp8({text: ctx['normalizeText'](ctx['formatHours'](ctx['issue'].effective_hours)),limit: 9}, key + `__8__${key1}`, node, this, null);
            const b80 = block80([], [b81]);
            const b83 = comp9({text: ctx['normalizeText'](ctx['formatHours'](ctx['issue'].remaining_hours)),limit: 9}, key + `__9__${key1}`, node, this, null);
            const b82 = block82([], [b83]);
            b79 = multi([b80, b82]);
          }
          const b85 = comp10({text: ctx['relationLabel'](ctx['resourceRelationValue'](ctx['issue'])),limit: 22}, key + `__10__${key1}`, node, this, null);
          b84 = block84([], [b85]);
          b70 = multi([b71, b75, b77, b79, b84]);
        }
        c_block47[i1] = withKey(block48([attr10], [b49, b52, b53, b70]), key1);
      }
      ctx = ctx.__proto__;
      b47 = list(c_block47);
    }
    if (!ctx['filteredIssues'].length) {
      let b87, b88;
      let attr13 = ctx['tableColumnCount'];
      if (ctx['state'].stageFilter&&!ctx['state'].allIssues) {
        b87 = text(` No matching items assigned to you for this stage. Turn on "Show for everyone" to include other users' items. `);
      }
      if (!ctx['state'].stageFilter||ctx['state'].allIssues) {
        b88 = text(` No matching items are currently available `);
      }
      b86 = block86([attr13], [b87, b88]);
    }
    b89 = safeOutput(ctx['state'].serverVersion||'Unknown');
    b90 = safeOutput(ctx['state'].odooOWLVersion||'Unknown');
    b91 = safeOutput(ctx['state'].currentHost||'-');
    b92 = safeOutput(ctx['state'].currentDatabase||'-');
    b93 = safeOutput(ctx['state'].user?ctx['state'].user.display_name:'-');
    b94 = safeOutput(ctx['currentCompanyLabel']);
    let attr14 = ctx['allowedCompanyLabels'];
    b95 = safeOutput(ctx['allowedCompanyLabels']||'-');
    return block1([attr1, attr2, attr3, attr4, hdlr1, attr8, prop5, hdlr8, prop8, hdlr10, hdlr11, hdlr12, hdlr13, hdlr14, hdlr15, hdlr16, attr14], [b2, b3, b5, b6, b19, b21, b25, b27, b36, b47, b86, b89, b90, b91, b92, b93, b94, b95]);
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
