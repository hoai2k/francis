// Brick-built Star Wars characters, vehicles and set pieces for the
// "Tatooine Podrace" map. Every builder draws into a BrickBuilder in local
// coordinates (facing +Z, feet at y = 0) so a prop can either be merged into
// the static scenery with stamp() or built into its own animated Group.
import { THREE, BrickBuilder, C, plastic, canvasTexture, faceTexture } from './kit.js';

export const SW = {
  sand: 0xdcb87a, sand2: 0xc9a262, dune: 0xe6c68c, stone: 0xb98a58, stone2: 0x9a6c42, stone3: 0xcf9f68,
  rust: 0x8a5634, rust2: 0x5e3a22, imp: 0x8e949a, imp2: 0x5f656c, dark: 0x2b2f38,
  snow: 0xf4f8fb, ice: 0xbfe0f0, beskar: 0xc6cad2, adobe: 0xe8d8b8, adobe2: 0xd8c09a,
};
export const glow = (c, i = 2.2) => plastic(c, { emissive: c, emissiveIntensity: i });
export const metal = (c, r = 0.3) => plastic(c, { metal: 0.75, rough: r });
// lightsaber blades: a translucent red glow around a hot white core
let _sr = null, _sc = null;
export const SABER_RED = () => (_sr ||= new THREE.MeshBasicMaterial({ color: 0xff1a10, transparent: true, opacity: 0.75, depthWrite: false }));
export const SABER_CORE = () => (_sc ||= new THREE.MeshBasicMaterial({ color: 0xfff0f0 }));
const matOf = (c) => (typeof c === 'number' ? plastic(c) : c);

// ---- unit geometries (centred) -------------------------------------------------
function indexed(g) { if (!g.index) { const n = g.attributes.position.count; g.setIndex([...Array(n).keys()]); } return g; }
const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
export const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
export const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8);
export const CYL20 = new THREE.CylinderGeometry(1, 1, 1, 20);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const SPH = new THREE.SphereGeometry(1, 12, 8);
const HEMI = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
export const CONE = new THREE.ConeGeometry(1, 1, 10);
const HEAD = new THREE.CylinderGeometry(1, 1, 1, 16).translate(0, 0.5, 0);
const TRAP = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 0.8);
  g.translate(0, 0.5, 0); g.computeVertexNormals();
  return g;
})();
// helmet / hood shapes (as the drivers' heads): a band round the front of a head (brow
// ridges), a flared skirt round the back and sides, the back half of a dome, a head that
// narrows to the chin, and a robe that flares out to the hem
const FRONTARC = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false, -Math.PI * 0.4, Math.PI * 0.8).translate(0, 0.5, 0);
const FLARE = new THREE.CylinderGeometry(1, 1.3, 1, 16, 1, false, Math.PI * 0.3, Math.PI * 1.4).translate(0, 0.5, 0);
const HOOD = new THREE.SphereGeometry(1, 14, 6, Math.PI, Math.PI, 0, Math.PI / 2);
const CHIN = new THREE.CylinderGeometry(1, 0.84, 1, 22).translate(0, 0.5, 0);
const ROBE = new THREE.CylinderGeometry(0.7, 1, 1, 14).translate(0, 0.5, 0);
export { BOX, SPH, HEMI, CYL };

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
export function put(b, geo, col, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  b.addMatrix(geo, matOf(col), _m);
}
// centred box
export const box = (b, col, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => put(b, BOX, col, x, y, z, sx, sy, sz, rx, ry, rz);
export const ball = (b, col, x, y, z, r, sy = 1) => put(b, SPH, col, x, y, z, r, r * sy, r);
// cylinder (or box / any unit-Y geometry) spanning two points
export function rod(b, col, x1, y1, z1, x2, y2, z2, r, geo = CYL, r2 = r) {
  _v.set(x2 - x1, y2 - y1, z2 - z1); const L = _v.length() || 1e-4; _v.multiplyScalar(1 / L);
  _q.setFromUnitVectors(UP, _v);
  _m.compose(_p.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2), _q, _s.set(r, L, r2));
  b.addMatrix(geo, matOf(col), _m);
}
// wing-like hexagon lying in the local YZ plane (axis along X), a vertex pointing up
const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3();
export function hexX(b, col, x, y, z, r, thick, geo = CYL6) {
  _m.makeBasis(_bx.set(0, 0, 1), _by.set(1, 0, 0), _bz.set(0, 1, 0));
  _m.scale(_s.set(r, thick, r)); _m.setPosition(x, y, z);
  b.addMatrix(geo, matOf(col), _m);
}
// side-profile prism: points [z, y] extruded `width` along X (centred)
export function prism(pts, width) {
  const sh = new THREE.Shape();
  pts.forEach(([u, v], i) => (i ? sh.lineTo(u, v) : sh.moveTo(u, v)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: false });
  g.rotateY(-Math.PI / 2); g.translate(width / 2, 0, 0);
  g.deleteAttribute('uv'); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return indexed(g);
}
export function prismAt(b, col, pts, width, x, y, z, s = 1, ry = 0) {
  const g = prism(pts, width);
  _q.setFromAxisAngle(UP, ry);
  _m.compose(_p.set(x, y, z), _q, _s.set(s, s, s));
  b.addMatrix(g, matOf(col), _m);
  g.dispose();
}

// Merge a builder function's output into another builder (static scenery).
export function stamp(dst, fn, x, y, z, rot = 0, s = 1) {
  const tmp = new BrickBuilder(1);
  fn(tmp);
  _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(UP, rot), _s.set(s, s, s));
  const M = _m.clone();
  for (const c of tmp.chunks.values()) for (const [mat, geos] of c) for (const g of geos) { g.applyMatrix4(M); dst.bucket(mat, x, z).push(g); }
  tmp.chunks.clear();
}
export function group(fn, name = 'sw') { const b = new BrickBuilder(1); fn(b); const g = b.build({ name }); return g; }
export function pivot(child, x, y, z) { const p = new THREE.Group(); p.position.set(x, y, z); if (child) p.add(child); return p; }

// ---- face / helmet prints ----------------------------------------------------------
const faces = {};
function face(key, draw, opts = {}) {
  if (faces[key]) return faces[key];
  const tex = canvasTexture(256, 128, (g, w, h) => draw(g, w / 2, h / 2, w, h));
  faces[key] = new THREE.MeshStandardMaterial({ map: tex, roughness: opts.rough ?? 0.4, metalness: opts.metal ?? 0 });
  return faces[key];
}
// A print drawn in world units on a head cylinder of radius R and height Hc (front centre
// at u = 0, v = height above the bottom), like the drivers' printFace().
function printFace(key, R, Hc, skin, draw, opts) {
  return face(key, (g, cx, cy, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    g.setTransform(w / (2 * Math.PI * R), 0, 0, -h / Hc, cx, h);
    draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }, opts);
}
const ell = (g, x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
const poly = (g, col, pts) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
const eye = (g, x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
export const FACES = {
  maul: () => face('maul', (g, cx, cy, w, h) => {
    g.fillStyle = '#b3141c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111';
    // forehead stripes
    for (const dx of [-26, -9, 9, 26]) { g.beginPath(); g.moveTo(cx + dx - 5, 0); g.lineTo(cx + dx + 5, 0); g.lineTo(cx + dx, cy - 24); g.fill(); }
    // eye masks
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 6, cy - 22); g.lineTo(cx + sd * 38, cy - 20); g.lineTo(cx + sd * 32, cy + 2); g.lineTo(cx + sd * 10, cy + 6); g.fill(); }
    g.fillRect(cx - 5, cy - 6, 10, 22);
    // chin
    g.beginPath(); g.moveTo(cx - 30, cy + 26); g.lineTo(cx + 30, cy + 26); g.lineTo(cx + 14, h); g.lineTo(cx - 14, h); g.fill();
    for (const sd of [-1, 1]) { eye(g, cx + sd * 20, cy - 9, 7, 5, '#ffd21a'); eye(g, cx + sd * 20, cy - 9, 3, 3, '#c01010'); }
    g.fillStyle = '#b3141c'; g.fillRect(cx - 14, cy + 20, 28, 4);
  }),
  bane: () => face('bane', (g, cx, cy, w, h) => {
    g.fillStyle = '#3a68aa'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,40,0.25)'; g.fillRect(cx - 40, cy + 10, 80, 30);
    for (const sd of [-1, 1]) { eye(g, cx + sd * 19, cy - 8, 12, 11, '#1a0a0a'); eye(g, cx + sd * 19, cy - 8, 9, 8, '#e01818'); eye(g, cx + sd * 17, cy - 11, 2.5, 2.5, '#ffb0b0'); }
    g.strokeStyle = '#122848'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 14, cy + 22); g.lineTo(cx + 14, cy + 22); g.stroke();
    g.strokeStyle = '#8a8a8a'; g.lineWidth = 5; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 36, cy + 4); g.lineTo(cx + sd * 18, cy + 20); g.stroke(); }
  }),
  vader: () => face('vader', (g, cx, cy, w, h) => {
    g.fillStyle = '#141414'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2e2e32';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 6, cy - 24); g.lineTo(cx + sd * 36, cy - 20); g.lineTo(cx + sd * 26, cy + 2); g.lineTo(cx + sd * 8, cy - 4); g.fill(); }
    g.fillStyle = '#9a9aa2'; g.beginPath(); g.moveTo(cx, cy - 2); g.lineTo(cx + 22, cy + 34); g.lineTo(cx - 22, cy + 34); g.fill();
    g.strokeStyle = '#141414'; g.lineWidth = 2; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(cx + k * 4, cy + 12); g.lineTo(cx + k * 5, cy + 32); g.stroke(); }
    g.fillStyle = '#5a5a60'; for (const sd of [-1, 1]) g.fillRect(cx + sd * 34 - 3, cy + 6, 6, 22);
  }, { rough: 0.2 }),
  boba: () => face('boba', (g, cx, cy, w, h) => {
    g.fillStyle = '#56683e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b0302a'; g.fillRect(0, 0, w, 14);
    g.fillStyle = '#e0c040'; g.fillRect(cx - 50, 14, 22, 8);
    g.fillStyle = '#101010'; g.fillRect(cx - 34, cy - 20, 68, 13); g.fillRect(cx - 7, cy - 10, 14, 40);
    g.fillStyle = '#3a4a2a'; g.fillRect(cx + 16, cy + 8, 8, 12);
  }),
  // The Tusken shares its print with the driver's head (../drivers/starwars.js): drawn in
  // world units on a head of the driver's size.
  tusken: () => printFace('tusken', 0.403, 0.6084, '#c9b38e', (g) => {
    const Hc = 0.6084, cols = ['#bca47c', '#d6c49f', '#ad936c', '#c9b38e', '#cbb690'];
    for (let k = 0; k < 18; k++) {
      const v = -0.12 + k * 0.042, sl = (k % 2 ? 1 : -1) * (0.05 + (k % 3) * 0.02);
      poly(g, cols[k % 5], [[-1.3, v - sl], [1.3, v + sl], [1.3, v + sl + 0.05], [-1.3, v - sl + 0.05]]);
      poly(g, '#8a7350', [[-1.3, v - sl], [1.3, v + sl], [1.3, v + sl + 0.007], [-1.3, v - sl + 0.007]]);
    }
    // soot round the goggles and the mouth
    for (const sd of [-1, 1]) ell(g, sd * 0.17, Hc * 0.62, 0.11, 0.085, 'rgba(70,52,34,0.55)');
    ell(g, 0, Hc * 0.27, 0.12, 0.09, 'rgba(70,52,34,0.5)');
  }),
  luke: () => { faces.luke ||= new THREE.MeshStandardMaterial({ map: faceTexture('smile'), roughness: 0.4 }); return faces.luke; },
  pilot: () => { faces.pilot ||= new THREE.MeshStandardMaterial({ map: faceTexture('grin'), roughness: 0.4 }); return faces.pilot; },
};

// ---- the minifigure ---------------------------------------------------------------
// s = scale (a normal minifig is ~3.3 units tall at s = 1). Options:
// legs, hips, torso, arms, hands, neck, face (material for the head print),
// headR/headH (helmets are wider), noArms, noStud, legR (right leg colour)
export function fig(b, s, o) {
  const legs = o.legs ?? C.blue;
  for (const sd of [-1, 1]) box(b, sd < 0 ? (o.legR ?? legs) : legs, sd * 0.25 * s, 0.5 * s, 0.03 * s, 0.47 * s, 1.0 * s, 0.56 * s);
  box(b, o.hips ?? legs, 0, 1.12 * s, 0, 1.0 * s, 0.25 * s, 0.56 * s);
  put(b, TRAP, o.torso ?? C.red, 0, 1.25 * s, 0, 1.06 * s, 1.2 * s, 0.54 * s);
  rod(b, o.neck ?? o.torso ?? C.fig, 0, 2.43 * s, 0, 0, 2.58 * s, 0, 0.2 * s);
  const hr = (o.headR ?? 0.37) * s, hh = (o.headH ?? 0.66) * s;
  if (o.face) b.add(HEAD, o.face, 0, 2.56 * s, 0, Math.PI, hr, hh, hr);
  if (o.face && !o.noStud) rod(b, o.studCol ?? C.fig, 0, 2.56 * s + hh, 0, 0, 2.56 * s + hh + 0.14 * s, 0, 0.2 * s);
  if (!o.noArms) for (const sd of [-1, 1]) arm(b, s, sd, o.arms ?? o.torso ?? C.red, o.hands ?? C.fig, sd * 0.56 * s, 2.3 * s, 0, o.armPitch ?? 0.25);
  return { shoulderY: 2.3 * s, headY: 2.56 * s, top: 2.56 * s + hh };
}
// arm hanging from the shoulder (ox, oy, oz), swung forward by `pitch`
export function arm(b, s, sd, col, hand, ox = 0, oy = 0, oz = 0, pitch = 0.25, spread = 0.1) {
  const len = 1.0 * s;
  const ex = ox + sd * spread * s, ey = oy - Math.cos(pitch) * len, ez = oz + Math.sin(pitch) * len;
  rod(b, col, ox, oy + 0.08 * s, oz, ex, ey, ez, 0.3 * s, BOX, 0.32 * s);
  rod(b, hand, ex, ey + 0.02 * s, ez, ex, ey - 0.24 * s, ez + 0.06 * s, 0.13 * s, CYL8);
  return [ex, ey - 0.12 * s, ez + 0.03 * s];
}
// a point a fraction t (0 = shoulder, 1 = wrist) down an arm built by arm() with the same
// arguments, and a band (sleeve, cuff, joint gap) wrapped round it between t0 and t1
function armPt(s, sd, ox, oy, oz, pitch, spread, t) {
  const ex = ox + sd * spread * s, ey = oy - Math.cos(pitch) * s, ez = oz + Math.sin(pitch) * s, y1 = oy + 0.08 * s;
  return [ox + (ex - ox) * t, y1 + (ey - y1) * t, oz + (ez - oz) * t];
}
function armBand(b, col, s, sd, ox, oy, oz, pitch, spread, t0, t1, grow = 1.1) {
  rod(b, col, ...armPt(s, sd, ox, oy, oz, pitch, spread, t0), ...armPt(s, sd, ox, oy, oz, pitch, spread, t1), 0.3 * s * grow, BOX, 0.32 * s * grow);
}
// a point on a head of radius r, `a` radians round from the front, y above its base
const onHead = (a, y, r) => [Math.sin(a) * r, y, Math.cos(a) * r];
function armGroup(s, sd, col, hand, pitch = 0.1, extra) {
  return group((b) => { arm(b, s, sd, col, hand, 0, 0, 0, pitch, 0.06); extra?.(b); }, 'arm');
}

// ---- minifig prints for C-3PO and the stormtrooper -----------------------------------
// Each of these two wears ALL its prints (the wrap round the head, torso front and back, legs)
// on one canvas, so a trooper stamped into the scenery dozens of times still costs a single
// textured draw call per chunk. The drivers (../drivers/starwars.js) wear the same prints
// and build their heads with the same functions.
const AT = 1024;
// atlas regions [x0, y0, x1, y1] in canvas px. The torso regions keep the shape of the torso
// they are printed on: a standing fig() is 1.06 x 1.2, a seated driver 0.92W x 0.82.
const atlasRegions = (W) => {
  const dh = 392 + Math.round(240 * 0.82 / (0.92 * W));
  return {
    head: [0, 0, 1024, 384],
    figF: [0, 392, 240, 664], figB: [248, 392, 488, 664],
    drvF: [496, 392, 736, dh], drvB: [744, 392, 984, dh],
    leg: [0, 680, 160, 1020], thigh: [176, 680, 336, 960],
    blank: [1000, 1000, 1016, 1016],
  };
};
const _atlases = {};
function atlas(key, W, base, draw, opts = {}) {
  if (_atlases[key]) return _atlases[key];
  const rg = atlasRegions(W);
  const map = canvasTexture(AT, AT, (g) => { g.fillStyle = base; g.fillRect(0, 0, AT, AT); draw(g, rg); });
  map.generateMipmaps = true;
  const mat = new THREE.MeshStandardMaterial({ map, roughness: opts.rough ?? 0.34, metalness: opts.metal ?? 0 });
  return (_atlases[key] = { mat, rg });
}
// draw into region r with local coordinates x in [x0, x1] (left to right) and y in [y0, y1]
// (bottom to top)
function inRegion(g, r, x0, x1, y0, y1, fn) {
  const sx = (r[2] - r[0]) / (x1 - x0), sy = (r[3] - r[1]) / (y1 - y0);
  g.save();
  g.beginPath(); g.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); g.clip();
  g.setTransform(sx, 0, 0, -sy, r[0] - x0 * sx, r[3] + y0 * sy);
  g.lineJoin = 'round'; g.lineCap = 'round';
  fn();
  g.restore();
}
// a torso print region: x across the bottom edge (-0.5..0.5), y up to the torso's height T
// (in bottom widths); k = top width / bottom width
const inTorso = (g, r, k, fn) => { const T = (r[3] - r[1]) / (r[2] - r[0]); inRegion(g, r, -0.5, 0.5, 0, T, () => fn(T, k)); };
const line = (g, col, w, pts) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
const curve = (g, col, w, a, c, b) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...c, ...b); g.stroke(); };
const ring = (g, col, w, x, y, r) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); };
const uvTo = (r, u, v) => [(r[0] + u * (r[2] - r[0])) / AT, 1 - (r[3] - v * (r[3] - r[1])) / AT];
// a copy of a (unit) geometry with its UVs squeezed into atlas region r; flat caps (normal
// straight up or down) get a blank spot instead
const _rgGeo = new Map();
function regionGeo(key, geo, r, blank) {
  let g = _rgGeo.get(key);
  if (g) return g;
  g = geo.clone();
  const uv = g.attributes.uv, n = g.attributes.normal, b = uvTo(blank, 0.5, 0.5);
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = Math.abs(n.getY(i)) > 0.99 ? b : uvTo(r, uv.getX(i), uv.getY(i));
    uv.setXY(i, u, v);
  }
  _rgGeo.set(key, g);
  return g;
}
// a flat trapezoid print (bottom width w0, top w1, height h; bottom centre at the origin,
// facing +Z) whose planar UVs cover atlas region r; flip mirrors it left to right
function quadGeo(w0, w1, h, r, flip) {
  const key = [w0, w1, h, ...r, flip].join();
  let g = _rgGeo.get(key);
  if (g) return g;
  const W = Math.max(w0, w1), pts = [[-w0 / 2, 0], [w0 / 2, 0], [w1 / 2, h], [-w1 / 2, h]];
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(([x, y]) => [x, y, 0]), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pts.flatMap(([x, y]) => uvTo(r, flip ? 0.5 - x / W : 0.5 + x / W, y / h)), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  _rgGeo.set(key, g);
  return g;
}
export function printQuad(b, mat, r, w0, w1, h, x, y, z, rx = 0, ry = 0, flip = false) {
  put(b, quadGeo(w0, w1, h, r, flip), mat, x, y, z, 1, 1, 1, rx, ry, 0);
}
// prints on a standing fig(): torso front and back, and (optionally) both legs. The leg print
// has its inner edge on the right, so the left leg (+X) wears it mirrored.
function figPrints(b, A, s, legs = true) {
  const r = A.rg, z = 0.2725 * s;
  printQuad(b, A.mat, r.figF, 1.06 * s, 0.848 * s, 1.2 * s, 0, 1.25 * s, z);
  printQuad(b, A.mat, r.figB, 1.06 * s, 0.848 * s, 1.2 * s, 0, 1.25 * s, -z, 0, Math.PI);
  if (legs) for (const sd of [-1, 1]) printQuad(b, A.mat, r.leg, 0.47 * s, 0.47 * s, 1.0 * s, sd * 0.25 * s, 0, 0.3125 * s, 0, 0, sd > 0);
}
// a classic minifig C-hand: a ring whose axis points forward (square to the arm, which is
// swung forward by `pitch`), the gap facing in towards the body and a little down
const CHAND = new THREE.TorusGeometry(1, 0.42, 6, 12, Math.PI * 1.55);
export function cHand(b, col, x, y, z, r, sd, pitch = 0) {
  put(b, CHAND, col, x, y, z, r, r, r, -pitch, 0, (sd > 0 ? Math.PI + 0.2 : -0.2) + Math.PI * 0.225);
}
// a fig() arm (see arm()) ending in a short wrist and a C-hand; returns the hand centre
function cArm(b, s, sd, col, hand, ox, oy, oz, pitch, spread) {
  const ex = ox + sd * spread * s, ey = oy - Math.cos(pitch) * s, ez = oz + Math.sin(pitch) * s;
  const dy = -Math.cos(pitch), dz = Math.sin(pitch);   // down the arm
  rod(b, col, ox, oy + 0.08 * s, oz, ex, ey, ez, 0.3 * s, BOX, 0.32 * s);
  rod(b, hand, ex, ey - dy * 0.03 * s, ez - dz * 0.03 * s, ex, ey + dy * 0.14 * s, ez + dz * 0.14 * s, 0.09 * s, CYL8);
  const h = [ex, ey + dy * 0.22 * s, ez + dz * 0.22 * s];
  cHand(b, hand, ...h, 0.11 * s, sd, pitch);
  return h;
}

// ---- characters ------------------------------------------------------------------
// C-3PO, as the LEGO minifig: pearl gold all over (a warm, satin metallic gold), a domed head
// with big round eyes in dark rims, a little "o" mouth and round ear discs; the torso print
// has the collar, the round power button over the abdomen and the open waist with its wiring.
export const PEARL_GOLD = 0xb98535;
const P3 = { gold: '#b98535', line: '#8a5a1e', hi: '#e6b866', dark: '#2e1c0a', orange: '#d9772a' };
let _pearl = null;
// swap the shared vertex-colour plastic for a satin metallic copy on these meshes
export function pearlGold(obj) {
  obj.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m || Array.isArray(m) || !m.vertexColors || m.metalness) return;
    _pearl ||= Object.assign(m.clone(), { metalness: 0.5, roughness: 0.42 });
    o.material = _pearl;
  });
  return obj;
}
// head proportions in head radii: the face drum (narrower at the chin) and the dome on it
const P3H = { face: 1.36, chin: 0.86, dome: 0.85 };
function c3poTorso(g, T, k) {
  const Y = (f) => f * T;
  // collar: a necklace line with two little clips hanging off it, a ring and a dot below
  curve(g, P3.dark, 0.016, [-0.25, Y(0.95)], [0, Y(0.82)], [0.25, Y(0.95)]);
  for (const sd of [-1, 1]) {
    g.save(); g.translate(sd * 0.16, Y(0.85)); g.rotate(sd * 0.35);
    g.fillStyle = P3.dark; g.fillRect(-0.026, -0.065, 0.052, 0.13);
    g.fillStyle = P3.hi; g.fillRect(-0.013, -0.052, 0.026, 0.104);
    g.restore();
  }
  ring(g, P3.dark, 0.014, -0.015, Y(0.78), 0.04);
  ell(g, 0.08, Y(0.69), 0.017, 0.017, P3.dark);
  // the chest plate's lower edge: a raised panel line
  line(g, P3.line, 0.02, [[-0.4, Y(0.5)], [-0.34, Y(0.57)], [0.34, Y(0.57)], [0.4, Y(0.5)]]);
  line(g, P3.hi, 0.012, [[-0.4, Y(0.52)], [-0.34, Y(0.59)], [0.34, Y(0.59)], [0.4, Y(0.52)]]);
  // abdomen: a dark seam with the round power button on it, a triangle in its top half
  line(g, P3.dark, 0.016, [[-0.47, Y(0.32)], [-0.43, Y(0.37)], [0.43, Y(0.37)], [0.47, Y(0.32)]]);
  const by = Y(0.37);
  ell(g, 0, by, 0.145, 0.145, P3.dark);
  ell(g, 0, by, 0.128, 0.128, P3.orange);
  ring(g, '#a8561c', 0.012, 0, by, 0.085);
  poly(g, P3.dark, [[0, by + 0.075], [-0.05, by - 0.012], [0.05, by - 0.012]]);
  poly(g, '#f2b25a', [[0, by + 0.05], [-0.03, by], [0.03, by]]);
  ell(g, 0, by + 0.018, 0.01, 0.01, '#fff4d8');
  for (const sd of [-1, 1]) line(g, '#d0782c', 0.014, [[sd * 0.18, Y(0.27)], [sd * 0.42, Y(0.27)]]);
  // the open waist: a dark band (smiling lower edge) with red, blue and white wiring
  g.save();
  g.beginPath(); g.moveTo(-0.45, Y(0.23)); g.lineTo(0.45, Y(0.23)); g.lineTo(0.45, Y(0.14));
  g.quadraticCurveTo(0, Y(-0.02), -0.45, Y(0.14)); g.closePath();
  g.fillStyle = '#181214'; g.fill(); g.clip();
  const wires = [[-0.4, '#c8d0d8'], [-0.33, '#c0302a'], [-0.26, '#6a9ad8'], [-0.18, '#e8ecf0'], [-0.1, '#7a2430'], [-0.02, '#c0302a'],
    [0.06, '#e8ecf0'], [0.13, '#6a9ad8'], [0.2, '#c8d0d8'], [0.28, '#c0302a'], [0.35, '#9ac0e8'], [0.41, '#e8ecf0']];
  const lean = [0.06, 0.05, -0.03, 0.07, 0.04, -0.05, 0.06, 0.08, -0.02, 0.05, 0.07, -0.04];
  wires.forEach(([x, col], i) => line(g, col, 0.016, [[x, Y(0.21)], [x + lean[i], Y(0.05)]]));
  g.restore();
}
function c3poBack(g, T, k) {
  const Y = (f) => f * T;
  // back plate seams, a socket and the wiring at the waist
  line(g, P3.line, 0.018, [[-0.3, Y(0.97)], [-0.34, Y(0.5)], [0.34, Y(0.5)], [0.3, Y(0.97)]]);
  line(g, P3.hi, 0.01, [[-0.32, Y(0.52)], [0.32, Y(0.52)]]);
  ell(g, 0, Y(0.76), 0.06, 0.06, P3.dark); ell(g, 0, Y(0.76), 0.035, 0.035, P3.line);
  g.save();
  g.beginPath(); g.rect(-0.42, Y(0.13), 0.84, Y(0.12)); g.fillStyle = '#181214'; g.fill(); g.clip();
  [[-0.3, '#c0302a'], [-0.15, '#6a9ad8'], [0.0, '#e8ecf0'], [0.15, '#c0302a'], [0.3, '#6a9ad8']].forEach(([x, col], i) => line(g, col, 0.016, [[x, Y(0.24)], [x + (i % 2 ? 0.05 : -0.05), Y(0.12)]]));
  g.restore();
}
export const c3poPrints = () => atlas('c3po', 0.96, P3.gold, (g, rg) => {
  // head wrap: u = distance round from the front, v = height (both in head radii)
  inRegion(g, rg.head, -Math.PI, Math.PI, 0, P3H.face, () => {
    line(g, P3.line, 0.03, [[0, P3H.face], [0, 1.2]]);                                   // forehead seam
    for (const sd of [-1, 1]) {
      line(g, P3.line, 0.03, [[sd * 1.3, P3H.face], [sd * 1.25, 0.5]]);                   // side seams down to the ears
      ell(g, sd * 0.36, 0.92, 0.27, 0.26, '#a2702e');                                     // eye sockets
      ell(g, sd * 0.36, 0.92, 0.205, 0.205, P3.dark);                                     // eyes: dark rims, pale yellow
      ell(g, sd * 0.36, 0.92, 0.158, 0.158, '#f2dc86');
      ell(g, sd * 0.345, 0.935, 0.09, 0.09, '#fbf0c4');
      ell(g, sd * 0.36, 0.92, 0.03, 0.03, '#5a3a10');
    }
    ell(g, 0, 0.36, 0.12, 0.072, P3.dark);                                               // the little "o" mouth
    ell(g, 0, 0.36, 0.085, 0.04, '#f0d48a');
  });
  inTorso(g, rg.figF, 0.8, (T, k) => c3poTorso(g, T, k));
  inTorso(g, rg.figB, 0.8, (T, k) => c3poBack(g, T, k));
  inTorso(g, rg.drvF, 0.76, (T, k) => c3poTorso(g, T, k));
  inTorso(g, rg.drvB, 0.76, (T, k) => c3poBack(g, T, k));
}, { metal: 0.5, rough: 0.42 });
const P3FACE = new THREE.CylinderGeometry(1, P3H.chin, 1, 28).translate(0, 0.5, 0);
const P3DOME = new THREE.SphereGeometry(1, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2);
// C-3PO's head (also the driver's): R = head radius, base at y0
export function c3poHead(b, R, y0 = 0) {
  const A = c3poPrints(), G = PEARL_GOLD;
  put(b, regionGeo('p3face', P3FACE, A.rg.head, A.rg.blank), A.mat, 0, y0, 0, R, P3H.face * R, R, 0, Math.PI, 0);
  put(b, P3DOME, G, 0, y0 + P3H.face * R - 0.01 * R, 0, R, P3H.dome * R, R);
  // round ear discs low on the sides, a raised rim and a dark centre
  const ey = y0 + 0.36 * R;
  for (const sd of [-1, 1]) {
    rod(b, G, sd * 0.8 * R, ey, -0.04 * R, sd * 1.02 * R, ey, -0.04 * R, 0.19 * R, CYL20);
    rod(b, 0xd9a24c, sd * 1.0 * R, ey, -0.04 * R, sd * 1.05 * R, ey, -0.04 * R, 0.13 * R, CYL20);
    rod(b, 0x5a3a14, sd * 1.04 * R, ey, -0.04 * R, sd * 1.06 * R, ey, -0.04 * R, 0.05 * R, CYL8);
  }
}
export function c3po(s = 2.6) {
  const A = c3poPrints(), G = PEARL_GOLD;
  const root = new THREE.Group();
  root.add(pearlGold(group((b) => {
    fig(b, s, { legs: G, hips: G, torso: G, neck: G, noArms: true });
    figPrints(b, A, s, false);
  }, 'c3po')));
  const head = pearlGold(group((b) => c3poHead(b, 0.4 * s), 'c3po-head'));
  const hp = pivot(head, 0, 2.56 * s, 0);
  root.add(hp);
  const arms = [-1, 1].map((sd) => { const a = pivot(pearlGold(group((b) => cArm(b, s, sd, G, G, 0, 0, 0, 0.1, 0.06), 'arm')), sd * 0.56 * s, 2.3 * s, 0); root.add(a); return a; });
  root.userData.anim = (t) => {
    hp.rotation.y = Math.sin(t * 0.9) * 0.6;
    arms[0].rotation.x = -0.6 - Math.max(0, Math.sin(t * 2.2)) * 1.2;
    arms[1].rotation.x = -0.3 - Math.max(0, Math.sin(t * 2.2 + 2)) * 1.0;
    arms[0].rotation.z = -0.25; arms[1].rotation.z = 0.25;
    root.rotation.z = Math.sin(t * 1.3) * 0.03;
  };
  return root;
}

export function r2d2(s = 2.2) {
  const silver = metal(0xc8ccd2, 0.25), blue = 0x1f55b8;
  const root = new THREE.Group();
  const body = group((b) => {
    rod(b, C.white, 0, 0.45 * s, 0, 0, 1.6 * s, 0, 0.72 * s, CYL20);
    box(b, blue, 0, 1.3 * s, 0.68 * s, 0.34 * s, 0.34 * s, 0.1 * s);
    for (const sd of [-1, 1]) box(b, blue, sd * 0.32 * s, 0.95 * s, 0.63 * s, 0.16 * s, 0.5 * s, 0.1 * s, 0, sd * 0.45, 0);
    box(b, silver, 0, 0.65 * s, 0.7 * s, 0.4 * s, 0.1 * s, 0.1 * s);
    rod(b, 0x9aa0a8, 0, 0.3 * s, 0, 0, 0.5 * s, 0, 0.5 * s, CYL8);
    for (const sd of [-1, 1]) {
      box(b, C.white, sd * 0.86 * s, 0.85 * s, 0, 0.2 * s, 1.1 * s, 0.42 * s);
      box(b, blue, sd * 0.97 * s, 0.95 * s, 0, 0.03 * s, 0.55 * s, 0.2 * s);
      rod(b, silver, sd * 0.7 * s, 1.35 * s, 0, sd * 0.99 * s, 1.35 * s, 0, 0.22 * s, CYL8);
      box(b, C.white, sd * 0.86 * s, 0.14 * s, 0.05 * s, 0.34 * s, 0.28 * s, 0.75 * s);
      box(b, blue, sd * 0.86 * s, 0.2 * s, 0.43 * s, 0.3 * s, 0.14 * s, 0.05 * s);
    }
    box(b, C.white, 0, 0.12 * s, 0, 0.3 * s, 0.24 * s, 0.45 * s);
  }, 'r2');
  root.add(body);
  const dome = group((b) => {
    put(b, HEMI, silver, 0, 0, 0, 0.72 * s, 0.62 * s, 0.72 * s);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + 0.4;
      if (k === 7) continue;
      box(b, blue, Math.sin(a) * 0.62 * s, 0.22 * s, Math.cos(a) * 0.62 * s, 0.26 * s, 0.2 * s, 0.14 * s, -0.35, a, 0);
    }
    box(b, blue, 0, 0.5 * s, 0.34 * s, 0.3 * s, 0.14 * s, 0.24 * s, -0.8, 0, 0);
    rod(b, C.black, 0, 0.36 * s, 0.4 * s, 0, 0.4 * s, 0.72 * s, 0.13 * s, CYL8);
    ball(b, glow(0xff2a2a, 3), 0.28 * s, 0.14 * s, 0.66 * s, 0.07 * s);
    ball(b, glow(0x3ab0ff, 3), -0.26 * s, 0.14 * s, 0.67 * s, 0.06 * s);
  }, 'r2-dome');
  const dp = pivot(dome, 0, 1.6 * s, 0);
  root.add(dp);
  root.userData.anim = (t) => {
    dp.rotation.y = Math.sin(t * 0.8) * 1.3 + Math.sin(t * 2.3) * 0.2;
    root.rotation.x = Math.sin(t * 3.1) * 0.04;
  };
  return root;
}

export function jawa(s = 1.3) {
  return group((b) => {
    const robe = 0x6b4a2e;
    put(b, CONE, robe, 0, 1.2 * s, 0, 0.75 * s, 2.4 * s, 0.75 * s);
    ball(b, robe, 0, 2.3 * s, 0, 0.56 * s, 1.05);
    put(b, CONE, robe, 0, 2.95 * s, -0.12 * s, 0.34 * s, 0.6 * s, 0.34 * s, -0.35, 0, 0);
    rod(b, 0x0c0806, 0, 2.2 * s, 0.25 * s, 0, 2.2 * s, 0.5 * s, 0.36 * s, CYL);
    for (const sd of [-1, 1]) ball(b, glow(0xffd21a, 3.2), sd * 0.14 * s, 2.25 * s, 0.52 * s, 0.09 * s);
    for (const sd of [-1, 1]) rod(b, robe, sd * 0.32 * s, 1.85 * s, 0.05 * s, sd * 0.25 * s, 1.3 * s, 0.55 * s, 0.14 * s, CYL8);
    rod(b, 0x3a3a3a, -0.8 * s, 1.3 * s, 0.6 * s, 0.9 * s, 1.35 * s, 0.6 * s, 0.07 * s, CYL8);
    box(b, 0x2a1a0e, 0, 1.55 * s, 0.35 * s, 0.5 * s, 0.1 * s, 0.1 * s);
  }, 'jawa');
}

export function sandcrawler(b, s = 1) {
  const rust = SW.rust, rust2 = SW.rust2, tan = 0xb58a5a, dk = 0x3a3a3a;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(b, dk, sx * 6.2 * s, 1.7 * s, sz * 9.5 * s, 4.4 * s, 3.4 * s, 8 * s);
    for (let k = 0; k < 8; k++) box(b, 0x1f1f1f, sx * 6.2 * s, 1.7 * s, sz * 9.5 * s + (k - 3.5) * s, 4.6 * s, 3.5 * s, 0.35 * s);
    box(b, rust2, sx * 6.2 * s, 3.6 * s, sz * 9.5 * s, 2.6 * s, 1.4 * s, 3 * s);
  }
  prismAt(b, rust, [[-16, 4], [15, 4], [15, 8], [7, 17], [-12, 17], [-16, 12]], 15, 0, 0, 0, s);
  prismAt(b, SW.rust2, [[-11, 17], [5, 17], [2.5, 21], [-9, 21]], 11, 0, 0, 0, s);
  prismAt(b, rust, [[-7.5, 21], [1, 21], [0, 23.5], [-6.5, 23.5]], 6, 0, 0, 0, s);
  // front slope windows
  const sl = -Math.atan2(8, 9);
  for (let k = 0; k < 3; k++) {
    const f = 0.28 + k * 0.22;
    box(b, k === 1 ? glow(0xffc040, 1.4) : 0x1a1a1a, 0, (8 + 9 * f) * s, (15 - 8 * f + 0.1) * s, 12 * s, 0.7 * s, 0.4 * s, sl, 0, 0);
  }
  for (const sx of [-1, 1]) {
    for (let z = -14; z <= 12; z += 3.2) box(b, rust2, sx * 7.55 * s, 8 * s, z * s, 0.3 * s, 7.6 * s, 0.7 * s);
    rod(b, tan, sx * 7.7 * s, 13 * s, -14 * s, sx * 7.7 * s, 13 * s, 5 * s, 0.35 * s, CYL8);
    box(b, 0x1a1a1a, sx * 7.6 * s, 10.5 * s, -4 * s, 0.2 * s, 1.2 * s, 5 * s);
  }
  rod(b, rust2, 0, 4.8 * s, 15.2 * s, 0, 0.3 * s, 21 * s, 6 * s, BOX, 0.4 * s);
  for (let k = 0; k < 5; k++) box(b, 0x2a2a2a, 0, (4.4 - k) * s, (15.9 + k * 1.1) * s, 5.6 * s, 0.15 * s, 0.3 * s, -Math.atan2(5.8, 4.5), 0, 0);
  for (const sx of [-1, 1]) ball(b, glow(0xfff0a0, 2), sx * 5 * s, 6 * s, 15.1 * s, 0.5 * s);
  rod(b, 0x3a3a3a, -3 * s, 23.5 * s, -2 * s, -3 * s, 27 * s, -2 * s, 0.2 * s, CYL8);
}

export function tieB(b, s = 1) {
  {
    const g = 0x8d949c, d = 0x262a34;
    ball(b, g, 0, 0, 0, 1.35 * s);
    rod(b, C.black, 0, 0, 1.05 * s, 0, 0, 1.42 * s, 0.85 * s, CYL8);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; box(b, g, -Math.sin(a) * 0.45 * s, Math.cos(a) * 0.45 * s, 1.44 * s, 0.1 * s, 0.9 * s, 0.06 * s, 0, 0, a); }
    rod(b, g, 0, 0, -1.1 * s, 0, 0, -1.45 * s, 0.7 * s, CYL8);
    for (const sd of [-1, 1]) {
      rod(b, g, sd * 1.1 * s, 0, 0, sd * 3.35 * s, 0, 0, 0.42 * s, CYL8);
      box(b, g, sd * 2.2 * s, 0, 0, 1.5 * s, 1.1 * s, 0.25 * s);
      hexX(b, g, sd * 3.45 * s, 0, 0, 4.45 * s, 0.2 * s);
      hexX(b, d, sd * 3.5 * s, 0, 0, 4.2 * s, 0.32 * s);
      rod(b, g, sd * 3.25 * s, 0, 0, sd * 3.75 * s, 0, 0, 0.75 * s, CYL8);
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        box(b, g, sd * 3.68 * s, Math.cos(a) * 2.1 * s, Math.sin(a) * 2.1 * s, 0.06 * s, 4.2 * s, 0.14 * s, a, 0, 0);
      }
    }
  }
}
export const tie = (s = 1) => group((b) => tieB(b, s), 'tie');

export function xwingB(b, s = 1) {
  {
    const w = C.white, r = C.red, gr = 0xa0a5a9, a = 0.26;
    box(b, w, 0, 0, -0.5 * s, 1.7 * s, 1.4 * s, 8 * s);
    box(b, w, 0, -0.1 * s, 4.9 * s, 1.2 * s, 1.0 * s, 3 * s);
    box(b, w, 0, -0.15 * s, 7.1 * s, 0.7 * s, 0.6 * s, 1.6 * s);
    for (const sd of [-1, 1]) box(b, r, sd * 0.61 * s, -0.1 * s, 4.9 * s, 0.03 * s, 0.3 * s, 2.6 * s);
    box(b, 0x1a2a3a, 0, 0.82 * s, 1.9 * s, 1.0 * s, 0.45 * s, 2.0 * s);
    ball(b, C.white, 0, 0.8 * s, -0.6 * s, 0.42 * s); ball(b, 0x1f55b8, 0, 0.95 * s, -0.4 * s, 0.22 * s);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const hx = sx * 0.85 * s, hy = sy * 0.3 * s;
      const cx = hx + sx * Math.cos(a) * 3.8 * s, cy = hy + sy * Math.sin(a) * 3.8 * s;
      box(b, w, cx, cy, -2.2 * s, 7.4 * s, 0.18 * s, 2.6 * s, 0, 0, sx * sy * a);
      box(b, r, cx + sx * Math.cos(a) * 1.8 * s, cy + sy * Math.sin(a) * 1.8 * s + sy * 0.05 * s, -1.5 * s, 2.2 * s, 0.22 * s, 0.5 * s, 0, 0, sx * sy * a);
      const ex = sx * 1.45 * s, ey = sy * 0.75 * s;
      rod(b, gr, ex, ey, -4.6 * s, ex, ey, -0.4 * s, 0.5 * s, CYL8);
      rod(b, glow(0xff7a3a, 2.6), ex, ey, -4.7 * s, ex, ey, -4.55 * s, 0.4 * s, CYL8);
      const tx = hx + sx * Math.cos(a) * 7.5 * s, ty = hy + sy * Math.sin(a) * 7.5 * s;
      rod(b, gr, tx, ty, -3.2 * s, tx, ty, 4.5 * s, 0.14 * s, CYL8);
      rod(b, gr, tx, ty, -3.2 * s, tx, ty, 0.2 * s, 0.24 * s, CYL8);
    }
  }
}
export const xwing = (s = 1) => group((b) => xwingB(b, s), 'xwing');

export function falconB(b, s = 1) {
  {
    const g = 0xc3c5c2, g2 = 0x9ea1a2, dk = 0x55595c, red = 0x8a3a2a;
    rod(b, g, 0, -0.9 * s, 0, 0, 0.9 * s, 0, 9 * s, CYL20);
    rod(b, g2, 0, 0.9 * s, 0, 0, 1.45 * s, 0, 7.4 * s, CYL20);
    rod(b, g2, 0, -1.45 * s, 0, 0, -0.9 * s, 0, 7.4 * s, CYL20);
    rod(b, g, 0, 1.45 * s, 0, 0, 1.95 * s, 0, 2.6 * s, CYL);
    for (const sd of [-1, 1]) { box(b, g, sd * 2.6 * s, 0, 10.3 * s, 3.2 * s, 1.4 * s, 6.4 * s); box(b, g2, sd * 2.6 * s, 0.72 * s, 10.3 * s, 2.4 * s, 0.1 * s, 5 * s); }
    box(b, dk, 0, 0, 9 * s, 2.2 * s, 0.9 * s, 2.6 * s);
    rod(b, g, -5.2 * s, 0.3 * s, 5.8 * s, -8.2 * s, 0.3 * s, 10.6 * s, 0.9 * s, CYL);
    ball(b, g, -8.2 * s, 0.3 * s, 10.6 * s, 0.95 * s);
    ball(b, 0x1a2a3a, -8.45 * s, 0.45 * s, 11.0 * s, 0.62 * s);
    rod(b, dk, 3.8 * s, 1.4 * s, 3.2 * s, 3.8 * s, 2.3 * s, 3.2 * s, 0.22 * s, CYL8);
    put(b, SPH, g, 3.8 * s, 2.5 * s, 3.2 * s, 1.3 * s, 0.3 * s, 1.3 * s, 0.5, 0, 0);
    for (const sd of [-1, 1]) rod(b, dk, sd * 0.35 * s, 2.0 * s, 0, sd * 0.35 * s, 2.0 * s, 2.8 * s, 0.13 * s, CYL8);
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6 + 0.3;
      box(b, k % 4 === 1 ? red : k % 2 ? g2 : dk, Math.sin(a) * 5.4 * s, 1.47 * s, Math.cos(a) * 5.4 * s, 1.8 * s, 0.1 * s, 1.2 * s, 0, a, 0);
    }
    for (let k = -6; k <= 6; k++) {
      const a = Math.PI + k * 0.1;
      box(b, glow(0x7ad8ff, 3), Math.sin(a) * 9.02 * s, 0, Math.cos(a) * 9.02 * s, 0.9 * s, 0.9 * s, 0.3 * s, 0, a, 0);
    }
  }
}
export const falcon = (s = 1) => group((b) => falconB(b, s), 'falcon');

export function starDestroyer(s = 1) {
  const m = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, fog: false, emissive: e ? c : 0, emissiveIntensity: e });
  const g1 = m(0xb4b8bc), g2 = m(0x8e949a), gl = m(0x9ad8ff, 2.5);
  return group((b) => {
    const wedge = (w, L, y, h, mat) => {
      const sh = new THREE.Shape(); sh.moveTo(0, -L); sh.lineTo(w, L * 0.25); sh.lineTo(-w, L * 0.25); sh.closePath();
      const geo = indexed(new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2));
      geo.deleteAttribute('uv'); geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      b.add(geo, mat, 0, y, 0, 0, s, s, s);
    };
    wedge(40, 100, 0, 8, g1);
    wedge(30, 76, 8 * s, 6, g2);
    wedge(16, 40, 14 * s, 5, g1);
    box(b, g2, 0, 26 * s, -18 * s, 18 * s, 10 * s, 8 * s);
    box(b, g1, 0, 32 * s, -18 * s, 26 * s, 3 * s, 6 * s);
    for (const sd of [-1, 1]) ball(b, g1, sd * 8 * s, 36 * s, -18 * s, 2.6 * s);
    for (const x of [-18, 0, 18]) rod(b, gl, x * s, 8 * s, -25.2 * s, x * s, 8 * s, -25.6 * s, 5 * s, CYL);
  }, 'star-destroyer');
}

// AT-AT walker: returns { root, head, feet[4] {x, z, lift, phase}, step(dt, speed) }
export function atat(s = 1) {
  const g = 0xa6abb0, d = 0x70757a, dk = 0x3a3d40;
  const L1 = 7.4 * s, L2 = 7.4 * s, FH = 1.3 * s, H = L1 + L2 + FH - 0.9 * s;
  const root = new THREE.Group();
  const bodyP = new THREE.Group(); root.add(bodyP);
  bodyP.add(group((b) => {
    const y = H + 3.6 * s;
    box(b, g, 0, y, 0, 8 * s, 5.4 * s, 15 * s);
    for (const sd of [-1, 1]) box(b, g, sd * 2.4 * s, y + 3.1 * s, 0, 4.2 * s, 1.1 * s, 14.4 * s, 0, 0, -sd * 0.32);
    box(b, g, 0, y + 0.3 * s, 7.9 * s, 7.4 * s, 4.8 * s, 1.4 * s, -0.25, 0, 0);
    box(b, g, 0, y + 0.3 * s, -7.9 * s, 7.4 * s, 4.8 * s, 1.4 * s, 0.25, 0, 0);
    for (const sd of [-1, 1]) for (let z = -6; z <= 6; z += 2) box(b, d, sd * 4.02 * s, y, z * s, 0.1 * s, 4.4 * s, 0.35 * s);
    box(b, dk, 0, H + 0.9 * s, 0, 7 * s, 0.6 * s, 13 * s);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, d, sx * 3.7 * s, H + 1.2 * s, sz * 5.6 * s, 1.8 * s, 2.6 * s, 2.8 * s);
    rod(b, dk, 0, y, 7.5 * s, 0, y - 0.6 * s, 10.8 * s, 1.1 * s, CYL8);
    for (let k = 0; k < 3; k++) rod(b, d, 0, y - k * 0.2 * s, (8.4 + k) * s, 0, y - k * 0.2 * s - 0.1 * s, (8.7 + k) * s, 1.3 * s, CYL8);
  }, 'atat-body'));
  const head = group((b) => {
    box(b, g, 0, -0.2 * s, 3 * s, 4.4 * s, 3.6 * s, 5.4 * s);
    box(b, g, 0, -1.0 * s, 5.9 * s, 3.6 * s, 2.0 * s, 1.6 * s, 0.35, 0, 0);
    box(b, g, 0, 1.75 * s, 2.4 * s, 3.4 * s, 0.8 * s, 3.8 * s);
    for (const sd of [-1, 1]) {
      box(b, dk, sd * 1.1 * s, 0.7 * s, 5.72 * s, 1.3 * s, 0.4 * s, 0.1 * s);
      rod(b, dk, sd * 2.35 * s, -0.3 * s, 3 * s, sd * 2.35 * s, -0.3 * s, 6.8 * s, 0.26 * s, CYL8);
      rod(b, dk, sd * 0.9 * s, -2.05 * s, 4.2 * s, sd * 0.9 * s, -2.05 * s, 8.2 * s, 0.32 * s, CYL8);
      ball(b, glow(0xff3a2a, 2.5), sd * 0.9 * s, -2.05 * s, 8.25 * s, 0.22 * s);
    }
  }, 'atat-head');
  const headP = pivot(head, 0, H + 3.0 * s, 10.8 * s);
  bodyP.add(headP);
  const legs = [];
  for (const [sx, sz, ph] of [[1, 1, 0], [-1, -1, 0.25], [-1, 1, 0.5], [1, -1, 0.75]]) {
    const hip = pivot(null, sx * 3.7 * s, H, sz * 5.6 * s); root.add(hip);
    const upper = pivot(group((b) => {
      box(b, g, 0, -L1 / 2, 0, 1.7 * s, L1, 2.1 * s);
      box(b, d, 0, -L1 / 2, 1.07 * s, 0.8 * s, L1 * 0.7, 0.1 * s);
      box(b, d, 0, -L1, 0, 2.1 * s, 1.5 * s, 2.3 * s);
    }, 'atat-leg'), 0, 0, 0);
    hip.add(upper);
    const lower = pivot(group((b) => {
      box(b, g, 0, -L2 / 2, 0, 1.4 * s, L2, 1.7 * s);
      rod(b, dk, 0, -0.8 * s, -1.05 * s, 0, -L2 + 1 * s, -0.95 * s, 0.24 * s, CYL8);
    }, 'atat-shin'), 0, -L1, 0);
    upper.add(lower);
    const foot = pivot(group((b) => {
      rod(b, d, 0, 0, 0, 0, -0.6 * s, 0, 0.8 * s, CYL8);
      rod(b, g, 0, -0.55 * s, 0, 0, -FH, 0, 2.0 * s, CYL);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.785; box(b, dk, Math.sin(a) * 1.9 * s, -FH + 0.15 * s, Math.cos(a) * 1.9 * s, 0.8 * s, 0.3 * s, 0.8 * s, 0, a, 0); }
    }, 'atat-foot'), 0, -L2, 0);
    lower.add(foot);
    legs.push({ sx, sz, ph, upper, lower, foot, x: sx * 3.7 * s, z: sz * 5.6 * s, dz: 0, lift: 0, u: 0 });
  }
  let cyc = 0;
  const T = 2.8;
  return {
    root, bodyP, headP, legs, H, FH,
    step(dt, speed) {
      cyc += dt / T;
      const S = Math.max(1.6 * s, speed * T * 0.75);
      for (const L of legs) {
        const u = ((cyc + L.ph) % 1 + 1) % 1;
        L.u = u;
        let dz, lift;
        if (u < 0.75) { dz = S / 2 - (u / 0.75) * S; lift = 0; } else { const w = (u - 0.75) / 0.25; dz = -S / 2 + w * S; lift = Math.sin(w * Math.PI) * 2.4 * s; }
        L.dz = dz; L.lift = lift;
        const D = H - FH - lift;
        const dd = Math.min(Math.hypot(dz, D), L1 + L2 - 0.01);
        const al = Math.atan2(dz, D);
        const be = Math.acos(Math.min(1, (L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd)));
        const ga = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - dd * dd) / (2 * L1 * L2))));
        const th = al + be;
        L.upper.rotation.x = -th;
        L.lower.rotation.x = Math.PI - ga;
        L.foot.rotation.x = th - (Math.PI - ga);
      }
      bodyP.position.y = Math.sin(cyc * Math.PI * 4) * 0.25 * s;
    },
  };
}

export function snowspeederB(b, s = 1) {
  {
    const w = 0xe8e8e8, o = C.orange;
    box(b, w, 0, 0, -0.5 * s, 3.4 * s, 0.9 * s, 4.4 * s);
    box(b, w, 0, -0.1 * s, 2.5 * s, 3.0 * s, 0.6 * s, 2.2 * s, 0.18, 0, 0);
    box(b, 0x1a2a3a, 0, 0.6 * s, 0.6 * s, 1.4 * s, 0.5 * s, 1.4 * s);
    for (const sd of [-1, 1]) {
      box(b, o, sd * 1.1 * s, 0.47 * s, -0.4 * s, 0.5 * s, 0.05 * s, 3.8 * s);
      rod(b, 0x9a9da0, sd * 2.0 * s, -0.1 * s, -3.2 * s, sd * 2.0 * s, -0.1 * s, 0.6 * s, 0.45 * s, CYL8);
      rod(b, glow(0xff9a3a, 2), sd * 2.0 * s, -0.1 * s, -3.3 * s, sd * 2.0 * s, -0.1 * s, -3.15 * s, 0.35 * s, CYL8);
      box(b, w, sd * 1.4 * s, 0.1 * s, -2.9 * s, 0.6 * s, 0.1 * s, 0.9 * s, 0, 0, sd * 0.6);
    }
  }
}
export const snowspeeder = (s = 1) => group((b) => snowspeederB(b, s), 'snowspeeder');

// Darth Maul holding his double-bladed saber, tilted so one blade sweeps the road.
export function maul(s = 2.4, L = 10) {
  const root = new THREE.Group();
  const hy = 1.72 * s, hz = 0.8 * s, tilt = Math.asin((hy - 0.8) / L);
  root.add(group((b) => {
    fig(b, s, { legs: 0x151515, hips: 0x151515, torso: 0x1b1b1b, face: FACES.maul(), neck: 0xb3141c, noArms: true, noStud: true });
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; put(b, CONE, 0xe8dcc0, Math.sin(a) * 0.26 * s, 3.25 * s, Math.cos(a) * 0.26 * s, 0.055 * s, (k % 2 ? 0.18 : 0.26) * s, 0.055 * s); }
    put(b, CONE, 0xe8dcc0, 0, 3.28 * s, 0, 0.07 * s, 0.3 * s, 0.07 * s);
    box(b, 0x101010, 0, 0.55 * s, 0, 1.12 * s, 1.1 * s, 0.64 * s);
    box(b, 0x3a2a1a, 0, 1.25 * s, 0, 1.08 * s, 0.12 * s, 0.58 * s);
    for (const sd of [-1, 1]) {
      rod(b, 0x151515, sd * 0.56 * s, 2.3 * s, 0, sd * 0.42 * s, hy + 0.05 * s, hz - 0.1 * s, 0.3 * s, BOX, 0.3 * s);
      ball(b, 0x101010, sd * 0.4 * s, hy, hz, 0.15 * s);
    }
    const dx = Math.cos(tilt), dy = -Math.sin(tilt);
    rod(b, metal(0x303338, 0.3), -dx * 1.0 * s, hy - dy * 1.0 * s, hz, dx * 1.0 * s, hy + dy * 1.0 * s, hz, 0.1 * s, CYL8);
    for (const sd of [-1, 1]) {
      rod(b, SABER_RED(), sd * dx * 1.0 * s, hy + sd * dy * 1.0 * s, hz, sd * dx * L, hy + sd * dy * L, hz, 0.36, CYL8);
      rod(b, SABER_CORE(), sd * dx * 1.0 * s, hy + sd * dy * 1.0 * s, hz, sd * dx * (L - 0.3), hy + sd * dy * (L - 0.3), hz, 0.17, CYL8);
    }
  }, 'maul'));
  root.userData.saber = { hy, hz, tilt, L };
  return root;
}

export function cadBane(s = 2.6) {
  const root = new THREE.Group();
  const coat = 0x7a5a3a, hat = 0x4a3020;
  root.add(group((b) => {
    fig(b, s, { legs: 0x4a4038, hips: 0x4a4038, torso: 0x6b2e22, face: FACES.bane(), neck: 0x3a68aa, noArms: true, noStud: true });
    box(b, coat, 0, 0.3 * s, -0.05 * s, 1.2 * s, 0.95 * s, 0.66 * s);
    for (const sd of [-1, 1]) box(b, coat, sd * 0.42 * s, 1.25 * s, 0.02 * s, 0.3 * s, 1.15 * s, 0.6 * s);
    box(b, coat, 0, 2.2 * s, -0.2 * s, 1.0 * s, 0.55 * s, 0.25 * s);
    rod(b, hat, 0, 3.12 * s, 0, 0, 3.2 * s, 0, 1.2 * s, CYL20);
    rod(b, hat, 0, 3.15 * s, 0, 0, 3.62 * s, 0, 0.46 * s, CYL);
    rod(b, 0x2a1a10, 0, 3.2 * s, 0, 0, 3.3 * s, 0, 0.48 * s, CYL);
    for (const sd of [-1, 1]) rod(b, 0x9a9a9a, sd * 0.36 * s, 2.78 * s, 0.1 * s, sd * 0.18 * s, 2.64 * s, 0.34 * s, 0.05 * s, CYL8);
    box(b, 0x2a2a2a, 0.3 * s, 1.0 * s, 0.1 * s, 0.2 * s, 0.4 * s, 0.3 * s);
  }, 'bane'));
  const arms = group((b) => {
    for (const sd of [-1, 1]) {
      rod(b, coat, sd * 0.56 * s, 0.05 * s, 0, sd * 0.42 * s, -0.1 * s, 0.95 * s, 0.3 * s, BOX, 0.3 * s);
      ball(b, 0x3a68aa, sd * 0.42 * s, -0.12 * s, 1.05 * s, 0.14 * s);
      box(b, 0x2a2a2a, sd * 0.42 * s, 0.0, 1.35 * s, 0.16 * s, 0.24 * s, 0.7 * s);
      rod(b, 0x5a5a5a, sd * 0.42 * s, 0.05 * s, 1.6 * s, sd * 0.42 * s, 0.05 * s, 2.0 * s, 0.05 * s, CYL8);
    }
  }, 'bane-arms');
  const ap = pivot(arms, 0, 2.3 * s, 0);
  root.add(ap);
  root.userData.arms = ap;
  root.userData.muzzle = new THREE.Vector3(0, 2.35 * s, 2.0 * s);
  return root;
}

export function mando(s = 2.6) {
  const root = new THREE.Group();
  const bes = metal(SW.beskar, 0.22), cape = 0x5a3a24;
  root.add(group((b) => {
    fig(b, s, { legs: 0x6a6258, hips: 0x4a3a2a, torso: bes, neck: 0x3a3a3a, noArms: true, noStud: true });
    for (const sd of [-1, 1]) {
      arm(b, s, sd, 0x6a6258, 0x3a2a1a, sd * 0.56 * s, 2.3 * s, 0, 0.15);
      box(b, bes, sd * 0.25 * s, 0.35 * s, 0.32 * s, 0.4 * s, 0.5 * s, 0.06 * s);
      box(b, bes, sd * 0.58 * s, 2.3 * s, 0, 0.42 * s, 0.18 * s, 0.6 * s, 0, 0, -sd * 0.3);
    }
    box(b, cape, 0, 0.7 * s, -0.34 * s, 1.35 * s, 1.75 * s, 0.07 * s);
    box(b, cape, 0, 2.35 * s, -0.1 * s, 1.25 * s, 0.15 * s, 0.6 * s);
    box(b, bes, 0, 1.9 * s, -0.42 * s, 0.7 * s, 0.7 * s, 0.22 * s);
    rod(b, 0x3a3a3a, -0.5 * s, 1.0 * s, -0.5 * s, 0.4 * s, 2.9 * s, -0.5 * s, 0.07 * s, CYL8);
    box(b, 0x2a2a2a, 0.55 * s, 0.95 * s, 0.1 * s, 0.14 * s, 0.4 * s, 0.25 * s);
  }, 'mando'));
  const helm = group((b) => {
    rod(b, bes, 0, 0, 0, 0, 0.62 * s, 0, 0.43 * s, CYL20);
    put(b, HEMI, bes, 0, 0.62 * s, 0, 0.43 * s, 0.28 * s, 0.43 * s);
    box(b, 0x0c0c0c, 0, 0.44 * s, 0.4 * s, 0.62 * s, 0.13 * s, 0.1 * s);
    box(b, 0x0c0c0c, 0, 0.22 * s, 0.4 * s, 0.14 * s, 0.34 * s, 0.1 * s);
    rod(b, bes, 0.46 * s, 0.35 * s, 0, 0.46 * s, 0.35 * s, 0.25 * s, 0.07 * s, CYL8);
  }, 'mando-helm');
  const hp = pivot(helm, 0, 2.55 * s, 0);
  root.add(hp);
  root.userData.anim = (t) => { hp.rotation.y = Math.sin(t * 0.5) * 0.5; };
  return root;
}

// ---- Chewbacca and Grogu: heads and prints shared with the drivers ----------------------
// The drivers (../drivers/starwars.js) build their heads with these functions, in their own
// units; the track figures below build the very same heads and scale them up.
// m4 composes like the drivers' mat4 (XYZ order); ym4 applies the yaw last, so `pitch` tilts
// in the yawed frame (pieces set round a head).
const _ke = new THREE.Euler(), _kq = new THREE.Quaternion(), _kp = new THREE.Vector3(), _ks = new THREE.Vector3();
const m4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(_kp.set(x, y, z), _kq.setFromEuler(_ke.set(rx, ry, rz, 'XYZ')), _ks.set(sx, sy, sz));
const ym4 = (x, y, z, yaw, pitch, sx, sy, sz, roll = 0) => new THREE.Matrix4().compose(_kp.set(x, y, z), _kq.setFromEuler(_ke.set(pitch, yaw, roll, 'YXZ')), _ks.set(sx, sy, sz));
const rbox = (b, x, y, z, sx, sy, sz, rx, ry, rz, col, opts) => b.boxM(m4(x, y, z, rx, ry, rz, sx, sy, sz), col, opts);
const SPH18 = new THREE.SphereGeometry(1, 18, 12);
const HEAD20 = new THREE.CylinderGeometry(1, 1, 1, 20).translate(0, 0.5, 0);
// merge what fn builds into b under the transform M (stamp() with a full matrix)
function stampM(b, fn, M) {
  const tmp = new BrickBuilder(1);
  fn(tmp);
  for (const c of tmp.chunks.values()) for (const [mat, geos] of c) for (const g of geos) { g.applyMatrix4(M); b.bucket(mat, M.elements[12], M.elements[14]).push(g); }
  tmp.chunks.clear();
}
// high-resolution canvas prints (as the drivers' prints)
const _hi = new Map();
function hiPrint(key, w, h, base, draw) {
  let m = _hi.get(key);
  if (m) return m;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 });
  _hi.set(key, m);
  return m;
}
// a head print in world units on a head cylinder of radius R and height Hc (front centre at
// x = 0, y = height above the bottom)
const hiHead = (key, R, Hc, base, draw) => hiPrint(key, 512, 256, base, (g, w, h) => {
  g.setTransform(w / (2 * Math.PI * R), 0, 0, -h / Hc, w / 2, h); draw(g); g.setTransform(1, 0, 0, 1, 0, 0);
});

// Chewbacca: layered shaggy fur in dark, mid and light browns, deep-set blue eyes under a heavy
// brow, a big black nose on a lighter muzzle, fangs, and a jaw that drops when he roars.
export const CHEWIE = { fur: 0x6a4a2c, dark: 0x46301a, light: 0x8a6440, mid: 0x58391f };
// the driver's head (seatedFig dims); the figure scales this same head up
export const CHEWIE_HEAD = { headR: 0.33 * 1.6, headH: 0.56 * 1.6 };
// a flat, pointed tuft of fur hanging down (and flaring out by `flare`) at yaw `a`
export const tuft = (b, x, y, z, a, w, h, col, flare = 0.35, roll = 0) => b.addMatrix(CONE, plastic(col), ym4(x, y, z, a, Math.PI - flare, w, h, w * 0.32, roll));
// deterministic scatter for fur
export const furRng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const FUR_COLS = ['#46301a', '#8a6440', '#5a3e24', '#a07a4e', '#3a2614', '#7a5634'];
// rows of little downward fur strokes over x0..x1, y0..y1 (print units), r = furRng(seed)
export function furStrokes(g, r, x0, x1, y0, y1, step = 0.05, len = 0.09, w = 0.016) {
  for (let y = y1 + 0.03, row = 0; y > y0 - 0.02; y -= step * 0.8, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
      const xx = x + (r() - 0.5) * step * 0.6, yy = y + (r() - 0.5) * step * 0.4, L = len * (0.7 + r() * 0.6);
      curve(g, FUR_COLS[Math.floor(r() * FUR_COLS.length)], w, [xx - w * 0.6, yy], [xx + w * 0.8, yy - L * 0.5], [xx - w * 0.2, yy - L]);
    }
  }
}
// the face print for the head cylinder of CHEWIE_HEAD
export const chewieFace = () => hiHead('chewie-hi', CHEWIE_HEAD.headR, CHEWIE_HEAD.headH, '#6a4a2c', (g) => {
  furStrokes(g, furRng(23), -1.7, 1.7, 0, CHEWIE_HEAD.headH, 0.05, 0.09, 0.016);
  // the lighter muzzle and cheeks
  ell(g, 0, 0.3, 0.24, 0.2, '#9c7a52');
  furStrokes(g, furRng(29), -0.2, 0.2, 0.16, 0.42, 0.04, 0.06, 0.013);
  ell(g, 0, 0.29, 0.17, 0.13, '#a8865c');
  for (const sd of [-1, 1]) {
    // deep-set blue eyes under a heavy furry brow
    ell(g, sd * 0.14, 0.555, 0.09, 0.062, '#2a1a0c');
    ell(g, sd * 0.14, 0.552, 0.052, 0.042, '#3f86d8');
    ell(g, sd * 0.14, 0.55, 0.024, 0.024, '#0a0a14');
    ell(g, sd * 0.14 - 0.018, 0.566, 0.013, 0.012, '#fff');
    poly(g, '#3a2614', [[sd * 0.03, 0.6], [sd * 0.24, 0.62], [sd * 0.25, 0.68], [sd * 0.04, 0.655]]);
  }
});
// the fur on the head (over the printed cylinder), muzzle, nose, upper fangs and the dark mouth
// that shows when the jaw drops; d = { headR, headH }, base of the head at y = 0
export function chewieHead(hb, d) {
  const R = d.headR, H = d.headH, { fur: FUR, dark: FUR_D, light: FUR_L, mid: FUR_X } = CHEWIE;
  hb.sphere(0, H * 0.93, -R * 0.04, R * 1.1, FUR, { sy: 0.52 });
  // layered tufts of fur round the head, skipping the face; the lowest rows hang over the shoulders
  const cols = [FUR_D, FUR, FUR_L, FUR_X];
  const rows = [[H * 1.06, 0.0, 14, 0.82, 0.95], [H * 0.82, 0.62, 14, 1.02, 0.3], [H * 0.58, 0.8, 14, 1.06, 0.3], [H * 0.34, 0.86, 14, 1.1, 0.32], [H * 0.1, 0.84, 14, 1.14, 0.38]];
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; tuft(hb, Math.sin(a) * R * 0.42, H * 1.2, Math.cos(a) * R * 0.42, a, R * 0.26, H * 0.3, [FUR, FUR_X, FUR_L][k % 3], 1.25); }   // crown
  rows.forEach(([y, skip, n, rr, flare], row) => {
    for (let k = 0; k < n; k++) {
      const a = (k + (row % 2) * 0.5) / n * Math.PI * 2, aa = Math.atan2(Math.sin(a), Math.cos(a));
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
  hb.addMatrix(SPH18, plastic(0xa8865c), m4(0, H * 0.36, R * 0.84, 0, 0, 0, R * 0.42, H * 0.11, R * 0.26));
  hb.addMatrix(SPH18, plastic(0x161010, { rough: 0.2 }), m4(0, H * 0.43, R * 1.04, 0, 0, 0, R * 0.2, H * 0.06, R * 0.12));
  rbox(hb, 0, H * 0.25, R * 0.8, R * 0.72, H * 0.14, R * 0.32, 0, 0, 0, 0x3a0c0a);
  rbox(hb, 0, H * 0.3, R * 0.9, R * 0.5, H * 0.03, R * 0.14, 0, 0, 0, 0xf0ead8);
  for (const sd of [-1, 1]) hb.addMatrix(CONE, plastic(0xf4eedc), m4(sd * R * 0.22, H * 0.26, R * 0.95, Math.PI, 0, 0, R * 0.05, H * 0.09, R * 0.05));   // fangs
}
// the lower jaw, built round its hinge, which sits at chewieJawAt(d) on the head
export const chewieJawAt = (d) => [0, d.headH * 0.3, d.headR * 0.25];
export function chewieJaw(jb, d) {
  const R = d.headR, H = d.headH;
  jb.addMatrix(SPH18, plastic(0x9c7a52), m4(0, -H * 0.08, R * 0.55, 0, 0, 0, R * 0.48, H * 0.11, R * 0.34));
  rbox(jb, 0, -H * 0.02, R * 0.74, R * 0.66, H * 0.05, R * 0.14, 0, 0, 0, 0xf0ead8);   // teeth
  for (const sd of [-1, 1]) jb.addMatrix(CONE, plastic(0xf4eedc), m4(sd * R * 0.24, H * 0.02, R * 0.78, 0, 0, 0, R * 0.05, H * 0.08, R * 0.05));
}

// Grogu: a big moulded head (a broad brow over a narrower chin), big glossy black eyes with
// highlights, huge pink-lined ears straight out to the sides, a little nose and mouth.
export const GROGU = { skin: 0x86ad68, robe: 0xb39566, collar: 0xc4a678, crossover: 0x9a7e54 };
// the head in the driver's units (about 0.6 across the brow), its base (the neck) at y = 0
export function groguHead(hb) {
  const sk = plastic(GROGU.skin);
  hb.addMatrix(SPH18, sk, m4(0, 0.29, 0, 0, 0, 0, 0.31, 0.27, 0.28));   // a broad brow
  hb.addMatrix(SPH18, sk, m4(0, 0.17, 0.04, 0, 0, 0, 0.23, 0.17, 0.22));   // cheeks and chin
  for (const sd of [-1, 1]) hb.addMatrix(SPH18, sk, m4(sd * 0.11, 0.35, 0.19, 0, 0, sd * 0.05, 0.12, 0.05, 0.09));   // brow ridge
  // big glossy black eyes with highlights
  const eyeM = plastic(0x0b0806, { rough: 0.06 }), glint = glow(0xffffff, 0.7);
  for (const sd of [-1, 1]) {
    hb.addMatrix(SPH18, eyeM, m4(sd * 0.115, 0.255, 0.212, 0, sd * 0.42, 0, 0.088, 0.078, 0.065));
    hb.addMatrix(SPH18, glint, m4(sd * 0.115 - 0.028, 0.285, 0.262 + sd * 0.012, 0, 0, 0, 0.02, 0.02, 0.012));
    hb.addMatrix(SPH18, glint, m4(sd * 0.115 + 0.022, 0.228, 0.27 - sd * 0.01, 0, 0, 0, 0.009, 0.009, 0.008));
  }
  hb.addMatrix(SPH18, sk, m4(0, 0.19, 0.255, 0, 0, 0, 0.04, 0.028, 0.03));   // little nose
  for (const sd of [-1, 1]) hb.sphere(sd * 0.014, 0.182, 0.282, 0.008, 0x2e4a24);
  rbox(hb, 0, 0.115, 0.245, 0.07, 0.012, 0.012, 0, 0, 0, 0x4e6e3e);   // mouth
  // the huge ears, straight out to the sides, pink inside
  for (const sd of [-1, 1]) {
    const rz = -sd * (Math.PI / 2 - 0.14), ry = sd * 0.28;
    hb.addMatrix(CONE, plastic(0x96bc7a), m4(sd * 0.6, 0.32, -0.05, 0, ry, rz, 0.18, 0.72, 0.055));
    hb.addMatrix(CONE, plastic(0xe6a8a2), m4(sd * 0.57, 0.32, -0.02, 0, ry, rz, 0.115, 0.56, 0.035));
  }
}
// the big rolled collar, and a sleeve that widens towards the shoulder (base at y = 0)
const ROLL = new THREE.TorusGeometry(1, 0.4, 8, 22);
const SLEEVE = (() => {
  const g = new THREE.BoxGeometry(0.12, 0.26, 0.14), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 1.25);
  g.computeVertexNormals(); g.translate(0, 0.13, 0);
  return g;
})();

// Grogu floating in his hover-pram: his robe and big rolled collar sit in the pram, his little
// hands on its rim; the head (the driver's, scaled up) tilts and turns on its own pivot.
export function grogu(s = 2.6) {
  const root = new THREE.Group();
  const { skin, robe, collar, crossover } = GROGU, u = 1.15 * s, ny = 0.47 * u;   // u: driver units; ny: the neck, above the rim
  const pram = group((b) => {
    put(b, HEMI, metal(0xd8dadc, 0.25), 0, 0, 0, 0.8 * s, 0.55 * s, 0.8 * s, Math.PI, 0, 0);
    rod(b, 0xa0a4a8, 0, -0.02 * s, 0, 0, 0.04 * s, 0, 0.82 * s, CYL20);
    ball(b, glow(0x9ad8ff, 1.5), 0, -0.55 * s, 0, 0.2 * s);
    ball(b, 0xc8b08a, 0, -0.04 * s, 0, 0.5 * s, 0.24);   // the blanket
    // the robe, its crossover and the collar rolled round the neck (the driver's, in units of u)
    rod(b, robe, 0, ny - 0.62 * u, 0, 0, ny - 0.22 * u, 0, 0.25 * u, CYL);
    for (const sd of [-1, 1]) box(b, crossover, sd * 0.07 * u, ny - 0.26 * u, 0.245 * u, 0.03 * u, 0.3 * u, 0.02 * u, 0, 0, sd * 0.3);
    b.addMatrix(ROLL, plastic(collar), m4(0, ny - 0.06 * u, 0, Math.PI / 2, 0, 0, 0.27 * u, 0.27 * u, 0.3 * u));
    // little arms in big sleeves, reaching forward over the blanket
    for (const sd of [-1, 1]) {
      const M = m4(sd * 0.22 * u, ny - 0.09 * u, 0.05 * u, -1.05, 0, -sd * 0.12);
      stampM(b, (ab) => {
        ab.sphere(0, 0, 0, 0.08 * u, robe);
        ab.add(SLEEVE, plastic(robe), 0, -0.28 * u, 0, 0, u, u, u);
        ab.sphere(0, -0.31 * u, 0, 0.065 * u, skin);
      }, M);
    }
  }, 'pram');
  root.add(pram);
  const head = group((b) => stampM(b, groguHead, m4(0, 0, 0, 0, 0, 0, u, u, u)), 'grogu');
  const hp = pivot(head, 0, ny, 0);
  root.add(hp);
  root.userData.anim = (t) => { root.position.y = (root.userData.baseY ?? 0) + Math.sin(t * 1.6) * 0.3; hp.rotation.z = Math.sin(t * 0.7) * 0.25; hp.rotation.y = Math.sin(t * 0.4) * 0.5; };
  return root;
}

export function vader(s = 3.2) {
  const root = new THREE.Group();
  root.add(group((b) => {
    fig(b, s, { legs: 0x141414, hips: 0x141414, torso: 0x1a1a1a, face: FACES.vader(), neck: 0x141414, noArms: true, noStud: true, headR: 0.4 });
    put(b, HEMI, 0x101010, 0, 2.56 * s + 0.62 * s, 0, 0.46 * s, 0.36 * s, 0.46 * s);
    put(b, CONE, 0x101010, 0, 2.95 * s, -0.08 * s, 0.56 * s, 0.6 * s, 0.56 * s);
    box(b, 0x2a2a2a, 0, 1.9 * s, 0.27 * s, 0.38 * s, 0.3 * s, 0.06 * s);
    box(b, glow(0xff2020, 2.5), -0.1 * s, 1.95 * s, 0.31 * s, 0.07 * s, 0.07 * s, 0.03 * s);
    box(b, glow(0x20ff40, 2.5), 0.02 * s, 1.95 * s, 0.31 * s, 0.07 * s, 0.07 * s, 0.03 * s);
    box(b, glow(0x3ab0ff, 2.5), 0.12 * s, 1.95 * s, 0.31 * s, 0.07 * s, 0.07 * s, 0.03 * s);
    box(b, metal(0x9aa0a8, 0.3), 0, 1.2 * s, 0, 1.08 * s, 0.16 * s, 0.6 * s);
    box(b, 0x0c0c0c, 0, 0.05 * s, -0.36 * s, 1.7 * s, 2.35 * s, 0.08 * s);
    box(b, 0x0c0c0c, 0, 2.38 * s, -0.08 * s, 1.3 * s, 0.14 * s, 0.7 * s);
    arm(b, s, 1, 0x141414, 0x141414, 0.56 * s, 2.3 * s, 0, 0.2);
  }, 'vader'));
  const armR = group((b) => {
    const [ex, ey, ez] = arm(b, s, -1, 0x141414, 0x141414, 0, 0, 0, 0.1, 0.02);
    rod(b, metal(0x9aa0a8, 0.3), ex, ey - 0.5 * s, ez, ex, ey + 0.4 * s, ez, 0.09 * s, CYL8);
    rod(b, SABER_RED(), ex, ey + 0.4 * s, ez, ex, ey + 3.8 * s, ez, 0.12 * s, CYL8);
    rod(b, SABER_CORE(), ex, ey + 0.4 * s, ez, ex, ey + 3.7 * s, ez, 0.06 * s, CYL8);
  }, 'vader-arm');
  const ap = pivot(armR, -0.56 * s, 2.3 * s, 0);
  root.add(ap);
  root.userData.anim = (t) => { const w = Math.sin(t * 1.4); ap.rotation.x = -1.2 - w * 0.8; ap.rotation.z = -0.2 + w * 0.3; };
  return root;
}

// Stormtrooper, as the LEGO minifig: the moulded helmet (a dome overhanging the back and sides,
// a black brow band, big angular lenses with grey tear marks, the faceplate jutting out below
// the frown with its grille and breathers, ear caps, a skirt flaring out at the bottom), white
// armour printed on a white torso and legs, black C-hands and a black E-11.
const TW = 0xf4f4f4, TB = 0x161618, TG = 0x8c9198;
const TR = { white: '#f4f4f4', black: '#161618', grey: '#8c9198', lgrey: '#b9bdc3', dgrey: '#6a6f76' };
// helmet layout in head radii, measured from the helmet's base: the printed face drum (wider at
// the bottom) and the outline of the faceplate under the frown (half width w, rising from
// `edge` at its sides to `top` under the nose)
const TRH = { yb: -0.06, yt: 1.2, r0: 1.1, r1: 1.0, w: 0.74, top: 0.56, edge: 0.26 };
const trFaceR = (y) => TRH.r0 + (TRH.r1 - TRH.r0) * (y - TRH.yb) / (TRH.yt - TRH.yb);
const snoutTop = (x) => TRH.top - (TRH.top - TRH.edge) * Math.pow(Math.min(1, Math.abs(x) / TRH.w), 0.85);
const snoutZ = (x, y) => Math.sqrt(Math.max(0, 1.12 * 1.12 - x * x)) + 0.02 + 0.2 * (TRH.top - y) / (TRH.top - TRH.yb);
const snoutBack = (x) => Math.sqrt(Math.max(0, 0.94 * 0.94 - x * x));
const SNOUT_TILT = Math.atan(0.2 / (TRH.top - TRH.yb));
// the faceplate below the frown: a curved shell whose top edge rises to a point under the nose
// and whose front juts further out towards the chin. Returns [white shell, black top edge].
function snoutGeos() {
  const NX = 14, NY = 4, xs = [...Array(NX + 1)].map((_, i) => -TRH.w + 2 * TRH.w * i / NX);
  const shell = { p: [], i: [] }, rim = { p: [], i: [] };
  const quad = (o, a, b, c, d) => { const n = o.p.length / 3; o.p.push(...a, ...b, ...c, ...d); o.i.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  const F = (x, y) => [x, y, snoutZ(x, y)], K = (x, y) => [x, y, snoutBack(x)], Yj = (x, j) => TRH.yb + (snoutTop(x) - TRH.yb) * j / NY;
  for (const x of xs) for (let j = 0; j <= NY; j++) shell.p.push(...F(x, Yj(x, j)));   // the front: one smooth grid
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const a = i * (NY + 1) + j, c = a + NY + 1; shell.i.push(a, c, c + 1, a, c + 1, a + 1); }
  for (let i = 0; i < NX; i++) {
    const x0 = xs[i], x1 = xs[i + 1], t0 = snoutTop(x0), t1 = snoutTop(x1);
    quad(rim, F(x0, t0), F(x1, t1), K(x1, t1), K(x0, t0));                               // top edge: the frown line
    quad(shell, K(x0, TRH.yb), K(x1, TRH.yb), F(x1, TRH.yb), F(x0, TRH.yb));             // underside
  }
  for (let j = 0; j < NY; j++) {
    const l = xs[0], r = xs[NX];
    quad(shell, F(l, Yj(l, j)), F(l, Yj(l, j + 1)), K(l, Yj(l, j + 1)), K(l, Yj(l, j)));
    quad(shell, K(r, Yj(r, j)), K(r, Yj(r, j + 1)), F(r, Yj(r, j + 1)), F(r, Yj(r, j)));
  }
  return [shell, rim].map(({ p, i }) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3 * 2), 2));
    g.setIndex(i); g.computeVertexNormals();
    return g;
  });
}
const [SNOUT, SNOUT_RIM] = snoutGeos();
const TRFACE = new THREE.CylinderGeometry(TRH.r1, TRH.r0, 1, 32).translate(0, 0.5, 0);
const TRSKIRT = new THREE.CylinderGeometry(1.07, 1.2, 1, 28, 1, true, Math.PI * 0.4, Math.PI * 1.2).translate(0, 0.5, 0);
const TRDOME = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const TRBAND = new THREE.CylinderGeometry(1.095, 1.095, 1, 6, 1, true, Math.PI * 0.4, Math.PI * 0.1).translate(0, 0.5, 0);

function trooperTorso(g, T, k) {
  const Y = (f) => f * T, hw = (f) => 0.5 - 0.5 * (1 - k) * f;
  // black undersuit showing at the armpits, grey collar and chest plate outlines
  for (const sd of [-1, 1]) line(g, TR.black, 0.024, [[sd * (hw(0.97) - 0.07), Y(0.97)], [sd * (hw(0.62) - 0.08), Y(0.62)]]);
  curve(g, TR.grey, 0.022, [-0.14, Y(1.0)], [0, Y(0.88)], [0.14, Y(1.0)]);
  for (const sd of [-1, 1]) line(g, TR.grey, 0.02, [[sd * 0.13, Y(0.93)], [sd * 0.28, Y(0.84)]]);
  const plate = [[-0.34, 0.84], [-0.27, 0.71], [-0.09, 0.71], [0, 0.77], [0.09, 0.71], [0.27, 0.71], [0.34, 0.84]].map(([x, f]) => [x, Y(f)]);
  line(g, TR.dgrey, 0.055, plate);
  line(g, TR.lgrey, 0.032, plate);
  // the black arch over the abdomen, grey ribs under it and the little control box
  curve(g, TR.black, 0.024, [-0.47, Y(0.39)], [0, Y(0.53)], [0.47, Y(0.39)]);
  for (let x = -0.38; x < 0.4; x += 0.076) if (Math.abs(x) > 0.1) line(g, TR.lgrey, 0.026, [[x, Y(0.33)], [x, Y(0.41 + 0.05 * (1 - (x / 0.47) ** 2))]]);
  g.fillStyle = TR.lgrey; g.fillRect(-0.075, Y(0.325), 0.15, Y(0.12));
  g.fillStyle = TR.black;
  for (const x of [-0.04, 0.015]) g.fillRect(x, Y(0.38), 0.025, Y(0.04));
  // the belt: a black line over a row of eight pouches
  line(g, TR.black, 0.024, [[-0.5, Y(0.3)], [0.5, Y(0.3)]]);
  for (let i = 0; i < 8; i++) {
    const x = -0.46 + i * 0.115 + 0.008, y = Y(0.07), h = Y(0.21);
    g.fillStyle = TR.dgrey; g.fillRect(x, y, 0.099, h);
    g.fillStyle = TR.white; g.fillRect(x + 0.012, y + 0.012, 0.075, h - 0.024);
    g.fillStyle = '#d3d6da'; g.fillRect(x + 0.012, y + 0.012, 0.024, h - 0.024);
  }
}
function trooperBack(g, T, k) {
  const Y = (f) => f * T, hw = (f) => 0.5 - 0.5 * (1 - k) * f;
  for (const sd of [-1, 1]) line(g, TR.black, 0.024, [[sd * (hw(0.97) - 0.07), Y(0.97)], [sd * (hw(0.62) - 0.08), Y(0.62)]]);
  // the back plate's outline, the belt and the bottom edge of the kidney plate
  g.strokeStyle = TR.grey; g.lineWidth = 0.026; g.beginPath(); g.rect(-0.27, Y(0.42), 0.54, Y(0.48)); g.stroke();
  line(g, TR.lgrey, 0.02, [[-0.2, Y(0.66)], [0.2, Y(0.66)]]);
  line(g, TR.black, 0.024, [[-0.5, Y(0.3)], [0.5, Y(0.3)]]);
  line(g, TR.grey, 0.02, [[-0.46, Y(0.14)], [0.46, Y(0.14)]]);
}
// a standing leg's front (x across, inner edge at +0.5; y up from the sole) and a seated
// driver's thigh top (y from the knee back to the hip)
function trooperLeg(g, T) {
  const Y = (f) => f * T;
  poly(g, TR.black, [[0.06, Y(1.01)], [0.51, Y(1.01)], [0.51, Y(0.84)]]);                 // hip gap
  g.fillStyle = TR.lgrey; g.fillRect(-0.44, Y(0.74), 0.74, Y(0.09));                      // ribbed thigh band
  for (let x = -0.4; x < 0.3; x += 0.08) line(g, TR.grey, 0.026, [[x, Y(0.745)], [x, Y(0.825)]]);
  line(g, TR.grey, 0.03, [[0.37, Y(0.72)], [0.37, Y(0.6)]]);
  poly(g, TR.black, [[-0.5, Y(0.62)], [-0.26, Y(0.55)], [0.26, Y(0.55)], [0.5, Y(0.62)], [0.5, Y(0.57)], [0.3, Y(0.51)], [-0.3, Y(0.51)], [-0.5, Y(0.57)]]);   // knee
  line(g, TR.grey, 0.03, [[-0.46, Y(0.67)], [-0.24, Y(0.6)], [0.24, Y(0.6)], [0.46, Y(0.67)]]);
  line(g, TR.grey, 0.03, [[-0.38, Y(0.46)], [-0.36, Y(0.2)], [0.36, Y(0.2)], [0.38, Y(0.46)]]);   // shin plate
}
function trooperThigh(g, T) {
  poly(g, TR.black, [[0.06, T + 0.01], [0.51, T + 0.01], [0.51, T - 0.32]]);
  g.fillStyle = TR.lgrey; g.fillRect(-0.44, T - 0.75, 0.74, 0.2);
  for (let x = -0.4; x < 0.3; x += 0.08) line(g, TR.grey, 0.026, [[x, T - 0.74], [x, T - 0.56]]);
  poly(g, TR.black, [[-0.5, 0.2], [-0.26, 0.1], [0.26, 0.1], [0.5, 0.2], [0.5, 0.13], [0.3, 0.03], [-0.3, 0.03], [-0.5, 0.13]]);   // knee
  line(g, TR.grey, 0.03, [[-0.46, 0.3], [-0.24, 0.19], [0.24, 0.19], [0.46, 0.3]]);
}
export const trooperPrints = () => atlas('trooper', 1, TR.white, (g, rg) => {
  // helmet wrap: u = angle round from the front, v = height above the helmet base (head radii)
  inRegion(g, rg.head, -Math.PI, Math.PI, TRH.yb, TRH.yt, () => {
    poly(g, TR.black, [[-1.5, 1.03], [1.5, 1.03], [1.5, 1.21], [-1.5, 1.21]]);             // brow band
    for (const sd of [-1, 1]) {
      const P = (pts) => pts.map(([x, y]) => [sd * x, y]);
      // the lenses: big and angular, dropping away at the outer corners
      const gr = g.createLinearGradient(0, 1.04, 0, 0.68);
      gr.addColorStop(0, '#08090b'); gr.addColorStop(0.6, '#15171a'); gr.addColorStop(1, '#3c4148');
      g.fillStyle = gr; g.beginPath();
      P([[0.1, 1.04], [0.72, 1.04], [0.78, 0.88], [0.68, 0.62], [0.44, 0.69], [0.2, 0.76], [0.1, 0.86]]).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath(); g.fill();
      // grey tear marks under the lenses' outer corners, outlined in black
      poly(g, TR.black, P([[0.64, 0.6], [0.8, 0.6], [0.77, 0.38], [0.67, 0.36]]));
      poly(g, TR.grey, P([[0.665, 0.575], [0.775, 0.575], [0.75, 0.4], [0.685, 0.385]]));
      // little grey vents on the cheeks
      for (let k = 0; k < 5; k++) { const x = 0.86 + k * 0.07, y = 0.47 - k * 0.025; poly(g, TR.grey, P([[x, y], [x + 0.035, y], [x + 0.065, y - 0.07], [x + 0.03, y - 0.07]])); }
    }
    // the frown: a black band right above the faceplate, with grey teeth in it
    const at = (x, dy) => { const y = snoutTop(x) + dy; return [Math.asin(Math.max(-1, Math.min(1, x / trFaceR(y)))), y]; };
    const xs = []; for (let x = -0.9; x <= 0.901; x += 0.04) xs.push(x);
    poly(g, TR.black, [...xs.map((x) => at(x, -0.03)), ...xs.slice().reverse().map((x) => at(x, 0.1))]);
    for (const x of [-0.56, -0.41, -0.26, 0.26, 0.41, 0.56]) poly(g, TR.dgrey, [at(x - 0.045, 0.02), at(x + 0.045, 0.02), at(x + 0.045, 0.07), at(x - 0.045, 0.07)]);
  });
  inTorso(g, rg.figF, 0.8, (T, k) => trooperTorso(g, T, k));
  inTorso(g, rg.figB, 0.8, (T, k) => trooperBack(g, T, k));
  inTorso(g, rg.drvF, 0.76, (T, k) => trooperTorso(g, T, k));
  inTorso(g, rg.drvB, 0.76, (T, k) => trooperBack(g, T, k));
  inTorso(g, rg.leg, 1, (T) => trooperLeg(g, T));
  inTorso(g, rg.thigh, 1, (T) => trooperThigh(g, T));
});
// the stormtrooper helmet (also the driver's): R = head radius, base at y0
export function trooperHelmet(b, R, y0 = 0) {
  const A = trooperPrints(), H = TRH.yt - TRH.yb, yb = y0 + TRH.yb * R, top = y0 + TRH.yt * R;
  put(b, regionGeo('trface', TRFACE, A.rg.head, A.rg.blank), A.mat, 0, yb, 0, R, H * R, R, 0, Math.PI, 0);
  put(b, TRSKIRT, TW, 0, yb, 0, R, H * R, R);                                            // flared back and sides
  put(b, CYL20, TW, 0, yb + 0.01 * R, 0, 1.2 * R, 0.02 * R, 1.2 * R);                     // its bottom edge
  // the dome overhangs the face as a lip and the skirt at the back
  put(b, TRDOME, TW, 0, top - 0.01 * R, -0.03 * R, 1.09 * R, 0.9 * R, 1.16 * R);
  put(b, CYL20, TW, 0, top - 0.03 * R, -0.03 * R, 1.09 * R, 0.07 * R, 1.16 * R);
  for (const ry of [0, Math.PI * 1.1]) put(b, TRBAND, TB, 0, y0 + 1.03 * R, 0, R, 0.11 * R, R, 0, ry, 0);   // brow band, round to the ears
  // grey vents on the top of the dome, outlined in black
  const n = new THREE.Vector3();
  for (const sd of [-1, 1]) {
    const a = sd * 0.95, e = 0.6, c = Math.cos(e);
    const p = [1.09 * Math.sin(a) * c * R, top + 0.9 * Math.sin(e) * R, (-0.03 + 1.16 * Math.cos(a) * c) * R];
    n.set(Math.sin(a) * c / 1.09, Math.sin(e) / 0.9, Math.cos(a) * c / 1.16).normalize();
    const ry = Math.atan2(n.x, n.z), rx = -Math.asin(n.y);
    put(b, BOX, TB, ...p, 0.26 * R, 0.15 * R, 0.03 * R, rx, ry, 0);
    put(b, BOX, 0x7c8188, p[0] + n.x * 0.008 * R, p[1] + n.y * 0.008 * R, p[2] + n.z * 0.008 * R, 0.2 * R, 0.1 * R, 0.03 * R, rx, ry, 0);
  }
  // the faceplate: white shell, black frown edge, a grey grille with a dark vent, black breathers
  put(b, SNOUT, TW, 0, y0, 0, R, R, R);
  put(b, SNOUT_RIM, TB, 0, y0, 0, R, R, R);
  const gy = 0.15, gz = snoutZ(0, gy);
  put(b, BOX, TB, 0, y0 + gy * R, (gz + 0.012) * R, 0.19 * R, 0.38 * R, 0.04 * R, -SNOUT_TILT);
  put(b, BOX, 0x55595f, 0, y0 + (gy + 0.01) * R, (gz + 0.024) * R, 0.13 * R, 0.31 * R, 0.04 * R, -SNOUT_TILT);
  put(b, BOX, TB, 0, y0 + (gy - 0.03) * R, (gz + 0.034) * R, 0.04 * R, 0.18 * R, 0.03 * R, -SNOUT_TILT);
  for (const sd of [-1, 1]) {
    const x = sd * 0.43, y = 0.06, z = snoutZ(x, y), a = Math.atan2(x, Math.sqrt(1.12 * 1.12 - x * x)), c = Math.cos(SNOUT_TILT);
    n.set(Math.sin(a) * c, Math.sin(SNOUT_TILT), Math.cos(a) * c);
    rod(b, TB, (x - n.x * 0.04) * R, y0 + (y - n.y * 0.04) * R, (z - n.z * 0.04) * R, (x + n.x * 0.025) * R, y0 + (y + n.y * 0.025) * R, (z + n.z * 0.025) * R, 0.075 * R, CYL20);
  }
  // ear caps: white, a grey plate outlined in black with a black slot
  for (const sd of [-1, 1]) {
    const ey = y0 + 0.66 * R, ez = -0.06 * R;
    rod(b, TW, sd * 0.98 * R, ey, ez, sd * 1.27 * R, ey, ez, 0.3 * R, CYL20);
    put(b, BOX, TB, sd * 1.28 * R, ey, ez, 0.03 * R, 0.31 * R, 0.25 * R);
    put(b, BOX, TG, sd * 1.29 * R, ey, ez, 0.03 * R, 0.25 * R, 0.19 * R);
    put(b, BOX, TB, sd * 1.3 * R, ey, ez + 0.03 * R, 0.03 * R, 0.17 * R, 0.05 * R);
  }
}
export function trooper(b, s = 1.6) {
  const pitch = 0.7, spread = 0.1;
  fig(b, s, { legs: TW, hips: TW, torso: TW, neck: TB, noArms: true });
  figPrints(b, trooperPrints(), s);
  trooperHelmet(b, 0.41 * s, 2.56 * s);
  for (const sd of [-1, 1]) cArm(b, s, sd, TW, TB, sd * 0.56 * s, 2.3 * s, 0, pitch, spread);
  // black E-11 blaster held across the chest, muzzle up to his left
  const E = 0x1a1a1c, g0 = [-0.8 * s, 1.36 * s, 0.7 * s], g1 = [0.95 * s, 1.86 * s, 0.74 * s];
  const at = (t, dy = 0, dz = 0) => [g0[0] + (g1[0] - g0[0]) * t, g0[1] + (g1[1] - g0[1]) * t + dy, g0[2] + (g1[2] - g0[2]) * t + dz];
  rod(b, E, ...at(0.08), ...at(0.62), 0.15 * s, BOX, 0.13 * s);
  rod(b, E, ...at(0.6), ...at(1.0), 0.05 * s, CYL8);
  rod(b, E, ...at(0.3, 0.11 * s), ...at(0.52, 0.11 * s), 0.06 * s, CYL8);   // scope
  rod(b, E, ...at(0.4, -0.08 * s), ...at(0.4, -0.24 * s, 0.04 * s), 0.07 * s, BOX, 0.06 * s);   // magazine
  rod(b, E, ...at(0.0), ...at(0.1), 0.06 * s, BOX, 0.1 * s);   // folded stock
}

export function boba(s = 2.4) {
  const root = new THREE.Group();
  const arm = 0x5a6b3a;
  root.add(group((b) => {
    fig(b, s, { legs: 0x6a6448, hips: 0x3a2a1a, torso: arm, face: FACES.boba(), neck: 0x3a3a3a, arms: 0x8a7a54, hands: 0x3a3a3a, noStud: true, headR: 0.42, armPitch: 0.5 });
    put(b, HEMI, arm, 0, 2.56 * s + 0.66 * s, 0, 0.42 * s, 0.25 * s, 0.42 * s);
    rod(b, 0x3a3a3a, 0.44 * s, 3.0 * s, 0, 0.44 * s, 3.6 * s, 0.1 * s, 0.05 * s, CYL8);
    box(b, 0xc0c4c8, 0, 1.4 * s, -0.5 * s, 0.9 * s, 1.1 * s, 0.4 * s);
    for (const sd of [-1, 1]) rod(b, 0xc0c4c8, sd * 0.3 * s, 1.1 * s, -0.55 * s, sd * 0.3 * s, 2.1 * s, -0.55 * s, 0.14 * s, CYL8);
    put(b, CONE, C.red, 0, 2.5 * s, -0.5 * s, 0.22 * s, 0.4 * s, 0.22 * s);
    box(b, 0x6a4a2a, -0.2 * s, 0.9 * s, -0.36 * s, 0.6 * s, 1.4 * s, 0.05 * s);
    box(b, 0x5a3a24, 0, 2.0 * s, 0.28 * s, 0.14 * s, 1.1 * s, 0.05 * s, 0, 0, 0.6);
  }, 'boba'));
  const flame = group((b) => { for (const sd of [-1, 1]) put(b, CONE, glow(0xff8a20, 3), sd * 0.3 * s, -0.4 * s, 0, 0.18 * s, 0.9 * s, 0.18 * s, Math.PI, 0, 0); }, 'flame');
  const fp = pivot(flame, 0, 1.1 * s, -0.55 * s);
  root.add(fp);
  root.userData.anim = (t) => { fp.scale.y = 0.8 + Math.sin(t * 31) * 0.25 + Math.sin(t * 17) * 0.15; };
  return root;
}

// Chewbacca roaring at the cantina door, one arm up, the bowcaster in his other hand: the
// driver's head (scaled up), shaggy fur over a fur-printed body, and the bandolier of raised
// silver boxes from his left shoulder to his right hip.
const furTorso = () => hiPrint('chewie-fig', 256, Math.round(256 * 1.2 / 1.06), '#6a4a2c', (g, w, h) => {
  g.setTransform(w, 0, 0, -w, w / 2, h); furStrokes(g, furRng(5), -0.56, 0.56, 0, h / w, 0.045, 0.085, 0.015); g.setTransform(1, 0, 0, 1, 0, 0);
});
// a fig() arm with fur tufts round the shoulder and the upper arm
function chewieArm(b, s, sd, ox, oy, oz, pitch, spread) {
  const { fur, dark, light, mid } = CHEWIE;
  arm(b, s, sd, fur, 0x3a2818, ox, oy, oz, pitch, spread);
  for (const [t, a, col] of [[0.04, 0, dark], [0.04, sd * Math.PI / 2, light], [0.04, Math.PI, mid], [0.04, -sd * Math.PI / 2, fur], [0.42, sd * 1.2, mid], [0.42, sd * 2.4, dark], [0.42, -sd * 0.2, light]]) {
    const [x, y, z] = armPt(s, sd, ox, oy, oz, pitch, spread, t);
    tuft(b, x + Math.sin(a) * 0.16 * s, y, z + Math.cos(a) * 0.16 * s, a, 0.11 * s, 0.38 * s, col, 0.25);
  }
}
export function chewie(s = 3.0) {
  const root = new THREE.Group();
  const { fur, dark, light, mid } = CHEWIE, D = CHEWIE_HEAD, k = 0.46 * s / D.headR;
  root.add(group((b) => {
    fig(b, s, { legs: fur, hips: dark, torso: fur, neck: fur, noArms: true });
    // fur prints on the torso and the legs
    const fm = furTorso(), all = [0, 0, AT, AT];
    printQuad(b, fm, all, 1.06 * s, 0.848 * s, 1.2 * s, 0, 1.25 * s, 0.2725 * s);
    printQuad(b, fm, all, 1.06 * s, 0.848 * s, 1.2 * s, 0, 1.25 * s, -0.2725 * s, 0, Math.PI, true);
    for (const sd of [-1, 1]) for (const z of [1, -1]) {
      printQuad(b, fm, sd > 0 ? [0, 0, 454, 853] : [512, 120, 966, 973], 0.47 * s, 0.47 * s, 1.0 * s, sd * 0.25 * s, 0, z * 0.3125 * s, 0, z > 0 ? 0 : Math.PI);
    }
    // shaggy fur over the shoulders, round the waist and over the feet
    for (let n = 0; n < 8; n++) {
      const x = (-0.37 + n * 0.106) * s;
      for (const z of [1, -1]) tuft(b, x, 2.46 * s, z * 0.25 * s, z > 0 ? 0 : Math.PI, 0.09 * s, 0.36 * s, [dark, light, mid][n % 3], 0.3, ((n * 5) % 3 - 1) * 0.15);
    }
    for (let n = 0; n < 16; n++) {
      const a = (n + 0.5) / 16 * Math.PI * 2;
      tuft(b, Math.sin(a) * 0.55 * s, 1.36 * s, Math.cos(a) * 0.3 * s, a, 0.12 * s, 0.4 * s, [mid, fur, dark, light][n % 4], 0.22, ((n * 7) % 5 - 2) * 0.08);
    }
    for (const sd of [-1, 1]) for (let n = 0; n < 6; n++) {
      const a = (n + 0.5) / 6 * Math.PI * 2;
      tuft(b, sd * 0.25 * s + Math.sin(a) * 0.25 * s, 0.32 * s, 0.03 * s + Math.cos(a) * 0.29 * s, a, 0.1 * s, 0.32 * s, [dark, fur, mid][n % 3], 0.25);
    }
    // the bandolier: over his left shoulder to his right hip, front and back, with silver boxes
    const ba = -0.61, ux = -Math.sin(ba), uy = Math.cos(ba), cx = -0.045 * s, cy = 1.875 * s;
    for (const z of [1, -1]) {
      box(b, 0x3a2614, cx, cy, z * 0.29 * s, 0.17 * s, 1.45 * s, 0.035 * s, 0, 0, ba);
      for (let n = 0; n < 7; n++) {
        const t = (-0.48 + n * 0.15) * s, x = cx + ux * t, y = cy + uy * t;
        box(b, 0xc4c8ce, x, y, z * 0.315 * s, 0.14 * s, 0.15 * s, 0.07 * s, 0, 0, ba);
        box(b, 0x7c8086, x + ux * 0.05 * s, y + uy * 0.05 * s, z * 0.352 * s, 0.142 * s, 0.035 * s, 0.01 * s, 0, 0, ba);
      }
    }
    box(b, 0x3a2614, 0.37 * s, 2.47 * s, 0, 0.17 * s, 0.04 * s, 0.6 * s, 0, 0, ba * 0.25);   // over the shoulder
    // the head: the driver's, scaled up, the jaw dropped a little in a roar
    stampM(b, (hb) => {
      hb.add(HEAD20, chewieFace(), 0, 0, 0, Math.PI, D.headR, D.headH, D.headR);
      chewieHead(hb, D);
      stampM(hb, (jb) => chewieJaw(jb, D), m4(...chewieJawAt(D), 0.22, 0, 0));
    }, m4(0, 2.56 * s, 0, 0, 0, 0, k, k, k));
    // his right arm holds the bowcaster out front: stock, barrel, scope and the bow across the muzzle
    chewieArm(b, s, -1, -0.56 * s, 2.3 * s, 0, 0.35, 0.1);
    const [hx, hy0, hz] = armPt(s, -1, -0.56 * s, 2.3 * s, 0, 0.35, 0.1, 1), hy = hy0 - 0.12 * s;
    box(b, 0x5a3a20, hx, hy - 0.02 * s, hz + 0.3 * s, 0.13 * s, 0.2 * s, 1.3 * s);
    box(b, 0x5a3a20, hx, hy - 0.16 * s, hz - 0.12 * s, 0.11 * s, 0.26 * s, 0.22 * s, -0.3);
    rod(b, 0x8a8e94, hx, hy + 0.13 * s, hz + 0.05 * s, hx, hy + 0.13 * s, hz + 1.2 * s, 0.055 * s, CYL8);
    rod(b, 0x2a2a2e, hx, hy + 0.25 * s, hz + 0.25 * s, hx, hy + 0.25 * s, hz + 0.6 * s, 0.065 * s, CYL8);
    for (const sd of [-1, 1]) box(b, 0xa0a4aa, hx + sd * 0.27 * s, hy + 0.13 * s, hz + 0.92 * s, 0.5 * s, 0.06 * s, 0.07 * s, 0, sd * 0.4, 0);
  }, 'chewie'));
  const ap = pivot(group((b) => chewieArm(b, s, 1, 0, 0, 0, 0.1, 0.06), 'arm'), 0.56 * s, 2.3 * s, 0);
  root.add(ap);
  root.userData.anim = (t) => { ap.rotation.x = -2.4 + Math.sin(t * 3) * 0.35; ap.rotation.z = 0.3; };
  return root;
}

// Tusken Raider: a bandage-wrapped head under a hooded cloak, round goggle eyes on metal
// tubes, the spiked breath mask, layered ragged robes, crossed bandoliers and a gaffi stick.
const TK_WRAP = 0xc9b38e, TK_WRAP2 = 0xa88f68, TK_WRAP3 = 0xdcc9a4, TK_CLOAK = 0x6e5236, TK_ROBE = 0x9a7c56, TK_LEATHER = 0x5a3e24, TK_TUNIC = 0xb79b72, TK_HAND = 0x6e5438;
const TK_METAL = 0xa4a8ae, TK_DMETAL = 0x50545a;
function tuskenHead(b, R, H, y0) {
  const Hc = H * 0.9, mt = metal(TK_METAL, 0.32);
  b.add(HEAD, FACES.tusken(), 0, y0, 0, Math.PI, R, Hc, R);
  ball(b, TK_WRAP, 0, y0 + Hc - 0.05 * R, 0, R * 1.03, 0.62);           // wrapped crown
  ball(b, TK_WRAP2, 0, y0 + Hc + R * 0.42, -R * 0.08, R * 0.5, 0.55);   // knot of cloth on top
  // loose bandage bands, each a little skewed
  for (const [y, rx, rz, c] of [[0.9, -0.14, 0.1, TK_WRAP2], [1.0, 0.12, -0.08, TK_WRAP3], [0.06, -0.1, -0.1, TK_WRAP2], [0.4, 0.2, 0.05, TK_WRAP3]]) {
    put(b, HEAD, c, 0, y0 + H * y * 0.9, 0, R * 1.05, H * 0.065, R * 1.05, rx, 0, rz);
  }
  put(b, FLARE, TK_CLOAK, 0, y0 - H * 0.12, -R * 0.04, R * 1.1, H * 1.0, R * 1.1);        // hood down the back
  put(b, HOOD, TK_CLOAK, 0, y0 + Hc * 0.95, -R * 0.08, R * 1.12, R * 0.74, R * 1.1, -0.1);
  // round goggle eyes on metal tubes
  const gy = y0 + Hc * 0.62;
  for (const sd of [-1, 1]) {
    const a = sd * 0.42;
    rod(b, mt, ...onHead(a, gy, R * 0.8), ...onHead(a * 0.85, gy, R * 1.22), R * 0.2);
    rod(b, TK_DMETAL, ...onHead(a * 0.85, gy, R * 1.2), ...onHead(a * 0.83, gy, R * 1.32), R * 0.245);
    rod(b, 0x0c0c0e, ...onHead(a * 0.83, gy, R * 1.3), ...onHead(a * 0.83, gy, R * 1.335), R * 0.17);
  }
  box(b, mt, 0, gy, R * 1.04, R * 0.3, Hc * 0.07, R * 0.12);   // nose bridge
  box(b, TK_DMETAL, 0, y0 + Hc * 0.45, R * 1.02, R * 0.14, Hc * 0.28, R * 0.12);
  // breath mask with its "teeth"
  const my = y0 + Hc * 0.27;
  rod(b, mt, ...onHead(0, my + 0.025 * R, R * 0.85), ...onHead(0, my, R * 1.18), R * 0.23);
  rod(b, TK_DMETAL, ...onHead(0, my, R * 1.17), ...onHead(0, my, R * 1.2), R * 0.17);
  for (const ph of [-1.3, -0.65, 0, 0.65, 1.3]) {
    const x = Math.sin(ph) * R * 0.17, y = my - Math.cos(ph) * R * 0.17;
    put(b, CONE, mt, x, y - R * 0.04, R * 1.3, R * 0.05, R * 0.3, R * 0.05, Math.PI / 2 + 0.45, 0, -ph * 0.3);
  }
}
// a ragged hem: cloth tatters round an ellipse (rx, rz) at height y, over the arc a0..a1
function hem(b, col, y, rx, rz, n, sz, a0 = -Math.PI, a1 = Math.PI) {
  for (let k = 0; k < n; k++) {
    const a = a0 + (a1 - a0) * (k + 0.5) / n;
    box(b, col, Math.sin(a) * rx, y - (k % 2) * sz * 0.35, Math.cos(a) * rz, sz, sz, sz * 0.3, 0, a, ((k % 3) - 1) * 0.3);
  }
}
// robe sleeve, cloak over the shoulder, cloth wraps and a leather cuff on an arm() arm
function tuskenArm(b, s, sd, ox, oy, oz, pitch, spread) {
  const pa = [s, sd, ox, oy, oz, pitch, spread];
  arm(b, s, sd, TK_ROBE, TK_HAND, ox, oy, oz, pitch, spread);
  ball(b, TK_CLOAK, ox + sd * 0.02 * s, oy + 0.02 * s, oz, 0.22 * s, 0.8);
  armBand(b, TK_ROBE, ...pa, 0.55, 0.78, 1.16);   // loose sleeve
  for (const t of [0.8, 0.86]) armBand(b, TK_WRAP2, ...pa, t, t + 0.04, 1.04);
  armBand(b, TK_LEATHER, ...pa, 0.92, 1.0, 1.06);
}
export function tusken(s = 2.4) {
  const root = new THREE.Group();
  root.add(group((b) => {
    fig(b, s, { legs: TK_ROBE, hips: TK_CLOAK, torso: TK_TUNIC, neck: TK_WRAP2, noArms: true });
    tuskenHead(b, 0.4 * s, 0.67 * s, 2.56 * s);
    // layered robes: a long robe to the ground, a shorter tunic skirt over it, ragged hems, feet
    put(b, ROBE, TK_ROBE, 0, 0, 0, 0.72 * s, 1.25 * s, 0.52 * s);
    hem(b, TK_ROBE, 0.05 * s, 0.7 * s, 0.5 * s, 11, 0.13 * s);
    put(b, ROBE, TK_TUNIC, 0, 0.72 * s, 0, 0.78 * s, 0.62 * s, 0.56 * s);
    hem(b, TK_TUNIC, 0.76 * s, 0.76 * s, 0.55 * s, 11, 0.12 * s);
    for (const sd of [-1, 1]) box(b, TK_LEATHER, sd * 0.24 * s, 0.07 * s, 0.42 * s, 0.3 * s, 0.14 * s, 0.26 * s);
    // over-robe panels down the front edges, cloak mantle with a ragged hem, cape behind
    for (const sd of [-1, 1]) box(b, TK_ROBE, sd * 0.38 * s, 1.75 * s, 0.285 * s, 0.26 * s, 0.9 * s, 0.04 * s, -0.03);
    put(b, TRAP, TK_CLOAK, 0, 2.06 * s, 0, 1.18 * s, 0.44 * s, 0.64 * s);
    hem(b, TK_CLOAK, 2.06 * s, 0.56 * s, 0.33 * s, 16, 0.13 * s);
    box(b, TK_CLOAK, 0, 1.35 * s, -0.36 * s, 1.08 * s, 1.9 * s, 0.07 * s, -0.08);
    for (let k = 0; k < 6; k++) box(b, TK_CLOAK, (-0.45 + k * 0.18) * s, 0.4 * s - (k % 2) * 0.05 * s, -0.43 * s, 0.13 * s, 0.14 * s, 0.07 * s, -0.08, 0, ((k % 3) - 1) * 0.3);
    // crossed bandoliers with pouches and a canteen
    for (const sd of [-1, 1]) box(b, TK_LEATHER, 0, 1.78 * s, 0.29 * s, 0.14 * s, 1.15 * s, 0.03 * s, 0, 0, sd * 0.62);
    for (let k = 0; k < 4; k++) {
      const t = (-0.36 + k * 0.24) * s;
      box(b, k === 1 ? 0x8a8e92 : 0x6a4a2a, -Math.sin(0.62) * t, 1.78 * s + Math.cos(0.62) * t, 0.31 * s, 0.11 * s, 0.12 * s, 0.05 * s, 0, 0, 0.62);
    }
    rod(b, 0x8a8e92, 0.3 * s, 1.58 * s, 0.28 * s, 0.3 * s, 1.58 * s, 0.37 * s, 0.11 * s);
    // cloth sash, leather belt with a buckle and pouches, a flap of cloth hanging at the front
    box(b, TK_WRAP2, 0, 1.33 * s, 0, 1.1 * s, 0.2 * s, 0.6 * s);
    box(b, TK_LEATHER, 0, 1.38 * s, 0, 1.11 * s, 0.07 * s, 0.61 * s);
    box(b, 0x8a8e92, 0, 1.38 * s, 0.31 * s, 0.12 * s, 0.11 * s, 0.03 * s);
    for (const sd of [-1, 1]) box(b, 0x6a4a2a, sd * 0.42 * s, 1.3 * s, 0.31 * s, 0.17 * s, 0.19 * s, 0.1 * s);
    box(b, TK_ROBE, 0.1 * s, 1.08 * s, 0.4 * s, 0.3 * s, 0.4 * s, 0.04 * s, 0.25, 0, 0.08);
    tuskenArm(b, s, 1, 0.56 * s, 2.3 * s, 0, 0.2, 0.1);
  }, 'tusken'));
  // the right arm swings the gaffi stick: wooden shaft, grip wraps, a metal head with its prongs
  const armR = group((b) => {
    tuskenArm(b, s, -1, 0, 0, 0, 0.05, 0.02);
    const [ex, ey, ez] = armPt(s, -1, 0, 0, 0, 0.05, 0.02, 1);
    const hy = ey - 0.12 * s, top = hy + 1.6 * s;
    rod(b, 0x6b5434, ex, hy - 1.2 * s, ez, ex, top, ez, 0.075 * s, CYL8);
    for (const y of [0.25, 0.85]) rod(b, 0x3a2a1a, ex, hy + (y - 0.06) * s, ez, ex, hy + y * s, ez, 0.09 * s, CYL8);
    box(b, TK_METAL, ex, hy - 1.24 * s, ez, 0.17 * s, 0.14 * s, 0.17 * s);   // pommel
    rod(b, TK_METAL, ex, top - 0.2 * s, ez, ex, top + 0.02 * s, ez, 0.1 * s, CYL8);
    box(b, TK_METAL, ex, top + 0.06 * s, ez, 0.14 * s, 0.14 * s, 0.95 * s);  // cross head
    for (const sd of [-1, 1]) box(b, TK_METAL, ex, top + 0.14 * s, ez + sd * 0.48 * s, 0.11 * s, 0.32 * s, 0.13 * s, sd * 0.35);
    put(b, CONE, TK_METAL, ex, top + 0.25 * s, ez, 0.07 * s, 0.3 * s, 0.07 * s);
  }, 'gaffi');
  const ap = pivot(armR, -0.56 * s, 2.3 * s, 0);
  root.add(ap);
  const ph = Math.random() * 6;
  root.userData.anim = (t) => { const w = Math.max(0, Math.sin(t * 2.4 + ph)); ap.rotation.x = -0.4 - w * 2.4; ap.rotation.z = -0.25; };
  return root;
}

export function rebel(b, s = 1.6, helmet = 0xd8d8d0, torso = 0x8a8a7a) {
  fig(b, s, { legs: 0x5a5a50, hips: 0x3a3a3a, torso, face: FACES.pilot(), neck: C.fig, arms: torso, noStud: true, armPitch: 0.6 });
  put(b, HEMI, helmet, 0, 2.56 * s + 0.4 * s, 0, 0.46 * s, 0.4 * s, 0.46 * s);
  box(b, 0x333333, 0, 1.4 * s, 0.7 * s, 0.14 * s, 0.14 * s, 0.9 * s);
}

export function podracerB(b, s = 1, eng = 0x8aa0c8, stripe = 0x1f55b8, pod = 0x2a5ab8) {
  {
    const dk = 0x3a3d40;
    for (const sd of [-1, 1]) {
      const x = sd * 2.3 * s;
      rod(b, eng, x, 0, 2 * s, x, 0, 12 * s, 0.95 * s, CYL);
      rod(b, dk, x, 0, 12 * s, x, 0, 12.8 * s, 1.15 * s, CYL);
      rod(b, 0x111111, x, 0, 12.8 * s, x, 0, 12.85 * s, 0.9 * s, CYL);
      for (const z of [5, 8.5]) rod(b, stripe, x, 0, z * s, x, 0, (z + 0.6) * s, 0.98 * s, CYL);
      rod(b, glow(0x8adfff, 2.6), x, 0, 1.85 * s, x, 0, 2.0 * s, 0.8 * s, CYL8);
      box(b, eng, x, 1.1 * s, 7 * s, 0.2 * s, 1.0 * s, 3 * s);
      rod(b, dk, x - sd * 0.5 * s, -0.2 * s, 3 * s, sd * 0.5 * s, 0, -2.6 * s, 0.07 * s, CYL8);
    }
    box(b, glow(0x6ad0ff, 2.4), 0, 0, 10.5 * s, 3.8 * s, 0.1 * s, 0.1 * s);
    box(b, glow(0x6ad0ff, 2.4), 0, 0.3 * s, 7.5 * s, 3.8 * s, 0.1 * s, 0.1 * s);
    ball(b, pod, 0, 0, -3.8 * s, 1.2 * s, 0.7);
    box(b, pod, 0, 0, -2.6 * s, 1.4 * s, 0.6 * s, 1.6 * s, 0.25, 0, 0);
    box(b, C.yellow, 0, 0.5 * s, -4.4 * s, 1.6 * s, 0.25 * s, 0.6 * s);
    ball(b, C.fig, 0, 0.8 * s, -3.8 * s, 0.35 * s);
    ball(b, 0x5a4030, 0, 0.95 * s, -3.8 * s, 0.37 * s, 0.6);
  }
}
export const podracer = (s = 1, eng = 0x8aa0c8, stripe = 0x1f55b8, pod = 0x2a5ab8) => group((b) => podracerB(b, s, eng, stripe, pod), 'podracer');

export function bantha(s = 1) {
  return group((b) => {
    const fur = 0x5a4030, fur2 = 0x4a3222, horn = 0xd8c8a8;
    ball(b, fur, 0, 4.6 * s, 0, 3.2 * s, 0.85);
    box(b, fur, 0, 2.6 * s, 0, 4.6 * s, 2.2 * s, 6.4 * s);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, fur2, sx * 1.6 * s, 1.3 * s, sz * 2.2 * s, 1.5 * s, 2.6 * s, 1.5 * s);
    ball(b, fur, 0, 4.6 * s, 3.4 * s, 1.6 * s, 1.1);
    ball(b, 0x3a2a1a, 0, 3.9 * s, 4.7 * s, 0.7 * s);
    for (const sd of [-1, 1]) for (let k = 0; k < 7; k++) {
      const a = k * 0.8;
      ball(b, horn, sd * (1.4 + Math.cos(a) * 0.5 + k * 0.08) * s, (5.4 - k * 0.22 + Math.sin(a) * 0.5) * s, (3.3 - k * 0.12) * s, (0.4 - k * 0.03) * s);
    }
    box(b, 0x8a3a2a, 0, 6.8 * s, -0.5 * s, 2.6 * s, 0.4 * s, 2.4 * s);
  }, 'bantha');
}

// The Sarlacc's mouth: beak, rows of teeth and a group of waving tentacles.
export function sarlacc(s = 1) {
  const root = new THREE.Group();
  root.add(group((b) => {
    rod(b, 0xb07a70, 0, -0.4 * s, 0, 0, 0.6 * s, 0, 9 * s, CYL20);
    rod(b, 0x4a2a2a, 0, 0.5 * s, 0, 0, 0.7 * s, 0, 6.6 * s, CYL20);
    rod(b, 0xd89a90, 0, 0.6 * s, 0, 0, 1.2 * s, 0, 7.4 * s, CYL20, 7.4 * s);
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 18; k++) {
      const a = k / 18 * Math.PI * 2 + ring * 0.17, r = (7.2 - ring * 1.6) * s;
      put(b, CONE, 0xf0ead8, Math.sin(a) * r, 1.6 * s, Math.cos(a) * r, 0.35 * s, (1.6 - ring * 0.4) * s, 0.35 * s, -0.5 * Math.cos(a), 0, 0.5 * Math.sin(a));
    }
    put(b, CONE, 0x5a4a3a, 0, 2.2 * s, 0, 1.4 * s, 4.2 * s, 1.4 * s, 0.25, 0, 0);
    put(b, CONE, 0x3a2a1a, 0, 1.0 * s, 0.4 * s, 1.0 * s, 2.0 * s, 1.0 * s, -0.5, 0, 0);
  }, 'sarlacc'));
  const tents = [];
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + 0.3;
    const t = group((b) => {
      let x = 0, y = 0, z = 0;
      for (let n = 0; n < 6; n++) {
        const nx = x, ny = y + 1.6 * s, nz = z + n * 0.35 * s;
        rod(b, 0x7a5a3e, x, y, z, nx, ny, nz, (1.1 - n * 0.14) * s, CYL8);
        x = nx; y = ny; z = nz;
      }
      ball(b, 0x8a6a4a, x, y, z, 0.25 * s);
    }, 'tentacle');
    const p = pivot(t, Math.sin(a) * 5.4 * s, 0.8 * s, Math.cos(a) * 5.4 * s);
    p.rotation.y = a;
    root.add(p);
    tents.push({ t, ph: k * 1.3 });
  }
  root.userData.anim = (tt) => { for (const q of tents) { q.t.rotation.x = 0.25 + Math.sin(tt * 1.3 + q.ph) * 0.45; q.t.rotation.z = Math.sin(tt * 0.9 + q.ph * 2) * 0.3; } };
  return root;
}

export function sailBarge(s = 1) {
  return group((b) => {
    const hull = 0xc8a878, dk = 0x7a5a3a, sail = 0xe8dcc0;
    prismAt(b, hull, [[-14, 0], [12, 0], [18, 4], [-14, 4]], 9, 0, 0, 0, s);
    box(b, dk, 0, 4 * s, -1 * s, 9.2 * s, 0.4 * s, 26 * s);
    box(b, hull, 0, 4.4 * s, -4 * s, 7 * s, 4 * s, 10 * s);
    box(b, 0x3a2a1a, 0, 6 * s, 1.1 * s, 6 * s, 0.8 * s, 0.1 * s);
    box(b, hull, 0, 8.4 * s, -5 * s, 5 * s, 2 * s, 6 * s);
    for (const [z, h] of [[4, 14], [-10, 12]]) {
      rod(b, dk, 0, 4 * s, z * s, 0, (4 + h) * s, z * s, 0.25 * s, CYL8);
      box(b, sail, 0, (5 + h * 0.55) * s, (z - 0.4) * s, 0.12 * s, h * 0.8 * s, 6 * s);
    }
    for (let k = 0; k < 6; k++) box(b, 0x9a3a2a, 4.55 * s, 2 * s, (-10 + k * 4) * s, 0.1 * s, 1.2 * s, 2 * s);
    for (let k = 0; k < 6; k++) box(b, 0x9a3a2a, -4.55 * s, 2 * s, (-10 + k * 4) * s, 0.1 * s, 1.2 * s, 2 * s);
  }, 'barge');
}

export function razorCrest(b, s = 1) {
  const g = 0xa8acb0, g2 = 0x7a7e84, dk = 0x3a3d40;
  box(b, g, 0, 3 * s, 0, 5 * s, 3.4 * s, 20 * s);
  box(b, g2, 0, 4.9 * s, -2 * s, 3.6 * s, 0.6 * s, 14 * s);
  box(b, g, 0, 2.8 * s, 11.5 * s, 3.6 * s, 2.6 * s, 3 * s, 0.2, 0, 0);
  box(b, 0x1a2a3a, 0, 3.8 * s, 12.6 * s, 2.6 * s, 0.8 * s, 1.2 * s, 0.4, 0, 0);
  for (const sd of [-1, 1]) {
    rod(b, g, sd * 4.8 * s, 3.4 * s, -10 * s, sd * 4.8 * s, 3.4 * s, 1 * s, 1.6 * s, CYL);
    rod(b, dk, sd * 4.8 * s, 3.4 * s, 1 * s, sd * 4.8 * s, 3.4 * s, 2 * s, 1.2 * s, CYL);
    rod(b, glow(0x7ad8ff, 1.8), sd * 4.8 * s, 3.4 * s, -10.1 * s, sd * 4.8 * s, 3.4 * s, -9.9 * s, 1.2 * s, CYL8);
    box(b, g2, sd * 3.4 * s, 3.4 * s, -5 * s, 2 * s, 0.6 * s, 5 * s);
    rod(b, dk, sd * 2 * s, 0, 4 * s, sd * 2 * s, 1.4 * s, 4 * s, 0.25 * s, CYL8);
    rod(b, dk, sd * 2 * s, 0, -6 * s, sd * 2 * s, 1.4 * s, -6 * s, 0.25 * s, CYL8);
  }
  box(b, 0x9a3a2a, 2.52 * s, 3 * s, 4 * s, 0.05 * s, 1 * s, 3 * s);
}

// Adobe dome house (Mos Eisley / Mos Espa)
export function adobe(b, w, h, col = SW.adobe, r = Math.random) {
  box(b, col, 0, h / 2, 0, w, h, w);
  put(b, HEMI, col, 0, h, 0, w * 0.5, w * 0.42, w * 0.5);
  box(b, 0x3a2a1a, 0, 1.4, w / 2 + 0.05, 1.8, 2.8, 0.2);
  box(b, SW.adobe2, 0, 3.0, w / 2 + 0.1, 2.6, 0.3, 0.4);
  if (r() < 0.5) { rod(b, 0x8a8a8a, w * 0.3, h + w * 0.3, 0, w * 0.3, h + w * 0.3 + 3, 0, 0.12, CYL8); ball(b, 0x8a8a8a, w * 0.3, h + w * 0.3 + 3, 0, 0.3); }
  if (r() < 0.5) box(b, 0x2a2a2a, -w * 0.25, h * 0.6, w / 2 + 0.05, 1, 1, 0.1);
}

export function vaporator(b, s = 1) {
  const g = 0xb8bcc0, d = 0x6a6e72;
  rod(b, d, 0, 0, 0, 0, 1.2 * s, 0, 0.9 * s, CYL8);
  rod(b, g, 0, 1.2 * s, 0, 0, 7.5 * s, 0, 0.45 * s, CYL8);
  for (const y of [2.6, 4.2, 5.6]) rod(b, d, 0, y * s, 0, 0, (y + 0.35) * s, 0, 0.62 * s, CYL8);
  rod(b, g, 0, 7.5 * s, 0, 0, 8.2 * s, 0, 0.7 * s, CYL8);
  for (let k = 0; k < 3; k++) { const a = k * 2.1; rod(b, g, 0, 8.2 * s, 0, Math.sin(a) * 0.9 * s, 9.2 * s, Math.cos(a) * 0.9 * s, 0.1 * s, CYL8); }
  box(b, d, 0.5 * s, 1.6 * s, 0, 0.5 * s, 0.8 * s, 0.5 * s);
}

export function jabba(b, s = 1) {
  const skin = 0x8a8a4a, dk = 0x6a6a3a;
  ball(b, skin, 0, 1.6 * s, 0, 2.6 * s, 0.65);
  ball(b, skin, 0, 3.2 * s, 0.4 * s, 1.9 * s, 0.8);
  ball(b, skin, 0, 4.7 * s, 1.0 * s, 1.5 * s, 0.75);
  put(b, CONE, dk, 0, 0.8 * s, -3.4 * s, 1.4 * s, 3 * s, 0.8 * s, -1.4, 0, 0);
  for (const sd of [-1, 1]) { ball(b, 0xff8a10, sd * 0.7 * s, 5.2 * s, 2.1 * s, 0.32 * s); ball(b, C.black, sd * 0.7 * s, 5.2 * s, 2.35 * s, 0.14 * s); }
  box(b, 0x4a3a1a, 0, 4.2 * s, 2.15 * s, 1.8 * s, 0.2 * s, 0.3 * s);
  for (const sd of [-1, 1]) rod(b, skin, sd * 1.6 * s, 3.2 * s, 0.8 * s, sd * 2.2 * s, 2.4 * s, 1.8 * s, 0.35 * s, CYL8);
}
