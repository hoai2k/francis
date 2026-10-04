// Brick-built Marvel heroes, villains and vehicles for "Avengers Brick Assemble".
// Every figure is a scaled-up minifig (about 3.6 units tall at scale 1) made of a
// merged body plus two arm pivots so it can be posed and animated cheaply.
import { THREE, BrickBuilder, C, plastic, canvasTexture, mat4 } from './kit.js';
import { vertexColorPlastic } from '../lego.js';

export const M = {
  red: 0xb3121b, dkred: 0x6e0d0d, blue: 0x1f3a93, navy: 0x1a2550, gold: 0xe3b23c, silver: 0xb8bec6,
  hulk: 0x4f9a2a, purple: 0x5b2c83, thanos: 0x7d4f94, groot: 0x7a5230, grootDk: 0x4f3420,
  gamora: 0x3d9a4a, drax: 0x7a8898, coat: 0x6e1e18, orange: 0xd9641c, loki: 0x1f6a3a,
  vib: 0x8a4dff, skin: 0xf2c9a0, hair: 0x3a2412, blond: 0xe0b35a, black: 0x1a1d22, bronze: 0x6b5a45,
};

// ---- materials / textures ------------------------------------------------------------
const texCache = new Map(), matCache = new Map();
function tex(key, w, h, draw) {
  let t = texCache.get(key);
  if (!t) { t = canvasTexture(w, h, draw); texCache.set(key, t); }
  return t;
}
export function glow(color, intensity = 2, opts = {}) { return plastic(color, { emissive: color, emissiveIntensity: intensity, ...opts }); }
// face printed around a head cylinder (face centred on the canvas); `lit` draws an emissive layer
export function faceMat(key, draw, lit = null) {
  let m = matCache.get('f' + key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: tex('f' + key, 256, 128, draw), roughness: 0.38 });
    if (lit) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = tex('fl' + key, 256, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); lit(g, w, h); }); m.emissiveIntensity = 1.6; }
    matCache.set('f' + key, m);
  }
  return m;
}
// torso print (trapezoid), alpha-tested
export function decalMat(key, draw, lit = null, topFrac = 0.754) {
  let m = matCache.get('d' + key);
  if (!m) {
    const clip = (g, w, h) => { const i = w * (1 - topFrac) / 2; g.beginPath(); g.moveTo(i, 0); g.lineTo(w - i, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.clip(); };
    m = new THREE.MeshStandardMaterial({ map: tex('d' + key, 128, 128, (g, w, h) => { clip(g, w, h); draw(g, w, h); }), roughness: 0.38, alphaTest: 0.5 });
    if (lit) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = tex('dl' + key, 128, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); lit(g, w, h); }); m.emissiveIntensity = 1.5; }
    matCache.set('d' + key, m);
  }
  return m;
}
export function texMat(key, w, h, draw, opts = {}) {
  let m = matCache.get('t' + key);
  if (!m) { m = new THREE.MeshStandardMaterial({ map: tex('t' + key, w, h, draw), roughness: 0.45, ...opts }); if (opts.emissive !== undefined) m.emissiveMap = m.map; matCache.set('t' + key, m); }
  return m;
}

const HEAD = new THREE.CylinderGeometry(0.4, 0.4, 0.72, 22, 1, true).translate(0, 0.36, 0);
const PLANE = new THREE.PlaneGeometry(1, 1);
const FLAME = new THREE.ConeGeometry(1, 1, 10).rotateX(Math.PI).translate(0, -0.5, 0);
function taperedBox(bw, tw, h, d) {
  const g = new THREE.BoxGeometry(bw, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * (tw / bw));
  g.computeVertexNormals();
  return g.translate(0, h / 2, 0);
}
const TORSO = new Map();
function torsoGeo(W, D) { const k = W + ',' + D; if (!TORSO.has(k)) TORSO.set(k, taperedBox(1.3 * W, 0.98 * W, 1.25, 0.66 * D)); return TORSO.get(k); }

// ---- face drawing helpers --------------------------------------------------------------
function eyesMouth(g, cx, cy, { mouth = 'smile', brow = null, lips = null, teeth = false, eye = '#1b1b1b' } = {}) {
  g.fillStyle = eye;
  g.beginPath(); g.ellipse(cx - 17, cy - 10, 6, 8, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx + 17, cy - 10, 6, 8, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 15, cy - 13, 2, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 19, cy - 13, 2, 0, 7); g.fill();
  g.strokeStyle = brow || '#1b1b1b'; g.lineCap = 'round';
  if (brow) {
    g.lineWidth = 5;
    const a = mouth === 'angry' ? 8 : 2;
    g.beginPath(); g.moveTo(cx - 28, cy - 24 - a); g.lineTo(cx - 9, cy - 22 + a); g.stroke();
    g.beginPath(); g.moveTo(cx + 28, cy - 24 - a); g.lineTo(cx + 9, cy - 22 + a); g.stroke();
  }
  g.strokeStyle = lips || '#1b1b1b'; g.lineWidth = lips ? 6 : 4.5;
  g.beginPath();
  if (mouth === 'smile') g.arc(cx, cy + 4, 16, 0.2 * Math.PI, 0.8 * Math.PI);
  else if (mouth === 'smirk') { g.moveTo(cx - 12, cy + 20); g.quadraticCurveTo(cx + 4, cy + 24, cx + 16, cy + 14); }
  else if (mouth === 'grim') { g.moveTo(cx - 12, cy + 20); g.lineTo(cx + 12, cy + 20); }
  g.stroke();
  if (mouth === 'angry' || teeth) {
    g.fillStyle = '#1b1b1b'; g.fillRect(cx - 17, cy + 12, 34, 14);
    g.fillStyle = '#fff'; g.fillRect(cx - 15, cy + 14, 30, 4); g.fillRect(cx - 15, cy + 20, 30, 4);
  }
}
const fill = (g, w, h, c) => { g.fillStyle = c; g.fillRect(0, 0, w, h); };
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// ---- print / sculpt helpers for the redesigned figures -----------------------------------------
// Hawkeye, Gamora and Drax match their drivers (js/drivers/marvel.js): same prints, hair and props,
// rebuilt here at standing-figure scale (head radius 0.4, height 0.72).
const PI = Math.PI;
// driver-style transform (XYZ euler, optional args, fresh matrix)
const m4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const SPH = new THREE.SphereGeometry(1, 12, 8);
const SPIKE = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0);
const BLADE_TIP = new THREE.ConeGeometry(0.5, 1, 4).rotateZ(PI).translate(0, -0.5, 0);
const RODS = {}, UPV = new THREE.Vector3(0, 1, 0);
const blob = (b, x, y, z, sx, sy, sz, c, rx = 0, ry = 0, rz = 0) => b.addMatrix(SPH, plastic(c), m4(x, y, z, rx, ry, rz, sx, sy, sz));
function rod(b, a, c, r, color, seg = 8) {
  const A = new THREE.Vector3(...a), dir = new THREE.Vector3(...c).sub(A), len = dir.length();
  const geo = (RODS[seg] ||= new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0));
  b.addMatrix(geo, plastic(color), new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(UPV, dir.normalize()), new THREE.Vector3(r, len, r)));
}
// draw into builder b through an offset + uniform scale (props sized like the drivers' ones)
function scaled(b, x, y, z, k) {
  const base = new THREE.Matrix4().makeTranslation(x, y, z).scale(new THREE.Vector3(k, k, k)), T = new THREE.Matrix4();
  return {
    addMatrix: (g, mat, m) => b.addMatrix(g, mat, T.multiplyMatrices(base, m)),
    boxM: (m, c) => b.boxM(T.multiplyMatrices(base, m), c),
    sphere: (sx, sy, sz, r, c) => b.addMatrix(SPH, plastic(c), T.multiplyMatrices(base, m4(sx, sy, sz, 0, 0, 0, r, r, r))),
  };
}
// a curved blade in the Y-Z plane from (y, z); angle a: 0 = -Y, PI/2 = +Z; bends by da per segment
function curvedBlade(b, y, z, a, da, n, L, w0, w1, t, steel, fuller, tipL = 0.2) {
  for (let i = 0; i < n; i++) {
    const w = w0 + (w1 - w0) * i / Math.max(1, n - 1);
    const dy = -Math.cos(a) * L, dz = Math.sin(a) * L;
    b.boxM(m4(0, y + dy / 2, z + dz / 2, -a, 0, 0, t, L * 1.06, w), steel);
    if (fuller) b.boxM(m4(0, y + dy / 2 + Math.sin(a) * w * 0.14, z + dz / 2 + Math.cos(a) * w * 0.14, -a, 0, 0, t * 1.2, L * 1.06, w * 0.22), fuller);
    y += dy; z += dz; a += da;
  }
  b.addMatrix(BLADE_TIP, plastic(steel), m4(0, y, z, -a, 0, 0, t, tipL, w1 * 1.02));
}
// face print in true proportions around the head cylinder: draw(g, X, h) gets x relative to the
// face centre (±X = the seam at the back) and y from the top of the head (0) to the chin (h)
function printFace(key, skin, draw) {
  const k = 0.72 / (PI * 0.4);
  return faceMat(key, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, 0); g.scale(k, 1);
    g.lineCap = 'round'; g.lineJoin = 'round';
    draw(g, w / 2 / k, h);
    g.restore();
  });
}
function eye(g, x, y, rx, ry, col = '#16141a') {
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x + rx * 0.3, y - ry * 0.35, Math.max(1.6, rx * 0.32), 0, 7); g.fill();
}
const strokePath = (g, col, wd, pts) => {
  g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 4) g.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
  g.stroke();
};

// ---- the generic big minifig ----------------------------------------------------------
// sp: { skin, face, torso, legs, hips, boots, bootH, arms, hands, decal, belt, bulk, depth, head(b,H,hs), extra(b), arm(b,side), headTop, handR, headS }
export function fig(sp) {
  const W = sp.bulk || 1, D = sp.depth || 1;
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const legs = sp.legs ?? C.dkgray;
  for (const s of [-1, 1]) {
    b.box(s * 0.31 * W, 0, 0.02, 0.58 * W, 1.15, 0.72 * D, legs);
    if (sp.boots) b.box(s * 0.31 * W, 0, 0.02, 0.6 * W, sp.bootH || 0.42, 0.74 * D, sp.boots);
  }
  b.box(0, 1.1, 0, 1.24 * W, 0.33, 0.72 * D, sp.hips ?? legs);
  b.add(torsoGeo(W, D), plastic(sp.torso), 0, 1.43, 0);
  if (sp.belt) b.box(0, 1.4, 0, 1.33 * W, 0.18, 0.69 * D, sp.belt);
  if (sp.decal) b.add(PLANE, sp.decal, 0, 1.43 + 0.625, 0.33 * D + 0.012, 0, 1.3 * W, 1.25, 1);
  b.cyl(0, 2.66, 0, 0.2, 0.14, sp.skin, { seg: 10 });
  const H = 2.78;
  const hs = sp.headS || 1;   // head scale (1 = standard minifig head)
  b.add(HEAD, sp.face, 0, H, 0, Math.PI, hs, hs, hs);
  b.cyl(0, H, 0, 0.395 * hs, 0.72 * hs, sp.headTop ?? sp.skin, { seg: 18 });
  if (!sp.noStud) b.cyl(0, H + 0.72 * hs, 0, 0.22 * hs, 0.14 * hs, sp.headTop ?? sp.skin, { seg: 12 });
  sp.head?.(b, H, hs);
  sp.extra?.(b);
  const body = b.build({ name: sp.name || 'fig' });
  root.add(body);
  const out = { root, body };
  for (const side of [1, -1]) {
    const piv = new THREE.Group();
    piv.position.set(side * (0.49 * W + 0.17), 2.5, 0);
    const a = new BrickBuilder(1);
    a.sphere(side * 0.02, -0.05, 0, 0.22 * Math.sqrt(W), sp.arms);
    a.box(side * 0.04, -1.02, 0, 0.36 * Math.sqrt(W), 1.04, 0.4 * Math.sqrt(D), sp.arms);
    a.cyl(side * 0.04, -1.36, 0.04, (sp.handR || 0.17) * Math.sqrt(W), 0.36, sp.hands ?? sp.skin, { seg: 10 });
    sp.arm?.(a, side);
    piv.add(a.build({ name: 'arm' }));
    root.add(piv);
    out[side > 0 ? 'armL' : 'armR'] = piv;
  }
  return out;
}
// a separately built part hung on a pivot (for spinning weapons etc.)
export function part(parent, x, y, z, fn) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const b = new BrickBuilder(1); fn(b); g.add(b.build({ name: 'part' }));
  parent.add(g);
  return g;
}
// bake a built (static) object into the merged scenery builder
export function bake(builder, obj) {
  obj.updateMatrixWorld(true);
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    builder.bucket(o.material, o.matrixWorld.elements[12], o.matrixWorld.elements[14]).push(g);
  });
}

// ---- heroes -------------------------------------------------------------------------------
export function spiderman() {
  const face = faceMat('spidey', (g, w, h) => {
    fill(g, w, h, '#c4141c');
    g.strokeStyle = 'rgba(20,0,0,0.75)'; g.lineWidth = 1.6;
    for (let a = 0; a < 16; a++) { g.beginPath(); g.moveTo(128, 70); g.lineTo(128 + Math.cos(a / 16 * 6.283) * 200, 70 + Math.sin(a / 16 * 6.283) * 200); g.stroke(); }
    for (let r = 14; r < 150; r += 16) { g.beginPath(); g.arc(128, 70, r, 0, 7); g.stroke(); }
    for (const s of [-1, 1]) {
      g.fillStyle = '#111'; g.beginPath(); g.moveTo(128 + s * 5, 62); g.quadraticCurveTo(128 + s * 44, 24, 128 + s * 40, 58); g.quadraticCurveTo(128 + s * 30, 78, 128 + s * 5, 62); g.fill();
      g.fillStyle = '#f4f4f4'; g.beginPath(); g.moveTo(128 + s * 9, 61); g.quadraticCurveTo(128 + s * 40, 31, 128 + s * 36, 57); g.quadraticCurveTo(128 + s * 28, 72, 128 + s * 9, 61); g.fill();
    }
  });
  const decal = decalMat('spidey', (g, w, h) => {
    fill(g, w, h, '#c4141c');
    g.fillStyle = '#1f3fa0'; g.fillRect(0, 50, 22, h); g.fillRect(w - 22, 50, 22, h);
    g.strokeStyle = 'rgba(20,0,0,0.7)'; g.lineWidth = 1.3;
    for (let x = -60; x < w + 60; x += 14) { g.beginPath(); g.moveTo(w / 2, -10); g.lineTo(x, h); g.stroke(); }
    for (let y = 18; y < h; y += 18) { g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(w / 2, y + 8, w, y); g.stroke(); }
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(w / 2, 46, 7, 10, 0, 0, 7); g.fill(); g.beginPath(); g.arc(w / 2, 32, 5, 0, 7); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 3;
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(w / 2, 36 + k * 5); g.lineTo(w / 2 + s * 22, 22 + k * 12); g.lineTo(w / 2 + s * 26, 30 + k * 14); g.stroke(); }
  });
  return fig({ name: 'spiderman', skin: M.red, face, torso: M.red, legs: M.blue, hips: M.red, boots: M.red, bootH: 0.5, arms: M.red, hands: M.red, decal, noStud: true });
}

export function ironman() {
  const eyesLit = (g) => { g.fillStyle = '#bff4ff'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 6, 50); g.lineTo(128 + s * 26, 46); g.lineTo(128 + s * 24, 54); g.lineTo(128 + s * 8, 56); g.closePath(); g.fill(); } };
  const face = faceMat('iron', (g, w, h) => {
    fill(g, w, h, '#b3121b');
    g.fillStyle = '#e3b23c';
    g.beginPath(); g.moveTo(96, 30); g.lineTo(160, 30); g.lineTo(166, 70); g.lineTo(152, 110); g.lineTo(104, 110); g.lineTo(90, 70); g.closePath(); g.fill();
    g.strokeStyle = '#8a6a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(108, 92); g.lineTo(148, 92); g.stroke();
    eyesLit(g);
  }, eyesLit);
  const reactor = (g, w) => { g.fillStyle = '#dffcff'; g.beginPath(); g.arc(w / 2, 40, 13, 0, 7); g.fill(); };
  const decal = decalMat('iron', (g, w, h) => {
    fill(g, w, h, '#b3121b');
    g.fillStyle = '#e3b23c'; g.beginPath(); g.moveTo(34, 70); g.lineTo(94, 70); g.lineTo(84, h); g.lineTo(44, h); g.closePath(); g.fill();
    g.strokeStyle = '#8a6a1a'; g.lineWidth = 3; for (let y = 84; y < h; y += 14) { g.beginPath(); g.moveTo(38, y); g.lineTo(90, y); g.stroke(); }
    g.fillStyle = '#7a0c10'; g.beginPath(); g.arc(w / 2, 40, 19, 0, 7); g.fill();
    reactor(g, w);
  }, reactor);
  const blast = glow(0xbff4ff, 3);
  const f = fig({
    name: 'ironman', skin: M.red, face, torso: M.red, legs: M.gold, hips: M.red, boots: M.red, bootH: 0.55, arms: M.red, hands: M.red, decal,
    arm: (a, s) => { a.box(s * 0.04, -0.75, 0, 0.4, 0.3, 0.44, M.gold); a.sphere(s * 0.04, -1.56, 0.04, 0.13, 0, { mat: blast }); },
  });
  // boot jets
  const jets = part(f.root, 0, 0, 0, (b) => { for (const s of [-1, 1]) b.add(FLAME, glow(0x9fe8ff, 3, { trans: true, opacity: 0.8 }), s * 0.31, 0, 0.02, 0, 0.24, 1.1, 0.24); });
  f.jets = jets;
  return f;
}

function shieldMesh(r = 0.9) {
  const top = texMat('shield', 256, 256, (g, w) => {
    const c = w / 2;
    [['#c4141c', 1], ['#f4f4f4', 0.8], ['#c4141c', 0.6], ['#1f3a93', 0.4]].forEach(([col, f]) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, c * f, 0, 7); g.fill(); });
    g.fillStyle = '#f4f4f4'; g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? c * 0.15 : c * 0.37; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
    g.fill();
  }, { metalness: 0.3, roughness: 0.3 });
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.14, 28), [plastic(0xb8bec6, { metal: 0.5, rough: 0.3 }), top, plastic(0x8a9098)]);
  disc.castShadow = true;
  g.add(disc);
  return g;
}
export function captain() {
  const face = faceMat('cap', (g, w, h) => {
    fill(g, w, h, '#1f3a93');
    g.fillStyle = '#f2c9a0'; g.beginPath(); g.roundRect(94, 40, 68, 100, 18); g.fill();
    eyesMouth(g, 128, 66, { mouth: 'smile', brow: '#6a4a2a' });
    g.fillStyle = '#f4f4f4'; g.font = '900 30px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('A', 128, 34);
    for (const x of [58, 198]) { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - 14, 40 + k * 8); g.lineTo(x + 14, 30 + k * 8); g.lineTo(x + 14, 36 + k * 8); g.lineTo(x - 14, 46 + k * 8); g.fill(); } }
  });
  const decal = decalMat('cap', (g, w, h) => {
    fill(g, w, h, '#1f3a93');
    for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#f4f4f4' : '#c4141c'; g.fillRect(30 + k * 10, 70, 10, h - 70); }
    g.fillStyle = '#f4f4f4'; g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 9 : 22; g.lineTo(w / 2 + Math.cos(a) * rr, 40 + Math.sin(a) * rr); }
    g.fill();
  });
  const f = fig({ name: 'captain', skin: M.skin, headTop: M.blue, face, torso: M.blue, legs: M.blue, hips: M.navy, boots: M.bronze, bootH: 0.55, belt: M.bronze, arms: M.blue, hands: M.bronze, decal, noStud: true });
  const sh = shieldMesh(0.95);
  sh.rotation.z = Math.PI / 2; sh.rotation.y = 0;
  sh.position.set(0.38, -0.9, 0.08);
  f.armL.add(sh);
  f.shield = sh;
  return f;
}
export { shieldMesh };

export function thor() {
  const face = faceMat('thor', (g, w, h) => {
    fill(g, w, h, '#f2c9a0');
    eyesMouth(g, 128, 64, { mouth: 'grim', brow: '#b08a3a', eye: '#2a4a9a' });
    g.fillStyle = '#c8993a'; g.beginPath(); g.moveTo(92, 70); g.quadraticCurveTo(128, 138, 164, 70); g.quadraticCurveTo(160, 100, 140, 90); g.lineTo(116, 90); g.quadraticCurveTo(96, 100, 92, 70); g.fill();
    g.fillStyle = '#e0b35a'; g.fillRect(0, 0, 70, h); g.fillRect(186, 0, 70, h); g.fillRect(0, 0, w, 22);
  });
  const decal = decalMat('thor', (g, w, h) => {
    fill(g, w, h, '#2b2f36');
    g.strokeStyle = '#555c66'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) { g.fillStyle = '#c8ccd2'; g.beginPath(); g.arc(w / 2 + s * 20, 26 + r * 30, 10, 0, 7); g.fill(); g.fillStyle = '#8a9098'; g.beginPath(); g.arc(w / 2 + s * 20, 26 + r * 30, 5, 0, 7); g.fill(); }
  });
  const f = fig({
    name: 'thor', skin: M.skin, headTop: M.blond, face, torso: 0x2b2f36, legs: 0x2b2f36, boots: M.black, bootH: 0.55, arms: M.skin, hands: M.skin, decal, noStud: true,
    head: (b, H) => { b.sphere(0, H + 0.6, 0, 0.44, M.blond, { sy: 0.45 }); b.box(0, H - 0.35, -0.22, 0.92, 1.1, 0.42, M.blond); },
    extra: (b) => { b.boxM(mat4(0, 1.3, -0.46, -0.12, 0, 0, 1.55, 2.6, 0.1), M.red); b.box(0, 2.45, -0.36, 1.2, 0.26, 0.12, M.silver); },
    arm: (a, s) => a.box(s * 0.04, -1.15, 0, 0.42, 0.32, 0.46, M.silver),
  });
  // Mjolnir, pivoting at the right hand so it can spin
  f.hammer = part(f.armR, -0.04, -1.36, 0.04, (b) => {
    b.box(0, -0.9, 0, 0.14, 1.0, 0.14, M.bronze);
    b.box(0, -1.45, 0, 0.62, 0.62, 1.0, 0x8a9098);
    b.box(0, -1.1, 0, 0.2, 0.1, 0.2, M.silver);
  });
  return f;
}

export function hulk() {
  const face = faceMat('hulk', (g, w, h) => { fill(g, w, h, '#4f9a2a'); eyesMouth(g, 128, 66, { mouth: 'angry', brow: '#1b2a14' }); g.fillStyle = '#1b1d18'; g.fillRect(0, 0, w, 16); });
  const decal = decalMat('hulk', (g, w, h) => {
    fill(g, w, h, '#4f9a2a');
    g.strokeStyle = '#2f6a1a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, 50); g.quadraticCurveTo(w / 2 + s * 30, 58, w / 2 + s * 44, 30); g.stroke(); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(w / 2 + s * 4, 70 + k * 16); g.lineTo(w / 2 + s * 20, 70 + k * 16); g.stroke(); } }
  });
  return fig({
    name: 'hulk', skin: M.hulk, headTop: M.black, face, torso: M.hulk, hips: M.purple, legs: M.purple, boots: M.hulk, bootH: 0.5, arms: M.hulk, hands: M.hulk, handR: 0.26, decal, bulk: 1.6, depth: 1.3, noStud: true,
    head: (b, H) => { b.sphere(0, H + 0.6, -0.04, 0.44, M.black, { sy: 0.5 }); for (let k = 0; k < 5; k++) b.box(-0.3 + k * 0.15, H + 0.66, 0.2, 0.16, 0.14, 0.2, M.black); },
    extra: (b) => { for (const s of [-1, 1]) b.box(s * 0.5 * 1.6, 0.55, 0.02, 0.35, 0.3, 0.95, M.purple); },
  });
}

export function widow() {
  const face = faceMat('widow', (g, w, h) => { fill(g, w, h, '#f2c9a0'); eyesMouth(g, 128, 64, { mouth: 'smirk', brow: '#9a3a1a', lips: '#b0303a' }); g.fillStyle = '#b8401a'; g.fillRect(0, 0, 78, h); g.fillRect(178, 0, 78, h); g.fillRect(0, 0, w, 20); });
  const decal = decalMat('widow', (g, w, h) => {
    fill(g, w, h, '#1a1d22');
    g.strokeStyle = '#3a3e46'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    g.fillStyle = '#9a9ea6'; g.fillRect(0, h - 22, w, 14);
    g.fillStyle = '#d01a1a'; g.beginPath(); g.moveTo(w / 2 - 10, h - 30); g.lineTo(w / 2 + 10, h - 30); g.lineTo(w / 2 - 10, h); g.lineTo(w / 2 + 10, h); g.closePath(); g.fill();
  });
  const baton = glow(0x5ac8ff, 2.5);
  return fig({
    name: 'widow', skin: M.skin, headTop: 0xb8401a, face, torso: M.black, legs: M.black, boots: 0x2a2d33, arms: M.black, hands: M.black, decal, noStud: true,
    head: (b, H) => { b.sphere(0, H + 0.58, 0, 0.44, 0xb8401a, { sy: 0.5 }); b.box(0, H - 0.05, -0.18, 0.92, 0.72, 0.5, 0xb8401a); },
    arm: (a, s) => { a.box(s * 0.04, -1.1, 0, 0.4, 0.14, 0.44, M.gold, { matOpts: { emissive: 0x5ac8ff, emissiveIntensity: 0.6 } }); a.boxM(mat4(s * 0.04, -1.4, 0.4, Math.PI / 2, 0, 0, 0.1, 1.1, 0.1), 0, { mat: baton }); },
  });
}

export function hawkeye() {
  const hairC = 0xb08a52, suit = 0x1d1a26, purple = 0x6a32a8, dkPurple = 0x48226e, strap = 0x2e2620;
  const skinS = '#f2c9a0', hairS = '#b08a52';
  const face = printFace('hawk', skinS, (g, X) => {
    // short sandy crop: hairline, sideburns and the back of the head
    g.fillStyle = hairS;
    g.beginPath(); g.moveTo(-X, 0); g.lineTo(X, 0); g.lineTo(X, 100); g.lineTo(78, 92); g.lineTo(70, 30);
    g.quadraticCurveTo(30, 22, 4, 30); g.quadraticCurveTo(-30, 22, -70, 30); g.lineTo(-78, 92); g.lineTo(-X, 100); g.closePath(); g.fill();
    for (const sd of [-1, 1]) g.fillRect(sd > 0 ? 58 : -70, 30, 12, 26);
    for (const sd of [-1, 1]) {
      strokePath(g, '#6a4a22', 6.5, [sd * 42, 45, sd * 26, 43, sd * 10, 50]);   // low, focused brows
      eye(g, sd * 23, 62, 6, 7.5);
      g.fillStyle = skinS; g.fillRect(sd * 23 - 9, 51, 18, 5);                // squint
      strokePath(g, '#2a1a12', 2.5, [sd * 31, 57, sd * 23, 55, sd * 15, 57]);
    }
    strokePath(g, '#c08a64', 3, [-2, 68, 3, 78, -4, 82]);                       // nose
    strokePath(g, '#3a2418', 4.5, [-15, 98, 2, 101, 16, 92]);                    // smirk
    strokePath(g, '#c08a64', 2.5, [-10, 110, 0, 112, 10, 110]);                  // chin
  });
  const decal = decalMat('hawk', (g, w, h) => {
    g.fillStyle = '#1d1a26'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a32a8';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, 26); g.lineTo(64, 46); g.lineTo(0, 26); g.closePath(); g.fill();   // yoke
    g.beginPath(); g.moveTo(12, 36); g.lineTo(30, 42); g.lineTo(36, h); g.lineTo(8, h); g.closePath(); g.fill();                 // side panels
    g.beginPath(); g.moveTo(w - 12, 36); g.lineTo(w - 30, 42); g.lineTo(w - 36, h); g.lineTo(w - 8, h); g.closePath(); g.fill();
    g.fillStyle = skinS; g.beginPath(); g.moveTo(50, 0); g.lineTo(78, 0); g.lineTo(64, 18); g.closePath(); g.fill();
    g.strokeStyle = '#3a1c5c'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 28); g.lineTo(64, 48); g.lineTo(w, 28); g.stroke();
    g.strokeStyle = '#8a8e96'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 48); g.lineTo(64, h); g.stroke();   // zip
    g.strokeStyle = '#2e2a36'; g.lineWidth = 2;
    for (const y of [70, 92]) { g.beginPath(); g.moveTo(36, y); g.lineTo(92, y); g.stroke(); }
  });
  const f = fig({
    name: 'hawkeye', skin: M.skin, headTop: hairC, face, torso: suit, legs: suit, hips: suit, boots: M.black, bootH: 0.45, belt: 0x15131a, arms: M.skin, hands: M.black, decal, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72;
      blob(b, 0, H + 0.88 * h, -0.04 * r, 1.04 * r, 0.27 * h, 1.04 * r, hairC);
      // short spiky crop, flicked up at the front
      const m = plastic(hairC);
      for (let j = -3; j <= 3; j++) b.addMatrix(SPIKE, m, m4(j * 0.22 * r, H + 0.96 * h, (0.62 - Math.abs(j) * 0.09) * r, 0.75, 0, -j * 0.2, 0.17 * r, 0.24 * h, 0.17 * r));
      for (let j = -2; j <= 2; j++) b.addMatrix(SPIKE, m, m4(j * 0.3 * r, H + 1.04 * h, 0.15 * r, 0.35, 0, -j * 0.3, 0.2 * r, 0.2 * h, 0.2 * r));
    },
    extra: (b) => {
      b.box(0, 1.42, 0.35, 0.2, 0.14, 0.04, M.silver);                                   // belt buckle
      // quiver strap: right shoulder across the chest to the left hip, and across the back
      for (const z of [0.36, -0.36]) b.boxM(m4(0.02, 2.02, z, 0, 0, 0.62, 0.15, 1.45, 0.04), strap);
      b.boxM(m4(-0.38, 2.68, 0, 0, 0, -0.3, 0.17, 0.05, 0.76), strap);
      b.boxM(m4(-0.18, 2.32, 0.385, 0, 0, 0.62, 0.15, 0.1, 0.03), M.silver);
      // the quiver over the right shoulder, arrows bristling with purple fletching
      const k = 1.5, z0 = -0.53;
      const A = [0.33, 1.6, z0], B = [-0.33, 2.92, z0];
      const at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, z0];
      rod(b, A, B, 0.13 * k, 0x2a2434, 12);
      for (const [t0, t1, rr, c] of [[-0.03, 0.04, 0.115, purple], [0.14, 0.2, 0.137, purple], [0.8, 0.86, 0.137, purple], [0.96, 1.02, 0.142, dkPurple]]) rod(b, at(t0), at(t1), rr * k, c, 12);
      const ang = Math.atan2(A[0] - B[0], B[1] - A[1]);
      for (let j = 0; j < 5; j++) {
        const off = (j - 2) * 0.05 * k, sp = (j - 2) * 0.09, len = (0.34 + (j % 2) * 0.08) * k;
        const base = at(0.85), dir = [-Math.sin(ang + sp), Math.cos(ang + sp)];
        const p0 = [base[0] + off * Math.cos(ang), base[1] + off * Math.sin(ang), z0 + ((j % 3) - 1) * 0.05 * k];
        const p1 = [p0[0] + dir[0] * len, p0[1] + dir[1] * len, p0[2]];
        rod(b, p0, p1, 0.02 * k, 0x3a3e46, 5);
        const q = [p0[0] + dir[0] * (len - 0.09 * k), p0[1] + dir[1] * (len - 0.09 * k), p0[2]];
        for (const [vx, vz] of [[0.015, 0.11], [0.11, 0.015]]) b.boxM(m4(q[0], q[1], q[2], 0, 0, ang + sp, vx * k, 0.14 * k, vz * k), j === 2 ? 0xe8e8ee : purple);
      }
    },
    // bare arms: suit cap sleeves with a purple band, black gauntlets, a purple guard on the bow arm
    arm: (a, s) => {
      const x = s * 0.04;
      a.sphere(x, -0.04, 0, 0.245, suit, { sy: 0.85 });
      a.box(x, -0.42, 0, 0.39, 0.4, 0.43, suit);
      a.box(x, -0.47, 0, 0.4, 0.06, 0.44, purple);
      a.box(x, -1.0, 0, 0.39, 0.36, 0.43, M.black);
      if (s > 0) a.box(x, -0.98, 0.2, 0.25, 0.28, 0.06, purple);
      else a.box(x, -0.74, 0, 0.4, 0.05, 0.44, purple);
    },
  });
  // recurve bow in the left hand: limbs along the arm's Z, belly away from the archer (-Y)
  f.bow = part(f.armL, 0.04, -1.2, 0.04, (pb) => {
    const b = scaled(pb, 0, 0, 0, 1.5);
    const pt = (u) => [0, 0.17 * u * u - 0.04, 0.66 * u];
    for (let i = 0; i < 8; i++) { const u0 = -1 + i / 4, u1 = u0 + 0.25; rod(b, pt(u0), pt(u1), 0.042, Math.abs(u0 + 0.125) < 0.3 ? 0x2a2632 : purple, 6); }
    for (const sd of [-1, 1]) { rod(b, pt(sd), [0, 0.06, sd * 0.84], 0.035, 0x2a2632, 6); b.sphere(0, 0.06, sd * 0.84, 0.04, M.silver); }
    b.boxM(m4(0, -0.05, 0, 0, 0, 0, 0.1, 0.16, 0.36), 0x2a2632);
    b.boxM(m4(0.06, -0.05, 0.12, 0, 0, 0, 0.03, 0.08, 0.08), purple);
    rod(b, [0, 0.13, -0.66], [0, 0.13, 0.66], 0.014, C.white, 4);                         // string
  });
  return f;
}

export function panther() {
  const lines = (g, w, h) => { g.strokeStyle = '#b07aff'; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + s * 8, 50); g.lineTo(w / 2 + s * 34, h); g.stroke(); g.beginPath(); g.moveTo(w / 2 + s * 20, 64); g.lineTo(w / 2 + s * 50, 60); g.stroke(); } };
  const face = faceMat('panther', (g, w, h) => {
    fill(g, w, h, '#15161a');
    g.strokeStyle = '#6a6e78'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(128, 100); g.lineTo(88 + k * 16, 20); g.stroke(); }
    for (const s of [-1, 1]) { g.fillStyle = '#e8eef4'; g.beginPath(); g.moveTo(128 + s * 6, 60); g.lineTo(128 + s * 30, 48); g.lineTo(128 + s * 26, 58); g.closePath(); g.fill(); }
  });
  const decal = decalMat('panther', (g, w, h) => {
    fill(g, w, h, '#15161a');
    g.strokeStyle = '#c8ccd4'; g.lineWidth = 4;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(20 + k * 6, 0 + k * 4); g.lineTo(w / 2, 40 + k * 8); g.lineTo(w - 20 - k * 6, k * 4); g.stroke(); }
    g.strokeStyle = '#3a3e48'; g.lineWidth = 2; for (let x = 0; x < w; x += 12) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x + 8, h); g.stroke(); }
    lines(g, w, h);
  }, lines);
  return fig({
    name: 'panther', skin: 0x15161a, face, torso: 0x15161a, legs: 0x15161a, boots: 0x2a2c33, arms: 0x15161a, hands: 0x2a2c33, decal, noStud: true,
    head: (b, H) => { for (const s of [-1, 1]) b.cone(s * 0.22, H + 0.68, -0.02, 0.12, 0.26, 0x15161a, { seg: 4 }); },
    arm: (a, s) => { for (let k = -1; k <= 1; k++) a.box(s * 0.04 + k * 0.08, -1.66, 0.12, 0.04, 0.18, 0.04, M.silver); a.box(s * 0.04, -0.7, 0.21, 0.08, 0.6, 0.02, 0, { mat: glow(0xa06aff, 2) }); },
  });
}

export function strange() {
  const eye = (g, w) => { g.fillStyle = '#4aff6a'; g.beginPath(); g.arc(w / 2, 34, 8, 0, 7); g.fill(); };
  const face = faceMat('strange', (g, w, h) => {
    fill(g, w, h, '#f2c9a0'); eyesMouth(g, 128, 62, { mouth: 'grim', brow: '#2a2020' });
    g.fillStyle = '#2a2020'; g.beginPath(); g.moveTo(112, 84); g.quadraticCurveTo(128, 76, 144, 84); g.lineTo(140, 106); g.lineTo(116, 106); g.closePath(); g.fill();
    g.fillStyle = '#f2c9a0'; g.fillRect(117, 88, 22, 6);
    g.fillStyle = '#2a2020'; g.fillRect(0, 0, w, 14); g.fillStyle = '#9a9ea6'; g.fillRect(74, 14, 14, 26); g.fillRect(168, 14, 14, 26);
  });
  const decal = decalMat('strange', (g, w, h) => {
    fill(g, w, h, '#1c2a5a');
    g.strokeStyle = '#6a4a2a'; g.lineWidth = 9; g.beginPath(); g.moveTo(10, 0); g.lineTo(w - 20, h); g.stroke(); g.beginPath(); g.moveTo(w - 10, 0); g.lineTo(20, h); g.stroke();
    g.fillStyle = '#6a4a2a'; g.fillRect(0, h - 34, w, 16);
    g.fillStyle = '#e3b23c'; g.beginPath(); g.arc(w / 2, 34, 14, 0, 7); g.fill();
    eye(g, w);
  }, eye);
  return fig({
    name: 'strange', skin: M.skin, headTop: 0x2a2020, face, torso: 0x1c2a5a, legs: 0x1c2a5a, boots: 0x4a3020, arms: 0x1c2a5a, hands: M.skin, decal, noStud: true,
    head: (b, H) => { b.sphere(0, H + 0.6, -0.02, 0.43, 0x2a2020, { sy: 0.42 }); },
    extra: (b) => {
      b.boxM(mat4(0, 1.2, -0.48, -0.08, 0, 0, 1.7, 2.9, 0.1), 0xa8141a);
      for (const s of [-1, 1]) b.boxM(mat4(s * 0.42, 3.05, -0.22, -0.2, s * 0.5, s * -0.25, 0.1, 0.95, 0.6), 0xa8141a);
      for (const s of [-1, 1]) b.boxM(mat4(s * 0.55, 1.4, -0.3, 0, 0, s * 0.18, 0.12, 2.4, 0.5), 0xa8141a);
    },
    arm: (a, s) => a.box(s * 0.04, -1.2, 0, 0.42, 0.32, 0.46, 0x6a4a2a),
  });
}
let mandalaMatCache = null;
export function mandalaMat() {
  if (mandalaMatCache) return mandalaMatCache;
  const t = tex('mandala', 256, 256, (g, w) => {
    const c = w / 2; g.clearRect(0, 0, w, w);
    g.strokeStyle = '#ffb030'; g.lineWidth = 6; g.shadowColor = '#ff7a00'; g.shadowBlur = 10;
    for (const r of [0.96, 0.8, 0.5]) { g.beginPath(); g.arc(c, c, c * r, 0, 7); g.stroke(); }
    g.lineWidth = 4;
    for (let k = 0; k < 2; k++) { g.beginPath(); for (let j = 0; j <= 4; j++) { const a = k * Math.PI / 4 + j * Math.PI / 2; g.lineTo(c + Math.cos(a) * c * 0.8, c + Math.sin(a) * c * 0.8); } g.stroke(); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.82, c + Math.sin(a) * c * 0.82); g.lineTo(c + Math.cos(a) * c * 0.94, c + Math.sin(a) * c * 0.94); g.stroke(); }
  });
  mandalaMatCache = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xffc070 });
  return mandalaMatCache;
}

export function starlord() {
  const eyes = (g) => { g.fillStyle = '#ff3020'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 4, 52); g.quadraticCurveTo(128 + s * 36, 30, 128 + s * 34, 62); g.quadraticCurveTo(128 + s * 20, 70, 128 + s * 4, 52); g.fill(); } };
  const face = faceMat('starlord', (g, w, h) => {
    fill(g, w, h, '#8a9098');
    g.fillStyle = '#5a6068'; g.fillRect(0, 0, w, 22); g.fillRect(96, 80, 64, 34);
    g.strokeStyle = '#2a2e34'; g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(104 + k * 12, 84); g.lineTo(104 + k * 12, 110); g.stroke(); }
    g.fillStyle = '#2a2e34'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 2, 50); g.quadraticCurveTo(128 + s * 40, 26, 128 + s * 38, 64); g.quadraticCurveTo(128 + s * 22, 74, 128 + s * 2, 50); g.fill(); }
    eyes(g);
  }, eyes);
  const decal = decalMat('starlord', (g, w, h) => {
    fill(g, w, h, '#6e1e18');
    g.fillStyle = '#3a3e46'; g.beginPath(); g.moveTo(w / 2 - 20, 0); g.lineTo(w / 2 + 20, 0); g.lineTo(w / 2 + 10, h); g.lineTo(w / 2 - 10, h); g.fill();
    g.strokeStyle = '#3a0e0a'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2 - 20, 0); g.lineTo(w / 2 - 34, h); g.stroke(); g.beginPath(); g.moveTo(w / 2 + 20, 0); g.lineTo(w / 2 + 34, h); g.stroke();
    g.fillStyle = '#d9641c'; g.fillRect(w / 2 + 14, h - 30, 16, 20);
  });
  const f = fig({
    name: 'starlord', skin: M.skin, headTop: 0x5a6068, face, torso: M.coat, legs: 0x2e3238, boots: 0x5a3a24, bootH: 0.55, arms: M.coat, hands: M.skin, decal, noStud: true,
    head: (b, H) => { for (const s of [-1, 1]) b.cyl(s * 0.4, H + 0.2, 0, 0.12, 0.3, M.orange, { seg: 8 }); b.box(0, H + 0.72, 0, 0.1, 0.1, 0.84, M.orange); },
    extra: (b) => { b.box(0, 0.35, -0.39, 1.3, 1.1, 0.08, M.coat); for (const s of [-1, 1]) b.box(s * 0.66, 0.35, 0, 0.08, 1.1, 0.7, M.coat); },
    arm: (a, s) => a.box(s * 0.04, -1.25, 0.35, 0.18, 0.28, 0.7, 0x5a6068),
  });
  return f;
}
// Gamora's long ombré hair down her back: one sculpted, vertex-coloured piece (root → tip)
let gamoraHairGeo = null;
function gamoraHair(stops) {
  if (gamoraHairGeo) return gamoraHairGeo;
  const r = 0.4, H = 0.72;
  const g = new THREE.CylinderGeometry(1, 1, 1, 22, 14), p = g.attributes.position, n = p.count;
  const st = stops.map(([u, c]) => [u, new THREE.Color(c)]);
  const col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), u = 0.5 - p.getY(i);
    const jag = u > 0.999 ? 0.13 * (0.5 + 0.5 * Math.cos(x * PI * 2.6)) : 0;
    const bulge = 1 + 0.1 * Math.sin(u * PI);
    p.setXYZ(i, x * r * (1.07 - 0.12 * u) * bulge, H * (1.02 - u * 1.9 - jag), z * r * 0.4 * bulge - r * (0.74 + 0.36 * u));
    let k = 1; while (k < st.length - 1 && st[k][0] < u + jag * 0.8) k++;
    const [u0, c0] = st[k - 1], [u1, c1] = st[k];
    c.copy(c0).lerp(c1, Math.min(1, Math.max(0, (u + jag * 0.8 - u0) / (u1 - u0))));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  gamoraHairGeo = g;
  return g;
}
export function gamora() {
  const skin = 0x45a84c, skinS = '#45a84c';
  const leather = 0x2a2026, wine = 0x5a0e24, silver = 0xd0d6de;
  // ombré hair: near-black roots → burgundy → crimson → magenta tips
  const hA = 0x2c0e1c, hB = 0x4e0f26, hC = 0x8c1638, hD = 0xc42656, hE = 0xe8468a;
  const face = printFace('gamora', skinS, (g, X, h) => {
    g.fillStyle = '#26101a';
    g.fillRect(-X, 0, 2 * X, 22);
    g.fillRect(-X, 0, X - 72, h); g.fillRect(72, 0, X - 72, h);
    // side part sweeping across her right brow
    g.beginPath(); g.moveTo(-72, 20); g.lineTo(72, 20); g.lineTo(72, 30); g.quadraticCurveTo(30, 22, 8, 30);
    g.quadraticCurveTo(-34, 36, -72, 54); g.closePath(); g.fill();
    for (const sd of [-1, 1]) {
      strokePath(g, '#26101a', 5, [sd * 9, 49, sd * 22, 40, sd * 40, 46]);     // sharp arched brows
      eye(g, sd * 23, 61, 6.5, 8.5);
      strokePath(g, '#16141a', 3, [sd * 28, 54, sd * 36, 52, sd * 42, 48]);   // winged liner
      // Zehoberei markings: silver ridges along the cheekbones and at the temples
      strokePath(g, '#e8ecf2', 3, [sd * 13, 73, sd * 26, 79, sd * 40, 74]);
      strokePath(g, '#e8ecf2', 2.5, [sd * 22, 84, sd * 32, 88, sd * 44, 82]);
      g.fillStyle = '#e8ecf2';
      for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(sd * (46 + j * 2), 52 + j * 7, 2.2, 0, 7); g.fill(); }
    }
    strokePath(g, '#2a7a34', 2.5, [-4, 84, 0, 87, 4, 84]);                   // nose
    g.fillStyle = '#6a1230';                                                   // dark lips
    g.beginPath(); g.moveTo(-13, 98); g.quadraticCurveTo(-5, 92, 0, 95); g.quadraticCurveTo(5, 92, 13, 98);
    g.quadraticCurveTo(0, 106, -13, 98); g.fill();
  });
  const decal = decalMat('gamora', (g, w, h) => {
    g.fillStyle = '#2a2026'; g.fillRect(0, 0, w, h);
    g.fillStyle = skinS; g.beginPath(); g.moveTo(48, 0); g.lineTo(80, 0); g.lineTo(64, 30); g.closePath(); g.fill();
    g.fillStyle = '#6a1430';                                                   // wine lapels
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 16, 0); g.lineTo(64 + sd * 34, 0); g.lineTo(64 + sd * 10, 52); g.lineTo(64, 34); g.closePath(); g.fill(); }
    g.fillStyle = '#4e0c20'; g.beginPath(); g.moveTo(28, 64); g.lineTo(100, 64); g.lineTo(106, h); g.lineTo(22, h); g.closePath(); g.fill();   // corset
    g.fillStyle = '#2a2026'; g.beginPath(); g.moveTo(56, 64); g.lineTo(72, 64); g.lineTo(70, h); g.lineTo(58, h); g.closePath(); g.fill();
    g.strokeStyle = '#d0d6de'; g.lineWidth = 2;
    for (let y = 72; y < h; y += 11) { g.beginPath(); g.moveTo(56, y); g.lineTo(72, y + 6); g.moveTo(72, y); g.lineTo(56, y + 6); g.stroke(); }
    g.fillStyle = '#d0d6de';
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(64 + sd * (26 - k * 5), 8 + k * 13, 2.5, 0, 7); g.fill(); }
  });
  return fig({
    name: 'gamora', skin, headTop: hA, face, torso: leather, legs: 0x221a20, hips: leather, boots: 0x16121a, bootH: 0.5, belt: wine, arms: leather, hands: skin, decal, bulk: 0.92, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72;
      blob(b, 0, H + 0.9 * h, -0.06 * r, 1.1 * r, 0.3 * h, 1.1 * r, hA);                         // crown
      blob(b, -0.38 * r, H + 0.86 * h, 0.74 * r, 0.62 * r, 0.12 * h, 0.32 * r, hA, 0, 0, 0.38);  // side-swept fringe
      for (const sd of [-1, 1]) {                                                               // curtains framing the face
        blob(b, sd * 0.93 * r, H + 0.52 * h, -0.14 * r, 0.27 * r, 0.6 * h, 0.78 * r, hA);
        blob(b, sd * 0.95 * r, H + 0.06 * h, -0.24 * r, 0.25 * r, 0.3 * h, 0.62 * r, hB);
      }
      b.bucket(vertexColorPlastic(), 0, 0).push(gamoraHair([[0, hA], [0.3, hA], [0.5, hB], [0.7, hC], [0.86, hD], [1, hE]]).clone().translate(0, H, 0));
    },
    extra: (b) => {
      b.box(0, 1.42, 0.335, 0.17, 0.12, 0.04, silver);                                        // belt buckle
      b.boxM(m4(0, 2.72, -0.3, -0.25, 0, 0, 0.74, 0.24, 0.09), leather);                      // high collar
      for (const sd of [-1, 1]) b.boxM(m4(sd * 0.36, 2.72, -0.08, 0, sd * 0.5, sd * -0.15, 0.08, 0.24, 0.34), leather);
    },
    arm: (a, s) => {
      blob(a, s * 0.06, 0.0, 0, 0.25, 0.13, 0.26, wine, 0, 0, s * -0.35);                    // pauldron
      a.box(s * 0.04, -1.0, 0, 0.37, 0.32, 0.41, 0x420a1a);                                   // bracers
      a.box(s * 0.04, -0.75, 0, 0.38, 0.04, 0.42, silver);
      // Godslayer in the right hand: dark grip, gold guard with a red gem, long curved blade
      if (s < 0) {
        const b = scaled(a, -0.04, -1.2, 0.04, 1.4);
        b.sphere(0, 0, -0.33, 0.055, M.gold);
        b.boxM(m4(0, 0, -0.16, 0, 0, 0, 0.075, 0.085, 0.3), 0x1c1a20);
        for (const z of [-0.25, -0.07]) b.boxM(m4(0, 0, z, 0, 0, 0, 0.085, 0.095, 0.03), M.gold);
        b.boxM(m4(0, 0.02, 0.02, 0, 0, 0, 0.1, 0.42, 0.07), M.gold);
        for (const sd of [-1, 1]) b.boxM(m4(0, sd * 0.22, 0.07, sd * -0.6, 0, 0, 0.08, 0.06, 0.14), M.gold);
        b.sphere(0, 0.02, 0.02, 0.06, 0xc0103a);
        curvedBlade(b, 0.02, 0.05, PI / 2, 0.05, 5, 0.24, 0.2, 0.15, 0.045, M.silver, 0x5a606a, 0.26);
      }
    },
  });
}
export function drax() {
  const skin = 0x4f6a62, skinS = '#4f6a62', ink = 0xb8141c, inkS = '#c4161e', shade = 'rgba(18,34,30,0.42)';
  const pants = 0x3e2420, leather = 0x5a3424, W = 1.4, D = 1.2;
  const face = printFace('drax', skinS, (g, X) => {
    // tattoo lines from the crown, over the temples and cheekbones down to the jaw
    for (const sd of [-1, 1]) {
      strokePath(g, inkS, 6, [sd * 12, 0, sd * 22, 20, sd * 42, 30, sd * 60, 42, sd * 58, 72, sd * 56, 100, sd * 42, 124]);
      strokePath(g, inkS, 5, [sd * 42, 30, sd * 52, 22, sd * 54, 34]);
      strokePath(g, inkS, 6, [sd * 78, 0, sd * 86, 44, sd * 76, 74, sd * 68, 104, sd * 78, 128]);
      strokePath(g, inkS, 6, [sd * 130, 0, sd * 142, 64, sd * 128, 128]);
      g.fillStyle = shade; g.beginPath(); g.ellipse(sd * 22, 64, 17, 10, 0, 0, 7); g.fill();   // deep-set eyes
      strokePath(g, '#1c2624', 10, [sd * 42, 48, sd * 26, 48, sd * 8, 58]);                     // heavy brow
      eye(g, sd * 22, 66, 5.5, 6.5, '#140c0c');
    }
    strokePath(g, inkS, 6, [0, 0, 3, 16, 0, 38]);
    for (const sd of [-1, 1]) strokePath(g, inkS, 6, [sd * (X - 2), 0, sd * (X - 6), 64, sd * (X - 2), 128]);
    strokePath(g, '#3c544e', 4, [-9, 86, 0, 90, 9, 86]);                            // broad nose
    strokePath(g, '#1c1a18', 5.5, [-24, 106, 0, 99, 24, 106]);                      // stern frown
    strokePath(g, shade, 3, [-10, 114, 0, 116, 10, 114]);
  });
  // chest and back: muscle shading under bold red tribal lines
  const chest = (back) => (g, w, h) => {
    g.fillStyle = skinS; g.fillRect(0, 0, w, h);
    g.strokeStyle = shade; g.lineWidth = 3; g.lineCap = 'round';
    if (!back) {
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 4, 54); g.quadraticCurveTo(64 + sd * 26, 64, 64 + sd * 50, 44); g.stroke(); }
      g.beginPath(); g.moveTo(64, 10); g.lineTo(64, 120); g.stroke();
      for (const y of [76, 94, 110]) { g.beginPath(); g.moveTo(50, y); g.lineTo(78, y); g.stroke(); }
    } else {
      g.beginPath(); g.moveTo(64, 6); g.lineTo(64, 124); g.stroke();
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 14, 30); g.quadraticCurveTo(64 + sd * 34, 60, 64 + sd * 48, 34); g.stroke(); }
    }
    g.lineJoin = 'round';
    const ln = (wd, pts) => strokePath(g, inkS, wd, pts);
    ln(5, [64, 0, 66, 20, 64, 40]);
    for (const sd of [-1, 1]) {
      const x = (v) => 64 + sd * v;
      ln(6.5, [x(6), 6, x(26), 0, x(42), 14, x(54), 30, x(46), 48]);
      ln(4, [x(46), 48, x(34), 52, x(32), 40]);
      ln(5, [x(10), 40, x(24), 46, x(28), 30]);
      ln(6.5, [x(56), 4, x(62), 40, x(56), 76, x(50), 100, x(56), 128]);
      ln(5.5, [x(8), 62, x(28), 72, x(36), 96, x(40), 112, x(30), 126]);
      ln(3.5, [x(56), 76, x(44), 80, x(40), 92]);
    }
  };
  const decal = decalMat('drax', chest(false)), back = decalMat('draxBack', chest(true));
  // tattoo print wrapped round the upper arms
  const armInk = decalMat('draxArm', (g, w, h) => {
    g.fillStyle = skinS; g.fillRect(0, 0, w, h);
    strokePath(g, inkS, 9, [40, 0, 30, 40, 58, 62, 92, 84, 84, 128]);
    strokePath(g, inkS, 7, [44, 52, 70, 30, 96, 36, 108, 52, 92, 60]);
    strokePath(g, inkS, 7, [72, 76, 48, 92, 30, 90, 22, 76, 34, 72]);
    strokePath(g, inkS, 6, [96, 0, 104, 14, 118, 20]);
  }, null, 1);
  const ridge = (b, x, y, z, rz, len) => b.boxM(m4(x, y, z, 0, 0, rz, 0.045, len, 0.07), ink);
  // curved fighting knife through the fist, blade out along +Z (driver proportions, scaled)
  const knife = (b) => {
    b.sphere(0, 0, -0.3, 0.055, M.silver);
    b.boxM(m4(0, 0, -0.1, 0, 0, 0, 0.11, 0.09, 0.36), 0x2a1a14);
    for (const z of [-0.22, 0.02]) b.boxM(m4(0, 0, z, 0, 0, 0, 0.12, 0.1, 0.025), leather);
    b.boxM(m4(0, 0, 0.1, 0, 0, 0, 0.1, 0.3, 0.05), 0x8a6a3a);
    curvedBlade(b, 0, 0.12, PI / 2 + 0.12, -0.18, 4, 0.18, 0.17, 0.12, 0.05, M.silver, 0x6a7078, 0.18);
  };
  return fig({
    name: 'drax', skin, face, torso: skin, legs: pants, hips: pants, boots: 0x2a1a14, bootH: 0.4, belt: leather, arms: skin, hands: skin, handR: 0.18, decal, bulk: W, depth: D, headS: 0.9, noStud: true,
    head: (b, H, hs) => {
      const r = 0.4 * hs, h = 0.72 * hs;
      // raised tattoo ridges over the bald scalp, and ears
      b.box(0, H + h, -0.05 * r, 0.1 * r, 0.05, 1.75 * r, ink);
      for (const sd of [-1, 1]) b.boxM(m4(sd * 0.45 * r, H + h + 0.02, -0.05 * r, 0, sd * 0.3, 0, 0.1 * r, 0.04, 1.2 * r), ink);
      for (const sd of [-1, 1]) b.box(sd * 0.98 * r, H + 0.36 * h, -0.02 * r, 0.14 * r, 0.24 * h, 0.26 * r, skin);
    },
    extra: (b) => {
      b.add(PLANE, back, 0, 1.43 + 0.625, -(0.33 * D + 0.012), PI, 1.3 * W, 1.25, 1);         // back tattoos
      b.cyl(0, 2.6, -0.01, 0.3, 0.26, skin, { seg: 12 });                                     // bull neck
      for (const sd of [-1, 1]) {
        b.boxM(m4(sd * 0.36, 2.66, -0.04, 0, 0, sd * -0.36, 0.6, 0.2, 0.56), skin);            // traps
        ridge(b, sd * 0.36, 2.79, -0.04, PI / 2 + sd * -0.36, 0.4);
        ridge(b, sd * 0.36, 2.67, 0.25, PI / 2 + sd * -0.36, 0.38);
      }
      b.box(0, 1.37, 0.43, 0.32, 0.24, 0.05, 0x8a6a3a);                                       // buckle plate
      b.box(0, 1.43, 0.46, 0.18, 0.1, 0.03, M.silver);
    },
    arm: (a, s) => {
      const x = s * 0.04;
      a.sphere(x, -0.06, 0, 0.3, skin, { sy: 0.95 });                                        // deltoid
      a.box(x, -0.66, 0, 0.47, 0.56, 0.5, 0, { mat: armInk });                               // tattooed biceps
      a.box(x, -0.96, 0, 0.47, 0.24, 0.5, leather);                                          // bracer
      a.box(x, -0.82, 0, 0.48, 0.04, 0.51, M.silver);
      knife(scaled(a, x, -1.2, 0.04, 1.3));
    },
  });
}
export function thanos() {
  const stones = [0x2a6aff, 0xffd020, 0xff2020, 0xa040ff, 0x20ff60, 0xff8a10];
  const face = faceMat('thanos', (g, w, h) => {
    fill(g, w, h, '#7d4f94'); eyesMouth(g, 128, 60, { mouth: 'grim', brow: '#4a2a5a', eye: '#1a2a6a' });
    g.strokeStyle = '#4a2a5a'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(106 + k * 9, 96); g.lineTo(108 + k * 8, 124); g.stroke(); }
  });
  const decal = decalMat('thanos', (g, w, h) => {
    fill(g, w, h, '#2a3a6a');
    g.fillStyle = '#d8a830'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w * 0.8, 60); g.lineTo(w / 2, 76); g.lineTo(w * 0.2, 60); g.closePath(); g.fill();
    g.strokeStyle = '#8a6a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, 76); g.stroke();
    g.fillStyle = '#d8a830'; g.fillRect(0, h - 24, w, 14);
  });
  const f = fig({
    name: 'thanos', skin: M.thanos, face, torso: 0x2a3a6a, legs: 0x2a3a6a, boots: 0xd8a830, bootH: 0.5, arms: 0x2a3a6a, hands: M.thanos, decal, bulk: 1.55, depth: 1.25, handR: 0.24, noStud: true,
    arm: (a, s) => {
      a.box(s * 0.08, -0.2, 0, 0.62, 0.34, 0.72, 0xd8a830);
      if (s > 0) {
        a.cyl(0.04, -1.9, 0.04, 0.34, 0.95, 0xd8a830, { seg: 12 });
        for (let k = 0; k < 4; k++) a.box(-0.2 + k * 0.14, -2.3, 0.1, 0.11, 0.4, 0.14, 0xd8a830);
        stones.forEach((c, k) => a.sphere(k < 4 ? -0.2 + k * 0.14 : 0.04, k < 4 ? -2.12 : -1.55 - (k - 4) * 0.25, k < 4 ? 0.2 : 0.36, k < 4 ? 0.07 : 0.1, 0, { mat: glow(c, 2.5) }));
      }
    },
  });
  f.stones = stones.map((c) => glow(c, 2.5));
  return f;
}
export function loki() {
  const face = faceMat('loki', (g, w, h) => { fill(g, w, h, '#f2d8c0'); eyesMouth(g, 128, 64, { mouth: 'smirk', brow: '#111' }); g.fillStyle = '#d8a830'; g.fillRect(0, 0, w, 30); g.fillRect(90, 30, 76, 8); g.fillStyle = '#111'; g.fillRect(0, 30, 70, h); g.fillRect(186, 30, 70, h); });
  const decal = decalMat('loki', (g, w, h) => { fill(g, w, h, '#1f5a34'); g.fillStyle = '#111'; g.beginPath(); g.moveTo(30, 0); g.lineTo(w - 30, 0); g.lineTo(w / 2, 70); g.fill(); g.strokeStyle = '#d8a830'; g.lineWidth = 5; g.beginPath(); g.moveTo(24, 0); g.lineTo(w / 2, 76); g.lineTo(w - 24, 0); g.stroke(); g.fillStyle = '#d8a830'; g.fillRect(0, h - 22, w, 10); });
  const f = fig({
    name: 'loki', skin: 0xf2d8c0, headTop: 0xd8a830, face, torso: 0x1f5a34, legs: M.black, boots: 0x1f5a34, bootH: 0.6, arms: 0x1f5a34, hands: M.black, decal, noStud: true,
    head: (b, H) => {
      b.sphere(0, H + 0.62, 0, 0.43, 0xd8a830, { sy: 0.4 });
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) b.boxM(mat4(s * (0.28 + k * 0.03), H + 0.8 + k * 0.28, 0.1 - k * k * 0.035, -0.3 - k * 0.22, 0, 0, 0.14 - k * 0.012, 0.34, 0.16), 0xd8a830);
      b.box(0, H - 0.3, -0.22, 0.9, 1.0, 0.38, M.black);
    },
    extra: (b) => b.boxM(mat4(0, 1.25, -0.45, -0.1, 0, 0, 1.6, 2.7, 0.1), 0x1f6a3a),
  });
  f.scepter = part(f.armR, -0.04, -1.36, 0.04, (b) => {
    b.box(0, -0.3, 0, 0.1, 2.4, 0.1, 0xd8a830);
    b.boxM(mat4(0, 2.3, 0.1, 0.4, 0, 0, 0.08, 0.5, 0.08), 0xd8a830);
    b.sphere(0, 2.25, 0, 0.18, 0, { mat: glow(0x3ab0ff, 3) });
  });
  return f;
}
export function ultron() {
  const lit = (g) => { g.fillStyle = '#ff2a10'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 6, 56); g.lineTo(128 + s * 28, 48); g.lineTo(128 + s * 24, 60); g.closePath(); g.fill(); } g.fillRect(110, 86, 36, 8); };
  const face = faceMat('ultron', (g, w, h) => { fill(g, w, h, '#a8aeb6'); g.strokeStyle = '#6a7078'; g.lineWidth = 3; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + 10, h); g.stroke(); } lit(g); }, lit);
  const core = (g, w) => { g.fillStyle = '#ff3a1a'; g.beginPath(); g.arc(w / 2, 40, 12, 0, 7); g.fill(); };
  const decal = decalMat('ultron', (g, w, h) => { fill(g, w, h, '#a8aeb6'); g.strokeStyle = '#6a7078'; g.lineWidth = 4; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(10 + k * 26, 60); g.lineTo(w / 2, h); g.stroke(); } g.fillStyle = '#5a6068'; g.beginPath(); g.arc(w / 2, 40, 20, 0, 7); g.fill(); core(g, w); }, core);
  return fig({
    name: 'ultron', skin: 0xa8aeb6, face, torso: 0xa8aeb6, legs: 0x8a9098, boots: 0x6a7078, arms: 0xa8aeb6, hands: 0x6a7078, decal, noStud: true,
    head: (b, H) => { for (let k = -2; k <= 2; k++) b.boxM(mat4(k * 0.14, H + 0.78, -0.1, -0.5, 0, k * 0.2, 0.08, 0.36, 0.08), 0x8a9098); },
  });
}

// ---- non-minifig characters ------------------------------------------------------------------
export function groot() {
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const bark = [M.groot, M.grootDk, 0x8a6240];
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) b.boxM(mat4(s * (0.55 + Math.sin(k) * 0.05), 0.4 + k * 0.9, 0, 0, k * 0.4, s * 0.05, 0.42, 1.0, 0.42), bark[k % 3]);
  b.box(0, 5.2, 0, 1.6, 0.6, 0.8, M.grootDk);
  for (let k = 0; k < 7; k++) b.boxM(mat4(0, 6 + k * 0.55, 0, 0, k * 0.5, 0, 1.4 - k * 0.04 + (k > 3 ? 0.35 : 0), 0.6, 0.8), bark[k % 3]);
  for (let k = 0; k < 8; k++) b.boxM(mat4(-0.5 + (k % 4) * 0.33, 6.2 + Math.floor(k / 4) * 1.6, 0.42, 0, 0, 0.3, 0.1, 1.2, 0.08), M.grootDk);
  b.cyl(0, 9.9, 0, 0.3, 0.4, M.groot, { seg: 8 });
  const face = faceMat('groot', (g, w, h) => {
    fill(g, w, h, '#7a5230'); g.strokeStyle = '#4f3420'; g.lineWidth = 3; for (let x = 0; x < w; x += 14) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 40, x - 6, 80, x + 4, h); g.stroke(); }
    g.fillStyle = '#e8dcc0'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(128 + s * 18, 64, 11, 12, 0, 0, 7); g.fill(); }
    g.fillStyle = '#2a1a0a'; for (const s of [-1, 1]) { g.beginPath(); g.arc(128 + s * 18, 66, 7, 0, 7); g.fill(); }
    g.strokeStyle = '#2a1a0a'; g.lineWidth = 4; g.beginPath(); g.arc(128, 84, 12, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  });
  b.add(new THREE.CylinderGeometry(0.75, 0.62, 1.8, 16, 1, true).translate(0, 0.9, 0), face, 0, 10.2, 0, Math.PI);
  b.cyl(0, 10.2, 0, 0.6, 1.9, M.groot, { seg: 12 });
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; b.boxM(mat4(Math.sin(a) * 0.55, 12.1 + (k % 2) * 0.3, Math.cos(a) * 0.55 - 0.1, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5, 0.2, 0.8, 0.2), k % 2 ? M.grootDk : M.groot); }
  for (let k = 0; k < 5; k++) b.sphere(-0.7 + k * 0.35, 12.2 + (k % 2) * 0.4, -0.2, 0.22, k % 2 ? 0x6ab04a : 0x3a8a3a);
  b.sphere(0.9, 9.4, 0.3, 0.2, 0x6ab04a); b.sphere(-0.8, 7.2, 0.35, 0.18, 0x3a8a3a);
  root.add(b.build({ name: 'groot' }));
  const out = { root };
  for (const side of [1, -1]) {
    const piv = new THREE.Group(); piv.position.set(side * 1.05, 9.4, 0);
    const a = new BrickBuilder(1);
    for (let k = 0; k < 5; k++) a.boxM(mat4(side * 0.05 * Math.sin(k), -0.6 - k * 1.1, 0, 0, k * 0.5, 0, 0.42 - k * 0.02, 1.2, 0.42), bark[k % 3]);
    for (let k = 0; k < 3; k++) a.boxM(mat4(side * 0.05 + (k - 1) * 0.16, -6.3, 0.05, 0, 0, (k - 1) * 0.25, 0.12, 0.9, 0.12), M.grootDk);
    a.sphere(side * 0.2, -3, 0.2, 0.18, 0x6ab04a);
    piv.add(a.build({ name: 'branch' }));
    root.add(piv);
    out[side > 0 ? 'armL' : 'armR'] = piv;
  }
  return out;
}
export function rocket() {
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const fur = 0x8a6a50, dk = 0x3a2a20;
  for (const s of [-1, 1]) { b.box(s * 0.28, 0, 0, 0.42, 0.9, 0.6, M.orange); b.box(s * 0.28, 0, 0.1, 0.46, 0.25, 0.8, dk); }
  b.box(0, 0.9, 0, 1.1, 1.3, 0.8, M.orange);
  b.box(0, 1.5, 0.41, 0.6, 0.3, 0.02, 0x2a3a6a);
  b.box(0, 1.0, 0, 1.12, 0.14, 0.82, dk);
  b.box(0, 2.2, 0, 1.2, 0.95, 1.0, fur);
  b.box(0, 2.45, 0.51, 1.22, 0.3, 0.04, dk);
  b.box(0, 2.2, 0.6, 0.55, 0.35, 0.4, 0xe8dcc0);
  b.box(0, 2.35, 0.82, 0.18, 0.12, 0.08, dk);
  for (const s of [-1, 1]) { b.sphere(s * 0.26, 2.5, 0.54, 0.11, 0xffffff); b.sphere(s * 0.26, 2.5, 0.6, 0.06, dk); b.cone(s * 0.42, 3.1, 0, 0.26, 0.5, fur, { seg: 4 }); b.cone(s * 0.42, 3.12, 0.06, 0.14, 0.32, dk, { seg: 4 }); }
  for (let k = 0; k < 6; k++) b.boxM(mat4(0.1, 0.5 + k * 0.08, -0.6 - k * 0.3, -0.5 + k * 0.1, 0, 0, 0.38, 0.38, 0.34), k % 2 ? dk : fur);
  root.add(b.build({ name: 'rocket' }));
  const gun = new THREE.Group(); gun.position.set(0, 1.55, 0.35);
  const gb = new BrickBuilder(1);
  gb.box(0, -0.2, 0.6, 0.6, 0.55, 2.4, 0x5a6068); gb.box(0, 0.35, 0.3, 0.4, 0.3, 1.2, 0x3a3e46);
  gb.cyl(0, -0.05, 1.8, 0.2, 0.5, 0x3a3e46, { seg: 8 });
  gb.box(0, -0.25, 1.9, 0.3, 0.2, 0.2, 0, { mat: glow(0x3ad0ff, 2.5) });
  for (const s of [-1, 1]) gb.box(s * 0.62, -0.2, 0.2, 0.35, 0.3, 0.8, fur);
  gun.add(gb.build({ name: 'gun' }));
  root.add(gun);
  return { root, gun };
}

// ---- vehicles / creatures ------------------------------------------------------------------
export function chariot() {
  const b = new BrickBuilder(1);
  const hull = 0x5a5448, trim = 0x8a7a5a;
  b.box(0, 0.6, 0, 2.4, 0.8, 5.2, hull);
  b.boxM(mat4(0, 1.3, 2.5, -0.5, 0, 0, 2.2, 1.4, 0.4), trim);
  b.box(0, 1.4, -2.3, 2.2, 0.3, 0.6, trim);
  for (const s of [-1, 1]) b.boxM(mat4(s * 1.4, 0.9, 0.4, 0, 0, s * 0.3, 0.5, 0.4, 4.2), hull);
  b.box(0, 0.25, 0, 1.6, 0.35, 3.8, 0, { mat: glow(0x3ad0ff, 2.2) });
  // chitauri rider
  b.box(0, 1.4, -0.4, 0.9, 1.1, 0.6, 0x4a4a40); b.box(0, 2.5, -0.4, 1.1, 1.2, 0.7, 0x6a6452);
  b.box(0, 3.7, -0.4, 0.7, 0.7, 0.8, 0x4a4a40); b.box(0, 3.85, -0.02, 0.5, 0.15, 0.1, 0, { mat: glow(0x3ad0ff, 2) });
  for (const s of [-1, 1]) b.boxM(mat4(s * 0.8, 3.0, 0.1, -1.2, 0, 0, 0.28, 1.1, 0.28), 0x6a6452);
  b.boxM(mat4(0, 2.9, 0.9, 0, 0, 0, 0.2, 0.2, 1.8), 0x3a3a30);
  return b.build({ name: 'chariot' });
}
export function leviathanParts() {
  const seg = new BrickBuilder(1);
  seg.box(0, -3.2, -3.4, 7.5, 6.4, 6.8, 0x4e4c48);
  for (let k = 0; k < 3; k++) seg.boxM(mat4(0, 3.3, -3.4 + (k - 1) * 2.2, 0, 0, 0, 5.8 - k * 0.4, 1.2, 1.8), 0x7a6040);
  for (const s of [-1, 1]) seg.boxM(mat4(s * 3.9, 0, -3.4, 0, 0, s * 0.4, 1.2, 5.2, 5.6), 0x34322e);
  seg.box(0, -3.8, -3.4, 5.5, 0.6, 5.6, 0, { mat: glow(0x3ad0ff, 1.4) });
  const head = new BrickBuilder(1);
  head.boxM(mat4(0, 0, 4, 0, 0, 0, 8.5, 7, 9), 0x4e4c48);
  head.boxM(mat4(0, -3.6, 9, 0.35, 0, 0, 8, 1.6, 8), 0x34322e);
  head.boxM(mat4(0, 3.8, 5, -0.15, 0, 0, 6.6, 1.4, 7), 0x7a6040);
  for (const s of [-1, 1]) { head.box(s * 3.2, 0.8, 7.5, 1, 1, 1, 0, { mat: glow(0xffd23a, 2.5) }); for (let k = 0; k < 4; k++) head.boxM(mat4(s * (1 + k * 0.8), -2.3, 11.8 - k * 1.2, 0.3, 0, 0, 0.35, 1.4, 0.35), 0xe8dcc0); }
  const tail = new BrickBuilder(1);
  tail.boxM(mat4(0, 0, -4, 0, 0, 0, 4.5, 3.6, 8), 0x4e4c48); tail.boxM(mat4(0, 0, -9, 0, 0, 0, 2, 1.6, 6), 0x34322e);
  return { seg: seg.build({ name: 'lev-seg' }), head: head.build({ name: 'lev-head' }), tail: tail.build({ name: 'lev-tail' }) };
}
export function milano() {
  const b = new BrickBuilder(1);
  const blue = 0x3a5a8a, org = 0xd9641c, wh = 0xe8e8e8;
  b.boxM(mat4(0, 3, 0, 0, 0, 0, 6, 3.6, 20), wh);
  b.boxM(mat4(0, 3.2, 11, 0.12, 0, 0, 4.4, 2.8, 5), wh);
  b.boxM(mat4(0, 4.4, 9.5, 0.45, 0, 0, 3.4, 1.4, 4.2), 0, { mat: plastic(0x2a3a4a, { trans: true, opacity: 0.8, rough: 0.05 }) });
  b.boxM(mat4(0, 1.3, 0, 0, 0, 0, 6.2, 0.8, 20.2), blue);
  b.boxM(mat4(0, 4.9, -2, 0, 0, 0, 3.2, 0.9, 12), org);
  for (const s of [-1, 1]) {
    b.boxM(mat4(s * 8, 2.8, -3, 0, s * 0.45, 0, 11, 0.6, 7), blue);
    b.boxM(mat4(s * 12.5, 3.8, -6, 0, s * 0.45, s * 0.25, 5, 0.5, 4), org);
    b.boxM(mat4(s * 4.2, 3, -8.5, 0, 0, 0, 2.2, 2.2, 6), 0x5a6068);
    b.cyl(s * 4.2, 3, -11.6, 0.9, 0.2, 0, { mat: glow(0x5ad0ff, 2.5) });
    b.boxM(mat4(s * 1.6, 0.5, 4, 0, 0, 0, 0.5, 2, 0.5), 0x3a3e46);
  }
  b.boxM(mat4(0, 7, -8, 0.3, 0, 0, 0.5, 4, 3), org);
  b.boxM(mat4(0, 0.5, -6, 0, 0, 0, 0.5, 2, 0.5), 0x3a3e46);
  return b.build({ name: 'milano' });
}
export function ironDrone() {
  // Iron Legion / Ultron sentry used as a hovering statue
  const f = ultron();
  f.armL.rotation.x = -Math.PI / 2; f.armR.rotation.x = -Math.PI / 2;
  return f;
}
