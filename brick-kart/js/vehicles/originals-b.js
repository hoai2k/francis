// Original Karts, second half: the chef, the cowgirl, the viking, the queen, the skater,
// the alien, the mummy and the dino fan (see ../characters.js buildVehicle).
import { kit, ease, pitchAbout } from './originals-kit.js';

const PI = Math.PI, sin = Math.sin, cos = Math.cos;
const glow = (e) => ({ lit: e });

// ---- Chef Pepper: riding inside a giant wok on a stove cart, tossing a stir-fry -----------
export const pepper = {
  id: 'pepper', name: 'Hot Wok', form: 'Wok on a stove cart', blurb: 'Stir-fries at full flame',
  stats: { speed: 2, accel: 5, handling: 4, weight: 1 },
  colors: [0xfe8a18, 0xf4f4f4, 0x1b2a34, 0xc91a09],
  build(K) {
    const { THREE, BrickBuilder, C, wheelGeo, wheelMat, rig } = K;
    const sh = kit(K);
    const OR = C.orange, W = C.white, LG = C.ltgray, BK = C.black, RD = C.red;
    const WY = 1.95, WR = Math.min(1.45, Math.max(1.2, (rig.width || 1.3) / 2 + 0.55)), WD = 0.8;
    const b = new BrickBuilder(0.4);
    // steel stove cart with orange doors and a bumper
    sh.box(b, 0, 0.82, 0.05, 1.75, 0.62, 2.7, LG, { metal: 1 });
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.88, 0.82, 0.05, 0.02, 0.5, 2.5, OR);
      for (const z of [-0.6, 0.65]) { sh.box(b, sd * 0.895, 0.82, z, 0.02, 0.34, 1.0, W); sh.box(b, sd * 0.905, 0.82, z + 0.38, 0.03, 0.06, 0.06, BK); }
      sh.tube(b, [sd * 0.7, 0.51, 1.0], [sd * 0.7, 0.3, 1.0], 0.05, LG);
      sh.tube(b, [sd * 0.7, 0.51, -0.9], [sd * 0.7, 0.3, -0.9], 0.05, LG);
    }
    sh.box(b, 0, 0.66, 1.45, 1.9, 0.2, 0.14, RD);
    sh.box(b, 0, 0.66, -1.35, 1.9, 0.2, 0.14, RD);
    for (const sd of [-1, 1]) sh.cylZ(b, sd * 0.62, 0.9, 1.42, 0.08, 0.08, RD, { seg: 8 });   // knobs
    // burner ring with a crown of flames under the wok
    sh.tor(b, 0, 1.18, 0, 0.6, 0.12, BK, { rx: PI / 2, seg: 18 });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2 + PI / 4; sh.box(b, cos(a) * 0.62, 1.22, sin(a) * 0.62, 0.12, 0.12, 0.3, BK, { ry: -a }); }
    // the wok: a black steel bowl, steel rim, long wooden handle and a helper loop
    const wokMat = sh.own(0x2a2c30, { metal: 0.6, rough: 0.35 }); wokMat.side = THREE.DoubleSide;
    sh.dome(b, 0, WY, 0, WR, WD, WR, 0, { mat: wokMat, rx: PI, seg: 22 });
    sh.tor(b, 0, WY, 0, WR, 0.035, LG, { rx: PI / 2, seg: 26, metal: 1 });
    sh.tube(b, [0, WY - 0.05, -WR + 0.05], [0, WY + 0.25, -2.6], 0.08, LG, { metal: 1 });
    sh.tube(b, [0, WY + 0.12, -1.85], [0, WY + 0.32, -2.62], 0.12, C.rbrown);
    sh.tor(b, 0, WY + 0.02, WR + 0.12, 0.14, 0.2, LG, { rx: PI / 2, seg: 10, arc: PI, rz: 0, metal: 1 });
    sh.box(b, 0, WY - 0.55, -0.25, 1.1, 0.12, 1.0, OR);   // seat cushion in the bowl
    // giant chopsticks crossed over the front, chili hood ornament, paper lantern
    for (const sd of [-1, 1]) sh.tube(b, [sd * 0.75, 1.15, 1.35], [sd * -0.2, 2.75, 2.15], 0.05, RD, { seg: 6, r2: 0.03 });
    sh.ell(b, 0, 0.98, 1.6, 0.14, 0.12, 0.34, RD, { seg: 10, rx: 0.4 });
    sh.cylY(b, 0, 1.1, 1.38, 0.04, 0.14, C.green, { seg: 6 });
    sh.tube(b, [-0.85, 1.1, -1.25], [-0.85, 2.95, -1.25], 0.03, BK, { seg: 4 });
    const mesh = b.build({ name: 'pepper' });

    // flickering burner flames
    const flameMat = sh.own(0xff8a20, { emissive: 0xff5a00, ei: 2, trans: true, opacity: 0.85 });
    const flames = sh.part('flames', 0, 1.18, 0, (pb) => {
      for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; sh.cone(pb, cos(a) * 0.6, 0.18, sin(a) * 0.6, 0.11, 0.38, 0, { mat: flameMat, seg: 6 }); }
    });
    const lantern = sh.part('lantern', -0.85, 2.95, -1.25, (pb) => {
      sh.tube(pb, [0, 0, 0], [0, -0.1, 0.3], 0.02, BK, { seg: 4 });
      sh.ell(pb, 0, -0.38, 0.3, 0.24, 0.3, 0.24, RD, { seg: 12 });
      for (const y of [-0.66, -0.1]) sh.cylY(pb, 0, y, 0.3, 0.12, 0.06, C.pearl, { seg: 10 });
      sh.box(pb, 0, -0.8, 0.3, 0.04, 0.2, 0.04, C.yellow);
    });
    // stir-fry: four bunches that flip up out of the wok in turn
    const foods = [];
    const food = (x, z, fill) => { const g = sh.part('food', x, WY - 0.25, z, fill); foods.push({ g, x, z, ph: foods.length * 0.27 }); return g; };
    food(0.72, 0.55, (pb) => { sh.tor(pb, 0, 0, 0, 0.17, 0.4, 0xff8a6a, { arc: PI * 1.4, seg: 10 }); sh.cone(pb, 0.17, -0.03, 0, 0.06, 0.15, 0xff5a3a, { rz: -0.4, seg: 5 }); sh.box(pb, -0.25, 0.05, 0.2, 0.22, 0.06, 0.22, C.lime); });
    food(-0.72, 0.5, (pb) => { sh.cylY(pb, 0, -0.1, 0, 0.05, 0.2, C.green, { seg: 6 }); for (let i = 0; i < 4; i++) sh.ell(pb, sin(i * 1.6) * 0.1, 0.05 + (i % 2) * 0.05, cos(i * 1.6) * 0.1, 0.1, 0.09, 0.1, 0x2f8a3a, { seg: 8 }); sh.cylX(pb, 0.25, 0.05, -0.15, 0.12, 0.05, OR, { seg: 10 }); });
    food(0.75, -0.75, (pb) => { sh.box(pb, 0, 0, 0, 0.3, 0.08, 0.18, RD, { ry: 0.5 }); sh.box(pb, -0.15, 0.08, 0.2, 0.26, 0.08, 0.14, C.yellow, { ry: -0.3 }); sh.ell(pb, 0.1, 0.05, 0.25, 0.1, 0.06, 0.1, 0xc8a070, { seg: 8 }); });
    food(-0.75, -0.7, (pb) => { sh.tor(pb, 0, 0, 0, 0.15, 0.4, 0xff8a6a, { arc: PI * 1.4, rz: 1, seg: 10 }); sh.cylX(pb, 0.2, 0.05, 0.1, 0.12, 0.05, OR, { seg: 10 }); sh.box(pb, 0.05, 0.1, -0.2, 0.2, 0.06, 0.2, 0xf6f0d0); });
    // steam (one instanced mesh)
    const NS = 7;
    const steam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), sh.own(0xffffff, { trans: true, opacity: 0.4, rough: 0.9 }), NS);
    steam.frustumCulled = false;
    const sp = []; for (let i = 0; i < NS; i++) sp.push({ ph: i / NS, x: sin(i * 2.3) * 0.8, z: cos(i * 2.3) * 0.7 });
    const TM = new THREE.Matrix4(), TQ = new THREE.Quaternion(), TV = new THREE.Vector3(), TS = new THREE.Vector3();
    // casters
    const wheels = [];
    for (const x of [0.7, -0.7]) wheels.push({ x, z: 1.0, r: 0.25, w: 0.2, front: true, cap: OR });
    wheels.push({ x: 0, z: -0.9, r: 0.25, w: 0.2, xs: [0.7, -0.7], cap: OR });
    let flick = 0;
    return {
      mesh, seat: [0, WY - 0.48, -0.25], control: 'wheel', parts: [flames, lantern, steam, ...foods.map((f) => f.g)], wheels,
      exhaust: [[0.55, 0.85, -1.45], [-0.55, 0.85, -1.45]],
      fx(s, dt) {
        flameMat.emissiveIntensity = 1.6 + sin(s.t * 31) * 0.5 + (s.boosting ? 2 : 0);
        flames.scale.set(1, 0.8 + sin(s.t * 23) * 0.15 + s.speed01 * 0.4 + (s.boosting ? 0.8 : 0), 1);
        lantern.rotation.x = sin(s.t * 2.6) * 0.18 + s.speed01 * 0.3;
        lantern.rotation.z = s.steer * 0.3;
        // each bunch hops out of the wok along an arc and spins
        const rate = 0.9 + s.speed01 * 0.8 + (s.boosting ? 1.2 : 0);
        for (const f of foods) {
          f.ph = (f.ph + dt * rate) % 1.6;
          const p = Math.min(1, f.ph);
          f.g.position.set(f.x * (1 - sin(p * PI) * 0.35), WY - 0.25 + sin(p * PI) * (1.0 + s.speed01 * 0.5), f.z - sin(p * PI) * 0.2);
          f.g.rotation.x = p * PI * 2; f.g.rotation.y = p * 2;
        }
        for (let i = 0; i < NS; i++) {
          const p = sp[i];
          p.ph = (p.ph + dt * (0.45 + s.speed01 * 0.3)) % 1;
          TV.set(p.x * (0.6 + p.ph * 0.3), WY + 0.3 + p.ph * 2.0, p.z - p.ph * (0.4 + s.speed01 * 1.5));
          steam.setMatrixAt(i, TM.compose(TV, TQ, TS.setScalar(0.12 + p.ph * 0.35 * (p.ph > 0.85 ? (1 - p.ph) / 0.15 : 1))));
        }
        steam.instanceMatrix.needsUpdate = true;
        // the wok gets a flick every so often (a proper toss on boost)
        const k = (s.t * (s.boosting ? 2.2 : 0.9)) % 1;
        flick += ((k < 0.18 ? -0.12 : 0) - flick) * ease(dt, 12);
        const up = mesh.parent;
        if (up) pitchAbout(up, flick, 0, 0);
      },
    };
  },
};

// ---- Cowgirl Cassie: a covered wagon with a longhorn skull, kicking up dust ----------------
export const cassie = {
  id: 'cassie', name: 'Dust Devil', form: 'Covered wagon', blurb: 'Kicks up a dust storm',
  stats: { speed: 4, accel: 3, handling: 3, weight: 3 },
  colors: [0xe4cd9e, 0x7c503a, 0xf2e8d0, 0xc91a09],
  build(K) {
    const { THREE, BrickBuilder, C } = K;
    const sh = kit(K);
    const WD = C.rbrown, DW = C.brown, TN = C.tan, CAN = 0xf2e8d0, BONE = 0xece2c6, BK = C.black;
    const b = new BrickBuilder(0.4);
    // wagon bed of planks, footboard and bench
    sh.box(b, 0, 1.05, -0.85, 1.6, 0.56, 3.0, WD);
    for (const sd of [-1, 1]) for (const y of [0.88, 1.08, 1.28]) sh.box(b, sd * 0.805, y, -0.85, 0.02, 0.03, 3.0, DW);
    sh.box(b, 0, 0.72, -0.4, 0.5, 0.14, 4.0, DW);
    sh.box(b, 0, 1.15, 0.85, 1.6, 0.06, 0.6, DW, { rx: 0.35 });
    sh.box(b, 0, 1.38, 0.72, 1.62, 0.5, 0.08, WD);
    sh.box(b, 0, 1.65, 0.72, 1.7, 0.06, 0.12, TN);
    sh.box(b, 0, 1.38, -0.25, 1.5, 0.12, 0.7, DW);
    sh.box(b, 0, 1.6, -0.6, 1.5, 0.5, 0.1, DW);
    for (const sd of [-1, 1]) sh.box(b, sd * 0.8, 1.55, 0.05, 0.08, 0.35, 1.4, WD);
    // canvas cover over hoops (open-ended half tube), patches and a lucky horseshoe
    const canvas = sh.own(CAN, { rough: 0.8 }); canvas.side = THREE.DoubleSide;
    const half = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true, PI / 2, PI);
    b.addMatrix(half, canvas, new THREE.Matrix4().compose(new THREE.Vector3(0, 1.35, -1.55), new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2, 0, 0)), new THREE.Vector3(0.88, 1.6, 1.2)));
    for (const z of [-2.12, -1.55, -0.98]) sh.tor(b, 0, 1.35, z, 1, 0.045, DW, { arc: PI, seg: 14, sx: 0.9, sy: 1.22 });
    sh.box(b, 0.62, 1.9, -1.3, 0.03, 0.34, 0.4, TN, { rz: -0.6 });
    sh.box(b, -0.7, 1.75, -1.75, 0.03, 0.3, 0.3, 0xd8c39a, { rz: 0.55 });
    sh.tor(b, 0.66, 1.95, -1.75, 0.16, 0.25, C.ltgray, { arc: PI * 1.4, rz: -PI * 0.2, ry: PI / 2 - 0.7, seg: 10 });
    // cargo peeking out the back: barrel and sacks
    sh.cylY(b, 0.35, 1.6, -2.0, 0.26, 0.55, WD, { seg: 12 });
    for (const y of [1.42, 1.78]) sh.cylY(b, 0.35, y, -2.0, 0.27, 0.05, BK, { seg: 12 });
    sh.ell(b, -0.35, 1.55, -2.05, 0.28, 0.22, 0.25, 0xc8a46a, { seg: 10 });
    // water barrel and lasso on the sides
    sh.cylY(b, -0.98, 1.05, -0.85, 0.2, 0.5, WD, { seg: 12 });
    sh.cylY(b, -0.98, 1.3, -0.85, 0.21, 0.04, BK, { seg: 12 });
    sh.tor(b, 0.84, 1.1, -0.9, 0.24, 0.16, 0xd8b070, { ry: PI / 2, seg: 14 });
    sh.tor(b, 0.85, 1.1, -0.9, 0.18, 0.2, 0xd8b070, { ry: PI / 2, seg: 14 });
    // the wagon tongue and a longhorn steer skull up front
    sh.tube(b, [0, 0.72, 1.0], [0, 0.9, 2.2], 0.07, DW);
    sh.box(b, 0, 1.1, 2.25, 0.36, 0.42, 0.24, BONE);
    sh.box(b, 0, 0.88, 2.33, 0.26, 0.3, 0.2, BONE);
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.1, 1.15, 2.375, 0.1, 0.12, 0.02, BK);
      sh.box(b, sd * 0.05, 0.84, 2.435, 0.04, 0.06, 0.02, BK);
      sh.tube(b, [sd * 0.15, 1.25, 2.2], [sd * 0.75, 1.32, 2.15], 0.07, BONE, { seg: 8 });
      sh.tube(b, [sd * 0.75, 1.32, 2.15], [sd * 1.3, 1.6, 2.05], 0.05, BONE, { seg: 8 });
      sh.cone(b, sd * 1.42, 1.72, 2.03, 0.05, 0.3, BONE, { rz: sd * -0.6, seg: 6 });
    }
    const mesh = b.build({ name: 'cassie' });

    // spoked wheels (big at the back, small up front)
    const wheel = (x, y, z, r, front) => {
      const w = sh.spoked('wagonwheel', r, 0.18, BK, WD, DW, { spokes: 10 });
      w.g.position.set(x, y, z); return { g: w.g, spin: w.spin, front, r };
    };
    // lantern swinging from the front hoop
    const lantern = sh.part('lantern', 0.92, 2.2, -0.95, (pb) => {
      sh.tube(pb, [0, 0, 0], [0, -0.22, 0], 0.015, BK, { seg: 4 });
      sh.box(pb, 0, -0.38, 0, 0.18, 0.26, 0.18, C.yellow, glow(0xffb030, 1.8));
      sh.cone(pb, 0, -0.2, 0, 0.13, 0.12, BK, { seg: 4, ry: PI / 4 });
      sh.box(pb, 0, -0.53, 0, 0.2, 0.04, 0.2, BK);
    });
    // dust kicked up behind the wheels (one instanced mesh)
    const ND = 10;
    const dust = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 6), sh.own(0xd8c39a, { trans: true, opacity: 0.45, rough: 1 }), ND);
    dust.frustumCulled = false;
    const dp = []; for (let i = 0; i < ND; i++) dp.push({ ph: i / ND, x: (i % 2 ? 1 : -1) * (1.0 + sin(i * 3.1) * 0.25) });
    const TM = new THREE.Matrix4(), TQ = new THREE.Quaternion(), TV = new THREE.Vector3(), TS = new THREE.Vector3();
    let sway = 0;
    return {
      mesh, seat: [0, 1.45, -0.2], control: 'bars', parts: [lantern, dust],
      wheels: [wheel(1.12, 0.8, -1.65, 0.8, false), wheel(-1.12, 0.8, -1.65, 0.8, false), wheel(1.05, 0.55, 1.1, 0.55, true), wheel(-1.05, 0.55, 1.1, 0.55, true)],
      exhaust: [[0.45, 0.95, -2.4], [-0.45, 0.95, -2.4]],
      fx(s, dt) {
        sway += (-s.steer * 0.07 - sway) * ease(dt, 3);
        const up = mesh.parent;
        if (up) { up.rotation.z = sway + sin(s.t * 5.3) * 0.03 * s.speed01; up.position.y = Math.abs(sin(s.t * 7)) * 0.05 * s.speed01; }
        lantern.rotation.x = sin(s.t * 3.3) * 0.3 + s.speed01 * 0.35;
        lantern.rotation.z = sin(s.t * 2.1) * 0.15 + s.steer * 0.4;
        const amt = Math.min(1, s.speed01 * 1.4 + (s.boosting ? 0.6 : 0)) * (s.grounded ? 1 : 0);
        for (let i = 0; i < ND; i++) {
          const p = dp[i];
          p.ph = (p.ph + dt * (0.8 + s.speed01)) % 1;
          TV.set(p.x * (1 + p.ph * 0.3), 0.25 + p.ph * 0.9, -1.8 - p.ph * 2.2);
          dust.setMatrixAt(i, TM.compose(TV, TQ, TS.setScalar(Math.max(0.001, (0.18 + p.ph * 0.55) * amt * (1 - p.ph * 0.6)))));
        }
        dust.instanceMatrix.needsUpdate = true;
      },
    };
  },
};

// ---- Viking Bjorn: a dragon-prowed longship on sled runners, oars rowing --------------------
export const bjorn = {
  id: 'bjorn', name: 'Long Hammer', form: 'Longship sledge', blurb: 'Rows harder the faster it goes',
  stats: { speed: 5, accel: 1, handling: 1, weight: 5 },
  colors: [0x720e0f, 0xa0a5a9, 0x7c503a, 0xf2cd37],
  build(K) {
    const { THREE, BrickBuilder, C } = K;
    const sh = kit(K);
    const WD = C.rbrown, DW = C.brown, RD = C.dkred, LG = C.ltgray, BK = C.black, Y = C.yellow;
    const HY = 1.18, HX = 0.98, HZ = 2.35, HD = 0.85;
    const b = new BrickBuilder(0.4);
    // clinker-built hull: an open bowl with strakes and a red top band
    const hullMat = sh.own(WD, { rough: 0.6 }); hullMat.side = THREE.DoubleSide;
    sh.dome(b, 0, HY, 0, HX, HD, HZ, 0, { mat: hullMat, rx: PI, seg: 22 });
    for (const [h, col] of [[0.0, RD], [0.22, DW], [0.45, DW]]) {
      const f = Math.sqrt(1 - (h / HD) ** 2);
      sh.tor(b, 0, HY - h, 0, 1, 0.04, col, { rx: PI / 2, sx: HX * f, sy: HZ * f, sz: 1.5, seg: 28 });
    }
    sh.cylY(b, 0, HY - 0.3, 0, HX * 0.9, 0.05, 0xc8a070, { r2: HZ * 0.9, seg: 20 });   // deck
    sh.box(b, 0, HY - 0.15, -0.45, 1.3, 0.16, 0.4, DW);               // thwart seat
    // dragon neck rising from the bow, curled tail at the stern
    sh.arc(b, 0, HY + 0.5, HZ - 0.55, 0.62, -1.45, 0.9, 8, 0.24, 0.26, RD);
    sh.arc(b, 0, HY + 0.62, -HZ + 0.5, 0.6, PI + 1.45, PI - 0.6, 7, 0.22, 0.24, RD);
    sh.tor(b, 0, HY + 1.05, -HZ + 0.35, 0.22, 0.35, RD, { ry: PI / 2, seg: 12, arc: PI * 1.5 });
    // round shields along both sides
    const SC = [[C.red, Y], [Y, C.red], [C.white, C.blue], [C.blue, C.white]];
    for (const sd of [-1, 1]) [-1.35, -0.45, 0.45, 1.35].forEach((z, i) => {
      const x = sd * (HX * Math.sqrt(1 - (z / HZ) ** 2) + 0.04);
      const [c1, c2] = SC[(i + (sd > 0 ? 0 : 1)) % 4];
      sh.cylX(b, x, HY - 0.05, z, 0.3, 0.06, c1, { seg: 16 });
      sh.box(b, x + sd * 0.035, HY - 0.05, z, 0.02, 0.58, 0.12, c2);
      sh.box(b, x + sd * 0.035, HY - 0.05, z, 0.02, 0.12, 0.58, c2);
      sh.ell(b, x + sd * 0.05, HY - 0.05, z, 0.06, 0.09, 0.09, LG, { metal: 1, seg: 8 });
    });
    // sled runners with curled tips
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.6, 0.05, -0.15, 0.16, 0.08, 4.0, LG, { metal: 1 });
      sh.arc(b, sd * 0.6, 0.35, 1.85, 0.32, -PI / 2, PI * 0.4, 6, 0.16, 0.08, LG, { metal: 1 });
      for (const z of [-1.4, 0, 1.3]) sh.tube(b, [sd * 0.6, 0.08, z], [sd * 0.45, 0.5, z], 0.05, DW);
    }
    // the hammer mast with a streaming pennant
    sh.tube(b, [0, HY - 0.3, -1.15], [0, 3.05, -1.15], 0.08, DW, { seg: 8 });
    sh.box(b, 0, 3.2, -1.15, 1.15, 0.52, 0.52, LG, { metal: 1 });
    for (const sd of [-1, 1]) { sh.box(b, sd * 0.42, 3.2, -1.15, 0.08, 0.56, 0.56, RD); sh.box(b, sd * 0.6, 3.2, -1.15, 0.06, 0.4, 0.4, LG, { metal: 1 }); }
    sh.tube(b, [0, 2.6, -1.15], [0, 2.95, -1.15], 0.1, 0x6a3a1a, { seg: 8 });
    const mesh = b.build({ name: 'bjorn' });

    // dragon head on the prow (looks into the turns)
    const head = sh.part('dragonhead', 0, HY + 1.12, HZ - 0.3, (pb) => {
      sh.box(pb, 0, 0, 0, 0.4, 0.38, 0.5, RD);
      sh.box(pb, 0, -0.06, 0.38, 0.32, 0.24, 0.42, RD);
      sh.box(pb, 0, -0.22, 0.32, 0.3, 0.08, 0.46, Y);
      for (const sd of [-1, 1]) {
        sh.box(pb, sd * 0.2, 0.1, 0.12, 0.04, 0.1, 0.12, Y, glow(0xffc020, 1.5));
        sh.cone(pb, sd * 0.14, 0.32, -0.15, 0.06, 0.4, Y, { rx: -0.9, rz: sd * -0.3, seg: 6 });
        for (let k = 0; k < 3; k++) sh.cone(pb, sd * 0.12, -0.2, 0.5 - k * 0.12, 0.03, 0.08, C.white, { rx: PI, seg: 4 });
      }
      for (let k = 0; k < 3; k++) sh.cone(pb, 0, 0.18 - k * 0.12, -0.3 - k * 0.1, 0.05, 0.2, Y, { rx: -1.9, seg: 4 });
    });
    // pennant streaming from the hammer
    const pennant = sh.part('pennant', 0, 3.5, -1.15, (pb) => {
      sh.tube(pb, [0, -0.05, 0], [0, 0.35, 0], 0.025, BK, { seg: 4 });
      for (let k = 0; k < 4; k++) sh.box(pb, 0, 0.25, -0.2 - k * 0.3, 0.02, 0.2 - k * 0.03, 0.3, k % 2 ? C.white : C.red);
    });
    // oars: one group per side, rowing together
    const oars = [-1, 1].map((sd) => sh.part('oars', sd * 0.92, HY + 0.05, 0, (pb) => {
      for (const z of [-0.9, 0, 0.9]) {
        sh.tube(pb, [-sd * 0.25, 0.1, z], [sd * 0.75, -0.8, z], 0.04, 0xd8b070, { seg: 6 });
        sh.box(pb, sd * 0.78, -0.86, z, 0.05, 0.36, 0.2, RD, { rz: sd * 0.84 });
      }
    }));
    let row = 0, look = 0;
    return {
      mesh, seat: [0, HY - 0.05, -0.45], control: 'bars', parts: [head, pennant, ...oars],
      exhaust: [[0.28, HY + 0.1, -HZ + 0.1], [-0.28, HY + 0.1, -HZ + 0.1]],
      fx(s, dt) {
        row += dt * (2 + s.speed01 * 5 + (s.boosting ? 4 : 0));
        for (let i = 0; i < 2; i++) {
          const sd = i ? 1 : -1;
          oars[i].rotation.y = sd * sin(row) * 0.38;
          oars[i].rotation.z = sd * (cos(row) * 0.16 + 0.04);
        }
        look += (-s.steer * 0.5 - look) * ease(dt, 5);
        head.rotation.y = look;
        head.rotation.x = s.boosting ? -0.25 : sin(s.t * 2) * 0.05;
        pennant.rotation.y = sin(s.t * 7) * 0.25;
        pennant.scale.z = 0.8 + s.speed01 * 0.4 + sin(s.t * 11) * 0.08;
        const up = mesh.parent;
        if (up) pitchAbout(up, sin(row) * 0.03 * (0.4 + s.speed01), 0.6, 0, Math.max(0, sin(row)) * 0.04 * s.speed01);
      },
    };
  },
};

// ---- Queen Regina: a golden coach that sways on its springs, crown-throne behind -----------
export const regina = {
  id: 'regina', name: 'Royal Coach', form: 'Golden carriage', blurb: 'Sways like true royalty',
  stats: { speed: 4, accel: 3, handling: 4, weight: 2 },
  colors: [0xfc97ac, 0xe6c05a, 0xdcbc81, 0x923978],
  build(K) {
    const { THREE, BrickBuilder, C, rig } = K;
    const sh = kit(K);
    const PK = C.pink, MG = C.magenta, GD = 0xe6c05a, W = C.white, RD = C.red;
    const BX = Math.min(1.25, Math.max(0.95, (rig.width || 1.3) / 2 + 0.25));
    const b = new BrickBuilder(0.4);
    // pumpkin-round coach body with gold belts and crests
    sh.ell(b, 0, 1.25, 0, BX, 0.6, 1.35, PK, { seg: 20 });
    sh.tor(b, 0, 1.3, 0, 1, 0.04, GD, { rx: PI / 2, sx: BX + 0.01, sy: 1.36, sz: 2, seg: 28, metal: 1 });
    for (const x of [-0.5, 0, 0.5]) { const f = Math.sqrt(1 - (x / BX) ** 2); sh.tor(b, x * 1.01, 1.25, 0, 1, 0.022, MG, { ry: PI / 2, sx: 1.36 * f, sy: 0.61 * f, sz: 1.5, seg: 16, arc: PI }); }
    for (const sd of [-1, 1]) {
      sh.cylX(b, sd * (BX - 0.02), 1.25, 0.1, 0.24, 0.08, GD, { seg: 16, metal: 1 });
      sh.ell(b, sd * (BX + 0.04), 1.27, 0.1, 0.04, 0.12, 0.1, RD, glow(0xff2050, 0.8));
      sh.cone(b, sd * (BX + 0.02), 1.45, 0.1, 0.06, 0.12, GD, { seg: 5, metal: 1 });
    }
    sh.box(b, 0, 1.62, -0.15, BX * 1.6, 0.06, 1.6, MG);   // velvet seat well
    // crown throne back
    sh.cylY(b, 0, 2.15, -1.0, 0.95, 0.5, GD, { seg: 18, metal: 1, r2: 0.45 });
    sh.box(b, 0, 2.1, -0.65, 1.5, 0.95, 0.12, RD);
    for (let i = 0; i < 7; i++) {
      const px = sin((i - 3) * 0.42) * 0.95, pz = -1.0 - cos((i - 3) * 0.42) * 0.45;
      sh.cone(b, px, 2.75, pz, 0.14, 0.6, GD, { seg: 6, metal: 1 });
      sh.ell(b, px, 3.1, pz, 0.08, 0.08, 0.08, W);
    }
    // springs, perch, footboard and lamps
    sh.box(b, 0, 0.72, 0, 0.3, 0.16, 3.6, 0x3a2a20);
    for (const z of [-1.2, 1.2]) for (const sd of [-1, 1]) sh.tor(b, sd * 0.45, 0.95, z, 0.28, 0.18, GD, { ry: PI / 2, rz: z > 0 ? 0.6 : -0.6 + PI, seg: 12, arc: PI * 1.3, metal: 1 });
    sh.box(b, 0, 0.9, 1.6, 1.4, 0.06, 0.5, 0x3a2a20);
    for (const sd of [-1, 1]) {
      sh.tube(b, [sd * 0.7, 0.9, 1.75], [sd * 0.75, 1.7, 1.8], 0.03, GD, { metal: 1 });
      sh.box(b, sd * 0.75, 1.82, 1.8, 0.18, 0.26, 0.18, C.yellow, glow(0xffd060, 1.5));
      sh.cone(b, sd * 0.75, 2.01, 1.8, 0.14, 0.16, GD, { seg: 4, ry: PI / 4, metal: 1 });
    }
    // footman's step and trumpets out the back
    sh.box(b, 0, 0.92, -1.75, 1.3, 0.06, 0.5, 0x3a2a20);
    for (const sd of [-1, 1]) {
      sh.tube(b, [sd * 0.45, 1.3, -1.25], [sd * 0.6, 1.9, -2.15], 0.05, GD, { metal: 1 });
      sh.cone(b, sd * 0.62, 1.95, -2.23, 0.17, 0.26, GD, { rx: PI / 2 + 0.6, seg: 12, metal: 1 });
    }
    const mesh = b.build({ name: 'regina' });

    // gold wheels
    const wheel = (x, y, z, r, front) => {
      const w = sh.spoked('royalwheel', r, 0.16, GD, PK, GD, { spokes: 10, metalRim: true, tyre: C.black });
      w.g.position.set(x, y, z); return { g: w.g, spin: w.spin, front, r };
    };
    // banners hanging from the trumpets
    const banners = sh.part('banners', 0, 1.75, -1.95, (pb) => {
      for (const sd of [-1, 1]) {
        sh.box(pb, sd * 0.55, -0.25, 0, 0.03, 0.42, 0.36, PK);
        sh.box(pb, sd * 0.57, -0.22, 0, 0.02, 0.12, 0.12, GD);
        sh.cone(pb, sd * 0.55, -0.52, 0, 0.18, 0.16, PK, { rx: PI, seg: 3, ry: PI / 6 });
      }
    });
    // twinkling crown jewels
    const gem = sh.own(0x40a0ff, { emissive: 0x2080ff, ei: 1 });
    const gems = sh.part('gems', 0, 2.3, -1.0, (pb) => {
      for (let i = -2; i <= 2; i++) { const a = i * 0.55; sh.box(pb, sin(a) * 0.96, 0, -cos(a) * 0.46, 0.14, 0.14, 0.06, 0, { mat: gem, ry: a, rz: PI / 4 }); }
    });
    let roll = 0, rv = 0, pitch = 0;
    return {
      mesh, seat: [0, 1.62, -0.15], control: 'none', parts: [banners, gems],
      wheels: [wheel(1.2, 0.8, -1.3, 0.8, false), wheel(-1.2, 0.8, -1.3, 0.8, false), wheel(1.12, 0.55, 1.35, 0.55, true), wheel(-1.12, 0.55, 1.35, 0.55, true)],
      exhaust: [[0.65, 2.0, -2.35, -PI / 2 + 0.6], [-0.65, 2.0, -2.35, -PI / 2 + 0.6]],
      fx(s, dt) {
        // the body hangs on springs: a lagging, bouncy sway
        rv += ((-s.steer * 0.14 - roll) * 22 - rv * 3.2) * dt;
        roll += rv * dt;
        pitch += ((s.boosting ? 0.07 : 0) + sin(s.t * 4.2) * 0.02 * s.speed01 - pitch) * ease(dt, 4);
        const up = mesh.parent;
        if (up) { up.rotation.z = roll; pitchAbout(up, pitch, 0.9, 0, sin(s.t * 6.5) * 0.025 * (0.3 + s.speed01)); }
        gem.emissiveIntensity = 0.8 + Math.max(0, sin(s.t * 3.7)) * 1.8;
        banners.rotation.x = 0.2 + s.speed01 * 0.6 + sin(s.t * 6) * 0.12;
      },
    };
  },
};

// ---- Skater Sam: a giant skateboard with a boombox seat that pumps to the beat ------------
export const sam = {
  id: 'sam', name: 'Skate Spark', form: 'Giant skateboard', blurb: 'Grinds, carves and sparks',
  stats: { speed: 3, accel: 4, handling: 5, weight: 1 },
  colors: [0x36aebf, 0xbbe90b, 0x1b2a34, 0xfe8a18],
  build(K) {
    const { THREE, BrickBuilder, C } = K;
    const sh = kit(K);
    const AZ = C.azure, LI = C.lime, BK = C.black, LG = C.ltgray, OR = C.orange;
    const DY = 0.86, WR = 0.4;
    const b = new BrickBuilder(0.4);
    // the deck: flat middle, kicked tails, grip tape and a lightning bolt
    sh.box(b, 0, DY, 0, 1.6, 0.1, 3.4, AZ);
    sh.box(b, 0, DY - 0.07, 0, 1.1, 0.03, 3.0, LI, { lit: 0x9cff20 });   // neon underglow
    for (const sd of [-1, 1]) {
      sh.box(b, 0, DY + 0.15, sd * 1.95, 1.6, 0.1, 0.65, AZ, { rx: sd * -0.42 });
      sh.cylY(b, 0, DY + 0.28, sd * 2.25, 0.8, 0.1, AZ, { r2: 0.3, rx: sd * -0.42, seg: 18 });
    }
    sh.box(b, 0, DY + 0.055, 0, 1.56, 0.02, 3.36, 0x2a2e33);
    const bolt = [[0.25, 1.35], [-0.15, 0.8], [0.2, 0.3], [-0.2, -0.45]];
    for (let i = 0; i < bolt.length - 1; i++) {
      const [x0, z0] = bolt[i], [x1, z1] = bolt[i + 1];
      sh.box(b, (x0 + x1) / 2, DY + 0.07, (z0 + z1) / 2, 0.16, 0.02, Math.hypot(x1 - x0, z1 - z0) + 0.1, LI, { ry: Math.atan2(x1 - x0, z1 - z0) });
    }
    for (const sd of [-1, 1]) sh.box(b, sd * 0.81, DY, 0, 0.02, 0.08, 3.4, OR);
    // a huge boombox for a seat: speakers face the chasers, cassette deck, chrome handle
    sh.box(b, 0, DY + 0.47, -0.55, 1.42, 0.84, 0.72, BK);
    sh.box(b, 0, DY + 0.9, -0.55, 1.3, 0.04, 0.62, C.dkgray);
    for (const sd of [-1, 1]) { sh.cylZ(b, sd * 0.45, DY + 0.45, -0.18, 0.2, 0.03, C.dkgray, { seg: 14 }); sh.cylZ(b, sd * 0.45, DY + 0.45, -0.17, 0.08, 0.03, LI, { seg: 10 }); }
    for (let i = 0; i < 5; i++) sh.box(b, -0.16 + i * 0.08, DY + 0.35 + (i % 3) * 0.06, -0.18, 0.05, 0.12 + (i % 3) * 0.12, 0.02, i % 2 ? OR : LI, { lit: i % 2 ? 0xff9a30 : 0xb0ff30 });
    sh.box(b, 0, DY + 0.47, -0.915, 0.36, 0.3, 0.02, LG);
    sh.box(b, 0, DY + 0.47, -0.925, 0.26, 0.14, 0.02, BK);
    for (let i = 0; i < 4; i++) sh.box(b, -0.15 + i * 0.1, DY + 0.75, -0.925, 0.06, 0.05, 0.03, i % 2 ? OR : LI);
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.715, DY + 0.47, -0.55, 0.02, 0.5, 0.5, C.dkgray);
      sh.tube(b, [sd * 0.55, DY + 0.89, -0.88], [sd * 0.55, DY + 1.12, -0.95], 0.04, LG, { metal: 1 });
    }
    sh.tube(b, [-0.55, DY + 1.12, -0.95], [0.55, DY + 1.12, -0.95], 0.05, LG, { metal: 1 });
    // a big lime lightning-bolt fin out the back
    sh.box(b, 0, DY + 0.3, -1.3, 0.1, 0.6, 0.3, LI, { rx: -0.5 });
    sh.box(b, 0, DY + 0.62, -1.52, 0.1, 0.16, 0.6, LI, { rx: 0.2 });
    sh.box(b, 0, DY + 0.95, -1.78, 0.1, 0.7, 0.3, LI, { rx: -0.5 });
    // a traffic cone strapped to the nose
    sh.cone(b, 0, DY + 0.55, 1.75, 0.22, 0.6, OR, { seg: 10 });
    sh.cylY(b, 0, DY + 0.5, 1.75, 0.16, 0.08, C.white, { seg: 10 });
    sh.box(b, 0, DY + 0.1, 1.75, 0.5, 0.06, 0.5, OR);
    for (const z of [-1.4, 1.4]) {   // trucks
      sh.box(b, 0, DY - 0.14, z, 0.34, 0.18, 0.34, LG);
      sh.cylX(b, 0, WR, z, 0.06, 1.5, LG, { seg: 8 });
      sh.box(b, 0, (WR + DY) / 2 - 0.08, z, 0.16, DY - WR - 0.1, 0.12, LG);
    }
    const mesh = b.build({ name: 'sam' });

    // speakers that thump (own glowing rings + cones)
    const ringMat = sh.own(LI, { emissive: 0x9cff20, ei: 1 });
    const speakers = sh.part('speakers', 0, DY + 0.47, -0.92, (pb) => {
      for (const sd of [-1, 1]) {
        sh.tor(pb, sd * 0.43, 0, 0, 0.25, 0.16, 0, { seg: 18, mat: ringMat });
        sh.cone(pb, sd * 0.43, 0, -0.02, 0.24, 0.1, 0x2a2e33, { rx: -PI / 2, seg: 16, mat: ringMat });
        sh.ell(pb, sd * 0.43, 0, -0.07, 0.07, 0.07, 0.04, LG, { seg: 8, mat: ringMat });
      }
    });
    // trucks + lime urethane wheels ride with the deck
    const wheelsG = new THREE.Group();
    const spins = [];
    for (const z of [-1.4, 1.4]) {
      for (const x of [-0.82, 0.82]) {
        const g = new THREE.Group(); g.position.set(x, WR, z);
        const wb = new BrickBuilder(0.4);
        sh.cylX(wb, 0, 0, 0, WR, 0.36, LI, { seg: 18 });
        sh.cylX(wb, 0, 0, 0, WR * 0.45, 0.38, OR, { seg: 10 });
        for (let i = 0; i < 3; i++) sh.box(wb, 0, sin(i * 2.1) * WR * 0.72, cos(i * 2.1) * WR * 0.72, 0.37, 0.07, 0.07, 0x9ac80a);
        const spin = new THREE.Group(); spin.add(wb.build({ name: 'urethane' })); g.add(spin); wheelsG.add(g);
        spins.push(spin);
      }
    }
    // grind sparks off the tail (instanced)
    const NP = 10;
    const sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.2), sh.own(C.yellow, { emissive: 0xffc040, ei: 3 }), NP);
    sparks.frustumCulled = false; sparks.position.set(0, 0.12, -1.85);
    const TM = new THREE.Matrix4(), TQ = new THREE.Quaternion(), TE = new THREE.Euler(), TV = new THREE.Vector3(), TS = new THREE.Vector3();
    const pp = []; for (let i = 0; i < NP; i++) pp.push({ ph: i / NP, x: sin(i * 2.9) * 0.6, a: sin(i * 1.7) * 0.8 });
    let lean = 0, pop = 0;
    return {
      mesh, seat: [0, DY + 0.95, -0.5], control: 'none', parts: [speakers, wheelsG, sparks],
      wheels: spins.map((spin) => ({ g: new THREE.Group(), spin, front: false, r: WR })),
      exhaust: [[0.43, DY + 0.47, -1.0], [-0.43, DY + 0.47, -1.0]],
      fx(s, dt) {
        const beat = Math.max(0, sin(s.t * 12.5)) ** 4;
        speakers.scale.set(1 + beat * 0.06, 1 + beat * 0.14, 1 + beat * 0.8);
        ringMat.emissiveIntensity = 0.6 + beat * 2.2;
        // carve: the deck tilts on its trucks; manual on boost, tail grab in the air
        lean += (s.steer * 0.22 - lean) * ease(dt, 7);
        pop += ((!s.grounded || s.gliding ? -0.4 : s.boosting ? -0.16 : 0) - pop) * ease(dt, 6);
        const up = mesh.parent;
        if (up) { up.rotation.z = lean; pitchAbout(up, pop, 0, -1.4); up.rotation.z = lean; }
        const on = s.boosting && s.grounded;
        sparks.visible = on;
        if (on) {
          for (let i = 0; i < NP; i++) {
            const p = pp[i];
            p.ph = (p.ph + dt * 3) % 1;
            TV.set(p.x * p.ph, 0.4 * sin(p.ph * PI) - 0.1, -p.ph * 1.4);
            TQ.setFromEuler(TE.set(p.a, p.a * 2, 0));
            sparks.setMatrixAt(i, TM.compose(TV, TQ, TS.setScalar(1 - p.ph)));
          }
          sparks.instanceMatrix.needsUpdate = true;
        }
      },
    };
  },
};

// ---- Zorp: a flying saucer with chasing rim lights and a tractor beam (with a cow) ---------
export const zorp = {
  id: 'zorp', name: 'Saucer Buggy', form: 'Flying saucer', blurb: 'Brought a cow along',
  stats: { speed: 4, accel: 4, handling: 2, weight: 3 },
  colors: [0xbbe90b, 0x81007b, 0xa0a5a9, 0xcda4de],
  build(K) {
    const { THREE, BrickBuilder, C, rig } = K;
    const sh = kit(K);
    const LI = C.lime, PU = C.purple, LG = C.ltgray, BK = C.black, W = C.white;
    const DY = 0.55, R = 1.75;
    const b = new BrickBuilder(0.4);
    // the disc: silver top, lime band, purple underside
    sh.ell(b, 0, DY, 0, R, 0.24, R, LG, { seg: 22, metal: 1 });
    sh.tor(b, 0, DY, 0, R - 0.02, 0.04, LI, { rx: PI / 2, seg: 32 });
    sh.dome(b, 0, DY - 0.05, 0, 1.0, 0.42, 1.0, PU, { rx: PI, seg: 18 });
    sh.cylY(b, 0, DY - 0.47, 0, 0.42, 0.06, BK, { seg: 16 });
    sh.cylY(b, 0, DY + 0.22, 0, 1.15, 0.1, PU, { seg: 22 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; sh.box(b, cos(a) * 1.25, DY + 0.18, sin(a) * 1.25, 0.32, 0.06, 0.12, PU, { ry: -a }); }
    // antennae with glowing tips
    for (const sd of [-1, 1]) {
      sh.tube(b, [sd * 1.1, DY + 0.2, -0.6], [sd * 1.35, DY + 1.25, -0.85], 0.025, BK, { seg: 4 });
      sh.ell(b, sd * 1.35, DY + 1.28, -0.85, 0.08, 0.08, 0.08, LI, glow(0x9cff20, 2));
    }
    // glass dome sized to the pilot
    const dx = Math.min(1.3, Math.max(0.95, (rig.width || 1.3) / 2 + 0.3)), dy = Math.min(3.2, rig.height + 0.55);
    sh.dome(b, 0, DY + 0.3, -0.15, dx, dy, 1.0, C.azure, { m: { trans: true, opacity: 0.22, rough: 0.05 }, seg: 20 });
    sh.tor(b, 0, DY + 0.3, -0.15, 1, 0.05, LG, { rx: PI / 2, sx: dx, sy: 1.0, sz: 1.5, seg: 24, metal: 1 });
    const mesh = b.build({ name: 'zorp' });

    // chasing rim lights (two colours on one spinning ring)
    const lights = sh.part('rimlights', 0, DY + 0.06, 0, (pb) => {
      for (let i = 0; i < 14; i++) { const a = (i / 14) * PI * 2; sh.ell(pb, cos(a) * (R - 0.05), 0, sin(a) * (R - 0.05), 0.09, 0.07, 0.09, i % 2 ? LI : PU, glow(i % 2 ? 0x9cff20 : 0xc040ff, 2.2)); }
    });
    // tractor beam with an abducted brick cow
    const beamMat = sh.own(LI, { emissive: 0x9cff20, ei: 0.8, trans: true, opacity: 0.22 });
    const beam = sh.part('beam', 0, DY - 0.47, 0, (pb) => sh.cone(pb, 0, -0.45, 0, 0.95, 0.9, 0, { mat: beamMat, seg: 18 }));
    const cow = sh.part('cow', 0, -0.4, 0, (pb) => {
      sh.box(pb, 0, 0, 0, 0.32, 0.2, 0.42, W);
      sh.box(pb, 0.08, 0.05, 0.1, 0.18, 0.12, 0.14, BK);
      sh.box(pb, -0.1, -0.02, -0.1, 0.14, 0.1, 0.12, BK);
      sh.box(pb, 0, 0.08, 0.28, 0.2, 0.18, 0.18, W);
      sh.box(pb, 0, 0.03, 0.39, 0.16, 0.1, 0.06, C.pink);
      for (const sd of [-1, 1]) { sh.box(pb, sd * 0.12, 0.2, 0.26, 0.04, 0.08, 0.04, C.tan); for (const z of [-0.14, 0.14]) sh.box(pb, sd * 0.1, -0.15, z, 0.07, 0.14, 0.07, W); }
    });
    let tilt = 0, bank = 0;
    return {
      mesh, seat: [0, DY + 0.32, -0.15], control: 'yoke', hover: 0.85, parts: [lights, beam, cow],
      exhaust: [[0.5, DY, -R + 0.05], [-0.5, DY, -R + 0.05]],
      glider: [0, DY + 0.3 + dy - 1.6, -0.3],
      fx(s, dt) {
        lights.rotation.y += dt * (1.5 + s.speed01 * 4 + (s.boosting ? 6 : 0));
        beamMat.opacity = 0.14 + Math.max(0, sin(s.t * 5)) * 0.14 + (s.boosting ? 0.15 : 0);
        beam.scale.set(0.8 + sin(s.t * 5) * 0.08, 1, 0.8 + sin(s.t * 5) * 0.08);
        cow.position.y = -0.42 + sin(s.t * 1.7) * 0.1;
        cow.rotation.y += dt * 1.3; cow.rotation.z = sin(s.t * 1.1) * 0.4; cow.rotation.x = sin(s.t * 0.9) * 0.3;
        bank += (s.steer * 0.22 - bank) * ease(dt, 4);
        tilt += ((s.boosting ? 0.12 : 0.03 * s.speed01) - tilt) * ease(dt, 3);
        const up = mesh.parent;
        if (up) { up.rotation.z = bank + sin(s.t * 2.3) * 0.03; up.rotation.x = tilt; }
      },
    };
  },
};

// ---- Mummy Max: a golden scarab that scuttles on six legs, rolling the sun before it -------
export const max = {
  id: 'max', name: 'Tomb Rover', form: 'Scarab walker', blurb: 'Six legs and a rolling sun',
  stats: { speed: 3, accel: 2, handling: 3, weight: 4 },
  colors: [0x958a73, 0xdcbc81, 0x0a3463, 0xe4cd9e],
  build(K) {
    const { THREE, BrickBuilder, C } = K;
    const sh = kit(K);
    const GD = 0xdcbc81, LP = C.dkblue, TN = C.tan, BK = C.black, DT = C.dktan;
    const b = new BrickBuilder(0.4);
    // golden shell: two wing cases, the thorax and a shovel head
    sh.ell(b, 0, 0.98, -0.95, 1.05, 0.55, 1.3, GD, { seg: 20, metal: 1 });
    sh.box(b, 0, 1.5, -1.45, 0.06, 0.06, 1.0, BK);
    for (const sd of [-1, 1]) for (const [x, y, l, r] of [[0.45, 1.46, 1.5, 0.45], [0.82, 1.3, 1.1, 1.0]]) sh.box(b, sd * x, y, -0.95, 0.08, 0.05, l, LP, { rz: sd * -r });
    sh.ell(b, 0, 1.0, 0.45, 0.85, 0.48, 0.62, GD, { seg: 18, metal: 1 });
    sh.box(b, 0, 1.36, 0.45, 1.0, 0.05, 0.1, LP);
    sh.box(b, 0, 0.88, 1.12, 0.78, 0.3, 0.5, GD, { metal: 1 });
    for (let i = -2; i <= 2; i++) sh.cone(b, i * 0.15, 0.82, 1.42, 0.06, 0.2, GD, { rx: PI / 2, seg: 4, metal: 1 });
    for (const sd of [-1, 1]) { sh.ell(b, sd * 0.3, 1.0, 1.25, 0.1, 0.1, 0.08, LP, glow(0x3060ff, 1.2)); sh.tube(b, [sd * 0.25, 1.1, 1.2], [sd * 0.5, 1.6, 1.5], 0.03, BK, { seg: 4 }); sh.ell(b, sd * 0.5, 1.62, 1.5, 0.08, 0.05, 0.12, BK, { seg: 6 }); }
    sh.ell(b, 0, 0.62, -0.3, 0.75, 0.3, 1.6, BK, { seg: 14 });
    // sarcophagus cockpit: gold rim, lapis bands, tall pharaoh lid as the seat back
    sh.box(b, 0, 1.35, -0.3, 1.1, 0.25, 1.3, GD, { metal: 1 });
    sh.box(b, 0, 1.47, -0.3, 0.95, 0.04, 1.15, DT);
    const lz = -1.15;
    sh.box(b, 0, 2.0, lz, 1.0, 1.6, 0.2, GD, { metal: 1, rx: -0.12 });
    for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) sh.box(b, sd * 0.38, 2.4 - i * 0.12, lz + 0.11 - i * 0.015, 0.22, 0.06, 0.04, i % 2 ? LP : GD, { rx: -0.12 });
    sh.box(b, 0, 2.55, lz + 0.12, 0.5, 0.5, 0.06, 0xd8a85a, { rx: -0.12 });
    for (const sd of [-1, 1]) sh.box(b, sd * 0.1, 2.6, lz + 0.16, 0.12, 0.05, 0.03, BK, { rx: -0.12 });
    sh.box(b, 0, 2.27, lz + 0.18, 0.08, 0.22, 0.04, LP, { rx: -0.12 });
    for (let i = 0; i < 4; i++) sh.box(b, 0, 1.95 - i * 0.18, lz + 0.14, 0.6, 0.08, 0.04, i % 2 ? LP : 0xc04030, { rx: -0.12 });
    // back of the lid: hieroglyphs and a glowing Eye of Horus
    sh.box(b, 0, 2.3, lz - 0.14, 0.62, 0.22, 0.03, LP, glow(0x3060ff, 1.6));
    sh.ell(b, 0, 2.3, lz - 0.16, 0.1, 0.07, 0.02, C.white, glow(0xffffff, 0.8));
    for (let i = 0; i < 6; i++) sh.box(b, ((i % 3) - 1) * 0.25, 1.85 - Math.floor(i / 3) * 0.25, lz - 0.13, 0.12, 0.12, 0.02, BK);
    const mesh = b.build({ name: 'max' });

    // six legs in two tripods that take turns stepping
    const leg = (pb, sd, z, dz) => {
      const hip = [sd * 0.6, 0.85, z], knee = [sd * 1.3, 1.2, z + dz * 0.4], foot = [sd * 1.55, 0.05, z + dz];
      sh.tube(pb, hip, knee, 0.08, BK, { seg: 6 });
      sh.tube(pb, knee, foot, 0.06, BK, { seg: 6 });
      sh.ell(pb, ...knee, 0.11, 0.11, 0.11, GD, { seg: 8 });
      for (const f of [0.35, 0.6]) sh.cone(pb, knee[0] + (foot[0] - knee[0]) * f + sd * 0.06, knee[1] + (foot[1] - knee[1]) * f, knee[2] + (foot[2] - knee[2]) * f, 0.03, 0.14, BK, { rz: sd * -1.2, seg: 4 });
      sh.box(pb, foot[0], 0.04, foot[2], 0.18, 0.08, 0.26, BK);
    };
    const tri = (legsDef) => sh.part('tripod', 0, 0, 0, (pb) => { for (const [sd, z, dz] of legsDef) leg(pb, sd, z, dz); });
    const triA = tri([[-1, 0.7, 0.55], [1, -0.4, 0], [-1, -1.5, -0.55]]);
    const triB = tri([[1, 0.7, 0.55], [-1, -0.4, 0], [1, -1.5, -0.55]]);
    // the sun disc rolled ahead, held by the front legs
    const sunG = new THREE.Group(); sunG.position.set(0, 0.58, 2.1);
    const sun = sh.part('sun', 0, 0, 0, (pb) => {
      sh.ell(pb, 0, 0, 0, 0.42, 0.42, 0.42, 0xff6a10, { seg: 16, lit: 0xff5a10, k: 1.3 });
      for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2; sh.cone(pb, 0, cos(a) * 0.5, sin(a) * 0.5, 0.05, 0.16, 0xffc040, { rx: a, r2: 0.12, seg: 4, lit: 0xffc040 }); }
      for (const sd of [-1, 1]) sh.cylX(pb, sd * 0.3, 0, 0, 0.38, 0.06, 0xffc040, { seg: 16, lit: 0xffc040 });
    });
    sunG.add(sun);
    const arms = sh.part('sunarms', 0, 0, 0, (pb) => { for (const sd of [-1, 1]) { sh.tube(pb, [sd * 0.45, 0.85, 1.15], [sd * 0.62, 0.7, 1.85], 0.06, BK, { seg: 6 }); sh.tube(pb, [sd * 0.62, 0.7, 1.85], [sd * 0.5, 0.6, 2.1], 0.05, BK, { seg: 6 }); } });
    // gauzy wings that buzz out on boost and in the air
    const wings = sh.part('wings', 0, 1.35, -0.6, (pb) => {
      for (const sd of [-1, 1]) sh.ell(pb, sd * 0.95, 0.15, -0.6, 0.85, 0.03, 0.5, 0xffe9b0, { ry: sd * 0.5, rz: sd * 0.25, seg: 12, m: { trans: true, opacity: 0.45, emissive: 0xffb040, emissiveIntensity: 0.3 } });
    });
    wings.visible = false;
    let ph = 0;
    return {
      mesh, seat: [0, 1.48, -0.35], control: 'bars', parts: [triA, triB, arms, wings, sunG],
      wheels: [{ g: new THREE.Group(), spin: sun, front: false, r: 0.58 }],
      exhaust: [[0.32, 0.75, -2.15], [-0.32, 0.75, -2.15]],
      fx(s, dt) {
        ph += dt * (2.5 + s.speed01 * 13);
        const pace = s.grounded ? Math.min(1, 0.25 + s.speed01 * 1.2) : 0;
        for (let i = 0; i < 2; i++) {
          const g = i ? triB : triA, o = i * PI;
          g.position.z = cos(ph + o) * 0.3 * pace;
          g.position.y = Math.max(0, sin(ph + o)) * 0.22 * pace + (s.grounded ? 0 : 0.15);
        }
        sunG.position.y = 0.58 + (s.grounded ? 0 : 0.05);
        const fly = s.boosting || s.gliding || !s.grounded;
        wings.visible = fly;
        if (fly) { wings.scale.set(1, 1, 0.8 + Math.abs(sin(s.t * 45)) * 0.35); wings.rotation.z = sin(s.t * 45) * 0.08; }
        const up = mesh.parent;
        if (up) { up.position.y = Math.abs(sin(ph)) * 0.05 * pace; up.rotation.z = sin(ph) * 0.03 * pace + s.steer * 0.05; }
      },
    };
  },
};

// ---- Dino Dina: a T-rex skeleton on two ammonite wheels, chomping and flailing ------------
export const dina = {
  id: 'dina', name: 'Fossil Flyer', form: 'Skeleton dicycle', blurb: 'Bones, chomps and tiny arms',
  stats: { speed: 4, accel: 2, handling: 3, weight: 4 },
  colors: [0x237841, 0xfe8a18, 0xece2c6, 0xbbe90b],
  build(K) {
    const { THREE, BrickBuilder, C } = K;
    const sh = kit(K);
    const BN = 0xece2c6, BK = C.black, GR = C.green, OR = C.orange, SH = 0xd08a3a, SHD = 0x9a5a22;
    const WR = 0.95, WZ = -0.3, WX = 1.22;
    const b = new BrickBuilder(0.4);
    // pelvis on the axle, saddle
    sh.cylX(b, 0, WR, WZ, 0.1, WX * 2 - 0.3, BN, { seg: 8 });
    sh.box(b, 0, 1.12, WZ - 0.05, 1.0, 0.3, 0.8, BN);
    for (const sd of [-1, 1]) sh.box(b, sd * 0.42, 0.98, WZ, 0.14, 0.42, 0.6, BN, { rz: sd * 0.3 });
    sh.box(b, 0, 1.3, WZ - 0.05, 0.85, 0.1, 0.75, GR);
    for (let i = 0; i < 3; i++) sh.ell(b, -0.25 + i * 0.25, 1.36, WZ - 0.1 + (i % 2) * 0.2, 0.08, 0.02, 0.08, OR, { seg: 8 });
    sh.box(b, 0, 1.55, WZ - 0.48, 0.8, 0.5, 0.1, GR);
    // spine forward to the shoulders, ribs hanging below like a cage
    const spine = (z0, y0, z1, y1, n, r) => {
      for (let i = 0; i <= n; i++) {
        const f = i / n, z = z0 + (z1 - z0) * f, y = y0 + (y1 - y0) * f;
        sh.box(b, 0, y, z, r * 1.4, r * 1.1, r * 1.2, BN);
        sh.cone(b, 0, y + r * 0.9, z, r * 0.35, r * 1.3, BN, { rx: -0.4, seg: 4 });
      }
    };
    spine(0.25, 1.15, 1.35, 1.25, 6, 0.17);
    for (let i = 0; i < 5; i++) {
      const z = 0.4 + i * 0.22, R = 0.55 - Math.abs(i - 1.5) * 0.06;
      sh.arcXY(b, 0, 1.15, z, R, -PI + 0.35, -0.35, 7, 0.07, 0.07, BN);
    }
    sh.box(b, 0, 0.62, 0.85, 0.12, 0.08, 1.0, BN);
    // ammonite fender plates over the wheels
    for (const sd of [-1, 1]) sh.arc(b, sd * WX, WR, WZ, WR + 0.14, 0.4, 2.7, 7, 0.3, 0.06, BN);
    const mesh = b.build({ name: 'dina' });

    // ammonite wheels: a ribbed spiral shell disc
    const ammo = (sd) => {
      const g = new THREE.Group(); g.position.set(sd * WX, WR, WZ);
      const ab = new BrickBuilder(0.4);
      sh.cylX(ab, 0, 0, 0, WR - 0.06, 0.32, SH, { seg: 22 });
      sh.tor(ab, 0, 0, 0, WR - 0.06, 0.08, SHD, { ry: PI / 2, seg: 24, sz: (WR - 0.06) * 2 });
      for (const fx of [-1, 1]) {
        for (let i = 0; i < 34; i++) {
          const a = i * 0.42, r = (WR - 0.12) * Math.exp(-a / 7.5);
          if (r < 0.08) break;
          sh.box(ab, fx * 0.17, sin(a) * r, cos(a) * r, 0.04, 0.05 + r * 0.1, r * 0.42, SHD, { rx: PI / 2 - a });
        }
        sh.cylX(ab, fx * 0.165, 0, 0, 0.1, 0.03, 0x6a3a14, { seg: 10 });
      }
      const spin = new THREE.Group(); spin.add(ab.build({ name: 'ammonite' })); g.add(spin);
      return { g, spin, front: false, r: WR };
    };
    // skull with a chomping jaw, at the end of the neck
    const skull = new THREE.Group(); skull.position.set(0, 1.25, 1.3);
    const kb = new BrickBuilder(0.4);
    sh.box(kb, 0, 0.12, 0.2, 0.38, 0.26, 0.4, BN);                 // neck stub
    sh.box(kb, 0, 0.25, 0.65, 0.62, 0.48, 0.7, BN);
    sh.box(kb, 0, 0.18, 1.12, 0.44, 0.34, 0.5, BN);
    for (const sd of [-1, 1]) {
      sh.box(kb, sd * 0.31, 0.32, 0.6, 0.02, 0.18, 0.2, BK);         // eye sockets
      sh.ell(kb, sd * 0.31, 0.32, 0.6, 0.02, 0.05, 0.05, OR, glow(0xff8000, 2));
      sh.box(kb, sd * 0.31, 0.15, 0.88, 0.02, 0.14, 0.24, BK);
      sh.box(kb, sd * 0.12, 0.3, 1.38, 0.06, 0.06, 0.02, BK);        // nostrils
      for (let k = 0; k < 4; k++) sh.cone(kb, sd * 0.19, -0.04, 1.3 - k * 0.15, 0.04, 0.14, C.white, { rx: PI, seg: 4 });
    }
    sh.box(kb, 0, 0.5, 0.55, 0.2, 0.06, 0.5, BN);
    skull.add(kb.build({ name: 'skull' }));
    const jaw = sh.part('jaw', 0, 0.02, 0.45, (pb) => {
      sh.box(pb, 0, -0.08, 0.45, 0.5, 0.14, 0.9, BN);
      for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) sh.cone(pb, sd * 0.18, 0.06, 0.82 - k * 0.15, 0.035, 0.12, C.white, { seg: 4 });
    });
    skull.add(jaw);
    // tiny arms that flail
    const arms = sh.part('arms', 0, 0.95, 1.25, (pb) => {
      for (const sd of [-1, 1]) {
        sh.tube(pb, [sd * 0.25, 0, 0], [sd * 0.38, -0.2, 0.15], 0.04, BN, { seg: 6 });
        sh.tube(pb, [sd * 0.38, -0.2, 0.15], [sd * 0.36, -0.12, 0.35], 0.035, BN, { seg: 6 });
        for (const dx of [-0.03, 0.03]) sh.cone(pb, sd * 0.36 + dx, -0.12, 0.42, 0.02, 0.1, BK, { rx: PI / 2, seg: 4 });
      }
    });
    // the tail sweeps behind on a little skid wheel
    const tail = new THREE.Group(); tail.position.set(0, 1.1, -0.7);
    const tb = new BrickBuilder(0.4);
    for (let i = 0; i < 9; i++) {
      const f = i / 8, z = -f * 1.75, y = -f * 0.62 + sin(f * PI) * 0.12, r = 0.17 - f * 0.1;
      sh.box(tb, 0, y, z, r * 1.5, r * 1.2, 0.18, BN);
      sh.cone(tb, 0, y + r, z, r * 0.3, r * 1.3, BN, { rx: -0.6, seg: 4 });
    }
    sh.tube(tb, [0, -0.62, -1.75], [0, -0.85, -1.75], 0.04, C.dkgray, { seg: 6 });
    tail.add(tb.build({ name: 'tail' }));
    const skid = new THREE.Group(); skid.position.set(0, -0.88, -1.75); tail.add(skid);
    const skidSpin = new THREE.Mesh(K.wheelGeo(0.22, 0.16, OR, [0]), K.wheelMat); skid.add(skidSpin);
    let ph = 0, chomp = 0;
    return {
      mesh, seat: [0, 1.42, WZ - 0.05], control: 'bars', parts: [skull, arms, tail],
      wheels: [ammo(1), ammo(-1), { g: new THREE.Group(), spin: skidSpin, front: false, r: 0.22 }],
      exhaust: [[0.3, 1.2, -0.95, -PI / 2 + 0.3], [-0.3, 1.2, -0.95, -PI / 2 + 0.3]],
      fx(s, dt) {
        ph += dt * (3 + s.speed01 * 9);
        chomp += dt * (4 + s.speed01 * 8 + (s.boosting ? 10 : 0));
        jaw.rotation.x = 0.08 + Math.max(0, sin(chomp)) * (s.boosting ? 0.6 : 0.35);
        skull.rotation.y = -s.steer * 0.35;
        skull.rotation.x = sin(ph * 0.5) * 0.06 - (s.boosting ? 0.15 : 0);
        arms.rotation.x = sin(s.t * 14) * 0.5;
        arms.rotation.z = sin(s.t * 11) * 0.15;
        tail.rotation.y = s.steer * 0.45 + sin(ph * 0.5) * 0.12;
        const up = mesh.parent;
        // a biped bob and a lean-back wheelie when boosting
        if (up) pitchAbout(up, (s.boosting ? -0.12 : 0) + sin(ph) * 0.03 * s.speed01, WR, WZ, Math.abs(sin(ph)) * 0.04 * s.speed01);
      },
    };
  },
};
