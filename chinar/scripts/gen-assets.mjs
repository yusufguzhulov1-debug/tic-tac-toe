#!/usr/bin/env node
/**
 * Generates every image the site ships with: an SVG brand mark, SVG art
 * placeholders for photography, and real PNG icons for the manifest and
 * iOS home screen. No binary dependencies — PNGs are encoded here with
 * node:zlib.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'src', 'assets', 'img');
mkdirSync(OUT, { recursive: true });

/* ---------------------------------------------------------------- PNG --- */

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encode RGBA pixels (Uint8Array, w*h*4) as a PNG buffer. */
function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));

/**
 * The brand mark: a chinar (plane-tree) leaf drawn as the lens where two
 * circles overlap, on a dark ember field.
 */
function drawIcon(size, { padding = 0.12 } = {}) {
  const px = new Uint8Array(size * size * 4);
  const bg = [26, 19, 16];
  const ember = [214, 106, 52];
  const saffron = [240, 176, 84];
  const r = size * (0.5 - padding) * 1.32;
  const c = size / 2;
  const offset = r * 0.62;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      // rotate 45° so the lens stands upright
      const dx = x - c;
      const dy = y - c;
      const rx = (dx + dy) * Math.SQRT1_2;
      const ry = (dy - dx) * Math.SQRT1_2;

      const d1 = Math.hypot(rx + offset, ry) - r;
      const d2 = Math.hypot(rx - offset, ry) - r;
      const inside = Math.max(d1, d2);          // signed distance to the lens
      const vein = Math.abs(rx) - size * 0.012; // central rib

      let colour = bg;
      let alpha = 255;
      if (inside < 0) {
        const t = (ry + r) / (2 * r);
        colour = mix(ember, saffron, 1 - t);
        if (vein < 0) colour = mix(colour, bg, 0.45);
      } else if (inside < 1.2) {
        colour = mix(bg, ember, 1 - inside / 1.2); // 1px antialias band
      }
      px[i] = colour[0];
      px[i + 1] = colour[1];
      px[i + 2] = colour[2];
      px[i + 3] = alpha;
    }
  }
  return encodePng(size, size, px);
}

/** Social preview card as a real PNG — crawlers do not render SVG. */
function drawBanner(width, height) {
  const px = new Uint8Array(width * height * 4);
  const coal = [26, 19, 16];
  const deep = [92, 42, 20];
  const ember = [194, 86, 44];
  const saffron = [240, 176, 84];

  const cx = width * 0.78;
  const cy = height * 0.5;
  const r = height * 0.54;
  const offset = r * 0.62;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const t = (x / width + y / height) / 2;
      let colour = mix(coal, deep, t);

      // warm glow behind the mark
      const glow = Math.hypot(x - cx, y - cy) / (r * 2.4);
      if (glow < 1) colour = mix(colour, ember, (1 - glow) * 0.35);

      // leaf: lens of two circles, rotated 45 degrees
      const dx = x - cx;
      const dy = y - cy;
      const rx = (dx + dy) * Math.SQRT1_2;
      const ry = (dy - dx) * Math.SQRT1_2;
      const inside = Math.max(Math.hypot(rx + offset, ry) - r, Math.hypot(rx - offset, ry) - r);
      if (inside < 0) {
        const g = (ry + r) / (2 * r);
        let leaf = mix(ember, saffron, 1 - g);
        if (Math.abs(rx) < width * 0.004) leaf = mix(leaf, coal, 0.5);
        colour = leaf;
      } else if (inside < 1.4) {
        colour = mix(colour, ember, 1 - inside / 1.4);
      }

      px[i] = colour[0];
      px[i + 1] = colour[1];
      px[i + 2] = colour[2];
      px[i + 3] = 255;
    }
  }
  return encodePng(width, height, px);
}

/* ---------------------------------------------------------------- SVG --- */

/** The lens where two equal circles overlap — a leaf silhouette. */
const leafPath = (cx, cy, r) => {
  const o = r * 0.62;
  const half = Math.sqrt(Math.max(r * r - o * o, 0));
  const n = (v) => Number(v.toFixed(2));
  return `M${n(cx)} ${n(cy - half)} A${n(r)} ${n(r)} 0 0 1 ${n(cx)} ${n(cy + half)} A${n(r)} ${n(r)} 0 0 1 ${n(cx)} ${n(cy - half)}Z`;
};

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Chinar">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#c2562c"/><stop offset="1" stop-color="#f0b054"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="#1a1310"/>
  <g transform="rotate(-45 32 32)">
    <path d="${leafPath(32, 32, 22)}" fill="url(#g)"/>
    <path d="M32 12 V52" stroke="#1a1310" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/>
  </g>
</svg>
`;

function artSvg({ width, height, seed = 0, tone = 0 }) {
  const hues = [
    ['#2a1a12', '#7c3a1d', '#e0913f'],
    ['#181f1a', '#2f5d3a', '#a8c47a'],
    ['#221419', '#8a3b3f', '#e8a06a'],
    ['#1b1710', '#6b4f1f', '#f0c674'],
    ['#12181f', '#2c4a6b', '#9fc0d8'],
    ['#251a10', '#94541f', '#f2b26b'],
  ][(tone + 6) % 6];
  const rnd = (n) => {
    // deterministic pseudo-random so rebuilds are byte-identical
    const x = Math.sin((seed + 1) * 9973 + n * 7919) * 43758.5453;
    return x - Math.floor(x);
  };
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const cx = rnd(i * 3) * width;
    const cy = rnd(i * 3 + 1) * height;
    const r = (0.18 + rnd(i * 3 + 2) * 0.3) * Math.min(width, height);
    const fill = i % 2 ? hues[2] : hues[1];
    const op = 0.18 + rnd(i + 9) * 0.22;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${op.toFixed(2)}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="presentation">
  <defs>
    <linearGradient id="bg${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${hues[0]}"/><stop offset="1" stop-color="${hues[1]}"/>
    </linearGradient>
    <filter id="soft${seed}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${(Math.min(width, height) * 0.06).toFixed(1)}"/>
    </filter>
    <filter id="grain${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${seed}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.09"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg${seed})"/>
  <g filter="url(#soft${seed})">${blobs}</g>
  <rect width="${width}" height="${height}" filter="url(#grain${seed})" opacity="0.7"/>
</svg>
`;
}

function ogSvg(brand, tagline) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="og" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1310"/><stop offset="1" stop-color="#5c2a14"/>
    </linearGradient>
    <linearGradient id="leaf" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#c2562c"/><stop offset="1" stop-color="#f0b054"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#og)"/>
  <circle cx="1010" cy="140" r="220" fill="#e0913f" opacity="0.16"/>
  <g transform="translate(980 330) rotate(-45) scale(2.6)">
    <path d="${leafPath(0, 0, 60)}" fill="url(#leaf)" opacity="0.92"/>
  </g>
  <text x="90" y="300" fill="#fbf8f4" font-family="Georgia, serif" font-size="96" font-weight="600">${brand}</text>
  <text x="94" y="368" fill="#f0b054" font-family="system-ui, sans-serif" font-size="34" letter-spacing="2">${tagline}</text>
</svg>
`;
}

/* --------------------------------------------------------------- write --- */

const write = (name, data) => {
  writeFileSync(join(OUT, name), data);
  return `${name} (${(Buffer.byteLength(data) / 1024).toFixed(1)} kB)`;
};

const written = [];
written.push(write('logo.svg', logoSvg));
written.push(write('hero.svg', artSvg({ width: 1600, height: 900, seed: 1, tone: 0 })));
written.push(write('about-1.svg', artSvg({ width: 600, height: 800, seed: 2, tone: 1 })));
written.push(write('about-2.svg', artSvg({ width: 600, height: 800, seed: 3, tone: 5 })));
for (let i = 1; i <= 6; i += 1) {
  written.push(write(`gallery-${i}.svg`, artSvg({ width: 1200, height: 900, seed: 10 + i, tone: i })));
}

const brandName = process.env.CHINAR_BRAND || 'Чинар';
const brandTagline = process.env.CHINAR_TAGLINE || 'Кавказская кухня на живом огне';
written.push(write('og.svg', ogSvg(brandName, brandTagline)));

written.push(write('og.png', drawBanner(1200, 630)));
written.push(write('apple-touch-icon.png', drawIcon(180)));
written.push(write('icon-192.png', drawIcon(192)));
written.push(write('icon-512.png', drawIcon(512)));
written.push(write('maskable-512.png', drawIcon(512, { padding: 0.22 })));

console.log(`Generated ${written.length} assets in src/assets/img:`);
for (const line of written) console.log('  •', line);
