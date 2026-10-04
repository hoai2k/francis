// Star Wars Rides vehicle pack (see buildVehicle in ../characters.js for the contract).
// Cartoon-compact LEGO versions of six movie vehicles; helpers live in starwars-kit.js.
import { THREE, BrickBuilder, C, plastic, mat, box, cyl, cone, frustum, sphere, geo, rod, studs, glow, morphPair, flipped, fitOf } from './starwars-kit.js';

const PI = Math.PI, S = Math.sin;
const glass = () => plastic(C.azure, { trans: true, opacity: 0.42 });
const BACK = -PI / 2;   // exhaust flames pointing straight back

// ---- X-34 landspeeder -------------------------------------------------------------------
function landspeeder({ rig }) {
  const f = fitOf(rig);
  const RUST = 0xa8432a, G = C.ltgray, D = C.dkgray, TAN = C.tan, BK = C.black;
  const b = new BrickBuilder(0.4);
  const exh = glow(0x8fd8ff, 1);
  // hull: rust top, silver skirt, rounded wedge nose
  box(b, null, 0, 0.3, 0.05, 2.3, 0.5, 3.5, RUST);
  cyl(b, null, 0, 0.3, 1.8, 1.15, 0.5, RUST, 'y', { r2: 0.75, seg: 24 });
  for (const sd of [-1, 1]) box(b, null, sd * 1.16, 0.18, 0.05, 0.04, 0.2, 3.3, G);
  cyl(b, null, 0, 0.17, 1.8, 1.17, 0.2, G, 'y', { r2: 0.77, seg: 24 });
  box(b, null, 0, 0.04, 0.1, 2.0, 0.1, 3.2, D);
  // hood sloping down to the nose, with intake grilles and studs
  box(b, null, 0, 0.62, 1.35, 2.1, 0.2, 1.5, RUST, { rx: 0.1 });
  cyl(b, null, 0, 0.6, 1.95, 1.0, 0.16, RUST, 'y', { r2: 0.55, seg: 24 });
  for (const sd of [-1, 1]) {
    box(b, null, sd * 0.55, 0.74, 1.45, 0.55, 0.06, 0.6, D, { rx: 0.1 });
    for (let i = 0; i < 4; i++) box(b, null, sd * 0.55, 0.78, 1.25 + i * 0.13, 0.5, 0.03, 0.04, G, { rx: 0.1 });
  }
  studs(b, null, 0, 0.71, 2.05, 2, 1, RUST);
  // split V windscreen, as tall as the driver's chest
  const wh = 0.42 * f.clamp(f.sy / 1.2, 0.8, 1.3), wy = 0.79 + wh / 2;
  for (const sd of [-1, 1]) {
    box(b, null, sd * 0.47, wy, 0.92 - (wy - 1.0) * 0.36, 1.0, wh, 0.04, 0, { mat: glass(), ry: sd * 0.33, rx: -0.35 });
    box(b, null, sd * 0.47, 0.79 + wh, 0.86 - (wh - 0.42) * 0.36, 1.0, 0.04, 0.05, D, { ry: sd * 0.33, rx: -0.35 });
  }
  box(b, null, 0, wy, 1.06 - (wy - 1.0) * 0.36, 0.06, wh + 0.04, 0.06, D, { rx: -0.35 });
  // cockpit: side walls (pushed out for wide hips), dash + column, tan bench seat
  const WX = f.clamp(f.hip + 0.13, 1.05, 1.12);
  for (const sd of [-1, 1]) {
    box(b, null, sd * WX, 0.8, -0.35, 0.2, 0.5, 1.9, RUST);
    box(b, null, sd * WX, 1.07, -0.35, 0.26, 0.05, 1.95, G);
  }
  box(b, null, 0, 0.75, 0.62, 1.9, 0.4, 0.3, D);
  box(b, null, 0.45, 0.96, 0.62, 0.3, 0.04, 0.2, C.lime);
  rod(b, null, [0, 0.9, 0.62], [0, 1.22, 0.42], 0.05, D);
  const bw = f.clamp(f.hip * 2 + 0.1, 1.6, 1.9);
  box(b, null, 0, 0.6, -0.5, bw, 0.12, 0.8, TAN);
  box(b, null, 0, 0.95, -0.95, bw + 0.1, 0.75, 0.18, TAN, { rx: -0.1 });
  box(b, null, 0, 0.98, -0.85, 0.06, 0.7, 0.04, D, { rx: -0.1 });
  // rear deck
  box(b, null, 0, 0.7, -1.4, 2.2, 0.3, 0.7, RUST);
  for (const sd of [-1, 1]) studs(b, null, sd * 0.7, 0.85, -1.4, 2, 1, RUST);
  box(b, null, 0, 0.32, -1.78, 2.1, 0.45, 0.1, D);
  // three turbines: two outboard, one dorsal; the port one (+X) has its cover off
  const spin = [], parts = [];
  const engine = (x, y, z, r, len, bare) => {
    const f = z + len / 2, back = z - len / 2;
    if (bare) {
      cyl(b, null, x, y, f - 0.25, r, 0.5, G);
      cyl(b, null, x, y, z - 0.15, r * 0.78, len - 0.6, D);
      for (let i = 0; i < 4; i++) cyl(b, null, x, y, back + 0.25 + i * 0.22, r * 0.92, 0.05, G);
      rod(b, null, [x + r * 0.6, y + 0.1, f - 0.5], [x + r * 0.55, y + 0.12, back + 0.2], 0.035, C.red);
      rod(b, null, [x + r * 0.5, y - 0.15, f - 0.5], [x + r * 0.62, y - 0.1, back + 0.2], 0.03, C.yellow);
    } else {
      cyl(b, null, x, y, z + 0.05, r, len - 0.2, G);
      cyl(b, null, x, y, z - 0.25, r * 1.02, 0.14, RUST);
    }
    cyl(b, null, x, y, f - 0.06, r * 1.05, 0.14, D);
    cyl(b, null, x, y, f - 0.01, r * 0.82, 0.02, BK);
    cyl(b, null, x, y, back + 0.06, r * 0.86, 0.16, D);
    cyl(b, null, x, y, back - 0.03, r * 0.62, 0.04, 0, 'z', { mat: exh });
    // intake fan (spins with speed)
    const fan = new THREE.Group(); fan.position.set(x, y, f + 0.02);
    const fb = new BrickBuilder(0.4);
    cyl(fb, null, 0, 0, 0, r * 0.25, 0.06, G);
    for (let i = 0; i < 6; i++) box(fb, mat(0, 0, 0, 0, 0, (i * PI) / 3), 0, r * 0.45, 0, 0.1, r * 0.6, 0.02, C.ltgray, { ry: 0.5 });
    fan.add(fb.build({ name: 'fan' }));
    parts.push(fan); spin.push({ obj: fan, axis: 'z', rate: 16 });
  };
  for (const sd of [-1, 1]) {
    box(b, null, sd * 1.18, 0.55, -1.5, 0.3, 0.14, 0.7, D);
    engine(sd * 1.33, 0.6, -1.5, 0.3, 1.4, sd > 0);
  }
  box(b, null, 0, 1.02, -1.6, 0.22, 0.4, 0.7, RUST);
  engine(0, 1.38, -1.6, 0.27, 1.3, false);
  return {
    mesh: b.build({ name: 'landspeeder' }), seat: [0, 0.62, -0.4], control: 'wheel', hover: 0.4, spin, parts,
    exhaust: [[1.33, 0.6, -2.26, BACK], [-1.33, 0.6, -2.26, BACK], [0, 1.38, -2.31, BACK]],
    fx(s) { exh.emissiveIntensity = 0.5 + s.speed01 * 1.3 + (s.boosting ? 1.6 : 0) + S(s.t * 31) * 0.12; },
  };
}

// ---- 74-Z speeder bike ------------------------------------------------------------------
function speederBike({ rig }) {
  const f = fitOf(rig);
  const G = C.ltgray, D = C.dkgray, OL = 0x5b6b33, BK = C.black;
  const b = new BrickBuilder(0.4);
  const exh = glow(0xff8a3a, 1.2);
  // long slim body tapering to a nose
  box(b, null, 0, 0.45, -0.35, 0.62, 0.42, 2.1, G);
  frustum(b, null, 0, 0.45, 0.7, 1.75, 0.62, 0.42, 0.3, 0.22, G);
  box(b, null, 0, 0.47, 1.77, 0.3, 0.2, 0.06, D);
  for (const sd of [-1, 1]) {
    box(b, null, sd * 0.33, 0.47, -0.25, 0.06, 0.28, 1.3, OL);
    box(b, null, sd * 0.4, 0.3, 0.1, 0.28, 0.06, 0.4, D);              // foot pedals
    rod(b, null, [sd * 0.12, 0.52, 1.35], [sd * 0.23, 0.5, 2.22], 0.045, D);   // vane booms
  }
  // saddle, back hump, console up to the handlebars
  box(b, null, 0, 0.72, -0.62, 0.5, 0.14, 0.8, BK);
  box(b, null, 0, 0.86, -1.08, 0.5, 0.22, 0.2, BK);
  box(b, null, 0, 0.75, 0.32, 0.5, 0.26, 0.75, G, { rx: 0.22 });
  box(b, null, 0, 0.94, 0.4, 0.34, 0.16, 0.3, D);
  box(b, null, 0, 1.03, 0.42, 0.2, 0.04, 0.16, C.red, { matOpts: { emissive: 0xff3020, emissiveIntensity: 0.7 } });
  // blaster cannon under the nose
  box(b, null, 0, 0.27, 0.65, 0.16, 0.1, 0.45, D);
  cyl(b, null, 0, 0.2, 0.85, 0.065, 0.8, D);
  // rear engine block with an X of little vanes around the exhaust
  box(b, null, 0, 0.5, -1.6, 0.78, 0.56, 0.6, G);
  box(b, null, 0, 0.5, -1.33, 0.8, 0.58, 0.08, D);
  studs(b, null, 0, 0.78, -1.6, 2, 1, G);
  cyl(b, null, 0, 0.5, -1.93, 0.24, 0.08, D);
  cyl(b, null, 0, 0.5, -1.98, 0.17, 0.04, 0, 'z', { mat: exh });
  box(b, null, 0, 0.92, -1.68, 0.05, 0.3, 0.45, D);
  box(b, null, 0, 0.12, -1.68, 0.05, 0.25, 0.45, D);
  for (const sd of [-1, 1]) box(b, null, sd * 0.56, 0.5, -1.68, 0.35, 0.05, 0.45, D);
  // steering vanes at the end of the booms
  const vanes = new THREE.Group(); vanes.position.set(0, 0.5, 2.25);
  const vb = new BrickBuilder(0.4);
  for (const sd of [-1, 1]) {
    box(vb, null, sd * 0.25, 0, 0, 0.38, 0.05, 0.5, G, { rz: sd * 0.15 });
    box(vb, null, sd * 0.25, 0, -0.24, 0.38, 0.06, 0.07, D, { rz: sd * 0.15 });
    box(vb, null, sd * 0.43, sd * 0.03, 0.02, 0.05, 0.16, 0.42, OL, { rz: sd * 0.15 });
  }
  vanes.add(vb.build({ name: 'vanes' }));
  // a big rider gets a slightly broader bike (it should still look small under them)
  const kx = f.clamp(1 + (f.W - 1.3) * 0.25, 1, 1.15), k = 1 + f.big * 0.03;
  const bike = new THREE.Group(); bike.add(b.build({ name: 'speederbike' }), vanes); bike.scale.set(kx, k, k);
  return {
    mesh: bike, seat: [0, 0.8 * k, -0.62 * k], control: 'bars', hover: 0.55,
    steer: [{ obj: vanes, axis: 'y', amount: 0.35 }], exhaust: [[0, 0.5 * k, -2.02 * k, BACK]],
    fx(s) { exh.emissiveIntensity = 0.7 + s.speed01 * 1.5 + (s.boosting ? 1.8 : 0) + S(s.t * 27) * 0.15; },
  };
}

// ---- Anakin's podracer ------------------------------------------------------------------
function podracer({ rig }) {
  const f = fitOf(rig);
  const BL = 0x1e5aa8, G = C.ltgray, D = C.dkgray, BK = C.black, Y = C.yellow;
  const b = new BrickBuilder(0.4);
  const exh = glow(0xff9a40, 1.2), core = glow(0xc8e4ff, 2.2), halo = glow(0x5a4aff, 1.8, { trans: true, opacity: 0.55 });
  // the little cockpit pod: an open elliptical tub, widened for big drivers
  const PZ = -1.35, ps = f.clamp(1 + (f.W - 1.3) * 0.45, 0.92, 1.28), px = 0.82 * ps, pz = 0.95 * ps;
  const FZ = PZ + pz;   // front of the pod
  cyl(b, null, 0, 0.5, PZ, px, 0.7, BL, 'y', { r2: pz, tube: true, seg: 22 });
  cyl(b, null, 0, 0.5, PZ, px - 0.02, 0.7, D, 'y', { r2: pz - 0.02, tube: true, inside: true, seg: 22 });
  sphere(b, null, 0, 0.2, PZ, px, BL, { sy: 0.42 / ps, sz: pz / px, w: 18, h: 8 });
  cyl(b, null, 0, 0.47, PZ, px - 0.02, 0.06, D, 'y', { r2: pz - 0.02, seg: 22 });
  geo(b, null, new THREE.TorusGeometry(1, 0.07, 6, 26), G, mat(0, 0.86, PZ, PI / 2, 0, 0, px, pz, 1));
  cyl(b, null, 0, 0.56, PZ, px + 0.015, 0.12, G, 'y', { r2: pz + 0.015, tube: true, seg: 22 });
  cyl(b, null, 0, 0.36, PZ, px + 0.01, 0.05, Y, 'y', { r2: pz + 0.01, tube: true, seg: 22 });
  // pointed snout, dash + lever post, tail fin and thruster
  cone(b, null, 0, 0.5, FZ - 0.15, 0.42, 0.75, BL, 'z', { r2: 0.3 });
  cone(b, null, 0, 0.5, FZ + 0.35, 0.12, 0.3, G, 'z');
  box(b, null, 0, 0.85, FZ - 0.18, 0.75, 0.32, 0.25, D);
  box(b, null, 0, 1.08, FZ, 0.22, 0.26, 0.2, D);
  for (const sd of [-1, 1]) box(b, null, sd * 0.2, 1.02, FZ - 0.18, 0.14, 0.04, 0.12, sd > 0 ? C.red : C.lime);
  box(b, null, 0, 1.0, PZ - pz + 0.1, 0.08, 0.5, 0.45, BL, { rx: -0.35 });
  cyl(b, null, 0, 0.55, PZ - pz, 0.28, 0.22, G);
  for (const sd of [-1, 1]) box(b, null, sd * (px - 0.02), 0.7, PZ - 0.2, 0.12, 0.2, 0.5, G);
  // engines + binder + cables swing together from a pivot at the front of the pod
  const F = [0, 0.6, -0.55];
  const front = new THREE.Group(); front.position.set(...F);
  const base = mat(-F[0], -F[1], -F[2]);
  const fb = new BrickBuilder(0.4);
  for (const sd of [-1, 1]) {
    const x = sd * 1.15, y = 0.9;
    cyl(fb, base, x, y, 1.35, 0.36, 1.7, G, 'z', { seg: 16 });
    cyl(fb, base, x, y, 2.2, 0.39, 0.25, BL, 'z', { seg: 16 });
    cyl(fb, base, x, y, 2.33, 0.3, 0.02, BK);
    cyl(fb, base, x, y, 2.31, 0.08, 0.1, G);
    box(fb, base, x, y + 0.3, 2.48, 0.55, 0.06, 0.42, G, { rx: -0.18 });
    box(fb, base, x, y - 0.3, 2.48, 0.55, 0.06, 0.42, G, { rx: 0.18 });
    box(fb, base, x, y + 0.34, 1.25, 0.4, 0.1, 1.2, BL);
    box(fb, base, x + sd * 0.35, y, 1.25, 0.06, 0.18, 1.4, BL);
    box(fb, base, x, y + 0.4, 0.95, 0.12, 0.05, 0.3, Y);
    cyl(fb, base, x, y, 0.3, 0.29, 0.4, D, 'z', { seg: 16 });
    cyl(fb, base, x, y, 0.09, 0.23, 0.04, 0, 'z', { mat: exh });
    box(fb, base, x, y + 0.5, 0.65, 0.06, 0.35, 0.55, BL, { rx: -0.25 });
    box(fb, base, x + sd * 0.48, y, 0.65, 0.35, 0.06, 0.55, BL);
    box(fb, base, sd * 0.8, y, 1.9, 0.14, 0.22, 0.28, G);
    rod(fb, base, [sd * 0.55, 0.62, -0.6], [sd * 0.92, 0.82, 0.32], 0.03, BK);
    rod(fb, base, [sd * 0.5, 0.75, -0.62], [sd * 0.98, 0.98, 0.28], 0.03, BK);
  }
  front.add(fb.build({ name: 'engines' }));
  // the crackling energy binder between the engines
  const binder = new THREE.Group(); binder.position.set(0, 0.9 - F[1], 1.9 - F[2]);
  const bb = new BrickBuilder(0.4);
  cyl(bb, null, 0, 0, 0, 0.045, 1.5, 0, 'x', { mat: core, seg: 8 });
  cyl(bb, null, 0, 0, 0, 0.16, 1.46, 0, 'x', { mat: halo, seg: 10 });
  binder.add(bb.build({ name: 'binder', shadows: false }));
  front.add(binder);
  return {
    mesh: b.build({ name: 'podracer' }), seat: [0, 0.62, PZ], control: 'yoke', hover: 0.5, glider: { z: PZ - 0.1 },
    exhaust: [[1.15, 0.9, 0.05, BACK], [-1.15, 0.9, 0.05, BACK]],
    steer: [{ obj: front, axis: 'y', amount: 0.16 }], parts: [front],
    fx(s) {
      const t = s.t;
      front.rotation.z = S(t * 2.1) * 0.04;
      front.position.y = F[1] + S(t * 3.7) * 0.03;
      const f = 0.75 + 0.25 * S(t * 41) * S(t * 17.3);
      binder.scale.set(1, f * (1 + s.speed01 * 0.4), f * (1 + s.speed01 * 0.4));
      core.emissiveIntensity = 1.6 + f;
      halo.opacity = 0.25 + 0.3 * f;
      exh.emissiveIntensity = 0.6 + s.speed01 * 1.6 + (s.boosting ? 2 : 0) + S(t * 29) * 0.15;
    },
  };
}

// ---- X-wing -----------------------------------------------------------------------------
const UNIT = new THREE.BoxGeometry(1, 1, 1);
// a flat unit box whose +x end is narrowed to k and shifted by s along z (a tapered wing panel)
const traps = new Map();
function trap(k, s) {
  const key = k.toFixed(3) + ',' + s.toFixed(3);
  let g = traps.get(key);
  if (!g) {
    g = UNIT.clone();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getX(i) > 0) p.setZ(i, p.getZ(i) * k + s);
    g.computeVertexNormals();
    traps.set(key, g);
  }
  return g;
}
// a box laid from point a to point c (w across, kept level; h up): stripes and panels on sloped hulls
function bar(b, base, a, c, w, h, color, o) {
  const A = new THREE.Vector3(...a), Z = new THREE.Vector3(...c).sub(A), len = Z.length();
  Z.normalize();
  const X = new THREE.Vector3(0, 1, 0).cross(Z).normalize(), Y = Z.clone().cross(X);
  const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(A.addScaledVector(Z, len / 2)).multiply(new THREE.Matrix4().makeScale(w, h, len));
  geo(b, base, UNIT, color, m, o);
}
// a small box sitting on a sphere (centre c, radius r) at azimuth az / elevation el, facing out
function onDome(b, c, r, az, el, w, h, d, color, o) {
  const n = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const m = new THREE.Matrix4().makeRotationY(az).multiply(new THREE.Matrix4().makeRotationX(-el));
  m.setPosition(c[0] + n.x * r, c[1] + n.y * r, c[2] + n.z * r).multiply(new THREE.Matrix4().makeScale(w, h, d));
  geo(b, null, UNIT, color, m, o);
}

function xwing({ rig }) {
  const f = fitOf(rig);
  const W = C.white, R = C.red, G = C.ltgray, D = C.dkgray, BK = C.black;
  const b = new BrickBuilder(0.4);
  const eng = glow(0xff3018, 1.4, { base: 0xff2000 });
  // cockpit tub: the side walls clear the driver's hips
  const TX = f.clamp(f.hip + 0.08, 0.68, 0.95), dx = TX - 0.68, TW = 1.5 + dx * 2;
  box(b, null, 0, 0.41, -0.15, TW, 0.62, 1.8, W);
  box(b, null, 0, 0.07, -0.45, 1.0, 0.1, 3.6, D);                  // dark keel under the hull
  box(b, null, 0, 0.725, -0.2, TW - 0.3, 0.02, 1.5, D);             // cockpit floor
  for (const sd of [-1, 1]) {
    box(b, null, sd * TX, 0.86, -0.2, 0.16, 0.3, 1.5, W);
    box(b, null, sd * TX, 1.02, -0.2, 0.2, 0.04, 1.52, G);
    box(b, null, sd * (TW / 2 + 0.005), 0.5, -0.15, 0.02, 0.1, 1.7, R);     // red flank stripe
    box(b, null, sd * (TW / 2 + 0.005), 0.25, -0.35, 0.02, 0.14, 0.9, G);   // grey hull panel
    for (let i = 0; i < 3; i++) box(b, null, sd * (TW / 2 + 0.01), 0.25, -0.65 + i * 0.3, 0.02, 0.1, 0.04, D);
  }
  // seat back, dash with a couple of lights
  box(b, null, 0, 0.9, -0.93, TW - 0.4, 0.36, 0.12, D);
  box(b, null, 0, 0.84, -1.07, TW - 0.3, 0.24, 0.18, W);
  box(b, null, 0, 0.83, 0.52, TW - 0.32, 0.24, 0.56, D);
  box(b, null, 0.2, 0.96, 0.6, 0.12, 0.03, 0.1, C.lime);
  box(b, null, -0.2, 0.96, 0.6, 0.12, 0.03, 0.1, R);
  // the long nose: a quick taper under the canopy, then a slim pointed snout
  const NA = 0.75, NB = 1.25, NT = 2.75, nw = 0.95 + dx;
  frustum(b, null, 0, 0.41, NA, NB, TW, 0.62, nw, 0.5, W, { drop: -0.065 });
  frustum(b, null, 0, 0.37, NB, NT, nw, 0.5, 0.34, 0.24, W, { drop: -0.14 });
  box(b, null, 0, 0.3, NT + 0.04, 0.3, 0.2, 0.08, G);
  cyl(b, null, 0, 0.3, NT + 0.1, 0.06, 0.1, D, 'z', { seg: 8 });
  const nhw = (z) => nw / 2 + (0.17 - nw / 2) * (z - NB) / (NT - NB), ntop = (z) => 0.62 - 0.2 * (z - NB) / (NT - NB);
  for (const sd of [-1, 1]) {
    // Red Five's twin nose stripes, and grey panels down the nose flanks
    bar(b, null, [sd * (nhw(1.4) - 0.1), ntop(1.4) + 0.012, 1.4], [sd * (nhw(2.5) - 0.05), ntop(2.5) + 0.012, 2.5], 0.08, 0.02, R);
    bar(b, null, [sd * (nhw(1.45) + 0.012), 0.38, 1.45], [sd * (nhw(2.3) + 0.012), 0.33, 2.3], 0.02, 0.12, G);
  }
  box(b, null, 0, ntop(1.32) + 0.01, 1.32, nw - 0.1, 0.02, 0.1, R, { rx: 0.13 });
  // canopy: sloped windscreen + dark frame, side rails back to the tub walls
  const ch = 0.42 * f.clamp(f.sy / 1.2, 0.85, 1.3), cy = 0.72 + ch, cx = 0.5 + dx * 0.8, cxb = 0.4 + dx * 0.5;
  const WF = [1.15, 0.64], WT = [0.74, cy];
  box(b, null, 0, (WF[1] + WT[1]) / 2, (WF[0] + WT[0]) / 2, (cx + cxb), 0.03, Math.hypot(WF[0] - WT[0], WT[1] - WF[1]), 0, { mat: glass(), rx: -Math.atan2(WT[1] - WF[1], WF[0] - WT[0]) });
  for (const sd of [-1, 1]) {
    rod(b, null, [sd * cxb, WF[1], WF[0]], [sd * cx, WT[1], WT[0]], 0.045, D);
    rod(b, null, [sd * cx, WT[1], WT[0]], [sd * TX, 1.03, 0.45], 0.04, D);
    rod(b, null, [sd * cxb, WF[1], WF[0]], [sd * TX, 1.0, 0.55], 0.035, D);
  }
  rod(b, null, [-cx, cy, WT[0]], [cx, cy, WT[0]], 0.045, D);
  rod(b, null, [0, WF[1], WF[0]], [0, cy, WT[0]], 0.03, D);
  rod(b, null, [-cxb, WF[1], WF[0]], [cxb, WF[1], WF[0]], 0.04, D);
  // rear fuselage: wing roots, vents, tail plate
  box(b, null, 0, 0.45, -1.65, 1.08, 0.6, 1.2, W);
  box(b, null, 0, 0.45, -2.28, 0.86, 0.46, 0.08, D);
  box(b, null, 0, 0.45, -2.33, 0.4, 0.2, 0.06, G);
  for (const sd of [-1, 1]) {
    box(b, null, sd * 0.56, 0.45, -1.65, 0.06, 0.26, 1.05, G);
    box(b, null, sd * 0.548, 0.66, -1.9, 0.02, 0.08, 0.5, D);
    studs(b, null, sd * 0.36, 0.75, -1.95, 1, 2, W);
  }
  // R2-D2 riding in his socket behind the cockpit
  const RZ = -1.5, RY = 0.98, DR = 0.22;
  box(b, null, 0, 0.76, RZ, 0.58, 0.04, 0.58, D);
  cyl(b, null, 0, 0.87, RZ, DR, 0.22, W, 'y', { seg: 16 });
  for (const sx of [-0.08, 0.08]) box(b, null, sx, 0.87, RZ + DR - 0.01, 0.07, 0.14, 0.03, C.blue);
  cyl(b, null, 0, RY - 0.005, RZ, DR + 0.006, 0.035, C.blue, 'y', { seg: 16 });
  const metal = { matOpts: { metal: 0.5, rough: 0.28 } };
  sphere(b, null, 0, RY, RZ, DR, G, { sy: 0.92, w: 16, h: 10, ...metal });
  const dc = [0, RY, RZ];
  onDome(b, dc, DR * 0.95, 0, 0.55, 0.13, 0.1, 0.03, C.blue);
  for (const az of [-1, 1]) onDome(b, dc, DR * 0.97, az * 1.1, 0.3, 0.09, 0.1, 0.03, C.blue);
  for (const az of [-2.3, 2.3, PI]) onDome(b, dc, DR * 0.97, az, 0.35, 0.1, 0.08, 0.03, C.blue);
  onDome(b, dc, DR * 0.97, 0.38, 0.28, 0.08, 0.08, 0.06, BK);
  onDome(b, dc, DR * 0.98, -0.35, 0.2, 0.04, 0.04, 0.03, R, { matOpts: { emissive: 0xff2010, emissiveIntensity: 0.8 } });
  // S-foils: four tapered wings with root engines and wingtip cannons, built closed and open
  // and morphed by one weight (they spread into the X on boost / glide)
  const WR = 0.54, ZW = -1.65, SPAN = 1.32, CHD = 1.1, TIPK = 0.5, SW = -0.17, EX = 0.38, EY = 0.26, ER = 0.25;
  const foil = (sd, ud, k) => mat(sd * WR, 0.45, ZW, 0, 0, (0.06 + 0.27 * k) * sd * ud).multiply(mat(0, ud * 0.045, 0));
  const wing = (wb, k, sd, ud) => {
    const base = foil(sd, ud, k);
    geo(wb, base, trap(TIPK, SW), W, mat(sd * SPAN / 2, 0, 0, 0, 0, sd > 0 ? 0 : PI, SPAN, 0.07, CHD));
    for (const [t, w] of [[0.6, 0.17], [0.8, 0.07]]) for (const fy of [-1, 1]) {
      box(wb, base, sd * t * SPAN, fy * 0.04, CHD * t * SW, w, 0.012, CHD * (1 - t * (1 - TIPK)) - 0.03, R);
    }
    // engine: big round intake in front, glowing nozzle behind
    const ex = sd * EX, ey = ud * EY;
    box(wb, base, ex, ey / 2, -0.05, 0.12, EY, 0.9, G);
    cyl(wb, base, ex, ey, -0.05, ER, 1.2, G, 'z', { seg: 16 });
    cyl(wb, base, ex, ey, 0.22, ER + 0.012, 0.06, D, 'z', { seg: 16 });
    cyl(wb, base, ex, ey, -0.4, ER + 0.012, 0.05, R, 'z', { seg: 16 });
    cyl(wb, base, ex, ey, 0.64, ER + 0.05, 0.2, W, 'z', { seg: 16 });
    cyl(wb, base, ex, ey, 0.745, ER - 0.02, 0.02, BK, 'z', { seg: 16 });
    cone(wb, base, ex, ey, 0.7, 0.09, 0.13, G, 'z', { seg: 10 });
    cyl(wb, base, ex, ey, -0.72, ER - 0.03, 0.16, D, 'z', { seg: 16 });
    cyl(wb, base, ex, ey, -0.81, ER - 0.08, 0.03, 0, 'z', { mat: eng, seg: 16 });
    // wingtip laser cannon reaching far forward
    const lx = sd * (SPAN + 0.06);
    box(wb, base, sd * (SPAN + 0.02), 0, -0.15, 0.06, 0.06, 0.6, G);
    cyl(wb, base, lx, 0, -0.12, 0.085, 0.8, G, 'z', { seg: 10 });
    cyl(wb, base, lx, 0, -0.53, 0.06, 0.04, D, 'z', { seg: 10 });
    cyl(wb, base, lx, 0, 0.48, 0.06, 0.4, W, 'z', { seg: 8 });
    cyl(wb, base, lx, 0, 1.35, 0.032, 1.35, D, 'z', { seg: 6 });
    cyl(wb, base, lx, 0, 1.85, 0.058, 0.16, D, 'z', { seg: 8 });
    cyl(wb, base, lx, 0, 2.08, 0.04, 0.1, D, 'z', { seg: 6 });
  };
  const foils = morphPair(0.4, (wb, k) => { for (const sd of [-1, 1]) for (const ud of [-1, 1]) wing(wb, k, sd, ud); }, 'sfoils');
  let open = 0;
  // boost flames at the four engine nozzles in the open (attack) pose, where they are while boosting
  const V3 = new THREE.Vector3(), exhaust = [];
  for (const sd of [-1, 1]) for (const ud of [-1, 1]) {
    V3.set(sd * EX, ud * EY, -0.86).applyMatrix4(foil(sd, ud, 1));
    exhaust.push([V3.x, V3.y, V3.z, BACK]);
  }
  return {
    mesh: b.build({ name: 'xwing' }), seat: [0, 0.62 - f.big * 0.06, -0.3], control: 'yoke', hover: 0.45, parts: [foils.group], exhaust,
    fx(s, dt) {
      open += ((s.gliding || s.boosting ? 1 : 0) - open) * Math.min(1, dt * 5);
      for (const m of foils.meshes) m.morphTargetInfluences[0] = open;
      eng.emissiveIntensity = 0.7 + s.speed01 * 1.4 + open * 1.2 + S(s.t * 33) * 0.12;
    },
  };
}

// ---- AT-ST walker -----------------------------------------------------------------------
function atst({ rig, sprung }) {
  const f = fitOf(rig);
  const G = C.ltgray, D = C.dkgray, BK = C.black, ST = C.dkstone;
  const b = new BrickBuilder(0.4);
  // the head: wide at the back, its flanks and roof closing in to a narrow sloped face
  // (the shell widens a little for broad drivers so their hips stay inside)
  const kx = 1 + f.wide * 0.25, HK = mat(0, 0, 0, 0, 0, 0, kx, 1, 1);
  const HB = 1.98, HT = 2.78, HC = (HB + HT) / 2, HW = 1.8;
  const ZB = -1.0, ZM = -0.2, ZF = 0.55, ZN = 0.9;
  box(b, HK, 0, HC, (ZB + ZM) / 2, HW, HT - HB, ZM - ZB, G);
  const FW = 1.3 + f.wide * 0.25, NW = 0.82 + f.wide * 0.15;   // face widths
  frustum(b, HK, 0, HC, ZM, ZF, HW, 0.8, FW, 0.6, G, { drop: -0.1 });
  frustum(b, HK, 0, 2.3, ZF, ZN, FW, 0.6, NW, 0.36, G, { drop: -0.05 });
  // face: brow, the main viewport slit with its frame, a second slit on each cheek
  box(b, HK, 0, 2.44, ZN - 0.01, 0.82, 0.05, 0.08, D);
  box(b, HK, 0, 2.29, ZN + 0.005, 0.66, 0.1, 0.03, BK);
  for (const x of [-0.17, 0, 0.17]) box(b, HK, x, 2.29, ZN + 0.015, 0.04, 0.12, 0.03, G);
  const cheek = (z) => FW / 2 + (NW / 2 - FW / 2) * (z - ZF) / (ZN - ZF);   // half-width of the face section
  for (const sd of [-1, 1]) {
    bar(b, HK, [sd * (cheek(0.6) + 0.01), 2.32, 0.6], [sd * (cheek(0.84) + 0.01), 2.3, 0.84], 0.03, 0.08, BK);
    // side seams and the flank lip that runs round the head
    box(b, HK, sd * (HW / 2 + 0.01), 2.12, (ZB + ZM) / 2, 0.03, 0.05, ZM - ZB, D);
    bar(b, HK, [sd * (HW / 2 + 0.01), 2.12, ZM], [sd * (FW / 2 + 0.01), 2.12, ZF], 0.03, 0.05, D);
    // roof chamfers along the top edges
    box(b, HK, sd * 0.78, HT - 0.02, (ZB + ZM) / 2, 0.2, 0.06, ZM - ZB, D, { rz: sd * 0.5 });
    // chin guns: twin blasters under the cheeks
    box(b, null, sd * 0.42 * kx, 2.04, 0.6, 0.22, 0.2, 0.42, D);
    cyl(b, null, sd * 0.42 * kx, 2.02, 1.0, 0.055, 0.6, BK, 'z', { seg: 8 });
    cyl(b, null, sd * 0.42 * kx, 2.02, 1.3, 0.075, 0.1, D, 'z', { seg: 8 });
  }
  box(b, HK, 0, 2.0, 0.42, 0.6, 0.1, 0.5, D);
  // port side: the concussion grenade launcher (boxy pod, drum, short fat barrel)
  const PX = 0.9 * kx;
  box(b, null, PX + 0.08, 2.36, 0.05, 0.16, 0.3, 0.6, D);
  cyl(b, null, PX + 0.2, 2.36, 0.0, 0.16, 0.38, G, 'x', { seg: 12 });
  cyl(b, null, PX + 0.2, 2.36, 0.42, 0.12, 0.55, D, 'z', { seg: 10 });
  cyl(b, null, PX + 0.2, 2.36, 0.71, 0.085, 0.04, BK, 'z', { seg: 10 });
  // starboard side: the light blaster cannon (slim and long)
  box(b, null, -PX - 0.07, 2.4, -0.05, 0.14, 0.2, 0.5, D);
  cyl(b, null, -PX - 0.17, 2.4, 0.1, 0.09, 0.55, D, 'z', { seg: 10 });
  cyl(b, null, -PX - 0.17, 2.4, 0.75, 0.045, 0.8, BK, 'z', { seg: 8 });
  cyl(b, null, -PX - 0.17, 2.4, 1.1, 0.065, 0.1, D, 'z', { seg: 8 });
  // roof hatch: its rim is sized to the driver's shoulders, the lid stands open behind
  const HAX = f.clamp(f.sx + 0.1, 0.6, 0.84), SZ = -0.3 - f.big * 0.25, RB = -0.88 - f.big * 0.12;
  for (const sd of [-1, 1]) {
    if (HAX < 0.7 * kx) studs(b, null, sd * 0.79 * kx - sd * 0.08, HT, -0.6, 1, 3, G);
    box(b, null, sd * HAX, HT + 0.02, (0.1 + RB) / 2, 0.1, 0.1, 0.1 - RB, D);
  }
  box(b, null, 0, HT - 0.03, 0.1, HAX * 2 + 0.1, 0.1, 0.1, D);
  box(b, null, 0, HT + 0.02, RB, HAX * 2 + 0.1, 0.1, 0.1, D);
  box(b, null, 0, HT + 0.17, RB - 0.14, HAX * 1.6, 0.34, 0.06, G, { rx: -0.6 });
  box(b, null, 0, HT + 0.2, RB - 0.19, HAX * 0.9, 0.06, 0.04, D, { rx: -0.6 });
  // back of the head: rear pack with vents, antenna
  box(b, HK, 0, 2.36, -1.1, 1.5, 0.6, 0.2, D);
  for (let i = 0; i < 3; i++) box(b, HK, 0, 2.18 + i * 0.16, -1.21, 1.2, 0.05, 0.03, ST);
  rod(b, null, [-0.72 * kx, HT, -0.95], [-0.78 * kx, HT + 0.75, -1.0], 0.025, BK);
  // a slim neck down to a compact hip block with the big round leg joints
  cyl(b, null, 0, 1.92, -0.25, 0.26, 0.16, D, 'y', { seg: 14 });
  cyl(b, null, 0, 1.86, -0.25, 0.18, 0.12, BK, 'y', { seg: 12 });
  box(b, null, 0, 1.68, -0.25, 0.92, 0.34, 0.62, D);
  box(b, null, 0, 1.47, -0.22, 0.4, 0.14, 0.4, G);
  studs(b, null, 0, 1.85, -0.45, 2, 1, D);
  for (const sd of [-1, 1]) {
    cyl(b, null, sd * 0.5, 1.72, -0.25, 0.3, 0.1, G, 'x', { seg: 16 });
    rod(b, null, [sd * 0.3, 1.55, -0.05], [sd * 0.3, 1.5, 0.25], 0.04, ST);
  }

  // legs: hip -> thigh forward-down -> knee -> long shin back-down -> ankle -> short strut
  // forward-down onto a big flat splayed foot (the foot stays flat on the ground)
  const A = 0.8, B = 0.95, HY = 1.72, HZ = -0.25, HX = 0.66, AH = 0.42, AF = 0.14, FT = 0.12;
  const legs = [];
  for (const sd of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sd * HX, HY, HZ);
    let lb = new BrickBuilder(0.4);
    cyl(lb, null, 0, 0, 0, 0.2, 0.26, D, 'x', { seg: 14 });
    box(lb, null, 0, -A / 2, 0, 0.2, A, 0.26, G);
    box(lb, null, sd * 0.12, -A * 0.45, -0.02, 0.05, A * 0.75, 0.42, G);     // flat outer armour
    box(lb, null, sd * 0.15, -A * 0.45, -0.02, 0.02, A * 0.55, 0.06, D);
    rod(lb, null, [-sd * 0.02, -0.12, 0.17], [-sd * 0.02, -A + 0.14, 0.16], 0.035, D);
    cyl(lb, null, 0, -A, 0, 0.17, 0.3, D, 'x', { seg: 14 });
    cyl(lb, null, 0, -A, 0, 0.1, 0.38, G, 'x', { seg: 10 });
    hip.add(lb.build({ name: 'thigh' }));
    const knee = new THREE.Group(); knee.position.set(0, -A, 0); hip.add(knee);
    lb = new BrickBuilder(0.4);
    box(lb, null, 0, -B / 2, 0, 0.18, B, 0.22, G);
    box(lb, null, 0, -0.22, 0.1, 0.26, 0.32, 0.12, G, { rx: 0.15 });      // shin guard below the knee
    box(lb, null, 0, -B * 0.55, -0.12, 0.1, B * 0.6, 0.04, D);
    rod(lb, null, [sd * 0.11, -0.12, -0.05], [sd * 0.11, -B + 0.12, -0.04], 0.03, D);
    cyl(lb, null, 0, -B, 0, 0.13, 0.26, D, 'x', { seg: 12 });
    knee.add(lb.build({ name: 'shin' }));
    const ankle = new THREE.Group(); ankle.position.set(0, -B, 0); knee.add(ankle);
    lb = new BrickBuilder(0.4);
    const fy = -AH;   // sole, relative to the ankle joint
    rod(lb, null, [0, 0, 0], [0, fy + FT + 0.06, AF], 0.075, G);
    box(lb, null, 0, fy + FT + 0.06, AF, 0.24, 0.12, 0.24, D);
    box(lb, null, 0, fy + FT / 2, AF, 0.52, FT, 0.5, D);
    box(lb, null, 0, fy + FT + 0.01, AF, 0.36, 0.03, 0.34, G);
    for (const a of [-0.5, 0, 0.5]) {
      const tm = mat(0, fy + FT * 0.4, AF + 0.18, 0, a, 0);
      box(lb, tm, 0, 0, 0.22, 0.15, FT * 0.8, 0.4, G);
      box(lb, tm, 0, -0.01, 0.44, 0.13, FT * 0.6, 0.08, ST);
    }
    box(lb, mat(0, fy + FT * 0.4, AF - 0.2, 0, 0, 0), 0, 0, -0.12, 0.15, FT * 0.8, 0.26, G);
    ankle.add(lb.build({ name: 'foot' }));
    legs.push({ hip, knee, ankle });
  }
  const mesh = b.build({ name: 'atst' });
  // two-bone IK from the hip to an ankle target (dz forward, dy up, relative to the hip); knee forward
  const solve = (L, dz, dy) => {
    let d = Math.hypot(dz, dy);
    const dm = Math.min(A + B - 0.02, Math.max(0.2, d));
    dz *= dm / d; dy *= dm / d; d = dm;
    const phi = Math.atan2(dz, -dy);
    const cb = Math.max(-1, Math.min(1, (A * A + d * d - B * B) / (2 * A * d)));
    const ta = phi + Math.acos(cb);
    const kz = A * Math.sin(ta), ky = -A * Math.cos(ta);
    const tb = Math.atan2(dz - kz, -(dy - ky));
    L.hip.rotation.x = -ta; L.knee.rotation.x = -(tb - ta); L.ankle.rotation.x = tb;
  };
  // gait: each foot plants and slides back (stance), then lifts high and swings forward;
  // the body bobs at mid-stance and rolls a little over the planted leg
  let ph = 0, amp = 0, air = 0;
  const STRIDE = 0.42, FZ = 0.12;
  const fx = (s, dt) => {
    const onGround = s.grounded && !s.gliding;
    amp += ((onGround ? Math.min(1, s.speed01 * 3) : 0) - amp) * Math.min(1, dt * 4);
    air += ((onGround ? 0 : 1) - air) * Math.min(1, dt * 5);
    ph = (ph + dt * (2.5 + 8 * s.speed01) * Math.min(1, amp * 4)) % (PI * 2);
    const bob = amp * 0.08 * Math.abs(S(ph)) * (1 - air);
    sprung.position.y = bob;
    sprung.rotation.z = amp * 0.035 * S(ph) * (1 - air);
    sprung.rotation.x = amp * 0.03;
    legs.forEach((L, i) => {
      const u = (ph + i * PI) % (PI * 2);
      let fz, lift;
      if (u < PI) { fz = STRIDE * (1 - (2 * u) / PI); lift = 0; } else { const v = (u - PI) / PI; fz = STRIDE * (-1 + 2 * (v * v * (3 - 2 * v))); lift = 0.3 * S(v * PI); }
      fz = fz * amp + air * S(s.t * 3 + i * PI) * 0.12;
      const ay = -bob + lift * amp + AH - air * 0.2;
      solve(L, FZ + fz - AF, ay - HY);
    });
  };
  fx({ speed01: 0, grounded: true, gliding: false, t: 0 }, 0);
  return {
    mesh, seat: [0, HT - 0.42 + Math.max(0, 1.8 - f.H) * 0.25 - f.wide * 0.15, SZ], control: 'bars', parts: legs.map((l) => l.hip), fx,
    exhaust: [[0.45, 2.36, -1.22, BACK], [-0.45, 2.36, -1.22, BACK]],
  };
}

// ---- TIE fighter ------------------------------------------------------------------------
function tie({ rig }) {
  const f = fitOf(rig);
  const G = C.ltgray, D = C.dkgray, BK = C.black;
  const b = new BrickBuilder(0.4);
  const laser = glow(0x40ff70, 1.4), ion = glow(0xff5a3a, 1.2);
  // the ball cockpit, open on top so the driver shows; it grows for broad drivers so their
  // shoulders clear the rim (R = ball radius, the window and guns sit on its surface)
  const R = f.clamp(1 + (f.W - 1.3) * 0.32, 0.96, 1.2), CY = 0.15 + R, CUT = 0.42 * PI, WY = CY - 0.15 * R;
  const bowl = new THREE.SphereGeometry(1, 22, 12, 0, PI * 2, CUT, PI - CUT);
  geo(b, null, bowl, G, mat(0, CY, 0, 0, 0, 0, R, R, R));
  geo(b, null, flipped(bowl), D, mat(0, CY, 0, 0, 0, 0, 0.96 * R, 0.96 * R, 0.96 * R));
  geo(b, null, new THREE.TorusGeometry(0.95, 0.055, 6, 26), D, mat(0, CY + Math.cos(CUT) * R, 0, PI / 2, 0, 0, R, R, 1));
  cyl(b, null, 0, CY - 0.53 * R, -0.05, 0.75 * R, 0.08, D, 'y', { seg: 16 });
  for (let i = 0; i < 2; i++) geo(b, null, new THREE.TorusGeometry(1.005, 0.025, 4, 26), D, mat(0, CY - (0.3 + i * 0.35) * R, 0, PI / 2, 0, 0, (1 - i * 0.12 - 0.04) * R, (1 - i * 0.12 - 0.04) * R, 1));
  // the octagonal front window
  cyl(b, null, 0, WY, 0.94 * R, 0.4, 0.1, BK, 'z', { seg: 8, spin: PI / 8 });
  geo(b, null, new THREE.TorusGeometry(0.4, 0.05, 5, 8), G, mat(0, WY, 0.99 * R, 0, 0, PI / 8));
  for (let i = 0; i < 4; i++) box(b, null, 0, WY, 0.99 * R, 0.8, 0.035, 0.03, G, { rz: (i * PI) / 4 });
  cyl(b, null, 0, WY, R, 0.1, 0.05, G, 'z', { seg: 8 });
  // twin lasers under the window, twin ion engines at the back
  for (const sd of [-1, 1]) {
    cyl(b, null, sd * 0.2, CY - 0.73 * R, 0.75 * R, 0.05, 0.35, D, 'z', { seg: 8 });
    cyl(b, null, sd * 0.2, CY - 0.73 * R, 0.75 * R + 0.19, 0.045, 0.06, 0, 'z', { mat: laser, seg: 8 });
    cyl(b, null, sd * 0.24, WY, -0.95 * R, 0.15, 0.1, D, 'z', { seg: 12 });
    cyl(b, null, sd * 0.24, WY, -0.95 * R - 0.05, 0.11, 0.04, 0, 'z', { mat: ion, seg: 12 });
  }
  // wings: pylons + hexagonal solar panels, banking with the steering
  const wings = new THREE.Group(); wings.position.set(0, CY, 0);
  const wb = new BrickBuilder(0.4);
  const HR = 1.2, WX = 1.6 + (R - 1) * 0.55;
  const vtx = (i) => [-Math.sin((i * PI) / 3) * HR, Math.cos((i * PI) / 3) * HR];
  for (const sd of [-1, 1]) {
    cyl(wb, null, sd * (R + WX - 0.1) / 2, 0, 0, 0.17, WX - R + 0.02, G, 'x', { seg: 10 });
    cyl(wb, null, sd * R, 0, 0, 0.24, 0.12, D, 'x', { seg: 10 });
    cyl(wb, null, sd * (WX - 0.1), 0, 0, 0.26, 0.12, D, 'x', { seg: 10 });
    cyl(wb, null, sd * WX, 0, 0, HR, 0.07, BK, 'x', { seg: 6 });
    cyl(wb, null, sd * WX, 0, 0, 0.32, 0.16, G, 'x', { seg: 6 });
    for (let i = 0; i < 6; i++) {
      const [y1, z1] = vtx(i), [y2, z2] = vtx(i + 1);
      rod(wb, null, [sd * WX, y1, z1], [sd * WX, y2, z2], 0.07, G, { seg: 6 });
      rod(wb, null, [sd * WX, y1 * 0.27, z1 * 0.27], [sd * WX, y1, z1], 0.035, G, { seg: 6 });
    }
    for (const yy of [-0.65, -0.35, 0.35, 0.65]) box(wb, null, sd * WX, yy, 0, 0.09, 0.025, 2 * (HR - Math.abs(yy) / Math.sqrt(3)) - 0.1, D);
  }
  wings.add(wb.build({ name: 'tiewings' }));
  return {
    mesh: b.build({ name: 'tie' }), seat: [0, CY - 0.33 * R + Math.max(0, 1.8 - f.H) * 0.2, -0.15], control: 'yoke', hover: 0.4,
    exhaust: [[0.24, WY, -0.95 * R - 0.08, BACK], [-0.24, WY, -0.95 * R - 0.08, BACK]],
    steer: [{ obj: wings, axis: 'z', amount: 0.2 }], parts: [wings],
    fx(s) {
      wings.position.y = CY + (s.boosting ? S(s.t * 60) * 0.02 : 0);
      ion.emissiveIntensity = 0.7 + s.speed01 * 1.5 + (s.boosting ? 2 : 0) + S(s.t * 35) * 0.12;
      laser.emissiveIntensity = 1.1 + S(s.t * 5) * 0.4;
    },
  };
}

export default [
  {
    id: 'landspeeder', name: 'Dune Skimmer', form: 'Landspeeder', blurb: "Luke's X-34 landspeeder",
    stats: { speed: 3, accel: 4, handling: 4, weight: 2 }, colors: [0xa8432a, C.ltgray, C.tan, C.dkgray], build: landspeeder,
  },
  {
    id: 'speederbike', name: 'Endor Zipper', form: 'Hover bike', blurb: '74-Z scout speeder bike',
    stats: { speed: 3, accel: 4, handling: 5, weight: 1 }, colors: [C.ltgray, 0x5b6b33, C.dkgray, C.black], build: speederBike,
  },
  {
    id: 'podracer', name: 'Boonta Bolt', form: 'Podracer', blurb: "Anakin's Boonta Eve racer",
    stats: { speed: 5, accel: 3, handling: 2, weight: 2 }, colors: [0x1e5aa8, C.ltgray, 0x9a6bff, C.dkgray], build: podracer,
  },
  {
    id: 'xwing', name: 'Red Five', form: 'Starfighter', blurb: 'S-foils in attack position',
    stats: { speed: 4, accel: 3, handling: 3, weight: 3 }, colors: [C.white, C.red, C.ltgray, C.dkgray], build: xwing,
  },
  {
    id: 'atst', name: 'Chicken Walker', form: 'Walker', blurb: 'AT-ST: legs, not wheels',
    stats: { speed: 3, accel: 2, handling: 3, weight: 5 }, colors: [C.ltgray, C.dkgray, C.black, C.dkstone], build: atst,
  },
  {
    id: 'tie', name: 'TIE Howler', form: 'Ball fighter', blurb: 'Twin ion engines, howling',
    stats: { speed: 4, accel: 4, handling: 3, weight: 2 }, colors: [C.ltgray, C.black, C.dkgray, 0x40ff70], build: tie,
  },
];
