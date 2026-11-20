import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'assets');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PALETTE = {
  ear: [0xa9, 0x74, 0x4f],
  earInner: [0xca, 0xa0, 0x78],
  head: [0xbd, 0x85, 0x5e],
  muzzle: [0xe7, 0xc7, 0xa8],
  eye: [0x3a, 0x24, 0x15],
  nose: [0x3a, 0x24, 0x15],
  white: [0xff, 0xff, 0xff],
  blush: [0xe8, 0x9a, 0x8a],
};

function inEllipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

// 用归一化坐标画一只圆脸小熊，超采样做抗锯齿。
function sample(nx, ny) {
  let color = null;
  if (inEllipse(nx, ny, 0.27, 0.25, 0.155, 0.155)
      || inEllipse(nx, ny, 0.73, 0.25, 0.155, 0.155)) color = PALETTE.ear;
  if (inEllipse(nx, ny, 0.27, 0.25, 0.078, 0.078)
      || inEllipse(nx, ny, 0.73, 0.25, 0.078, 0.078)) color = PALETTE.earInner;
  if (inEllipse(nx, ny, 0.5, 0.56, 0.4, 0.39)) color = PALETTE.head;
  if (inEllipse(nx, ny, 0.5, 0.665, 0.225, 0.175)) color = PALETTE.muzzle;
  if (inEllipse(nx, ny, 0.385, 0.52, 0.048, 0.052)
      || inEllipse(nx, ny, 0.615, 0.52, 0.048, 0.052)) color = PALETTE.eye;
  if (inEllipse(nx, ny, 0.398, 0.505, 0.016, 0.016)
      || inEllipse(nx, ny, 0.628, 0.505, 0.016, 0.016)) color = PALETTE.white;
  if (inEllipse(nx, ny, 0.5, 0.6, 0.052, 0.036)) color = PALETTE.nose;
  if (color) {
    if (inEllipse(nx, ny, 0.295, 0.635, 0.062, 0.04)
        || inEllipse(nx, ny, 0.705, 0.635, 0.062, 0.04)) {
      color = mix(color, PALETTE.blush, 0.55);
    }
  }
  return color;
}

function render(size, supersample = 4) {
  const rgba = Buffer.alloc(size * size * 4);
  const total = supersample * supersample;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const nx = (x + (sx + 0.5) / supersample) / size;
          const ny = (y + (sy + 0.5) / supersample) / size;
          const color = sample(nx, ny);
          if (color) {
            r += color[0];
            g += color[1];
            b += color[2];
            hits += 1;
          }
        }
      }
      const idx = (y * size + x) * 4;
      if (hits > 0) {
        rgba[idx] = Math.round(r / hits);
        rgba[idx + 1] = Math.round(g / hits);
        rgba[idx + 2] = Math.round(b / hits);
        rgba[idx + 3] = Math.round((hits / total) * 255);
      }
    }
  }
  return rgba;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon.png'), encodePNG(256, 256, render(256, 4)));
writeFileSync(join(OUT, 'tray.png'), encodePNG(32, 32, render(32, 8)));
console.log('icons written to', OUT);
