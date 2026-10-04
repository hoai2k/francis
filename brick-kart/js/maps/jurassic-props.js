// Jurassic Brick Park: brick-built dinosaurs, vehicles and set pieces.
// Creatures are rigs of small merged BrickBuilder meshes hung on pivot groups
// (legs, head, jaw, tail, neck, wings) so the map can animate them cheaply.
// Every model faces +Z with its feet on y = 0.
import { THREE, BrickBuilder, C, plastic, brickGeometry, canvasTexture } from './kit.js';

const Y = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const M2 = new THREE.Matrix4();
function compose(x, y, z, rx, ry, rz, sx, sy, sz) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); }
const GEO = {};
const geo = (k, f) => GEO[k] || (GEO[k] = f());

// A BrickBuilder seen through a local frame (position, yaw, scale), with
// centre-based rotatable primitives. Used for creatures and big set pieces.
export class Local {
  constructor(b, x = 0, y = 0, z = 0, yaw = 0, s = 1) {
    this.b = b;
    this.m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, yaw), new THREE.Vector3(s, s, s));
  }
  put(g, col, x, y, z, rx, ry, rz, sx, sy, sz, o) {
    M2.multiplyMatrices(this.m, compose(x, y, z, rx, ry, rz, sx, sy, sz));
    this.b.addMatrix(g, o?.mat || plastic(col, o?.matOpts), M2);
  }
  // centred box
  box(x, y, z, sx, sy, sz, col, o = {}) { this.put(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), col, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, sx, sy, sz, o); }
  // box standing on y
  boxB(x, y, z, sx, sy, sz, col, o = {}) { this.box(x, y + sy / 2, z, sx, sy, sz, col, o); return y + sy; }
  // cylinder standing on y (or centred at y with o.c)
  cyl(x, y, z, r, h, col, o = {}) {
    const seg = o.seg || 10;
    this.put(geo('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg)), col, x, o.c ? y : y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0, r, h, o.r2 || r, o);
    return y + h;
  }
  // wheel: cylinder whose axis is local X
  wheel(x, y, z, r, w, col = C.black, o = {}) { this.put(geo('wheel', () => new THREE.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2)), col, x, y, z, 0, o.ry || 0, 0, w, r, r, o); }
  cone(x, y, z, r, h, col, o = {}) {
    const seg = o.seg || 10;
    this.put(geo('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg)), col, x, o.c ? y : y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0, r, h, r, o);
    return y + h;
  }
  sphere(x, y, z, r, col, o = {}) { this.put(geo('sph', () => new THREE.SphereGeometry(1, 12, 8)), col, x, y, z, o.rx || 0, o.ry || 0, 0, r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1), o); }
  // real LEGO brick with studs (w x d studs, h plates), standing on y
  brick(x, y, z, w, d, h, col, o = {}) {
    const p = o.pitch || 1;
    this.put(brickGeometry(w, d, h, p, o.studs !== false, 8), col, x, y, z, 0, o.ry || 0, 0, 1, 1, 1, o);
    return y + h * 0.4 * p;
  }
}

export function part(fn, name = 'part', shadows = true) {
  const b = new BrickBuilder(1);
  fn(new Local(b));
  return b.build({ name, shadows });
}
function pivot(parent, x, y, z, child) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (child) g.add(child);
  parent.add(g);
  return g;
}
const tiltTeeth = (L, xs, y, z0, z1, step, s = 0.25, h = 0.55) => { for (let z = z0; z <= z1; z += step) for (const x of xs) L.box(x, y, z, s, h, s, C.white); };
// a merged part drawn through a uniformly scaled frame (detail ported from the driver rigs)
function partK(fn, name, k, shadows = true) {
  const b = new BrickBuilder(1);
  fn(new Local(b, 0, 0, 0, 0, k));
  return b.build({ name, shadows });
}
const glowO = (c, k = 1.6) => ({ matOpts: { emissive: c, emissiveIntensity: k } });
const smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
// a point on a box centred at (y, z), rotated rx = a, offset (ly, lz) in the box's own frame
const onBox = (y, z, a, ly, lz) => [y + ly * Math.cos(a) - lz * Math.sin(a), z + ly * Math.sin(a) + lz * Math.cos(a)];
// box tapering from bw (bottom) to tw (top) (and depth d to td), standing on y = 0
function taperGeo(bw, tw, h, d, td = d) {
  return geo(`taper${bw},${tw},${h},${d}` + (td !== d ? `,${td}` : ''), () => {
    const g = new THREE.BoxGeometry(bw, h, d), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * (tw / bw)); p.setZ(i, p.getZ(i) * (td / d)); }
    g.computeVertexNormals();
    return g.translate(0, h / 2, 0);
  });
}
function teethRow(L, xs, y, z0, z1, step, w, h, col = C.white) {
  for (let z = z0; z <= z1 + 1e-6; z += step) for (const x of xs) L.box(x, y, z, w, h, w, col);
}

// ---------------------------------------------------------------------------------
// Theropods: T. rex, Indominus rex, Spinosaurus (sail + croc snout)
// ---------------------------------------------------------------------------------
export function theropod(opts = {}) {
  const c = { body: 0x7a5a3c, dark: C.brown, belly: C.dktan, eye: 0xffb020, mouth: C.dkred, arm: 1, sail: null, sail2: null, spikes: null, croc: false, ...opts };
  const r = { root: new THREE.Group() };
  r.bodyP = pivot(r.root, 0, 0, 0);
  r.bodyP.add(part((L) => {
    L.box(0, 9, -1, 5, 5, 6, c.body);
    L.box(0, 9.6, 3.2, 5.4, 5.6, 5.5, c.body, { rx: 0.12 });
    L.box(0, 10, 6.4, 4.4, 5, 3, c.body, { rx: -0.2 });
    L.box(0, 7.1, 3, 4, 1.2, 7, c.belly, { rx: 0.1 });
    L.box(0, 11.6, 8.6, 3.2, 4.2, 3.2, c.body, { rx: 0.55 });
    L.box(0, 10.6, 9.9, 2.4, 2.6, 1.0, c.belly, { rx: 0.55 });
    for (const z of [-3, -1.2, 0.6, 2.4, 4.2]) for (const sd of [-1, 1]) L.box(sd * 2.74, 9.9, z, 0.12, 3.4, 0.6, c.dark);
    for (const z of [-2.5, 0.5]) L.brick(0, 11.5, z, 2, 2, 1, c.body);
    for (const sd of [-1, 1]) {
      L.box(sd * 1.9, 8.2 - (c.arm - 1) * 0.8, 8.6 + (c.arm - 1) * 0.4, 0.6, 2.4 * c.arm, 0.6, c.body, { rx: -0.7 });
      L.box(sd * 1.9, 7.3 - (c.arm - 1) * 1.8, 9.4 + (c.arm - 1) * 1.2, 0.5, 0.8, 0.5, c.dark, { rx: -1.2 });
    }
    if (c.sail) for (let k = 0; k < 10; k++) {
      const z = -4.5 + k * 1.25, h = 7.5 * Math.sin((k + 0.5) / 10 * Math.PI) + 1.2;
      L.box(0, 11.6 + h / 2, z, 0.35, h, 1.26, k % 2 ? c.sail : c.sail2);
      L.box(0, 11.6 + h / 2, z + 0.62, 0.45, h + 0.3, 0.18, c.dark);
    }
    if (c.spikes) for (let z = -4; z <= 7; z += 1.4) L.box(0, 12.3 - (z > 5 ? 0 : 0), z, 0.7, 1.1, 0.7, c.spikes, { rx: -0.6 });
  }, 'theropod-body'));
  // head + jaw
  r.head = pivot(r.bodyP, 0, 12.9, 9.9);
  r.head.add(part((L) => {
    if (c.croc) {
      L.box(0, 0.6, 2, 2.6, 2.4, 4, c.body);
      L.box(0, 0.15, 6, 1.7, 1.3, 5, c.body);
      L.box(0, 0.9, 7.8, 1.2, 0.6, 0.8, c.dark);
      tiltTeeth(L, [-0.75, 0.75], -0.6, 3.8, 8.2, 0.6, 0.2, 0.45);
      L.box(0, -0.45, 4.5, 1.4, 0.25, 7, c.mouth);
    } else {
      L.box(0, 0.8, 2.3, 3.4, 2.8, 5, c.body);
      L.box(0, 0.35, 5.4, 2.8, 1.9, 2.4, c.body);
      for (const sd of [-1, 1]) L.box(sd * 0.7, 1.35, 6.4, 0.4, 0.2, 0.4, C.black);
      tiltTeeth(L, [-1.25, 1.25], -0.75, 2.6, 6.2, 0.7);
      for (const x of [-0.8, 0, 0.8]) L.box(x, -0.75, 6.45, 0.25, 0.55, 0.25, C.white);
      L.box(0, -0.5, 3.8, 2.6, 0.3, 5.2, c.mouth);
    }
    const w = c.croc ? 1.32 : 1.72;
    for (const sd of [-1, 1]) {
      L.box(sd * w, 1.5, 2.2, 0.1, 0.6, 0.7, c.eye);
      L.box(sd * (w + 0.06), 1.5, 2.3, 0.08, 0.42, 0.25, C.black);
      L.box(sd * (w - 0.4), 2.25, 2.2, 0.9, 0.5, 1.8, c.dark);
      if (c.spikes) for (const z of [0.6, 1.6, 3]) L.box(sd * (w - 0.5), 2.5, z, 0.45, 0.6, 0.45, c.spikes);
    }
  }, 'theropod-head'));
  r.jaw = pivot(r.head, 0, -0.6, 0.8);
  r.jaw.add(part((L) => {
    if (c.croc) {
      L.box(0, -0.45, 3.4, 1.5, 0.9, 7.6, c.body);
      L.box(0, -0.15, 3.4, 1.1, 0.2, 7, 0xd04a4a);
      tiltTeeth(L, [-0.6, 0.6], 0.15, 1.8, 6.8, 0.7, 0.18, 0.4);
    } else {
      L.box(0, -0.55, 2.6, 2.9, 1.1, 5.4, c.body);
      L.box(0, -1.05, 2.4, 2.6, 0.2, 4.8, c.belly);
      L.box(0, 0, 2.4, 1.8, 0.2, 3.6, 0xd04a4a);
      tiltTeeth(L, [-1.15, 1.15], 0.2, 1.4, 4.8, 0.7, 0.22, 0.45);
    }
  }, 'theropod-jaw'));
  // tail
  r.tail1 = pivot(r.bodyP, 0, 9.6, -3.8);
  r.tail1.add(part((L) => {
    L.box(0, 0, -3, 4.2, 4.2, 6.2, c.body);
    for (const sd of [-1, 1]) for (const z of [-1.5, -3.5]) L.box(sd * 2.12, 0, z, 0.1, 2.8, 0.5, c.dark);
    L.brick(0, 2.1, -3, 2, 2, 1, c.body);
    if (c.spikes) for (let z = -1; z > -6; z -= 1.5) L.box(0, 2.3, z, 0.6, 0.9, 0.6, c.spikes, { rx: -0.6 });
    if (c.sail) L.box(0, 2.6, -1.5, 0.3, 1.2, 3, c.sail2);
  }, 'theropod-tail1'));
  r.tail2 = pivot(r.tail1, 0, 0.3, -6);
  r.tail2.add(part((L) => {
    L.box(0, 0, -3.2, 2.9, 2.8, 6.5, c.body);
    L.box(0, 0.15, -8.4, 1.7, 1.6, 4.5, c.body);
    L.box(0, 0.25, -11.6, 0.8, 0.8, 2.4, c.body);
    for (const sd of [-1, 1]) L.box(sd * 1.46, 0, -3, 0.1, 1.8, 0.5, c.dark);
  }, 'theropod-tail2'));
  // legs
  const leg = part((L) => {
    L.box(0, -1.6, 0.6, 2.2, 5.2, 4.2, c.body, { rx: 0.1 });
    L.box(0, -5.6, -0.4, 1.5, 3.8, 1.8, c.body, { rx: 0.35 });
    L.box(0, -7.9, 0.2, 1.3, 2.2, 1.3, c.body, { rx: -0.25 });
    L.box(0, -8.75, 1.3, 2.3, 0.7, 3.2, c.body);
    for (const x of [-0.75, 0, 0.75]) L.box(x, -8.75, 3.1, 0.45, 0.5, 0.8, C.black);
  }, 'theropod-leg');
  r.legL = pivot(r.root, 2.9, 9.1, -1, leg);
  r.legR = pivot(r.root, -2.9, 9.1, -1, leg.clone());
  return r;
}
// walking / roaring poses for theropod rigs
export function theroWalk(r, ph, amp = 0.45) {
  r.legL.rotation.x = Math.sin(ph) * amp;
  r.legR.rotation.x = -Math.sin(ph) * amp;
  r.bodyP.position.y = Math.abs(Math.cos(ph)) * 0.5 * amp;
  r.bodyP.rotation.z = Math.sin(ph) * 0.04 * amp;
  r.tail1.rotation.y = Math.sin(ph * 0.5) * 0.18;
  r.tail2.rotation.y = Math.sin(ph * 0.5 - 0.8) * 0.25;
}
export function theroIdle(r, t, roar = 0) {
  r.legL.rotation.x *= 0.9; r.legR.rotation.x *= 0.9;
  r.bodyP.position.y = Math.sin(t * 1.3) * 0.15;
  r.head.rotation.x = -0.45 * roar + Math.sin(t * 0.9) * 0.05;
  r.head.rotation.y = Math.sin(t * 0.6) * 0.3 * (1 - roar);
  r.jaw.rotation.x = 0.08 + roar * (0.62 + Math.sin(t * 40) * 0.05);
  r.tail1.rotation.y = Math.sin(t * 0.8) * 0.12;
  r.tail2.rotation.y = Math.sin(t * 0.8 - 0.6) * 0.18;
  r.tail1.rotation.x = roar * 0.12;
}

// T. rex (Rexy): a big wide skull with heavy overhanging brows and horn bosses, deep-set
// glowing golden eyes and a deep ragged-toothed jaw; darker brown/khaki hide with tiger
// stripes and old raptor scars, huge drumstick thighs, tiny two-fingered arms and a thick
// banded tail. Same rig and pivots as theropod() (works with theroWalk / theroIdle).
export const REXY = {
  body: 0x6e543a, back: 0x3c2c1e, dark: 0x2a1e14, belly: 0xb49a72, belly2: 0x8e7656, scar: 0xd8bca4,
  brow: 0x54402c, eye: 0xffb020, mouth: 0x5a1210, tooth: 0xf2e8cc,
};
const REX_HK = 4.2;   // head detail scale (driver units -> map units)
export function trex(opts = {}) {
  const c = { ...REXY, ...opts };
  const r = { root: new THREE.Group() };
  r.bodyP = pivot(r.root, 0, 0, 0);
  r.bodyP.add(part((L) => {
    // barrel body, deep chest and a thick S-necked shoulder line: [y, z, w, h, d, rx]
    const segs = [[9.2, -1.3, 5.6, 5.4, 6.6, 0], [9.75, 3.0, 5.9, 5.9, 5.2, 0.12], [10.5, 6.2, 4.9, 5.0, 3.4, -0.2], [11.7, 8.4, 3.9, 4.4, 3.6, 0.55], [12.5, 9.4, 3.4, 3.2, 2.4, 0.3]];
    segs.forEach(([y, z, w, h, d, a], i) => {
      L.box(0, y, z, w, h, d, c.body, { rx: a });
      // khaki belly / throat with scale lines underneath
      const [by, bz] = onBox(y, z, a, -h / 2, 0);
      L.box(0, by, bz, w * 0.74, 0.12, d * 0.92, c.belly, { rx: a });
      if (i < 3) for (const f of [-0.3, 0, 0.3]) { const [sy, sz] = onBox(y, z, a, -h / 2 - 0.07, d * f); L.box(0, sy, sz, w * 0.68, 0.04, 0.14, c.belly2, { rx: a }); }
      // the dark back: a saddle down the spine with twin scute rows
      const [ty, tz] = onBox(y, z, a, h / 2, 0);
      L.box(0, ty, tz, w * 0.42, 0.1, d * 0.96, c.back, { rx: a });
      for (let f = -0.35; f <= 0.36; f += 0.35) for (const sd of [-1, 1]) { const [sy, sz] = onBox(y, z, a, h / 2 + 0.12, d * f); L.box(sd * 0.42, sy, sz, 0.42, 0.3, 0.42, c.dark, { rx: a }); }
      // tiger stripes wrapping down the flanks from the saddle
      if (i < 4) for (const f of (i === 0 ? [-0.36, -0.08, 0.2] : i === 1 ? [-0.3, 0.05, 0.36] : [-0.15, 0.25])) {
        const len = h * (i < 2 ? 0.62 : 0.5);
        const [sy, sz] = onBox(y, z, a, h / 2 - len / 2, d * f);
        for (const sd of [-1, 1]) L.box(sd * (w / 2 + 0.03), sy, sz, 0.08, len, 0.42, c.back, { rx: a - 0.42 });
        const [cy, cz] = onBox(y, z, a, h / 2 + 0.03, d * f);
        L.box(0, cy, cz, w * 0.98, 0.08, 0.42, c.back, { rx: a });
      }
    });
    // old raptor claw scars down the left of the neck and across the right flank
    for (let i = 0; i < 3; i++) L.box(1.99, 11.0 + i * 0.36, 7.9 + i * 0.12, 0.06, 0.12, 1.5, c.scar, { rx: 0.7 });
    for (let i = 0; i < 2; i++) L.box(-2.84, 8.5 + i * 0.42, 0.4, 0.06, 0.12, 1.8, c.scar, { rx: -0.3 });
    // tiny two-fingered arms tucked at the chest
    for (const sd of [-1, 1]) {
      L.box(sd * 1.95, 8.55, 7.4, 0.72, 1.4, 0.72, c.body, { rx: -0.55 });
      L.box(sd * 2.13, 8.7, 7.3, 0.36, 0.9, 0.78, c.back, { rx: -0.55 });
      L.box(sd * 1.95, 7.7, 8.0, 0.58, 0.9, 0.6, c.body, { rx: -1.15 });
      for (const x of [-0.16, 0.16]) {
        L.box(sd * 1.95 + x, 7.45, 8.5, 0.2, 0.55, 0.2, c.body, { rx: -1.5 });
        L.box(sd * 1.95 + x, 7.2, 8.8, 0.16, 0.3, 0.16, c.dark, { rx: -2.0 });
      }
    }
  }, 'trex-body'));

  // head + jaw: the driver's skull, scaled up
  r.head = pivot(r.bodyP, 0, 12.9, 9.9);
  const hw = (z) => 0.4 - 0.13 * Math.max(0, Math.min(1, (z - 0.05) / 1.05));
  r.head.add(partK((L) => {
    L.box(0, 0.16, -0.08, 0.86, 0.62, 0.42, c.body);
    L.box(0, 0.2, 0.3, 0.76, 0.58, 0.5, c.body);
    L.box(0, 0.13, 0.74, 0.62, 0.44, 0.5, c.body);
    L.box(0, 0.09, 1.06, 0.52, 0.34, 0.22, c.body);
    L.box(0, 0.06, 1.18, 0.42, 0.26, 0.06, c.body);
    L.box(0, -0.075, 0.6, 0.6, 0.02, 1.08, c.mouth);
    // rugose top of the skull and snout, dark crown stripes
    L.box(0, 0.37, 0.8, 0.4, 0.05, 0.42, c.brow);
    for (const z of [0.6, 0.78, 0.96]) L.box(0, 0.4, z, 0.14, 0.04, 0.08, c.brow);
    for (const z of [-0.18, 0.0, 0.18]) L.box(0, 0.495, z, 0.5, 0.02, 0.08, c.back);
    L.box(0, 0.48, -0.08, 0.3, 0.02, 0.4, c.back);
    for (const sd of [-1, 1]) {
      // heavy brow ridge with a horn boss behind it, over a deep-set glowing golden eye
      L.box(sd * 0.31, 0.5, 0.26, 0.26, 0.14, 0.46, c.brow, { rz: -sd * 0.3 });
      L.box(sd * 0.35, 0.44, 0.47, 0.12, 0.1, 0.1, c.brow, { rz: -sd * 0.3 });
      L.box(sd * 0.34, 0.5, 0.03, 0.14, 0.12, 0.16, c.brow);
      L.box(sd * 0.382, 0.31, 0.24, 0.02, 0.2, 0.3, c.dark);
      L.box(sd * 0.39, 0.32, 0.25, 0.02, 0.12, 0.15, c.eye, glowO(c.eye, 0.9));
      L.box(sd * 0.398, 0.32, 0.26, 0.015, 0.11, 0.035, C.black);
      L.box(sd * 0.399, 0.35, 0.22, 0.012, 0.03, 0.025, C.white);
      // cheek bulge, nostril, lip line and the dark side stripes of the face
      L.box(sd * 0.4, 0.1, -0.06, 0.06, 0.34, 0.3, c.body);
      L.box(sd * 0.13, 0.262, 1.1, 0.07, 0.01, 0.06, c.dark);
      L.box(sd * 0.22, 0.27, 1.06, 0.06, 0.03, 0.08, c.brow);
      for (const [z0, z1] of [[0.06, 0.55], [0.5, 0.99], [0.95, 1.17]]) L.box(sd * hw((z0 + z1) / 2) * 0.98, -0.04, (z0 + z1) / 2, 0.02, 0.04, z1 - z0, c.dark);
      for (const [y, z] of [[0.4, -0.2], [0.3, -0.25], [0.28, 0.5]]) L.box(sd * (y > 0.3 ? 0.432 : 0.382), y - 0.1, z, 0.02, 0.18, 0.06, c.back, { rx: -0.3 });
      // upper teeth: a ragged row hanging outside the lower jaw, longest mid-row
      for (let z = 0.12, i = 0; z <= 1.06; z += 0.085, i++) {
        const h = 0.1 + 0.06 * Math.sin(Math.min(1, z / 1.06) * Math.PI);
        L.box(sd * (hw(z) - 0.035), -0.08 - h / 2, z, 0.055, h, 0.055, c.tooth, { rx: (i % 2 ? 0.1 : -0.12) });
      }
    }
    for (const x of [-0.13, -0.045, 0.045, 0.13]) L.box(x, -0.13, 1.12, 0.05, 0.1, 0.05, c.tooth);
    // a scar across the right cheek
    L.box(-0.404, 0.12, 0.42, 0.015, 0.03, 0.34, c.scar, { rx: 0.45 });
    L.box(-0.344, 0.2, 0.78, 0.015, 0.03, 0.2, c.scar, { rx: -0.3 });
  }, 'trex-head', REX_HK));
  // the deep lower jaw (narrower than the upper teeth row, so those overlap it)
  r.jaw = pivot(r.head, 0, -0.08 * REX_HK, -0.12 * REX_HK, partK((L) => {
    L.box(0, -0.17, 0.12, 0.74, 0.34, 0.5, c.body);
    L.box(0, -0.15, 0.6, 0.58, 0.3, 0.52, c.body);
    L.box(0, -0.13, 1.02, 0.44, 0.26, 0.36, c.body);
    L.box(0, -0.3, 0.6, 0.5, 0.05, 1.2, c.belly);
    L.box(0, -0.29, 0.12, 0.6, 0.06, 0.48, c.belly);
    L.box(0, 0.004, 0.62, 0.36, 0.02, 1.0, c.mouth);
    L.box(0, 0.012, 0.56, 0.24, 0.02, 0.78, 0xb84a48);
    for (const sd of [-1, 1]) {
      for (let z = 0.3, i = 0; z <= 1.12; z += 0.09, i++) {
        const x = (z < 0.85 ? 0.29 - (z - 0.3) * 0.12 : 0.2) - 0.03, h = 0.08 + 0.04 * Math.sin(z * 2.8);
        L.box(sd * x, h / 2, z, 0.05, h, 0.05, c.tooth, { rx: (i % 2 ? 0.12 : -0.1) });
      }
      L.box(sd * 0.371, -0.12, 0.12, 0.02, 0.04, 0.46, c.dark);
    }
  }, 'trex-jaw', REX_HK));

  // thick banded tail: [y, z, w, h, d] per segment, dark bands over the top and flanks,
  // scute pairs along the top and a khaki underside
  const tailSeg = (L, segs) => segs.forEach(([y, z, w, h, d]) => {
    L.box(0, y, z, w, h, d, c.body);
    L.box(0, y - h / 2, z, w * 0.62, 0.1, d * 0.92, c.belly);
    for (const f of [-0.3, 0.1]) L.box(0, y + h * 0.16, z + f * d, w * 1.04, h * 0.72, d * 0.14, c.back);
    L.box(0, y + h / 2, z, w * 0.36, 0.08, d * 0.95, c.back);
    if (w > 1.5) for (const f of [-0.2, 0.25]) for (const sd of [-1, 1]) L.box(sd * w * 0.12, y + h / 2 + 0.12, z + f * d, w * 0.12, 0.26, w * 0.12, c.dark);
  });
  r.tail1 = pivot(r.bodyP, 0, 9.6, -3.8, part((L) => tailSeg(L, [[0, -3.1, 4.7, 4.5, 6.4]]), 'trex-tail1'));
  r.tail2 = pivot(r.tail1, 0, 0.3, -6, part((L) => tailSeg(L, [[0, -3.2, 3.2, 3.0, 6.5], [0.15, -8.4, 2.0, 1.8, 4.5], [0.25, -11.6, 0.95, 0.9, 2.4]]), 'trex-tail2'));

  // legs: huge drumstick thighs with stripes, scaly shins, three big clawed toes
  const leg = part((L) => {
    L.box(0, 0.4, -0.2, 2.7, 3.2, 4.6, c.body);
    L.box(0, -1.9, 0.5, 2.9, 5.4, 4.9, c.body, { rx: 0.1 });
    for (const sd of [-1, 1]) for (const [y, z] of [[-0.2, -1.4], [-0.5, 0.2], [-0.9, 1.8]]) L.box(sd * 1.48, y, z, 0.08, 3.2, 0.55, c.back, { rx: -0.3 });
    L.box(0, -5.6, -0.4, 1.7, 3.8, 1.9, c.body, { rx: 0.35 });
    L.box(0, -5.4, 0.45, 1.3, 2.8, 0.1, c.belly2, { rx: 0.35 });
    L.box(0, -7.9, 0.2, 1.4, 2.2, 1.4, c.body, { rx: -0.25 });
    L.box(0, -8.75, 1.4, 2.5, 0.7, 3.4, c.body);
    for (const x of [-0.8, 0, 0.8]) {
      L.box(x, -8.7, 3.1, 0.7, 0.6, 0.6, c.body);
      L.box(x, -8.8, 3.55, 0.45, 0.5, 0.6, c.tooth, { rx: 0.3 });
    }
  }, 'trex-leg');
  r.legL = pivot(r.root, 2.95, 9.1, -1, leg);
  r.legR = pivot(r.root, -2.95, 9.1, -1, leg.clone());
  return r;
}

// a sub-frame of a Local: offset to (x, y, z), pitched rx, uniformly scaled k (for limbs
// ported from the driver rigs at map scale)
function subFrame(L, x, y, z, rx, k) {
  const F = new Local(L.b);
  F.m.multiplyMatrices(L.m, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rx), new THREE.Vector3(k, k, k)));
  return F;
}
// a two-part arm hanging from a shoulder at (x, y, z): upper(U) is drawn pitched a1, then
// lower(F, o) from the elbow (split units down the upper arm) pitched a2; o shifts the
// lower part's driver coordinates so they start at the elbow
function bentArm(L, x, y, z, a1, a2, k, split, upper, lower) {
  upper(subFrame(L, x, y, z, a1, k));
  lower(subFrame(L, x, y - k * split * Math.cos(a1), z - k * split * Math.sin(a1), a2, k), split);
}
// a thin extruded panel in the Y-Z plane from an outline of [z, y] points (curves: [z, y, cz, cy])
function sailPanel(key, pts, th) {
  return geo('sail:' + key, () => {
    const sh = new THREE.Shape();
    pts.forEach((p, i) => {
      if (i === 0) sh.moveTo(-p[0], p[1]);
      else if (p.length > 2) sh.quadraticCurveTo(-p[2], p[3], -p[0], p[1]);
      else sh.lineTo(-p[0], p[1]);
    });
    const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false, curveSegments: 5 }).translate(0, 0, -th / 2).rotateY(Math.PI / 2);
    g.setIndex([...Array(g.attributes.position.count).keys()]);   // indexed like the box parts it merges with
    return g;
  });
}

// Spinosaurus (JP3), after the driver: a long low crocodile snout with a notched rosette tip,
// interlocking conical teeth, a nasal bump and golden slit eyes; a huge scalloped rust-orange
// sail (dark-red stripes, lighter bands, dark spines past the rim) rooted along the back and
// tallest over the shoulders, a low red fin down the tail, a dark grey-brown hide with a pale
// belly and blotches, and long arms with big hook claws. Same rig and pivots as theropod().
export const SPINO = {
  body: 0x564e3e, back: 0x353026, dark: 0x241f19, belly: 0xb9a886, belly2: 0x958468,
  sail: 0xc9521c, sailHi: 0xe27a34, sailDk: 0x8a2c14, stripe: 0x6e2212, spine: 0x2c1a12,
  eye: 0xffb020, mouth: 0x5a1210, tooth: 0xf2ead2, claw: 0xe2d6b8,
};
const SPINO_HK = 5.0, SPINO_AK = 4.6;   // head / arm detail scale (driver units -> map units)
export function spinosaurus(opts = {}) {
  const c = { ...SPINO, ...opts };
  const r = { root: new THREE.Group() };
  r.bodyP = pivot(r.root, 0, 0, 0);
  // the sail's spines, rooted along the back from the hips to the shoulders ([z, y] base line),
  // leaning back over the hips and upright at the front, tallest over the shoulders
  const base = [[-4.4, 11.3], [-1.5, 11.45], [1.6, 11.95], [4.6, 12.35], [7.0, 12.75]];
  const LENS = [3.0, 5.0, 6.6, 7.8, 8.7, 9.3, 9.7, 9.9, 9.6, 8.5, 6.4, 3.2], N = LENS.length, spines = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), u = t * (base.length - 1), j = Math.min(base.length - 2, Math.floor(u)), f = u - j;
    const bz = base[j][0] + (base[j + 1][0] - base[j][0]) * f, by = base[j][1] + (base[j + 1][1] - base[j][1]) * f;
    const th = 0.4 - 0.46 * t;
    spines.push({ bz, by, th, len: LENS[i], dz: -Math.sin(th), dy: Math.cos(th) });
  }
  const at = (s, rr) => [s.bz + s.dz * rr, s.by + s.dy * rr];
  const outline = (rf, scallop) => {
    const pts = spines.map((s) => [s.bz, s.by - 0.3]);
    for (let i = N - 1; i >= 0; i--) {
      const s = spines[i], p = at(s, s.len * rf);
      if (i === N - 1 || !scallop) { pts.push(p); continue; }
      const q = spines[i + 1], pq = at(q, q.len * rf);
      const mz = (p[0] + pq[0]) / 2, my = (p[1] + pq[1]) / 2, mr = (s.len + q.len) / 2 * scallop;
      pts.push([p[0], p[1], mz - (s.dz + q.dz) / 2 * mr, my - (s.dy + q.dy) / 2 * mr]);
    }
    return pts;
  };
  r.bodyP.add(part((L) => {
    // a leaner barrel body, deep chest and S-curved neck up to the head pivot: [y, z, w, h, d, rx]
    const segs = [[9.3, -1.4, 4.6, 4.8, 6.6, 0], [9.8, 2.9, 4.8, 5.2, 5.2, 0.12], [10.5, 6.1, 4.0, 4.4, 3.4, -0.2], [11.7, 8.3, 3.0, 3.8, 3.6, 0.55], [12.5, 9.4, 2.6, 2.8, 2.4, 0.3]];
    const SPOTS = [[0.15, -0.32, 0.55], [-0.12, -0.05, 0.42], [0.22, 0.22, 0.36], [-0.3, 0.36, 0.3]];
    segs.forEach(([y, z, w, h, d, a], i) => {
      L.box(0, y, z, w, h, d, c.body, { rx: a });
      // pale belly and throat with scale lines
      const [by, bz] = onBox(y, z, a, -h / 2, 0);
      L.box(0, by, bz, w * 0.76, 0.12, d * 0.92, c.belly, { rx: a });
      if (i < 4) for (const f of [-0.3, 0, 0.3]) { const [sy, sz] = onBox(y, z, a, -h / 2 - 0.07, d * f); L.box(0, sy, sz, w * 0.7, 0.04, 0.14, c.belly2, { rx: a }); }
      // dark back, flank bands sweeping down from it and dark mottled blotches
      const [ty, tz] = onBox(y, z, a, h / 2, 0);
      L.box(0, ty, tz, w * 0.56, 0.1, d * 0.98, c.back, { rx: a });
      if (i < 3) for (const f of [-0.32, 0.02, 0.34]) {
        const len = h * 0.5, [sy, sz] = onBox(y, z, a, h / 2 - len / 2, d * f);
        for (const sd of [-1, 1]) L.box(sd * (w / 2 + 0.03), sy, sz, 0.08, len, 0.5, c.back, { rx: a - 0.45 });
      }
      if (i < 4) for (const [ly, lz, s] of SPOTS.slice(0, i < 3 ? 4 : 2)) {
        const [sy, sz] = onBox(y, z, a, h * ly, d * lz);
        for (const sd of [-1, 1]) L.box(sd * (w / 2 + 0.04), sy, sz, 0.06, s * h * 0.22, s * h * 0.3, c.dark, { rx: a + sd * 0.4 });
      }
    });
    // long arms with three big hooked claws, the thumb claw biggest
    for (const sd of [-1, 1]) bentArm(L, sd * 2.0, 9.9, 7.2, -0.3, -0.95, SPINO_AK, 0.42, (U) => {
      U.box(0, -0.2, 0, 0.22, 0.48, 0.22, c.body);
      U.box(sd * 0.06, -0.14, 0, 0.1, 0.3, 0.23, c.back);
    }, (F, o) => {
      F.box(0, -0.52 + o, 0.02, 0.18, 0.34, 0.18, c.body);
      F.box(0, -0.52 + o, 0.1, 0.12, 0.28, 0.02, c.belly);
      F.box(0, -0.72 + o, 0.04, 0.2, 0.12, 0.2, c.body);
      for (const [x, s] of [[-sd * 0.07, 1.25], [0.0, 1], [sd * 0.07, 1]]) {
        F.box(x, -0.82 + o, 0.08, 0.05 * s, 0.12 * s, 0.05 * s, c.claw, { rx: -0.3 });
        F.box(x, -0.9 - 0.03 * s + o, 0.15, 0.04 * s, 0.1 * s, 0.04 * s, c.claw, { rx: -1.0 });
      }
    });
    // the sail: dark rust base, orange skin with a scalloped rim, dark-red stripes along each
    // spine, lighter bands of skin between them and the dark spines running past the rim
    const T = 0.34;
    L.put(sailPanel('spino-map-sail', outline(0.93, 0.2), T), c.sail, 0, 0, 0, 0, 0, 0, 1, 1, 1);
    L.put(sailPanel('spino-map-sail-in', outline(0.4, 0), T + 0.1), c.sailDk, 0, 0, 0, 0, 0, 0, 1, 1, 1);
    spines.forEach((s, i) => {
      const ray = (r0, r1, w, th, col) => { const [zz, yy] = at(s, (r0 + r1) / 2); L.box(0, yy, zz, th, r1 - r0, w, col, { rx: -s.th }); };
      ray(s.len * 0.32, s.len * 0.9, 0.62, T + 0.06, c.stripe);
      ray(0, s.len + 0.45, 0.26, T + 0.12, c.spine);
      if (i < N - 1) {
        const q = spines[i + 1], mz = (s.bz + q.bz) / 2, my = (s.by + q.by) / 2, mt = (s.th + q.th) / 2, ml = (s.len + q.len) / 2 * 0.62;
        L.box(0, my + Math.cos(mt) * ml, mz - Math.sin(mt) * ml, T + 0.04, ml * 0.42, 0.32, c.sailHi, { rx: -mt });
      }
      // a ridge of dark scutes where the sail meets the back
      L.box(0, s.by, s.bz + 0.1, 0.7, 0.5, 0.7, c.back, { rx: -s.th });
    });
  }, 'spino-body'));

  // head + jaw: the driver's croc skull, scaled up
  r.head = pivot(r.bodyP, 0, 12.9, 9.9);
  r.head.add(partK((L) => {
    L.box(0, 0.16, -0.04, 0.56, 0.5, 0.46, c.body);
    L.box(0, 0.12, 0.34, 0.44, 0.38, 0.42, c.body);
    L.put(taperGeo(0.4, 0.26, 0.72, 0.3, 0.2), c.body, 0, 0.08, 0.5, Math.PI / 2, 0, 0, 1, 1, 1);
    L.box(0, 0.08, 1.28, 0.32, 0.24, 0.24, c.body);
    L.box(0, 0.205, 1.28, 0.24, 0.02, 0.18, c.back);
    // the notch behind the rosette
    for (const sd of [-1, 1]) L.box(sd * 0.135, -0.03, 1.13, 0.04, 0.08, 0.08, c.mouth);
    // top of the skull and snout: dark stripe, nasal bump in front of the eyes, nostrils far back
    L.box(0, 0.42, -0.04, 0.3, 0.03, 0.42, c.back);
    L.box(0, 0.33, 0.42, 0.18, 0.08, 0.4, c.back);
    L.box(0, 0.33, 0.7, 0.13, 0.14, 0.18, c.body, { rx: 0.5 });
    L.box(0, 0.36, 0.64, 0.1, 0.1, 0.14, c.back, { rx: 0.5 });
    L.box(0, 0.24, 0.9, 0.08, 0.03, 0.42, c.back);
    for (const sd of [-1, 1]) L.box(sd * 0.07, 0.235, 0.84, 0.05, 0.02, 0.08, c.dark);
    L.box(0, -0.06, 0.62, 0.3, 0.02, 1.3, c.mouth);
    for (const sd of [-1, 1]) {
      // brow ridge over a high golden eye with a slit pupil
      L.box(sd * 0.25, 0.43, 0.08, 0.14, 0.1, 0.3, c.back, { rz: -sd * 0.3 });
      L.box(sd * 0.282, 0.3, 0.06, 0.02, 0.16, 0.22, c.dark);
      L.box(sd * 0.29, 0.31, 0.07, 0.02, 0.1, 0.13, c.eye, glowO(c.eye, 0.6));
      L.box(sd * 0.298, 0.31, 0.08, 0.015, 0.09, 0.03, C.black);
      L.box(sd * 0.299, 0.335, 0.045, 0.012, 0.025, 0.02, C.white);
      // dark lip line and face stripes
      L.box(sd * 0.25, 0.0, 0.2, 0.06, 0.04, 0.5, c.dark);
      for (const [y, z] of [[0.18, -0.18], [0.26, -0.24]]) L.box(sd * 0.282, y, z, 0.02, 0.14, 0.05, c.back, { rx: -0.3 });
      // interlocking conical teeth hanging outside the lower jaw, big fangs in the rosette
      for (let z = 0.2, n = 0; z <= 1.02; z += 0.085, n++) {
        const x = 0.2 - (z - 0.2) * 0.075, h = 0.09 + 0.03 * (n % 2);
        L.cone(sd * x, -0.07, z, 0.024, h, c.tooth, { c: true, rx: Math.PI, seg: 5 });
      }
      for (const [z, h] of [[1.2, 0.15], [1.3, 0.12], [1.38, 0.09]]) L.cone(sd * 0.14, -0.06, z, 0.03, h, c.tooth, { c: true, rx: Math.PI, seg: 5 });
    }
  }, 'spino-head', SPINO_HK));
  r.jaw = pivot(r.head, 0, -0.06 * SPINO_HK, -0.08 * SPINO_HK, partK((L) => {
    L.box(0, -0.08, 0.26, 0.46, 0.2, 0.5, c.body);
    L.box(0, -0.07, 0.78, 0.28, 0.15, 0.6, c.body);
    L.box(0, -0.065, 1.32, 0.3, 0.15, 0.24, c.body);
    L.box(0, -0.16, 0.6, 0.26, 0.04, 1.3, c.belly);
    L.box(0, 0.005, 0.7, 0.2, 0.02, 1.1, 0xb84a48);
    for (const sd of [-1, 1]) {
      for (let z = 0.36, n = 0; z <= 1.1; z += 0.085, n++) L.cone(sd * 0.11, 0.0, z, 0.022, 0.08 + 0.02 * (n % 2), c.tooth, { seg: 5 });
      for (const z of [1.26, 1.36]) L.cone(sd * 0.12, 0.0, z, 0.026, 0.12, c.tooth, { seg: 5 });
    }
  }, 'spino-jaw', SPINO_HK));

  // tail: dark back and flank bands, pale underside, blotches and a low red fin with dark-red
  // stripes and a dark spiny rim running on from the sail: [y, z, w, h, d, fin height front, back]
  const tailSeg = (L, segs) => segs.forEach(([y, z, w, h, d, f0, f1]) => {
    L.box(0, y, z, w, h, d, c.body);
    L.box(0, y - h / 2, z, w * 0.62, 0.1, d * 0.92, c.belly);
    L.box(0, y + h / 2, z, w * 0.5, 0.08, d * 0.97, c.back);
    for (const f of [-0.3, 0.1]) L.box(0, y + h * 0.16, z + f * d, w * 1.04, h * 0.66, d * 0.12, c.back);
    for (const sd of [-1, 1]) L.box(sd * (w / 2 + 0.03), y - h * 0.1, z + d * 0.3 * sd, 0.06, h * 0.18, h * 0.26, c.dark, { rx: 0.4 });
    if (!f0) return;
    for (const [k, fh] of [[-1, f0], [1, f1]]) {
      const cz = z + k * d / 4;
      L.box(0, y + h / 2 + fh / 2 - 0.1, cz, 0.28, fh + 0.2, d / 2 + 0.02, c.sail);
      L.box(0, y + h / 2 + fh, cz, 0.36, 0.2, d / 2 + 0.02, c.spine);
      L.box(0, y + h / 2 + fh / 2, cz, 0.34, fh * 0.8, 0.36, c.stripe);
    }
  });
  r.tail1 = pivot(r.bodyP, 0, 9.6, -3.8, part((L) => tailSeg(L, [[0, -3.1, 3.9, 3.9, 6.4, 1.9, 2.4]]), 'spino-tail1'));
  r.tail2 = pivot(r.tail1, 0, 0.3, -6, part((L) => tailSeg(L, [[0, -3.2, 2.7, 2.6, 6.5, 1.1, 1.6], [0.15, -8.4, 1.7, 1.5, 4.5, 0.5, 0.8], [0.25, -11.6, 0.85, 0.8, 2.4]]), 'spino-tail2'));

  // legs: strong striped thighs, pale-fronted shins, three clawed toes
  const leg = part((L) => {
    L.box(0, 0.3, -0.2, 2.3, 3.0, 4.2, c.body);
    L.box(0, -1.9, 0.5, 2.5, 5.2, 4.4, c.body, { rx: 0.1 });
    for (const sd of [-1, 1]) {
      for (const [y, z] of [[-0.2, -1.3], [-0.5, 0.2], [-0.9, 1.6]]) L.box(sd * 1.28, y, z, 0.08, 3.0, 0.5, c.back, { rx: -0.3 });
      L.box(sd * 1.29, -2.9, -0.7, 0.06, 0.7, 0.9, c.dark, { rx: 0.4 });
    }
    L.box(0, -5.6, -0.4, 1.5, 3.8, 1.8, c.body, { rx: 0.35 });
    L.box(0, -5.4, 0.42, 1.1, 2.8, 0.1, c.belly2, { rx: 0.35 });
    L.box(0, -7.9, 0.2, 1.3, 2.2, 1.3, c.body, { rx: -0.25 });
    L.box(0, -8.75, 1.3, 2.3, 0.7, 3.2, c.body);
    for (const x of [-0.75, 0, 0.75]) {
      L.box(x, -8.7, 3.0, 0.6, 0.55, 0.6, c.body);
      L.box(x, -8.8, 3.45, 0.42, 0.45, 0.6, c.claw, { rx: 0.3 });
    }
  }, 'spino-leg');
  r.legL = pivot(r.root, 2.9, 9.1, -1, leg);
  r.legR = pivot(r.root, -2.9, 9.1, -1, leg.clone());
  return r;
}

// Indominus rex, after the driver: pale white-grey hide with big grey camouflage blotches, a
// long narrow head with heavy bony ridges, small dark horns over glowing red eyes in a dark-grey
// mask, bumps down the snout, a deep jaw with ragged teeth, double rows of dark spikes down the
// neck, back and tail, and long powerful arms with three long clawed fingers and a thumb.
// Same rig and pivots as theropod().
export const INDOM = {
  body: 0xcfcdc3, mott: 0x9a988e, mott2: 0x75736a, belly: 0xeeece2, ridge: 0x86847a, spike: 0x4e4c46,
  dark: 0x2a2925, eye: 0xd01206, mouth: 0x5a1210, tooth: 0xf6f0de, claw: 0x34322d,
};
const INDOM_HK = 4.6, INDOM_AK = 4.9;   // head / arm detail scale (driver units -> map units)
export function indominus(opts = {}) {
  const c = { ...INDOM, ...opts };
  const r = { root: new THREE.Group() };
  // a big irregular camo blotch (two overlapping skewed patches) on a side face at x
  const blotch = (L, x, y, z, s, dk, a = 0) => {
    const col = dk ? c.mott2 : c.mott;
    L.box(x, y, z, 0.06, s * 0.75, s * 1.15, col, { rx: a + (dk ? 0.5 : -0.3) });
    L.box(x * 1.002, y + s * 0.22, z + s * 0.3, 0.06, s * 0.5, s * 0.6, col, { rx: a + (dk ? -0.4 : 0.6) });
  };
  // twin rows of dark osteoderm spikes, each with a darker tip
  const spikePair = (L, y, z, a, sx, s) => {
    for (const sd of [-1, 1]) {
      L.box(sd * sx, y, z, 0.48 * s, 0.48 * s, 0.86 * s, c.spike, { rx: a - 0.7 });
      L.box(sd * sx, y + 0.26 * s, z - 0.38 * s, 0.26 * s, 0.26 * s, 0.5 * s, c.dark, { rx: a - 0.9 });
    }
  };
  r.bodyP = pivot(r.root, 0, 0, 0);
  r.bodyP.add(part((L) => {
    // barrel body, deep chest and a thick neck up to the head pivot: [y, z, w, h, d, rx]
    const segs = [[9.2, -1.3, 5.4, 5.2, 6.6, 0], [9.75, 3.0, 5.6, 5.7, 5.2, 0.12], [10.5, 6.2, 4.6, 4.8, 3.4, -0.2], [11.7, 8.4, 3.6, 4.2, 3.6, 0.55], [12.5, 9.4, 3.1, 3.0, 2.4, 0.3]];
    // camo blotches per segment: [ly, lz, size, dark] as fractions of h / d
    const CAMO = [
      [[0.22, -0.36, 1.7, 1], [-0.05, -0.08, 1.2, 0], [0.26, 0.18, 1.0, 0], [-0.22, 0.34, 1.3, 1], [0.0, 0.44, 0.7, 0]],
      [[0.2, -0.3, 1.4, 0], [-0.1, 0.02, 1.6, 1], [0.24, 0.32, 0.9, 1], [-0.28, -0.36, 0.8, 0]],
      [[0.16, -0.2, 1.1, 1], [-0.16, 0.22, 0.9, 0]],
      [[0.12, 0.0, 0.9, 1]],
      [[0.1, -0.1, 0.6, 0]],
    ];
    segs.forEach(([y, z, w, h, d, a], i) => {
      L.box(0, y, z, w, h, d, c.body, { rx: a });
      // pale belly and throat with grey scale lines
      const [by, bz] = onBox(y, z, a, -h / 2, 0);
      L.box(0, by, bz, w * 0.74, 0.12, d * 0.92, c.belly, { rx: a });
      if (i < 4) for (const f of [-0.3, 0, 0.3]) { const [sy, sz] = onBox(y, z, a, -h / 2 - 0.07, d * f); L.box(0, sy, sz, w * 0.68, 0.04, 0.14, c.mott, { rx: a }); }
      // a mottled grey saddle over the back
      const [ty, tz] = onBox(y, z, a, h / 2, 0);
      L.box(0, ty, tz, w * 0.4, 0.1, d * 0.96, c.mott, { rx: a });
      for (const f of [-0.3, 0.12]) { const [sy, sz] = onBox(y, z, a, h / 2 + 0.03, d * f); L.box(w * 0.08, sy, sz, w * 0.3, 0.08, d * 0.16, c.mott2, { rx: a }); }
      for (const sd of [-1, 1]) for (const [ly, lz, s, dk] of CAMO[i]) {
        const [sy, sz] = onBox(y, z, a, h * ly, d * lz);
        blotch(L, sd * (w / 2 + 0.03), sy, sz, s, dk, a);
      }
      // double rows of dark spikes down the neck and back
      for (const f of (i < 2 ? [-0.36, -0.05, 0.26] : i < 4 ? [-0.25, 0.2] : [0])) {
        const [sy, sz] = onBox(y, z, a, h / 2 + 0.2, d * f);
        spikePair(L, sy, sz, a, 0.55, i < 3 ? 1 : 0.8);
      }
    });
    // long powerful arms: three long clawed fingers and an inward-turned thumb
    for (const sd of [-1, 1]) bentArm(L, sd * 2.3, 9.8, 7.4, -0.25, -0.8, INDOM_AK, 0.42, (U) => {
      U.box(0, -0.2, 0, 0.22, 0.48, 0.22, c.body);
      U.box(sd * 0.06, -0.16, 0, 0.1, 0.24, 0.23, c.mott);
    }, (F, o) => {
      F.box(0, -0.52 + o, 0.02, 0.18, 0.34, 0.18, c.body);
      F.box(sd * 0.091, -0.5 + o, 0.02, 0.02, 0.12, 0.1, c.mott2);
      F.box(0, -0.72 + o, 0.04, 0.2, 0.12, 0.18, c.body);
      for (const x of [-0.065, 0, 0.065]) {
        F.box(x, -0.84 + o, 0.06, 0.05, 0.16, 0.05, c.body, { rx: -0.25 });
        F.box(x, -0.95 + o, 0.11, 0.04, 0.1, 0.04, c.claw, { rx: -0.8 });
      }
      F.box(-sd * 0.11, -0.76 + o, 0.1, 0.05, 0.12, 0.05, c.body, { rz: sd * 0.6, rx: -0.4 });
      F.box(-sd * 0.15, -0.83 + o, 0.14, 0.04, 0.08, 0.04, c.claw, { rz: sd * 0.6, rx: -0.9 });
    });
  }, 'indom-body'));

  // head + jaw: the driver's long narrow skull, scaled up
  r.head = pivot(r.bodyP, 0, 12.9, 9.9);
  const hw = (z) => 0.33 - 0.1 * Math.max(0, Math.min(1, (z - 0.05) / 1.1));
  r.head.add(partK((L) => {
    L.box(0, 0.16, -0.06, 0.7, 0.58, 0.44, c.body);
    L.box(0, 0.18, 0.3, 0.62, 0.52, 0.5, c.body);
    L.box(0, 0.12, 0.74, 0.5, 0.4, 0.5, c.body);
    L.box(0, 0.08, 1.08, 0.44, 0.32, 0.3, c.body);
    L.box(0, -0.075, 0.6, 0.5, 0.02, 1.08, c.mouth);
    // grey snout top and bony bumps running up the face
    L.box(0, 0.33, 0.8, 0.3, 0.04, 0.6, c.mott);
    L.box(0, 0.36, 0.2, 0.36, 0.03, 0.5, c.mott);
    L.box(0, 0.16, 1.231, 0.3, 0.12, 0.02, c.mott);
    for (const z of [0.55, 0.72, 0.9, 1.06]) for (const sd of [-1, 1]) L.box(sd * 0.11, 0.35, z, 0.07, 0.05, 0.08, c.ridge);
    for (const sd of [-1, 1]) {
      // heavy bony ridge over each eye, ending in a little horn, plus knobbly bumps behind
      L.box(sd * 0.27, 0.48, 0.3, 0.18, 0.12, 0.52, c.ridge, { rz: -sd * 0.25 });
      L.box(sd * 0.3, 0.6, 0.12, 0.08, 0.16, 0.08, c.spike, { rx: -0.5, rz: -sd * 0.3 });
      L.box(sd * 0.32, 0.69, 0.07, 0.05, 0.08, 0.05, c.dark, { rx: -0.7, rz: -sd * 0.3 });
      for (const [y, z] of [[0.46, -0.04], [0.4, -0.18], [0.3, -0.24]]) L.box(sd * 0.33, y, z, 0.1, 0.08, 0.08, c.ridge);
      // dark grey mask around the eye, sweeping back along the skull
      L.box(sd * 0.336, 0.32, 0.22, 0.02, 0.24, 0.46, c.mott2);
      L.box(sd * 0.336, 0.27, -0.08, 0.02, 0.16, 0.26, c.mott2, { rx: 0.3 });
      L.box(sd * 0.342, 0.33, 0.3, 0.02, 0.12, 0.17, c.eye, glowO(0xa00400, 1.4));
      L.box(sd * 0.35, 0.33, 0.31, 0.015, 0.11, 0.035, C.black);
      L.box(sd * 0.344, 0.4, 0.3, 0.02, 0.03, 0.2, c.dark);
      // grey camo streaks along the face, nostrils, a dark lip line
      for (const [y, z, l] of [[0.1, 0.02, 0.3], [0.12, 0.56, 0.4], [0.2, 0.9, 0.3]]) L.box(sd * hw(z) * 0.98 + sd * 0.012, y, z, 0.02, 0.1, l, c.mott, { rx: -0.2 });
      L.box(sd * 0.12, 0.245, 1.17, 0.06, 0.02, 0.06, c.dark);
      L.box(sd * hw(0.6) * 0.98, -0.04, 0.6, 0.02, 0.04, 1.0, c.mott2);
      // long upper teeth, a ragged row overhanging the jaw
      for (let z = 0.1, i = 0; z <= 1.16; z += 0.075, i++) {
        const h = 0.1 + 0.06 * Math.sin(Math.min(1, z / 1.16) * Math.PI) + (i % 3 === 0 ? 0.03 : 0);
        L.box(sd * (hw(z) - 0.03), -0.08 - h / 2, z, 0.05, h, 0.05, c.tooth, { rx: (i % 2 ? 0.12 : -0.12) });
      }
    }
    for (const x of [-0.11, -0.037, 0.037, 0.11]) L.box(x, -0.13, 1.2, 0.045, 0.1, 0.045, c.tooth);
  }, 'indom-head', INDOM_HK));
  r.jaw = pivot(r.head, 0, -0.08 * INDOM_HK, -0.1 * INDOM_HK, partK((L) => {
    L.box(0, -0.17, 0.12, 0.62, 0.34, 0.5, c.body);
    L.box(0, -0.14, 0.62, 0.48, 0.28, 0.56, c.body);
    L.box(0, -0.12, 1.06, 0.38, 0.24, 0.36, c.body);
    L.box(0, -0.29, 0.6, 0.42, 0.05, 1.2, c.belly);
    L.box(0, 0.004, 0.62, 0.3, 0.02, 1.0, c.mouth);
    L.box(0, 0.012, 0.56, 0.2, 0.02, 0.78, 0xb84a48);
    for (const sd of [-1, 1]) {
      for (let z = 0.28, i = 0; z <= 1.2; z += 0.08, i++) {
        const x = (z < 0.9 ? 0.24 - (z - 0.28) * 0.1 : 0.17) - 0.03, h = 0.08 + 0.04 * Math.sin(z * 2.8);
        L.box(sd * x, h / 2, z, 0.045, h, 0.045, c.tooth, { rx: (i % 2 ? 0.12 : -0.1) });
      }
      L.box(sd * 0.311, -0.12, 0.2, 0.02, 0.06, 0.4, c.mott);
      L.box(sd * 0.241, -0.1, 0.7, 0.02, 0.05, 0.3, c.mott2);
    }
  }, 'indom-jaw', INDOM_HK));

  // tail: grey saddle, camo blotches, pale underside and twin rows of spikes: [y, z, w, h, d]
  const tailSeg = (L, segs) => segs.forEach(([y, z, w, h, d], i) => {
    L.box(0, y, z, w, h, d, c.body);
    L.box(0, y - h / 2, z, w * 0.62, 0.1, d * 0.92, c.belly);
    L.box(0, y + h / 2, z, w * 0.4, 0.08, d * 0.95, c.mott);
    L.box(w * 0.08, y + h / 2 + 0.03, z - d * 0.2, w * 0.3, 0.06, d * 0.2, c.mott2);
    for (const sd of [-1, 1]) for (const [ly, lz, s, dk] of [[0.12, -0.25, 1, 1], [-0.15, 0.2, 0.8, 0]]) blotch(L, sd * (w / 2 + 0.03), y + h * ly, z + d * lz * sd, s * h * 0.42, dk);
    if (w > 1.2) for (const f of [-0.3, 0.05, 0.36]) spikePair(L, y + h / 2 + 0.15, z + f * d, 0, w * 0.13, Math.min(1, w / 3.6));
  });
  r.tail1 = pivot(r.bodyP, 0, 9.6, -3.8, part((L) => tailSeg(L, [[0, -3.1, 4.4, 4.3, 6.4]]), 'indom-tail1'));
  r.tail2 = pivot(r.tail1, 0, 0.3, -6, part((L) => tailSeg(L, [[0, -3.2, 3.0, 2.9, 6.5], [0.15, -8.4, 1.9, 1.7, 4.5], [0.25, -11.6, 0.9, 0.85, 2.4]]), 'indom-tail2'));

  // legs: thick mottled thighs, heavy shins and dark-clawed feet
  const leg = part((L) => {
    L.box(0, 0.4, -0.2, 2.6, 3.2, 4.5, c.body);
    L.box(0, -1.9, 0.5, 2.8, 5.4, 4.8, c.body, { rx: 0.1 });
    for (const sd of [-1, 1]) {
      blotch(L, sd * 1.43, -0.4, -1.0, 1.5, 1, 0.1);
      blotch(L, sd * 1.43, -2.6, 1.0, 1.1, 0, 0.1);
    }
    L.box(0, -5.6, -0.4, 1.7, 3.8, 1.9, c.body, { rx: 0.35 });
    L.box(0, -5.4, 0.46, 1.3, 2.8, 0.1, c.mott, { rx: 0.35 });
    L.box(0, -7.9, 0.2, 1.4, 2.2, 1.4, c.body, { rx: -0.25 });
    L.box(0, -8.75, 1.4, 2.5, 0.7, 3.4, c.body);
    L.box(0, -8.38, 1.6, 1.8, 0.06, 2.6, c.mott);
    for (const x of [-0.8, 0, 0.8]) {
      L.box(x, -8.7, 3.1, 0.68, 0.6, 0.6, c.body);
      L.box(x, -8.8, 3.55, 0.45, 0.5, 0.65, c.claw, { rx: 0.3 });
    }
  }, 'indom-leg');
  r.legL = pivot(r.root, 2.95, 9.1, -1, leg);
  r.legR = pivot(r.root, -2.95, 9.1, -1, leg.clone());
  return r;
}

// ---------------------------------------------------------------------------------
// Velociraptor (Blue, Charlie, Delta, Echo) and Dilophosaurus
// ---------------------------------------------------------------------------------
export const RAPTORS = {
  blue: { body: 0x7d8a8a, stripe: 0x2a5ab8, belly: 0xc6c8bc },
  charlie: { body: 0x5d6a3e, stripe: 0x1b2a1a, belly: 0xa4a07a },
  delta: { body: 0x4f7a78, stripe: 0x2f4a48, belly: 0xb0b8a4 },
  echo: { body: 0x8a6a48, stripe: 0xe0a030, belly: 0xc8b48a },
};
export function raptor(opts = {}) {
  const c = { body: 0x7d8a8a, stripe: 0x2a5ab8, belly: 0xc6c8bc, eye: C.yellow, ...opts };
  const r = { root: new THREE.Group() };
  r.bodyP = pivot(r.root, 0, 0, 0);
  r.bodyP.add(part((L) => {
    L.box(0, 2.5, 0.1, 1.3, 1.4, 3.0, c.body, { rx: -0.12 });
    L.box(0, 1.95, 0.3, 1.0, 0.4, 2.4, c.belly, { rx: -0.12 });
    L.box(0, 3.2, 1.8, 0.85, 1.6, 0.95, c.body, { rx: 0.6 });
    L.box(0, 3.23, 0.1, 0.35, 0.08, 2.9, c.stripe, { rx: -0.12 });
    for (const sd of [-1, 1]) {
      L.box(sd * 0.66, 2.55, 0.2, 0.06, 0.35, 2.6, c.stripe, { rx: -0.12 });
      L.box(sd * 0.55, 2.2, 1.5, 0.22, 1.0, 0.25, c.body, { rx: -0.9 });
      L.box(sd * 0.55, 1.85, 1.95, 0.15, 0.35, 0.15, C.black, { rx: -1.4 });
    }
  }, 'raptor-body'));
  r.head = pivot(r.bodyP, 0, 3.75, 2.25);
  r.head.add(part((L) => {
    L.box(0, 0.15, 0.75, 0.95, 0.85, 1.6, c.body);
    L.box(0, -0.05, 1.85, 0.75, 0.6, 1.0, c.body);
    L.box(0, 0.6, 0.9, 0.3, 0.06, 1.8, c.stripe);
    for (const sd of [-1, 1]) {
      L.box(sd * 0.48, 0.3, 0.7, 0.06, 0.25, 0.32, c.eye);
      L.box(sd * 0.5, 0.3, 0.72, 0.05, 0.2, 0.1, C.black);
      L.box(sd * 0.39, 0.1, 1.2, 0.04, 0.12, 1.2, c.stripe);
    }
    tiltTeeth(L, [-0.33, 0.33], -0.36, 1.0, 2.2, 0.3, 0.08, 0.16);
  }, 'raptor-head'));
  r.jaw = pivot(r.head, 0, -0.25, 0.3);
  r.jaw.add(part((L) => { L.box(0, -0.12, 1.05, 0.7, 0.26, 1.7, c.belly); L.box(0, 0.03, 1.0, 0.5, 0.06, 1.4, 0xd04a4a); }, 'raptor-jaw'));
  r.tail = pivot(r.bodyP, 0, 2.65, -1.35);
  r.tail.add(part((L) => {
    L.box(0, 0, -1.5, 0.85, 0.85, 3.0, c.body);
    L.box(0, 0.05, -3.9, 0.5, 0.5, 2.2, c.body);
    L.box(0, 0.44, -1.5, 0.3, 0.06, 3, c.stripe);
  }, 'raptor-tail'));
  const leg = part((L) => {
    L.box(0, -0.35, 0.15, 0.5, 1.1, 0.95, c.body);
    L.box(0, -1.25, -0.25, 0.34, 1.0, 0.38, c.body, { rx: -0.35 });
    L.box(0, -1.95, 0.25, 0.46, 0.3, 1.0, c.body);
    L.box(0, -1.6, 0.6, 0.08, 0.4, 0.14, C.black, { rx: -0.4 });
  }, 'raptor-leg');
  r.legL = pivot(r.root, 0.5, 2.15, -0.2, leg);
  r.legR = pivot(r.root, -0.5, 2.15, -0.2, leg.clone());
  return r;
}
export function raptorRun(r, ph, amp = 0.8) {
  r.legL.rotation.x = Math.sin(ph) * amp;
  r.legR.rotation.x = -Math.sin(ph) * amp;
  r.bodyP.position.y = Math.abs(Math.cos(ph)) * 0.25;
  r.bodyP.rotation.x = 0.08;
  r.tail.rotation.y = Math.sin(ph * 0.5) * 0.12;
  r.head.rotation.x = Math.sin(ph) * 0.06;
  r.jaw.rotation.x = 0.1 + Math.max(0, Math.sin(ph * 0.25)) * 0.35;
}

// Dilophosaurus: slim olive spitter with leopard spots, a ringed tail, thin splayed red twin
// crests and the striped neck frill, folded back along the neck until diloFrill() fans it open.
// Rig: root, bodyP, head (+ jaw), tail, frillL / frillR (the two fan halves).
const DILO = {
  body: 0x7a9230, dark: 0x4a5a1a, spot: 0x323e16, stripe: 0xe0c440, belly: 0xe6d890,
  crest: 0xd42a16, crestDk: 0x2a1610, eye: 0xf4b018,
  frillA: 0xf8c81c, frillA2: 0xfbd84a, frillB: 0xf28418, frillC: 0xc91a09, rib: 0x5a160c, frillSpot: 0x1e1a14,
};
const DILO_HK = 1.9, DILO_FK = 1.75;   // head detail and frill scale (driver units -> map units)
export function dilophosaurus() {
  const c = DILO;
  const r = { root: new THREE.Group() };
  r.bodyP = pivot(r.root, 0, 0, 0);
  r.bodyP.add(part((L) => {
    // torso, chest and an S-curved neck up to the head pivot (0, 3.6, 1.7)
    const segs = [[2.05, -0.25, 1.04, 1.12, 2.3, -0.06], [2.28, 0.95, 0.9, 1.0, 0.95, 0.3], [2.78, 1.28, 0.64, 0.72, 0.56, 0.5], [3.2, 1.52, 0.54, 0.6, 0.48, 0.25], [3.48, 1.66, 0.48, 0.42, 0.42, -0.05]];
    segs.forEach(([y, z, w, h, d, a], i) => {
      L.box(0, y, z, w, h, d, c.body, { rx: a });
      // cream belly / throat underneath (front face up the neck), dark saddle on top
      if (i < 2) { const [by, bz] = onBox(y, z, a, -h / 2, 0); L.box(0, by, bz, w * 0.72, 0.06, d * 0.88, c.belly, { rx: a }); }
      else { const [fy, fz] = onBox(y, z, a, 0, d / 2); L.box(0, fy, fz, w * 0.62, h * 0.95, 0.05, c.belly, { rx: a }); }
      const [ty, tz] = onBox(y, z, a, h / 2, 0);
      L.box(0, ty, tz, w * 0.36, 0.05, d * 0.9, c.dark, { rx: a });
      if (i >= 2) for (const sd of [-1, 1]) L.box(sd * (w / 2 + 0.01), y + 0.06 * sd, z - 0.06, 0.03, 0.1, 0.12, c.spot, { rx: a });
    });
    // dark saddle bands over the back and pale flank stripes
    for (const z of [-1.1, -0.5, 0.1, 0.75]) { const [ty, tz] = onBox(2.05, -0.25, -0.06, 0.56, z + 0.25); L.box(0, ty, tz, 0.86, 0.05, 0.18, c.dark, { rx: -0.06 }); }
    for (const sd of [-1, 1]) {
      L.box(sd * 0.525, 1.82, -0.25, 0.03, 0.08, 2.0, c.stripe, { rx: -0.06 });
      L.box(sd * 0.455, 2.15, 1.0, 0.03, 0.07, 0.8, c.stripe, { rx: 0.3 });
      // leopard spots: dark blotches, some with an olive centre (rosettes)
      for (let i = 0; i < 14; i++) {
        const z = -1.2 + (i % 7) * 0.32 + 0.08 * ((i * 5) % 3), y = 2.05 + (i < 7 ? 0.28 : -0.1) + 0.06 * ((i * 7) % 3 - 1);
        const s = 0.13 + ((i * 3) % 3) * 0.04;
        L.box(sd * 0.525, y, z, 0.03, s, s * 1.2, c.spot, { rx: -0.06 });
        if (s > 0.18) L.box(sd * 0.535, y, z, 0.03, s * 0.45, s * 0.5, c.body, { rx: -0.06 });
      }
      for (const [y, z] of [[2.45, 0.8], [2.15, 1.15], [2.0, 0.75]]) L.box(sd * 0.455, y, z, 0.03, 0.12, 0.14, c.spot, { rx: 0.3 });
      // slender clawed arms
      L.box(sd * 0.44, 2.05, 1.3, 0.16, 0.6, 0.18, c.body, { rx: -0.7 });
      L.box(sd * 0.44, 1.72, 1.62, 0.13, 0.4, 0.14, c.body, { rx: -1.3 });
      for (const x of [-0.05, 0, 0.05]) L.box(sd * 0.44 + x, 1.62, 1.86, 0.04, 0.16, 0.04, C.black, { rx: -0.6 });
      // legs: muscular spotted thighs, slim shins, three-toed feet
      L.box(sd * 0.44, 1.62, -0.3, 0.4, 1.05, 0.85, c.body, { rx: 0.12 });
      for (const [y, z, s] of [[1.85, -0.5, 0.16], [1.5, -0.15, 0.13], [1.35, -0.55, 0.1], [1.9, 0.0, 0.1]]) L.box(sd * 0.645, y, z, 0.02, s, s * 1.2, c.spot, { rx: 0.12 });
      L.box(sd * 0.44, 0.92, -0.5, 0.26, 0.85, 0.32, c.body, { rx: -0.35 });
      L.box(sd * 0.44, 0.38, -0.36, 0.2, 0.62, 0.2, c.body, { rx: 0.35 });
      L.box(sd * 0.44, 0.07, -0.05, 0.36, 0.14, 0.64, c.body);
      for (const x of [-0.12, 0, 0.12]) L.box(sd * 0.44 + x, 0.07, 0.32, 0.07, 0.08, 0.14, C.black);
    }
  }, 'dilo-body'));
  // head: small and narrow, kinked snout, yellow eyes and the twin crests
  r.head = pivot(r.bodyP, 0, 3.6, 1.7);
  r.head.add(partK((L) => {
    L.box(0, 0.1, 0.04, 0.38, 0.34, 0.42, c.body);
    L.box(0, 0.05, 0.4, 0.28, 0.24, 0.36, c.body);
    L.box(0, 0.03, 0.64, 0.24, 0.22, 0.16, c.body);
    L.box(0, -0.1, -0.02, 0.28, 0.12, 0.3, c.belly);
    L.box(0, -0.075, 0.38, 0.22, 0.02, 0.56, 0x7a1a14);
    for (const sd of [-1, 1]) L.box(sd * 0.115, -0.065, 0.56, 0.03, 0.05, 0.05, c.dark);
    teethRow(L, [-0.1, 0.1], -0.1, 0.24, 0.5, 0.065, 0.028, 0.05);
    teethRow(L, [-0.09, 0.09], -0.1, 0.62, 0.68, 0.06, 0.026, 0.05);
    for (const sd of [-1, 1]) {
      L.box(sd * 0.191, 0.15, 0.12, 0.02, 0.12, 0.13, c.eye);
      L.box(sd * 0.199, 0.15, 0.13, 0.015, 0.1, 0.035, C.black);
      L.box(sd * 0.2, 0.17, 0.1, 0.012, 0.03, 0.025, C.white);
      L.box(sd * 0.17, 0.235, 0.1, 0.07, 0.04, 0.2, c.dark);
      L.box(sd * 0.192, 0.11, -0.08, 0.015, 0.05, 0.18, c.crestDk);
      L.box(sd * 0.142, 0.0, 0.34, 0.015, 0.035, 0.22, c.dark);
      for (const [y, z] of [[0.04, 0.0], [0.2, -0.1], [0.06, 0.18]]) L.box(sd * 0.192, y, z, 0.015, 0.045, 0.05, c.spot);
      L.box(sd * 0.06, 0.142, 0.67, 0.035, 0.01, 0.04, c.spot);
      // twin crests: thin red plates arcing over snout and skull, splayed outward, edged dark
      for (let i = 0; i < 9; i++) {
        const z = 0.62 - i * 0.09, top = 0.2 + 0.21 * Math.sin(Math.PI * (0.68 - z) / 0.9);
        const base = (z > 0.24 ? 0.17 : 0.27) - 0.02, h = top - base, tl = 0.3;
        L.box(sd * (0.09 + h * Math.sin(tl) / 2), base + h / 2, z, 0.03, h, 0.11, c.crest, { rz: -sd * tl });
        L.box(sd * (0.09 + h * Math.sin(tl)), base + h * Math.cos(tl), z, 0.034, 0.025, 0.11, c.crestDk, { rz: -sd * tl });
        if (i % 2) L.box(sd * (0.106 + h * Math.sin(tl) * 0.45), base + h * 0.45, z, 0.008, h * 0.6, 0.022, c.crestDk, { rz: -sd * tl, rx: 0.4 });
      }
    }
    L.box(0, 0.275, 0.0, 0.1, 0.02, 0.3, c.dark);
  }, 'dilo-head', DILO_HK));
  r.jaw = pivot(r.head, 0, -0.075 * DILO_HK, 0.06 * DILO_HK, partK((L) => {
    L.box(0, -0.05, 0.3, 0.24, 0.1, 0.56, c.belly);
    L.box(0, -0.035, 0.3, 0.25, 0.04, 0.52, c.body);
    L.box(0, 0.005, 0.3, 0.17, 0.02, 0.46, 0xd04a4a);
    teethRow(L, [-0.095, 0.095], 0.025, 0.14, 0.52, 0.07, 0.026, 0.045);
  }, 'dilo-jaw', DILO_HK));
  // ringed tail on its own pivot so it can sway
  r.tail = pivot(r.bodyP, 0, 2.12, -1.35, part((L) => {
    const segs = [[0, -0.75, 0.84, 0.8, 1.6, -0.04], [0.08, -2.2, 0.64, 0.6, 1.4, -0.08], [0.18, -3.45, 0.46, 0.43, 1.2, -0.1], [0.26, -4.5, 0.3, 0.28, 1.0, -0.1]];
    segs.forEach(([y, z, w, h, d, a], i) => {
      L.box(0, y, z, w, h, d, c.body, { rx: a });
      L.box(0, y - h / 2, z, w * 0.6, 0.05, d * 0.9, c.belly, { rx: a });
      L.box(0, y + h / 2, z, w * 0.3, 0.05, d * 0.9, c.dark, { rx: a });
      // dark rings round the tail, two per segment
      for (const f of [-0.25, 0.25]) L.box(0, y, z + f * d, w * 1.06, h * 1.06, d * 0.13, i % 2 ? c.spot : c.dark, { rx: a });
      if (i < 2) for (const sd of [-1, 1]) L.box(sd * w * 0.52, y + 0.04, z + d * 0.02, 0.03, h * 0.28, d * 0.12, c.spot, { rx: a });
    });
  }, 'dilo-tail'));
  // the frill: two fan halves (driver design), each a ring of tapered panels -- orange inner
  // band, yellow middle with dark eye-spots, red rim -- with dark ribs poking past the rim
  const fk = DILO_FK, halves = [];
  for (const sd of [1, -1]) {
    halves.push(pivot(r.head, 0, 0, -0.08 * fk, partK((L) => {
      const n = 7, a0 = 0.02, a1 = 2.62, da = (a1 - a0) / n, r0 = 0.08;
      const rad = (a) => 0.72 + 0.14 * Math.sin(Math.min(Math.PI, a * 1.25));
      const wedge = (a, q0, q1, col) => {
        const t = Math.tan(da / 2) * 2;
        L.put(taperGeo(+(q0 * t * 1.1 + 0.01).toFixed(3), +(q1 * t * 1.06).toFixed(3), +(q1 - q0).toFixed(3), 0.03), col, sd * Math.sin(a) * q0, Math.cos(a) * q0, 0, 0, 0, -sd * a, 1, 1, 1);
      };
      const ray = (a, q0, q1, z, w, th, col) => { const q = (q0 + q1) / 2; L.box(sd * Math.sin(a) * q, Math.cos(a) * q, z, w, q1 - q0, th, col, { rz: -sd * a }); };
      for (let i = 0; i < n; i++) {
        const a = a0 + (i + 0.5) * da, R = rad(a);
        wedge(a, r0, R * 0.4, c.frillB);
        wedge(a, R * 0.4, R * 0.9, i % 2 ? c.frillA : c.frillA2);
        wedge(a, R * 0.9, R, c.frillC);
        for (const zz of [0.02, -0.02]) ray(a, R * 0.3, R * 0.62, zz, 0.03, 0.012, c.frillB);
        for (const zz of [0.022, -0.022]) {
          const sa = a + da * 0.28, sr = R * 0.7, sb = a - da * 0.25, sr2 = R * 0.56;
          L.box(sd * Math.sin(sa) * sr, Math.cos(sa) * sr, zz, 0.06, 0.06, 0.012, c.frillSpot, { rz: -sd * sa });
          L.box(sd * Math.sin(sb) * sr2, Math.cos(sb) * sr2, zz, 0.04, 0.04, 0.012, c.frillC, { rz: -sd * sb });
        }
      }
      for (let i = 0; i <= n; i++) { const a = a0 + i * da; ray(a, r0, rad(a) + 0.08, 0, 0.03, 0.05, c.rib); }
    }, 'dilo-frill', fk, false)));
  }
  [r.frillL, r.frillR] = halves;
  diloFrill(r, 0, 0);
  return r;
}
// open = 0: frill folded small and flat back along the neck; 1: fanned out around the head,
// rattling. Also opens the jaw to spit and sways the tail.
export function diloFrill(r, open, t = 0) {
  const e = smooth01(open), s = 0.24 + 0.76 * e + 0.14 * Math.sin(e * Math.PI), shake = e * Math.sin(t * 34), fk = DILO_FK;
  for (const [h, sd] of [[r.frillL, 1], [r.frillR, -1]]) {
    h.rotation.set(-0.08 * e, sd * (Math.PI / 2 - 0.12) * (1 - e) - sd * 0.38 * e, shake * 0.06 * sd);
    h.position.x = sd * (0.15 - 0.11 * e) * fk; h.position.y = (-0.1 + 0.14 * e) * fk;
    h.scale.set(s * (1 + shake * 0.03), s * (1 + shake * 0.03), 1);
  }
  r.jaw.rotation.x = 0.06 + e * (0.5 + Math.sin(t * 30) * 0.06);
  r.tail.rotation.y = Math.sin(t * 0.9) * 0.16 * (1 - e * 0.6);
  r.tail.rotation.x = -e * 0.08;
}

// ---------------------------------------------------------------------------------
// Sauropod, ceratopsian, stegosaur, hadrosaur, ornithomimid
// ---------------------------------------------------------------------------------
export function brachiosaurus(opts = {}) {
  const c = { body: 0x6f8660, belly: 0xa8b490, spot: 0x4a5e40, ...opts };
  const r = { root: new THREE.Group() };
  r.root.add(part((L) => {
    L.box(0, 12, -0.5, 7, 7, 12, c.body, { rx: -0.12 });
    L.box(0, 14, 4.5, 6.4, 6.6, 5, c.body, { rx: -0.2 });
    L.box(0, 8.8, 0, 6, 1.4, 10, c.belly, { rx: -0.12 });
    for (const sd of [-1, 1]) {
      L.boxB(sd * 2.5, 0, 4.8, 2.4, 13, 2.4, c.body); L.boxB(sd * 2.5, 0, 5.0, 3, 0.8, 3.2, c.spot);
      L.boxB(sd * 2.6, 0, -4.2, 2.6, 10, 2.8, c.body); L.boxB(sd * 2.6, 0, -4.0, 3.2, 0.8, 3.4, c.spot);
      for (const [y, z] of [[12, -3], [13.5, 0], [11, 2], [14.5, 3.5], [12.5, -5]]) L.box(sd * 3.53, y, z, 0.1, 1.1, 1.6, c.spot);
    }
    for (const z of [-4, -1, 2]) L.brick(0, 15.2 - z * 0.1, z, 2, 2, 1, c.body);
  }, 'brachio-body'));
  r.neck = pivot(r.root, 0, 16, 7);
  r.neck.add(part((L) => {
    const th = 0.36, cy = Math.cos(th), sz = Math.sin(th);
    for (let k = 0; k < 5; k++) {
      const d = 1.6 + k * 3.4, w = 3.6 - k * 0.35;
      L.box(0, d * cy, d * sz, w, 3.8, w, c.body, { rx: th });
      L.box(0, d * cy - 0.2, d * sz + w / 2, w * 0.7, 3.4, 0.2, c.belly, { rx: th });
      if (k % 2) for (const sd of [-1, 1]) L.box(sd * (w / 2 + 0.03), d * cy, d * sz, 0.06, 1.4, 1.2, c.spot, { rx: th });
    }
  }, 'brachio-neck'));
  r.head = pivot(r.neck, 0, 17.4, 6.4);
  r.head.add(part((L) => {
    L.box(0, 0.4, 1.1, 2.4, 2.0, 3.4, c.body);
    L.box(0, 1.8, 0.5, 2.0, 1.4, 2.0, c.body);
    L.box(0, 0.0, 3.1, 1.9, 1.3, 1.6, c.body);
    L.box(0, -0.45, 2.6, 1.95, 0.12, 2.6, C.black);
    for (const sd of [-1, 1]) { L.box(sd * 1.21, 1.0, 1.0, 0.06, 0.45, 0.45, C.black); L.box(sd * 0.55, 2.5, 0.8, 0.45, 0.25, 0.45, c.spot); }
  }, 'brachio-head'));
  r.tail = pivot(r.root, 0, 12.5, -6.5);
  r.tail.add(part((L) => {
    L.box(0, -0.5, -2.5, 4, 3.6, 5.5, c.body);
    L.box(0, -1.5, -6.5, 2.6, 2.2, 5, c.body);
    L.box(0, -2.3, -10.5, 1.4, 1.3, 4.5, c.body);
    L.box(0, -2.8, -13.8, 0.7, 0.7, 3, c.body);
  }, 'brachio-tail'));
  return r;
}

export function triceratops() {
  const c = { body: 0x8a6e4a, belly: 0xc0a47a, frill: 0xb0784a, rim: C.dkred, horn: 0xefe6cf };
  const r = { root: new THREE.Group() };
  r.root.add(part((L) => {
    L.box(0, 3.6, 0, 5, 4.4, 8, c.body);
    L.box(0, 5.4, -0.5, 4.2, 1.4, 6.5, c.body);
    L.box(0, 1.6, 0, 4, 0.6, 6.5, c.belly);
    for (const sd of [-1, 1]) for (const z of [2.8, -2.8]) { L.boxB(sd * 1.8, 0, z, 1.5, 2.2, 1.6, c.body); L.boxB(sd * 1.8, 0, z + 0.2, 1.8, 0.5, 2, c.belly); }
    L.box(0, 3.4, -5, 2.2, 2.2, 3, c.body, { rx: 0.15 });
    L.box(0, 2.9, -7.2, 1.2, 1.2, 2.5, c.body, { rx: 0.25 });
    for (const z of [-2.5, 0, 2.5]) L.brick(0, 6.1, z, 2, 2, 1, c.body);
  }, 'trike-body'));
  r.head = pivot(r.root, 0, 4, 4.3);
  r.head.add(part((L) => {
    L.box(0, 1.6, -0.2, 6, 4.6, 0.6, c.frill, { rx: -0.35 });
    L.box(0, 3.8, -1.0, 6.4, 0.6, 0.7, c.rim, { rx: -0.35 });
    for (const sd of [-1, 1]) L.box(sd * 3.1, 1.6, -0.2, 0.6, 4.4, 0.7, c.rim, { rx: -0.35 });
    L.box(0, 0, 1.5, 2.6, 2.4, 3, c.body);
    L.box(0, -0.5, 3.2, 1.6, 1.3, 1.2, 0x5a4a3a);
    for (const sd of [-1, 1]) {
      L.box(sd * 0.9, 1.9, 2.4, 0.4, 0.4, 3.2, c.horn, { rx: -0.8 });
      L.box(sd * 1.32, 0.6, 1.6, 0.06, 0.4, 0.4, C.black);
    }
    L.box(0, 0.8, 3.2, 0.35, 1.1, 0.35, c.horn, { rx: 0.3 });
  }, 'trike-head'));
  r.tail = { rotation: { y: 0 } };
  return r;
}

export function stegosaurus() {
  const c = { body: 0x6f7a4a, belly: 0xb8b48a, plateA: C.orange, plateB: 0xc0501a, spike: 0xefe6cf };
  const r = { root: new THREE.Group() };
  r.root.add(part((L) => {
    L.box(0, 4.2, -0.5, 4, 4, 9, c.body, { rx: 0.08 });
    L.box(0, 5.9, -0.8, 3.2, 1.6, 6.5, c.body);
    L.box(0, 2.3, -0.5, 3.2, 0.5, 7, c.belly);
    L.box(0, 3.1, 4.6, 2, 2, 2.5, c.body, { rx: -0.35 });
    L.box(0, 2.4, 6.2, 1.2, 1.1, 2, c.body, { rx: 0.2 });
    for (const sd of [-1, 1]) {
      L.boxB(sd * 1.5, 0, 3.0, 1.2, 2.8, 1.3, c.body); L.boxB(sd * 1.6, 0, -3.5, 1.6, 4, 1.8, c.body);
      L.box(sd * 0.61, 2.6, 6.6, 0.06, 0.25, 0.25, C.black);
    }
    for (let k = 0; k < 8; k++) {
      const z = 3.6 - k * 1.25, h = 1.6 + 2.2 * Math.sin((k + 0.7) / 8.4 * Math.PI);
      const sd = k % 2 ? 1 : -1;
      L.box(sd * 0.45, 6.4 + h / 2, z, 0.25, h, 1.4, k % 3 ? c.plateA : c.plateB, { rz: sd * 0.15 });
    }
  }, 'stego-body'));
  r.tail = pivot(r.root, 0, 4.4, -5);
  r.tail.add(part((L) => {
    L.box(0, 0.1, -2, 2.2, 2, 4, c.body, { rx: -0.1 });
    L.box(0, 0.4, -5.2, 1.2, 1.1, 3.5, c.body, { rx: -0.05 });
    for (const sd of [-1, 1]) for (const z of [-5.5, -6.6]) L.box(sd * 1.1, 1.2, z, 0.25, 0.25, 2.2, c.spike, { ry: sd * 1.2, rx: -0.6 });
  }, 'stego-tail'));
  r.head = { rotation: { x: 0, y: 0 } };
  return r;
}

export function parasaurolophus() {
  const c = { body: 0x6b7a3a, belly: 0xc8c08a, stripe: 0x3e4a22, crest: 0xd0602a };
  const r = { root: new THREE.Group() };
  r.root.add(part((L) => {
    L.box(0, 4.6, 0, 3, 3.4, 6, c.body, { rx: -0.15 });
    L.box(0, 3.3, 0.2, 2.4, 0.6, 5, c.belly, { rx: -0.15 });
    L.box(0, 6.4, 3.1, 1.4, 3.2, 1.4, c.body, { rx: 0.4 });
    L.box(0, 4.5, -4.6, 1.8, 1.8, 4, c.body, { rx: 0.1 });
    L.box(0, 4.1, -7.6, 1, 1, 3, c.body, { rx: 0.15 });
    for (const z of [-1.8, -0.4, 1]) for (const sd of [-1, 1]) L.box(sd * 1.52, 5, z, 0.06, 2.2, 0.4, c.stripe);
    for (const sd of [-1, 1]) {
      L.box(sd * 1.3, 3.6, -1.2, 1.1, 2.4, 2.2, c.body);
      L.box(sd * 1.3, 1.2, -1.5, 0.8, 2.6, 0.8, c.body, { rx: 0.15 });
      L.boxB(sd * 1.3, 0, -1.1, 1.1, 0.4, 1.6, c.body);
      L.box(sd * 0.9, 1.8, 2.5, 0.5, 3.4, 0.5, c.body, { rx: 0.2 });
    }
  }, 'para-body'));
  r.head = pivot(r.root, 0, 8, 3.9);
  r.head.add(part((L) => {
    L.box(0, 0, 0.8, 1.2, 1.2, 2.2, c.body);
    L.box(0, -0.25, 2.2, 1.0, 0.6, 1.0, 0xa89a6a);
    L.box(0, 1.2, -1.3, 0.5, 0.6, 3.8, c.crest, { rx: 0.4 });
    for (const sd of [-1, 1]) L.box(sd * 0.61, 0.25, 0.6, 0.05, 0.3, 0.3, C.black);
  }, 'para-head'));
  r.tail = { rotation: { y: 0 } };
  return r;
}

export function gallimimus() {
  const c = { body: 0xa07a4e, belly: 0xe0cda0, stripe: 0x5a3a22 };
  const r = { root: new THREE.Group() };
  r.bodyP = pivot(r.root, 0, 0, 0);
  r.bodyP.add(part((L) => {
    L.box(0, 2.7, 0, 1.1, 1.2, 2.2, c.body);
    L.box(0, 2.2, 0.1, 0.9, 0.3, 1.8, c.belly);
    L.box(0, 3.6, 1.3, 0.4, 1.9, 0.4, c.body, { rx: 0.35 });
    L.box(0, 4.5, 1.6, 0.45, 0.45, 0.9, c.body);
    L.box(0, 4.4, 2.2, 0.25, 0.2, 0.6, 0x6a5a4a);
    L.box(0, 2.8, -2.1, 0.6, 0.6, 3, c.body, { rx: -0.1 });
    L.box(0, 3.35, -0.3, 0.3, 0.05, 2.8, c.stripe);
    for (const sd of [-1, 1]) { L.box(sd * 0.24, 4.55, 1.6, 0.04, 0.12, 0.14, C.black); L.box(sd * 0.4, 2.4, 1.2, 0.12, 0.7, 0.12, c.body, { rx: -0.6 }); }
  }, 'galli-body'));
  const leg = part((L) => {
    L.box(0, -0.3, 0, 0.42, 0.9, 0.7, c.body);
    L.box(0, -1.3, 0, 0.22, 1.3, 0.22, c.body);
    L.box(0, -2.05, 0.25, 0.34, 0.2, 0.7, c.body);
  }, 'galli-leg');
  r.legL = pivot(r.root, 0.35, 2.2, 0, leg);
  r.legR = pivot(r.root, -0.35, 2.2, 0, leg.clone());
  return r;
}

// ---------------------------------------------------------------------------------
// Flyers and swimmers
// ---------------------------------------------------------------------------------
export function pteranodon() {
  const c = { body: 0x7c503a, wing: 0xa07a50, membrane: 0x8a5a3a, crest: C.dkred, beak: 0xe0b060 };
  const r = { root: new THREE.Group() };
  r.root.add(part((L) => {
    L.box(0, 0, 0, 0.9, 0.9, 3, c.body);
    L.box(0, 0.2, 1.8, 0.6, 0.7, 1.2, c.body);
    L.box(0, 0.1, 3.3, 0.25, 0.3, 2.4, c.beak);
    L.box(0, 0.7, 0.4, 0.15, 0.6, 2.6, c.crest, { rx: 0.3 });
    for (const sd of [-1, 1]) { L.box(sd * 0.31, 0.35, 1.9, 0.04, 0.18, 0.2, C.black); L.box(sd * 0.3, -0.35, -1.9, 0.18, 0.18, 1.3, c.body); }
  }, 'ptera-body'));
  const wing = (sd) => part((L) => {
    L.box(sd * 2.5, 0, 0, 5, 0.15, 2.2, c.wing);
    L.box(sd * 6.3, 0, -0.4, 2.8, 0.12, 1.4, c.membrane);
    L.box(sd * 8.0, 0, -0.6, 1.0, 0.1, 0.8, c.membrane);
    L.box(sd * 4, 0.1, 1.05, 8, 0.2, 0.25, c.body);
  }, 'ptera-wing');
  r.wingL = pivot(r.root, 0.45, 0.2, 0.2, wing(1));
  r.wingR = pivot(r.root, -0.45, 0.2, 0.2, wing(-1));
  return r;
}
export function flap(r, t, speed = 6, amp = 0.5) {
  const a = Math.sin(t * speed) * amp;
  r.wingL.rotation.z = a; r.wingR.rotation.z = -a;
}

export function mosasaurus() {
  const c = { body: 0x3a4a58, belly: 0xd8dcd0, ridge: 0x22303a, fin: 0x2e3c48 };
  const r = { root: new THREE.Group() };
  r.root.add(part((L) => {
    L.box(0, 0.6, 17, 4, 3.2, 7, c.body);
    L.box(0, 0.2, 22, 3, 2.2, 4, c.body);
    for (const sd of [-1, 1]) { L.box(sd * 2.02, 1.5, 17.5, 0.1, 0.7, 0.9, C.yellow); L.box(sd * 2.06, 1.5, 17.6, 0.08, 0.5, 0.3, C.black); }
    tiltTeeth(L, [-1.3, 1.3], -1.1, 14.5, 23.5, 0.9, 0.35, 0.8);
    L.box(0, -0.85, 18.5, 2.8, 0.3, 9, C.dkred);
    L.box(0, 0, 11, 6, 5.5, 7, c.body);
    L.box(0, 0, 4, 7, 6, 8, c.body);
    L.box(0, -2.7, 7, 6, 1, 13, c.belly);
    L.box(0, 0, -4, 6.4, 5.6, 8, c.body);
    for (let z = 15; z > -7; z -= 2.2) L.box(0, 3.1 - (z > 13 ? 0.9 : 0), z, 0.7, 1.2, 1, c.ridge, { rx: -0.5 });
    for (const sd of [-1, 1]) {
      L.box(sd * 5.5, -1.6, 8, 5, 0.6, 3, c.fin, { rz: sd * 0.35, ry: sd * 0.3 });
      L.box(sd * 5, -1.6, -4, 4, 0.5, 2.5, c.fin, { rz: sd * 0.35, ry: sd * 0.4 });
    }
  }, 'mosa-body'));
  r.jaw = pivot(r.root, 0, -1.2, 14);
  r.jaw.add(part((L) => {
    L.box(0, -0.6, 5, 3.4, 1.2, 10, c.belly);
    tiltTeeth(L, [-1.3, 1.3], 0.2, 1.5, 9, 0.9, 0.3, 0.7);
  }, 'mosa-jaw'));
  r.tail = pivot(r.root, 0, 0, -8);
  r.tail.add(part((L) => {
    L.box(0, 0, -4, 4.6, 4.2, 8, c.body);
    L.box(0, 0, -11, 2.8, 2.6, 7, c.body);
    L.box(0, 0, -16.5, 1.4, 1.4, 5, c.body);
    L.box(0, 2.2, -19.5, 0.5, 5, 2.5, c.fin, { rx: 0.5 });
    L.box(0, -2.2, -19.5, 0.5, 5, 2.5, c.fin, { rx: -0.5 });
    for (let z = -2; z > -14; z -= 2.4) L.box(0, 2.3 - (z < -8 ? 0.8 : 0), z, 0.5, 0.9, 0.8, c.ridge, { rx: -0.5 });
  }, 'mosa-tail'));
  return r;
}
export function shark() {
  return part((L) => {
    L.box(0, 0, 0, 2.2, 2.4, 7, 0x7a8a96);
    L.box(0, -0.8, 0.3, 1.8, 0.9, 6, C.white);
    L.box(0, 0, 4.4, 1.6, 1.8, 2, 0x7a8a96);
    L.box(0, 2, -0.3, 0.3, 2, 1.6, 0x6a7a86, { rx: -0.5 });
    L.box(0, 0, -4.5, 0.3, 3.6, 1.4, 0x6a7a86, { rx: 0.4 });
    for (const sd of [-1, 1]) { L.box(sd * 1.6, -0.8, 1.2, 2, 0.2, 1.1, 0x6a7a86, { rz: sd * 0.4 }); L.box(sd * 0.82, 0.4, 4.5, 0.05, 0.25, 0.25, C.black); }
  }, 'shark');
}

// ---------------------------------------------------------------------------------
// People and vehicles
// ---------------------------------------------------------------------------------
export function fig(L, x, y, z, ry, torso, legs, hair = C.brown, o = {}) {
  const ca = Math.cos(ry), sa = Math.sin(ry);
  const at = (lx, lz) => [x + ca * lx + sa * lz, z - sa * lx + ca * lz];
  if (!o.seated) { L.boxB(x, y, z, 0.9, 1.1, 0.5, legs, { ry }); y += 1.1; }
  else { const [a, b] = at(0, 0.4); L.box(a, y + 0.2, b, 0.9, 0.4, 1.0, legs, { ry }); y += 0.4; }
  L.boxB(x, y, z, 1.1, 1.1, 0.55, torso, { ry });
  if (o.vest) for (const sd of [-1, 1]) { const [a, b] = at(sd * 0.32, 0.03); L.boxB(a, y + 0.05, b, 0.32, 1.02, 0.56, o.vest, { ry }); }
  for (const sd of [-1, 1]) { const [a, b] = at(sd * 0.7, o.arms || 0); L.box(a, y + 0.6, b, 0.3, 0.95, 0.35, torso, { ry, rx: o.armRx || 0 }); }
  L.cyl(x, y + 1.1, z, 0.36, 0.7, C.fig, { seg: 10 });
  L.cyl(x, y + 1.6, z, 0.4, 0.3, hair, { seg: 10 });
  if (o.hat) L.cyl(x, y + 1.85, z, 0.62, 0.12, o.hat, { seg: 10 });
  if (o.hat) L.cyl(x, y + 1.9, z, 0.42, 0.32, o.hat, { seg: 10 });
}
export function motorbikeOwen() {
  return part((L) => {
    L.wheel(0, 0.75, 1.5, 0.75, 0.45); L.wheel(0, 0.75, -1.5, 0.75, 0.45);
    L.wheel(0, 0.75, 1.5, 0.4, 0.5, C.ltgray); L.wheel(0, 0.75, -1.5, 0.4, 0.5, C.ltgray);
    L.box(0, 1.3, 0, 0.6, 0.8, 2.4, C.black);
    L.box(0, 1.5, -0.5, 0.7, 0.3, 1.4, C.dkgray);
    L.box(0, 1.9, 1.2, 0.4, 1.0, 0.3, C.dkgray, { rx: -0.4 });
    L.box(0, 2.35, 1.4, 1.6, 0.15, 0.15, C.black);
    L.box(0, 1.9, 1.75, 0.5, 0.35, 0.1, C.yellow, { matOpts: { emissive: 0xfff0a0, emissiveIntensity: 1.2 } });
    fig(L, 0, 1.3, -0.3, 0, 0xb09a6a, C.dkblue, C.rbrown, { seated: true, vest: 0x5a3a22, arms: 0.6, armRx: -1.0 });
  }, 'owen');
}
export function gyrosphere(tint = C.azure) {
  const g = new THREE.Group();
  const inner = part((L) => {
    L.box(0, 1.2, 0, 2.6, 0.3, 0.3, C.dkgray);
    L.box(0, 1.2, 0, 0.3, 0.3, 2.6, C.dkgray);
    L.box(0, 1.0, 0, 1.8, 0.4, 1.0, C.white);
    L.box(0, 1.6, -0.45, 1.8, 0.9, 0.2, C.white);
    fig(L, -0.45, 1.2, 0, 0, C.red, C.dkblue, C.brown, { seated: true });
    fig(L, 0.45, 1.2, 0, 0, C.azure, C.tan, C.black, { seated: true });
    L.box(0, 0.2, 0, 1.2, 0.4, 1.2, C.dkgray);
  }, 'gyro-in');
  const glass = part((L) => { L.sphere(0, 2.1, 0, 2.1, tint, { matOpts: { trans: true, opacity: 0.32, rough: 0.05 } }); }, 'gyro-glass', false);
  const ring = part((L) => { for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; L.box(Math.cos(a) * 2.12, 2.1 + Math.sin(a) * 2.12, 0, 0.3, 1.15, 0.45, C.dkgray, { rz: a }); } }, 'gyro-ring');
  g.add(inner, glass, ring);
  g.userData.ring = ring;
  return g;
}
export function jeep(L, x, z, ry, o = {}) {
  const P = new Local(L.b, x, o.y || 0, z, ry, o.s || 1);
  const body = o.body || 0x9a9072, stripe = o.stripe || C.red;
  P.box(0, 1.4, 0, 3.0, 1.4, 5.2, body);
  P.box(0, 1.1, 0, 3.05, 0.35, 5.25, stripe);
  P.box(0, 1.55, 2.2, 2.6, 0.9, 0.9, body);
  P.box(0, 2.6, 0.9, 2.8, 1.2, 0.12, C.azure, { matOpts: { trans: true, opacity: 0.5 } });
  for (const sd of [-1, 1]) { P.box(sd * 1.35, 3.0, -0.8, 0.2, 2.4, 0.2, C.black); P.wheel(sd * 1.4, 0.75, 1.7, 0.75, 0.7); P.wheel(sd * 1.4, 0.75, -1.7, 0.75, 0.7); }
  P.box(0, 4.15, -0.8, 2.9, 0.2, 0.2, C.black);
  P.wheel(0, 1.6, -2.9, 0.75, 0.5, C.black, { ry: Math.PI / 2 });
  P.box(0, 1.9, 2.7, 2.4, 0.4, 0.08, C.black);
  if (o.driver) fig(P, -0.6, 1.2, 0.4, 0, o.driver, C.tan, C.brown, { seated: true });
}
export function explorer(L, x, z, ry, o = {}) {
  const P = new Local(L.b, x, o.y || 0, z, ry, o.s || 1);
  P.box(0, 1.5, 0, 3.2, 1.8, 6, 0xe0c060);
  P.box(0, 0.9, 0, 3.25, 0.5, 6.05, C.green);
  P.box(0, 1.9, 0, 3.25, 0.35, 6.05, C.red);
  P.box(0, 3.1, -0.4, 3.0, 1.4, 4.2, C.azure, { matOpts: { trans: true, opacity: 0.5 } });
  P.box(0, 3.9, -0.4, 3.1, 0.25, 4.3, 0xe0c060);
  for (const sd of [-1, 1]) { P.wheel(sd * 1.5, 0.8, 2, 0.8, 0.7); P.wheel(sd * 1.5, 0.8, -2, 0.8, 0.7); }
}
export function helicopter() {
  const r = { root: new THREE.Group() };
  r.root.add(part((L) => {
    L.box(0, 2.2, 0, 3.6, 3.2, 6.5, C.white);
    L.box(0, 2.6, 3.5, 3.2, 2.4, 1.6, C.azure, { matOpts: { trans: true, opacity: 0.55 } });
    L.box(0, 1.6, 0, 3.65, 0.5, 6.55, C.red);
    L.box(0, 2.2, 0, 3.65, 0.25, 6.55, C.yellow);
    L.box(0, 3.1, -6.5, 0.9, 0.9, 7, C.white);
    L.box(0, 4.3, -9.6, 0.3, 2.6, 1.4, C.red, { rx: -0.3 });
    L.box(0, 3.9, 0, 1.2, 0.6, 2, C.dkgray);
    for (const sd of [-1, 1]) { L.box(sd * 1.6, 0.1, 0, 0.3, 0.3, 6.5, C.dkgray); L.box(sd * 1.5, 0.5, 1.5, 0.2, 0.8, 0.2, C.dkgray); L.box(sd * 1.5, 0.5, -1.5, 0.2, 0.8, 0.2, C.dkgray); }
  }, 'heli'));
  r.rotor = pivot(r.root, 0, 4.4, 0, part((L) => { L.box(0, 0, 0, 16, 0.12, 0.8, C.dkgray); L.box(0, 0, 0, 0.8, 0.12, 16, C.dkgray); L.cyl(0, -0.2, 0, 0.4, 0.5, C.black); }, 'rotor'));
  r.tailRotor = pivot(r.root, 0.5, 3.2, -9.6, part((L) => { L.box(0, 0, 0, 0.1, 3, 0.4, C.dkgray); }, 'trotor'));
  return r;
}

// ---------------------------------------------------------------------------------
// Set pieces (static, written into a merged builder through a Local frame)
// ---------------------------------------------------------------------------------
export function logoTexture() {
  return canvasTexture(1024, 256, (g, w, h) => {
    g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2cd37'; g.fillRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#1b1b1b'; g.fillRect(14, 14, w - 28, h - 28);
    // round badge with a rex skeleton
    const cx = 150, cy = h / 2, R = 104;
    g.fillStyle = '#f2cd37'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8201a'; g.beginPath(); g.arc(cx, cy, R - 10, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#111'; g.fillStyle = '#111'; g.lineCap = 'round'; g.lineWidth = 9;
    g.beginPath(); g.moveTo(cx - 70, cy + 30); g.quadraticCurveTo(cx - 20, cy - 40, cx + 30, cy - 30); g.stroke();
    g.beginPath(); g.moveTo(cx + 30, cy - 50); g.lineTo(cx + 78, cy - 36); g.lineTo(cx + 74, cy - 14); g.lineTo(cx + 34, cy - 12); g.closePath(); g.fill();
    g.lineWidth = 5; for (let k = 0; k < 6; k++) { const x = cx - 38 + k * 12; g.beginPath(); g.moveTo(x, cy - 22 + Math.abs(k - 2) * 3); g.lineTo(x - 4, cy + 18); g.stroke(); }
    g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 14, cy - 6); g.lineTo(cx - 4, cy + 40); g.lineTo(cx - 20, cy + 76); g.stroke();
    g.beginPath(); g.moveTo(cx + 10, cy - 6); g.lineTo(cx + 22, cy + 40); g.lineTo(cx + 12, cy + 76); g.stroke();
    let fs = 118; g.font = `900 ${fs}px Impact, "Arial Black", Arial`; g.textBaseline = 'middle'; g.textAlign = 'left';
    while (g.measureText('JURASSIC PARK').width > w - 310 && fs > 20) { fs -= 4; g.font = `900 ${fs}px Impact, "Arial Black", Arial`; }
    g.lineWidth = 10; g.strokeStyle = '#f2cd37'; g.strokeText('JURASSIC PARK', 280, cy + 6);
    g.fillStyle = '#d8201a'; g.fillText('JURASSIC PARK', 280, cy + 6);
  });
}
export function textTexture(text, bg = '#1b2a34', fg = '#f2cd37', w = 512, h = 128, font = 'Impact, "Arial Black", Arial') {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = h * 0.62;
    g.font = `900 ${size}px ${font}`;
    while (g.measureText(text).width > w - 40 && size > 10) { size -= 2; g.font = `900 ${size}px ${font}`; }
    g.fillText(text, w / 2, h / 2 + 3);
  });
}
// a two-sided sign plane in a group
export function signPlane(group, tex, x, y, z, ry, w, h, glow = 0.25) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow, side: THREE.DoubleSide, roughness: 0.6 }));
  m.position.set(x, y, z); m.rotation.y = ry;
  group.add(m);
  return m;
}

// The iconic wooden gate. Local X runs across the road, span = half opening.
export function jpGate(L, span, flameMat) {
  const X = span + 3.5;
  for (const sd of [-1, 1]) {
    L.boxB(sd * X, 0, 0, 8, 4.5, 8, C.dkstone);
    L.boxB(sd * X, 4.5, 0, 8.6, 0.8, 8.6, C.ltgray);
    L.boxB(sd * X, 5.3, 0, 6, 19, 6, C.rbrown);
    for (const k of [-2, 0, 2]) { L.boxB(sd * X + k, 5.3, 3.05, 0.3, 19, 0.2, C.brown); L.boxB(sd * X + 3.05, 5.3, k, 0.2, 19, 0.3, C.brown); L.boxB(sd * X - 3.05, 5.3, k, 0.2, 19, 0.3, C.brown); }
    L.boxB(sd * X, 24.3, 0, 7.2, 1.2, 7.2, C.brown);
    for (const [a, b] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) {
      L.cyl(sd * X + a, 25.5, b, 0.35, 3, C.rbrown, { seg: 6 });
      L.cone(sd * X + a, 28.5, b, 0.7, 1.8, 0, { seg: 8, mat: flameMat });
    }
    // open doors swung back along the road
    L.boxB(sd * (X - 2.2), 0.4, 11, 1.6, 17, 16, C.rbrown);
    for (const y of [3, 8, 13]) L.boxB(sd * (X - 2.2), y, 11, 1.8, 0.8, 16, C.brown);
    // palisade running off into the jungle
    L.boxB(sd * (X + 30), 0, 0, 52, 13, 2.2, C.rbrown);
    for (let k = 0; k < 13; k++) L.cone(sd * (X + 6 + k * 4), 13, 0, 1.2, 2, C.rbrown, { seg: 6 });
    L.boxB(sd * (X + 30), 2, 1.2, 52, 0.8, 0.4, C.brown);
    L.boxB(sd * (X + 30), 9, 1.2, 52, 0.8, 0.4, C.brown);
  }
  L.box(0, 22.5, 0, X * 2 + 6, 3.4, 3.4, C.rbrown);
  L.box(0, 24.6, 0, X * 2 + 8, 0.8, 4, C.brown);
  L.box(0, 20.3, 0, X * 2 - 4, 1, 2.4, C.brown);
  return X;
}

// Visitor Center: stone wings and thatched pyramid roofs over the tunnel hall.
export function visitorCenter(L, halfIn, len, hallH) {
  const wall = C.tan, roof = 0x9a7a4a, trim = C.dktan;
  for (const sd of [-1, 1]) {
    const x = sd * (halfIn + 12);
    L.boxB(x, 0, 0, 24, 15, len + 10, wall);
    for (let z = -len / 2; z <= len / 2; z += 6) L.boxB(x - sd * 12.1, 2, z, 0.3, 11, 3, C.azure, { matOpts: { trans: true, opacity: 0.55 } });
    for (let z = -len / 2 - 5; z <= len / 2 + 5; z += 5) L.cyl(x + sd * 12.4, 0, z, 0.8, 15, C.white, { seg: 8 });
    L.boxB(x, 15, 0, 26, 1, len + 12, trim);
    L.cone(x, 16, 0, (len + 12) * 0.62, 14, roof, { seg: 4, ry: Math.PI / 4 });
    L.boxB(x, 0, len / 2 + 6, 20, 1, 4, C.ltgray);
  }
  L.boxB(0, hallH, 0, halfIn * 2 + 4, 3, len + 6, wall);
  L.boxB(0, hallH + 3, 0, halfIn * 2 + 6, 1, len + 8, trim);
  L.cone(0, hallH + 4, 0, (halfIn + 6) * 1.25, 16, roof, { seg: 4, ry: Math.PI / 4 });
  L.cone(0, hallH + 19, 0, 3, 5, trim, { seg: 4, ry: Math.PI / 4 });
  // facade columns either side of the entrance, both ends
  for (const e of [-1, 1]) for (const x of [-halfIn - 1, halfIn + 1, -halfIn - 5, halfIn + 5]) L.cyl(x, 0, e * (len / 2 + 2), 0.9, hallH, C.white, { seg: 8 });
}

// Jurassic World Innovation Center: glass drum with a dome
export function innovationCenter(L) {
  L.cyl(0, 0, 0, 30, 2, C.ltgray, { seg: 24 });
  L.cyl(0, 2, 0, 26, 14, 0x6ac0e8, { seg: 24, matOpts: { trans: true, opacity: 0.6, rough: 0.1 } });
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; L.boxB(Math.cos(a) * 26.2, 2, Math.sin(a) * 26.2, 0.8, 14, 0.8, C.white); }
  L.cyl(0, 16, 0, 27, 2, C.white, { seg: 24 });
  L.sphere(0, 18, 0, 22, 0x8ad0f0, { sy: 0.55, matOpts: { trans: true, opacity: 0.55, rough: 0.1 } });
  for (let k = 0; k < 8; k++) L.box(0, 18 + 6, 0, 0.6, 12, 44, C.white, { ry: k / 8 * Math.PI, rx: 0 });
  L.cyl(0, 29.5, 0, 3, 2, C.white, { seg: 12 });
  L.boxB(0, 2, 27, 18, 12, 4, C.white);
  L.boxB(0, 3, 29.1, 14, 8, 0.3, C.azure, { matOpts: { trans: true, opacity: 0.6 } });
}

// Tall electric paddock fence between two points
export function paddockFence(L, x1, z1, x2, z2, h = 12) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
  const n = Math.max(1, Math.round(len / 8));
  for (let k = 0; k <= n; k++) {
    const x = x1 + dx * k / n, z = z1 + dz * k / n;
    L.boxB(x, 0, z, 1.2, h, 1.2, C.dkgray);
    L.boxB(x, h, z, 1.6, 0.6, 1.6, C.yellow);
    if (k % 3 === 1) { L.boxB(x, h * 0.55, z, 1.3, 1.2, 1.3, C.yellow); L.boxB(x, h * 0.55 + 0.4, z, 1.35, 0.4, 1.35, C.black); }
  }
  for (let y = 1.5; y < h; y += 1.6) L.box((x1 + x2) / 2, y, (z1 + z2) / 2, 0.15, 0.15, len, C.ltgray, { ry });
}

// T. rex skeleton for the Visitor Center rotunda
export function rexSkeleton(L, x, z, ry, s = 1) {
  const P = new Local(L.b, x, 0, z, ry, s), bone = 0xe8dcc0;
  P.boxB(0, 0, 0, 7, 0.6, 14, C.dkgray);
  for (let k = 0; k < 14; k++) { const zz = 9 - k * 1.6; P.box(0, 9.5 + Math.sin(k / 13 * Math.PI) * 1.2 - Math.max(0, k - 8) * 0.9, zz, 0.6, 0.8, 1.2, bone); }
  for (let k = 0; k < 7; k++) { const zz = 7.5 - k * 1.1; for (const sd of [-1, 1]) P.box(sd * 1.1, 8, zz, 0.25, 3.2 - Math.abs(k - 3) * 0.3, 0.3, bone, { rz: sd * 0.35 }); }
  P.box(0, 12.6, 10.5, 0.6, 0.6, 3.5, bone, { rx: -0.8 });
  P.box(0, 13.6, 13.4, 2.2, 2.4, 3.8, bone);
  P.box(0, 13.9, 13.6, 2.3, 1.2, 1.4, C.black);
  P.box(0, 12.2, 13.9, 1.8, 0.5, 3.6, bone, { rx: 0.35 });
  for (const sd of [-1, 1]) {
    P.box(sd * 1.1, 7.2, 0.5, 0.5, 4, 0.6, bone, { rx: 0.2 });
    P.box(sd * 1.1, 3.4, -0.4, 0.4, 3.6, 0.4, bone, { rx: -0.3 });
    P.boxB(sd * 1.1, 0.6, 0.6, 0.9, 0.4, 2.2, bone);
    P.boxB(sd * 1.1, 0.6, -0.2, 0.25, 9, 0.25, C.dkgray);
  }
}
