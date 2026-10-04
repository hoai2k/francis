// Brick Kart Originals, part 2: Pepper, Cassie, Bjorn, Regina, Zorp, Max.
import {
  THREE, BrickBuilder, C, plastic, rbox, rod, taperGeo, glowMat, cached, S, CO, PI, abs, UP,
  seg, sm, lerp, bump, winF, vis, face, fxMat, clear, prop, fxg, grip, hold, ball, ring, puffs, sparkles,
  finish, loFig, lo, domeGeo, frustum, trod, ybox, geoM, torusGeo, coneGeo, sphGeo,
} from './classic-kit.js';

const fig = (o) => loFig({ noStud: true, ...o });
const SKIN = C.fig;
const frontZ = (d) => 0.225 * d.D * d.s;
const backZ = (d) => -0.225 * d.D * d.s;

// ============================================================================ Chef Pepper
// Short and round: towering toque, handlebar moustache, frying pan with a flipping egg.
function pan(b) {
  const IRON = 0x2a2d32;
  b.box(0, -0.03, -0.05, 0.06, 0.05, 0.45, 0x6b4422);
  b.cyl(0, -0.05, 0.6, 0.32, 0.05, IRON, { seg: 18 });
  geoM(b, torusGeo(0.12, 22), IRON, 0, 0.0, 0.6, PI / 2, 0, 0, 0.31);
  rbox(b, 0, -0.02, 0.24, 0.05, 0.04, 0.14, 0, 0, 0, IRON);
}
const pepper = {
  voice: { kind: 'human', pitch: 1.2 }, style: { cheer: 'clap', win: 'clap', trick: 'twist' },
  gestures: {
    // flip! the egg goes sky-high and lands back in the pan
    cheer: (f, t) => {
      const flick = bump(f, 0.16, 0.3);
      return { rx: -1.3 - flick * 0.55, rz: 0.15, lx: -0.35, lz: 0.65, hx: -0.5 * bump(f, 0.2, 0.85), tx: -0.08 * flick, by: flick * 0.06, hy: -0.1 };
    },
    // flipping again and again, with a chef's kiss in between
    win: (f, t) => {
      const flick = bump(f, 0.1, 0.24);
      return { rx: -1.3 - flick * 0.55, rz: 0.15, lx: -2.35 + bump(f, 0.55, 0.85) * 0.3, lz: -0.55, hx: -0.45 * bump(f, 0.12, 0.7), by: abs(S(t * 8)) * 0.05, ty: S(f * PI * 2) * 0.12 };
    },
  },
  build() {
    const WHITE = 0xf4f4f4, MOU = 0x2a1a10;
    const rig = fig({
      name: 'pepper', s: 1.1, wide: 1.45, deep: 1.48, headR: 0.34, headH: 0.5,
      torso: WHITE, legs: 0x30343a, arms: WHITE, hands: SKIN, skin: SKIN,
      face: face('pepper', SKIN, (P) => {
        for (const sd of [-1, 1]) { P.curve(sd * 28, -6, sd * 18, -18, sd * 8, -6, '#1b1b1b', 6); P.ell(sd * 32, 8, 10, 7, '#f0806a'); P.line([[sd * 8, -26], [sd * 28, -28]], '#2a1a10', 6); }
        P.mouth(20, 15, 'open');
      }, 0.47),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        // round belly, double-breasted buttons, red neckerchief, apron string
        b.sphere(0, 0.42 * s, 0.12 * s, 0.5 * s, WHITE, { sy: 0.92 });
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) b.sphere(sd * 0.17 * s, (0.42 + i * 0.16) * s, fz + 0.17 * s - i * 0.04 * s, 0.045 * s, 0x30343a);
        b.cyl(0, d.neckY - 0.12 * s, 0, 0.24 * s, 0.1 * s, C.red, { seg: 14 });
        rbox(b, 0, d.neckY - 0.22 * s, 0.21 * s, 0.24 * s, 0.2 * s, 0.05, 0.3, 0, PI / 4, C.red);
        b.box(0, 0.1 * s, 0, 1.08 * s * d.W * 0.95, 0.06 * s, 0.75 * s, 0xe6e6e6);
        // the pan, strapped on his back
      },
      arm: (ab, sd, d) => { const s = d.s; ab.cyl(0, -0.5 * s, 0, 0.15 * s, 0.07 * s, 0xe0e0e0, { seg: 10 }); },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        // curly handlebar moustache
        for (const sd of [-1, 1]) {
          hb.sphere(sd * 0.11, h * 0.38, r * 0.98, 0.08, MOU, { sy: 0.75 });
          hb.sphere(sd * 0.21, h * 0.42, r * 0.9, 0.06, MOU);
          hb.sphere(sd * 0.27, h * 0.52, r * 0.82, 0.045, MOU);
        }
        hb.sphere(0, h * 0.46, r * 1.0, 0.07, 0xf0a070);
        // towering toque: band, tall crown, puffed top
        hb.cyl(0, h * 0.82, 0, r * 1.06, 0.2, WHITE, { seg: 18 });
        hb.add(frustum(1.25, 1, 18), plastic(WHITE), 0, h * 0.82 + 0.2, 0, 0, r * 1.06, 0.5, r * 1.06);
        const yt = h * 0.82 + 0.72;
        hb.sphere(0, yt + 0.06, 0, r * 1.05, WHITE, { sy: 0.6 });
        for (let k = 0; k < 6; k++) { const a = (k / 6) * PI * 2; hb.sphere(Math.sin(a) * r * 0.95, yt, Math.cos(a) * r * 0.95, r * 0.5, WHITE, { sy: 0.8 }); }
      },
    });
    const s = rig.dims.s;
    const back = prop(rig.torso, pan, { y: 0.42 * s, z: backZ(rig.dims) - 0.12 * s - 0.05, rx: -PI / 2 - 0.3, name: 'pepper-pan-back' });
    const g = grip(rig.armR, s);
    const inHand = prop(g, pan, { name: 'pepper-pan', visible: false });
    const egg = prop(inHand, (b) => { b.sphere(0, 0, 0, 0.2, C.white, { sy: 0.18 }); b.sphere(0.03, 0.02, 0.02, 0.08, 0xffb020, { sy: 0.6 }); }, { y: 0.03, z: 0.6, name: 'egg' });
    const steam = fxg(inHand, { y: 0.3, z: 0.6 }); puffs(steam, 0xffffff, 6, 0.25, 0.08, 19, { up: 0.5 });
    finish(rig, 1.5);
    rig.fx = (n, f, t) => {
      const on = n === 'cheer' || n === 'win' || n === 'throwF' || n === 'use';
      vis(inHand, on); vis(back, !on);
      if (!on) return;
      hold(g, rig.armR, 0);
      const ff = n === 'win' ? winF(t) : f, k = seg(ff, n === 'win' ? 0.14 : 0.22, n === 'win' ? 0.8 : 0.85);
      egg.position.y = 0.03 + 4 * k * (1 - k) * 1.5;
      egg.rotation.x = k * PI * 4;
      vis(steam, n === 'win');
      if (n === 'win') { const u = (t * 1.2) % 1; steam.position.y = 0.2 + u * 0.6; steam.scale.setScalar(0.6 + u); }
    };
    return rig;
  },
};

// ============================================================================ Cowgirl Cassie
// Huge curled-brim hat, long braids, fringed vest, a lasso that spins over her head.
const cassie = {
  voice: { kind: 'human', pitch: 1.3 }, style: { cheer: 'wave', win: 'wave', trick: 'arms' },
  gestures: {
    // yee-haw: lasso whirling overhead, riding the bucking kart
    cheer: (f, t) => ({ rx: -2.95 + S(t * 14) * 0.05, rz: 0.15 * CO(t * 14), lx: -1.25, lz: 0.55, hx: -0.35, hy: -0.2, by: abs(S(t * 9)) * 0.07, tx: S(t * 9) * 0.05 }),
    // the big loop: the lasso spins round the whole kart
    win: (f, t) => ({ rx: -2.6 + S(t * 12) * 0.05, rz: -0.3 + CO(t * 12) * 0.1, lx: -0.9, lz: 1.1, hx: -0.2, hy: S(t * 4) * 0.3, by: abs(S(t * 9)) * 0.06 }),
  },
  build() {
    const SHIRT = 0xc91a09, VEST = 0x7c503a, HAT = 0x8a5a3a, HAIR = 0xd08a2c, ROPE = 0xd8b878;
    const rig = fig({
      name: 'cassie', s: 1.25, wide: 1.02, deep: 1.0, headR: 0.3, headH: 0.48,
      torso: SHIRT, legs: 0x2a4a8a, arms: SHIRT, hands: 0x8a5a3a, skin: SKIN,
      face: face('cassie', SKIN, (P) => {
        P.eyes(17, -6, 7, 10);
        for (const sd of [-1, 1]) { P.line([[sd * 9, -23], [sd * 26, -25]], '#7a4a10', 5); for (const k of [0, 1, 2]) P.ell(sd * (24 + k * 6), 8 + (k % 2) * 4, 2, 2, '#b06a30'); }
        P.mouth(14, 16, 'grin');
      }, 0.5),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        // plaid lines, open fringed vest, sheriff star, belt, bandana, lasso coil
        for (const x of [-0.18, 0, 0.18]) b.box(x * s, 0.18 * s, fz - 0.01, 0.025 * s, 0.82 * s, 0.03, 0x8a0f0a);
        for (const y of [0.4, 0.65]) b.box(0, y * s, fz - 0.01, 0.4 * s, 0.025 * s, 0.03, 0x8a0f0a);
        for (const sd of [-1, 1]) {
          b.box(sd * 0.3 * s, 0.2 * s, 0.01, 0.28 * s, 0.8 * s, 0.47 * s, VEST);
          for (let k = 0; k < 4; k++) b.box(sd * (0.2 + k * 0.06) * s, 0.06 * s, fz + 0.01, 0.025 * s, 0.14 * s, 0.03, VEST);
        }
        for (let k = 0; k < 3; k++) rbox(b, 0.3 * s, 0.68 * s, fz + 0.03, 0.14 * s, 0.035 * s, 0.02, 0, 0, (k * PI) / 3, 0xf2cd37);
        b.box(0, 0.14 * s, 0, 0.95 * s * d.W, 0.1 * s, 0.5 * s * d.D, 0x3a2a1a);
        b.box(0, 0.13 * s, fz + 0.02, 0.16 * s, 0.12 * s, 0.04, 0xc8ccd0);
        b.cyl(0, d.neckY - 0.12 * s, 0, 0.23 * s, 0.1 * s, 0x2a6ad0, { seg: 14 });
        rbox(b, 0, d.neckY - 0.2 * s, 0.2 * s, 0.2 * s, 0.2 * s, 0.04, 0.25, 0, PI / 4, 0x2a6ad0);
        geoM(b, torusGeo(0.22, 16), ROPE, -0.52 * s * d.W, 0.2 * s, 0.05, 0, PI / 2, 0, 0.17 * s);
      },
      arm: (ab, sd, d) => { const s = d.s; ab.cyl(0, -0.52 * s, 0, 0.14 * s, 0.05 * s, 0xf4f4f4, { seg: 10 }); },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        // long braids over the shoulders
        hb.cyl(0, h * 0.25, -r * 0.3, r * 1.04, h * 0.6, HAIR, { seg: 14 });
        for (const sd of [-1, 1]) {
          for (let k = 0; k < 6; k++) hb.sphere(sd * (r * 0.95 + k * 0.012), h * 0.35 - k * 0.11, r * 0.2 + k * 0.035, 0.075 - k * 0.004, HAIR);
          hb.cyl(sd * (r * 0.95 + 0.07), h * 0.35 - 0.7, r * 0.2 + 0.21, 0.05, 0.05, 0x2a6ad0, { seg: 8 });
        }
        // the hat: crown with a pinch, band, huge brim curled up at the sides
        const y0 = h * 0.82;
        hb.cyl(0, y0, 0, r * 2.05, 0.04, HAT, { seg: 22, rz: r * 1.75 });
        for (const sd of [-1, 1]) ybox(hb, sd * r * 1.75, y0 + 0.1, 0, r * 0.75, 0.04, r * 2.6, 0, 0, sd * 0.65, HAT);
        hb.cyl(0, y0, 0, r * 1.02, 0.36, HAT, { seg: 16 });
        hb.cyl(0, y0 + 0.02, 0, r * 1.05, 0.08, 0x3a2a1a, { seg: 16 });
        hb.box(0, y0 + 0.34, 0, 0.05, 0.06, r * 1.4, 0x6a4028);
        geoM(hb, domeGeo(), HAT, 0, y0 + 0.36, 0, 0, 0, 0, r * 1.02, r * 0.25, r * 1.02);
        hb.sphere(0, y0 + 0.06, r * 1.04, 0.04, 0xc8ccd0);
      },
    });
    const s = rig.dims.s, d = rig.dims;
    // lasso: a tilt pivot, a spinner, the loop and the rope to the hand
    const lasso = fxg(rig.torso, { x: -d.shoulderX * 0.8, y: d.shoulderY + 1.05 * s, z: 0.12 });
    const spin = new THREE.Group(); lasso.add(spin);
    const loop = ring(spin, plastic(ROPE), 0.6, 0.045, 28); loop.position.x = 0.0;
    const rope = prop(spin, (b) => { rod(b, [0.6, 0, 0], [0.04, -0.5, 0], 0.025, ROPE, 5); rbox(b, 0.6, 0, 0, 0.08, 0.08, 0.08, 0, 0, 0, ROPE); }, { name: 'lasso-rope' });
    finish(rig, 1.3);
    rig.fx = (n, f, t) => {
      const ch = n === 'cheer' && f > 0.06, win = n === 'win';
      vis(lasso, ch || win);
      if (!(ch || win)) return;
      spin.rotation.y = t * 13;
      if (win) {
        lasso.position.set(0, 0.85 + S(t * 3) * 0.15, -0.1);
        lasso.rotation.set(S(t * 2) * 0.06, 0, CO(t * 2) * 0.06);
        loop.scale.setScalar(1.85); vis(rope, false);
      } else {
        lasso.position.set(-d.shoulderX * 0.8, d.shoulderY + 1.05 * s, 0.12);
        lasso.rotation.set(0.12 + S(t * 7) * 0.08, 0, -0.12 + CO(t * 7) * 0.08);
        const k = sm(seg(f, 0.06, 0.2));
        loop.scale.setScalar(0.6 * k + 0.05); rope.scale.setScalar(k); vis(rope, true);
      }
    };
    return rig;
  },
};

// ============================================================================ Viking Bjorn
// The biggest racer: horned helm, braided beard that roars open, fur mantle, shield and axe.
const bjorn = {
  voice: { kind: 'deep', pitch: 0.72 }, style: { cheer: 'roar', win: 'roar', trick: 'arms' },
  gestures: {
    // axe to the sky and a mighty roar
    cheer: (f, t) => ({ rx: -2.95, rz: -0.12, lx: -0.7, lz: 1.35, jaw: 1, hx: -0.55, tx: -0.2, tz: S(t * 40) * 0.05, by: abs(S(t * 20)) * 0.03 }),
    // both arms pumping, roaring with laughter
    win: (f, t) => ({ rx: UP + S(t * 8) * 0.35, rz: -0.3, lx: UP - S(t * 8) * 0.35, lz: 0.3, jaw: 0.7 + S(t * 16) * 0.3, hx: -0.45, by: abs(S(t * 8)) * 0.08 }),
    taunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.1, ty: a.tauntSide * 0.4, lx: -0.6, rx: -0.6, lz: 1.5, rz: -1.5, jaw: 0.8, hx: -0.2 }),
  },
  build() {
    const TUNIC = 0x7c3a1a, FUR = 0x8a7258, STEEL = 0xa8aeb4, BEARD = 0xe08a1e, IVORY = 0xf0e6c8;
    const rig = fig({
      name: 'bjorn', s: 1.58, wide: 1.2, deep: 1.28, headR: 0.31, headH: 0.48,
      torso: TUNIC, legs: 0x4a4e52, arms: SKIN, hands: SKIN, skin: SKIN,
      face: face('bjorn', SKIN, (P) => {
        P.eyes(17, -8, 6, 8);
        P.line([[-34, -26], [-8, -16]], '#a05a10', 9); P.line([[34, -26], [8, -16]], '#a05a10', 9);
        P.ell(0, 26, 22, 14, '#3a0a0a'); P.rect(-16, 14, 32, 6, '#fff');
        for (const sd of [-1, 1]) P.ell(sd * 32, 6, 8, 5, '#e8806a');
      }, 0.49),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d), bz = backZ(d);
        // fur mantle over the shoulders, belt with a gold knot buckle
        for (let k = 0; k < 7; k++) { const a = (k / 6 - 0.5) * PI * 1.25; b.sphere(Math.sin(a) * 0.36 * s * d.W, d.shoulderY + 0.02 * s, Math.cos(a) * -0.1 * s - 0.04 * s, 0.17 * s, FUR, { sy: 0.7 }); }
        b.box(0, d.shoulderY - 0.12 * s, bz - 0.02, 0.7 * s * d.W, 0.24 * s, 0.1 * s, FUR);
        b.box(0, 0.14 * s, 0, 0.95 * s * d.W, 0.12 * s, 0.5 * s * d.D, 0x2a1a10);
        b.sphere(0, 0.2 * s, fz + 0.03, 0.08 * s, 0xe6b53a);
        rbox(b, 0, 0.55 * s, fz, 0.07 * s, 0.9 * s, 0.03, 0, 0, 0.6, 0x3a2a1a);
        // round shield on the back: red with a white band and steel boss
        rod(b, [0, 0.55 * s, bz - 0.05], [0, 0.55 * s, bz - 0.12], 0.56 * s, 0xb81a10, 20);
        rod(b, [0, 0.55 * s, bz - 0.12], [0, 0.55 * s, bz - 0.13], 0.48 * s, 0xf4f4f4, 20);
        rod(b, [0, 0.55 * s, bz - 0.13], [0, 0.55 * s, bz - 0.14], 0.38 * s, 0xb81a10, 20);
        b.sphere(0, 0.55 * s, bz - 0.14, 0.12 * s, STEEL, { sy: 1 });
      },
      // bare arms with steel bracers and a fur cuff
      arm: (ab, sd, d) => { const s = d.s; ab.sphere(0, -0.02 * s, 0, 0.17 * s, TUNIC); ab.cyl(0, -0.52 * s, 0, 0.15 * s, 0.18 * s, STEEL, { seg: 10 }); ab.cyl(0, -0.26 * s, 0, 0.15 * s, 0.07 * s, FUR, { seg: 10 }); },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        // helm: dome, bronze band, nose guard, ridge, horns
        geoM(hb, domeGeo(), STEEL, 0, h * 0.72, 0, 0, 0, 0, r * 1.13, r * 0.95, r * 1.13);
        hb.cyl(0, h * 0.68, 0, r * 1.15, 0.1, 0xb8862b, { seg: 18 });
        hb.box(0, h * 0.4, r * 1.07, 0.07, h * 0.36, 0.06, STEEL);
        hb.box(0, h * 0.72 + r * 0.88, 0, 0.06, 0.08, r * 1.2, 0xb8862b);
        for (const sd of [-1, 1]) {
          const P = [[r * 1.0, h * 0.75, 0], [r * 1.45, h * 0.86, 0.03], [r * 1.78, h * 1.06, 0.06], [r * 1.86, h * 1.3, 0.05], [r * 1.7, h * 1.5, 0.0]];
          const R = [0.12, 0.1, 0.075, 0.05, 0.025, 0.01];
          for (let i = 0; i < 4; i++) trod(hb, [sd * P[i][0], P[i][1], P[i][2]], [sd * P[i + 1][0], P[i + 1][1], P[i + 1][2]], R[i], R[i + 1], IVORY, 8);
          for (let i = 1; i < 4; i++) hb.sphere(sd * P[i][0], P[i][1], P[i][2], R[i], IVORY);
        }
        // bushy moustache + big nose (the beard hangs from the jaw)
        rbox(hb, 0, h * 0.36, r * 1.0, 0.5, 0.1, 0.14, 0, 0, 0, BEARD);
        for (const sd of [-1, 1]) rbox(hb, sd * 0.27, h * 0.24, r * 0.95, 0.09, 0.22, 0.1, 0, 0, sd * 0.25, BEARD);
        hb.sphere(0, h * 0.46, r * 1.0, 0.08, 0xf0a070);
        hb.cyl(0, 0, -r * 0.3, r * 1.04, h * 0.7, BEARD, { seg: 14 });
      },
    });
    const s = rig.dims.s, r = rig.dims.headR, h = rig.dims.headH;
    // the beard on a jaw pivot: roars open
    const jaw = new THREE.Group(); jaw.position.set(0, h * 0.3, r * 0.2); rig.head.add(jaw);
    prop(jaw, (b) => {
      b.add(taperGeo(0.36, 0.84, 0.82, 0.34, 0.4), plastic(BEARD), 0, -0.82, r * 0.68, 0, 1, 1, 1);
      for (const sd of [-1, 1]) {
        b.sphere(sd * 0.32, -0.05, r * 0.6, 0.18, BEARD, { sy: 1.2 });
        for (let k = 0; k < 4; k++) b.sphere(sd * 0.12, -0.9 - k * 0.11, r * 0.75, 0.075, BEARD);
        b.cyl(sd * 0.12, -1.38, r * 0.75, 0.06, 0.08, 0xe6b53a, { seg: 8 });
      }
    }, { name: 'bjorn-beard' });
    rig.jaw = jaw; rig.jawOpen = 0.45;
    // axe in hand
    const g = grip(rig.armR, s);
    const axe = prop(g, (b) => {
      rod(b, [0, -0.45, 0], [0, 1.1, 0], 0.05, 0x6b4422, 8);
      for (const k of [0, 1, 2]) b.cyl(0, -0.2 + k * 0.08, 0, 0.06, 0.04, 0x2a1a10, { seg: 8 });
      // flared double blades with bright edges
      for (const sd of [-1, 1]) {
        geoM(b, taperGeo(0.2, 0.62, 0.42, 0.06, 0.03), STEEL, sd * 0.04, 0.86, 0, 0, 0, -sd * PI / 2, 1);
        rbox(b, sd * 0.47, 0.86, 0, 0.04, 0.64, 0.035, 0, 0, 0, 0xe8eef4);
      }
      b.cyl(0, 1.05, 0, 0.07, 0.1, STEEL, { seg: 8 });
    }, { name: 'bjorn-axe', rz: 0.24 });
    rig.idle = (t, dt, an, st) => { hold(g, rig.armR, 0.3); axe.rotation.z = an.g?.name === 'cheer' || st.phase === 'win' ? 0.05 : 0.24; };
    finish(rig, 1.9);
    return rig;
  },
};

// ============================================================================ Queen Regina
// Tall crown with glowing jewels, ermine collar, a long velvet cape that streams, a sceptre.
const regina = {
  voice: { kind: 'human', pitch: 1.45 }, style: { cheer: 'wave', win: 'wave', trick: 'twist' },
  gestures: {
    // the royal wave: dainty, slow, sceptre held high
    cheer: (f, t) => ({ lx: -2.35, lz: 0.22 + S(t * 7) * 0.22, rx: -1.95, rz: 0.12, hz: 0.15, hx: -0.15, hy: -0.15 }),
    // sceptre aloft blazing light, chin up, a slow regal turn
    win: (f, t) => ({ rx: -2.95, rz: -0.1, lx: -2.2, lz: 0.3 + S(t * 7) * 0.2, hx: -0.35, ty: S(f * PI * 2) * 0.25 }),
    // nose in the air, turned away
    taunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.3, hx: -0.45, ty: a.tauntSide * 0.3, lx: -1.3, lz: -0.45, hz: -a.tauntSide * 0.1 }),
  },
  build() {
    const GOWN = 0xa02a7a, GOLD = 0xf2c230, CAPE = 0x6a0a2a, ERM = 0xf8f6f0, HAIR = 0x7a2e12;
    const rig = fig({
      name: 'regina', s: 1.3, wide: 0.86, deep: 0.88, headR: 0.28, headH: 0.5,
      torso: GOWN, legs: 0xfc97ac, arms: GOWN, hands: C.white, skin: SKIN,
      face: face('regina', SKIN, (P) => {
        for (const sd of [-1, 1]) {
          P.ell(sd * 16, -4, 7, 6, '#1b1b1b'); P.rect(sd * 16 - 9, -14, 18, 8, '#ffc917');
          P.line([[sd * 8, -9], [sd * 25, -9]], '#1b1b1b', 3);
          for (const k of [0, 1, 2]) P.line([[sd * (12 + k * 6), -9], [sd * (10 + k * 8), -16]], '#1b1b1b', 2);
          P.curve(sd * 6, -24, sd * 16, -30, sd * 26, -22, '#5a2010', 3);
          P.ell(sd * 28, 10, 9, 6, '#f39a8a');
        }
        P.ell(0, 20, 12, 5, '#c0102a'); P.curve(-12, 19, 0, 24, 12, 19, '#8a0a1a', 2);
        P.ell(22, 18, 2, 2, '#3a1a10');
      }, 0.57),
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        // gold bodice trim, pearl necklace, big ermine collar
        rbox(b, 0.12 * s, 0.5 * s, fz + 0.005, 0.04 * s, 0.75 * s, 0.03, 0, 0, 0.3, GOLD);
        rbox(b, -0.12 * s, 0.5 * s, fz + 0.005, 0.04 * s, 0.75 * s, 0.03, 0, 0, -0.3, GOLD);
        for (let k = 0; k < 7; k++) { const a = (k / 6 - 0.5) * 1.6; b.sphere(Math.sin(a) * 0.17 * s, d.neckY - 0.13 * s - Math.cos(a) * 0.08 * s + 0.08 * s, 0.215 * d.D * s + 0.015 + Math.cos(a) * 0.03, 0.03 * s, ERM); }
        for (let k = 0; k < 9; k++) {
          const a = (k / 8 - 0.5) * PI * 1.4 + PI;
          const x = Math.sin(a) * 0.3 * s, z = Math.cos(a) * 0.22 * s;
          b.sphere(x, d.neckY + 0.05 * s, z, 0.13 * s, ERM, { sy: 1.5 });
          if (k % 2) b.box(x + Math.sin(a) * 0.12 * s, d.neckY + 0.06 * s, z + Math.cos(a) * 0.12 * s, 0.035, 0.07, 0.035, C.black);
        }
        b.box(0, 0.14 * s, 0, 0.9 * s * d.W, 0.06 * s, 0.48 * s * d.D, GOLD);
      },
      // puffed sleeves
      arm: (ab, sd, d) => { const s = d.s; ab.sphere(0, -0.06 * s, 0, 0.19 * s, 0xfc97ac); ab.cyl(0, -0.5 * s, 0, 0.13 * s, 0.05 * s, GOLD, { seg: 10 }); },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        // auburn updo with a big bun
        hb.cyl(0, h * 0.2, -r * 0.3, r * 1.06, h * 0.8, HAIR, { seg: 14 });
        geoM(hb, domeGeo(), HAIR, 0, h * 0.85, -0.02, 0, 0, 0, r * 1.1, r * 0.7, r * 1.12);
        hb.sphere(0, h * 0.95, -r * 0.95, r * 0.6, HAIR);
        for (const sd of [-1, 1]) hb.sphere(sd * r * 0.95, h * 0.55, -r * 0.1, r * 0.32, HAIR, { sy: 1.4 });
        // crown: band, five points, velvet cap, cross; jewels glow
        const y0 = h * 0.95;
        hb.cyl(0, y0, 0, r * 0.9, 0.12, GOLD, { seg: 16 });
        geoM(hb, domeGeo(), 0x8a0a2a, 0, y0 + 0.1, 0, 0, 0, 0, r * 0.8, r * 0.9, r * 0.8);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * PI * 2;
          geoM(hb, coneGeo(), GOLD, Math.sin(a) * r * 0.86, y0 + 0.1, Math.cos(a) * r * 0.86, 0, 0, 0, 0.055, 0.24, 0.055);
          hb.sphere(Math.sin(a) * r * 0.86, y0 + 0.35, Math.cos(a) * r * 0.86, 0.035, GOLD);
          hb.sphere(Math.sin(a) * r * 0.93, y0 + 0.06, Math.cos(a) * r * 0.93, 0.035, 0, { mat: glowMat(k % 2 ? 0x3a7aff : 0xff2a4a, 1.6) });
        }
        hb.box(0, y0 + 0.1 + r * 0.9, 0, 0.04, 0.2, 0.04, GOLD);
        hb.box(0, y0 + 0.17 + r * 0.9, 0, 0.13, 0.04, 0.04, GOLD);
      },
    });
    const s = rig.dims.s, d = rig.dims;
    // the cape: hangs from the shoulders, trimmed with ermine, streams with speed
    const cape = prop(rig.torso, (b) => {
      b.add(taperGeo(1.35, 0.8, 1.25, 0.05), plastic(CAPE), 0, -1.25, 0, 0, 1, 1, 1);
      b.box(0, -1.32, 0, 1.38, 0.14, 0.09, ERM);
      for (let k = 0; k < 6; k++) b.box(-0.55 + k * 0.22, -1.28, -0.05, 0.04, 0.07, 0.02, C.black);
    }, { y: d.shoulderY + 0.06, z: backZ(d) - 0.05, name: 'regina-cape' });
    // sceptre
    const g = grip(rig.armR, s);
    const sc = prop(g, (b) => {
      rod(b, [0, -0.35, 0], [0, 0.8, 0], 0.035, GOLD, 8);
      for (const y of [-0.05, 0.3, 0.75]) b.cyl(0, y, 0, 0.06, 0.05, GOLD, { seg: 10 });
      b.sphere(0, 0.92, 0, 0.13, 0, { mat: glowMat(0x7a3aff, 1.4) });
      b.box(0, 1.03, 0, 0.035, 0.14, 0.035, GOLD); b.box(0, 1.1, 0, 0.1, 0.03, 0.03, GOLD);
    }, { name: 'sceptre' });
    const tw = fxg(sc, { y: 0.92 }); sparkles(tw, 0xffd8ff, 8, 0.35, 0.05, 41, { flat: 1 });
    const rays = fxg(sc, { y: 0.92 });
    const rb = new BrickBuilder(1);
    for (let k = 0; k < 8; k++) rbox(rb, Math.cos(k * PI / 4) * 0.55, Math.sin(k * PI / 4) * 0.55, 0, 0.9, 0.05, 0.02, 0, 0, k * PI / 4, 0, { mat: fxMat(0xfff0b0, 0.6) });
    rays.add(rb.build({ name: 'rays' }));
    rig.idle = (t, dt, an, st) => {
      const v = st.speed01 ?? 0.5;
      cape.rotation.x = 0.12 + v * 0.65 + S(t * 9) * 0.05 * v;
      hold(g, rig.armR, 0.25);
    };
    finish(rig, 1.1);
    rig.fx = (n, f, t) => {
      const tw0 = n === 'cheer' || n === 'win' || n === 'yay';
      vis(tw, tw0); if (tw0) { tw.rotation.set(t * 2, t * 3, 0); tw.scale.setScalar(1 + S(t * 6) * 0.2); }
      vis(rays, n === 'win'); if (n === 'win') { rays.rotation.z = t * 1.5; rays.scale.setScalar(0.8 + S(t * 9) * 0.2); }
      if (n === 'win') hold(g, rig.armR, 0.0);
    };
    return rig;
  },
};

// ============================================================================ Zorp the Alien
// Tiny body, huge egg head with giant eyes, wobbling antennae, tentacle arms, retro ray gun.
let zorpFace = null;
function zorpHeadMat() {
  if (zorpFace) return zorpFace;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#7ad83a'; g.fillRect(0, 0, 256, 128);
  // big glossy almond eyes, a third little eye, tiny smile, spots
  g.save(); g.translate(128, 70);
  for (const sd of [-1, 1]) {
    g.fillStyle = '#101418'; g.beginPath(); g.ellipse(sd * 20, 0, 15, 21, sd * 0.55, 0, PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sd * 20 - 4, -8, 5, 7, sd * 0.5, 0, PI * 2); g.fill();
    g.fillStyle = 'rgba(160,120,255,0.8)'; g.beginPath(); g.ellipse(sd * 22 + 3, 8, 4, 4, 0, 0, PI * 2); g.fill();
  }
  g.fillStyle = '#101418'; g.beginPath(); g.ellipse(0, -30, 6, 7, 0, 0, PI * 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-2, -32, 2, 2, 0, 0, PI * 2); g.fill();
  g.strokeStyle = '#2a4a10'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(0, 22, 7, 0.3, PI - 0.3); g.stroke();
  g.restore();
  g.fillStyle = '#5ab82a'; for (const [x, y, r] of [[40, 40, 8], [210, 50, 10], [70, 20, 5], [190, 22, 6], [10, 70, 9], [240, 90, 7]]) { g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (zorpFace = new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 }));
}
function tentacle(arm, s, sd, green) {
  arm.clear();
  const a = lo(new BrickBuilder(1));
  a.sphere(0, 0, 0, 0.13 * s, 0xcda4de);
  trod(a, [0, 0, 0], [0, -0.36 * s, 0], 0.11 * s, 0.085 * s, green, 10);
  a.sphere(0, -0.36 * s, 0, 0.085 * s, green);
  for (let k = 0; k < 2; k++) a.sphere(0, (-0.15 - k * 0.12) * s, -0.09 * s, 0.03 * s, 0x5ab82a);
  arm.add(a.build({ name: 'tentacle' }));
  const tip = new THREE.Group(); tip.position.y = -0.36 * s; arm.add(tip);
  const b = lo(new BrickBuilder(1));
  trod(b, [0, 0, 0], [0, -0.3 * s, 0.02 * s], 0.085 * s, 0.05 * s, green, 10);
  trod(b, [0, -0.3 * s, 0.02 * s], [0, -0.4 * s, 0.07 * s], 0.05 * s, 0.025 * s, green, 8);
  for (let k = 0; k < 3; k++) b.sphere(0, (-0.08 - k * 0.1) * s, -0.065 * s + k * 0.008 * s, 0.022 * s, 0xcda4de);
  tip.add(b.build({ name: 'tentacle-tip' }));
  return tip;
}
const zorp = {
  voice: { kind: 'squeak', pitch: 1.2 }, style: { cheer: 'point', win: 'spin', trick: 'twist' },
  gestures: {
    // zap! zap! the ray gun at the rival, the other tentacle waving
    cheer: (f, t) => ({ rx: -1.6 + bump(f, 0.15, 0.3) * 0.2 + bump(f, 0.5, 0.65) * 0.2, rz: 0.05, lx: -2.5, lz: 0.5 + S(t * 9) * 0.5, ty: -0.15, hx: -0.1, hz: S(t * 10) * 0.12 }),
    // spinning on the spot, blasting into the sky
    win: (f, t) => ({ ty: f * PI * 2, rx: -2.9, rz: -0.1, lx: -1.4, lz: 1.0 + S(t * 9) * 0.3, hx: -0.3, by: bump(f) * 0.15 }),
  },
  build() {
    const GREEN = 0x7ad83a, SUIT = 0xcda4de, PURP = 0x6a1b9a;
    const rig = fig({
      name: 'zorp', s: 1.05, wide: 0.95, deep: 0.95, torso: SUIT, legs: PURP, arms: SUIT, hands: GREEN, skin: GREEN,
      head: () => {},
      torsoExtra: (b, d) => {
        const s = d.s, fz = frontZ(d);
        b.box(0, 0.14 * s, 0, 0.92 * s * d.W, 0.08 * s, 0.48 * s * d.D, 0xc8ccd0);
        rod(b, [0, 0.55 * s, fz], [0, 0.55 * s, fz + 0.03], 0.12 * s, PURP, 14);
        rod(b, [0, 0.55 * s, fz + 0.03], [0, 0.55 * s, fz + 0.05], 0.07 * s, 0xff4fd8, 12);
        for (const sd of [-1, 1]) rbox(b, sd * 0.2 * s, 0.8 * s, fz, 0.05 * s, 0.4 * s, 0.03, 0, 0, sd * 0.5, PURP);
        // tall sci-fi collar fins behind the head
        for (const sd of [-1, 1]) rbox(b, sd * 0.3 * s, d.neckY + 0.12 * s, backZ(d) - 0.04, 0.05, 0.55 * s, 0.3 * s, 0.35, 0, sd * 0.45, PURP);
      },
    });
    const s = rig.dims.s;
    // the egg head (a sphere with the face wrapped round it)
    const head = new THREE.Mesh(cached('origZorpHead', () => new THREE.SphereGeometry(1, 24, 16)), zorpHeadMat());
    head.scale.set(0.54, 0.62, 0.54); head.position.y = 0.52; head.rotation.y = -PI / 2;
    rig.head.add(head);
    const ant = prop(rig.head, (b) => {
      for (const sd of [-1, 1]) {
        trod(b, [sd * 0.08, 0, 0], [sd * 0.2, 0.28, -0.02], 0.03, 0.02, GREEN, 6);
        trod(b, [sd * 0.2, 0.28, -0.02], [sd * 0.36, 0.48, 0.02], 0.02, 0.014, GREEN, 6);
        b.sphere(sd * 0.37, 0.5, 0.02, 0.07, 0, { mat: glowMat(0xff4fd8, 2.2) });
      }
    }, { y: 1.06, name: 'antennae' });
    // tentacle arms (replace the minifig arms) and the ray gun
    const tipL = tentacle(rig.armL, s, 1, GREEN), tipR = tentacle(rig.armR, s, -1, GREEN);
    const gun = prop(tipR, (b) => {
      b.box(0, -0.38 * s, -0.06, 0.05, 0.12, 0.08, PURP);
      rod(b, [0, -0.3 * s, 0.02], [0, -0.68 * s, 0.02], 0.07, 0xc8ccd0, 12);
      for (const y of [-0.38, -0.46, -0.54]) b.cyl(0, y * s, 0.02, 0.1, 0.03, 0xe6b53a, { seg: 12 });
      for (const sd of [-1, 1]) rbox(b, sd * 0.08, -0.36 * s, 0.02, 0.1, 0.12, 0.02, 0, 0, sd * 0.4, 0xc91a09);
      b.sphere(0, -0.7 * s, 0.02, 0.06, 0, { mat: glowMat(0xbbff3a, 2.4) });
    }, { name: 'raygun' });
    const zap = fxg(gun, { y: -0.72 * s, z: 0.02 });
    const beamM = new THREE.Mesh(cached('origZap', () => new THREE.CylinderGeometry(0.05, 0.11, 1, 8, 1, true).translate(0, -0.5, 0)), fxMat(0xbbff3a, 0.9));
    zap.add(beamM);
    // pulse rings along the beam + a muzzle flash, one mesh
    const rings = fxg(zap, { visible: true });
    const rb = new BrickBuilder(1), rm = fxMat(0xff6af0, 0.85);
    for (let k = 0; k < 3; k++) geoM(rb, torusGeo(0.12, 16), rm, 0, -0.6 - k * 0.9, 0, PI / 2, 0, 0, 0.16);
    rb.add(sphGeo(), rm, 0, 0, 0, 0, 0.17, 0.17, 0.17);
    rings.add(rb.build({ name: 'zap-rings' }));
    rig.idle = (t, dt, an, st) => {
      ant.rotation.z = S(t * 5.3) * 0.12; ant.rotation.x = S(t * 3.7) * 0.15 - (st.speed01 || 0) * 0.15;
      tipL.rotation.x = -0.3 + S(t * 3.1) * 0.35; tipL.rotation.z = S(t * 2.3) * 0.25;
      tipR.rotation.x = -0.3 + S(t * 2.7 + 1) * 0.35; tipR.rotation.z = -S(t * 2.1) * 0.25;
    };
    finish(rig, 1.05);
    rig.fx = (n, f, t) => {
      let k = 0;
      if (n === 'cheer') k = bump(f, 0.15, 0.4) + bump(f, 0.5, 0.75);
      else if (n === 'win') k = bump((t * 2.5) % 1, 0.1, 0.6);
      else if (n === 'use' || n === 'throwF') k = bump(f, 0.1, 0.9);
      if (n === 'cheer' || n === 'win' || n === 'use') tipR.rotation.set(0, 0, 0);
      vis(zap, k > 0.05);
      if (k > 0.05) {
        beamM.scale.set(1, 3.2 * Math.min(1, k * 1.6), 1);
        rings.scale.set(0.6 + k, 1, 0.6 + k);
      }
    };
    return rig;
  },
};

// ============================================================================ Mummy Max
// Hunched and wrapped: bandage bands, one glowing eye, trailing bandages, a scarab amulet.
const B1 = 0xe8dcc0, B2 = 0xbfae88;
function maxFace() {
  return face('max', B1, (P) => {
    for (let k = -4; k <= 4; k++) P.line([[-140, k * 15 - 6], [140, k * 15 + 6]], '#bfae88', 4);
    P.ell(-18, -8, 18, 11, '#2a1e12', 0.15); P.ell(18, -8, 16, 10, '#2a1e12', -0.1);
    P.ell(-18, -8, 5, 5, '#120c06');
    P.line([[-40, 4], [44, -2]], '#bfae88', 9);
    P.ell(0, 26, 12, 6, '#2a1e12');
  }, 0.53);
}
const max = {
  voice: { kind: 'deep', pitch: 0.7 }, style: { cheer: 'roar', win: 'spin', trick: 'arms' },
  gestures: {
    // the classic mummy: arms straight out, lurching, head lolling
    cheer: (f, t) => ({ lx: -1.6 + S(t * 6) * 0.12, rx: -1.6 + S(t * 6 + 1.5) * 0.12, lz: -0.08, rz: 0.08, tx: 0.2 + S(t * 3.5) * 0.12, hx: -0.25, hz: S(t * 3) * 0.25, ty: S(t * 3.5) * 0.15, jaw: 1 }),
    // unravelling spin, bandages whirling
    win: (f, t) => ({ ty: f * PI * 2, lx: -1.6, rx: -1.6, lz: 0.6, rz: -0.6, hx: -0.3, hz: S(t * 5) * 0.2, by: bump(f) * 0.1 }),
  },
  build() {
    const rig = fig({
      name: 'max', s: 1.38, wide: 1.15, deep: 1.1, headR: 0.3, headH: 0.5,
      torso: B1, legs: B1, arms: B1, hands: B1, skin: B1, face: maxFace(),
      torsoExtra: (b, d) => {
        const s = d.s;
        // wrap bands round the body at alternating tilts, a gold scarab
        for (let i = 0; i < 6; i++) {
          const y = (0.24 + i * 0.13) * s, w = lerp(0.93, 0.72, i / 6) * s * d.W;
          rbox(b, 0, y, 0, w + 0.03, 0.06 * s, 0.48 * s * d.D, 0, 0, (i % 2 ? 0.12 : -0.14), B2);
        }
        rod(b, [0, 0.62 * s, frontZ(d)], [0, 0.62 * s, frontZ(d) + 0.05], 0.11 * s, 0xe6b53a, 12);
        b.sphere(0, 0.62 * s, frontZ(d) + 0.06, 0.06 * s, 0x2a8aa0, { sy: 1.3 });
        rod(b, [-0.15 * s, 0.82 * s, frontZ(d)], [0.15 * s, 0.82 * s, frontZ(d)], 0.015 * s, 0xe6b53a, 4);
      },
      arm: (ab, sd, d) => {
        const s = d.s;
        for (let i = 0; i < 4; i++) rbox(ab, 0, (-0.12 - i * 0.12) * s, 0, 0.28 * s, 0.04 * s, 0.3 * s, 0, 0, (i % 2 ? 0.25 : -0.25), B2);
      },
      headExtra: (hb, d) => {
        const r = d.headR, h = d.headH;
        geoM(hb, domeGeo(), B1, 0, h * 0.95, 0, 0, 0, 0, r, r * 0.45, r);
        for (const [y, rx, rz] of [[0.85, 0.2, 0.1], [0.55, -0.15, 0.2], [0.18, 0.12, -0.15]]) geoM(hb, torusGeo(0.06, 24), B2, 0, h * y, 0, PI / 2 + rx, 0, rz, r * 1.04);
        hb.sphere(0.1, h * 0.58, r * 0.93, 0.065, 0, { mat: glowMat(0x7dff4a, 3) });
      },
    });
    const s = rig.dims.s, d = rig.dims, h = d.headH, r = d.headR;
    // hunched forward, head craned up and out
    rig.torso.rotation.x = 0.2; rig.head.rotation.x = -0.2; rig.head.position.z += 0.06;
    const halo = ball(rig.head, 0x7dff4a, 0.13, 0.1, h * 0.58, r * 0.98, 0.55);
    // loose bandages trailing from the head and both arms
    const strip = (len, w) => (b) => { rbox(b, 0, -len / 2, 0, w, len, 0.015, 0, 0, 0, B1); rbox(b, w * 0.3, -len * 0.9, 0.01, w * 0.6, len * 0.25, 0.015, 0, 0, 0.3, B2); };
    const headTrail = prop(rig.head, (b) => { strip(1.0, 0.1)(b); b.boxM(new THREE.Matrix4().makeTranslation(0.07, -0.45, -0.02).multiply(new THREE.Matrix4().makeScale(0.07, 0.8, 0.015)), B2); }, { y: h * 0.7, z: -r * 0.95, name: 'max-trail' });
    const armTrails = [rig.armL, rig.armR].map((arm) => {
      const g = new THREE.Group(); g.rotation.order = 'ZYX'; g.position.set(0, -0.42 * s, -0.12 * s); arm.add(g);
      prop(g, strip(0.75, 0.08), { name: 'max-arm-trail' });
      return { g, arm };
    });
    const dust = fxg(rig.root, { y: 0.6 }); puffs(dust, 0xc8b48c, 10, 1.1, 0.26, 29, { up: 0.6, flat: 0.4 });
    rig.idle = (t, dt, an, st) => {
      const v = st.speed01 ?? 0.5;
      headTrail.rotation.x = 0.3 + v * 1.0 + S(t * 11) * 0.12 * (0.3 + v);
      headTrail.rotation.z = S(t * 5) * 0.15;
      for (const { g, arm } of armTrails) hold(g, arm, 0.35 + v * 0.9 + S(t * 9 + arm.position.x * 3) * 0.12);
    };
    finish(rig, 1.4);
    rig.fx = (n, f, t) => {
      const flare = n === 'cheer' ? 1 + bump(f, 0.05, 0.6) * 1.6 : n === 'win' ? 1.8 + S(t * 12) * 0.3 : 1 + S(t * 2.5) * 0.15;
      halo.scale.setScalar(0.13 * flare);
      const du = n === 'cheer' && f < 0.6;
      vis(dust, du);
      if (du) { const k = seg(f, 0, 0.6); dust.scale.setScalar(0.4 + k * 1.2); dust.position.y = 0.4 + k * 0.5; dust.rotation.y = t; }
      if (n === 'win') headTrail.rotation.x = 1.4 + S(t * 14) * 0.15;
    };
    return rig;
  },
};

export default { pepper, cassie, bjorn, regina, zorp, max };
