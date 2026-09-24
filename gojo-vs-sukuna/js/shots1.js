// Storyboard part 1: intro and hand-to-hand (0s - 40s).
'use strict';
const G = 'gojo', S = 'sukuna', SIGN = [-1.15, 1.15];
const SHOTS = [];
const shot = (d, draw, sfx = [], chatLines = []) => SHOTS.push({ d, draw, sfx, chat: chatLines });

// ---------- shared helpers ----------
function P(x, y, f, o) { return pose(x, y, f, Object.assign({ sc: 1.1 }, o)); }
const stance = (x, y, f, t) => P(x, y, f, { armF: -1.2 + Math.sin(t * 4) * 0.06, armB: -0.8, legF: -0.35, legB: 0.35 });
const pockets = (x, y, f, t) => P(x, y, f, { armF: 0.15 + Math.sin(t * 2) * 0.02, armB: 0.12, extF: -1, extB: -1 });
const walk = (x, y, f, t, sp = 7) => { const ph = t * sp; return P(x, y, f, { legF: Math.sin(ph) * 0.55, legB: -Math.sin(ph) * 0.55, armF: 0.12, armB: 0.12, extF: -1, extB: -1 }); };
const dashP = (x, y, f) => P(x, y, f, { armF: 1.3, armB: 1.0, legF: -0.9, legB: 0.9, rot: 0.55 * f });
const flyBack = (x, y, f, spin) => P(x, y, f, { armF: -2.6, armB: -2.9, legF: 0.6, legB: -0.4, rot: spin, head: -0.3 });
const hurtP = (x, y, f) => P(x, y, f, { armF: 0.6, armB: 1.0, legF: 0.4, legB: -0.2, rot: -0.35 * f, head: -0.45 });
function screenCam(sh = [0, 0], z = 1) { setCam(W / 2, H / 2, z, 0, sh); }
function side(p, kind) { applyCam(); drawSide(p, kind); }
function ghosts(kind, fn, lt, n, step, col, a = 0.55) {
  applyCam();
  for (let i = n; i >= 1; i--) { const p = fn(lt - i * step); p.mono = col; p.alpha = a * (1 - i / (n + 1)); drawSide(p, kind); }
}
function teleFx(x, y, dt, col = '#9ff0ff') {
  if (dt < 0 || dt > 0.3) return;
  const k = dt / 0.3; applyCam();
  ctx.globalAlpha = 1 - k;
  for (let i = 0; i < 16; i++) rect(x - 9 + hash(i * 3.1 + Math.floor(dt * 30)) * 18, y - 42 + hash(i * 5.7) * 42, 0.8 + hash(i) * 1.5, 4 + hash(i * 2.2) * 14, i % 3 ? col : '#fff');
  ctx.globalAlpha = 1;
  ring(x, y - 18, 6 + k * 24, 1.5 * (1 - k), rgba('#ffffff', 1 - k));
}
function hitFx(dt, x, y, o = {}) {
  if (dt < 0 || dt > (o.life || 0.6)) return;
  applyCam();
  const s = o.s || 1;
  if (dt < 0.12) {
    ctx.fillStyle = o.spike || '#ffffff';
    const seed = Math.floor(x * 7 + y * 13);
    for (let i = 0; i < 11; i++) {
      const a = hash(seed + i) * TAU, l = (14 + hash(seed + i * 3) * 24) * s * (1 - (dt / 0.12) * 0.5);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a + 0.15) * 3 * s, y + Math.sin(a + 0.15) * 3 * s);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.lineTo(x + Math.cos(a - 0.15) * 3 * s, y + Math.sin(a - 0.15) * 3 * s); ctx.fill();
    }
    circle(x, y, 5 * s * (1 - dt / 0.12), '#fff');
  }
  const k = seg(dt, 0, 0.3);
  ring(x, y, (4 + k * 30) * s, 2.5 * (1 - k) * s, rgba(o.ring || '#ffffff', 1 - k), o.sy || 0.7);
  burst(dt, 0.5, x, y, o.n || 18, Math.floor(x * 3 + y), { sp: (o.sp || 140) * s, colors: o.colors || SPARK, size: 1.6 * s, drag: 3 });
}
function postHit(dt, o = {}) {
  if (dt < 0 || dt > 0.6) return;
  if (dt < 0.035) flash('#ffffff');
  else if (dt < (o.imp ?? 0.11)) impactFrame(o.col);
  if (o.chroma && dt < 0.5) chroma(o.chroma * (1 - dt / 0.5) * (Math.floor(dt * 24) % 2 ? 1 : -1));
}
function bgGrad(c1, c2) { screen(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function floaters(t, col, n = 40, sp = 14) {
  screen();
  for (let i = 0; i < n; i++) {
    const y = H - frac(hash(i * 7.1) + (t * sp * (0.5 + hash(i))) / H) * (H + 10), x = hash(i * 3.3) * W + Math.sin(t + i) * 4;
    ctx.globalAlpha = 0.25 + 0.5 * hash(i * 2.2); rect(x, y, 1 + hash(i) * 1.5, 1 + hash(i) * 1.5, col);
  }
  ctx.globalAlpha = 1;
}
function closeFace(kind, lt, s, o, dy = 22) {
  const fx = W / 2 - 4 * s, fy = H / 2 - 4 * s + dy;
  drawFace(kind, fx, fy, s, o);
  return [fx, fy];
}

// ======================= ACT 1: INTRO =======================
// 1. City establishing shot
shot(4, (lt, T) => {
  const k = easeInOut(lt / 4);
  setCam(lerp(-470, -160, k), -120, 0.68 + 0.06 * k); drawCity(T);
  applyCam();
  for (let i = 0; i < 7; i++) {
    const bx = -440 + i * 18 + lt * 28 + hash(i) * 20, by = -150 - hash(i * 3) * 30 + Math.sin(lt * 3 + i) * 3, fl = Math.floor(lt * 8 + i) % 2;
    rect(bx, by, 1.5, 1, '#111'); rect(bx - 2, by - (fl ? 1 : -0.5), 2, 1, '#111'); rect(bx + 1.5, by - (fl ? 1 : -0.5), 2, 1, '#111');
  }
  streaks(lt, { n: 14, speed: 120, alpha: 0.12, th: 0.5, color: '#ffe0c0' });
  screen();
  const a = seg(lt, 0.6, 1.2) * (1 - seg(lt, 3.4, 3.9)), s = 'SHINJUKU  -  DEC 24', n = Math.floor(seg(lt, 0.6, 1.8) * s.length);
  ctx.globalAlpha = a; txt(s.slice(0, n), 14, 28, 6, '#ffffff', { align: 'left' }); rect(14, 34, 80 * seg(lt, 0.6, 1.8), 0.8, '#ff4060'); ctx.globalAlpha = 1;
  letterbox(16);
  flash('#000', 1 - seg(lt, 0, 0.9));
}, [[0, 'wind', 4, 0.3], [0.3, 'gong']], [[2.2, '[Server] PvP is now enabled', '#ffff55']]);

// 2. Gojo close-up: blindfold off, Six Eyes open
shot(3.5, (lt) => {
  bgGrad('#040816', '#10306a');
  const open = easeOut(seg(lt, 1.6, 1.9)), bu = easeInOut(seg(lt, 0.6, 1.25));
  floaters(lt, '#9fdcff', 50, 10);
  screen(); aura(W / 2, H + 20, 150, lt, '#6fd8ff', 40, 220, open);
  const s = 10 + lt * 0.4, [fx, fy] = closeFace(G, lt, s, { bu, open, glow: 0.4 + open });
  const k = pulse(lt, 1.85, 0.8);
  star(fx + 2.3 * s, fy + 4.1 * s, 22 * k, '#e8ffff'); star(fx + 5.9 * s, fy + 4.1 * s, 16 * k, '#e8ffff');
  if (between(lt, 1.85, 1.9)) flash('#dff8ff', 0.8);
  vignette(0.6); letterbox(16);
}, [[0.6, 'whoosh', 0.5, 0.3], [1.85, 'ting'], [1.9, 'hum', 1.5, 110, 0.3]], [[2.2, 'Gojo Satoru joined the game', '#ffff55']]);

// 3. Sukuna close-up: four eyes open, grin
shot(3.5, (lt) => {
  bgGrad('#120206', '#5a0a14');
  floaters(lt, '#ff6070', 40, -8);
  const open = easeOut(seg(lt, 0.9, 1.1)), open2 = easeOut(seg(lt, 1.3, 1.45)), grin = 0.2 + 0.8 * easeOutBack(seg(lt, 2.0, 2.3));
  const sh = shakeOf(lt, [[2.0, 0.5, 3]]);
  screen(); ctx.translate(sh[0], sh[1]);
  aura(W / 2, H + 20, 150, lt, '#ff3048', 40, 220, open);
  const s = 10 + lt * 0.35;
  closeFace(S, lt, s, { open, open2, grin, glow: 0.6 + open });
  vignette(0.7); letterbox(16);
}, [[0.2, 'heart'], [0.95, 'heart'], [0.9, 'whooshDown', 0.3, 0.3], [1.3, 'thud'], [2.0, 'boom', 1.2, 0.5], [2.05, 'laugh']], [[2.2, 'Ryomen Sukuna joined the game', '#ffff55']]);

// 4. Title: diagonal split VS
shot(4, (lt) => {
  screen(); rect(0, 0, W, H, '#000');
  const kin = easeOutExpo(seg(lt, 0, 0.35)), off = (1 - kin) * 220;
  const sh = shakeOf(lt, [[0.7, 0.7, 6], [3.8, 0.2, 3]]);
  const half = (left) => {
    screen(); ctx.save(); ctx.translate(sh[0], sh[1]); ctx.beginPath();
    if (left) { ctx.moveTo(-10, -10); ctx.lineTo(W * 0.56 - off, -10); ctx.lineTo(W * 0.44 - off, H + 10); ctx.lineTo(-10, H + 10); }
    else { ctx.moveTo(W * 0.56 + off, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, H + 10); ctx.lineTo(W * 0.44 + off, H + 10); }
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, W, H);
    if (left) { g.addColorStop(0, '#061030'); g.addColorStop(0.5, '#1a5adf'); } else { g.addColorStop(0.5, '#8a0a1c'); g.addColorStop(1, '#1a0206'); }
    ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
    const cx = left ? 78 - off : 242 + off;
    focusLines(cx, 96, lt, { n: 40, inner: 50, color: left ? 'rgba(160,230,255,0.35)' : 'rgba(255,160,170,0.35)' });
    screen(); ctx.translate(sh[0], sh[1]);
    drawFace(left ? G : S, cx - 36, 70, 9, { open: 1, open2: 1, grin: 1, glow: 1 });
    ctx.restore();
  };
  half(true); half(false);
  screen(); ctx.save(); ctx.translate(sh[0], sh[1]);
  if (kin > 0.95) {
    ctx.globalAlpha = 0.5; bolt(W * 0.56, -5, W * 0.44, H + 5, Math.floor(lt * 20), 14, 10, 6, '#ffffff'); ctx.globalAlpha = 1;
    bolt(W * 0.56, -5, W * 0.44, H + 5, Math.floor(lt * 20), 14, 10, 1.8, '#ffffff');
  }
  ctx.restore();
  slam(lt, 'GOJO', 0.35, 4, 72, 160, 14, '#bff4ff', { strokeCol: '#06103a' });
  slam(lt, 'SUKUNA', 0.45, 4, 248, 160, 14, '#ffc0c8', { strokeCol: '#3a0610' });
  jslam(lt, '五条悟', 0.5, 4, 56, 26, 13, '#ffffff');
  jslam(lt, '両面宿儺', 0.6, 4, 262, 26, 13, '#ffffff');
  slam(lt, 'VS', 0.7, 4, W / 2, 96, 34, '#ffffff', { jitter: 2, pop: 2.5, sw: 0.35 });
  slam(lt, 'SHINJUKU SHOWDOWN', 1.4, 4, W / 2, 132, 7, '#ffd84a');
  postHit(lt - 0.7, { chroma: 3, imp: 0.08 });
  if (lt > 3.8) flash('#fff', seg(lt, 3.8, 4));
}, [[0, 'whoosh', 0.4, 0.5], [0.08, 'whoosh', 0.4, 0.5], [0.7, 'bigHit'], [1.4, 'gong'], [3.0, 'riser', 1.0, 0.5]]);

// ======================= ACT 2: HAND TO HAND =======================
// 5. Standoff on the street
shot(2, (lt, T) => {
  const sh = shakeOf(lt, [[1.7, 0.3, 3]]);
  setCam(0, -30, lerp(1.5, 1.85, easeInOut(lt / 2)), 0, sh); drawCity(T);
  applyCam();
  const cr = easeOut(seg(lt, 1.1, 1.4)), gone = lt >= 1.72;
  aura(70, 0, 40, lt, PAL.gojo.aura, 22, 14, cr); aura(-70, 0, 40, lt, PAL.sukuna.aura, 22, 14, cr);
  if (!gone) {
    drawSide(P(70, 0, -1, { armF: 0.15 - cr * 1.3, armB: 0.12 + cr * 0.9, extF: -1 + cr, legF: -0.5 * cr, legB: 0.5 * cr, rot: -0.3 * cr }), G);
    drawSide(P(-70, 0, 1, { armF: -cr * 1.3, armB: cr * 0.9, legF: -0.5 * cr, legB: 0.5 * cr, rot: 0.3 * cr }), S);
  } else {
    const k = seg(lt, 1.72, 1.9);
    ctx.globalAlpha = 1 - k; rect(70 - 40 * k, -30, 40 * k + 2, 24, rgba('#8ff4ff', 0.6)); rect(-72, -30, 40 * k + 2, 24, rgba('#ff4060', 0.6)); ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 14; i++) rect(-150 + frac(hash(i) + lt * 0.5) * 300, -8 - hash(i * 3) * 50 + Math.sin(lt * 5 + i) * 3, 1.5, 1, '#e8e0d0');
  dust(lt - 1.72, 1.0, 70, 0, 12, 11, 9, 60); dust(lt - 1.72, 1.0, -70, 0, 12, 12, 9, 60);
  debris(lt - 1.72, 1.0, 70, 0, 8, 13, 60, 60, 3); debris(lt - 1.72, 1.0, -70, 0, 8, 14, 60, 60, 3);
  vignette(0.5); letterbox(16);
}, [[0, 'wind', 2, 0.25], [1.1, 'hum', 0.7, 80, 0.3], [1.72, 'whoosh', 0.3, 0.6], [1.74, 'thud']]);

// 6. Dash toward each other
shot(0.8, (lt) => {
  setCam(0, -20, 2.4, 0, shakeOf(lt, [[0, 0.8, 1.5]]));
  screen();
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#4a0614'); g.addColorStop(0.5, '#08060e'); g.addColorStop(1, '#061a5a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  streaks(lt, { n: 50, speed: 1600, alpha: 0.5 }); streaks(lt + 3, { n: 30, speed: 1600, alpha: 0.4, dir: -1 });
  const gf = t => dashP(lerp(100, 16, easeIn(seg(t, 0, 0.8))), 0, -1), sf = t => dashP(lerp(-100, -16, easeIn(seg(t, 0, 0.8))), 0, 1);
  ghosts(G, gf, lt, 6, 0.025, '#6fd8ff', 0.7); ghosts(S, sf, lt, 6, 0.025, '#ff3048', 0.7);
  side(gf(lt), G); side(sf(lt), S);
  focusLines(W / 2, H / 2, lt, { n: 50, inner: 90, color: 'rgba(255,255,255,0.45)' });
}, [[0, 'whoosh', 0.8, 0.7]]);

// 7. Fists collide
shot(1.2, (lt, T) => {
  const sh = shakeOf(lt, [[0, 0.9, 7]]);
  setCam(0, -24, lerp(3.0, 2.5, easeOut(seg(lt, 0, 1.2))), 0.04, sh); drawCity(T);
  applyCam();
  const k = seg(lt, 0.03, 0.9);
  ring(0, -25, k * 170, 4 * (1 - k), rgba('#ffffff', 1 - k), 0.5);
  ring(0, 0, k * 240, 3 * (1 - k), rgba('#d0c0ff', 1 - k), 0.12);
  dust(lt, 1.2, -24, 0, 14, 21, 12, 140); dust(lt, 1.2, 24, 0, 14, 22, 12, 140);
  debris(lt, 1.2, 0, 0, 22, 23, 170, 130, 4);
  aura(13, 0, 36, lt, PAL.gojo.aura, 16, 12, 0.9); aura(-13, 0, 36, lt, PAL.sukuna.aura, 16, 12, 0.9);
  drawSide(P(13, 0, -1, { armF: -Math.PI / 2, extF: 2, armB: 0.9, legF: -0.6, legB: 0.6, rot: -0.2 }), G);
  drawSide(P(-13, 0, 1, { armF: -Math.PI / 2, extF: 2, armB: 0.9, legF: -0.6, legB: 0.6, rot: 0.2 }), S);
  burst(lt, 0.7, 0, -25, 44, 31, { sp: 240, colors: SPARK, size: 2, drag: 2 });
  if (lt < 0.7) { sparkBolts(0, -25, lt, 3, 34, ['#bff4ff'], 1.4); sparkBolts(0, -25, lt + 5, 3, 34, ['#ff4060'], 1.4); }
  if (lt < 0.7) focusLines(W / 2, H / 2 - 4, lt, { n: 60, inner: 55, color: 'rgba(255,255,255,0.7)' });
  postHit(lt, { chroma: 4 });
}, [[0, 'bigHit'], [0.05, 'glass', 0.4]]);

// 8. Rapid exchange, then Infinity stops Sukuna's fist
const BEATS = ['Sp', 'Gp', 'Sk', 'Gk', 'Sp', 'GH', 'Sk', 'Gn', 'Sp', 'Gp'];
function exch(lt) {
  const lq = Math.max(0, q12(lt)), c = Math.sin(Math.min(lq, 2.5) * 1.3) * 18;
  const g = stance(c + 13, 0, -1, lq), s = stance(c - 13, 0, 1, lq);
  if (lq < 2.5) {
    const i = Math.floor(lq / 0.25), u = (lq - i * 0.25) / 0.25, b = BEATS[i], atkG = b[0] === 'G', m = b[1];
    const A = atkG ? g : s, D = atkG ? s : g, f = A.f;
    if (u < 0.3) { if (m === 'k' || m === 'n') { A.rot = -0.2 * f; A.legF = 0.3; } else { A.armF = 0.9; A.rot = -0.12 * f; } }
    else if (u < 0.75) {
      A.x += 5 * f;
      if (m === 'k') { A.legF = -1.6; A.rot = -0.35 * f; A.armF = -1.0; A.armB = 0.8; }
      else if (m === 'n') { A.legF = -1.1; A.rot = 0.1 * f; A.armF = -1.6; }
      else { A.armF = -Math.PI / 2; A.extF = 4; A.rot = 0.15 * f; }
    }
    if (u >= 0.3 && u < 0.85) {
      if (m === 'H') { D.rot = -0.35 * D.f; D.head = -0.45; D.armF = 0.5; D.armB = 0.9; D.x -= 4 * D.f; }
      else { D.armF = -2.3; D.armB = -2.0; D.rot = -0.08 * D.f; D.x -= 2 * D.f; }
    }
    return { g, s, c };
  }
  const gp = pockets(c + 13, 0, -1, lq), u = lq - 2.5;
  if (u < 0.3) { s.armF = 1.1; s.rot = -0.2; s.armB = -0.4; }
  else { s.armF = -Math.PI / 2; s.extF = 2; s.x += 6 + (hash(Math.floor(lt * 30)) - 0.5) * 0.6; s.rot = 0.2; s.armB = 0.9; s.legF = -0.6; s.legB = 0.6; }
  return { g: gp, s, c };
}
const EXCH_HITS = BEATS.map((b, i) => [i * 0.25 + 0.075, b[1] === 'k' ? -18 : b[1] === 'n' ? -14 : -26, b[1] === 'H']);
shot(4, (lt, T) => {
  const { g, s, c } = exch(lt);
  const hitsSh = EXCH_HITS.map(([t0, , big]) => [t0, 0.18, big ? 4 : 2]).concat([[2.8, 0.3, 2]]);
  const sh = shakeOf(lt, hitsSh);
  let z = 2.4, y = -24, r = Math.sin(lt * 2) * 0.05, x = c;
  if (between(lt, 1.5, 2.25)) { z = 3.1; y = -16; r = -0.1; }
  if (lt >= 2.8) { const k = easeOutExpo(seg(lt, 2.8, 3.1)); z = lerp(2.4, 4.6, k); x = lerp(c, c + 6.5, k); y = -25; r = lerp(0, 0.05, k); }
  setCam(x, y, z, r, sh); drawCity(T);
  if (lt < 2.5) streaks(lt, { n: 26, speed: 700, alpha: 0.18, dir: Math.floor(lt * 4) % 2 ? 1 : -1 });
  applyCam();
  aura(g.x, 0, 36, lt, PAL.gojo.aura, 12, 10, 0.5); aura(s.x, 0, 36, lt, PAL.sukuna.aura, 12, 10, 0.5);
  if (lt < 2.5) { ghosts(S, t => exch(t).s, lt, 2, 0.04, '#ff3048', 0.4); ghosts(G, t => exch(t).g, lt, 2, 0.04, '#6fd8ff', 0.4); }
  side(s, S); side(g, G);
  for (const [t0, hy, big] of EXCH_HITS) hitFx(lt - t0, exch(t0 + 0.01).c, hy, { s: big ? 1.4 : 0.8 });
  if (lt >= 2.8) { // Infinity
    applyCam();
    const px = c + 6.5, st = (lt - 2.8) * 0.8;
    for (let i = 0; i < 4; i++) { const k = frac(st + i / 4); ring(px, -25, 2 + k * 16, 0.8 * (1 - k), rgba('#8ff4ff', 1 - k)); }
    glow(px, -25, 14, '#8ff4ff', 0.5);
    tint('#3fa0ff', 0.3 * seg(lt, 2.8, 3.0));
    jslam(lt, '∞', 3.0, 4, 60, 70, 40, '#bff8ff', { strokeCol: '#06205a' });
    slam(lt, 'INFINITY', 3.1, 4, 60, 108, 9, '#ffffff', { strokeCol: '#06205a' });
    jslam(lt, '無下限呪術', 3.25, 4, 264, 40, 11, '#ffffff');
  }
  for (const [t0, , big] of EXCH_HITS) if (big) postHit(lt - t0, { imp: 0.07, chroma: 2 });
  else if (between(lt, t0, t0 + 0.03)) flash('#ffffff', 0.5);
}, EXCH_HITS.map(([t0, , big]) => [t0, 'hit', big ? 1 : 0.6]).concat(BEATS.map((b, i) => [i * 0.25, 'whoosh', 0.1, 0.25]),
  [[2.5, 'whoosh', 0.3, 0.5], [2.8, 'stop'], [2.95, 'hum', 1.0, 220, 0.25], [3.05, 'ting', 0.2]]));

// 9. Counter kick sends Sukuna into a building
const sukKick = t => {
  const k = seg(t, 0.3, 1.0);
  return flyBack(lerp(-14, -352, k), lerp(0, -44, k) - Math.sin(k * Math.PI) * 18, 1, -k * 7);
};
shot(2, (lt, T) => {
  const sh = shakeOf(lt, [[0.3, 0.3, 5], [1.0, 0.8, 5]]);
  const k = easeInOut(seg(lt, 0.33, 1.05));
  setCam(lerp(-7, -335, k), lerp(-24, -58, k), lerp(2.8, 1.7, k), lerp(0.05, -0.04, k), sh); drawCity(T);
  if (between(lt, 0.33, 1.05)) streaks(lt, { n: 40, speed: 1400, alpha: 0.35, dir: 1 });
  applyCam();
  const lq = q12(lt);
  const g = lq < 0.3 ? P(6, 0, -1, { rot: 0.3, legF: 0.5, armF: -1.2, armB: 0.6 })
    : lq < 0.65 ? P(6, 0, -1, { rot: 0.45, legF: -1.75, legB: 0.3, armF: -2.0, armB: 1.0 })
    : stance(6, 0, -1, lt);
  aura(6, 0, 36, lt, PAL.gojo.aura, 14, 10, 0.6);
  side(g, G);
  if (lt < 1.0) {
    if (lt > 0.3) ghosts(S, sukKick, lt, 5, 0.03, '#ff3048', 0.5);
    side(lt < 0.3 ? stance(-14, 0, 1, lt) : sukKick(lt), S);
  }
  hitFx(lt - 0.3, -8, -20, { s: 1.5 });
  debris(lt - 1.0, 1.8, -352, -60, 44, 77, 160, 70, 6);
  burst(lt - 1.0, 1.0, -352, -60, 30, 78, { sp: 150, colors: ['#bfe0ff', '#ffffff', '#8ab0d0'], size: 1.5, g: 200 });
  dust(lt - 1.0, 2.0, -352, -60, 18, 79, 16, 70); dust(lt - 1.05, 2.0, -352, 0, 14, 80, 16, 90);
  postHit(lt - 0.3, { chroma: 3, col: '#ff2040' });
  postHit(lt - 1.0, { imp: 0.06 });
}, [[0.05, 'whoosh', 0.25, 0.5], [0.3, 'bigHit'], [0.35, 'whoosh', 0.6, 0.6], [1.0, 'boom', 1.5, 0.8], [1.0, 'glass', 0.6], [1.1, 'crumble', 1.0]]);

// 10. Gojo teleports above and slams Sukuna into the street
function sukSlam(t) {
  if (t < 0.7) { const k = easeOut(seg(t, 0.05, 0.7)); return flyBack(lerp(-352, -300, k), lerp(-44, -95, k), 1, -k * TAU * 1.2); }
  if (t < 0.95) return flyBack(-300, -95 + (t - 0.7) * 10, 1, 0.3);
  if (t < 1.15) { const k = easeIn(seg(t, 0.95, 1.15)); return P(-300, lerp(-95, 14, k), 1, { rot: lerp(0.3, -Math.PI / 2, k), armF: -2.8, armB: -2.9, head: -0.4 }); }
  return P(-300, 14, 1, { rot: -Math.PI / 2, armF: -2.8, armB: -3.0, legF: 0.2, head: -0.3 });
}
function gojoSlam(t) {
  if (t < 0.85) return P(-300, -140, 1, { legF: -2.6, legB: 0.2, armF: -2.6, armB: -2.4, rot: -0.1 });
  if (t < 1.2) return P(-300, -140 + seg(t, 0.95, 1.2) * 20, 1, { legF: -0.2, legB: 0.4, armF: -0.5, armB: 1.2, rot: 0.35 });
  const k = easeInOut(seg(t, 1.2, 2.5));
  return pockets(-270, lerp(-120, -62, k), -1, t);
}
shot(2.5, (lt, T) => {
  const sh = shakeOf(lt, [[0.95, 0.25, 5], [1.15, 1.0, 8]]);
  if (lt < 0.7) setCam(-330, -70, 1.9, 0, sh);
  else if (lt < 1.15) setCam(-300, -105, 2.3, 0.05, sh);
  else setCam(-290, -52, lerp(1.5, 1.75, seg(lt, 1.15, 2.5)), -0.03, sh);
  drawCity(T);
  if (between(lt, 0.95, 1.25)) streaks(lt, { n: 40, speed: 1500, alpha: 0.5, angle: Math.PI / 2 });
  applyCam();
  debris(lt - 0.05, 1.2, -340, -50, 18, 90, 90, 40, 5);
  if (lt > 0.1 && lt < 1.15) ghosts(S, sukSlam, lt, 4, 0.03, '#ff3048', 0.45);
  side(sukSlam(lt), S);
  if (lt >= 0.7) { teleFx(-300, -140, lt - 0.7); if (lt > 0.72) { aura(-300, -140, 36, lt, PAL.gojo.aura, 14, 10, 0.6); side(gojoSlam(lt), G); } }
  hitFx(lt - 0.95, -300, -122, { s: 1.4 });
  const d = lt - 1.15;
  ring(-300, 0, seg(d, 0, 0.5) * 200, 3 * (1 - seg(d, 0, 0.5)), rgba('#ffffff', 1 - seg(d, 0, 0.5)), 0.12);
  debris(d, 2.0, -300, 0, 50, 91, 150, 190, 6);
  dust(d, 2.4, -300, 0, 26, 92, 18, 140);
  postHit(lt - 0.95, { chroma: 3 }); postHit(d, { imp: 0.09, chroma: 4 });
}, [[0.05, 'crumble', 0.8], [0.1, 'whoosh', 0.4, 0.4], [0.7, 'zip'], [0.85, 'whooshDown', 0.15, 0.6], [0.95, 'bigHit'], [1.15, 'boom', 2, 1], [1.2, 'crumble', 1.2]]);

// 11. Sukuna rises from the crater, laughing: Dismantle
shot(1.5, (lt, T) => {
  const sh = shakeOf(lt, [[0.3, 0.6, 0.8], [0.95, 0.2, 2]]);
  setCam(-300, -30, 3.6, 0, sh); drawCity(T);
  applyCam();
  const rise = easeOut(seg(lt, 0, 0.35)), jit = between(lt, 0.3, 0.9) ? Math.abs(Math.sin(lt * 40)) * 0.8 : 0;
  aura(-300, 0, 44, lt, PAL.sukuna.aura, 30, 18, 1);
  const raise = easeOutBack(seg(lt, 0.8, 0.95));
  drawFront({ x: -300, y: lerp(30, 0, rise) - jit, sc: 1.1, armL: 0.25, armR: lerp(-0.3, -2.84, raise), legF: 0.1, legB: 0.1 }, S, { open: 1, open2: 1, grin: 1, glow: 1 });
  dust(lt + 0.4, 2.5, -300, 2, 20, 95, 16, 50);
  if (lt > 0.95) { applyCam(); slash(-340, -60, -260, -10, seg(lt, 0.95, 1.3), { w: 3, glow: '#ff2040' }); }
  jslam(lt, '解', 0.95, 1.5, 250, 66, 50, '#ff2238', { sw: 0.12 });
  slam(lt, 'DISMANTLE', 1.0, 1.5, W / 2, 150, 13, '#ffffff', { strokeCol: '#8a0010' });
  vignette(0.6);
}, [[0.25, 'laugh'], [0.95, 'slash', 0.7]]);

// 12. Dismantle barrage: Infinity blocks, a skyscraper gets sliced
const DIS = [];
for (let j = 0; j < 22; j++) DIS.push({ t0: 0.2 + j * 0.14, y: -8 - hash(j * 3.1) * 110, sz: 1.8 });
DIS.push({ t0: 1.37, y: -150, sz: 3.2 });
const DIS_GX = 70, DIS_SX = -240;
function disState(d, lt) {
  const x = DIS_SX + 15 + (lt - d.t0) * 1260, blocked = d.sz < 3 && d.y > -46, stopX = DIS_GX - 13;
  return { x: blocked ? Math.min(x, stopX) : x, blocked, stopT: d.t0 + (stopX - DIS_SX - 15) / 1260 };
}
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[1.6, 0.6, 2], [2.7, 1.0, 3]]);
  setCam(lerp(-60, -10, easeInOut(lt / 4)), -85, 0.75, 0, sh); drawCity(T);
  applyCam();
  const fl = Math.floor(lt * 7) % 2;
  aura(DIS_SX, 0, 40, lt, PAL.sukuna.aura, 18, 12, 0.8);
  drawSide(P(DIS_SX, 0, 1, { armF: fl ? -2.4 : -0.4, armB: fl ? -0.4 : -2.1, legF: -0.3, legB: 0.3 }), S);
  const gw = walk(lerp(DIS_GX + 10, DIS_GX, lt / 4), 0, -1, lt, 5);
  drawSide(gw, G);
  for (const d of DIS) {
    const dt = lt - d.t0; if (dt < 0 || dt > 0.6) continue;
    const st = disState(d, lt);
    if (st.blocked && lt >= st.stopT) {
      const k = seg(lt, st.stopT, st.stopT + 0.35);
      if (k < 1) { ring(st.x + 3, d.y, 3 + k * 12, 1.4 * (1 - k), rgba('#8ff4ff', 1 - k)); burst(lt - st.stopT, 0.35, st.x + 3, d.y, 8, d.t0 * 50, { sp: 90, colors: ['#bff8ff', '#ffffff'], size: 1.2 }); }
      continue;
    }
    ctx.globalAlpha = 1 - seg(dt, 0.4, 0.6);
    slash(st.x - 4 * d.sz, d.y - 14 * d.sz, st.x + 4 * d.sz, d.y + 14 * d.sz, 0.45, { w: 1.8 * d.sz, bend: 0.35, glow: '#ff2040' });
    ctx.globalAlpha = 1;
  }
  dust(lt - 1.6, 2.4, 150, -150, 16, 101, 14, 40);
  debris(lt - 1.6, 1.6, 150, -150, 16, 102, 80, 30, 5);
  dust(lt - 2.7, 1.3, 230, 0, 24, 103, 20, 120); debris(lt - 2.7, 1.3, 230, 0, 30, 104, 140, 140, 7);
  if (between(lt, 1.6, 1.64)) flash('#ffffff', 0.6);
}, DIS.map(d => [d.t0, 'slash', d.sz > 2 ? 0.9 : 0.35]).concat(DIS.filter(d => disState(d, 99).blocked).map(d => [disState(d, 99).stopT, 'ping']),
  [[1.6, 'boom', 1.2, 0.5], [1.65, 'crumble', 1.0], [2.7, 'boom', 1.5, 0.9], [2.7, 'crumble', 1.3]]), [[2.2, '<Gojo> missed.', '#ffffff']]);

// 13. BLACK FLASH
const BF_SX = -240, BF_GX = -216, BF_P = [-231, -25];
const bfSukX = t => (t < 2.3 ? BF_SX : BF_SX - (t - 2.3) * 308);
function bfGojo(t) {
  if (t < 0.3) return stance(BF_GX, 0, -1, t);
  if (t < 1.3) { const k = easeOut(seg(t, 0.3, 1.25)); return P(BF_GX + k * 2, 0, -1, { armF: lerp(-1.2, 1.4, k), armB: lerp(-0.8, -1.4, k), rot: 0.15 * k, legF: -0.5, legB: 0.5 }); }
  if (t < 2.4) return P(BF_GX - 4, 0, -1, { armF: -Math.PI / 2, extF: 4, armB: 1.1, rot: -0.28, legF: -0.7, legB: 0.7 });
  return stance(BF_GX - 4, 0, -1, t);
}
function bfSuk(t) {
  if (t < 1.3) return P(BF_SX, 0, 1, { armF: -0.9, armB: -0.5, legF: -0.3, legB: 0.3, head: -0.1 });
  if (t < 2.3) return P(BF_SX - 1, 0, 1, { armF: 0.8, armB: 1.2, rot: -0.3, head: -0.6, legF: 0.3, legB: -0.3 });
  return flyBack(bfSukX(t), -6, 1, -(t - 2.3) * 9);
}
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[1.3, 1.0, 5], [2.3, 0.4, 6], [2.85, 0.3, 4], [3.11, 0.3, 4], [3.46, 0.3, 4]]);
  if (lt < 1.3) setCam(-229, -25, lerp(3.0, 3.9, easeInOut(seg(lt, 0.3, 1.3))), lerp(0, 0.08, seg(lt, 0.3, 1.3)), sh);
  else if (lt < 2.3) setCam(-229, -25, 3.4 + (lt - 1.3) * 0.2, -0.06, sh);
  else { const k = easeInOut(seg(lt, 2.3, 2.6)); setCam(lerp(-229, bfSukX(lt) + 20, k), lerp(-25, -20, k), lerp(3.4, 2.2, k), 0, sh); }
  const silhouette = between(lt, 1.33, 1.46);
  drawCity(T);
  if (lt > 2.4) streaks(lt, { n: 40, speed: 1300, alpha: 0.4, dir: 1 });
  applyCam();
  if (between(lt, 0.3, 1.3)) aura(BF_GX, 0, 40, lt, '#3a8aff', 26, 14, 1);
  teleFx(BF_GX, 0, lt);
  if (lt > 2.3 && lt < 3.9) ghosts(S, bfSuk, lt, 5, 0.03, '#ff3048', 0.5);
  side(bfSuk(lt), S);
  if (lt > 0.05) side(bfGojo(lt), G);
  if (between(lt, 0.4, 1.3)) sparkBolts(BF_GX - 10, -24, lt, 2, 14, ['#000000', '#3a8aff'], 1);
  for (const [t0, x] of [[2.85, -410], [3.11, -490], [2.54, -314], [2.46, -290]]) {
    debris(lt - t0, 1.2, x, -22, 26, x, 140, 60, 5); dust(lt - t0, 1.4, x, -22, 12, x + 1, 12, 50);
  }
  if (between(lt, 1.3, 2.3)) {
    applyCam();
    const k = seg(lt, 1.3, 1.9);
    ring(BF_P[0], BF_P[1], k * 60, 4 * (1 - k), rgba('#ff1a3c', 1 - k), 0.8);
    ctx.globalAlpha = 0.9; sparkBolts(BF_P[0], BF_P[1], lt, 6, 42, ['#ff1a3c', '#000000'], 2.4); ctx.globalAlpha = 1;
    burst(lt - 1.3, 1.0, BF_P[0], BF_P[1], 40, 707, { sp: 160, colors: ['#ff1a3c', '#000000', '#ff7080'], size: 2.5, drag: 2 });
  }
  if (between(lt, 0.3, 1.3)) {
    const k = seg(lt, 0.3, 1.3);
    desat(0.6 * k); vignette(0.8 * k);
    focusLines(W / 2, H / 2, lt, { n: 70, inner: 70 - k * 25, color: `rgba(0,0,0,${0.35 + 0.4 * k})` });
  }
  if (silhouette) {
    screen(); rect(0, 0, W, H, '#000');
    applyCam();
    const g = bfGojo(lt), s = bfSuk(lt); g.mono = '#ffffff'; s.mono = '#ff1a3c'; drawSide(s, S); drawSide(g, G);
    sparkBolts(BF_P[0], BF_P[1], lt, 8, 60, ['#ff1a3c'], 2);
  }
  if (between(lt, 1.3, 1.33)) flash('#ffffff');
  if (between(lt, 1.46, 1.75) && Math.floor(lt * 24) % 3 === 0) impactFrame('#ff0020');
  if (between(lt, 1.3, 2.3)) chroma(4 * (1 - seg(lt, 1.3, 2.3)) * (Math.floor(lt * 24) % 2 ? 1 : -1));
  slam(lt, 'BLACK FLASH', 1.36, 2.4, W / 2, 34, 22, '#ff1a3c', { jitter: 3, pop: 1.8 });
  jslam(lt, '黒閃', 1.5, 2.4, 262, 130, 34, '#ffffff', { sw: 0.2 });
  postHit(lt - 2.3, { imp: 0.06 });
}, [[0, 'zip'], [0.35, 'heart'], [0.8, 'heart'], [0.5, 'riser', 0.8, 0.4], [1.3, 'blackflash'], [2.3, 'boom', 1, 0.8], [2.3, 'whoosh', 0.6, 0.7],
  [2.46, 'crumble', 0.5], [2.85, 'boom', 0.8, 0.6], [3.11, 'boom', 0.8, 0.6], [3.12, 'crumble', 0.8]]);

// 14. Cleave: Gojo blinks around a grid of slashes, lands on a rooftop
const CLV = [[0.25, -560, 0], [0.8, -592, -45], [1.35, -548, 0], [1.9, -604, -30], [2.45, -525, -210]];
const CLV_SX = -640;
function clvGojo(t) {
  let i = 0; while (i < CLV.length - 1 && t >= CLV[i + 1][0]) i++;
  const [, x, y] = CLV[i];
  return y < 0 && y > -100 ? P(x, y, -1, { legF: -0.8, legB: 0.6, armF: -1.8, armB: 0.8, rot: -0.1 }) : stance(x, y, -1, t);
}
shot(3, (lt, T) => {
  const sh = shakeOf(lt, CLV.map(([t0]) => [t0 + 0.12, 0.2, 2]));
  const up = easeInOut(seg(lt, 2.3, 3.0));
  setCam(lerp(-592, -560, up), lerp(-55, -160, up), lerp(1.6, 1.3, up), 0, sh); drawCity(T);
  applyCam();
  aura(CLV_SX, 0, 40, lt, PAL.sukuna.aura, 16, 12, 0.7);
  const sw = Math.floor(lt / 0.275) % 2;
  drawSide(P(CLV_SX, 0, 1, { armF: sw ? -2.3 : -0.5, armB: sw ? -0.6 : -2.0, legF: -0.35, legB: 0.35 }), S);
  CLV.forEach(([t0, x, y], i) => {
    if (lt >= t0) teleFx(x, y, lt - t0);
    if (i === 0) return;
    const [pt, px, py] = CLV[i - 1], d = lt - (t0 + 0.02);
    if (d < 0 || d > 0.6) return;
    applyCam();
    for (let j = 0; j < 3; j++) {
      const a = hash(i * 9 + j) * Math.PI;
      slash(px + Math.cos(a) * 22, py - 16 + Math.sin(a) * 22, px - Math.cos(a) * 22, py - 16 - Math.sin(a) * 22, seg(d, j * 0.04, j * 0.04 + 0.5), { w: 2.2, bend: 0.1 });
    }
    if (py === 0) { debris(d, 1, px, 0, 12, i * 13, 80, 70, 4); dust(d, 1.2, px, 0, 8, i * 17, 10, 40); }
  });
  side(clvGojo(lt), G);
  jslam(lt, '捌', 0.15, 1.3, 60, 60, 40, '#ff2238', { sw: 0.12 });
  slam(lt, 'CLEAVE', 0.2, 1.3, 60, 100, 11, '#ffffff', { strokeCol: '#8a0010' });
}, CLV.flatMap(([t0], i) => [[t0, 'zip']].concat(i ? [[t0 + 0.02, 'slash', 0.5], [t0 + 0.06, 'slash', 0.4], [t0 + 0.1, 'slash', 0.4]] : [])).concat([[0.2, 'crumble', 0.6]]));
