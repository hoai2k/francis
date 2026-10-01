// Jujutsu Kaisen drivers (Use Characters). Faces come from the Cursed Brick
// Shibuya face atlas so the drivers match the statues on the track; every driver
// has a signature cursed technique played on cheer / win with emissive effects
// (helpers in ./jjk-kit.js).
import {
  THREE, BrickBuilder, C, plastic, rbox, rod, mat4, faceMat, neon, spike, atlasHead, taperGeo,
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

// ---- Nobara Kugisaki ----------------------------------------------------------------------
function nobara() {
  const HAIR = 0xa8562a;
  const rig = jfig({
    name: 'nobara', face: 'nobara', torso: NAVY, legs: NAVY, arms: NAVY, skin: SKIN,
    hair: (b, r, h) => {
      cap(b, r, h, HAIR, 0.8); back(b, r, h, HAIR, 0.1, 0.9);
      for (const sd of [-1, 1]) b.box(sd * r * 0.98, h * 0.12, -r * 0.15, r * 0.26, h * 0.72, r * 0.95, HAIR);
      rbox(b, r * 0.15, h * 0.86, r * 0.7, r * 1.3, h * 0.13, r * 0.5, 0.3, 0, -0.25, HAIR);
    },
    torsoExtra: uniform(GOLD),
  });
  const hy = handY(rig);
  const ham = fxg(rig.armR, 0, hy, 0);
  const hb = new BrickBuilder(1);
  hb.box(0, -0.5, 0, 0.06, 0.62, 0.06, C.rbrown);
  hb.box(0, -0.6, 0.04, 0.14, 0.14, 0.38, C.dkgray);
  rbox(hb, 0, -0.5, -0.2, 0.05, 0.05, 0.16, -0.5, 0, 0, C.dkgray);
  ham.add(hb.build({ name: 'hammer' }));
  ham.scale.setScalar(1.4);
  // Hairpin: glowing nails driven forward
  const nails = fxg(rig.root, 0.35, 1.1, 0.85);
  const nb = new BrickBuilder(1);
  for (const k of [-1, 0, 1]) {
    nb.boxM(mat4(k * 0.13, abs(k) * -0.05, 0, 0, 0, 0, 0.035, 0.035, 0.32), 0, { mat: neon(0x6ad8ff, 2.4) });
    nb.boxM(mat4(k * 0.13, abs(k) * -0.05, -0.16, 0, 0, 0, 0.08, 0.08, 0.03), 0, { mat: neon(0x6ad8ff, 2.4) });
  }
  nails.add(nb.build({ name: 'nails' }));
  addGlow(nails, 0x4ac8ff, 1.2, 0, 0, -0.1, 0.8);
  nails.scale.setScalar(1.3);
  const burst = fxg(rig.root, 0.35, 1.1, 0.8); addGlow(burst, 0x8ae0ff, 1.3);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    vis(ham, ch || win);
    const p = ch ? (f % 0.5) / 0.5 : -1;
    const fly = (ch && p > 0.6) || win;
    vis(nails, fly);
    if (fly) {
      if (win) { nails.position.set(0.35, 1.55 + S(t * 3) * 0.05, 0.55); nails.rotation.set(-PI / 2, 0, t * 4); nails.scale.setScalar(1.3); }
      else { const k = seg(p, 0.6, 1); nails.position.set(0.35, 1.1 + k * 0.1, 0.85 + k * 1.5); nails.rotation.set(0, 0, k * 3); nails.scale.setScalar(1.3 - k * 0.4); }
    }
    const bon = ch && p > 0.56 && p < 0.8;
    vis(burst, bon);
    if (bon) burst.scale.setScalar(bump(p, 0.56, 0.8) * 1.2);
  };
  return rig;
}

// ---- Maki Zenin ---------------------------------------------------------------------------
function maki() {
  const HAIR = 0x24453a;
  const rig = jfig({
    name: 'maki', face: 'maki', torso: NAVY, legs: NAVY, arms: NAVY, skin: SKIN,
    hair: (b, r, h) => {
      cap(b, r, h, HAIR, 0.82); back(b, r, h, HAIR, 0.45, 0.9);
      b.sphere(0, h * 0.85, -r * 1.0, r * 0.3, HAIR);
      rbox(b, 0, h * 0.5, -r * 1.25, r * 0.42, h * 0.8, r * 0.4, 0.45, 0, 0, HAIR);
      fringe(b, r, h, HAIR, 3, 0.22, 2.1, { spread: 0.55 });
    },
    torsoExtra: (b, d) => { uniform(GOLD)(b, d); const s = d.s; b.box(0, 0.08 * s, 0, 0.9 * s, 0.1 * s, 0.48 * s, 0x3a2a1a); },
  });
  // a cursed-tool polearm she spins overhead
  const pole = fxg(rig.armR, 0, handY(rig), 0);
  const spin = new THREE.Group(); pole.add(spin);
  const pb = new BrickBuilder(1);
  pb.boxM(mat4(0, 0, 0, 0, 0, 0, 2.1, 0.055, 0.055), C.rbrown);
  pb.boxM(mat4(1.2, 0, 0, 0, 0, 0, 0.36, 0.04, 0.13), 0xdfe6ee);
  pb.boxM(mat4(1.03, 0, 0, 0, 0, 0, 0.05, 0.12, 0.16), GOLD);
  pb.boxM(mat4(-1.07, 0, 0, 0, 0, 0, 0.06, 0.08, 0.08), GOLD);
  spin.add(pb.build({ name: 'polearm' }));
  const blur = ringMesh(pole, 0xcfe8ff, 1.15, 0.012, 1.4); blur.rotation.x = PI / 2;
  rig.fx = (n, f, t) => {
    const on = n === 'cheer' || n === 'win';
    vis(pole, on);
    if (on) spin.rotation.y = t * 16;
  };
  return rig;
}

// ---- Panda --------------------------------------------------------------------------------
function panda() {
  const BK = 0x1b1b1b, WH = 0xf4f4f4;
  const rig = jfig({
    name: 'panda', wide: 1.45, torso: WH, legs: BK, hips: BK, arms: BK, hands: BK, neck: WH, skin: WH, headH: 0.75, extraHeight: 0,
    head: (b) => {
      b.sphere(0, 0.45, 0, 0.55, WH, { sy: 0.9 });
      for (const sd of [-1, 1]) {
        b.sphere(sd * 0.33, 0.82, -0.05, 0.17, BK);
        b.sphere(sd * 0.2, 0.52, 0.45, 0.14, BK, { sy: 1.3 });
        b.sphere(sd * 0.21, 0.55, 0.57, 0.045, WH);
      }
      b.sphere(0, 0.3, 0.42, 0.22, WH, { sy: 0.75 });
      b.sphere(0, 0.36, 0.62, 0.07, BK);
      b.box(0, 0.2, 0.6, 0.12, 0.03, 0.04, BK);
    },
    torsoExtra: (b) => { b.box(0, 0.9, 0, 1.42, 0.32, 0.64, BK); b.sphere(0, 0.62, 0.08, 0.45, WH); },
  });
  // Drumming Beat: shockwave rings off his chest
  const waves = fxg(rig.root, 0, 0.95, 0.55);
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

// ---- Aoi Todo ------------------------------------------------------------------------------
function todo() {
  const SK = 0xd9a878, JK = 0x2a2a2a;
  const rig = jfig({
    name: 'todo', face: 'todo', s: 1.4, wide: 1.3, skin: SK, torso: JK, arms: JK, hands: SK, legs: 0x3a3a3a,
    hair: (b, r, h) => { cap(b, r, h, INK, 0.84); back(b, r, h, INK, 0.5, 0.9); b.cyl(0, h, -r * 0.3, r * 0.28, 0.16, INK, { seg: 10 }); b.sphere(0, h + 0.25, -r * 0.35, r * 0.36, INK); },
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, 0.3 * s, 0.225 * s, 0.34 * s, 0.62 * s, 0.05 * s, SK);
      b.box(0, 0.5 * s, 0.25 * s, 0.02 * s, 0.32 * s, 0.01 * s, 0xb98858);
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
  for (const sd of [-1, 1]) tb.box(sd * r * 0.42, h * 0.08, r * 0.92, 0.05, h * 0.46, 0.03, 0, { mat: neon(0x6ac8ff, 1.8) });
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
function nanami() {
  const SUIT = 0xd8c8a0, BLOND = 0xf0d890, SHIRT = 0x2a3a6a, TIE = 0xe0b040;
  const rig = jfig({
    name: 'nanami', face: 'nanami', s: 1.33, torso: SUIT, arms: SUIT, legs: 0xc8b890, skin: SKIN,
    hair: (b, r, h) => { cap(b, r, h, BLOND, 0.84); back(b, r, h, BLOND, 0.45, 0.9); b.box(r * 0.25, h * 0.98, -r * 0.1, r * 0.08, 0.05, r * 1.6, 0xc9a860); spike(b, -r * 0.3, h * 0.93, r * 0.62, r * 0.32, 0.22, 2.25, 0.25, BLOND); spike(b, -r * 0.6, h * 0.9, r * 0.5, r * 0.26, 0.2, 2.2, 0.55, BLOND); },
    torsoExtra: (b, d) => {
      const s = d.s;
      b.cyl(0, 0.88 * s, 0, 0.2 * s, 0.2 * s, SHIRT, { seg: 14 });
      b.box(0, 0.5 * s, 0.215 * s, 0.3 * s, 0.42 * s, 0.04 * s, SHIRT);
      b.box(0, 0.38 * s, 0.235 * s, 0.11 * s, 0.52 * s, 0.04 * s, TIE);
      b.box(0, 0.84 * s, 0.235 * s, 0.14 * s, 0.08 * s, 0.05 * s, TIE);
      for (let k = 0; k < 3; k++) b.box(((k % 2) - 0.5) * 0.04 * s, (0.48 + k * 0.12) * s, 0.258 * s, 0.03 * s, 0.03 * s, 0.01 * s, C.black);
    },
  });
  // a cloth-wrapped cleaver
  const blade = fxg(rig.armR, 0, handY(rig), 0);
  const bb = new BrickBuilder(1);
  bb.box(0, -0.08, 0.36, 0.07, 0.17, 0.74, 0xece6d6);
  for (let k = 0; k < 3; k++) bb.box(0, -0.09, 0.12 + k * 0.22, 0.09, 0.19, 0.05, 0x3a3a3a);
  bb.box(0, -0.06, -0.1, 0.06, 0.12, 0.22, 0x3a2a1a);
  blade.add(bb.build({ name: 'cleaver' }));
  blade.scale.setScalar(1.35);
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
    vis(blade, ch || win);
    const on = (ch && f > 0.28 && f < 0.95) || win;
    vis(ratio, on);
    if (on) {
      ratio.scale.x = ch ? sm(seg(f, 0.28, 0.42)) : 1;
      mark.scale.setScalar(0.5 + abs(S(t * 9)) * (ch ? bump(f, 0.36, 0.7) * 1.2 + 0.2 : 0.4));
    }
  };
  return rig;
}

// ---- Yuta Okkotsu ---------------------------------------------------------------------------
function yuta() {
  const rig = jfig({
    name: 'yuta', face: 'yuta', torso: WHITE, legs: WHITE, arms: WHITE, skin: SKIN,
    hair: (b, r, h) => { back(b, r, h, INK, 0.4, 0.9); cap(b, r, h, INK, 0.82); spikes(b, r, h, INK, 9, 0.22, 1.1, { seed: 21, rnd: 0.5 }); fringe(b, r, h, INK, 4, 0.3, 2.25, { spread: 0.65 }); },
    torsoExtra: (b, d) => {
      uniform(C.ltgray, WHITE)(b, d);
      const s = d.s;
      rbox(b, -0.1 * s, 0.75 * s, -0.27 * s, 0.1 * s, 1.15 * s, 0.1 * s, 0, 0, -0.5, C.black);
      rbox(b, 0.02 * s, 0.55 * s, 0.22 * s, 0.05 * s, 0.95 * s, 0.03 * s, 0, 0, 0.62, C.black);
    },
  });
  const kat = fxg(rig.armR, 0, handY(rig), 0);
  const kb = new BrickBuilder(1);
  kb.box(0, -0.045, 0.74, 0.035, 0.09, 1.05, 0xdfe6ee, { matOpts: { metal: 0.7, rough: 0.2 } });
  kb.box(0, -0.09, 0.2, 0.16, 0.18, 0.04, GOLD);
  kb.box(0, -0.04, 0.05, 0.06, 0.08, 0.3, C.black);
  kat.add(kb.build({ name: 'katana' }));
  // Rika's giant hand rising behind the kart
  const rika = fxg(rig.root, -1.0, -1, -1.4);
  const RW = 0xebe6dc, RD = 0x2a2430;
  const hb = new BrickBuilder(1);
  hb.add(taperGeo(0.42, 0.52, 1.3, 0.42), plastic(RW), 0, -1.3, 0);
  hb.box(0, 0, 0, 0.64, 0.52, 0.38, RW);
  for (let k = 0; k < 4; k++) {
    const x = -0.23 + k * 0.155, l = k === 1 || k === 2 ? 0.44 : 0.36;
    hb.box(x, 0.5, 0.02, 0.13, l, 0.15, RW);
    spike(hb, x, 0.5 + l, 0.04, 0.06, 0.2, 0.35, 0, RD);
  }
  rbox(hb, 0.38, 0.28, 0.06, 0.13, 0.36, 0.15, 0, 0, -0.7, RW);
  hb.cyl(-0.08, -0.3, 0.2, 0.09, 0.06, GOLD, { seg: 8 });
  rika.add(hb.build({ name: 'rika-hand' }));
  addGlow(rika, 0xd040ff, 2.2, 0, 0.2, -0.2, 0.5);
  rika.scale.setScalar(1.6);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    vis(kat, ch || win);
    const rise = ch ? sm(seg(f, 0.05, 0.35)) * (1 - sm(seg(f, 0.82, 1))) : win ? 1 : 0;
    vis(rika, rise > 0.01);
    if (rise > 0.01) { rika.position.y = lerp(-2.6, 0.75, rise); rika.rotation.set(0.15, 0.4, -0.1 + S(t * 5) * 0.18); }
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
function sukuna() {
  const KIM = 0xf2eee4, SSK = 0xf3d6bf, TAT = 0x1b1b1b;
  const rig = jfig({
    name: 'sukuna', face: 'sukuna', s: 1.38, wide: 1.15, torso: KIM, legs: KIM, hips: KIM, arms: SSK, hands: SSK, skin: SSK,
    hair: (b, r, h) => { back(b, r, h, PINK, 0.5, 0.9); cap(b, r, h, PINK, 0.82); spikes(b, r, h, PINK, 10, 0.3, 1.15, { seed: 17, back: 0.3, ring: 0.8 }); },
    arm: (ab, sd, d) => { const s = d.s; for (let k = 0; k < 2; k++) ab.box(0, (-0.3 - k * 0.12) * s, 0, 0.29 * s, 0.035 * s, 0.29 * s, TAT); },
    torsoExtra: (b, d) => {
      const s = d.s;
      b.cyl(0, 0.82 * s, -0.02 * s, 0.3 * s, 0.2 * s, TAT, { seg: 14 });
      b.box(0, 0.08 * s, 0, 1.08 * s, 0.18 * s, 0.5 * s, TAT);
      for (const sd of [-1, 1]) rbox(b, sd * 0.1 * s, 0.6 * s, 0.215 * s, 0.07 * s, 0.6 * s, 0.03 * s, 0, 0, sd * 0.35, TAT);
    },
  });
  const d = rig.dims;
  // the second pair of arms
  const low = [];
  for (const sd of [1, -1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 0.42 * d.s * 1.15, 0.7 * d.s, 0.04);
    const ab = new BrickBuilder(1);
    ab.sphere(0, 0, 0, 0.11 * d.s, SSK);
    ab.add(taperGeo(0.2, 0.24, 0.45, 0.24), plastic(SSK), 0, -0.47 * d.s, 0, 0, d.s, d.s, d.s);
    ab.box(0, -0.3 * d.s, 0, 0.27 * d.s, 0.035 * d.s, 0.27 * d.s, TAT);
    ab.cyl(0, -0.62 * d.s, 0, 0.09 * d.s, 0.16 * d.s, SSK, { seg: 10 });
    pv.add(ab.build({ name: 'sukuna-arm' }));
    rig.torso.add(pv); low.push(pv);
  }
  // Dismantle: crossing red slashes around the kart
  const slashes = [[0.95, 1.55, 0.7, 0.3], [-1.05, 0.95, 0.85, -0.5], [0.15, 2.35, -0.3, 1.2]].map(([x, y, z, ry], k) => {
    const g = fxg(rig.root, x, y, z);
    const b = new BrickBuilder(1);
    rbox(b, 0, 0, 0, 1.5, 0.07, 0.05, 0, 0, 0.62, 0, { mat: neon(0xff1020, 3) });
    rbox(b, 0, 0.05, 0, 1.3, 0.06, 0.05, 0, 0, -0.5 - k * 0.2, 0, { mat: neon(0xff1020, 3) });
    rbox(b, 0.1, -0.12, 0, 0.9, 0.04, 0.04, 0, 0, 0.7, 0, { mat: neon(0xff1020, 3) });
    addGlow(g, 0xff2020, 1.2, 0, 0, 0, 0.6);
    g.add(b.build({ name: 'slash' }));
    g.rotation.y = ry;
    return g;
  });
  const aura = fxg(rig.root, 0, 1.35, -0.3); addGlow(aura, 0xff1a1a, 3.0, 0, 0, 0, 0.5);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    const lf = win ? (t % 1.6) / 1.6 : f;
    for (let k = 0; k < 3; k++) {
      const a = 0.18 + k * 0.17, on = (ch || win) && lf > a && lf < a + 0.32;
      vis(slashes[k], on);
      if (on) slashes[k].scale.set(sm(seg(lf, a, a + 0.06)) * (1 - seg(lf, a + 0.24, a + 0.32)), 1, 1);
    }
    vis(aura, ch || win);
    if (ch || win) aura.scale.setScalar(1 + S(t * 13) * 0.08);
    for (let k = 0; k < 2; k++) {
      const sd = k ? -1 : 1, pv = low[k];
      if (ch) pv.rotation.set(-0.5 + S(t * 30 + k) * 0.05, 0, sd * 1.35);
      else if (win) pv.rotation.set(-1.4 + S(t * LOOP * 3 + k * 3) * 0.3, 0, sd * 1.0);
      else pv.rotation.set(-0.55 + S(t * 2 + k) * 0.06, 0, sd * 0.5);
    }
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
function jogo() {
  const JY = 0xe8c040, JSK = 0xc9c6bd;
  const rig = jfig({
    name: 'jogo', s: 1.2, headR: 0.36, headH: 0.55, extraHeight: 0.45, torso: JY, arms: JY, hands: JSK, legs: 0x1b1b1b, hips: 0x1b1b1b, neck: JSK, skin: JSK,
    head: (b, d) => {
      const r = d.headR, h = d.headH;
      atlasHead(b, 'jogo', 0, 0, 0, r, h);
      b.add(frustum(0.68, 1), plastic(0xbcb8ae), 0, h, 0, 0, r, 0.3, r);
      b.add(frustum(0.74, 1), plastic(0x7a4a2a), 0, h + 0.3, 0, 0, r * 0.68, 0.12, r * 0.68);
      b.cyl(0, h + 0.4, 0, r * 0.45, 0.03, 0, { mat: neon(0xff5a10, 2.4), seg: 12 });
      for (const sd of [-1, 1]) b.box(sd * r * 1.02, h * 0.42, 0, 0.12, 0.16, 0.16, C.tan);
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      for (let k = 0; k < 9; k++) { const a = (k / 9) * PI * 2; b.sphere(S(a) * 0.3 * s, 0.9 * s, Math.cos(a) * 0.22 * s, 0.11 * s, WHITE); }
      for (const [x, y] of [[-0.22, 0.3], [0.18, 0.5], [-0.05, 0.68], [0.25, 0.18], [-0.28, 0.6]]) b.box(x * s, y * s, 0.22 * s, 0.09 * s, 0.09 * s, 0.03 * s, 0x2a2a2a);
    },
  });
  const d = rig.dims, top = d.headH + 0.42;
  // eruption from the crater
  const er = fxg(rig.head, 0, top, 0);
  const jet = new THREE.Group(); er.add(jet);
  const jb = new BrickBuilder(1); jb.cone(0, 0, 0, 0.2, 0.9, 0, { mat: neon(0xff6a10, 2.6) }); jb.cone(0, 0, 0, 0.12, 1.2, 0, { mat: neon(0xffd040, 2.6) });
  jet.add(jb.build({ name: 'jet' }));
  addGlow(er, 0xff5a10, 2.0, 0, 0.45, 0, 0.85);
  const blobs = [];
  for (let k = 0; k < 6; k++) blobs.push(ball(er, 0xff8a20, 0.1, 0, 0, 0, 2.4));
  // Maximum Meteor
  const met = fxg(rig.root, 0, 2.75, 0.1);
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
    if (win) { met.rotation.set(t * 0.7, t * 1.3, 0); met.position.y = 2.75 + S(t * 3) * 0.06; }
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
function mahoraga() {
  const MW = 0xece8e0, MG = 0xc8c4bc;
  const metal = { matOpts: { metal: 0.6, rough: 0.3 } };
  const rig = jfig({
    name: 'mahoraga', s: 1.4, wide: 1.25, headR: 0.3, headH: 0.48, extraHeight: 0.72, torso: MW, arms: MW, hands: MW, legs: 0xdcd8d0, hips: 0xdcd8d0, skin: MW, neck: MW,
    head: (b, d) => {
      const r = d.headR, h = d.headH;
      b.cyl(0, 0, 0, r, h, MW, { seg: 16 });
      b.box(0, h * 0.5, r * 0.55, r * 1.55, h * 0.16, r * 0.6, 0x2a2a2a);
      b.box(0, h * 0.2, r * 0.75, r * 0.6, 0.03, r * 0.5, 0x6a6a6a);
      for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) rbox(b, sd * r * 0.95, h * (0.8 - k * 0.32), -r * 0.15, 0.07, h * 0.3, r * 1.5, 0.25, 0, sd * (0.55 + k * 0.4), 0xf6f2ea);
      b.box(0, h, -r * 0.1, r * 0.4, 0.07, r * 1.3, MG);
      b.box(0, h, 0, 0.07, 0.3, 0.07, GOLD, metal);
    },
    torsoExtra: (b, d) => { const s = d.s; for (let k = 0; k < 3; k++) b.box(0, (0.4 + k * 0.14) * s, 0.21 * s, 0.5 * s * 1.25, 0.03 * s, 0.03 * s, MG); b.box(0, 0.8 * s, 0.2 * s, 0.03 * s, 0.25 * s, 0.03 * s, MG); },
  });
  const d = rig.dims;
  // the Eight-Handled Sword Divergent Sila Divine General's wheel
  const wheelPv = new THREE.Group(); wheelPv.position.set(0, d.headH + 0.4, 0); rig.head.add(wheelPv);
  const wb = new BrickBuilder(1), ws = 0.3;
  wb.add(new THREE.TorusGeometry(1, 0.1, 6, 20), plastic(GOLD, metal.matOpts), 0, 0, 0, 0, ws, ws, ws);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2;
    rbox(wb, Math.cos(a) * 0.55 * ws, S(a) * 0.55 * ws, 0, 1.1 * ws, 0.09 * ws, 0.09 * ws, 0, 0, a, GOLD, metal);
    rbox(wb, Math.cos(a) * 1.25 * ws, S(a) * 1.25 * ws, 0, 0.5 * ws, 0.16 * ws, 0.16 * ws, 0, 0, a, GOLD, metal);
  }
  const wheel = wb.build({ name: 'dharma-wheel' }); wheelPv.add(wheel);
  const shine = fxg(wheelPv, 0, 0, 0.05); addGlow(shine, 0xffe08a, 1.4, 0, 0, 0, 0.9);
  // Sword of Extermination on its right arm
  const sword = fxg(rig.armR, 0, handY(rig), 0);
  const sb = new BrickBuilder(1);
  sb.box(0, -1.15, 0.05, 0.07, 1.15, 0.26, 0xdfe6ee, metal);
  spike(sb, 0, -1.15, 0.05, 0.13, 0.25, PI, 0, 0xdfe6ee, 0, metal);
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
    id: 'nobara', name: 'Nobara Kugisaki', blurb: 'Hammer, nails, Resonance', weight: 'light', color: 0xe07a3a,
    voice: { kind: 'human', pitch: 1.4 }, style: { cheer: 'fist', trick: 'arms' },
    gestures: {
      cheer: (f, t) => {
        const p = (f % 0.5) / 0.5, raise = sm(seg(p, 0, 0.45)), hit = sm(seg(p, 0.48, 0.6));
        return { rx: lerp(lerp(-1.0, -2.9, raise), -0.85, hit), rz: -0.12, lx: -1.4, lz: -0.2, tx: hit * 0.15, hx: -0.1, ty: -0.15, by: hit * 0.03 };
      },
      win: (f, t) => ({ rx: up + S(t * LOOP * 2) * 0.3, rz: -0.2, lx: 0.15, lz: 0.55, hz: 0.15, hx: -0.15, by: abs(S(t * LOOP * 2)) * 0.05 }),
    },
    build: nobara,
  },
  {
    id: 'maki', name: 'Maki Zenin', blurb: 'Cursed-tool polearm ace', weight: 'light', color: 0x3a8a5a,
    voice: { kind: 'human', pitch: 1.3 }, style: { cheer: 'fist', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ rx: -3.0, rz: -0.15, lx: -0.7, lz: 0.9, hx: -0.3, by: abs(S(t * 12)) * 0.05, ty: S(t * 6) * 0.15 }),
      win: (f, t) => ({ rx: -3.0, rz: -0.15, lx: up + S(t * LOOP * 2) * 0.3, lz: 0.3, hx: -0.3, by: abs(S(t * LOOP * 2)) * 0.05 }),
    },
    build: maki,
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
    id: 'yuta', name: 'Yuta Okkotsu', blurb: 'Rika, lend me your power', weight: 'medium', color: 0xd040ff,
    voice: { kind: 'human', pitch: 1.05 }, style: { cheer: 'fist', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ rx: -2.85 + S(t * 10) * 0.05, rz: -0.25, lx: -1.2, lz: 0.3, hx: -0.25, hy: f > 0.35 ? -0.5 : 0 }),
      win: (f, t) => ({ rx: -2.6 + S(t * LOOP * 2) * 0.25, rz: -0.3, lx: -0.5, lz: 0.5, hx: -0.15, by: abs(S(t * LOOP * 2)) * 0.04 }),
    },
    build: yuta,
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
