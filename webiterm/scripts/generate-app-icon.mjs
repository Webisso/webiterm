import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const size = 1024;
const raw = Buffer.alloc((size * 4 + 1) * size);

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function pixel(x, y) {
  const cx = size / 2;
  const cy = size / 2;
  const half = 430;
  const radius = 210;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  const qx = dx - half + radius;
  const qy = dy - half + radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
  if (outside > 1.5) {
    return [0, 0, 0, 0];
  }
  const alpha = outside > 0 ? Math.max(0, 1 - outside) : 1;
  let r = 20;
  let g = 22;
  let b = 27;
  const border = outside > -18 && outside <= 1.5;
  if (border) {
    r = 58;
    g = 64;
    b = 74;
  }

  const px = (x - cx) / size;
  const py = (y - cy) / size;
  const chevron = chevronDistance(px, py);
  if (chevron < 0.012) {
    const t = Math.max(0, Math.min(1, (0.012 - chevron) / 0.012));
    r = mix(r, 142, t);
    g = mix(g, 171, t);
    b = mix(b, 255, t);
  }

  return [r, g, b, Math.round(alpha * 255)];
}

function chevronDistance(px, py) {
  const upper = segmentDistance(px, py, -0.08, -0.16, 0.16, 0);
  const lower = segmentDistance(px, py, -0.08, 0.16, 0.16, 0);
  const bar = segmentDistance(px, py, -0.16, 0.28, 0.02, 0.28);
  return Math.min(upper, lower, bar);
}

function segmentDistance(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const length = vx * vx + vy * vy;
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / length));
  const dx = px - (x1 + t * vx);
  const dy = py - (y1 + t * vy);
  return Math.hypot(dx, dy);
}

for (let y = 0; y < size; y += 1) {
  const row = y * (size * 4 + 1);
  raw[row] = 0;
  for (let x = 0; x < size; x += 1) {
    const [r, g, b, a] = pixel(x, y);
    const index = row + 1 + x * 4;
    raw[index] = r;
    raw[index + 1] = g;
    raw[index + 2] = b;
    raw[index + 3] = a;
  }
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  signature,
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

const output = new URL("../assets/app-icon.png", import.meta.url);
mkdirSync(new URL("../assets/", import.meta.url), { recursive: true });
writeFileSync(output, png);
