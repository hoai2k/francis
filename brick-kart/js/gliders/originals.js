// Original gliders: the base set (the Brick Wing itself lives in gliders.js).
// Each one is built from a few BrickBuilder meshes: one static mesh (mast, bar, ropes…) plus the
// parts fx animates (a spinning canopy, flapping wings, a waving tail…). Plain plastic merges into
// one vertex-coloured mesh per builder, so each part is about one draw call.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { BrickBuilder, C, plastic } from '../lego.js';

// ---- shape helpers (no per-frame work; geometries cached per module) ------------------------
const GEO = new Map();
const cache = (k, f) => { let g = GEO.get(k); if (!g) { g = f(); GEO.set(k, g); } return g; };
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
const P = new THREE.Vector3(), S = new THREE.Vector3(), D = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const boxG = () => cache('box', () => new THREE.BoxGeometry(1, 1, 1));
const cylG = (n) => cache('cyl' + n, () => new THREE.CylinderGeometry(1, 1, 1, n));
const coneG = (n) => cache('cone' + n, () => new THREE.ConeGeometry(1, 1, n));
const sphG = (n) => cache('sph' + n, () => new THREE.SphereGeometry(1, n, Math.max(6, Math.round(n * 0.6))));
const studG = () => cache('stud', () => new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0));

const mat = (col, o) => (o && o.mat) || plastic(col, o && o.m);
function put(b, geo, col, x, y, z, rx, ry, rz, sx, sy, sz, o) {
  M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
  b.addMatrix(geo, mat(col, o), M);
}
// centred box / cylinder (axis Y) / cone (apex +Y) / ellipsoid, with an optional rotation r = [rx, ry, rz]
const box = (b, col, x, y, z, sx, sy, sz, r = [0, 0, 0], o) => put(b, boxG(), col, x, y, z, r[0], r[1], r[2], sx, sy, sz, o);
const cyl = (b, col, x, y, z, rx, h, rz, r = [0, 0, 0], seg = 12, o) => put(b, cylG(seg), col, x, y, z, r[0], r[1], r[2], rx, h, rz, o);
const cone = (b, col, x, y, z, rad, h, r = [0, 0, 0], seg = 8, o) => put(b, coneG(seg), col, x, y, z, r[0], r[1], r[2], rad, h, rad, o);
const ball = (b, col, x, y, z, rx, ry = rx, rz = rx, seg = 10, o) => put(b, sphG(seg), col, x, y, z, 0, 0, 0, rx, ry, rz, o);
const stud = (b, col, x, y, z, r = 0.12, h = 0.08) => put(b, studG(), col, x, y, z, 0, 0, 0, r, h, r);
// a rod between two points
function rod(b, col, a, c, r = 0.03, seg = 5) {
  D.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = D.length();
  M.compose(P.set((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2), Q.setFromUnitVectors(UP, D.normalize()), S.set(r, len, r));
  b.addMatrix(cylG(seg), mat(col), M);
}
// a flat plate cut to an outline of [x, z] points (lying in the xz plane, thickness th, centred
// on y = 0), placed with a position and rotation
function slab(b, col, key, pts, th, x = 0, y = 0, z = 0, r = [0, 0, 0]) {
  const geo = cache('slab' + key + th, () => {
    const sh = new THREE.Shape(pts.map(([px, pz]) => new THREE.Vector2(px, -pz)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false, curveSegments: 3 });
    g.rotateX(-Math.PI / 2).translate(0, -th / 2, 0);
    return mergeVertices(g);   // indexed, so it merges with the box / cylinder geometries
  });
  put(b, geo, col, x, y, z, r[0], r[1], r[2], 1, 1, 1);
}
const mirror = (pts, sd) => (sd > 0 ? pts : pts.map(([x, z]) => [-x, z]));
const grip = (b, col = C.black, w = 0.42) => cyl(b, col, 0, 0, 0, 0.055, w * 2, 0.055, [0, 0, Math.PI / 2], 8);
// builds a part into a pivot group placed at (x, y, z)
function part(name, x, y, z, fill) {
  const b = new BrickBuilder(0.4);
  fill(b);
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  g.add(b.build({ name }));
  return g;
}
const ease = (cur, target, dt, k = 5) => cur + (target - cur) * Math.min(1, dt * k);
const FLAME = () => plastic(C.orange, { emissive: 0xff6a00, emissiveIntensity: 1.4 });
const FLAME_IN = () => plastic(C.yellow, { emissive: 0xffd040, emissiveIntensity: 1.6 });

export default [
  // ---- a striped beach umbrella that spins slowly overhead -----------------------------------
  {
    id: 'parasol', name: 'Parasol', blurb: 'Beach-day shade at 80 km/h', colors: [C.teal, C.white],
    build() {
      const b = new BrickBuilder(0.4);
      grip(b, C.black, 0.36);
      cyl(b, C.white, 0, 0.85, 0, 0.07, 1.7, 0.07, undefined, 8);
      for (let i = 0; i < 3; i++) cyl(b, C.teal, 0, 0.35 + i * 0.5, 0, 0.078, 0.16, 0.078, undefined, 8);
      const mesh = b.build({ name: 'parasol' });
      const N = 8, R = 3.05, H = 0.78, BASE = 1.5;
      const top = part('canopy', 0, 0, 0, (t) => {
        for (let i = 0; i < N; i++) {
          const col = i % 2 ? C.white : C.teal;
          const g = cache('wedge' + i, () => new THREE.ConeGeometry(R, H, 1, 1, false, (i * Math.PI * 2) / N, (Math.PI * 2) / N));
          put(t, g, col, 0, BASE + H / 2, 0, 0, 0, 0, 1, 1, 1);
          // a little valance flap under each panel
          const a = ((i + 0.5) * Math.PI * 2) / N, rr = R * Math.cos(Math.PI / N) - 0.02;
          box(t, col, rr * Math.sin(a), BASE - 0.1, rr * Math.cos(a), 2 * R * Math.sin(Math.PI / N) * 0.92, 0.22, 0.04, [0, a, 0]);
          // ribs and tip caps
          const ta = (i * Math.PI * 2) / N;
          rod(t, C.ltgray, [0, BASE + H - 0.15, 0], [R * 0.97 * Math.sin(ta), BASE - 0.03, R * 0.97 * Math.cos(ta)], 0.025, 4);
          ball(t, C.yellow, R * Math.sin(ta), BASE - 0.02, R * Math.cos(ta), 0.07, 0.07, 0.07, 6);
        }
        cyl(t, C.yellow, 0, BASE + H + 0.03, 0, 0.16, 0.12, 0.16, undefined, 10);
        stud(t, C.yellow, 0, BASE + H + 0.09, 0, 0.1, 0.09);
      });
      const tilt = new THREE.Group();
      tilt.rotation.x = -0.1;
      tilt.add(top);
      return {
        mesh, parts: [tilt],
        fx(s, dt) { top.rotation.y += dt * (0.7 + s.speed01 * 1.6); tilt.rotation.z = ease(tilt.rotation.z, s.steer * 0.12, dt); },
      };
    },
  },

  // ---- a folded brick paper plane that banks into the turns -----------------------------------
  {
    id: 'paperplane', name: 'Paper Plane', blurb: 'Folded in class, flown on the track', colors: [C.white, C.mdblue],
    build({ mast }) {
      const b = new BrickBuilder(0.4);
      mast(b, 1.45);
      grip(b);
      const mesh = b.build({ name: 'paperplane' });
      const plane = part('plane', 0, 1.62, 0, (t) => {
        for (const sd of [-1, 1]) {
          const r = [0, 0, sd * 0.2];
          // wing, with a blue fold stripe and a turned-up wingtip
          slab(t, C.white, 'pw' + sd, mirror([[0, 1.7], [3.1, -1.25], [2.6, -1.3], [0, -1.05]], sd), 0.07, 0, 0, 0, r);
          slab(t, C.mdblue, 'ps' + sd, mirror([[0.55, 0.85], [1.85, -0.75], [2.15, -0.8], [0.75, 0.85]], sd), 0.02, 0, 0.045, 0, r);
          slab(t, C.mdblue, 'pt', [[0, 0.3], [0.4, -0.35], [0, -0.4]], 0.05, sd * 2.7, 0.54, -0.95, [0, 0, Math.PI / 2 - sd * 0.25]);
          // a row of studs along the root of each wing (it is still a brick plane)
          for (let i = 0; i < 3; i++) {
            const x = sd * (0.35 + i * 0.12), z = 0.6 - i * 0.55;
            stud(t, C.white, x * Math.cos(0.2), 0.035 + Math.abs(x) * Math.sin(0.2), z, 0.11, 0.07);
          }
        }
        // the keel (the fold under the middle) holding the mast
        slab(t, C.white, 'keel', [[0, 1.6], [-0.38, -0.9], [0, -1.05]], 0.06, 0, 0, 0, [0, 0, Math.PI / 2]);
        slab(t, C.mdblue, 'keelb', [[-0.02, 0.3], [-0.28, -0.6], [-0.02, -0.7]], 0.075, 0, 0, 0, [0, 0, Math.PI / 2]);
      });
      return {
        mesh, parts: [plane],
        fx(s, dt) {
          plane.rotation.z = ease(plane.rotation.z, s.steer * 0.28, dt, 4);
          plane.rotation.x = -0.08 + Math.sin(s.t * 1.7) * 0.05;
          plane.position.y = 1.62 + Math.sin(s.t * 2.3) * 0.06;
        },
      };
    },
  },

  // ---- a monarch butterfly with flapping wings ---------------------------------------------------
  {
    id: 'butterfly', name: 'Butterfly', blurb: 'Float like one, race like a bee', colors: [C.orange, C.black],
    build({ mast }) {
      const b = new BrickBuilder(0.4);
      mast(b, 1.6);
      grip(b);
      // body, head and antennae
      cyl(b, C.black, 0, 1.75, -0.05, 0.16, 1.5, 0.16, [Math.PI / 2, 0, 0], 8);
      ball(b, C.black, 0, 1.77, 0.78, 0.22, 0.2, 0.22, 8);
      for (const sd of [-1, 1]) {
        rod(b, C.black, [sd * 0.08, 1.9, 0.85], [sd * 0.42, 2.35, 1.38], 0.025, 4);
        ball(b, C.black, sd * 0.42, 2.35, 1.38, 0.07, 0.07, 0.07, 6);
      }
      const mesh = b.build({ name: 'butterfly' });
      const wings = [-1, 1].map((sd) => part('wing', sd * 0.14, 1.75, 0, (w) => {
        const fore = [sd * 1.5, 0, 0.5], hind = [sd * 1.0, -0.02, -0.65];
        // forewing: black border round an orange panel, white spots, black veins
        cyl(w, C.black, fore[0], 0, fore[2], 1.55, 0.07, 1.0, [0, sd * 0.4, 0], 14);
        cyl(w, C.orange, fore[0] - sd * 0.06, 0, fore[2] - 0.03, 1.32, 0.1, 0.8, [0, sd * 0.4, 0], 14);
        // hindwing
        cyl(w, C.black, hind[0], hind[1], hind[2], 1.02, 0.07, 0.8, [0, -sd * 0.45, 0], 12);
        cyl(w, C.orange, hind[0] - sd * 0.04, hind[1], hind[2] + 0.03, 0.82, 0.1, 0.62, [0, -sd * 0.45, 0], 12);
        for (const [x, z] of [[2.55, 1.05], [2.85, 0.6], [2.8, 0.15], [2.3, 1.35], [1.8, -1.2], [1.4, -1.38]]) cyl(w, C.white, sd * x, 0, z, 0.08, 0.13, 0.08, undefined, 6);
        for (const [x, z, a] of [[1.4, 0.35, 0.25], [1.5, 0.75, -0.25], [1.0, -0.6, -0.35]]) box(w, C.black, sd * x, 0, z, 1.5, 0.12, 0.05, [0, sd * a, 0]);
      }));
      return {
        mesh, parts: wings,
        fx(s) {
          const a = 0.2 + Math.sin(s.t * 7) * 0.38;
          wings[0].rotation.z = -a; wings[1].rotation.z = a;
        },
      };
    },
  },

  // ---- a little striped hot-air balloon, burner flickering under it ---------------------------
  {
    id: 'balloon', name: 'Hot-Air Balloon', blurb: 'Up, up and a bit sideways', colors: [C.red, C.yellow],
    build() {
      const b = new BrickBuilder(0.4);
      grip(b, C.rbrown, 0.45);
      const Y = 2.3, RX = 1.5, RY = 1.1, TH = 0.74 * Math.PI;
      const rimY = Y + Math.cos(TH) * RY, rimR = Math.sin(TH) * RX;
      // skirt and rigging
      const sk = cache('skirt', () => new THREE.CylinderGeometry(rimR, 0.42, 0.42, 12));
      put(b, sk, C.yellow, 0, rimY - 0.21, 0, 0, 0, 0, 1, 1, 1);
      cyl(b, C.dkgray, 0, rimY - 0.44, 0, 0.44, 0.06, 0.44, undefined, 12);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2, cx = Math.sin(a), cz = Math.cos(a);
        rod(b, C.tan, [cx * 0.42, rimY - 0.44, cz * 0.42], [cx * 0.42, 0, cz * 0.22], 0.022, 4);
        // sandbags
        box(b, C.dktan, cx * 0.43, rimY - 0.7, cz * 0.43, 0.14, 0.18, 0.14, [0, a, 0]);
      }
      box(b, C.rbrown, 0, 0, 0, 0.84, 0.08, 0.44);
      // burner
      cyl(b, C.dkgray, 0, 0.62, 0, 0.15, 0.22, 0.15, undefined, 8);
      for (const sd of [-1, 1]) rod(b, C.dkgray, [sd * 0.13, 0.55, 0], [sd * 0.4, 0, 0], 0.025, 4);
      const mesh = b.build({ name: 'balloon' });
      const N = 10;
      const env = part('envelope', 0, 0, 0, (t) => {
        for (let i = 0; i < N; i++) {
          const g = cache('gore' + i, () => new THREE.SphereGeometry(1, 2, 9, (i * Math.PI * 2) / N, (Math.PI * 2) / N, 0, TH));
          put(t, g, i % 2 ? C.yellow : C.red, 0, Y, 0, 0, 0, 0, RX, RY, RX);
        }
        cyl(t, C.white, 0, Y, 0, RX + 0.02, 0.16, RX + 0.02, undefined, 20);
        cyl(t, C.red, 0, Y + RY - 0.02, 0, 0.36, 0.12, 0.36, undefined, 12);
        stud(t, C.red, 0, Y + RY + 0.04, 0, 0.14, 0.1);
      });
      const flame = new THREE.Group();
      flame.position.set(0, 0.73, 0);
      const fb = new BrickBuilder(0.4);
      cone(fb, 0, 0, 0.3, 0, 0.15, 0.6, undefined, 7, { mat: FLAME() });
      cone(fb, 0, 0, 0.22, 0, 0.08, 0.38, undefined, 6, { mat: FLAME_IN() });
      flame.add(fb.build({ name: 'flame', shadows: false }));
      return {
        mesh, parts: [env, flame],
        fx(s, dt) {
          env.rotation.y += dt * 0.35;
          env.rotation.z = Math.sin(s.t * 1.3) * 0.035;
          const f = 0.75 + 0.25 * Math.sin(s.t * 23) + 0.15 * Math.sin(s.t * 37.7);
          flame.scale.set(0.9 + f * 0.15, f, 0.9 + f * 0.15);
        },
      };
    },
  },

  // ---- scalloped dragon wings that flex like they're really flying -------------------------------
  {
    id: 'dragonwing', name: 'Dragon Wings', blurb: 'Borrowed from a very patient dragon', colors: [C.purple, C.gold],
    build({ mast }) {
      const b = new BrickBuilder(0.4);
      mast(b, 1.62);
      grip(b);
      // a little spine with red spikes between the wings
      box(b, C.purple, 0, 1.75, 0, 0.5, 0.25, 1.4);
      for (let i = 0; i < 4; i++) cone(b, C.red, 0, 1.97, 0.5 - i * 0.38, 0.1, 0.28, [-0.4, 0, 0], 6);
      const mesh = b.build({ name: 'dragonwing' });
      const pivots = [];
      const sides = [-1, 1].map((sd) => {
        const inner = part('wing-in', sd * 0.25, 1.72, 0.2, (w) => {
          slab(w, C.purple, 'di' + sd, mirror([[0, 0.25], [1.75, 0.42], [1.75, -1.2], [1.2, -0.82], [0.62, -1.32], [0.3, -0.9], [0, -0.95]], sd), 0.07);
          rod(w, C.gold, [0, 0.03, 0.25], [sd * 1.75, 0.03, 0.42], 0.07, 6);
          rod(w, C.gold, [sd * 0.5, 0.03, 0.3], [sd * 0.62, 0.03, -1.3], 0.035, 4);
        });
        const outer = part('wing-out', sd * 1.75, 0, 0.42, (w) => {
          slab(w, C.purple, 'do' + sd, mirror([[0, 0.05], [1.0, 0.25], [1.95, -0.05], [1.5, -0.42], [1.62, -1.05], [1.0, -0.88], [0.9, -1.45], [0.45, -1.0], [0, -1.62]], sd), 0.07);
          rod(w, C.gold, [0, 0.03, 0], [sd * 1.0, 0.03, 0.25], 0.06, 6);
          rod(w, C.gold, [sd * 1.0, 0.03, 0.25], [sd * 1.95, 0.03, -0.05], 0.045, 5);
          for (const [x, z] of [[1.62, -1.05], [0.9, -1.45], [0, -1.62]]) rod(w, C.gold, [sd * 0.05, 0.03, 0], [sd * x, 0.03, z], 0.035, 4);
          ball(w, C.gold, 0, 0.03, 0, 0.11, 0.11, 0.11, 8);
          cone(w, C.white, sd * 2.0, 0.03, -0.07, 0.07, 0.3, [0, 0, -sd * Math.PI / 2], 5);
          cone(w, C.white, 0, 0.14, 0.03, 0.06, 0.25, undefined, 5);
        });
        inner.add(outer);
        pivots.push([inner, outer, sd]);
        return inner;
      });
      return {
        mesh, parts: sides,
        fx(s) {
          const a = Math.sin(s.t * 3.2), c = Math.sin(s.t * 3.2 - 0.7);
          for (const [inner, outer, sd] of pivots) { inner.rotation.z = sd * (0.14 + 0.16 * a); outer.rotation.z = sd * (0.06 + 0.22 * c); }
        },
      };
    },
  },

  // ---- a gyrocopter rotor with a tail boom and its own little tail prop -------------------------
  {
    id: 'gyrocopter', name: 'Gyrocopter', blurb: 'Whirly bits make it go up', colors: [C.yellow, C.dkgray],
    build({ mast }) {
      const b = new BrickBuilder(0.4);
      mast(b, 1.45);
      grip(b);
      // hub, engine pod and tail boom
      cyl(b, C.yellow, 0, 1.5, 0, 0.32, 0.36, 0.32, undefined, 12);
      ball(b, C.yellow, 0, 1.45, 0.1, 0.42, 0.3, 0.5, 10);
      ball(b, C.azure, 0, 1.5, 0.48, 0.24, 0.17, 0.12, 8, { m: { trans: true, opacity: 0.7 } });
      rod(b, C.dkgray, [0, 1.45, -0.3], [0, 1.6, -1.45], 0.07, 6);
      slab(b, C.yellow, 'gfin', [[0, 0], [0.55, -0.1], [0.5, -0.45], [0, -0.42]], 0.06, 0, 1.55, -1.1, [0, 0, Math.PI / 2]);
      box(b, C.red, 0, 1.62, -1.32, 0.9, 0.05, 0.3);
      const mesh = b.build({ name: 'gyrocopter' });
      const rotor = part('rotor', 0, 1.9, 0, (r) => {
        cyl(r, C.dkgray, 0, -0.1, 0, 0.12, 0.22, 0.12, undefined, 8);
        cyl(r, C.red, 0, 0.02, 0, 0.24, 0.1, 0.24, undefined, 10);
        stud(r, C.red, 0, 0.07, 0, 0.13, 0.08);
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3, sx = Math.sin(a), sz = Math.cos(a);
          box(r, C.dkgray, sx * 1.85, 0, sz * 1.85, 0.34, 0.06, 3.2, [0, a, 0]);
          box(r, C.yellow, sx * 3.25, 0.005, sz * 3.25, 0.35, 0.065, 0.45, [0, a, 0]);
          box(r, C.red, sx * 2.9, 0.005, sz * 2.9, 0.35, 0.065, 0.12, [0, a, 0]);
        }
      });
      const tail = part('tailprop', 0.07, 1.82, -1.32, (p) => {
        cyl(p, C.dkgray, 0, 0, 0, 0.05, 0.1, 0.05, [0, 0, Math.PI / 2], 6);
        box(p, C.yellow, 0.05, 0, 0, 0.03, 0.62, 0.1);
      });
      return {
        mesh, parts: [rotor, tail],
        fx(s, dt) { rotor.rotation.y += dt * (8 + s.speed01 * 10); tail.rotation.x += dt * 22; },
      };
    },
  },

  // ---- a delta kite with a bow-tie tail that waves behind ---------------------------------------
  {
    id: 'kite', name: 'Delta Kite', blurb: 'Hold on tight, the wind does the rest', colors: [C.blue, C.lime],
    build({ mast }) {
      const b = new BrickBuilder(0.4);
      mast(b, 1.55);
      grip(b);
      const mesh = b.build({ name: 'kite' });
      const BOWS = [C.red, C.orange, C.yellow, C.lime, C.azure];
      const kite = part('kite', 0, 1.72, 0, (t) => {
        for (const sd of [-1, 1]) {
          slab(t, C.blue, 'kw' + sd, mirror([[0, 1.45], [3.3, -0.75], [0, -0.8]], sd), 0.05);
          slab(t, C.lime, 'kc' + sd, mirror([[0, 0.75], [1.6, -0.05], [1.85, -0.25], [0, 0.45]], sd), 0.02, 0, 0.032, 0);
          slab(t, C.lime, 'kt' + sd, mirror([[2.35, -0.3], [3.3, -0.75], [2.45, -0.75]], sd), 0.02, 0, 0.032, 0);
          rod(t, C.black, [0, 0.05, 1.45], [sd * 3.3, 0.05, -0.75], 0.035, 4);
        }
        rod(t, C.black, [0, 0.05, 1.5], [0, 0.05, -0.85], 0.04, 4);
        rod(t, C.black, [-1.75, 0.07, -0.05], [1.75, 0.07, -0.05], 0.035, 4);
        // keel the string is tied to
        slab(t, C.blue, 'kk', [[0, 0.9], [-0.42, -0.15], [0, -0.5]], 0.04, 0, 0, 0, [0, 0, Math.PI / 2]);
      });
      // the tail segments chain off each other so a wave travels down it
      let prev = kite, py = 0, pz = -0.85;
      const tail = [];
      for (let i = 0; i < BOWS.length; i++) {
        const seg = part('bow', 0, py, pz, (t) => {
          rod(t, C.white, [0, 0, 0], [0, -0.04, -0.34], 0.015, 3);
          for (const sd of [-1, 1]) slab(t, BOWS[i], 'bow' + sd, mirror([[0, 0], [0.2, 0.11], [0.2, -0.11]], sd), 0.035, 0, -0.03, -0.24);
          ball(t, BOWS[i], 0, -0.03, -0.24, 0.045, 0.045, 0.045, 6);
        });
        prev.add(seg);
        tail.push(seg);
        prev = seg; py = -0.04; pz = -0.34;
      }
      kite.rotation.x = -0.12;
      return {
        mesh, parts: [kite],
        fx(s, dt) {
          kite.rotation.z = ease(kite.rotation.z, s.steer * 0.22, dt, 4);
          kite.rotation.x = -0.12 + Math.sin(s.t * 2.1) * 0.04;
          for (let i = 0; i < tail.length; i++) {
            tail[i].rotation.y = Math.sin(s.t * 5 - i * 0.9) * 0.32;
            tail[i].rotation.x = 0.08 + Math.sin(s.t * 4.1 - i * 0.7) * 0.12;
          }
        },
      };
    },
  },

  // ---- a giant 2x8 plate held overhead, studs, tubes and all -----------------------------------
  {
    id: 'brickplate', name: 'Big Plate', blurb: 'A 2x8 plate is basically a wing', colors: [C.green, C.ltgray],
    build({ mast }) {
      const b = new BrickBuilder(0.4);
      mast(b, 1.5);
      grip(b);
      const mesh = b.build({ name: 'brickplate' });
      const PITCH = 0.82;
      const plate = part('plate', 0, 1.55, 0, (t) => {
        t.brick(0, 0, 0, 8, 2, 1, C.green, { pitch: PITCH, seg: 10 });
        // the underside tubes (only real bricks have these)
        for (let i = 0; i < 7; i++) {
          const x = (i - 3) * PITCH;
          cyl(t, C.green, x, -0.12, 0, 0.27, 0.24, 0.27, undefined, 10);
          cyl(t, C.dkgreen, x, -0.235, 0, 0.18, 0.02, 0.18, undefined, 8);
        }
        // mount clip on the mast
        box(t, C.ltgray, 0, -0.1, 0, 0.55, 0.2, 0.55);
      });
      plate.rotation.x = -0.08;
      return {
        mesh, parts: [plate],
        fx(s, dt) {
          plate.rotation.z = ease(plate.rotation.z, s.steer * 0.2, dt, 4) + Math.sin(s.t * 2.6) * 0.004;
          plate.position.y = 1.55 + Math.sin(s.t * 2.2) * 0.05;
        },
      };
    },
  },
];
