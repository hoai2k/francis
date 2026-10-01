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
const FACES = ['gojo', 'gojoEyes', 'yuji', 'sukuna', 'mahito', 'megumi', 'nobara', 'todo', 'nanami', 'geto', 'yuta', 'maki', 'jogo', 'cursed', 'rika', 'cursed2'];
const SKIN = { gojo: '#f7e2cf', gojoEyes: '#f7e2cf', sukuna: '#f3d6bf', mahito: '#e4dcd6', jogo: '#c9c6bd', cursed: '#b9a9c4', cursed2: '#a9b9a4', rika: '#ebe6dc', todo: '#d9a878' };
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
    case 'todo':
      eyes('#3a2a1a', { rx: 8, ry: 8 }); brows('#111', -30, 4); line([[26, -40], [34, 12]], '#f2d0b0', 4); grin(26, 22); break;
    case 'nanami':
      for (const sd of [-1, 1]) { g.fillStyle = '#23241f'; g.fillRect(sd * 30 - 22, -26, 44, 28); g.fillStyle = '#6a8a3a'; g.fillRect(sd * 30 - 18, -23, 36, 22); }
      line([[-8, -14], [8, -14]], '#23241f', 5); brows('#c9a860', -36, 0); flat(14, 28); break;
    case 'geto':
      for (const sd of [-1, 1]) line([[sd * 16, -12], [sd * 44, -16]], '#111', 5); brows('#111', -30, -2);
      line([[-60, -46], [60, -46]], '#6a3a3a', 3); for (let k = -3; k <= 3; k++) line([[k * 17, -52], [k * 17, -40]], '#6a3a3a', 3); smile(22, 26); break;
    case 'yuta':
      eyes('#1a1a2a', { ry: 10 }); for (const sd of [-1, 1]) line([[sd * 20, 4], [sd * 42, 4]], '#9a8a9a', 3); brows('#111', -34, -2); smile(12, 26); break;
    case 'maki':
      eyes('#4a3a2a', { ry: 9 }); for (const sd of [-1, 1]) { g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(sd * 30 - 20, -26, 40, 26); } line([[-10, -14], [10, -14]], '#111', 4); flat(12, 28); break;
    case 'jogo':
      ell(0, -14, 26, 20, '#fff'); ell(0, -12, 13, 14, '#1a1a1a'); ell(-5, -18, 4, 4, '#fff');
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.moveTo(-34, 16); g.quadraticCurveTo(0, 46, 34, 16); g.closePath(); g.fill(); g.fillStyle = '#444'; for (let k = -3; k <= 3; k++) g.fillRect(k * 9 - 3, 17, 6, 8); break;
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
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
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
    const u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4;
    const g = new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0);
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, u0 + 0.01, v0 + 0.02);   // caps: plain skin
      else uv.setXY(i, u0 + uv.getX(i) * 0.25, v0 + (0.02 + uv.getY(i) * 0.96) * 0.25);
    }
    return g;
  });
}
export function head(b, name, x, y, z, r, h, rot = Math.PI) { b.add(faceGeo(name), faceAtlas(), x, y, z, rot, r, h, r); }

// ---- humanoid (minifig proportions, ~3.9 * s tall) ----------------------------------
// Returns { root, body, armL, armR, s, top }. Local +Z is the front.
// o: { s, face, skin, torso, legs, shoes, hips, arms, hands, hair(b,s), extra(b,s), itemL(b,s), itemR(b,s), headR, collar, buttons, wide }
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
  const hr = o.headR ?? 0.43, hh = 0.74;
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
    (sd < 0 ? o.itemR : o.itemL)?.(a, s);
    pv.add(a.build({ name: 'fig-arm' }));
    pv.rotation.z = sd * 0.1;
    root.add(pv);
    arms.push(pv);
  }
  return { root, body, armR: arms[0], armL: arms[1], s, top };
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
  todo: (b, s, top) => { b.cyl(0, top - 0.2 * s, 0, 0.46 * s, 0.3 * s, 0x15161c, { seg: 14 }); b.cyl(0, top + 0.05 * s, -0.2 * s, 0.14 * s, 0.4 * s, 0x15161c, { seg: 8 }); b.sphere(0, top + 0.5 * s, -0.22 * s, 0.2 * s, 0x15161c); },
  nanami: (b, s, top) => { const col = 0xf0d890; b.cyl(0, top - 0.24 * s, 0, 0.47 * s, 0.34 * s, col, { seg: 14 }); rbox(b, 0.12 * s, top + 0.04 * s, 0.08 * s, 0.7 * s, 0.18 * s, 0.8 * s, 0, 0, -0.25, col); },
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
export function todo(s) {
  return humanoid({ s, face: 'todo', skinHex: 0xd9a878, torso: 0xd9a878, legs: 0x2a2a2a, arms: 0xd9a878, hands: 0xd9a878, hair: hair.todo, wide: 1.25, collar: false,
    extra: (b, s) => { for (const sd of [-1, 1]) b.box(sd * 0.48 * s, 1.56 * s, 0, 0.3 * s, 1.26 * s, 0.68 * s, 0x2a2a2a); b.box(0, 1.56 * s, 0.33 * s, 0.4 * s, 0.1 * s, 0.02 * s, 0x2a2a2a); } });
}
export function nanami(s) {
  return humanoid({ s, face: 'nanami', torso: 0xd8c8a0, legs: 0xc8b890, arms: 0xd8c8a0, hair: hair.nanami, collar: 0x2a3a6a, shoes: 0x3a2a1a,
    extra: (b, s) => { b.box(0, 1.9 * s, 0.32 * s, 0.34 * s, 0.9 * s, 0.05 * s, 0x2a3a6a); b.box(0, 1.95 * s, 0.34 * s, 0.16 * s, 0.82 * s, 0.05 * s, 0xe0b040); for (let k = 0; k < 4; k++) b.box(((k % 2) - 0.5) * 0.06 * s, (2.05 + k * 0.15) * s, 0.37 * s, 0.04 * s, 0.04 * s, 0.02 * s, C.black); },
    itemR: (a, s) => { rbox(a, 0, -1.9 * s, 0.5 * s, 0.1 * s, 0.3 * s, 1.6 * s, 0, 0, 0, C.white); for (let k = 0; k < 4; k++) rbox(a, 0, -1.9 * s, (0.1 + k * 0.28) * s, 0.14 * s, 0.34 * s, 0.1 * s, 0, 0, 0, C.dkgray); } });
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

// Jogo: volcano head, yellow spotted shawl, one eye
export function jogo(s) {
  const f = humanoid({ s, face: 'jogo', skinHex: 0xc9c6bd, torso: 0x1b1b1b, legs: 0x1b1b1b, arms: 0xe8c040, hands: 0xc9c6bd, shoes: 0x6a3a1a, headR: 0.46, collar: false,
    hair: (b, s, top) => {
      b.add(frustum(0.3, 0.47, 16), plastic(0xbcb8ae), 0, top, 0, 0, s, 0.55 * s, s);
      b.add(frustum(0.2, 0.3, 16), plastic(0x7a4a2a), 0, top + 0.55 * s, 0, 0, s, 0.4 * s, s);
      b.cyl(0, top + 0.9 * s, 0, 0.17 * s, 0.08 * s, 0xff5a10, { seg: 12, matOpts: { emissive: 0xff4a00, emissiveIntensity: 2.4 } });
      for (const sd of [-1, 1]) { const m = mat4(sd * 0.48 * s, top - 0.4 * s, 0, 0, 0, Math.PI / 2, 0.12 * s, 0.22 * s, 0.12 * s); b.addMatrix(new THREE.CylinderGeometry(1, 1, 1, 8), plastic(C.tan), m); }
    },
    extra: (b, s) => {
      b.add(taperGeo(1.5, 1.2, 0.9, 0.9), plastic(0xe8c040), 0, 1.95 * s, 0, 0, s, s, s);
      for (let k = 0; k < 12; k++) { const a = k * 2.4, yy = 2.05 + (k % 3) * 0.25; b.box(Math.cos(a) * 0.55 * s, yy * s, Math.sin(a) * 0.35 * s + (Math.sin(a) > 0 ? 0.12 : -0.12) * s, 0.14 * s, 0.14 * s, 0.14 * s, 0x2a2a2a); }
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; b.sphere(Math.cos(a) * 0.52 * s, 2.86 * s, Math.sin(a) * 0.4 * s, 0.2 * s, C.white); }
      b.box(0, 0.25 * s, 0, 1.2 * s, 1.1 * s, 0.7 * s, 0x1b1b1b);
    },
  });
  return f;
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

// Mahoraga: tall white shikigami with the Dharma wheel over its head
export function mahoraga(s) {
  const f = humanoid({ s, torso: 0xece8e0, legs: 0xdcd8d0, arms: 0xece8e0, hands: 0xece8e0, skinHex: 0xece8e0, wide: 1.2, collar: false,
    hair: (b, s, top) => {
      for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) rbox(b, sd * 0.42 * s, top - (0.2 + k * 0.35) * s, 0.1 * s, 0.1 * s, 0.34 * s, 1.1 * s, 0.3, sd * 0.25, sd * (0.6 + k * 0.3), 0xf6f2ea);
      b.box(0, top - 0.5 * s, 0.4 * s, 0.7 * s, 0.14 * s, 0.1 * s, 0x2a2a2a);
    },
    extra: (b, s) => { for (let k = 0; k < 3; k++) b.box(0, (1.8 + k * 0.3) * s, 0.33 * s, 0.9 * s, 0.06 * s, 0.03 * s, 0xc8c4bc); },
    itemR: (a, s) => { rbox(a, 0, -2.9 * s, 0.2 * s, 0.1 * s, 3.2 * s, 0.34 * s, 0, 0, 0, 0xdfe6ee, { matOpts: { metal: 0.7, rough: 0.2 } }); },
  });
  const wheel = new THREE.Group();
  const w = new BrickBuilder(1);
  const ring = new THREE.TorusGeometry(1, 0.1, 6, 20);
  w.add(ring, plastic(GOLD, { metal: 0.6, rough: 0.3 }), 0, 0, 0, 0, s, s, s);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    rbox(w, Math.cos(a) * 0.55 * s, Math.sin(a) * 0.55 * s, 0, 1.1 * s, 0.08 * s, 0.08 * s, 0, 0, a, GOLD, { matOpts: { metal: 0.6, rough: 0.3 } });
    rbox(w, Math.cos(a) * 1.25 * s, Math.sin(a) * 1.25 * s, 0, 0.5 * s, 0.14 * s, 0.14 * s, 0, 0, a, GOLD, { matOpts: { metal: 0.6, rough: 0.3 } });
  }
  w.cyl(0, -0.1 * s, 0, 0.18 * s, 0.2 * s, GOLD, { seg: 8 });
  const wg = w.build({ name: 'dharma-wheel' });
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
