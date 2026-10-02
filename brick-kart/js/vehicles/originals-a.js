// Original Karts, first half: the builder, the astronaut, the pirate, the knight,
// the robot, the ninja, the firefighter and the wizard (see ../characters.js buildVehicle).
import { kit, ease, pitchAbout } from './originals-kit.js';

const PI = Math.PI, sin = Math.sin, cos = Math.cos;
const CHROME = { metal: 0.85, rough: 0.22 };
const glow = (e, i = 1) => ({ m: { emissive: e, emissiveIntensity: i } });

// ---- Brick Bob: a stubby loader-dumper with a working scoop and a tipping bed ---------------
export const bob = {
  id: 'bob', name: 'Hard Hat Hauler', form: 'Loader-dumper', blurb: 'Scoops up the competition',
  stats: { speed: 3, accel: 3, handling: 3, weight: 3 },
  colors: [0xf2cd37, 0x1b2a34, 0xfe8a18, 0x6c6e68],
  build(K) {
    const { THREE, BrickBuilder, C, rig } = K;
    const sh = kit(K);
    const Y = C.yellow, BK = C.black, DG = C.dkgray, LG = C.ltgray;
    const b = new BrickBuilder(0.4);
    // frame, deck and hood
    sh.box(b, 0, 0.72, -0.4, 1.2, 0.36, 3.4, DG);
    sh.box(b, 0, 1.02, -0.25, 1.75, 0.26, 2.1, Y);
    sh.box(b, 0, 1.28, 0.98, 1.3, 0.56, 0.84, Y);
    sh.box(b, 0, 1.58, 0.98, 1.1, 0.06, 0.7, BK);
    for (let i = -2; i <= 2; i++) sh.box(b, i * 0.2, 1.24, 1.41, 0.08, 0.36, 0.04, BK);
    for (const sd of [-1, 1]) sh.box(b, sd * 0.45, 1.46, 1.41, 0.22, 0.12, 0.04, C.white, glow(0xfff2b0, 1));
    // seat tub and back
    for (const sd of [-1, 1]) sh.box(b, sd * 0.78, 1.32, -0.35, 0.16, 0.5, 1.25, Y);
    sh.box(b, 0, 1.55, -0.98, 1.3, 1.0, 0.14, BK);
    sh.box(b, 0, 1.2, -0.35, 1.3, 0.12, 1.2, BK);
    // rear wheel arches and front mudguards
    for (const sd of [-1, 1]) {
      sh.arc(b, sd * 1.2, 0.72, -1.35, 0.86, 0.25, 2.9, 7, 0.62, 0.08, Y);
      sh.box(b, sd * 1.15, 1.12, 1.15, 0.52, 0.08, 0.9, Y);
      sh.box(b, sd * 0.86, 1.02, 1.15, 0.2, 0.2, 0.2, DG);
    }
    // front bumper with hazard stripes
    sh.box(b, 0, 0.62, 1.48, 1.9, 0.3, 0.16, Y);
    for (let i = -4; i <= 4; i++) sh.box(b, i * 0.21, 0.62, 1.565, 0.07, 0.38, 0.02, BK, { rz: 0.6 });
    sh.box(b, 0, 0.48, 1.56, 1.9, 0.06, 0.03, Y); sh.box(b, 0, 0.76, 1.56, 1.9, 0.06, 0.03, Y);
    // exhaust stack with a rain flap
    sh.tube(b, [0.5, 1.5, 1.15], [0.5, 2.25, 1.15], 0.08, LG, { m: CHROME, seg: 10 });
    sh.box(b, 0.5, 2.28, 1.12, 0.18, 0.03, 0.2, BK, { rx: -0.4 });
    // roll-over cage behind the driver (open above, so arms never clip)
    const px = Math.min(1.2, Math.max(0.82, (rig.width || 1.3) / 2 + 0.15));
    const top = 1.05 + Math.min(2.5, Math.max(1.9, rig.height * 0.92));
    for (const sd of [-1, 1]) sh.tube(b, [sd * px, 1.15, -1.1], [sd * px * 0.9, top, -1.15], 0.07, BK);
    sh.tube(b, [-px * 0.9, top, -1.15], [px * 0.9, top, -1.15], 0.07, BK);
    sh.box(b, 0, top - 0.02, -1.15, 0.36, 0.1, 0.3, BK);
    for (const sd of [-1, 1]) sh.box(b, sd * px * 0.6, top - 0.02, -1.08, 0.24, 0.16, 0.08, C.white, glow(0xfff2b0, 1));
    const mesh = b.build({ name: 'bob' });

    // amber beacon on the cage
    const beacon = sh.part('beacon', 0, top + 0.06, -1.15, (pb) => {
      sh.cylY(pb, 0, 0.12, 0, 0.13, 0.24, C.orange, { m: { trans: true, opacity: 0.6, emissive: 0xff8a00, emissiveIntensity: 1.2 } });
      sh.box(pb, 0, 0.12, 0.07, 0.2, 0.12, 0.05, C.yellow, glow(0xffd000, 3));
    });
    // tipping dump bed full of loose bricks (pivots on its rear edge)
    const bed = new THREE.Group(); bed.position.set(0, 1.2, -2.3);
    const bb = new BrickBuilder(0.4);
    sh.box(bb, 0, 0.05, 0.62, 1.7, 0.1, 1.24, Y);
    for (const sd of [-1, 1]) sh.box(bb, sd * 0.82, 0.36, 0.62, 0.08, 0.62, 1.24, Y);
    sh.box(bb, 0, 0.5, 1.2, 1.7, 0.9, 0.08, Y);
    sh.box(bb, 0, 0.32, 0.02, 1.7, 0.55, 0.08, Y);
    for (let i = -4; i <= 4; i++) sh.box(bb, i * 0.19, 0.32, -0.025, 0.07, 0.62, 0.02, BK, { rz: 0.6 });
    sh.box(bb, 0, 0.06, -0.025, 1.7, 0.07, 0.03, Y); sh.box(bb, 0, 0.58, -0.025, 1.7, 0.07, 0.03, Y);
    for (const sd of [-1, 1]) sh.box(bb, sd * 0.62, 0.2, -0.05, 0.22, 0.1, 0.04, C.red, glow(0xff2010, 1.2));
    const rub = [[-0.45, 0.25, 2, 2, C.red, 0.2], [0.3, 0.35, 2, 4, C.tan, -0.4], [-0.1, 0.8, 2, 2, C.blue, 0.7], [0.5, 0.9, 1, 2, C.lime, 0.1], [-0.55, 0.85, 1, 2, LG, -0.3], [0.05, 0.4, 2, 2, C.orange, 1.1]];
    for (const [x, z, w, d, col, r] of rub) bb.brick(x, 0.1, z, w, d, 3, col, { rot: r });
    bb.brick(-0.15, 0.58, 0.55, 2, 2, 3, C.white, { rot: 0.5 }); bb.brick(0.3, 0.58, 0.85, 1, 2, 3, C.azure, { rot: -0.2 });
    bed.add(bb.build({ name: 'dumpbed' }));
    // loader arms and toothy bucket (pivot beside the cab)
    const arms = new THREE.Group(); arms.position.set(0, 1.42, 0.25);
    const ab = new BrickBuilder(0.4);
    for (const sd of [-1, 1]) {
      sh.tube(ab, [sd * 0.82, 0, 0], [sd * 0.82, -0.2, 1.0], 0.1, Y);
      sh.tube(ab, [sd * 0.82, -0.2, 1.0], [sd * 0.82, -0.72, 1.62], 0.1, Y);
      sh.cylX(ab, sd * 0.82, 0, 0, 0.15, 0.3, BK, { seg: 10 });
      sh.tube(ab, [sd * 0.82, -0.35, 0.35], [sd * 0.82, -0.12, 1.0], 0.05, LG, { m: CHROME });
    }
    sh.tube(ab, [-0.82, -0.25, 1.05], [0.82, -0.25, 1.05], 0.06, Y);
    sh.box(ab, 0, -1.02, 2.0, 1.95, 0.08, 0.62, Y);
    sh.box(ab, 0, -0.72, 1.7, 1.95, 0.62, 0.08, Y);
    sh.box(ab, 0, -0.42, 1.78, 1.95, 0.08, 0.2, Y);
    for (const sd of [-1, 1]) sh.box(ab, sd * 0.97, -0.78, 1.95, 0.06, 0.5, 0.6, Y);
    for (let i = -3; i <= 3; i++) sh.cone(ab, i * 0.27, -1.03, 2.38, 0.06, 0.2, LG, { rx: PI / 2, seg: 5 });
    ab.brick(-0.4, -0.98, 1.95, 2, 2, 3, C.red, { rot: 0.3 }); ab.brick(0.35, -0.98, 2.0, 1, 2, 3, C.blue, { rot: -0.5 });
    arms.add(ab.build({ name: 'loader' }));

    let raise = 0, tip = 0;
    return {
      mesh, seat: [0, 1.05, -0.35], control: 'wheel', parts: [beacon, bed, arms],
      wheels: [
        { x: 0, z: -1.35, r: 0.72, w: 0.56, xs: [1.2, -1.2], cap: C.orange },
        { x: 1.15, z: 1.15, r: 0.5, w: 0.42, front: true, cap: C.orange },
        { x: -1.15, z: 1.15, r: 0.5, w: 0.42, front: true, cap: C.orange },
      ],
      exhaust: [[0.5, 2.3, 1.15, 0]],
      fx(s, dt) {
        beacon.rotation.y += dt * 9;
        // the scoop nods as it digs along, and lifts high on boost or in the air
        const want = s.boosting ? -0.55 : !s.grounded || s.gliding ? -0.35 : -0.04 - Math.max(0, sin(s.t * 5)) * 0.12 * s.speed01;
        raise += (want - raise) * ease(dt, 6);
        arms.rotation.x = raise;
        tip += ((!s.grounded || s.gliding ? 0.7 : s.boosting ? 0.25 : 0) - tip) * ease(dt, 4);
        bed.rotation.x = -tip;
        const up = mesh.parent;
        if (up) up.position.y = sin(s.t * 34) * 0.008 * (0.4 + s.speed01);
      },
    };
  },
};

// ---- Astro Ava: a six-wheeled moon buggy with a scanning dish and booster rockets ----------
export const ava = {
  id: 'ava', name: 'Comet Cruiser', form: 'Moon rover', blurb: 'Six wheels, low gravity',
  stats: { speed: 2, accel: 4, handling: 4, weight: 2 },
  colors: [0xf4f4f4, 0x0055bf, 0xdcbc81, 0x1b2a34],
  build(K) {
    const { THREE, BrickBuilder, C, wheelGeo, wheelMat } = K;
    const sh = kit(K);
    const W = C.white, BL = C.blue, BK = C.black, FOIL = { metal: 0.75, rough: 0.3 };
    const b = new BrickBuilder(0.4);
    // gold-foil chassis tray and white deck
    sh.box(b, 0, 0.66, -0.05, 1.5, 0.22, 3.6, 0xdcbc81, { m: FOIL });
    sh.box(b, 0, 0.84, -0.05, 1.8, 0.16, 3.9, W);
    sh.box(b, 0, 0.93, -0.05, 1.82, 0.04, 3.92, BL);
    // rocker-bogie beams and pivots
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 1.3, 0.98, 0, 0.14, 0.14, 3.5, C.ltgray);
      sh.tube(b, [sd * 0.85, 0.86, 0], [sd * 1.3, 0.98, 0], 0.08, C.dkgray);
      sh.cylX(b, sd * 1.3, 0.98, 0, 0.12, 0.2, BL, { seg: 10 });
      for (const z of [-1.65, 0, 1.65]) sh.box(b, sd * 1.3, 1.07, z, 0.6, 0.06, 0.95, W);  // fenders
    }
    // nose console with comet emblem and camera
    sh.box(b, 0, 1.12, 1.55, 1.5, 0.4, 0.6, W);
    sh.box(b, 0, 1.33, 1.55, 1.3, 0.04, 0.5, BL);
    sh.ell(b, 0, 1.12, 1.88, 0.16, 0.16, 0.06, C.yellow, glow(0xffd040, 1.4));
    for (let i = 0; i < 3; i++) sh.cone(b, 0.18 + i * 0.12, 1.12 + (i - 1) * 0.06, 1.87, 0.05, 0.4, C.yellow, { rz: -PI / 2 + (i - 1) * 0.2, seg: 6 });
    sh.tube(b, [0.6, 1.3, 1.6], [0.6, 1.9, 1.62], 0.04, C.dkgray);
    sh.box(b, 0.6, 1.98, 1.62, 0.22, 0.16, 0.3, BK);
    sh.cylZ(b, 0.6, 1.98, 1.8, 0.06, 0.1, C.azure, { seg: 8 });
    // seat tub
    for (const sd of [-1, 1]) sh.box(b, sd * 0.72, 1.12, -0.2, 0.14, 0.4, 1.3, W);
    sh.box(b, 0, 1.3, -0.88, 1.3, 0.8, 0.14, BL);
    sh.box(b, 0, 1.0, -0.2, 1.3, 0.1, 1.2, C.dkgray);
    // twin booster rockets on the back
    for (const sd of [-1, 1]) {
      sh.cylZ(b, sd * 0.62, 1.25, -1.55, 0.26, 1.2, W, { seg: 14 });
      sh.cylZ(b, sd * 0.62, 1.25, -1.3, 0.27, 0.12, BL, { seg: 14 });
      sh.cone(b, sd * 0.62, 1.25, -0.8, 0.26, 0.4, BL, { rx: PI / 2, seg: 14 });
      sh.cone(b, sd * 0.62, 1.25, -2.22, 0.2, 0.26, BK, { rx: PI / 2, seg: 12 });
      for (const a of [0, PI / 2, PI, -PI / 2]) sh.box(b, sd * 0.62 + cos(a) * 0.3, 1.25 + sin(a) * 0.3, -2.0, 0.04 + Math.abs(cos(a)) * 0.12, 0.04 + Math.abs(sin(a)) * 0.12, 0.35, BL);
    }
    // whip antenna with a pennant, mission flag
    sh.tube(b, [0.85, 1.0, -1.95], [0.95, 3.0, -2.05], 0.02, BK, { seg: 4 });
    sh.ell(b, 0.95, 3.02, -2.05, 0.06, 0.06, 0.06, C.red, glow(0xff3020, 1.5));
    sh.box(b, 0.93, 2.7, -2.25, 0.02, 0.3, 0.4, BL);
    sh.box(b, 0.92, 2.72, -2.2, 0.025, 0.08, 0.08, W);
    const mesh = b.build({ name: 'ava' });

    // the big high-gain dish on a mast (it scans side to side)
    const dish = new THREE.Group(); dish.position.set(-0.72, 2.3, -1.75);
    const db = new BrickBuilder(0.4);
    const dishMat = sh.own(W, { metal: 0.2, rough: 0.4 }); dishMat.side = THREE.DoubleSide;
    sh.dome(db, 0, 0, 0, 0.72, 0.24, 0.72, W, { mat: dishMat, rx: -PI / 2 - 0.45, frac: 0.5, seg: 18 });
    sh.tube(db, [0, 0, 0], [0, 0.32, 0.6], 0.025, C.dkgray, { seg: 4 });
    sh.ell(db, 0, 0.32, 0.6, 0.07, 0.07, 0.07, BL);
    dish.add(db.build({ name: 'dish' }));
    const mast = sh.part('mast', -0.72, 0, -1.75, (pb) => {
      sh.tube(pb, [0, 0.9, 0], [0, 2.3, 0], 0.05, C.dkgray);
      sh.cylY(pb, 0, 2.3, 0, 0.1, 0.12, BL, { seg: 10 });
    });
    // six wheels on bobbing bogies
    const wheels = [];
    const bogies = [];
    let i = 0;
    for (const sd of [-1, 1]) for (const z of [-1.65, 0, 1.65]) {
      const g = new THREE.Group(); g.position.set(sd * 1.3, 0.42, z);
      const spin = new THREE.Mesh(wheelGeo(0.42, 0.34, BL, [0]), wheelMat); g.add(spin);
      const fb = new BrickBuilder(0.4);
      sh.box(fb, 0, 0.32, 0, 0.1, 0.5, 0.12, C.ltgray);
      sh.box(fb, 0, 0.08, 0, 0.42, 0.08, 0.14, C.dkgray);
      g.add(fb.build({ name: 'strut' }));
      wheels.push({ g, spin, front: z > 0, r: 0.42 });
      bogies.push({ g, ph: i++ * 1.7 });
    }
    return {
      mesh, seat: [0, 1.0, -0.2], control: 'yoke', parts: [dish, mast], wheels,
      exhaust: [[0.62, 1.25, -2.36], [-0.62, 1.25, -2.36]],
      fx(s, dt) {
        dish.rotation.y = sin(s.t * 0.8) * 1.2;
        dish.rotation.x = sin(s.t * 1.3) * 0.12;
        const amp = 0.025 + s.speed01 * 0.06;
        for (const w of bogies) w.g.position.y = 0.42 + sin(s.t * 6 + w.ph) * amp;
        // low gravity: the body floats and settles slowly
        const up = mesh.parent;
        if (up) { up.position.y = sin(s.t * 2.2) * 0.045 + (s.grounded ? 0 : 0.12); up.rotation.z = s.steer * 0.06 + sin(s.t * 1.7) * 0.02; }
      },
    };
  },
};

// ---- Cap'n Redbeard: a paddle-wheel pirate ship whose sail unfurls on boost -----------------
export const redbeard = {
  id: 'redbeard', name: 'Plank Plunderer', form: 'Pirate paddle-ship', blurb: 'Rolls like the high seas',
  stats: { speed: 4, accel: 2, handling: 2, weight: 4 },
  colors: [0x7c503a, 0x720e0f, 0xf2e8d0, 0x1b2a34],
  build(K) {
    const { THREE, BrickBuilder, C } = K;
    const sh = kit(K);
    const BR = C.rbrown, DK = C.dkred, DB = C.brown, BK = C.black, GD = C.pearl, CR = 0xf2e8d0;
    const b = new BrickBuilder(0.4);
    // hull, planks, keel and bow
    sh.box(b, 0, 0.88, -0.25, 1.7, 0.8, 3.3, BR);
    for (const sd of [-1, 1]) for (const y of [0.62, 0.84, 1.06]) sh.box(b, sd * 0.86, y, -0.25, 0.02, 0.04, 3.3, DB);
    sh.box(b, 0, 0.45, -0.1, 0.9, 0.18, 3.6, DB);
    sh.box(b, 0, 0.88, 1.35, 1.2, 0.8, 1.2, BR, { ry: PI / 4 });
    sh.box(b, 0, 1.3, 1.35, 1.24, 0.08, 1.24, GD, { ry: PI / 4 });
    sh.tube(b, [0, 1.2, 2.0], [0, 1.65, 2.68], 0.06, DB);
    sh.ell(b, 0, 1.0, 2.2, 0.16, 0.18, 0.14, GD, { m: CHROME });                   // gold skull figurehead
    for (const sd of [-1, 1]) sh.box(b, sd * 0.06, 1.03, 2.32, 0.06, 0.06, 0.04, BK);
    // gunwale rails and deck
    for (const sd of [-1, 1]) sh.box(b, sd * 0.86, 1.36, -0.25, 0.12, 0.22, 3.2, DK);
    sh.box(b, 0, 1.28, -0.25, 1.62, 0.02, 3.2, C.tan);
    // stern castle with lit windows and lanterns
    sh.box(b, 0, 1.62, -2.0, 1.8, 0.75, 0.9, BR);
    sh.box(b, 0, 2.02, -2.0, 1.86, 0.08, 0.96, GD);
    for (let i = -1; i <= 1; i++) sh.box(b, i * 0.5, 1.62, -2.46, 0.3, 0.32, 0.03, C.yellow, glow(0xffb030, 1.2));
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.9, 2.18, -2.4, 0.16, 0.24, 0.16, C.yellow, glow(0xffc040, 1.6));
      sh.box(b, sd * 0.9, 2.32, -2.4, 0.2, 0.05, 0.2, BK);
    }
    // cannons poking out of the gun ports
    for (const sd of [-1, 1]) for (const z of [0.85, -1.35]) {
      sh.box(b, sd * 0.86, 0.95, z, 0.04, 0.32, 0.36, BK);
      sh.cylX(b, sd * 1.0, 0.95, z, 0.1, 0.4, BK, { seg: 10 });
      sh.cylX(b, sd * 1.19, 0.95, z, 0.13, 0.06, BK, { seg: 10 });
    }
    // paddle-wheel housings
    for (const sd of [-1, 1]) {
      sh.arc(b, sd * 1.36, 0.82, -0.35, 0.95, 0.15, PI - 0.15, 8, 0.44, 0.08, DK);
      sh.box(b, sd * 1.13, 0.82, -0.35, 0.04, 0.6, 1.0, GD);
    }
    const mesh = b.build({ name: 'redbeard' });

    // paddle wheels (the real wheels) + little rollers under bow and stern
    const paddle = (sd) => {
      const g = new THREE.Group(); g.position.set(sd * 1.36, 0.82, -0.35);
      const pb = new BrickBuilder(0.4);
      for (const x of [-0.17, 0.17]) sh.tor(pb, x, 0, 0, 0.62, 0.06, DK, { ry: PI / 2, seg: 18 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2;
        sh.box(pb, 0, sin(a) * 0.55, cos(a) * 0.55, 0.42, 0.06, 0.52, DB, { rx: -a });
        sh.box(pb, 0, sin(a) * 0.62, cos(a) * 0.62, 0.4, 0.36, 0.05, BR, { rx: -a });
      }
      sh.cylX(pb, 0, 0, 0, 0.14, 0.46, GD, { seg: 10 });
      const spin = new THREE.Group(); spin.add(pb.build({ name: 'paddle' })); g.add(spin);
      return { g, spin, front: false, r: 0.82 };
    };
    // the mast, furled sail (unfurls when boosting or gliding) and the Jolly Roger
    const rigG = sh.part('mast', 0, 0, -1.15, (pb) => {
      sh.tube(pb, [0, 1.3, 0], [0, 4.0, 0], 0.08, DB);
      sh.tube(pb, [-1.15, 3.35, 0.05], [1.15, 3.35, 0.05], 0.05, DB);
      sh.cylY(pb, 0, 3.72, 0, 0.26, 0.2, BR, { seg: 12 });
      sh.tube(pb, [0, 1.6, 0.05], [0, 1.6, 2.0], 0.015, CR, { seg: 4 });
    });
    const sail = new THREE.Group(); sail.position.set(0, 3.32, -1.08);
    const sb = new BrickBuilder(0.4);
    for (let k = 0; k < 4; k++) {
      const bul = sin((k + 0.5) / 4 * PI) * 0.22;
      sh.box(sb, 0, -0.2 - k * 0.38, 0.04 + bul, 2.05 - k * 0.08, 0.4, 0.04, CR, { rx: k < 2 ? -0.25 : 0.25 });
    }
    sh.box(sb, 0, -0.62, 0.32, 0.8, 0.07, 0.02, DK); sh.box(sb, 0, -0.9, 0.3, 0.8, 0.07, 0.02, DK);
    sh.ell(sb, 0, -0.76, 0.3, 0.2, 0.2, 0.03, BK);
    sail.add(sb.build({ name: 'sail' }));
    const flag = sh.part('jolly', 0, 4.0, -1.15, (pb) => {
      sh.box(pb, 0, 0.16, -0.32, 0.03, 0.34, 0.6, BK);
      sh.ell(pb, 0.02, 0.2, -0.3, 0.01, 0.08, 0.07, C.white);
      sh.box(pb, 0.02, 0.06, -0.3, 0.01, 0.04, 0.22, C.white, { rx: 0.7 }); sh.box(pb, 0.02, 0.06, -0.3, 0.01, 0.04, 0.22, C.white, { rx: -0.7 });
    });
    // cannon smoke puffs (boost)
    const puffs = sh.part('puffs', 0, 0.95, 0, (pb) => {
      for (const sd of [-1, 1]) for (const z of [0.85, -1.35]) sh.ell(pb, sd * 1.45, 0, z, 0.22, 0.2, 0.22, 0xe6e6e6, { seg: 8 });
    });
    puffs.visible = false;
    const pw = [paddle(1), paddle(-1)];
    const rollers = [{ x: 0, z: 1.55, r: 0.28, w: 0.3, xs: [0.45, -0.45], front: true, cap: GD }, { x: 0, z: -2.05, r: 0.3, w: 0.3, xs: [0.5, -0.5], cap: GD }];
    let furl = 0.15, heel = 0;
    return {
      mesh, seat: [0, 1.35, -0.35], control: 'wheel', parts: [rigG, sail, flag, puffs],
      wheels: [...pw, ...rollers],
      exhaust: [[0.5, 1.15, -2.5], [-0.5, 1.15, -2.5]],
      fx(s, dt) {
        furl += ((s.boosting || s.gliding ? 1 : 0.14) - furl) * ease(dt, 5);
        sail.scale.set(1, furl, 0.4 + furl * (0.8 + sin(s.t * 7) * 0.12));
        flag.rotation.y = sin(s.t * 8) * 0.25 - 0.1 * s.speed01;
        flag.scale.z = 0.9 + sin(s.t * 13) * 0.1;
        const c = (s.t * 2.2) % 1;
        puffs.visible = s.boosting && c < 0.5;
        puffs.scale.setScalar(0.6 + c * 2.5);
        // the ship rolls on its "waves" and heels away from the turn
        heel += (-s.steer * 0.1 - heel) * ease(dt, 3);
        const up = mesh.parent;
        if (up) { up.rotation.z = heel + sin(s.t * 1.8) * 0.05; pitchAbout(up, sin(s.t * 1.3) * 0.035, 0.8, -0.35); }
      },
    };
  },
};

// ---- Sir Kara: a castle tower on rolling logs with a swinging battering ram ----------------
export const kara = {
  id: 'kara', name: 'Iron Bastion', form: 'Siege tower', blurb: 'A castle that rolls on logs',
  stats: { speed: 4, accel: 1, handling: 2, weight: 5 },
  colors: [0xa0a5a9, 0x0055bf, 0x7c503a, 0x6c6e68],
  build(K) {
    const { THREE, BrickBuilder, C, rig } = K;
    const sh = kit(K);
    const ST = C.ltgray, SD = 0x8a8f93, DS = C.dkstone, BL = C.blue, WD = C.rbrown, DW = C.brown, BK = C.black;
    const hw = Math.min(1.2, Math.max(0.85, (rig.width || 1.3) / 2 + 0.05));   // inner half width
    const b = new BrickBuilder(0.4);
    // timber platform over the logs
    sh.box(b, 0, 0.92, -0.25, hw * 2 + 0.5, 0.16, 3.6, DW);
    for (const sd of [-1, 1]) sh.box(b, sd * (hw + 0.3), 0.8, -0.25, 0.14, 0.24, 3.6, WD);
    // stone tower: solid base, walls, crenellations
    const X = hw + 0.18, Z0 = -1.55, Z1 = 1.0, ZC = (Z0 + Z1) / 2, L = Z1 - Z0;
    sh.box(b, 0, 1.3, ZC, X * 2, 0.6, L, ST);
    for (const sd of [-1, 1]) sh.box(b, sd * (hw + 0.09), 1.85, ZC, 0.18, 0.5, L, ST);
    sh.box(b, 0, 1.85, Z0 + 0.09, X * 2, 0.5, 0.18, ST);
    sh.box(b, 0, 1.78, Z1 - 0.09, X * 2, 0.36, 0.18, ST);
    for (let i = 0; i < 5; i++) {
      const z = Z0 + 0.25 + i * (L - 0.5) / 4;
      for (const sd of [-1, 1]) sh.box(b, sd * (hw + 0.09), 2.24, z, 0.22, 0.28, 0.3, ST);
    }
    for (let i = -1; i <= 1; i++) { sh.box(b, i * hw * 0.7, 2.24, Z0 + 0.09, 0.3, 0.28, 0.22, ST); sh.box(b, i * hw * 0.7, 2.08, Z1 - 0.09, 0.3, 0.28, 0.22, ST); }
    // stone block texture and arrow slits
    let k = 0;
    for (const sd of [-1, 1]) for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if ((r + c + k++) % 3 === 0) continue;
      sh.box(b, sd * (X + 0.005), 1.1 + r * 0.24, Z0 + 0.35 + c * 0.62 + (r % 2) * 0.3, 0.02, 0.2, 0.55, (r + c) % 2 ? SD : DS);
    }
    for (const sd of [-1, 1]) for (const z of [-0.9, 0.25]) sh.box(b, sd * (X + 0.02), 1.65, z, 0.02, 0.4, 0.07, BK);
    // corner turrets; the back pair wear tall blue roofs
    for (const sd of [-1, 1]) {
      sh.cylY(b, sd * (X + 0.05), 1.75, Z1, 0.27, 1.3, ST, { seg: 12 });
      for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2 + 0.4; sh.box(b, sd * (X + 0.05) + cos(a) * 0.22, 2.48, Z1 + sin(a) * 0.22, 0.14, 0.18, 0.14, ST); }
      sh.cylY(b, sd * (X + 0.05), 1.95, Z0, 0.3, 1.7, ST, { seg: 12 });
      sh.cylY(b, sd * (X + 0.05), 2.84, Z0, 0.36, 0.08, DS, { seg: 12 });
      sh.cone(b, sd * (X + 0.05), 3.28, Z0, 0.38, 0.8, BL, { seg: 12 });
      sh.tube(b, [sd * (X + 0.05), 3.6, Z0], [sd * (X + 0.05), 4.0, Z0], 0.025, BK, { seg: 4 });
    }
    // gate, drawbridge chains and the crest
    sh.box(b, 0, 1.25, Z1 + 0.01, 0.8, 0.8, 0.04, DW);
    sh.arcXY(b, 0, 1.25, Z1 + 0.02, 0.42, 0.1, PI - 0.1, 6, 0.06, 0.1, DS);
    for (let i = -1; i <= 1; i++) sh.box(b, i * 0.24, 1.25, Z1 + 0.035, 0.05, 0.75, 0.02, BK);
    for (const sd of [-1, 1]) sh.tube(b, [sd * 0.38, 1.0, Z1 + 0.05], [sd * 0.5, 1.95, Z1 + 0.05], 0.025, C.dkgray, { seg: 4 });
    sh.box(b, 0, 2.1, Z1 + 0.02, 0.36, 0.42, 0.04, BL);
    sh.box(b, 0, 2.12, Z1 + 0.045, 0.08, 0.32, 0.02, C.yellow); sh.box(b, 0, 2.18, Z1 + 0.045, 0.26, 0.07, 0.02, C.yellow);
    // ram frame
    for (const sd of [-1, 1]) sh.tube(b, [sd * 0.5, 0.95, 1.55], [sd * 0.5, 1.98, 1.55], 0.07, WD);
    sh.tube(b, [-0.55, 1.98, 1.55], [0.55, 1.98, 1.55], 0.07, WD);
    for (const sd of [-1, 1]) sh.tube(b, [sd * 0.5, 1.9, 1.55], [sd * 0.5, 1.6, Z1], 0.05, WD);
    // siege ladder up the back
    for (const sd of [-1, 1]) sh.box(b, sd * 0.35, 1.55, Z0 - 0.06, 0.07, 1.3, 0.07, WD);
    for (let i = 0; i < 5; i++) sh.box(b, 0, 1.0 + i * 0.25, Z0 - 0.06, 0.7, 0.05, 0.05, WD);
    const mesh = b.build({ name: 'kara' });

    // log rollers are the wheels
    const log = (z) => {
      const g = new THREE.Group(); g.position.set(0, 0.42, z);
      const lb = new BrickBuilder(0.4);
      const len = hw * 2 + 0.6;
      sh.cylX(lb, 0, 0, 0, 0.42, len, WD, { seg: 12 });
      for (const sd of [-1, 1]) { sh.cylX(lb, sd * (len / 2 + 0.01), 0, 0, 0.36, 0.02, C.tan, { seg: 12 }); sh.tor(lb, sd * (len / 2 + 0.02), 0, 0, 0.2, 0.12, DW, { ry: PI / 2, seg: 12 }); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; sh.box(lb, (i % 2 ? 0.3 : -0.3), sin(a) * 0.42, cos(a) * 0.42, len * 0.55, 0.05, 0.08, DW, { rx: -a }); }
      const spin = new THREE.Group(); spin.add(lb.build({ name: 'log' })); g.add(spin);
      return { g, spin, front: false, r: 0.42 };
    };
    // the battering ram swings from its frame
    const ram = new THREE.Group(); ram.position.set(0, 1.95, 1.55);
    const rb = new BrickBuilder(0.4);
    for (const z of [-0.35, 0.35]) for (const sd of [-1, 1]) sh.tube(rb, [sd * 0.45, 0, 0], [sd * 0.08, -0.55, z], 0.02, C.tan, { seg: 4 });
    sh.cylZ(rb, 0, -0.62, 0.15, 0.18, 1.75, WD, { seg: 10 });
    for (const z of [-0.45, 0.45]) sh.cylZ(rb, 0, -0.62, z, 0.2, 0.08, C.dkgray, { seg: 10 });
    sh.box(rb, 0, -0.62, 1.12, 0.42, 0.42, 0.3, C.dkgray, { m: CHROME });
    for (const sd of [-1, 1]) sh.tor(rb, sd * 0.2, -0.56, 1.08, 0.16, 0.3, C.dkgray, { ry: PI / 2, seg: 10, arc: PI * 1.5 });
    sh.box(rb, 0, -0.5, 1.28, 0.3, 0.1, 0.03, BK);
    ram.add(rb.build({ name: 'ram' }));
    // pennants on the roofs
    const flags = [-1, 1].map((sd) => sh.part('pennant', sd * (X + 0.05), 3.82, Z0, (pb) => {
      sh.box(pb, 0, 0, -0.3, 0.03, 0.26, 0.6, BL);
      sh.cone(pb, 0, 0, -0.7, 0.13, 0.24, BL, { rx: -PI / 2, seg: 3, r2: 0.02 });
      sh.box(pb, 0.02, 0, -0.3, 0.02, 0.06, 0.6, C.yellow);
    }));
    let swing = 0, sv = 0, lean = 0;
    return {
      mesh, seat: [0, 1.62, -0.3], control: 'bars', parts: [ram, ...flags],
      wheels: [log(-1.45), log(0), log(1.45)],
      exhaust: [[0.45, 1.65, -1.62], [-0.45, 1.65, -1.62]],
      fx(s, dt) {
        // pendulum ram: driven by speed, thumps forward when boosting
        const drive = s.boosting ? -sin(s.t * 9) * 26 : -sin(s.t * 3.2) * 4 * (0.3 + s.speed01);
        sv += (drive - swing * 30 - sv * 2.5) * dt;
        swing += sv * dt;
        ram.rotation.x = Math.max(-0.6, Math.min(0.5, swing));
        for (let i = 0; i < 2; i++) { flags[i].rotation.y = sin(s.t * 9 + i) * 0.3; flags[i].scale.z = 0.85 + s.speed01 * 0.25 + sin(s.t * 14 + i) * 0.08; }
        lean += (-s.steer * 0.06 - lean) * ease(dt, 2);
        const up = mesh.parent;
        if (up) { up.rotation.z = lean; up.position.y = Math.abs(sin(s.t * 6.5 * (0.4 + s.speed01))) * 0.04 * s.speed01; }
      },
    };
  },
};

// ---- Robo-Rex: a jet-turbine dragster with a robot face and a sweeping scanner eye ----------
export const rex = {
  id: 'rex', name: 'Turbo Titan', form: 'Jet dragster', blurb: 'All turbine, no brakes',
  stats: { speed: 5, accel: 2, handling: 1, weight: 4 },
  colors: [0x6c6e68, 0xbbe90b, 0x1b2a34, 0xa0a5a9],
  build(K) {
    const { THREE, BrickBuilder, C, wheelGeo, wheelMat } = K;
    const sh = kit(K);
    const DG = C.dkgray, LI = C.lime, BK = C.black, LG = C.ltgray;
    const RZ = -1.55, RR = 0.8, TY = 1.8, TZ = -1.72;
    const b = new BrickBuilder(0.4);
    // long fuselage and robot-head nose
    sh.box(b, 0, 0.62, 0.35, 0.95, 0.5, 3.2, DG);
    sh.ell(b, 0, 0.62, 1.95, 0.5, 0.3, 0.72, DG, { seg: 16 });
    sh.box(b, 0, 0.7, 2.3, 0.82, 0.16, 0.36, BK, { rx: -0.3 });
    sh.box(b, 0, 0.73, 2.4, 0.66, 0.06, 0.12, LI, glow(0x9cff20, 1.4));
    for (let i = -2; i <= 2; i++) sh.box(b, i * 0.1, 0.48, 2.44, 0.05, 0.14, 0.12, LG, { m: CHROME });
    for (const sd of [-1, 1]) { sh.cylX(b, sd * 0.47, 0.72, 2.0, 0.1, 0.08, LI, { seg: 8 }); sh.tube(b, [sd * 0.4, 0.85, 1.9], [sd * 0.55, 1.3, 1.7], 0.025, BK, { seg: 4 }); sh.ell(b, sd * 0.55, 1.32, 1.7, 0.05, 0.05, 0.05, LI, glow(0x9cff20, 1.6)); }
    // front wing
    sh.box(b, 0, 0.26, 2.42, 2.0, 0.06, 0.4, LI);
    for (const sd of [-1, 1]) sh.box(b, sd * 1.0, 0.36, 2.42, 0.05, 0.3, 0.5, BK);
    // side pods / cockpit walls with stripes
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.7, 0.72, -0.45, 0.42, 0.62, 1.9, DG);
      sh.box(b, sd * 0.92, 0.82, -0.45, 0.02, 0.1, 1.9, LI);
      sh.box(b, sd * 0.92, 0.62, -0.45, 0.02, 0.05, 1.9, LI);
      sh.cylZ(b, sd * 0.7, 0.75, 0.55, 0.2, 0.08, BK, { seg: 12 });
    }
    sh.box(b, 0, 0.98, 0.55, 1.0, 0.14, 0.2, C.azure, { rx: -0.6, m: { trans: true, opacity: 0.45 } });
    sh.box(b, 0, 0.95, -1.1, 1.3, 0.75, 0.16, BK);
    // turbine on its pylon
    sh.box(b, 0, 1.2, TZ + 0.2, 0.5, 0.6, 0.9, DG);
    sh.cylZ(b, 0, TY, TZ, 0.64, 1.45, LG, { seg: 20, m: CHROME });
    sh.tor(b, 0, TY, TZ + 0.74, 0.62, 0.12, DG, { seg: 20 });
    for (const z of [TZ + 0.35, TZ - 0.3]) sh.cylZ(b, 0, TY, z, 0.655, 0.1, LI, { seg: 20 });
    sh.cylZ(b, 0, TY, TZ - 0.78, 0.52, 0.14, BK, { seg: 20 });
    sh.ell(b, 0, TY, TZ + 0.78, 0.2, 0.2, 0.12, BK, { seg: 10 });
    // rear axle, struts
    sh.cylX(b, 0, RR, RZ, 0.1, 2.3, BK, { seg: 8 });
    for (const sd of [-1, 1]) sh.box(b, sd * 1.3, RR + 0.62, RZ, 0.82, 0.08, 1.05, LI);
    const mesh = b.build({ name: 'rex' });

    // afterburner glow and turbine blades
    const burnMat = sh.own(0xff8020, { emissive: 0xff5a00, ei: 1 });
    const fan = sh.part('fan', 0, TY, TZ - 0.76, (pb) => {
      for (let i = 0; i < 9; i++) { const a = (i / 9) * PI * 2; sh.box(pb, cos(a) * 0.26, sin(a) * 0.26, 0, 0.42, 0.1, 0.04, LG, { rz: a + 0.5, m: CHROME }); }
      sh.cone(pb, 0, 0, -0.1, 0.14, 0.2, DG, { rx: -PI / 2, seg: 10 });
    });
    const burner = sh.part('burner', 0, TY, TZ - 0.8, (pb) => sh.tor(pb, 0, 0, 0, 0.47, 0.12, 0, { mat: burnMat, seg: 20 }));
    // scanner eye sweeping across the visor
    const eye = sh.part('scanner', 0, 0.73, 2.47, (pb) => sh.box(pb, 0, 0, 0, 0.14, 0.07, 0.04, C.red, glow(0xff1010, 3)));
    // little front wheels ride with the body (so wheelies lift them)
    const fronts = [1, -1].map((sd) => {
      const g = new THREE.Group(); g.position.set(sd * 0.92, 0.3, 1.95);
      const m = new THREE.Mesh(wheelGeo(0.3, 0.22, LI, [0]), wheelMat); g.add(m);
      return { g, m, sd };
    });
    const struts = sh.part('struts', 0, 0, 0, (pb) => { for (const sd of [-1, 1]) sh.tube(pb, [sd * 0.4, 0.55, 1.9], [sd * 0.82, 0.3, 1.95], 0.05, LG, { m: CHROME }); });
    let pitch = 0;
    return {
      mesh, seat: [0, 0.78, -0.45], control: 'wheel', parts: [fan, burner, eye, struts, ...fronts.map((f) => f.g)],
      wheels: [{ x: 0, z: RZ, r: RR, w: 0.72, xs: [1.3, -1.3], cap: LI }, ...fronts.map((f) => ({ g: new THREE.Group(), spin: f.m, front: false, r: 0.3 }))],
      exhaust: [[0.22, TY, TZ - 0.85], [-0.22, TY, TZ - 0.85]],
      fx(s, dt) {
        fan.rotation.z += dt * (6 + s.speed01 * 30 + (s.boosting ? 30 : 0));
        burnMat.emissiveIntensity = 0.6 + s.speed01 * 1.2 + (s.boosting ? 2.5 : 0) + sin(s.t * 40) * 0.2;
        eye.position.x = sin(s.t * 3.4) * 0.26;
        for (const f of fronts) f.g.rotation.y = -s.steer * 0.4;
        pitch += ((s.boosting && s.grounded ? -0.24 : 0) - pitch) * ease(dt, 4);
        const up = mesh.parent;
        if (up) pitchAbout(up, pitch, 0, RZ, sin(s.t * 47) * 0.006 * (0.3 + s.speed01));
      },
    };
  },
};

// ---- Ninja Nix: a black arrowhead trike with a giant shuriken for a back wheel -------------
export const nix = {
  id: 'nix', name: 'Shadow Dart', form: 'Shuriken trike', blurb: 'One blade-wheel, no mercy',
  stats: { speed: 2, accel: 5, handling: 5, weight: 1 },
  colors: [0x1b2a34, 0x237841, 0xa0a5a9, 0xbbe90b],
  build(K) {
    const { THREE, BrickBuilder, C, wheelGeo, wheelMat } = K;
    const sh = kit(K);
    const BK = C.black, GR = C.green, LI = C.lime, STEEL = { metal: 0.9, rough: 0.18 };
    const RZ = -1.75, RR = 0.66;
    const b = new BrickBuilder(0.4);
    // arrowhead body: spine, swept side blades, pointed nose
    sh.box(b, 0, 0.5, 0.15, 0.8, 0.34, 3.2, BK);
    sh.box(b, 0, 0.5, 1.75, 0.62, 0.34, 0.62, BK, { ry: PI / 4 });
    sh.box(b, 0, 0.68, 0.9, 0.06, 0.04, 2.2, LI, glow(0x9cff20, 0.8));
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.72, 0.42, 0.25, 0.08, 0.16, 2.6, BK, { ry: sd * -0.3 });
      sh.box(b, sd * 0.76, 0.52, 0.2, 0.04, 0.04, 2.5, GR, { ry: sd * -0.3 });
      sh.box(b, sd * 0.6, 0.8, -0.5, 0.18, 0.62, 1.7, BK);
      sh.box(b, sd * 0.69, 0.95, -0.5, 0.02, 0.06, 1.7, GR);
      sh.tube(b, [sd * 0.3, 0.5, 1.5], [sd * 1.1, 0.34, 1.55], 0.05, C.dkgray);   // front axle arms
      sh.tube(b, [sd * 0.24, 0.55, -1.0], [sd * 0.24, RR, RZ], 0.07, BK);          // swing arms
      sh.box(b, sd * 0.24, RR, RZ, 0.08, 0.2, 0.2, GR);
    }
    sh.box(b, 0, 1.0, 0.45, 0.8, 0.3, 0.04, 0x183028, { rx: -0.9, m: { trans: true, opacity: 0.6 } });
    sh.box(b, 0, 0.92, -1.2, 0.95, 0.85, 0.12, BK);
    // crossed katanas strapped behind the seat
    for (const sd of [-1, 1]) {
      const a = [sd * -0.45, 0.85, -1.3], c = [sd * 0.55, 2.25, -1.32];
      sh.tube(b, a, [a[0] + (c[0] - a[0]) * 0.28, a[1] + (c[1] - a[1]) * 0.28, -1.31], 0.045, BK, { seg: 6 });
      sh.tube(b, [a[0] + (c[0] - a[0]) * 0.28, a[1] + (c[1] - a[1]) * 0.28, -1.31], c, 0.03, 0xd8dde0, { seg: 4, m: STEEL, r2: 0.012 });
      sh.box(b, a[0] + (c[0] - a[0]) * 0.28, a[1] + (c[1] - a[1]) * 0.28, -1.31, 0.18, 0.04, 0.12, C.pearl, { rz: sd * -0.62 });
    }
    sh.box(b, 0, 1.38, -1.28, 0.95, 0.07, 0.04, GR);
    const mesh = b.build({ name: 'nix' });

    // the back wheel: a tyre ring around a spinning steel shuriken
    const star = (pb, r, x = 0) => {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2;
        sh.cone(pb, x, cos(a) * r * 0.45, sin(a) * r * 0.45, 0.03, r * 0.95, 0xd8dde0, { rx: a - PI / 2 + PI, r2: r * 0.32, seg: 4, m: STEEL });
      }
      sh.cylX(pb, x, 0, 0, r * 0.18, 0.1, GR, { seg: 10 });
    };
    const rearG = new THREE.Group(); rearG.position.set(0, RR, RZ);
    const rearSpin = new THREE.Group(); rearG.add(rearSpin);
    const rb = new BrickBuilder(0.4);
    sh.tor(rb, 0, 0, 0, RR - 0.1, 0.16, BK, { ry: PI / 2, seg: 24, sz: (RR - 0.1) * 2.2 });
    sh.tor(rb, 0, 0, 0, RR - 0.21, 0.04, LI, { ry: PI / 2, seg: 24 });
    star(rb, RR - 0.18);
    rearSpin.add(rb.build({ name: 'shuriken' }));
    // front wheels with spinning shuriken hub caps
    const front = (sd) => {
      const g = new THREE.Group(); g.position.set(sd * 1.2, 0.34, 1.55);
      const spin = new THREE.Group(); g.add(spin);
      spin.add(new THREE.Mesh(wheelGeo(0.34, 0.28, BK, [0]), wheelMat));
      const cb = new BrickBuilder(0.4); star(cb, 0.3, sd * 0.16); spin.add(cb.build({ name: 'cap' }));
      return { g, spin, front: true, r: 0.34 };
    };
    // blade fins that flare out on turns and boost
    const fins = [-1, 1].map((sd) => sh.part('fin', sd * 0.6, 1.0, -0.9, (pb) => {
      sh.box(pb, sd * 0.2, 0.42, -0.62, 0.04, 0.9, 1.4, 0xd8dde0, { rx: 0.85, rz: sd * -0.25, m: STEEL });
      sh.box(pb, sd * 0.24, 0.62, -0.42, 0.05, 0.08, 1.4, GR, { rx: 0.85, rz: sd * -0.25 });
    }));
    // vanishing-smoke puffs on boost
    const smoke = sh.part('smoke', 0, 0.7, -2.6, (pb) => { for (let i = 0; i < 4; i++) sh.ell(pb, sin(i * 2.2) * 0.45, sin(i * 1.3) * 0.2, -i * 0.25, 0.3 - i * 0.04, 0.26, 0.3, 0x3a3f44, { seg: 8 }); });
    smoke.visible = false;
    let lean = 0;
    return {
      mesh, seat: [0, 0.78, -0.5], control: 'bars', parts: [...fins, smoke],
      wheels: [{ g: rearG, spin: rearSpin, front: false, r: RR }, front(1), front(-1)],
      exhaust: [[0.42, 0.62, -1.3], [-0.42, 0.62, -1.3]],
      fx(s, dt) {
        lean += (s.steer * 0.16 * Math.min(1, 0.3 + s.speed01) - lean) * ease(dt, 6);
        const up = mesh.parent;
        if (up) up.rotation.z = lean;
        for (let i = 0; i < 2; i++) {
          const sd = i ? 1 : -1;
          fins[i].rotation.z = sd * (0.1 + (s.boosting ? 0.45 : 0) + Math.max(0, sd * -s.steer) * 0.35);
          fins[i].rotation.y = -s.steer * 0.25;
        }
        const c = (s.t * 3) % 1;
        smoke.visible = s.boosting;
        smoke.scale.setScalar(0.6 + c);
        smoke.position.z = -2.4 - c * 0.6;
      },
    };
  },
};

// ---- Chief Flo: a six-wheel fire engine with flashing lights, a rising ladder and a hose ----
export const flo = {
  id: 'flo', name: 'Blaze Runner', form: 'Fire engine', blurb: 'Lights, ladder, water cannon',
  stats: { speed: 3, accel: 3, handling: 4, weight: 2 },
  colors: [0xc91a09, 0xf4f4f4, 0xa0a5a9, 0xf2cd37],
  build(K) {
    const { THREE, BrickBuilder, C } = K;
    const sh = kit(K);
    const RD = C.red, W = C.white, LG = C.ltgray, BK = C.black, GD = C.pearl;
    const b = new BrickBuilder(0.4);
    // chassis and front end
    sh.box(b, 0, 0.55, -0.1, 1.5, 0.24, 4.8, BK);
    sh.box(b, 0, 1.0, 1.9, 1.9, 0.7, 1.1, RD);
    sh.box(b, 0, 1.36, 1.9, 1.8, 0.04, 1.0, W);
    sh.box(b, 0, 0.95, 2.46, 1.3, 0.5, 0.04, LG, { m: CHROME });
    for (let i = -4; i <= 4; i++) sh.box(b, i * 0.13, 0.95, 2.49, 0.04, 0.46, 0.03, BK);
    sh.box(b, 0, 0.5, 2.5, 2.1, 0.22, 0.2, LG, { m: CHROME });
    for (const sd of [-1, 1]) {
      sh.cylZ(b, sd * 0.8, 1.05, 2.47, 0.13, 0.06, C.white, glow(0xfff2c0, 1.4));
      sh.box(b, sd * 0.95, 0.65, 1.72, 0.08, 0.12, 0.9, RD);   // front fender skirt
      sh.box(b, sd * 1.12, 0.95, 1.72, 0.5, 0.06, 1.0, RD);
    }
    // the bell on the hood
    sh.dome(b, 0.55, 1.38, 2.25, 0.16, 0.2, 0.16, GD, { m: CHROME, frac: 0.6, seg: 12 });
    // open cab: doors, windscreen, light bar
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.88, 1.05, 0.65, 0.16, 0.8, 1.4, RD);
      sh.box(b, sd * 0.965, 1.15, 0.65, 0.02, 0.12, 1.4, W);
      sh.ell(b, sd * 0.97, 0.88, 0.75, 0.01, 0.16, 0.16, GD);
      sh.tube(b, [sd * 0.85, 1.35, 1.4], [sd * 0.8, 2.1, 1.25], 0.05, RD);
    }
    sh.box(b, 0, 1.75, 1.33, 1.55, 0.7, 0.03, C.azure, { rx: -0.2, m: { trans: true, opacity: 0.35 } });
    sh.box(b, 0, 2.12, 1.25, 1.7, 0.08, 0.16, RD);
    sh.box(b, 0, 0.75, 0.65, 1.6, 0.12, 1.4, C.dkgray);
    sh.box(b, 0, 1.25, -0.1, 1.6, 1.2, 0.16, BK);
    // equipment body with roll-up lockers, hose reel and step
    sh.box(b, 0, 1.15, -1.35, 1.95, 1.0, 2.3, RD);
    sh.box(b, 0, 1.68, -1.35, 1.98, 0.06, 2.33, W);
    for (const sd of [-1, 1]) for (const z of [-0.75, -1.9]) {
      sh.box(b, sd * 0.985, 1.12, z, 0.02, 0.62, 0.9, LG);
      for (let i = 0; i < 5; i++) sh.box(b, sd * 0.995, 0.86 + i * 0.13, z, 0.01, 0.02, 0.88, C.dkgray);
    }
    sh.cylX(b, 0, 1.92, -0.6, 0.36, 1.2, C.dkgray, { seg: 14 });
    for (let i = 0; i < 4; i++) sh.cylX(b, -0.45 + i * 0.3, 1.92, -0.6, 0.38, 0.22, W, { seg: 14 });
    sh.box(b, 0, 0.62, -2.6, 1.6, 0.08, 0.2, LG, { m: CHROME });
    for (const sd of [-1, 1]) sh.box(b, sd * 0.75, 1.0, -2.51, 0.2, 0.3, 0.04, C.red, glow(0xff1010, 1.2));
    // exhaust stacks behind the cab
    for (const sd of [-1, 1]) sh.tube(b, [sd * 0.9, 1.5, -0.12], [sd * 0.9, 2.45, -0.12], 0.07, LG, { m: CHROME, seg: 10 });
    const mesh = b.build({ name: 'flo' });

    // flashing light bar (two own materials, swapped in fx)
    const redM = sh.own(C.red, { emissive: 0xff1010, ei: 2 }), bluM = sh.own(C.blue, { emissive: 0x2060ff, ei: 0.2 });
    const lights = sh.part('lightbar', 0, 2.28, 1.25, (pb) => {
      sh.box(pb, 0, -0.04, 0, 1.4, 0.06, 0.24, BK);
      for (const sd of [-1, 1]) { sh.box(pb, sd * 0.4, 0.06, 0, 0.5, 0.16, 0.22, 0, { mat: sd > 0 ? redM : bluM }); }
      sh.box(pb, 0, 0.06, 0, 0.26, 0.14, 0.2, W, glow(0xffffff, 0.6));
      for (const sd of [-1, 1]) sh.box(pb, sd * 0.75, -1.27, -3.74, 0.18, 0.18, 0.18, 0, { mat: sd > 0 ? bluM : redM });
    });
    // the ladder rises (and extends) on its turntable; water cannon sprays on boost
    const ladder = new THREE.Group(); ladder.position.set(0, 2.3, -2.3);
    const lb = new BrickBuilder(0.4);
    sh.box(lb, 0, -0.18, 0, 0.6, 0.3, 0.5, LG);
    for (const sd of [-1, 1]) sh.box(lb, sd * 0.32, 0, 1.0, 0.08, 0.14, 2.1, W);
    for (let i = 0; i < 8; i++) sh.box(lb, 0, 0, 0.1 + i * 0.27, 0.62, 0.05, 0.05, LG);
    ladder.add(lb.build({ name: 'ladder' }));
    const ext = new THREE.Group(); ladder.add(ext);
    const eb = new BrickBuilder(0.4);
    for (const sd of [-1, 1]) sh.box(eb, sd * 0.24, 0.1, 1.1, 0.07, 0.1, 1.9, RD);
    for (let i = 0; i < 7; i++) sh.box(eb, 0, 0.1, 0.3 + i * 0.27, 0.46, 0.04, 0.04, LG);
    sh.tube(eb, [0, 0.12, 2.0], [0, 0.3, 2.3], 0.07, GD, { m: CHROME });
    sh.cone(eb, 0, 0.32, 2.35, 0.1, 0.22, LG, { rx: PI / 2 - 0.5, seg: 8, m: CHROME });
    ext.add(eb.build({ name: 'ladderext' }));
    const spray = sh.part('spray', 0, 0.38, 2.45, (pb) => {
      sh.cone(pb, 0, 0.45, 0.8, 0.32, 1.9, 0x8fd8ff, { rx: PI / 2 - 0.45 + PI, seg: 10, m: { trans: true, opacity: 0.45, emissive: 0x2a7aff, emissiveIntensity: 0.4 } });
      for (let i = 0; i < 5; i++) sh.ell(pb, sin(i * 2.1) * 0.2, 0.4 + i * 0.32, 0.6 + i * 0.35, 0.09, 0.09, 0.09, 0xdff6ff, { seg: 6 });
    });
    ext.add(spray); spray.visible = false;
    let lift = 0, extn = 0;
    return {
      mesh, seat: [0, 1.0, 0.5], control: 'wheel', parts: [lights, ladder],
      wheels: [
        { x: 1.12, z: 1.75, r: 0.46, w: 0.36, front: true, cap: W }, { x: -1.12, z: 1.75, r: 0.46, w: 0.36, front: true, cap: W },
        { x: 0, z: -1.25, r: 0.46, w: 0.38, xs: [1.12, -1.12], cap: W }, { x: 0, z: -2.1, r: 0.46, w: 0.38, xs: [1.12, -1.12], cap: W },
      ],
      exhaust: [[0.9, 2.5, -0.12, 0], [-0.9, 2.5, -0.12, 0]],
      fx(s, dt) {
        const ph = (s.t * 5) % 2 < 1;
        redM.emissiveIntensity = ph ? 3 : 0.15; bluM.emissiveIntensity = ph ? 0.15 : 3;
        lift += ((s.boosting ? 0.75 : !s.grounded ? 0.45 : 0.05 + s.speed01 * 0.12) - lift) * ease(dt, 3);
        ladder.rotation.x = -lift;
        ladder.rotation.y = sin(s.t * 0.9) * 0.12 * lift;
        extn += ((s.boosting ? 1.5 : 0) - extn) * ease(dt, 4);
        ext.position.z = extn;
        spray.visible = s.boosting;
        if (s.boosting) spray.scale.set(1, 1, 0.85 + sin(s.t * 30) * 0.15);
      },
    };
  },
};

// ---- Wizard Wendel: a hovering broomstick with orbiting stars and a bubbling cauldron -------
export const wendel = {
  id: 'wendel', name: 'Spell Streak', form: 'Flying broom', blurb: 'Rides a trail of sparkles',
  stats: { speed: 3, accel: 4, handling: 3, weight: 2 },
  colors: [0x81007b, 0xe6c05a, 0x0a3463, 0xd9b35a],
  build(K) {
    const { THREE, BrickBuilder, C } = K;
    const sh = kit(K);
    const PU = C.purple, PE = C.pearl, DB = C.dkblue, WD = C.rbrown, STRAW = 0xd9b35a, ST2 = 0xb8902e;
    const b = new BrickBuilder(0.4);
    // the handle, curled at the tip
    sh.tube(b, [0, 0.5, -1.4], [0, 0.72, 2.2], 0.1, WD, { seg: 8 });
    sh.tor(b, 0, 0.98, 2.22, 0.26, 0.32, WD, { ry: PI / 2, seg: 12, arc: PI * 1.3, rx: 0 });
    for (const z of [0.4, 1.4]) sh.cylZ(b, 0, 0.5 + (z + 1.4) * 0.061, z, 0.12, 0.08, PE, { seg: 10 });
    // bristle bundle, bound in gold
    sh.cone(b, 0, 0.45, -2.0, 0.62, 1.4, STRAW, { rx: PI / 2, seg: 14 });
    sh.cone(b, 0, 0.45, -2.08, 0.5, 1.2, ST2, { rx: PI / 2, seg: 10, ry: 0.3 });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; sh.box(b, cos(a) * 0.42, 0.45 + sin(a) * 0.42, -2.55, 0.05, 0.05, 0.5, i % 2 ? STRAW : ST2, { rx: -sin(a) * 0.35, ry: cos(a) * 0.35 }); }
    sh.cylZ(b, 0, 0.47, -1.32, 0.2, 0.12, PE, { seg: 12 });
    sh.cylZ(b, 0, 0.47, -1.5, 0.27, 0.1, PU, { seg: 12 });
    // saddle and blanket that hides the legs
    sh.box(b, 0, 0.66, -0.45, 0.6, 0.14, 0.95, PU);
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.36, 0.42, -0.25, 0.06, 0.62, 1.4, DB);
      sh.box(b, sd * 0.38, 0.13, -0.25, 0.04, 0.06, 1.4, PE);
      for (let i = 0; i < 3; i++) sh.cone(b, sd * 0.38, 0.62 - i * 0.2, 0.2 - i * 0.4, 0.04, 0.09, C.yellow, { rz: sd * PI / 2, seg: 4, m: { emissive: 0xffd000, emissiveIntensity: 0.6 } });
      sh.box(b, sd * 0.42, 0.42, -1.05, 0.2, 0.32, 0.36, WD);               // saddlebags
    }
    sh.box(b, 0, 0.88, -0.98, 0.6, 0.38, 0.12, PU);
    // open spellbook on a lectern up front
    sh.tube(b, [0, 0.66, 1.25], [0, 0.95, 1.25], 0.04, WD, { seg: 6 });
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.2, 1.03, 1.25, 0.4, 0.04, 0.32, PU, { rz: sd * 0.25, rx: -0.4 });
      sh.box(b, sd * 0.19, 1.06, 1.25, 0.36, 0.03, 0.28, 0xf6ecd0, { rz: sd * 0.25, rx: -0.4 });
    }
    const mesh = b.build({ name: 'wendel' });

    // crystal lantern swinging from the curl
    const crystal = sh.own(C.lime, { emissive: 0xa040ff, ei: 1.5 });
    const lantern = sh.part('lantern', 0, 0.98, 2.48, (pb) => {
      sh.tube(pb, [0, 0, 0], [0, -0.32, 0], 0.015, C.black, { seg: 4 });
      sh.box(pb, 0, -0.36, 0, 0.18, 0.04, 0.18, PE);
      sh.cone(pb, 0, -0.5, 0, 0.1, 0.22, C.lavender, { rx: PI, seg: 6, mat: crystal });
      sh.cone(pb, 0, -0.5, 0, 0.1, 0.16, C.lavender, { seg: 6, mat: crystal });
    });
    crystal.color.set(0xcda4de);
    // cauldron hanging under the bristles
    const brew = sh.own(0x7cff40, { emissive: 0x40ff20, ei: 1.2 });
    const pot = sh.part('cauldron', 0, 0.3, -1.85, (pb) => {
      for (const sd of [-1, 1]) sh.tube(pb, [0, 0.05, 0], [sd * 0.24, -0.3, 0], 0.012, C.black, { seg: 4 });
      sh.ell(pb, 0, -0.48, 0, 0.3, 0.24, 0.3, C.black, { seg: 12 });
      sh.cylY(pb, 0, -0.3, 0, 0.25, 0.02, 0, { mat: brew, seg: 12 });
      sh.tor(pb, 0, -0.3, 0, 0.27, 0.12, C.black, { rx: PI / 2, seg: 14 });
      for (let i = 0; i < 3; i++) sh.ell(pb, sin(i * 2.4) * 0.12, -0.25, cos(i * 2.4) * 0.12, 0.06, 0.06, 0.06, 0, { mat: brew, seg: 6 });
    });
    // stars orbiting the rider
    const starMat = { m: { emissive: 0xffd040, emissiveIntensity: 2 } };
    const stars = sh.part('stars', 0, 1.5, -0.3, (pb) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * PI * 2, r = 1.25 + (i % 2) * 0.3, y = sin(i * 1.9) * 0.45;
        sh.box(pb, cos(a) * r, y, sin(a) * r, 0.16, 0.16, 0.16, C.yellow, { ...starMat, rx: 0.6, ry: 0.6 + i, rz: 0.2 });
        sh.box(pb, cos(a) * r, y, sin(a) * r, 0.2, 0.06, 0.06, C.yellow, { ...starMat, ry: i });
      }
    });
    // sparkle trail behind the bristles (fixed pieces, positions cycled each frame)
    const trail = new THREE.Group(); trail.position.set(0, 0.45, -2.9);
    const sparks = [];
    const sgeo = new THREE.OctahedronGeometry(0.09);
    const smat = sh.own(0xffe9a0, { emissive: 0xffc040, ei: 2.2 });
    const NS = 8;
    for (let i = 0; i < NS; i++) {
      const m = new THREE.Mesh(sgeo, i % 2 ? smat : crystal); trail.add(m);
      sparks.push({ m, ph: i / NS, x: sin(i * 2.7) * 0.45, y: cos(i * 1.9) * 0.35 });
    }
    // two shared materials -> the instanced look without per-frame allocation
    let lean = 0, pitch = 0;
    return {
      mesh, seat: [0, 0.8, -0.45], control: 'bars', hover: 0.6, parts: [lantern, pot, stars, trail],
      exhaust: [[0.22, 0.45, -2.75], [-0.22, 0.45, -2.75]],
      glider: { z: -0.6 },
      fx(s, dt) {
        stars.rotation.y += dt * (1.2 + s.speed01 * 2 + (s.boosting ? 4 : 0));
        lantern.rotation.x = sin(s.t * 3.1) * 0.25 + s.speed01 * 0.35;
        lantern.rotation.z = s.steer * 0.4;
        crystal.emissiveIntensity = 1.2 + sin(s.t * 5) * 0.6;
        pot.rotation.x = s.speed01 * 0.4 + sin(s.t * 2.3) * 0.12;
        const rate = 0.6 + s.speed01 * 1.4 + (s.boosting ? 2 : 0);
        for (const p of sparks) {
          p.ph = (p.ph + dt * rate) % 1;
          p.m.position.set(p.x * (0.4 + p.ph), p.y * (0.4 + p.ph) + sin(s.t * 6 + p.x * 9) * 0.08, -p.ph * 1.6);
          p.m.scale.setScalar(Math.max(0.05, (1 - p.ph) * 1.4));
          p.m.rotation.y += dt * 4;
        }
        lean += (s.steer * 0.28 - lean) * ease(dt, 5);
        pitch += ((s.boosting ? 0.1 : s.gliding ? -0.12 : 0) - pitch) * ease(dt, 4);
        const up = mesh.parent;
        if (up) { up.rotation.z = lean; up.rotation.x = pitch + sin(s.t * 2.1) * 0.03; }
      },
    };
  },
};
