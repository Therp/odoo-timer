/**
 * gif-encoder.js — Minimal GIF89a encoder (pure JS, no dependencies).
 *
 * Usage:
 *   const enc = new GifEncoder(width, height, { loop: 0 });
 *   enc.addFrame(rgbaUint8ClampedArray, delayMs);
 *   const bytes = enc.finish();   // Uint8Array — write to file
 */

// ── LZW compression ──────────────────────────────────────────────────────────

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

  const out  = [];   // output code stream
  initTable();
  out.push(clearCode);

  let prefix = '';
  for (let i = 0; i < indices.length; i++) {
    const idx  = indices[i];
    const key  = prefix === '' ? String(idx) : `${prefix},${idx}`;
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

// ── Median-cut color quantization ────────────────────────────────────────────

function quantize(pixels, maxColors) {
  // pixels: flat RGBA Uint8ClampedArray  →  returns { palette: [[r,g,b]…], map: Uint8Array }
  const n = pixels.length >> 2;

  // Build histogram (sample for speed on large images)
  const step = Math.max(1, Math.floor(n / 20000));
  const hist = new Map();
  for (let i = 0; i < n; i += step) {
    const o = i << 2;
    const key = (pixels[o] >> 2) << 12 | (pixels[o+1] >> 2) << 6 | (pixels[o+2] >> 2);
    hist.set(key, (hist.get(key) || 0) + 1);
  }

  // Convert histogram to color list
  let colors = [];
  for (const [key, cnt] of hist) {
    colors.push({
      r: ((key >> 12) & 0x3f) << 2,
      g: ((key >>  6) & 0x3f) << 2,
      b:  (key        & 0x3f) << 2,
      cnt,
    });
  }

  // Median-cut recursion
  function cut(list, depth) {
    if (depth === 0 || list.length <= 1) {
      const tot = list.reduce((s, c) => s + c.cnt, 0);
      if (!tot) return [[0,0,0]];
      let r=0, g=0, b=0;
      for (const c of list) { r += c.r*c.cnt; g += c.g*c.cnt; b += c.b*c.cnt; }
      return [[Math.round(r/tot), Math.round(g/tot), Math.round(b/tot)]];
    }
    const rr = range(list,'r'), gr = range(list,'g'), br = range(list,'b');
    const ch = rr >= gr && rr >= br ? 'r' : gr >= br ? 'g' : 'b';
    list.sort((a,b) => a[ch]-b[ch]);
    const mid = Math.floor(list.length / 2);
    return [...cut(list.slice(0,mid), depth-1), ...cut(list.slice(mid), depth-1)];
  }
  function range(list, ch) {
    let mn=255, mx=0;
    for (const c of list) { if (c[ch]<mn) mn=c[ch]; if (c[ch]>mx) mx=c[ch]; }
    return mx-mn;
  }

  const depth = Math.ceil(Math.log2(maxColors));
  const palette = cut(colors, depth).slice(0, maxColors);
  while (palette.length < maxColors) palette.push([0,0,0]);

  // Map each pixel to nearest palette index
  const indexMap = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    const pr = pixels[o], pg = pixels[o+1], pb = pixels[o+2];
    let best = 0, bestD = Infinity;
    for (let j = 0; j < palette.length; j++) {
      const dr=pr-palette[j][0], dg=pg-palette[j][1], db=pb-palette[j][2];
      const d = dr*dr + dg*dg + db*db;
      if (d < bestD) { bestD=d; best=j; }
    }
    indexMap[i] = best;
  }
  return { palette, map: indexMap };
}

// ── GIF byte helpers ──────────────────────────────────────────────────────────

function b(n) { return n & 0xff; }
function w(n) { return [n & 0xff, (n >> 8) & 0xff]; }

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

// ── GifEncoder class ──────────────────────────────────────────────────────────

export class GifEncoder {
  constructor(width, height, { loop = 0, colors = 256 } = {}) {
    this.width    = width;
    this.height   = height;
    this.loop     = loop;       // 0 = infinite
    this.maxColors = Math.min(256, Math.max(2, colors));
    this._frames  = [];
  }

  /**
   * @param {Uint8ClampedArray} rgba - raw pixel data from canvas.getImageData()
   * @param {number} delayMs - frame delay in milliseconds
   */
  addFrame(rgba, delayMs = 100) {
    this._frames.push({ rgba, delay: Math.round(delayMs / 10) }); // GIF uses centiseconds
  }

  finish() {
    const { width, height, maxColors } = this;
    const colorBits = Math.ceil(Math.log2(maxColors));
    const colorCount = 1 << colorBits;     // must be power of 2
    const out = [];

    // ── Header ──────────────────────────────────────────────────────────────
    for (const c of 'GIF89a') out.push(c.charCodeAt(0));

    // Logical Screen Descriptor
    out.push(...w(width), ...w(height));
    out.push(0x80 | (colorBits - 1));  // Global Color Table Flag + color resolution
    out.push(0);                        // Background color index
    out.push(0);                        // Pixel aspect ratio

    // Use first frame's palette as global palette (improves compat)
    const firstQuant = quantize(this._frames[0].rgba, colorCount);
    for (const [r,g,b_] of firstQuant.palette) out.push(r, g, b_);

    // Netscape loop extension
    if (this.loop !== null) {
      out.push(0x21, 0xff, 0x0b);
      for (const c of 'NETSCAPE2.0') out.push(c.charCodeAt(0));
      out.push(3, 1, ...w(this.loop), 0);
    }

    // ── Frames ──────────────────────────────────────────────────────────────
    for (const frame of this._frames) {
      const q = quantize(frame.rgba, colorCount);

      // Graphics Control Extension
      out.push(0x21, 0xf9, 0x04);
      out.push(0x04);                   // disposal: restore to background
      out.push(...w(frame.delay));      // delay in centiseconds
      out.push(0);                      // transparent color index (none)
      out.push(0);                      // block terminator

      // Image Descriptor
      out.push(0x2c);
      out.push(...w(0), ...w(0));       // left, top
      out.push(...w(width), ...w(height));
      out.push(0x80 | (colorBits - 1)); // Local Color Table Flag
      // Local Color Table
      for (const [r,g,b_] of q.palette) out.push(r, g, b_);

      // Image Data
      const minCode = Math.max(2, colorBits);
      out.push(minCode);
      out.push(...subBlocks(lzwEncode(q.map, minCode)));
    }

    out.push(0x3b); // Trailer
    return new Uint8Array(out);
  }
}
