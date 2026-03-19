import {
  readRemotes,
  writeRemotes,
  validURL,
  normalizeHost,
  storage,
  clearOdooSessionCookies,
  notify,
  confirmDialog,
} from './common.js';
import { ReadMore, createReadMoreTemplate } from './components/readmore.js';

const { Component, mount, useState, onWillStart } = owl;

const PAGE_ABOUT = 'about';
const PAGE_OPTIONS = 'options';
const DEFAULT_DATA_SOURCE = 'project.issue';

const STORAGE_KEYS = {
  remoteHostInfo: 'remote_host_info',
};

/**
 * Create the compiled template used by the options application.
 *
 * @param {object} app OWL app instance.
 * @param {object} bdom OWL block DOM helpers.
 * @param {object} helpers OWL template helpers.
 * @returns {Function} Compiled template.
 */
function createOptionsAppTemplate(app, bdom, helpers) {
  const { createBlock, list } = bdom;
  const { prepareList, OwlError, withKey } = helpers;

  const readMoreName = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
  const readMoreHost = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
  const readMoreDatabase = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
  const readMoreSource = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);
  const readMoreState = app.createComponent('ReadMore', true, false, false, ['text', 'limit']);

  const rootBlock = createBlock(
    `<div><div id="navigation"><h1 class="title-app">Timer Options</h1><ul class="list-group"><li class="chooser list-group-item" block-attribute-0="class" block-handler-1="click"><i class="fa fa-info-circle"/> <span>About Timer</span></li><li class="chooser list-group-item" block-attribute-2="class" block-handler-3="click"><i class="fa fa-cogs"/> <span>Options</span></li></ul><hr/><div class="footer-app"><a href="popup.html" class="back-left"><i class="fa fa-arrow-circle-left fa-2x"/></a></div></div><div class="options-box box" block-attribute-4="class"><h1><div class="logo"><img src="/img/logo.png"/></div></h1><hr/><div class="about-app"><h4 class="title-app text-center">Description</h4><hr/>This is a standalone Owl rewrite of the original cross-platform timer extension for posting work hours to Odoo timesheets.<hr/><h4 class="title-app text-center">Features</h4><hr/><div class="timer-features"><ul class="list-group"><li class="list-group-item">Support for both Issues and Tasks</li><li class="list-group-item">Start and stop timer for the selected issue/task</li><li class="list-group-item">Create Odoo timesheet lines against the linked analytic account</li><li class="list-group-item">Show assigned issues/tasks or everyone’s items</li><li class="list-group-item">Add, remove, or clear remote hosts</li><li class="list-group-item">Switch between remote sessions</li><li class="list-group-item">Download current month or current issue timesheets as CSV</li></ul></div></div></div><div class="options-box box" block-attribute-5="class"><div class="form remote-options-form"><form block-handler-6="submit.prevent"><h4 class="remote-title text-info">Add Remote</h4><hr/><div class="form-group"><label for="remote-host">Odoo Host</label><input type="text" class="form-control" id="remote-host" placeholder="https://your-odoo-host.example" block-property-7="value" block-handler-8="input"/></div><div class="form-group"><label for="remote-name">Display Name</label><input type="text" class="form-control" id="remote-name" placeholder="Therp" block-property-9="value" block-handler-10="input"/></div><div class="form-group"><label for="remote-database">Odoo Database</label><input type="text" class="form-control" id="remote-database" placeholder="someodoodatabase" block-property-11="value" block-handler-12="input"/></div><div class="form-group"><label class="label">Data Source</label><ul class="data-source-list list-group"><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.issue" id="FromIssues" block-property-13="checked" block-handler-14="change"/><label class="form-check-label" for="FromIssues">From Issues</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.task" id="FromTasks" block-property-15="checked" block-handler-16="change"/><label class="form-check-label" for="FromTasks">From Tasks</label></div></li></ul></div><span class="caption-remotes">Controls</span><div class="remotes-control-btns col-md-12 text-center text-info pointer"><i title="Add a remote host" class="fa fa-2x fa-plus-circle" block-handler-17="click"/><i title="Refresh list of remotes" class="fa fa-2x fa-refresh" block-handler-18="click"/><i title="View list of remotes" class="fa fa-2x fa-eye" block-handler-19="click"/><i title="Remove all remotes" class="fa fa-2x fa-minus-circle" block-handler-20="click"/></div><block-child-0/></form></div><block-child-1/></div></div>`
  );
  const errorBlock = createBlock(`<div class="remote-error"><block-text-0/></div>`);
  const remotesTableBlock = createBlock(
    `<div class="remotes-table-info"><table class="table table-bordered"><caption class="text-info caption-remotes">List of Available Remotes</caption><thead><tr><th scope="col">Remote</th><th scope="col">Host</th><th scope="col">Database</th><th scope="col">Source</th><th scope="col">State</th><th></th></tr></thead><tbody><block-child-0/></tbody></table></div>`
  );
  const remoteRowBlock = createBlock(
    `<tr><td class="text-info"><block-child-0/></td><td><block-child-1/></td><td><block-child-2/></td><td><block-child-3/></td><td><block-child-4/></td><td class="remote-row-actions"><i class="fa fa-trash text-danger" title="Remove remote" block-handler-0="click"/></td></tr>`
  );

  return function template(ctx, node, key = '') {
    let errorNode = null;
    let remoteListNode = null;

    const aboutNavClass = ctx.state.activePage === PAGE_ABOUT ? 'selected' : 'notselected';
    const optionsNavClass = ctx.state.activePage === PAGE_OPTIONS ? 'selected' : 'notselected';
    const showAboutHandler = [() => { ctx.state.activePage = PAGE_ABOUT; }, ctx];
    const showOptionsHandler = [() => { ctx.state.activePage = PAGE_OPTIONS; }, ctx];
    const aboutPageClass = ctx.state.activePage === PAGE_ABOUT ? 'active_page' : 'inactive_page';
    const optionsPageClass = ctx.state.activePage === PAGE_OPTIONS ? 'active_page' : 'inactive_page';

    const formSubmitHandler = ['prevent', ctx.addRemote, ctx];
    const formState = ctx.state.form;
    const hostInputHandler = [(ev) => { formState.remote_host = ev.target.value; }];
    const nameInputHandler = [(ev) => { formState.remote_name = ev.target.value; }];
    const databaseInputHandler = [(ev) => { formState.remote_database = ev.target.value; }];
    const issuesRadioChecked = formState.remote_datasrc === DEFAULT_DATA_SOURCE;
    const tasksRadioChecked = formState.remote_datasrc === 'project.task';

    const issuesRadioHandler = [(ev) => {
      if (ev.target.checked) {
        formState.remote_datasrc = DEFAULT_DATA_SOURCE;
      }
    }];

    const tasksRadioHandler = [(ev) => {
      if (ev.target.checked) {
        formState.remote_datasrc = 'project.task';
      }
    }];
    const addRemoteHandler = [ctx.addRemote, ctx];
    const reloadRemotesHandler = [ctx.loadRemotes, ctx];
    const toggleListHandler = [() => { ctx.state.showList = !ctx.state.showList; }, ctx];
    const removeAllRemotesHandler = [ctx.removeAllRemotes, ctx];

    if (ctx.state.error) {
      errorNode = errorBlock([ctx.state.error]);
    }

    if (ctx.state.showList && ctx.state.remotes.length) {
      ctx = Object.create(ctx);
      const [remoteItems, , remoteCount, remoteChildren] = prepareList(ctx.state.remotes);
      const seenRemoteKeys = new Set();

      for (let i = 0; i < remoteCount; i++) {
        ctx.remote = remoteItems[i];
        const remoteKey = ctx.remote.url + ctx.remote.database;

        if (seenRemoteKeys.has(String(remoteKey))) {
          throw new OwlError(`Got duplicate key in t-foreach: ${remoteKey}`);
        }
        seenRemoteKeys.add(String(remoteKey));

        const nameNode = readMoreName({ text: ctx.remote.name, limit: 18 }, key + `__1__${remoteKey}`, node, this, null);
        const hostNode = readMoreHost({ text: ctx.remote.url, limit: 25 }, key + `__2__${remoteKey}`, node, this, null);
        const databaseNode = readMoreDatabase({ text: ctx.remote.database, limit: 18 }, key + `__3__${remoteKey}`, node, this, null);
        const sourceNode = readMoreSource({ text: ctx.remote.datasrc || DEFAULT_DATA_SOURCE, limit: 18 }, key + `__4__${remoteKey}`, node, this, null);
        const stateNode = readMoreState({ text: ctx.remote.state || 'Inactive', limit: 18 }, key + `__5__${remoteKey}`, node, this, null);
        const remoteItem = ctx.remote;
        const deleteHandler = [() => ctx.removeRemote(remoteItem), ctx];

        remoteChildren[i] = withKey(
          remoteRowBlock([deleteHandler], [nameNode, hostNode, databaseNode, sourceNode, stateNode]),
          remoteKey
        );
      }

      ctx = ctx.__proto__;
      remoteListNode = remotesTableBlock([], [list(remoteChildren)]);
    }

    return rootBlock(
      [
        aboutNavClass,
        showAboutHandler,
        optionsNavClass,
        showOptionsHandler,
        aboutPageClass,
        optionsPageClass,
        formSubmitHandler,
        formState.remote_host,
        hostInputHandler,
        formState.remote_name,
        nameInputHandler,
        formState.remote_database,
        databaseInputHandler,
        issuesRadioChecked,
        issuesRadioHandler,
        tasksRadioChecked,
        tasksRadioHandler,
        addRemoteHandler,
        reloadRemotesHandler,
        toggleListHandler,
        removeAllRemotesHandler,
      ],
      [errorNode, remoteListNode]
    );
  };
}

/**
 * Main options application component.
 */
class OptionsApp extends Component {
  static components = { ReadMore };
  static template = 'OptionsApp';

  setup() {
    this.state = useState({
      activePage: PAGE_OPTIONS,
      remotes: [],
      showList: true,
      error: '',
      form: {
        remote_host: '',
        remote_name: '',
        remote_database: '',
        remote_datasrc: DEFAULT_DATA_SOURCE,
      },
    });

    onWillStart(async () => {
      await this.loadRemotes();
    });
  }

  /**
   * Reload remote configurations from storage.
   *
   * @returns {Promise<void>}
   */
  async loadRemotes() {
    this.state.remotes = await readRemotes();
  }

  /**
   * Reset the add-remote form back to defaults.
   */
  resetRemoteForm() {
    this.state.form.remote_host = '';
    this.state.form.remote_name = '';
    this.state.form.remote_database = '';
    this.state.form.remote_datasrc = DEFAULT_DATA_SOURCE;
  }

  /**
   * Validate current form fields and return normalized values.
   *
   * @returns {{host: string, name: string, database: string, datasrc: string}|null}
   */
  getValidatedRemoteForm() {
    const host = normalizeHost(this.state.form.remote_host || '');
    const name = (this.state.form.remote_name || '').trim();
    const database = (this.state.form.remote_database || '').trim();
    const datasrc = this.state.form.remote_datasrc || DEFAULT_DATA_SOURCE;

    if (!host || !name || !database) {
      this.state.error = 'Fields cannot be empty';
      return null;
    }

    if (!validURL(host)) {
      this.state.error = 'Invalid URL syntax';
      return null;
    }

    return { host, name, database, datasrc };
  }

  /**
   * Add a new remote configuration.
   *
   * @returns {Promise<void>}
   */
  async addRemote() {
    this.state.error = '';

    const validated = this.getValidatedRemoteForm();
    if (!validated) {
      return;
    }

    const { host, name, database, datasrc } = validated;
    const remotes = await readRemotes();

    if (remotes.some((remote) => remote.url === host && remote.database === database)) {
      this.state.error = `${host} and ${database} already exist; duplicates are not allowed`;
      return;
    }

    remotes.push({
      url: host,
      name,
      database,
      datasrc,
      state: 'Inactive',
    });

    await writeRemotes(remotes);
    await this.loadRemotes();
    this.resetRemoteForm();
    await notify(`Host [${host}] added successfully.`);
  }

  /**
   * Remove a single remote configuration.
   *
   * @param {object} remote Remote row to remove.
   * @returns {Promise<void>}
   */
  async removeRemote(remote) {
    const confirmed = await confirmDialog(`Are you sure you want to remove remote [${remote.url}]?`);
    if (!confirmed) {
      return;
    }

    await clearOdooSessionCookies(remote.url);
    const remotes = (await readRemotes()).filter(
      (currentRemote) => !(currentRemote.url === remote.url && currentRemote.database === remote.database)
    );

    await writeRemotes(remotes);
    await storage.remove(remote.database);
    await this.loadRemotes();
    await notify(`[${remote.url}] removed successfully!`);
  }

  /**
   * Remove every saved remote configuration.
   *
   * @returns {Promise<void>}
   */
  async removeAllRemotes() {
    const confirmed = await confirmDialog('Are you sure you want to remove all remotes?');
    if (!confirmed) {
      return;
    }

    const remotes = await readRemotes();
    for (const remote of remotes) {
      await clearOdooSessionCookies(remote.url);
      await storage.remove(remote.database);
    }

    await writeRemotes([]);
    await storage.remove(STORAGE_KEYS.remoteHostInfo);
    await this.loadRemotes();
    await notify('Host list removed successfully!');
  }
}

const templates = {
  ReadMore: createReadMoreTemplate,
  OptionsApp: createOptionsAppTemplate,
};

mount(OptionsApp, document.getElementById('app'), { dev: true, templates });