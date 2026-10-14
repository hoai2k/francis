// Procedural HD (32x32, "Faithful 32x"-style) pixel-art block textures with
// matching normal maps and a per-pixel gloss channel. Everything is painted at
// start-up into one atlas (and a sprite atlas for alpha-tested decorations),
// so there are no image files to download.
//
// Pipeline per tile:
//   1. Key blocks (stone, bricks, planks, grass, dirt, cobble, logs, leaves…)
//      are painted natively at 32x32 with clustered, posterised noise so they
//      read as hand-painted pixel art. The rest are painted on the original
//      16x16 grid and upscaled with an edge-aware Scale2x pass.
//   2. A detail pass bakes crevice AO from the height map, a top-left emboss
//      highlight, fine grain, low-frequency colour variation and a chiselled
//      bevel, then derives a crisp normal map and a gloss (alpha) channel.
import * as THREE from 'three/webgpu';
import { mulberry32, hashStr, clamp } from '../util.js';

export const TILE = 32;          // HD pixels per tile (what the atlas stores)
const LO = 16;                   // grid of the legacy painters (upscaled 2x)
const CELL = 64;                 // atlas cell incl. gutter (mip-safe down to 2px)
const PAD = (CELL - TILE) / 2;
const COLS = 16, ROWS = 8;
export const ATLAS_W = COLS * CELL, ATLAS_H = ROWS * CELL;

// ---------------------------------------------------------------- helpers
// A painter receives (px, r) where px.set(x,y,[r,g,b], height) and r is a
// seeded RNG; px.N is the grid size (16 or 32). Height (0..1) feeds the
// normal map, AO and gloss; the bevel is added later.
const C = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const jitter = (c, r, amt) => { const f = 1 + (r() - 0.5) * amt; return shade(c, f); };
const post = (v, steps) => Math.round(v * steps) / steps;

// Periodic value noise over the tile (so floors tile seamlessly). nx/ny are
// the lattice sizes along x/y; returns f(u, v) with u, v in tile pixels.
function valueNoise(r, nx, ny = nx, N = TILE) {
  const g = new Float32Array(nx * ny);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const G = (i, j) => g[(((j % ny) + ny) % ny) * nx + (((i % nx) + nx) % nx)];
  return (x, y) => {
    const fx = x / N * nx, fy = y / N * ny;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    let tx = fx - x0, ty = fy - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = G(x0, y0) + (G(x0 + 1, y0) - G(x0, y0)) * tx;
    const b = G(x0, y0 + 1) + (G(x0 + 1, y0 + 1) - G(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
}
// Fractal noise in 0..1 (centred on 0.5); layers: [[nx, ny, weight], ...]
function fbm(r, layers = [[4, 4, 0.5], [8, 8, 0.3], [16, 16, 0.2]], N = TILE) {
  const fs = layers.map(([nx, ny]) => valueNoise(r, nx, ny, N));
  const wsum = layers.reduce((s, l) => s + l[2], 0);
  return (x, y) => { let v = 0; for (let i = 0; i < fs.length; i++) v += fs[i](x, y) * layers[i][2]; return v / wsum; };
}

// Clustered fill: a palette indexed by posterised fractal noise so colours form
// soft blobs (HD-pack look) instead of per-pixel TV static.
function clusterFill(px, r, cols, { amt = 0.06, hAmt = 0.5, layers, steps } = {}) {
  const N = px.N, n = fbm(r, layers, N);
  const k = steps ?? cols.length;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = clamp((n(x, y) - 0.5) * 2.4 + 0.5, 0, 0.999);
    const idx = Math.floor(post(v, k - 1) * (cols.length - 1) + 0.0001);
    const c = cols[clamp(idx, 0, cols.length - 1)];
    px.set(x, y, jitter(c, r, amt), 0.5 + (v - 0.5) * hAmt);
  }
}

function noiseFill(px, r, cols, amt = 0.18, hAmt = 0.5) {
  const N = px.N;
  if (N > LO) { clusterFill(px, r, sortByLum(cols), { amt: amt * 0.45, hAmt }); return; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = cols[Math.floor(r() * cols.length)];
    const h = 0.5 + (r() - 0.5) * hAmt;
    px.set(x, y, jitter(c, r, amt), h);
  }
}
const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
const sortByLum = (cols) => cols.slice().sort((a, b) => lum(a) - lum(b));

// Bricks; sizes are given on the 16-grid and scaled to px.N.
function bricks(px, r, base, mortar, { bw = 8, bh = 4, offset = 4, crack = 0, moss = 0, mossCol } = {}) {
  const N = px.N, k = N / LO;
  bw *= k; bh *= k; offset *= k;
  const mt = k;                                  // mortar thickness (HD: 2px)
  const n = fbm(r, [[4, 4, 0.5], [8, 8, 0.3], [16, 16, 0.2]], N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const row = Math.floor(y / bh);
    const ox = (row % 2) * offset;
    const bx = (x + ox) % bw, by = y % bh;
    const isM = by >= bh - mt || bx >= bw - mt;
    if (isM) {
      const mo = jitter(mortar, r, 0.12);
      // mortar is shadowed right under the brick above
      px.set(x, y, by === bh - mt && k > 1 && !(bx >= bw - mt) ? shade(mo, 0.82) : mo, 0.08 + r() * 0.05);
      continue;
    }
    const brickId = row * 7 + Math.floor((x + ox) / bw);
    const rb = mulberry32(brickId * 97 + 13);
    const tone = 1 + (rb() - 0.5) * 0.22;
    let c = shade(base, tone);
    const v = n(x, y);
    c = shade(c, 1 + post((v - 0.5) * 2, 3) * (k > 1 ? 0.07 : 0.04));
    c = jitter(c, r, k > 1 ? 0.05 : 0.12);
    let h = 0.72 + (v - 0.5) * 0.3;
    const inner = bw - mt - 1, innerH = bh - mt - 1;
    if (bx === 0 || by === 0) { c = shade(c, 1.12); h = 0.86; }
    else if (bx === inner || by === innerH) { c = shade(c, 0.86); h = 0.62; }
    // HD: chipped corners and the odd pit
    if (k > 1) {
      const corner = (bx === 0 || bx === inner) && (by === 0 || by === innerH);
      if (corner && (brickId * 13 + (bx ? 1 : 0) + (by ? 2 : 0)) % 3 === 0) { px.set(x, y, shade(mortar, 0.9), 0.15); continue; }
      if (rb() < 0.012) { c = shade(c, 0.78); h = 0.35; }
    }
    px.set(x, y, c, h);
  }
  if (moss) {
    const mn = fbm(r, [[4, 4, 0.6], [8, 8, 0.4]], N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = mn(x, y) + (1 - y / N) * 0.12;
      if (v > 0.72 - moss * 0.012) px.set(x, y, jitter(shade(mossCol, v > 0.8 - moss * 0.012 ? 1.12 : 0.92), r, 0.2), 0.9);
    }
    // drips of moss / blood running down from the clumps
    for (let i = 0; i < moss; i++) {
      let x = Math.floor(r() * N), y = Math.floor(r() * N);
      for (let s = 0; s < 6 * k; s++) {
        px.set(x, y, jitter(mossCol, r, 0.3), 0.9);
        x = clamp(x + Math.round(r() * 2 - 1) * (r() < 0.3 ? 1 : 0), 0, N - 1); y = clamp(y + (r() < 0.7 ? 1 : 0), 0, N - 1);
      }
    }
  }
  for (let i = 0; i < crack; i++) {
    let x = Math.floor(r() * N), y = Math.floor(r() * 4 * k);
    for (let s = 0; s < 10 * k; s++) {
      px.set(x, y, shade(mortar, 0.5), 0.0);
      if (k > 1 && r() < 0.5) px.set(x + 1, y, shade(mortar, 0.8), 0.25);
      x = clamp(x + Math.round(r() * 2 - 1), 0, N - 1); y = clamp(y + 1, 0, N - 1);
    }
  }
}
function planks(px, r, base, { dir = 'h', ph = 4, dark = 0.72 } = {}) {
  const N = px.N, k = N / LO;
  ph *= k;
  const grainN = dir === 'h' ? valueNoise(r, 2, 16, N) : valueNoise(r, 16, 2, N);
  const fineN = dir === 'h' ? valueNoise(r, 4, 32, N) : valueNoise(r, 32, 4, N);
  const knots = [];
  if (k > 1) for (let i = 0; i < 2; i++) knots.push([r() * N, r() * N, 1.5 + r() * 1.5]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const a = dir === 'h' ? y : x, b = dir === 'h' ? x : y;
    const plank = Math.floor(a / ph);
    const ia = a % ph;
    const seam = ia === ph - 1;
    const joint = (b + plank * 5 * k) % N === 0;
    const rp = mulberry32(plank * 31 + 7);
    let c = jitter(base, rp, 0.18);
    let grain;
    if (k > 1) {
      const fv = fineN(x, y);
      grain = post((grainN(x, y) - 0.5) * 2, 3) * 0.1 + (fv - 0.5) * 0.08 - (fv < 0.22 ? 0.1 : 0);
      for (const [kx, ky, kr] of knots) {
        const d = Math.hypot((x - kx) * (dir === 'h' ? 0.6 : 1.4), (y - ky) * (dir === 'h' ? 1.4 : 0.6));
        if (d < kr * 2.2) grain += Math.sin(d * 2.4) * 0.07 - (d < kr * 0.6 ? 0.12 : 0);
      }
    } else grain = Math.sin((b + rp() * 20) * 0.9 + a * 2.1) * 0.06;
    c = shade(c, 1 + grain + (r() - 0.5) * (k > 1 ? 0.04 : 0.08));
    let h = 0.7 + grain;
    if (k > 1 && ia === 0) { c = shade(c, 1.08); h = 0.8; }
    if (k > 1 && ia === ph - 2) { c = shade(c, 0.9); h = 0.6; }
    if (seam || joint) { c = shade(base, dark * (k > 1 ? 0.85 : 1)); h = 0.1; }
    px.set(x, y, c, h);
  }
  // nail heads
  for (let i = 0; i < 2; i++) {
    const nx = (2 + i * 11) * k, ny = 1 * k;
    const p = dir === 'h' ? [nx, ny] : [ny, nx];
    px.set(p[0], p[1], shade(base, 0.42), 0.95);
    if (k > 1) { px.set(p[0] + 1, p[1], shade(base, 0.55), 0.9); px.set(p[0], p[1] + 1, shade(base, 0.55), 0.9); px.set(p[0] + 1, p[1] + 1, shade(base, 0.36), 0.85); }
  }
}
// Rounded stones packed with mortar between them (periodic Voronoi).
function stones(px, r, { count = 11, stone, mortar, tone = 0.3, mortarW = 1.4, flat = false }) {
  const N = px.N, pts = [];
  for (let i = 0; i < count; i++) pts.push([r() * N, r() * N, 1 + (r() - 0.5) * tone, r()]);
  const n = fbm(r, [[8, 8, 0.6], [16, 16, 0.4]], N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let d1 = 1e9, d2 = 1e9, best = 0;
    for (let i = 0; i < pts.length; i++) {
      let dx = Math.abs(x + 0.5 - pts[i][0]), dy = Math.abs(y + 0.5 - pts[i][1]);
      dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy);
      const d = Math.hypot(dx, dy);
      if (d < d1) { d2 = d1; d1 = d; best = i; } else if (d < d2) d2 = d;
    }
    const edge = d2 - d1;
    if (edge < mortarW) { px.set(x, y, jitter(mortar, r, 0.15), 0.05 + edge * 0.05); continue; }
    const p = pts[best];
    const dome = flat ? 1 : clamp(edge / 7, 0, 1);
    const v = post((n(x, y) - 0.5) * 2, 3);
    let c = shade(stone, p[2] * (0.84 + 0.22 * Math.sqrt(dome)) * (1 + v * 0.06));
    if (p[3] < 0.25) c = mix(c, shade(stone, 0.9), 0.3);
    px.set(x, y, jitter(c, r, 0.04), 0.3 + Math.sqrt(dome) * 0.6 + v * 0.05);
  }
}
function grassSide(px, r, dirtCols, grassCols, { drip = 0.18 } = {}) {
  const N = px.N;
  clusterFill(px, r, dirtCols, { amt: 0.05, hAmt: 0.5 });
  pebbles(px, r, dirtCols, 6);
  const dn = valueNoise(r, 8, 1, N);
  for (let x = 0; x < N; x++) {
    let d = Math.round(5 + dn(x, 0) * 4 + r() * 2);
    if (r() < drip) d += 3 + Math.floor(r() * 4);
    for (let y = 0; y < d; y++) {
      const t = y / d;
      const c = grassCols[clamp(Math.floor((1 - t) * grassCols.length * 0.999 - r() * 1.2), 0, grassCols.length - 1)];
      px.set(x, y, jitter(c, r, 0.08), 0.85 - t * 0.15);
    }
    // grass casts a 1px shadow onto the dirt
    const o = px.get(x, d); if (o) px.set(x, d, shade(o.c, 0.72), 0.3);
  }
}
function pebbles(px, r, cols, n) {
  const N = px.N;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * (N - 2)), y = Math.floor(r() * (N - 2));
    const c = shade(cols[cols.length - 1], 1.15 + r() * 0.15);
    px.set(x, y, c, 0.9); px.set(x + 1, y, shade(c, 0.92), 0.85);
    px.set(x, y + 1, shade(c, 0.8), 0.75); px.set(x + 1, y + 1, shade(c, 0.66), 0.6);
  }
  for (let i = 0; i < n; i++) px.set(Math.floor(r() * N), Math.floor(r() * N), shade(cols[0], 0.7), 0.2);
}

// ---------------------------------------------------------------- HD painters
// Native 32x32 painters for the blocks seen most. Return false to fall back to
// the 16x16 painter + upscale.
function paintHD(name, px, r) {
  const N = px.N;
  switch (name) {
    case 'stone': {
      const n = fbm(r, [[2, 4, 0.35], [4, 8, 0.35], [8, 16, 0.3]], N);
      const base = C(0x7c7c82);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = post((n(x, y) - 0.5) * 2.6, 4);
        px.set(x, y, jitter(shade(base, 1 + v * 0.14), r, 0.035), 0.5 + v * 0.24);
      }
      // dark smudges and light flecks, like the vanilla stone streaks
      for (let i = 0; i < 9; i++) {
        const x = r() * N | 0, y = r() * N | 0, len = 2 + (r() * 4 | 0);
        for (let k = 0; k < len; k++) px.set(x + k, y, shade(base, 0.74 + k * 0.02), 0.2);
        px.set(x, y + 1, shade(base, 0.86), 0.35);
      }
      for (let i = 0; i < 10; i++) { const x = r() * N | 0, y = r() * N | 0; px.set(x, y, shade(base, 1.2), 0.75); }
      return true;
    }
    case 'cobble': stones(px, r, { count: 12, stone: C(0x8a8a8e), mortar: C(0x4c4c50), tone: 0.36 }); return true;
    case 'stone_brick': bricks(px, r, C(0x77767c), C(0x4a4a50), { bw: 8, bh: 8, offset: 4 }); return true;
    case 'mossy_brick': bricks(px, r, C(0x6f7270), C(0x464a46), { bw: 8, bh: 8, offset: 4, moss: 6, mossCol: C(0x4f7a3a) }); return true;
    case 'cracked_brick': bricks(px, r, C(0x716f75), C(0x403f44), { bw: 8, bh: 8, offset: 4, crack: 3 }); return true;
    case 'dark_brick': bricks(px, r, C(0x3b3440), C(0x1f1a24), { bw: 8, bh: 4, offset: 4 }); return true;
    case 'red_brick': bricks(px, r, C(0x8e4a3c), C(0x6b5d55), { bw: 8, bh: 4, offset: 4 }); return true;
    case 'blood_brick': bricks(px, r, C(0x5a2a2e), C(0x2a1416), { bw: 8, bh: 8, offset: 4, moss: 5, mossCol: C(0x8a1414) }); return true;
    case 'talisman_wall': {
      bricks(px, r, C(0x6b6770), C(0x3c3a40), { bw: 8, bh: 8, offset: 4 });
      // paper talisman with shadow, red header, brush strokes
      for (let y = 6; y < 28; y++) for (let x = 12; x < 20; x++) px.set(x + 1, y + 1, shade(C(0x3c3a40), 0.8), 0.3);
      for (let y = 6; y < 28; y++) for (let x = 12; x < 20; x++) px.set(x, y, y < 9 ? jitter(C(0xc93a2a), r, 0.05) : jitter(C(0xe8d9a0), r, 0.04), 0.95);
      for (let y = 11; y < 25; y++) if ((y % 4) !== 0) { px.set(15 + ((y >> 1) & 1), y, C(0xa81f1f), 0.97); if (y % 3 === 0) px.set(14, y, C(0xb82a22), 0.97); }
      for (let x = 12; x < 20; x += 2) px.set(x, 27, C(0xc8b880), 0.9);
      return true;
    }
    case 'dirt': {
      const cols = [C(0x4a3323), C(0x5d402c), C(0x6b4a33), C(0x7a553a)];
      clusterFill(px, r, cols, { amt: 0.06, hAmt: 0.5 });
      pebbles(px, r, cols, 7);
      return true;
    }
    case 'grass_top': case 'cursed_grass_top': case 'moss_floor': {
      const cols = name === 'grass_top' ? [C(0x3f7429), C(0x4b8533), C(0x58963b), C(0x66a646), C(0x74b550)]
        : name === 'cursed_grass_top' ? [C(0x2a3626), C(0x34422e), C(0x3e4e35), C(0x4a3a52), C(0x4e5e3e)]
          : [C(0x2c4422), C(0x37532a), C(0x446332), C(0x5a4a33), C(0x527238)];
      clusterFill(px, r, cols, { amt: 0.05, hAmt: 0.6, layers: [[4, 4, 0.4], [8, 8, 0.3], [32, 32, 0.3]] });
      // blade accents: short light strokes with a dark root
      for (let i = 0; i < 70; i++) {
        const x = r() * N | 0, y = r() * N | 0, l = 1 + (r() * 2 | 0);
        for (let k = 0; k < l; k++) px.set(x, y - k, shade(cols[cols.length - 1], 1.05 + k * 0.06), 0.85);
        px.set(x, y + 1, shade(cols[0], 0.85), 0.3);
      }
      if (name === 'moss_floor') pebbles(px, r, [C(0x3a3a3a), C(0x6a6a66)], 4);
      return true;
    }
    case 'grass_side': grassSide(px, r, [C(0x4e3625), C(0x5d402c), C(0x6b4a33), C(0x7a553a)], [C(0x3f7429), C(0x4b8533), C(0x58963b), C(0x66a646)]); return true;
    case 'cursed_grass_side': grassSide(px, r, [C(0x2c201c), C(0x35261f), C(0x3f2e2a), C(0x4a3830)], [C(0x2a3626), C(0x34422e), C(0x3c4c34), C(0x4a3a52)]); return true;
    case 'sand': {
      const n = fbm(r, [[4, 4, 0.4], [8, 8, 0.3], [32, 32, 0.3]], N), rip = valueNoise(r, 4, 4, N);
      const base = C(0xc8b37e);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = post((n(x, y) - 0.5) * 2 + Math.sin(y * 0.8 + rip(x, y) * 6) * 0.25, 4);
        px.set(x, y, jitter(shade(base, 1 + v * 0.06), r, 0.04), 0.5 + v * 0.12);
      }
      for (let i = 0; i < 14; i++) px.set(r() * N | 0, r() * N | 0, shade(base, r() < 0.5 ? 0.78 : 1.12), 0.6);
      return true;
    }
    case 'planks': planks(px, r, C(0x9a7446)); return true;
    case 'dark_planks': planks(px, r, C(0x4d3421)); return true;
    case 'floor_boards': planks(px, r, C(0x8a6440), { dir: 'v', ph: 4 }); return true;
    case 'log_side': case 'bark_dark': {
      const base = name === 'log_side' ? C(0x5a3d24) : C(0x2e2230);
      const ridge = valueNoise(r, 10, 2, N), fine = valueNoise(r, 32, 6, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = ridge(x, y) * 0.7 + fine(x, y) * 0.3;
        const p = post(v, 4);
        const crev = v < 0.33;
        px.set(x, y, jitter(shade(base, crev ? 0.62 : 0.86 + p * 0.32), r, 0.05), crev ? 0.15 : 0.45 + p * 0.45);
      }
      return true;
    }
    case 'log_top': {
      const wob = valueNoise(r, 6, 6, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - 15.5, y - 15.5) + (wob(x, y) - 0.5) * 2.2;
        if (d > 13.5) { const b = d > 15 ? 0.8 : 1; px.set(x, y, jitter(shade(C(0x4a321e), b), r, 0.12), d > 15 ? 0.4 : 0.7); continue; }
        const ring = post(Math.sin(d * 1.25) * 0.5 + 0.5, 2);
        px.set(x, y, jitter(shade(C(0xa7834f), 0.86 + ring * 0.18 - (d < 1.5 ? 0.15 : 0)), r, 0.04), 0.55 + ring * 0.15);
      }
      for (let i = 0; i < 2; i++) { let x = 16, y = 16; const dx = r() < 0.5 ? 1 : -1, dy = r() < 0.5 ? 1 : -1; for (let k = 0; k < 9; k++) { px.set(x, y, C(0x6e4e2a), 0.2); if (r() < 0.5) x += dx; else y += dy; } }
      return true;
    }
    case 'leaves': case 'dead_leaves': {
      const base = name === 'leaves' ? C(0x3d7a2c) : C(0x4a3860), hole = name === 'leaves' ? C(0x16301a) : C(0x1a1420);
      const n = fbm(r, [[4, 4, 0.45], [8, 8, 0.3], [16, 16, 0.25]], N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = n(x, y), cell = ((x >> 2) * 7 + (y >> 2) * 13) % 5;
        if (v < 0.36 || (r() < 0.05)) { px.set(x, y, jitter(hole, r, 0.2), 0.05); continue; }
        const p = post((v - 0.36) / 0.4, 3);
        px.set(x, y, jitter(shade(base, 0.72 + p * 0.5 + cell * 0.02), r, 0.08), 0.35 + p * 0.6);
      }
      // leaf highlights: little 2px diagonals
      for (let i = 0; i < 28; i++) { const x = r() * N | 0, y = r() * N | 0; if (px.get(x, y)?.h > 0.4) { px.set(x, y, shade(base, 1.32), 0.95); px.set(x + 1, y - 1, shade(base, 1.18), 0.9); } }
      return true;
    }
    case 'obsidian': {
      clusterFill(px, r, [C(0x110d18), C(0x1d1826), C(0x241d30), C(0x2e2340)], { amt: 0.05, hAmt: 0.6 });
      for (let i = 0; i < 12; i++) { const x = r() * N | 0, y = r() * N | 0; px.set(x, y, C(0x6a4a9a), 0.9); px.set(x + 1, y, C(0x3e2d5a), 0.8); }
      return true;
    }
    case 'asphalt': case 'asphalt_line': {
      clusterFill(px, r, [C(0x26272b), C(0x2d2e33), C(0x34353a), C(0x3a3a40)], { amt: 0.12, hAmt: 0.35, layers: [[8, 8, 0.4], [32, 32, 0.6]] });
      for (let i = 0; i < 30; i++) px.set(r() * N | 0, r() * N | 0, r() < 0.5 ? C(0x55565c) : C(0x1c1d20), 0.6);
      if (name === 'asphalt_line') for (let y = 0; y < N; y++) for (let x = 12; x < 20; x++) if (y % 16 < 10) px.set(x, y, jitter(C(0xd9cf9a), r, 0.08), 0.6 + (r() < 0.1 ? -0.2 : 0));
      return true;
    }
    case 'concrete': {
      clusterFill(px, r, [C(0x84837f), C(0x8c8b88), C(0x93928e)], { amt: 0.04, hAmt: 0.2, layers: [[4, 4, 0.5], [32, 32, 0.5]] });
      for (let i = 0; i < 16; i++) px.set(r() * N | 0, r() * N | 0, C(0x6e6d6a), 0.3);
      for (let x = 0; x < N; x++) { px.set(x, N - 1, C(0x6a6966), 0.1); px.set(N - 1, x, C(0x6a6966), 0.1); px.set(x, N - 2, C(0x7a7976), 0.3); px.set(N - 2, x, C(0x7a7976), 0.3); }
      return true;
    }
    case 'tatami': {
      // woven rush: 2px rows alternating tone, stitched every 8px, dark cloth borders
      const n = valueNoise(r, 4, 16, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (x < 3 || x > N - 4) { px.set(x, y, jitter(shade(C(0x2b3a28), x === 1 || x === N - 2 ? 1.2 : 1), r, 0.06), 0.8); continue; }
        const row = y >> 1, weave = ((row + (x >> 2)) & 1) ? 0.94 : 1.04;
        const stitch = (x - 3) % 8 === 0 && (y & 1);
        const c = shade(C(0xb7b074), weave * (0.95 + n(x, y) * 0.1) * (stitch ? 0.82 : 1) * ((y & 1) ? 0.95 : 1));
        px.set(x, y, jitter(c, r, 0.03), 0.5 + (weave - 1) * 2 - ((y & 1) ? 0.06 : 0));
      }
      return true;
    }
    case 'red_lacquer': {
      const n = valueNoise(r, 2, 16, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const band = y < 4 || y > N - 5;
        if (band) { px.set(x, y, jitter(C(0x1d1a1a), r, 0.08), y === 3 || y === N - 4 ? 0.3 : 0.45); continue; }
        const v = post(n(x, y), 3);
        px.set(x, y, jitter(shade(C(0xb5281f), 0.92 + v * 0.14 + (y === 4 ? 0.12 : 0)), r, 0.03), 0.7 + v * 0.1);
      }
      return true;
    }
    case 'plaster': clusterFill(px, r, [C(0xdcd6c8), C(0xe6e0d2), C(0xefe9dc)], { amt: 0.025, hAmt: 0.15 }); return true;
  }
  return false;
}

// Fallback painters on the 16x16 grid (upscaled 2x afterwards). Tiles that
// paintHD() handles natively never reach this switch.
function paintTile(name, px, r) {
  switch (name) {
    case 'roof_tile': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = y >> 2, ox = (row & 1) * 2; const u = (x + ox) % 4;
      const curve = Math.sin((u / 4) * Math.PI);
      const c = shade(C(0x3b4250), 0.7 + curve * 0.45 - (y % 4 === 3 ? 0.25 : 0));
      px.set(x, y, jitter(c, r, 0.06), curve * 0.8 + (y % 4 === 3 ? -0.3 : 0.2));
    } break;
    case 'subway_tile': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const g = x % 8 === 7 || y % 4 === 3; px.set(x, y, g ? C(0x8f9795) : jitter(C(0xd8e0dc), r, 0.05), g ? 0.2 : 0.8);
    } break;
    case 'subway_floor': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const chk = ((x >> 2) + (y >> 2)) & 1; px.set(x, y, jitter(chk ? C(0x55595c) : C(0x6a6e70), r, 0.08), 0.55 + chk * 0.1);
    } break;
    case 'metal_grate': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const hole = (x % 4 !== 0) && (y % 4 !== 0); px.set(x, y, hole ? C(0x1c1e20) : jitter(C(0x6d7479), r, 0.1), hole ? 0.05 : 0.9);
    } break;
    case 'water': noiseFill(px, r, [C(0x2a5a8a), C(0x2f6496), C(0x275584)], 0.08, 0.3); break;
    case 'cursed_pool': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.8 + y * 0.5) * Math.cos(y * 0.9 - x * 0.3);
      px.set(x, y, jitter(mix(C(0x5a1a9a), C(0xd070ff), v * 0.5 + 0.5), r, 0.1), 0.5 + v * 0.3);
    } break;
    case 'lava': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.9 + y * 0.4) * Math.cos(y * 0.7 - x * 0.5);
      px.set(x, y, jitter(mix(C(0xc23a08), C(0xffc23a), v * 0.5 + 0.5), r, 0.1), 0.5 + v * 0.3);
    } break;
    case 'lantern': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x < 1 || x > 14 || y < 2 || y > 13; const rib = y % 4 === 1;
      px.set(x, y, frame ? C(0x1f1612) : rib ? C(0xd8812e) : jitter(C(0xffc766), r, 0.06), frame ? 0.9 : 0.4);
    } break;
    case 'gold_trim': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const p = ((x + y) % 6 === 0); px.set(x, y, jitter(p ? C(0xfff0a0) : C(0xc9a23c), r, 0.1), p ? 0.9 : 0.6);
    } break;
    case 'shoji': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const f = x % 5 === 0 || y % 5 === 0; px.set(x, y, f ? C(0x5a3a22) : jitter(C(0xf2ead0), r, 0.03), f ? 0.9 : 0.3);
    } break;
    case 'polished': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.4 + y * 0.9 + Math.sin(y * 0.5) * 2) * 0.5 + 0.5;
      px.set(x, y, mix(C(0x2a2a33), C(0x4c4c5a), v * 0.6 + r() * 0.1), 0.5);
    } break;
    case 'marble': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.5 + y * 0.8 + Math.sin(x * 0.7) * 2) * 0.5 + 0.5;
      px.set(x, y, mix(C(0xdcdcdc), C(0xa9a9b4), Math.pow(v, 4)), 0.5);
    } break;
    case 'window': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x < 1 || x > 14 || y < 1 || y > 14 || x === 7 || x === 8 || y === 7;
      px.set(x, y, frame ? C(0x2a2c30) : mix(C(0xffd98a), C(0xffb74a), y / 16 + r() * 0.1), frame ? 0.9 : 0.3);
    } break;
    case 'window_dark': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x < 1 || x > 14 || y < 1 || y > 14 || x === 7 || x === 8 || y === 7;
      px.set(x, y, frame ? C(0x2a2c30) : mix(C(0x1a2436), C(0x33476a), 1 - y / 16 + r() * 0.1), frame ? 0.9 : 0.3);
    } break;
    case 'crate': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x < 2 || x > 13 || y < 2 || y > 13; const diag = Math.abs(x - y) < 1.5 || Math.abs(x - (15 - y)) < 1.5;
      const base = edge || diag ? C(0x7b5530) : C(0xa27a47);
      px.set(x, y, jitter(base, r, 0.12), edge || diag ? 0.9 : 0.5);
    } break;
    case 'barrel_side': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const band = y === 2 || y === 3 || y === 12 || y === 13; const stave = x % 4 === 0;
      px.set(x, y, band ? jitter(C(0x55585c), r, 0.1) : jitter(shade(C(0x8a5a32), stave ? 0.75 : 1), r, 0.1), band ? 0.9 : stave ? 0.3 : 0.6);
    } break;
    case 'barrel_top': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      px.set(x, y, d > 6.5 ? C(0x55585c) : jitter(shade(C(0x7a4e2b), x % 4 === 0 ? 0.8 : 1), r, 0.08), d > 6.5 ? 0.9 : 0.5);
    } break;
    case 'bone_block': noiseFill(px, r, [C(0xe0dac4), C(0xd4ceb6)], 0.05, 0.2);
      for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) px.set(x, y, C(0xa9a38e), 0.2);
      break;
    case 'void_floor': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const star = r() < 0.04; px.set(x, y, star ? C(0xcfe8ff) : jitter(C(0x0b0d22), r, 0.4), 0.5);
    } break;
    case 'shrine_floor': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const g = x % 8 === 0 || y % 8 === 0; px.set(x, y, g ? C(0x2a0808) : jitter(C(0x5a1010), r, 0.25), g ? 0.1 : 0.6);
    } break;
    case 'shadow_floor': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.6 + y * 0.3) * 0.5 + 0.5; px.set(x, y, mix(C(0x06060a), C(0x1a1a2a), v * 0.5 + r() * 0.2), 0.3);
    } break;
    case 'vending': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const glass = x > 1 && x < 11 && y > 1 && y < 11; const btn = x > 12 && x < 15 && y % 3 === 1 && y < 11;
      px.set(x, y, glass ? mix(C(0x9fd6ff), C(0xffffff), ((x + y) % 5 === 0) ? 0.6 : 0.1) : btn ? C(0xff4a4a) : jitter(C(0xc2334a), r, 0.05), glass ? 0.3 : 0.8);
    } break;
    case 'sign': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const border = x < 1 || x > 14 || y < 1 || y > 14; const glyph = !border && ((x * 7 + y * 3) % 5 === 0) && y > 3 && y < 12;
      px.set(x, y, border ? C(0x222222) : glyph ? C(0xffffff) : C(0x1d6fd8), 0.5);
    } break;
    case 'neon_pink': noiseFill(px, r, [C(0xff5fb0), C(0xff7ac0)], 0.05, 0.1); break;
    case 'blue_energy': noiseFill(px, r, [C(0x3ad0ff), C(0x6ae0ff), C(0x9ff0ff)], 0.1, 0.2); break;
    case 'rail': noiseFill(px, r, [C(0x3b3129), C(0x453a30)], 0.15, 0.4);
      for (let y = 0; y < 16; y++) { for (const x of [3, 12]) { px.set(x, y, C(0xa7a9ac), 1); px.set(x + 1, y, C(0x7a7c80), 0.9); } }
      for (let y = 1; y < 16; y += 5) for (let x = 0; x < 16; x++) if (x !== 3 && x !== 4 && x !== 12 && x !== 13) px.set(x, y, C(0x5a4030), 0.7);
      break;
    default: noiseFill(px, r, [C(0xff00ff), C(0x000000)], 0, 0);
  }
}


export const TILE_NAMES = [
  'stone', 'stone_brick', 'mossy_brick', 'cracked_brick', 'dark_brick', 'red_brick', 'cobble', 'dirt',
  'grass_top', 'grass_side', 'cursed_grass_top', 'cursed_grass_side', 'moss_floor', 'planks', 'dark_planks', 'floor_boards',
  'log_side', 'log_top', 'roof_tile', 'red_lacquer', 'tatami', 'asphalt', 'asphalt_line', 'concrete',
  'subway_tile', 'subway_floor', 'metal_grate', 'sand', 'water', 'cursed_pool', 'lava', 'lantern',
  'gold_trim', 'plaster', 'shoji', 'obsidian', 'leaves', 'dead_leaves', 'polished', 'marble',
  'window', 'window_dark', 'crate', 'barrel_side', 'barrel_top', 'bone_block', 'talisman_wall', 'blood_brick',
  'void_floor', 'shrine_floor', 'shadow_floor', 'vending', 'sign', 'neon_pink', 'blue_energy', 'rail', 'bark_dark',
];
export const TILE_INDEX = Object.fromEntries(TILE_NAMES.map((n, i) => [n, i]));

// Returns [u0, v0, u1, v1] of a tile's TILE x TILE content area.
export function tileUV(index) {
  const col = index % COLS, row = Math.floor(index / COLS);
  const u0 = (col * CELL + PAD) / ATLAS_W, u1 = (col * CELL + PAD + TILE) / ATLAS_W;
  const v1 = 1 - (row * CELL + PAD) / ATLAS_H, v0 = 1 - (row * CELL + PAD + TILE) / ATLAS_H;
  return [u0, v0, u1, v1];
}
// Average colour per tile (for debris cubes, minimap, particles).
export const tileAvgColor = [];

function makePx(N) {
  const col = new Float32Array(N * N * 3), h = new Float32Array(N * N).fill(0.5);
  return {
    N, col, h,
    set(x, y, c, height = 0.5) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      const i = y * N + x; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; h[i] = height;
    },
    get(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= N || y >= N) return null;
      const i = y * N + x; return { c: [col[i * 3], col[i * 3 + 1], col[i * 3 + 2]], h: h[i] };
    },
  };
}

// Edge-aware 2x upscale (Scale2x with a colour-similarity test instead of
// exact equality, so jittered pixel art still gets rounded diagonals).
function upscale2x(lo) {
  const N = lo.N, hi = makePx(N * 2), M = N * 2;
  const at = (x, y) => clamp(y, 0, N - 1) * N + clamp(x, 0, N - 1);
  const c = lo.col, h = lo.h;
  const sim = (a, b) => Math.abs(c[a * 3] - c[b * 3]) + Math.abs(c[a * 3 + 1] - c[b * 3 + 1]) + Math.abs(c[a * 3 + 2] - c[b * 3 + 2]) < 42 && Math.abs(h[a] - h[b]) < 0.25;
  const put = (x, y, s) => { const o = y * M + x; hi.col[o * 3] = c[s * 3]; hi.col[o * 3 + 1] = c[s * 3 + 1]; hi.col[o * 3 + 2] = c[s * 3 + 2]; hi.h[o] = h[s]; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const E = at(x, y), B = at(x, y - 1), D = at(x - 1, y), F = at(x + 1, y), H = at(x, y + 1);
    let e0 = E, e1 = E, e2 = E, e3 = E;
    if (!sim(B, H) && !sim(D, F)) {
      if (sim(D, B) && !sim(D, E)) e0 = D;
      if (sim(B, F) && !sim(F, E)) e1 = F;
      if (sim(D, H) && !sim(D, E)) e2 = D;
      if (sim(H, F) && !sim(F, E)) e3 = F;
    }
    put(x * 2, y * 2, e0); put(x * 2 + 1, y * 2, e1); put(x * 2, y * 2 + 1, e2); put(x * 2 + 1, y * 2 + 1, e3);
  }
  return hi;
}

// Detail pass: AO from height, emboss light, grain, bevel; returns final
// colour (0..255), gloss byte and bevelled height for the normal map.
function finishTile(px, r, upscaled) {
  const N = px.N, h = px.h;
  const out = new Float32Array(N * N * 3), gloss = new Uint8Array(N * N), H = new Float32Array(N * N);
  const hv = (x, y) => h[clamp(y, 0, N - 1) * N + clamp(x, 0, N - 1)];
  const low = valueNoise(r, 2, 2, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    let blur = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blur += hv(x + dx, y + dy);
    blur /= 9;
    const cav = blur - h[i];
    let f = 1 - clamp(cav, -0.1, 0.4) * 1.15;                 // crevices darker, ridges lighter
    f *= 1 + clamp(hv(x + 1, y + 1) - hv(x - 1, y - 1), -0.5, 0.5) * 0.3;  // lit from top-left
    f *= 1 + (low(x, y) - 0.5) * 0.08;
    f *= 1 + (r() - 0.5) * (upscaled ? 0.06 : 0.03);
    const ed = Math.min(x, y, N - 1 - x, N - 1 - y);
    let b = 0;
    if (ed === 0) { f *= 0.8; b = -0.55; }
    else if (ed === 1) { f *= (x === 1 || y === 1) && x < N - 2 && y < N - 2 ? 1.08 : 0.92; b = -0.2; }
    out[i * 3] = clamp(px.col[i * 3] * f, 0, 255); out[i * 3 + 1] = clamp(px.col[i * 3 + 1] * f, 0, 255); out[i * 3 + 2] = clamp(px.col[i * 3 + 2] * f, 0, 255);
    H[i] = h[i] * 0.6 + b;
    const smooth = clamp((h[i] - 0.45) * 1.1 + (h[i] - blur) * 2.5, 0, 1) * (ed < 2 ? 0.3 : 1);
    gloss[i] = 255 - Math.round(smooth * 75);
  }
  return { out, gloss, H };
}

// Writes a tile + its extruded gutter into ImageData.
function blit(img, index, fn) {
  const col = index % COLS, row = Math.floor(index / COLS);
  const ox = col * CELL, oy = row * CELL;
  const cache = new Array(TILE * TILE);
  for (let i = 0; i < cache.length; i++) cache[i] = fn(i % TILE, Math.floor(i / TILE));
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const sx = clamp(x - PAD, 0, TILE - 1), sy = clamp(y - PAD, 0, TILE - 1);
    const o = ((oy + y) * img.width + ox + x) * 4;
    const c = cache[sy * TILE + sx];
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = c[3] ?? 255;
  }
}

export function buildBlockAtlas() {
  const cv = document.createElement('canvas'); cv.width = ATLAS_W; cv.height = ATLAS_H;
  const nv = document.createElement('canvas'); nv.width = ATLAS_W; nv.height = ATLAS_H;
  const ctx = cv.getContext('2d'), nctx = nv.getContext('2d');
  const img = ctx.createImageData(ATLAS_W, ATLAS_H), nimg = nctx.createImageData(ATLAS_W, ATLAS_H);
  const N = TILE;
  TILE_NAMES.forEach((name, index) => {
    const r = mulberry32(hashStr(name));
    let px = makePx(N), upscaled = false;
    if (!paintHD(name, px, r)) {
      const lo = makePx(LO);
      paintTile(name, lo, r);
      px = upscale2x(lo); upscaled = true;
    }
    const { out, gloss, H } = finishTile(px, mulberry32(hashStr(name) + 1), upscaled);
    let ar = 0, ag = 0, ab = 0;
    for (let i = 0; i < N * N; i++) { ar += out[i * 3]; ag += out[i * 3 + 1]; ab += out[i * 3 + 2]; }
    const n = N * N; tileAvgColor[index] = new THREE.Color(ar / n / 255, ag / n / 255, ab / n / 255).convertSRGBToLinear();
    // gloss rides in the colour atlas' alpha (unused otherwise); kept >= 180 so
    // the canvas' premultiplied storage costs no visible colour precision
    blit(img, index, (x, y) => { const i = y * N + x; return [out[i * 3], out[i * 3 + 1], out[i * 3 + 2], gloss[i]]; });
    const Hs = (x, y) => H[clamp(y, 0, N - 1) * N + clamp(x, 0, N - 1)];
    blit(nimg, index, (x, y) => {
      const k = 0.95;   // Sobel (x4) → per-pixel slope; crisp but not noisy
      const gx = (Hs(x + 1, y - 1) + 2 * Hs(x + 1, y) + Hs(x + 1, y + 1)) - (Hs(x - 1, y - 1) + 2 * Hs(x - 1, y) + Hs(x - 1, y + 1));
      const gy = (Hs(x - 1, y + 1) + 2 * Hs(x, y + 1) + Hs(x + 1, y + 1)) - (Hs(x - 1, y - 1) + 2 * Hs(x, y - 1) + Hs(x + 1, y - 1));
      let nx = -gx * k, ny = gy * k, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255];
    });
  });
  ctx.putImageData(img, 0, 0); nctx.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  // crisp texels up close, trilinear + anisotropic far away so floors don't shimmer
  map.magFilter = THREE.NearestFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
  map.anisotropy = 8; map.generateMipmaps = true;
  const normalMap = new THREE.CanvasTexture(nv);
  normalMap.magFilter = THREE.NearestFilter; normalMap.minFilter = THREE.LinearMipmapLinearFilter;
  normalMap.anisotropy = 8; normalMap.generateMipmaps = true;
  return { map, normalMap, canvas: cv };
}

// ---------------------------------------------------------------- sprites
// Alpha-tested decoration sprites: grass tufts, cobwebs, talismans, etc.
// Painted on a 16 grid, then upscaled 2x (Scale2x on the alpha shape) and
// shaded, so blades and petals get rounded HD edges.
export const SPRITE_NAMES = ['grass', 'tall_grass', 'cobweb', 'talisman', 'chain', 'flower_red', 'flower_blue', 'cursed_weed', 'banner', 'fern', 'bone', 'candle', 'paper'];
export const SPRITE_INDEX = Object.fromEntries(SPRITE_NAMES.map((n, i) => [n, i]));
const SCOLS = 8;
export function spriteUV(index) {
  const col = index % SCOLS, row = Math.floor(index / SCOLS);
  const W = SCOLS * CELL, Hh = 2 * CELL;
  return [(col * CELL + PAD) / W, 1 - (row * CELL + PAD + TILE) / Hh, (col * CELL + PAD + TILE) / W, 1 - (row * CELL + PAD) / Hh];
}
function paintSprite(name, set, r) {
  const G = (hex) => C(hex);
  switch (name) {
    case 'grass': case 'tall_grass': case 'fern': case 'cursed_weed': {
      const base = name === 'cursed_weed' ? G(0x4a3a5a) : name === 'fern' ? G(0x3a7a34) : G(0x5aa23e);
      const blades = name === 'tall_grass' ? 7 : 6;
      for (let b = 0; b < blades; b++) {
        let x = 2 + r() * 12, lean = (r() - 0.5) * 0.6; const hgt = (name === 'tall_grass' ? 10 : 6) + r() * 5;
        for (let y = 15; y > 15 - hgt; y--) { set(Math.round(x), y, jitter(shade(base, 0.7 + (15 - y) / hgt * 0.5), r, 0.15)); x += lean; }
      }
      break;
    }
    case 'flower_red': case 'flower_blue': {
      const petal = name === 'flower_red' ? G(0xd8323a) : G(0x4a7aff);
      for (let y = 7; y < 16; y++) set(8, y, G(0x3f8a2e));
      set(7, 11, G(0x3f8a2e)); set(9, 12, G(0x3f8a2e));
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1]]) set(8 + dx, 5 + dy, petal);
      set(8, 5, G(0xffe066));
      break;
    }
    case 'cobweb': for (let i = 0; i < 16; i++) {
      set(i, i, G(0xe8e8f0)); set(15 - i, i, G(0xe8e8f0)); set(8, i, G(0xdcdce6)); set(i, 8, G(0xdcdce6));
      if (i > 2 && i < 13 && (i % 4 === 0)) for (let k = 16 - i; k < i; k++) { set(k, i, G(0xcfd0da)); set(i, k, G(0xcfd0da)); }
    } break;
    case 'talisman': for (let y = 1; y < 15; y++) for (let x = 4; x < 12; x++) {
      set(x, y, y < 3 ? G(0xc4302a) : jitter(G(0xefe2b0), r, 0.05));
      if (y > 4 && y < 13 && x > 5 && x < 10 && (x + y * 3) % 4 === 0) set(x, y, G(0xa01818));
    } break;
    case 'chain': for (let y = 0; y < 16; y++) { const link = (y >> 2) & 1; if (link) { set(7, y, G(0x7a7f86)); set(8, y, G(0x5a5f66)); } else { set(6, y, G(0x7a7f86)); set(9, y, G(0x5a5f66)); if (y % 4 === 0) { set(7, y, G(0x8a8f96)); set(8, y, G(0x8a8f96)); } } } break;
    case 'banner': for (let y = 0; y < 16; y++) for (let x = 2; x < 14; x++) {
      const tail = y > 12 && Math.abs(x - 7.5) < (y - 12) * 1.5; if (tail) continue;
      let c = y < 2 ? G(0x2a2a2a) : G(0x1d2a5a);
      if (Math.hypot(x - 7.5, y - 7) < 3 && Math.hypot(x - 7.5, y - 7) > 1.6) c = G(0xe0c050);
      set(x, y, jitter(c, r, 0.08));
    } break;
    case 'bone': for (let x = 3; x < 13; x++) { set(x, 9, G(0xe8e2cc)); set(x, 10, G(0xd6cfb8)); }
      for (const [x, y] of [[2, 8], [3, 8], [2, 11], [3, 11], [12, 8], [13, 8], [12, 11], [13, 11]]) set(x, y, G(0xe8e2cc));
      break;
    case 'candle': for (let y = 8; y < 16; y++) for (let x = 6; x < 10; x++) set(x, y, jitter(G(0xefe6cc), r, 0.05));
      set(8, 7, G(0x222222)); set(8, 5, G(0xffd070)); set(8, 6, G(0xffa030)); set(7, 6, G(0xffe090)); break;
    case 'paper': for (let y = 10; y < 15; y++) for (let x = 3; x < 13; x++) set(x, y, jitter(G(0xe8e0c8), r, 0.1)); break;
  }
}
export function buildSpriteAtlas() {
  const W = SCOLS * CELL, Hh = 2 * CELL;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, Hh);
  const M = LO * 2;
  SPRITE_NAMES.forEach((name, index) => {
    const lo = new Array(LO * LO).fill(null);
    paintSprite(name, (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < LO && y < LO) lo[y * LO + x] = c; }, mulberry32(hashStr(name) + 5));
    // Scale2x on the shape: transparent counts as its own "colour"
    const at = (x, y) => (x < 0 || y < 0 || x >= LO || y >= LO) ? null : lo[y * LO + x];
    const same = (a, b) => (a === null) === (b === null) && (a === null || Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 60);
    const hi = new Array(M * M).fill(null);
    for (let y = 0; y < LO; y++) for (let x = 0; x < LO; x++) {
      const E = at(x, y), B = at(x, y - 1), D = at(x - 1, y), F = at(x + 1, y), Hb = at(x, y + 1);
      let e0 = E, e1 = E, e2 = E, e3 = E;
      if (!same(B, Hb) && !same(D, F)) {
        if (same(D, B)) e0 = D; if (same(B, F)) e1 = F; if (same(D, Hb)) e2 = D; if (same(Hb, F)) e3 = F;
      }
      hi[(y * 2) * M + x * 2] = e0; hi[(y * 2) * M + x * 2 + 1] = e1; hi[(y * 2 + 1) * M + x * 2] = e2; hi[(y * 2 + 1) * M + x * 2 + 1] = e3;
    }
    const rr = mulberry32(hashStr(name) + 9);
    const col = index % SCOLS, row = Math.floor(index / SCOLS);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const sx = clamp(x - PAD, 0, M - 1), sy = clamp(y - PAD, 0, M - 1);
      const c = hi[sy * M + sx]; const o = ((row * CELL + y) * W + col * CELL + x) * 4;
      if (!c) continue;
      // rim light on top edges, shade on bottom/right edges, fine grain
      const up = sy > 0 ? hi[(sy - 1) * M + sx] : null, dn = sy < M - 1 ? hi[(sy + 1) * M + sx] : null, rt = sx < M - 1 ? hi[sy * M + sx + 1] : null;
      let f = 1 + (rr() - 0.5) * 0.06;
      if (!up) f *= 1.12; if (!dn) f *= 0.84; if (!rt) f *= 0.9;
      img.data[o] = clamp(c[0] * f, 0, 255); img.data[o + 1] = clamp(c[1] * f, 0, 255); img.data[o + 2] = clamp(c[2] * f, 0, 255); img.data[o + 3] = 255;
    }
  });
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace; map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestMipmapLinearFilter;
  return map;
}
