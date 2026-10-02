// Wild Rides vehicle pack (see buildVehicle in ../characters.js for the contract):
// a chopper, a monster truck, a tank, a bathtub, a hot dog and a rocket sled.
import { shapes, pitchAbout, fitOf, clamp, grow } from './wild-kit.js';

const CHROME = { metal: 0.85, rough: 0.22 };
const chrome = (o = {}) => ({ ...o, matOpts: CHROME });
const glow = (e, i = 1, o = {}) => ({ ...o, matOpts: { emissive: e, emissiveIntensity: i } });
const ease = (dt, k) => Math.min(1, dt * k);
const BACK = -Math.PI / 2;   // boost flames pointing straight back

// ---- Thunder Hog: a raked-out chopper that leans into turns and wheelies on boost ----------
const thunderHog = {
  id: 'thunderhog', name: 'Thunder Hog', form: 'Chopper', blurb: 'Leans hard into every bend',
  stats: { speed: 3, accel: 4, handling: 5, weight: 1 }, colors: [0xfe8a18, 0x1b2a34, 0xa0a5a9],
  build(kit) {
    const { THREE, BrickBuilder, C, wheelGeo, wheelMat, sprung } = kit;
    const sh = shapes(kit), f = fitOf(kit.rig);
    const OR = 0xfe8a18, BK = C.black, LG = C.ltgray;
    const RZ = -1.45, RR = 0.56, FR = 0.5;          // rear axle z, rear/front wheel radius
    const H = [0, 1.3, 0.95], A = [0, FR, 1.95];    // steering head, front axle
    const b = new BrickBuilder(0.4);
    // frame
    sh.tube(b, H, [0, 0.98, -0.65], 0.07, BK);
    sh.tube(b, [0, 1.22, 1.0], [0, 0.36, 0.5], 0.07, BK);
    sh.tube(b, [0, 0.36, 0.5], [0, 0.36, -0.75], 0.07, BK);
    sh.tube(b, [0, 1.43, 0.79], [0, 1.2, 1.07], 0.11, BK);                 // head tube
    for (const sd of [-1, 1]) {
      sh.tube(b, [sd * 0.25, RR, RZ], [sd * 0.17, 0.38, -0.72], 0.055, BK); // swingarm
      sh.tube(b, [sd * 0.25, RR, RZ], [sd * 0.15, 0.95, -0.8], 0.05, BK);   // seat stay
      sh.box(b, sd * 0.27, RR, RZ, 0.06, 0.16, 0.22, LG, chrome());
      sh.box(b, sd * 0.4, 0.42, 0.45, 0.28, 0.06, 0.12, BK);                // foot pegs
    }
    // teardrop tank with a flame band
    sh.ell(b, 0, 1.13, 0.4, 0.33, 0.22, 0.52, OR, { seg: 16 });
    sh.ell(b, 0, 1.07, 0.42, 0.34, 0.09, 0.48, C.yellow, { seg: 16 });
    b.cyl(0, 1.3, 0.3, 0.06, 0.05, LG, { matOpts: CHROME, seg: 8 });
    // V-twin engine
    sh.box(b, 0, 0.53, 0.05, 0.42, 0.36, 0.62, C.dkgray);
    sh.tube(b, [0, 0.62, 0.12], [0, 0.98, 0.42], 0.16, LG, chrome({ seg: 10 }));
    sh.tube(b, [0, 0.62, -0.02], [0, 0.95, -0.3], 0.16, LG, chrome({ seg: 10 }));
    for (const [y, z] of [[0.98, 0.42], [0.95, -0.3]]) sh.box(b, 0, y, z, 0.3, 0.1, 0.3, BK);
    sh.cylX(b, -0.27, 0.78, 0.08, 0.17, 0.08, LG, chrome({ seg: 14 }));
    sh.ell(b, 0.25, 0.45, -0.25, 0.06, 0.2, 0.35, LG, chrome());
    // saddle, sissy bar and back rest
    sh.box(b, 0, 0.9, -0.55, 0.48, 0.12, 0.74, BK);
    sh.box(b, 0, 0.98, -0.98, 0.42, 0.16, 0.24, BK);
    for (const sd of [-1, 1]) sh.tube(b, [sd * 0.2, 0.95, -1.05], [sd * 0.2, 1.75, -1.2], 0.04, LG, chrome());
    sh.tube(b, [-0.2, 1.75, -1.2], [0.2, 1.75, -1.2], 0.04, LG, chrome());
    sh.box(b, 0, 1.5, -1.16, 0.36, 0.3, 0.08, BK, { rx: -0.18 });
    // studded leather saddlebags either side of the rear wheel
    for (const sd of [-1, 1]) {
      sh.box(b, sd * 0.47, 0.92, -1.4, 0.26, 0.42, 0.7, C.brown);
      sh.box(b, sd * 0.48, 1.12, -1.4, 0.3, 0.06, 0.74, C.rbrown);
      for (const z of [-1.6, -1.2]) sh.box(b, sd * 0.605, 0.98, z, 0.02, 0.2, 0.06, LG, chrome());
    }
    // rear fender + tail light
    sh.arc(b, 0, RR, RZ, RR + 0.12, 0.35, 2.8, 7, 0.5, 0.06, OR);
    sh.box(b, 0, 0.88, -2.08, 0.22, 0.1, 0.08, C.red, glow(0xff2010, 1.2, { rx: 0.4 }));
    // shotgun exhaust pipes on the left
    for (const [y, y0, z0] of [[0.48, 0.6, 0.3], [0.72, 0.85, -0.2]]) {
      sh.tube(b, [-0.18, y0, z0], [-0.37, y, z0 - 0.45], 0.07, LG, chrome());
      sh.tube(b, [-0.37, y, z0 - 0.45], [-0.39, y, -2.0], 0.07, LG, chrome());
      sh.cylZ(b, -0.39, y, -2.0, 0.09, 0.12, BK, { seg: 10 });
    }
    const mesh = b.build({ name: 'thunderhog' });

    // raked front fork: pivots on the head tube axis and carries the front wheel
    const rake = -Math.atan2(A[2] - H[2], H[1] - A[1]);
    const L = Math.hypot(A[2] - H[2], H[1] - A[1]);
    const fork = new THREE.Group(); fork.position.set(...H); fork.rotation.x = rake;
    const steerG = new THREE.Group(); fork.add(steerG);
    const fb = new BrickBuilder(0.4);
    for (const sd of [-1, 1]) {
      sh.tube(fb, [sd * 0.15, 0.24, 0], [sd * 0.15, -L, 0], 0.055, LG);
      sh.box(fb, sd * 0.15, -L, 0, 0.08, 0.16, 0.16, C.dkgray);
    }
    sh.box(fb, 0, 0.12, 0, 0.44, 0.08, 0.16, BK); sh.box(fb, 0, -0.18, 0, 0.44, 0.08, 0.16, BK);
    // headlight facing the road (world forward = local (0, -sin, cos) of -rake)
    const fw = [0, -Math.sin(-rake), Math.cos(-rake)], upv = [0, Math.cos(-rake), Math.sin(-rake)];
    const at = (f, u) => [0, fw[1] * f + upv[1] * u, fw[2] * f + upv[2] * u];
    const hl = at(0.28, -0.08), ln = at(0.42, -0.08);
    sh.ell(fb, 0, hl[1], hl[2], 0.17, 0.17, 0.17, LG);
    sh.ell(fb, 0, ln[1], ln[2], 0.14, 0.14, 0.05, C.yellow, glow(0xfff0a0, 1.6, { ax: -rake }));
    sh.arc(fb, 0, -L, 0, FR + 0.1, 0.5, 2.3, 6, 0.3, 0.05, OR, { frame: -rake });
    steerG.add(fb.build({ name: 'fork' }));
    const fSpin = new THREE.Mesh(wheelGeo(FR, 0.22, LG, [0]), wheelMat);
    fSpin.position.set(0, -L, 0); steerG.add(fSpin);
    const rSpin = new THREE.Mesh(wheelGeo(RR, 0.42, OR, [0]), wheelMat);
    rSpin.position.set(0, RR, RZ);

    // a big rider gets a slightly broader bike (wheels stay round: y and z scale alike); it should
    // still look small under them
    const kx = clamp(1 + (f.W - 1.3) * 0.25, 1, 1.15), k = 1 + f.big * 0.03;
    let lean = 0, pitch = 0;
    return {
      mesh: grow(THREE, [mesh, fork, rSpin], kx, k, k), seat: [0, 0.97 * k, -0.5 * k], control: 'bars',
      exhaust: [[-0.39 * kx, 0.48 * k, -2.1 * k, BACK + 0.15], [-0.39 * kx, 0.72 * k, -2.1 * k, BACK + 0.15]],
      wheels: [{ g: new THREE.Group(), spin: rSpin, front: false, r: RR * k }, { g: new THREE.Group(), spin: fSpin, front: false, r: FR * k }],
      fx(s, dt) {
        steerG.rotation.y = -s.steer * 0.35;
        lean += (s.steer * 0.34 * Math.min(1, 0.25 + s.speed01 * 1.5) - lean) * ease(dt, 6);
        pitch += ((s.boosting && s.grounded ? -0.2 : 0) - pitch) * ease(dt, 5);
        sprung.rotation.z = lean;
        pitchAbout(sprung, pitch, 0, RZ * k);
      },
    };
  },
};

// ---- Big Stomp: a monster truck with a toothy grin, bouncy shocks and boost wheelies -------
const bigStomp = {
  id: 'bigstomp', name: 'Big Stomp', form: 'Monster truck', blurb: 'Tyres taller than you',
  stats: { speed: 3, accel: 2, handling: 2, weight: 5 }, colors: [0xbbe90b, 0x81007b, 0x1b2a34],
  build(kit) {
    const { THREE, BrickBuilder, C, wheelGeo, wheelMat, sprung } = kit;
    const sh = shapes(kit), f = fitOf(kit.rig);
    const LI = 0xbbe90b, PU = 0x81007b, LG = C.ltgray;
    const CX = clamp(f.hip + 0.09, 0.86, 0.98);   // cab sides clear broad hips
    const R = 0.78, WX = 1.2, WZ = 1.4, WW = 0.6;
    const b = new BrickBuilder(0.4);
    // chassis, axles, diffs and coil-over shocks
    for (const sd of [-1, 1]) sh.box(b, sd * 0.5, 0.98, 0, 0.16, 0.22, 3.8, C.dkgray);
    for (const z of [-WZ, WZ]) {
      sh.cylX(b, 0, R, z, 0.1, 2 * WX - 0.3, C.dkgray, { seg: 10 });
      sh.ell(b, 0, R, z, 0.24, 0.24, 0.22, C.dkgray, { seg: 10 });
      for (const sd of [-1, 1]) for (const dz of [-0.28, 0.28]) {
        sh.tube(b, [sd * 0.72, R, z + dz], [sd * 0.68, 1.34, z + dz * 1.15], 0.05, LG, chrome());
        sh.tube(b, [sd * 0.715, R + 0.2, z + dz * 1.04], [sd * 0.69, 1.2, z + dz * 1.12], 0.1, C.yellow, { seg: 10 });
      }
    }
    // tub, hood with a blower, open cab, bed
    sh.box(b, 0, 1.55, 0, 1.84, 0.5, 4.1, LI);
    sh.box(b, 0, 1.88, 1.38, 1.7, 0.16, 1.34, LI);
    sh.box(b, 0, 2.06, 1.25, 0.5, 0.22, 0.6, LG, chrome());
    sh.box(b, 0, 2.25, 1.32, 0.56, 0.18, 0.42, C.black);
    for (const sd of [-1, 1]) {
      sh.box(b, sd * CX, 2.0, -0.2, 0.14, 0.4, 1.6, PU);
      sh.box(b, sd * CX, 1.93, -1.55, 0.14, 0.26, 1.0, PU);
      // flared fenders, mud flaps, side flames
      for (const z of [-WZ, WZ]) sh.box(b, sd * WX, 1.7, z, WW + 0.2, 0.12, 1.7, PU);
      sh.box(b, sd * WX, 1.15, -WZ - 0.92, 0.6, 0.7, 0.05, C.black);
      sh.box(b, sd * 0.93, 1.5, 0.9, 0.02, 0.12, 1.2, C.orange, { rx: -0.12 });
      sh.box(b, sd * 0.93, 1.42, 0.6, 0.02, 0.1, 1.0, C.red, { rx: -0.2 });
    }
    sh.box(b, 0, 2.02, 0.6, 1.6, 0.44, 0.22, C.black);       // dash
    sh.box(b, 0, 1.93, -2.0, 1.6, 0.26, 0.12, PU);            // tailgate
    sh.box(b, 0, 2.08, -0.86, clamp(f.hip * 2 - 0.3, 0.9, 1.5), 0.55, 0.14, C.black);      // seat back
    // roll bar with a light bar (taller for a tall driver)
    const top = 2.85 + f.big * 0.55;
    for (const sd of [-1, 1]) sh.tube(b, [sd * CX, 2.15, -1.1], [sd * (CX - 0.06), top, -1.15], 0.07, PU);
    sh.tube(b, [0.06 - CX, top, -1.15], [CX - 0.06, top, -1.15], 0.07, PU);
    sh.box(b, 0, top + 0.13, -1.15, 1.1, 0.22, 0.14, C.black);
    for (let i = -1; i <= 1; i++) sh.cylZ(b, i * 0.34, top + 0.13, -1.06, 0.09, 0.06, C.yellow, glow(0xffe080, 1.1));
    // exhaust stacks
    for (const sd of [-1, 1]) {
      sh.tube(b, [sd * 0.55, 1.8, -1.5], [sd * 0.55, 2.55, -1.5], 0.09, LG, chrome({ seg: 10 }));
      b.cyl(sd * 0.55, 2.55, -1.5, 0.11, 0.06, C.black, { seg: 10 });
    }
    // the face: chrome grille, shark teeth, googly headlight eyes with angry brows
    sh.box(b, 0, 1.55, 2.07, 1.5, 0.42, 0.08, C.black);
    for (let i = -3; i <= 3; i++) sh.box(b, i * 0.21, 1.55, 2.11, 0.06, 0.36, 0.04, LG, chrome());
    for (let i = 0; i < 7; i++) sh.cone(b, -0.6 + i * 0.2, 1.71, 2.15, 0.075, 0.2, C.white, { rx: Math.PI, seg: 6 });
    sh.box(b, 0, 1.25, 2.18, 1.9, 0.14, 0.12, LG, chrome());
    for (const sd of [-1, 1]) {
      sh.ell(b, sd * 0.5, 2.08, 1.98, 0.21, 0.21, 0.12, C.white, glow(0xfff6c0, 0.35));
      sh.ell(b, sd * 0.47, 2.06, 2.08, 0.09, 0.09, 0.05, C.black);
      sh.box(b, sd * 0.5, 2.34, 1.98, 0.38, 0.07, 0.1, PU, { rz: sd * 0.35 });
    }
    const mesh = b.build({ name: 'bigstomp' });

    // wheels ride in the sprung group so the whole truck can wheelie
    const wheelsG = new THREE.Group();
    const rear = new THREE.Mesh(wheelGeo(R, WW, PU, [WX, -WX]), wheelMat);
    rear.position.set(0, R, -WZ); wheelsG.add(rear);
    const fronts = [WX, -WX].map((x) => {
      const g = new THREE.Group(); g.position.set(x, R, WZ);
      const m = new THREE.Mesh(wheelGeo(R, WW, PU, [0]), wheelMat); g.add(m); wheelsG.add(g);
      return { g, m };
    });
    let pitch = 0, droop = 0;
    return {
      mesh, seat: [0, 1.78, -0.4], control: 'wheel', parts: [wheelsG], exhaust: [[0.55, 2.6, -1.5, -0.67], [-0.55, 2.6, -1.5, -0.67]],
      wheels: [{ g: new THREE.Group(), spin: rear, front: false, r: R }, ...fronts.map((f) => ({ g: new THREE.Group(), spin: f.m, front: false, r: R }))],
      fx(s, dt) {
        for (const w of fronts) w.g.rotation.y = -s.steer * 0.4;
        const bob = Math.sin(s.t * 10) * 0.035 * (0.25 + s.speed01) + Math.sin(s.t * 3.7) * 0.02;
        droop += ((s.grounded ? 0 : 0.2) - droop) * ease(dt, 6);
        pitch += ((s.boosting && s.grounded ? -0.17 : 0) - pitch) * ease(dt, 4);
        pitchAbout(sprung, pitch, 0, -WZ, bob);
        wheelsG.position.y = -bob - droop;
      },
    };
  },
};

// ---- Tread Head: a little tank with rolling treads and a cannon that fires on boost --------
const treadHead = {
  id: 'treadhead', name: 'Tread Head', form: 'Tank', blurb: 'Treads first, ask later',
  stats: { speed: 2, accel: 3, handling: 3, weight: 5 }, colors: [0x237841, 0xe4cd9e, 0x184632],
  build(kit) {
    const { THREE, BrickBuilder, C } = kit;
    const sh = shapes(kit), f = fitOf(kit.rig);
    const GR = 0x237841, TN = 0xe4cd9e, OL = 0x184632, BK = C.black;
    const HD = clamp(f.hip + 0.02, 0.58, 0.85) - 0.58;   // the hatch (and turret) widen round broad hips
    const TX = 1.3, TW = 0.5, SR = 0.39, SY = 0.45, SZ = 1.75, SP = 0.3;
    const b = new BrickBuilder(0.4);
    // hull and sloped glacis
    sh.box(b, 0, 0.55, -0.05, 1.9, 0.6, 3.6, GR);
    sh.box(b, 0, 0.6, 1.98, 1.9, 0.3, 0.74, GR, { rx: 0.83 });
    sh.box(b, 0, 0.92, -0.15, 2.0, 0.14, 3.4, OL);
    for (const sd of [-1, 1]) {
      sh.box(b, sd * TX, 0.98, 0, 0.64, 0.08, 4.0, GR);                  // track guards
      sh.box(b, sd * TX, 0.81, 0, TW, 0.06, 2 * SZ, BK);                 // belt: top run
      sh.box(b, sd * TX, 0.09, 0, TW, 0.06, 2 * SZ, BK);                 // belt: bottom run
      sh.arc(b, sd * TX, SY, SZ, SR, -Math.PI / 2, Math.PI / 2, 5, TW, 0.06, BK);
      sh.arc(b, sd * TX, SY, -SZ, SR, Math.PI / 2, Math.PI * 1.5, 5, TW, 0.06, BK);
      for (const z of [-1.05, -0.35, 0.35, 1.05]) {
        sh.cylX(b, sd * TX, 0.32, z, 0.24, 0.42, C.dkgray, { seg: 12 });
        sh.cylX(b, sd * TX, 0.32, z, 0.1, 0.46, C.ltgray, { seg: 8 });
      }
      sh.box(b, sd * 0.4, 1.12, 2.05, 0.2, 0.14, 0.1, C.yellow);           // headlights
      sh.cylZ(b, sd * 0.55, 0.75, -1.9, 0.08, 0.22, C.dkgray, { seg: 8 });  // exhausts
    }
    // turret, hatch collar, open lid, antenna, roundels, crates
    b.cyl(0, 0.99, -0.3, 0.82 + HD, 0.42, GR, { rz: 0.95 + HD * 0.6, seg: 20 });
    b.cyl(0, 1.41, -0.3, 0.7 + HD, 0.05, OL, { rz: 0.82 + HD * 0.6, seg: 20 });
    b.cyl(0, 1.41, -0.42, 0.58 + HD, 0.3, OL, { rz: 0.74 + HD * 0.6, seg: 16 });
    sh.box(b, 0, 1.86, -1.08 - HD * 0.6, 0.7 + HD * 2, 0.5, 0.06, GR, { rx: -0.3 });
    sh.tube(b, [0.55 + HD, 1.4, -0.95 - HD * 0.5], [0.6 + HD, 2.7, -1.15 - HD * 0.5], 0.02, BK, { seg: 4 });
    sh.box(b, 0.6 + HD, 2.55, -1.32 - HD * 0.5, 0.03, 0.2, 0.3, C.yellow);
    for (const sd of [-1, 1]) {
      sh.cylX(b, sd * (0.82 + HD), 1.2, -0.3, 0.18, 0.03, TN, { seg: 14 });
      sh.cylX(b, sd * (0.835 + HD), 1.2, -0.3, 0.09, 0.02, C.red, { seg: 10 });
    }
    b.brick(-0.4, 0.99, -1.45, 2, 2, 2, TN); b.brick(0.4, 0.99, -1.45, 2, 2, 2, TN);
    const mesh = b.build({ name: 'treadhead' });

    // treads: top cleats roll forward, bottom ones back; sprockets spin
    const cleats = (y, z0) => {
      const tb = new BrickBuilder(0.4);
      for (const sd of [-1, 1]) for (let i = 0; i < 11; i++) sh.box(tb, sd * TX, y, z0 + i * SP, TW + 0.04, 0.06, 0.13, C.dkgray);
      const g = new THREE.Group(); g.add(tb.build({ name: 'tread' })); return g;
    };
    const topT = cleats(0.87, -1.6), botT = cleats(0.03, -1.4);
    const sprocket = (z) => {
      const g = new THREE.Group(); g.position.set(0, SY, z);
      const sb = new BrickBuilder(0.4);
      for (const sd of [-1, 1]) {
        sh.cylX(sb, sd * TX, 0, 0, 0.3, 0.4, C.dkgray, { seg: 12 });
        sh.cylX(sb, sd * TX, 0, 0, 0.12, 0.46, C.ltgray, { seg: 8 });
        for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; sh.box(sb, sd * TX, Math.sin(a) * 0.31, Math.cos(a) * 0.31, 0.32, 0.14, 0.12, C.dkgray, { rx: Math.PI / 2 - a }); }
      }
      g.add(sb.build({ name: 'sprocket' })); return g;
    };
    const sprockets = [sprocket(SZ), sprocket(-SZ)];
    // cannon (swings with the steering, recoils and flashes while boosting)
    const gun = new THREE.Group(); gun.position.set(0, 1.18, 0.5);
    const gb = new BrickBuilder(0.4);
    sh.box(gb, 0, 0, 0.1, 0.62, 0.36, 0.32, OL);
    sh.cylZ(gb, 0, 0, 1.0, 0.1, 1.6, GR, { seg: 12 });
    sh.cylZ(gb, 0, 0, 1.92, 0.15, 0.28, C.dkgray, { seg: 12 });
    gun.add(gb.build({ name: 'gun' }));
    const flash = new THREE.Group(); flash.position.set(0, 0, 2.06); flash.visible = false;
    const xb = new BrickBuilder(0.4);
    sh.cone(xb, 0, 0, 0.3, 0.26, 0.6, C.yellow, { rx: Math.PI / 2, seg: 8, matOpts: { emissive: 0xffa020, emissiveIntensity: 2.5 } });
    flash.add(xb.build({ name: 'flash' })); gun.add(flash);

    let phase = 0;
    return {
      mesh, seat: [0, 1.47 - f.wide * 0.25, -0.5], control: 'yoke', parts: [topT, botT, ...sprockets, gun], exhaust: [[0.55, 0.75, -2.03, BACK], [-0.55, 0.75, -2.03, BACK]],
      steer: [{ obj: gun, axis: 'y', amount: 0.3 }],
      fx(s, dt) {
        const v = s.speed01 * 7 * dt;
        phase = (phase + v) % SP;
        topT.position.z = phase; botT.position.z = -phase;
        for (const g of sprockets) g.rotation.x += v / SR;
        const c = (s.t * 3.5) % 1;
        gun.position.z = 0.5 - (s.boosting ? Math.max(0, 1 - c * 4) * 0.2 : 0);
        flash.visible = s.boosting && c < 0.18;
        flash.scale.setScalar(0.7 + c * 3);
      },
    };
  },
};

// ---- Tub Thumper: a pink claw-foot bathtub on wheels, foaming with bubbles -----------------
const tubThumper = {
  id: 'tubthumper', name: 'Tub Thumper', form: 'Bathtub', blurb: 'Bath time at full throttle',
  stats: { speed: 3, accel: 4, handling: 3, weight: 2 }, colors: [0xfc97ac, 0xf4f4f4, 0xdcbc81],
  build(kit) {
    const { THREE, BrickBuilder, C, plastic } = kit;
    const sh = shapes(kit), f = fitOf(kit.rig);
    const PK = 0xfc97ac, WH = C.white, GD = 0xdcbc81, LG = C.ltgray;
    // the tub is as wide as the bather needs (k scales it across)
    const k = clamp(f.hip + 0.07, 0.88, 1.05) / 0.88;
    const TZ = -0.15, FZ = 1.0, BZ = -1.15, WXo = 0.92 * k;
    const b = new BrickBuilder(0.4);
    b.cyl(0, 0.3, TZ, 0.78 * k, 0.15, PK, { rz: 1.3, seg: 24 });
    b.cyl(0, 0.42, TZ, 0.95 * k, 0.72, PK, { rz: 1.55, seg: 24 });
    b.cyl(0, 1.12, TZ, 1.02 * k, 0.11, WH, { rz: 1.62, seg: 24 });
    b.cyl(0, 1.23, TZ, 0.88 * k, 0.012, 0x9fdcf0, { rz: 1.48, seg: 24 });   // bath water
    // foam
    for (const [x, z, r] of [[0.55, 0.2, 0.22], [-0.55, 0.1, 0.24], [0.42, 0.72, 0.2], [-0.4, 0.78, 0.18], [0.6, -0.6, 0.2], [-0.62, -0.7, 0.22], [0.12, 0.98, 0.16], [-0.18, -1.3, 0.18], [0.35, -1.15, 0.2], [0, 0.45, 0.2]]) {
      sh.ell(b, x * k, 1.25, z, r, r * 0.7, r, WH, { seg: 10 });
    }
    // claw feet down to the wheels
    for (const sd of [-1, 1]) for (const [z0, z1] of [[0.82, FZ], [-0.95, BZ]]) {
      sh.tube(b, [sd * 0.55 * k, 0.6, z0], [sd * 0.78 * k, 0.34, z1], 0.08, GD);
      sh.ell(b, sd * 0.78 * k, 0.32, z1, 0.13, 0.11, 0.15, GD, { seg: 10 });
    }
    // faucet and taps at the front
    sh.tube(b, [0, 1.15, 1.32], [0, 1.78, 1.28], 0.06, LG, chrome());
    sh.tube(b, [0, 1.78, 1.28], [0, 1.88, 1.05], 0.06, LG, chrome());
    sh.tube(b, [0, 1.88, 1.05], [0, 1.76, 0.9], 0.06, LG, chrome());
    for (const sd of [-1, 1]) {
      b.cyl(sd * 0.24, 1.2, 1.25, 0.05, 0.16, LG, { matOpts: CHROME, seg: 8 });
      sh.box(b, sd * 0.24, 1.38, 1.25, 0.2, 0.05, 0.05, sd > 0 ? C.red : C.blue);
      sh.cylZ(b, sd * 0.35, 0.5, -1.72, 0.08, 0.34, LG, chrome({ seg: 10 }));   // drain-pipe exhausts
    }
    // rubber duck on the rim
    const DX = 0.58 * k;
    sh.ell(b, DX, 1.36, 0.82, 0.16, 0.13, 0.21, C.yellow, { seg: 12 });
    sh.ell(b, DX, 1.57, 0.93, 0.11, 0.11, 0.11, C.yellow, { seg: 12 });
    sh.box(b, DX, 1.55, 1.05, 0.1, 0.05, 0.12, C.orange);
    for (const sd of [-1, 1]) sh.ell(b, DX + sd * 0.07, 1.61, 1.01, 0.022, 0.022, 0.022, C.black, { seg: 6 });
    // towel over the back
    sh.box(b, 0, 1.0, -1.79, 0.72, 0.42, 0.04, C.azure);
    sh.box(b, 0, 1.25, -1.62, 0.72, 0.04, 0.32, C.azure);
    for (const y of [0.88, 1.08]) sh.box(b, 0, y, -1.815, 0.72, 0.05, 0.02, WH);
    const mesh = b.build({ name: 'tubthumper' });

    // bubbles drift up off the bath (one instanced mesh, matrices reused every frame)
    const NB = 12;
    const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), plastic(0xdff6ff, { trans: true, opacity: 0.45, rough: 0.08 }), NB);
    bub.frustumCulled = false;
    const ph = [], bx = [], bz = [];
    for (let i = 0; i < NB; i++) { ph.push(i / NB); bx.push(Math.sin(i * 2.4) * 0.66 * k); bz.push(TZ + Math.cos(i * 2.4) * 1.1); }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
    return {
      mesh, seat: [0, 1.1, -0.35], control: 'wheel', parts: [bub], exhaust: [[0.35, 0.5, -1.92, BACK], [-0.35, 0.5, -1.92, BACK]],
      wheels: [{ x: 0, z: BZ, r: 0.32, w: 0.26, xs: [WXo, -WXo], cap: GD }, { x: WXo, z: FZ, r: 0.32, w: 0.26, front: true, cap: GD }, { x: -WXo, z: FZ, r: 0.32, w: 0.26, front: true, cap: GD }],
      fx(s, dt) {
        const rate = 0.3 + s.speed01 * 0.45 + (s.boosting ? 1.3 : 0);
        for (let i = 0; i < NB; i++) {
          ph[i] = (ph[i] + dt * rate * (0.8 + (i % 3) * 0.15)) % 1;
          const p = ph[i];
          const sz = (0.06 + 0.12 * p + (i % 4) * 0.015) * (p > 0.88 ? (1 - p) / 0.12 : 1);
          V.set(bx[i] + Math.sin(s.t * 2 + i) * 0.12 * p, 1.25 + p * 1.9, bz[i] - p * (0.3 + s.speed01 * 1.6));
          bub.setMatrixAt(i, M.compose(V, Q, Sc.setScalar(Math.max(0.001, sz))));
        }
        bub.instanceMatrix.needsUpdate = true;
      },
    };
  },
};

// ---- Hot Diggity: a hot dog on wheels with condiment-bottle boosters -----------------------
const hotDiggity = {
  id: 'hotdiggity', name: 'Hot Diggity', form: 'Hot dog', blurb: 'Relish the competition',
  stats: { speed: 4, accel: 3, handling: 3, weight: 3 }, colors: [0xd9923b, 0xb3361f, 0xf2cd37],
  build(kit) {
    const { THREE, BrickBuilder, C } = kit;
    const sh = shapes(kit), f = fitOf(kit.rig);
    const BUN = 0xd9923b, CRUMB = 0xf6d69a, SAU = 0xb3361f, MUS = 0xf2cd37, KET = 0xc91a09, WH = C.white;
    const DX = clamp(f.hip - 0.6, 0, 0.25);   // the bun opens wider round broad hips
    const b = new BrickBuilder(0.4);
    // the bun
    sh.ell(b, 0, 0.5, 0, 0.82 + DX, 0.26, 2.1, BUN, { seg: 16 });
    for (const sd of [-1, 1]) {
      sh.ell(b, sd * (0.5 + DX), 0.74, 0, 0.56, 0.4, 2.15, BUN, { seg: 18 });
      sh.ell(b, sd * (0.36 + DX), 0.86, 0, 0.36, 0.3, 2.02, CRUMB, { seg: 14 });
    }
    for (const z of [-1.45, 1.45]) sh.cylX(b, 0, 0.42, z, 0.06, 2.3 + DX * 2, C.dkgray, { seg: 6 });
    // cocktail pick with an olive and a flag
    sh.tube(b, [0.1, 1.2, -2.0], [0.1, 2.3, -2.1], 0.025, C.tan, { seg: 5 });
    sh.ell(b, 0.1, 1.55, -2.03, 0.1, 0.1, 0.1, C.green, { seg: 10 });
    sh.box(b, 0.1, 2.15, -2.28, 0.03, 0.22, 0.36, C.red);
    // ketchup and mustard squeeze bottles as exhausts
    for (const sd of [-1, 1]) {
      const col = sd > 0 ? KET : MUS;
      sh.cylZ(b, sd * 0.62, 1.05, -1.95, 0.16, 0.6, col, { seg: 12 });
      sh.cylZ(b, sd * 0.62, 1.05, -1.95, 0.165, 0.2, WH, { seg: 12 });
      sh.cylZ(b, sd * 0.62, 1.05, -2.3, 0.1, 0.1, WH, { seg: 10 });
      sh.cone(b, sd * 0.62, 1.05, -2.45, 0.07, 0.22, WH, { rx: -Math.PI / 2, seg: 8 });
    }
    const mesh = b.build({ name: 'hotdiggity' });

    // the sausage (front "hood" and rear "tail") with grill marks and a mustard zigzag; it wobbles
    const sg = new THREE.Group(); sg.position.set(0, 1.0, 0);
    const sb = new BrickBuilder(0.4);
    const pieces = [[1.45, 1.12], [-1.62, 0.98]];
    const topY = (x, z, zc, rz) => 0.32 * Math.sqrt(Math.max(0, 1 - (x / 0.34) ** 2 - ((z - zc) / rz) ** 2));
    for (const [zc, rz] of pieces) {
      sh.ell(sb, 0, 0, zc, 0.34, 0.32, rz, SAU, { seg: 16 });
      for (let z = zc - rz * 0.65; z <= zc + rz * 0.66; z += 0.42) sh.box(sb, 0, topY(0, z, zc, rz) - 0.012, z, 0.4, 0.03, 0.07, 0x6a1e10, { ry: 0.6 });
      let prev = null;
      for (let k = 0, z = zc - rz * 0.78; z <= zc + rz * 0.8; k++, z += 0.15) {
        const x = k % 2 ? 0.13 : -0.13, pt = [x, topY(x, z, zc, rz) + 0.025, z];
        if (prev) sh.tube(sb, prev, pt, 0.045, MUS, { seg: 6 });
        prev = pt;
      }
    }
    sg.add(sb.build({ name: 'sausage' }));
    // condiment squirts while boosting
    const sq = new THREE.Group(); sq.position.set(0, 1.05, -2.5); sq.visible = false;
    const qb = new BrickBuilder(0.4);
    for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) sh.ell(qb, sd * 0.62, -i * 0.035, -0.12 - i * 0.26, 0.1 - i * 0.012, 0.09 - i * 0.01, 0.15, sd > 0 ? KET : MUS, { seg: 8 });
    sq.add(qb.build({ name: 'squirt' }));

    const WX = 1.22 + DX;
    return {
      mesh, seat: [0, 0.92, -0.18], control: 'wheel', parts: [sg, sq], exhaust: [[0.62, 1.05, -2.58, BACK], [-0.62, 1.05, -2.58, BACK]],
      wheels: [{ x: 0, z: -1.45, r: 0.42, w: 0.36, xs: [WX, -WX], cap: MUS }, { x: WX, z: 1.45, r: 0.42, w: 0.36, front: true, cap: MUS }, { x: -WX, z: 1.45, r: 0.42, w: 0.36, front: true, cap: MUS }],
      fx(s, dt) {
        const w = Math.sin(s.t * 21) * 0.05 * (0.3 + s.speed01 + (s.boosting ? 0.8 : 0));
        sg.scale.set(1 - w * 0.5, 1 + w, 1);
        sq.visible = s.boosting;
        if (s.boosting) sq.scale.set(1, 1, 0.75 + Math.abs(Math.sin(s.t * 23)) * 0.5);
      },
    };
  },
};

// ---- Blast Sled: skis, fins and a rocket that never quite switches off ---------------------
const blastSled = {
  id: 'blastsled', name: 'Blast Sled', form: 'Rocket sled', blurb: 'Skis, fins and a rocket',
  stats: { speed: 5, accel: 2, handling: 2, weight: 3 }, colors: [0xc91a09, 0xf4f4f4, 0xfe8a18],
  build(kit) {
    const { THREE, BrickBuilder, C, sprung } = kit;
    const sh = shapes(kit), f = fitOf(kit.rig);
    const RD = 0xc91a09, WH = C.white, LG = C.ltgray;
    const RY = 1.12;
    // the cockpit (and the skis under it) widen round broad hips; a broad driver sits a little
    // further forward so their back stays clear of the rocket's nose
    const SX = clamp(f.hip + 0.09, 0.62, 0.95), KX = Math.max(0.85, SX + 0.23), SZ = -0.4 + f.wide * 0.2;
    const b = new BrickBuilder(0.4);
    // skis with upturned tips on struts
    for (const sd of [-1, 1]) {
      sh.box(b, sd * KX, 0.04, -0.2, 0.28, 0.08, 4.0, LG, chrome());
      sh.box(b, sd * KX, 0.17, 2.01, 0.28, 0.08, 0.5, LG, chrome({ rx: -0.55 }));
      sh.box(b, sd * KX, 0.43, 2.3, 0.28, 0.08, 0.3, LG, chrome({ rx: -1.1 }));
      for (const z of [-1.5, 0, 1.2]) sh.tube(b, [sd * KX, 0.08, z], [sd * (SX - 0.07), 0.5, z], 0.05, C.dkgray);
      sh.box(b, sd * SX, 0.86, -0.25, 0.14, 0.36, 1.9, RD);   // cockpit sides
    }
    sh.box(b, 0, 0.55, -0.15, SX * 2 + 0.06, 0.3, 2.3, RD);
    sh.ell(b, 0, 0.62, 1.05, SX + 0.03, 0.4, 1.25, RD, { seg: 18 });
    sh.ell(b, 0, 0.63, 1.05, 0.2, 0.41, 1.26, WH, { seg: 14 });
    sh.box(b, 0, 1.12, 0.45, SX * 2 - 0.34, 0.32, 0.04, C.azure, { rx: -0.5, matOpts: { trans: true, opacity: 0.45 } });
    // the rocket behind the seat
    sh.box(b, 0, 0.82, -1.7, 0.5, 0.3, 1.0, C.dkgray);
    sh.cylZ(b, 0, RY, -1.75, 0.42, 1.4, WH, { seg: 18 });
    sh.ell(b, 0, RY, -1.05, 0.42, 0.42, 0.3, RD, { seg: 18 });
    for (const z of [-1.5, -2.2]) sh.cylZ(b, 0, RY, z, 0.43, 0.12, RD, { seg: 18 });
    for (const a of [0, 2.094, -2.094]) sh.box(b, Math.sin(a) * 0.6, RY + Math.cos(a) * 0.6, -2.25, 0.06, 0.42, 0.6, RD, { rz: -a });
    sh.cone(b, 0, RY, -2.6, 0.34, 0.36, C.dkgray, { rx: Math.PI / 2, seg: 14 });
    const mesh = b.build({ name: 'blastsled' });

    // rocket flame: always lit, roars on boost
    const fl = new THREE.Group(); fl.position.set(0, RY, -2.78);
    const flb = new BrickBuilder(0.4);
    sh.cone(flb, 0, 0, -0.5, 0.28, 1.0, 0xff5a00, { rx: -Math.PI / 2, seg: 12, matOpts: { trans: true, opacity: 0.8, emissive: 0xff3a00, emissiveIntensity: 1.6 } });
    sh.cone(flb, 0, 0, -0.32, 0.15, 0.64, 0xffc020, { rx: -Math.PI / 2, seg: 10, matOpts: { emissive: 0xffb000, emissiveIntensity: 1.4 } });
    fl.add(flb.build({ name: 'rocketflame' }));
    // sparks off the ski tails
    const sp = new THREE.Group(); sp.position.set(0, 0.05, -2.25);
    const spb = new BrickBuilder(0.4);
    for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) sh.box(spb, sd * (0.85 + Math.sin(i * 3.1) * 0.14), 0.04 + (i % 3) * 0.07, -i * 0.13, 0.05, 0.05, 0.16, C.yellow, { ry: Math.sin(i * 1.7) * 0.6, matOpts: { emissive: 0xffc040, emissiveIntensity: 2.5 } });
    sp.add(spb.build({ name: 'sparks' }));

    return {
      mesh, seat: [0, 0.78, SZ], control: 'yoke', parts: [fl, sp], exhaust: [[0.12, RY, -2.8, BACK], [-0.12, RY, -2.8, BACK]],
      fx(s, dt) {
        const t = s.t, boost = s.boosting ? 1 : 0;
        const f = (0.35 + s.speed01 * 0.65 + boost * 0.9) * (0.85 + Math.sin(t * 47) * 0.1 + Math.sin(t * 31) * 0.06);
        fl.scale.set(1 + boost * 0.35, 1 + boost * 0.35, f);
        sp.visible = s.grounded && s.speed01 > 0.3 && Math.sin(t * 61) > -0.3;
        sp.scale.set(1, 1, 0.6 + Math.abs(Math.sin(t * 37)));
        sprung.position.y = s.grounded ? Math.abs(Math.sin(t * 38)) * 0.015 * (s.speed01 + boost) : 0;
      },
    };
  },
};

export default [thunderHog, bigStomp, treadHead, tubThumper, hotDiggity, blastSled];
