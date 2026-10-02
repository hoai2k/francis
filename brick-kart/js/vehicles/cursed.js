// Cursed & Fantasy Rides vehicle pack (see buildVehicle in ../characters.js for the contract).
// Three Jujutsu Kaisen rides (Ijichi's sedan, Mahoraga's dharma wheel, Megumi's Nue) and three
// fantasy rides (magic carpet, walking dragon, mad teacup).
import { tools } from './cursed-kit.js';

const GLOW = (c, i = 1) => ({ matOpts: { emissive: c, emissiveIntensity: i } });
const CHROME = { matOpts: { metal: 0.85, rough: 0.25 } };
const GLASS = { matOpts: { trans: true, opacity: 0.4 } };

export default [
  // ---- Ijichi's black sedan: the Jujutsu High assistant's car, squashed into a kart ----
  {
    id: 'ijichi', name: "Ijichi's Sedan", form: 'Sedan', blurb: 'Jujutsu High chauffeur',
    stats: { speed: 4, accel: 2, handling: 2, weight: 5 }, colors: [0x1b2a34, 0xa0a5a9, 0xf4f4f4],
    build(kit) {
      const { THREE, BrickBuilder, C } = kit; const T = tools(kit);
      const K = 0x23262b, b = new BrickBuilder(0.4);
      // chassis + hood + trunk
      b.box(0, 0.26, -0.04, 2.1, 0.52, 4.5, K);
      b.box(0, 0.78, 1.45, 2.04, 0.2, 1.5, K);
      b.box(0, 0.98, 1.5, 0.5, 0.03, 1.3, 0x30343a);
      b.box(0, 0.78, -1.78, 2.04, 0.3, 1.04, K);
      // fenders over the fat wheels
      for (const sd of [-1, 1]) for (const z of [-1.45, 1.55]) {
        b.box(sd * 1.12, 0.84, z, 0.5, 0.12, 1.1, K);
        T.rbox(b, sd * 1.12, 0.66, z + 0.62, 0.5, 0.36, 0.1, -0.5, 0, 0, K);
        T.rbox(b, sd * 1.12, 0.66, z - 0.62, 0.5, 0.36, 0.1, 0.5, 0, 0, K);
      }
      // doors with a chrome belt line and handles, side mirrors
      for (const sd of [-1, 1]) {
        b.box(sd * 0.98, 0.78, -0.25, 0.14, 0.4, 1.9, K);
        b.box(sd * 1.06, 0.92, -0.25, 0.02, 0.05, 1.9, C.ltgray, CHROME);
        b.box(sd * 1.06, 0.98, -0.1, 0.03, 0.05, 0.22, C.ltgray, CHROME);
        T.rbox(b, sd * 1.12, 1.08, 0.66, 0.24, 0.14, 0.08, 0, sd * 0.3, 0, K);
        T.rbox(b, sd * 1.0, 1.0, 0.7, 0.04, 0.12, 0.04, 0, 0, sd * 0.4, K);
      }
      // grille, headlights, bumpers, hood emblem
      b.box(0, 0.36, 2.19, 1.2, 0.44, 0.06, C.ltgray, CHROME);
      for (let i = 0; i < 4; i++) b.box(0, 0.42 + i * 0.09, 2.22, 1.1, 0.04, 0.03, 0x15171a);
      b.box(0, 0.4, 2.23, 0.05, 0.36, 0.03, C.ltgray, CHROME);
      for (const sd of [-1, 1]) {
        b.box(sd * 0.8, 0.56, 2.2, 0.44, 0.2, 0.05, 0xfff4d0, GLOW(0xfff0b0, 1.1));
        b.box(sd * 0.8, 0.4, 2.2, 0.3, 0.08, 0.05, C.orange, GLOW(0xff8a18, 0.6));
        b.box(sd * 0.72, 0.62, -2.3, 0.5, 0.16, 0.05, C.red, GLOW(0xff2020, 1.0));
      }
      b.box(0, 0.16, 2.24, 2.2, 0.16, 0.16, C.ltgray, CHROME);
      b.box(0, 0.16, -2.32, 2.2, 0.16, 0.14, C.ltgray, CHROME);
      b.box(0, 0.36, -2.3, 0.6, 0.18, 0.03, C.white);           // number plate
      b.cyl(0, 0.98, 2.0, 0.08, 0.05, C.ltgray, { ...CHROME, seg: 10 });
      b.cyl(0.55, 0.12, -2.3, 0.07, 0.06, C.dkgray, { seg: 8 });
      // seat cushion + low back rest
      b.box(0, 0.78, -0.4, 1.4, 0.08, 0.85, 0x3a3f46);
      b.box(0, 0.78, -0.98, 1.7, 0.6, 0.22, 0x3a3f46);
      // windscreen with A-pillars
      T.rbox(b, 0, 1.22, 0.72, 1.82, 0.6, 0.04, -0.5, 0, 0, C.azure, GLASS);
      for (const sd of [-1, 1]) T.rbox(b, sd * 0.94, 1.22, 0.72, 0.08, 0.62, 0.08, -0.5, 0, 0, K);
      T.rbox(b, 0, 1.49, 0.58, 1.96, 0.07, 0.1, -0.5, 0, 0, K);
      // the rear roof stub (sedan C-pillars) with a back window and a ward talisman
      for (const sd of [-1, 1]) T.rbox(b, sd * 0.94, 1.3, -1.42, 0.12, 0.5, 0.42, 0.35, 0, 0, K);
      b.box(0, 1.5, -1.25, 1.98, 0.08, 0.48, K);
      T.rbox(b, 0, 1.3, -1.55, 1.78, 0.48, 0.04, 0.6, 0, 0, C.azure, GLASS);
      T.rbox(b, 0.3, 1.32, -1.52, 0.14, 0.34, 0.02, 0.6, 0, 0, 0xf4ecd0);
      T.rbox(b, 0.3, 1.32, -1.51, 0.05, 0.22, 0.02, 0.6, 0, 0, C.red);
      T.rod(b, [-0.85, 1.54, -1.4], [-0.95, 2.2, -1.65], 0.015, C.black, null, 4);
      // windscreen wipers (sweep with speed)
      const wipers = [];
      for (const sd of [-1, 1]) {
        const g = new THREE.Group(); g.position.set(sd * 0.48 - 0.1, 1.0, 0.89); g.rotation.x = -0.5;
        const arm = new THREE.Group(); g.add(arm);
        const wb = new BrickBuilder(0.4);
        wb.box(0, 0, 0.02, 0.035, 0.5, 0.03, 0x111214); wb.cyl(0, -0.02, 0.02, 0.04, 0.04, 0x111214, { seg: 6 });
        arm.add(wb.build({ name: 'wiper' })); wipers.push({ g, arm });
      }
      let ph = 0;
      return {
        mesh: b.build({ name: 'ijichi' }), seat: [0, 0.86, -0.38], control: 'wheel',
        wheels: [{ x: 0, z: -1.45, r: 0.44, w: 0.42, xs: [1.12, -1.12] }, { x: 1.12, z: 1.55, r: 0.4, w: 0.38, front: true }, { x: -1.12, z: 1.55, r: 0.4, w: 0.38, front: true }],
        parts: wipers.map((w) => w.g),
        fx(s, dt) {
          ph += dt * (1.5 + s.speed01 * 5);
          const a = 0.7 + 0.65 * Math.sin(ph);
          for (const w of wipers) w.arm.rotation.z = a;
        },
      };
    },
  },

  // ---- Mahoraga's dharma wheel: the driver rides inside a giant eight-handled wheel ----
  {
    id: 'dharma', name: 'Dharma Wheel', form: 'Monowheel', blurb: 'Adapts to every corner',
    stats: { speed: 4, accel: 2, handling: 3, weight: 4 }, colors: [0xd4a63a, 0xf4f4f4, 0x1b2a34],
    build(kit) {
      const { THREE, BrickBuilder, C } = kit; const T = tools(kit);
      const R = 1.45, GOLD = 0xd4a63a, W = 0xf4f4f4;
      // the rolling drum: two tyred rims joined by rungs, dharma spokes and handles on each face
      const g = new THREE.Group(); g.position.set(0, R, 0);
      const spin = new THREE.Group(); g.add(spin);
      const sb = new BrickBuilder(0.4);
      const ringYZ = (r, tube, rs, ts) => new THREE.TorusGeometry(r, tube, rs, ts).rotateY(Math.PI / 2);
      for (const sd of [-1, 1]) {
        T.geo(sb, ringYZ(R - 0.13, 0.13, 6, 32), 0x18191b, T.M(sd * 1.12, 0, 0));
        T.geo(sb, ringYZ(R - 0.32, 0.075, 4, 28), GOLD, T.M(sd * 1.12, 0, 0));
        T.geo(sb, ringYZ(0.32, 0.06, 5, 16), GOLD, T.M(sd * 1.25, 0, 0));
        T.geo(sb, T.cylX, GOLD, T.M(sd * 1.22, 0, 0, 0, 0, 0, 0.22, 0.2, 0.2));
        T.geo(sb, T.cylX, W, T.M(sd * 1.34, 0, 0, 0, 0, 0, 0.06, 0.11, 0.11));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
          T.rbox(sb, sd * 1.25, c * 0.72, s * 0.72, 0.07, 0.82, 0.09, a, 0, 0, GOLD);
          T.rbox(sb, sd * 1.33, c * (R - 0.2), s * (R - 0.2), 0.08, 0.34, 0.08, a, 0, 0, GOLD);
          T.geo(sb, T.cylX8, W, T.M(sd * 1.33, c * (R - 0.04), s * (R - 0.04), 0, 0, 0, 0.1, 0.075, 0.075));
        }
      }
      for (let i = 0; i < 8; i++) {
        const a = ((i + 0.5) / 8) * Math.PI * 2;
        T.geo(sb, T.cylX8, GOLD, T.M(0, Math.cos(a) * (R - 0.12), Math.sin(a) * (R - 0.12), 0, 0, 0, 2.1, 0.05, 0.05));
      }
      spin.add(sb.build({ name: 'dharmaDrum' }));
      // static pod hanging from the hubs
      const b = new BrickBuilder(0.4);
      for (const sd of [-1, 1]) {
        T.rod(b, [sd * 1.0, R, 0], [sd * 0.55, 0.62, -0.2], 0.07, W);
        T.rod(b, [sd * 1.0, R, 0], [sd * 0.5, 0.6, 0.2], 0.05, W);
        T.geo(b, T.cylX, GOLD, T.M(sd * 1.02, R, 0, 0, 0, 0, 0.1, 0.13, 0.13));
      }
      b.box(0, 0.4, -0.25, 1.1, 0.42, 0.8, W);
      b.box(0, 0.82, -0.25, 1.12, 0.05, 0.82, GOLD);
      b.box(0, 0.82, -0.62, 1.1, 0.55, 0.12, W);
      b.box(0, 0.36, 0.3, 0.9, 0.46, 0.26, W);
      b.box(0, 0.82, 0.3, 0.92, 0.05, 0.28, GOLD);
      for (const sd of [-1, 1]) b.box(sd * 0.56, 0.5, -0.25, 0.03, 0.06, 0.82, 0x81007b);
      // Mahoraga's adaptation wheel floats above: it clicks round an eighth at a time
      const halo = new THREE.Group(); halo.position.set(0, 3.25, -0.15);
      const hb = new BrickBuilder(0.4), hm = { matOpts: { metal: 0.55, rough: 0.3, emissive: 0x6a4a10, emissiveIntensity: 0.5 } };
      T.geo(hb, new THREE.TorusGeometry(0.36, 0.05, 5, 24), GOLD, T.M(0, 0, 0), hm);
      T.geo(hb, T.cylX, GOLD, T.M(0, 0, 0, 0, Math.PI / 2, 0, 0.1, 0.09, 0.09), hm);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        T.rbox(hb, -s * 0.2, c * 0.2, 0, 0.04, 0.34, 0.04, 0, 0, a, GOLD, hm);
        T.rbox(hb, -s * 0.47, c * 0.47, 0, 0.05, 0.18, 0.05, 0, 0, a, GOLD, hm);
        T.rbox(hb, -s * 0.58, c * 0.58, 0, 0.1, 0.1, 0.1, 0, 0, a + Math.PI / 4, GOLD, hm);
      }
      halo.add(hb.build({ name: 'halo' }));
      let timer = 0, target = 0;
      return {
        mesh: b.build({ name: 'dharmaPod' }), seat: [0, 0.86, -0.28], control: 'bars',
        wheels: [{ g, spin, front: false, r: R }],
        parts: [halo], glider: [0, 3.5, -0.4],
        fx(s, dt) {
          timer += dt * (1 + Math.abs(s.steer) * 1.5 + (s.boosting ? 3 : 0));
          if (timer > 1.6) { timer = 0; target -= Math.PI / 4; }
          halo.rotation.z += (target - halo.rotation.z) * Math.min(1, dt * 14);
          halo.position.y = 3.25 + Math.sin(s.t * 2.2) * 0.05;
        },
      };
    },
  },

  // ---- Nue: Megumi's thunder-bird shikigami, a hover ride with flapping wings ----
  {
    id: 'nue', name: 'Nue', form: 'Shikigami bird', blurb: 'Ten Shadows thunderbird',
    stats: { speed: 3, accel: 4, handling: 4, weight: 2 }, colors: [0x24262b, 0xf4f4f4, 0x6fd0ff],
    build(kit) {
      const { THREE, BrickBuilder, C } = kit; const T = tools(kit);
      const N = 0x24262b, N2 = 0x3a3d45, ZAP = GLOW(0x5fc8ff, 1.6);
      const b = new BrickBuilder(0.4);
      // feathered body, belly and neck
      T.geo(b, T.sphere, N, T.M(0, 0.35, -0.05, 0, 0, 0, 0.72, 0.48, 1.35));
      T.geo(b, T.sphere, N2, T.M(0, 0.22, 0.4, -0.25, 0, 0, 0.56, 0.36, 0.85));
      T.geo(b, T.lowSphere, N, T.M(0, 0.66, 1.08, 0.6, 0, 0, 0.4, 0.42, 0.52));
      // saddle cloth with side flaps
      b.box(0, 0.78, -0.35, 0.95, 0.1, 0.95, 0x3c2a6b);
      for (const sd of [-1, 1]) {
        T.rbox(b, sd * 0.58, 0.58, -0.35, 0.06, 0.5, 0.9, 0, 0, sd * 0.35, 0x3c2a6b);
        T.rbox(b, sd * 0.69, 0.4, -0.35, 0.05, 0.08, 0.92, 0, 0, sd * 0.35, C.yellow);
      }
      // tail fan with silver tips
      for (let i = -2; i <= 2; i++) {
        T.rbox(b, i * 0.2, 0.5, -1.75, 0.18, 0.05, 1.0, 0.22, i * 0.16, 0, N);
        T.rbox(b, i * 0.29, 0.62, -2.27, 0.18, 0.05, 0.24, 0.22, i * 0.16, 0, 0xd0d4d8);
      }
      // dangling talons
      for (const sd of [-1, 1]) {
        T.rod(b, [sd * 0.3, 0.05, 0.2], [sd * 0.32, -0.28, 0.35], 0.06, C.dkgray, null, 6);
        for (const a of [-0.4, 0, 0.4]) T.rbox(b, sd * 0.32 + Math.sin(a) * 0.1, -0.32, 0.43 + Math.cos(a) * 0.05, 0.05, 0.05, 0.2, 0.5, a, 0, C.yellow);
      }
      // head (turns into the corner): dark skull, white mask, hooked beak, horn tufts
      const head = new THREE.Group(); head.position.set(0, 0.95, 1.5);
      const hb = new BrickBuilder(0.4);
      T.geo(hb, T.sphere, N, T.M(0, 0, 0, 0, 0, 0, 0.38, 0.35, 0.4));
      T.rbox(hb, 0, 0.03, 0.28, 0.5, 0.36, 0.14, -0.15, 0, 0, 0xeceff1);
      for (const sd of [-1, 1]) {
        T.rbox(hb, sd * 0.12, 0.08, 0.36, 0.13, 0.07, 0.03, -0.15, 0, sd * -0.25, C.yellow);
        T.rbox(hb, sd * 0.12, 0.08, 0.375, 0.05, 0.05, 0.02, -0.15, 0, 0, 0x111111);
        T.rbox(hb, sd * 0.2, 0.32, -0.12, 0.08, 0.4, 0.12, -0.55, 0, sd * -0.35, N);
        T.rbox(hb, sd * 0.27, 0.48, -0.22, 0.06, 0.18, 0.08, -0.7, 0, sd * -0.45, 0xeceff1);
      }
      T.geo(hb, T.cone, C.yellow, T.M(0, -0.08, 0.44, Math.PI / 2 + 0.55, 0, 0, 0.1, 0.3, 0.1));
      T.rbox(hb, 0, 0.2, -0.32, 0.12, 0.08, 0.4, -0.4, 0, 0, N2);
      head.add(hb.build({ name: 'nueHead' }));
      // wings: one rigid brick wing per side with glowing lightning on top, flapping
      const wings = [];
      for (const sd of [-1, 1]) {
        const w = new THREE.Group(); w.position.set(sd * 0.5, 0.55, 0.25);
        const wb = new BrickBuilder(0.4);
        wb.box(sd * 0.3, -0.04, -0.15, 0.6, 0.09, 0.85, N);
        wb.box(sd * 0.75, -0.04, -0.25, 0.4, 0.08, 0.8, N);
        for (let i = 0; i < 4; i++) {
          const z = 0.05 - i * 0.22, len = 0.5 - i * 0.07;
          T.rbox(wb, sd * (0.95 + len / 2), 0, z - 0.05, len, 0.06, 0.16, 0, sd * (0.1 + i * 0.12), 0, i % 2 ? N2 : N);
          T.rbox(wb, sd * (0.97 + len), 0.005, z - 0.05 - (0.1 + i * 0.12) * len * 0.5, 0.12, 0.065, 0.17, 0, sd * (0.1 + i * 0.12), 0, 0xd0d4d8);
        }
        wb.box(sd * 0.55, 0.02, 0.25, 1.1, 0.06, 0.1, N2);
        // zig-zag lightning
        const zz = [[0.15, 0.1], [0.38, -0.05], [0.6, 0.1], [0.82, -0.08], [1.05, 0.06]];
        for (let i = 0; i < zz.length - 1; i++) {
          const [x1, z1] = zz[i], [x2, z2] = zz[i + 1];
          const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
          T.rbox(wb, sd * (x1 + x2) / 2, 0.06, (z1 + z2) / 2 - 0.12, len + 0.04, 0.03, 0.05, 0, sd * -ang, 0, 0x8fe0ff, ZAP);
        }
        w.add(wb.build({ name: 'nueWing' })); wings.push({ w, sd });
      }
      let ph = 0;
      return {
        mesh: b.build({ name: 'nue' }), seat: [0, 0.9, -0.38], control: 'bars', hover: 0.55,
        steer: [{ obj: head, axis: 'y', amount: 0.35 }], parts: [head, ...wings.map((x) => x.w)],
        fx(s, dt) {
          ph += dt * (3 + s.speed01 * 6 + (s.boosting ? 6 : 0));
          const a = s.gliding ? 0.05 + Math.sin(ph * 0.5) * 0.04 : 0.12 + Math.sin(ph) * (0.35 + s.speed01 * 0.2);
          for (const x of wings) x.w.rotation.z = x.sd * a + x.sd * s.steer * 0.12;
          head.rotation.x = Math.sin(ph * 2) * 0.04;
        },
      };
    },
  },

  // ---- Magic carpet: a hovering rug that ripples in waves ----
  {
    id: 'carpet', name: 'Magic Carpet', form: 'Flying carpet', blurb: 'Hovering Persian rug',
    stats: { speed: 3, accel: 4, handling: 5, weight: 1 }, colors: [0xb4232a, 0xf2cd37, 0x069d9f],
    build(kit) {
      const { THREE, BrickBuilder, C } = kit; const T = tools(kit);
      const RED = 0xb4232a, GOLD = C.yellow, TEAL = C.teal, NAVY = C.dkblue;
      const HW = 1.15, SEG = 0.56;
      // a rug strip from z0 to z0 + len (top at y = 0): red field, gold borders, little motif
      const strip = (b, z0, len, motif) => {
        const zc = z0 + len / 2;
        b.box(0, -0.06, zc, HW * 2, 0.06, len + 0.005, RED);
        for (const sd of [-1, 1]) { b.box(sd * (HW - 0.1), 0, zc, 0.14, 0.01, len, GOLD); b.box(sd * (HW - 0.27), 0, zc, 0.06, 0.01, len, NAVY); }
        if (motif === 1) { T.rbox(b, 0, 0.005, zc, 0.34, 0.01, 0.34, 0, Math.PI / 4, 0, TEAL); T.rbox(b, 0, 0.01, zc, 0.16, 0.01, 0.16, 0, Math.PI / 4, 0, GOLD); }
        else if (motif === 2) for (const sd of [-1, 1]) T.rbox(b, sd * 0.4, 0.005, zc, 0.18, 0.01, 0.18, 0, Math.PI / 4, 0, GOLD);
      };
      const b = new BrickBuilder(0.4);
      strip(b, -0.9, 1.8, 0);
      b.box(0, 0.005, 0, 1.6, 0.01, 1.7, NAVY); b.box(0, 0.01, 0, 1.4, 0.01, 1.5, RED);
      // cushions, a bolster that hides the shins, and a genie lamp
      b.box(0, 0, -0.38, 1.35, 0.3, 1.15, 0x81007b);
      b.box(0, 0.3, -0.42, 1.15, 0.24, 0.95, TEAL);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        b.cyl(sx * 0.66, 0.08, -0.38 + sz * 0.56, 0.05, 0.12, GOLD, { seg: 6 });
        b.cyl(sx * 0.56, 0.36, -0.42 + sz * 0.46, 0.04, 0.12, GOLD, { seg: 6 });
      }
      T.geo(b, T.cylX, 0x81007b, T.M(0, 0.22, 0.32, 0, 0, 0, 1.3, 0.22, 0.22));
      for (const sd of [-1, 1]) T.geo(b, T.cylX, GOLD, T.M(sd * 0.66, 0.22, 0.32, 0, 0, 0, 0.05, 0.23, 0.23));
      T.geo(b, T.sphere, GOLD, T.M(0.55, 0.13, 0.75, 0, 0, 0, 0.2, 0.12, 0.14), CHROME);
      T.geo(b, T.cone, GOLD, T.M(0.55, 0.16, 0.95, Math.PI / 2 - 0.4, 0, 0, 0.05, 0.25, 0.05), CHROME);
      b.cyl(0.55, 0.22, 0.75, 0.06, 0.08, GOLD, { ...CHROME, seg: 8 });
      // rippling front and back flaps: chains of hinged segments
      const segs = [];
      const chain = (dir) => {
        const holder = new THREE.Group(); holder.position.z = dir * 0.9; if (dir < 0) holder.rotation.y = Math.PI;
        let parent = holder;
        for (let i = 0; i < 3; i++) {
          const g = new THREE.Group(); g.position.z = i ? SEG : 0; parent.add(g);
          const sb = new BrickBuilder(0.4);
          strip(sb, 0, SEG, i === 1 ? 1 : i === 0 ? 2 : 0);
          if (i === 2) for (let k = -4; k <= 4; k++) { sb.box(k * 0.25, -0.05, SEG + 0.06, 0.05, 0.04, 0.14, GOLD); sb.cyl(k * 0.25, -0.07, SEG + 0.14, 0.04, 0.06, GOLD, { seg: 5 }); }
          g.add(sb.build({ name: 'rug' })); segs.push({ g, i, dir });
          parent = g;
        }
        return holder;
      };
      const front = chain(1), back = chain(-1);
      return {
        mesh: b.build({ name: 'carpet' }), seat: [0, 0.6, -0.42], control: 'none', hover: 0.55,
        parts: [front, back], glider: [0, 1.25, -0.6],
        fx(s, dt) {
          const amp = 0.06 + s.speed01 * 0.1 + (s.boosting ? 0.06 : 0), k = 5 + s.speed01 * 5;
          for (const p of segs) {
            const w = Math.sin(s.t * k - p.i * 1.3 + (p.dir > 0 ? 0 : 1.6)) * amp;
            // the front edge curls up; the back flap trails and flutters
            p.g.rotation.x = p.dir > 0 ? w - 0.05 - (s.boosting ? 0.06 : 0) : w * 1.3 - 0.03;
          }
        },
      };
    },
  },

  // ---- Brick dragon: a stubby red dragon that trots on four legs and breathes fire on boost ----
  {
    id: 'dragon', name: 'Brick Dragon', form: 'Dragon walker', blurb: 'Stomps and breathes fire',
    stats: { speed: 3, accel: 3, handling: 3, weight: 4 }, colors: [0xc91a09, 0xf2cd37, 0x720e0f],
    build(kit) {
      const { THREE, BrickBuilder, C } = kit; const T = tools(kit);
      const RD = C.red, DK = C.dkred, BEL = C.yellow, HORN = 0xf4ecd0;
      const b = new BrickBuilder(0.4);
      // barrel body, chest and belly plates
      b.box(0, 0.5, -0.05, 1.3, 0.62, 2.1, RD);
      b.box(0, 0.58, 1.0, 1.1, 0.6, 0.5, RD);
      b.box(0, 1.12, -0.05, 1.1, 0.08, 1.9, RD);
      for (let i = 0; i < 5; i++) b.box(0, 0.44, 0.8 - i * 0.38, 0.9, 0.08, 0.32, BEL);
      for (let i = 0; i < 3; i++) b.box(0, 0.62 + i * 0.18, 1.26, 0.7, 0.14, 0.05, BEL);
      // saddle + flaps
      b.box(0, 1.2, -0.35, 0.95, 0.08, 0.95, C.rbrown);
      b.box(0, 1.2, -0.85, 0.85, 0.28, 0.12, C.rbrown);
      for (const sd of [-1, 1]) { b.box(sd * 0.68, 0.72, -0.35, 0.06, 0.55, 0.75, C.rbrown); b.box(sd * 0.7, 0.86, -0.35, 0.03, 0.08, 0.77, BEL); }
      // neck up to the head
      T.rbox(b, 0, 1.3, 1.35, 0.6, 0.85, 0.5, 0.55, 0, 0, RD);
      T.rbox(b, 0, 1.25, 1.55, 0.36, 0.7, 0.08, 0.55, 0, 0, BEL);
      // spikes down the back of the neck
      for (const t of [-0.25, 0, 0.25]) T.geo(b, T.cone, BEL, T.M(0, 1.47 + 0.85 * t, 1.12 + 0.52 * t, -0.7, 0, 0, 0.09, 0.26, 0.12));
      // folded bat wings
      for (const sd of [-1, 1]) {
        T.rod(b, [sd * 0.55, 1.05, 0.35], [sd * 1.25, 1.75, -0.55], 0.06, DK, null, 6);
        T.rod(b, [sd * 1.25, 1.75, -0.55], [sd * 1.1, 0.95, -1.3], 0.05, DK, null, 6);
        T.rbox(b, sd * 0.98, 1.25, -0.5, 0.05, 0.75, 1.15, 0.65, 0, sd * -0.55, 0xa0201a);
        T.geo(b, T.cone, HORN, T.M(sd * 1.26, 1.86, -0.58, 0.2, 0, sd * -0.3, 0.05, 0.18, 0.05));
      }
      // tail (swishes, follows steering)
      const tail = new THREE.Group(); tail.position.set(0, 0.85, -1.05);
      const tb = new BrickBuilder(0.4);
      for (let i = 0; i < 5; i++) {
        const s = 1 - i * 0.16, z = -0.2 - i * 0.3, y = -0.05 - Math.sin(i * 0.7) * 0.1 + i * i * 0.012;
        tb.box(0, y - 0.18 * s, z, 0.5 * s, 0.38 * s, 0.34, RD);
        T.geo(tb, T.cone, BEL, T.M(0, y + 0.2 * s, z, -0.3, 0, 0, 0.06 * s + 0.03, 0.18 * s + 0.06, 0.08));
      }
      T.rbox(tb, 0, 0.12, -1.72, 0.04, 0.32, 0.32, Math.PI / 4, 0, 0, BEL);
      tail.add(tb.build({ name: 'tail' }));
      // head with jaw, horns, eyes; fire breath (boost)
      const head = new THREE.Group(); head.position.set(0, 1.72, 1.62);
      const hb = new BrickBuilder(0.4);
      hb.box(0, -0.22, 0.02, 0.62, 0.48, 0.6, RD);
      hb.box(0, -0.2, 0.48, 0.46, 0.26, 0.42, RD);
      hb.box(0, -0.3, 0.42, 0.42, 0.1, 0.5, BEL);
      for (const sd of [-1, 1]) {
        hb.box(sd * 0.14, 0.06, 0.66, 0.08, 0.05, 0.08, 0x111111);
        hb.box(sd * 0.25, 0.04, 0.2, 0.14, 0.14, 0.12, BEL);
        hb.box(sd * 0.27, 0.06, 0.25, 0.08, 0.08, 0.04, 0x111111);
        hb.box(sd * 0.24, 0.17, 0.19, 0.2, 0.06, 0.16, DK);
        T.geo(hb, T.cone, HORN, T.M(sd * 0.2, 0.36, -0.2, -1.0, 0, sd * -0.25, 0.08, 0.42, 0.08));
        for (let k = 0; k < 2; k++) T.geo(hb, T.cone, 0xffffff, T.M(sd * 0.16, -0.21, 0.6 - k * 0.15, Math.PI, 0, 0, 0.035, 0.09, 0.035));
      }
      hb.box(0, -0.48, 0.25, 0.5, 0.12, 0.6, RD);
      head.add(hb.build({ name: 'dragonHead' }));
      const fire = new THREE.Group(); fire.position.set(0, -0.15, 0.75); fire.visible = false;
      const fb = new BrickBuilder(0.4);
      T.geo(fb, T.cone, 0xff8a18, T.M(0, 0, 0.55, Math.PI / 2, 0, 0, 0.26, 1.1, 0.26), { matOpts: { emissive: 0xff5a00, emissiveIntensity: 1.6, trans: true, opacity: 0.85 } });
      T.geo(fb, T.cone, 0xff8a18, T.M(0, 0, 0.3, Math.PI / 2, 0, 0, 0.14, 0.7, 0.14), { matOpts: { emissive: 0xff5a00, emissiveIntensity: 1.6, trans: true, opacity: 0.85 } });
      fire.add(fb.build({ name: 'fire', shadows: false })); head.add(fire);
      // four legs pivoting at the hips
      const legs = [];
      for (const [x, z, off] of [[0.68, 0.72, 0], [-0.68, 0.72, Math.PI], [0.68, -0.72, Math.PI], [-0.68, -0.72, 0]]) {
        const g = new THREE.Group(); g.position.set(x, 0.66, z);
        const lb = new BrickBuilder(0.4), sx = Math.sign(x) * 0.04;
        lb.box(sx, -0.38, 0, 0.36, 0.5, 0.46, RD);
        lb.box(sx, -0.56, 0.02, 0.3, 0.2, 0.34, RD);
        lb.box(sx, -0.66, 0.08, 0.38, 0.12, 0.5, DK);
        for (const cx of [-0.12, 0, 0.12]) T.geo(lb, T.cone, HORN, T.M(sx + cx, -0.62, 0.36, Math.PI / 2, 0, 0, 0.04, 0.12, 0.04));
        g.add(lb.build({ name: 'leg' })); legs.push({ g, off });
      }
      let ph = 0;
      return {
        mesh: b.build({ name: 'dragon' }), seat: [0, 1.28, -0.38], control: 'bars',
        parts: [head, tail, ...legs.map((l) => l.g)],
        fx(s, dt) {
          const pace = 0.15 + Math.min(1, s.speed01 * 1.3);
          ph += dt * (2 + s.speed01 * 11);
          for (const l of legs) l.g.rotation.x = s.grounded ? Math.sin(ph + l.off) * 0.6 * pace : 0.5;
          head.position.y = 1.72 + Math.abs(Math.sin(ph)) * 0.06 * pace;
          head.rotation.x = (s.boosting ? -0.25 : Math.sin(ph * 2) * 0.05);
          head.rotation.y = -s.steer * 0.3;
          fire.visible = s.boosting;
          if (s.boosting) fire.scale.set(1, 1, 0.8 + Math.sin(s.t * 40) * 0.2);
          tail.rotation.y = s.steer * 0.45 + Math.sin(ph * 0.5) * 0.18;
        },
      };
    },
  },

  // ---- Mad teacup: a tiny cup-and-saucer that spins as it rolls ----
  {
    id: 'teacup', name: 'Mad Teacup', form: 'Teacup', blurb: 'Spins round, never dizzy',
    stats: { speed: 2, accel: 5, handling: 4, weight: 1 }, colors: [0x5a93db, 0xf4f4f4, 0xf2cd37],
    build(kit) {
      const { THREE, BrickBuilder, C } = kit; const T = tools(kit);
      const BL = 0x5a93db, W = 0xf6f2ea, GOLD = C.yellow;
      // saucer (static) with a sugar cube and a spoon
      const b = new BrickBuilder(0.4);
      T.geo(b, new THREE.CylinderGeometry(1.0, 0.8, 0.12, 24), W, T.M(0, 0.28, 0));
      T.geo(b, new THREE.CylinderGeometry(1.5, 1.0, 0.18, 28), W, T.M(0, 0.43, 0));
      T.geo(b, new THREE.TorusGeometry(1.5, 0.04, 4, 32).rotateX(Math.PI / 2), GOLD, T.M(0, 0.52, 0));
      T.geo(b, new THREE.TorusGeometry(1.25, 0.025, 4, 28).rotateX(Math.PI / 2), BL, T.M(0, 0.52, 0));
      b.box(-1.08, 0.5, -0.65, 0.24, 0.24, 0.24, 0xffffff, { rot: 0.4 });
      T.rbox(b, 1.12, 0.55, -0.4, 0.07, 0.03, 0.75, 0, 0.3, 0, C.ltgray, CHROME);
      T.geo(b, T.sphere, C.ltgray, T.M(1.25, 0.55, 0.0, 0, 0.3, 0, 0.13, 0.04, 0.18), CHROME);
      // bench + a centre column to the wheel (the classic teacup ride wheel)
      b.box(0, 0.52, -0.3, 0.8, 0.24, 0.6, 0x81007b);
      T.rod(b, [0, 0.52, 0.3], [0, 1.0, 0.36], 0.06, C.ltgray, CHROME);
      // the cup spins around its saucer
      const cup = new THREE.Group(); cup.position.y = 0.52;
      const cb = new BrickBuilder(0.4);
      const prof = [[0.72, 0], [0.8, 0.04], [0.98, 0.25], [1.1, 0.55], [1.16, 0.85], [1.18, 0.95]];
      const outer = prof.map(([r, y]) => new THREE.Vector2(r, y));
      const inner = prof.slice().reverse().map(([r, y]) => new THREE.Vector2(r - 0.07, Math.max(0.06, y)));
      T.geo(cb, new THREE.LatheGeometry(outer, 28), BL, T.M(0, 0, 0));
      T.geo(cb, new THREE.LatheGeometry(inner, 28), W, T.M(0, 0, 0));
      T.geo(cb, new THREE.CylinderGeometry(0.72, 0.72, 0.06, 20), W, T.M(0, 0.03, 0));
      T.geo(cb, new THREE.TorusGeometry(1.145, 0.045, 5, 32).rotateX(Math.PI / 2), GOLD, T.M(0, 0.96, 0));
      T.geo(cb, new THREE.TorusGeometry(1.0, 0.03, 4, 28).rotateX(Math.PI / 2), GOLD, T.M(0, 0.3, 0));
      // polka dots
      const dot = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), Y = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < 14; i++) {
        const a = (i / 7) * Math.PI + (i % 2) * 0.45, y = i % 2 ? 0.42 : 0.7, r = i % 2 ? 1.06 : 1.14;
        const n = new THREE.Vector3(Math.sin(a), 0.25, Math.cos(a)).normalize();
        cb.addMatrix(dot, kit.plastic(W), new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r), new THREE.Quaternion().setFromUnitVectors(Y, n), new THREE.Vector3(1, 1, 1)));
      }
      // handle
      T.geo(cb, new THREE.TorusGeometry(0.28, 0.08, 6, 12, Math.PI * 1.1), BL, T.M(1.18, 0.5, 0, 0, 0, -Math.PI / 2 - 0.15));
      cup.add(cb.build({ name: 'cup' }));
      return {
        mesh: b.build({ name: 'saucer' }), seat: [0, 0.82, -0.38], control: 'wheel',
        wheels: [{ x: 0, z: -0.7, r: 0.22, w: 0.24, xs: [0.7, -0.7] }, { x: 0.7, z: 0.7, r: 0.22, w: 0.24, front: true }, { x: -0.7, z: 0.7, r: 0.22, w: 0.24, front: true }],
        parts: [cup], spin: [{ obj: cup, axis: 'y', rate: 1.6 }],
      };
    },
  },
];
