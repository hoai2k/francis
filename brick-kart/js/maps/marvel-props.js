// Brick-built Marvel heroes, villains and vehicles for "Avengers Brick Assemble".
// Every figure is a scaled-up minifig (about 3.6 units tall at scale 1) made of a
// merged body plus two arm pivots so it can be posed and animated cheaply.
import { THREE, BrickBuilder, C, plastic, canvasTexture, mat4 } from './kit.js';

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

// ---- the generic big minifig ----------------------------------------------------------
// sp: { skin, face, torso, legs, hips, boots, bootH, arms, hands, decal, belt, bulk, depth, head(b,H), extra(b), arm(b,side), headTop, handR }
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
  b.add(HEAD, sp.face, 0, H, 0, Math.PI);
  b.cyl(0, H, 0, 0.395, 0.72, sp.headTop ?? sp.skin, { seg: 18 });
  if (!sp.noStud) b.cyl(0, H + 0.72, 0, 0.22, 0.14, sp.headTop ?? sp.skin, { seg: 12 });
  sp.head?.(b, H);
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
  const face = faceMat('hawk', (g, w, h) => { fill(g, w, h, '#f2c9a0'); eyesMouth(g, 128, 64, { mouth: 'grim', brow: '#4a3020' }); g.fillStyle = '#4a3020'; g.fillRect(0, 0, w, 14); });
  const decal = decalMat('hawk', (g, w, h) => {
    fill(g, w, h, '#1f1a2a');
    g.fillStyle = '#5b2c83'; g.beginPath(); g.moveTo(20, 0); g.lineTo(52, 0); g.lineTo(40, h); g.lineTo(26, h); g.fill();
    g.fillRect(w - 52, 0, 30, h);
    g.strokeStyle = '#6a6e76'; g.lineWidth = 5; g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 20, h - 20); g.stroke();
  });
  const f = fig({
    name: 'hawkeye', skin: M.skin, headTop: 0x4a3020, face, torso: 0x1f1a2a, legs: M.black, boots: M.black, arms: M.skin, hands: M.black, decal, noStud: true,
    head: (b, H) => b.sphere(0, H + 0.62, 0, 0.42, 0x4a3020, { sy: 0.35 }),
    extra: (b) => { b.boxM(mat4(-0.25, 2.2, -0.45, 0, 0, 0.5, 0.32, 1.5, 0.32), 0x5a3a24); for (let k = 0; k < 3; k++) b.boxM(mat4(-0.62 + k * 0.08, 3.0 + k * 0.03, -0.45, 0, 0, 0.5, 0.06, 0.4, 0.2), M.purple); },
    arm: (a, s) => { a.box(s * 0.04, -1.2, 0, 0.42, 0.5, 0.44, M.black); },
  });
  // bow in the left hand
  f.bow = part(f.armL, 0.04, -1.36, 0.04, (b) => {
    for (let k = -3; k <= 3; k++) { const a = k * 0.2; b.boxM(mat4(0, Math.sin(a) * 1.6, 0.3 + Math.cos(a) * 0.5 - 0.5, a, 0, 0, 0.12, 0.5, 0.14), M.purple); }
    b.boxM(mat4(0, 0, -0.1, 0, 0, 0, 0.03, 2.9, 0.03), C.white);
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
export function gamora() {
  const face = faceMat('gamora', (g, w, h) => {
    fill(g, w, h, '#3d9a4a'); eyesMouth(g, 128, 64, { mouth: 'grim', brow: '#1a3a1a', lips: '#5a1a2a' });
    g.strokeStyle = '#c8ccd4'; g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 28, 60); g.lineTo(128 + s * 34, 80); g.stroke(); g.beginPath(); g.moveTo(128 + s * 22, 64); g.lineTo(128 + s * 26, 82); g.stroke(); }
    g.fillStyle = '#3a1020'; g.fillRect(0, 0, 80, h); g.fillRect(176, 0, 80, h); g.fillRect(0, 0, w, 20);
  });
  const decal = decalMat('gamora', (g, w, h) => { fill(g, w, h, '#2a2228'); g.strokeStyle = '#5a1a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(20, 0); g.lineTo(w / 2, 60); g.lineTo(w - 20, 0); g.stroke(); g.fillStyle = '#5a1a2a'; g.fillRect(0, h - 22, w, 12); });
  return fig({
    name: 'gamora', skin: M.gamora, headTop: 0x3a1020, face, torso: 0x2a2228, legs: 0x2a2228, boots: M.black, arms: 0x2a2228, hands: M.gamora, decal, noStud: true,
    head: (b, H) => { b.sphere(0, H + 0.58, 0, 0.44, 0x3a1020, { sy: 0.45 }); b.box(0, H - 0.6, -0.25, 0.9, 1.3, 0.34, 0x3a1020); b.box(0, H - 0.9, -0.25, 0.92, 0.32, 0.36, 0xc0306a); },
    arm: (a, s) => { if (s < 0) { a.boxM(mat4(-0.04, -1.36, 1.1, Math.PI / 2, 0, 0, 0.1, 1.9, 0.26), M.silver); a.box(-0.04, -1.48, 0.1, 0.4, 0.1, 0.12, M.gold); } },
  });
}
export function drax() {
  const marks = (g, w, h, cx = w / 2) => { g.strokeStyle = '#a8141a'; g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(cx - 40 + k * 20, 0); g.bezierCurveTo(cx - 60 + k * 30, h * 0.4, cx - 20 + k * 10, h * 0.6, cx - 40 + k * 20, h); g.stroke(); } };
  const face = faceMat('drax', (g, w, h) => { fill(g, w, h, '#7a8898'); marks(g, w, h); eyesMouth(g, 128, 64, { mouth: 'grim', brow: '#3a4450', eye: '#2a1a1a' }); });
  const decal = decalMat('drax', (g, w, h) => { fill(g, w, h, '#7a8898'); g.strokeStyle = '#5a6878'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h); g.stroke(); marks(g, w, h); });
  return fig({
    name: 'drax', skin: M.drax, face, torso: M.drax, legs: 0x3a2a20, boots: 0x5a3a24, belt: 0x3a2a20, arms: M.drax, hands: M.drax, decal, bulk: 1.25, depth: 1.1, noStud: true,
    arm: (a, s) => { a.box(s * 0.04, -0.6, 0.2, 0.05, 0.6, 0.03, 0xa8141a); a.boxM(mat4(s * 0.04, -1.4, 0.55, Math.PI / 2, 0, 0, 0.08, 0.9, 0.22), M.silver); },
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
