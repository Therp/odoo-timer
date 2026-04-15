/**
 * recorder.js — Therp Timer screen recorder, GIF recorder, screenshot & PiP camera.
 *
 * Features:
 *  - Video recording (WebM / MP4 / MKV) with system or microphone audio
 *  - Animated GIF capture with auto-scale, frame cap, and memory estimation
 *  - Screenshot (PNG) with optional delay and region crop
 *  - Picture-in-Picture camera overlay composited onto the recording canvas
 *
 * Key design decisions:
 *  - Desktop stream video tracks are isolated from audio when feeding <video>
 *    elements (prevents 0×0 dimension bug with system audio on Linux)
 *  - Audio tracks are stopped INSIDE onstop, not before, so no buffered data is lost
 *  - pip.video is appended to the DOM (hidden) so Chromium doesn't throttle playback
 */

import { GifEncoder } from './lib/gif-encoder.js';
import { log }        from './lib/logger.js';

const api = window.electronAPI;

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  mode:         'video',    // 'video' | 'gif' | 'screenshot'
  sourceType:   'screen',   // 'screen' | 'window' | 'region'
  sourceId:     null,
  region:       null,       // {x,y,width,height}
  videoFormat:  'webm',     // 'webm' | 'mp4' | 'mkv'
  audioSource:  'none',     // 'none' | 'microphone' | 'system'
  delaySecs:    0,
  durationSecs: 0,
  fps:          10,
  saveFolder:   null,
  videoFolder:  null,
  // runtime
  stream:        null,      // desktop MediaStream
  audioStream:   null,      // separate mic stream (if any)
  recorder:      null,      // MediaRecorder instance
  gifFrames:     [],
  gifInterval:   null,
  autoStopTimer: null,
  elapsedTimer:  null,
  elapsedSecs:   0,
  recording:     false,
  _srcVid:       null,      // video element drawing desktop into canvas
  _drawInterval: null,      // canvas draw interval (video+PiP)
};

// ── PiP state ─────────────────────────────────────────────────────────────────
const pip = {
  enabled:       false,
  deviceId:      '',
  position:      'br',      // 'tl' | 'tr' | 'bl' | 'br'
  size:          'md',      // 'sm' | 'md' | 'lg'
  stream:        null,      // camera MediaStream for recording
  video:         null,      // off-screen (but DOM-attached) video element
  previewStream: null,      // separate stream for UI preview
};

const PIP_SIZE_FRACTIONS = { sm: 0.14, md: 0.22, lg: 0.30 };
const PIP_PADDING = 14;

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
  $$('.rec-select, .format-btn, .audio-btn, .pip-pos-btn, .pip-size-btn').forEach((el) => {
    el.disabled = recording;
    el.style.opacity = recording ? '.45' : '';
  });
  const pipToggle = $('pip-toggle');
  if (pipToggle) { pipToggle.disabled = recording; pipToggle.style.opacity = recording ? '.45' : ''; }
  if ($('pick-folder-btn')) $('pick-folder-btn').disabled = recording;
  if ($('window-picker'))   $('window-picker').disabled   = recording;
  if ($('pip-camera-select')) $('pip-camera-select').disabled = recording;
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

$$('.format-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.format-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.videoFormat = btn.dataset.fmt;
  });
});

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
    await api.prefs?.set('screenshotFolder', folder);
  }
});

$('start-btn').addEventListener('click', startFlow);
$('stop-btn').addEventListener('click',  stopAndSave);

// ── PiP wiring ────────────────────────────────────────────────────────────────
$('pip-toggle').addEventListener('change', async (e) => {
  pip.enabled = e.target.checked;
  showSection('pip-controls', pip.enabled);
  if (pip.enabled) {
    await populateCameraList();
    await startCameraPreview();
  } else {
    stopCameraPreview();
  }
});

$('pip-camera-select').addEventListener('change', async (e) => {
  pip.deviceId = e.target.value;
  await startCameraPreview();
});

$$('.pip-pos-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.pip-pos-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    pip.position = btn.dataset.pos;
    updatePipPositionIndicator();
  });
});

$$('.pip-size-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.pip-size-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    pip.size = btn.dataset.size;
  });
});

function updatePipPositionIndicator() {
  const ind = $('pip-pos-indicator');
  if (!ind) return;
  const map = {
    tl: { top: '8px',    left: '8px',   bottom: '', right: ''   },
    tr: { top: '8px',    right: '8px',  bottom: '', left: ''    },
    bl: { bottom: '8px', left: '8px',   top: '',    right: ''   },
    br: { bottom: '8px', right: '8px',  top: '',    left: ''    },
  };
  const pos = map[pip.position] || map.br;
  ind.style.top    = pos.top    || '';
  ind.style.left   = pos.left   || '';
  ind.style.bottom = pos.bottom || '';
  ind.style.right  = pos.right  || '';
}
updatePipPositionIndicator();

// ── Camera device enumeration ─────────────────────────────────────────────────
async function populateCameraList() {
  const sel = $('pip-camera-select');
  sel.innerHTML = '<option value="">Loading cameras…</option>';
  try {
    // Brief access to unlock device labels
    let labelStream = null;
    try { labelStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); } catch (_) {}

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === 'videoinput');

    if (labelStream) labelStream.getTracks().forEach((t) => t.stop());

    if (!cameras.length) {
      sel.innerHTML = '<option value="">No cameras found</option>';
      return;
    }
    sel.innerHTML = cameras.map((d, i) =>
      `<option value="${d.deviceId}">${d.label || `Camera ${i + 1}`}</option>`
    ).join('');
    pip.deviceId = cameras[0].deviceId;
    sel.value    = pip.deviceId;
  } catch (err) {
    log.warn('Camera enumeration failed:', err.message);
    sel.innerHTML = '<option value="">Camera access denied</option>';
  }
}

// ── Camera preview (UI only) ──────────────────────────────────────────────────
async function startCameraPreview() {
  stopCameraPreview();
  const previewEl  = $('pip-preview-video');
  const errEl      = $('pip-preview-err');
  const errMsgEl   = $('pip-preview-err-msg');
  if (!previewEl) return;
  try {
    const constraints = {
      video: pip.deviceId ? { deviceId: { exact: pip.deviceId } } : true,
      audio: false,
    };
    pip.previewStream = await navigator.mediaDevices.getUserMedia(constraints);
    previewEl.srcObject = pip.previewStream;
    previewEl.style.display = 'block';
    if (errEl) errEl.style.display = 'none';
  } catch (err) {
    log.warn('Camera preview failed:', err.message);
    if (previewEl) previewEl.style.display = 'none';
    if (errEl) {
      errEl.style.display = 'flex';
      if (errMsgEl) errMsgEl.textContent = err.name === 'NotAllowedError'
        ? 'Camera permission denied' : `Camera unavailable: ${err.message}`;
    }
  }
}

function stopCameraPreview() {
  const previewEl = $('pip-preview-video');
  if (previewEl) previewEl.srcObject = null;
  if (pip.previewStream) {
    pip.previewStream.getTracks().forEach((t) => t.stop());
    pip.previewStream = null;
  }
}

// ── Camera recording stream ───────────────────────────────────────────────────
async function startCameraRecordStream() {
  try {
    const constraints = {
      video: pip.deviceId
        ? { deviceId: { exact: pip.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };
    pip.stream = await navigator.mediaDevices.getUserMedia(constraints);

    pip.video = document.createElement('video');
    pip.video.srcObject   = pip.stream;
    pip.video.muted       = true;
    pip.video.autoplay    = true;
    pip.video.playsInline = true;

    // CRITICAL: attach to DOM so Chromium doesn't throttle/freeze playback.
    // Off-screen (not in DOM) video elements lose frame updates in Chromium.
    pip.video.style.cssText =
      'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:-9999px;left:-9999px;';
    document.body.appendChild(pip.video);

    await pip.video.play().catch((e) => log.warn('pip.video.play() failed:', e.message));

    // Wait up to 1s for the camera to start delivering frames
    await new Promise((resolve) => {
      if (pip.video.readyState >= 2) { resolve(); return; }
      const onReady = () => { resolve(); pip.video.removeEventListener('canplay', onReady); };
      pip.video.addEventListener('canplay', onReady);
      setTimeout(resolve, 1000);
    });

    log.info('Camera recording stream started, readyState:', pip.video.readyState);
    return true;
  } catch (err) {
    log.warn('Camera stream failed:', err.message);
    notify(`Camera unavailable — recording without PiP: ${err.message}`, 'info');
    return false;
  }
}

function stopCameraRecordStream() {
  if (pip.video) {
    pip.video.srcObject = null;
    if (pip.video.parentNode) pip.video.parentNode.removeChild(pip.video);
    pip.video = null;
  }
  if (pip.stream) {
    pip.stream.getTracks().forEach((t) => t.stop());
    pip.stream = null;
  }
}

// ── PiP compositing ───────────────────────────────────────────────────────────
function getPipRect(canvasW, canvasH) {
  const fraction = PIP_SIZE_FRACTIONS[pip.size] || PIP_SIZE_FRACTIONS.md;
  const camAR = (pip.video && pip.video.videoWidth && pip.video.videoHeight)
    ? pip.video.videoWidth / pip.video.videoHeight : 16 / 9;
  const pipW = Math.round(canvasW * fraction);
  const pipH = Math.round(pipW / camAR);
  const pad  = PIP_PADDING;
  const positions = {
    tl: { x: pad,                   y: pad },
    tr: { x: canvasW - pipW - pad,  y: pad },
    bl: { x: pad,                   y: canvasH - pipH - pad },
    br: { x: canvasW - pipW - pad,  y: canvasH - pipH - pad },
  };
  const { x, y } = positions[pip.position] || positions.br;
  return { x, y, w: pipW, h: pipH };
}

function drawPip(ctx, canvasW, canvasH) {
  // readyState >= 2 = HAVE_CURRENT_DATA (has at least one frame)
  if (!pip.enabled || !pip.video || pip.video.readyState < 2) return;
  const { x, y, w, h } = getPipRect(canvasW, canvasH);
  const r = 10;

  // Rounded clip
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(pip.video, x, y, w, h);
  ctx.restore();

  // White border
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = 2.5;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

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
  showSection('pip-section',           isVideo || isGif);
  showSection('source-section',        true);
}
updateSections();

// ── Load stored prefs ─────────────────────────────────────────────────────────
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

async function resolvePrimaryScreenId() {
  const sources = await api.recorder.getSources();
  const screen  = sources.find((s) => s.name === 'Entire Screen' || s.name.startsWith('Screen '));
  return screen?.id || sources[0]?.id || null;
}

// ── Main flow ─────────────────────────────────────────────────────────────────
async function startFlow() {
  $('start-btn').disabled = true;
  try {
    if (state.sourceType === 'region') {
      const region = await api.recorder.pickRegion();
      if (!region) { $('start-btn').disabled = false; return; }
      state.region   = region;
      state.sourceId = await resolvePrimaryScreenId();
      if (!state.sourceId) {
        notify('No screen source found for region capture.', 'error');
        $('start-btn').disabled = false;
        return;
      }
    }
    if (state.sourceType === 'screen')                         state.sourceId = await resolvePrimaryScreenId();
    if (state.sourceType === 'window' && !state.sourceId) { notify('No window selected.', 'error'); $('start-btn').disabled = false; return; }
    if (state.delaySecs > 0)   await runDelay(state.delaySecs);
    if (state.mode === 'screenshot') await takeScreenshot();
    else                             await startRecording();
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
      num.style.animation = 'none'; void num.offsetWidth; num.style.animation = '';
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
    if (state.sourceType === 'window' && state.sourceId) src = sources.find((s) => s.id === state.sourceId);
    else src = sources.find((s) => s.name === 'Entire Screen' || s.name.startsWith('Screen '));
    if (!src?.thumbnail) throw new Error('Could not capture screen.');
    let imgBytes;
    if (state.region) imgBytes = await cropRegionFromBase64Png(src.thumbnail, state.region);
    else              imgBytes = Uint8Array.from(atob(src.thumbnail), (c) => c.charCodeAt(0));
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

function cropRegionFromBase64Png(base64Png, region) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = region.width; canvas.height = region.height;
      canvas.getContext('2d').drawImage(img, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
      canvas.toBlob((blob) => blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject), 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load screenshot image'));
    img.src = `data:image/png;base64,${base64Png}`;
  });
}

// ── Desktop stream acquisition ────────────────────────────────────────────────
async function getDesktopStream() {
  if (!state.sourceId) throw new Error('No capture source resolved.');
  const videoConstraints = {
    mandatory: {
      chromeMediaSource:   'desktop',
      chromeMediaSourceId: state.sourceId,
      minWidth: 1, maxWidth: 3840, minHeight: 1, maxHeight: 2160,
    },
  };

  let stream;
  if (state.audioSource === 'system') {
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

// ── Recording orchestrator ────────────────────────────────────────────────────
async function startRecording() {
  try { state.stream = await getDesktopStream(); }
  catch (e) { log.error('Cannot access video source:', e.message); notify('Cannot access video source: ' + e.message, 'error'); return; }

  if (pip.enabled) {
    const ok = await startCameraRecordStream();
    if (ok) stopCameraPreview(); // free preview stream; recording stream is separate
  }

  state.recording   = true;
  state.elapsedSecs = 0;
  state.gifFrames   = [];
  setUI(true);

  const isGif = state.mode === 'gif';
  setStatus(true, isGif ? 'Recording GIF…' : `Recording ${state.videoFormat.toUpperCase()}…`, isGif ? 'gif-dot' : 'rec-dot');
  api.recorder.setRecordingState(true, state.mode);

  state.elapsedTimer = setInterval(() => {
    state.elapsedSecs++;
    const rem = state.durationSecs > 0 ? state.durationSecs - state.elapsedSecs : null;
    setCountdown(rem !== null ? fmtTime(rem) : fmtTime(state.elapsedSecs));
    if (rem !== null && rem <= 0) stopAndSave();
  }, 1000);

  if (isGif) startGifCapture();
  else       startVideoCapture();
}

// ── Video capture ─────────────────────────────────────────────────────────────
function startVideoCapture() {
  const chunks    = [];
  const hasPip    = pip.enabled && !!pip.stream;
  const needsCanvas = !!(state.region || hasPip);

  let mimeType = 'video/webm;codecs=vp8';
  if (state.videoFormat === 'mp4') {
    const mp4Codecs = ['video/mp4;codecs=h264', 'video/mp4;codecs=avc1', 'video/mp4'];
    const supported = mp4Codecs.find((m) => MediaRecorder.isTypeSupported(m));
    mimeType = supported || 'video/webm;codecs=vp8';
    if (!supported) log.warn('MP4 codec not natively supported — saving as WebM with .mp4 extension.');
  }
  if (state.videoFormat === 'mkv') {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm;codecs=vp8';
  }

  if (needsCanvas) {
    // Use only video tracks for the <video> element.
    // Feeding audio+video streams to a <video> element can cause zero-dimension
    // issues on Linux (especially with system audio). Audio tracks are handled
    // separately — we add them to the canvas capture stream directly.
    const videoOnlyStream = new MediaStream(state.stream.getVideoTracks());
    const srcVid = document.createElement('video');
    srcVid.srcObject   = videoOnlyStream;
    srcVid.muted       = true;
    srcVid.playsInline = true;
    srcVid.play().catch((e) => log.warn('srcVid.play() failed:', e.message));

    state._srcVid = srcVid;

    const setupCanvas = () => {
      const srcW = state.region ? state.region.width  : srcVid.videoWidth  || 1280;
      const srcH = state.region ? state.region.height : srcVid.videoHeight || 720;
      log.info(`Video canvas: ${srcW}×${srcH} region=${!!state.region} pip=${hasPip}`);

      const canvas = document.createElement('canvas');
      canvas.width  = srcW;
      canvas.height = srcH;
      const ctx = canvas.getContext('2d');

      state._drawInterval = setInterval(() => {
        if (srcVid.readyState < 2) return;
        if (state.region) {
          ctx.drawImage(srcVid, state.region.x, state.region.y,
            state.region.width, state.region.height, 0, 0, srcW, srcH);
        } else {
          ctx.drawImage(srcVid, 0, 0, srcW, srcH);
        }
        drawPip(ctx, srcW, srcH);
      }, 1000 / 30);

      // Build the recording stream: canvas video + original audio tracks
      const canvasStream = canvas.captureStream(30);
      state.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

      startMediaRecorder(canvasStream, chunks, mimeType, () => {
        // Cleanup after onstop: stop tracks HERE (not before) so all data is flushed
        srcVid.srcObject = null;
        if (state._srcVid === srcVid) state._srcVid = null;
        state.stream?.getTracks().forEach((t) => t.stop());
        if (state.audioStream) { state.audioStream.getTracks().forEach((t) => t.stop()); state.audioStream = null; }
      });
    };

    if (srcVid.readyState >= 1) setupCanvas();
    else srcVid.addEventListener('loadedmetadata', setupCanvas, { once: true });

  } else {
    // Direct stream recording — no canvas needed
    startMediaRecorder(state.stream, chunks, mimeType, () => {
      state.stream?.getTracks().forEach((t) => t.stop());
      if (state.audioStream) { state.audioStream.getTracks().forEach((t) => t.stop()); state.audioStream = null; }
    });
  }
}

function startMediaRecorder(stream, chunks, mimeType, onCleanup) {
  try {
    state.recorder = new MediaRecorder(stream, { mimeType });
  } catch (e) {
    log.warn('MediaRecorder init failed, falling back:', e.message);
    state.recorder = new MediaRecorder(stream);
  }
  state.recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  state.recorder.onstop = async () => {
    // Stop tracks FIRST so Chromium flushes remaining buffered audio
    if (onCleanup) onCleanup();
    const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
    const arr  = new Uint8Array(await blob.arrayBuffer());
    const ext  = state.videoFormat;
    const folder = state.videoFolder || (await api.prefs?.get('videoFolder', '')) || null;
    await finishSave(arr, `recording-${fmtDate()}.${ext}`, ext, folder);
  };
  state.recorder.start(500);
  log.info('MediaRecorder started, mimeType:', mimeType);
}

// ── GIF capture ───────────────────────────────────────────────────────────────
function startGifCapture() {
  const GIF_MAX_WIDTH  = 800;
  const GIF_MAX_FRAMES = 600; // 60s @ 10fps, 30s @ 20fps

  // CRITICAL: use only the VIDEO track of the desktop stream.
  // Setting srcObject to a stream with system audio can cause videoWidth=0
  // on Linux (the video element struggles with mixed audio+video desktop streams),
  // producing an unplayable 0×0 GIF.
  const videoOnlyStream = new MediaStream(state.stream.getVideoTracks());

  const video = document.createElement('video');
  video.srcObject   = videoOnlyStream;
  video.muted       = true;
  video.playsInline = true;
  video.play().catch((e) => log.warn('GIF video.play() failed:', e.message));

  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d', { willReadFrequently: true });
  const interval = Math.round(1000 / state.fps);

  // Use 'canplay' (readyState ≥ 3) not 'loadedmetadata' (readyState = 1).
  // On Linux desktop streams, loadedmetadata fires before actual pixel data
  // is available, so every interval tick sees readyState < 2 and is skipped —
  // producing an effective ~1fps capture despite a 10fps setting.
  const startGifInterval = () => {
    if (state._drawInterval) return; // guard against double-start

    const srcW = state.region ? state.region.width  : video.videoWidth;
    const srcH = state.region ? state.region.height : video.videoHeight;

    if (!srcW || !srcH) {
      log.error(`GIF: zero dimensions (${srcW}×${srcH}) — aborting`);
      notify('GIF capture failed: could not determine screen dimensions. Try again.', 'error');
      stopAndSave();
      return;
    }

    const scale = srcW > GIF_MAX_WIDTH ? GIF_MAX_WIDTH / srcW : 1;
    const gifW  = Math.round(srcW * scale);
    const gifH  = Math.round(srcH * scale);
    canvas.width  = gifW;
    canvas.height = gifH;
    log.info(`GIF: ${srcW}×${srcH} → ${gifW}×${gifH} @ ${state.fps}fps, readyState=${video.readyState}`);

    const frameCounterEl = $('gif-frame-counter');
    const frameCountEl   = $('gif-frame-count');
    const memEstEl       = $('gif-mem-est');
    if (frameCounterEl) frameCounterEl.style.display = 'block';

    state._drawInterval = setInterval(() => {
      if (!state.recording) return;
      if (state.gifFrames.length >= GIF_MAX_FRAMES) {
        log.warn(`GIF: frame cap (${GIF_MAX_FRAMES}) reached`);
        stopAndSave();
        return;
      }

      try {
        if (state.region) {
          ctx.drawImage(video, state.region.x, state.region.y,
            state.region.width, state.region.height, 0, 0, gifW, gifH);
        } else {
          ctx.drawImage(video, 0, 0, gifW, gifH);
        }
        drawPip(ctx, gifW, gifH);
        const id = ctx.getImageData(0, 0, gifW, gifH);
        state.gifFrames.push({ data: new Uint8ClampedArray(id.data), width: gifW, height: gifH, delay: interval });
        if (frameCountEl) frameCountEl.textContent = state.gifFrames.length;
        if (memEstEl) memEstEl.textContent = Math.round(state.gifFrames.length * gifW * gifH * 4 / 1024 / 1024);
      } catch (e) {
        log.warn('GIF frame skip:', e.message);
      }
    }, interval);
  };

  // Start as soon as we have actual pixel data (canplay = readyState 3+)
  video.addEventListener('canplay', startGifInterval, { once: true });
  // Fallback: if canplay doesn't fire within 2s, start anyway
  setTimeout(() => { if (state.recording && !state._drawInterval) startGifInterval(); }, 2000);

  state._srcVid = video;
}

// ── Stop & Save ───────────────────────────────────────────────────────────────
async function stopAndSave() {
  if (!state.recording) return;
  state.recording = false;
  clearInterval(state.elapsedTimer);
  clearInterval(state._drawInterval);
  state._drawInterval = null;

  if (state.autoStopTimer) { clearTimeout(state.autoStopTimer); state.autoStopTimer = null; }

  setStatus(true, 'Saving…', 'scrn-dot');
  api.recorder.setRecordingState(false);
  setUI(false);

  // Stop camera overlay — restart preview if still enabled
  stopCameraRecordStream();
  if (pip.enabled) setTimeout(() => startCameraPreview(), 400);

  if (state.mode === 'gif') {
    // For GIF: stop desktop stream now (not needed anymore), then encode
    if (state._srcVid) { state._srcVid.srcObject = null; state._srcVid = null; }
    state.stream?.getTracks().forEach((t) => t.stop());
    if (state.audioStream) { state.audioStream.getTracks().forEach((t) => t.stop()); state.audioStream = null; }
    await encodeAndSaveGif();
  } else if (state.recorder) {
    // For video: stop the recorder first. Tracks are stopped INSIDE onstop
    // (via onCleanup) so all buffered data is flushed before we close streams.
    // We clean up srcVid AFTER stop() so the canvas keeps producing frames
    // until the recorder has processed everything.
    state.recorder.stop();
    // srcVid cleanup happens in onCleanup inside onstop
    // NOTE: do NOT stop state.stream here — onCleanup inside onstop does it
  }
}

// ── GIF encoder ───────────────────────────────────────────────────────────────
async function encodeAndSaveGif() {
  if (!state.gifFrames.length) { setStatus(false); notify('No frames captured.', 'error'); return; }

  const { width, height } = state.gifFrames[0];
  if (!width || !height) {
    state.gifFrames = [];
    setStatus(false);
    notify('GIF encoding failed: zero-size frames. Try a different source.', 'error');
    return;
  }

  const frameCount = state.gifFrames.length;
  log.info(`GIF encode: ${frameCount} frames @ ${width}×${height}`);

  try {
    // Streaming encoder: each frame is quantized+LZW-encoded in addFrame() immediately.
    // Raw RGBA is released after each addFrame(). We yield every frame so the UI stays
    // responsive and Electron IPC does not time out on the final data transfer.
    const enc = new GifEncoder(width, height, { loop: 0 });
    for (let i = 0; i < frameCount; i++) {
      if (i % 10 === 0) setStatus(true, `Building GIF… ${i}/${frameCount} frames`, 'scrn-dot');
      enc.addFrame(state.gifFrames[i].data, state.gifFrames[i].delay);
      state.gifFrames[i] = null;                           // release raw RGBA immediately
      await new Promise((r) => setTimeout(r, 0));          // yield every frame
    }
    state.gifFrames = [];

    setStatus(true, 'Finalising GIF…', 'scrn-dot');
    await new Promise((r) => setTimeout(r, 0));

    const bytes  = enc.finish();
    const folder = state.videoFolder || (await api.prefs?.get('videoFolder', '')) || null;
    await finishSave(bytes, `recording-${fmtDate()}.gif`, 'gif', folder);
  } catch (err) {
    state.gifFrames = [];
    setStatus(false);
    log.error('GIF encode error:', err.message);
    if (err instanceof RangeError) {
      notify(`GIF encoding ran out of memory.
Try shorter recording, lower FPS (${state.fps}fps), or Region mode.`, 'error');
    } else {
      notify('GIF encoding failed: ' + err.message, 'error');
    }
  }
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
