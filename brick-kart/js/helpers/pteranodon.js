// Pteranodon: the Jurassic map's rescue helper. The same character as the Pteranodon driver
// (../drivers/jurassic-dinos.js pteranodonDriver: brown body, long tan beak, dark-red crest
// sweeping back, amber eyes) but in flight, with no cloud: body nearly level and a little
// nose-up, the neck raised, the head held forward, and the big membranous wings spread wide.
// Anatomy (after the fossil reconstructions and the Jurassic World design): each wing is the
// arm (humerus + forearm) out to the wrist, where three small clawed fingers point forward,
// then the very long 4th finger running out to the wing tip; the membrane stretches from that
// finger back to the body and the hind legs, and a little forward membrane runs from the
// shoulder to the wrist. A short tail. The legs hang down and forward and grip the fishing rod
// in the feet.
//
// Faces +Z, +Y up, origin at the bottom-centre of the body. Wings are pivot groups at the
// shoulders (wingL on +X, the character's left; wingR on -X), each with an outer pivot at the
// wrist (wingL2 / wingR2); the head pivots at the top of the neck ('head').
import * as THREE from 'three';
import { BrickBuilder, C, plastic } from '../lego.js';
import { Local } from '../maps/jurassic-props.js';
import { rod } from '../drivers/kit.js';

// the driver's palette
const BODY = 0x7c503a, WING = 0xa07a50, MEMB = 0x8a5a3a, CREST = C.dkred, BEAK = 0xe0b060;
const EYE = 0xffb020, CLAW = 0x2a2420, BELLY = 0x8a5c40, VEIN = 0x6e4630;

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// a thin slab whose outline pts = [[x, z], ...] lies in the XZ plane at height y (thickness h):
// one indexed geometry with top, bottom and edge faces, so it merges with the builder's boxes
function slabGeo(pts, y = 0, h = 0.03) {
  const contour = pts.map(([x, z]) => new THREE.Vector2(x, z));
  let tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const pos = [], nor = [], uv = [], idx = [];
  const face = (verts, n, tri) => {
    const o = pos.length / 3;
    for (const v of verts) { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); uv.push(0, 0); }
    for (const t of tri) idx.push(o + t[0], o + t[1], o + t[2]);
  };
  // the top face's triangles must wind counter-clockwise seen from +Y
  const ccw = THREE.ShapeUtils.isClockWise(contour);   // (x, z) clockwise in 2D = CCW from +Y
  const up = tris.map((t) => (ccw ? t : [t[0], t[2], t[1]]));
  face(pts.map(([x, z]) => [x, y + h / 2, z]), [0, 1, 0], up);
  face(pts.map(([x, z]) => [x, y - h / 2, z]), [0, -1, 0], up.map((t) => [t[0], t[2], t[1]]));
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
    let nx = bz - az, nz = -(bx - ax);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l; nz /= l;
    const quad = [[ax, y - h / 2, az], [bx, y - h / 2, bz], [bx, y + h / 2, bz], [ax, y + h / 2, az]];
    // outward normal depends on the contour's direction
    const s = ccw ? -1 : 1;
    face(quad, [nx * s, 0, nz * s], s > 0 ? [[0, 2, 1], [0, 3, 2]] : [[0, 1, 2], [0, 2, 3]]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const ID = new THREE.Matrix4();
function membrane(b, pts, sd, color, y = 0, h = 0.03) {
  b.addMatrix(slabGeo(pts.map(([x, z]) => [x * sd, z]), y, h), plastic(color), ID);
}

// a part built through the jurassic Local frame (centred rotatable boxes)
function part(fn, name) {
  const b = new BrickBuilder(1);
  fn(new Local(b), b);
  return b.build({ name, shadows: true });
}
function pivot(parent, name, x, y, z, child) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  if (child) g.add(child);
  parent.add(g);
  return g;
}

// ---- wings (sd = +1 builds the +X wing; -1 its mirror) ----------------------------------------
// inner: shoulder (origin) to the wrist at x = WRIST
const WRIST = 1.0, TIP = 1.3;
function innerWing(sd) {
  return part((L, b) => {
    const X = (x) => x * sd;
    // humerus (stout, body colour) and forearm (wing colour), with an elbow knob
    rod(b, [0, 0.02, 0], [X(0.42), 0.04, -0.06], 0.075, BODY);
    rod(b, [X(0.42), 0.04, -0.06], [X(WRIST), 0.05, 0.05], 0.05, WING);
    L.sphere(X(0.42), 0.04, -0.06, 0.08, BODY);
    L.sphere(X(WRIST), 0.05, 0.05, 0.075, WING);
    // three small clawed fingers at the wrist, pointing forward
    for (const [i, dx] of [[0, -0.05], [1, 0], [2, 0.05]]) {
      L.box(X(WRIST + dx), 0.06, 0.15, 0.03, 0.03, 0.12, WING, { ry: sd * (0.15 - i * 0.12) });
      L.box(X(WRIST + dx * 1.3), 0.045, 0.23, 0.022, 0.03, 0.06, CLAW, { rx: 0.5, ry: sd * (0.15 - i * 0.12) });
    }
    // membrane: forward of the arm (propatagium) and back to the body/legs; trailing edge
    // runs in a line from the wing tip towards the ankle
    membrane(b, [[-0.08, 0.06], [0.2, 0.1], [0.55, 0.11], [WRIST, 0.09], [WRIST + 0.02, -0.05],
      [WRIST, -0.58], [0.75, -0.66], [0.45, -0.74], [0.15, -0.82], [-0.1, -0.86]], sd, MEMB, 0.0);
    // a few stiffening fibres and a lighter leading-edge band on top
    for (const [x0, z0, x1, z1] of [[0.25, 0.0, 0.2, -0.72], [0.6, 0.0, 0.6, -0.64], [0.88, 0.0, 0.9, -0.56]])
      rod(b, [X(x0), 0.017, z0], [X(x1), 0.017, z1], 0.009, VEIN, 4);
    L.box(X(0.5), 0.02, 0.0, 0.95, 0.02, 0.1, WING, { ry: -sd * 0.1 });
  }, 'ptera-wing-in');
}
function outerWing(sd) {
  return part((L, b) => {
    const X = (x) => x * sd;
    // the long 4th finger, tapering out to the tip
    rod(b, [0, 0.03, 0], [X(0.62), 0.03, -0.08], 0.042, WING);
    rod(b, [X(0.62), 0.03, -0.08], [X(TIP), 0.02, -0.32], 0.03, WING);
    L.sphere(X(0.62), 0.03, -0.08, 0.045, WING);
    membrane(b, [[-0.02, 0.06], [0.62, -0.03], [TIP, -0.3], [TIP - 0.06, -0.38], [0.95, -0.45],
      [0.6, -0.5], [0.3, -0.55], [-0.02, -0.58]], sd, MEMB, 0.0);
    for (const [x0, z0, x1, z1] of [[0.3, -0.05, 0.25, -0.5], [0.7, -0.1, 0.62, -0.46]])
      rod(b, [X(x0), 0.017, z0], [X(x1), 0.017, z1], 0.008, VEIN, 4);
  }, 'ptera-wing-out');
}

export function build() {
  const root = new THREE.Group();
  root.name = 'pteranodon';
  const P = -0.14;   // body pitch (nose up)

  // ---- body, tail, neck and legs (one merged part) ----
  root.add(part((L, b) => {
    // torso: slender and nearly level, deepest at the chest, narrowing to the hips
    L.box(0, 0.24, -0.08, 0.42, 0.34, 0.9, BODY, { rx: P });
    L.box(0, 0.36, 0.3, 0.5, 0.42, 0.46, BODY, { rx: P - 0.1 });
    L.box(0, 0.5, 0.05, 0.3, 0.1, 0.7, BODY, { rx: P });             // back ridge
    // lighter chest and belly (the driver's chest panel)
    L.box(0, 0.14, 0.3, 0.36, 0.06, 0.44, BELLY, { rx: P - 0.1 });
    L.box(0, 0.08, -0.12, 0.28, 0.05, 0.55, BELLY, { rx: P });
    // shoulders where the wings join
    for (const sd of [-1, 1]) L.sphere(sd * 0.22, 0.48, 0.32, 0.12, BODY);
    // short tail
    L.box(0, 0.17, -0.6, 0.13, 0.11, 0.4, BODY, { rx: -0.05 });
    L.box(0, 0.16, -0.84, 0.07, 0.07, 0.16, BODY, { rx: -0.05 });
    // neck: from the chest, reaching up and well forward to the head
    rod(b, [0, 0.42, 0.42], [0, 0.72, 0.7], 0.13, BODY);
    rod(b, [0, 0.72, 0.7], [0, 0.88, 0.96], 0.11, BODY);
    L.sphere(0, 0.72, 0.7, 0.125, BODY);
    // legs: thighs from the hips down and forward, shins to the feet clasping the rod
    for (const sd of [-1, 1]) {
      const hip = [sd * 0.15, 0.12, -0.32], knee = [sd * 0.17, -0.2, -0.2], ankle = [sd * 0.1, -0.42, 0.04];
      rod(b, hip, knee, 0.08, BODY);
      L.sphere(...knee, 0.075, BODY);
      rod(b, knee, ankle, 0.055, BODY);
      L.sphere(...ankle, 0.055, BODY);
      // foot: toes curled around the handle from either side, dark claws at their ends
      L.box(sd * 0.09, -0.48, 0.1, 0.09, 0.07, 0.16, BODY, { rx: 0.3 });
      for (const dz of [-0.04, 0.0, 0.04]) {
        L.box(sd * 0.045, -0.54, 0.12 + dz * 1.4, 0.07, 0.035, 0.035, BODY, { rz: sd * 0.6 });
        L.box(sd * 0.0, -0.58, 0.12 + dz * 1.4, 0.04, 0.03, 0.03, CLAW, { rz: sd * 1.0 });
      }
    }
  }, 'ptera-body'));

  // ---- head (pivot at the top of the neck) ----
  const head = pivot(root, 'head', 0, 0.9, 1.0);
  head.rotation.x = 0.12;   // level-ish, looking a little down at the kart
  head.scale.setScalar(1.15);
  head.add(part((L) => {
    L.box(0, 0.06, 0.04, 0.3, 0.28, 0.42, BODY);
    L.box(0, 0.16, -0.12, 0.22, 0.14, 0.26, BODY, { rx: 0.3 });
    // long pointed beak: upper bill, tip and lower bill with a dark gape line
    L.box(0, 0.06, 0.48, 0.16, 0.12, 0.56, BEAK);
    L.box(0, 0.05, 0.86, 0.1, 0.08, 0.26, BEAK, { rx: 0.06 });
    L.box(0, 0.04, 1.06, 0.05, 0.05, 0.18, BEAK, { rx: 0.12 });
    L.box(0, -0.04, 0.5, 0.13, 0.07, 0.68, BEAK, { rx: -0.03 });
    L.box(0, -0.05, 0.92, 0.07, 0.05, 0.22, BEAK, { rx: -0.08 });
    for (const sd of [-1, 1]) L.box(sd * 0.067, 0.0, 0.5, 0.01, 0.02, 0.6, CLAW);
    // the crest sweeping back and up, dark red
    L.box(0, 0.3, -0.36, 0.06, 0.22, 0.78, CREST, { rx: 0.5 });
    L.box(0, 0.47, -0.72, 0.05, 0.14, 0.24, CREST, { rx: 0.6 });
    // amber eyes with black pupils
    for (const sd of [-1, 1]) {
      L.box(sd * 0.152, 0.12, 0.1, 0.02, 0.07, 0.08, EYE);
      L.box(sd * 0.158, 0.12, 0.11, 0.015, 0.06, 0.03, C.black);
    }
  }, 'ptera-head'));

  // ---- wings ----
  for (const sd of [1, -1]) {
    const w = pivot(root, sd > 0 ? 'wingL' : 'wingR', sd * 0.24, 0.5, 0.32, innerWing(sd));
    w.rotation.order = 'YXZ';
    w.rotation.y = -sd * 0.12;           // swept slightly back
    w.rotation.x = -0.18;                // leading edge up (angle of attack)
    w.rotation.z = sd * 0.14;            // a little dihedral
    const w2 = pivot(w, sd > 0 ? 'wingL2' : 'wingR2', sd * WRIST, 0.05, 0.05, outerWing(sd));
    w2.rotation.z = -sd * 0.04;
  }

  root.userData.grip = V(0, -0.53, 0.12);
  // up, out to its +X side and forward, ahead of the wing's leading edge
  root.userData.gripDir = V(0.55, 0.66, 0.5).normalize();
  // powerful slow beats that fade into a glide and back (obj is the clone in the scene)
  root.userData.animate = (obj, t) => {
    const ph = t * 7.5;                                       // ~1.2 beats a second
    const e = 0.55 + 0.45 * Math.sin(t * 0.8);                 // flapping / gliding
    const a = 0.08 + e * (0.5 * Math.sin(ph) + 0.06);
    const a2 = e * 0.32 * Math.sin(ph - 1.0) - 0.04;           // outer wing lags behind
    for (const [n, n2, sd] of [['wingL', 'wingL2', 1], ['wingR', 'wingR2', -1]]) {
      const w = obj.getObjectByName(n), w2 = obj.getObjectByName(n2);
      if (w) w.rotation.z = sd * a;
      if (w2) w2.rotation.z = sd * a2;
    }
    const h = obj.getObjectByName('head');
    if (h) { h.rotation.x = 0.12 - e * 0.06 * Math.sin(ph - 0.6); h.rotation.y = 0.15 * Math.sin(t * 0.6); }
  };
  return root;
}
