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

export function dilophosaurus() {
  const c = { body: 0x9aa844, spot: 0x3e4a1c, belly: 0xd8d08a, crest: C.red, frill: C.yellow, rim: C.red };
  const r = { root: new THREE.Group() };
  r.bodyP = pivot(r.root, 0, 0, 0);
  r.bodyP.add(part((L) => {
    L.box(0, 2.0, 0, 1.0, 1.1, 2.4, c.body, { rx: -0.1 });
    L.box(0, 1.5, 0.2, 0.8, 0.3, 2.0, c.belly);
    L.box(0, 2.85, 1.4, 0.6, 1.7, 0.6, c.body, { rx: 0.4 });
    L.box(0, 2.0, -2.3, 0.7, 0.7, 2.6, c.body, { rx: -0.1 });
    L.box(0, 2.3, -4.2, 0.4, 0.4, 1.8, c.body, { rx: -0.2 });
    for (const [x, y, z] of [[0.51, 2.2, 0.5], [-0.51, 2.3, -0.4], [0.51, 1.9, -0.8], [-0.51, 1.8, 0.7], [0, 2.56, -0.2], [0.36, 2.1, -2.2]]) L.box(x, y, z, 0.06, 0.25, 0.3, c.spot);
    for (const sd of [-1, 1]) {
      L.box(sd * 0.45, 1.8, 1.2, 0.18, 0.8, 0.2, c.body, { rx: -0.9 });
      L.box(sd * 0.35, 1.25, -0.2, 0.4, 0.9, 0.7, c.body);
      L.box(sd * 0.35, 0.5, -0.35, 0.25, 0.9, 0.25, c.body, { rx: -0.2 });
      L.box(sd * 0.35, 0.08, -0.1, 0.35, 0.16, 0.7, c.body);
    }
  }, 'dilo-body'));
  r.head = pivot(r.bodyP, 0, 3.6, 1.7);
  r.head.add(part((L) => {
    L.box(0, 0, 0.6, 0.6, 0.6, 1.4, c.body);
    L.box(0, -0.1, 1.5, 0.45, 0.4, 0.7, c.body);
    for (const sd of [-1, 1]) {
      L.box(sd * 0.18, 0.55, 0.6, 0.07, 0.55, 1.3, c.crest, { rx: 0.15 });
      L.box(sd * 0.31, 0.12, 0.5, 0.04, 0.16, 0.2, C.black);
    }
    L.box(0, -0.28, 1.1, 0.46, 0.08, 1.2, C.dkred);
  }, 'dilo-head'));
  const frill = (sd) => part((L) => {
    for (let k = 0; k < 5; k++) {
      const a = -1.2 + k * 0.6;
      L.box(0, Math.sin(a) * 0.55, -0.6 * Math.cos(a) - 0.1, 0.05, 0.75, 0.9, k % 2 ? c.frill : 0xe07a20, { rx: a });
      L.box(0, Math.sin(a) * 1.05, -1.1 * Math.cos(a) - 0.1, 0.07, 0.2, 0.5, c.rim, { rx: a });
    }
  }, 'dilo-frill' + sd);
  r.frillL = pivot(r.head, 0.32, -0.05, 0.3, frill(1));
  r.frillR = pivot(r.head, -0.32, -0.05, 0.3, frill(-1));
  return r;
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
