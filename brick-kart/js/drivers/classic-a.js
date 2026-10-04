// Brick Kart Originals, part 1: Bob, Ava, Redbeard, Kara, Rex, Nix, Flo, Wendel.
// Each entry: { voice, style, gestures, build } — classic.js adds id/name/colour/weight.
import {
  THREE, BrickBuilder, C, plastic, seatedFig, rbox, rod, taperGeo, glowMat, S, CO, PI, abs, UP,
  seg, sm, lerp, bump, winF, vis, face, fxMat, clear, prop, fxg, grip, hold, ball, ring, puffs, sparkles, flame,
  finish, loFig, lo, oct, domeGeo, frustum, trod, ybox, geoM, torusGeo, coneGeo, sphGeo,
} from './classic-kit.js';

const fig = (o) => loFig({ noStud: true, ...o });
const SKIN = C.fig;
// torso front surface (z) and half width at height y (torso frame)
const frontZ = (d) => 0.225 * d.D * d.s;
const backZ = (d) => -0.225 * d.D * d.s;

// ============================================================================ Brick Bob
// Stocky builder: giant hard hat with a lamp, hi-vis vest, tool belt and a huge wrench.
function wrench(b) {
  const M = 0xb9bec4, D = 0x80868c;
  b.box(0, -0.62, 0, 0.13, 1.18, 0.07, M);
  b.cyl(0, -0.66, 0, 0.12, 0.08, D, { seg: 10, rot: 0 });
  // open jaw at the top, ring end at the bottom
  b.box(0, 0.5, 0, 0.42, 0.18, 0.09, M);
  for (const sd of [-1, 1]) rbox(b, sd * 0.16, 0.7, 0, 0.11, 0.3, 0.09, 0, 0, sd * -0.15, M);
  geoM(b, torusGeo(0.3, 12), D, 0, -0.72, 0, 0, 0, 0, 0.13, 0.13, 0.13);
  b.box(0, -0.05, 0, 0.15, 0.32, 0.08, 0xe03a2a);       // red grip
}
const bob = {
  voice: { kind: 'human', pitch: 0.85 }, style: { cheer: 'fist', win: 'flex', trick: 'arms' },
  gestures: {
    // wrench twirled overhead like a baton, other fist pumping
    cheer: (f, t) => ({ rx: -2.85 + S(t * 9) * 0.06, rz: -0.2, lx: UP + S(t * 14) * 0.35, lz: 0.35, hx: -0.3, hy: -0.2, tz: 0.06, by: abs(S(t * 14)) * 0.07 }),
    // hammering away: two big wrench chops a loop, lamp beam sweeping
    win: (f, t) => {
      const ph = (f * 2) % 1, u = ph < 0.62 ? sm(ph / 0.62) : 1 - sm((ph - 0.62) / 0.14);
      return { rx: -1.15 - 1.6 * u, rz: -0.12, lx: -0.35, lz: 0.75, tx: 0.18 - 0.28 * u, hx: 0.12 - 0.3 * u, ty: -0.15, by: (1 - u) * abs(S(t * 40)) * 0.05 };
    },
    use: (f) => ({ rx: -2.6, rz: -0.2, hx: -0.2 }),
  },
  build() {
    const OR = 0xff7a12, HV = 0xf2cd37, BELT = 0x5a3a20;
    const rig = fig({
      name: 'bob', s: 1.32, wide: 1.34, deep: 1.25, headR: 0.34, headH: 0.48,
      torso: OR, legs: C.blue, arms: C.blue, hands: 0xc58a3c, skin: SKIN,
      face: face('bob', SKIN, (P) => {
        P.line([[-34, -27], [-8, -23]], '#3a2410', 9); P.line([[34, -27], [8, -23]], '#3a2410', 9);
        P.eyes(19, -9, 7, 9);
        P.mouth(16, 20, 'grin');
        P.ell(-17, 8, 21, 9, '#6a3c18', 0.2); P.ell(17, 8, 21, 9, '#6a3c18', -0.2);
        for (const [x, y] of [[-30, 26], [-22, 32], [26, 28], [32, 22], [-34, 18]]) P.ell(x, y, 2, 2, '#9a7a30');
      }, 0.45),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        // hi-vis vest: reflective stripes over the orange, overalls bib
        b.box(0, d.chestY + 0.02 * s, fz - 0.02, 0.36 * s, 0.6 * s, 0.05, C.blue);
        for (const sd of [-1, 1]) b.box(sd * 0.3 * s * d.W, d.chestY + 0.05 * s, fz - 0.01, 0.1 * s, 0.75 * s, 0.05, 0xe8e8e8);
        b.box(0, d.chestY + 0.32 * s, 0, 0.9 * s * d.W, 0.08 * s, 0.47 * s * d.D, 0xe8e8e8);
        // tool belt with pouches, hammer and a tape measure
        b.box(0, d.chestY - 0.03 * s, 0, 0.98 * s * d.W, 0.15 * s, 0.5 * s * d.D, BELT);
        b.box(0, d.chestY - 0.02 * s, fz + 0.02, 0.14 * s, 0.12 * s, 0.03, 0xd8c040);
        for (const sd of [-1, 1]) b.box(sd * 0.42 * s * d.W, d.chestY - 0.18 * s, 0.1 * s, 0.2 * s, 0.24 * s, 0.24 * s, 0x7a5030);
        b.box(-0.47 * s * d.W, d.chestY + 0.02 * s, 0.13 * s, 0.05 * s, 0.34 * s, 0.05 * s, 0xa06a30);
        b.box(-0.47 * s * d.W, d.chestY + 0.32 * s, 0.13 * s, 0.07 * s, 0.07 * s, 0.22 * s, 0x50555a);
        b.cyl(0.47 * s * d.W, d.chestY - 0.06 * s, 0.14 * s, 0.09 * s, 0.1 * s, HV, { seg: 10 });
        // bulky shoulders
        for (const sd of [-1, 1]) b.sphere(sd * 0.33 * s * d.W, d.shoulderY + 0.02 * s, 0, 0.2 * s, OR, { sy: 0.7 });
      },
      // rolled-up sleeves showing big forearms
      arm: (ab, sd, d) => { const s = d.s; ab.box(0, -0.3 * s, 0, 0.3 * s, 0.1 * s, 0.32 * s, C.blue); ab.cyl(0, -0.5 * s, 0, 0.14 * s, 0.22 * s, SKIN, { seg: 10 }); },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        hb.cyl(0, h * 0.8, 0.05, r * 1.72, 0.06, HV, { seg: 20 });
        geoM(hb, domeGeo(), HV, 0, h * 0.82, 0, 0, 0, 0, r * 1.4, r * 1.15, r * 1.42);
        hb.box(0, h * 0.82 + r * 1.08, 0, 0.12, 0.09, r * 1.1, 0xe0b820);
        // lamp: housing + lens
        rod(hb, [0, h * 0.95 + r * 0.6, r * 1.1], [0, h * 0.95 + r * 0.65, r * 1.55], 0.14, 0x30343a, 12);
        rod(hb, [0, h * 0.95 + r * 0.65, r * 1.55], [0, h * 0.95 + r * 0.655, r * 1.58], 0.12, glowMat(0xfff4b0, 2.5), 12);
        // sideburns + stubble jaw
        for (const sd of [-1, 1]) hb.box(sd * r * 0.92, h * 0.35, 0.02, 0.06, h * 0.4, r * 0.7, 0x5a3418);
      },
    });
    const s = rig.dims.s, d = rig.dims;
    const back = prop(rig.torso, wrench, { x: 0.05, y: 0.62 * s, z: backZ(d) - 0.07, rz: -0.65, name: 'bob-wrench-back' });
    back.scale.setScalar(1.3);
    const g = grip(rig.armR, s);
    const spin = new THREE.Group(); g.add(spin);
    const hand = prop(spin, wrench, { y: 0.1, name: 'bob-wrench', visible: false }); hand.scale.setScalar(1.35);
    // lamp beam + spark burst
    const lampY = rig.dims.headH * 0.95 + rig.dims.headR * 0.65;
    const beam = fxg(rig.head, { y: lampY, z: rig.dims.headR * 1.6 });
    const cone = new THREE.Mesh(frustum(1, 0.12, 16), fxMat(0xfff2a0, 0.16)); cone.rotation.x = PI / 2 - 0.15; cone.scale.set(0.55, 2.6, 0.55); beam.add(cone);
    const sp = fxg(hand, { y: 0.7 }); sparkles(sp, 0xffd040, 10, 0.35, 0.06, 11);
    finish(rig, 1.5);
    rig.fx = (n, f, t) => {
      const on = n === 'cheer' || n === 'win' || n === 'use' || (n === 'throwF' && f < 0.6);
      vis(hand, on); vis(back, !on);
      if (n === 'cheer' || n === 'use') { hold(g, rig.armR, 0); spin.rotation.z = n === 'cheer' ? t * 15 : 0; hand.position.y = 0.1; }
      else { g.rotation.set(PI, 0, 0); spin.rotation.z = 0; hand.position.y = 0.55; }
      vis(beam, n === 'win' || n === 'pre');
      if (n === 'win' || n === 'pre') beam.rotation.y = S(t * 3) * 0.3;
      const ph = (winF(t) * 2) % 1, hit = n === 'win' && ph > 0.6 && ph < 0.8;
      vis(sp, hit);
      if (hit) { sp.scale.setScalar(0.4 + seg(ph, 0.6, 0.8) * 1.4); sp.rotation.y = t * 9; }
    };
    return rig;
  },
};

// ============================================================================ Astro Ava
// Tiny astronaut lost in an oversized bubble helmet, with a jetpack that lifts her off the seat.
const ava = {
  voice: { kind: 'human', pitch: 1.5 }, style: { cheer: 'both', win: 'both', trick: 'superman' },
  gestures: {
    // lift-off! jetpack blasts her up out of the seat, arms high
    cheer: (f, t) => {
      const rise = sm(seg(f, 0.08, 0.32)) * (1 - sm(seg(f, 0.78, 1)));
      return { by: rise * 0.42 + S(t * 31) * 0.012 * rise, lx: UP + S(t * 12) * 0.25, rx: UP - S(t * 12) * 0.25, lz: 0.5, rz: -0.5, hx: -0.3, tx: -0.1 * rise };
    },
    // zero-g float: drifting, slowly turning, arms out
    win: (f, t) => ({ by: 0.28 + S(t * 4) * 0.08, ty: S(f * PI * 2) * 0.5, tz: S(t * 3) * 0.12, lx: -1.5 + S(t * 5) * 0.4, lz: 1.0, rx: -1.5 - S(t * 5) * 0.4, rz: -1.0, hx: -0.25 }),
  },
  build() {
    const SUIT = 0xf4f4f4, OR = 0xfe8a18, HAIR = 0x6b3a1e;
    const rig = fig({
      name: 'ava', s: 0.95, wide: 1.25, deep: 1.18, headR: 0.29, headH: 0.46,
      torso: SUIT, legs: SUIT, arms: SUIT, hands: OR, skin: SKIN,
      face: face('ava', SKIN, (P) => {
        P.eyes(17, -4, 9, 12);
        for (const sd of [-1, 1]) P.line([[sd * 10, -24], [sd * 26, -22]], HAIR === 0 ? '#000' : '#4a2a10', 4);
        P.mouth(18, 12, 'open');
        for (const sd of [-1, 1]) for (const k of [0, 1, 2]) P.ell(sd * (28 + k * 5), 10 + (k % 2) * 4, 1.8, 1.8, '#c07030');
      }, 0.5),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d), bz = backZ(d);
        // chest control panel + mission patch + orange stripes
        b.box(0, 0.5 * s, fz - 0.01, 0.38 * s, 0.24 * s, 0.06, 0x50555a);
        [[0xc91a09, -0.11], [0x0055bf, 0], [0xbbe90b, 0.11]].forEach(([c, x]) => b.box(x * s, 0.6 * s, fz + 0.03, 0.06 * s, 0.06 * s, 0.03, c));
        b.box(0.08 * s, 0.53 * s, fz + 0.03, 0.14 * s, 0.03 * s, 0.03, 0xf2cd37);
        for (const sd of [-1, 1]) b.box(sd * 0.36 * s * d.W, 0.2 * s, 0, 0.06 * s, 0.6 * s, 0.47 * s * d.D, OR);
        // helmet collar ring
        b.cyl(0, d.neckY - 0.07 * s, 0, 0.37 * s, 0.12 * s, 0xc8ccd0, { seg: 18 });
        // jetpack: pack, twin tanks with red nose cones, nozzles, a whip antenna
        b.box(0, 0.22 * s, bz - 0.1 * s, 0.62 * s, 0.66 * s, 0.22 * s, 0xc8ccd0);
        for (const sd of [-1, 1]) {
          const x = sd * 0.3 * s, z = bz - 0.3 * s;
          b.cyl(x, 0.12 * s, z, 0.15 * s, 1.0 * s, 0xe8e8e8, { seg: 14 });
          b.cone(x, 1.12 * s, z, 0.15 * s, 0.3 * s, 0xc91a09);
          b.cyl(x, 0.75 * s, z, 0.16 * s, 0.06 * s, 0x0055bf, { seg: 14 });
          b.cyl(x, -0.02 * s, z, 0.09 * s, 0.14 * s, 0x30343a, { seg: 10 });
          rbox(b, x + sd * 0.12 * s, 0.2 * s, z, 0.04, 0.3 * s, 0.22 * s, 0, 0, sd * 0.3, 0xc91a09);
        }
        rod(b, [0.26 * s, 0.85 * s, bz - 0.15 * s], [0.34 * s, 1.5 * s, bz - 0.2 * s], 0.012, 0x30343a, 4);
      },
      arm: (ab, sd, d) => { const s = d.s; ab.cyl(0, -0.48 * s, 0, 0.15 * s, 0.06 * s, OR, { seg: 10 }); ab.sphere(0, -0.02 * s, 0, 0.17 * s, SUIT); },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        // brown hair with two space buns
        geoM(hb, domeGeo(), HAIR, 0, h * 0.8, -0.02, 0, 0, 0, r * 1.07, r * 0.6, r * 1.1);
        hb.cyl(0, h * 0.25, -r * 0.35, r * 1.02, h * 0.62, HAIR, { seg: 14 });
        for (const sd of [-1, 1]) hb.sphere(sd * 0.17, h + 0.05, -0.04, 0.11, HAIR);
        // the bubble: glass dome + glint
        hb.add(sphGeo(), clear(0xa8dcff, 0.32), 0, h * 0.52, 0.04, 0, 0.55, 0.55, 0.55);
        geoM(hb, torusGeo(0.12, 22), 0xc8ccd0, 0, -0.02, 0.02, PI / 2, 0, 0, 0.4);
      },
    });
    const s = rig.dims.s, h = rig.dims.headH;
    const glint = ball(rig.head, 0xffffff, 0.06, -0.24, h * 0.95, 0.4, 0.8); glint.scale.set(0.07, 0.15, 0.03); glint.rotation.z = -0.5;
    const tip = ball(rig.torso, 0xff3030, 0.05, 0.34 * s, 1.52 * s, backZ(rig.dims) - 0.2 * s, 0.95);
    const flames = [-1, 1].map((sd) => { const f = fxg(rig.torso, { x: sd * 0.3 * s, y: -0.02 * s, z: backZ(rig.dims) - 0.3 * s }); flame(f); return f; });
    finish(rig, 1.2);
    rig.fx = (n, f, t) => {
      vis(tip, ((t * 2) | 0) % 2 === 0);
      let k = 0;
      if (n === 'cheer') k = sm(seg(f, 0.04, 0.2)) * (1 - sm(seg(f, 0.82, 1))) * 1.1;
      else if (n === 'win') k = 0.7;
      else if (n === 'trick' || n === 'glide' || n === 'use') k = 0.6;
      for (const fl of flames) { vis(fl, k > 0.02); if (k > 0.02) fl.scale.set(1, k * (0.8 + S(t * 53 + fl.position.x * 9) * 0.2), 1); }
    };
    return rig;
  },
};

// ============================================================================ Cap'n Redbeard
// Barrel-chested pirate: enormous red beard, tricorn, hook hand, cutlass and a parrot.
const redbeard = {
  voice: { kind: 'deep', pitch: 0.85 }, style: { cheer: 'fist', win: 'both', trick: 'arms' },
  gestures: {
    // "Arrr!" hook shaken high, cutlass forward, the parrot takes off
    cheer: (f, t) => ({ lx: UP + S(t * 16) * 0.25, lz: 0.35, rx: -2.15, rz: 0.1, hx: -0.32, hy: -0.15, tz: 0.08, by: abs(S(t * 12)) * 0.06 }),
    // belly laugh with the cutlass aloft while the parrot circles
    win: (f, t) => ({ rx: -2.95, rz: -0.12, lx: -1.3, lz: 0.85, hx: -0.4 + S(t * 11) * 0.08, tx: -0.15, by: abs(S(t * 11)) * 0.08, ty: S(f * PI * 2) * 0.15 }),
    taunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.2, ty: a.tauntSide * 0.4, lx: -2.0, lz: a.tauntSide * 0.2 + S(t * 12) * 0.15, hz: S(t * 9) * 0.1 }),
  },
  build() {
    const COAT = 0x8a1a12, GOLD = 0xe6b53a, BEARD = 0xc8401a;
    const rig = fig({
      name: 'redbeard', s: 1.36, wide: 1.48, deep: 1.45, headR: 0.31, headH: 0.5,
      torso: COAT, legs: C.black, arms: COAT, hands: SKIN, skin: SKIN,
      face: face('redbeard', SKIN, (P) => {
        // eyepatch + strap, one squinting eye, bushy red brows
        P.line([[-40, -34], [40, 2]], '#1b1b1b', 5);
        P.ell(-18, -8, 13, 12, '#1b1b1b');
        P.eyes(18, -8, 6, 8); P.ell(-18, -8, 13, 12, '#1b1b1b');
        P.line([[6, -24], [32, -28]], '#9a2a10', 9); P.line([[-6, -24], [-32, -28]], '#9a2a10', 9);
        P.ell(0, 6, 9, 7, '#e8a020');
      }, 0.53),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        // barrel belly with a white shirt, gold buttons, belt and buckle
        b.sphere(0, 0.42 * s, 0.08 * s, 0.46 * s, 0xf4f4f4, { sy: 0.95 });
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) b.box(sd * 0.3 * s, (0.36 + i * 0.18) * s, fz + 0.04, 0.06 * s, 0.06 * s, 0.06, GOLD);
        b.box(0, 0.2 * s, 0.03 * s, 1.06 * s, 0.13 * s, 0.86 * s, 0x2a1a10);
        b.box(0, 0.19 * s, 0.47 * s, 0.2 * s, 0.16 * s, 0.05, GOLD);
        // scabbard on the hip
        rbox(b, 0.55 * s, 0.05 * s, 0.1 * s, 0.07 * s, 0.6 * s, 0.12 * s, 0.9, 0, 0.2, 0x2a1a10);
      },
      arm: (ab, sd, d) => {
        const s = d.s;
        // gold epaulette with fringe, wide cuffs
        geoM(ab, domeGeo(), GOLD, 0, 0.02 * s, 0, 0, 0, 0, 0.2 * s, 0.12 * s, 0.2 * s);
        for (let k = 0; k < 5; k++) ab.box(sd * 0.16 * s, -0.08 * s, (k - 2) * 0.06 * s, 0.03 * s, 0.12 * s, 0.03 * s, GOLD);
        ab.box(0, -0.52 * s, 0, 0.3 * s, 0.1 * s, 0.32 * s, GOLD);
        if (sd > 0) {
          // hook hand: a cuff over the fist and a steel hook
          ab.cyl(0, -0.7 * s, 0, 0.13 * s, 0.2 * s, 0x2a1a10, { seg: 10 });
          const H = 0xc8ccd0;
          rod(ab, [0, -0.7 * s, 0], [0, -0.92 * s, 0], 0.035, H, 6);
          rod(ab, [0, -0.92 * s, 0], [0, -1.0 * s, 0.07 * s], 0.035, H, 6);
          rod(ab, [0, -1.0 * s, 0.07 * s], [0, -0.98 * s, 0.17 * s], 0.032, H, 6);
          rod(ab, [0, -0.98 * s, 0.17 * s], [0, -0.88 * s, 0.2 * s], 0.028, H, 6);
        }
      },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        // the beard: huge, forked, down over the belly, with a moustache on top
        hb.add(taperGeo(0.42, 0.86, 0.72, 0.34, 0.42), plastic(BEARD), 0, -0.52, r * 0.62, 0, 1, 1, 1);
        for (const sd of [-1, 1]) {
          hb.sphere(sd * 0.3, h * 0.1, r * 0.55, 0.2, BEARD, { sy: 1.3 });
          hb.sphere(sd * 0.13, -0.56, r * 0.72, 0.15, BEARD, { sy: 1.4 });
          hb.box(sd * 0.13, -0.78, r * 0.72, 0.1, 0.08, 0.1, C.black);
          rbox(hb, sd * 0.12, h * 0.36, r * 1.02, 0.24, 0.1, 0.12, 0, 0, sd * -0.35, BEARD);
        }
        hb.sphere(0, h * 0.42, r * 1.02, 0.07, 0xe8a020);
        // tricorn: crown, three upturned flaps and a skull
        hb.cyl(0, h * 0.82, 0, r * 1.06, 0.3, C.black, { seg: 16 });
        geoM(hb, domeGeo(), C.black, 0, h * 0.82 + 0.3, 0, 0, 0, 0, r * 1.06, r * 0.5, r * 1.06);
        hb.cyl(0, h * 0.82, 0, r * 1.5, 0.04, C.black, { seg: 3, rot: 0 });
        for (const a of [PI / 3, PI, -PI / 3]) {
          const x = Math.sin(a) * r * 0.82, z = Math.cos(a) * r * 0.82;
          ybox(hb, x, h * 0.82 + 0.13, z, r * 2.35, 0.24, 0.05, a, 0.35, 0, C.black);
          ybox(hb, x * 1.12, h * 0.82 + 0.25, z * 1.12, r * 2.3, 0.04, 0.06, a, 0.35, 0, GOLD);
        }
        hb.sphere(0, h * 0.82 + 0.18, r * 1.55, 0.07, C.white);
        for (const sd of [-1, 1]) rbox(hb, 0, h * 0.82 + 0.1, r * 1.55, 0.22, 0.035, 0.03, 0, 0, sd * 0.7, C.white);
      },
    });
    const s = rig.dims.s, d = rig.dims;
    // cutlass (in hand during gestures)
    const g = grip(rig.armR, s);
    const cut = prop(g, (b) => {
      b.box(0, -0.05, 0, 0.06, 0.2, 0.06, 0x2a1a10);
      geoM(b, torusGeo(0.18, 12), 0xe6b53a, 0, 0.06, 0.06, 0, PI / 2, 0, 0.1);
      b.box(0, 0.06, 0, 0.22, 0.04, 0.08, 0xe6b53a);
      rbox(b, 0, 0.42, 0.02, 0.025, 0.7, 0.12, 0.08, 0, 0, 0xd8dde2);
      rbox(b, 0, 0.88, 0.07, 0.025, 0.3, 0.13, 0.35, 0, 0, 0xd8dde2);
    }, { name: 'cutlass', visible: false });
    // the parrot on his right shoulder
    const P0 = new THREE.Vector3(-d.shoulderX - 0.02, d.shoulderY + 0.14 * s, -0.02);
    const parrot = new THREE.Group(); parrot.position.copy(P0); rig.torso.add(parrot);
    prop(parrot, (b) => {
      b.sphere(0, 0.2, 0, 0.13, C.red, { sy: 1.35 });
      b.sphere(0, 0.42, 0.05, 0.1, C.red);
      rbox(b, 0, 0.4, 0.17, 0.05, 0.1, 0.09, 0.6, 0, 0, 0xf2cd37);
      rbox(b, 0, 0.36, 0.18, 0.04, 0.06, 0.06, 0.6, 0, 0, C.black);
      for (const sd of [-1, 1]) { b.sphere(sd * 0.07, 0.45, 0.1, 0.03, C.white); b.sphere(sd * 0.085, 0.45, 0.115, 0.015, C.black); }
      rbox(b, 0, 0.02, -0.14, 0.08, 0.4, 0.04, -0.6, 0, 0, C.blue);
      rbox(b, 0, -0.05, -0.2, 0.05, 0.3, 0.03, -0.5, 0, 0, C.red);
      for (const sd of [-1, 1]) b.box(sd * 0.05, -0.02, 0, 0.03, 0.06, 0.06, 0x30343a);
    }, { name: 'parrot' });
    const wings = [-1, 1].map((sd) => prop(parrot, (b) => {
      b.box(sd * 0.02, -0.2, 0, 0.035, 0.26, 0.16, C.blue);
      b.box(sd * 0.02, -0.08, 0.01, 0.04, 0.08, 0.17, 0xf2cd37);
    }, { x: sd * 0.11, y: 0.32, z: -0.01, name: 'parrot-wing' }));
    finish(rig, 1.8);
    rig.fx = (n, f, t) => {
      const on = n === 'cheer' || n === 'win' || n === 'throwF' || n === 'use';
      vis(cut, on); if (on) hold(g, rig.armR, n === 'win' ? 0.1 : 0.9, 0.6);
      let fly = 0, flap = 0.05 + abs(S(t * 2)) * 0.05;
      if (n === 'cheer') { fly = sm(seg(f, 0.05, 0.3)) * (1 - sm(seg(f, 0.75, 1))); }
      if (n === 'win') {
        const a = t * 3.2;
        parrot.position.set(Math.cos(a) * 0.85, 2.35 * s * 0.75 + S(t * 6) * 0.08, Math.sin(a) * 0.85);
        parrot.rotation.set(0, -a, 0.35);
        flap = 0.4 + abs(S(t * 26)) * 1.2;
      } else {
        parrot.position.set(P0.x - fly * 0.25, P0.y + fly * 0.75 + fly * S(t * 9) * 0.06, P0.z + fly * 0.15);
        parrot.rotation.set(0, fly * 0.3, -fly * 0.2);
        if (fly > 0.02) flap = 0.4 + abs(S(t * 28)) * 1.25;
        if (n === 'ouch') { parrot.rotation.z = S(t * 30) * 0.3; flap = abs(S(t * 30)) * 1.2; }
      }
      wings[0].rotation.z = -flap; wings[1].rotation.z = flap;
    };
    return rig;
  },
};

// ============================================================================ Sir Kara
// Armoured tank: great helm with glowing eye-slit and a towering plume, kite shield, jousting lance.
const kara = {
  voice: { kind: 'human', pitch: 1.12 }, style: { cheer: 'salute', win: 'salute', trick: 'superman' },
  gestures: {
    // "CHARGE!": lean in, lance couched level, shield up
    cheer: (f, t) => {
      const k = sm(seg(f, 0, 0.2));
      return { tx: 0.3 * k, hx: -0.35 * k, rx: -1.3 - bump(f, 0.25, 0.45) * 0.35 - bump(f, 0.55, 0.75) * 0.35, rz: 0.12, lx: -1.55, lz: -0.35, by: abs(S(t * 16)) * 0.07, tz: S(t * 16) * 0.03 };
    },
    // victory: lance raised to the sky, shield out, plume tossing
    win: (f, t) => ({ rx: -2.7, rz: 0.05, lx: -1.2, lz: 0.75, hx: -0.3, tx: -0.12, ty: S(f * PI * 2) * 0.18, by: abs(S(t * 8)) * 0.05 }),
    ouch: (f, t) => ({ lx: -1.55, lz: -0.6, rx: -0.9, tx: 0.2, hx: 0.3, tz: S(t * 22) * 0.08, hy: S(t * 17) * 0.2 }),
  },
  build() {
    const STEEL = 0xc6cbd0, DARK = 0x7a8088, BLUE = 0x1f4fb0, GOLD = 0xf2cd37;
    const rig = fig({
      name: 'kara', s: 1.42, wide: 1.3, deep: 1.22, headR: 0.3, headH: 0.5,
      torso: STEEL, legs: DARK, arms: STEEL, hands: DARK, skin: STEEL,
      head: (hb, d) => {
        const r = d.headR * 1.14, h = d.headH * 1.12;
        // great helm: bucket, flat lid, eye slit, breaths, gold cross
        hb.cyl(0, -0.03, 0, r, h, STEEL, { seg: 18 });
        hb.cyl(0, h - 0.03, 0, r * 0.92, 0.05, DARK, { seg: 18 });
        hb.box(0, h * 0.58, r * 0.88, r * 1.6, 0.08, 0.2, 0x15181c);
        hb.box(0, h * 0.18, r * 0.94, 0.07, h * 0.36, 0.1, GOLD);
        hb.box(0, h * 0.78, r * 0.94, r * 1.7, 0.06, 0.1, GOLD);
        for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) hb.box(sd * (0.11 + k * 0.06), h * 0.3, r * 0.96, 0.03, 0.03, 0.06, 0x15181c);
        // glowing eyes in the slit
        for (const sd of [-1, 1]) hb.box(sd * 0.11, h * 0.58 + 0.022, r * 0.99, 0.08, 0.035, 0.03, 0, { mat: glowMat(0x8fd8ff, 3) });
        // crest holder
        hb.cyl(0, h, -0.02, 0.07, 0.12, GOLD, { seg: 8 });
      },
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        // blue tabard with a gold cross, belt, gorget
        b.box(0, 0.08 * s, fz - 0.02, 0.62 * s, 0.82 * s, 0.05, BLUE);
        b.box(0, 0.25 * s, fz + 0.01, 0.1 * s, 0.55 * s, 0.04, GOLD);
        b.box(0, 0.55 * s, fz + 0.01, 0.42 * s, 0.1 * s, 0.04, GOLD);
        b.box(0, 0.16 * s, 0, 0.98 * s * d.W, 0.1 * s, 0.5 * s * d.D, 0x5a3a20);
        b.cyl(0, d.neckY - 0.12 * s, 0, 0.26 * s, 0.14 * s, DARK, { seg: 14 });
        for (let i = 0; i < 3; i++) b.box(0, 0.38 * s + i * 0.18 * s, backZ(d) - 0.01, 0.6 * s, 0.03 * s, 0.03, DARK);
      },
      arm: (ab, sd, d) => {
        const s = d.s;
        // big layered pauldrons, gauntlet cuffs
        geoM(ab, domeGeo(), STEEL, sd * 0.03 * s, -0.04 * s, 0, 0, 0, 0, 0.27 * s, 0.22 * s, 0.27 * s);
        ab.cyl(sd * 0.03 * s, -0.12 * s, 0, 0.27 * s, 0.08 * s, DARK, { seg: 14 });
        ab.cyl(0, -0.2 * s, 0, 0.21 * s, 0.07 * s, STEEL, { seg: 12 });
        ab.cyl(0, -0.5 * s, 0, 0.15 * s, 0.1 * s, DARK, { seg: 10 });
        if (sd > 0) {
          // kite shield on the left arm: blue field, gold cross, steel rim
          const x = 0.17 * s;
          ab.box(x, -0.62 * s, 0, 0.06, 0.52 * s, 0.58 * s, STEEL);
          ab.add(taperGeo(0.04, 0.58 * s, 0.34 * s, 0.06, 0.06), plastic(STEEL), x, -0.96 * s, 0, PI / 2, 1, 1, 1);
          ab.box(x + 0.02, -0.6 * s, 0, 0.06, 0.46 * s, 0.5 * s, BLUE);
          ab.add(taperGeo(0.02, 0.5 * s, 0.29 * s, 0.06, 0.06), plastic(BLUE), x + 0.02, -0.89 * s, 0, PI / 2, 1, 1, 1);
          ab.box(x + 0.05, -0.82 * s, 0, 0.04, 0.68 * s, 0.08 * s, GOLD);
          ab.box(x + 0.05, -0.45 * s, 0, 0.04, 0.08 * s, 0.42 * s, GOLD);
        }
      },
    });
    const s = rig.dims.s, h = rig.dims.headH * 1.12;
    // the plume: red and white feathers sweeping back
    const plume = prop(rig.head, (b) => {
      const pts = [[0, 0.03, 0.02, 0.12], [0, 0.15, -0.04, 0.15], [0, 0.26, -0.15, 0.17], [0, 0.33, -0.31, 0.17], [0, 0.34, -0.49, 0.15], [0, 0.28, -0.66, 0.12], [0, 0.16, -0.79, 0.09]];
      pts.forEach(([x, y, z, r], i) => b.sphere(x, y, z, r, i % 2 ? C.white : 0xd01a1a, { sy: 1.25 }));
    }, { y: h + 0.05, z: -0.02, name: 'plume' });
    // the lance
    const g = grip(rig.armR, s);
    const lance = prop(g, (b) => {
      b.cyl(0, -0.4, 0, 0.05, 0.6, 0x7a5030, { seg: 8 });
      b.add(frustum(0.06, 0.24, 14), plastic(STEEL), 0, 0.12, 0, 0, 1, 0.32, 1);
      const segs = 5, L = 1.95;
      for (let i = 0; i < segs; i++) {
        const r0 = 0.11 * (1 - i / segs), r1 = 0.11 * (1 - (i + 1) / segs) + 0.008;
        b.add(frustum(r1 / r0, 1, 10), plastic(i % 2 ? C.white : BLUE), 0, 0.42 + (L / segs) * i, 0, 0, r0, L / segs, r0);
      }
      rbox(b, 0, 1.75, -0.18, 0.02, 0.2, 0.32, 0, 0, 0, GOLD);
    }, { name: 'lance', rz: 0.26 });
    let a = 0.62, lastT = 0;
    rig.idle = (t, dt, an, st) => {
      plume.rotation.x = -0.1 - (st.speed01 || 0) * 0.25 + S(t * 7) * 0.05 * (0.3 + (st.speed01 || 0));
    };
    finish(rig, 1.85);
    rig.fx = (n, f, t) => {
      const target = n === 'cheer' ? (f < 0.12 ? 0.62 : 1.28) : n === 'win' ? 0.08 : n === 'ouch' ? 1.0 : n === 'glide' ? 1.2 : 0.62;
      const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
      a += (target - a) * Math.min(1, dt * 8);
      hold(g, rig.armR, a);
      lance.rotation.z = lerp(lance.rotation.z, n === 'cheer' || n === 'win' ? 0.05 : 0.26, Math.min(1, dt * 8));
      if (n === 'win') plume.rotation.x = -0.2 + S(t * 9) * 0.15;
    };
    return rig;
  },
};

// ============================================================================ Robo-Rex
// Boxy robot: wide screen face with moods, antennae, piston arms with pincer claws, exhausts.
function screenMat(mood) {
  const key = 'rex-' + mood;
  return screenCache[key] ||= (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 80;
    const g = c.getContext('2d');
    g.fillStyle = '#071a0c'; g.fillRect(0, 0, 128, 80);
    g.fillStyle = mood === 'ouch' ? '#ff4a3a' : mood === 'win' ? '#ffd23a' : '#7dff5a';
    const px = (x, y, w = 1, h = 1) => g.fillRect(x * 8, y * 8, w * 8, h * 8);
    if (mood === 'idle') { px(3, 2, 2, 3); px(11, 2, 2, 3); px(5, 7, 6, 1); }
    else if (mood === 'blink') { px(3, 4, 2, 1); px(11, 4, 2, 1); px(5, 7, 6, 1); }
    else if (mood === 'happy') { px(2, 4); px(3, 3); px(4, 3); px(5, 4); px(10, 4); px(11, 3); px(12, 3); px(13, 4); px(4, 7, 8, 1); px(3, 6); px(12, 6); }
    else if (mood === 'win') { for (const x of [2, 10]) { px(x + 1, 1, 2, 1); px(x, 2, 4, 2); px(x + 1, 4, 2, 1); px(x + 1.5, 0, 1, 1); } px(4, 7, 8, 1); px(3, 6); px(12, 6); }
    else if (mood === 'ouch') { for (const x of [2, 10]) { px(x, 2); px(x + 2, 2); px(x + 1, 3); px(x, 4); px(x + 2, 4); } px(5, 7, 1, 1); px(6, 6, 4, 1); px(10, 7, 1, 1); }
    else if (mood === 'sad') { px(3, 3, 2, 2); px(11, 3, 2, 2); px(2, 2); px(13, 2); px(5, 6, 6, 1); px(4, 7); px(11, 7); }
    // scanlines
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < 80; y += 4) g.fillRect(0, y, 128, 1);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
    return new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  })();
}
const screenCache = {};
const rex = {
  voice: { kind: 'robot', pitch: 0.85 }, style: { cheer: 'beep', win: 'beep', trick: 'twist' },
  gestures: {
    // "doing the robot": arms snap between right angles while the head spins round
    cheer: (f, t) => {
      const k = Math.floor(f * 6) % 2;
      return { lx: k ? -1.57 : -0.25, rx: k ? -0.25 : -1.57, lz: k ? 0 : 0.6, rz: k ? -0.6 : 0, tz: k ? 0.08 : -0.08, by: 0.03 * k };
    },
    win: (f, t) => {
      const k = Math.floor(f * 8) % 4;
      const L = [[-3.0, 0.2], [-1.57, 1.4], [-3.0, 0.2], [-1.57, 0.0]][k], R = [[-1.57, -1.4], [-3.0, -0.2], [-1.57, 0.0], [-3.0, -0.2]][k];
      return { lx: L[0], lz: L[1], rx: R[0], rz: R[1], ty: (k - 1.5) * 0.12, hy: (k % 2 ? 0.4 : -0.4), by: 0.04 * (k % 2) };
    },
  },
  build() {
    const BODY = 0x6c6e68, LITE = 0xa0a5a9, LIME = 0xbbe90b;
    const rig = fig({
      name: 'rex', s: 1.42, wide: 1.42, deep: 1.32, torso: BODY, legs: LITE, arms: BODY, hands: LITE, skin: LITE,
      head: (hb, d) => {
        // boxy head with ear bolts and a chin grille
        hb.box(0, -0.02, 0, 1.0, 0.68, 0.74, LITE);
        hb.box(0, 0.64, 0, 0.84, 0.06, 0.6, BODY);
        for (const sd of [-1, 1]) {
          rod(hb, [sd * 0.5, 0.32, 0], [sd * 0.62, 0.32, 0], 0.14, BODY, 12);
          rod(hb, [sd * 0.62, 0.32, 0], [sd * 0.66, 0.32, 0], 0.08, 0xe03a2a, 10);
          rod(hb, [sd * 0.24, 0.66, 0], [sd * 0.36, 1.08, -0.04], 0.025, 0x30343a, 5);
          hb.sphere(sd * 0.36, 1.1, -0.04, 0.07, 0, { mat: glowMat(LIME, 2.5) });
        }
        for (let i = 0; i < 4; i++) hb.box(-0.21 + i * 0.14, 0.0, 0.37, 0.06, 0.08, 0.03, 0x30343a);
        hb.box(0, 0.08, 0.37, 0.86, 0.56, 0.02, 0x30343a);
      },
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d), bz = backZ(d);
        // chest: power-meter bars, a dial, rivets; accordion neck; exhaust stacks
        b.box(0, 0.36 * s, fz - 0.01, 0.6 * s, 0.4 * s, 0.05, 0x30343a);
        for (let i = 0; i < 4; i++) b.box(-0.2 * s + i * 0.09 * s, 0.4 * s, fz + 0.03, 0.06 * s, (0.08 + i * 0.05) * s, 0.02, 0, { mat: glowMat(i === 3 ? 0xff5a3a : LIME, 2) });
        rod(b, [0.2 * s, 0.6 * s, fz], [0.2 * s, 0.6 * s, fz + 0.04], 0.09 * s, C.white, 14);
        rbox(b, 0.2 * s, 0.62 * s, fz + 0.05, 0.015, 0.08 * s, 0.01, 0, 0, -0.6, 0xe03a2a);
        for (const sd of [-1, 1]) for (const y of [0.1, 0.75]) b.sphere(sd * 0.36 * s * d.W, y * s, fz - 0.02, 0.035 * s, LITE);
        for (let i = 0; i < 3; i++) b.cyl(0, d.neckY - 0.1 * s + i * 0.05 * s, 0, (0.16 - i * 0.02) * s, 0.04 * s, i % 2 ? LITE : 0x30343a, { seg: 12 });
        for (const sd of [-1, 1]) {
          b.cyl(sd * 0.3 * s, 0.3 * s, bz - 0.12 * s, 0.08 * s, 1.05 * s, 0x30343a, { seg: 10 });
          b.cyl(sd * 0.3 * s, 1.3 * s, bz - 0.12 * s, 0.1 * s, 0.08 * s, LITE, { seg: 10 });
        }
        b.box(0, 0.4 * s, bz - 0.05 * s, 0.55 * s, 0.45 * s, 0.1 * s, LITE);
      },
      arm: (ab, sd, d) => {
        const s = d.s;
        rod(ab, [-0.15 * s, 0, 0], [0.15 * s, 0, 0], 0.13 * s, LITE, 12);
        for (let i = 0; i < 3; i++) ab.cyl(0, (-0.18 - i * 0.12) * s, 0, 0.15 * s, 0.05 * s, LITE, { seg: 10 });
        // pincer claws
        for (const z of [-1, 1]) {
          rbox(ab, 0, -0.8 * s, z * 0.07 * s, 0.09 * s, 0.3 * s, 0.05 * s, z * 0.35, 0, 0, LITE);
          rbox(ab, 0, -0.95 * s, z * 0.1 * s, 0.07 * s, 0.1 * s, 0.05 * s, -z * 0.5, 0, 0, 0x30343a);
        }
      },
    });
    const s = rig.dims.s;
    // head contents on a spinner (the head pivot's turn is clamped; this one isn't)
    const spin = new THREE.Group();
    while (rig.head.children.length) spin.add(rig.head.children[0]);
    rig.head.add(spin);
    const scr = new THREE.Mesh(cached2('rexScreen', () => new THREE.PlaneGeometry(0.8, 0.5)), screenMat('idle'));
    scr.position.set(0, 0.36, 0.383); spin.add(scr);
    const moods = { idle: screenMat('idle'), blink: screenMat('blink'), happy: screenMat('happy'), win: screenMat('win'), ouch: screenMat('ouch'), sad: screenMat('sad') };
    const smoke = [-1, 1].map((sd) => { const g = fxg(rig.torso, { x: sd * 0.3 * s, y: 1.45 * s, z: backZ(rig.dims) - 0.12 * s }); puffs(g, 0x50555a, 4, 0.18, 0.1, 4 + sd, { up: 0.3 }); return g; });
    finish(rig, 1.9);
    rig.fx = (n, f, t) => {
      let m = moods.idle;
      if (n === 'cheer' || n === 'yay' || n === 'trick') m = moods.happy;
      else if (n === 'win') m = moods.win;
      else if (n === 'ouch' || n === 'bonk') m = moods.ouch;
      else if (n === 'lose') m = moods.sad;
      else if (t % 3.2 < 0.14) m = moods.blink;
      if (scr.material !== m) scr.material = m;
      spin.rotation.y = n === 'cheer' ? sm(seg(f, 0.15, 0.7)) * PI * 2 : 0;
      const puff = n === 'cheer' || n === 'win' || n === 'boost';
      for (const g of smoke) { vis(g, puff); if (puff) { const k = (t * 2.5 + g.position.x) % 1; g.position.y = 1.45 * s + k * 0.6; g.scale.setScalar(0.5 + k * 1.3); } }
    };
    return rig;
  },
};
const geoStore = new Map();
const cached2 = (k, mk) => { let g = geoStore.get(k); if (!g) { g = mk(); geoStore.set(k, g); } return g; };

// ============================================================================ Ninja Nix
// Lean ninja: masked, red headband tails streaming, katana over the shoulder, smoke-bomb vanish.
function katana(b, back) {
  const HILT = 0x1b1b1b;
  b.cyl(0, 0, 0, 0.045, 0.32, HILT, { seg: 8 });
  for (let i = 0; i < 4; i++) rbox(b, 0, 0.05 + i * 0.07, 0, 0.1, 0.03, 0.1, 0, PI / 4, 0, C.white);
  b.cyl(0, -0.03, 0, 0.11, 0.035, 0xe6b53a, { seg: 12 });
  if (back) b.cyl(0, -1.0, 0, 0.06, 0.98, 0x2a1a20, { seg: 8 });
  else { rbox(b, 0, -0.5, 0, 0.025, 0.95, 0.075, 0, 0, 0, 0xe8eef4); rbox(b, 0, -1.02, 0.015, 0.025, 0.12, 0.05, -0.3, 0, 0, 0xe8eef4); }
}
const nix = {
  voice: { kind: 'human', pitch: 1.15 }, style: { cheer: 'point', win: 'salute', trick: 'twist' },
  gestures: {
    // draw over the shoulder, a diagonal slash, then a pose
    cheer: (f, t) => {
      const draw = sm(seg(f, 0, 0.22)), cut = sm(seg(f, 0.3, 0.45));
      const rx = lerp(lerp(-1.0, -2.95, draw), -1.0, cut), rz = lerp(lerp(0, 0.45, draw), -0.25, cut);
      return { rx, rz, ty: lerp(-0.25 * draw, 0.45, cut), tx: cut * 0.15, lx: -0.6 - cut * 0.6, lz: 0.4 + cut * 0.3, hx: -0.1, hy: lerp(0.2, -0.25, cut) };
    },
    // poof! smoke bomb, gone, back in a pose with the blade high
    win: (f, t) => ({ rx: -2.6, rz: 0.2, lx: -1.5, lz: -0.55, hx: -0.15, hy: -0.35, tz: 0.06, ty: -0.12 }),
  },
  build() {
    const GI = 0x22262e, SASH = 0x2e9a4a, BAND = 0xd01a1a;
    const rig = fig({
      name: 'nix', s: 1.3, wide: 0.8, deep: 0.85, headR: 0.27, headH: 0.5,
      torso: GI, legs: GI, arms: GI, hands: GI, skin: GI,
      face: face('nix', GI, (P) => {
        P.rect(-120, -24, 240, 30, '#ffc917');
        P.ell(-18, -8, 9, 8, '#1b1b1b'); P.ell(18, -8, 9, 8, '#1b1b1b');
        P.ell(-15, -11, 3, 3, '#fff'); P.ell(21, -11, 3, 3, '#fff');
        P.line([[-32, -24], [-8, -15]], '#1b1b1b', 6); P.line([[32, -24], [8, -15]], '#1b1b1b', 6);
        P.line([[-60, 20], [60, 20]], '#2a2f38', 3);
      }, 0.59),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        // crossed gi lapels, green sash with a knot, shuriken on the belt
        rbox(b, 0.06 * s, 0.6 * s, fz, 0.1 * s, 0.6 * s, 0.03, 0, 0, 0.5, 0x3a404a);
        rbox(b, -0.06 * s, 0.6 * s, fz, 0.1 * s, 0.6 * s, 0.03, 0, 0, -0.5, 0x3a404a);
        b.box(0, 0.16 * s, 0, 0.9 * s * d.W, 0.12 * s, 0.5 * s * d.D, SASH);
        b.sphere(0.2 * s, 0.17 * s, fz + 0.03, 0.06 * s, SASH);
        for (const a of [0, PI / 4]) rbox(b, -0.2 * s, 0.22 * s, fz + 0.05, 0.16 * s, 0.035 * s, 0.01, 0, 0, a, 0xc8ccd0);
        // strap for the katana across the chest
        rbox(b, 0, 0.55 * s, fz + 0.005, 0.06 * s, 0.95 * s, 0.03, 0, 0, -0.75, 0x5a3a20);
      },
      arm: (ab, sd, d) => { const s = d.s; ab.cyl(0, -0.5 * s, 0, 0.13 * s, 0.12 * s, 0x3a404a, { seg: 10 }); },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        geoM(hb, domeGeo(), GI, 0, h * 0.85, 0, 0, 0, 0, r * 1.06, r * 0.75, r * 1.06);
        hb.cyl(0, h * 0.72, 0, r * 1.07, 0.1, BAND, { seg: 18 });
        hb.box(0, h * 0.74, r * 1.02, 0.18, 0.08, 0.04, 0xc8ccd0);
        hb.sphere(0, h * 0.77, -r * 1.05, 0.07, BAND);
      },
    });
    const s = rig.dims.s, h = rig.dims.headH, r = rig.dims.headR;
    // headband tails (stream back with speed)
    const tails = prop(rig.head, (b) => {
      for (const sd of [-1, 1]) { rbox(b, sd * 0.05, -0.38, 0, 0.08, 0.76, 0.02, 0, 0, sd * 0.12, BAND); }
    }, { y: h * 0.77, z: -r * 1.1, name: 'nix-tails' });
    // katana: sheathed on the back (hilt over the right shoulder) and drawn
    const sheath = prop(rig.torso, (b) => katana(b, true), { x: 0.0, y: 0.82 * s, z: backZ(rig.dims) - 0.06, rz: 0.7, name: 'nix-sheath' });
    const backHilt = sheath;
    const g = grip(rig.armR, s);
    const blade = prop(g, (b) => katana(b, false), { name: 'nix-katana', visible: false });
    // slash arc + smoke bomb
    const arc = fxg(rig.torso, { y: 1.0 * s, z: 0.6 });
    const arcM = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.035, 4, 18, PI * 0.8), fxMat(0xc8f4ff, 0.8)); arc.add(arcM);
    arc.rotation.set(0.3, 0, -0.9);
    const smoke = fxg(rig.root, { y: 1.0 });
    puffs(smoke, 0x9aa0aa, 12, 0.9, 0.38, 21, { up: 0.6 });
    rig.idle = (t, dt, an, st) => {
      const v = st.speed01 ?? 0.5;
      tails.rotation.x = 0.25 + v * 1.1 + S(t * 13) * 0.12 * (0.2 + v);
      tails.rotation.z = S(t * 7) * 0.12;
    };
    finish(rig, 1.1);
    rig.fx = (n, f, t) => {
      const drawn = (n === 'cheer' && f > 0.2) || n === 'win' || n === 'use';
      vis(blade, drawn); vis(backHilt, !drawn);
      vis(arc, n === 'cheer' && f > 0.3 && f < 0.55);
      if (n === 'cheer') arcM.rotation.z = lerp(-1.5, 0.6, seg(f, 0.3, 0.5));
      const w = winF(t), poof = n === 'win' && w < 0.5;
      vis(smoke, poof);
      if (poof) { smoke.scale.setScalar(0.3 + sm(seg(w, 0, 0.12)) * 1.0 + w * 0.6); smoke.rotation.y = t; }
      vis(rig.torso, !(n === 'win' && w > 0.07 && w < 0.3));
    };
    return rig;
  },
};

// ============================================================================ Chief Flo
// Fire chief: towering red fire helmet with a brass-edged brim, a long back tail and a big
// "CHIEF 1" leather shield; tan turnout coat with lime/silver reflective bands, radio,
// a red hose across the chest, air tank and a fire axe on the back, copper hair, freckles.
const floStore = new Map();
const floGeo = (k, mk) => { let g = floStore.get(k); if (!g) { g = mk(); floStore.set(k, g); } return g; };
// a canvas-printed decal material (cut out by alpha)
function floDecal(key, w, h, draw, side = THREE.DoubleSide) {
  return floGeo('mat:' + key, () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.38, alphaTest: 0.5, side });
  });
}
// the helmet frontpiece: brass rim, black leather, "CHIEF" over a red field with a big "1"
// (back = the plain leather back of it, seen from behind)
function floShieldPath(g, k) {
  g.beginPath(); g.moveTo(4 + k, 30 + k * 0.4); g.quadraticCurveTo(64, -8 + k * 1.6, 124 - k, 30 + k * 0.4);
  g.lineTo(116 - k, 104); g.quadraticCurveTo(112 - k, 150 - k, 64, 157 - k * 1.1); g.quadraticCurveTo(16 + k, 150 - k, 12 + k, 104); g.closePath();
}
function floShieldMat(back = false) {
  return floDecal(back ? 'flo-shield-back' : 'flo-shield', 128, 160, (g) => {
    const path = (k) => floShieldPath(g, k);
    path(0); g.fillStyle = '#e8b830'; g.fill();
    path(8); g.fillStyle = '#141414'; g.fill();
    if (back) return;
    g.fillStyle = '#fff'; g.font = 'bold 25px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('CHIEF', 64, 40);
    g.fillStyle = '#d81e10'; g.beginPath(); g.ellipse(64, 100, 38, 40, 0, 0, PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#e8b830'; g.stroke();
    g.font = 'bold 64px Arial, sans-serif'; g.lineWidth = 8; g.strokeStyle = '#141414';
    g.strokeText('1', 64, 104); g.fillStyle = '#fff'; g.fillText('1', 64, 104);
  }, THREE.FrontSide);
}
// the name across the back of the coat
function floBackMat() {
  return floDecal('flo-back', 256, 64, (g) => {
    g.fillStyle = '#d8f040'; g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#e8ecf0'; g.fillRect(0, 26, 256, 12);
    g.fillStyle = '#c01a10'; g.font = 'bold 50px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#141414'; g.strokeText('CHIEF', 128, 35); g.fillText('CHIEF', 128, 35);
  });
}
// torso width/depth at height y (seatedFig's tapered torso)
const floAt = (d, y) => { const k = (y - d.chestY) / (0.82 * d.s); return [lerp(0.92, 0.7, k) * d.W * d.s, lerp(0.46, 0.42, k) * d.D * d.s]; };
// a reflective band hugging the torso: lime, silver middle, lime
function floBand(b, d, y, hgt, out = 0.03) {
  const band = (y0, h0, o, col) => {
    const [w0, d0] = floAt(d, y0), [w1, d1] = floAt(d, y0 + h0);
    b.add(taperGeo(+(w0 + o).toFixed(3), +(w1 + o).toFixed(3), +h0.toFixed(3), +(d0 + o).toFixed(3), +(d1 + o).toFixed(3)), plastic(col), 0, y0, 0, 0, 1, 1, 1);
  };
  band(y, hgt, out, 0xd8f040);
  band(y + hgt * 0.36, hgt * 0.28, out + 0.012, 0xe8ecf0);
}
function nozzle(b) {
  const BR = 0xd8a830;
  b.cyl(0, -0.05, 0, 0.07, 0.25, BR, { seg: 10 });
  b.add(frustum(0.55, 1, 10), plastic(BR), 0, 0.2, 0, 0, 0.09, 0.22, 0.09);
  b.box(0, 0.05, -0.08, 0.05, 0.14, 0.1, C.black);
  rod(b, [0, -0.05, 0], [0, -0.3, -0.05], 0.07, 0xc01a10, 8);
  rod(b, [0, -0.3, -0.05], [0, -0.45, -0.25], 0.07, 0xc01a10, 8);
}
// fire axe along +Y (handle from the origin, pick-head axe at the top)
function floAxe(b, L) {
  rod(b, [0, 0, 0], [0, L, 0], 0.045, 0xe8c050, 8);
  b.cyl(0, -0.02, 0, 0.055, 0.14, C.black, { seg: 8 });
  b.box(0, L - 0.12, 0, 0.12, 0.2, 0.09, 0xd01a0e);
  // blade one side (silver edge), pick the other
  geoM(b, taperGeo(0.18, 0.34, 0.26, 0.07, 0.05), plastic(0xd01a0e), 0.05, L - 0.02, 0, 0, 0, -PI / 2, 1);
  rbox(b, 0.33, L - 0.02, 0, 0.04, 0.35, 0.055, 0, 0, 0, 0xe8eef4);
  geoM(b, taperGeo(0.16, 0.02, 0.36, 0.07, 0.03), plastic(0xd01a0e), -0.05, L - 0.02, 0, 0, 0, PI / 2 + 0.12, 1);
}
const flo = {
  voice: { kind: 'human', pitch: 1.3 }, style: { cheer: 'point', win: 'wave', trick: 'arms' },
  gestures: {
    // both hands on the hose, sweeping a jet of water ahead
    cheer: (f, t) => ({ rx: -1.75, rz: 0.3, lx: -1.5, lz: -0.4, ty: S(t * 4) * 0.22, hy: S(t * 4) * 0.25, tx: -0.05, by: abs(S(t * 37)) * 0.015, hx: -0.12 }),
    // victory fountain straight up, waving with the free hand
    win: (f, t) => ({ rx: -2.95, rz: -0.05, lx: -2.55, lz: 0.4 + S(t * 11) * 0.45, hx: -0.4, hy: -0.15, by: abs(S(t * 6)) * 0.05 }),
    use: (f, t) => ({ rx: -1.75, rz: 0.3, lx: -1.5, lz: -0.4, hx: -0.1 }),
  },
  build() {
    const COAT = 0xa06c26, COAT_D = 0x6a4618, RED = 0xd01a0e, BRASS = 0xe0aa30, HAIR = 0xe25a16, GLOVE = 0x2a2a2e, HOSE = 0xc01a10;
    const rig = fig({
      name: 'flo', s: 1.24, wide: 1.32, deep: 1.22, headR: 0.31, headH: 0.48,
      torso: COAT, legs: COAT, arms: COAT, hands: GLOVE, skin: SKIN,
      face: face('flo', SKIN, (P) => {
        const g = P.g;
        // soot smudges first (under everything else)
        P.ell(-34, 4, 15, 9, 'rgba(70,60,55,0.35)', 0.3); P.ell(26, -30, 12, 5, 'rgba(70,60,55,0.3)', -0.2);
        // big determined eyes: white, dark iris, shine, lashes
        for (const sd of [-1, 1]) {
          P.ell(sd * 20, -4, 12, 14, '#fff');
          P.ell(sd * 19, -2, 8.5, 11, '#1b1b1b');
          P.ell(sd * 19 + 3, -6, 3, 3.5, '#fff');
          g.strokeStyle = '#1b1b1b'; g.lineWidth = 3.5; g.beginPath(); g.ellipse(sd * 20, -4, 12, 14, 0, PI * 1.05, PI * 1.95); g.stroke();
          P.line([[sd * 30, -12], [sd * 37, -17]], '#1b1b1b', 3.5);
          // thick copper brows, low and confident
          P.curve(sd * 8, -23, sd * 20, -31, sd * 34, -25, '#9a3a0c', 8);
          P.ell(sd * 36, 14, 10, 7, 'rgba(240,110,90,0.75)');
        }
        // freckles across the nose and cheeks, a small nose
        for (const [x, y] of [[-30, 8], [-24, 13], [-34, 15], [-14, 9], [14, 9], [24, 13], [30, 8], [34, 15]]) P.ell(x, y, 2.2, 2.2, '#b0602a');
        P.curve(-5, 9, 0, 13, 5, 9, '#b07a10', 3);
        // big open grin
        g.fillStyle = '#5a0e0e'; g.beginPath(); g.moveTo(-22, 19); g.quadraticCurveTo(0, 50, 22, 19); g.quadraticCurveTo(0, 25, -22, 19); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-19, 20.5); g.quadraticCurveTo(0, 27, 19, 20.5); g.lineTo(17, 26); g.quadraticCurveTo(0, 31, -17, 26); g.closePath(); g.fill();
        P.ell(0, 36, 9, 5, '#e05a6a');
        P.curve(-22, 19, 0, 50, 22, 19, '#1b1b1b', 3);
      }, 0.5),
      torsoExtra: (b, d) => {
        const s = d.s, at = (y) => floAt(d, y);
        // reflective bands round the chest and the hem
        floBand(b, d, 0.3 * s, 0.15 * s);
        floBand(b, d, 0.7 * s, 0.15 * s);
        // front closure flap with black clasps
        const fz = (y) => at(y)[1] / 2;
        b.add(taperGeo(0.15 * s, 0.13 * s, 0.98 * s, 0.03, 0.03), plastic(COAT_D), 0, d.chestY, fz(d.chestY) + 0.005, 0, 1, 1, 1);
        for (const y of [0.55, 0.98]) rbox(b, 0, y * s, fz(y * s) + 0.035, 0.12 * s, 0.05 * s, 0.05, 0, 0, 0, C.black);
        // radio clipped on the left of the chest
        b.box(0.31 * s, 0.86 * s, fz(0.9 * s) + 0.03, 0.15 * s, 0.24 * s, 0.09 * s, 0x1b1b1e);
        b.box(0.31 * s, 1.0 * s, fz(1.0 * s) + 0.075, 0.1 * s, 0.05 * s, 0.03, 0x50555a);
        rod(b, [0.36 * s, 1.1 * s, fz(1.1 * s) + 0.06], [0.36 * s, 1.36 * s, fz(1.1 * s) + 0.06], 0.022 * s, 0x1b1b1e, 6);
        b.sphere(0.36 * s, 1.37 * s, fz(1.1 * s) + 0.06, 0.035 * s, 0xff3020);
        // red hose over the right shoulder, across the chest to a brass coupling at the left hip
        const HR = 0.062 * s, hp = [[-0.36 * s, 1.0 * s, -0.12 * s], [-0.37 * s, 1.03 * s, 0.1 * s]];
        for (let i = 0; i <= 4; i++) { const u = i / 4, y = lerp(0.95, 0.36, u) * s; hp.push([lerp(-0.33, 0.3, u) * s, y, fz(y) + HR * 0.75]); }
        for (let i = 0; i < hp.length - 1; i++) { rod(b, hp[i], hp[i + 1], HR, HOSE, 10); b.sphere(...hp[i + 1], HR, HOSE); }
        const h2 = hp[hp.length - 1];
        trod(b, h2, [h2[0] + 0.06 * s, h2[1] - 0.07 * s, h2[2]], HR * 1.3, HR * 1.3, BRASS, 10);
        // tall stand-up collar
        b.cyl(0, d.neckY - 0.13 * s, 0, 0.31 * s, 0.17 * s, COAT, { seg: 16 });
        b.cyl(0, d.neckY + 0.03 * s, 0, 0.32 * s, 0.03 * s, 0xd8f040, { seg: 16 });
        // back: name band "CHIEF", air tank with a red valve, fire axe strapped across
        b.box(0, 0.86 * s, -fz(0.86 * s) - 0.03, 0.5 * s, 0.5 * s, 0.05, 0x2a2a30);
        const tz = -fz(0.8 * s) - 0.2 * s;
        b.cyl(0, 0.56 * s, tz, 0.17 * s, 0.5 * s, 0xd4d8dc, { seg: 14 });
        geoM(b, domeGeo(), 0xd4d8dc, 0, 1.06 * s, tz, 0, 0, 0, 0.17 * s, 0.1 * s, 0.17 * s);
        b.cyl(0, 0.78 * s, tz, 0.175 * s, 0.05 * s, RED, { seg: 14 });
        b.cyl(0, 0.49 * s, tz, 0.13 * s, 0.08 * s, 0x50555a, { seg: 12 });
        b.sphere(0.12 * s, 0.52 * s, tz - 0.1 * s, 0.06 * s, RED);
      },
      arm: (ab, sd, d) => {
        const s = d.s, k = Math.sqrt(d.W);
        // reflective band on the sleeve, dark cuff, black glove gauntlet
        ab.cyl(0, -0.36 * s, 0, 0.16 * s * k * 0.9, 0.1 * s, 0xd8f040, { seg: 12 });
        ab.cyl(0, -0.33 * s, 0, 0.165 * s * k * 0.9, 0.035 * s, 0xe8ecf0, { seg: 12 });
        ab.cyl(0, -0.54 * s, 0, 0.15 * s * k * 0.9, 0.06 * s, COAT_D, { seg: 12 });
        ab.add(frustum(1.25, 1, 10), plastic(GLOVE), 0, -0.6 * s, 0, 0, 0.12 * s, 0.1 * s, 0.12 * s);
        // shoulder patch: a red maltese-ish badge on the outside of each sleeve
        rbox(ab, sd * 0.17 * s, -0.12 * s, 0, 0.03, 0.13 * s, 0.13 * s, 0, 0, 0, RED);
        rbox(ab, sd * 0.18 * s, -0.12 * s, 0, 0.03, 0.06 * s, 0.06 * s, PI / 4, 0, 0, BRASS);
      },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH, y0 = h * 0.8;
        // copper bob under the helmet and curls framing the face
        hb.cyl(0, h * 0.18, -r * 0.22, r * 1.08, h * 0.66, HAIR, { seg: 16 });
        for (const sd of [-1, 1]) {
          hb.sphere(sd * r * 0.9, h * 0.5, r * 0.4, 0.075, HAIR, { sy: 1.9 });
          hb.sphere(sd * r * 0.96, h * 0.25, r * 0.1, 0.085, HAIR, { sy: 1.5 });
          hb.sphere(sd * r * 0.7, h * 0.12, -r * 0.85, 0.13, HAIR, { sy: 1.1 });
        }
        hb.sphere(0, h * 0.12, -r * 1.05, 0.14, HAIR, { sy: 1.1 });
        // the helmet: a big tall dome with raised ribs
        const DX = r * 1.34, DY = r * 1.3, DZ = r * 1.42;
        geoM(hb, domeGeo(), RED, 0, y0, 0, 0, 0, 0, DX, DY, DZ);
        const arc = floGeo('floArc', () => new THREE.TorusGeometry(1, 0.05, 5, 14, PI));
        for (const k of [0, -0.5, 0.5, -0.82, 0.82]) {
          const q = Math.sqrt(1 - k * k) * 1.02;
          geoM(hb, arc, RED, k * DX, y0, 0, 0, PI / 2, 0, DZ * q, DY * q, 0.75);
        }
        hb.box(0, y0 + DY * 0.96, -DZ * 0.2, 0.08, 0.08, DZ * 1.1, 0xa01208);
        // brim: brass-edged, short in front, long at the back, with the classic tail
        hb.cyl(0, y0 - 0.03, -r * 0.55, r * 1.72, 0.04, BRASS, { seg: 28, rz: r * 2.15 });
        hb.cyl(0, y0 - 0.02, -r * 0.55, r * 1.64, 0.05, RED, { seg: 28, rz: r * 2.07 });
        rbox(hb, 0, y0 - 0.1, -r * 2.75, r * 2.2, 0.05, r * 0.85, -0.5, 0, 0, RED);
        rbox(hb, 0, y0 - 0.128, -r * 2.78, r * 2.28, 0.04, r * 0.9, -0.5, 0, 0, BRASS);
        // brass eagle on top of the frontpiece
        const ey = y0 + DY * 0.95, ez = DZ * 0.6;
        hb.sphere(0, ey, ez, 0.065, BRASS);
        hb.sphere(0, ey + 0.08, ez + 0.03, 0.04, BRASS);
        for (const sd of [-1, 1]) rbox(hb, sd * 0.1, ey + 0.04, ez, 0.16, 0.05, 0.04, 0, 0, sd * 0.55, BRASS);
      },
    });
    const s = rig.dims.s, d = rig.dims, r = d.headR, h = d.headH;
    // the frontpiece shield (printed decal), tilted back against the dome
    const shield = new THREE.Mesh(floGeo('floPlane', () => new THREE.PlaneGeometry(1, 1)), floShieldMat());
    shield.scale.set(0.46, 0.56, 1);
    shield.position.set(0, h * 0.8 + r * 0.66, r * 1.36);
    shield.rotation.x = -0.32;
    rig.head.add(shield);
    const shieldBack = new THREE.Mesh(shield.geometry, floShieldMat(true));
    shieldBack.rotation.y = PI; shieldBack.position.z = -0.004; shield.add(shieldBack);
    // "CHIEF" across the back of the coat, under the tank
    const [bw, bd] = floAt(d, 0.33 * s);
    const back = new THREE.Mesh(floGeo('floPlane', () => new THREE.PlaneGeometry(1, 1)), floBackMat());
    back.scale.set(bw * 0.86, 0.17 * s, 1);
    back.position.set(0, 0.375 * s, -bd / 2 - 0.038);
    back.rotation.set(-0.025, PI, 0);
    rig.torso.add(back);
    // fire axe strapped diagonally across the back, head up by the left shoulder
    prop(rig.torso, (b) => floAxe(b, 1.4), { x: -0.32 * s, y: 0.24 * s, z: -floAt(d, 0.8 * s)[1] / 2 - 0.42 * s, rz: -0.6, name: 'flo-axe' });
    const g = grip(rig.armR, s);
    const noz = prop(g, nozzle, { name: 'flo-nozzle', visible: false });
    // water jet: arcs out of the nozzle and falls (built for a 60° aim), plus splashes
    const jet = fxg(g, { y: 0.42 });
    const W = 0x3aa8ff;
    const jb = new BrickBuilder(1);
    const A = 0.85, L = 3.2, G = 1.5;
    let prev = [0, 0, 0];
    for (let i = 1; i <= 8; i++) {
      const u = i / 8, gy = -Math.cos(A) * G * u * u, gz = Math.sin(A) * G * u * u;
      const p = [0, L * u + gy, gz];
      rod(jb, prev, p, 0.07 + u * 0.1, fxMat(W, 0.8), 8); prev = p;
    }
    jet.add(jb.build({ name: 'flo-jet' }));
    const splash = fxg(jet, { y: prev[1], z: prev[2] }); puffs(splash, fxMat(0xd8f4ff, 0.7), 9, 0.4, 0.09, 13);
    // victory fountain: a straight jet and a falling shower
    const fount = fxg(g, { y: 0.42 });
    const fm = new THREE.Mesh(frustum(1.6, 1, 10), fxMat(W, 0.55)); fm.scale.set(0.07, 1.6, 0.07); fount.add(fm);
    const rain = fxg(fount, { y: 1.6, visible: true }); puffs(rain, fxMat(0xd8f4ff, 0.75), 14, 0.9, 0.06, 17, { flat: 0.3 });
    finish(rig, 1.35);
    rig.fx = (n, f, t) => {
      const spray = n === 'cheer' || n === 'use', ftn = n === 'win';
      vis(noz, spray || ftn || n === 'throwF');
      if (spray || ftn) hold(g, rig.armR, spray ? A : 0.05);
      vis(jet, spray && (n === 'use' || f > 0.12));
      if (spray) { const k = n === 'use' ? 1 : sm(seg(f, 0.12, 0.3)); jet.scale.set(1, k, 1); splash.scale.setScalar(0.8 + S(t * 30) * 0.2); splash.rotation.y = t * 5; }
      vis(fount, ftn);
      if (ftn) { const k = (t * 1.5) % 1; rain.position.y = 1.6 - k * 1.2; rain.scale.set(0.5 + k * 1.1, 1, 0.5 + k * 1.1); rain.rotation.y = t * 2; }
    };
    return rig;
  },
};

// ============================================================================ Wizard Wendel
// Very tall bent hat, beard to his lap, bell sleeves, a gnarled staff with a glowing crystal.
const wendel = {
  voice: { kind: 'human', pitch: 0.78 }, style: { cheer: 'point', win: 'both', trick: 'twist' },
  gestures: {
    // staff raised, free hand weaving the spell
    cheer: (f, t) => ({ lx: -1.75 - bump(f, 0.2, 0.9) * 0.15, lz: 0.2, rx: -1.45 + S(t * 9) * 0.3, rz: -0.25 + CO(t * 9) * 0.35, hx: -0.3, tx: -0.12, by: bump(f, 0.25, 0.6) * 0.06 }),
    // conjuring fireworks round his hat, both arms up
    win: (f, t) => ({ lx: -1.9, lz: 0.35, rx: -2.9 + S(t * 7) * 0.15, rz: -0.35, hx: -0.4, ty: S(f * PI * 2) * 0.2, by: abs(S(t * 5)) * 0.05 }),
    taunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.2, ty: a.tauntSide * 0.35, rx: -1.7, rz: S(t * 18) * 0.25, hx: S(t * 9) * 0.1 }),
  },
  build() {
    const ROBE = 0x6a1b9a, HAT = 0x1b2e7a, GOLD = 0xf2cd37, BEARD = 0xf4f4f4;
    const rig = fig({
      name: 'wendel', s: 1.24, wide: 0.92, deep: 1.0, headR: 0.29, headH: 0.48,
      torso: ROBE, legs: 0x0a3463, arms: ROBE, hands: SKIN, skin: SKIN,
      face: face('wendel', SKIN, (P) => {
        for (const sd of [-1, 1]) { P.curve(sd * 26, -6, sd * 17, -16, sd * 8, -6, '#1b1b1b', 5); P.ell(sd * 30, 8, 8, 5, '#f0907a'); }
        P.ell(0, 4, 9, 8, '#e8a060');
      }, 0.5),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        // stars and a moon on the robe, a gold rope belt
        const star = (x, y, k) => { for (const a of [0, PI / 2.5, -PI / 2.5]) rbox(b, x, y, fz + 0.01, 0.12 * k, 0.035 * k, 0.03, 0, 0, a, GOLD); };
        star(-0.25 * s, 0.3 * s, s); star(0.28 * s, 0.68 * s, s * 0.8); star(0.2 * s, 0.18 * s, s * 0.6);
        b.box(0, 0.18 * s, 0, 0.92 * s * d.W, 0.06 * s, 0.48 * s * d.D, GOLD);
        rod(b, [0.12 * s, 0.18 * s, fz], [0.16 * s, -0.1 * s, fz + 0.02], 0.025, GOLD, 5);
      },
      // wide bell sleeves with gold hems
      arm: (ab, sd, d) => {
        const s = d.s;
        ab.add(taperGeo(0.44, 0.26, 0.26, 0.44, 0.26), plastic(ROBE), 0, -0.62 * s, 0, 0, s, s, s);
        ab.cyl(0, -0.63 * s, 0, 0.22 * s, 0.04 * s, GOLD, { seg: 12 });
      },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        // long white hair, bushy brows, moustache and a beard to his lap
        hb.cyl(0, h * 0.05, -r * 0.35, r * 1.05, h * 0.8, BEARD, { seg: 14 });
        for (const sd of [-1, 1]) {
          rbox(hb, sd * 0.13, h * 0.7, r * 0.98, 0.18, 0.07, 0.08, 0, 0, sd * -0.25, BEARD);
          rbox(hb, sd * 0.13, h * 0.26, r * 1.02, 0.26, 0.09, 0.1, 0, 0, sd * 0.45, BEARD);
        }
        hb.add(taperGeo(0.1, 0.62, 1.05, 0.14, 0.3), plastic(BEARD), 0, -0.82, r * 0.68 + 0.12, 0, 1, 1, 1);
        hb.sphere(0, -0.86, r * 0.78 + 0.12, 0.07, BEARD);
        hb.sphere(0, h * 0.42, r * 1.0, 0.065, 0xf0a878);
        // the hat: huge brim, tall cone, bent tip, stars
        const y0 = h * 0.82;
        hb.cyl(0, y0, 0, r * 1.95, 0.05, HAT, { seg: 22 });
        hb.add(frustum(0.5, 1, 16), plastic(HAT), 0, y0, 0, 0, r * 1.12, 0.62, r * 1.12);
        hb.cyl(0, y0 + 0.02, 0, r * 1.14, 0.09, GOLD, { seg: 16 });
        geoM(hb, coneGeo(), HAT, 0, y0 + 0.58, -0.02, -0.75, 0, 0.2, r * 0.58, 0.5, r * 0.58);
        hb.sphere(-0.1, y0 + 0.94, -0.35, 0.05, GOLD);
        for (const [x, y, z] of [[0.2, 0.25, 0.22], [-0.17, 0.42, 0.14], [0.05, 0.36, -0.25]]) geoM(hb, cached3(), GOLD, x, y0 + y, z, 0.3, 0.5, 0, 0.055, 0.075, 0.055);
      },
    });
    const s = rig.dims.s;
    // staff in the left hand, kept upright
    const g = grip(rig.armL, s);
    const staff = prop(g, (b) => {
      const WOOD = 0x6b4422;
      const P = [[0, -0.75, 0], [0.03, -0.3, 0.02], [-0.02, 0.2, -0.01], [0.03, 0.7, 0.02], [0, 1.12, 0]];
      for (let i = 0; i < 4; i++) rod(b, P[i], P[i + 1], 0.045 - i * 0.004, WOOD, 6);
      for (const a of [0, 2.1, 4.2]) rod(b, [0, 1.1, 0], [Math.cos(a) * 0.12, 1.36, Math.sin(a) * 0.12], 0.02, WOOD, 4);
      geoM(b, cached3(), glowMat(0x5af0ff, 2.6), 0, 1.33, 0, 0, 0.3, 0, 0.11, 0.17, 0.11);
    }, { name: 'wendel-staff' });
    const halo = ball(staff, 0x5af0ff, 0.22, 0, 1.33, 0, 0.35);
    const burst = fxg(staff, { y: 1.33 }); sparkles(burst, 0xbff8ff, 12, 0.55, 0.07, 9, { flat: 1 });
    const burst2 = fxg(burst); sparkles(burst2, 0xffe070, 8, 0.4, 0.06, 4, { flat: 1 });
    // win: a spiral of stars round the hat
    const fw = fxg(rig.root, { y: 2.6 });
    sparkles(fw, 0xff8af0, 10, 0.9, 0.09, 31, { flat: 0.2 }); sparkles(fw, 0xfff070, 10, 0.65, 0.08, 33, { flat: 0.6 });
    rig.idle = () => { hold(g, rig.armL, 0.15); };
    finish(rig, 1.2);
    rig.fx = (n, f, t) => {
      halo.scale.setScalar(0.22 * (1 + S(t * 4) * 0.12) * (n === 'cheer' ? 1 + bump(f, 0.2, 1) * 1.4 : n === 'win' ? 1.6 : 1));
      const b = n === 'cheer' && f > 0.22;
      vis(burst, b);
      if (b) { const k = seg(f, 0.22, 1); burst.scale.setScalar(0.4 + sm(k) * 2.2); burst.rotation.set(t * 2, t * 4, 0); burst2.rotation.y = -t * 7; }
      vis(fw, n === 'win');
      if (n === 'win') { fw.rotation.y = t * 2.5; const k = 1 + S(t * 5) * 0.15; fw.scale.set(k, 1, k); }
    };
    return rig;
  },
};
const cached3 = oct;

export default { bob, ava, redbeard, kara, rex, nix, flo, wendel };
