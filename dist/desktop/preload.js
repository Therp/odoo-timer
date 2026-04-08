'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Storage
  storage: {
    get:    (k, fb)  => ipcRenderer.invoke('storage:get', k, fb),
    set:    (k, v)   => ipcRenderer.invoke('storage:set', k, v),
    remove: (k)      => ipcRenderer.invoke('storage:remove', k),
    clear:  ()       => ipcRenderer.invoke('storage:clear'),
  },
  // Session
  clearCookies:     (host)               => ipcRenderer.invoke('cookies:clear', host),
  updateTimerState: (active, taskName)   => ipcRenderer.invoke('timer:setState', active, taskName || ''),
  // Navigation
  openExternal:     (url)                => ipcRenderer.invoke('shell:openExternal', url),
  openMessages:     ()                   => ipcRenderer.invoke('messages:open'),
  // Notifications
  showNotification: (title, body)        => ipcRenderer.invoke('notification:show', title, body),
  // File picker (message attachments)
  pickFile:         ()                   => ipcRenderer.invoke('file:pick'),
  // Recorder (used by popup-app inline recorder)
  getSources:       ()                   => ipcRenderer.invoke('recorder:getSources', {}),
  saveRecording:    (data, name)         => ipcRenderer.invoke('recorder:save', data, name),
  // Full recorder API (used by recorder.js)
  recorder: {
    getSources:        (opts)            => ipcRenderer.invoke('recorder:getSources', opts || {}),
    pickRegion:        ()                => ipcRenderer.invoke('recorder:pickRegion'),
    pickFolder:        ()                => ipcRenderer.invoke('recorder:pickFolder'),
    saveFile:          (d, n, ext, fld) => ipcRenderer.invoke('recorder:saveFile', d, n, ext, fld),
    setRecordingState: (active, mode)   => ipcRenderer.invoke('recorder:setState', active, mode),
    notify:            (msg, type)      => ipcRenderer.invoke('recorder:notify', msg, type),
    open:              ()               => ipcRenderer.invoke('recorder:open'),
  },
  // Region picker overlay (used by recorder-overlay.html)
  regionPicker: {
    confirm: (region) => ipcRenderer.invoke('overlay:confirm', region),
    cancel:  ()       => ipcRenderer.invoke('overlay:cancel'),
  },
});
