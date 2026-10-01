// Shared helpers for movie-character drivers (see ../driver.js for the rig contract).
// seatedFig() builds a seated minifig-style driver with separate torso, head and arm
// pivots; character files dress it up with hair, helmets, props and custom faces.
import * as THREE from 'three';
import { BrickBuilder, C, plastic, faceTexture } from '../lego.js';

export { THREE, BrickBuilder, C, plastic, faceTexture };

const geoCache = new Map();
export const cached = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
export function taperGeo(bw, tw, h, d, td = d) {
  return cached(`taper${bw},${tw},${h},${d},${td}`, () => {
    const g = new THREE.BoxGeometry(bw, h, d);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * (tw / bw)); p.setZ(i, p.getZ(i) * (td / d)); }
    g.computeVertexNormals();
    g.translate(0, h / 2, 0);
    return g;
  });
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)).clone();
}
// rotated box into a builder
export function rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts) { b.boxM(mat4(x, y, z, rx, ry, rz, sx, sy, sz), color, opts); }
// a rod (cylinder) between two points
export function rod(b, a, c, r, color, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...c);
  const dir = B.clone().sub(A), len = dir.length();
  const g = cached(`rod${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0));
  const m = new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), new THREE.Vector3(r, len, r));
  b.addMatrix(g, typeof color === 'number' ? plastic(color) : color, m);
}
export const glowMat = (c, k = 2) => plastic(c, { emissive: c, emissiveIntensity: k });

// A canvas face print for a cylinder head: draw(g, w, h) paints a 256x128 strip whose
// centre (x = 128) faces forward.
const faceCache = new Map();
export function faceMat(key, draw, skin = '#ffc917') {
  if (faceCache.has(key)) return faceCache.get(key);
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = skin; g.fillRect(0, 0, 256, 128);
  draw(g, 256, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 });
  faceCache.set(key, m);
  return m;
}
// classic minifig eyes + mouth on a face canvas
export function simpleFace(g, { eye = '#1b1b1b', mouth = 'smile', brows = false, y = 58 } = {}) {
  g.fillStyle = eye;
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(128 + s * 16, y, 5, 7, 0, 0, 7); g.fill(); }
  g.strokeStyle = eye; g.lineWidth = 4; g.lineCap = 'round';
  if (brows) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 8, y - 14); g.lineTo(128 + s * 24, y - 18 + (brows === 'angry' ? 8 : 0)); g.stroke(); }
  g.beginPath();
  if (mouth === 'smile') g.arc(128, y + 10, 16, 0.2, Math.PI - 0.2);
  else if (mouth === 'grin') { g.fillStyle = '#fff'; g.arc(128, y + 12, 15, 0, Math.PI); g.fill(); g.stroke(); }
  else if (mouth === 'flat') { g.moveTo(116, y + 22); g.lineTo(140, y + 22); }
  else if (mouth === 'smirk') { g.moveTo(116, y + 22); g.quadraticCurveTo(134, y + 26, 142, y + 16); }
  g.stroke();
}

// Seated minifig-style driver. Units are the seat frame (hips at the origin).
// o: { s, torso, legs, arms, hands, skin, face (material or faceTexture style), headR, headH,
//      noStud, wide, deep, torsoExtra(b, d), head(hb, d) (replaces the cylinder head),
//      headExtra(hb, d), arm(ab, side, d), name }
// Returns a rig: { root, torso, head, armL, armR, armLen, height, width, dims }
export function seatedFig(o = {}) {
  const s = o.s ?? 1.3, W = o.wide ?? 1, D = o.deep ?? 1;
  const root = new THREE.Group(); root.name = o.name || 'driver';
  const torso = new THREE.Group(); root.add(torso);
  const d = {
    s, W, D,
    hipY: 0, chestY: 0.18 * s, shoulderY: 0.92 * s, neckY: 1.0 * s,
    headR: (o.headR ?? 0.3) * s, headH: (o.headH ?? 0.5) * s,
    shoulderX: 0.43 * s * W, armLen: 0.66 * s,
  };
  const b = new BrickBuilder(1);
  const legs = o.legs ?? C.blue, skin = o.skin ?? C.fig;
  // hips + seated thighs (mostly hidden in the tub)
  b.box(0, -0.12 * s, 0, 0.9 * s * W, 0.3 * s, 0.46 * s * D, o.hips ?? legs);
  for (const sd of [-1, 1]) b.box(sd * 0.22 * s * W, -0.08 * s, 0.32 * s, 0.4 * s * W, 0.26 * s, 0.7 * s, legs);
  b.add(taperGeo(0.92 * W, 0.7 * W, 0.82, 0.46 * D, 0.42 * D), plastic(o.torso ?? C.red), 0, d.chestY, 0, 0, s, s, s);
  b.cyl(0, d.neckY - 0.06 * s, 0, 0.13 * s, 0.14 * s, o.neck ?? skin, { seg: 10 });
  o.torsoExtra?.(b, d);
  torso.add(b.build({ name: 'driver-torso' }));
  // head
  const head = new THREE.Group(); head.position.set(0, d.neckY + 0.02 * s, 0); torso.add(head);
  const hb = new BrickBuilder(1);
  if (o.head) o.head(hb, d);
  else {
    const fm = o.face?.isMaterial ? o.face : new THREE.MeshStandardMaterial({ map: faceTexture(o.face || 'smile', '#' + new THREE.Color(skin).getHexString()), roughness: 0.35 });
    const geo = cached('headcyl', () => new THREE.CylinderGeometry(1, 1, 1, 20).translate(0, 0.5, 0));
    // cylinder material groups: side (face print), top, bottom
    const hm = new THREE.Mesh(geo, [fm, plastic(skin), plastic(skin)]);
    hm.scale.set(d.headR, d.headH, d.headR); hm.rotation.y = Math.PI;
    head.add(hm);
    if (!o.noStud) hb.cyl(0, d.headH, 0, d.headR * 0.55, 0.1 * s, skin, { seg: 12 });
  }
  d.top = d.headH + (o.noStud ? 0 : 0.1 * s);
  o.headExtra?.(hb, d);
  head.add(hb.build({ name: 'driver-head' }));
  // arms (hang straight down at rotation 0)
  const arms = [];
  for (const sd of [1, -1]) {
    const pv = new THREE.Group(); pv.position.set(sd * d.shoulderX, d.shoulderY, 0);
    const ab = new BrickBuilder(1);
    ab.sphere(0, 0, 0, 0.13 * s * Math.sqrt(W), o.arms ?? o.torso ?? C.red);
    ab.add(taperGeo(0.22, 0.26, 0.5, 0.26), plastic(o.arms ?? o.torso ?? C.red), 0, -0.52 * s, 0, 0, s * Math.sqrt(W), s, s * Math.sqrt(W));
    ab.cyl(0, -0.68 * s, 0, 0.1 * s, 0.18 * s, o.hands ?? skin, { seg: 10 });
    o.arm?.(ab, sd, d);
    pv.add(ab.build({ name: 'driver-arm' }));
    torso.add(pv); arms.push(pv);
  }
  return { root, torso, head, armL: arms[0], armR: arms[1], armLen: d.armLen, height: d.neckY + 0.02 * s + d.top + (o.extraHeight || 0), width: 1.0 * s * W, dims: d };
}
