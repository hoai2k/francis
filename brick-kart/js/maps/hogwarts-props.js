// Harry Potter brick characters and props for the "Hogwarts Brick Express" map.
// Minifig-style figures (robes, hats, wands) share one printed-face atlas; animated
// parts (arms, wings, legs, branches, tentacles) are separate groups.
import { THREE, BrickBuilder, C, plastic, mat4 } from './kit.js';

// ---- shared geometry -------------------------------------------------------------
const geoCache = new Map();
const G = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
const coneGeo = () => G('cone8', () => new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0));
function taperGeo(bw, tw, h, d, td = d) {
  return G(`tp${bw},${tw},${h},${d},${td}`, () => {
    const g = new THREE.BoxGeometry(bw, h, d);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * (tw / bw)); p.setZ(i, p.getZ(i) * (td / d)); }
    g.computeVertexNormals();
    return g.translate(0, h / 2, 0);
  });
}
export function spike(b, x, y, z, r, h, rx, rz, color, ry = 0, opts) { b.addMatrix(coneGeo(), opts?.mat || plastic(color, opts?.matOpts), mat4(x, y, z, rx, ry, rz, r, h, r)); }
export function rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts) { b.boxM(mat4(x, y, z, rx, ry, rz, sx, sy, sz), color, opts); }
// thick beam (box) between two points
export function beam(b, ax, ay, az, bx, by, bz, t, color, opts) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
  b.boxM(mat4((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, -Math.asin(dy / L), Math.atan2(dx, dz), 0, t, t, L), color, opts);
}

// ---- glow ------------------------------------------------------------------------------
let glowTexture = null;
export function glowTex() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}
const glowMats = new Map();
export function glowMat(color, opacity = 0.9) {
  const key = color + '|' + opacity;
  let m = glowMats.get(key);
  if (!m) { m = new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); glowMats.set(key, m); }
  return m;
}
export function glow(color, size, opacity = 0.9) { const s = new THREE.Sprite(glowMat(color, opacity)); s.scale.setScalar(size); return s; }
export const neon = (color, k = 2) => plastic(color, { emissive: color, emissiveIntensity: k });

// ---- house colours ---------------------------------------------------------------------
export const HOUSES = {
  gryffindor: [0x8a1a1a, 0xe0b040], slytherin: [0x1a5a32, 0xc0c4c8], ravenclaw: [0x1a2e6a, 0xa8784a], hufflepuff: [0xe8c030, 0x1b1b1b],
};
const ROBE = 0x15161c;

// ---- face atlas ----------------------------------------------------------------------------
const FACES = ['harry', 'hermione', 'ron', 'hagrid', 'dumbledore', 'snape', 'mcgonagall', 'draco', 'voldemort', 'student', 'student2', 'dobby', 'luna', 'neville'];
const SKIN = { voldemort: '#e6e2da', dobby: '#c9bda4', snape: '#eadbc8', hagrid: '#e8c2a0' };
let faceMatCache = null;
function drawFace(g, name, W, H) {
  g.fillStyle = SKIN[name] || '#f3d2b3'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.scale(0.57, 1);
  const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const eyes = (iris, { y = -12, dx = 30, rx = 9, ry = 10 } = {}) => { for (const sd of [-1, 1]) { ell(sd * dx, y, rx + 3, ry + 1, '#fff'); ell(sd * dx, y + 1, rx, ry, iris); ell(sd * dx, y + 2, rx * 0.45, ry * 0.5, '#111'); ell(sd * dx - 3, y - 3, 2.5, 2.5, '#fff'); } };
  const brows = (col, y = -32, tilt = 0, w = 6) => { for (const sd of [-1, 1]) line([[sd * 16, y + tilt], [sd * 44, y - tilt]], col, w); };
  const smile = (w = 18, y = 22, col = '#3a1a1a') => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(0, y - 10, w, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); };
  const flat = (w = 14, y = 26) => line([[-w, y], [w, y]], '#3a1a1a', 5);
  const roundGlasses = (col = '#1b1b1b', r = 17) => { g.strokeStyle = col; g.lineWidth = 5; for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 30, -11, r, 0, 7); g.stroke(); } line([[-13, -12], [13, -12]], col, 4); };
  switch (name) {
    case 'harry': eyes('#2a9a3a'); roundGlasses(); brows('#1b1b1b', -38); line([[-6, -62], [4, -52], [-4, -48], [6, -38]], '#b03030', 4); smile(18, 24); break;
    case 'hermione': eyes('#7a4a2a', { ry: 11 }); brows('#5a3a20', -34, 2, 5); for (const sd of [-1, 1]) line([[sd * 40, -24], [sd * 48, -30]], '#111', 3); smile(20, 24, '#a03a4a'); break;
    case 'ron': eyes('#3a7ad0'); brows('#c0501a', -34); for (let k = 0; k < 14; k++) ell((k % 7 - 3) * 12 + (k > 6 ? 4 : 0), 6 + (k > 6 ? 8 : 0), 2.2, 2.2, '#c0703a'); smile(24, 26); break;
    case 'hagrid': eyes('#1b1b1b', { rx: 6, ry: 6, y: -16 }); brows('#2a1a10', -32, 0, 9); ell(0, 2, 10, 8, '#d89a80'); g.fillStyle = '#3a2416'; g.fillRect(-90, 16, 180, 60); smile(14, 26, '#c08070'); break;
    case 'dumbledore': eyes('#3a8ae0', { ry: 8 }); brows('#f0f0f0', -32); g.strokeStyle = '#c8a040'; g.lineWidth = 4; for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 30, -10, 15, 0, Math.PI); g.stroke(); } line([[-15, -10], [15, -10]], '#c8a040', 3); g.fillStyle = '#eeeeee'; g.fillRect(-90, 14, 180, 60); line([[-30, 18], [0, 12], [30, 18]], '#d8d8d8', 8); break;
    case 'snape': eyes('#15161c', { ry: 8 }); brows('#15161c', -30, -5); line([[0, -14], [6, 6]], '#c0a890', 3); flat(12, 28); break;
    case 'mcgonagall': eyes('#4a6a3a', { ry: 8 }); g.strokeStyle = '#3a3a3a'; g.lineWidth = 4; for (const sd of [-1, 1]) g.strokeRect(sd * 30 - 16, -24, 32, 24); brows('#6a6a6a', -36, -2, 4); flat(10, 28); line([[-18, 4], [-24, 20]], '#c8a890', 2); line([[18, 4], [24, 20]], '#c8a890', 2); break;
    case 'draco': eyes('#8a9aa8', { ry: 8 }); brows('#d8c890', -32, -3, 4); g.strokeStyle = '#4a2a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-14, 26); g.quadraticCurveTo(6, 30, 18, 18); g.stroke(); break;
    case 'voldemort': for (const sd of [-1, 1]) { ell(sd * 30, -12, 12, 7, '#f4f0e8'); ell(sd * 30, -12, 3, 6, '#c01010'); } for (const sd of [-1, 1]) line([[sd * 5, 0], [sd * 8, 8]], '#5a4a4a', 4); line([[-16, 26], [16, 26]], '#7a6a6a', 4); line([[-40, -50], [-20, -30]], '#b8c0c8', 2); line([[40, -46], [26, -28]], '#b8c0c8', 2); break;
    case 'student': eyes('#5a3a20'); brows('#3a2a1a', -34); smile(18, 24); break;
    case 'student2': eyes('#2a5a8a'); brows('#6a4a2a', -34, 2); smile(14, 26, '#a03a4a'); break;
    case 'dobby': for (const sd of [-1, 1]) { ell(sd * 30, -14, 22, 20, '#fff'); ell(sd * 30, -12, 15, 15, '#3aa04a'); ell(sd * 30, -12, 7, 7, '#111'); ell(sd * 26, -18, 4, 4, '#fff'); } line([[0, -2], [4, 14]], '#9a8a74', 5); smile(12, 30, '#5a3a2a'); break;
    case 'luna': eyes('#5aa0d8', { rx: 11, ry: 12 }); brows('#d8c890', -38, 0, 3); smile(12, 26, '#c06070'); break;
    case 'neville': eyes('#5a3a20', { ry: 9 }); brows('#4a3020', -32, 3); ell(0, 6, 6, 5, '#e0b090'); smile(16, 28); break;
  }
  g.restore();
}
function faceAtlas() {
  if (faceMatCache) return faceMatCache;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  FACES.forEach((n, k) => { g.save(); g.translate((k % 4) * 256, Math.floor(k / 4) * 128); g.beginPath(); g.rect(0, 0, 256, 128); g.clip(); drawFace(g, n, 256, 128); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  faceMatCache = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3 });
  return faceMatCache;
}
function faceGeo(name) {
  return G('face' + name, () => {
    const k = FACES.indexOf(name);
    const u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4;
    const g = new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0);
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, u0 + 0.01, v0 + 0.02);
      else uv.setXY(i, u0 + uv.getX(i) * 0.25, v0 + (0.02 + uv.getY(i) * 0.96) * 0.25);
    }
    return g;
  });
}
export function head(b, name, x, y, z, r, h, rot = Math.PI) { b.add(faceGeo(name), faceAtlas(), x, y, z, rot, r, h, r); }

// ---- humanoid (minifig proportions, ~3.9 * s tall); local +Z is the front ------------
// o: { s, face, skinHex, torso, legs, shoes, hips, arms, hands, robe, hair(b,s,top), extra(b,s), itemL/itemR(a,s), headR, wide, collar }
export function humanoid(o) {
  const s = o.s, wide = o.wide ?? 1;
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const legs = o.legs ?? 0x2a2a30, skin = o.skinHex ?? 0xf3d2b3;
  for (const sd of [-1, 1]) {
    b.box(sd * 0.27 * s * wide, 0, 0.06 * s, 0.5 * s * wide, 0.28 * s, 0.76 * s, o.shoes ?? C.black);
    b.box(sd * 0.27 * s * wide, 0.28 * s, 0, 0.5 * s * wide, 1.02 * s, 0.6 * s, legs);
  }
  b.box(0, 1.3 * s, 0, 1.08 * s * wide, 0.26 * s, 0.62 * s, o.hips ?? legs);
  b.add(taperGeo(1.14 * wide, 0.86 * wide, 1.3, 0.64), plastic(o.torso), 0, 1.56 * s, 0, 0, s, s, s);
  // long open robe: skirt to the knees and panels down the sides of the torso
  if (o.robe !== undefined) {
    b.add(taperGeo(1.5 * wide, 1.16 * wide, 1.3, 0.9, 0.7), plastic(o.robe), 0, 0.2 * s, -0.04 * s, 0, s, s, s);
    for (const sd of [-1, 1]) b.box(sd * 0.42 * s * wide, 1.5 * s, 0, 0.3 * s * wide, 1.3 * s, 0.7 * s, o.robe);
    b.box(0, 1.5 * s, -0.3 * s, 1.1 * s * wide, 1.3 * s, 0.14 * s, o.robe);
  }
  if (o.tie) { b.box(0, 1.9 * s, 0.33 * s, 0.14 * s, 0.8 * s, 0.04 * s, o.tie[0]); for (let k = 0; k < 3; k++) b.box(0, (2.0 + k * 0.24) * s, 0.35 * s, 0.15 * s, 0.06 * s, 0.03 * s, o.tie[1]); }
  if (o.collar !== false) b.cyl(0, 2.78 * s, 0, 0.36 * s, 0.22 * s, o.collar ?? o.torso, { seg: 12 });
  if (o.scarf) for (let k = 0; k < 2; k++) b.cyl(0, (2.72 + k * 0.14) * s, 0, (0.46 - k * 0.04) * s, 0.14 * s, o.scarf[k], { seg: 12 });
  b.cyl(0, 2.86 * s, 0, 0.2 * s, 0.14 * s, skin, { seg: 10 });
  const hr = o.headR ?? 0.43, hh = 0.74;
  if (o.face) head(b, o.face, 0, 2.98 * s, 0, hr * s, hh * s); else b.cyl(0, 2.98 * s, 0, hr * s, hh * s, skin, { seg: 16 });
  const top = (2.98 + hh) * s;
  o.hair?.(b, s, top);
  o.extra?.(b, s);
  root.add(b.build({ name: 'fig-body' }));
  const arms = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group();
    pv.position.set(sd * 0.56 * s * wide, 2.64 * s, 0);
    const a = new BrickBuilder(1);
    a.add(taperGeo(0.36, 0.42, 1.12, 0.44), plastic(o.arms ?? o.robe ?? o.torso), 0, -1.12 * s, 0, 0, s * wide, s, s);
    if (o.robe !== undefined) a.add(taperGeo(0.62, 0.44, 0.5, 0.6), plastic(o.robe), 0, -1.2 * s, 0, 0, s * wide, s, s);
    a.cyl(0, -1.42 * s, 0, 0.19 * s, 0.34 * s, o.hands ?? skin, { seg: 10 });
    (sd < 0 ? o.itemR : o.itemL)?.(a, s);
    pv.add(a.build({ name: 'fig-arm' }));
    pv.rotation.z = sd * 0.1;
    root.add(pv);
    arms.push(pv);
  }
  return { root, armR: arms[0], armL: arms[1], s, top };
}

// hair / hats / items ---------------------------------------------------------------------
function cap(b, s, top, col, h = 0.34, r = 0.47) { b.cyl(0, top - 0.24 * s, 0, r * s, h * s, col, { seg: 14 }); }
function witchHat(b, s, top, col, h = 1.5, band) {
  b.cyl(0, top - 0.06 * s, 0, 0.9 * s, 0.08 * s, col, { seg: 16 });
  b.cone(0, top, 0, 0.48 * s, h * s, col, { seg: 12 });
  if (band) b.cyl(0, top, 0, 0.47 * s, 0.14 * s, band, { seg: 12 });
}
const wand = (col = 0x5a3a24, glowTip = 0) => (a, s) => {
  rbox(a, 0, -1.5 * s, 0.45 * s, 0.07 * s, 0.07 * s, 0.9 * s, 0, 0, 0, col);
  if (glowTip) a.sphere(0, -1.5 * s, 0.92 * s, 0.1 * s, glowTip, { matOpts: { emissive: glowTip, emissiveIntensity: 2.6 } });
};
export const hair = {
  harry: (b, s, top) => { cap(b, s, top, 0x1b1b1b); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; spike(b, Math.sin(a) * 0.3 * s, top - 0.1 * s, Math.cos(a) * 0.3 * s, 0.16 * s, 0.32 * s, Math.cos(a) * 0.9, -Math.sin(a) * 0.9, 0x1b1b1b); } },
  hermione: (b, s, top) => { const col = 0x6a4022; cap(b, s, top, col, 0.4, 0.5); for (let k = 0; k < 10; k++) { const a = Math.PI * 0.55 + (k / 9) * Math.PI * 0.9; b.sphere(Math.cos(a) * 0.48 * s, top - (0.5 + (k % 3) * 0.25) * s, Math.sin(a) * 0.4 * s - 0.1 * s, 0.3 * s, col); } b.sphere(0, top - 0.05 * s, -0.05 * s, 0.42 * s, col, { sy: 0.6 }); },
  ron: (b, s, top) => { const col = 0xc8501a; cap(b, s, top, col, 0.38); b.box(0.06 * s, top - 0.3 * s, 0.32 * s, 0.7 * s, 0.22 * s, 0.16 * s, col); },
  draco: (b, s, top) => { const col = 0xf0e0a0; cap(b, s, top, col, 0.3); rbox(b, 0, top - 0.02 * s, -0.04 * s, 0.86 * s, 0.14 * s, 0.86 * s, -0.1, 0, 0, col); },
  snape: (b, s, top) => { const col = 0x15161c; cap(b, s, top, col, 0.36, 0.48); for (const sd of [-1, 1]) b.box(sd * 0.4 * s, top - 1.05 * s, 0.04 * s, 0.16 * s, 1.0 * s, 0.6 * s, col); b.box(0, top - 1.05 * s, -0.36 * s, 0.94 * s, 1.0 * s, 0.18 * s, col); },
  neville: (b, s, top) => cap(b, s, top, 0x4a3020, 0.3),
  luna: (b, s, top) => { const col = 0xf0e4b0; cap(b, s, top, col, 0.36, 0.49); b.box(0, top - 1.4 * s, -0.32 * s, 0.94 * s, 1.4 * s, 0.24 * s, col); for (const sd of [-1, 1]) b.box(sd * 0.4 * s, top - 1.3 * s, 0.0, 0.16 * s, 1.3 * s, 0.5 * s, col); for (const sd of [-1, 1]) b.sphere(sd * 0.46 * s, top - 0.7 * s, 0.1 * s, 0.1 * s, 0xff5a8a); },
};

// ---- characters ------------------------------------------------------------------------------
const uniform = (house) => ({ torso: 0x3a3a40, legs: 0x2a2a30, robe: ROBE, tie: HOUSES[house], collar: 0xf4f4f4 });
export function harry(s, house = 'gryffindor') { return humanoid({ s, face: 'harry', ...uniform(house), scarf: HOUSES[house], hair: hair.harry, itemR: wand(0x6a4a2a) }); }
export function hermione(s) { return humanoid({ s, face: 'hermione', ...uniform('gryffindor'), hair: hair.hermione, legs: 0x5a5a62, itemR: wand(0x8a6a4a, 0xfff2c0), extra: (b, s) => { b.add(taperGeo(1.2, 1.1, 0.5, 0.7), plastic(0x5a5a62), 0, 0.9 * s, 0, 0, s, s, s); } }); }
export function ron(s) { return humanoid({ s, face: 'ron', ...uniform('gryffindor'), torso: 0x8a3a2a, hair: hair.ron, itemR: wand(0x8a6a4a) }); }
export function neville(s) { return humanoid({ s, face: 'neville', ...uniform('gryffindor'), hair: hair.neville, itemL: (a, s) => { a.cyl(0, -2.2 * s, 0.1 * s, 0.4 * s, 0.6 * s, 0x8a4a2a, { seg: 10 }); for (let k = 0; k < 5; k++) spike(a, (k - 2) * 0.12 * s, -1.6 * s, 0.1 * s, 0.1 * s, 0.6 * s, 0, (k - 2) * 0.3, 0x3a8a3a); } }); }
export function luna(s) { return humanoid({ s, face: 'luna', ...uniform('ravenclaw'), hair: hair.luna, itemR: (a, s) => { rbox(a, 0, -1.6 * s, 0.4 * s, 0.6 * s, 0.8 * s, 0.1 * s, 0, 0, 0, 0xe04a8a); } }); }
export function draco(s) { return humanoid({ s, face: 'draco', ...uniform('slytherin'), scarf: HOUSES.slytherin, hair: hair.draco, itemR: wand(0x2a2a2a) }); }
export function student(s, house, v = 0) {
  const hc = [0x3a2a1a, 0x1b1b1b, 0xc8a050, 0x8a3a1a][v % 4];
  return humanoid({ s, face: v % 2 ? 'student2' : 'student', ...uniform(house), scarf: HOUSES[house], hair: (b, s, top) => cap(b, s, top, hc, 0.34 + (v % 3) * 0.04) });
}
export function snape(s) { return humanoid({ s, face: 'snape', skinHex: 0xeadbc8, torso: 0x15161c, legs: 0x15161c, robe: 0x0e0f14, collar: 0xf4f4f4, buttons: 0, hair: hair.snape, itemR: wand(0x1b1b1b) }); }
export function mcgonagall(s) {
  return humanoid({ s, face: 'mcgonagall', torso: 0x1a4a2a, legs: 0x1a4a2a, robe: 0x123a20, collar: 0x1a4a2a, hair: (b, s, top) => { cap(b, s, top, 0x5a5a5a, 0.3); witchHat(b, s, top, 0x123a20, 1.6); }, itemR: wand(0x3a2a1a),
    extra: (b, s) => { b.add(taperGeo(1.5, 1.2, 1.3, 0.9), plastic(0x123a20), 0, 0, 0, 0, s, s, s); } });
}
export function dumbledore(s) {
  const P = 0x5a2a8a;
  return humanoid({ s, face: 'dumbledore', torso: P, legs: P, robe: 0x4a1f78, collar: P, hands: 0xf3d2b3,
    hair: (b, s, top) => { cap(b, s, top, 0xeeeeee, 0.3); for (const sd of [-1, 1]) b.box(sd * 0.38 * s, top - 1.3 * s, -0.05 * s, 0.18 * s, 1.3 * s, 0.6 * s, 0xeeeeee); witchHat(b, s, top, P, 1.9, 0xc8a040); },
    extra: (b, s) => { b.add(taperGeo(1.6, 1.2, 1.3, 1.0), plastic(0x4a1f78), 0, 0, 0, 0, s, s, s); b.add(taperGeo(0.3, 0.8, 1.9, 0.2), plastic(0xeeeeee), 0, 1.2 * s, 0.36 * s, 0, s, s, s); for (let k = 0; k < 6; k++) b.sphere(Math.cos(k * 2.4) * 0.5 * s, (0.6 + (k % 3) * 0.5) * s, 0.5 * s, 0.07 * s, 0xf2cd37, { matOpts: { emissive: 0xc8a040, emissiveIntensity: 1 } }); },
    itemR: wand(0x8a8070, 0xe8f4ff) });
}
export function voldemort(s) { return humanoid({ s, face: 'voldemort', skinHex: 0xe6e2da, torso: 0x15161c, legs: 0x15161c, robe: 0x101116, collar: 0x15161c, hands: 0xe6e2da, headR: 0.42, extra: (b, s) => { b.add(taperGeo(1.6, 1.2, 1.3, 1.0), plastic(0x101116), 0, 0, 0, 0, s, s, s); }, itemR: wand(0xe8e0d0, 0x40ff60) }); }
export function hagrid(s) {
  const COAT = 0x5a3a24, HAIR = 0x2a1a10;
  return humanoid({ s, face: 'hagrid', skinHex: 0xe8c2a0, torso: COAT, legs: 0x3a2a1a, arms: COAT, hands: 0xe8c2a0, wide: 1.45, headR: 0.5, collar: false, shoes: 0x2a1a10,
    hair: (b, s, top) => { b.cyl(0, top - 0.3 * s, 0, 0.56 * s, 0.44 * s, HAIR, { seg: 14 }); for (let k = 0; k < 12; k++) { const a = Math.PI * 0.5 + (k / 11) * Math.PI; b.sphere(Math.cos(a) * 0.52 * s, top - (0.5 + (k % 3) * 0.3) * s, Math.sin(a) * 0.48 * s, 0.24 * s, HAIR); } b.add(taperGeo(1.0, 0.9, 0.9, 0.5), plastic(HAIR), 0, top - 1.35 * s, 0.24 * s, 0, s, s, s); b.sphere(0, top - 1.4 * s, 0.4 * s, 0.4 * s, HAIR, { sy: 1.2 }); },
    extra: (b, s) => { b.add(taperGeo(2.0, 1.6, 2.6, 1.1), plastic(COAT), 0, 0.3 * s, 0, 0, s, s, s); for (let k = 0; k < 4; k++) b.box(0.5 * s, (1.0 + k * 0.4) * s, 0.56 * s, 0.14 * s, 0.14 * s, 0.05 * s, 0xc8a040); b.box(0, 1.2 * s, 0, 1.75 * s, 0.24 * s, 1.05 * s, 0x2a1a10); },
  });
}
// Dobby: small house-elf in a pillowcase with huge ears
export function dobby(s) {
  const SK = 0xc9bda4;
  return humanoid({ s, face: 'dobby', skinHex: SK, torso: 0xd8d0bc, legs: SK, arms: SK, hands: SK, hips: 0xd8d0bc, shoes: SK, headR: 0.5, collar: false, wide: 0.85,
    hair: (b, s, top) => { b.sphere(0, top - 0.1 * s, 0, 0.5 * s, SK, { sy: 0.4 }); for (const sd of [-1, 1]) rbox(b, sd * 0.85 * s, top - 0.35 * s, 0, 0.9 * s, 0.5 * s, 0.08 * s, 0, 0, sd * 0.25, SK); },
    extra: (b, s) => { b.add(taperGeo(1.2, 1.0, 1.0, 0.8), plastic(0xd8d0bc), 0, 0.9 * s, 0, 0, s, s, s); },
    itemL: (a, s) => { a.box(0, -2.0 * s, 0.1 * s, 0.24 * s, 0.6 * s, 0.24 * s, 0xf4f4f4); a.box(0, -2.0 * s, 0.24 * s, 0.24 * s, 0.24 * s, 0.4 * s, 0xf4f4f4); } });
}

// ---- creatures -------------------------------------------------------------------------------------
// Hedwig: snowy owl, wings are separate groups (userData.wings) for flapping. ~2.4 * s wingspan
export function hedwig(s = 1) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 0.6 * s, C.white, { sy: 1.35 }); b.sphere(0, 0.85 * s, 0.1 * s, 0.48 * s, C.white);
  for (const sd of [-1, 1]) { b.sphere(sd * 0.2 * s, 0.92 * s, 0.48 * s, 0.11 * s, 0xf2cd37, { matOpts: { emissive: 0xc8a020, emissiveIntensity: 0.6 } }); b.sphere(sd * 0.2 * s, 0.92 * s, 0.56 * s, 0.05 * s, C.black); }
  spike(b, 0, 0.82 * s, 0.5 * s, 0.07 * s, 0.18 * s, Math.PI / 2 + 0.4, 0, 0x3a3a3a);
  for (let k = 0; k < 6; k++) b.box(Math.cos(k * 2.1) * 0.3 * s, (k * 0.12 - 0.4) * s, -0.45 * s, 0.1 * s, 0.06 * s, 0.06 * s, 0x3a3a3a);
  rbox(b, 0, -0.7 * s, -0.5 * s, 0.5 * s, 0.1 * s, 0.6 * s, 0.5, 0, 0, C.white);
  g.add(b.build({ name: 'hedwig' }));
  const wings = [];
  for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sd * 0.45 * s, 0.25 * s, 0);
    const wb = new BrickBuilder(1);
    wb.box(sd * 0.75 * s, -0.05 * s, 0, 1.5 * s, 0.1 * s, 0.75 * s, C.white);
    wb.box(sd * 1.6 * s, -0.05 * s, -0.1 * s, 0.6 * s, 0.08 * s, 0.55 * s, C.white);
    for (let k = 0; k < 3; k++) wb.box(sd * (0.5 + k * 0.5) * s, 0.01 * s, -0.2 * s, 0.14 * s, 0.04 * s, 0.1 * s, 0x3a3a3a);
    w.add(wb.build({ name: 'wing' })); g.add(w); wings.push(w);
  }
  g.userData.wings = wings;
  return g;
}
// Dementor: hooded tattered cloak floating; ~6 * s tall, origin at the hem
export function dementor(s = 1) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  const CL = 0x101116, CL2 = 0x1c1e26;
  b.add(G('dem-cloak', () => new THREE.ConeGeometry(1, 1, 9, 1, true).translate(0, 0.5, 0)), plastic(CL, { rough: 0.95 }), 0, 0, 0, 0, 1.1 * s, 5 * s, 1.1 * s);
  b.sphere(0, 4.9 * s, 0, 0.75 * s, CL2, { sy: 1.15 });
  spike(b, 0, 5.4 * s, -0.25 * s, 0.6 * s, 1.1 * s, -0.5, 0, CL);
  b.sphere(0, 4.75 * s, 0.32 * s, 0.5 * s, 0x000000, { sy: 1.2 });
  for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2; rbox(b, Math.sin(a) * 1.0 * s, -0.6 * s - (k % 3) * 0.4 * s, Math.cos(a) * 1.0 * s, 0.4 * s, (1.6 + (k % 3) * 0.6) * s, 0.08 * s, Math.cos(a) * 0.2, a, -Math.sin(a) * 0.2, k % 2 ? CL : CL2); }
  for (const sd of [-1, 1]) {
    rbox(b, sd * 0.9 * s, 3.4 * s, 0.5 * s, 0.4 * s, 1.6 * s, 0.4 * s, -0.9, 0, sd * 0.5, CL2);
    for (let k = 0; k < 4; k++) rbox(b, sd * (1.25 + k * 0.08) * s, 3.0 * s, (1.3 + k * 0.05) * s, 0.06 * s, 0.7 * s, 0.06 * s, -1.2, 0, sd * (0.2 + k * 0.15), 0x7a7a80);
  }
  g.add(b.build({ name: 'dementor' }));
  return g;
}
// Acromantula: 8-legged spider, ~3.4 * s across; legs are groups (userData.legs)
export function spider(s = 1, col = 0x1e1a18) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 1.6 * s, -1.2 * s, 1.3 * s, col, { sy: 0.85 });
  b.sphere(0, 1.4 * s, 0.4 * s, 0.75 * s, col);
  for (let k = 0; k < 10; k++) b.box(Math.cos(k * 1.7) * 0.6 * s, (1.6 + Math.sin(k * 2.3) * 0.7) * s, (-1.2 + Math.sin(k * 1.1) * 0.6) * s, 0.12 * s, 0.4 * s, 0.12 * s, 0x5a4a3a);
  for (let k = 0; k < 6; k++) b.sphere(((k % 3) - 1) * 0.22 * s, (1.6 + Math.floor(k / 3) * 0.2) * s, 1.05 * s, 0.1 * s, 0x000000, { matOpts: { emissive: 0x200000, emissiveIntensity: 1, rough: 0.1 } });
  for (const sd of [-1, 1]) spike(b, sd * 0.2 * s, 1.0 * s, 1.0 * s, 0.1 * s, 0.6 * s, Math.PI * 0.8, 0, 0x8a7a6a);
  g.add(b.build({ name: 'spider' }));
  const legs = [];
  for (let k = 0; k < 8; k++) {
    const sd = k < 4 ? -1 : 1, n = k % 4;
    const pv = new THREE.Group(); pv.position.set(sd * 0.5 * s, 1.5 * s, (0.6 - n * 0.4) * s); pv.rotation.y = sd * (Math.PI / 2) + (n - 1.5) * 0.45 * sd;
    const lb = new BrickBuilder(1);
    rbox(lb, 0, 0.5 * s, 1.0 * s, 0.22 * s, 0.22 * s, 2.2 * s, -0.5, 0, 0, col);
    rbox(lb, 0, 0.0, 2.6 * s, 0.18 * s, 0.18 * s, 2.4 * s, 1.0, 0, 0, col);
    pv.add(lb.build({ name: 'spider-leg' })); g.add(pv); legs.push(pv);
  }
  g.userData.legs = legs;
  return g;
}
export function spiderWalk(sp, t, amp = 0.25) { sp.userData.legs.forEach((l, k) => { l.rotation.x = Math.sin(t + (k % 2) * Math.PI + (k > 3 ? Math.PI / 2 : 0)) * amp; }); }

// Buckbeak the hippogriff (~5 * s long) lying in the pumpkin patch
export function buckbeak(s = 1) {
  const b = new BrickBuilder(1), GR = 0x8a8a90, FE = 0xb8b8c0;
  b.box(0, 1.0 * s, -0.6 * s, 1.6 * s, 1.5 * s, 3.4 * s, GR);
  b.box(0, 1.3 * s, 1.2 * s, 1.5 * s, 1.6 * s, 1.4 * s, FE);
  rbox(b, 0, 3.0 * s, 1.9 * s, 0.9 * s, 1.6 * s, 0.9 * s, 0.4, 0, 0, FE);
  b.box(0, 3.6 * s, 2.3 * s, 0.9 * s, 0.9 * s, 1.1 * s, C.white);
  spike(b, 0, 3.85 * s, 2.8 * s, 0.25 * s, 0.9 * s, Math.PI / 2 + 0.5, 0, 0xc8a040);
  for (const sd of [-1, 1]) { b.sphere(sd * 0.45 * s, 4.05 * s, 2.6 * s, 0.12 * s, 0xff9a20, { matOpts: { emissive: 0xc86010, emissiveIntensity: 1 } }); rbox(b, sd * 0.95 * s, 2.0 * s, -0.3 * s, 0.2 * s, 1.0 * s, 3.4 * s, 0.25, 0, sd * 0.3, FE); for (const z of [1.4, -1.8]) b.box(sd * 0.55 * s, 0, z * s, 0.4 * s, 1.0 * s, 0.4 * s, z > 0 ? 0xc8a040 : GR); }
  rbox(b, 0, 1.6 * s, -2.6 * s, 0.3 * s, 0.3 * s, 1.6 * s, 0.8, 0, 0, GR);
  return b.build({ name: 'buckbeak' });
}
// Fang the boarhound
export function fang(s = 1) {
  const b = new BrickBuilder(1), D = 0x2a2420;
  b.box(0, 1.0 * s, -0.2 * s, 1.0 * s, 1.0 * s, 2.4 * s, D); b.box(0, 1.5 * s, 1.2 * s, 0.9 * s, 0.9 * s, 0.9 * s, D); b.box(0, 1.3 * s, 1.8 * s, 0.6 * s, 0.5 * s, 0.6 * s, D);
  for (const sd of [-1, 1]) { b.box(sd * 0.5 * s, 1.6 * s, 1.1 * s, 0.14 * s, 0.7 * s, 0.4 * s, D); for (const z of [0.7, -1]) b.box(sd * 0.32 * s, 0, z * s, 0.3 * s, 1.0 * s, 0.3 * s, D); }
  b.box(0, 1.1 * s, 2.1 * s, 0.2 * s, 0.14 * s, 0.1 * s, C.black); b.box(0, 0.9 * s, 1.9 * s, 0.3 * s, 0.3 * s, 0.1 * s, 0xe05a6a);
  return b.build({ name: 'fang' });
}
// Golden Snitch with fluttering wings
export function snitch(s = 1) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 0.35 * s, 0xf2c030, { matOpts: { metal: 0.8, rough: 0.2, emissive: 0xc89010, emissiveIntensity: 0.8 } });
  g.add(b.build({ name: 'snitch' }));
  const wings = [];
  for (const sd of [-1, 1]) { const w = new THREE.Group(); const wb = new BrickBuilder(1); rbox(wb, sd * 0.7 * s, 0.1 * s, 0, 1.1 * s, 0.04 * s, 0.4 * s, 0, 0, 0, 0xf4f4f0, { matOpts: { trans: true, opacity: 0.85 } }); w.add(wb.build()); g.add(w); wings.push(w); }
  g.add(glow(0xffd040, 3 * s, 0.7));
  g.userData.wings = wings;
  return g;
}
// Bludger: an iron ball with a dark shadow under it (shadow at local y = -lift)
export function bludger(r = 1.3, lift = 1.6) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 0, 0, r, 0x2a2420, { matOpts: { metal: 0.6, rough: 0.35 } });
  for (let k = 0; k < 3; k++) rbox(b, 0, 0, 0, r * 2.05, 0.16, 0.16, 0, k * 1.05, 0.6, 0x5a4a3a);
  const ball = b.build({ name: 'bludger' }); ball.position.y = lift; g.add(ball);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(r * 1.2, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  sh.position.y = 0.12; g.add(sh);
  g.userData.ball = ball;
  return g;
}

// ---- vehicles ----------------------------------------------------------------------------------------
const wheelGeo = () => G('wheel', () => new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2));
const SCARLET = 0xa8141a, BLACKM = 0x1b1b1e, GOLDT = 0xd8b040;
// Hogwarts Express: steam engine + tender + carriages along +Z (front). Returns { root, length, chimney }
export function express(cars = 3) {
  const root = new THREE.Group(), b = new BrickBuilder(1);
  const lit = plastic(0xffe0a0, { emissive: 0xffc860, emissiveIntensity: 1.2 });
  const wheel = (x, z, r) => { b.add(wheelGeo(), plastic(SCARLET), x, r, z, 0, 0.4, r, r); b.add(wheelGeo(), plastic(BLACKM), x + Math.sign(x) * 0.25, r, z, 0, 0.12, r * 0.4, r * 0.4); };
  // engine (front at z = 0)
  let z = -7;
  b.box(0, 0.5, z, 3.6, 0.8, 14, BLACKM);
  b.add(G('boiler', () => new THREE.CylinderGeometry(1, 1, 1, 18).rotateX(Math.PI / 2)), plastic(SCARLET), 0, 3.0, z + 1.2, 0, 1.6, 1.6, 8.5);
  for (const zz of [-2.4, 0.4, 3.2]) b.add(G('boiler'), plastic(GOLDT, { metal: 0.6, rough: 0.3 }), 0, 3.0, z + zz, 0, 1.66, 1.66, 0.3);
  b.add(G('boiler'), plastic(BLACKM), 0, 3.0, z + 5.8, 0, 1.7, 1.7, 1.4);
  b.cyl(0, 4.4, z + 5.6, 0.5, 2.2, BLACKM, { seg: 10 }); b.cyl(0, 6.4, z + 5.6, 0.7, 0.4, BLACKM, { seg: 10 });
  b.cyl(0, 4.4, z + 2.4, 0.6, 0.9, GOLDT, { seg: 10, matOpts: { metal: 0.6, rough: 0.3 } });
  b.box(0, 1.2, z - 4.8, 3.6, 4.4, 3.4, SCARLET); b.box(0, 5.6, z - 4.8, 4.0, 0.4, 3.8, BLACKM);
  for (const sd of [-1, 1]) b.box(sd * 1.81, 3.2, z - 4.6, 0.05, 1.2, 1.6, 0, { mat: lit });
  b.box(0, 0.6, z + 7.0, 3.8, 0.8, 0.5, SCARLET); b.sphere(0, 3.0, z + 6.6, 0.45, 0, { mat: plastic(0xfff4c0, { emissive: 0xffe080, emissiveIntensity: 2.4 }) });
  b.box(0, 1.6, z + 7.4, 2.4, 0.3, 0.6, BLACKM);
  for (const sd of [-1, 1]) { for (const zz of [-2.6, -0.2, 2.2]) wheel(sd * 1.6, z + zz, 1.15); wheel(sd * 1.6, z + 5.2, 0.6); b.box(sd * 1.95, 1.15, z - 0.2, 0.12, 0.2, 5.2, 0x8a8a8a, { matOpts: { metal: 0.7, rough: 0.3 } }); }
  // tender
  z = -18; b.box(0, 0.5, z, 3.6, 3.6, 7, SCARLET); b.box(0, 4.1, z, 3.2, 0.6, 6.4, 0x2a2a2a); b.box(0, 3.4, z, 3.7, 0.3, 7.1, GOLDT);
  for (const sd of [-1, 1]) for (const zz of [-2, 2]) wheel(sd * 1.6, z + zz, 0.75);
  // carriages
  for (let c = 0; c < cars; c++) {
    z = -30 - c * 14;
    b.box(0, 0.8, z, 3.8, 4.4, 13, SCARLET); b.box(0, 3.0, z, 3.9, 0.3, 13.1, GOLDT);
    b.add(G('roof', () => new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2)), plastic(BLACKM), 0, 5.2, z, 0, 2.0, 0.6, 13);
    for (const sd of [-1, 1]) for (let w = -2; w <= 2; w++) b.box(sd * 1.92, 3.4, z + w * 2.4, 0.06, 1.3, 1.8, 0, { mat: lit });
    for (const sd of [-1, 1]) for (const zz of [-4.5, 4.5]) wheel(sd * 1.6, z + zz, 0.75);
  }
  const body = b.build({ name: 'hogwarts-express' }); root.add(body);
  return { root, length: 30 + cars * 14, chimney: new THREE.Vector3(0, 6.8, -1.4) };
}
// Knight Bus: purple triple-decker, front along +Z (~12 long)
export function knightBus() {
  const b = new BrickBuilder(1), P = 0x4a1f8a;
  const lit = plastic(0xffe8a0, { emissive: 0xffd070, emissiveIntensity: 1.1 });
  b.box(0, 0.7, 0, 4.4, 8.4, 12, P);
  for (let f = 0; f < 3; f++) { b.box(0, 1.7 + f * 2.7, 0, 4.5, 1.4, 11.2, 0, { mat: lit }); b.box(0, 3.4 + f * 2.7, 0, 4.6, 0.3, 12.1, 0xd8b040); }
  b.box(0, 9.1, 0, 4.2, 0.4, 11.6, 0x3a1670);
  b.box(0, 1.2, 6.0, 4.0, 2.2, 0.2, 0x1b1b1b); for (const sd of [-1, 1]) b.sphere(sd * 1.5, 1.6, 6.1, 0.4, 0, { mat: plastic(0xfff4c0, { emissive: 0xffe080, emissiveIntensity: 2.4 }) });
  b.box(0, 7.6, 6.08, 3.6, 0.9, 0.1, 0xd8b040);
  for (const sd of [-1, 1]) for (const z of [-3.8, 3.8]) b.add(wheelGeo(), plastic(0x1b1b1b), sd * 2.1, 1.0, z, 0, 0.6, 1.0, 1.0);
  const g = b.build({ name: 'knight-bus' });
  const hold = new THREE.Group(); hold.add(g);
  const lamp = glow(0xfff0b0, 9, 0.7); lamp.position.set(0, 1.6, 7); hold.add(lamp);
  return hold;
}
// Flying Ford Anglia (light blue), front along +Z
export function fordAnglia() {
  const b = new BrickBuilder(1), BL = 0x7ab4d4;
  b.box(0, 0.6, 0, 2.6, 1.2, 5.4, BL); b.box(0, 1.8, -0.3, 2.3, 1.2, 2.8, 0xf0f0f0);
  b.box(0, 1.9, -0.3, 2.35, 0.8, 2.4, 0x6a8aa0, { matOpts: { trans: true, opacity: 0.6 } });
  for (const sd of [-1, 1]) { b.sphere(sd * 0.85, 1.2, 2.7, 0.3, 0, { mat: plastic(0xfff4c0, { emissive: 0xffe080, emissiveIntensity: 2.2 }) }); for (const z of [-1.7, 1.7]) b.add(wheelGeo(), plastic(0x1b1b1b), sd * 1.25, 0.55, z, 0, 0.4, 0.55, 0.55); }
  b.box(0, 0.6, 2.72, 2.4, 0.4, 0.1, 0xc8c8c8);
  return b.build({ name: 'ford-anglia' });
}

// ---- scenery pieces ---------------------------------------------------------------------------------------
export function pumpkin(b, x, z, s = 1, y = 0) {
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; b.sphere(x + Math.cos(a) * 0.5 * s, y + 1.0 * s, z + Math.sin(a) * 0.5 * s, 0.85 * s, k % 2 ? 0xf07a10 : 0xe06a08, { sy: 0.85 }); }
  b.cyl(x, y + 1.6 * s, z, 0.14 * s, 0.6 * s, 0x3a6a2a, { seg: 6 });
}
// candle floating (wax + flame); flames emissive
export function candle(b, x, y, z, s = 1) {
  b.cyl(x, y, z, 0.18 * s, 1.1 * s, 0xf4f0e0, { seg: 8 });
  b.cone(x, y + 1.1 * s, z, 0.12 * s, 0.4 * s, 0xffc040, { seg: 6, matOpts: { emissive: 0xffa020, emissiveIntensity: 3 } });
}
// house banner hanging down from (x, y, z), facing rot
export function banner(b, x, y, z, house, rot, w = 3, h = 7) {
  const [c1, c2] = HOUSES[house], ca = Math.cos(rot), sa = Math.sin(rot);
  b.box(x, y, z, w + 0.6, 0.3, 0.3, 0xc8a040, { rot });
  b.box(x, y - h, z, w, h, 0.15, c1, { rot });
  // pointed tail
  rbox(b, x, y - h - 0.2, z, w * 0.7, w * 0.7, 0.14, 0, rot, Math.PI / 4, c1);
  // simple shield crest in the second colour
  const fx = sa * 0.1, fz = ca * 0.1;
  b.box(x + fx, y - h * 0.55, z + fz, w * 0.55, h * 0.3, 0.12, c2, { rot });
  rbox(b, x + fx, y - h * 0.55, z + fz, w * 0.4, w * 0.4, 0.12, 0, rot, Math.PI / 4, c2);
  b.box(x + fx * 1.4, y - h * 0.5, z + fz * 1.4, w * 0.25, h * 0.14, 0.12, c1, { rot });
  for (const sd of [-1, 1]) b.box(x + ca * sd * (w / 2 - 0.15) + fx, y - h, z - sa * sd * (w / 2 - 0.15) + fz, 0.2, h, 0.12, c2, { rot });
}
// castle tower: stone cylinder, crenel ring, tall slate cone, lit windows. Returns top y
export function castleTower(b, x, y, z, r, h, { stone = 0x8a8478, stone2 = 0x7a746a, roof = 0x2a3448, win = null, roofH = 2.2, flag = null } = {}) {
  let yy = y, k = 0;
  while (yy < y + h) { b.cyl(x, yy, z, r, Math.min(3, y + h - yy), k++ % 2 ? stone : stone2, { seg: 14 }); yy += 3; }
  yy = y + h;
  b.cyl(x, yy, z, r + 0.5, 0.8, stone, { seg: 14 });
  if (win) for (let f = y + 4; f < y + h - 2; f += 5) for (let a = 0; a < 4; a++) { const an = a * Math.PI / 2 + f * 0.3; b.box(x + Math.cos(an) * (r + 0.02), f, z + Math.sin(an) * (r + 0.02), 0.9, 1.8, 0.4, 0, { rot: -an + Math.PI / 2, mat: win }); }
  b.cone(x, yy + 0.8, z, r + 0.8, r * roofH * 1.6, roof, { seg: 14 });
  const top = yy + 0.8 + r * roofH * 1.6;
  if (flag) { b.cyl(x, top - 0.3, z, 0.1, 3, 0x3a3a3a, { seg: 5 }); b.box(x + 0.9, top + 1.4, z, 1.8, 1.1, 0.08, flag); }
  return top;
}
