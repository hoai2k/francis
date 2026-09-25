// Characters for this film: Dabura Karaba, Mahoraga, Yuka Okkotsu; wheel, domain, ship.
'use strict';
const DPAL = {
  dabura: { skin: '#d6b294', skinD: '#b8927a', mark: '#6a1a24', hair: '#f2f2f6', hairD: '#cfd0dc', horn: '#e8c84a', hornD: '#b8962a',
    pants: '#f0ece4', pantsD: '#d0cabe', belt: '#141418', eye: '#4aff8a', aura: '#ffe9a0', gold: '#ffd24a' },
  mahoraga: { skin: '#e8e4dc', skinD: '#bcb6ac', dark: '#26262e', darkD: '#18181e', wheel: '#b89a5a', wheelD: '#7a6232', wing: '#fbfbff', blade: '#dcdce8', aura: '#dcd0ff' },
  yuka: { skin: '#f3d8c4', skinD: '#d8baa4', hair: '#1c1a24', hairD: '#0e0d14', top: '#f2f2f6', topD: '#cfd0dc', leg: '#f2f2f6', legD: '#cfd0dc', shoe: '#1c1a24', eye: '#3a3050' },
};
function dLimb(py, ang, w, len, col, endCol, ext = 0, endLen = 3, deco) {
  ctx.save(); ctx.translate(0, py); ctx.rotate(ang);
  rect(-w / 2, -2 + ext, w, len, col);
  rect(-w / 2, len - 2 - endLen + ext, w, endLen, endCol);
  if (deco) deco(w, len, ext);
  ctx.restore();
}
const dpose = (x, y, f, o) => Object.assign({ x, y, f, sc: 1.25, armF: 0, armB: 0, legF: 0, legB: 0, extF: 0, extB: 0, rot: 0, head: 0, alpha: 1 }, o);
const marks = (col) => (w, len) => { rect(-w / 2, 1, w, 0.7, col); rect(-w / 2 + 1, 3, w - 1, 0.5, col); rect(-w / 2, 5, 1.5, 1.5, col); };

// ---------- Dabura (side) ----------
function drawDabura(p) {
  if (p.alpha <= 0) return;
  const P = DPAL.dabura, m = p.mono, C = c => m || c;
  ctx.save(); ctx.globalAlpha = p.alpha;
  ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
  ctx.translate(0, -16); ctx.rotate(p.rot); ctx.translate(0, 16);
  ctx.scale(p.f, 1);
  dLimb(-22, p.armB, 4.5, 12, C(P.skinD), C(P.skinD), p.extB, 3, m ? null : marks(P.mark));
  dLimb(-12, p.legB, 5, 12, C(P.pantsD), C(P.skinD), 0, 1.5);
  rect(-2.6, -24.5, 5.2, 12.5, C(P.skin));
  if (!m) { rect(-2.6, -23, 2, 1, P.mark); rect(-1, -20, 1.5, 3, P.mark); rect(0.8, -24, 1.8, 1, P.mark); rect(-2.6, -18, 5.2, 0.4, P.skinD); }
  rect(-2.8, -14, 5.6, 2.2, C(P.belt));
  dLimb(-12, p.legF, 5, 12, C(P.pants), C(P.skin), 0, 1.5, m ? null : (w) => rect(-w / 2, 7, w, 0.5, P.pantsD));
  if (p.brokenLeg && !m) { ctx.save(); ctx.translate(0, -12); ctx.rotate(p.legF); rect(-2.5, 4, 5, 4, '#6a0010'); for (let i = 0; i < 3; i++) rect(-2.5 + i * 2, 3 + i, 1.5, 0.5, '#ffe9a0'); ctx.restore(); }
  // head
  ctx.save(); ctx.translate(0, -24); ctx.rotate(p.head); ctx.translate(0, 24);
  rect(-1.2, -30, 1.4, 16, C(P.skinD)); // long ear
  if (!m) for (let i = 0; i < 5; i++) rect(-1.4, -27 + i * 2.6, 1.8, 0.7, P.gold);
  rect(-4, -32, 8, 8, C(P.skin));
  rect(-4.4, -34, 8.8, 2.6, C(P.hair)); rect(-5.2, -32, 2.6, 9, C(P.hair)); rect(-6.4, -30, 1.6, 8, C(P.hairD));
  // horn
  rect(-2, -35.5, 2.4, 2, C(P.horn)); rect(-3, -38, 2.2, 3, C(P.horn)); rect(-2.4, -41, 1.8, 3.4, C(P.hornD)); rect(-1.2, -43, 1.2, 2.4, C(P.horn));
  if (!m) {
    ctx.save(); ctx.shadowColor = P.eye; ctx.shadowBlur = 6 * (p.glow ?? 0.5);
    rect(1.2, -29.2, 2, 1.1, '#fff'); rect(2.2, -29.2, 1, 1.1, P.eye);
    ring(3.2, -31.6, 0.9, 0.3, P.mark); rect(3, -31.9, 0.8, 0.6, P.eye);
    ctx.restore();
    rect(0.2, -26.5, 3.8, 0.4, P.mark);
    rect(2.4, -25.7, 1.6, 0.5, p.grin ? '#2a0a0a' : '#7a4a3a');
  }
  ctx.restore();
  dLimb(-22, p.armF, 4.5, 12, C(P.skin), C(P.skin), p.extF, 3, m ? null : marks(P.mark));
  if (p.handGlow && !m) { ctx.save(); ctx.translate(0, -22); ctx.rotate(p.armF); glow(0, 10 + p.extF, 12, p.handGlow, 0.9); circle(0, 10 + p.extF, 2.5, '#ffffff'); ctx.restore(); }
  ctx.restore(); ctx.globalAlpha = 1;
}
// ---------- Dabura (front face) ----------
function daburaFace(x, y, s, o = {}) {
  const P = DPAL.dabura;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // long ears
  for (const sx of [-1.8, 8.4]) { rect(sx, 2, 1.4, 16, P.skinD); for (let i = 0; i < 6; i++) rect(sx - 0.2, 5 + i * 2.2, 1.8, 0.6, P.gold); }
  // horns
  for (const sd of [-1, 1]) {
    const bx = sd < 0 ? -1.2 : 7.4;
    rect(bx, -1, 1.8, 2, P.horn); rect(bx + sd * 1.2, -3.5, 1.8, 2.8, P.horn); rect(bx + sd * 1.8, -6.5, 1.6, 3.2, P.hornD); rect(bx + sd * 1.4, -8.8, 1.2, 2.5, P.horn); rect(bx + sd * 0.6, -10.2, 1, 1.6, P.hornD);
  }
  rect(0, 0, 8, 8, P.skin); rect(0, 7.2, 8, 0.8, P.skinD);
  rect(-0.6, -1.2, 9.2, 2.2, P.hair); rect(1, 1, 1.4, 0.8, P.hair); rect(5.6, 1, 1.4, 0.8, P.hair);
  const open = o.open ?? 1, k3 = o.open3 ?? open;
  const eye = (ex, ey, w, h, k) => {
    if (k <= 0.02) { rect(ex, ey + h * 0.6, w, 0.3, '#2a1a1a'); return; }
    const hh = h * k; rect(ex, ey + (h - hh) / 2, w, hh, '#ffffff');
    ctx.save(); ctx.shadowColor = P.eye; ctx.shadowBlur = 10 * (o.glow ?? 0.6) * s / 4;
    rect(ex + w * 0.3, ey + (h - hh) / 2, w * 0.45, hh, P.eye); ctx.restore();
  };
  eye(1.1, 3.8, 2.2, 1.1, open); eye(4.7, 3.8, 2.2, 1.1, open);
  ring(4, 2.2, 1.2, 0.3, P.mark); eye(3.4, 1.7, 1.2, 1.0, k3);
  rect(0.8, 3.2, 2.4, 0.4, P.mark); rect(4.8, 3.2, 2.4, 0.4, P.mark);
  rect(2.6, 6.1, 2.8, 0.5 + (o.grin ? 0.5 : 0), '#3a1414'); if (o.grin) rect(2.7, 6.1, 2.6, 0.3, '#fff');
  rect(1, 8, 6, 2, P.skin); rect(1.2, 8.2, 1.6, 1.6, P.mark); rect(5, 8.6, 1.8, 1.2, P.mark);
  ctx.restore();
}

// ---------- Mahoraga ----------
// Eight-handled wheel; rot in radians (one click = PI/4).
function drawWheel(x, y, r, rot, o = {}) {
  const P = DPAL.mahoraga;
  if (o.glow) glow(x, y, r * 2.2, '#ffe9a0', o.glow);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  for (let i = 0; i < 8; i++) {
    if (o.broken && i === 7) continue;
    ctx.save(); ctx.rotate((i / 8) * TAU);
    rect(-0.6 * r / 8, 0, 1.2 * r / 8, r, o.mono || P.wheelD);
    rect(-1.3 * r / 8, r * 0.95, 2.6 * r / 8, r * 0.28, o.mono || P.wheel);
    ctx.restore();
  }
  ring(0, 0, r * 0.62, r * 0.14, o.mono || P.wheel);
  circle(0, 0, r * 0.22, o.mono || P.wheelD); circle(0, 0, r * 0.1, o.mono || P.wheel);
  ctx.restore();
}
function drawMahoraga(p, t = 0) {
  if (p.alpha <= 0) return;
  const P = DPAL.mahoraga, m = p.mono, C = c => m || c;
  ctx.save(); ctx.globalAlpha = p.alpha;
  ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
  ctx.translate(0, -16); ctx.rotate(p.rot); ctx.translate(0, 16);
  ctx.scale(p.f, 1);
  if (!p.noArmB) dLimb(-22, p.armB, 4.5, 12, C(P.skinD), C(P.skinD), p.extB);
  else if (!m) { rect(-2, -24, 4, 3, P.skinD); circle(0, -21, 1.8, '#3a3a44'); }
  dLimb(-12, p.legB, 5, 12, C(P.darkD), C(P.skinD), 0, 2);
  rect(-3, -24.5, 6, 12.5, C(P.skin));
  if (!m) { rect(-3, -20, 6, 0.4, P.skinD); rect(-0.3, -24, 0.6, 9, P.skinD); rect(-3, -15, 6, 3, P.dark); rect(-3.4, -14, 6.8, 1, '#8a7a5a'); }
  dLimb(-12, p.legF, 5, 12, C(P.dark), C(P.skin), 0, 2);
  // head with wings over the eyes and the wheel above
  ctx.save(); ctx.translate(0, -24); ctx.rotate(p.head); ctx.translate(0, 24);
  rect(-3.5, -31, 7, 7, C(P.skin));
  if (!m) { rect(1.8, -26.2, 1.8, 0.8, '#6a4a4a'); rect(2.5, -26.6, 1, 0.4, '#8a6a6a'); }
  rect(-1.5, -31.5, 5.6, 3.4, C(P.wing)); rect(-3, -32.5, 3, 2.4, C(P.wing)); rect(-5.5, -33.5, 3, 2, C(P.wing)); rect(-6.5, -31, 3, 1.6, C(P.wing));
  if (!m) { rect(-1.5, -29, 5.6, 0.4, '#d8d8e8'); rect(-5.5, -32, 3, 0.4, '#d8d8e8'); }
  ctx.restore();
  if (!m || p.wheelMono) drawWheel(0, -41, 7, p.wheel || 0, { mono: m, glow: p.wheelGlow, broken: p.wheelBroken });
  // sword arm (Sword of Extermination)
  dLimb(-22, p.armF, 4.5, 12, C(P.skin), C(P.skin), p.extF, 3, (w, len, ext) => {
    if (p.noSword) return;
    ctx.save(); ctx.translate(0, len - 4 + ext); ctx.rotate(p.bladeRot ?? 0);
    ctx.fillStyle = m || P.blade; ctx.beginPath(); ctx.moveTo(-1.6, 0); ctx.lineTo(1.6, 0); ctx.lineTo(1, 18); ctx.lineTo(0, 22); ctx.lineTo(-1, 18); ctx.fill();
    if (!m) { rect(-0.2, 1, 0.4, 17, '#ffffff'); rect(-2.2, -0.6, 4.4, 1.4, '#8a7a5a'); }
    ctx.restore();
  });
  ctx.restore(); ctx.globalAlpha = 1;
}
function mahoragaFace(x, y, s, o = {}) {
  const P = DPAL.mahoraga;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  drawWheel(4, -6, 6.5, o.wheel || 0, { glow: o.wheelGlow });
  rect(0, 0, 8, 8, P.skin); rect(0, 7.2, 8, 0.8, P.skinD);
  // two pairs of wings over the eyes
  rect(-1, 2, 4.6, 2.6, P.wing); rect(4.4, 2, 4.6, 2.6, P.wing); rect(-2.6, 1, 3, 2, P.wing); rect(7.6, 1, 3, 2, P.wing);
  rect(-1, 4, 4.6, 0.5, '#d0d0e0'); rect(4.4, 4, 4.6, 0.5, '#d0d0e0');
  rect(2.4, 6, 3.2, 0.9, '#6a4a4a'); rect(2.8, 6.1, 2.4, 0.3, '#9a7a7a');
  rect(1, 8, 6, 2, P.skin);
  ctx.restore();
}

// ---------- Yuka ----------
function drawYuka(p) {
  if (p.alpha <= 0) return;
  const P = DPAL.yuka;
  ctx.save(); ctx.globalAlpha = p.alpha; ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
  ctx.translate(0, -16); ctx.rotate(p.rot); ctx.translate(0, 16); ctx.scale(p.f, 1);
  dLimb(-22, p.armB, 3.5, 11, P.topD, P.skinD, 0);
  dLimb(-12, p.legB, 3.5, 12, P.legD, P.shoe, 0, 2);
  rect(-2, -24, 4, 12.5, P.top); rect(-2, -14, 4, 1, '#3a3a4a');
  dLimb(-12, p.legF, 3.5, 12, P.leg, P.shoe, 0, 2);
  rect(-4, -32, 8, 8, P.skin); rect(-4.5, -33.5, 9, 3, P.hair); rect(-5, -31, 3, 10, P.hair); rect(2.5, -31, 2, 2.5, P.hair);
  if (p.eyes === 0) rect(1.4, -28.5, 2, 0.4, '#2a1a1a'); else { rect(1.2, -29.2, 2, 1.2, '#fff'); rect(2.2, -29.2, 1, 1.2, P.eye); }
  dLimb(-22, p.armF, 3.5, 11, P.top, P.skin, 0);
  ctx.restore(); ctx.globalAlpha = 1;
}
function yukaFace(x, y, s, o = {}) {
  const P = DPAL.yuka;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(-1.6, 0, 11.2, 10, P.hair);
  rect(0, 0, 8, 8, P.skin); rect(0, 7.2, 8, 0.8, P.skinD);
  rect(-0.6, -1.4, 9.2, 3, P.hair); rect(0.5, 1.5, 3, 1.2, P.hair); rect(4.5, 1.5, 3.2, 1.4, P.hair);
  const k = o.open ?? 1;
  for (const ex of [1.2, 4.6]) { if (k > 0.1) { rect(ex, 3.8, 2.2, 1.3 * k, '#fff'); rect(ex + 0.6, 3.8, 1.1, 1.3 * k, P.eye); } else rect(ex, 4.4, 2.2, 0.35, '#2a1a1a'); }
  rect(3.2, 6.2, 1.6, 0.4, '#b06a6a');
  rect(0.6, 8, 6.8, 2.2, P.top); rect(3.4, 8, 1.2, 2.2, '#3a3a4a');
  ctx.restore();
}

// ---------- scenery extras ----------
function simurianShip(T, a = 1) {
  screen(); ctx.globalAlpha = a;
  const x = 230 - cam.x * 0.03, y = 34 + Math.sin(T * 0.5) * 1.5;
  ctx.fillStyle = '#16121e'; ctx.beginPath(); ctx.ellipse(x, y, 70, 10, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - 6, 26, 9, 0, Math.PI, 0); ctx.fill();
  for (let i = 0; i < 12; i++) rect(x - 60 + i * 11, y + 2, 2, 1.2, Math.floor(T * 3 + i) % 3 ? '#4aff8a' : '#1a3a2a');
  glow(x, y + 12, 40, '#4aff8a', 0.15);
  ctx.globalAlpha = 1;
}
// Dabura's domain (its name is not given here): a sea of light under a white sun.
function drawLightDomain(t, o = {}) {
  screen();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fff8e0'); g.addColorStop(0.55, '#ffe9a0'); g.addColorStop(1, '#c89a40');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const dim = o.dim || 0;
  if (dim) { ctx.globalAlpha = dim; rect(0, 0, W, H, '#0a0806'); ctx.globalAlpha = 1; }
  // white sun with a corona
  const sx = W / 2, sy = 30;
  glow(sx, sy, 80, '#ffffff', 0.9 * (1 - dim));
  circle(sx, sy, 16, mix('#ffffff', '#6a5a3a', dim)); circle(sx, sy, 11, mix('#fff8d0', '#4a3a1a', dim));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + t * 0.2; ctx.strokeStyle = rgba('#ffffff', 0.5 * (1 - dim)); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 26, sy + Math.sin(a) * 26); ctx.lineTo(sx + Math.cos(a) * 40, sy + Math.sin(a) * 40); ctx.stroke(); }
  // mirror floor
  rect(0, 130, W, 50, rgba('#fff4d0', 0.5)); rect(0, 130, W, 0.8, '#ffffff');
  for (let i = 0; i < 12; i++) rect(0, 134 + i * 4, W, 0.4, rgba('#c89a40', 0.3));
  // sure-hit pillars of light
  for (let i = 0; i < 10; i++) {
    const ph = frac(t * 1.3 + hash(i)), x = hash(i * 3.3 + Math.floor(t * 1.3 + hash(i))) * W;
    ctx.globalAlpha = (1 - ph) * 0.8 * (1 - dim); rect(x - 3, 0, 6, 132, '#ffffff'); rect(x - 7, 0, 14, 132, rgba('#fff0b0', 0.4)); ring(x, 131, 6 + ph * 20, 1, '#ffffff', 0.25);
  }
  ctx.globalAlpha = 1;
}
function shadowPool(x, y, r, t) {
  ctx.fillStyle = '#050508'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.18, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 10; i++) { const a = hash(i) * TAU + t; rect(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.15 - frac(t + hash(i)) * 8, 1.5, 3, '#1a1624'); }
}
