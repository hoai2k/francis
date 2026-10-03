// Marvel drivers. Faces, torso prints and colours come from the
// "Avengers Brick Assemble" map figures; each driver has a signature cheer/win with
// effect parts (webs, repulsors, Mjolnir lightning, mandalas, Infinity snap…) run by rig.fx.
import { THREE, BrickBuilder, C, plastic, rod, simpleFace, taperGeo } from './kit.js';
import {
  M, S, PI, UP, ease, bump, seg, vis, shot, mapMats, faceMat, decalMat, shieldMesh, mandalaMat,
  fxMat, glow, hero, prop, beam, gems, spellDisc, mat4,
} from './marvel-parts.js';

const abs = Math.abs;
const HAND = -0.6, TIP = -0.7;                    // grip / fingertip along the arm (× s)

// ---------------------------------------------------------------------------- Spider-Man
const spiderman = {
  id: 'spiderman', name: 'Spider-Man', blurb: 'Your friendly neighborhood', weight: 'light', color: 0xc4141c,
  voice: { kind: 'human', pitch: 1.3 }, style: { cheer: 'fist', win: 'wave', trick: 'twist' },
  gestures: {
    // thwip! thwip! at the rival, then a fist pump
    cheer: (f, t) => {
      const k = shot(f, 0.08, 0.42) + shot(f, 0.48, 0.82);
      const o = { rx: -1.85 + k * 0.18, rz: 0.12, ty: -0.22, hx: -0.12, hy: -0.12, tz: 0.06 };
      if (f > 0.45) { o.lx = UP + S(t * 15) * 0.3; o.lz = 0.25; o.by = abs(S(t * 15)) * 0.06; }
      return o;
    },
    // swinging from web to web
    win: (f, t) => {
      const a = S(f * PI * 2);
      return { rx: -2.7 + a * 0.25, rz: -0.25, lx: -2.7 - a * 0.25, lz: 0.25, ty: a * 0.25, tz: a * 0.12, hz: -a * 0.15, hx: -0.2, by: abs(a) * 0.08 };
    },
    use: (f) => ({ rx: -1.9, rz: 0.1, hx: -0.15 }),
  },
  build() {
    const { face, decal } = mapMats('spidey');
    const rig = hero({ name: 'spiderman', face, decal, top: M.red, torso: M.red, arms: M.red, hands: M.red, legs: M.blue, hips: M.red, skin: M.red });
    const s = rig.dims.s;
    const webR = beam(rig.armR, TIP * s, 0xffffff, { r0: 0.025, r1: 0.025, web: true });
    const webL = beam(rig.armL, TIP * s, 0xffffff, { r0: 0.025, r1: 0.025, web: true });
    rig.fx = (name, f, t) => {
      let r = 0, l = 0;
      if (name === 'cheer') r = shot(f, 0.08, 0.42) + shot(f, 0.48, 0.82);
      else if (name === 'use' || name === 'throwF') r = shot(f, 0.15, 0.95);
      else if (name === 'win') { const w = (t % 1.6) / 1.6; r = shot(w, 0.02, 0.48); l = shot(w, 0.52, 0.98); }
      webR.set(r * 4.5); webL.set(l * 4.5);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Iron Man
const ironman = {
  id: 'ironman', name: 'Iron Man', blurb: 'Genius in a flying suit', weight: 'medium', color: 0xe3b23c,
  voice: { kind: 'robot', pitch: 1.05 }, style: { cheer: 'point', win: 'flex', trick: 'superman' },
  gestures: {
    // repulsor blast, right then left
    cheer: (f) => {
      const r = shot(f, 0.15, 0.5), l = shot(f, 0.5, 0.85);
      return { rx: -1.6 + r * 0.25, rz: 0.08, lx: f > 0.42 ? -1.6 + l * 0.25 : -1.0, lz: -0.08, ty: f < 0.5 ? -0.18 : 0.18, tx: -0.06, hx: -0.12 };
    },
    use: (f) => ({ rx: -1.6 + shot(f, 0.25, 0.95) * 0.2, rz: 0.08, hx: -0.12 }),
    // victory flare: repulsor fired into the sky, other arm out
    win: (f, t) => ({ rx: -2.95, rz: -0.1, lx: -0.5, lz: 1.1, tx: -0.1, hx: -0.35, hy: -0.2, by: abs(S(t * 4)) * 0.05 }),
    // flight pose: lean forward, repulsors jetting out to the sides
    trick: (f) => ({ tx: 0.38, hx: -0.5, lx: 0.3, rx: 0.3, lz: 0.85, rz: -0.85, by: bump(f) * 0.12 }),
  },
  build() {
    const { face, decal } = mapMats('iron');
    const rig = hero({
      name: 'ironman', face, decal, top: M.red, torso: M.red, arms: M.red, hands: M.red, legs: M.gold, hips: M.red, skin: M.red,
      arm: (ab, sd, d) => { ab.box(0, -0.44 * d.s, 0, 0.25 * d.s, 0.1 * d.s, 0.28 * d.s, M.gold); ab.sphere(0, -0.06 * d.s, 0, 0.15 * d.s, M.gold); },
    });
    const s = rig.dims.s;
    const bR = beam(rig.armR, TIP * s, 0xbff4ff, { r0: 0.06, r1: 0.16, flash: 0.2 });
    const bL = beam(rig.armL, TIP * s, 0xbff4ff, { r0: 0.06, r1: 0.16, flash: 0.2 });
    rig.fx = (name, f, t) => {
      let r = 0, l = 0;
      const p = 1 + S(t * 47) * 0.3;
      if (name === 'cheer') { r = shot(f, 0.15, 0.5) * 5; l = shot(f, 0.5, 0.85) * 5; }
      else if (name === 'use' || name === 'throwF') r = shot(f, 0.25, 0.95) * 5;
      else if (name === 'win') r = shot((t * 1.25) % 1, 0.05, 0.75) * 5;
      else if (name === 'trick') r = l = 1.1 + S(t * 31) * 0.25;
      bR.set(r, p); bL.set(l, p);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Captain America
const captain = {
  id: 'captain', name: 'Captain America', blurb: 'First Avenger, shield up', weight: 'medium', color: 0x1f3a93,
  voice: { kind: 'human', pitch: 0.95 }, style: { cheer: 'salute', win: 'salute', trick: 'arms' },
  gestures: {
    // shield raised high, fist pump
    cheer: (f, t) => ({ lx: -2.75, lz: 0.5, rx: UP + S(t * 14) * 0.3, rz: -0.25, hx: -0.3, tz: -0.05, by: abs(S(t * 14)) * 0.06 }),
    // ducks behind the shield
    ouch: (f, t) => ({ lx: -1.5, lz: -1.25, rx: -0.9, rz: -0.2, tx: 0.2, hx: 0.25, tz: S(t * 22) * 0.08, hy: S(t * 17) * 0.2 }),
    // frisbee shield throw with the left arm
    throwF: (f) => ({ lx: -1.5, lz: f < 0.4 ? -1.3 * ease(f / 0.4) : -1.3 + 2.2 * ease(seg(f, 0.4, 0.62)), ty: f < 0.4 ? -0.35 : 0.3, hx: -0.1 }),
    win: (f, t) => ({ rx: -2.5, rz: 0.75, lx: -2.6, lz: 0.45, hx: -0.12, tx: -0.08, by: abs(S(t * 4)) * 0.04 }),
    use: (f) => ({ lx: -2.6, lz: 0.45, hx: -0.2 }),
  },
  build() {
    const { face, decal } = mapMats('cap');
    const rig = hero({ name: 'captain', face, decal, top: M.blue, skin: M.skin, torso: M.blue, arms: M.blue, hands: M.bronze, legs: M.blue, hips: M.navy, neck: M.blue });
    const s = rig.dims.s, D = rig.dims.D;
    const sh = new THREE.Group(), disc = shieldMesh(0.95);
    disc.traverse((o) => { if (o.isMesh) o.material = [o.material[0], o.material[1], o.material[1]]; });   // star on both faces
    sh.add(disc); sh.scale.setScalar(0.46);
    const onBack = () => { rig.torso.add(sh); sh.position.set(0, 0.62 * s, -0.24 * s * D - 0.05); sh.rotation.set(-PI / 2, 0, 0); };
    const onArm = () => { rig.armL.add(sh); sh.position.set(0.17 * s, -0.42 * s, 0); sh.rotation.set(0, 0, -PI / 2); };
    onBack();
    rig.fx = (name, f) => {
      const arm = name === 'cheer' || name === 'ouch' || name === 'win' || name === 'use' || (name === 'throwF' && f < 0.58);
      if (arm && sh.parent !== rig.armL) onArm();
      else if (!arm && sh.parent !== rig.torso) onBack();
      vis(sh, !(name === 'throwF' && f >= 0.58));
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Thor
const thor = {
  id: 'thor', name: 'Thor', blurb: 'God of Thunder', weight: 'heavy', color: 0x6fd0ff,
  voice: { kind: 'human', pitch: 0.8 }, style: { cheer: 'fist', win: 'fist', trick: 'superman' },
  gestures: {
    // Mjolnir to the sky, lightning crackling
    cheer: (f, t) => ({ rx: -3.0 + S(t * 9) * 0.06, rz: -0.12, lx: -1.0, lz: 0.35, hx: -0.4, hy: -0.15, tz: 0.06, by: abs(S(t * 8)) * 0.05 }),
    win: (f, t) => ({ rx: -3.0, rz: -0.1, lx: -0.9, lz: 0.7, hx: -0.4, tx: -0.12, ty: S(t * 3) * 0.15, by: abs(S(t * 6)) * 0.05 }),
    use: (f) => ({ rx: -3.0, rz: -0.1, hx: -0.35 }),
    trick: (f) => ({ tx: 0.35, rx: -2.9, rz: 0.05, lx: -0.3, lz: 0.25, hx: -0.45 }),
  },
  build() {
    const { face, decal } = mapMats('thor');
    const rig = hero({
      name: 'thor', face, decal, top: M.blond, skin: M.skin, torso: 0x2b2f36, arms: M.skin, hands: M.skin, legs: 0x2b2f36,
      hair: (hb, d, k, v) => { hb.sphere(0, 0.62 * v, 0, 0.44 * k, M.blond, { sy: 0.45 }); hb.box(0, -0.32 * v, -0.22 * k, 0.92 * k, 1.0 * v, 0.42 * k, M.blond); },
      extra: (b, d) => {
        const s = d.s;
        b.boxM(mat4(0, 0.62 * s, -0.24 * s * d.D - 0.03, 0.08, 0, 0, 0.98 * s, 0.98 * s, 0.06), M.red);
        for (const sd of [-1, 1]) b.sphere(sd * 0.27 * s, 0.9 * s, 0.17 * s, 0.075 * s, M.silver);
      },
      arm: (ab, sd, d) => { ab.box(0, -0.5 * d.s, 0, 0.26 * d.s, 0.18 * d.s, 0.29 * d.s, M.silver); ab.sphere(0, -0.02 * d.s, 0, 0.16 * d.s, 0x2b2f36); },
    });
    const s = rig.dims.s;
    // Mjolnir: handle continues the arm, head beyond the fist
    const hammer = prop(rig.armR, 0, HAND * s, 0, (b) => {
      b.box(0, -0.4, 0, 0.08, 0.48, 0.08, M.bronze);
      b.boxM(mat4(0, -0.62, 0, 0, 0, 0, 0.4, 0.36, 0.64), 0x8a9098);
      for (const z of [-0.2, 0.2]) b.boxM(mat4(0, -0.62, z, 0, 0, 0, 0.42, 0.38, 0.05), 0x6a7078);
      b.box(0, 0.02, 0, 0.1, 0.06, 0.1, M.silver);
    });
    hammer.visible = false;
    const bolts = prop(hammer, 0, -0.62, 0, (b) => {
      const m = fxMat(0x9fe8ff, 1);
      for (let k = 0; k < 5; k++) {
        const a = k * 1.26 + 0.3, dx = Math.cos(a), dz = Math.sin(a);
        const P = [[0, 0, 0], [dx * 0.3 - dz * 0.12, -0.25, dz * 0.3 + dx * 0.12], [dx * 0.55 + dz * 0.1, -0.5, dz * 0.55 - dx * 0.1], [dx * 0.85, -0.72, dz * 0.85]];
        for (let j = 0; j < 3; j++) rod(b, P[j], P[j + 1], 0.03, m, 4);
      }
      rod(b, [0, 0, 0], [0.05, -1.2, 0.1], 0.05, m, 4);
    }, 'lightning');
    rig.fx = (name, f, t) => {
      const on = name === 'cheer' || name === 'win' || name === 'use' || name === 'trick' || (name === 'throwF' && f < 0.62);
      vis(hammer, on);
      const zap = (name === 'cheer' || name === 'win' || name === 'use') && ((t * 17) | 0) % 3 !== 0;
      vis(bolts, zap);
      if (zap) { bolts.rotation.y = ((t * 7) | 0) * 1.9; bolts.scale.setScalar(0.8 + ((t * 23) % 1) * 0.5); }
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Hulk
const hulk = {
  id: 'hulk', name: 'Hulk', blurb: 'HULK SMASH!', weight: 'heavy', color: 0x4f9a2a,
  voice: { kind: 'deep', pitch: 0.65 }, style: { cheer: 'roar', win: 'roar', trick: 'arms' },
  gestures: {
    // two double-fist smashes
    cheer: (f, t) => {
      const ph = (f * 2) % 1, u = ph < 0.6 ? ease(ph / 0.6) : 1 - ease((ph - 0.6) / 0.12);
      const a = -0.95 - 1.95 * u, z = 0.3 * u - 0.3 * (1 - u);
      return { lx: a, rx: a, lz: z, rz: -z, tx: -0.15 * u + 0.32 * (1 - u), hx: -0.45 * u + 0.1 * (1 - u), by: (1 - u) * abs(S(t * 40)) * 0.06, tz: (1 - u) * S(t * 50) * 0.04 };
    },
    // HULK SMASH, over and over
    win: (f, t) => {
      const u = f < 0.65 ? ease(f / 0.65) : 1 - ease((f - 0.65) / 0.12);
      const a = -0.95 - 1.95 * u, z = 0.3 * u - 0.3 * (1 - u);
      return { lx: a, rx: a, lz: z, rz: -z, tx: -0.15 * u + 0.32 * (1 - u), hx: -0.5 * u + 0.1 * (1 - u), by: (1 - u) * abs(S(t * 40)) * 0.06 };
    },
    taunt: (f, t) => ({ lx: -0.6, rx: -0.6, lz: 1.5, rz: -1.5, tx: -0.15, ty: S(t * 8) * 0.2, hx: -0.3 }),
  },
  build() {
    const { face, decal } = mapMats('hulk');
    const rig = hero({
      name: 'hulk', s: 1.62, wide: 1.2, deep: 1.25, face, decal, top: M.black, skin: M.hulk, torso: M.hulk, arms: M.hulk, hands: M.hulk, legs: M.purple, hips: M.purple,
      hair: (hb, d, k, v) => { hb.sphere(0, 0.6 * v, -0.04 * k, 0.44 * k, M.black, { sy: 0.5 }); for (let j = 0; j < 5; j++) hb.box(-0.3 * k + j * 0.15 * k, 0.66 * v, 0.2 * k, 0.16 * k, 0.14 * v, 0.2 * k, M.black); },
      extra: (b, d) => { const s = d.s; for (const sd of [-1, 1]) b.boxM(mat4(sd * 0.24 * s, 0.98 * s, -0.03 * s, 0, 0, sd * -0.35, 0.36 * s, 0.16 * s, 0.4 * s), M.hulk); },
      arm: (ab, sd, d) => { const s = d.s; ab.add(taperGeo(0.36, 0.27, 0.4, 0.36, 0.28), plastic(M.hulk), 0, -0.64 * s, 0, 0, s, s, s); ab.box(0, -0.84 * s, 0, 0.3 * s, 0.24 * s, 0.33 * s, M.hulk); },
    });
    return rig;
  },
};

// ---------------------------------------------------------------------------- Black Widow
const widow = {
  id: 'widow', name: 'Black Widow', blurb: 'Super-spy with stingers', weight: 'light', color: 0xd01a1a,
  voice: { kind: 'human', pitch: 1.35 }, style: { cheer: 'both', win: 'wave', trick: 'twist' },
  gestures: {
    // crossed batons, then an electric X-strike
    cheer: (f, t) => (f < 0.4
      ? { lx: -1.75, rx: -1.75, lz: -0.6, rz: 0.6, hx: 0.1, tx: 0.08 }
      : { lx: -2.3, rx: -2.3, lz: 1.0, rz: -1.0, hx: -0.25, hz: S(t * 7) * 0.12, by: abs(S(t * 10)) * 0.05 }),
    win: (f, t) => ({ rx: UP, rz: -0.3, lx: -1.3, lz: 1.1, hz: S(t * 4) * 0.2, hy: S(t * 2) * 0.4, hx: -0.15, ty: S(t * 2) * 0.12 }),
  },
  build() {
    const { face, decal } = mapMats('widow');
    const hairC = 0xb8401a;
    const rig = hero({
      name: 'widow', face, decal, top: hairC, skin: M.skin, torso: M.black, arms: M.black, hands: M.black, legs: M.black,
      hair: (hb, d, k, v) => { hb.sphere(0, 0.6 * v, 0, 0.44 * k, hairC, { sy: 0.5 }); hb.box(0, -0.28 * v, -0.2 * k, 0.9 * k, 0.95 * v, 0.46 * k, hairC); for (const sd of [-1, 1]) hb.sphere(sd * 0.36 * k, -0.2 * v, -0.08 * k, 0.17 * k, hairC); },
      arm: (ab, sd, d) => ab.box(0, -0.47 * d.s, 0, 0.25 * d.s, 0.07 * d.s, 0.28 * d.s, M.gold),
    });
    const s = rig.dims.s;
    const mk = (arm) => { const g = prop(arm, 0, HAND * s, 0, (b) => { b.box(0, -0.04, 0, 0.1, 0.08, 0.1, 0x3a3e46); b.boxM(mat4(0, 0, 0, 0, 0, 0, 0.06, 0.06, 0.95), 0, { mat: glow(0x5ac8ff, 2.6) }); }); g.visible = false; return g; };
    const bL = mk(rig.armL), bR = mk(rig.armR);
    rig.fx = (name, f, t) => {
      const on = name === 'cheer' || name === 'win' || name === 'use' || name === 'taunt';
      vis(bL, on); vis(bR, on);
      if (on) { const spin = name === 'cheer' && f < 0.4 ? 0.6 : t * 16; bL.rotation.y = spin; bR.rotation.y = -spin; }
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Hawkeye
const hawkeye = {
  id: 'hawkeye', name: 'Hawkeye', blurb: 'Never misses a shot', weight: 'medium', color: 0x5b2c83,
  voice: { kind: 'human', pitch: 0.95 }, style: { cheer: 'point', win: 'fist', trick: 'arms' },
  gestures: {
    // turn, draw, loose!
    cheer: (f) => (f < 0.6
      ? { ty: 1.1, lx: -1.57, lz: 0.02, rx: -1.5, rz: 1.0, hy: -0.1, hx: -0.05, tz: -0.05 }
      : { ty: 0.9, lx: -1.57, lz: 0.05, rx: -1.1, rz: 1.35, hy: -0.1, hx: -0.1 }),
    win: (f, t) => ({ lx: UP, lz: 0.3, rx: UP + S(t * 12) * 0.3, rz: -0.3, hx: -0.25, by: abs(S(t * 12)) * 0.05 }),
    throwF: (f) => ({ ty: 0.2, lx: -1.57, lz: -0.1, rx: f < 0.5 ? -1.4 : -1.1, rz: f < 0.5 ? 0.6 : 1.2, hx: -0.05 }),
  },
  build() {
    const { face, decal } = mapMats('hawk');
    const hairC = 0x4a3020;
    const rig = hero({
      name: 'hawkeye', face, decal, top: hairC, skin: M.skin, torso: 0x1f1a2a, arms: M.skin, hands: M.black, legs: M.black,
      hair: (hb, d, k, v) => hb.sphere(0, 0.62 * v, 0, 0.42 * k, hairC, { sy: 0.35 }),
      extra: (b, d) => {
        const s = d.s, z = -0.24 * s * d.D - 0.12 * s;
        b.boxM(mat4(-0.12 * s, 0.68 * s, z, 0, 0, 0.45, 0.24 * s, 0.85 * s, 0.24 * s), 0x5a3a24);
        for (let k = 0; k < 3; k++) b.boxM(mat4(-0.36 * s + k * 0.07 * s, 1.18 * s + k * 0.03 * s, z, 0, 0, 0.45, 0.05 * s, 0.26 * s, 0.14 * s), M.purple);
      },
      arm: (ab, sd, d) => ab.box(0, -0.55 * d.s, 0, 0.25 * d.s, 0.24 * d.s, 0.28 * d.s, M.black),
    });
    const s = rig.dims.s;
    // bow in the left fist: limbs along local Z, bulging forward (-Y)
    const bow = prop(rig.armL, 0, HAND * s, 0, (b) => {
      const pt = (u) => [0, 0.17 * u * u - 0.04, 0.66 * u];
      for (let i = 0; i < 8; i++) { const u0 = -1 + i / 4, u1 = u0 + 0.25; rod(b, pt(u0), pt(u1), 0.035, M.purple, 6); }
      b.box(0, -0.12, 0, 0.09, 0.2, 0.12, M.black);
    }, 'bow');
    bow.visible = false;
    // the string, pulled back by scaling a V
    const str = prop(bow, 0, 0.13, 0, (b) => { rod(b, [0, 0, -0.66], [0, 1, 0], 0.012, C.white, 4); rod(b, [0, 0, 0.66], [0, 1, 0], 0.012, C.white, 4); }, 'string');
    const arrow = prop(bow, 0, 0.13, 0, (b) => {
      rod(b, [0, 0, 0], [0, -0.95, 0], 0.02, 0x3a3e46, 5);
      const cone = new THREE.ConeGeometry(0.05, 0.16, 4); b.addMatrix(cone, plastic(0x8a9098), mat4(0, -1.0, 0, PI, 0, 0)); cone.dispose();
      b.boxM(mat4(0, -0.06, 0, 0, 0, 0, 0.02, 0.14, 0.1), M.purple);
    }, 'arrow');
    rig.fx = (name, f) => {
      const on = name === 'cheer' || name === 'win' || name === 'throwF' || name === 'use';
      vis(bow, on);
      if (!on) return;
      let pull = 0, ay = 0, show = true;
      if (name === 'cheer') { pull = f < 0.6 ? ease(f / 0.45) : 0; ay = f < 0.6 ? 0 : -(f - 0.6) * 45; show = f < 0.78; }
      else if (name === 'throwF' || name === 'use') { pull = f < 0.5 ? ease(f / 0.4) : 0; ay = f < 0.5 ? 0 : -(f - 0.5) * 45; show = f < 0.7; }
      else show = false;
      str.scale.y = 0.001 + pull * 0.32;
      arrow.position.y = 0.13 + pull * 0.32 + ay;
      vis(arrow, show);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Black Panther
const panther = {
  id: 'panther', name: 'Black Panther', blurb: 'Wakanda forever!', weight: 'medium', color: 0x8a4dff,
  voice: { kind: 'human', pitch: 0.85 }, style: { cheer: 'flex', win: 'salute', trick: 'twist' },
  gestures: {
    // claw swipes, then "Wakanda forever" crossed arms
    cheer: (f, t) => {
      if (f < 0.27) { const p = ease(f / 0.27); return { lx: -2.6 + p * 1.8, lz: 0.25 - p * 0.5, ty: 0.25 - p * 0.5, hx: -0.1 }; }
      if (f < 0.55) { const p = ease((f - 0.27) / 0.28); return { rx: -2.6 + p * 1.8, rz: -0.25 + p * 0.5, ty: -0.25 + p * 0.5, hx: -0.1 }; }
      return { lx: -1.75, rx: -1.75, lz: -0.8, rz: 0.8, hx: -0.15, tx: -0.08 };
    },
    win: (f, t) => ({ lx: -1.75, rx: -1.75, lz: -0.8, rz: 0.8, hx: -0.25 + S(t * 4) * 0.08, tx: -0.1, by: abs(S(t * 4)) * 0.04 }),
    taunt: (f, t, rig, a) => ({ [a.tauntSide > 0 ? 'lx' : 'rx']: -1.8, [a.tauntSide > 0 ? 'lz' : 'rz']: a.tauntSide * 0.9, hy: a.tauntSide * 1.1, ty: a.tauntSide * 0.4, hz: S(t * 9) * 0.08 }),
  },
  build() {
    const { face, decal } = mapMats('panther');
    const blk = 0x15161a;
    const rig = hero({
      name: 'panther', face, decal, top: blk, skin: blk, torso: blk, arms: blk, hands: 0x2a2c33, legs: blk,
      hair: (hb, d, k, v) => { for (const sd of [-1, 1]) hb.cone(sd * 0.24 * k, 0.66 * v, -0.04 * k, 0.12 * k, 0.24 * k, blk, { seg: 4 }); },
      extra: (b, d) => { for (let j = 0; j < 7; j++) { const a = (j - 3) * 0.22; b.sphere(Math.sin(a) * 0.3 * d.s, 1.0 * d.s - Math.cos(a) * 0.1 * d.s + 0.06 * d.s, Math.cos(a) * 0.17 * d.s, 0.05 * d.s, M.silver); } },
      arm: (ab, sd, d) => ab.box(0, -0.42 * d.s, 0.13 * d.s, 0.05 * d.s, 0.34 * d.s, 0.02 * d.s, M.silver),
    });
    const s = rig.dims.s;
    const mk = (arm) => { const g = prop(arm, 0, TIP * s, 0.04, (b) => { for (let k = -1; k <= 1; k++) b.boxM(mat4(k * 0.07, -0.1, 0.03, -0.25, 0, k * 0.15, 0.035, 0.24, 0.035), 0, { mat: glow(0xb07aff, 3) }); }, 'claws'); g.visible = false; return g; };
    const cL = mk(rig.armL), cR = mk(rig.armR);
    rig.fx = (name) => {
      const on = name === 'cheer' || name === 'win' || name === 'taunt' || name === 'use';
      vis(cL, on); vis(cR, on);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Doctor Strange
const strange = {
  id: 'strange', name: 'Doctor Strange', blurb: 'Sorcerer Supreme', weight: 'medium', color: 0xffb030,
  voice: { kind: 'human', pitch: 0.9 }, style: { cheer: 'point', win: 'both', trick: 'superman' },
  gestures: {
    // spell mandalas in both hands
    cheer: (f, t) => ({ lx: -1.45, rx: -1.45, lz: 0.12, rz: -0.12, tx: -0.06, hx: -0.06, by: 0.05 + S(t * 3) * 0.03 }),
    use: (f) => ({ rx: -1.5, rz: -0.1, hx: -0.06 }),
    // levitating, arms spread
    win: (f, t) => ({ lx: -0.25, rx: -0.25, lz: 1.35, rz: -1.35, hx: -0.15, by: 0.14 + S(t * 2.5) * 0.06, ty: S(t * 1.2) * 0.2 }),
  },
  build() {
    const { face, decal } = mapMats('strange');
    const red = 0xa8141a;
    const rig = hero({
      name: 'strange', face, decal, top: 0x2a2020, skin: M.skin, torso: 0x1c2a5a, arms: 0x1c2a5a, hands: M.skin, legs: 0x1c2a5a,
      hair: (hb, d, k, v) => hb.sphere(0, 0.62 * v, -0.02 * k, 0.43 * k, 0x2a2020, { sy: 0.42 }),
      extra: (b, d) => {
        const s = d.s;
        b.boxM(mat4(0, 0.62 * s, -0.24 * s * d.D - 0.03, 0.08, 0, 0, 1.0 * s, 1.0 * s, 0.06), red);
        for (const sd of [-1, 1]) b.boxM(mat4(sd * 0.3 * s, 1.24 * s, -0.08 * s, -0.25, sd * 0.55, sd * -0.2, 0.06 * s, 0.5 * s, 0.34 * s), red);
      },
      arm: (ab, sd, d) => ab.box(0, -0.52 * d.s, 0, 0.26 * d.s, 0.18 * d.s, 0.29 * d.s, 0x6a4a2a),
    });
    const s = rig.dims.s;
    const mL = spellDisc(rig.armL, -0.85 * s, 0.95, mandalaMat());
    const mR = spellDisc(rig.armR, -0.85 * s, 0.95, mandalaMat());
    rig.fx = (name, f, t) => {
      let l = 0, r = 0;
      if (name === 'cheer') l = r = ease(seg(f, 0.08, 0.3)) * (1 - ease(seg(f, 0.82, 1)));
      else if (name === 'use') r = ease(seg(f, 0.1, 0.35)) * (1 - ease(seg(f, 0.8, 1)));
      else if (name === 'win') l = r = 0.9 + S(t * 3) * 0.1;
      vis(mL.g, l > 0.02); vis(mR.g, r > 0.02);
      const face = name === 'win' ? 0 : PI / 2;   // arms spread: discs face forward; arms forward: discs face out of the palms
      if (l > 0.02) { mL.g.scale.setScalar(l); mL.m.rotation.set(face, 0, t * 2.2); }
      if (r > 0.02) { mR.g.scale.setScalar(r); mR.m.rotation.set(face, 0, -t * 2.2); }
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Scarlet Witch
function wandaMats() {
  const face = faceMat('mv-wanda', (g, w, h) => {
    g.fillStyle = '#f2c9a0'; g.fillRect(0, 0, w, h);
    simpleFace(g, { mouth: 'smirk', brows: true, y: 64 });
    g.fillStyle = '#b0303a'; g.fillRect(118, 86, 20, 3);
    g.fillStyle = '#7a2a1a'; g.fillRect(0, 0, 78, h); g.fillRect(178, 0, 78, h); g.fillRect(0, 0, w, 24);
    g.beginPath(); g.moveTo(78, 24); g.quadraticCurveTo(100, 40, 108, 24); g.fill(); g.beginPath(); g.moveTo(178, 24); g.quadraticCurveTo(156, 40, 148, 24); g.fill();
    g.fillStyle = '#c01020'; g.beginPath(); g.moveTo(96, 26); g.lineTo(128, 30); g.lineTo(160, 26); g.lineTo(150, 36); g.lineTo(128, 40); g.lineTo(106, 36); g.closePath(); g.fill();
  });
  const decal = decalMat('mv-wanda', (g, w, h) => {
    g.fillStyle = '#7a0f1a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a0a10'; g.beginPath(); g.moveTo(34, 30); g.lineTo(94, 30); g.lineTo(86, h); g.lineTo(42, h); g.closePath(); g.fill();
    g.strokeStyle = '#c01020'; g.lineWidth = 3; for (let y = 44; y < h - 10; y += 14) { g.beginPath(); g.moveTo(52, y); g.lineTo(76, y + 8); g.moveTo(76, y); g.lineTo(52, y + 8); g.stroke(); }
    g.fillStyle = '#c01020'; g.beginPath(); g.moveTo(20, 0); g.lineTo(w / 2, 34); g.lineTo(w - 20, 0); g.lineTo(w - 34, 0); g.lineTo(w / 2, 22); g.lineTo(34, 0); g.fill();
    g.fillStyle = '#3a0a10'; g.fillRect(0, h - 22, w, 12);
  });
  return { face, decal };
}
let hexM = null;
const hexMat = () => (hexM ||= new THREE.MeshBasicMaterial({ color: 0xff1238, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }));
const wanda = {
  id: 'wanda', name: 'Scarlet Witch', blurb: 'Chaos magic on wheels', weight: 'light', color: 0xff1a3a,
  voice: { kind: 'human', pitch: 1.3 }, style: { cheer: 'both', win: 'both', trick: 'twist' },
  gestures: {
    // hex bolts from both hands
    cheer: (f, t) => (f < 0.6
      ? { lx: -1.85, rx: -1.85, lz: 0.35, rz: -0.35, hx: -0.1, hz: 0.15, tx: -0.05, by: 0.04 }
      : { lx: -2.5, rx: -2.5, lz: 0.55, rz: -0.55, hx: -0.3, hz: S(t * 5) * 0.15, by: 0.08 }),
    win: (f, t) => ({ lx: -0.9 + S(t * 3) * 0.2, rx: -0.9 - S(t * 3) * 0.2, lz: 1.0, rz: -1.0, hx: -0.2, hz: S(t * 2) * 0.12, by: 0.12 + S(t * 2.5) * 0.05 }),
    use: (f) => ({ rx: -1.8, rz: -0.25, hx: -0.1 }),
  },
  build() {
    const { face, decal } = wandaMats();
    const hairC = 0x7a2a1a, red = 0xa01020;
    const rig = hero({
      name: 'wanda', face, decal, top: hairC, skin: M.skin, torso: 0x7a0f1a, arms: 0x7a0f1a, hands: 0x3a0a10, legs: 0x2a0a10,
      hair: (hb, d, k, v) => {
        hb.sphere(0, 0.6 * v, 0, 0.44 * k, hairC, { sy: 0.5 });
        hb.box(0, -0.5 * v, -0.2 * k, 0.92 * k, 1.15 * v, 0.46 * k, hairC);
        for (const sd of [-1, 1]) { hb.sphere(sd * 0.36 * k, -0.25 * v, -0.06 * k, 0.17 * k, hairC, { sy: 1.6 }); hb.boxM(mat4(sd * 0.15 * k, 0.8 * v, 0.33 * k, -0.35, 0, sd * 0.5, 0.07 * k, 0.32 * v, 0.06 * k), red); }
        hb.box(0, 0.68 * v, 0.35 * k, 0.24 * k, 0.07 * v, 0.06 * k, red);
      },
      extra: (b, d) => {
        const s = d.s;
        b.boxM(mat4(0, 0.5 * s, -0.24 * s * d.D - 0.03, 0.08, 0, 0, 0.9 * s, 0.9 * s, 0.06), red);
        b.box(0, 0.88 * s, -0.16 * s, 0.75 * s, 0.14 * s, 0.24 * s, red);
      },
      arm: (ab, sd, d) => ab.box(0, -0.5 * d.s, 0, 0.25 * d.s, 0.08 * d.s, 0.28 * d.s, red),
    });
    const s = rig.dims.s;
    const mk = (arm) => {
      const g = prop(arm, 0, TIP * s - 0.08, 0, (b) => {
        const m = hexMat();
        const tor = new THREE.TorusGeometry(0.22, 0.04, 6, 16);
        b.addMatrix(tor, m, mat4(0, 0, 0, PI / 2, 0, 0));
        b.addMatrix(tor, m, mat4(0, -0.12, 0, PI / 2 + 0.5, 0.4, 0, 0.7, 0.7, 0.7));
        for (let k = 0; k < 4; k++) { const a = k * PI / 2; b.sphere(Math.cos(a) * 0.32, -0.05 - k * 0.05, Math.sin(a) * 0.32, 0.075, 0, { mat: m }); }
        tor.dispose();
      }, 'hex');
      g.visible = false; return g;
    };
    const hL = mk(rig.armL), hR = mk(rig.armR);
    rig.fx = (name, f, t) => {
      const l = name === 'cheer' || name === 'win', r = l || name === 'use' || name === 'throwF';
      vis(hL, l); vis(hR, r);
      if (l) { hL.rotation.y = t * 6; hL.scale.setScalar(0.9 + S(t * 13) * 0.15); }
      if (r) { hR.rotation.y = -t * 6; hR.scale.setScalar(0.9 + S(t * 11) * 0.15); }
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Ant-Man
function antMats() {
  const lens = (g) => { g.fillStyle = '#ff4a2a'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(128 + sd * 22, 58, 15, 17, 0, 0, 7); g.fill(); } };
  const face = faceMat('mv-antman', (g, w, h) => {
    g.fillStyle = '#8f969e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a6068'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#b3121b'; g.fillRect(122, 0, 12, 36);
    g.fillStyle = '#2a2e34'; g.beginPath(); g.roundRect(96, 80, 64, 36, 10); g.fill();
    g.strokeStyle = '#8f969e'; g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(106 + k * 14, 86); g.lineTo(106 + k * 14, 110); g.stroke(); }
    g.fillStyle = '#1b1b1b'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(128 + sd * 22, 58, 19, 21, 0, 0, 7); g.fill(); }
    lens(g);
    g.fillStyle = '#5a6068'; for (const x of [40, 216]) { g.beginPath(); g.arc(x, 64, 18, 0, 7); g.fill(); }
  }, lens);
  const decal = decalMat('mv-antman', (g, w, h) => {
    g.fillStyle = '#b3121b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1d22'; g.fillRect(w / 2 - 22, 0, 44, h); g.fillRect(0, 50, 18, h); g.fillRect(w - 18, 50, 18, h);
    g.fillStyle = '#b3121b'; g.fillRect(w / 2 - 6, 0, 12, h);
    g.fillStyle = '#8f969e'; g.fillRect(0, h - 24, w, 14); g.fillStyle = '#b3121b'; g.beginPath(); g.arc(w / 2, h - 17, 9, 0, 7); g.fill();
  });
  return { face, decal };
}
const antman = {
  id: 'antman', name: 'Ant-Man', blurb: 'Small hero, big moves', weight: 'light', color: 0xff4a2a,
  voice: { kind: 'human', pitch: 1.1 }, style: { cheer: 'both', win: 'both', trick: 'twist' },
  gestures: {
    // shrinks down for a tiny fist-pump dance, then pops back
    cheer: (f, t) => ({ lx: UP, rx: UP, lz: 0.3 + S(t * 16) * 0.2, rz: -0.3 - S(t * 16) * 0.2, hx: -0.2, by: abs(S(t * 16)) * 0.12 }),
    // Giant-Man!
    win: (f, t) => ({ lx: UP + S(t * 8) * 0.2, rx: UP - S(t * 8) * 0.2, lz: 0.45, rz: -0.45, hx: -0.25, by: abs(S(t * 8)) * 0.05 }),
  },
  build() {
    const { face, decal } = antMats();
    const rig = hero({
      name: 'antman', face, decal, top: 0x8f969e, skin: 0x8f969e, torso: 0xb3121b, arms: 0xb3121b, hands: M.black, legs: M.black, neck: M.black,
      hair: (hb, d, k, v) => {
        for (const sd of [-1, 1]) rod(hb, [sd * 0.14 * k, d.headH - 0.02, 0.1 * k], [sd * 0.3 * k, d.headH + 0.3, -0.1 * k], 0.022, 0x5a6068, 5);
        hb.box(0, d.headH - 0.03, -0.1 * k, 0.12 * k, 0.08, 0.6 * k, 0xb3121b);
      },
      arm: (ab, sd, d) => { ab.box(0, -0.38 * d.s, 0, 0.255 * d.s, 0.07 * d.s, 0.285 * d.s, M.black); ab.box(0, -0.2 * d.s, 0, 0.26 * d.s, 0.06 * d.s, 0.29 * d.s, M.black); },
    });
    rig.fx = (name, f, t) => {
      let k = 1;
      if (name === 'cheer') k = f < 0.15 ? 1 - 0.62 * ease(f / 0.12) : f < 0.78 ? 0.38 : 0.38 + 0.62 * ease((f - 0.78) / 0.14);
      else if (name === 'ouch') k = 1 - 0.35 * bump(f);
      else if (name === 'win') k = 1.12;
      if (rig.torso.scale.x !== k) rig.torso.scale.setScalar(k);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Star-Lord
const starlord = {
  id: 'starlord', name: 'Star-Lord', blurb: 'Legendary outlaw dancer', weight: 'medium', color: 0xd9641c,
  voice: { kind: 'human', pitch: 1.05 }, style: { cheer: 'spin', win: 'spin', trick: 'twist' },
  gestures: {
    // the Walkman dance
    cheer: (f, t) => {
      const b = S(t * 9);
      return { ty: b * 0.35, tz: -b * 0.12, hx: -0.12 + abs(b) * 0.18, hz: b * 0.2, lx: -1.3 + b * 0.9, rx: -1.3 - b * 0.9, lz: 0.55, rz: -0.55, by: abs(b) * 0.08 };
    },
    taunt: (f, t, rig, a) => {
      const b = S(t * 10);
      return { [a.tauntSide > 0 ? 'lx' : 'rx']: -1.65, [a.tauntSide > 0 ? 'lz' : 'rz']: a.tauntSide * 0.3, hy: a.tauntSide * 1.2, ty: a.tauntSide * 0.35 + b * 0.15, tz: b * 0.08, by: abs(b) * 0.05 };
    },
    // twin blasters twirling
    win: (f, t) => {
      const b = S(t * 8);
      return { lx: -1.9, rx: -1.9, lz: 0.35, rz: -0.35, ty: b * 0.25, tz: b * 0.08, hz: -b * 0.15, hx: -0.15, by: abs(b) * 0.06 };
    },
    use: (f) => ({ rx: -1.6, rz: 0.05, hx: -0.1 }),
  },
  build() {
    const { face, decal } = mapMats('starlord');
    const rig = hero({
      name: 'starlord', face, decal, top: 0x5a6068, skin: M.skin, torso: M.coat, arms: M.coat, hands: M.skin, legs: 0x2e3238,
      hair: (hb, d, k, v) => { for (const sd of [-1, 1]) hb.cyl(sd * 0.4 * k, 0.22 * v, 0, 0.12 * k, 0.3 * v, M.orange, { seg: 8 }); hb.box(0, d.headH - 0.03, 0, 0.1 * k, 0.1 * k, 0.84 * k, M.orange); },
      extra: (b, d) => { const s = d.s; b.box(0, 0.86 * s, -0.16 * s, 0.82 * s, 0.16 * s, 0.26 * s, M.coat); b.box(0, 0.05 * s, -0.25 * s * d.D, 0.92 * s, 0.5 * s, 0.06 * s, M.coat); },
      arm: (ab, sd, d) => ab.box(0, -0.52 * d.s, 0, 0.255 * d.s, 0.08 * d.s, 0.285 * d.s, 0x3a2a20),
    });
    const s = rig.dims.s;
    const mk = (arm) => {
      const g = prop(arm, 0, HAND * s, 0, (b) => {
        b.box(0, -0.06, 0.05, 0.1, 0.12, 0.2, 0x3a3e46);
        b.boxM(mat4(0, -0.3, 0.06, 0, 0, 0, 0.12, 0.42, 0.14), 0x5a6068);
        b.boxM(mat4(0, -0.3, 0.135, 0, 0, 0, 0.06, 0.3, 0.02), M.orange);
        b.cyl(0, -0.62, 0.06, 0.04, 0.12, 0x2a2e34, { seg: 6 });
      }, 'blaster');
      g.visible = false; return g;
    };
    const gL = mk(rig.armL), gR = mk(rig.armR);
    rig.fx = (name, f, t) => {
      const w = name === 'win', r = w || name === 'use' || name === 'throwF';
      vis(gL, w); vis(gR, r);
      if (w) { gL.rotation.x = -t * 14; gR.rotation.x = -t * 14 + 1.5; } else gR.rotation.x = 0;
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Gamora
const gamora = {
  id: 'gamora', name: 'Gamora', blurb: 'Deadliest woman alive', weight: 'light', color: 0x3d9a4a,
  voice: { kind: 'human', pitch: 1.25 }, style: { cheer: 'point', win: 'wave', trick: 'twist' },
  gestures: {
    // two sword slashes, then the blade held up
    cheer: (f, t) => {
      if (f < 0.65) { const ph = (f / 0.325) % 1, p = ease(ph / 0.7); return { rx: -2.75 + p * 2.1, rz: -0.1, ty: -0.3 + p * 0.55, hx: -0.1, tz: 0.05 }; }
      return { rx: -1.55, rz: -0.05, hx: -0.15, hy: -0.2, ty: -0.1 };
    },
    win: (f, t) => ({ rx: -2.3, rz: -0.25, lx: -1.0, lz: 0.6, hx: -0.2, hy: S(t * 2) * 0.3, by: abs(S(t * 5)) * 0.04 }),
    use: (f) => ({ rx: -2.75 + ease(f) * 2.1, rz: -0.1, hx: -0.1 }),
  },
  build() {
    const { face, decal } = mapMats('gamora');
    const hairC = 0x3a1020;
    const rig = hero({
      name: 'gamora', face, decal, top: hairC, skin: M.gamora, torso: 0x2a2228, arms: 0x2a2228, hands: M.gamora, legs: 0x2a2228,
      hair: (hb, d, k, v) => {
        hb.sphere(0, 0.58 * v, 0, 0.44 * k, hairC, { sy: 0.45 });
        hb.box(0, -0.55 * v, -0.22 * k, 0.9 * k, 1.0 * v, 0.36 * k, hairC);
        hb.box(0, -0.8 * v, -0.22 * k, 0.92 * k, 0.3 * v, 0.38 * k, 0xc0306a);
      },
    });
    const s = rig.dims.s;
    const sword = prop(rig.armR, 0, HAND * s, 0, (b) => {
      b.box(0, -0.06, -0.24, 0.07, 0.1, 0.24, 0x2a2e34);
      b.box(0, -0.12, 0.1, 0.08, 0.24, 0.06, M.gold);
      b.boxM(mat4(0, 0, 0.7, 0, 0, 0, 0.05, 0.17, 1.1), M.silver);
      b.boxM(mat4(0, 0.04, 1.3, 0.5, 0, 0, 0.05, 0.12, 0.18), M.silver);
    }, 'sword');
    sword.visible = false;
    rig.fx = (name, f, t) => {
      const on = name === 'cheer' || name === 'win' || name === 'use' || name === 'taunt';
      vis(sword, on);
      sword.rotation.y = name === 'win' ? t * 12 : 0;
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Drax
const drax = {
  id: 'drax', name: 'Drax', blurb: 'Literally the Destroyer', weight: 'heavy', color: 0xa8141a,
  voice: { kind: 'deep', pitch: 0.85 }, style: { cheer: 'flex', win: 'flex', trick: 'arms' },
  gestures: {
    // knives up, then a huge belly laugh
    cheer: (f, t) => (f < 0.42
      ? { lx: -2.4, rx: -2.4, lz: 0.45, rz: -0.45, hx: -0.2, tx: -0.08 }
      : { lx: -0.65, rx: -0.65, lz: 1.45, rz: -1.45, hx: -0.55 + S(t * 30) * 0.07, tx: -0.2 + S(t * 15) * 0.04, by: abs(S(t * 15)) * 0.05 }),
    win: (f, t) => ({ lx: -0.6, rx: -0.6, lz: 1.5, rz: -1.5, hx: -0.5 + S(t * 28) * 0.07, tx: -0.18, ty: S(t * 3) * 0.25, by: abs(S(t * 14)) * 0.05 }),
  },
  build() {
    const { face, decal } = mapMats('drax');
    const rig = hero({
      name: 'drax', s: 1.45, wide: 1.22, deep: 1.12, face, decal, top: M.drax, skin: M.drax, torso: M.drax, arms: M.drax, hands: M.drax, legs: 0x3a2a20,
      extra: (b, d) => { const s = d.s; for (const sd of [-1, 1]) b.sphere(sd * 0.28 * s, 0.9 * s, 0.02 * s, 0.2 * s, M.drax, { sy: 0.7 }); },
      arm: (ab, sd, d) => { const s = d.s; for (let k = 0; k < 2; k++) ab.boxM(mat4(0, -0.3 * s - k * 0.14 * s, 0.135 * s, 0, 0, 0.4, 0.04 * s, 0.22 * s, 0.02 * s), 0xa8141a); ab.sphere(0, -0.3 * s, 0, 0.16 * s, M.drax, { sy: 1.4 }); },
    });
    const s = rig.dims.s;
    const mk = (arm) => {
      const g = prop(arm, 0, HAND * s, 0, (b) => {
        b.box(0, -0.2, 0, 0.12, 0.08, 0.2, 0x3a2a20);
        b.boxM(mat4(0, -0.5, 0.03, 0.12, 0, 0, 0.05, 0.6, 0.16), M.silver);
        b.boxM(mat4(0, -0.84, 0.1, 0.6, 0, 0, 0.05, 0.18, 0.1), M.silver);
      }, 'knife');
      g.visible = false; return g;
    };
    const kL = mk(rig.armL), kR = mk(rig.armR);
    rig.fx = (name, f) => {
      const on = name === 'cheer' || name === 'win' || name === 'use' || name === 'throwF';
      vis(kL, on); vis(kR, on);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Rocket
const rocket = {
  id: 'rocket', name: 'Rocket', blurb: "Ain't no raccoon", weight: 'light', color: 0xd9641c,
  voice: { kind: 'squeak', pitch: 1.45 }, style: { cheer: 'fist', win: 'fist', trick: 'twist' },
  gestures: {
    // hoists the big blaster and lets rip
    cheer: (f, t) => ({ rx: -2.4 + shot((f * 3) % 1, 0.05, 0.6) * 0.2, rz: -0.1, lx: -2.2, lz: -0.2, hx: -0.25, hz: 0.12, by: abs(S(t * 18)) * 0.04 }),
    win: (f, t) => ({ rx: -2.6, rz: -0.15, lx: UP + S(t * 12) * 0.3, lz: 0.3, hx: -0.3, hz: S(t * 6) * 0.15, by: abs(S(t * 12)) * 0.06 }),
    use: (f) => ({ rx: -1.6, rz: 0.1, lx: -1.5, lz: -0.3, hx: -0.05 }),
  },
  build() {
    const fur = 0x8a6a50, dk = 0x3a2a20, cream = 0xe8dcc0;
    const root = new THREE.Group(); root.name = 'rocket';
    // booster seat
    const bb = new BrickBuilder(1);
    bb.box(0, -0.4, -0.05, 0.9, 0.62, 0.8, C.dkgray);
    root.add(bb.build({ name: 'driver-booster' }));
    const torso = new THREE.Group(); root.add(torso);
    const tb = new BrickBuilder(1);
    const y0 = 0.22;
    for (const sd of [-1, 1]) { tb.box(sd * 0.15, y0 - 0.02, 0.18, 0.22, 0.2, 0.5, M.orange); tb.box(sd * 0.15, y0 - 0.02, 0.4, 0.24, 0.12, 0.12, dk); }
    tb.box(0, y0, 0, 0.62, 0.62, 0.44, M.orange);
    tb.box(0, y0 + 0.04, 0, 0.64, 0.08, 0.46, dk);
    tb.box(0, y0 + 0.3, 0.215, 0.3, 0.2, 0.02, 0x2a3a6a);
    tb.box(0, y0 + 0.6, 0, 0.4, 0.08, 0.36, fur);
    torso.add(tb.build({ name: 'driver-torso' }));
    // head
    const head = new THREE.Group(); head.position.set(0, y0 + 0.66, 0.02); torso.add(head);
    const hb = new BrickBuilder(1);
    hb.box(0, 0, 0, 0.62, 0.46, 0.5, fur);
    hb.box(0, 0.2, 0.25, 0.64, 0.12, 0.04, dk);
    hb.box(0, 0.04, 0.25, 0.3, 0.16, 0.18, cream);
    hb.box(0, 0.14, 0.34, 0.1, 0.07, 0.04, dk);
    for (const sd of [-1, 1]) {
      hb.sphere(sd * 0.14, 0.27, 0.25, 0.065, 0xffffff); hb.sphere(sd * 0.14, 0.27, 0.3, 0.035, dk);
      hb.box(sd * 0.3, 0.02, 0.1, 0.08, 0.2, 0.3, cream);
      hb.cone(sd * 0.2, 0.44, -0.02, 0.13, 0.26, fur, { seg: 4 }); hb.cone(sd * 0.2, 0.45, 0.02, 0.07, 0.16, dk, { seg: 4 });
    }
    head.add(hb.build({ name: 'driver-head' }));
    // arms
    const arms = [];
    for (const sd of [1, -1]) {
      const pv = new THREE.Group(); pv.position.set(sd * 0.36, y0 + 0.52, 0);
      const ab = new BrickBuilder(1);
      ab.sphere(0, 0, 0, 0.1, M.orange);
      ab.box(0, -0.34, 0, 0.14, 0.34, 0.15, M.orange);
      ab.sphere(0, -0.4, 0, 0.08, fur);
      pv.add(ab.build({ name: 'driver-arm' }));
      torso.add(pv); arms.push(pv);
    }
    // bushy tail over the seat back
    const tail = new THREE.Group(); tail.position.set(0, y0 + 0.1, -0.22); torso.add(tail);
    const tlb = new BrickBuilder(1);
    for (let k = 0; k < 6; k++) tlb.boxM(mat4(0, 0.14 + k * 0.14, -0.1 - k * 0.12, -0.6 + k * 0.1, 0, 0, 0.26 + (k > 2 ? 0.04 : 0), 0.26, 0.26), k % 2 ? dk : fur);
    tail.add(tlb.build({ name: 'driver-tail' }));
    // the big gun along the arm, and its muzzle flash
    const gun = prop(arms[1], 0, -0.4, 0, (b) => {
      b.box(0, -0.06, 0.12, 0.12, 0.16, 0.16, dk);
      b.boxM(mat4(0, -0.42, 0.16, 0, 0, 0, 0.3, 0.9, 0.34), 0x5a6068);
      b.boxM(mat4(0, -0.4, 0.38, 0, 0, 0, 0.18, 0.62, 0.12), 0x3a3e46);
      for (const sd of [-1, 1]) b.boxM(mat4(sd * 0.17, -0.3, 0.16, 0, 0, 0, 0.06, 0.4, 0.2), M.orange);
      b.cyl(0, -1.12, 0.16, 0.11, 0.26, 0x3a3e46, { seg: 8 });
      b.boxM(mat4(0, -0.66, 0.335, 0, 0, 0, 0.14, 0.14, 0.03), 0, { mat: glow(0x3ad0ff, 2.5) });
    }, 'gun');
    gun.visible = false;
    const flash = beam(gun, -1.14, 0x6ae0ff, { r0: 0.1, r1: 0.26, flash: 0.26 });
    const rig = { root, torso, head, armL: arms[0], armR: arms[1], armLen: 0.42, height: y0 + 0.66 + 0.7, width: 0.95, tail };
    rig.fx = (name, f, t) => {
      const on = name === 'cheer' || name === 'win' || name === 'use' || name === 'throwF';
      vis(gun, on);
      let k = 0;
      if (name === 'cheer') k = shot((f * 3) % 1, 0.05, 0.6) * (f > 0.1 ? 1.8 : 0);
      else if (name === 'use') k = shot(f, 0.2, 0.9) * 3;
      else if (name === 'win') k = shot((t * 2) % 1, 0.05, 0.5) * 1.5;
      flash.set(on ? k : 0, 1 + S(t * 50) * 0.3);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Groot
const groot = {
  id: 'groot', name: 'Groot', blurb: 'I am Groot', weight: 'heavy', color: 0x6ab04a,
  voice: { kind: 'beast', pitch: 0.6 }, style: { cheer: 'both', win: 'both', trick: 'arms' },
  gestures: {
    // "I AM GROOT!" — arms up, branches sprouting
    cheer: (f, t) => ({ lx: -2.45, rx: -2.45, lz: 0.75, rz: -0.75, hx: -0.25, hz: S(t * 4) * 0.15, tx: -0.1, by: abs(S(t * 6)) * 0.05 }),
    // the dancing Groot
    win: (f, t) => {
      const b = S(t * 6);
      return { lx: -1.5 + b * 0.8, rx: -1.5 - b * 0.8, lz: 0.6, rz: -0.6, tz: b * 0.18, ty: b * 0.15, hz: -b * 0.2, hx: -0.15 + abs(b) * 0.1, by: abs(b) * 0.06 };
    },
  },
  build() {
    const { face } = mapMats('groot');
    const bark = M.groot, dk = M.grootDk, leaf = 0x6ab04a, leaf2 = 0x3a8a3a;
    const rig = hero({
      name: 'groot', s: 1.5, wide: 0.95, deep: 0.95, headR: 0.27, headH: 0.62, face, top: bark, skin: bark, torso: bark, arms: bark, hands: dk, legs: dk,
      hair: (hb, d, k) => {
        const H = d.headH, r = d.headR;
        for (let j = 0; j < 7; j++) { const a = j / 7 * 6.28; hb.boxM(mat4(Math.sin(a) * r * 0.75, H + 0.12 + (j % 2) * 0.08, Math.cos(a) * r * 0.75 - 0.05, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5, 0.09, 0.36, 0.09), j % 2 ? dk : bark); }
        for (let j = 0; j < 4; j++) hb.sphere(-0.3 + j * 0.2, H + 0.12 + (j % 2) * 0.12, -0.08, 0.1, j % 2 ? leaf : leaf2);
        hb.box(0, -0.02, 0.33, 0.06, 0.25, 0.04, dk);
      },
      extra: (b, d) => {
        const s = d.s;
        for (let j = 0; j < 4; j++) b.boxM(mat4(-0.21 * s + j * 0.14 * s, 0.6 * s - (j % 2) * 0.08 * s, 0.215 * s, 0, 0, 0.07 * (j % 2 ? 1 : -1), 0.045 * s, 0.55 * s, 0.04 * s), dk);
        b.sphere(0.32 * s, 0.98 * s, 0.05, 0.1 * s, leaf); b.sphere(-0.25 * s, 0.5 * s, 0.21 * s, 0.07 * s, leaf2);
      },
      arm: (ab, sd, d) => { const s = d.s; for (let j = -1; j <= 1; j++) ab.boxM(mat4(j * 0.06 * s, -0.76 * s, 0.02, 0, 0, j * 0.3, 0.04 * s, 0.14 * s, 0.05 * s), dk); },
    });
    const s = rig.dims.s;
    const mk = (arm, sd) => {
      const g = prop(arm, sd * 0.1 * s, -0.4 * s, 0, (b) => {
        b.boxM(mat4(sd * 0.18, 0.05, 0.05, 0, 0, -sd * 0.9, 0.06, 0.38, 0.06), dk);
        b.boxM(mat4(sd * 0.12, -0.15, -0.1, -0.5, 0, -sd * 0.5, 0.05, 0.3, 0.05), bark);
        b.sphere(sd * 0.34, 0.16, 0.05, 0.11, leaf); b.sphere(sd * 0.2, -0.28, -0.14, 0.09, leaf2); b.sphere(sd * 0.08, 0.1, 0.18, 0.08, leaf);
        b.sphere(sd * 0.36, 0.24, 0.12, 0.05, C.pink);
      }, 'sprouts');
      g.visible = false; return g;
    };
    const sL = mk(rig.armL, 1), sR = mk(rig.armR, -1);
    rig.fx = (name, f) => {
      let k = 0;
      if (name === 'cheer') k = ease(seg(f, 0.12, 0.45)) * (1 - ease(seg(f, 0.88, 1)));
      else if (name === 'win') k = 1;
      vis(sL, k > 0.02); vis(sR, k > 0.02);
      if (k > 0.02) { sL.scale.setScalar(k); sR.scale.setScalar(k); }
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Loki
const loki = {
  id: 'loki', name: 'Loki', blurb: 'God of Mischief', weight: 'medium', color: 0x1f6a3a,
  voice: { kind: 'human', pitch: 1.05 }, style: { cheer: 'point', win: 'bow', trick: 'twist' },
  gestures: {
    // points the scepter, gem flaring, and cackles
    cheer: (f, t) => ({ rx: -1.65, rz: 0.12, ty: -0.2, hz: 0.18, hx: -0.18 + S(t * 24) * 0.05, tz: 0.05, by: abs(S(t * 12)) * 0.03 }),
    // a theatrical bow
    win: (f, t) => { const b = bump(f); return { tx: 0.45 * b, hx: 0.25 * b - 0.1, rx: -0.6 - 1.0 * (1 - b), rz: -0.9 + 0.5 * b, lx: -0.3 - 0.5 * b, lz: 0.2 }; },
    use: (f) => ({ rx: -1.65, rz: 0.1, hx: -0.12 }),
  },
  build() {
    const { face, decal } = mapMats('loki');
    const gold = 0xd8a830;
    const rig = hero({
      name: 'loki', extraHeight: 0.4, face, decal, top: gold, skin: 0xf2d8c0, torso: 0x1f5a34, arms: 0x1f5a34, hands: M.black, legs: M.black,
      hair: (hb, d, k, v) => {
        hb.sphere(0, 0.62 * v, 0, 0.43 * k, gold, { sy: 0.4 });
        for (const sd of [-1, 1]) for (let j = 0; j < 6; j++) hb.boxM(mat4(sd * (0.26 + j * 0.03) * k, (0.72 + j * 0.17) * v, (0.12 - j * j * 0.03) * k, -0.3 - j * 0.24, 0, 0, (0.12 - j * 0.012) * k, 0.24 * v, 0.13 * k), gold);
        hb.box(0, -0.32 * v, -0.22 * k, 0.9 * k, 0.95 * v, 0.38 * k, M.black);
      },
      extra: (b, d) => { const s = d.s; b.boxM(mat4(0, 0.6 * s, -0.24 * s * d.D - 0.03, 0.08, 0, 0, 0.98 * s, 0.98 * s, 0.06), M.loki); for (const sd of [-1, 1]) b.sphere(sd * 0.3 * s, 0.92 * s, -0.02, 0.13 * s, gold, { sy: 0.6 }); },
      arm: (ab, sd, d) => ab.box(0, -0.5 * d.s, 0, 0.255 * d.s, 0.1 * d.s, 0.285 * d.s, gold),
    });
    const s = rig.dims.s;
    const sc = prop(rig.armR, 0, HAND * s, 0, (b) => {
      b.box(0, -1.0, 0, 0.06, 1.3, 0.06, gold);
      b.boxM(mat4(0, -1.08, 0.09, 0.45, 0, 0, 0.05, 0.3, 0.05), gold);
      b.boxM(mat4(0, -1.08, -0.09, -0.45, 0, 0, 0.05, 0.3, 0.05), gold);
      b.box(0, -1.08, 0, 0.1, 0.12, 0.1, 0x8a9098);
    }, 'scepter');
    sc.visible = false;
    const gem = beam(sc, -0.94, 0x3ab0ff, { r0: 0.02, r1: 0.02, flash: 0.1 });
    rig.fx = (name, f, t) => {
      const on = name === 'cheer' || name === 'win' || name === 'use' || name === 'throwF' || name === 'taunt';
      vis(sc, on);
      let k = 0.05, p = 1;
      if (name === 'cheer' || name === 'use') { k = 0.05 + shot(f, 0.2, 0.9) * 3.5; p = 1.5 + S(t * 30) * 0.4; }
      gem.set(on ? k : 0, p);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Thanos
const thanos = {
  id: 'thanos', name: 'Thanos', blurb: 'Inevitable', weight: 'heavy', color: 0x7d4f94,
  voice: { kind: 'deep', pitch: 0.6 }, style: { cheer: 'fist', win: 'fist', trick: 'arms' },
  gestures: {
    // *snap*
    cheer: (f, t) => {
      const look = f < 0.55 ? 0.4 : 0.4 * (1 - ease(seg(f, 0.6, 0.8)));
      return { lx: -2.55, lz: 0.32, hy: look, hx: -0.12, tx: -0.05 + (f > 0.48 && f < 0.56 ? 0.06 : 0), tz: -0.05 };
    },
    win: (f, t) => ({ lx: -2.55, lz: 0.32, hy: 0.25, hx: -0.1 + (f > 0.5 ? S((f - 0.5) * 12) * 0.08 : 0), rx: -0.8, rz: -0.1, tx: -0.08 }),
    use: (f) => ({ lx: -2.55, lz: 0.32, hy: 0.3 }),
  },
  build() {
    const { face, decal } = mapMats('thanos');
    const gold = 0xd8a830, armor = 0x2a3a6a;
    const rig = hero({
      name: 'thanos', s: 1.58, wide: 1.22, deep: 1.2, face, decal, top: M.thanos, skin: M.thanos, torso: armor, arms: armor, hands: M.thanos, legs: armor,
      extra: (b, d) => { const s = d.s; b.boxM(mat4(0, 0.97 * s, 0, 0, 0, 0, 0.62 * s, 0.1 * s, 0.4 * s), gold); },
      arm: (ab, sd, d) => {
        const s = d.s;
        ab.box(0, -0.12 * s, 0, 0.3 * s, 0.2 * s, 0.34 * s, gold);
        if (sd > 0) { ab.cyl(0, -0.74 * s, 0, 0.135 * s, 0.4 * s, gold, { seg: 10 }); ab.box(0, -0.46 * s, 0, 0.29 * s, 0.1 * s, 0.31 * s, gold); }
      },
    });
    const s = rig.dims.s;
    // the Infinity Stones on the gauntlet (left hand)
    const st = [0x2a6aff, 0xffd020, 0xff2020, 0xa040ff, 0x20ff60];
    const g = gems(st.map((c, k) => (k < 4 ? [-0.1 * s + k * 0.067 * s, -0.66 * s, 0.13 * s, 0.032 * s, c] : [0, -0.56 * s, 0.135 * s, 0.045 * s, c])).concat([[0.13 * s, -0.6 * s, 0.02, 0.04 * s, 0xff8a10]]));
    rig.armL.add(g);
    const snap = beam(rig.armL, -0.78 * s, 0xffd890, { r0: 0.01, r1: 0.01, flash: 0.14 });
    rig.fx = (name, f, t) => {
      let k = 0;
      if (name === 'cheer') k = bump(seg(f, 0.48, 0.75));
      else if (name === 'win') k = bump(seg((t % 1.6) / 1.6, 0.45, 0.7));
      else if (name === 'use') k = bump(seg(f, 0.3, 0.8));
      snap.set(k > 0.02 ? 0.05 : 0, 0.6 + k * 2.6);
    };
    return rig;
  },
};

// ---------------------------------------------------------------------------- Ultron
const ultron = {
  id: 'ultron', name: 'Ultron', blurb: 'No strings on me', weight: 'medium', color: 0xff3a1a,
  voice: { kind: 'robot', pitch: 0.8 }, style: { cheer: 'point', win: 'both', trick: 'superman' },
  gestures: {
    // twin red blasts
    cheer: (f) => {
      const r = shot(f, 0.12, 0.5), l = shot(f, 0.45, 0.85);
      return { rx: -1.7 + r * 0.25, rz: 0.06, lx: -1.7 + l * 0.25, lz: -0.06, hz: 0.2, hx: -0.1, tx: -0.05 };
    },
    // "there are no strings on me"
    win: (f, t) => ({ lx: -0.35 + S(t * 1.5) * 0.15, rx: -0.35 - S(t * 1.5) * 0.15, lz: 1.4, rz: -1.4, hz: 0.25 + S(t * 1.5) * 0.1, hx: -0.15, by: 0.1 + S(t * 2) * 0.05 }),
    use: (f) => ({ rx: -1.7, rz: 0.06, hz: 0.15 }),
  },
  build() {
    const { face, decal } = mapMats('ultron');
    const rig = hero({
      name: 'ultron', face, decal, top: 0xa8aeb6, skin: 0xa8aeb6, torso: 0xa8aeb6, arms: 0xa8aeb6, hands: 0x6a7078, legs: 0x8a9098,
      hair: (hb, d, k, v) => { for (let j = -2; j <= 2; j++) hb.boxM(mat4(j * 0.14 * k, d.headH + 0.04, -0.1 * k, -0.5, 0, j * 0.2, 0.08 * k, 0.32 * v, 0.08 * k), 0x8a9098); },
      arm: (ab, sd, d) => { ab.box(0, -0.3 * d.s, 0, 0.26 * d.s, 0.05 * d.s, 0.29 * d.s, 0x6a7078); ab.sphere(0, -0.02 * d.s, 0, 0.15 * d.s, 0x8a9098); },
    });
    const s = rig.dims.s;
    const bR = beam(rig.armR, TIP * s, 0xff3a1a, { r0: 0.05, r1: 0.14, flash: 0.18 });
    const bL = beam(rig.armL, TIP * s, 0xff3a1a, { r0: 0.05, r1: 0.14, flash: 0.18 });
    rig.fx = (name, f, t) => {
      let r = 0, l = 0;
      if (name === 'cheer') { r = shot(f, 0.12, 0.5) * 5; l = shot(f, 0.45, 0.85) * 5; }
      else if (name === 'use' || name === 'throwF') r = shot(f, 0.25, 0.95) * 5;
      bR.set(r, 1 + S(t * 43) * 0.3); bL.set(l, 1 + S(t * 43) * 0.3);
    };
    return rig;
  },
};

export default [
  spiderman, ironman, captain, thor, hulk, widow, hawkeye, panther, strange, wanda, antman,
  starlord, gamora, drax, rocket, groot,
  loki, thanos, ultron,
];
