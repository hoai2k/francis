// Jurassic World dinosaur drivers: compact seated brick dinosaurs in the driver-rig
// format (see ../driver.js). Each builder returns a rig whose torso is the seated body,
// head sits on a neck pivot with a jaw, the tail sways behind over the engine and the
// forelimbs are the arm pivots that reach the steering wheel.
// Colours follow the Jurassic map creatures in ../maps/jurassic-props.js.
import { THREE, BrickBuilder, C, taperGeo } from './kit.js';
import { Local, RAPTORS } from '../maps/jurassic-props.js';

const S = Math.sin, PI = Math.PI;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

// a merged brick part built through a scaled Local frame (centre-based rotatable boxes)
export function prt(fn, name, k = 1) {
  const b = new BrickBuilder(1);
  fn(new Local(b, 0, 0, 0, 0, k));
  return b.build({ name, shadows: false });
}
export function pv(parent, x, y, z, child) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (child) g.add(child);
  parent.add(g);
  return g;
}
// tails drape out over the driver's right-hand side wall so the driver stays visible
// from the chase camera (the animator sways them around this rest yaw)
const TAIL_YAW = 0.85;
const glow = (c, k = 1.6) => ({ matOpts: { emissive: c, emissiveIntensity: k } });
const TONGUE = 0xd04a4a;
function teeth(L, xs, y, z0, z1, step, w = 0.06, h = 0.1) {
  for (let z = z0; z <= z1 + 1e-6; z += step) for (const x of xs) L.box(x, y, z, w, h, w, C.white);
}
// seated haunches: hips, thighs along the seat and shins dropping into the footwell
function haunches(L, col, hw, th, z0 = 0) {
  L.box(0, 0.06, -0.05 + z0, hw * 2 + th * 0.4, 0.46, 0.85, col);
  for (const sd of [-1, 1]) {
    L.box(sd * hw, 0.12, 0.3 + z0, th, th * 1.05, 0.95, col);
    L.box(sd * hw, -0.18, 0.72 + z0, th * 0.8, 0.46, th * 0.7, col);
  }
}
// tail rising gently from the back of the seat over the engine (local -Z)
function tailPart(L, col, w, len, dark, o = {}) {
  const n = 4, segs = [];
  let y = 0, z = 0;
  for (let i = 0; i < n; i++) {
    const a = (o.rise ?? 0.32) - i * 0.09, l = len / n * (i === 0 ? 1.1 : 1), ww = w * (1 - i * 0.2);
    const cz = z - Math.cos(a) * l / 2, cy = y + S(a) * l / 2;
    L.box(0, cy, cz, ww, ww * 0.9, l * 1.05, col, { rx: a });
    if (dark && i < 3) L.box(0, cy + ww * 0.46, cz, ww * 0.35, 0.04, l * 0.9, dark, { rx: a });
    segs.push([cy, cz, ww, a]);
    z -= Math.cos(a) * l; y += S(a) * l;
  }
  return segs;
}

// ---------------------------------------------------------------------------------
// Big theropods: T. rex, Indominus rex, Spinosaurus
// ---------------------------------------------------------------------------------
export function bigTheropod(c) {
  const k = c.k ?? 1;
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  torso.add(prt((L) => {
    haunches(L, c.body, 0.42, 0.52);
    L.box(0, 0.7, 0, 1.36, 1.1, 1.0, c.body, { rx: 0.18 });
    L.box(0, 1.22, 0.14, 1.16, 0.72, 0.9, c.body, { rx: 0.35 });
    L.box(0, 0.8, 0.5, 0.94, 1.0, 0.1, c.belly, { rx: 0.2 });
    L.box(0, 1.56, 0.28, 0.8, 0.66, 0.72, c.body, { rx: 0.55 });
    L.box(0, 1.46, 0.6, 0.56, 0.46, 0.1, c.belly, { rx: 0.6 });
    for (const y of [0.45, 0.75, 1.05]) for (const sd of [-1, 1]) L.box(sd * 0.69, y, -0.12, 0.03, 0.1, 0.55, c.dark, { rx: 0.18 });
    for (const sd of [-1, 1]) L.box(sd * 0.59, 1.28, 0.05, 0.03, 0.09, 0.5, c.dark, { rx: 0.35 });
    if (c.spikes) {
      const sp = [[0.35, -0.53], [0.65, -0.5], [0.95, -0.44], [1.22, -0.33], [1.48, -0.16], [1.72, 0.0]];
      for (const [y, z] of sp) L.box(0, y, z - 0.06, 0.14, 0.22, 0.14, c.spikes, { rx: -0.9 });
    }
    if (c.sail) {
      // the spine sail fans out behind the upright back, up over the shoulders
      const n = 8;
      for (let i = 0; i < n; i++) {
        const th = -0.1 + i * 0.26, r = 1.5 - Math.abs(i - 1.5) * 0.12, dy = Math.cos(th), dz = -S(th);
        L.box(0, 1.05 + dy * r * 0.55, -0.45 + dz * r * 0.55, 0.06, r * 0.9, 0.42, i % 2 ? c.sail : c.sail2, { rx: -th });
        L.box(0, 1.05 + dy * r * 0.6, -0.45 + dz * r * 0.6, 0.09, r, 0.06, c.dark, { rx: -th });
      }
    }
  }, 'rex-torso', k));
  // head on the neck pivot, jaw under it
  const head = pv(torso, 0, 1.8 * k, (c.croc ? 0.22 : 0.27) * k);
  head.add(prt((L) => {
    if (c.croc) {
      L.box(0, 0.18, 0.08, 0.64, 0.56, 0.62, c.body);
      L.box(0, 0.06, 0.62, 0.38, 0.28, 0.72, c.body);
      L.box(0, 0.24, 0.92, 0.28, 0.12, 0.14, c.dark);
      L.box(0, 0.42, 0.15, 0.28, 0.12, 0.5, c.dark);
      L.box(0, -0.09, 0.5, 0.32, 0.03, 0.8, c.mouth);
      teeth(L, [-0.16, 0.16], -0.13, 0.25, 0.92, 0.1, 0.05, 0.09);
      for (const sd of [-1, 1]) {
        L.box(sd * 0.32, 0.3, 0.12, 0.03, 0.1, 0.14, c.eye, c.eyeGlow ? glow(c.eye, 2) : {});
        L.box(sd * 0.335, 0.3, 0.13, 0.02, 0.08, 0.05, C.black);
      }
    } else {
      L.box(0, 0.2, 0.16, 0.86, 0.62, 0.78, c.body);
      L.box(0, 0.1, 0.66, 0.72, 0.42, 0.44, c.body);
      L.box(0, 0.32, 0.88, 0.5, 0.08, 0.06, c.dark);
      L.box(0, -0.12, 0.42, 0.66, 0.04, 0.86, c.mouth);
      teeth(L, [-0.31, 0.31], -0.17, 0.08, 0.8, 0.12, 0.06, 0.1);
      for (const x of [-0.18, 0, 0.18]) L.box(x, -0.16, 0.86, 0.06, 0.1, 0.06, C.white);
      for (const sd of [-1, 1]) {
        L.box(sd * 0.27, 0.54, 0.14, 0.28, 0.12, 0.42, c.dark);
        L.box(sd * 0.432, 0.33, 0.15, 0.03, 0.12, 0.16, c.eye, c.eyeGlow ? glow(c.eye, 2.2) : {});
        L.box(sd * 0.445, 0.33, 0.16, 0.02, 0.1, 0.05, C.black);
        L.box(sd * 0.2, 0.32, 0.87, 0.08, 0.04, 0.04, C.black);
        if (c.spikes) for (const z of [-0.08, 0.12, 0.32]) L.box(sd * 0.3, 0.63, z, 0.09, 0.12, 0.09, c.spikes, { rx: -0.4 });
      }
    }
  }, 'rex-head', k));
  const jaw = pv(head, 0, -0.12 * k, -0.08 * k);
  jaw.add(prt((L) => {
    if (c.croc) {
      L.box(0, -0.06, 0.52, 0.36, 0.14, 1.05, c.body);
      L.box(0, 0.015, 0.5, 0.24, 0.03, 0.9, TONGUE);
      teeth(L, [-0.14, 0.14], 0.04, 0.3, 0.95, 0.1, 0.05, 0.08);
    } else {
      L.box(0, -0.1, 0.42, 0.7, 0.2, 0.92, c.body);
      L.box(0, -0.21, 0.4, 0.62, 0.04, 0.8, c.belly);
      L.box(0, 0.005, 0.4, 0.46, 0.03, 0.7, TONGUE);
      teeth(L, [-0.28, 0.28], 0.04, 0.18, 0.78, 0.12, 0.055, 0.09);
    }
  }, 'rex-jaw', k));
  // forelimbs: tiny rex arms or long clawed Indominus / Spinosaurus arms
  const arms = [];
  const long = c.arm === 'long', aY = long ? 1.16 : 1.12, aZ = long ? 0.42 : 0.5;
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * (long ? 0.6 : 0.45) * k, aY * k, aZ * k);
    a.add(prt((L) => {
      if (long) {
        L.box(0, -0.2, 0, 0.17, 0.44, 0.17, c.body);
        L.box(0, -0.5, 0.02, 0.13, 0.3, 0.13, c.body);
        for (const x of [-0.05, 0, 0.05]) L.box(x, -0.7, 0.05, 0.035, 0.14, 0.035, c.claw ?? c.dark, { rx: -0.4 });
      } else {
        L.box(0, -0.1, 0, 0.14, 0.26, 0.14, c.body);
        L.box(0, -0.25, 0.03, 0.11, 0.1, 0.11, c.body);
        for (const x of [-0.03, 0.03]) L.box(x, -0.33, 0.06, 0.03, 0.08, 0.03, c.dark, { rx: -0.5 });
      }
    }, 'rex-arm', k));
    arms.push(a);
  }
  const tail = pv(torso, 0, 0.72 * k, -0.4 * k);
  tail.rotation.y = TAIL_YAW;
  tail.add(prt((L) => {
    const segs = tailPart(L, c.body, 0.78, 2.0, c.dark, { rise: 0.16 });
    if (c.spikes) for (const [y, z, w, a] of segs.slice(0, 3)) L.box(0, y + w * 0.5, z, 0.1, 0.16, 0.1, c.spikes, { rx: a - 0.8 });
    if (c.sail) L.box(0, segs[0][0] + 0.45, segs[0][1] + 0.1, 0.06, 0.3, 0.6, c.sail2, { rx: segs[0][3] });
  }, 'rex-tail', k));
  return { root, torso, head, jaw, jawOpen: 0.75, tail, armL: arms[0], armR: arms[1], armLen: (long ? 0.68 : 0.32) * k, height: (1.8 + 0.6) * k + (c.sail ? 0.1 : 0), width: 1.45 * k };
}

// ---------------------------------------------------------------------------------
// Small theropods: velociraptors (Blue, Delta, ...)
// ---------------------------------------------------------------------------------
export function smallTheropod(c) {
  const k = c.k ?? 1;
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  torso.add(prt((L) => {
    haunches(L, c.body, 0.25, 0.32);
    L.box(0, 0.55, 0, 0.8, 0.82, 0.7, c.body, { rx: 0.22 });
    L.box(0, 0.96, 0.13, 0.66, 0.5, 0.6, c.body, { rx: 0.4 });
    L.box(0, 0.62, 0.36, 0.6, 0.7, 0.06, c.belly, { rx: 0.22 });
    L.box(0, 1.24, 0.3, 0.36, 0.62, 0.36, c.body, { rx: 0.42 });
    L.box(0, 1.2, 0.47, 0.24, 0.5, 0.04, c.belly, { rx: 0.42 });
    if (c.stripe) {
      for (const sd of [-1, 1]) { L.box(sd * 0.402, 0.62, -0.02, 0.03, 0.08, 0.62, c.stripe, { rx: 0.22 }); L.box(sd * 0.402, 0.85, 0.06, 0.03, 0.08, 0.5, c.stripe, { rx: 0.22 }); }
      L.box(0, 0.7, -0.36, 0.12, 0.85, 0.04, c.stripe, { rx: 0.22 });
    }
    if (c.spot) for (const [x, y, z] of [[0.402, 0.5, 0.1], [-0.402, 0.75, -0.1], [0.402, 0.85, -0.15], [-0.402, 0.4, 0.15], [0.335, 1.05, 0.0], [-0.335, 1.0, 0.2]]) L.box(x, y, z, 0.03, 0.12, 0.14, c.spot);
  }, 'raptor-torso', k));
  const head = pv(torso, 0, 1.5 * k, 0.44 * k);
  head.add(prt((L) => {
    L.box(0, 0.1, 0.08, 0.4, 0.36, 0.46, c.body);
    L.box(0, 0.03, 0.45, 0.31, 0.24, 0.44, c.body);
    L.box(0, -0.085, 0.33, 0.26, 0.03, 0.62, TONGUE);
    teeth(L, [-0.13, 0.13], -0.12, 0.2, 0.62, 0.07, 0.035, 0.06);
    for (const sd of [-1, 1]) {
      L.box(sd * 0.2, 0.18, 0.08, 0.03, 0.09, 0.12, c.eye);
      L.box(sd * 0.21, 0.18, 0.1, 0.02, 0.08, 0.035, C.black);
      L.box(sd * 0.15, 0.27, 0.06, 0.12, 0.06, 0.26, c.dark ?? c.body);
      if (c.stripe) L.box(sd * 0.158, 0.06, 0.42, 0.02, 0.05, 0.42, c.stripe);
    }
    if (c.stripe) L.box(0, 0.285, 0.18, 0.1, 0.02, 0.5, c.stripe);
  }, 'raptor-head', k));
  const jaw = pv(head, 0, -0.07 * k, 0.04 * k);
  jaw.add(prt((L) => {
    L.box(0, -0.05, 0.34, 0.28, 0.1, 0.6, c.belly);
    L.box(0, 0.005, 0.32, 0.2, 0.02, 0.5, TONGUE);
    teeth(L, [-0.11, 0.11], 0.02, 0.15, 0.55, 0.08, 0.03, 0.05);
  }, 'raptor-jaw', k));
  const arms = [];
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * 0.31 * k, 0.98 * k, 0.32 * k);
    a.add(prt((L) => {
      L.box(0, -0.15, 0, 0.13, 0.32, 0.13, c.body);
      L.box(0, -0.38, 0.03, 0.1, 0.22, 0.1, c.body);
      for (const x of [-0.03, 0.03]) L.box(x, -0.53, 0.06, 0.025, 0.12, 0.025, C.black, { rx: -0.5 });
      if (c.stripe) L.box(sd * 0.066, -0.15, 0, 0.01, 0.25, 0.04, c.stripe);
    }, 'raptor-arm', k));
    arms.push(a);
  }
  const tail = pv(torso, 0, 0.6 * k, -0.3 * k);
  tail.rotation.y = TAIL_YAW;
  tail.add(prt((L) => { tailPart(L, c.body, 0.42, 1.9, c.stripe ?? c.spot, { rise: 0.14 }); }, 'raptor-tail', k));
  return { root, torso, head, jaw, jawOpen: 0.8, tail, armL: arms[0], armR: arms[1], armLen: 0.5 * k, height: 1.82 * k, width: 0.9 * k };
}

// point on the front (s = 1) or back (s = -1) face of a box of depth d centred at (y, z), tilted rx = a
const face = (y, z, d, a, s = 1) => [y - s * d / 2 * S(a), z + s * d / 2 * Math.cos(a)];
// a radial wedge of a fan in the local X-Y plane: from radius r0 to r1 around angle a (0 = up,
// sd = which side it sweeps to), da wide, as a tapered box so neighbouring wedges close up
function wedge(L, sd, a, da, r0, r1, z, th, col, o) {
  const t = Math.tan(da / 2) * 2;
  L.put(taperGeo(+(r0 * t * 1.1 + 0.01).toFixed(3), +(r1 * t * 1.06).toFixed(3), +(r1 - r0).toFixed(3), th), col, sd * S(a) * r0, Math.cos(a) * r0, z, 0, 0, -sd * a, 1, 1, 1, o);
}
// a box laid along the fan's radius from r0 to r1 at angle a
function ray(L, sd, a, r0, r1, z, w, th, col) {
  const r = (r0 + r1) / 2;
  L.box(sd * S(a) * r, Math.cos(a) * r, z, w, r1 - r0, th, col, { rz: -sd * a });
}

// ---------------------------------------------------------------------------------
// Dilophosaurus: slim spotted spitter with twin red crests and the famous neck frill,
// folded flat along the neck until it fans open around the head to rattle and spit
// ---------------------------------------------------------------------------------
export function dilophosaurusDriver(o = {}) {
  const c = {
    body: 0x7a9230, dark: 0x4a5a1a, spot: 0x323e16, stripe: 0xe0c440, belly: 0xe6d890,
    crest: 0xd42a16, crestDk: 0x2a1610, eye: 0xf4b018,
    frillA: 0xf8c81c, frillB: 0xf28418, frillC: 0xc91a09, rib: 0x5a160c, frillSpot: 0x1e1a14, ...o,
  };
  const k = c.k ?? 1;
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  const HY = 1.8, HZ = 0.46;   // neck top (head pivot)
  torso.add(prt((L) => {
    haunches(L, c.body, 0.26, 0.33);
    for (const sd of [-1, 1]) {
      for (const [y, z, s] of [[0.2, 0.12, 0.12], [0.06, 0.42, 0.09], [0.24, 0.55, 0.07], [0.0, 0.7, 0.08]]) L.box(sd * 0.428, y, z, 0.02, s, s * 1.2, c.spot);
      L.box(sd * 0.428, 0.2, 0.32, 0.02, 0.05, 0.42, c.stripe);
    }
    // slim body, chest and an S-curved neck
    L.box(0, 0.55, -0.02, 0.76, 0.84, 0.68, c.body, { rx: 0.22 });
    L.box(0, 0.98, 0.12, 0.6, 0.5, 0.56, c.body, { rx: 0.4 });
    { const [y, z] = face(0.58, -0.02, 0.68, 0.22); L.box(0, y, z, 0.56, 0.72, 0.04, c.belly, { rx: 0.22 }); }
    { const [y, z] = face(0.98, 0.12, 0.56, 0.4); L.box(0, y, z, 0.4, 0.4, 0.04, c.belly, { rx: 0.4 }); }
    const neck = [[1.24, 0.27, 0.36, 0.44, 0.36, 0.45], [1.48, 0.37, 0.3, 0.38, 0.3, 0.15], [1.68, 0.43, 0.26, 0.3, 0.26, -0.12]];
    for (const [y, z, w, h, d, a] of neck) {
      L.box(0, y, z, w, h, d, c.body, { rx: a });
      const [fy, fz] = face(y, z, d, a);
      L.box(0, fy, fz, w * 0.6, h * 0.95, 0.03, c.belly, { rx: a });
      const [by, bz] = face(y, z, d, a, -1);
      L.box(0, by, bz, w * 0.4, h * 0.6, 0.03, c.dark, { rx: a });
      for (const sd of [-1, 1]) L.box(sd * (w / 2 + 0.005), y + 0.04 * sd, z - 0.04, 0.02, 0.06, 0.07, c.spot);
    }
    // dark saddle bands across the back, pale stripes and leopard spots along the flanks
    for (const [y, w] of [[0.3, 0.5], [0.52, 0.56], [0.74, 0.6], [0.98, 0.5]]) {
      const [by, bz] = y < 0.9 ? face(y, -0.02, 0.68, 0.22, -1) : face(y, 0.12, 0.56, 0.4, -1);
      L.box(0, by, bz, w, 0.1, 0.03, c.dark, { rx: y < 0.9 ? 0.22 : 0.4 });
      for (const sd of [-1, 1]) L.box(sd * 0.1, by + 0.06, bz - 0.01, 0.08, 0.05, 0.03, c.spot, { rx: 0.22 });
    }
    for (const sd of [-1, 1]) {
      L.box(sd * 0.385, 0.66, 0.0, 0.02, 0.05, 0.6, c.stripe, { rx: 0.22 });
      L.box(sd * 0.305, 1.02, 0.1, 0.02, 0.05, 0.42, c.stripe, { rx: 0.4 });
      for (let i = 0; i < 9; i++) {
        const y = 0.24 + (i % 3) * 0.2 + 0.06 * (i % 2), z = -0.26 + Math.floor(i / 3) * 0.2 + 0.05 * ((i * 7) % 3);
        const s = 0.07 + ((i * 5) % 3) * 0.025;
        L.box(sd * 0.385, y + (y > 0.6 ? -0.03 : 0.03), z, 0.02, s, s * 1.15, c.spot, { rx: 0.22 });
      }
      for (const [y, z] of [[0.92, -0.06], [1.08, 0.16], [0.96, 0.28]]) L.box(sd * 0.305, y, z, 0.02, 0.07, 0.08, c.spot, { rx: 0.4 });
    }
  }, 'dilo-torso', k));

  // head: small and narrow with a kinked snout, big yellow eyes and the twin crests
  const hk = k * 1.1, head = pv(torso, 0, HY * k, HZ * k);
  head.add(prt((L) => {
    L.box(0, 0.1, 0.04, 0.38, 0.34, 0.42, c.body);
    L.box(0, 0.05, 0.4, 0.28, 0.24, 0.36, c.body);
    L.box(0, 0.03, 0.64, 0.24, 0.22, 0.16, c.body);
    L.box(0, -0.1, -0.02, 0.28, 0.12, 0.3, c.belly);
    L.box(0, -0.075, 0.38, 0.22, 0.02, 0.56, 0x7a1a14);
    // the subnarial notch: a kink in the upper jaw
    for (const sd of [-1, 1]) L.box(sd * 0.115, -0.065, 0.56, 0.03, 0.05, 0.05, c.dark);
    teeth(L, [-0.1, 0.1], -0.1, 0.24, 0.5, 0.065, 0.028, 0.05);
    teeth(L, [-0.09, 0.09], -0.1, 0.62, 0.68, 0.06, 0.026, 0.05);
    for (const sd of [-1, 1]) {
      // eye: yellow iris with a slit pupil under a dark brow, eye-stripe behind it
      L.box(sd * 0.191, 0.15, 0.12, 0.02, 0.12, 0.13, c.eye);
      L.box(sd * 0.199, 0.15, 0.13, 0.015, 0.1, 0.035, C.black);
      L.box(sd * 0.2, 0.17, 0.1, 0.012, 0.03, 0.025, C.white);
      L.box(sd * 0.17, 0.235, 0.1, 0.07, 0.04, 0.2, c.dark);
      L.box(sd * 0.192, 0.11, -0.08, 0.015, 0.05, 0.18, c.crestDk);
      L.box(sd * 0.142, 0.0, 0.34, 0.015, 0.035, 0.22, c.dark);
      for (const [y, z] of [[0.04, 0.0], [0.2, -0.1], [0.06, 0.18]]) L.box(sd * 0.192, y, z, 0.015, 0.045, 0.05, c.spot);
      L.box(sd * 0.06, 0.142, 0.67, 0.035, 0.01, 0.04, c.spot);
      // twin crests: thin red plates arcing over the snout and skull, edged and striped dark
      for (let i = 0; i < 9; i++) {
        const z = 0.62 - i * 0.09, top = 0.2 + 0.21 * S(PI * (0.68 - z) / 0.9);
        const base = (z > 0.24 ? 0.17 : 0.27) - 0.02, h = top - base, tl = 0.3;
        L.box(sd * (0.09 + h * S(tl) / 2), base + h / 2, z, 0.03, h, 0.11, c.crest, { rz: -sd * tl });
        L.box(sd * (0.09 + h * S(tl)), base + h * Math.cos(tl), z, 0.034, 0.025, 0.11, c.crestDk, { rz: -sd * tl });
        if (i % 2) L.box(sd * (0.106 + h * S(tl) * 0.45), base + h * 0.45, z, 0.008, h * 0.6, 0.022, c.crestDk, { rz: -sd * tl, rx: 0.4 });
      }
    }
    L.box(0, 0.275, 0.0, 0.1, 0.02, 0.3, c.dark);
  }, 'dilo-head', hk));
  const jaw = pv(head, 0, -0.075 * hk, 0.06 * hk);
  jaw.add(prt((L) => {
    L.box(0, -0.05, 0.3, 0.24, 0.1, 0.56, c.belly);
    L.box(0, -0.035, 0.3, 0.25, 0.04, 0.52, c.body);
    L.box(0, 0.005, 0.3, 0.17, 0.02, 0.46, TONGUE);
    teeth(L, [-0.095, 0.095], 0.025, 0.14, 0.52, 0.07, 0.026, 0.045);
  }, 'dilo-jaw', hk));

  const arms = [];
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * 0.3 * k, 1.0 * k, 0.3 * k);
    a.add(prt((L) => {
      L.box(0, -0.15, 0, 0.12, 0.32, 0.12, c.body);
      L.box(0, -0.38, 0.03, 0.1, 0.22, 0.1, c.body);
      L.box(sd * 0.061, -0.12, 0.0, 0.01, 0.07, 0.06, c.spot);
      L.box(0, -0.4, 0.081, 0.06, 0.16, 0.01, c.belly);
      for (const x of [-0.035, 0, 0.035]) L.box(x, -0.53, 0.06, 0.022, 0.12, 0.022, C.black, { rx: -0.5 });
    }, 'dilo-arm', k));
    arms.push(a);
  }
  const tail = pv(torso, 0, 0.6 * k, -0.3 * k);
  tail.rotation.y = TAIL_YAW;
  tail.add(prt((L) => {
    const segs = tailPart(L, c.body, 0.44, 2.0, c.dark, { rise: 0.14 });
    segs.forEach(([y, z, w, a], i) => {
      L.box(0, y, z - 0.05, w * 1.04, w * 0.94, 0.07, c.spot, { rx: a });
      if (i < 3) for (const sd of [-1, 1]) L.box(sd * w * 0.52, y - w * 0.1, z + 0.12, 0.02, w * 0.2, w * 0.25, c.spot, { rx: a });
    });
  }, 'dilo-tail', k));

  // the frill: two fan halves on the neck. Folded, each lies back flat along the neck as a
  // small ribbed flap; open, they swing forward and spread into a ring around the head.
  const halves = [];
  for (const sd of [1, -1]) {
    const h = pv(head, 0, 0, -0.08 * k, prt((L) => {
      const n = 7, a0 = 0.02, a1 = 2.62, da = (a1 - a0) / n, r0 = 0.08;
      const rad = (a) => 0.72 + 0.14 * S(Math.min(PI, a * 1.25));
      for (let i = 0; i < n; i++) {
        const a = a0 + (i + 0.5) * da, R = rad(a);
        wedge(L, sd, a, da, r0, R * 0.4, 0, 0.03, c.frillB);
        wedge(L, sd, a, da, R * 0.4, R * 0.9, 0, 0.03, i % 2 ? c.frillA : 0xfbd84a);
        wedge(L, sd, a, da, R * 0.9, R, 0, 0.03, c.frillC);
        // orange-red stripes radiating out and dark eye-spots near the rim (both faces)
        ray(L, sd, a, R * 0.3, R * 0.62, 0.02, 0.03, 0.012, c.frillB);
        ray(L, sd, a, R * 0.3, R * 0.62, -0.02, 0.03, 0.012, c.frillB);
        for (const zz of [0.022, -0.022]) {
          const sa = a + da * 0.28, sr = R * 0.7;
          L.box(sd * S(sa) * sr, Math.cos(sa) * sr, zz, 0.06, 0.06, 0.012, c.frillSpot, { rz: -sd * sa });
          const sb = a - da * 0.25, sr2 = R * 0.56;
          L.box(sd * S(sb) * sr2, Math.cos(sb) * sr2, zz, 0.04, 0.04, 0.012, c.frillC, { rz: -sd * sb });
        }
      }
      // dark ribs between the panels, poking past the rim
      for (let i = 0; i <= n; i++) {
        const a = a0 + i * da;
        ray(L, sd, a, r0, rad(a) + 0.08, 0, 0.03, 0.05, c.rib);
      }
    }, 'dilo-frill', k));
    halves.push([h, sd]);
  }
  // a glob of venom spit
  const spit = pv(head, 0, -0.02 * k, 0.76 * k, prt((L) => {
    L.sphere(0, 0, 0, 0.08, 0x9cff3a, glow(0x6ad010, 1.4));
    L.sphere(0.05, 0.06, -0.12, 0.05, 0x9cff3a, glow(0x6ad010, 1.4));
    L.sphere(-0.04, -0.03, -0.22, 0.04, 0x9cff3a, glow(0x6ad010, 1.4));
  }, 'dilo-spit', k));
  spit.visible = false;
  let open = 0, last = null;
  const pose = (t) => {
    const e = smooth(open), s = 0.24 + 0.76 * e + 0.14 * S(e * PI), shake = e * S(t * 34);
    for (const [h, sd] of halves) {
      h.rotation.set(-0.08 * e, sd * (PI / 2 - 0.12) * (1 - e) - sd * 0.38 * e, shake * 0.06 * sd);
      h.position.x = sd * (0.15 - 0.11 * e) * k; h.position.y = (-0.1 + 0.14 * e) * k;
      h.scale.set(s * (1 + shake * 0.03), s * (1 + shake * 0.03), 1);
    }
  };
  pose(0);
  const fx = (name, f, t) => {
    const dt = last == null ? 0.016 : Math.max(0, Math.min(0.1, t - last)); last = t;
    const want = name === 'win' || (name === 'cheer' && f < 0.9) || (name === 'taunt' && f < 0.88) || (name === 'yay' && f < 0.8);
    open += ((want ? 1 : 0) - open) * Math.min(1, dt * (want ? 9 : 5));
    pose(t);
    const sp = name === 'cheer' ? (f - 0.4) / 0.42 : -1;
    spit.visible = sp > 0 && sp < 1;
    if (spit.visible) spit.position.set(0, (-0.02 + sp * 0.5 - sp * sp * 1.1) * k, (0.76 + sp * 2.6) * k);
  };
  return { root, torso, head, jaw, jawOpen: 0.8, tail, armL: arms[0], armR: arms[1], armLen: 0.52 * k, height: HY * k + 0.5 * hk, width: 0.92 * k, fx };
}

// ---------------------------------------------------------------------------------
// T. rex (Rexy): a huge deep-jawed head with heavy brows on a thick neck, drumstick
// thighs, tiny two-fingered arms, dark back stripes and old raptor scars
// ---------------------------------------------------------------------------------
export function trexDriver(o = {}) {
  const c = {
    body: 0x6e543a, back: 0x3c2c1e, dark: 0x2a1e14, belly: 0xb49a72, belly2: 0x8e7656, scar: 0xd8bca4,
    brow: 0x54402c, eye: 0xffb020, mouth: 0x5a1210, tooth: 0xf2e8cc, ...o,
  };
  const k = c.k ?? 1;
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  const HY = 2.02, HZ = 0.62;   // neck top (head pivot)
  torso.add(prt((L) => {
    // hips and big drumstick thighs along the seat, shins down into the footwell
    L.box(0, 0.12, -0.1, 1.2, 0.6, 0.92, c.body);
    for (const sd of [-1, 1]) {
      L.box(sd * 0.47, 0.22, 0.22, 0.56, 0.6, 1.0, c.body);
      L.box(sd * 0.48, 0.38, -0.08, 0.6, 0.62, 0.66, c.body, { rx: -0.35 });
      L.box(sd * 0.46, -0.16, 0.72, 0.42, 0.6, 0.42, c.body);
      L.box(sd * 0.46, -0.4, 0.96, 0.42, 0.14, 0.34, c.belly2);
      for (const x of [-0.12, 0, 0.12]) L.box(sd * 0.46 + x, -0.4, 1.15, 0.08, 0.08, 0.08, c.tooth);
      for (const [z, y] of [[-0.2, 0.42], [0.05, 0.36], [0.3, 0.3]]) L.box(sd * 0.786, y, z, 0.02, 0.42, 0.09, c.back, { rx: -0.25 });
      L.box(sd * 0.475, 0.2, 0.725, 0.36, 0.38, 0.02, c.belly2);
    }
    // barrel body, deep chest and a thick S-necked shoulder line
    L.box(0, 0.8, -0.04, 1.36, 1.0, 1.1, c.body, { rx: 0.14 });
    L.box(0, 1.3, 0.12, 1.18, 0.66, 0.98, c.body, { rx: 0.32 });
    L.box(0, 1.66, 0.34, 0.92, 0.64, 0.8, c.body, { rx: 0.55 });
    L.box(0, 1.92, 0.5, 0.8, 0.46, 0.64, c.body, { rx: 0.25 });
    // khaki belly and throat with scale lines
    { const [y, z] = face(0.8, -0.04, 1.1, 0.14); L.box(0, y, z, 0.98, 0.94, 0.06, c.belly, { rx: 0.14 }); for (const dy of [-0.3, -0.1, 0.1, 0.3]) L.box(0, y + dy, z + 0.032 - dy * 0.14, 0.9, 0.025, 0.02, c.belly2, { rx: 0.14 }); }
    { const [y, z] = face(1.3, 0.12, 0.98, 0.32); L.box(0, y, z, 0.82, 0.56, 0.06, c.belly, { rx: 0.32 }); }
    { const [y, z] = face(1.66, 0.34, 0.8, 0.55); L.box(0, y, z, 0.6, 0.56, 0.06, c.belly, { rx: 0.55 }); for (const dy of [-0.12, 0.08]) L.box(0, y + dy, z + 0.032 - dy * 0.6, 0.55, 0.025, 0.02, c.belly2, { rx: 0.55 }); }
    { const [y, z] = face(1.92, 0.5, 0.64, 0.25); L.box(0, y - 0.04, z, 0.5, 0.34, 0.06, c.belly, { rx: 0.25 }); }
    // the dark back: a saddle down the spine, tiger stripes wrapping onto the flanks, twin scute rows
    const backs = [[0.8, -0.04, 1.1, 0.14, 0.62, 1.0], [1.3, 0.12, 0.98, 0.32, 0.6, 0.6], [1.66, 0.34, 0.8, 0.55, 0.52, 0.6], [1.92, 0.5, 0.64, 0.25, 0.46, 0.44]];
    for (const [y, z, d, a, w, h] of backs) {
      const [by, bz] = face(y, z, d, a, -1);
      L.box(0, by, bz, w * 0.4, h, 0.04, c.back, { rx: a });
      for (const f of [-0.3, 0.05, 0.38]) L.box(0, by + h * f * Math.cos(a), bz + h * f * S(a), w * 1.05, h * 0.13, 0.05, c.back, { rx: a });
      for (const f of [-0.15, 0.22]) L.box(0, by + h * f * Math.cos(a), bz - 0.035 + h * f * S(a), 0.09, 0.07, 0.06, c.dark, { rx: a });
    }
    for (const sd of [-1, 1]) {
      for (const [y, z] of [[1.0, -0.42], [0.92, -0.16], [0.84, 0.1], [0.7, 0.32]]) L.box(sd * 0.685, y, z, 0.03, 0.56, 0.1, c.back, { rx: -0.45 });
      for (const [y, z] of [[1.42, -0.2], [1.38, 0.06]]) L.box(sd * 0.595, y, z, 0.03, 0.4, 0.09, c.back, { rx: -0.3 });
      for (const [y, z] of [[1.8, 0.16], [1.7, 0.36]]) L.box(sd * 0.465, y, z, 0.03, 0.36, 0.08, c.back, { rx: 0.1 });
    }
    // old raptor claw scars down the left of the neck and across the right flank
    for (let i = 0; i < 3; i++) L.box(0.466, 1.58 + i * 0.09, 0.36 + i * 0.03, 0.015, 0.03, 0.36, c.scar, { rx: 0.7 });
    for (let i = 0; i < 2; i++) L.box(-0.686, 0.62 + i * 0.1, -0.05, 0.015, 0.03, 0.4, c.scar, { rx: -0.3 });
  }, 'trex-torso', k));

  // the head: wide jaw-muscled skull narrowing to the snout, heavy brows, golden eyes
  const hw = (z) => 0.4 - 0.13 * Math.max(0, Math.min(1, (z - 0.05) / 1.05));
  const hk = k * 1.12, head = pv(torso, 0, HY * k, HZ * k);
  head.add(prt((L) => {
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
      // heavy brow ridge with a horn-like boss behind it, over a deep-set golden eye
      L.box(sd * 0.31, 0.5, 0.26, 0.26, 0.14, 0.46, c.brow, { rz: -sd * 0.3 });
      L.box(sd * 0.35, 0.44, 0.47, 0.12, 0.1, 0.1, c.brow, { rz: -sd * 0.3 });
      L.box(sd * 0.34, 0.5, 0.03, 0.14, 0.12, 0.16, c.brow);
      L.box(sd * 0.382, 0.31, 0.24, 0.02, 0.2, 0.3, c.dark);
      L.box(sd * 0.39, 0.32, 0.25, 0.02, 0.12, 0.15, c.eye, glow(c.eye, 0.6));
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
        const h = 0.1 + 0.06 * S(Math.min(1, z / 1.06) * PI);
        L.box(sd * (hw(z) - 0.035), -0.08 - h / 2, z, 0.055, h, 0.055, c.tooth, { rx: (i % 2 ? 0.1 : -0.12) });
      }
    }
    for (const x of [-0.13, -0.045, 0.045, 0.13]) L.box(x, -0.13, 1.12, 0.05, 0.1, 0.05, c.tooth);
    // a scar across the right cheek
    L.box(-0.404, 0.12, 0.42, 0.015, 0.03, 0.34, c.scar, { rx: 0.45 });
    L.box(-0.344, 0.2, 0.78, 0.015, 0.03, 0.2, c.scar, { rx: -0.3 });
  }, 'trex-head', hk));
  // the deep lower jaw (narrower than the upper teeth row, so those overlap it)
  const jaw = pv(head, 0, -0.08 * hk, -0.12 * hk);
  jaw.add(prt((L) => {
    L.box(0, -0.17, 0.12, 0.74, 0.34, 0.5, c.body);
    L.box(0, -0.15, 0.6, 0.58, 0.3, 0.52, c.body);
    L.box(0, -0.13, 1.02, 0.44, 0.26, 0.36, c.body);
    L.box(0, -0.3, 0.6, 0.5, 0.05, 1.2, c.belly);
    L.box(0, -0.29, 0.12, 0.6, 0.06, 0.48, c.belly);
    L.box(0, 0.004, 0.62, 0.36, 0.02, 1.0, c.mouth);
    L.box(0, 0.012, 0.56, 0.24, 0.02, 0.78, 0xb84a48);
    for (const sd of [-1, 1]) {
      for (let z = 0.3, i = 0; z <= 1.12; z += 0.09, i++) {
        const x = (z < 0.85 ? 0.29 - (z - 0.3) * 0.12 : 0.2) - 0.03, h = 0.08 + 0.04 * S(z * 2.8);
        L.box(sd * x, h / 2, z, 0.05, h, 0.05, c.tooth, { rx: (i % 2 ? 0.12 : -0.1) });
      }
      L.box(sd * 0.371, -0.12, 0.12, 0.02, 0.04, 0.46, c.dark);
    }
  }, 'trex-jaw', hk));

  // tiny two-fingered arms tucked at the chest
  const arms = [];
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * 0.5 * k, 1.22 * k, 0.6 * k);
    a.add(prt((L) => {
      L.box(0, -0.1, 0, 0.16, 0.26, 0.16, c.body);
      L.box(0, -0.25, 0.04, 0.13, 0.14, 0.14, c.body, { rx: -0.25 });
      L.box(sd * 0.05, -0.08, 0.0, 0.07, 0.14, 0.17, c.back);
      for (const x of [-0.035, 0.035]) {
        L.box(x, -0.34, 0.07, 0.045, 0.1, 0.045, c.body, { rx: -0.35 });
        L.box(x, -0.4, 0.1, 0.035, 0.06, 0.035, c.dark, { rx: -0.6 });
      }
    }, 'trex-arm', k));
    arms.push(a);
  }
  const tail = pv(torso, 0, 0.66 * k, -0.48 * k);
  tail.rotation.y = TAIL_YAW;
  tail.add(prt((L) => {
    const segs = tailPart(L, c.body, 0.86, 2.2, c.back, { rise: 0.16 });
    segs.forEach(([y, z, w, a], i) => {
      L.box(0, y + 0.02, z + 0.06, w * 1.04, w * 0.6, 0.1, c.back, { rx: a });
      if (i < 3) for (const sd of [-1, 1]) L.box(sd * 0.07, y + w * 0.47, z - 0.1, 0.09, 0.07, 0.09, c.dark, { rx: a });
      L.box(0, y - w * 0.45, z, w * 0.6, 0.03, 0.4, c.belly, { rx: a });
    });
  }, 'trex-tail', k));
  return { root, torso, head, jaw, jawOpen: 0.8, tail, armL: arms[0], armR: arms[1], armLen: 0.38 * k, height: HY * k + 0.62 * hk, width: 1.58 * k };
}

// ---------------------------------------------------------------------------------
// Triceratops: frilled head with horns, stubby forelegs on the wheel
// ---------------------------------------------------------------------------------
export function triceratopsDriver() {
  const c = { body: 0x8a6e4a, belly: 0xc0a47a, frill: 0xb0784a, rim: C.dkred, horn: 0xefe6cf, dark: 0x5a4a3a };
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  torso.add(prt((L) => {
    haunches(L, c.body, 0.45, 0.55);
    L.box(0, 0.7, 0, 1.5, 1.2, 1.1, c.body, { rx: 0.1 });
    L.box(0, 1.2, 0.1, 1.32, 0.56, 1.0, c.body, { rx: 0.22 });
    L.box(0, 0.72, 0.55, 1.1, 1.0, 0.1, c.belly, { rx: 0.1 });
    for (const y of [0.4, 0.75, 1.1]) L.box(0, y, -0.56 + y * 0.1, 0.42, 0.14, 0.1, c.dark, { rx: 0.1 });
    for (const sd of [-1, 1]) for (const [y, z] of [[0.55, 0.1], [0.95, -0.15], [0.75, -0.35]]) L.box(sd * 0.755, y, z, 0.03, 0.16, 0.2, c.dark);
  }, 'trike-torso'));
  const head = pv(torso, 0, 1.38, 0.3);
  head.add(prt((L) => {
    // frill fanned up behind the head (hides the head from behind)
    L.box(0, 0.5, -0.22, 1.42, 1.0, 0.1, c.frill, { rx: -0.32 });
    L.box(0, 1.0, -0.39, 1.56, 0.13, 0.16, c.rim, { rx: -0.32 });
    for (const sd of [-1, 1]) {
      L.box(sd * 0.74, 0.5, -0.22, 0.13, 1.0, 0.16, c.rim, { rx: -0.32 });
      for (const y of [0.25, 0.6, 0.92]) L.box(sd * 0.8, y, -0.2 - y * 0.32, 0.12, 0.12, 0.12, c.horn, { rz: 0.785 });
    }
    for (const x of [-0.45, 0, 0.45]) L.box(x, 1.1, -0.42, 0.12, 0.12, 0.12, c.horn, { rz: 0.785 });
    L.box(0, 0.12, 0.22, 0.72, 0.56, 0.66, c.body);
    L.box(0, 0.0, 0.62, 0.52, 0.42, 0.4, c.body);
    L.box(0, -0.06, 0.86, 0.34, 0.32, 0.18, c.dark, { rx: 0.3 });
    for (const sd of [-1, 1]) {
      L.box(sd * 0.22, 0.6, 0.48, 0.09, 0.09, 0.72, c.horn, { rx: -0.7 });
      L.box(sd * 0.362, 0.24, 0.32, 0.03, 0.1, 0.13, 0xffb020);
      L.box(sd * 0.372, 0.24, 0.33, 0.02, 0.08, 0.04, C.black);
      L.box(sd * 0.2, 0.42, 0.3, 0.2, 0.08, 0.26, c.dark);
    }
    L.box(0, 0.32, 0.74, 0.09, 0.24, 0.09, c.horn, { rx: 0.35 });
  }, 'trike-head'));
  const jaw = pv(head, 0, -0.14, 0.32);
  jaw.add(prt((L) => {
    L.box(0, -0.06, 0.28, 0.44, 0.14, 0.5, c.body);
    L.box(0, -0.04, 0.55, 0.26, 0.14, 0.12, c.dark);
    L.box(0, 0.015, 0.25, 0.3, 0.02, 0.4, TONGUE);
  }, 'trike-jaw'));
  const arms = [];
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * 0.66, 1.14, 0.32);
    a.add(prt((L) => {
      L.box(0, -0.2, 0, 0.28, 0.48, 0.3, c.body);
      L.box(0, -0.5, 0.03, 0.24, 0.24, 0.26, c.body);
      for (const x of [-0.08, 0, 0.08]) L.box(x, -0.64, 0.1, 0.07, 0.07, 0.07, c.horn);
    }, 'trike-leg'));
    arms.push(a);
  }
  const tail = pv(torso, 0, 0.64, -0.5);
  tail.rotation.y = TAIL_YAW;
  tail.add(prt((L) => { tailPart(L, c.body, 0.7, 1.5, c.dark, { rise: 0.16 }); }, 'trike-tail'));
  return { root, torso, head, jaw, jawOpen: 0.6, tail, armL: arms[0], armR: arms[1], armLen: 0.6, height: 2.5, width: 1.6 };
}

// ---------------------------------------------------------------------------------
// Pteranodon: wings are the arms (membrane trails behind them), long beak and crest
// ---------------------------------------------------------------------------------
export function pteranodonDriver() {
  const c = { body: 0x7c503a, wing: 0xa07a50, membrane: 0x8a5a3a, crest: C.dkred, beak: 0xe0b060 };
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  torso.add(prt((L) => {
    haunches(L, c.body, 0.18, 0.24);
    L.box(0, 0.48, 0, 0.62, 0.72, 0.52, c.body, { rx: 0.2 });
    L.box(0, 0.88, 0.08, 0.6, 0.4, 0.5, c.body, { rx: 0.35 });
    L.box(0, 0.5, 0.27, 0.46, 0.6, 0.04, c.wing, { rx: 0.2 });
    L.box(0, 1.17, 0.2, 0.22, 0.42, 0.22, c.body, { rx: 0.3 });
  }, 'ptera-torso'));
  const head = pv(torso, 0, 1.38, 0.28);
  head.add(prt((L) => {
    L.box(0, 0.06, 0.06, 0.3, 0.28, 0.38, c.body);
    L.box(0, 0.06, 0.45, 0.16, 0.12, 0.5, c.beak);
    L.box(0, 0.06, 0.8, 0.09, 0.07, 0.24, c.beak);
    L.box(0, 0.28, -0.32, 0.06, 0.2, 0.72, c.crest, { rx: 0.5 });
    for (const sd of [-1, 1]) { L.box(sd * 0.152, 0.12, 0.1, 0.02, 0.07, 0.08, 0xffb020); L.box(sd * 0.158, 0.12, 0.11, 0.015, 0.06, 0.03, C.black); }
  }, 'ptera-head'));
  const jaw = pv(head, 0, -0.01, 0.22);
  jaw.add(prt((L) => { L.box(0, -0.04, 0.3, 0.13, 0.06, 0.62, c.beak); }, 'ptera-jaw'));
  const arms = [];
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * 0.33, 1.02, 0.06);
    a.add(prt((L) => {
      L.box(0, -0.18, 0, 0.11, 0.4, 0.11, c.body);
      L.box(0, -0.6, 0, 0.07, 0.5, 0.07, c.wing);
      L.box(0, -0.48, -0.2, 0.03, 0.82, 0.36, c.membrane);
      L.box(0, -0.42, -0.46, 0.03, 0.56, 0.2, c.membrane);
      L.box(0, -0.85, 0.04, 0.03, 0.1, 0.03, C.black, { rx: -0.6 });
    }, 'ptera-wing'));
    arms.push(a);
  }
  return { root, torso, head, jaw, jawOpen: 0.7, armL: arms[0], armR: arms[1], armLen: 0.85, height: 1.85, width: 0.9 };
}

// ---------------------------------------------------------------------------------
// Brachiosaurus: the whole long neck is the head pivot; sneezes on a cheer
// ---------------------------------------------------------------------------------
export function brachiosaurusDriver() {
  const c = { body: 0x6f8660, belly: 0xa8b490, spot: 0x4a5e40 };
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  torso.add(prt((L) => {
    haunches(L, c.body, 0.45, 0.55);
    L.box(0, 0.7, -0.05, 1.5, 1.2, 1.12, c.body, { rx: 0.05 });
    L.box(0, 1.16, 0.08, 1.3, 0.5, 1.0, c.body, { rx: 0.2 });
    L.box(0, 0.72, 0.52, 1.1, 1.0, 0.1, c.belly, { rx: 0.05 });
    for (const sd of [-1, 1]) for (const [y, z] of [[0.5, 0.15], [0.85, -0.2], [0.4, -0.3], [1.0, 0.25]]) L.box(sd * 0.755, y, z, 0.03, 0.18, 0.24, c.spot);
  }, 'brachio-torso'));
  const head = pv(torso, 0, 1.28, 0.32);
  head.add(prt((L) => {
    const segs = [[0.12, 0.0, 0.52], [0.38, 0.05, 0.46], [0.64, 0.1, 0.4], [0.9, 0.16, 0.35], [1.12, 0.22, 0.31]];
    segs.forEach(([y, z, w], i) => {
      L.box(0, y, z, w, 0.34, w, c.body, { rx: 0.15 });
      L.box(0, y, z + w / 2, w * 0.6, 0.3, 0.04, c.belly, { rx: 0.15 });
      if (i % 2) for (const sd of [-1, 1]) L.box(sd * (w / 2 + 0.01), y, z, 0.02, 0.12, 0.14, c.spot);
    });
    L.box(0, 1.32, 0.4, 0.36, 0.3, 0.5, c.body);
    L.box(0, 1.5, 0.3, 0.3, 0.2, 0.3, c.body);
    L.box(0, 1.27, 0.72, 0.3, 0.2, 0.24, c.body);
    for (const sd of [-1, 1]) { L.box(sd * 0.182, 1.38, 0.42, 0.02, 0.07, 0.09, C.black); L.box(sd * 0.07, 1.6, 0.3, 0.07, 0.03, 0.08, c.spot); }
  }, 'brachio-neck'));
  const jaw = pv(head, 0, 1.2, 0.35);
  jaw.add(prt((L) => { L.box(0, -0.03, 0.26, 0.28, 0.08, 0.46, c.belly); L.box(0, 0.015, 0.24, 0.2, 0.02, 0.36, TONGUE); }, 'brachio-jaw'));
  // the sneeze: a spray of droplets out of the nose
  const spray = pv(head, 0, 1.3, 0.8, prt((L) => {
    for (const [x, y, z, r] of [[0, 0, 0, 0.09], [0.12, 0.05, 0.2, 0.07], [-0.12, -0.02, 0.24, 0.07], [0.05, -0.1, 0.42, 0.06], [-0.08, 0.1, 0.5, 0.05], [0.15, -0.04, 0.62, 0.045], [-0.15, 0.03, 0.7, 0.04]]) L.sphere(x, y, z, r, 0xdff6ff, { matOpts: { trans: true, opacity: 0.7, rough: 0.1 } });
  }, 'brachio-sneeze'));
  spray.visible = false;
  const arms = [];
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * 0.64, 1.1, 0.34);
    a.add(prt((L) => {
      L.box(0, -0.3, 0, 0.3, 0.64, 0.3, c.body);
      L.box(0, -0.64, 0.03, 0.34, 0.12, 0.36, c.spot);
    }, 'brachio-leg'));
    arms.push(a);
  }
  const tail = pv(torso, 0, 0.66, -0.55);
  tail.rotation.y = TAIL_YAW;
  tail.add(prt((L) => { tailPart(L, c.body, 0.66, 2.0, c.spot, { rise: 0.16 }); }, 'brachio-tail'));
  const fx = (name, f) => {
    const s = name === 'cheer' ? (f - 0.42) / 0.45 : -1;
    spray.visible = s > 0 && s < 1;
    if (spray.visible) { const g = 0.4 + s * 1.6; spray.scale.set(g, g, 0.5 + s * 2.4); spray.position.z = 0.8 + s * 0.3; }
  };
  return { root, torso, head, jaw, jawOpen: 0.6, tail, armL: arms[0], armR: arms[1], armLen: 0.66, height: 2.88, width: 1.55, fx };
}

// a slow snort: the jaw parts a little in time with the breathing (after the animator's pose)
export function breathe(rig, rate = 1.7, amt = 0.05) {
  const jaw = rig.jaw;
  rig.idle = (t) => { jaw.rotation.x += amt * (1 + S(t * rate)); };
  return rig;
}

export { RAPTORS };
