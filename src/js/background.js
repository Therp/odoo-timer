// ---- one API alias for Chrome/Firefox ----
const api = (typeof chrome !== 'undefined' && chrome.runtime)
  ? chrome                          // Chrome (and Chromium)
  : (typeof browser !== 'undefined' ? browser : null); // Firefox

if (!api) throw new Error('No extension API found');

// helpers
const R = api.runtime;
const A = api.action || api.browserAction;  // MV3 uses action
const S = api.storage;
const url = (p) => R.getURL(p);             // build extension-absolute URLs

const TogglButton = {
  setBrowserAction(timer) {
    console.log('TIMER CHECK:', timer);
    let path;
    if (timer === true || String(timer).toLowerCase() === 'true') {
      path = { 19: url('img/icon_19.png'), 38: url('img/icon_38.png') };
    } else if (String(timer).toLowerCase() === 'pause') {
      path = { 19: url('img/icon-pause.png'), 38: url('img/icon-pause.png') };
    } else {
      path = { 19: url('img/inactive_19.png'), 38: url('img/inactive_38.png') };
    }
    const p = A.setIcon({ path });
    if (p?.catch) p.catch(err => console.error('setIcon failed:', err));
  },
};

// Message listener (works in both)
api.runtime.onMessage.addListener(async (msg, sender) => {
  console.log('BG got message', msg, 'from', sender);
  const data = await S?.local?.get?.(['TimerActive']);
  console.log('Stored data', data);
  TogglButton.setBrowserAction(msg?.TimerActive);
});
