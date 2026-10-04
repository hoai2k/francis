// Star Wars drivers. Helmets, faces and colours match the brick
// characters on the Tatooine Podrace map (../maps/starwars-props.js); props such as
// lightsabers and blasters live in starwars-parts.js and only appear (ignite, twirl,
// fire) while a gesture plays.
import { seatedFig, taperGeo } from './kit.js';
import { FACES, trooperHelmet, trooperPrints, c3poHead, c3poPrints, PEARL_GOLD, pearlGold, printQuad, cHand } from '../maps/starwars-props.js';
import {
  THREE, BrickBuilder, C, plastic, mat4, rbox, rod, glowMat, S, A, PI,
  metalMat, CONE, HEMI, BOWL, HOOD, FLARE, HEADCYL, HALFCYL, hair, handAt, saber, blaster, gaffi, flames,
  strength, showSaber, shoot, faceMat, cached,
} from './starwars-parts.js';

const GOLD = 0xd9a520, BESKAR = 0xc6cad2;

// ---- local shapes and prints (Tusken) ------------------------------------------------
// a point on a head of radius r, `a` radians round from the front
const onHead = (a, y, r) => [Math.sin(a) * r, y, Math.cos(a) * r];
// A face print drawn in world units on a head cylinder of radius R and height Hc:
// u = distance round the surface from the front centre, v = height above the bottom.
function printFace(key, R, Hc, skin, draw) {
  return faceMat(key, (g) => {
    g.setTransform(256 / (2 * PI * R), 0, 0, -128 / Hc, 128, 128);
    draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }, skin);
}
const ellipse = (g, x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, PI * 2); g.fill(); };
const poly = (g, col, pts) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };

// ---- hero prints (driver-only; the track figures keep their own) -----------------------
// Luke, Leia and Han wear the light-nougat skin of the current LEGO Star Wars minifigs, with
// printed faces and torsos; Chewbacca and Grogu are built up from moulded pieces.
const SKIN = 0xe6ae80, SKIN_S = '#e6ae80';
const _prints = new Map();
function canvasMat(key, w, h, base, draw, rough = 0.4) {
  let m = _prints.get(key);
  if (m) return m;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  m = new THREE.MeshStandardMaterial({ map: t, roughness: rough });
  _prints.set(key, m);
  return m;
}
// a head print in world units (like printFace above, at twice the resolution)
const headPrint = (key, R, Hc, skin, draw) => canvasMat(key, 512, 256, skin, (g, w, h) => {
  g.setTransform(w / (2 * PI * R), 0, 0, -h / Hc, w / 2, h); draw(g); g.setTransform(1, 0, 0, 1, 0, 0);
});
// a torso print for seatedFig's tapered torso, drawn in bottom widths: x -0.5..0.5 across the
// bottom edge, y 0..T up (the top edge spans x = ±0.38)
function torsoMat(key, W, base, draw) {
  const T = 0.82 / (0.92 * W), w = 256, h = Math.round(256 * T);
  return canvasMat(key, w, h, base, (g) => { g.setTransform(w, 0, 0, -w, w / 2, h); draw(g, T); g.setTransform(1, 0, 0, 1, 0, 0); });
}
function panelGeo(w0, w1, h) {
  return cached(`swdPanel${w0},${w1},${h}`, () => {
    const pts = [[-w0 / 2, 0], [w0 / 2, 0], [w1 / 2, h], [-w1 / 2, h]], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(([x, y]) => [x, y, 0]), 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(pts.flatMap(([x, y]) => [0.5 + x / w0, y / h]), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  });
}
const TILT = Math.atan(0.02 / 0.82);
// lay a torso print on the front (or back) of the torso
function torsoPanel(b, mat, d, back = false) {
  const s = d.s;
  b.addMatrix(panelGeo(0.92 * d.W * s, 0.7 * d.W * s, 0.82 * s), mat, mat4(0, d.chestY, (back ? -1 : 1) * 0.234 * s * d.D, back ? TILT : -TILT, back ? PI : 0, 0));
}
const SPH = () => cached('swdSph', () => new THREE.SphereGeometry(1, 18, 12));
const TORUS = () => cached('swdTorus', () => new THREE.TorusGeometry(1, 0.17, 6, 22));
const ROLL = () => cached('swdRoll', () => new THREE.TorusGeometry(1, 0.4, 8, 22));
// a transform whose yaw is applied last, so `pitch` tilts in the yawed frame (pieces set round a head)
const _ye = new THREE.Euler(), _yq = new THREE.Quaternion(), _yp = new THREE.Vector3(), _ys = new THREE.Vector3();
const ymat = (x, y, z, yaw, pitch, sx, sy, sz, roll = 0) => new THREE.Matrix4().compose(_yp.set(x, y, z), _yq.setFromEuler(_ye.set(pitch, yaw, roll, 'YXZ')), _ys.set(sx, sy, sz));
const strokeP = (g, col, w, pts) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
const curveP = (g, col, w, a, c, b) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...c, ...b); g.stroke(); };
// a minifig eye: a dark oval with a white glint up and to the left
const figEye = (g, x, y, rx, ry, col = '#16100c') => { ellipse(g, x, y, rx, ry, col); ellipse(g, x - rx * 0.3, y + ry * 0.34, rx * 0.36, ry * 0.3, '#fff'); };
// moulded minifig hair: a crown, a shell round the sides and back (open at the face) and a band over the brow
const SHELL = (o) => cached('swdShell' + o, () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, false, o, PI * 2 - 2 * o).translate(0, 0.5, 0));
const BAND = (o) => cached('swdBand' + o, () => new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, -o - 0.02, 2 * o + 0.04).translate(0, 0.5, 0));
function moldHair(hb, d, col, { low = 0.2, band = 0.76, tall = 0.5, open = 0.8 } = {}) {
  const R = d.headR, H = d.headH, m = plastic(col);
  hb.sphere(0, H * 0.97, 0, R * 1.1, col, { sy: tall });
  hb.add(SHELL(open), m, 0, H * low, 0, 0, R * 1.1, H * (0.98 - low), R * 1.1);
  hb.add(BAND(open), m, 0, H * band, 0, 0, R * 1.1, H * (0.98 - band), R * 1.1);
}
// deterministic scatter for fur
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---- heroes ---------------------------------------------------------------------------
// Luke, Tatooine farm boy: sandy swept hair, a white wrap tunic with a belt, tan trousers,
// his father's lightsaber on the belt until he ignites it.
const LUKE_HAIR = 0xd2a04a, LUKE_HAIR2 = 0xb07e32;
const lukeFace = (R, H) => headPrint('swd-luke', R, H, SKIN_S, (g) => {
  for (const sd of [-1, 1]) {
    figEye(g, sd * 0.1, 0.335, 0.034, 0.047);
    curveP(g, '#8a5a24', 0.026, [sd * 0.048, 0.41], [sd * 0.1, 0.455], [sd * 0.158, 0.428]);
    curveP(g, '#d29a72', 0.011, [sd * 0.128, 0.225], [sd * 0.148, 0.2], [sd * 0.136, 0.172]);   // smile lines
  }
  // a big open grin
  g.fillStyle = '#fff'; g.strokeStyle = '#3a1c10'; g.lineWidth = 0.016;
  g.beginPath(); g.moveTo(-0.11, 0.222); g.quadraticCurveTo(0, 0.205, 0.11, 0.222); g.quadraticCurveTo(0.07, 0.1, 0, 0.1); g.quadraticCurveTo(-0.07, 0.1, -0.11, 0.222);
  g.closePath(); g.fill(); g.stroke();
  ellipse(g, 0, 0.128, 0.045, 0.018, '#d0505a');   // tongue
  curveP(g, '#c98a66', 0.011, [-0.025, 0.06], [0, 0.048], [0.025, 0.06]);   // chin
});
function lukeHair(hb, d) {
  const R = d.headR, H = d.headH, c = LUKE_HAIR, c2 = LUKE_HAIR2, m = plastic(c);
  moldHair(hb, d, c, { low: 0.3, band: 0.76, tall: 0.5, open: 0.82 });
  // the swept fringe: parted on his left, brushed across and up off the brow
  hb.addMatrix(SPH(), m, mat4(0, H * 1.06, R * 0.18, -0.1, 0, 0, R * 1.02, H * 0.2, R * 0.92));
  hb.addMatrix(SPH(), m, mat4(-R * 0.12, H * 0.93, R * 0.74, -0.25, 0, 0.16, R * 0.82, H * 0.14, R * 0.4));
  hb.addMatrix(SPH(), m, mat4(R * 0.55, H * 0.99, R * 0.6, -0.2, 0.3, -0.3, R * 0.48, H * 0.13, R * 0.36));
  hb.addMatrix(SPH(), plastic(c2), mat4(R * 0.4, H * 1.13, R * 0.1, 0, 0, 0.3, R * 0.05, R * 0.05, R * 0.75));   // the parting
}
const lukeTorso = (back) => torsoMat(back ? 'swd-luke-b' : 'swd-luke-f', 1, '#f2efe6', (g, T) => {
  const ln = '#a39b88', sh = '#ddd7c8';
  if (back) {
    for (const x of [-0.2, 0.02, 0.22]) curveP(g, sh, 0.014, [x, 0.14], [x + 0.03, T * 0.5], [x * 0.7, T - 0.06]);
    return;
  }
  poly(g, SKIN_S, [[-0.1, T], [0.1, T], [0.0, T - 0.14]]);   // the open neck
  // the wrap: the front panel crosses from his right shoulder to his left hip
  poly(g, sh, [[0.0, T - 0.14], [0.07, T - 0.06], [0.42, 0.12], [0.3, 0.12]]);
  strokeP(g, ln, 0.022, [[-0.1, T], [0.3, 0.12]]);
  strokeP(g, ln, 0.016, [[0.1, T], [0.03, T - 0.1]]);
  for (const [x, y] of [[-0.22, 0.5], [-0.12, 0.3], [0.2, T - 0.12]]) curveP(g, sh, 0.014, [x, y], [x + 0.06, y - 0.05], [x + 0.08, y - 0.14]);
});
function luke() {
  const r = seatedFig({
    name: 'luke', torso: 0xf2efe6, arms: 0xf2efe6, legs: 0xd8c497, hips: 0xd8c497, hands: SKIN, skin: SKIN, noStud: true, extraHeight: 0.14,
    face: lukeFace(0.3 * 1.3, 0.5 * 1.3),
    torsoExtra: (b, d) => {
      const s = d.s;
      torsoPanel(b, lukeTorso(false), d); torsoPanel(b, lukeTorso(true), d, true);
      b.box(0, d.chestY - 0.01 * s, 0, 0.95 * s, 0.13 * s, 0.5 * s, 0x5e3c22);   // belt
      rbox(b, 0.12 * s, d.chestY + 0.055 * s, 0.252 * s, 0.13 * s, 0.1 * s, 0.03 * s, 0, 0, 0, 0xb8bcc2);   // buckle
      rbox(b, 0.12 * s, d.chestY + 0.055 * s, 0.264 * s, 0.07 * s, 0.05 * s, 0.01 * s, 0, 0, 0, 0x7a7e84);
      for (const sd of [-1, 1]) rbox(b, sd * 0.36 * s, d.chestY + 0.0 * s, 0.17 * s, 0.13 * s, 0.15 * s, 0.1 * s, 0, 0, 0, 0x4a2e18);   // pouches
    },
    headExtra: lukeHair,
  });
  // his lightsaber hangs on the belt until it's drawn
  const s = r.dims.s, hb = new BrickBuilder(1);
  hb.cyl(0, -0.15 * s, 0, 0.045 * s, 0.3 * s, 0xb4b8bc, { seg: 8 });
  hb.cyl(0, -0.1 * s, 0, 0.05 * s, 0.1 * s, 0x1a1a1a, { seg: 8 });
  hb.cyl(0, 0.13 * s, 0, 0.055 * s, 0.04 * s, 0x5a5e62, { seg: 8 });
  const hilt = hb.build({ name: 'luke-hilt' });
  hilt.position.set(-0.47 * s, r.dims.chestY - 0.02 * s, 0.1 * s); hilt.rotation.set(0.15, 0, 0.2);
  r.torso.add(hilt);
  const sab = handAt(r, -1, saber(0x3d8bff, 1.1));
  sab.rotation.x = PI / 2;
  r.fx = (name, f) => { showSaber(sab, strength(name, f, ['cheer', 'win', 'trick'])); hilt.visible = !sab.visible; };
  return r;
}

// Leia: the cinnamon-roll buns on a centre-parted brown hairpiece, the white gown with its
// silver belt, red lips, and her blaster.
const LEIA_HAIR = 0x4e2a14, LEIA_HAIR2 = 0x351a0a, LEIA_HAIR3 = 0x6a3a1e;
const leiaFace = (R, H) => headPrint('swd-leia', R, H, SKIN_S, (g) => {
  for (const sd of [-1, 1]) {
    figEye(g, sd * 0.1, 0.33, 0.033, 0.045, '#2a1608');
    strokeP(g, '#1a0e06', 0.013, [[sd * 0.128, 0.36], [sd * 0.16, 0.38]]);   // lashes
    curveP(g, '#3a1e0e', 0.017, [sd * 0.052, 0.41], [sd * 0.1, 0.45], [sd * 0.158, 0.418]);
    ellipse(g, sd * 0.165, 0.235, 0.036, 0.022, 'rgba(232,120,120,0.35)');   // blush
  }
  // red lips, smiling
  g.fillStyle = '#c4243a';
  g.beginPath(); g.moveTo(-0.075, 0.205); g.quadraticCurveTo(0, 0.188, 0.075, 0.205); g.quadraticCurveTo(0.04, 0.13, 0, 0.13); g.quadraticCurveTo(-0.04, 0.13, -0.075, 0.205); g.fill();
  curveP(g, '#7a1020', 0.01, [-0.07, 0.2], [0, 0.17], [0.07, 0.2]);
});
function leiaHair(hb, d) {
  const R = d.headR, H = d.headH, c = LEIA_HAIR, c2 = LEIA_HAIR2, c3 = LEIA_HAIR3, m = plastic(c);
  moldHair(hb, d, c, { low: 0.34, band: 0.78, tall: 0.44, open: 0.75 });
  // the centre parting: two smooth lobes with a groove between, drawn down over the temples
  for (const sd of [-1, 1]) {
    hb.sphere(sd * R * 0.42, H * 1.0, R * 0.04, R * 0.78, c, { sy: 0.62 });
    hb.addMatrix(SPH(), m, mat4(sd * R * 0.5, H * 0.88, R * 0.74, -0.2, 0, -sd * 0.42, R * 0.6, H * 0.13, R * 0.34));
  }
  // the cinnamon-roll buns, coiled
  for (const sd of [-1, 1]) {
    const x = sd * R * 1.16, y = H * 0.5, z = -R * 0.04, rb = R * 0.64;
    hb.addMatrix(SPH(), m, mat4(x, y, z, 0, 0, 0, rb * 0.5, rb, rb));
    for (const [rr, col] of [[0.8, c2], [0.56, c3], [0.32, c2]]) {
      const off = rb * 0.5 * Math.sqrt(1 - rr * rr);
      hb.addMatrix(TORUS(), plastic(col), mat4(x + sd * off, y, z, 0, PI / 2, 0, rb * rr, rb * rr, rb * 0.5));
    }
    hb.addMatrix(SPH(), plastic(c3), mat4(x + sd * rb * 0.47, y, z, 0, 0, 0, rb * 0.07, rb * 0.16, rb * 0.16));
  }
}
const leiaTorso = (back) => torsoMat(back ? 'swd-leia-b' : 'swd-leia-f', 1, '#f4f4f4', (g, T) => {
  const fold = '#d6d9de';
  if (back) {
    // the gown's hood lies folded down the back
    curveP(g, '#c9ccd2', 0.02, [-0.3, T - 0.02], [0, T - 0.42], [0.3, T - 0.02]);
    curveP(g, fold, 0.014, [-0.2, T - 0.05], [0, T - 0.28], [0.2, T - 0.05]);
    return;
  }
  curveP(g, '#c4c8ce', 0.022, [-0.14, T], [0, T - 0.1], [0.14, T]);   // the high neckline
  for (const x of [-0.24, -0.1, 0.1, 0.24]) curveP(g, fold, 0.013, [x * 1.1, 0.14], [x + 0.02, T * 0.5], [x * 0.75, T - 0.1]);
});
function leia() {
  const W = 0xf4f4f4;
  const r = seatedFig({
    name: 'leia', torso: W, arms: W, legs: W, hips: W, hands: SKIN, skin: SKIN, noStud: true, extraHeight: 0.1,
    face: leiaFace(0.3 * 1.3, 0.5 * 1.3),
    torsoExtra: (b, d) => {
      const s = d.s, silver = metalMat(0xc4c9d0, 0.3);
      torsoPanel(b, leiaTorso(false), d); torsoPanel(b, leiaTorso(true), d, true);
      b.box(0, d.chestY - 0.01 * s, 0, 0.95 * s, 0.13 * s, 0.5 * s, 0, { mat: silver });   // the silver belt
      for (let k = 0; k < 5; k++) {
        rbox(b, (-0.32 + k * 0.16) * s, d.chestY + 0.055 * s, 0.252 * s, 0.12 * s, 0.11 * s, 0.025 * s, 0, 0, 0, 0, { mat: metalMat(0x9aa0a8, 0.35) });
        rbox(b, (-0.32 + k * 0.16) * s, d.chestY + 0.055 * s, 0.262 * s, 0.06 * s, 0.05 * s, 0.015 * s, 0, 0, 0, 0, { mat: silver });
      }
      b.box(0, 0.86 * s, -0.05 * s, 0.62 * s, 0.14 * s, 0.38 * s, 0xeeeeee);   // the hood round the neck
      b.addMatrix(SPH(), plastic(0xececec), mat4(0, 0.8 * s, -0.22 * s, -0.15, 0, 0, 0.3 * s, 0.2 * s, 0.07 * s));   // its folds down the back
      b.box(0, -0.11 * s, 0.31 * s, 0.9 * s, 0.31 * s, 0.74 * s, W);   // the gown over her lap
    },
    headExtra: leiaHair,
  });
  const gun = handAt(r, -1, blaster('pistol', 1));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'throwF']);
    gun.visible = k > 0;
    shoot(gun, k > 0.5 && name !== 'throwF', t, 4);
  };
  return r;
}

// Han: swept brown hair, the crooked half-smile, white shirt and black vest, blue-grey
// trousers with the Corellian bloodstripe, and the DL-44 in its holster until he draws.
const HAN_HAIR = 0x5c3a1e, HAN_HAIR2 = 0x45291a;
const hanFace = (R, H) => headPrint('swd-han', R, H, SKIN_S, (g) => {
  for (const sd of [-1, 1]) figEye(g, sd * 0.1, 0.33, 0.033, 0.045, '#1e120a');
  curveP(g, '#4a2a14', 0.026, [-0.05, 0.405], [-0.1, 0.425], [-0.158, 0.41]);   // one brow level...
  curveP(g, '#4a2a14', 0.026, [0.05, 0.418], [0.1, 0.468], [0.158, 0.44]);      // ...one cocked
  // the lopsided smirk, pulled up on his left
  g.fillStyle = '#fff'; g.strokeStyle = '#3a1c10'; g.lineWidth = 0.016;
  g.beginPath(); g.moveTo(-0.09, 0.195); g.quadraticCurveTo(0.02, 0.17, 0.115, 0.235); g.quadraticCurveTo(0.08, 0.17, 0.02, 0.165); g.quadraticCurveTo(-0.04, 0.165, -0.09, 0.195); g.fill(); g.stroke();
  curveP(g, '#c98a66', 0.011, [0.13, 0.25], [0.15, 0.225], [0.135, 0.2]);   // dimple
  strokeP(g, '#b8785a', 0.01, [[-0.035, 0.085], [-0.015, 0.055]]);   // chin scar
  curveP(g, '#d8a27c', 0.01, [-0.06, 0.3], [-0.03, 0.26], [-0.01, 0.25]);   // nose line
});
function hanHair(hb, d) {
  const R = d.headR, H = d.headH, c = HAN_HAIR, c2 = HAN_HAIR2, m = plastic(c);
  moldHair(hb, d, c, { low: 0.24, band: 0.78, tall: 0.52, open: 0.8 });
  // thick, swept up off the brow and back from a side parting; a loose lock falls forward
  hb.addMatrix(SPH(), m, mat4(R * 0.08, H * 1.06, R * 0.3, -0.25, 0, -0.08, R * 1.05, H * 0.24, R * 0.85));
  hb.addMatrix(SPH(), m, mat4(-R * 0.2, H * 0.96, R * 0.72, -0.5, 0, 0.12, R * 0.82, H * 0.16, R * 0.4));
  hb.addMatrix(SPH(), plastic(c2), mat4(-R * 0.42, H * 0.84, R * 0.92, 0, 0, 0.75, R * 0.26, H * 0.06, R * 0.1));
  hb.addMatrix(SPH(), plastic(c2), mat4(R * 0.45, H * 1.14, R * 0.0, 0, 0, -0.35, R * 0.05, R * 0.05, R * 0.75));   // the parting
  for (const sd of [-1, 1]) hb.addMatrix(SPH(), m, mat4(sd * R * 0.75, H * 0.92, -R * 0.35, 0, 0, 0, R * 0.42, H * 0.18, R * 0.62));   // fullness over the ears
}
const hanShirt = () => torsoMat('swd-han-f', 1, '#efe9dc', (g, T) => {
  poly(g, SKIN_S, [[-0.08, T], [0.08, T], [0, T - 0.2]]);   // the open neck
  strokeP(g, '#b8ae98', 0.018, [[-0.11, T], [0, T - 0.22], [0.11, T]]);
  for (const sd of [-1, 1]) poly(g, '#e2dac8', [[sd * 0.1, T], [sd * 0.2, T - 0.02], [sd * 0.05, T - 0.16]]);   // collar
  strokeP(g, '#c8bea8', 0.012, [[0, T - 0.22], [0, 0.14]]);   // placket
  for (let k = 0; k < 3; k++) ellipse(g, 0.025, T - 0.3 - k * 0.15, 0.012, 0.012, '#b8ae98');
});
function han() {
  const LEGS = 0x2c3a56;
  const r = seatedFig({
    name: 'han', torso: 0xefe9dc, arms: 0xefe9dc, legs: LEGS, hips: LEGS, hands: SKIN, skin: SKIN, noStud: true, extraHeight: 0.14,
    face: hanFace(0.3 * 1.3, 0.5 * 1.3),
    torsoExtra: (b, d) => {
      const s = d.s, vest = 0x17191d;
      torsoPanel(b, hanShirt(), d);
      for (const sd of [-1, 1]) {
        b.add(taperGeo(0.3, 0.2, 0.8, 0.48, 0.44), plastic(vest), sd * 0.31 * s, d.chestY + 0.01 * s, 0, 0, s, s, s);
        rbox(b, sd * 0.3 * s, 0.5 * s, 0.24 * s, 0.15 * s, 0.035 * s, 0.03 * s, -0.03, 0, 0, 0x34363c);   // vest pockets
        rbox(b, sd * 0.32 * s, 0.32 * s, 0.245 * s, 0.17 * s, 0.035 * s, 0.03 * s, -0.03, 0, 0, 0x34363c);
        b.box(sd * 0.425 * s, 0.0, 0.32 * s, 0.02 * s, 0.075 * s, 0.7 * s, 0xc81e1e);   // bloodstripes
        b.box(sd * 0.455 * s, 0.0, -0.01 * s, 0.012 * s, 0.075 * s, 0.44 * s, 0xc81e1e);
      }
      b.add(taperGeo(0.93, 0.71, 0.8, 0.04, 0.04), plastic(vest), 0, d.chestY + 0.01 * s, -0.222 * s, 0, s, s, s);   // vest back
      b.box(0, d.chestY - 0.01 * s, 0, 0.95 * s, 0.12 * s, 0.5 * s, 0x3a2414);   // belt
      rbox(b, 0, d.chestY + 0.05 * s, 0.252 * s, 0.11 * s, 0.09 * s, 0.03 * s, 0, 0, 0, 0xb4b8bc);
      rbox(b, -0.05 * s, d.chestY - 0.05 * s, 0.02 * s, 0.98 * s, 0.1 * s, 0.52 * s, 0, 0, 0.12, 0x5a3a20);   // gun belt, slung low
      rbox(b, -0.47 * s, -0.12 * s, 0.1 * s, 0.13 * s, 0.38 * s, 0.24 * s, 0.1, 0, -0.1, 0x3a2414);   // holster
      rbox(b, -0.47 * s, -0.05 * s, 0.1 * s, 0.15 * s, 0.05 * s, 0.26 * s, 0.1, 0, -0.1, 0x5a3a20);
    },
    headExtra: hanHair,
  });
  // the DL-44 rides in the holster until he draws it
  const s = r.dims.s, hb = new BrickBuilder(1);
  rbox(hb, 0, 0.1 * s, -0.05 * s, 0.09 * s, 0.2 * s, 0.12 * s, -0.35, 0, 0, 0x2a2c30);   // grip
  rbox(hb, 0, 0.02 * s, 0.04 * s, 0.1 * s, 0.1 * s, 0.2 * s, 0, 0, 0, 0x3a3c40);
  rod(hb, [0, 0.06 * s, 0.1 * s], [0, 0.06 * s, 0.24 * s], 0.035 * s, 0x6a6e72, 6);   // scope
  const holstered = hb.build({ name: 'han-dl44' });
  holstered.position.set(-0.5 * s, 0.05 * s, 0.1 * s); holstered.rotation.z = -0.1;
  r.torso.add(holstered);
  const gun = handAt(r, -1, blaster('dl44', 1));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer']);
    gun.visible = k > 0;
    holstered.visible = !gun.visible;
    const spin = name === 'cheer' && f < 0.55;
    gun.rotation.x = spin ? f / 0.55 * PI * 4 : 0;
    shoot(gun, name === 'cheer' && f > 0.6, t, 4);
  };
  return r;
}

// Chewbacca: layered shaggy fur (darker and lighter), blue eyes deep under the brow, a big
// black nose and a roaring jaw full of teeth, the bandolier of silver boxes and his bowcaster.
const FUR = 0x6a4a2c, FUR_D = 0x46301a, FUR_L = 0x8a6440, FUR_X = 0x58391f;
// a flat, pointed tuft of fur hanging down (and flaring out by `flare`) at yaw `a`
const tuft = (b, x, y, z, a, w, h, col, flare = 0.35, roll = 0) => b.addMatrix(CONE(), plastic(col), ymat(x, y, z, a, PI - flare, w, h, w * 0.32, roll));
const FUR_COLS = ['#46301a', '#8a6440', '#5a3e24', '#a07a4e', '#3a2614', '#7a5634'];
function furStrokes(g, r, x0, x1, y0, y1, step = 0.05, len = 0.09, w = 0.016) {
  for (let y = y1 + 0.03, row = 0; y > y0 - 0.02; y -= step * 0.8, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
      const xx = x + (r() - 0.5) * step * 0.6, yy = y + (r() - 0.5) * step * 0.4, L = len * (0.7 + r() * 0.6);
      curveP(g, FUR_COLS[Math.floor(r() * FUR_COLS.length)], w, [xx - w * 0.6, yy], [xx + w * 0.8, yy - L * 0.5], [xx - w * 0.2, yy - L]);
    }
  }
}
const chewieFur = (back) => torsoMat(back ? 'swd-chewie-b' : 'swd-chewie-f', 1.05, '#6a4a2c', (g, T) => furStrokes(g, rng(back ? 11 : 5), -0.56, 0.56, 0, T, 0.045, 0.085, 0.015));
const chewieFace = (R, H) => headPrint('swd-chewie', R, H, '#6a4a2c', (g) => {
  furStrokes(g, rng(23), -1.7, 1.7, 0, H, 0.05, 0.09, 0.016);
  // the lighter muzzle and cheeks
  ellipse(g, 0, 0.3, 0.24, 0.2, '#9c7a52');
  furStrokes(g, rng(29), -0.2, 0.2, 0.16, 0.42, 0.04, 0.06, 0.013);
  ellipse(g, 0, 0.29, 0.17, 0.13, '#a8865c');
  for (const sd of [-1, 1]) {
    // deep-set blue eyes under a heavy furry brow
    ellipse(g, sd * 0.14, 0.555, 0.09, 0.062, '#2a1a0c');
    ellipse(g, sd * 0.14, 0.552, 0.052, 0.042, '#3f86d8');
    ellipse(g, sd * 0.14, 0.55, 0.024, 0.024, '#0a0a14');
    ellipse(g, sd * 0.14 - 0.018, 0.566, 0.013, 0.012, '#fff');
    poly(g, '#3a2614', [[sd * 0.03, 0.6], [sd * 0.24, 0.62], [sd * 0.25, 0.68], [sd * 0.04, 0.655]]);
  }
});
function chewieHead(hb, d) {
  const R = d.headR, H = d.headH;
  hb.sphere(0, H * 0.93, -R * 0.04, R * 1.1, FUR, { sy: 0.52 });
  // layered tufts of fur round the head, skipping the face; the lowest rows hang over the shoulders
  const cols = [FUR_D, FUR, FUR_L, FUR_X];
  const rows = [[H * 1.06, 0.0, 14, 0.82, 0.95], [H * 0.82, 0.62, 14, 1.02, 0.3], [H * 0.58, 0.8, 14, 1.06, 0.3], [H * 0.34, 0.86, 14, 1.1, 0.32], [H * 0.1, 0.84, 14, 1.14, 0.38]];
  for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2 + 0.2; tuft(hb, Math.sin(a) * R * 0.42, H * 1.2, Math.cos(a) * R * 0.42, a, R * 0.26, H * 0.3, [FUR, FUR_X, FUR_L][k % 3], 1.25); }   // crown
  rows.forEach(([y, skip, n, rr, flare], row) => {
    for (let k = 0; k < n; k++) {
      const a = (k + (row % 2) * 0.5) / n * PI * 2, aa = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(aa) < skip) continue;
      tuft(hb, Math.sin(a) * R * rr, y, Math.cos(a) * R * rr, a, R * 0.3, H * (row ? 0.42 : 0.36), cols[(k * 3 + row) % 4], flare, ((k * 7) % 5 - 2) * 0.08);
    }
  });
  // a heavy brow over the eyes and fur framing the cheeks
  for (const sd of [-1, 1]) {
    tuft(hb, sd * R * 0.22, H * 0.73, R * 0.95, sd * 0.2, R * 0.24, H * 0.2, FUR_D, 0.9, sd * 0.35);
    tuft(hb, sd * R * 0.62, H * 0.36, R * 0.84, sd * 0.7, R * 0.2, H * 0.36, FUR_L, 0.25, -sd * 0.12);
    tuft(hb, sd * R * 0.44, H * 0.14, R * 0.94, sd * 0.45, R * 0.18, H * 0.26, FUR, 0.2, -sd * 0.2);
  }
  // muzzle, big black nose, upper fangs and the dark mouth that shows when the jaw drops
  hb.addMatrix(SPH(), plastic(0xa8865c), mat4(0, H * 0.36, R * 0.84, 0, 0, 0, R * 0.42, H * 0.11, R * 0.26));
  hb.addMatrix(SPH(), plastic(0x161010, { rough: 0.2 }), mat4(0, H * 0.43, R * 1.04, 0, 0, 0, R * 0.2, H * 0.06, R * 0.12));
  rbox(hb, 0, H * 0.25, R * 0.8, R * 0.72, H * 0.14, R * 0.32, 0, 0, 0, 0x3a0c0a);
  rbox(hb, 0, H * 0.3, R * 0.9, R * 0.5, H * 0.03, R * 0.14, 0, 0, 0, 0xf0ead8);
  for (const sd of [-1, 1]) hb.addMatrix(CONE(), plastic(0xf4eedc), mat4(sd * R * 0.22, H * 0.26, R * 0.95, PI, 0, 0, R * 0.05, H * 0.09, R * 0.05));   // fangs
}
function chewie() {
  const r = seatedFig({
    name: 'chewie', s: 1.6, wide: 1.05, torso: FUR, arms: FUR, legs: FUR, hips: FUR_D, hands: 0x3a2818, skin: FUR, neck: FUR,
    face: chewieFace(0.33 * 1.6, 0.56 * 1.6), headR: 0.33, headH: 0.56, noStud: true, extraHeight: 0.12,
    torsoExtra: (b, d) => {
      const s = d.s;
      torsoPanel(b, chewieFur(false), d); torsoPanel(b, chewieFur(true), d, true);
      // shaggy fur over the shoulders
      for (let k = 0; k < 9; k++) {
        const x = (-0.42 + k * 0.105) * s;
        for (const z of [1, -1]) tuft(b, x, 0.86 * s, z * 0.19 * s, z > 0 ? 0 : PI, 0.08 * s, 0.3 * s, [FUR_D, FUR_L, FUR_X][k % 3], 0.3, ((k * 5) % 3 - 1) * 0.15);
      }
      // the bandolier: over his left shoulder to his right hip, front and back, with silver boxes
      for (const z of [1, -1]) {
        rbox(b, 0.02 * s, 0.58 * s, z * 0.248 * s, 0.14 * s, 1.22 * s, 0.035 * s, 0, 0, -0.68, 0x3a2614);
        for (let k = 0; k < 7; k++) {
          const t = (-0.42 + k * 0.14) * s, x = 0.02 * s + Math.sin(0.68) * t, y = 0.58 * s + Math.cos(0.68) * t;
          rbox(b, x, y, z * 0.272 * s, 0.11 * s, 0.13 * s, 0.07 * s, 0, 0, -0.68, 0xc4c8ce);
          rbox(b, x + Math.sin(0.68) * 0.045 * s, y + Math.cos(0.68) * 0.045 * s, z * 0.31 * s, 0.112 * s, 0.03 * s, 0.01 * s, 0, 0, -0.68, 0x7c8086);
        }
      }
      // the bowcaster, slung across his back
      const bz = -0.36 * s;
      rbox(b, -0.05 * s, 0.52 * s, bz, 0.09 * s, 0.95 * s, 0.1 * s, 0, 0, 0.55, 0x5a3a20);   // stock
      rbox(b, -0.05 * s, 0.52 * s, bz - 0.05 * s, 0.07 * s, 0.6 * s, 0.05 * s, 0, 0, 0.55, 0x8a8e94);   // barrel
      const tx = -0.05 * s - Math.sin(0.55) * 0.42 * s, ty = 0.52 * s + Math.cos(0.55) * 0.42 * s;
      for (const sd of [-1, 1]) rbox(b, tx + sd * Math.cos(0.55) * 0.2 * s, ty + sd * Math.sin(0.55) * 0.2 * s - 0.03 * s, bz - 0.02 * s, 0.42 * s, 0.05 * s, 0.06 * s, 0, 0, 0.55 - sd * 0.35, 0xa0a4aa);   // bow arms
      b.cyl(tx, ty - 0.04 * s, bz, 0.06 * s, 0.1 * s, 0x2a2a2e, { seg: 8 });
    },
    arm: (ab, sd, d) => {
      const s = d.s;
      for (const [y, a, col] of [[-0.1, 0, FUR_D], [-0.12, PI / 2 * sd, FUR_L], [-0.1, PI, FUR_X], [-0.38, sd * 1.2, FUR_X], [-0.36, sd * 2.4, FUR_D]]) {
        tuft(ab, Math.sin(a) * 0.13 * s, y * s, Math.cos(a) * 0.13 * s, a, 0.09 * s, 0.3 * s, col, 0.25);
      }
    },
    headExtra: chewieHead,
  });
  // lower jaw (roars)
  const d = r.dims, R = d.headR, H = d.headH;
  const jaw = new THREE.Group(); jaw.position.set(0, H * 0.3, R * 0.25);
  const jb = new BrickBuilder(1);
  jb.addMatrix(SPH(), plastic(0x9c7a52), mat4(0, -H * 0.08, R * 0.55, 0, 0, 0, R * 0.48, H * 0.11, R * 0.34));
  rbox(jb, 0, -H * 0.02, R * 0.74, R * 0.66, H * 0.05, R * 0.14, 0, 0, 0, 0xf0ead8);   // teeth
  for (const sd of [-1, 1]) jb.addMatrix(CONE(), plastic(0xf4eedc), mat4(sd * R * 0.24, H * 0.02, R * 0.78, 0, 0, 0, R * 0.05, H * 0.08, R * 0.05));
  jaw.add(jb.build({ name: 'chewie-jaw' }));
  r.head.add(jaw);
  r.jaw = jaw; r.jawOpen = 0.55;
  return r;
}

// R2-D2: a custom rig. The body is the torso, the dome is the head (it spins), the two
// little utility arms steer.
function r2d2() {
  const W = 0xf2f2f2, BL = 0x1f55b8, SV = 0xb8bcc4;
  const root = new THREE.Group(); root.name = 'r2d2';
  const torso = new THREE.Group(); root.add(torso);
  const b = new BrickBuilder(1);
  b.cyl(0, -0.45, 0, 0.5, 1.45, W, { seg: 20 });
  b.cyl(0, 0.93, 0, 0.515, 0.07, SV, { seg: 20 });
  rbox(b, 0, 0.73, 0.48, 0.24, 0.16, 0.06, 0, 0, 0, BL);
  for (const sd of [-1, 1]) rbox(b, sd * 0.2, 0.43, 0.45, 0.1, 0.36, 0.06, 0, sd * 0.42, 0, BL);
  rbox(b, 0, 0.49, 0.49, 0.18, 0.05, 0.04, 0, 0, 0, SV);
  rbox(b, 0, 0.35, 0.49, 0.18, 0.05, 0.04, 0, 0, 0, SV);
  rbox(b, 0, 0.59, -0.48, 0.3, 0.3, 0.06, 0, 0, 0, BL);
  for (const sd of [-1, 1]) {
    rod(b, [sd * 0.46, 0.77, 0], [sd * 0.66, 0.77, 0], 0.15, SV, 12);
    rbox(b, sd * 0.6, 0.2, 0, 0.12, 1.14, 0.3, 0, 0, 0, W);
    rbox(b, sd * 0.665, 0.4, 0, 0.02, 0.5, 0.13, 0, 0, 0, BL);
    rod(b, [sd * 0.69, 0.68, -0.05], [sd * 0.69, 0.68, -0.3], 0.09, 0x6a6e72, 8);   // boosters (Attack of the Clones)
  }
  torso.add(b.build({ name: 'r2-body' }));
  const fire = flames([[0.69, 0, 0], [-0.69, 0, 0]], 0.9, 0.12, 'back');
  fire.position.set(0, 0.68, -0.3);
  torso.add(fire);
  const head = new THREE.Group(); head.position.set(0, 1.0, 0); torso.add(head);
  const hb = new BrickBuilder(1);
  hb.addMatrix(HEMI(), metalMat(0xc8ccd2, 0.25), mat4(0, 0, 0, 0, 0, 0, 0.5, 0.46, 0.5));
  for (let k = 1; k < 8; k++) { const a = k * PI / 4; rbox(hb, Math.sin(a) * 0.46, 0.1, Math.cos(a) * 0.46, 0.2, 0.13, 0.06, 0, a, 0, BL); }
  rbox(hb, 0, 0.36, 0.22, 0.22, 0.1, 0.16, -0.75, 0, 0, BL);
  rod(hb, [0, 0.2, 0.36], [0, 0.22, 0.5], 0.08, 0x111111, 10);
  hb.sphere(0.2, 0.1, 0.44, 0.045, 0, { mat: glowMat(0xff2a2a, 3) });
  hb.sphere(-0.2, 0.27, 0.4, 0.04, 0, { mat: glowMat(0x3ab0ff, 3) });
  head.add(hb.build({ name: 'r2-dome' }));
  const peri = new THREE.Group(); peri.position.set(0.14, 0.0, -0.12); head.add(peri);
  const pb = new BrickBuilder(1);
  rod(pb, [0, 0, 0], [0, 0.32, 0], 0.035, 0x8a8e92, 6);
  rbox(pb, 0, 0.36, 0.02, 0.1, 0.09, 0.14, 0, 0, 0, 0x2a2c30);
  peri.add(pb.build({ name: 'r2-periscope' }));
  const arms = [1, -1].map((sd) => {
    const pv = new THREE.Group(); pv.position.set(sd * 0.2, 0.95, 0.44);
    const ab = new BrickBuilder(1);
    rod(ab, [0, 0.02, 0], [0, -0.36, 0], 0.035, SV, 6);
    rbox(ab, 0, -0.38, 0, 0.1, 0.06, 0.08, 0, 0, 0, 0x6a6e72);
    for (const s2 of [-1, 1]) rbox(ab, s2 * 0.035, -0.44, 0, 0.025, 0.08, 0.05, 0, 0, 0, 0x6a6e72);
    pv.add(ab.build({ name: 'r2-arm' }));
    torso.add(pv);
    return pv;
  });
  const rig = { root, torso, head, armL: arms[0], armR: arms[1], armLen: 0.42, height: 1.5, width: 1.45 };
  rig.fx = (name, f, t) => {
    const cheer = name === 'cheer', win = name === 'win';
    if (cheer) head.rotation.y = f * PI * 4;
    else if (win) head.rotation.y = t * 5;
    peri.position.y = cheer || win ? 0.2 + S(t * 9) * 0.05 : 0;
    fire.visible = name === 'trick' || name === 'use' || win;
    if (fire.visible) fire.scale.z = 0.75 + S(t * 37) * 0.25;
  };
  return rig;
}

// C-3PO, as the LEGO minifig: pearl gold all over (every plain part is swapped to a satin
// metallic copy of the shared vertex-colour plastic); the domed head and the prints are the
// track figure's (../maps/starwars-props.js); classic C-hands.
function c3po() {
  const A = c3poPrints(), G = PEARL_GOLD, W = 0.96, tilt = -Math.atan(0.02 / 0.82);
  const r = seatedFig({
    name: 'c3po', wide: W, torso: G, arms: G, legs: G, hips: G, hands: G, skin: G, neck: G,
    headR: 0.31, headH: 0.48, noStud: true, extraHeight: 0.26,
    head: (hb, d) => c3poHead(hb, d.headR),
    torsoExtra: (b, d) => {
      const s = d.s;
      printQuad(b, A.mat, A.rg.drvF, 0.92 * W * s, 0.7 * W * s, 0.82 * s, 0, d.chestY, 0.233 * s, tilt);
      printQuad(b, A.mat, A.rg.drvB, 0.92 * W * s, 0.7 * W * s, 0.82 * s, 0, d.chestY, -0.233 * s, tilt, PI);
    },
    arm: (ab, sd, d) => cHand(ab, G, 0, -0.76 * d.s, 0, 0.1 * d.s, sd),
  });
  pearlGold(r.root);
  return r;
}

function mando() {
  const flight = 0x6a6258, cape = 0x5a3a24, bes = metalMat(BESKAR, 0.22);
  const r = seatedFig({
    name: 'mando', torso: 0x6a6258, arms: flight, legs: flight, hips: 0x4a3a2a, hands: 0x3a2a1a, neck: 0x3a3a3a, headR: 0.32, headH: 0.5,
    head: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.add(HEADCYL(), bes, 0, 0, 0, 0, R, H * 0.96, R);
      hb.addMatrix(HEMI(), bes, mat4(0, H * 0.94, 0, 0, 0, 0, R, R * 0.6, R));
      rbox(hb, 0, H * 0.6, R * 0.94, R * 1.3, H * 0.14, R * 0.18, 0, 0, 0, 0x0c0c0c);
      rbox(hb, 0, H * 0.34, R * 0.94, R * 0.3, H * 0.42, R * 0.18, 0, 0, 0, 0x0c0c0c);
      rod(hb, [R * 0.95, H * 0.5, 0], [R * 1.12, H * 0.5, 0.0], R * 0.18, 0x8a8e92, 8);
      rod(hb, [R * 1.08, H * 0.5, 0.0], [R * 1.08, H * 0.9, R * 0.3], R * 0.06, 0x8a8e92, 6);
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      for (const sd of [-1, 1]) rbox(b, sd * 0.17 * s, 0.7 * s, 0.22 * s, 0.3 * s, 0.32 * s, 0.05 * s, -0.08, 0, 0, 0, { mat: bes });
      rbox(b, 0, 0.42 * s, 0.235 * s, 0.4 * s, 0.18 * s, 0.03 * s, 0, 0, 0, 0, { mat: bes });
      b.box(0, d.chestY, 0, 0.95 * s, 0.11 * s, 0.5 * s, 0x4a3a2a);
      rbox(b, 0, 0.6 * s, 0.25 * s, 0.1 * s, 1.0 * s, 0.03 * s, 0, 0, -0.65, 0x4a3a2a);
      b.box(0, 0.05 * s, -0.27 * s, 1.0 * s, 0.95 * s, 0.06 * s, cape);
      b.box(0, 0.88 * s, -0.08 * s, 0.98 * s, 0.14 * s, 0.42 * s, cape);
    },
    arm: (ab, sd, d) => { const s = d.s; rbox(ab, sd * 0.03 * s, -0.04 * s, 0, 0.32 * s, 0.12 * s, 0.36 * s, 0, 0, -sd * 0.3, 0xa8acb2); rbox(ab, 0, -0.45 * s, 0, 0.28 * s, 0.14 * s, 0.3 * s, 0, 0, 0, 0xa8acb2); },
    extraHeight: 0.15,
  });
  const gun = handAt(r, -1, blaster('mando', 1));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'throwF']);
    gun.visible = k > 0;
    gun.rotation.x = name === 'cheer' ? (f < 0.7 ? f / 0.7 * PI * 6 : 0) : name === 'win' ? (t * 10) % (PI * 2) : 0;
    shoot(gun, name === 'cheer' && f > 0.72, t, 5);
  };
  return r;
}

// Grogu in his hover-pram: the pram bobs, the knob from the Razor Crest floats up when he
// uses the Force. A big moulded head, huge ears straight out to the sides, big glossy black
// eyes, and a tiny body in a tan robe with a big rolled collar.
function grogu() {
  const skin = 0x86ad68, robe = 0xb39566, collar = 0xc4a678;
  const root = new THREE.Group(); root.name = 'grogu';
  const pram = new THREE.Group(); root.add(pram);
  const pb = new BrickBuilder(1);
  const pm = metalMat(0xd8dadc, 0.3);
  pb.addMatrix(BOWL(), pm, mat4(0, 0.56, 0.02, 0, 0, 0, 0.66, 0.62, 0.66));
  pb.cyl(0, 0.52, 0.02, 0.68, 0.07, 0xa0a4a8, { seg: 20 });
  pb.addMatrix(HOOD(), pm, mat4(0, 0.56, -0.02, -0.38, 0, 0, 0.66, 0.6, 0.66));
  pb.cyl(0, 0.48, 0.02, 0.6, 0.05, 0xc8b08a, { seg: 16 });
  pb.sphere(0, 0.03, 0.02, 0.2, 0, { mat: glowMat(0x9ad8ff, 1.6) });
  pram.add(pb.build({ name: 'pram' }));
  // torso pivot at the hips (origin) so rig.shoulder = armL.position is in the seat frame
  const torso = new THREE.Group(); root.add(torso);
  const b = new BrickBuilder(1);
  b.cyl(0, 0.42, 0.06, 0.25, 0.4, robe, { seg: 14 });
  b.addMatrix(ROLL(), plastic(collar), mat4(0, 0.8, 0.06, PI / 2, 0, 0, 0.27, 0.27, 0.3));   // the big collar
  for (const sd of [-1, 1]) rbox(b, sd * 0.07, 0.6, 0.3, 0.03, 0.3, 0.02, 0, 0, sd * 0.3, 0x9a7e54);   // robe crossover
  torso.add(b.build({ name: 'grogu-body' }));
  const head = new THREE.Group(); head.position.set(0, 0.86, 0.06); torso.add(head);
  const hb = new BrickBuilder(1), sk = plastic(skin);
  hb.addMatrix(SPH(), sk, mat4(0, 0.29, 0, 0, 0, 0, 0.31, 0.27, 0.28));   // a broad brow
  hb.addMatrix(SPH(), sk, mat4(0, 0.17, 0.04, 0, 0, 0, 0.23, 0.17, 0.22));   // cheeks and chin
  for (const sd of [-1, 1]) hb.addMatrix(SPH(), sk, mat4(sd * 0.11, 0.35, 0.19, 0, 0, sd * 0.05, 0.12, 0.05, 0.09));   // brow ridge
  // big glossy black eyes with highlights
  const eyeM = plastic(0x0b0806, { rough: 0.06 }), glint = glowMat(0xffffff, 0.7);
  for (const sd of [-1, 1]) {
    hb.addMatrix(SPH(), eyeM, mat4(sd * 0.115, 0.255, 0.212, 0, sd * 0.42, 0, 0.088, 0.078, 0.065));
    hb.addMatrix(SPH(), glint, mat4(sd * 0.115 - 0.028, 0.285, 0.262 + sd * 0.012, 0, 0, 0, 0.02, 0.02, 0.012));
    hb.addMatrix(SPH(), glint, mat4(sd * 0.115 + 0.022, 0.228, 0.27 - sd * 0.01, 0, 0, 0, 0.009, 0.009, 0.008));
  }
  hb.addMatrix(SPH(), sk, mat4(0, 0.19, 0.255, 0, 0, 0, 0.04, 0.028, 0.03));   // little nose
  for (const sd of [-1, 1]) hb.sphere(sd * 0.014, 0.182, 0.282, 0.008, 0x2e4a24);
  rbox(hb, 0, 0.115, 0.245, 0.07, 0.012, 0.012, 0, 0, 0, 0x4e6e3e);   // mouth
  // the huge ears, straight out to the sides, pink inside
  for (const sd of [-1, 1]) {
    const rz = -sd * (PI / 2 - 0.14), ry = sd * 0.28;
    hb.addMatrix(CONE(), plastic(0x96bc7a), mat4(sd * 0.6, 0.32, -0.05, 0, ry, rz, 0.18, 0.72, 0.055));
    hb.addMatrix(CONE(), plastic(0xe6a8a2), mat4(sd * 0.57, 0.32, -0.02, 0, ry, rz, 0.115, 0.56, 0.035));
  }
  head.add(hb.build({ name: 'grogu-head' }));
  const arms = [1, -1].map((sd) => {
    const pv = new THREE.Group(); pv.position.set(sd * 0.22, 0.77, 0.11);
    const ab = new BrickBuilder(1);
    ab.sphere(0, 0, 0, 0.08, robe);
    ab.add(taperGeo(0.12, 0.15, 0.26, 0.14), plastic(robe), 0, -0.28, 0, 0);
    ab.sphere(0, -0.31, 0, 0.065, skin);
    pv.add(ab.build({ name: 'grogu-arm' }));
    torso.add(pv);
    return pv;
  });
  // the Force: the shifter knob floats above the dash
  const knob = new THREE.Group();
  const kb = new BrickBuilder(1);
  kb.sphere(0, 0, 0, 0.13, 0, { mat: metalMat(0xd8dadc, 0.15) });
  kb.cyl(0, -0.2, 0, 0.035, 0.14, 0x5a5e62, { seg: 6 });
  knob.add(kb.build({ name: 'knob' }));
  knob.visible = false;
  root.add(knob);
  const rig = { root, torso, head, armL: arms[0], armR: arms[1], armLen: 0.31, height: 1.4, width: 1.36 };
  rig.idle = (t) => {
    const bob = S(t * 2.2) * 0.04;
    pram.position.y = bob;
    torso.position.y += bob;
  };
  rig.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'use']);
    knob.visible = k > 0;
    if (k > 0) {
      knob.position.set(-0.3 + S(t * 1.7) * 0.06, 0.9 + k * 0.75 + S(t * 3) * 0.06, 1.0);
      knob.rotation.y = t * 2;
    }
  };
  return rig;
}

// ---- villains -------------------------------------------------------------------------
function vader() {
  const blk = 0x141414;
  const r = seatedFig({
    name: 'vader', s: 1.42, wide: 1.06, torso: 0x1a1a1a, arms: 0x161616, legs: blk, hips: blk, hands: 0x101010, skin: blk, neck: blk,
    face: FACES.vader(), headR: 0.31, headH: 0.5, noStud: true, extraHeight: 0.2,
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, 0.5 * s, 0.205 * s, 0.32 * s, 0.24 * s, 0.05 * s, 0x2e2e32);
      b.box(-0.08 * s, 0.6 * s, 0.23 * s, 0.06 * s, 0.06 * s, 0.02 * s, 0, { mat: glowMat(0xff2a2a, 2.5) });
      b.box(0.02 * s, 0.6 * s, 0.23 * s, 0.06 * s, 0.06 * s, 0.02 * s, 0x2a8a3a);
      b.box(0.1 * s, 0.6 * s, 0.23 * s, 0.06 * s, 0.06 * s, 0.02 * s, 0x2a5aaa);
      b.box(0, d.chestY - 0.01 * s, 0, 0.96 * s * d.W, 0.13 * s, 0.5 * s, 0x2a2a2a);
      for (const x of [-0.24, -0.08, 0.08, 0.24]) b.box(x * s, d.chestY, 0.245 * s, 0.1 * s, 0.11 * s, 0.03 * s, 0x9aa0a8);
      b.box(0, -0.05 * s, -0.28 * s, 1.08 * s * d.W, 1.08 * s, 0.07 * s, 0x0c0c0c);      // cape
      b.box(0, 0.86 * s, -0.04 * s, 0.98 * s * d.W, 0.14 * s, 0.5 * s, 0x0c0c0c);
      for (const sd of [-1, 1]) rbox(b, sd * 0.13 * s, 0.86 * s, 0.17 * s, 0.24 * s, 0.1 * s, 0.14 * s, 0.3, 0, sd * 0.4, 0x0c0c0c);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H * 0.92, 0, R * 1.2, 0x101010, { sy: 0.62 });
      hb.add(FLARE(), plastic(0x101010), 0, -H * 0.04, 0, 0, R * 1.2, H * 0.98, R * 1.2);
      rbox(hb, 0, H * 0.9, R * 0.85, R * 1.6, H * 0.1, R * 0.4, 0.3, 0, 0, 0x101010);
    },
  });
  const sab = handAt(r, -1, saber(0xff2010, 1.15));
  sab.rotation.x = PI / 2;
  r.fx = (name, f) => showSaber(sab, strength(name, f, ['win', 'trick']));
  return r;
}

function maul() {
  const blk = 0x161616;
  const r = seatedFig({
    name: 'maul', torso: 0x1b1b1b, arms: blk, legs: blk, hips: blk, hands: 0x101010, skin: 0xb3141c, neck: 0xb3141c,
    face: FACES.maul(), noStud: true, extraHeight: 0.15,
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, d.chestY, 0, 0.95 * s, 0.12 * s, 0.5 * s, 0x3a2a1a);
      for (const sd of [-1, 1]) rbox(b, sd * 0.12 * s, 0.62 * s, 0.22 * s, 0.16 * s, 0.82 * s, 0.03 * s, -0.06, 0, sd * 0.32, 0x0a0a0a);
      b.box(0, 0.86 * s, -0.04 * s, 0.9 * s, 0.14 * s, 0.48 * s, 0x0a0a0a);
      b.box(0, 0.0, -0.27 * s, 0.98 * s, 1.0 * s, 0.06 * s, 0x0a0a0a);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH, horn = 0xe8dcc0;
      for (let k = 0; k < 9; k++) {
        const a = k / 9 * PI * 2, rr = k % 3 === 0 ? 0.25 : 0.62;
        hb.cone(Math.sin(a) * R * rr, H - 0.01, Math.cos(a) * R * rr, 0.045, k % 2 ? 0.14 : 0.2, horn, { seg: 6 });
      }
    },
  });
  // double-bladed saber on a spinner (spins about the arm axis)
  const spin = handAt(r, -1, new THREE.Group());
  const sab = saber(0xff2010, 1.0, { double: true, len: 0.95 });
  sab.rotation.z = -PI / 2;
  spin.add(sab);
  sab.visible = true;
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win']);
    spin.visible = k > 0;
    showSaber(sab, k);
    spin.rotation.y = name === 'cheer' ? f * PI * 8 : name === 'win' ? t * 14 : 0;
  };
  return r;
}

function boba() {
  const g1 = 0x5a6b3a, g2 = 0x6e7f48;
  const r = seatedFig({
    name: 'boba', torso: 0x8a7a54, arms: 0x8a7a54, legs: 0x6a6448, hips: 0x3a2a1a, hands: 0x3a3a3a, skin: g1, neck: 0x3a3a3a,
    face: FACES.boba(), headR: 0.32, headH: 0.5, noStud: true, extraHeight: 0.15,
    torsoExtra: (b, d) => {
      const s = d.s;
      for (const sd of [-1, 1]) rbox(b, sd * 0.17 * s, 0.7 * s, 0.22 * s, 0.3 * s, 0.32 * s, 0.05 * s, -0.08, 0, 0, g1);
      rbox(b, 0, 0.42 * s, 0.235 * s, 0.4 * s, 0.18 * s, 0.03 * s, 0, 0, 0, g2);
      b.box(0, d.chestY, 0, 0.95 * s, 0.11 * s, 0.5 * s, 0x3a2a1a);
      b.box(0, 0.86 * s, -0.03 * s, 0.66 * s, 0.12 * s, 0.46 * s, 0x6a5a3a);
      rbox(b, 0, 0.6 * s, 0.25 * s, 0.1 * s, 1.0 * s, 0.03 * s, 0, 0, 0.6, 0x4a2a1a);
      // jetpack (high on the back so its flames clear the seat back)
      b.box(0, 0.45 * s, -0.42 * s, 0.6 * s, 0.55 * s, 0.26 * s, 0xc0c4c8);
      for (const sd of [-1, 1]) b.cyl(sd * 0.25 * s, 0.38 * s, -0.48 * s, 0.1 * s, 0.68 * s, 0xa0a4a8, { seg: 8 });
      b.cone(0, 1.02 * s, -0.46 * s, 0.11 * s, 0.3 * s, C.red, { seg: 8 });
      b.cyl(0, 0.82 * s, -0.46 * s, 0.1 * s, 0.2 * s, 0xa0a4a8, { seg: 8 });
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H * 0.96, 0, R * 1.02, g1, { sy: 0.55 });
      hb.add(FLARE(), plastic(g1), 0, 0, -R * 0.05, 0, R * 1.0, H * 0.4, R * 1.0);
      rod(hb, [R * 0.95, H * 0.6, 0], [R * 1.15, H * 0.6, 0], R * 0.16, 0x3a3a3a, 8);
      rod(hb, [R * 1.12, H * 0.62, 0], [R * 1.12, H * 1.35, R * 0.18], R * 0.07, 0x3a3a3a, 6);
    },
  });
  const s = r.dims.s;
  // jet flames splay out past the seat back
  const fire = flames([[0.3 * s, 0, 0, 0.5, -0.12, -1], [-0.3 * s, 0, 0, -0.5, -0.12, -1]], 1.4, 0.18);
  fire.position.set(0, 0.5 * s, -0.5 * s);
  r.torso.add(fire);
  const gun = handAt(r, -1, blaster('rifle', 1));
  r.fx = (name, f, t) => {
    fire.visible = name === 'cheer' || name === 'trick' || name === 'use' || name === 'win';
    if (fire.visible) fire.scale.setScalar(0.85 + S(t * 31) * 0.1 + S(t * 17) * 0.07);
    gun.visible = strength(name, f, ['cheer', 'win']) > 0;
    shoot(gun, gun.visible, t, 4);
  };
  return r;
}

function cadBane() {
  const coat = 0x7a5a3a, hat = 0x4a3020, blue = 0x3a68aa;
  const r = seatedFig({
    name: 'cadbane', torso: 0x6b2e22, arms: coat, legs: 0x4a4038, hips: 0x4a4038, hands: blue, skin: blue, neck: blue,
    face: FACES.bane(), headR: 0.3, headH: 0.48, noStud: true, extraHeight: 0.3,
    torsoExtra: (b, d) => {
      const s = d.s;
      for (const sd of [-1, 1]) b.add(taperGeo(0.34, 0.24, 0.82, 0.48, 0.44), plastic(coat), sd * 0.3 * s, d.chestY + 0.005 * s, 0, 0, s, s, s);
      b.box(0, d.chestY, 0, 0.6 * s, 0.1 * s, 0.5 * s, 0x2a1a10);
      b.box(0, 0.82 * s, -0.17 * s, 0.86 * s, 0.4 * s, 0.14 * s, coat);   // high collar
      b.box(0, -0.05 * s, -0.27 * s, 1.0 * s, 1.0 * s, 0.06 * s, coat);
      for (const sd of [-1, 1]) b.box(sd * 0.4 * s, -0.25 * s, 0.1 * s, 0.13 * s, 0.32 * s, 0.22 * s, 0x2a1a10);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.cyl(0, H * 0.95, 0, R * 2.3, 0.05, hat, { seg: 22 });
      hb.cyl(0, H * 0.95, 0, R * 1.08, H * 0.62, hat, { seg: 16 });
      hb.cyl(0, H * 1.0, 0, R * 1.1, H * 0.12, 0x2a1a10, { seg: 16 });
      for (const sd of [-1, 1]) rod(hb, [sd * R * 0.95, H * 0.45, R * 0.2], [sd * R * 0.45, H * 0.2, R * 0.9], R * 0.09, 0x9a9a9a, 6);
    },
  });
  const guns = [1, -1].map((sd) => handAt(r, sd, blaster('bane', 1, { flash: false })));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win']);
    const spin = name === 'cheer' ? (f < 0.6 ? f / 0.6 * PI * 6 : 0) : name === 'win' ? (t * 9) % (PI * 2) : 0;
    for (let i = 0; i < 2; i++) {
      const g = guns[i];
      g.visible = k > 0;
      g.rotation.x = i ? spin : -spin;
      shoot(g, name === 'cheer' && f > 0.62, t, 5, i * 0.5);
    }
  };
  return r;
}

// Stormtrooper, as the LEGO minifig: the moulded helmet and the armour prints are the track
// figure's (../maps/starwars-props.js); black C-hands, and an E-11 slung on the back.
const TW = 0xf4f4f4, TB = 0x161618;
function trooper() {
  const A = trooperPrints(), tilt = -Math.atan(0.02 / 0.82);
  const r = seatedFig({
    name: 'trooper', torso: TW, arms: TW, legs: TW, hips: TW, hands: TB, skin: TW, neck: TB,
    headR: 0.31, headH: 0.5, noStud: true, extraHeight: 0.2,
    head: (hb, d) => trooperHelmet(hb, d.headR),
    torsoExtra: (b, d) => {
      const s = d.s;
      // torso prints front and back (on the tapered torso), thigh prints on the seated thighs
      printQuad(b, A.mat, A.rg.drvF, 0.92 * s, 0.7 * s, 0.82 * s, 0, d.chestY, 0.233 * s, tilt);
      printQuad(b, A.mat, A.rg.drvB, 0.92 * s, 0.7 * s, 0.82 * s, 0, d.chestY, -0.233 * s, tilt, PI);
      for (const sd of [-1, 1]) printQuad(b, A.mat, A.rg.thigh, 0.4 * s, 0.4 * s, 0.7 * s, sd * 0.22 * s, 0.183 * s, 0.67 * s, -PI / 2, 0, sd > 0);
    },
    arm: (ab, sd, d) => cHand(ab, TB, 0, -0.76 * d.s, 0, 0.1 * d.s, sd),
  });
  const gun = handAt(r, -1, blaster('rifle', 1));
  // the E-11 rides slung across the back until it's drawn
  const s = r.dims.s, slung = blaster('rifle', 1, { bolts: false, flash: false });
  slung.position.set(0.05 * s, 0.6 * s, -0.25 * s); slung.rotation.set(0, PI, -0.95);
  r.torso.add(slung);
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'throwF']);
    gun.visible = k > 0;
    slung.visible = !gun.visible;
    shoot(gun, (name === 'cheer' && f > 0.15) || name === 'win', t, 6);
  };
  return r;
}

function jawaHead(hb, R, H, robe, y = 0) {
  hb.sphere(0, y + H * 0.55, -R * 0.05, R * 1.05, robe, { sy: 1.0 });
  hb.addMatrix(CONE(), plastic(robe), mat4(0, y + H * 1.2, -R * 0.45, -0.55, 0, 0, R * 0.6, R * 1.3, R * 0.6));
  hb.cyl(0, y - H * 0.05, 0, R * 1.05, H * 0.4, robe, { seg: 14 });
  rod(hb, [0, y + H * 0.5, R * 0.55], [0, y + H * 0.5, R * 1.0], R * 0.7, 0x0c0806, 14);
  for (const sd of [-1, 1]) hb.sphere(sd * R * 0.3, y + H * 0.54, R * 0.98, R * 0.16, 0, { mat: glowMat(0xffd21a, 3.2) });
}
function jawa() {
  const robe = 0x6b4a2e, dk = 0x2a1a10;
  const r = seatedFig({
    name: 'jawa', s: 0.9, torso: robe, arms: robe, legs: robe, hips: robe, hands: dk, skin: robe, neck: robe, headR: 0.34, headH: 0.5,
    head: (hb, d) => jawaHead(hb, d.headR, d.headH, robe),
    extraHeight: 0.25,
    torsoExtra: (b, d) => {
      const s = d.s;
      rbox(b, 0, 0.55 * s, 0.24 * s, 0.12 * s, 0.95 * s, 0.03 * s, 0, 0, 0.6, dk);
      for (let k = 0; k < 4; k++) rbox(b, (-0.2 + k * 0.13) * s, (0.4 + k * 0.1) * s, 0.26 * s, 0.07 * s, 0.08 * s, 0.03 * s, 0, 0, 0.6, 0x8a8e92);
      b.box(0, d.chestY, 0, 0.95 * s, 0.09 * s, 0.5 * s, dk);
    },
  });
  // a second Jawa hitching a ride on the back
  const hiker = new THREE.Group(); hiker.position.set(0.45, 0.3, -0.8); hiker.rotation.y = -0.35;
  const hb = new BrickBuilder(1);
  hb.addMatrix(CONE(), plastic(robe), mat4(0, 0.3, 0, 0, 0, 0, 0.3, 0.75, 0.3));
  for (const sd of [-1, 1]) rod(hb, [sd * 0.16, 0.5, 0.0], [sd * 0.3, 0.75, 0.12], 0.07, robe, 6);
  jawaHead(hb, 0.21, 0.3, robe, 0.6);
  hiker.add(hb.build({ name: 'jawa2' }));
  r.root.add(hiker);
  const rest = hiker.position.y;
  r.fx = (name, f, t) => {
    const party = name === 'cheer' || name === 'win' || name === 'trick';
    hiker.position.y = rest + (party ? A(S(t * 11)) * 0.22 : 0);
    hiker.rotation.z = party ? S(t * 11) * 0.15 : 0;
  };
  return r;
}

// Tusken Raider: a bandage-wrapped head under a hooded cloak, round goggle eyes on metal
// tubes, the spiked breath mask, layered robes with crossed bandoliers and a gaffi stick.
const TK_WRAP = 0xc9b38e, TK_WRAP2 = 0xa88f68, TK_WRAP3 = 0xdcc9a4, TK_CLOAK = 0x6e5236, TK_ROBE = 0x9a7c56, TK_LEATHER = 0x5a3e24;
const tuskenFace = (R, Hc) => printFace('swd-tusken', R, Hc, '#c9b38e', (g) => {
  const cols = ['#bca47c', '#d6c49f', '#ad936c', '#c9b38e', '#cbb690'];
  for (let k = 0; k < 18; k++) {
    const v = -0.12 + k * 0.042, sl = (k % 2 ? 1 : -1) * (0.05 + (k % 3) * 0.02);
    poly(g, cols[k % 5], [[-1.3, v - sl], [1.3, v + sl], [1.3, v + sl + 0.05], [-1.3, v - sl + 0.05]]);
    poly(g, '#8a7350', [[-1.3, v - sl], [1.3, v + sl], [1.3, v + sl + 0.007], [-1.3, v - sl + 0.007]]);
  }
  // soot round the goggles and the mouth
  for (const sd of [-1, 1]) ellipse(g, sd * 0.17, Hc * 0.62, 0.11, 0.085, 'rgba(70,52,34,0.55)');
  ellipse(g, 0, Hc * 0.27, 0.12, 0.09, 'rgba(70,52,34,0.5)');
});
function tuskenHead(hb, R, H) {
  const Hc = H * 0.9, mt = metalMat(0xa4a8ae, 0.32), dm = metalMat(0x50545a, 0.4), lens = plastic(0x0c0c0e, { rough: 0.12 });
  hb.add(HEADCYL(), tuskenFace(R, Hc), 0, 0, 0, PI, R, Hc, R);
  hb.sphere(0, Hc - 0.02, 0, R * 1.03, TK_WRAP, { sy: 0.62 });            // wrapped crown
  hb.sphere(0, Hc + R * 0.42, -R * 0.08, R * 0.5, TK_WRAP2, { sy: 0.55 });  // knot of cloth on top
  // loose bandage bands, each a little skewed
  for (const [y, rx, rz, c] of [[0.9, -0.14, 0.1, TK_WRAP2], [1.0, 0.12, -0.08, TK_WRAP3], [0.06, -0.1, -0.1, TK_WRAP2], [0.4, 0.2, 0.05, TK_WRAP3]]) {
    hb.addMatrix(HEADCYL(), plastic(c), mat4(0, H * y * 0.9, 0, rx, 0, rz, R * 1.05, H * 0.065, R * 1.05));
  }
  hb.add(FLARE(), plastic(TK_CLOAK), 0, -H * 0.12, -R * 0.04, 0, R * 1.1, H * 1.0, R * 1.1);       // hood down the back
  hb.addMatrix(HOOD(), plastic(TK_CLOAK), mat4(0, Hc * 0.95, -R * 0.08, -0.1, 0, 0, R * 1.12, R * 0.74, R * 1.1));
  // round goggle eyes on metal tubes
  const gy = Hc * 0.62;
  for (const sd of [-1, 1]) {
    const a = sd * 0.42;
    rod(hb, onHead(a, gy, R * 0.8), onHead(a * 0.85, gy, R * 1.22), R * 0.2, mt, 12);
    rod(hb, onHead(a * 0.85, gy, R * 1.2), onHead(a * 0.83, gy, R * 1.32), R * 0.245, dm, 12);
    rod(hb, onHead(a * 0.83, gy, R * 1.3), onHead(a * 0.83, gy, R * 1.335), R * 0.17, lens, 12);
  }
  rbox(hb, 0, gy, R * 1.04, R * 0.3, Hc * 0.07, R * 0.12, 0, 0, 0, 0, { mat: mt });    // nose bridge
  rbox(hb, 0, Hc * 0.45, R * 1.02, R * 0.14, Hc * 0.28, R * 0.12, 0, 0, 0, 0, { mat: dm });
  // breath mask with its "teeth"
  const my = Hc * 0.27;
  rod(hb, onHead(0, my + 0.01, R * 0.85), onHead(0, my, R * 1.18), R * 0.23, mt, 12);
  rod(hb, onHead(0, my, R * 1.17), onHead(0, my, R * 1.2), R * 0.17, dm, 12);
  for (const ph of [-1.3, -0.65, 0, 0.65, 1.3]) {
    const x = Math.sin(ph) * R * 0.17, y = my - Math.cos(ph) * R * 0.17;
    hb.addMatrix(CONE(), mt, mat4(x, y - R * 0.04, R * 1.3, PI / 2 + 0.45, 0, -ph * 0.3, R * 0.05, R * 0.3, R * 0.05));
  }
}
function tusken() {
  const tunic = 0xb79b72, pouch = 0x6a4a2a;
  const r = seatedFig({
    name: 'tusken', torso: tunic, arms: TK_WRAP, legs: TK_ROBE, hips: TK_CLOAK, hands: 0x6e5438, skin: TK_WRAP, neck: TK_WRAP2,
    headR: 0.31, headH: 0.52, noStud: true, extraHeight: 0.21,
    head: (hb, d) => tuskenHead(hb, d.headR, d.headH),
    torsoExtra: (b, d) => {
      const s = d.s, ck = plastic(TK_CLOAK);
      // over-robe panels down the front edges, cloak mantle with a ragged hem, cape behind
      for (const sd of [-1, 1]) rbox(b, sd * 0.34 * s, 0.5 * s, 0.24 * s, 0.24 * s, 0.66 * s, 0.03 * s, -0.03, 0, 0, TK_ROBE);
      b.add(taperGeo(1.0, 0.8, 0.22, 0.54, 0.5), ck, 0, 0.82 * s, 0, 0, s, s, s);
      for (let k = 0; k < 9; k++) rbox(b, (-0.42 + k * 0.105) * s, (0.8 - (k % 2) * 0.035) * s, 0.25 * s, 0.1 * s, 0.1 * s, 0.03 * s, 0, 0, ((k % 3) - 1) * 0.25, TK_CLOAK);
      b.box(0, -0.05 * s, -0.27 * s, 1.0 * s, 1.05 * s, 0.07 * s, TK_CLOAK);
      for (let k = 0; k < 6; k++) rbox(b, (-0.42 + k * 0.17) * s, -0.06 * s, -0.27 * s, 0.12 * s, 0.1 * s, 0.07 * s, 0, 0, ((k % 3) - 1) * 0.3, TK_CLOAK);
      // crossed bandoliers with pouches and a canteen
      for (const sd of [-1, 1]) rbox(b, 0, 0.56 * s, 0.252 * s, 0.11 * s, 0.98 * s, 0.03 * s, -0.03, 0, sd * 0.62, TK_LEATHER);
      for (let k = 0; k < 4; k++) {
        const t = -0.3 + k * 0.2;
        rbox(b, -Math.sin(0.62) * t * s, (0.56 + Math.cos(0.62) * t) * s, 0.27 * s, 0.08 * s, 0.09 * s, 0.04 * s, 0, 0, 0.62, k === 1 ? 0x8a8e92 : pouch);
      }
      rod(b, [0.24 * s, 0.4 * s, 0.25 * s], [0.24 * s, 0.4 * s, 0.31 * s], 0.08 * s, 0x8a8e92, 10);
      // cloth sash, leather belt, a flap of cloth hanging over the lap
      b.box(0, d.chestY - 0.03 * s, 0, 0.97 * s, 0.16 * s, 0.51 * s, TK_WRAP2);
      b.box(0, d.chestY + 0.02 * s, 0, 0.975 * s, 0.05 * s, 0.515 * s, TK_LEATHER);
      rbox(b, 0, d.chestY + 0.045 * s, 0.262 * s, 0.09 * s, 0.08 * s, 0.02 * s, 0, 0, 0, 0x8a8e92);
      for (const sd of [-1, 1]) rbox(b, sd * 0.36 * s, d.chestY - 0.01 * s, 0.24 * s, 0.13 * s, 0.14 * s, 0.08 * s, 0, 0, 0, pouch);
      rbox(b, 0.08 * s, d.chestY - 0.12 * s, 0.27 * s, 0.22 * s, 0.26 * s, 0.03 * s, 0.25, 0, 0.08, TK_ROBE);
    },
    arm: (ab, sd, d) => {
      const s = d.s;
      ab.sphere(sd * 0.015 * s, -0.01 * s, 0, 0.15 * s, TK_CLOAK, { sy: 0.8 });   // the cloak over the shoulder
      ab.add(taperGeo(0.28, 0.3, 0.3, 0.3), plastic(TK_ROBE), 0, -0.38 * s, 0, 0, s, s, s);   // loose robe sleeve
      for (let k = 0; k < 3; k++) rbox(ab, 0, (-0.42 - k * 0.075) * s, 0, 0.255 * s, 0.028 * s, 0.275 * s, 0, 0, (k % 2 ? 0.22 : -0.22), TK_WRAP2);
      ab.box(0, -0.62 * s, 0, 0.25 * s, 0.06 * s, 0.27 * s, TK_LEATHER);
    },
  });
  const stick = handAt(r, -1, gaffi(1));
  // the gaffi stick rides on his back, blade up over the shoulder, until he brandishes it
  const s = r.dims.s, slung = gaffi(1);
  slung.position.set(0.02 * s, 0.78 * s, -0.36 * s); slung.rotation.z = -1.2;
  r.torso.add(slung);
  r.fx = (name, f) => {
    stick.visible = strength(name, f, ['cheer', 'win', 'taunt', 'trick']) > 0;
    slung.visible = !stick.visible;
  };
  return r;
}

// ---- gestures -------------------------------------------------------------------------
const tauntArm = (a, x, z) => (a.tauntSide > 0 ? { lx: x, lz: z } : { rx: x, rz: -z });

export default [
  {
    id: 'luke', name: 'Luke Skywalker', blurb: 'Farm boy turned Jedi', weight: 'medium', color: 0x3d8bff,
    voice: { kind: 'human', pitch: 1.08 }, style: { cheer: 'fist', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.3 + S(t * 9) * 0.12, rz: -0.45, lx: -2.6 + S(t * 14) * 0.25, lz: 0.25, ty: -0.12, hx: -0.25, by: A(S(t * 9)) * 0.06 }),
      win: (f, t) => ({ rx: -1.2 + S(t * 4) * 0.15, rz: -0.4 + S(t * 4) * 0.1, lx: -2.7, lz: 0.35 + S(t * 8) * 0.25, hx: -0.25, by: A(S(t * 8)) * 0.07 }),
    },
    build: luke,
  },
  {
    id: 'leia', name: 'Princess Leia', blurb: 'Rebel leader, sharp shot', weight: 'light', color: 0xf4f4f4,
    voice: { kind: 'human', pitch: 1.38 }, style: { cheer: 'point', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.75 + (S(t * 25) > 0.5 ? -0.12 : 0), rz: -0.05, ty: -0.2, hx: -0.1, hy: -0.15, lx: -0.9 }),
      win: (f, t) => ({ rx: -2.7 + S(t * 25) * 0.05, rz: -0.2, lx: -2.5, lz: 0.3 + S(t * 9) * 0.45, hx: -0.25, by: A(S(t * 6)) * 0.05 }),
    },
    build: leia,
  },
  {
    id: 'han', name: 'Han Solo', blurb: 'Scoundrel. Shoots first', weight: 'medium', color: 0x23304a,
    voice: { kind: 'human', pitch: 0.92 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => (f < 0.58 ? { rx: -1.45, rz: -0.25, hz: 0.18, hx: -0.05, ty: -0.1 } : { rx: -1.7, rz: -0.05, ty: -0.25, hz: 0.12, hx: -0.05 }),
      taunt: (f, t, rig, a) => ({ ...tauntArm(a, -2.55, 0.8), hy: a.tauntSide * 0.9, hz: 0.18, ty: a.tauntSide * 0.2 }),
      win: (f, t) => ({ lx: -3.4, lz: -0.5, rx: -3.4, rz: 0.5, tx: -0.22, hx: -0.12, hz: S(t * 2) * 0.1, by: 0.02 }),
    },
    build: han,
  },
  {
    id: 'chewie', name: 'Chewbacca', blurb: 'Mighty Wookiee co-pilot', weight: 'heavy', color: 0x8a6440,
    voice: { kind: 'beast', pitch: 0.78 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ hx: -0.7, jaw: 0.85 + S(t * 30) * 0.15, lz: 0.8, rz: -0.8, lx: -2.2 + S(t * 12) * 0.3, rx: -2.2 - S(t * 12) * 0.3, tx: -0.22, tz: S(t * 40) * 0.05 }),
      win: (f, t) => ({ lx: -2.8, rx: -2.8, lz: 0.5 + S(t * 9) * 0.2, rz: -0.5 - S(t * 9) * 0.2, jaw: 0.6 + S(t * 12) * 0.35, hx: -0.5, by: A(S(t * 9)) * 0.08 }),
    },
    build: chewie,
  },
  {
    id: 'r2d2', name: 'R2-D2', blurb: 'Plucky astromech droid', weight: 'light', color: 0x1f55b8,
    voice: { kind: 'droid', pitch: 1.0 }, style: { cheer: 'beep', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.6 + S(t * 16) * 0.6, rx: -1.6 - S(t * 16) * 0.6, by: A(S(t * 12)) * 0.12, tz: S(t * 12) * 0.12 }),
      win: (f, t) => ({ lx: -1.7 + S(t * 14) * 0.5, rx: -1.7 - S(t * 14) * 0.5, by: A(S(t * 7)) * 0.1, tz: S(t * 7) * 0.14 }),
      taunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.5, tz: a.tauntSide * 0.16, by: A(S(t * 18)) * 0.05 }),
      trick: (f) => ({ by: S(f * PI) * 0.3, lx: -0.2, rx: -0.2, tx: 0.12 }),
    },
    build: r2d2,
  },
  {
    id: 'c3po', name: 'C-3PO', blurb: 'Fluent in six million...', weight: 'medium', color: GOLD,
    voice: { kind: 'robot', pitch: 1.22 }, style: { cheer: 'clap', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.5 + S(t * 22) * 0.75, rx: -1.5 + S(t * 22 + 3) * 0.75, lz: 0.45, rz: -0.45, hy: S(t * 11) * 0.35, tz: S(t * 22) * 0.04, hx: -0.15 }),
      ouch: (f, t) => ({ lx: -2.9 + S(t * 30) * 0.1, rx: -2.9 - S(t * 30) * 0.1, lz: 0.35, rz: -0.35, tx: -0.25, hx: -0.35, tz: S(t * 30) * 0.05, hy: S(t * 15) * 0.3 }),
      taunt: (f) => ({ tx: 0.4 * S(f * PI), hx: 0.3 * S(f * PI), lx: -0.5, rx: -0.5, lz: 0.2, rz: -0.2 }),
      win: (f, t) => ({ lx: -1.6 + S(t * 18) * 0.7, rx: -1.6 + S(t * 18 + 3) * 0.7, lz: 0.4, rz: -0.4, hy: S(t * 9) * 0.3, by: A(S(t * 9)) * 0.05 }),
    },
    build: c3po,
  },
  {
    id: 'mando', name: 'The Mandalorian', blurb: 'This is the way', weight: 'medium', color: BESKAR,
    voice: { kind: 'human', pitch: 0.85 }, style: { cheer: 'point', trick: 'superman' },
    gestures: {
      cheer: (f, t) => (f < 0.7 ? { rx: -1.55, rz: -0.25, hx: -0.05, hz: S(t * 5) * 0.06 } : { rx: -1.75, rz: -0.05, ty: -0.22, hx: -0.05 }),
      taunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.1, ty: a.tauntSide * 0.25, hx: 0.3 * A(S(f * PI * 2)) }),
      win: (f, t) => ({ rx: -1.6, rz: -0.3, lx: -0.8, hx: -0.1, hz: S(t * 2) * 0.06 }),
    },
    build: mando,
  },
  {
    id: 'grogu', name: 'Grogu', blurb: 'Small, green, Force-strong', weight: 'light', color: 0x8ab070,
    voice: { kind: 'squeak', pitch: 1.55 }, style: { cheer: 'wave', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ rx: -2.1 + S(t * 3) * 0.08, rz: -0.25, hz: 0.25, hx: -0.15, hy: -0.2, lx: -0.6 }),
      win: (f, t) => ({ rx: -2.2, rz: -0.3, lx: -2.2 + S(t * 10) * 0.3, lz: 0.3, hz: S(t * 5) * 0.2, by: A(S(t * 5)) * 0.06 }),
      use: (f, t) => ({ rx: -2.1, rz: -0.25, hz: 0.25, hx: -0.15 }),
    },
    build: grogu,
  },
  {
    id: 'vader', name: 'Darth Vader', blurb: 'Dark Lord of the Sith', weight: 'heavy', color: 0xff2010,
    voice: { kind: 'deep', pitch: 0.6 }, style: { cheer: 'point', trick: 'arms' },
    gestures: {
      // the Force choke: right hand out, pinching, trembling
      cheer: (f, t) => ({ rx: -1.5 + S(t * 45) * 0.025, rz: 0.08, ty: -0.22, hx: -0.06, hz: 0.1, lx: -0.85, tx: 0.05 }),
      taunt: (f, t, rig, a) => ({ ...tauntArm(a, -1.55, 0.7), hy: a.tauntSide * 0.9, ty: a.tauntSide * 0.25 }),
      win: (f, t) => ({ rx: -1.35, rz: -0.3, lx: -0.9, lz: 0.1, hx: -0.08, by: S(t * 2.4) * 0.02 }),
    },
    build: vader,
  },
  {
    id: 'maul', name: 'Darth Maul', blurb: 'Double-bladed menace', weight: 'medium', color: 0xb3141c,
    voice: { kind: 'deep', pitch: 0.95 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.55, rz: -0.2, ty: -0.15, hx: -0.12, by: A(S(t * 12)) * 0.04 }),
      win: (f, t) => ({ rx: -2.95, rz: 0.1, lx: -1.1, lz: 0.2, hx: -0.3, by: A(S(t * 8)) * 0.05 }),
    },
    build: maul,
  },
  {
    id: 'boba', name: 'Boba Fett', blurb: 'Jetpack bounty hunter', weight: 'medium', color: 0x5a6b3a,
    voice: { kind: 'human', pitch: 0.8 }, style: { cheer: 'fist', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ by: S(f * PI) * 0.3, rx: -2.6 + S(t * 14) * 0.3, rz: -0.2, hx: -0.25, tz: S(t * 7) * 0.05 }),
      win: (f, t) => ({ by: 0.12 + S(t * 4) * 0.06, rx: -2.6, rz: -0.25, lx: -1.7, lz: 0.3, hx: -0.2 }),
    },
    build: boba,
  },
  {
    id: 'cadbane', name: 'Cad Bane', blurb: 'Fastest draw in the galaxy', weight: 'medium', color: 0x3a68aa,
    voice: { kind: 'human', pitch: 0.72 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.55, rx: -1.55, lz: 0.05, rz: -0.05, hx: -0.06, hz: S(t * 4) * 0.1, tx: 0.06 }),
      taunt: (f, t, rig, a) => ({ rx: -2.75, rz: 0.55, hx: 0.25 * S(f * PI), hy: -a.tauntSide * 0.3 }),
      win: (f, t) => ({ lx: -2.3, rx: -2.3, lz: 0.4, rz: -0.4, hx: -0.15, tx: -0.08 }),
    },
    build: cadBane,
  },
  {
    id: 'trooper', name: 'Stormtrooper', blurb: 'Rarely hits the target', weight: 'medium', color: 0xe8e8e8,
    voice: { kind: 'robot', pitch: 0.95 }, style: { cheer: 'point', trick: 'arms' },
    gestures: {
      // sprays blaster fire in every direction except the target
      cheer: (f, t) => ({ rx: -1.65 + S(t * 6) * 0.35, rz: -0.1, lx: -1.5, lz: -0.55, ty: S(t * 4) * 0.45, hy: S(t * 4) * 0.35 }),
      win: (f, t) => ({ rx: -2.6, rz: -0.2, lx: -2.4, lz: 0.4 + S(t * 9) * 0.3, hx: -0.2, by: A(S(t * 6)) * 0.05 }),
    },
    build: trooper,
  },
  {
    id: 'jawas', name: 'Jawas', blurb: 'Utinni! Scrap traders', weight: 'light', color: 0xffd21a,
    voice: { kind: 'squeak', pitch: 1.65 }, style: { cheer: 'both', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ lx: -2.9, rx: -2.9, lz: 0.4 + S(t * 16) * 0.25, rz: -0.4 - S(t * 16) * 0.25, by: A(S(t * 9)) * 0.16, hx: -0.3, tz: S(t * 9) * 0.08 }),
      win: (f, t) => ({ lx: -2.9, rx: -2.9, lz: 0.4 + S(t * 14) * 0.25, rz: -0.4 - S(t * 14) * 0.25, by: A(S(t * 7)) * 0.14, hx: -0.3 }),
    },
    build: jawa,
  },
  {
    id: 'tusken', name: 'Tusken Raider', blurb: 'Sand People warrior', weight: 'medium', color: 0xc8b090,
    voice: { kind: 'beast', pitch: 1.15 }, style: { cheer: 'both', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: -2.55 + S(t * 18) * 0.22, rx: -2.55 + S(t * 18) * 0.22, lz: -0.32, rz: 0.32, tx: -0.12, hx: -0.35, by: A(S(t * 9)) * 0.08, tz: S(t * 9) * 0.08 }),
      win: (f, t) => ({ lx: -2.6 + S(t * 10) * 0.2, rx: -2.6 + S(t * 10) * 0.2, lz: -0.32, rz: 0.32, hx: -0.35, by: A(S(t * 5)) * 0.08 }),
      taunt: (f, t, rig, a) => ({ rx: -2.4 + S(t * 16) * 0.25, rz: -0.3, hy: a.tauntSide * 1.0, ty: a.tauntSide * 0.3 }),
    },
    build: tusken,
  },
];
