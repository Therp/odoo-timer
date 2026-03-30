try {
  importScripts('lib/browser-polyfill.js');
} catch (_err) {
  // Firefox background pages may already provide browser without importScripts.
}

const browserApi = globalThis.browser || globalThis.chrome;

function iconPath(file) {
  return browserApi.runtime?.getURL ? browserApi.runtime.getURL(file) : file;
}

function getIconPath(timer) {
  if (timer === true) {
    return {
      16: iconPath('img/icon_16.png'),
      19: iconPath('img/icon_19.png'),
      32: iconPath('img/icon_32.png'),
      38: iconPath('img/icon_38.png'),
      48: iconPath('img/icon_48.png'),
      128: iconPath('img/icon_128.png'),
    };
  }
  if (timer === 'pause') {
    return {
      16: iconPath('img/icon-pause.png'),
      19: iconPath('img/icon-pause-19.png'),
      32: iconPath('img/icon_32.png'),
      38: iconPath('img/icon-pause-38.png'),
      48: iconPath('img/icon_48.png'),
      128: iconPath('img/icon_128.png'),
    };
  }
  return {
    16: iconPath('img/inactive_16.png'),
    19: iconPath('img/inactive_19.png'),
    32: iconPath('img/inactive_32.png'),
    38: iconPath('img/inactive_38.png'),
    48: iconPath('img/inactive_48.png'),
    128: iconPath('img/inactive_128.png'),
  };
}

async function setBrowserAction(timer) {
  try {
    await browserApi.action.setIcon({ path: getIconPath(timer) });
    if (browserApi.action?.setTitle) {
      await browserApi.action.setTitle({
        title: timer === true ? 'Therp Timer OWL — timer running' : 'Therp Timer OWL',
      });
    }
  } catch (err) {
    console.warn('Could not update extension icon', err);
  }
}

async function syncFromStorage() {
  try {
    const res = await browserApi.storage.local.get(['active_timer_id']);
    await setBrowserAction(Boolean(res.active_timer_id));
  } catch (err) {
    console.warn('Could not sync timer icon from storage', err);
  }
}

browserApi.runtime.onInstalled.addListener(() => {
  void syncFromStorage();
});

if (browserApi.runtime.onStartup) {
  browserApi.runtime.onStartup.addListener(() => {
    void syncFromStorage();
  });
}

browserApi.runtime.onMessage.addListener((msg) => {
  if (msg && Object.prototype.hasOwnProperty.call(msg, 'TimerActive')) {
    void setBrowserAction(msg.TimerActive);
  }
});

browserApi.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.active_timer_id) {
    void setBrowserAction(Boolean(changes.active_timer_id.newValue));
  }
});

void syncFromStorage();
