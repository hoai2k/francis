// Jurassic World dinosaur drivers: compact seated brick dinosaurs in the driver-rig
// format (see ../driver.js). Each builder returns a rig whose torso is the seated body,
// head sits on a neck pivot with a jaw, the tail sways behind over the engine and the
// forelimbs are the arm pivots that reach the steering wheel.
// Colours follow the Jurassic map creatures in ../maps/jurassic-props.js.
import { THREE, BrickBuilder, C } from './kit.js';
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
// Small theropods: velociraptors (Blue, Delta) and the Dilophosaurus
// ---------------------------------------------------------------------------------
export function smallTheropod(c) {
  const k = c.k ?? 1, dilo = c.kind === 'dilo';
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  const neckH = dilo ? 0.14 : 0;
  torso.add(prt((L) => {
    haunches(L, c.body, 0.25, 0.32);
    L.box(0, 0.55, 0, 0.8, 0.82, 0.7, c.body, { rx: 0.22 });
    L.box(0, 0.96, 0.13, 0.66, 0.5, 0.6, c.body, { rx: 0.4 });
    L.box(0, 0.62, 0.36, 0.6, 0.7, 0.06, c.belly, { rx: 0.22 });
    L.box(0, 1.24 + neckH / 2, 0.3, 0.36, 0.62 + neckH, 0.36, c.body, { rx: 0.42 });
    L.box(0, 1.2 + neckH / 2, 0.47, 0.24, 0.5 + neckH, 0.04, c.belly, { rx: 0.42 });
    if (c.stripe) {
      for (const sd of [-1, 1]) { L.box(sd * 0.402, 0.62, -0.02, 0.03, 0.08, 0.62, c.stripe, { rx: 0.22 }); L.box(sd * 0.402, 0.85, 0.06, 0.03, 0.08, 0.5, c.stripe, { rx: 0.22 }); }
      L.box(0, 0.7, -0.36, 0.12, 0.85, 0.04, c.stripe, { rx: 0.22 });
    }
    if (c.spot) for (const [x, y, z] of [[0.402, 0.5, 0.1], [-0.402, 0.75, -0.1], [0.402, 0.85, -0.15], [-0.402, 0.4, 0.15], [0.335, 1.05, 0.0], [-0.335, 1.0, 0.2]]) L.box(x, y, z, 0.03, 0.12, 0.14, c.spot);
  }, 'raptor-torso', k));
  const head = pv(torso, 0, (1.5 + neckH) * k, (dilo ? 0.46 : 0.44) * k);
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
      if (dilo) L.box(sd * 0.09, 0.38, 0.22, 0.04, 0.22, 0.56, c.crest, { rx: 0.12 });
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
  const rig = { root, torso, head, jaw, jawOpen: 0.8, tail, armL: arms[0], armR: arms[1], armLen: 0.5 * k, height: (1.82 + neckH) * k, width: 0.9 * k };
  if (dilo) {
    // the neck frill (folded away until it fans open) and a glob of venom spit
    const frill = pv(head, 0, 0.1 * k, -0.02 * k, prt((L) => {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = -1.9 + i * (3.8 / (n - 1)), cx = S(a), cy = Math.cos(a);
        L.box(cx * 0.32, cy * 0.32, -0.02, 0.2, 0.42, 0.03, i % 2 ? c.frill : 0xe07a20, { rz: -a });
        L.box(cx * 0.55, cy * 0.55, -0.02, 0.12, 0.08, 0.035, c.crest, { rz: -a });
      }
    }, 'dilo-frill', k));
    frill.visible = false;
    const spit = pv(head, 0, -0.02 * k, 0.6 * k, prt((L) => {
      L.sphere(0, 0, 0, 0.08, 0x9cff3a, glow(0x6ad010, 1.4));
      L.sphere(0.05, 0.06, -0.12, 0.05, 0x9cff3a, glow(0x6ad010, 1.4));
      L.sphere(-0.04, -0.03, -0.22, 0.04, 0x9cff3a, glow(0x6ad010, 1.4));
    }, 'dilo-spit', k));
    spit.visible = false;
    rig.fx = (name, f, t) => {
      const open = name === 'cheer' ? smooth(f / 0.2) * smooth((1 - f) / 0.15) : name === 'taunt' ? smooth(f / 0.25) * smooth((1 - f) / 0.2) : name === 'win' ? 1 : 0;
      frill.visible = open > 0.02;
      if (frill.visible) { const s = open * (1 + S(t * 30) * 0.04); frill.scale.set(s, s, 1); frill.rotation.z = S(t * 25) * 0.04 * open; }
      const sp = name === 'cheer' ? (f - 0.38) / 0.4 : -1;
      spit.visible = sp > 0 && sp < 1;
      if (spit.visible) spit.position.set(0, (-0.02 + sp * 0.5 - sp * sp * 1.1) * k, (0.6 + sp * 2.6) * k);
    };
  }
  return rig;
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
// Stegosaurus: back plates, small head, thagomizer tail that swings on a cheer
// ---------------------------------------------------------------------------------
export function stegosaurusDriver() {
  const c = { body: 0x6f7a4a, belly: 0xb8b48a, plateA: C.orange, plateB: 0xc0501a, spike: 0xefe6cf, dark: 0x4e5634 };
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  torso.add(prt((L) => {
    haunches(L, c.body, 0.42, 0.52);
    L.box(0, 0.66, -0.05, 1.3, 1.12, 1.05, c.body, { rx: 0.1 });
    L.box(0, 1.1, 0.06, 1.04, 0.52, 0.9, c.body, { rx: 0.3 });
    L.box(0, 0.66, 0.5, 0.98, 0.95, 0.1, c.belly, { rx: 0.1 });
    L.box(0, 1.32, 0.38, 0.46, 0.42, 0.55, c.body, { rx: -0.3 });
    // back plates up the spine, alternating sides (diamonds)
    const pl = [[0.3, 0.4], [0.55, 0.55], [0.82, 0.66], [1.1, 0.66], [1.36, 0.55], [1.58, 0.4]];
    pl.forEach(([y, h], i) => {
      const sd = i % 2 ? 1 : -1, zs = -0.55 + Math.max(0, y - 0.9) * 0.5;
      L.box(sd * 0.1, y + h * 0.3, zs - h * 0.4, 0.07, h * 0.82, h * 0.82, i % 3 ? c.plateA : c.plateB, { rx: PI / 4 - 0.25, rz: sd * 0.12 });
    });
    for (const sd of [-1, 1]) for (const [y, z] of [[0.55, -0.15], [0.85, -0.3], [0.35, -0.35]]) L.box(sd * 0.655, y, z, 0.03, 0.14, 0.18, c.dark);
  }, 'stego-torso'));
  const head = pv(torso, 0, 1.42, 0.62);
  head.add(prt((L) => {
    L.box(0, 0.06, 0.12, 0.38, 0.34, 0.46, c.body);
    L.box(0, 0.0, 0.42, 0.28, 0.24, 0.24, c.body);
    L.box(0, 0.02, 0.56, 0.2, 0.18, 0.08, c.dark);
    for (const sd of [-1, 1]) { L.box(sd * 0.192, 0.14, 0.18, 0.03, 0.09, 0.11, 0xffb020); L.box(sd * 0.2, 0.14, 0.19, 0.02, 0.07, 0.04, C.black); }
    L.box(0, 0.28, 0.0, 0.07, 0.18, 0.18, c.plateB, { rx: PI / 4 });
  }, 'stego-head'));
  const jaw = pv(head, 0, -0.1, 0.08);
  jaw.add(prt((L) => { L.box(0, -0.04, 0.24, 0.26, 0.08, 0.38, c.belly); }, 'stego-jaw'));
  const arms = [];
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * 0.56, 1.0, 0.3);
    a.add(prt((L) => {
      L.box(0, -0.18, 0, 0.22, 0.42, 0.24, c.body);
      L.box(0, -0.42, 0.03, 0.2, 0.18, 0.22, c.body);
      for (const x of [-0.06, 0.06]) L.box(x, -0.53, 0.08, 0.06, 0.06, 0.06, c.spike);
    }, 'stego-leg'));
    arms.push(a);
  }
  const tail = pv(torso, 0, 0.62, -0.5);
  tail.rotation.y = TAIL_YAW;
  tail.add(prt((L) => {
    const segs = tailPart(L, c.body, 0.6, 1.55, c.dark, { rise: 0.14 });
    for (const [y, z, w, a] of segs.slice(0, 2)) L.box(0, y + w * 0.6, z, 0.06, 0.24, 0.24, c.plateA, { rx: PI / 4 + a });
    const [y, z, , a] = segs[3];
    for (const sd of [-1, 1]) for (const dz of [0.1, -0.15]) L.box(sd * 0.16, y + 0.12, z + dz, 0.05, 0.05, 0.42, c.spike, { ry: sd * 1.25, rx: a - 0.55 });
  }, 'stego-tail'));
  // the thagomizer swing: called from fx after the animator has set the tail sway
  const fx = (name, f, t) => {
    if (name === 'cheer' || name === 'win') {
      const ph = name === 'cheer' ? f * PI * 2 : t * 4;
      tail.rotation.y += -0.5 + S(ph) * 0.9;
      tail.rotation.x = 0.35 * Math.abs(S(ph * 0.5 + (name === 'cheer' ? 0 : 0.3)));
    } else tail.rotation.x = 0;
  };
  return { root, torso, head, jaw, jawOpen: 0.6, tail, armL: arms[0], armR: arms[1], armLen: 0.52, height: 2.1, width: 1.35, fx };
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

// ---------------------------------------------------------------------------------
// Parasaurolophus: duck bill and swept-back crest; honks rings of sound
// ---------------------------------------------------------------------------------
export function parasaurolophusDriver() {
  const c = { body: 0x6b7a3a, belly: 0xc8c08a, stripe: 0x3e4a22, crest: 0xd0602a, bill: 0xa89a6a };
  const root = new THREE.Group(), torso = pv(root, 0, 0, 0);
  torso.add(prt((L) => {
    haunches(L, c.body, 0.33, 0.42);
    L.box(0, 0.6, 0, 1.0, 0.95, 0.85, c.body, { rx: 0.18 });
    L.box(0, 1.04, 0.12, 0.84, 0.45, 0.74, c.body, { rx: 0.35 });
    L.box(0, 0.64, 0.44, 0.74, 0.8, 0.06, c.belly, { rx: 0.18 });
    L.box(0, 1.32, 0.3, 0.4, 0.6, 0.4, c.body, { rx: 0.35 });
    for (const sd of [-1, 1]) for (const z of [-0.25, 0, 0.25]) L.box(sd * 0.502, 0.68, z - 0.05, 0.03, 0.62, 0.08, c.stripe, { rx: 0.18 });
  }, 'para-torso'));
  const head = pv(torso, 0, 1.62, 0.44);
  head.add(prt((L) => {
    L.box(0, 0.06, 0.1, 0.36, 0.34, 0.44, c.body);
    L.box(0, -0.02, 0.44, 0.32, 0.18, 0.36, c.bill);
    L.box(0, 0.44, -0.3, 0.13, 0.15, 0.95, c.crest, { rx: 0.62 });
    L.box(0, 0.2, 0.0, 0.16, 0.12, 0.3, c.crest, { rx: 0.62 });
    for (const sd of [-1, 1]) { L.box(sd * 0.182, 0.14, 0.14, 0.02, 0.08, 0.09, 0xffb020); L.box(sd * 0.188, 0.14, 0.15, 0.015, 0.07, 0.035, C.black); }
  }, 'para-head'));
  const jaw = pv(head, 0, -0.1, 0.12);
  jaw.add(prt((L) => { L.box(0, -0.03, 0.26, 0.3, 0.07, 0.4, c.bill); }, 'para-jaw'));
  // honk: two glowing sound rings travelling out of the bill
  const rings = [];
  const ringGeo = new THREE.TorusGeometry(0.16, 0.025, 6, 18);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xfff2a0, emissive: 0xffd040, emissiveIntensity: 1.2, transparent: true, opacity: 0.75 });
  const ringRoot = pv(head, 0, 0.0, 0.62);
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(ringGeo, ringMat); m.visible = false; ringRoot.add(m); rings.push(m); }
  const arms = [];
  for (const sd of [1, -1]) {
    const a = pv(torso, sd * 0.45, 1.04, 0.3);
    a.add(prt((L) => {
      L.box(0, -0.18, 0, 0.16, 0.38, 0.16, c.body);
      L.box(0, -0.43, 0.03, 0.13, 0.2, 0.13, c.body);
      L.box(0, -0.56, 0.05, 0.15, 0.07, 0.16, c.stripe);
    }, 'para-arm'));
    arms.push(a);
  }
  const tail = pv(torso, 0, 0.64, -0.38);
  tail.rotation.y = TAIL_YAW;
  tail.add(prt((L) => { tailPart(L, c.body, 0.55, 1.8, c.stripe, { rise: 0.16 }); }, 'para-tail'));
  const fx = (name, f, t) => {
    const on = name === 'cheer' ? (f > 0.15 && f < 0.92) : name === 'win';
    for (let i = 0; i < 2; i++) {
      const r = rings[i];
      r.visible = on;
      if (on) { const p = (t * 1.6 + i * 0.5) % 1; r.position.z = p * 1.4; r.scale.setScalar(0.6 + p * 2.2); }
    }
  };
  return { root, torso, head, jaw, jawOpen: 0.6, tail, armL: arms[0], armR: arms[1], armLen: 0.58, height: 2.35, width: 1.1, fx };
}

// a slow snort: the jaw parts a little in time with the breathing (after the animator's pose)
export function breathe(rig, rate = 1.7, amt = 0.05) {
  const jaw = rig.jaw;
  rig.idle = (t) => { jaw.rotation.x += amt * (1 + S(t * rate)); };
  return rig;
}

export { RAPTORS };
