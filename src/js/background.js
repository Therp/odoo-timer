
importScripts('browser-polyfill.js');

const browserApi = globalThis.browser || globalThis.chrome;

function iconPath(file) {
  return browserApi.runtime && browserApi.runtime.getURL ? browserApi.runtime.getURL(file) : file;
}

function setBrowserAction(timer) {
  let path;
  if (timer === true) {
    path = { '16': iconPath('img/icon_16.png'), '19': iconPath('img/icon_19.png'), '38': iconPath('img/icon_38.png') };
  } else if (timer === 'pause') {
    path = { '16': iconPath('img/icon-pause.png'), '19': iconPath('img/icon-pause-19.png'), '38': iconPath('img/icon-pause-38.png') };
  } else {
    path = { '16': iconPath('img/inactive_16.png'), '19': iconPath('img/inactive_19.png'), '38': iconPath('img/inactive_38.png') };
  }
  try {
    browserApi.action.setIcon({ path });
  } catch (err) {
    console.warn('Could not update extension icon', err);
  }
}

async function syncFromStorage() {
  const res = await browserApi.storage.local.get(['active_timer_id']);
  setBrowserAction(!!res.active_timer_id);
}

browserApi.runtime.onInstalled.addListener(syncFromStorage);
browserApi.runtime.onStartup.addListener(syncFromStorage);
browserApi.runtime.onMessage.addListener((msg) => {
  if (msg && Object.prototype.hasOwnProperty.call(msg, 'TimerActive')) {
    setBrowserAction(msg.TimerActive);
  }
});
browserApi.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.active_timer_id) {
    setBrowserAction(!!changes.active_timer_id.newValue);
  }
});
