// Sonic the Hedgehog brick props for "Green Brick Zone": Green Hill scenery
// (checkered cliffs, palms, sunflowers, totems, waterfalls, the loop), badniks
// (Motobug, Crabmeat, Buzz Bomber), Dr. Eggman in his Egg Mobile with the
// checkered wrecking ball, Casino Night set pieces and the Death Egg.
// Every model faces +Z with its feet on y = 0; animated parts hang on pivot groups.
import { THREE, BrickBuilder, C, plastic, brickGeometry } from './kit.js';

export const SN = {
  blue: 0x1e52d6, dkblue: 0x123a9a, peach: 0xf2c49a, brown: 0xb4682a, dkbrown: 0x74401a, grass: 0x3cc23c, dkgrass: 0x1f8a2a,
  gold: 0xf6c51a, red: 0xd8261c, white: 0xf4f4f4, black: 0x1b1b22, steel: 0x8c949e, dksteel: 0x4a5058, purple: 0x5a2a9a, pink: 0xff4aa8,
};

const Y = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const M2 = new THREE.Matrix4();
function compose(x, y, z, rx, ry, rz, sx, sy, sz) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); }
const GEO = {};
const geo = (k, f) => GEO[k] || (GEO[k] = f());

// A BrickBuilder seen through a local frame (position, yaw, scale) with centred, rotatable primitives.
export class Local {
  constructor(b, x = 0, y = 0, z = 0, yaw = 0, s = 1) {
    this.b = b;
    this.m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, yaw), new THREE.Vector3(s, s, s));
  }
  put(g, col, x, y, z, rx, ry, rz, sx, sy, sz, o) { M2.multiplyMatrices(this.m, compose(x, y, z, rx, ry, rz, sx, sy, sz)); this.b.addMatrix(g, o?.mat || plastic(col, o?.matOpts), M2); }
  box(x, y, z, sx, sy, sz, col, o = {}) { this.put(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), col, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, sx, sy, sz, o); }
  boxB(x, y, z, sx, sy, sz, col, o = {}) { this.box(x, y + sy / 2, z, sx, sy, sz, col, o); return y + sy; }
  cyl(x, y, z, r, h, col, o = {}) { const seg = o.seg || 12; this.put(geo('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg)), col, x, o.c ? y : y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0, r, h, o.r2 || r, o); return y + h; }
  cone(x, y, z, r, h, col, o = {}) { const seg = o.seg || 10; this.put(geo('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg)), col, x, o.c ? y : y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0, r, h, r, o); return y + h; }
  sphere(x, y, z, r, col, o = {}) { this.put(geo('sph', () => new THREE.SphereGeometry(1, 14, 10)), col, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1), o); }
  torus(x, y, z, R, t, col, o = {}) { this.put(geo('tor' + t / R, () => new THREE.TorusGeometry(1, t / R, 8, 28)), col, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, R, R, R, o); }
  brick(x, y, z, w, d, h, col, o = {}) { const p = o.pitch || 1; this.put(brickGeometry(w, d, h, p, o.studs !== false, 8), col, x, y, z, 0, o.ry || 0, 0, 1, 1, 1, o); return y + h * 0.4 * p; }
}
export function part(fn, name = 'part', shadows = true) { const b = new BrickBuilder(1); fn(new Local(b)); return b.build({ name, shadows }); }
function pivot(parent, x, y, z, child) { const g = new THREE.Group(); g.position.set(x, y, z); if (child) g.add(child); parent.add(g); return g; }

// ---- materials & textures --------------------------------------------------------------------
const texCache = new Map();
export function tex(key, w, h, draw, repeat = false) {
  let t = texCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}
export const neon = (color, k = 2) => plastic(color, { emissive: color, emissiveIntensity: k });
export const goldMat = () => plastic(SN.gold, { metal: 0.85, rough: 0.22, emissive: 0x8a5a00, emissiveIntensity: 0.55 });
// Green Hill checker (two browns), 2x2 cells per texture tile
export function checkerTex(a = '#b8692a', b = '#7a4219') {
  return tex('chk' + a + b, 64, 64, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h / 2 - 1, w, 2); g.fillRect(w / 2 - 1, 0, 2, h);
  }, true);
}
let chkMat = null;
export const checkerMat = () => (chkMat ||= new THREE.MeshStandardMaterial({ map: checkerTex(), roughness: 0.6 }));
// box (bottom-centred) with world-scaled checker UVs: one cell = `cell` units
const _box = new Map();
function checkerBoxGeo(w, h, d, cell) {
  const key = [w, h, d, cell].map((v) => v.toFixed(1)).join(',');
  let g = _box.get(key);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  const uv = g.attributes.uv, sz = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const n = f * 4 + v; uv.setXY(n, uv.getX(n) * sz[f][0] / (cell * 2), uv.getY(n) * sz[f][1] / (cell * 2)); }
  _box.set(key, g);
  return g;
}
// checkered earth block with a studded grass cap (Green Hill cliff). Returns top y.
export function cliff(b, x, y, z, w, h, d, rot = 0, { cell = 2.4, grass = SN.grass, cap = true } = {}) {
  b.add(checkerBoxGeo(w, h, d, cell), checkerMat(), x, y, z, rot);
  if (cap) {
    b.box(x, y + h, z, w + 0.6, 1.0, d + 0.6, grass, { rot });
    // drooping grass fringe
    const ca = Math.cos(rot), sa = Math.sin(rot);
    for (const sd of [-1, 1]) {
      b.box(x + sa * sd * (d / 2 + 0.35), y + h - 0.7, z + ca * sd * (d / 2 + 0.35), w + 0.6, 0.9, 0.3, SN.dkgrass, { rot });
      b.box(x + ca * sd * (w / 2 + 0.35), y + h - 0.7, z - sa * sd * (w / 2 + 0.35), 0.3, 0.9, d + 0.6, SN.dkgrass, { rot });
    }
  }
  return y + h + (cap ? 1 : 0);
}

// ---- Green Hill scenery ----------------------------------------------------------------------
// palm with banded trunk and a fat leaf crown
export function ghPalm(b, x, z, s, r, y = 0) {
  const lean = (r() - 0.5) * 0.4, dir = r() * Math.PI * 2;
  let px = x, pz = z, py = y;
  for (let k = 0; k < 8; k++) {
    b.cyl(px, py, pz, (0.75 - k * 0.04) * s, 1.3 * s, k % 2 ? 0xc8884a : SN.dkbrown, { seg: 8 });
    py += 1.25 * s; px += Math.cos(dir) * lean * k * 0.22 * s; pz += Math.sin(dir) * lean * k * 0.22 * s;
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + r() * 0.3, len = (5 + r() * 1.5) * s;
    b.boxM(compose(px + Math.sin(a) * len * 0.42, py - 0.2 * s, pz + Math.cos(a) * len * 0.42, 0.38, a, 0, 1.8 * s, 0.25 * s, len), k % 2 ? SN.grass : SN.dkgrass);
    b.boxM(compose(px + Math.sin(a) * len * 0.9, py - 1.6 * s, pz + Math.cos(a) * len * 0.9, 1.0, a, 0, 1.5 * s, 0.22 * s, len * 0.3), k % 2 ? SN.dkgrass : SN.grass);
  }
  b.sphere(px, py - 0.3 * s, pz, 0.7 * s, SN.dkbrown);
}
// sunflower: the head spins (returned group, add to scene)
export function sunflower(s = 1) {
  const root = new THREE.Group();
  root.add(part((L) => {
    L.cyl(0, 0, 0, 0.28, 5.4, SN.dkgrass, { seg: 6 });
    for (const sd of [-1, 1]) L.box(sd * 0.9, 2.2 + (sd > 0 ? 0.8 : 0), 0, 1.8, 0.2, 0.9, SN.grass, { rz: sd * 0.4 });
  }, 'stem'));
  const head = new THREE.Group(); head.position.set(0, 5.8, 0.3); root.add(head);
  head.add(part((L) => {
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; L.box(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0, 1.1, 1.1, 0.3, SN.gold, { rz: a + Math.PI / 4 }); }
    L.cyl(0, 0, 0.1, 1.0, 0.5, 0x8a4a1a, { c: true, rx: Math.PI / 2, seg: 12 });
    L.cyl(0, 0, 0.32, 0.55, 0.2, SN.dkbrown, { c: true, rx: Math.PI / 2, seg: 10 });
  }, 'sunflower'));
  root.scale.setScalar(s);
  root.userData.head = head;
  return root;
}
// totem pole: stacked winged faces
export function totem(b, x, z, s = 1, rot = 0, r = Math.random) {
  const L = new Local(b, x, 0, z, rot, s);
  const faces = [[SN.brown, SN.gold], [0x8a2a8a, SN.grass], [SN.blue, SN.gold], [SN.red, SN.white]];
  let y = 0;
  L.boxB(0, 0, 0, 3.4, 1, 3.4, SN.dkbrown);
  y = 1;
  const n = 3 + Math.floor(r() * 2);
  for (let k = 0; k < n; k++) {
    const [c1, c2] = faces[(k + Math.floor(r() * 4)) % 4];
    L.boxB(0, y, 0, 2.8, 2.6, 2.8, c1);
    for (const sd of [-1, 1]) { L.box(sd * 0.65, y + 1.6, 1.42, 0.6, 0.6, 0.1, SN.white); L.box(sd * 0.65, y + 1.55, 1.48, 0.3, 0.4, 0.1, SN.black); }
    L.box(0, y + 0.7, 1.42, 1.4, 0.35, 0.1, c2);
    if (k === n - 1 || k === 1) for (const sd of [-1, 1]) L.box(sd * 2.4, y + 1.6, 0, 2.2, 0.8, 0.6, c2, { rz: sd * 0.35 });
    y += 2.6;
  }
  L.cone(0, y, 0, 1.6, 1.4, SN.gold, { seg: 4, ry: Math.PI / 4 });
  return y * s;
}
// small purple/pink flower clusters
export function flowers(b, x, z, r) {
  const col = [0xb04ad8, 0xff6aa0, 0xffffff, SN.gold][Math.floor(r() * 4)];
  for (let k = 0; k < 5; k++) { const a = r() * 6.28, d = r() * 1.6; b.cyl(x + Math.cos(a) * d, 0, z + Math.sin(a) * d, 0.08, 1.1, SN.dkgrass, { seg: 4 }); b.sphere(x + Math.cos(a) * d, 1.2, z + Math.sin(a) * d, 0.32, col); }
}
// a wall of rock with waterfalls: animated stripes (one shared texture, scrolled each frame by the map)
let fallTexture = null;
export function fallTex() {
  if (fallTexture) return fallTexture;
  fallTexture = tex('fall', 64, 256, (g, w, h) => {
    g.fillStyle = '#3aa6ff'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) { g.fillStyle = k % 3 ? 'rgba(255,255,255,0.75)' : 'rgba(160,220,255,0.9)'; const x = (k * 37) % w, y = (k * 71) % h; g.fillRect(x, y, 3 + (k % 4) * 2, 30 + (k % 5) * 12); }
  }, true);
  return fallTexture;
}
let fallMatC = null;
export const fallMat = () => (fallMatC ||= new THREE.MeshStandardMaterial({ map: fallTex(), transparent: true, opacity: 0.85, roughness: 0.15, emissive: 0x2a80d0, emissiveIntensity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
export function waterfall(group, x, y0, y1, z, w, rot) {
  const g = new THREE.PlaneGeometry(w, y1 - y0);
  const uv = g.attributes.uv; for (let n = 0; n < uv.count; n++) uv.setXY(n, uv.getX(n) * w / 8, uv.getY(n) * (y1 - y0) / 16);
  const m = new THREE.Mesh(g, fallMat()); m.position.set(x, (y0 + y1) / 2, z); m.rotation.y = rot;
  group.add(m);
  const foam = new THREE.Mesh(geo('foam', () => new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), plastic(0xffffff, { trans: true, opacity: 0.7 }));
  foam.position.set(x, y0 - 0.3, z); foam.scale.set(w * 0.6, 1.2, 2.2); foam.rotation.y = rot; group.add(foam);
  return m;
}

// the loop-de-loop: a checkered band in the local YZ plane (road along +Z), standing on y = 0
export function loopDeLoop(R = 16, width = 11) {
  const b = new BrickBuilder(1), L = new Local(b);
  const n = 40, segL = 2 * Math.PI * (R + 0.8) / n;
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2, y = R + 1.2 - Math.cos(a) * (R + 0.8), z = Math.sin(a) * (R + 0.8);
    for (let st = 0; st < 3; st++) L.box((st - 1) * width / 3, y, z, width / 3, 1.6, segL + 0.05, (k + st) % 2 ? SN.brown : SN.dkbrown, { rx: a });
    // inner running surface + rims
    const yi = R + 1.2 - Math.cos(a) * (R - 0.1), zi = Math.sin(a) * (R - 0.1);
    L.box(0, yi, zi, width, 0.3, segL, 0x5a5e66, { rx: a });
    for (const sd of [-1, 1]) L.box(sd * (width / 2 + 0.3), (yi + y) / 2 + 0, (zi + z) / 2, 0.6, 2.4, segL, k % 2 ? SN.gold : SN.white, { rx: a });
  }
  // grassy bases where the loop meets the ground
  for (const sd of [-1, 1]) { L.boxB(0, 0, sd * 6, width + 3, 1.4, 12, SN.grass); L.boxB(0, 0, sd * 6, width + 2, 1.0, 11.6, SN.dkbrown); }
  const g = b.build({ name: 'loop' });
  return g;
}
// spinning-ball Sonic (spin dash) to run around the loop
export function spinBall(s = 1) {
  const g = new THREE.Group();
  const ball = part((L) => {
    L.sphere(0, 0, 0, 1.3, SN.blue);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; L.cone(Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0, 0.55, 1.2, SN.blue, { c: true, rz: a - Math.PI / 2, seg: 6 }); }
    L.sphere(0, 0, 1.0, 0.7, SN.peach, { sz: 0.6 });
  }, 'spinball');
  g.add(ball); g.scale.setScalar(s); g.userData.ball = ball;
  return g;
}

// a huge gold ring (torus in the local XY plane)
export function bigRing(R, t) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R, t, 12, 48), goldMat());
  m.castShadow = true;
  return m;
}
// a red-and-yellow spring
export function spring(s = 1, col = SN.red) {
  return part((L) => {
    L.boxB(0, 0, 0, 3.2, 0.6, 3.2, SN.dksteel);
    for (let k = 0; k < 4; k++) L.cyl(0, 0.6 + k * 0.6, 0, 1.0 - (k % 2) * 0.15, 0.35, 0xc0c4c8, { seg: 10, matOpts: { metal: 0.6, rough: 0.3 } });
    L.boxB(0, 3.0, 0, 3.4, 0.9, 3.4, col);
    L.boxB(0, 3.9, 0, 2.6, 0.25, 2.6, SN.gold);
  }, 'spring');
}
// goal signpost: a spinning panel (Eggman one side, Sonic the other)
export function faceTex(kind) {
  return tex('face-' + kind, 128, 128, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.lineWidth = 5; g.strokeStyle = '#1b1b22';
    if (kind === 'sonic') {
      g.fillStyle = '#1e52d6';
      g.beginPath(); g.moveTo(12, 40); g.lineTo(40, 30); g.lineTo(10, 70); g.lineTo(38, 70); g.lineTo(16, 104); g.lineTo(64, 90); g.lineTo(64, 20); g.closePath(); g.fill();
      g.beginPath(); g.arc(70, 66, 40, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#f2c49a'; g.beginPath(); g.ellipse(80, 86, 30, 18, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(72, 54, 11, 16, 0, 0, 7); g.ellipse(94, 54, 11, 16, 0, 0, 7); g.fill();
      g.fillStyle = '#1a8a2a'; g.beginPath(); g.arc(76, 56, 5, 0, 7); g.arc(96, 56, 5, 0, 7); g.fill();
      g.fillStyle = '#1b1b22'; g.beginPath(); g.arc(104, 80, 5, 0, 7); g.fill();
      g.beginPath(); g.arc(84, 90, 12, 0.1, Math.PI - 0.6); g.stroke();
    } else {
      g.fillStyle = '#f2c49a'; g.beginPath(); g.ellipse(64, 60, 40, 44, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#1b1b22'; g.fillRect(24, 36, 80, 10);
      g.fillStyle = '#9ad8ff'; g.beginPath(); g.arc(48, 42, 11, 0, 7); g.arc(80, 42, 11, 0, 7); g.fill();
      g.fillStyle = '#ff9a7a'; g.beginPath(); g.arc(64, 62, 9, 0, 7); g.fill();
      g.fillStyle = '#c86a1a'; g.beginPath(); g.moveTo(64, 70); g.bezierCurveTo(40, 64, 20, 72, 8, 90); g.bezierCurveTo(30, 84, 48, 86, 64, 80); g.bezierCurveTo(80, 86, 98, 84, 120, 90); g.bezierCurveTo(108, 72, 88, 64, 64, 70); g.fill();
    }
  });
}
export function signpost(s = 1) {
  const root = new THREE.Group();
  root.add(part((L) => { L.cyl(0, 0, 0, 0.3, 6.5, 0xc0c4c8, { seg: 8 }); L.boxB(0, 0, 0, 2, 0.6, 2, SN.dksteel); }, 'post'));
  const spin = new THREE.Group(); spin.position.y = 8.4; root.add(spin);
  spin.add(part((L) => { L.cyl(0, 0, 0, 2.1, 0.3, SN.gold, { c: true, rx: Math.PI / 2, seg: 24, matOpts: { metal: 0.6, rough: 0.3 } }); }, 'sign'));
  for (const [kind, z, ry] of [['sonic', 0.17, 0], ['eggman', -0.17, Math.PI]]) {
    const m = new THREE.Mesh(geo('signdisc', () => new THREE.CircleGeometry(1.85, 24)), new THREE.MeshStandardMaterial({ map: faceTex(kind), roughness: 0.4 }));
    m.position.z = z; m.rotation.y = ry; spin.add(m);
  }
  root.scale.setScalar(s); root.userData.spin = spin;
  return root;
}

// ---- badniks ---------------------------------------------------------------------------------
// Motobug: red ladybug robot on one wheel
export function motobug(s = 1) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(part((L) => {
    L.sphere(0, 2.2, 0, 1.9, SN.red, { sy: 0.85, sz: 1.15 });
    L.box(0, 2.7, 0, 0.2, 1.6, 4.2, SN.black);
    for (const [x, z] of [[1, 0.8], [-1, 0.8], [1.2, -0.9], [-1.2, -0.9]]) L.sphere(x * 1.05, 3.0, z, 0.38, SN.black);
    L.sphere(0, 1.9, 2.0, 1.15, SN.dksteel);
    for (const sd of [-1, 1]) { L.sphere(sd * 0.5, 2.4, 2.7, 0.42, SN.white); L.sphere(sd * 0.5, 2.4, 3.0, 0.2, SN.black); }
    L.cyl(0, 1.5, 3.0, 0.35, 0.6, SN.gold, { c: true, rx: Math.PI / 2, seg: 8 });
    for (const sd of [-1, 1]) L.cyl(sd * 1.6, 1.4, 0.5, 0.25, 1.4, SN.dksteel, { c: true, rz: Math.PI / 2, seg: 6 });
    L.cyl(0, 1.5, -2.2, 0.3, 1.2, SN.dksteel, { c: true, rx: Math.PI / 2, seg: 6 });
  }, 'motobug'));
  const wheel = part((L) => { L.cyl(0, 0, 0, 0.9, 0.9, SN.black, { c: true, rz: Math.PI / 2, seg: 12 }); L.cyl(0, 0, 0, 0.45, 1.0, SN.steel, { c: true, rz: Math.PI / 2, seg: 8 }); }, 'mwheel');
  const wp = pivot(root, 0, 0.9, 0.3, wheel);
  root.scale.setScalar(s); root.userData.wheel = wp; root.userData.body = body;
  return root;
}
// Crabmeat: red crab with big claws on raised arms
export function crabmeat(s = 1) {
  const root = new THREE.Group();
  root.add(part((L) => {
    L.box(0, 2.5, 0, 4.2, 1.8, 2.6, SN.red);
    L.box(0, 1.5, 0, 3.4, 0.6, 2.0, SN.dksteel);
    for (const sd of [-1, 1]) {
      L.cyl(sd * 0.8, 3.4, 0.6, 0.18, 1.4, SN.dksteel, { seg: 6 }); L.sphere(sd * 0.8, 4.9, 0.6, 0.5, SN.white); L.sphere(sd * 0.8, 4.9, 1.0, 0.24, SN.black);
      for (let k = 0; k < 3; k++) L.box(sd * (1.8 + k * 0.2), 0.9, -0.8 + k * 0.8, 1.8, 0.35, 0.35, SN.dksteel, { rz: sd * 0.7 });
    }
    L.box(0, 2.0, 1.32, 3, 0.4, 0.1, SN.gold);
  }, 'crab'));
  const arms = [];
  for (const sd of [-1, 1]) {
    const arm = pivot(root, sd * 2.1, 2.9, 0);
    arm.add(part((L) => {
      L.box(sd * 0.9, 0.9, 0, 0.5, 2.2, 0.5, SN.dksteel, { rz: -sd * 0.5 });
      L.box(sd * 1.6, 2.6, 0, 1.6, 1.3, 1.3, SN.red);
      L.box(sd * 1.6, 3.6, 0.3, 0.6, 1.2, 0.6, SN.red, { rz: sd * 0.3 });
      L.box(sd * 2.2, 3.5, 0.3, 0.5, 1.0, 0.5, SN.white, { rz: -sd * 0.3 });
    }, 'claw'));
    arms.push(arm);
  }
  root.scale.setScalar(s); root.userData.arms = arms;
  return root;
}
// Buzz Bomber: wasp robot with a stinger blaster pointing down-forward
export function buzzBomber(s = 1) {
  const root = new THREE.Group();
  root.add(part((L) => {
    L.sphere(0, 0, 1.4, 1.0, SN.dksteel);
    for (const sd of [-1, 1]) L.sphere(sd * 0.45, 0.25, 2.2, 0.36, SN.red, { matOpts: { emissive: 0xff2010, emissiveIntensity: 1.2 } });
    L.box(0, 0, -0.2, 1.4, 1.2, 2.2, SN.gold);
    for (let k = 0; k < 3; k++) L.box(0, 0, -1.6 - k * 0.9, 1.5 - k * 0.2, 1.3 - k * 0.15, 0.6, k % 2 ? SN.gold : SN.black);
    L.cone(0, -0.9, -3.6, 0.45, 1.6, SN.steel, { c: true, rx: -2.4, seg: 8 });
    L.sphere(0, -1.3, -4.1, 0.35, 0xff6a20, { matOpts: { emissive: 0xff5010, emissiveIntensity: 2 } });
  }, 'buzz'));
  const wings = [];
  const wm = plastic(0xbfe8ff, { trans: true, opacity: 0.55 });
  for (const sd of [-1, 1]) {
    const w = pivot(root, sd * 0.6, 0.6, 0.1);
    w.add(part((L) => { L.box(sd * 1.6, 0, 0, 3.2, 0.08, 1.4, 0, { mat: wm }); L.box(sd * 1.4, 0, -1.1, 2.6, 0.08, 1.0, 0, { mat: wm }); }, 'wing', false));
    wings.push(w);
  }
  root.scale.setScalar(s); root.userData.wings = wings;
  return root;
}
// Dr. Eggman in the Egg Mobile (hover pod), facing +Z
export function eggMobile(s = 1) {
  const root = new THREE.Group();
  root.add(part((L) => {
    L.sphere(0, 0, 0, 3.0, 0xd8dce2, { sy: 0.7, matOpts: { metal: 0.4, rough: 0.3 } });
    L.cyl(0, -0.4, 0, 3.05, 0.6, SN.dksteel, { c: true, seg: 20 });
    L.sphere(0, -1.6, 0, 1.4, SN.black, { sy: 0.6 });
    L.cyl(0, -2.2, 0, 0.9, 0.4, 0xff9a20, { c: true, seg: 12, matOpts: { emissive: 0xff7010, emissiveIntensity: 2 } });
    L.box(0, 0.2, 2.9, 2.2, 0.8, 0.3, SN.gold);
    // Eggman: red coat, bald head, goggles, huge moustache
    L.box(0, 2.1, 0, 2.6, 2.2, 2.0, SN.red);
    for (const sd of [-1, 1]) { L.box(sd * 1.6, 2.4, 0.6, 0.7, 1.8, 0.7, SN.red, { rx: -0.6 }); L.sphere(sd * 1.6, 2.0, 1.6, 0.45, SN.white); }
    L.box(0, 1.6, 1.02, 0.25, 1.6, 0.1, SN.gold);
    L.sphere(0, 4.3, 0, 1.5, SN.peach, { sy: 1.1 });
    L.sphere(0, 4.1, 1.35, 0.42, 0xff9a7a);
    L.box(-0.75, 3.75, 1.2, 1.5, 0.45, 0.5, 0xc86a1a, { rz: 0.25 }); L.box(0.75, 3.75, 1.2, 1.5, 0.45, 0.5, 0xc86a1a, { rz: -0.25 });
    L.box(0, 5.0, 0.6, 3.1, 0.35, 2.4, SN.black);
    for (const sd of [-1, 1]) L.cyl(sd * 0.6, 5.15, 1.35, 0.42, 0.3, 0x9ad8ff, { c: true, rx: Math.PI / 2, seg: 10 });
  }, 'eggmobile'));
  const glass = new THREE.Mesh(geo('dome', () => new THREE.SphereGeometry(3.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), plastic(0xbfe8ff, { trans: true, opacity: 0.25 }));
  glass.position.y = 0.6; glass.scale.y = 1.6; root.add(glass);
  root.scale.setScalar(s);
  return root;
}
// the checkered wrecking ball (Green Hill boss)
let ballTexC = null;
export function wreckBall(r = 2.6) {
  ballTexC ||= tex('ballchk', 128, 64, (g, w, h) => { for (let a = 0; a < 8; a++) for (let c = 0; c < 4; c++) { g.fillStyle = (a + c) % 2 ? '#1b1b22' : '#f4f4f4'; g.fillRect(a * w / 8, c * h / 4, w / 8, h / 4); } });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ map: ballTexC, roughness: 0.25, metalness: 0.3 }));
  m.castShadow = true;
  return m;
}
// pinball bumper: returns group; userData.cap flashes when hit
export function bumper(r = 2.4, col = 0x2a6aff) {
  const root = new THREE.Group();
  root.add(part((L) => {
    L.cyl(0, 0, 0, r, 0.6, SN.dksteel, { seg: 20 });
    L.cyl(0, 0.6, 0, r * 0.82, 2.2, SN.white, { seg: 20 });
    L.cyl(0, 1.1, 0, r * 0.86, 0.5, SN.red, { seg: 20 });
  }, 'bumper'));
  const cap = new THREE.Mesh(geo('bcap' + r, () => new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.7, 20)), neon(col, 1.4).clone());
  cap.position.y = 3.15; root.add(cap);
  const star = new THREE.Mesh(geo('bstar', () => { const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = k % 2 ? 0.45 : 1; sh[k ? 'lineTo' : 'moveTo'](Math.sin(a) * rr, Math.cos(a) * rr); } return new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2); }), neon(SN.gold, 1.6));
  star.position.y = 3.52; star.scale.setScalar(r * 0.6); root.add(star);
  root.userData.cap = cap;
  return root;
}
// slot machine: three reel planes whose textures scroll (userData.reels)
export function reelTex() {
  return tex('reel', 64, 256, (g, w, h) => {
    const syms = ['7', 'R', 'S', 'B', '$'];
    g.fillStyle = '#fff8e8'; g.fillRect(0, 0, w, h);
    syms.forEach((sy, k) => {
      const y = k * h / 5 + h / 10;
      if (sy === 'R') { g.strokeStyle = '#f6c51a'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, y, 16, 0, 7); g.stroke(); }
      else if (sy === 'S') { g.fillStyle = '#1e52d6'; g.beginPath(); g.arc(w / 2, y, 18, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2 - 6, y - 4, 5, 0, 7); g.arc(w / 2 + 6, y - 4, 5, 0, 7); g.fill(); }
      else if (sy === 'B') { g.fillStyle = '#c91a09'; g.font = '900 34px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAR', w / 2, y); }
      else { g.fillStyle = sy === '7' ? '#c91a09' : '#1a8a2a'; g.font = '900 44px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sy, w / 2, y + 2); }
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, k * h / 5, w, 2);
    });
  }, true);
}
export function slotMachine(s = 1) {
  const root = new THREE.Group();
  root.add(part((L) => {
    L.boxB(0, 0, 0, 14, 4, 6, SN.purple);
    L.boxB(0, 4, 0, 13, 10, 5, 0xd8a020);
    L.boxB(0, 4, 2.55, 11, 7.6, 0.2, SN.black);
    L.boxB(0, 14, 0, 14, 1.4, 6, SN.purple);
    L.sphere(0, 15.4, 0, 2.2, 0xff2a2a, { sy: 0.7, matOpts: { emissive: 0xff2010, emissiveIntensity: 1.5 } });
    // lever
    L.cyl(7.2, 9, 0, 0.6, 1.2, SN.steel, { c: true, rz: Math.PI / 2 });
    L.cyl(7.9, 9, 0, 0.25, 6, 0xc0c4c8, { seg: 8 });
    L.sphere(7.9, 15.2, 0, 0.9, SN.red);
    for (let k = 0; k < 12; k++) L.sphere(-6.5 + k * 13 / 11, 13.6, 3.0, 0.3, k % 2 ? SN.gold : SN.white, { matOpts: { emissive: 0xffe080, emissiveIntensity: 1.2 } });
  }, 'slot'));
  const reels = [];
  for (let k = 0; k < 3; k++) {
    const t = reelTex().clone(); t.needsUpdate = true; t.repeat.set(1, 0.6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6.4), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, roughness: 0.4 }));
    m.position.set((k - 1) * 3.5, 7.8, 2.7); root.add(m); reels.push(t);
  }
  root.scale.setScalar(s); root.userData.reels = reels;
  return root;
}
// a flat sign with text (canvas) for neon signs
export function textSign(text, { w = 512, h = 128, bg = '#1a0a3a', fg = '#ff4aa8', glow = '#ff4aa8', font = '900 84px "Arial Black", Arial' } = {}) {
  return tex('txt' + text + bg + fg, w, h, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = glow; g.lineWidth = 8; g.strokeRect(8, 8, W - 16, H - 16);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = glow; g.shadowBlur = 18; g.fillStyle = fg; g.fillText(text, W / 2, H / 2 + 4);
  });
}
export function signPlane(group, t, x, y, z, ry, w, h, glow = 0.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: glow, roughness: 0.5, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
  return m;
}
// Eggman emblem (face in a circle) for the base
export function eggEmblem() {
  return tex('emblem', 256, 256, (g, w, h) => {
    g.fillStyle = '#c91a09'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
    g.fillStyle = '#1b1b22'; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.fill();
    g.fillStyle = '#f2c49a'; g.beginPath(); g.ellipse(128, 120, 70, 76, 0, 0, 7); g.fill();
    g.fillStyle = '#1b1b22'; g.fillRect(56, 76, 144, 16);
    g.fillStyle = '#9ad8ff'; g.beginPath(); g.arc(98, 84, 20, 0, 7); g.arc(158, 84, 20, 0, 7); g.fill();
    g.fillStyle = '#ff9a7a'; g.beginPath(); g.arc(128, 122, 16, 0, 7); g.fill();
    g.fillStyle = '#c86a1a'; g.beginPath(); g.moveTo(128, 136); g.bezierCurveTo(90, 124, 54, 140, 34, 176); g.bezierCurveTo(70, 160, 100, 162, 128, 156); g.bezierCurveTo(156, 162, 186, 160, 222, 176); g.bezierCurveTo(202, 140, 166, 124, 128, 136); g.fill();
  });
}
// the Death Egg: a huge battle station with Eggman's face, hung in the sky
export function deathEgg(R = 60) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), plastic(0xa8aeb6, { metal: 0.5, rough: 0.4 }));
  g.add(shell);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, R * 0.12, 32, 1, true), plastic(SN.dksteel, { metal: 0.5, rough: 0.4 }));
  band.position.y = -R * 0.1; g.add(band);
  const lowerBand = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9, R * 0.9, R * 0.06, 32, 1, true), neon(0xff3a2a, 1.2));
  lowerBand.position.y = -R * 0.45; g.add(lowerBand);
  const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.42, 32), new THREE.MeshStandardMaterial({ map: eggEmblem(), emissive: 0xffffff, emissiveMap: eggEmblem(), emissiveIntensity: 0.3 }));
  face.position.set(0, R * 0.3, R * 0.93); face.rotation.x = -0.3; g.add(face);
  const eye = new THREE.Mesh(new THREE.CircleGeometry(R * 0.12, 20), neon(0xff2a1a, 2.5));
  eye.position.set(R * 0.45, -R * 0.3, R * 0.83); eye.rotation.y = 0.5; g.add(eye);
  g.traverse((o) => { if (o.material) o.material.fog = false; });
  return g;
}
// the Tornado: Tails' red biplane
export function tornado(s = 1) {
  const root = new THREE.Group();
  root.add(part((L) => {
    L.box(0, 0, 0, 1.6, 1.6, 7, SN.red);
    L.box(0, 0.2, -4.2, 1.0, 1.2, 1.6, SN.red);
    L.box(0, 1.1, -4.6, 0.2, 1.8, 1.2, SN.red);
    L.box(0, 0.4, -4.6, 4.0, 0.15, 1.2, SN.red);
    for (const y of [-0.7, 1.3]) L.box(0, y, 1.0, 12, 0.25, 2.2, SN.red);
    for (const sd of [-1, 1]) L.box(sd * 4.5, 0.3, 1.0, 0.2, 2.0, 0.2, SN.white);
    L.box(0, 1.2, 0.0, 1.0, 0.6, 1.2, 0x9ad8ff, { matOpts: { trans: true, opacity: 0.6 } });
    L.sphere(0, 1.8, -1.2, 0.5, 0xf4a020);
    L.cyl(0, 0, 3.6, 0.8, 0.5, SN.dksteel, { c: true, rx: Math.PI / 2 });
    for (const sd of [-1, 1]) { L.box(sd * 0.9, -1.4, 1.6, 0.15, 1.4, 0.15, SN.dksteel); L.cyl(sd * 0.9, -2.2, 1.6, 0.45, 0.3, SN.black, { c: true, rz: Math.PI / 2 }); }
  }, 'tornado'));
  const prop = pivot(root, 0, 0, 3.95, part((L) => { L.box(0, 0, 0, 0.3, 4.2, 0.15, SN.dksteel); }, 'prop'));
  root.scale.setScalar(s); root.userData.prop = prop;
  return root;
}
// a chaos emerald on a stone pedestal
export function emerald(b, x, z, col) {
  b.cyl(x, 0, z, 1.6, 1.8, SN.dksteel, { seg: 8 });
  const m = plastic(col, { trans: true, opacity: 0.85, emissive: col, emissiveIntensity: 0.6 });
  b.add(geo('embot', () => new THREE.ConeGeometry(1.1, 0.8, 6).rotateX(Math.PI).translate(0, 0.4, 0)), m, x, 1.8, z);
  b.cone(x, 2.6, z, 1.1, 0.6, col, { seg: 6, mat: m });
}
