'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// ─── Persistent store ──────────────────────────────────────────────────────
const store = new Store({ name: 'odoo-timer-data' });

// ─── Icon paths ─────────────────────────────────────────────────────────────
const ICON_NORMAL = path.join(__dirname, 'renderer', 'img', 'inactive_19.png');
const ICON_ACTIVE = path.join(__dirname, 'renderer', 'img', 'icon_19.png');
const ICON_APP    = path.join(__dirname, 'renderer', 'img', 'icon_48.png');

// ─── App state ──────────────────────────────────────────────────────────────
let mainWindow  = null;
let tray        = null;
let timerActive = false;
let currentTask = '';
let isQuitting  = false;

// ─── Window ─────────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1160, height: 900, minWidth: 980, minHeight: 760,
    title: 'Therp Timer', icon: ICON_APP,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#EEF2F7',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'popup.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Hide to tray instead of quitting on window close
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (tray && !mainWindow._hintShown) {
        mainWindow._hintShown = true;
        try {
          tray.displayBalloon({
            iconType: 'info',
            title: 'Therp Timer',
            content: 'Therp Timer is still running in the background. Right-click the tray icon to quit.',
          });
        } catch (_) {}   // displayBalloon is Windows-only
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── Tray ────────────────────────────────────────────────────────────────────
function showWindow() {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  else createMainWindow();
}

function updateTray() {
  if (!tray) return;

  try { tray.setImage(nativeImage.createFromPath(timerActive ? ICON_ACTIVE : ICON_NORMAL)); } catch (_) {}

  const tooltip = timerActive && currentTask ? `Therp Timer\nActive timer: ${currentTask}` : 'Therp Timer';
  tray.setToolTip(tooltip);

  const stateLabel = timerActive
    ? `\u23F1  ${currentTask || 'Timer running\u2026'}`
    : '\u25CB  No timer active';

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: stateLabel, enabled: false },
    { type: 'separator' },
    { label: 'Open Therp Timer', click: showWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]));
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON_NORMAL));
  tray.setToolTip('Therp Timer');
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
  updateTray();
}

// ─── IPC: Storage ────────────────────────────────────────────────────────────
ipcMain.handle('storage:get', (_e, key, fallback = null) => {
  try { const v = store.get(key, fallback); return v !== undefined ? v : fallback; }
  catch { return fallback; }
});
ipcMain.handle('storage:set', (_e, key, value) => {
  try { store.set(key, value); return true; } catch { return false; }
});
ipcMain.handle('storage:remove', (_e, key) => {
  try { store.delete(key); return true; } catch { return false; }
});
ipcMain.handle('storage:clear', () => {
  try { store.clear(); return true; } catch { return false; }
});

// ─── IPC: Cookies ────────────────────────────────────────────────────────────
ipcMain.handle('cookies:clear', async (_e, host) => {
  if (!host) return false;
  try {
    const ses = require('electron').session.defaultSession;
    const cookies = await ses.cookies.get({ url: host, name: 'session_id' });
    for (const c of cookies) await ses.cookies.remove(host, c.name);
    return true;
  } catch { return false; }
});

// ─── IPC: Timer state (icon + tooltip) ───────────────────────────────────────
ipcMain.handle('timer:setState', (_e, isActive, taskName) => {
  timerActive = !!isActive;
  currentTask = isActive ? String(taskName || '') : '';
  updateTray();
  return true;
});

// ─── IPC: Shell ──────────────────────────────────────────────────────────────
ipcMain.handle('shell:openExternal', (_e, url) => shell.openExternal(url));

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createMainWindow();
  try { createTray(); } catch (e) { console.warn('Tray unavailable:', e.message); }
  app.on('activate', () => {          // macOS dock click
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else if (mainWindow) mainWindow.show();
  });
});

// Keep alive when all windows hidden (don't quit until tray Quit is clicked)
app.on('window-all-closed', (e) => {
  if (!isQuitting) e.preventDefault();
  else if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (tray) { tray.destroy(); tray = null; }
});
