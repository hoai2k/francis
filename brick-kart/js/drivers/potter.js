// Harry Potter drivers: brick witches and wizards in house robes, each
// with a wand (or umbrella, sword, sock…) and a signature spell on cheer / win — spell
// bolts, spark bursts, Patronus animals, Fawkes, the Dark Mark, fireworks (./potter-kit.js).
import {
  THREE, BrickBuilder, C, plastic, rbox, rod, taperGeo, cached, S, PI, abs, UP, LOOP, seg, sm, lerp, bump, vis,
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

// ---- local modelling helpers (Dumbledore / Voldemort) ------------------------------------------------
// truncated cone between two points: radius ra at a, rb at c
function frust(b, a, c, ra, rb, col, n = 16) {
  const k = Math.round((rb / ra) * 20) / 20;
  const geo = cached(`hpFrust${k}|${n}`, () => new THREE.CylinderGeometry(k, 1, 1, n).translate(0, 0.5, 0));
  const A = new THREE.Vector3(...a), dir = new THREE.Vector3(...c).sub(A), len = dir.length();
  const m = new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), new THREE.Vector3(ra, len, ra));
  b.addMatrix(geo, typeof col === 'number' ? plastic(col) : col, m);
}
// a curved slab hugging the head cylinder (front arc ±th): beards, collars. y0..y1, radius r0 (bottom) → r1 (top)
function shell(b, x, y0, z, r0, r1, h, th, col, rotY = 0) {
  const k = Math.round((r1 / r0) * 20) / 20, t = Math.round(th * 20) / 20;
  const geo = cached(`hpShell${k}|${t}`, () => new THREE.CylinderGeometry(k, 1, 1, 14, 1, false, -t, t * 2).translate(0, 0.5, 0));
  b.add(geo, plastic(col), x, y0, z, rotY, r0, h, r0);
}
// a tube through a list of points (rods + ball joints), radius from rad(u), colour from col(i)
function tube(b, pts, rad, col) {
  const n = pts.length - 1;
  pts.forEach((p, i) => {
    const r = rad(i / n);
    b.sphere(p[0], p[1], p[2], r, col(i));
    if (i < n) rod(b, p, pts[i + 1], r, col(i), 8);
  });
}

// ---- Albus Dumbledore ------------------------------------------------------------------------------
function dumbledore() {
  const BEARD = 0xeceef2, HAIRC = 0xdfe1e6, ROBE2 = 0x5c1f74, HAT = 0x4a1862, INNER = 0x2c2160, GOLD = 0xe2b444, SKN = 0xefc3a2;
  const rig = fig({
    name: 'dumbledore', s: 1.36, torso: ROBE2, arms: ROBE2, hips: ROBE2, legs: 0x3e1450, skin: SKN, extraHeight: 1.05,
    // plum outer robe open over a midnight under-robe sewn with silver stars, gold-trimmed lapels, gold belt
    front: decal('dumbledore2', (P) => {
      P.poly([[26, 0], [102, 0], [84, 160], [44, 160]], '#2c2160');
      for (const [x, y] of [[46, 30], [80, 52], [56, 78], [74, 100], [52, 140], [78, 146], [64, 120]]) {
        P.poly([[x, y - 6], [x + 2, y - 2], [x + 6, y], [x + 2, y + 2], [x, y + 6], [x - 2, y + 2], [x - 6, y], [x - 2, y - 2]], '#d8dcf0');
      }
      for (const sd of [-1, 1]) {
        const xa = 64 + sd * 38, xb = 64 + sd * 20;
        P.line([[xa, 0], [xb, 160]], '#e2b444', 9); P.line([[xa + sd * 5, 0], [xb + sd * 5, 160]], '#8a5a18', 2);
        // gold crescent moons + stars on the plum
        const mx = 64 + sd * 54;
        P.dot(mx, 40, 8, '#e8c25a'); P.dot(mx + sd * 4, 37, 7, '#5c1f74');
        P.dot(mx - sd * 2, 92, 4, '#e8c25a'); P.dot(mx + sd * 2, 132, 5, '#e8c25a'); P.dot(mx + sd * 6, 132, 4, '#5c1f74');
      }
      P.rect(30, 116, 68, 11, '#e2b444'); P.rect(57, 113, 14, 17, '#b8862a'); P.rect(61, 117, 6, 9, '#e2b444');
    }),
    face: face('dumbledore2', SKN, (P) => {
      const g = P.g;
      // wrinkles, rosy cheeks
      for (const y of [-40, -47]) P.line([[-22, y], [22, y]], 'rgba(160,96,70,0.45)', 2);
      for (const s of [-1, 1]) { P.line([[s * 40, -10], [s * 48, -14]], 'rgba(160,96,70,0.5)', 2); P.line([[s * 40, -4], [s * 48, -2]], 'rgba(160,96,70,0.5)', 2); }
      P.cheeks('rgba(225,110,110,0.45)');
      // twinkling blue eyes
      for (const s of [-1, 1]) { P.ell(s * 24, -9, 8, 6.5, '#ffffff'); P.ell(s * 24, -9, 5, 5.5, '#2f6fd0'); P.ell(s * 24, -9, 2.4, 2.8, '#0a1a3a'); P.ell(s * 22, -11, 1.6, 1.6, '#fff'); }
      P.line([[-34, -14], [-14, -15]], '#7a4a3a', 2.5); P.line([[34, -14], [14, -15]], '#7a4a3a', 2.5);
      // bushy white brows
      for (const s of [-1, 1]) { P.line([[s * 10, -24], [s * 26, -28], [s * 42, -21]], '#f4f4f6', 9); P.line([[s * 34, -25], [s * 46, -18]], '#d8d8dc', 4); }
      // half-moon spectacles (flat top, low on the nose)
      for (const s of [-1, 1]) {
        g.fillStyle = 'rgba(210,235,255,0.35)'; g.beginPath(); g.arc(s * 24, -5, 15, 0, PI); g.closePath(); g.fill();
        g.strokeStyle = '#c8962a'; g.lineWidth = 4; g.stroke();
        P.line([[s * 39, -5], [s * 68, -10]], '#c8962a', 3);
      }
      P.line([[-9, -4], [9, -4]], '#c8962a', 3);
      // beard and moustache roots (the 3D beard sits on top)
      P.poly([[-70, 14], [-40, 8], [-8, 18], [8, 18], [40, 8], [70, 14], [70, 64], [-70, 64]], '#eceef2');
    }),
    arm: (ab, sd, d) => {
      // wide wizard's sleeves with a gold cuff
      const s = d.s;
      ab.add(taperGeo(0.36, 0.25, 0.24, 0.34, 0.26), plastic(ROBE2), 0, -0.6 * s, 0, 0, s, s, s);
      ab.add(taperGeo(0.37, 0.36, 0.05, 0.35), plastic(GOLD), 0, -0.6 * s, 0, 0, s, s, s);
    },
    hair: (b, r, h) => {
      // long silver hair: back curtain to mid-back + side locks to the shoulders
      b.add(taperGeo(1.2, 2.0, 1.55, 0.5, 0.85), plastic(HAIRC), 0, -h * 1.15, -r * 0.6, 0, r, h, r);
      for (const x of [-0.45, 0, 0.45]) rbox(b, x * r, -h * 0.45, -r * 1.02 - abs(x) * 0.02, r * 0.06, h * 1.2, r * 0.05, 0.12, 0, x * 0.25, 0xc8cad2);
      for (const sd of [-1, 1]) {
        b.sphere(sd * r * 0.98, h * 0.35, -r * 0.05, r * 0.3, HAIRC, { sy: 2.4 });
        b.sphere(sd * r * 0.95, -h * 0.35, -r * 0.3, r * 0.34, HAIRC, { sy: 2.6 });
      }
      shell(b, 0, h * 0.1, 0, r * 1.06, r * 1.08, h * 0.8, 1.9, HAIRC, PI);
      // beard over the jaw (continues down the chest on the torso), drooping moustache, crooked nose
      shell(b, 0, -h * 0.3, 0, r * 0.96, r * 1.13, h * 0.68, 1.35, BEARD);
      for (const sd of [-1, 1]) rbox(b, sd * r * 0.3, h * 0.36, r * 1.08, r * 0.62, h * 0.11, r * 0.18, 0, sd * 0.35, -sd * 0.45, BEARD);
      rod(b, [0, h * 0.58, r * 0.95], [r * 0.03, h * 0.5, r * 1.12], r * 0.08, SKN, 8);
      rod(b, [r * 0.03, h * 0.5, r * 1.12], [-r * 0.03, h * 0.42, r * 1.24], r * 0.085, SKN, 8);
      b.sphere(-r * 0.03, h * 0.42, r * 1.22, r * 0.1, SKN);
      // tall plum hat with a drooping, crooked tip, gold band, stars and a moon
      const y0 = h * 0.86;
      b.cyl(0, y0, 0, r * 1.8, 0.035, HAT, { seg: 22 });
      b.cyl(0, y0 + 0.03, 0, r * 1.16, h * 0.13, GOLD, { seg: 18 });
      const A = [0, y0, 0], B = [0, h * 1.55, -r * 0.12], Cc = [r * 0.05, h * 2.05, -r * 0.42], D = [r * 0.1, h * 2.35, -r * 0.95], E = [r * 0.15, h * 2.32, -r * 1.5];
      frust(b, A, B, r * 1.12, r * 0.74, HAT); b.sphere(...B, r * 0.74, HAT);
      frust(b, B, Cc, r * 0.74, r * 0.46, HAT); b.sphere(...Cc, r * 0.46, HAT);
      frust(b, Cc, D, r * 0.46, r * 0.24, HAT); b.sphere(...D, r * 0.24, HAT);
      frust(b, D, E, r * 0.24, r * 0.02, HAT);
      for (const [a, yy, rr, zo, sz] of [[0.55, 1.12, 0.98, 0, 0.14], [-1.0, 1.3, 0.88, -0.08, 0.11], [2.2, 1.2, 0.95, 0, 0.12], [-2.4, 1.5, 0.8, -0.1, 0.1], [0.25, 1.78, 0.62, -0.25, 0.1], [1.4, 1.62, 0.7, -0.15, 0.09]]) {
        for (const q of [0, PI / 4]) rbox(b, Math.sin(a) * r * rr, h * yy, Math.cos(a) * r * rr + zo * r, r * sz, r * sz, r * 0.05, 0, a, q, GOLD);
      }
      // crescent moon on the front of the crown
      frust(b, [-r * 0.32, h * 1.3, r * 0.7], [-r * 0.32, h * 1.3, r * 0.8], r * 0.17, r * 0.17, 0xf2d470);
      frust(b, [-r * 0.24, h * 1.33, r * 0.72], [-r * 0.24, h * 1.33, r * 0.83], r * 0.14, r * 0.14, HAT);
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      // long beard down to the lap, tied near the end (in the torso so it hangs straight)
      b.add(taperGeo(0.14, 0.6, 0.66, 0.12, 0.2), plastic(BEARD), 0, 0.34 * s, 0.27 * s, 0, s, s, s);
      b.add(taperGeo(0.02, 0.14, 0.12, 0.08, 0.12), plastic(BEARD), 0, 0.22 * s, 0.27 * s, 0, s, s, s);
      b.box(0, 0.33 * s, 0.27 * s, 0.17 * s, 0.05 * s, 0.15 * s, GOLD);
      for (const x of [-0.06, 0.06]) rbox(b, x * s, 0.66 * s, 0.352 * s, 0.022 * s, 0.56 * s, 0.03 * s, 0.06, 0, -x * 1.4, 0xd6d9e0);
      // outer robe falling behind (gold hem), high collar at the back of the neck
      b.box(0, 0.18 * s, -0.27 * s, 1.0 * s, 0.8 * s, 0.07 * s, ROBE2);
      b.box(0, -0.12 * s, -0.27 * s, 1.0 * s, 0.3 * s, 0.07 * s, ROBE2);
      b.box(0, -0.12 * s, -0.31 * s, 1.01 * s, 0.06 * s, 0.02 * s, GOLD);
      // gold hem of the robe across the knees
      for (const sd of [-1, 1]) b.box(sd * 0.22 * s, 0.02 * s, 0.675 * s, 0.41 * s, 0.05 * s, 0.02 * s, GOLD);
    },
  });
  // the Elder Wand: grey-brown elder with knobbly nodes along it
  const { tip } = wand(rig, { color: 0x6e6152, knobs: 5, len: 0.52, handle: 0x5a4c3e });
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
// local: an ellipsoid turned rx/ry/rz (radii sx/sy/sz) and a cone from base a to tip c — the
// shaggy mane, beard, bulging pockets and wild strands are built from these
const hgSph = () => cached('hgSph', () => new THREE.SphereGeometry(1, 18, 12));
const hgCone = () => cached('hgCone', () => new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0));
const hgQ = new THREE.Quaternion(), hgE = new THREE.Euler(), hgUp = new THREE.Vector3(0, 1, 0);
function hgBlob(b, x, y, z, sx, sy, sz, mat, rx = 0, ry = 0, rz = 0) {
  hgQ.setFromEuler(hgE.set(rx, ry, rz));
  b.addMatrix(hgSph(), typeof mat === 'number' ? plastic(mat) : mat, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), hgQ, new THREE.Vector3(sx, sy, sz)));
}
function hgSpike(b, a, c, r, mat) {
  const A = new THREE.Vector3(...a), dir = new THREE.Vector3(...c).sub(A), len = dir.length();
  b.addMatrix(hgCone(), mat, new THREE.Matrix4().compose(A, hgQ.setFromUnitVectors(hgUp, dir.normalize()), new THREE.Vector3(r, len, r)));
}
// a solid wedge of a (tapered) cylinder facing +Z over ±th: the beard under the face
function hgShell(b, y0, r0, r1, h, th, mat) {
  const k = Math.round((r1 / r0) * 20) / 20, t = Math.round(th * 20) / 20;
  const geo = cached(`hgShell${k}|${t}`, () => new THREE.CylinderGeometry(k, 1, 1, 18, 1, false, -t, t * 2).translate(0, 0.5, 0));
  b.add(geo, mat, 0, y0, 0, 0, r0, h, r0);
}
function hagrid() {
  const HAIR = 0x1e1209, HAIR2 = 0x28180c, COAT = 0x5c3a20, COAT2 = 0x452c16, POCK = 0x6e4a2c, FLAP = 0x3e2614,
    BELT = 0x261a10, BRASS = 0xcaa040, SKN = 0xecb592, ROSY = 0xe9806e, NOSE = 0xdf9b7b, PINK = 0xf478b4;
  const HM = plastic(HAIR, { rough: 0.72 }), HM2 = plastic(HAIR2, { rough: 0.72 });
  const rig = fig({
    name: 'hagrid', s: 1.7, wide: 1.3, deep: 1.25, torso: COAT, arms: COAT, hips: COAT, legs: 0x33241a, skin: SKN, extraHeight: 0.55,
    // moleskin nap + a rusty waistcoat in the gap of the coat (the beard covers the top of it)
    front: decal('hagrid2', (P) => {
      P.poly([[40, 0], [88, 0], [80, 160], [48, 160]], '#7a3c1e');
      for (let y = 70; y < 150; y += 22) P.dot(64, y, 4.5, '#2a1a10');
      for (const x of [14, 24, 104, 114]) P.line([[x, 4], [x + (x < 64 ? 6 : -6), 156]], 'rgba(40,20,8,0.18)', 3);
    }),
    face: face('hagrid2', SKN, (P) => {
      P.g.fillStyle = '#2a1a0f'; P.g.fillRect(-230, 18, 460, 60); P.g.fillRect(-230, -70, 460, 26);   // beard + hairline roots
      P.cheeks('rgba(232,110,96,0.55)');
      for (const s of [-1, 1]) {
        // kind, crinkly beetle-black eyes
        P.ell(s * 23, -13, 8.5, 10, '#120b06'); P.ell(s * 23 + 3, -17, 2.6, 2.6, '#fff'); P.ell(s * 23 - 3, -9, 1.4, 1.4, '#fff');
        P.arc(s * 23, -14, 13, 0.2 * PI, 0.8 * PI, 'rgba(150,70,50,0.55)', 2.5);
        P.line([[s * 37, -16], [s * 46, -20]], 'rgba(150,70,50,0.6)', 2.5); P.line([[s * 37, -10], [s * 46, -8]], 'rgba(150,70,50,0.6)', 2.5);
      }
    }),
    hair: (b, r, h) => {
      // one big wild mane: back + sides + crown, shaggy lumps round the outline and the hairline
      hgBlob(b, 0, h * 0.56, -r * 0.25, r * 1.42, h * 0.92, r * 1.15, HM);
      hgBlob(b, 0, h * 1.0, -r * 0.06, r * 1.2, h * 0.42, r * 1.12, HM);
      for (let k = 0; k < 7; k++) {
        const a = -1.35 + (k / 6) * 2.7;
        hgBlob(b, S(a) * r * 1.12, h * 0.78 + Math.cos(a) * h * 0.6, -r * 0.18 - (k % 2) * r * 0.12, r * 0.44, h * 0.3, r * 0.62, k % 2 ? HM2 : HM, 0, 0, -a * 0.6);
      }
      for (const x of [-0.72, -0.36, 0, 0.36, 0.72]) hgBlob(b, x * r, h * 0.92, Math.sqrt(1 - x * x) * r * 0.86, r * 0.3, h * 0.13, r * 0.24, HM, 0, x * 0.9, 0);
      for (const sd of [-1, 1]) {
        hgBlob(b, sd * r * 0.97, h * 0.42, r * 0.1, r * 0.42, h * 0.6, r * 0.62, HM);
        hgBlob(b, sd * r * 1.25, h * 0.2, -r * 0.3, r * 0.42, h * 0.5, r * 0.62, HM2);
      }
      // ragged bangs hanging over the hairline
      for (const [x, l] of [[-0.62, 0.14], [-0.3, 0.1], [0.05, 0.13], [0.36, 0.09], [0.64, 0.14]]) {
        const z = Math.sqrt(1 - x * x) * r * 1.0;
        hgSpike(b, [x * r, h * 0.9, z], [x * r * 1.1, h * (0.86 - l), z + r * 0.06], r * 0.13, HM);
      }
      // wild strands sticking out all round
      for (let k = 0; k < 13; k++) {
        const a = -1.5 + (k / 12) * 3.0, back = (k % 3) * 0.3;
        const bx = S(a) * r * 1.1, by = h * 0.85 + Math.cos(a) * h * 0.55, bz = -r * (0.15 + back);
        const L = r * (0.32 + (k % 2) * 0.16);
        hgSpike(b, [bx, by, bz], [bx + S(a) * L, by + Math.cos(a) * L * 0.9, bz - L * 0.25], r * 0.15, k % 2 ? HM : HM2);
      }
      // the beard: a wedge under the face that billows out over the chest
      hgShell(b, -h * 0.2, r * 1.2, r * 1.06, h * 0.64, 1.75, HM);
      hgBlob(b, 0, -h * 0.2, r * 0.42, r * 1.08, h * 0.52, r * 0.88, HM);
      hgBlob(b, 0, -h * 0.55, r * 0.62, r * 0.75, h * 0.42, r * 0.6, HM);
      for (const [x, y, z, k] of [[-0.6, 0.18, 1.0, 0], [0.55, 0.12, 1.02, 1], [-0.25, -0.1, 1.2, 1], [0.3, -0.25, 1.14, 0], [0, 0.08, 1.2, 0], [-0.5, -0.4, 0.98, 1], [0.48, -0.5, 0.95, 1]]) {
        hgBlob(b, x * r, y * h, z * r * 0.97, r * 0.3, h * 0.15, r * 0.15, k ? HM2 : HM, 0, x * 0.8, 0);
      }
      for (const x of [-0.32, 0, 0.32]) hgSpike(b, [x * r, -h * 0.75, r * 0.62], [x * r * 1.3, -h * 1.02, r * 0.66], r * 0.2, HM);
      // drooping moustache over a little smile
      hgBlob(b, 0, h * 0.34, r * 1.08, r * 0.17, h * 0.05, r * 0.06, 0x8a3428);
      for (const sd of [-1, 1]) hgBlob(b, sd * r * 0.2, h * 0.41, r * 1.05, r * 0.3, h * 0.08, r * 0.16, HM2, 0, sd * 0.3, -sd * 0.2);
      // big round nose, rosy cheeks sitting on the beard, bushy brows
      hgBlob(b, 0, h * 0.53, r * 1.0, r * 0.24, h * 0.15, r * 0.22, NOSE);
      hgBlob(b, 0, h * 0.63, r * 0.96, r * 0.08, h * 0.08, r * 0.08, NOSE);
      for (const sd of [-1, 1]) {
        const a = sd * 0.55, b2 = sd * 0.33;
        hgBlob(b, S(a) * r * 0.97, h * 0.5, Math.cos(a) * r * 0.97, r * 0.17, h * 0.1, r * 0.09, ROSY, 0, a, 0);
        hgBlob(b, S(b2) * r * 1.0, h * 0.745, Math.cos(b2) * r * 1.0, r * 0.25, h * 0.065, r * 0.09, HM, 0, b2, -sd * 0.18);
      }
    },
    arm: (ab, sd, d) => {
      // turned-back coat cuffs and huge hands
      const s = d.s, w = Math.sqrt(d.W);
      ab.add(taperGeo(0.3, 0.29, 0.11, 0.31), plastic(COAT2), 0, -0.55 * s, 0, 0, s * w, s, s * w);
      ab.sphere(0, -0.67 * s, 0.01 * s, 0.135 * s, SKN, { sy: 1.05 });
      ab.sphere(-sd * 0.09 * s, -0.6 * s, 0.07 * s, 0.06 * s, SKN);
    },
    torsoExtra: (b, d) => {
      const s = d.s, W = d.W, D = d.D;
      const F = (y) => (0.23 - 0.02 * ((y / s - 0.18) / 0.82)) * s * D;   // front of the torso at height y
      // beard spilling down the chest
      hgBlob(b, 0, 0.7 * s, F(0.7 * s) - 0.02 * s, 0.3 * s, 0.24 * s, 0.13 * s, HM);
      hgBlob(b, 0, 0.47 * s, F(0.47 * s), 0.19 * s, 0.15 * s, 0.1 * s, HM);
      for (const [x, y] of [[-0.16, 0.62], [0.17, 0.66], [0.06, 0.52], [-0.08, 0.76]]) hgBlob(b, x * s, y * s, F(y * s) + 0.07 * s, 0.1 * s, 0.07 * s, 0.05 * s, HM2);
      for (const x of [-0.1, 0, 0.1]) hgSpike(b, [x * s, 0.44 * s, F(0.44 * s) + 0.04 * s], [x * 1.3 * s, 0.32 * s, F(0.32 * s) + 0.06 * s], 0.055 * s, x ? HM2 : HM);
      // wide coat lapels
      for (const sd of [-1, 1]) rbox(b, sd * 0.24 * s, 0.68 * s, F(0.68 * s) + 0.01 * s, 0.13 * s, 0.6 * s, 0.04 * s, 0, 0, sd * 0.2, COAT2);
      // belt with a brass buckle
      b.box(0, 0.2 * s, 0, 0.92 * s * W + 0.02, 0.1 * s, 0.47 * s * D + 0.02, BELT);
      b.box(0, 0.19 * s, F(0.2 * s) + 0.005, 0.15 * s, 0.12 * s, 0.03 * s, BRASS);
      b.box(0, 0.215 * s, F(0.2 * s) + 0.02, 0.08 * s, 0.05 * s, 0.02 * s, BELT);
      // lots of bulging pockets with flaps
      for (const sd of [-1, 1]) {
        for (const [x, y, w, hh] of [[0.36, 0.42, 0.13, 0.11], [0.37, 0.72, 0.1, 0.08]]) {
          const z = F(y * s);
          hgBlob(b, sd * x * s, y * s, z, w * s, hh * s, 0.06 * s, POCK);
          rbox(b, sd * x * s, (y + hh * 0.75) * s, z + 0.03 * s, w * 2.05 * s, hh * 0.55 * s, 0.05 * s, 0.2, 0, 0, FLAP);
          b.sphere(sd * x * s, (y + hh * 0.55) * s, z + 0.065 * s, 0.025 * s, BRASS);
        }
        hgBlob(b, sd * 0.5 * s * W, 0.42 * s, 0.02 * s, 0.07 * s, 0.12 * s, 0.13 * s, POCK);   // side pockets
      }
      // coat skirt over the knees
      for (const sd of [-1, 1]) b.box(sd * 0.22 * s * W, 0.04 * s, 0.32 * s, 0.42 * s * W, 0.05 * s, 0.66 * s, COAT2);
    },
  });
  // the pink umbrella (with a broken wand hidden inside)
  const um = new THREE.Group(); um.position.set(0, handY(rig), 0.01); um.rotation.x = -0.5; rig.armR.add(um);
  const ub = new BrickBuilder(1);
  rod(ub, [0, 0.05, 0], [0, -0.95, 0], 0.018, 0x7a5a3a, 6);
  ub.add(taperGeo(0.05, 0.17, 0.58, 0.17), plastic(PINK), 0, -0.86, 0, 0, 1, 1, 1);
  ub.cyl(0, -0.55, 0, 0.07, 0.04, 0xd85a98, { seg: 10 });
  rod(ub, [0, 0.05, 0], [0, 0.13, 0.09], 0.024, 0x7a5a3a, 6);
  um.add(ub.build({ name: 'umbrella' }));
  const tip = new THREE.Group(); tip.position.y = -0.95; um.add(tip);
  const fire = [0, 1, 2].map((k) => { const g = burst(rig.root, [0xff70c0, 0xffd040, 0x80d0ff][k], 12, 0.6, 3 + k * 4); return g; });
  rig.fx = spells(rig, {
    tip, color: 0xff70c0, len: 2.2,
    extra: (n, f, t) => {
      const win = n === 'win';
      fire.forEach((g, k) => {
        const p = ((t * 0.9 + k / 3) % 1);
        const on = win && p > 0.15;
        vis(g, on);
        if (on) { g.position.set((k - 1) * 1.1, 3.2 + k * 0.4, 0.6 - k * 0.3); g.scale.setScalar(sm(seg(p, 0.15, 0.5)) * (1 - seg(p, 0.85, 1))); g.rotation.y = t; }
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

// ---- Lord Voldemort ----------------------------------------------------------------------------------
function voldemort() {
  const PALE2 = 0xcfd3cb, BLK = 0x121216, FOLD = 0x24242c, SN = 0x56663e, SN2 = 0x2f3a24, BELLY = 0xa8a676;
  const rig = fig({
    name: 'voldemort', wide: 0.94, headH: 0.5, torso: BLK, arms: BLK, hips: BLK, legs: BLK, skin: PALE2, extraHeight: 0.12,
    // layered, wrapped black robes: a deep V over a dark grey under-robe, fold lines
    front: decal('voldemort2', (P) => {
      P.poly([[40, 0], [88, 0], [64, 62]], '#2a2a32');
      P.line([[40, 0], [64, 62], [88, 0]], '#3a3a46', 3);
      P.poly([[18, 0], [40, 0], [64, 62], [70, 160], [56, 160]], '#18181e');
      for (const [a, b2] of [[[26, 30], [46, 160]], [[100, 30], [84, 160]], [[14, 60], [28, 160]], [[114, 60], [104, 160]], [[64, 70], [66, 160]]]) P.line([a, b2], 'rgba(70,72,86,0.9)', 3);
    }),
    face: face('voldemort2', PALE2, (P) => {
      // sunken, shadowed eye sockets and cheeks; snake-slit nose; thin bloodless lips; temple veins
      for (const s of [-1, 1]) {
        P.ell(s * 24, -7, 19, 13, 'rgba(110,110,140,0.35)');
        P.ell(s * 40, 24, 10, 16, 'rgba(120,120,140,0.1)');
        P.ell(s * 24, -7, 11, 6.5, '#e01818', s * 0.2);
        P.ell(s * 24, -7, 1.8, 5.6, '#160000');
        P.ell(s * 27, -9, 1.6, 1.4, 'rgba(255,220,220,0.9)');
        P.line([[s * 12, -10], [s * 24, -15], [s * 36, -10]], '#3a2a34', 3);       // upper lid
        P.line([[s * 10, -22], [s * 38, -26]], 'rgba(120,120,150,0.45)', 3);       // bare brow ridge
      }
      P.poly([[-10, -2], [10, -2], [6, 14], [-6, 14]], 'rgba(150,150,160,0.25)');   // flat nose
      for (const s of [-1, 1]) P.line([[s * 3, 6], [s * 8, 13]], '#4a2a34', 3.5);   // nostril slits
      P.line([[-20, 28], [-8, 26], [8, 26], [20, 29]], '#7a6a78', 3.5);
      P.line([[-8, 30], [8, 30]], 'rgba(120,100,120,0.4)', 2);
      P.line([[-46, -46], [-38, -34], [-42, -22], [-36, -12]], 'rgba(90,120,170,0.6)', 2);
      P.line([[48, -42], [40, -28], [44, -16]], 'rgba(90,120,170,0.6)', 2);
      P.line([[-6, -56], [-2, -44], [-8, -34]], 'rgba(90,120,170,0.35)', 2);
    }),
    // bald, domed skull
    hair: (b, r, h) => { b.sphere(0, h + 0.005, 0, r * 1.0, PALE2, { sy: 0.55 }); },
    arm: (ab, sd, d) => {
      // long flowing sleeves that drape below the wrist
      const s = d.s;
      ab.add(taperGeo(0.34, 0.25, 0.26, 0.32, 0.26), plastic(BLK), 0, -0.6 * s, 0, 0, s, s, s);
      rbox(ab, 0, -0.66 * s, -0.08 * s, 0.3 * s, 0.22 * s, 0.05 * s, 0.25, 0, 0, BLK);
      ab.add(taperGeo(0.35, 0.34, 0.03, 0.33), plastic(FOLD), 0, -0.6 * s, 0, 0, s, s, s);
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      // flowing outer robe behind, split into an upper part and a ragged lower hem
      b.box(0, 0.18 * s, -0.26 * s, 1.0 * s, 0.8 * s, 0.06 * s, BLK);
      b.box(0, -0.16 * s, -0.27 * s, 1.0 * s, 0.34 * s, 0.06 * s, BLK);
      for (let k = 0; k < 5; k++) rbox(b, (-0.4 + k * 0.2) * s, -0.2 * s, -0.27 * s, 0.13 * s, 0.13 * s, 0.05 * s, 0, 0, PI / 4, BLK);
      // tall layered collar standing up behind the head
      b.add(taperGeo(0.56, 0.86, 0.36, 0.12), plastic(BLK), 0, 0.84 * s, -0.22 * s, 0, s, s, s);
      for (const sd of [-1, 1]) {
        rbox(b, sd * 0.28 * s, 1.0 * s, -0.08 * s, 0.05 * s, 0.32 * s, 0.32 * s, 0, sd * 0.35, -sd * 0.3, BLK);
        rbox(b, sd * 0.31 * s, 0.98 * s, -0.06 * s, 0.02 * s, 0.24 * s, 0.26 * s, 0, sd * 0.35, -sd * 0.3, FOLD);
      }
      // Nagini coiled round his shoulders: tail down his right side, head reared on his left shoulder
      const pts = [];
      for (let k = 0; k <= 4; k++) { const u = k / 4; pts.push([lerp(-0.12, -0.33, u) * s, lerp(0.42, 0.95, u) * s, lerp(0.27, 0.24, u) * s]); }
      const N = 22;
      for (let k = 1; k <= N; k++) {
        const th = lerp(-0.85, -2 * PI + 0.85, k / N);
        pts.push([S(th) * 0.47 * s, (0.9 + 0.18 * abs(S(th))) * s, Math.cos(th) * 0.36 * s]);
      }
      pts.push([0.42 * s, 1.1 * s, 0.32 * s], [0.44 * s, 1.17 * s, 0.4 * s]);
      tube(b, pts, (u) => (0.022 + 0.05 * Math.min(1, u * 2.2) - 0.012 * sm(seg(u, 0.85, 1))) * s, (i) => (i % 3 === 0 ? SN2 : SN));
      // head: flat diamond skull, pale jaw, yellow eyes, flicking forked tongue
      const hx = 0.44 * s, hy = 1.18 * s, hz = 0.45 * s;
      b.sphere(hx, hy, hz, 0.08 * s, SN, { sy: 0.55 });
      b.sphere(hx, hy - 0.005 * s, hz + 0.07 * s, 0.06 * s, SN, { sy: 0.5 });
      b.sphere(hx, hy - 0.02 * s, hz + 0.03 * s, 0.07 * s, BELLY, { sy: 0.4 });
      for (const sd of [-1, 1]) b.sphere(hx + sd * 0.055 * s, hy + 0.02 * s, hz + 0.05 * s, 0.017 * s, 0xf0d020);
      rod(b, [hx, hy - 0.01 * s, hz + 0.12 * s], [hx, hy - 0.015 * s, hz + 0.19 * s], 0.006 * s, 0xc01818, 4);
      for (const sd of [-1, 1]) rod(b, [hx, hy - 0.015 * s, hz + 0.19 * s], [hx + sd * 0.02 * s, hy - 0.02 * s, hz + 0.23 * s], 0.005 * s, 0xc01818, 4);
    },
  });
  // his bone-white yew wand with the hooked, claw-like handle
  const { tip } = wand(rig, { color: 0xeee6d0, hook: true, knobs: 3, len: 0.5, handle: 0xd8ccb0 });
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
