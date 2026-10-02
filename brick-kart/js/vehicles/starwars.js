// Star Wars Rides vehicle pack (see buildVehicle in ../characters.js for the contract).
// Cartoon-compact LEGO versions of six movie vehicles; helpers live in starwars-kit.js.
import { THREE, BrickBuilder, C, plastic, mat, box, cyl, cone, frustum, sphere, geo, rod, studs, glow, morphPair, flipped } from './starwars-kit.js';

const PI = Math.PI, S = Math.sin;
const glass = () => plastic(C.azure, { trans: true, opacity: 0.42 });

// ---- X-34 landspeeder -------------------------------------------------------------------
function landspeeder() {
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
  // split V windscreen
  for (const sd of [-1, 1]) {
    box(b, null, sd * 0.47, 1.0, 0.92, 1.0, 0.42, 0.04, 0, { mat: glass(), ry: sd * 0.33, rx: -0.35 });
    box(b, null, sd * 0.47, 1.21, 0.86, 1.0, 0.04, 0.05, D, { ry: sd * 0.33, rx: -0.35 });
  }
  box(b, null, 0, 1.0, 1.06, 0.06, 0.46, 0.06, D, { rx: -0.35 });
  // cockpit: side walls, dash + column, tan bench seat
  for (const sd of [-1, 1]) {
    box(b, null, sd * 1.05, 0.8, -0.35, 0.2, 0.5, 1.9, RUST);
    box(b, null, sd * 1.05, 1.07, -0.35, 0.26, 0.05, 1.95, G);
  }
  box(b, null, 0, 0.75, 0.62, 1.9, 0.4, 0.3, D);
  box(b, null, 0.45, 0.96, 0.62, 0.3, 0.04, 0.2, C.lime, { matOpts: { emissive: 0x60ff60, emissiveIntensity: 0.6 } });
  rod(b, null, [0, 0.9, 0.62], [0, 1.22, 0.42], 0.05, D);
  box(b, null, 0, 0.6, -0.5, 1.6, 0.12, 0.8, TAN);
  box(b, null, 0, 0.95, -0.95, 1.7, 0.75, 0.18, TAN, { rx: -0.1 });
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
    fx(s) { exh.emissiveIntensity = 0.5 + s.speed01 * 1.3 + (s.boosting ? 1.6 : 0) + S(s.t * 31) * 0.12; },
  };
}

// ---- 74-Z speeder bike ------------------------------------------------------------------
function speederBike() {
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
  return {
    mesh: b.build({ name: 'speederbike' }), seat: [0, 0.8, -0.62], control: 'bars', hover: 0.55,
    steer: [{ obj: vanes, axis: 'y', amount: 0.35 }], parts: [vanes],
    fx(s) { exh.emissiveIntensity = 0.7 + s.speed01 * 1.5 + (s.boosting ? 1.8 : 0) + S(s.t * 27) * 0.15; },
  };
}

// ---- Anakin's podracer ------------------------------------------------------------------
function podracer() {
  const BL = 0x1e5aa8, G = C.ltgray, D = C.dkgray, BK = C.black, Y = C.yellow;
  const b = new BrickBuilder(0.4);
  const exh = glow(0xff9a40, 1.2), core = glow(0xf0e6ff, 2.2), halo = glow(0x9a6bff, 1.6, { trans: true, opacity: 0.45 });
  // the little cockpit pod: an open elliptical tub
  const PZ = -1.35;
  cyl(b, null, 0, 0.5, PZ, 0.82, 0.7, BL, 'y', { r2: 0.95, tube: true, seg: 22 });
  cyl(b, null, 0, 0.5, PZ, 0.8, 0.7, D, 'y', { r2: 0.93, tube: true, inside: true, seg: 22 });
  sphere(b, null, 0, 0.2, PZ, 0.82, BL, { sy: 0.42, sz: 0.95 / 0.82, w: 18, h: 8 });
  cyl(b, null, 0, 0.47, PZ, 0.8, 0.06, D, 'y', { r2: 0.93, seg: 22 });
  geo(b, null, new THREE.TorusGeometry(1, 0.07, 6, 26), G, mat(0, 0.86, PZ, PI / 2, 0, 0, 0.82, 0.95, 1));
  cyl(b, null, 0, 0.56, PZ, 0.835, 0.12, G, 'y', { r2: 0.965, tube: true, seg: 22 });
  cyl(b, null, 0, 0.36, PZ, 0.83, 0.05, Y, 'y', { r2: 0.96, tube: true, seg: 22 });
  // pointed snout, dash + lever post, tail fin and thruster
  cone(b, null, 0, 0.5, -0.55, 0.42, 0.75, BL, 'z', { r2: 0.3 });
  cone(b, null, 0, 0.5, -0.05, 0.12, 0.3, G, 'z');
  box(b, null, 0, 0.85, -0.58, 0.75, 0.32, 0.25, D);
  box(b, null, 0, 1.08, -0.4, 0.22, 0.26, 0.2, D);
  for (const sd of [-1, 1]) box(b, null, sd * 0.2, 1.02, -0.58, 0.14, 0.04, 0.12, sd > 0 ? C.red : C.lime, { matOpts: { emissive: sd > 0 ? 0xff3020 : 0x60ff60, emissiveIntensity: 0.6 } });
  box(b, null, 0, 1.0, -2.2, 0.08, 0.5, 0.45, BL, { rx: -0.35 });
  cyl(b, null, 0, 0.55, -2.3, 0.28, 0.22, G);
  for (const sd of [-1, 1]) box(b, null, sd * 0.8, 0.7, PZ - 0.2, 0.12, 0.2, 0.5, G);
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
  cyl(bb, null, 0, 0, 0, 0.13, 1.46, 0, 'x', { mat: halo, seg: 10 });
  binder.add(bb.build({ name: 'binder', shadows: false }));
  front.add(binder);
  return {
    mesh: b.build({ name: 'podracer' }), seat: [0, 0.62, PZ], control: 'yoke', hover: 0.5,
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
function xwing() {
  const W = C.white, R = C.red, G = C.ltgray, D = C.dkgray, BK = C.black;
  const b = new BrickBuilder(0.4);
  const eng = glow(0xff4a2a, 1.2);
  // cockpit tub
  box(b, null, 0, 0.4, -0.25, 1.5, 0.6, 1.8, W);
  for (const sd of [-1, 1]) {
    box(b, null, sd * 0.68, 0.85, -0.3, 0.16, 0.3, 1.6, W);
    box(b, null, sd * 0.68, 1.01, -0.3, 0.2, 0.04, 1.62, G);
    box(b, null, sd * 0.76, 0.5, -0.3, 0.02, 0.1, 1.5, R);
  }
  box(b, null, 0, 0.66, -0.4, 1.1, 0.1, 0.7, D);
  box(b, null, 0, 0.95, -0.98, 1.2, 0.7, 0.15, D);
  // long tapered nose with the red band, canopy glass + frame
  frustum(b, null, 0, 0.42, 0.65, 2.6, 1.5, 0.6, 0.5, 0.3, W, { drop: -0.25 });
  box(b, null, 0, 0.42, 0.92, 1.46, 0.58, 0.2, R);
  box(b, null, 0, 0.27, 2.62, 0.5, 0.3, 0.05, G);
  for (const sd of [-1, 1]) box(b, null, sd * 0.25, 0.62, 1.55, 0.12, 0.03, 0.7, R, { rx: 0.15 });
  box(b, null, 0, 0.92, 0.78, 1.0, 0.03, 0.62, 0, { mat: glass(), rx: 0.87 });
  for (const sd of [-1, 1]) rod(b, null, [sd * 0.52, 0.7, 1.02], [sd * 0.52, 1.14, 0.55], 0.04, D);
  rod(b, null, [-0.52, 1.14, 0.55], [0.52, 1.14, 0.55], 0.04, D);
  rod(b, null, [0, 0.7, 1.02], [0, 1.14, 0.55], 0.03, D);
  // rear fuselage with R2 in his socket
  box(b, null, 0, 0.42, -1.6, 1.1, 0.58, 1.0, W);
  box(b, null, 0, 0.42, -2.13, 0.8, 0.45, 0.08, D);
  box(b, null, 0, 0.72, -1.4, 0.62, 0.04, 0.62, D);
  cyl(b, null, 0, 0.83, -1.4, 0.25, 0.22, W, 'y', { seg: 16 });
  cyl(b, null, 0, 0.9, -1.4, 0.255, 0.05, C.blue, 'y', { seg: 16 });
  sphere(b, null, 0, 0.94, -1.4, 0.25, G, { sy: 0.85 });
  box(b, null, 0, 1.05, -1.18, 0.12, 0.08, 0.05, C.blue);
  sphere(b, null, 0, 1.0, -1.16, 0.05, BK);
  // S-foils: four wings built closed and open, morphed by one weight
  const wing = (wb, k, sd, ud) => {
    const base = mat(sd * 0.55, 0.45, -1.55, 0, 0, 0.36 * k * sd * ud).multiply(mat(0, ud * 0.045, 0));
    box(wb, base, sd * 0.4, 0, 0, 0.8, 0.07, 1.05, W);
    box(wb, base, sd * 0.93, 0, -0.08, 0.36, 0.07, 0.75, W);
    box(wb, base, sd * 0.62, ud * 0.04, 0.03, 0.16, 0.02, 0.92, R);
    box(wb, base, sd * 0.86, ud * 0.04, -0.05, 0.1, 0.02, 0.72, R);
    const ey = ud * 0.22;
    box(wb, base, sd * 0.3, ey / 2, 0.05, 0.1, 0.2, 0.7, G);
    cyl(wb, base, sd * 0.3, ey, 0.05, 0.19, 1.2, G, 'z', { seg: 12 });
    cyl(wb, base, sd * 0.3, ey, 0.66, 0.205, 0.1, D, 'z', { seg: 12 });
    cyl(wb, base, sd * 0.3, ey, 0.715, 0.15, 0.02, BK, 'z', { seg: 12 });
    cyl(wb, base, sd * 0.3, ey, -0.6, 0.16, 0.12, D, 'z', { seg: 12 });
    cyl(wb, base, sd * 0.3, ey, -0.67, 0.13, 0.03, 0, 'z', { mat: eng, seg: 12 });
    cyl(wb, base, sd * 1.1, 0, -0.12, 0.07, 0.8, G, 'z', { seg: 8 });
    cyl(wb, base, sd * 1.1, 0, 0.6, 0.035, 0.7, D, 'z', { seg: 6 });
    cyl(wb, base, sd * 1.1, 0, 0.98, 0.055, 0.1, D, 'z', { seg: 6 });
  };
  const foils = morphPair(0.4, (wb, k) => { for (const sd of [-1, 1]) for (const ud of [-1, 1]) wing(wb, k, sd, ud); }, 'sfoils');
  let open = 0;
  return {
    mesh: b.build({ name: 'xwing' }), seat: [0, 0.62, -0.3], control: 'yoke', hover: 0.45, parts: [foils.group],
    fx(s, dt) {
      open += ((s.gliding || s.boosting ? 1 : 0) - open) * Math.min(1, dt * 5);
      for (const m of foils.meshes) m.morphTargetInfluences[0] = open;
      eng.emissiveIntensity = 0.7 + s.speed01 * 1.4 + open * 1.2 + S(s.t * 33) * 0.12;
    },
  };
}

// ---- AT-ST walker -----------------------------------------------------------------------
function atst() {
  const G = C.ltgray, D = C.dkgray, BK = C.black, ST = C.dkstone;
  const b = new BrickBuilder(0.4);
  // the head cab (the driver pops out of the roof hatch)
  box(b, null, 0, 1.68, -0.25, 1.9, 0.86, 1.8, G);
  frustum(b, null, 0, 1.66, 0.65, 1.25, 1.8, 0.8, 1.3, 0.45, G);
  box(b, null, 0, 2.08, 0.62, 1.8, 0.08, 0.36, D, { rx: 0.3 });
  for (const sd of [-1, 1]) {
    box(b, null, sd * 0.3, 1.75, 1.255, 0.42, 0.1, 0.03, BK);
    box(b, null, sd * 0.955, 1.88, -0.25, 0.02, 0.06, 1.7, D);
    box(b, null, sd * 0.955, 1.5, -0.25, 0.02, 0.06, 1.7, D);
    studs(b, null, sd * 0.78, 2.11, -0.3, 1, 3, G);
    box(b, null, sd * 0.6, 2.13, -0.28, 0.1, 0.06, 1.25, D);
  }
  box(b, null, 0, 2.13, 0.32, 1.3, 0.06, 0.1, D);
  box(b, null, 0, 2.13, -0.88, 1.3, 0.06, 0.1, D);
  box(b, null, 0, 1.38, 1.0, 1.0, 0.2, 0.42, D);
  for (const sd of [-1, 1]) cyl(b, null, sd * 0.2, 1.32, 1.45, 0.06, 0.75, BK, 'z', { seg: 8 });
  // side weapons: grenade launcher (port) and blaster (starboard)
  box(b, null, 0.98, 1.6, 0.1, 0.16, 0.22, 0.32, D);
  cyl(b, null, 1.08, 1.6, 0.28, 0.14, 0.9, D, 'z', { seg: 8 });
  cyl(b, null, 1.08, 1.6, 0.74, 0.1, 0.04, BK, 'z', { seg: 8 });
  cyl(b, null, -1.02, 1.62, 0.0, 0.12, 0.45, D, 'z', { seg: 10 });
  cyl(b, null, -1.02, 1.62, 0.55, 0.06, 0.9, BK, 'z', { seg: 8 });
  // rear pack, antenna, hip housing
  box(b, null, 0, 1.65, -1.25, 1.6, 0.7, 0.25, D);
  for (let i = 0; i < 3; i++) box(b, null, 0, 1.45 + i * 0.16, -1.38, 1.2, 0.05, 0.03, ST);
  rod(b, null, [-0.75, 2.1, -1.05], [-0.8, 2.85, -1.1], 0.025, BK);
  box(b, null, 0, 1.15, -0.25, 1.3, 0.25, 1.0, D);
  for (const sd of [-1, 1]) cyl(b, null, sd * 0.75, 1.12, -0.25, 0.22, 0.25, D, 'x', { seg: 12 });

  // legs: hip -> thigh forward-down -> knee -> shin back-down -> ankle -> flat foot
  const A = 0.6, B = 0.68, CH = 0.18, HY = 1.12, HZ = -0.25, HX = 0.96, FOOT = 0.12;
  const legs = [];
  for (const sd of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sd * HX, HY, HZ);
    let lb = new BrickBuilder(0.4);
    cyl(lb, null, 0, 0, 0, 0.21, 0.3, D, 'x', { seg: 12 });
    box(lb, null, 0, -A / 2, 0, 0.22, A, 0.3, G);
    rod(lb, null, [sd * 0.14, -0.08, -0.08], [sd * 0.14, -A + 0.08, -0.06], 0.035, D);
    cyl(lb, null, 0, -A, 0, 0.17, 0.3, D, 'x', { seg: 12 });
    hip.add(lb.build({ name: 'thigh' }));
    const knee = new THREE.Group(); knee.position.set(0, -A, 0); hip.add(knee);
    lb = new BrickBuilder(0.4);
    box(lb, null, 0, -B / 2, 0, 0.2, B, 0.26, G);
    box(lb, null, 0, -B * 0.35, 0.14, 0.12, B * 0.5, 0.04, D);
    rod(lb, null, [-sd * 0.13, -0.1, 0], [-sd * 0.13, -B + 0.08, 0], 0.03, D);
    cyl(lb, null, 0, -B, 0, 0.13, 0.26, D, 'x', { seg: 10 });
    knee.add(lb.build({ name: 'shin' }));
    const ankle = new THREE.Group(); ankle.position.set(0, -B, 0); knee.add(ankle);
    lb = new BrickBuilder(0.4);
    box(lb, null, 0, -CH / 2, 0.02, 0.16, CH, 0.18, D);
    box(lb, null, 0, -CH - FOOT / 2, 0.1, 0.5, FOOT, 0.68, D);
    box(lb, null, 0, -CH + 0.02, 0.08, 0.38, 0.05, 0.46, G);
    for (const tx of [-0.16, 0.16]) box(lb, null, tx, -CH - FOOT / 2 - 0.01, 0.5, 0.15, FOOT - 0.02, 0.22, ST);
    box(lb, null, 0, -CH - FOOT / 2 - 0.01, -0.3, 0.16, FOOT - 0.02, 0.18, ST);
    ankle.add(lb.build({ name: 'foot' }));
    legs.push({ hip, knee, ankle });
  }
  const mesh = b.build({ name: 'atst' });
  // two-bone IK from the hip to an ankle target (dz forward, dy up, relative to the hip)
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
  let ph = 0, amp = 0, air = 0;
  const STRIDE = 0.42;
  const fx = (s, dt) => {
    const onGround = s.grounded && !s.gliding;
    amp += ((onGround ? Math.min(1, s.speed01 * 3) : 0) - amp) * Math.min(1, dt * 4);
    air += ((onGround ? 0 : 1) - air) * Math.min(1, dt * 5);
    ph = (ph + dt * (2.5 + 9 * s.speed01) * Math.min(1, amp * 4)) % (PI * 2);
    const bob = amp * 0.07 * Math.abs(S(ph)) * (1 - air);
    if (mesh.parent) mesh.parent.position.y = bob;
    legs.forEach((L, i) => {
      const u = (ph + i * PI) % (PI * 2);
      let fz, lift;
      if (u < PI) { fz = STRIDE * (1 - (2 * u) / PI); lift = 0; } else { fz = STRIDE * (-1 + (2 * (u - PI)) / PI); lift = 0.24 * S(u - PI); }
      fz = fz * amp + air * S(s.t * 3 + i * PI) * 0.12;
      const ay = -bob + lift * amp + FOOT + CH - air * 0.2;
      solve(L, fz - 0.02, ay - HY);
    });
  };
  fx({ speed01: 0, grounded: true, gliding: false, t: 0 }, 0);
  return {
    mesh, seat: [0, 1.75, -0.25], control: 'bars', parts: legs.map((l) => l.hip), fx,
  };
}

// ---- TIE fighter ------------------------------------------------------------------------
function tie() {
  const G = C.ltgray, D = C.dkgray, BK = C.black;
  const b = new BrickBuilder(0.4);
  const laser = glow(0x40ff70, 1.4), ion = glow(0xff5a3a, 1.2);
  const CY = 1.15, CUT = 0.42 * PI;
  // the ball cockpit, open on top so the driver shows
  const bowl = new THREE.SphereGeometry(1, 22, 12, 0, PI * 2, CUT, PI - CUT);
  geo(b, null, bowl, G, mat(0, CY, 0));
  geo(b, null, flipped(bowl), D, mat(0, CY, 0, 0, 0, 0, 0.96, 0.96, 0.96));
  geo(b, null, new THREE.TorusGeometry(0.95, 0.055, 6, 26), D, mat(0, CY + Math.cos(CUT), 0, PI / 2, 0, 0));
  cyl(b, null, 0, 0.62, -0.05, 0.75, 0.08, D, 'y', { seg: 16 });
  for (let i = 0; i < 2; i++) geo(b, null, new THREE.TorusGeometry(1.005, 0.025, 4, 26), D, mat(0, CY - 0.3 - i * 0.35, 0, PI / 2, 0, 0, 1 - i * 0.12 - 0.04, 1 - i * 0.12 - 0.04, 1));
  // the octagonal front window
  cyl(b, null, 0, 1.0, 0.94, 0.4, 0.1, BK, 'z', { seg: 8, spin: PI / 8 });
  geo(b, null, new THREE.TorusGeometry(0.4, 0.05, 5, 8), G, mat(0, 1.0, 0.99, 0, 0, PI / 8));
  for (let i = 0; i < 4; i++) box(b, null, 0, 1.0, 0.99, 0.8, 0.035, 0.03, G, { rz: (i * PI) / 4 });
  cyl(b, null, 0, 1.0, 1.0, 0.1, 0.05, G, 'z', { seg: 8 });
  // twin lasers under the window, twin ion engines at the back
  for (const sd of [-1, 1]) {
    cyl(b, null, sd * 0.2, 0.42, 0.75, 0.05, 0.35, D, 'z', { seg: 8 });
    cyl(b, null, sd * 0.2, 0.42, 0.94, 0.045, 0.06, 0, 'z', { mat: laser, seg: 8 });
    cyl(b, null, sd * 0.24, 1.0, -0.95, 0.15, 0.1, D, 'z', { seg: 12 });
    cyl(b, null, sd * 0.24, 1.0, -1.0, 0.11, 0.04, 0, 'z', { mat: ion, seg: 12 });
  }
  // wings: pylons + hexagonal solar panels, banking with the steering
  const wings = new THREE.Group(); wings.position.set(0, CY, 0);
  const wb = new BrickBuilder(0.4);
  const HR = 1.2, WX = 1.6;
  const vtx = (i) => [-Math.sin((i * PI) / 3) * HR, Math.cos((i * PI) / 3) * HR];
  for (const sd of [-1, 1]) {
    cyl(wb, null, sd * 1.25, 0, 0, 0.17, 0.62, G, 'x', { seg: 10 });
    cyl(wb, null, sd * 1.0, 0, 0, 0.24, 0.12, D, 'x', { seg: 10 });
    cyl(wb, null, sd * 1.5, 0, 0, 0.26, 0.12, D, 'x', { seg: 10 });
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
    mesh: b.build({ name: 'tie' }), seat: [0, 0.82, -0.15], control: 'yoke', hover: 0.4,
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
