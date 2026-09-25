// Storyboard: Yuji & Todo (Boogie Woogie, vibraslap) vs Heian-era Sukuna.
'use strict';
const SHOTS = [];
const shot = (d, draw, sfx = [], chatLines = []) => { const s = { d, draw, sfx, chat: chatLines }; SHOTS.push(s); return s; };

// ---------- helpers ----------
function screenCam(sh = [0, 0], z = 1, cx = W / 2, cy = H / 2, r = 0) { setCam(cx, cy, z, r, sh); }
function hitFx(dt, x, y, o = {}) {
  if (dt < 0 || dt > 0.6) return;
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
  ring(x, y, (4 + k * 30) * s, 2.5 * (1 - k) * s, rgba(o.ring || '#ffffff', 1 - k), 0.7);
  burst(dt, 0.5, x, y, 18, Math.floor(x * 3 + y), { sp: 140 * s, colors: o.colors || SPARK, size: 1.6 * s, drag: 3 });
  if (o.bf && dt < 0.5) { ctx.globalAlpha = 1 - dt / 0.5; sparkBolts(x, y, dt, 6, 40 * s, ['#ff1a3c', '#000000'], 2); ctx.globalAlpha = 1; }
}
function postHit(dt, o = {}) {
  if (dt < 0 || dt > 0.6) return;
  if (dt < 0.035) flash('#ffffff');
  else if (dt < (o.imp ?? 0.1)) impactFrame(o.col);
  if (o.chroma && dt < 0.5) chroma(o.chroma * (1 - dt / 0.5) * (Math.floor(dt * 24) % 2 ? 1 : -1));
}
function bgGrad(c1, c2) { screen(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
const CLAP = (lt, t0, x = W / 2, y = 150) => jslam(lt, 'パン!', t0, t0 + 0.5, x, y, 14, '#ffd24a', { strokeCol: '#3a2a00', pop: 1.6 });

// ---------- poses ----------
const POSES = {
  stance: (p, t) => Object.assign(p, { armF: -1.2 + Math.sin(t * 4) * 0.06, armB: -0.8, legF: -0.35, legB: 0.35 }),
  punch: p => Object.assign(p, { armF: -Math.PI / 2, extF: 4, armB: 0.9, rot: 0.15 * p.f, legF: -0.6, legB: 0.6 }),
  wind: p => Object.assign(p, { armF: 1.0, armB: -0.9, rot: -0.12 * p.f, legF: -0.4, legB: 0.4 }),
  kick: p => Object.assign(p, { legF: -1.7, rot: -0.35 * p.f, armF: -1.0, armB: 0.8 }),
  upper: p => Object.assign(p, { armF: -2.8, extF: 3, rot: -0.15 * p.f, legF: -0.5, legB: 0.6 }),
  hurt: p => Object.assign(p, { rot: -0.35 * p.f, head: -0.45, armF: 0.5, armB: 0.9, legF: 0.3, legB: -0.2 }),
  fly: (p, t) => Object.assign(p, { armF: -2.6, armB: -2.9, legF: 0.6, legB: -0.4, rot: -t * 8 * p.f, head: -0.3 }),
  throw: p => Object.assign(p, { armF: -2.2, extF: 2, armB: 0.8, rot: 0.1 * p.f, legF: -0.5, legB: 0.5 }),
  slap: (p, t) => Object.assign(p, { armF: -2.4, armB: -1.8, extB: 1, slapRot: Math.sin(t * 40) * 0.3, grin: 1 }),
  air: p => Object.assign(p, { armF: -1.4, armB: 0.6, legF: -0.9, legB: 0.5, rot: 0.1 * p.f }),
  cast: p => Object.assign(p, { armF: -1.6, armF2: -1.1, armB: -1.4, armB2: -0.9, extF: 2, grin: 1 }),
  guard: p => Object.assign(p, { armF: -2.3, armB: -2.0, armF2: -1.8, armB2: -1.6, rot: -0.05 * p.f }),
  slash: (p, t) => Object.assign(p, { armF: Math.floor(t * 8) % 2 ? -2.5 : -0.4, armF2: Math.floor(t * 8) % 2 ? -0.5 : -2.2, armB: -1.2, armB2: -0.8, legF: -0.4, legB: 0.4 }),
  kneel: p => Object.assign(p, { legF: -1.5, legB: 1.2, rot: 0.1 * p.f, armF: 0.3, armB: 0.6, head: 0.2, y: p.y + 5 }),
};

// ---------- the Boogie Woogie scene system ----------
// base: {name: [x, y]}; swaps: [[t, A, B]]; motion(name, since, n, anc, lt) -> [dx, dy] | null
function resolve(lt, cfg) {
  const anc = {};
  for (const k in cfg.base) anc[k] = { x: cfg.base[k][0], y: cfg.base[k][1], t0: 0, n: 0 };
  const cur = (k, t) => {
    const a = anc[k], since = t - a.t0;
    let off = cfg.motion ? cfg.motion(k, since, a.n, a, t) : null;
    if (!off) off = [0, a.y < 0 ? Math.min(-a.y, 160 * since * since) : 0];
    return [a.x + off[0], a.y + off[1]];
  };
  for (const [t, A, B] of cfg.swaps || []) {
    if (lt < t) break;
    const pa = cur(A, t), pb = cur(B, t);
    anc[A] = { x: pb[0], y: pb[1], t0: t, n: anc[A].n + 1 };
    anc[B] = { x: pa[0], y: pa[1], t0: t, n: anc[B].n + 1 };
  }
  const out = {}; for (const k in anc) out[k] = cur(k, lt);
  return out;
}
function poseOf(name, lt, cfg) {
  let pn = name === 'R' ? null : 'stance';
  for (const [a, b, who, what] of cfg.acts || []) if (who === name && lt >= a && lt < b) pn = what;
  return pn;
}
function drawScene(lt, T, cfg) {
  const pos = resolve(lt, cfg), S = pos.S;
  const face = (x, tgt) => (tgt >= x ? 1 : -1);
  const lq = cfg.twos === false ? lt : q12(lt);
  const cm = cfg.cam ? cfg.cam(lt, pos) : [((pos.Y || S)[0] + S[0]) / 2, -30, 2.0, 0];
  const sh = shakeOf(lt, (cfg.hits || []).map(([t, , , s]) => [t, 0.25, 2.5 * (s || 1)]).concat((cfg.swaps || []).map(([t]) => [t, 0.15, 1.5])).concat(cfg.shake || []));
  setCam(cm[0], cm[1], cm[2], cm[3] || 0, sh); drawCity(T);
  if (cfg.speed) streaks(lt, { n: 30, speed: 900, alpha: 0.2, dir: Math.floor(lt * 2) % 2 ? 1 : -1 });
  applyCam();
  if (cfg.under) cfg.under(lt, pos);
  const order = ['R', 'R2', 'T', 'S', 'Y'];
  for (const k of order) {
    if (!pos[k]) continue;
    const [x, y] = pos[k], pn = poseOf(k, lt, cfg);
    if (k === 'R' || k === 'R2') {
      ctx.save(); ctx.translate(x, y - 5); ctx.rotate(lt * 6); ctx.drawImage(TX.concrete[k === 'R' ? 0 : 1], -5, -5, 10, 10); ctx.restore();
      continue;
    }
    const f = cfg.face && cfg.face[k] ? cfg.face[k] : k === 'S' ? face(x, (pos.Y || pos.T)[0]) : face(x, S[0]);
    const p = pose(x, y, f, { sc: k === 'T' ? 1.3 : k === 'S' ? 1.5 : 1.05 });
    const since = lt - Math.max(0, ...(cfg.acts || []).filter(a => a[2] === k && a[0] <= lt).map(a => a[0]));
    POSES[pn || 'stance'](p, pn === 'stance' ? lq : since);
    if (cfg.glow && cfg.glow(k, lt)) p.glow = cfg.glow(k, lt);
    if (k === 'S') { if (cfg.aura !== false) aura(x, y, 44, lt, '#ff3048', 16, 16, 0.6); drawHeian(p); }
    else { if (cfg.auraH) aura(x, y, 38, lt, HPAL[k === 'Y' ? 'yuji' : 'todo'].aura, 12, 12, 0.5); drawHero(p, k === 'Y' ? 'yuji' : 'todo'); }
    if (k === 'T' && pn === 'slap') slapWaves(since, x + f * 10, y - 42);
  }
  for (const [t, A, B] of cfg.swaps || []) {
    if (lt < t) continue;
    const p1 = resolve(t + 0.0001, cfg);
    swapFx(lt - t, p1[A][0], p1[A][1]); swapFx(lt - t, p1[B][0], p1[B][1]);
  }
  for (const [t, x, y, s, bf] of cfg.hits || []) hitFx(lt - t, x, y, { s: s || 1, bf, ring: bf ? '#ff1a3c' : '#ffffff' });
  if (cfg.over) cfg.over(lt, pos);
  for (const [t, , , s, bf] of cfg.hits || []) if ((s || 1) >= 1.6 || bf) postHit(lt - t, { chroma: bf ? 5 : 3, col: bf ? '#ff0020' : null });
  for (const [t] of cfg.swaps || []) if (between(lt, t, t + 0.03)) flash('#fff8d0', 0.45);
  for (const [t] of cfg.swaps || []) CLAP(lt, t, cfg.clapX ?? W / 2, cfg.clapY ?? 150);
}
const sfxFor = cfg => (cfg.swaps || []).map(([t]) => [t, 'swap']).concat((cfg.hits || []).map(([t, , , s, bf]) => [t, bf ? 'blackflash' : (s || 1) >= 1.6 ? 'bigHit' : 'hit', 0.8]),
  (cfg.acts || []).filter(a => a[3] === 'slap').map(a => [a[0], 'vibraslap']), (cfg.acts || []).filter(a => a[3] === 'punch' || a[3] === 'kick').map(a => [a[0] - 0.08, 'whoosh', 0.12, 0.3]));
function sceneShot(d, cfg, extraSfx = [], chat = []) { return shot(d, (lt, T) => drawScene(lt, T, cfg), sfxFor(cfg).concat(extraSfx), chat); }

// ======================= INTRO =======================
shot(4.5, (lt, T) => {
  const k = easeInOut(lt / 4.5);
  setCam(lerp(-360, -60, k), -110, 0.72 + 0.06 * k); drawCity(T);
  for (let i = 0; i < 40; i++) { screen(); const x = frac(hash(i) + lt * 0.02) * W, y = frac(hash(i * 3) + lt * 0.08) * H; rect(x, y, 1, 1, 'rgba(255,220,200,0.5)'); }
  screen();
  const s = 'SHINJUKU  -  THE DECISIVE BATTLE', n = Math.floor(seg(lt, 0.6, 1.8) * s.length), a = seg(lt, 0.6, 1.0) * (1 - seg(lt, 4.0, 4.45));
  ctx.globalAlpha = a; txt(s.slice(0, n), 14, 28, 6, '#ffffff', { align: 'left' }); rect(14, 34, 150 * seg(lt, 0.6, 1.8), 0.8, '#ff3048'); ctx.globalAlpha = 1;
  letterbox(16); flash('#000', 1 - seg(lt, 0, 0.9));
}, [[0, 'wind', 4.5, 0.3], [0.3, 'gong']]);

// Heian Sukuna reveal: pan up the four arms to both faces
shot(4, (lt) => {
  bgGrad('#120206', '#5a0a14');
  screen(); aura(W / 2, H + 20, 150, lt, '#ff3048', 40, 220, 1);
  const up = easeInOut(seg(lt, 0, 2.2)), s = 11;
  screenCam(shakeOf(lt, [[2.4, 0.5, 3]]), 2.6, W / 2, lerp(170, 90, up)); applyCam();
  drawHeian(pose(W / 2, 190, 1, { sc: 3.2, armF: -0.5, armF2: -0.2, armB: -0.4, armB2: -0.1, f: 1 }));
  screen();
  if (lt > 2.3) { const k = easeOutExpo(seg(lt, 2.3, 2.6)); heianFace(W / 2 - 4 * s, lerp(H, H / 2 - 4 * s + 14, k), s, { open: 1, grin: 1 }); }
  jslam(lt, '両面宿儺', 2.5, 4, 60, 30, 14, '#ffffff');
  slam(lt, 'TRUE FORM', 2.7, 4, 258, 160, 11, '#ff5060', { strokeCol: '#2a0006' });
  vignette(0.6); letterbox(16);
}, [[0, 'heart'], [0.8, 'heart'], [2.3, 'boom', 1.2, 0.6], [2.4, 'laugh']]);

// Todo arrives: vibraslap reveal
shot(4, (lt) => {
  bgGrad('#1a1206', '#6a4a1a');
  focusLines(W / 2, H / 2, lt, { n: 50, inner: 70, color: 'rgba(255,220,120,0.35)' });
  screenCam([0, 0], 4.2, W / 2 + 6, 95); applyCam();
  const raise = easeOutBack(seg(lt, 0.8, 1.2));
  const p = pose(W / 2, 128, 1, { sc: 1.3, armF: lerp(0.2, -2.4, raise), armB: 0.2, grin: 1 });
  if (lt > 1.4) POSES.slap(p, lt - 1.4);
  drawHero(p, 'todo');
  if (lt > 1.4) slapWaves(lt - 1.4, W / 2 + 10, 88);
  slam(lt, 'VIBRASLAP', 1.4, 4, W / 2, 30, 14, '#ffd24a', { strokeCol: '#3a2a00', jitter: 1 });
  jslam(lt, '東堂葵', 0.4, 4, 52, 150, 14, '#ffffff');
  vignette(0.5);
}, [[0.8, 'whoosh', 0.3, 0.4], [1.4, 'vibraslap']], [[2.2, '<Todo> my brother. shall we?', '#ffffff']]);

// Yuji: eyes open
shot(3, (lt) => {
  bgGrad('#040816', '#10306a');
  screen(); aura(W / 2, H + 20, 150, lt, '#4aa8ff', 40, 220, seg(lt, 1, 1.4));
  const s = 10 + lt * 0.4;
  heroFace('yuji', W / 2 - 4 * s, H / 2 - 4 * s + 20, s, { open: easeOut(seg(lt, 0.8, 1.0)) });
  jslam(lt, '虎杖悠仁', 1.1, 3, 262, 30, 14, '#ffffff');
  vignette(0.6); letterbox(16);
}, [[0.3, 'heart'], [0.9, 'ting', 0.25]]);

// VS card: three panels
shot(3.5, (lt) => {
  screen(); rect(0, 0, W, H, '#000');
  const kin = easeOutExpo(seg(lt, 0, 0.4)), sh = shakeOf(lt, [[0.7, 0.6, 5]]);
  const panels = [[0, 107, '#061a4a', '#2a6adf', 'yuji'], [107, 213, '#3a2a06', '#c89a2a', 'todo'], [213, 320, '#3a0610', '#c01a2a', 'heian']];
  panels.forEach(([a, b, c1, c2, who], i) => {
    const off = (1 - kin) * (i === 1 ? -200 : i === 0 ? -160 : 160);
    screen(); ctx.save(); ctx.translate(sh[0], sh[1] + (i === 1 ? off : 0)); ctx.beginPath(); ctx.rect(a + 1 + (i !== 1 ? off : 0), 0, b - a - 2, H); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(a, 0, b - a, H);
    const cx = (a + b) / 2 + (i !== 1 ? off : 0);
    if (who === 'heian') heianFace(cx - 28, 58, 7); else heroFace(who, cx - 28, 58, 7, { grin: who === 'todo' });
    ctx.restore();
  });
  slam(lt, 'YUJI', 0.4, 3.5, 53, 150, 11, '#bfe6ff', { strokeCol: '#06103a' });
  slam(lt, 'TODO', 0.5, 3.5, 160, 150, 11, '#ffe9a0', { strokeCol: '#3a2a00' });
  slam(lt, 'SUKUNA', 0.6, 3.5, 266, 150, 11, '#ffc0c8', { strokeCol: '#3a0610' });
  slam(lt, '&', 0.7, 3.5, 107, 96, 20, '#ffffff'); slam(lt, 'VS', 0.8, 3.5, 213, 96, 24, '#ffffff', { jitter: 2, pop: 2.2 });
  postHit(lt - 0.8, { chroma: 3, imp: 0.08 });
  if (lt > 3.3) flash('#fff', seg(lt, 3.3, 3.5));
}, [[0, 'whoosh', 0.4, 0.5], [0.8, 'bigHit'], [0.85, 'vibraslap']]);

// ======================= FIGHT =======================
// 1. Opening exchange: Yuji rushes in, Sukuna's four arms block everything
sceneShot(4, {
  base: { Y: [-60, 0], T: [-110, 0], S: [40, 0] }, speed: 1, auraH: 1,
  motion: (k, s, n, a, lt) => (k === 'Y' ? [Math.min(80, easeOut(seg(lt, 0, 0.5)) * 80) + Math.sin(lt * 6) * 3, 0] : null),
  acts: [[0.5, 0.75, 'Y', 'punch'], [0.5, 0.75, 'S', 'guard'], [0.9, 1.15, 'Y', 'kick'], [0.9, 1.15, 'S', 'guard'], [1.3, 1.55, 'Y', 'punch'], [1.3, 1.55, 'S', 'guard'],
    [1.7, 2.0, 'S', 'punch'], [1.7, 2.3, 'Y', 'hurt'], [2.3, 4, 'S', 'cast']],
  hits: [[0.6, 34, -30, 1], [1.0, 34, -20, 1], [1.4, 34, -32, 1], [1.8, 24, -30, 1.4]],
  cam: (lt, pos) => [(pos.Y[0] + pos.S[0]) / 2, -30, 2.3, Math.sin(lt * 2) * 0.04],
}, [], [[2.4, '<Sukuna> is that all, brat?', '#ffffff']]);

// 2. First swap: Sukuna's punch hits Todo's... no, empty air. Yuji is suddenly behind him.
sceneShot(4, {
  base: { Y: [20, 0], T: [80, 0], S: [44, 0] }, auraH: 1,
  swaps: [[1.0, 'Y', 'T']],
  acts: [[0, 1.0, 'T', 'slap'], [0.6, 1.2, 'S', 'wind'], [1.1, 1.4, 'S', 'punch'], [1.15, 1.45, 'Y', 'kick'], [1.45, 2.4, 'S', 'hurt'], [1.1, 2, 'T', 'guard' in POSES ? 'stance' : 'stance']],
  face: { Y: -1 },
  motion: (k, s, n, a, lt) => (k === 'S' && lt > 1.45 ? [-easeOut(seg(lt, 1.45, 2.2)) * 40, 0] : null),
  hits: [[1.3, 50, -18, 1.8]],
  cam: () => [44, -30, 2.4, 0.03],
  over: lt => { slam(lt, 'BOOGIE WOOGIE', 1.0, 3.5, W / 2, 30, 13, '#ffd24a', { strokeCol: '#3a2a00' }); jslam(lt, '不義遊戯', 1.2, 3.5, W / 2, 52, 11, '#ffffff'); },
}, [[0.6, 'whoosh', 0.3, 0.4]]);

// 3. Trickshot: Yuji throws rubble past Sukuna, swaps with it mid-air, and punches him from behind
sceneShot(6, {
  base: { Y: [-40, 0], T: [-120, 0], S: [20, 0], R: [-34, -26] }, auraH: 1,
  motion: (k, s, n, a, lt) => {
    if (k === 'R' && n === 0) return lt < 0.6 ? [0, 0] : [(lt - 0.6) * 170, -(lt - 0.6) * 60 + 60 * (lt - 0.6) * (lt - 0.6)];
    if (k === 'Y' && n > 0) return [0, Math.min(-a.y, 80 * s * s)];
    return null;
  },
  swaps: [[1.5, 'Y', 'R']],
  acts: [[0.3, 0.8, 'Y', 'throw'], [0.9, 1.5, 'S', 'cast'], [1.5, 2.1, 'Y', 'air'], [1.55, 1.8, 'S', 'stance'], [1.8, 2.1, 'Y', 'punch'], [1.9, 3.0, 'S', 'hurt'], [1.3, 1.6, 'T', 'slap']],
  face: { Y: -1 },
  hits: [[1.9, 26, -34, 2]],
  cam: (lt) => [lt < 1.4 ? lerp(-20, 10, lt / 1.4) : 30, -34, lt < 1.4 ? 2.0 : 2.6, 0],
  over: lt => { if (lt < 1.4) slam(lt, '?', 0.95, 1.4, 250, 50, 20, '#ff5060'); slam(lt, 'TRICKSHOT', 1.95, 4, W / 2, 30, 13, '#ffd24a', { strokeCol: '#3a2a00' }); },
}, [[0.35, 'whoosh', 0.3, 0.4]]);

// 4. Dismantle at Yuji: Todo swaps Sukuna into the path of his own slash
function ownSlash(lt) {
  applyCam();
  const d = lt - 1.0;
  if (d > 0 && d < 1.2) {
    const x = lerp(50, -130, easeIn(seg(d, 0, 0.5)));
    if (d < 0.5) slash(x + 6, -46, x - 6, -6, 0.45, { w: 4, bend: 0.3 });
  }
}
sceneShot(5, {
  base: { Y: [-60, 0], T: [-120, 0], S: [70, 0] }, auraH: 1,
  swaps: [[1.25, 'Y', 'S']],
  acts: [[0.4, 1.0, 'S', 'slash'], [0.9, 1.3, 'T', 'slap'], [1.4, 2.4, 'S', 'guard'], [2.4, 3.4, 'S', 'hurt'], [2.6, 5, 'Y', 'stance']],
  under: lt => ownSlash(lt),
  hits: [[1.42, -60, -26, 1.6]],
  cam: () => [-20, -34, 1.7, 0],
  over: lt => { slam(lt, 'DISMANTLE', 0.4, 1.2, W / 2, 30, 12, '#ffffff', { strokeCol: '#8a0010' }); slam(lt, 'HIS OWN SLASH', 1.5, 3.6, W / 2, 30, 11, '#ffd24a', { strokeCol: '#3a2a00' }); },
}, [[0.5, 'slash', 0.7], [1.0, 'slash', 0.9]], [[3.0, '<Sukuna> ...you little pests.', '#ffffff']]);

// 5. The fake-out: the vibraslap rattles, Sukuna guards behind him... nothing swapped. Yuji hits him from the front.
sceneShot(5, {
  base: { Y: [-30, 0], T: [-110, 0], S: [20, 0] }, auraH: 1,
  acts: [[0.6, 1.4, 'T', 'slap'], [1.0, 2.0, 'S', 'guard'], [1.6, 1.9, 'Y', 'punch'], [1.9, 2.6, 'S', 'hurt']],
  face: { S: 1 },
  motion: (k, s, n, a, lt) => (k === 'Y' ? [easeIn(seg(lt, 1.3, 1.6)) * 32, 0] : k === 'S' && lt > 1.9 ? [easeOut(seg(lt, 1.9, 2.6)) * 30, 0] : null),
  hits: [[1.75, 16, -34, 1.8]],
  cam: (lt) => [0, -30, lt < 1.5 ? 2.3 : 2.8, lt < 1.5 ? 0 : 0.05],
  over: lt => { slam(lt, 'NO CLAP!?', 1.05, 1.7, 250, 40, 11, '#ff5060'); slam(lt, 'FAKE-OUT', 1.8, 4, W / 2, 30, 14, '#ffd24a', { strokeCol: '#3a2a00', jitter: 1 }); },
}, [], [[3.0, '<Todo> the rattle is a feint too, brother!', '#ffffff']]);

// 6. Swap chain: five swaps in two seconds, a hit after each one
const CHAIN = [0.6, 1.0, 1.4, 1.8, 2.2];
sceneShot(7, {
  base: { Y: [-30, 0], T: [60, 0], S: [15, 0] }, speed: 1, auraH: 1,
  swaps: [[0.6, 'Y', 'T'], [1.0, 'T', 'Y'], [1.4, 'Y', 'T'], [1.8, 'S', 'Y'], [2.2, 'Y', 'T']],
  acts: [[0.4, 0.6, 'T', 'slap'], [0.65, 0.85, 'Y', 'kick'], [1.05, 1.25, 'T', 'punch'], [1.45, 1.65, 'Y', 'punch'], [1.85, 2.05, 'T', 'kick'], [2.25, 2.5, 'Y', 'upper'],
    [0.7, 2.6, 'S', 'hurt'], [2.55, 4.2, 'S', 'fly']],
  motion: (k, s, n, a, lt) => (k === 'S' && lt > 2.55 ? [0, -easeOut(seg(lt, 2.55, 3.4)) * 120 + Math.max(0, lt - 3.6) ** 2 * 200] : null),
  hits: CHAIN.map((t, i) => [t + 0.12, 15, -30 + (i % 2) * 8, 1.1]).concat([[2.4, 15, -40, 2]]),
  cam: (lt, pos) => [15, lt < 2.5 ? -30 : lerp(-30, -110, seg(lt, 2.5, 3.4)), lt < 2.5 ? 2.2 : 1.5, Math.sin(lt * 3) * 0.05],
  over: lt => {
    let n = 0; CHAIN.forEach(t => { if (lt >= t + 0.12) n++; }); if (lt >= 2.4) n++;
    if (n && lt < 5) { screen(); const pop = 1 + 0.6 * (1 - easeOutExpo(seg(lt % 0.4, 0, 0.15))); ctx.save(); ctx.translate(262, 30); ctx.scale(pop, pop); txt(`SWAP x${Math.min(n, 5)}`, 0, 0, 10, '#ffd24a', { stroke: 3 }); ctx.restore(); }
  },
}, [[4.0, 'boom', 1, 0.5]]);

// 6b. Four-arm barrage: every punch lands on empty air as Todo keeps swapping Yuji around him
const BAR = [0.5, 0.9, 1.3, 1.7];
sceneShot(7, {
  base: { Y: [-14, 0], T: [60, 0], S: [16, 0] }, auraH: 1, speed: 1,
  swaps: [[0.62, 'Y', 'T'], [1.02, 'Y', 'T'], [1.42, 'Y', 'T'], [1.82, 'Y', 'T']],
  acts: [[0.4, 0.62, 'S', 'punch'], [0.8, 1.02, 'S', 'punch'], [1.2, 1.42, 'S', 'punch'], [1.6, 1.82, 'S', 'punch'], [0.3, 2.0, 'T', 'slap'],
    [2.3, 2.6, 'Y', 'wind'], [2.6, 3.0, 'Y', 'upper'], [2.6, 4.2, 'S', 'hurt'], [3.4, 7, 'T', 'stance']],
  face: { S: -1 },
  motion: (k, s, n, a, lt) => (k === 'S' && lt > 2.6 ? [easeOut(seg(lt, 2.6, 3.4)) * 30, -Math.sin(seg(lt, 2.6, 3.6) * Math.PI) * 30] : null),
  hits: [[2.7, 14, -40, 2.2]],
  under: lt => { applyCam(); BAR.forEach((t, i) => { const d = lt - t - 0.1; if (d > 0 && d < 0.3) { ring(-2 + (i % 2) * 70, -30, 4 + d * 60, 1.5 * (1 - d / 0.3), rgba('#ff5060', 1 - d / 0.3)); } }); },
  cam: (lt) => [16, -34, 2.0, Math.sin(lt * 3) * 0.05],
  over: lt => { slam(lt, 'FOUR ARMS', 0.3, 1.9, 60, 40, 11, '#ff5060', { strokeCol: '#2a0006' }); slam(lt, 'ALL MISS', 1.9, 3.2, 250, 40, 11, '#ffd24a', { strokeCol: '#3a2a00', jitter: 1 }); },
}, BAR.map(t => [t, 'whoosh', 0.15, 0.4]));

// 6c. Launch and aerial combo: Todo claps Sukuna into the sky, Yuji swaps up to meet him, then Sukuna gets swapped back to the ground
sceneShot(7, {
  base: { Y: [-20, 0], T: [-80, 0], S: [20, 0], R: [60, -150] },
  motion: (k, s, n, a, lt) => {
    if (k === 'S' && n === 0 && lt > 0.5) return [0, -easeOut(seg(lt, 0.5, 1.4)) * 140];
    if (k === 'Y' && n === 1) return [Math.sin(s * 6) * 3, 0];
    if (k === 'R') return [0, 0];
    if (k === 'S' && n === 1) return [0, -Math.max(0, 1 - s * 4) * 10];
    return null;
  },
  swaps: [[1.2, 'Y', 'R'], [2.8, 'S', 'T']],
  acts: [[0.3, 0.5, 'Y', 'upper'], [0.5, 2.8, 'S', 'fly'], [1.0, 1.3, 'T', 'slap'], [1.3, 1.6, 'Y', 'kick'], [1.7, 2.0, 'Y', 'punch'], [2.1, 2.4, 'Y', 'kick'], [2.5, 2.8, 'T', 'slap'], [2.8, 4.2, 'S', 'hurt'], [2.8, 7, 'T', 'air']],
  face: { Y: -1 },
  hits: [[0.45, 20, -30, 1.8], [1.45, 30, -150, 1.2], [1.85, 30, -150, 1.2], [2.25, 30, -150, 1.6], [2.9, -80, -10, 2.4]],
  cam: (lt) => lt < 1.1 ? [0, -60, 1.3, 0] : lt < 2.8 ? [40, -150, 2.2, 0.06] : [-60, -60, 1.1, -0.04],
  shake: [[2.9, 1.2, 7]],
  over: lt => { if (lt > 2.9) { applyCam(); const d = lt - 2.9; ring(-80, 0, seg(d, 0, 0.6) * 150, 3 * (1 - seg(d, 0, 0.6)), rgba('#ffffff', 1 - seg(d, 0, 0.6)), 0.12); dust(d, 2, -80, 0, 20, 7, 16, 120); debris(d, 1.6, -80, 0, 30, 8, 150, 150, 5); } slam(lt, 'SWAPPED INTO THE GROUND', 3.0, 5, W / 2, 30, 9, '#ffd24a', { strokeCol: '#3a2a00' }); },
}, [[2.9, 'boom', 1.5, 0.9], [3.0, 'crumble', 1.2]]);

// 6d. Rubble rain: Todo throws a handful of rocks; each clap drops Yuji in from a new angle
sceneShot(5, {
  base: { Y: [-60, 0], T: [-110, 0], S: [30, 0], R: [-100, -20], R2: [-100, -24] },
  motion: (k, s, n, a, lt) => {
    if (k === 'R' && n === 0) return lt < 0.3 ? [0, 0] : [(lt - 0.3) * 150, -(lt - 0.3) * 160 + 110 * (lt - 0.3) ** 2];
    if (k === 'R2' && n === 0) return lt < 0.4 ? [0, 0] : [(lt - 0.4) * 110, -(lt - 0.4) * 190 + 110 * (lt - 0.4) ** 2];
    if (k === 'Y' && n > 0) return [0, Math.min(-a.y, 200 * s * s)];
    return null;
  },
  swaps: [[1.0, 'Y', 'R'], [1.9, 'Y', 'R2']],
  acts: [[0.1, 0.5, 'T', 'throw'], [0.8, 2.0, 'T', 'slap'], [1.05, 1.3, 'Y', 'kick'], [1.3, 1.8, 'S', 'hurt'], [1.95, 2.3, 'Y', 'punch'], [2.2, 3.4, 'S', 'hurt']],
  face: { Y: 1 },
  hits: [[1.15, 30, -46, 1.3], [2.1, 30, -40, 1.8]],
  cam: () => [-10, -56, 1.45, 0],
  over: lt => slam(lt, 'RUBBLE RAIN', 0.5, 3, W / 2, 30, 12, '#ffd24a', { strokeCol: '#3a2a00' }),
}, [[0.15, 'whoosh', 0.4, 0.4]]);

// 7. Sukuna's fury: Cleave and fire; Todo gets hit
sceneShot(5, {
  base: { Y: [-80, 0], T: [-20, 0], S: [60, 0] }, aura: true,
  acts: [[0.3, 1.8, 'S', 'slash'], [1.0, 3.0, 'T', 'hurt'], [2.6, 5, 'T', 'kneel'], [2.2, 5, 'Y', 'stance']],
  motion: (k, s, n, a, lt) => (k === 'T' && lt > 1.0 ? [-easeOut(seg(lt, 1.0, 1.8)) * 40, 0] : null),
  hits: [[1.0, -20, -34, 2]],
  under: lt => { applyCam(); for (let i = 0; i < 6; i++) { const d = lt - 0.3 - i * 0.15; if (d > 0 && d < 0.4) slash(-40 + hash(i) * 40, -60, -10 + hash(i) * 30, 0, d / 0.4, { w: 2.2, bend: 0.2 }); } },
  cam: () => [-10, -34, 1.9, -0.03],
  shake: [[0.3, 1.8, 2]],
  over: lt => { jslam(lt, '捌', 0.3, 1.8, 60, 60, 36, '#ff2238', { sw: 0.12 }); slam(lt, 'CLEAVE', 0.4, 1.8, 60, 96, 10, '#ffffff', { strokeCol: '#8a0010' }); },
}, Array.from({ length: 6 }, (_, i) => [0.3 + i * 0.15, 'slash', 0.5]), [[3.0, '<Todo> ...brother! go!!', '#ffffff']]);

// 8. Divine Flame: Todo swaps Yuji with a rock at the last instant. The arrow blows up the rock.
sceneShot(6, {
  base: { Y: [-60, 0], T: [-150, 0], S: [80, 0], R: [-100, 0] },
  swaps: [[2.35, 'Y', 'R']],
  acts: [[0, 2.5, 'S', 'cast'], [2.1, 2.5, 'T', 'slap'], [2.5, 6, 'T', 'kneel'], [0, 6, 'Y', 'stance']],
  under: lt => {
    applyCam();
    const ch = seg(lt, 0.2, 1.8);
    if (lt < 2.2) { glow(66, -30, 26 * ch, '#ff9a30', 0.7); for (let i = 0; i < 14; i++) rect(60 + hash(i + Math.floor(lt * 12)) * 12, -34 + hash(i * 3) * 8, 1.6, 1.6, i % 2 ? '#ffd060' : '#ff4a10'); }
    if (between(lt, 2.2, 2.45)) { const x = lerp(62, -60, seg(lt, 2.2, 2.45)); rect(x - 20, -27, 26, 2, '#ffd060'); glow(x, -26, 14, '#ff9a30', 0.8); }
    const e = lt - 2.45;
    if (e > 0 && e < 2) { const k = easeOut(seg(e, 0, 0.5)), f = 1 - seg(e, 0.6, 2); glow(-60, -20, 120 * k, '#ff7a20', 0.9 * f); circle(-60, -20, 50 * k * f, rgba('#ffb040', 0.9)); circle(-60, -20, 26 * k * f, '#fff0b0'); }
    burst(e, 1.6, -60, -20, 60, 9, { sp: 200, colors: ['#ff4a10', '#ff9a30', '#ffd060'], size: 5, round: true, drag: 1.5 });
  },
  cam: (lt) => [-20, -40, lt < 2.2 ? 1.6 : 1.3, 0],
  shake: [[2.45, 1.4, 6]],
  over: lt => { jslam(lt, '開', 0.3, 2.2, W / 2, 80, 90, 'rgba(255,90,30,0.3)', { sw: 0, shadow: false }); slam(lt, 'DIVINE FLAME: OPEN', 0.6, 2.2, W / 2, 30, 11, '#ffd080', { strokeCol: '#3a0a00' }); postHit(lt - 2.45, { chroma: 5, col: '#ff6010' }); slam(lt, 'SWAPPED WITH A ROCK', 2.7, 5, W / 2, 30, 10, '#ffd24a', { strokeCol: '#3a2a00' }); },
}, [[0.2, 'fire', 2, 0.4], [2.2, 'whoosh', 0.3, 0.6], [2.45, 'boom', 2, 1]]);

// 9. Yuji's charge: cursed energy crackles black and red
shot(4, (lt) => {
  bgGrad('#0a0006', '#3a0010');
  const k = seg(lt, 0, 3.4);
  focusLines(W / 2, H / 2, lt, { n: 70, inner: 80 - k * 30, color: `rgba(0,0,0,${0.3 + 0.4 * k})` });
  screenCam(shakeOf(lt, [[0, 4, 1.5]]), 4, W / 2, 100); applyCam();
  aura(W / 2, 128, 40, lt, '#3a8aff', 30, 14, 1);
  drawHero(pose(W / 2, 128, 1, { sc: 1.05, armF: lerp(-1.2, 1.2, easeOut(k)), armB: -1.3, rot: -0.12 * k, legF: -0.5, legB: 0.5 }), 'yuji');
  applyCam(); sparkBolts(W / 2 - 8, 104, lt, 3, 16, ['#000000', '#ff1a3c'], 1);
  slam(lt, 'FOCUS', 0.5, 3.4, W / 2, 30, 12, '#ffffff', { strokeCol: '#3a0010' });
  vignette(0.8); desat(0.4 * k);
  if (lt > 3.8) flash('#fff', seg(lt, 3.8, 4));
}, [[0, 'heart'], [0.7, 'heart'], [1.3, 'heart'], [0.5, 'riser', 3.4, 0.5]]);

// 10. BLACK FLASH chain: Todo swaps Sukuna into each punch
const BF = [0.7, 1.9, 3.1];
sceneShot(7, {
  base: { Y: [0, 0], T: [-140, 0], S: [26, 0], R: [-24, 0] }, auraH: 1, twos: true,
  swaps: [[1.5, 'S', 'R'], [2.7, 'S', 'R']],
  acts: [[0.45, 0.7, 'Y', 'wind'], [0.7, 1.0, 'Y', 'punch'], [0.7, 1.5, 'S', 'hurt'], [1.3, 1.55, 'T', 'slap'], [1.6, 1.9, 'Y', 'wind'], [1.9, 2.2, 'Y', 'punch'], [1.9, 2.7, 'S', 'hurt'],
    [2.5, 2.75, 'T', 'slap'], [2.85, 3.1, 'Y', 'wind'], [3.1, 3.5, 'Y', 'upper'], [3.1, 5, 'S', 'fly']],
  face: { Y: 1 },
  motion: (k, s, n, a, lt) => {
    if (k === 'S' && n === 0 && lt > 0.7) return [easeOut(seg(lt, 0.7, 1.4)) * 30, 0];
    if (k === 'S' && n === 2 && lt > 3.1) return [easeOut(seg(lt, 3.1, 4.5)) * 60, -easeOut(seg(lt, 3.1, 4.5)) * 140];
    if (k === 'R' && n === 1) return [0, 0];
    return null;
  },
  hits: BF.map(t => [t, 14, -30, 1.8, true]),
  cam: (lt) => [8, lt < 3.2 ? -30 : lerp(-30, -90, seg(lt, 3.2, 4.4)), lt < 3.2 ? 2.8 : 1.6, (Math.floor(lt / 1.2) % 2 ? 0.08 : -0.08)],
  over: lt => {
    BF.forEach((t, i) => slam(lt, 'BLACK FLASH', t, t + 1.1, W / 2, 34, 18 + i * 3, '#ff1a3c', { jitter: 3, pop: 1.8 }));
    jslam(lt, '黒閃', 3.2, 5, 262, 130, 30, '#ffffff', { sw: 0.2 });
    let n = BF.filter(t => lt >= t).length; if (n && lt > 3.3) slam(lt, `x${n}`, 3.3, 5.5, 60, 130, 22, '#ffffff', { strokeCol: '#ff1a3c' });
  },
}, [[4.2, 'boom', 1.5, 0.8]]);

// 11. Sukuna crashes back down and opens his mouth(s): World-Cutting Slash
shot(4, (lt, T) => {
  setCam(40, -40, lerp(1.6, 2.4, easeInOut(lt / 4)), 0, shakeOf(lt, [[0, 0.6, 7], [1.8, 2.2, 2]])); drawCity(T);
  applyCam();
  dust(lt, 2, 40, 0, 20, 5, 16, 120); debris(lt, 1.6, 40, 0, 30, 6, 150, 150, 5);
  aura(40, 0, 60, lt, '#ff3048', 40, 30, seg(lt, 0.6, 1.4));
  const r = easeOutBack(seg(lt, 1.2, 1.6));
  drawHeian(pose(40, 0, -1, { sc: 1.4, armF: lerp(0.3, -2.8, r), armF2: lerp(0.5, -2.4, r), armB: lerp(0.3, -2.6, r), armB2: lerp(0.5, -2.2, r), grin: 1 }));
  jslam(lt, '世界を断つ斬撃', 1.8, 4, W / 2, 30, 15, '#ffffff', { strokeCol: '#2a0006' });
  slam(lt, 'WORLD-CUTTING SLASH', 2.0, 4, W / 2, 160, 11, '#ff3048', { strokeCol: '#2a0006', jitter: 1 });
  vignette(0.6);
}, [[0, 'boom', 1.5, 0.8], [0.8, 'laugh'], [1.8, 'gong'], [2.0, 'riser', 2, 0.5]]);

// 12. The final trickshot: the vibraslap rings once more. The slash cuts the spot where Yuji WAS.
// Yuji swapped with the chunk of rubble Todo tossed high above Sukuna.
sceneShot(6, {
  base: { Y: [-40, 0], T: [-120, 0], S: [50, 0], R: [-110, -20] },
  motion: (k, s, n, a, lt) => {
    if (k === 'R' && n === 0) return lt < 0.3 ? [0, 0] : [Math.min(160, (lt - 0.3) * 190), -Math.min(170, (lt - 0.3) * 260) + 0];
    if (k === 'Y' && n > 0) return [0, Math.min(-a.y, 260 * s * s)];
    return null;
  },
  swaps: [[1.35, 'Y', 'R']],
  acts: [[0.1, 0.5, 'T', 'throw'], [1.0, 1.5, 'T', 'slap'], [1.5, 6, 'T', 'kneel'], [0.6, 1.6, 'S', 'cast'], [1.4, 1.9, 'Y', 'air'], [1.9, 2.3, 'Y', 'punch'], [2.2, 6, 'S', 'kneel']],
  face: { Y: 1 },
  under: lt => {
    applyCam();
    const d = lt - 1.3;
    if (d > 0 && d < 0.8) { const a = 1 - seg(d, 0.2, 0.8); ctx.globalAlpha = a; rect(-400, -24, 800, 2, '#ffffff'); rect(-400, -28, 800, 10, rgba('#ff2040', 0.3)); ctx.globalAlpha = 1; }
  },
  hits: [[2.1, 46, -42, 3, true]],
  cam: (lt, pos) => lt < 1.3 ? [-20, -60, 1.3, 0] : lt < 2.0 ? [48, pos.Y[1] - 20, 2.0, 0.08] : [46, -30, 2.4, -0.05],
  shake: [[2.1, 1.2, 9]],
  over: lt => {
    slam(lt, 'MISSED.', 1.5, 2.0, 70, 100, 12, '#ffffff', { strokeCol: '#8a0010' });
    if (between(lt, 2.1, 2.9)) { screen(); vignette(0.8); }
    slam(lt, 'BLACK FLASH', 2.1, 4.2, W / 2, 34, 26, '#ff1a3c', { jitter: 4, pop: 2.2 });
  },
}, [[0.15, 'whoosh', 0.4, 0.5], [1.3, 'slash', 1.0], [2.1, 'boom', 2.5, 1.2]]);

// 13. Silence. Both faces of Sukuna stare. He goes down.
shot(4, (lt) => {
  bgGrad('#0a0406', '#2a0a10');
  const s = 11, k = easeIn(seg(lt, 2.2, 3.4));
  screen(); ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(k * 0.4); ctx.translate(-W / 2, -H / 2 + k * 80);
  heianFace(W / 2 - 4 * s, H / 2 - 4 * s + 10, s, { open: 1 - seg(lt, 1.6, 2.2), grin: 0.2 });
  ctx.restore();
  desat(0.6); vignette(0.8);
  if (lt > 3.4) flash('#000', seg(lt, 3.4, 4));
}, [[0.4, 'heart'], [1.4, 'heart'], [3.0, 'thud']], [[0.6, '<Sukuna> ...a clap. beaten by a CLAP.', '#ffffff']]);

// 14. Aftermath: Yuji helps Todo up; fist bump; dawn
shot(7, (lt, T) => {
  setCam(lerp(-40, -10, lt / 7), -26, lerp(2.4, 2.0, lt / 7)); drawCity(T);
  applyCam();
  drawHeian(pose(60, 12, -1, { sc: 1.3, rot: Math.PI / 2 * 0.95, armF: -2.8, armB: -2.9, alpha: 0.9 }));
  const up = easeOut(seg(lt, 1.2, 2.4));
  const t = pose(-50, 0, 1, { sc: 1.3 }); POSES.kneel(t); if (up > 0) Object.assign(t, { legF: lerp(-1.5, -0.3, up), legB: lerp(1.2, 0.3, up), y: lerp(5, 0, up), rot: 0 });
  if (lt > 3.4) Object.assign(t, { armF: -Math.PI / 2, extF: 2, grin: 1 });
  drawHero(t, 'todo');
  const y = pose(-28, 0, -1, { armF: lt < 2.4 ? -1.3 : -0.3, grin: lt > 3.4 });
  if (lt > 3.4) Object.assign(y, { armF: -Math.PI / 2, extF: 2 });
  drawHero(y, 'yuji');
  if (between(lt, 3.5, 3.8)) { star(-38, -32, 6 * pulse(lt, 3.5, 0.3), '#ffffff'); }
  for (let i = 0; i < 20; i++) { const ph = frac(lt * 0.15 + hash(i)); ctx.globalAlpha = 1 - ph; rect(-150 + hash(i * 3) * 300, -ph * 100, 1, 1, '#ffe0a0'); }
  ctx.globalAlpha = 1;
  letterbox(16);
}, [[0, 'wind', 7, 0.2], [3.5, 'clap']], [[0.5, '<Yuji> ...Todo. we did it.', '#ffffff'], [2.4, '<Todo> of course. we\'re best friends.', '#ffffff'], [4.2, '<Todo> BROTHER!!', '#ffd24a']]);

// End card fills the rest of the 2 minutes
{
  const used = SHOTS.reduce((a, s) => a + s.d, 0);
  shot(DUR - used, (lt) => {
    screen(); rect(0, 0, W, H, '#000');
    const a = k => (ctx.globalAlpha = seg(lt, k, k + 0.5));
    a(0.2); txt('YUJI & TODO vs SUKUNA', W / 2, 44, 11, '#ff6a6a', { stroke: 2 });
    a(0.8); txt('WINNERS: YUJI & TODO', W / 2, 70, 8, '#ffffff');
    a(1.4); txt('Boogie Woogie swaps: 20   Black Flashes: 4', W / 2, 92, 5, '#ffd24a');
    a(2.0); txt('fan animation (non-canon) - made with pure JavaScript', W / 2, 150, 4, '#8a8aa0');
    ctx.globalAlpha = 1;
  }, [[0.2, 'gong'], [0.8, 'vibraslap']]);
}
