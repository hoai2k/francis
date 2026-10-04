// Brick-built Pokémon and Kanto props for the "Kanto Brick Route" map.
// Every creature is drawn into a Local (origin at its feet, +Z is its front) so the same
// build can be stamped into the merged scenery builder or built as its own animated group.
import { THREE, BrickBuilder, C, plastic, mat4 } from './kit.js';

// ---- local builder ----------------------------------------------------------------------
const Yax = new THREE.Vector3(0, 1, 0), E = new THREE.Euler(), Q = new THREE.Quaternion(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(), V = new THREE.Vector3();
const M1 = new THREE.Matrix4(), M2 = new THREE.Matrix4();
const geoC = new Map();
const G = (k, f) => { let g = geoC.get(k); if (!g) { g = f(); geoC.set(k, g); } return g; };
const boxGeo = () => G('box', () => new THREE.BoxGeometry(1, 1, 1));
const cylGeo = (s = 12) => G('cyl' + s, () => new THREE.CylinderGeometry(1, 1, 1, s));
const coneGeo = (s = 10) => G('cone' + s, () => new THREE.ConeGeometry(1, 1, s));
const sphGeo = () => G('sph', () => new THREE.SphereGeometry(1, 14, 10));
const hemiGeo = () => G('hemi', () => new THREE.SphereGeometry(1, 18, 7, 0, Math.PI * 2, 0, Math.PI / 2));
function compose(x, y, z, rx, ry, rz, sx, sy, sz) { E.set(rx, ry, rz, 'YXZ'); Q.setFromEuler(E); return M1.compose(P3.set(x, y, z), Q, S3.set(sx, sy, sz)); }

export class Local {
  constructor(b, x = 0, y = 0, z = 0, yaw = 0, s = 1) {
    this.b = b;
    this.m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Yax, yaw), new THREE.Vector3(s, s, s));
  }
  put(g, col, x, y, z, rx, ry, rz, sx, sy, sz, o) { M2.multiplyMatrices(this.m, compose(x, y, z, rx, ry, rz, sx, sy, sz)); this.b.addMatrix(g, o?.mat || plastic(col, o?.matOpts), M2); }
  // centred box / box standing on y
  box(x, y, z, sx, sy, sz, col, o = {}) { this.put(boxGeo(), col, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, sx, sy, sz, o); }
  boxB(x, y, z, sx, sy, sz, col, o = {}) { this.box(x, y + sy / 2, z, sx, sy, sz, col, o); return y + sy; }
  cyl(x, y, z, r, h, col, o = {}) { this.put(cylGeo(o.seg), col, x, o.c ? y : y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0, r, h, o.r2 || r, o); return y + h; }
  cone(x, y, z, r, h, col, o = {}) { this.put(coneGeo(o.seg), col, x, y + h / 2, z, 0, o.ry || 0, 0, r, h, r, o); return y + h; }
  sphere(x, y, z, r, col, o = {}) { this.put(sphGeo(), col, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1), o); }
  hemi(x, y, z, r, col, o = {}) { this.put(hemiGeo(), col, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, r, r * (o.sy || 1), r, o); }
  // cone standing on a base point, tilted by rx / rz
  spike(x, y, z, r, h, rx, rz, col, o = {}) { E.set(rx, 0, rz, 'YXZ'); V.set(0, 1, 0).applyEuler(E); this.put(coneGeo(o.seg || 8), col, x + V.x * h / 2, y + V.y * h / 2, z + V.z * h / 2, rx, 0, rz, r, h, r, o); }
  // flat box between two points: w across (local x), t thick
  seg(ax, ay, az, bx, by, bz, w, t, col, o = {}) { const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz); this.put(boxGeo(), col, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, -Math.asin(dy / L), Math.atan2(dx, dz), 0, w, t ?? w, L, o); }
  // round limb between two points
  limb(ax, ay, az, bx, by, bz, r, col, o = {}) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
    M1.compose(P3.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), Q.setFromUnitVectors(Yax, V.set(dx / L, dy / L, dz / L)), S3.set(r, L, o.r2 || r));
    M2.multiplyMatrices(this.m, M1); this.b.addMatrix(cylGeo(o.seg || 8), o.mat || plastic(col, o.matOpts), M2);
  }
}
// build a creature as its own group (for animation) or stamp it into a builder
export function fig(fn, s = 1, name = 'mon', ...args) { const b = new BrickBuilder(1); fn(new Local(b, 0, 0, 0, 0, s), ...args); return b.build({ name }); }
export function stamp(b, fn, x, y, z, yaw, s, ...args) { fn(new Local(b, x, y, z, yaw, s), ...args); }

// ---- glow ------------------------------------------------------------------------------
let glowTexture = null;
export function glowTex() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (glowTexture = new THREE.CanvasTexture(c));
}
export function glow(color, size, opacity = 0.9) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(size); return s;
}
export const neon = (color, k = 2) => plastic(color, { emissive: color, emissiveIntensity: k });

// ---- palette ---------------------------------------------------------------------------------
export const K = {
  pika: 0xf6d23a, cheek: 0xe0342a, brown: 0x7a4a24, cream: 0xf2e4c0, black: 0x1b1b1b, white: 0xf8f8f8,
  snor: 0x2f6377, psy: 0xf2c84a, bill: 0xf4e4b4, slow: 0xf3a5bd, dig: 0x8a5a3a, nose: 0xe86a8a,
  rock: 0x9a958a, rock2: 0x7e7a70, volt: 0xd8282a, zubat: 0x4a7ad8, wing: 0x9a6ad0, clef: 0xf6b4c4,
  cater: 0x7ac84a, weed: 0xd8a040, pidg: 0xb07a40, ratt: 0x9a6ab8, lap: 0x4a9ad8, shell: 0x8a86a0,
  gyar: 0x2a62c8, gyBelly: 0xf0e0a0, karp: 0xe8582a, bulb: 0x7ad0b0, bulb2: 0x3aa04a, char: 0xf5893a,
  squirt: 0x86c8e8, sqShell: 0x9a5a2a, jiggly: 0xf8b8c8, eevee: 0xb07a3a, mew: 0xf4b8d0, onix: 0x8e8c88,
  ball: 0xd8202a,
};
const BLK = K.black, WHT = K.white;
function eyes(L, y, z, dx, r, col = BLK, o = {}) {
  for (const sd of [-1, 1]) {
    if (o.white) L.sphere(sd * dx, y, z - r * 0.1, r * o.white, WHT, { sz: 0.5, sy: o.sy ?? 1.2 });
    L.sphere(sd * dx, y, z, r, col, { sx: o.sx ?? 1, sy: o.sy ?? 1.25, sz: 0.55 });
    L.sphere(sd * dx - r * 0.3, y + r * 0.4, z + r * 0.42, r * 0.34, WHT);
  }
}

// ---- the starters & friends --------------------------------------------------------------------
export function pikachu(L) {
  const Y = K.pika;
  L.sphere(0, 1.05, 0, 0.95, Y, { sy: 1.15 });
  L.sphere(0, 2.6, 0.1, 1.0, Y, { sx: 1.05, sy: 0.9 });
  for (const sd of [-1, 1]) {
    const rz = -sd * 0.42;
    L.spike(sd * 0.55, 3.0, 0, 0.3, 1.5, 0, rz, Y);
    L.spike(sd * (0.55 + Math.sin(0.42) * 1.0), 3.0 + Math.cos(0.42) * 1.0, 0, 0.17, 0.55, 0, rz, BLK);
    L.sphere(sd * 0.66, 2.32, 0.74, 0.24, K.cheek, { sz: 0.5 });
    L.sphere(sd * 0.6, 1.55, 0.72, 0.26, Y);
    L.sphere(sd * 0.45, 0.15, 0.35, 0.32, Y, { sy: 0.55, sz: 1.3 });
  }
  eyes(L, 2.72, 0.92, 0.4, 0.16);
  L.sphere(0, 2.5, 1.04, 0.05, BLK);
  L.box(0, 2.3, 1.0, 0.28, 0.06, 0.06, 0x8a2020);
  L.box(0, 1.6, -0.9, 0.9, 0.15, 0.2, K.brown); L.box(0, 1.25, -0.96, 0.8, 0.15, 0.2, K.brown);
  // lightning-bolt tail
  L.seg(0, 0.6, -0.85, 0, 1.4, -1.55, 0.18, 0.4, K.brown);
  L.seg(0, 1.4, -1.55, 0, 1.6, -1.05, 0.18, 0.45, Y);
  L.seg(0, 1.6, -1.05, 0, 2.9, -1.9, 0.18, 0.75, Y);
}
export function bulbasaur(L) {
  L.sphere(0, 1.1, 0, 1.1, K.bulb, { sy: 0.75, sz: 1.2 });
  for (const [x, z] of [[0.65, 0.6], [-0.65, 0.6], [0.65, -0.6], [-0.65, -0.6]]) { L.cyl(x, 0, z, 0.32, 0.9, K.bulb); L.sphere(x, 0.08, z + 0.3, 0.1, WHT); }
  L.sphere(0, 1.6, 1.25, 0.9, K.bulb, { sx: 1.15, sy: 0.8, sz: 0.9 });
  for (const sd of [-1, 1]) { L.spike(sd * 0.6, 2.05, 1.1, 0.2, 0.45, 0, -sd * 0.5, K.bulb); L.sphere(sd * 0.7, 1.95, 1.3, 0.14, 0x3a8a7a); L.sphere(sd * 0.8, 1.2, -0.3, 0.2, 0x3a8a7a); }
  eyes(L, 1.75, 1.95, 0.45, 0.18, 0xc8283a, { white: 1.3 });
  L.box(0, 1.35, 2.0, 0.7, 0.06, 0.06, 0x8a2020);
  L.sphere(0, 2.0, -0.2, 1.0, K.bulb2, { sy: 0.95 });
  for (let n = 0; n < 5; n++) { const a = n / 5 * Math.PI * 2; L.sphere(Math.cos(a) * 0.55, 2.2, -0.2 + Math.sin(a) * 0.55, 0.5, 0x2a8a3a, { sy: 1.4 }); }
  L.cone(0, 2.9, -0.2, 0.3, 0.5, K.bulb2);
}
export function charmander(L, flame = true) {
  const O = K.char;
  L.sphere(0, 1.2, 0, 0.85, O, { sy: 1.1 }); L.sphere(0, 1.1, 0.35, 0.65, 0xf6e09a, { sz: 0.7 });
  L.sphere(0, 2.55, 0.15, 0.85, O, { sx: 0.95 }); L.sphere(0, 2.4, 0.7, 0.5, O, { sy: 0.7 });
  eyes(L, 2.72, 0.84, 0.36, 0.16, 0x1a2a4a, { white: 1.25 });
  L.box(0, 2.25, 1.05, 0.4, 0.06, 0.06, 0x8a2020);
  for (const sd of [-1, 1]) { L.cyl(sd * 0.45, 0, 0, 0.3, 0.6, O); L.limb(sd * 0.7, 1.6, 0.2, sd * 1.0, 1.2, 0.7, 0.18, O); }
  L.limb(0, 0.8, -0.6, 0, 1.45, -1.75, 0.3, O, { r2: 0.2 });
  if (flame) { L.spike(0, 1.55, -1.85, 0.35, 0.9, 0, 0, 0, { mat: neon(0xff7a1a, 2.4) }); L.spike(0, 1.6, -1.85, 0.2, 0.55, 0, 0, 0, { mat: neon(0xffe040, 2.6) }); }
}
export function squirtle(L) {
  const B = K.squirt;
  L.sphere(0, 1.15, 0, 0.85, B, { sy: 1.05 }); L.sphere(0, 1.1, 0.32, 0.7, 0xf0d890, { sz: 0.6 });
  L.sphere(0, 1.2, -0.28, 0.95, K.sqShell, { sz: 0.75 }); L.cyl(0, 0.95, -0.1, 0.98, 0.22, WHT, { c: true });
  L.sphere(0, 2.45, 0.1, 0.85, B, { sx: 1.05, sy: 0.95 });
  eyes(L, 2.6, 0.84, 0.38, 0.18, 0x7a2a2a, { white: 1.25 });
  L.box(0, 2.18, 0.88, 0.45, 0.06, 0.06, 0x8a2020);
  for (const sd of [-1, 1]) { L.cyl(sd * 0.45, 0, 0.1, 0.3, 0.55, B); L.limb(sd * 0.7, 1.5, 0.2, sd * 1.05, 1.15, 0.6, 0.18, B); }
  L.sphere(0, 0.7, -1.1, 0.45, B); L.sphere(0, 1.05, -1.35, 0.3, B);
}
export function psyduck(L) {
  const Y = K.psy;
  L.sphere(0, 1.1, 0, 0.95, Y, { sy: 1.05 });
  L.sphere(0, 2.5, 0, 1.0, Y);
  L.sphere(0, 2.25, 0.95, 0.5, K.bill, { sx: 1.15, sy: 0.42, sz: 0.75 });
  for (const sd of [-1, 1]) {
    L.sphere(sd * 0.38, 2.75, 0.82, 0.27, WHT, { sz: 0.5 }); L.sphere(sd * 0.38, 2.75, 0.94, 0.06, BLK);
    L.limb(sd * 0.85, 1.6, 0.2, sd * 0.95, 2.55, 0.55, 0.22, Y); L.sphere(sd * 0.9, 2.6, 0.6, 0.24, Y);
    L.sphere(sd * 0.45, 0.12, 0.4, 0.38, K.bill, { sy: 0.4, sz: 1.3 });
  }
  for (let n = -1; n <= 1; n++) L.limb(n * 0.15, 3.35, 0, n * 0.35, 3.95, 0.1, 0.05, BLK);
}
export function slowpoke(L) {
  const P = K.slow;
  L.sphere(0, 1.0, 0, 1.0, P, { sx: 0.95, sy: 0.8, sz: 1.3 });
  for (const [x, z] of [[0.55, 0.7], [-0.55, 0.7], [0.55, -0.7], [-0.55, -0.7]]) L.cyl(x, 0, z, 0.28, 0.6, P);
  L.sphere(0, 1.75, 1.3, 0.9, P);
  L.sphere(0, 1.45, 2.0, 0.5, K.cream, { sx: 1.25, sy: 0.7 });
  for (const sd of [-1, 1]) { L.sphere(sd * 0.55, 2.5, 1.15, 0.28, P, { sy: 0.7 }); L.sphere(sd * 0.4, 1.95, 2.0, 0.2, WHT, { sz: 0.5 }); L.sphere(sd * 0.4, 1.95, 2.08, 0.06, BLK); }
  L.limb(0, 1.0, -1.2, 0, 0.45, -2.6, 0.22, P); L.sphere(0, 0.4, -2.7, 0.25, WHT);
}
export function snorlax(L) {
  const T = K.snor, Cr = K.cream;
  for (const sd of [-1, 1]) { L.sphere(sd * 0.95, 0.45, 0.6, 0.75, Cr, { sy: 0.6 }); L.sphere(sd * 0.95, 0.5, 1.2, 0.36, 0x8a6a4a, { sz: 0.3 }); }
  L.sphere(0, 2.4, 0, 2.3, T, { sz: 0.9 });
  L.sphere(0, 2.2, 0.55, 1.9, Cr, { sx: 0.9, sy: 0.95, sz: 0.75 });
  L.sphere(0, 4.9, 0.1, 1.25, T, { sx: 1.15, sy: 0.95 });
  L.sphere(0, 4.7, 0.6, 0.95, Cr, { sx: 1.05, sy: 0.8, sz: 0.7 });
  for (const sd of [-1, 1]) {
    L.spike(sd * 0.85, 5.6, 0, 0.35, 0.7, 0, -sd * 0.35, T);
    L.box(sd * 0.42, 4.95, 1.27, 0.45, 0.08, 0.08, BLK);
    L.spike(sd * 0.22, 4.36, 1.24, 0.07, 0.18, 0, 0, WHT);
    L.sphere(sd * 2.1, 2.9, 0.3, 0.65, T, { sx: 0.7, sy: 1.2 });
    for (let m = -1; m <= 1; m++) L.spike(sd * 2.2 + m * 0.18, 2.0, 0.6, 0.08, 0.3, Math.PI, 0, WHT);
  }
  L.box(0, 4.45, 1.28, 0.6, 0.06, 0.06, BLK);
}
export function diglett(L) {
  L.cyl(0, 0, 0, 0.6, 1.0, K.dig, { seg: 14 }); L.sphere(0, 1.0, 0, 0.6, K.dig);
  L.sphere(0, 0.9, 0.55, 0.22, K.nose, { sx: 1.35, sy: 0.8 });
  for (const sd of [-1, 1]) L.sphere(sd * 0.2, 1.22, 0.52, 0.07, BLK, { sy: 1.8 });
}
export function geodude(L) {
  const R = K.rock;
  L.sphere(0, 1, 0, 1, R);
  for (const [x, y, z, r] of [[0.6, 1.6, -0.3, 0.4], [-0.5, 0.5, -0.6, 0.45], [0.2, 0.3, 0.7, 0.35], [-0.7, 1.5, 0.3, 0.35]]) L.sphere(x, y, z, r, K.rock2);
  for (const sd of [-1, 1]) {
    L.sphere(sd * 0.35, 1.2, 0.88, 0.13, BLK, { sy: 0.8 });
    L.seg(sd * 0.55, 1.5, 0.9, sd * 0.12, 1.35, 0.98, 0.12, 0.12, 0x4a4840);
    L.limb(sd * 0.85, 1.05, 0, sd * 1.75, 1.5, 0.3, 0.26, R); L.sphere(sd * 1.9, 1.6, 0.35, 0.42, R);
  }
  L.box(0, 0.75, 0.97, 0.5, 0.07, 0.07, 0x3a3830);
}
// Voltorb: the top is its own material so each one can flash on its own
export function voltorb(s = 1) {
  const g = new THREE.Group(), b = new BrickBuilder(1), L = new Local(b, 0, 0, 0, 0, s);
  const top = plastic(K.volt).clone(); top.userData = {};
  L.hemi(0, 1, 0, 1, 0, { mat: top });
  L.hemi(0, 1, 0, 1, WHT, { rx: Math.PI });
  L.cyl(0, 1, 0, 1.01, 0.08, 0x3a1a1a, { c: true, seg: 18 });
  for (const sd of [-1, 1]) {
    L.sphere(sd * 0.35, 1.32, 0.86, 0.2, WHT, { sz: 0.4 }); L.sphere(sd * 0.32, 1.3, 0.94, 0.09, BLK);
    L.seg(sd * 0.58, 1.6, 0.8, sd * 0.12, 1.45, 0.98, 0.1, 0.1, BLK);
  }
  g.add(b.build({ name: 'voltorb' }));
  g.userData.top = top;
  return g;
}
export function zubat(s = 1) {
  const root = new THREE.Group(), b = new BrickBuilder(1), L = new Local(b, 0, 0, 0, 0, s);
  L.sphere(0, 0, 0, 0.55, K.zubat);
  for (const sd of [-1, 1]) { L.spike(sd * 0.25, 0.35, 0, 0.18, 0.75, 0, -sd * 0.2, K.zubat); L.limb(sd * 0.2, -0.4, -0.1, sd * 0.25, -1.3, -0.5, 0.07, K.zubat); L.spike(sd * 0.14, -0.1, 0.42, 0.05, 0.16, Math.PI, 0, WHT); }
  L.sphere(0, -0.05, 0.42, 0.28, 0x5a1030, { sz: 0.35 });
  root.add(b.build({ name: 'zubat' }));
  const wings = [-1, 1].map((sd) => {
    const w = new THREE.Group(), wb = new BrickBuilder(1), WL = new Local(wb, 0, 0, 0, 0, s);
    WL.box(sd * 0.9, 0.1, 0, 1.6, 0.06, 1.0, K.wing); WL.box(sd * 1.5, 0.15, -0.3, 0.8, 0.05, 0.9, K.zubat);
    w.add(wb.build({ name: 'zubat-wing' })); w.position.set(sd * 0.4 * s, 0, 0); root.add(w); return w;
  });
  root.userData.wings = wings;
  return root;
}
export function clefairy(L) {
  const P = K.clef;
  L.sphere(0, 1.0, 0, 0.9, P, { sy: 1.05 });
  for (const sd of [-1, 1]) {
    L.spike(sd * 0.42, 1.75, 0, 0.25, 0.8, 0, -sd * 0.3, P);
    L.spike(sd * (0.42 + Math.sin(0.3) * 0.6), 1.75 + Math.cos(0.3) * 0.6, 0, 0.12, 0.3, 0, -sd * 0.3, K.brown);
    L.sphere(sd * 0.3, 1.25, 0.8, 0.12, BLK, { sy: 1.6, sz: 0.5 });
    L.sphere(sd * 0.55, 1.0, 0.68, 0.14, 0xf08aa0, { sz: 0.4 });
    L.sphere(sd * 0.85, 1.1, 0.25, 0.22, P);
    L.sphere(sd * 0.35, 0.1, 0.3, 0.25, P, { sy: 0.6, sz: 1.3 });
    L.box(sd * 0.6, 1.3, -0.75, 0.6, 0.5, 0.06, 0xf08aa0, { rz: sd * 0.4 });
  }
  L.sphere(0, 1.95, 0.35, 0.18, P); L.sphere(0, 2.05, 0.15, 0.12, P);
  L.sphere(0, 0.8, -0.95, 0.25, P);
}
export function jigglypuff(L) {
  const P = K.jiggly;
  L.sphere(0, 1.05, 0, 1.0, P);
  for (const sd of [-1, 1]) {
    L.sphere(sd * 0.38, 1.2, 0.82, 0.32, WHT, { sz: 0.45 }); L.sphere(sd * 0.38, 1.18, 0.92, 0.23, 0x2a7ad8, { sz: 0.4 }); L.sphere(sd * 0.32, 1.28, 0.99, 0.07, WHT);
    L.spike(sd * 0.55, 1.75, 0, 0.3, 0.55, 0, -sd * 0.6, P);
    L.sphere(sd * 0.95, 1.0, 0.2, 0.2, P); L.sphere(sd * 0.4, 0.1, 0.3, 0.25, P, { sy: 0.6, sz: 1.3 });
  }
  L.sphere(0, 2.0, 0.55, 0.22, P); L.sphere(0, 1.85, 0.75, 0.14, P);
  L.box(0, 0.75, 0.97, 0.22, 0.05, 0.05, 0x8a2020);
}
export function eevee(L) {
  const B = K.eevee, Cr = K.cream;
  L.sphere(0, 0.9, 0, 0.7, B, { sz: 1.2 });
  for (const [x, z] of [[0.35, 0.5], [-0.35, 0.5], [0.35, -0.5], [-0.35, -0.5]]) L.cyl(x, 0, z, 0.15, 0.7, B);
  for (let n = 0; n < 5; n++) { const a = n / 5 * Math.PI * 2; L.sphere(Math.cos(a) * 0.45, 1.4, 0.7 + Math.sin(a) * 0.3, 0.35, Cr); }
  L.sphere(0, 1.9, 0.8, 0.6, B);
  for (const sd of [-1, 1]) L.spike(sd * 0.35, 2.3, 0.7, 0.28, 1.2, 0, -sd * 0.35, B);
  eyes(L, 1.95, 1.35, 0.25, 0.13, 0x3a1a0a);
  L.limb(0, 1.0, -0.7, 0, 1.8, -1.3, 0.35, B, { r2: 0.45 }); L.sphere(0, 1.95, -1.4, 0.38, Cr);
}
export function caterpie(L) {
  const Gc = K.cater;
  for (let k = 0; k < 4; k++) { L.sphere(0, 0.5, -k * 0.7, 0.5 - k * 0.04, Gc); L.sphere(0, 0.32, -k * 0.7 + 0.15, 0.3, 0xf2e07a); }
  L.sphere(0, 1.0, 0.6, 0.72, Gc);
  for (const sd of [-1, 1]) { L.sphere(sd * 0.5, 1.15, 0.85, 0.24, 0xf2e07a, { sz: 0.5 }); L.sphere(sd * 0.52, 1.15, 0.95, 0.13, BLK); }
  L.limb(0, 1.6, 0.5, 0, 2.1, 0.4, 0.09, 0xe03a2a);
  for (const sd of [-1, 1]) L.spike(0, 2.1, 0.4, 0.07, 0.35, 0.3, sd * 0.7, 0xe03a2a);
}
export function weedle(L) {
  const Wd = K.weed;
  for (let k = 0; k < 4; k++) L.sphere(0, 0.45, -k * 0.65, 0.45 - k * 0.03, Wd);
  L.spike(0, 0.5, -2.2, 0.15, 0.6, -Math.PI / 2, 0, 0xe0e0e0);
  L.sphere(0, 0.85, 0.55, 0.58, Wd); L.sphere(0, 0.8, 1.1, 0.24, 0xf08aa0, { sx: 1.3, sy: 0.9 });
  for (const sd of [-1, 1]) L.sphere(sd * 0.32, 1.0, 1.0, 0.08, BLK);
  L.spike(0, 1.3, 0.5, 0.14, 0.7, 0, 0, 0xe0e0e0);
}
export function rattata(L) {
  const P = K.ratt;
  L.sphere(0, 0.8, 0, 0.8, P, { sx: 0.8, sy: 0.7, sz: 1.1 }); L.sphere(0, 0.7, 0.35, 0.55, K.cream, { sz: 0.7 });
  L.sphere(0, 1.25, 0.9, 0.6, P);
  for (const sd of [-1, 1]) { L.spike(sd * 0.4, 1.6, 0.75, 0.3, 0.55, 0, -sd * 0.4, P); L.sphere(sd * 0.25, 1.38, 1.38, 0.15, WHT, { sz: 0.5 }); L.sphere(sd * 0.25, 1.38, 1.44, 0.09, 0xc02a3a); L.cyl(sd * 0.4, 0, 0.5, 0.12, 0.4, P); L.cyl(sd * 0.4, 0, -0.5, 0.12, 0.4, P); L.limb(sd * 0.25, 1.1, 1.45, sd * 0.9, 1.15, 1.55, 0.02, BLK); }
  L.box(0, 0.95, 1.42, 0.22, 0.25, 0.06, WHT);
  L.limb(0, 0.8, -0.85, 0, 1.6, -1.4, 0.07, P); L.limb(0, 1.6, -1.4, 0, 2.0, -0.9, 0.07, P);
}
export function eggRock(L, r, cols) { L.sphere(0, r * 0.5, 0, r, cols[0], { sy: 0.7 }); }

// flying Pidgey with flapping wings
export function pidgey(s = 1) {
  const root = new THREE.Group(), b = new BrickBuilder(1), L = new Local(b, 0, 0, 0, 0, s), Br = K.pidg;
  L.sphere(0, 0, 0, 0.65, Br, { sz: 1.2 }); L.sphere(0, -0.1, 0.4, 0.45, K.cream, { sz: 0.7 });
  L.sphere(0, 0.45, 0.65, 0.48, Br); L.sphere(0, 0.35, 0.95, 0.3, K.cream, { sz: 0.7 });
  L.spike(0, 0.38, 1.1, 0.1, 0.3, Math.PI / 2, 0, 0x6a5a5a);
  for (const sd of [-1, 1]) { L.sphere(sd * 0.22, 0.52, 1.05, 0.07, BLK); L.seg(sd * 0.1, 0.55, 1.07, sd * 0.4, 0.6, 0.85, 0.05, 0.05, BLK); }
  L.seg(0, 0.85, 0.6, 0, 1.2, 0.2, 0.08, 0.25, Br); L.seg(0, 0.85, 0.45, 0, 1.0, 0.0, 0.08, 0.2, 0xd8604a);
  L.seg(0, 0, -0.7, 0, 0.2, -1.6, 0.6, 0.06, Br);
  root.add(b.build({ name: 'pidgey' }));
  root.userData.wings = [-1, 1].map((sd) => { const w = new THREE.Group(), wb = new BrickBuilder(1); new Local(wb, 0, 0, 0, 0, s).box(sd * 0.9, 0, -0.1, 1.6, 0.08, 0.8, Br); w.add(wb.build({ name: 'pidgey-wing' })); w.position.set(sd * 0.4 * s, 0.15 * s, 0); root.add(w); return w; });
  return root;
}
// flying Charizard with flapping wings
export function charizard(s = 1) {
  const root = new THREE.Group(), b = new BrickBuilder(1), L = new Local(b, 0, 0, 0, 0, s), O = K.char;
  L.sphere(0, 0, 0, 1.1, O, { sy: 1.3 }); L.sphere(0, -0.1, 0.45, 0.85, 0xf6e09a, { sy: 1.2, sz: 0.6 });
  L.limb(0, 0.9, 0.2, 0, 2.0, 0.7, 0.45, O);
  L.sphere(0, 2.2, 0.8, 0.65, O, { sz: 1.3 });
  for (const sd of [-1, 1]) { L.spike(sd * 0.35, 2.55, 0.5, 0.12, 0.6, -0.6, -sd * 0.2, O); L.sphere(sd * 0.3, 2.4, 1.4, 0.1, 0x1a3a6a); L.limb(sd * 0.5, -1.0, 0, sd * 0.55, -1.9, 0.3, 0.3, O); L.limb(sd * 0.8, 0.5, 0.4, sd * 1.0, -0.3, 0.9, 0.18, O); }
  L.limb(0, -0.8, -0.6, 0, -1.4, -2.4, 0.38, O, { r2: 0.18 });
  L.spike(0, -1.5, -2.5, 0.35, 0.9, 0, 0, 0, { mat: neon(0xff7a1a, 2.4) });
  root.add(b.build({ name: 'charizard' }));
  root.userData.wings = [-1, 1].map((sd) => {
    const w = new THREE.Group(), wb = new BrickBuilder(1), WL = new Local(wb, 0, 0, 0, 0, s);
    WL.seg(0, 0, 0, sd * 2.8, 1.2, -0.3, 0.25, 0.25, O); WL.seg(sd * 2.8, 1.2, -0.3, sd * 3.6, -0.6, -0.8, 0.2, 0.2, O);
    WL.box(sd * 1.7, 0.1, -0.6, 2.8, 0.1, 1.3, 0x2a7a8a, { rz: sd * 0.2 }); WL.box(sd * 2.9, -0.1, -0.7, 1.4, 0.1, 1.0, 0x2a7a8a, { rz: -sd * 0.3 });
    w.add(wb.build({ name: 'zard-wing' })); w.position.set(sd * 0.6 * s, 0.6 * s, -0.3 * s); root.add(w); return w;
  });
  return root;
}
export function lapras(L) {
  const B = K.lap;
  L.sphere(0, 0.4, 0, 2.2, B, { sx: 0.9, sy: 0.5, sz: 1.3 });
  L.sphere(0, 0.5, 1.2, 1.3, K.cream, { sy: 0.45, sz: 0.8 });
  L.sphere(0, 1.0, -0.3, 1.8, K.shell, { sy: 0.65, sz: 1.1 });
  for (const [x, z] of [[0, 0.3], [0.9, -0.4], [-0.9, -0.4], [0, -1.2], [0.6, 0.6], [-0.6, 0.6]]) L.cone(x, 1.9 - Math.abs(x) * 0.35 - Math.abs(z) * 0.2, z - 0.3, 0.32, 0.6, 0x6a667e);
  L.limb(0, 1.0, 1.6, 0, 3.0, 2.5, 0.5, B); L.limb(0, 3.0, 2.5, 0, 4.6, 2.8, 0.42, B);
  L.sphere(0, 4.9, 3.1, 0.75, B, { sz: 1.25 });
  L.spike(0, 5.5, 2.9, 0.18, 0.5, -0.3, 0, B);
  for (const sd of [-1, 1]) { L.sphere(sd * 0.38, 5.05, 3.7, 0.12, BLK); L.spike(sd * 0.6, 5.3, 2.9, 0.15, 0.4, 0, -sd * 0.6, B); L.box(sd * 1.9, 0.1, 1.0, 1.6, 0.2, 0.8, B, { ry: sd * 0.5 }); }
}
// rising Gyarados (spine climbs out of the water along local +Y, head facing +Z)
export function gyarados(L) {
  const B = K.gyar, n = 11;
  const sp = (u) => [0, 11 * u, -2.6 * Math.sin(u * Math.PI) + u * 1.2];
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1), [x, y, z] = sp(u), r = 1.55 - u * 0.45;
    L.sphere(x, y, z, r, B);
    L.sphere(x, y, z + r * 0.5, r * 0.72, K.gyBelly, { sz: 0.8 });
    if (k % 2 === 0 && k < n - 1) L.spike(0, y + 0.3, z - r * 0.7, 0.35, 1.2, -1.9, 0, 0x5a8ae8);
  }
  const hy = 12.2, hz = 1.4;
  L.sphere(0, hy, hz, 1.6, B, { sx: 1.1, sy: 0.85, sz: 1.3 });
  L.box(0, hy + 0.1, hz + 1.7, 1.9, 0.6, 1.6, B, { rx: -0.25 });
  L.box(0, hy - 1.4, hz + 1.5, 1.6, 0.4, 1.6, K.gyBelly, { rx: 0.35 });
  L.box(0, hy - 0.6, hz + 1.6, 1.4, 0.9, 1.3, 0x7a1a2a);
  for (const sd of [-1, 1]) {
    L.spike(sd * 0.6, hy - 0.3, hz + 2.3, 0.12, 0.4, Math.PI, 0, WHT); L.spike(sd * 0.5, hy - 1.15, hz + 2.1, 0.1, 0.35, 0, 0, WHT);
    L.sphere(sd * 0.75, hy + 0.65, hz + 1.25, 0.26, 0xf6e04a, { sz: 0.6 }); L.sphere(sd * 0.75, hy + 0.65, hz + 1.38, 0.12, BLK);
    L.seg(sd * 1.05, hy + 1.0, hz + 1.0, sd * 0.35, hy + 0.85, hz + 1.5, 0.12, 0.12, 0x1a3a7a);
    L.limb(sd * 0.95, hy - 0.2, hz + 1.9, sd * 2.0, hy - 1.6, hz + 2.4, 0.12, WHT);
    L.spike(sd * 0.9, hy + 0.5, hz - 0.6, 0.35, 1.6, -0.6, -sd * 0.5, WHT);
  }
  L.spike(0, hy + 1.0, hz - 0.2, 0.4, 2.2, -0.5, 0, 0x5a8ae8);
}
export function magikarp(L) {
  L.sphere(0, 0, 0, 1, K.karp, { sx: 0.55, sz: 1.3 }); L.sphere(0, -0.3, 0.3, 0.7, 0xf0d8a0, { sx: 0.5, sz: 1.0 });
  L.box(0, 0, -1.6, 0.12, 1.6, 0.8, 0xf4e8c8, { rx: 0 });
  for (let k = -1; k <= 1; k++) L.spike(0, 0.85, k * 0.4, 0.15, 0.6, k * 0.3, 0, 0xf2c840);
  for (const sd of [-1, 1]) { L.sphere(sd * 0.42, 0.25, 0.75, 0.24, WHT, { sx: 0.4 }); L.sphere(sd * 0.48, 0.25, 0.75, 0.08, BLK); L.limb(sd * 0.25, -0.2, 1.2, sd * 0.5, -0.9, 1.4, 0.05, 0xf4e8c8); L.box(sd * 0.5, -0.5, 0.2, 0.06, 0.4, 0.6, 0xf4e8c8, { rz: sd * 0.6 }); }
  L.sphere(0, -0.1, 1.25, 0.3, 0xf08aa0, { sx: 0.6 });
}
export function mew(L) {
  const P = K.mew;
  L.sphere(0, 1.0, 0, 0.5, P, { sy: 1.2 }); L.sphere(0, 1.9, 0.1, 0.65, P);
  for (const sd of [-1, 1]) { L.spike(sd * 0.4, 2.3, 0, 0.2, 0.45, 0, -sd * 0.5, P); L.sphere(sd * 0.25, 1.95, 0.65, 0.16, 0x2a6ad8, { sy: 1.3, sz: 0.4 }); L.limb(sd * 0.3, 0.6, 0.1, sd * 0.4, 0.0, 0.2, 0.14, P); }
  L.limb(0, 0.7, -0.4, 0, 0.6, -2.0, 0.07, P); L.limb(0, 0.6, -2.0, 0, 1.8, -2.6, 0.07, P); L.sphere(0, 1.9, -2.6, 0.2, P, { sy: 1.4 });
}
// Onix arching out of the ground (rock chain from tail to raised head)
export function onix(L) {
  const pts = []; const n = 10;
  for (let k = 0; k < n; k++) { const u = k / (n - 1); pts.push([Math.sin(u * 2.4) * 3, 1 + Math.sin(u * Math.PI * 0.9) * 13 * (0.4 + u * 0.6), -8 + u * 16]); }
  pts.forEach(([x, y, z], k) => { const r = 1.0 + k * 0.12; L.sphere(x, y, z, r, k % 2 ? K.onix : 0x7a7874, { sx: 1.0, sy: 0.85, sz: 1.1 }); });
  const [hx, hy, hz] = pts[n - 1];
  L.sphere(hx, hy + 0.6, hz + 1.6, 1.5, K.onix, { sx: 1.0, sy: 0.8, sz: 1.6 });
  L.spike(hx, hy + 1.6, hz + 0.6, 0.45, 2.6, -0.7, 0, 0x6a6864);
  for (const sd of [-1, 1]) { L.sphere(hx + sd * 0.7, hy + 0.9, hz + 2.8, 0.18, BLK, { sx: 1.4 }); L.seg(hx + sd * 1.1, hy + 1.3, hz + 2.6, hx + sd * 0.35, hy + 1.1, hz + 3.0, 0.14, 0.14, 0x3a3834); }
}

// ---- items & buildings -----------------------------------------------------------------------------
export function pokeball(L, x, y, z, r, o = {}) {
  L.hemi(x, y + r, z, r, o.top ?? K.ball, { rx: 0 });
  L.hemi(x, y + r, z, r, WHT, { rx: Math.PI });
  L.cyl(x, y + r, z, r * 1.02, r * 0.12, BLK, { c: true, seg: 18 });
  L.cyl(x, y + r, z + r * 0.92, r * 0.3, r * 0.2, BLK, { c: true, rx: Math.PI / 2 });
  L.cyl(x, y + r, z + r * 1.0, r * 0.2, r * 0.12, WHT, { c: true, rx: Math.PI / 2 });
}
// sign atlas: 4 x 4 cells of 256 x 128
const SIGNS = ['PALLET TOWN', 'ROUTE 1', 'VIRIDIAN CITY', 'POKéMON CENTER', 'VIRIDIAN GYM', 'POKé MART', 'VIRIDIAN FOREST', 'MT. MOON', 'CERULEAN CITY', 'POKéMON STADIUM', "OAK'S LAB", 'CERULEAN GYM', 'BIKE SHOP', 'ROUTE 4', 'KANTO CUP', 'GO!'];
let signMatC = null;
function signMat() {
  if (signMatC) return signMatC;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  SIGNS.forEach((text, k) => {
    const x = (k % 4) * 256, y = Math.floor(k / 4) * 128;
    const bg = k === 3 ? '#d8202a' : k === 5 || k === 8 || k === 11 ? '#2a6ad8' : k === 4 ? '#3a8a4a' : k === 9 || k === 14 ? '#1a2a6a' : '#f4f0e0';
    g.fillStyle = bg; g.fillRect(x, y, 256, 128);
    g.strokeStyle = bg === '#f4f0e0' ? '#7a4a24' : '#ffffff'; g.lineWidth = 8; g.strokeRect(x + 6, y + 6, 244, 116);
    g.fillStyle = bg === '#f4f0e0' ? '#3a2a1a' : '#ffffff';
    let fs = 60; g.font = `900 ${fs}px "Arial Black", Arial`;
    while (g.measureText(text).width > 228 && fs > 14) { fs -= 3; g.font = `900 ${fs}px "Arial Black", Arial`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + 128, y + 66);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (signMatC = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3, side: THREE.DoubleSide }));
}
const signGeos = new Map();
export function sign(b, name, x, y, z, w, rot) {
  const k = SIGNS.indexOf(name);
  let g = signGeos.get(k);
  if (!g) {
    g = new THREE.PlaneGeometry(1, 1);
    const u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4, uv = g.attributes.uv;
    for (let n = 0; n < uv.count; n++) uv.setXY(n, u0 + uv.getX(n) * 0.25, v0 + uv.getY(n) * 0.25);
    signGeos.set(k, g);
  }
  b.addMatrix(g, signMat(), mat4(x, y, z, 0, rot, 0, w, w / 2, 1));
}
// wooden route sign on a post (front +Z)
export function signPost(b, name, x, z, rot, s = 1) {
  const L = new Local(b, x, 0, z, rot, s);
  L.boxB(0, 0, 0, 0.3, 2.4, 0.3, 0x6a4a2a); L.box(0, 2.6, 0, 3.4, 1.7, 0.25, 0x7a5a34);
  sign(b, name, x + Math.sin(rot) * 0.14 * s, 1.75 * s, z + Math.cos(rot) * 0.14 * s, 3.2 * s, rot);
}
// Kanto house: cream walls, red pitched roof, door and windows (front +Z)
export function kantoHouse(b, x, z, rot, { w = 9, d = 8, h = 5, wall = 0xf2ead2, roof = 0xc83a2a } = {}) {
  const L = new Local(b, x, 0, z, rot, 1);
  L.boxB(0, 0, 0, w, h, d, wall);
  for (const sd of [-1, 1]) L.box(0, h + d * 0.2, sd * d * 0.25, w + 0.8, 0.5, d * 0.62, roof, { rx: sd * 0.68 });
  L.box(0, h + d * 0.2, 0, w + 0.8, 0.5, 0.6, roof);
  L.boxB(w * 0.2, 0, d / 2 + 0.05, 1.6, 2.6, 0.2, 0x7a4a24);
  for (const sd of [-1, 1]) { L.box(sd * w * 0.3 - w * 0.05, h * 0.55, d / 2 + 0.06, 1.4, 1.3, 0.12, 0x9ad8f0); L.box(sd * w * 0.3 - w * 0.05, h * 0.55, d / 2 + 0.03, 1.7, 1.6, 0.06, WHT); }
  L.boxB(-w * 0.3, h, -d * 0.1, 1.0, d * 0.5, 1.0, 0x9a8a7a);
}
// Pokémon Center: white walls, red roof band, glass doors and the ball emblem
export function pokeCenter(b, x, z, rot) {
  const L = new Local(b, x, 0, z, rot, 1), w = 20, d = 13, h = 7;
  L.boxB(0, 0, 0, w, h, d, WHT);
  L.boxB(0, h, 0, w + 1, 1.6, d + 1, K.ball); L.boxB(0, h + 1.6, 0, w + 1.2, 0.4, d + 1.2, WHT);
  L.boxB(0, h + 2, 0, w - 4, 2, d - 4, K.ball);
  L.boxB(0, 0, d / 2 + 0.05, 5, 4.2, 0.3, 0x9ad8f0, { matOpts: { trans: true, opacity: 0.6 } }); L.boxB(0, 4.2, d / 2 + 0.1, 5.6, 0.5, 0.4, 0xd8d8d8);
  for (const sd of [-1, 1]) for (let n = 0; n < 2; n++) L.box(sd * (5 + n * 3.5), 4, d / 2 + 0.06, 2.2, 2.4, 0.12, 0x9ad8f0);
  pokeball(L, 0, h + 4, 1.0, 2.2);
  sign(b, 'POKéMON CENTER', ...frontPt(x, z, rot, 0, h + 0.85, d / 2 + 0.62), 9, rot);
}
// Gym: grey-green building with a big ball emblem and two ball statues at the door
export function gym(b, x, z, rot, { roof = 0x3a8a4a, wall = 0xd8d0b8, name = 'VIRIDIAN GYM' } = {}) {
  const L = new Local(b, x, 0, z, rot, 1), w = 26, d = 18, h = 9;
  L.boxB(0, 0, 0, w, h, d, wall);
  for (let n = -2; n <= 2; n++) L.boxB(n * 5.5, 0, d / 2 + 0.1, 0.8, h, 0.8, 0xb8b09a);
  L.boxB(0, h, 0, w + 1.6, 1.2, d + 1.6, roof);
  for (const sd of [-1, 1]) L.box(0, h + 1.2 + d * 0.16, sd * d * 0.24, w + 1.2, 0.6, d * 0.56, roof, { rx: sd * 0.5 });
  L.boxB(0, 0, d / 2 + 0.1, 5, 5, 0.3, 0x3a2a1a);
  pokeball(L, 0, h - 1.8, d / 2 + 0.6, 2.6);
  for (const sd of [-1, 1]) { L.boxB(sd * 5, 0, d / 2 + 3, 1.6, 3, 1.6, 0xb8b09a); pokeball(L, sd * 5, 3, d / 2 + 3, 0.9); }
  sign(b, name, ...frontPt(x, z, rot, 0, h - 5.5, d / 2 + 0.5), 7, rot);
}
export function pokeMart(b, x, z, rot) {
  const L = new Local(b, x, 0, z, rot, 1), w = 13, d = 10, h = 6;
  L.boxB(0, 0, 0, w, h, d, WHT); L.boxB(0, h, 0, w + 1, 1.4, d + 1, 0x2a6ad8); L.boxB(0, h + 1.4, 0, w - 3, 1.2, d - 3, 0x2a6ad8);
  L.boxB(0, 0, d / 2 + 0.05, 4, 3.8, 0.3, 0x9ad8f0, { matOpts: { trans: true, opacity: 0.6 } });
  sign(b, 'POKé MART', ...frontPt(x, z, rot, 0, h + 0.7, d / 2 + 0.55), 7, rot);
}
// Professor Oak's lab: long white building, slate roof, solar panels and a satellite dish
export function oakLab(b, x, z, rot) {
  const L = new Local(b, x, 0, z, rot, 1), w = 24, d = 14, h = 7;
  L.boxB(0, 0, 0, w, h, d, 0xf4f4ee);
  for (const sd of [-1, 1]) L.box(0, h + d * 0.18, sd * d * 0.25, w + 1, 0.5, d * 0.6, 0x5a6a7a, { rx: sd * 0.55 });
  for (let n = -3; n <= 3; n++) L.box(n * 3, h + d * 0.22 + 0.4, -d * 0.25, 2.4, 0.15, 3.4, 0x1a2a5a, { rx: -0.55 });
  L.boxB(0, 0, d / 2 + 0.05, 3, 3.4, 0.25, 0x7a4a24);
  for (let n = -3; n <= 3; n++) if (n) L.box(n * 3, 3.6, d / 2 + 0.06, 1.8, 1.8, 0.12, 0x9ad8f0);
  L.boxB(w * 0.35, h + 2, 0, 0.4, 3, 0.4, 0xc0c0c0); L.sphere(w * 0.35, h + 5.2, 0.4, 1.4, 0xe8e8e8, { sz: 0.35 });
  sign(b, "OAK'S LAB", ...frontPt(x, z, rot, -w * 0.28, 5.6, d / 2 + 0.25), 5, rot);
}
function frontPt(x, z, rot, lx, y, lz) { const c = Math.cos(rot), s = Math.sin(rot); return [x + lx * c + lz * s, y, z - lx * s + lz * c]; }

// round Kanto tree
export function kTree(b, x, z, s = 1, y = 0, leaf = 0x2f8a3a, leaf2 = 0x3fa84a) {
  b.cyl(x, y, z, 0.45 * s, 2.6 * s, 0x7a4a24, { seg: 8 });
  b.sphere(x, y + 4.2 * s, z, 2.4 * s, leaf, { sy: 1.1 });
  b.sphere(x + 0.7 * s, y + 5.3 * s, z + 0.5 * s, 1.5 * s, leaf2);
  b.sphere(x - 0.9 * s, y + 3.6 * s, z - 0.4 * s, 1.4 * s, leaf2);
}
// tall grass tuft (wild Pokémon live here!)
export function grassTuft(b, x, z, s = 1, cols = [0x2f9a3a, 0x48b84a]) {
  for (let n = 0; n < 3; n++) { const a = n * 2.1 + x; b.cone(x + Math.cos(a) * 0.5 * s, 0, z + Math.sin(a) * 0.5 * s, 0.45 * s, (1.6 + (n % 2) * 0.6) * s, cols[n % 2], { seg: 4 }); }
}
// big screen texture: 2 x 2 frames
export function screenTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const frame = (k, draw) => { g.save(); g.translate((k % 2) * 512, Math.floor(k / 2) * 256); g.beginPath(); g.rect(0, 0, 512, 256); g.clip(); draw(); g.restore(); };
  const ball = (x, y, r) => { g.fillStyle = '#d8202a'; g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, Math.PI); g.fill(); g.fillStyle = '#111'; g.fillRect(x - r, y - r * 0.08, r * 2, r * 0.16); g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * 0.18, 0, 7); g.fill(); };
  const txt = (t, x, y, fs, col) => { g.fillStyle = col; g.font = `900 ${fs}px "Arial Black", Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); };
  frame(0, () => { g.fillStyle = '#1a2a6a'; g.fillRect(0, 0, 512, 256); ball(110, 128, 80); txt('POKéMON', 330, 95, 50, '#f6d23a'); txt('STADIUM', 330, 160, 52, '#fff'); });
  frame(1, () => { const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#f6d23a'); gr.addColorStop(1, '#f5893a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256); txt('PIKACHU', 128, 128, 44, '#7a4a24'); txt('VS', 256, 128, 64, '#d8202a'); txt('CHARIZARD', 390, 128, 36, '#1a2a6a'); });
  frame(2, () => { g.fillStyle = '#d8202a'; g.fillRect(0, 0, 512, 256); for (let k = 0; k < 5; k++) ball(60 + k * 98, 70, 34); txt('GOTTA RACE', 256, 175, 54, '#fff'); });
  frame(3, () => { g.fillStyle = '#2fb84a'; g.fillRect(0, 0, 512, 256); txt('KANTO', 256, 90, 70, '#fff'); txt('BRICK CUP', 256, 175, 60, '#f6d23a'); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(0.5, 0.5);
  return t;
}
// floating "Z" sprite texture for sleeping Snorlax
let zTex = null;
export function zTexture() {
  if (zTex) return zTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.font = '900 54px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#1a2a6a'; g.strokeText('Z', 32, 34); g.fillStyle = '#ffffff'; g.fillText('Z', 32, 34);
  return (zTex = new THREE.CanvasTexture(c));
}
let bangTex = null;
export function bangTexture() {
  if (bangTex) return bangTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = '#d8202a'; g.stroke();
  g.font = '900 46px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#d8202a'; g.fillText('!', 32, 35);
  return (bangTex = new THREE.CanvasTexture(c));
}
