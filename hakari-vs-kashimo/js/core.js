// Core: canvas, math, camera, particles, post effects, text.
'use strict';
const W = 320, H = 180, RES = 4, DUR = 120, TAU = Math.PI * 2;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
cv.width = W * RES; cv.height = H * RES;
ctx.imageSmoothingEnabled = false;
const buf = document.createElement('canvas');
buf.width = cv.width; buf.height = cv.height;
const bctx = buf.getContext('2d');

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutExpo = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const easeOutBack = k => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const frac = v => v - Math.floor(v);
const between = (t, a, b) => t >= a && t < b;
const q12 = t => Math.floor(t * 12) / 12; // animate "on twos"
const pulse = (t, a, d) => (between(t, a, a + d) ? Math.sin(((t - a) / d) * Math.PI) : 0);

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function screen() { ctx.setTransform(RES, 0, 0, RES, 0, 0); }
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k))).toString(16).padStart(2, '0')).join(''); }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${clamp(a)})`; }
function circle(x, y, r, c) { if (r <= 0) return; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function ring(x, y, r, w, c, sy = 1) {
  if (r <= 0 || w <= 0) return;
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, r, r * sy, 0, 0, TAU); ctx.stroke();
}
function glow(x, y, r, col, a = 1) {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- camera ----------
const cam = { x: 0, y: -30, z: 1, r: 0, sx: 0, sy: 0 };
function setCam(x, y, z = 1, r = 0, sh = [0, 0]) { cam.x = x; cam.y = y; cam.z = z; cam.r = r; cam.sx = sh[0]; cam.sy = sh[1]; }
function applyCam(par = 1) {
  screen();
  ctx.translate(W / 2 + cam.sx * par, H / 2 + cam.sy * par);
  ctx.rotate(cam.r * par);
  const z = 1 + (cam.z - 1) * par * par;
  ctx.scale(z, z);
  ctx.translate(-cam.x * par, -cam.y * par - (1 - par) * 30);
}
function w2s(x, y) {
  const dx = (x - cam.x) * cam.z, dy = (y - cam.y) * cam.z, c = Math.cos(cam.r), s = Math.sin(cam.r);
  return [W / 2 + cam.sx + dx * c - dy * s, H / 2 + cam.sy + dx * s + dy * c];
}
function shakeOf(lt, list) {
  let a = 0;
  for (const [t0, d, amp] of list) if (between(lt, t0, t0 + d)) a += amp * Math.pow(1 - (lt - t0) / d, 2);
  const n = Math.floor(lt * 30);
  return [(hash(n * 1.3) - 0.5) * 2 * a, (hash(n * 2.7 + 9) - 0.5) * 2 * a];
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
const TX = {}, PAT = {};
function defTex(name, fn) {
  TX[name] = [0, 1, 2, 3].map(v => makeTex(v * 101 + name.length * 17 + name.charCodeAt(0), fn));
  const p = ctx.createPattern(TX[name][0], 'repeat');
  if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(1.25));
  PAT[name] = p;
}
const shades = arr => (x, y, r) => pick(arr, r);
defTex('grass', (x, y, r) => (y < 2 || (y === 2 && r < 0.5) ? pick(['#5da83a', '#4e9130', '#6cbf45'], r) : pick(['#8a5a36', '#79492b', '#9b6a43'], r)));
defTex('dirt', shades(['#8a5a36', '#79492b', '#9b6a43', '#6b4026']));
defTex('stone', shades(['#7f7f7f', '#6e6e6e', '#8f8f8f', '#5f5f5f']));
defTex('concrete', shades(['#9a9aa0', '#8e8e95', '#a4a4aa', '#878790']));
defTex('asphalt', shades(['#3a3a40', '#34343a', '#414147', '#2e2e33']));
defTex('brick', (x, y, r) => (y % 4 === 3 || (x + (y >> 2) * 4) % 8 === 0 ? '#b8ab98' : pick(['#8a4a3a', '#7a3f32', '#94553f'], r)));
defTex('glass', (x, y, r) => (y % 4 === 0 ? '#20303f' : pick(['#3a5a7a', '#35526f', '#44688a', '#4c7496'], r)));
defTex('bone', shades(['#e8e0c8', '#d8ceb0', '#f0ead8', '#c8bea0']));
defTex('nether', shades(['#6b1d1d', '#5a1616', '#7a2424', '#4a1010']));
defTex('darkwood', (x, y, r) => (y % 4 === 0 ? '#140a08' : pick(['#2a1a14', '#221410', '#33201a'], r)));
defTex('obsidian', shades(['#140c1e', '#1c1228', '#0e0816', '#2a1a40']));
const DEBRIS_TEX = [TX.concrete, TX.concrete, TX.glass, TX.stone, TX.asphalt, TX.brick];

// ---------- particles (deterministic in time) ----------
// dt = time since the burst started.
function burst(dt, life, x, y, n, seed, o) {
  if (dt < 0 || dt > life) return;
  const k = dt / life;
  for (let i = 0; i < n; i++) {
    const a = (o.ang ?? 0) + (hash(seed + i * 3.1) - 0.5) * (o.spread ?? TAU);
    const s = (0.25 + 0.75 * hash(seed + i * 7.7)) * o.sp;
    const vx = Math.cos(a) * s + (o.vx || 0);
    const vy = Math.sin(a) * s * (o.flat || 1) - (o.up || 0) * (0.5 + hash(seed + i * 5.3));
    const drag = o.drag ? (1 - Math.exp(-o.drag * dt)) / o.drag : dt;
    const px = x + vx * drag, py = y + vy * drag + 0.5 * (o.g || 0) * dt * dt;
    const sz = (o.size || 2) * (1 - k * (o.shrink ?? 0.5)) * (0.5 + hash(seed + i * 1.3));
    ctx.globalAlpha = (o.alpha ?? 1) * (o.fade === false ? 1 : 1 - k * k);
    if (o.tex) {
      ctx.save(); ctx.translate(px, py); ctx.rotate((hash(seed + i) - 0.5) * 12 * dt);
      ctx.drawImage(o.tex[i % o.tex.length][i % 4], -sz / 2, -sz / 2, sz, sz); ctx.restore();
    } else if (o.round) circle(px, py, sz / 2, o.colors[i % o.colors.length]);
    else rect(px - sz / 2, py - sz / 2, sz, sz, o.colors[i % o.colors.length]);
  }
  ctx.globalAlpha = 1;
}
const SMOKE = ['#d8d4d0', '#bcb6b0', '#a09890', '#8a827a'];
const SPARK = ['#ffffff', '#fff6b0', '#ffd27a'];
function dust(dt, life, x, y, n, seed, size = 10, spread = 60) {
  burst(dt, life, x, y, n, seed, { sp: spread, flat: 0.35, up: 10, colors: SMOKE, size, shrink: -1.2, drag: 2.5, alpha: 0.55, round: true });
}
function debris(dt, life, x, y, n, seed, sp = 120, up = 80, size = 6) {
  burst(dt, life, x, y, n, seed, { sp, up, g: 260, tex: DEBRIS_TEX, size, shrink: 0, fade: false, flat: 0.8 });
}

// ---------- effects ----------
function bolt(x1, y1, x2, y2, seed, segs, jit, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'miter'; ctx.lineCap = 'square';
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i < segs; i++) {
    const k = i / segs;
    ctx.lineTo(lerp(x1, x2, k) + (hash(seed + i * 1.7) - 0.5) * jit, lerp(y1, y2, k) + (hash(seed + i * 2.9) - 0.5) * jit);
  }
  ctx.lineTo(x2, y2); ctx.stroke();
}
function sparkBolts(x, y, t, n, len, cols, w = 2, fps = 24) {
  const s = Math.floor(t * fps) * 31;
  for (let i = 0; i < n; i++) {
    const a = hash(s + i) * TAU, l = len * (0.4 + hash(s + i + 50) * 0.8);
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
    cols.forEach((c, j) => bolt(x, y, ex, ey, s + i * 11, 7, len * 0.25, w * (1 - j * 0.6), c));
  }
}
function orb(x, y, r, inner, outer, t) {
  if (r <= 0) return;
  glow(x, y, r * 2.6, outer, 0.7);
  const s = r * (0.92 + 0.08 * Math.sin(t * 40));
  circle(x, y, s, inner);
  circle(x, y, s * 0.6, '#ffffff');
}
// A crescent slash from (x1,y1) to (x2,y2). k: 0..1 life.
function slash(x1, y1, x2, y2, k, o = {}) {
  if (k <= 0 || k >= 1) return;
  const grow = easeOut(clamp(k / 0.2)), fade = 1 - clamp((k - 0.25) / 0.75);
  const dx = x2 - x1, dy = y2 - y1, bend = o.bend ?? 0.12, w = o.w ?? 3;
  const cx = (x1 + x2) / 2 - dy * bend, cy = (y1 + y2) / 2 + dx * bend;
  const pt = u => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2];
  const draw = (width, col, a) => {
    const N = 16, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * grow, [px, py] = pt(u), [qx, qy] = pt(Math.min(1, u + 0.01));
      let nx = -(qy - py), ny = qx - px; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const ww = Math.sin((i / N) * Math.PI) * width * fade;
      top.push([px + nx * ww, py + ny * ww]); bot.push([px - nx * ww * 0.3, py - ny * ww * 0.3]);
    }
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
    top.forEach(([a1, b1], i) => (i ? ctx.lineTo(a1, b1) : ctx.moveTo(a1, b1)));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.fill(); ctx.globalAlpha = 1;
  };
  draw(w * 2.2, o.glow || '#ff4060', 0.35);
  draw(w, o.col || '#ffffff', 1);
}
function focusLines(cx, cy, t, o = {}) {
  screen();
  const n = o.n || 70, s = Math.floor(t * (o.fps || 12)) * 97;
  ctx.fillStyle = o.color || 'rgba(255,255,255,0.85)';
  for (let i = 0; i < n; i++) {
    const a = hash(s + i * 1.7) * TAU, r0 = (o.inner || 70) + hash(s + i * 3.1) * (o.spread || 50);
    const w = (o.w || 0.018) * (0.3 + hash(s + i * 5.3)), R = 420;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R); ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
    ctx.fill();
  }
}
function streaks(t, o = {}) {
  screen(); ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(o.angle || 0);
  const n = o.n || 40;
  for (let i = 0; i < n; i++) {
    const y = (hash(i * 3.3) - 0.5) * H * 1.5, len = 30 + hash(i * 7.7) * 140, sp = (o.speed || 900) * (0.6 + hash(i) * 0.8);
    const x = ((hash(i * 9.1) * 900 + t * sp) % 900) - 450;
    ctx.globalAlpha = (o.alpha ?? 0.7) * (0.3 + hash(i * 2.2) * 0.7);
    rect((o.dir || 1) > 0 ? x : -x - len, y, len, o.th || 0.7 + hash(i * 4.4) * 1.2, o.color || '#ffffff');
  }
  ctx.globalAlpha = 1; ctx.restore();
}
function flash(c, a = 1) { screen(); ctx.globalAlpha = clamp(a); rect(0, 0, W, H, c); ctx.globalAlpha = 1; }
function invert() { screen(); ctx.globalCompositeOperation = 'difference'; rect(0, 0, W, H, '#fff'); ctx.globalCompositeOperation = 'source-over'; }
function desat(a = 1) { screen(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'saturation'; rect(0, 0, W, H, '#808080'); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
function star(x, y, s, col) { if (s <= 0) return; ctx.fillStyle = col; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.lineTo(x + Math.cos(a + 0.8) * s * 0.12, y + Math.sin(a + 0.8) * s * 0.12); ctx.lineTo(x + Math.cos(a - 0.8) * s * 0.12, y + Math.sin(a - 0.8) * s * 0.12); ctx.fill(); } circle(x, y, s * 0.15, '#fff'); }
function tint(c, a) { screen(); ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = a; rect(0, 0, W, H, c); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
// Classic anime impact frame: harsh inverted monochrome, optionally tinted.
function impactFrame(col) { desat(); invert(); if (col) tint(col, 0.55); }
// Red channel split (chromatic aberration), k in logical px.
function chroma(k) {
  if (Math.abs(k) < 0.2) return;
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.globalCompositeOperation = 'copy'; bctx.drawImage(cv, 0, 0);
  bctx.globalCompositeOperation = 'multiply'; bctx.fillStyle = '#ff0000'; bctx.fillRect(0, 0, buf.width, buf.height);
  bctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#00ffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(buf, k * RES, 0);
  ctx.globalCompositeOperation = 'source-over';
}
// Snapshot of the current frame, for split/shatter effects.
function snapshot() { bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = 'copy'; bctx.drawImage(cv, 0, 0); bctx.globalCompositeOperation = 'source-over'; }
function vignette(a, col = '#000000') {
  screen();
  const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 210);
  g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, a));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function letterbox(h) { if (h <= 0) return; screen(); rect(0, 0, W, h, '#000'); rect(0, H - h, W, h, '#000'); }
function grain(t, a = 0.08) {
  screen(); const s = Math.floor(t * 24);
  for (let i = 0; i < 160; i++) {
    ctx.globalAlpha = a * (0.5 + hash(s + i * 0.37));
    rect(hash(s * 1.1 + i * 3.7) * W, hash(s * 2.3 + i * 5.1) * H, 1, 1, i % 2 ? '#fff' : '#000');
  }
  ctx.globalAlpha = 1;
}

// ---------- text ----------
const FONT = '"Press Start 2P", monospace';
const JFONT = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
function txt(s, x, y, size, fill, o = {}) {
  ctx.font = `${o.weight || ''} ${size}px ${o.font || FONT}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.stroke) { ctx.lineWidth = o.stroke; ctx.strokeStyle = o.strokeCol || '#000'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (o.shadow !== false) { ctx.fillStyle = o.shadowCol || 'rgba(0,0,0,0.85)'; const d = o.sh ?? size * 0.12; ctx.fillText(s, x + d, y + d); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
// Slammed-in callout text with pop, jitter and fade.
function slam(lt, s, t0, t1, x, y, size, fill, o = {}) {
  if (lt < t0 || lt > t1) return;
  screen();
  const k = lt - t0, pop = 1 + (o.pop ?? 1.2) * (1 - easeOutExpo(clamp(k / 0.2)));
  const a = Math.min(clamp(k / 0.05), clamp((t1 - lt) / 0.25));
  const j = o.jitter ? (hash(Math.floor(lt * 24)) - 0.5) * o.jitter : 0;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x + j, y + j * 0.5); ctx.rotate(o.rot || 0); ctx.scale(pop, pop);
  txt(s, 0, 0, size, fill, { stroke: size * (o.sw ?? 0.3), strokeCol: o.strokeCol || '#000', font: o.font, weight: o.weight, sh: o.sh, shadow: o.shadow });
  ctx.restore(); ctx.globalAlpha = 1;
}
function jslam(lt, s, t0, t1, x, y, size, fill, o = {}) {
  slam(lt, s, t0, t1, x, y, size, fill, Object.assign({ font: JFONT, weight: '900', sw: 0.18, sh: 0.6 }, o));
}
// Minecraft-style chat line(s) at bottom-left.
function chat(lines, lt) {
  screen();
  const live = lines.filter(([t0]) => lt >= t0 && lt < t0 + 4);
  live.forEach(([t0, s, col], i) => {
    const a = Math.min(1, (t0 + 4 - lt) / 0.5), y = H - 22 - (live.length - 1 - i) * 9;
    ctx.font = `5px ${FONT}`;
    const w = ctx.measureText(s).width;
    ctx.globalAlpha = a;
    rect(3, y - 4.5, w + 6, 9, 'rgba(0,0,0,0.5)');
    txt(s, 6, y + 0.5, 5, col || '#fff', { align: 'left', sh: 0.6, shadowCol: '#3a3a3a' });
  });
  ctx.globalAlpha = 1;
}
