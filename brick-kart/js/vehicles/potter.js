// Wizarding Rides vehicle pack (see buildVehicle in ../characters.js for the contract): the flying
// Ford Anglia, a mini Hogwarts Express, the Knight Bus, Hagrid's motorbike, a Firebolt and Buckbeak.
import { THREE, BrickBuilder, C, plastic, M, G, rbox, geo, ell, rod, glow, fitOf, clamp, grow, pitchAbout, rollAbout, ease } from './potter-kit.js';

const PI = Math.PI, S = Math.sin, CO = Math.cos;
const CHROME = { matOpts: { metal: 0.85, rough: 0.22 } };
const BRASS = { matOpts: { metal: 0.7, rough: 0.3 } };
const GLASS = { matOpts: { trans: true, opacity: 0.4 } };
const LIT = (c, i = 1) => ({ matOpts: { emissive: c, emissiveIntensity: i } });
const BACK = -PI / 2;   // boost flames pointing straight back

// ---- Flying Ford Anglia: the light-blue family car; its wheels fold flat when it flies -------------
const anglia = {
  id: 'anglia', name: 'Flying Anglia', form: 'Flying car', blurb: 'Wheels fold, off it flies',
  stats: { speed: 4, accel: 3, handling: 3, weight: 3 }, colors: [0x8fc3dd, 0xf4f4f4, 0xa0a5a9, 0xb4232a],
  build(kit) {
    const { wheelGeo, wheelMat, sprung } = kit; const f = fitOf(kit.rig);
    const BL = 0x8fc3dd, WH = C.white, CH = C.ltgray, RED = 0xb4232a, RZ = -f.wide * 0.22;
    const lamp = glow(0xfff0b0, 1.0, { base: 0xfff4d0 });
    const b = new BrickBuilder(0.4);
    // lower body and the wider upper body whose skirts cover the wheel tops
    b.box(0, 0.2, 0, 1.6, 0.36, 3.9, BL);
    b.box(0, 0.5, -0.02, 2.06, 0.3, 3.8, BL);
    rbox(b, 0, 0.86, 1.32, 1.86, 0.14, 1.15, 0.06, 0, 0, BL);                 // bonnet
    rbox(b, 0, 0.94, 1.3, 0.12, 0.03, 1.0, 0.06, 0, 0, CH, CHROME);
    // the Anglia face: wide chrome grille, round lamps under hooded brows, bumpers
    rbox(b, 0, 0.58, 1.93, 1.0, 0.22, 0.06, 0, 0, 0, CH, CHROME);
    for (let i = 0; i < 3; i++) rbox(b, 0, 0.51 + i * 0.07, 1.965, 0.9, 0.025, 0.02, 0, 0, 0, 0x2a2e33);
    for (const sd of [-1, 1]) {
      geo(b, G.cylZ, CH, M(sd * 0.74, 0.66, 1.9, 0, 0, 0, 0.18, 0.18, 0.06), CHROME);
      geo(b, G.cylZ, 0, M(sd * 0.74, 0.66, 1.93, 0, 0, 0, 0.14, 0.14, 0.04), { mat: lamp });
      rbox(b, sd * 0.74, 0.83, 1.84, 0.44, 0.08, 0.24, -0.25, 0, 0, BL);
      rbox(b, sd * 0.85, 0.42, 1.96, 0.24, 0.08, 0.05, 0, 0, 0, C.orange, LIT(0xff8a18, 0.6));
      rbox(b, sd * 1.035, 0.68, -0.1, 0.02, 0.04, 3.3, 0, 0, 0, CH, CHROME);  // side flute
      rbox(b, sd * 1.05, 0.62, 0.1, 0.03, 0.04, 0.18, 0, 0, 0, CH, CHROME);   // door handle
      // little tail fins with red lamps
      rbox(b, sd * 0.92, 0.88, -1.58, 0.1, 0.16, 0.75, 0.16, 0, 0, BL);
      rbox(b, sd * 0.92, 0.93, -1.95, 0.12, 0.13, 0.04, 0.16, 0, 0, C.red, LIT(0xff2020, 1));
      rbox(b, sd * 1.06, 1.06, 0.6, 0.2, 0.12, 0.06, 0, sd * 0.3, 0, CH, CHROME);   // mirrors
    }
    rbox(b, 0, 0.3, 2.0, 2.0, 0.12, 0.12, 0, 0, 0, CH, CHROME);
    rbox(b, 0, 0.3, -1.99, 2.0, 0.12, 0.12, 0, 0, 0, CH, CHROME);
    rbox(b, 0, 0.45, -1.96, 0.5, 0.15, 0.03, 0, 0, 0, WH);
    geo(b, G.cylZ, C.dkgray, M(0.5, 0.22, -1.98, 0, 0, 0, 0.06, 0.06, 0.2));
    b.box(0, 0.8, -1.5, 1.74, 0.07, 0.8, BL);                                   // boot lid
    // Harry's school trunk strapped on the boot
    rbox(b, 0, 1.03, -1.62, 1.1, 0.36, 0.5, 0, 0, 0, C.brown);
    rbox(b, 0, 1.22, -1.62, 1.12, 0.04, 0.52, 0, 0, 0, C.rbrown);
    for (const x of [-0.3, 0.3]) rbox(b, x, 1.03, -1.62, 0.06, 0.38, 0.52, 0, 0, 0, C.pearl, BRASS);
    // cabin: dashboard, red bench, windscreen
    b.box(0, 0.8, 0.62, 1.8, 0.24, 0.3, BL);
    b.box(0, 0.95, 0.5, 1.6, 0.06, 0.1, C.rbrown);
    b.box(0, 0.8, -0.36, clamp(f.hip * 2 + 0.2, 1.3, 1.85), 0.08, 0.85, RED);
    b.box(0, 0.8, -0.92 + RZ, 1.7, 0.55, 0.2, RED);
    rbox(b, 0, 1.2, 0.8, 1.8, 0.55, 0.04, -0.45, 0, 0, C.azure, GLASS);
    for (const sd of [-1, 1]) rbox(b, sd * 0.92, 1.2, 0.8, 0.08, 0.58, 0.08, -0.45, 0, 0, BL);
    rbox(b, 0, 1.46, 0.68, 1.92, 0.07, 0.1, -0.45, 0, 0, BL);
    // white roof stub behind the driver with the Anglia's backward-raked rear window
    b.box(0, 1.55, -1.2 + RZ, 1.94, 0.08, 0.62, WH);
    rbox(b, 0, 1.2, -1.41 + RZ, 1.8, 0.74, 0.04, -0.3, 0, 0, C.azure, GLASS);
    for (const sd of [-1, 1]) {
      rbox(b, sd * 0.93, 1.18, -0.95 + RZ, 0.1, 0.76, 0.1, 0, 0, 0, BL);
      rbox(b, sd * 0.93, 1.2, -1.41 + RZ, 0.1, 0.76, 0.1, -0.3, 0, 0, BL);
      rbox(b, sd * 0.95, 1.2, -1.15 + RZ, 0.03, 0.6, 0.4, 0, 0, 0, C.azure, GLASS);
    }
    // folding wheels: each spins in a fold group that tips flat when the car flies
    const wheels = [], folds = [];
    for (const [x, z, r, front] of [[0.9, -1.3, 0.36, false], [-0.9, -1.3, 0.36, false], [0.9, 1.3, 0.34, true], [-0.9, 1.3, 0.34, true]]) {
      const g = new THREE.Group(); g.position.set(x, r, z);
      const fold = new THREE.Group(); g.add(fold);
      const spin = new THREE.Mesh(wheelGeo(r, 0.3, CH, [0]), wheelMat); spin.castShadow = true; fold.add(spin);
      wheels.push({ g, spin, front, r }); folds.push({ fold, sd: Math.sign(x) });
    }
    let fk = 0, pitch = 0;
    return {
      mesh: b.build({ name: 'anglia' }), seat: [0, 0.86, -0.38], control: 'wheel', wheels,
      exhaust: [[0.5, 0.22, -2.1, BACK], [-0.5, 0.22, -2.1, BACK]],
      fx(s, dt) {
        fk += ((s.gliding ? 1 : 0) - fk) * ease(dt, 5);
        for (const w of folds) { w.fold.rotation.z = w.sd * fk * PI / 2; w.fold.position.y = fk * 0.16; w.fold.position.x = -w.sd * fk * 0.1; }
        pitch += ((s.boosting && s.grounded ? -0.07 : s.gliding ? -0.06 : 0) - pitch) * ease(dt, 5);
        pitchAbout(sprung, pitch, 0, -1.3, s.gliding ? S(s.t * 2.5) * 0.05 : 0);
        lamp.emissiveIntensity = 0.9 + (s.boosting ? 0.8 + S(s.t * 30) * 0.3 : 0);
      },
    };
  },
};

// ---- Hogwarts Express: a scarlet mini locomotive with driving rods and puffing smoke ----------------
const express = {
  id: 'hogexpress', name: 'Hogwarts Express', form: 'Steam locomotive', blurb: 'Platform 9¾, full steam',
  stats: { speed: 5, accel: 2, handling: 2, weight: 4 }, colors: [0xc91a09, 0x1b2a34, 0xe6c05a, 0xa0a5a9],
  build(kit) {
    const f = fitOf(kit.rig);
    const SC = C.red, DK = 0x8e1208, BK = 0x22262a, GOLD = C.pearl, CH = C.ltgray;
    const DR = 0.4, RC = 0.15, LC = 0.42, CW = Math.max(0.84, f.hip + 0.12);   // wheel/crank/con-rod sizes, cab half-width
    const fire = glow(0xff7a18, 1.0, { base: 0xffa040 });
    const b = new BrickBuilder(0.4);
    // frame, running boards with a gold-lined valance, buffer beam and buffers
    b.box(0, 0.3, 0.4, 1.0, 0.45, 4.1, BK);
    b.box(0, 0.8, 0.55, Math.max(1.84, CW * 2 + 0.1), 0.08, 3.7, BK);
    for (const sd of [-1, 1]) {
      b.box(sd * 0.91, 0.66, 0.55, 0.04, 0.15, 3.7, SC);
      b.box(sd * 0.935, 0.71, 0.55, 0.02, 0.03, 3.7, GOLD);
      geo(b, G.cylZ, CH, M(sd * 0.62, 0.56, 2.62, 0, 0, 0, 0.08, 0.08, 0.22), CHROME);
      geo(b, G.cylZ, BK, M(sd * 0.62, 0.56, 2.74, 0, 0, 0, 0.13, 0.13, 0.03));
      // cylinders the pistons slide into
      geo(b, G.cylZ, SC, M(sd * 0.84, DR, 2.2, 0, 0, 0, 0.17, 0.17, 0.5));
      for (const z of [1.95, 2.45]) geo(b, G.cylZ, BK, M(sd * 0.84, DR, z, 0, 0, 0, 0.19, 0.19, 0.05));
      rbox(b, sd * 0.87, DR, 1.5, 0.03, 0.06, 0.3, 0, 0, 0, CH);              // crosshead slide
    }
    b.box(0, 0.38, 2.5, 1.84, 0.34, 0.1, SC);
    rbox(b, 0, 0.8, 2.52, 0.2, 0.18, 0.12, 0, 0, 0, C.white, LIT(0xfff4c0, 1.2));   // head lamp
    // boiler with gold bands, smokebox, chimney, dome and safety valve
    geo(b, G.cylZ, SC, M(0, 1.3, 0.95, 0, 0, 0, 0.46, 0.46, 1.8));
    for (const z of [0.3, 0.95, 1.6]) geo(b, G.cylZ, GOLD, M(0, 1.3, z, 0, 0, 0, 0.475, 0.475, 0.05), BRASS);
    geo(b, G.cylZ, BK, M(0, 1.3, 2.1, 0, 0, 0, 0.49, 0.49, 0.5));
    b.box(0, 0.84, 2.1, 0.8, 0.3, 0.5, BK);
    geo(b, G.cylZ, 0x30353a, M(0, 1.3, 2.37, 0, 0, 0, 0.41, 0.41, 0.05));
    rbox(b, 0, 1.3, 2.41, 0.5, 0.05, 0.04, 0, 0, 0, CH, CHROME);
    geo(b, G.cylZ, GOLD, M(0, 1.58, 2.4, 0, 0, 0, 0.09, 0.09, 0.03), BRASS);
    geo(b, G.cylY, BK, M(0, 1.95, 2.1, 0, 0, 0, 0.13, 0.42, 0.13));
    geo(b, G.cylY, BK, M(0, 2.17, 2.1, 0, 0, 0, 0.18, 0.07, 0.18));
    ell(b, 0, 1.72, 1.0, 0.22, 0.14, 0.26, SC);
    ell(b, 0, 1.8, 1.0, 0.16, 0.16, 0.18, GOLD, BRASS);
    geo(b, G.cylY, GOLD, M(0, 1.82, 0.4, 0, 0, 0, 0.07, 0.14, 0.07), BRASS);
    geo(b, G.cylY, GOLD, M(0.25, 1.78, 0.15, 0, 0, 0, 0.04, 0.2, 0.04), BRASS);   // whistle
    // cab: spectacle plate with round windows and the glowing firebox, side sheets, gold crest
    b.box(0, 0.86, -0.02, CW * 2 + 0.06, 1.3, 0.1, SC);
    geo(b, G.cylZ, SC, M(0, 2.16, -0.02, 0, 0, 0, CW + 0.03, 0.22, 0.1));
    for (const sd of [-1, 1]) {
      geo(b, G.cylZ, C.azure, M(sd * 0.5, 1.88, 0.0, 0, 0, 0, 0.15, 0.15, 0.12), GLASS);
      geo(b, G.cylZ, GOLD, M(sd * 0.5, 1.88, -0.02, 0, 0, 0, 0.18, 0.18, 0.11), BRASS);
      b.box(sd * CW, 0.86, -0.65, 0.1, 0.56, 1.26, SC);
      b.box(sd * (CW + 0.02), 1.32, -0.65, 0.12, 0.06, 1.3, GOLD);
      rbox(b, sd * (CW + 0.055), 1.08, -0.6, 0.02, 0.26, 0.22, 0, 0, 0, GOLD, BRASS);
      rbox(b, sd * (CW + 0.065), 1.08, -0.6, 0.02, 0.12, 0.1, 0, 0, 0, SC);
      geo(b, G.cylZ, C.white, M(sd * 0.3, 1.58, -0.08, 0, 0, 0, 0.08, 0.08, 0.03));
    }
    rbox(b, 0, 1.08, -0.08, 0.38, 0.26, 0.03, 0, 0, 0, 0, { mat: fire });
    rbox(b, 0, 1.28, -0.09, 0.44, 0.05, 0.05, 0, 0, 0, GOLD, BRASS);
    rod(b, [-0.4, 1.45, -0.09], [0.4, 1.45, -0.09], 0.025, GOLD, BRASS);
    b.box(0, 0.86, -0.85, clamp(f.hip * 2 + 0.1, 1.0, 1.7), 0.14, 0.6, C.brown);
    // coal tender behind the driver (its front wall is the back rest)
    b.box(0, 0.6, -1.82, CW * 2 + 0.06, 0.95, 1.0, SC);
    b.box(0, 1.2, -1.82, CW * 2 + 0.08, 0.04, 1.02, GOLD);
    for (let i = 0; i < 7; i++) ell(b, S(i * 2.3) * 0.45, 1.55, -1.82 + CO(i * 1.7) * 0.3, 0.26, 0.14, 0.24, 0x15181b, { low: true });
    rbox(b, 0, 0.95, -2.33, 0.34, 0.4, 0.03, 0, 0, 0, GOLD, BRASS);                 // crest on the tender back
    rbox(b, 0, 0.95, -2.345, 0.24, 0.3, 0.02, 0, 0, 0, DK);
    for (const sd of [-1, 1]) rbox(b, sd * (CW - 0.12), 0.75, -2.33, 0.14, 0.14, 0.04, 0, 0, 0, C.red, LIT(0xff2020, 1));
    // driving wheels: red spoked discs with crank pins (the right side leads by a quarter turn)
    const wheels = [];
    const mkDriver = (z) => {
      const wb = new BrickBuilder(0.4);
      for (const sd of [-1, 1]) {
        const ph = sd > 0 ? 0 : PI / 2, cy = RC * CO(ph), cz = RC * S(ph);
        geo(wb, G.cylX, BK, M(sd * 0.66, 0, 0, 0, 0, 0, 0.16, DR, DR));
        geo(wb, G.cylX, SC, M(sd * 0.69, 0, 0, 0, 0, 0, 0.12, DR - 0.06, DR - 0.06));
        for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2; rbox(wb, sd * 0.755, CO(a) * 0.19, S(a) * 0.19, 0.02, 0.3, 0.04, a, 0, 0, DK); }
        rbox(wb, sd * 0.76, -cy * 1.3, -cz * 1.3, 0.03, 0.12, 0.24, ph, 0, 0, DK);   // counterweight
        geo(wb, G.cylX, GOLD, M(sd * 0.77, 0, 0, 0, 0, 0, 0.04, 0.07, 0.07), BRASS);
        geo(wb, G.cylX8, CH, M(sd * 0.79, cy, cz, 0, 0, 0, 0.06, 0.05, 0.05), CHROME);
      }
      const g = new THREE.Group(); g.position.set(0, DR, z);
      const spin = wb.build({ name: 'driverWheel' }); g.add(spin);
      wheels.push({ g, spin, front: false, r: DR });
    };
    for (const z of [1.25, 0.35, -0.55]) mkDriver(z);
    wheels.push({ x: 0, z: 2.12, r: 0.24, w: 0.14, xs: [0.6, -0.6], cap: BK, front: true });   // pony truck
    wheels.push({ x: 0, z: -1.8, r: 0.27, w: 0.16, xs: [0.66, -0.66], cap: BK });               // tender
    // coupling rods, connecting rods and piston rods (moved every frame from the wheel angle)
    const rods = [];
    for (const sd of [-1, 1]) {
      const part = (name, fn) => { const pb = new BrickBuilder(0.4); fn(pb); const g = new THREE.Group(); g.add(pb.build({ name })); return g; };
      const coupling = part('coupling', (pb) => { rbox(pb, 0, 0, 0.35, 0.04, 0.07, 1.95, 0, 0, 0, CH, CHROME); for (const z of [1.25, 0.35, -0.55]) geo(pb, G.cylX8, CH, M(0, 0, z, 0, 0, 0, 0.05, 0.07, 0.07), CHROME); });
      coupling.position.x = sd * 0.83;
      const con = part('conrod', (pb) => rbox(pb, 0, 0, 0.5, 0.04, 0.08, 1.0, 0, 0, 0, CH, CHROME)); con.scale.z = LC;
      const piston = part('piston', (pb) => { rbox(pb, 0, 0, 0, 0.08, 0.14, 0.12, 0, 0, 0, C.dkgray); geo(pb, G.cylZ, CH, M(0, 0, 0.25, 0, 0, 0, 0.03, 0.03, 0.5), CHROME); });
      piston.position.set(sd * 0.88, DR, 1.7);
      rods.push({ sd, x: sd * 0.88, ph: sd > 0 ? 0 : PI / 2, coupling, con, piston });
    }
    // puffs of steam from the chimney
    const smoke = new THREE.Group(); smoke.position.set(0, 2.2, 2.1);
    const puffMat = plastic(0xeef0f2, { trans: true, opacity: 0.72 }), puffs = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(G.low, puffMat); m.castShadow = false; smoke.add(m);
      puffs.push({ m, l: i / 7, k: i * 1.9 });
    }
    return {
      mesh: b.build({ name: 'hogexpress' }), seat: [0, 1.0, -0.85], control: 'yoke', wheels,
      parts: [smoke, ...rods.flatMap((r) => [r.coupling, r.con, r.piston])],
      exhaust: [[0, 2.25, 2.1, -0.45, 1.4]],
      fx(s, dt) {
        const a = wheels[0].spin.rotation.x;
        for (const r of rods) {
          const ang = a + r.ph, py = DR + RC * CO(ang), pz = RC * S(ang), dy = DR - py;
          r.coupling.position.y = py; r.coupling.position.z = pz;
          const fz = 1.25 + pz, xz = fz + Math.sqrt(LC * LC - dy * dy);
          r.con.position.set(r.x, py, fz); r.con.rotation.x = Math.atan2(-dy, xz - fz);
          r.piston.position.z = xz;
        }
        const rate = 0.45 + s.speed01 * 1.2 + (s.boosting ? 1.2 : 0);
        for (const p of puffs) {
          p.l += dt * rate; if (p.l >= 1) p.l -= 1;
          const l = p.l;
          p.m.position.set(S(p.k + l * 3) * 0.15 * l, l * 1.1, -l * (0.6 + s.speed01 * 3));
          p.m.scale.setScalar((0.1 + l * 0.32) * (l > 0.75 ? (1 - l) * 4 : 1));
        }
        fire.emissiveIntensity = 0.9 + S(s.t * 9) * 0.25 + S(s.t * 23) * 0.1 + (s.boosting ? 1.5 : 0);
      },
    };
  },
};

// ---- Knight Bus: the purple triple-decker squashed into a kart; its decks sway in the corners ----
const knightBus = {
  id: 'knightbus', name: 'Knight Bus', form: 'Triple-decker bus', blurb: 'Takes corners on two wheels',
  stats: { speed: 3, accel: 3, handling: 2, weight: 5 }, colors: [0x5c2a91, 0xe6c05a, 0xffd77a, 0x1b2a34],
  build(kit) {
    const f = fitOf(kit.rig);
    const PU = 0x5c2a91, PU2 = 0x45206e, GOLD = C.pearl, BK = C.black, CH = C.ltgray;
    const WIN = LIT(0xffc860, 0.9), WC = 0xffe6a0;
    const Z0 = -0.95 - f.wide * 0.25, Z1 = -2.35, DZ = (Z0 + Z1) / 2, DEP = Z0 - Z1;   // the deck stack, behind the driver
    const b = new BrickBuilder(0.4);
    // chassis, open front cab walls with a gold band and lettering
    b.box(0, 0.25, -0.1, 1.9, 0.3, 4.5, BK);
    for (const sd of [-1, 1]) {
      b.box(sd * 0.93, 0.55, 0.2, 0.14, 0.65, 2.2, PU);
      b.box(sd * 0.95, 1.1, 0.2, 0.12, 0.06, 2.22, GOLD);
      b.box(sd * 1.0, 0.95, 1.4, 0.4, 0.07, 0.95, BK);                         // front mudguards
      rbox(b, sd * 1.0, 0.8, 1.92, 0.4, 0.3, 0.07, -0.6, 0, 0, BK);
    }
    // bonnet and radiator, headlamps
    b.box(0, 0.55, 1.7, 1.9, 0.5, 0.8, PU);
    rbox(b, 0, 0.88, 2.11, 0.62, 0.56, 0.05, 0, 0, 0, CH, CHROME);
    for (let i = 0; i < 6; i++) rbox(b, 0, 0.66 + i * 0.09, 2.14, 0.52, 0.03, 0.02, 0, 0, 0, 0x2a2e33);
    rbox(b, 0, 1.18, 2.05, 0.66, 0.06, 0.2, 0, 0, 0, CH, CHROME);
    for (const sd of [-1, 1]) {
      geo(b, G.cylZ, CH, M(sd * 0.78, 1.15, 1.95, 0, 0, 0, 0.14, 0.14, 0.12), CHROME);
      geo(b, G.cylZ, 0xfff4d0, M(sd * 0.78, 1.15, 2.01, 0, 0, 0, 0.11, 0.11, 0.03), LIT(0xfff0b0, 1.2));
    }
    rbox(b, 0, 0.3, 2.2, 1.95, 0.12, 0.1, 0, 0, 0, BK);
    // windscreen, dashboard, driver's bench
    rbox(b, 0, 1.45, 1.15, 1.8, 0.5, 0.04, -0.12, 0, 0, C.azure, GLASS);
    for (const sd of [-1, 1]) rbox(b, sd * 0.93, 1.45, 1.15, 0.08, 0.55, 0.08, -0.12, 0, 0, PU);
    rbox(b, 0, 1.73, 1.12, 1.94, 0.07, 0.1, 0, 0, 0, PU);
    b.box(0, 0.9, 0.95, 1.7, 0.3, 0.3, PU2);
    b.box(0, 0.75, -0.32, clamp(f.hip * 2 + 0.1, 1.2, 1.75), 0.13, 0.75, 0x7a1f1f);
    b.box(0, 0.75, Z0 + 0.12, 1.7, 0.7, 0.18, 0x7a1f1f);
    // rear wheel arches, platform pole, lamps and plate
    for (const sd of [-1, 1]) rbox(b, sd * 1.0, 0.98, -1.65, 0.42, 0.06, 1.0, 0, 0, 0, BK);
    rod(b, [-0.86, 0.55, Z1 - 0.06], [-0.86, 1.55, Z1 - 0.06], 0.04, CH, CHROME);
    rbox(b, 0, 0.4, Z1 - 0.02, 0.5, 0.15, 0.03, 0, 0, 0, C.yellow);
    for (const sd of [-1, 1]) rbox(b, sd * 0.8, 0.45, Z1 - 0.02, 0.14, 0.12, 0.03, 0, 0, 0, C.red, LIT(0xff2020, 1));
    // the three decks, nested so each leans a little more than the one below
    const deck = (name, h, fn) => {
      const db = new BrickBuilder(0.4);
      db.box(0, 0, 0, 1.98, h, DEP, PU);
      for (const sd of [-1, 1]) {
        db.box(sd * 0.995, h * 0.3, 0, 0.02, h * 0.4, DEP - 0.2, WC, WIN);
        for (let i = 0; i <= 3; i++) db.box(sd * 1.0, h * 0.3, -DEP / 2 + 0.1 + i * (DEP - 0.2) / 3, 0.03, h * 0.4, 0.06, PU2);
      }
      db.box(0, h * 0.3, -DEP / 2 - 0.005, 1.6, h * 0.4, 0.02, WC, WIN);
      db.box(0, h - 0.07, 0, 2.0, 0.07, DEP + 0.02, GOLD);
      fn(db);
      const g = new THREE.Group(); g.add(db.build({ name })); return g;
    };
    const d1 = deck('deck1', 1.0, (db) => {
      for (const sd of [-1, 1]) for (let i = 0; i < 9; i++) db.box(sd * 1.0, 0.08, -DEP / 2 + 0.2 + i * (DEP - 0.4) / 8, 0.02, 0.13, 0.07, GOLD);
    });
    d1.position.set(0, 0.55, DZ);
    const d2 = deck('deck2', 0.95, (db) => {
      db.box(0, 0.3, DEP / 2 + 0.005, 1.6, 0.38, 0.02, WC, WIN);
      db.box(0, 0.74, DEP / 2 + 0.01, 1.3, 0.13, 0.03, BK);
      db.box(0, 0.76, DEP / 2 + 0.025, 1.1, 0.09, 0.02, C.yellow, LIT(0xffd040, 1.3));   // destination blind
    });
    d2.position.y = 1.0; d1.add(d2);
    const d3 = deck('deck3', 0.9, (db) => {
      db.box(0, 0.3, DEP / 2 + 0.005, 1.6, 0.36, 0.02, WC, WIN);
      db.box(0, 0.9, 0, 1.9, 0.1, DEP - 0.06, PU2);
      for (const sd of [-1, 1]) geo(db, G.cylZ, PU2, M(sd * 0.95, 0.92, 0, 0, 0, 0, 0.06, 0.06, DEP - 0.06));
      geo(db, G.cylY, CH, M(0.5, 1.06, DEP / 2 - 0.25, 0, 0, 0, 0.08, 0.12, 0.08), CHROME);
      db.box(-0.4, 1.0, 0, 0.6, 0.12, 0.6, C.brown);                                    // luggage
    });
    d3.position.y = 0.95; d2.add(d3);
    // a shrunken head dangling from the windscreen rail
    const dre = new THREE.Group(); dre.position.set(0.5, 1.7, 1.08);
    const hb = new BrickBuilder(0.4);
    rod(hb, [0, 0, 0], [0, -0.22, 0], 0.012, BK);
    ell(hb, 0, -0.32, 0, 0.1, 0.11, 0.1, C.rbrown);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; rod(hb, [CO(a) * 0.07, -0.26, S(a) * 0.07], [CO(a) * 0.12, -0.46, S(a) * 0.12], 0.02, BK); }
    for (const sd of [-1, 1]) rbox(hb, sd * 0.04, -0.3, 0.09, 0.03, 0.02, 0.02, 0, 0, 0, C.white);
    dre.add(hb.build({ name: 'dre' }));
    let sway = 0, sq = 1;
    return {
      mesh: b.build({ name: 'knightbus' }), seat: [0, 0.89, -0.32], control: 'wheel', parts: [d1, dre], glider: { z: -0.15 },
      wheels: [{ x: 0, z: -1.65, r: 0.44, w: 0.44, xs: [1.0, -1.0] }, { x: 1.0, z: 1.4, r: 0.4, w: 0.32, front: true }, { x: -1.0, z: 1.4, r: 0.4, w: 0.32, front: true }],
      exhaust: [[0.7, 0.32, Z1 - 0.1, BACK], [-0.7, 0.32, Z1 - 0.1, BACK]],
      fx(s, dt) {
        // the decks lean out of the corner and wobble; on boost the bus squeezes thin, like in the film
        sway += (-s.steer * 0.075 * (0.3 + s.speed01) - sway) * ease(dt, 3);
        const wob = S(s.t * 4.3) * 0.012 * (0.3 + s.speed01);
        d1.rotation.z = sway * 0.5 + wob * 0.5; d2.rotation.z = sway * 0.8 + wob; d3.rotation.z = sway + wob * 1.4;
        sq += ((s.boosting ? 0.78 : 1) - sq) * ease(dt, 8);
        d1.scale.set(sq, 1 + (1 - sq) * 0.35, 1);
        dre.rotation.z = s.steer * 0.6 + S(s.t * 3.1) * 0.25;
        dre.rotation.x = s.speed01 * 0.4 + S(s.t * 2.3) * 0.15;
      },
    };
  },
};

// ---- Hagrid's motorbike: a big black bike with a sidecar (Hedwig rides along) ------------------
const hagridBike = {
  id: 'hagridbike', name: "Hagrid's Motorbike", form: 'Sidecar bike', blurb: 'Sidecar lifts in the bends',
  stats: { speed: 4, accel: 3, handling: 2, weight: 4 }, colors: [0x1b2a34, 0xa0a5a9, 0x583927, 0xf4f4f4],
  build(kit) {
    const { wheelGeo, wheelMat, sprung } = kit; const f = fitOf(kit.rig);
    const BK = 0x1e2226, CH = C.ltgray, LE = C.brown, BX = -0.42, SX = 0.62 + f.wide * 0.32;
    const RZ = -1.25, RR = 0.52, FR = 0.5, H = [BX, 1.36, 1.0], A = [BX, FR, 1.72];
    const b = new BrickBuilder(0.4);
    // frame, engine with chrome finned cylinders, tank, saddle
    rod(b, H, [BX, 1.02, -0.6], 0.07, BK); rod(b, [BX, 1.25, 1.0], [BX, 0.32, 0.35], 0.07, BK);
    rod(b, [BX, 0.32, 0.35], [BX, 0.32, -0.9], 0.07, BK);
    for (const sd of [-1, 1]) { rod(b, [BX + sd * 0.2, RR, RZ], [BX + sd * 0.12, 0.34, -0.8], 0.05, BK); rod(b, [BX + sd * 0.2, RR, RZ], [BX + sd * 0.12, 1.0, -0.7], 0.05, BK); }
    rbox(b, BX, 0.5, -0.05, 0.42, 0.4, 0.66, 0, 0, 0, C.dkgray);
    for (let i = 0; i < 4; i++) geo(b, G.cylY, CH, M(BX, 0.78 + i * 0.07, 0.05, 0, 0, 0, 0.2, 0.04, 0.22), CHROME);
    geo(b, G.cylX, CH, M(BX + 0.25, 0.45, -0.1, 0, 0, 0, 0.06, 0.18, 0.18), CHROME);
    ell(b, BX, 1.14, 0.6, 0.3, 0.2, 0.46, BK);
    ell(b, BX, 1.14, 0.6, 0.31, 0.06, 0.42, CH, CHROME);
    geo(b, G.cylX, C.pearl, M(BX, 1.16, 0.62, 0, 0, 0, 0.64, 0.07, 0.07), BRASS);
    rbox(b, BX, 0.98, -0.55, 0.62, 0.14, 0.95, 0, 0, 0, LE);
    rbox(b, BX, 1.1, -1.05, 0.5, 0.18, 0.2, -0.2, 0, 0, LE);
    // rear mudguard, rack, saddlebags, fishtail exhausts
    rbox(b, BX, RR + 0.62, RZ - 0.05, 0.34, 0.06, 0.7, 0, 0, 0, BK);
    rbox(b, BX, RR + 0.4, RZ - 0.6, 0.34, 0.06, 0.5, -1.0, 0, 0, BK);
    rbox(b, BX, 0.36 + RR * 0.5, RZ - 0.78, 0.18, 0.08, 0.04, 0, 0, 0, C.red, LIT(0xff2010, 1.2));
    for (const sd of [-1, 1]) {
      rbox(b, BX + sd * 0.42, 0.9, RZ + 0.05, 0.24, 0.4, 0.6, 0, 0, 0, LE);
      rbox(b, BX + sd * 0.43, 1.08, RZ + 0.05, 0.27, 0.05, 0.62, 0, 0, 0, C.rbrown);
      rod(b, [BX + sd * 0.15, 0.42, 0.1], [BX + sd * 0.32, 0.38, -0.5], 0.06, CH, CHROME);
      rod(b, [BX + sd * 0.32, 0.38, -0.5], [BX + sd * 0.34, 0.42, -1.8], 0.06, CH, CHROME);
      rbox(b, BX + sd * 0.34, 0.44, -1.9, 0.07, 0.2, 0.3, 0.1, 0, 0, CH, CHROME);
    }
    // the sidecar: a black boat body with chrome trim, a little windscreen and struts to the bike
    b.box(SX, 0.32, -0.15, 0.86, 0.5, 1.4, BK);
    ell(b, SX, 0.57, 0.55, 0.43, 0.25, 0.55, BK);
    ell(b, SX, 0.57, -0.85, 0.43, 0.25, 0.3, BK);
    rbox(b, SX, 0.84, -0.15, 0.9, 0.04, 1.42, 0, 0, 0, CH, CHROME);
    b.box(SX, 0.7, -0.45, 0.66, 0.1, 0.6, 0x7a1f1f);
    rbox(b, SX, 1.0, 0.42, 0.7, 0.3, 0.03, -0.45, 0, 0, C.azure, GLASS);
    for (const z of [0.45, -0.6]) rod(b, [BX + 0.08, 0.4, z], [SX - 0.4, 0.42, z], 0.045, CH, CHROME);
    rbox(b, SX + 0.5, 0.78, -0.15, 0.24, 0.06, 0.7, 0, 0, 0, BK);
    geo(b, G.cylZ, 0xfff4d0, M(SX + 0.3, 0.75, 1.02, 0, 0, 0, 0.07, 0.07, 0.05), LIT(0xfff0b0, 1));
    // Hedwig in the sidecar: a snowy owl whose head swivels round
    const owl = new THREE.Group(); owl.position.set(SX, 0.8, -0.38);
    const ob = new BrickBuilder(0.4);
    ell(ob, 0, 0.22, 0, 0.2, 0.26, 0.19, C.white);
    for (let i = 0; i < 5; i++) rbox(ob, S(i * 2.1) * 0.1, 0.15 + (i % 3) * 0.08, 0.17, 0.04, 0.02, 0.02, 0, 0, 0, 0x30343a);
    owl.add(ob.build({ name: 'owl' }));
    const owlHead = new THREE.Group(); owlHead.position.y = 0.52; owl.add(owlHead);
    const ohb = new BrickBuilder(0.4);
    ell(ohb, 0, 0, 0, 0.17, 0.15, 0.16, C.white);
    for (const sd of [-1, 1]) { geo(ohb, G.cylZ, C.yellow, M(sd * 0.07, 0.02, 0.14, 0, 0, 0, 0.045, 0.045, 0.03)); geo(ohb, G.cylZ, 0x111111, M(sd * 0.07, 0.02, 0.155, 0, 0, 0, 0.02, 0.02, 0.02)); }
    geo(ohb, G.cone, 0x30343a, M(0, -0.04, 0.17, PI / 2 + 0.5, 0, 0, 0.03, 0.07, 0.03));
    owlHead.add(ohb.build({ name: 'owlHead' }));
    // raked front fork carrying the front wheel and the big headlamp
    const rake = -Math.atan2(A[2] - H[2], H[1] - A[1]), L = Math.hypot(A[2] - H[2], H[1] - A[1]);
    const fork = new THREE.Group(); fork.position.set(...H); fork.rotation.x = rake;
    const steerG = new THREE.Group(); fork.add(steerG);
    const fb = new BrickBuilder(0.4);
    for (const sd of [-1, 1]) { rod(fb, [sd * 0.15, 0.2, 0], [sd * 0.15, -L, 0], 0.055, CH, CHROME); rbox(fb, sd * 0.15, -L, 0, 0.08, 0.16, 0.16, 0, 0, 0, C.dkgray); }
    rbox(fb, 0, 0.1, 0, 0.44, 0.08, 0.16, 0, 0, 0, BK);
    rbox(fb, 0, -L + FR + 0.12, 0.05, 0.3, 0.06, 0.62, -rake, 0, 0, BK);
    const hl = [0, -0.1 * CO(rake) - 0.32 * S(-rake), 0.32 * CO(rake) - 0.1 * S(-rake)];
    ell(fb, hl[0], hl[1], hl[2], 0.2, 0.2, 0.2, CH, CHROME);
    geo(fb, G.cylZ, 0xfff4d0, M(hl[0], hl[1] + 0.03, hl[2] + 0.12, -rake, 0, 0, 0.16, 0.16, 0.05), LIT(0xfff0b0, 1.6));
    steerG.add(fb.build({ name: 'fork' }));
    const fSpin = new THREE.Mesh(wheelGeo(FR, 0.24, CH, [0]), wheelMat); fSpin.position.set(0, -L, 0); steerG.add(fSpin);
    const sSpin = new THREE.Mesh(wheelGeo(0.34, 0.2, CH, [0]), wheelMat); sSpin.position.set(SX + 0.5, 0.34, -0.15);
    // a big rider gets a slightly bigger bike (y and z scale alike so wheels stay round)
    const k = 1 + f.big * 0.06;
    let lift = 0, look = 0;
    return {
      mesh: grow([b.build({ name: 'hagridbike' }), fork, sSpin, owl], 1, k, k), seat: [BX, 1.06 * k, -0.55 * k], control: 'bars', glider: { x: BX },
      wheels: [{ x: BX, z: RZ * k, r: RR * k, w: 0.32, cap: CH }, { g: new THREE.Group(), spin: fSpin, front: false, r: FR * k }, { g: new THREE.Group(), spin: sSpin, front: false, r: 0.34 * k }],
      exhaust: [[BX + 0.34, 0.44 * k, -2.05 * k, BACK, 1.2], [BX - 0.34, 0.44 * k, -2.05 * k, BACK, 1.2]],
      fx(s, dt) {
        steerG.rotation.y = -s.steer * 0.35;
        // the sidecar wheel lifts in right-hand bends (and pops up on boost)
        lift += (Math.max(0, s.steer) * 0.12 * Math.min(1, s.speed01 * 1.5) + (s.boosting ? 0.06 : 0) - lift) * ease(dt, 5);
        rollAbout(sprung, lift, BX);
        look += (S(s.t * 0.6) * 1.3 - s.steer * 0.6 - look) * ease(dt, 3);
        owlHead.rotation.y = look; owlHead.rotation.z = S(s.t * 1.7) * 0.15;
      },
    };
  },
};

// ---- Firebolt: an international-standard racing broom with a fluttering Golden Snitch -------------
const firebolt = {
  id: 'firebolt', name: 'Firebolt', form: 'Racing broom', blurb: 'Chasing the Golden Snitch',
  stats: { speed: 5, accel: 4, handling: 3, weight: 1 }, colors: [0x4a2214, 0xd4a63a, 0x9c1c1c, 0xc9a66b],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const WD = 0x4a2214, TW = 0xc9a66b, TW2 = 0xa8844e, GOLD = 0xd4a63a, SC = 0x9c1c1c, GLD = { matOpts: { metal: 0.75, rough: 0.25 } };
    const TILT = -0.035, y = (z) => 0.56 + (z - 0.7) * 0.035;   // handle centre line
    const b = new BrickBuilder(0.4);
    // slim tapered mahogany handle with a gold tip and registration bands
    geo(b, new THREE.CylinderGeometry(0.05, 0.095, 3.5, 10).rotateX(PI / 2), WD, M(0, y(0.7), 0.7, TILT, 0, 0), { matOpts: { rough: 0.15 } });
    ell(b, 0, y(2.47), 2.47, 0.06, 0.06, 0.08, GOLD, GLD);
    for (const z of [1.95, 2.1, 2.2]) geo(b, G.cylZ, GOLD, M(0, y(z), z, TILT, 0, 0, 0.07, 0.07, z === 1.95 ? 0.12 : 0.03), GLD);
    // sleek saddle and scarlet-and-gold side panels (Quidditch colours) that hide the legs
    const PX = Math.max(0.3, f.hip * 0.62);
    rbox(b, 0, 0.67, -0.35, 0.42, 0.1, 0.8, 0, 0, 0, 0x3a1d12);
    rbox(b, 0, 0.74, -0.78, 0.36, 0.14, 0.12, 0, 0, 0, 0x3a1d12);
    for (const sd of [-1, 1]) {
      rbox(b, sd * PX, 0.5, -0.12, 0.04, 0.38, 1.1, 0, 0, sd * 0.22, SC);
      rbox(b, sd * (PX + 0.04), 0.32, -0.12, 0.03, 0.05, 1.12, 0, 0, sd * 0.22, GOLD, GLD);
      rbox(b, sd * (PX + 0.03), 0.52, 0.3, 0.02, 0.14, 0.14, PI / 4, 0, sd * 0.22, GOLD, GLD);
      // gold footrests
      rod(b, [sd * 0.06, y(0.3) - 0.05, 0.3], [sd * 0.3, 0.2, 0.5], 0.025, GOLD, GLD);
      rbox(b, sd * 0.34, 0.19, 0.52, 0.16, 0.03, 0.2, 0, 0, 0, GOLD, GLD);
    }
    // the tail: a streamlined teardrop of birch twigs (flares out on boost)
    const tail = new THREE.Group(); tail.position.set(0, y(-1.1), -1.1);
    const tb = new BrickBuilder(0.4);
    geo(tb, G.cylZ, GOLD, M(0, 0, 0, 0, 0, 0, 0.13, 0.13, 0.12), GLD);
    geo(tb, G.cylZ, WD, M(0, 0, -0.14, 0, 0, 0, 0.15, 0.15, 0.08));
    geo(tb, G.cone, TW2, M(0, 0, -0.95, PI / 2, 0, 0, 0.27, 1.5, 0.27));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2, c = CO(a), s = S(a), col = i % 2 ? TW : TW2;
      rod(tb, [c * 0.09, s * 0.09, -0.1], [c * 0.33, s * 0.3, -0.95], 0.035, col);
      rod(tb, [c * 0.33, s * 0.3, -0.95], [c * 0.24, s * 0.22, -1.7], 0.03, col);
    }
    tail.add(tb.build({ name: 'twigs' }));
    // Gryffindor ribbons streaming off the tail
    const ribbons = [];
    for (const sd of [-1, 1]) {
      let parent = tail;
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group(); g.position.set(i ? 0 : sd * 0.12, i ? 0 : 0.25, i ? -0.32 : -1.55); parent.add(g);
        const rb = new BrickBuilder(0.4); rbox(rb, 0, 0, -0.16, 0.02, 0.1, 0.32, 0, 0, 0, (i + (sd > 0 ? 0 : 1)) % 2 ? GOLD : SC);
        g.add(rb.build({ name: 'ribbon' })); ribbons.push({ g, i, sd }); parent = g;
      }
    }
    // the Golden Snitch, darting around ahead of the broom
    const snitch = new THREE.Group();
    const sb = new BrickBuilder(0.4);
    ell(sb, 0, 0, 0, 0.09, 0.09, 0.09, GOLD, { matOpts: { metal: 0.8, rough: 0.2, emissive: 0x6a4a10, emissiveIntensity: 0.6 } });
    snitch.add(sb.build({ name: 'snitch' }));
    const sw = [];
    for (const sd of [-1, 1]) {
      const w = new THREE.Group(); w.position.x = sd * 0.07; snitch.add(w);
      const wb = new BrickBuilder(0.4);
      rbox(wb, sd * 0.17, 0, -0.04, 0.32, 0.01, 0.12, 0, sd * 0.25, 0, 0xf4f4f4);
      rbox(wb, sd * 0.3, 0, -0.1, 0.12, 0.012, 0.08, 0, sd * 0.5, 0, 0xe0e4e8);
      w.add(wb.build({ name: 'snitchWing' })); sw.push({ w, sd });
    }
    let lean = 0, pitch = 0, flare = 1;
    return {
      mesh: b.build({ name: 'firebolt' }), seat: [0, 0.76, -0.35], control: 'bars', hover: 0.6, glider: { z: -0.6 },
      parts: [tail, snitch], exhaust: [[0.1, y(-2.8), -2.8, BACK, 0.8], [-0.1, y(-2.8), -2.8, BACK, 0.8]],
      fx(s, dt) {
        lean += (s.steer * 0.4 * Math.min(1, 0.3 + s.speed01 * 1.4) - lean) * ease(dt, 6);
        pitch += ((s.boosting ? 0.12 : s.gliding ? -0.14 : 0) - pitch) * ease(dt, 4);
        sprung.rotation.z = lean; sprung.rotation.x = pitch + S(s.t * 2.1) * 0.025;
        flare += ((s.boosting ? 1.3 : 1) - flare) * ease(dt, 8);
        tail.scale.set(flare, flare, 1 + (flare - 1) * 0.4);
        for (const r of ribbons) { r.g.rotation.y = S(s.t * (8 + s.speed01 * 8) - r.i * 1.2 + r.sd) * (0.15 + 0.15 * s.speed01); r.g.rotation.x = S(s.t * 6 - r.i) * 0.1; }
        snitch.position.set(S(s.t * 1.7) * 0.7, 1.35 + S(s.t * 3.1) * 0.3, 3.0 + S(s.t * 2.3) * 0.35);
        snitch.rotation.y = CO(s.t * 1.7) * 0.6;
        for (const w of sw) w.w.rotation.z = w.sd * S(s.t * 45) * 0.7;
      },
    };
  },
};

// ---- Buckbeak: the hippogriff trots on talons and hooves and spreads his wings to glide ----------
const buckbeak = {
  id: 'buckbeak', name: 'Buckbeak', form: 'Hippogriff', blurb: 'Bow first, then fly',
  stats: { speed: 3, accel: 4, handling: 4, weight: 2 }, colors: [0x8d9196, 0xc4c8cc, 0xfe8a18, 0x5d6166],
  build(kit) {
    const { sprung } = kit; const f = fitOf(kit.rig);
    const GR = 0x8d9196, GR2 = 0x6c7075, GR3 = 0xc4c8cc, BEAK = 0xd9b35a, TAL = 0xe0b24a, HOOF = 0x2a2a2a;
    const WX = Math.max(0.66, f.hip + 0.08);
    const b = new BrickBuilder(0.4);
    // horse barrel and rump, feathered eagle chest, neck with a ruff
    ell(b, 0, 1.05, -0.2, 0.6, 0.45, 1.0, GR);
    ell(b, 0, 1.1, -0.95, 0.56, 0.42, 0.5, GR2);
    ell(b, 0, 1.0, 0.72, 0.58, 0.45, 0.55, GR3);
    for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.2; rbox(b, S(a) * 0.5, 0.95 - (i % 2) * 0.15, 0.78 + CO(a) * 0.45, 0.2, 0.06, 0.24, 0.6, a, 0, i % 2 ? GR : GR3); }
    rbox(b, 0, 1.62, 1.18, 0.44, 0.85, 0.45, 0.55, 0, 0, GR3);
    for (let i = 0; i < 5; i++) rbox(b, (i - 2) * 0.1, 1.45, 1.38 + Math.abs(i - 2) * -0.04, 0.12, 0.3, 0.06, 0.3, 0, 0, i % 2 ? GR : GR3);
    rbox(b, 0, 1.47, -0.3, 0.7, 0.05, 0.55, 0, 0, 0, GR2);   // a feathered patch under the rider
    // head: grey eagle head with orange eyes and a hooked beak (turns into the corner)
    const head = new THREE.Group(); head.position.set(0, 2.0, 1.5);
    const hb = new BrickBuilder(0.4);
    ell(hb, 0, 0, 0, 0.26, 0.26, 0.32, GR3);
    geo(hb, G.cone, BEAK, M(0, -0.06, 0.42, PI / 2 + 0.35, 0, 0, 0.1, 0.34, 0.12));
    geo(hb, G.cone, BEAK, M(0, -0.18, 0.55, PI, 0, 0, 0.04, 0.12, 0.04));
    rbox(hb, 0, -0.16, 0.36, 0.12, 0.05, 0.2, 0.2, 0, 0, 0xc49a3a);
    for (const sd of [-1, 1]) {
      rbox(hb, sd * 0.2, 0.06, 0.16, 0.06, 0.09, 0.1, 0, sd * 0.4, 0, C.orange, LIT(0xff7a10, 0.5));
      rbox(hb, sd * 0.225, 0.06, 0.18, 0.03, 0.05, 0.05, 0, sd * 0.4, 0, 0x111111);
      rbox(hb, sd * 0.17, 0.15, 0.12, 0.12, 0.04, 0.14, 0, sd * 0.4, sd * -0.3, GR2);
      for (let i = 0; i < 3; i++) rbox(hb, sd * (0.06 + i * 0.06), 0.2 - i * 0.04, -0.28 - i * 0.04, 0.06, 0.05, 0.36, -0.35, sd * 0.25, 0, i % 2 ? GR : GR3);
    }
    head.add(hb.build({ name: 'buckbeakHead' }));
    // horse tail
    const tail = new THREE.Group(); tail.position.set(0, 1.25, -1.4);
    const tb = new BrickBuilder(0.4);
    for (let i = 0; i < 5; i++) rbox(tb, (i - 2) * 0.05, -0.35, -0.12 - Math.abs(i - 2) * 0.02, 0.07, 0.75, 0.08, 0.35, 0, (i - 2) * 0.08, i % 2 ? GR3 : GR);
    tail.add(tb.build({ name: 'tail' }));
    // legs: eagle talons in front, hooves behind (pivots at the shoulders/hips)
    const legs = [];
    for (const [x, z, off, front] of [[0.3, 0.75, 0, true], [-0.3, 0.75, 0.5, true], [0.32, -0.85, PI, false], [-0.32, -0.85, PI + 0.5, false]]) {
      const g = new THREE.Group(); g.position.set(x, 0.95, z);
      const lb = new BrickBuilder(0.4);
      if (front) {
        rbox(lb, 0, -0.25, 0, 0.26, 0.5, 0.3, 0, 0, 0, GR3);
        rbox(lb, 0, -0.68, 0.02, 0.12, 0.42, 0.12, 0, 0, 0, TAL);
        for (const a of [-0.45, 0, 0.45]) geo(lb, G.cone, 0x30343a, M(S(a) * 0.08, -0.9, 0.12 + CO(a) * 0.06, PI / 2 + 0.3, a, 0, 0.035, 0.18, 0.035));
        rbox(lb, 0, -0.9, 0.04, 0.18, 0.06, 0.16, 0, 0, 0, TAL);
      } else {
        rbox(lb, 0, -0.28, -0.02, 0.28, 0.56, 0.36, 0, 0, 0, GR2);
        rbox(lb, 0, -0.7, 0.02, 0.15, 0.36, 0.15, 0, 0, 0, GR2);
        rbox(lb, 0, -0.9, 0.03, 0.2, 0.1, 0.22, 0, 0, 0, HOOF);
      }
      g.add(lb.build({ name: 'leg' })); legs.push({ g, off, tuck: front ? 0.7 : 0.55 });
    }
    // wings: span along +X (or -X), folded back along the flanks with the feathers hanging down;
    // the pivot yaws them back and the inner group twists them flat and flaps
    const wings = [];
    for (const sd of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(sd * WX, 1.35, 0.55);
      const fl = new THREE.Group(); p.add(fl);
      const wb = new BrickBuilder(0.4);
      rbox(wb, sd * 0.55, 0, 0, 1.1, 0.1, 0.2, 0, 0, 0, GR);
      rbox(wb, sd * 0.55, -0.01, -0.3, 1.0, 0.06, 0.5, 0, 0, 0, GR3);
      for (let i = 0; i < 6; i++) {
        const len = 0.7 - i * 0.06, a = sd * (0.1 + i * 0.16);
        rbox(wb, sd * (1.05 + CO(a) * len * 0.5), 0, -0.05 - i * 0.12 - Math.abs(S(a)) * len * 0.5, len, 0.05, 0.16, 0, a, 0, i % 2 ? GR2 : GR);
      }
      for (let i = 0; i < 5; i++) rbox(wb, sd * (0.15 + i * 0.2), -0.02, -0.6, 0.18, 0.05, 0.3, 0, 0, 0, i % 2 ? GR : GR2);
      fl.add(wb.build({ name: 'wing' })); wings.push({ p, fl, sd });
    }
    let ph = 0, wph = 0, open = 0;
    // a big rider gets a slightly broader, taller hippogriff
    const kx = clamp(1 + (f.W - 1.3) * 0.25, 1, 1.15), ky = 1 + f.big * 0.05;
    return {
      mesh: grow([b.build({ name: 'buckbeak' }), head, tail, ...legs.map((l) => l.g), ...wings.map((w) => w.p)], kx, ky, ky),
      seat: [0, 1.5 * ky, -0.25 * ky], control: 'none',
      exhaust: [[0.25, 1.05 * ky, -1.45 * ky, BACK, 0.8], [-0.25, 1.05 * ky, -1.45 * ky, BACK, 0.8]],
      fx(s, dt) {
        const air = s.gliding || !s.grounded, pace = Math.min(1, 0.15 + s.speed01 * 1.3);
        ph += dt * (2 + s.speed01 * 10 + (s.boosting ? 4 : 0));
        for (const l of legs) l.g.rotation.x += ((air ? l.tuck : S(ph + l.off) * 0.65 * pace) - l.g.rotation.x) * ease(dt, 14);
        open += ((s.gliding ? 1 : s.boosting ? 0.6 : 0) - open) * ease(dt, 4);
        wph += dt * (s.gliding ? 4.5 : 12);
        const flap = S(wph) * (s.gliding ? 0.4 : 0.55);
        for (const w of wings) {
          w.p.rotation.y = w.sd * (PI / 2 - 0.08 - open * (PI / 2 - 0.3));
          w.fl.rotation.x = -PI / 2 * (1 - open); w.p.scale.setScalar(1 + open * 0.35);
          w.fl.rotation.z = w.sd * (open * (0.12 + flap) + (1 - open) * S(ph) * 0.04);
        }
        head.rotation.y = -s.steer * 0.35;
        head.rotation.x = (air ? -0.15 : S(ph * 2) * 0.07 * pace);
        head.position.y = 2.0 + (air ? 0 : Math.abs(S(ph)) * 0.05 * pace);
        tail.rotation.x = -0.25 - s.speed01 * 0.55 + S(ph * 0.7) * 0.08;
        tail.rotation.y = s.steer * 0.4 + S(ph * 0.5) * 0.2;
        sprung.position.y = air ? 0 : Math.abs(S(ph)) * 0.05 * pace;
      },
    };
  },
};

export default [anglia, express, knightBus, hagridBike, firebolt, buckbeak];
