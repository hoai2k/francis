// Jurassic World drivers (Use Characters): the park's humans as seated minifigs and a
// herd of brick dinosaurs (builders in ./jurassic-dinos.js), each with signature
// Mario Kart-style gestures: Owen's raptor "hold", Claire's flare, Grant's hat wave,
// Malcolm's laugh, Hammond's amber cane, roars, frills, sneezes, honks and tail swings.
import { THREE, BrickBuilder, C, plastic, seatedFig, faceMat, rbox, cached } from './kit.js';
import { bigTheropod, smallTheropod, triceratopsDriver, stegosaurusDriver, pteranodonDriver, brachiosaurusDriver, parasaurolophusDriver, RAPTORS } from './jurassic-dinos.js';

const S = Math.sin, A = Math.abs, PI = Math.PI;
const UP = -2.75;
const SKIN = 0xf3d2b3, SKIN2 = 0xf6dcc4;
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// ---- faces ------------------------------------------------------------------------
function jwFace(key, o, skin = SKIN) {
  return faceMat('jw-' + key, (g) => {
    const y = 58;
    if (o.stubble) { g.fillStyle = 'rgba(80,55,35,0.28)'; g.beginPath(); g.ellipse(128, y + 30, 42, 24, 0, 0, PI * 2); g.fill(); }
    if (o.beard) {
      g.fillStyle = o.beard;
      g.beginPath(); g.moveTo(92, y + 4); g.quadraticCurveTo(96, y + 66, 128, y + 70); g.quadraticCurveTo(160, y + 66, 164, y + 4);
      g.quadraticCurveTo(150, y + 20, 128, y + 14); g.quadraticCurveTo(106, y + 20, 92, y + 4); g.fill();
    }
    if (o.blush) { g.fillStyle = 'rgba(240,120,110,0.35)'; for (const s of [-1, 1]) { g.beginPath(); g.arc(128 + s * 30, y + 14, 8, 0, PI * 2); g.fill(); } }
    // eyes
    g.fillStyle = '#1b1b1b';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(128 + s * 16, y, 5, 7, 0, 0, PI * 2); g.fill(); }
    g.fillStyle = '#fff';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(128 + s * 16 + 2, y - 3, 1.8, 0, PI * 2); g.fill(); }
    if (o.lashes) { g.strokeStyle = '#1b1b1b'; g.lineWidth = 2.5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 20, y - 5); g.lineTo(128 + s * 26, y - 9); g.stroke(); } }
    // brows
    g.strokeStyle = o.brow || '#3a2a1a'; g.lineWidth = o.browW || 4; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 8, y - 14 + (o.frown ? 3 : 0)); g.lineTo(128 + s * 24, y - 17 - (o.frown ? 2 : 0)); g.stroke(); }
    if (o.shades) {
      g.fillStyle = '#111';
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(128 + s * 17, y + 1, 13, 10, 0, 0, PI * 2); g.fill(); }
      g.fillRect(118, y - 6, 20, 4);
      g.fillStyle = 'rgba(160,190,220,0.6)'; for (const s of [-1, 1]) g.fillRect(128 + s * 17 - 6, y - 4, 5, 3);
    }
    if (o.specs) { g.strokeStyle = '#6a5a3a'; g.lineWidth = 2.5; for (const s of [-1, 1]) { g.beginPath(); g.arc(128 + s * 16, y, 10, 0, PI * 2); g.stroke(); } g.beginPath(); g.moveTo(122, y); g.lineTo(134, y); g.stroke(); }
    // mouth
    const my = y + 24;
    g.strokeStyle = o.lips ? '#c0282a' : '#1b1b1b'; g.lineWidth = o.lips ? 5 : 4;
    g.beginPath();
    if (o.mouth === 'grin') { g.fillStyle = '#fff'; g.moveTo(112, my - 4); g.quadraticCurveTo(128, my + 16, 144, my - 4); g.closePath(); g.fill(); g.stroke(); }
    else if (o.mouth === 'smirk') { g.moveTo(114, my); g.quadraticCurveTo(132, my + 5, 144, my - 6); g.stroke(); }
    else { g.arc(128, my - 12, 15, 0.25 * PI, 0.75 * PI); g.stroke(); }
    if (o.mustache) { g.fillStyle = o.mustache; g.beginPath(); g.ellipse(128, my - 8, 20, 6, 0, 0, PI * 2); g.fill(); }
  }, hex(skin));
}

// ---- hair and hats (head builder, head frame: y 0 = chin, y = headH = top) ----------
// partial cylinder shell for hair that wraps the back and sides of the head
const backGeo = (arc) => cached('jwback' + arc, () => new THREE.CylinderGeometry(1, 1, 1, 18, 1, false, PI - arc / 2, arc).translate(0, 0.5, 0));
function hairCap(hb, d, col, o = {}) {
  const R = d.headR, H = d.headH;
  hb.sphere(0, H * (o.capY ?? 0.86), -0.03 * d.s, R * (o.capR ?? 1.08), col, { sy: o.capSy ?? 0.52 });
  hb.add(backGeo(o.arc ?? PI * 1.25), plastic(col), 0, H * (o.backY ?? 0.38), 0, 0, R * (o.backR ?? 1.07), H * (o.backH ?? 0.52), R * (o.backR ?? 1.07));
}
function hat(hb, d, col, band, brim = 1.8) {
  const R = d.headR, H = d.headH;
  hb.cyl(0, H * 0.84, 0, R * brim, 0.05 * d.s, col, { seg: 20 });
  hb.cyl(0, H * 0.86, 0, R * 1.04, 0.3 * d.s, col, { seg: 18 });
  hb.cyl(0, H * 0.88, 0, R * 1.06, 0.07 * d.s, band, { seg: 18 });
  hb.sphere(0, H * 0.86 + 0.3 * d.s, 0, R * 1.0, col, { sy: 0.22 });
}

// a separate group for props shown only during some gestures
function propGroup(parent, fn, name, x = 0, y = 0, z = 0) {
  const b = new BrickBuilder(1);
  fn(b);
  const g = b.build({ name, shadows: false });
  g.position.set(x, y, z);
  parent.add(g);
  g.visible = false;
  return g;
}
const showFor = (name, f, list, a = 0.08, b = 0.92) => list.includes(name) && (name === 'win' || (f > a && f < b));

// ---- humans ------------------------------------------------------------------------
function owen() {
  const VEST = 0x4a3322, SHIRT = 0xb59f70;
  return seatedFig({
    name: 'owen', torso: VEST, arms: SHIRT, legs: 0x2a3a5a, skin: SKIN, noStud: true,
    face: jwFace('owen', { stubble: true, mouth: 'smirk', brow: '#4a3220' }),
    torsoExtra: (b, d) => {
      const s = d.s;
      rbox(b, 0, d.chestY + 0.4 * s, 0.226 * s, 0.24 * s, 0.8 * s, 0.03, -0.025, 0, 0, SHIRT);
      rbox(b, 0, d.chestY + 0.74 * s, 0.205 * s, 0.1 * s, 0.14 * s, 0.035, -0.025, 0, 0, SKIN);
      for (const sd of [-1, 1]) rbox(b, sd * 0.24 * s, d.chestY + 0.45 * s, 0.234 * s, 0.14 * s, 0.12 * s, 0.03, -0.025, 0, 0, 0x2e2014);
    },
    headExtra: (hb, d) => hairCap(hb, d, 0x5a3c22, { capSy: 0.45, capY: 0.88, backH: 0.45, backY: 0.45 }),
  });
}
function claire() {
  const rig = seatedFig({
    name: 'claire', torso: C.white, arms: C.white, legs: 0xe8e2d6, skin: SKIN2, noStud: true,
    face: jwFace('claire', { lips: true, lashes: true, blush: true, brow: '#9a3a18', browW: 3 }, SKIN2),
    torsoExtra: (b, d) => {
      const s = d.s;
      rbox(b, 0, d.chestY + 0.06 * s, 0.234 * s, 0.9 * s, 0.07 * s, 0.03, -0.025, 0, 0, 0x8a6a4a);
      rbox(b, 0, d.chestY + 0.72 * s, 0.208 * s, 0.14 * s, 0.16 * s, 0.03, -0.025, 0, PI / 4, SKIN2);
    },
    headExtra: (hb, d) => {
      const HAIR = 0xb5441e;
      hairCap(hb, d, HAIR, { capR: 1.12, capSy: 0.5, arc: PI * 1.42, backY: 0.12, backH: 0.8, backR: 1.13 });
      rbox(hb, 0.1 * d.s, d.headH * 0.9, d.headR * 0.62, d.headR * 1.3, 0.1 * d.s, 0.16 * d.s, 0.25, 0, -0.35, HAIR);
    },
  });
  // the red flare she lights to lead the T. rex away
  const flare = propGroup(rig.armR, (b) => {
    b.cyl(0, -1.25, 0, 0.055, 0.55, C.red, { seg: 8 });
    b.cyl(0, -1.32, 0, 0.06, 0.08, 0xffe0a0, { seg: 8, matOpts: { emissive: 0xffd080, emissiveIntensity: 2 } });
  }, 'claire-flare');
  const flame = propGroup(flare, (b) => {
    b.sphere(0, 0, 0, 0.12, 0xff5a2a, { matOpts: { emissive: 0xff3010, emissiveIntensity: 3 } });
    b.cone(0, -0.3, 0, 0.09, 0.32, 0xffb040, { seg: 8, matOpts: { emissive: 0xff8020, emissiveIntensity: 3 } });
  }, 'claire-flame', 0, -1.38, 0);
  flame.rotation.x = PI; flame.visible = true;
  rig.fx = (name, f, t) => {
    flare.visible = showFor(name, f, ['cheer', 'win', 'use']);
    if (flare.visible) flame.scale.setScalar(1 + S(t * 37) * 0.15 + S(t * 23) * 0.1);
  };
  return rig;
}
function grant() {
  const HAT = 0xc8a46a, BAND = 0x5a3a22, BEARD = 0x9a7448;
  const rig = seatedFig({
    name: 'grant', torso: 0x6e8fb8, arms: 0x6e8fb8, legs: 0xb8a47a, skin: SKIN, noStud: true,
    face: jwFace('grant', { beard: hex(BEARD), mouth: 'smile', brow: '#7a5a34', frown: true }),
    torsoExtra: (b, d) => {
      const s = d.s;
      rbox(b, 0, d.chestY + 0.72 * s, 0.215 * s, 0.24 * s, 0.24 * s, 0.05, -0.025, 0, PI / 4, C.red);
      rbox(b, 0, d.chestY + 0.81 * s, 0, 0.62 * s, 0.08 * s, 0.38 * s, 0, 0, 0, C.red);
      for (const sd of [-1, 1]) rbox(b, sd * 0.22 * s, d.chestY + 0.5 * s, 0.232 * s, 0.18 * s, 0.14 * s, 0.03, -0.025, 0, 0, 0x5a7aa0);
    },
    headExtra: (hb, d) => hairCap(hb, d, 0xa8844e, { capSy: 0.3, capY: 0.7, backH: 0.42, backY: 0.3 }),
  });
  const d = rig.dims;
  const headHat = propGroup(rig.head, (b) => hat(b, d, HAT, BAND), 'grant-hat');
  headHat.visible = true;
  // the same hat held up in his hand (upside down in the arm frame = upright when raised)
  const handHat = propGroup(rig.armR, (b) => hat(b, d, HAT, BAND), 'grant-hat-hand', 0, -0.62, 0);
  handHat.rotation.set(PI, 0, 0);
  rig.fx = (name, f) => {
    const off = showFor(name, f, ['cheer', 'win'], 0.12, 0.88);
    headHat.visible = !off; handHat.visible = off;
  };
  return rig;
}
function malcolm() {
  return seatedFig({
    name: 'malcolm', torso: 0x1e1e1e, arms: 0x1e1e1e, legs: 0x1e1e1e, skin: SKIN, noStud: true,
    face: jwFace('malcolm', { shades: true, stubble: true, mouth: 'smirk', brow: '#111' }),
    torsoExtra: (b, d) => {
      const s = d.s;
      rbox(b, 0, d.chestY + 0.66 * s, 0.212 * s, 0.2 * s, 0.24 * s, 0.03, -0.025, 0, PI / 4, SKIN);
      for (const sd of [-1, 1]) rbox(b, sd * 0.17 * s, d.chestY + 0.55 * s, 0.226 * s, 0.07 * s, 0.5 * s, 0.03, -0.025, 0, sd * 0.35, 0x3a3a3a);
    },
    headExtra: (hb, d) => {
      const H = d.headH, R = d.headR, K = 0x151515;
      hairCap(hb, d, K, { capSy: 0.55, capR: 1.1, backH: 0.55, backY: 0.35 });
      for (let i = 0; i < 7; i++) { const a = -1.4 + i * 0.47; hb.sphere(S(a) * R * 0.85, H * 0.95 + Math.cos(a * 1.3) * 0.04, Math.cos(a) * R * 0.5 - 0.06, R * 0.32, K); }
      for (const sd of [-1, 1]) hb.sphere(sd * R * 0.95, H * 0.7, -R * 0.1, R * 0.3, K);
    },
  });
}
function hammond() {
  const SUIT = 0xf2eee2, HAT = 0xeee4c4;
  const rig = seatedFig({
    name: 'hammond', torso: SUIT, arms: SUIT, legs: SUIT, skin: SKIN2, noStud: true, wide: 1.08,
    face: jwFace('hammond', { beard: '#f0f0f0', mustache: '#f4f4f4', specs: true, brow: '#e8e8e8', mouth: 'grin' }, SKIN2),
    torsoExtra: (b, d) => {
      const s = d.s;
      rbox(b, 0, d.chestY + 0.62 * s, 0.218 * s, 0.24 * s, 0.32 * s, 0.03, -0.025, 0, PI / 4, 0xb8d0e8);
      rbox(b, 0, d.chestY + 0.62 * s, 0.234 * s, 0.05 * s, 0.3 * s, 0.03, -0.025, 0, 0, 0x5a3a22);
      rbox(b, 0.26 * s, d.chestY + 0.62 * s, 0.234 * s, 0.12 * s, 0.05 * s, 0.03, -0.025, 0, 0, C.red);
    },
    headExtra: (hb, d) => {
      hairCap(hb, d, 0xf4f4f4, { capSy: 0.3, capY: 0.7, backH: 0.45, backY: 0.28 });
      hat(hb, d, HAT, 0x6a4a2a, 1.65);
    },
  });
  // the walking cane with the mosquito in amber
  const cane = propGroup(rig.armR, (b) => {
    b.cyl(0, -1.58, 0, 0.04, 0.95, 0x4a2e1a, { seg: 8 });
    b.cyl(0, -1.62, 0, 0.065, 0.06, C.gold, { seg: 10, matOpts: { metal: 0.8, rough: 0.3 } });
    b.sphere(0, -1.72, 0, 0.12, 0xffa020, { matOpts: { emissive: 0xff8a00, emissiveIntensity: 1.1, rough: 0.15 } });
  }, 'hammond-cane');
  rig.fx = (name, f, t) => {
    cane.visible = showFor(name, f, ['cheer', 'win', 'use', 'pre']);
  };
  return rig;
}

// ---- gestures --------------------------------------------------------------------
const G = {
  // Owen: the raptor-trainer "hold" — palms out, easy, easy
  owenHold: (f, t) => ({ lx: -1.5 + S(t * 6) * 0.07, rx: -1.5 + S(t * 6 + 0.6) * 0.07, lz: 0.3, rz: -0.3, tx: -0.1, hx: 0.08 + S(t * 6) * 0.08, hy: S(t * 2.2) * 0.18, by: 0 }),
  owenTaunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.2, ty: a.tauntSide * 0.4, [a.tauntSide > 0 ? 'lx' : 'rx']: -1.55, [a.tauntSide > 0 ? 'lz' : 'rz']: a.tauntSide * 0.55, hx: 0.06 + S(t * 7) * 0.06 }),
  owenWin: (f, t) => (f < 0.5 ? { rx: UP + S(t * 14) * 0.35, rz: -0.2, lx: -0.6, hx: -0.25, by: A(S(t * 14)) * 0.06 } : { lx: -1.5, rx: -1.5, lz: 0.3, rz: -0.3, hx: 0.1, tx: -0.08 }),
  // Claire: thrusts the lit flare overhead
  claireFlare: (f, t) => ({ rx: -2.85 + S(t * 9) * 0.12, rz: -0.15, hx: -0.3, hy: -0.25, tx: -0.08, lz: -0.1, by: A(S(t * 9)) * 0.04 }),
  claireWin: (f, t) => ({ rx: -2.6, rz: -0.25 + S(t * 4) * 0.55, lx: -1.0, lz: 0.4, hx: -0.25, hy: S(t * 4) * -0.25 }),
  // Grant: hat off, waving it in awe
  grantHat: (f, t) => ({ rx: -2.6, rz: -0.35 + S(t * 9) * 0.35, hx: -0.3, hy: -0.2, tx: -0.08, by: A(S(t * 9)) * 0.04 }),
  // Malcolm: leans back with that laugh — "life, uh, finds a way"
  malcolmLaugh: (f, t) => ({ lx: -0.7, rx: -0.7, lz: 1.0, rz: -1.0, tx: -0.24, ty: S(t * 3) * 0.12, hx: -0.45 + A(S(t * 16)) * 0.18, hz: S(t * 3) * 0.1, by: A(S(t * 16)) * 0.05 }),
  malcolmTaunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.1, ty: a.tauntSide * 0.35, [a.tauntSide > 0 ? 'lx' : 'rx']: -1.7, [a.tauntSide > 0 ? 'lz' : 'rz']: a.tauntSide * 0.15, hx: -0.15 + A(S(t * 16)) * 0.12, by: A(S(t * 16)) * 0.04 }),
  // Hammond: the amber-topped cane held high; arms open for the welcome on a win
  hammondCane: (f, t) => ({ rx: -2.7 + S(t * 6) * 0.12, rz: -0.12, hx: -0.2, tx: -0.08, by: A(S(t * 12)) * 0.05 }),
  hammondWelcome: (f, t) => ({ lx: -1.7, rx: -2.5, lz: 1.0, rz: -0.6, hx: -0.15 + S(t * 4) * 0.06, tx: -0.12, hy: S(t * 2) * 0.3 }),
  // big theropod roar: head up, jaw wide, body shaking, tiny arms flailing
  roar: (f, t) => ({ hx: -0.55, hy: S(t * 3) * 0.2, jaw: 1, tx: -0.14, tz: S(t * 45) * 0.03, by: S(f * PI) * 0.06, lx: -1.3 + S(t * 22) * 0.6, rx: -1.3 - S(t * 22) * 0.6, lz: 0.4, rz: -0.4 }),
  roarWin: (f, t) => ({ hx: -0.45 - S(t * 4) * 0.15, jaw: 0.6 + S(t * 4) * 0.4, tx: -0.12, tz: S(t * 40) * 0.025, lx: -1.3 + S(t * 18) * 0.5, rx: -1.3 - S(t * 18) * 0.5, lz: 0.4, rz: -0.4, hy: S(t * 1.5) * 0.4 }),
  snap: (f, t, rig, a) => ({ hy: a.tauntSide * 1.1, ty: a.tauntSide * 0.3, hx: -0.12, jaw: A(S(t * 13)) }),
  // Indominus: claw swipe, then the roar
  swipe: (f, t) => (f < 0.45
    ? { rx: -2.6 + (f / 0.45) * 2.2, rz: -0.9 + (f / 0.45) * 1.0, lx: -1.5, lz: 0.4, ty: 0.35 - (f / 0.45) * 0.7, hx: -0.15, jaw: 0.4 }
    : { hx: -0.6, jaw: 1, lx: -2.0, rx: -2.0, lz: 0.6, rz: -0.6, tx: -0.15, tz: S(t * 40) * 0.03, ty: -0.1 }),
  // Spinosaurus: both clawed arms raised, roaring
  spinoRoar: (f, t) => ({ lx: -2.3 + S(t * 10) * 0.15, rx: -2.3 - S(t * 10) * 0.15, lz: 0.7, rz: -0.7, hx: -0.5, jaw: 1, tx: -0.12, tz: S(t * 40) * 0.03, by: S(f * PI) * 0.05 }),
  // raptors: chirping head tilts and claw flexes
  chirp: (f, t) => ({ hz: S(t * 10) * 0.35, hx: -0.25, hy: S(t * 5) * 0.4, jaw: A(S(t * 18)), by: A(S(t * 10)) * 0.05, lx: -1.7, rx: -1.7, lz: 0.45 + S(t * 18) * 0.2, rz: -0.45 - S(t * 18) * 0.2 }),
  curious: (f, t, rig, a) => ({ hy: a.tauntSide * 1.2, hz: a.tauntSide * 0.45, hx: -0.1, ty: a.tauntSide * 0.25, jaw: 0.25 + A(S(t * 9)) * 0.3 }),
  hiss: (f, t) => ({ tx: 0.28 * S(f * PI), hx: -0.1, jaw: 1, lx: -1.9, rx: -1.9, lz: 0.7, rz: -0.7, hz: S(t * 30) * 0.05 }),
  // Dilophosaurus: frill out, rear back, spit
  spit: (f, t) => ({ hx: f < 0.38 ? -0.4 : 0.18, jaw: f < 0.3 ? 0.35 : 1, tx: f < 0.38 ? -0.15 : 0.15, lx: -1.5, rx: -1.5, lz: 0.4, rz: -0.4, hz: S(t * 30) * 0.05 }),
  rattle: (f, t, rig, a) => ({ hy: a.tauntSide * 1.0, ty: a.tauntSide * 0.3, hz: S(t * 30) * 0.08, jaw: 0.7, hx: -0.15 }),
  // Triceratops: head-down charge (twice)
  headbutt: (f, t) => { const p = Math.max(0, S(f * PI * 3)); return { tx: 0.3 * p, hx: 0.35 * p - 0.1, jaw: 0.5, by: p * 0.04, lx: -1.3 - p * 0.4, rx: -1.3 - p * 0.4 }; },
  stomp: (f, t) => ({ lx: -1.5 + S(t * 8) * 0.55, rx: -1.5 - S(t * 8) * 0.55, hx: -0.2 + S(t * 8) * 0.15, jaw: 0.5 + S(t * 4) * 0.4, by: A(S(t * 8)) * 0.05 }),
  hornShake: (f, t, rig, a) => ({ hy: a.tauntSide * 0.8 + S(t * 12) * 0.35, ty: a.tauntSide * 0.25, hx: 0.1, jaw: 0.4 }),
  // Stegosaurus: twist into the thagomizer swing (tail motion in its fx)
  tailSwing: (f, t) => ({ ty: S(f * PI * 2) * -0.4, tz: S(f * PI * 2) * 0.08, hx: -0.15, jaw: 0.6, hy: S(f * PI * 2) * 0.5 }),
  // Pteranodon: wing flaps and a screech
  flap: (f, t) => ({ lx: -1.2 + S(t * 14) * 0.45, rx: -1.2 + S(t * 14) * 0.45, lz: 1.35 + S(t * 14) * 0.4, rz: -1.35 - S(t * 14) * 0.4, hx: -0.45, jaw: 0.8 + S(t * 20) * 0.2, by: 0.08 + S(t * 14) * 0.05 }),
  flapWin: (f, t) => ({ lx: -1.2 + S(t * 9) * 0.45, rx: -1.2 + S(t * 9) * 0.45, lz: 1.35 + S(t * 9) * 0.45, rz: -1.35 - S(t * 9) * 0.45, hx: -0.3, jaw: A(S(t * 4)) * 0.8, by: 0.06 + S(t * 9) * 0.05 }),
  // Brachiosaurus: aaah... CHOO
  sneeze: (f, t) => (f < 0.42
    ? { hx: -0.22 * (f / 0.42), tx: -0.12 * (f / 0.42), jaw: 0.3 * (f / 0.42), lx: -1.0, rx: -1.0 }
    : { hx: 0.28 - (f - 0.42) * 0.3, tx: 0.12, jaw: 0.8, by: 0.04 * S((f - 0.42) * 30), lx: -1.0, rx: -1.0 }),
  neckSway: (f, t) => ({ hy: S(t * 2.4) * 0.45, hz: S(t * 2.4) * 0.12, jaw: 0.3 + A(S(t * 2.4)) * 0.3, lx: -1.4 + S(t * 4.8) * 0.3, rx: -1.4 - S(t * 4.8) * 0.3, by: A(S(t * 4.8)) * 0.03 }),
  // Parasaurolophus: head up, honk!
  honk: (f, t) => ({ hx: -0.5, jaw: 0.35 + A(S(t * 6)) * 0.5, tx: -0.1, lx: -1.8, rx: -1.8, lz: 0.3 + A(S(t * 12)) * 0.3, rz: -0.3 - A(S(t * 12)) * 0.3, by: A(S(t * 6)) * 0.04 }),
};

const raptorRig = (c) => () => smallTheropod(c);

export default [
  {
    id: 'owen', name: 'Owen Grady', blurb: 'Raptor whisperer', weight: 'medium', color: 0xb59f70,
    voice: { kind: 'human', pitch: 0.92 }, style: { cheer: 'fist', trick: 'twist' },
    gestures: { cheer: G.owenHold, taunt: G.owenTaunt, win: G.owenWin },
    build: owen,
  },
  {
    id: 'claire', name: 'Claire Dearing', blurb: 'Runs the park in heels', weight: 'light', color: 0xd8501e,
    voice: { kind: 'human', pitch: 1.35 }, style: { cheer: 'wave', trick: 'arms' },
    gestures: { cheer: G.claireFlare, win: G.claireWin, use: G.claireFlare },
    build: claire,
  },
  {
    id: 'grant', name: 'Dr. Alan Grant', blurb: 'Raptor-claw paleontologist', weight: 'medium', color: 0x6e8fb8,
    voice: { kind: 'deep', pitch: 1.15 }, style: { cheer: 'wave', trick: 'superman' },
    gestures: { cheer: G.grantHat, win: G.grantHat },
    build: grant,
  },
  {
    id: 'malcolm', name: 'Dr. Ian Malcolm', blurb: 'Life, uh, finds a way', weight: 'light', color: 0x3a3a3a,
    voice: { kind: 'human', pitch: 0.85 }, style: { cheer: 'point', trick: 'twist' },
    gestures: { cheer: G.malcolmLaugh, taunt: G.malcolmTaunt, win: G.malcolmLaugh },
    build: malcolm,
  },
  {
    id: 'hammond', name: 'John Hammond', blurb: 'Spared no expense', weight: 'heavy', color: 0xffa020,
    voice: { kind: 'deep', pitch: 1.25 }, style: { cheer: 'fist', trick: 'arms' },
    gestures: { cheer: G.hammondCane, win: G.hammondWelcome, use: G.hammondCane },
    build: hammond,
  },
  {
    id: 'blue', name: 'Blue', blurb: 'Alpha of the raptor pack', weight: 'light', color: 0x2a5ab8,
    voice: { kind: 'beast', pitch: 1.5 }, style: { cheer: 'roar', trick: 'twist' },
    gestures: { cheer: G.chirp, taunt: G.curious, win: G.chirp },
    build: raptorRig({ ...RAPTORS.blue, eye: C.yellow, dark: 0x6a7676 }),
  },
  {
    id: 'trex', name: 'T. rex', blurb: 'Rexy, queen of the island', weight: 'heavy', color: 0x7a5a3c,
    voice: { kind: 'beast', pitch: 0.6 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: { cheer: G.roar, taunt: G.snap, win: G.roarWin },
    build: () => {
      const rig = bigTheropod({ body: 0x7a5a3c, dark: C.brown, belly: C.dktan, eye: 0xffb020, mouth: C.dkred });
      // the tail lifts with the roar
      rig.fx = (name, f, t) => { rig.tail.rotation.x = name === 'cheer' ? 0.25 * S(f * PI) : name === 'win' ? 0.15 + S(t * 4) * 0.08 : 0; };
      return rig;
    },
  },
  {
    id: 'indominus', name: 'Indominus rex', blurb: 'Genetic hybrid horror', weight: 'heavy', color: 0xdedcd0,
    voice: { kind: 'beast', pitch: 0.68 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: { cheer: G.swipe, taunt: G.snap, win: G.roarWin },
    build: () => bigTheropod({ body: 0xd6d4c8, dark: 0x8a8a7c, belly: 0xb8b6a8, eye: 0xff2a10, eyeGlow: true, mouth: C.dkred, spikes: 0x6a6a5e, claw: 0x3a3a34, arm: 'long', k: 1.04 }),
  },
  {
    id: 'delta', name: 'Delta', blurb: 'Fast, sneaky, hungry', weight: 'light', color: 0x4f7a78,
    voice: { kind: 'beast', pitch: 1.6 }, style: { cheer: 'roar', trick: 'twist' },
    gestures: { cheer: G.hiss, taunt: G.curious, win: G.chirp },
    build: raptorRig({ body: 0x6c7c4a, stripe: 0x2f3a22, belly: 0xb4b48e, eye: 0xffa020, dark: 0x55613a }),
  },
  {
    id: 'dilophosaurus', name: 'Dilophosaurus', blurb: 'Frill-shaking spitter', weight: 'light', color: 0xf2cd37,
    voice: { kind: 'beast', pitch: 1.4 }, style: { cheer: 'roar', trick: 'twist' },
    gestures: { cheer: G.spit, taunt: G.rattle, win: G.rattle },
    build: () => smallTheropod({ kind: 'dilo', body: 0x9aa844, spot: 0x3e4a1c, belly: 0xd8d08a, crest: C.red, frill: C.yellow, eye: C.black, dark: 0x7a8a34 }),
  },
  {
    id: 'spinosaurus', name: 'Spinosaurus', blurb: 'Sail-backed river king', weight: 'heavy', color: 0xc0501a,
    voice: { kind: 'beast', pitch: 0.7 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: { cheer: G.spinoRoar, taunt: G.snap, win: G.spinoRoar },
    build: () => bigTheropod({ body: 0x5a4a3e, dark: 0x2e2620, belly: 0x9a8a72, eye: 0xffb020, mouth: C.dkred, croc: true, arm: 'long', sail: 0xc0501a, sail2: 0x8a3a1a }),
  },
  {
    id: 'triceratops', name: 'Triceratops', blurb: 'Three horns, no brakes', weight: 'heavy', color: 0xb0784a,
    voice: { kind: 'beast', pitch: 0.8 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: { cheer: G.headbutt, taunt: G.hornShake, win: G.stomp },
    build: triceratopsDriver,
  },
  {
    id: 'stegosaurus', name: 'Stegosaurus', blurb: 'Thagomizer tail swinger', weight: 'medium', color: 0xfe8a18,
    voice: { kind: 'beast', pitch: 0.9 }, style: { cheer: 'roar', trick: 'twist' },
    gestures: { cheer: G.tailSwing, win: G.tailSwing },
    build: stegosaurusDriver,
  },
  {
    id: 'brachiosaurus', name: 'Brachiosaurus', blurb: 'Gentle giant (sneezes)', weight: 'heavy', color: 0x6f8660,
    voice: { kind: 'beast', pitch: 0.55 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: { cheer: G.sneeze, win: G.neckSway },
    build: brachiosaurusDriver,
  },
  {
    id: 'parasaurolophus', name: 'Parasaurolophus', blurb: 'Honk-crested cruiser', weight: 'medium', color: 0xd0602a,
    voice: { kind: 'beast', pitch: 1.05 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: { cheer: G.honk, win: G.honk },
    build: parasaurolophusDriver,
  },
  {
    id: 'pteranodon', name: 'Pteranodon', blurb: 'Swoops from the Aviary', weight: 'light', color: 0xa07a50,
    voice: { kind: 'beast', pitch: 1.55 }, style: { cheer: 'roar', trick: 'superman' },
    gestures: { cheer: G.flap, win: G.flapWin },
    build: pteranodonDriver,
  },
];

