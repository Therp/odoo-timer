'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage,
        shell, dialog, Notification, desktopCapturer } = require('electron');
const path = require('path');
const fs   = require('fs');
const Store = require('electron-store');

const store = new Store({ name: 'odoo-timer-data' });

// Suppress harmless Electron internal ServiceWorker storage log noise
// that appears when loading file:// URLs.
app.commandLine.appendSwitch('disable-databases');
app.commandLine.appendSwitch('disable-background-networking');

// ─── Icon paths (idle = pale, active = coloured blue T) ───────────────────────
const ICON_IDLE   = path.join(__dirname, 'renderer', 'img', 'inactive_16.png');
const ICON_ACTIVE = path.join(__dirname, 'renderer', 'img', 'icon_16.png');
const ICON_APP    = path.join(__dirname, 'renderer', 'img', 'icon_48.png');

// ─── State ───────────────────────────────────────────────────────────────────
let mainWindow     = null;
let messagesWindow = null;
let tray           = null;
let timerActive    = false;
let currentTask    = '';
let isQuitting     = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PRELOAD = path.join(__dirname, 'preload.js');
const RENDERER = (page) => path.join(__dirname, 'renderer', page);

function makeWindow(opts) {
  const win = new BrowserWindow({
    backgroundColor: '#EEF2F7',
    show: false,
    icon: ICON_APP,
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
      e.preventDefault();
      mainWindow.hide();
      if (tray && !mainWindow._hintShown) {
        mainWindow._hintShown = true;
        try {
          tray.displayBalloon({ iconType: 'info', title: 'Therp Timer',
            content: 'Still running in background. Right-click tray to quit.' });
        } catch (_) {}
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

// ─── Tray ─────────────────────────────────────────────────────────────────────
function showWindow(which) {
  if (which === 'messages') { createMessagesWindow(); return; }
  if (which === 'options') {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); mainWindow.loadFile(RENDERER('options_main_page.html')); }
    else { createMainWindow(); }
    return;
  }
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  else createMainWindow();
}

function updateTray() {
  if (!tray) return;
  try { tray.setImage(nativeImage.createFromPath(timerActive ? ICON_ACTIVE : ICON_IDLE)); } catch (_) {}
  tray.setToolTip(timerActive && currentTask ? `\u23F1 ${currentTask}` : 'Therp Timer — idle');

  const stateLabel = timerActive
    ? `\u23F1  ${currentTask || 'Timer running\u2026'}`
    : '\u25CB  No timer active';

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: stateLabel, enabled: false },
    { type: 'separator' },
    { label: '\uD83D\uDD16  Timer',    click: () => showWindow('timer') },
    { label: '\uD83D\uDCAC  Messages', click: () => showWindow('messages') },
    { label: '\u2699\uFE0F  Options',  click: () => showWindow('options') },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]));
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON_IDLE));
  tray.setToolTip('Therp Timer');
  tray.on('click', () => showWindow('timer'));
  tray.on('double-click', () => showWindow('timer'));
  updateTray();
}

// ─── IPC: Storage ────────────────────────────────────────────────────────────
ipcMain.handle('storage:get', (_e, k, fb = null) => { try { const v = store.get(k, fb); return v !== undefined ? v : fb; } catch { return fb; } });
ipcMain.handle('storage:set', (_e, k, v) => { try { store.set(k, v); return true; } catch { return false; } });
ipcMain.handle('storage:remove', (_e, k) => { try { store.delete(k); return true; } catch { return false; } });
ipcMain.handle('storage:clear', () => { try { store.clear(); return true; } catch { return false; } });

// ─── IPC: Cookies ────────────────────────────────────────────────────────────
ipcMain.handle('cookies:clear', async (_e, host) => {
  if (!host) return false;
  try {
    const ses = require('electron').session.defaultSession;
    const cs = await ses.cookies.get({ url: host, name: 'session_id' });
    for (const c of cs) await ses.cookies.remove(host, c.name);
    return true;
  } catch { return false; }
});

// ─── IPC: Timer state ────────────────────────────────────────────────────────
ipcMain.handle('timer:setState', (_e, active, taskName) => {
  timerActive = !!active;
  currentTask = active ? String(taskName || '') : '';
  updateTray();
  return true;
});

// ─── IPC: Windows ────────────────────────────────────────────────────────────
ipcMain.handle('messages:open', () => createMessagesWindow());
ipcMain.handle('shell:openExternal', (_e, url) => shell.openExternal(url));

// ─── IPC: Notifications ──────────────────────────────────────────────────────
ipcMain.handle('notification:show', (_e, title, body) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => createMessagesWindow());
  n.show();
  return true;
});

// ─── IPC: File picker ────────────────────────────────────────────────────────
ipcMain.handle('file:pick', async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (!filePaths[0]) return null;
  const filePath = filePaths[0];
  const data = fs.readFileSync(filePath);
  return { name: path.basename(filePath), base64: data.toString('base64') };
});

// ─── IPC: Screen recorder ────────────────────────────────────────────────────
ipcMain.handle('recorder:getSources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
  return sources.map(s => ({ id: s.id, name: s.name }));
});

ipcMain.handle('recorder:save', async (_e, dataArr, filename) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: filename || `recording-${Date.now()}.webm`,
    filters: [{ name: 'Video', extensions: ['webm'] }],
  });
  if (!filePath) return null;
  fs.writeFileSync(filePath, Buffer.from(dataArr));
  return filePath;
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
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
