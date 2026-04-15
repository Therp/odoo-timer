import {
    readRemotes,
    writeRemotes,
    validURL,
    normalizeHost,
    storage,
    clearOdooSessionCookies,
    escapeHtml,
    notify,
    confirmDialog,
} from '../lib/common.js';
import { ReadMore, createReadMoreTemplate } from './readmore.js';

const { Component, mount, useState, onWillStart } = owl;

const PAGE_ABOUT    = 'about';
const PAGE_OPTIONS  = 'options';
const PAGE_STORAGE  = 'storage';
const PAGE_SECURITY = 'security';
const PAGE_HELP     = 'help';
const DEFAULT_DATA_SOURCE = 'project.issue';

const STORAGE_KEYS = { remoteHostInfo: 'remote_host_info' };

// ─── OptionsApp component ─────────────────────────────────────────────────────

class OptionsApp extends Component {
    static components = { ReadMore };
    static template   = 'OptionsApp';

    setup() {
        this.state = useState({
            activePage:       PAGE_OPTIONS,
            remotes:          [],
            showList:         true,
            error:            '',
            screenshotFolder: '',
            videoFolder:      '',
            form: {
                remote_host:          '',
                remote_name:          '',
                remote_database:      '',
                remote_odoo_version:  '',
                remote_poll_interval: '60',
                remote_datasrc:       DEFAULT_DATA_SOURCE,
            },
        });
        onWillStart(async () => {
            await this.loadRemotes();
            await this.refreshStoragePaths();
        });
    }

    async loadRemotes() { this.state.remotes = await readRemotes(); }

    resetRemoteForm() {
        Object.assign(this.state.form, {
            remote_host: '', remote_name: '', remote_database: '',
            remote_odoo_version: '', remote_poll_interval: '60',
            remote_datasrc: DEFAULT_DATA_SOURCE,
        });
    }

    _validate(host, name, database) {
        if (!host || !name || !database) {
            this.state.error = 'Host, Display Name, and Database are required.';
            return false;
        }
        if (!validURL(host)) {
            this.state.error = 'Invalid URL — must start with http:// or https://';
            return false;
        }
        return true;
    }

    async addRemote() {
        this.state.error = '';
        const host          = normalizeHost(this.state.form.remote_host || '');
        const name          = (this.state.form.remote_name || '').trim();
        const database      = (this.state.form.remote_database || '').trim();
        const version       = (this.state.form.remote_odoo_version || '').trim();
        const pollInterval  = Number(this.state.form.remote_poll_interval ?? 60);
        const datasrc       = this.state.form.remote_datasrc || DEFAULT_DATA_SOURCE;

        if (!this._validate(host, name, database)) return;

        const remotes = await readRemotes();
        if (remotes.some((r) => r.url === host && r.database === database)) {
            this.state.error = `${host} / ${database} already exists.`;
            return;
        }

        remotes.push({ url: host, name, database, odooVersion: version, pollInterval, datasrc, state: 'Inactive' });
        await writeRemotes(remotes);
        await this.loadRemotes();
        this.resetRemoteForm();
        await notify(`Host [${host}] added successfully.`);
    }

    // ── Edit remote via alert.js inline form ──────────────────────────────────
    async editRemote(remote) {
        this.state.error = '';
        const pfx = `therp-edit-${Date.now()}`;

        const html = `
<div style="min-width:420px;max-width:560px;text-align:left;font-family:Arial,Helvetica,sans-serif;">
  <div style="margin-bottom:16px;font-weight:700;font-size:17px;color:#42475a;text-align:center;">Edit Remote</div>

  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Display Name</label>
    <input id="${pfx}-name" value="${escapeHtml(remote.name || '')}"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;"/>
  </div>

  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Odoo Host</label>
    <input id="${pfx}-host" value="${escapeHtml(remote.url || '')}"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;"/>
  </div>

  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Database</label>
    <input id="${pfx}-database" value="${escapeHtml(remote.database || '')}"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;"/>
  </div>

  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Odoo Version <span style="color:#999;">(e.g. 16.0)</span></label>
    <input id="${pfx}-version" value="${escapeHtml(remote.odooVersion || '')}" placeholder="16.0"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;"/>
  </div>

  <div style="margin-bottom:4px;">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#555;">Data Source</label>
    <select id="${pfx}-datasrc"
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;font-size:14px;">
      <option value="project.issue"${(remote.datasrc || 'project.issue') !== 'project.task' ? ' selected' : ''}>From Issues (project.issue)</option>
      <option value="project.task"${remote.datasrc === 'project.task' ? ' selected' : ''}>From Tasks (project.task)</option>
    </select>
  </div>
</div>`;

        const result = await alert.show(html, ['Cancel', 'Save'], { accentColor: 'orange' });
        if (result !== 'Save') return;

        const get      = (id) => document.getElementById(id)?.value ?? '';
        const newName  = get(`${pfx}-name`).trim();
        const newHost  = normalizeHost(get(`${pfx}-host`));
        const newDb    = get(`${pfx}-database`).trim();
        const newVer   = get(`${pfx}-version`).trim();
        const newSrc   = get(`${pfx}-datasrc`) || DEFAULT_DATA_SOURCE;

        if (!this._validate(newHost, newName, newDb)) return;

        const remotes = await readRemotes();
        const duplicate = remotes.some(
            (r) => r.url === newHost && r.database === newDb &&
                   !(r.url === remote.url && r.database === remote.database)
        );
        if (duplicate) {
            this.state.error = `${newHost} / ${newDb} already exists.`;
            return;
        }

        const updated = remotes.map((r) =>
            r.url === remote.url && r.database === remote.database
                ? { ...r, name: newName, url: newHost, database: newDb,
                         odooVersion: newVer, datasrc: newSrc }
                : r
        );
        await writeRemotes(updated);
        await this.loadRemotes();
        await notify('Remote updated successfully.');
    }

    async removeRemote(remote) {
        const ok = await confirmDialog(`Remove remote [${remote.url}]?`);
        if (!ok) return;
        await clearOdooSessionCookies(remote.url);
        const remotes = (await readRemotes()).filter(
            (r) => !(r.url === remote.url && r.database === remote.database)
        );
        await writeRemotes(remotes);
        await storage.remove(remote.database);
        await this.loadRemotes();
        await notify(`[${remote.url}] removed.`);
    }

    async removeAllRemotes() {
        const ok = await confirmDialog('Remove ALL remotes? This cannot be undone.');
        if (!ok) return;
        for (const r of await readRemotes()) {
            await clearOdooSessionCookies(r.url);
            await storage.remove(r.database);
        }
        await writeRemotes([]);
        await storage.remove(STORAGE_KEYS.remoteHostInfo);
        await this.loadRemotes();
        await notify('All remotes removed.');
    }

    /** Reload stored folder paths into state (for display). */
    async refreshStoragePaths() {
        try {
            this.state.screenshotFolder = (await window.electronAPI?.prefs?.get('screenshotFolder', '')) || '';
            this.state.videoFolder      = (await window.electronAPI?.prefs?.get('videoFolder',      '')) || '';
            // Update DOM spans if they exist
            const ss = document.getElementById('ss-folder-display');
            if (ss) ss.textContent = this.state.screenshotFolder || 'Not set (will prompt)';
            const vid = document.getElementById('vid-folder-display');
            if (vid) vid.textContent = this.state.videoFolder || 'Not set (will prompt)';
        } catch (_) {}
    }

    async pickScreenshotFolder() {
        const folder = await window.electronAPI?.recorder?.pickFolder?.();
        if (folder) {
            await window.electronAPI?.prefs?.set('screenshotFolder', folder);
            await this.refreshStoragePaths();
            await notify(`Screenshot folder set: ${folder}`);
        }
    }

    async clearScreenshotFolder() {
        await window.electronAPI?.prefs?.set('screenshotFolder', '');
        await this.refreshStoragePaths();
        await notify('Screenshot folder cleared — will prompt on each save.');
    }

    async pickVideoFolder() {
        const folder = await window.electronAPI?.recorder?.pickFolder?.();
        if (folder) {
            await window.electronAPI?.prefs?.set('videoFolder', folder);
            await this.refreshStoragePaths();
            await notify(`Video folder set: ${folder}`);
        }
    }

    async clearVideoFolder() {
        await window.electronAPI?.prefs?.set('videoFolder', '');
        await this.refreshStoragePaths();
        await notify('Video folder cleared — will prompt on each save.');
    }

    /** Open README in external browser. */
    openReadme() {
        window.electronAPI?.openExternal?.('https://github.com/Therp/odoo-timer/blob/master/README.md');
    }

    /** Open GitHub issues / community page. */
    openIssues() {
        window.electronAPI?.openExternal?.('https://github.com/Therp/odoo-timer/issues');
    }

    async exportConfig() {
        const result = await window.electronAPI?.config?.export?.();
        if (!result) { await notify('Export not available.'); return; }
        if (result.ok) await notify(`Configuration exported to:\n${result.path}`);
        else if (result.reason !== 'cancelled') await notify(`Export failed: ${result.reason}`);
    }

    async importConfig() {
        const result = await window.electronAPI?.config?.import?.();
        if (!result) { await notify('Import not available.'); return; }
        if (result.ok) {
            await notify('Configuration imported successfully. Some settings take effect after restart.');
            await this.loadRemotes();
        } else if (result.reason !== 'cancelled') {
            await notify(`Import failed: ${result.reason}`);
        }
    }

    get PAGE_ABOUT()          { return PAGE_ABOUT; }
    get PAGE_OPTIONS()        { return PAGE_OPTIONS; }
    get PAGE_STORAGE()        { return PAGE_STORAGE; }
    get PAGE_SECURITY()       { return PAGE_SECURITY; }
    get PAGE_HELP()           { return PAGE_HELP; }
    get DEFAULT_DATA_SOURCE() { return DEFAULT_DATA_SOURCE; }
}

// ─── Mount ────────────────────────────────────────────────────────────────────

// Use the compiled XML templates from templates.js (loaded by options_main_page.html).
// options_app.xml + readmore.xml → compiled into globalThis.__THERP_TIMER_TEMPLATES__
const compiledTemplates = globalThis.__THERP_TIMER_TEMPLATES__ || {};
const templates = {
    ReadMore:   compiledTemplates.ReadMore || createReadMoreTemplate,
    OptionsApp: compiledTemplates.OptionsApp,
};
try {
    if (!templates.OptionsApp) throw new Error('OptionsApp template missing — run: bash scripts/compile-templates.sh');
    mount(OptionsApp, document.getElementById('app'), { dev: false, templates });
} catch (err) {
    console.error('[OptionsApp] Mount failed:', err);
    const appRoot = document.getElementById('app');
    if (appRoot) {
        appRoot.innerHTML = `<div class="container no-remotes-set"><div class="alert alert-danger"><b>Startup error:</b> ${String(err?.message || err).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>`;
    }
}
