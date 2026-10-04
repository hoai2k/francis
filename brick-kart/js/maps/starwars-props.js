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
  // C-3PO, the trooper and the Tusken share their prints with the drivers' redesigned
  // heads (../drivers/starwars.js): drawn in world units on a head of the drivers' size.
  c3po: () => printFace('c3po', 0.3708, 0.4867, '#dcaa2a', (g) => {
    const Hc = 0.4867;
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.14, Hc * 0.6, 0.095, 0.085, '#9a7012');                     // eye sockets
      poly(g, '#a87c14', [[sd * 0.085, Hc * 0.45], [sd * 0.105, Hc * 0.45], [sd * 0.12, Hc * 0.08], [sd * 0.1, Hc * 0.08]]);   // cheek lines
      poly(g, '#a87c14', [[sd * 0.3, Hc * 0.9], [sd * 0.32, Hc * 0.9], [sd * 0.32, Hc * 0.1], [sd * 0.3, Hc * 0.1]]);         // jaw seams
    }
    poly(g, '#f6d470', [[-0.016, Hc * 0.62], [0.016, Hc * 0.62], [0.02, Hc * 0.36], [-0.02, Hc * 0.36]]);   // nose
    poly(g, '#a87c14', [[-1.3, Hc * 0.93], [1.3, Hc * 0.93], [1.3, Hc * 0.95], [-1.3, Hc * 0.95]]);         // brow seam
  }, { metal: 0.75, rough: 0.3 }),
  vader: () => face('vader', (g, cx, cy, w, h) => {
    g.fillStyle = '#141414'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2e2e32';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 6, cy - 24); g.lineTo(cx + sd * 36, cy - 20); g.lineTo(cx + sd * 26, cy + 2); g.lineTo(cx + sd * 8, cy - 4); g.fill(); }
    g.fillStyle = '#9a9aa2'; g.beginPath(); g.moveTo(cx, cy - 2); g.lineTo(cx + 22, cy + 34); g.lineTo(cx - 22, cy + 34); g.fill();
    g.strokeStyle = '#141414'; g.lineWidth = 2; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(cx + k * 4, cy + 12); g.lineTo(cx + k * 5, cy + 32); g.stroke(); }
    g.fillStyle = '#5a5a60'; for (const sd of [-1, 1]) g.fillRect(cx + sd * 34 - 3, cy + 6, 6, 22);
  }, { rough: 0.2 }),
  trooper: () => printFace('trooper', 0.403, 0.403, '#f4f4f4', (g) => {
    const Hc = 0.403;
    for (const sd of [-1, 1]) {
      // teardrop lenses, sloping down and out
      g.fillStyle = '#0b0b0d'; g.beginPath();
      g.moveTo(sd * 0.025, Hc * 0.93);
      g.lineTo(sd * 0.19, Hc * 0.9);
      g.quadraticCurveTo(sd * 0.24, Hc * 0.86, sd * 0.22, Hc * 0.72);
      g.quadraticCurveTo(sd * 0.19, Hc * 0.55, sd * 0.11, Hc * 0.57);
      g.quadraticCurveTo(sd * 0.03, Hc * 0.62, sd * 0.025, Hc * 0.93);
      g.fill();
      poly(g, '#3c4a5a', [[sd * 0.07, Hc * 0.86], [sd * 0.15, Hc * 0.85], [sd * 0.14, Hc * 0.81], [sd * 0.07, Hc * 0.82]]);
      // "tear" vents under the lenses and the blue side tubes
      poly(g, '#3a3c40', [[sd * 0.17, Hc * 0.6], [sd * 0.19, Hc * 0.6], [sd * 0.225, Hc * 0.3], [sd * 0.205, Hc * 0.3]]);
      poly(g, '#6a8ab0', [[sd * 0.26, Hc * 0.48], [sd * 0.3, Hc * 0.48], [sd * 0.31, Hc * 0.06], [sd * 0.27, Hc * 0.06]]);
    }
    // nose ridge and the frown round the grille
    poly(g, '#d6d8dc', [[-0.012, Hc * 0.8], [0.012, Hc * 0.8], [0.02, Hc * 0.5], [-0.02, Hc * 0.5]]);
    g.fillStyle = '#26282c'; g.beginPath();
    g.moveTo(-0.23, Hc * 0.02); g.quadraticCurveTo(-0.17, Hc * 0.5, 0, Hc * 0.5); g.quadraticCurveTo(0.17, Hc * 0.5, 0.23, Hc * 0.02);
    g.lineTo(0.18, Hc * 0.02); g.quadraticCurveTo(0.13, Hc * 0.4, 0, Hc * 0.41); g.quadraticCurveTo(-0.13, Hc * 0.4, -0.18, Hc * 0.02);
    g.closePath(); g.fill();
  }),
  boba: () => face('boba', (g, cx, cy, w, h) => {
    g.fillStyle = '#56683e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b0302a'; g.fillRect(0, 0, w, 14);
    g.fillStyle = '#e0c040'; g.fillRect(cx - 50, 14, 22, 8);
    g.fillStyle = '#101010'; g.fillRect(cx - 34, cy - 20, 68, 13); g.fillRect(cx - 7, cy - 10, 14, 40);
    g.fillStyle = '#3a4a2a'; g.fillRect(cx + 16, cy + 8, 8, 12);
  }),
  chewie: () => face('chewie', (g, cx, cy, w, h) => {
    g.fillStyle = '#6a4a2c'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 160; k++) { g.fillStyle = k % 2 ? '#4e341c' : '#8a6440'; g.fillRect((k * 37) % w, (k * 53) % h, 2, 10); }
    g.fillStyle = '#9a7a5a'; g.beginPath(); g.ellipse(cx, cy + 6, 30, 26, 0, 0, Math.PI * 2); g.fill();
    for (const sd of [-1, 1]) { eye(g, cx + sd * 15, cy - 10, 5, 4, '#1a2a4a'); }
    eye(g, cx, cy + 4, 9, 6, '#111'); g.fillStyle = '#2a1a10'; g.fillRect(cx - 12, cy + 18, 24, 5);
  }),
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
  grogu: () => face('grogu', (g, cx, cy, w, h) => {
    g.fillStyle = '#8ab070'; g.fillRect(0, 0, w, h);
    for (const sd of [-1, 1]) { eye(g, cx + sd * 22, cy - 2, 14, 13, '#140c08'); eye(g, cx + sd * 18, cy - 7, 4, 4, '#fff'); }
    g.strokeStyle = '#4a6a3a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy + 16, 8, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
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
// metallic polish: swap the shared vertex-colour plastic for a shiny copy on these meshes
let _polished = null;
function polish(obj) {
  obj.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m || Array.isArray(m) || !m.vertexColors || m.metalness) return;
    _polished ||= Object.assign(m.clone(), { metalness: 0.85, roughness: 0.25 });
    o.material = _polished;
  });
  return obj;
}
function armGroup(s, sd, col, hand, pitch = 0.1, extra) {
  return group((b) => { arm(b, s, sd, col, hand, 0, 0, 0, pitch, 0.06); extra?.(b); }, 'arm');
}

// ---- characters ------------------------------------------------------------------
// C-3PO: polished gold plating, round glowing eyes in dark rims, slanted ear discs, a stiff
// jointed body with the wiring showing at the open waist and one silver shin.
const P3_GOLD = 0xcc9a22, P3_HI = 0xd4a22a, P3_DARK = 0x3a3022, P3_SILVER = 0xb8bcc4;
function c3poArm(b, s, sd) {
  const pa = [s, sd, 0, 0, 0, 0.1, 0.06];
  arm(b, s, sd, P3_GOLD, P3_GOLD, 0, 0, 0, 0.1, 0.06);
  ball(b, P3_HI, sd * 0.02 * s, 0.04 * s, 0, 0.21 * s, 0.9);           // shoulder joint
  armBand(b, P3_DARK, ...pa, 0.28, 0.32, 1.04);                       // joint gaps: shoulder, elbow, wrist
  armBand(b, P3_DARK, ...pa, 0.61, 0.66, 1.04);
  armBand(b, P3_DARK, ...pa, 0.96, 1.0, 1.03);
  const p0 = armPt(...pa, 0.7), p1 = armPt(...pa, 0.93);
  rod(b, P3_SILVER, p0[0] + sd * 0.17 * s, p0[1], p0[2], p1[0] + sd * 0.17 * s, p1[1], p1[2], 0.03 * s, CYL6);   // forearm piston
}
function c3poHead(b, s) {
  const R = 0.4 * s, H = 0.62 * s, Hf = H * 0.78, rAt = (y) => R * (0.84 + 0.16 * y / Hf);
  const rim = plastic(0x2a2214, { rough: 0.45 }), eyeGlow = glow(0xffd23a, 1.8);
  b.add(CHIN, FACES.c3po(), 0, 0, 0, Math.PI, R, Hf, R);
  put(b, HEMI, P3_GOLD, 0, Hf - 0.02 * R, 0, R * 1.02, R * 0.74, R * 1.02);
  put(b, FRONTARC, P3_HI, 0, H * 0.58, 0, rAt(H * 0.58) * 1.07, H * 0.05, rAt(H * 0.58) * 1.07, -0.08);   // brow ridge
  const ey = H * 0.47, er = rAt(ey);
  for (const sd of [-1, 1]) {
    const a = sd * 0.37;
    rod(b, rim, ...onHead(a, ey, er * 0.85), ...onHead(a, ey, er * 1.06), R * 0.165);
    rod(b, eyeGlow, ...onHead(a, ey, er * 1.0), ...onHead(a, ey, er * 1.075), R * 0.11);
    // slanted ear discs
    rod(b, P3_GOLD, sd * R * 0.85, ey, -R * 0.02, sd * R * 1.1, ey + R * 0.04, -R * 0.1, R * 0.26, CYL20);
    rod(b, P3_HI, sd * R * 1.08, ey + R * 0.035, -R * 0.095, sd * R * 1.14, ey + R * 0.045, -R * 0.11, R * 0.17);
    rod(b, P3_DARK, sd * R * 1.13, ey + R * 0.043, -R * 0.108, sd * R * 1.16, ey + R * 0.048, -R * 0.115, R * 0.06, CYL8);
  }
  box(b, P3_HI, 0, H * 0.36, rAt(H * 0.36), R * 0.1, H * 0.17, R * 0.12, -0.12);   // nose
  box(b, rim, 0, H * 0.17, rAt(H * 0.17), R * 0.28, H * 0.045, R * 0.07);          // mouth slot
}
export function c3po(s = 2.6) {
  const root = new THREE.Group();
  root.add(polish(group((b) => {
    fig(b, s, { legs: P3_GOLD, hips: P3_GOLD, torso: P3_GOLD, neck: P3_DARK, noArms: true });
    box(b, P3_SILVER, -0.25 * s, 0.28 * s, 0.03 * s, 0.49 * s, 0.5 * s, 0.58 * s);   // the silver shin
    for (const sd of [-1, 1]) {
      box(b, P3_DARK, sd * 0.25 * s, 0.56 * s, 0.03 * s, 0.5 * s, 0.06 * s, 0.59 * s);   // knee and ankle joints
      box(b, P3_DARK, sd * 0.25 * s, 0.09 * s, 0.03 * s, 0.5 * s, 0.04 * s, 0.59 * s);
      box(b, P3_HI, sd * 0.25 * s, 0.75 * s, 0.32 * s, 0.32 * s, 0.3 * s, 0.03 * s);    // thigh plates
    }
    // chest plate, collar and power socket
    put(b, TRAP, P3_HI, 0, 1.95 * s, 0, 1.03 * s, 0.5 * s, 0.6 * s);
    rod(b, P3_GOLD, 0, 2.43 * s, 0, 0, 2.5 * s, 0, 0.3 * s, CYL20);
    for (const sd of [-1, 1]) box(b, P3_GOLD, sd * 0.2 * s, 2.2 * s, 0.305 * s, 0.32 * s, 0.26 * s, 0.04 * s, -0.04);
    rod(b, P3_DARK, 0, 2.06 * s, 0.28 * s, 0, 2.06 * s, 0.33 * s, 0.07 * s);
    rod(b, P3_SILVER, 0, 2.06 * s, 0.32 * s, 0, 2.06 * s, 0.345 * s, 0.035 * s);
    box(b, P3_DARK, 0, 1.98 * s, 0.305 * s, 0.7 * s, 0.03 * s, 0.02 * s);
    // the open waist: dark frame with a silver piston (the wires are matte, below)
    box(b, P3_DARK, 0, 1.66 * s, 0, 0.92 * s, 0.56 * s, 0.57 * s);
    rod(b, P3_SILVER, 0, 1.4 * s, 0.29 * s, 0, 1.94 * s, 0.29 * s, 0.045 * s, CYL8);
    // pelvis band and plate
    box(b, P3_GOLD, 0, 1.32 * s, 0, 1.1 * s, 0.18 * s, 0.58 * s);
    box(b, P3_HI, 0, 1.24 * s, 0.3 * s, 0.4 * s, 0.26 * s, 0.04 * s);
    // back plate and socket
    box(b, P3_GOLD, 0, 2.15 * s, -0.3 * s, 0.66 * s, 0.4 * s, 0.04 * s, 0.04);
    rod(b, P3_DARK, 0, 2.17 * s, -0.3 * s, 0, 2.17 * s, -0.34 * s, 0.07 * s);
  }, 'c3po')));
  // coloured wiring across the open waist, front and back (matte)
  root.add(group((b) => {
    for (const [x, c, bend] of [[-0.3, 0xc82a20, 0.05], [-0.2, 0x2a5ac8, -0.04], [-0.1, 0x1a1a1a, 0.04], [0.1, 0xc82a20, -0.05], [0.2, 0x2a2a2a, 0.04], [0.3, 0x2a5ac8, -0.04]]) {
      rod(b, c, x * s, 1.42 * s, 0.29 * s, (x + bend) * s, 1.66 * s, 0.305 * s, 0.03 * s, CYL6);
      rod(b, c, (x + bend) * s, 1.66 * s, 0.305 * s, x * s, 1.92 * s, 0.29 * s, 0.03 * s, CYL6);
    }
    for (const [x, c] of [[-0.14, 0xc82a20], [0, 0x2a5ac8], [0.14, 0x1a1a1a]]) rod(b, c, x * s, 1.42 * s, -0.29 * s, (x + 0.06) * s, 1.92 * s, -0.29 * s, 0.03 * s, CYL6);
  }, 'c3po-wires'));
  const head = polish(group((b) => c3poHead(b, s), 'c3po-head'));
  const hp = pivot(head, 0, 2.56 * s, 0);
  root.add(hp);
  const arms = [-1, 1].map((sd) => { const a = pivot(polish(group((b) => c3poArm(b, s, sd), 'arm')), sd * 0.56 * s, 2.3 * s, 0); root.add(a); return a; });
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

export function grogu(s = 2.6) {
  const root = new THREE.Group();
  const pram = group((b) => {
    put(b, HEMI, metal(0xd8dadc, 0.25), 0, 0, 0, 0.8 * s, 0.55 * s, 0.8 * s, Math.PI, 0, 0);
    rod(b, 0xa0a4a8, 0, -0.02 * s, 0, 0, 0.04 * s, 0, 0.82 * s, CYL20);
    ball(b, glow(0x9ad8ff, 1.5), 0, -0.55 * s, 0, 0.2 * s);
    ball(b, 0xc8b08a, 0, 0.02 * s, 0, 0.42 * s, 0.7);
  }, 'pram');
  root.add(pram);
  const head = group((b) => {
    b.add(HEAD, FACES.grogu(), 0, 0, 0, Math.PI, 0.3 * s, 0.42 * s, 0.3 * s);
    put(b, HEMI, 0x8ab070, 0, 0.42 * s, 0, 0.3 * s, 0.18 * s, 0.3 * s);
    for (const sd of [-1, 1]) rod(b, 0x8ab070, sd * 0.25 * s, 0.26 * s, 0, sd * 0.95 * s, 0.4 * s, -0.05 * s, 0.2 * s, BOX, 0.05 * s);
    for (const sd of [-1, 1]) rod(b, 0xd89a9a, sd * 0.3 * s, 0.26 * s, 0.02 * s, sd * 0.85 * s, 0.38 * s, -0.02 * s, 0.1 * s, BOX, 0.06 * s);
  }, 'grogu');
  const hp = pivot(head, 0, 0.12 * s, 0);
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

// Stormtrooper: domed helmet with a brow ridge, black lenses and the frowning grille, white
// armour plates over a black undersuit, utility belt, an E-11 held at port arms.
const TW = 0xf4f4f4, TB = 0x18181a, TG = 0x8c9198, TBL = 0x5a7896;
function trooperHelmet(b, R, H, y0) {
  const Hc = H * 0.62;
  b.add(HEAD, FACES.trooper(), 0, y0, 0, Math.PI, R, Hc, R);
  put(b, HEMI, TW, 0, y0 + Hc - 0.02 * R, -R * 0.02, R * 1.05, R * 1.0, R * 1.07);
  put(b, FRONTARC, TW, 0, y0 + Hc - H * 0.06, 0, R * 1.1, H * 0.08, R * 1.1);   // brow ridge
  put(b, FLARE, TW, 0, y0 - H * 0.05, 0, R * 1.02, Hc * 0.82, R * 1.02);        // flared jaw / neck guard
  // the grille: a raised box with black slots, and two little breather tubes under it
  box(b, 0x6a6e74, 0, y0 + Hc * 0.26, R * 0.98, R * 0.36, Hc * 0.2, R * 0.1);
  for (let k = -2; k <= 2; k++) box(b, TB, k * R * 0.065, y0 + Hc * 0.26, R * 1.03, R * 0.03, Hc * 0.16, R * 0.03);
  for (const sd of [-1, 1]) {
    const p = onHead(sd * 0.2, y0 + Hc * 0.1, R * 0.9), q = onHead(sd * 0.24, y0 - Hc * 0.02, R * 1.08);
    rod(b, TG, ...p, ...q, R * 0.055, CYL8);
    // ear caps with a grey centre and black vents
    rod(b, TW, sd * R * 1.0, y0 + Hc * 0.5, -R * 0.06, sd * R * 1.27, y0 + Hc * 0.5, -R * 0.06, R * 0.25);
    rod(b, TG, sd * R * 1.26, y0 + Hc * 0.5, -R * 0.06, sd * R * 1.3, y0 + Hc * 0.5, -R * 0.06, R * 0.15);
    for (const dz of [-0.12, 0, 0.12]) box(b, TB, sd * R * 1.31, y0 + Hc * 0.5, (dz - 0.06) * R, R * 0.02, R * 0.2, R * 0.04);
  }
}
export function trooper(b, s = 1.6) {
  const pitch = 0.7, spread = 0.1;
  fig(b, s, { legs: TW, hips: TB, torso: TB, neck: TB, arms: TW, hands: TB, armPitch: pitch });
  trooperHelmet(b, 0.41 * s, 0.66 * s, 2.56 * s);
  // legs: black knee gaps, shin plates
  for (const sd of [-1, 1]) {
    box(b, TB, sd * 0.25 * s, 0.52 * s, 0.03 * s, 0.48 * s, 0.06 * s, 0.57 * s);
    box(b, 0xe4e6ea, sd * 0.25 * s, 0.27 * s, 0.32 * s, 0.3 * s, 0.32 * s, 0.03 * s);
  }
  // chest + back armour shell over the black undersuit
  put(b, TRAP, TW, 0, 1.86 * s, 0, 1.08 * s, 0.6 * s, 0.6 * s);
  box(b, 0xe4e6ea, 0, 2.13 * s, 0.31 * s, 0.6 * s, 0.4 * s, 0.03 * s, -0.04);   // raised chest plate
  box(b, TB, 0, 2.13 * s, 0.327 * s, 0.02 * s, 0.38 * s, 0.01 * s, -0.04);
  for (const sd of [-1, 1]) {
    box(b, TB, sd * 0.19 * s, 1.96 * s, 0.32 * s, 0.18 * s, 0.03 * s, 0.01 * s, 0, 0, sd * 0.2);
    box(b, TB, sd * 0.36 * s, 2.13 * s, 0.31 * s, 0.035 * s, 0.46 * s, 0.02 * s, -0.04, 0, sd * 0.12);   // chest-plate edges
    box(b, TB, sd * 0.2 * s, 2.4 * s, 0.29 * s, 0.26 * s, 0.03 * s, 0.03 * s, 0, 0, -sd * 0.12);        // collar line
  }
  // ab plate with its little control buttons, dark ribs either side
  box(b, TW, 0, 1.62 * s, 0.285 * s, 0.46 * s, 0.3 * s, 0.04 * s);
  box(b, TG, 0, 1.64 * s, 0.306 * s, 0.26 * s, 0.15 * s, 0.01 * s);
  for (let k = 0; k < 4; k++) box(b, k % 2 ? TBL : TB, (-0.1 + k * 0.066) * s, 1.64 * s, 0.313 * s, 0.045 * s, 0.09 * s, 0.01 * s);
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) box(b, 0x3a3c40, sd * 0.37 * s, (1.5 + k * 0.1) * s, 0.28 * s, 0.17 * s, 0.04 * s, 0.02 * s);
  box(b, TW, 0, 1.6 * s, -0.29 * s, 0.82 * s, 0.32 * s, 0.05 * s);   // kidney plate
  // utility belt: pouches, buckle, thermal detonator on the back
  box(b, TW, 0, 1.33 * s, 0, 1.1 * s, 0.17 * s, 0.6 * s);
  box(b, 0xc4c8cc, 0, 1.42 * s, 0, 1.11 * s, 0.03 * s, 0.61 * s);
  box(b, TG, 0, 1.34 * s, 0.31 * s, 0.22 * s, 0.15 * s, 0.04 * s);
  box(b, TB, 0, 1.34 * s, 0.33 * s, 0.13 * s, 0.04 * s, 0.01 * s);
  for (const x of [-0.45, -0.28, 0.28, 0.45]) {
    box(b, TW, x * s, 1.31 * s, 0.32 * s, 0.14 * s, 0.17 * s, 0.08 * s);
    box(b, TG, x * s, 1.39 * s, 0.36 * s, 0.14 * s, 0.02 * s, 0.01 * s);
  }
  rod(b, 0xb8bcc2, -0.1 * s, 1.33 * s, -0.34 * s, -0.48 * s, 1.33 * s, -0.34 * s, 0.09 * s);
  for (const x of [-0.18, -0.4]) rod(b, TB, x * s, 1.33 * s, -0.34 * s, (x - 0.04) * s, 1.33 * s, -0.34 * s, 0.095 * s);
  // arms: shoulder bells, black undersuit gaps at the bell and elbow
  for (const sd of [-1, 1]) {
    const pa = [s, sd, sd * 0.56 * s, 2.3 * s, 0, pitch, spread];
    ball(b, TW, sd * 0.58 * s, 2.3 * s, 0.02 * s, 0.21 * s, 0.85);
    armBand(b, TB, ...pa, 0.3, 0.36, 1.06);
    armBand(b, TB, ...pa, 0.62, 0.68, 1.06);
  }
  // E-11 blaster held across the chest, muzzle up to his left
  const g0 = [-0.8 * s, 1.36 * s, 0.7 * s], g1 = [0.95 * s, 1.86 * s, 0.74 * s];
  const at = (t, dy = 0, dz = 0) => [g0[0] + (g1[0] - g0[0]) * t, g0[1] + (g1[1] - g0[1]) * t + dy, g0[2] + (g1[2] - g0[2]) * t + dz];
  rod(b, 0x2a2c30, ...at(0.08), ...at(0.62), 0.15 * s, BOX, 0.13 * s);
  rod(b, 0x2a2c30, ...at(0.6), ...at(1.0), 0.05 * s, CYL8);
  rod(b, 0x6a6e72, ...at(0.3, 0.11 * s), ...at(0.52, 0.11 * s), 0.06 * s, CYL8);   // scope
  rod(b, 0x2a2c30, ...at(0.4, -0.08 * s), ...at(0.4, -0.24 * s, 0.04 * s), 0.07 * s, BOX, 0.06 * s);   // magazine
  rod(b, 0x2a2c30, ...at(0.0), ...at(0.1), 0.06 * s, BOX, 0.1 * s);   // folded stock
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

export function chewie(s = 3.0) {
  const root = new THREE.Group();
  const fur = 0x6a4a2c, fur2 = 0x4e341c;
  root.add(group((b) => {
    fig(b, s, { legs: fur, hips: fur2, torso: fur, face: FACES.chewie(), neck: fur, noArms: true, noStud: true, headR: 0.42 });
    put(b, HEMI, fur, 0, 2.56 * s + 0.66 * s, 0, 0.42 * s, 0.25 * s, 0.42 * s);
    for (let k = 0; k < 14; k++) box(b, k % 2 ? fur2 : 0x8a6440, ((k * 0.37) % 1 - 0.5) * 0.9 * s, (0.2 + (k * 0.23) % 1 * 2.0) * s, 0.29 * s, 0.1 * s, 0.35 * s, 0.03 * s);
    box(b, 0x3a2a1a, 0, 1.9 * s, 0.02 * s, 0.14 * s, 1.5 * s, 0.6 * s, 0, 0, 0.7);
    for (let k = 0; k < 5; k++) box(b, metal(0xb0b4b8, 0.3), (-0.3 + k * 0.14) * s, (1.55 + k * 0.17) * s, 0.3 * s, 0.1 * s, 0.1 * s, 0.05 * s);
    arm(b, s, -1, fur, fur2, -0.56 * s, 2.3 * s, 0, 0.35);
    box(b, 0x5a3a24, -0.65 * s, 1.15 * s, 0.35 * s, 0.25 * s, 0.35 * s, 1.6 * s);
  }, 'chewie'));
  const ap = pivot(armGroup(s, 1, fur, fur2), 0.56 * s, 2.3 * s, 0);
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
