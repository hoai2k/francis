// Harry Potter brick characters and props for the "Hogwarts Brick Express" map.
// Minifig-style figures (robes, hats, wands) share one printed-face atlas; animated
// parts (arms, wings, legs, branches, tentacles) are separate groups.
import { THREE, BrickBuilder, C, plastic, mat4 } from './kit.js';

// ---- shared geometry -------------------------------------------------------------
const geoCache = new Map();
const G = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
const coneGeo = () => G('cone8', () => new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0));
function taperGeo(bw, tw, h, d, td = d) {
  return G(`tp${bw},${tw},${h},${d},${td}`, () => {
    const g = new THREE.BoxGeometry(bw, h, d);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * (tw / bw)); p.setZ(i, p.getZ(i) * (td / d)); }
    g.computeVertexNormals();
    return g.translate(0, h / 2, 0);
  });
}
export function spike(b, x, y, z, r, h, rx, rz, color, ry = 0, opts) { b.addMatrix(coneGeo(), opts?.mat || plastic(color, opts?.matOpts), mat4(x, y, z, rx, ry, rz, r, h, r)); }
export function rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts) { b.boxM(mat4(x, y, z, rx, ry, rz, sx, sy, sz), color, opts); }
// thick beam (box) between two points
export function beam(b, ax, ay, az, bx, by, bz, t, color, opts) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
  b.boxM(mat4((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, -Math.asin(dy / L), Math.atan2(dx, dz), 0, t, t, L), color, opts);
}

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
export const neon = (color, k = 2) => plastic(color, { emissive: color, emissiveIntensity: k });

// ---- house colours ---------------------------------------------------------------------
export const HOUSES = {
  gryffindor: [0x8a1a1a, 0xe0b040], slytherin: [0x1a5a32, 0xc0c4c8], ravenclaw: [0x1a2e6a, 0xa8784a], hufflepuff: [0xe8c030, 0x1b1b1b],
};
const ROBE = 0x15161c;

// ---- face atlas ----------------------------------------------------------------------------
const FACES = ['harry', 'hermione', 'ron', 'hagrid', 'dumbledore', 'snape', 'mcgonagall', 'draco', 'voldemort', 'student', 'student2', 'dobby', 'luna', 'neville'];
const SKIN = { dumbledore: '#efc3a2', voldemort: '#cfd3cb', dobby: '#c9bda4', snape: '#eadbc8', hagrid: '#ecb592' };
let faceMatCache = null;
function drawFace(g, name, W, H) {
  g.fillStyle = SKIN[name] || '#f3d2b3'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.scale(0.57, 1);
  const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const eyes = (iris, { y = -12, dx = 30, rx = 9, ry = 10 } = {}) => { for (const sd of [-1, 1]) { ell(sd * dx, y, rx + 3, ry + 1, '#fff'); ell(sd * dx, y + 1, rx, ry, iris); ell(sd * dx, y + 2, rx * 0.45, ry * 0.5, '#111'); ell(sd * dx - 3, y - 3, 2.5, 2.5, '#fff'); } };
  const brows = (col, y = -32, tilt = 0, w = 6) => { for (const sd of [-1, 1]) line([[sd * 16, y + tilt], [sd * 44, y - tilt]], col, w); };
  const smile = (w = 18, y = 22, col = '#3a1a1a') => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(0, y - 10, w, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); };
  const flat = (w = 14, y = 26) => line([[-w, y], [w, y]], '#3a1a1a', 5);
  const roundGlasses = (col = '#1b1b1b', r = 17) => { g.strokeStyle = col; g.lineWidth = 5; for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 30, -11, r, 0, 7); g.stroke(); } line([[-13, -12], [13, -12]], col, 4); };
  switch (name) {
    case 'harry': eyes('#2a9a3a'); roundGlasses(); brows('#1b1b1b', -38); line([[-6, -62], [4, -52], [-4, -48], [6, -38]], '#b03030', 4); smile(18, 24); break;
    case 'hermione': eyes('#7a4a2a', { ry: 11 }); brows('#5a3a20', -34, 2, 5); for (const sd of [-1, 1]) line([[sd * 40, -24], [sd * 48, -30]], '#111', 3); smile(20, 24, '#a03a4a'); break;
    case 'ron': eyes('#3a7ad0'); brows('#c0501a', -34); for (let k = 0; k < 14; k++) ell((k % 7 - 3) * 12 + (k > 6 ? 4 : 0), 6 + (k > 6 ? 8 : 0), 2.2, 2.2, '#c0703a'); smile(24, 26); break;
    case 'hagrid':   // (same print as the Hagrid driver) beard + hairline roots, rosy cheeks, kind crinkly glinting black eyes
      g.fillStyle = '#2a1a0f'; g.fillRect(-230, 18, 460, 60); g.fillRect(-230, -70, 460, 26);
      for (const sd of [-1, 1]) ell(sd * 38, 12, 9, 6, 'rgba(232,110,96,0.55)');
      for (const sd of [-1, 1]) {
        ell(sd * 23, -13, 8.5, 10, '#120b06'); ell(sd * 23 + 3, -17, 2.6, 2.6, '#fff'); ell(sd * 23 - 3, -9, 1.4, 1.4, '#fff');
        g.strokeStyle = 'rgba(150,70,50,0.55)'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.arc(sd * 23, -14, 13, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
        line([[sd * 37, -16], [sd * 46, -20]], 'rgba(150,70,50,0.6)', 2.5); line([[sd * 37, -10], [sd * 46, -8]], 'rgba(150,70,50,0.6)', 2.5);
      }
      break;
    case 'dumbledore': case 'voldemort': drawHP(g, name); break;
    case 'snape': eyes('#15161c', { ry: 8 }); brows('#15161c', -30, -5); line([[0, -14], [6, 6]], '#c0a890', 3); flat(12, 28); break;
    case 'mcgonagall': eyes('#4a6a3a', { ry: 8 }); g.strokeStyle = '#3a3a3a'; g.lineWidth = 4; for (const sd of [-1, 1]) g.strokeRect(sd * 30 - 16, -24, 32, 24); brows('#6a6a6a', -36, -2, 4); flat(10, 28); line([[-18, 4], [-24, 20]], '#c8a890', 2); line([[18, 4], [24, 20]], '#c8a890', 2); break;
    case 'draco': eyes('#8a9aa8', { ry: 8 }); brows('#d8c890', -32, -3, 4); g.strokeStyle = '#4a2a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-14, 26); g.quadraticCurveTo(6, 30, 18, 18); g.stroke(); break;
    case 'student': eyes('#5a3a20'); brows('#3a2a1a', -34); smile(18, 24); break;
    case 'student2': eyes('#2a5a8a'); brows('#6a4a2a', -34, 2); smile(14, 26, '#a03a4a'); break;
    case 'dobby': for (const sd of [-1, 1]) { ell(sd * 30, -14, 22, 20, '#fff'); ell(sd * 30, -12, 15, 15, '#3aa04a'); ell(sd * 30, -12, 7, 7, '#111'); ell(sd * 26, -18, 4, 4, '#fff'); } line([[0, -2], [4, 14]], '#9a8a74', 5); smile(12, 30, '#5a3a2a'); break;
    case 'luna': eyes('#5aa0d8', { rx: 11, ry: 12 }); brows('#d8c890', -38, 0, 3); smile(12, 26, '#c06070'); break;
    case 'neville': eyes('#5a3a20', { ry: 9 }); brows('#4a3020', -32, 3); ell(0, 6, 6, 5, '#e0b090'); smile(16, 28); break;
  }
  g.restore();
}
// Dumbledore and Voldemort match their redesigned drivers (../drivers/potter.js): same face
// prints, in the same "round" coordinates (x ±110 = visible front, y ±64).
function drawHP(g, name) {
  const PI = Math.PI;
  const ell = (x, y, rx, ry, col, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, PI * 2); g.fill(); };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  if (name === 'dumbledore') {
    // wrinkles, rosy cheeks, twinkling blue eyes, bushy white brows
    for (const y of [-40, -47]) line([[-22, y], [22, y]], 'rgba(160,96,70,0.45)', 2);
    for (const s of [-1, 1]) { line([[s * 40, -10], [s * 48, -14]], 'rgba(160,96,70,0.5)', 2); line([[s * 40, -4], [s * 48, -2]], 'rgba(160,96,70,0.5)', 2); ell(s * 38, 12, 9, 6, 'rgba(225,110,110,0.45)'); }
    for (const s of [-1, 1]) { ell(s * 24, -9, 8, 6.5, '#ffffff'); ell(s * 24, -9, 5, 5.5, '#2f6fd0'); ell(s * 24, -9, 2.4, 2.8, '#0a1a3a'); ell(s * 22, -11, 1.6, 1.6, '#fff'); }
    line([[-34, -14], [-14, -15]], '#7a4a3a', 2.5); line([[34, -14], [14, -15]], '#7a4a3a', 2.5);
    for (const s of [-1, 1]) { line([[s * 10, -24], [s * 26, -28], [s * 42, -21]], '#f4f4f6', 9); line([[s * 34, -25], [s * 46, -18]], '#d8d8dc', 4); }
    // half-moon spectacles (flat top, low on the nose)
    for (const s of [-1, 1]) {
      g.fillStyle = 'rgba(210,235,255,0.35)'; g.beginPath(); g.arc(s * 24, -5, 15, 0, PI); g.closePath(); g.fill();
      g.strokeStyle = '#c8962a'; g.lineWidth = 4; g.stroke();
      line([[s * 39, -5], [s * 68, -10]], '#c8962a', 3);
    }
    line([[-9, -4], [9, -4]], '#c8962a', 3);
    // beard and moustache roots (the 3D beard sits on top)
    poly([[-70, 14], [-40, 8], [-8, 18], [8, 18], [40, 8], [70, 14], [70, 64], [-70, 64]], '#eceef2');
  } else {
    // sunken eye sockets, red slit eyes, snake-slit nose, thin bloodless lips, temple veins
    for (const s of [-1, 1]) {
      ell(s * 24, -7, 19, 13, 'rgba(110,110,140,0.35)');
      ell(s * 40, 24, 10, 16, 'rgba(120,120,140,0.1)');
      ell(s * 24, -7, 11, 6.5, '#e01818', s * 0.2);
      ell(s * 24, -7, 1.8, 5.6, '#160000');
      ell(s * 27, -9, 1.6, 1.4, 'rgba(255,220,220,0.9)');
      line([[s * 12, -10], [s * 24, -15], [s * 36, -10]], '#3a2a34', 3);
      line([[s * 10, -22], [s * 38, -26]], 'rgba(120,120,150,0.45)', 3);
    }
    poly([[-10, -2], [10, -2], [6, 14], [-6, 14]], 'rgba(150,150,160,0.25)');
    for (const s of [-1, 1]) line([[s * 3, 6], [s * 8, 13]], '#4a2a34', 3.5);
    line([[-20, 28], [-8, 26], [8, 26], [20, 29]], '#7a6a78', 3.5);
    line([[-8, 30], [8, 30]], 'rgba(120,100,120,0.4)', 2);
    line([[-46, -46], [-38, -34], [-42, -22], [-36, -12]], 'rgba(90,120,170,0.6)', 2);
    line([[48, -42], [40, -28], [44, -16]], 'rgba(90,120,170,0.6)', 2);
    line([[-6, -56], [-2, -44], [-8, -34]], 'rgba(90,120,170,0.35)', 2);
  }
}
// printed robe fronts (the drivers' 128 x 160 torso decals), stored in the spare atlas tiles
const ROBES = ['dumbledore', 'voldemort'];
function drawRobe(g, name) {
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const dot = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (name === 'dumbledore') {
    // plum outer robe open over a midnight under-robe sewn with silver stars, gold lapels and belt, gold moons
    rect(0, 0, 128, 160, '#5c1f74');
    poly([[26, 0], [102, 0], [84, 160], [44, 160]], '#2c2160');
    for (const [x, y] of [[46, 30], [80, 52], [56, 78], [74, 100], [52, 140], [78, 146], [64, 120]]) poly([[x, y - 6], [x + 2, y - 2], [x + 6, y], [x + 2, y + 2], [x, y + 6], [x - 2, y + 2], [x - 6, y], [x - 2, y - 2]], '#d8dcf0');
    for (const sd of [-1, 1]) {
      const xa = 64 + sd * 38, xb = 64 + sd * 20, mx = 64 + sd * 50;
      line([[xa, 0], [xb, 160]], '#e2b444', 9); line([[xa + sd * 5, 0], [xb + sd * 5, 160]], '#8a5a18', 2);
      dot(mx, 40, 8, '#e8c25a'); dot(mx + sd * 4, 37, 7, '#5c1f74');
      dot(mx - sd * 2, 92, 4, '#e8c25a'); dot(mx + sd * 2, 132, 5, '#e8c25a'); dot(mx + sd * 6, 132, 4, '#5c1f74');
    }
    rect(30, 116, 68, 11, '#e2b444'); rect(57, 113, 14, 17, '#b8862a'); rect(61, 117, 6, 9, '#e2b444');
  } else {
    // layered, wrapped black robes: a deep V over a dark grey under-robe, fold lines
    rect(0, 0, 128, 160, '#121216');
    poly([[40, 0], [88, 0], [64, 62]], '#2a2a32');
    line([[40, 0], [64, 62], [88, 0]], '#3a3a46', 3);
    poly([[18, 0], [40, 0], [64, 62], [70, 160], [56, 160]], '#18181e');
    for (const [a, b2] of [[[26, 30], [46, 160]], [[100, 30], [84, 160]], [[14, 60], [28, 160]], [[114, 60], [104, 160]], [[64, 70], [66, 160]]]) line([a, b2], 'rgba(70,72,86,0.9)', 3);
  }
}
function faceAtlas() {
  if (faceMatCache) return faceMatCache;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  FACES.forEach((n, k) => { g.save(); g.translate((k % 4) * 256, Math.floor(k / 4) * 128); g.beginPath(); g.rect(0, 0, 256, 128); g.clip(); drawFace(g, n, 256, 128); g.restore(); });
  ROBES.forEach((n, j) => { const k = FACES.length + j; g.save(); g.translate((k % 4) * 256, Math.floor(k / 4) * 128); g.scale(2, 0.8); drawRobe(g, n); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  faceMatCache = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3 });
  return faceMatCache;
}
function faceGeo(name) {
  return G('face' + name, () => {
    const k = FACES.indexOf(name);
    const u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4;
    const g = new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0);
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, u0 + 0.01, v0 + 0.02);
      else uv.setXY(i, u0 + uv.getX(i) * 0.25, v0 + (0.02 + uv.getY(i) * 0.96) * 0.25);
    }
    return g;
  });
}
export function head(b, name, x, y, z, r, h, rot = Math.PI) { b.add(faceGeo(name), faceAtlas(), x, y, z, rot, r, h, r); }
// printed robe front: a plane over the torso and robe panels (front at z 0.35 * s), from the atlas
function robeFront(b, name, s) {
  const geo = G('robe' + name, () => {
    const k = FACES.length + ROBES.indexOf(name), u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4;
    const g = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (0.004 + uv.getX(i) * 0.992) * 0.25, v0 + (0.004 + uv.getY(i) * 0.992) * 0.25);
    return g;
  });
  b.add(geo, faceAtlas(), 0, 1.5 * s, 0.356 * s, 0, 1.14 * s, 1.3 * s, 1);
}

// ---- humanoid (minifig proportions, ~3.9 * s tall); local +Z is the front ------------
// o: { s, face, skinHex, torso, legs, shoes, hips, arms, hands, robe, hair(b,s,top), extra(b,s), itemL/itemR(a,s), arm(a,sd,s), headR, headH, wide, collar }
export function humanoid(o) {
  const s = o.s, wide = o.wide ?? 1;
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const legs = o.legs ?? 0x2a2a30, skin = o.skinHex ?? 0xf3d2b3;
  for (const sd of [-1, 1]) {
    b.box(sd * 0.27 * s * wide, 0, 0.06 * s, 0.5 * s * wide, 0.28 * s, 0.76 * s, o.shoes ?? C.black);
    b.box(sd * 0.27 * s * wide, 0.28 * s, 0, 0.5 * s * wide, 1.02 * s, 0.6 * s, legs);
  }
  b.box(0, 1.3 * s, 0, 1.08 * s * wide, 0.26 * s, 0.62 * s, o.hips ?? legs);
  b.add(taperGeo(1.14 * wide, 0.86 * wide, 1.3, 0.64), plastic(o.torso), 0, 1.56 * s, 0, 0, s, s, s);
  // long open robe: skirt to the knees and panels down the sides of the torso
  if (o.robe !== undefined) {
    b.add(taperGeo(1.5 * wide, 1.16 * wide, 1.3, 0.9, 0.7), plastic(o.robe), 0, 0.2 * s, -0.04 * s, 0, s, s, s);
    for (const sd of [-1, 1]) b.box(sd * 0.42 * s * wide, 1.5 * s, 0, 0.3 * s * wide, 1.3 * s, 0.7 * s, o.robe);
    b.box(0, 1.5 * s, -0.3 * s, 1.1 * s * wide, 1.3 * s, 0.14 * s, o.robe);
  }
  if (o.tie) { b.box(0, 1.9 * s, 0.33 * s, 0.14 * s, 0.8 * s, 0.04 * s, o.tie[0]); for (let k = 0; k < 3; k++) b.box(0, (2.0 + k * 0.24) * s, 0.35 * s, 0.15 * s, 0.06 * s, 0.03 * s, o.tie[1]); }
  if (o.collar !== false) b.cyl(0, 2.78 * s, 0, 0.36 * s, 0.22 * s, o.collar ?? o.torso, { seg: 12 });
  if (o.scarf) for (let k = 0; k < 2; k++) b.cyl(0, (2.72 + k * 0.14) * s, 0, (0.46 - k * 0.04) * s, 0.14 * s, o.scarf[k], { seg: 12 });
  b.cyl(0, 2.86 * s, 0, 0.2 * s, 0.14 * s, skin, { seg: 10 });
  const hr = o.headR ?? 0.43, hh = o.headH ?? 0.74;
  if (o.face) head(b, o.face, 0, 2.98 * s, 0, hr * s, hh * s); else b.cyl(0, 2.98 * s, 0, hr * s, hh * s, skin, { seg: 16 });
  const top = (2.98 + hh) * s;
  o.hair?.(b, s, top);
  o.extra?.(b, s);
  root.add(b.build({ name: 'fig-body' }));
  const arms = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group();
    pv.position.set(sd * 0.56 * s * wide, 2.64 * s, 0);
    const a = new BrickBuilder(1);
    a.add(taperGeo(0.36, 0.42, 1.12, 0.44), plastic(o.arms ?? o.robe ?? o.torso), 0, -1.12 * s, 0, 0, s * wide, s, s);
    if (o.robe !== undefined) a.add(taperGeo(0.62, 0.44, 0.5, 0.6), plastic(o.robe), 0, -1.2 * s, 0, 0, s * wide, s, s);
    a.cyl(0, -1.42 * s, 0, 0.19 * s, 0.34 * s, o.hands ?? skin, { seg: 10 });
    o.arm?.(a, sd, s);
    (sd < 0 ? o.itemR : o.itemL)?.(a, s);
    pv.add(a.build({ name: 'fig-arm' }));
    pv.rotation.z = sd * 0.1;
    root.add(pv);
    arms.push(pv);
  }
  return { root, armR: arms[0], armL: arms[1], s, top };
}

// hair / hats / items ---------------------------------------------------------------------
function cap(b, s, top, col, h = 0.34, r = 0.47) { b.cyl(0, top - 0.24 * s, 0, r * s, h * s, col, { seg: 14 }); }
function witchHat(b, s, top, col, h = 1.5, band) {
  b.cyl(0, top - 0.06 * s, 0, 0.9 * s, 0.08 * s, col, { seg: 16 });
  b.cone(0, top, 0, 0.48 * s, h * s, col, { seg: 12 });
  if (band) b.cyl(0, top, 0, 0.47 * s, 0.14 * s, band, { seg: 12 });
}
const wand = (col = 0x5a3a24, glowTip = 0) => (a, s) => {
  rbox(a, 0, -1.5 * s, 0.45 * s, 0.07 * s, 0.07 * s, 0.9 * s, 0, 0, 0, col);
  if (glowTip) a.sphere(0, -1.5 * s, 0.92 * s, 0.1 * s, glowTip, { matOpts: { emissive: glowTip, emissiveIntensity: 2.6 } });
};
export const hair = {
  harry: (b, s, top) => { cap(b, s, top, 0x1b1b1b); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; spike(b, Math.sin(a) * 0.3 * s, top - 0.1 * s, Math.cos(a) * 0.3 * s, 0.16 * s, 0.32 * s, Math.cos(a) * 0.9, -Math.sin(a) * 0.9, 0x1b1b1b); } },
  hermione: (b, s, top) => { const col = 0x6a4022; cap(b, s, top, col, 0.4, 0.5); for (let k = 0; k < 10; k++) { const a = Math.PI * 0.55 + (k / 9) * Math.PI * 0.9; b.sphere(Math.cos(a) * 0.48 * s, top - (0.5 + (k % 3) * 0.25) * s, Math.sin(a) * 0.4 * s - 0.1 * s, 0.3 * s, col); } b.sphere(0, top - 0.05 * s, -0.05 * s, 0.42 * s, col, { sy: 0.6 }); },
  ron: (b, s, top) => { const col = 0xc8501a; cap(b, s, top, col, 0.38); b.box(0.06 * s, top - 0.3 * s, 0.32 * s, 0.7 * s, 0.22 * s, 0.16 * s, col); },
  draco: (b, s, top) => { const col = 0xf0e0a0; cap(b, s, top, col, 0.3); rbox(b, 0, top - 0.02 * s, -0.04 * s, 0.86 * s, 0.14 * s, 0.86 * s, -0.1, 0, 0, col); },
  snape: (b, s, top) => { const col = 0x15161c; cap(b, s, top, col, 0.36, 0.48); for (const sd of [-1, 1]) b.box(sd * 0.4 * s, top - 1.05 * s, 0.04 * s, 0.16 * s, 1.0 * s, 0.6 * s, col); b.box(0, top - 1.05 * s, -0.36 * s, 0.94 * s, 1.0 * s, 0.18 * s, col); },
  neville: (b, s, top) => cap(b, s, top, 0x4a3020, 0.3),
  luna: (b, s, top) => { const col = 0xf0e4b0; cap(b, s, top, col, 0.36, 0.49); b.box(0, top - 1.4 * s, -0.32 * s, 0.94 * s, 1.4 * s, 0.24 * s, col); for (const sd of [-1, 1]) b.box(sd * 0.4 * s, top - 1.3 * s, 0.0, 0.16 * s, 1.3 * s, 0.5 * s, col); for (const sd of [-1, 1]) b.sphere(sd * 0.46 * s, top - 0.7 * s, 0.1 * s, 0.1 * s, 0xff5a8a); },
};

// ---- characters ------------------------------------------------------------------------------
const uniform = (house) => ({ torso: 0x3a3a40, legs: 0x2a2a30, robe: ROBE, tie: HOUSES[house], collar: 0xf4f4f4 });
export function harry(s, house = 'gryffindor') { return humanoid({ s, face: 'harry', ...uniform(house), scarf: HOUSES[house], hair: hair.harry, itemR: wand(0x6a4a2a) }); }
export function hermione(s) { return humanoid({ s, face: 'hermione', ...uniform('gryffindor'), hair: hair.hermione, legs: 0x5a5a62, itemR: wand(0x8a6a4a, 0xfff2c0), extra: (b, s) => { b.add(taperGeo(1.2, 1.1, 0.5, 0.7), plastic(0x5a5a62), 0, 0.9 * s, 0, 0, s, s, s); } }); }
export function ron(s) { return humanoid({ s, face: 'ron', ...uniform('gryffindor'), torso: 0x8a3a2a, hair: hair.ron, itemR: wand(0x8a6a4a) }); }
export function neville(s) { return humanoid({ s, face: 'neville', ...uniform('gryffindor'), hair: hair.neville, itemL: (a, s) => { a.cyl(0, -2.2 * s, 0.1 * s, 0.4 * s, 0.6 * s, 0x8a4a2a, { seg: 10 }); for (let k = 0; k < 5; k++) spike(a, (k - 2) * 0.12 * s, -1.6 * s, 0.1 * s, 0.1 * s, 0.6 * s, 0, (k - 2) * 0.3, 0x3a8a3a); } }); }
export function luna(s) { return humanoid({ s, face: 'luna', ...uniform('ravenclaw'), hair: hair.luna, itemR: (a, s) => { rbox(a, 0, -1.6 * s, 0.4 * s, 0.6 * s, 0.8 * s, 0.1 * s, 0, 0, 0, 0xe04a8a); } }); }
export function draco(s) { return humanoid({ s, face: 'draco', ...uniform('slytherin'), scarf: HOUSES.slytherin, hair: hair.draco, itemR: wand(0x2a2a2a) }); }
export function student(s, house, v = 0) {
  const hc = [0x3a2a1a, 0x1b1b1b, 0xc8a050, 0x8a3a1a][v % 4];
  return humanoid({ s, face: v % 2 ? 'student2' : 'student', ...uniform(house), scarf: HOUSES[house], hair: (b, s, top) => cap(b, s, top, hc, 0.34 + (v % 3) * 0.04) });
}
export function snape(s) { return humanoid({ s, face: 'snape', skinHex: 0xeadbc8, torso: 0x15161c, legs: 0x15161c, robe: 0x0e0f14, collar: 0xf4f4f4, buttons: 0, hair: hair.snape, itemR: wand(0x1b1b1b) }); }
export function mcgonagall(s) {
  return humanoid({ s, face: 'mcgonagall', torso: 0x1a4a2a, legs: 0x1a4a2a, robe: 0x123a20, collar: 0x1a4a2a, hair: (b, s, top) => { cap(b, s, top, 0x5a5a5a, 0.3); witchHat(b, s, top, 0x123a20, 1.6); }, itemR: wand(0x3a2a1a),
    extra: (b, s) => { b.add(taperGeo(1.5, 1.2, 1.3, 0.9), plastic(0x123a20), 0, 0, 0, 0, s, s, s); } });
}
// ---- Dumbledore / Voldemort: ports of the redesigned drivers to the standing figure ----------------
// local modelling helpers: rods and truncated cones between points, curved shells hugging the head
// cylinder (front arc ±th), tubes through points (rods + ball joints), discs facing +Z, 8-point stars
const YV = new THREE.Vector3(0, 1, 0);
function between(b, geo, a, c, r, col) {
  const A = new THREE.Vector3(...a), dir = new THREE.Vector3(...c).sub(A), len = dir.length();
  b.addMatrix(geo, typeof col === 'number' ? plastic(col) : col, new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(YV, dir.normalize()), new THREE.Vector3(r, len, r)));
}
const rod = (b, a, c, r, col, n = 8) => between(b, G('rod' + n, () => new THREE.CylinderGeometry(1, 1, 1, n).translate(0, 0.5, 0)), a, c, r, col);
function frust(b, a, c, ra, rb, col, n = 16) {
  const k = Math.round((rb / ra) * 20) / 20;
  between(b, G(`frust${k}|${n}`, () => new THREE.CylinderGeometry(k, 1, 1, n).translate(0, 0.5, 0)), a, c, ra, col);
}
function shell(b, x, y0, z, r0, r1, h, th, col, rotY = 0) {
  const k = Math.round((r1 / r0) * 20) / 20, t = Math.round(th * 20) / 20;
  b.add(G(`shell${k}|${t}`, () => new THREE.CylinderGeometry(k, 1, 1, 14, 1, false, -t, t * 2).translate(0, 0.5, 0)), plastic(col), x, y0, z, rotY, r0, h, r0);
}
function tube(b, pts, rad, col) {
  const n = pts.length - 1;
  pts.forEach((p, i) => { const r = rad(i / n); b.sphere(p[0], p[1], p[2], r, col(i)); if (i < n) rod(b, p, pts[i + 1], r, col(i)); });
}
const disc = (b, x, y, z, r, t, col) => b.addMatrix(G('disc16', () => new THREE.CylinderGeometry(1, 1, 1, 16)), plastic(col), mat4(x, y, z, Math.PI / 2, 0, 0, r, t, r));
const star = (b, x, y, z, sz, col, ry = 0) => { for (const q of [0, Math.PI / 4]) rbox(b, x, y, z, sz, sz, sz * 0.35, 0, ry, q, col); };
const lerp = (a, c, k) => a + (c - a) * k;

// Albus Dumbledore: lap-length silver beard with a gold tie, half-moon glasses, crooked starry plum
// hat with a gold band, plum robes with gold trim and moons over a starry midnight under-robe, the Elder Wand
const DB = { ROBE: 0x5c1f74, HAT: 0x4a1862, INNER: 0x2c2160, GOLD: 0xe2b444, BEARD: 0xeceef2, HAIR: 0xdfe1e6, SKIN: 0xefc3a2, STAR: 0xd8dcf0, MOON: 0xf2d470 };
export function dumbledore(s) {
  const { ROBE: R, HAT, INNER, GOLD, BEARD, HAIR, SKIN: SK, STAR, MOON } = DB;
  // wide wizard's sleeves with a gold cuff
  const cuff = (a, s) => a.add(taperGeo(0.65, 0.63, 0.08, 0.63), plastic(GOLD), 0, -1.22 * s, 0, 0, s, s, s);
  // the Elder Wand: grey-brown elder with knobbly nodes, held through the fist (tip at z ~0.95 * s)
  const elder = (a, s) => {
    cuff(a, s);
    const A = [0, -1.24 * s, -0.3 * s], T = [0, -1.48 * s, 0.98 * s], at = (u) => A.map((v, i) => lerp(v, T[i], u));
    rod(a, A, T, 0.045 * s, 0x6e6152, 6);
    rod(a, A, at(0.3), 0.07 * s, 0x5a4c3e, 8);
    a.sphere(...A, 0.08 * s, 0x5a4c3e);
    for (let k = 1; k <= 5; k++) a.sphere(...at(0.3 + k * 0.12), 0.06 * s, 0x6e6152, { sy: 0.75 });
    a.sphere(...T, 0.08 * s, 0xe8f4ff, { matOpts: { emissive: 0xe8f4ff, emissiveIntensity: 2.6 } });
  };
  return humanoid({ s, face: 'dumbledore', skinHex: SK, torso: R, legs: 0x3e1450, robe: R, collar: R, hands: SK, itemR: elder, itemL: cuff,
    hair: (b, s, top) => {
      const r = 0.43 * s, h = 0.74 * s, Y = top - h;
      // long silver hair: back curtain to mid-back, strands, side locks to the shoulders, cap round the back
      b.add(taperGeo(1.2, 2.0, 1.55, 0.5, 0.85), plastic(HAIR), 0, Y - h * 1.15, -r * 0.6, 0, r, h, r);
      for (const x of [-0.45, 0, 0.45]) rbox(b, x * r, Y - h * 0.45, -r * 1.02 - Math.abs(x) * 0.02, r * 0.06, h * 1.2, r * 0.05, 0.12, 0, x * 0.25, 0xc8cad2);
      for (const sd of [-1, 1]) { b.sphere(sd * r * 0.98, Y + h * 0.35, -r * 0.05, r * 0.3, HAIR, { sy: 2.4 }); b.sphere(sd * r * 0.95, Y - h * 0.35, -r * 0.3, r * 0.34, HAIR, { sy: 2.6 }); }
      shell(b, 0, Y + h * 0.1, 0, r * 1.06, r * 1.08, h * 0.8, 1.9, HAIR, Math.PI);
      // beard over the jaw (continues down the chest in extra), drooping moustache, crooked nose
      shell(b, 0, Y - h * 0.3, 0, r * 0.96, r * 1.13, h * 0.68, 1.35, BEARD);
      for (const sd of [-1, 1]) rbox(b, sd * r * 0.3, Y + h * 0.36, r * 1.08, r * 0.62, h * 0.11, r * 0.18, 0, sd * 0.35, -sd * 0.45, BEARD);
      rod(b, [0, Y + h * 0.58, r * 0.95], [r * 0.03, Y + h * 0.5, r * 1.12], r * 0.08, SK);
      rod(b, [r * 0.03, Y + h * 0.5, r * 1.12], [-r * 0.03, Y + h * 0.42, r * 1.24], r * 0.085, SK);
      b.sphere(-r * 0.03, Y + h * 0.42, r * 1.22, r * 0.1, SK);
      // tall plum hat with a drooping, crooked tip, gold band, gold stars and a moon
      const y0 = Y + h * 0.86, H = h * 1.12, hy = (q) => y0 + (q - 0.86) * H;
      b.cyl(0, y0, 0, r * 1.8, 0.05 * s, HAT, { seg: 22 });
      b.cyl(0, y0 + 0.04 * s, 0, r * 1.16, h * 0.13, GOLD, { seg: 18 });
      const P0 = [0, y0, 0], P1 = [0, hy(1.55), -r * 0.12], P2 = [r * 0.05, hy(2.05), -r * 0.42], P3 = [r * 0.1, hy(2.35), -r * 0.95], P4 = [r * 0.15, hy(2.32), -r * 1.5];
      frust(b, P0, P1, r * 1.12, r * 0.74, HAT); b.sphere(...P1, r * 0.74, HAT);
      frust(b, P1, P2, r * 0.74, r * 0.46, HAT); b.sphere(...P2, r * 0.46, HAT);
      frust(b, P2, P3, r * 0.46, r * 0.24, HAT); b.sphere(...P3, r * 0.24, HAT);
      frust(b, P3, P4, r * 0.24, r * 0.02, HAT);
      for (const [a, yy, rr, zo, sz] of [[0.55, 1.12, 0.98, 0, 0.14], [-1.0, 1.3, 0.88, -0.08, 0.11], [2.2, 1.2, 0.95, 0, 0.12], [-2.4, 1.5, 0.8, -0.1, 0.1], [0.25, 1.78, 0.62, -0.25, 0.1], [1.4, 1.62, 0.7, -0.15, 0.09]]) {
        star(b, Math.sin(a) * r * rr, hy(yy), Math.cos(a) * r * rr + zo * r, r * sz, GOLD, a);
      }
      frust(b, [-r * 0.32, hy(1.3), r * 0.7], [-r * 0.32, hy(1.3), r * 0.82], r * 0.17, r * 0.17, MOON);
      frust(b, [-r * 0.24, hy(1.33), r * 0.72], [-r * 0.24, hy(1.33), r * 0.85], r * 0.14, r * 0.14, HAT);
    },
    extra: (b, s) => {
      robeFront(b, 'dumbledore', s);
      // floor-length plum robe with a gold hem, open at the front over the starry midnight under-robe
      b.add(taperGeo(1.6, 1.2, 1.3, 1.0), plastic(R), 0, 0, 0, 0, s, s, s);
      b.add(taperGeo(1.64, 1.59, 0.1, 1.04), plastic(GOLD), 0, 0, 0, 0, s, s, s);
      b.add(taperGeo(0.66, 0.46, 1.3, 0.04), plastic(INNER), 0, 0, 0.5 * s, 0, s, s, s);
      for (const sd of [-1, 1]) beam(b, sd * 0.34 * s, 0, 0.52 * s, sd * 0.24 * s, 1.3 * s, 0.52 * s, 0.07 * s, GOLD);
      for (const [x, y] of [[-0.12, 0.3], [0.1, 0.62], [-0.05, 0.95], [0.14, 0.18], [0.02, 0.42]]) star(b, x * s, y * s, 0.525 * s, 0.07 * s, STAR);
      // gold crescent moons and stars on the plum, front and back
      for (const z of [1, -1]) for (const sd of [-1, 1]) {
        const x = sd * 0.56 * s, zz = z * 0.5 * s;
        disc(b, x, 0.85 * s, zz, 0.13 * s, 0.03 * s, MOON); disc(b, x + sd * 0.06 * s, 0.89 * s, zz + z * 0.008 * s, 0.11 * s, 0.03 * s, R);
        star(b, x - sd * 0.08 * s, 0.42 * s, zz + z * 0.012 * s, 0.08 * s, GOLD);
      }
      // the long beard down to the lap, tied with a gold band near the end; silver strands
      b.add(taperGeo(0.16, 0.74, 1.5, 0.14, 0.26), plastic(BEARD), 0, 1.46 * s, 0.4 * s, 0, s, s, s);
      b.add(taperGeo(0.03, 0.17, 0.2, 0.08, 0.14), plastic(BEARD), 0, 1.24 * s, 0.4 * s, 0, s, s, s);
      b.box(0, 1.4 * s, 0.4 * s, 0.22 * s, 0.08 * s, 0.18 * s, GOLD);
      for (const x of [-0.09, 0.09]) rbox(b, x * s, 2.2 * s, 0.52 * s, 0.03 * s, 1.2 * s, 0.03 * s, 0.07, 0, -x * 1.2, 0xd6d9e0);
    },
  });
}
// Lord Voldemort: pale, bald and domed, red slit eyes, snake-slit nose; Nagini coiled on his shoulders;
// layered black robes with a flared collar and a ragged cape; the bone-white wand with a hooked handle
const VD = { PALE: 0xcfd3cb, BLK: 0x121216, UNDER: 0x1a1a20, FOLD: 0x24242c, SN: 0x56663e, SN2: 0x2f3a24, BELLY: 0xa8a676, BONE: 0xeee6d0 };
export function voldemort(s) {
  const { PALE, BLK, UNDER, FOLD, SN, SN2, BELLY, BONE } = VD;
  // long sleeves draping below the wrist
  const sleeve = (a, s) => { rbox(a, 0, -1.3 * s, -0.24 * s, 0.5 * s, 0.4 * s, 0.06 * s, 0.3, 0, 0, BLK); a.add(taperGeo(0.64, 0.62, 0.05, 0.62), plastic(FOLD), 0, -1.22 * s, 0, 0, s, s, s); };
  const wandR = (a, s) => {
    sleeve(a, s);
    const A = [0, -1.24 * s, -0.22 * s], T = [0, -1.48 * s, 0.98 * s], at = (u) => A.map((v, i) => lerp(v, T[i], u));
    rod(a, A, T, 0.04 * s, BONE, 6);
    rod(a, A, at(0.28), 0.06 * s, 0xd8ccb0, 8);
    rod(a, A, [0, -1.12 * s, -0.36 * s], 0.055 * s, 0xd8ccb0, 6);       // claw-like hooked pommel
    rod(a, [0, -1.12 * s, -0.36 * s], [0, -1.2 * s, -0.46 * s], 0.045 * s, 0xd8ccb0, 6);
    for (let k = 1; k <= 3; k++) a.sphere(...at(0.3 + k * 0.16), 0.06 * s, BONE, { sy: 0.8 });
    a.sphere(...T, 0.075 * s, 0x40ff60, { matOpts: { emissive: 0x40ff60, emissiveIntensity: 2.6 } });
  };
  return humanoid({ s, face: 'voldemort', skinHex: PALE, torso: BLK, legs: BLK, robe: BLK, collar: BLK, hands: PALE, headR: 0.42, itemR: wandR, itemL: sleeve,
    // bald, domed skull
    hair: (b, s, top) => b.sphere(0, top, 0, 0.42 * s, PALE, { sy: 0.55 }),
    extra: (b, s) => {
      robeFront(b, 'voldemort', s);
      // under-robe to the floor; outer robe panels open at the front, ending in ragged points
      b.add(taperGeo(1.6, 1.2, 1.3, 1.0), plastic(UNDER), 0, 0, 0, 0, s, s, s);
      for (const sd of [-1, 1]) {
        b.add(taperGeo(0.62, 0.5, 1.12, 0.06), plastic(BLK), sd * 0.42 * s, 0.3 * s, 0.52 * s, 0, s, s, s);
        b.add(taperGeo(0.16, 0.1, 1.12, 0.05), plastic(BLK), sd * 0.82 * s, 0.3 * s, 0, 0, s, s, s * 9);
        for (let k = 0; k < 3; k++) rbox(b, sd * (0.22 + k * 0.2) * s, 0.3 * s, 0.52 * s, 0.15 * s, 0.15 * s, 0.05 * s, 0, 0, Math.PI / 4, BLK);
        beam(b, sd * 0.12 * s, 0.25 * s, 0.56 * s, sd * 0.2 * s, 1.42 * s, 0.56 * s, 0.035 * s, FOLD);
        beam(b, sd * 0.5 * s, 0.32 * s, 0.56 * s, sd * 0.44 * s, 1.3 * s, 0.56 * s, 0.03 * s, FOLD);
      }
      // ragged cape from the shoulders, flaring out behind
      b.addMatrix(taperGeo(1.9, 1.1, 2.6, 0.07), plastic(BLK), mat4(0, 0.3 * s, -0.6 * s, 0.07, 0, 0, s, s, s));
      for (let k = 0; k < 7; k++) rbox(b, (-0.81 + k * 0.27) * s, 0.3 * s, (-0.6 - 0.002 * k) * s, 0.2 * s, 0.2 * s, 0.06 * s, 0.07, 0, Math.PI / 4, BLK);
      // tall flared collar standing up behind the head, lined in dark grey
      b.addMatrix(taperGeo(0.9, 1.45, 0.75, 0.1), plastic(BLK), mat4(0, 2.68 * s, -0.42 * s, -0.25, 0, 0, s, s, s));
      b.addMatrix(taperGeo(0.84, 1.36, 0.7, 0.04), plastic(FOLD), mat4(0, 2.7 * s, -0.36 * s, -0.25, 0, 0, s, s, s));
      for (const sd of [-1, 1]) {
        rbox(b, sd * 0.5 * s, 2.98 * s, -0.12 * s, 0.07 * s, 0.55 * s, 0.5 * s, 0, sd * 0.35, -sd * 0.3, BLK);
        rbox(b, sd * 0.46 * s, 2.96 * s, -0.1 * s, 0.03 * s, 0.42 * s, 0.4 * s, 0, sd * 0.35, -sd * 0.3, FOLD);
      }
      // Nagini coiled round his shoulders: tail down his right side, head reared over his left shoulder
      const pts = [];
      for (let k = 0; k <= 4; k++) { const u = k / 4; pts.push([lerp(-0.18, -0.5, u) * s, lerp(1.7, 2.72, u) * s, lerp(0.44, 0.42, u) * s]); }
      const N = 22;
      for (let k = 1; k <= N; k++) { const th = lerp(-0.85, -2 * Math.PI + 0.85, k / N); pts.push([Math.sin(th) * 0.64 * s, (2.82 + 0.14 * Math.abs(Math.sin(th))) * s, Math.cos(th) * 0.5 * s]); }
      pts.push([0.62 * s, 3.08 * s, 0.48 * s], [0.66 * s, 3.22 * s, 0.6 * s]);
      tube(b, pts, (u) => (0.035 + 0.08 * Math.min(1, u * 2.2) - 0.02 * Math.min(1, Math.max(0, (u - 0.85) / 0.15))) * s, (i) => (i % 3 === 0 ? SN2 : SN));
      // head: flat diamond skull, pale jaw, yellow eyes, forked tongue
      const hx = 0.66 * s, hy = 3.24 * s, hz = 0.66 * s;
      b.sphere(hx, hy, hz, 0.13 * s, SN, { sy: 0.55 });
      b.sphere(hx, hy - 0.01 * s, hz + 0.11 * s, 0.1 * s, SN, { sy: 0.5 });
      b.sphere(hx, hy - 0.03 * s, hz + 0.05 * s, 0.11 * s, BELLY, { sy: 0.4 });
      for (const sd of [-1, 1]) b.sphere(hx + sd * 0.09 * s, hy + 0.03 * s, hz + 0.08 * s, 0.028 * s, 0xf0d020);
      rod(b, [hx, hy - 0.02 * s, hz + 0.19 * s], [hx, hy - 0.025 * s, hz + 0.3 * s], 0.01 * s, 0xc01818, 4);
      for (const sd of [-1, 1]) rod(b, [hx, hy - 0.025 * s, hz + 0.3 * s], [hx + sd * 0.03 * s, hy - 0.03 * s, hz + 0.36 * s], 0.008 * s, 0xc01818, 4);
    },
  });
}
// ---- Rubeus Hagrid: a port of the redesigned driver (../drivers/potter.js) ----------------------------
// The driver is modelled in a seated rig's units (scale 1.7, wide 1.3, deep 1.25, head r 0.527 h 0.85).
// Its parts are drawn here through affine "frames" that map the rig's head, torso and arms onto this
// humanoid's, so the track figure wears the same design (still one merged mesh per builder).
const _xm = new THREE.Matrix4();
// a view of builder b that transforms every part by M first
function xf(b, M) { const o = Object.create(b); o.addMatrix = (geo, mat, m) => b.addMatrix(geo, mat, _xm.multiplyMatrices(M, m)); return o; }
const sxf = (x, y, z, sx, sy, sz) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
// XYZ-order transform and rotated box, as in the drivers' kit
const m4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _w.set(sx, sy, sz));
const dbox = (b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts) => b.boxM(m4(x, y, z, rx, ry, rz, sx, sy, sz), color, opts);
// head frame: a rig head (radius dr, height dh, base at 0) onto this humanoid's head (base at top - hh * s)
const headXf = (b, s, top, dr, dh, hr, hh) => xf(b, sxf(0, top - hh * s, 0, (hr * s) / dr, (hh * s) / dh, (hr * s) / dr));
// torso / arm frames for a rig of scale ds, wide W, deep D onto humanoid({ s, wide: w }) with torso half-depth dz * s
function frames(s, w, ds, W, D, dz = 0.32) {
  const kx = (1.14 * w * s) / (0.92 * W * ds), ky = (1.3 * s) / (0.82 * ds), kz = (dz * s) / (0.21 * D * ds), aw = Math.sqrt(W);
  return {
    torso: sxf(0, 1.56 * s - 0.18 * ds * ky, 0, kx, ky, kz),
    arm: sxf(0, 0, 0, (0.42 * w * s) / (0.26 * aw * ds), (1.12 * s) / (0.52 * ds), (0.44 * s) / (0.26 * aw * ds)),
  };
}
// an ellipsoid turned rx/ry/rz (radii sx/sy/sz) and a cone from base a to tip c — the shaggy mane,
// beard, bulging pockets and wild strands are built from these
const hgSph = () => G('hgSph', () => new THREE.SphereGeometry(1, 18, 12));
function hgBlob(b, x, y, z, sx, sy, sz, mat, rx = 0, ry = 0, rz = 0) { b.addMatrix(hgSph(), typeof mat === 'number' ? plastic(mat) : mat, m4(x, y, z, rx, ry, rz, sx, sy, sz)); }
function hgSpike(b, a, c, r, mat) { between(b, coneGeo(), a, c, r, mat); }
// a solid wedge of a (tapered) cylinder facing +Z over ±th: the beard under the face
function hgShell(b, y0, r0, r1, h, th, mat) {
  const k = Math.round((r1 / r0) * 20) / 20, t = Math.round(th * 20) / 20;
  b.add(G(`hgShell${k}|${t}`, () => new THREE.CylinderGeometry(k, 1, 1, 18, 1, false, -t, t * 2).translate(0, 0.5, 0)), mat, 0, y0, 0, 0, r0, h, r0);
}
const HG = { HAIR: 0x1e1209, HAIR2: 0x28180c, COAT: 0x5c3a20, COAT2: 0x452c16, POCK: 0x6e4a2c, FLAP: 0x3e2614, BELT: 0x261a10, BRASS: 0xcaa040, SKN: 0xecb592, ROSY: 0xe9806e, NOSE: 0xdf9b7b, PINK: 0xf478b4, VEST: 0x7a3c1e, LEGS: 0x33241a, BOOT: 0x24170e };
// head (rig units: r 0.527, h 0.85, base at 0): one big wild near-black matte mane and beard round a small face window
function hagridHead(b, r, h, HM, HM2) {
  const S = Math.sin, { NOSE, ROSY } = HG;
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
    const a = -1.5 + (k / 12) * 3.0, bk = (k % 3) * 0.3;
    const bx = S(a) * r * 1.1, by = h * 0.85 + Math.cos(a) * h * 0.55, bz = -r * (0.15 + bk);
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
}
// torso (rig units; d = { s, W, D }): beard down the chest, lapels, rusty waistcoat, belt and brass buckle,
// six bulging pockets with flaps and brass buttons, side pockets
function hagridTorso(b, d, HM, HM2) {
  const s = d.s, W = d.W, D = d.D, { COAT2, POCK, FLAP, BELT, BRASS, VEST } = HG;
  const F = (y) => (0.23 - 0.02 * ((y / s - 0.18) / 0.82)) * s * D;   // front of the torso at height y
  // the rusty waistcoat in the gap of the coat (the driver's printed front), with dark buttons
  b.add(taperGeo(0.2, 0.3, 0.8, 0.02), plastic(VEST), 0, 0.18 * s, F(0.5 * s) + 0.004 * s, 0, s * W, s, s);
  for (let y = 0.3; y < 0.7; y += 0.12) b.sphere(0, y * s, F(y * s) + 0.016 * s, 0.024 * s, 0x2a1a10, { sy: 0.8 });
  // beard spilling down the chest
  hgBlob(b, 0, 0.7 * s, F(0.7 * s) - 0.02 * s, 0.3 * s, 0.24 * s, 0.13 * s, HM);
  hgBlob(b, 0, 0.47 * s, F(0.47 * s), 0.19 * s, 0.15 * s, 0.1 * s, HM);
  for (const [x, y] of [[-0.16, 0.62], [0.17, 0.66], [0.06, 0.52], [-0.08, 0.76]]) hgBlob(b, x * s, y * s, F(y * s) + 0.07 * s, 0.1 * s, 0.07 * s, 0.05 * s, HM2);
  for (const x of [-0.1, 0, 0.1]) hgSpike(b, [x * s, 0.44 * s, F(0.44 * s) + 0.04 * s], [x * 1.3 * s, 0.32 * s, F(0.32 * s) + 0.06 * s], 0.055 * s, x ? HM2 : HM);
  // wide coat lapels
  for (const sd of [-1, 1]) dbox(b, sd * 0.24 * s, 0.68 * s, F(0.68 * s) + 0.01 * s, 0.13 * s, 0.6 * s, 0.04 * s, 0, 0, sd * 0.2, COAT2);
  // belt with a brass buckle
  b.box(0, 0.2 * s, 0, 0.92 * s * W + 0.02, 0.1 * s, 0.47 * s * D + 0.02, BELT);
  b.box(0, 0.19 * s, F(0.2 * s) + 0.005, 0.15 * s, 0.12 * s, 0.03 * s, BRASS);
  b.box(0, 0.215 * s, F(0.2 * s) + 0.02, 0.08 * s, 0.05 * s, 0.02 * s, BELT);
  // lots of bulging pockets with flaps
  for (const sd of [-1, 1]) {
    for (const [x, y, w, hh] of [[0.36, 0.42, 0.13, 0.11], [0.37, 0.72, 0.1, 0.08]]) {
      const z = F(y * s);
      hgBlob(b, sd * x * s, y * s, z, w * s, hh * s, 0.06 * s, POCK);
      dbox(b, sd * x * s, (y + hh * 0.75) * s, z + 0.03 * s, w * 2.05 * s, hh * 0.55 * s, 0.05 * s, 0.2, 0, 0, FLAP);
      b.sphere(sd * x * s, (y + hh * 0.55) * s, z + 0.065 * s, 0.025 * s, BRASS);
    }
    hgBlob(b, sd * 0.5 * s * W, 0.42 * s, 0.02 * s, 0.07 * s, 0.12 * s, 0.13 * s, POCK);   // side pockets
  }
}
// arms (rig units): turned-back coat cuffs and huge hands
function hagridArm(ab, sd, d) {
  const s = d.s, w = Math.sqrt(d.W);
  ab.add(taperGeo(0.3, 0.29, 0.11, 0.31), plastic(HG.COAT2), 0, -0.55 * s, 0, 0, s * w, s, s * w);
  ab.sphere(0, -0.67 * s, 0.01 * s, 0.135 * s, HG.SKN, { sy: 1.05 });
  ab.sphere(-sd * 0.09 * s, -0.6 * s, 0.07 * s, 0.06 * s, HG.SKN);
}
// Rubeus Hagrid: huge and broad, shaggy black mane and beard round a small kind face, dark moleskin coat
// with lapels and bulging pockets over a rusty waistcoat, belt with a brass buckle, the pink umbrella
export function hagrid(s) {
  const { COAT, COAT2, LEGS, BOOT, SKN, PINK, HAIR, HAIR2 } = HG, w = 1.5, HR = 0.5, HH = 0.8, DZ = 0.42;
  const ds = 1.7, d = { s: ds, W: 1.3, D: 1.25 }, Fr = frames(s, w, ds, d.W, d.D, DZ);
  const HM = plastic(HAIR, { rough: 0.72 }), HM2 = plastic(HAIR2, { rough: 0.72 });
  return humanoid({ s, face: 'hagrid', skinHex: SKN, torso: COAT, legs: LEGS, hips: COAT, arms: COAT, hands: SKN, wide: w, headR: HR, headH: HH, collar: false, shoes: BOOT,
    hair: (b, s, top) => hagridHead(headXf(b, s, top, 0.31 * ds, 0.5 * ds, HR, HH), 0.31 * ds, 0.5 * ds, HM, HM2),
    extra: (b, s) => {
      // a deep barrel of a coat over the torso, and its long skirt down past the knees, split at the front
      b.add(taperGeo(1.14 * w, 0.86 * w, 1.3, DZ * 2), plastic(COAT), 0, 1.56 * s, 0, 0, s, s, s);
      b.add(taperGeo(1.95, 1.74, 1.18, 1.12, 1.0), plastic(COAT), 0, 0.42 * s, -0.02 * s, 0, s, s, s);
      b.add(taperGeo(1.99, 1.96, 0.1, 1.16), plastic(COAT2), 0, 0.42 * s, -0.02 * s, 0, s, s, s);
      rbox(b, 0, 1.01 * s, 0.512 * s, 0.07 * s, 1.18 * s, 0.04 * s, -0.05, 0, 0, 0x2e1c0e);
      hagridTorso(xf(b, Fr.torso), d, HM, HM2);
    },
    arm: (a, sd) => hagridArm(xf(a, Fr.arm), sd, d),
    // the pink umbrella (a broken wand hidden inside) hanging forward from his right fist; its tip glows faintly
    itemR: (a, s) => {
      const k = 1.27 * s, u = xf(a, new THREE.Matrix4().makeTranslation(0, -1.42 * s, 0.02 * s).multiply(new THREE.Matrix4().makeRotationX(-0.5)).multiply(new THREE.Matrix4().makeScale(k, k, k)));
      rod(u, [0, 0.05, 0], [0, -0.95, 0], 0.018, 0x7a5a3a, 6);
      u.add(taperGeo(0.05, 0.17, 0.58, 0.17), plastic(PINK), 0, -0.86, 0, 0, 1, 1, 1);
      u.cyl(0, -0.55, 0, 0.07, 0.04, 0xd85a98, { seg: 10 });
      rod(u, [0, 0.05, 0], [0, 0.13, 0.09], 0.024, 0x7a5a3a, 6);
      u.sphere(0, -0.96, 0, 0.026, 0xff70c0, { matOpts: { emissive: 0xff70c0, emissiveIntensity: 2.4 } });
    },
  });
}
// Dobby: small house-elf in a pillowcase with huge ears
export function dobby(s) {
  const SK = 0xc9bda4;
  return humanoid({ s, face: 'dobby', skinHex: SK, torso: 0xd8d0bc, legs: SK, arms: SK, hands: SK, hips: 0xd8d0bc, shoes: SK, headR: 0.5, collar: false, wide: 0.85,
    hair: (b, s, top) => { b.sphere(0, top - 0.1 * s, 0, 0.5 * s, SK, { sy: 0.4 }); for (const sd of [-1, 1]) rbox(b, sd * 0.85 * s, top - 0.35 * s, 0, 0.9 * s, 0.5 * s, 0.08 * s, 0, 0, sd * 0.25, SK); },
    extra: (b, s) => { b.add(taperGeo(1.2, 1.0, 1.0, 0.8), plastic(0xd8d0bc), 0, 0.9 * s, 0, 0, s, s, s); },
    itemL: (a, s) => { a.box(0, -2.0 * s, 0.1 * s, 0.24 * s, 0.6 * s, 0.24 * s, 0xf4f4f4); a.box(0, -2.0 * s, 0.24 * s, 0.24 * s, 0.24 * s, 0.4 * s, 0xf4f4f4); } });
}

// ---- creatures -------------------------------------------------------------------------------------
// Hedwig: snowy owl, wings are separate groups (userData.wings) for flapping. ~2.4 * s wingspan
export function hedwig(s = 1) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 0.6 * s, C.white, { sy: 1.35 }); b.sphere(0, 0.85 * s, 0.1 * s, 0.48 * s, C.white);
  for (const sd of [-1, 1]) { b.sphere(sd * 0.2 * s, 0.92 * s, 0.48 * s, 0.11 * s, 0xf2cd37, { matOpts: { emissive: 0xc8a020, emissiveIntensity: 0.6 } }); b.sphere(sd * 0.2 * s, 0.92 * s, 0.56 * s, 0.05 * s, C.black); }
  spike(b, 0, 0.82 * s, 0.5 * s, 0.07 * s, 0.18 * s, Math.PI / 2 + 0.4, 0, 0x3a3a3a);
  for (let k = 0; k < 6; k++) b.box(Math.cos(k * 2.1) * 0.3 * s, (k * 0.12 - 0.4) * s, -0.45 * s, 0.1 * s, 0.06 * s, 0.06 * s, 0x3a3a3a);
  rbox(b, 0, -0.7 * s, -0.5 * s, 0.5 * s, 0.1 * s, 0.6 * s, 0.5, 0, 0, C.white);
  g.add(b.build({ name: 'hedwig' }));
  const wings = [];
  for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sd * 0.45 * s, 0.25 * s, 0);
    const wb = new BrickBuilder(1);
    wb.box(sd * 0.75 * s, -0.05 * s, 0, 1.5 * s, 0.1 * s, 0.75 * s, C.white);
    wb.box(sd * 1.6 * s, -0.05 * s, -0.1 * s, 0.6 * s, 0.08 * s, 0.55 * s, C.white);
    for (let k = 0; k < 3; k++) wb.box(sd * (0.5 + k * 0.5) * s, 0.01 * s, -0.2 * s, 0.14 * s, 0.04 * s, 0.1 * s, 0x3a3a3a);
    w.add(wb.build({ name: 'wing' })); g.add(w); wings.push(w);
  }
  g.userData.wings = wings;
  return g;
}
// Dementor: hooded tattered cloak floating; ~6 * s tall, origin at the hem
export function dementor(s = 1) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  const CL = 0x101116, CL2 = 0x1c1e26;
  b.add(G('dem-cloak', () => new THREE.ConeGeometry(1, 1, 9, 1, true).translate(0, 0.5, 0)), plastic(CL, { rough: 0.95 }), 0, 0, 0, 0, 1.1 * s, 5 * s, 1.1 * s);
  b.sphere(0, 4.9 * s, 0, 0.75 * s, CL2, { sy: 1.15 });
  spike(b, 0, 5.4 * s, -0.25 * s, 0.6 * s, 1.1 * s, -0.5, 0, CL);
  b.sphere(0, 4.75 * s, 0.32 * s, 0.5 * s, 0x000000, { sy: 1.2 });
  for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2; rbox(b, Math.sin(a) * 1.0 * s, -0.6 * s - (k % 3) * 0.4 * s, Math.cos(a) * 1.0 * s, 0.4 * s, (1.6 + (k % 3) * 0.6) * s, 0.08 * s, Math.cos(a) * 0.2, a, -Math.sin(a) * 0.2, k % 2 ? CL : CL2); }
  for (const sd of [-1, 1]) {
    rbox(b, sd * 0.9 * s, 3.4 * s, 0.5 * s, 0.4 * s, 1.6 * s, 0.4 * s, -0.9, 0, sd * 0.5, CL2);
    for (let k = 0; k < 4; k++) rbox(b, sd * (1.25 + k * 0.08) * s, 3.0 * s, (1.3 + k * 0.05) * s, 0.06 * s, 0.7 * s, 0.06 * s, -1.2, 0, sd * (0.2 + k * 0.15), 0x7a7a80);
  }
  g.add(b.build({ name: 'dementor' }));
  return g;
}
// Acromantula: 8-legged spider, ~3.4 * s across; legs are groups (userData.legs)
export function spider(s = 1, col = 0x1e1a18) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 1.6 * s, -1.2 * s, 1.3 * s, col, { sy: 0.85 });
  b.sphere(0, 1.4 * s, 0.4 * s, 0.75 * s, col);
  for (let k = 0; k < 10; k++) b.box(Math.cos(k * 1.7) * 0.6 * s, (1.6 + Math.sin(k * 2.3) * 0.7) * s, (-1.2 + Math.sin(k * 1.1) * 0.6) * s, 0.12 * s, 0.4 * s, 0.12 * s, 0x5a4a3a);
  for (let k = 0; k < 6; k++) b.sphere(((k % 3) - 1) * 0.22 * s, (1.6 + Math.floor(k / 3) * 0.2) * s, 1.05 * s, 0.1 * s, 0x000000, { matOpts: { emissive: 0x200000, emissiveIntensity: 1, rough: 0.1 } });
  for (const sd of [-1, 1]) spike(b, sd * 0.2 * s, 1.0 * s, 1.0 * s, 0.1 * s, 0.6 * s, Math.PI * 0.8, 0, 0x8a7a6a);
  g.add(b.build({ name: 'spider' }));
  const legs = [];
  for (let k = 0; k < 8; k++) {
    const sd = k < 4 ? -1 : 1, n = k % 4;
    const pv = new THREE.Group(); pv.position.set(sd * 0.5 * s, 1.5 * s, (0.6 - n * 0.4) * s); pv.rotation.y = sd * (Math.PI / 2) + (n - 1.5) * 0.45 * sd;
    const lb = new BrickBuilder(1);
    rbox(lb, 0, 0.5 * s, 1.0 * s, 0.22 * s, 0.22 * s, 2.2 * s, -0.5, 0, 0, col);
    rbox(lb, 0, 0.0, 2.6 * s, 0.18 * s, 0.18 * s, 2.4 * s, 1.0, 0, 0, col);
    pv.add(lb.build({ name: 'spider-leg' })); g.add(pv); legs.push(pv);
  }
  g.userData.legs = legs;
  return g;
}
export function spiderWalk(sp, t, amp = 0.25) { sp.userData.legs.forEach((l, k) => { l.rotation.x = Math.sin(t + (k % 2) * Math.PI + (k > 3 ? Math.PI / 2 : 0)) * amp; }); }

// Buckbeak the hippogriff (~5 * s long) lying in the pumpkin patch
export function buckbeak(s = 1) {
  const b = new BrickBuilder(1), GR = 0x8a8a90, FE = 0xb8b8c0;
  b.box(0, 1.0 * s, -0.6 * s, 1.6 * s, 1.5 * s, 3.4 * s, GR);
  b.box(0, 1.3 * s, 1.2 * s, 1.5 * s, 1.6 * s, 1.4 * s, FE);
  rbox(b, 0, 3.0 * s, 1.9 * s, 0.9 * s, 1.6 * s, 0.9 * s, 0.4, 0, 0, FE);
  b.box(0, 3.6 * s, 2.3 * s, 0.9 * s, 0.9 * s, 1.1 * s, C.white);
  spike(b, 0, 3.85 * s, 2.8 * s, 0.25 * s, 0.9 * s, Math.PI / 2 + 0.5, 0, 0xc8a040);
  for (const sd of [-1, 1]) { b.sphere(sd * 0.45 * s, 4.05 * s, 2.6 * s, 0.12 * s, 0xff9a20, { matOpts: { emissive: 0xc86010, emissiveIntensity: 1 } }); rbox(b, sd * 0.95 * s, 2.0 * s, -0.3 * s, 0.2 * s, 1.0 * s, 3.4 * s, 0.25, 0, sd * 0.3, FE); for (const z of [1.4, -1.8]) b.box(sd * 0.55 * s, 0, z * s, 0.4 * s, 1.0 * s, 0.4 * s, z > 0 ? 0xc8a040 : GR); }
  rbox(b, 0, 1.6 * s, -2.6 * s, 0.3 * s, 0.3 * s, 1.6 * s, 0.8, 0, 0, GR);
  return b.build({ name: 'buckbeak' });
}
// Fang the boarhound
export function fang(s = 1) {
  const b = new BrickBuilder(1), D = 0x2a2420;
  b.box(0, 1.0 * s, -0.2 * s, 1.0 * s, 1.0 * s, 2.4 * s, D); b.box(0, 1.5 * s, 1.2 * s, 0.9 * s, 0.9 * s, 0.9 * s, D); b.box(0, 1.3 * s, 1.8 * s, 0.6 * s, 0.5 * s, 0.6 * s, D);
  for (const sd of [-1, 1]) { b.box(sd * 0.5 * s, 1.6 * s, 1.1 * s, 0.14 * s, 0.7 * s, 0.4 * s, D); for (const z of [0.7, -1]) b.box(sd * 0.32 * s, 0, z * s, 0.3 * s, 1.0 * s, 0.3 * s, D); }
  b.box(0, 1.1 * s, 2.1 * s, 0.2 * s, 0.14 * s, 0.1 * s, C.black); b.box(0, 0.9 * s, 1.9 * s, 0.3 * s, 0.3 * s, 0.1 * s, 0xe05a6a);
  return b.build({ name: 'fang' });
}
// Golden Snitch with fluttering wings
export function snitch(s = 1) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 0.35 * s, 0xf2c030, { matOpts: { metal: 0.8, rough: 0.2, emissive: 0xc89010, emissiveIntensity: 0.8 } });
  g.add(b.build({ name: 'snitch' }));
  const wings = [];
  for (const sd of [-1, 1]) { const w = new THREE.Group(); const wb = new BrickBuilder(1); rbox(wb, sd * 0.7 * s, 0.1 * s, 0, 1.1 * s, 0.04 * s, 0.4 * s, 0, 0, 0, 0xf4f4f0, { matOpts: { trans: true, opacity: 0.85 } }); w.add(wb.build()); g.add(w); wings.push(w); }
  g.add(glow(0xffd040, 3 * s, 0.7));
  g.userData.wings = wings;
  return g;
}
// Bludger: an iron ball with a dark shadow under it (shadow at local y = -lift)
export function bludger(r = 1.3, lift = 1.6) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 0, 0, r, 0x2a2420, { matOpts: { metal: 0.6, rough: 0.35 } });
  for (let k = 0; k < 3; k++) rbox(b, 0, 0, 0, r * 2.05, 0.16, 0.16, 0, k * 1.05, 0.6, 0x5a4a3a);
  const ball = b.build({ name: 'bludger' }); ball.position.y = lift; g.add(ball);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(r * 1.2, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  sh.position.y = 0.12; g.add(sh);
  g.userData.ball = ball;
  return g;
}

// ---- vehicles ----------------------------------------------------------------------------------------
const wheelGeo = () => G('wheel', () => new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2));
const SCARLET = 0xa8141a, BLACKM = 0x1b1b1e, GOLDT = 0xd8b040;
// Hogwarts Express: steam engine + tender + carriages along +Z (front). Returns { root, length, chimney }
export function express(cars = 3) {
  const root = new THREE.Group(), b = new BrickBuilder(1);
  const lit = plastic(0xffe0a0, { emissive: 0xffc860, emissiveIntensity: 1.2 });
  const wheel = (x, z, r) => { b.add(wheelGeo(), plastic(SCARLET), x, r, z, 0, 0.4, r, r); b.add(wheelGeo(), plastic(BLACKM), x + Math.sign(x) * 0.25, r, z, 0, 0.12, r * 0.4, r * 0.4); };
  // engine (front at z = 0)
  let z = -7;
  b.box(0, 0.5, z, 3.6, 0.8, 14, BLACKM);
  b.add(G('boiler', () => new THREE.CylinderGeometry(1, 1, 1, 18).rotateX(Math.PI / 2)), plastic(SCARLET), 0, 3.0, z + 1.2, 0, 1.6, 1.6, 8.5);
  for (const zz of [-2.4, 0.4, 3.2]) b.add(G('boiler'), plastic(GOLDT, { metal: 0.6, rough: 0.3 }), 0, 3.0, z + zz, 0, 1.66, 1.66, 0.3);
  b.add(G('boiler'), plastic(BLACKM), 0, 3.0, z + 5.8, 0, 1.7, 1.7, 1.4);
  b.cyl(0, 4.4, z + 5.6, 0.5, 2.2, BLACKM, { seg: 10 }); b.cyl(0, 6.4, z + 5.6, 0.7, 0.4, BLACKM, { seg: 10 });
  b.cyl(0, 4.4, z + 2.4, 0.6, 0.9, GOLDT, { seg: 10, matOpts: { metal: 0.6, rough: 0.3 } });
  b.box(0, 1.2, z - 4.8, 3.6, 4.4, 3.4, SCARLET); b.box(0, 5.6, z - 4.8, 4.0, 0.4, 3.8, BLACKM);
  for (const sd of [-1, 1]) b.box(sd * 1.81, 3.2, z - 4.6, 0.05, 1.2, 1.6, 0, { mat: lit });
  b.box(0, 0.6, z + 7.0, 3.8, 0.8, 0.5, SCARLET); b.sphere(0, 3.0, z + 6.6, 0.45, 0, { mat: plastic(0xfff4c0, { emissive: 0xffe080, emissiveIntensity: 2.4 }) });
  b.box(0, 1.6, z + 7.4, 2.4, 0.3, 0.6, BLACKM);
  for (const sd of [-1, 1]) { for (const zz of [-2.6, -0.2, 2.2]) wheel(sd * 1.6, z + zz, 1.15); wheel(sd * 1.6, z + 5.2, 0.6); b.box(sd * 1.95, 1.15, z - 0.2, 0.12, 0.2, 5.2, 0x8a8a8a, { matOpts: { metal: 0.7, rough: 0.3 } }); }
  // tender
  z = -18; b.box(0, 0.5, z, 3.6, 3.6, 7, SCARLET); b.box(0, 4.1, z, 3.2, 0.6, 6.4, 0x2a2a2a); b.box(0, 3.4, z, 3.7, 0.3, 7.1, GOLDT);
  for (const sd of [-1, 1]) for (const zz of [-2, 2]) wheel(sd * 1.6, z + zz, 0.75);
  // carriages
  for (let c = 0; c < cars; c++) {
    z = -30 - c * 14;
    b.box(0, 0.8, z, 3.8, 4.4, 13, SCARLET); b.box(0, 3.0, z, 3.9, 0.3, 13.1, GOLDT);
    b.add(G('roof', () => new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2)), plastic(BLACKM), 0, 5.2, z, 0, 2.0, 0.6, 13);
    for (const sd of [-1, 1]) for (let w = -2; w <= 2; w++) b.box(sd * 1.92, 3.4, z + w * 2.4, 0.06, 1.3, 1.8, 0, { mat: lit });
    for (const sd of [-1, 1]) for (const zz of [-4.5, 4.5]) wheel(sd * 1.6, z + zz, 0.75);
  }
  const body = b.build({ name: 'hogwarts-express' }); root.add(body);
  return { root, length: 30 + cars * 14, chimney: new THREE.Vector3(0, 6.8, -1.4) };
}
// Knight Bus: purple triple-decker, front along +Z (~12 long)
export function knightBus() {
  const b = new BrickBuilder(1), P = 0x4a1f8a;
  const lit = plastic(0xffe8a0, { emissive: 0xffd070, emissiveIntensity: 1.1 });
  b.box(0, 0.7, 0, 4.4, 8.4, 12, P);
  for (let f = 0; f < 3; f++) { b.box(0, 1.7 + f * 2.7, 0, 4.5, 1.4, 11.2, 0, { mat: lit }); b.box(0, 3.4 + f * 2.7, 0, 4.6, 0.3, 12.1, 0xd8b040); }
  b.box(0, 9.1, 0, 4.2, 0.4, 11.6, 0x3a1670);
  b.box(0, 1.2, 6.0, 4.0, 2.2, 0.2, 0x1b1b1b); for (const sd of [-1, 1]) b.sphere(sd * 1.5, 1.6, 6.1, 0.4, 0, { mat: plastic(0xfff4c0, { emissive: 0xffe080, emissiveIntensity: 2.4 }) });
  b.box(0, 7.6, 6.08, 3.6, 0.9, 0.1, 0xd8b040);
  for (const sd of [-1, 1]) for (const z of [-3.8, 3.8]) b.add(wheelGeo(), plastic(0x1b1b1b), sd * 2.1, 1.0, z, 0, 0.6, 1.0, 1.0);
  const g = b.build({ name: 'knight-bus' });
  const hold = new THREE.Group(); hold.add(g);
  const lamp = glow(0xfff0b0, 9, 0.7); lamp.position.set(0, 1.6, 7); hold.add(lamp);
  return hold;
}
// Flying Ford Anglia (light blue), front along +Z
export function fordAnglia() {
  const b = new BrickBuilder(1), BL = 0x7ab4d4;
  b.box(0, 0.6, 0, 2.6, 1.2, 5.4, BL); b.box(0, 1.8, -0.3, 2.3, 1.2, 2.8, 0xf0f0f0);
  b.box(0, 1.9, -0.3, 2.35, 0.8, 2.4, 0x6a8aa0, { matOpts: { trans: true, opacity: 0.6 } });
  for (const sd of [-1, 1]) { b.sphere(sd * 0.85, 1.2, 2.7, 0.3, 0, { mat: plastic(0xfff4c0, { emissive: 0xffe080, emissiveIntensity: 2.2 }) }); for (const z of [-1.7, 1.7]) b.add(wheelGeo(), plastic(0x1b1b1b), sd * 1.25, 0.55, z, 0, 0.4, 0.55, 0.55); }
  b.box(0, 0.6, 2.72, 2.4, 0.4, 0.1, 0xc8c8c8);
  return b.build({ name: 'ford-anglia' });
}

// ---- scenery pieces ---------------------------------------------------------------------------------------
export function pumpkin(b, x, z, s = 1, y = 0) {
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; b.sphere(x + Math.cos(a) * 0.5 * s, y + 1.0 * s, z + Math.sin(a) * 0.5 * s, 0.85 * s, k % 2 ? 0xf07a10 : 0xe06a08, { sy: 0.85 }); }
  b.cyl(x, y + 1.6 * s, z, 0.14 * s, 0.6 * s, 0x3a6a2a, { seg: 6 });
}
// candle floating (wax + flame); flames emissive
export function candle(b, x, y, z, s = 1) {
  b.cyl(x, y, z, 0.18 * s, 1.1 * s, 0xf4f0e0, { seg: 8 });
  b.cone(x, y + 1.1 * s, z, 0.12 * s, 0.4 * s, 0xffc040, { seg: 6, matOpts: { emissive: 0xffa020, emissiveIntensity: 3 } });
}
// house banner hanging down from (x, y, z), facing rot
export function banner(b, x, y, z, house, rot, w = 3, h = 7) {
  const [c1, c2] = HOUSES[house], ca = Math.cos(rot), sa = Math.sin(rot);
  b.box(x, y, z, w + 0.6, 0.3, 0.3, 0xc8a040, { rot });
  b.box(x, y - h, z, w, h, 0.15, c1, { rot });
  // pointed tail
  rbox(b, x, y - h - 0.2, z, w * 0.7, w * 0.7, 0.14, 0, rot, Math.PI / 4, c1);
  // simple shield crest in the second colour
  const fx = sa * 0.1, fz = ca * 0.1;
  b.box(x + fx, y - h * 0.55, z + fz, w * 0.55, h * 0.3, 0.12, c2, { rot });
  rbox(b, x + fx, y - h * 0.55, z + fz, w * 0.4, w * 0.4, 0.12, 0, rot, Math.PI / 4, c2);
  b.box(x + fx * 1.4, y - h * 0.5, z + fz * 1.4, w * 0.25, h * 0.14, 0.12, c1, { rot });
  for (const sd of [-1, 1]) b.box(x + ca * sd * (w / 2 - 0.15) + fx, y - h, z - sa * sd * (w / 2 - 0.15) + fz, 0.2, h, 0.12, c2, { rot });
}
// castle tower: stone cylinder, crenel ring, tall slate cone, lit windows. Returns top y
export function castleTower(b, x, y, z, r, h, { stone = 0x8a8478, stone2 = 0x7a746a, roof = 0x2a3448, win = null, roofH = 2.2, flag = null } = {}) {
  let yy = y, k = 0;
  while (yy < y + h) { b.cyl(x, yy, z, r, Math.min(3, y + h - yy), k++ % 2 ? stone : stone2, { seg: 14 }); yy += 3; }
  yy = y + h;
  b.cyl(x, yy, z, r + 0.5, 0.8, stone, { seg: 14 });
  if (win) for (let f = y + 4; f < y + h - 2; f += 5) for (let a = 0; a < 4; a++) { const an = a * Math.PI / 2 + f * 0.3; b.box(x + Math.cos(an) * (r + 0.02), f, z + Math.sin(an) * (r + 0.02), 0.9, 1.8, 0.4, 0, { rot: -an + Math.PI / 2, mat: win }); }
  b.cone(x, yy + 0.8, z, r + 0.8, r * roofH * 1.6, roof, { seg: 14 });
  const top = yy + 0.8 + r * roofH * 1.6;
  if (flag) { b.cyl(x, top - 0.3, z, 0.1, 3, 0x3a3a3a, { seg: 5 }); b.box(x + 0.9, top + 1.4, z, 1.8, 1.1, 0.08, flag); }
  return top;
}
