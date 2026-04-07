/**
 * recorder.js — Therp Timer screen recorder, GIF recorder & screenshot tool.
 *
 * Runs in renderer/recorder.html
 * Communicates with main.js via window.electronAPI (preload bridge)
 */

import { GifEncoder } from './lib/gif-encoder.js';

const api = window.electronAPI;

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  mode:          'video',   // 'video' | 'gif' | 'screenshot'
  sourceType:    'screen',  // 'screen' | 'window' | 'region'
  sourceId:      null,      // desktopCapturer source id
  region:        null,      // {x,y,width,height} for region mode
  delaySecs:     0,
  durationSecs:  0,
  fps:           10,
  saveFolder:    null,      // for screenshots
  // runtime
  stream:        null,
  recorder:      null,
  gifFrames:     [],
  gifInterval:   null,
  autoStopTimer: null,
  delayTimer:    null,
  elapsedTimer:  null,
  elapsedSecs:   0,
  recording:     false,
};

// ── DOM helpers ────────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function showSection(id, visible) {
  $(id).style.display = visible ? '' : 'none';
}

function setStatus(visible, text = '', dotClass = 'rec-dot') {
  $('rec-status').style.display = visible ? 'flex' : 'none';
  $('rec-status-text').textContent = text;
  $('rec-status').querySelector('.rec-status-icon .fa').className = `fa fa-circle ${dotClass}`;
}

function setCountdown(text) { $('rec-countdown').textContent = text; }

function setUI(recording) {
  $('start-btn').style.display  = recording ? 'none' : 'flex';
  $('stop-btn').style.display   = recording ? 'flex' : 'none';
  $$('.rec-tab, .source-btn, input[type="range"]').forEach(el => {
    el.disabled = recording;
    el.style.opacity = recording ? '.45' : '';
  });
  if ($('pick-folder-btn')) $('pick-folder-btn').disabled = recording;
  if ($('window-picker'))   $('window-picker').disabled   = recording;
}

// ── Mode / source wiring ──────────────────────────────────────────────────────
$$('.rec-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.rec-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    updateSections();
  });
});

$$('.source-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    $$('.source-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sourceType = btn.dataset.src;
    state.region = null;
    if (state.sourceType === 'window') await loadWindowList();
    showSection('window-picker', state.sourceType === 'window');
  });
});

$('window-picker').addEventListener('change', e => { state.sourceId = e.target.value; });

$('delay-slider').addEventListener('input', e => {
  const v = Number(e.target.value);
  state.delaySecs = v;
  $('delay-value').textContent = v === 0 ? '0s' : `${v}s`;
});

$('duration-slider').addEventListener('input', e => {
  const v = Number(e.target.value);
  state.durationSecs = v;
  $('duration-value').textContent = v === 0 ? '∞' : `${v}s`;
});

$('fps-slider').addEventListener('input', e => {
  const v = Number(e.target.value);
  state.fps = v;
  $('fps-value').textContent = `${v}`;
});

$('pick-folder-btn').addEventListener('click', async () => {
  const folder = await api.recorder.pickFolder();
  if (folder) { state.saveFolder = folder; $('folder-path').textContent = folder; }
});

$('start-btn').addEventListener('click', startFlow);
$('stop-btn').addEventListener('click', stopAndSave);

function updateSections() {
  const isScreenshot = state.mode === 'screenshot';
  const isGif        = state.mode === 'gif';

  $('delay-label').textContent = isScreenshot ? 'Delay before screenshot' : 'Delay before recording';
  showSection('duration-section',     !isScreenshot);
  showSection('gif-quality-section',   isGif);
  showSection('folder-section',        isScreenshot);
  showSection('source-section',        true);
}
updateSections();

async function loadWindowList() {
  const sources = await api.recorder.getSources();
  const sel = $('window-picker');
  sel.innerHTML = '<option value="">Select a window…</option>';
  sources.filter(s => s.name !== 'Entire Screen' && !s.name.startsWith('Screen ')).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id; opt.textContent = s.name;
    sel.appendChild(opt);
  });
  if (sources.length) { state.sourceId = sources[0].id; sel.value = sources[0].id; }
}

// ── Main flow ─────────────────────────────────────────────────────────────────
async function startFlow() {
  $('start-btn').disabled = true;

  // Region selection — open overlay and wait for result
  if (state.sourceType === 'region') {
    const region = await api.recorder.pickRegion();
    if (!region) { $('start-btn').disabled = false; return; } // user cancelled
    state.region = region;
  }

  // Resolve source id for screen
  if (state.sourceType === 'screen') {
    const sources = await api.recorder.getSources();
    const screen  = sources.find(s => s.name === 'Entire Screen' || s.name.startsWith('Screen '));
    state.sourceId = screen?.id || sources[0]?.id;
  }

  if (!state.sourceId && state.sourceType !== 'region') {
    notify('No source selected.'); $('start-btn').disabled = false; return;
  }

  // Countdown delay
  if (state.delaySecs > 0) {
    await runDelay(state.delaySecs);
  }

  $('start-btn').disabled = false;

  if (state.mode === 'screenshot') {
    await takeScreenshot();
  } else {
    await startRecording();
  }
}

async function runDelay(secs) {
  const el = $('delay-count'); const num = $('delay-count-num');
  el.style.display = 'flex';
  return new Promise(resolve => {
    let remaining = secs;
    const tick = () => {
      if (remaining <= 0) { el.style.display = 'none'; resolve(); return; }
      num.textContent = remaining--;
      // Force animation restart
      num.style.animation = 'none';
      void num.offsetWidth;
      num.style.animation = '';
      setTimeout(tick, 1000);
    };
    tick();
  });
}

// ── Screenshot ────────────────────────────────────────────────────────────────
async function takeScreenshot() {
  setStatus(true, 'Capturing…', 'scrn-dot');
  try {
    const sources = await api.recorder.getSources({ thumbnail: true });
    const src = state.sourceType === 'screen'
      ? sources.find(s => s.name === 'Entire Screen' || s.name.startsWith('Screen '))
      : sources.find(s => s.id === state.sourceId);

    if (!src?.thumbnail) throw new Error('Could not capture screen.');

    // src.thumbnail is a base64 PNG
    const bytes = Uint8Array.from(atob(src.thumbnail), c => c.charCodeAt(0));
    const filename = `screenshot-${fmtDate()}.png`;
    const saved = await api.recorder.saveFile(bytes, filename, 'png', state.saveFolder);
    setStatus(false);
    if (saved) notify(`Screenshot saved:\n${saved}`, 'success');
  } catch (e) {
    setStatus(false);
    notify('Screenshot failed: ' + e.message, 'error');
  }
}

// ── Video / GIF recording ──────────────────────────────────────────────────────
async function startRecording() {
  try {
    state.stream = await getStream();
  } catch (e) {
    notify('Cannot access source: ' + e.message, 'error'); return;
  }

  state.recording   = true;
  state.elapsedSecs = 0;
  state.gifFrames   = [];
  setUI(true);

  const isGif = state.mode === 'gif';
  setStatus(true,
    isGif ? 'Recording GIF…' : 'Recording video…',
    isGif ? 'gif-dot' : 'rec-dot'
  );

  // Notify tray
  api.recorder.setRecordingState(true, state.mode);

  // Elapsed counter
  state.elapsedTimer = setInterval(() => {
    state.elapsedSecs++;
    const rem = state.durationSecs > 0 ? state.durationSecs - state.elapsedSecs : null;
    setCountdown(rem !== null ? fmtTime(rem) : fmtTime(state.elapsedSecs));
    if (rem !== null && rem <= 0) stopAndSave();
  }, 1000);

  if (isGif) {
    startGifCapture();
  } else {
    startVideoCapture();
  }
}

async function getStream() {
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource:   'desktop',
        chromeMediaSourceId: state.sourceId,
        minWidth: 1,  maxWidth: 3840,
        minHeight: 1, maxHeight: 2160,
      },
    },
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

function startVideoCapture() {
  const chunks = [];
  state.recorder = new MediaRecorder(state.stream, { mimeType: 'video/webm;codecs=vp8' });
  state.recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  state.recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const arr  = new Uint8Array(await blob.arrayBuffer());
    await finishSave(arr, `recording-${fmtDate()}.webm`, 'webm');
  };
  state.recorder.start(500);
}

function startGifCapture() {
  // Capture frames by drawing stream to off-screen canvas
  const video    = document.createElement('video');
  video.srcObject = state.stream;
  video.muted    = true;
  video.play();

  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const interval = Math.round(1000 / state.fps);

  video.addEventListener('loadedmetadata', () => {
    let w = video.videoWidth, h = video.videoHeight;
    if (state.region) {
      w = state.region.width; h = state.region.height;
    }
    canvas.width = w; canvas.height = h;

    state.gifInterval = setInterval(() => {
      if (state.region) {
        ctx.drawImage(video, state.region.x, state.region.y,
          state.region.width, state.region.height, 0, 0, w, h);
      } else {
        ctx.drawImage(video, 0, 0, w, h);
      }
      const id = ctx.getImageData(0, 0, w, h);
      state.gifFrames.push({ data: id.data, width: w, height: h, delay: interval });
    }, interval);
  });
  state._gifVideo = video;
}

async function stopAndSave() {
  if (!state.recording) return;
  state.recording = false;
  clearInterval(state.elapsedTimer);
  clearInterval(state.gifInterval);
  if (state.autoStopTimer) { clearTimeout(state.autoStopTimer); state.autoStopTimer = null; }

  setStatus(true, 'Saving…', 'scrn-dot');
  api.recorder.setRecordingState(false);
  setUI(false);

  if (state.mode === 'gif') {
    await encodeAndSaveGif();
  } else if (state.recorder) {
    state.recorder.stop();
    state.stream?.getTracks().forEach(t => t.stop());
    // onstop callback handles saving
  }

  if (state._gifVideo) {
    state._gifVideo.srcObject = null;
    state._gifVideo = null;
    state.stream?.getTracks().forEach(t => t.stop());
  }
}

async function encodeAndSaveGif() {
  if (!state.gifFrames.length) { setStatus(false); notify('No frames captured.', 'error'); return; }
  const { width, height } = state.gifFrames[0];
  const enc = new GifEncoder(width, height, { loop: 0 });
  for (const f of state.gifFrames) {
    enc.addFrame(new Uint8ClampedArray(f.data), f.delay);
  }
  const bytes = enc.finish();
  await finishSave(bytes, `recording-${fmtDate()}.gif`, 'gif');
}

async function finishSave(bytes, filename, ext) {
  setStatus(false);
  const saved = await api.recorder.saveFile(bytes, filename, ext, null);
  if (saved) notify(`Saved:\n${saved}`, 'success');
  else notify('Save cancelled.', 'info');
}

// ── Notification helper ───────────────────────────────────────────────────────
function notify(msg, type = 'info') {
  api.recorder.notify(msg, type);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function fmtDate() {
  return new Date().toISOString().replace(/[T:.]/g, '-').slice(0, 19);
}

function fmtTime(secs) {
  const s = Math.abs(secs);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2,'0')}`;
}
