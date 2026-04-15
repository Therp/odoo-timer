/**
 * gif-encoder.js — Streaming GIF89a encoder (pure JS, no dependencies).
 *
 * Each frame is quantized and LZW-encoded immediately inside addFrame(),
 * so raw RGBA data is never held in memory across frames.  Only the compressed
 * output bytes accumulate.  This prevents OOM for long recordings and avoids
 * the blocking synchronous finish() that previously caused IPC transfer timeouts.
 *
 * Usage:
 *   const enc = new GifEncoder(width, height, { loop: 0 });
 *   enc.addFrame(rgbaUint8ClampedArray, delayMs);   // process immediately
 *   const bytes = enc.finish();                      // Uint8Array — write to file
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

function w(n) { return [n & 0xff, (n >> 8) & 0xff]; }

/**
 * Push all elements of src into dst without spread (avoids stack-overflow for
 * large arrays, which happens when src.length > ~65,536 with push(...src)).
 */
function pushAll(dst, src) {
  for (let i = 0; i < src.length; i++) dst.push(src[i]);
}

/**
 * Wrap a flat byte array into GIF sub-blocks (max 255 bytes each).
 * Returns a flat array: [len, b0, b1, …, len, b0, b1, …, 0]
 */
function subBlocks(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    const len = Math.min(255, bytes.length - i);
    out.push(len);
    for (let j = 0; j < len; j++) out.push(bytes[i++]);
  }
  out.push(0); // block terminator
  return out;
}

// ── LZW compression ───────────────────────────────────────────────────────────

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eofCode   = clearCode + 1;
  let codeSize    = minCodeSize + 1;
  let nextCode    = eofCode + 1;

  const table = new Map();
  const initTable = () => {
    table.clear();
    for (let i = 0; i < clearCode; i++) table.set(String(i), i);
    codeSize = minCodeSize + 1;
    nextCode = eofCode + 1;
  };

  const out = [];
  initTable();
  out.push(clearCode);

  let prefix = '';
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const key = prefix === '' ? String(idx) : `${prefix},${idx}`;
    if (table.has(key)) {
      prefix = key;
    } else {
      out.push(table.get(prefix));
      if (nextCode < 4096) {
        table.set(key, nextCode++);
        if (nextCode > (1 << codeSize)) codeSize++;
      } else {
        out.push(clearCode);
        initTable();
      }
      prefix = String(idx);
    }
  }
  if (prefix !== '') out.push(table.get(prefix));
  out.push(eofCode);

  // Pack codes into bytes
  const bytes = [];
  let buf = 0, bits = 0;
  for (const code of out) {
    buf |= code << bits;
    bits += codeSize;
    while (bits >= 8) { bytes.push(buf & 0xff); buf >>= 8; bits -= 8; }
  }
  if (bits > 0) bytes.push(buf & 0xff);
  return bytes;
}

// ── Median-cut color quantization ─────────────────────────────────────────────

function quantize(pixels, maxColors) {
  const n = pixels.length >> 2;

  // Sample every Nth pixel for speed on large images
  const step = Math.max(1, Math.floor(n / 20000));
  const hist  = new Map();
  for (let i = 0; i < n; i += step) {
    const o   = i << 2;
    const key = (pixels[o] >> 2) << 12 | (pixels[o + 1] >> 2) << 6 | (pixels[o + 2] >> 2);
    hist.set(key, (hist.get(key) || 0) + 1);
  }

  let colors = [];
  for (const [key, cnt] of hist) {
    colors.push({
      r:   ((key >> 12) & 0x3f) << 2,
      g:   ((key >>  6) & 0x3f) << 2,
      b:    (key        & 0x3f) << 2,
      cnt,
    });
  }

  function range(list, ch) {
    let mn = 255, mx = 0;
    for (const c of list) { if (c[ch] < mn) mn = c[ch]; if (c[ch] > mx) mx = c[ch]; }
    return mx - mn;
  }

  function cut(list, depth) {
    if (depth === 0 || list.length <= 1) {
      const tot = list.reduce((s, c) => s + c.cnt, 0);
      if (!tot) return [[0, 0, 0]];
      let r = 0, g = 0, b = 0;
      for (const c of list) { r += c.r * c.cnt; g += c.g * c.cnt; b += c.b * c.cnt; }
      return [[Math.round(r / tot), Math.round(g / tot), Math.round(b / tot)]];
    }
    const rr = range(list, 'r'), gr = range(list, 'g'), br = range(list, 'b');
    const ch = rr >= gr && rr >= br ? 'r' : gr >= br ? 'g' : 'b';
    list.sort((a, b) => a[ch] - b[ch]);
    const mid = Math.floor(list.length / 2);
    return [...cut(list.slice(0, mid), depth - 1), ...cut(list.slice(mid), depth - 1)];
  }

  const depth   = Math.ceil(Math.log2(maxColors));
  let palette   = cut(colors, depth);

  // Pad to maxColors if needed
  while (palette.length < maxColors) palette.push([0, 0, 0]);
  palette = palette.slice(0, maxColors);

  // Map each pixel to nearest palette entry
  const map = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o   = i << 2;
    const pr  = pixels[o], pg = pixels[o + 1], pb = pixels[o + 2];
    let best = 0, bestDist = Infinity;
    for (let j = 0; j < palette.length; j++) {
      const dr = pr - palette[j][0], dg = pg - palette[j][1], db = pb - palette[j][2];
      const d  = dr * dr + dg * dg + db * db;
      if (d < bestDist) { bestDist = d; best = j; }
    }
    map[i] = best;
  }

  return { palette, map };
}

// ── Streaming GIF encoder ─────────────────────────────────────────────────────

export class GifEncoder {
  /**
   * @param {number} width
   * @param {number} height
   * @param {{ loop?: number, colors?: number }} opts
   */
  constructor(width, height, { loop = 0, colors = 256 } = {}) {
    this.width      = width;
    this.height     = height;
    this.loop       = loop;
    this.maxColors  = Math.min(256, Math.max(2, colors));
    this._colorBits = Math.ceil(Math.log2(this.maxColors));
    this._colorCount = 1 << this._colorBits;
    this._out       = [];         // compressed output bytes accumulate here
    this._started   = false;      // header written?
    this._frames    = 0;
  }

  /**
   * Encode one frame immediately.  Raw rgba data is quantized and LZW-encoded
   * right now; no reference to the rgba buffer is retained after this call.
   *
   * @param {Uint8ClampedArray} rgba  - canvas getImageData().data
   * @param {number}            delayMs - frame delay in milliseconds
   */
  addFrame(rgba, delayMs = 100) {
    const { width, height, _colorBits, _colorCount } = this;
    const delay = Math.round(delayMs / 10); // GIF uses centiseconds

    // Quantize this frame
    const q = quantize(rgba, _colorCount);

    // ── Write GIF header before the first frame ──────────────────────────────
    if (!this._started) {
      this._started = true;

      // Signature + version
      pushAll(this._out, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // 'GIF89a'

      // Logical Screen Descriptor
      pushAll(this._out, w(width));
      pushAll(this._out, w(height));
      this._out.push(0x80 | (_colorBits - 1)); // Global Color Table Flag
      this._out.push(0);                        // background color index
      this._out.push(0);                        // pixel aspect ratio

      // Global Color Table (from first frame's palette — improves compat)
      for (const [r, g, b] of q.palette) this._out.push(r, g, b);

      // Netscape Application Extension (loop)
      if (this.loop !== null) {
        pushAll(this._out, [0x21, 0xff, 0x0b]);
        pushAll(this._out, [78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48]); // NETSCAPE2.0
        pushAll(this._out, [3, 1, ...w(this.loop), 0]);
      }
    }

    // ── Graphics Control Extension ───────────────────────────────────────────
    this._out.push(0x21, 0xf9, 0x04);
    this._out.push(0x04);               // disposal: restore to background
    pushAll(this._out, w(delay));
    this._out.push(0);                  // transparent color index (none)
    this._out.push(0);                  // block terminator

    // ── Image Descriptor ─────────────────────────────────────────────────────
    this._out.push(0x2c);
    pushAll(this._out, w(0)); pushAll(this._out, w(0));   // left, top
    pushAll(this._out, w(width)); pushAll(this._out, w(height));
    this._out.push(0x80 | (_colorBits - 1));              // Local Color Table Flag

    // Local Color Table
    for (const [r, g, b] of q.palette) this._out.push(r, g, b);

    // Image Data
    const minCode = Math.max(2, _colorBits);
    this._out.push(minCode);
    // Use pushAll (not spread) to avoid JS argument-count limit on large arrays
    pushAll(this._out, subBlocks(lzwEncode(q.map, minCode)));

    this._frames++;
  }

  /**
   * Finalize the GIF and return the complete byte array.
   * After calling finish(), do not call addFrame() again.
   * @returns {Uint8Array}
   */
  finish() {
    this._out.push(0x3b); // GIF Trailer
    return new Uint8Array(this._out);
  }
}
