import {
  readRemotes,
  writeRemotes,
  validURL,
  normalizeHost,
  remoteIdentity,
  storage,
  clearOdooSessionCookies,
  notify,
  confirmDialog,
} from '../lib/common.js';
import { ReadMore, createReadMoreTemplate } from './readmore.js';

const { Component, mount, useState, onWillStart } = owl;

const PAGE_ABOUT = 'about';
const PAGE_OPTIONS = 'options';
const DEFAULT_DATA_SOURCE = 'project.issue';
const DEFAULT_LOGO_SRC = '/img/logo.png';
const MAX_REMOTE_LOGO_BYTES = 512 * 1024;
const ALLOWED_REMOTE_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const STORAGE_KEYS = {
  remoteHostInfo: 'remote_host_info',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


function getTemplateRegistry() {
  return globalThis.__THERP_TIMER_TEMPLATES__ || {};
}

function resolveTemplate(name, fallbackTemplate) {
  const registry = getTemplateRegistry();
  return typeof registry[name] === 'function'
    ? registry[name]
    : fallbackTemplate;
}

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
    `<div><div id="navigation"><h1 class="title-app">Timer Options</h1><ul class="list-group"><li class="chooser list-group-item" block-attribute-0="class" block-handler-1="click"><i class="fa fa-info-circle"/> <span>About Timer</span></li><li class="chooser list-group-item" block-attribute-2="class" block-handler-3="click"><i class="fa fa-cogs"/> <span>Options</span></li></ul><hr/><div class="footer-app"><a href="popup.html" class="back-left"><i class="fa fa-arrow-circle-left fa-2x"/></a></div></div><div class="options-box box" block-attribute-4="class"><h1><div class="logo"><img src="/img/logo.png"/></div></h1><hr/><div class="about-app"><h4 class="title-app text-center">Description</h4><hr/>This is a standalone Owl rewrite of the original cross-platform timer extension for posting work hours to Odoo timesheets.<hr/><h4 class="title-app text-center">Features</h4><hr/><div class="timer-features"><ul class="list-group"><li class="list-group-item">Support for both tasks and issues</li><li class="list-group-item">Start and stop the timer for the selected item</li><li class="list-group-item">Create Odoo timesheet lines against the linked analytic account</li><li class="list-group-item">Show assigned items or everyone’s items</li><li class="list-group-item">Add, remove, or clear remote hosts</li><li class="list-group-item">Switch between remote sessions</li><li class="list-group-item">Download current month or current item timesheets as CSV</li></ul></div></div></div><div class="options-box box" block-attribute-5="class"><div class="form remote-options-form"><form block-handler-6="submit.prevent"><h4 class="remote-title text-info">General Settings</h4><hr/><div class="form-group"><label class="general-setting-label"><input type="checkbox" class="defaultCheckbox" block-property-21="checked" block-handler-22="change"/> Auto Download Current Item Timesheet</label><p class="inline-help">Store timesheet locally each time you stop the timer on an item.</p></div><hr/><h4 class="remote-title text-info">Add Remote</h4><hr/><div class="form-group"><label for="remote-host">Odoo Host</label><input type="text" class="form-control" id="remote-host" placeholder="https://your-odoo-host.example" block-property-7="value" block-handler-8="input"/></div><div class="form-group"><label for="remote-name">Display Name</label><input type="text" class="form-control" id="remote-name" placeholder="Therp" block-property-9="value" block-handler-10="input"/></div><div class="form-group"><label for="remote-database">Odoo Database</label><input type="text" class="form-control" id="remote-database" placeholder="someodoodatabase" block-property-11="value" block-handler-12="input"/></div><div class="form-group"><label class="label">Data Source</label><ul class="data-source-list list-group"><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.issue" id="FromIssues" block-property-13="checked" block-handler-14="change"/><label class="form-check-label" for="FromIssues">From Issues</label></div></li><li class="list-group-item"><div class="form-check"><input class="form-check-input" type="radio" value="project.task" id="FromTasks" block-property-15="checked" block-handler-16="change"/><label class="form-check-label" for="FromTasks">From Tasks</label></div></li></ul></div><span class="caption-remotes">Controls</span><div class="remotes-control-btns col-md-12 text-center text-info pointer"><i title="Add a remote host" class="fa fa-2x fa-plus-circle" block-handler-17="click"/><i title="Refresh list of remotes" class="fa fa-2x fa-refresh" block-handler-18="click"/><i title="View list of remotes" class="fa fa-2x fa-eye" block-handler-19="click"/><i title="Remove all remotes" class="fa fa-2x fa-minus-circle" block-handler-20="click"/></div><block-child-0/></form></div><block-child-1/></div></div>`
  );
  const errorBlock = createBlock(`<div class="remote-error"><block-text-0/></div>`);
  const remotesTableBlock = createBlock(
    `<div class="remotes-table-info"><table class="table table-bordered"><caption class="text-info caption-remotes">List of Available Remotes</caption><thead><tr><th scope="col">Remote</th><th scope="col">Host</th><th scope="col">Database</th><th scope="col">Source</th><th scope="col">State</th><th></th></tr></thead><tbody><block-child-0/></tbody></table></div>`
  );
  const remoteRowBlock = createBlock(
    `<tr><td class="text-info"><block-child-0/></td><td><block-child-1/></td><td><block-child-2/></td><td><block-child-3/></td><td><block-child-4/></td><td class="remote-row-actions"><i class="fa fa-pencil text-primary" title="Edit remote" block-handler-0="click" style="margin-right: 10px; cursor: pointer;"/>
                        <i class="fa fa-trash text-danger" title="Remove remote" block-handler-1="click" style="cursor: pointer;"/></td></tr>`
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
    const autoDownloadChecked = ctx.state.autoDownloadIssueTimesheet;
    const autoDownloadHandler = [(ev) => { ctx.toggleAutoDownload(ev); }];

    if (ctx.state.error) {
      errorNode = errorBlock([ctx.state.error]);
    }

    if (ctx.state.showList && ctx.state.remotes.length) {
      ctx = Object.create(ctx);
      const [remoteItems, , remoteCount, remoteChildren] = prepareList(ctx.state.remotes);
      const seenRemoteKeys = new Set();

      for (let i = 0; i < remoteCount; i++) {
        ctx.remote = remoteItems[i];
        const remoteKey = ctx.remoteKey(ctx.remote);

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
        const editHandler = [() => ctx.editRemote(remoteItem), ctx];
        const deleteHandler = [() => ctx.removeRemote(remoteItem), ctx];

        remoteChildren[i] = withKey(
          remoteRowBlock([editHandler, deleteHandler], [nameNode, hostNode, databaseNode, sourceNode, stateNode]),
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
        autoDownloadChecked,     
        autoDownloadHandler,
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
    this.removeRemote = this.removeRemote.bind(this);
    this.editRemote = this.editRemote.bind(this);

    this.state = useState({
      activePage: PAGE_OPTIONS,
      layoutBrowser: 'Browser',
      layoutCanCustomize: true,
      layoutError: '',
      layoutSuggestionActive: false,
      layoutSuggestedFields: {},
      layoutStored: false,
      layoutPrefs: { popupWidth: 800, popupHeight: 600, density: 'compact', fontSize: 13, spacing: 'compact' },
      layoutDefaults: { popupWidth: 800, popupHeight: 600, density: 'compact', fontSize: 13, spacing: 'compact' },
      layoutLimits: { popupWidth: [720, 800], popupHeight: [520, 600], fontSize: [12, 15] },
      remotes: [],
      showList: true,
      error: '',
      autoDownloadIssueTimesheet: false,
      logoPickerNeedsPersistentTab: false,
      form: {
        remote_host: '',
        remote_name: '',
        remote_database: '',
        remote_datasrc: DEFAULT_DATA_SOURCE,
        remote_logo: '',
      },
    });

    onWillStart(async () => {
      await this.loadRemotes();
      await this.loadLayoutPreferences();
      await this.detectPersistentLogoPickerContext();
      // THERP UX: Firefox popup logo picker bridge.
      try {
        const firefox = globalThis.browser?.runtime?.getBrowserInfo
          && globalThis.browser?.tabs?.getCurrent;
        if (firefox) {
          const currentTab = await globalThis.browser.tabs.getCurrent();
          this.state.logoPickerNeedsPersistentTab = !currentTab;
        }
      } catch (err) {
        this.state.logoPickerNeedsPersistentTab = false;
        console.debug('[OptionsApp] Could not inspect Firefox Options context.', err);
      }
      const saved = await storage.get('auto_download_issue_timesheet', false);
      this.state.autoDownloadIssueTimesheet = !!saved;
    });
  }

  /**
   * Reload remote configurations from storage.
   *
   * @returns {Promise<void>}
   */
  async loadLayoutPreferences() {
    const api = globalThis.TherpLayoutPrefs;
    if (!api) return;
    const loaded = await api.getState();
    this.state.layoutCanCustomize = true;
    this.state.layoutBrowser = api.browserLabel();
    this.state.layoutStored = loaded.stored;
    this.state.layoutPrefs = loaded.value;
    this.state.layoutError = '';
    if (loaded.stored) api.apply(loaded.value);
  }

  async saveLayoutPreferences() {
    const api = globalThis.TherpLayoutPrefs;
    if (!api) return;
    const result = api.validate(this.state.layoutPrefs);
    if (!result.ok) {
      this.state.layoutError = result.errors.join(' ');
      return;
    }
    const confirmed = await confirmDialog(`Save these validated ${api.browserLabel()} layout preferences?`);
    if (!confirmed) return;
    const saved = await api.save(result.value);
    this.state.layoutPrefs = saved;
    this.state.layoutStored = true;
  this.state.layoutSuggestionActive = false;
  this.state.layoutSuggestedFields = {};
    this.state.layoutError = '';
    api.apply(saved);
    await notify('Layout preferences saved. Reopen the timer popup for all main-page changes.');
  }

  async resetLayoutPreferences() {
    const api = globalThis.TherpLayoutPrefs;
    if (!api) return;
    const confirmed = await confirmDialog(`Reset ${api.browserLabel()} layout preferences to the source CSS defaults?`);
    if (!confirmed) return;
    const defaults = await api.reset();
    this.state.layoutPrefs = defaults;
    this.state.layoutStored = false;
  this.state.layoutSuggestionActive = false;
  this.state.layoutSuggestedFields = {};
    this.state.layoutError = '';
    await notify('Layout preferences reset to source CSS defaults.');
  }



  async getCurrentExtensionTab() {
    try {
      if (globalThis.browser?.tabs?.getCurrent) return await globalThis.browser.tabs.getCurrent();
      if (globalThis.chrome?.tabs?.getCurrent) {
        return await new Promise((resolve) => globalThis.chrome.tabs.getCurrent(resolve));
      }
    } catch (err) {
      console.debug('[OptionsApp] Could not inspect extension page context.', err);
    }
    return null;
  }

  async detectPersistentLogoPickerContext() {
    const currentTab = await this.getCurrentExtensionTab();
    this.state.logoPickerNeedsPersistentTab = !currentTab;
  }

  onRemoteLogoPickerClick(ev) {
    if (!this.state.logoPickerNeedsPersistentTab) return;
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    const runtime = globalThis.browser?.runtime || globalThis.chrome?.runtime;
    if (!runtime?.openOptionsPage) return;
    Promise.resolve(runtime.openOptionsPage()).catch((err) => {
      console.debug('[OptionsApp] Could not open persistent Options tab.', err);
    });
  }

  markLayoutFieldEdited(fieldKey) {
    const current = this.state.layoutSuggestedFields || {};
    if (!current[fieldKey]) return;
    const next = { ...current };
    delete next[fieldKey];
    this.state.layoutSuggestedFields = next;
  }

  async loadSuggestedLayoutSettings() {
    const api = globalThis.TherpLayoutPrefs;
    if (!api) return;
    this.state.layoutPrefs = api.suggestedPreset();
    this.state.layoutSuggestedFields = {
      'main.width': true,
      'table.headerWrap': true,
      'table.layoutMode': true,
      'table.minWidth': true,
      'table.stripeEnabled': true,
      'table.headerBg': true,
      'table.stripeBg': true,
      'table.actionWidth': true,
    };
    this.state.layoutSuggestionActive = true;
    this.state.layoutError = '';
  }

  async loadRemotes() {
    this.state.remotes = await readRemotes();
  }


  remoteKey(remote) { return remoteIdentity(remote); }
  remoteLogoSrc(remote) { return remote?.logoDataUrl || DEFAULT_LOGO_SRC; }
  get formLogoSrc() { return this.state.form.remote_logo || DEFAULT_LOGO_SRC; }

  async readLogoFile(file) {
    if (!file) return '';
    if (!ALLOWED_REMOTE_LOGO_TYPES.has(file.type)) {
      throw new Error('Company logo must be PNG, JPEG, WebP, or GIF.');
    }
    if (file.size > MAX_REMOTE_LOGO_BYTES) {
      throw new Error('Company logo is too large. Maximum size is 512 KB.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read the selected company logo.'));
      reader.readAsDataURL(file);
    });
  }

  /** THERP UX: Firefox popup logo picker bridge: only redirect from Firefox's temporary toolbar popup. */
  onRemoteLogoPickerClick(ev) {
    if (!this.state.logoPickerNeedsPersistentTab) {
      return;
    }
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    const runtime = globalThis.browser?.runtime;
    if (runtime?.openOptionsPage) {
      Promise.resolve(runtime.openOptionsPage()).catch((err) => {
        console.debug('[OptionsApp] Could not open persistent Firefox Options page.', err);
      });
    }
  }

  async onRemoteLogoChange(ev) {
    const input = ev?.target;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      this.state.form.remote_logo = await this.readLogoFile(file);
    } catch (err) {
      if (input) input.value = '';
      await notify(err.message || 'Could not use the selected company logo.');
    }
  }

  clearRemoteLogo() {
    this.state.form.remote_logo = '';
    const input = document.getElementById('remote-logo');
    if (input) input.value = '';
  }

  duplicateRemoteMessage(remote) {
    return `A remote for ${remote.url} / ${remote.database} / ${remote.datasrc || DEFAULT_DATA_SOURCE} already exists. ` +
      'Change the host, database, or data source.';
  }

  /**
   * Reset the add-remote form back to defaults.
   */
  resetRemoteForm() {
    this.state.form.remote_host = '';
    this.state.form.remote_name = '';
    this.state.form.remote_database = '';
    this.state.form.remote_datasrc = DEFAULT_DATA_SOURCE;
    this.state.form.remote_logo = '';
  }

  /**
   * Toggle the auto-download timesheet preference and persist it.
   * @param {Event} ev
   */
  async toggleAutoDownload(ev) {
    this.state.autoDownloadIssueTimesheet = ev.target.checked;
    await storage.set('auto_download_issue_timesheet', !!this.state.autoDownloadIssueTimesheet);
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

    const candidate = {url: host, database, datasrc};
    if (remotes.some((remote) => remoteIdentity(remote) === remoteIdentity(candidate))) {
      await notify(this.duplicateRemoteMessage(candidate));
      return;
    }

    remotes.push({
      url: host,
      name,
      database,
      datasrc,
      logoDataUrl: this.state.form.remote_logo || '',
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

    const targetKey = remoteIdentity(remote);
    const remotes = (await readRemotes()).filter(
      (currentRemote) => remoteIdentity(currentRemote) !== targetKey
    );

    await writeRemotes(remotes);
    if (!remotes.some((item) => normalizeHost(item.url || '') === normalizeHost(remote.url || ''))) {
      await clearOdooSessionCookies(remote.url);
    }
    if (!remotes.some((item) => String(item.database || '').trim() === String(remote.database || '').trim())) {
      await storage.remove(remote.database);
    }
    await this.loadRemotes();
    await notify(`[${remote.url}] removed successfully!`);
  }

  /**
   * Edit an existing remote configuration.
   *
   * @param {object} remote Remote row to edit.
   * @returns {Promise<void>}
   */
  async editRemote(remote) {
    this.state.error = '';

    const currentHost = remote.url || '';
    const currentName = remote.name || '';
    const currentDatabase = remote.database || '';
    const currentDatasource = remote.datasrc || DEFAULT_DATA_SOURCE;

    const customAlert = globalThis.alert && typeof globalThis.alert.show === 'function'
      ? globalThis.alert
      : null;

    let host = currentHost;
    let name = currentName;
    let database = currentDatabase;
    let datasrc = currentDatasource;
    let logoDataUrl = remote.logoDataUrl || '';

    if (customAlert) {
      const inputSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const hostId = `edit-remote-host-${inputSuffix}`;
      const nameId = `edit-remote-name-${inputSuffix}`;
      const databaseId = `edit-remote-database-${inputSuffix}`;
      const datasourceId = `edit-remote-datasource-${inputSuffix}`;
      // THERP UX FIX: build Edit Remote dialog with DOM APIs.
      // alert.js intentionally does not parse dynamic HTML strings.
      const dialog = document.createElement('div');
      dialog.style.cssText = 'min-width:340px;max-width:520px;text-align:left;';

      const dialogTitle = document.createElement('div');
      dialogTitle.style.cssText =
        'margin-bottom:14px;font-weight:700;font-size:18px;color:#42475a;text-align:center;';
      dialogTitle.textContent = 'Edit Remote';

      const form = document.createElement('div');
      form.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

      const inputStyle =
        'width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;' +
        'border-radius:4px;font:14px Arial,Helvetica,sans-serif;color:#111827;background:#fff;';

      const addField = (captionText, control) => {
        const label = document.createElement('label');
        label.style.cssText =
          'display:flex;flex-direction:column;gap:6px;font-weight:600;color:#334155;';
        const caption = document.createElement('span');
        caption.textContent = captionText;
        label.append(caption, control);
        form.appendChild(label);
      };

      const hostInput = document.createElement('input');
      hostInput.id = hostId;
      hostInput.type = 'text';
      hostInput.value = currentHost;
      hostInput.style.cssText = inputStyle;
      addField('Odoo Host', hostInput);

      const nameInput = document.createElement('input');
      nameInput.id = nameId;
      nameInput.type = 'text';
      nameInput.value = currentName;
      nameInput.style.cssText = inputStyle;
      addField('Display Name', nameInput);

      const databaseInput = document.createElement('input');
      databaseInput.id = databaseId;
      databaseInput.type = 'text';
      databaseInput.value = currentDatabase;
      databaseInput.style.cssText = inputStyle;
      addField('Odoo Database', databaseInput);

      const datasourceSelect = document.createElement('select');
      datasourceSelect.id = datasourceId;
      datasourceSelect.style.cssText = inputStyle;
      for (const [value, caption] of [
        ['project.issue', 'From Issues'],
        ['project.task', 'From Tasks'],
        ['helpdesk.ticket', 'From Helpdesk Tickets'],
      ]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = caption;
        option.selected = currentDatasource === value;
        datasourceSelect.appendChild(option);
      }
      addField('Data Source', datasourceSelect);

      const logoRow = document.createElement('div');
      logoRow.style.cssText = 'display:flex;gap:12px;align-items:center;';

      const logoPreview = document.createElement('img');
      logoPreview.src = this.remoteLogoSrc(remote);
      logoPreview.alt = 'Remote logo';
      logoPreview.style.cssText =
        'width:64px;height:48px;object-fit:contain;border:1px solid #e2e8f0;' +
        'border-radius:5px;background:#fff;padding:3px;';

      const logoBox = document.createElement('div');
      logoBox.style.cssText = 'flex:1;';

      const logoHeading = document.createElement('div');
      logoHeading.style.cssText = 'font-weight:600;color:#334155;margin-bottom:6px;';
      logoHeading.textContent = 'Company Logo (optional)';

      const logoInput = document.createElement('input');
      logoInput.id = `edit-remote-logo-${inputSuffix}`;
      logoInput.type = 'file';
      logoInput.addEventListener('click', this.onRemoteLogoPickerClick.bind(this));
      logoInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
      logoInput.style.cssText = 'width:100%;font-size:13px;';

      const removeLabel = document.createElement('label');
      removeLabel.style.cssText =
        'display:block;margin-top:7px;font-size:12px;color:#64748b;font-weight:400;';
      const removeInput = document.createElement('input');
      removeInput.id = `edit-remote-remove-logo-${inputSuffix}`;
      removeInput.type = 'checkbox';
      removeLabel.append(removeInput, document.createTextNode(' Use the default Therp logo'));

      const logoHelp = document.createElement('div');
      logoHelp.style.cssText = 'margin-top:4px;font-size:11px;color:#94a3b8;';
      logoHelp.textContent = 'PNG, JPEG, WebP or GIF; maximum 512 KB.';

      logoBox.append(logoHeading, logoInput, removeLabel, logoHelp);
      logoRow.append(logoPreview, logoBox);
      form.appendChild(logoRow);

      dialog.append(dialogTitle, form);
      const result = await customAlert.show(dialog, ['Cancel', 'Save']);
      if (result !== 'Save') {
        return;
      }

      const hostEl = document.getElementById(hostId);
      const nameEl = document.getElementById(nameId);
      const databaseEl = document.getElementById(databaseId);
      const datasourceEl = document.getElementById(datasourceId);
      const logoEl = document.getElementById(`edit-remote-logo-${inputSuffix}`);
      const removeLogoEl = document.getElementById(`edit-remote-remove-logo-${inputSuffix}`);

      host = normalizeHost(hostEl ? hostEl.value : currentHost);
      name = ((nameEl ? nameEl.value : currentName) || '').trim();
      database = ((databaseEl ? databaseEl.value : currentDatabase) || '').trim();
      datasrc = datasourceEl ? datasourceEl.value : currentDatasource;
      if (removeLogoEl?.checked) {
        logoDataUrl = '';
      } else if (logoEl?.files?.[0]) {
        try { logoDataUrl = await this.readLogoFile(logoEl.files[0]); }
        catch (err) { await notify(err.message || 'Could not use the selected company logo.'); return; }
      }
    } else {
      return;
    }

    if (!host || !name || !database) {
      this.state.error = 'Fields cannot be empty';
      return;
    }

    if (!validURL(host)) {
      this.state.error = 'Invalid URL syntax';
      return;
    }

    const remotes = await readRemotes();
    const originalKey = remoteIdentity(remote);
    const candidate = {url: host, database, datasrc};
    const duplicate = remotes.some(
      (item) => remoteIdentity(item) !== originalKey && remoteIdentity(item) === remoteIdentity(candidate)
    );
    if (duplicate) {
      await notify(this.duplicateRemoteMessage(candidate));
      return;
    }

    const index = remotes.findIndex((item) => remoteIdentity(item) === originalKey);
    if (index === -1) {
      await notify('Remote not found. Refresh the list and try again.');
      return;
    }

    const oldHost = normalizeHost(remotes[index].url || '');
    const oldDb = String(remotes[index].database || '').trim();

    remotes[index] = {
      ...remotes[index],
      url: host,
      name,
      database,
      datasrc,
      logoDataUrl,
    };

    await writeRemotes(remotes);

    if (oldHost !== host && !remotes.some((item) => normalizeHost(item.url || '') === oldHost)) {
      await clearOdooSessionCookies(oldHost);
    }
    if (oldDb !== database && !remotes.some((item) => String(item.database || '').trim() === oldDb)) {
      await storage.remove(oldDb);
    }

    await this.loadRemotes();
    await notify(`Remote [${name}] updated successfully.`);
  }

  get PAGE_ABOUT() {
      return PAGE_ABOUT;
  }

  /**
   * Expose the Options page constant to Owl XML expressions.
   *
   * @returns {string}
   */
  get PAGE_OPTIONS() {
      return PAGE_OPTIONS;
  }

  /**
   * Expose the default data source constant to Owl XML expressions.
   *
   * @returns {string}
   */
  get DEFAULT_DATA_SOURCE() {
      return DEFAULT_DATA_SOURCE;
  }

  /**
   * Switch the options view to the About page.
   *
   * @returns {void}
   */
  showAboutPage() {
      this.state.activePage = PAGE_ABOUT;
  }

  /**
   * Switch the options view to the Options page.
   *
   * @returns {void}
   */
  showOptionsPage() {
      this.state.activePage = PAGE_OPTIONS;
  }

  /**
   * Toggle visibility of the saved remotes list.
   *
   * @returns {void}
   */
  toggleRemoteList() {
      this.state.showList = !this.state.showList;
  }

  /**
   * Handle selecting the "From Issues" data source radio option.
   *
   * @param {Event} ev
   * @returns {void}
   */
  onDataSourceIssuesChange(ev) {
      if (ev.target.checked) {
          this.state.form.remote_datasrc = DEFAULT_DATA_SOURCE;
      }
  }

  /**
   * Handle selecting the "From Tasks" data source radio option.
   *
   * @param {Event} ev
   * @returns {void}
   */
  onDataSourceTasksChange(ev) {
      if (ev.target.checked) {
          this.state.form.remote_datasrc = 'project.task';
      }
  }
  /**
   * Handle Odoo host text input changes.
   *
   * @param {Event} ev
   * @returns {void}
   */
  onRemoteHostInput(ev) {
      this.state.form.remote_host = ev.target.value;
  }

  /**
   * Handle display name text input changes.
   *
   * @param {Event} ev
   * @returns {void}
   */
  onRemoteNameInput(ev) {
      this.state.form.remote_name = ev.target.value;
  }

  /**
   * Handle database name text input changes.
   *
   * @param {Event} ev
   * @returns {void}
   */
  onRemoteDatabaseInput(ev) {
      this.state.form.remote_database = ev.target.value;
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
    for (const host of [...new Set(remotes.map((remote) => normalizeHost(remote.url || '')).filter(Boolean))]) {
      await clearOdooSessionCookies(host);
    }
    for (const database of [...new Set(remotes.map((remote) => String(remote.database || '').trim()).filter(Boolean))]) {
      await storage.remove(database);
    }

    await writeRemotes([]);
    await storage.remove(STORAGE_KEYS.remoteHostInfo);
    await this.loadRemotes();
    await notify('Host list removed successfully!');
  }
}

const compiledTemplates = globalThis.__THERP_TIMER_TEMPLATES__ || {};

const templates = {
    ReadMore: compiledTemplates.ReadMore || createReadMoreTemplate,
    OptionsApp:
        compiledTemplates.OptionsApp || createOptionsAppTemplate,
};

mount(OptionsApp, document.getElementById('app'), {
  dev: true,
  templates,
});
