'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  storage: {
    get:    (key, fallback = null) => ipcRenderer.invoke('storage:get', key, fallback),
    set:    (key, value)           => ipcRenderer.invoke('storage:set', key, value),
    remove: (key)                  => ipcRenderer.invoke('storage:remove', key),
    clear:  ()                     => ipcRenderer.invoke('storage:clear'),
  },
  clearCookies:     (host)              => ipcRenderer.invoke('cookies:clear', host),
  // taskName shown in tray tooltip when timer is running
  updateTimerState: (isActive, taskName) => ipcRenderer.invoke('timer:setState', isActive, taskName || ''),
  openExternal:     (url)               => ipcRenderer.invoke('shell:openExternal', url),
});
