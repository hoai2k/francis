// Yuji Itadori and Aoi Todo (with his vibraslap prosthetic hand), plus Boogie Woogie effects.
'use strict';
const HPAL = {
  yuji: { skin: '#e3b089', skinD: '#c8966f', hair: '#f28aa6', hairD: '#c96683', top: '#262a45', topD: '#1b1e33', leg: '#262a45', legD: '#1b1e33', shoe: '#d8453a', aura: '#4aa8ff' },
  todo: { skin: '#b8835e', skinD: '#9a6a4a', hair: '#141418', hairD: '#0a0a0e', top: '#b8835e', topD: '#9a6a4a', leg: '#4a3a2e', legD: '#3a2c22', shoe: '#141418', aura: '#ffd24a' },
};
function drawVibraslap(scale = 1) {
  ctx.save(); ctx.scale(scale, scale);
  rect(-1.5, 0, 3, 3, '#6a3a1a'); // grip / box
  ctx.strokeStyle = '#c0c0c8'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, 3); ctx.quadraticCurveTo(4, 6, 1, 10); ctx.stroke();
  circle(1, 10.5, 2, '#8a5a2a'); rect(0.2, 9.8, 0.8, 0.8, '#c08a50');
  ctx.restore();
}
function drawHero(p, kind) {
  if (p.alpha <= 0) return;
  const P = HPAL[kind], m = p.mono, C = c => m || c, td = kind === 'todo';
  ctx.save(); ctx.globalAlpha = p.alpha;
  ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
  ctx.translate(0, -16); ctx.rotate(p.rot); ctx.translate(0, 16);
  ctx.scale(p.f, 1);
  const bw = td ? 5.5 : 4;
  limb(-22, p.armB, C(P.topD), C(P.skinD), 12, p.extB);
  limb(-12, p.legB, C(P.legD), C(P.shoe), 12, 0, 2);
  rect(-bw / 2, -24, bw, 12.5, C(P.top));
  if (!m) {
    if (td) { rect(-bw / 2, -20, bw, 0.4, P.skinD); rect(-0.3, -24, 0.6, 6, P.skinD); rect(-bw / 2, -14, bw, 1.5, '#2a2018'); }
    else { rect(-3.5, -25, 2.5, 5, '#b83232'); rect(-2, -14, 4, 1, '#e9c46a'); }
  }
  limb(-12, p.legF, C(P.leg), C(P.shoe), 12, 0, 2);
  ctx.save(); ctx.translate(0, -24); ctx.rotate(p.head); ctx.translate(0, 24);
  rect(-4, -32, 8, 8, C(P.skin));
  if (td) {
    rect(-4.5, -34, 9, 3, C(P.hair)); rect(-4.6, -32, 3, 5, C(P.hair)); rect(-7, -36, 4, 3, C(P.hair)); rect(-8.5, -37, 2.5, 2.5, C(P.hairD));
    if (!m) { rect(1.2, -29.2, 2, 1, '#fff'); rect(2.2, -29.2, 1, 1, '#2a1a10'); rect(1.5, -31, 1, 5.5, '#7a3a2a'); rect(1, -30.3, 3, 0.6, P.hairD); rect(1.8, -25.9, 2.2, 0.7, '#3a1a10'); }
  } else {
    rect(-4, -33, 8, 3, C(P.hair)); rect(-4, -30, 3, 3, C(P.hair)); rect(-3, -34, 2, 1, C(P.hair)); rect(0, -34.5, 2, 1.5, C(P.hair)); rect(2.5, -33.5, 2, 1, C(P.hairD)); rect(2, -30, 2, 1, C(P.hair));
    if (!m) { rect(1, -29, 2, 1.5, '#fff'); rect(2.2, -29, 0.8, 1.5, '#4a2b1a'); rect(0.6, -27.4, 1.6, 0.3, '#8a3a3a'); rect(2.5, -26, 1.5, 0.6, p.grin ? '#3a1010' : '#8a4a3a'); }
  }
  ctx.restore();
  // front arm: Todo's is the vibraslap prosthetic
  ctx.save(); ctx.translate(0, -22); ctx.rotate(p.armF);
  rect(-2, -2 + p.extF, 4, 12, C(P.top));
  if (td && !m) { ctx.translate(0, 8.5 + p.extF); ctx.rotate(p.slapRot || 0); drawVibraslap(1); }
  else rect(-2, 7 + p.extF, 4, 3, C(P.skin));
  ctx.restore();
  if (p.glow && !m) { ctx.save(); ctx.translate(0, -22); ctx.rotate(p.armF); glow(0, 10 + p.extF, 10, p.glow, 0.8); ctx.restore(); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function heroFace(kind, x, y, s, o = {}) {
  const P = HPAL[kind], td = kind === 'todo';
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(0, 0, 8, 8, P.skin); rect(0, 7.2, 8, 0.8, P.skinD);
  const k = o.open ?? 1;
  for (const ex of [1.1, 4.7]) { if (k > 0.1) { rect(ex, 3.6, 2.2, 1.2 * k, '#fff'); rect(ex + 0.7, 3.6, 0.9, 1.2 * k, td ? '#2a1a10' : '#6a3a1a'); } else rect(ex, 4.1, 2.2, 0.35, '#2a1a1a'); }
  if (td) {
    rect(0.8, 2.9, 2.6, 0.6, P.hairD); rect(4.6, 2.9, 2.6, 0.6, P.hairD);
    rect(5.4, 1.8, 0.8, 5, '#7a3a2a'); // scar
    rect(2.2, 6.1, 3.6, 0.6 + (o.grin ? 0.5 : 0), '#3a1a10'); if (o.grin) rect(2.3, 6.1, 3.4, 0.3, '#fff');
    rect(-0.6, -1.4, 9.2, 2.4, P.hair); rect(1.5, -3.6, 5, 2.4, P.hair); rect(3, -5, 2, 1.6, P.hairD); rect(-1, -0.2, 1.2, 3, P.hair); rect(7.8, -0.2, 1.2, 3, P.hair);
    rect(0.4, 8, 7.2, 2.2, P.skin); rect(3.6, 8, 0.8, 2.2, P.skinD);
  } else {
    rect(0.9, 2.9, 2.5, 0.4, '#8a4a5a'); rect(4.6, 2.9, 2.5, 0.4, '#8a4a5a');
    rect(1, 5.1, 1.4, 0.3, '#8a3a3a'); // cheek scar
    rect(2.6, 6.2, 2.8, 0.5 + (o.grin ? 0.4 : 0), '#3a1010');
    rect(-0.6, -1.2, 9.2, 2.2, P.hair); [[-1, -2.4, 2, 1.6], [1.2, -3.4, 2, 2.4], [3.4, -3.8, 2, 2.8], [5.6, -3.2, 2, 2.2], [7, -2, 1.6, 1.4]].forEach(r => rect(...r, P.hair));
    rect(-1, -0.2, 1, 2.5, '#3a2226'); rect(8, -0.2, 1, 2.5, '#3a2226');
    rect(0.6, 8, 6.8, 2.2, P.top); rect(0.2, 8, 1.6, 2.2, '#b83232'); rect(6.2, 8, 1.6, 2.2, '#b83232');
  }
  ctx.restore();
}
// ---------- Boogie Woogie ----------
// dt = time since the swap. Draws a flash at a position that was just swapped.
function swapFx(dt, x, y) {
  if (dt < 0 || dt > 0.45) return;
  applyCam();
  const k = dt / 0.45;
  if (dt < 0.06) { rect(x - 5, y - 40, 10, 44, '#ffffff'); glow(x, y - 18, 30, '#fff6c0', 0.9); }
  ring(x, y - 18, 6 + k * 34, 2.5 * (1 - k), rgba('#ffffff', 1 - k));
  ring(x, y - 18, 4 + k * 20, 1.2 * (1 - k), rgba('#ffd24a', 1 - k));
  burst(dt, 0.45, x, y - 18, 16, x * 3 + y, { sp: 130, colors: ['#ffffff', '#ffd24a', '#9ff0ff'], size: 1.6, drag: 3 });
}
// Sound-wave ripples coming off the vibraslap.
function slapWaves(dt, x, y) {
  if (dt < 0 || dt > 0.6) return;
  applyCam();
  for (let i = 0; i < 3; i++) { const k = seg(dt, i * 0.08, 0.5 + i * 0.08); if (k > 0 && k < 1) { ctx.strokeStyle = rgba('#ffd24a', 1 - k); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 4 + k * 26, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 4 + k * 26, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke(); } }
}
// ---------- Heian-era Sukuna: four arms, second face, belly mouth ----------
const HEIAN = { skin: '#e8b894', skinD: '#c99a78', mark: '#1a0a0e', hair: '#f08aa6', hairD: '#c25c7a', robe: '#f2ece0', robeD: '#cfc6b8', sash: '#1a1a22', leg: '#1a1a22', legD: '#101016', eye: '#ff2238' };
function heianArm(py, ang, ext, col) {
  ctx.save(); ctx.translate(0, py); ctx.rotate(ang);
  rect(-2.2, -2 + ext, 4.4, 12, col); rect(-2.2, 7 + ext, 4.4, 3, HEIAN.skin);
  rect(-2.2, 6.2 + ext, 4.4, 0.5, HEIAN.mark); rect(-2.2, 8.4 + ext, 4.4, 0.4, HEIAN.mark);
  ctx.restore();
}
function drawHeian(p) {
  if (p.alpha <= 0) return;
  const P = HEIAN, m = p.mono, C = c => m || c;
  ctx.save(); ctx.globalAlpha = p.alpha;
  ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
  ctx.translate(0, -16); ctx.rotate(p.rot); ctx.translate(0, 16);
  ctx.scale(p.f, 1);
  ctx.save(); ctx.translate(-1.8, 0); heianArm(-18, p.armB2 ?? p.armB + 0.7, p.extB2 || 0, C(P.skinD)); ctx.restore(); heianArm(-22, p.armB, p.extB, C(P.robeD));
  limb(-12, p.legB, C(P.legD), C(P.legD), 12, 0, 2);
  rect(-3, -24.5, 6, 13, C(P.robe));
  if (!m) {
    rect(-3, -24.5, 2.5, 5, P.skin); rect(-1.5, -22, 0.4, 3, P.mark);
    rect(-3.2, -15, 6.4, 2.2, P.sash);
    rect(0.6, -19.6, 2.4, 2.2, '#3a0a0e'); rect(0.8, -19.6, 2, 0.5, '#fff'); rect(0.8, -18, 2, 0.4, '#fff'); // belly mouth
  }
  limb(-12, p.legF, C(P.leg), C(P.legD), 12, 0, 2);
  ctx.save(); ctx.translate(0, -24.5); ctx.rotate(p.head); ctx.translate(0, 24.5);
  rect(-4, -32.5, 8, 8, C(P.skin));
  rect(-4.5, -34, 8.5, 3, C(P.hair)); rect(-5.5, -32.5, 3.5, 5, C(P.hair)); rect(-7, -35, 3.5, 2, C(P.hair)); rect(-2, -35.8, 3.5, 2, C(P.hair)); rect(1.6, -35, 2.5, 1.4, C(P.hairD)); rect(-7.5, -32, 2, 2, C(P.hairD));
  if (!m) {
    // second face: a mask-like plate on the back half with its own eye
    rect(-3.8, -31, 3, 6, P.skinD); rect(-3.2, -29.5, 1.8, 1, P.eye); rect(-3.5, -27, 2.4, 0.5, P.mark);
    rect(1, -29.4, 2.2, 1.2, '#fff4e0'); rect(2.2, -29.4, 1, 1.2, P.eye);
    rect(1.4, -27.6, 1.6, 0.8, P.eye); rect(0.2, -27.9, 3.6, 0.35, P.mark); rect(0.8, -30.3, 3, 0.5, P.mark);
    rect(1.8, -25.9, 2.2, 0.9, '#2a0a0a'); rect(2, -25.9, 2, 0.35, '#fff');
  }
  ctx.restore();
  ctx.save(); ctx.translate(1.6, 0); heianArm(-18, p.armF2 ?? p.armF + 0.7, p.extF2 || 0, C(P.skin)); ctx.restore();
  heianArm(-22, p.armF, p.extF, C(P.robe));
  ctx.restore(); ctx.globalAlpha = 1;
}
function heianFace(x, y, s, o = {}) {
  const P = HEIAN;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(0, 0, 8, 8, P.skin); rect(0, 7.2, 8, 0.8, P.skinD);
  // right side: the second face, a bone-like mask
  rect(4.4, 0.6, 3.8, 7, '#d8c8b0'); rect(4.6, 0.6, 0.3, 7, P.mark);
  rect(5.2, 3.2, 2.4, 1.2, P.eye); rect(5.6, 3.2, 0.8, 1.2, '#1a0205'); rect(5, 5.8, 2.8, 0.4, P.mark); rect(5.4, 6.4, 2, 0.8, '#2a0a0a');
  const k = o.open ?? 1;
  if (k > 0.1) { rect(1.1, 3.4, 2.2, 1.2 * k, '#fff4e0'); rect(1.8, 3.4, 0.9, 1.2 * k, P.eye); rect(1.5, 5, 1.5, 0.8 * k, P.eye); } else rect(1.1, 4, 2.2, 0.3, '#2a1a1a');
  rect(0.8, 2.8, 2.7, 0.5, P.mark); rect(0, 4.9, 1.2, 0.35, P.mark); rect(3.2, 1.3, 1.6, 0.4, P.mark);
  const g = o.grin ?? 1; rect(1.6, 6.2, 2.8, 0.5 + 0.7 * g, '#2a0a0a'); rect(1.7, 6.2, 2.6, 0.35, '#fff');
  rect(-0.6, -1.2, 9.2, 2.3, P.hair); [[-1.4, -2.6, 2.2, 2], [0.8, -3.8, 1.8, 2.6], [2.8, -4.5, 2, 3.2], [4.9, -4, 1.8, 2.8], [6.8, -2.8, 2.2, 2], [-1.4, 0, 1.2, 3], [8.2, 0, 1.2, 3]].forEach(r => rect(...r, P.hair));
  rect(0.2, 8, 7.6, 2.2, P.robe); rect(0.2, 8, 3, 2.2, P.skin); rect(3.2, 8, 0.5, 2.2, P.robeD);
  // extra arms at the shoulders
  rect(-3.5, 8.6, 3.2, 1.6, P.robeD); rect(8.3, 8.6, 3.2, 1.6, P.robeD);
  ctx.restore();
}
