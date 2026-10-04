// Jujutsu Kaisen drivers. Faces come from the Cursed Brick
// Shibuya face atlas so the drivers match the statues on the track; every driver
// has a signature cursed technique played on cheer / win with emissive effects
// (helpers in ./jjk-kit.js).
import {
  THREE, BrickBuilder, C, plastic, rbox, rod, mat4, cached, faceMat, neon, spike, atlasHead, taperGeo,
  NAVY, GOLD, INK, jfig, handY, cap, back, spikes, fringe, frustum, atlasStyle,
  fxg, addGlow, ball, ringMesh, sparks, vis, seg, sm, lerp, bump,
} from './jjk-kit.js';

const S = Math.sin, PI = Math.PI, abs = Math.abs;
const up = -2.75;          // arm straight up-ish
const LOOP = (PI * 2) / 1.6; // one cycle of the looped win pose
const PINK = 0xf28a9c, RED = C.red, WHITE = C.white, SKIN = 0xf3d2b3;
const easeBack = (k) => { k = Math.min(1, Math.max(0, k)) - 1; return 1 + 2.70158 * k * k * k + 1.70158 * k * k; };

// Jujutsu High uniform: high collar + a row of buttons
const uniform = (btn = GOLD, collar = NAVY) => (b, d) => {
  const s = d.s;
  b.cyl(0, 0.88 * s, 0, 0.21 * s, 0.22 * s, collar, { seg: 14 });
  for (let k = 0; k < 3; k++) b.box(0, (0.76 - k * 0.17) * s, 0.215 * s, 0.07 * s, 0.07 * s, 0.04 * s, btn);
};

// ---- Satoru Gojo ------------------------------------------------------------------------
function gojo() {
  const rig = jfig({
    name: 'gojo', face: 'gojo', torso: NAVY, legs: NAVY, arms: NAVY, skin: 0xf7e2cf, extraHeight: 0.42,
    hair: (b, r, h) => { cap(b, r, h, WHITE, 0.8); back(b, r, h, WHITE, 0.45, 0.9); spikes(b, r, h, WHITE, 12, 0.42, 0.6, { seed: 9 }); fringe(b, r, h, WHITE, 4, 0.34, 0.75, { spread: 0.7, y: 0.86 }); },
    torsoExtra: uniform(0x3a4460),
  });
  const d = rig.dims, hy = handY(rig);
  // Six Eyes: an uncovered face slipped over the blindfolded one
  const eb = new BrickBuilder(1);
  atlasHead(eb, 'gojoEyes', 0, 0, 0, d.headR * 1.012, d.headH * 0.985);
  const eyes = eb.build({ name: 'gojo-eyes' }); eyes.visible = false; rig.head.add(eyes);
  // Lapse Blue (left hand), Reversal Red (right hand) -> Hollow Purple
  const blue = fxg(rig.armL, 0, hy - 0.1, 0.04); ball(blue, 0x3a8cff, 0.11); addGlow(blue, 0x2a6aff, 0.8);
  const red = fxg(rig.armR, 0, hy - 0.1, 0.04); ball(red, 0xff2a2a, 0.11); addGlow(red, 0xff2020, 0.8);
  const purple = fxg(rig.root, 0, 1.1, 0.8); ball(purple, 0x9a3aff, 0.24, 0, 0, 0, 2.6); addGlow(purple, 0xb050ff, 1.6); addGlow(purple, 0xffffff, 0.5, 0, 0, 0, 0.8);
  // Infinity: a ring of blue light turning round him on the win
  const inf = fxg(rig.root, 0, 0.9, 0);
  const ring = ringMesh(inf, 0x9fe8ff, 1.25, 0.03); ring.rotation.x = PI / 2 + 0.35;
  const ring2 = ringMesh(inf, 0x6a8aff, 1.05, 0.03); ring2.rotation.x = PI / 2 - 0.4;
  addGlow(inf, 0x6ab8ff, 2.8, 0, 0.6, -0.3, 0.45);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    vis(eyes, ch || win || n === 'trick');
    const orbs = ch && f > 0.04 && f < 0.6;
    vis(blue, orbs); vis(red, orbs);
    if (orbs) { const k = sm(seg(f, 0.04, 0.3)) * (1 + S(t * 40) * 0.08) * (1 - seg(f, 0.5, 0.6) * 0.6); blue.scale.setScalar(k); red.scale.setScalar(k); }
    const pp = ch && f > 0.5;
    vis(purple, pp);
    if (pp) {
      purple.position.z = 0.8 + sm(seg(f, 0.68, 1)) * 1.5;
      purple.scale.setScalar((0.3 + sm(seg(f, 0.5, 0.66)) * 0.9) * (1 - sm(seg(f, 0.88, 1)) * 0.9) * (1 + S(t * 50) * 0.06));
    }
    vis(inf, win);
    if (win) { inf.rotation.y = t * 2.5; const k = 1 + S(t * 4) * 0.08; inf.scale.set(k, 1, k); }
  };
  return rig;
}

// ---- Yuji Itadori -----------------------------------------------------------------------
function yuji() {
  const rig = jfig({
    name: 'yuji', face: 'yuji', torso: NAVY, legs: NAVY, arms: NAVY, skin: SKIN,
    hair: (b, r, h) => { back(b, r, h, 0x3a2a2a, 0.35, 0.8); cap(b, r, h, PINK, 0.82); spikes(b, r, h, PINK, 10, 0.24, 0.55, { seed: 4 }); fringe(b, r, h, PINK, 3, 0.2, 1.6, { spread: 0.5, y: 0.9 }); },
    torsoExtra: (b, d) => { uniform(GOLD, RED)(b, d); const s = d.s; b.box(0, 0.72 * s, -0.22 * s, 0.62 * s, 0.26 * s, 0.2 * s, RED); },
  });
  // Black Flash: black-and-red lightning crackling round the fist
  const bf = fxg(rig.armR, 0, handY(rig) - 0.08, 0.04);
  sparks(bf, 0xff1838, 0x0a0a0a, 14, 0.95, 7);
  addGlow(bf, 0xff1030, 1.5);
  addGlow(bf, 0xff6060, 0.6, 0, 0, 0, 1);
  ball(bf, 0x300008, 0.13, 0, 0, 0, 0.6);
  rig.fx = (n, f, t) => {
    const on = (n === 'cheer' && f > 0.3 && f < 0.85) || (n === 'win' && S(t * LOOP * 2) > 0.55);
    vis(bf, on);
    if (on) { bf.rotation.set((t * 37) % 6.28, (t * 23) % 6.28, (t * 51) % 6.28); bf.scale.setScalar(0.7 + abs(S(t * 61)) * 0.6); }
  };
  return rig;
}

// ---- Megumi Fushiguro ---------------------------------------------------------------------
function megumi() {
  const rig = jfig({
    name: 'megumi', face: 'megumi', torso: NAVY, legs: NAVY, arms: NAVY, skin: SKIN, extraHeight: 0.3,
    hair: (b, r, h) => { back(b, r, h, INK, 0.35, 0.9); cap(b, r, h, INK, 0.82); spikes(b, r, h, INK, 14, 0.4, 1.0, { seed: 11, rnd: 0.6, ring: 0.85 }); fringe(b, r, h, INK, 4, 0.3, 2.0, { spread: 0.6 }); },
    torsoExtra: uniform(GOLD),
  });
  // a Divine Dog rises out of the shadows behind the kart
  const dog = fxg(rig.root, 1.2, -1, -1.0);
  const db = new BrickBuilder(1);
  db.box(0, -0.75, -0.18, 0.5, 0.8, 0.5, WHITE);
  db.box(0, -0.28, -0.08, 0.62, 0.34, 0.6, WHITE);
  db.box(0, 0, 0, 0.5, 0.42, 0.5, WHITE);
  db.box(0, 0.0, 0.43, 0.28, 0.2, 0.42, WHITE);
  db.box(0, 0.14, 0.62, 0.12, 0.08, 0.06, C.black);
  db.box(0, 0.03, 0.62, 0.24, 0.03, 0.03, INK);
  for (const sd of [-1, 1]) {
    spike(db, sd * 0.16, 0.4, -0.1, 0.1, 0.32, -0.1, -sd * 0.3, WHITE);
    db.box(sd * 0.13, 0.27, 0.25, 0.11, 0.06, 0.03, 0xffd040, { matOpts: { emissive: 0xffc020, emissiveIntensity: 1.8 } });
    rbox(db, sd * 0.13, 0.36, 0.26, 0.14, 0.035, 0.02, 0, 0, sd * 0.3, INK);
  }
  dog.add(db.build({ name: 'divine-dog' }));
  dog.scale.setScalar(1.5);
  const pool = fxg(rig.root, 1.2, 0.15, -1.0); addGlow(pool, 0x5a2ad0, 1.7, 0, 0, 0, 0.8);
  const sign = fxg(rig.root, 0, 1.05, 0.72); addGlow(sign, 0x6a3aff, 0.8, 0, 0, 0, 0.7);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    const rise = ch ? sm(seg(f, 0.12, 0.38)) * (1 - sm(seg(f, 0.86, 1))) : win ? 1 : 0;
    const on = rise > 0.01;
    vis(dog, on); vis(pool, on); vis(sign, (ch && f < 0.6) || win);
    if (on) {
      dog.position.y = lerp(-1.6, 1.25, rise);
      dog.rotation.set(win ? -0.15 - Math.max(0, S(t * LOOP)) * 0.5 : -bump(f, 0.42, 0.8) * 0.6, -0.15, 0);
      pool.scale.setScalar(rise);
    }
  };
  return rig;
}

// ---- Panda --------------------------------------------------------------------------------
// local: a smooth ellipsoid turned rx/ry/rz with radii sx/sy/sz (head, patches, belly)
const pdSph = () => cached('pdSph', () => new THREE.SphereGeometry(1, 26, 18));
const pdQ = new THREE.Quaternion(), pdE = new THREE.Euler();
function pdBlob(b, x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) {
  pdQ.setFromEuler(pdE.set(rx, ry, rz));
  b.addMatrix(pdSph(), typeof color === 'number' ? plastic(color) : color, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), pdQ, new THREE.Vector3(sx, sy, sz)));
}
function panda() {
  const BK = 0x161616, WH = 0xf6f6f2, JK = 0x1a1e2e, JK2 = 0x2a3048, PAD = 0x3a3434;
  // the head: a big round ellipsoid; on(a, e, k) = a point on its surface (azimuth a, elevation e), pushed out by k
  const JKM = plastic(JK, { rough: 0.62 }), BKM = plastic(BK, { rough: 0.5 });
  const HC = [0, 0.5, 0], HR = [0.63, 0.55, 0.58];
  const on = (a, e, k = 1) => [HC[0] + HR[0] * S(a) * Math.cos(e) * k, HC[1] + HR[1] * S(e) * k, HC[2] + HR[2] * Math.cos(a) * Math.cos(e) * k];
  const rig = jfig({
    name: 'panda', s: 1.42, wide: 1.62, deep: 1.35, torso: JK, legs: BK, hips: BK, arms: JK, hands: BK, neck: WH, skin: WH, headH: 0.75, extraHeight: 0.06,
    head: (b) => {
      pdBlob(b, ...HC, ...HR, WH);
      // round black ears
      for (const sd of [-1, 1]) { pdBlob(b, sd * 0.43, 0.95, -0.06, 0.2, 0.2, 0.13, BK); }
      // droopy teardrop eye patches with small bright eyes
      for (const sd of [-1, 1]) {
        const a = sd * 0.43, e = 0.12;
        pdBlob(b, ...on(a, e, 0.98), 0.115, 0.16, 0.08, BK, -e, a, sd * 0.5);
        pdBlob(b, ...on(a + sd * 0.075, e - 0.1, 0.975), 0.12, 0.115, 0.08, BK, -(e - 0.1), a + sd * 0.075, 0);
        pdBlob(b, ...on(a - sd * 0.03, e + 0.04, 1.11), 0.046, 0.052, 0.025, WH, -e, a, 0);
        pdBlob(b, ...on(a - sd * 0.035, e + 0.035, 1.15), 0.03, 0.036, 0.016, BK, -e, a, 0);
        pdBlob(b, ...on(a - sd * 0.06, e + 0.08, 1.17), 0.011, 0.011, 0.006, WH, -e, a, 0);
      }
      // white muzzle, black nose and a little smile
      pdBlob(b, 0, 0.35, 0.42, 0.27, 0.19, 0.24, WH);
      pdBlob(b, 0, 0.44, 0.63, 0.09, 0.055, 0.06, BK);
      rbox(b, 0, 0.37, 0.654, 0.022, 0.07, 0.02, 0.08, 0, 0, BK);
      for (const sd of [-1, 1]) rbox(b, sd * 0.045, 0.32, 0.65, 0.08, 0.022, 0.02, 0.15, sd * 0.25, sd * 0.4, BK);
    },
    torsoExtra: (b, d) => {
      const s = d.s, W = d.W, D = d.D;
      // barrel chest: a big rounded jacket mass over the boxy torso; bz(x, y) = its front surface
      const BC = [0, 0.5 * s, -0.02 * s], BR = [0.6 * s, 0.56 * s, 0.4 * s * D];
      const bz = (x, y) => BC[2] + BR[2] * Math.sqrt(Math.max(0, 1 - (x / BR[0]) ** 2 - ((y - BC[1]) / BR[1]) ** 2));
      pdBlob(b, ...BC, ...BR, JKM);
      // very broad, rounded shoulders sloping down from the neck (a big slouched bear)
      for (const sd of [-1, 1]) {
        pdBlob(b, sd * 0.36 * s, 0.9 * s, -0.03 * s, 0.36 * s, 0.22 * s, 0.36 * s * D, JKM, 0, 0, -sd * 0.42);
        pdBlob(b, sd * 0.42 * s, 0.7 * s, -0.04 * s, 0.4 * s, 0.2 * s, 0.36 * s * D, JKM, 0, 0, -sd * 0.38);
      }
      // the jacket hangs open over a huge round white belly, black fur band across the chest
      pdBlob(b, 0, 0.78 * s, bz(0, 0.78 * s) - 0.1 * s, 0.32 * s, 0.13 * s, 0.12 * s, BKM);
      pdBlob(b, 0, 0.4 * s, bz(0, 0.4 * s) - 0.17 * s, 0.4 * s, 0.42 * s, 0.26 * s, WH);
      for (const sd of [-1, 1]) {
        // rolled jacket edges framing the belly (a smooth tube over the chest), gold buttons on one side
        const pts = [];
        for (let k = 0; k < 6; k++) { const y = (0.8 - k * 0.13) * s, x = sd * (0.24 + k * 0.03) * s; pts.push([x, y, bz(x, y) + 0.005 * s]); }
        pts.forEach((p, k) => { b.sphere(...p, 0.045 * s, JK2); if (k) rod(b, pts[k - 1], p, 0.045 * s, JK2, 10); });
        if (sd > 0) for (let k = 0; k < 4; k++) { const y = (0.74 - k * 0.15) * s, x = (0.31 + k * 0.03) * s; b.sphere(x, y, bz(x, y) + 0.02 * s, 0.038 * s, GOLD, { sy: 0.7 }); }
      }
      // the high stand collar with a gold button at the throat
      b.cyl(0, 0.86 * s, 0, 0.3 * s, 0.2 * s, JK, { seg: 18 });
      b.cyl(0, 1.05 * s, 0, 0.305 * s, 0.025 * s, JK2, { seg: 18 });
      b.sphere(0, 0.95 * s, 0.3 * s, 0.04 * s, GOLD);
      // thick black haunches and short heavy legs, a little white tail
      pdBlob(b, 0, -0.08 * s, -0.04 * s, 0.56 * s * W / 1.55, 0.24 * s, 0.32 * s * D, BKM);
      for (const sd of [-1, 1]) pdBlob(b, sd * 0.34 * s, -0.06 * s, 0.34 * s, 0.36 * s, 0.22 * s, 0.44 * s, BKM);
      pdBlob(b, 0, 0.0, -0.36 * s * D, 0.1 * s, 0.09 * s, 0.07 * s, WH);
    },
    arm: (ab, sd, d) => {
      // thick heavy arms in the jacket sleeves, turned cuffs and big round black paws
      const s = d.s;
      pdBlob(ab, 0, -0.07 * s, 0, 0.23 * s, 0.22 * s, 0.22 * s, JKM);
      pdBlob(ab, 0, -0.34 * s, 0.005 * s, 0.205 * s, 0.32 * s, 0.2 * s, JKM);
      ab.cyl(0, -0.62 * s, 0.01 * s, 0.185 * s, 0.07 * s, JK2, { seg: 14 });
      pdBlob(ab, 0, -0.75 * s, 0.02 * s, 0.2 * s, 0.19 * s, 0.2 * s, BKM);
      pdBlob(ab, 0, -0.78 * s, 0.17 * s, 0.08 * s, 0.065 * s, 0.04 * s, PAD);
    },
  });
  // set the heavy arms a little further out (to clear the barrel chest) and lower, on the sloping shoulders
  for (const [a, sd] of [[rig.armL, 1], [rig.armR, -1]]) { a.position.x += sd * 0.06 * rig.dims.s; a.position.y -= 0.14 * rig.dims.s; }
  // Drumming Beat: shockwave rings off his chest
  const waves = fxg(rig.root, 0, 0.62 * rig.dims.s, 0.75 * rig.dims.s);
  const w1 = ringMesh(waves, 0xffd860, 1, 0.035, 1.6), w2 = ringMesh(waves, 0xffd860, 1, 0.035, 1.6);
  rig.fx = (n, f, t) => {
    const on = n === 'cheer' || (n === 'win' && t % 1.6 < 0.8);
    vis(waves, on);
    if (on) {
      const gt = n === 'cheer' ? f * 1.5 : t;
      const p1 = (gt * 2.8) % 1, p2 = (gt * 2.8 + 0.5) % 1;
      w1.scale.setScalar(0.2 + p1 * 1.1); w1.position.z = p1 * 0.6;
      w2.scale.setScalar(0.2 + p2 * 1.1); w2.position.z = p2 * 0.6;
    }
  };
  return rig;
}
const drum = (t) => ({ lx: -1.1 + S(t * 18) * 0.35, lz: -0.7, rx: -1.1 - S(t * 18) * 0.35, rz: 0.7, hx: -0.35, by: abs(S(t * 18)) * 0.04, tx: -0.1 });

// ---- local modelling helpers (Todo, Nanami, Jogo, Mahoraga) --------------------------------
const lsph = () => cached('jjkLocSph', () => new THREE.SphereGeometry(1, 12, 8));
// a squashed ellipsoid (spots, muscles) with any scale; ry turns it about Y
const blob = (b, x, y, z, sx, sy, sz, color, ry = 0) => b.add(lsph(), typeof color === 'number' ? plastic(color) : color, x, y, z, ry, sx, sy, sz);
// a pointed flat blade (feather, fin) from base (x, y, z): phi = angle in the XY plane from +X,
// psi = sweep back about Y; length L, breadth w, thickness t
const feather = (b, x, y, z, phi, psi, L, w, t, color) => b.addMatrix(taperGeo(1, 0.18, 1, 1), plastic(color), mat4(x, y, z, 0, psi, phi - PI / 2, w, L, t));
// a point on the seatedFig torso surface: side 'f' | 'b' (u = -1..1 across) or sd = +-1 (u across depth)
const torsoPt = (d, side, u, y) => {
  const t = (y - d.chestY) / (0.82 * d.s), hw = (0.46 - 0.11 * t) * d.s * d.W, hd = (0.23 - 0.02 * t) * d.s * d.D;
  if (side === 'f') return [u * hw, y, hd, 0];
  if (side === 'b') return [u * hw, y, -hd, 0];
  return [side * hw, y, u * hd, PI / 2];
};
// a thin dark crease (muscle line) of width w at (x, y, z), turned rz
const line3 = (b, x, y, z, w, color, rz = 0) => rbox(b, x, y, z, w, 0.012, 0.01, 0, 0, rz, color);
// a flat painted spot stuck to the torso
const torsoSpot = (b, d, side, u, y, rx, ry, color) => { const [x, yy, z, rot] = torsoPt(d, side, u, y); blob(b, x, yy, z, rx, ry, 0.014, color, rot); };

// ---- Aoi Todo ------------------------------------------------------------------------------
const todoFace = () => faceMat('jjk-todo2', (g) => atlasStyle(g, (ell, line, g) => {
  // heavy brow ridge shadow + thick angled brows
  ell(0, -30, 62, 10, '#b57a4a');
  for (const sd of [-1, 1]) {
    g.fillStyle = '#121212'; g.beginPath();
    g.moveTo(sd * 8, -28); g.lineTo(sd * 54, -48); g.lineTo(sd * 58, -38); g.lineTo(sd * 12, -18); g.closePath(); g.fill();
    // small, fierce eyes
    ell(sd * 32, -12, 13, 7, '#fff'); ell(sd * 30, -12, 6, 6, '#111'); ell(sd * 28, -14, 2, 2, '#fff');
    line([[sd * 16, -18], [sd * 48, -20]], '#111', 4);
    line([[sd * 20, 14], [sd * 34, 30]], '#9a6036', 3);              // cheek lines
  }
  // the long scar down his left side, through the eye
  line([[34, -62], [30, -26]], '#efc59c', 6); line([[30, -4], [38, 30]], '#efc59c', 6);
  for (const [x, y] of [[33, -50], [32, -36], [33, 6], [36, 20]]) line([[x - 7, y], [x + 7, y + 2]], '#efc59c', 3);
  // broad nose
  line([[0, -14], [-4, 6], [4, 10]], '#93582e', 4);
  // big confident grin
  g.fillStyle = '#3a120c'; g.beginPath(); g.moveTo(-34, 24); g.quadraticCurveTo(0, 54, 34, 24); g.quadraticCurveTo(0, 30, -34, 24); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-28, 27); g.quadraticCurveTo(0, 34, 28, 27); g.lineTo(26, 32); g.quadraticCurveTo(0, 38, -26, 32); g.closePath(); g.fill();
  line([[-6, 54], [-3, 60]], '#93582e', 3); line([[6, 54], [3, 60]], '#93582e', 3);   // cleft chin
}), '#c68a58');
function todo() {
  const SK = 0xc68a58, JK = 0x1e2130, PANTS = 0x2e2f3a, SASH = 0x2f86e8, SHIRT = 0xf2f0ea;
  const rig = jfig({
    name: 'todo', face: todoFace(), s: 1.45, wide: 1.38, deep: 1.1, headR: 0.28, headH: 0.5, extraHeight: 0.45,
    skin: SK, torso: JK, arms: JK, hands: SK, legs: PANTS, hips: PANTS, neck: SK,
    hair: (b, r, h) => {
      // slicked back, tied into his top-knot
      b.cyl(0, h * 0.86, 0, r * 1.04, h * 0.14 + 0.01, INK, { seg: 18 });
      b.sphere(0, h, 0, r * 1.04, INK, { sy: 0.32 });
      b.cyl(0, h * 0.2, -r * 0.1, r * 1.04, h * 0.72, INK, { seg: 18 });   // hugging the back of the skull
      for (const sd of [-1, 1]) b.box(sd * r * 0.99, h * 0.44, r * 0.1, 0.03, h * 0.32, r * 0.16, INK);   // sideburns
      b.cyl(0, h + r * 0.22, -r * 0.3, r * 0.22, 0.1, 0x8a1a1a, { seg: 10 });   // the tie
      b.sphere(0, h + r * 0.22 + 0.17, -r * 0.34, r * 0.4, INK, { sy: 0.85 });   // the top-knot
      spike(b, 0, h + r * 0.22 + 0.22, -r * 0.55, r * 0.2, 0.2, -1.2, 0, INK);
    },
    torsoExtra: (b, d) => {
      const s = d.s, W = d.W;
      // the open jacket shows a bare, ripped chest
      const D = d.D, F = 0.25 * s * D;   // front of the torso
      b.box(0, 0.24 * s, F - 0.06 * s, 0.56 * s, 0.76 * s, 0.1 * s, SK);
      for (const sd of [-1, 1]) {
        rbox(b, sd * 0.13 * s, 0.73 * s, F + 0.01 * s, 0.24 * s, 0.17 * s, 0.07 * s, 0.25, 0, sd * 0.1, SK);   // slab pecs
        line3(b, sd * 0.13 * s, 0.645 * s, F + 0.035 * s, 0.22 * s, 0x9a6036, sd * 0.1);
        for (let k = 0; k < 3; k++) b.box(sd * 0.055 * s, (0.46 - k * 0.11) * s, F, 0.09 * s, 0.085 * s, 0.035 * s, SK);   // abs
        // torn undershirt and jacket edges framing the chest
        rbox(b, sd * 0.29 * s, 0.58 * s, F + 0.005 * s, 0.05 * s, 0.78 * s, 0.05 * s, 0, 0, sd * 0.06, SHIRT);
        rbox(b, sd * 0.34 * s, 0.6 * s, F + 0.02 * s, 0.07 * s, 0.82 * s, 0.05 * s, 0, 0, sd * 0.06, JK);
        rbox(b, sd * 0.24 * s, 0.98 * s, 0.14 * s, 0.2 * s, 0.07 * s, 0.24 * s, 0.3, 0, -sd * 0.35, JK);   // flared collar
        // big traps
        b.sphere(sd * 0.2 * s * W, 0.94 * s, -0.04 * s, 0.16 * s, JK, { sy: 0.5 });
      }
      for (let k = 0; k < 3; k++) b.box(0.36 * s, (0.78 - k * 0.2) * s, F + 0.03 * s, 0.05 * s, 0.05 * s, 0.03 * s, GOLD);
      b.cyl(0, 0.86 * s, 0.02 * s, 0.18 * s, 0.16 * s, SK, { seg: 12 });   // thick neck
      // bright blue sash over the martial-arts pants
      b.box(0, -0.02 * s, 0, 0.96 * s * W, 0.24 * s, 0.5 * s * d.D, SASH);
      b.sphere(0.3 * s, 0.1 * s, 0.26 * s * d.D, 0.08 * s, SASH);
      rbox(b, 0.36 * s, -0.08 * s, 0.28 * s * d.D, 0.09 * s, 0.26 * s, 0.03 * s, 0, 0, 0.25, SASH);
      rbox(b, 0.26 * s, -0.1 * s, 0.28 * s * d.D, 0.09 * s, 0.22 * s, 0.03 * s, 0, 0, -0.2, SASH);
    },
    arm: (ab, sd, d) => {
      const s = d.s, w = Math.sqrt(d.W);
      ab.sphere(0, -0.03 * s, 0, 0.15 * s * w, JK, { sy: 1.15 });       // deltoid
      ab.cyl(0, -0.36 * s, 0, 0.15 * s * w, 0.08 * s, JK, { seg: 12 }); // rolled-up sleeve
      ab.cyl(0, -0.56 * s, 0, 0.14 * s * w, 0.22 * s, SK, { seg: 12 }); // bare forearm
      ab.sphere(0, -0.44 * s, 0.02 * s, 0.125 * s * w, SK);
    },
  });
  // Boogie Woogie: a flash ring every clap
  const clap = fxg(rig.root, 0, 1.2, 0.65);
  const cr = ringMesh(clap, 0x7ad8ff, 1, 0.04, 2.6);
  const flash = addGlow(clap, 0x9ae0ff, 1.0);
  // tears of joy for his best friend
  const tears = fxg(rig.head, 0, 0, 0);
  const tb = new BrickBuilder(1);
  const r = rig.dims.headR, h = rig.dims.headH;
  for (const sd of [-1, 1]) rbox(tb, Math.sin(sd * 0.5) * r * 1.02, h * 0.42, Math.cos(sd * 0.5) * r * 1.02, 0.05, h * 0.42, 0.03, 0, sd * 0.5, 0, 0, { mat: neon(0x6ac8ff, 1.8) });
  tears.add(tb.build({ name: 'tears' }));
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer';
    vis(clap, ch);
    if (ch) {
      const p = ((f * 1.5 * 12) / PI) % 1;
      cr.scale.setScalar(0.15 + p * 1.0); cr.visible = p < 0.7;
      flash.scale.setScalar((1 - p) * 1.3);
    }
    vis(tears, n === 'win');
    if (n === 'win') tears.scale.set(1, 0.8 + abs(S(t * 9)) * 0.3, 1);
  };
  return rig;
}

// ---- Kento Nanami --------------------------------------------------------------------------
const nanamiFace = () => faceMat('jjk-nanami2', (g) => atlasStyle(g, (ell, line) => {
  for (const sd of [-1, 1]) {
    line([[sd * 12, -44], [sd * 52, -47]], '#9a7230', 8);     // straight, serious brows
    ell(sd * 30, -18, 30, 17, '#3a3a2a');                     // under the goggles
    line([[sd * 18, 0], [sd * 42, 0]], '#d4a582', 3);         // overtime eye bags
    line([[sd * 20, 10], [sd * 30, 32]], '#c4946e', 3);       // tired cheek lines
  }
  line([[0, -6], [5, 12], [-2, 15]], '#b98663', 4);           // nose
  line([[-18, 33], [0, 31], [18, 34]], '#5a2a20', 5);         // flat, unimpressed mouth
  line([[-7, 50], [7, 50]], '#d4a684', 3);                    // long chin
}), '#f0cda8');
// the cloth-wrapped cleaver: grip at the origin, blade up +Y, broad along Z
function cleaver() {
  const b = new BrickBuilder(1), CL = 0xf3efe4, DOT = 0x18181c;
  b.box(0, -0.16, 0, 0.06, 0.3, 0.07, 0x2a2018);
  for (let k = 0; k < 3; k++) b.box(0, -0.13 + k * 0.08, 0, 0.07, 0.025, 0.08, 0x5a4a3a);
  b.box(0, 0.13, 0, 0.09, 0.04, 0.2, 0x2a2018);
  b.box(0, 0.15, 0.01, 0.07, 0.74, 0.19, CL);
  rbox(b, 0, 0.89, 0.01, 0.07, 0.09, 0.19, 0, 0, 0, CL);
  rbox(b, 0, 0.9, -0.03, 0.07, 0.12, 0.12, PI / 4, 0, 0, CL);   // the slanted blunt tip
  for (let k = 0; k < 3; k++) rbox(b, 0, 0.28 + k * 0.24, 0.01, 0.075, 0.02, 0.2, 0.35, 0, 0, 0xd8d2c2);   // cloth wraps
  const dots = [[0.24, 0.05], [0.36, -0.05], [0.46, 0.06], [0.58, -0.04], [0.68, 0.05], [0.8, -0.05], [0.9, 0.04], [0.52, 0], [0.31, -0.07]];
  for (const sd of [-1, 1]) for (const [y, z] of dots) blob(b, sd * 0.036, y, z, 0.006, 0.026, 0.026, DOT);
  return b.build({ name: 'cleaver' });
}
function nanami() {
  const SUIT = 0xcdb27a, LAPEL = 0xb3965c, BLOND = 0xf0c858, PART = 0x9a7428, SHIRT = 0x2b3c6c, TIE = 0xe2a832, SPOT = 0x4a2a10;
  const FRAME = 0x26261e;
  const lens = plastic(0x8cc23c, { rough: 0.12, metal: 0.3, emissive: 0x3c7010, emissiveIntensity: 0.55 });
  const rig = jfig({
    name: 'nanami', face: nanamiFace(), s: 1.33, headR: 0.3, headH: 0.54, extraHeight: 0.2,
    torso: SUIT, arms: SUIT, legs: 0xc2a670, hips: 0xc2a670, skin: 0xf0cda8, hands: 0xf0cda8, neck: 0xf0cda8,
    hair: (b, r, h) => {
      // short, neat back and sides
      b.cyl(0, h * 0.42, -r * 0.18, r * 1.0, h * 0.5, BLOND, { seg: 18 });
      b.cyl(0, h * 0.88, 0, r * 1.05, h * 0.12 + 0.01, BLOND, { seg: 18 });
      // the 7:3 part: flat and close on the '3' side, a full glossy sweep over the '7' side
      b.sphere(-r * 0.42, h + 0.01, -r * 0.05, r * 0.66, BLOND, { sy: 0.36 });
      b.sphere(r * 0.2, h + 0.02, -r * 0.02, r * 0.9, BLOND, { sy: 0.62 });
      rbox(b, -r * 0.36, h + r * 0.27, -r * 0.08, 0.04, 0.05, r * 1.5, 0, 0, 0.5, PART);    // the part line
      rbox(b, r * 0.16, h * 0.97, r * 0.72, r * 1.35, h * 0.13, r * 0.45, 0.45, 0, 0.18, BLOND);   // swept front
      rbox(b, r * 0.86, h * 0.86, r * 0.2, r * 0.3, h * 0.2, r * 1.1, 0, 0, -0.2, BLOND);    // the sweep falls over his temple
      spike(b, -r * 0.14, h * 0.98, r * 0.88, r * 0.13, 0.22, 2.55, 0.35, BLOND);   // stray locks on the forehead
      spike(b, r * 0.02, h * 0.98, r * 0.92, r * 0.11, 0.17, 2.65, 0.15, BLOND);
      // the green goggle glasses
      for (const sd of [-1, 1]) {
        const a = sd * 0.42, y = h * 0.64;
        rbox(b, S(a) * r, y, Math.cos(a) * r, r * 0.62, h * 0.27, 0.06, 0, a, 0, FRAME);
        rbox(b, S(a) * (r + 0.03), y, Math.cos(a) * (r + 0.03), r * 0.5, h * 0.19, 0.03, 0, a, 0, 0, { mat: lens });
        b.box(S(a) * (r + 0.05) - sd * r * 0.12, y + h * 0.03, Math.cos(a) * (r + 0.05), 0.04, 0.03, 0.01, 0xe8ffd0);   // glint
        rod(b, [S(sd * 0.72) * (r + 0.015), y, Math.cos(0.72) * (r + 0.015)], [S(sd * 1.25) * (r + 0.015), y + 0.01, Math.cos(1.25) * (r + 0.015)], 0.016, FRAME, 5);   // temple arms
      }
      b.box(0, h * 0.64, r * 0.97, r * 0.26, 0.05, 0.05, FRAME);
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      // navy shirt in the V of the jacket
      b.box(0, 0.46 * s, 0.205 * s, 0.34 * s, 0.54 * s, 0.03 * s, SHIRT);
      b.cyl(0, 0.86 * s, 0, 0.2 * s, 0.15 * s, SHIRT, { seg: 14 });
      for (const sd of [-1, 1]) rbox(b, sd * 0.08 * s, 0.94 * s, 0.17 * s, 0.1 * s, 0.07 * s, 0.05 * s, 0.2, 0, sd * 0.5, SHIRT);   // collar points
      // leopard-print tie
      b.box(0, 0.84 * s, 0.215 * s, 0.12 * s, 0.1 * s, 0.05 * s, TIE);
      b.box(0, 0.44 * s, 0.225 * s, 0.11 * s, 0.42 * s, 0.03 * s, TIE);
      rbox(b, 0, 0.44 * s, 0.225 * s, 0.078 * s, 0.078 * s, 0.03 * s, 0, 0, PI / 4, TIE);
      for (const [x, y] of [[-0.03, 0.8], [0.025, 0.74], [-0.025, 0.66], [0.03, 0.6], [-0.02, 0.53], [0.02, 0.48], [0.035, 0.87], [0, 0.7]]) blob(b, x * s, y * s, 0.243 * s, 0.018 * s, 0.022 * s, 0.006, SPOT);
      // lapels and buttons
      for (const sd of [-1, 1]) {
        rbox(b, sd * 0.11 * s, 0.72 * s, 0.226 * s, 0.1 * s, 0.56 * s, 0.035 * s, 0, 0, -sd * 0.27, LAPEL);
        rbox(b, sd * 0.2 * s, 0.86 * s, 0.222 * s, 0.11 * s, 0.13 * s, 0.03 * s, 0, 0, -sd * 0.6, LAPEL);
        b.box(sd * 0.27 * s, 0.34 * s, 0.226 * s, 0.17 * s, 0.035 * s, 0.03 * s, LAPEL);   // pocket flaps
      }
      for (const y of [0.4, 0.27]) b.box(0, y * s, 0.232 * s, 0.05 * s, 0.05 * s, 0.03 * s, 0x5a4026);
      b.box(0.24 * s, 0.7 * s, 0.222 * s, 0.13 * s, 0.025 * s, 0.03 * s, LAPEL);           // breast pocket
    },
    arm: (ab, sd, d) => {
      const s = d.s;
      ab.cyl(0, -0.53 * s, 0, 0.12 * s, 0.035 * s, SHIRT, { seg: 10 });   // cuffs
      if (sd > 0) { ab.cyl(0, -0.565 * s, 0, 0.112 * s, 0.05 * s, 0x2a2018, { seg: 10 }); ab.box(0.1 * s, -0.575 * s, 0, 0.03 * s, 0.07 * s, 0.07 * s, GOLD); }   // the watch: no overtime
    },
  });
  const s = rig.dims.s;
  // the cleaver rides on his back, and comes out for the cheer
  const sheath = new THREE.Group(); sheath.position.set(-0.24 * s, 0.98 * s, -0.27 * s); sheath.rotation.z = 0.5; rig.torso.add(sheath);
  const sc = cleaver(); sc.rotation.set(PI, PI / 2, 0); sc.scale.setScalar(1.1); sheath.add(sc);
  const blade = fxg(rig.armR, 0, handY(rig), 0);
  const hc = cleaver(); hc.rotation.x = PI / 2; blade.add(hc);
  blade.scale.setScalar(1.3);
  // Ratio Technique: a line through the target with its 7:3 weak point
  const ratio = fxg(rig.root, 0, 1.05, 1.1);
  const rb = new BrickBuilder(1);
  rb.boxM(mat4(0, 0, 0, 0, 0, 0, 1.9, 0.06, 0.06), 0, { mat: neon(0xfff0a0, 2.4) });
  rb.boxM(mat4(0.38, 0, 0, 0, 0, PI / 4, 0.17, 0.17, 0.08), 0, { mat: neon(0xff4020, 2.6) });
  ratio.add(rb.build({ name: 'ratio' }));
  const mark = addGlow(ratio, 0xff6030, 0.8, 0.38, 0, 0);
  addGlow(ratio, 0xfff0a0, 1.0, 0, 0, 0, 0.5);
  ratio.rotation.z = -0.45;
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    vis(blade, ch || win); vis(sheath, !(ch || win));
    const on = (ch && f > 0.28 && f < 0.95) || win;
    vis(ratio, on);
    if (on) {
      ratio.scale.x = ch ? sm(seg(f, 0.28, 0.42)) : 1;
      mark.scale.setScalar(0.5 + abs(S(t * 9)) * (ch ? bump(f, 0.36, 0.7) * 1.2 + 0.2 : 0.4));
    }
  };
  return rig;
}

// ---- Toji Fushiguro ------------------------------------------------------------------------
const tojiFace = () => faceMat('jjk-toji', (g) => atlasStyle(g, (ell, line) => {
  for (const sd of [-1, 1]) {
    ell(sd * 30, -12, 14, 9, '#fff'); ell(sd * 30, -11, 9, 8, '#2f4a3a'); ell(sd * 30, -10, 4, 4, '#111'); ell(sd * 30 - 3, -14, 2, 2, '#fff');
    line([[sd * 12, -24], [sd * 46, -20]], '#15161c', 7);
  }
  line([[-18, 26], [8, 28], [20, 22]], '#3a1a1a', 5);
  line([[10, 14], [16, 36]], '#c08a7a', 4);
}), '#eec7a3');
function toji() {
  const rig = jfig({
    name: 'toji', face: tojiFace(), wide: 1.15, torso: 0x1b1b1b, arms: 0x1b1b1b, hands: 0xeec7a3, skin: 0xeec7a3, legs: 0xd8d8d0, hips: 0xd8d8d0,
    hair: (b, r, h) => { back(b, r, h, INK, 0.35, 0.9); cap(b, r, h, INK, 0.82); spikes(b, r, h, INK, 10, 0.2, 0.9, { seed: 31, rnd: 0.7 }); fringe(b, r, h, INK, 4, 0.28, 2.1, { spread: 0.6 }); },
    torsoExtra: (b, d) => { const s = d.s; b.cyl(0, 0.9 * s, 0, 0.17 * s, 0.1 * s, 0x1b1b1b, { seg: 12 }); b.box(0, 0.08 * s, 0, 1.0 * s, 0.1 * s, 0.5 * s, 0x2a2a2a); },
  });
  // his inventory curse coils round his shoulders
  const worm = fxg(rig.torso, 0, rig.dims.shoulderY - 0.02, -0.02);
  const wb = new BrickBuilder(1);
  for (let k = 0; k < 10; k++) {
    const a = -2.3 + k * 0.5;
    wb.sphere(S(a) * 0.5, 0.1 + S(k * 1.3) * 0.03, -Math.cos(a) * 0.34, 0.13, k % 2 ? 0x9a7ab0 : 0x7a5a90);
  }
  wb.sphere(S(2.75) * 0.5, 0.18, -Math.cos(2.75) * 0.34, 0.17, 0x9a7ab0);
  for (const sd of [-1, 1]) wb.sphere(S(2.75) * 0.5 + sd * 0.08, 0.3, -Math.cos(2.75) * 0.34 + 0.08, 0.04, C.black);
  wb.sphere(S(2.75) * 0.5, 0.14, -Math.cos(2.75) * 0.34 + 0.14, 0.07, 0x5a0a1a);
  worm.add(wb.build({ name: 'worm' }));
  // Inverted Spear of Heaven
  const spear = fxg(rig.armR, 0, handY(rig), 0);
  const sb = new BrickBuilder(1);
  sb.box(0, -0.04, -0.02, 0.06, 0.08, 0.3, 0x2a2a2a);
  sb.box(0, -0.14, 0.15, 0.05, 0.28, 0.04, 0x8a8a9a);
  sb.box(0, -0.035, 0.44, 0.03, 0.07, 0.56, 0xcfd8ea, { matOpts: { metal: 0.8, rough: 0.2 } });
  spike(sb, 0, 0, 0.72, 0.035, 0.12, PI / 2, 0, 0xcfd8ea, 0, { matOpts: { metal: 0.8, rough: 0.2 } });
  spear.add(sb.build({ name: 'spear' }));
  spear.scale.setScalar(1.4);
  const gleam = addGlow(spear, 0xbfe0ff, 0.6, 0, 0, 0.6, 0.6);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    const wk = ch ? sm(seg(f, 0, 0.2)) * (1 - sm(seg(f, 0.9, 1))) : win ? 1 : 0;
    vis(worm, wk > 0.01);
    if (wk > 0.01) worm.scale.setScalar(wk);
    vis(spear, ch && f > 0.32);
    if (ch) gleam.scale.setScalar(0.4 + bump(f, 0.55, 0.8) * 0.8);
  };
  return rig;
}

// ---- Suguru Geto ----------------------------------------------------------------------------
function geto() {
  const ROBE = 0x1b1b1b, KESA = 0x8a5a2a;
  const rig = jfig({
    name: 'geto', face: 'geto', torso: ROBE, arms: ROBE, legs: ROBE, skin: SKIN,
    hair: (b, r, h) => {
      back(b, r, h, INK, 0.3, 0.92); cap(b, r, h, INK, 0.8);
      b.sphere(0, h * 0.98, -r * 0.45, r * 0.55, INK);
      rbox(b, -r * 0.72, h * 0.5, r * 0.72, 0.06, h * 0.62, 0.07, 0.1, 0, 0.15, INK);
      for (const sd of [-1, 1]) b.box(sd * r * 1.02, h * 0.28, 0, 0.04, 0.12, 0.12, GOLD);
    },
    torsoExtra: (b, d) => { const s = d.s; rbox(b, 0.05 * s, 0.6 * s, 0, 0.28 * s, 1.05 * s, 0.5 * s, 0, 0, 0.55, KESA); b.box(0, 0.1 * s, 0, 0.95 * s, 0.12 * s, 0.48 * s, KESA); b.cyl(0, 0.9 * s, 0, 0.18 * s, 0.12 * s, ROBE, { seg: 12 }); },
  });
  // Maximum Uzumaki: a dark swirling orb of cursed spirits in his palm
  const orb = fxg(rig.armR, 0, handY(rig) - 0.05, 0.3);
  const ob = new BrickBuilder(1);
  ob.sphere(0, 0, 0, 0.17, 0x1a0a24);
  orb.add(ob.build({ name: 'uzumaki' }));
  addGlow(orb, 0x8a2aff, 1.0, 0, 0, 0, 0.85);
  const swirl = new THREE.Group(); orb.add(swirl);
  const spirit = (b, x, y, z, r, col) => { b.sphere(x, y, z, r, col); b.sphere(x, y + r * 0.2, z + r * 0.8, r * 0.4, WHITE); b.sphere(x, y + r * 0.2, z + r * 1.1, r * 0.18, C.black); };
  const sw = new BrickBuilder(1);
  for (let k = 0; k < 4; k++) { const a = k * PI / 2; spirit(sw, Math.cos(a) * 0.3, S(a) * 0.3, 0, 0.06, [0x7a8a6a, 0x9a7a8a, 0x6a7a9a, 0x8a6a5a][k]); }
  swirl.add(sw.build({ name: 'swirl' }));
  // win: his cursed spirits circle the kart
  const horde = fxg(rig.root, 0, 1.3, -0.1);
  const hb = new BrickBuilder(1);
  for (let k = 0; k < 5; k++) { const a = k * PI * 0.4; spirit(hb, Math.cos(a) * 1.35, S(k * 2.1) * 0.3, S(a) * 1.35, 0.22 + (k % 2) * 0.08, [0x7a8a6a, 0x9a7a8a, 0x6a7a9a, 0x8a6a5a, 0x5a6a5a][k]); }
  horde.add(hb.build({ name: 'spirits' }));
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    vis(orb, ch && f > 0.04 && f < 0.95);
    if (ch) { orb.scale.setScalar(sm(seg(f, 0.04, 0.35)) * (1 + 0.7 * sm(seg(f, 0.6, 0.78))) * (1 - sm(seg(f, 0.85, 0.95)))); swirl.rotation.z = t * 9; }
    vis(horde, win);
    if (win) horde.rotation.y = t * 1.6;
  };
  return rig;
}

// ---- Ryomen Sukuna --------------------------------------------------------------------------
// Four red eyes (a smaller pair under the first), a sharp-toothed smirk and his black markings
// on a custom face print; spiky salmon hair swept up and back.
const SK = { HAIR: 0xf08c96, HAIR2: 0xdc6f80 };
const sukunaFace = () => faceMat('jjk-sukuna-heian', (g) => atlasStyle(g, (ell, line, g) => {
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  // four eyes: red irises, black slit pupils, angry lids; the lower pair a little smaller, on the cheeks
  const eye = (x, y, w, hh, sd) => {
    g.save();
    g.beginPath(); g.moveTo(x - sd * w, y); g.quadraticCurveTo(x, y - hh * 1.5, x + sd * w, y - hh * 0.7); g.quadraticCurveTo(x + sd * w * 0.2, y + hh * 1.3, x - sd * w, y); g.closePath();
    g.fillStyle = '#fffaf2'; g.fill(); g.clip();
    ell(x + sd * 1, y - hh * 0.15, hh * 1.0, hh * 1.0, '#d0161c');
    ell(x + sd * 1, y - hh * 0.15, hh * 0.28, hh * 0.85, '#120406');
    ell(x - sd * 3, y - hh * 0.55, hh * 0.25, hh * 0.25, '#fff');
    g.restore();
    line([[x - sd * (w + 2), y + 1], [x, y - hh * 1.05], [x + sd * (w + 4), y - hh * 1.0]], '#141216', Math.max(3, hh * 0.55));
  };
  for (const sd of [-1, 1]) {
    eye(sd * 30, -15, 17, 10, sd);
    eye(sd * 33, 8, 13, 7.5, sd);
    g.fillStyle = '#141216'; g.beginPath(); g.moveTo(sd * 10, -24); g.lineTo(sd * 52, -38); g.lineTo(sd * 54, -30); g.lineTo(sd * 14, -18); g.closePath(); g.fill();   // angry brows
    // tattoos: two bands across each cheek, a line under each lower eye
    line([[sd * 52, 10], [sd * 76, 7]], '#141216', 5);
    line([[sd * 52, 20], [sd * 74, 18]], '#141216', 5);
  }
  // the forehead mark
  line([[-22, -44], [-8, -40], [8, -40], [22, -44]], '#141216', 4);
  line([[0, -52], [0, -40]], '#141216', 4);
  line([[2, -4], [6, 12], [0, 15]], '#b98a74', 3);   // nose
  // a wide, cocky, sharp-toothed grin (his left corner higher)
  const q = (a, c, b, k) => [(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1]];
  const L = [-36, 28], R = [38, 20], TOP = [0, 38], BOT = [6, 64];
  g.fillStyle = '#3a080c'; g.beginPath(); g.moveTo(...L); g.quadraticCurveTo(...TOP, ...R); g.quadraticCurveTo(...BOT, ...L); g.fill();
  g.fillStyle = '#fbf6ea';
  for (let k = 0; k < 8; k++) {
    const a = q(L, TOP, R, 0.06 + k * 0.115), b = q(L, TOP, R, 0.06 + (k + 1) * 0.115), m = q(L, TOP, R, 0.06 + (k + 0.5) * 0.115);
    const len = k === 0 || k === 7 ? 11 : 7;
    g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(m[0], m[1] + len); g.closePath(); g.fill();
    const c = q(L, BOT, R, 0.1 + k * 0.1), e = q(L, BOT, R, 0.1 + (k + 1) * 0.1), n = q(L, BOT, R, 0.1 + (k + 0.5) * 0.1);
    if (k < 8) { g.beginPath(); g.moveTo(...c); g.lineTo(...e); g.lineTo(n[0], n[1] - (k === 0 || k === 7 ? 9 : 6)); g.closePath(); g.fill(); }
  }
  line([L, [L[0] - 4, L[1] - 3]], '#5a1a1a', 3); line([R, [R[0] + 5, R[1] - 6]], '#5a1a1a', 3);   // smirk creases
}), '#f3d6bf');
// a crossing slash of neon light (cross = an X for Cleave)
function skSlash(parent, cross) {
  const g = fxg(parent);
  const b = new BrickBuilder(1), red = neon(0xe0000c, 1.7), core = neon(0xffe0e0, 1.6);
  const cut = (rz, L) => { rbox(b, 0, 0, 0, L, 0.08, 0.04, 0, 0, rz, 0, { mat: red }); rbox(b, 0, 0, 0.02, L * 0.8, 0.025, 0.04, 0, 0, rz, 0, { mat: core }); };
  cut(0.6, 1.6);
  if (cross) cut(-0.6, 1.6);
  else { rbox(b, 0.08, -0.14, 0, 1.0, 0.045, 0.04, 0, 0, 0.66, 0, { mat: red }); }
  g.add(b.build({ name: 'slash' }));
  addGlow(g, 0xff2020, cross ? 1.8 : 1.2, 0, 0, 0, 0.65);
  return g;
}
// Malevolent Shrine: a dark shrine with a fanged maw, horns and skulls (front = +Z)
function skShrine(parent) {
  const g = fxg(parent);
  const b = new BrickBuilder(1), WOOD = 0x3a1416, DARK = 0x1a1214, BONE = 0xe8e0cc;
  b.box(0, 0, 0, 2.6, 0.22, 1.3, DARK);
  b.box(0, 0.22, 0, 2.2, 0.12, 1.1, 0x2a1c1c);
  for (const x of [-0.9, -0.3, 0.3, 0.9]) b.box(x, 0.34, 0.38, 0.14, 1.3, 0.14, WOOD);
  b.box(0, 0.34, -0.2, 2.0, 1.3, 0.6, 0x241618);
  // the shrine's great maw between the middle pillars
  b.box(0, 0.48, 0.42, 0.46, 1.0, 0.04, 0, { mat: neon(0x5a0010, 1.6) });
  for (let k = 0; k < 5; k++) { const x = -0.18 + k * 0.09; spike(b, x, 1.46, 0.44, 0.04, 0.2, PI, 0, BONE); spike(b, x, 0.5, 0.44, 0.04, 0.18, 0, 0, BONE); }
  // two sweeping roofs with upturned eaves
  b.add(taperGeo(2.9, 2.2, 0.3, 1.6, 1.2), plastic(DARK), 0, 1.64, 0.05);
  b.add(taperGeo(2.2, 1.2, 0.36, 1.2, 0.7), plastic(DARK), 0, 2.12, 0.05);
  for (const sd of [-1, 1]) {
    rbox(b, sd * 1.5, 1.82, 0.05, 0.5, 0.1, 1.6, 0, 0, -sd * 0.45, DARK);
    rbox(b, sd * 1.12, 2.3, 0.05, 0.4, 0.09, 1.2, 0, 0, -sd * 0.5, DARK);
    spike(b, sd * 0.34, 2.46, 0.05, 0.08, 0.6, 0, -sd * 0.7, BONE);   // horns on the ridge
  }
  b.box(-0.6, 1.94, 0.05, 1.2, 0.04, 1.3, 0, { mat: neon(0xb0101c, 1.4) });
  b.box(0.6, 1.94, 0.05, 1.2, 0.04, 1.3, 0, { mat: neon(0xb0101c, 1.4) });
  // a pile of skulls at its feet
  for (let k = 0; k < 7; k++) {
    const x = -1.15 + k * 0.38, z = 0.62 + (k % 2) * 0.06;
    b.sphere(x, 0.36, z, 0.13, BONE, { sy: 0.9 });
    for (const sd of [-1, 1]) b.box(x + sd * 0.045, 0.36, z + 0.1, 0.05, 0.05, 0.04, DARK);
  }
  g.add(b.build({ name: 'malevolent-shrine' }));
  addGlow(g, 0xff1020, 1.4, 0, 0.95, 0.5, 0.75);
  addGlow(g, 0x8a0010, 4.0, 0, 1.4, -0.2, 0.45);
  return g;
}
function sukuna() {
  const KIM = 0xf2eee4, SSK = 0xf3d6bf, TAT = 0x1b1b1b;
  const rig = jfig({
    name: 'sukuna', face: sukunaFace(), s: 1.38, wide: 1.15, torso: KIM, legs: KIM, hips: KIM, arms: SSK, hands: SSK, skin: SSK, extraHeight: 0.3,
    hair: (b, r, h) => {
      back(b, r, h, SK.HAIR, 0.3, 0.92); cap(b, r, h, SK.HAIR, 0.86);
      b.sphere(0, h * 0.95, -r * 0.1, r * 1.0, SK.HAIR, { sy: 0.42 });
      spikes(b, r, h, SK.HAIR, 12, 0.4, 0.85, { seed: 17, back: 0.45, ring: 0.85, rnd: 0.5 });
      spikes(b, r, h, SK.HAIR2, 7, 0.3, 1.35, { seed: 5, back: 0.7, ring: 0.95, top: false });
      spikes(b, r, h * 0.62, SK.HAIR2, 6, 0.24, 1.7, { seed: 23, back: 0.9, ring: 0.9, top: false });   // the nape
      fringe(b, r, h, SK.HAIR, 4, 0.3, 0.45, { spread: 0.75, y: 0.9, rad: 0.2 });
      fringe(b, r, h, SK.HAIR2, 5, 0.12, 2.5, { spread: 0.85, y: 0.9, rad: 0.15 });   // short locks over the hairline
    },
    arm: (ab, sd, d) => { const s = d.s; for (let k = 0; k < 2; k++) ab.box(0, (-0.3 - k * 0.12) * s, 0, 0.29 * s, 0.035 * s, 0.29 * s, TAT); },
    torsoExtra: (b, d) => {
      const s = d.s;
      b.cyl(0, 0.82 * s, -0.02 * s, 0.3 * s, 0.2 * s, TAT, { seg: 14 });
      b.box(0, 0.08 * s, 0, 1.08 * s, 0.18 * s, 0.5 * s, TAT);
      for (const sd of [-1, 1]) rbox(b, sd * 0.1 * s, 0.6 * s, 0.215 * s, 0.07 * s, 0.6 * s, 0.03 * s, 0, 0, sd * 0.35, TAT);
    },
  });
  // Dismantle / Cleave: slashes thrown from his hands, flying ahead of the kart
  const hy = handY(rig);
  const slashes = [
    { g: skSlash(rig.root, false), a: 0.18, from: [rig.armR], rz: 0.3 },
    { g: skSlash(rig.root, false), a: 0.35, from: [rig.armL], rz: -0.3 },
    { g: skSlash(rig.root, true), a: 0.52, from: [rig.armL, rig.armR], rz: 0 },
  ];
  const wins = [0.1, 0.42, 0.7];
  const mi = new THREE.Matrix4(), hv = new THREE.Vector3();
  const launch = (sl) => {
    rig.root.updateMatrixWorld(true); mi.copy(rig.root.matrixWorld).invert();
    sl.p0 = (sl.p0 || new THREE.Vector3()).set(0, 0, 0);
    for (const arm of sl.from) sl.p0.add(hv.set(0, hy, 0).applyMatrix4(arm.matrixWorld).applyMatrix4(mi));
    sl.p0.divideScalar(sl.from.length);
  };
  const aura = fxg(rig.root, 0, 1.35, -0.3); addGlow(aura, 0xff1a1a, 3.0, 0, 0, 0, 0.5);
  // Domain Expansion: Malevolent Shrine rises behind the kart on the win
  const shrine = skShrine(rig.root); shrine.position.set(0, -0.5, -2.6); shrine.scale.setScalar(1.25);
  let winT = -1;
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    const lf = win ? (t % 1.6) / 1.6 : f;
    slashes.forEach((sl, k) => {
      const a = win ? wins[k] : sl.a, p = seg(lf, a, a + 0.32), on = (ch || win) && lf > a && lf < a + 0.32;
      if (on && !sl.live) launch(sl);
      sl.live = on;
      vis(sl.g, on);
      if (on) {
        sl.g.position.set(sl.p0.x * (1 - p * 0.3), sl.p0.y + p * 0.3, sl.p0.z + 0.3 + p * 3.2);
        sl.g.rotation.set(0, 0, sl.rz + (k === 2 ? S(t * 9) * 0.1 : 0));
        const sc = sm(seg(p, 0, 0.18)) * (0.7 + p * 0.9);
        sl.g.scale.set(sc * (1 - sm(seg(p, 0.7, 1))), sc, sc);
      }
    });
    vis(aura, ch || win);
    if (ch || win) aura.scale.setScalar(1 + S(t * 13) * 0.08);
    if (win && winT < 0) winT = t;
    if (!win) winT = -1;
    vis(shrine, win);
    if (win) shrine.position.y = lerp(-3.2, -0.5, sm((t - winT) / 0.9));
  };
  return rig;
}

// ---- Mahito ---------------------------------------------------------------------------------
function mahito() {
  const MSK = 0xe4dcd6, MH = 0x8a9ab0, MH2 = 0x5a6a80;
  const rig = jfig({
    name: 'mahito', face: 'mahito', skin: MSK, torso: 0x2a2a34, legs: 0x3a3a48, arms: MSK, hands: MSK,
    hair: (b, r, h) => {
      cap(b, r, h, MH, 0.85); back(b, r, h, MH2, 0.1, 0.9); b.sphere(0, h * 0.92, -r * 0.08, r * 1.07, MH, { sy: 0.45 });
      const cols = [MH, 0xa8b4c4, MH2];
      for (let k = 0; k < 9; k++) {
        const a = k < 2 ? (k ? -1.1 : 1.1) : PI * 0.45 + ((k - 2) / 6) * PI * 1.1;
        rbox(b, S(a) * r * 1.02, h * 0.28, Math.cos(a) * r * 1.02, r * 0.38, h * (k < 2 ? 0.9 : 1.15), r * 0.2, 0, a, 0, cols[k % 3]);
      }
      for (const sd of [-1, 1]) rbox(b, sd * r * 0.5, h * 0.84, r * 0.72, r * 0.95, h * 0.16, r * 0.3, 0.25, 0, sd * 0.4, sd < 0 ? MH : 0xa8b4c4);
      spikes(b, r, h, MH, 6, 0.14, 0.9, { seed: 5, top: false });
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      b.cyl(0, 0.9 * s, 0, 0.18 * s, 0.1 * s, 0x2a2a34, { seg: 12 });
      for (const [x, y, c] of [[-0.18, 0.62, 0x4a4a5a], [0.2, 0.36, 0x5a4a5a], [0.05, 0.82, 0x3a4a5a]]) b.box(x * s, y * s, 0.22 * s, 0.2 * s, 0.18 * s, 0.03 * s, c);
      for (const sd of [-1, 1]) b.box(sd * 0.42 * s, 0.7 * s, 0, 0.26 * s, 0.26 * s, 0.4 * s, 0x2a2a34);
    },
  });
  // Idle Transfiguration: his hand swells into a stitched blade
  const morph = fxg(rig.armR, 0, handY(rig) - 0.04, 0);
  const mb = new BrickBuilder(1);
  mb.sphere(0, -0.06, 0, 0.17, MSK);
  mb.boxM(mat4(0, -0.48, 0.06, 0.12, 0, 0, 0.07, 0.78, 0.34), MSK);
  spike(mb, 0, -0.86, 0.11, 0.12, 0.34, PI + 0.12, 0, MSK);
  for (let k = 0; k < 4; k++) { mb.box(0, -0.25 - k * 0.15, 0.06, 0.09, 0.025, 0.24, 0x5a3a4a); spike(mb, 0, -0.32 - k * 0.15, 0.22, 0.05, 0.14, PI / 2, 0, MSK); }
  morph.add(mb.build({ name: 'morph' }));
  addGlow(morph, 0x7a9aff, 1.0, 0, -0.35, 0.05, 0.6);
  const aura = fxg(rig.root, 0, 1.35, -0.25); addGlow(aura, 0x7a8ad8, 2.8, 0, 0, 0, 0.5); addGlow(aura, 0x4a6aff, 1.4, 0, 0.5, 0.2, 0.5);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    const k = ch ? sm(seg(f, 0.05, 0.3)) * (1 - sm(seg(f, 0.85, 1))) : 0;
    vis(morph, k > 0.01);
    if (k > 0.01) morph.scale.set(k * (1 + S(t * 25) * 0.12), k * (1 + S(t * 19) * 0.15), k);
    vis(aura, win);
    if (win) aura.scale.setScalar(1 + S(t * 6) * 0.1);
  };
  return rig;
}

// ---- Jogo -------------------------------------------------------------------------------------
const jogoFace = () => faceMat('jjk-jogo2', (g) => atlasStyle(g, (ell, line, g) => {
  // one huge, furious eye
  ell(0, -12, 40, 27, '#5e5a52');
  ell(0, -10, 36, 23, '#fbf6ea');
  ell(2, -8, 20, 18, '#c0201a'); ell(2, -8, 10, 10, '#140808'); ell(-6, -15, 5, 4, '#fff');
  g.fillStyle = '#4a4740'; g.beginPath(); g.moveTo(-46, -30); g.lineTo(46, -20); g.lineTo(44, -10); g.quadraticCurveTo(0, -30, -44, -22); g.closePath(); g.fill();   // scowling lid
  // black lips, black teeth
  g.fillStyle = '#121212'; g.beginPath(); g.moveTo(-50, 24); g.quadraticCurveTo(0, 18, 50, 24); g.quadraticCurveTo(46, 52, 0, 54); g.quadraticCurveTo(-46, 52, -50, 24); g.fill();
  g.fillStyle = '#3e3d3a'; for (let k = -4; k <= 4; k++) { g.fillRect(k * 10 - 4, 28, 8, 9); g.fillRect(k * 9 - 3.5, 40, 7, 8); }
  for (const sd of [-1, 1]) line([[sd * 54, 18], [sd * 60, 36]], '#9a978e', 3);   // cheek creases
}), '#c9c6bd');
// Jogo's open white hood (shared shape with his track figure in maps/jjk-props.js)
function jogoHood(b, s, W, D, R, neckY, col, M, sph) {
  const m = plastic(col), rx = R + 0.08, rz = R + 0.06;
  const roll = cached('jjkJogoHoodRoll', () => new THREE.TorusGeometry(1, 0.26, 8, 26, PI * 2 - 1.3).rotateZ(PI / 2 + 0.65).rotateX(PI / 2));
  b.addMatrix(roll, m, M(0, neckY - 0.05 * s, 0, 0, 0, 0, rx, 0.42 * s, rz));
  // lapels from the roll's open ends down to a V over the black clothes
  const ex = Math.sin(0.65) * rx;
  for (const sd of [-1, 1]) b.boxM(M(sd * (ex + 0.1 * s) / 2, neckY - 0.3 * s, 0.25 * s * D, 0.1, 0, -sd * 0.42, 0.13 * s, 0.5 * s, 0.06 * s), col);
  // the hood itself, folded down on his back below the head
  b.addMatrix(sph, m, M(0, neckY - 0.16 * s, -rz - 0.04 * s, 0.25, 0, 0, 0.3 * s * W, 0.24 * s, 0.13 * s));
  b.addMatrix(sph, m, M(0, neckY - 0.02 * s, -rz + 0.02 * s, -0.2, 0, 0, 0.26 * s * W, 0.1 * s, 0.11 * s));
}
function jogo() {
  const JY = 0xe0a81c, JSK = 0xc9c6bd, BLK = 0x1b1b1b, ROCK = 0x8a4a26, ROCK2 = 0x6a3418, FLUFF = 0xf6f4ee;
  const lava = neon(0xff5a10, 2.4);
  const smoke = plastic(0x9a958e, { trans: true, opacity: 0.7 });
  const rig = jfig({
    name: 'jogo', face: jogoFace(), s: 1.05, wide: 1.3, deep: 1.15, headR: 0.45, headH: 0.5, extraHeight: 0.85,
    torso: JY, arms: JY, hands: JSK, legs: BLK, hips: BLK, neck: JSK, skin: JSK,
    hair: (b, r, h) => {
      // the head tapers up into a volcano: grey shoulders, a rocky brown cone, a lava crater
      b.add(frustum(0.74, 1, 18), plastic(JSK), 0, h, 0, 0, r, 0.24, r);
      b.add(frustum(0.6, 1, 18), plastic(ROCK), 0, h + 0.24, 0, 0, r * 0.76, 0.26, r * 0.76);
      const T = h + 0.5, R = r * 0.456;
      b.addMatrix(cached('jjkJogoRim', () => new THREE.TorusGeometry(1, 0.16, 6, 18)), plastic(ROCK2), mat4(0, T, 0, PI / 2, 0, 0, R, R, R));
      b.cyl(0, T - 0.04, 0, R * 0.92, 0.05, 0, { mat: lava, seg: 14 });
      // glowing cracks running down the cone
      for (const a of [0.35, 1.5, 2.7, 3.8, 5.0]) {
        const pt = (k, da) => { const rr = lerp(R * 1.03, r * 0.78, k), aa = a + da; return [S(aa) * rr, T - k * 0.26, Math.cos(aa) * rr]; };
        rod(b, pt(0, 0), pt(0.5, 0.12), 0.02, lava, 4);
        rod(b, pt(0.5, 0.12), pt(0.92, 0.02), 0.018, lava, 4);
      }
      // a curl of smoke
      b.add(lsph(), smoke, 0.03, T + 0.12, 0, 0, 0.11, 0.09, 0.11);
      b.add(lsph(), smoke, -0.06, T + 0.26, -0.03, 0, 0.13, 0.11, 0.13);
      b.add(lsph(), smoke, 0.05, T + 0.42, -0.07, 0, 0.15, 0.12, 0.15);
      // corks plugged into his ear holes
      for (const sd of [-1, 1]) {
        rod(b, [sd * r * 0.9, h * 0.5, 0], [sd * (r + 0.02), h * 0.5, 0], 0.11, 0x3a3834, 12);
        rod(b, [sd * r * 0.9, h * 0.5, 0], [sd * (r + 0.1), h * 0.5, 0], 0.085, 0xc49a5a, 12);
      }
    },
    torsoExtra: (b, d) => {
      const s = d.s, W = d.W, D = d.D;
      // black clothes under the open yellow shawl
      b.box(0, 0.18 * s, 0.19 * s * D, 0.3 * s, 0.7 * s, 0.1 * s, BLK);
      // the white hood of his coat, worn down: a thick roll round the neck that opens at the
      // front into two lapels, and the folded hood lying on his back
      jogoHood(b, s, W, D, d.headR, d.neckY, FLUFF, mat4, lsph());
      // black splotches all over the shawl
      for (const [u, y, rx, ry] of [[-0.62, 0.62, 0.07, 0.06], [0.7, 0.42, 0.06, 0.07], [-0.75, 0.3, 0.06, 0.05], [0.58, 0.72, 0.05, 0.05], [-0.5, 0.42, 0.04, 0.04], [0.82, 0.62, 0.04, 0.05]]) torsoSpot(b, d, 'f', u, y * s, rx * s, ry * s, BLK);
      for (const [u, y, rx, ry] of [[-0.5, 0.7, 0.08, 0.07], [0.3, 0.5, 0.07, 0.06], [-0.1, 0.3, 0.06, 0.06], [0.6, 0.8, 0.06, 0.05], [-0.6, 0.35, 0.05, 0.06], [0.1, 0.78, 0.05, 0.05], [0.7, 0.3, 0.05, 0.05]]) torsoSpot(b, d, 'b', u, y * s, rx * s, ry * s, BLK);
      for (const sd of [-1, 1]) for (const [u, y] of [[0.3, 0.6], [-0.5, 0.35]]) torsoSpot(b, d, sd, u, y * s, 0.06 * s, 0.055 * s, BLK);
    },
    arm: (ab, sd, d) => {
      const s = d.s, w = Math.sqrt(d.W);
      ab.cyl(0, -0.58 * s, 0, 0.15 * s * w, 0.12 * s, JY, { seg: 12 });   // wide sleeve mouth
      for (const [y, side, u] of [[-0.2, 'o', 0.2], [-0.4, 'f', -0.3], [-0.32, 'b', 0.4], [-0.5, 'o', -0.4]]) {
        const hw = (0.12 + 0.02 * ((y * s + 0.52 * s) / (0.5 * s))) * s * w;
        if (side === 'o') blob(ab, sd * hw, y * s, u * hw, 0.01, 0.05 * s, 0.05 * s, BLK);
        else blob(ab, u * hw, y * s, (side === 'f' ? 1 : -1) * hw, 0.05 * s, 0.045 * s, 0.01, BLK);
      }
    },
  });
  const d = rig.dims, top = d.headH + 0.5;
  // eruption from the crater
  const er = fxg(rig.head, 0, top, 0);
  const jet = new THREE.Group(); er.add(jet);
  const jb = new BrickBuilder(1); jb.cone(0, 0, 0, 0.2, 0.9, 0, { mat: neon(0xff6a10, 2.6) }); jb.cone(0, 0, 0, 0.12, 1.2, 0, { mat: neon(0xffd040, 2.6) });
  jet.add(jb.build({ name: 'jet' }));
  addGlow(er, 0xff5a10, 2.0, 0, 0.45, 0, 0.85);
  const blobs = [];
  for (let k = 0; k < 6; k++) blobs.push(ball(er, 0xff8a20, 0.1, 0, 0, 0, 2.4));
  // Maximum Meteor
  const met = fxg(rig.root, 0, 2.95, 0.1);
  ball(met, 0xff5010, 0.4, 0, 0, 0, 1.4);
  const mb = new BrickBuilder(1);
  for (let k = 0; k < 7; k++) { const a = k * 0.9, e = S(k * 2.3) * 0.9; mb.sphere(Math.cos(a) * Math.cos(e) * 0.37, S(e) * 0.37, S(a) * Math.cos(e) * 0.37, 0.13, 0x3a1a10); }
  met.add(mb.build({ name: 'meteor' }));
  addGlow(met, 0xff6a20, 2.4, 0, 0, 0, 0.75);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', ta = n === 'taunt', win = n === 'win';
    const on = ch || ta;
    vis(er, on);
    if (on) {
      const gt = ch ? f * 1.5 : f * 1.1;
      er.scale.setScalar(ch ? 1 : 0.55);
      jet.scale.set(1, 0.5 + abs(S(t * 23)) * 0.55, 1);
      for (let k = 0; k < 6; k++) {
        const tt = (gt + k * 0.13) % 0.75, a = k * 1.257, v = 0.5 + (k % 2) * 0.35;
        blobs[k].position.set(Math.cos(a) * v * tt, (2.6 + (k % 3) * 0.4) * tt - 5 * tt * tt, S(a) * v * tt);
      }
    }
    vis(met, win);
    if (win) { met.rotation.set(t * 0.7, t * 1.3, 0); met.position.y = 2.95 + S(t * 3) * 0.06; }
  };
  return rig;
}

// ---- Transfigured Human ----------------------------------------------------------------------
function transfigured() {
  const TS = 0xb9a9c4, TD = 0x6a5a7a;
  const rig = jfig({
    name: 'transfigured', wide: 1.2, torso: TS, arms: TS, hands: TD, legs: TD, hips: TD, skin: TS, neck: TS, extraHeight: 0.25,
    head: (b, d) => {
      const r = d.headR, h = d.headH;
      atlasHead(b, 'cursed', 0.04, 0, 0.03, r * 1.05, h, PI + 0.25);
      b.sphere(-r * 0.75, h * 0.85, -r * 0.1, r * 0.55, TS);
      b.sphere(r * 0.3, h * 1.0, -r * 0.2, r * 0.5, TS, { sy: 0.8 });
      b.sphere(-r * 0.95, h * 0.98, r * 0.22, r * 0.22, WHITE);
      b.sphere(-r * 1.02, h * 1.0, r * 0.38, r * 0.1, C.black);
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      b.sphere(0.35 * s, 0.75 * s, -0.1 * s, 0.33 * s, TS);
      b.sphere(-0.25 * s, 0.35 * s, 0.12 * s, 0.28 * s, TD);
      b.sphere(0.1 * s, 0.6 * s, -0.22 * s, 0.3 * s, TS);
    },
    arm: (ab, sd, d) => {
      const s = d.s;
      if (sd < 0) { ab.sphere(0, -0.3 * s, 0, 0.21 * s, TS); ab.sphere(0, -0.72 * s, 0.02 * s, 0.16 * s, TD); for (let k = -1; k <= 1; k++) spike(ab, k * 0.07 * s, -0.8 * s, 0.05 * s, 0.035 * s, 0.14 * s, PI - 0.3, k * 0.3, 0xe8e0d0); }
      else ab.sphere(0.03 * s, -0.15 * s, 0.05 * s, 0.13 * s, TD);
    },
  });
  const miasma = fxg(rig.root, 0, 1.6, 0);
  addGlow(miasma, 0x9a5aff, 1.6, 0.35, 0.2, 0, 0.6); addGlow(miasma, 0x6a3ac0, 1.3, -0.4, 0.5, -0.2, 0.6);
  rig.idle = (t) => { const k = S(t * 5.5); rig.torso.scale.set(1 + k * 0.035, 1 - k * 0.04, 1 + k * 0.035); rig.head.rotation.z += S(t * 3.3) * 0.08; };
  rig.fx = (n, f, t) => {
    const on = n === 'cheer' || n === 'win';
    vis(miasma, on);
    if (on) { miasma.rotation.y = t * 2; miasma.scale.setScalar(1 + S(t * 9) * 0.15); }
  };
  return rig;
}

// ---- Mahoraga --------------------------------------------------------------------------------
const mahoFace = () => faceMat('jjk-mahoraga', (g) => atlasStyle(g, (ell, line, g) => {
  ell(0, -36, 70, 9, '#d9d4ca');                                        // heavy brow
  for (const sd of [-1, 1]) { ell(sd * 32, -14, 20, 9, '#4a4a52'); ell(sd * 32, -13, 13, 5, '#16161a'); }   // the eye sockets the wings grow from
  line([[0, -26], [0, 8]], '#cbc5bb', 6); ell(-7, 12, 5, 3, '#9a948a'); ell(7, 12, 5, 3, '#9a948a');   // nose
  // the wide, stern statue mouth
  ell(0, 32, 30, 10, '#b0a29f'); line([[-30, 31], [0, 34], [30, 31]], '#3a2c2c', 5);
  line([[-12, 48], [12, 48]], '#d0cac0', 4);
  for (const sd of [-1, 1]) line([[sd * 60, 0], [sd * 50, 40], [sd * 22, 58]], '#d6d1c7', 4);   // jaw
}), '#ece8e0');
function mahoraga() {
  const MW = 0xece8e0, MG = 0xd2cdc4, WING = 0xfaf8f2, WING2 = 0xdedad2, HAK = 0x24242c, SASH = 0xf6f4ee, CHAIN = 0x8a8e98;
  const metal = { matOpts: { metal: 0.6, rough: 0.3 } };
  const rig = jfig({
    name: 'mahoraga', face: mahoFace(), s: 1.5, wide: 1.4, deep: 1.1, headR: 0.27, headH: 0.46, extraHeight: 1.0,
    torso: MW, arms: MW, hands: MW, legs: HAK, hips: HAK, skin: MW, neck: MW,
    hair: (b, r, h) => {
      // four wings sprouting from the eye sockets
      for (const sd of [-1, 1]) {
        const bx = sd * r * 0.42, bz = r * 0.86;
        for (const [phi, L, dy] of [[0.38, 0.82, 0.03], [-0.22, 0.66, -0.03]]) {
          feather(b, bx, h * 0.6 + dy, bz, sd > 0 ? phi : PI - phi, sd * 0.4, L, 0.3, 0.04, WING);
          feather(b, bx, h * 0.6 + dy, bz - 0.03, sd > 0 ? phi + 0.2 : PI - phi - 0.2, sd * 0.55, L * 0.8, 0.24, 0.04, WING2);
          feather(b, bx, h * 0.6 + dy, bz - 0.05, sd > 0 ? phi - 0.18 : PI - phi + 0.18, sd * 0.5, L * 0.7, 0.2, 0.04, WING2);
        }
      }
      // the serpent-like tail from the back of the head
      for (let k = 0; k < 10; k++) { const u = k / 9; b.sphere(S(u * 3) * r * 0.12, h * (0.82 - u * 0.75), -r * (0.9 + u * 0.55) - S(u * PI) * r * 0.25, r * (0.3 - u * 0.2), k % 3 === 2 ? MG : MW); }
      b.sphere(0, h * 0.98, 0, r * 1.0, MW, { sy: 0.3 });   // domed crown
    },
    torsoExtra: (b, d) => {
      const s = d.s, W = d.W, D = d.D;
      b.cyl(0, 0.84 * s, 0, 0.2 * s, 0.2 * s, MW, { seg: 14 });   // thick neck
      for (const sd of [-1, 1]) {
        b.sphere(sd * 0.27 * s * W * 0.8, 0.96 * s, -0.03 * s, 0.2 * s, MW, { sy: 0.55 });   // traps
        b.sphere(sd * 0.2 * s, 0.7 * s, 0.15 * s * D, 0.21 * s, MW, { sy: 0.68 });          // pecs
        for (let k = 0; k < 3; k++) b.sphere(sd * 0.085 * s, (0.47 - k * 0.12) * s, 0.205 * s * D, 0.075 * s, MW, { sy: 0.8 });   // abs
        for (let k = 0; k < 2; k++) rbox(b, sd * 0.33 * s, (0.48 - k * 0.12) * s, 0.2 * s * D, 0.12 * s, 0.035 * s, 0.03 * s, 0, 0, sd * 0.5, MG);   // serratus
      }
      b.box(0, 0.2 * s, 0.23 * s * D, 0.025 * s, 0.4 * s, 0.02 * s, MG);
      // a broad back: shoulder blades, lats and the spine
      for (const sd of [-1, 1]) {
        rbox(b, sd * 0.2 * s, 0.76 * s, -0.215 * s * D, 0.26 * s, 0.22 * s, 0.06 * s, -0.12, 0, sd * 0.25, MW);   // shoulder blades
        rbox(b, sd * 0.3 * s, 0.44 * s, -0.215 * s * D, 0.16 * s, 0.34 * s, 0.05 * s, 0, 0, sd * 0.3, MW);       // lats
      }
      b.box(0, 0.25 * s, -0.25 * s * D, 0.03 * s, 0.6 * s, 0.03 * s, MG);
      // the metal chain over the collarbones
      for (let k = 0; k <= 10; k++) {
        const u = k / 10 - 0.5, x = u * 0.7 * s * W, y = (0.84 + u * u * 0.5) * s, z = (0.24 - u * u * 0.25) * s * D;
        rbox(b, x, y, z, 0.075 * s, 0.04 * s, 0.025 * s, k % 2 ? PI / 2 : 0, 0, u * 1.1, CHAIN, metal);
      }
      // white sash over the black hakama
      b.box(0, -0.02 * s, 0, 0.97 * s * W, 0.24 * s, 0.5 * s * D, SASH);
      b.sphere(0, 0.1 * s, 0.27 * s * D, 0.08 * s, SASH);
      for (const sd of [-1, 1]) rbox(b, sd * 0.07 * s, -0.08 * s, 0.29 * s * D, 0.08 * s, 0.24 * s, 0.03 * s, 0, 0, sd * 0.2, SASH);
    },
    arm: (ab, sd, d) => {
      const s = d.s, w = Math.sqrt(d.W);
      ab.sphere(0, -0.03 * s, 0, 0.18 * s * w, MW);                       // deltoid
      ab.sphere(0, -0.25 * s, 0.04 * s, 0.135 * s * w, MW, { sy: 1.2 });  // bicep
      ab.sphere(0, -0.47 * s, 0, 0.13 * s * w, MW, { sy: 1.1 });           // forearm
      ab.cyl(0, -0.56 * s, 0, 0.13 * s * w, 0.05 * s, MG, { seg: 12 });
    },
  });
  const d = rig.dims;
  // the Eight-Handled Sword Divergent Sila Divine General's wheel
  const wheelPv = new THREE.Group(); wheelPv.position.set(0, d.headH + 0.55, -0.05); rig.head.add(wheelPv);
  const wb = new BrickBuilder(1), ws = 0.36, GLD = 0xd9b04a;
  const gm = plastic(GLD, metal.matOpts);
  wb.add(cached('jjkMahoTorus', () => new THREE.TorusGeometry(1, 0.11, 8, 24)), gm, 0, 0, 0, 0, ws, ws, ws);
  wb.add(cached('jjkMahoTorus2', () => new THREE.TorusGeometry(1, 0.08, 6, 20)), gm, 0, 0, 0, 0, ws * 0.32, ws * 0.32, ws * 0.32);
  wb.sphere(0, 0, 0, ws * 0.18, GLD, metal);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2, c = Math.cos(a), sn = S(a);
    rod(wb, [c * 0.3 * ws, sn * 0.3 * ws, 0], [c * ws, sn * ws, 0], 0.06 * ws, gm, 6);
    rod(wb, [c * ws, sn * ws, 0], [c * 1.5 * ws, sn * 1.5 * ws, 0], 0.075 * ws, gm, 6);
    wb.sphere(c * 1.55 * ws, sn * 1.55 * ws, 0, 0.13 * ws, GLD, metal);
  }
  const wheel = wb.build({ name: 'dharma-wheel' }); wheelPv.add(wheel);
  const shine = fxg(wheelPv, 0, 0, 0.05); addGlow(shine, 0xffe08a, 1.6, 0, 0, 0, 0.9);
  // Sword of Extermination on its right arm
  const sword = fxg(rig.armR, 0, handY(rig), 0);
  const sb = new BrickBuilder(1);
  sb.box(0, -0.12, 0.02, 0.16, 0.16, 0.34, 0xb8b0a0, metal);                // hilt fused to the fist
  sb.box(0, -1.25, 0.04, 0.07, 1.15, 0.3, 0xe4eaf2, metal);
  sb.box(0, -1.25, 0.04, 0.085, 1.1, 0.06, 0x9aa4b4, metal);                // ridge
  spike(sb, 0, -1.25, 0.04, 0.16, 0.32, PI, 0, 0xe4eaf2, 0, metal);
  sword.add(sb.build({ name: 'sword' }));
  let turns = 0, prev = '';
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    if (prev === 'cheer' && !ch) turns = (turns + 1) % 8;
    prev = n;
    let a = turns * PI / 4;
    if (ch) a += (PI / 4) * easeBack(seg(f, 0.15, 0.42));
    if (win) a = t * 2.2;
    wheel.rotation.z = -a;
    const g = ch ? bump(f, 0.12, 0.6) : win ? 0.6 + S(t * 5) * 0.3 : 0;
    vis(shine, g > 0.02);
    if (g > 0.02) shine.scale.setScalar(g * 1.3);
    vis(sword, ch || win);
  };
  return rig;
}

export default [
  {
    id: 'gojo', name: 'Satoru Gojo', blurb: 'The strongest sorcerer', weight: 'medium', color: 0x9fd8ff,
    voice: { kind: 'human', pitch: 0.9 }, style: { cheer: 'point', win: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => { const z = lerp(0.85, -0.62, sm(seg(f, 0.45, 0.62))); return { lx: -1.4, rx: -1.4, lz: z, rz: -z, hx: -0.12, tx: f > 0.66 ? 0.12 : -0.05, by: bump(f, 0.62, 0.8) * 0.05 }; },
      win: (f, t) => ({ rx: -2.2, rz: 0.5, lx: -0.5, lz: 0.3, hx: -0.12, hz: 0.12, ty: S(t * LOOP) * 0.12, by: abs(S(t * LOOP)) * 0.04 }),
      taunt: (f, t, rig, a) => ({ lx: -3.25, lz: 0.75, rx: -3.25, rz: -0.75, tx: -0.2, hx: -0.1, hy: a.tauntSide * 0.6, hz: S(t * 6) * 0.08 }),
    },
    build: gojo,
  },
  {
    id: 'yuji', name: 'Yuji Itadori', blurb: 'Black Flash brawler', weight: 'medium', color: 0xf28a9c,
    voice: { kind: 'human', pitch: 1.05 }, style: { cheer: 'fist', trick: 'arms' },
    gestures: {
      cheer: (f, t) => {
        const wind = sm(seg(f, 0, 0.25)), hit = sm(seg(f, 0.27, 0.36));
        const shake = f > 0.36 && f < 0.85 ? S(t * 70) * 0.05 : 0;
        return { rx: lerp(lerp(-1, 0.6, wind), -1.85, hit) + shake, rz: lerp(-0.1, 0.12, hit), ty: lerp(-0.5 * wind, 0.4, hit), tx: hit * 0.18, lx: -1.25, lz: -0.45, hx: -0.1, hy: -0.3 * hit, tz: shake, by: hit * 0.03 };
      },
      win: (f, t) => ({ rx: up + S(t * LOOP * 2) * 0.4, rz: -0.15, lx: -0.9, lz: 0.4, hx: -0.25, by: abs(S(t * LOOP * 2)) * 0.08, tz: 0.08 }),
    },
    build: yuji,
  },
  {
    id: 'megumi', name: 'Megumi Fushiguro', blurb: 'Ten Shadows summoner', weight: 'light', color: 0x6a4ad0,
    voice: { kind: 'human', pitch: 0.95 }, style: { cheer: 'point', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.3, lz: -0.62, rx: -1.3, rz: 0.62, hx: f < 0.42 ? 0.15 : -0.05, hy: f > 0.42 ? 0.85 : 0, ty: f > 0.42 ? 0.2 : 0 }),
      win: (f, t) => ({ lx: -1.3, lz: -0.62, rx: -1.3, rz: 0.62, hx: -0.1, hy: 0.5 + S(t * LOOP) * 0.15, by: abs(S(t * LOOP)) * 0.03 }),
    },
    build: megumi,
  },
  {
    id: 'panda', name: 'Panda', blurb: 'Gorilla Core drummer', weight: 'heavy', color: 0xf4f4f4,
    voice: { kind: 'beast', pitch: 1.1 }, style: { cheer: 'both', trick: 'arms' },
    gestures: {
      cheer: (f, t) => drum(t),
      win: (f, t) => (t < 0.8 ? drum(t) : { lx: up, rx: up, lz: 0.4, rz: -0.4, hx: -0.4, by: S(((t - 0.8) / 0.8) * PI) * 0.12 }),
    },
    build: panda,
  },
  {
    id: 'todo', name: 'Aoi Todo', blurb: 'Boogie Woogie best friend', weight: 'heavy', color: 0x3aa0ff,
    voice: { kind: 'deep', pitch: 1.15 }, style: { cheer: 'clap', win: 'flex', trick: 'arms' },
    gestures: {
      cheer: (f, t) => { const k = abs(S(t * 12)); return { lx: -1.45, rx: -1.45, lz: -0.85 + k * 0.75, rz: 0.85 - k * 0.75, hx: -0.15 + k * 0.1, by: k * 0.04 }; },
    },
    build: todo,
  },
  {
    id: 'nanami', name: 'Kento Nanami', blurb: 'Ratio 7:3, no overtime', weight: 'medium', color: 0xe0b040,
    voice: { kind: 'human', pitch: 0.8 }, style: { cheer: 'salute', trick: 'superman' },
    gestures: {
      cheer: (f, t) => {
        const raise = sm(seg(f, 0, 0.28)), chop = sm(seg(f, 0.3, 0.4));
        return { rx: lerp(lerp(-1, -2.75, raise), -0.95, chop), rz: lerp(-0.1, 0.25, chop), tx: chop * 0.18 - raise * (1 - chop) * 0.1, ty: lerp(-0.2 * raise, 0.25, chop), hx: -0.05, hy: -0.15 };
      },
      taunt: (f, t) => ({ rx: -2.45, rz: 0.8, hx: 0.12 + S(t * 8) * 0.04, ty: -0.12, hy: 0.15 }),
      win: (f, t) => ({ rx: -2.85 + S(t * LOOP) * 0.1, rz: -0.25, lx: -1.55, lz: -0.55 + S(t * LOOP * 2) * 0.1, hz: -0.1, hx: -0.1 }),
    },
    build: nanami,
  },
  {
    id: 'toji', name: 'Toji Fushiguro', blurb: 'The Sorcerer Killer', weight: 'medium', color: 0x5a5a6a,
    voice: { kind: 'human', pitch: 0.78 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => {
        const a = sm(seg(f, 0, 0.2)), b = sm(seg(f, 0.32, 0.48)), c = sm(seg(f, 0.56, 0.66));
        return { rx: lerp(lerp(lerp(-1, -2.2, a), -1.6, b), -1.55, c), rz: lerp(lerp(lerp(0, 1.0, a), -1.1, b), 0.15, c), ty: lerp(lerp(0.2 * a, -0.3, b), 0.4, c), tx: c * 0.2, hy: lerp(0.5 * a, 0, b), hx: -0.05 };
      },
      win: (f, t) => ({ lx: -1.25, lz: -0.95, rx: -1.15, rz: 0.95, hz: 0.15, hx: -0.05 + abs(S(t * LOOP)) * 0.1, tx: -0.1 }),
    },
    build: toji,
  },
  {
    id: 'geto', name: 'Suguru Geto', blurb: 'Cursed Spirit Manipulator', weight: 'medium', color: 0x7a3aaa,
    voice: { kind: 'human', pitch: 0.85 }, style: { cheer: 'wave', trick: 'arms' },
    gestures: {
      cheer: (f, t) => { const push = sm(seg(f, 0.6, 0.75)); return { rx: lerp(-1.35, -1.6, push), rz: 0.05, lx: -1.25, lz: -0.55, tx: push * 0.15, hx: 0.05, hy: -0.2, ty: -0.1 }; },
      win: (f, t) => ({ lx: -0.9, lz: 1.0, rx: -0.9, rz: -1.0, hx: -0.25, by: abs(S(t * LOOP)) * 0.03 }),
    },
    build: geto,
  },
  {
    id: 'sukuna', name: 'Ryomen Sukuna', blurb: 'King of Curses', weight: 'heavy', color: 0xc0102a,
    voice: { kind: 'deep', pitch: 0.75 }, style: { cheer: 'roar', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.3, lz: -0.62, rx: -1.3, rz: 0.62, hx: -0.12, tz: S(t * 30) * 0.02 }),
      win: (f, t) => ({ hx: -0.5, lx: -1.0, lz: 1.15, rx: -1.0, rz: -1.15, tx: -0.15, by: abs(S(t * LOOP * 3)) * 0.04, tz: S(t * LOOP * 3) * 0.04 }),
    },
    build: sukuna,
  },
  {
    id: 'mahito', name: 'Mahito', blurb: 'Idle Transfiguration', weight: 'light', color: 0x7a8ab0,
    voice: { kind: 'human', pitch: 1.15 }, style: { cheer: 'wave', trick: 'twist' },
    gestures: {
      cheer: (f, t) => { const sw = sm(seg(f, 0.45, 0.62)); return { rx: -1.9, rz: lerp(-0.4, 0.3, sw), ty: lerp(-0.35, 0.45, sw), lx: -1.0 + S(t * 10) * 0.3, lz: 0.5, hx: -0.1, hz: S(t * 6) * 0.1 }; },
      win: (f, t) => ({ lx: -1.25, lz: -0.6, rx: -1.25, rz: 0.6, hx: -0.2, tz: S(t * LOOP) * 0.06 }),
    },
    build: mahito,
  },
  {
    id: 'jogo', name: 'Jogo', blurb: 'Volcano-headed hothead', weight: 'light', color: 0xff6a10,
    voice: { kind: 'squeak', pitch: 0.8 }, style: { cheer: 'both', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: up + S(t * 22) * 0.25, lz: 0.45, rx: up + S(t * 22 + 1.6) * 0.25, rz: -0.45, hx: -0.15, hy: S(t * 18) * 0.25, tz: S(t * 25) * 0.05, by: abs(S(t * 11)) * 0.06 }),
      win: (f, t) => ({ lx: -2.95, lz: 0.2, rx: -2.95, rz: -0.2, hx: -0.35, by: abs(S(t * LOOP)) * 0.03 }),
    },
    build: jogo,
  },
  {
    id: 'transfigured', name: 'Transfigured Human', blurb: 'Mahito\'s wobbly victim', weight: 'medium', color: 0x9a7ab0,
    voice: { kind: 'beast', pitch: 1.4 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: up + S(t * 17) * 0.6, lz: 0.6 + S(t * 13) * 0.3, rx: up + S(t * 17 + 2.2) * 0.6, rz: -0.6, hy: S(t * 20) * 0.45, hz: S(t * 11) * 0.2, tz: S(t * 9) * 0.12, by: abs(S(t * 17)) * 0.08 }),
      win: (f, t) => ({ tz: S(t * LOOP * 2) * 0.25, ty: S(t * LOOP) * 0.3, lx: -2.0 + S(t * LOOP * 4) * 0.5, lz: 1.0, rx: -2.0 - S(t * LOOP * 4) * 0.5, rz: -1.0, hz: S(t * LOOP * 2) * 0.3 }),
    },
    build: transfigured,
  },
  {
    id: 'mahoraga', name: 'Mahoraga', blurb: 'Eight-Handled Wheel', weight: 'heavy', color: 0xdcbc81,
    voice: { kind: 'deep', pitch: 0.55 }, style: { cheer: 'flex', win: 'flex', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ rx: -2.6, rz: -0.3, lx: -1.3, lz: 0.1, hx: -0.25, by: bump(f, 0.15, 0.45) * 0.05 }),
      win: (f, t) => ({ lx: -0.6, rx: -0.6, lz: 1.5, rz: -1.5, tx: -0.1, hx: -0.2, by: abs(S(t * LOOP * 2)) * 0.04 }),
    },
    build: mahoraga,
  },
];
