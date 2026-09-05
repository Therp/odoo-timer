import {
    readRemotes,
    writeRemotes,
    validURL,
    normalizeHost,
    remoteIdentity,
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
const DEFAULT_LOGO_SRC = 'img/logo.png';
const MAX_REMOTE_LOGO_BYTES = 512 * 1024;
const ALLOWED_REMOTE_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

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
                remote_logo:          '',
            },
        });
        onWillStart(async () => {
            await this.loadRemotes();
            await this.refreshStoragePaths();
        });
    }

    async loadRemotes() { this.state.remotes = await readRemotes(); }


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

    resetRemoteForm() {
        Object.assign(this.state.form, {
            remote_host: '', remote_name: '', remote_database: '',
            remote_odoo_version: '', remote_poll_interval: '60',
            remote_datasrc: DEFAULT_DATA_SOURCE, remote_logo: '',
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
        const candidate = { url: host, database, datasrc };
        if (remotes.some((r) => remoteIdentity(r) === remoteIdentity(candidate))) {
            await notify(this.duplicateRemoteMessage(candidate));
            return;
        }

        remotes.push({
            url: host, name, database, odooVersion: version, pollInterval, datasrc,
            logoDataUrl: this.state.form.remote_logo || '', state: 'Inactive',
        });
        await writeRemotes(remotes);
        await this.loadRemotes();
        this.resetRemoteForm();
        await notify(`Host [${host}] added successfully.`);
    }

    // ── Edit remote via alert.js inline form ──────────────────────────────────
    async editRemote(remote) {
        this.state.error = '';
        const pfx = `therp-edit-${Date.now()}`;

        // THERP UX FIX: build Edit Remote dialog with DOM APIs.
        const dialog = document.createElement('div');
        dialog.style.cssText =
            'min-width:420px;max-width:560px;text-align:left;font-family:Arial,Helvetica,sans-serif;';

        const title = document.createElement('div');
        title.style.cssText =
            'margin-bottom:16px;font-weight:700;font-size:17px;color:#42475a;text-align:center;';
        title.textContent = 'Edit Remote';

        const form = document.createElement('div');
        const style =
            'width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;' +
            'box-sizing:border-box;font-size:14px;';

        const addField = (caption, control) => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:10px;';
            const label = document.createElement('label');
            label.style.cssText = 'display:block;font-size:13px;margin-bottom:4px;color:#555;';
            label.textContent = caption;
            control.style.cssText = style;
            wrap.append(label, control);
            form.appendChild(wrap);
        };

        const nameInput = document.createElement('input');
        nameInput.id = `${pfx}-name`;
        nameInput.value = remote.name || '';
        addField('Display Name', nameInput);

        const hostInput = document.createElement('input');
        hostInput.id = `${pfx}-host`;
        hostInput.value = remote.url || '';
        addField('Odoo Host', hostInput);

        const dbInput = document.createElement('input');
        dbInput.id = `${pfx}-database`;
        dbInput.value = remote.database || '';
        addField('Database', dbInput);

        const versionInput = document.createElement('input');
        versionInput.id = `${pfx}-version`;
        versionInput.value = remote.odooVersion || '';
        versionInput.placeholder = '16.0';
        addField('Odoo Version (e.g. 16.0)', versionInput);

        const sourceSelect = document.createElement('select');
        sourceSelect.id = `${pfx}-datasrc`;
        for (const [value, caption] of [
            ['project.issue', 'From Issues (project.issue)'],
            ['project.task', 'From Tasks (project.task)'],
            ['helpdesk.ticket', 'From Helpdesk Tickets (helpdesk.ticket)'],
        ]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = caption;
            option.selected = (remote.datasrc || 'project.issue') === value;
            sourceSelect.appendChild(option);
        }
        addField('Data Source', sourceSelect);

        dialog.append(title, form);
        const result = await alert.show(dialog, ['Cancel', 'Save'], { accentColor: 'orange' });
        if (result !== 'Save') return;

        const get      = (id) => document.getElementById(id)?.value ?? '';
        const newName  = get(`${pfx}-name`).trim();
        const newHost  = normalizeHost(get(`${pfx}-host`));
        const newDb    = get(`${pfx}-database`).trim();
        const newVer   = get(`${pfx}-version`).trim();
        const newSrc   = get(`${pfx}-datasrc`) || DEFAULT_DATA_SOURCE;
        const logoInput = document.getElementById(`${pfx}-logo`);
        const removeLogo = Boolean(document.getElementById(`${pfx}-remove-logo`)?.checked);
        let newLogo = removeLogo ? '' : (remote.logoDataUrl || '');
        if (!removeLogo && logoInput?.files?.[0]) {
            try { newLogo = await this.readLogoFile(logoInput.files[0]); }
            catch (err) { await notify(err.message || 'Could not use the selected company logo.'); return; }
        }

        if (!this._validate(newHost, newName, newDb)) return;

        const remotes = await readRemotes();
        const originalKey = remoteIdentity(remote);
        const candidate = { url: newHost, database: newDb, datasrc: newSrc };
        const duplicate = remotes.some(
            (r) => remoteIdentity(r) !== originalKey && remoteIdentity(r) === remoteIdentity(candidate)
        );
        if (duplicate) {
            await notify(this.duplicateRemoteMessage(candidate));
            return;
        }

        const index = remotes.findIndex((r) => remoteIdentity(r) === originalKey);
        if (index < 0) { await notify('Remote not found. Refresh the list and try again.'); return; }
        const oldHost = normalizeHost(remotes[index].url || '');
        const oldDb = String(remotes[index].database || '').trim();
        remotes[index] = {
            ...remotes[index], name: newName, url: newHost, database: newDb,
            odooVersion: newVer, datasrc: newSrc, logoDataUrl: newLogo,
        };
        await writeRemotes(remotes);

        if (oldHost !== newHost && !remotes.some((r) => normalizeHost(r.url || '') === oldHost)) {
            await clearOdooSessionCookies(oldHost);
        }
        if (oldDb !== newDb && !remotes.some((r) => String(r.database || '').trim() === oldDb)) {
            await storage.remove(oldDb);
        }
        await this.loadRemotes();
        await notify('Remote updated successfully.');
    }

    async removeRemote(remote) {
        const ok = await confirmDialog(`Remove remote [${remote.url}]?`);
        if (!ok) return;
        const targetKey = remoteIdentity(remote);
        const remotes = (await readRemotes()).filter((r) => remoteIdentity(r) !== targetKey);
        await writeRemotes(remotes);
        if (!remotes.some((r) => normalizeHost(r.url || '') === normalizeHost(remote.url || ''))) {
            await clearOdooSessionCookies(remote.url);
        }
        if (!remotes.some((r) => String(r.database || '').trim() === String(remote.database || '').trim())) {
            await storage.remove(remote.database);
        }
        await this.loadRemotes();
        await notify(`[${remote.url}] removed.`);
    }

    async removeAllRemotes() {
        const ok = await confirmDialog('Remove ALL remotes? This cannot be undone.');
        if (!ok) return;
        const remotes = await readRemotes();
        for (const host of [...new Set(remotes.map((r) => normalizeHost(r.url || '')).filter(Boolean))]) {
            await clearOdooSessionCookies(host);
        }
        for (const database of [...new Set(remotes.map((r) => String(r.database || '').trim()).filter(Boolean))]) {
            await storage.remove(database);
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
