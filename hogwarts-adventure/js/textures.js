// Procedural canvas textures (stone, wood, grass, roofs, banners, sprites...).
import * as THREE from 'three';
import { G, HOUSES } from './state.js';
import { tfbm, tnoise, mulberry32, clamp, lerp } from './util.js';

const cache = new Map();
let SZ = 512;
export function setTextureSize(s) { SZ = s; }

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = G.renderer ? Math.min(8, G.renderer.capabilities.getMaxAnisotropy()) : 4;
  return t;
}

// Build color + normal (+ roughness) maps from a per-pixel function returning [r,g,b,height].
function generate(key, fn, size = SZ, normalStrength = 2.5) {
  if (cache.has(key)) return cache.get(key);
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = fn(x / size, y / size);
      const i = (y * size + x) * 4;
      img.data[i] = clamp(o[0], 0, 255);
      img.data[i + 1] = clamp(o[1], 0, 255);
      img.data[i + 2] = clamp(o[2], 0, 255);
      img.data[i + 3] = 255;
      H[y * size + x] = o[3] ?? 0.5;
    }
  }
  ctx.putImageData(img, 0, 0);
  const nc = canvas(size), nctx = nc.getContext('2d');
  const nimg = nctx.createImageData(size, size);
  const hAt = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * normalStrength;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * normalStrength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      nimg.data[i] = (-dx / len * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const res = { map: toTexture(c), normalMap: toTexture(nc, false) };
  cache.set(key, res);
  return res;
}

// Rows of irregular castle stones.
export function stoneTex(tint = [128, 122, 112], key = 'stone') {
  const rows = 8;
  return generate(key + tint.join(), (u, v) => {
    const row = Math.floor(v * rows);
    const off = (row % 2) * 0.5 + (tnoise(row * 3.1, 0, 64) - 0.5) * 0.3;
    const cols = 4;
    const cu = u * cols + off;
    const col = Math.floor(cu);
    const fu = cu - col, fv = v * rows - row;
    const m = Math.min(fu, 1 - fu) * 2.4, n = Math.min(fv, 1 - fv) * 1.2;
    const edge = Math.min(m, n);
    const mortar = edge < 0.06;
    const n1 = tfbm(u * 16, v * 16, 16, 4);
    const id = tnoise((col % cols) * 7.3 + row * 1.7, row * 3.3, 97);
    const shade = 0.78 + id * 0.35 + (n1 - 0.5) * 0.35;
    const bevel = clamp(edge * 9, 0, 1);
    if (mortar) {
      const g = 60 + n1 * 30;
      return [g, g * 0.97, g * 0.92, 0.1];
    }
    const moss = clamp((tfbm(u * 5 + 3, v * 5, 5, 3) - 0.62) * 4, 0, 1) * (1 - v * 0.3);
    let r = tint[0] * shade, g = tint[1] * shade, b = tint[2] * shade;
    r = lerp(r, 70, moss * 0.5); g = lerp(g, 92, moss * 0.5); b = lerp(b, 52, moss * 0.5);
    return [r, g, b, 0.3 + bevel * 0.5 + n1 * 0.2];
  });
}

export function floorTex() {
  return generate('floor', (u, v) => {
    const s = 3;
    const cu = u * s, cv = v * s;
    const ci = Math.floor(cu), cj = Math.floor(cv);
    const fu = cu - ci, fv = cv - cj;
    const edge = Math.min(fu, 1 - fu, fv, 1 - fv);
    const n1 = tfbm(u * 20, v * 20, 20, 4);
    const id = tnoise(ci * 5.1, cj * 3.7, 31);
    if (edge < 0.025) return [50, 46, 42, 0.05];
    const sh = 0.75 + id * 0.3 + (n1 - 0.5) * 0.3;
    const crack = Math.abs(tfbm(u * 8, v * 8, 8, 3) - 0.5) < 0.012 ? 0.6 : 1;
    return [118 * sh * crack, 110 * sh * crack, 100 * sh * crack, 0.4 + clamp(edge * 12, 0, 1) * 0.4 + n1 * 0.2];
  });
}

export function woodTex(base = [104, 66, 38], key = 'wood') {
  return generate(key, (u, v) => {
    const planks = 5;
    const p = Math.floor(u * planks);
    const fu = u * planks - p;
    const grain = tfbm(u * 6 + p * 13.7, v * 60, 60, 3);
    const ring = Math.sin((grain * 12 + tnoise(p * 4.1, v * 3, 3) * 6)) * 0.5 + 0.5;
    const id = tnoise(p * 9.3, 0, 41);
    const s = 0.7 + id * 0.35 + ring * 0.18;
    const gap = fu < 0.03 || fu > 0.97;
    if (gap) return [30, 20, 14, 0.1];
    return [base[0] * s, base[1] * s, base[2] * s, 0.5 + ring * 0.2];
  }, SZ, 1.5);
}

export function grassTex() {
  return generate('grass', (u, v) => {
    const n = tfbm(u * 8, v * 8, 8, 5);
    const d = tfbm(u * 64, v * 64, 64, 2);
    const blade = tnoise(u * 256, v * 128, 256);
    const s = 0.65 + n * 0.5 + (blade - 0.5) * 0.25;
    return [62 * s + d * 10, 98 * s + d * 22, 40 * s, n * 0.5 + blade * 0.5];
  }, SZ, 1.2);
}

export function dirtTex() {
  return generate('dirt', (u, v) => {
    const n = tfbm(u * 10, v * 10, 10, 5);
    const pebble = tnoise(u * 90, v * 90, 90) > 0.82 ? 1.25 : 1;
    const s = (0.7 + n * 0.5) * pebble;
    return [118 * s, 96 * s, 70 * s, n * 0.6 + (pebble - 1) * 2];
  });
}

export function rockTex() {
  return generate('rock', (u, v) => {
    const n = tfbm(u * 6, v * 6, 6, 6);
    const strata = Math.sin(v * 50 + n * 9) * 0.5 + 0.5;
    const s = 0.55 + n * 0.55 + strata * 0.12;
    return [112 * s, 106 * s, 100 * s, n + strata * 0.2];
  }, SZ, 4);
}

export function roofTex() {
  return generate('roof', (u, v) => {
    const rows = 14;
    const r = Math.floor(v * rows);
    const off = (r % 2) * 0.5;
    const cu = u * 10 + off;
    const fu = cu - Math.floor(cu);
    const fv = v * rows - r;
    const id = tnoise(Math.floor(cu) * 3.3, r * 7.1, 77);
    const n = tfbm(u * 30, v * 30, 30, 3);
    const edge = fu < 0.05 || fu > 0.95 || fv > 0.92;
    const s = (0.6 + id * 0.35 + n * 0.2) * (edge ? 0.45 : 1) * (0.75 + fv * 0.35);
    return [58 * s, 66 * s, 84 * s, edge ? 0.1 : 0.4 + fv * 0.5];
  });
}

export function plasterTex() {
  return generate('plaster', (u, v) => {
    const n = tfbm(u * 12, v * 12, 12, 5);
    const s = 0.8 + n * 0.3;
    return [150 * s, 140 * s, 122 * s, n];
  }, 256, 1);
}

export function fabricTex(key = 'fabric') {
  return generate(key, (u, v) => {
    const w = (Math.sin(u * 512) * Math.sin(v * 512)) * 0.5 + 0.5;
    const n = tfbm(u * 16, v * 16, 16, 3);
    const s = 0.82 + w * 0.12 + n * 0.12;
    return [255 * s, 255 * s, 255 * s, w * 0.5];
  }, 256, 0.6);
}

// --- flat (non-PBR) textures ------------------------------------------------

function once(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

export function scarfTex(house) {
  return once('scarf' + house, () => {
    const h = HOUSES[house];
    const c = canvas(64, 256), x = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? h.c2 : h.c1;
      x.fillRect(0, i * 32, 64, 32);
    }
    x.globalAlpha = 0.12;
    for (let y = 0; y < 256; y += 2) {
      x.fillStyle = y % 4 ? '#000' : '#fff';
      x.fillRect(0, y, 64, 1);
    }
    return toTexture(c);
  });
}

export function drawCrest(x, house, cx, cy, s) {
  const h = HOUSES[house];
  x.save();
  x.translate(cx, cy);
  x.scale(s, s);
  // shield
  x.beginPath();
  x.moveTo(-50, -60); x.lineTo(50, -60); x.lineTo(50, 0);
  x.quadraticCurveTo(50, 50, 0, 70); x.quadraticCurveTo(-50, 50, -50, 0); x.closePath();
  x.fillStyle = h.c1; x.fill();
  x.lineWidth = 7; x.strokeStyle = h.c2; x.stroke();
  x.fillStyle = h.c2;
  x.strokeStyle = h.c2;
  x.lineWidth = 6;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  if (h.crest === 'lion') {
    x.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, r = i % 2 ? 26 : 34;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r - 4);
    }
    x.closePath(); x.fill();
    x.fillStyle = h.c1; x.beginPath(); x.arc(0, -4, 17, 0, Math.PI * 2); x.fill();
    x.fillStyle = h.c2; x.beginPath(); x.arc(-6, -8, 3, 0, 7); x.arc(6, -8, 3, 0, 7); x.fill();
    x.beginPath(); x.moveTo(-5, 2); x.lineTo(5, 2); x.lineTo(0, 8); x.fill();
  } else if (h.crest === 'serpent') {
    x.lineWidth = 9;
    x.beginPath();
    x.moveTo(-20, 48);
    x.bezierCurveTo(40, 30, -40, 0, 10, -20);
    x.bezierCurveTo(30, -30, 25, -45, 5, -45);
    x.stroke();
    x.beginPath(); x.ellipse(2, -45, 12, 8, 0.3, 0, 7); x.fill();
  } else if (h.crest === 'eagle') {
    x.beginPath();
    x.moveTo(0, -38); x.lineTo(10, -20); x.lineTo(42, -30); x.lineTo(24, 0); x.lineTo(38, 4);
    x.lineTo(12, 14); x.lineTo(0, 44); x.lineTo(-12, 14); x.lineTo(-38, 4); x.lineTo(-24, 0);
    x.lineTo(-42, -30); x.lineTo(-10, -20); x.closePath(); x.fill();
  } else {
    x.beginPath(); x.ellipse(0, 8, 30, 22, 0, 0, 7); x.fill();
    x.beginPath(); x.ellipse(-26, -6, 14, 10, -0.5, 0, 7); x.fill();
    x.fillStyle = h.c1;
    x.fillRect(-38, -8, 22, 4);
  }
  x.restore();
}

export function bannerTex(house) {
  return once('banner' + house, () => {
    const h = HOUSES[house];
    const c = canvas(256, 512), x = c.getContext('2d');
    x.fillStyle = h.c1; x.fillRect(0, 0, 256, 512);
    const g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 512);
    x.fillStyle = h.c2;
    x.fillRect(14, 0, 8, 512); x.fillRect(234, 0, 8, 512);
    drawCrest(x, house, 128, 220, 1.6);
    x.font = 'bold 30px Cinzel, serif';
    x.textAlign = 'center';
    x.fillText(h.name.toUpperCase(), 128, 400);
    // swallowtail cut
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.moveTo(0, 512); x.lineTo(128, 440); x.lineTo(256, 512); x.fill();
    return toTexture(c, true, false);
  });
}

export function windowTex() {
  return once('window', () => {
    const c = canvas(128, 256), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 128, 256);
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#ffcf7a'); g.addColorStop(1, '#ff9a3a');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(10, 250); x.lineTo(10, 70); x.quadraticCurveTo(10, 10, 64, 4);
    x.quadraticCurveTo(118, 10, 118, 70); x.lineTo(118, 250); x.closePath(); x.fill();
    x.strokeStyle = '#1a1208'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(64, 4); x.lineTo(64, 250); x.moveTo(10, 120); x.lineTo(118, 120); x.moveTo(10, 185); x.lineTo(118, 185); x.stroke();
    x.lineWidth = 2;
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(10, 60 + i * 22); x.lineTo(118, 60 + i * 22); x.stroke(); }
    return toTexture(c, true, false);
  });
}

export function windowMaskTex() {
  return once('windowMask', () => {
    const c = canvas(128, 256), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 128, 256);
    x.fillStyle = '#fff';
    x.beginPath(); x.moveTo(4, 254); x.lineTo(4, 70); x.quadraticCurveTo(4, 4, 64, 0);
    x.quadraticCurveTo(124, 4, 124, 70); x.lineTo(124, 254); x.closePath(); x.fill();
    return toTexture(c, false, false);
  });
}

export function stainedGlassTex() {
  return once('stained', () => {
    const c = canvas(256, 512), x = c.getContext('2d');
    const rnd = mulberry32(7);
    x.fillStyle = '#000'; x.fillRect(0, 0, 256, 512);
    x.save();
    x.beginPath(); x.moveTo(8, 508); x.lineTo(8, 120); x.quadraticCurveTo(8, 10, 128, 4); x.quadraticCurveTo(248, 10, 248, 120); x.lineTo(248, 508); x.closePath(); x.clip();
    const cols = ['#c0392b', '#2e86de', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22', '#48c9b0'];
    for (let y = 0; y < 512; y += 28) {
      for (let xx = 0; xx < 256; xx += 28) {
        x.fillStyle = cols[Math.floor(rnd() * cols.length)];
        x.globalAlpha = 0.65 + rnd() * 0.35;
        x.fillRect(xx + (y / 28 % 2) * 14, y, 28, 28);
      }
    }
    x.globalAlpha = 1;
    x.fillStyle = '#ffe9a8';
    x.beginPath(); x.arc(128, 150, 50, 0, 7); x.fill();
    x.strokeStyle = '#111'; x.lineWidth = 5;
    for (let y = 0; y < 512; y += 28) { x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); }
    for (let xx = 0; xx < 256; xx += 28) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx + 40, 512); x.stroke(); }
    x.lineWidth = 9; x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 512); x.stroke();
    x.restore();
    return toTexture(c, true, false);
  });
}

const PORTRAIT_NAMES = ['Sir Cadwyn', 'The Grey Lady', 'Lady Morwen', 'Old Fennick', 'Baron Ashby', 'Sister Edra', 'Wilhelmina', 'Lord Thistle'];
export function portraitTex(i) {
  return once('portrait' + i, () => {
    const rnd = mulberry32(100 + i);
    const c = canvas(192, 256), x = c.getContext('2d');
    const bg = x.createRadialGradient(96, 100, 10, 96, 120, 160);
    const hue = Math.floor(rnd() * 360);
    bg.addColorStop(0, `hsl(${hue},30%,32%)`); bg.addColorStop(1, `hsl(${hue},40%,8%)`);
    x.fillStyle = bg; x.fillRect(0, 0, 192, 256);
    // shoulders / robe
    x.fillStyle = `hsl(${(hue + 160) % 360},45%,${20 + rnd() * 20}%)`;
    x.beginPath(); x.ellipse(96, 260, 80, 90, 0, 0, 7); x.fill();
    // head
    const skin = ['#f1c9a5', '#d9a77e', '#a5714c', '#7a4e33'][Math.floor(rnd() * 4)];
    x.fillStyle = skin; x.beginPath(); x.ellipse(96, 112, 34, 44, 0, 0, 7); x.fill();
    // hair / hat
    x.fillStyle = ['#2b1d12', '#ccc', '#6b3c1c', '#111', '#a0a0a0'][Math.floor(rnd() * 5)];
    if (rnd() > 0.5) {
      x.beginPath(); x.moveTo(50, 85); x.lineTo(96, 10 - rnd() * 20); x.lineTo(142, 85); x.fill();
      x.fillRect(46, 78, 100, 12);
    } else {
      x.beginPath(); x.ellipse(96, 86, 38, 26, 0, Math.PI, 0); x.fill();
    }
    if (rnd() > 0.55) { x.fillStyle = '#ddd'; x.beginPath(); x.moveTo(70, 130); x.lineTo(96, 200); x.lineTo(122, 130); x.fill(); }
    x.fillStyle = '#1a1010';
    x.beginPath(); x.arc(83, 108, 3.5, 0, 7); x.arc(109, 108, 3.5, 0, 7); x.fill();
    x.strokeStyle = '#5a2b20'; x.lineWidth = 2; x.beginPath(); x.arc(96, 132, 9, 0.2, Math.PI - 0.2); x.stroke();
    // varnish
    x.fillStyle = 'rgba(80,50,10,0.18)'; x.fillRect(0, 0, 192, 256);
    x.font = 'italic 15px "EB Garamond", serif'; x.fillStyle = 'rgba(255,230,180,0.6)'; x.textAlign = 'center';
    x.fillText(PORTRAIT_NAMES[i % PORTRAIT_NAMES.length], 96, 246);
    return toTexture(c, true, false);
  });
}

export function shelfTex() {
  return once('shelf', () => {
    const rnd = mulberry32(3);
    const c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#2a1a10'; x.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 4; row++) {
      let xx = 4;
      while (xx < 250) {
        const w = 6 + rnd() * 10, h = 40 + rnd() * 18;
        x.fillStyle = `hsl(${rnd() * 360},${30 + rnd() * 40}%,${18 + rnd() * 25}%)`;
        x.fillRect(xx, row * 64 + 62 - h, w, h);
        x.fillStyle = 'rgba(230,200,120,0.5)'; x.fillRect(xx, row * 64 + 62 - h + 6, w, 2);
        xx += w + 1;
      }
      x.fillStyle = '#4a2e1a'; x.fillRect(0, row * 64 + 60, 256, 4);
    }
    return toTexture(c);
  });
}

// --- sprites -----------------------------------------------------------------
export function glowSprite() {
  return once('glow', () => {
    const c = canvas(64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return toTexture(c, false, false);
  });
}
export function flameSprite() {
  return once('flame', () => {
    const c = canvas(64, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 92, 2, 32, 80, 60);
    g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.2, 'rgba(255,200,80,0.95)');
    g.addColorStop(0.5, 'rgba(255,110,20,0.5)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(32, 2); x.quadraticCurveTo(60, 70, 52, 100); x.quadraticCurveTo(32, 128, 12, 100); x.quadraticCurveTo(4, 70, 32, 2); x.fill();
    return toTexture(c, false, false);
  });
}

// Tattered cloth alpha (dementors, boss cape).
export function tatterTex() {
  return once('tatter', () => {
    const c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#000';
    const rnd = mulberry32(11);
    for (let i = 0; i < 40; i++) {
      const xx = rnd() * 256, w = 3 + rnd() * 10, h = 30 + rnd() * 140;
      x.beginPath(); x.moveTo(xx - w, 256); x.lineTo(xx, 256 - h); x.lineTo(xx + w, 256); x.fill();
    }
    for (let i = 0; i < 30; i++) { x.beginPath(); x.ellipse(rnd() * 256, 80 + rnd() * 160, 2 + rnd() * 5, 4 + rnd() * 10, 0, 0, 7); x.fill(); }
    const t = toTexture(c, false);
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

export function noiseTex() {
  return once('noise', () => {
    const c = canvas(256), x = c.getContext('2d');
    const img = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      const u = (i % 256) / 256, v = Math.floor(i / 256) / 256;
      const n = tfbm(u * 8, v * 8, 8, 5) * 255;
      const n2 = tfbm(u * 8 + 31, v * 8 + 17, 8, 5) * 255;
      img.data[i * 4] = n; img.data[i * 4 + 1] = n2; img.data[i * 4 + 2] = 255 - n; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return toTexture(c, false);
  });
}

export function textTexture(lines, opts = {}) {
  const w = opts.w || 512, h = opts.h || 256;
  const c = canvas(w, h), x = c.getContext('2d');
  if (opts.bg) { x.fillStyle = opts.bg; x.fillRect(0, 0, w, h); }
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  lines.forEach((l, i) => {
    x.font = l.font || 'bold 48px Cinzel, serif';
    x.fillStyle = l.color || '#fff';
    x.fillText(l.text, w / 2, l.y ?? (h / (lines.length + 1)) * (i + 1));
  });
  const t = toTexture(c, true, false);
  return { tex: t, canvas: c, ctx: x };
}
