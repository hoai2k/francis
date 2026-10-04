// Jujutsu Kaisen brick characters and props for the "Cursed Brick Shibuya" map.
// Characters are LEGO-minifig-style statues/figures built from boxes, cylinders
// and cones. Printed faces come from one shared canvas atlas so every head uses
// the same material. Animated parts (arms, wheels, orbs) are separate groups.
import { THREE, BrickBuilder, C, plastic, mat4 } from './kit.js';

// ---- shared geometry -------------------------------------------------------------
const geoCache = new Map();
const G = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
const coneGeo = () => G('cone6', () => new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0));
const frustum = (rt, rb, seg = 14) => G(`fr${rt},${rb},${seg}`, () => new THREE.CylinderGeometry(rt, rb, 1, seg).translate(0, 0.5, 0));
function taperGeo(bw, tw, h, d, td = d) {
  return G(`tp${bw},${tw},${h},${d},${td}`, () => {
    const g = new THREE.BoxGeometry(bw, h, d);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * (tw / bw)); p.setZ(i, p.getZ(i) * (td / d)); }
    g.computeVertexNormals();
    return g.translate(0, h / 2, 0);
  });
}
// spike/cone with a tilt (hair, horns, claws)
export function spike(b, x, y, z, r, h, rx, rz, color, ry = 0, opts) {
  const m = mat4(x, y, z, rx, ry, rz, r, h, r);
  b.addMatrix(coneGeo(), opts?.mat || plastic(color, opts?.matOpts), m);
}
// box with full rotation, centred
export function rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts) { b.boxM(mat4(x, y, z, rx, ry, rz, sx, sy, sz), color, opts); }

// ---- glow ------------------------------------------------------------------------------
let glowTexture = null;
export function glowTex() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}
const glowMats = new Map();
export function glowMat(color, opacity = 0.9) {
  const key = color + '|' + opacity;
  let m = glowMats.get(key);
  if (!m) { m = new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); glowMats.set(key, m); }
  return m;
}
export function glow(color, size, opacity = 0.9) { const s = new THREE.Sprite(glowMat(color, opacity)); s.scale.setScalar(size); return s; }
// glowing emissive plastic
export const neon = (color, k = 2) => plastic(color, { emissive: color, emissiveIntensity: k });

// ---- face atlas ----------------------------------------------------------------------------
const FACES = ['gojo', 'gojoEyes', 'yuji', 'sukuna', 'mahito', 'megumi', 'nobara', 'todo', 'nanami', 'geto', 'yuta', 'maki', 'jogo', 'cursed', 'rika', 'cursed2', 'mahoraga'];
const ROWS = Math.ceil(FACES.length / 4);
const SKIN = { gojo: '#f7e2cf', gojoEyes: '#f7e2cf', sukuna: '#f3d6bf', mahito: '#e4dcd6', jogo: '#c9c6bd', cursed: '#b9a9c4', cursed2: '#a9b9a4', rika: '#ebe6dc', todo: '#c68a58', nanami: '#f0cda8', mahoraga: '#ece8e0' };
let faceMatCache = null;
function drawFace(g, name, W, H) {
  const skin = SKIN[name] || '#f3d2b3';
  g.fillStyle = skin; g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  // squeeze x so features look round on the cylinder
  g.save(); g.translate(cx, cy); g.scale(0.57, 1);
  const ell = (x, y, rx, ry, col, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const eyes = (iris, { y = -12, dx = 30, rx = 11, ry = 12, white = true, pupil = '#111' } = {}) => {
    for (const sd of [-1, 1]) {
      if (white) ell(sd * dx, y, rx + 3, ry + 1, '#fff');
      ell(sd * dx, y + 1, rx, ry, iris);
      ell(sd * dx, y + 2, rx * 0.45, ry * 0.5, pupil);
      ell(sd * dx - 4, y - 4, 3, 3, '#fff');
      line([[sd * (dx - rx - 4), y - ry - 2], [sd * (dx + rx + 4), y - ry - 4]], '#1b1b1b', 4);
    }
  };
  const brows = (col, y = -34, tilt = 0) => { for (const sd of [-1, 1]) line([[sd * 16, y + tilt], [sd * 44, y - tilt]], col, 6); };
  const smile = (w = 18, y = 22, col = '#3a1a1a') => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(0, y - 10, w, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); };
  const grin = (w = 26, y = 20, teeth = '#fff', dark = '#3a0a0a') => { g.fillStyle = dark; g.beginPath(); g.moveTo(-w, y); g.quadraticCurveTo(0, y + 24, w, y); g.closePath(); g.fill(); g.fillStyle = teeth; g.fillRect(-w * 0.8, y + 1, w * 1.6, 5); };
  const flat = (w = 14, y = 26) => line([[-w, y], [w, y]], '#3a1a1a', 5);
  switch (name) {
    case 'gojo':
      g.restore(); g.fillStyle = '#15161c'; g.fillRect(0, cy - 34, W, 30); g.save(); g.translate(cx, cy); g.scale(0.57, 1);
      smile(16, 26); break;
    case 'gojoEyes':
      for (const sd of [-1, 1]) { ell(sd * 30, -12, 15, 13, '#fff'); ell(sd * 30, -11, 11, 12, '#38c8ff'); ell(sd * 30, -11, 6, 7, '#bff4ff'); ell(sd * 26, -16, 3, 3, '#fff'); line([[sd * 12, -26], [sd * 48, -28]], '#e8e8f0', 5); }
      brows('#f0f0f4', -38); smile(18, 26); break;
    case 'yuji':
      eyes('#7a4a2a'); brows('#4a2a2a', -36, 3); for (const sd of [-1, 1]) line([[sd * 22, 6], [sd * 38, 4]], '#8a4a3a', 3); smile(20, 24); break;
    case 'sukuna':
      eyes('#d01a1a', { ry: 9, rx: 10 }); for (const sd of [-1, 1]) { ell(sd * 34, 8, 7, 5, '#fff'); ell(sd * 34, 8, 4, 4, '#b01010'); }
      for (const sd of [-1, 1]) { line([[sd * 14, -28], [sd * 50, -30]], '#111', 5); line([[sd * 46, 18], [sd * 64, 18]], '#111', 4); line([[sd * 46, 25], [sd * 64, 25]], '#111', 4); }
      line([[0, -52], [0, -40]], '#111', 5); grin(28, 24); break;
    case 'mahito':
      eyes('#8a9ab8', { dx: 30 }); ell(30, -11, 10, 11, '#4a6aa0'); ell(30, -10, 4, 5, '#111');
      line([[-70, -50], [-10, 0], [60, 40]], '#5a3a4a', 3); for (let k = 0; k < 7; k++) { const x = -64 + k * 19, y = -45 + k * 13; line([[x - 5, y + 6], [x + 5, y - 6]], '#5a3a4a', 3); }
      line([[-60, 30], [-30, 44]], '#5a3a4a', 3); grin(30, 20); break;
    case 'megumi':
      eyes('#2a3a5a'); brows('#111', -34, -4); flat(12, 28); break;
    case 'nobara':
      eyes('#8a5a2a', { ry: 13 }); for (const sd of [-1, 1]) line([[sd * 42, -24], [sd * 50, -30]], '#111', 3); brows('#7a4a2a', -38, 2);
      g.strokeStyle = '#b04050'; g.lineWidth = 5; g.beginPath(); g.moveTo(-14, 26); g.quadraticCurveTo(4, 32, 18, 20); g.stroke(); break;
    case 'todo':   // (same print as the Todo driver) scar through the left eye, thick brows, big grin
      ell(0, -30, 62, 10, '#b57a4a');
      for (const sd of [-1, 1]) {
        g.fillStyle = '#121212'; g.beginPath(); g.moveTo(sd * 8, -28); g.lineTo(sd * 54, -48); g.lineTo(sd * 58, -38); g.lineTo(sd * 12, -18); g.closePath(); g.fill();
        ell(sd * 32, -12, 13, 7, '#fff'); ell(sd * 30, -12, 6, 6, '#111'); ell(sd * 28, -14, 2, 2, '#fff');
        line([[sd * 16, -18], [sd * 48, -20]], '#111', 4);
        line([[sd * 20, 14], [sd * 34, 30]], '#9a6036', 3);
      }
      line([[34, -62], [30, -26]], '#efc59c', 6); line([[30, -4], [38, 30]], '#efc59c', 6);
      for (const [x, y] of [[33, -50], [32, -36], [33, 6], [36, 20]]) line([[x - 7, y], [x + 7, y + 2]], '#efc59c', 3);
      line([[0, -14], [-4, 6], [4, 10]], '#93582e', 4);
      g.fillStyle = '#3a120c'; g.beginPath(); g.moveTo(-34, 24); g.quadraticCurveTo(0, 54, 34, 24); g.quadraticCurveTo(0, 30, -34, 24); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-28, 27); g.quadraticCurveTo(0, 34, 28, 27); g.lineTo(26, 32); g.quadraticCurveTo(0, 38, -26, 32); g.closePath(); g.fill();
      line([[-6, 54], [-3, 60]], '#93582e', 3); line([[6, 54], [3, 60]], '#93582e', 3); break;
    case 'nanami':   // stern and tired; the goggles are geometry
      for (const sd of [-1, 1]) {
        line([[sd * 12, -44], [sd * 52, -47]], '#9a7230', 8); ell(sd * 30, -18, 30, 17, '#3a3a2a');
        line([[sd * 18, 0], [sd * 42, 0]], '#d4a582', 3); line([[sd * 20, 10], [sd * 30, 32]], '#c4946e', 3);
      }
      line([[0, -6], [5, 12], [-2, 15]], '#b98663', 4); line([[-18, 33], [0, 31], [18, 34]], '#5a2a20', 5); line([[-7, 50], [7, 50]], '#d4a684', 3); break;
    case 'mahoraga':   // heavy brow, dark eye sockets the wings grow from, stern statue mouth
      ell(0, -36, 70, 9, '#d9d4ca');
      for (const sd of [-1, 1]) { ell(sd * 32, -14, 20, 9, '#4a4a52'); ell(sd * 32, -13, 13, 5, '#16161a'); }
      line([[0, -26], [0, 8]], '#cbc5bb', 6); ell(-7, 12, 5, 3, '#9a948a'); ell(7, 12, 5, 3, '#9a948a');
      ell(0, 32, 30, 10, '#b0a29f'); line([[-30, 31], [0, 34], [30, 31]], '#3a2c2c', 5); line([[-12, 48], [12, 48]], '#d0cac0', 4);
      for (const sd of [-1, 1]) line([[sd * 60, 0], [sd * 50, 40], [sd * 22, 58]], '#d6d1c7', 4); break;
    case 'geto':
      for (const sd of [-1, 1]) line([[sd * 16, -12], [sd * 44, -16]], '#111', 5); brows('#111', -30, -2);
      line([[-60, -46], [60, -46]], '#6a3a3a', 3); for (let k = -3; k <= 3; k++) line([[k * 17, -52], [k * 17, -40]], '#6a3a3a', 3); smile(22, 26); break;
    case 'yuta':
      eyes('#1a1a2a', { ry: 10 }); for (const sd of [-1, 1]) line([[sd * 20, 4], [sd * 42, 4]], '#9a8a9a', 3); brows('#111', -34, -2); smile(12, 26); break;
    case 'maki':
      eyes('#4a3a2a', { ry: 9 }); for (const sd of [-1, 1]) { g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(sd * 30 - 20, -26, 40, 26); } line([[-10, -14], [10, -14]], '#111', 4); flat(12, 28); break;
    case 'jogo':   // one huge red eye under a scowling lid, wide black-lipped mouth
      ell(0, -12, 40, 27, '#5e5a52'); ell(0, -10, 36, 23, '#fbf6ea');
      ell(2, -8, 20, 18, '#c0201a'); ell(2, -8, 10, 10, '#140808'); ell(-6, -15, 5, 4, '#fff');
      g.fillStyle = '#4a4740'; g.beginPath(); g.moveTo(-46, -30); g.lineTo(46, -20); g.lineTo(44, -10); g.quadraticCurveTo(0, -30, -44, -22); g.closePath(); g.fill();
      g.fillStyle = '#121212'; g.beginPath(); g.moveTo(-50, 24); g.quadraticCurveTo(0, 18, 50, 24); g.quadraticCurveTo(46, 52, 0, 54); g.quadraticCurveTo(-46, 52, -50, 24); g.fill();
      g.fillStyle = '#3e3d3a'; for (let k = -4; k <= 4; k++) { g.fillRect(k * 10 - 4, 28, 8, 9); g.fillRect(k * 9 - 3.5, 40, 7, 8); }
      for (const sd of [-1, 1]) line([[sd * 54, 18], [sd * 60, 36]], '#9a978e', 3); break;
    case 'cursed': case 'cursed2':
      ell(-34, -18, 10, 12, '#fff'); ell(-34, -16, 5, 6, '#111'); ell(26, -6, 16, 9, '#fff'); ell(28, -5, 6, 5, '#111'); ell(-4, -40, 7, 6, '#fff'); ell(-4, -39, 3, 3, '#111');
      ell(0, 26, 18, 14, '#2a0a1a'); for (let k = -2; k <= 2; k++) { g.fillStyle = '#fff'; g.fillRect(k * 7 - 2, 14, 4, 6); } break;
    case 'rika':
      ell(-26, -30, 8, 10, '#111'); ell(26, -30, 8, 10, '#111'); ell(-24, -33, 3, 3, '#fff');
      g.fillStyle = '#1a0a0a'; g.beginPath(); g.ellipse(0, 18, 70, 34, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f4f0e6'; for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(k * 11 - 5, -10); g.lineTo(k * 11 + 5, -10); g.lineTo(k * 11, 6); g.fill(); g.beginPath(); g.moveTo(k * 11 - 5, 48); g.lineTo(k * 11 + 5, 48); g.lineTo(k * 11, 32); g.fill(); } break;
  }
  g.restore();
}
function faceAtlas() {
  if (faceMatCache) return faceMatCache;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128 * ROWS;
  const g = c.getContext('2d');
  FACES.forEach((n, k) => { g.save(); g.translate((k % 4) * 256, Math.floor(k / 4) * 128); g.beginPath(); g.rect(0, 0, 256, 128); g.clip(); drawFace(g, n, 256, 128); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  faceMatCache = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.28 });
  return faceMatCache;
}
// unit head cylinder (r 1, h 1, bottom at 0) with UVs remapped into the face's atlas cell
function faceGeo(name) {
  return G('face' + name, () => {
    const k = FACES.indexOf(name);
    const u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / ROWS;
    const g = new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0);
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, u0 + 0.01, v0 + 0.08 / ROWS);   // caps: plain skin
      else uv.setXY(i, u0 + uv.getX(i) * 0.25, v0 + (0.02 + uv.getY(i) * 0.96) / ROWS);
    }
    return g;
  });
}
export function head(b, name, x, y, z, r, h, rot = Math.PI) { b.add(faceGeo(name), faceAtlas(), x, y, z, rot, r, h, r); }

// ---- humanoid (minifig proportions, ~3.9 * s tall) ----------------------------------
// Returns { root, body, armL, armR, s, top }. Local +Z is the front.
// o: { s, face, skin, torso, legs, shoes, hips, arms, hands, hair(b,s), extra(b,s), itemL(b,s), itemR(b,s), arm(a,sd,s), headR, headH, collar, buttons, wide }
export function humanoid(o) {
  const s = o.s, wide = o.wide ?? 1;
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const legs = o.legs ?? 0x1f2433, skin = o.skinHex ?? 0xf3d2b3;
  if (!o.noLegs) for (const sd of [-1, 1]) {
    b.box(sd * 0.27 * s * wide, 0, 0.06 * s, 0.5 * s * wide, 0.28 * s, 0.76 * s, o.shoes ?? C.black);
    b.box(sd * 0.27 * s * wide, 0.28 * s, 0, 0.5 * s * wide, 1.02 * s, 0.6 * s, legs);
  }
  b.box(0, 1.3 * s, 0, 1.08 * s * wide, 0.26 * s, 0.62 * s, o.hips ?? legs);
  b.add(taperGeo(1.14 * wide, 0.86 * wide, 1.3, 0.64), plastic(o.torso), 0, 1.56 * s, 0, 0, s, s, s);
  if (o.collar !== false) b.cyl(0, 2.78 * s, 0, 0.36 * s, 0.22 * s, o.collar ?? o.torso, { seg: 12 });
  if (o.buttons) for (let k = 0; k < 3; k++) b.box(0, (2.3 - k * 0.3) * s, 0.31 * s, 0.1 * s, 0.1 * s, 0.06 * s, o.buttons);
  b.cyl(0, 2.86 * s, 0, 0.2 * s, 0.14 * s, skin, { seg: 10 });
  const hr = o.headR ?? 0.43, hh = o.headH ?? 0.74;
  if (o.face) head(b, o.face, 0, 2.98 * s, 0, hr * s, hh * s);
  else b.cyl(0, 2.98 * s, 0, hr * s, hh * s, skin, { seg: 16 });
  const top = (2.98 + hh) * s;
  o.hair?.(b, s, top);
  o.extra?.(b, s);
  const body = b.build({ name: 'fig-body' });
  root.add(body);
  const arms = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group();
    pv.position.set(sd * 0.56 * s * wide, 2.64 * s, 0);
    const a = new BrickBuilder(1);
    a.add(taperGeo(0.36, 0.42, 1.12, 0.44), plastic(o.arms ?? o.torso), 0, -1.12 * s, 0, 0, s * wide, s, s);
    a.cyl(0, -1.42 * s, 0, 0.19 * s, 0.34 * s, o.hands ?? skin, { seg: 10 });
    o.arm?.(a, sd, s);
    (sd < 0 ? o.itemR : o.itemL)?.(a, s);
    pv.add(a.build({ name: 'fig-arm' }));
    pv.rotation.z = sd * 0.1;
    root.add(pv);
    arms.push(pv);
  }
  return { root, body, armR: arms[0], armL: arms[1], s, top };
}

// ---- the JJK drivers' modelling, ported onto these standing figures -------------------------
// The Todo / Nanami / Jogo / Mahoraga drivers (js/drivers/jjk.js) are modelled in a seated rig's
// units. Their parts are drawn here through affine "frames" that map the rig's torso, head and
// arms onto this humanoid's, so the track figures wear the same designs (still one merged mesh
// per builder: every part goes through BrickBuilder.addMatrix).
const PI = Math.PI, SIN = Math.sin, INK = 0x15161c;
const _xm = new THREE.Matrix4();
// a view of builder b that transforms every part by M first
function xf(b, M) { const o = Object.create(b); o.addMatrix = (geo, mat, m) => b.addMatrix(geo, mat, _xm.multiplyMatrices(M, m)); return o; }
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
// XYZ-order transform and rotated box, as in the drivers' kit
const m4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _w.set(sx, sy, sz));
const dbox = (b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts) => b.boxM(m4(x, y, z, rx, ry, rz, sx, sy, sz), color, opts);
const sxf = (x, y, z, sx, sy, sz) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
// a rod (cylinder) between two points
function rod(b, a, c, r, color, seg = 8) {
  const A = new THREE.Vector3(...a), dir = new THREE.Vector3(...c).sub(A), len = dir.length();
  const m = new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), new THREE.Vector3(r, len, r));
  b.addMatrix(G('rod' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0)), typeof color === 'number' ? plastic(color) : color, m);
}
const sph12 = () => G('sph12', () => new THREE.SphereGeometry(1, 12, 8));
// squashed ellipsoid (spots, muscles); ry turns it about Y
const blob = (b, x, y, z, sx, sy, sz, color, ry = 0) => b.add(sph12(), typeof color === 'number' ? plastic(color) : color, x, y, z, ry, sx, sy, sz);
// pointed flat blade (wing fin) from its base: phi = angle in XY from +X, psi = sweep about Y
const feather = (b, x, y, z, phi, psi, L, w, t, color) => b.addMatrix(taperGeo(1, 0.18, 1, 1), plastic(color), m4(x, y, z, 0, psi, phi - PI / 2, w, L, t));
const lerp = (a, c, k) => a + (c - a) * k;
// head frame: a rig head (radius dr, height dh, base at 0) onto this humanoid's head (base at top - hh*s)
const headXf = (b, s, top, dr, dh, hr = 0.43, hh = 0.74) => xf(b, sxf(0, top - hh * s, 0, (hr * s) / dr, (hh * s) / dh, (hr * s) / dr));
// torso / arm frames for a rig of scale ds, wide W, deep D onto humanoid({ s, wide: w })
function frames(s, w, ds, W, D) {
  const kx = (1.14 * w * s) / (0.92 * W * ds), ky = (1.3 * s) / (0.82 * ds), kz = (0.32 * s) / (0.21 * D * ds), aw = Math.sqrt(W);
  return {
    s, w, kx, ky, kz,
    d: { s: ds, W, D },
    torso: sxf(0, 1.56 * s - 0.18 * ds * ky, 0, kx, ky, kz),
    arm: sxf(0, 0, 0, (0.42 * w * s) / (0.26 * aw * ds), (1.12 * s) / (0.52 * ds), (0.44 * s) / (0.26 * aw * ds)),
  };
}
// a point on this humanoid's torso surface in rig units: side 'f' | 'b' (u across) or +-1 (u = depth)
function torsoPt(F, side, u, y) {
  const t = Math.min(1, Math.max(0, ((y - 0.18 * F.d.s) * F.ky) / (1.3 * F.s)));
  const hw = ((0.57 - 0.14 * t) * F.w * F.s) / F.kx, hd = (0.322 * F.s) / F.kz;
  if (side === 'f') return [u * hw, y, hd, 0];
  if (side === 'b') return [u * hw, y, -hd, 0];
  return [side * hw * 1.01, y, u * hd, PI / 2];
}
const torsoSpot = (b, F, side, u, y, rx, ry, color) => { const [x, yy, z, rot] = torsoPt(F, side, u, y); blob(b, x, yy, z, rx, ry, 0.014, color, rot); };

// Aoi Todo: slicked back with sideburns, tied into a top-knot (rig head r 0.406, h 0.725)
function todoHair(b, r, h) {
  b.cyl(0, h * 0.86, 0, r * 1.04, h * 0.14 + 0.01, INK, { seg: 18 });
  b.sphere(0, h, 0, r * 1.04, INK, { sy: 0.32 });
  b.cyl(0, h * 0.2, -r * 0.1, r * 1.04, h * 0.72, INK, { seg: 18 });
  for (const sd of [-1, 1]) b.box(sd * r * 0.99, h * 0.44, r * 0.1, 0.03, h * 0.32, r * 0.16, INK);
  b.cyl(0, h + r * 0.22, -r * 0.3, r * 0.22, 0.1, 0x8a1a1a, { seg: 10 });
  b.sphere(0, h + r * 0.22 + 0.17, -r * 0.34, r * 0.4, INK, { sy: 0.85 });
  spike(b, 0, h + r * 0.22 + 0.22, -r * 0.55, r * 0.2, 0.2, -1.2, 0, INK);
}
// Kento Nanami: golden 7:3 part and the green goggles (rig head r 0.399, h 0.718)
function nanamiHair(b, r, h) {
  const BLOND = 0xf0c858, PART = 0x9a7428, FRAME = 0x26261e;
  const lens = plastic(0x8cc23c, { rough: 0.12, metal: 0.3, emissive: 0x3c7010, emissiveIntensity: 0.55 });
  b.cyl(0, h * 0.42, -r * 0.18, r * 1.0, h * 0.5, BLOND, { seg: 18 });
  b.cyl(0, h * 0.88, 0, r * 1.05, h * 0.12 + 0.01, BLOND, { seg: 18 });
  b.sphere(-r * 0.42, h + 0.01, -r * 0.05, r * 0.66, BLOND, { sy: 0.36 });
  b.sphere(r * 0.2, h + 0.02, -r * 0.02, r * 0.9, BLOND, { sy: 0.62 });
  dbox(b, -r * 0.36, h + r * 0.27, -r * 0.08, 0.04, 0.05, r * 1.5, 0, 0, 0.5, PART);
  dbox(b, r * 0.16, h * 0.97, r * 0.72, r * 1.35, h * 0.13, r * 0.45, 0.45, 0, 0.18, BLOND);
  dbox(b, r * 0.86, h * 0.86, r * 0.2, r * 0.3, h * 0.2, r * 1.1, 0, 0, -0.2, BLOND);
  spike(b, -r * 0.14, h * 0.98, r * 0.88, r * 0.13, 0.22, 2.55, 0.35, BLOND);
  spike(b, r * 0.02, h * 0.98, r * 0.92, r * 0.11, 0.17, 2.65, 0.15, BLOND);
  for (const sd of [-1, 1]) {
    const a = sd * 0.42, y = h * 0.64;
    dbox(b, SIN(a) * r, y, Math.cos(a) * r, r * 0.62, h * 0.27, 0.06, 0, a, 0, FRAME);
    dbox(b, SIN(a) * (r + 0.03), y, Math.cos(a) * (r + 0.03), r * 0.5, h * 0.19, 0.03, 0, a, 0, 0, { mat: lens });
    b.box(SIN(a) * (r + 0.05) - sd * r * 0.12, y + h * 0.03, Math.cos(a) * (r + 0.05), 0.04, 0.03, 0.01, 0xe8ffd0);
    rod(b, [SIN(sd * 0.72) * (r + 0.015), y, Math.cos(0.72) * (r + 0.015)], [SIN(sd * 1.25) * (r + 0.015), y + 0.01, Math.cos(1.25) * (r + 0.015)], 0.016, FRAME, 5);
  }
  b.box(0, h * 0.64, r * 0.97, r * 0.26, 0.05, 0.05, FRAME);
}
// Nanami's cleaver wrapped in white cloth with black dots: grip at the origin, blade up +Y, broad along Z
function cleaver(b) {
  const CL = 0xf3efe4, DOT = 0x18181c;
  b.box(0, -0.16, 0, 0.06, 0.3, 0.07, 0x2a2018);
  for (let k = 0; k < 3; k++) b.box(0, -0.13 + k * 0.08, 0, 0.07, 0.025, 0.08, 0x5a4a3a);
  b.box(0, 0.13, 0, 0.09, 0.04, 0.2, 0x2a2018);
  b.box(0, 0.15, 0.01, 0.07, 0.74, 0.19, CL);
  dbox(b, 0, 0.89, 0.01, 0.07, 0.09, 0.19, 0, 0, 0, CL);
  dbox(b, 0, 0.9, -0.03, 0.07, 0.12, 0.12, PI / 4, 0, 0, CL);
  for (let k = 0; k < 3; k++) dbox(b, 0, 0.28 + k * 0.24, 0.01, 0.075, 0.02, 0.2, 0.35, 0, 0, 0xd8d2c2);
  const dots = [[0.24, 0.05], [0.36, -0.05], [0.46, 0.06], [0.58, -0.04], [0.68, 0.05], [0.8, -0.05], [0.9, 0.04], [0.52, 0], [0.31, -0.07]];
  for (const sd of [-1, 1]) for (const [y, z] of dots) blob(b, sd * 0.036, y, z, 0.006, 0.026, 0.026, DOT);
}
// hair helpers ---------------------------------------------------------------------------
function spikyHair(b, s, top, col, n, len, spread = 0.5, rnd = 0.3) {
  b.cyl(0, top - 0.24 * s, 0, 0.47 * s, 0.36 * s, col, { seg: 14 });
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, ring = k % 2 ? 0.28 : 0.4;
    spike(b, Math.sin(a) * ring * s, top - 0.05 * s, Math.cos(a) * ring * s, 0.2 * s, (len + r() * rnd) * s, Math.cos(a) * spread, -Math.sin(a) * spread, col);
  }
  spike(b, 0, top, 0, 0.25 * s, (len + 0.2) * s, 0, 0, col);
}
export const hair = {
  gojo: (b, s, top) => { spikyHair(b, s, top, C.white, 12, 0.7, 0.75, 0.3); for (let k = -2; k <= 2; k++) spike(b, k * 0.14 * s, top - 0.1 * s, 0.34 * s, 0.14 * s, 0.55 * s, 1.9, k * 0.12, C.white); },
  yuji: (b, s, top) => { b.box(0, top - 0.44 * s, -0.2 * s, 0.9 * s, 0.3 * s, 0.5 * s, 0x3a2a2a); spikyHair(b, s, top, 0xf28a9c, 10, 0.4, 0.6, 0.15); spike(b, 0, top - 0.05 * s, 0.3 * s, 0.2 * s, 0.4 * s, 1.5, 0, 0xf28a9c); },
  megumi: (b, s, top) => { spikyHair(b, s, top, 0x15161c, 14, 0.7, 0.95, 0.4); },
  sukuna: (b, s, top) => { spikyHair(b, s, top, 0xf28a9c, 10, 0.55, 1.2, 0.2); },
  nobara: (b, s, top) => { const col = 0xa8562a; b.cyl(0, top - 0.3 * s, 0, 0.5 * s, 0.42 * s, col, { seg: 14 }); for (const sd of [-1, 1]) b.box(sd * 0.36 * s, top - 0.78 * s, -0.08 * s, 0.22 * s, 0.6 * s, 0.7 * s, col); b.box(0, top - 0.7 * s, -0.3 * s, 0.9 * s, 0.6 * s, 0.24 * s, col); b.box(0.12 * s, top - 0.2 * s, 0.34 * s, 0.6 * s, 0.14 * s, 0.14 * s, col); },
  mahito: (b, s, top) => { const cols = [0x8a9ab0, 0x5a6a80, 0xa8b4c4]; b.cyl(0, top - 0.3 * s, 0, 0.5 * s, 0.44 * s, cols[0], { seg: 14 }); for (const sd of [-1, 1]) { b.box(sd * 0.36 * s, top - 1.3 * s, -0.1 * s, 0.22 * s, 1.2 * s, 0.6 * s, cols[1]); b.box(sd * 0.3 * s, top - 0.6 * s, 0.1 * s, 0.2 * s, 0.4 * s, 0.4 * s, cols[2]); } b.box(0, top - 1.3 * s, -0.36 * s, 0.9 * s, 1.2 * s, 0.24 * s, cols[0]); b.box(-0.05 * s, top - 0.25 * s, 0.34 * s, 0.7 * s, 0.2 * s, 0.14 * s, cols[2]); },
  todo: (b, s, top) => todoHair(headXf(b, s, top, 0.406, 0.725), 0.406, 0.725),
  nanami: (b, s, top) => nanamiHair(headXf(b, s, top, 0.399, 0.718), 0.399, 0.718),
  geto: (b, s, top) => { const col = 0x15161c; b.cyl(0, top - 0.26 * s, 0, 0.48 * s, 0.36 * s, col, { seg: 14 }); b.sphere(0, top + 0.18 * s, -0.12 * s, 0.26 * s, col); b.box(-0.3 * s, top - 0.9 * s, 0.34 * s, 0.1 * s, 0.9 * s, 0.1 * s, col); b.box(0, top - 1.1 * s, -0.34 * s, 0.8 * s, 1.0 * s, 0.2 * s, col); },
  yuta: (b, s, top) => { spikyHair(b, s, top, 0x15161c, 8, 0.3, 1.1, 0.2); for (let k = -1; k <= 1; k++) spike(b, k * 0.18 * s, top - 0.2 * s, 0.34 * s, 0.13 * s, 0.4 * s, 2.3, 0, 0x15161c); },
  maki: (b, s, top) => { const col = 0x24453a; b.cyl(0, top - 0.26 * s, 0, 0.47 * s, 0.36 * s, col, { seg: 14 }); rbox(b, 0, top - 0.5 * s, -0.55 * s, 0.24 * s, 0.9 * s, 0.24 * s, -0.5, 0, 0, col); },
};

// ---- characters ---------------------------------------------------------------------------
const NAVY = 0x1d2233, GOLD = 0xdcbc81;
export function gojo(s, eyes = false) {
  return humanoid({ s, face: eyes ? 'gojoEyes' : 'gojo', skinHex: 0xf7e2cf, torso: NAVY, legs: NAVY, arms: NAVY, collar: NAVY, buttons: 0x3a4460, hair: hair.gojo,
    extra: (b, s) => { b.cyl(0, 2.72 * s, 0, 0.46 * s, 0.34 * s, NAVY, { seg: 12 }); } });
}
export function yuji(s) {
  return humanoid({ s, face: 'yuji', torso: NAVY, legs: NAVY, arms: NAVY, hair: hair.yuji, buttons: GOLD,
    extra: (b, s) => { b.box(0, 2.62 * s, -0.2 * s, 1.0 * s, 0.34 * s, 0.5 * s, C.red); b.box(0, 2.2 * s, -0.36 * s, 0.8 * s, 0.6 * s, 0.12 * s, C.red); b.box(0, 2.62 * s, 0.26 * s, 0.9 * s, 0.26 * s, 0.14 * s, C.red); } });
}
export function megumi(s) { return humanoid({ s, face: 'megumi', torso: NAVY, legs: NAVY, arms: NAVY, hair: hair.megumi, buttons: GOLD }); }
export function nobara(s) {
  return humanoid({ s, face: 'nobara', torso: NAVY, legs: 0xf3d2b3, shoes: 0x5a3a2a, hips: 0x2a2e3e, arms: NAVY, hair: hair.nobara, buttons: GOLD,
    extra: (b, s) => { b.add(taperGeo(1.2, 1.0, 0.6, 0.7), plastic(0x2a2e3e), 0, 0.95 * s, 0, 0, s, s, s); },
    itemR: (a, s) => { a.cyl(0, -1.9 * s, 0.1 * s, 0.07 * s, 1.2 * s, C.rbrown, { seg: 6 }); rbox(a, 0, -0.75 * s, 0.1 * s, 0.3 * s, 0.3 * s, 0.7 * s, 0, 0, 0, C.dkgray); } });
}
// Aoi Todo: open dark jacket over a ripped bare chest, rolled sleeves, blue sash (as his driver)
export function todo(s) {
  const SK = 0xc68a58, JK = 0x1e2130, PANTS = 0x2e2f3a, SASH = 0x2f86e8, SHIRT = 0xf2f0ea, w = 1.25;
  const Fr = frames(s, w, 1.45, 1.38, 1.1);
  return humanoid({ s, face: 'todo', skinHex: SK, torso: JK, legs: PANTS, hips: PANTS, arms: JK, hands: SK, shoes: 0x1b1b1b, hair: hair.todo, wide: w, collar: false,
    extra: (b0) => {
      const b = xf(b0, Fr.torso), { s, W, D } = Fr.d, F = 0.25 * s * D;
      b.box(0, 0.24 * s, F - 0.06 * s, 0.56 * s, 0.76 * s, 0.1 * s, SK);
      for (const sd of [-1, 1]) {
        dbox(b, sd * 0.13 * s, 0.73 * s, F + 0.01 * s, 0.24 * s, 0.17 * s, 0.07 * s, 0.25, 0, sd * 0.1, SK);   // slab pecs
        dbox(b, sd * 0.13 * s, 0.645 * s, F + 0.035 * s, 0.22 * s, 0.012, 0.01, 0, 0, sd * 0.1, 0x9a6036);
        for (let k = 0; k < 3; k++) b.box(sd * 0.055 * s, (0.46 - k * 0.11) * s, F, 0.09 * s, 0.085 * s, 0.035 * s, SK);   // abs
        dbox(b, sd * 0.29 * s, 0.58 * s, F + 0.005 * s, 0.05 * s, 0.78 * s, 0.05 * s, 0, 0, sd * 0.06, SHIRT);   // torn undershirt
        dbox(b, sd * 0.34 * s, 0.6 * s, F + 0.02 * s, 0.07 * s, 0.82 * s, 0.05 * s, 0, 0, sd * 0.06, JK);       // jacket edges
        dbox(b, sd * 0.24 * s, 0.98 * s, 0.14 * s, 0.2 * s, 0.07 * s, 0.24 * s, 0.3, 0, -sd * 0.35, JK);       // flared collar
        b.sphere(sd * 0.2 * s * W, 0.94 * s, -0.04 * s, 0.16 * s, JK, { sy: 0.5 });                           // big traps
      }
      for (let k = 0; k < 3; k++) b.box(0.36 * s, (0.78 - k * 0.2) * s, F + 0.03 * s, 0.05 * s, 0.05 * s, 0.03 * s, GOLD);
      b.cyl(0, 0.86 * s, 0.02 * s, 0.18 * s, 0.16 * s, SK, { seg: 12 });   // thick neck
      b.box(0, -0.02 * s, 0, 0.96 * s * W, 0.24 * s, 0.5 * s * D, SASH);
      b.sphere(0.3 * s, 0.1 * s, 0.26 * s * D, 0.08 * s, SASH);
      dbox(b, 0.36 * s, -0.08 * s, 0.28 * s * D, 0.09 * s, 0.26 * s, 0.03 * s, 0, 0, 0.25, SASH);
      dbox(b, 0.26 * s, -0.1 * s, 0.28 * s * D, 0.09 * s, 0.22 * s, 0.03 * s, 0, 0, -0.2, SASH);
    },
    arm: (a0) => {
      const ab = xf(a0, Fr.arm), { s, W } = Fr.d, aw = Math.sqrt(W);
      ab.sphere(0, -0.06 * s, 0, 0.14 * s * aw, JK, { sy: 0.7 });         // deltoid (flatter: the arm frame stretches it)
      ab.cyl(0, -0.36 * s, 0, 0.15 * s * aw, 0.08 * s, JK, { seg: 12 });  // rolled-up sleeve
      ab.cyl(0, -0.56 * s, 0, 0.14 * s * aw, 0.22 * s, SK, { seg: 12 });  // bare forearm
      ab.sphere(0, -0.44 * s, 0.02 * s, 0.125 * s * aw, SK);
    } });
}
// Kento Nanami: tan suit, navy shirt, leopard-print tie, goggles, the cloth-wrapped cleaver (as his driver)
export function nanami(s) {
  const SUIT = 0xcdb27a, LAPEL = 0xb3965c, SHIRT = 0x2b3c6c, TIE = 0xe2a832, SPOT = 0x4a2a10, SK = 0xf0cda8;
  const Fr = frames(s, 1, 1.33, 1, 1);
  return humanoid({ s, face: 'nanami', skinHex: SK, torso: SUIT, legs: 0xc2a670, hips: 0xc2a670, arms: SUIT, hands: SK, hair: hair.nanami, collar: false, shoes: 0x3a2a1a,
    extra: (b0) => {
      const b = xf(b0, Fr.torso), { s } = Fr.d;
      b.box(0, 0.46 * s, 0.205 * s, 0.34 * s, 0.54 * s, 0.03 * s, SHIRT);
      b.cyl(0, 0.86 * s, 0, 0.2 * s, 0.15 * s, SHIRT, { seg: 14 });
      for (const sd of [-1, 1]) dbox(b, sd * 0.08 * s, 0.94 * s, 0.17 * s, 0.1 * s, 0.07 * s, 0.05 * s, 0.2, 0, sd * 0.5, SHIRT);   // collar points
      b.box(0, 0.84 * s, 0.215 * s, 0.12 * s, 0.1 * s, 0.05 * s, TIE);
      b.box(0, 0.44 * s, 0.225 * s, 0.11 * s, 0.42 * s, 0.03 * s, TIE);
      dbox(b, 0, 0.44 * s, 0.225 * s, 0.078 * s, 0.078 * s, 0.03 * s, 0, 0, PI / 4, TIE);
      for (const [x, y] of [[-0.03, 0.8], [0.025, 0.74], [-0.025, 0.66], [0.03, 0.6], [-0.02, 0.53], [0.02, 0.48], [0.035, 0.87], [0, 0.7]]) blob(b, x * s, y * s, 0.243 * s, 0.018 * s, 0.022 * s, 0.006, SPOT);
      for (const sd of [-1, 1]) {
        dbox(b, sd * 0.11 * s, 0.72 * s, 0.226 * s, 0.1 * s, 0.56 * s, 0.035 * s, 0, 0, -sd * 0.27, LAPEL);
        dbox(b, sd * 0.2 * s, 0.86 * s, 0.222 * s, 0.11 * s, 0.13 * s, 0.03 * s, 0, 0, -sd * 0.6, LAPEL);
        b.box(sd * 0.27 * s, 0.34 * s, 0.226 * s, 0.17 * s, 0.035 * s, 0.03 * s, LAPEL);   // pocket flaps
      }
      for (const y of [0.4, 0.27]) b.box(0, y * s, 0.232 * s, 0.05 * s, 0.05 * s, 0.03 * s, 0x5a4026);
      b.box(0.24 * s, 0.7 * s, 0.222 * s, 0.13 * s, 0.025 * s, 0.03 * s, LAPEL);
    },
    arm: (a0, sd) => {
      const ab = xf(a0, Fr.arm), { s } = Fr.d;
      ab.cyl(0, -0.53 * s, 0, 0.12 * s, 0.035 * s, SHIRT, { seg: 10 });   // cuffs
      if (sd > 0) { ab.cyl(0, -0.565 * s, 0, 0.112 * s, 0.05 * s, 0x2a2018, { seg: 10 }); ab.box(0.1 * s, -0.575 * s, 0, 0.03 * s, 0.07 * s, 0.07 * s, GOLD); }   // the watch
    },
    // the cleaver in his right hand, blade forward
    itemR: (a, s) => cleaver(xf(a, new THREE.Matrix4().makeTranslation(0, -1.25 * s, 0).multiply(new THREE.Matrix4().makeRotationX(PI / 2)).multiply(new THREE.Matrix4().makeScale(2 * s, 2 * s, 2 * s)))) });
}
export function geto(s) {
  return humanoid({ s, face: 'geto', torso: 0x1b1b1b, legs: 0x1b1b1b, arms: 0x1b1b1b, hair: hair.geto,
    extra: (b, s) => { b.add(taperGeo(1.5, 1.14, 1.3, 0.9), plastic(0x1b1b1b), 0, 0, 0, 0, s, s, s); rbox(b, 0, 1.9 * s, 0, 0.36 * s, 1.9 * s, 0.72 * s, 0, 0, 0.6, 0x8a5a2a); b.box(0, 1.42 * s, 0, 1.2 * s, 0.2 * s, 0.7 * s, 0x8a5a2a); } });
}
export function yuta(s) {
  return humanoid({ s, face: 'yuta', torso: C.white, legs: C.white, arms: C.white, hair: hair.yuta, buttons: C.ltgray, shoes: C.black,
    itemR: (a, s) => { a.box(-0.04 * s, -3.5 * s, -0.04 * s, 0.1 * s, 2.2 * s, 0.26 * s, 0xdfe6ee, { matOpts: { metal: 0.7, rough: 0.2 } }); a.box(0, -1.4 * s, 0, 0.36 * s, 0.08 * s, 0.4 * s, GOLD); a.box(0, -1.3 * s, 0, 0.14 * s, 0.7 * s, 0.14 * s, C.black); } });
}
export function maki(s) {
  return humanoid({ s, face: 'maki', torso: NAVY, legs: NAVY, arms: NAVY, hair: hair.maki, buttons: GOLD,
    itemR: (a, s) => { rbox(a, 0, -1.5 * s, 0, 0.1 * s, 5.2 * s, 0.1 * s, 0.9, 0, 0, C.rbrown); rbox(a, 0, -1.5 * s + Math.cos(0.9) * 2.8 * s, Math.sin(0.9) * 2.8 * s, 0.08 * s, 0.9 * s, 0.24 * s, 0.9, 0, 0, 0xdfe6ee); } });
}
export function mahito(s) {
  return humanoid({ s, face: 'mahito', skinHex: 0xe4dcd6, torso: 0x2a2a34, legs: 0x3a3a48, arms: 0xe4dcd6, hands: 0xe4dcd6, hair: hair.mahito, collar: 0x2a2a34,
    extra: (b, s) => { for (const [x, y, c] of [[-0.25, 2.2, 0x4a4a5a], [0.3, 1.8, 0x5a4a5a], [0.0, 2.5, 0x3a4a5a]]) b.box(x * s, y * s, 0.32 * s, 0.26 * s, 0.26 * s, 0.04 * s, c); for (const sd of [-1, 1]) b.box(sd * 0.56 * s, 2.4 * s, 0, 0.44 * s, 0.35 * s, 0.5 * s, 0x2a2a34); } });
}
// Sukuna true form: four arms, kimono, markings
export function sukuna(s) {
  const f = humanoid({ s, face: 'sukuna', skinHex: 0xf3d6bf, torso: 0xf2eee4, legs: 0xf2eee4, arms: 0xf3d6bf, hands: 0xf3d6bf, hair: hair.sukuna, wide: 1.15, collar: false,
    extra: (b, s) => {
      b.add(taperGeo(1.9, 1.24, 1.4, 1.1), plastic(0xf2eee4), 0, 0, 0, 0, s, s, s);
      b.box(0, 1.36 * s, 0, 1.36 * s, 0.26 * s, 0.76 * s, 0x1b1b1b);
      rbox(b, 0.18 * s, 2.2 * s, 0.33 * s, 0.12 * s, 1.1 * s, 0.04 * s, 0, 0, 0.45, 0x1b1b1b); rbox(b, -0.18 * s, 2.2 * s, 0.33 * s, 0.12 * s, 1.1 * s, 0.04 * s, 0, 0, -0.45, 0x1b1b1b);
      for (const sd of [-1, 1]) { b.sphere(sd * 0.3 * s, 3.2 * s, 0.34 * s, 0.07 * s, 0xff2020, { matOpts: { emissive: 0xff2020, emissiveIntensity: 2 } }); }
    },
  });
  // lower pair of arms
  const lower = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 0.6 * s, 2.05 * s, 0.05 * s);
    const a = new BrickBuilder(1);
    a.add(taperGeo(0.34, 0.4, 1.0, 0.42), plastic(0xf3d6bf), 0, -1.0 * s, 0, 0, s, s, s);
    for (let k = 0; k < 2; k++) a.box(0, (-0.4 - k * 0.3) * s, 0, 0.42 * s, 0.07 * s, 0.46 * s, 0x1b1b1b);
    a.cyl(0, -1.3 * s, 0, 0.18 * s, 0.32 * s, 0xf3d6bf, { seg: 10 });
    pv.add(a.build({ name: 'sukuna-arm' }));
    pv.rotation.z = sd * 0.5;
    f.root.add(pv); lower.push(pv);
  }
  f.lowR = lower[0]; f.lowL = lower[1];
  return f;
}

// Jogo: one huge eye, volcano head (lava cracks, crater pool, smoke), corked ears, yellow shawl with
// black splotches and the white hood of his coat worn down round his neck (as his driver). The crater stays at top + 0.9 * s
// (the map's eruption flame and meteors start there).
// Jogo's open white hood: a roll round the neck opening into two lapels at the front, and the
// hood folded down on his back (same shape as drivers/jjk.js, in the driver torso's units)
function jogoHood(b, s, W, D, R, neckY, col) {
  const m = plastic(col), rx = R + 0.08, rz = R + 0.06;
  const roll = G('jogoHoodRoll', () => new THREE.TorusGeometry(1, 0.26, 8, 26, PI * 2 - 1.3).rotateZ(PI / 2 + 0.65).rotateX(PI / 2));
  b.addMatrix(roll, m, m4(0, neckY - 0.05 * s, 0, 0, 0, 0, rx, 0.42 * s, rz));
  const ex = Math.sin(0.65) * rx;
  for (const sd of [-1, 1]) b.boxM(m4(sd * (ex + 0.1 * s) / 2, neckY - 0.3 * s, 0.25 * s * D, 0.1, 0, -sd * 0.42, 0.13 * s, 0.5 * s, 0.06 * s), col);
  b.addMatrix(sph12(), m, m4(0, neckY - 0.16 * s, -rz - 0.04 * s, 0.25, 0, 0, 0.3 * s * W, 0.24 * s, 0.13 * s));
  b.addMatrix(sph12(), m, m4(0, neckY - 0.02 * s, -rz + 0.02 * s, -0.2, 0, 0, 0.26 * s * W, 0.1 * s, 0.11 * s));
}
export function jogo(s) {
  const JY = 0xe0a81c, JSK = 0xc9c6bd, BLK = 0x1b1b1b, ROCK = 0x8a4a26, ROCK2 = 0x6a3418, FLUFF = 0xf6f4ee, w = 1.3, HR = 0.56, HH = 0.62;
  const Fr = frames(s, w, 1.05, 1.3, 1.15), dr = 0.4725, dh = 0.525;
  const lava = neon(0xff5a10, 2.4), smoke = plastic(0x9a958e, { trans: true, opacity: 0.7 });
  return humanoid({ s, face: 'jogo', skinHex: JSK, torso: JY, legs: BLK, hips: BLK, arms: JY, hands: JSK, shoes: 0x6a3a1a, headR: HR, headH: HH, wide: w, collar: false,
    hair: (b0, s, top) => {
      // the volcano: rig head-top units across, stretched up so the crater is 0.9 * s above the head
      const r = dr, b = xf(b0, sxf(0, top, 0, (HR * s) / dr, (0.9 * s) / 0.5, (HR * s) / dr));
      b.add(frustum(0.74, 1, 18), plastic(JSK), 0, 0, 0, 0, r, 0.24, r);
      b.add(frustum(0.6, 1, 18), plastic(ROCK), 0, 0.24, 0, 0, r * 0.76, 0.26, r * 0.76);
      const T = 0.5, R = r * 0.456;
      b.addMatrix(G('jogoRim', () => new THREE.TorusGeometry(1, 0.16, 6, 18)), plastic(ROCK2), m4(0, T, 0, PI / 2, 0, 0, R, R, R));
      b.cyl(0, T - 0.04, 0, R * 0.92, 0.05, 0, { mat: lava, seg: 14 });
      for (const a of [0.35, 1.5, 2.7, 3.8, 5.0]) {   // glowing cracks down the cone
        const pt = (k, da) => { const rr = lerp(R * 1.03, r * 0.78, k), aa = a + da; return [SIN(aa) * rr, T - k * 0.26, Math.cos(aa) * rr]; };
        rod(b, pt(0, 0), pt(0.5, 0.12), 0.02, lava, 4);
        rod(b, pt(0.5, 0.12), pt(0.92, 0.02), 0.018, lava, 4);
      }
      // a curl of smoke drifting off the back of the crater
      b.add(sph12(), smoke, 0.03, T + 0.1, -0.12, 0, 0.11, 0.07, 0.11);
      b.add(sph12(), smoke, -0.06, T + 0.2, -0.2, 0, 0.13, 0.09, 0.13);
      b.add(sph12(), smoke, 0.05, T + 0.32, -0.28, 0, 0.15, 0.1, 0.15);
      // corks plugged into his ear holes
      const hb = headXf(b0, s, top, dr, dh, HR, HH);
      for (const sd of [-1, 1]) {
        rod(hb, [sd * r * 0.9, dh * 0.5, 0], [sd * (r + 0.02), dh * 0.5, 0], 0.11, 0x3a3834, 12);
        rod(hb, [sd * r * 0.9, dh * 0.5, 0], [sd * (r + 0.1), dh * 0.5, 0], 0.085, 0xc49a5a, 12);
      }
    },
    extra: (b0) => {
      const b = xf(b0, Fr.torso), { s, W, D } = Fr.d;
      b.box(0, 0.18 * s, 0.19 * s * D, 0.3 * s, 0.7 * s, 0.1 * s, BLK);   // black clothes under the open shawl
      jogoHood(b, s, W, D, dr, 1.0 * s, FLUFF);   // the white hood of his coat, worn down
      for (const [u, y, rx, ry] of [[-0.62, 0.62, 0.07, 0.06], [0.7, 0.42, 0.06, 0.07], [-0.75, 0.3, 0.06, 0.05], [0.58, 0.72, 0.05, 0.05], [-0.5, 0.42, 0.04, 0.04], [0.82, 0.62, 0.04, 0.05]]) torsoSpot(b, Fr, 'f', u, y * s, rx * s, ry * s, BLK);
      for (const [u, y, rx, ry] of [[-0.5, 0.7, 0.08, 0.07], [0.3, 0.5, 0.07, 0.06], [-0.1, 0.3, 0.06, 0.06], [0.6, 0.8, 0.06, 0.05], [-0.6, 0.35, 0.05, 0.06], [0.1, 0.78, 0.05, 0.05], [0.7, 0.3, 0.05, 0.05]]) torsoSpot(b, Fr, 'b', u, y * s, rx * s, ry * s, BLK);
      for (const sd of [-1, 1]) for (const [u, y] of [[0.3, 0.6], [-0.5, 0.35]]) torsoSpot(b, Fr, sd, u, y * s, 0.06 * s, 0.055 * s, BLK);
    },
    arm: (a0, sd) => {
      const ab = xf(a0, Fr.arm), { s, W } = Fr.d, aw = Math.sqrt(W);
      ab.cyl(0, -0.58 * s, 0, 0.15 * s * aw, 0.12 * s, JY, { seg: 12 });   // wide sleeve mouth
      for (const [y, side, u] of [[-0.2, 'o', 0.2], [-0.4, 'f', -0.3], [-0.32, 'b', 0.4], [-0.5, 'o', -0.4]]) {
        const hw = (0.12 + 0.02 * ((y * s + 0.52 * s) / (0.5 * s))) * s * aw;
        if (side === 'o') blob(ab, sd * hw, y * s, u * hw, 0.01, 0.05 * s, 0.05 * s, BLK);
        else blob(ab, u * hw, y * s, (side === 'f' ? 1 : -1) * hw, 0.05 * s, 0.045 * s, 0.01, BLK);
      }
    } });
}

// A Divine Dog (white or black) ~3.2 long, facing +Z
export function divineDog(col = C.white, s = 1) {
  const b = new BrickBuilder(1), acc = col === C.white ? 0x15161c : C.white;
  b.box(0, 1.1 * s, -0.2 * s, 1.2 * s, 1.1 * s, 2.6 * s, col);
  b.box(0, 1.5 * s, 1.1 * s, 1.1 * s, 1.1 * s, 1.0 * s, col);
  b.box(0, 1.5 * s, 1.8 * s, 0.6 * s, 0.5 * s, 0.7 * s, col);
  b.box(0, 1.85 * s, 2.1 * s, 0.25 * s, 0.2 * s, 0.1 * s, C.black);
  for (const sd of [-1, 1]) {
    spike(b, sd * 0.35 * s, 2.55 * s, 1.1 * s, 0.22 * s, 0.6 * s, 0, 0, col);
    b.box(sd * 0.3 * s, 2.0 * s, 1.62 * s, 0.2 * s, 0.14 * s, 0.05 * s, 0xffd040, { matOpts: { emissive: 0xffc020, emissiveIntensity: 1.6 } });
    for (const z of [0.7, -0.9]) b.box(sd * 0.4 * s, 0, z * s, 0.34 * s, 1.2 * s, 0.4 * s, col);
  }
  rbox(b, 0, 1.9 * s, -1.7 * s, 0.3 * s, 0.3 * s, 1.2 * s, -0.7, 0, 0, col);
  b.box(0, 1.6 * s, 0.5 * s, 1.24 * s, 0.4 * s, 0.3 * s, acc);
  return b.build({ name: 'divine-dog' });
}

// Transfigured human (Mahito's Idle Transfiguration). variant 0..2, ~3.5-4.5 tall
export function transfigured(v = 0) {
  const b = new BrickBuilder(1);
  const skin = [0xb9a9c4, 0xa9b9a4, 0xc4a9a9][v % 3], dark = [0x6a5a7a, 0x5a6a5a, 0x7a5a5a][v % 3];
  if (v % 3 === 0) {
    b.box(-0.4, 0, 0, 0.5, 1.4, 0.5, dark); b.box(0.45, 0, 0.1, 0.6, 0.9, 0.6, dark);
    b.sphere(0, 2.1, 0, 1.3, skin, { sy: 0.9 }); b.sphere(0.7, 2.9, 0.3, 0.7, skin);
    head(b, 'cursed', -0.2, 3.0, 0.2, 0.5, 0.8, Math.PI + 0.3);
    rbox(b, 1.4, 2.0, 0.4, 0.4, 2.4, 0.4, 0.4, 0, 0.5, skin); rbox(b, -1.3, 1.8, 0.4, 0.35, 1.6, 0.35, -0.6, 0, -0.9, skin);
  } else if (v % 3 === 1) {
    b.box(-0.3, 0, 0, 0.45, 2.0, 0.45, dark); b.box(0.35, 0, 0, 0.45, 2.3, 0.45, dark);
    b.add(taperGeo(1.0, 1.6, 1.6, 0.8), plastic(skin), 0, 2.1, 0, 0.2);
    head(b, 'cursed2', 0.5, 3.7, 0.1, 0.45, 0.7, Math.PI - 0.4); head(b, 'cursed', -0.5, 3.6, 0.1, 0.4, 0.6, Math.PI + 0.5);
    rbox(b, 1.2, 3.0, 0.3, 0.35, 2.4, 0.35, 0.8, 0, 1.2, skin); rbox(b, -1.3, 3.0, 0.3, 0.35, 2.4, 0.35, 0.8, 0, -1.2, skin);
  } else {
    b.sphere(0, 1.3, 0, 1.4, skin, { sy: 0.8 }); for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.6; rbox(b, Math.cos(a) * 1.3, 0.5, Math.sin(a) * 1.3, 0.3, 1.4, 0.3, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6, dark); }
    rbox(b, 0, 2.5, 0.2, 0.5, 1.4, 0.5, 0.3, 0, 0, skin); head(b, 'cursed', 0, 3.1, 0.5, 0.5, 0.8);
  }
  return b.build({ name: 'transfigured' });
}

// Panda (~4.2 * s tall)
export function panda(s) {
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  for (const sd of [-1, 1]) b.box(sd * 0.45 * s, 0, 0, 0.7 * s, 1.1 * s, 0.8 * s, 0x1b1b1b);
  b.sphere(0, 2.0 * s, 0, 1.15 * s, C.white, { sy: 1.05 });
  b.box(0, 2.3 * s, 0, 2.1 * s, 0.6 * s, 1.3 * s, 0x1b1b1b);
  b.sphere(0, 3.7 * s, 0, 0.95 * s, C.white, { sy: 0.9 });
  for (const sd of [-1, 1]) { b.sphere(sd * 0.7 * s, 4.5 * s, -0.1 * s, 0.34 * s, 0x1b1b1b); b.sphere(sd * 0.36 * s, 3.85 * s, 0.72 * s, 0.26 * s, 0x1b1b1b, { sy: 1.3 }); b.sphere(sd * 0.36 * s, 3.9 * s, 0.9 * s, 0.08 * s, C.white); }
  b.sphere(0, 3.45 * s, 0.9 * s, 0.14 * s, 0x1b1b1b);
  root.add(b.build({ name: 'panda' }));
  const arms = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 1.1 * s, 2.7 * s, 0);
    const a = new BrickBuilder(1); a.sphere(0, -0.6 * s, 0, 0.45 * s, 0x1b1b1b, { sy: 1.8 }); pv.add(a.build({ name: 'panda-arm' }));
    pv.rotation.z = sd * 0.35; root.add(pv); arms.push(pv);
  }
  return { root, armR: arms[0], armL: arms[1] };
}

// Mahoraga: muscular pale body, four wing-fins from the eye sockets, the gold eight-handled wheel,
// chain, black hakama with a white sash, the Sword of Extermination (as its driver).
// f.wheel is the wheel mesh (the map turns it about Z), centred top + 1.6 * s.
export function mahoraga(s) {
  const MW = 0xece8e0, MG = 0xd2cdc4, WING = 0xfaf8f2, WING2 = 0xdedad2, HAK = 0x24242c, SASH = 0xf6f4ee, CHAIN = 0x8a8e98, w = 1.3;
  const metal = { matOpts: { metal: 0.6, rough: 0.3 } };
  const Fr = frames(s, w, 1.5, 1.4, 1.1), dr = 0.405, dh = 0.69;
  const f = humanoid({ s, face: 'mahoraga', skinHex: MW, torso: MW, legs: HAK, hips: HAK, arms: MW, hands: MW, shoes: HAK, wide: w, collar: false,
    hair: (b0, s, top) => {
      const b = headXf(b0, s, top, dr, dh), r = dr, h = dh;
      for (const sd of [-1, 1]) {   // four wings sprouting from the eye sockets
        const bx = sd * r * 0.42, bz = r * 0.86;
        for (const [phi, L, dy] of [[0.38, 0.82, 0.03], [-0.22, 0.66, -0.03]]) {
          feather(b, bx, h * 0.6 + dy, bz, sd > 0 ? phi : PI - phi, sd * 0.4, L, 0.3, 0.04, WING);
          feather(b, bx, h * 0.6 + dy, bz - 0.03, sd > 0 ? phi + 0.2 : PI - phi - 0.2, sd * 0.55, L * 0.8, 0.24, 0.04, WING2);
          feather(b, bx, h * 0.6 + dy, bz - 0.05, sd > 0 ? phi - 0.18 : PI - phi + 0.18, sd * 0.5, L * 0.7, 0.2, 0.04, WING2);
        }
      }
      for (let k = 0; k < 10; k++) { const u = k / 9; b.sphere(SIN(u * 3) * r * 0.12, h * (0.82 - u * 0.75), -r * (0.9 + u * 0.55) - SIN(u * PI) * r * 0.25, r * (0.3 - u * 0.2), k % 3 === 2 ? MG : MW); }   // tail
      b.sphere(0, h * 0.98, 0, r * 1.0, MW, { sy: 0.3 });   // domed crown
    },
    extra: (b0) => {
      const b = xf(b0, Fr.torso), { s, W, D } = Fr.d;
      b.cyl(0, 0.84 * s, 0, 0.2 * s, 0.2 * s, MW, { seg: 14 });   // thick neck
      for (const sd of [-1, 1]) {
        b.sphere(sd * 0.27 * s * W * 0.8, 0.96 * s, -0.03 * s, 0.2 * s, MW, { sy: 0.55 });   // traps
        b.sphere(sd * 0.2 * s, 0.7 * s, 0.15 * s * D, 0.21 * s, MW, { sy: 0.68 });          // pecs
        for (let k = 0; k < 3; k++) b.sphere(sd * 0.085 * s, (0.47 - k * 0.12) * s, 0.205 * s * D, 0.075 * s, MW, { sy: 0.8 });   // abs
        for (let k = 0; k < 2; k++) dbox(b, sd * 0.33 * s, (0.48 - k * 0.12) * s, 0.2 * s * D, 0.12 * s, 0.035 * s, 0.03 * s, 0, 0, sd * 0.5, MG);   // serratus
      }
      b.box(0, 0.2 * s, 0.23 * s * D, 0.025 * s, 0.4 * s, 0.02 * s, MG);
      for (const sd of [-1, 1]) {
        dbox(b, sd * 0.2 * s, 0.76 * s, -0.215 * s * D, 0.26 * s, 0.22 * s, 0.06 * s, -0.12, 0, sd * 0.25, MW);   // shoulder blades
        dbox(b, sd * 0.3 * s, 0.44 * s, -0.215 * s * D, 0.16 * s, 0.34 * s, 0.05 * s, 0, 0, sd * 0.3, MW);       // lats
      }
      b.box(0, 0.25 * s, -0.25 * s * D, 0.03 * s, 0.6 * s, 0.03 * s, MG);
      for (let k = 0; k <= 10; k++) {   // the metal chain over the collarbones
        const u = k / 10 - 0.5, x = u * 0.7 * s * W, y = (0.84 + u * u * 0.5) * s, z = (0.24 - u * u * 0.25) * s * D;
        dbox(b, x, y, z, 0.075 * s, 0.04 * s, 0.025 * s, k % 2 ? PI / 2 : 0, 0, u * 1.1, CHAIN, metal);
      }
      b.box(0, -0.02 * s, 0, 0.97 * s * W, 0.24 * s, 0.5 * s * D, SASH);   // white sash over the hakama
      b.sphere(0, 0.1 * s, 0.27 * s * D, 0.08 * s, SASH);
      for (const sd of [-1, 1]) dbox(b, sd * 0.07 * s, -0.08 * s, 0.29 * s * D, 0.08 * s, 0.24 * s, 0.03 * s, 0, 0, sd * 0.2, SASH);
    },
    arm: (a0) => {
      const ab = xf(a0, Fr.arm), { s, W } = Fr.d, aw = Math.sqrt(W);
      ab.sphere(0, -0.03 * s, 0, 0.18 * s * aw, MW);                       // deltoid
      ab.sphere(0, -0.25 * s, 0.04 * s, 0.135 * s * aw, MW, { sy: 1.2 });  // bicep
      ab.sphere(0, -0.47 * s, 0, 0.13 * s * aw, MW, { sy: 1.1 });           // forearm
      ab.cyl(0, -0.56 * s, 0, 0.13 * s * aw, 0.05 * s, MG, { seg: 12 });
    },
    // the Sword of Extermination fused to the right fist, blade down
    itemR: (a, s) => {
      const sb = xf(a, sxf(0, -1.25 * s, 0, 1.8 * s, 1.8 * s, 1.8 * s));
      sb.box(0, -0.12, 0.02, 0.16, 0.16, 0.34, 0x9aa4b4, metal);   // hilt fused to the fist (shares the ridge's material)
      sb.box(0, -1.25, 0.04, 0.07, 1.15, 0.3, 0xe4eaf2, metal);
      sb.box(0, -1.25, 0.04, 0.085, 1.1, 0.06, 0x9aa4b4, metal);
      spike(sb, 0, -1.25, 0.04, 0.16, 0.32, PI, 0, 0xe4eaf2, 0, metal);
    } });
  // the eight-handled wheel: outer ring, inner ring and hub, spokes, handles with knobs
  const wheel = new THREE.Group();
  const wb = new BrickBuilder(1), ws = 0.95 * s, GLD = 0xd9b04a, gm = plastic(GLD, metal.matOpts);
  wb.add(G('mahoTorus', () => new THREE.TorusGeometry(1, 0.11, 8, 24)), gm, 0, 0, 0, 0, ws, ws, ws);
  wb.add(G('mahoTorus2', () => new THREE.TorusGeometry(1, 0.08, 6, 20)), gm, 0, 0, 0, 0, ws * 0.32, ws * 0.32, ws * 0.32);
  wb.sphere(0, 0, 0, ws * 0.18, GLD, metal);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2, c = Math.cos(a), sn = SIN(a);
    rod(wb, [c * 0.3 * ws, sn * 0.3 * ws, 0], [c * ws, sn * ws, 0], 0.06 * ws, gm, 6);
    rod(wb, [c * ws, sn * ws, 0], [c * 1.5 * ws, sn * 1.5 * ws, 0], 0.075 * ws, gm, 6);
    wb.sphere(c * 1.55 * ws, sn * 1.55 * ws, 0, 0.13 * ws, GLD, metal);
  }
  const wg = wb.build({ name: 'dharma-wheel' });
  wheel.add(wg);
  wheel.position.set(0, f.top + 1.6 * s, 0);
  f.root.add(wheel);
  f.wheel = wg;
  return f;
}

// Rika (Queen of Curses): huge white body, big toothy mouth, dark hair tendrils. ~6.5 * s tall
export function rika(s) {
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const W = 0xebe6dc;
  b.add(taperGeo(2.6, 3.4, 3.2, 2.0, 2.4), plastic(W), 0, 0, 0, 0, s, s, s);
  b.sphere(0, 3.4 * s, 0, 1.9 * s, W, { sy: 0.8 });
  head(b, 'rika', 0, 3.6 * s, 0.1 * s, 1.35 * s, 1.8 * s);
  b.sphere(0, 5.4 * s, 0.1 * s, 1.35 * s, W, { sy: 0.5 });
  for (let k = 0; k < 14; k++) {
    const a = Math.PI * 0.35 + (k / 13) * Math.PI * 1.3;
    rbox(b, Math.cos(a) * 1.4 * s, 4.8 * s, -Math.abs(Math.sin(a)) * 1.1 * s - 0.1 * s, 0.35 * s, (2.4 + (k % 3) * 0.6) * s, 0.35 * s, -0.25, 0, Math.cos(a) * 0.4, 0x2a2430);
  }
  b.cyl(0, 5.9 * s, 0.1 * s, 1.1 * s, 0.25 * s, 0x2a2430, { seg: 14 });
  for (const sd of [-1, 1]) b.box(sd * 0.8 * s, -0.2 * s, 0.4 * s, 0.9 * s, 0.8 * s, 1.6 * s, W);
  root.add(b.build({ name: 'rika-body' }));
  const arms = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 1.9 * s, 3.4 * s, 0);
    const a = new BrickBuilder(1);
    a.add(taperGeo(0.9, 1.3, 3.6, 1.0), plastic(W), 0, -3.6 * s, 0, 0, s, s, s);
    a.sphere(0, -3.9 * s, 0.1 * s, 0.9 * s, W);
    for (let k = -1; k <= 2; k++) spike(a, k * 0.35 * s, -4.4 * s, 0.4 * s, 0.14 * s, 0.9 * s, Math.PI * 0.85, 0, 0x2a2430);
    pv.add(a.build({ name: 'rika-arm' }));
    pv.rotation.z = sd * 0.35; root.add(pv); arms.push(pv);
  }
  return { root, armR: arms[0], armL: arms[1] };
}

// Rika's giant hand + forearm used by the slam hazard (local: forearm runs up +Y from the palm)
export function rikaArm(len) {
  const b = new BrickBuilder(1);
  const W = 0xebe6dc;
  b.add(taperGeo(3.6, 4.4, len, 3.6), plastic(W), 0, 0, 0);
  b.sphere(0, len, 0, 2.6, W);
  b.box(0, -0.6, 0, 4.6, 1.6, 4.2, W);
  for (let k = -1.5; k <= 1.5; k++) { b.box(k * 1.1, -0.9, 2.4, 0.8, 1.1, 1.4, W); spike(b, k * 1.1, -0.6, 3.2, 0.3, 1.1, Math.PI / 2 + 0.3, 0, 0x2a2430); }
  b.box(2.6, -0.6, 0.8, 1.0, 1.0, 1.4, W);
  b.cyl(-0.2, len * 0.15, 1.3, 0.5, 0.3, GOLD, { seg: 10 });
  return b.build({ name: 'rika-hand' });
}

// Nue: owl-like shikigami bird, wings as separate groups for flapping
export function nue(s) {
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 1.0 * s, 0x1b1b22, { sy: 1.1 });
  b.box(0, 0.1 * s, 0.85 * s, 1.2 * s, 0.9 * s, 0.2 * s, C.white);
  for (const sd of [-1, 1]) { b.box(sd * 0.3 * s, 0.45 * s, 0.98 * s, 0.26 * s, 0.14 * s, 0.05 * s, 0xffd040, { matOpts: { emissive: 0xffc020, emissiveIntensity: 1.8 } }); spike(b, sd * 0.5 * s, 0.9 * s, 0, 0.2 * s, 0.7 * s, 0, -sd * 0.4, 0x1b1b22); }
  spike(b, 0, -0.1 * s, 1.0 * s, 0.14 * s, 0.4 * s, Math.PI / 2 + 0.6, 0, GOLD);
  for (const sd of [-1, 1]) spike(b, sd * 0.3 * s, -1.6 * s, 0.1 * s, 0.14 * s, 0.6 * s, 0, 0, GOLD);
  root.add(b.build({ name: 'nue' }));
  const wings = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 0.7 * s, 0.3 * s, 0);
    const w = new BrickBuilder(1);
    for (let k = 0; k < 4; k++) w.box(sd * (0.9 + k * 0.9) * s, -0.1 * s * k, -0.2 * s * k, 1.0 * s, 0.15 * s, (2.0 - k * 0.35) * s, k % 2 ? 0x1b1b22 : 0x2a2a3a);
    pv.add(w.build({ name: 'nue-wing' }));
    root.add(pv); wings.push(pv);
  }
  root.userData.wings = wings;
  return root;
}

// Sitting Hachiko dog statue (static, into a builder)
export function hachiko(b, x, z, rot, s = 1) {
  const col = 0x6a5a3a;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const P = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca];
  let [px, pz] = P(0, 0);
  b.box(px, 0, pz, 3.2 * s, 2.4 * s, 3.8 * s, C.ltgray, { rot });
  [px, pz] = P(0, -0.3); b.box(px, 2.4 * s, pz, 1.4 * s, 1.4 * s, 2.2 * s, col, { rot });
  [px, pz] = P(0, 0.4); b.box(px, 3.3 * s, pz, 1.2 * s, 1.6 * s, 0.9 * s, col, { rot });
  [px, pz] = P(0, 0.6); b.box(px, 4.8 * s, pz, 1.0 * s, 1.0 * s, 1.1 * s, col, { rot });
  [px, pz] = P(0, 1.3); b.box(px, 4.9 * s, pz, 0.5 * s, 0.5 * s, 0.6 * s, col, { rot });
  for (const sd of [-1, 1]) { [px, pz] = P(sd * 0.3, 0.5); b.cone(px, 5.8 * s, pz, 0.22 * s, 0.5 * s, col, { seg: 4 }); [px, pz] = P(sd * 0.35, 1.0); b.box(px, 2.4 * s, pz, 0.3 * s, 1.2 * s, 0.3 * s, col, { rot }); }
}

// Torii gate (static) centred at (x, z), spanning `span` across, facing `rot`
export function torii(b, x, y, z, span, h, rot, col = C.red) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  for (const sd of [-1, 1]) {
    const px = x + ca * sd * span / 2, pz = z - sa * sd * span / 2;
    b.cyl(px, y, pz, 0.7, h, col, { seg: 10 });
    b.cyl(px, y, pz, 0.9, 0.8, C.black, { seg: 10 });
  }
  b.box(x, y + h * 0.78, z, span + 1.6, 0.8, 0.8, col, { rot });
  b.box(x, y + h, z, span + 4, 0.8, 1.4, col, { rot });
  b.box(x, y + h + 0.8, z, span + 5, 0.7, 1.8, C.black, { rot });
  for (const sd of [-1, 1]) b.boxM(mat4(x + ca * sd * (span / 2 + 2.9), y + h + 1.2, z - sa * sd * (span / 2 + 2.9), 0, rot, sd * 0.25, 1.6, 0.6, 1.8), C.black);
  b.box(x, y + h * 0.78 + 0.8, z, 1.2, h * 0.22 - 0.8, 0.5, col, { rot });
}

// Japanese hall with a curved-looking tiered roof (static)
export function hall(b, x, z, w, d, h, rot, { wall = C.white, wood = C.dkred, roof = 0x2a2e36, tiers = 1 } = {}) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  b.box(x, 0, z, w + 2, 1, d + 2, C.ltgray, { rot });
  let y = 1, ww = w, dd = d, hh = h;
  for (let t = 0; t < tiers; t++) {
    b.box(x, y, z, ww, hh, dd, wall, { rot });
    for (let k = -2; k <= 2; k++) for (const sd of [-1, 1]) {
      const lx = k * ww / 4.2, lz = sd * (dd / 2 + 0.1);
      b.box(x + lx * ca + lz * sa, y, z - lx * sa + lz * ca, 0.5, hh, 0.4, wood, { rot });
    }
    b.box(x, y + hh * 0.5, z, ww + 0.3, 0.4, dd + 0.3, wood, { rot });
    y += hh;
    // roof: two sloped slabs + ridge + upturned corners
    for (const sd of [-1, 1]) {
      const lz = sd * dd * 0.3;
      b.boxM(mat4(x + lz * sa, y + dd * 0.18, z + lz * ca, sd * 0.5, rot, 0, ww + 3, 0.5, dd * 0.72 + 1.4), roof);
    }
    b.box(x, y + dd * 0.36, z, ww + 2.4, 0.8, 1, roof, { rot });
    for (const sx of [-1, 1]) for (const sd of [-1, 1]) {
      const lx = sx * (ww / 2 + 1.4), lz = sd * (dd / 2 + 0.6);
      b.boxM(mat4(x + lx * ca + lz * sa, y + 0.3, z - lx * sa + lz * ca, -sd * 0.5, rot, sx * 0.5, 0.6, 0.5, 1.6), roof);
    }
    y += dd * 0.3; ww *= 0.72; dd *= 0.72; hh *= 0.75;
  }
  return y;
}

// Stone lantern (toro)
export function lantern(b, x, z, s = 1) {
  b.box(x, 0, z, 1.4 * s, 0.4 * s, 1.4 * s, C.ltgray);
  b.cyl(x, 0.4 * s, z, 0.3 * s, 1.6 * s, C.ltgray, { seg: 8 });
  b.box(x, 2.0 * s, z, 1.2 * s, 1.0 * s, 1.2 * s, 0xffd070, { matOpts: { emissive: 0xffb040, emissiveIntensity: 1.4 } });
  b.cone(x, 3.0 * s, z, 1.1 * s, 0.9 * s, C.dkgray, { seg: 4 });
}

// Cherry tree (pink canopy)
export function sakura(b, x, z, s = 1, rnd = Math.random) {
  b.cyl(x, 0, z, 0.45 * s, 3.4 * s, 0x4a2a22, { seg: 8 });
  const cols = [0xf7b8c8, 0xfc97ac, 0xf4d0dc];
  for (let k = 0; k < 4; k++) b.sphere(x + (rnd() - 0.5) * 3 * s, (4.4 + rnd() * 1.4) * s, z + (rnd() - 0.5) * 3 * s, (1.5 + rnd() * 0.7) * s, cols[k % 3]);
}
