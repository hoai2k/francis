// Marvel drivers. Faces, torso prints and colours come from the
// "Avengers Brick Assemble" map figures; each driver has a signature cheer/win with
// effect parts (webs, repulsors, Mjolnir lightning, mandalas, Infinity snap…) run by rig.fx.
import { THREE, BrickBuilder, C, plastic, rod, taperGeo } from './kit.js';
import { vertexColorPlastic } from '../lego.js';
import {
  M, S, PI, UP, ease, bump, seg, vis, shot, mapMats, faceMat, decalMat, shieldMesh, mandalaMat,
  fxMat, glow, hero, prop, beam, gems, spellDisc, mat4, plane, cached, sphere as unitSphere,
} from './marvel-parts.js';

const abs = Math.abs;
const HAND = -0.6, TIP = -0.7;                    // grip / fingertip along the arm (× s)

// ---- print helpers (Hawkeye, Gamora, Drax) -----------------------------------------------
// A face print drawn in true proportions: the head canvas wraps the whole cylinder, so it is
// squashed sideways here. draw(g, X, h) gets x relative to the face centre (±X = the seam at
// the back of the head) and y from the top of the head (0) to the chin (h = 128).
function printFace(key, { skin, headR = 0.3, headH = 0.5 }, draw) {
  const k = headH / (PI * headR);
  return faceMat(key, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, 0); g.scale(k, 1);
    g.lineCap = 'round'; g.lineJoin = 'round';
    draw(g, w / 2 / k, h);
    g.restore();
  });
}
// minifig eye: dark oval with a white glint
function eye(g, x, y, rx, ry, col = '#16141a') {
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x + rx * 0.3, y - ry * 0.35, Math.max(1.6, rx * 0.32), 0, 7); g.fill();
}
const strokePath = (g, col, wd, pts) => {
  g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 4) g.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
  g.stroke();
};
// a smooth ellipsoid (sculpted hair, pads)
const blob = (b, x, y, z, sx, sy, sz, c, rx = 0, ry = 0, rz = 0) => b.addMatrix(unitSphere(), typeof c === 'number' ? plastic(c) : c, mat4(x, y, z, rx, ry, rz, sx, sy, sz));
// a torso print plane on the front (or back) of a seatedFig torso
function torsoPrint(b, d, mat, back = false) {
  const s = d.s;
  b.addMatrix(plane(), mat, mat4(0, d.chestY + 0.41 * s, (back ? -1 : 1) * (0.22 * s * d.D + 0.012), back ? 0.024 : -0.024, back ? PI : 0, 0, 0.92 * s * d.W, 0.82 * s, 1));
}

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
    const hairC = 0xb08a52, suit = 0x1d1a26, purple = 0x6a32a8, dkPurple = 0x48226e, strap = 0x2e2620;
    const skinS = '#f2c9a0', hairS = '#b08a52';
    const face = printFace('hawkK', { skin: skinS }, (g, X, h) => {
      // short sandy crop: hairline, sideburns and the back of the head
      g.fillStyle = hairS;
      g.beginPath(); g.moveTo(-X, 0); g.lineTo(X, 0); g.lineTo(X, 100); g.lineTo(78, 92); g.lineTo(70, 30);
      g.quadraticCurveTo(30, 22, 4, 30); g.quadraticCurveTo(-30, 22, -70, 30); g.lineTo(-78, 92); g.lineTo(-X, 100); g.closePath(); g.fill();
      for (const sd of [-1, 1]) g.fillRect(sd > 0 ? 58 : -70, 30, 12, 26);
      for (const sd of [-1, 1]) {
        strokePath(g, '#6a4a22', 6.5, [sd * 42, 45, sd * 26, 43, sd * 10, 50]);   // low, focused brows
        eye(g, sd * 23, 62, 6, 7.5);
        g.fillStyle = skinS; g.fillRect(sd * 23 - 9, 51, 18, 5);                // squint: lid cuts the top
        strokePath(g, '#2a1a12', 2.5, [sd * 31, 57, sd * 23, 55, sd * 15, 57]);
      }
      strokePath(g, '#c08a64', 3, [-2, 68, 3, 78, -4, 82]);                       // nose
      strokePath(g, '#3a2418', 4.5, [-15, 98, 2, 101, 16, 92]);                    // confident smirk
      strokePath(g, '#c08a64', 2.5, [-10, 110, 0, 112, 10, 110]);                  // chin
    });
    const decal = decalMat('hawkK', (g, w, h) => {
      g.fillStyle = '#1d1a26'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6a32a8';
      // purple yoke across the shoulders, dipping to a V
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, 26); g.lineTo(64, 46); g.lineTo(0, 26); g.closePath(); g.fill();
      // purple side panels
      g.beginPath(); g.moveTo(12, 36); g.lineTo(30, 42); g.lineTo(36, h); g.lineTo(8, h); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(w - 12, 36); g.lineTo(w - 30, 42); g.lineTo(w - 36, h); g.lineTo(w - 8, h); g.closePath(); g.fill();
      g.fillStyle = skinS; g.beginPath(); g.moveTo(50, 0); g.lineTo(78, 0); g.lineTo(64, 18); g.closePath(); g.fill();
      g.strokeStyle = '#3a1c5c'; g.lineWidth = 3;                     // yoke seam
      g.beginPath(); g.moveTo(0, 28); g.lineTo(64, 48); g.lineTo(w, 28); g.stroke();
      g.strokeStyle = '#8a8e96'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 48); g.lineTo(64, h); g.stroke();   // zip
      g.strokeStyle = '#2e2a36'; g.lineWidth = 2;                     // tactical seams
      for (const y of [70, 92]) { g.beginPath(); g.moveTo(36, y); g.lineTo(92, y); g.stroke(); }
    });
    const rig = hero({
      name: 'hawkeye', wide: 1.06, face, decal, top: hairC, skin: M.skin, torso: suit, arms: M.skin, hands: M.black, legs: suit, hips: suit,
      hair: (hb, d) => {
        const r = d.headR, H = d.headH;
        blob(hb, 0, 0.88 * H, -0.04 * r, 1.04 * r, 0.27 * H, 1.04 * r, hairC);
        // short spiky crop, flicked up at the front
        const cone = cached('mvSpike', () => new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0)), m = plastic(hairC);
        for (let j = -3; j <= 3; j++) hb.addMatrix(cone, m, mat4(j * 0.22 * r, 0.96 * H, (0.62 - abs(j) * 0.09) * r, 0.75, 0, -j * 0.2, 0.17 * r, 0.24 * H, 0.17 * r));
        for (let j = -2; j <= 2; j++) hb.addMatrix(cone, m, mat4(j * 0.3 * r, 1.04 * H, 0.15 * r, 0.35, 0, -j * 0.3, 0.2 * r, 0.2 * H, 0.2 * r));
      },
      extra: (b, d) => {
        const s = d.s, W = d.W, D = d.D, zf = 0.22 * s * D + 0.025, zb = -0.22 * s * D - 0.025;
        // belt
        b.box(0, d.chestY - 0.015 * s, 0, 0.95 * s * W, 0.1 * s, 0.49 * s * D, 0x15131a);
        b.box(0, d.chestY - 0.005 * s, 0.245 * s * D, 0.13 * s, 0.08 * s, 0.03 * s, M.silver);
        // quiver strap: right shoulder across the chest to the left hip, and across the back
        for (const z of [zf, zb]) b.boxM(mat4(0.04 * s, 0.58 * s, z, 0, 0, 0.72, 0.1 * s, 1.0 * s, 0.03 * s), strap);
        b.boxM(mat4(-0.27 * s * W, 0.97 * s, 0, 0, 0, -0.3, 0.12 * s, 0.03 * s, 0.48 * s * D), strap);
        b.boxM(mat4(-0.1 * s, 0.78 * s, zf + 0.012, 0, 0, 0.72, 0.1 * s, 0.07 * s, 0.03 * s), M.silver);
        // the quiver: over the right shoulder, arrows bristling with purple fletching
        const z0 = -0.23 * s * D - 0.13 * s;
        const A = [0.22 * s, 0.26 * s, z0], B = [-0.22 * s, 1.12 * s, z0];
        const at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, z0];
        rod(b, A, B, 0.13 * s, 0x2a2434, 12);
        for (const [t0, t1, rr, c] of [[-0.03, 0.04, 0.115, purple], [0.14, 0.2, 0.137, purple], [0.8, 0.86, 0.137, purple], [0.96, 1.02, 0.142, dkPurple]]) rod(b, at(t0), at(t1), rr * s, c, 12);
        const ang = Math.atan2(A[0] - B[0], B[1] - A[1]);
        for (let j = 0; j < 5; j++) {
          const off = (j - 2) * 0.05 * s, sp = (j - 2) * 0.09, len = (0.34 + (j % 2) * 0.08) * s;
          const base = at(0.85), dir = [-Math.sin(ang + sp), Math.cos(ang + sp)];
          const p0 = [base[0] + off * Math.cos(ang), base[1] + off * Math.sin(ang), z0 + ((j % 3) - 1) * 0.05 * s];
          const p1 = [p0[0] + dir[0] * len, p0[1] + dir[1] * len, p0[2]];
          rod(b, p0, p1, 0.02 * s, 0x3a3e46, 5);
          const f = [p0[0] + dir[0] * (len - 0.09 * s), p0[1] + dir[1] * (len - 0.09 * s), p0[2]];
          for (const [vx, vz] of [[0.015, 0.11], [0.11, 0.015]]) b.boxM(mat4(f[0], f[1], f[2], 0, 0, ang + sp, vx * s, 0.14 * s, vz * s), j === 2 ? 0xe8e8ee : purple);
        }
      },
      arm: (ab, sd, d) => {
        const s = d.s;
        ab.sphere(0, 0.0, 0, 0.142 * s, suit, { sy: 0.8 });                             // cap sleeve
        ab.box(0, -0.2 * s, 0, 0.27 * s, 0.17 * s, 0.29 * s, suit);
        ab.box(0, -0.21 * s, 0, 0.275 * s, 0.035 * s, 0.295 * s, purple);
        ab.box(0, -0.53 * s, 0, 0.255 * s, 0.2 * s, 0.285 * s, M.black);                  // gauntlets
        if (sd > 0) ab.box(0, -0.52 * s, 0.13 * s, 0.17 * s, 0.17 * s, 0.04 * s, purple); // bow-arm guard
        else ab.box(0, -0.4 * s, 0, 0.26 * s, 0.03 * s, 0.29 * s, purple);
      },
    });
    const s = rig.dims.s;
    // recurve bow in the left fist: limbs along local Z, bulging forward (-Y)
    const bow = prop(rig.armL, 0, HAND * s, 0, (b) => {
      const pt = (u) => [0, 0.17 * u * u - 0.04, 0.66 * u];
      for (let i = 0; i < 8; i++) { const u0 = -1 + i / 4, u1 = u0 + 0.25; rod(b, pt(u0), pt(u1), 0.042, abs(u0 + 0.125) < 0.3 ? 0x2a2632 : purple, 6); }
      for (const sd of [-1, 1]) { rod(b, pt(sd), [0, 0.06, sd * 0.84], 0.035, 0x2a2632, 6); b.sphere(0, 0.06, sd * 0.84, 0.04, M.silver); }
      b.boxM(mat4(0, -0.05, 0, 0, 0, 0, 0.1, 0.16, 0.36), 0x2a2632);
      b.boxM(mat4(0.06, -0.05, 0.12, 0, 0, 0, 0.03, 0.08, 0.08), purple);
    }, 'bow');
    bow.visible = false;
    // the string, pulled back by scaling a V
    const str = prop(bow, 0, 0.13, 0, (b) => { rod(b, [0, 0, -0.66], [0, 1, 0], 0.012, C.white, 4); rod(b, [0, 0, 0.66], [0, 1, 0], 0.012, C.white, 4); }, 'string');
    const arrow = prop(bow, 0, 0.13, 0, (b) => {
      rod(b, [0, 0, 0], [0, -0.95, 0], 0.022, 0x3a3e46, 5);
      const cone = new THREE.ConeGeometry(0.06, 0.18, 4); b.addMatrix(cone, plastic(0x8a9098), mat4(0, -1.02, 0, PI, 0, 0)); cone.dispose();
      for (const ry of [0, PI / 2]) b.boxM(mat4(0, -0.08, 0, 0, ry, 0, 0.02, 0.16, 0.12), purple);
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

// a curved blade in the Y-Z plane, built segment by segment from (y, z). Direction angle a:
// 0 points down the arm (-Y), PI/2 points along +Z; da bends it a little more each segment.
// Ends in a diamond-section point. Returns nothing; colours: steel, fuller (or null).
const tipGeo = () => cached('mvBladeTip', () => new THREE.ConeGeometry(0.5, 1, 4).rotateZ(PI).translate(0, -0.5, 0));
function curvedBlade(b, y, z, a, da, n, L, w0, w1, t, steel, fuller, tipL = 0.2) {
  for (let i = 0; i < n; i++) {
    const w = w0 + (w1 - w0) * i / Math.max(1, n - 1);
    const dy = -Math.cos(a) * L, dz = Math.sin(a) * L;
    b.boxM(mat4(0, y + dy / 2, z + dz / 2, -a, 0, 0, t, L * 1.06, w), steel);
    if (fuller) b.boxM(mat4(0, y + dy / 2 + Math.sin(a) * w * 0.14, z + dz / 2 + Math.cos(a) * w * 0.14, -a, 0, 0, t * 1.2, L * 1.06, w * 0.22), fuller);
    y += dy; z += dz; a += da;
  }
  b.addMatrix(tipGeo(), plastic(steel), mat4(0, y, z, -a, 0, 0, t, tipL, w1 * 1.02));
}

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
    const skin = 0x45a84c, skinS = '#45a84c';
    const leather = 0x2a2026, wine = 0x5a0e24, silver = 0xd0d6de;
    // ombré hair: near-black roots → burgundy → crimson → magenta tips
    const hA = 0x2c0e1c, hB = 0x4e0f26, hC = 0x8c1638, hD = 0xc42656, hE = 0xe8468a;
    const face = printFace('gamoraK', { skin: skinS }, (g, X, h) => {
      g.fillStyle = '#26101a';
      g.fillRect(-X, 0, 2 * X, 22);
      g.fillRect(-X, 0, X - 72, h); g.fillRect(72, 0, X - 72, h);
      // side part sweeping across her right brow
      g.beginPath(); g.moveTo(-72, 20); g.lineTo(72, 20); g.lineTo(72, 30); g.quadraticCurveTo(30, 22, 8, 30);
      g.quadraticCurveTo(-34, 36, -72, 54); g.closePath(); g.fill();
      for (const sd of [-1, 1]) {
        strokePath(g, '#26101a', 5, [sd * 9, 49, sd * 22, 40, sd * 40, 46]);     // sharp arched brows
        eye(g, sd * 23, 61, 6.5, 8.5);
        strokePath(g, '#16141a', 3, [sd * 28, 54, sd * 36, 52, sd * 42, 48]);   // winged liner
        // Zehoberei markings: silver ridges along the cheekbones and at the temples
        strokePath(g, '#e8ecf2', 3, [sd * 13, 73, sd * 26, 79, sd * 40, 74]);
        strokePath(g, '#e8ecf2', 2.5, [sd * 22, 84, sd * 32, 88, sd * 44, 82]);
        g.fillStyle = '#e8ecf2';
        for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(sd * (46 + j * 2), 52 + j * 7, 2.2, 0, 7); g.fill(); }
      }
      strokePath(g, '#2a7a34', 2.5, [-4, 84, 0, 87, 4, 84]);                   // nose
      g.fillStyle = '#6a1230';                                                   // dark lips
      g.beginPath(); g.moveTo(-13, 98); g.quadraticCurveTo(-5, 92, 0, 95); g.quadraticCurveTo(5, 92, 13, 98);
      g.quadraticCurveTo(0, 106, -13, 98); g.fill();
    });
    const decal = decalMat('gamoraK', (g, w, h) => {
      g.fillStyle = '#2a2026'; g.fillRect(0, 0, w, h);
      g.fillStyle = skinS; g.beginPath(); g.moveTo(48, 0); g.lineTo(80, 0); g.lineTo(64, 30); g.closePath(); g.fill();
      // wine lapels with silver studs
      g.fillStyle = '#6a1430';
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 16, 0); g.lineTo(64 + sd * 34, 0); g.lineTo(64 + sd * 10, 52); g.lineTo(64, 34); g.closePath(); g.fill(); }
      // wrapped corset panel and lacing
      g.fillStyle = '#4e0c20'; g.beginPath(); g.moveTo(28, 64); g.lineTo(100, 64); g.lineTo(106, h); g.lineTo(22, h); g.closePath(); g.fill();
      g.fillStyle = '#2a2026'; g.beginPath(); g.moveTo(56, 64); g.lineTo(72, 64); g.lineTo(70, h); g.lineTo(58, h); g.closePath(); g.fill();
      g.strokeStyle = '#d0d6de'; g.lineWidth = 2;
      for (let y = 72; y < h; y += 11) { g.beginPath(); g.moveTo(56, y); g.lineTo(72, y + 6); g.moveTo(72, y); g.lineTo(56, y + 6); g.stroke(); }
      g.fillStyle = '#d0d6de';
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(64 + sd * (26 - k * 5), 8 + k * 13, 2.5, 0, 7); g.fill(); }
    });
    const rig = hero({
      name: 'gamora', wide: 0.88, face, decal, top: hA, skin, torso: leather, arms: leather, hands: skin, legs: 0x221a20, hips: leather,
      hair: (hb, d) => {
        const r = d.headR, H = d.headH;
        blob(hb, 0, 0.9 * H, -0.06 * r, 1.1 * r, 0.3 * H, 1.1 * r, hA);                       // crown
        blob(hb, -0.38 * r, 0.86 * H, 0.74 * r, 0.62 * r, 0.12 * H, 0.32 * r, hA, 0, 0, 0.38); // side-swept fringe
        for (const sd of [-1, 1]) {                                                         // curtains framing the face
          blob(hb, sd * 0.93 * r, 0.52 * H, -0.14 * r, 0.27 * r, 0.6 * H, 0.78 * r, hA);
          blob(hb, sd * 0.95 * r, 0.06 * H, -0.24 * r, 0.25 * r, 0.3 * H, 0.62 * r, hB);
        }
      },
      extra: (b, d) => {
        const s = d.s, W = d.W, D = d.D;
        b.box(0, d.chestY - 0.015 * s, 0, 0.95 * s * W, 0.1 * s, 0.49 * s * D, wine);          // belt
        b.box(0, d.chestY - 0.005 * s, 0.245 * s * D, 0.12 * s, 0.08 * s, 0.03 * s, silver);
        b.boxM(mat4(0, 0.99 * s, -0.12 * s, -0.25, 0, 0, 0.5 * s, 0.18 * s, 0.06 * s), leather); // high collar
        for (const sd of [-1, 1]) b.boxM(mat4(sd * 0.2 * s, 0.98 * s, -0.02 * s, 0, sd * 0.5, sd * -0.15, 0.06 * s, 0.16 * s, 0.24 * s), leather);
      },
      arm: (ab, sd, d) => {
        const s = d.s;
        blob(ab, sd * 0.02 * s, 0.04 * s, 0, 0.16 * s, 0.085 * s, 0.17 * s, wine, 0, 0, sd * -0.35);   // pauldron
        ab.box(0, -0.52 * s, 0, 0.245 * s, 0.17 * s, 0.27 * s, 0x420a1a);             // bracers
        ab.box(0, -0.45 * s, 0, 0.25 * s, 0.025 * s, 0.275 * s, silver);
      },
    });
    const s = rig.dims.s;
    // the long fall of hair down her back, one sculpted piece shaded root-to-tip
    const { headR: r, headH: H } = rig.dims;
    rig.head.add(new THREE.Mesh(cached(`gamoraHair${r},${H}`, () => {
      const g = new THREE.CylinderGeometry(1, 1, 1, 22, 14), p = g.attributes.position, n = p.count;
      const stops = [[0, hA], [0.3, hA], [0.5, hB], [0.7, hC], [0.86, hD], [1, hE]].map(([u, c]) => [u, new THREE.Color(c)]);
      const col = new Float32Array(n * 3), c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const x = p.getX(i), z = p.getZ(i), u = 0.5 - p.getY(i);
        const jag = u > 0.999 ? 0.13 * (0.5 + 0.5 * Math.cos(x * PI * 2.6)) : 0;
        const bulge = 1 + 0.1 * Math.sin(u * PI);
        p.setXYZ(i, x * r * (1.07 - 0.12 * u) * bulge, H * (1.02 - u * 1.9 - jag), z * r * 0.4 * bulge - r * (0.74 + 0.36 * u));
        let k = 1; while (k < stops.length - 1 && stops[k][0] < u + jag * 0.8) k++;
        const [u0, c0] = stops[k - 1], [u1, c1] = stops[k];
        c.copy(c0).lerp(c1, Math.min(1, Math.max(0, (u + jag * 0.8 - u0) / (u1 - u0))));
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    }), vertexColorPlastic()));
    // Godslayer: dark grip, gold guard with a red gem, long curved blade with a fuller
    const sword = prop(rig.armR, 0, HAND * s, 0, (b) => {
      b.sphere(0, 0, -0.33, 0.055, M.gold);
      b.boxM(mat4(0, 0, -0.16, 0, 0, 0, 0.075, 0.085, 0.3), 0x1c1a20);
      for (const z of [-0.25, -0.07]) b.boxM(mat4(0, 0, z, 0, 0, 0, 0.085, 0.095, 0.03), M.gold);
      b.boxM(mat4(0, 0.02, 0.02, 0, 0, 0, 0.1, 0.42, 0.07), M.gold);
      for (const sd of [-1, 1]) b.boxM(mat4(0, sd * 0.22, 0.07, sd * -0.6, 0, 0, 0.08, 0.06, 0.14), M.gold);
      b.sphere(0, 0.02, 0.02, 0.06, 0xc0103a);
      curvedBlade(b, 0.02, 0.05, PI / 2, 0.05, 5, 0.24, 0.2, 0.15, 0.045, M.silver, 0x5a606a, 0.26);
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
    const skin = 0x4f6a62, skinS = '#4f6a62', ink = 0xb8141c, inkS = '#c4161e', shade = 'rgba(18,34,30,0.42)';
    const pants = 0x3e2420, leather = 0x5a3424, headR = 0.27, headH = 0.47;
    const face = printFace('draxK', { skin: skinS, headR, headH }, (g, X, h) => {
      // tattoo lines from the crown, over the temples and cheekbones down to the jaw
      for (const sd of [-1, 1]) {
        strokePath(g, inkS, 6, [sd * 12, 0, sd * 22, 20, sd * 42, 30, sd * 60, 42, sd * 58, 72, sd * 56, 100, sd * 42, 124]);
        strokePath(g, inkS, 5, [sd * 42, 30, sd * 52, 22, sd * 54, 34]);
        strokePath(g, inkS, 6, [sd * 78, 0, sd * 86, 44, sd * 76, 74, sd * 68, 104, sd * 78, 128]);
        strokePath(g, inkS, 6, [sd * 130, 0, sd * 142, 64, sd * 128, 128]);
        g.fillStyle = shade; g.beginPath(); g.ellipse(sd * 22, 64, 17, 10, 0, 0, 7); g.fill();   // deep-set eyes
        strokePath(g, '#1c2624', 10, [sd * 42, 48, sd * 26, 48, sd * 8, 58]);                     // heavy brow
        eye(g, sd * 22, 66, 5.5, 6.5, '#140c0c');
      }
      strokePath(g, inkS, 6, [0, 0, 3, 16, 0, 38]);
      for (const sd of [-1, 1]) strokePath(g, inkS, 6, [sd * (X - 2), 0, sd * (X - 6), 64, sd * (X - 2), 128]);
      strokePath(g, '#3c544e', 4, [-9, 86, 0, 90, 9, 86]);                            // broad nose
      strokePath(g, '#1c1a18', 5.5, [-24, 106, 0, 99, 24, 106]);                      // stern frown
      strokePath(g, shade, 3, [-10, 114, 0, 116, 10, 114]);
    });
    // chest: pecs and abs shading under bold red tribal lines
    const chest = (back) => (g, w, h) => {
      g.fillStyle = skinS; g.fillRect(0, 0, w, h);
      g.strokeStyle = shade; g.lineWidth = 3; g.lineCap = 'round';
      if (!back) {
        for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 4, 54); g.quadraticCurveTo(64 + sd * 26, 64, 64 + sd * 50, 44); g.stroke(); }
        g.beginPath(); g.moveTo(64, 10); g.lineTo(64, 120); g.stroke();
        for (const y of [76, 94, 110]) { g.beginPath(); g.moveTo(50, y); g.lineTo(78, y); g.stroke(); }
      } else {
        g.beginPath(); g.moveTo(64, 6); g.lineTo(64, 124); g.stroke();
        for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 14, 30); g.quadraticCurveTo(64 + sd * 34, 60, 64 + sd * 48, 34); g.stroke(); }
      }
      g.lineJoin = 'round';
      const ln = (wd, pts) => strokePath(g, inkS, wd, pts);
      ln(5, [64, 0, 66, 20, 64, 40]);
      for (const sd of [-1, 1]) {
        const x = (v) => 64 + sd * v;
        ln(6.5, [x(6), 6, x(26), 0, x(42), 14, x(54), 30, x(46), 48]);                 // swirl over the pec / blade
        ln(4, [x(46), 48, x(34), 52, x(32), 40]);
        ln(5, [x(10), 40, x(24), 46, x(28), 30]);
        ln(6.5, [x(56), 4, x(62), 40, x(56), 76, x(50), 100, x(56), 128]);           // down the flank
        ln(5.5, [x(8), 62, x(28), 72, x(36), 96, x(40), 112, x(30), 126]);             // chevrons
        ln(3.5, [x(56), 76, x(44), 80, x(40), 92]);
      }
    };
    const decal = decalMat('draxK', chest(false)), back = decalMat('draxBackK', chest(true));
    // tattoo print wrapped round the upper arms
    const armInk = decalMat('draxArmK', (g, w, h) => {
      g.fillStyle = skinS; g.fillRect(0, 0, w, h);
      // flowing lines that curl into spirals, like the chest
      strokePath(g, inkS, 9, [40, 0, 30, 40, 58, 62, 92, 84, 84, 128]);
      strokePath(g, inkS, 7, [44, 52, 70, 30, 96, 36, 108, 52, 92, 60]);
      strokePath(g, inkS, 7, [72, 76, 48, 92, 30, 90, 22, 76, 34, 72]);
      strokePath(g, inkS, 6, [96, 0, 104, 14, 118, 20]);
    }, null, 1);
    const ridge = (b, x, y, z, rz, len, ry = 0) => b.boxM(mat4(x, y, z, 0, ry, rz, 0.03, len, 0.05), ink);
    const rig = hero({
      name: 'drax', s: 1.5, wide: 1.3, deep: 1.15, headR, headH, face, decal, top: skin, skin, neck: skin, torso: skin, arms: skin, hands: skin, legs: pants, hips: pants,
      hair: (hb, d) => {
        const r = d.headR, H = d.headH;
        // raised tattoo ridges over the bald scalp
        hb.box(0, H, -0.05 * r, 0.1 * r, 0.035, 1.75 * r, ink);
        for (const sd of [-1, 1]) hb.boxM(mat4(sd * 0.45 * r, H + 0.014, -0.05 * r, 0, sd * 0.3, 0, 0.1 * r, 0.03, 1.2 * r), ink);
        for (const sd of [-1, 1]) hb.box(sd * 0.98 * r, 0.36 * H, -0.02 * r, 0.14 * r, 0.24 * H, 0.26 * r, skin);   // ears
      },
      extra: (b, d) => {
        const s = d.s, W = d.W, D = d.D;
        torsoPrint(b, d, back, true);
        b.cyl(0, 0.88 * s, -0.01, 0.2 * s, 0.17 * s, skin, { seg: 12 });                 // bull neck
        for (const sd of [-1, 1]) {
          b.boxM(mat4(sd * 0.25 * s * W, 0.97 * s, -0.03 * s, 0, 0, sd * -0.36, 0.42 * s, 0.15 * s, 0.38 * s), skin);   // traps
          ridge(b, sd * 0.24 * s * W, 1.04 * s, -0.03 * s, PI / 2 + sd * -0.36, 0.28 * s);
          ridge(b, sd * 0.24 * s * W, 0.97 * s, 0.17 * s, PI / 2 + sd * -0.36, 0.26 * s);
        }
        b.box(0, d.chestY - 0.02 * s, 0, 0.95 * s * W, 0.11 * s, 0.49 * s * D, leather);   // belt
        b.box(0, d.chestY - 0.03 * s, 0.245 * s * D, 0.2 * s, 0.13 * s, 0.035 * s, 0x8a6a3a);
        b.box(0, d.chestY - 0.005 * s, 0.26 * s * D, 0.12 * s, 0.07 * s, 0.02 * s, M.silver);
      },
      arm: (ab, sd, d) => {
        const s = d.s;
        ab.sphere(0, -0.03 * s, 0, 0.2 * s, skin, { sy: 0.95 });                                        // deltoid
        ab.add(taperGeo(0.3, 0.34, 0.36, 0.32, 0.34), armInk, 0, -0.4 * s, 0, 0, s, s, s);           // tattooed biceps
        ab.add(taperGeo(0.3, 0.32, 0.2, 0.3, 0.32), plastic(skin), 0, -0.58 * s, 0, 0, s, s, s);
        ab.box(0, -0.6 * s, 0, 0.34 * s, 0.13 * s, 0.34 * s, leather);                                  // bracer
        ab.box(0, -0.54 * s, 0, 0.345 * s, 0.025 * s, 0.345 * s, M.silver);
        ab.box(0, -0.78 * s, 0, 0.27 * s, 0.2 * s, 0.29 * s, skin);                                      // fist
      },
    });
    const s = rig.dims.s;
    // two curved fighting knives, sheathed crossed at the small of his back until drawn
    const knife = (b, sheathed) => {
      b.sphere(0, 0.08, 0, 0.055, M.silver);
      b.box(0, -0.26, 0, 0.09, 0.32, 0.11, 0x2a1a14);
      for (const y of [-0.1, -0.2]) b.box(0, y, 0, 0.1, 0.025, 0.12, leather);
      b.boxM(mat4(0, -0.28, 0.02, 0, 0, 0, 0.1, 0.05, 0.3), 0x8a6a3a);
      if (!sheathed) curvedBlade(b, -0.29, 0.03, 0.1, 0.18, 4, 0.18, 0.17, 0.12, 0.05, M.silver, 0x6a7078, 0.18);
    };
    const mk = (arm) => {
      const g = prop(arm, 0, HAND * s, 0, (b) => knife(b, false), 'knife');
      g.visible = false; return g;
    };
    const kL = mk(rig.armL), kR = mk(rig.armR);
    const stow = new THREE.Group(); rig.torso.add(stow);
    for (const sd of [-1, 1]) {
      const p = prop(stow, sd * 0.24 * s, 0.5 * s, -0.23 * s * 1.15 - 0.13, (b) => {
        b.boxM(mat4(0, -0.6, 0.02, 0, 0, 0, 0.12, 0.62, 0.22), 0x2a1a14);
        b.boxM(mat4(0, -0.38, 0.02, 0, 0, 0, 0.13, 0.05, 0.23), M.silver);
      }, 'sheath');
      prop(p, 0, 0, 0, (b) => knife(b, true), 'hilt');
      p.rotation.set(0, 0, -sd * 0.7);
    }
    rig.fx = (name, f) => {
      const on = name === 'cheer' || name === 'win' || name === 'use' || name === 'throwF';
      vis(kL, on); vis(kR, on); vis(stow, !on);
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

export default [
  spiderman, ironman, captain, thor, hulk, hawkeye, panther, strange, antman,
  starlord, gamora, drax, rocket, groot,
  loki, thanos,
];
