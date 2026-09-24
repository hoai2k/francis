// Storyboard: Hakari vs Kashimo, following Jujutsu Kaisen chapters 185-190.
'use strict';
const HK = 'hakari', KS = 'kashimo', SIGN = [-1.15, 1.15];
const SHOTS = [];
const shot = (d, draw, sfx = [], chatLines = []) => { const s = { d, draw, sfx, chat: chatLines }; SHOTS.push(s); return s; };

// ---------- helpers ----------
const P = (x, y, f, o) => pose(x, y, f, o);
const stance = (x, y, f, t, o) => P(x, y, f, Object.assign({ armF: -1.2 + Math.sin(t * 4) * 0.06, armB: -0.8, legF: -0.35, legB: 0.35 }, o));
const kStance = (x, y, f, t, o) => P(x, y, f, Object.assign({ armF: -0.9 + Math.sin(t * 3) * 0.05, armB: -0.5, legF: -0.4, legB: 0.4, staff: 1, staffRot: 0.5, t }, o));
const flyBack = (x, y, f, spin, o) => P(x, y, f, Object.assign({ armF: -2.6, armB: -2.9, legF: 0.6, legB: -0.4, rot: spin, head: -0.3 }, o));
const lying = (x, f, o) => P(x, 14, f, Object.assign({ rot: -Math.PI / 2 * f, armF: -2.9, armB: -3.0, legF: 0.1, head: 0.2 }, o));
function screenCam(sh = [0, 0], z = 1, cx = W / 2, cy = H / 2, r = 0) { setCam(cx, cy, z, r, sh); }
function ghosts(kind, fn, lt, n, step, col, a = 0.55) {
  applyCam();
  for (let i = n; i >= 1; i--) { const p = fn(lt - i * step); p.mono = col; p.alpha = a * (1 - i / (n + 1)); drawSide(p, kind); }
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
  if (o.elec) sparkBolts(x, y, dt, 4, 26 * s, ['#bff8ff', '#4fc8ff'], 1.2);
}
function postHit(dt, o = {}) {
  if (dt < 0 || dt > 0.6) return;
  if (dt < 0.035) flash('#ffffff');
  else if (dt < (o.imp ?? 0.11)) impactFrame(o.col);
  if (o.chroma && dt < 0.5) chroma(o.chroma * (1 - dt / 0.5) * (Math.floor(dt * 24) % 2 ? 1 : -1));
}
function bgGrad(c1, c2) { screen(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function heal(x, y, t, a = 1) { // jackpot auto-RCT sparkles
  for (let i = 0; i < 16; i++) { const ph = frac(t * 1.4 + hash(i)); ctx.globalAlpha = (1 - ph) * a; rect(x + (hash(i * 3) - 0.5) * 16, y - ph * 40, 1.2, 1.2, i % 2 ? '#aaffcc' : '#ffd24a'); }
  ctx.globalAlpha = 1;
}
function caption(lt, s, t0, t1, y = 26) { slam(lt, s, t0, t1, W / 2, y, 6, '#ffffff', { pop: 0.3, sw: 0.5 }); }
// Lightning that bends toward a charged target.
function bentBolt(x1, y1, x2, y2, bend, t, w = 3) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + bend, s = Math.floor(t * 30);
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2 + (i && i < 10 ? (hash(s + i) - 0.5) * 8 : 0), (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2 + (i && i < 10 ? (hash(s + i * 3) - 0.5) * 8 : 0)]); }
  for (const [lw, c] of [[w * 3, 'rgba(111,216,255,0.3)'], [w, '#8ff0ff'], [w * 0.4, '#ffffff']]) {
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke();
  }
}
function water(x0, T, top = 0) {
  applyCam();
  const dawn = seg(T, 97, 104), L = Math.max(x0, cam.x - 400 / cam.z - 20), R = cam.x + 400 / cam.z + 20;
  if (R <= L) return;
  rect(L, top, R - L, 400, mix('#12304a', '#6a5a7a', dawn));
  for (let i = 0; i < 40; i++) { const x = L + frac(hash(i) + T * 0.02 * (i % 2 ? 1 : -1)) * (R - L), y = top + 2 + hash(i * 3) * 30; rect(x, y, 6 + hash(i * 5) * 14, 0.6, rgba(dawn > 0.5 ? '#ffd0a0' : '#9ac0e8', 0.4)); }
  rect(L, top, R - L, 1, rgba('#dff4ff', 0.6));
}
// Minecraft-style boss bar for the jackpot timer (4:11).
function jackpotLeft(T) {
  if (between(T, 49.2, 69.5)) return T < 65.5 ? lerp(251, 8, seg(T, 49.5, 65.5)) : lerp(8, 0, seg(T, 65.5, 69.3));
  if (between(T, 75.5, 95)) return T < 90.5 ? lerp(251, 5, seg(T, 75.5, 90.5)) : lerp(5, 0, seg(T, 90.5, 95));
  return -1;
}
function globalOverlay(T) {
  const left = jackpotLeft(T); if (left < 0) return;
  screen();
  const s = Math.ceil(left), label = `JACKPOT  ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  txt(label, W / 2, 9, 5, s <= 10 ? '#ff5555' : '#ff9ad8', { sh: 0.6 });
  rect(W / 2 - 60, 14, 120, 3, '#3a1030'); rect(W / 2 - 60, 14, 120 * (left / 251), 3, s <= 10 && Math.floor(T * 6) % 2 ? '#ffffff' : '#ff4fb0');
  rect(W / 2 - 60, 14, 120 * (left / 251), 1, '#ffb0e0');
}

// ======================= CH.185-186: ARRIVAL =======================
// 1. Tokyo Colony No. 2, night harbor
shot(4, (lt, T) => {
  const k = easeInOut(lt / 4);
  setCam(lerp(-240, 40, k), -60, 0.95 + 0.1 * k); drawHarbor(T);
  screen();
  const s = 'TOKYO COLONY No.2', n = Math.floor(seg(lt, 0.6, 1.8) * s.length), a = seg(lt, 0.6, 1.0) * (1 - seg(lt, 3.5, 3.95));
  ctx.globalAlpha = a; txt(s.slice(0, n), 14, 28, 6, '#ffffff', { align: 'left' }); rect(14, 34, 90 * seg(lt, 0.6, 1.8), 0.8, '#4fc8ff');
  txt('CULLING GAME', 14, 42, 4, '#9ab0d0', { align: 'left' }); ctx.globalAlpha = 1;
  letterbox(16); flash('#000', 1 - seg(lt, 0, 0.9));
}, [[0, 'wind', 4, 0.25], [0.3, 'gong']], [[2.2, '[Culling Game] Colony: Tokyo No. 2', '#ffff55']]);

// 2. Kashimo stands over a beaten Panda
shot(3.5, (lt, T) => {
  setCam(-22, -26, lerp(2.4, 2.9, easeInOut(lt / 3.5))); drawHarbor(T);
  applyCam();
  drawPanda(12, 0);
  const raise = easeOut(seg(lt, 2.4, 2.9));
  aura(-40, 0, 36, lt, PAL.kashimo.aura, 14, 10, 0.5);
  drawSide(kStance(-40, 0, 1, lt, { armF: lerp(-0.3, -2.6, raise), staffRot: lerp(1.3, 0.3, raise), charged: raise > 0.5, head: 0.15 }), KS);
  sparks(-40, 0, 34, lt, '#8ff0ff', 2 + Math.floor(raise * 4));
  vignette(0.5);
}, [[0.2, 'zap', 0.2], [2.4, 'zap', 0.5]], [[0.8, '<Kashimo> ...is that really all?', '#ffffff']]);

// 3. Hakari's right hook
const KS_HOOK = t => { const k = easeIn(seg(t, 0.55, 2.5)); return flyBack(-40 - k * 80, -14 - Math.sin(k * 2) * 6, 1, -k * 2.5); };
shot(2.5, (lt, T) => {
  const sh = shakeOf(lt, [[0.55, 0.5, 6]]), k = easeInOut(seg(lt, 0.6, 2.5));
  setCam(lerp(-24, -100, k), -26, lerp(2.7, 2.0, k), lerp(0.05, -0.03, k), sh); drawHarbor(T);
  if (lt < 0.55) streaks(lt, { n: 40, speed: 1500, alpha: 0.4, dir: -1 });
  applyCam();
  drawPanda(12, 0);
  const hk = t => t < 0.45 ? P(lerp(170, -16, easeIn(seg(t, 0, 0.45))), 0, -1, { armF: 1.3, armB: 1.0, legF: -0.9, legB: 0.9, rot: -0.55 }) : P(-16, 0, -1, { armF: -Math.PI / 2, extF: 4, armB: 1.0, rot: -0.3, legF: -0.7, legB: 0.7 });
  if (lt < 0.6) ghosts(HK, hk, lt, 5, 0.03, '#ff4fb0', 0.6);
  aura(-16, 0, 40, lt, PAL.hakari.aura, 24, 14, 0.8);
  drawSide(hk(lt), HK);
  if (lt < 0.55) drawSide(kStance(-40, 0, 1, lt, { armF: -2.6, staffRot: 0.3, charged: true }), KS);
  else { ghosts(KS, KS_HOOK, lt, 4, 0.05, '#6fd8ff', 0.4); drawSide(KS_HOOK(lt), KS); }
  if (lt > 0.55) { // staff knocked away
    const d = lt - 0.55; ctx.save(); ctx.translate(-40 - d * 50, -40 - d * 60 + d * d * 40); ctx.rotate(d * 14); rect(-19, -0.9, 38, 1.8, '#3a2616'); rect(-19, -1.1, 2, 2.2, '#c8a040'); ctx.restore();
  }
  hitFx(lt - 0.55, -34, -30, { s: 1.6, ring: '#ff9ad8' });
  postHit(lt - 0.55, { chroma: 4, col: '#ff2080' });
}, [[0, 'whoosh', 0.5, 0.6], [0.55, 'bigHit'], [0.6, 'whoosh', 0.8, 0.5]]);

// 4. Through a row of freight containers
const KS_FLY = t => flyBack(lerp(-120, -360, easeOut(seg(t, 0, 1.1))), -14, 1, -t * 7);
shot(2.5, (lt, T) => {
  const sh = shakeOf(lt, [[0.35, 0.3, 5], [0.6, 0.3, 5], [0.85, 0.4, 6]]);
  setCam(lerp(-120, -320, easeOut(seg(lt, 0, 1.2))), -22, 1.9, 0, sh); drawHarbor(T);
  if (lt < 1.1) streaks(lt, { n: 40, speed: 1500, alpha: 0.4, dir: 1 });
  applyCam();
  if (lt < 1.1) { ghosts(KS, KS_FLY, lt, 5, 0.03, '#6fd8ff', 0.5); drawSide(KS_FLY(lt), KS); }
  BREAKERS.forEach(([x], i) => {
    const d = lt - (0.35 + i * 0.25);
    burst(d, 1.4, x, -12, 30, x, { sp: 150, up: 60, g: 220, colors: ['#b8412c', '#8a2a1a', '#d85a3a', '#3a3a3a'], size: 5, shrink: 0, fade: false, flat: 0.8 });
    dust(d, 1.6, x, -8, 12, x + 3, 14, 70);
  });
  dust(lt - 1.1, 1.4, -360, -6, 18, 99, 18, 60);
}, [[0.35, 'boom', 0.7, 0.7], [0.6, 'boom', 0.7, 0.7], [0.85, 'boom', 0.9, 0.8], [0.9, 'crumble', 1.2]]);

// 5. Kashimo climbs out grinning, catches his staff
shot(3, (lt, T) => {
  setCam(-352, -28, 2.6, 0.02, shakeOf(lt, [[1.0, 0.2, 2]])); drawHarbor(T);
  applyCam();
  dust(lt + 0.8, 2.6, -360, -4, 18, 99, 18, 60);
  const up = easeOut(seg(lt, 0, 0.6)), c = easeOutBack(seg(lt, 0.95, 1.15));
  if (lt < 1.0) { const d = 1.0 - lt; ctx.save(); ctx.translate(-340 + d * 30, -30 - d * 90); ctx.rotate(d * 12); rect(-19, -0.9, 38, 1.8, '#3a2616'); rect(-19, -1.1, 2, 2.2, '#c8a040'); ctx.restore(); }
  const p = kStance(-352, lerp(12, 0, up), 1, lt, { rot: lerp(-1.0, 0, up), staff: lt >= 1.0, armF: lt < 1.0 ? -2.4 : lerp(-2.6, -0.9, c), grin: 1, charged: lt > 1.3, staffRot: lerp(0.2, 0.5, c) });
  aura(-352, 0, 38, lt, PAL.kashimo.aura, 20, 12, seg(lt, 1, 1.6));
  drawSide(p, KS);
  sparks(-352, 0, 34, lt, '#8ff0ff', 3, seg(lt, 1.2, 1.6));
}, [[0.2, 'crumble', 0.5], [1.0, 'thud'], [1.3, 'zap', 0.4]], [[1.4, "<Kashimo> heh. you shrugged off my current...", '#ffffff']]);

// 6. The wager
shot(3, (lt, T) => {
  setCam(-300, -26, lerp(1.9, 2.1, lt / 3)); drawHarbor(T);
  applyCam();
  aura(-250, 0, 40, lt, PAL.hakari.aura, 20, 14, 0.7);
  const kn = Math.floor(lt * 4) % 2;
  drawSide(P(-250, 0, -1, { armF: kn ? -1.5 : -1.3, armB: kn ? -1.3 : -1.5, extF: -2, extB: -2 }), HK);
  drawSide(kStance(-350, 0, 1, lt, { armF: -2.5, staffRot: 1.9, grin: 1 }), KS);
}, [[0.1, 'thud'], [0.35, 'thud']], [[0.1, '<Hakari> I win: you hand over your points.', '#ffffff'], [1.3, '<Kashimo> I win: you tell me about Sukuna.', '#ffffff']]);

// 7. Title
shot(3, (lt) => {
  screen(); rect(0, 0, W, H, '#000');
  const kin = easeOutExpo(seg(lt, 0, 0.35)), off = (1 - kin) * 220, sh = shakeOf(lt, [[0.6, 0.6, 5]]);
  [[true, KS, '#061a3a', '#1a7adf'], [false, HK, '#3a0626', '#df1a8a']].forEach(([left, kind, c1, c2]) => {
    screen(); ctx.save(); ctx.translate(sh[0], sh[1]); ctx.beginPath();
    if (left) { ctx.moveTo(-10, -10); ctx.lineTo(W * 0.56 - off, -10); ctx.lineTo(W * 0.44 - off, H + 10); ctx.lineTo(-10, H + 10); }
    else { ctx.moveTo(W * 0.56 + off, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, H + 10); ctx.lineTo(W * 0.44 + off, H + 10); }
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(left ? 0 : 1, c1); g.addColorStop(0.5, c2); ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
    const cx = left ? 78 - off : 242 + off;
    focusLines(cx, 96, lt, { n: 40, inner: 50, color: 'rgba(255,255,255,0.3)' });
    screen(); ctx.translate(sh[0], sh[1]);
    drawFace(kind, cx - 36, 72, 9, { grin: 1, glow: 1 });
    ctx.restore();
  });
  screen(); if (kin > 0.95) bolt(W * 0.56, -5, W * 0.44, H + 5, Math.floor(lt * 20), 14, 10, 1.8, '#ffffff');
  slam(lt, 'KASHIMO', 0.35, 3, 72, 162, 13, '#bff4ff', { strokeCol: '#06103a' });
  slam(lt, 'HAKARI', 0.45, 3, 248, 162, 13, '#ffc0e8', { strokeCol: '#3a0626' });
  jslam(lt, '鹿紫雲一', 0.5, 3, 60, 26, 13, '#ffffff');
  jslam(lt, '秤金次', 0.55, 3, 262, 26, 13, '#ffffff');
  slam(lt, 'VS', 0.6, 3, W / 2, 96, 34, '#ffffff', { jitter: 2, pop: 2.5, sw: 0.35 });
  slam(lt, 'CHAPTERS 185-190', 1.3, 3, W / 2, 134, 6, '#ffd24a');
  postHit(lt - 0.6, { chroma: 3, imp: 0.08 });
  if (lt > 2.8) flash('#fff', seg(lt, 2.8, 3));
}, [[0, 'whoosh', 0.4, 0.5], [0.6, 'bigHit'], [0.65, 'thunderZap'], [1.3, 'gong']]);

// ======================= CH.186: LIGHTNING =======================
// 8. Electrified strikes land even through a guard
const ES_HITS = [0.45, 1.15, 1.85];
shot(3, (lt, T) => {
  const lq = q12(lt), sh = shakeOf(lt, ES_HITS.map(t0 => [t0, 0.2, 3]));
  setCam(-294, -24, 2.6, Math.sin(lt * 2) * 0.04, sh); drawHarbor(T);
  applyCam();
  let charges = 0; ES_HITS.forEach(t0 => { if (lt >= t0) charges++; });
  const hit = ES_HITS.some(t0 => between(lq, t0 - 0.15, t0 + 0.2));
  const kp = kStance(-322, 0, 1, lt, { charged: true });
  if (hit) Object.assign(kp, { armF: -Math.PI / 2, extF: 3, staffRot: 0, rot: 0.15, x: -318 });
  if (lt > 2.3) Object.assign(kp, { x: -330, rot: -0.1 });
  const hp = stance(-268, 0, -1, lt, { charges });
  if (hit) Object.assign(hp, { armF: -2.3, armB: -2.0, rot: 0.1 });
  if (lt > 2.3) Object.assign(hp, { armF: -Math.PI / 2, extF: 4, rot: -0.15, x: -275 });
  aura(-268, 0, 36, lt, PAL.hakari.aura, 14, 10, 0.5);
  drawSide(kp, KS); drawSide(hp, HK);
  ES_HITS.forEach(t0 => hitFx(lt - t0, -282, -24, { s: 1.1, ring: '#8ff0ff', elec: 1, colors: ['#ffffff', '#8ff0ff', '#4fc8ff'] }));
  if (charges) sparks(-268, 0, 34, lt, '#8ff0ff', charges);
  caption(lt, 'HIS CURSED ENERGY BEHAVES LIKE ELECTRICITY', 0.5, 3, 26);
  ES_HITS.forEach(t0 => { if (between(lt, t0, t0 + 0.03)) flash('#dff8ff', 0.5); });
}, ES_HITS.flatMap(t0 => [[t0, 'hit', 0.6], [t0, 'zap', 0.5]]).concat([[2.3, 'hit', 0.7]]));

// 9. The lightning that cannot be dodged
shot(3, (lt, T) => {
  const sh = shakeOf(lt, [[1.2, 0.6, 7]]);
  setCam(-305, -32, 1.9, 0, sh); drawHarbor(T);
  applyCam();
  const hx = lt < 0.8 ? -268 : lerp(-268, -225, easeOut(seg(lt, 0.8, 1.1))), hy = lt < 0.8 ? 0 : -Math.sin(seg(lt, 0.8, 1.4) * Math.PI) * 26;
  const kp = kStance(-380, 0, 1, lt, { armF: lerp(-0.9, -2.0, easeOut(seg(lt, 0.2, 0.6))), staffRot: 0.3, charged: lt > 0.4, grin: 1 });
  aura(-380, 0, 44, lt, PAL.kashimo.aura, 28, 16, seg(lt, 0.3, 0.9));
  drawSide(kp, KS);
  const hurt = lt > 1.2;
  drawSide(hurt ? P(hx, hy, -1, { rot: 0.35, armF: 0.6, armB: 1.0, head: 0.4, charges: 3 }) : P(hx, hy, -1, { legF: -0.8, legB: 0.6, armF: 1.0, armB: 0.8, rot: -0.3, charges: 3 }), HK);
  if (between(lt, 0.95, 1.6)) { bentBolt(-362, -52, hx - 2, hy - 24, -60, lt, 4 * (1 - seg(lt, 1.3, 1.6))); }
  if (hurt) heal(hx, hy, lt, seg(lt, 1.5, 2.2));
  hitFx(lt - 1.2, hx, hy - 24, { s: 1.8, ring: '#8ff0ff', elec: 1 });
  postHit(lt - 1.2, { chroma: 5, col: '#40a0ff' });
  jslam(lt, '雷', 0.9, 2.4, 60, 60, 40, '#bff8ff', { strokeCol: '#06205a' });
  slam(lt, 'IT ALWAYS HITS', 1.3, 3, W / 2, 158, 9, '#8ff0ff', { strokeCol: '#06205a' });
}, [[0.3, 'charge', 0.7, 200, 1400, 0.15], [0.8, 'whoosh', 0.3, 0.5], [1.0, 'thunderZap'], [1.2, 'bigHit'], [1.8, 'heal']]);

// 10. Batting a freight container back and forth until it shatters
const VOL = [[0, -250, -362], [0.8, -362, -248], [1.6, -248, -362]];
function volleyPos(lt) {
  for (let i = VOL.length - 1; i >= 0; i--) if (lt >= VOL[i][0]) { const [t0, a, b] = VOL[i], k = seg(lt, t0 + 0.05, t0 + 0.75); return [lerp(a, b, k), -30 - Math.sin(k * Math.PI) * 14, (lt - t0) * 6]; }
  return [-250, -30, 0];
}
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[0.05, 0.25, 4], [0.8, 0.25, 4], [1.6, 0.25, 4], [2.45, 0.6, 7]]);
  setCam(-305, -34, 1.75, 0, sh); drawHarbor(T);
  applyCam();
  const lq = q12(lt);
  const hk = between(lq, 0, 0.3) ? P(-236, 0, -1, { legF: -1.6, rot: 0.35, armF: -1.0, armB: 0.8 })
    : between(lq, 1.55, 1.9) ? P(-236, 0, -1, { armF: -Math.PI / 2, extF: 4, rot: -0.2 }) : stance(-236, 0, -1, lt);
  const ks = between(lq, 0.75, 1.1) ? kStance(-376, 0, 1, lt, { armF: -1.2, staffRot: -0.9, rot: 0.25, charged: true })
    : between(lq, 2.35, 2.7) ? kStance(-376, 0, 1, lt, { armF: -Math.PI / 2, extF: 3, staffRot: 0, rot: 0.2, charged: true }) : kStance(-376, 0, 1, lt, { charged: true });
  aura(-236, 0, 36, lt, PAL.hakari.aura, 14, 10, 0.5);
  drawSide(ks, KS); drawSide(hk, HK);
  if (lt < 2.45) {
    const [x, y, r] = volleyPos(lt);
    ctx.save(); ctx.translate(x, y); ctx.rotate(r); container(-20, -10, 40, 20, '#2c6fb8'); ctx.restore();
  }
  [[0.05, -245], [0.8, -360], [1.6, -245]].forEach(([t0, x]) => hitFx(lt - t0, x, -30, { s: 1.3 }));
  burst(lt - 2.45, 2.0, -350, -32, 36, 44, { sp: 220, up: 40, g: 200, colors: ['#2c6fb8', '#1e4f88', '#3a8ad8', '#c0c0c0'], size: 7, shrink: 0, fade: false });
  hitFx(lt - 2.45, -350, -32, { s: 2, elec: 1 });
  postHit(lt - 2.45, { chroma: 4 });
}, [[0.05, 'hit', 0.9], [0.8, 'hit', 0.9], [0.82, 'zap', 0.4], [1.6, 'hit', 0.9], [2.45, 'bigHit'], [2.5, 'crumble', 1.2]]);

// 11. Kashimo takes Hakari's arm... it grows right back
shot(2.5, (lt, T) => {
  const sh = shakeOf(lt, [[0.4, 0.3, 4]]);
  setCam(-280, -26, 2.5, 0.03, sh); drawHarbor(T);
  applyCam();
  const cut = between(lt, 0.4, 1.35), regrow = seg(lt, 1.0, 1.35);
  drawSide(kStance(lt < 0.3 ? lerp(-360, -300, easeIn(seg(lt, 0, 0.3))) : -300, 0, 1, lt, lt >= 0.3 && lt < 0.7 ? { armF: -1.3, staffRot: -1.2, rot: 0.25, charged: true } : { charged: true }), KS);
  const hp = stance(-262, 0, -1, lt, { noArmF: cut && regrow < 1, grin: 1 });
  aura(-262, 0, 38, lt, PAL.hakari.aura, 18, 12, 0.7);
  drawSide(hp, HK);
  if (lt > 0.4 && lt < 1.8) { const d = lt - 0.4; ctx.save(); ctx.translate(-262 + d * 40, -24 - d * 50 + d * d * 60); ctx.rotate(d * 10); ctx.globalAlpha = 1 - seg(d, 1.1, 1.4); rect(-2, -6, 4, 12, PAL.hakari.top); rect(-2, 3, 4, 3, PAL.hakari.skin); ctx.restore(); ctx.globalAlpha = 1; }
  if (between(lt, 0.9, 1.6)) heal(-262, -10, lt, 1);
  slash(-285, -45, -245, -10, seg(lt, 0.38, 0.7), { w: 2.5, glow: '#4fc8ff' });
  postHit(lt - 0.4, { imp: 0.06 });
}, [[0.3, 'whoosh', 0.2, 0.5], [0.4, 'sever'], [1.0, 'heal']], [[1.4, '<Kashimo> ...it grew back?', '#ffffff']]);

// 12. Hand sign
shot(3, (lt) => {
  bgGrad('#1a0214', '#6a0a4a');
  focusLines(W / 2, H / 2, lt, { n: 60, inner: 60, color: 'rgba(255,160,220,0.35)' });
  screenCam(shakeOf(lt, [[0.9, 0.4, 3]])); applyCam();
  aura(W / 2, 200, 130, lt, PAL.hakari.aura, 50, 100, 1);
  aura(W / 2, 200, 110, lt + 3, PAL.hakari.gold, 20, 90, 0.6);
  drawFront({ x: W / 2, y: 205, sc: 3.4, armL: SIGN[0], armR: SIGN[1], sign: 1 }, HK, { grin: 1, glow: 1 });
  jslam(lt, '領域展開', 0.8, 3, W / 2, 34, 28, '#ffffff', { jitter: 1.5 });
  slam(lt, 'DOMAIN EXPANSION', 1.1, 3, W / 2, 66, 10, '#ffd24a');
  vignette(0.5);
  if (lt > 2.8) flash('#fff', seg(lt, 2.8, 3));
}, [[0, 'hum', 3, 110, 0.3], [0.8, 'hit', 0.6], [1.0, 'riser', 2, 0.5]]);

// ======================= CH.187: IDLE DEATH GAMBLE =======================
const SPIN3 = [{ spin: true }, { spin: true }, { spin: true }];
// 13. The domain bursts open
shot(2, (lt) => {
  screen(); rect(0, 0, W, H, '#000');
  const r = easeOutExpo(seg(lt, 0, 0.8)) * 260;
  screen(); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.clip();
  drawDomain(lt, { reels: SPIN3 }); ctx.restore();
  screen(); ring(W / 2, H / 2, r, 3, '#ffd24a');
  jslam(lt, '坐殺博徒', 0.5, 2, W / 2, 138, 26, '#ffffff', { strokeCol: '#3a0626' });
  slam(lt, 'IDLE DEATH GAMBLE', 0.7, 2, W / 2, 164, 11, '#ff9ad8', { strokeCol: '#3a0626' });
  if (lt < 0.05) flash('#ffffff');
}, [[0, 'boom', 1.5, 0.7], [0.1, 'balls', 1.8], [0.5, 'gong']]);

// 14. Kashimo considers Hollow Wicker Basket, then the rules are forced into his head
const RULES = ['RULE 1: THE REELS SPIN; LINE UP 3 FOR A JACKPOT', 'RULE 2: REACH EVENTS RAISE THE ODDS', 'RULE 3: A JACKPOT = UNLIMITED CURSED ENERGY', 'RULE 4: ...AND AUTO REVERSE CURSED TECHNIQUE, 4:11'];
shot(4, (lt) => {
  drawDomain(lt + 2, { reels: SPIN3 });
  screenCam(); applyCam();
  aura(232, 172, 90, lt, PAL.hakari.aura, 20, 30, 0.6);
  drawSide(P(232, 172, -1, { sc: 2.4, armF: 0.15, armB: 0.15, extF: -1, extB: -1, grin: 1 }), HK);
  drawSide(kStance(96, 172, 1, lt, { sc: 2.4, head: -0.15 }), KS);
  const hwb = seg(lt, 0.3, 0.6) * (1 - seg(lt, 1.0, 1.3));
  if (hwb > 0) { // woven lattice of Hollow Wicker Basket, abandoned
    ctx.globalAlpha = hwb; ctx.strokeStyle = '#e0d0a0'; ctx.lineWidth = 0.8;
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(96 + i * 6 - 20, 180); ctx.lineTo(96 + i * 6 + 20, 90); ctx.stroke(); ctx.beginPath(); ctx.moveTo(96 + i * 6 + 20, 180); ctx.lineTo(96 + i * 6 - 20, 90); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  slam(lt, 'HOLLOW WICKER BASKET?', 0.3, 1.3, 96, 70, 6, '#e0d0a0', { pop: 0.4 });
  screen();
  RULES.forEach((s, i) => {
    const t0 = 1.4 + i * 0.6; if (lt < t0) return;
    const k = seg(lt, t0, t0 + 0.3), n = Math.floor(seg(lt, t0, t0 + 0.5) * s.length);
    rect(14, 118 + i * 9 - 4, 190 * k, 8, 'rgba(0,0,0,0.6)');
    txt(s.slice(0, n), 17, 118 + i * 9, 4, '#ffd24a', { align: 'left', shadow: false });
  });
  caption(lt, 'THE DOMAIN FORCES ITS RULES ON YOU', 1.2, 4, 20);
}, [[0.3, 'hum', 1, 220, 0.15], [1.4, 'glitch', 0.4], [2.0, 'glitch', 0.4], [2.6, 'glitch', 0.4], [3.2, 'glitch', 0.4], [0, 'reel', 4]]);

// 15. RIICHI: Transit Card Riichi on the "CR Private Pure Love Train" screen
shot(6, (lt) => {
  const reels = [lt < 0.8 ? { spin: true } : { val: '7', stopT: 0.8 }, lt < 1.5 ? { spin: true } : { val: '7', stopT: 1.5, hot: true }, lt < 5.4 ? { spin: true } : { val: '7', stopT: 5.4, hot: true }];
  const z = lt < 2.0 ? lerp(1, 1.5, easeInOut(seg(lt, 1.5, 2.0))) : lt < 5.0 ? 2.4 : lerp(2.4, 1.6, easeInOut(seg(lt, 5.0, 5.3)));
  screen(); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2 + (z - 1) * 12);
  const screenFn = between(lt, 2.0, 5.0) ? (x, y, w, h) => { trainScene(x, y, w, h, lt, easeInOut(seg(lt, 3.6, 4.4))); } : null;
  drawDomainZ(lt + 6, { reels, screen: screenFn });
  ctx.restore();
  jslam(lt, 'リーチ!!', 1.6, 2.6, W / 2, 40, 30, '#ff2060', { strokeCol: '#ffd24a', jitter: 2 });
  slam(lt, 'RIICHI!', 1.7, 2.6, W / 2, 150, 16, '#ffd24a', { strokeCol: '#3a0626' });
  if (between(lt, 2.0, 5.0)) {
    slam(lt, 'TRANSIT CARD RIICHI', 2.1, 5.0, W / 2, 16, 8, '#ffffff', { strokeCol: '#c02070' });
    caption(lt, 'WILL YUKI MAKE IT TO WORK ON TIME?', 2.4, 4.3, 164);
    slam(lt, 'SUCCESS!', 4.4, 5.0, W / 2, 150, 14, '#ff2060', { strokeCol: '#ffffff' });
  }
  if (lt > 5.4) flash('#ffffff', 1 - seg(lt, 5.4, 6.0));
}, [[0, 'reel', 5.4], [0.8, 'stopReel'], [1.5, 'stopReel'], [1.6, 'riichi'], [2.0, 'whoosh', 0.3, 0.3], [4.4, 'ting'], [5.4, 'stopReel'], [5.45, 'bigHit']]);
function drawDomainZ(t, o) { drawDomain(t, Object.assign({}, o, { tf: ctx.getTransform() })); } // keeps an outer zoom

// 16. JACKPOT!!
shot(3.5, (lt) => {
  drawDomain(lt + 12, { fever: true, reels: [{ val: '7', hot: true }, { val: '7', hot: true }, { val: '7', hot: true }] });
  screenCam(shakeOf(lt, [[0, 0.8, 5]])); applyCam();
  const b = Math.floor(lt * 4) % 2;
  aura(W / 2, 205, 140, lt, PAL.hakari.aura, 60, 140, 1); aura(W / 2, 205, 120, lt + 2, PAL.hakari.gold, 30, 120, 1);
  drawFront({ x: W / 2, y: 205 - (b ? 3 : 0), sc: 3.0, armL: b ? 2.6 : 2.9, armR: b ? -2.9 : -2.6 }, HK, { grin: 1, glow: 1 });
  jslam(lt, '大当たり', 0.1, 3.5, W / 2, 34, 30, '#ffd24a', { strokeCol: '#c02070', jitter: 2, pop: 2 });
  slam(lt, 'JACKPOT!!', 0.25, 3.5, W / 2, 64, 18, '#ffffff', { strokeCol: '#ff2080', jitter: 2 });
  screen(); ctx.globalAlpha = seg(lt, 0.8, 1.2);
  rect(40, 150, 240, 20, 'rgba(0,0,0,0.6)');
  txt('UNLIMITED CURSED ENERGY + AUTO REVERSE CURSED', W / 2, 156, 4, '#ffd24a', { shadow: false });
  txt('TECHNIQUE FOR 4 MINUTES 11 SECONDS', W / 2, 164, 4, '#ffd24a', { shadow: false });
  ctx.globalAlpha = 1;
  postHit(lt, { chroma: 3, imp: 0.06 });
}, [[0, 'jackpot'], [0.2, 'balls', 3]]);

// 17. Kashimo's combination knocks Hakari out cold
const KO_HITS = [0.4, 0.75, 1.1, 1.45, 1.8, 2.15, 2.8];
function koHakari(lt) {
  if (lt >= 2.8) { const k = easeIn(seg(lt, 2.8, 3.3)); return P(lerp(192, 215, k), 172 + k * 8, -1, { sc: 2.4, rot: k * Math.PI / 2 * 0.95, armF: -2.8 * k, armB: -2.9 * k, head: 0.3 }); }
  const p = stance(192, 172, -1, lt, { sc: 2.4, charges: 3 });
  for (const h of KO_HITS) if (between(lt, h, h + 0.2)) { p.rot = 0.3; p.head = 0.45; p.x += 4; }
  return p;
}
function koKashimo(lt) {
  const lq = q12(lt), p = kStance(140, 172, 1, lt, { sc: 2.4, charged: true });
  for (const [i, h] of KO_HITS.entries()) if (between(lq, h - 0.12, h + 0.12)) Object.assign(p, i % 2 ? { armF: -1.2, staffRot: -1.0, rot: 0.2 } : { armF: -Math.PI / 2, extF: 3, staffRot: 0, rot: 0.15 });
  if (lt > 3.3) Object.assign(p, { armF: -0.3, staffRot: 1.3, head: 0.1 });
  return p;
}
const KO = shot(5, (lt) => {
  drawDomain(lt + 16, { reels: [{ val: '7' }, { val: '7' }, { val: '7' }] });
  const sh = shakeOf(lt, KO_HITS.map(h => [h, 0.2, 3]));
  screenCam(sh, lt < 2.8 ? 1.25 : 1.0, lt < 2.8 ? 166 : W / 2, lt < 2.8 ? 125 : H / 2); applyCam();
  ghosts(KS, koKashimo, lt, 2, 0.04, '#6fd8ff', 0.35);
  drawSide(koKashimo(lt), KS); drawSide(koHakari(lt), HK);
  KO_HITS.forEach(h => hitFx(lt - h, 186, 120, { s: 2, ring: '#8ff0ff', elec: 1, colors: ['#ffffff', '#8ff0ff'] }));
  postHit(lt - 2.8, { chroma: 4 });
  if (lt > 3.6) slam(lt, '...', 3.6, 5, 150, 70, 14, '#ffffff');
}, KO_HITS.flatMap(h => [[h, 'hit', 0.8], [h, 'zap', 0.3]]).concat([[2.8, 'bigHit'], [3.3, 'thud']]));

// 18. "Consecutive" effect: the whole beatdown rewinds
shot(3, (lt, T) => {
  if (lt < 2.3) {
    KO.draw(Math.max(0.3, 5 - lt * 2.1), T);
    desat(0.5); tint('#3a60c0', 0.3);
    screen();
    for (let i = 0; i < 3; i++) { const y = frac(lt * 0.9 + i / 3) * H; rect(0, y, W, 3 + i, 'rgba(255,255,255,0.18)'); }
    for (let y = 0; y < H; y += 3) rect(0, y, W, 0.6, 'rgba(0,0,0,0.25)');
    txt('◀◀ REWIND', 14, 20, 7, '#ffffff', { align: 'left' });
  } else {
    drawDomain(lt + 20, { fever: true, reels: [{ val: '7', hot: true }, { val: '7', hot: true }, { val: '7', hot: true }] });
    screenCam(); applyCam();
    aura(192, 172, 90, lt, PAL.hakari.aura, 30, 30, 1);
    drawSide(kStance(140, 172, 1, lt, { sc: 2.4, head: 0.2 }), KS);
    drawSide(P(192, 172, -1, { sc: 2.4, armF: 0.15, armB: 0.15, extF: -1, extB: -1, grin: 1 }), HK);
    heal(192, 150, lt, 1);
  }
  jslam(lt, '連チャン', 0.3, 3, W / 2, 50, 28, '#ffd24a', { strokeCol: '#c02070' });
  slam(lt, 'CONSECUTIVE EFFECT: DAMAGE REVERTED', 0.5, 3, W / 2, 150, 7, '#ffffff', { strokeCol: '#c02070' });
  if (between(lt, 2.3, 2.36)) flash('#ffffff');
}, [[0, 'rewind', 2.2], [2.3, 'jackpot']]);

// ======================= CH.188: THE SHIPPING YARD =======================
// 19. Brutal high-speed clash, then a bolt to Hakari's head
const YX = 120;
const YH = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4];
function yard(lt) {
  const lq = q12(lt), c = YX + Math.sin(Math.min(lq, 2.7) * 1.4) * 20;
  const h = stance(c + 14, 0, -1, lq, { charges: 2 }), k = kStance(c - 16, 0, 1, lq, { charged: true });
  const i = YH.findIndex(t0 => between(lq, t0 - 0.1, t0 + 0.12));
  if (i >= 0) {
    if (i % 2) Object.assign(h, { armF: -Math.PI / 2, extF: 4, rot: -0.2 }), Object.assign(k, { rot: -0.25, head: -0.4 });
    else Object.assign(k, { armF: -Math.PI / 2, extF: 3, staffRot: 0, rot: 0.2 }), Object.assign(h, { rot: 0.25, head: 0.3 });
  }
  if (lq >= 3.1) { Object.assign(k, { armF: -2.1, staffRot: 0.4, rot: 0.1 }); if (lq > 3.25) Object.assign(h, { rot: 0.45, head: 0.6, armF: 0.8, armB: 1.0, x: h.x + 6 }); }
  return { h, k, c };
}
shot(5, (lt, T) => {
  const { c } = yard(lt), sh = shakeOf(lt, YH.map(t0 => [t0, 0.15, 3]).concat([[3.25, 0.6, 7]]));
  let z = 2.4, r = Math.sin(lt * 2.5) * 0.05, y = -24;
  if (between(lt, 1.2, 2.1)) { z = 3.1; y = -16; r = 0.1; }
  if (lt > 3.0) { z = 2.2; r = -0.04; }
  setCam(c, y, z, r, sh); drawHarbor(T);
  if (lt < 2.7) streaks(lt, { n: 24, speed: 800, alpha: 0.2, dir: Math.floor(lt * 3) % 2 ? 1 : -1 });
  applyCam();
  if (lt < 2.7) { ghosts(KS, t => yard(t).k, lt, 2, 0.04, '#6fd8ff', 0.4); ghosts(HK, t => yard(t).h, lt, 2, 0.04, '#ff4fb0', 0.4); }
  const { h, k } = yard(lt);
  aura(h.x, 0, 36, lt, PAL.hakari.aura, 14, 10, 0.6);
  drawSide(k, KS); drawSide(h, HK);
  YH.forEach(t0 => hitFx(lt - t0, yard(t0).c, -26, { s: 1.1, elec: 1 }));
  if (between(lt, 3.2, 3.55)) bentBolt(c - 4, -60, h.x - 2, -34, -30, lt, 5);
  if (lt > 3.4) heal(h.x, 0, lt, seg(lt, 3.6, 4.2));
  hitFx(lt - 3.25, h.x - 2, -34, { s: 2, elec: 1, ring: '#8ff0ff' });
  postHit(lt - 3.25, { chroma: 5, col: '#40a0ff' });
  YH.forEach(t0 => { if (between(lt, t0, t0 + 0.03)) flash('#ffffff', 0.4); });
}, YH.map(t0 => [t0, 'hit', 0.7]).concat([[3.1, 'charge', 0.15, 400, 2000, 0.2], [3.25, 'thunderZap'], [3.26, 'bigHit'], [3.8, 'heal']]));

// 20. Final 8 seconds: Hakari goes all out; the staff goes through his stomach
function last8(lt) {
  const lq = q12(lt), h = stance(YX + 16, 0, -1, lq, { charges: 3 }), k = kStance(YX - 14, 0, 1, lq, { charged: true });
  if (lq < 2.3) {
    const a = Math.floor(lq * 10) % 2;
    Object.assign(h, a ? { armF: -Math.PI / 2, extF: 4, rot: -0.2 } : { armB: -Math.PI / 2, extB: 4, rot: -0.15 });
    Object.assign(k, { armF: -2.3, staffRot: 1.4, rot: -0.15, x: k.x - lq * 5 });
  } else {
    Object.assign(k, { x: YX - 2, armF: -Math.PI / 2, extF: 5, staffRot: 0, rot: 0.25, legF: -0.7, legB: 0.7 });
    Object.assign(h, { x: YX + 16, rot: 0.3, head: 0.4, armF: 0.5, armB: 0.9, hole: lq > 2.45 });
  }
  return { h, k };
}
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[0, 2.3, 1.5], [2.4, 0.8, 8]]);
  setCam(YX, -24, lt < 2.4 ? 2.6 : lerp(3.4, 2.8, seg(lt, 2.4, 4)), lt < 2.4 ? 0.04 : -0.06, sh); drawHarbor(T);
  if (lt < 2.3) focusLines(W / 2, H / 2, lt, { n: 50, inner: 70, color: 'rgba(255,160,220,0.35)' });
  applyCam();
  if (lt < 2.3) ghosts(HK, t => last8(t).h, lt, 4, 0.03, '#ff4fb0', 0.5);
  const { h, k } = last8(lt);
  aura(h.x, 0, 40, lt, PAL.hakari.aura, 26, 14, 1);
  drawSide(k, KS); drawSide(h, HK);
  if (lt < 2.3) for (let i = 0; i < 5; i++) hitFx(frac(lt * 5 + i * 0.2) * 0.2, YX + (hash(i) - 0.5) * 10, -30 + hash(i * 3) * 10, { s: 0.8, n: 6 });
  if (between(lt, 2.4, 3.4)) { applyCam(); sparkBolts(YX + 16, -16, lt, 7, 40, ['#8ff0ff', '#ffffff'], 1.8); glow(YX + 16, -16, 30, '#6fd8ff', 0.8 * (1 - seg(lt, 2.4, 3.4))); }
  postHit(lt - 2.4, { chroma: 6, col: '#2080ff', imp: 0.14 });
  slam(lt, 'FINAL 8 SECONDS', 0.1, 1.2, W / 2, 30, 10, '#ff5555', { jitter: 1 });
}, [[0, 'riser', 2.3, 0.4], [0.2, 'hit', 0.5], [0.6, 'hit', 0.5], [1.0, 'hit', 0.6], [1.4, 'hit', 0.6], [1.8, 'hit', 0.7], [2.4, 'thunderZap'], [2.4, 'bigHit']]);

// ======================= CH.188-189: ONE MORE SPIN =======================
// 21. One in two hundred thirty-nine
shot(4, (lt, T) => {
  setCam(YX + 16, -26, 3.2, 0, shakeOf(lt, [[3.4, 0.6, 4]])); drawHarbor(T);
  applyCam();
  drawSide(kStance(YX - 30, 0, 1, lt, { charged: true, head: 0.1 }), KS);
  const kneel = 1 - easeOut(seg(lt, 1.8, 2.6));
  drawFront({ x: YX + 16, y: kneel * 8, sc: 1.1, rot: 0.1 * kneel, armL: lerp(0.4, SIGN[0], seg(lt, 1.8, 2.4)), armR: lerp(-0.2, SIGN[1], seg(lt, 1.8, 2.4)), sign: lt > 2.4 }, HK, { grin: seg(lt, 2.2, 2.6), open: 1 });
  applyCam(); circle(YX + 16, -15, 2.4, '#5a0010');
  slam(lt, '1 / 239', 0.6, 3.2, 70, 60, 20, '#8ff0ff', { strokeCol: '#06205a', jitter: 1 });
  jslam(lt, '領域展開', 2.6, 4, W / 2, 30, 22, '#ffffff');
  if (lt > 3.5) flash('#ff9ad8', seg(lt, 3.5, 4));
}, [[0.2, 'heart'], [1.0, 'heart'], [2.6, 'hit', 0.7], [2.8, 'riser', 1.2, 0.5]], [[0.6, '<Kashimo> one in 239. you won\'t hit it twice.', '#ffffff']]);

// 22. Jackpot again: faster spins, a hidden probability heals the fatal wound
shot(4, (lt) => {
  const st = [0.5, 0.8, 1.2], val = '3';
  const reels = st.map((s, i) => (lt < s ? { spin: true } : { val, stopT: s, hot: true }));
  drawDomain(lt * 2 + 30, { reels, fever: lt > 1.3 });
  screenCam(shakeOf(lt, [[1.3, 0.6, 5]])); applyCam();
  if (lt > 1.3) {
    const hk = seg(lt, 1.8, 2.8);
    aura(W / 2, 205, 140, lt, PAL.hakari.aura, 60, 140, 1);
    drawFront({ x: W / 2, y: 205, sc: 3.0, armL: 0.3, armR: -0.3 }, HK, { grin: 1, glow: 1 });
    applyCam(); if (hk < 1) { circle(W / 2, 205 - 15 * 3, 7 * (1 - hk), '#5a0010'); }
    heal(W / 2, 170, lt, 1 - seg(lt, 3.2, 4));
  }
  slam(lt, 'JACKPOT!!', 1.3, 4, W / 2, 34, 20, '#ffffff', { strokeCol: '#ff2080', jitter: 2 });
  slam(lt, 'HIDDEN PROBABILITY: THE FATAL WOUND HEALS', 1.9, 4, W / 2, 162, 6, '#aaffcc', { strokeCol: '#0a3a1a' });
  if (between(lt, 1.3, 1.36)) flash('#ffffff');
}, [[0, 'reel', 1.2], [0.5, 'stopReel'], [0.8, 'stopReel'], [1.2, 'stopReel'], [1.3, 'jackpot'], [1.9, 'heal']]);

// 23. Hakari drags the domain barrier out over the sea
shot(4, (lt, T) => {
  setCam(430, -60, 0.8, 0, shakeOf(lt, [[2.5, 0.5, 3]])); drawHarbor(T);
  water(400, T);
  applyCam();
  const bx = lerp(260, 540, easeInOut(seg(lt, 0.2, 2.0)));
  ctx.fillStyle = rgba('#ff4fb0', 0.12); ctx.beginPath(); ctx.arc(bx, 0, 150, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = rgba('#ffb0e0', 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, 0, 150, Math.PI, 0); ctx.stroke();
  for (let i = 0; i < 20; i++) { const a = Math.PI + (i / 20) * Math.PI; rect(bx + Math.cos(a) * 150, Math.sin(a) * 150, 2, 2, Math.floor(lt * 8 + i) % 2 ? '#ffd24a' : '#ff4fb0'); }
  const fall = easeIn(seg(lt, 1.6, 2.5));
  const hx = lerp(380, 460, seg(lt, 1.2, 2.5)), kx = lerp(360, 440, seg(lt, 1.2, 2.5));
  if (lt < 2.5) {
    drawSide(P(hx, fall * 30 - Math.sin(seg(lt, 1.2, 2.5) * Math.PI) * 30, -1, { rot: -0.4, armF: -Math.PI / 2, extF: 4 }), HK);
    drawSide(flyBack(kx, fall * 30 - Math.sin(seg(lt, 1.2, 2.5) * Math.PI) * 26, 1, -lt * 3, { staff: 1 }), KS);
  }
  const d = lt - 2.5;
  burst(d, 1.2, 450, 0, 40, 77, { sp: 60, up: 140, g: 300, colors: ['#dff4ff', '#9ac0e8', '#ffffff'], size: 3, flat: 0.4 });
  ring(450, 1, seg(d, 0, 1) * 60, 1.5 * (1 - seg(d, 0, 1)), rgba('#ffffff', 1 - seg(d, 0, 1)), 0.15);
  caption(lt, 'HAKARI SHIFTS THE BARRIER OVER THE SEA', 0.3, 4, 26);
}, [[0.2, 'hum', 2, 110, 0.2], [1.2, 'hit', 0.8], [1.3, 'whoosh', 1.0, 0.4], [2.5, 'splash']]);

// ======================= CH.189: UNDERWATER =======================
// 24. In water, Kashimo's current spreads everywhere, including back into him
shot(5, (lt) => {
  drawUnderwater(lt);
  screenCam(shakeOf(lt, [[2.6, 0.5, 4]])); applyCam();
  const bob = Math.sin(lt * 2) * 2, sink = easeOut(seg(lt, 2.6, 3.6)) * 30;
  const kp = kStance(110, 130 + bob + sink, 1, lt, { sc: 2.2, charged: true, rot: 0.15 + sink * 0.01, legF: 0.3, legB: -0.2 });
  const hp = lt < 2.4 ? P(200, 120 - bob, -1, { sc: 2.2, armF: -1.0, armB: 0.6, legF: 0.4, legB: -0.3, rot: -0.1 }) : P(165, 120 - bob, -1, { sc: 2.2, armF: -Math.PI / 2, extF: 4, rot: -0.3, legF: 0.5 });
  aura(hp.x, hp.y, 70, lt, PAL.hakari.aura, 20, 24, 0.6);
  drawSide(kp, KS); drawSide(hp, HK);
  if (lt < 2.6) {
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 10; i++) { const a = hash(i + Math.floor(lt * 10)) * TAU, l = 40 + hash(i * 3 + Math.floor(lt * 10)) * 100; bolt(110, 100, 110 + Math.cos(a) * l, 100 + Math.sin(a) * l, i + Math.floor(lt * 20), 6, 10, 1, '#8ff0ff'); }
    ctx.globalAlpha = 1; sparks(110, 130, 70, lt, '#ffffff', 3);
  }
  const d = lt - 2.6; for (let i = 0; i < 3; i++) { const k = seg(d, i * 0.1, 0.8 + i * 0.1); ring(140, 100, k * 80, 2 * (1 - k), rgba('#dff4ff', 1 - k)); }
  burst(d, 1.2, 140, 100, 20, 5, { sp: 60, up: 30, colors: ['rgba(220,245,255,0.8)'], size: 3, round: true });
  caption(lt, 'UNDERWATER, HIS CURRENT HAS NOWHERE TO GO', 0.4, 2.6, 22);
  if (between(lt, 2.6, 2.63)) flash('#ffffff', 0.5);
}, [[0, 'muffled', 5], [0.2, 'zap', 0.5], [0.9, 'zap', 0.5], [1.6, 'zap', 0.5], [0, 'bubbles', 5], [2.6, 'hit', 0.8]]);

// 25. Electrolysis: chlorine gas
shot(4, (lt) => {
  const cl = seg(lt, 0.6, 2.4);
  drawUnderwater(lt + 5, { chlorine: cl, cx: 150, cy: 120 });
  tint('#8aff3a', 0.12 * cl);
  screenCam(); applyCam();
  const sink = easeIn(seg(lt, 2.2, 4)) * 30;
  drawSide(kStance(100, 160, 1, lt, { sc: 2.2, armF: -1.4, staffRot: 1.0, legF: 0.3, legB: -0.2 }), KS);
  const choke = seg(lt, 1.4, 2.2);
  drawSide(P(200, 120 + sink, -1, { sc: 2.2, armF: lerp(-1.0, -2.6, choke), armB: lerp(0.6, -2.4, choke), rot: sink * 0.03, head: choke * 0.3, legF: 0.4 }), HK);
  applyCam(); for (let i = 0; i < 8; i++) { const ph = frac(lt * 1.5 + i / 8); circle(100 + 26 + Math.sin(i) * 3, 115 - ph * 40, 1 + ph, rgba('#b8ff6a', 0.6 * (1 - ph))); }
  slam(lt, 'ELECTROLYSIS', 0.5, 2.6, W / 2, 22, 11, '#b8ff6a', { strokeCol: '#0a2a0a' });
  slam(lt, 'SEAWATER -> CHLORINE GAS', 0.8, 2.6, W / 2, 40, 6, '#ffffff', { strokeCol: '#0a2a0a' });
}, [[0, 'muffled', 4], [0.5, 'bubbles', 3], [1.4, 'heart'], [2.4, 'heart']]);

// 26. Hakari's eyes snap open; auto RCT purges the poison. With 5 seconds left: attack.
shot(3.5, (lt) => {
  if (lt < 1.8) {
    drawUnderwater(lt + 9, { chlorine: 0.4 * (1 - seg(lt, 0.9, 1.6)), cx: W / 2, cy: H / 2 });
    const open = easeOut(seg(lt, 0.7, 0.85)), s = 10 + lt * 0.5;
    screen(); drawFace(HK, W / 2 - 4 * s, H / 2 - 4 * s + 18, s, { open, grin: seg(lt, 1.2, 1.5), glow: open });
    screen(); for (let i = 0; i < 10; i++) { const d = lt - 1.0 - i * 0.04; if (d < 0) continue; circle(W / 2 + (hash(i) - 0.5) * 20, H / 2 + 30 - d * 90, 2 + hash(i) * 3, 'rgba(220,245,255,0.7)'); }
    if (between(lt, 1.0, 1.8)) { screen(); heal(W / 2, H / 2 + 60, lt, 1); }
    slam(lt, 'AUTO RCT PURGES THE TOXIN', 1.1, 1.8, W / 2, 160, 7, '#aaffcc', { strokeCol: '#0a3a1a' });
    vignette(0.6);
    return;
  }
  drawUnderwater(lt + 9);
  const d = lt - 1.8;
  screenCam(shakeOf(d, [[0.3, 0.5, 5]])); applyCam();
  drawSide(d < 0.3 ? kStance(120, 150, 1, lt, { sc: 2.2 }) : P(112, 152, 1, { sc: 2.2, rot: -0.3, head: -0.5, armF: 0.6, armB: 1.0, staff: 1 }), KS);
  drawSide(d < 0.2 ? P(190, 140, -1, { sc: 2.2, armB: 1.0, rot: 0.1 }) : P(178, 140, -1, { sc: 2.2, noArmB: false, armB: -Math.PI / 2, extB: 4, rot: -0.25 }), HK);
  for (let i = 0; i < 3; i++) { const k = seg(d, 0.3 + i * 0.08, 1.0 + i * 0.08); ring(130, 110, k * 70, 2.5 * (1 - k), rgba('#dff4ff', 1 - k)); }
  postHit(d - 0.3, { imp: 0.07 });
}, [[0, 'muffled', 3.5], [0.7, 'ting', 0.25], [1.0, 'bubbles', 0.8], [1.1, 'heal'], [2.1, 'hit', 0.9]], [[2.3, '<Hakari> come on!!', '#ffffff']]);

// 27. Kashimo grabs his arm and releases everything: steam explosion
shot(3, (lt, T) => {
  if (lt < 0.8) {
    drawUnderwater(lt + 13);
    screenCam(shakeOf(lt, [[0.3, 0.5, 3]])); applyCam();
    drawSide(P(130, 150, 1, { sc: 2.2, armF: -Math.PI / 2, extF: 3, rot: 0.1, grin: 1 }), KS);
    drawSide(P(170, 140, -1, { sc: 2.2, armB: -Math.PI / 2, extB: 3, rot: -0.1 }), HK);
    glow(150, 110, 40 + lt * 200, '#bff8ff', seg(lt, 0.2, 0.8));
    sparkBolts(150, 110, lt, 8, 30 + lt * 90, ['#ffffff', '#8ff0ff'], 1.5);
    slam(lt, 'ALL OF IT, AT ONCE', 0.2, 0.8, W / 2, 30, 9, '#8ff0ff', { strokeCol: '#06205a' });
    return;
  }
  const d = lt - 0.8;
  setCam(520, -80, 0.7, 0, shakeOf(d, [[0, 1.6, 7]])); drawHarbor(97);
  water(-2000, 97);
  applyCam();
  const hgt = easeOut(seg(d, 0, 1.2)) * 260;
  for (let i = 0; i < 60; i++) { const y = -hash(i * 3) * hgt, x = 520 + (hash(i) - 0.5) * (50 + (-y) * 0.5); circle(x, y, 10 + hash(i * 5) * 20 * (1 + d), rgba('#f0f4f8', 0.8)); }
  ring(520, 0, d * 400, 3 * (1 - seg(d, 0, 1.5)), rgba('#ffffff', 1 - seg(d, 0, 1.5)), 0.12);
  burst(d, 2, 520, -20, 60, 9, { sp: 160, up: 260, g: 260, colors: ['#dff4ff', '#ffffff'], size: 3 });
  flash('#ffffff', 1 - seg(d, 0, 0.5));
}, [[0, 'charge', 0.8, 80, 1600, 0.3], [0.8, 'steam']]);

// ======================= CH.190: NO WINNER =======================
// 28. Dawn over the steam; Hakari surfaces, still alive
shot(4, (lt, T) => {
  setCam(560, -30, 2.0, 0); drawHarbor(T);
  water(-2000, T);
  applyCam();
  for (let i = 0; i < 12; i++) { const x = 480 + hash(i) * 160, y = -10 - frac(hash(i * 3) + lt * 0.1) * 60; circle(x, y, 12 + hash(i) * 10, rgba('#e8e0e8', 0.3)); }
  container(540, -12, 44, 16, '#d8892a');
  drawSide(kStance(560, -12, 1, lt, { head: 0.3, rot: 0.05 }), KS);
  const up = easeOut(seg(lt, 1.8, 2.4));
  if (lt > 1.8) {
    ctx.save(); ctx.beginPath(); ctx.rect(560, -200, 200, 200); ctx.clip();
    drawSide(P(602, lerp(40, 22, up), -1, { armF: -0.3, armB: 0.3, grin: 1 }), HK); ctx.restore();
    const d = lt - 1.8; ring(602, 0, d * 30, 1.2 * (1 - seg(d, 0, 1)), rgba('#ffffff', 1 - seg(d, 0, 1)), 0.2);
    burst(d, 1, 602, 0, 16, 3, { sp: 30, up: 60, g: 200, colors: ['#dff4ff'], size: 2 });
  }
  letterbox(16);
}, [[0, 'wind', 4, 0.2], [1.8, 'splash', 0.5]], [[2.5, '<Kashimo> ...you\'re STILL alive?!', '#ffffff']]);

// 29. The binding vow: Hakari gives up his left arm
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[0.8, 0.3, 4], [1.9, 0.6, 7]]);
  setCam(372, -26, 2.4, 0.02, sh); drawHarbor(T);
  water(400, T);
  applyCam();
  const vow = lt > 0.8;
  aura(392, 0, 40, lt, PAL.hakari.aura, vow ? 36 : 16, 14, vow ? 1 : 0.5);
  const kp = lt < 0.8 ? kStance(lerp(320, 360, easeIn(seg(lt, 0.3, 0.8))), 0, 1, lt, { armF: -1.3, staffRot: -1.2, rot: 0.2, charged: true })
    : lt < 1.9 ? kStance(360, 0, 1, lt, { charged: true }) : flyBack(lerp(360, 330, easeOut(seg(lt, 1.9, 2.5))), -Math.sin(seg(lt, 1.9, 2.5) * Math.PI) * 10, 1, -0.4, { staff: 1 });
  drawSide(kp, KS);
  drawSide(lt < 1.8 ? stance(392, 0, -1, lt, { noArmB: vow }) : P(388, 0, -1, { armF: -Math.PI / 2, extF: 4, rot: -0.25, noArmB: true, grin: 1 }), HK);
  if (vow) { const d = lt - 0.8; ctx.save(); ctx.translate(394 + d * 30, -24 - d * 40 + d * d * 50); ctx.rotate(d * 8); ctx.globalAlpha = 1 - seg(d, 1, 1.4); rect(-2, -6, 4, 12, PAL.hakari.topD); rect(-2, 3, 4, 3, PAL.hakari.skin); ctx.restore(); ctx.globalAlpha = 1; }
  slash(372, -45, 405, -10, seg(lt, 0.75, 1.05), { w: 2.5, glow: '#4fc8ff' });
  hitFx(lt - 1.9, 372, -30, { s: 1.8, ring: '#ff9ad8' });
  postHit(lt - 1.9, { chroma: 4, col: '#ff2080' });
  slam(lt, 'BINDING VOW', 0.9, 2.6, W / 2, 26, 12, '#ff9ad8', { strokeCol: '#3a0626' });
  slam(lt, 'LEFT ARM FORFEIT: ITS CURSED ENERGY GOES TO THE BODY', 1.1, 2.6, W / 2, 160, 5, '#ffffff', { strokeCol: '#3a0626' });
}, [[0.3, 'whoosh', 0.3, 0.5], [0.8, 'sever'], [0.9, 'hum', 1, 110, 0.3], [1.9, 'bigHit']]);

// 30. Kashimo on his back: he never used his technique
shot(5, (lt, T) => {
  setCam(362, -18, lerp(2.2, 2.6, lt / 5)); drawHarbor(T);
  water(400, T);
  applyCam();
  drawSide(lying(335, 1, { staff: 0, head: 0.1 }), KS);
  drawSide(P(380, 0, -1, { armF: 0.2, noArmB: true, head: 0.2, grin: 0 }), HK);
  ctx.save(); ctx.translate(318, -2); rect(-19, -0.9, 38, 1.8, '#3a2616'); ctx.restore();
  letterbox(16);
}, [[0, 'wind', 5, 0.2]], [[0.2, '<Kashimo> never used my technique. saving it for Sukuna.', '#ffffff'], [2.0, '<Kashimo> ...so go on. kill me.', '#ffffff'], [3.4, '<Hakari> nah. your 100 points would vanish.', '#ffffff']]);

// 31. The deal
shot(5, (lt, T) => {
  setCam(362, -22, lerp(2.3, 2.0, lt / 5)); drawHarbor(T);
  water(400, T);
  applyCam();
  const sit = easeOut(seg(lt, 2.6, 3.4));
  if (sit < 1) drawSide(lying(335, 1, { head: 0.1 }), KS);
  if (sit > 0) drawSide(P(345, lerp(14, 0, sit), 1, { rot: lerp(-Math.PI / 2, 0, sit), armF: lerp(-2.9, -Math.PI / 2, sit), grin: sit > 0.9 }), KS);
  drawSide(P(372, 0, -1, { armF: lerp(0.2, -Math.PI / 2 + 0.3, easeOut(seg(lt, 0.4, 0.9))), noArmB: true, grin: 1, rot: -0.1 }), HK);
  letterbox(16);
}, [[0, 'wind', 5, 0.2]], [[0.2, '<Hakari> I\'ll get you your fight with Sukuna.', '#ffffff'], [1.8, '<Hakari> in exchange, you\'re on our side.', '#ffffff'], [3.4, '<Kashimo> ...deal.', '#ffffff']]);

// 32. End card
shot(5, (lt) => {
  screen(); rect(0, 0, W, H, '#000');
  const a = k => ctx.globalAlpha = seg(lt, k, k + 0.5);
  a(0.2); txt('HAKARI vs KASHIMO', W / 2, 48, 12, '#ff9ad8', { stroke: 2 });
  a(0.8); txt('RESULT: NO WINNER - A DEAL', W / 2, 74, 7, '#ffffff');
  a(1.4); txt('Kashimo never used Mythical Beast Amber:', W / 2, 96, 4, '#8ff0ff');
  txt('he is saving his technique for Sukuna.', W / 2, 104, 4, '#8ff0ff');
  a(2.0); txt('NEXT: KASHIMO vs SUKUNA', W / 2, 126, 7, '#ffd24a');
  a(2.6); txt('fan animation based on Jujutsu Kaisen ch. 185-190 - made with pure JavaScript', W / 2, 160, 3.4, '#8a8aa0');
  ctx.globalAlpha = 1;
}, [[0.2, 'gong'], [2.0, 'jackpot']]);
