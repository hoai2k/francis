// Storyboard part 2: techniques, domain battle and finale (40s - 120s).
'use strict';

// ======================= ACT 3: TECHNIQUES =======================
// 15. Lapse: Blue
const BLUE = [-600, -70];
shot(4, (lt, T) => {
  const r = lt < 3.4 ? 4 + 12 * easeOut(seg(lt, 0.5, 3.0)) : 16 * (1 - easeIn(seg(lt, 3.4, 3.6)));
  const sh = shakeOf(lt, [[0.5, 3.0, 1.2], [3.6, 0.8, 7]]);
  if (lt < 1.2 || lt >= 3.3) setCam(-585, -105, 0.8, 0, sh);
  else setCam(-615, -45, 2.0, lerp(-0.05, 0.05, seg(lt, 1.2, 3.3)), sh);
  drawCity(T);
  applyCam();
  aura(-525, -210, 36, lt, PAL.gojo.aura, 12, 10, 0.6);
  drawSide(P(-525, -210, -1, { armF: lerp(0.1, -1.0, easeOut(seg(lt, 0.1, 0.5))), armB: 0.2, legF: -0.2, legB: 0.2 }), G);
  const pk = easeIn(seg(lt, 0.8, 3.3)), blown = easeOut(seg(lt, 3.6, 4));
  drawSide(P(lerp(-640, -622, pk) - blown * 20, -lerp(0, 8, pk) * (1 - blown), 1, { armF: Math.floor(lt * 6) % 2 ? -2.3 : -0.5, armB: -1.2, legF: -0.6, legB: 0.6, rot: 0.25 * pk * (1 - blown) }), S);
  if (lt > 0.5 && lt < 3.6) {
    for (let i = 0; i < 70; i++) {
      const ph = frac(lt * 0.5 * (0.6 + hash(i)) + hash(i * 3)), rr = (1 - ph) * 150 + r, a = hash(i * 7) * TAU + ph * 7;
      const x = BLUE[0] + Math.cos(a) * rr, y = BLUE[1] + Math.sin(a) * rr * 0.8, sz = 2 + hash(i * 5) * 5;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ph * 10); ctx.globalAlpha = Math.min(1, ph * 3) * seg(lt, 0.5, 1.0);
      ctx.drawImage(DEBRIS_TEX[i % 6][i % 4], -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 26; i++) {
      const ph = frac(lt * 1.5 + hash(i)), a = hash(i * 3.3) * TAU, r1 = (1 - ph) * 120 + r * 1.5;
      ctx.strokeStyle = rgba('#9fe8ff', ph * 0.6); ctx.lineWidth = 0.8; ctx.beginPath();
      ctx.moveTo(BLUE[0] + Math.cos(a) * r1, BLUE[1] + Math.sin(a) * r1); ctx.lineTo(BLUE[0] + Math.cos(a) * (r1 + 24), BLUE[1] + Math.sin(a) * (r1 + 24)); ctx.stroke();
    }
    ring(BLUE[0], BLUE[1], r * 1.8, 1.2, rgba('#bff4ff', 0.5));
    orb(BLUE[0], BLUE[1], r, '#6fd0ff', '#2a6bff', lt);
    sparkBolts(BLUE[0], BLUE[1], lt, 3, r * 2.4, ['#bff4ff'], 1);
  }
  const d = lt - 3.6;
  ring(BLUE[0], BLUE[1], seg(d, 0, 0.5) * 220, 4 * (1 - seg(d, 0, 0.5)), rgba('#bff4ff', 1 - seg(d, 0, 0.5)));
  debris(d, 1.4, BLUE[0], BLUE[1], 60, 150, 260, 60, 6);
  dust(d, 1.6, BLUE[0], 0, 20, 151, 16, 120);
  tint('#2a6bff', 0.18 * seg(lt, 0.5, 3.4) * (1 - seg(lt, 3.6, 4)));
  postHit(d, { chroma: 3 });
  jslam(lt, '術式順転「蒼」', 0.3, 2.3, W / 2, 30, 15, '#bff4ff', { strokeCol: '#06205a' });
  slam(lt, 'LAPSE: BLUE', 0.5, 2.3, W / 2, 156, 13, '#6fd0ff', { strokeCol: '#06205a' });
}, [[0.5, 'hum', 3.1, 55, 0.5], [0.5, 'charge', 3.0, 60, 220, 0.15], [1.0, 'crumble', 2.4], [3.4, 'whooshDown', 0.2, 0.6], [3.6, 'boom', 1.2, 0.8]]);

// 16. Reversal: Red
shot(3.5, (lt, T) => {
  if (lt < 1.4) {
    bgGrad('#0a0204', '#3a0610');
    const ox = W / 2 + 10, oy = 70, r = 3 + 13 * easeOut(seg(lt, 0.2, 1.25));
    focusLines(ox, oy, lt, { n: 60, inner: 30 + r * 2, color: 'rgba(255,80,90,0.35)' });
    const sh = shakeOf(lt, [[0.2, 1.2, 1.2]]);
    screen(); ctx.translate(sh[0], sh[1]);
    drawHand(G, W / 2 + 10, H / 2 + 40, 7);
    sparkBolts(ox, oy, lt, 4, r * 2.5, ['#ff6060'], 1);
    orb(ox, oy, r, '#ff5a4a', '#ff1a1a', lt);
    jslam(lt, '術式反転「赫」', 0.3, 1.4, W / 2, 24, 15, '#ffd0d0', { strokeCol: '#3a0006' });
    slam(lt, 'REVERSAL: RED', 0.5, 1.4, W / 2, 162, 13, '#ff4a3a', { strokeCol: '#2a0004' });
    vignette(0.6);
    return;
  }
  const d = lt - 1.4, e = d - 0.15, EX = [-625, -22];
  setCam(-600, -100, 0.8, 0, shakeOf(d, [[0.15, 1.3, 9]])); drawCity(T);
  applyCam();
  drawSide(P(-525, -210, -1, { armF: -1.1, extF: 2, armB: 0.3 }), G);
  if (d < 0.15) {
    const k = d / 0.15, x = lerp(-535, EX[0], k), y = lerp(-228, EX[1], k);
    ctx.strokeStyle = rgba('#ff4a3a', 0.8); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-535, -228); ctx.lineTo(x, y); ctx.stroke();
    orb(x, y, 10, '#ff5a4a', '#ff1a1a', lt);
    drawSide(stance(EX[0], 0, 1, lt), S);
  } else {
    const k = easeOut(seg(e, 0, 0.8));
    drawSide(flyBack(lerp(EX[0], -900, k), -Math.sin(k * Math.PI) * 40, 1, -e * 8), S);
  }
  if (e >= 0 && e < 2.1) {
    const k = easeOut(seg(e, 0, 0.5)), f = 1 - seg(e, 0.4, 2.1);
    glow(EX[0], EX[1], 170 * k, '#ff5a2a', 0.9 * f);
    circle(EX[0], EX[1], 80 * k * (1 - seg(e, 0.3, 0.9)), '#ffd0a0');
    ring(EX[0], EX[1], e * 420, 6 * (1 - seg(e, 0, 0.8)), rgba('#ffffff', 1 - seg(e, 0, 0.8)), 0.7);
  }
  debris(e, 2.1, EX[0], EX[1], 70, 300, 280, 170, 7);
  dust(e, 2.1, EX[0], 0, 26, 301, 20, 170);
  burst(e, 1.0, EX[0], EX[1], 50, 302, { sp: 280, colors: ['#ff3020', '#ffa040', '#ffe080'], size: 3, drag: 2 });
  postHit(e, { chroma: 5, col: '#ff2020' });
}, [[0.2, 'charge', 1.2, 200, 900, 0.2], [0.2, 'crackle', 1.2, 0.25], [1.4, 'whoosh', 0.2, 0.6], [1.55, 'bigHit'], [1.55, 'boom', 2, 1], [1.7, 'crumble', 1.5]]);

// 17. Divine Flame: Open (Fuga)
const FU_X = -900;
function flameSpear(x, y, t) {
  glow(x - 10, y, 34, '#ff8a20', 0.7);
  for (let i = 0; i < 40; i++) {
    const u = i / 39, fl = hash(i + Math.floor(t * 20));
    const px = x - u * 60, py = y + (fl - 0.5) * (2 + u * 10), s = (1 - u) * 4 + 1;
    rect(px - s / 2, py - s / 2, s, s, fl > 0.6 ? '#fff0a0' : fl > 0.3 ? '#ffa030' : '#ff4a10');
  }
  ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x + 6, y); ctx.lineTo(x - 6, y + 4); ctx.fill();
  rect(x - 50, y - 0.8, 50, 1.6, '#fff6d0');
}
shot(5, (lt, T) => {
  if (lt < 2.4) {
    setCam(-893, -24, lerp(2.6, 3.4, easeInOut(lt / 2.4)), 0.03, shakeOf(lt, [[0.3, 2.1, 0.8]])); drawCity(T);
    jslam(lt, '開', 0.3, 2.4, W / 2, H / 2 - 6, 130, 'rgba(255,60,30,0.3)', { sw: 0, shadow: false, pop: 0.3 });
    applyCam();
    const ch = seg(lt, 0, 1.5);
    for (let i = 0; i < 30; i++) { const ph = frac(lt * 0.8 + hash(i)); ctx.globalAlpha = 1 - ph; rect(FU_X - 60 + hash(i * 3) * 120, -ph * 30, 1.5, 1.5, i % 2 ? '#ff8a20' : '#ffd060'); }
    ctx.globalAlpha = 1;
    aura(FU_X, 0, 44, lt, '#ff7a20', 30, 18, 0.6 + ch * 0.4);
    drawSide(P(FU_X, 0, 1, { armF: -Math.PI / 2, armB: lerp(0.3, 1.45, easeOut(seg(lt, 0, 0.6))), legF: -0.5, legB: 0.5 }), S);
    const hx = FU_X + 13;
    ctx.globalAlpha = ch;
    for (let i = 0; i < 26; i++) {
      const u = i / 25, fl = hash(i + Math.floor(lt * 14));
      rect(hx + 6 * Math.sin(u * Math.PI) - 3, -44 + u * 40, 2 + fl * 1.5, 2 + fl * 1.5, fl > 0.6 ? '#fff0a0' : fl > 0.3 ? '#ffa030' : '#ff4a10');
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 50; i++) {
      const u = i / 49, tx = lerp(FU_X - 12, hx + 10, u), c = easeInOut(clamp(ch * 1.4 - hash(i) * 0.4));
      const x = lerp(tx + (hash(i * 3) - 0.5) * 80, tx, c), y = lerp(-24 + (hash(i * 5) - 0.5) * 60, -24, c);
      rect(x - 0.8, y - 0.8, 1.6, 1.6, i % 3 ? '#ffb040' : '#fff0c0');
    }
    if (ch >= 1) { glow(hx, -24, 30, '#ff9a30', 0.6); ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.moveTo(hx + 10, -27); ctx.lineTo(hx + 16, -24); ctx.lineTo(hx + 10, -21); ctx.fill(); }
    tint('#ff6a20', 0.2);
    slam(lt, 'DIVINE FLAME', 0.9, 2.4, W / 2, 28, 11, '#ffd080', { strokeCol: '#3a0a00' });
    slam(lt, 'OPEN', 1.1, 2.4, W / 2, 150, 22, '#ff7a20', { strokeCol: '#2a0600', jitter: 1 });
    vignette(0.5);
    return;
  }
  if (lt < 2.9) {
    const d = lt - 2.4, ax = lerp(-880, -445, d / 0.5);
    setCam(ax - 10, -30, 2.2, 0, shakeOf(d, [[0, 0.5, 2]])); drawCity(T);
    streaks(lt, { n: 50, speed: 1600, alpha: 0.4, dir: -1, color: '#ffd0a0' });
    applyCam(); flameSpear(ax, -26, lt);
    tint('#ff6a20', 0.25);
    return;
  }
  const d = lt - 2.9, e = d - 0.1;
  setCam(-430, -40, 1.4, 0, shakeOf(d, [[0.1, 1.7, 8]])); drawCity(T);
  applyCam();
  drawSide(pockets(-420, 0, -1, lt), G);
  if (d < 0.1) flameSpear(lerp(-510, -440, d / 0.1), -26, lt);
  else {
    ring(-440, -26, 6 + seg(e, 0, 0.3) * 20, 2 * (1 - seg(e, 0, 0.3)), rgba('#8ff4ff', 1 - seg(e, 0, 0.3)));
    const k = easeOut(seg(e, 0, 0.6)), f = 1 - seg(e, 1.2, 2.0);
    glow(-440, -26, 280 * k, '#ff7a20', 0.95 * f);
    ctx.fillStyle = rgba('#fff0b0', 0.55 * f);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU + hash(i) * 0.3, l = 300 * k; ctx.beginPath(); ctx.moveTo(-440, -26); ctx.lineTo(-440 + Math.cos(a - 0.05) * l, -26 + Math.sin(a - 0.05) * l); ctx.lineTo(-440 + Math.cos(a + 0.05) * l, -26 + Math.sin(a + 0.05) * l); ctx.fill(); }
    circle(-440, -26, 150 * k * f, rgba('#ff9a30', 0.85)); circle(-440, -26, 90 * k * f, '#fff0b0');
    ring(-440, -26, 160 * k, 8 * f, rgba('#3a1a10', 0.6 * f));
    burst(e, 2, -440, -26, 120, 500, { sp: 320, colors: ['#ff4a10', '#ff9a30', '#ffd060', '#ffffff'], size: 7, round: true, drag: 1.5, shrink: -0.5 });
    burst(e - 0.8, 1.2, -440, -40, 40, 501, { sp: 140, colors: SMOKE, size: 20, round: true, drag: 1.2, shrink: -1, alpha: 0.7 });
  }
  if (between(d, 0.1, 0.14)) flash('#ffffff');
  if (d > 0.3) flash('#ff8a30', 0.35 * (1 - seg(d, 0.3, 1.8)));
  postHit(e, { chroma: 5, imp: 0.08, col: '#ff6010' });
}, [[0, 'fire', 2.4, 0.4], [0.3, 'gong'], [1.0, 'charge', 1.4, 100, 600, 0.2], [2.4, 'whoosh', 0.5, 0.8], [2.4, 'fire', 0.6, 0.6], [3.0, 'bigHit'], [3.0, 'boom', 2.5, 1.0], [3.1, 'fire', 2.0, 0.8]]);

// 18. Gojo walks out of the flames
shot(3.5, (lt, T) => {
  setCam(-418, -26, 2.8, -0.05, shakeOf(lt, [[0, 0.5, 1.5]])); drawCity(T);
  applyCam();
  for (let i = 0; i < 40; i++) {
    const ph = frac(lt * (1 + hash(i)) + hash(i * 2)), x = -470 + hash(i * 3) * 100, s = 3 * (1 - ph) + 1;
    ctx.globalAlpha = 1 - ph; rect(x + Math.sin(lt * 5 + i) * 2, -ph * 30, s, s, ['#ff4a10', '#ff9a30', '#ffd060'][i % 3]);
  }
  ctx.globalAlpha = 1;
  const g = walk(lerp(-410, -424, lt / 3.5), 0, -1, lt, 5);
  g.head = pulse(lt, 1.6, 0.5) * 0.35;
  drawSide(g, G);
  for (let i = 0; i < 16; i++) { const ph = frac(lt * 0.9 + hash(i)); ctx.globalAlpha = (1 - ph) * 0.9; rect(g.x - 8 + hash(i * 3) * 16, -ph * 44, 1, 1, i % 2 ? '#dffff8' : '#9ff0e0'); }
  ctx.globalAlpha = 1;
  if (between(lt, 1.65, 1.9)) star(g.x - 1, -27, 4 * pulse(lt, 1.65, 0.25), '#ffffff');
  screen();
  for (let i = 0; i < 9; i++) {
    const x = frac(hash(i * 4.1) + lt * 0.03 * (i % 2 ? 1 : -1)) * (W + 120) - 60, y = 60 + hash(i * 6.1) * 120;
    ctx.globalAlpha = Math.max(0, 0.4 - lt * 0.1) * (0.6 + 0.4 * hash(i)); circle(Math.abs(x - W / 2) < 50 ? x + 110 : x, y, 30 + hash(i) * 30, '#3a302c');
  }
  ctx.globalAlpha = 1;
  tint('#ff7a30', 0.2); vignette(0.6);
}, [[0, 'fire', 3.5, 0.3], [0.4, 'thud'], [1.1, 'thud'], [1.7, 'thud'], [1.65, 'zip'], [2.4, 'thud']], [[1.9, '<Gojo> that tickled.', '#ffffff']]);

// 19. Hand signs: rapid cross-cutting, then DOMAIN EXPANSION
shot(4, (lt) => {
  const cuts = [[0, 0.6, 'hg'], [0.6, 1.2, 'hs'], [1.2, 1.6, 'eg'], [1.6, 2.0, 'es'], [2.0, 2.3, 'hg2'], [2.3, 2.6, 'hs2']];
  if (lt < 2.6) {
    const c = cuts.find(([a, b]) => lt >= a && lt < b), u = lt - c[0], gj = c[2][1] === 'g', kind = gj ? G : S;
    bgGrad(gj ? '#020818' : '#140204', gj ? '#0a3a9a' : '#6a0a14');
    focusLines(W / 2, H / 2, lt, { n: 60, inner: 60, color: gj ? 'rgba(150,230,255,0.4)' : 'rgba(255,120,130,0.4)' });
    const sh = shakeOf(u, [[0, 0.25, 4]]);
    screen(); aura(W / 2, H + 10, 170, lt, PAL[kind].aura, 44, 220, 1);
    screen(); ctx.translate(sh[0], sh[1]);
    if (c[2][0] === 'h') drawHand(kind, W / 2, H / 2 + 12, (c[2].length > 2 ? 10 : 8) + u * 2);
    else drawEye(kind, W / 2, H / 2, 150 + u * 50, lt, { open: 1 });
    vignette(0.6);
    if (u < 0.03) flash('#ffffff', 0.7);
    return;
  }
  const sh = shakeOf(lt, [[2.6, 0.4, 5], [2.9, 1.1, 3]]);
  [true, false].forEach(left => {
    screen(); ctx.save(); ctx.translate(sh[0], sh[1]); ctx.beginPath(); ctx.rect(left ? -10 : W / 2, -10, W / 2 + 10, H + 20); ctx.clip();
    const kind = left ? G : S, x = left ? 80 : 240;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, left ? '#020818' : '#140204'); g.addColorStop(1, left ? '#0a3a9a' : '#6a0a14');
    ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
    focusLines(x, 110, lt, { n: 40, inner: 50, color: left ? 'rgba(150,230,255,0.3)' : 'rgba(255,120,130,0.3)' });
    screen(); ctx.translate(sh[0], sh[1]);
    aura(x, 200, 120, lt, PAL[kind].aura, 50, 90, 1);
    drawFront({ x, y: 200, sc: 3.4, armL: SIGN[0], armR: SIGN[1], sign: 1 }, kind, { open: 1, open2: 1, grin: 1, glow: 1 });
    for (let i = 0; i < 6; i++) bolt(x, 180, x + (hash(i + (left ? 0 : 9)) - 0.5) * 200, 180 + hash(i * 3) * 10, i, 6, 6, 1, rgba(PAL[kind].aura, 0.7));
    ctx.restore();
  });
  screen(); bolt(W / 2, -5, W / 2, H + 5, Math.floor(lt * 20), 12, 8, 2, '#ffffff');
  jslam(lt, '領域展開', 2.7, 4, W / 2, 36, 30, '#ffffff', { jitter: 1.5 });
  slam(lt, 'DOMAIN EXPANSION', 2.9, 4, W / 2, 72, 11, '#ffd84a');
  if (lt > 3.8) flash('#ffffff', seg(lt, 3.8, 4));
}, [[0, 'hit', 0.6], [0.6, 'hit', 0.6], [1.2, 'ting'], [1.6, 'thud'], [1.62, 'laugh'], [2.0, 'hit', 0.5], [2.3, 'hit', 0.5], [2.6, 'bigHit'], [2.7, 'riser', 1.3, 0.6]]);

// 20. Both domains burst open
shot(2, (lt) => {
  screen(); rect(0, 0, W, H, '#000');
  const r = easeOutExpo(seg(lt, 0, 1.0)) * 220, sh = shakeOf(lt, [[0, 1, 3], [1.0, 0.6, 7]]);
  screen(); ctx.save(); ctx.translate(sh[0], sh[1]);
  ctx.beginPath(); ctx.arc(-30, H / 2, r, 0, TAU); ctx.clip(); ctx.beginPath(); ctx.rect(-10, -10, W / 2 + 10, H + 20); ctx.clip();
  drawVoid(lt, 60, H / 2 + 20, { holeY: 60, hole: 14 });
  ctx.restore();
  screen(); ctx.save(); ctx.translate(sh[0], sh[1]);
  ctx.beginPath(); ctx.arc(W + 30, H / 2, r, 0, TAU); ctx.clip(); ctx.beginPath(); ctx.rect(W / 2, -10, W / 2 + 10, H + 20); ctx.clip();
  drawShrine(lt, { cx: 250, base: 150, s: 0.8 });
  ctx.restore();
  screen();
  ring(-30, H / 2, r, 3, 'rgba(200,240,255,0.9)'); ring(W + 30, H / 2, r, 3, 'rgba(255,120,120,0.9)');
  if (lt > 1.0) { bolt(W / 2, -5, W / 2, H + 5, Math.floor(lt * 24), 14, 12, 3, '#ffffff'); }
  if (between(lt, 1.0, 1.04)) flash('#ffffff');
  if (lt > 1.0) chroma(3 * (1 - seg(lt, 1.0, 1.6)));
}, [[0, 'boom', 2, 0.8], [0.05, 'glitch'], [1.0, 'bigHit'], [1.0, 'glass', 0.5]]);

// ======================= ACT 4: DOMAIN BATTLE =======================
function clashScene(t, seamF, gojoArms = SIGN) {
  drawVoid(t, 80, 130, { holeY: 50, hole: 15 });
  screenCam(); applyCam();
  aura(80, 178, 90, t, PAL.gojo.aura, 30, 40, 0.8);
  drawFront({ x: 80, y: 178, sc: 2.6, armL: gojoArms[0], armR: gojoArms[1], sign: 1 }, G, { open: 1, glow: 1 });
  snapshot();
  drawShrine(t, { cx: 250, base: 150, s: 0.8 });
  applyCam();
  aura(250, 178, 90, t, PAL.sukuna.aura, 30, 40, 0.8);
  drawFront({ x: 250, y: 178, sc: 2.6, armL: SIGN[0], armR: SIGN[1], sign: 1 }, S, { open: 1, open2: 1, grin: 1, glow: 1 });
  screen(); ctx.save(); ctx.beginPath(); ctx.moveTo(-5, -5);
  for (let y = -5; y <= H + 5; y += 6) ctx.lineTo(seamF(y), y);
  ctx.lineTo(-5, H + 5); ctx.clip();
  ctx.drawImage(buf, 0, 0, cv.width, cv.height, 0, 0, W, H); ctx.restore();
  // crackling seam
  screen();
  for (const [w, c] of [[5, 'rgba(255,255,255,0.25)'], [1.6, '#ffffff']]) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
    for (let y = -5; y <= H + 5; y += 6) ctx.lineTo(seamF(y), y);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) { const y = hash(i + Math.floor(t * 12)) * H, x = seamF(y); bolt(x, y, x + (hash(i * 3 + Math.floor(t * 12)) - 0.5) * 50, y + (hash(i * 7) - 0.5) * 30, i + t, 4, 6, 1, i % 2 ? '#8ff4ff' : '#ff4060'); }
}
// 21. Domain clash: Infinite Void vs Malevolent Shrine
shot(8, (lt) => {
  const b = W / 2 + Math.sin(lt * 0.9) * 18 + Math.sin(lt * 2.3) * 30 * seg(lt, 4, 5);
  const seamF = y => b + Math.sin(y * 0.08 + lt * 6) * 4 + (hash(Math.floor(y / 6) + Math.floor(lt * 20)) - 0.5) * 3;
  const sh = shakeOf(lt, [[0, 1, 2], [4, 4, 3]]);
  cam.sx = sh[0];
  clashScene(lt, seamF);
  jslam(lt, '無量空処', 0.5, 3.6, 60, 22, 14, '#bff4ff', { strokeCol: '#06205a' });
  slam(lt, 'INFINITE VOID', 0.6, 3.6, 60, 40, 7, '#8ff4ff', { strokeCol: '#06205a' });
  jslam(lt, '伏魔御廚子', 1.2, 3.6, 258, 22, 14, '#ffd0d0', { strokeCol: '#3a0006' });
  slam(lt, 'MALEVOLENT SHRINE', 1.3, 3.6, 258, 40, 6, '#ff6070', { strokeCol: '#3a0006' });
  chroma(Math.sin(lt * 2.3) * 2 * seg(lt, 4, 5));
}, [[0, 'hum', 8, 55, 0.35], [0, 'hum', 8, 58, 0.25], [0, 'crackle', 8, 0.2], [4, 'riser', 4, 0.3], [0.5, 'gong'], [1.2, 'gong']]);

// 22. Slash storm: the Void cracks and shatters
function slashStorm(lt, n, rate, o = {}) {
  screen();
  for (let i = 0; i < n; i++) {
    const t0 = i * rate + (o.off || 0), dt = lt - t0; if (dt < 0 || dt > 0.3) continue;
    const x = hash(i * 3.3) * W, y = hash(i * 7.7) * H, a = hash(i * 1.1) * Math.PI, l = 30 + hash(i * 5.5) * 60;
    slash(x - Math.cos(a) * l, y - Math.sin(a) * l, x + Math.cos(a) * l, y + Math.sin(a) * l, dt / 0.3, { w: 1.6, bend: 0.08 });
  }
}
shot(6, (lt) => {
  const SH_T = 3.5, bS = W * 0.4;
  const b = lerp(W / 2 + 10, bS, easeIn(seg(lt, 1.0, 3.4)));
  const seamF = y => b + Math.sin(y * 0.08 + lt * 8) * 5 + (hash(Math.floor(y / 6) + Math.floor(lt * 20)) - 0.5) * 4;
  cam.sx = shakeOf(lt, [[0, 3.5, 3], [3.5, 0.6, 8]])[0];
  const cracks = k => {
    screen();
    for (let i = 0; i < 12; i++) {
      const y = (i + 0.5) * (H / 12), x = seamF(y);
      bolt(x, y, x - k * (60 + hash(i) * 100), y + (hash(i * 3) - 0.5) * 60, i * 5, 6, 10, 1.1, '#ffffff');
    }
  };
  if (lt < SH_T) {
    clashScene(lt + 8, seamF);
    if (lt > 1.5) cracks(seg(lt, 1.5, 3.4));
  } else {
    // freeze the void side, snapshot it, then shatter it over the shrine
    drawVoid(11.4, 80, 130, { holeY: 50, hole: 15 });
    screenCam(); applyCam(); drawFront({ x: 80, y: 178, sc: 2.6, armL: SIGN[0], armR: SIGN[1], sign: 1 }, G, { open: 1, glow: 1 });
    cracks(1);
    snapshot();
    drawShrine(lt, { cx: W / 2 + 40, base: 150, s: 0.9 });
    applyCam();
    drawFront({ x: 250, y: 178, sc: 2.6, armL: SIGN[0], armR: SIGN[1], sign: 1 }, S, { open: 1, open2: 1, grin: 1, glow: 1 });
    drawFront({ x: 80, y: 178, sc: 2.6, armL: 0.3, armR: -0.3 }, G, { open: 1, glow: 1 });
    const dt = lt - SH_T, GX = 5, GY = 4;
    const vtx = (i, j) => [i === GX ? bS : (i * bS) / GX + (i > 0 ? (hash(i * 7 + j * 13) - 0.5) * (bS / GX) * 0.6 : 0),
      (j * H) / GY + (j > 0 && j < GY ? (hash(i * 3 + j * 17) - 0.5) * (H / GY) * 0.6 : 0)];
    screen();
    for (let i = 0; i < GX; i++) for (let j = 0; j < GY; j++) {
      const a = vtx(i, j), bb = vtx(i + 1, j), c = vtx(i + 1, j + 1), d = vtx(i, j + 1);
      [[a, bb, c], [a, c, d]].forEach((tri, q) => {
        const id = i * 10 + j * 2 + q, cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const vx = -(30 + hash(id) * 140) * (1.2 - cx / bS), vy = (hash(id * 3) - 0.7) * 90, rot = (hash(id * 5) - 0.5) * 5 * dt;
        ctx.save(); ctx.globalAlpha = 1 - seg(dt, 0.9, 1.6);
        ctx.translate(cx + vx * dt, cy + vy * dt + 160 * dt * dt); ctx.rotate(rot); ctx.translate(-cx, -cy);
        ctx.beginPath(); ctx.moveTo(...tri[0]); ctx.lineTo(...tri[1]); ctx.lineTo(...tri[2]); ctx.closePath();
        ctx.save(); ctx.clip(); ctx.drawImage(buf, 0, 0, cv.width, cv.height, 0, 0, W, H); ctx.restore();
        ctx.strokeStyle = 'rgba(220,250,255,0.9)'; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.restore();
      });
    }
    if (dt < 0.05) flash('#ffffff', 0.8);
    chroma(4 * (1 - seg(dt, 0, 0.6)));
  }
  slashStorm(lt, 70, 0.08);
}, Array.from({ length: 28 }, (_, i) => [i * 0.125, 'slash', 0.3]).concat([[1.5, 'crackle', 2, 0.3], [3.5, 'shatter'], [3.6, 'glass', 0.8]]));

// 23. Inside Malevolent Shrine: Infinity holds, Gojo re-expands
shot(6, (lt) => {
  if (between(lt, 2.0, 3.0)) {
    screen(); rect(0, 0, W, H, '#000');
    drawEye(G, W / 2, H / 2, 190 + (lt - 2) * 40, lt * 3, { open: 1 });
    slashStorm(lt, 20, 0.05, { off: 2 });
    vignette(0.7);
    if (lt - 2 < 0.03) flash('#ffffff', 0.7);
    return;
  }
  drawShrine(lt, { cx: W / 2, base: 150, s: 1 });
  screenCam(shakeOf(lt, [[3.0, 0.3, 3], [4.5, 1.5, 3]])); applyCam();
  drawFront({ x: W / 2, y: 28, sc: 1.0, armL: 0.3, armR: -0.3 }, S, { open: 1, open2: 1, grin: 1 });
  if (lt > 3.4) {
    const k = seg(lt, 3.4, 5.6);
    screen(); ctx.globalAlpha = 0.9;
    for (let i = 0; i < 12; i++) {
      const a = hash(i) * TAU, l = k * (80 + hash(i * 3) * 160);
      bolt(W / 2, 80, W / 2 + Math.cos(a) * l, 80 + Math.sin(a) * l, i * 3, 8, 16, 2.4 * k, '#bff4ff');
      bolt(W / 2, 80, W / 2 + Math.cos(a) * l, 80 + Math.sin(a) * l, i * 3, 8, 16, 0.8, '#ffffff');
    }
    ctx.globalAlpha = 1; glow(W / 2, 80, 80 * k, '#bff4ff', 0.6 * k);
    applyCam();
  }
  const sign = easeOut(seg(lt, 3.0, 3.3));
  aura(W / 2, 178, 90, lt, PAL.gojo.aura, 30, 40, 0.5 + sign * 0.5);
  drawFront({ x: W / 2, y: 178, sc: 2.4, armL: lerp(0.3, SIGN[0], sign), armR: lerp(-0.3, SIGN[1], sign), sign: sign > 0.9 }, G, { open: 1, glow: 1 });
  const C = [W / 2, 136];
  ring(C[0], C[1], 46, 0.8, 'rgba(143,244,255,0.35)');
  for (let i = 0; i < 60; i++) {
    const t0 = i * 0.1, dt = lt - t0; if (dt < 0 || dt > 0.32 || between(t0, 1.9, 3.0)) continue;
    const a = hash(i * 1.7) * TAU, k = seg(dt, 0, 0.2), rr = lerp(170, 48, k);
    const x = C[0] + Math.cos(a) * rr, y = C[1] + Math.sin(a) * rr, px = -Math.sin(a) * 16, py = Math.cos(a) * 16;
    if (k < 1) slash(x - px, y - py, x + px, y + py, 0.45, { w: 1.8, bend: 0.3 });
    else { const e = dt - 0.2; ring(x, y, 2 + e * 60, 1.2 * (1 - e / 0.12), rgba('#8ff4ff', 1 - e / 0.12)); burst(e, 0.12, x, y, 6, i, { sp: 80, colors: ['#ffffff', '#bff8ff'], size: 1.2 }); }
  }
  jslam(lt, '領域展開', 3.1, 4.8, 64, 70, 17, '#bff4ff', { strokeCol: '#06205a' });
  if (lt > 5.2) flash('#dff8ff', seg(lt, 5.2, 6.0));
}, Array.from({ length: 19 }, (_, i) => [i * 0.1 + 0.2, 'ping']).concat(Array.from({ length: 30 }, (_, i) => [3.0 + i * 0.1, 'ping']),
  [[2.0, 'ting'], [2.0, 'hum', 1, 440, 0.2], [3.0, 'hit', 0.8], [3.2, 'riser', 2.8, 0.5], [3.5, 'crackle', 2.5, 0.3]]));

// 24. Infinite Void wins: Sukuna frozen by infinite information
shot(4, (lt) => {
  drawVoid(lt + 20, W / 2, 120, { holeY: 40, hole: 18 });
  jslam(lt, '無量空処', 0.2, 3.7, W / 2, H / 2, 72, 'rgba(180,240,255,0.14)', { sw: 0, shadow: false, pop: 0.2 });
  screenCam(shakeOf(lt, [[0, 0.4, 3]])); applyCam();
  const head = [215, 178 - 29 * 2.6];
  for (let i = 0; i < 46; i++) {
    const ph = frac(lt * 0.7 + hash(i)), a = hash(i * 3) * TAU, r0 = 200;
    const x = lerp(head[0] + Math.cos(a) * r0, head[0], easeIn(ph)), y = lerp(head[1] + Math.sin(a) * r0, head[1], easeIn(ph));
    ctx.globalAlpha = Math.min(1, ph * 2) * (1 - ph * 0.5);
    txt(String.fromCharCode(0x30a2 + ((i * 7 + Math.floor(lt * 12)) % 80)), x, y, 5, '#aef6ff', { shadow: false, font: JFONT });
  }
  ctx.globalAlpha = 1;
  drawFront({ x: 215, y: 178 + Math.sin(lt * 40) * 0.3, sc: 2.6, armL: 0.5, armR: -0.4 }, S, { open: 1, open2: 1, grin: 0.1, look: Math.sin(lt * 25) * 2, glow: 0.3 });
  const g = Object.assign(walk(lerp(40, 118, easeOut(seg(lt, 0, 3.8))), 178, 1, lt, 5), { sc: 2.6 });
  aura(g.x, 178, 90, lt, PAL.gojo.aura, 24, 30, 0.6);
  drawSide(g, G);
  slam(lt, 'INFINITE VOID', 0.4, 3.7, W / 2, 26, 16, '#8ff4ff', { strokeCol: '#06205a' });
}, [[0, 'hum', 4, 110, 0.3], [0, 'glitch', 1.5], [1.6, 'glitch', 1.5], [0.3, 'ting', 0.2], [1.0, 'thud'], [2.2, 'thud'], [3.3, 'thud']], [[2.0, '<Gojo> too much information?', '#ffffff']]);

// 25. The beatdown: 8-hit combo + uppercut out of the Void
const CH = [0.3, 0.72, 1.14, 1.56, 1.98, 2.4, 2.82, 3.24], UPPER = 3.9;
const CH_CAMS = [[1.0, 0, 0, 0], [1.6, 20, -40, 0.08], [1.25, -10, 10, -0.06], [1.9, 25, -30, 0.1], [1.1, 0, 20, -0.1], [1.7, 20, -45, -0.05], [1.3, -15, 0, 0.07], [2.0, 25, -40, 0]];
function comboG(lt) {
  const lq = q12(lt), x = 95;
  if (lt >= UPPER - 0.15) { const u = lq - (UPPER - 0.15); return P(x + 6, 178, 1, { sc: 2.4, armF: u < 0.15 ? 1.0 : -2.9, extF: u < 0.15 ? 0 : 3, rot: u < 0.15 ? -0.15 : -0.2, legF: -0.4, legB: 0.5 }); }
  let i = -1; CH.forEach((c, j) => { if (lq >= c - 0.12) i = j; });
  const p = Object.assign(stance(x, 178, 1, lt), { sc: 2.4 });
  if (i < 0) return p;
  const u = lq - (CH[i] - 0.12), kick = i === 3 || i === 6, alt = i % 2;
  if (u >= 0.12 && u < 0.3) {
    p.x += 5;
    if (kick) { p.legF = -1.6; p.rot = -0.3; } else if (alt) { p.armB = -Math.PI / 2; p.extB = 4; p.rot = 0.15; } else { p.armF = -Math.PI / 2; p.extF = 4; p.rot = 0.15; }
  } else if (u < 0.12 && !kick) { if (alt) p.armB = 0.9; else p.armF = 0.9; }
  return p;
}
function comboS(lt) {
  const p = P(128, 178, -1, { sc: 2.4, armF: 0.4, armB: 0.6, legF: 0.2, legB: -0.1 });
  for (const c of CH) if (between(lt, c, c + 0.22)) { p.head = -0.5; p.rot = 0.25; p.x += 3; }
  if (lt >= UPPER) { const d = lt - UPPER; p.y = 178 - d * 600; p.rot = d * 12; p.head = -0.6; p.armF = -2.8; p.armB = -2.6; }
  return p;
}
shot(6, (lt, T) => {
  const HITP = [124, 178 - 26 * 2.4];
  if (lt < 4.3) {
    drawVoid(lt + 24, W / 2, 110, { holeY: 30, hole: 16 });
    let i = -1; CH.forEach((c, j) => { if (lt >= c) i = j; });
    const [z, xo, yo, r] = lt >= UPPER ? [1.3, 0, -20, -0.12] : i < 0 ? [1.0, 0, 0, 0] : CH_CAMS[i];
    const sh = shakeOf(lt, CH.map(c => [c, 0.2, 3]).concat([[UPPER, 0.6, 8]]));
    setCam(112 + xo * 0.6, 132 + yo * 0.6, z, r, sh);
    applyCam();
    aura(95, 178, 90, lt, PAL.gojo.aura, 26, 30, 0.7);
    drawSide(comboS(lt), S);
    drawSide(comboG(lt), G);
    CH.forEach((c, j) => hitFx(lt - c, HITP[0] + (j % 3) * 2, HITP[1] + (j === 3 || j === 6 ? 16 : 0), { s: 2.2, ring: '#8ff4ff' }));
    hitFx(lt - UPPER, HITP[0], HITP[1] - 10, { s: 3.4 });
    CH.forEach((c, j) => { if (j % 2) postHit(lt - c, { imp: 0.07 }); else if (between(lt, c, c + 0.03)) flash('#ffffff', 0.6); });
    postHit(lt - UPPER, { chroma: 6, imp: 0.12 });
  } else {
    const d = lt - 4.3;
    setCam(FIN_X, -60, 1.8, 0, shakeOf(d, [[0, 0.5, 3]])); drawCity(T);
    applyCam();
    const g = stance(FIN_X, 0, 1, lt); g.head = -0.5; g.armF = -1.9;
    drawSide(g, G);
    drawSide(flyBack(FIN_X + 20, -40 - d * 500, -1, d * 12), S);
    const R = 420 * (1 - easeIn(seg(d, 0, 0.7)));
    if (R > 1) {
      const [sx, sy] = w2s(FIN_X, -18);
      screen(); ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.clip();
      drawVoid(lt + 24, W / 2, 110, { holeY: 30, hole: 16 });
      ctx.restore(); screen(); ring(sx, sy, R, 2.5, 'rgba(200,240,255,0.9)');
    }
  }
  // Minecraft-style combo counter
  let n = 0; CH.forEach(c => { if (lt >= c) n++; }); if (lt >= UPPER) n++;
  if (n > 0 && lt < 5.2) {
    const last = lt >= UPPER ? UPPER : CH[n - 1], pop = 1 + 0.8 * (1 - easeOutExpo(seg(lt, last, last + 0.15)));
    screen(); ctx.save(); ctx.translate(262, 30); ctx.scale(pop, pop); ctx.globalAlpha = 1 - seg(lt, 4.9, 5.2);
    txt(`HIT x${n}`, 0, 0, n === 9 ? 13 : 10, n === 9 ? '#ff5555' : '#ffff55', { stroke: 3 });
    ctx.restore(); ctx.globalAlpha = 1;
  }
}, CH.map(c => [c, 'hit', 0.8]).concat(CH.map(c => [c - 0.1, 'whoosh', 0.1, 0.3]), [[UPPER, 'bigHit'], [UPPER + 0.1, 'whoosh', 0.8, 0.7], [4.3, 'glass', 0.5]]));

// ======================= ACT 5: FINALE =======================
function stormClouds(lt, up) {
  screen();
  for (let i = 0; i < 9; i++) {
    const y = frac(hash(i * 2.1) + up / 300) * 260 - 50, x = hash(i * 5.3) * (W + 80) - 40, w = 60 + hash(i) * 80;
    ctx.globalAlpha = 0.6; rect(x, y, w, 10, '#2a1640'); rect(x + 10, y - 6, w * 0.6, 6, '#2a1640'); rect(x + 20, y + 10, w * 0.5, 5, '#1a0c2a');
  }
  ctx.globalAlpha = 1;
}
function skyBolts(lt, times) {
  screen();
  for (const t0 of times) {
    const d = lt - t0; if (d < 0 || d > 0.25) continue;
    const x = hash(t0 * 9) * W;
    if (d < 0.05) flash('#e0c0ff', 0.35);
    screen(); ctx.globalAlpha = 1 - d / 0.25;
    bolt(x, -5, x + (hash(t0) - 0.5) * 80, 100 + hash(t0 * 3) * 50, t0 * 7, 10, 20, 2, '#f0e0ff');
    ctx.globalAlpha = 1;
  }
}
// 26. Sukuna in the storm sky: World-Cutting Slash
shot(4, (lt, T) => {
  screenCam(shakeOf(lt, [[1.0, 0.4, 3], [2.4, 1.6, 1.5]])); drawSky(T);
  const up = easeOut(seg(lt, 0, 1.2)) * 260;
  stormClouds(lt, up);
  skyBolts(lt, [0.6, 2.2, 3.3]);
  if (lt < 1.2) streaks(lt, { n: 30, speed: 900, alpha: 0.3, angle: Math.PI / 2, dir: 1 });
  applyCam();
  const y = lt < 1.1 ? lerp(300, 140, easeOut(seg(lt, 0, 1.1))) : 140 + Math.sin(lt * 2) * 2;
  aura(W / 2, y, 90, lt, PAL.sukuna.aura, 40, 40, 0.5 + seg(lt, 1.0, 1.4) * 0.5);
  if (lt < 1.8) {
    const spin = lt < 1.1 ? -(1 - seg(lt, 0, 1.1)) * 12 : 0;
    drawSide(P(W / 2, y, 1, { sc: 2.2, rot: spin, armF: lt < 1.1 ? -2.6 : -1.2, armB: lt < 1.1 ? -2.9 : -0.8, legF: -0.3, legB: 0.3 }), S);
  } else {
    const k = easeOutBack(seg(lt, 1.8, 2.1));
    drawFront({ x: W / 2, y, sc: 2.2, armL: lerp(0.3, SIGN[0], k), armR: lerp(-0.3, -2.84, k) }, S, { open: 1, open2: 1, grin: 1, glow: 1.5 });
  }
  jslam(lt, '世界を断つ斬撃', 2.4, 4, W / 2, 30, 15, '#ffffff', { strokeCol: '#2a0006' });
  slam(lt, 'WORLD-CUTTING SLASH', 2.6, 4, W / 2, 162, 11, '#ff3048', { strokeCol: '#2a0006', jitter: 1 });
  vignette(0.5);
}, [[0, 'wind', 4, 0.4], [0.6, 'thunder'], [1.0, 'thud'], [1.1, 'boom', 1, 0.4], [2.2, 'thunder'], [2.4, 'gong'], [2.5, 'riser', 1.5, 0.4], [3.3, 'thunder']]);

// 27. Hollow Technique: Purple 200% charge
shot(5, (lt, T) => {
  const a = 0.6 + lt * 0.6, n = Math.floor(lt * 30);
  setCam(FIN_X, -32, lerp(1.8, 2.4, easeInOut(lt / 5)), lerp(-0.04, 0.04, lt / 5), [(hash(n) - 0.5) * a, (hash(n + 7) - 0.5) * a]);
  drawCity(T);
  skyBolts(lt, [0.4, 1.7, 2.9, 4.1]);
  jslam(lt, '茈', 3.0, 5, W / 2, 80, 110, 'rgba(200,120,255,0.3)', { sw: 0, shadow: false, pop: 0.4 });
  applyCam();
  for (let i = 0; i < 10; i++) {
    const ang = Math.PI + (i / 9) * Math.PI, l = 60 + hash(i) * 80;
    ctx.globalAlpha = 0.5 + 0.5 * hash(i + Math.floor(lt * 10));
    bolt(FIN_X, 1, FIN_X + Math.cos(ang) * l * seg(lt, 0.5, 3), 1 + Math.abs(Math.sin(ang)) * 3, i, 5, 3, 1.2, '#c77dff');
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 50; i++) {
    const x = FIN_X + (hash(i) - 0.5) * 300, ph = frac(hash(i * 3) + lt * 0.12 * (0.5 + hash(i * 7))), y = -ph * 180, sz = 3 + hash(i * 5) * 5;
    ctx.save(); ctx.translate(x + Math.sin(lt + i) * 3, y); ctx.rotate(ph * 6 + i); ctx.globalAlpha = seg(lt, 0, 0.8) * (1 - ph);
    ctx.drawImage(DEBRIS_TEX[i % 6][i % 4], -sz / 2, -sz / 2, sz, sz); ctx.restore();
  }
  ctx.globalAlpha = 1;
  const e = easeOut(seg(lt, 0, 0.4)), rB = 3 + 9 * easeOut(seg(lt, 0.3, 3)), L = [FIN_X - 22.5, -33], R = [FIN_X + 22.5, -33];
  aura(FIN_X, 0, 60, lt, '#6fd8ff', 20, 30, 0.8); aura(FIN_X, 0, 60, lt + 1, '#ff4060', 20, 30, 0.8);
  drawFront({ x: FIN_X, y: 0, sc: 1.5, armL: (Math.PI / 2) * e, armR: (-Math.PI / 2) * e }, G, { open: 1, glow: 1.5 });
  for (let i = 0; i < 14; i++) { const ph = frac(lt * 1.3 + hash(i)), an = hash(i) * TAU + lt * 3, dd = 20 * (1 - ph); rect(L[0] + Math.cos(an) * dd, L[1] + Math.sin(an) * dd, 1.2, 1.2, '#9fe8ff'); }
  for (let i = 0; i < 3; i++) { const k = frac(lt * 1.5 + i / 3); ring(R[0], R[1], rB + k * 16, 1, rgba('#ff4040', 1 - k)); }
  orb(L[0], L[1], rB, '#6fd0ff', '#2a6bff', lt); orb(R[0], R[1], rB, '#ff5a4a', '#ff1a1a', lt);
  if (Math.floor(lt * 20) % 2 && lt > 1) bolt(L[0], L[1], R[0], R[1], Math.floor(lt * 20), 9, 12, 1.2, '#e0b0ff');
  tint('#8a3aff', 0.12 + 0.1 * seg(lt, 2, 5));
  jslam(lt, '虚式', 0.8, 5, 58, 30, 18, '#ffffff', { strokeCol: '#2a0a4a' });
  slam(lt, 'HOLLOW TECHNIQUE', 1.0, 5, 58, 52, 6, '#e0b0ff', { strokeCol: '#2a0a4a' });
  slam(lt, 'PURPLE', 3.1, 5, W / 2, 152, 22, '#c77dff', { strokeCol: '#1a0030', jitter: 1.5 });
  slam(lt, '200%', 3.6, 5, 262, 40, 14, '#ffffff', { strokeCol: '#6a00a0', rot: -0.15, pop: 2 });
  vignette(0.5);
}, [[0.3, 'hum', 4.7, 65, 0.4], [0.3, 'hum', 4.7, 98, 0.3], [1.0, 'charge', 4, 80, 400, 0.2], [0.5, 'crackle', 4.5, 0.25], [0.4, 'thunder'], [1.7, 'thunder'], [2.9, 'thunder'], [3.0, 'gong'], [3.6, 'hit', 0.6]]);

// 28. Merge, the sky splits, both fire
shot(3, (lt, T) => {
  if (lt < 0.8) {
    setCam(FIN_X, -36, 3.0, 0, shakeOf(lt, [[0, 0.8, 2], [0.7, 0.2, 5]])); drawCity(T);
    applyCam();
    const k = easeIn(seg(lt, 0, 0.7)), C = [FIN_X, -42];
    drawFront({ x: FIN_X, y: 0, sc: 1.5, armL: lerp(Math.PI / 2, SIGN[0], k), armR: lerp(-Math.PI / 2, SIGN[1], k) }, G, { open: 1, glow: 1.5 });
    if (lt < 0.7) {
      const an = k * 9, rr = 22 * (1 - k);
      orb(C[0] - Math.cos(an) * rr, C[1] - Math.sin(an) * rr * 0.4, 12, '#6fd0ff', '#2a6bff', lt);
      orb(C[0] + Math.cos(an) * rr, C[1] + Math.sin(an) * rr * 0.4, 12, '#ff5a4a', '#ff1a1a', lt);
    } else { sparkBolts(C[0], C[1], lt, 6, 40, ['#e0b0ff'], 1.2); orb(C[0], C[1], 16 + (lt - 0.7) * 60, '#c77dff', '#8a2be2', lt); }
    tint('#8a3aff', 0.2 + k * 0.2);
    if (lt > 0.7) flash('#f0d8ff', 0.6);
    return;
  }
  if (lt < 1.6) {
    screenCam(shakeOf(lt, [[1.12, 0.4, 5]])); drawSky(T); stormClouds(lt, 260);
    applyCam();
    const k = easeIn(seg(lt, 1.02, 1.12));
    aura(200, 150, 90, lt, PAL.sukuna.aura, 30, 40, 1);
    drawSide(P(200, 150, -1, { sc: 2.2, armF: lerp(-2.9, 0.6, k), armB: 0.4, rot: -0.15 * k }), S);
    if (lt > 1.1) {
      const g = easeOut(seg(lt, 1.1, 1.2)), wv = 1 + Math.sin(lt * 40) * 0.3;
      screen();
      ctx.strokeStyle = rgba('#ff2040', 0.6); ctx.lineWidth = 6 * wv * seg(lt, 1.2, 1.5); ctx.beginPath(); ctx.moveTo(W + 10, 10); ctx.lineTo(lerp(W + 10, -10, g), lerp(10, 170, g)); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    return;
  }
  const d = lt - 1.6, k = easeIn(seg(d, 0, 0.6));
  setCam(FIN_X + 20, -115, 0.6, 0, shakeOf(d, [[0, 1.4, 3], [0.6, 0.8, 8]])); drawCity(T);
  applyCam();
  drawFront({ x: FIN_X, y: 0, sc: 1.5, armL: SIGN[0], armR: SIGN[1] }, G, { open: 1 });
  aura(FIN_X + 60, -205, 60, lt, PAL.sukuna.aura, 20, 20, 1);
  drawSide(P(FIN_X + 60, -205, -1, { sc: 1.5, armF: 0.6, armB: 0.4 }), S);
  const Pp = [FIN_X + 25, -130];
  const px = lerp(FIN_X, Pp[0], k), py = lerp(-40, Pp[1] + 20, k);
  ctx.strokeStyle = rgba('#b060ff', 0.5); ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(FIN_X, -40); ctx.lineTo(px, py); ctx.stroke();
  orb(px, py, 28, '#c77dff', '#8a2be2', lt);
  const sx = lerp(FIN_X + 60, Pp[0] + 10, k), sy = lerp(-215, Pp[1] - 20, k);
  slash(sx - 90, sy - 40, sx + 90, sy + 40, 0.45, { w: 8, bend: 0.25, glow: '#ff2040' });
  hitFx(d - 0.6, Pp[0], Pp[1], { s: 5, ring: '#e0b0ff' });
  postHit(d - 0.6, { chroma: 6, imp: 0.1 });
}, [[0, 'charge', 0.8, 200, 800, 0.3], [0.72, 'bigHit'], [1.02, 'whooshDown', 0.2, 0.8], [1.1, 'slash', 1.0], [1.6, 'boom', 1.0, 0.6], [1.6, 'whoosh', 0.6, 0.8], [2.2, 'bigHit']]);

// 29. The clash: Purple vs the world-cutting slash
shot(4, (lt, T) => {
  const sh = shakeOf(lt, [[0, 4, 4]]);
  setCam(FIN_X, -110, 0.9, 0.1, sh); drawCity(T);
  skyBolts(lt, [0.3, 1.1, 2.0, 2.7, 3.4]);
  applyCam();
  for (let i = 0; i < 40; i++) {
    const x = FIN_X - 200 + hash(i) * 400, ph = frac(hash(i * 3) + lt * 0.3), y = -20 - ph * 200, sz = 3 + hash(i * 5) * 4;
    ctx.globalAlpha = 1 - ph; ctx.drawImage(DEBRIS_TEX[i % 6][i % 4], x, y, sz, sz);
  }
  ctx.globalAlpha = 1;
  screen();
  const ang = -0.6, dx = Math.cos(ang), dy = Math.sin(ang), s = Math.sin(lt * 1.7) * 14;
  const P0 = [W / 2 + dx * s, H / 2 + dy * s];
  // purple beam from bottom-left
  const g = ctx.createLinearGradient(-40, H + 40, P0[0], P0[1]);
  g.addColorStop(0, 'rgba(138,43,226,0.1)'); g.addColorStop(1, 'rgba(199,125,255,0.9)');
  ctx.strokeStyle = g; ctx.lineWidth = 56 + Math.sin(lt * 30) * 4; ctx.beginPath(); ctx.moveTo(-40, H + 40); ctx.lineTo(P0[0] - dx * 20, P0[1] - dy * 20); ctx.stroke();
  orb(P0[0] - dx * 26, P0[1] - dy * 26, 32, '#c77dff', '#8a2be2', lt);
  // red slash energy from top-right
  const g2 = ctx.createLinearGradient(W + 40, -40, P0[0], P0[1]);
  g2.addColorStop(0, 'rgba(255,32,64,0.1)'); g2.addColorStop(1, 'rgba(255,60,80,0.85)');
  ctx.strokeStyle = g2; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(W + 40, -40); ctx.lineTo(P0[0] + dx * 20, P0[1] + dy * 20); ctx.stroke();
  const cx = P0[0] + dx * 22, cy = P0[1] + dy * 22, px = -dy * 80, py = dx * 80;
  slash(cx - px, cy - py, cx + px, cy + py, 0.4, { w: 9 + Math.sin(lt * 40) * 2, bend: -0.2, glow: '#ff2040' });
  sparkBolts(P0[0], P0[1], lt, 4, 60, ['#e0b0ff'], 1.6); sparkBolts(P0[0], P0[1], lt + 3, 4, 60, ['#ff4060'], 1.6);
  for (let i = 0; i < 40; i++) {
    const ph = frac(lt * 2 + hash(i)), side = i % 2 ? 1 : -1, sp = (hash(i * 3) * 0.6 + 0.4) * 140 * ph;
    const x = P0[0] - dy * side * sp + (hash(i * 5) - 0.5) * 20 * ph, y = P0[1] + dx * side * sp + (hash(i * 7) - 0.5) * 20 * ph;
    ctx.globalAlpha = 1 - ph; rect(x, y, 2, 2, i % 3 ? '#ffffff' : i % 2 ? '#ff4060' : '#c77dff');
  }
  ctx.globalAlpha = 1;
  glow(P0[0], P0[1], 40 + seg(lt, 3.3, 4) * 300, '#ffffff', 0.8);
  // the world splits along the slash line
  if (lt > 1.5) {
    const gap = 3 * easeOut(seg(lt, 1.5, 1.8)) + Math.sin(lt * 25) * 0.6, nx = -dy, ny = dx;
    snapshot();
    screen(); rect(0, 0, W, H, '#1a0006');
    [-1, 1].forEach(sd => {
      ctx.save(); ctx.beginPath();
      const far = 400, ax = P0[0] + dx * far, ay = P0[1] + dy * far, bx = P0[0] - dx * far, by = P0[1] - dy * far;
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx + nx * far * sd, by + ny * far * sd); ctx.lineTo(ax + nx * far * sd, ay + ny * far * sd); ctx.clip();
      ctx.drawImage(buf, 0, 0, cv.width, cv.height, nx * gap * sd, ny * gap * sd, W, H); ctx.restore();
    });
    ctx.strokeStyle = '#ff3050'; ctx.lineWidth = gap * 1.2; ctx.beginPath(); ctx.moveTo(P0[0] - dx * 400, P0[1] - dy * 400); ctx.lineTo(P0[0] + dx * 400, P0[1] + dy * 400); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; ctx.stroke();
  }
  chroma(2 + Math.sin(lt * 9) * 1.5);
  if (lt > 3.3) flash('#ffffff', seg(lt, 3.3, 4) * 0.9);
}, [[0, 'hum', 4, 50, 0.5], [0, 'crackle', 4, 0.4], [0, 'riser', 4, 0.6], [0.3, 'thunder'], [1.5, 'slash', 1.0], [1.5, 'boom', 1, 0.6], [2.0, 'thunder'], [3.3, 'charge', 0.7, 100, 2000, 0.3]]);

// 30. Explosion swallows Shinjuku
shot(2.5, (lt, T) => {
  if (lt < 0.3) { flash('#ffffff'); return; }
  const d = lt - 0.3;
  setCam(FIN_X, -60, 0.55, 0, shakeOf(d, [[0, 2.2, 6]])); drawCity(108.3);
  applyCam();
  const R = lerp(20, 900, easeOut(seg(d, 0, 1.9)));
  const g = ctx.createRadialGradient(FIN_X, 0, 0, FIN_X, 0, R);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#f0d8ff'); g.addColorStop(0.85, '#b070ff'); g.addColorStop(1, 'rgba(138,43,226,0.2)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(FIN_X, 0, R, 0, TAU); ctx.fill();
  ring(FIN_X, 0, R * 1.15, 4, rgba('#ffffff', 0.7), 0.1);
  debris(d, 2.2, FIN_X, -20, 80, 900, 420, 200, 9);
  flash('#ffffff', 1 - seg(d, 0, 0.4));
  flash('#b89878', seg(d, 1.6, 2.2));
}, [[0, 'boom', 3, 1.2], [0, 'bigHit'], [0.3, 'crumble', 2.2], [0.3, 'wind', 2.2, 0.6]]);

// 31. Aftermath: two silhouettes in the dust
shot(6, (lt, T) => {
  const k = easeInOut(lt / 6);
  setCam(lerp(FIN_X - 40, FIN_X, k), -34, lerp(1.3, 1.55, k)); drawCity(T);
  applyCam();
  for (let i = 0; i < 6; i++) { const x = FIN_X - 250 + i * 100 + hash(i) * 40; burst(frac(lt * 0.25 + hash(i)) * 4, 4, x, -5, 10, i * 31, { sp: 8, up: 16, colors: SMOKE, size: 12, shrink: -1.5, round: true, alpha: 0.45, drag: 0.5 }); }
  const br = Math.sin(lt * 3) * 0.04;
  const g = P(FIN_X + 80, 0, -1, { rot: -0.12, armF: 0.35 + br, armB: 0.2, head: 0.15, legF: -0.2, legB: 0.2 });
  const s = P(FIN_X - 80, 0, 1, { rot: 0.14, armF: 0.4 - br, armB: 0.3, head: 0.2, legF: -0.2, legB: 0.2 });
  drawSide(g, G); drawSide(s, S);
  for (let i = 0; i < 24; i++) { const ph = frac(lt * 0.15 + hash(i)); ctx.globalAlpha = 1 - ph; rect(FIN_X - 200 + hash(i * 3) * 400, -ph * 120, 1, 1, i % 2 ? '#ff9a50' : '#ffd080'); }
  ctx.globalAlpha = 1;
  screen();
  const fog = lerp(0.85, 0.3, seg(lt, 0, 3));
  for (let i = 0; i < 6; i++) { ctx.globalAlpha = fog * (0.4 + 0.3 * hash(i)); rect(frac(hash(i) + lt * 0.02 * (i % 2 ? 1 : -1)) * W * 2 - W, 30 + i * 22, W * 1.6, 30, '#b89878'); }
  ctx.globalAlpha = 1;
  if (lt > 1.5) {
    const kk = pulse(lt, 1.5, 0.8);
    applyCam(); star(g.x - 3, -31, 6 * kk, '#bff8ff'); star(s.x + 3, -31, 6 * kk, '#ff5060');
  }
  vignette(0.55); letterbox(16);
}, [[0, 'wind', 6, 0.35], [1.5, 'ting', 0.15]], [[2.5, '<Gojo> ...round two?', '#ffffff'], [4.0, '<Sukuna> heh. entertain me.', '#ffffff']]);

// 32. One more clash... to be continued
shot(3.5, (lt, T) => {
  if (lt < 0.8) {
    setCam(FIN_X, -30, lerp(1.45, 2.8, easeIn(seg(lt, 0.4, 0.8))), 0, shakeOf(lt, [[0.45, 0.35, 3]])); drawCity(T);
    if (lt > 0.45) streaks(lt, { n: 40, speed: 1400, alpha: 0.4 });
    applyCam();
    const dk = easeIn(seg(lt, 0.45, 0.8)), cr = easeOut(seg(lt, 0, 0.35));
    aura(FIN_X + 80 - dk * 66, 0, 40, lt, PAL.gojo.aura, 20, 14, cr); aura(FIN_X - 80 + dk * 66, 0, 40, lt, PAL.sukuna.aura, 20, 14, cr);
    if (lt < 0.45) {
      drawSide(P(FIN_X + 80, 0, -1, { legF: -0.5 * cr, legB: 0.5 * cr, rot: -0.3 * cr, armF: -1.2 * cr, armB: 0.8 * cr }), G);
      drawSide(P(FIN_X - 80, 0, 1, { legF: -0.5 * cr, legB: 0.5 * cr, rot: 0.3 * cr, armF: -1.2 * cr, armB: 0.8 * cr }), S);
    } else { drawSide(dashP(FIN_X + 80 - dk * 66, 0, -1), G); drawSide(dashP(FIN_X - 80 + dk * 66, 0, 1), S); }
    dust(lt - 0.45, 1, FIN_X + 80, 0, 10, 1, 9, 50); dust(lt - 0.45, 1, FIN_X - 80, 0, 10, 2, 9, 50);
    letterbox(16);
    return;
  }
  if (lt < 0.97) {
    screen(); rect(0, 0, W, H, '#000');
    setCam(FIN_X, -24, 3.0); applyCam();
    const g = P(FIN_X + 13, 0, -1, { armF: -Math.PI / 2, extF: 2, armB: 0.9, legF: -0.6, legB: 0.6, rot: -0.2, mono: '#ffffff' });
    const s = P(FIN_X - 13, 0, 1, { armF: -Math.PI / 2, extF: 2, armB: 0.9, legF: -0.6, legB: 0.6, rot: 0.2, mono: '#ff1a3c' });
    drawSide(g, G); drawSide(s, S);
    sparkBolts(FIN_X, -25, lt, 8, 70, ['#ffffff'], 2);
    if (lt < 0.84) flash('#ffffff');
    return;
  }
  screen(); rect(0, 0, W, H, '#000');
  const s = 'TO BE CONTINUED...', n = Math.floor(seg(lt, 1.1, 2.2) * s.length);
  txt(s.slice(0, n), W / 2, 80, 11, '#ffffff');
  if (lt > 2.3) {
    ctx.globalAlpha = seg(lt, 2.3, 2.8);
    txt('JUJUTSU CRAFT: SHINJUKU SHOWDOWN', W / 2, 104, 6, '#ff6a8a');
    txt('a fan animation made with pure JavaScript', W / 2, 118, 4, '#8a8aa0');
    ctx.globalAlpha = 1;
  }
}, [[0.45, 'whoosh', 0.35, 0.7], [0.8, 'bigHit'], [1.1, 'gong']]);
