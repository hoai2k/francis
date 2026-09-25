// Storyboard: Dabura Karaba vs Divine General Mahoraga (JJK Modulo), with an alternate ending.
'use strict';
const SHOTS = [];
const shot = (d, draw, sfx = [], chatLines = []) => { const s = { d, draw, sfx, chat: chatLines }; SHOTS.push(s); return s; };

// ---------- helpers ----------
function screenCam(sh = [0, 0], z = 1, cx = W / 2, cy = H / 2, r = 0) { setCam(cx, cy, z, r, sh); }
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
function caption(lt, s, t0, t1, y = 26, col = '#ffffff') { slam(lt, s, t0, t1, W / 2, y, 6, col, { pop: 0.3, sw: 0.5 }); }
function ghostD(fn, lt, n, step, col, a = 0.5) { applyCam(); for (let i = n; i >= 1; i--) { const p = fn(lt - i * step); p.mono = col; p.alpha = a * (1 - i / (n + 1)); drawDabura(p); } }
function ghostM(fn, lt, n, step, col, a = 0.5) { applyCam(); for (let i = n; i >= 1; i--) { const p = fn(lt - i * step); p.mono = col; p.alpha = a * (1 - i / (n + 1)); drawMahoraga(p); } }
function beam(x1, y1, x2, y2, w, a = 1, col = '#fff0b0') {
  ctx.globalAlpha = a; ctx.lineCap = 'round';
  for (const [lw, c] of [[w * 3, rgba(col, 0.35)], [w, col], [w * 0.4, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function darkOrb(x, y, r, t) { // light bends into it
  glow(x, y, r * 3, '#ffe9a0', 0.5);
  for (let i = 0; i < 18; i++) { const ph = frac(t * 1.6 + hash(i)), a = hash(i * 3) * TAU + ph * 2, d = r * (1 + (1 - ph) * 3); ctx.strokeStyle = rgba('#fff0b0', ph * 0.8); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.lineTo(x + Math.cos(a + 0.2) * (d - r * 0.6), y + Math.sin(a + 0.2) * (d - r * 0.6)); ctx.stroke(); }
  circle(x, y, r * 1.08, '#ffffff'); circle(x, y, r, '#000000');
}
// The wheel: one click = 1/8 turn. The final click (90.5) only makes it halfway.
const CLICKS = [22.0, 27.0, 50.0, 64.5, 75.0, 77.5, 80.0];
function wheelAt(T) {
  let r = 0; for (const c of CLICKS) r += (Math.PI / 4) * easeOutBack(seg(T, c, c + 0.3));
  r += (Math.PI / 8) * easeOut(seg(T, 90.5, 91.3));
  return r;
}
const wheelGlowAt = T => Math.max(0, ...CLICKS.map(c => pulse(T, c - 0.1, 0.9))) + pulse(T, 90.4, 1.2);
const dSt = (x, y, f, t, o) => dpose(x, y, f, Object.assign({ armF: -1.0 + Math.sin(t * 3) * 0.05, armB: -0.6, legF: -0.4, legB: 0.4 }, o));
const mSt = (x, y, f, t, T, o) => dpose(x, y, f, Object.assign({ sc: 2.0, armF: -0.7 + Math.sin(t * 2) * 0.04, armB: 0.3, legF: -0.3, legB: 0.3, wheel: wheelAt(T), wheelGlow: wheelGlowAt(T) }, o));

// ======================= SETUP =======================
// 1. Tokyo, 2086: a Simurian ship hangs over the city
shot(4, (lt, T) => {
  const k = easeInOut(lt / 4);
  setCam(lerp(-360, -40, k), -110, 0.72 + 0.06 * k); drawCity(T);
  simurianShip(T);
  screen();
  const s = 'TOKYO, 2086', n = Math.floor(seg(lt, 0.6, 1.5) * s.length), a = seg(lt, 0.6, 1.0) * (1 - seg(lt, 3.5, 3.95));
  ctx.globalAlpha = a; txt(s.slice(0, n), 14, 28, 6, '#ffffff', { align: 'left' }); rect(14, 34, 70 * seg(lt, 0.6, 1.5), 0.8, '#4aff8a');
  txt('JUJUTSU KAISEN MODULO', 14, 42, 4, '#9ab0d0', { align: 'left' }); ctx.globalAlpha = 1;
  letterbox(16); flash('#000', 1 - seg(lt, 0, 0.9));
}, [[0, 'wind', 4, 0.25], [0.3, 'gong']], [[2.2, '[Duel] Yuka Okkotsu vs Dabura Karaba: all or nothing', '#ffff55']]);

// 2. Dabura Karaba: the third eye opens
shot(3, (lt) => {
  bgGrad('#040a06', '#1a3a22');
  screen(); aura(W / 2, H + 20, 150, lt, '#ffe9a0', 40, 220, seg(lt, 1.2, 1.6));
  const s = 8.5 + lt * 0.3, open3 = easeOut(seg(lt, 1.2, 1.45));
  daburaFace(W / 2 - 4 * s, H / 2 - 4 * s + 10, s, { open: 1, open3, glow: 0.4 + open3 });
  if (between(lt, 1.2, 1.26)) flash('#eaffea', 0.7);
  jslam(lt, 'ダブラ・カラバ', 1.4, 3, 56, 30, 11, '#ffffff');
  slam(lt, 'DABURA KARABA', 1.5, 3, 258, 158, 9, '#ffe9a0', { strokeCol: '#3a2a06' });
  vignette(0.6); letterbox(16);
}, [[0.2, 'heart'], [1.2, 'ting', 0.25], [1.25, 'hum', 1.5, 90, 0.3]]);

// 3. Yuka Okkotsu: Ten Shadows, then she sinks into her own shadow
shot(3, (lt) => {
  bgGrad('#08060e', '#2a2238');
  const s = 8.5, sink = easeIn(seg(lt, 1.8, 2.9));
  screen(); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H - 12 - sink * 0); ctx.clip();
  yukaFace(W / 2 - 4 * s, H / 2 - 4 * s + 10 + sink * 120, s, { open: 1 });
  ctx.restore();
  screen();
  const g = ctx.createLinearGradient(0, H - 60, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(0, H - 60, W, 60);
  for (let i = 0; i < 20; i++) { const ph = frac(lt * 0.8 + hash(i)); ctx.globalAlpha = 1 - ph; rect(hash(i * 3) * W, H - ph * 70, 2, 5, '#000'); }
  ctx.globalAlpha = 1;
  jslam(lt, '十種影法術', 0.6, 2.4, W / 2, 30, 16, '#ffffff', { strokeCol: '#1a1024' });
  slam(lt, 'TEN SHADOWS TECHNIQUE', 0.8, 2.4, W / 2, 158, 8, '#cfc0ff', { strokeCol: '#1a1024' });
  vignette(0.6); letterbox(16);
}, [[0.6, 'hit', 0.5], [1.8, 'whooshDown', 1.0, 0.4]]);

// 4. Mahoraga rises out of the shadow
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[1.2, 2.8, 2.5]]);
  setCam(40, -60, lerp(1.2, 1.35, lt / 4), 0, sh); drawCity(T);
  applyCam();
  shadowPool(60, 0, 20 + easeOut(seg(lt, 0, 1)) * 30, lt);
  drawDabura(dSt(-60, 0, 1, lt));
  const rise = easeOut(seg(lt, 1.0, 3.0));
  ctx.save(); ctx.beginPath(); ctx.rect(-400, -400, 800, 400); ctx.clip();
  drawMahoraga(mSt(60, lerp(80, 0, rise), -1, lt, T, { wheelGlow: 0.5 + pulse(lt, 2.8, 1) }));
  ctx.restore();
  jslam(lt, '八握剣異戒神将魔虚羅', 0.4, 4, W / 2, 26, 12, '#ffffff');
  slam(lt, 'DIVINE GENERAL MAHORAGA', 2.8, 4, W / 2, 160, 10, '#dcd0ff', { strokeCol: '#1a1024', jitter: 1 });
  vignette(0.5);
}, [[0.2, 'hum', 3.5, 55, 0.4], [1.0, 'crumble', 2.0], [2.8, 'roar'], [2.9, 'clack']]);

// 5. Title: VS
shot(3, (lt) => {
  screen(); rect(0, 0, W, H, '#000');
  const kin = easeOutExpo(seg(lt, 0, 0.35)), off = (1 - kin) * 220, sh = shakeOf(lt, [[0.6, 0.6, 5]]);
  [[true, '#061a0e', '#2a8a4a'], [false, '#1a1024', '#8a80c0']].forEach(([left, c1, c2]) => {
    screen(); ctx.save(); ctx.translate(sh[0], sh[1]); ctx.beginPath();
    if (left) { ctx.moveTo(-10, -10); ctx.lineTo(W * 0.56 - off, -10); ctx.lineTo(W * 0.44 - off, H + 10); ctx.lineTo(-10, H + 10); }
    else { ctx.moveTo(W * 0.56 + off, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, H + 10); ctx.lineTo(W * 0.44 + off, H + 10); }
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(left ? 0 : 1, c1); g.addColorStop(0.5, c2); ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
    const cx = left ? 78 - off : 242 + off;
    focusLines(cx, 96, lt, { n: 40, inner: 50, color: 'rgba(255,255,255,0.3)' });
    screen(); ctx.translate(sh[0], sh[1]);
    if (left) daburaFace(cx - 30, 70, 7.5, { glow: 1 }); else mahoragaFace(cx - 30, 86, 7.5, { wheel: lt * 0.3, wheelGlow: 0.4 });
    ctx.restore();
  });
  screen(); if (kin > 0.95) bolt(W * 0.56, -5, W * 0.44, H + 5, Math.floor(lt * 20), 14, 10, 1.8, '#ffffff');
  slam(lt, 'DABURA', 0.35, 3, 72, 164, 13, '#ffe9a0', { strokeCol: '#06200e' });
  slam(lt, 'MAHORAGA', 0.45, 3, 248, 164, 13, '#e8e0ff', { strokeCol: '#1a1024' });
  slam(lt, 'VS', 0.6, 3, W / 2, 96, 34, '#ffffff', { jitter: 2, pop: 2.5, sw: 0.35 });
  postHit(lt - 0.6, { chroma: 3, imp: 0.08 });
  if (lt > 2.8) flash('#fff', seg(lt, 2.8, 3));
}, [[0, 'whoosh', 0.4, 0.5], [0.6, 'bigHit'], [0.7, 'clack']]);

// ======================= LIGHT =======================
// 6. One-shot attempt: mass x murderous intent
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[0.3, 1.3, 1.5], [1.6, 1.0, 9]]);
  setCam(0, -40, lt < 1.6 ? lerp(1.5, 1.9, easeIn(seg(lt, 0.2, 1.6))) : 1.4, 0, sh); drawCity(T);
  const pr = seg(lt, 0.2, 1.5) * (1 - seg(lt, 1.6, 2.4));
  if (pr > 0) { desat(0.6 * pr); tint('#8a0010', 0.35 * pr); }
  applyCam();
  if (pr > 0) { const g = dSt(-40, 0, 1, lt, { sc: 4.2, mono: '#3a0008', alpha: 0.35 * pr, armF: 1.2 }); drawDabura(g); }
  const hit = lt >= 1.6, kb = easeOut(seg(lt, 1.6, 2.4));
  aura(-40, 0, 50, lt, '#ff3030', 30, 16, pr);
  drawDabura(hit ? dpose(-18, 0, 1, { armF: -Math.PI / 2, extF: 5, armB: 1.0, rot: 0.3, legF: -0.8, legB: 0.8 }) : dSt(-40, 0, 1, lt, { armF: lerp(-1.0, 1.3, easeOut(seg(lt, 0.3, 1.4))), rot: -0.15 * seg(lt, 0.3, 1.4) }));
  const mp = mSt(lerp(30, 70, kb), 0, -1, lt, T, hit ? { rot: 0.4 * (1 - seg(lt, 2.4, 3.6)), head: 0.5, armF: 0.6, armB: 1.0 } : {});
  drawMahoraga(mp);
  if (hit && lt < 3) { ctx.globalAlpha = 0.8 * (1 - seg(lt, 1.6, 3)); circle(mp.x - 4, -40, 14, '#1a0006'); ctx.globalAlpha = 1; }
  const d = lt - 1.6;
  ring(0, 0, seg(d, 0, 0.6) * 220, 4 * (1 - seg(d, 0, 0.6)), rgba('#ffffff', 1 - seg(d, 0, 0.6)), 0.12);
  debris(d, 2, 10, 0, 60, 3, 220, 180, 7); dust(d, 2.4, 10, 0, 26, 4, 18, 180);
  hitFx(d, 20, -44, { s: 3, ring: '#ff5050' });
  postHit(d, { chroma: 6, col: '#ff2020', imp: 0.14 });
  slam(lt, 'MASS × MURDEROUS INTENT', 0.3, 1.6, W / 2, 26, 11, '#ff5050', { jitter: 1.5 });
}, [[0.3, 'pressure', 1.3], [1.6, 'bigHit'], [1.6, 'boom', 2.5, 1], [1.7, 'crumble', 1.6]]);

// 7. CLACK: the wheel turns, Mahoraga adapts
shot(3, (lt, T) => {
  bgGrad('#0a0a12', '#2a2a3a');
  focusLines(W / 2, 70, lt, { n: 50, inner: 70, color: 'rgba(255,240,180,0.3)' });
  const s = 9 + lt * 0.4;
  screen(); for (let i = 0; i < 20; i++) { const ph = frac(lt + hash(i)); ctx.globalAlpha = 1 - ph; rect(W / 2 + (hash(i * 3) - 0.5) * 90, H - ph * 120, 1.5, 1.5, '#ffffff'); } ctx.globalAlpha = 1;
  mahoragaFace(W / 2 - 4 * s, 88, s, { wheel: wheelAt(T), wheelGlow: wheelGlowAt(T) });
  if (between(T, 22.0, 22.06)) flash('#fff6d0', 0.8);
  slam(lt, 'ADAPTED', 1.2, 3, W / 2, 162, 16, '#ffe9a0', { strokeCol: '#1a1024' });
  vignette(0.6);
}, [[1.0, 'clack'], [1.3, 'hum', 1.5, 110, 0.2]]);

// 8. Light beams: they pierce... until the wheel turns again
const BEAMS = [0.4, 1.0, 1.6, 3.3, 3.8, 4.3];
shot(5, (lt, T) => {
  const sh = shakeOf(lt, BEAMS.map(b => [b, 0.2, 3]));
  setCam(0, -46, 1.3, 0, sh); drawCity(T);
  applyCam();
  const walk = seg(lt, 1.8, 3.2), mx = lerp(70, 30, walk);
  const armUp = BEAMS.some(b => between(lt, b - 0.1, b + 0.25));
  aura(-60, 0, 44, lt, '#ffe9a0', 20, 14, 0.7);
  drawDabura(dSt(-60, 0, 1, lt, armUp ? { armF: -Math.PI / 2 - 0.1, extF: 2, handGlow: '#fff0b0' } : {}));
  const adapted = T >= 27.0;
  const mp = mSt(mx, 0, -1, lt, T, { legF: Math.sin(walk * 12) * 0.4, legB: -Math.sin(walk * 12) * 0.4 });
  if (adapted && BEAMS.some(b => between(lt, b - 0.05, b + 0.25))) Object.assign(mp, { armF: -2.2, bladeRot: 0.4 });
  drawMahoraga(mp);
  for (const b of BEAMS) {
    const d = lt - b; if (d < 0 || d > 0.35) continue;
    const a = 1 - seg(d, 0.15, 0.35), tx = mx - 6, ty = -60 + hash(b) * 30;
    if (b < 3) { beam(-44, -38, tx, ty, 3, a); hitFx(d, tx, ty, { s: 1.2, colors: ['#ffffff', '#fff0b0'] }); }
    else { beam(-44, -38, mx - 16, -64, 3, a); beam(mx - 16, -64, mx - 16 + 120, -64 - 90 + hash(b) * 60, 2, a); hitFx(d, mx - 16, -64, { s: 1, ring: '#ffe9a0' }); }
  }
  if (lt < 1.8) { applyCam(); for (let i = 0; i < 3; i++) circle(mx - 4 + i * 3, -54 + i * 8, 2, rgba('#1a0006', 0.6)); }
  slam(lt, 'LIGHT', 0.4, 2.0, 60, 40, 16, '#fff0b0', { strokeCol: '#3a2a06' });
  if (lt > 3.3) slam(lt, 'DEFLECTED', 3.4, 5, 250, 40, 11, '#dcd0ff', { strokeCol: '#1a1024' });
}, BEAMS.map(b => [b, 'beam', 0.6]).concat([[3.0, 'clack'], [3.3, 'thud']]));

// 9. Mahoraga swings; Dabura stops the Sword of Extermination with one hand
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[1.3, 1.0, 8]]);
  setCam(-20, -44, lt < 1.3 ? 1.6 : lerp(2.4, 2.2, seg(lt, 1.3, 4)), lt < 1.3 ? 0 : -0.05, sh); drawCity(T);
  applyCam();
  const dash = easeIn(seg(lt, 0.3, 1.2));
  const mp = mSt(lerp(40, -2, dash), 0, -1, lt, T, lt < 1.2 ? { armF: lerp(-0.7, -2.9, easeOut(seg(lt, 0, 0.6))), rot: -0.2 * dash, legF: -0.8, legB: 0.8 } : { armF: -2.0, bladeRot: 0.5, rot: -0.25 });
  if (between(lt, 0.3, 1.3)) ghostM(t => mSt(lerp(40, -2, easeIn(seg(t, 0.3, 1.2))), 0, -1, t, T, { armF: -2.9 }), lt, 3, 0.05, '#dcd0ff', 0.4);
  const tremble = lt > 1.3 ? (hash(Math.floor(lt * 30)) - 0.5) * 0.08 : 0;
  drawDabura(dSt(-50, 0, 1, lt, lt >= 1.3 ? { armF: -2.4 + tremble, armB: 0.6, legF: -0.8, legB: 0.8, rot: -0.12, grin: 1 } : {}));
  drawMahoraga(mp);
  if (lt > 1.3) { applyCam(); sparkBolts(-40, -78, lt, 3, 20, ['#ffffff', '#fff0b0'], 1); }
  const d = lt - 1.3;
  ring(-50, 0, seg(d, 0, 0.5) * 150, 3 * (1 - seg(d, 0, 0.5)), rgba('#ffffff', 1 - seg(d, 0, 0.5)), 0.12);
  dust(d, 1.8, -50, 0, 20, 17, 14, 120);
  for (let i = 0; i < 6; i++) { const a = (hash(i) - 0.5) * 2.4 + (i % 2 ? Math.PI : 0); if (d > 0) bolt(-50, 1, -50 + Math.cos(a) * 60 * seg(d, 0, 0.3), 1 + Math.abs(Math.sin(a)) * 4, i, 5, 3, 0.8, '#15121a'); }
  hitFx(d, -40, -78, { s: 2.4 });
  postHit(d, { chroma: 5, imp: 0.12 });
}, [[0.3, 'whoosh', 0.9, 0.6], [1.3, 'bigHit'], [1.35, 'crumble', 1.2]]);

// 10. Flashback: he had never had to fight. Until now.
shot(4, (lt, T) => {
  if (lt < 2.5) {
    bgGrad('#2a2418', '#5a4a30');
    screenCam([0, 0], 1.6, W / 2, 110); applyCam();
    drawDabura(dSt(W / 2, 150, 1, lt, { armF: 0.1, armB: 0.1 }));
    for (let i = 0; i < 6; i++) {
      const x = W / 2 + 20 + i * 16, k = easeIn(seg(lt, 0.2 + i * 0.25, 0.6 + i * 0.25));
      drawDabura(dpose(x, 150, -1, { mono: '#1a140c', rot: k * 1.4, armF: -1.0, armB: -0.6, alpha: 0.9, sc: 1.1 }));
    }
    desat(0.8); tint('#c8a060', 0.4); grain(lt, 0.2);
    caption(lt, 'HE HAD NEVER HAD TO FIGHT', 0.4, 2.5, 30, '#fff0d0');
    vignette(0.8);
    return;
  }
  bgGrad('#040a06', '#1a3a22');
  const s = 11 + (lt - 2.5) * 0.8;
  daburaFace(W / 2 - 4 * s, H / 2 - 4 * s + 16, s, { open: 1, open3: 1, glow: 1.4, grin: 1 });
  slam(lt, 'UNTIL NOW', 2.7, 4, W / 2, 26, 13, '#ffe9a0', { strokeCol: '#1a1406', jitter: 1 });
  vignette(0.6);
  if (between(lt, 2.5, 2.55)) flash('#ffffff');
}, [[2.5, 'hit', 0.8], [2.6, 'ting', 0.25]], [[3.2, '<Dabura> for my people... I\'ll fight for real.', '#ffffff']]);

// 11. Sub-light speed: his body can't take it, and he goes anyway
shot(4, (lt, T) => {
  setCam(-60, -30, lerp(2.2, 3.0, easeIn(seg(lt, 0, 4))), 0.04, shakeOf(lt, [[0.5, 3.5, 1.5]])); drawCity(T);
  applyCam();
  const g = seg(lt, 0.3, 2.5);
  aura(-60, 0, 50, lt, '#ffffff', 50, 20, g); aura(-60, 0, 50, lt + 2, '#ffe9a0', 30, 20, g);
  drawDabura(dSt(-60, 0, 1, lt, { legF: -0.9, legB: 0.9, rot: 0.25 * g, armF: 1.2 * g, armB: 1.0 * g, brokenLeg: lt > 2.0, glow: 1 + g }));
  if (lt > 2.0) { applyCam(); sparkBolts(-56, -8, lt, 3, 12, ['#fff0b0'], 0.8); }
  focusLines(W / 2, H / 2, lt, { n: 60, inner: 80 - g * 30, color: `rgba(255,240,180,${0.2 + g * 0.4})` });
  slam(lt, 'SUB-LIGHT SPEED', 1.0, 4, W / 2, 30, 13, '#ffffff', { strokeCol: '#3a2a06', jitter: 1 });
  caption(lt, 'HIS BODY CANNOT TAKE IT', 2.2, 4, 160, '#ff9a9a');
}, [[0.3, 'charge', 3.5, 100, 2000, 0.2], [2.0, 'crackle', 1.5, 0.4]]);

// 12. He passes Mahoraga: its left arm is simply gone
shot(3, (lt, T) => {
  const sh = shakeOf(lt, [[0.25, 0.4, 6]]);
  setCam(20, -44, 1.5, 0, sh); drawCity(T);
  applyCam();
  const passed = lt >= 0.12;
  if (!passed) drawDabura(dSt(-80, 0, 1, lt, { rot: 0.4, legF: -1.0, legB: 1.0 }));
  else drawDabura(dpose(150, 0, 1, { rot: 0.3, armF: 1.3, armB: 1.0, legF: -0.9, legB: 0.9, brokenLeg: true, glow: 1.5 }));
  const lost = lt > 0.6;
  drawMahoraga(mSt(40, 0, -1, lt, T, { noArmB: lost, rot: lost ? 0.15 : 0 }));
  if (between(lt, 0.0, 0.5)) { const a = 1 - seg(lt, 0.1, 0.5); beam(-80, -24, 150, -24, 6, a, '#ffffff'); }
  if (lt > 0.6) burst(lt - 0.6, 1.4, 36, -60, 40, 12, { sp: 120, colors: ['#e8e4dc', '#bcb6ac', '#ffffff'], size: 4, g: 150 });
  if (between(lt, 0.12, 0.5) && Math.floor(lt * 24) % 2) invert();
  postHit(lt - 0.6, { chroma: 4, imp: 0.08 });
}, [[0, 'sonic'], [0.6, 'bigHit']]);

// 13. The shockwave levels whole city blocks
shot(4, (lt, T) => {
  const d = lt - 0.2;
  setCam(0, -60, 0.55, 0, shakeOf(lt, [[0.2, 3.5, 7]])); drawCity(Math.min(T, 44.3));
  applyCam();
  if (d > 0) {
    const R = lerp(20, 900, easeOut(seg(d, 0, 2.6)));
    const g = ctx.createRadialGradient(40, 0, 0, 40, 0, R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#fff4c8'); g.addColorStop(0.9, '#ffd070'); g.addColorStop(1, 'rgba(255,200,100,0.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(40, 0, R, 0, TAU); ctx.fill();
    debris(d, 3, 40, -20, 80, 900, 420, 200, 9);
  }
  flash('#ffffff', 1 - seg(lt, 0, 0.4));
  flash('#b89878', seg(lt, 2.8, 3.9));
}, [[0.2, 'boom', 3.5, 1.2], [0.2, 'bigHit'], [0.5, 'crumble', 3]]);

// 14. Only a scrap of Mahoraga is left beneath its wheel... CLACK
shot(4, (lt, T) => {
  setCam(20, -30, 2.0, 0, shakeOf(lt, [[2.0, 0.4, 3]])); drawCity(T);
  applyCam();
  drawDabura(dpose(-40, 6, 1, { rot: 0.15, armF: 0.6, armB: 1.0, legF: -1.4, legB: 0.2, brokenLeg: true, head: 0.2 }));
  const re = easeInOut(seg(lt, 2.2, 3.8));
  if (re <= 0) {
    rect(30, -8, 12, 8, DPAL.mahoraga.skin); rect(32, -12, 8, 4, DPAL.mahoraga.skinD);
    drawWheel(36, -24, 12, wheelAt(T), { glow: wheelGlowAt(T) });
  } else {
    ctx.save(); ctx.beginPath(); ctx.rect(-400, -90 * re - 10, 800, 400); ctx.clip();
    drawMahoraga(mSt(40, 0, -1, lt, T, { noArmB: re < 0.8 }));
    ctx.restore();
    drawWheel(40, lerp(-24, -82, re), 14, wheelAt(T), { glow: wheelGlowAt(T) });
  }
  if (lt > 2.0) { applyCam(); for (let i = 0; i < 14; i++) { const ph = frac(lt * 1.2 + hash(i)); ctx.globalAlpha = 1 - ph; rect(40 + (hash(i * 3) - 0.5) * 30, -ph * 80, 1.4, 1.4, '#ffffff'); } ctx.globalAlpha = 1; }
  for (let i = 0; i < 20; i++) { const ph = frac(lt * 0.15 + hash(i)); ctx.globalAlpha = 1 - ph; rect(-200 + hash(i * 3) * 400, -ph * 120, 1, 1, i % 2 ? '#ff9a50' : '#ffd080'); }
  ctx.globalAlpha = 1;
  slam(lt, 'IT REGENERATES', 2.4, 4, W / 2, 30, 11, '#dcd0ff', { strokeCol: '#1a1024' });
  vignette(0.6);
}, [[0, 'wind', 4, 0.3], [2.0, 'clack'], [2.3, 'crumble', 1.2]]);

// ======================= DARKNESS =======================
// 15. (-) x (-) = (+): Dabura works out reverse cursed technique mid-fight
shot(5, (lt, T) => {
  if (lt < 3.0) {
    bgGrad('#020604', '#0a2a14');
    focusLines(W / 2, H / 2, lt, { n: 50, inner: 60, color: 'rgba(170,255,200,0.25)' });
    const s = 9;
    daburaFace(W / 2 - 4 * s - 60, H / 2 - 4 * s + 16, s, { open: 1, open3: 1, glow: 1.2 });
    const k = seg(lt, 0.4, 1.6);
    screen(); ctx.globalAlpha = k;
    txt('(-) × (-)', 230, 70, 12, '#ff6060', { stroke: 3 });
    ctx.globalAlpha = seg(lt, 1.3, 1.8); txt('= (+)', 230, 100, 16, '#8affb0', { stroke: 3 });
    ctx.globalAlpha = 1;
    if (lt > 1.8) { screen(); glow(W / 2 - 60, H / 2 + 30, 90 * seg(lt, 1.8, 2.8), '#aaffcc', 0.6); }
    caption(lt, 'MULTIPLY CURSED ENERGY BY ITSELF', 0.3, 3, 160, '#aaffcc');
    vignette(0.6);
    return;
  }
  setCam(-40, -26, 2.6); drawCity(T);
  applyCam();
  const heal = seg(lt, 3.2, 4.4);
  drawDabura(dSt(-40, lerp(6, 0, heal), 1, lt, { brokenLeg: heal < 0.9, rot: lerp(0.15, 0, heal), legF: lerp(-1.4, -0.4, heal), glow: 1 }));
  applyCam(); for (let i = 0; i < 20; i++) { const ph = frac(lt * 1.4 + hash(i)); ctx.globalAlpha = (1 - ph) * (1 - seg(lt, 4.4, 5)); rect(-40 + (hash(i * 3) - 0.5) * 16, -ph * 44, 1.2, 1.2, i % 2 ? '#aaffcc' : '#ffffff'); }
  ctx.globalAlpha = 1;
  slam(lt, 'REVERSE CURSED TECHNIQUE', 3.1, 5, W / 2, 28, 10, '#aaffcc', { strokeCol: '#062010' });
}, [[0.4, 'glitch', 0.3], [1.3, 'ting', 0.3], [1.8, 'hum', 1.2, 220, 0.2], [3.2, 'charge', 1.2, 300, 900, 0.1]]);

// 16. Reversal: light turned inside out becomes Darkness
shot(4, (lt, T) => {
  setCam(-40, -40, lerp(2.2, 2.8, easeInOut(lt / 4)), 0.03, shakeOf(lt, [[1.2, 2.8, 1.5]])); drawCity(T);
  tint('#000000', 0.25 * seg(lt, 0.8, 2));
  applyCam();
  drawDabura(dSt(-40, 0, 1, lt, { armF: -2.4, extF: 1, grin: 1, glow: 1.2 }));
  const r = 3 + 6 * easeOut(seg(lt, 0.8, 2.4));
  if (lt > 0.8) darkOrb(-31, -40 - r, r, lt);
  jslam(lt, '反転', 1.2, 4, 60, 46, 22, '#ffffff', { strokeCol: '#000000' });
  slam(lt, 'REVERSAL: DARKNESS', 1.4, 4, W / 2, 160, 12, '#ffffff', { strokeCol: '#000000', jitter: 1 });
  vignette(0.7);
}, [[0.8, 'dark', 2.5], [1.2, 'hit', 0.6]]);

// 17. Rapid exchange in the ruins; the wheel turns again (speed)
const EX = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 4.0, 4.4, 4.8, 5.2];
function exch2(lt, T) {
  const lq = Math.max(0, q12(lt)), c = Math.sin(lq * 1.5) * 25;
  const d = dSt(c - 16, 0, 1, lq), m = mSt(c + 20, 0, -1, lq, T);
  const i = EX.findIndex(t0 => between(lq, t0 - 0.1, t0 + 0.12));
  if (i >= 0) {
    if (i % 2 === 0) { Object.assign(d, { armF: -Math.PI / 2, extF: 4, rot: 0.2, handGlow: i % 4 === 0 ? '#fff0b0' : null }); if (lt < 3.5) Object.assign(m, { rot: 0.2, head: 0.4 }); else Object.assign(m, { armF: -1.7, bladeRot: -0.6 }); }
    else { Object.assign(m, { armF: -1.4, bladeRot: -0.3, rot: -0.2 }); Object.assign(d, { rot: -0.2, x: d.x - 3 }); }
  }
  return { d, m, c };
}
shot(6, (lt, T) => {
  const { c } = exch2(lt, T), sh = shakeOf(lt, EX.map(t0 => [t0, 0.15, 3]));
  let z = 1.9, r = Math.sin(lt * 2) * 0.05, y = -40;
  if (between(lt, 1.5, 2.4)) { z = 2.5; y = -30; r = 0.1; }
  if (between(lt, 3.3, 4.0)) { z = 2.8; y = -70; r = 0; }
  setCam(c, y, z, r, sh); drawCity(T);
  streaks(lt, { n: 30, speed: 900, alpha: 0.18, dir: Math.floor(lt * 2) % 2 ? 1 : -1, color: '#fff0d0' });
  applyCam();
  ghostD(t => exch2(t, T).d, lt, 3, 0.03, '#fff0b0', 0.45); ghostM(t => exch2(t, T).m, lt, 2, 0.04, '#dcd0ff', 0.35);
  const { d, m } = exch2(lt, T);
  drawMahoraga(m); drawDabura(d);
  EX.forEach((t0, i) => hitFx(lt - t0, exch2(t0 + 0.01, T).c + 2, -40 - (i % 3) * 8, { s: 1.4, ring: i >= 10 ? '#dcd0ff' : '#fff0b0' }));
  EX.forEach(t0 => { if (between(lt, t0, t0 + 0.03)) flash('#ffffff', 0.4); });
  if (lt > 3.6) slam(lt, 'IT KEEPS UP', 3.7, 6, W / 2, 26, 10, '#dcd0ff', { strokeCol: '#1a1024' });
}, EX.map(t0 => [t0, 'hit', 0.7]).concat([[3.5, 'clack']]));

// 18. Domain Expansion
shot(4, (lt, T) => {
  bgGrad('#1a1406', '#6a5a1a');
  focusLines(W / 2, H / 2, lt, { n: 60, inner: 60, color: 'rgba(255,240,180,0.35)' });
  screenCam(shakeOf(lt, [[1.0, 0.5, 3]]), 1, W / 2, H / 2); applyCam();
  aura(W / 2, 200, 130, lt, '#ffe9a0', 50, 100, 1);
  drawDabura(dpose(W / 2, 205, 1, { sc: 3.4, armF: -1.3, armB: -1.3, extF: -1, extB: -1, glow: 1.5 }));
  jslam(lt, '領域展開', 0.8, 4, W / 2, 34, 28, '#ffffff', { jitter: 1.5 });
  slam(lt, 'DOMAIN EXPANSION', 1.1, 4, W / 2, 66, 11, '#ffe9a0');
  vignette(0.5);
  if (lt > 3.7) flash('#fff', seg(lt, 3.7, 4));
}, [[0, 'hum', 4, 110, 0.3], [0.8, 'hit', 0.7], [1.0, 'riser', 3, 0.5]]);

// ======================= DOMAIN =======================
// 19. A sea of light under a black sun: sure-hit pillars, and the wheel keeps turning
const PILLARS = [0.4, 0.9, 1.4, 2.0, 2.5, 3.1, 3.6, 4.4, 5.0, 5.6, 6.2, 6.8, 7.4];
shot(8, (lt, T) => {
  drawLightDomain(lt);
  const sh = shakeOf(lt, PILLARS.map(p => [p, 0.2, 2.5]));
  const z = lt < 4 ? 1.0 : lerp(1.0, 1.3, seg(lt, 4, 8));
  screenCam(sh, z, W / 2, 110); applyCam();
  for (const p of PILLARS) { const d = lt - p; if (d < 0 || d > 0.35) continue; ctx.globalAlpha = 1 - d / 0.35; rect(205, -20, 22, 152, '#ffffff'); rect(199, -20, 34, 152, rgba('#fff0b0', 0.5)); ctx.globalAlpha = 1; }
  const hitNow = PILLARS.some(p => between(lt, p, p + 0.2));
  drawMahoraga(mSt(216, 130, -1, lt, T, { sc: 1.8, rot: hitNow ? 0.12 : 0, head: hitNow ? 0.3 : 0, armF: hitNow ? -2.2 : -0.7 }));
  drawDabura(dSt(90, 130 + Math.sin(lt * 2) * 1.5, 1, lt, { sc: 1.6, armF: -1.9, glow: 1.5 }));
  PILLARS.forEach(p => hitFx(lt - p, 216, 90, { s: 1.4, colors: ['#ffffff', '#fff0b0'] }));
  caption(lt, 'SURE-HIT: LIGHT', 0.3, 3, 170, '#3a2a06');
  if (lt > 3.8) slam(lt, 'CLACK', 4.0, 5.2, 262, 40, 12, '#3a2a06', { strokeCol: '#fff0b0' });
  if (lt > 6.3) slam(lt, 'CLACK', 6.5, 7.7, 262, 40, 12, '#3a2a06', { strokeCol: '#fff0b0' });
}, PILLARS.map(p => [p, 'beam', 0.4]).concat([[4.0, 'clack'], [6.5, 'clack'], [0, 'hum', 8, 55, 0.3]]));

// 20. The wheel, one click from full adaptation... and no one teleports him away this time
shot(4, (lt, T) => {
  drawLightDomain(lt + 8);
  screen(); rect(0, 0, W, H, 'rgba(10,8,4,0.4)');
  drawWheel(W / 2, H / 2 + 6, 70, wheelAt(T), { glow: wheelGlowAt(T) * 0.8 });
  const rift = seg(lt, 1.8, 2.2) * (1 - seg(lt, 2.8, 3.1));
  if (rift > 0) {
    screen(); const s = Math.floor(lt * 24);
    for (let i = 0; i < 18; i++) rect(40 + (hash(s + i) - 0.5) * 30 * rift, 60 + i * 3, (hash(s + i * 3)) * 40 * rift, 2, i % 3 ? '#4aff8a' : '#ffffff');
    ring(46, 86, 16 * rift, 1.5, rgba('#4aff8a', rift));
  }
  if (lt > 2.8) { screen(); burst(lt - 2.8, 0.6, 46, 86, 20, 3, { sp: 60, colors: ['#4aff8a', '#ffffff'], size: 1.5 }); }
  caption(lt, 'ONE MORE TURN AND IT FULLY ADAPTS', 0.2, 1.8, 24, '#ffffff');
  caption(lt, 'NO INTERRUPTIONS THIS TIME.', 2.9, 4, 162, '#8affb0');
  vignette(0.6);
}, [[1.0, 'clack'], [1.8, 'glitch', 1.0], [2.8, 'zip']]);

// ======================= THE ENDING THE MANGA DIDN'T GIVE =======================
// 21. Dabura gathers all of it into Darkness; Mahoraga charges
shot(6, (lt, T) => {
  drawLightDomain(lt + 12, { dim: 0.2 + 0.6 * seg(lt, 0, 3) });
  screenCam(shakeOf(lt, [[0, 6, 2]]), lerp(1.0, 1.4, seg(lt, 3, 6)), W / 2, 112); applyCam();
  const r = 4 + 16 * easeInOut(seg(lt, 0.5, 4));
  drawDabura(dSt(90, 130, 1, lt, { sc: 1.6, armF: -2.6, extF: 1, glow: 2, grin: 1 }));
  darkOrb(99, 78 - r, r, lt);
  const ch = easeIn(seg(lt, 3.8, 6));
  drawMahoraga(mSt(lerp(230, 150, ch), 130, -1, lt, T, { sc: 1.8, armF: lerp(-0.7, -2.9, seg(lt, 3.5, 4.2)), rot: -0.25 * ch, legF: -0.8 * ch, legB: 0.8 * ch }));
  if (lt > 3.8) ghostM(t => mSt(lerp(230, 150, easeIn(seg(t, 3.8, 6))), 130, -1, t, T, { sc: 1.8, armF: -2.9 }), lt, 3, 0.05, '#dcd0ff', 0.4);
  slam(lt, 'DARKNESS', 1.0, 3.6, W / 2, 26, 16, '#000000', { strokeCol: '#fff0b0', jitter: 1 });
  caption(lt, 'EVERY BIT OF LIGHT IN THE DOMAIN, FOLDED INTO ONE POINT', 1.3, 3.6, 170, '#ffffff');
}, [[0.5, 'dark', 3.5], [2.0, 'riser', 4, 0.5], [3.8, 'roar'], [4.0, 'whoosh', 2, 0.6]]);

// 22. Sword vs Darkness: the wheel's last click stops halfway
shot(6, (lt, T) => {
  const slow = lt < 3 ? lt * 0.4 : 1.2 + (lt - 3);
  drawLightDomain(12, { dim: 0.85 });
  const sh = shakeOf(lt, [[0, 3, 3], [3.0, 2, 8]]);
  const z = lt < 1.5 ? 2.2 : lt < 3 ? 3.2 : 1.6;
  screenCam(sh, z, lt < 1.5 ? 130 : lt < 3 ? 158 : W / 2, lt < 3 ? 80 : 100, lt < 1.5 ? 0.06 : lt < 3 ? -0.08 : 0); applyCam();
  const eng = seg(lt, 3.0, 5.0);
  drawDabura(dpose(100, 130, 1, { sc: 1.6, armF: -Math.PI / 2 - 0.3, extF: 3, rot: 0.2, legF: -0.8, legB: 0.8, glow: 2 }));
  const mp = mSt(150, 130, -1, slow, T, { sc: 1.8, armF: -1.9, bladeRot: 0.3, rot: -0.2, wheelBroken: T > 91.4 });
  if (eng < 1) { mp.alpha = 1 - eng * 0.3; drawMahoraga(mp); }
  if (eng > 0) { mp.mono = '#ffffff'; mp.alpha = eng * (1 - seg(lt, 4.6, 5.4)); drawMahoraga(mp); burst(lt - 3.3, 2.6, 150, 60, 80, 55, { sp: 90, vx: 30, colors: ['#ffffff', '#e8e4dc', '#000000'], size: 3, g: -20 }); }
  const orbR = lt < 3 ? 18 : 18 + easeIn(seg(lt, 3, 5)) * 260;
  darkOrb(128, 84, orbR, lt);
  if (lt < 3) { applyCam(); sparkBolts(128, 84, lt, 5, 40, ['#ffffff', '#fff0b0'], 1.4); }
  if (between(lt, 1.4, 2.8)) { screen(); ctx.globalAlpha = 0.9; drawWheel(270, 50, 26, wheelAt(T), { glow: 0.8 }); ctx.globalAlpha = 1; slam(lt, 'CLA—', 1.5, 2.8, 270, 90, 9, '#ffffff'); }
  if (Math.floor(lt * 24) % 6 === 0 && lt < 3) impactFrame();
  chroma(lt < 3 ? 2 : 0);
}, [[0, 'hum', 3, 50, 0.4], [0.2, 'crackle', 2.8, 0.4], [1.5, 'clack'], [2.6, 'glass', 0.5], [3.0, 'bigHit'], [3.1, 'dark', 2]]);

// 23. Black implosion, then the domain breaks apart
shot(4, (lt) => {
  if (lt < 0.8) { screen(); rect(0, 0, W, H, '#000'); circle(W / 2, H / 2, (1 - seg(lt, 0, 0.8)) * 200, '#000'); ring(W / 2, H / 2, (1 - seg(lt, 0, 0.8)) * 180, 2, '#ffffff'); return; }
  const d = lt - 0.8;
  drawLightDomain(20, { dim: 0.2 });
  screen(); circle(W / 2, H / 2, easeOut(seg(d, 0, 0.6)) * 300, '#ffffff');
  for (let i = 0; i < 30; i++) {
    const a = hash(i) * TAU, r = easeOut(seg(d, 0.3, 3)) * (150 + hash(i * 3) * 150);
    ctx.save(); ctx.translate(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); ctx.rotate(d * (hash(i) - 0.5) * 6);
    ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(10, -3); ctx.lineTo(-2, 9); ctx.fill(); ctx.restore();
  }
  flash('#b89878', seg(d, 2.2, 3.2));
}, [[0, 'dark', 0.8], [0.8, 'boom', 3, 1.2], [0.8, 'shatter']]);

// ======================= AFTER =======================
// 24. The wheel falls out of the sky, spins... and breaks
shot(4, (lt, T) => {
  setCam(20, -30, 2.0, 0, shakeOf(lt, [[0.8, 0.4, 4]])); drawCity(T);
  applyCam();
  drawDabura(dSt(-30, 0, 1, lt, { armF: 0.3, armB: 0.2, rot: 0.08, head: 0.3 }));
  const fall = easeIn(seg(lt, 0, 0.8)), y = lerp(-200, -14, fall);
  const spin = lt < 0.8 ? lt * 8 : 6.4 + (1 - Math.exp(-(lt - 0.8) * 2)) * 6;
  if (lt < 2.8) drawWheel(40, y, 14, spin, { broken: true, glow: lt < 0.8 ? 0.4 : 0 });
  else burst(lt - 2.8, 1.2, 40, -14, 30, 3, { sp: 50, up: 20, colors: ['#b89a5a', '#7a6232', '#050508'], size: 3 });
  if (lt > 2.8) { applyCam(); shadowPool(40, 0, 18 * (1 - seg(lt, 2.8, 4)), lt); }
  dust(lt - 0.8, 1.5, 40, 0, 14, 5, 10, 60);
  vignette(0.5); letterbox(16);
}, [[0.8, 'thud'], [0.9, 'clack'], [2.8, 'glass', 0.5]]);

// 25. Yuka surfaces from her shadow and collapses; Dabura heals her
shot(5, (lt, T) => {
  setCam(10, -24, 2.6); drawCity(T);
  applyCam();
  const rise = easeOut(seg(lt, 0.2, 1.2)), fallK = easeIn(seg(lt, 1.4, 1.9));
  shadowPool(30, 0, 14 * (1 - seg(lt, 1.2, 2)), lt);
  ctx.save(); ctx.beginPath(); ctx.rect(-200, -200, 400, 200); ctx.clip();
  drawYuka(dpose(34, lerp(40, 0, rise) + fallK * 10, -1, { sc: 1.0, rot: fallK * 1.45, eyes: lt > 1.4 ? 0 : 1, armF: 0.4, armB: 0.3 }));
  ctx.restore();
  const walk = seg(lt, 1.5, 2.2);
  drawDabura(dSt(lerp(-40, -6, walk), 0, 1, lt, { armF: lerp(0.3, -1.1, walk), armB: lerp(0.2, -0.9, walk), rot: 0.35 * walk, handGlow: lt > 2.4 ? '#aaffcc' : null }));
  if (lt > 2.4) { applyCam(); glow(30, -6, 30, '#aaffcc', 0.5 * seg(lt, 2.4, 3)); for (let i = 0; i < 14; i++) { const ph = frac(lt + hash(i)); ctx.globalAlpha = 1 - ph; rect(28 + (hash(i * 3) - 0.5) * 20, -ph * 30, 1.2, 1.2, '#aaffcc'); } ctx.globalAlpha = 1; }
  letterbox(16);
}, [[0.2, 'whooshDown', 0.8, 0.3], [1.5, 'thud'], [2.4, 'ting', 0.3]], [[2.6, '<Dabura> my first real fight. it won\'t cost you your life.', '#ffffff']]);

// 26. Sunrise over the ruins
shot(5, (lt, T) => {
  setCam(lerp(0, 20, lt / 5), -30, lerp(1.9, 1.6, lt / 5)); drawCity(T);
  applyCam();
  drawDabura(dpose(-6, 5, 1, { rot: 0.1, legF: -1.4, legB: -1.2, armF: -0.4, armB: 0.3, head: -0.1 }));
  drawYuka(dpose(26, 0, -1, { sc: 1.0, armF: 0.2, armB: 0.2, head: 0.1 }));
  for (let i = 0; i < 20; i++) { const ph = frac(lt * 0.12 + hash(i)); ctx.globalAlpha = 1 - ph; rect(-150 + hash(i * 3) * 300, -ph * 100, 1, 1, '#ffe0a0'); }
  ctx.globalAlpha = 1;
  letterbox(16);
}, [[0, 'wind', 5, 0.2]], [[0.3, '<Yuka> ...you beat Mahoraga. and saved me?', '#ffffff'], [2.3, '<Dabura> a warrior repays a good fight.', '#ffffff'], [3.8, '<Dabura> humans and Simurians... maybe we can talk now.', '#ffffff']]);

// 27. End card
shot(7, (lt) => {
  screen(); rect(0, 0, W, H, '#000');
  const a = k => (ctx.globalAlpha = seg(lt, k, k + 0.5));
  a(0.2); txt('DABURA vs MAHORAGA', W / 2, 42, 12, '#ffe9a0', { stroke: 2 });
  a(0.8); txt('WINNER: DABURA KARABA', W / 2, 68, 8, '#ffffff');
  a(1.4); txt('Mahoraga was exorcised one half-turn short of adapting.', W / 2, 88, 4, '#dcd0ff');
  a(2.0); txt('ALTERNATE ENDING: in the manga (Modulo ch. 15-23) the duel', W / 2, 110, 4, '#8affb0');
  txt('was interrupted when Maru teleported Dabura away.', W / 2, 118, 4, '#8affb0');
  a(2.8); txt('fan animation based on Jujutsu Kaisen Modulo - made with pure JavaScript', W / 2, 160, 3.4, '#8a8aa0');
  ctx.globalAlpha = 1;
}, [[0.2, 'gong'], [0.8, 'ting', 0.3]]);
