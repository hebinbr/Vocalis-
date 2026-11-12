import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter type 0
    rgbaBuffer.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function blendPixel(dst, idx, r, g, b, a) {
  const alpha = Math.max(0, Math.min(1, a));
  if (alpha <= 0) return;
  const inv = 1 - alpha;
  dst[idx] = Math.round(r * alpha + dst[idx] * inv);
  dst[idx + 1] = Math.round(g * alpha + dst[idx + 1] * inv);
  dst[idx + 2] = Math.round(b * alpha + dst[idx + 2] * inv);
  dst[idx + 3] = Math.min(255, Math.round((alpha + (dst[idx + 3] / 255) * inv) * 255));
}

function renderVocalisIcon(size, { maskable = false, roundClip = false } = {}) {
  const ss = 3; // 3x supersampling for smooth antialiasing
  const w = size;
  const h = size;
  const out = Buffer.alloc(w * h * 4);

  const scale = maskable ? 0.72 : 1.0;
  const offset = (1 - scale) * 0.5;

  const toNorm = (coord) => ((coord / 192) * scale + offset);

  const vLeft = { x: toNorm(52), y: toNorm(64) };
  const vMid = { x: toNorm(96), y: toNorm(142) };
  const vRight = { x: toNorm(140), y: toNorm(64) };
  const vStroke = (14 / 192) * scale * 0.5;

  const wLeft = { x: toNorm(74), y: toNorm(96) };
  const wMid = { x: toNorm(96), y: toNorm(118) };
  const wRight = { x: toNorm(118), y: toNorm(96) };
  const wStroke = (8 / 192) * scale * 0.5;

  const dot = { x: toNorm(96), y: toNorm(62), r: (8.5 / 192) * scale };
  const cornerRadius = maskable ? 0 : 42 / 192;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      let accA = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (px + (sx + 0.5) / ss) / w;
          const v = (py + (sy + 0.5) / ss) / h;

          let bgAlpha = 1;
          if (roundClip) {
            const distCenter = Math.hypot(u - 0.5, v - 0.5);
            bgAlpha = distCenter <= 0.5 ? 1 : 0;
          } else if (cornerRadius > 0) {
            const qx = Math.max(Math.abs(u - 0.5) - (0.5 - cornerRadius), 0);
            const qy = Math.max(Math.abs(v - 0.5) - (0.5 - cornerRadius), 0);
            const distCorner = Math.hypot(qx, qy);
            bgAlpha = distCorner <= cornerRadius ? 1 : 0;
          }

          if (bgAlpha === 0) continue;

          // Diagonal gradient #0d9488 -> #0f766e
          const gradT = Math.max(0, Math.min(1, (u + v) * 0.5));
          let r = 13 + (15 - 13) * gradT;
          let g = 148 + (118 - 148) * gradT;
          let b = 136 + (110 - 136) * gradT;

          // Subtle inner highlight radial glow
          const glow = Math.max(0, 1 - Math.hypot(u - 0.35, v - 0.25) * 1.6);
          r += glow * 16;
          g += glow * 22;
          b += glow * 18;

          // Mint wave stroke (#99f6e4)
          const dWave = Math.min(
            distToSegment(u, v, wLeft.x, wLeft.y, wMid.x, wMid.y),
            distToSegment(u, v, wMid.x, wMid.y, wRight.x, wRight.y)
          );
          if (dWave <= wStroke) {
            r = 153;
            g = 246;
            b = 228;
          }

          // Primary white V stroke (#ffffff)
          const dV = Math.min(
            distToSegment(u, v, vLeft.x, vLeft.y, vMid.x, vMid.y),
            distToSegment(u, v, vMid.x, vMid.y, vRight.x, vRight.y)
          );
          if (dV <= vStroke) {
            r = 255;
            g = 255;
            b = 255;
          }

          // Cyan resonance dot (#5eead4)
          const dDot = Math.hypot(u - dot.x, v - dot.y);
          if (dDot <= dot.r) {
            r = 94;
            g = 234;
            b = 212;
          }

          accR += r;
          accG += g;
          accB += b;
          accA += bgAlpha;
        }
      }

      const samples = ss * ss;
      const idx = (py * w + px) * 4;
      if (accA > 0) {
        out[idx] = Math.min(255, Math.round(accR / accA));
        out[idx + 1] = Math.min(255, Math.round(accG / accA));
        out[idx + 2] = Math.min(255, Math.round(accB / accA));
        out[idx + 3] = Math.min(255, Math.round((accA / samples) * 255));
      }
    }
  }

  return encodePng(w, h, out);
}

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderVocalisIcon(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderVocalisIcon(512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderVocalisIcon(512, { maskable: true }));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderVocalisIcon(180, { maskable: true }));

const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

for (const m of mipmaps) {
  const resDir = path.resolve('android/app/src/main/res', m.dir);
  fs.mkdirSync(resDir, { recursive: true });
  fs.writeFileSync(path.join(resDir, 'ic_launcher.png'), renderVocalisIcon(m.size));
  fs.writeFileSync(path.join(resDir, 'ic_launcher_round.png'), renderVocalisIcon(m.size, { roundClip: true }));
}

console.log('Generated PWA & Android launcher PNG icons successfully.');
