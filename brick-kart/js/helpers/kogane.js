// Kogane (コガネ): the little shikigami that runs the Culling Game in Jujutsu Kaisen and the
// JJK maps' rescue helper. Reference design (anime ep. 53+, manga ch. 146+): a big white
// skull-shaped head with two large oval black eye sockets, two dot nostrils and a row of
// rounded upper teeth; small white feathered angel wings sprouting from the sides of the
// head; a white, segmented, grub-like body tapering downwards with tiny clasped hands under
// the chin; a ribbed grey connector at the bottom and a long thin dark-grey tail ending in a
// spade tip. Here only the start of the tail is modelled: the game draws the rest of it as
// its fishing line (see userData.tailFrom / tailColor / tailRadius).
//
// Faces +Z, +Y up, origin at the bottom-centre of the body.
import * as THREE from 'three';
import { BrickBuilder, plastic } from '../lego.js';

const WHITE = 0xf3f3ef, SHADE = 0xd9dcdf, SHADE2 = 0xe6e8ea, SOCKET = 0x15171b, RIM = 0xa9adb3;
const RING = 0xa3a7ad, GROOVE = 0x6d7176, TAIL = 0x55595f, TAIL_R = 0.055;

const sph = new THREE.SphereGeometry(1, 22, 16);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ellipsoid at p with radii s, rotated by Euler (rx, ry, rz)
function ell(b, p, s, rot, color) {
  tmpQ.setFromEuler(tmpE.set(rot[0], rot[1], rot[2]));
  b.addMatrix(sph, plastic(color), tmpM.compose(p, tmpQ, s));
}
// ellipsoid lying on a surface: its local z axis along the normal n
function ellOn(b, p, n, s, spin, color, mo) {
  tmpQ.setFromUnitVectors(V(0, 0, 1), n.clone().normalize());
  if (spin) tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), spin));
  b.addMatrix(sph, plastic(color, mo), tmpM.compose(p, tmpQ, s));
}
// solid of revolution from [radius, y] pairs
function lathe(b, pts, color, y0 = 0) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y + y0)), 28);
  b.addMatrix(g, plastic(color), tmpM.identity());
}

// one angel wing in the XY plane, root at the origin, reaching out along +X (mirrored for the left)
function wing(sd) {
  const b = new BrickBuilder(1);
  const X = (x) => x * sd;
  // solid backing so the wing reads as one shape, not loose feathers
  ell(b, V(X(0.42), 0.2, -0.03), V(0.42, 0.26, 0.05), [0, 0, sd * 0.5], SHADE);
  // leading edge: a plump rounded arm curving up and out
  ell(b, V(X(0.18), 0.1, 0), V(0.28, 0.18, 0.1), [0, 0, sd * 0.5], WHITE);
  ell(b, V(X(0.48), 0.34, -0.01), V(0.3, 0.15, 0.09), [0, 0, sd * 0.6], WHITE);
  ell(b, V(X(0.76), 0.56, -0.02), V(0.2, 0.11, 0.08), [0, 0, sd * 0.68], WHITE);
  // coverts: a scalloped row of short rounded feathers under the arm
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    ell(b, V(X(0.12 + t * 0.56), -0.02 + t * 0.36, 0.02), V(0.12, 0.17, 0.07), [0, 0, sd * (0.15 + t * 0.4)], WHITE);
  }
  // primaries: long overlapping feathers fanning outwards and down, longest at the wing tip
  const P = 6;
  for (let i = 0; i < P; i++) {
    const t = i / (P - 1);
    const ang = -0.3 + t * 1.2;                         // direction from vertical-down to outward
    const len = 0.17 + t * 0.19;
    const base = V(X(0.12 + t * 0.66), -0.06 + t * 0.5, -0.01 - t * 0.01);
    const dir = V(X(Math.sin(ang)), -Math.cos(ang), 0);
    const c = base.clone().addScaledVector(dir, len * 0.7);
    ell(b, c, V(0.12, len, 0.05), [0, 0, sd * ang], i % 2 ? WHITE : SHADE2);
  }
  const g = new THREE.Group();
  g.add(b.build({ name: 'wingMesh' }));
  return g;
}

export function build() {
  const root = new THREE.Group();
  root.name = 'kogane';
  const b = new BrickBuilder(1);

  // ---- body: ribbed connector + three tapering grub segments ----
  for (let i = 0; i < 4; i++) {
    const y = 0.02 + i * 0.075, r = 0.1 + i * 0.03;
    b.addMatrix(new THREE.TorusGeometry(r, 0.032, 8, 22).rotateX(Math.PI / 2), plastic(i % 2 ? RING : GROOVE), tmpM.makeTranslation(0, y, 0));
    b.cyl(0, y - 0.03, 0, r, 0.06, RING, { seg: 18 });
  }
  b.cyl(0, -0.03, 0, 0.09, 0.06, GROOVE, { seg: 14 });
  // segment 3 (lowest): a rounded bullet tip narrowing into the connector
  lathe(b, [[0.0, 0.26], [0.17, 0.27], [0.24, 0.34], [0.31, 0.5], [0.355, 0.66], [0.36, 0.74], [0.33, 0.78], [0, 0.78]], WHITE);
  // segment 2
  lathe(b, [[0, 0.75], [0.33, 0.75], [0.4, 0.8], [0.43, 0.92], [0.42, 1.04], [0.38, 1.09], [0, 1.09]], WHITE);
  // segment 1, under the chin
  lathe(b, [[0, 1.06], [0.39, 1.06], [0.45, 1.11], [0.47, 1.22], [0.45, 1.34], [0.36, 1.42], [0, 1.42]], WHITE);
  // grey creases between the segments
  for (const [y, r] of [[0.765, 0.335], [1.075, 0.385]])
    b.addMatrix(new THREE.TorusGeometry(r, 0.025, 6, 28).rotateX(Math.PI / 2), plastic(SHADE), tmpM.makeTranslation(0, y, 0));
  // tiny clasped hands on the front of the top segment
  for (const sd of [-1, 1]) {
    ell(b, V(sd * 0.09, 1.2, 0.41), V(0.1, 0.07, 0.06), [0, sd * 0.4, sd * 0.3], WHITE);
    ell(b, V(sd * 0.25, 1.24, 0.36), V(0.12, 0.06, 0.06), [0, sd * 0.9, sd * 0.2], SHADE);
  }

  // ---- skull head ----
  const HC = V(0, 1.9, 0), HR = 0.72, HSY = 0.78;
  ell(b, HC, V(HR, HR * HSY, HR * 0.95), [0, 0, 0], WHITE);
  // muzzle / upper jaw bulging forward under the eyes
  ell(b, V(0, 1.6, 0.3), V(0.44, 0.22, 0.38), [0, 0, 0], WHITE);
  // upper teeth: a row of rounded little teeth along the jaw rim, overhanging the body
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.3;
    ell(b, V(Math.sin(a) * 0.4, 1.45, 0.3 + Math.cos(a) * 0.3), V(0.09, 0.085, 0.05), [0, a, 0], WHITE);
  }
  // shadow line under the jaw where the mouth is
  b.addMatrix(new THREE.TorusGeometry(0.36, 0.02, 6, 24, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI), plastic(SOCKET), tmpM.makeTranslation(0, 1.47, 0.28));
  // eye sockets: big black ovals tilted outwards, with a grey rim
  const onHead = (dx, dy, dz) => {
    const u = V(dx, dy, dz).normalize();
    const p = V(HR * u.x, HR * HSY * u.y, HR * 0.95 * u.z).add(HC);
    const n = V(u.x / HR, u.y / (HR * HSY), u.z / (HR * 0.95)).normalize();
    return { p, n };
  };
  for (const sd of [-1, 1]) {
    const { p, n } = onHead(sd * 0.42, 0.1, 0.9);
    ellOn(b, p.clone().addScaledVector(n, -0.035), n, V(0.215, 0.27, 0.08), sd * 0.38, SHADE);
    ellOn(b, p.clone().addScaledVector(n, -0.012), n, V(0.195, 0.25, 0.07), sd * 0.38, SOCKET, { rough: 0.95 });
    // nostrils
    const q = onHead(sd * 0.07, -0.2, 1);
    ellOn(b, q.p.clone().addScaledVector(V(0, -0.02, 0.36), 0.1), V(0, 0, 1), V(0.022, 0.028, 0.02), 0, SOCKET);
  }
  // brow crease between the eyes
  { const { p, n } = onHead(0, 0.15, 1); ellOn(b, p.addScaledVector(n, -0.004), n, V(0.07, 0.012, 0.02), 0, RIM); }

  // ---- tail stub: out of the connector, curling down and back ----
  const curve = new THREE.CatmullRomCurve3([V(0, 0.0, 0), V(0, -0.1, -0.02), V(0, -0.2, -0.08), V(0, -0.27, -0.17)]);
  b.addMatrix(new THREE.TubeGeometry(curve, 12, TAIL_R, 10, false), plastic(TAIL), tmpM.identity());
  b.sphere(0, -0.27, -0.17, TAIL_R, TAIL);

  root.add(b.build({ name: 'koganeBody' }));

  // ---- wings, each on a pivot at the side of the head ----
  for (const sd of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.name = sd < 0 ? 'wingL' : 'wingR';
    pivot.position.set(sd * 0.6, 1.98, -0.12);
    pivot.rotation.y = -sd * 0.25;                     // swept slightly back
    pivot.add(wing(sd));
    root.add(pivot);
  }

  root.userData.tailFrom = V(0, -0.27, -0.17);
  root.userData.tailColor = TAIL;
  root.userData.tailRadius = TAIL_R;
  // gentle flapping (obj is the clone placed in the scene)
  root.userData.animate = (obj, t) => {
    const f = Math.sin(t * 7) * 0.28;
    const l = obj.getObjectByName('wingL'), r = obj.getObjectByName('wingR');
    if (l) l.rotation.z = -f;
    if (r) r.rotation.z = f;
  };
  return root;
}
