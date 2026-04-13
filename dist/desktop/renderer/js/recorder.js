/**
 * recorder.js — Therp Timer screen recorder, GIF recorder & screenshot tool.
 *
 * Changes from original:
 *  - todo #1 : Video format selector (webm / mp4 / mkv) + Storage folder preference
 *  - todo #2 : Audio source selector (none / microphone / system)
 *  - todo #5 : Fixed "Cannot access video source" when mode=Region with delay/auto-stop
 *
 * Runs in renderer/recorder.html
 * Communicates with main.js via window.electronAPI (preload bridge)
 */

import { GifEncoder } from './lib/gif-encoder.js';
import { log } from './lib/logger.js';

const api = window.electronAPI;

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  mode:          'video',      // 'video' | 'gif' | 'screenshot'
  sourceType:    'screen',     // 'screen' | 'window' | 'region'
  sourceId:      null,         // desktopCapturer source id (screen/window mode)
  region:        null,         // {x,y,width,height} for region mode
  videoFormat:   'webm',       // 'webm' | 'mp4' | 'mkv'
  audioSource:   'none',       // 'none' | 'microphone' | 'system'
  delaySecs:     0,
  durationSecs:  0,
  fps:           10,
  saveFolder:    null,         // explicit override for screenshots
  videoFolder:   null,         // explicit override for videos
  // runtime
  stream:        null,
  audioStream:   null,
  recorder:      null,
  gifFrames:     [],
  gifInterval:   null,
  autoStopTimer: null,
  delayTimer:    null,
  elapsedTimer:  null,
  elapsedSecs:   0,
  recording:     false,
  _gifVideo:     null,
  _cropInterval: null,
};

// ── DOM helpers ────────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function showSection(id, visible) {
  const el = $(id);
  if (el) el.style.display = visible ? '' : 'none';
}

function setStatus(visible, text = '', dotClass = 'rec-dot') {
  $('rec-status').style.display = visible ? 'flex' : 'none';
  if (visible) {
    $('rec-status-text').textContent = text;
    $('rec-status').querySelector('.rec-status-icon .fa').className = `fa fa-circle ${dotClass}`;
  }
}

function setCountdown(text) {
  const el = $('rec-countdown');
  if (el) el.textContent = text;
}

function setUI(recording) {
  $('start-btn').style.display = recording ? 'none' : 'flex';
  $('stop-btn').style.display  = recording ? 'flex' : 'none';
  $$('.rec-tab, .source-btn, input[type="range"]').forEach((el) => {
    el.disabled = recording;
    el.style.opacity = recording ? '.45' : '';
  });
  $$('.rec-select, .format-btn, .audio-btn').forEach((el) => {
    el.disabled = recording;
    el.style.opacity = recording ? '.45' : '';
  });
  if ($('pick-folder-btn')) $('pick-folder-btn').disabled = recording;
  if ($('window-picker'))   $('window-picker').disabled   = recording;
}

// ── Mode / source wiring ──────────────────────────────────────────────────────
$$('.rec-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.rec-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    updateSections();
  });
});

$$('.source-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    $$('.source-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.sourceType = btn.dataset.src;
    state.region     = null;
    if (state.sourceType === 'window') await loadWindowList();
    showSection('window-picker-wrap', state.sourceType === 'window');
  });
});

// Format buttons (todo #1)
$$('.format-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.format-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.videoFormat = btn.dataset.fmt;
  });
});

// Audio buttons (todo #2)
$$('.audio-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.audio-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.audioSource = btn.dataset.audio;
  });
});

$('window-picker').addEventListener('change', (e) => { state.sourceId = e.target.value; });

$('delay-slider').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  state.delaySecs = v;
  $('delay-value').textContent = v === 0 ? '0s' : `${v}s`;
});

$('duration-slider').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  state.durationSecs = v;
  $('duration-value').textContent = v === 0 ? '∞' : `${v}s`;
});

$('fps-slider').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  state.fps = v;
  $('fps-value').textContent = `${v}`;
});

$('pick-folder-btn').addEventListener('click', async () => {
  const folder = await api.recorder.pickFolder();
  if (folder) {
    state.saveFolder = folder;
    $('folder-path').textContent = folder;
    // Persist for next session
    await api.prefs?.set('screenshotFolder', folder);
  }
});

$('start-btn').addEventListener('click', startFlow);
$('stop-btn').addEventListener('click',  stopAndSave);

// ── Section visibility ────────────────────────────────────────────────────────
function updateSections() {
  const isScreenshot = state.mode === 'screenshot';
  const isGif        = state.mode === 'gif';
  const isVideo      = state.mode === 'video';

  $('delay-label').textContent = isScreenshot ? 'Delay before screenshot' : 'Delay before recording';
  showSection('duration-section',     !isScreenshot);
  showSection('gif-quality-section',   isGif);
  showSection('folder-section',        isScreenshot);
  showSection('format-section',        isVideo);
  showSection('audio-section',         isVideo || isGif);
  showSection('source-section',        true);
}
updateSections();

// ── Load stored folder prefs ───────────────────────────────────────────────────
(async () => {
  try {
    const ssFolder  = await api.prefs?.get('screenshotFolder', '');
    const vidFolder = await api.prefs?.get('videoFolder', '');
    if (ssFolder)  { state.saveFolder  = ssFolder;  $('folder-path').textContent = ssFolder; }
    if (vidFolder) { state.videoFolder = vidFolder; }
  } catch (_) {}
})();

// ── Window list ───────────────────────────────────────────────────────────────
async function loadWindowList() {
  const sources = await api.recorder.getSources();
  const sel     = $('window-picker');
  sel.innerHTML = '<option value="">Select a window…</option>';
  sources
    .filter((s) => s.name !== 'Entire Screen' && !s.name.startsWith('Screen '))
    .forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name;
      sel.appendChild(opt);
    });
  if (sources.length) { state.sourceId = sources[0].id; sel.value = sources[0].id; }
}

// ── Resolve the primary screen source ID ─────────────────────────────────────
/**
 * Find the ID of the primary/entire screen source.
 * Used for region mode (which records full screen then crops).
 * @returns {Promise<string|null>}
 */
async function resolvePrimaryScreenId() {
  const sources = await api.recorder.getSources();
  const screen  = sources.find((s) => s.name === 'Entire Screen' || s.name.startsWith('Screen '));
  return screen?.id || sources[0]?.id || null;
}

// ── Main flow ─────────────────────────────────────────────────────────────────
async function startFlow() {
  $('start-btn').disabled = true;

  try {
    // Region selection — pick region BEFORE the delay countdown
    if (state.sourceType === 'region') {
      const region = await api.recorder.pickRegion();
      if (!region) { $('start-btn').disabled = false; return; }
      state.region = region;
      // For region capture we record the full screen and crop; resolve source now
      state.sourceId = await resolvePrimaryScreenId();
      if (!state.sourceId) {
        notify('No screen source found for region capture.', 'error');
        $('start-btn').disabled = false;
        return;
      }
    }

    // Resolve source id for full-screen mode
    if (state.sourceType === 'screen') {
      state.sourceId = await resolvePrimaryScreenId();
    }

    // Window mode: sourceId is set by the select element; verify it
    if (state.sourceType === 'window' && !state.sourceId) {
      notify('No window selected.', 'error');
      $('start-btn').disabled = false;
      return;
    }

    // Countdown delay (if any)
    if (state.delaySecs > 0) {
      await runDelay(state.delaySecs);
    }

    if (state.mode === 'screenshot') {
      await takeScreenshot();
    } else {
      await startRecording();
    }
  } catch (err) {
    log.error('startFlow error:', err.message);
    notify('Failed to start: ' + err.message, 'error');
  } finally {
    $('start-btn').disabled = false;
  }
}

async function runDelay(secs) {
  const el = $('delay-count'); const num = $('delay-count-num');
  el.style.display = 'flex';
  return new Promise((resolve) => {
    let remaining = secs;
    const tick = () => {
      if (remaining <= 0) { el.style.display = 'none'; resolve(); return; }
      num.textContent = remaining--;
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
    let src;
    if (state.sourceType === 'screen') {
      src = sources.find((s) => s.name === 'Entire Screen' || s.name.startsWith('Screen '));
    } else if (state.sourceType === 'window' && state.sourceId) {
      src = sources.find((s) => s.id === state.sourceId);
    } else {
      src = sources.find((s) => s.name === 'Entire Screen' || s.name.startsWith('Screen '));
    }
    if (!src?.thumbnail) throw new Error('Could not capture screen.');

    let imgBytes;
    if (state.region) {
      // Crop region from full screenshot
      imgBytes = await cropRegionFromBase64Png(src.thumbnail, state.region);
    } else {
      imgBytes = Uint8Array.from(atob(src.thumbnail), (c) => c.charCodeAt(0));
    }

    const filename = `screenshot-${fmtDate()}.png`;
    const saved    = await api.recorder.saveFile(imgBytes, filename, 'png', state.saveFolder);
    setStatus(false);
    if (saved) notify(`Screenshot saved:\n${saved}`, 'success');
  } catch (e) {
    log.error('Screenshot error:', e.message);
    setStatus(false);
    notify('Screenshot failed: ' + e.message, 'error');
  }
}

/**
 * Crop a PNG (base64) to the given region using an off-screen canvas.
 * @param {string} base64Png
 * @param {{x:number,y:number,width:number,height:number}} region
 * @returns {Promise<Uint8Array>}
 */
function cropRegionFromBase64Png(base64Png, region) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = region.width;
      canvas.height = region.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
      canvas.toBlob((blob) => {
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load screenshot image'));
    img.src = `data:image/png;base64,${base64Png}`;
  });
}

// ── Get media stream (todo #2 audio, todo #5 region fix) ──────────────────────
/**
 * Acquire the desktop capture stream.  For region mode, captures the full
 * screen (the region crop happens in startVideoCapture / startGifCapture).
 * Audio tracks are merged when an audio source is selected.
 *
 * @returns {Promise<MediaStream>}
 */
async function getStream() {
  if (!state.sourceId) throw new Error('No capture source resolved.');

  const videoConstraints = {
    mandatory: {
      chromeMediaSource:   'desktop',
      chromeMediaSourceId: state.sourceId,
      minWidth: 1,  maxWidth: 3840,
      minHeight: 1, maxHeight: 2160,
    },
  };

  let stream;

  if (state.audioSource === 'system') {
    // System audio: include audio in the desktop capture request (Windows/some setups)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'desktop' } },
        video: videoConstraints,
      });
    } catch (sysErr) {
      log.warn('System audio unavailable, falling back to video-only:', sysErr.message);
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
    }
  } else {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
  }

  // Microphone: obtain separately and merge tracks
  if (state.audioSource === 'microphone') {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      state.audioStream = micStream;
      micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch (micErr) {
      log.warn('Microphone unavailable:', micErr.message);
      notify('Microphone access denied — recording without audio.', 'info');
    }
  }

  return stream;
}

// ── Video / GIF recording ─────────────────────────────────────────────────────
async function startRecording() {
  try {
    state.stream = await getStream();
  } catch (e) {
    log.error('Cannot access video source:', e.message);
    notify('Cannot access video source: ' + e.message, 'error');
    return;
  }

  state.recording   = true;
  state.elapsedSecs = 0;
  state.gifFrames   = [];
  setUI(true);

  const isGif = state.mode === 'gif';
  setStatus(true, isGif ? 'Recording GIF…' : `Recording ${state.videoFormat.toUpperCase()}…`, isGif ? 'gif-dot' : 'rec-dot');
  api.recorder.setRecordingState(true, state.mode);

  // Elapsed / auto-stop counter
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

/**
 * Start MediaRecorder for video capture.
 * Supports webm, mp4, mkv output via format selector (todo #1).
 * For region mode, records via an off-screen canvas cropped to the region.
 */
function startVideoCapture() {
  const chunks = [];

  // Determine the best supported MIME type for the chosen format
  let mimeType = 'video/webm;codecs=vp8';
  if (state.videoFormat === 'mp4') {
    const mp4Codecs = ['video/mp4;codecs=h264', 'video/mp4;codecs=avc1', 'video/mp4'];
    const supported = mp4Codecs.find((m) => MediaRecorder.isTypeSupported(m));
    mimeType = supported || 'video/webm;codecs=vp8';
    if (!supported) log.warn('MP4 codec not natively supported — saving as WebM container with .mp4 extension.');
  }
  // mkv uses the same WebM/Matroska container — saving as .mkv is valid
  if (state.videoFormat === 'mkv') {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm;codecs=vp8';
  }

  let recordStream = state.stream;

  // Region crop via canvas captureStream
  if (state.region) {
    const { x, y, width, height } = state.region;
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const video = document.createElement('video');
    video.srcObject = state.stream;
    video.muted     = true;
    video.play();

    state._cropInterval = setInterval(() => {
      if (video.readyState >= 2) {
        ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
      }
    }, 1000 / 30);

    state._gifVideo = video; // reuse cleanup reference

    // Build a new stream: canvas video track + original audio tracks
    const canvasStream = canvas.captureStream(30);
    state.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
    recordStream = canvasStream;
  }

  const recOpts = { mimeType };
  try {
    state.recorder = new MediaRecorder(recordStream, recOpts);
  } catch (e) {
    log.warn('MediaRecorder init failed with mimeType, falling back:', e.message);
    state.recorder = new MediaRecorder(recordStream);
  }

  state.recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  state.recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
    const arr  = new Uint8Array(await blob.arrayBuffer());
    const ext  = state.videoFormat; // webm | mp4 | mkv
    const folder = state.videoFolder || (await api.prefs?.get('videoFolder', '')) || null;
    await finishSave(arr, `recording-${fmtDate()}.${ext}`, ext, folder);
  };
  state.recorder.start(500);
}

function startGifCapture() {
  const video = document.createElement('video');
  video.srcObject = state.stream;
  video.muted     = true;
  video.play();

  const canvas   = document.createElement('canvas');
  const ctx      = canvas.getContext('2d');
  const interval = Math.round(1000 / state.fps);

  video.addEventListener('loadedmetadata', () => {
    let w = state.region ? state.region.width  : video.videoWidth;
    let h = state.region ? state.region.height : video.videoHeight;
    canvas.width = w; canvas.height = h;

    state.gifInterval = setInterval(() => {
      if (state.region) {
        ctx.drawImage(video, state.region.x, state.region.y, state.region.width, state.region.height, 0, 0, w, h);
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
  clearInterval(state._cropInterval);
  state._cropInterval = null;
  if (state.autoStopTimer) { clearTimeout(state.autoStopTimer); state.autoStopTimer = null; }

  setStatus(true, 'Saving…', 'scrn-dot');
  api.recorder.setRecordingState(false);
  setUI(false);

  // Stop audio stream if we added a mic
  if (state.audioStream) {
    state.audioStream.getTracks().forEach((t) => t.stop());
    state.audioStream = null;
  }

  if (state.mode === 'gif') {
    await encodeAndSaveGif();
  } else if (state.recorder) {
    state.recorder.stop();
    state.stream?.getTracks().forEach((t) => t.stop());
    // onstop callback handles saving for video
  }

  if (state._gifVideo) {
    state._gifVideo.srcObject = null;
    state._gifVideo = null;
    state.stream?.getTracks().forEach((t) => t.stop());
  }
}

async function encodeAndSaveGif() {
  if (!state.gifFrames.length) { setStatus(false); notify('No frames captured.', 'error'); return; }
  const { width, height } = state.gifFrames[0];
  const enc = new GifEncoder(width, height, { loop: 0 });
  for (const f of state.gifFrames) enc.addFrame(new Uint8ClampedArray(f.data), f.delay);
  const bytes  = enc.finish();
  const folder = state.videoFolder || (await api.prefs?.get('videoFolder', '')) || null;
  await finishSave(bytes, `recording-${fmtDate()}.gif`, 'gif', folder);
}

async function finishSave(bytes, filename, ext, folder = null) {
  setStatus(false);
  const saved = await api.recorder.saveFile(bytes, filename, ext, folder);
  if (saved) notify(`Saved:\n${saved}`, 'success');
  else notify('Save cancelled.', 'info');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function notify(msg, type = 'info') { api.recorder.notify(msg, type); }
function fmtDate() { return new Date().toISOString().replace(/[T:.]/g, '-').slice(0, 19); }
function fmtTime(secs) { const s = Math.abs(secs); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; }
