'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  storage: {
    get:    (k, fb)  => ipcRenderer.invoke('storage:get', k, fb),
    set:    (k, v)   => ipcRenderer.invoke('storage:set', k, v),
    remove: (k)      => ipcRenderer.invoke('storage:remove', k),
    clear:  ()       => ipcRenderer.invoke('storage:clear'),
  },
  clearCookies:     (host)               => ipcRenderer.invoke('cookies:clear', host),
  updateTimerState: (active, taskName)   => ipcRenderer.invoke('timer:setState', active, taskName || ''),
  openExternal:     (url)                => ipcRenderer.invoke('shell:openExternal', url),
  openMessages:     ()                   => ipcRenderer.invoke('messages:open'),
  showNotification: (title, body)        => ipcRenderer.invoke('notification:show', title, body),
  pickFile:         ()                   => ipcRenderer.invoke('file:pick'),
  getSources:       ()                   => ipcRenderer.invoke('recorder:getSources'),
  saveRecording:    (data, name)         => ipcRenderer.invoke('recorder:save', data, name),
});
