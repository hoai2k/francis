// Sonic Rides vehicle pack (see buildVehicle in ../characters.js for the contract): Sonic's
// Speed Star racer, Tails' Tornado biplane, Eggman's Egg Mobile, an Extreme Gear hoverboard,
// Knuckles' Land Breaker 4x4 and Shadow's Dark Rider motorbike.
import {
  THREE, BrickBuilder, C, PI, S, CO, CHROME, GLASS, LIT, BACK, M, G, rbox, geo, ell, rod, ring, glow, jetMat,
  clamp, fitOf, grow, pitchAbout, ease, findGlider,
} from './sonic-kit.js';

const SPARE = new THREE.TorusGeometry(0.4, 0.17, 8, 16);
const BLUE = 0x1f5fd8, SRED = 0xd8202c, WHITE = 0xf4f4f4, GOLD = 0xf2c020;

// ---- Speed Star: Sonic's low blue racer with white stripes and a gold-ring badge ---------------------
const speedStar = {
  id: 'speedstar', name: 'Speed Star', form: 'Racing car', blurb: "Sonic's blue racer, built to go fast",
  stats: { speed: 5, accel: 3, handling: 3, weight: 2 }, colors: [BLUE, WHITE, SRED, GOLD],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const cw = clamp(f.hip + 0.22, 0.62, 1.12);   // cockpit half-width
    const lamp = glow(0xfff0b0, 0.9, { base: 0xfff4d0 }), badge = glow(0xffc21a, 0.6, { base: 0xffc21a });
    const b = new BrickBuilder(0.4);
    // floor pan and the cockpit tub
    rbox(b, 0, 0.22, -0.1, cw * 2 + 0.3, 0.2, 3.0, 0, 0, 0, C.black);
    for (const sd of [-1, 1]) {
      rbox(b, sd * cw, 0.62, -0.3, 0.2, 0.6, 1.9, 0, 0, 0, BLUE);
      rbox(b, sd * (cw + 0.02), 0.95, -0.3, 0.24, 0.07, 1.9, 0, 0, 0, WHITE);
      // side pods with a white speed stripe and a red flash
      rbox(b, sd * (cw + 0.35), 0.48, -0.1, 0.55, 0.4, 2.0, 0, 0, 0, BLUE);
      rbox(b, sd * (cw + 0.35), 0.69, -0.1, 0.57, 0.04, 1.9, 0, 0, 0, WHITE);
      rbox(b, sd * (cw + 0.64), 0.5, 0.2, 0.02, 0.16, 1.2, 0, 0, 0, SRED);
      rbox(b, sd * (cw + 0.35), 0.45, 0.95, 0.5, 0.3, 0.2, 0.5, 0, 0, BLUE);
    }
    rbox(b, 0, 0.45, 0.62, cw * 2, 0.5, 0.3, 0, 0, 0, BLUE);                                  // dash bulkhead
    // long nose with a white centre stripe, the gold ring badge and the front wing
    rbox(b, 0, 0.55, 1.45, 1.1, 0.42, 1.6, 0.12, 0, 0, BLUE);
    rbox(b, 0, 0.77, 1.42, 0.3, 0.02, 1.55, 0.12, 0, 0, WHITE);
    ell(b, 0, 0.42, 2.25, 0.5, 0.24, 0.35, BLUE);
    ring(b, 0, 0.62, 2.05, 0.17, 0, { mat: badge });
    rbox(b, 0, 0.2, 2.45, 2.6, 0.08, 0.45, 0, 0, 0, WHITE);
    for (const sd of [-1, 1]) { rbox(b, sd * 1.3, 0.3, 2.45, 0.06, 0.3, 0.55, 0, 0, 0, SRED); geo(b, G.cylZ, 0, M(sd * 0.32, 0.5, 2.5, 0, 0, 0, 0.08, 0.08, 0.04), { mat: lamp }); }
    rbox(b, 0, 1.0, 0.8, 1.2, 0.36, 0.04, -0.6, 0, 0, C.azure, GLASS);                       // windscreen
    // headrest hump, engine cover with intakes, rear wing on struts and twin chrome pipes
    rbox(b, 0, 0.75, -1.25, cw * 2, 0.7, 0.35, 0, 0, 0, BLUE);
    ell(b, 0, 1.1, -1.35, 0.4, 0.35, 0.35, BLUE);
    rbox(b, 0, 0.55, -1.7, 1.4, 0.5, 0.7, 0, 0, 0, C.dkgray);
    for (const sd of [-1, 1]) { rbox(b, sd * 0.3, 0.86, -1.7, 0.18, 0.12, 0.5, 0, 0, 0, C.black); rod(b, [sd * 0.35, 0.55, -1.9], [sd * 0.35, 0.55, -2.25], 0.1, C.ltgray, CHROME); }
    for (const sd of [-1, 1]) rbox(b, sd * 0.6, 1.12, -1.95, 0.08, 0.7, 0.4, 0, 0, 0, C.black);
    rbox(b, 0, 1.5, -2.0, 2.5, 0.1, 0.6, 0.08, 0, 0, WHITE);
    for (const sd of [-1, 1]) rbox(b, sd * 1.25, 1.38, -2.0, 0.08, 0.36, 0.7, 0, 0, 0, SRED);
    rbox(b, 0, 1.56, -2.0, 1.0, 0.02, 0.4, 0.08, 0, 0, BLUE);
    const mesh = b.build({ name: 'speedstar' });
    let pitch = 0;
    return {
      mesh, seat: [0, 0.48, -0.35], control: 'wheel',
      wheels: [{ x: 0, z: -1.25, r: 0.5, w: 0.5, xs: [cw + 0.75, -cw - 0.75], cap: SRED }, { x: cw + 0.62, z: 1.4, r: 0.38, w: 0.36, front: true, cap: SRED }, { x: -cw - 0.62, z: 1.4, r: 0.38, w: 0.36, front: true, cap: SRED }],
      exhaust: [[0.35, 0.55, -2.3, BACK], [-0.35, 0.55, -2.3, BACK]],
      fx(s, dt) {
        pitch += ((s.boosting && s.grounded ? -0.05 : 0) - pitch) * ease(dt, 5);
        pitchAbout(sprung, pitch, 0, -1.25);
        badge.emissiveIntensity = 0.6 + (s.boosting ? 1.2 + S(s.t * 30) * 0.4 : 0);
        lamp.emissiveIntensity = 0.9 + (s.boosting ? 0.6 : 0);
      },
    };
  },
};

// ---- Tornado: Tails' red biplane on its landing gear; the propeller spins and it flies on its own wings --
const tornado = {
  id: 'tornado', name: 'Tornado', form: 'Biplane', blurb: "Tails' trusty biplane takes off on every ramp",
  stats: { speed: 3, accel: 4, handling: 4, weight: 2 }, colors: [SRED, WHITE, BLUE, 0xf5a224],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const cw = clamp(f.hip + 0.15, 0.55, 1.05), RD = SRED, DK = 0x9a1218;
    const b = new BrickBuilder(0.4);
    // fuselage: a long box tapering to the tail, open cockpit, white cheat line
    rbox(b, 0, 0.75, 0.1, cw * 2 + 0.1, 0.7, 2.6, 0, 0, 0, RD);
    rbox(b, 0, 0.82, -1.6, cw * 1.3, 0.5, 1.2, 0.12, 0, 0, RD);
    rbox(b, 0, 0.92, -2.35, 0.5, 0.32, 0.8, 0.22, 0, 0, RD);
    for (const sd of [-1, 1]) { rbox(b, sd * (cw + 0.06), 0.88, 0.1, 0.02, 0.1, 2.6, 0, 0, 0, WHITE); rbox(b, sd * cw * 0.65, 0.95, -1.6, 0.02, 0.08, 1.2, 0.12, sd * 0.12, 0, WHITE); }
    rbox(b, 0, 1.12, 0.75, cw * 2 + 0.1, 0.06, 0.9, 0, 0, 0, RD);                         // cowl deck ahead of the cockpit
    rbox(b, 0, 1.12, -0.95, cw * 2 + 0.1, 0.06, 0.45, 0, 0, 0, RD);
    rbox(b, 0, 1.3, 0.38, cw * 1.5, 0.36, 0.04, -0.4, 0, 0, C.azure, GLASS);                  // windscreen
    // the engine cowling, spinner hub and exhausts
    geo(b, G.cylZ, RD, M(0, 0.85, 1.6, 0, 0, 0, 0.55, 0.55, 0.5));
    geo(b, G.cylZ, C.dkgray, M(0, 0.85, 1.87, 0, 0, 0, 0.45, 0.45, 0.06));
    for (const sd of [-1, 1]) rod(b, [sd * 0.5, 0.55, 1.5], [sd * 0.55, 0.45, 0.9], 0.06, C.ltgray, CHROME);
    // lower wing through the fuselage, upper wing on struts ahead of the pilot
    const span = 2.0 + cw;
    rbox(b, 0, 0.5, 0.75, span * 2, 0.1, 0.85, 0, 0, 0, RD);
    rbox(b, 0, 1.72, 0.95, span * 2.05, 0.1, 0.85, 0, 0, 0, RD);
    for (const sd of [-1, 1]) {
      rbox(b, sd * (span - 0.35), 0.56, 0.75, 0.55, 0.02, 0.86, 0, 0, 0, WHITE);
      rbox(b, sd * (span - 0.35), 1.78, 0.95, 0.55, 0.02, 0.86, 0, 0, 0, WHITE);
      ring(b, sd * (span - 1.2), 1.79, 0.95, 0.18, 0, null, PI / 2);   // ring roundels
      for (const z of [0.55, 1.2]) rod(b, [sd * (span - 0.5), 0.55, z - 0.05], [sd * (span - 0.4), 1.7, z + 0.15], 0.04, C.dkgray);
      rod(b, [sd * (cw - 0.1), 1.12, 0.6], [sd * 0.5, 1.7, 0.95], 0.04, C.dkgray);
      // landing gear legs down to the wheels
      rod(b, [sd * 0.75, 0.5, 0.75], [sd * 1.0, 0.42, 0.75], 0.06, C.dkgray);
    }
    // tail: stabiliser, fin with a white stripe and the tail wheel strut
    rbox(b, 0, 1.0, -2.55, 2.1, 0.07, 0.55, 0, 0, 0, RD);
    rbox(b, 0, 1.35, -2.6, 0.08, 0.75, 0.6, 0, 0, 0, RD);
    rbox(b, 0, 1.45, -2.6, 0.1, 0.12, 0.6, 0, 0, 0, WHITE);
    rod(b, [0, 0.8, -2.4], [0, 0.22, -2.45], 0.05, C.dkgray);
    const mesh = b.build({ name: 'tornado' });
    // propeller (spun by speed; faster in the air)
    const prop = new THREE.Group(); prop.position.set(0, 0.85, 1.95);
    const pb = new BrickBuilder(0.4);
    rbox(pb, 0, 0, 0, 0.16, 1.9, 0.05, 0, 0.25, 0, 0x6a4022);
    for (const sd of [-1, 1]) rbox(pb, 0, sd * 0.86, 0, 0.17, 0.18, 0.06, 0, 0.25, 0, GOLD);
    ell(pb, 0, 0, 0.12, 0.17, 0.17, 0.2, WHITE);
    prop.add(pb.build({ name: 'tornado-prop' }));
    const blur = new THREE.Mesh(new THREE.CircleGeometry(0.98, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    blur.position.set(0, 0.85, 1.97); blur.visible = false;
    let pitch = 0, roll = 0, glider = null, extra = 0;
    return {
      mesh, parts: [prop, blur], seat: [0, 0.62, -0.4], control: 'yoke',
      wheels: [{ x: 1.0, z: 0.75, r: 0.42, w: 0.24, cap: GOLD }, { x: -1.0, z: 0.75, r: 0.42, w: 0.24, cap: GOLD }, { x: 0, z: -2.45, r: 0.22, w: 0.14 }],
      spin: [{ obj: prop, axis: 'z', rate: 26 }],
      exhaust: [[0.55, 0.45, 0.85, BACK, 0.6], [-0.55, 0.45, 0.85, BACK, 0.6]],
      fx(s, dt) {
        const air = s.gliding || !s.grounded;
        extra = air || s.boosting ? 30 : 0;
        prop.rotation.z += extra * dt;
        blur.visible = s.speed01 > 0.5 || air;
        // takes off on its own wings: no glider needed (unless the player picked one)
        glider ||= findGlider(sprung);
        if (glider && s.gliding && glider.userData.gliderId === 'kartwing') glider.visible = false;
        pitch += ((s.gliding ? -0.16 + S(s.t * 2) * 0.03 : s.boosting && s.grounded ? -0.04 : 0) - pitch) * ease(dt, 4);
        roll += ((s.gliding ? s.steer * 0.35 : 0) - roll) * ease(dt, 4);
        pitchAbout(sprung, pitch, 0, 0.75, s.gliding ? 0.15 : 0);
        sprung.rotation.z = roll;
      },
    };
  },
};

// ---- Egg Mobile: Eggman's floating silver pod with a glass screen and a jet underneath -------------
const eggMobile = {
  id: 'eggmobile', name: 'Egg Mobile', form: 'Hover pod', blurb: "Dr. Eggman's personal hover pod",
  stats: { speed: 4, accel: 2, handling: 3, weight: 4 }, colors: [0xc4c8cc, 0x1b1b22, GOLD, SRED],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const R = clamp(f.hip + 0.55, 1.0, 1.5), SIL = 0xc4c8cc, BK = 0x1b1b22;
    const jet = jetMat(0xffa030, 0.85), jet2 = jetMat(0xfff0a0, 0.9), lights = glow(0xff3020, 1.2, { base: 0xff6040 });
    const b = new BrickBuilder(0.4);
    // the pod: a silver bowl (open on top) with a dark inner floor and a yellow-and-black rim
    geo(b, G.bowl, SIL, M(0, 0.95, -0.1, 0, 0, 0, R, 0.85, R * 1.25));
    geo(b, G.bowl, BK, M(0, 0.25, -0.1, 0, 0, 0, R * 0.55, 0.35, R * 0.65));
    geo(b, G.cylY, 0x3a3e44, M(0, 0.55, -0.1, 0, 0, 0, R * 0.92, 0.06, R * 1.15));
    for (let k = 0; k < 16; k++) { const a = (k / 16) * PI * 2; rbox(b, S(a) * R, 0.97, -0.1 + CO(a) * R * 1.25, 0.32, 0.1, 0.12, 0, a, 0, k % 2 ? GOLD : BK); }
    // front console with the glass screen and buttons
    rbox(b, 0, 1.0, 0.75, 1.2, 0.35, 0.5, -0.3, 0, 0, BK);
    for (let i = -2; i <= 2; i++) rbox(b, i * 0.18, 1.2, 0.72, 0.1, 0.05, 0.1, -0.3, 0, 0, [SRED, GOLD, 0x30c040][(i + 2) % 3], LIT([0xff2020, 0xffc020, 0x30ff40][(i + 2) % 3], 0.8));
    geo(b, G.bowl, C.azure, M(0, 1.05, 0.55, -PI / 2 - 0.35, 0, 0, 0.75, 0.45, 0.6), GLASS);
    // the Eggman emblem on the nose: round face, goggles and moustache
    const nz = -0.1 + R * 1.18;
    geo(b, G.cylZ, GOLD, M(0, 0.6, nz, 0.25, 0, 0, 0.3, 0.3, 0.06));
    geo(b, G.cylZ, 0xf2c49a, M(0, 0.6, nz + 0.03, 0.25, 0, 0, 0.24, 0.24, 0.05));
    for (const sd of [-1, 1]) { ell(b, sd * 0.1, 0.64, nz + 0.07, 0.06, 0.06, 0.03, 0x3a7ad8); ell(b, sd * 0.1, 0.52, nz + 0.07, 0.12, 0.04, 0.03, 0xc0601a); }
    // side tail lights and little rear fins
    for (const sd of [-1, 1]) { ell(b, sd * R * 0.98, 0.85, -0.6, 0.08, 0.08, 0.08, 0, { mat: lights }); rbox(b, sd * R * 0.55, 1.15, -0.1 - R * 1.1, 0.06, 0.4, 0.4, -0.3, 0, 0, BK); }
    // underside thruster
    geo(b, G.cone, 0x6c6e68, M(0, 0.1, -0.1, PI, 0, 0, 0.45, 0.4, 0.45));
    geo(b, G.cylY, BK, M(0, -0.12, -0.1, 0, 0, 0, 0.32, 0.08, 0.32));
    const mesh = b.build({ name: 'eggmobile' });
    // jet flame below the pod
    const flame = new THREE.Group(); flame.position.set(0, -0.15, -0.1);
    const fo = new THREE.Mesh(G.cone, jet); fo.rotation.x = PI; fo.scale.set(0.26, 0.5, 0.26); fo.position.y = -0.25; flame.add(fo);
    const fi = new THREE.Mesh(G.cone, jet2); fi.rotation.x = PI; fi.scale.set(0.14, 0.32, 0.14); fi.position.y = -0.16; flame.add(fi);
    let tilt = 0, nose = 0;
    return {
      mesh, parts: [flame], seat: [0, 0.6, -0.25], control: 'yoke', hover: 0.5,
      exhaust: [[0.45, 1.2, -0.1 - R * 1.25, BACK, 0.8], [-0.45, 1.2, -0.1 - R * 1.25, BACK, 0.8]],
      fx(s, dt) {
        const k = 1 + S(s.t * 37) * 0.15 + (s.boosting ? 0.6 : 0) + s.speed01 * 0.3;
        flame.scale.set(1, k, 1);
        jet.opacity = 0.65 + S(s.t * 23) * 0.15;
        tilt += (s.steer * 0.16 - tilt) * ease(dt, 5);
        nose += ((s.boosting ? 0.1 : 0) - nose) * ease(dt, 4);
        sprung.rotation.z = tilt; sprung.rotation.x = nose;
        lights.emissiveIntensity = 1 + Math.max(0, S(s.t * 8)) * 0.8;
      },
    };
  },
};

// ---- Extreme Gear: a Sonic Riders air board with a saddle, wing tips and twin thrusters ---------------
const extremeGear = {
  id: 'extremegear', name: 'Extreme Gear', form: 'Hoverboard', blurb: 'Rides the air like Sonic Riders',
  stats: { speed: 3, accel: 5, handling: 4, weight: 1 }, colors: [0x2a6aff, WHITE, 0x30e0ff, SRED],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const bw = clamp(f.hip + 0.2, 0.62, 1.05), BL = 0x2a6aff;
    const thr = glow(0x30e0ff, 1.4, { base: 0x9af6ff }), jet = jetMat(0x40e8ff, 0.8);
    const b = new BrickBuilder(0.4);
    // the board: a long flat shape with white tips, a blue lightning flash and stripes
    ell(b, 0, 0.12, 0, bw, 0.09, 2.0, WHITE);
    ell(b, 0, 0.16, -0.05, bw * 0.92, 0.07, 1.82, BL);
    for (const sd of [-1, 1]) rbox(b, sd * bw * 0.45, 0.235, 0.2, 0.08, 0.02, 2.2, 0, sd * 0.06, 0, WHITE);
    rbox(b, 0, 0.24, 1.25, 0.5, 0.02, 0.2, 0, 0.6, 0, SRED); rbox(b, 0, 0.24, 1.0, 0.5, 0.02, 0.2, 0, -0.6, 0, SRED);
    rbox(b, 0, 0.22, 1.75, bw * 1.2, 0.08, 0.3, -0.3, 0, 0, WHITE);
    // wing tips at the back and swept fins
    for (const sd of [-1, 1]) {
      rbox(b, sd * (bw + 0.25), 0.2, -1.2, 0.7, 0.06, 0.6, 0, sd * 0.4, sd * -0.15, BL);
      rbox(b, sd * (bw + 0.5), 0.35, -1.35, 0.06, 0.4, 0.45, 0.3, 0, sd * 0.3, WHITE);
      // twin thrusters with glowing nozzles
      geo(b, G.cylZ, C.dkgray, M(sd * 0.35, 0.35, -1.55, 0, 0, 0, 0.2, 0.2, 0.6));
      geo(b, G.cylZ, 0, M(sd * 0.35, 0.35, -1.86, 0, 0, 0, 0.15, 0.15, 0.04), { mat: thr });
    }
    // saddle on a post, foot rests and a handle bar column
    rbox(b, 0, 0.32, -0.3, 0.3, 0.2, 0.5, 0, 0, 0, C.dkgray);
    rbox(b, 0, 0.5, -0.35, clamp(f.hip * 2, 0.8, 1.6), 0.14, 0.7, 0, 0, 0, C.black);
    for (const sd of [-1, 1]) rbox(b, sd * f.hip * 0.6, 0.28, 0.65, 0.35, 0.08, 0.5, 0, 0, 0, C.dkgray);
    rod(b, [0, 0.22, 1.1], [0, 0.95, 0.75], 0.05, C.dkgray);
    const mesh = b.build({ name: 'extremegear' });
    // air trail under the board
    const trail = new THREE.Group();
    for (const sd of [-1, 1]) { const m = new THREE.Mesh(G.cone, jet); m.rotation.x = -PI / 2; m.scale.set(0.12, 0.8, 0.12); m.position.set(sd * 0.35, 0.35, -2.25); trail.add(m); }
    let lean = 0, nose = 0;
    return {
      mesh, parts: [trail], seat: [0, 0.6, -0.35], control: 'bars', hover: 0.45,
      exhaust: [[0.35, 0.8, -1.95, BACK, 0.7], [-0.35, 0.8, -1.95, BACK, 0.7]],
      fx(s, dt) {
        lean += (s.steer * 0.3 * Math.min(1, 0.3 + s.speed01 * 1.4) - lean) * ease(dt, 6);
        nose += ((s.boosting ? -0.08 : s.gliding ? -0.12 : 0) - nose) * ease(dt, 4);
        sprung.rotation.z = lean; sprung.rotation.x = nose;
        const k = 0.5 + s.speed01 * 0.8 + (s.boosting ? 0.8 : 0);
        trail.scale.set(1, 1, k); trail.position.z = -2.25 * (k - 1) * 0.4;
        thr.emissiveIntensity = 1.2 + s.speed01 + (s.boosting ? 1.2 + S(s.t * 40) * 0.4 : 0);
      },
    };
  },
};

// ---- Land Breaker: Knuckles' red 4x4 with a bull bar, roll cage and big knobbly tyres -----------------
const landBreaker = {
  id: 'landbreaker', name: 'Land Breaker', form: '4x4', blurb: "Knuckles' off-roader smashes through anything",
  stats: { speed: 3, accel: 2, handling: 3, weight: 5 }, colors: [SRED, 0x2f9a3a, GOLD, C.black],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const cw = clamp(f.hip + 0.22, 0.75, 1.15), RD = SRED, GR = 0x2f9a3a, BK = C.black, R = 0.66;
    const lamp = glow(0xfff0b0, 1.0, { base: 0xfff4d0 });
    const b = new BrickBuilder(0.4);
    // chassis rails and the red body tub over the big wheels
    rbox(b, 0, 0.62, 0, cw * 2, 0.24, 3.6, 0, 0, 0, BK);
    for (const sd of [-1, 1]) {
      rbox(b, sd * cw, 1.05, -0.3, 0.2, 0.62, 2.2, 0, 0, 0, RD);
      rbox(b, sd * (cw + 0.02), 1.38, -0.3, 0.26, 0.08, 2.2, 0, 0, 0, GR);
      // chunky fenders over the wheels, green stripe, yellow flash
      for (const z of [-1.3, 1.3]) { rbox(b, sd * (cw + 0.42), 1.38, z, 0.8, 0.14, 1.5, 0, 0, 0, RD); rbox(b, sd * (cw + 0.42), 1.25, z + Math.sign(z) * 0.7, 0.8, 0.3, 0.12, 0, 0, 0, RD); }
      rbox(b, sd * (cw + 0.11), 0.95, -0.3, 0.02, 0.12, 1.8, 0, 0, 0, GOLD);
      rbox(b, sd * (cw + 0.03), 0.6, 0, 0.3, 0.12, 1.4, 0, 0, 0, C.dkgray);                     // side steps
    }
    rbox(b, 0, 0.98, -1.4, cw * 2 + 0.2, 0.75, 0.2, 0, 0, 0, RD);
    rbox(b, 0, 0.8, -1.95, cw * 2, 0.4, 1.0, 0, 0, 0, RD);                                     // rear deck
    // bonnet, grille, bull bar and lamps
    rbox(b, 0, 1.05, 1.3, cw * 2, 0.6, 1.5, 0, 0, 0, RD);
    rbox(b, 0, 1.36, 1.25, cw * 1.4, 0.08, 1.2, 0, 0, 0, GR);
    rbox(b, 0, 1.0, 2.06, cw * 1.6, 0.42, 0.06, 0, 0, 0, C.dkgray);
    for (let i = -2; i <= 2; i++) rbox(b, i * 0.22, 1.0, 2.1, 0.06, 0.36, 0.04, 0, 0, 0, C.ltgray, CHROME);
    rod(b, [-cw * 0.9, 0.62, 2.35], [cw * 0.9, 0.62, 2.35], 0.07, C.ltgray, CHROME);
    rod(b, [-cw * 0.9, 1.05, 2.3], [cw * 0.9, 1.05, 2.3], 0.07, C.ltgray, CHROME);
    for (const sd of [-1, 1]) { rod(b, [sd * cw * 0.8, 0.5, 2.1], [sd * cw * 0.8, 1.1, 2.32], 0.07, C.ltgray, CHROME); geo(b, G.cylZ, 0, M(sd * cw * 0.72, 1.18, 2.06, 0, 0, 0, 0.13, 0.13, 0.05), { mat: lamp }); }
    rbox(b, 0, 1.55, 0.6, cw * 2, 0.45, 0.04, -0.35, 0, 0, C.azure, GLASS);
    // roll cage with a light bar and a spare tyre on the deck
    const top = 0.62 + clamp(f.H * 0.8, 1.5, 2.1);
    for (const sd of [-1, 1]) { rod(b, [sd * cw, 1.4, -1.35], [sd * cw * 0.85, top, -1.4], 0.07, BK); rod(b, [sd * cw * 0.85, top, -1.4], [sd * cw * 0.85, 1.2, -2.35], 0.07, BK); }
    rod(b, [-cw * 0.85, top, -1.4], [cw * 0.85, top, -1.4], 0.07, BK);
    for (let i = -1; i <= 1; i++) geo(b, G.cylZ, GOLD, M(i * 0.35, top, -1.33, 0, 0, 0, 0.1, 0.1, 0.1), LIT(0xffe080, 0.6));
    geo(b, SPARE, BK, M(0, 1.45, -2.2, 0, 0, 0, 1, 1, 1));
    geo(b, G.cylZ, C.ltgray, M(0, 1.45, -2.2, 0, 0, 0, 0.24, 0.24, 0.3), CHROME);
    const mesh = b.build({ name: 'landbreaker' });
    let bounce = 0, pitch = 0;
    return {
      mesh, seat: [0, 1.05, -0.4], control: 'wheel',
      wheels: [{ x: 0, z: -1.3, r: R, w: 0.6, xs: [cw + 0.42, -cw - 0.42], cap: GOLD }, { x: cw + 0.42, z: 1.3, r: R, w: 0.6, front: true, cap: GOLD }, { x: -cw - 0.42, z: 1.3, r: R, w: 0.6, front: true, cap: GOLD }],
      exhaust: [[cw * 0.6, 0.9, -2.5, BACK], [-cw * 0.6, 0.9, -2.5, BACK]],
      fx(s, dt) {
        bounce = s.grounded ? Math.abs(S(s.t * 9)) * 0.03 * s.speed01 : 0.04;
        pitch += ((s.boosting && s.grounded ? -0.12 : 0) - pitch) * ease(dt, 5);
        pitchAbout(sprung, pitch, 0, -1.3, bounce);
        lamp.emissiveIntensity = 1 + (s.boosting ? 0.8 : 0);
      },
    };
  },
};

// ---- Dark Rider: Shadow's black-and-red sport bike; leans into turns and wheelies on boost -----------
const darkRider = {
  id: 'darkrider', name: 'Dark Rider', form: 'Motorbike', blurb: "Shadow's sleek black bike, Chaos-fast",
  stats: { speed: 5, accel: 4, handling: 2, weight: 2 }, colors: [0x24252c, SRED, GOLD, C.ltgray],
  build(kit) {
    const { wheelGeo, wheelMat, sprung } = kit;
    const f = fitOf(kit.rig), BK = 0x24252c, RD = SRED;
    const RZ = -1.35, RR = 0.55, FZ = 1.6, FR = 0.5;
    const neonR = glow(0xff2a2a, 1.4, { base: 0xff4040 });
    const b = new BrickBuilder(0.4);
    // frame and swingarm
    rod(b, [0, 0.55, -0.6], [0, 0.95, 0.9], 0.08, C.dkgray);
    for (const sd of [-1, 1]) rod(b, [sd * 0.22, RR, RZ], [sd * 0.18, 0.55, -0.55], 0.06, C.dkgray);
    // engine block and the black fairing with red flashes
    rbox(b, 0, 0.55, 0.05, 0.5, 0.45, 0.8, 0, 0, 0, C.dkgray);
    rbox(b, 0, 1.0, 0.3, 0.56, 0.36, 0.95, 0.08, 0, 0, BK);                                     // tank
    rbox(b, 0, 1.02, 1.0, 0.64, 0.52, 0.6, -0.45, 0, 0, BK);                                    // angular nose fairing
    rbox(b, 0, 0.8, 1.25, 0.5, 0.3, 0.45, -0.2, 0, 0, BK);
    rbox(b, 0, 0.62, 0.55, 0.62, 0.3, 1.0, 0, 0, 0, BK);                                         // belly pan
    for (const sd of [-1, 1]) {
      rbox(b, sd * 0.4, 0.88, 0.5, 0.03, 0.12, 1.3, 0.25, 0, 0, RD);
      rbox(b, sd * 0.42, 0.72, 0.35, 0.03, 0.06, 1.0, 0.2, 0, 0, 0, { mat: neonR });
      rbox(b, sd * 0.36, 0.45, 0.4, 0.3, 0.06, 0.12, 0, 0, 0, BK);                              // foot pegs
    }
    rbox(b, 0, 1.3, 1.25, 0.6, 0.35, 0.04, -0.6, 0, 0, 0x6a7a8a, GLASS);                      // smoked screen
    for (const sd of [-1, 1]) rbox(b, sd * 0.13, 0.98, 1.42, 0.18, 0.07, 0.05, -0.45, 0, sd * 0.25, 0xfff0b0, LIT(0xfff0b0, 1.4));
    // saddle and tail unit, twin exhausts
    rbox(b, 0, 0.88, -0.55, clamp(f.hip * 1.4, 0.5, 1.0), 0.14, 0.8, 0, 0, 0, C.black);
    rbox(b, 0, 1.02, -1.15, 0.45, 0.25, 0.8, 0.25, 0, 0, BK);
    rbox(b, 0, 1.08, -1.6, 0.25, 0.08, 0.06, 0.4, 0, 0, RD, LIT(0xff2010, 1.2));
    rbox(b, 0, 1.0, -1.25, 0.04, 0.05, 0.6, 0.25, 0, 0, RD);
    for (const sd of [-1, 1]) { rod(b, [sd * 0.2, 0.45, -0.2], [sd * 0.32, 0.7, -1.6], 0.08, C.ltgray, CHROME); geo(b, G.cylZ, C.black, M(sd * 0.32, 0.7, -1.62, -0.2, 0, 0, 0.1, 0.1, 0.06)); }
    // rear fender
    rbox(b, 0, 1.0, RZ - 0.1, 0.4, 0.06, 0.6, -0.3, 0, 0, BK);
    const mesh = b.build({ name: 'darkrider' });
    // front fork pivot with the steering head
    const fork = new THREE.Group(); fork.position.set(0, 1.15, 1.05); fork.rotation.x = 0.35;
    const steerG = new THREE.Group(); fork.add(steerG);
    const L = Math.hypot(FZ - 1.05, 1.15 - FR);
    const fb = new BrickBuilder(0.4);
    for (const sd of [-1, 1]) rod(fb, [sd * 0.14, 0.15, 0], [sd * 0.14, -L, 0], 0.05, C.ltgray, CHROME);
    rbox(fb, 0, -L + 0.62, 0.02, 0.4, 0.05, 0.7, -0.35, 0, 0, BK);                               // front mudguard
    steerG.add(fb.build({ name: 'darkrider-fork' }));
    const fSpin = new THREE.Mesh(wheelGeo(FR, 0.24, RD, [0]), wheelMat); fSpin.position.set(0, -L, 0); steerG.add(fSpin);
    fork.rotation.x = Math.atan2(FZ - 1.05, 1.15 - FR);
    const rSpin = new THREE.Mesh(wheelGeo(RR, 0.38, RD, [0]), wheelMat); rSpin.position.set(0, RR, RZ);
    // glowing red rim rings
    const rims = [];
    for (const [p, r, z, y] of [[steerG, FR, 0, -L], [null, RR, RZ, RR]]) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.035, 6, 24), neonR); m.rotation.y = PI / 2;
      if (p) { m.position.set(0, y, z); p.add(m); } else { m.position.set(0, y, z); rims.push(m); }
    }
    const kx = clamp(1 + (f.W - 1.3) * 0.25, 1, 1.15), k = 1 + f.big * 0.04;
    let lean = 0, pitch = 0;
    return {
      mesh: grow([mesh, fork, rSpin, ...rims], kx, k, k), seat: [0, 0.98 * k, -0.5 * k], control: 'bars',
      wheels: [{ g: new THREE.Group(), spin: rSpin, front: false, r: RR * k }, { g: new THREE.Group(), spin: fSpin, front: false, r: FR * k }],
      exhaust: [[0.32 * kx, 0.7 * k, -1.7 * k, BACK], [-0.32 * kx, 0.7 * k, -1.7 * k, BACK]],
      fx(s, dt) {
        steerG.rotation.y = -s.steer * 0.35;
        lean += (s.steer * 0.36 * Math.min(1, 0.25 + s.speed01 * 1.5) - lean) * ease(dt, 6);
        pitch += ((s.boosting && s.grounded ? -0.22 : 0) - pitch) * ease(dt, 5);
        sprung.rotation.z = lean;
        pitchAbout(sprung, pitch, 0, RZ * k);
        neonR.emissiveIntensity = 1.2 + s.speed01 * 0.8 + (s.boosting ? 1 : 0);
      },
    };
  },
};

export default [speedStar, tornado, eggMobile, extremeGear, landBreaker, darkRider];
