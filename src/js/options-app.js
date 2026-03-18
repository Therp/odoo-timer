
import { readRemotes, writeRemotes, validURL, normalizeHost, storage, clearOdooSessionCookies } from './common.js';
const { Component, mount, useState, onWillStart } = owl;

function ReadMoreTemplate(app, bdom, helpers) {
  const { text, createBlock } = bdom;
  const wrap = createBlock(`<span><block-child-0/><block-child-1/></span>`);
  const toggle = createBlock(`<a href="#" block-handler-0="click"><block-text-1/></a>`);
  return function template(ctx) {
    const content = text(ctx.state.expanded || !ctx.needsTrim ? (ctx.props.text || '') : ctx.shortText);
    let more = null;
    if (ctx.needsTrim) {
      more = toggle([["prevent", ctx.toggle, ctx], ctx.state.expanded ? '▲' : '...']);
    }
    return wrap([], [content, more]);
  };
}

class ReadMore extends Component {
  static props = ['text', 'limit?'];
  static template = 'ReadMore';
  setup(){ this.state = useState({ expanded:false }); }
  get needsTrim(){ return (this.props.text || '').length > (this.props.limit || 20); }
  get shortText(){ return (this.props.text || '').slice(0, this.props.limit || 20); }
  toggle(){ this.state.expanded = !this.state.expanded; }
}

function OptionsAppTemplate(app, bdom, helpers) {
  let { text, createBlock, list } = bdom;
  let { prepareList, OwlError, withKey } = helpers;
  const comp1 = app.createComponent('ReadMore', true, false, false, ['text','limit']);
  const comp2 = app.createComponent('ReadMore', true, false, false, ['text','limit']);
  const comp3 = app.createComponent('ReadMore', true, false, false, ['text','limit']);
  const comp4 = app.createComponent('ReadMore', true, false, false, ['text','limit']);
  const comp5 = app.createComponent('ReadMore', true, false, false, ['text','limit']);

  let block1 = createBlock(`<div><div id="navigation"><h1 class="title-app">Timer Options</h1><ul class="list-group"><li class="chooser list-group-item" block-attribute-0="class" block-handler-1="click"><i class="fa fa-info-circle"/> <span>About Timer</span></li><li class="chooser list-group-item" block-attribute-2="class" block-handler-3="click"><i class="fa fa-cogs"/> <span>Options</span></li></ul><hr/><div class="footer-app"><a href="popup.html" class="back-left"><i class="fa fa-arrow-circle-left fa-2x"/></a></div></div><div class="options-box box" block-attribute-4="class"><h1><div class="logo"><img src="/img/logo.png"/></div></h1><hr/><div class="about-app"><h4 class="title-app text-center">Description</h4><hr/>This is a standalone Owl rewrite of the original cross-platform timer extension for posting work hours to Odoo timesheets.<hr/><h4 class="title-app text-center">Features</h4><hr/><div class="timer-features"><ul class="list-group"><li class="list-group-item">Support for both Issues and Tasks</li><li class="list-group-item">Start and stop timer for the selected issue/task</li><li class="list-group-item">Create Odoo timesheet lines against the linked analytic account</li><li class="list-group-item">Show assigned issues/tasks or everyone’s items</li><li class="list-group-item">Add, remove, or clear remote hosts</li><li class="list-group-item">Switch between remote sessions</li><li class="list-group-item">Download current month or current issue timesheets as CSV</li></ul></div></div></div><div class="options-box box" block-attribute-5="class"><div class="form remote-options-form"><form block-handler-6="submit.prevent"><h4 class="remote-title text-info">Add Remote</h4><hr/><div class="form-group"><label for="remote-host">Odoo Host</label><input type="text" class="form-control" id="remote-host" placeholder="https://your-odoo-host.example" block-property-7="value" block-handler-8="input"/></div><div class="form-group"><label for="remote-name">Display Name</label><input type="text" class="form-control" id="remote-name" placeholder="Therp" block-property-9="value" block-handler-10="input"/></div><div class="form-group"><label for="remote-database">Odoo Database</label><input type="text" class="form-control" id="remote-database" placeholder="someodoodatabase" block-property-11="value" block-handler-12="input"/></div><div class="form-group"><label class="label">Data Source</label><ul class="data-source-list list-group"><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.issue" id="FromIssues" block-property-13="checked" block-handler-14="change"/><label class="form-check-label" for="FromIssues">From Issues</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.task" id="FromTasks" block-property-15="checked" block-handler-16="change"/><label class="form-check-label" for="FromTasks">From Tasks</label></div></li></ul></div><span class="caption-remotes">Controls</span><div class="remotes-control-btns col-md-12 text-center text-info pointer"><i title="Add a remote host" class="fa fa-2x fa-plus-circle" block-handler-17="click"/><i title="Refresh list of remotes" class="fa fa-2x fa-refresh" block-handler-18="click"/><i title="View list of remotes" class="fa fa-2x fa-eye" block-handler-19="click"/><i title="Remove all remotes" class="fa fa-2x fa-minus-circle" block-handler-20="click"/></div><block-child-0/></form></div><block-child-1/></div></div>`);
  let block2 = createBlock(`<div class="remote-error"><block-text-0/></div>`);
  let block3 = createBlock(`<div class="remotes-table-info"><table class="table table-bordered"><caption class="text-info caption-remotes">List of Available Remotes</caption><thead><tr><th scope="col">Remote</th><th scope="col">Host</th><th scope="col">Database</th><th scope="col">Source</th><th scope="col">State</th><th></th></tr></thead><tbody><block-child-0/></tbody></table></div>`);
  let block4 = createBlock(`<tr><td class="text-info"><block-child-0/></td><td><block-child-1/></td><td><block-child-2/></td><td><block-child-3/></td><td><block-child-4/></td><td class="remote-row-actions"><i class="fa fa-trash text-danger" title="Remove remote" block-handler-0="click"/></td></tr>`);

  return function template(ctx, node, key='') {
    let errBlock = null, listBlock = null;
    let attr1 = ctx.state.activePage === 'about' ? 'selected' : 'notselected';
    let attr2 = ctx.state.activePage === 'options' ? 'selected' : 'notselected';
    let h1 = [() => { ctx.state.activePage = 'about'; }, ctx];
    let h2 = [() => { ctx.state.activePage = 'options'; }, ctx];
    let attr3 = ctx.state.activePage === 'about' ? 'active_page' : 'inactive_page';
    let attr4 = ctx.state.activePage === 'options' ? 'active_page' : 'inactive_page';
    let submitH = ['prevent', ctx.addRemote, ctx];
    const form = ctx.state.form;
    let hv = [(ev) => { form.remote_host = ev.target.value; }];
    let nv = [(ev) => { form.remote_name = ev.target.value; }];
    let dv = [(ev) => { form.remote_database = ev.target.value; }];
    let srcIssue = (form.remote_datasrc === 'project.issue');
    let srcTask = (form.remote_datasrc === 'project.task');
    let srcIssueH = [(ev) => { if (ev.target.checked) form.remote_datasrc = 'project.issue'; }];
    let srcTaskH = [(ev) => { if (ev.target.checked) form.remote_datasrc = 'project.task'; }];
    let addH = [ctx.addRemote, ctx];
    let loadH = [ctx.loadRemotes, ctx];
    let eyeH = [() => { ctx.state.showList = !ctx.state.showList; }, ctx];
    let removeAllH = [ctx.removeAllRemotes, ctx];
    if (ctx.state.error) errBlock = block2([ctx.state.error]);
    if (ctx.state.showList && ctx.state.remotes.length) {
      ctx = Object.create(ctx);
      const [k, v, l, c] = prepareList(ctx.state.remotes);
      const keys = new Set();
      for (let i = 0; i < l; i++) {
        ctx.remote = k[i];
        const key1 = ctx.remote.url + ctx.remote.database;
        if (keys.has(String(key1))) throw new OwlError(`Got duplicate key in t-foreach: ${key1}`);
        keys.add(String(key1));
        const p1 = { text: ctx.remote.name, limit: 18 };
        const p2 = { text: ctx.remote.url, limit: 25 };
        const p3 = { text: ctx.remote.database, limit: 18 };
        const p4 = { text: ctx.remote.datasrc || 'project.issue', limit: 18 };
        const p5 = { text: ctx.remote.state || 'Inactive', limit: 18 };
        const b1 = comp1(p1, key + `__1__${key1}`, node, this, null);
        const b2 = comp2(p2, key + `__2__${key1}`, node, this, null);
        const b3 = comp3(p3, key + `__3__${key1}`, node, this, null);
        const b4 = comp4(p4, key + `__4__${key1}`, node, this, null);
        const b5 = comp5(p5, key + `__5__${key1}`, node, this, null);
        const remoteItem = ctx.remote;
        const delH = [() => ctx.removeRemote(remoteItem), ctx];
        c[i] = withKey(block4([delH], [b1, b2, b3, b4, b5]), key1);
      }
      ctx = ctx.__proto__;
      listBlock = block3([], [list(c)]);
    }
    return block1([attr1, h1, attr2, h2, attr3, attr4, submitH, form.remote_host, hv, form.remote_name, nv, form.remote_database, dv, srcIssue, srcIssueH, srcTask, srcTaskH, addH, loadH, eyeH, removeAllH], [errBlock, listBlock]);
  };
}

class OptionsApp extends Component {
  static components = { ReadMore };
  static template = 'OptionsApp';
  setup() {
    this.state = useState({
      activePage: 'options',
      remotes: [],
      showList: true,
      error: '',
      form: { remote_host: '', remote_name: '', remote_database: '', remote_datasrc: 'project.issue' },
    });
    onWillStart(async () => { await this.loadRemotes(); });
  }
  async loadRemotes() { this.state.remotes = await readRemotes(); }
  async addRemote() {
    this.state.error = '';
    const host = normalizeHost(this.state.form.remote_host || '');
    const name = (this.state.form.remote_name || '').trim();
    const database = (this.state.form.remote_database || '').trim();
    const datasrc = this.state.form.remote_datasrc || 'project.issue';
    if (!host || !name || !database) { this.state.error = 'Fields cannot be empty'; return; }
    if (!validURL(host)) { this.state.error = 'Invalid URL syntax'; return; }
    const remotes = await readRemotes();
    if (remotes.some((r) => r.url === host && r.database === database)) { this.state.error = `${host} and ${database} already exist; duplicates are not allowed`; return; }
    remotes.push({ url: host, name, database, datasrc, state: 'Inactive' });
    await writeRemotes(remotes);
    await this.loadRemotes();
    this.state.form.remote_host = '';
    this.state.form.remote_name = '';
    this.state.form.remote_database = '';
    this.state.form.remote_datasrc = 'project.issue';
    alert(`Host [${host}] added successfully.`);
  }
  async removeRemote(remote) {
    const ok = confirm(`Are you sure you want to remove remote [${remote.url}]?`);
    if (!ok) return;
    await clearOdooSessionCookies(remote.url);
    const remotes = (await readRemotes()).filter((r) => !(r.url === remote.url && r.database === remote.database));
    await writeRemotes(remotes);
    await storage.remove(remote.database);
    await this.loadRemotes();
    alert(`[${remote.url}] removed successfully!`);
  }
  async removeAllRemotes() {
    const ok = confirm('Are you sure you want to remove all remotes?');
    if (!ok) return;
    const remotes = await readRemotes();
    for (const remote of remotes) {
      await clearOdooSessionCookies(remote.url);
      await storage.remove(remote.database);
    }
    await storage.remove('remote_host_info');
    await this.loadRemotes();
    alert('Host list removed successfully!');
  }
}

const templates = { ReadMore: ReadMoreTemplate, OptionsApp: OptionsAppTemplate };
mount(OptionsApp, document.getElementById('app'), { dev: true, templates });
