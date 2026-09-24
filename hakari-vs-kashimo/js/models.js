// Models: Hakari, Kashimo (with staff), Panda; harbor, pachinko domain, sea.
'use strict';
const PAL = {
  hakari: { skin: '#e2b48c', skinD: '#c49670', hair: '#50505e', hairD: '#2a2a34', hairL: '#74748a', top: '#23262f', topD: '#16181f', leg: '#23262f', legD: '#16181f',
    shoe: '#0c0c10', shoeD: '#060608', eye: '#2a1a10', aura: '#ff4fb0', gold: '#ffd24a' },
  kashimo: { skin: '#f1d8c8', skinD: '#d6b8a6', hair: '#c4e8f6', hairD: '#8cc0da', top: '#e6e2d6', topD: '#c6c0b0', leg: '#1c1c26', legD: '#121218',
    shoe: '#0c0c10', shoeD: '#060608', eye: '#4fc8ff', aura: '#6fd8ff' },
};
function limb(py, ang, col, endCol, len, ext = 0, endLen = 3, extra) {
  ctx.save(); ctx.translate(0, py); ctx.rotate(ang);
  rect(-2, -2 + ext, 4, len, col);
  rect(-2, len - 2 - endLen + ext, 4, endLen, endCol);
  if (extra) extra(len - 3 + ext);
  ctx.restore();
}
function pose(x, y, f, o) {
  return Object.assign({ x, y, f, sc: 1.1, armF: 0, armB: 0, legF: 0, legB: 0, extF: 0, extB: 0, rot: 0, head: 0, alpha: 1 }, o);
}
// Kashimo's staff, held at the hand end of an arm (local coords of the forearm).
function staff(hy, o) {
  ctx.save(); ctx.translate(0, hy); ctx.rotate(o.staffRot ?? 0);
  if (o.charged) { glow(8, 0, 14, '#6fd8ff', 0.6); }
  rect(-14, -0.9, 38, 1.8, o.mono || '#3a2616');
  if (!o.mono) { rect(-14, -1.1, 2, 2.2, '#c8a040'); rect(22, -1.1, 2, 2.2, '#c8a040'); rect(4, -1.1, 1.2, 2.2, '#c8a040'); }
  if (o.charged && !o.mono) { const s = Math.floor(o.t * 24); for (let i = 0; i < 3; i++) bolt(-12 + i * 12, 0, -6 + i * 12, (hash(s + i) - 0.5) * 6, s + i, 3, 3, 0.6, '#dff8ff'); }
  ctx.restore();
}

function drawSide(p, kind) {
  if (p.alpha <= 0) return;
  const P = PAL[kind], m = p.mono, C = c => m || c, kas = kind === 'kashimo';
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
  ctx.translate(0, -16); ctx.rotate(p.rot); ctx.translate(0, 16);
  ctx.scale(p.f, 1);
  if (!p.noArmB) limb(-22, p.armB, C(P.topD), C(P.skinD), 12, p.extB);
  limb(-12, p.legB, C(P.legD), C(P.shoeD), 12, 0, 2);
  rect(-2, -24, 4, 12.5, C(P.top));
  if (!m) {
    if (kas) { rect(-2.5, -25, 5, 2.5, P.topD); rect(-2, -14, 4, 1.3, '#1c1c26'); rect(0.8, -22, 1, 8, P.topD); }
    else { rect(0.8, -24, 1.2, 10, '#e8e4dc'); rect(1.2, -21, 0.5, 0.5, P.gold); rect(-2, -14, 4, 1, '#0c0c10'); }
    if (p.hole) { circle(1, -15, 2.2, '#3a0008'); circle(1, -15, 1.2, '#6fd8ff'); }
  }
  limb(-12, p.legF, C(P.leg), C(P.shoe), 12, 0, 2);
  ctx.save(); ctx.translate(0, -24); ctx.rotate(p.head); ctx.translate(0, 24);
  rect(-4, -32, 8, 8, C(P.skin));
  if (kas) {
    rect(-4.5, -34, 9, 3, C(P.hair)); rect(-5, -32, 3, 9, C(P.hair)); rect(-7.5, -35, 3.5, 2.5, C(P.hair));
    rect(-8.5, -33, 2.2, 11, C(P.hairD)); rect(2, -31.5, 2.6, 2.2, C(P.hair)); rect(-2, -35.5, 4, 1.5, C(P.hair));
    if (!m) {
      rect(-1, -29, 1, 2, P.skinD);
      rect(1.2, -29.3, 2, 1.1, '#fff'); ctx.save(); ctx.shadowColor = P.eye; ctx.shadowBlur = 6; rect(2.2, -29.3, 1, 1.1, P.eye); ctx.restore();
      rect(2.6, -26, 1.4, 0.5, p.grin ? '#3a1010' : '#b08070'); if (p.grin) rect(2.6, -26, 1.4, 0.25, '#fff');
    }
  } else {
    rect(-4.5, -34, 9, 2.5, C(P.hair)); rect(-6.5, -36, 4, 2.2, C(P.hair)); rect(-3.5, -37.5, 4, 2.5, C(P.hair)); rect(0.2, -37, 3.6, 2.2, C(P.hair));
    rect(2.8, -35.8, 2.6, 1.6, C(P.hair)); rect(-8, -35, 2, 1.2, C(P.hairD)); rect(-4.6, -32, 2.5, 4, C(P.hairD));
    if (!m) { rect(-3, -37.4, 3, 0.6, P.hairL); rect(0.5, -36.9, 2.5, 0.5, P.hairL); }
    if (!m) {
      rect(-1, -29, 1, 2, P.skinD); rect(-0.8, -27.3, 0.7, 0.7, P.gold);
      rect(1.2, -29.3, 2, 0.9, '#fff'); rect(2.3, -29.3, 0.8, 0.9, P.eye); rect(1, -30.3, 3, 0.5, P.hairD);
      rect(1.8, -26.2, 2.4, 0.8, '#3a1010'); rect(1.9, -26.2, 2.2, 0.35, '#fff');
    }
  }
  ctx.restore();
  if (!p.noArmF) limb(-22, p.armF, C(P.top), C(P.skin), 12, p.extF, 3, p.staff ? hy => staff(hy, { staffRot: p.staffRot, charged: p.charged, mono: m, t: p.t || 0 }) : null);
  else if (!m) { ctx.save(); ctx.translate(0, -22); rect(-2, -2, 4, 3, P.top); circle(0, 1.2, 1.6, '#8a0010'); ctx.restore(); }
  if (p.charges && !m) { for (let i = 0; i < p.charges; i++) txt('+', -1 + (i % 2) * 3, -26 + i * 4, 3, '#dff8ff', { shadow: false }); }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Front view model for hand signs and talking shots.
function drawFront(p, kind, fo = {}) {
  const P = PAL[kind], m = p.mono, C = c => m || c, kas = kind === 'kashimo';
  ctx.save(); ctx.globalAlpha = p.alpha ?? 1;
  ctx.translate(p.x, p.y); ctx.scale(p.sc || 1, p.sc || 1); ctx.rotate(p.rot || 0);
  const leg = (px, c, s) => { rect(px - 2, -12, 4, 12, c); rect(px - 2, -2, 4, 2, s); };
  leg(-2, C(P.legD), C(P.shoe)); leg(2, C(P.leg), C(P.shoe));
  rect(-4, -24, 8, 12.5, C(P.top));
  if (!m) {
    if (kas) { rect(-4, -24, 8, 2.5, P.topD); rect(-4, -14, 8, 1.3, '#1c1c26'); }
    else { rect(-1.2, -24, 2.4, 10, '#e8e4dc'); rect(-0.3, -21, 0.6, 0.6, P.gold); }
  }
  const arm = (px, a, c) => { ctx.save(); ctx.translate(px, -22); ctx.rotate(a); rect(-2, -2, 4, 12, c); rect(-2, 7, 4, 3, C(P.skin)); ctx.restore(); };
  if (!p.noArmL) arm(-6, p.armL || 0, C(P.topD)); else if (!m) { rect(-8, -24, 4, 3, P.topD); circle(-6, -21, 1.5, '#8a0010'); }
  arm(6, p.armR || 0, C(P.top));
  if (p.sign && !m) { rect(-2, -21, 4, 3.2, P.skin); rect(-1.5, -25, 1.2, 4, P.skin); rect(0.4, -25, 1.2, 4, P.skinD); }
  if (m) rect(-4, -32, 8, 8, m); else drawFace(kind, -4, -32, 1, fo);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawFace(kind, x, y, s, o = {}) {
  const P = PAL[kind];
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(0, 0, 8, 8, P.skin); rect(0, 7.2, 8, 0.8, P.skinD); rect(-0.4, 3, 0.5, 2, P.skinD); rect(7.9, 3, 0.5, 2, P.skinD);
  const eye = (ex, ey, w, h, iris, iw, k) => {
    if (k <= 0.02) { rect(ex, ey + h * 0.6, w, 0.3, '#2a1a1a'); return; }
    const hh = h * k, yy = ey + (h - hh) / 2;
    rect(ex, yy, w, hh, '#ffffff');
    ctx.save(); if (o.glow) { ctx.shadowColor = iris; ctx.shadowBlur = 10 * o.glow * s / 4; }
    rect(ex + (w - iw) / 2, yy, iw, hh, iris); ctx.restore();
    rect(ex + (w - iw) / 2 + 0.1, yy + 0.1, iw * 0.35, Math.min(0.35, hh * 0.4), '#ffffff');
  };
  const open = o.open ?? 1;
  if (kind === 'hakari') {
    eye(1.1, 3.6, 2.2, 1.0, P.eye, 0.9, open); eye(4.7, 3.6, 2.2, 1.0, P.eye, 0.9, open);
    rect(0.9, 2.8, 2.6, 0.5, P.hairD); rect(4.5, 2.8, 2.6, 0.5, P.hairD);
    const g = o.grin ?? 1;
    rect(2, 5.9, 4, 0.6 + g * 0.7, '#3a1010'); rect(2.1, 5.9, 3.8, 0.35, '#fff'); if (g > 0.5) rect(2.3, 6.4 + g * 0.5, 3.4, 0.3, '#fff');
    rect(-0.5, 4.6, 0.6, 0.6, P.gold); rect(7.9, 4.6, 0.6, 0.6, P.gold);
    const hc = P.hair, hd = P.hairD;
    rect(-0.6, -1.4, 9.2, 2.4, hc);
    [[-0.8, -3, 2.2, 2], [1, -4.4, 2.2, 3.2], [3, -5.2, 2.2, 4], [5, -4.4, 2.2, 3.2], [6.8, -3, 2, 2]].forEach(r => rect(...r, hc));
    [[1.2, -4.2, 1.4, 0.5], [3.2, -5, 1.4, 0.5], [5.2, -4.2, 1.4, 0.5]].forEach(r => rect(...r, P.hairL)); rect(2.6, -1.4, 3, 0.8, hd);
    rect(-1, -0.4, 1.2, 3.4, hd); rect(7.8, -0.4, 1.2, 3.4, hd);
    rect(0.6, 8, 6.8, 2.2, P.top); rect(3, 8, 2, 2.2, '#e8e4dc');
  } else {
    eye(1.1, 3.5, 2.2, 1.1, P.eye, 1.0, open); eye(4.7, 3.5, 2.2, 1.1, P.eye, 1.0, open);
    rect(3.2, 6.2, 1.6, 0.4, o.grin ? '#3a1010' : '#b08070'); if (o.grin) { rect(2.4, 6, 3.2, 0.7, '#3a1010'); rect(2.5, 6, 3, 0.3, '#fff'); }
    const hc = P.hair, hd = P.hairD;
    rect(-0.8, -1.4, 9.6, 3, hc); rect(-1.4, 0, 1.6, 7, hc); rect(7.8, 0, 1.6, 7, hc);
    rect(1, 1.4, 2, 1.6, hc); rect(4, 1.4, 1.4, 1.2, hc); rect(6, 1.4, 1.6, 1.8, hc);
    rect(2, -3.2, 4, 2, hc); rect(-2.4, 2, 1.2, 8, hd); rect(9.2, 2, 1.2, 8, hd);
    rect(0.6, 8, 6.8, 2.2, P.top); rect(0.6, 8, 6.8, 0.8, P.topD);
  }
  ctx.restore();
}
function drawPanda(x, y, s = 1.1, down = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (down) {
    rect(-18, -10, 26, 10, '#f0f0f0'); rect(-18, -10, 26, 3, '#1a1a1a'); rect(-24, -9, 8, 9, '#1a1a1a');
    rect(8, -12, 11, 11, '#f0f0f0'); rect(8, -14, 3, 3, '#1a1a1a'); rect(16, -14, 3, 3, '#1a1a1a');
    rect(10, -9, 2.5, 2, '#1a1a1a'); rect(15, -9, 2.5, 2, '#1a1a1a'); rect(10.8, -8.6, 0.8, 0.8, '#fff'); rect(13, -5, 2, 1, '#1a1a1a');
    rect(-4, -4, 6, 4, '#1a1a1a');
  }
  ctx.restore();
}
function aura(x, y, h, t, col, n = 26, spread = 14, a = 1) {
  glow(x, y - h / 2, h * 0.9, col, 0.35 * a);
  for (let i = 0; i < n; i++) {
    const ph = frac(t * (1.2 + hash(i) * 0.8) + hash(i * 3.3)), px = x + (hash(i + 1) - 0.5) * spread + Math.sin(t * 6 + i) * 1.5 * ph;
    ctx.globalAlpha = a * (1 - ph) * 0.9; const s = 1.2 + 2.5 * (1 - ph) * hash(i * 7.1);
    rect(px - s / 2, y - ph * h * 1.3, s, s, i % 3 ? col : '#ffffff');
  }
  ctx.globalAlpha = 1;
}
// Electric aura: jagged arcs around a body.
function sparks(x, y, h, t, col = '#8ff0ff', n = 4, a = 1) {
  const s = Math.floor(t * 20);
  ctx.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    const ax = x + (hash(s + i) - 0.5) * 16, ay = y - hash(s + i * 3) * h;
    bolt(ax, ay, ax + (hash(s + i * 5) - 0.5) * 18, ay + (hash(s + i * 7) - 0.5) * 18, s + i, 4, 5, 0.8, col);
  }
  ctx.globalAlpha = 1;
}

// ---------- harbor ----------
const CONT_COLS = ['#b8412c', '#2c6fb8', '#d8892a', '#3a8a4a', '#8a8a92', '#6a3a8a'];
function container(x, y, w, h, col, o = {}) {
  rect(x, y, w, h, col);
  for (let i = 2; i < w - 1; i += 3) rect(x + i, y + 1.5, 1, h - 3, 'rgba(0,0,0,0.22)');
  rect(x, y, w, 1.5, 'rgba(255,255,255,0.18)'); rect(x, y + h - 1.5, w, 1.5, 'rgba(0,0,0,0.35)');
  rect(x, y, 1.5, h, 'rgba(0,0,0,0.3)'); rect(x + w - 1.5, y, 1.5, h, 'rgba(0,0,0,0.3)');
  if (o.hole) { ctx.fillStyle = '#08080c'; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r = 7 + hash(i + x) * 4; ctx.lineTo(x + w / 2 + Math.cos(a) * r, y + h / 2 + Math.sin(a) * r * 0.9); } ctx.fill(); }
}
const STACKS = [];
for (let i = -12; i < 14; i++) {
  const x = i * 64 + (hash(i) - 0.5) * 8, n = 1 + Math.floor(hash(i * 3.7) * 3);
  for (let k = 0; k < n; k++) STACKS.push({ x: x + (k % 2) * 4, y: -26 * (k + 1), w: 58, h: 26, col: CONT_COLS[Math.floor(hash(i * 7 + k) * 6)] });
}
// Containers Kashimo smashes through in the opening (foreground, destructible).
const BREAKERS = [[-150, 10.35], [-230, 10.6], [-310, 10.85]];
function drawSky(T) {
  screen();
  const dawn = seg(T, 97, 104);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#070a18', '#2a2a5a', dawn)); g.addColorStop(0.6, mix('#16223e', '#c86a6a', dawn)); g.addColorStop(1, mix('#2a3a5a', '#ffb070', dawn));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (dawn < 1) { ctx.globalAlpha = 1 - dawn; circle(250 - cam.x * 0.02, 34, 12, '#f0f0ff'); glow(250 - cam.x * 0.02, 34, 40, '#b0c0ff', 0.4); ctx.globalAlpha = 1; }
  for (let i = 0; i < 50; i++) { ctx.globalAlpha = (1 - dawn) * (0.3 + 0.5 * hash(i + Math.floor(T * 2))); rect(frac(hash(i * 3.7) - cam.x * 0.0004) * W, hash(i * 9.1) * 80, 1, 1, '#fff'); }
  ctx.globalAlpha = 1;
  if (dawn > 0) { ctx.globalAlpha = dawn; circle(90, 128, 18, '#ffd080'); glow(90, 128, 70, '#ffb060', 0.6); ctx.globalAlpha = 1; }
}
function drawHarbor(T) {
  drawSky(T);
  // sea to the horizon
  applyCam(0.15);
  const L = cam.x * 0.15 - 600, dawn = seg(T, 97, 104);
  rect(L, -18, 1200, 400, mix('#10203a', '#6a4a6a', dawn));
  for (let i = 0; i < 30; i++) rect(L + frac(hash(i) + T * 0.01) * 1200, -16 + hash(i * 3) * 20, 10 + hash(i * 5) * 30, 0.6, rgba(dawn > 0.5 ? '#ffd0a0' : '#8ab0e0', 0.3));
  // gantry cranes
  applyCam(0.4);
  for (let i = -4; i < 6; i++) {
    const x = i * 170 + 40, c = '#0e1424';
    rect(x, -150, 5, 150, c); rect(x + 40, -150, 5, 150, c); rect(x - 30, -150, 120, 6, c); rect(x - 30, -154, 4, 10, c);
    for (let k = 0; k < 6; k++) bolt(x, -150 + k * 25, x + 45, -125 + k * 25, k, 1, 0, 1, c);
    if (Math.floor(T * 1.5 + i) % 2) rect(x + 88, -152, 2, 2, '#ff3030');
  }
  // container stacks (background)
  applyCam(0.75);
  for (const c of STACKS) container(c.x, c.y - 4, c.w, c.h, mix(c.col, '#0a1020', 0.45));
  // pier ground
  applyCam(1);
  const Lx = cam.x - 400 / cam.z - 60, Rx = cam.x + 400 / cam.z + 60;
  ctx.fillStyle = PAT.concrete; ctx.fillRect(Lx, 0, Rx - Lx, 400);
  rect(Lx, 0, Rx - Lx, 400, 'rgba(10,16,32,0.45)');
  for (let x = Math.floor(Lx / 40) * 40; x < Rx; x += 40) rect(x, 8, 20, 1.2, '#c8a830');
  // foreground containers along the fighting line
  for (const [x, t0] of BREAKERS) container(x - 18, -24, 36, 24, '#b8412c', { hole: T > t0 });
}

// ---------- Idle Death Gamble ----------
const REEL_SYM = ['1', '2', '3', '4', '5', '6', '7'];
// Draws the pachinko parlor domain, with the reel screen in the middle.
// reels: array of 3 {spin: bool, val: string, blur}
function drawDomain(t, o = {}) {
  if (o.tf) ctx.setTransform(o.tf); else screen();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#12051e'); g.addColorStop(1, '#3a0a3a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // neon grid floor
  for (let i = 0; i < 14; i++) { const y = 130 + i * i * 0.5; rect(0, y, W, 0.6, rgba('#ff4fb0', 0.4 - i * 0.02)); }
  for (let i = -10; i <= 10; i++) { ctx.strokeStyle = rgba('#ff4fb0', 0.25); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(W / 2 + i * 8, 130); ctx.lineTo(W / 2 + i * 60, H); ctx.stroke(); }
  // side machines
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const x = W / 2 + sx * (110 + k * 40) - 16, y = 40 + k * 8, w = 32, h = 80 - k * 10;
    rect(x, y, w, h, '#2a0a3a'); rect(x + 3, y + 3, w - 6, h * 0.5, '#0a0a1a');
    for (let q = 0; q < 6; q++) rect(x + 3 + q * 4.5, y + h - 8, 2, 2, Math.floor(t * 6 + q + k) % 2 ? '#ffd24a' : '#ff4fb0');
  }
  // main machine
  const mx = W / 2, my = 72;
  rect(mx - 72, my - 58, 144, 118, '#1a0624');
  const fl = Math.floor(t * 10);
  for (let i = 0; i < 28; i++) {
    const on = (i + fl) % 4 === 0 || o.fever;
    const px = i < 14 ? mx - 70 + i * 10.7 : mx - 70 + (i - 14) * 10.7, py = i < 14 ? my - 57 : my + 57;
    circle(px, py, 1.6, on ? (o.fever ? ['#ffd24a', '#ff4fb0', '#7fffd0'][(i + fl) % 3] : '#ffd24a') : '#5a2a4a');
  }
  // pins
  for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) rect(mx - 64 + c * 11 + (r % 2) * 5, my + 30 + r * 4.5, 0.8, 0.8, '#c0c0d0');
  // title
  txt('CR 私鉄純愛列車', mx, my - 49, 6, '#ffd24a', { font: JFONT, weight: '900', shadow: false });
  // screen
  rect(mx - 58, my - 42, 116, 66, '#000');
  ctx.save(); ctx.beginPath(); ctx.rect(mx - 56, my - 40, 112, 62); ctx.clip();
  if (o.screen) o.screen(mx - 56, my - 40, 112, 62);
  else {
    rect(mx - 56, my - 40, 112, 62, o.fever ? mix('#ff4fb0', '#ffd24a', 0.5 + 0.5 * Math.sin(t * 12)) : '#1a1030');
    drawReels(mx, my - 9, t, o.reels || []);
  }
  ctx.restore();
  // falling silver balls
  for (let i = 0; i < (o.fever ? 90 : 40); i++) {
    const x = hash(i * 3.3) * W, y = frac(hash(i * 7.7) + t * (0.4 + hash(i) * 0.6)) * (H + 20) - 10;
    circle(x, y, 1.3, '#d8d8e8'); rect(x - 0.6, y - 0.8, 0.6, 0.6, '#ffffff');
  }
  if (o.fever) for (let i = 0; i < 50; i++) { const x = hash(i * 5.1) * W, y = frac(hash(i * 2.9) + t * 0.5) * H; rect(x, y, 2, 3, ['#ffd24a', '#ff4fb0', '#7fffd0', '#ffffff'][i % 4]); }
}
function drawReels(cx, cy, t, reels) {
  reels.forEach((r, i) => {
    const x = cx - 36 + i * 36;
    rect(x - 15, cy - 22, 30, 44, '#fff8f0');
    if (r.spin) {
      const off = (t * (22 + i * 5) + i * 2.3) % 7;
      for (let k = -2; k <= 2; k++) {
        const sym = REEL_SYM[(Math.floor(off) + k + 7) % 7], yy = cy + (k - frac(off)) * 14;
        for (let q = 0; q < 3; q++) { ctx.globalAlpha = 0.25; txt(sym, x, yy - q * 3, 14, '#c02050', { shadow: false }); }
        ctx.globalAlpha = 1;
      }
      for (let q = 0; q < 5; q++) rect(x - 13 + q * 6, cy - 20, 0.6, 40, 'rgba(192,32,80,0.15)');
      rect(x - 15, cy - 22, 30, 6, 'rgba(255,248,240,0.9)'); rect(x - 15, cy + 16, 30, 6, 'rgba(255,248,240,0.9)');
    } else {
      const bounce = r.stopT != null ? Math.sin(clamp((t - r.stopT) / 0.15) * Math.PI) * -3 : 0;
      txt(r.val, x, cy + bounce, 22, r.hot ? '#ff2060' : '#c02050', { stroke: 2, strokeCol: '#ffd24a', shadow: false });
    }
  });
}
// A shoujo-romance "reach" cutaway on the machine screen.
function trainScene(x, y, w, h, t, k) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#ffd0e8'); g.addColorStop(1, '#ff9ad0'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 6; i++) { const wx = x + ((i * 26 - t * 40) % (w + 26) + w + 26) % (w + 26) - 20; rect(wx, y + 8, 18, 16, '#bfe8ff'); rect(wx, y + 8, 18, 2, '#ffffff'); }
  rect(x, y + h - 14, w, 14, '#e070a8'); rect(x, y + h - 15, w, 1.5, '#ffffff');
  // heroine (Yuki) with transit card
  const px = x + w / 2 - 8;
  rect(px, y + 22, 10, 14, '#fff0f6'); rect(px - 1, y + 16, 12, 9, '#f5d8c8'); rect(px - 2, y + 14, 14, 5, '#7a4a3a'); rect(px - 2, y + 17, 3, 10, '#7a4a3a');
  rect(px + 2, y + 20, 2, 1.5, '#3a2a2a'); rect(px + 6, y + 20, 2, 1.5, '#3a2a2a'); rect(px + 3.5, y + 23, 3, 0.8, '#e05070');
  rect(px + 11, y + 26 - k * 4, 7, 4.5, '#ffd24a'); rect(px + 12, y + 27 - k * 4, 2, 1, '#2a6ab8');
  for (let i = 0; i < 6; i++) { const hy = y + h - frac(t * 0.8 + i / 6) * h, hx = x + 10 + i * 18; ctx.globalAlpha = 0.7; txt('♥', hx, hy, 5, '#ff4fb0', { shadow: false }); }
  ctx.globalAlpha = 1;
}

// ---------- underwater ----------
function drawUnderwater(t, o = {}) {
  screen();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a5a8a'); g.addColorStop(0.5, '#0a2a4a'); g.addColorStop(1, '#020a18');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) {
    const x = 20 + i * 48 + Math.sin(t * 0.5 + i) * 10;
    ctx.fillStyle = 'rgba(180,230,255,0.06)'; ctx.beginPath(); ctx.moveTo(x - 6, 0); ctx.lineTo(x + 6, 0); ctx.lineTo(x + 40, H); ctx.lineTo(x + 10, H); ctx.fill();
  }
  rect(0, 0, W, 3, 'rgba(220,245,255,0.4)');
  for (let i = 0; i < 40; i++) { const x = hash(i * 3.1) * W + Math.sin(t * 2 + i) * 3, y = H - frac(hash(i * 5.3) + t * 0.15 * (0.5 + hash(i))) * H; circle(x, y, 0.6 + hash(i) * 1.2, 'rgba(200,240,255,0.5)'); }
  if (o.chlorine) for (let i = 0; i < 70; i++) {
    const x = (o.cx ?? W / 2) + (hash(i * 7.1) - 0.5) * 220 * o.chlorine, y = (o.cy ?? H / 2) - frac(hash(i * 2.3) + t * 0.2) * 120 + 40;
    circle(x, y, 1 + hash(i) * 3, rgba('#b8ff6a', 0.25 + 0.3 * o.chlorine));
  }
}
