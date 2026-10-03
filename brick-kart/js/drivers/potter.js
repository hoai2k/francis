// Harry Potter drivers (Use Characters): brick witches and wizards in house robes, each
// with a wand (or umbrella, sword, sock…) and a signature spell on cheer / win — spell
// bolts, spark bursts, Patronus animals, Fawkes, the Dark Mark, fireworks (./potter-kit.js).
import {
  THREE, BrickBuilder, C, plastic, rbox, rod, taperGeo, S, PI, abs, UP, LOOP, seg, sm, lerp, bump, vis,
  H, SKIN, fxMat, addGlow, fxg, face, decal, schoolFront, jumperFront, fig, handY,
  cap, back, long, tufts, fringe, bush, wizardHat, scarf, wand, bolt, burst, beast, phoenix, darkMark,
} from './potter-kit.js';

const PATRONUS = 0xbfe6ff;

// ---- shared poses ----------------------------------------------------------------------------
// wand flick then point: the bolt flies while the arm is level (f 0.25 - 0.8)
const cast = (f, t, o = {}) => {
  const k = sm(seg(f, 0.08, 0.22));
  return { rx: lerp(-2.5, o.aim ?? -1.3, k) + S(t * 30) * 0.03 * k, rz: 0.08, ty: -0.18 * k, tx: -0.05, hx: -0.1, hy: -0.1, lx: -0.9, lz: 0.25, by: bump(f, 0.18, 0.32) * 0.04 };
};
// wand raised to the sky, other arm out
const raise = (f, t) => ({ rx: -2.95 + S(t * LOOP * 2) * 0.08, rz: -0.15, lx: -0.7, lz: 0.6, hx: -0.35, tx: -0.08, by: abs(S(t * LOOP)) * 0.04 });

// ---- shared spell fx -----------------------------------------------------------------------------
// o: { color, tip, len, patronus: kind, pcol, win: 'patronus'|'sparks'|fn, cheer: fn }
function spells(rig, o) {
  const s = rig.dims.s, col = o.color;
  const b = bolt(o.tip, col, { r: 0.05, glow: 0.45 });
  const sp = burst(o.tip, col, 9, 0.35, 3);
  const stream = o.patronus ? bolt(o.tip, o.pcol ?? PATRONUS, { r: 0.07, glow: 0.6 }) : null;
  let pat = null;
  if (o.patronus) {
    pat = fxg(rig.root);
    const a = beast(o.patronus, fxMat(o.pcol ?? PATRONUS, 0.5), o.psize ?? 1.3); pat.add(a);
    addGlow(pat, o.pcol ?? PATRONUS, 2.2, 0, 0.7, 0, 0.45);
  }
  const L = (o.len ?? 4) * 1;
  return (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    // cheer: the spell bolt
    let len = 0;
    if (ch) len = sm(seg(f, 0.22, 0.34)) * (1 - sm(seg(f, 0.74, 0.86))) * L;
    else if (n === 'use' || n === 'throwF') len = bump(f, 0.2, 0.9) * L * 0.4;
    b.set(len, 1 + S(t * 47) * 0.25);
    const spOn = (ch && f > 0.2 && f < 0.85) || (win && !o.patronus);
    vis(sp, spOn);
    if (spOn) { sp.rotation.set(t * 7, t * 11, 0); sp.scale.setScalar(0.7 + abs(S(t * 23)) * 0.5); }
    if (pat) {
      vis(pat, win);
      stream.set(win ? 1.0 + S(t * 9) * 0.2 : 0, 1 + S(t * 31) * 0.2);
      if (win) {
        const a = t * 1.8, R = 2.5;
        pat.position.set(S(a) * R, 0.15 + abs(S(t * 7)) * 0.25, Math.cos(a) * R);
        pat.rotation.set(-S(t * 7) * 0.1, a + PI / 2, 0);
      }
    }
    o.extra?.(n, f, t, s);
  };
}

// ---- Harry Potter ------------------------------------------------------------------------------
function harry() {
  const HAIR = 0x2a1c14;
  const rig = fig({
    name: 'harry', front: schoolFront('gry'),
    face: face('harry', SKIN, (P) => {
      P.eyes({ col: '#1e3a1e', r: 6 }); P.brows({ y: -28, col: '#2a1c14' }); P.glasses({ w: 5.5 }); P.smile();
      P.line([[6, -44], [14, -37], [6, -35], [14, -27]], '#a8302a', 3.5);   // lightning scar
    }),
    hair: (b, r, h) => { cap(b, r, h, HAIR, 0.8); back(b, r, h, HAIR, 0.3, 0.9); tufts(b, r, h, HAIR, 11, 0.32, { seed: 5 }); fringe(b, r, h, HAIR, -0.6, 0.88); },
    torsoExtra: (b, d) => scarf(b, d, H.gry.a, H.gry.b),
  });
  const { tip } = wand(rig, { color: 0x6a3a1c });
  rig.fx = spells(rig, { tip, color: 0xff2a2a, patronus: 'stag' });   // Expelliarmus! / stag Patronus
  return rig;
}

// ---- Hermione Granger -------------------------------------------------------------------------
function hermione() {
  const HAIR = 0x7a4a26;
  const rig = fig({
    name: 'hermione', s: 1.22, front: schoolFront('gry'),
    face: face('hermione', SKIN, (P) => { P.eyes({ col: '#4a2a10', r: 6.5 }); P.brows({ y: -24, col: '#5a3418', w: 4 }); P.smile('#a8384a'); P.cheeks(); }),
    hair: (b, r, h) => { cap(b, r, h, HAIR, 0.82, 1.12); long(b, r, h, HAIR, -0.5, 1.25); bush(b, r, h, HAIR, 26, 0.36, { y0: -0.35, y1: 1.05, spread: 1.15, seed: 13 }); fringe(b, r, h, HAIR, 0.5, 0.9); },
  });
  const { tip } = wand(rig, { color: 0x8a5a3a, knobs: 2 });
  // Wingardium Leviosa: a feather drifts up from the wand
  const feather = fxg(rig.root);
  const fb = new BrickBuilder(1);
  rbox(fb, 0, 0, 0, 0.16, 0.5, 0.03, 0, 0, 0, C.white); rod(fb, [0, -0.32, 0], [0, 0.26, 0.02], 0.012, 0xdddddd, 4);
  feather.add(fb.build({ name: 'feather' })); addGlow(feather, 0xd8c0ff, 0.8, 0, 0, 0, 0.6);
  rig.fx = spells(rig, {
    tip, color: 0xb070ff, patronus: 'otter', psize: 1.5,
    extra: (n, f, t, s) => {
      const on = n === 'cheer' && f > 0.3;
      vis(feather, on);
      if (on) { const k = seg(f, 0.3, 1); feather.position.set(S(t * 5) * 0.3, 1.4 + k * 1.6, 1.4); feather.rotation.set(0, t * 2, S(t * 5) * 0.5); }
    },
  });
  return rig;
}

// ---- Ron Weasley ---------------------------------------------------------------------------------
function ron() {
  const HAIR = 0xd2541e;
  const rig = fig({
    name: 'ron', front: jumperFront('R', 0x7a1a2a),
    face: face('ron', SKIN, (P) => { P.eyes({ col: '#2a3a5a', r: 6 }); P.brows({ y: -24, col: '#b04a1a' }); P.freckles(); P.grin(); }),
    hair: (b, r, h) => { cap(b, r, h, HAIR, 0.78); back(b, r, h, HAIR, 0.3, 0.9); fringe(b, r, h, HAIR, 0.4, 0.86); tufts(b, r, h, HAIR, 7, 0.26, { seed: 9 }); },
    torsoExtra: (b, d) => { const s = d.s; for (const sd of [-1, 1]) rbox(b, sd * 0.33 * s, 0.55 * s, 0.215 * s, 0.1 * s, 0.75 * s, 0.03 * s, 0, 0, sd * 0.08, H.gry.a); },
  });
  const { tip, wand: w } = wand(rig, { color: 0x7a5a3a });
  // Spellotape round the broken wand
  const tb = new BrickBuilder(1); tb.cyl(0, -0.2 * rig.dims.s, 0, 0.032 * rig.dims.s, 0.06 * rig.dims.s, 0xf0ead8, { seg: 8 }); w.add(tb.build({ name: 'tape' }));
  // the wand backfires: green sputter and a slug
  const back2 = burst(tip, 0x6aff40, 8, 0.4, 11, 0x3a8a20);
  const slug = fxg(rig.root);
  const sb = new BrickBuilder(1); sb.sphere(0, 0, 0, 0.12, 0x6a8a2a, { sy: 0.7 }); sb.sphere(0, 0.02, 0.12, 0.08, 0x6a8a2a); slug.add(sb.build({ name: 'slug' }));
  const smoke = addGlow(tip, 0x909090, 0.9, 0, 0, 0, 0.5); smoke.visible = false;
  rig.fx = spells(rig, {
    tip, color: 0x6aff40, len: 1.2, patronus: 'dog',
    extra: (n, f, t, s) => {
      const ch = n === 'cheer';
      const sput = ch && f > 0.25 && S(t * 40) > -0.2;
      vis(back2, sput); vis(smoke, ch && f > 0.3);
      if (sput) { back2.rotation.set(t * 9, t * 13, 0); back2.scale.setScalar(0.6 + abs(S(t * 37)) * 0.8); }
      const sl = ch && f > 0.45;
      vis(slug, sl);
      if (sl) { const k = seg(f, 0.45, 1); slug.position.set(0.1, 1.55 - k * 1.2 + S(k * PI) * 0.6, 0.6 + k * 1.2); slug.rotation.x = k * 6; }
    },
  });
  return rig;
}

// ---- Albus Dumbledore ------------------------------------------------------------------------------
function dumbledore() {
  const SILVER = 0xd8d8d8, ROBE2 = 0x5a2a7a;
  const rig = fig({
    name: 'dumbledore', s: 1.36, torso: ROBE2, arms: ROBE2, hips: ROBE2, legs: 0x3a1a52, extraHeight: 1.0,
    front: decal('dumbledore', (P) => {
      P.line([[34, 0], [50, 160]], '#d8b040', 5); P.line([[94, 0], [78, 160]], '#d8b040', 5);
      for (const [x, y] of [[20, 40], [108, 70], [24, 120], [104, 140]]) { P.dot(x, y, 4, '#e8c860'); }
      P.rect(36, 112, 56, 10, '#9a8a6a');
    }),
    face: face('dumbledore', SKIN, (P) => {
      P.eyes({ col: '#2a4a8a', r: 5.5, y: -8 }); P.brows({ y: -24, col: '#cfcfcf', w: 6 });
      for (const s of [-1, 1]) { P.g.strokeStyle = '#b89030'; P.g.lineWidth = 4; P.g.beginPath(); P.g.arc(s * 24, -6, 13, 0, PI); P.g.closePath(); P.g.stroke(); }
      P.line([[-11, -4], [11, -4]], '#b89030', 4);
      P.poly([[-48, 12], [48, 12], [30, 64], [-30, 64]], '#d8d8d8');
    }),
    hair: (b, r, h) => {
      long(b, r, h, SILVER, -0.9, 1.15);
      for (const sd of [-1, 1]) b.box(sd * r * 0.95, -h * 0.6, -r * 0.05, r * 0.3, h * 1.3, r * 0.9, SILVER);
      // long beard down the chest + moustache
      b.add(taperGeo(0.16, 0.66, 1.0, 0.22), plastic(SILVER), 0, -h * 1.45, r * 0.72, 0, r * 1.5, h * 1.9, r * 1.1);
      rbox(b, 0, h * 0.34, r * 0.96, r * 0.95, h * 0.1, r * 0.2, 0, 0, 0, SILVER);
      b.sphere(0, h * 0.44, r * 1.0, r * 0.13, 0xf0c0a0);
      wizardHat(b, r, h, ROBE2, { tall: 1.7, lean: 0.4, band: 0xd8b040, stars: 0xe8c860 });
    },
  });
  const { tip } = wand(rig, { color: 0x8a7a68, knobs: 4, len: 0.5 });
  // Fawkes circles overhead on the win
  const fw = phoenix(1.1); const fawkes = fxg(rig.root); fawkes.add(fw.g);
  const flare = burst(tip, 0xfff0b0, 14, 0.6, 7, 0xffc040);
  rig.fx = spells(rig, {
    tip, color: 0xfff2c0,
    extra: (n, f, t) => {
      const win = n === 'win', ch = n === 'cheer';
      vis(fawkes, win || (ch && f > 0.3));
      if (win || ch) {
        const a = t * 1.6, R = win ? 2.2 : 1.5 + f;
        fawkes.position.set(S(a) * R, 2.9 + S(t * 3) * 0.2, Math.cos(a) * R);
        fawkes.rotation.set(0, a + PI / 2, -0.35);
        const w = S(t * 12) * 0.6; fw.wl.rotation.z = w; fw.wr.rotation.z = -w;
      }
      vis(flare, win);
      if (win) { flare.rotation.set(t * 3, t * 5, 0); flare.scale.setScalar(0.8 + S(t * LOOP * 2) * 0.2); }
    },
  });
  return rig;
}

// ---- Rubeus Hagrid ----------------------------------------------------------------------------------
function hagrid() {
  const HAIR = 0x2e1e12, COAT = 0x5a3a22;
  const rig = fig({
    name: 'hagrid', s: 1.62, wide: 1.25, deep: 1.2, torso: COAT, arms: COAT, hips: COAT, legs: 0x3a2a1a, extraHeight: 0.35,
    front: decal('hagrid', (P) => {
      P.rect(48, 0, 32, 160, '#4a3020'); for (let y = 30; y < 160; y += 30) P.dot(64, y, 5, '#2a1a10');
      P.rect(10, 96, 34, 30, '#4a3020'); P.rect(84, 96, 34, 30, '#4a3020');
      P.rect(0, 130, 128, 12, '#2a1a10'); P.rect(56, 128, 16, 16, '#b09040');
    }),
    face: face('hagrid', 0xe8b898, (P) => {
      P.ell(0, 30, 95, 50, '#2e1e12');
      P.eyes({ col: '#101010', r: 6.5, y: -8, dx: 22 }); P.brows({ y: -26, col: '#2e1e12', w: 8 });
      P.ell(0, 8, 9, 8, '#d89878'); P.cheeks('rgba(220,100,90,0.5)');
      P.arc(0, 20, 12, 0.2 * PI, 0.8 * PI, '#6a2a1a', 4);
    }),
    hair: (b, r, h) => {
      cap(b, r, h, HAIR, 0.78, 1.14); long(b, r, h, HAIR, -0.35, 1.3);
      bush(b, r, h, HAIR, 30, 0.38, { y0: -0.1, y1: 1.1, spread: 1.15, seed: 21, frontCut: 0.5 });
      // big bushy beard over the chin and chest
      for (let k = 0; k < 9; k++) { const a = (k / 8 - 0.5) * 2.2; b.sphere(S(a) * r * 0.85, h * (0.02 + abs(a) * 0.12), Math.cos(a) * r * 0.8, r * 0.36, HAIR); }
      b.sphere(0, -h * 0.25, r * 0.75, r * 0.55, HAIR, { sy: 1.1 });
    },
  });
  // the pink umbrella (with a broken wand hidden inside)
  const s = rig.dims.s, PINK = 0xf08ab0;
  const um = new THREE.Group(); um.position.set(0, handY(rig), 0.01); um.rotation.x = -0.5; rig.armR.add(um);
  const ub = new BrickBuilder(1);
  rod(ub, [0, 0.05, 0], [0, -0.85, 0], 0.016, 0x7a5a3a, 6);
  ub.add(taperGeo(0.04, 0.13, 0.55, 0.13), plastic(PINK), 0, -0.82, 0, 0, 1, 1, 1);
  rod(ub, [0, 0.05, 0], [0, 0.12, 0.08], 0.022, 0x7a5a3a, 6);
  um.add(ub.build({ name: 'umbrella' }));
  const tip = new THREE.Group(); tip.position.y = -0.9; um.add(tip);
  const fire = [0, 1, 2].map((k) => { const g = burst(rig.root, [0xff70c0, 0xffd040, 0x80d0ff][k], 12, 0.6, 3 + k * 4); return g; });
  rig.fx = spells(rig, {
    tip, color: 0xff70c0, len: 2.2,
    extra: (n, f, t) => {
      const win = n === 'win';
      fire.forEach((g, k) => {
        const p = ((t * 0.9 + k / 3) % 1);
        const on = win && p > 0.15;
        vis(g, on);
        if (on) { g.position.set((k - 1) * 1.1, 3.0 + k * 0.4, 0.6 - k * 0.3); g.scale.setScalar(sm(seg(p, 0.15, 0.5)) * (1 - seg(p, 0.85, 1))); g.rotation.y = t; }
      });
    },
  });
  return rig;
}

// ---- Severus Snape ---------------------------------------------------------------------------------
function snape() {
  const HAIR = 0x141414, SAL = 0xdcc6a0;
  const rig = fig({
    name: 'snape', torso: 0x141418, arms: 0x141418, hips: 0x141418, legs: 0x141418, skin: SAL,
    front: decal('snape', (P) => {
      P.rect(58, 0, 12, 160, '#0a0a0c'); for (let y = 10; y < 160; y += 12) P.dot(64, y, 3.2, '#3a3a40');
      P.rect(50, 0, 28, 8, '#e8e8e8');
    }),
    face: face('snape', SAL, (P) => {
      P.eyes({ r: 5.5, y: -6 }); P.brows({ y: -18, col: '#141414', w: 6, tilt: -1 });
      P.line([[0, -10], [-6, 10], [2, 12]], '#a89880', 3); P.flat('#3a2a2a', 26);
      P.line([[-10, 30], [-4, 34]], 'rgba(0,0,0,0.25)', 2);
    }),
    hair: (b, r, h) => {
      cap(b, r, h, HAIR, 0.8, 1.1); long(b, r, h, HAIR, -0.3, 1.18);
      for (const sd of [-1, 1]) b.box(sd * r * 0.86, -h * 0.25, r * 0.12, r * 0.38, h * 1.15, r * 1.1, HAIR);
      for (const sd of [-1, 1]) rbox(b, sd * r * 0.45, h * 0.88, r * 0.7, r * 0.9, h * 0.22, r * 0.4, 0.55, 0, sd * 0.4, HAIR);
    },
    torsoExtra: (b, d) => { const s = d.s; b.box(0, -0.05 * s, -0.27 * s, 1.0 * s, 1.0 * s, 0.06 * s, 0x0e0e10); b.cyl(0, 0.86 * s, 0, 0.2 * s, 0.16 * s, 0x141418, { seg: 14 }); },
  });
  const { tip } = wand(rig, { color: 0x1a1414, handle: 0x2a2a2a });
  rig.fx = spells(rig, { tip, color: 0xc8d0ff, patronus: 'doe' });   // Sectumsempra / silver doe
  return rig;
}

// ---- Minerva McGonagall ----------------------------------------------------------------------------
function mcgonagall() {
  const GREEN = 0x1d5e3a, GREY = 0x9a9a9a;
  const rig = fig({
    name: 'mcgonagall', s: 1.26, torso: GREEN, arms: GREEN, hips: GREEN, legs: 0x123a24, extraHeight: 0.8,
    front: decal('mcgonagall', (P) => {
      P.poly([[40, 0], [88, 0], [74, 50], [54, 50]], '#0e3420');
      for (let x = 8; x < 128; x += 20) P.line([[x, 60], [x, 160]], 'rgba(160,30,30,0.5)', 3);
      for (let y = 70; y < 160; y += 20) P.line([[0, y], [128, y]], 'rgba(160,30,30,0.5)', 3);
      P.dot(64, 44, 8, '#d8b040'); P.dot(64, 44, 4, '#2a6a3a');
    }),
    face: face('mcgonagall', SKIN, (P) => {
      P.eyes({ r: 5.5 }); P.brows({ y: -22, col: '#6a6a6a', w: 4, tilt: -0.5 }); P.glasses({ sq: true, r: 13, w: 3.5, col: '#3a3a3a' });
      P.flat('#7a2a2a', 26); P.line([[-38, 18], [-30, 28]], 'rgba(0,0,0,0.2)', 2); P.line([[38, 18], [30, 28]], 'rgba(0,0,0,0.2)', 2);
    }),
    hair: (b, r, h) => { back(b, r, h, GREY, 0.35, 0.95); b.sphere(0, h * 0.62, -r * 1.05, r * 0.38, GREY); wizardHat(b, r, h, GREEN, { brim: 1.9, tall: 1.35, lean: 0.25, band: 0x0e3420 }); },
  });
  const { tip } = wand(rig, { color: 0x3a2a1c, handle: 0x1a1a1a });
  rig.fx = spells(rig, { tip, color: 0xffb030, patronus: 'cat', psize: 1.6 });
  return rig;
}

// ---- Lord Voldemort ----------------------------------------------------------------------------------
function voldemort() {
  const PALE2 = 0xcdd0c6, BLK = 0x111114;
  const rig = fig({
    name: 'voldemort', torso: BLK, arms: BLK, hips: BLK, legs: BLK, skin: PALE2,
    front: decal('voldemort', (P) => { for (const x of [30, 50, 78, 98]) P.line([[x, 20], [x + (x - 64) * 0.2, 160]], 'rgba(60,60,70,0.9)', 3); P.poly([[44, 0], [84, 0], [64, 26]], '#d8d6ce'); }),
    face: face('voldemort', PALE2, (P) => {
      for (const s of [-1, 1]) { P.ell(s * 22, -6, 10, 6, '#c8c0b8'); P.ell(s * 22, -6, 6, 3.5, '#d01010', s * 0.25); P.ell(s * 22, -6, 1.6, 3.2, '#200000'); }
      for (const s of [-1, 1]) P.line([[s * 5, 4], [s * 3, 12]], '#6a5a5a', 3);   // nostril slits, no nose
      P.line([[-16, 26], [16, 26]], '#8a8080', 3);
      P.line([[-40, -30], [-30, -42], [-24, -50]], 'rgba(120,140,170,0.5)', 2); P.line([[44, -24], [36, -40]], 'rgba(120,140,170,0.5)', 2);
    }),
    hair: (b, r, h) => b.sphere(0, h + 0.01, 0, r, PALE2, { sy: 0.32 }),
    torsoExtra: (b, d) => { const s = d.s; b.box(0, -0.08 * s, -0.27 * s, 1.0 * s, 1.0 * s, 0.06 * s, BLK); b.add(taperGeo(0.62, 0.8, 0.34, 0.16), plastic(BLK), 0, 0.86 * s, -0.17 * s, 0, s, s, s); for (const sd of [-1, 1]) rbox(b, sd * 0.2 * s, 0.98 * s, -0.02 * s, 0.06 * s, 0.26 * s, 0.32 * s, 0, sd * 0.3, -sd * 0.25, BLK); },
  });
  const { tip } = wand(rig, { color: 0xe8e0c8, hook: true, knobs: 2, len: 0.46 });
  const mark = fxg(rig.root); mark.add(darkMark(1.4));
  rig.fx = spells(rig, {
    tip, color: 0x30ff50,   // Avada Kedavra
    extra: (n, f, t) => {
      const win = n === 'win';
      vis(mark, win);
      if (win) { mark.position.set(0, 3.6 + S(t * 2) * 0.12, 0.2); mark.rotation.y = S(t * 0.8) * 0.4; }
    },
  });
  return rig;
}

// ---- Draco Malfoy -----------------------------------------------------------------------------------
function draco() {
  const HAIR = 0xe6d088;
  const rig = fig({
    name: 'draco', front: schoolFront('sly'), skin: 0xecc4a0,
    face: face('draco', 0xecc4a0, (P) => { P.eyes({ col: '#4a5a6a', r: 5.5 }); P.brows({ y: -22, col: '#c8b880', w: 4, tilt: -0.7 }); P.smirk(); }),
    hair: (b, r, h) => { cap(b, r, h, HAIR, 0.8, 1.07); back(b, r, h, HAIR, 0.4, 0.9); rbox(b, -r * 0.2, h * 0.93, r * 0.6, r * 1.6, h * 0.14, r * 0.5, 0.25, 0, 0.15, HAIR); },
    torsoExtra: (b, d) => scarf(b, d, H.sly.a, H.sly.b, { side: -0.12 }),
  });
  const { tip } = wand(rig, { color: 0x9a7a5a });
  // Serpensortia: a green snake shoots out with the bolt
  const snake = fxg(rig.root);
  const nb = new BrickBuilder(1);
  for (let k = 0; k < 8; k++) nb.sphere(S(k * 1.1) * 0.12, 0, -k * 0.13, 0.08 - k * 0.006, 0x2a8a3a);
  nb.box(0, -0.04, 0.03, 0.14, 0.08, 0.16, 0x2a8a3a);
  snake.add(nb.build({ name: 'snake' }));
  rig.fx = spells(rig, {
    tip, color: 0x40e070,
    extra: (n, f, t) => {
      const on = n === 'cheer' && f > 0.3 && f < 0.9;
      vis(snake, on);
      if (on) { const k = seg(f, 0.3, 0.9); snake.position.set(-0.3, 1.0 - k * 0.6, 1.2 + k * 2.6); snake.rotation.y = S(t * 14) * 0.3; }
    },
  });
  return rig;
}

// ---- Neville Longbottom -----------------------------------------------------------------------------
function neville() {
  const HAIR = 0x5a3a20;
  const rig = fig({
    name: 'neville', front: schoolFront('gry'), wide: 1.05,
    face: face('neville', SKIN, (P) => { P.eyes({ col: '#3a2a1a', r: 6 }); P.brows({ y: -24, col: '#5a3a20', tilt: 0.6 }); P.smile('#1b1b1b', 20, 15); P.cheeks(); }),
    hair: (b, r, h) => { cap(b, r, h, HAIR, 0.82); back(b, r, h, HAIR, 0.4, 0.9); fringe(b, r, h, HAIR, 0.2, 0.9); },
    torsoExtra: (b, d) => scarf(b, d, H.gry.a, H.gry.b),
  });
  const { tip, wand: w } = wand(rig, { color: 0x8a4a2a });
  // the Sword of Gryffindor
  const sw = fxg(rig.armR, 0, handY(rig), 0.01);
  const sb = new BrickBuilder(1);
  sb.box(0, -1.15, 0, 0.09, 1.05, 0.03, 0xdfe4ea, { matOpts: { metal: 0.7, rough: 0.2 } });
  sb.box(0, -0.12, 0, 0.36, 0.06, 0.08, 0xd8b040, { matOpts: { metal: 0.6, rough: 0.3 } });
  sb.box(0, -0.09, 0, 0.05, 0.2, 0.05, 0x7a4a2a);
  sb.sphere(0, 0.12, 0, 0.05, 0xc0101a); for (const sd of [-1, 1]) sb.sphere(sd * 0.1, -0.12, 0.04, 0.03, 0xc0101a);
  sw.add(sb.build({ name: 'sword' })); addGlow(sw, 0xfff0c0, 0.6, 0, -1.4, 0, 0.5);
  const fx = spells(rig, { tip, color: 0xff6040 });
  rig.fx = (n, f, t) => {
    const sword = n === 'cheer' || n === 'win';
    vis(sw, sword); vis(w, !sword);
    fx(sword ? 'race' : n, f, t);
  };
  return rig;
}

// ---- Luna Lovegood ------------------------------------------------------------------------------------
function luna() {
  const HAIR = 0xd8bc70;
  const rig = fig({
    name: 'luna', s: 1.22, front: schoolFront('rav'), extraHeight: 0.2,
    face: face('luna', SKIN, (P) => { P.eyes({ col: '#5a8ac8', r: 8 }); P.brows({ y: -28, col: '#c8b070', w: 3 }); P.smile('#c86a7a', 18, 13); }),
    hair: (b, r, h, d) => {
      cap(b, r, h, HAIR, 0.82); long(b, r, h, HAIR, -0.85, 1.2);
      for (const sd of [-1, 1]) b.box(sd * r * 0.98, -h * 0.75, -r * 0.2, r * 0.26, h * 1.55, r * 0.6, HAIR);
      fringe(b, r, h, HAIR, 0.3, 0.88);
      // Spectrespecs: big candy-coloured lenses
      for (const sd of [-1, 1]) {
        rod(b, [sd * r * 0.42, h * 0.53, r * 0.96], [sd * r * 0.42, h * 0.53, r * 1.06], r * 0.36, 0xf0d020, 14);
        rod(b, [sd * r * 0.42, h * 0.53, r * 1.0], [sd * r * 0.42, h * 0.53, r * 1.08], r * 0.3, sd > 0 ? 0x30c8f0 : 0xf040a0, 14);
        b.sphere(sd * r * 1.05, h * 0.18, r * 0.15, r * 0.14, 0xff7a20);   // radish earrings
        b.box(sd * r * 1.05, h * 0.26, r * 0.15, r * 0.06, r * 0.18, r * 0.06, 0x3aa83a);
      }
      b.box(0, h * 0.53, r * 1.02, r * 0.3, r * 0.12, r * 0.08, 0xf0d020);
    },
  });
  const { tip } = wand(rig, { color: 0xb8a070, knobs: 1 });
  rig.fx = spells(rig, { tip, color: 0x60c8ff, patronus: 'hare', psize: 1.7 });
  return rig;
}

// ---- Ginny Weasley ----------------------------------------------------------------------------------
function ginny() {
  const HAIR = 0xc8401a;
  const rig = fig({
    name: 'ginny', s: 1.22, front: schoolFront('gry'),
    face: face('ginny', SKIN, (P) => { P.eyes({ col: '#5a3a1a', r: 6.5 }); P.brows({ y: -24, col: '#a83a1a', w: 4 }); P.freckles('#d0905a'); P.smile('#b03a4a', 18, 15); }),
    hair: (b, r, h) => {
      cap(b, r, h, HAIR, 0.82); long(b, r, h, HAIR, -0.9, 1.18);
      for (const sd of [-1, 1]) b.box(sd * r * 0.98, -h * 0.8, -r * 0.2, r * 0.26, h * 1.6, r * 0.6, HAIR);
      fringe(b, r, h, HAIR, -0.5, 0.88);
    },
    torsoExtra: (b, d) => scarf(b, d, H.gry.a, H.gry.b, { side: -0.12 }),
  });
  const { tip } = wand(rig, { color: 0x7a5a3a });
  // Bat-Bogey Hex: a flock of bats flaps out
  const bats = [0, 1, 2, 3, 4].map((k) => {
    const g = fxg(rig.root); const bb = new BrickBuilder(1);
    bb.sphere(0, 0, 0, 0.07, 0x1a1a1a, { sy: 1.2 });
    g.add(bb.build({ name: 'bat' }));
    const wg = [1, -1].map((sd) => { const p = new THREE.Group(); const wb = new BrickBuilder(1); rbox(wb, sd * 0.15, 0, 0, 0.26, 0.02, 0.14, 0, 0, 0, 0x2a2a2a); p.add(wb.build({ name: 'batwing' })); g.add(p); return p; });
    return { g, wg, k };
  });
  rig.fx = spells(rig, {
    tip, color: 0xff8030, patronus: 'horse', psize: 1.3,
    extra: (n, f, t) => {
      for (const bt of bats) {
        const p = seg(f, 0.25 + bt.k * 0.08, 0.9);
        const on = n === 'cheer' && p > 0 && p < 1;
        vis(bt.g, on);
        if (on) {
          bt.g.position.set((bt.k - 2) * 0.35 * p * 2 + S(t * 9 + bt.k) * 0.2, 1.3 + p * 1.4 + S(t * 13 + bt.k) * 0.15, 1.0 + p * 3);
          const w = S(t * 30 + bt.k) * 0.8; bt.wg[0].rotation.z = w; bt.wg[1].rotation.z = -w;
        }
      }
    },
  });
  return rig;
}

// ---- Sirius Black ------------------------------------------------------------------------------------
function sirius() {
  const HAIR = 0x22160e, COAT = 0x26262c;
  const rig = fig({
    name: 'sirius', torso: COAT, arms: COAT, hips: COAT, legs: 0x1a1a1e,
    front: decal('sirius', (P) => {
      P.poly([[28, 0], [100, 0], [88, 160], [40, 160]], '#6a1a22');
      P.poly([[46, 0], [82, 0], [64, 50]], '#e8e2d4');
      for (let y = 66; y < 160; y += 22) P.dot(64, y, 4, '#c8a040');
      P.line([[52, 30], [58, 40]], '#3a3a5a', 2);
    }),
    face: face('sirius', SKIN, (P) => {
      P.eyes({ col: '#3a3a4a', r: 5.5 }); P.brows({ y: -22, col: '#22160e', w: 5 });
      P.line([[-20, 14], [-6, 10], [6, 10], [20, 14]], '#22160e', 6); P.poly([[-8, 32], [8, 32], [3, 50], [-3, 50]], '#22160e');
      P.smirk('#5a2a2a', 24);
    }),
    hair: (b, r, h) => { cap(b, r, h, HAIR, 0.82); long(b, r, h, HAIR, -0.4, 1.18); for (const sd of [-1, 1]) b.box(sd * r * 0.92, -h * 0.35, r * 0.05, r * 0.34, h * 1.2, r * 0.9, HAIR); fringe(b, r, h, HAIR, 0.5, 0.9); },
  });
  const { tip } = wand(rig, { color: 0x2a1a14, knobs: 1 });
  // Padfoot: a big black dog bounds alongside on the win
  const dog = fxg(rig.root); dog.add(beast('dog', plastic(0x18181a), 2.0));
  rig.fx = spells(rig, {
    tip, color: 0xff6a2a,
    extra: (n, f, t) => {
      const win = n === 'win';
      vis(dog, win);
      if (win) { dog.position.set(-1.9, -0.5 + abs(S(t * 6)) * 0.35, 0.4); dog.rotation.set(-S(t * 6) * 0.15, 0, 0); }
    },
  });
  return rig;
}

// ---- Dobby -------------------------------------------------------------------------------------------
function dobby() {
  const SK = 0xbdb595, CASE = 0xddd3b8;
  const rig = fig({
    name: 'dobby', s: 0.85, headR: 0.44, headH: 0.62, torso: CASE, arms: SK, hands: SK, hips: CASE, legs: SK, skin: SK, neck: SK, extraHeight: 0.1,
    front: decal('dobby', (P) => { P.line([[10, 20], [118, 30]], 'rgba(120,100,70,0.6)', 3); P.dot(40, 100, 14, 'rgba(150,120,70,0.35)'); P.dot(90, 70, 8, 'rgba(150,120,70,0.3)'); }),
    face: face('dobby', SK, (P) => {
      for (const s of [-1, 1]) { P.ell(s * 30, -8, 20, 22, '#f2f0e0'); P.ell(s * 28, -6, 13, 15, '#3a8a3a'); P.ell(s * 28, -6, 6, 7, '#0a0a0a'); P.ell(s * 25, -12, 3, 3, '#fff'); }
      P.arc(0, 18, 14, 0.25 * PI, 0.75 * PI, '#5a4a3a', 4);
      P.line([[-46, -34], [-16, -30]], 'rgba(90,80,60,0.5)', 3); P.line([[46, -34], [16, -30]], 'rgba(90,80,60,0.5)', 3);
    }),
    hair: (b, r, h) => {
      b.sphere(0, h, 0, r, SK, { sy: 0.4 });
      // long pointy nose and big bat ears
      rod(b, [0, h * 0.45, r * 0.9], [0, h * 0.28, r * 1.45], r * 0.1, SK, 6);
      for (const sd of [-1, 1]) {
        rbox(b, sd * r * 1.5, h * 0.62, -r * 0.1, r * 1.3, h * 0.55, r * 0.06, 0, sd * 0.2, sd * 0.2, SK);
        rbox(b, sd * r * 1.45, h * 0.62, -r * 0.06, r * 1.0, h * 0.35, r * 0.04, 0, sd * 0.2, sd * 0.2, 0xd8a090);
      }
    },
  });
  // the sock that set him free
  const sock = fxg(rig.armL, 0, handY(rig) - 0.05, 0.02); sock.scale.setScalar(1.6);
  const kb = new BrickBuilder(1);
  for (let k = 0; k < 4; k++) kb.box(0, -0.08 - k * 0.1, 0, 0.13, 0.1, 0.1, k % 2 ? 0x2a6a3a : 0xe8e0d0);
  kb.box(0, -0.48, 0.07, 0.13, 0.1, 0.24, 0x2a6a3a);
  sock.add(kb.build({ name: 'sock' }));
  const snap = burst(rig.armR, 0x80e0ff, 12, 0.7, 13); snap.position.set(0, handY(rig) - 0.25, 0);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    vis(sock, ch || win);
    if (ch || win) sock.rotation.z = S(t * 12) * 0.3;
    const on = (ch && f > 0.35 && f < 0.75) || (win && S(t * LOOP * 2) > 0.3);
    vis(snap, on);
    if (on) { snap.rotation.set(t * 9, t * 7, 0); snap.scale.setScalar(0.6 + abs(S(t * 29)) * 0.6); }
  };
  return rig;
}

// ---- Bellatrix Lestrange -------------------------------------------------------------------------------
function bellatrix() {
  const HAIR = 0x161212, BLK = 0x16141a, PL = 0xe0d0c4;
  const rig = fig({
    name: 'bellatrix', s: 1.24, torso: BLK, arms: BLK, hips: BLK, legs: BLK, skin: PL, extraHeight: 0.25,
    front: decal('bellatrix', (P) => {
      P.poly([[34, 30], [94, 30], [86, 160], [42, 160]], '#2a2430');
      for (let y = 44; y < 150; y += 16) { P.line([[50, y], [78, y + 12]], '#8a8090', 2); P.line([[78, y], [50, y + 12]], '#8a8090', 2); }
      P.poly([[40, 0], [88, 0], [64, 22]], '#e8ded6');
    }),
    face: face('bellatrix', PL, (P) => {
      for (const s of [-1, 1]) P.ell(s * 24, -6, 14, 11, 'rgba(60,30,60,0.55)');
      P.eyes({ r: 6, y: -6 }); P.brows({ y: -24, col: '#161212', w: 4, tilt: 0.8 });
      P.g.fillStyle = '#7a1020'; P.g.beginPath(); P.g.arc(0, 14, 18, 0.05 * PI, 0.95 * PI); P.g.closePath(); P.g.fill();
      P.g.fillStyle = '#f0e8d0'; P.g.fillRect(-12, 15, 24, 4);
    }),
    hair: (b, r, h) => {
      cap(b, r, h, HAIR, 0.8, 1.12); long(b, r, h, HAIR, -0.75, 1.35);
      bush(b, r, h, HAIR, 40, 0.34, { y0: -0.75, y1: 1.15, spread: 1.3, seed: 31, frontCut: 0.45 }); tufts(b, r, h, HAIR, 10, 0.4, { y: 1.05, ring: 0.6, seed: 8 });
    },
  });
  const { tip } = wand(rig, { color: 0x3a2a20, knobs: 3, len: 0.45 });
  const crackle = burst(tip, 0xd040ff, 14, 0.7, 17, 0x200020);
  rig.fx = spells(rig, {
    tip, color: 0xd040ff,
    extra: (n, f, t) => {
      const win = n === 'win';
      vis(crackle, win);
      if (win) { crackle.rotation.set(t * 13, t * 17, t * 5); crackle.scale.setScalar(0.6 + abs(S(t * 37)) * 0.8); }
    },
  });
  return rig;
}

// ---- Fred Weasley ---------------------------------------------------------------------------------------
function fred() {
  const HAIR = 0xd2541e, JUMP = 0x2a5a8a;
  const rig = fig({
    name: 'fred', torso: JUMP, arms: JUMP, hips: 0x3a3a40, legs: 0x3a3a40, front: jumperFront('F', JUMP, 0xf0c040),
    face: face('fred', SKIN, (P) => { P.eyes({ col: '#2a3a5a', r: 6 }); P.brows({ y: -24, col: '#b04a1a', tilt: 0.5 }); P.freckles(); P.grin(12); }),
    hair: (b, r, h) => { cap(b, r, h, HAIR, 0.78, 1.1); back(b, r, h, HAIR, 0.15, 0.9, 1.1); for (const sd of [-1, 1]) b.box(sd * r * 0.98, h * 0.2, -r * 0.15, r * 0.24, h * 0.66, r * 0.9, HAIR); fringe(b, r, h, HAIR, 0.7, 0.86); tufts(b, r, h, HAIR, 6, 0.26, { seed: 19 }); },
  });
  // Weasleys' Wildfire Whiz-bangs: a rocket from his hand, then bursts overhead
  const s = rig.dims.s;
  const rocket = fxg(rig.armR, 0, handY(rig), 0.02);
  const rb = new BrickBuilder(1);
  rb.cyl(0, -0.55, 0, 0.07, 0.5, 0xd8301a, { seg: 10 }); rb.cone(0, -0.05, 0, 0.08, 0.16, 0xf0c040); rb.box(0, -0.65, 0, 0.01, 0.2, 0.01, 0xa0a0a0);
  rocket.add(rb.build({ name: 'rocket' })); const trail = addGlow(rocket, 0xffa040, 0.7, 0, -0.75, 0, 0.9);
  const COLS = [0xff3a5a, 0x40ff80, 0x40a0ff, 0xffd040, 0xff60ff];
  const bursts = COLS.map((c, k) => burst(rig.root, c, 14, 0.7, 5 + k * 7, 0xffffff));
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    // rocket rises in the hand, then flies off (hidden)
    vis(rocket, ch && f < 0.45);
    if (ch) { rocket.position.y = handY(rig) + 0; trail.scale.setScalar(0.5 + abs(S(t * 41)) * 0.5); }
    bursts.forEach((g, k) => {
      let p = -1;
      if (ch) p = seg(f, 0.4 + k * 0.08, 0.8 + k * 0.05);
      else if (win) p = (t * 0.8 + k * 0.21) % 1;
      const on = p > 0 && p < 1;
      vis(g, on);
      if (on) { g.position.set(S(k * 2.3) * 1.4, 3.0 + (k % 3) * 0.5, 0.5 + Math.cos(k * 2.3) * 0.8); g.scale.setScalar(sm(seg(p, 0, 0.35)) * 1.3 * (1 - sm(seg(p, 0.75, 1)))); g.rotation.y = t + k; }
    });
    void s;
  };
  return rig;
}

// ---- roster ------------------------------------------------------------------------------------------
const wandCheer = (aim) => (f, t) => cast(f, t, { aim });
export default [
  {
    id: 'harry', name: 'Harry Potter', blurb: 'The Boy Who Lived', weight: 'medium', color: 0x8a1010,
    voice: { kind: 'human', pitch: 1.15 }, style: { cheer: 'fist', trick: 'twist' },
    gestures: { cheer: wandCheer(), win: raise }, build: harry,
  },
  {
    id: 'hermione', name: 'Hermione Granger', blurb: "It's Levi-O-sa, not Levio-SA", weight: 'light', color: 0xb070ff,
    voice: { kind: 'human', pitch: 1.4 }, style: { cheer: 'clap', trick: 'arms' },
    gestures: { cheer: (f, t) => ({ ...cast(f, t, { aim: -1.4 }), rx: lerp(-1.4, -2.1, sm(seg(f, 0.3, 0.9))) + S(t * 6) * 0.1, hx: -0.3 }), win: raise }, build: hermione,
  },
  {
    id: 'ron', name: 'Ron Weasley', blurb: 'Brave, loyal, wand held with tape', weight: 'medium', color: 0xd2541e,
    voice: { kind: 'human', pitch: 1.05 }, style: { cheer: 'fist', trick: 'arms' },
    gestures: { cheer: (f, t) => ({ ...cast(f, t), hy: f > 0.35 ? 0.5 : -0.1, tz: f > 0.3 ? S(t * 25) * 0.08 : 0, lx: f > 0.35 ? -2.2 : -0.9, lz: 0.6 }), win: raise }, build: ron,
  },
  {
    id: 'dumbledore', name: 'Albus Dumbledore', blurb: 'Headmaster with the Elder Wand', weight: 'heavy', color: 0x5a2a7a,
    voice: { kind: 'human', pitch: 0.82 }, style: { cheer: 'wave', trick: 'arms' },
    gestures: { cheer: wandCheer(-1.6), win: (f, t) => ({ rx: -2.6, rz: -0.2, lx: -2.6, lz: 0.4, hx: -0.4, tx: -0.1, by: abs(S(t * LOOP)) * 0.03 }) }, build: dumbledore,
  },
  {
    id: 'hagrid', name: 'Rubeus Hagrid', blurb: 'Keeper of Keys, pink umbrella', weight: 'heavy', color: 0x5a3a22,
    voice: { kind: 'deep', pitch: 0.85 }, style: { cheer: 'both', trick: 'arms' },
    gestures: { cheer: wandCheer(-1.4), win: (f, t) => ({ rx: -2.8, rz: -0.1, lx: UP + S(t * LOOP * 2) * 0.3, lz: 0.5, hx: -0.3, by: abs(S(t * LOOP * 2)) * 0.06 }) }, build: hagrid,
  },
  {
    id: 'snape', name: 'Severus Snape', blurb: 'Always.', weight: 'heavy', color: 0x141418,
    voice: { kind: 'human', pitch: 0.72 }, style: { cheer: 'point', trick: 'superman' },
    gestures: { cheer: (f, t) => ({ ...cast(f, t), hy: -0.2, hx: 0.05, lx: -0.2, lz: 0.1 }), win: raise }, build: snape,
  },
  {
    id: 'mcgonagall', name: 'Minerva McGonagall', blurb: 'Deputy Head, Animagus cat', weight: 'medium', color: 0x1d5e3a,
    voice: { kind: 'human', pitch: 1.2 }, style: { cheer: 'point', trick: 'arms' },
    gestures: { cheer: wandCheer(-1.3), win: raise }, build: mcgonagall,
  },
  {
    id: 'voldemort', name: 'Lord Voldemort', blurb: 'He Who Must Not Be Named', weight: 'light', color: 0x2a3a2a,
    voice: { kind: 'human', pitch: 0.78 }, style: { cheer: 'point', trick: 'superman' },
    gestures: { cheer: (f, t) => ({ ...cast(f, t), lx: -1.4, lz: 0.9, hx: -0.15 }), win: (f, t) => ({ lx: -2.4, lz: 0.7, rx: -2.4, rz: -0.7, hx: -0.45, tx: -0.15, by: abs(S(t * LOOP)) * 0.03 }) }, build: voldemort,
  },
  {
    id: 'draco', name: 'Draco Malfoy', blurb: 'Slytherin Seeker, smug as ever', weight: 'medium', color: 0x1d5a32,
    voice: { kind: 'human', pitch: 1.12 }, style: { cheer: 'point', trick: 'twist' },
    gestures: { cheer: wandCheer(), win: (f, t) => ({ rx: -2.6, rz: -0.3, lx: -0.6, lz: -0.9, hx: -0.4, hy: 0.3, tx: -0.12 }) }, build: draco,
  },
  {
    id: 'neville', name: 'Neville Longbottom', blurb: 'Draws the Sword of Gryffindor', weight: 'medium', color: 0xc0101a,
    voice: { kind: 'human', pitch: 1.0 }, style: { cheer: 'fist', trick: 'arms' },
    gestures: { cheer: (f, t) => ({ rx: -2.95 + S(t * 8) * 0.06, rz: -0.1, lx: -1.0, lz: 0.4, hx: -0.4, tx: -0.08, by: bump(f, 0.1, 0.4) * 0.06 }), win: (f, t) => ({ rx: -2.95, rz: -0.1, lx: UP + S(t * LOOP * 2) * 0.3, lz: 0.4, hx: -0.35, by: abs(S(t * LOOP * 2)) * 0.05 }) }, build: neville,
  },
  {
    id: 'luna', name: 'Luna Lovegood', blurb: 'Dreamy Ravenclaw, Spectrespecs on', weight: 'light', color: 0x1e3a8a,
    voice: { kind: 'human', pitch: 1.45 }, style: { cheer: 'wave', trick: 'twist' },
    gestures: { cheer: (f, t) => ({ ...cast(f, t, { aim: -1.4 }), hz: S(t * 4) * 0.2, tz: S(t * 4) * 0.08, lx: -1.6, lz: 0.6 + S(t * 6) * 0.3 }), win: raise }, build: luna,
  },
  {
    id: 'ginny', name: 'Ginny Weasley', blurb: 'Chaser with a Bat-Bogey Hex', weight: 'light', color: 0xc8401a,
    voice: { kind: 'human', pitch: 1.38 }, style: { cheer: 'fist', trick: 'superman' },
    gestures: { cheer: wandCheer(), win: raise }, build: ginny,
  },
  {
    id: 'sirius', name: 'Sirius Black', blurb: 'Padfoot, the escaped godfather', weight: 'medium', color: 0x6a1a22,
    voice: { kind: 'human', pitch: 0.88 }, style: { cheer: 'point', trick: 'superman' },
    gestures: { cheer: wandCheer(), win: (f, t) => ({ rx: -2.7, rz: -0.25, lx: -1.0, lz: 0.5, hx: -0.3, hy: 0.4 }) }, build: sirius,
  },
  {
    id: 'dobby', name: 'Dobby', blurb: 'Dobby is a free elf!', weight: 'light', color: 0x3a8a3a,
    voice: { kind: 'squeak', pitch: 1.1 }, style: { cheer: 'both', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ lx: UP + S(t * 14) * 0.25, lz: 0.3, rx: -1.5, rz: 0.2 + S(t * 20) * 0.1, hx: -0.3, by: abs(S(t * 14)) * 0.08, tz: S(t * 7) * 0.08 }),
      win: (f, t) => ({ lx: UP + S(t * LOOP * 2) * 0.35, lz: 0.4, rx: -1.6 + S(t * LOOP * 4) * 0.2, rz: 0.1, hx: -0.3, by: abs(S(t * LOOP * 2)) * 0.1 }),
    },
    build: dobby,
  },
  {
    id: 'bellatrix', name: 'Bellatrix Lestrange', blurb: 'Cackling Death Eater', weight: 'medium', color: 0x3a1a4a,
    voice: { kind: 'human', pitch: 1.3 }, style: { cheer: 'spin', trick: 'twist' },
    gestures: { cheer: (f, t) => ({ ...cast(f, t), hz: S(t * 18) * 0.15, hx: -0.3 + S(t * 22) * 0.1, tz: S(t * 11) * 0.1 }), win: (f, t) => ({ ...raise(f, t), ty: S(t * LOOP) * 0.4, hz: S(t * LOOP * 3) * 0.2 }) }, build: bellatrix,
  },
  {
    id: 'fred', name: 'Fred Weasley', blurb: 'Prankster with Whiz-bang fireworks', weight: 'medium', color: 0x2a5a8a,
    voice: { kind: 'human', pitch: 1.1 }, style: { cheer: 'both', trick: 'twist' },
    gestures: { cheer: (f, t) => ({ rx: lerp(-1.3, -2.9, sm(seg(f, 0.15, 0.35))), rz: -0.15, lx: f > 0.45 ? UP + S(t * 14) * 0.3 : -1.0, lz: 0.35, hx: -0.45, by: abs(S(t * 14)) * 0.05 }), win: (f, t) => ({ lx: UP + S(t * LOOP * 2) * 0.3, lz: 0.4, rx: UP - S(t * LOOP * 2) * 0.3, rz: -0.4, hx: -0.4, by: abs(S(t * LOOP * 2)) * 0.07 }) }, build: fred,
  },
];
