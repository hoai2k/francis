// Helpers for the Harry Potter drivers (see ./potter.js and ../driver.js for the rig
// contract): a seated minifig with a canvas face, printed robe front (house tie, crest,
// Weasley jumper letters…), driver-scale hair / hats / scarves, a wand in the right hand
// and spell effects (bolts, spark bursts, Patronus animals, phoenix, Dark Mark, fireworks).
import { THREE, BrickBuilder, C, plastic, seatedFig, rbox, rod, mat4, cached, taperGeo, faceMat } from './kit.js';

export { THREE, BrickBuilder, C, plastic, rbox, rod, mat4, cached, taperGeo };
export const S = Math.sin, PI = Math.PI, abs = Math.abs, UP = -2.75;
export const LOOP = (PI * 2) / 1.6;   // one cycle of the looped win pose
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (f, a, b) => clamp01((f - a) / (b - a));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const bump = (f, a, b) => Math.sin(PI * seg(f, a, b));
export const winF = (t) => (t % 1.6) / 1.6;
export const vis = (o, on) => { if (o.visible !== on) o.visible = on; };

// house colours
export const H = {
  gry: { a: 0x8a1010, b: 0xd9a820 }, sly: { a: 0x1d5a32, b: 0xb8bcc0 },
  rav: { a: 0x1e3a8a, b: 0xa8783a }, huf: { a: 0xe8b820, b: 0x1b1b1b },
};
export const ROBE = 0x1c1c22, SKIN = 0xe9b48c, PALE = 0xdcd8cc, WOOD = 0x6a4022;
const hex = (c) => '#' + new THREE.Color(c).getHexString();

// ---- glow / fx materials -----------------------------------------------------------------
let gTex = null;
function glowTex() {
  if (gTex) return gTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  gTex = new THREE.CanvasTexture(c);
  return gTex;
}
const mats = new Map();
const once = (k, make) => { let m = mats.get(k); if (!m) { m = make(); mats.set(k, m); } return m; };
export const spriteMat = (c, op = 0.9) => once(`spr${c}|${op}`, () => new THREE.SpriteMaterial({ map: glowTex(), color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
export const fxMat = (c, op = 0.85) => once(`fx${c}|${op}`, () => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
export const neon = (c, k = 2.2) => plastic(c, { emissive: c, emissiveIntensity: k });
export function addGlow(parent, color, size, x = 0, y = 0, z = 0, op = 0.9) {
  const s = new THREE.Sprite(spriteMat(color, op)); s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s;
}
export function fxg(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.visible = false; parent.add(g); return g; }

// ---- faces -------------------------------------------------------------------------------
// draw(P) paints in "round" coordinates: origin at the face centre, x ±110 = the visible
// front of the head, y ±64 top/bottom (features don't look stretched on the cylinder).
export function face(key, skin, draw) {
  return faceMat('hp-' + key, (g) => {
    g.save(); g.translate(128, 64); g.scale(0.57, 1);
    const P = {
      g,
      ell: (x, y, rx, ry, col, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, PI * 2); g.fill(); },
      ring: (x, y, rx, ry, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, PI * 2); g.stroke(); },
      line: (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); },
      poly: (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); },
      arc: (x, y, r, a0, a1, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); },
    };
    // standard features
    P.eyes = ({ y = -6, dx = 24, col = '#1b1b1b', r = 7 } = {}) => { for (const s of [-1, 1]) { P.ell(s * dx, y, r, r * 1.2, col); P.ell(s * dx + 2, y - 3, r * 0.32, r * 0.32, '#fff'); } };
    P.brows = ({ y = -22, dx = 24, col = '#2a1a10', w = 5, tilt = 0 } = {}) => { for (const s of [-1, 1]) P.line([[s * (dx - 12), y + tilt * 4], [s * (dx + 12), y - tilt * 4]], col, w); };
    P.smile = (col = '#1b1b1b', y = 18, r = 18) => P.arc(0, y - r * 0.7, r, 0.25 * PI, 0.75 * PI, col, 5);
    P.grin = (y = 14) => { g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(0, y, 20, 0.05 * PI, 0.95 * PI); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-14, y + 1, 28, 5); };
    P.smirk = (col = '#1b1b1b', y = 22) => P.line([[-14, y + 2], [6, y + 3], [18, y - 5]], col, 5);
    P.flat = (col = '#1b1b1b', y = 24) => P.line([[-13, y], [13, y]], col, 5);
    P.glasses = ({ y = -6, dx = 25, r = 15, col = '#151515', w = 5, sq = false } = {}) => {
      for (const s of [-1, 1]) { if (sq) { g.strokeStyle = col; g.lineWidth = w; g.strokeRect(s * dx - r, y - r * 0.75, r * 2, r * 1.5); } else P.ring(s * dx, y, r, r, col, w); }
      P.line([[-dx + r, y - 1], [dx - r, y - 1]], col, w);
      for (const s of [-1, 1]) P.line([[s * (dx + r), y - 2], [s * (dx + r + 26), y - 5]], col, w * 0.8);
    };
    P.freckles = (col = '#c87a4a') => { for (const [x, y] of [[-34, 8], [-26, 12], [-40, 14], [34, 8], [26, 12], [40, 14], [-8, 6], [8, 6]]) P.ell(x, y, 2.4, 2.4, col); };
    P.cheeks = (col = 'rgba(230,110,110,0.35)') => { for (const s of [-1, 1]) P.ell(s * 38, 12, 9, 6, col); };
    draw(P);
    g.restore();
  }, hex(skin));
}

// ---- printed fronts ------------------------------------------------------------------------
// A canvas decal (128 x 160, centre x = 64) laid on the torso front. draw(P) uses pixel coords.
const planeGeo = () => cached('hpPlane', () => new THREE.PlaneGeometry(1, 1));
export function decal(key, draw) {
  return once('dec' + key, () => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 160;
    const g = c.getContext('2d');
    const P = {
      g,
      poly: (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); },
      rect: (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); },
      line: (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); },
      dot: (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); },
      text: (s, x, y, size, col) => { g.fillStyle = col; g.font = `bold ${size}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); },
    };
    draw(P);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, roughness: 0.45 });
  });
}
// school uniform under an open robe: grey jumper V, white collar, striped house tie, crest
export function schoolFront(house, o = {}) {
  const hc = H[house];
  return decal(`school-${house}-${o.jumper || ''}`, (P) => {
    P.poly([[30, 0], [98, 0], [84, 160], [44, 160]], hex(o.jumper ?? 0x6a6a70));
    P.poly([[44, 0], [84, 0], [64, 62]], '#f2f2f2');
    P.poly([[40, 0], [62, 10], [50, 22]], '#ffffff'); P.poly([[88, 0], [66, 10], [78, 22]], '#ffffff');
    P.poly([[58, 8], [70, 8], [73, 72], [64, 84], [55, 72]], hex(hc.a));
    for (let k = 0; k < 5; k++) P.poly([[55, 18 + k * 13], [73, 10 + k * 13], [73, 16 + k * 13], [55, 24 + k * 13]], hex(hc.b));
    if (!o.noCrest) { P.poly([[96, 34], [116, 34], [116, 50], [106, 60], [96, 50]], hex(hc.a)); P.poly([[100, 38], [112, 38], [112, 49], [106, 55], [100, 49]], hex(hc.b)); }
  });
}
// hand-knitted Weasley jumper with a big initial
export function jumperFront(letter, col, ink = 0xe8c040) {
  return decal(`jumper-${letter}`, (P) => {
    P.rect(0, 0, 128, 160, hex(col));
    for (let y = 8; y < 160; y += 10) P.line([[4, y], [124, y]], 'rgba(0,0,0,0.12)', 2);
    P.poly([[44, 0], [84, 0], [64, 20]], '#f2f2f2');
    P.text(letter, 64, 82, 70, hex(ink));
  });
}
export function frontPlane(b, d, mat) {
  const s = d.s, W = d.W;
  b.add(planeGeo(), mat, 0, d.chestY + 0.41 * s, 0.232 * s * d.D + 0.004, 0, 0.72 * s * W, 0.8 * s, 1);
}

// ---- figure --------------------------------------------------------------------------------
// fig(o): seatedFig with a canvas face (o.face material), hair o.hair(b, r, h, d) in the head
// builder, a decal front (o.front material) and o.torsoExtra for scarves/collars.
export function fig(o) {
  const s = o.s ?? 1.3;
  return seatedFig({
    noStud: true, headR: 0.31, headH: 0.5, extraHeight: 0.15, torso: ROBE, arms: ROBE, legs: 0x2a2a30, hips: ROBE, skin: SKIN, ...o, s,
    headExtra: (hb, d) => o.hair?.(hb, d.headR, d.headH, d),
    torsoExtra: (b, d) => { if (o.front) frontPlane(b, d, o.front); o.torsoExtra?.(b, d); },
  });
}
export const handY = (rig) => -0.62 * rig.dims.s;

// ---- hair / hats (r = head radius, h = head height, head base at y 0) -------------------
export function cap(b, r, h, col, lo = 0.8, k = 1.08) {
  b.cyl(0, h * lo, 0, r * k, h * (1 - lo) + 0.03, col, { seg: 16 });
  b.sphere(0, h + 0.02, 0, r * k, col, { sy: 0.32 });
}
export function back(b, r, h, col, lo = 0.25, hi = 0.9, k = 1.07) { b.cyl(0, h * lo, -r * 0.3, r * k, h * (hi - lo), col, { seg: 16 }); }
// long hair falling behind the shoulders (y may go below the head)
export function long(b, r, h, col, lo = -0.45, w = 1.15) {
  b.box(0, h * lo, -r * 0.55, r * 2 * w, h * (0.9 - lo), r * 0.9, col);
  for (const sd of [-1, 1]) b.box(sd * r * 0.95, h * Math.max(lo, -0.15), -r * 0.1, r * 0.3, h * (0.85 - Math.max(lo, -0.15)), r * 1.1, col);
}
// messy tufts: n small blobs round the crown
export function tufts(b, r, h, col, n, size = 0.3, { y = 0.95, ring = 0.8, seed = 3, front = 1 } = {}) {
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * PI * 2 + rnd() * 0.4, rr = ring * r * (0.8 + rnd() * 0.3);
    const z = Math.cos(a) * rr;
    if (z > r * 0.5 && !front) continue;
    b.sphere(Math.sin(a) * rr, h * y + rnd() * h * 0.12, z, r * size * (0.8 + rnd() * 0.5), col, { sy: 0.8 });
  }
}
// fringe over the forehead: a sloped slab
export function fringe(b, r, h, col, side = 0, y = 0.84) { rbox(b, side * r * 0.25, h * y, r * 0.78, r * 1.6, h * 0.2, r * 0.42, 0.5, 0, side * 0.25, col); }
// bushy volume: a cloud of spheres
export function bush(b, r, h, col, n, size, { y0 = 0.2, y1 = 1.05, spread = 1.15, seed = 7, frontCut = 0.55 } = {}) {
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const a = rnd() * PI * 2, yy = lerp(y0, y1, rnd());
    let x = Math.sin(a) * r * spread, z = Math.cos(a) * r * spread;
    if (z > r * frontCut && yy < 0.9) { z = r * frontCut; x *= 1.25; }
    b.sphere(x, h * yy, z - r * 0.15, r * size * (0.75 + rnd() * 0.5), col);
  }
}
// pointed wizard hat: brim + bent cone (lean tips the point backwards)
const coneG = (n = 14) => cached('hpCone' + n, () => new THREE.ConeGeometry(1, 1, n).translate(0, 0.5, 0));
export function wizardHat(b, r, h, col, { brim = 1.7, tall = 1.25, y = 0.92, lean = 0.35, band = null, stars = null } = {}) {
  b.cyl(0, h * y, 0, r * brim, 0.03, col, { seg: 20 });
  b.add(cached('hpHatFr', () => new THREE.CylinderGeometry(0.46, 1, 1, 16).translate(0, 0.5, 0)), plastic(col), 0, h * y, 0, 0, r * 1.14, h * tall * 0.45, r * 1.14);
  const m = mat4(0, h * y + h * tall * 0.43, 0, -lean, 0, 0, r * 0.53, h * tall * 0.65, r * 0.53);
  b.addMatrix(coneG(), plastic(col), m);
  if (band) b.cyl(0, h * y + 0.02, 0, r * 1.12, h * 0.12, band, { seg: 18 });
  if (stars) for (let k = 0; k < 5; k++) { const a = k * 1.3 + 0.4, yy = h * y + h * (0.12 + (k % 3) * 0.17), rr = r * (1.0 - (k % 3) * 0.22); rbox(b, Math.sin(a) * rr, yy, Math.cos(a) * rr, 0.06, 0.06, 0.02, 0, a, PI / 4, stars); }
}
// knitted scarf: neck ring + one tail down the chest, striped
export function scarf(b, d, a, c, { side = 0.12 } = {}) {
  const s = d.s;
  b.cyl(0, 0.84 * s, 0, 0.27 * s, 0.14 * s, a, { seg: 16 });
  b.cyl(0, 0.88 * s, 0, 0.275 * s, 0.05 * s, c, { seg: 16 });
  for (let k = 0; k < 5; k++) b.box(side * s, (0.72 - k * 0.12) * s, 0.24 * s, 0.17 * s, 0.12 * s, 0.05 * s, k % 2 ? c : a);
  rbox(b, -side * 0.6 * s, 0.66 * s, 0.25 * s, 0.15 * s, 0.32 * s, 0.05 * s, 0, 0, -0.25, a);
}

// ---- wand ----------------------------------------------------------------------------------
// A wand in the right hand, pointing out of the fist (along the arm, tilted up a little so
// it rests level over the wheel). Returns { wand, tip } — tip is the spell origin.
export function wand(rig, o = {}) {
  const s = rig.dims.s, L = (o.len ?? 0.42) * s, col = o.color ?? WOOD;
  const g = new THREE.Group(); g.position.set(0, handY(rig), 0.01); g.rotation.x = -0.5;
  rig.armR.add(g);
  const b = new BrickBuilder(1);
  rod(b, [0, 0.07 * s, 0], [0, -L, 0], 0.022 * s, col, 6);
  if (o.handle) b.cyl(0, -0.02 * s, 0, 0.032 * s, 0.11 * s, o.handle, { seg: 8 });
  if (o.knobs) for (let k = 1; k <= o.knobs; k++) b.sphere(0, -L * k / (o.knobs + 1), 0, 0.03 * s, col);
  if (o.hook) rod(b, [0, 0.07 * s, 0], [0, 0.12 * s, 0.06 * s], 0.025 * s, col, 6);
  g.add(b.build({ name: 'wand' }));
  const tip = new THREE.Group(); tip.position.y = -L; g.add(tip);
  return { wand: g, tip };
}
// a spell bolt shooting out of the tip along -Y; set(len) 0 hides it
export function bolt(tip, color, { r = 0.05, glow = 0.5 } = {}) {
  const g = new THREE.Group(); g.visible = false; tip.add(g);
  const cyl = cached('hpBolt', () => new THREE.CylinderGeometry(1, 0.6, 1, 8, 1, true).translate(0, -0.5, 0));
  const core = new THREE.Mesh(cyl, fxMat(0xffffff, 0.9)); core.scale.set(r * 0.45, 1, r * 0.45); g.add(core);
  const outer = new THREE.Mesh(cyl, fxMat(color, 0.6)); outer.scale.set(r * 1.4, 1, r * 1.4); g.add(outer);
  const head = addGlow(g, color, glow * 2.2); const flash = addGlow(tip, color, glow * 1.6); flash.visible = false;
  return {
    g,
    set(len, pulse = 1) {
      const on = len > 0.02; vis(g, on); vis(flash, on);
      if (!on) return;
      core.scale.y = outer.scale.y = len; head.position.y = -len;
      outer.scale.x = outer.scale.z = r * 1.4 * pulse; flash.scale.setScalar(glow * 1.6 * pulse);
    },
  };
}
// radial burst of glowing spark streaks + a glow (spin/scale it in fx)
export function burst(parent, color, n = 10, len = 0.5, seed = 5, col2 = 0xffffff) {
  const g = fxg(parent);
  const b = new BrickBuilder(1);
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const u = rnd() * 2 - 1, a = rnd() * PI * 2, q = Math.sqrt(1 - u * u), l = len * (0.6 + rnd() * 0.5);
    const dx = q * Math.cos(a), dz = q * Math.sin(a);
    rod(b, [dx * l * 0.35, u * l * 0.35, dz * l * 0.35], [dx * l, u * l, dz * l], 0.018, fxMat(k % 3 ? color : col2, 0.95), 4);
  }
  g.add(b.build({ name: 'burst' }));
  addGlow(g, color, len * 2.4, 0, 0, 0, 0.75);
  return g;
}

// ---- Patronus animals and other summoned shapes ------------------------------------------------
// kind: stag | doe | otter | dog | cat | hare | horse. Built facing +Z, feet at y 0.
// mat: a material (default: the silvery-blue Patronus glow).
export function beast(kind, mat = fxMat(0xbfe6ff, 0.5), size = 1) {
  const b = new BrickBuilder(1);
  const box = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => b.boxM(mat4(x, y, z, rx, ry, rz, sx, sy, sz), 0, { mat });
  const P = {
    stag: { len: 0.9, h: 0.55, leg: 0.6, neck: 0.45, head: 0.3, w: 0.32 },
    doe: { len: 0.8, h: 0.45, leg: 0.55, neck: 0.4, head: 0.26, w: 0.28 },
    horse: { len: 1.0, h: 0.5, leg: 0.65, neck: 0.5, head: 0.4, w: 0.34 },
    dog: { len: 0.7, h: 0.38, leg: 0.36, neck: 0.18, head: 0.28, w: 0.3 },
    cat: { len: 0.6, h: 0.3, leg: 0.3, neck: 0.12, head: 0.24, w: 0.24 },
    otter: { len: 0.9, h: 0.24, leg: 0.12, neck: 0.12, head: 0.2, w: 0.22 },
    hare: { len: 0.5, h: 0.36, leg: 0.22, neck: 0.1, head: 0.22, w: 0.26 },
  }[kind];
  const { len, h, leg, neck, head, w } = P, top = leg + h;
  box(0, leg + h / 2, 0, w, h, len);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(sx * w * 0.3, leg / 2, sz * len * 0.38, w * 0.26, leg, w * 0.26);
  const nz = len * 0.45, ny = top + neck * 0.4;
  box(0, ny, nz, w * 0.5, neck + h * 0.3, w * 0.5, -0.4, 0, 0);
  const hy = top + neck * 0.9, hz = nz + head * 0.35;
  box(0, hy, hz, head * 0.8, head * 0.75, head);
  box(0, hy - head * 0.12, hz + head * 0.6, head * 0.5, head * 0.42, head * (kind === 'horse' ? 0.9 : 0.5));
  if (kind === 'stag') for (const sx of [-1, 1]) {
    box(sx * 0.14, hy + 0.3, hz - 0.05, 0.05, 0.45, 0.05, 0, 0, -sx * 0.4);
    box(sx * 0.3, hy + 0.5, hz - 0.02, 0.05, 0.28, 0.05, 0.3, 0, -sx * 0.9);
    box(sx * 0.2, hy + 0.55, hz + 0.06, 0.04, 0.24, 0.04, 0.5, 0, sx * 0.1);
    box(sx * 0.38, hy + 0.7, hz - 0.08, 0.04, 0.22, 0.04, -0.3, 0, -sx * 0.3);
  }
  const ear = { doe: [0.18, 0.5], horse: [0.16, 0.2], dog: [0.14, 0.2], cat: [0.12, 0.1], hare: [0.3, 0.2], stag: [0.14, 0.9], otter: [0.05, 0] }[kind];
  for (const sx of [-1, 1]) box(sx * head * 0.32, hy + head * 0.35 + ear[0] / 2, hz - head * 0.2, 0.06, ear[0], 0.04, -0.2, 0, -sx * ear[1]);
  if (kind === 'horse') box(0, top + neck * 0.6, nz - 0.08, 0.06, neck + 0.2, 0.18, -0.4, 0, 0);
  const tail = { stag: [0.12, 0.2], doe: [0.1, 0.2], horse: [0.5, 0.5], dog: [0.35, -0.7], cat: [0.5, -1.0], otter: [0.55, 1.35], hare: [0.1, 0] }[kind];
  box(0, top - 0.05 - (kind === 'otter' ? h * 0.4 : 0), -len / 2 - tail[0] * 0.4, 0.07, 0.07, tail[0], tail[1], 0, 0);
  const g = new THREE.Group();
  const m = b.build({ name: 'patronus-' + kind }); m.scale.setScalar(size); g.add(m);
  return g;
}
// Fawkes: a red-and-gold phoenix with spread wings (facing +Z); returns { g, wl, wr }
export function phoenix(size = 1) {
  const g = new THREE.Group(), red = neon(0xd8301a, 1.4), gold = neon(0xffb020, 1.8);
  const b = new BrickBuilder(1);
  b.boxM(mat4(0, 0, 0, 0.2, 0, 0, 0.22, 0.24, 0.5), 0, { mat: red });
  b.boxM(mat4(0, 0.14, 0.3, 0, 0, 0, 0.18, 0.18, 0.2), 0, { mat: red });
  b.boxM(mat4(0, 0.12, 0.45, 0.3, 0, 0, 0.06, 0.06, 0.14), 0, { mat: gold });
  b.boxM(mat4(0, 0.25, 0.24, -0.6, 0, 0, 0.05, 0.16, 0.05), 0, { mat: gold });
  for (const k of [-1, 0, 1]) b.boxM(mat4(k * 0.08, -0.06, -0.55, 0.3, k * 0.25, 0, 0.06, 0.03, 0.6), 0, { mat: k ? gold : red });
  g.add(b.build({ name: 'phoenix' }));
  const wing = (sd) => {
    const p = new THREE.Group(); p.position.set(sd * 0.1, 0.06, 0.05); g.add(p);
    const wb = new BrickBuilder(1);
    wb.boxM(mat4(sd * 0.3, 0, 0, 0, 0, 0, 0.6, 0.04, 0.3), 0, { mat: red });
    wb.boxM(mat4(sd * 0.55, 0, -0.12, 0, sd * 0.3, 0, 0.5, 0.03, 0.2), 0, { mat: gold });
    p.add(wb.build({ name: 'phoenix-wing' }));
    return p;
  };
  const wl = wing(1), wr = wing(-1);
  addGlow(g, 0xff7020, 1.6, 0, 0, 0, 0.6);
  g.scale.setScalar(size);
  return { g, wl, wr };
}
// the Dark Mark: a glowing green skull with a snake from its mouth (faces +Z)
export function darkMark(size = 1) {
  const g = new THREE.Group(), m = fxMat(0x40ff70, 0.75), dk = fxMat(0x0a3a12, 0.9);
  const b = new BrickBuilder(1);
  b.sphere(0, 0.25, 0, 0.32, 0, { mat: m, sy: 0.95 });
  b.boxM(mat4(0, -0.05, 0.05, 0, 0, 0, 0.36, 0.22, 0.4), 0, { mat: m });
  for (const sd of [-1, 1]) b.sphere(sd * 0.12, 0.24, 0.27, 0.08, 0, { mat: dk });
  for (let k = 0; k < 9; k++) {
    const u = k / 8, x = S(u * PI * 2.2) * 0.25, y = -0.2 - u * 0.95;
    b.sphere(x, y, 0.22 + u * 0.05, 0.075 - u * 0.02, 0, { mat: m });
  }
  g.add(b.build({ name: 'dark-mark' }));
  addGlow(g, 0x30ff60, 2.6, 0, -0.2, 0, 0.5);
  g.scale.setScalar(size);
  return g;
}
