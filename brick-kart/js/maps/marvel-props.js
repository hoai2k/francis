// Brick-built Marvel heroes, villains and vehicles for "Avengers Brick Assemble".
// Every figure is a scaled-up minifig (about 3.6 units tall at scale 1) made of a
// merged body plus two arm pivots so it can be posed and animated cheaply.
import { THREE, BrickBuilder, C, plastic, canvasTexture, mat4 } from './kit.js';
import { vertexColorPlastic } from '../lego.js';

export const M = {
  red: 0xb3121b, dkred: 0x6e0d0d, blue: 0x1f3a93, navy: 0x1a2550, gold: 0xe3b23c, silver: 0xb8bec6,
  hulk: 0x4f9a2a, purple: 0x5b2c83, thanos: 0x7d4f94, groot: 0x7a5230, grootDk: 0x4f3420,
  gamora: 0x3d9a4a, drax: 0x7a8898, coat: 0x6e1e18, orange: 0xd9641c, loki: 0x1f6a3a,
  vib: 0x8a4dff, skin: 0xf2c9a0, hair: 0x3a2412, blond: 0xe0b35a, black: 0x1a1d22, bronze: 0x6b5a45,
};

// ---- materials / textures ------------------------------------------------------------
const texCache = new Map(), matCache = new Map();
function tex(key, w, h, draw) {
  let t = texCache.get(key);
  if (!t) { t = canvasTexture(w, h, draw); texCache.set(key, t); }
  return t;
}
export function glow(color, intensity = 2, opts = {}) { return plastic(color, { emissive: color, emissiveIntensity: intensity, ...opts }); }
// face printed around a head cylinder (face centred on the canvas); `lit` draws an emissive layer
export function faceMat(key, draw, lit = null) {
  let m = matCache.get('f' + key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: tex('f' + key, 256, 128, draw), roughness: 0.38 });
    if (lit) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = tex('fl' + key, 256, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); lit(g, w, h); }); m.emissiveIntensity = 1.6; }
    matCache.set('f' + key, m);
  }
  return m;
}
// torso print (trapezoid), alpha-tested
export function decalMat(key, draw, lit = null, topFrac = 0.754) {
  let m = matCache.get('d' + key);
  if (!m) {
    const clip = (g, w, h) => { const i = w * (1 - topFrac) / 2; g.beginPath(); g.moveTo(i, 0); g.lineTo(w - i, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.clip(); };
    m = new THREE.MeshStandardMaterial({ map: tex('d' + key, 128, 128, (g, w, h) => { clip(g, w, h); draw(g, w, h); }), roughness: 0.38, alphaTest: 0.5 });
    if (lit) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = tex('dl' + key, 128, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); lit(g, w, h); }); m.emissiveIntensity = 1.5; }
    matCache.set('d' + key, m);
  }
  return m;
}
export function texMat(key, w, h, draw, opts = {}) {
  let m = matCache.get('t' + key);
  if (!m) { m = new THREE.MeshStandardMaterial({ map: tex('t' + key, w, h, draw), roughness: 0.45, ...opts }); if (opts.emissive !== undefined) m.emissiveMap = m.map; matCache.set('t' + key, m); }
  return m;
}

const HEAD = new THREE.CylinderGeometry(0.4, 0.4, 0.72, 22, 1, true).translate(0, 0.36, 0);
const PLANE = new THREE.PlaneGeometry(1, 1);
const FLAME = new THREE.ConeGeometry(1, 1, 10).rotateX(Math.PI).translate(0, -0.5, 0);
function taperedBox(bw, tw, h, d) {
  const g = new THREE.BoxGeometry(bw, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * (tw / bw));
  g.computeVertexNormals();
  return g.translate(0, h / 2, 0);
}
const TORSO = new Map();
function torsoGeo(W, D) { const k = W + ',' + D; if (!TORSO.has(k)) TORSO.set(k, taperedBox(1.3 * W, 0.98 * W, 1.25, 0.66 * D)); return TORSO.get(k); }

// ---- face drawing helpers --------------------------------------------------------------
function eyesMouth(g, cx, cy, { mouth = 'smile', brow = null, lips = null, teeth = false, eye = '#1b1b1b' } = {}) {
  g.fillStyle = eye;
  g.beginPath(); g.ellipse(cx - 17, cy - 10, 6, 8, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx + 17, cy - 10, 6, 8, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 15, cy - 13, 2, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 19, cy - 13, 2, 0, 7); g.fill();
  g.strokeStyle = brow || '#1b1b1b'; g.lineCap = 'round';
  if (brow) {
    g.lineWidth = 5;
    const a = mouth === 'angry' ? 8 : 2;
    g.beginPath(); g.moveTo(cx - 28, cy - 24 - a); g.lineTo(cx - 9, cy - 22 + a); g.stroke();
    g.beginPath(); g.moveTo(cx + 28, cy - 24 - a); g.lineTo(cx + 9, cy - 22 + a); g.stroke();
  }
  g.strokeStyle = lips || '#1b1b1b'; g.lineWidth = lips ? 6 : 4.5;
  g.beginPath();
  if (mouth === 'smile') g.arc(cx, cy + 4, 16, 0.2 * Math.PI, 0.8 * Math.PI);
  else if (mouth === 'smirk') { g.moveTo(cx - 12, cy + 20); g.quadraticCurveTo(cx + 4, cy + 24, cx + 16, cy + 14); }
  else if (mouth === 'grim') { g.moveTo(cx - 12, cy + 20); g.lineTo(cx + 12, cy + 20); }
  g.stroke();
  if (mouth === 'angry' || teeth) {
    g.fillStyle = '#1b1b1b'; g.fillRect(cx - 17, cy + 12, 34, 14);
    g.fillStyle = '#fff'; g.fillRect(cx - 15, cy + 14, 30, 4); g.fillRect(cx - 15, cy + 20, 30, 4);
  }
}
const fill = (g, w, h, c) => { g.fillStyle = c; g.fillRect(0, 0, w, h); };
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// ---- print / sculpt helpers for the redesigned figures -----------------------------------------
// Hawkeye, Gamora and Drax match their drivers (js/drivers/marvel.js): same prints, hair and props,
// rebuilt here at standing-figure scale (head radius 0.4, height 0.72).
const PI = Math.PI;
// driver-style transform (XYZ euler, optional args, fresh matrix)
const m4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const SPH = new THREE.SphereGeometry(1, 12, 8);
const SPIKE = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0);
const BLADE_TIP = new THREE.ConeGeometry(0.5, 1, 4).rotateZ(PI).translate(0, -0.5, 0);
const RODS = {}, UPV = new THREE.Vector3(0, 1, 0);
const blob = (b, x, y, z, sx, sy, sz, c, rx = 0, ry = 0, rz = 0) => b.addMatrix(SPH, plastic(c), m4(x, y, z, rx, ry, rz, sx, sy, sz));
function rod(b, a, c, r, color, seg = 8) {
  const A = new THREE.Vector3(...a), dir = new THREE.Vector3(...c).sub(A), len = dir.length();
  const geo = (RODS[seg] ||= new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0));
  b.addMatrix(geo, plastic(color), new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(UPV, dir.normalize()), new THREE.Vector3(r, len, r)));
}
// draw into builder b through an offset + uniform scale (props sized like the drivers' ones)
function scaled(b, x, y, z, k) {
  const base = new THREE.Matrix4().makeTranslation(x, y, z).scale(new THREE.Vector3(k, k, k)), T = new THREE.Matrix4();
  return {
    addMatrix: (g, mat, m) => b.addMatrix(g, mat, T.multiplyMatrices(base, m)),
    boxM: (m, c) => b.boxM(T.multiplyMatrices(base, m), c),
    sphere: (sx, sy, sz, r, c) => b.addMatrix(SPH, plastic(c), T.multiplyMatrices(base, m4(sx, sy, sz, 0, 0, 0, r, r, r))),
  };
}
// a curved blade in the Y-Z plane from (y, z); angle a: 0 = -Y, PI/2 = +Z; bends by da per segment
function curvedBlade(b, y, z, a, da, n, L, w0, w1, t, steel, fuller, tipL = 0.2) {
  for (let i = 0; i < n; i++) {
    const w = w0 + (w1 - w0) * i / Math.max(1, n - 1);
    const dy = -Math.cos(a) * L, dz = Math.sin(a) * L;
    b.boxM(m4(0, y + dy / 2, z + dz / 2, -a, 0, 0, t, L * 1.06, w), steel);
    if (fuller) b.boxM(m4(0, y + dy / 2 + Math.sin(a) * w * 0.14, z + dz / 2 + Math.cos(a) * w * 0.14, -a, 0, 0, t * 1.2, L * 1.06, w * 0.22), fuller);
    y += dy; z += dz; a += da;
  }
  b.addMatrix(BLADE_TIP, plastic(steel), m4(0, y, z, -a, 0, 0, t, tipL, w1 * 1.02));
}
// face print in true proportions around the head cylinder: draw(g, X, h) gets x relative to the
// face centre (±X = the seam at the back) and y from the top of the head (0) to the chin (h)
function printFace(key, skin, draw) {
  const k = 0.72 / (PI * 0.4);
  return faceMat(key, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, 0); g.scale(k, 1);
    g.lineCap = 'round'; g.lineJoin = 'round';
    draw(g, w / 2 / k, h);
    g.restore();
  });
}
function eye(g, x, y, rx, ry, col = '#16141a') {
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x + rx * 0.3, y - ry * 0.35, Math.max(1.6, rx * 0.32), 0, 7); g.fill();
}
const strokePath = (g, col, wd, pts) => {
  g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 4) g.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
  g.stroke();
};

// ---- the generic big minifig ----------------------------------------------------------
// sp: { skin, face, torso, legs, hips, boots, bootH, arms, hands, decal, belt, bulk, depth, head(b,H,hs), extra(b), arm(b,side), headTop, handR, headS }
export function fig(sp) {
  const W = sp.bulk || 1, D = sp.depth || 1;
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const legs = sp.legs ?? C.dkgray;
  for (const s of [-1, 1]) {
    b.box(s * 0.31 * W, 0, 0.02, 0.58 * W, 1.15, 0.72 * D, legs);
    if (sp.boots) b.box(s * 0.31 * W, 0, 0.02, 0.6 * W, sp.bootH || 0.42, 0.74 * D, sp.boots);
  }
  b.box(0, 1.1, 0, 1.24 * W, 0.33, 0.72 * D, sp.hips ?? legs);
  b.add(torsoGeo(W, D), plastic(sp.torso), 0, 1.43, 0);
  if (sp.belt) b.box(0, 1.4, 0, 1.33 * W, 0.18, 0.69 * D, sp.belt);
  if (sp.decal) b.add(PLANE, sp.decal, 0, 1.43 + 0.625, 0.33 * D + 0.012, 0, 1.3 * W, 1.25, 1);
  b.cyl(0, 2.66, 0, 0.2, 0.14, sp.skin, { seg: 10 });
  const H = 2.78;
  const hs = sp.headS || 1;   // head scale (1 = standard minifig head)
  b.add(HEAD, sp.face, 0, H, 0, Math.PI, hs, hs, hs);
  b.cyl(0, H, 0, 0.395 * hs, 0.72 * hs, sp.headTop ?? sp.skin, { seg: 18 });
  if (!sp.noStud) b.cyl(0, H + 0.72 * hs, 0, 0.22 * hs, 0.14 * hs, sp.headTop ?? sp.skin, { seg: 12 });
  sp.head?.(b, H, hs);
  sp.extra?.(b);
  const body = b.build({ name: sp.name || 'fig' });
  root.add(body);
  const out = { root, body };
  for (const side of [1, -1]) {
    const piv = new THREE.Group();
    piv.position.set(side * (0.49 * W + 0.17), 2.5, 0);
    const a = new BrickBuilder(1);
    a.sphere(side * 0.02, -0.05, 0, 0.22 * Math.sqrt(W), sp.arms);
    a.box(side * 0.04, -1.02, 0, 0.36 * Math.sqrt(W), 1.04, 0.4 * Math.sqrt(D), sp.arms);
    a.cyl(side * 0.04, -1.36, 0.04, (sp.handR || 0.17) * Math.sqrt(W), 0.36, sp.hands ?? sp.skin, { seg: 10 });
    sp.arm?.(a, side);
    piv.add(a.build({ name: 'arm' }));
    root.add(piv);
    out[side > 0 ? 'armL' : 'armR'] = piv;
  }
  return out;
}
// a separately built part hung on a pivot (for spinning weapons etc.)
export function part(parent, x, y, z, fn) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const b = new BrickBuilder(1); fn(b); g.add(b.build({ name: 'part' }));
  parent.add(g);
  return g;
}
// bake a built (static) object into the merged scenery builder
export function bake(builder, obj) {
  obj.updateMatrixWorld(true);
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    builder.bucket(o.material, o.matrixWorld.elements[12], o.matrixWorld.elements[14]).push(g);
  });
}

// ---- heroes -------------------------------------------------------------------------------
// ---- helpers for Iron Man, Spider-Man, Captain America, Thor, Black Panther, Doctor Strange ------
// These six match their drivers (js/drivers/marvel.js): the same prints, helmets, cowls, capes and
// props (ported from imArc, smWeb, caStar, thCapeGeo…), rebuilt at standing-figure scale.
// tAY maps a driver torso height (in units of the driver's scale, chest 0.18…1.0) onto the figure
// torso (1.43…2.68); torso widths scale by about 1.41 and depths by 1.5, arm lengths by 2.
const tAY = (y) => 1.43 + (y - 0.18) * 1.524;
const tAGeo = new Map();
const tACached = (k, make) => { let g = tAGeo.get(k); if (!g) { g = make(); tAGeo.set(k, g); } return g; };
// a curved plate round a cylinder head: arc TH (rad) centred on the front, unit radius and height
const tAArc = (TH, open = true) => tACached(`arc${TH}${open}`, () => new THREE.CylinderGeometry(1, 1, 1, 28, 1, open, -TH / 2, TH).translate(0, 0.5, 0));
const tADome = () => tACached('dome', () => new THREE.SphereGeometry(1, 28, 10, 0, PI * 2, 0, PI / 2));
const tADiscG = () => tACached('disc', () => new THREE.CylinderGeometry(1, 1, 1, 24));
const tABoxG = () => tACached('box', () => new THREE.BoxGeometry(1, 1, 1));
// the cowl's back shell: open across the face (gap ±half radians either side of the front)
const tAShell = (half) => tACached('shell' + half, () => new THREE.CylinderGeometry(1, 1, 1, 28, 1, true, half, PI * 2 - half * 2).translate(0, 0.5, 0));
const tAMat = (c) => (typeof c === 'number' ? plastic(c) : c);
// a part laid on a cylinder head: angle th round from the front, height y, distance out from the axis
function tAOnHead(b, th, y, out, w, h, dp, col, tilt = 0, roll = 0, geo = null) {
  b.addMatrix(geo || tABoxG(), tAMat(col), new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(th) * out, y, Math.cos(th) * out),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, th, roll, 'YXZ')), new THREE.Vector3(w, h, dp)));
}
const tAHeadDisc = (b, th, y, out, rad, thick, col, tilt = 0) => tAOnHead(b, th, y, out, rad, thick, rad, col, PI / 2 + tilt, 0, tADiscG());
// a round disc facing forward (+Z): chest discs, clasps, the arc reactor, amulets
const tADisc = (b, x, y, z, r, t, col, rx = 0) => b.addMatrix(tADiscG(), tAMat(col), m4(x, y, z, PI / 2 + rx, 0, 0, r, t, r));
// a torso print on the back of the figure
const tABack = (b, mat, W = 1, D = 1) => b.addMatrix(PLANE, mat, m4(0, 1.43 + 0.625, -(0.33 * D + 0.012), 0, PI, 0, 1.3 * W, 1.25, 1));
// printFace with a second, emissive print (glowing lines)
function tALitFace(key, skin, draw, lit) {
  const k = 0.72 / (PI * 0.4);
  const wrap = (fn, bg) => (g, w, h) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.save(); g.translate(w / 2, 0); g.scale(k, 1); g.lineCap = 'round'; g.lineJoin = 'round';
    fn(g, w / 2 / k, h);
    g.restore();
  };
  return faceMat(key, wrap(draw, skin), wrap(lit));
}
// A moulded cape shell: a thick sheet curved round the back (-Z) of a unit circle, drawn in to
// `top` at the neckline (y = 0) and flaring out to the hem (y = -1); rz = PI stands it up (a collar).
function tACapeGeo(key, { arc = 2.3, top = 0.7, folds = 3, fold = 0.06, thick = 0.1 } = {}) {
  return tACached('cape' + key, () => {
    const g = new THREE.BoxGeometry(1, 1, 1, 32, 8, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), k = 0.5 - p.getY(i), th = -u * arc;
      const R = (top + (1 - top) * k) * (1 + fold * k * Math.cos(u * folds * 2 * PI)) + p.getZ(i) * thick;
      p.setXYZ(i, Math.sin(th) * R, -k, -Math.cos(th) * R);
    }
    g.computeVertexNormals();
    return g;
  });
}
// Spider-Man's black web: spokes from (cx, cy) and sagging rings between them
function tAWeb(g, cx, cy, rings, spokes = 16, col = '#14080a', wd = 2, a0 = 0) {
  g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round';
  const R = rings[rings.length - 1] * 1.4, at = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  for (let i = 0; i < spokes; i++) { const a = a0 + i / spokes * PI * 2; g.beginPath(); g.moveTo(...at(a, i % 2 ? rings[1] : rings[0] * 0.5)); g.lineTo(...at(a, R)); g.stroke(); }
  for (const r of rings) {
    g.beginPath();
    for (let i = 0; i < spokes; i++) {
      const a = a0 + i / spokes * PI * 2, b = a + PI * 2 / spokes;
      const p = at(a, r), q = at(b, r), c = at((a + b) / 2, r * 0.82);
      if (!i) g.moveTo(...p);
      g.quadraticCurveTo(c[0], c[1], q[0], q[1]);
    }
    g.stroke();
  }
}
// a spider emblem centred at (x, y), k = size; outline draws a fat dark edge first
function tASpider(g, x, y, k, col, outline = null) {
  const legs = [[[3, -4], [11, -12], [12, -22]], [[4, -1], [15, -6], [19, -14]], [[4, 3], [15, 7], [19, 16]], [[3, 6], [11, 14], [12, 24]]];
  const draw = (c, wd, grow) => {
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = wd * k; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const sd of [-1, 1]) for (const L of legs) { g.beginPath(); g.moveTo(x + sd * L[0][0] * k, y + L[0][1] * k); for (const [px, py] of L.slice(1)) g.lineTo(x + sd * px * k, y + py * k); g.stroke(); }
    for (const [ey, rx, ry] of [[-6.5, 2.4, 2.4], [-1, 3.6, 4.6], [8, 4.4, 7]]) { g.beginPath(); g.ellipse(x, y + ey * k, rx * k + grow, ry * k + grow, 0, 0, 7); g.fill(); }
  };
  if (outline) draw(outline, 3.6, 1.6 * k);
  draw(col, 1.5, 0);
}
// Captain America's star
function tAStar(g, x, y, R, r = R * 0.4) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, k = i % 2 ? r : R; i ? g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k) : g.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k); }
  g.closePath();
}
let tAGemMat = null;   // the Eye of Agamotto's Time Stone

export function spiderman() {
  const red = 0xc4141c, blue = 0x1d47a8, redS = '#c4141c', blueS = '#1d47a8', ink = '#14080a';
  // the mask: web all round from between the eyes, big white teardrop lenses with fat black rims
  const lens = (g, sd) => {
    g.beginPath(); g.moveTo(sd * 16, 80);
    g.bezierCurveTo(sd * 16, 54, sd * 38, 38, sd * 66, 40);
    g.bezierCurveTo(sd * 86, 43, sd * 83, 70, sd * 63, 80);
    g.bezierCurveTo(sd * 47, 88, sd * 28, 88, sd * 16, 80);
    g.closePath();
  };
  const face = printFace('tA-sm', redS, (g) => {
    tAWeb(g, 0, 70, [14, 28, 44, 62, 82, 106, 134, 166, 202, 242], 18, ink, 2.4, -PI / 2);
    for (const sd of [-1, 1]) { g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 13; lens(g, sd); g.stroke(); g.fill(); }
    for (const sd of [-1, 1]) {
      g.fillStyle = '#f6f8fa'; lens(g, sd); g.fill();
      g.save(); lens(g, sd); g.clip();
      g.fillStyle = 'rgba(150,170,190,0.45)'; g.beginPath(); g.ellipse(sd * 44, 98, 50, 20, 0, 0, 7); g.fill();
      g.restore();
    }
  });
  const torsoArt = (g, w, h, back) => {
    g.fillStyle = redS; g.fillRect(0, 0, w, h);
    tAWeb(g, 64, back ? 36 : 44, [9, 19, 31, 45, 61, 80, 102], 14, ink, 1.6, -PI / 2);
    g.fillStyle = blueS;                                                           // blue flanks, red waist band
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(64 + sd * 70, 18); g.quadraticCurveTo(64 + sd * 30, 34, 64 + sd * 22, 76); g.lineTo(64 + sd * 18, 110); g.lineTo(64 + sd * 70, 110); g.closePath(); g.fill();
    }
    g.strokeStyle = ink; g.lineWidth = 2.5;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 70, 18); g.quadraticCurveTo(64 + sd * 30, 34, 64 + sd * 22, 76); g.lineTo(64 + sd * 18, 110); g.stroke(); }
    g.fillStyle = redS; g.fillRect(0, 108, w, 10);
    g.fillStyle = ink; g.fillRect(0, 107, w, 2); g.fillRect(0, 117, w, 2);
    g.fillStyle = blueS; g.fillRect(0, 119, w, 9);
    if (back) tASpider(g, 64, 60, 2.25, redS, ink);                                // the big red spider on the back
    else tASpider(g, 64, 46, 1.25, ink);
  };
  const decal = decalMat('tA-sm', (g, w, h) => torsoArt(g, w, h, false));
  const back = decalMat('tA-smBack', (g, w, h) => torsoArt(g, w, h, true));
  return fig({
    name: 'spiderman', skin: red, face, torso: red, legs: blue, hips: blue, boots: red, bootH: 0.5, arms: blue, hands: red, decal, noStud: true,
    extra: (b) => {
      tABack(b, back);
      for (const s of [-1, 1]) b.box(s * 0.31, 0.5, 0.02, 0.61, 0.04, 0.75, 0x14080a);   // black rims on the red boots
    },
    // blue arms: red over the shoulders and red gloves to mid forearm
    arm: (a, s) => {
      const x = s * 0.04;
      a.sphere(x, -0.02, 0, 0.25, red, { sy: 0.85 });
      a.box(x, -0.2, 0, 0.39, 0.1, 0.43, red);
      a.box(x, -1.12, 0, 0.39, 0.34, 0.43, red);
      a.box(x, -0.8, 0, 0.395, 0.04, 0.435, 0x14080a);
    },
  });
}

export function ironman() {
  const red = 0xb8141c, dkRed = 0x700a10, gold = 0xd69a1e, steel = 0x3a3e46;
  const redS = '#b8141c', dkRedS = '#700a10', goldS = '#d69a1e', seamS = '#7a4c08';
  const core = glow(0xd8fbff, 2.6);
  const circ = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  // the helmet shell under the faceplate: red all round, panel seams at the back
  const face = printFace('tA-imHead', redS, (g, X) => {
    for (const sd of [-1, 1]) {
      strokePath(g, dkRedS, 3, [sd * 96, 34, sd * 160, 26, sd * X, 30]);
      strokePath(g, dkRedS, 3, [sd * 150, 28, sd * 156, 80, sd * 140, 128]);
    }
  });
  // the gold faceplate, printed in plate coordinates (angle round the head, height in H)
  const TH = 2.2, Y0 = -0.03, Y1 = 0.84;
  const px = (th) => 128 + th / TH * 256, py = (f) => (Y1 - f) / (Y1 - Y0) * 128;
  const eyeShape = (g, sd, grow = 0) => {
    const P = [[0.1, 0.545], [0.16, 0.6], [0.66, 0.665], [0.66, 0.585], [0.36, 0.53]];
    g.beginPath();
    P.forEach(([t, y], i) => { const X = px(sd * t) + sd * (t > 0.4 ? grow : -grow * 0.6), Y = py(y) + (y > 0.58 ? -grow : grow); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.closePath();
  };
  const plate = faceMat('tA-imPlate', (g, w, h) => {
    g.fillStyle = goldS; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, 0);                                     // darker towards the sides
    gr.addColorStop(0, 'rgba(110,60,0,0.45)'); gr.addColorStop(0.3, 'rgba(110,60,0,0)'); gr.addColorStop(0.7, 'rgba(110,60,0,0)'); gr.addColorStop(1, 'rgba(110,60,0,0.45)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = redS;                                                                // red helmet round the plate: jaw and temples
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(px(sd * TH / 2), py(0.5)); g.lineTo(px(sd * 0.86), py(0.36)); g.lineTo(px(sd * 0.5), py(Y0)); g.lineTo(px(sd * TH / 2), py(Y0)); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(px(sd * TH / 2), py(Y1)); g.lineTo(px(sd * 0.86), py(Y1)); g.lineTo(px(sd * 0.98), py(0.62)); g.lineTo(px(sd * TH / 2), py(0.6)); g.closePath(); g.fill();
    }
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = seamS; g.lineWidth = 2.5;
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(px(sd * 0.1), py(0.5)); g.lineTo(px(sd * 0.3), py(0.26)); g.stroke();          // nose / cheek lines
      g.beginPath(); g.moveTo(px(sd * 0.66), py(0.56)); g.lineTo(px(sd * 0.56), py(0.3)); g.lineTo(px(sd * 0.36), py(0.08)); g.stroke();
      g.beginPath(); g.moveTo(px(sd * 0.04), py(0.82)); g.lineTo(px(sd * 0.16), py(0.68)); g.stroke();          // brow ridge
      g.beginPath(); g.moveTo(px(sd * 0.86), py(Y1)); g.lineTo(px(sd * 0.98), py(0.62)); g.lineTo(px(sd * 0.86), py(0.36)); g.lineTo(px(sd * 0.5), py(Y0)); g.stroke();
    }
    g.strokeStyle = '#2a1e0c'; g.lineWidth = 4.5;                                      // mouth slit + chin seam: the T
    g.beginPath(); g.moveTo(px(-0.3), py(0.22)); g.lineTo(px(0.3), py(0.22)); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(px(0), py(0.22)); g.lineTo(px(0), py(0.0)); g.stroke();
    for (const sd of [-1, 1]) { g.fillStyle = '#2a1e0c'; eyeShape(g, sd, 3); g.fill(); g.fillStyle = '#f4feff'; eyeShape(g, sd); g.fill(); }
  }, (g) => {
    g.shadowColor = '#7fe8ff'; g.shadowBlur = 10;
    for (const sd of [-1, 1]) { g.fillStyle = '#d8fbff'; eyeShape(g, sd); g.fill(); g.fill(); }
  });
  // chest: gold abs, armour seams, the arc reactor ring (the glowing core is a raised disc)
  const decal = decalMat('tA-im', (g, w, h) => {
    g.fillStyle = redS; g.fillRect(0, 0, w, h);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = goldS;
    g.beginPath(); g.moveTo(34, 66); g.quadraticCurveTo(64, 58, 94, 66); g.lineTo(88, 114); g.lineTo(40, 114); g.closePath(); g.fill();
    g.strokeStyle = seamS; g.lineWidth = 2.5;
    for (const y of [78, 90, 102]) { g.beginPath(); g.moveTo(38, y); g.lineTo(90, y); g.stroke(); }
    g.beginPath(); g.moveTo(64, 62); g.lineTo(64, 114); g.stroke();
    g.strokeStyle = dkRedS; g.lineWidth = 3;
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(64 + sd * 18, 52); g.quadraticCurveTo(64 + sd * 34, 62, 64 + sd * 48, 50); g.lineTo(64 + sd * 44, 8); g.stroke();   // pecs
      g.beginPath(); g.moveTo(64 + sd * 50, 54); g.lineTo(64 + sd * 46, 116); g.stroke();                                                        // flank seams
      g.beginPath(); g.moveTo(64 + sd * 22, 2); g.lineTo(64 + sd * 14, 22); g.stroke();                                                          // collar
    }
    g.fillStyle = dkRedS; g.fillRect(0, 116, w, 4);
    circ(g, 64, 40, 17, '#26292e'); circ(g, 64, 40, 14, '#7fe8ff'); circ(g, 64, 40, 11, '#c8f6ff');
  }, (g) => { const r = g.createRadialGradient(64, 40, 8, 64, 40, 20); r.addColorStop(0, '#9ff'); r.addColorStop(1, '#000'); g.fillStyle = r; g.fillRect(40, 16, 48, 48); });
  const back = decalMat('tA-imBack', (g, w, h) => {
    g.fillStyle = redS; g.fillRect(0, 0, w, h);
    g.strokeStyle = dkRedS; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 116); g.stroke();
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 10, 30); g.quadraticCurveTo(64 + sd * 40, 26, 64 + sd * 50, 8); g.stroke(); g.beginPath(); g.moveTo(64 + sd * 12, 90); g.lineTo(64 + sd * 46, 96); g.stroke(); }
    g.fillStyle = goldS; g.fillRect(56, 98, 16, 16);
    g.fillStyle = dkRedS; g.fillRect(0, 116, w, 4);
  });
  const f = fig({
    name: 'ironman', skin: red, face, torso: red, legs: red, hips: dkRed, arms: red, hands: red, decal, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72, hb = scaled(b, 0, H, 0, 1);
      hb.addMatrix(tAArc(2 * PI, false), plastic(red), m4(0, Y1 * h, 0, 0, 0, 0, 1.08 * r, (1.03 - Y1) * h, 1.08 * r));
      hb.addMatrix(tADome(), plastic(red), m4(0, 1.03 * h, 0, 0, 0, 0, 1.08 * r, 0.24 * h, 1.08 * r));    // rounded helmet crown
      hb.addMatrix(tAArc(TH), plate, m4(0, Y0 * h, 0, 0, 0, 0, 1.08 * r, (Y1 - Y0) * h, 1.08 * r));      // the gold faceplate
      for (const sd of [-1, 1]) {
        tAOnHead(hb, sd * (TH / 2 + 0.03), 0.4 * h, 1.06 * r, 0.12 * r, 0.86 * h, 0.1 * r, red);          // plate edges
        tAHeadDisc(hb, sd * PI / 2, 0.5 * h, 1.04 * r, 0.33 * r, 0.12 * r, red);                           // round ear pieces
        tAHeadDisc(hb, sd * PI / 2, 0.5 * h, 1.1 * r, 0.2 * r, 0.06 * r, gold);
        tAHeadDisc(hb, sd * PI / 2, 0.5 * h, 1.13 * r, 0.09 * r, 0.04 * r, steel);
      }
      hb.addMatrix(tADiscG(), plastic(dkRed), m4(0, -0.03 * h, 0, 0, 0, 0, r, 0.1 * h, r));            // gorget
    },
    extra: (b) => {
      // the arc reactor: a dark ring with the glowing core standing proud of the chest
      const ry = tAY(0.744), rz = 0.33;
      tADisc(b, 0, ry, rz, 0.165, 0.044, steel);
      tADisc(b, 0, ry, rz + 0.017, 0.137, 0.044, 0x9aa2ac);
      tADisc(b, 0, ry, rz + 0.032, 0.108, 0.044, core);
      tABack(b, back);
      // flight thrusters on the back
      for (const sd of [-1, 1]) {
        b.box(sd * 0.28, tAY(0.42), -0.39, 0.23, 0.52, 0.12, steel);
        b.box(sd * 0.28, tAY(0.4), -0.41, 0.16, 0.076, 0.12, 0, { mat: glow(0x9fefff, 1.2) });
        b.box(sd * 0.28, tAY(0.74), -0.38, 0.26, 0.076, 0.1, gold);
      }
      // gold thigh plates and knee caps, a dark belt line
      for (const sd of [-1, 1]) {
        b.box(sd * 0.31, 0.62, 0.37, 0.46, 0.42, 0.04, gold);
        b.box(sd * 0.31, 0.36, 0.375, 0.42, 0.16, 0.05, gold);
      }
      b.box(0, 1.38, 0, 1.33, 0.09, 0.7, dkRed);
    },
    arm: (a, s) => {
      const x = s * 0.04;
      a.sphere(x, 0.0, 0, 0.27, red, { sy: 0.78 });                                                    // shoulder pauldron
      a.box(x, -0.16, 0, 0.45, 0.06, 0.48, dkRed);
      a.box(x, -0.6, 0, 0.39, 0.22, 0.43, gold);                                                      // gold upper arm
      a.box(x, -1.16, 0, 0.42, 0.3, 0.46, red);                                                       // forearm gauntlet
      a.box(x, -1.0, 0, 0.425, 0.06, 0.465, gold);
      a.addMatrix(tADiscG(), plastic(steel), m4(x, -1.37, 0.04, 0, 0, 0, 0.13, 0.024, 0.13));
      a.addMatrix(tADiscG(), core, m4(x, -1.385, 0.04, 0, 0, 0, 0.09, 0.024, 0.09));                   // repulsor palm
    },
  });
  // boot jets
  const jets = part(f.root, 0, 0, 0, (b) => { for (const s of [-1, 1]) b.add(FLAME, glow(0x9fe8ff, 3, { trans: true, opacity: 0.8 }), s * 0.31, 0, 0.02, 0, 0.24, 1.1, 0.24); });
  f.jets = jets;
  return f;
}

function shieldMesh(r = 0.9) {
  const top = texMat('shield', 256, 256, (g, w) => {
    const c = w / 2;
    [['#c4141c', 1], ['#f4f4f4', 0.8], ['#c4141c', 0.6], ['#1f3a93', 0.4]].forEach(([col, f]) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, c * f, 0, 7); g.fill(); });
    g.fillStyle = '#f4f4f4'; g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? c * 0.15 : c * 0.37; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
    g.fill();
  }, { metalness: 0.3, roughness: 0.3 });
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.14, 28), [plastic(0xb8bec6, { metal: 0.5, rough: 0.3 }), top, plastic(0x8a9098)]);
  disc.castShadow = true;
  g.add(disc);
  return g;
}
export function captain() {
  const blue = 0x1f3a93, dkBlue = 0x172c70, red = 0xc4141c, white = 0xf4f4f6, brown = 0x6b4426, dkBrown = 0x4a2e18;
  const skinS = '#f2c9a0', blueS = '#1f3a93', redS = '#c4141c';
  // the face in the cowl's opening: low determined brows, steady eyes, set mouth and a cleft chin
  const face = printFace('tA-ca', skinS, (g, X, h) => {
    g.fillStyle = blueS;                                                           // cowl round the opening
    g.beginPath(); g.moveTo(-X, 0); g.lineTo(X, 0); g.lineTo(X, h); g.lineTo(76, h); g.lineTo(78, 96); g.lineTo(74, 40);
    g.lineTo(-74, 40); g.lineTo(-78, 96); g.lineTo(-76, h); g.lineTo(-X, h); g.closePath(); g.fill();
    for (const sd of [-1, 1]) {
      strokePath(g, '#5a3a1e', 7, [sd * 44, 48, sd * 28, 47, sd * 10, 55]);       // brows knit down at the middle
      eye(g, sd * 24, 63, 6, 7.5);
      strokePath(g, '#c08a64', 2.5, [sd * 34, 74, sd * 24, 77, sd * 14, 74]);     // cheekbones
      strokePath(g, '#c08a64', 3, [sd * 56, 92, sd * 46, 112, sd * 22, 120]);     // strong jaw
    }
    strokePath(g, '#b07a56', 3, [-3, 64, 4, 80, -4, 85]);                          // nose
    strokePath(g, '#3a2418', 5, [-17, 100, 0, 97, 17, 100]);                       // set mouth
    strokePath(g, '#c08a64', 2.5, [-9, 107, 0, 109, 9, 107]);
    strokePath(g, '#a8704c', 3, [0, 113, 1, 117, 0, 121]);                          // cleft chin
  });
  const torsoArt = (g, w, h, back) => {
    g.fillStyle = blueS; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(10,20,70,0.45)'; g.lineWidth = 1.5;                      // scale-mail rows
    for (let y = 10; y < 70; y += 9) for (let x = (y / 9) % 2 ? 0 : 6; x < w; x += 12) { g.beginPath(); g.arc(x, y, 6, 0.2, PI - 0.2); g.stroke(); }
    if (back) { g.strokeStyle = '#4a2e18'; g.lineWidth = 7; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 40, 0); g.lineTo(64 - sd * 30, 108); g.stroke(); } return; }
    g.fillStyle = '#e8e8ee'; g.strokeStyle = '#0e1a48'; g.lineWidth = 3;          // the white star
    tAStar(g, 64, 40, 25); g.stroke(); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(30, 70, 68, 38);                           // red-and-white stripes
    g.fillStyle = redS; for (let j = 0; j < 7; j += 2) g.fillRect(30 + j * 68 / 7, 70, 68 / 7, 38);
    g.strokeStyle = '#0e1a48'; g.lineWidth = 2.5; g.strokeRect(30, 70, 68, 38);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(30, 66, 68, 3);
  };
  const decal = decalMat('tA-ca', (g, w, h) => torsoArt(g, w, h, false));
  const back = decalMat('tA-caBack', (g, w, h) => torsoArt(g, w, h, true));
  const f = fig({
    name: 'captain', skin: M.skin, headTop: blue, face, torso: blue, legs: blue, hips: blue, boots: brown, bootH: 0.55, arms: blue, hands: red, decal, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72, hb = scaled(b, 0, H, 0, 1);
      hb.addMatrix(tAShell(0.95), plastic(blue), m4(0, 0.1 * h, 0, 0, 0, 0, 1.06 * r, 0.92 * h, 1.06 * r));      // the cowl round back and sides
      hb.addMatrix(tAArc(2.0, false), plastic(blue), m4(0, 0.66 * h, 0, 0, 0, 0, 1.06 * r, 0.36 * h, 1.06 * r));  // brow band
      hb.addMatrix(tADome(), plastic(blue), m4(0, 1.02 * h, 0, 0, 0, 0, 1.06 * r, 0.26 * h, 1.06 * r));          // rounded crown
      // the white A
      for (const sd of [-1, 1]) tAOnHead(hb, sd * 0.075, 0.83 * h, 1.075 * r, 0.075 * r, 0.3 * h, 0.04 * r, white, 0, sd * 0.33);
      tAOnHead(hb, 0, 0.79 * h, 1.075 * r, 0.16 * r, 0.05 * h, 0.04 * r, white);
      for (const sd of [-1, 1]) {
        tAOnHead(hb, sd * 0.97, 0.38 * h, 1.06 * r, 0.1 * r, 0.6 * h, 0.06 * r, dkBlue);                         // cowl edges down the cheeks
        // little white wings at the temples, feathers swept back
        for (const [a, L] of [[1.0, 0.56], [0.62, 0.5], [0.26, 0.42]]) {
          tAOnHead(hb, sd * (1.22 + Math.cos(a) * L * 0.47), 0.58 * h + Math.sin(a) * L * 0.5 * r, 1.08 * r, L * r, 0.085 * h, 0.05 * r, white, 0, sd * a);
        }
        tAHeadDisc(hb, sd * 1.2, 0.58 * h, 1.07 * r, 0.09 * r, 0.07 * r, white);
      }
    },
    extra: (b) => {
      tABack(b, back);
      // brown belt with a silver buckle and pouches
      b.box(0, 1.38, 0, 1.34, 0.17, 0.72, brown);
      b.box(0, 1.395, 0.36, 0.19, 0.14, 0.045, M.silver);
      for (const sd of [-1, 1]) b.box(sd * 0.47, 1.34, 0.33, 0.19, 0.2, 0.1, dkBrown);
      // leather straps over the shoulders and down the chest
      for (const sd of [-1, 1]) {
        b.boxM(m4(sd * 0.28, 2.69, 0, 0, 0, sd * -0.12, 0.14, 0.06, 0.68), brown);
        b.boxM(m4(sd * 0.42, tAY(0.66), 0.335, 0, 0, sd * -0.08, 0.1, 0.94, 0.03), brown);
      }
    },
    // flared red glove cuffs
    arm: (a, s) => {
      const x = s * 0.04;
      a.box(x, -1.06, 0, 0.41, 0.22, 0.45, red);
      a.box(x, -0.86, 0, 0.415, 0.044, 0.455, 0x8a0e14);
      a.box(x, -0.4, 0, 0.395, 0.06, 0.435, dkBlue);
    },
  });
  const sh = shieldMesh(0.95);
  sh.traverse((o) => { if (o.isMesh) o.material = [o.material[0], o.material[1], o.material[1]]; });   // star on both faces
  sh.rotation.z = Math.PI / 2; sh.rotation.y = 0;
  sh.position.set(0.38, -0.9, 0.08);
  f.armL.add(sh);
  f.shield = sh;
  return f;
}
export { shieldMesh };

export function thor() {
  const armour = 0x2a2e35, armourLt = 0x454b55, silver = 0xccd2da, silverDk = 0x7a828c, red = 0xb3121b, redDk = 0x82101a;
  const gold = 0xdca23e, goldDk = 0xb07a28, leather = 0x4a2e1a, leatherDk = 0x2e1c10;
  const skinS = '#f2c9a0', W = 1.08, D = 1.05;
  // strong and cheerful: heavy brows over bright blue eyes, a short golden beard and a big grin
  const face = printFace('tA-thor', skinS, (g, X, h) => {
    g.fillStyle = '#e0aa48';                                                     // long hair round the sides and back
    g.beginPath(); g.moveTo(-X, 0); g.lineTo(X, 0); g.lineTo(X, h); g.lineTo(66, h); g.lineTo(62, 28);
    g.quadraticCurveTo(0, 16, -62, 28); g.lineTo(-66, h); g.lineTo(-X, h); g.closePath(); g.fill();
    g.fillStyle = '#b98232';                                                     // short beard: jaw, chin and moustache
    g.beginPath(); g.moveTo(-64, 58); g.lineTo(-54, 58); g.quadraticCurveTo(-50, 84, -32, 92); g.quadraticCurveTo(-14, 84, 0, 87);
    g.quadraticCurveTo(14, 84, 32, 92); g.quadraticCurveTo(50, 84, 54, 58); g.lineTo(64, 58); g.lineTo(64, 104);
    g.quadraticCurveTo(44, 128, 0, 128); g.quadraticCurveTo(-44, 128, -64, 104); g.closePath(); g.fill();
    g.strokeStyle = '#94641e'; g.lineWidth = 2;
    for (let x = -48; x <= 48; x += 8) { const y = 106 + (1 - Math.abs(x) / 56) * 10; g.beginPath(); g.moveTo(x, y); g.lineTo(x * 1.04, y + 7); g.stroke(); }
    for (const sd of [-1, 1]) {
      strokePath(g, '#7a4e16', 7, [sd * 8, 50, sd * 24, 44, sd * 42, 48]);        // heavy, determined brows
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sd * 23, 61, 8.5, 7.5, 0, 0, 7); g.fill();
      g.fillStyle = '#2f6fd8'; g.beginPath(); g.ellipse(sd * 22, 61.5, 6, 7, 0, 0, 7); g.fill();
      g.fillStyle = '#0c1a3a'; g.beginPath(); g.arc(sd * 22, 62, 3, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(sd * 22 + 2.2, 59, 2, 0, 7); g.fill();
      strokePath(g, '#3a2a1a', 2.5, [sd * 32, 55, sd * 23, 52, sd * 13, 55]);
    }
    strokePath(g, '#c8906a', 3, [-2, 66, 3, 77, -4, 81]);                         // nose
    g.fillStyle = '#fff'; g.strokeStyle = '#4a2410'; g.lineWidth = 3.5;           // the big grin
    g.beginPath(); g.moveTo(-17, 95); g.quadraticCurveTo(0, 99, 17, 95); g.quadraticCurveTo(10, 110, 0, 110); g.quadraticCurveTo(-10, 110, -17, 95); g.closePath(); g.fill(); g.stroke();
  });
  const decal = decalMat('tA-thor', (g, w, h) => {
    g.fillStyle = '#2a2e35'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#4a505a'; g.lineWidth = 3;                                  // segmented armour plates
    g.beginPath(); g.moveTo(10, 46); g.quadraticCurveTo(40, 54, 64, 44); g.quadraticCurveTo(88, 54, 118, 46); g.stroke();
    g.strokeStyle = '#121418'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 106); g.stroke();
    for (const y of [48, 76]) { g.beginPath(); g.moveTo(12, y); g.quadraticCurveTo(40, y + 8, 64, y - 2); g.quadraticCurveTo(88, y + 8, 116, y); g.stroke(); }
    g.fillStyle = '#121418';                                                     // recesses round the six discs
    for (const sd of [-1, 1]) for (const y of [34, 62, 91]) { g.beginPath(); g.arc(64 + sd * 26, y, 15, 0, 7); g.fill(); }
    g.fillStyle = '#9aa2ac';                                                     // silver piping down the flanks
    for (const sd of [-1, 1]) g.fillRect(64 + sd * 52 - 2, 20, 4, 86);
    g.fillStyle = '#16181c'; g.fillRect(0, 106, w, 22);                           // belt
    g.fillStyle = '#9aa2ac'; g.fillRect(4, 108, w - 8, 3); g.fillRect(52, 108, 24, 18);
  });
  const f = fig({
    name: 'thor', bulk: W, depth: D, skin: M.skin, headTop: gold, face, torso: armour, legs: 0x23262c, hips: 0x1c1e22, boots: 0x1c1e22, bootH: 0.5,
    arms: armour, hands: M.skin, decal, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72, hb = scaled(b, 0, H, 0, 1);
      blob(hb, 0, 0.94 * h, -0.06 * r, 1.1 * r, 0.3 * h, 1.1 * r, gold);                      // crown
      blob(hb, 0, 0.42 * h, -0.48 * r, 1.04 * r, 0.72 * h, 0.66 * r, gold);                    // the long mane down the back
      blob(hb, 0, -0.16 * h, -0.62 * r, 0.96 * r, 0.42 * h, 0.42 * r, gold, 0.3);
      for (let j = -1; j <= 1; j += 2) blob(hb, j * 0.3 * r, 0.3 * h, -1.02 * r, 0.12 * r, 0.5 * h, 0.1 * r, goldDk, 0.12, 0, j * 0.06);
      for (const sd of [-1, 1]) {
        // fringe swept to each side of a centre parting
        blob(hb, sd * 0.4 * r, 1.0 * h, 0.46 * r, 0.64 * r, 0.17 * h, 0.52 * r, gold, -0.3, 0, sd * -0.28);
        blob(hb, sd * 0.12 * r, 1.08 * h, 0.5 * r, 0.06 * r, 0.1 * h, 0.4 * r, goldDk, -0.3);
        // long locks falling past the ears to the shoulders
        blob(hb, sd * 0.9 * r, 0.52 * h, -0.12 * r, 0.27 * r, 0.62 * h, 0.64 * r, gold, 0, 0, sd * 0.05);
        blob(hb, sd * 0.88 * r, 0.0 * h, -0.24 * r, 0.25 * r, 0.42 * h, 0.52 * r, gold, 0.2, 0, sd * 0.16);
        blob(hb, sd * 1.06 * r, 0.36 * h, -0.1 * r, 0.08 * r, 0.5 * h, 0.42 * r, goldDk, 0, 0, sd * 0.08);
      }
    },
    extra: (b) => {
      // the six round silver discs, raised in two columns over the printed recesses
      for (const sd of [-1, 1]) for (const cy of [34, 62, 91]) {
        const x = sd * 0.264 * W, y = 2.68 - cy / 128 * 1.25, z = 0.33 * D;
        tADisc(b, x, y, z + 0.018, 0.123, 0.044, silver);
        tADisc(b, x, y, z + 0.038, 0.08, 0.015, silverDk);
        tADisc(b, x, y, z + 0.044, 0.05, 0.018, silver);
      }
      // cape over the shoulders to round silver clasps at the collarbones
      for (const sd of [-1, 1]) {
        b.boxM(m4(sd * 0.41, 2.69, -0.06, 0, 0, sd * -0.22, 0.29, 0.075, 0.66 * D), red);
        tADisc(b, sd * 0.41, tAY(0.9), 0.33 * D + 0.03, 0.11, 0.07, silver, -0.1);
        tADisc(b, sd * 0.41, tAY(0.9), 0.33 * D + 0.065, 0.065, 0.015, silverDk, -0.1);
      }
      b.box(0, 1.37, 0, 1.36 * W, 0.19, 0.74 * D, 0x16181c);                                 // belt
      b.box(0, 1.385, 0.37 * D, 0.29, 0.17, 0.045, silver);
      // the red cape, a moulded shell flaring behind to the ankles
      const cape = tACapeGeo('thor', { arc: 2.3, top: 0.72, folds: 3, fold: 0.07 });
      b.addMatrix(cape, plastic(red), m4(0, 2.66, -0.03, 0.07, 0, 0, 0.88 * W, 2.4, 0.56 * D));
      b.addMatrix(cape, plastic(redDk), m4(0, 2.645, -0.03, 0.07, 0, 0, 0.865 * W, 2.38, 0.545 * D));
    },
    // low rounded pauldrons and silver vambraces
    arm: (a, s) => {
      const x = s * 0.04;
      blob(a, x + s * 0.05, 0.05, 0, 0.29, 0.15, 0.3, armourLt, 0, 0, s * -0.3);
      blob(a, x + s * 0.08, -0.03, 0, 0.28, 0.08, 0.29, silverDk, 0, 0, s * -0.3);
      a.box(x, -1.08, 0, 0.42, 0.48, 0.47, silver);
      for (const y of [-0.92, -0.76]) a.box(x, y, 0, 0.425, 0.04, 0.475, silverDk);
    },
  });
  // Mjolnir, pivoting at the right hand so it can spin: leather-wrapped handle through the fist,
  // the silver head beyond it (the driver's hammer, scaled up)
  f.hammer = part(f.armR, -0.04, -1.36, 0.04, (pb) => {
    const b = scaled(pb, 0, 0, 0, 1.6);
    rod(b, [0, 0.12, 0], [0, -0.52, 0], 0.045, leather, 10);
    for (let j = 0; j < 7; j++) rod(b, [0, 0.06 - j * 0.085, 0], [0, 0.09 - j * 0.085, 0], 0.05, leatherDk, 10);
    rod(b, [0, 0.1, 0], [0, 0.17, 0], 0.065, silver, 12);                                  // pommel
    b.addMatrix(tACached('thStrap', () => new THREE.TorusGeometry(1, 0.22, 6, 14)), plastic(leatherDk), m4(0, 0.25, 0, 0, PI / 2, 0, 0.09, 0.11, 0.09));
    rod(b, [0, -0.52, 0], [0, -0.47, 0], 0.07, silver, 12);
    b.boxM(m4(0, -0.69, 0, 0, 0, 0, 0.4, 0.32, 0.66), 0x9aa3ad);                          // the head
    b.boxM(m4(0, -0.69, 0, 0, 0, 0, 0.44, 0.36, 0.5), 0xb8c0ca);
    for (const z of [-1, 1]) {
      b.boxM(m4(0, -0.69, z * 0.335, 0, 0, 0, 0.34, 0.26, 0.03), 0x6e7680);                 // end faces with knotwork
      b.addMatrix(tACached('thKnot', () => new THREE.TorusGeometry(1, 0.18, 6, 16)), plastic(0xd0d6de), m4(0, -0.69, z * 0.35, 0, 0, 0, 0.08, 0.08, 0.08));
    }
  });
  return f;
}

export function hulk() {
  const face = faceMat('hulk', (g, w, h) => { fill(g, w, h, '#4f9a2a'); eyesMouth(g, 128, 66, { mouth: 'angry', brow: '#1b2a14' }); g.fillStyle = '#1b1d18'; g.fillRect(0, 0, w, 16); });
  const decal = decalMat('hulk', (g, w, h) => {
    fill(g, w, h, '#4f9a2a');
    g.strokeStyle = '#2f6a1a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, 50); g.quadraticCurveTo(w / 2 + s * 30, 58, w / 2 + s * 44, 30); g.stroke(); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(w / 2 + s * 4, 70 + k * 16); g.lineTo(w / 2 + s * 20, 70 + k * 16); g.stroke(); } }
  });
  return fig({
    name: 'hulk', skin: M.hulk, headTop: M.black, face, torso: M.hulk, hips: M.purple, legs: M.purple, boots: M.hulk, bootH: 0.5, arms: M.hulk, hands: M.hulk, handR: 0.26, decal, bulk: 1.6, depth: 1.3, noStud: true,
    head: (b, H) => { b.sphere(0, H + 0.6, -0.04, 0.44, M.black, { sy: 0.5 }); for (let k = 0; k < 5; k++) b.box(-0.3 + k * 0.15, H + 0.66, 0.2, 0.16, 0.14, 0.2, M.black); },
    extra: (b) => { for (const s of [-1, 1]) b.box(s * 0.5 * 1.6, 0.55, 0.02, 0.35, 0.3, 0.95, M.purple); },
  });
}

export function widow() {
  const face = faceMat('widow', (g, w, h) => { fill(g, w, h, '#f2c9a0'); eyesMouth(g, 128, 64, { mouth: 'smirk', brow: '#9a3a1a', lips: '#b0303a' }); g.fillStyle = '#b8401a'; g.fillRect(0, 0, 78, h); g.fillRect(178, 0, 78, h); g.fillRect(0, 0, w, 20); });
  const decal = decalMat('widow', (g, w, h) => {
    fill(g, w, h, '#1a1d22');
    g.strokeStyle = '#3a3e46'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    g.fillStyle = '#9a9ea6'; g.fillRect(0, h - 22, w, 14);
    g.fillStyle = '#d01a1a'; g.beginPath(); g.moveTo(w / 2 - 10, h - 30); g.lineTo(w / 2 + 10, h - 30); g.lineTo(w / 2 - 10, h); g.lineTo(w / 2 + 10, h); g.closePath(); g.fill();
  });
  const baton = glow(0x5ac8ff, 2.5);
  return fig({
    name: 'widow', skin: M.skin, headTop: 0xb8401a, face, torso: M.black, legs: M.black, boots: 0x2a2d33, arms: M.black, hands: M.black, decal, noStud: true,
    head: (b, H) => { b.sphere(0, H + 0.58, 0, 0.44, 0xb8401a, { sy: 0.5 }); b.box(0, H - 0.05, -0.18, 0.92, 0.72, 0.5, 0xb8401a); },
    arm: (a, s) => { a.box(s * 0.04, -1.1, 0, 0.4, 0.14, 0.44, M.gold, { matOpts: { emissive: 0x5ac8ff, emissiveIntensity: 0.6 } }); a.boxM(mat4(s * 0.04, -1.4, 0.4, Math.PI / 2, 0, 0, 0.1, 1.1, 0.1), 0, { mat: baton }); },
  });
}

export function hawkeye() {
  const hairC = 0xb08a52, suit = 0x1d1a26, purple = 0x6a32a8, dkPurple = 0x48226e, strap = 0x2e2620;
  const skinS = '#f2c9a0', hairS = '#b08a52';
  const face = printFace('hawk', skinS, (g, X) => {
    // short sandy crop: hairline, sideburns and the back of the head
    g.fillStyle = hairS;
    g.beginPath(); g.moveTo(-X, 0); g.lineTo(X, 0); g.lineTo(X, 100); g.lineTo(78, 92); g.lineTo(70, 30);
    g.quadraticCurveTo(30, 22, 4, 30); g.quadraticCurveTo(-30, 22, -70, 30); g.lineTo(-78, 92); g.lineTo(-X, 100); g.closePath(); g.fill();
    for (const sd of [-1, 1]) g.fillRect(sd > 0 ? 58 : -70, 30, 12, 26);
    for (const sd of [-1, 1]) {
      strokePath(g, '#6a4a22', 6.5, [sd * 42, 45, sd * 26, 43, sd * 10, 50]);   // low, focused brows
      eye(g, sd * 23, 62, 6, 7.5);
      g.fillStyle = skinS; g.fillRect(sd * 23 - 9, 51, 18, 5);                // squint
      strokePath(g, '#2a1a12', 2.5, [sd * 31, 57, sd * 23, 55, sd * 15, 57]);
    }
    strokePath(g, '#c08a64', 3, [-2, 68, 3, 78, -4, 82]);                       // nose
    strokePath(g, '#3a2418', 4.5, [-15, 98, 2, 101, 16, 92]);                    // smirk
    strokePath(g, '#c08a64', 2.5, [-10, 110, 0, 112, 10, 110]);                  // chin
  });
  const decal = decalMat('hawk', (g, w, h) => {
    g.fillStyle = '#1d1a26'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a32a8';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, 26); g.lineTo(64, 46); g.lineTo(0, 26); g.closePath(); g.fill();   // yoke
    g.beginPath(); g.moveTo(12, 36); g.lineTo(30, 42); g.lineTo(36, h); g.lineTo(8, h); g.closePath(); g.fill();                 // side panels
    g.beginPath(); g.moveTo(w - 12, 36); g.lineTo(w - 30, 42); g.lineTo(w - 36, h); g.lineTo(w - 8, h); g.closePath(); g.fill();
    g.fillStyle = skinS; g.beginPath(); g.moveTo(50, 0); g.lineTo(78, 0); g.lineTo(64, 18); g.closePath(); g.fill();
    g.strokeStyle = '#3a1c5c'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 28); g.lineTo(64, 48); g.lineTo(w, 28); g.stroke();
    g.strokeStyle = '#8a8e96'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 48); g.lineTo(64, h); g.stroke();   // zip
    g.strokeStyle = '#2e2a36'; g.lineWidth = 2;
    for (const y of [70, 92]) { g.beginPath(); g.moveTo(36, y); g.lineTo(92, y); g.stroke(); }
  });
  const f = fig({
    name: 'hawkeye', skin: M.skin, headTop: hairC, face, torso: suit, legs: suit, hips: suit, boots: M.black, bootH: 0.45, belt: 0x15131a, arms: M.skin, hands: M.black, decal, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72;
      blob(b, 0, H + 0.88 * h, -0.04 * r, 1.04 * r, 0.27 * h, 1.04 * r, hairC);
      // short spiky crop, flicked up at the front
      const m = plastic(hairC);
      for (let j = -3; j <= 3; j++) b.addMatrix(SPIKE, m, m4(j * 0.22 * r, H + 0.96 * h, (0.62 - Math.abs(j) * 0.09) * r, 0.75, 0, -j * 0.2, 0.17 * r, 0.24 * h, 0.17 * r));
      for (let j = -2; j <= 2; j++) b.addMatrix(SPIKE, m, m4(j * 0.3 * r, H + 1.04 * h, 0.15 * r, 0.35, 0, -j * 0.3, 0.2 * r, 0.2 * h, 0.2 * r));
    },
    extra: (b) => {
      b.box(0, 1.42, 0.35, 0.2, 0.14, 0.04, M.silver);                                   // belt buckle
      // quiver strap: right shoulder across the chest to the left hip, and across the back
      for (const z of [0.36, -0.36]) b.boxM(m4(0.02, 2.02, z, 0, 0, 0.62, 0.15, 1.45, 0.04), strap);
      b.boxM(m4(-0.38, 2.68, 0, 0, 0, -0.3, 0.17, 0.05, 0.76), strap);
      b.boxM(m4(-0.18, 2.32, 0.385, 0, 0, 0.62, 0.15, 0.1, 0.03), M.silver);
      // the quiver over the right shoulder, arrows bristling with purple fletching
      const k = 1.5, z0 = -0.53;
      const A = [0.33, 1.6, z0], B = [-0.33, 2.92, z0];
      const at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, z0];
      rod(b, A, B, 0.13 * k, 0x2a2434, 12);
      for (const [t0, t1, rr, c] of [[-0.03, 0.04, 0.115, purple], [0.14, 0.2, 0.137, purple], [0.8, 0.86, 0.137, purple], [0.96, 1.02, 0.142, dkPurple]]) rod(b, at(t0), at(t1), rr * k, c, 12);
      const ang = Math.atan2(A[0] - B[0], B[1] - A[1]);
      for (let j = 0; j < 5; j++) {
        const off = (j - 2) * 0.05 * k, sp = (j - 2) * 0.09, len = (0.34 + (j % 2) * 0.08) * k;
        const base = at(0.85), dir = [-Math.sin(ang + sp), Math.cos(ang + sp)];
        const p0 = [base[0] + off * Math.cos(ang), base[1] + off * Math.sin(ang), z0 + ((j % 3) - 1) * 0.05 * k];
        const p1 = [p0[0] + dir[0] * len, p0[1] + dir[1] * len, p0[2]];
        rod(b, p0, p1, 0.02 * k, 0x3a3e46, 5);
        const q = [p0[0] + dir[0] * (len - 0.09 * k), p0[1] + dir[1] * (len - 0.09 * k), p0[2]];
        for (const [vx, vz] of [[0.015, 0.11], [0.11, 0.015]]) b.boxM(m4(q[0], q[1], q[2], 0, 0, ang + sp, vx * k, 0.14 * k, vz * k), j === 2 ? 0xe8e8ee : purple);
      }
    },
    // bare arms: suit cap sleeves with a purple band, black gauntlets, a purple guard on the bow arm
    arm: (a, s) => {
      const x = s * 0.04;
      a.sphere(x, -0.04, 0, 0.245, suit, { sy: 0.85 });
      a.box(x, -0.42, 0, 0.39, 0.4, 0.43, suit);
      a.box(x, -0.47, 0, 0.4, 0.06, 0.44, purple);
      a.box(x, -1.0, 0, 0.39, 0.36, 0.43, M.black);
      if (s > 0) a.box(x, -0.98, 0.2, 0.25, 0.28, 0.06, purple);
      else a.box(x, -0.74, 0, 0.4, 0.05, 0.44, purple);
    },
  });
  // recurve bow in the left hand: limbs along the arm's Z, belly away from the archer (-Y)
  f.bow = part(f.armL, 0.04, -1.2, 0.04, (pb) => {
    const b = scaled(pb, 0, 0, 0, 1.5);
    const pt = (u) => [0, 0.17 * u * u - 0.04, 0.66 * u];
    for (let i = 0; i < 8; i++) { const u0 = -1 + i / 4, u1 = u0 + 0.25; rod(b, pt(u0), pt(u1), 0.042, Math.abs(u0 + 0.125) < 0.3 ? 0x2a2632 : purple, 6); }
    for (const sd of [-1, 1]) { rod(b, pt(sd), [0, 0.06, sd * 0.84], 0.035, 0x2a2632, 6); b.sphere(0, 0.06, sd * 0.84, 0.04, M.silver); }
    b.boxM(m4(0, -0.05, 0, 0, 0, 0, 0.1, 0.16, 0.36), 0x2a2632);
    b.boxM(m4(0.06, -0.05, 0.12, 0, 0, 0, 0.03, 0.08, 0.08), purple);
    rod(b, [0, 0.13, -0.66], [0, 0.13, 0.66], 0.014, C.white, 4);                         // string
  });
  return f;
}

export function panther() {
  const blk = 0x141519, blkLt = 0x24262d, silver = 0xc4cad4;
  const sv = '#b8bec8', purple = '#b47cff';
  const pl = (g, col, wd, pts) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
  // the panther mask: white angular lenses and fine silver lines that frame the eyes, run up
  // over the brow in triangles and down the cheeks to the muzzle (the same lines glow purple)
  const maskLines = (g, col, wd) => {
    pl(g, col, wd, [0, 0, 0, 56]);
    for (const sd of [-1, 1]) {
      pl(g, col, wd, [sd * 3, 56, sd * 20, 45, sd * 44, 37, sd * 58, 44]);              // brow line
      pl(g, col, wd, [sd * 6, 53, sd * 16, 0]); pl(g, col, wd, [sd * 30, 41, sd * 46, 0]);   // up over the forehead
      pl(g, col, wd, [sd * 47, 50, sd * 46, 84, sd * 22, 118]);                          // cheeks down to the muzzle
      pl(g, col, wd, [sd * 16, 68, sd * 20, 88, 0, 102]);
      pl(g, col, wd, [sd * 58, 44, sd * 92, 30, sd * 140, 26]);                          // swept back over the ears
      pl(g, col, wd, [sd * 46, 84, sd * 90, 96, sd * 140, 98]);
    }
  };
  const face = tALitFace('tA-bp', '#141519', (g) => {
    g.fillStyle = '#1e2026';                                                       // the muzzle, a shade lighter
    g.beginPath(); g.moveTo(-16, 68); g.lineTo(-22, 90); g.lineTo(0, 106); g.lineTo(22, 90); g.lineTo(16, 68); g.closePath(); g.fill();
    maskLines(g, sv, 2.5);
    for (const sd of [-1, 1]) {                                                    // white angular lenses
      g.fillStyle = '#f6f8fc'; g.strokeStyle = sv; g.lineWidth = 3;
      g.beginPath(); g.moveTo(sd * 6, 63); g.lineTo(sd * 18, 55); g.lineTo(sd * 40, 47); g.lineTo(sd * 48, 49);
      g.lineTo(sd * 38, 62); g.lineTo(sd * 16, 68); g.closePath(); g.fill(); g.stroke();
    }
    g.fillStyle = '#6a707a'; g.beginPath(); g.moveTo(-6, 76); g.lineTo(6, 76); g.lineTo(0, 84); g.closePath(); g.fill();   // nose
    pl(g, '#5a606a', 2.5, [-12, 96, 0, 99, 12, 96]);                               // mouth seam
  }, (g) => {
    maskLines(g, purple, 4);
    g.fillStyle = 'rgba(180,124,255,0.35)';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 6, 63); g.lineTo(sd * 40, 47); g.lineTo(sd * 48, 49); g.lineTo(sd * 38, 62); g.lineTo(sd * 16, 68); g.closePath(); g.fill(); }
  });
  // the suit: a fine triangle weave, bold silver lines in a V under the fang necklace, down the abs and flanks
  const weave = (g, w, h) => {
    g.fillStyle = '#141519'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2e313a'; g.lineWidth = 1.5;
    for (let x = -128; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 64, h); g.stroke(); g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 64, h); g.stroke(); }
  };
  const suitLines = (g, col, wd) => {
    pl(g, col, wd, [14, 0, 64, 46, 114, 0]);
    pl(g, col, wd, [4, 16, 64, 66, 124, 16]);
    for (const sd of [-1, 1]) {
      pl(g, col, wd, [64 + sd * 12, 58, 64 + sd * 14, 108]);
      pl(g, col, wd, [64 + sd * 50, 30, 64 + sd * 40, 112]);
      pl(g, col, wd, [64 + sd * 14, 84, 64 + sd * 40, 74]);
    }
    pl(g, col, wd, [8, 112, 120, 112]);
  };
  const decal = decalMat('tA-bp', (g, w, h) => {
    weave(g, w, h);
    suitLines(g, sv, 3);
    g.fillStyle = '#b8bec8';                                                      // small silver triangles on the chest
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 22, 52); g.lineTo(64 + sd * 40, 40); g.lineTo(64 + sd * 34, 58); g.closePath(); g.fill(); }
  }, (g) => suitLines(g, purple, 5));
  const backLines = (g, col, wd) => {
    pl(g, col, wd, [10, 0, 64, 40, 118, 0]);
    pl(g, col, wd, [64, 40, 64, 112]);
    for (const sd of [-1, 1]) { pl(g, col, wd, [64 + sd * 50, 28, 64 + sd * 18, 76, 64, 112]); pl(g, col, wd, [64 + sd * 50, 28, 64 + sd * 40, 112]); }
    pl(g, col, wd, [8, 112, 120, 112]);
  };
  const back = decalMat('tA-bpBack', (g, w, h) => { weave(g, w, h); backLines(g, sv, 3); }, (g) => backLines(g, purple, 5));
  // the track pulses the first lit print it finds on the body (the chest): the mask and back follow it
  if (!decal.userData.tALinked) {
    decal.userData.tALinked = true;
    let k = decal.emissiveIntensity;
    const sync = () => { face.emissiveIntensity = k * 0.8; back.emissiveIntensity = k; };
    Object.defineProperty(decal, 'emissiveIntensity', { configurable: true, get: () => k, set: (v) => { k = v; sync(); } });
    sync();
  }
  return fig({
    name: 'panther', skin: blk, face, torso: blk, legs: blk, hips: blk, boots: blkLt, bootH: 0.42, arms: blk, hands: blkLt, decal, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72, hb = scaled(b, 0, H, 0, 1);
      blob(hb, 0, 0.9 * h, -0.02 * r, 1.0 * r, 0.3 * h, 1.0 * r, blk);                       // smooth domed mask
      // pointed cat ears: three-sided, a flat face to the front with a silver inner edge
      const ear = tACached('bpEar', () => new THREE.ConeGeometry(0.5, 1, 3).rotateY(PI).translate(0, 0.5, 0));
      for (const sd of [-1, 1]) {
        hb.addMatrix(ear, plastic(blk), m4(sd * 0.56 * r, 0.98 * h, -0.12 * r, -0.15, 0, sd * -0.3, 0.6 * r, 0.42 * h, 0.32 * r));
        hb.addMatrix(ear, plastic(silver), m4(sd * 0.57 * r, 1.0 * h, -0.06 * r, -0.15, 0, sd * -0.3, 0.38 * r, 0.3 * h, 0.08 * r));
        hb.addMatrix(ear, plastic(blkLt), m4(sd * 0.575 * r, 1.0 * h, -0.045 * r, -0.15, 0, sd * -0.3, 0.26 * r, 0.22 * h, 0.06 * r));
      }
    },
    extra: (b) => {
      tABack(b, back);
      // the silver fang necklace: a beaded band with claws hanging down, the middle ones longest
      const fang = tACached('bpFang', () => new THREE.ConeGeometry(1, 1, 6).rotateX(PI).translate(0, -0.5, 0));
      const at = (a) => [Math.sin(a) * 0.41, tAY(1.0 - Math.cos(a) * 0.11), Math.cos(a) * 0.33 + 0.018];
      for (let j = 0; j <= 10; j++) {
        const a = (j - 5) * 0.2, p = at(a);
        if (j < 10) rod(b, p, at(a + 0.2), 0.026, silver, 6);
        blob(b, p[0], p[1], p[2], 0.044, 0.044, 0.044, silver);
        const L = (0.15 - Math.abs(j - 5) * 0.016) * 1.5;
        b.addMatrix(fang, plastic(silver), m4(p[0], p[1] - 0.015, p[2] + 0.012, 0.12, a * 0.6, -a * 0.5, 0.047, L, 0.032));
      }
    },
    arm: (a, s) => {
      const x = s * 0.04;
      a.boxM(m4(x, -0.48, 0.205, 0, 0, 0, 0.06, 0.72, 0.02), silver);                          // silver line down the arm
      a.boxM(m4(x + s * 0.09, 0.08, 0.17, -0.5, 0, s * 0.4, 0.19, 0.05, 0.1), silver);           // shoulder triangle
      a.box(x, -1.0, 0, 0.4, 0.05, 0.45, silver);                                                // cuffs
      const claw = tACached('bpClaw', () => new THREE.ConeGeometry(1, 1, 5).rotateX(PI).translate(0, -0.5, 0));
      for (let j = -1; j <= 1; j++) a.addMatrix(claw, plastic(silver), m4(x + j * 0.085, -1.34, 0.18, -0.4, 0, 0, 0.03, 0.24, 0.03));
    },
  });
}

export function strange() {
  const red = 0xb3121b, redDk = 0x6e0d10, blue = 0x1c2a5a, navy = 0x141c40, hairC = 0x2a201c;
  const brown = 0x4a3020, tan = 0x8a6238, gold = 0xd2a03c, goldDk = 0x9a6e22;
  const skinS = '#f2c9a0', hairS = '#2a201c';
  // sharp and aloof: arched brows, grey-green eyes, high cheekbones and the grey-flecked goatee
  const face = printFace('tA-ds', skinS, (g, X) => {
    g.fillStyle = hairS;                                                          // hair round the sides and back
    g.beginPath(); g.moveTo(-X, 0); g.lineTo(X, 0); g.lineTo(X, 104); g.lineTo(74, 96); g.lineTo(68, 26);
    g.quadraticCurveTo(0, 12, -68, 26); g.lineTo(-74, 96); g.lineTo(-X, 104); g.closePath(); g.fill();
    g.fillStyle = '#a4a4aa';                                                      // grey temples and sideburns
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 56, 28); g.lineTo(sd * 70, 26); g.lineTo(sd * 74, 84); g.lineTo(sd * 60, 80); g.closePath(); g.fill(); }
    for (const sd of [-1, 1]) {
      strokePath(g, hairS, 5.5, [sd * 8, 50, sd * 22, 39, sd * 42, 46]);           // sharp arched brows
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sd * 23, 60, 9, 7, 0, 0, 7); g.fill();
      g.fillStyle = '#5a9a86'; g.beginPath(); g.ellipse(sd * 22, 60.5, 6, 7, 0, 0, 7); g.fill();
      eye(g, sd * 22, 61, 3.4, 4, '#121414');
      strokePath(g, '#2a1a14', 2.5, [sd * 32, 54, sd * 23, 51, sd * 14, 54]);
      strokePath(g, '#cf9c7c', 2.5, [sd * 40, 72, sd * 35, 86, sd * 30, 96]);       // cheekbones
    }
    strokePath(g, '#c08a64', 2.5, [-3, 42, -3, 47, -2, 51]);                       // frown line
    strokePath(g, '#c08a64', 3, [-2, 64, 3, 78, -4, 82]);                         // nose
    g.fillStyle = hairS;                                                          // moustache down into the goatee
    g.beginPath(); g.moveTo(-21, 96); g.quadraticCurveTo(0, 87, 21, 96); g.lineTo(22, 102); g.quadraticCurveTo(0, 95, -22, 102); g.closePath(); g.fill();
    for (const sd of [-1, 1]) strokePath(g, hairS, 4.5, [sd * 20, 98, sd * 22, 106, sd * 14, 112]);
    g.beginPath(); g.moveTo(-15, 108); g.quadraticCurveTo(0, 113, 15, 108); g.lineTo(11, 124); g.quadraticCurveTo(0, 131, -11, 124); g.closePath(); g.fill();
    g.fillStyle = '#6a6466'; g.beginPath(); g.ellipse(0, 121, 4, 5, 0, 0, 7); g.fill();   // a fleck of grey at the chin
    strokePath(g, '#5a2a22', 2.5, [-11, 104.5, 0, 106, 12, 103]);                  // a thin, knowing mouth
  });
  const decal = decalMat('tA-ds', (g, w, h) => {
    g.fillStyle = '#1c2a5a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#141c40'; g.beginPath(); g.moveTo(46, 0); g.lineTo(82, 0); g.lineTo(64, 34); g.closePath(); g.fill();   // dark undershirt
    g.fillStyle = '#2a4290';                                                      // the layered wrap, crossing left over right
    g.beginPath(); g.moveTo(0, 0); g.lineTo(52, 0); g.lineTo(96, h); g.lineTo(0, h); g.closePath(); g.fill();
    g.strokeStyle = '#4e6ac0'; g.lineWidth = 4; g.beginPath(); g.moveTo(52, 0); g.lineTo(96, h); g.stroke();
    g.strokeStyle = '#13204a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(82, 0); g.lineTo(64, 34); g.stroke();
    g.beginPath(); g.moveTo(20, 10); g.lineTo(24, h); g.stroke();
    g.beginPath(); g.moveTo(108, 10); g.lineTo(104, h); g.stroke();
    g.strokeStyle = '#3a2618'; g.lineWidth = 2.5;                                 // the amulet's cord
    g.beginPath(); g.moveTo(44, 0); g.lineTo(64, 30); g.lineTo(84, 0); g.stroke();
  });
  tAGemMat ||= new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x20e060, emissiveIntensity: 1.2, roughness: 0.2 });
  return fig({
    name: 'strange', skin: M.skin, headTop: hairC, face, torso: blue, legs: navy, hips: brown, boots: brown, bootH: 0.45, arms: blue, hands: M.skin, decal, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72, hb = scaled(b, 0, H, 0, 1);
      // swept-back dark hair with a lifted quiff, greying at the temples
      blob(hb, 0, 0.86 * h, -0.1 * r, 1.08 * r, 0.32 * h, 1.08 * r, hairC);
      blob(hb, 0, 0.55 * h, -0.5 * r, 1.03 * r, 0.5 * h, 0.6 * r, hairC);
      blob(hb, 0.06 * r, 1.12 * h, 0.32 * r, 0.82 * r, 0.22 * h, 0.56 * r, hairC, -0.45, 0, -0.08);
      blob(hb, -0.2 * r, 1.2 * h, 0.08 * r, 0.5 * r, 0.16 * h, 0.5 * r, hairC, -0.2, 0, 0.2);
      for (const sd of [-1, 1]) blob(hb, sd * 0.88 * r, 0.74 * h, -0.2 * r, 0.16 * r, 0.26 * h, 0.56 * r, hairC);
    },
    extra: (b) => {
      // the tall, flared collar of the Cloak of Levitation, framing the head
      const collar = tACapeGeo('dsCollar', { arc: 3.7, top: 0.5, folds: 2, fold: 0.05, thick: 0.12 });
      b.addMatrix(collar, plastic(red), m4(0, tAY(0.9), -0.045, 0, 0, PI, 0.8, 0.85, 0.66));
      b.addMatrix(collar, plastic(redDk), m4(0, tAY(0.9) + 0.008, -0.045, 0, 0, PI, 0.78, 0.83, 0.64));
      for (const sd of [-1, 1]) blob(b, sd * 0.41, 2.62, -0.06, 0.28, 0.11, 0.37, red, 0, 0, sd * -0.25);   // over the shoulders
      // the cloak, flowing from the shoulders to the ankles
      const cloak = tACapeGeo('dsCloak', { arc: 2.4, top: 0.64, folds: 4, fold: 0.09 });
      b.addMatrix(cloak, plastic(red), m4(0, 2.64, -0.045, 0.1, 0, 0, 0.93, 2.45, 0.6));
      b.addMatrix(cloak, plastic(redDk), m4(0, 2.625, -0.045, 0.1, 0, 0, 0.91, 2.42, 0.58));
      // the wide belt-sash with tan straps
      b.box(0, 1.37, 0, 1.34, 0.3, 0.74, brown);
      for (const y of [1.43, 1.6]) b.box(0, y, 0, 1.35, 0.045, 0.75, tan);
      b.box(0.14, 1.385, 0.38, 0.14, 0.26, 0.045, tan);
      // the Eye of Agamotto on its cord: a gold disc, a closed-eye frame and the green Time Stone
      const ay = tAY(0.74), az = 0.36;
      tADisc(b, 0, ay, az, 0.167, 0.05, gold);
      tADisc(b, 0, ay, az + 0.026, 0.123, 0.015, goldDk);
      blob(b, 0, ay, az + 0.044, 0.13, 0.072, 0.03, gold);
      for (const sd of [-1, 1]) b.boxM(m4(sd * 0.174, ay, az, 0, 0, sd * 0.6, 0.072, 0.044, 0.044), gold);
      b.sphere(0, ay, az + 0.058, 0.046, 0, { mat: tAGemMat });
    },
    // leather wrist wraps
    arm: (a, s) => {
      const x = s * 0.04;
      a.box(x, -1.08, 0, 0.4, 0.48, 0.46, 0x6a4a2a);
      for (const y of [-0.94, -0.78]) a.boxM(m4(x, y, 0, 0, 0, 0.25, 0.41, 0.035, 0.47), 0x3e2a16);
    },
  });
}
let mandalaMatCache = null;
export function mandalaMat() {
  if (mandalaMatCache) return mandalaMatCache;
  const t = tex('mandala', 256, 256, (g, w) => {
    const c = w / 2; g.clearRect(0, 0, w, w);
    g.strokeStyle = '#ffb030'; g.lineWidth = 6; g.shadowColor = '#ff7a00'; g.shadowBlur = 10;
    for (const r of [0.96, 0.8, 0.5]) { g.beginPath(); g.arc(c, c, c * r, 0, 7); g.stroke(); }
    g.lineWidth = 4;
    for (let k = 0; k < 2; k++) { g.beginPath(); for (let j = 0; j <= 4; j++) { const a = k * Math.PI / 4 + j * Math.PI / 2; g.lineTo(c + Math.cos(a) * c * 0.8, c + Math.sin(a) * c * 0.8); } g.stroke(); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.82, c + Math.sin(a) * c * 0.82); g.lineTo(c + Math.cos(a) * c * 0.94, c + Math.sin(a) * c * 0.94); g.stroke(); }
  });
  mandalaMatCache = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xffc070 });
  return mandalaMatCache;
}

// ---- Star-Lord, Rocket, Groot, Thanos and Loki helpers ------------------------------------------
// These five match their drivers (js/drivers/marvel.js). The driver pieces are ported through tBxf:
// a builder seen through an offset / rotation / uniform scale, so head parts can be built in the
// head's own frame (y = 0 at the base of the head) and props in driver units.
const tBgeo = new Map();
const tBc = (k, make) => { let g = tBgeo.get(k); if (!g) { g = make(); tBgeo.set(k, g); } return g; };
const tBbox = () => tBc('box', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
const tBboxC = () => tBc('boxC', () => new THREE.BoxGeometry(1, 1, 1));
const tBcyl = (seg = 16) => tBc('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0));
const tBcylC = () => tBc('cylC', () => new THREE.CylinderGeometry(1, 1, 1, 24));
function tBtaper(bw, tw, h, d, td = d) {
  return tBc(`taper${bw},${tw},${h},${d},${td}`, () => {
    const g = new THREE.BoxGeometry(bw, h, d), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * (tw / bw)); p.setZ(i, p.getZ(i) * (td / d)); }
    g.computeVertexNormals();
    return g.translate(0, h / 2, 0);
  });
}
function tBxf(b, x, y, z, k = 1, rx = 0, ry = 0, rz = 0) {
  const base = m4(x, y, z, rx, ry, rz, k, k, k), T = new THREE.Matrix4();
  const put = (g, mat, m) => b.addMatrix(g, mat, T.multiplyMatrices(base, m));
  const pm = (c, o) => (o && o.mat) || plastic(c);
  return {
    addMatrix: put,
    add: (g, mat, px, py, pz, r = 0, sx = 1, sy = 1, sz = 1) => put(g, mat, m4(px, py, pz, 0, r, 0, sx, sy, sz)),
    box: (px, py, pz, sx, sy, sz, c, o) => put(tBbox(), pm(c, o), m4(px, py, pz, 0, 0, 0, sx, sy, sz)),
    boxM: (m, c, o) => put(tBboxC(), pm(c, o), m),
    cyl: (px, py, pz, r, h, c, o = {}) => put(tBcyl(o.seg || 16), pm(c, o), m4(px, py, pz, 0, 0, 0, r, h, r)),
    sphere: (px, py, pz, r, c, o = {}) => put(SPH, pm(c, o), m4(px, py, pz, 0, 0, 0, r, r * (o.sy || 1), r)),
  };
}
// a piece laid on a cylinder head: angle th round from the front, height y, distance out from the axis
const tBonHead = (b, th, y, out, w, h, dp, col, tilt = 0, roll = 0, geo = null) => b.addMatrix(geo || tBboxC(), plastic(col),
  new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(th) * out, y, Math.cos(th) * out), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, th, roll, 'YXZ')), new THREE.Vector3(w, h, dp)));
// a tapering curved tube from p along dir, bending by `bend` per segment (horns, scepter prongs)
function tBtube(b, p, dir, n, len, r0, r1, bend, col, col2 = col) {
  let d = new THREE.Vector3(...dir).normalize(), a = new THREE.Vector3(...p);
  for (let i = 0; i < n; i++) {
    const c = a.clone().addScaledVector(d, len);
    rod(b, a.toArray(), c.toArray(), r0 + (r1 - r0) * i / Math.max(1, n - 1), i % 2 ? col2 : col, 8);
    if (i < n - 1) b.sphere(c.x, c.y, c.z, r0 + (r1 - r0) * (i + 0.5) / Math.max(1, n - 1), i % 2 ? col2 : col);
    a = c; d.add(new THREE.Vector3(...bend)).normalize();
  }
  return a;
}

// Star-Lord's masked head (driver hair + mask), built in the head frame: r = head radius, H = height
function tBstarlordHead(hb, r, H, maskMat) {
  const TH = 3.3, EYE = 0.28;
  const hair = 0x6e4024, hairLt = 0x8a5632, gunmetal = 0x3a3e46, silver = 0x9ea6b0;
  const cy = tBcylC();
  const arc = tBc('slArc', () => new THREE.CylinderGeometry(1, 1, 1, 28, 1, true, -TH / 2, TH).translate(0, 0.5, 0));
  const arcC = tBc('slArcC', () => new THREE.CylinderGeometry(1, 1, 1, 28, 1, false, -TH / 2, TH).translate(0, 0.5, 0));
  const browC = tBc('slBrowC', () => new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, -0.85, 1.7).translate(0, 0.5, 0));
  // swept-back hair: crown, back and the quiff above the mask
  blob(hb, 0, 0.98 * H, -0.06 * r, 1.08 * r, 0.24 * H, 1.08 * r, hair);
  blob(hb, 0, 0.62 * H, -0.42 * r, 1.06 * r, 0.45 * H, 0.72 * r, hair);
  blob(hb, 0.12 * r, 1.1 * H, 0.42 * r, 0.7 * r, 0.2 * H, 0.46 * r, hair, -0.55, 0, -0.18);
  blob(hb, -0.32 * r, 1.08 * H, 0.36 * r, 0.5 * r, 0.17 * H, 0.42 * r, hairLt, -0.5, 0, 0.35);
  blob(hb, 0.4 * r, 1.04 * H, 0.5 * r, 0.42 * r, 0.14 * H, 0.36 * r, hairLt, -0.6, 0, -0.5);
  // the face mask plate, its rims and a small brow ridge
  hb.add(arc, maskMat, 0, -0.03 * H, 0, 0, 1.05 * r, 0.93 * H, 1.05 * r);
  hb.add(arcC, plastic(0x2e3136), 0, 0.86 * H, 0, 0, 1.08 * r, 0.05 * H, 1.08 * r);
  hb.add(arcC, plastic(0x2e3136), 0, -0.06 * H, 0, 0, 1.08 * r, 0.06 * H, 1.08 * r);
  hb.add(browC, plastic(0x8a9098), 0, 0.72 * H, 0, 0, 1.09 * r, 0.05 * H, 1.09 * r);
  const disc = (th, y, rad, out, thick, mat) => hb.addMatrix(cy, mat, new THREE.Matrix4().compose(
    new THREE.Vector3(Math.sin(th) * out, y, Math.cos(th) * out), new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2, th, 0, 'YXZ')), new THREE.Vector3(rad, thick, rad)));
  const onMask = (th, y, out, w, h, dp, col, tilt = 0, roll = 0) => tBonHead(hb, th, y, out, w, h, dp, col, tilt, roll);
  const lite = 0x8a9098, dark = 0x484c53, gold = 0xc08a18;
  // raised central ridge: forehead, the gold bridge between the goggles, down the nose to the mouthpiece
  onMask(0, 0.77 * H, 1.07 * r, 0.11 * r, 0.2 * H, 0.08 * r, lite);
  onMask(0, 0.56 * H, 1.075 * r, 0.24 * r, 0.17 * H, 0.06 * r, gold);
  onMask(0, 0.42 * H, 1.09 * r, 0.16 * r, 0.14 * H, 0.1 * r, lite, -0.35);
  // the breathing mouthpiece: a tapered snout with a slatted grille and side filters
  hb.addMatrix(tBtaper(0.66 * r, 0.44 * r, 0.3 * r, 0.32 * H, 0.22 * H), plastic(dark), m4(0, 0.2 * H, 0.98 * r, PI / 2, 0, 0));
  hb.box(0, 0.11 * H, 1.26 * r, 0.36 * r, 0.18 * H, 0.04 * r, 0x1e2126);
  for (let j = 0; j < 4; j++) hb.box(0, (0.125 + j * 0.042) * H, 1.285 * r, 0.4 * r, 0.018 * H, 0.03 * r, lite);
  hb.boxM(m4(0, 0.36 * H, 1.15 * r, -0.5, 0, 0, 0.52 * r, 0.035 * H, 0.2 * r), lite);
  for (const sd of [-1, 1]) {
    const fp = new THREE.Vector3(sd * 0.3 * r, 0.2 * H, 1.15 * r);
    hb.addMatrix(cy, plastic(gunmetal), m4(fp.x, fp.y, fp.z, 0, sd * -0.5, PI / 2, 0.1 * r, 0.12 * r, 0.1 * r));
    hb.addMatrix(cy, plastic(lite), m4(fp.x + sd * 0.05 * r, fp.y, fp.z - 0.03 * r, 0, sd * -0.5, PI / 2, 0.065 * r, 0.04 * r, 0.065 * r));
    // round goggle eyes: raised gold surround, thin black outline, pure red lens
    disc(sd * EYE, 0.56 * H, 0.29 * r, 1.06 * r, 0.06 * r, plastic(gold));
    disc(sd * EYE, 0.56 * H, 0.215 * r, 1.085 * r, 0.06 * r, plastic(0x101114));
    disc(sd * EYE, 0.56 * H, 0.19 * r, 1.1 * r, 0.06 * r, plastic(0xd00000, { emissive: 0x900000, emissiveIntensity: 0.3 }));
    // angular brow plates sweeping up and back over the goggles
    onMask(sd * 0.4, 0.78 * H, 1.08 * r, 0.5 * r, 0.075 * H, 0.09 * r, lite, 0, sd * 0.32);
    onMask(sd * 0.8, 0.85 * H, 1.07 * r, 0.42 * r, 0.06 * H, 0.07 * r, dark, 0, sd * 0.12);
    // cheek plates angling down from the goggles to the mouthpiece, with a gold accent
    onMask(sd * 0.5, 0.33 * H, 1.08 * r, 0.48 * r, 0.11 * H, 0.07 * r, dark, 0, sd * 0.5);
    onMask(sd * 0.5, 0.36 * H, 1.12 * r, 0.3 * r, 0.035 * H, 0.03 * r, gold, 0, sd * 0.5);
    onMask(sd * 0.5, 0.29 * H, 1.115 * r, 0.42 * r, 0.02 * H, 0.03 * r, lite, 0, sd * 0.5);
    hb.boxM(m4(Math.sin(sd * TH / 2) * 1.065 * r, 0.43 * H, Math.cos(sd * TH / 2) * 1.065 * r, 0, sd * TH / 2, 0, 0.07 * r, 0.96 * H, 0.1 * r), gunmetal);
    for (let j = 0; j < 4; j++) {                                                 // ribbed cheek vents
      const th = sd * (0.98 + j * 0.03), y = (0.22 + j * 0.075) * H;
      hb.boxM(m4(Math.sin(th) * 1.07 * r, y, Math.cos(th) * 1.07 * r, 0, th, 0, 0.3 * r, 0.045 * H, 0.08 * r), j % 2 ? 0x2e3136 : lite);
    }
    // ribbed hoses from the mouthpiece back along the jaw to the orange earpieces
    const P = [[0.36, 0.14, 1.12], [0.72, 0.08, 0.9], [1.03, 0.1, 0.52], [1.13, 0.3, 0.0]];
    const pt = (u) => { const k = Math.min(2, Math.floor(u * 3)), f = u * 3 - k; return P[k].map((v, i) => (v + (P[k + 1][i] - v) * f) * (i === 1 ? H : r) * (i === 0 ? sd : 1)); };
    for (let j = 0; j < 12; j++) rod(hb, pt(j / 12), pt((j + 1) / 12), 0.055 * r, j % 2 ? gunmetal : 0x5a6068, 6);
    hb.addMatrix(cy, plastic(0xe0701e), m4(sd * 1.1 * r, 0.52 * H, -0.04 * r, 0, 0, PI / 2, 0.4 * r, 0.16 * r, 0.4 * r));
    hb.addMatrix(cy, plastic(gunmetal), m4(sd * 1.19 * r, 0.52 * H, -0.04 * r, 0, 0, PI / 2, 0.27 * r, 0.06 * r, 0.27 * r));
    hb.addMatrix(cy, plastic(silver), m4(sd * 1.22 * r, 0.52 * H, -0.04 * r, 0, 0, PI / 2, 0.15 * r, 0.06 * r, 0.15 * r));
  }
}
export function starlord() {
  const jacket = 0x6e1812, jacketDk = 0x440c08, hair = 0x6e4024, skinS = '#f2c9a0';
  // his head under the mask: swept brown hair all round
  const face = printFace('starlord', '#6e4024', (g, X, h) => {
    for (let x = -X; x < X; x += 9) strokePath(g, x % 2 ? '#5a3218' : '#7e4c2a', 2.5, [x, 0, x + 4, 50, x - 2, 100, x + 3, 112, x, h]);
  });
  // the dark gunmetal mask print, drawn in plate coordinates (u round the head, v jaw to brow)
  const TH = 3.3, mx = (th) => 128 + th / TH * 256, my = (f) => (0.9 - f) / 0.93 * 128, EYE = 0.28;
  const maskMat = faceMat('starlordMaskT', (g, w, h) => {
    g.fillStyle = '#464a51'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2d32';
    g.fillRect(0, 0, 7, h); g.fillRect(w - 7, 0, 7, h);
    for (const sd of [-1, 1]) { const x0 = mx(sd * 0.9), x1 = mx(sd * 1.18); g.fillRect(Math.min(x0, x1), my(0.52), Math.abs(x1 - x0), my(0.18) - my(0.52)); }
    g.fillStyle = '#26292e'; g.beginPath(); g.ellipse(128, my(0.2), 30, 26, 0, 0, 7); g.fill();
    g.fillStyle = '#c08a18';                                                       // one gold band round both eyes
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(mx(sd * EYE), my(0.56), 27, 30, 0, 0, 7); g.fill(); }
    g.fillRect(mx(-EYE), my(0.64), mx(EYE) - mx(-EYE), my(0.47) - my(0.64));
    for (const sd of [-1, 1]) {                                                    // fine seams, lighter grey
      strokePath(g, '#8a9098', 2.5, [mx(sd * 0.56), my(0.86), mx(sd * 0.62), my(0.72), mx(sd * 0.7), my(0.56)]);
      strokePath(g, '#8a9098', 2.5, [mx(sd * 0.86), my(0.55), mx(sd * 0.6), my(0.42), mx(sd * 0.3), my(0.34)]);
      strokePath(g, '#8a9098', 2.5, [mx(sd * 0.82), my(0.16), mx(sd * 0.5), my(0.04), mx(sd * 0.3), my(-0.02)]);
    }
  });
  const decal = decalMat('starlord', (g, w, h) => {
    g.fillStyle = '#6e1812'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5c6a7e';                                                     // grey-blue henley
    g.beginPath(); g.moveTo(42, 0); g.lineTo(86, 0); g.lineTo(80, h); g.lineTo(48, h); g.closePath(); g.fill();
    g.fillStyle = skinS; g.beginPath(); g.moveTo(54, 0); g.lineTo(74, 0); g.lineTo(64, 16); g.closePath(); g.fill();
    g.strokeStyle = '#3e4a5a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(64, 16); g.lineTo(64, 42); g.stroke();
    g.fillStyle = '#cfd4da'; for (const y of [24, 34]) { g.beginPath(); g.arc(64, y, 2.2, 0, 7); g.fill(); }
    g.fillStyle = '#440c08';                                                     // wide lapels
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 20, 0); g.lineTo(64 + sd * 44, 0); g.lineTo(64 + sd * 30, 44); g.lineTo(64 + sd * 20, 62); g.closePath(); g.fill(); }
    g.strokeStyle = '#3a0804'; g.lineWidth = 3;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 20, 60); g.lineTo(64 + sd * 17, h); g.stroke(); }
    g.strokeStyle = 'rgba(40,4,2,0.55)'; g.lineWidth = 2;                         // padded panels
    for (const y of [74, 88]) for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 24, y); g.lineTo(64 + sd * 60, y - 4); g.stroke(); }
    g.fillStyle = '#2a1a12'; g.fillRect(44, 106, 40, 11);                        // belt
    g.fillStyle = '#d0d4da'; g.fillRect(58, 104, 12, 15); g.fillStyle = '#2a1a12'; g.fillRect(61, 107, 6, 9);
  });
  // element blaster in the fist, barrel down the arm (driver proportions, scaled)
  const blaster = (b) => {
    b.box(0, -0.08, 0.04, 0.1, 0.14, 0.12, 0x2a2e34);
    b.boxM(m4(0, -0.28, 0.12, 0, 0, 0, 0.13, 0.42, 0.15), 0x8a9098);
    b.sphere(0, -0.12, 0.14, 0.1, 0x5a6068);
    b.boxM(m4(0, -0.3, 0.205, 0, 0, 0, 0.06, 0.32, 0.03), M.orange);
    b.cyl(0, -0.66, 0.12, 0.045, 0.24, 0x2a2e34, { seg: 8 });
    b.cyl(0, -0.7, 0.12, 0.065, 0.06, 0xc8ccd2, { seg: 8 });
  };
  return fig({
    name: 'starlord', skin: M.skin, headTop: hair, face, torso: jacket, legs: 0x3a3632, hips: 0x2a1a12, boots: 0x5a3a24, bootH: 0.55, arms: jacket, hands: M.skin, decal, noStud: true,
    head: (b, H, hs) => tBstarlordHead(tBxf(b, 0, H, 0), 0.4 * hs, 0.72 * hs, maskMat),
    extra: (b) => {
      // high leather collar, the long coat's tails and skirts
      b.boxM(m4(0, 2.74, -0.3, -0.25, 0, 0, 0.76, 0.26, 0.08), jacket);
      for (const sd of [-1, 1]) b.boxM(m4(sd * 0.37, 2.73, -0.07, 0, sd * 0.5, sd * -0.15, 0.08, 0.24, 0.34), jacket);
      b.boxM(m4(0, 0.93, -0.4, 0.06, 0, 0, 1.34, 1.14, 0.08), jacket);
      for (const sd of [-1, 1]) b.boxM(m4(sd * 0.68, 0.93, 0.01, 0, 0, sd * 0.06, 0.08, 1.14, 0.72), jacket);
      // the Walkman clipped on his left hip, cord up to the collar
      const wx = 0.4, wy = 1.5, wz = 0.38;
      b.box(wx, wy, wz, 0.22, 0.3, 0.09, 0x6f8cb4);
      b.box(wx, wy + 0.06, wz + 0.04, 0.16, 0.13, 0.02, 0xd0d4da);
      b.box(wx + 0.06, wy + 0.3, wz, 0.06, 0.04, 0.06, M.orange);
      rod(b, [wx - 0.06, wy + 0.3, wz], [0.17, 2.62, 0.34], 0.015, 0x30343a, 5);
    },
    arm: (a, s) => {
      blob(a, s * 0.03, 0.0, 0, 0.27, 0.2, 0.27, jacketDk);                 // padded shoulder
      a.box(s * 0.04, -0.46, 0, 0.375, 0.05, 0.415, jacketDk);               // sleeve strap
      a.box(s * 0.04, -1.02, 0, 0.38, 0.15, 0.42, jacketDk);                 // cuffs
      blaster(tBxf(a, s * 0.04, -1.2, 0.04, 1.4));
    },
  });
}
// Gamora's long ombré hair down her back: one sculpted, vertex-coloured piece (root → tip)
let gamoraHairGeo = null;
function gamoraHair(stops) {
  if (gamoraHairGeo) return gamoraHairGeo;
  const r = 0.4, H = 0.72;
  const g = new THREE.CylinderGeometry(1, 1, 1, 22, 14), p = g.attributes.position, n = p.count;
  const st = stops.map(([u, c]) => [u, new THREE.Color(c)]);
  const col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), u = 0.5 - p.getY(i);
    const jag = u > 0.999 ? 0.13 * (0.5 + 0.5 * Math.cos(x * PI * 2.6)) : 0;
    const bulge = 1 + 0.1 * Math.sin(u * PI);
    p.setXYZ(i, x * r * (1.07 - 0.12 * u) * bulge, H * (1.02 - u * 1.9 - jag), z * r * 0.4 * bulge - r * (0.74 + 0.36 * u));
    let k = 1; while (k < st.length - 1 && st[k][0] < u + jag * 0.8) k++;
    const [u0, c0] = st[k - 1], [u1, c1] = st[k];
    c.copy(c0).lerp(c1, Math.min(1, Math.max(0, (u + jag * 0.8 - u0) / (u1 - u0))));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  gamoraHairGeo = g;
  return g;
}
export function gamora() {
  const skin = 0x45a84c, skinS = '#45a84c';
  const leather = 0x2a2026, wine = 0x5a0e24, silver = 0xd0d6de;
  // ombré hair: near-black roots → burgundy → crimson → magenta tips
  const hA = 0x2c0e1c, hB = 0x4e0f26, hC = 0x8c1638, hD = 0xc42656, hE = 0xe8468a;
  const face = printFace('gamora', skinS, (g, X, h) => {
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
  const decal = decalMat('gamora', (g, w, h) => {
    g.fillStyle = '#2a2026'; g.fillRect(0, 0, w, h);
    g.fillStyle = skinS; g.beginPath(); g.moveTo(48, 0); g.lineTo(80, 0); g.lineTo(64, 30); g.closePath(); g.fill();
    g.fillStyle = '#6a1430';                                                   // wine lapels
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(64 + sd * 16, 0); g.lineTo(64 + sd * 34, 0); g.lineTo(64 + sd * 10, 52); g.lineTo(64, 34); g.closePath(); g.fill(); }
    g.fillStyle = '#4e0c20'; g.beginPath(); g.moveTo(28, 64); g.lineTo(100, 64); g.lineTo(106, h); g.lineTo(22, h); g.closePath(); g.fill();   // corset
    g.fillStyle = '#2a2026'; g.beginPath(); g.moveTo(56, 64); g.lineTo(72, 64); g.lineTo(70, h); g.lineTo(58, h); g.closePath(); g.fill();
    g.strokeStyle = '#d0d6de'; g.lineWidth = 2;
    for (let y = 72; y < h; y += 11) { g.beginPath(); g.moveTo(56, y); g.lineTo(72, y + 6); g.moveTo(72, y); g.lineTo(56, y + 6); g.stroke(); }
    g.fillStyle = '#d0d6de';
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(64 + sd * (26 - k * 5), 8 + k * 13, 2.5, 0, 7); g.fill(); }
  });
  return fig({
    name: 'gamora', skin, headTop: hA, face, torso: leather, legs: 0x221a20, hips: leather, boots: 0x16121a, bootH: 0.5, belt: wine, arms: leather, hands: skin, decal, bulk: 0.92, noStud: true,
    head: (b, H) => {
      const r = 0.4, h = 0.72;
      blob(b, 0, H + 0.9 * h, -0.06 * r, 1.1 * r, 0.3 * h, 1.1 * r, hA);                         // crown
      blob(b, -0.38 * r, H + 0.86 * h, 0.74 * r, 0.62 * r, 0.12 * h, 0.32 * r, hA, 0, 0, 0.38);  // side-swept fringe
      for (const sd of [-1, 1]) {                                                               // curtains framing the face
        blob(b, sd * 0.93 * r, H + 0.52 * h, -0.14 * r, 0.27 * r, 0.6 * h, 0.78 * r, hA);
        blob(b, sd * 0.95 * r, H + 0.06 * h, -0.24 * r, 0.25 * r, 0.3 * h, 0.62 * r, hB);
      }
      b.bucket(vertexColorPlastic(), 0, 0).push(gamoraHair([[0, hA], [0.3, hA], [0.5, hB], [0.7, hC], [0.86, hD], [1, hE]]).clone().translate(0, H, 0));
    },
    extra: (b) => {
      b.box(0, 1.42, 0.335, 0.17, 0.12, 0.04, silver);                                        // belt buckle
      b.boxM(m4(0, 2.72, -0.3, -0.25, 0, 0, 0.74, 0.24, 0.09), leather);                      // high collar
      for (const sd of [-1, 1]) b.boxM(m4(sd * 0.36, 2.72, -0.08, 0, sd * 0.5, sd * -0.15, 0.08, 0.24, 0.34), leather);
    },
    arm: (a, s) => {
      blob(a, s * 0.06, 0.0, 0, 0.25, 0.13, 0.26, wine, 0, 0, s * -0.35);                    // pauldron
      a.box(s * 0.04, -1.0, 0, 0.37, 0.32, 0.41, 0x420a1a);                                   // bracers
      a.box(s * 0.04, -0.75, 0, 0.38, 0.04, 0.42, silver);
      // Godslayer in the right hand: dark grip, gold guard with a red gem, long curved blade
      if (s < 0) {
        const b = scaled(a, -0.04, -1.2, 0.04, 1.4);
        b.sphere(0, 0, -0.33, 0.055, M.gold);
        b.boxM(m4(0, 0, -0.16, 0, 0, 0, 0.075, 0.085, 0.3), 0x1c1a20);
        for (const z of [-0.25, -0.07]) b.boxM(m4(0, 0, z, 0, 0, 0, 0.085, 0.095, 0.03), M.gold);
        b.boxM(m4(0, 0.02, 0.02, 0, 0, 0, 0.1, 0.42, 0.07), M.gold);
        for (const sd of [-1, 1]) b.boxM(m4(0, sd * 0.22, 0.07, sd * -0.6, 0, 0, 0.08, 0.06, 0.14), M.gold);
        b.sphere(0, 0.02, 0.02, 0.06, 0xc0103a);
        curvedBlade(b, 0.02, 0.05, PI / 2, 0.05, 5, 0.24, 0.2, 0.15, 0.045, M.silver, 0x5a606a, 0.26);
      }
    },
  });
}
export function drax() {
  const skin = 0x4f6a62, skinS = '#4f6a62', ink = 0xb8141c, inkS = '#c4161e', shade = 'rgba(18,34,30,0.42)';
  const pants = 0x3e2420, leather = 0x5a3424, W = 1.4, D = 1.2;
  const face = printFace('drax', skinS, (g, X) => {
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
  // chest and back: muscle shading under bold red tribal lines
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
      ln(6.5, [x(6), 6, x(26), 0, x(42), 14, x(54), 30, x(46), 48]);
      ln(4, [x(46), 48, x(34), 52, x(32), 40]);
      ln(5, [x(10), 40, x(24), 46, x(28), 30]);
      ln(6.5, [x(56), 4, x(62), 40, x(56), 76, x(50), 100, x(56), 128]);
      ln(5.5, [x(8), 62, x(28), 72, x(36), 96, x(40), 112, x(30), 126]);
      ln(3.5, [x(56), 76, x(44), 80, x(40), 92]);
    }
  };
  const decal = decalMat('drax', chest(false)), back = decalMat('draxBack', chest(true));
  // tattoo print wrapped round the upper arms
  const armInk = decalMat('draxArm', (g, w, h) => {
    g.fillStyle = skinS; g.fillRect(0, 0, w, h);
    strokePath(g, inkS, 9, [40, 0, 30, 40, 58, 62, 92, 84, 84, 128]);
    strokePath(g, inkS, 7, [44, 52, 70, 30, 96, 36, 108, 52, 92, 60]);
    strokePath(g, inkS, 7, [72, 76, 48, 92, 30, 90, 22, 76, 34, 72]);
    strokePath(g, inkS, 6, [96, 0, 104, 14, 118, 20]);
  }, null, 1);
  const ridge = (b, x, y, z, rz, len) => b.boxM(m4(x, y, z, 0, 0, rz, 0.045, len, 0.07), ink);
  // curved fighting knife through the fist, blade out along +Z (driver proportions, scaled)
  const knife = (b) => {
    b.sphere(0, 0, -0.3, 0.055, M.silver);
    b.boxM(m4(0, 0, -0.1, 0, 0, 0, 0.11, 0.09, 0.36), 0x2a1a14);
    for (const z of [-0.22, 0.02]) b.boxM(m4(0, 0, z, 0, 0, 0, 0.12, 0.1, 0.025), leather);
    b.boxM(m4(0, 0, 0.1, 0, 0, 0, 0.1, 0.3, 0.05), 0x8a6a3a);
    curvedBlade(b, 0, 0.12, PI / 2 + 0.12, -0.18, 4, 0.18, 0.17, 0.12, 0.05, M.silver, 0x6a7078, 0.18);
  };
  return fig({
    name: 'drax', skin, face, torso: skin, legs: pants, hips: pants, boots: 0x2a1a14, bootH: 0.4, belt: leather, arms: skin, hands: skin, handR: 0.18, decal, bulk: W, depth: D, headS: 0.9, noStud: true,
    head: (b, H, hs) => {
      const r = 0.4 * hs, h = 0.72 * hs;
      // raised tattoo ridges over the bald scalp, and ears
      b.box(0, H + h, -0.05 * r, 0.1 * r, 0.05, 1.75 * r, ink);
      for (const sd of [-1, 1]) b.boxM(m4(sd * 0.45 * r, H + h + 0.02, -0.05 * r, 0, sd * 0.3, 0, 0.1 * r, 0.04, 1.2 * r), ink);
      for (const sd of [-1, 1]) b.box(sd * 0.98 * r, H + 0.36 * h, -0.02 * r, 0.14 * r, 0.24 * h, 0.26 * r, skin);
    },
    extra: (b) => {
      b.add(PLANE, back, 0, 1.43 + 0.625, -(0.33 * D + 0.012), PI, 1.3 * W, 1.25, 1);         // back tattoos
      b.cyl(0, 2.6, -0.01, 0.3, 0.26, skin, { seg: 12 });                                     // bull neck
      for (const sd of [-1, 1]) {
        b.boxM(m4(sd * 0.36, 2.66, -0.04, 0, 0, sd * -0.36, 0.6, 0.2, 0.56), skin);            // traps
        ridge(b, sd * 0.36, 2.79, -0.04, PI / 2 + sd * -0.36, 0.4);
        ridge(b, sd * 0.36, 2.67, 0.25, PI / 2 + sd * -0.36, 0.38);
      }
      b.box(0, 1.37, 0.43, 0.32, 0.24, 0.05, 0x8a6a3a);                                       // buckle plate
      b.box(0, 1.43, 0.46, 0.18, 0.1, 0.03, M.silver);
    },
    arm: (a, s) => {
      const x = s * 0.04;
      a.sphere(x, -0.06, 0, 0.3, skin, { sy: 0.95 });                                        // deltoid
      a.box(x, -0.66, 0, 0.47, 0.56, 0.5, 0, { mat: armInk });                               // tattooed biceps
      a.box(x, -0.96, 0, 0.47, 0.24, 0.5, leather);                                          // bracer
      a.box(x, -0.82, 0, 0.48, 0.04, 0.51, M.silver);
      knife(scaled(a, x, -1.2, 0.04, 1.3));
    },
  });
}
export function thanos() {
  const skin = M.thanos, gold = 0xd8a830, goldDk = 0xa8781c, suit = 0x26408a, suitDk = 0x1a2c60, groove = '#3e2050';
  // knuckles (Space, Reality, Power, Soul), then the back of the hand (Mind) and the thumb (Time)
  const stones = [0x2a6aff, 0xff2020, 0xa040ff, 0x20ff60, 0xffd020, 0xff8a10];
  // heavy brow over small hard blue eyes, deep cheek lines, grim mouth, furrowed chin
  const face = printFace('thanos', '#7d4f94', (g) => {
    g.strokeStyle = 'rgba(62,32,80,0.45)'; g.lineWidth = 2.5;
    for (const y of [18, 28]) { g.beginPath(); g.moveTo(-30, y); g.quadraticCurveTo(0, y - 5, 30, y); g.stroke(); }
    for (const sd of [-1, 1]) {
      g.fillStyle = 'rgba(40,16,56,0.55)'; g.beginPath(); g.ellipse(sd * 24, 62, 15, 8, 0, 0, 7); g.fill();
      g.fillStyle = '#5a8ae0'; g.beginPath(); g.ellipse(sd * 24, 63, 4.5, 4.5, 0, 0, 7); g.fill();
      g.fillStyle = '#0c0a14'; g.beginPath(); g.arc(sd * 24, 63, 2.4, 0, 7); g.fill();
      strokePath(g, groove, 10, [sd * 46, 52, sd * 28, 50, sd * 6, 58]);
      strokePath(g, groove, 3.5, [sd * 22, 74, sd * 34, 92, sd * 30, 108]);
    }
    g.fillStyle = '#6a4080'; g.beginPath(); g.moveTo(-6, 66); g.lineTo(6, 66); g.lineTo(12, 84); g.lineTo(-12, 84); g.closePath(); g.fill();
    strokePath(g, groove, 3, [-12, 84, 0, 88, 12, 84]);
    strokePath(g, '#2a1238', 5, [-22, 100, 0, 97, 22, 100]);
    strokePath(g, '#2a1238', 4, [-22, 100, -26, 103, -27, 106]); strokePath(g, '#2a1238', 4, [22, 100, 26, 103, 27, 106]);
    for (let x = -15; x <= 15; x += 10) strokePath(g, groove, 4, [x, 109, x * 1.04, 117, x * 1.06, 125]);
  });
  const decal = decalMat('thanos', (g, w, h) => {
    g.fillStyle = '#26408a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8a830';                                                       // gold breastplate
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w - 8, 46); g.quadraticCurveTo(64, 92, 8, 46); g.closePath(); g.fill();
    g.strokeStyle = '#a8781c'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(64, 4); g.lineTo(64, 66); g.stroke();
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(64 + sd * 8, 20); g.quadraticCurveTo(64 + sd * 30, 30, 64 + sd * 52, 18); g.stroke();
      g.beginPath(); g.moveTo(64 + sd * 8, 44); g.quadraticCurveTo(64 + sd * 28, 52, 64 + sd * 46, 40); g.stroke();
    }
    g.strokeStyle = '#1a2c60'; g.lineWidth = 3;                                    // quilted undersuit
    for (const y of [86, 100, 114]) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 10, y); g.stroke(); }
    g.beginPath(); g.moveTo(64, 72); g.lineTo(64, h); g.stroke();
  });
  const W = 1.6, D = 1.3, zf = 0.33 * D;
  const f = fig({
    name: 'thanos', skin, face, torso: suit, legs: suitDk, hips: suitDk, boots: gold, bootH: 0.5, belt: gold, arms: suit, hands: skin, decal, bulk: W, depth: D, handR: 0.24, headS: 1.36, noStud: true,
    head: (b, H, hs) => {
      const hb = tBxf(b, 0, H, 0), r = 0.4 * hs, h = 0.72 * hs;
      blob(hb, 0, h, -0.02 * r, 1.0 * r, 0.26 * h, 1.0 * r, skin);                                   // bald dome
      for (const sd of [-1, 1]) {
        blob(hb, sd * 0.36 * r, 0.64 * h, 0.84 * r, 0.42 * r, 0.075 * h, 0.15 * r, 0x6e4486, 0, sd * 0.4, sd * 0.15);   // heavy brow
        blob(hb, sd * 0.99 * r, 0.52 * h, -0.05 * r, 0.07 * r, 0.12 * h, 0.11 * r, skin);                           // ears
      }
      blob(hb, 0, 0.1 * h, 0.82 * r, 0.42 * r, 0.12 * h, 0.22 * r, skin);                                // jutting jaw
      for (let j = -1; j <= 1; j++) b.boxM(m4(j * 0.1 * r, H + 0.1 * h, 1.0 * r, -0.2, 0, 0, 0.035 * r, 0.16 * h, 0.04 * r), 0x5a3470);   // chin ridges
    },
    extra: (b) => {
      b.cyl(0, 2.56, -0.01, 0.36, 0.26, skin, { seg: 12 });                         // thick neck
      b.cyl(0, 2.62, -0.01, 0.5, 0.11, gold, { seg: 16 });                           // gold collar
      b.boxM(m4(0, 2.3, zf + 0.02, -0.05, 0, 0, 0.18, 0.5, 0.06), goldDk);           // breastplate ridge
      b.box(0, 1.33, zf + 0.01, 0.4, 0.3, 0.06, goldDk);                             // buckle
    },
    arm: (a, s) => {
      // huge layered gold pauldrons
      blob(a, s * 0.1, 0.1, 0, 0.5, 0.28, 0.5, gold, 0, 0, s * -0.3);
      blob(a, s * 0.13, -0.1, 0, 0.46, 0.18, 0.46, goldDk, 0, 0, s * -0.3);
      a.box(s * 0.04, -1.02, 0, 0.5, 0.38, 0.52, gold);                             // bracers
      a.box(s * 0.04, -0.7, 0, 0.51, 0.06, 0.53, goldDk);
      if (s > 0) {                                                                // the Infinity Gauntlet
        a.cyl(0.04, -1.72, 0.04, 0.35, 0.74, gold, { seg: 12 });
        // the back of the fist is on -Z so the stones face the track when the arm is raised to snap
        a.box(0.04, -1.9, -0.02, 0.64, 0.22, 0.42, gold);                           // knuckle plate
        for (let j = 0; j < 4; j++) a.box(-0.17 + j * 0.14, -2.24, 0.0, 0.12, 0.38, 0.16, goldDk);
        a.box(-0.32, -1.88, 0.0, 0.13, 0.32, 0.16, goldDk);                         // thumb
        for (let j = 0; j < 4; j++) a.sphere(-0.17 + j * 0.14, -1.79, -0.23, 0.07, 0, { mat: glow(stones[j], 2.5) });
        a.sphere(0.04, -1.45, -0.3, 0.11, 0, { mat: glow(stones[4], 2.5) });
        a.sphere(-0.33, -1.68, -0.15, 0.08, 0, { mat: glow(stones[5], 2.5) });
      }
    },
  });
  f.stones = stones.map((c) => glow(c, 2.5));
  return f;
}
export function loki() {
  const gold = 0xd8a830, goldDk = 0xa87a1c, green = 0x1f6a3a, dkGreen = 0x123e24, leather = 0x1c1e1a, hairC = 0x16141a;
  // pale and sharp: arched brows (one cocked), green eyes, high cheekbones and a sly smirk
  const face = printFace('loki', '#f0dcc8', (g, X, h) => {
    g.fillStyle = '#16141a';                                                     // black hair behind the cheek guards
    g.beginPath(); g.moveTo(-X, 0); g.lineTo(X, 0); g.lineTo(X, h); g.lineTo(70, h); g.lineTo(66, 40); g.lineTo(-66, 40); g.lineTo(-70, h); g.lineTo(-X, h); g.closePath(); g.fill();
    strokePath(g, '#16141a', 5, [-40, 50, -26, 42, -10, 50]);
    strokePath(g, '#16141a', 5, [40, 46, 26, 38, 10, 49]);
    for (const sd of [-1, 1]) {
      g.fillStyle = 'rgba(90,70,80,0.25)'; g.beginPath(); g.ellipse(sd * 23, 66, 12, 7, 0, 0, 7); g.fill();
      g.fillStyle = '#3a8a5a'; g.beginPath(); g.ellipse(sd * 23, 61, 7, 8, 0, 0, 7); g.fill();
      eye(g, sd * 23, 61, 4.5, 5.5, '#101814');
      strokePath(g, '#1a1418', 2.5, [sd * 32, 55, sd * 23, 52, sd * 14, 55]);
      strokePath(g, 'rgba(150,110,100,0.6)', 2.5, [sd * 40, 76, sd * 32, 88, sd * 26, 96]);
    }
    strokePath(g, '#c8a890', 2.5, [-1, 64, 3, 80, -4, 84]);
    strokePath(g, '#6a2a30', 4, [-14, 100, 2, 104, 18, 93]);
    strokePath(g, '#c8a890', 2, [-6, 116, 0, 119, 6, 116]);
  });
  const decal = decalMat('loki', (g, w, h) => {
    g.fillStyle = '#1c1e1a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f6a3a';                                                     // green tunic in a deep V
    g.beginPath(); g.moveTo(34, 0); g.lineTo(94, 0); g.lineTo(64, 76); g.closePath(); g.fill();
    g.fillRect(52, 76, 24, h);
    g.strokeStyle = '#d8a830'; g.lineWidth = 4;                                  // gold trim
    g.beginPath(); g.moveTo(30, 0); g.lineTo(64, 84); g.lineTo(98, 0); g.stroke();
    g.lineWidth = 3;
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(64 + sd * 14, 84); g.lineTo(64 + sd * 14, h); g.stroke();
      g.beginPath(); g.moveTo(64 + sd * 34, 40); g.lineTo(64 + sd * 56, 70); g.stroke();
      g.beginPath(); g.moveTo(64 + sd * 30, 52); g.lineTo(64 + sd * 54, 86); g.stroke();
    }
    g.fillStyle = '#d8a830'; for (const y of [92, 108]) { g.beginPath(); g.arc(64, y, 3.5, 0, 7); g.fill(); }
  });
  const band = tBc('lokiBand', () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, false, -1.9, 3.8).translate(0, 0.5, 0));
  const f = fig({
    name: 'loki', skin: 0xf0dcc8, headTop: gold, face, torso: leather, legs: leather, hips: leather, boots: 0x121410, bootH: 0.6, belt: 0x2a2418, arms: leather, hands: M.black, decal, noStud: true,
    head: (b, H, hs) => {
      const hb = tBxf(b, 0, H, 0), r = 0.4 * hs, h = 0.72 * hs;
      // slicked-back black hair to the shoulders
      blob(hb, 0, 0.42 * h, -0.5 * r, 0.96 * r, 0.56 * h, 0.52 * r, hairC);
      blob(hb, 0, 0.02 * h, -0.62 * r, 0.84 * r, 0.28 * h, 0.26 * r, hairC, 0.25);
      // the golden horned helmet: cap, brow band dipping to a point, cheek guards, long ribbed horns
      blob(hb, 0, 0.98 * h, -0.04 * r, 1.06 * r, 0.24 * h, 1.06 * r, gold);
      hb.addMatrix(band, plastic(gold), m4(0, 0.8 * h, 0, 0, 0, 0, 1.06 * r, 0.2 * h, 1.06 * r));
      tBonHead(hb, 0, 0.78 * h, 1.05 * r, 0.2 * r, 0.2 * r, 0.08 * r, gold, 0, PI / 4);
      for (const sd of [-1, 1]) {
        tBonHead(hb, sd * 1.12, 0.5 * h, 1.05 * r, 0.32 * r, 0.62 * h, 0.08 * r, gold);
        tBonHead(hb, sd * 1.06, 0.2 * h, 1.06 * r, 0.22 * r, 0.22 * r, 0.08 * r, gold, 0, PI / 4);
        tBonHead(hb, sd * 1.12, 0.5 * h, 1.1 * r, 0.12 * r, 0.5 * h, 0.04 * r, goldDk);
        const tip = tBtube(hb, [sd * 0.5 * r, 0.9 * h, 0.82 * r], [sd * 0.12, 1, 0.35], 11, 0.17 * r, 0.15 * r, 0.035 * r, [sd * 0.01, -0.03, -0.17], gold, goldDk);
        hb.sphere(tip.x, tip.y, tip.z, 0.035 * r, gold);
      }
    },
    extra: (b) => {
      // flowing green cape from the shoulders, lined dark
      b.boxM(m4(0, 1.38, -0.5, 0.08, 0, 0, 1.58, 2.66, 0.07), green);
      b.boxM(m4(0, 1.38, -0.45, 0.08, 0, 0, 1.5, 2.6, 0.04), dkGreen);
      for (const sd of [-1, 1]) blob(b, sd * 0.48, 2.63, -0.14, 0.34, 0.12, 0.36, green);
      // high collar
      b.boxM(m4(0, 2.76, -0.3, -0.25, 0, 0, 0.74, 0.3, 0.08), green);
      for (const sd of [-1, 1]) b.boxM(m4(sd * 0.36, 2.74, -0.08, 0, sd * 0.5, sd * -0.15, 0.08, 0.28, 0.34), green);
      // long leather coat skirts with gold-edged hems
      for (const sd of [-1, 1]) {
        b.boxM(m4(sd * 0.67, 0.92, 0.0, 0, 0, sd * 0.06, 0.08, 1.12, 0.72), leather);
        b.boxM(m4(sd * 0.69, 0.92, 0.36, 0, 0, sd * 0.06, 0.09, 1.12, 0.04), gold);
      }
      b.box(0, 1.37, 0.34, 0.2, 0.22, 0.04, gold);                                  // buckle
    },
    arm: (a, s) => {
      a.boxM(m4(s * 0.06, 0.12, 0, 0, 0, s * -0.35, 0.42, 0.08, 0.48), gold);      // gold shoulder plates
      a.boxM(m4(s * 0.1, 0.0, 0, 0, 0, s * -0.35, 0.4, 0.06, 0.46), goldDk);
      a.box(s * 0.04, -0.52, 0, 0.375, 0.16, 0.415, green);                       // green sleeve band
      a.box(s * 0.04, -1.02, 0, 0.38, 0.26, 0.42, leather);                       // bracers, gold-edged
      a.box(s * 0.04, -0.78, 0, 0.385, 0.04, 0.425, gold);
    },
  });
  // the scepter: gold shaft, curved prongs cradling the glowing blue Mind Stone (out past the fist)
  f.scepter = part(f.armR, -0.04, -1.2, 0.04, (pb) => {
    const b = tBxf(pb, 0, 0, 0, 1.5);
    rod(b, [0, 0.35, 0], [0, -0.95, 0], 0.035, gold, 8);
    for (const y of [0.3, -0.2, -0.85]) b.cyl(0, y, 0, 0.05, 0.05, goldDk, { seg: 10 });
    b.cyl(0, -1.0, 0, 0.07, 0.08, 0x3a3e46, { seg: 10 });
    for (const sd of [-1, 1]) tBtube(b, [0, -1.0, 0], [0, -1, sd * 0.9], 5, 0.07, 0.035, 0.015, [0, -0.3, -sd * 0.28], M.silver);
    b.sphere(0, -1.13, 0, 0.065, 0, { mat: glow(0x3ab0ff, 3) });
  });
  return f;
}
export function ultron() {
  const lit = (g) => { g.fillStyle = '#ff2a10'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 6, 56); g.lineTo(128 + s * 28, 48); g.lineTo(128 + s * 24, 60); g.closePath(); g.fill(); } g.fillRect(110, 86, 36, 8); };
  const face = faceMat('ultron', (g, w, h) => { fill(g, w, h, '#a8aeb6'); g.strokeStyle = '#6a7078'; g.lineWidth = 3; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + 10, h); g.stroke(); } lit(g); }, lit);
  const core = (g, w) => { g.fillStyle = '#ff3a1a'; g.beginPath(); g.arc(w / 2, 40, 12, 0, 7); g.fill(); };
  const decal = decalMat('ultron', (g, w, h) => { fill(g, w, h, '#a8aeb6'); g.strokeStyle = '#6a7078'; g.lineWidth = 4; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(10 + k * 26, 60); g.lineTo(w / 2, h); g.stroke(); } g.fillStyle = '#5a6068'; g.beginPath(); g.arc(w / 2, 40, 20, 0, 7); g.fill(); core(g, w); }, core);
  return fig({
    name: 'ultron', skin: 0xa8aeb6, face, torso: 0xa8aeb6, legs: 0x8a9098, boots: 0x6a7078, arms: 0xa8aeb6, hands: 0x6a7078, decal, noStud: true,
    head: (b, H) => { for (let k = -2; k <= 2; k++) b.boxM(mat4(k * 0.14, H + 0.78, -0.1, -0.5, 0, k * 0.2, 0.08, 0.36, 0.08), 0x8a9098); },
  });
}

// ---- non-minifig characters ------------------------------------------------------------------
// a face print for a head of radius R and height Hh (like printFace, any proportions)
function tBprint(key, skin, R, Hh, draw) {
  const k = Hh / (PI * R);
  return faceMat(key, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, 0); g.scale(k, 1);
    g.lineCap = 'round'; g.lineJoin = 'round';
    draw(g, w / 2 / k, h);
    g.restore();
  });
}
// a strand twisting round a limb from a to c: n segments, radius rr, `turns` half-turns, phase a0
function tBtwist(b, a, c, n, rr, turns, a0, r, col) {
  let prev = null;
  for (let j = 0; j <= n; j++) {
    const u = j / n, t = a0 + u * turns * PI;
    const p = [a[0] + (c[0] - a[0]) * u + Math.cos(t) * rr, a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u + Math.sin(t) * rr];
    if (prev) rod(b, prev, p, r, col, 5);
    prev = p;
  }
}
export function groot() {
  const bark = M.groot, dk = 0x4a2e1a, moss = 0x6f9a34, leaf = 0x6ab04a, leaf2 = 0x3a8a3a, lime = 0xa6d84a;
  const barkS = '#7a5230', grooveS = '#4a2c16', lightS = '#9a6c42', mossS = '#6f9a34';
  const grain = (g, x, y0, y1, wd, col = grooveS) => {
    const m = (y0 + y1) / 2, w = 3 * Math.sin(x * 1.7);
    strokePath(g, col, wd, [x, y0, x + w, (y0 + m) / 2, x - w * 0.5, m, x - w, (m + y1) / 2, x + w * 0.4, y1]);
  };
  // the driver's bark face: deep sockets, gentle brown eyes under heavy lids, knotty nose, kind smile
  const HR = 0.7, HH = 1.8;
  const face = tBprint('groot', barkS, HR, HH, (g, X, h) => {
    for (let x = -X + 4; x < X; x += 12) {
      const ax = Math.abs(x);
      if (ax > 54) { grain(g, x, 0, h, 4.5); grain(g, x + 5, 10, h - 14, 2, lightS); }
      else if (ax > 34) { grain(g, x, 0, 36, 3.5); grain(g, x, 80, h, 3.5); }
      else { grain(g, x, 0, 30, 3); if (ax > 4) grain(g, x, 114, h, 3); }
    }
    g.fillStyle = mossS;
    for (const [x, y, rr] of [[62, 18, 9], [72, 12, 7], [70, 28, 6], [-88, 40, 7]]) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    for (const sd of [-1, 1]) {
      g.fillStyle = 'rgba(34,18,8,0.65)'; g.beginPath(); g.ellipse(sd * 24, 63, 16, 13, 0, 0, 7); g.fill();
      g.fillStyle = '#6a3c16'; g.beginPath(); g.ellipse(sd * 24, 64, 9.5, 10.5, 0, 0, 7); g.fill();
      eye(g, sd * 24, 64, 6.2, 7.2, '#120a04');
      g.fillStyle = '#5a3a1e'; g.beginPath(); g.ellipse(sd * 24, 52, 14, 8, 0, 0, 7); g.fill();
      strokePath(g, '#2a1608', 3, [sd * 36, 58, sd * 24, 53, sd * 12, 58]);
      strokePath(g, '#2a1608', 2, [sd * 34, 74, sd * 24, 78, sd * 15, 75]);
    }
    strokePath(g, '#3a2210', 3, [-5, 70, -9, 84, -2, 90]);
    strokePath(g, '#3a2210', 3, [5, 70, 9, 84, 2, 90]);
    g.fillStyle = '#2a1608';
    g.beginPath(); g.moveTo(-22, 100); g.quadraticCurveTo(0, 114, 22, 100); g.quadraticCurveTo(0, 108, -22, 100); g.fill();
    for (const sd of [-1, 1]) strokePath(g, '#3a2210', 2.5, [sd * 22, 100, sd * 27, 97, sd * 28, 92]);
  });
  // grooved bark wrapped round the trunk, with knots and moss
  const trunkMat = texMat('grootTrunkT', 256, 256, (g, w, h) => {
    g.fillStyle = barkS; g.fillRect(0, 0, w, h); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let x = 4; x < w; x += 11) { grain(g, x, -4, h + 4, 4); grain(g, x + 5, 8, h - 10, 1.8, lightS); }
    g.strokeStyle = grooveS; g.lineWidth = 3;
    for (const [x, y] of [[40, 70], [150, 160], [210, 60], [100, 220]]) { g.beginPath(); g.ellipse(x, y, 7, 11, 0, 0, 7); g.stroke(); }
    g.fillStyle = mossS;
    for (const [x, y, rr] of [[30, 22, 9], [40, 30, 7], [200, 200, 10], [190, 212, 7], [120, 40, 6]]) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  });
  const leafy = (b, x, y, z, sc, j) => {
    for (let q = 0; q < 3; q++) {
      const a = j * 2.1 + q * 2.2;
      blob(b, x + Math.cos(a) * 0.05 * sc, y + 0.02 * sc + q * 0.02 * sc, z + Math.sin(a) * 0.05 * sc, 0.075 * sc, 0.025 * sc, 0.05 * sc, [leaf, leaf2, lime][(((j + q) % 3) + 3) % 3], 0.5 * Math.sin(a), a, 0.4);
    }
  };
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  // legs: a knotted core wrapped in twisting strands, splayed root toes
  for (const sd of [-1, 1]) {
    const foot = [sd * 0.6, 0.3, 0.05], knee = [sd * 0.6, 2.8, 0.1], hip = [sd * 0.5, 5.6, 0];
    rod(b, foot, knee, 0.27, bark, 7); rod(b, knee, hip, 0.3, bark, 7);
    blob(b, ...knee, 0.36, 0.32, 0.36, dk);
    blob(b, sd * 0.6, 0.22, 0.12, 0.38, 0.24, 0.48, bark);
    for (let q = 0; q < 2; q++) { tBtwist(b, foot, knee, 6, 0.27, 2, q * PI + sd, 0.08, dk); tBtwist(b, knee, hip, 7, 0.3, 2.4, q * PI - sd, 0.08, dk); }
    for (const [dx, dz] of [[-0.28, 0.5], [0, 0.6], [0.28, 0.5], [sd * 0.35, -0.3]]) rod(b, [sd * 0.6, 0.28, 0.1], [sd * 0.6 + dx, 0.02, 0.1 + dz], 0.1, dk, 5);
  }
  blob(b, 0, 5.6, 0, 0.95, 0.45, 0.62, dk);                                          // hips
  // the trunk: tapered, flattened, bark-printed; raised root strands twisting up it
  b.add(tBc('grootTrunk', () => new THREE.CylinderGeometry(0.82, 0.62, 4.45, 18).translate(0, 2.225, 0)), trunkMat, 0, 5.5, 0, PI, 1, 1, 0.74);
  const surf = (th, y) => { const rr = 0.62 + 0.2 * (y - 5.5) / 4.45 + 0.03; return [Math.sin(th) * rr, y, Math.cos(th) * rr * 0.74]; };
  for (const [t0, dt] of [[-1.1, 0.7], [-0.25, 0.55], [0.55, -0.6], [1.5, 0.5], [2.6, -0.5], [3.7, 0.6]]) {
    for (let j = 0; j < 5; j++) rod(b, surf(t0 + dt * j / 5, 5.6 + j * 0.86), surf(t0 + dt * (j + 1) / 5, 5.6 + (j + 1) * 0.86), 0.07, dk, 5);
  }
  for (const sd of [-1, 1]) blob(b, sd * 0.8, 9.75, 0, 0.42, 0.34, 0.44, dk);             // gnarled shoulders
  blob(b, 0.82, 10.04, 0.06, 0.36, 0.12, 0.38, moss);
  leafy(b, 0.95, 10.1, 0.2, 2.6, 2);
  blob(b, -0.28, 8.9, 0.6, 0.24, 0.18, 0.07, moss);
  blob(b, 0.3, 6.6, 0.48, 0.2, 0.16, 0.06, moss);
  for (let j = 0; j < 4; j++) rod(b, [-0.18 + j * 0.12, 9.85, 0.08 * (j % 2)], [-0.14 + j * 0.09, 10.35, 0.08 * (j % 2)], 0.1, j % 2 ? dk : bark, 5);   // twisted neck
  // the head: the bark face on a tapered cylinder, then the driver's sculpted pieces in its frame
  b.add(tBc('grootHead', () => new THREE.CylinderGeometry(0.75, 0.62, 1.8, 18, 1, true).translate(0, 0.9, 0)), face, 0, 10.2, 0, PI);
  b.cyl(0, 10.2, 0, 0.6, 1.79, bark, { seg: 12 });
  const hb = tBxf(b, 0, 10.2, 0), r = HR, H = HH;
  blob(hb, 0, H, -0.03 * r, 1.06 * r, 0.16 * H, 1.06 * r, bark);                        // domed crown
  for (const sd of [-1, 1]) {
    blob(hb, sd * 0.4 * r, 0.69 * H, 0.86 * r, 0.44 * r, 0.065 * H, 0.22 * r, dk, 0, sd * 0.35, -sd * 0.16);   // brow ridge
    rod(hb, [sd * 0.95 * r, 0.82 * H, -0.2 * r], [sd * 1.45 * r, 1.02 * H, -0.32 * r], 0.08 * r, dk, 6);       // twig spurs
    leafy(hb, sd * 1.48 * r, 1.02 * H, -0.32 * r, r * 1.6, sd > 0 ? 1 : 4);
  }
  blob(hb, 0, 0.42 * H, 0.94 * r, 0.14 * r, 0.1 * H, 0.13 * r, bark);                      // nose knob
  blob(hb, 0, 0.06 * H, 0.76 * r, 0.42 * r, 0.1 * H, 0.26 * r, dk);                        // pointed chin
  blob(hb, -0.62 * r, 1.04 * H, 0.42 * r, 0.32 * r, 0.06 * H, 0.3 * r, moss);
  // gnarled branches growing up and back from the crown, forking into leafy sprouts
  [[-2.2, 0.6], [-1.45, 0.72], [-0.75, 0.48], [0.7, 0.55], [1.4, 0.75], [2.15, 0.62], [PI, 0.66]].forEach(([a, len], j) => {
    const p0 = [Math.sin(a) * 0.6 * r, 1.05 * H, Math.cos(a) * 0.6 * r - 0.06 * r];
    const dir = [Math.sin(a) * 0.45, 1, Math.cos(a) * 0.45 - 0.3];
    const n = Math.hypot(...dir), L1 = len * r * 1.3;
    const p1 = p0.map((v, i) => v + dir[i] / n * L1);
    rod(hb, p0, p1, 0.12 * r, j % 2 ? dk : bark, 6);
    const side = [Math.cos(a), 0, -Math.sin(a)];
    for (const sg of [-1, 1]) {
      if (j % 3 === 2 && sg > 0) continue;
      const p2 = p1.map((v, i) => v + (dir[i] / n * 0.7 + side[i] * sg * 0.55) * L1 * 0.7);
      rod(hb, p1, p2, 0.07 * r, dk, 5);
      if ((j + (sg > 0 ? 1 : 0)) % 2) leafy(hb, p2[0], p2[1], p2[2], r * 1.9, j + sg);
    }
  });
  root.add(b.build({ name: 'groot' }));
  const out = { root };
  // long, thin, twisting limbs with knotty hands and twig fingers
  for (const side of [1, -1]) {
    const piv = new THREE.Group(); piv.position.set(side * 1.05, 9.4, 0);
    const a = new BrickBuilder(1);
    const elbow = [side * 0.08, -3.0, 0.08], wrist = [0, -5.75, 0];
    blob(a, 0, 0, 0, 0.36, 0.34, 0.38, bark);
    rod(a, [0, 0, 0], elbow, 0.24, bark, 7);
    blob(a, ...elbow, 0.3, 0.28, 0.3, dk);
    rod(a, elbow, wrist, 0.2, bark, 7);
    for (let q = 0; q < 2; q++) { tBtwist(a, [0, -0.2, 0], elbow, 7, 0.24, 2.2, q * PI, 0.065, dk); tBtwist(a, elbow, wrist, 7, 0.21, 2.2, q * PI + 1, 0.06, dk); }
    blob(a, 0, -5.85, 0.02, 0.3, 0.3, 0.32, dk);                                     // knotty hand
    for (let j = -1; j <= 1; j++) rod(a, [j * 0.12, -6.0, 0.03], [j * 0.2, -6.75, 0.2], 0.075, dk, 5);
    rod(a, [side * -0.12, -5.9, 0.16], [side * -0.16, -6.3, 0.5], 0.075, dk, 5);
    if (side > 0) { blob(a, 0.16, -1.3, 0.2, 0.2, 0.32, 0.12, moss); leafy(a, 0.2, -3.0, 0.25, 2.2, 5); }
    else { leafy(a, -0.26, -3.4, 0.12, 2.6, 3); blob(a, -0.1, -4.6, 0.2, 0.16, 0.26, 0.1, moss); }
    piv.add(a.build({ name: 'branch' }));
    root.add(piv);
    out[side > 0 ? 'armL' : 'armR'] = piv;
  }
  return out;
}
// Rocket is built in driver units (his driver rig, stood up) and scaled by K
export function rocket() {
  const K = 1.9;
  const fur = 0x8c7560, furDk = 0x5a4838, mask = 0x241c18, cream = 0xf0e6d0, nose = 0x16120f;
  const suit = M.orange, navy = 0x24366a, strap = 0x4a3424, pouch = 0x86704a;
  const cone = tBc('rkCone', () => new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0));
  const root = new THREE.Group();
  const bb = new BrickBuilder(1), tb = tBxf(bb, 0, 0, 0, K);
  const y0 = 0.42;                                                                   // waist
  // little legs and bare raccoon feet
  for (const sd of [-1, 1]) {
    tb.box(sd * 0.12, 0.06, 0, 0.17, y0 - 0.04, 0.2, suit);
    tb.box(sd * 0.12, 0.05, 0, 0.18, 0.06, 0.21, navy);
    tb.box(sd * 0.12, 0, 0.05, 0.17, 0.08, 0.28, furDk);
    for (let j = -1; j <= 1; j++) tb.box(sd * 0.12 + j * 0.05, 0, 0.19, 0.035, 0.04, 0.03, cream);
  }
  // jumpsuit: orange with a navy yoke, harness straps and pouches
  tb.add(tBtaper(0.58, 0.48, 0.54, 0.38, 0.33), plastic(suit), 0, y0, 0);
  tb.add(tBtaper(0.53, 0.47, 0.13, 0.355, 0.33), plastic(navy), 0, y0 + 0.42, 0, 0, 1.03, 1, 1.04);
  tb.box(0, y0 - 0.02, 0, 0.6, 0.09, 0.4, strap);
  tb.box(0, y0 - 0.01, 0.2, 0.09, 0.07, 0.02, 0xc8ccd2);
  for (const sd of [-1, 1]) {
    for (const z of [0.18, -0.18]) tb.boxM(m4(sd * 0.06, y0 + 0.3, z + Math.sign(z) * 0.01, 0, 0, sd * -0.62, 0.06, 0.55, 0.025), strap);
    tb.box(sd * 0.2, y0 - 0.05, 0.19, 0.12, 0.13, 0.07, pouch);
    tb.box(sd * 0.3, y0 - 0.05, 0, 0.06, 0.14, 0.14, pouch);
  }
  tb.box(0, y0 + 0.24, 0.17, 0.12, 0.1, 0.03, 0xc8ccd2);                           // harness ring
  blob(tb, 0, y0 + 0.56, 0.02, 0.22, 0.06, 0.19, fur);                             // furry neck
  // head: big and round, the raccoon mask across the eyes, cream muzzle and cheek ruffs
  const hb = tBxf(tb, 0, y0 + 0.56, 0.02);
  blob(hb, 0, 0.3, 0, 0.36, 0.31, 0.32, fur);
  blob(hb, 0, 0.36, -0.08, 0.34, 0.28, 0.26, 0x7e6854);
  for (const sd of [-1, 1]) {
    blob(hb, sd * 0.14, 0.3, 0.2, 0.18, 0.105, 0.15, mask, 0, sd * 0.3, sd * 0.22);
    blob(hb, sd * 0.26, 0.24, 0.12, 0.14, 0.09, 0.15, mask, 0, 0, sd * 0.5);
    blob(hb, sd * 0.15, 0.43, 0.25, 0.11, 0.045, 0.06, cream, 0, 0, sd * 0.32);
    hb.sphere(sd * 0.13, 0.31, 0.3, 0.062, 0xf6f2ea);
    hb.sphere(sd * 0.13, 0.305, 0.334, 0.045, 0x8a4a18);
    hb.sphere(sd * 0.13, 0.305, 0.36, 0.027, 0x0c0a08);
    hb.sphere(sd * 0.13 + 0.018, 0.325, 0.38, 0.012, 0xffffff);
    blob(hb, sd * 0.27, 0.15, 0.13, 0.15, 0.11, 0.14, cream, 0, 0, sd * 0.4);
    for (const [dy, a] of [[0.02, 0.3], [-0.06, 0.8]]) hb.addMatrix(cone, plastic(cream), m4(sd * 0.36, 0.15 + dy, 0.1, 0, 0, -sd * (PI / 2 + a), 0.05, 0.1, 0.045));
    blob(hb, sd * 0.25, 0.6, -0.05, 0.13, 0.15, 0.06, fur, 0, 0, sd * -0.35);
    blob(hb, sd * 0.25, 0.6, -0.01, 0.09, 0.11, 0.03, 0x3a2a22, 0, 0, sd * -0.35);
    blob(hb, sd * 0.25, 0.6, -0.08, 0.135, 0.155, 0.04, cream, 0, 0, sd * -0.35);
    hb.addMatrix(cone, plastic(cream), m4(sd * 0.31, 0.72, -0.04, 0, 0, sd * -0.45, 0.04, 0.1, 0.03));
  }
  blob(hb, 0, 0.29, 0.24, 0.07, 0.07, 0.07, mask);
  blob(hb, 0, 0.45, 0.235, 0.045, 0.1, 0.05, furDk, -0.5);
  blob(hb, 0, 0.17, 0.3, 0.15, 0.1, 0.14, cream);
  blob(hb, 0, 0.07, 0.26, 0.11, 0.06, 0.1, cream);
  blob(hb, 0, 0.21, 0.435, 0.05, 0.038, 0.035, nose);
  blob(hb, 0.025, 0.105, 0.375, 0.075, 0.014, 0.03, 0x2a1410, 0, 0, 0.28);
  hb.addMatrix(cone, plastic(0xffffff), m4(0.07, 0.11, 0.375, PI, 0, 0, 0.014, 0.035, 0.012));
  // right hand on the gun's grip at his hip, left fist raised
  for (const [sd, rx, rz] of [[1, -2.25, 0.35], [-1, -0.5, 0.19]]) {
    const ab = tBxf(tb, sd * 0.32, y0 + 0.46, 0, 1, rx, 0, rz);
    ab.sphere(0, 0, 0, 0.1, navy);
    ab.add(tBtaper(0.13, 0.15, 0.3, 0.14), plastic(suit), 0, -0.34, 0);
    ab.box(0, -0.36, 0, 0.14, 0.05, 0.15, navy);
    ab.sphere(0, -0.4, 0, 0.075, furDk);
    for (let j = -1; j <= 1; j++) ab.box(j * 0.035, -0.48, 0.03, 0.022, 0.05, 0.022, cream);
  }
  // big ringed tail curling up behind him
  const tl = tBxf(tb, 0, y0, -0.17);
  const P = [[0, 0, 0], [0, -0.05, -0.42], [0.05, 0.45, -0.62], [0.16, 0.78, -0.42]];
  const bez = (u, i) => { const v = 1 - u; return v * v * v * P[0][i] + 3 * v * v * u * P[1][i] + 3 * v * u * u * P[2][i] + u * u * u * P[3][i]; };
  const N = 11;
  for (let k = 0; k < N; k++) {
    const u = (k + 0.5) / N, du = 0.01;
    const ty = bez(u + du, 1) - bez(u - du, 1), tz = bez(u + du, 2) - bez(u - du, 2), tx = bez(u + du, 0) - bez(u - du, 0);
    const rr = 0.09 + 0.1 * Math.sin(PI * Math.min(1, u * 1.15)) + (k === N - 1 ? 0.02 : 0);
    blob(tl, bez(u, 0), bez(u, 1), bez(u, 2), rr, 0.11, rr, (k === N - 1 || k % 2) ? mask : fur, Math.atan2(tz, ty), 0, -Math.atan2(tx, ty));
  }
  root.add(bb.build({ name: 'rocket' }));
  // the big gun, longer than he is tall: the driver's gun laid along +Z from the grip in his right hand
  const gun = new THREE.Group(); gun.position.set(-0.24 * K, 0.52 * K, 0.22 * K);
  const gb0 = new BrickBuilder(1), gb = tBxf(gb0, 0, 0, 0, K, -PI / 2);
  const metal = 0x4a4f58, dark = 0x2a2e34;
  gb.box(0, -0.12, 0.02, 0.09, 0.2, 0.12, dark);
  gb.boxM(m4(0, -0.25, 0.22, 0, 0, 0, 0.3, 0.84, 0.28), metal);
  gb.boxM(m4(0, 0.32, 0.17, 0.25, 0, 0, 0.2, 0.42, 0.22), dark);
  gb.boxM(m4(0, -0.36, 0.4, 0, 0, 0, 0.22, 0.62, 0.1), dark);
  for (const sd of [-1, 1]) {
    gb.boxM(m4(sd * 0.155, -0.22, 0.22, 0, 0, 0, 0.02, 0.56, 0.2), M.orange);
    gb.cyl(sd * 0.17, -0.6, 0.31, 0.045, 0.34, 0, { mat: glow(0x3ad0ff, 2.2), seg: 8 });
  }
  for (const [x, z] of [[-0.07, 0.17], [0.07, 0.17], [0, 0.28]]) gb.cyl(x, -1.36, z, 0.05, 0.74, 0x3a3e46, { seg: 8 });
  for (const y of [-0.98, -1.4]) gb.cyl(0, y, 0.21, 0.16, 0.08, y < -1.2 ? 0x6a7078 : dark, { seg: 10 });
  gb.cyl(0, -0.62, 0.5, 0.05, 0.4, dark, { seg: 8 });
  gb.sphere(0, -0.63, 0.5, 0.045, 0, { mat: glow(0xff3020, 2) });
  gb.boxM(m4(0, -0.68, 0.365, 0, 0, 0, 0.14, 0.16, 0.03), 0, { mat: glow(0x3ad0ff, 2.5) });
  gun.add(gb0.build({ name: 'gun' }));
  root.add(gun);
  return { root, gun };
}

// ---- vehicles / creatures ------------------------------------------------------------------
export function chariot() {
  const b = new BrickBuilder(1);
  const hull = 0x5a5448, trim = 0x8a7a5a;
  b.box(0, 0.6, 0, 2.4, 0.8, 5.2, hull);
  b.boxM(mat4(0, 1.3, 2.5, -0.5, 0, 0, 2.2, 1.4, 0.4), trim);
  b.box(0, 1.4, -2.3, 2.2, 0.3, 0.6, trim);
  for (const s of [-1, 1]) b.boxM(mat4(s * 1.4, 0.9, 0.4, 0, 0, s * 0.3, 0.5, 0.4, 4.2), hull);
  b.box(0, 0.25, 0, 1.6, 0.35, 3.8, 0, { mat: glow(0x3ad0ff, 2.2) });
  // chitauri rider
  b.box(0, 1.4, -0.4, 0.9, 1.1, 0.6, 0x4a4a40); b.box(0, 2.5, -0.4, 1.1, 1.2, 0.7, 0x6a6452);
  b.box(0, 3.7, -0.4, 0.7, 0.7, 0.8, 0x4a4a40); b.box(0, 3.85, -0.02, 0.5, 0.15, 0.1, 0, { mat: glow(0x3ad0ff, 2) });
  for (const s of [-1, 1]) b.boxM(mat4(s * 0.8, 3.0, 0.1, -1.2, 0, 0, 0.28, 1.1, 0.28), 0x6a6452);
  b.boxM(mat4(0, 2.9, 0.9, 0, 0, 0, 0.2, 0.2, 1.8), 0x3a3a30);
  return b.build({ name: 'chariot' });
}
export function leviathanParts() {
  const seg = new BrickBuilder(1);
  seg.box(0, -3.2, -3.4, 7.5, 6.4, 6.8, 0x4e4c48);
  for (let k = 0; k < 3; k++) seg.boxM(mat4(0, 3.3, -3.4 + (k - 1) * 2.2, 0, 0, 0, 5.8 - k * 0.4, 1.2, 1.8), 0x7a6040);
  for (const s of [-1, 1]) seg.boxM(mat4(s * 3.9, 0, -3.4, 0, 0, s * 0.4, 1.2, 5.2, 5.6), 0x34322e);
  seg.box(0, -3.8, -3.4, 5.5, 0.6, 5.6, 0, { mat: glow(0x3ad0ff, 1.4) });
  const head = new BrickBuilder(1);
  head.boxM(mat4(0, 0, 4, 0, 0, 0, 8.5, 7, 9), 0x4e4c48);
  head.boxM(mat4(0, -3.6, 9, 0.35, 0, 0, 8, 1.6, 8), 0x34322e);
  head.boxM(mat4(0, 3.8, 5, -0.15, 0, 0, 6.6, 1.4, 7), 0x7a6040);
  for (const s of [-1, 1]) { head.box(s * 3.2, 0.8, 7.5, 1, 1, 1, 0, { mat: glow(0xffd23a, 2.5) }); for (let k = 0; k < 4; k++) head.boxM(mat4(s * (1 + k * 0.8), -2.3, 11.8 - k * 1.2, 0.3, 0, 0, 0.35, 1.4, 0.35), 0xe8dcc0); }
  const tail = new BrickBuilder(1);
  tail.boxM(mat4(0, 0, -4, 0, 0, 0, 4.5, 3.6, 8), 0x4e4c48); tail.boxM(mat4(0, 0, -9, 0, 0, 0, 2, 1.6, 6), 0x34322e);
  return { seg: seg.build({ name: 'lev-seg' }), head: head.build({ name: 'lev-head' }), tail: tail.build({ name: 'lev-tail' }) };
}
export function milano() {
  const b = new BrickBuilder(1);
  const blue = 0x3a5a8a, org = 0xd9641c, wh = 0xe8e8e8;
  b.boxM(mat4(0, 3, 0, 0, 0, 0, 6, 3.6, 20), wh);
  b.boxM(mat4(0, 3.2, 11, 0.12, 0, 0, 4.4, 2.8, 5), wh);
  b.boxM(mat4(0, 4.4, 9.5, 0.45, 0, 0, 3.4, 1.4, 4.2), 0, { mat: plastic(0x2a3a4a, { trans: true, opacity: 0.8, rough: 0.05 }) });
  b.boxM(mat4(0, 1.3, 0, 0, 0, 0, 6.2, 0.8, 20.2), blue);
  b.boxM(mat4(0, 4.9, -2, 0, 0, 0, 3.2, 0.9, 12), org);
  for (const s of [-1, 1]) {
    b.boxM(mat4(s * 8, 2.8, -3, 0, s * 0.45, 0, 11, 0.6, 7), blue);
    b.boxM(mat4(s * 12.5, 3.8, -6, 0, s * 0.45, s * 0.25, 5, 0.5, 4), org);
    b.boxM(mat4(s * 4.2, 3, -8.5, 0, 0, 0, 2.2, 2.2, 6), 0x5a6068);
    b.cyl(s * 4.2, 3, -11.6, 0.9, 0.2, 0, { mat: glow(0x5ad0ff, 2.5) });
    b.boxM(mat4(s * 1.6, 0.5, 4, 0, 0, 0, 0.5, 2, 0.5), 0x3a3e46);
  }
  b.boxM(mat4(0, 7, -8, 0.3, 0, 0, 0.5, 4, 3), org);
  b.boxM(mat4(0, 0.5, -6, 0, 0, 0, 0.5, 2, 0.5), 0x3a3e46);
  return b.build({ name: 'milano' });
}
export function ironDrone() {
  // Iron Legion / Ultron sentry used as a hovering statue
  const f = ultron();
  f.armL.rotation.x = -Math.PI / 2; f.armR.rotation.x = -Math.PI / 2;
  return f;
}
