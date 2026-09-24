// Jujutsu Craft: a 30s procedural Minecraft-style JJK fan animation.
// Every frame is a pure function of time t, so the timeline can be scrubbed.
(() => {
'use strict';

const W = 320, H = 180, RES = 4, DUR = 30;
const BS = 10, GY = 130; // block size, ground surface y
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = W * RES;
canvas.height = H * RES;
ctx.imageSmoothingEnabled = false;

// ---------- math helpers ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const frac = v => v - Math.floor(v);
const between = (t, a, b) => t >= a && t < b;
const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const screen = () => ctx.setTransform(RES, 0, 0, RES, 0, 0);

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, k) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`;
}

// ---------- textures ----------
function makeTex(seed, fn) {
  const c = document.createElement('canvas'); c.width = c.height = 8;
  const g = c.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    g.fillStyle = fn(x, y, hash(seed + x * 13.7 + y * 71.3)); g.fillRect(x, y, 1, 1);
  }
  return c;
}
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
const GREENS = ['#5da83a', '#4e9130', '#6cbf45', '#579e35'];
const DIRTS = ['#8a5a36', '#79492b', '#9b6a43', '#6b4026'];
const STONES = ['#7f7f7f', '#6e6e6e', '#8f8f8f', '#5f5f5f'];
const TEX = { grass: [], dirt: [], stone: [], log: [], leaves: [] };
for (let v = 0; v < 4; v++) {
  TEX.grass.push(makeTex(v * 100 + 1, (x, y, r) => (y < 2 || (y === 2 && r < 0.5) ? pick(GREENS, r) : pick(DIRTS, r))));
  TEX.dirt.push(makeTex(v * 100 + 2, (x, y, r) => pick(DIRTS, r)));
  TEX.stone.push(makeTex(v * 100 + 3, (x, y, r) => pick(STONES, r)));
  TEX.log.push(makeTex(v * 100 + 4, (x, y, r) => (x % 3 === 0 ? '#4f3a1f' : r < 0.5 ? '#6b5130' : '#5e4627')));
  TEX.leaves.push(makeTex(v * 100 + 5, (x, y, r) => (r < 0.12 ? '#1f4a14' : pick(['#3f8a2a', '#2f6e1e', '#4d9e33', '#367a24'], r))));
}

// ---------- world ----------
const blocks = [];
function addBlock(x, y, type) { blocks.push({ x, y, type, v: Math.floor(hash(x * 0.37 + y * 1.91) * 4), under: y >= GY }); }
for (let i = -5; i < 62; i++) {
  let h = 0;
  if (i < 0) h = 2; else if (i < 2) h = 1;
  if (i >= 36) h = 1; if (i >= 40) h = 2; if (i >= 45) h = 3; if (i >= 53) h = 2;
  const top = GY - h * BS;
  for (let y = top, r = 0; y < H; y += BS, r++) addBlock(i * BS, y, r === 0 ? 'grass' : r < 3 ? 'dirt' : 'stone');
}
function tree(col, h) {
  const x = col * BS, base = GY - h * BS;
  for (let k = 1; k <= 4; k++) addBlock(x, base - k * BS, 'log');
  for (let dx = -2; dx <= 2; dx++) for (let dy = 3; dy <= 4; dy++) if (dx !== 0 || dy > 4) addBlock(x + dx * BS, base - dy * BS, 'leaves');
  for (let dx = -1; dx <= 1; dx++) addBlock(x + dx * BS, base - 5 * BS, 'leaves');
  addBlock(x, base - 6 * BS, 'leaves');
}
tree(-2, 2); tree(34, 0); tree(48, 3);
const flowers = [[22, '#e8322c'], [57, '#ffd83a'], [74, '#e8322c'], [128, '#ffd83a'], [148, '#7fb6ff']];

// Hollow Purple sphere path (world coords).
const HP = { t0: 26.0, t1: 26.9, x0: 166, dist: 470, y: 110, carveFrom: 168 };
const hpX = t => HP.x0 + HP.dist * Math.pow(seg(t, HP.t0, HP.t1), 2);
const hpR = t => 18 + 22 * seg(t, HP.t0, HP.t1);
function carved(b, t) {
  if (t < HP.t0) return false;
  const cx = b.x + BS / 2, cy = b.y + BS / 2, sx = hpX(t), R = 40;
  if (cx < HP.carveFrom) return false;
  if (cx <= sx && Math.abs(cy - HP.y) < R) return true;
  const r = hpR(t);
  return (cx - sx) ** 2 + (cy - HP.y) ** 2 < r * r;
}

// ---------- timing tables ----------
const SKY = [
  [0, '#78a7ff', '#c3dcff'], [12.0, '#78a7ff', '#c3dcff'], [13.3, '#1a0a14', '#6b1f24'],
  [26.4, '#1a0a14', '#6b1f24'], [27.4, '#3b3f8f', '#ffae6b'], [30, '#3b3f8f', '#ffae6b'],
];
function skyAt(t) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [a, t1, b1] = SKY[i], [b, t2, b2] = SKY[i + 1];
    if (t <= b) { const k = seg(t, a, b); return [mix(t1, t2, k), mix(b1, b2, k)]; }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
}
const ominous = t => seg(t, 12.0, 13.3) * (1 - seg(t, 26.4, 27.4));

const SHAKES = [[6.3, 1.3, 1.2], [9.25, 0.25, 2], [9.45, 0.25, 2.5], [10.6, 0.6, 4], [13.2, 0.9, 4],
  [17.9, 0.6, 3], [26.0, 1.0, 4], [26.43, 0.7, 7]];
function shake(t) {
  let a = 0;
  for (const [t0, d, amp] of SHAKES) if (between(t, t0, t0 + d)) a += amp * Math.pow(1 - (t - t0) / d, 2);
  const n = Math.floor(t * 40);
  return [(hash(n) - 0.5) * 2 * a, (hash(n + 99) - 0.5) * 2 * a];
}
function camX(t) {
  if (t < 3) return lerp(150, 0, easeInOut(seg(t, 0, 3)));
  if (t < 8) return 0;
  let c = lerp(0, 30, easeInOut(seg(t, 8, 9)));
  c += 40 * easeInOut(seg(t, 26.0, 26.5)) * (1 - easeInOut(seg(t, 26.9, 27.6)));
  return c;
}

const CHAT = [
  [3.5, '<Yuji> nice day to mine some diamonds', '#fff'],
  [6.4, 'A cursed spirit has spawned!', '#ffff55'],
  [8.0, '<Yuji> Divergent... FIST!', '#fff'],
  [12.3, 'A SPECIAL GRADE curse approaches', '#ff5555'],
  [13.9, '<Yuji> uh... little help??', '#fff'],
  [14.7, "<Gojo> Nah, I'd win.", '#fff'],
  [27.5, '<Yuji> you deleted half the chunk', '#fff'],
  [28.7, "<Gojo> it'll respawn. probably.", '#fff'],
];
const TOASTS = [
  [11.2, 'Advancement Made!', 'Black Flash', '#ffff55', '#e02030'],
  [26.95, 'Challenge Complete!', 'Hollow Purple', '#d68bff', '#8a2be2'],
];

// ---------- particles (deterministic) ----------
function burst(t, t0, life, x, y, n, seed, o) {
  const dt = t - t0; if (dt < 0 || dt > life) return;
  const k = dt / life;
  for (let i = 0; i < n; i++) {
    const a = hash(seed + i * 3.1) * Math.PI * 2, s = (0.3 + 0.7 * hash(seed + i * 7.7)) * o.sp;
    const vx = Math.cos(a) * s + (o.vx || 0);
    const vy = Math.sin(a) * s * (o.flat || 1) - (o.up || 0) * (0.5 + hash(seed + i * 5.3));
    const px = x + vx * dt, py = y + vy * dt + 0.5 * (o.g || 0) * dt * dt;
    const sz = (o.size || 2) * (1 - k * (o.shrink ?? 0.5)) * (0.6 + 0.8 * hash(seed + i * 1.3));
    ctx.globalAlpha = o.fade === false ? 1 : 1 - k;
    rect(px - sz / 2, py - sz / 2, sz, sz, o.colors[i % o.colors.length]);
  }
  ctx.globalAlpha = 1;
}
const SMOKE = ['#ffffff', '#dddddd', '#bbbbbb', '#999999'];
const DIRTP = ['#8a5a36', '#5da83a', '#79492b', '#6b4026'];

// ---------- characters ----------
const PAL_YUJI = { skin: '#e3b089', skinD: '#c8966f', hair: '#f28aa6', hairD: '#c96683', shirt: '#262a45', shirtD: '#1b1e33',
  pants: '#262a45', pantsD: '#1b1e33', shoes: '#d8453a', shoesD: '#a8322a' };
const PAL_GOJO = { skin: '#f5dcca', skinD: '#dcc0ad', hair: '#f4f4fb', hairD: '#d4d6e6', shirt: '#17171d', shirtD: '#0e0e12',
  pants: '#17171d', pantsD: '#0e0e12', shoes: '#08080a', shoesD: '#050506' };

function limb(py, ang, col, endCol, len, ext = 0, endLen = 3) {
  ctx.save(); ctx.translate(0, py); ctx.rotate(ang);
  rect(-2, -2 + ext, 4, len, col);
  rect(-2, len - 2 - endLen + ext, 4, endLen, endCol);
  ctx.restore();
}
function drawChar(p, kind) {
  if (!p.vis || p.alpha <= 0) return;
  const P = kind === 'yuji' ? PAL_YUJI : PAL_GOJO;
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot || 0);
  ctx.scale(p.f * p.sc, p.sc);
  limb(-22, p.armB, P.shirtD, P.skinD, 12, p.extB || 0);
  limb(-12, -p.leg, P.pantsD, P.shoesD, 12, 0, 2);
  rect(-2, -24, 4, 12, P.shirt);
  if (kind === 'yuji') { rect(-3.5, -25, 2.5, 5, '#b83232'); rect(-3.5, -20, 1.5, 2, '#9a2828'); } // red hood
  else rect(1, -24, 1, 12, '#26262f'); // coat seam
  rect(-2, -14, 4, 1, kind === 'yuji' ? '#e9c46a' : '#26262f'); // belt / buttons line
  limb(-12, p.leg, P.pants, P.shoes, 12, 0, 2);
  // head
  rect(-4, -32, 8, 8, P.skin);
  rect(-1, -29, 1, 2, P.skinD); // ear
  if (kind === 'yuji') {
    rect(-4, -33, 8, 3, P.hair); rect(-4, -30, 3, 3, P.hair);
    rect(-3, -34, 2, 1, P.hair); rect(0, -34.5, 2, 1.5, P.hair); rect(2.5, -33.5, 2, 1, P.hairD);
    rect(2, -30, 2, 1, P.hair);
    rect(-4, -27, 2, 2, '#3a2226');
    rect(1, -29, 2, 1.5, '#fff'); rect(2.2, -29, 0.8, 1.5, '#4a2b1a');
    rect(2.5, -26, 1.5, 0.6, '#8a4a3a');
  } else {
    rect(-4.5, -34, 9, 3, P.hair); rect(-4.5, -31, 3, 5, P.hair);
    rect(-4, -36, 2, 2, P.hair); rect(-1.5, -37.5, 2, 3.5, P.hair); rect(1, -36.5, 2, 2.5, P.hair);
    rect(3, -35, 2, 1.5, P.hairD); rect(-5.5, -35, 1.5, 2, P.hairD);
    if (p.eyes > 0) {
      ctx.save();
      ctx.shadowColor = '#5ff0ff'; ctx.shadowBlur = 10 * p.eyes;
      rect(1, -29.2, 2.4, 1.6, '#fff'); rect(2.1, -29.2, 1.3, 1.6, '#3fd6ff');
      ctx.restore();
      rect(1, -29.9, 2.6, 0.6, '#fff'); // white lashes
    }
    rect(-4.3, -30.2 - 4 * p.bu, 8.6, 3, '#101014'); // blindfold
    rect(2.6, -26, 1.4, 0.6, '#9a6a5a'); rect(3.8, -26.5, 0.6, 0.6, '#9a6a5a'); // smirk
  }
  limb(-22, p.armF, P.shirt, P.skin, 12, p.extF || 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function yujiPose(t) {
  const p = { x: -30, y: GY, f: 1, sc: 0.9, armF: 0, armB: 0, leg: 0, extF: 0, rot: 0, alpha: 1, vis: t >= 3 };
  const idle = Math.sin(t * 4) * 0.08;
  const walk = () => { const ph = t * 11; p.leg = Math.sin(ph) * 0.7; p.armF = -Math.sin(ph) * 0.6; p.armB = Math.sin(ph) * 0.6; };
  const stance = () => { p.armF = -1.25 + idle; p.armB = -0.8 - idle; p.leg = 0.3; };
  if (t < 6) { p.x = lerp(-20, 100, seg(t, 3, 6)); walk(); }
  else if (t < 8.05) {
    p.x = 100; p.y = GY - Math.sin(seg(t, 6.35, 6.7) * Math.PI) * 5;
    const st = easeOut(seg(t, 6.7, 7.0));
    p.armF = lerp(0, -1.25, st) + idle * st; p.armB = lerp(0, -0.8, st); p.leg = 0.3 * st;
  } else if (t < 8.85) {
    const k = easeInOut(seg(t, 8.05, 8.8)); p.x = lerp(100, 186, k);
    p.leg = Math.sin(t * 20) * 0.9; p.armF = -1.25; p.armB = 0.9; p.rot = 0.18 * Math.sin(k * Math.PI);
  } else if (t < 10.2) {
    p.x = 186; stance();
    if (t < 9.0) { p.armF = 0.7; p.rot = -0.08; }
    else if (t < 9.4) { p.armF = -Math.PI / 2; p.extF = 4; p.rot = 0.12; }
    else { const r = easeOut(seg(t, 9.4, 9.8)); p.armF = lerp(-Math.PI / 2, -1.25, r) + idle; p.extF = lerp(4, 0, r); }
  } else if (t < 11.1) {
    p.x = 186; p.leg = 0.45;
    if (t < 10.55) { const w = easeOut(seg(t, 10.2, 10.5)); p.armF = lerp(-1.25, 1.0, w); p.rot = -0.12 * w; p.armB = -0.6; }
    else { p.armF = -Math.PI / 2; p.extF = 5; p.rot = 0.18; p.armB = 0.8; }
  } else if (t < 13.2) {
    p.x = 186; stance();
    const r = easeOut(seg(t, 11.1, 11.5));
    p.armF = lerp(-Math.PI / 2, p.armF, r); p.extF = lerp(5, 0, r); p.rot = lerp(0.18, 0, r);
  } else if (t < 14) {
    const k = easeOut(seg(t, 13.2, 13.9)); p.x = lerp(186, 95, k); p.y = GY - Math.sin(k * Math.PI) * 12;
    p.rot = -0.5 * Math.sin(k * Math.PI); p.armF = -2.5 + Math.sin(t * 30) * 0.5; p.armB = -2.2 - Math.sin(t * 30) * 0.5; p.leg = 0.5;
  } else if (t < 27.4) { p.x = 95; stance(); }
  else {
    const k = seg(t, 27.4, 28.3); p.x = lerp(95, 116, k);
    if (k < 1) walk(); else { p.armF = idle; p.armB = -idle; }
    if (t > 29.0) { const th = easeOut(seg(t, 29.0, 29.3)); p.armF = lerp(idle, -2.0, th); } // thumbs up-ish
  }
  return p;
}

function gojoPose(t) {
  const p = { x: 140, y: GY, f: 1, sc: 1.05, armF: 0.12, armB: 0.12, leg: 0.1, extF: 0, rot: 0,
    alpha: seg(t, 14.35, 14.6), vis: t >= 14.3, bu: 0, eyes: 0 };
  const idle = Math.sin(t * 3) * 0.04;
  p.armF += idle; p.armB -= idle;
  if (between(t, 15.6, 16.7)) {
    const up = easeInOut(seg(t, 15.6, 15.95)), dn = easeInOut(seg(t, 16.25, 16.6));
    p.armF = lerp(0.12, -2.75, up * (1 - dn));
  }
  p.bu = easeInOut(seg(t, 15.9, 16.2));
  p.eyes = seg(t, 16.05, 16.3);
  if (between(t, 17.2, 22.8)) {
    const k = easeOut(seg(t, 17.2, 17.5)), r = easeInOut(seg(t, 22.3, 22.8));
    p.armF = lerp(0.12, -2.2, k * (1 - r));
  }
  if (between(t, 23.2, 27.3)) {
    const k = easeOut(seg(t, 23.2, 23.5)), r = easeInOut(seg(t, 26.9, 27.3));
    p.armF = lerp(0.12, -1.45, k * (1 - r)); p.armB = lerp(0.12, -1.2, k * (1 - r));
    if (between(t, 25.95, 26.45)) { p.armF = -Math.PI / 2; p.extF = 3; p.rot = -0.06; }
  }
  if (t >= 28.7) { const k = easeOut(seg(t, 28.7, 29.0)); p.armF = lerp(0.12, -2.9, k) + Math.sin(t * 10) * 0.25 * k; }
  return p;
}

// ---------- curses ----------
const EYES = [[-7, -24, 3], [3, -26, 3], [-2, -19, 2], [6, -17, 2], [-10, -15, 2], [8, -24, 2]];
function drawCurse(o, t) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0); ctx.scale(o.sc * (o.sx || 1), o.sc * (o.sy || 1));
  const g = o.giant;
  const body = g ? '#2a1030' : '#3d2652', dark = g ? '#170619' : '#2a1840', light = g ? '#4a1a45' : '#583a78';
  for (let i = 0; i < 4; i++) {
    const lx = -10 + i * 6.5, wob = Math.sin(t * 6 + i * 1.7) * 1.5;
    rect(lx + wob * 0.3, -7, 3, 5, dark); rect(lx + wob, -2, 3, 2, dark);
  }
  rect(-12, -28, 24, 22, body); rect(-9, -32, 18, 4, body); rect(-5, -34, 10, 2, body);
  for (let i = 0; i < 16; i++) {
    const px = -12 + Math.floor(hash(i * 3.3 + (g ? 50 : 0)) * 22), py = -32 + Math.floor(hash(i * 5.1 + 7) * 24);
    rect(px, py, 2, 2, i % 2 ? dark : light);
  }
  if (g) {
    rect(-10, -38, 3, 6, '#d9c9a8'); rect(-11, -41, 2, 3, '#bfae8c');
    rect(7, -38, 3, 6, '#d9c9a8'); rect(9, -41, 2, 3, '#bfae8c');
  }
  EYES.forEach(([ex, ey, s], i) => {
    const blink = hash(i + Math.floor(t * 2.3 + i * 0.37)) > 0.9;
    if (blink && !o.dazed) { rect(ex, ey + s / 2, s, 0.7, '#000'); return; }
    ctx.save();
    if (g) { ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 8; }
    rect(ex, ey, s, s, g ? '#ff3a30' : '#ffd83a');
    ctx.restore();
    let px = ex, py = ey + s / 2 - 0.5;
    if (o.dazed) { px = ex + s / 2 - 0.5 + Math.cos(t * 18 + i) * (s / 2 - 0.5); py = ey + s / 2 - 0.5 + Math.sin(t * 18 + i) * (s / 2 - 0.5); }
    rect(px, py, 1, 1, '#000');
  });
  const mo = o.mouth || 0;
  rect(-7, -11 - mo * 3, 14, 3 + mo * 5, '#12060f');
  for (let k = 0; k < 5; k++) { rect(-6.5 + k * 3, -11 - mo * 3, 1.5, 1.5, '#eee'); rect(-5.5 + k * 3, -9.5 + mo * 2, 1.5, 1.5, '#eee'); }
  if (o.hurt) rect(-12.5, -34.5, 25, 34.5, 'rgba(255,30,30,0.45)');
  ctx.restore();
}
function smallCurse(t) {
  if (t < 6.3 || t > 11.72) return null;
  const o = { x: 215, y: GY + (1 - easeOut(seg(t, 6.3, 7.5))) * 40, sc: 1.05, rot: 0, sx: 1, sy: 1,
    mouth: 0.25 + 0.2 * Math.sin(t * 5) };
  if (t >= 9.25) o.x += 6 * easeOut(seg(t, 9.25, 9.45)) + 5 * easeOut(seg(t, 9.45, 9.7));
  if (t >= 9.8) o.x -= 11 * easeInOut(seg(t, 9.8, 10.4));
  const squash = Math.max(Math.sin(seg(t, 9.25, 9.45) * Math.PI), Math.sin(seg(t, 9.45, 9.7) * Math.PI));
  o.sx = 1 - 0.2 * squash; o.sy = 1 + 0.12 * squash;
  o.hurt = between(t, 9.25, 9.65) || t >= 10.6;
  if (between(t, 10.6, 11.1)) { o.sx = 0.7; o.sy = 1.15; o.mouth = 1; }
  if (t >= 11.1) {
    const k = seg(t, 11.1, 11.7);
    o.x = 215 + 110 * easeOut(k); o.y = GY - Math.sin(k * Math.PI) * 45; o.rot = k * 6; o.mouth = 1;
    o.alpha = 1 - seg(t, 11.55, 11.7);
  }
  return o;
}
function giantCurse(t) {
  if (t < 12.2 || t > 26.75) return null;
  const o = { x: 300, y: GY + (1 - easeOut(seg(t, 12.2, 13.1))) * 115, sc: 2.7, giant: true,
    mouth: 0.15 + 0.1 * Math.sin(t * 2) };
  if (between(t, 13.15, 14.0)) o.mouth = Math.max(o.mouth, Math.sin(seg(t, 13.15, 14.0) * Math.PI));
  o.dazed = between(t, 18.6, 26.45);
  if (o.dazed) o.x += Math.sin(t * 50) * 0.6;
  if (t >= 26.43) { o.alpha = 1 - seg(t, 26.43, 26.7); o.hurt = true; }
  return o;
}

// ---------- scenery ----------
function drawSky(t) {
  const [top, bot] = skyAt(t);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cam = camX(t), om = ominous(t), sunset = seg(t, 26.6, 27.6);
  const day = 1 - Math.max(om, sunset);
  if (day > 0) { ctx.globalAlpha = day; rect(246 - cam * 0.05, 14, 22, 22, 'rgba(255,250,200,0.35)'); rect(249 - cam * 0.05, 17, 16, 16, '#fff7a8'); }
  if (om > 0) { ctx.globalAlpha = om; rect(60, 18, 20, 20, 'rgba(255,60,60,0.25)'); rect(63, 21, 14, 14, '#d23a3a'); rect(66, 24, 4, 3, '#a02020'); }
  if (sunset > 0) { ctx.globalAlpha = sunset; rect(42, 82, 30, 30, 'rgba(255,200,120,0.35)'); rect(46, 86, 22, 22, '#ffcf5a'); }
  ctx.globalAlpha = 1;
  // stars in ominous sky
  if (om > 0) for (let i = 0; i < 30; i++) {
    ctx.globalAlpha = om * (0.4 + 0.6 * hash(i + Math.floor(t * 3)));
    rect(hash(i * 3.7) * W, hash(i * 9.1) * 70, 1, 1, '#ffd0d0');
  }
  ctx.globalAlpha = 1;
  // mountains (two parallax layers)
  const layers = [[0.25, 8, 40, '#8aa6c8', '#3a1a2a'], [0.5, 10, 26, '#6f8fb0', '#2a0f1c']];
  layers.forEach(([par, w, amp, dayC, omC], li) => {
    const col = sunset > 0 ? mix(om > 0 ? omC : dayC, li ? '#7a4a6a' : '#9a6a7a', sunset) : mix(dayC, omC, om);
    ctx.fillStyle = col;
    const off = cam * par;
    for (let i = -2; i < W / w + 3; i++) {
      const wi = i + Math.floor(off / w);
      const n = wi / 6, i0 = Math.floor(n), f = n - i0, sm = f * f * (3 - 2 * f);
      const v = lerp(hash(i0 * 1.37 + li * 50), hash((i0 + 1) * 1.37 + li * 50), sm);
      const hm = 6 + Math.floor((v * 0.8 + hash(wi * 0.73 + li) * 0.2) * amp / 4) * 4;
      ctx.fillRect(wi * w - off, GY - hm - (li ? 0 : 6), w + 0.5, hm + 20);
    }
  });
  // clouds
  ctx.globalAlpha = 1 - om * 0.8;
  for (let i = 0; i < 6; i++) {
    const cx = frac((hash(i * 4.4) * 420 + t * 4 - cam * 0.15) / 440) * 440 - 60, cy = 12 + hash(i * 8.8) * 34;
    const c = sunset > 0 ? mix('#ffffff', '#ffc2a0', sunset) : om > 0 ? mix('#ffffff', '#5a2a3a', om) : '#ffffff';
    rect(cx, cy, 36, 6, c); rect(cx + 6, cy - 4, 20, 4, c); rect(cx + 10, cy + 6, 22, 3, c);
  }
  ctx.globalAlpha = 1;
}
function drawTerrain(t) {
  const cam = camX(t);
  for (const b of blocks) {
    if (b.x - cam < -40 || b.x - cam > W + 40) continue;
    if (carved(b, t)) {
      if (b.under) rect(b.x, b.y, BS, BS, b.y === GY ? '#3e2716' : '#2c1c10');
      continue;
    }
    ctx.drawImage(TEX[b.type][b.v], b.x, b.y, BS, BS);
  }
  for (const [x, c] of flowers) { rect(x + 1, GY - 4, 1, 4, '#3c7a24'); rect(x, GY - 6, 3, 2, c); }
  // trench glow after Hollow Purple
  if (t > HP.t0) {
    const a = 0.5 * (1 - seg(t, 26.9, 28.5));
    if (a > 0) {
      ctx.globalAlpha = a;
      rect(HP.carveFrom, GY + 18, Math.min(hpX(t), 560) - HP.carveFrom, 2, '#c77dff');
      ctx.globalAlpha = 1;
    }
  }
}

// ---------- effects ----------
function bolt(x1, y1, x2, y2, seed, segs, jit, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'miter';
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i < segs; i++) {
    const k = i / segs;
    ctx.lineTo(lerp(x1, x2, k) + (hash(seed + i * 1.7) - 0.5) * jit, lerp(y1, y2, k) + (hash(seed + i * 2.9) - 0.5) * jit);
  }
  ctx.lineTo(x2, y2); ctx.stroke();
}
function orb(x, y, r, inner, mid, t) {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, inner); g.addColorStop(0.5, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  // blocky core
  const s = r * (0.9 + 0.08 * Math.sin(t * 30));
  rect(x - s / 2, y - s / 2, s, s, inner); rect(x - s / 4, y - s / 4, s / 2, s / 2, '#fff');
}
function star4(x, y, s, col) {
  rect(x - s, y - 0.4, s * 2, 0.8, col); rect(x - 0.4, y - s, 0.8, s * 2, col);
  rect(x - s * 0.3, y - s * 0.3, s * 0.6, s * 0.6, col);
}
function drawVoid(t, cx, cy) {
  const tt = t - 17.9;
  rect(0, 0, W, H, '#02030c');
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
  g.addColorStop(0, 'rgba(90,140,255,0.35)'); g.addColorStop(0.4, 'rgba(120,60,200,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // information "glyph" grid
  for (let i = 0; i < 90; i++) {
    const gx = (i % 18) * 18 + 4, gy = Math.floor(i / 18) * 40 + ((tt * 12 + i * 7) % 40);
    ctx.globalAlpha = 0.12 + 0.18 * hash(i + Math.floor(t * 8));
    rect(gx, gy, 2, 2, '#7fe8ff');
  }
  ctx.globalAlpha = 1;
  // star streams
  const COLS = ['#ffffff', '#bff4ff', '#9cc8ff', '#f3c8ff'];
  for (let i = 0; i < 260; i++) {
    const a = hash(i) * Math.PI * 2 + tt * 0.25 * (hash(i + 5) - 0.5);
    const sp = 25 + hash(i + 9) * 90;
    const r = (hash(i + 13) * 260 + tt * sp) % 260;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.75;
    const s = 0.6 + (r / 260) * 2;
    ctx.globalAlpha = Math.min(1, r / 40);
    rect(x, y, s, s, COLS[i % 4]);
  }
  ctx.globalAlpha = 1;
  // central singularity with light ring
  const ring = 20 + 3 * Math.sin(t * 4), ry = cy - 58;
  g = ctx.createRadialGradient(cx, ry, ring * 0.6, cx, ry, ring * 1.8);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.2, 'rgba(255,255,255,0.95)'); g.addColorStop(0.45, 'rgba(120,220,255,0.6)'); g.addColorStop(1, 'rgba(60,40,180,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - ring * 2, ry - ring * 2, ring * 4, ring * 4);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, ry, ring * 0.62, 0, Math.PI * 2); ctx.fill();
}

// ---------- text / HUD ----------
const FONT = '"Press Start 2P", monospace';
function txt(s, x, y, size, fill, o = {}) {
  ctx.font = `${size}px ${o.font || FONT}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.stroke) { ctx.lineWidth = o.stroke; ctx.strokeStyle = o.strokeCol || '#000'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (o.shadow !== false) { ctx.fillStyle = o.shadowCol || 'rgba(0,0,0,0.85)'; const d = o.sh ?? size * 0.14; ctx.fillText(s, x + d, y + d); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function bigText(t, s, t0, t1, y, size, fill, o = {}) {
  if (t < t0 || t > t1) return;
  const pop = 1 + 0.7 * (1 - easeOut(clamp((t - t0) / 0.18)));
  const a = Math.min(1, (t1 - t) / 0.3);
  ctx.save(); ctx.globalAlpha = a;
  const jx = o.jitter ? (hash(Math.floor(t * 30)) - 0.5) * o.jitter : 0;
  ctx.translate(W / 2 + jx, y); ctx.scale(pop, pop);
  txt(s, 0, 0, size, fill, { stroke: size * 0.35, strokeCol: o.strokeCol || '#000', font: o.font, sh: o.sh });
  ctx.restore();
}
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function drawHeart(x, y, full, flash) {
  HEART.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== 'X') return;
    rect(x + i * 0.9, y + j * 0.9, 0.9, 0.9, full ? (i === 1 && j === 1 ? '#ffb0b0' : '#e0202a') : flash ? '#fff' : '#3a0a0e');
  }));
}
const ICONS = [
  { px: ['......WW', '.....WCW', '....WCW.', '.B.WCW..', '..BCW...', '..BB....', '.B..B...', 'B.......'], c: { W: '#d8fdff', C: '#4ee1d6', B: '#6b4a20' } },
  { px: ['.GGGGG..', 'G..B..G.', '...B....', '...B....', '...B....', '...B....', '...B....', '........'], c: { G: '#8ff', B: '#6b4a20' } },
  { px: ['...B....', '..RRRR..', '.RRRRRR.', '.RRWRRR.', '.RRRRRR.', '.RRRRRR.', '..RRRR..', '........'], c: { R: '#d2202a', W: '#fff', B: '#5b3a1a' } },
  { px: ['..PPPP..', '.PpppPP.', 'PpPPPPpP', 'PPPPPPPP', 'PPPPPPPP', 'PpPPPPpP', '.PPPPPP.', '..PPPP..'], c: { P: '#1f7a6a', p: '#5fd8b8' } },
];
function drawHUD(t) {
  const a = seg(t, 3.2, 3.6) * (1 - seg(t, 14.9, 15.2)) + seg(t, 27.5, 27.9) * (1 - seg(t, 28.2, 28.6));
  if (a <= 0) return;
  ctx.globalAlpha = a;
  const hx = 106, hy = 166;
  rect(hx - 1, hy - 1, 110, 14, '#000');
  for (let i = 0; i < 9; i++) {
    rect(hx + i * 12, hy, 12, 12, '#8b8b8b'); rect(hx + i * 12 + 1, hy + 1, 10, 10, '#5a5a5a');
    const ic = ICONS[i];
    if (ic) ic.px.forEach((row, j) => [...row].forEach((c, k) => { if (ic.c[c]) rect(hx + i * 12 + 2 + k, hy + 2 + j, 1, 1, ic.c[c]); }));
  }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(hx - 0.5, hy - 0.5, 13, 13);
  rect(hx, hy - 4, 108, 2, '#1a1a1a'); rect(hx, hy - 4, 108 * (0.35 + 0.4 * seg(t, 11.0, 12.0)), 2, '#7ee83a');
  const hp = t > 13.4 ? 6 : 10, flash = between(t, 13.4, 13.8) && Math.floor(t * 12) % 2 === 0;
  for (let i = 0; i < 10; i++) drawHeart(hx + i * 7, hy - 11, i < hp, flash);
  ctx.globalAlpha = 1;
}
function drawChat(t) {
  const live = CHAT.filter(([t0]) => t >= t0 && t < t0 + 4).slice(-3);
  const base = 150;
  live.forEach(([t0, s, col], i) => {
    const a = Math.min(1, (t0 + 4 - t) / 0.5), y = base - (live.length - 1 - i) * 9;
    ctx.font = `5px ${FONT}`;
    const w = ctx.measureText(s).width;
    ctx.globalAlpha = a;
    rect(2, y - 4.5, w + 6, 9, 'rgba(0,0,0,0.5)');
    txt(s, 5, y + 0.5, 5, col, { align: 'left', sh: 0.6, shadowCol: '#3a3a3a' });
  });
  ctx.globalAlpha = 1;
}
function drawToasts(t) {
  for (const [t0, head, name, col, ic] of TOASTS) {
    if (t < t0 || t > t0 + 2.4) continue;
    const k = easeOut(seg(t, t0, t0 + 0.3)) * (1 - easeIn(seg(t, t0 + 2.1, t0 + 2.4)));
    const x = W - 4 - 112 * k, y = 4;
    rect(x, y, 112, 24, '#212121'); rect(x + 1, y + 1, 110, 22, '#3b3b3b'); rect(x + 2, y + 2, 108, 20, '#212121');
    rect(x + 6, y + 6, 12, 12, ic); rect(x + 9, y + 9, 6, 6, '#fff');
    txt(head, x + 23, y + 8, 5, col, { align: 'left', sh: 0.6 });
    txt(name, x + 23, y + 16, 5, '#fff', { align: 'left', sh: 0.6 });
  }
}
function titleCard(t) {
  if (t < 3) {
    const a = 1 - seg(t, 2.3, 3);
    ctx.globalAlpha = a;
    rect(0, 0, W, H, 'rgba(10,5,25,0.45)');
    const pop = 1 + 0.4 * (1 - easeOut(seg(t, 0.1, 0.6)));
    ctx.save(); ctx.translate(W / 2, 62); ctx.scale(pop, pop);
    for (let d = 4; d > 0; d--) txt('JUJUTSU', d * 0.8, d * 0.8, 20, '#2b1640', { shadow: false });
    txt('JUJUTSU', 0, 0, 20, '#c9a0ff', { shadow: false });
    ctx.restore();
    ctx.save(); ctx.translate(W / 2, 92); ctx.scale(pop, pop);
    for (let d = 5; d > 0; d--) txt('CRAFT', d * 0.9, d * 0.9, 28, '#3a3a3a', { shadow: false });
    const g = ctx.createLinearGradient(0, -14, 0, 14);
    g.addColorStop(0, '#e8e8e8'); g.addColorStop(0.5, '#a8a8a8'); g.addColorStop(1, '#7a7a7a');
    txt('CRAFT', 0, 0, 28, g, { shadow: false });
    ctx.restore();
    if (t > 0.7) { ctx.globalAlpha = a * seg(t, 0.7, 1.1); txt('~ a blocky fan animation ~', W / 2, 122, 5, '#ffff55'); }
    ctx.globalAlpha = 1;
  }
  if (t > 28.5) {
    const a = seg(t, 28.5, 29.2);
    ctx.globalAlpha = a * 0.6; rect(0, 0, W, H, '#0a0514');
    ctx.globalAlpha = a;
    txt('JUJUTSU CRAFT', W / 2, 40, 14, '#c9a0ff', { stroke: 3, strokeCol: '#2b1640' });
    txt('THE END', W / 2, 62, 10, '#fff', { stroke: 3 });
    txt('fan animation · pure JavaScript', W / 2, 80, 5, '#ffff55');
    ctx.globalAlpha = 1;
  }
}

// ---------- main render ----------
function render(t) {
  screen();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  drawSky(t);

  const cam = camX(t), [shx, shy] = shake(t);
  const gojo = gojoPose(t), yuji = yujiPose(t);
  // close-up zoom on Gojo's face
  const zk = easeInOut(seg(t, 15.25, 15.7)) * (1 - easeInOut(seg(t, 16.75, 17.2)));
  const z = 1 + 4.5 * zk;
  const headX = gojo.x - cam, headY = GY - 29 * gojo.sc;
  const applyCam = () => {
    screen();
    const cx = lerp(headX, W / 2, zk), cy = lerp(headY, H / 2, zk);
    ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-headX, -headY);
    ctx.translate(-cam + shx, shy);
  };

  ctx.save();
  applyCam();
  const gc = giantCurse(t), sc = smallCurse(t);
  if (gc && !between(t, 18.6, 22.6)) drawCurse(gc, t);
  if (sc) drawCurse(sc, t);
  drawTerrain(t);

  // curse emerging: dirt spray
  for (let k = 0; k < 5; k++) burst(t, 6.3 + k * 0.22, 0.9, 215, GY, 14, 10 + k * 17, { sp: 40, up: 50, g: 260, colors: DIRTP, size: 2.5, flat: 0.4 });
  for (let k = 0; k < 4; k++) burst(t, 12.2 + k * 0.25, 1.1, 300, GY, 22, 200 + k * 13, { sp: 70, up: 80, g: 240, colors: DIRTP, size: 4, flat: 0.4 });
  // roar shock rings
  if (between(t, 13.15, 14.2)) for (let i = 0; i < 3; i++) {
    const k = seg(t, 13.15 + i * 0.15, 13.9 + i * 0.15); if (k <= 0 || k >= 1) continue;
    ctx.strokeStyle = `rgba(255,70,70,${1 - k})`; ctx.lineWidth = 2;
    const r = 10 + k * 160; ctx.strokeRect(300 - r, 96 - r * 0.6, r * 2, r * 1.2);
  }

  // Yuji cursed energy aura before Black Flash
  if (between(t, 10.15, 10.65)) for (let i = 0; i < 16; i++) {
    const ph = frac(t * 2 + hash(i));
    ctx.globalAlpha = 1 - ph;
    rect(yuji.x + (hash(i + 1) - 0.5) * 16, GY - ph * 34, 2, 2, i % 3 ? '#4aa8ff' : '#bfe6ff');
  }
  ctx.globalAlpha = 1;
  drawChar(yuji, 'yuji');

  // Gojo teleport
  if (between(t, 14.25, 14.9)) {
    const k = seg(t, 14.25, 14.9);
    ctx.globalAlpha = 1 - k; rect(gojo.x - 4 + k * 3, 0, 8 - k * 6, GY, '#dff8ff'); ctx.globalAlpha = 1;
  }
  burst(t, 14.3, 0.9, 140, GY - 18, 26, 777, { sp: 40, colors: ['#ffffff', '#9ff0ff', '#6fd6ff'], size: 2, g: -20 });
  drawChar(gojo, 'gojo');
  // eye glint in close-up
  if (between(t, 16.2, 16.75)) {
    const k = Math.sin(seg(t, 16.2, 16.75) * Math.PI);
    ctx.save(); ctx.translate(gojo.x + 3 * gojo.sc, GY - 28.5 * gojo.sc); ctx.rotate(t * 2);
    star4(0, 0, 4 * k, '#e8ffff'); ctx.restore();
  }

  // Divergent Fist hits
  burst(t, 9.25, 0.35, 201, 110, 16, 31, { sp: 90, colors: ['#ffffff', '#fff39a', '#bfe6ff'], size: 2 });
  if (between(t, 9.45, 9.85)) {
    const k = seg(t, 9.45, 9.85);
    ctx.strokeStyle = `rgba(90,170,255,${1 - k})`; ctx.lineWidth = 2;
    ctx.strokeRect(201 - k * 26, 110 - k * 26, k * 52, k * 52);
  }
  burst(t, 9.45, 0.4, 204, 110, 14, 57, { sp: 70, colors: ['#4aa8ff', '#bfe6ff'], size: 2 });

  // Black Flash
  if (between(t, 10.66, 11.15)) {
    ctx.save(); screen(); ctx.globalAlpha = 0.6; rect(0, 0, W, H, '#140008'); ctx.restore();
    const seed = Math.floor(t * 25) * 31;
    for (let i = 0; i < 9; i++) {
      const a = hash(seed + i) * Math.PI * 2, len = 25 + hash(seed + i + 50) * 70;
      const ex = 201 + Math.cos(a) * len, ey = 110 + Math.sin(a) * len * 0.8;
      bolt(201, 110, ex, ey, seed + i * 11, 7, 14, 3.2, '#ff1a3c');
      bolt(201, 110, ex, ey, seed + i * 11, 7, 14, 1.2, '#000000');
    }
    rect(196, 105, 10, 10, '#000'); rect(198, 107, 6, 6, '#ff1a3c');
  }
  burst(t, 10.66, 0.8, 201, 110, 30, 91, { sp: 120, colors: ['#ff1a3c', '#000000', '#ff6a6a'], size: 3 });
  // curse death poof
  burst(t, 11.62, 0.9, 322, 112, 24, 400, { sp: 18, up: 22, colors: SMOKE, size: 4, shrink: 0 });

  // Hollow Purple
  if (between(t, 23.3, HP.t0 + 0.05)) {
    const tt = t - 23.3;
    const conv = easeInOut(seg(t, 24.6, 25.2));
    const spin = tt * 4;
    const bx = lerp(128, 166, conv) + Math.cos(spin) * 4 * conv, by = lerp(98, 100, conv) + Math.sin(spin) * 4 * conv;
    const rx = lerp(162, 166, conv) - Math.cos(spin) * 4 * conv, ry = lerp(98, 100, conv) - Math.sin(spin) * 4 * conv;
    const merged = t >= 25.15;
    if (!merged) {
      const rb = 6 * easeOut(seg(t, 23.4, 23.8)), rr = 6 * easeOut(seg(t, 23.9, 24.3));
      if (rb > 0) {
        for (let i = 0; i < 14; i++) { // Blue pulls things in
          const a = hash(i) * 6.28 + tt * 3, d = 18 * (1 - frac(tt * 1.3 + hash(i + 3)));
          rect(bx + Math.cos(a) * d, by + Math.sin(a) * d, 1.5, 1.5, '#9fe8ff');
        }
        orb(bx, by, rb, '#7fd0ff', 'rgba(40,110,255,0.6)', t);
      }
      if (rr > 0) {
        for (let i = 0; i < 3; i++) { // Red pushes out
          const k = frac(tt * 1.5 + i / 3);
          ctx.strokeStyle = `rgba(255,60,60,${1 - k})`; ctx.lineWidth = 1;
          ctx.strokeRect(rx - k * 16, ry - k * 16, k * 32, k * 32);
        }
        orb(rx, ry, rr, '#ff6a5a', 'rgba(255,30,30,0.6)', t);
      }
    } else {
      const r = lerp(5, 18, easeOut(seg(t, 25.15, 25.9)));
      const seed = Math.floor(t * 20) * 17;
      for (let i = 0; i < 5; i++) {
        const a = hash(seed + i) * 6.28, l = r * (1.6 + hash(seed + i + 9));
        bolt(166, 100, 166 + Math.cos(a) * l, 100 + Math.sin(a) * l, seed + i, 5, 6, 1, '#e0a8ff');
      }
      orb(166, 100, r, '#c77dff', 'rgba(120,40,220,0.7)', t);
    }
  }
  burst(t, 25.15, 0.6, 166, 100, 30, 505, { sp: 90, colors: ['#ffffff', '#d9a8ff', '#8a2be2'], size: 2 });
  if (between(t, HP.t0, HP.t1 + 0.1)) {
    const sx = hpX(t), r = hpR(t);
    const g = ctx.createLinearGradient(HP.x0, 0, sx, 0);
    g.addColorStop(0, 'rgba(160,80,255,0)'); g.addColorStop(1, 'rgba(200,120,255,0.75)');
    ctx.fillStyle = g; ctx.fillRect(HP.x0, HP.y - r * 0.9, sx - HP.x0, r * 1.8);
    orb(sx, HP.y, r, '#c77dff', 'rgba(120,40,220,0.75)', t);
    const seed = Math.floor(t * 30) * 7;
    for (let i = 0; i < 6; i++) {
      const a = hash(seed + i) * 6.28, l = r * (1.3 + hash(seed + i + 9) * 0.8);
      bolt(sx, HP.y, sx + Math.cos(a) * l, HP.y + Math.sin(a) * l, seed + i, 5, 8, 1.2, '#f0d0ff');
    }
  }
  // trail afterglow
  if (between(t, HP.t1, 27.7)) {
    ctx.globalAlpha = 0.5 * (1 - seg(t, HP.t1, 27.7));
    rect(HP.x0, HP.y - 36, 480, 72, '#b070ff'); ctx.globalAlpha = 1;
  }
  // giant curse disintegrates + debris
  burst(t, 26.43, 1.4, 300, 70, 70, 900, { sp: 90, vx: 90, colors: ['#2a1030', '#4a1a45', '#ff3a30', '#c77dff'], size: 4, g: 40 });
  for (let k = 0; k < 6; k++) burst(t, 26.1 + k * 0.12, 1.3, 190 + k * 55, GY, 16, 1000 + k * 9, { sp: 60, up: 70, g: 200, colors: DIRTP.concat(['#7f7f7f']), size: 3.5, flat: 0.5 });
  for (let k = 0; k < 6; k++) burst(t, 27.0 + k * 0.1, 2.2, 180 + k * 50, GY + 5, 12, 1300 + k * 5, { sp: 10, up: 12, colors: SMOKE, size: 5, shrink: -0.4 });
  ctx.restore();

  // Domain Expansion: Infinite Void
  const vr = between(t, 17.9, 23.2) ? 400 * easeIn(seg(t, 17.9, 18.6)) * (1 - easeIn(seg(t, 22.6, 23.15))) : 0;
  if (vr > 0.5) {
    const cx = gojo.x - cam + shx, cy = GY - 16 + shy;
    ctx.save(); screen();
    ctx.beginPath(); ctx.arc(cx, cy, vr, 0, Math.PI * 2); ctx.clip();
    drawVoid(t, cx, cy);
    applyCam();
    if (gc) {
      drawCurse(gc, t);
      screen();
      for (let i = 0; i < 12; i++) { // information overload
        const a = t * 3 + i * 0.52, d = 40 + Math.sin(t * 5 + i) * 6;
        txt(String.fromCharCode(0x30a0 + ((i * 7 + Math.floor(t * 10)) % 90)), 300 - cam + Math.cos(a) * d, 70 + Math.sin(a) * d * 0.6, 5, '#aef', { shadow: false, font: 'sans-serif' });
      }
      applyCam();
    }
    drawChar(gojo, 'gojo');
    ctx.restore();
    screen();
    ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, vr, 0, Math.PI * 2); ctx.stroke();
  }

  screen();
  // overlays
  if (between(t, 10.6, 10.66) || between(t, 26.43, 26.55) || between(t, 17.9, 17.98)) rect(0, 0, W, H, '#fff');
  if (between(t, 26.55, 27.0)) { ctx.globalAlpha = 1 - seg(t, 26.55, 27.0); rect(0, 0, W, H, '#f3e6ff'); ctx.globalAlpha = 1; }
  if (between(t, 10.66, 10.78)) { ctx.globalCompositeOperation = 'difference'; rect(0, 0, W, H, '#fff'); ctx.globalCompositeOperation = 'source-over'; }
  const om = ominous(t);
  if (om > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 200);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,0,10,${0.55 * om})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const lb = 14 * (easeInOut(seg(t, 15.0, 15.4)) - easeInOut(seg(t, 27.0, 27.5)));
  if (lb > 0) { rect(0, 0, W, lb, '#000'); rect(0, H - lb, W, lb, '#000'); }

  bigText(t, 'DIVERGENT FIST', 9.3, 10.1, 40, 11, '#bfe6ff', { strokeCol: '#0b2a55' });
  bigText(t, 'BLACK FLASH', 10.66, 11.9, 44, 20, '#ff1a3c', { jitter: 3 });
  bigText(t, '黒閃', 10.8, 11.9, 70, 12, '#fff', { font: 'bold sans-serif', sh: 0.8 });
  bigText(t, 'DOMAIN EXPANSION', 17.35, 18.9, 38, 12, '#ffffff');
  bigText(t, 'INFINITE VOID', 18.7, 21.3, 44, 18, '#8ff4ff', { strokeCol: '#0a1a3a' });
  bigText(t, '無量空処', 19.0, 21.3, 68, 12, '#ffffff', { font: 'bold sans-serif', sh: 0.8 });
  bigText(t, 'HOLLOW PURPLE', 25.1, 26.35, 38, 17, '#d68bff', { strokeCol: '#2a0a4a' });
  bigText(t, '虚式「茈」', 25.3, 26.35, 60, 11, '#ffffff', { font: 'bold sans-serif', sh: 0.8 });

  drawHUD(t);
  drawChat(t);
  drawToasts(t);
  titleCard(t);
}

// ---------- audio ----------
let actx = null, master = null, noiseBuf = null, muted = false;
function initAudio() {
  if (actx) { actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = muted ? 0 : 0.45; master.connect(actx.destination);
  noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function tone(f, d, type = 'square', v = 0.08, slide = 0, delay = 0) {
  if (!actx) return;
  const t0 = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.05);
}
function noise(d, v = 0.3, freq = 1200, freqEnd = 0, delay = 0) {
  if (!actx) return;
  const t0 = actx.currentTime + delay, s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t0);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + d + 0.05);
}
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
const SFX = [
  [0.1, () => { tone(mf(57), 0.6, 'triangle', 0.08); tone(mf(64), 0.6, 'triangle', 0.06, 0, 0.12); }],
  [6.3, () => { noise(1.4, 0.35, 300, 80); tone(55, 1.2, 'sawtooth', 0.06, 40); }],
  [9.25, () => { noise(0.15, 0.5, 2500); tone(160, 0.15, 'square', 0.1, 60); }],
  [9.45, () => { noise(0.2, 0.4, 1200); tone(220, 0.25, 'sine', 0.12, 80); }],
  [10.2, () => tone(110, 0.4, 'sawtooth', 0.06, 440)],
  [10.6, () => { noise(0.8, 0.7, 5000, 200); tone(90, 0.6, 'square', 0.15, 30); for (let i = 0; i < 5; i++) noise(0.05, 0.3, 6000, 0, 0.08 + i * 0.07); }],
  [11.2, () => { tone(mf(79), 0.15, 'square', 0.06); tone(mf(84), 0.3, 'square', 0.06, 0, 0.12); }],
  [11.62, () => noise(0.4, 0.3, 3000, 400)],
  [12.2, () => { noise(1.2, 0.35, 250, 60); tone(45, 1.4, 'sawtooth', 0.08, 35); }],
  [13.15, () => { tone(140, 1.0, 'sawtooth', 0.14, 50); tone(147, 1.0, 'sawtooth', 0.1, 48); noise(0.9, 0.35, 900, 100); }],
  [14.3, () => { tone(600, 0.35, 'sine', 0.1, 2400); tone(1200, 0.3, 'triangle', 0.05, 3000, 0.05); }],
  [16.25, () => { tone(mf(96), 0.6, 'sine', 0.08); tone(mf(103), 0.5, 'sine', 0.05, 0, 0.06); }],
  [17.9, () => { noise(1.5, 0.5, 600, 60); tone(55, 2.0, 'sine', 0.25, 30); tone(mf(88), 1.5, 'sine', 0.05, mf(100)); }],
  [23.4, () => tone(mf(64), 1.4, 'sine', 0.1, mf(62))],
  [23.9, () => tone(mf(71), 1.2, 'sawtooth', 0.04, mf(73))],
  [24.6, () => tone(200, 1.3, 'sawtooth', 0.06, 900)],
  [25.15, () => { noise(0.4, 0.4, 4000, 300); tone(mf(52), 0.9, 'square', 0.08, mf(64)); }],
  [26.0, () => { noise(1.2, 0.6, 3000, 80); tone(300, 1.0, 'sawtooth', 0.12, 40); }],
  [26.43, () => { noise(1.6, 0.8, 1500, 50); tone(60, 1.4, 'square', 0.2, 25); }],
  [26.95, () => { tone(mf(72), 0.15, 'square', 0.06); tone(mf(76), 0.15, 'square', 0.06, 0, 0.12); tone(mf(79), 0.4, 'square', 0.06, 0, 0.24); }],
];
function musicStep(s) {
  const t = s * 0.25, beat = s % 8;
  if (t < 3) { if (s % 2 === 0) tone(mf([57, 60, 64, 67][(s / 2) % 4]), 0.4, 'triangle', 0.05); return; }
  if (t < 12) {
    const bass = [45, 45, 57, 45, 48, 48, 50, 52][beat];
    tone(mf(bass), 0.2, 'square', 0.05);
    if (s % 2 === 1 && t > 3.5) tone(mf([69, 72, 76, 72, 74, 76, 79, 76][(s >> 1) % 8]), 0.18, 'triangle', 0.035);
    if (beat === 0 || beat === 4) noise(0.06, 0.12, 200);
    if (beat === 2 || beat === 6) noise(0.05, 0.08, 5000);
    return;
  }
  if (t < 17.8) { if (beat % 4 === 0) { tone(mf(33), 0.9, 'sawtooth', 0.07); tone(mf(34), 0.9, 'sawtooth', 0.04); } return; }
  if (t < 23.2) { tone(mf([81, 84, 86, 88, 91, 93][Math.floor(hash(s) * 6)]), 0.5, 'sine', 0.035); if (beat === 0) tone(mf(40), 2, 'sine', 0.08); return; }
  if (t < 26) { tone(mf(40 + Math.floor((t - 23.2) * 4)), 0.22, 'sawtooth', 0.05); return; }
  if (t > 27.3 && t < 30) { const n = [60, 64, 67, 72, 67, 64, 65, 69][beat]; tone(mf(n), 0.3, 'triangle', 0.05); if (beat % 4 === 0) tone(mf(48), 0.8, 'square', 0.04); }
}

// ---------- playback ----------
const scrub = document.getElementById('scrub'), playBtn = document.getElementById('play');
const muteBtn = document.getElementById('mute'), timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay'), bigPlay = document.getElementById('bigPlay');
const stage = document.getElementById('stage');
const startAt = parseFloat(new URLSearchParams(location.search).get('t'));
let t = Number.isFinite(startAt) ? clamp(startAt, 0, DUR) : 0, prevT = t, playing = false, last = 0, dragging = false;

function setPlaying(p) {
  playing = p;
  if (p) { initAudio(); if (t >= DUR) seek(0); overlay.classList.add('hidden'); last = performance.now(); }
  playBtn.textContent = p ? '❚❚' : '▶';
}
function seek(v) { t = clamp(v, 0, DUR); prevT = t; }
function toggle() { setPlaying(!playing); }
function frame(now) {
  if (playing) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    t = Math.min(DUR, t + dt);
    if (actx && !muted) {
      for (const [et, fn] of SFX) if (prevT < et && et <= t) fn();
      for (let s = Math.floor(prevT / 0.25) + 1; s <= Math.floor(t / 0.25); s++) musicStep(s);
    }
    prevT = t;
    if (t >= DUR) {
      setPlaying(false);
      bigPlay.textContent = '↻ REPLAY';
      document.getElementById('hint').textContent = 'thanks for watching!';
      overlay.classList.remove('hidden');
    }
  }
  render(t);
  if (!dragging) scrub.value = t;
  timeEl.textContent = t.toFixed(1) + 's';
  requestAnimationFrame(frame);
}

bigPlay.addEventListener('click', () => setPlaying(true));
playBtn.addEventListener('click', toggle);
canvas.addEventListener('click', toggle);
scrub.addEventListener('input', () => { dragging = true; seek(parseFloat(scrub.value)); overlay.classList.add('hidden'); });
scrub.addEventListener('change', () => { dragging = false; });
function setMuted(m) {
  muted = m; muteBtn.textContent = m ? '🔇' : '🔊';
  if (master) master.gain.value = m ? 0 : 0.45;
}
muteBtn.addEventListener('click', () => setMuted(!muted));
function toggleFs() {
  const el = document.fullscreenElement || document.webkitFullscreenElement;
  if (el) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else if (stage.requestFullscreen) stage.requestFullscreen();
  else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
}
document.getElementById('fs').addEventListener('click', toggleFs);
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.code !== 'Space') return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  else if (e.code === 'ArrowRight') seek(t + 1);
  else if (e.code === 'ArrowLeft') seek(t - 1);
  else if (e.code === 'KeyR') { seek(0); setPlaying(true); }
  else if (e.code === 'KeyM') setMuted(!muted);
  else if (e.code === 'KeyF') toggleFs();
});
if (t > 0) overlay.classList.add('hidden');

window.__jjk = { render, seek: v => { seek(v); render(v); } }; // handy for debugging
(document.fonts ? document.fonts.load(`10px ${FONT}`).catch(() => {}) : Promise.resolve()).then(() => requestAnimationFrame(frame));
})();
