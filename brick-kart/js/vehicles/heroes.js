// Marvel & Jurassic vehicle pack (see buildVehicle in ../characters.js for the contract).
// Jurassic: the park Jeep, a Gyrosphere and the 1993 tour Explorer.
// Marvel: Wakanda's Royal Talon hover-car, Tony Stark's roadster and Thor's goat chariot.
import { rbox, tube, disc, cone, ring, blob, beam, glowMat, decal, fitOf, clamp } from './heroes-kit.js';

const PI = Math.PI, S = Math.sin;
const BACK = -PI / 2;   // boost flames pointing straight back

// ------------------------------------------------------------------------------------------------
// Jurassic Park Jeep Wrangler (1992 Sahara): sand-beige with red slashes, red wheels and
// windscreen frame, light bar, roll bar, whip antenna and the logo spare-tyre cover.
const SAND = 0xd8c39a, JPRED = 0xb8141c;
const jeep = {
  id: 'jpjeep', name: 'Park Jeep 12', form: 'Safari jeep', blurb: 'Must go faster!',
  stats: { speed: 3, accel: 3, handling: 3, weight: 4 }, colors: [SAND, JPRED, 0x2f5a3a],
  build({ BrickBuilder, C, plastic, rig }) {
    const f = fitOf(rig);
    const b = new BrickBuilder(0.4);
    const lamp = { matOpts: { emissive: 0xfff2b0, emissiveIntensity: 0.9 } };
    // chassis, floor, tub
    b.box(0, 0.3, 0.15, 1.7, 0.24, 4.7, C.black);
    b.box(0, 0.5, -0.55, 1.9, 0.12, 2.5, C.dkgray);
    for (const sd of [-1, 1]) {
      b.box(sd * 0.99, 0.5, -0.55, 0.16, 0.74, 2.5, SAND);            // tub sides / doors
      b.box(sd * 1.17, 1.0, 1.5, 0.42, 0.1, 1.25, SAND);              // fender flares
      rbox(b, sd * 1.17, 0.86, 2.14, 0.42, 0.08, 0.3, -0.9, 0, 0, SAND);
      b.box(sd * 1.17, 1.0, -1.3, 0.42, 0.1, 1.2, SAND);
      b.box(sd * 1.05, 0.38, 0.12, 0.3, 0.06, 1.0, C.black);          // side steps
      // two red slashes down each side, the park logo on the door
      for (const dz of [-0.62, -1.08]) rbox(b, sd * 1.075, 0.88, dz, 0.02, 0.86, 0.15, -0.75, 0, 0, JPRED);
      decal(b, 0, sd * 1.082, 0.86, 0.12, 0.6, 0.6, sd > 0 ? '+x' : '-x');
      b.box(sd * 1.0, 1.2, 0.2, 0.1, 0.1, 0.1, C.black);              // mirror arms
      b.box(sd * 1.1, 1.3, 0.22, 0.16, 0.16, 0.05, C.black);
    }
    b.box(0, 0.5, -1.82, 2.14, 0.74, 0.16, SAND);                     // tailgate
    for (const sd of [-1, 1]) b.box(sd * 0.82, 0.82, -1.91, 0.16, 0.26, 0.04, C.red);
    b.box(0, 0.32, -1.98, 2.0, 0.18, 0.22, C.black);
    // spare tyre with the logo cover
    disc(b, 0, 1.0, -2.04, 0.48, 0.3, 'z', C.black, { seg: 18 });
    disc(b, 0, 1.0, -2.05, 0.36, 0.32, 'z', 0x222222, { seg: 18 });
    decal(b, 0, 0, 1.0, -2.215, 0.66, 0.66, '-z');
    // green interior: seats and rear bench
    const sw = clamp(f.hip * 2 + 0.1, 1.3, 1.75);
    b.box(0, 0.62, -0.48, sw, 0.28, 0.72, 0x2f5a3a);
    b.box(0, 0.9, -0.9, sw, 0.72, 0.16, 0x2f5a3a);
    b.box(0, 0.62, -1.45, 1.7, 0.36, 0.55, 0x2f5a3a);
    // cowl, dash, hood
    b.box(0, 0.5, 0.78, 2.14, 0.8, 0.32, SAND);
    b.box(0, 1.0, 0.6, 1.5, 0.24, 0.1, C.black);
    b.box(0, 0.62, 1.76, 1.84, 0.6, 1.66, SAND);
    b.box(0, 1.22, 1.76, 1.6, 0.03, 1.5, SAND);
    for (const dz of [1.45, 2.0]) rbox(b, 0, 1.24, dz, 1.55, 0.02, 0.17, 0, 0.55, 0, JPRED);
    decal(b, 1, 0, 1.255, 1.62, 0.55, 0.42, 'up');
    // YJ face: seven-slot grille, square headlamps, bumper and winch
    b.box(0, 0.5, 2.6, 1.6, 0.7, 0.06, SAND);
    for (let i = -3; i <= 3; i++) b.box(i * 0.1, 0.66, 2.635, 0.05, 0.38, 0.02, C.black);
    for (const sd of [-1, 1]) {
      b.box(sd * 0.56, 0.78, 2.63, 0.3, 0.22, 0.04, C.white, lamp);
      b.box(sd * 0.56, 0.6, 2.63, 0.2, 0.08, 0.04, C.orange);
    }
    b.box(0, 0.3, 2.72, 2.12, 0.2, 0.26, C.black);
    b.box(0, 0.4, 2.8, 0.56, 0.22, 0.22, C.dkgray);
    b.box(0, 0.44, 2.86, 0.1, 0.1, 0.06, JPRED);
    // red windscreen frame with the light bar
    for (const sd of [-1, 1]) b.box(sd * 0.96, 1.2, 0.98, 0.1, 0.78, 0.1, JPRED);
    b.box(0, 1.9, 0.98, 2.02, 0.1, 0.12, JPRED);
    b.box(0, 1.25, 0.98, 1.82, 0.65, 0.03, C.azure, { matOpts: { trans: true, opacity: 0.3 } });
    b.box(0, 2.0, 0.98, 1.5, 0.08, 0.08, C.black);
    for (let i = -1.5; i <= 1.5; i++) disc(b, i * 0.36, 2.15, 1.0, 0.09, 0.12, 'z', C.white, { seg: 10, ...lamp });
    // roll bar (taller and wider for big drivers) and the radio whip
    const RT = 2.05 + f.big * 0.7, RX = clamp(f.sx + 0.3, 0.88, 0.98);
    for (const sd of [-1, 1]) {
      tube(b, sd * RX, 1.2, -1.2, sd * RX, RT, -1.2, 0.06, C.black);
      tube(b, sd * RX, RT - 0.05, -1.2, sd * RX, 1.22, -1.74, 0.05, C.black);
    }
    tube(b, -RX - 0.06, RT, -1.2, RX + 0.06, RT, -1.2, 0.06, C.black);
    tube(b, 0.92, 1.22, -1.75, 0.92, RT + 0.65, -1.75, 0.015, C.black, { seg: 4 });
    const mesh = b.build({ name: 'jpjeep' }); mesh.position.z = -0.18;   // keep the winch inside the footprint
    return {
      mesh, seat: [0, 0.95, -0.63], control: 'wheel', exhaust: [[0.6, 0.3, -2.3, BACK], [-0.6, 0.3, -2.3, BACK]],
      wheels: [
        { z: -1.48, r: 0.5, w: 0.44, xs: [1.2, -1.2], cap: JPRED },
        { x: 1.2, z: 1.32, r: 0.5, w: 0.44, front: true, cap: JPRED },
        { x: -1.2, z: 1.32, r: 0.5, w: 0.44, front: true, cap: JPRED },
      ],
    };
  },
};

// ------------------------------------------------------------------------------------------------
// Jurassic World Gyrosphere: a clear glass ball with a two-seat cabin that stays level while
// the shell (and its rings) roll with the speed.
const gyro = {
  id: 'gyrosphere', name: 'Gyrosphere', form: 'Rolling glass ball', blurb: 'Keep arms inside the ball',
  stats: { speed: 2, accel: 4, handling: 5, weight: 1 }, colors: [0xdff3ff, 0x2a5ab8, 0xf4f4f4],
  build({ THREE, BrickBuilder, C, plastic, rig }) {
    // the ball is sized so the driver's head clears the glass (a tall driver also sits lower)
    const f = fitOf(rig);
    const SY = clamp(0.98 - (f.H - 2.05) * 0.5, 0.76, 0.98), dy = SY - 0.98;
    const R = clamp((SY + f.H * 1.02 + 0.1) / 2, 1.4, 1.85), k = R / 1.6;
    const SZ = -0.15 + f.wide * 0.12;   // broad backs sit a little further forward of the seat back
    // cabin (level): white lower bowl, dark floor, blue seats and a console
    const b = new BrickBuilder(0.4);
    const bowl = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3, side: THREE.DoubleSide });
    blob(b, 0, R, 0, R - 0.07, R - 0.07, R - 0.07, 0, { mat: bowl, t0: 2.1, t1: PI, ws: 28, hs: 8 });
    ring(b, 0, R + (R - 0.07) * Math.cos(2.1), 0, (R - 0.07) * Math.sin(2.1), 0.05, 'y', C.dkgray, { ts: 32 });
    b.cyl(0, 0.28, 0, 1.05 * k, 0.26, C.dkgray, { seg: 24 });
    for (const sd of [-1, 1]) {
      b.box(sd * 0.36, 0.54, -0.18, 0.66, 0.36 + dy, 0.72, 0x2a5ab8);
      b.box(sd * 0.36, 0.9 + dy, -0.58, 0.66, 0.8, 0.14, 0x2a5ab8);
      b.box(sd * 0.36, 1.7 + dy + f.big * 0.4, -0.6, 0.4, 0.22, 0.12, 0x2a5ab8);
    }
    b.box(0, 0.54, -0.6, 0.08, 1.2 + dy + f.big * 0.4, 0.1, C.ltgray);
    const CZ = 0.72 + (k - 1) * 0.5;   // console moves forward in a bigger ball (room for long legs)
    b.box(0, 0.54, CZ, 0.8, 0.5, 0.36, C.ltgray);
    rbox(b, 0, 1.1, CZ + 0.02, 0.8, 0.08, 0.4, -0.35, 0, 0, C.black);
    b.sphere(-0.24, 1.12, CZ + 0.14, 0.06, C.red);
    b.sphere(0.24, 1.12, CZ + 0.14, 0.06, C.blue);
    // the rolling shell: glass ball with a tread ring and a seam ring
    const g = new THREE.Group(); g.position.set(0, R, 0);
    const spin = new THREE.Group(); g.add(spin);
    const sb = new BrickBuilder(0.4);
    blob(sb, 0, 0, 0, R, R, R, 0xdff3ff, { ws: 28, hs: 18, matOpts: { trans: true, opacity: 0.2, rough: 0.05 } });
    // two rolling bands near the sides (clear of the driver) with orange tread pads
    const BX = 1.22 * k, BR = Math.sqrt(R * R - BX * BX) + 0.02;
    for (const sd of [-1, 1]) {
      ring(sb, sd * BX, 0, 0, BR, 0.06, 'x', C.ltgray, { ts: 32 });
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * PI * 2;
        rbox(sb, sd * BX, Math.cos(a) * (BR + 0.04), Math.sin(a) * (BR + 0.04), 0.18, 0.06, 0.16, -a, 0, 0, C.orange);
      }
    }
    spin.add(sb.build({ name: 'gyroshell' }));
    const EZ = -Math.sqrt(R * R - (R - 0.5) ** 2) - 0.02;   // flames out of the back of the ball, low down
    return {
      mesh: b.build({ name: 'gyrocabin' }), seat: [0, SY, SZ], control: 'wheel', wheels: [{ g, spin, front: false, r: R }],
      exhaust: [[0.4, 0.5, EZ, BACK], [-0.4, 0.5, EZ, BACK]],
    };
  },
};

// ------------------------------------------------------------------------------------------------
// The 1993 tour Explorer: Jurassic green over yellow with red tiger slashes, yellow bumpers,
// brush guard and wheels, and the clear bubble roof (here right over the driver).
const JGREEN = 0x3c7a2c, JYEL = 0xf2c414;
const explorer = {
  id: 'tourcar', name: 'Tour Explorer', form: 'Park tour SUV', blurb: 'Welcome to Jurassic Park',
  stats: { speed: 4, accel: 2, handling: 2, weight: 5 }, colors: [JGREEN, JYEL, 0xc4161c],
  build({ BrickBuilder, C, rig }) {
    // the greenhouse fits the driver: a tall one sits a little lower under higher roof rails and a
    // taller bubble; broad shoulders splay the pillars out
    const f = fitOf(rig);
    const SY = 0.98 - clamp((f.H - 2.05) * 0.3, 0, 0.18);
    const RY = 2.15 + f.big * 0.35, GX = clamp(f.sx + 0.32, 0.92, 1.06);
    const HB = clamp((SY + f.H * 1.03 + 0.08 - RY) / 0.9, 0.72, 1.4);
    const b = new BrickBuilder(0.4);
    const glass = { matOpts: { trans: true, opacity: 0.3, rough: 0.05 } };
    const lamp = { matOpts: { emissive: 0xfff2b0, emissiveIntensity: 0.9 } };
    b.box(0, 0.26, 0, 1.8, 0.2, 4.7, C.black);
    // yellow lower body, green upper walls (open cabin under the bubble)
    b.box(0, 0.36, 0, 2.0, 0.44, 4.8, JYEL);
    for (const sd of [-1, 1]) {
      b.box(sd * 0.92, 0.8, -0.55, 0.16, 0.5, 3.7, JGREEN);
      b.box(sd * 1.12, 0.92, 1.6, 0.36, 0.1, 1.1, JGREEN);           // wheel arches
      b.box(sd * 1.12, 0.92, -1.5, 0.36, 0.1, 1.1, JGREEN);
      // red tiger slashes along the green/yellow line
      for (let i = 0; i < 7; i++) rbox(b, sd * 1.005, 0.84, -2.1 + i * 0.66, 0.02, 0.62, 0.1, 0.55 + (i % 2) * 0.25, 0, 0, 0xc4161c);
      decal(b, 0, sd * 1.012, 1.02, 0.25, 0.46, 0.46, sd > 0 ? '+x' : '-x');
      b.box(sd * 0.92, 1.3, -0.55, 0.18, 0.06, 3.7, JGREEN);
    }
    b.box(0, 0.78, -0.5, 1.7, 0.06, 3.6, C.tan);
    const sw = clamp(f.hip * 2 + 0.2, 1.4, 1.66);
    b.box(0, 0.8, -0.32, sw, SY - 0.76, 0.75, C.tan);
    b.box(0, 1.0, -0.74, sw, 0.8, 0.16, C.tan);
    b.box(0, 0.8, -1.55, 1.7, 0.36, 0.6, C.tan);
    // hood, cowl and face
    b.box(0, 0.8, 1.85, 2.0, 0.42, 1.1, JGREEN);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) rbox(b, sd * 0.68, 1.23, 1.55 + i * 0.3, 0.6, 0.02, 0.09, 0, sd * (0.6 + (i % 2) * 0.2), 0, 0xc4161c);
    b.box(0, 0.8, 1.1, 2.0, 0.56, 0.4, JGREEN);
    b.box(0, 1.25, 0.88, 1.6, 0.12, 0.08, C.black);
    b.box(0, 0.56, 2.41, 1.2, 0.34, 0.04, C.black);
    for (let i = -2; i <= 2; i++) b.box(i * 0.22, 0.6, 2.43, 0.04, 0.26, 0.03, C.ltgray);
    for (const sd of [-1, 1]) { b.box(sd * 0.76, 0.92, 2.41, 0.4, 0.18, 0.04, C.white, lamp); b.box(sd * 0.76, 0.8, 2.41, 0.4, 0.08, 0.04, C.orange); }
    // yellow bumpers and brush guard
    b.box(0, 0.24, 2.46, 2.1, 0.22, 0.24, JYEL);
    for (const sd of [-1, 1]) tube(b, sd * 0.5, 0.4, 2.55, sd * 0.5, 1.05, 2.5, 0.05, JYEL);
    tube(b, -0.62, 1.05, 2.5, 0.62, 1.05, 2.5, 0.05, JYEL);
    tube(b, -0.62, 0.72, 2.56, 0.62, 0.72, 2.56, 0.04, JYEL);
    b.box(0, 0.24, -2.46, 2.1, 0.22, 0.24, JYEL);
    for (const sd of [-1, 1]) b.box(sd * 0.75, 0.9, -2.41, 0.2, 0.3, 0.04, C.red);
    // greenhouse: slanted windscreen, glass all round and the big bubble roof
    const wl = Math.hypot(RY - 1.35, 0.66), gh = Math.hypot(RY - 1.33, GX - 0.92), gt = Math.atan2(GX - 0.92, RY - 1.33);
    rbox(b, 0, (1.35 + RY) / 2, 0.91, 1.8 + (GX - 0.92) * 1.6, 0.04, wl, Math.atan2(RY - 1.35, 0.66), 0, 0, C.azure, glass);
    for (const sd of [-1, 1]) {
      tube(b, sd * 0.94, 1.35, 1.24, sd * GX, RY, 0.58, 0.05, JGREEN);
      for (const z of [-0.95, -2.3]) tube(b, sd * 0.92, 1.33, z, sd * GX, RY, z, 0.05, JGREEN);
      tube(b, sd * GX, RY, 0.62, sd * GX, RY, -2.34, 0.06, JGREEN);
      rbox(b, sd * (0.93 + GX) / 2, (1.33 + RY) / 2, -0.86, 0.03, gh, 2.9, 0, 0, -sd * gt, C.azure, glass);
    }
    for (const z of [0.58, -2.3]) tube(b, -GX - 0.02, RY, z, GX + 0.02, RY, z, 0.06, JGREEN);
    b.box(0, 1.33, -2.33, 1.82 + (GX - 0.92) * 1.6, RY - 1.33, 0.03, C.azure, glass);
    b.box(0, 0.8, -2.33, 2.0, 0.5, 0.12, JGREEN);
    blob(b, 0, RY, -0.86, GX + 0.02, HB, 1.5, C.azure, { t1: PI / 2, ws: 24, hs: 8, ...glass });
    return {
      mesh: b.build({ name: 'tourcar' }), seat: [0, SY, -0.3], control: 'wheel', exhaust: [[0.62, 0.3, -2.62, BACK], [-0.62, 0.3, -2.62, BACK]],
      wheels: [
        { z: -1.5, r: 0.46, w: 0.4, xs: [1.18, -1.18], cap: JYEL },
        { x: 1.18, z: 1.6, r: 0.46, w: 0.4, front: true, cap: JYEL },
        { x: -1.18, z: 1.6, r: 0.46, w: 0.4, front: true, cap: JYEL },
      ],
    };
  },
};

// ------------------------------------------------------------------------------------------------
// Wakanda's Royal Talon hover-car: black hull, twin talon prongs, swept wings, purple
// vibranium glow lines and hover pads that pulse (and flare on boost).
const TDARK = 0x23202e, TPURP = 0x7b3fe0, TSILV = 0xa7abb8;
const talon = {
  id: 'talon', name: 'Royal Talon', form: 'Wakandan hover-car', blurb: 'Vibranium-powered glide',
  stats: { speed: 4, accel: 4, handling: 3, weight: 2 }, colors: [TDARK, TPURP, TSILV],
  build({ THREE, BrickBuilder, C, rig }) {
    const f = fitOf(rig), TX = clamp(f.hip + 0.1, 0.68, 0.95);   // cockpit walls clear the hips
    const b = new BrickBuilder(0.4);
    const glow = glowMat(0x6a2ad0, 0x8a3dff, 1.0);
    const G = { mat: glow }, MET = { matOpts: { metal: 0.7, rough: 0.25 } };
    // hull, stepped arrow nose, cockpit
    b.box(0, 0, -0.5, 1.2, 0.42, 3.0, TDARK);
    b.box(0, 0.02, 1.3, 1.0, 0.36, 0.7, TDARK);
    b.box(0, 0.04, 1.85, 0.7, 0.3, 0.5, TDARK);
    b.box(0, 0.06, 2.25, 0.4, 0.22, 0.4, TDARK);
    cone(b, 0, 0.17, 2.45, 0.12, 0.25, 'z', 1, TSILV, MET);
    for (const sd of [-1, 1]) {
      b.box(sd * TX, 0.42, -0.6, 0.18, 0.34, 2.0, TDARK);
      beam(b, sd * 0.42, 0.5, 0.45, sd * 0.08, 0.36, 2.0, 0.34, 0.06, TSILV, MET);    // panther-mask plates
      beam(b, sd * 0.3, 0.55, 0.65, sd * 0.12, 0.47, 1.1, 0.07, 0.04, 0, G);          // glowing eye slits
    }
    rbox(b, 0, 0.5, 0.62, 1.2, 0.16, 0.5, 0.3, 0, 0, TDARK);
    b.box(0, 0.42, -1.65, 1.5 + (TX - 0.68) * 2, 0.5, 0.16, TDARK);
    b.box(0, 0.42, -0.6, 0.9 + (TX - 0.68) * 2, 0.2, 0.62, TPURP);
    b.box(0, 0.62, -1.0, 0.9 + (TX - 0.68) * 2, 0.6, 0.14, TPURP);
    // claw wings: swept out from the tail and curving forward round the nose like talons
    for (const sd of [-1, 1]) {
      const P = [[0.55, 0.2, -1.55], [1.5, 0.2, -0.65], [1.6, 0.16, 0.65], [1.32, 0.12, 1.8], [0.98, 0.08, 2.45]];
      const W = [0.44, 0.38, 0.3, 0.2];
      for (let i = 0; i < 4; i++) {
        const [x1, y1, z1] = P[i], [x2, y2, z2] = P[i + 1];
        beam(b, sd * x1, y1, z1, sd * x2, y2, z2, W[i], 0.14, i < 2 ? TDARK : TSILV, { ext: 0.12, ...(i < 2 ? {} : MET) });
        beam(b, sd * (x1 - 0.12), y1 + 0.08, z1, sd * (x2 - 0.12), y2 + 0.08, z2, 0.05, 0.03, 0, { ...G, ext: 0.05 });
      }
      cone(b, sd * 0.98, 0.08, 2.45, 0.08, 0.22, 'z', 1, TSILV, MET);
      b.box(sd * 1.08, 0.08, -0.45, 0.85, 0.1, 1.5, TDARK);                         // wing web
      b.box(sd * 1.08, 0.18, -0.45, 0.6, 0.03, 1.1, TPURP, { matOpts: { trans: true, opacity: 0.7, emissive: 0x5a1ab0, emissiveIntensity: 0.6 } });
      b.box(sd * 0.61, 0.2, -0.5, 0.02, 0.06, 2.8, 0, G);                           // vibranium lines
      for (const z of [1.0, -1.4]) disc(b, sd * 0.42, -0.04, z, 0.24, 0.08, 'y', 0, { ...G, seg: 12 });
      disc(b, sd * 1.15, 0.03, -0.5, 0.22, 0.08, 'y', 0, { ...G, seg: 12 });
      disc(b, sd * 0.32, 0.22, -2.03, 0.2, 0.06, 'z', TSILV, { seg: 12 });
      disc(b, sd * 0.32, 0.22, -2.06, 0.13, 0.06, 'z', 0, { ...G, seg: 12 });
    }
    // rudders that turn with the steering
    const fins = [];
    for (const sd of [-1, 1]) {
      const f = new THREE.Group(); f.position.set(sd * 0.45, 0.42, -1.85);
      const fb = new BrickBuilder(0.4);
      rbox(fb, 0, 0.32, -0.08, 0.08, 0.62, 0.5, 0.3, 0, 0, TDARK);
      rbox(fb, 0, 0.34, 0.12, 0.09, 0.52, 0.05, 0.3, 0, 0, TSILV);
      f.add(fb.build({ name: 'fin' }));
      fins.push(f);
    }
    return {
      mesh: b.build({ name: 'talon' }), seat: [0, 0.6, -0.55], control: 'yoke', hover: 0.5, parts: fins,
      exhaust: [[0.32, 0.22, -2.12, BACK], [-0.32, 0.22, -2.12, BACK]],
      steer: fins.map((obj) => ({ obj, axis: 'y', amount: 0.45 })),
      fx(s) { glow.emissiveIntensity = 0.8 + S(s.t * 4) * 0.3 + (s.boosting ? 1.4 : s.speed01 * 0.5); },
    };
  },
};

// ------------------------------------------------------------------------------------------------
// Tony Stark's roadster: hot-rod red with gold side blades and hood stripe, an arc reactor in
// the nose and twin repulsor thrusters that flare on boost.
const SRED = 0xb3121b, SGOLD = 0xd9a72e;
const stark = {
  id: 'starkcar', name: 'Stark Roadster', form: 'Sports roadster', blurb: 'Arc-reactor powered',
  stats: { speed: 5, accel: 3, handling: 3, weight: 2 }, colors: [SRED, SGOLD, 0x1b2a34],
  build({ THREE, BrickBuilder, C, rig }) {
    const f = fitOf(rig), DX = clamp(f.hip + 0.13, 0.95, 1.05) - 0.95;   // tub sides clear broad hips
    const b = new BrickBuilder(0.4);
    const arc = glowMat(0xd8f8ff, 0x6fe0ff, 1.4);                 // arc reactor, LEDs and repulsors
    const A = { mat: arc }, glass = { matOpts: { trans: true, opacity: 0.4 } };
    b.box(0, 0.18, 0, 1.9, 0.2, 4.8, C.black);
    // low cockpit tub and seats
    for (const sd of [-1, 1]) b.box(sd * (0.95 + DX), 0.32, -0.3, 0.22, 0.58, 2.0, SRED);
    b.box(0, 0.32, -0.42, 1.7, 0.1, 1.6, C.black);
    const sw = clamp(f.hip * 2, 1.2, 1.7);
    b.box(0, 0.36, -0.42, sw, 0.26, 0.72, C.black);
    b.box(0, 0.6, -0.86, sw, 0.62, 0.16, C.black);
    for (const sd of [-1, 1]) {
      b.box(sd * (1.07 + DX), 0.36, -0.95, 0.04, 0.48, 0.52, SGOLD);        // gold side blades
      b.box(sd * (1.09 + DX), 0.46, -0.95, 0.02, 0.26, 0.3, C.black);       // intake
      b.box(sd * 1.12, 0.6, 1.45, 0.4, 0.28, 1.05, SRED);            // front fenders
      b.box(sd * 1.14, 0.62, -1.4, 0.42, 0.34, 1.1, SRED);           // rear haunches
      b.box(sd * 1.14, 0.96, -1.4, 0.36, 0.04, 0.9, SGOLD);
      b.box(sd * 0.2, 0.92, -1.85, 0.08, 0.03, 0.9, SGOLD);
    }
    // hood with a gold stripe, vents and the nose
    b.box(0, 0.3, 1.5, 1.9, 0.46, 1.7, SRED);
    rbox(b, 0, 0.66, 2.38, 1.9, 0.22, 0.42, 0.45, 0, 0, SRED);
    b.box(0, 0.76, 1.42, 0.5, 0.03, 1.5, SGOLD);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) b.box(sd * 0.6, 0.765, 1.2 + i * 0.16, 0.36, 0.02, 0.06, C.black);
    rbox(b, 0, 0.7, 0.75, 1.75, 0.16, 0.25, -0.3, 0, 0, SRED);
    b.box(0, 0.08, 2.42, 1.9, 0.06, 0.2, C.black);                     // splitter
    // face: grille, LED lamps, arc reactor
    b.box(0, 0.24, 2.47, 1.1, 0.32, 0.06, C.black);
    for (let i = -2; i <= 2; i++) b.box(i * 0.2, 0.27, 2.5, 0.12, 0.26, 0.02, C.dkgray);
    for (const sd of [-1, 1]) rbox(b, sd * 0.68, 0.6, 2.42, 0.42, 0.07, 0.05, 0, 0, -sd * 0.15, 0, A);
    disc(b, 0, 0.6, 2.52, 0.2, 0.06, 'z', C.dkgray, { seg: 20 });
    disc(b, 0, 0.6, 2.55, 0.14, 0.04, 'z', 0, { ...A, seg: 20 });
    // windscreen, as tall as the driver's chest
    const wh = 0.42 * clamp(f.sy / 1.2, 0.85, 1.3);
    rbox(b, 0, 0.81 + wh * 0.405, 0.842 - wh * 0.29, 1.7, wh, 0.04, -0.62, 0, 0, C.black, glass);
    rbox(b, 0, 0.84 + wh * 0.81, 0.842 - wh * 0.58, 1.72, 0.05, 0.06, -0.62, 0, 0, C.black);
    // rear deck, engine glass, spoiler, tail lights, repulsor thrusters
    b.box(0, 0.3, -1.85, 1.9, 0.6, 1.2, SRED);
    b.box(0, 0.9, -1.85, 0.3, 0.04, 0.95, C.black, glass);
    for (const sd of [-1, 1]) rbox(b, sd * 0.38, 1.0, -1.15, 0.5, 0.3, 0.5, -0.5, 0, 0, SRED);
    b.box(0, 1.05, -2.33, 1.8, 0.06, 0.32, C.black);
    for (const sd of [-1, 1]) b.box(sd * 0.6, 0.9, -2.33, 0.06, 0.16, 0.2, C.black);
    b.box(0, 0.74, -2.46, 1.7, 0.07, 0.04, C.red);
    for (const sd of [-1, 1]) {
      disc(b, sd * 0.42, 0.45, -2.46, 0.17, 0.06, 'z', C.dkgray, { seg: 14 });
      disc(b, sd * 0.42, 0.45, -2.5, 0.11, 0.06, 'z', 0, { ...A, seg: 14 });
    }
    // repulsor blast (grows with speed, flares on boost)
    const thr = new THREE.Group(); thr.position.set(0, 0.45, -2.52);
    const tb = new BrickBuilder(0.4);
    const blast = glowMat(0x9fe6ff, 0x50c8ff, 1.5, { transparent: true, opacity: 0.55, depthWrite: false });
    for (const sd of [-1, 1]) cone(tb, sd * 0.42, 0, 0, 0.1, 0.3, 'z', -1, 0, { seg: 10, mat: blast });
    thr.add(tb.build({ name: 'repulsors', shadows: false }));
    return {
      mesh: b.build({ name: 'starkcar' }), seat: [0, 0.6, -0.42], control: 'wheel', parts: [thr],
      exhaust: [[0.42, 0.45, -2.56, BACK], [-0.42, 0.45, -2.56, BACK]],
      wheels: [
        { z: -1.4, r: 0.47, w: 0.5, xs: [1.18, -1.18], cap: SGOLD },
        { x: 1.16, z: 1.45, r: 0.42, w: 0.4, front: true, cap: SGOLD },
        { x: -1.16, z: 1.45, r: 0.42, w: 0.4, front: true, cap: SGOLD },
      ],
      fx(s) {
        arc.emissiveIntensity = (s.boosting ? 2.6 : 1.2 + s.speed01 * 0.4) + S(s.t * 5) * 0.35;
        thr.visible = s.speed01 > 0.08 || s.boosting;
        thr.scale.set(1, 1, s.boosting ? 2.4 + S(s.t * 40) * 0.3 : 0.5 + s.speed01);
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------
// Thor's goat chariot: a Viking-style wooden car with shields, pulled by Toothgnasher and
// Toothgrinder, whose legs gallop with the speed. The goats swing with the steering.
const WOOD = 0x7c503a, DWOOD = 0x583927, AGOLD = 0xe6c05a;
const chariot = {
  id: 'goatchariot', name: 'Goat Chariot', form: 'Goat-drawn chariot', blurb: 'Two goats, zero brakes',
  stats: { speed: 3, accel: 4, handling: 4, weight: 2 }, colors: [WOOD, AGOLD, 0xc91a09, 0xe8e2d4],
  build({ THREE, BrickBuilder, C, rig }) {
    const f = fitOf(rig), DX = clamp(f.hip + 0.1, 0.9, 1.02) - 0.9;   // the car widens for broad hips
    const b = new BrickBuilder(0.4);
    const gold = { matOpts: { metal: 0.65, rough: 0.3 } };
    // car body
    b.box(0, 0.5, -0.45, 1.74 + DX * 2, 0.16, 2.1, DWOOD);
    for (const sd of [-1, 1]) {
      b.box(sd * (0.9 + DX), 0.5, -0.5, 0.14, 0.76, 2.0, WOOD);
      b.box(sd * (0.9 + DX), 1.26, -0.5, 0.2, 0.06, 2.06, AGOLD, gold);
      for (let i = 0; i < 4; i++) b.box(sd * (0.975 + DX), 0.58 + i * 0.17, -0.5, 0.02, 0.03, 2.0, DWOOD); // planks
      [[0.3, C.red], [-1.32, C.ltgray]].forEach(([z, col]) => {
        disc(b, sd * (0.99 + DX), 0.92, z, 0.24, 0.06, 'x', col, { seg: 16 });
        disc(b, sd * (1.0 + DX), 0.92, z, 0.15, 0.07, 'x', col === C.red ? C.yellow : C.blue, { seg: 16 });
        b.sphere(sd * (1.03 + DX), 0.92, z, 0.07, AGOLD, gold);
      });
    }
    // high curved front with a lightning bolt
    b.box(0, 0.5, 0.62, 1.94 + DX * 2, 0.95, 0.16, WOOD);
    rbox(b, 0, 1.5, 0.62, 1.4 + DX * 2, 0.16, 0.16, 0, 0, 0, WOOD);
    rbox(b, 0, 1.48, 0.62, 2.0 + DX * 2, 0.06, 0.2, 0, 0, 0, AGOLD, gold);
    for (const sd of [-1, 1]) cone(b, sd * (0.98 + DX), 1.52, 0.62, 0.1, 0.35, 'y', 1, AGOLD, gold);
    const bolt = { matOpts: { emissive: 0x6fd0ff, emissiveIntensity: 0.8 } };
    rbox(b, 0.06, 1.18, 0.71, 0.1, 0.32, 0.03, 0, 0, -0.5, 0xd8f4ff, bolt);
    rbox(b, -0.02, 0.97, 0.71, 0.24, 0.07, 0.03, 0, 0, 0.2, 0xd8f4ff, bolt);
    rbox(b, -0.06, 0.78, 0.71, 0.1, 0.32, 0.03, 0, 0, -0.5, 0xd8f4ff, bolt);
    // throne seat and red cape-cloth back
    b.box(0, 0.66, -0.72, 1.2 + DX * 2, 0.26, 0.66, C.red);
    b.box(0, 0.66, -1.12, 1.3 + DX * 2, 0.66, 0.16, WOOD);
    b.box(0, 1.32, -1.12, 1.4 + DX * 2, 0.08, 0.2, AGOLD, gold);
    b.box(0, 0.4, -1.55, 1.0, 0.08, 0.3, DWOOD);                         // step
    b.box(0, 0.45, -0.5, 2.3 + DX * 2, 0.1, 0.1, C.dkgray);              // axle
    // spoked wheels (custom rolling part)
    const wg = new THREE.Group(); wg.position.set(0, 0.64, -0.5);
    const wspin = new THREE.Group(); wg.add(wspin);
    const wb = new BrickBuilder(0.4);
    for (const sd of [-1, 1]) {
      const x = sd * (1.16 + DX);
      ring(wb, x, 0, 0, 0.58, 0.07, 'x', DWOOD, { rs: 6, ts: 22 });
      ring(wb, x + Math.sign(x) * 0.05, 0, 0, 0.58, 0.035, 'x', AGOLD, { rs: 6, ts: 22 });
      for (let i = 0; i < 6; i++) rbox(wb, x, 0, 0, 0.07, 1.14, 0.07, i * PI / 6, 0, 0, WOOD);
      disc(wb, x, 0, 0, 0.13, 0.2, 'x', AGOLD, { seg: 12 });
    }
    wspin.add(wb.build({ name: 'chariotwheels' }));
    // the goats (swing with steering; pivot at the chariot front)
    const goats = new THREE.Group(); goats.position.set(0, 0, 0.66);
    const gb = new BrickBuilder(0.4);
    const Z = (z) => z - 0.75;
    [[-0.55, 0xece6d8, 0x7a6a58], [0.55, 0xb79f82, 0x5a4636]].forEach(([gx, fur, dark]) => {
      gb.box(gx, 0.78, Z(1.65), 0.5, 0.48, 1.05, fur);                   // body
      gb.box(gx, 1.04, Z(1.6), 0.54, 0.24, 0.5, C.red);                  // saddle cloth
      gb.box(gx, 1.02, Z(1.6), 0.55, 0.04, 0.52, AGOLD);
      rbox(gb, gx, 1.32, Z(2.2), 0.28, 0.5, 0.3, 0.45, 0, 0, fur);       // neck
      gb.box(gx, 1.38, Z(2.45), 0.3, 0.3, 0.42, fur);                    // head
      gb.box(gx, 1.36, Z(2.66), 0.24, 0.2, 0.08, dark);                  // muzzle
      for (const ex of [-1, 1]) {
        gb.box(gx + ex * 0.08, 1.58, Z(2.56), 0.06, 0.06, 0.06, C.black); // eyes
        rbox(gb, gx + ex * 0.2, 1.62, Z(2.4), 0.16, 0.06, 0.1, 0, 0, ex * -0.5, dark); // ears
        ring(gb, gx + ex * 0.1, 1.82, Z(2.34), 0.15, 0.045, 'x', 0x4a4a46, { arc: PI * 1.3, rs: 5, ts: 10, rx: -0.6 }); // curled horns
      }
      gb.box(gx, 1.2, Z(2.6), 0.1, 0.2, 0.08, 0xf4f4f4);                  // beard
      rbox(gb, gx, 1.22, Z(1.12), 0.12, 0.22, 0.08, -0.6, 0, 0, fur);    // tail
      ring(gb, gx, 1.35, Z(2.18), 0.2, 0.04, 'z', AGOLD, { rs: 5, ts: 14, rx: 0.45 }); // collar
    });
    tube(gb, -0.75, 1.42, Z(2.15), 0.75, 1.42, Z(2.15), 0.05, AGOLD);   // yoke
    tube(gb, 0, 0.62, Z(0.7), 0, 1.4, Z(2.15), 0.06, DWOOD);                  // draught pole
    for (const sd of [-1, 1]) tube(gb, sd * 0.5, 1.45, Z(2.1), sd * 0.35, 1.5, Z(0.75), 0.02, C.red, { seg: 4 }); // reins
    goats.add(gb.build({ name: 'goats' }));
    // legs: front pair and back pair gallop in opposite phase
    const legs = [];
    for (const lz of [2.0, 1.25]) {
      const lg = new THREE.Group(); lg.position.set(0, 0.85, Z(lz));
      const lb = new BrickBuilder(0.4);
      for (const gx of [-0.55, 0.55]) for (const ex of [-1, 1]) {
        lb.box(gx + ex * 0.15, -0.8, 0, 0.13, 0.8, 0.14, gx < 0 ? 0xece6d8 : 0xb79f82);
        lb.box(gx + ex * 0.15, -0.85, 0.02, 0.15, 0.1, 0.18, C.black);
      }
      lg.add(lb.build({ name: 'goatlegs' }));
      goats.add(lg); legs.push(lg);
    }
    let ph = 0;
    return {
      mesh: b.build({ name: 'chariot' }), seat: [0, 0.95, -0.62], control: 'bars', parts: [goats],
      exhaust: [[0.42, 0.55, -1.75, BACK], [-0.42, 0.55, -1.75, BACK]],
      wheels: [{ g: wg, spin: wspin, front: false, r: 0.64 }],
      steer: [{ obj: goats, axis: 'y', amount: 0.32 }],
      fx(s, dt) {
        const amp = Math.min(1, 0.15 + s.speed01 * 1.6) * (s.grounded ? 1 : 0.3);
        ph += dt * (4 + s.speed01 * 12 + (s.boosting ? 5 : 0));
        const a = S(ph);
        legs[0].rotation.x = a * 0.7 * amp;
        legs[1].rotation.x = -a * 0.7 * amp;
        goats.position.y = Math.abs(S(ph)) * 0.08 * amp;
        goats.rotation.x = Math.cos(ph) * 0.04 * amp;
      },
    };
  },
};

export default [jeep, gyro, explorer, talon, stark, chariot];
