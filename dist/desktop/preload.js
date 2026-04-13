'use strict';
/**
 * preload.js — Secure contextBridge between renderer and Electron main process.
 * All renderer ↔ main communication must go through this bridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Storage ──────────────────────────────────────────────────────────────
  storage: {
    get:    (k, fb)  => ipcRenderer.invoke('storage:get', k, fb),
    set:    (k, v)   => ipcRenderer.invoke('storage:set', k, v),
    remove: (k)      => ipcRenderer.invoke('storage:remove', k),
    clear:  ()       => ipcRenderer.invoke('storage:clear'),
  },

  // ── User preferences ─────────────────────────────────────────────────────
  prefs: {
    get:    (k, fb)  => ipcRenderer.invoke('prefs:get', k, fb),
    set:    (k, v)   => ipcRenderer.invoke('prefs:set', k, v),
    getAll: ()       => ipcRenderer.invoke('prefs:getAll'),
  },

  // ── Config backup/restore (todo #14) ─────────────────────────────────────
  config: {
    export: ()       => ipcRenderer.invoke('config:export'),
    import: ()       => ipcRenderer.invoke('config:import'),
  },

  // ── Logs (todo #4) ───────────────────────────────────────────────────────
  logs: {
    get:        ()          => ipcRenderer.invoke('logs:get'),
    clear:      ()          => ipcRenderer.invoke('logs:clear'),
    append:     (lvl, msg)  => ipcRenderer.invoke('logs:append', lvl, msg),
    openWindow: ()          => ipcRenderer.invoke('logs:window:open'),
  },

  // ── Session / cookies ─────────────────────────────────────────────────────
  clearCookies:     (host)             => ipcRenderer.invoke('cookies:clear', host),
  updateTimerState: (active, taskName) => ipcRenderer.invoke('timer:setState', active, taskName || ''),

  // ── Navigation ───────────────────────────────────────────────────────────
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openMessages: ()    => ipcRenderer.invoke('messages:open'),

  // ── Task timesheets window (todo #15) ─────────────────────────────────────
  openTimesheets: (taskId, taskName) => ipcRenderer.invoke('timesheets:open', taskId, taskName),

  // ── Notifications ─────────────────────────────────────────────────────────
  showNotification: (title, body) => ipcRenderer.invoke('notification:show', title, body),

  // ── File picker (message attachments) ────────────────────────────────────
  pickFile: () => ipcRenderer.invoke('file:pick'),

  // ── Recorder (inline, used by popup-app) ─────────────────────────────────
  getSources:    ()           => ipcRenderer.invoke('recorder:getSources', {}),
  saveRecording: (data, name) => ipcRenderer.invoke('recorder:save', data, name),

  // ── Full recorder API (used by recorder.js) ───────────────────────────────
  recorder: {
    getSources:        (opts)           => ipcRenderer.invoke('recorder:getSources', opts || {}),
    pickRegion:        ()               => ipcRenderer.invoke('recorder:pickRegion'),
    pickFolder:        ()               => ipcRenderer.invoke('recorder:pickFolder'),
    saveFile:          (d, n, ext, fld) => ipcRenderer.invoke('recorder:saveFile', d, n, ext, fld),
    setRecordingState: (active, mode)   => ipcRenderer.invoke('recorder:setState', active, mode),
    notify:            (msg, type)      => ipcRenderer.invoke('recorder:notify', msg, type),
    open:              ()               => ipcRenderer.invoke('recorder:open'),
  },

  // ── Region picker overlay ─────────────────────────────────────────────────
  regionPicker: {
    confirm: (region) => ipcRenderer.invoke('overlay:confirm', region),
    cancel:  ()       => ipcRenderer.invoke('overlay:cancel'),
  },

  // ── IPC event listeners (one-way from main → renderer) ───────────────────
  on: (channel, callback) => {
    const allowedChannels = ['timesheets:task'];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, data) => callback(data));
    }
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
