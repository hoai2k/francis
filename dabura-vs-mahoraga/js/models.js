// Models: blocky characters (side / front / face close-ups), hands, city, domains.
'use strict';
const PAL = {
  gojo: { skin: '#f5dcca', skinD: '#dcc0ad', hair: '#f4f4fb', hairD: '#c9cce0', top: '#18181f', topD: '#0e0e13', leg: '#18181f', legD: '#0e0e13',
    shoe: '#08080a', shoeD: '#050506', eye: '#3fd6ff', aura: '#6fd8ff' },
  sukuna: { skin: '#e8b894', skinD: '#c99a78', hair: '#f08aa6', hairD: '#c25c7a', top: '#efe8dc', topD: '#cfc6b8', leg: '#efe8dc', legD: '#c8bfb0',
    shoe: '#241c20', shoeD: '#16101a', eye: '#ff2238', aura: '#ff3048', mark: '#1a0a0e' },
};

function limb(py, ang, col, endCol, len, ext = 0, endLen = 3, marks) {
  ctx.save(); ctx.translate(0, py); ctx.rotate(ang);
  rect(-2, -2 + ext, 4, len, col);
  rect(-2, len - 2 - endLen + ext, 4, endLen, endCol);
  if (marks) { rect(-2, len - 4.2 + ext, 4, 0.5, marks); rect(-2, len - 3 + ext, 4, 0.4, marks); }
  ctx.restore();
}
function pose(x, y, f, o) {
  return Object.assign({ x, y, f, sc: 1, armF: 0, armB: 0, legF: 0, legB: 0, extF: 0, extB: 0, rot: 0, head: 0, alpha: 1, eyes: 1, bu: 1 }, o);
}

// Side view: the Minecraft player model in profile. Feet at (x, y).
function drawSide(p, kind) {
  if (p.alpha <= 0) return;
  const P = PAL[kind], m = p.mono, C = c => m || c;
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
  ctx.translate(0, -16); ctx.rotate(p.rot); ctx.translate(0, 16);
  ctx.scale(p.f, 1);
  const suk = kind === 'sukuna';
  limb(-22, p.armB, C(P.topD), C(P.skinD), 12, p.extB, 3, !m && suk ? P.mark : 0);
  limb(-12, p.legB, C(P.legD), C(P.shoeD), 12, 0, 2);
  rect(-2, -24, 4, 12.5, C(P.top));
  if (!m) {
    if (suk) { rect(-2.5, -24.5, 5, 2, '#241c20'); rect(-2, -14, 4, 1.4, '#241c20'); rect(1.2, -22, 0.8, 8, P.topD); }
    else { rect(1, -24, 1, 12, '#26262f'); rect(-2, -24.5, 4, 1.5, '#0a0a0e'); }
  }
  limb(-12, p.legF, C(P.leg), C(P.shoe), 12, 0, 2);
  // head
  ctx.save(); ctx.translate(0, -24); ctx.rotate(p.head); ctx.translate(0, 24);
  rect(-4, -32, 8, 8, C(P.skin));
  if (suk) {
    rect(-4.5, -33.5, 8.5, 3, C(P.hair)); rect(-5, -32, 3, 4, C(P.hair));
    rect(-6.5, -34, 3, 1.5, C(P.hair)); rect(-6, -31.5, 2, 1.5, C(P.hairD)); rect(-2, -35, 3, 1.5, C(P.hair)); rect(1.5, -34.5, 2.5, 1, C(P.hairD));
    if (!m) {
      rect(-1, -29, 1, 2, P.skinD);
      rect(1, -29.4, 2.2, 1.2, '#fff4e0'); rect(2.2, -29.4, 1, 1.2, P.eye);
      rect(1.4, -27.6, 1.6, 0.8, P.eye); rect(0.2, -27.9, 3.6, 0.35, P.mark); // second eye + mark
      rect(0.8, -30.3, 3, 0.5, P.mark); // brow
      rect(1.8, -25.9, 2.2, 0.9, '#2a0a0a'); rect(2, -25.9, 2, 0.35, '#fff');
    }
  } else {
    rect(-4.5, -34, 9, 3, C(P.hair)); rect(-4.5, -31, 3, 5, C(P.hair));
    rect(-4, -36, 2, 2, C(P.hair)); rect(-1.5, -37.5, 2, 3.5, C(P.hair)); rect(1, -36.5, 2, 2.5, C(P.hair));
    rect(3, -35, 2, 1.5, C(P.hairD)); rect(-5.5, -35, 1.5, 2, C(P.hairD)); rect(3, -31, 1.4, 1.6, C(P.hair));
    if (!m) {
      rect(-1, -29, 1, 2, P.skinD);
      if (p.bu < 1) rect(-4.3, -30.2 - 4 * p.bu, 8.6, 3, '#101014');
      if (p.bu > 0.4 && p.eyes > 0) {
        ctx.save(); ctx.shadowColor = '#5ff0ff'; ctx.shadowBlur = 8 * p.eyes;
        rect(1, -29.2, 2.4, 1.6 * p.eyes, '#fff'); rect(2.1, -29.2, 1.3, 1.6 * p.eyes, P.eye);
        ctx.restore();
        rect(1, -29.9, 2.6, 0.6, '#fff');
      }
      rect(2.6, -26, 1.4, 0.6, '#9a6a5a'); rect(3.8, -26.5, 0.6, 0.6, '#9a6a5a');
    }
  }
  ctx.restore();
  limb(-22, p.armF, C(P.top), C(P.skin), 12, p.extF, 3, !m && suk ? P.mark : 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Front view model (for poses facing the camera). Feet at (x, y).
function drawFront(p, kind, fo = {}) {
  const P = PAL[kind], m = p.mono, C = c => m || c, suk = kind === 'sukuna';
  ctx.save(); ctx.globalAlpha = p.alpha ?? 1;
  ctx.translate(p.x, p.y); ctx.scale(p.sc || 1, p.sc || 1); ctx.rotate(p.rot || 0);
  const legs = (px, a, c, s) => { ctx.save(); ctx.translate(px, -12); ctx.rotate(a); rect(-2, 0, 4, 12, c); rect(-2, 10, 4, 2, s); ctx.restore(); };
  legs(-2, p.legB || 0, C(P.legD), C(P.shoe)); legs(2, -(p.legF || 0), C(P.leg), C(P.shoe));
  rect(-4, -24, 8, 12.5, C(P.top));
  if (!m) {
    if (suk) { rect(-4, -24, 8, 2, '#241c20'); rect(-1, -22, 2, 8, P.topD); rect(-4, -14, 8, 1.5, '#241c20'); }
    else { rect(-0.5, -24, 1, 12, '#26262f'); rect(-3, -24.5, 6, 1.6, '#0a0a0e'); }
  }
  const arm = (px, a, c, sk) => {
    ctx.save(); ctx.translate(px, -22); ctx.rotate(a); rect(-2, -2, 4, 12, c); rect(-2, 7, 4, 3, sk);
    if (!m && suk) { rect(-2, 7.6, 4, 0.5, P.mark); rect(-2, 8.8, 4, 0.4, P.mark); }
    ctx.restore();
  };
  arm(-6, p.armL || 0, C(P.topD), C(P.skin)); arm(6, p.armR || 0, C(P.top), C(P.skin));
  if (p.sign && !m) { rect(-2, -21, 4, 3.2, P.skin); rect(-1.2, -25.5, 1, 4.6, P.skin); rect(0.2, -25, 1, 4.1, P.skinD); if (suk) rect(-2, -19, 4, 0.5, P.mark); }
  if (m) rect(-4, -32, 8, 8, m); else drawFace(kind, -4, -32, 1, fo);
  ctx.restore(); ctx.globalAlpha = 1;
}

// Front face on an 8x8 grid. (x,y) = top-left of the face, s = unit size.
function drawFace(kind, x, y, s, o = {}) {
  const P = PAL[kind];
  const open = o.open ?? 1, glowA = o.glow ?? 0.6;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(0, 0, 8, 8, P.skin); rect(0, 7.2, 8, 0.8, P.skinD); rect(-0.4, 3, 0.5, 2, P.skinD); rect(7.9, 3, 0.5, 2, P.skinD);
  const eye = (ex, ey, w, h, iris, irisW, k) => {
    if (k <= 0.02) { rect(ex, ey + h * 0.6, w, 0.3, '#2a1a1a'); return; }
    const hh = h * k, yy = ey + (h - hh) / 2;
    rect(ex, yy, w, hh, kind === 'gojo' ? '#ffffff' : '#fff4e0');
    ctx.save(); if (glowA > 0) { ctx.shadowColor = iris; ctx.shadowBlur = 14 * glowA * s / 4; }
    rect(ex + (w - irisW) / 2 + (o.look || 0) * 0.3, yy, irisW, hh, iris);
    ctx.restore();
    rect(ex + (w - irisW) / 2 + 0.15, yy + 0.1, irisW * 0.35, Math.min(0.4, hh * 0.4), '#ffffff');
  };
  if (kind === 'gojo') {
    eye(1.1, 3.4, 2.2, 1.4, P.eye, 1.3, open);
    eye(4.7, 3.4, 2.2, 1.4, P.eye, 1.3, open);
    if (open > 0.02) { rect(1, 3.1, 2.4, 0.35, '#fff'); rect(4.6, 3.1, 2.4, 0.35, '#fff'); }
    const bu = o.bu ?? 1;
    if (bu < 1) rect(-0.4, 2.9 - bu * 4, 8.8, 2.2, '#111116');
    // smile
    const sm = o.smile ?? 1;
    rect(3.1, 6.1, 2.2, 0.45, '#9a6a5a'); if (sm) { rect(5.2, 5.8, 0.5, 0.45, '#9a6a5a'); }
    // hair
    const hc = P.hair, hd = P.hairD;
    rect(-0.6, -1.4, 9.2, 3, hc);
    [[-1.2, -3, 2, 2], [0.8, -4.2, 2, 3], [3, -4.8, 2, 3.5], [5.2, -4, 2, 3], [7, -2.8, 2, 2], [-1.6, -0.2, 1.4, 4.5], [8.2, -0.2, 1.4, 4.5]].forEach(r => rect(...r, hc));
    [[1, 1.5, 1.4, 1.4], [3.6, 1.5, 1, 1], [5.6, 1.5, 1.4, 1.2], [-1.6, 3.6, 1.4, 0.8], [3, -4.8, 0.8, 1]].forEach(r => rect(...r, hd));
    rect(0.8, 8, 6.4, 2.2, '#18181f'); rect(3.8, 8, 0.4, 2.2, '#26262f');
  } else {
    const k2 = o.open2 ?? open;
    eye(1.1, 3.4, 2.2, 1.3, P.eye, 0.9, open);
    eye(4.7, 3.4, 2.2, 1.3, P.eye, 0.9, open);
    eye(1.5, 5.0, 1.5, 0.8, P.eye, 0.7, k2);
    eye(5.0, 5.0, 1.5, 0.8, P.eye, 0.7, k2);
    const mk = P.mark;
    rect(0.8, 2.8, 2.7, 0.5, mk); rect(4.5, 2.8, 2.7, 0.5, mk); rect(2.9, 2.5, 0.6, 0.5, mk); rect(4.5, 2.5, 0.6, 0.5, mk); // angry brows
    rect(3.2, 1.3, 1.6, 0.4, mk); rect(0, 4.9, 1.2, 0.35, mk); rect(6.8, 4.9, 1.2, 0.35, mk); rect(3.4, 7.3, 1.2, 0.35, mk);
    const g = o.grin ?? 1;
    rect(2.2, 6.2, 3.6, 0.5 + 0.7 * g, '#2a0a0a'); rect(2.3, 6.2, 3.4, 0.35, '#ffffff');
    if (g > 0.5) { rect(2.4, 6.55 + 0.6 * g, 3.2, 0.3, '#ffffff'); }
    rect(1.7, 5.9, 0.5, 0.5, '#2a0a0a'); rect(5.8, 5.9, 0.5, 0.5, '#2a0a0a');
    const hc = P.hair, hd = P.hairD;
    rect(-0.6, -1.2, 9.2, 2.3, hc);
    [[-1.4, -2.6, 2.2, 2], [0.8, -3.8, 1.8, 2.6], [2.8, -4.5, 2, 3.2], [4.9, -4, 1.8, 2.8], [6.8, -2.8, 2.2, 2], [-1.4, 0, 1.2, 2.6], [8.2, 0, 1.2, 2.6]].forEach(r => rect(...r, hc));
    [[0.8, -3.8, 0.7, 1.2], [4.9, -4, 0.6, 1.2], [-1.4, 1.8, 1.2, 0.8], [8.2, 1.8, 1.2, 0.8]].forEach(r => rect(...r, hd));
    rect(0.4, 8, 7.2, 2.2, '#efe8dc'); rect(0.4, 8, 7.2, 1, '#241c20'); rect(3.4, 9, 1.2, 1.2, '#cfc6b8');
  }
  ctx.restore();
}

// Extreme close-up of a single eye, centered at (x,y). size = width.
function drawEye(kind, x, y, size, t, o = {}) {
  const P = PAL[kind], k = o.open ?? 1, u = size / 16;
  ctx.save(); ctx.translate(x - size / 2, y - size * 0.25);
  rect(-u * 16, -u * 14, u * 48, u * 34, P.skin);
  rect(-u * 16, -u * 14, u * 48, u * 8, kind === 'gojo' ? P.hair : P.skinD);
  rect(-u * 2, -u * 4, u * 20, u * 1.2, kind === 'gojo' ? P.hair : P.mark);
  const hh = 8 * u * k;
  if (k > 0.02) {
    rect(0, 4 * u - hh / 2, 16 * u, hh, '#ffffff');
    ctx.save(); ctx.beginPath(); ctx.rect(0, 4 * u - hh / 2, 16 * u, hh); ctx.clip();
    if (kind === 'gojo') {
      glow(8 * u, 4 * u, 9 * u, '#7ff0ff', 0.9);
      circle(8 * u, 4 * u, 4.5 * u, '#1fa8ff'); circle(8 * u, 4 * u, 3.6 * u, '#3fd6ff');
      for (let i = 0; i < 12; i++) { // crystalline six-eyes pattern
        const a = (i / 12) * TAU + t * 0.8; ctx.save(); ctx.translate(8 * u + Math.cos(a) * 2.4 * u, 4 * u + Math.sin(a) * 2.4 * u); ctx.rotate(a);
        rect(-0.4 * u, -0.4 * u, 0.8 * u, 0.8 * u, i % 2 ? '#bff8ff' : '#0d6fd0'); ctx.restore();
      }
      circle(8 * u, 4 * u, 1.3 * u, '#06142a');
    } else {
      glow(8 * u, 4 * u, 8 * u, '#ff2030', 0.8);
      circle(8 * u, 4 * u, 4.2 * u, '#a0101c'); circle(8 * u, 4 * u, 3.4 * u, '#ff2238');
      rect(7.4 * u, 0.2 * u, 1.2 * u, 7.6 * u, '#1a0205'); // slit pupil
    }
    rect(5 * u, 2 * u, 1.4 * u, 1.2 * u, '#ffffff');
    ctx.restore();
  }
  rect(-u, 4 * u - hh / 2 - u, 18 * u, u, kind === 'gojo' ? '#ffffff' : '#2a0a0a');
  if (kind === 'sukuna') { rect(-u * 2, 9 * u, 20 * u, 0.8 * u, P.mark); rect(3 * u, 11 * u, 10 * u, 2 * u, '#fff4e0'); rect(6 * u, 11 * u, 4 * u, 2 * u, P.eye); }
  ctx.restore();
}

// Pixel-art hand signs. Legend: X skin, D shade, S sleeve, M mark.
const HAND_GOJO = [
  '.....XX.....',
  '....XXDX....',
  '....XDXX....',
  '.....XX.....',
  '....XXXX....',
  '...XXXXXXX..',
  '..XXXXXXXXX.',
  '..XDXXDXXDX.',
  '..XXXXXXXXX.',
  '..XXXXXXXXD.',
  '...XXXXXXD..',
  '...SSSSSSS..',
  '..SSSSSSSSS.',
  '..SSSSSSSSS.',
];
const HAND_SUKUNA = [
  '....XX..XX....',
  '...XXX..XXX...',
  '...XDX..XDX...',
  '...XXXXXXXX...',
  '..XXXDXXDXXX..',
  '..XXXXXXXXXX..',
  '..MXXXXXXXXM..',
  '..XXXXDDXXXX..',
  '..MXXXXXXXXM..',
  '..XXXXXXXXXX..',
  '...XXXXXXXX...',
  '..SSSS..SSSS..',
  '.SSSSS..SSSSS.',
  '.SSSSS..SSSSS.',
];
function drawHand(kind, x, y, s) {
  const map = kind === 'gojo' ? HAND_GOJO : HAND_SUKUNA, P = PAL[kind];
  const col = { X: P.skin, D: P.skinD, S: P.top, M: P.mark || P.skinD };
  const w = map[0].length;
  map.forEach((row, j) => [...row].forEach((c, i) => { if (col[c]) rect(x + (i - w / 2) * s, y + (j - 7) * s, s + 0.05, s + 0.05, col[c]); }));
}

// ---------- aura ----------
function aura(x, y, h, t, col, n = 26, spread = 14, a = 1) {
  glow(x, y - h / 2, h * 0.9, col, 0.35 * a);
  for (let i = 0; i < n; i++) {
    const ph = frac(t * (1.2 + hash(i) * 0.8) + hash(i * 3.3));
    const px = x + (hash(i + 1) - 0.5) * spread + Math.sin(t * 6 + i) * 1.5 * ph;
    ctx.globalAlpha = a * (1 - ph) * 0.9;
    const s = 1.2 + 2.5 * (1 - ph) * hash(i * 7.1);
    rect(px - s / 2, y - ph * h * 1.3, s, s, i % 3 ? col : '#ffffff');
  }
  ctx.globalAlpha = 1;
}

// ---------- sky / city ----------
const SKY_KEYS = [
  [0, '#141633', '#3d2b5a', '#e0764a'], [44.3, '#141633', '#3d2b5a', '#e0764a'], [44.6, '#3a2a38', '#6a5058', '#c0906a'],
  [100, '#2a2230', '#5a4450', '#b0806a'], [106, '#2a3a6a', '#c07a7a', '#ffc080'], [DUR, '#3a5a9a', '#e0a080', '#ffd8a0'],
]
function skyCols(T) {
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const A = SKY_KEYS[i], B = SKY_KEYS[i + 1];
    if (T <= B[0]) { const k = seg(T, A[0], B[0]); return [1, 2, 3].map(j => mix(A[j], B[j], k)); }
  }
  return SKY_KEYS[SKY_KEYS.length - 1].slice(1);
}
function drawSky(T) {
  screen();
  const [a, b, c] = skyCols(T);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // low blocky sun / storm glow
  const sx = W * 0.7 - cam.x * 0.02, sy = H * 0.62 - cam.y * 0.05;
  if (T < 44.4 || T > 104) { rect(sx - 16, sy - 16, 32, 32, 'rgba(255,190,120,0.25)'); rect(sx - 11, sy - 11, 22, 22, '#ffb070'); rect(sx - 11, sy - 2, 22, 2, '#e0764a'); rect(sx - 11, sy + 4, 22, 1.5, '#e0764a'); }
  // stars
  for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.3 + 0.5 * hash(i + Math.floor(T * 2)); rect(frac(hash(i * 3.7) - cam.x * 0.0005) * W, hash(i * 9.1) * 60, 1, 1, '#fff'); }
  ctx.globalAlpha = 1;
}
// Background skyline layers. Ruined after the finale explosion.
function drawSkyline(T) {
  const ruined = T > 108.4;
  [[0.2, 14, 70, '#1f1d38', '#ffd98a'], [0.45, 18, 90, '#2a2644', '#ffcf6a']].forEach(([par, w, amp, col, win], li) => {
    applyCam(par);
    const left = cam.x * par - 260 / (1 + (cam.z - 1) * par) - 40, right = cam.x * par + 260 / (1 + (cam.z - 1) * par) + 40;
    const i0 = Math.floor(left / w), i1 = Math.ceil(right / w);
    for (let i = i0; i <= i1; i++) {
      const h0 = 16 + Math.floor(hash(i * 1.91 + li * 40) * amp / 6) * 6, bw = w - 2 - Math.floor(hash(i * 2.3) * 4);
      const h = ruined && li === 1 ? h0 * (0.15 + 0.15 * hash(i)) : ruined ? h0 * 0.6 : h0;
      const c = ruined ? mix(col, '#4a3a40', 0.5) : col;
      rect(i * w, -h, bw, h + 200, c);
      if (!ruined) for (let r = 4; r < h - 2; r += 6) for (let q = 2; q < bw - 2; q += 4)
        if (hash(i * 31 + r * 7 + q * 13 + li) > 0.8) rect(i * w + q, -h + r, 1.5, 2, rgba(win, 0.35 + li * 0.25));
    }
  });
}
// Near buildings: destructible. x = left edge, y=0 is street level.
const BUILDINGS = [
  { x: -560, w: 70, h: 210, tex: 'concrete' }, { x: -470, w: 60, h: 160, tex: 'brick' },
  { x: -390, w: 76, h: 250, tex: 'glass' }, { x: -290, w: 58, h: 140, tex: 'concrete' },
  { x: -210, w: 64, h: 190, tex: 'brick' }, { x: 110, w: 80, h: 240, tex: 'glass' },
  { x: 250, w: 60, h: 170, tex: 'concrete' }, { x: 330, w: 70, h: 220, tex: 'brick' }, { x: 420, w: 64, h: 180, tex: 'glass' },
  { x: 500, w: 80, h: 260, tex: 'concrete' }, { x: 600, w: 60, h: 150, tex: 'brick' },
  { x: -700, w: 70, h: 230, tex: 'glass' }, { x: -780, w: 60, h: 170, tex: 'concrete' },
];
BUILDINGS.forEach((b, i) => { b.id = i; });
const RUIN_T = 44.4;
function facade(b, h) {
  ctx.fillStyle = PAT[b.tex]; ctx.fillRect(b.x, -h, b.w, h);
  rect(b.x, -h, 3, h, 'rgba(0,0,0,0.25)'); rect(b.x + b.w - 2, -h, 2, h, 'rgba(255,255,255,0.08)');
  for (let r = 10; r < h - 4; r += 12) for (let c = 6; c < b.w - 6; c += 10) {
    const lit = hash(b.id * 50 + c * 7 + r * 13) > 0.6;
    rect(b.x + c, -h + r, 5, 6, lit ? '#ffd98a' : '#1b2233');
    if (lit) rect(b.x + c, -h + r, 5, 1, '#fff2c0');
  }
  rect(b.x - 2, -b.h, b.w + 4, 4, 'rgba(0,0,0,0.35)');
  if (h >= b.h - 1 && b.id % 3 === 0) { rect(b.x + b.w * 0.6, -b.h - 12, 2, 12, '#555'); rect(b.x + b.w * 0.6 - 1, -b.h - 13, 4, 2, '#e03030'); }
}
function rubble(b, hgt = 18) {
  for (let i = 0; i < 9; i++) {
    const w = 10 + hash(b.id * 9 + i) * 14, h = 4 + hash(b.id * 7 + i * 3) * hgt;
    ctx.fillStyle = PAT[i % 2 ? b.tex : 'stone']; ctx.fillRect(b.x - 8 + (i / 9) * (b.w + 8), -h, w, h);
  }
}
function drawBuildings(T) {
  applyCam(1);
  for (const b of BUILDINGS) {
    const [sx0] = w2s(b.x, 0), [sx1] = w2s(b.x + b.w, 0);
    if (Math.max(sx0, sx1) < -60 || Math.min(sx0, sx1) > W + 60) continue;
    if (T > RUIN_T) { rubble(b, 10); continue; }
    if (b.blast && T > b.blast) { rubble(b, 14); continue; }
    if (b.slice && T > b.slice) {
      // cut diagonally; upper part slides off and falls
      const y0 = -b.h * 0.55, y1 = -b.h * 0.72, k = T - b.slice;
      ctx.save(); ctx.beginPath(); ctx.moveTo(b.x - 5, 5); ctx.lineTo(b.x - 5, y0); ctx.lineTo(b.x + b.w + 5, y1); ctx.lineTo(b.x + b.w + 5, 5); ctx.clip();
      facade(b, b.h); ctx.restore();
      if (k < 3.5) {
        const slide = k < 0.35 ? k * 6 : 2.1 + Math.pow(k - 0.35, 2) * 60;
        const dx = slide * 0.97, dy = slide * 0.25 + Math.max(0, k - 0.8) ** 2 * 120;
        ctx.save(); ctx.translate(dx, dy); ctx.translate(b.x + b.w, y1); ctx.rotate(Math.max(0, k - 0.6) * 0.5); ctx.translate(-(b.x + b.w), -y1);
        ctx.beginPath(); ctx.moveTo(b.x - 5, y0); ctx.lineTo(b.x + b.w + 5, y1); ctx.lineTo(b.x + b.w + 5, -b.h - 20); ctx.lineTo(b.x - 5, -b.h - 20); ctx.clip();
        facade(b, b.h); ctx.restore();
        ctx.globalAlpha = clamp(1 - k); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x - 20, y0 + 5); ctx.lineTo(b.x + b.w + 20, y1 - 5); ctx.stroke(); ctx.globalAlpha = 1;
      } else rubble(b, 16);
      continue;
    }
    facade(b, b.h);
    for (const [ht, hy] of b.holes || []) {
      if (T < ht) continue;
      const cx = b.x + b.w / 2, cy = hy, R = hy > -30 ? 10 : 20;
      ctx.fillStyle = '#0c0a12'; ctx.beginPath();
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, r = R + hash(i + b.id + ht) * 9; ctx.lineTo(cx + Math.cos(a) * r, Math.min(0, cy + Math.sin(a) * r)); }
      ctx.fill();
      for (let i = 0; i < 7; i++) { const a = hash(i * 3 + b.id + ht) * TAU; bolt(cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(a) * R * 2.4, Math.min(0, cy + Math.sin(a) * R * 2.4), i * 7, 4, 8, 1, '#3a3844'); }
    }
  }
}
const FIN_X = -60;
const CRATERS = [[0, 18.6, 45], [0, 44.4, 300]];
function drawGround(T) {
  applyCam(1);
  const L = cam.x - 400 / cam.z - 50, R = cam.x + 400 / cam.z + 50;
  if (T > RUIN_T) { ctx.fillStyle = PAT.dirt; ctx.fillRect(L, 0, R - L, 400); ctx.fillStyle = PAT.stone; ctx.fillRect(L, 18, R - L, 400); }
  else {
    ctx.fillStyle = PAT.concrete; ctx.fillRect(L, 0, R - L, 4);
    ctx.fillStyle = PAT.asphalt; ctx.fillRect(L, 4, R - L, 400);
    for (let x = Math.floor(L / 30) * 30; x < R; x += 30) rect(x, 14, 14, 1.5, '#e8d060');
    rect(L, 0, R - L, 0.8, 'rgba(255,255,255,0.15)');
  }
  for (const [x, t0, r] of CRATERS) {
    if (T < t0) continue;
    const k = easeOut(seg(T, t0, t0 + 0.3));
    ctx.fillStyle = 'rgba(10,8,14,0.85)'; ctx.beginPath(); ctx.ellipse(x, 2, r * k, r * 0.18 * k, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = (hash(i + x) - 0.5) * 2.6 + (i % 2 ? Math.PI : 0);
      bolt(x, 2, x + Math.cos(a) * r * 1.6 * k, 2 + Math.abs(Math.sin(a)) * 6 * k, i + x, 5, 3, 0.8, '#15121a');
    }
  }
}
function drawCity(T) {
  drawSky(T); drawSkyline(T);
  screen(); const [, , hz] = skyCols(T), g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(hz, 0)); g.addColorStop(1, rgba(hz, 0.3)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  drawBuildings(T); drawGround(T);
}

// ---------- domains ----------
function drawVoid(t, cx, cy, o = {}) {
  screen();
  rect(0, 0, W, H, '#02030c');
  glow(cx, cy, 230, '#4a6cff', 0.35);
  for (let i = 0; i < 90; i++) {
    const gx = (i % 18) * 18 + 4, gy = Math.floor(i / 18) * 40 + ((t * 14 + i * 7) % 40);
    ctx.globalAlpha = 0.1 + 0.2 * hash(i + Math.floor(t * 8)); rect(gx, gy, 2, 2, '#7fe8ff');
  }
  ctx.globalAlpha = 1;
  const COLS = ['#ffffff', '#bff4ff', '#9cc8ff', '#f3c8ff'];
  for (let i = 0; i < 280; i++) {
    const a = hash(i) * TAU + t * 0.2 * (hash(i + 5) - 0.5), sp = 25 + hash(i + 9) * 90;
    const r = (hash(i + 13) * 260 + t * sp) % 260, s = 0.6 + (r / 260) * 2.2;
    ctx.globalAlpha = Math.min(1, r / 40);
    rect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, s, s, COLS[i % 4]);
  }
  ctx.globalAlpha = 1;
  const ry = o.holeY ?? cy - 50, ring0 = (o.hole ?? 20) + 3 * Math.sin(t * 4);
  glow(cx, ry, ring0 * 2.2, '#bff4ff', 0.9);
  circle(cx, ry, ring0 * 1.05, '#ffffff');
  circle(cx, ry, ring0 * 0.85, '#000000');
}
function drawShrine(t, o = {}) {
  screen();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#12020a'); g.addColorStop(0.6, '#5a0a14'); g.addColorStop(1, '#2a0208');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cx = o.cx ?? W / 2, base = o.base ?? 128, s = o.s ?? 1;
  circle(cx + 90 * s, 34, 16 * s, '#c01020'); glow(cx + 90 * s, 34, 40 * s, '#ff2030', 0.5);
  ctx.save(); ctx.translate(cx, base); ctx.scale(s, s);
  // skull piles
  for (let i = 0; i < 26; i++) {
    const x = -90 + (i % 13) * 14 + (i > 12 ? 7 : 0), y = i > 12 ? -12 : 0;
    ctx.fillStyle = PAT.bone; ctx.fillRect(x, y - 10, 11, 10);
    rect(x + 2, y - 7, 2.5, 2.5, '#1a0a0a'); rect(x + 6.5, y - 7, 2.5, 2.5, '#1a0a0a'); rect(x + 4, y - 3, 3, 1.2, '#3a1a1a');
  }
  // shrine body with a toothy mouth
  ctx.fillStyle = PAT.darkwood; ctx.fillRect(-34, -70, 68, 48);
  rect(-26, -58, 52, 22, '#1a0206');
  for (let i = 0; i < 8; i++) { rect(-24 + i * 6.3, -58, 4, 5, '#f0ead8'); rect(-24 + i * 6.3 + 2, -41, 4, 5, '#f0ead8'); }
  const tongue = 0.5 + 0.5 * Math.sin(t * 3);
  rect(-10, -44, 20, 3 + tongue * 2, '#a0303a');
  // pillars
  for (const x of [-40, -30, 26, 36]) { ctx.fillStyle = PAT.darkwood; ctx.fillRect(x, -70, 5, 50); rect(x, -70, 5, 2, '#a01020'); }
  // tiered roofs
  [[-56, -80, 112, 8], [-44, -96, 88, 7], [-32, -110, 64, 6], [-18, -122, 36, 6]].forEach(([x, y, w, h], i) => {
    rect(x, y, w, h, '#0c0406'); rect(x - 4, y + h - 2, w + 8, 2.5, '#8a0a18'); rect(x + 4, y + h, w - 8, 6 + i, '#2a1014');
    rect(x - 6, y + h - 4, 4, 3, '#0c0406'); rect(x + w + 2, y + h - 4, 4, 3, '#0c0406');
  });
  rect(-2, -134, 4, 12, '#0c0406');
  // hands/horns reaching from the sides
  for (const sgn of [-1, 1]) { rect(sgn * 58 - 3, -100, 6, 30, '#2a0a10'); rect(sgn * 62 - 3, -112, 6, 14, '#2a0a10'); rect(sgn * 54 - 3, -114, 5, 16, '#2a0a10'); }
  ctx.restore();
  // blood pool
  rect(0, base + 2 * s, W, H, '#3a0008');
  for (let i = 0; i < 20; i++) { const y = base + 6 + i * 3, x = frac(hash(i) + t * 0.05 * (i % 2 ? 1 : -1)) * W; rect(x, y, 20 + hash(i * 3) * 30, 0.6, 'rgba(255,80,90,0.35)'); }
  vignette(0.7, '#000000');
}
