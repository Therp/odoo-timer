'use strict';
/**
 * main.js — Therp Timer Electron main process.
 * Manages all BrowserWindow instances, system tray, IPC handlers and lifecycle.
 */

const {
  app, BrowserWindow, ipcMain, Tray, Menu, nativeImage,
  shell, dialog, Notification, desktopCapturer, screen,
} = require('electron');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const Store = require('electron-store');

// ─── Single-instance lock ─────────────────────────────────────────
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) { app.quit(); process.exit(0); }
app.on('second-instance', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });

// ─── Persistent store ─────────────────────────────────────────────────────────
const store = new Store({ name: 'odoo-timer-data' });

// ─── Chromium switches ────────────────────────────────────────────────────────
app.commandLine.appendSwitch('disable-databases');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-dev-shm-usage');
// Linux AppImage SUID sandbox workaround
if (process.platform === 'linux') {
  // Sandbox workaround for AppImage / namespaced /tmp environments.
  // Fixes "Unable to access /tmp" errors when opening DevTools.
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// ─── In-memory log ring buffer ─────────────────────────────────────
const _appLogs = [];
const MAX_LOGS = 500;
function _addLog(level, msg) {
  _appLogs.push({ ts: new Date().toISOString(), level, msg: String(msg) });
  if (_appLogs.length > MAX_LOGS) _appLogs.shift();
}
// Capture console output into ring buffer
['log','info','warn','error','debug'].forEach((m) => {
  const orig = console[m].bind(console);
  console[m] = (...a) => {
    const lvl = m === 'log' ? 'info' : m;
    _addLog(lvl, a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' '));
    orig(...a);
  };
});

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICON_IDLE   = path.join(__dirname, 'renderer', 'img', 'inactive_16.png');
const ICON_ACTIVE = path.join(__dirname, 'renderer', 'img', 'icon_16.png');
const ICON_APP    = path.join(__dirname, 'renderer', 'img', 'icon_48.png');

// ─── App state ────────────────────────────────────────────────────────────────
let mainWindow       = null;
let messagesWindow   = null;
let recorderWindow   = null;
let overlayWindow    = null;
let timesheetsWindow = null;
let logsWindow       = null;
let tray             = null;
let timerActive      = false;
let currentTask      = '';
let isQuitting       = false;
let recState         = { active: false, mode: null };

const PRELOAD  = path.join(__dirname, 'preload.js');
const RENDERER = (p) => path.join(__dirname, 'renderer', p);

// ─── Window factory ───────────────────────────────────────────────────────────
function makeWindow(opts) {
  const win = new BrowserWindow({
    backgroundColor: '#EEF2F7', show: false, icon: ICON_APP,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: false },
    ...opts,
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  return win;
}

// ─── Main window ──────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = makeWindow({ width: 1020, height: 860, minWidth: 980, minHeight: 700, title: 'Therp Timer' });
  mainWindow.loadFile(RENDERER('popup.html'));
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault(); mainWindow.hide();
      if (tray && !mainWindow._hintShown) {
        mainWindow._hintShown = true;
        try { tray.displayBalloon({ iconType: 'info', title: 'Therp Timer', content: 'Still running in background. Right-click tray to quit.' }); } catch (_) {}
      }
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Messages window ──────────────────────────────────────────────────────────
function createMessagesWindow() {
  if (messagesWindow) { messagesWindow.show(); messagesWindow.focus(); return; }
  messagesWindow = makeWindow({ width: 1200, height: 780, minWidth: 900, minHeight: 600, title: 'Therp Timer — Messages' });
  messagesWindow.loadFile(RENDERER('messages.html'));
  messagesWindow.on('closed', () => { messagesWindow = null; });
}

// ─── Recorder window ──────────────────────────────────────────────────────────
function createRecorderWindow() {
  if (recorderWindow) { recorderWindow.show(); recorderWindow.focus(); return; }
  recorderWindow = makeWindow({
    width: 410, height: 620, resizable: false, minimizable: false, maximizable: false,
    alwaysOnTop: true, title: 'Therp Timer — Recorder',
  });
  recorderWindow.loadFile(RENDERER('recorder.html'));
  recorderWindow.on('closed', () => { recorderWindow = null; });
}

// ─── Timesheets window ─────────────────────────────────────────────
function createTimesheetsWindow(taskId, taskName) {
  if (timesheetsWindow) {
    timesheetsWindow.show(); timesheetsWindow.focus();
    timesheetsWindow.webContents.send('timesheets:task', { taskId, taskName });
    return;
  }
  timesheetsWindow = makeWindow({
    width: 960, height: 640, minWidth: 700, minHeight: 500,
    title: 'Therp Timer — Task Timesheets',
  });
  timesheetsWindow.loadFile(RENDERER('timesheets.html'));
  timesheetsWindow.webContents.on('did-finish-load', () => {
    timesheetsWindow.webContents.send('timesheets:task', { taskId, taskName });
  });
  timesheetsWindow.on('closed', () => { timesheetsWindow = null; });
}

// ─── Logs window ────────────────────────────────────────────────────
function createLogsWindow() {
  if (logsWindow) { logsWindow.show(); logsWindow.focus(); return; }
  logsWindow = makeWindow({ width: 900, height: 600, minWidth: 700, minHeight: 400, title: 'Therp Timer — Logs' });
  logsWindow.loadFile(RENDERER('logs.html'));
  logsWindow.on('closed', () => { logsWindow = null; });
}

// ─── Region overlay ───────────────────────────────────────────────────────────
function createOverlay() {
  return new Promise((resolve) => {
    const { width, height } = screen.getPrimaryDisplay().bounds;
    overlayWindow = new BrowserWindow({
      x: 0, y: 0, width, height,
      transparent: true, frame: false, alwaysOnTop: true, fullscreen: false,
      skipTaskbar: true, hasShadow: false,
      webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: false },
    });
    overlayWindow.loadFile(RENDERER('recorder-overlay.html'));
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.on('closed', () => { overlayWindow = null; resolve(null); });
    ipcMain.once('overlay:confirm', (_, region) => {
      if (overlayWindow) { overlayWindow.close(); overlayWindow = null; }
      resolve(region);
    });
    ipcMain.once('overlay:cancel', () => {
      if (overlayWindow) { overlayWindow.close(); overlayWindow = null; }
      resolve(null);
    });
  });
}

// ─── Quick screenshot from tray ─────────────────────────────────────
async function takeQuickScreenshot() {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    const src = sources.find((s) => s.name === 'Entire Screen' || s.name.startsWith('Screen ')) || sources[0];
    if (!src?.thumbnail) throw new Error('No screen source found.');
    const ts       = new Date().toISOString().replace(/[T:.]/g, '-').slice(0, 19);
    const filename = `screenshot-${ts}.png`;
    const folder   = store.get('prefs:screenshotFolder', '') || null;
    let savePath;
    if (folder) {
      savePath = path.join(folder, filename);
    } else {
      const res = await dialog.showSaveDialog({
        title: 'Save Screenshot', defaultPath: path.join(os.homedir(), 'Pictures', filename),
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });
      savePath = res.filePath || null;
    }
    if (!savePath) return;
    fs.writeFileSync(savePath, src.thumbnail.toPNG());
    if (Notification.isSupported()) new Notification({ title: 'Therp Timer', body: `Screenshot saved: ${savePath}` }).show();
  } catch (err) {
    console.error('Quick screenshot failed:', err.message);
    if (Notification.isSupported()) new Notification({ title: 'Therp Timer — Error', body: `Screenshot failed: ${err.message}` }).show();
  }
}

// ─── Window routing ───────────────────────────────────────────────────────────
function showWindow(which) {
  if (which === 'messages') { createMessagesWindow(); return; }
  if (which === 'recorder') { createRecorderWindow(); return; }
  if (which === 'logs')     { createLogsWindow();     return; }
  if (which === 'options') {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); mainWindow.loadFile(RENDERER('options_main_page.html')); }
    else createMainWindow();
    return;
  }
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  else createMainWindow();
}

// ─── Tray ──────────────────────────────────────────────────────────
function updateTray() {
  if (!tray) return;
  const icon = (recState.active || timerActive) ? ICON_ACTIVE : ICON_IDLE;
  try { tray.setImage(nativeImage.createFromPath(icon)); } catch (_) {}
  const timerLabel = timerActive && currentTask ? `\u23F1 ${currentTask}` : 'Therp Timer — idle';
  tray.setToolTip(recState.active ? `\u25CF Recording ${recState.mode || ''}…` : timerLabel);
  const timerStatus = timerActive ? `\u23F1  ${currentTask || 'Timer running\u2026'}` : '\u25CB  No timer active';
  const recLabel    = recState.active ? `\u25A0 Stop Recording (${recState.mode || 'active'})` : '\u25C9 Record';
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: timerStatus, enabled: false },
    { type: 'separator' },
    { label: '\u23F1 Timer',           click: () => showWindow('timer') },
    { label: '\u2709\uFE0F Messages',  click: () => showWindow('messages') },
    { label: recLabel,                 click: () => showWindow('recorder') },
    { label: '\uD83D\uDCF7 Screenshot', click: () => takeQuickScreenshot() },
    { type: 'separator' },
    { label: '\u2699\uFE0F Options',   click: () => showWindow('options') },
    { label: '\uD83D\uDCCB Logs',      click: () => showWindow('logs') },
    { type: 'separator' },
    { label: '\u2716\uFE0F Quit', click: () => { isQuitting = true; app.quit(); } },
  ]));
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON_IDLE));
  tray.setToolTip('Therp Timer');
  tray.on('click',        () => showWindow('timer'));
  tray.on('double-click', () => showWindow('timer'));
  updateTray();
}

// ─── Application menu ────────────────────────────────────────────────────────
/**
 * Build and set the native application menu.
 * Adds "Back to Timer" in the Window menu and full Help links.
 */
function buildAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS app menu (File on other platforms)
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        {
          label: 'Back to Timer',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => showWindow('timer'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: (_item, win) => { if (win) win.webContents.toggleDevTools(); },
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      role: 'windowMenu',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        {
          label: 'Timer',
          accelerator: 'CmdOrCtrl+1',
          click: () => showWindow('timer'),
        },
        {
          label: 'Messages',
          accelerator: 'CmdOrCtrl+2',
          click: () => showWindow('messages'),
        },
        {
          label: 'Recorder',
          accelerator: 'CmdOrCtrl+3',
          click: () => showWindow('recorder'),
        },
        {
          label: 'Options',
          accelerator: 'CmdOrCtrl+,',
          click: () => showWindow('options'),
        },
        { type: 'separator' },
        ...(isMac ? [{ role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'README & Documentation',
          click: () => shell.openExternal('https://github.com/Therp/odoo-timer/blob/master/README.md'),
        },
        {
          label: 'Report an Issue',
          click: () => shell.openExternal('https://github.com/Therp/odoo-timer/issues/new'),
        },
        {
          label: 'Community Discussions',
          click: () => shell.openExternal('https://github.com/Therp/odoo-timer/issues'),
        },
        { type: 'separator' },
        {
          label: 'In-App Help Guide',
          click: () => {
            showWindow('options');
            // Brief delay so the window loads before sending navigation
            setTimeout(() => {
              if (mainWindow) {
                mainWindow.webContents.executeJavaScript(
                  'if(window.__owl_app__) { /* navigate to help page */ }'
                ).catch(() => {});
              }
            }, 500);
          },
        },
        { type: 'separator' },
        {
          label: 'View Logs',
          click: () => showWindow('logs'),
        },
        ...(!isMac ? [
          { type: 'separator' },
          { role: 'about' },
        ] : []),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── IPC: Storage ─────────────────────────────────────────────────────────────
ipcMain.handle('storage:get',    (_e,k,fb=null) => { try { const v=store.get(k,fb); return v!==undefined?v:fb; } catch { return fb; } });
ipcMain.handle('storage:set',    (_e,k,v)       => { try { store.set(k,v); return true; } catch { return false; } });
ipcMain.handle('storage:remove', (_e,k)         => { try { store.delete(k); return true; } catch { return false; } });
ipcMain.handle('storage:clear',  ()             => { try { store.clear(); return true; } catch { return false; } });

// ─── IPC: Preferences (namespaced) ───────────────────────────────────────────
ipcMain.handle('prefs:get',    (_e,k,fb=null) => { try { return store.get(`prefs:${k}`, fb) ?? fb; } catch { return fb; } });
ipcMain.handle('prefs:set',    (_e,k,v)       => { try { store.set(`prefs:${k}`, v); return true; } catch { return false; } });
ipcMain.handle('prefs:getAll', () => {
  try {
    const all = store.store; const prefs = {};
    Object.keys(all).filter((k) => k.startsWith('prefs:')).forEach((k) => { prefs[k.slice(6)] = all[k]; });
    return prefs;
  } catch { return {}; }
});

// ─── IPC: Config backup/restore ────────────────────────────────────
ipcMain.handle('config:export', async () => {
  try {
    const data = JSON.stringify(store.store, null, 2);
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Therp Timer Configuration',
      defaultPath: path.join(os.homedir(), `therp-timer-backup-${Date.now()}.json`),
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    });
    if (!filePath) return { ok: false, reason: 'cancelled' };
    fs.writeFileSync(filePath, data, 'utf8');
    return { ok: true, path: filePath };
  } catch (err) { return { ok: false, reason: err.message }; }
});
ipcMain.handle('config:import', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Therp Timer Configuration',
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (!filePaths?.[0]) return { ok: false, reason: 'cancelled' };
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    Object.entries(data).forEach(([k, v]) => { try { store.set(k, v); } catch (_) {} });
    return { ok: true };
  } catch (err) { return { ok: false, reason: err.message }; }
});

// ─── IPC: Logs ─────────────────────────────────────────────────────
ipcMain.handle('logs:get',         () => [..._appLogs]);
ipcMain.handle('logs:clear',       () => { _appLogs.length = 0; return true; });
ipcMain.handle('logs:append',      (_e, level, msg) => { _addLog(level, msg); return true; });
ipcMain.handle('logs:window:open', () => { createLogsWindow(); return true; });

// ─── IPC: Cookies ─────────────────────────────────────────────────────────────
ipcMain.handle('cookies:clear', async (_e, host) => {
  if (!host) return false;
  try {
    const ses = require('electron').session.defaultSession;
    const cs  = await ses.cookies.get({ url: host, name: 'session_id' });
    for (const c of cs) await ses.cookies.remove(host, c.name);
    return true;
  } catch { return false; }
});

// ─── IPC: Timer state ─────────────────────────────────────────────────────────
ipcMain.handle('timer:setState', (_e, active, taskName) => {
  timerActive = !!active; currentTask = active ? String(taskName || '') : '';
  updateTray(); return true;
});

// ─── IPC: Windows ─────────────────────────────────────────────────────────────
ipcMain.handle('messages:open',    () => { createMessagesWindow(); return true; });
ipcMain.handle('timesheets:open',  (_e, taskId, taskName) => { createTimesheetsWindow(taskId, taskName); return true; });
ipcMain.handle('shell:openExternal', (_e, url) => shell.openExternal(url));

// ─── IPC: Notifications ───────────────────────────────────────────────────────
ipcMain.handle('notification:show', (_e, title, body) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => createMessagesWindow()); n.show(); return true;
});

// ─── IPC: File picker ─────────────────────────────────────────────────────────
ipcMain.handle('file:pick', async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (!filePaths[0]) return null;
  const data = fs.readFileSync(filePaths[0]);
  return { name: path.basename(filePaths[0]), base64: data.toString('base64') };
});

// ─── IPC: Recorder ────────────────────────────────────────────────────────────
ipcMain.handle('recorder:open', () => { createRecorderWindow(); return true; });
ipcMain.handle('recorder:getSources', async (_e, opts = {}) => {
  const thumbnailSize = opts.thumbnail ? { width: 1920, height: 1080 } : { width: 0, height: 0 };
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize, fetchWindowIcons: true });
  return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: opts.thumbnail ? s.thumbnail.toPNG().toString('base64') : null }));
});
ipcMain.handle('recorder:pickRegion',  async () => createOverlay());
ipcMain.handle('overlay:confirm', (_, region) => { ipcMain.emit('overlay:confirm', null, region); });
ipcMain.handle('overlay:cancel',  ()           => { ipcMain.emit('overlay:cancel'); });
ipcMain.handle('recorder:pickFolder', async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Choose save folder' });
  return filePaths[0] || null;
});
ipcMain.handle('recorder:saveFile', async (_e, dataArr, filename, ext, folder) => {
  const defaultName = filename || `therp-capture-${Date.now()}.${ext || 'bin'}`;
  const useFolder   = folder || (ext === 'png' && store.get('prefs:screenshotFolder', '')) || (ext !== 'png' && store.get('prefs:videoFolder', '')) || null;
  const defaultPath = useFolder ? path.join(useFolder, defaultName) : path.join(os.homedir(), 'Pictures', defaultName);
  const filterMap   = { webm:[{name:'WebM Video',extensions:['webm']}], mp4:[{name:'MP4 Video',extensions:['mp4']}], mkv:[{name:'MKV Video',extensions:['mkv']}], gif:[{name:'Animated GIF',extensions:['gif']}], png:[{name:'PNG Image',extensions:['png']}] };
  // If a folder preference is set, skip dialog and save directly
  if (useFolder) {
    fs.mkdirSync(useFolder, { recursive: true });
    fs.writeFileSync(defaultPath, Buffer.from(dataArr));
    return defaultPath;
  }
  const { filePath } = await dialog.showSaveDialog({ title: 'Save Recording', defaultPath, filters: filterMap[ext] || [{ name: 'All Files', extensions: ['*'] }] });
  if (!filePath) return null;
  fs.writeFileSync(filePath, Buffer.from(dataArr));
  return filePath;
});
ipcMain.handle('recorder:setState', (_e, active, mode) => {
  recState = { active: !!active, mode: mode || null }; updateTray(); return true;
});
ipcMain.handle('recorder:notify', (_e, msg, type) => {
  if (!Notification.isSupported()) return;
  const titles = { success: 'Therp Timer', error: 'Therp Timer — Error', info: 'Therp Timer' };
  const n = new Notification({ title: titles[type] || 'Therp Timer', body: msg, silent: type === 'info' });
  n.on('click', () => { if (recorderWindow) { recorderWindow.show(); recorderWindow.focus(); } }); n.show();
});
// Legacy compat
ipcMain.handle('recorder:save', async (_e, dataArr, filename) => {
  const { filePath } = await dialog.showSaveDialog({ defaultPath: filename || `recording-${Date.now()}.webm`, filters: [{ name: 'Video', extensions: ['webm'] }] });
  if (!filePath) return null;
  fs.writeFileSync(filePath, Buffer.from(dataArr)); return filePath;
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  buildAppMenu();
  createMainWindow();
  try { createTray(); } catch (e) { console.warn('Tray unavailable:', e.message); }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else if (mainWindow) mainWindow.show();
  });
});
app.on('window-all-closed', (e) => { if (!isQuitting) e.preventDefault(); else if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { isQuitting = true; if (tray) { tray.destroy(); tray = null; } });
