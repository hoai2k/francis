// Season 1 brick props for "Kyoto Goodwill Clash": extra faces (Inumaki, Junpei,
// Mai, Hanami), Season 1 characters and curses, Mechamaru's puppet, Kyoto temple
// pieces (sanmon gate, plaster walls), maple and bamboo, and Hanami's roots.
import { THREE, BrickBuilder, C, plastic, mat4 } from './kit.js';
import * as P from './jjk-props.js';

const NAVY = 0x1d2233, GOLD = 0xdcbc81;
const rbox = P.rbox, spike = P.spike;

// ---- face atlas (2 x 2 cells of 256 x 128) ------------------------------------------------
const FACES = ['inumaki', 'junpei', 'mai', 'hanami'];
const SKIN = { junpei: '#f0d8c4', hanami: '#e6e0cc' };
let faceMat = null;
function drawFace(g, name, W, H) {
  g.fillStyle = SKIN[name] || '#f3d2b3'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.scale(0.57, 1);
  const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const eyes = (iris, y = -12, ry = 12) => { for (const sd of [-1, 1]) { ell(sd * 30, y, 14, ry + 1, '#fff'); ell(sd * 30, y + 1, 11, ry, iris); ell(sd * 30, y + 2, 5, ry * 0.5, '#111'); ell(sd * 26, y - 4, 3, 3, '#fff'); line([[sd * 15, y - ry - 2], [sd * 45, y - ry - 4]], '#1b1b1b', 4); } };
  switch (name) {
    case 'inumaki':   // lavender eyes, mouth hidden by the zipped-up collar
      eyes('#7a6ab0', -16, 11); for (const sd of [-1, 1]) line([[sd * 16, -38], [sd * 44, -40]], '#d8d4e8', 6);
      g.restore(); g.fillStyle = '#1d2233'; g.fillRect(0, H / 2 + 6, W, H); g.fillStyle = '#2e3550'; g.fillRect(0, H / 2 + 6, W, 5); g.save(); break;
    case 'junpei':    // tired eyes with dark rings, long fringe over one eye
      eyes('#3a3040', -10, 9); for (const sd of [-1, 1]) line([[sd * 18, 4], [sd * 42, 4]], '#9a7a8a', 4);
      line([[-12, 28], [12, 26]], '#6a3a3a', 4);
      g.fillStyle = '#1a1a22'; g.beginPath(); g.moveTo(-90, -64); g.lineTo(30, -64); g.lineTo(-6, -2); g.lineTo(-60, 10); g.lineTo(-90, 10); g.fill(); break;
    case 'mai':       // Maki's twin: same eyes, no glasses, a smug smirk
      eyes('#4a3a2a', -12, 10); for (const sd of [-1, 1]) line([[sd * 16, -34], [sd * 44, -38]], '#111', 5);
      g.strokeStyle = '#8a3a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-14, 24); g.quadraticCurveTo(6, 30, 20, 18); g.stroke(); break;
    case 'hanami':    // pale mask, branches growing out of the eye sockets
      for (const sd of [-1, 1]) { ell(sd * 30, -12, 15, 13, '#2a1a10'); line([[sd * 30, -12], [sd * 34, -40], [sd * 46, -60]], '#5a3a22', 7); line([[sd * 33, -32], [sd * 18, -52]], '#5a3a22', 5); }
      for (const [x, y] of [[-60, 20], [60, 16], [-40, 40], [44, 42], [0, -50]]) line([[x - 8, y], [x + 8, y - 4]], '#3a5a2a', 4);
      line([[-20, 30], [20, 30]], '#8a7a60', 3); break;
  }
  g.restore();
}
function atlas() {
  if (faceMat) return faceMat;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  FACES.forEach((n, k) => { g.save(); g.translate((k % 2) * 256, Math.floor(k / 2) * 128); g.beginPath(); g.rect(0, 0, 256, 128); g.clip(); drawFace(g, n, 256, 128); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  faceMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.28 });
  return faceMat;
}
const faceGeos = new Map();
function faceGeo(name) {
  let g = faceGeos.get(name);
  if (g) return g;
  const k = FACES.indexOf(name), u0 = (k % 2) / 2, v0 = 1 - (Math.floor(k / 2) + 1) / 2;
  g = new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, u0 + 0.01, v0 + 0.02);
    else uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + (0.02 + uv.getY(i) * 0.96) * 0.5);
  }
  faceGeos.set(name, g);
  return g;
}
export function head(b, name, x, y, z, r, h, rot = Math.PI) { b.add(faceGeo(name), atlas(), x, y, z, rot, r, h, r); }
// humanoid with one of this file's faces (the shared head is shrunk away inside it)
function fig(o) {
  const ex = o.extra;
  return P.humanoid({ ...o, face: null, headR: 0.02, extra: (b, s) => { head(b, o.myFace, 0, 2.98 * s, 0, (o.myR ?? 0.43) * s, 0.74 * s); ex?.(b, s); } });
}

// ---- Season 1 characters --------------------------------------------------------------------
export function inumaki(s) {
  return fig({ s, myFace: 'inumaki', torso: NAVY, legs: NAVY, arms: NAVY, buttons: GOLD, collar: NAVY,
    hair: (b, s, top) => { const col = 0xe8e4f0; b.cyl(0, top - 0.24 * s, 0, 0.46 * s, 0.32 * s, col, { seg: 14 }); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; spike(b, Math.sin(a) * 0.3 * s, top - 0.05 * s, Math.cos(a) * 0.3 * s, 0.18 * s, 0.32 * s, Math.cos(a) * 0.7, -Math.sin(a) * 0.7, col); } },
    extra: (b, s) => { b.cyl(0, 2.76 * s, 0, 0.47 * s, 0.6 * s, NAVY, { seg: 14 }); b.box(0, 2.9 * s, 0.46 * s, 0.06 * s, 0.4 * s, 0.03 * s, GOLD); } });
}
export function junpei(s) {
  const col = 0x1a1a22;
  return fig({ s, myFace: 'junpei', skinHex: 0xf0d8c4, torso: 0x22242e, legs: 0x22242e, arms: 0x22242e, buttons: GOLD,
    hair: (b, s, top) => { b.cyl(0, top - 0.3 * s, 0, 0.48 * s, 0.4 * s, col, { seg: 14 }); b.box(0, top - 1.0 * s, -0.3 * s, 0.9 * s, 0.9 * s, 0.24 * s, col); for (const sd of [-1, 1]) b.box(sd * 0.38 * s, top - 0.9 * s, -0.05 * s, 0.16 * s, 0.7 * s, 0.6 * s, col); rbox(b, -0.15 * s, top - 0.4 * s, 0.36 * s, 0.5 * s, 0.6 * s, 0.12 * s, 0, 0, -0.3, col); } });
}
export function mai(s) {
  const col = 0x1f3a32;
  return fig({ s, myFace: 'mai', torso: 0x1b1b24, legs: 0xf3d2b3, hips: 0x1b1b24, shoes: C.black, arms: 0x1b1b24, buttons: 0x8a8a9a,
    hair: (b, s, top) => { b.cyl(0, top - 0.3 * s, 0, 0.48 * s, 0.4 * s, col, { seg: 14 }); b.box(0, top - 0.7 * s, -0.3 * s, 0.9 * s, 0.6 * s, 0.24 * s, col); rbox(b, 0.4 * s, top - 0.1 * s, -0.2 * s, 0.26 * s, 0.6 * s, 0.26 * s, 0, 0, -0.9, col); b.box(-0.05 * s, top - 0.22 * s, 0.34 * s, 0.7 * s, 0.18 * s, 0.14 * s, col); },
    extra: (b, s) => { b.add(new THREE.CylinderGeometry(0.62, 0.5, 1, 12).translate(0, 0.5, 0), plastic(0x1b1b24), 0, 0.85 * s, 0, 0, s, 0.55 * s, s * 0.8); },
    itemR: (a, s) => { rbox(a, 0, -1.55 * s, 0.25 * s, 0.14 * s, 0.22 * s, 0.7 * s, 0, 0, 0, 0x3a3a44); a.cyl(0, -1.55 * s, 0.25 * s, 0.14 * s, 0.2 * s, 0x5a5a64, { seg: 8 }); } });
}
// Yuji with Sukuna in control (the detention-centre awakening)
export function sukunaYuji(s) {
  return P.humanoid({ s, face: 'sukuna', torso: NAVY, legs: NAVY, arms: NAVY, hair: P.hair.sukuna, buttons: GOLD,
    extra: (b, s) => { b.box(0, 2.62 * s, -0.2 * s, 1.0 * s, 0.34 * s, 0.5 * s, C.red); b.box(0, 2.2 * s, -0.36 * s, 0.8 * s, 0.6 * s, 0.12 * s, C.red); for (const sd of [-1, 1]) b.box(sd * 0.42 * s, 2.1 * s, 0.3 * s, 0.08 * s, 0.5 * s, 0.03 * s, 0x1b1b1b); } });
}
// Hanami: tall pale curse of the forest with branches out of its eyes, a cloth over its left arm
export function hanami(s) {
  const bark = 0x5a3a22, pale = 0xd8d2c0;
  return fig({ s, myFace: 'hanami', myR: 0.5, skinHex: pale, torso: 0x3a4a2a, legs: bark, arms: pale, hands: pale, shoes: bark, wide: 1.2, collar: false,
    hair: (b, s, top) => {
      b.cyl(0, top - 0.06 * s, 0, 0.5 * s, 0.12 * s, pale, { seg: 14 });
      for (const sd of [-1, 1]) { rbox(b, sd * 0.25 * s, top + 0.35 * s, 0.36 * s, 0.12 * s, 1.2 * s, 0.12 * s, 0.35, 0, -sd * 0.35, bark); rbox(b, sd * 0.5 * s, top + 0.85 * s, 0.5 * s, 0.09 * s, 0.7 * s, 0.09 * s, 0.6, 0, -sd * 1.0, bark); b.sphere(sd * 0.6 * s, top + 1.1 * s, 0.6 * s, 0.22 * s, 0x6ab04a); b.sphere(sd * 0.25 * s, top + 1.0 * s, 0.6 * s, 0.18 * s, 0xf7b8c8); }
    },
    extra: (b, s) => {
      for (const [x, y] of [[-0.3, 2.3], [0.25, 1.9], [0, 1.6]]) b.box(x * s, y * s, 0.32 * s, 0.2 * s, 0.08 * s, 0.03 * s, 0x6ab04a);
      for (const sd of [-1, 1]) { b.sphere(sd * 0.62 * s, 2.7 * s, 0, 0.3 * s, 0x3a4a2a); b.sphere(sd * 0.62 * s, 2.95 * s, 0.1 * s, 0.13 * s, sd > 0 ? 0xf7b8c8 : 0xfff0a0); }
    },
    itemL: (a, s) => { a.add(new THREE.CylinderGeometry(0.3, 0.26, 1, 10).translate(0, 0.5, 0), plastic(C.white), 0, -1.6 * s, 0, 0, s, 1.4 * s, s); },
  });
}

// A released cursed spirit (v: 0 many-eyed blob, 1 fly-head, 2 big mouth). ~3 tall, faces +Z
export function spirit(v = 0) {
  const b = new BrickBuilder(1);
  const eye = (x, y, z, r) => { b.sphere(x, y, z, r, C.white); b.sphere(x, y, z + r * 0.6, r * 0.5, 0x111111); };
  if (v % 3 === 0) {
    b.sphere(0, 1.8, 0, 1.6, 0x6a4a8a, { sy: 0.9 }); b.sphere(0, 2.6, -0.4, 1.0, 0x7a5a9a);
    eye(-0.6, 2.2, 1.3, 0.35); eye(0.5, 2.5, 1.25, 0.45); eye(0.1, 1.5, 1.45, 0.28); eye(0.9, 1.6, 1.0, 0.25);
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; rbox(b, Math.cos(a) * 1.1, 0.5, Math.sin(a) * 1.1, 0.3, 1.2, 0.3, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5, 0x4a2a6a); }
  } else if (v % 3 === 1) {
    b.box(0, 0, 0, 1.2, 1.4, 0.8, 0x3a3a3a); b.box(0, 1.4, 0, 1.4, 1.2, 0.9, 0x5a5a5a);
    b.sphere(0, 3.0, 0.1, 1.1, 0x4a4a4a); for (const sd of [-1, 1]) { b.sphere(sd * 0.7, 3.2, 0.55, 0.62, 0xb01818); for (let k = 0; k < 2; k++) rbox(b, sd * 1.0, 2.6, -0.4 - k * 0.4, 0.06, 1.2, 0.7, 0.5, 0, sd * 1.1, 0xdde8f0, { matOpts: { trans: true, opacity: 0.55 } }); }
    rbox(b, 0, 2.5, 1.0, 0.18, 0.7, 0.18, 0.5, 0, 0, 0x2a2a2a);
  } else {
    b.sphere(0, 1.7, 0, 1.7, 0x5a7a4a, { sy: 0.85 }); b.box(0, 1.0, 1.25, 2.4, 1.0, 0.4, 0x2a0a0a);
    for (let k = -2; k <= 2; k++) { spike(b, k * 0.45, 1.95, 1.4, 0.16, 0.45, Math.PI, 0, C.white); spike(b, k * 0.45, 1.0, 1.4, 0.16, 0.4, 0, 0, C.white); }
    eye(-0.5, 2.7, 1.1, 0.3); eye(0.5, 2.8, 1.1, 0.3);
    for (const sd of [-1, 1]) spike(b, sd * 0.9, 2.8, 0, 0.3, 1.2, 0, -sd * 0.6, 0x3a5a2a);
  }
  return b.build({ name: 'cursed-spirit' });
}

// Mechamaru's battle puppet: armoured robot with a camera eye and a cannon arm. ~7.5 * s tall.
// Returns { root, armL, armR, eye (material), barrel (local tip on armR) }
export function mechamaru(s) {
  const root = new THREE.Group(), b = new BrickBuilder(1);
  const W = 0xd8d4c8, D = 0x4a4e58, T = 0x8a6a3a;
  for (const sd of [-1, 1]) { b.box(sd * 0.75 * s, 0, 0.15 * s, 1.1 * s, 0.6 * s, 1.6 * s, D); b.box(sd * 0.75 * s, 0.6 * s, 0, 0.9 * s, 2.2 * s, 0.9 * s, W); b.box(sd * 0.75 * s, 1.6 * s, 0.3 * s, 1.0 * s, 0.8 * s, 0.5 * s, D); }
  b.box(0, 2.8 * s, 0, 2.2 * s, 0.6 * s, 1.3 * s, D);
  b.add(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), plastic(W), 0, 3.4 * s, 0, 0, 2.8 * s, 2.4 * s, 1.7 * s);
  b.box(0, 3.9 * s, 0.86 * s, 1.6 * s, 1.2 * s, 0.1 * s, T);
  for (const sd of [-1, 1]) { b.box(sd * 1.65 * s, 5.2 * s, 0, 1.0 * s, 0.8 * s, 1.4 * s, D); }
  b.box(0, 5.8 * s, 0, 0.6 * s, 0.3 * s, 0.6 * s, D);
  b.box(0, 6.1 * s, 0, 1.3 * s, 1.1 * s, 1.2 * s, W);
  b.box(0, 7.2 * s, -0.1 * s, 1.4 * s, 0.25 * s, 1.0 * s, D);
  for (const sd of [-1, 1]) rbox(b, sd * 0.55 * s, 7.6 * s, -0.2 * s, 0.14 * s, 0.9 * s, 0.14 * s, -0.3, 0, -sd * 0.3, D);
  root.add(b.build({ name: 'mecha-body' }));
  const eyeMat = plastic(0xff3020, { emissive: 0xff2010, emissiveIntensity: 1.6 }).clone();
  const eyeM = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.3 * s, 14).rotateX(Math.PI / 2), eyeMat);
  eyeM.position.set(0, 6.65 * s, 0.65 * s); root.add(eyeM);
  const arms = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 1.75 * s, 5.4 * s, 0);
    const a = new BrickBuilder(1);
    a.box(0, -2.0 * s, 0, 0.8 * s, 2.0 * s, 0.8 * s, W); a.box(0, -2.4 * s, 0, 1.0 * s, 0.5 * s, 1.0 * s, D);
    if (sd < 0) { a.cyl(0, -4.6 * s, 0, 0.55 * s, 2.3 * s, D, { seg: 12 }); a.cyl(0, -4.9 * s, 0, 0.35 * s, 0.4 * s, 0x2a2a2a, { seg: 12 }); a.cyl(0, -4.85 * s, 0, 0.2 * s, 0.1 * s, 0xff8a40, { seg: 10, matOpts: { emissive: 0xff6020, emissiveIntensity: 2 } }); }
    else { a.box(0, -4.3 * s, 0, 0.9 * s, 1.9 * s, 0.9 * s, W); a.box(0, -4.9 * s, 0, 1.0 * s, 0.6 * s, 0.7 * s, D); }
    pv.add(a.build({ name: 'mecha-arm' }));
    root.add(pv); arms.push(pv);
  }
  return { root, armR: arms[0], armL: arms[1], eye: eyeMat, barrel: new THREE.Vector3(0, -5.0 * s, 0) };
}

// ---- Kyoto temple pieces -----------------------------------------------------------------------
// Two-storey sanmon gate straddling the road at (x, y, z), `span` wide, facing `rot`
export function sanmon(b, x, y, z, span, rot, { wood = 0x6a1a12, roof = 0x2a2a30, h = 11 } = {}) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const L = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca];
  const d = 9;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const k of [0, 1]) { const [px, pz] = L(sx * (span / 2 + 1 + k * 4), sz * d / 2); b.cyl(px, y, pz, 0.8, h, wood, { seg: 10 }); b.cyl(px, y, pz, 1.1, 0.8, C.ltgray, { seg: 10 }); }
  for (const sx of [-1, 1]) { const [px, pz] = L(sx * (span / 2 + 3), 0); b.box(px, y, pz, 4.6, h * 0.7, d - 1.6, 0xf2ead8, { rot }); }
  b.box(x, y + h, z, span + 12, 1.2, d + 1.4, wood, { rot });
  const roofAt = (yy, w, dd) => {
    for (const sd of [-1, 1]) { const [px, pz] = L(0, sd * dd * 0.28); b.boxM(mat4(px, yy + dd * 0.15, pz, sd * 0.45, rot, 0, w, 0.7, dd * 0.66), roof); }
    b.box(x, yy + dd * 0.3, z, w - 2, 1.2, 1.2, roof, { rot });
    for (const sx of [-1, 1]) for (const sd of [-1, 1]) { const [px, pz] = L(sx * w / 2, sd * dd * 0.5); b.boxM(mat4(px, yy + 0.4, pz, -sd * 0.4, rot, sx * 0.5, 0.8, 0.6, 2), roof); }
  };
  roofAt(y + h + 1.2, span + 18, d + 6);
  b.box(x, y + h + 3.4, z, span + 6, 5, d - 2, wood, { rot });
  for (let k = -3; k <= 3; k++) { const [px, pz] = L(k * (span + 4) / 7, (d - 2) / 2 + 0.05); b.box(px, y + h + 4, pz, 1.4, 3, 0.2, 0xf2ead8, { rot }); }
  roofAt(y + h + 8.4, span + 14, d + 4);
  const [gx, gz] = L(0, 0); b.cyl(gx, y + h + 11.8, gz, 0.5, 2, GOLD, { seg: 8 });
}
// White plaster wall with a tiled cap and five gold lines (Kyoto temple wall) between two points
export function plasterWall(b, x1, z1, x2, z2, h = 4) {
  const L = Math.hypot(x2 - x1, z2 - z1), rot = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  b.box(cx, 0, cz, L, 0.6, 1.6, C.dkstone, { rot });
  b.box(cx, 0.6, cz, L, h, 1.2, 0xf2ead8, { rot });
  for (let k = 0; k < 3; k++) b.box(cx, 1.8 + k * 0.8, cz, L + 0.02, 0.18, 1.24, 0xd8b040, { rot });
  b.boxM(mat4(cx, h + 0.9, cz, 0, rot, 0, L + 0.6, 0.5, 2.6), 0x2a2a30);
  b.box(cx, h + 1.0, cz, L + 0.6, 0.6, 0.6, 0x2a2a30, { rot });
}
// Japanese maple (momiji) in autumn colours
const MAPLE = [0xd8401a, 0xe86a20, 0xf0a030, 0xb02a1a];
export function maple(b, x, z, s = 1, rnd = Math.random) {
  b.cyl(x, 0, z, 0.4 * s, 3.2 * s, 0x4a2a1a, { seg: 8 });
  rbox(b, x + 0.6 * s, 2.8 * s, z, 0.25 * s, 1.8 * s, 0.25 * s, 0, 0, -0.7, 0x4a2a1a);
  for (let k = 0; k < 5; k++) b.sphere(x + (rnd() - 0.5) * 3.4 * s, (4.0 + rnd() * 1.6) * s, z + (rnd() - 0.5) * 3.4 * s, (1.3 + rnd() * 0.7) * s, MAPLE[(k + Math.floor(rnd() * 4)) % 4], { sy: 0.75 });
}
// bamboo clump
export function bamboo(b, x, z, s = 1, rnd = Math.random) {
  const n = 4 + Math.floor(rnd() * 4);
  for (let k = 0; k < n; k++) {
    const a = rnd() * 6.28, r = rnd() * 1.6 * s, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, h = (9 + rnd() * 6) * s;
    const col = rnd() < 0.5 ? 0x5a9a3a : 0x7aaa4a;
    b.cyl(px, 0, pz, 0.28 * s, h, col, { seg: 6 });
    for (let y = 2; y < h; y += 2.2 * s) b.cyl(px, y, pz, 0.33 * s, 0.18, 0x3a6a2a, { seg: 6 });
    for (let j = 0; j < 3; j++) { const la = rnd() * 6.28; rbox(b, px + Math.cos(la) * 0.9 * s, h - j * 1.4 * s, pz + Math.sin(la) * 0.9 * s, 0.2 * s, 0.1 * s, 2.0 * s, 0.3, la, 0, 0x4a8a2a); }
  }
}
// tall cedar (sugi)
export function cedar(b, x, z, s = 1, col = 0x1f4a2a) {
  b.cyl(x, 0, z, 0.55 * s, 6 * s, 0x5a3a26, { seg: 8 });
  for (let k = 0; k < 4; k++) b.cone(x, (4 + k * 3) * s, z, (2.8 - k * 0.55) * s, 4.4 * s, k % 2 ? col : 0x2a5a32, { seg: 8 });
}

// Hanami's roots: a ring of bark spikes (local origin at the road, ~6 tall at scale 1)
export function rootCluster(r = 3.4) {
  const b = new BrickBuilder(1), bark = [0x5a3a22, 0x6a4a2a, 0x4a2e1a];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * 6.28 + 0.4, d = k ? r * 0.55 : 0, tilt = k ? 0.35 : 0;
    spike(b, Math.cos(a) * d, -0.5, Math.sin(a) * d, k ? 0.7 : 1.0, k ? 4.6 : 6.4, Math.sin(a) * tilt, -Math.cos(a) * tilt, bark[k % 3]);
    if (k % 2) b.sphere(Math.cos(a) * d * 1.3, 3.2, Math.sin(a) * d * 1.3, 0.4, k % 4 === 1 ? 0xf7b8c8 : 0x6ab04a);
  }
  for (let k = 0; k < 5; k++) { const a = k * 1.3; rbox(b, Math.cos(a) * r * 0.8, 0.2, Math.sin(a) * r * 0.8, 0.5, 0.5, 2.6, 0, -a + Math.PI / 2, 0, bark[k % 3]); }
  return b.build({ name: 'hanami-roots' });
}
