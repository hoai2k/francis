// Pokémon Rides vehicle pack (see buildVehicle in ../characters.js for the contract): a Poké Ball
// kart, the Rotom Bike, and four ride Pokémon — Lapras swims on its own patch of sea, Rapidash
// gallops with a flaming mane, Arcanine bounds along and Koraidon sprints, then spreads its
// feathered head-wings to glide. Helpers in ./pokemon-kit.js.
import {
  THREE, BrickBuilder, C, shape, part, flame, sparks, addGlow, spriteMat, neon, S, CO, PI, abs,
  BACK, ease, clamp, fitOf, grow, pitchAbout, shellMat, runningLegs,
} from './pokemon-kit.js';

const BK = 0x1b1b1b, WH = 0xf4f4f4;
const hemiBack = new THREE.SphereGeometry(1, 16, 6, PI, PI, 0, PI / 2);   // the back half of a dome
// big glossy creature eye on the side of a head (yaw: which way it faces)
const eye = (L, x, y, z, r, yaw, o) => L.eye(x, y, z, r, yaw, o);

// ---- Poké Ball Kart: a white ball tub, the red top half as a cowl behind you --------------------
const pokeballKart = {
  id: 'pokeballkart', name: 'Poké Ball Kart', form: 'Ball kart', blurb: 'I choose you!',
  stats: { speed: 3, accel: 3, handling: 3, weight: 3 }, colors: [0xd0262a, WH, BK, 0xa0a5a9],
  build(kit) {
    const f = fitOf(kit.rig);
    const RD = 0xd0262a;
    const RX = Math.max(1.12, f.hip + 0.66), RY = 0.88, RZ = 1.5, CY = 1.02, CZ = -0.2;
    const b = new BrickBuilder(0.4), L = shape(b);
    // the white bottom half is the tub (double-sided so you can look inside)
    L.hemi(0, CY, CZ, RX, RY, RZ, 0, { mat: shellMat(WH), rx: PI });
    L.ring(0, CY, CZ, RX, 0.08, BK, { sz: RZ / RX });
    L.cyl(0, CY - 0.42, CZ, RX * 0.84, 0.05, C.dkgray, { r2: RZ * 0.84 });
    L.box(0, CY - 0.25, CZ - 0.55, 0.9, 0.36, 0.5, C.dkgray);   // seat back
    // the button on the front of the band
    L.cyl(0, CY, CZ + RZ + 0.02, 0.32, 0.14, BK, { rx: PI / 2, seg: 20 });
    // chassis, axle pods and exhausts below the ball
    L.box(0, 0.36, CZ, RX * 1.1, 0.22, 2.3, C.dkgray);
    for (const sd of [-1, 1]) {
      L.box(sd * RX * 0.72, 0.42, CZ - 0.95, 0.5, 0.32, 0.55, BK);
      L.box(sd * RX * 0.72, 0.4, CZ + 1.15, 0.5, 0.28, 0.5, BK);
      L.cyl(sd * 0.45, 0.62, CZ - RZ - 0.05, 0.11, 0.42, C.ltgray, { rx: PI / 2, matOpts: { metal: 0.85, rough: 0.22 } });
      L.stud(sd * 0.55, CY + 0.06, CZ + RZ * 0.7, 0.12, RD);
    }
    const mesh = b.build({ name: 'pokeballkart' });
    // the red top half: a cowl behind the driver on a hinge (tips back on boost)
    const lid = new THREE.Group(); lid.position.set(0, CY, CZ);
    const lb = new BrickBuilder(0.4), LL = shape(lb);
    lb.addMatrix(hemiBack, shellMat(RD), new THREE.Matrix4().makeScale(RX, RY, RZ));
    LL.stud(0, RY - 0.02, -0.2, 0.18, RD);
    LL.box(0, 0.06, -RZ * 0.98, RX * 1.2, 0.1, 0.12, BK);
    lid.add(lb.build({ name: 'pokeballLid' }));
    // the button glows white-blue when you boost
    const btnMat = new THREE.MeshStandardMaterial({ color: WH, roughness: 0.3, emissive: 0x9ad8ff, emissiveIntensity: 0 });
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 20).rotateX(PI / 2), btnMat);
    btn.position.set(0, CY, CZ + RZ + 0.1);
    let tilt = 0, glow = 0;
    return {
      mesh, parts: [lid, btn], seat: [0, CY - 0.32, CZ - 0.1], control: 'wheel',
      exhaust: [[0.45, 0.62, CZ - RZ - 0.3, BACK], [-0.45, 0.62, CZ - RZ - 0.3, BACK]],
      wheels: [
        { x: 0, z: CZ - 0.95, r: 0.42, w: 0.34, xs: [RX * 0.98, -RX * 0.98], cap: RD },
        { x: RX * 0.95, z: CZ + 1.15, r: 0.38, w: 0.3, front: true, cap: RD },
        { x: -RX * 0.95, z: CZ + 1.15, r: 0.38, w: 0.3, front: true, cap: RD },
      ],
      fx(s, dt) {
        tilt += ((s.boosting ? -0.32 : s.gliding ? -0.18 : 0) + S(s.t * 14) * 0.02 * s.speed01 - tilt) * ease(dt, 6);
        lid.rotation.x = tilt;
        glow += ((s.boosting ? 2.2 : 0.15 + s.speed01 * 0.3) - glow) * ease(dt, 6);
        btnMat.emissiveIntensity = glow;
      },
    };
  },
};

// ---- Rotom Bike: Rotom possesses a motorbike; its face is the headlight, sparks on boost ---------
const rotomBike = {
  id: 'rotombike', name: 'Rotom Bike', form: 'Possessed bike', blurb: 'Bzzt! Rotom takes the wheel',
  stats: { speed: 3, accel: 5, handling: 4, weight: 1 }, colors: [0xf26a1e, WH, BK, 0x6ad0ff],
  build(kit) {
    const { wheelGeo, wheelMat, sprung } = kit; const f = fitOf(kit.rig);
    const OR = 0xf26a1e, BL = 0x6ad0ff;
    const RZ = -1.35, RR = 0.52, FZ = 1.45, FR = 0.48;
    const b = new BrickBuilder(0.4), L = shape(b);
    // frame and swingarm
    L.rod([0, 0.45, -0.7], [0, RR, RZ], 0.07, BK);
    L.rod([0, 0.45, -0.7], [0, 0.45, 0.6], 0.08, BK);
    L.box(0, 0.6, -0.05, 0.42, 0.42, 0.9, C.dkgray);   // engine block
    for (const z of [-0.3, 0, 0.3]) L.box(0, 0.6, z, 0.5, 0.06, 0.06, C.ltgray);
    // orange body: tank, tail and side panels with white lightning stripes
    L.ell(0, 1.0, 0.45, 0.36, 0.3, 0.62, OR);
    L.ell(0, 0.95, -0.95, 0.3, 0.22, 0.55, OR);
    const PX = Math.max(0.36, f.hip * 0.7);
    for (const sd of [-1, 1]) {
      L.box(sd * PX, 0.68, -0.25, 0.08, 0.42, 1.25, OR, { rz: sd * 0.12 });
      L.box(sd * (PX + 0.05), 0.72, -0.4, 0.02, 0.08, 0.5, WH, { rz: sd * 0.12, rx: 0.5 });
      L.box(sd * (PX + 0.05), 0.68, -0.05, 0.02, 0.08, 0.4, WH, { rz: sd * 0.12, rx: -0.5 });
      L.box(sd * 0.35, 0.3, 0.25, 0.25, 0.05, 0.14, BK);   // foot pegs
      L.rod([sd * 0.2, 0.5, -0.9], [sd * 0.28, 0.6, -1.85], 0.08, C.ltgray, { matOpts: { metal: 0.85, rough: 0.22 } });
    }
    L.box(0, 0.98, -0.35, 0.46, 0.12, 0.8, BK);   // saddle
    L.box(0, 0.96, -1.45, 0.32, 0.1, 0.1, 0xff3020, { matOpts: { emissive: 0xff2010, emissiveIntensity: 1.2 } });
    const mesh = b.build({ name: 'rotombike' });
    // the steering head: fork, front wheel and Rotom's face cowl turn with the bars
    const head = new THREE.Group(); head.position.set(0, 1.2, 1.05);
    const hb = new BrickBuilder(0.4), H = shape(hb);
    for (const sd of [-1, 1]) H.rod([sd * 0.18, 0.1, 0], [sd * 0.18, FR - 1.2, FZ - 1.05], 0.05, C.ltgray);
    H.ell(0, 0.08, 0.15, 0.42, 0.4, 0.36, OR);
    H.ell(0, 0.08, 0.32, 0.34, 0.32, 0.22, 0xf8f0e8);
    // Rotom's face: two blue triangle eyes and a grin, with lightning tufts on top
    for (const sd of [-1, 1]) {
      H.cone(sd * 0.13, 0.16, 0.52, 0.09, 0.15, BL, { rz: sd * 0.9, rx: PI / 2 - 0.2, mat: neon(BL, 1.6) });
      H.box(sd * 0.16, 0.5, 0.05, 0.08, 0.3, 0.06, OR, { rz: -sd * 0.5 });
      H.box(sd * 0.26, 0.66, 0.05, 0.08, 0.2, 0.06, OR, { rz: sd * 0.6 });
    }
    H.box(0, -0.04, 0.53, 0.2, 0.04, 0.04, BK);
    H.ell(0, FR - 1.2 + 0.22, FZ - 1.05, 0.12, 0.06, 0.4, OR);   // mudguard
    head.add(hb.build({ name: 'rotomFace' }));
    const fSpin = new THREE.Mesh(wheelGeo(FR, 0.24, OR, [0]), wheelMat); fSpin.position.set(0, FR - 1.2, FZ - 1.05); head.add(fSpin);
    const rSpin = new THREE.Mesh(wheelGeo(RR, 0.36, OR, [0]), wheelMat); rSpin.position.set(0, RR, RZ);
    // Rotom's electric aura: blue glow and sparks round the face, crackling on boost
    const zap = sparks(head, 0, 0.1, 0.35, 0.7, 6, BL); zap.visible = true;
    const aura = addGlow(head, BL, 1.6, 0, 0.1, 0.4, 0.4);
    const kx = clamp(1 + (f.W - 1.3) * 0.25, 1, 1.15), k = 1 + f.big * 0.03;
    let lean = 0, pitch = 0;
    return {
      mesh: grow([mesh, head, rSpin], kx, k, k), seat: [0, 1.0 * k, -0.4 * k], control: 'bars',
      exhaust: [[0.28 * kx, 0.6 * k, -1.95 * k, BACK + 0.1, 0.9], [-0.28 * kx, 0.6 * k, -1.95 * k, BACK + 0.1, 0.9]],
      wheels: [{ g: new THREE.Group(), spin: rSpin, front: false, r: RR * k }, { g: new THREE.Group(), spin: fSpin, front: false, r: FR * k }],
      fx(s, dt) {
        head.rotation.y = -s.steer * 0.35;
        lean += (s.steer * 0.34 * Math.min(1, 0.25 + s.speed01 * 1.5) - lean) * ease(dt, 6);
        pitch += ((s.boosting && s.grounded ? -0.18 : 0) - pitch) * ease(dt, 5);
        sprung.rotation.z = lean;
        pitchAbout(sprung, pitch, 0, RZ * k);
        const on = s.boosting || Math.random() < 0.08 + s.speed01 * 0.1;
        zap.visible = on;
        if (on) zap.update(s.t, s.boosting ? 1.4 : 0.8);
        aura.scale.setScalar(1.3 + (s.boosting ? 0.8 : 0) + S(s.t * 23) * 0.1);
      },
    };
  },
};

// ---- Lapras: swims on its own patch of sea, paddling flippers; flippers spread to glide ---------
const lapras = {
  id: 'lapras', name: 'Lapras', form: 'Ride Pokémon', blurb: 'Ferries you over land and sea',
  stats: { speed: 3, accel: 2, handling: 3, weight: 5 }, colors: [0x4a9ad8, 0xf2e6c4, 0x8f8fa8, 0x9ad8ff],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const BL = 0x4a9ad8, CR = 0xf2e6c4, SH = 0x8f8fa8, SH2 = 0x6c6c88;
    const b = new BrickBuilder(0.4), L = shape(b);
    L.ell(0, 0.62, -0.15, 1.05, 0.5, 1.5, BL);
    L.ell(0, 0.48, 0.05, 0.92, 0.36, 1.3, CR);
    // the grey shell with its knobs
    L.ell(0, 0.98, -0.35, 0.98, 0.5, 1.2, SH);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2 + 0.3; L.cone(S(a) * 0.62, 1.3 - abs(CO(a)) * 0.05, -0.35 + CO(a) * 0.78, 0.12, 0.26, SH2, { rz: -S(a) * 0.5, rx: CO(a) * 0.5 }); }
    L.box(0, 1.42, -0.4, 0.55, 0.1, 0.7, SH2);   // saddle patch
    // the long neck, cream down the front
    const neck = [[1.0, 1.0, 0.32], [1.4, 1.35, 0.28], [1.8, 1.6, 0.25], [2.15, 1.75, 0.23]];
    for (let i = 0; i < neck.length - 1; i++) for (let k = 0; k < 4; k++) {
      const u = k / 4, [y0, z0, r0] = neck[i], [y1, z1, r1] = neck[i + 1];
      const y = y0 + (y1 - y0) * u, z = z0 + (z1 - z0) * u, r = r0 + (r1 - r0) * u;
      L.ell(0, y, z, r, r, r, BL); L.ell(0, y - 0.05, z + r * 0.45, r * 0.75, r * 0.85, r * 0.6, CR);
    }
    L.cone(0, 0.62, -1.75, 0.18, 0.4, BL, { rx: -PI / 2 - 0.2 });   // little tail
    const mesh = b.build({ name: 'lapras' });
    // head: horn, ear fins, gentle eyes (turns into the corner)
    const head = new THREE.Group(); head.position.set(0, 2.3, 1.82);
    head.add(part((H) => {
      H.ell(0, 0, 0.08, 0.32, 0.28, 0.4, BL);
      H.ell(0, -0.08, 0.32, 0.22, 0.14, 0.22, BL);
      H.cone(0, 0.32, -0.02, 0.07, 0.3, SH2, { rx: -0.3 });
      for (const sd of [-1, 1]) {
        H.cone(sd * 0.32, 0.1, -0.1, 0.07, 0.24, BL, { rz: -sd * 1.3, rx: -0.4 });
        eye(H, sd * 0.24, 0.06, 0.26, 0.07, sd * 0.85, { iris: 0x3a2a1a, tall: 1.1, side: sd });
      }
      H.box(0, -0.13, 0.5, 0.16, 0.025, 0.03, 0x2a3a5a);
    }, 'laprasHead'));
    // flippers: front pair big (spread to glide), back pair small
    const flips = [[0.95, 0.55, 0.6, 1, 1], [-0.95, 0.55, 0.6, -1, 1], [0.85, 0.5, -1.1, 1, 0.65], [-0.85, 0.5, -1.1, -1, 0.65]].map(([x, y, z, sd, k]) => {
      const g = new THREE.Group(); g.position.set(x, y, z);
      g.add(part((F) => { F.ell(sd * 0.45 * k, 0, 0, 0.55 * k, 0.07, 0.3 * k, BL); F.ell(sd * 0.75 * k, 0, -0.08 * k, 0.25 * k, 0.06, 0.18 * k, BL); }, 'flipper'));
      return { g, sd, k };
    });
    // its own patch of sea (stays on the ground; the body bobs above it)
    const sea = new THREE.Group();
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a9ae0, transparent: true, opacity: 0.6, roughness: 0.08, emissive: 0x0a3a6a, depthWrite: false }));
    water.scale.set(1.9, 1, 2.6); water.position.set(0, 0.05, -0.1); sea.add(water);
    const foam = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 28).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
    foam.scale.set(1.9, 1, 2.6); foam.position.set(0, 0.06, -0.1); sea.add(foam);
    const spray = [];
    for (let i = 0; i < 6; i++) { const sp = new THREE.Sprite(spriteMat(0xdff4ff, 0.7)); sea.add(sp); spray.push(sp); }
    const kx = clamp(1 + (f.W - 1.3) * 0.3, 1, 1.2), ky = 1 + f.big * 0.06;
    let ph = 0, open = 0;
    return {
      mesh: grow([mesh, head, ...flips.map((p) => p.g)], kx, ky, ky), seat: [0, 1.44 * ky, -0.4 * ky], control: 'none', hover: 0.16,
      exhaust: [], wheels: [{ g: sea, spin: new THREE.Object3D(), front: false, r: 1 }],
      fx(s, dt) {
        const pace = Math.min(1, 0.2 + s.speed01 * 1.2);
        ph += dt * (2 + s.speed01 * 6 + (s.boosting ? 3 : 0));
        open += ((s.gliding ? 1 : 0) - open) * ease(dt, 4);
        for (const p of flips) {
          p.g.rotation.z = p.sd * ((1 - open) * S(ph + (p.k < 1 ? PI : 0)) * 0.45 * pace + open * (0.15 + S(s.t * 3) * 0.08));
          p.g.rotation.y = p.sd * (1 - open) * CO(ph) * 0.35 * pace;
          p.g.scale.setScalar(1 + open * 0.35 * (p.k === 1 ? 1 : 0));
        }
        head.rotation.y = -s.steer * 0.35;
        head.rotation.x = -open * 0.3 + S(ph * 0.5) * 0.06;
        sprung.rotation.z = -s.steer * 0.08 + S(ph * 0.5) * 0.03;
        sea.visible = !s.gliding && s.grounded;
        water.material.opacity = 0.5 + S(s.t * 3) * 0.08;
        foam.scale.set(1.9 + S(s.t * 4) * 0.08, 1, 2.6 + S(s.t * 4) * 0.1);
        // the wake: spray thrown up behind, more at speed and on boost
        spray.forEach((sp, i) => {
          const u = (s.t * 1.6 + i / spray.length) % 1, on = s.speed01 > 0.15 || s.boosting;
          sp.visible = on;
          if (on) { sp.position.set((i % 2 ? 1 : -1) * (0.6 + u * 0.8), 0.2 + S(u * PI) * (0.6 + (s.boosting ? 0.8 : 0)), -1.6 - u * 2.2 * (0.4 + s.speed01)); sp.scale.setScalar(0.4 + u * (s.boosting ? 1.4 : 0.8)); }
        });
      },
    };
  },
};

// ---- Rapidash: a galloping fire horse; mane, tail and fetlocks blaze (hotter on boost) -----------
const rapidash = {
  id: 'rapidash', name: 'Rapidash', form: 'Ride Pokémon', blurb: 'A blazing gallop',
  stats: { speed: 5, accel: 3, handling: 2, weight: 2 }, colors: [0xfaf0d2, 0xff7a20, 0x9a9aa8, 0xffd040],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const CR = 0xfaf0d2, CR2 = 0xe8dcb8, HOOF = 0x7a7a88;
    const b = new BrickBuilder(0.4), L = shape(b);
    L.ell(0, 1.05, -0.2, 0.52, 0.45, 1.0, CR);
    L.ell(0, 1.1, -0.95, 0.5, 0.42, 0.48, CR);
    L.ell(0, 1.05, 0.65, 0.5, 0.48, 0.5, CR);
    L.box(0, 1.47, -0.3, 0.62, 0.06, 0.6, 0x9a2a1a);   // a saddle blanket
    // neck rising to the head
    for (let i = 0; i < 6; i++) { const u = i / 5; L.ell(0, 1.3 + u * 0.6, 0.85 + u * 0.4, 0.26 - u * 0.04, 0.3, 0.26, CR); }
    const mesh = b.build({ name: 'rapidash' });
    const flames = [];
    // flaming mane along the neck
    const mane = new THREE.Group(); mane.position.set(0, 0, 0);
    for (let i = 0; i < 5; i++) { const u = i / 4, fl = flame(mane, 0, 1.55 + u * 0.6, 0.62 + u * 0.4, 0.26 - u * 0.03); fl.rotation.x = -0.8; flames.push(fl); }
    // head with the horn
    const head = new THREE.Group(); head.position.set(0, 2.05, 1.38);
    head.add(part((H) => {
      H.ell(0, 0, 0.12, 0.22, 0.24, 0.36, CR);
      H.ell(0, -0.08, 0.45, 0.16, 0.15, 0.2, CR);
      H.cone(0, 0.32, 0.32, 0.06, 0.55, 0xb8b8c4, { rx: 0.7 });
      for (const sd of [-1, 1]) {
        H.cone(sd * 0.13, 0.27, -0.02, 0.06, 0.18, CR, { rz: -sd * 0.3 });
        eye(H, sd * 0.18, 0.06, 0.2, 0.06, sd * 0.95, { iris: 0xc02020, tall: 1.2, side: sd });
        H.ell(sd * 0.06, -0.1, 0.63, 0.02, 0.015, 0.01, BK);
      }
    }, 'rapidashHead'));
    const hf = flame(head, 0, 0.2, -0.12, 0.24); hf.rotation.x = -0.9; flames.push(hf);
    // tail of fire
    const tail = new THREE.Group(); tail.position.set(0, 1.25, -1.4);
    for (let i = 0; i < 3; i++) { const fl = flame(tail, (i - 1) * 0.12, 0.05 - i * 0.05, -0.15 - i * 0.12, 0.34 - i * 0.04); fl.rotation.x = -1.9 + i * 0.15; flames.push(fl); }
    // long legs with grey hooves and flames at the fetlocks
    const gait = runningLegs([[0.3, 0.75, true], [-0.3, 0.75, true], [0.3, -0.85, false], [-0.3, -0.85, false]].map(([x, z, front]) => ({
      x, y: 0.95, z, front, amp: 0.75,
      build: (G) => { G.ell(0, -0.2, 0, 0.16, 0.3, 0.18, CR); G.box(0, -0.62, 0.02, 0.12, 0.5, 0.12, CR2); G.cyl(0, -0.9, 0.03, 0.1, 0.12, HOOF); },
    })));
    gait.legs.forEach((l) => { const fl = flame(l.g, 0, -0.78, -0.08, 0.14); fl.rotation.x = -1.4; flames.push(fl); });
    const kx = clamp(1 + (f.W - 1.3) * 0.25, 1, 1.15), ky = 1 + f.big * 0.05;
    let ph = 0;
    return {
      mesh: grow([mesh, mane, head, tail, ...gait.objs], kx, ky, ky), seat: [0, 1.5 * ky, -0.25 * ky], control: 'none',
      exhaust: [[0.15, 1.15 * ky, -1.55 * ky, BACK, 0.8], [-0.15, 1.15 * ky, -1.55 * ky, BACK, 0.8]],
      fx(s, dt) {
        const air = s.gliding || !s.grounded, pace = Math.min(1, 0.15 + s.speed01 * 1.3);
        ph += dt * (2 + s.speed01 * 11 + (s.boosting ? 4 : 0));
        gait.update(ph, pace, air, dt);
        const k = 0.8 + s.speed01 * 0.4 + (s.boosting ? 0.6 : 0);
        for (const fl of flames) fl.update(s.t, k);
        head.rotation.y = -s.steer * 0.35;
        head.rotation.x = air ? -0.2 : S(ph * 2) * 0.08 * pace;
        tail.rotation.x = -s.speed01 * 0.4 + S(ph) * 0.1;
        tail.rotation.y = s.steer * 0.4;
        sprung.position.y = air ? 0 : abs(S(ph)) * 0.07 * pace;
      },
    };
  },
};

// ---- Arcanine: bounds along on big paws, its cream mane and tail streaming ----------------------
const arcanine = {
  id: 'arcanine', name: 'Arcanine', form: 'Ride Pokémon', blurb: 'Legendary loyal speed',
  stats: { speed: 4, accel: 4, handling: 3, weight: 2 }, colors: [0xf08a2a, 0xf2e2b8, BK, 0x5a3a2a],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const OR = 0xf08a2a, CR = 0xf2e2b8;
    const b = new BrickBuilder(0.4), L = shape(b);
    L.ell(0, 1.0, -0.25, 0.6, 0.48, 1.05, OR);
    // black tiger stripes along the flanks and back
    for (const z of [-0.9, -0.55, -0.2, 0.15]) for (const sd of [-1, 1]) L.box(sd * 0.52, 1.12, z, 0.08, 0.32, 0.07, BK, { rz: sd * 0.5, ry: sd * 0.2 });
    // the big cream mane on chest and shoulders
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; L.ell(S(a) * 0.5, 1.25 + CO(a) * 0.28, 0.6 + abs(S(a)) * -0.1, 0.32, 0.32, 0.32, CR); }
    L.ell(0, 0.95, 0.75, 0.45, 0.45, 0.35, CR);
    L.box(0, 1.47, -0.35, 0.62, 0.06, 0.6, 0x2a4a9a);   // saddle blanket
    const mesh = b.build({ name: 'arcanine' });
    const head = new THREE.Group(); head.position.set(0, 1.85, 1.0);
    head.add(part((H) => {
      H.ell(0, 0, 0, 0.36, 0.32, 0.36, OR);
      H.ell(0, -0.1, 0.33, 0.2, 0.16, 0.22, CR);
      H.ell(0, -0.02, 0.55, 0.07, 0.05, 0.05, BK);
      H.ell(0, 0.28, -0.05, 0.3, 0.16, 0.3, CR);   // cream tuft
      for (const sd of [-1, 1]) {
        H.cone(sd * 0.25, 0.32, -0.08, 0.1, 0.26, OR, { rz: -sd * 0.4 });
        eye(H, sd * 0.2, 0.08, 0.26, 0.07, sd * 0.65, { iris: 0x4a2a10, tall: 1.1, roll: -0.25 * sd, side: sd });
        H.box(sd * 0.3, -0.05, 0.12, 0.05, 0.22, 0.05, BK, { rz: sd * 0.4 });
      }
      H.box(0, -0.2, 0.42, 0.18, 0.03, 0.04, 0x5a2a1a);
    }, 'arcanineHead'));
    const tail = new THREE.Group(); tail.position.set(0, 1.15, -1.25);
    tail.add(part((T) => { T.ell(0, 0.25, -0.35, 0.28, 0.32, 0.5, CR, { rx: -0.6 }); T.ell(0, 0.5, -0.7, 0.22, 0.22, 0.32, CR, { rx: -0.9 }); }, 'arcanineTail'));
    const gait = runningLegs([[0.34, 0.6, true], [-0.34, 0.6, true], [0.36, -0.95, false], [-0.36, -0.95, false]].map(([x, z, front]) => ({
      x, y: 0.92, z, front, amp: 0.85,
      build: (G) => {
        G.ell(0, -0.2, 0, 0.2, 0.32, 0.22, OR);
        G.ell(0, -0.58, 0.02, 0.15, 0.3, 0.15, OR);
        G.ell(0, -0.42, -0.1, 0.13, 0.12, 0.1, CR);
        G.ell(0, -0.85, 0.08, 0.17, 0.08, 0.22, OR);
        if (front) for (let i = 0; i < 2; i++) G.box(0, -0.25 - i * 0.15, 0.18, 0.2, 0.05, 0.05, BK);
      },
    })));
    const kx = clamp(1 + (f.W - 1.3) * 0.25, 1, 1.15), ky = 1 + f.big * 0.05;
    let ph = 0;
    return {
      mesh: grow([mesh, head, tail, ...gait.objs], kx, ky, ky), seat: [0, 1.5 * ky, -0.3 * ky], control: 'none',
      exhaust: [[0.25, 1.0 * ky, -1.3 * ky, BACK, 0.8], [-0.25, 1.0 * ky, -1.3 * ky, BACK, 0.8]],
      fx(s, dt) {
        const air = s.gliding || !s.grounded, pace = Math.min(1, 0.15 + s.speed01 * 1.3);
        ph += dt * (2 + s.speed01 * 10 + (s.boosting ? 4 : 0));
        gait.update(ph, pace, air, dt);
        head.rotation.y = -s.steer * 0.4;
        head.rotation.x = air ? -0.2 : S(ph * 2) * 0.06 * pace;
        tail.rotation.x = 0.2 - s.speed01 * 0.5 + S(ph) * 0.12;
        tail.rotation.y = s.steer * 0.4 + S(ph * 0.5) * 0.15;
        // a bounding run: the back rocks with the stride
        sprung.rotation.x = air ? -0.05 : S(ph) * 0.05 * pace;
        sprung.position.y = air ? 0 : abs(S(ph)) * 0.08 * pace;
      },
    };
  },
};

// ---- Koraidon: sprints low on all fours; its feathered head-wings fold back, then spread to glide -
const koraidon = {
  id: 'koraidon', name: 'Koraidon', form: 'Legendary ride', blurb: 'Sprint mode, then glide',
  stats: { speed: 4, accel: 3, handling: 2, weight: 4 }, colors: [0xc4262e, WH, 0xf2cd37, 0x3a6ad8],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const RD = 0xc4262e, RD2 = 0x8a1a22, WT = 0xe8e8ec, PU = 0x5a3a8a;
    const FEATHER = [0xf2cd37, 0x6ac83a, 0x2ab0c8, 0x3a6ad8, 0x8a4ac8];
    const b = new BrickBuilder(0.4), L = shape(b);
    L.ell(0, 0.95, -0.3, 0.62, 0.45, 1.1, RD);
    L.ell(0, 0.8, -0.1, 0.5, 0.32, 0.95, WT);
    // the tyre-like coil on its chest
    L.ring(0, 1.0, 0.75, 0.42, 0.13, 0x2a2a30, { rx: PI / 2 });
    L.cyl(0, 1.0, 0.75, 0.22, 0.2, 0xf2cd37, { rx: PI / 2 });
    L.ell(0, 1.12, 0.55, 0.5, 0.42, 0.45, RD);
    // neck and the long tail
    L.ell(0, 1.45, 0.85, 0.28, 0.4, 0.3, RD, { rx: 0.5 });
    for (let i = 0; i < 6; i++) L.ell(0, 0.95 - i * 0.04 + (i > 3 ? (i - 3) * 0.08 : 0), -1.3 - i * 0.28, 0.24 - i * 0.03, 0.22 - i * 0.025, 0.2, i % 2 ? RD : RD2);
    L.box(0, 1.42, -0.4, 0.6, 0.06, 0.6, PU);   // saddle patch
    const mesh = b.build({ name: 'koraidon' });
    const head = new THREE.Group(); head.position.set(0, 1.85, 1.15);
    head.add(part((H) => {
      H.ell(0, 0, 0.05, 0.3, 0.28, 0.38, RD);
      H.ell(0, -0.08, 0.38, 0.22, 0.16, 0.26, RD);
      H.ell(0, -0.17, 0.38, 0.2, 0.06, 0.24, WT);
      H.box(0, 0.24, 0.2, 0.1, 0.06, 0.4, 0xf2cd37);   // crest
      for (const sd of [-1, 1]) {
        eye(H, sd * 0.22, 0.07, 0.22, 0.07, sd * 0.8, { iris: 0xf2a020, pupil: BK, tall: 0.9, roll: -0.3 * sd, side: sd });
        for (const x of [0.08, 0.16]) H.cone(sd * x, -0.13, 0.55 - x * 0.3, 0.02, 0.06, WH, { rx: PI });
      }
    }, 'koraidonHead'));
    // feathered head-wings: hang folded down the neck, spread wide to glide
    const wings = [1, -1].map((sd) => {
      const p = new THREE.Group(); p.position.set(sd * 0.3, 1.95, 1.05);
      const fl = new THREE.Group(); p.add(fl);
      fl.add(part((W) => {
        FEATHER.forEach((c, i) => W.box(sd * (0.3 + i * 0.3), -0.02 * i, -0.06 * i, 0.32, 0.06, 0.6 - i * 0.05, c));
        W.box(sd * 0.75, 0.04, 0.22, 1.5, 0.05, 0.08, 0xf4f4f4);
      }, 'koraidonWing'));
      return { p, fl, sd };
    });
    const gait = runningLegs([[0.42, 0.55, true], [-0.42, 0.55, true], [0.44, -0.95, false], [-0.44, -0.95, false]].map(([x, z, front]) => ({
      x, y: 0.88, z, front, amp: 0.9,
      build: (G) => {
        G.ell(0, -0.18, 0, 0.22, 0.32, 0.26, RD);
        G.ell(0, -0.6, 0.04, 0.14, 0.3, 0.15, RD2);
        G.ell(0, -0.86, 0.12, 0.17, 0.07, 0.24, RD);
        for (const x2 of [-0.08, 0.08]) G.cone(x2, -0.86, 0.38, 0.03, 0.1, WH, { rx: PI / 2 });
      },
    })));
    const kx = clamp(1 + (f.W - 1.3) * 0.25, 1, 1.15), ky = 1 + f.big * 0.05;
    let ph = 0, open = 0;
    return {
      mesh: grow([mesh, head, ...wings.map((w) => w.p), ...gait.objs], kx, ky, ky), seat: [0, 1.45 * ky, -0.35 * ky], control: 'none',
      exhaust: [[0.25, 0.95 * ky, -1.35 * ky, BACK, 0.8], [-0.25, 0.95 * ky, -1.35 * ky, BACK, 0.8]],
      fx(s, dt) {
        const air = s.gliding || !s.grounded, pace = Math.min(1, 0.15 + s.speed01 * 1.3);
        ph += dt * (2 + s.speed01 * 11 + (s.boosting ? 4 : 0));
        gait.update(ph, pace, air, dt);
        open += ((s.gliding ? 1 : s.boosting ? 0.3 : 0) - open) * ease(dt, 4);
        for (const w of wings) {
          // folded: swept back and hanging down the neck; open: straight out to the side, flapping slowly
          w.p.rotation.y = w.sd * (1 - open) * 1.25;
          w.fl.rotation.z = w.sd * ((1 - open) * -1.0 + open * (0.12 + S(s.t * 3.5) * 0.12));
          w.p.scale.setScalar(1 + open * 0.4);
        }
        head.rotation.y = -s.steer * 0.35;
        head.rotation.x = air ? -0.15 : S(ph * 2) * 0.06 * pace;
        sprung.rotation.x = air ? 0 : S(ph) * 0.04 * pace;
        sprung.position.y = air ? 0 : abs(S(ph)) * 0.06 * pace;
      },
    };
  },
};

export default [pokeballKart, rotomBike, lapras, rapidash, arcanine, koraidon];
