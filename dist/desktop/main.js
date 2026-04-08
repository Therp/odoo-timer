'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage,
        shell, dialog, Notification, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');
const Store = require('electron-store');

const store = new Store({ name: 'odoo-timer-data' });

app.commandLine.appendSwitch('disable-databases');
app.commandLine.appendSwitch('disable-background-networking');

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICON_IDLE     = path.join(__dirname, 'renderer', 'img', 'inactive_16.png');
const ICON_ACTIVE   = path.join(__dirname, 'renderer', 'img', 'icon_16.png');
const ICON_APP      = path.join(__dirname, 'renderer', 'img', 'icon_48.png');

// ─── App state ────────────────────────────────────────────────────────────────
let mainWindow     = null;
let messagesWindow = null;
let recorderWindow = null;
let overlayWindow  = null;
let tray           = null;
let timerActive    = false;
let currentTask    = '';
let isQuitting     = false;
let recState = { active: false, mode: null }; // 'video'|'gif'|'screenshot'

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
    width: 380, height: 500, resizable: false,
    minimizable: false, maximizable: false,
    alwaysOnTop: true,
    title: 'Therp Timer — Recorder',
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  recorderWindow.loadFile(RENDERER('recorder.html'));
  recorderWindow.on('closed', () => { recorderWindow = null; });
}

// ─── Region picker overlay ─────────────────────────────────────────────────────
function createOverlay() {
  return new Promise((resolve) => {
    const { width, height } = screen.getPrimaryDisplay().bounds;
    overlayWindow = new BrowserWindow({
      x: 0, y: 0, width, height,
      transparent: true, frame: false,
      alwaysOnTop: true, fullscreen: false,
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

// ─── Tray ─────────────────────────────────────────────────────────────────────
function showWindow(which) {
  if (which === 'messages') { createMessagesWindow(); return; }
  if (which === 'recorder') { createRecorderWindow(); return; }
  if (which === 'options') {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); mainWindow.loadFile(RENDERER('options_main_page.html')); }
    else createMainWindow();
    return;
  }
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  else createMainWindow();
}

function updateTray() {
  if (!tray) return;
  const icon = timerActive ? ICON_ACTIVE : ICON_IDLE;
  try { tray.setImage(nativeImage.createFromPath(icon)); } catch (_) {}

  const timerLabel = timerActive && currentTask ? `\u23F1 ${currentTask}` : 'Therp Timer — idle';
  tray.setToolTip(recState.active ? `\u25CF Recording ${recState.mode || ''}…` : timerLabel);

  const timerStatus = timerActive
    ? `\u23F1  ${currentTask || 'Timer running\u2026'}`
    : '\u25CB  No timer active';

  const recLabel = recState.active
    ? `■ Stop Recording (${recState.mode || 'active'})`
    : '◉ Record';

  const recTooltip = recState.active ? 'Recording in progress — click to open recorder' : 'Open recorder';

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: timerStatus, enabled: false },
    { type: 'separator' },
    { type: 'separator' },
    // NB: investigate in different Linux Distros
    // Icons don't show using code, I had to use generate txt icon
    // { label: '\uD83D\uDD16  Timer',    click: () => showWindow('timer') },
    // { label: '\uD83D\uDCAC  Messages', click: () => showWindow('messages') },

    { label: '⏱ Timer',    click: () => showWindow('timer') },
    { label: '✉️ Messages', click: () => showWindow('messages') },
    { label: recLabel,                 click: () => showWindow('recorder'), toolTip: recTooltip },
    { type: 'separator' },
    { type: 'separator' },
    { label: '\u2699\uFE0F Options',  click: () => showWindow('options') },
    { label: '✖️ Quit', click: () => { isQuitting = true; app.quit(); } },
  ]));
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON_IDLE));
  tray.setToolTip('Therp Timer');
  tray.on('click', () => showWindow('timer'));
  tray.on('double-click', () => showWindow('timer'));
  updateTray();
}

// ─── IPC: Storage ─────────────────────────────────────────────────────────────
ipcMain.handle('storage:get',    (_e,k,fb=null) => { try { const v=store.get(k,fb); return v!==undefined?v:fb; } catch { return fb; } });
ipcMain.handle('storage:set',    (_e,k,v)       => { try { store.set(k,v); return true; } catch { return false; } });
ipcMain.handle('storage:remove', (_e,k)         => { try { store.delete(k); return true; } catch { return false; } });
ipcMain.handle('storage:clear',  ()              => { try { store.clear();  return true; } catch { return false; } });

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
  timerActive = !!active;
  currentTask = active ? String(taskName || '') : '';
  updateTray(); return true;
});

// ─── IPC: Windows ─────────────────────────────────────────────────────────────
ipcMain.handle('messages:open', () => createMessagesWindow());
ipcMain.handle('shell:openExternal', (_e, url) => shell.openExternal(url));

// ─── IPC: Notifications ───────────────────────────────────────────────────────
ipcMain.handle('notification:show', (_e, title, body) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => createMessagesWindow());
  n.show(); return true;
});

// ─── IPC: File picker (for message attachments) ───────────────────────────────
ipcMain.handle('file:pick', async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (!filePaths[0]) return null;
  const data = fs.readFileSync(filePaths[0]);
  return { name: path.basename(filePaths[0]), base64: data.toString('base64') };
});

// ─── IPC: Recorder ────────────────────────────────────────────────────────────
ipcMain.handle('recorder:open', () => { createRecorderWindow(); return true; });

ipcMain.handle('recorder:getSources', async (_e, opts = {}) => {
  const thumbnailSize = opts.thumbnail
    ? { width: 1920, height: 1080 }
    : { width: 0, height: 0 };
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize,
    fetchWindowIcons: true,
  });
  return sources.map(s => ({
    id:        s.id,
    name:      s.name,
    thumbnail: opts.thumbnail ? s.thumbnail.toPNG().toString('base64') : null,
  }));
});

ipcMain.handle('recorder:pickRegion', async () => { return createOverlay(); });

// Overlay events (from recorder-overlay.html preload)
ipcMain.handle('overlay:confirm', (_, region) => {
  ipcMain.emit('overlay:confirm', null, region);
});
ipcMain.handle('overlay:cancel', () => {
  ipcMain.emit('overlay:cancel');
});

ipcMain.handle('recorder:pickFolder', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose save folder',
  });
  return filePaths[0] || null;
});

ipcMain.handle('recorder:saveFile', async (_e, dataArr, filename, ext, folder) => {
  const defaultName = filename || `therp-capture-${Date.now()}.${ext || 'bin'}`;
  const defaultPath = folder
    ? path.join(folder, defaultName)
    : path.join(os.homedir(), 'Pictures', defaultName);

  const filters = {
    webm: [{ name: 'Video', extensions: ['webm'] }],
    gif:  [{ name: 'Animated GIF', extensions: ['gif'] }],
    png:  [{ name: 'PNG Image',    extensions: ['png'] }],
  };

  const { filePath } = await dialog.showSaveDialog({
    title:       'Save recording',
    defaultPath,
    filters:     filters[ext] || [{ name: 'All Files', extensions: ['*'] }],
  });
  if (!filePath) return null;
  fs.writeFileSync(filePath, Buffer.from(dataArr));
  return filePath;
});

ipcMain.handle('recorder:setState', (_e, active, mode) => {
  recState = { active: !!active, mode: mode || null };
  updateTray(); return true;
});

ipcMain.handle('recorder:notify', (_e, msg, type) => {
  if (!Notification.isSupported()) return;
  const titles = { success: 'Therp Timer', error: 'Therp Timer — Error', info: 'Therp Timer' };
  const n = new Notification({
    title: titles[type] || 'Therp Timer',
    body:  msg,
    silent: type === 'info',
  });
  n.on('click', () => { if (recorderWindow) { recorderWindow.show(); recorderWindow.focus(); } });
  n.show();
});

// Legacy compat (used by existing code)
ipcMain.handle('recorder:save', async (_e, dataArr, filename) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: filename || `recording-${Date.now()}.webm`,
    filters: [{ name: 'Video', extensions: ['webm'] }],
  });
  if (!filePath) return null;
  fs.writeFileSync(filePath, Buffer.from(dataArr));
  return filePath;
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createMainWindow();
  try { createTray(); } catch (e) { console.warn('Tray unavailable:', e.message); }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on('window-all-closed', (e) => {
  if (!isQuitting) e.preventDefault();
  else if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (tray) { tray.destroy(); tray = null; }
});
