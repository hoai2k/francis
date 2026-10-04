// Minecraft Rides vehicle pack (see buildVehicle in ../characters.js for the contract): a minecart,
// a saddled pig chasing a carrot on a stick, an oak boat whose paddles row, a galloping horse, a
// strider that walks on two long legs and a TNT minecart whose block flashes when you boost.
// Big parts are pixel-skinned cubes (./minecraft-kit.js); trim merges into a BrickBuilder.
import {
  THREE, BrickBuilder, C, plastic, cube, pixItem, ITEMS, particles, SK, limb, pitchAbout, handsAt, baitStick,
  PI, S, CO, BACK, ease, clamp,
} from './minecraft-kit.js';

const LIT = (c, i = 1) => ({ matOpts: { emissive: c, emissiveIntensity: i } });
// a ride's body: skinned cubes plus one merged builder of trim
function body(b, ...cubes) { const g = new THREE.Group(); g.add(b.build({ name: 'mc-trim' })); for (const c of cubes) g.add(c); return g; }
// legs: { p, off } pivots swung by a gait phase; tuck when airborne
function gait(legs, ph, amp, air, dt, tuck = 0.6) {
  for (const l of legs) l.p.rotation.x += ((air ? tuck * (l.front ? -1 : 1) : S(ph + l.off) * amp) - l.p.rotation.x) * ease(dt, 14);
}

// ---- Minecart / TNT Minecart: an iron tub on four little wheels --------------------------------------
function cart(kit, tnt) {
  const W = clamp((kit.rig.width || 1.3) * 0.5 + 0.22, 0.95, 1.2), L = tnt ? 1.85 : 1.55, Y0 = 0.32, H = 1.12;
  const g = new THREE.Group(), iron = SK.iron(), b = new BrickBuilder(0.4);
  cube(g, iron, W * 2, 0.16, L * 2, 0, Y0, 0);
  for (const sd of [-1, 1]) {
    cube(g, iron, 0.14, H - Y0, L * 2, sd * (W - 0.07), (Y0 + H) / 2, 0);
    cube(g, iron, W * 2 - 0.28, H - Y0, 0.14, 0, (Y0 + H) / 2, sd * (L - 0.07));
    b.box(sd * (W - 0.07), H, 0, 0.2, 0.06, L * 2 + 0.06, 0x4a4a4a);                 // top rim
    b.box(0, H, sd * (L - 0.07), W * 2, 0.06, 0.2, 0x4a4a4a);
    for (const z of [-L + 0.3, 0, L - 0.3]) b.box(sd * (W + 0.005), 0.5, z, 0.03, 0.08, 0.08, 0x3a3a3a);   // rivets
  }
  // axle blocks, bench and a lantern pole at the front corner
  for (const z of [-1.05, 1.05]) b.box(0, 0.1, z, W * 2 - 0.3, 0.16, 0.26, 0x3a3a3a);
  b.box(0, Y0 + 0.08, -0.55 - (tnt ? 0.3 : 0), W * 1.6, 0.18, 0.75, 0x7a5a32);
  b.box(W - 0.12, H + 0.06, L - 0.12, 0.08, 0.75, 0.08, 0x3a3a3a);
  b.box(W - 0.12, H + 0.8, L + 0.02, 0.08, 0.06, 0.36, 0x3a3a3a);
  const lantern = new THREE.Group(); lantern.position.set(W - 0.12, H + 0.78, L + 0.18);
  const lb = new BrickBuilder(0.4);
  lb.box(0, -0.06, 0, 0.02, 0.06, 0.02, 0x3a3a3a);
  lb.box(0, -0.34, 0, 0.24, 0.28, 0.24, 0x2a2a2a);
  lb.box(0, -0.31, 0, 0.18, 0.22, 0.26, 0xffc040, LIT(0xffa020, 1.6)); lb.box(0, -0.31, 0, 0.26, 0.22, 0.18, 0xffc040, LIT(0xffa020, 1.6));
  lantern.add(lb.build({ name: 'lantern' }));
  const parts = [lantern];
  let tntMat = null, fuse = null, block = null;
  if (tnt) {
    // the TNT block rides up front with its fuse sparking
    tntMat = SK.tnt(); tntMat.emissive.setHex(0xffffff); tntMat.emissiveIntensity = 0;
    block = cube(g, tntMat, 1.0, 1.0, 1.0, 0, Y0 + 0.58, L - 0.62);
    b.box(0, Y0 + 1.08, L - 0.62, 0.05, 0.16, 0.05, 0x3a3a3a);
    fuse = particles(g, { n: 7, colors: [0xffd040, 0xff8020, 0xffffff], size: 0.07, spread: 0.35, rise: 0.25, up: true, seed: 71 });
    fuse.position.set(0, Y0 + 1.26, L - 0.62);
  }
  const wheels = [{ x: 0, z: -1.05, r: 0.3, w: 0.22, xs: [W + 0.12, -W - 0.12], cap: 0x5e5e5e }, { x: W + 0.12, z: 1.05, r: 0.3, w: 0.22, front: true, cap: 0x5e5e5e }, { x: -W - 0.12, z: 1.05, r: 0.3, w: 0.22, front: true, cap: 0x5e5e5e }];
  let sw = 0, sv = 0, fl = 0;
  return {
    mesh: body(b, g), seat: [0, Y0 + 0.18, -0.4 - (tnt ? 0.3 : 0)], control: 'wheel', wheels, parts,
    exhaust: [[0.5, 0.45, -L - 0.1, BACK], [-0.5, 0.45, -L - 0.1, BACK]],
    fx(s, dt) {
      // the lantern swings out in the bends and rocks with the speed
      sv += ((-s.steer * 0.5 - sw) * 30 - sv * 4) * dt; sw += sv * dt;
      lantern.rotation.z = sw; lantern.rotation.x = -s.speed01 * 0.35 + S(s.t * 7) * 0.05 * s.speed01;
      if (tnt) {
        const hot = s.boosting ? 1 : 0;
        fl += (hot - fl) * ease(dt, 6);
        tntMat.emissiveIntensity = fl * (S(s.t * 26) > 0 ? 0.85 : 0.1);
        block.scale.setScalar(1 + fl * 0.06 * Math.abs(S(s.t * 13)));
        fuse.set(((s.t * (1.4 + fl * 3)) % 1));
      }
    },
  };
}
const minecart = {
  id: 'minecart', name: 'Minecart', form: 'Mine cart', blurb: 'Rattles along off the rails',
  stats: { speed: 3, accel: 4, handling: 4, weight: 2 }, colors: [0x8a8a8a, 0x4a4a4a, 0x7a5a32, 0xffc040],
  build: (kit) => cart(kit, false),
};
const tntcart = {
  id: 'tntcart', name: 'TNT Minecart', form: 'Explosive cart', blurb: 'Handle with care. Or don’t.',
  stats: { speed: 5, accel: 2, handling: 2, weight: 4 }, colors: [0xd8381e, 0xf0f0f0, 0x8a8a8a, 0x1a1a1a],
  build: (kit) => cart(kit, true),
};

// ---- Saddled Pig: steered by a carrot on a stick dangling in front of its snout -----------------------
const saddlepig = {
  id: 'saddlepig', name: 'Saddled Pig', form: 'Pig', blurb: 'Steered by a carrot on a stick',
  stats: { speed: 2, accel: 5, handling: 4, weight: 1 }, colors: [0xf0a4a0, 0x7a4a26, 0xf08a20, 0xe08c8a],
  build(kit) {
    const { sprung } = kit;
    const pigM = SK.pig(), g = new THREE.Group(), b = new BrickBuilder(0.4);
    const BW = clamp((kit.rig.width || 1.3) + 0.15, 1.4, 1.8);
    cube(g, pigM, BW, 1.15, 2.5, 0, 1.0, -0.3);
    const head = new THREE.Group(); head.position.set(0, 1.0, 0.95);
    cube(head, SK.pigHead(), 1.1, 1.1, 1.0, 0, 0.32, 0.45);
    cube(head, SK.snout(), 0.52, 0.4, 0.14, 0, 0.12, 1.0);
    // saddle with straps and stirrup-iron studs
    cube(g, SK.saddle(), clamp(BW - 0.3, 1.1, 1.4), 0.14, 1.1, 0, 1.64, -0.45);
    for (const sd of [-1, 1]) { b.box(sd * (BW / 2 + 0.01), 0.75, -0.45, 0.03, 0.85, 0.18, 0x4a2a14); b.box(sd * (BW / 2 + 0.03), 0.8, -0.45, 0.04, 0.12, 0.12, 0xa0a0a0); }
    const legs = [];
    for (const [x, z, off, front] of [[0.42, 0.55, 0, true], [-0.42, 0.55, PI, true], [0.42, -1.15, PI, false], [-0.42, -1.15, 0, false]]) {
      legs.push({ p: limb(g, pigM, x * BW / 1.4, 0.48, z, 0.44, 0.48, 0.44), off, front });
    }
    const tail = new THREE.Group(); tail.position.set(0, 1.3, -1.56); g.add(tail);
    cube(tail, pigM, 0.12, 0.12, 0.2, 0, 0, -0.08); cube(tail, pigM, 0.1, 0.2, 0.1, 0.06, 0.1, -0.16);
    const seat = [0, 1.72, -0.45];
    const [cg, cp] = ITEMS.carrot;
    const carrot = pixItem('carrot', cg, cp, 0.06, 6, 1); carrot.rotation.z = PI / 4;
    const hands = handsAt(kit.rig, seat);
    const bait = baitStick(b, hands, carrot, { len: Math.max(1.0, 2.55 - hands[2]), rise: 0.35, drop: 0.55 });
    g.add(head);
    let ph = 0;
    return {
      mesh: body(b, g), seat, control: 'none', parts: [bait],
      exhaust: [[0.35, 0.9, -1.62, BACK, 0.8], [-0.35, 0.9, -1.62, BACK, 0.8]],
      fx(s, dt) {
        const air = !s.grounded || s.gliding, pace = Math.min(1, 0.15 + s.speed01 * 1.3);
        ph += dt * (3 + s.speed01 * 15 + (s.boosting ? 5 : 0));
        gait(legs, ph, 0.75 * pace, air, dt);
        head.rotation.y = -s.steer * 0.3; head.rotation.x = air ? -0.15 : S(ph * 2) * 0.06 * pace;
        tail.rotation.y = S(s.t * 9) * 0.5;
        bait.rotation.x = -s.speed01 * 0.5 + S(ph) * 0.12 * pace; bait.rotation.z = s.steer * 0.4;
        sprung.position.y = air ? 0 : Math.abs(S(ph)) * 0.06 * pace;
      },
    };
  },
};

// ---- Oak Boat: rows on dry land, paddles flapping like wings in the air ----------------------------------
const oakboat = {
  id: 'oakboat', name: 'Oak Boat', form: 'Rowing boat', blurb: 'Paddles hard, slides like ice',
  stats: { speed: 3, accel: 3, handling: 5, weight: 2 }, colors: [0xb08a52, 0x7a5a32, 0x6b4e2e, 0xf4f4f4],
  build(kit) {
    const W = clamp((kit.rig.width || 1.3) * 0.5 + 0.25, 0.95, 1.2), L = 1.75, Y0 = 0.22, H = 0.85;
    const pl = SK.planks(), g = new THREE.Group(), b = new BrickBuilder(0.4);
    cube(g, pl, W * 2 - 0.2, 0.16, L * 2 - 0.3, 0, Y0, -0.05);
    for (const sd of [-1, 1]) {
      cube(g, pl, 0.16, H - Y0, L * 2 - 0.3, sd * (W - 0.08), (Y0 + H) / 2, -0.05);
      cube(g, pl, 0.2, 0.08, 0.3, sd * (W + 0.02), H + 0.04, -0.15);                       // oarlocks
    }
    cube(g, pl, W * 2 - 0.3, H - Y0 + 0.08, 0.16, 0, (Y0 + H) / 2 + 0.04, -L + 0.18);         // stern
    // the bow narrows to a raised prow
    cube(g, pl, W * 1.4, H - Y0 + 0.1, 0.16, 0, (Y0 + H) / 2 + 0.05, L - 0.15);
    for (const sd of [-1, 1]) cube(g, pl, 0.16, H - Y0 + 0.1, 0.55, sd * W * 0.82, (Y0 + H) / 2 + 0.05, L - 0.38, 0, -sd * 0.55, 0);
    b.box(0, Y0 + 0.08, -0.55, W * 1.7, 0.12, 0.45, 0x7a5a32);                               // thwart seat
    b.box(0, Y0 + 0.08, 0.75, W * 1.7, 0.12, 0.3, 0x7a5a32);
    const oars = [];
    for (const sd of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(sd * (W + 0.02), H + 0.1, -0.15);
      const sweep = new THREE.Group(); p.add(sweep);
      const ob = new BrickBuilder(0.4);
      ob.box(0, -1.25, 0, 0.08, 1.45, 0.08, 0x6b4e2e);
      ob.box(0, -1.55, 0, 0.05, 0.4, 0.3, 0xb08a52);
      ob.box(0, 0, 0, 0.08, 0.3, 0.08, 0x6b4e2e);
      sweep.add(ob.build({ name: 'paddle' }));
      oars.push({ p, sweep, sd });
    }
    let ph = 0, wing = 0;
    return {
      mesh: body(b, g), seat: [0, Y0 + 0.28, -0.4], control: 'none', hover: 0.12, parts: oars.map((o) => o.p),
      exhaust: [[0.45, 0.55, -L - 0.05, BACK], [-0.45, 0.55, -L - 0.05, BACK]],
      fx(s, dt) {
        ph += dt * (2.5 + s.speed01 * 7 + (s.boosting ? 4 : 0));
        wing += ((s.gliding ? 1 : 0) - wing) * ease(dt, 5);
        for (const o of oars) {
          // rowing: dip, pull back, lift and swing forward; the inside oar drags in a turn
          const drag = Math.max(0, -o.sd * s.steer) * 0.6, amp = Math.min(1, 0.2 + s.speed01) * (1 - drag);
          const row = S(ph), lift = CO(ph);
          o.p.rotation.z = o.sd * (0.75 + lift * 0.18 * amp + wing * (PI / 2 - 0.75));
          o.sweep.rotation.x = (row * 0.7 * amp) * (1 - wing) + wing * S(s.t * 10) * 0.3;
        }
      },
    };
  },
};

// ---- Horse: gallops, tosses its head and swishes its tail ----------------------------------------------
const horse = {
  id: 'mchorse', name: 'Horse', form: 'Horse', blurb: 'Saddled up and galloping',
  stats: { speed: 5, accel: 3, handling: 3, weight: 2 }, colors: [0x8a5a32, 0x2a1a10, 0x7a4a26, 0xe8e0d0],
  build(kit) {
    const { sprung } = kit;
    const hm = SK.horse(), g = new THREE.Group(), b = new BrickBuilder(0.4);
    const BW = clamp((kit.rig.width || 1.3) * 0.75, 1.0, 1.35), Y = 1.35;
    cube(g, hm, BW, 0.95, 2.3, 0, Y, -0.1);
    // neck reaching up and forward, head pointing down the road, mane and ears
    const head = new THREE.Group(); head.position.set(0, Y + 0.25, 0.9);
    cube(head, hm, 0.55, 1.05, 0.62, 0, 0.45, 0.12, 0.45);
    cube(head, SK.horseHead(), 0.55, 0.55, 1.05, 0, 0.95, 0.62, 0.25);
    const hb = new BrickBuilder(0.4);
    for (let i = 0; i < 6; i++) hb.box(0, 0.1 + i * 0.18, -0.24 - i * 0.07 + 0.1, 0.16, 0.2, 0.16, 0x2a1a10);
    for (const sd of [-1, 1]) hb.box(sd * 0.16, 1.22, 0.38, 0.1, 0.2, 0.08, 0x8a5a32);
    head.add(hb.build({ name: 'mane' }));
    cube(g, SK.saddle(), clamp(BW + 0.06, 1.05, 1.4), 0.14, 0.95, 0, Y + 0.53, -0.35);
    for (const sd of [-1, 1]) { b.box(sd * (BW / 2 + 0.01), Y - 0.45, -0.35, 0.03, 0.9, 0.16, 0x4a2a14); b.box(sd * (BW / 2 + 0.04), Y - 0.62, -0.35, 0.05, 0.14, 0.18, 0xa0a0a0); }
    const tail = new THREE.Group(); tail.position.set(0, Y + 0.35, -1.25); g.add(tail);
    const tb = new BrickBuilder(0.4); tb.box(0, -0.85, 0, 0.24, 0.85, 0.22, 0x2a1a10); tail.add(tb.build({ name: 'tail' }));
    const legs = [], hoof = SK.hoof();
    for (const [x, z, off, front] of [[0.3, 0.75, 0, true], [-0.3, 0.75, 0.5, true], [0.3, -0.95, PI, false], [-0.3, -0.95, PI + 0.5, false]]) {
      legs.push({ p: limb(g, hoof, x * BW / 1.1, Y - 0.42, z, 0.3, 0.95, 0.3), off, front });
    }
    g.add(head);
    const seat = [0, Y + 0.62, -0.35];
    let ph = 0, pitch = 0;
    return {
      mesh: body(b, g), seat, control: 'none',
      exhaust: [[0.3, Y - 0.2, -1.35, BACK, 0.8], [-0.3, Y - 0.2, -1.35, BACK, 0.8]],
      fx(s, dt) {
        const air = !s.grounded || s.gliding, pace = Math.min(1, 0.15 + s.speed01 * 1.3);
        ph += dt * (2.5 + s.speed01 * 11 + (s.boosting ? 4 : 0));
        gait(legs, ph, 0.8 * pace, air, dt, 0.8);
        head.rotation.x = air ? -0.25 : S(ph) * 0.12 * pace; head.rotation.y = -s.steer * 0.3;
        tail.rotation.x = -0.2 - s.speed01 * 0.8 + S(ph) * 0.1; tail.rotation.y = S(s.t * 3) * 0.25 + s.steer * 0.3;
        pitch += ((air ? -0.05 : S(ph) * 0.05 * pace) - pitch) * ease(dt, 12);
        pitchAbout(sprung, pitch, 0, -0.1, air ? 0 : Math.abs(S(ph)) * 0.1 * pace);
      },
    };
  },
};

// ---- Strider: the Nether's lava walker strides on two long legs, steered with a warped fungus ------------
const strider = {
  id: 'strider', name: 'Strider', form: 'Lava walker', blurb: 'Two long legs, warm feet',
  stats: { speed: 3, accel: 2, handling: 3, weight: 5 }, colors: [0x9a3a3a, 0x6a2020, 0x14a8a0, 0x4a2a14],
  build(kit) {
    const { sprung } = kit;
    const g = new THREE.Group(), b = new BrickBuilder(0.4), Y = 1.95;
    const BW = clamp((kit.rig.width || 1.3) + 0.05, 1.35, 1.7);
    cube(g, SK.strider(), BW, 1.0, 1.4, 0, Y, 0);
    // the hair-like strands on top sway as it walks
    const hair = new THREE.Group(); hair.position.y = Y + 0.5; g.add(hair);
    const hb = new BrickBuilder(0.4), strand = new THREE.BoxGeometry(1, 1, 1);
    for (const [x, z, h, a] of [[-0.55, 0.55, 0.5, 0.5], [0.55, 0.55, 0.45, -0.5], [-0.62, -0.1, 0.6, 0.7], [0.62, -0.1, 0.55, -0.7], [-0.5, -0.6, 0.5, 0.5], [0.5, -0.6, 0.5, -0.5], [0, 0.65, 0.4, 0]]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x * BW / 1.4, h / 2 - 0.05, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(z > 0.5 && !x ? 0.4 : 0, 0, a)), new THREE.Vector3(0.07, h, 0.07));
      hb.addMatrix(strand, plastic(0x3a1414), m);
    }
    hair.add(hb.build({ name: 'strands' }));
    cube(g, SK.saddle(), clamp(BW - 0.25, 1.05, 1.4), 0.14, 0.95, 0, Y + 0.57, -0.15);
    const legs = [];
    for (const [x, off] of [[0.36, 0], [-0.36, PI]]) legs.push({ p: limb(g, SK.striderLeg(), x * BW / 1.4, Y - 0.45, 0, 0.32, 1.55, 0.32), off, front: true });
    const seat = [0, Y + 0.64, -0.15];
    // warped fungus on a stick
    const fb = new BrickBuilder(0.4);
    fb.box(0, -0.08, 0, 0.08, 0.16, 0.08, 0xd8c8a0);
    fb.box(0, -0.2, 0, 0.3, 0.12, 0.3, 0x14a8a0); fb.box(0, -0.12, 0, 0.18, 0.08, 0.18, 0xe06a2a);
    const fungus = fb.build({ name: 'fungus' });
    const bait = baitStick(b, handsAt(kit.rig, seat), fungus, { len: 1.35, rise: 0.3, drop: 0.45 });
    let ph = 0;
    return {
      mesh: body(b, g), seat, control: 'none', parts: [bait],
      exhaust: [[0.3, Y - 0.2, -0.75, BACK, 0.9], [-0.3, Y - 0.2, -0.75, BACK, 0.9]],
      fx(s, dt) {
        const air = !s.grounded || s.gliding, pace = Math.min(1, 0.2 + s.speed01 * 1.2);
        ph += dt * (2 + s.speed01 * 8 + (s.boosting ? 3 : 0));
        for (const l of legs) l.p.rotation.x += ((air ? 0.35 : S(ph + l.off) * 0.6 * pace) - l.p.rotation.x) * ease(dt, 12);
        sprung.position.y = air ? 0 : (Math.abs(CO(ph)) - 1) * 0.12 * pace;
        sprung.rotation.z = air ? 0 : S(ph) * 0.06 * pace - s.steer * 0.05;
        hair.rotation.x = -s.speed01 * 0.25 + S(ph * 2) * 0.06; hair.rotation.z = S(ph) * 0.08;
        bait.rotation.x = -s.speed01 * 0.4 + S(ph) * 0.1; bait.rotation.z = s.steer * 0.4;
      },
    };
  },
};

export default [minecart, saddlepig, oakboat, horse, strider, tntcart];
