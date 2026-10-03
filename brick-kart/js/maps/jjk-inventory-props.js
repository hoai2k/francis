// Brick characters and props for "Hidden Inventory Okinawa" (JJK Season 2, Gojo's Past).
// The minifig builder is a copy of the one in jjk-props.js with its own face atlas for the
// Hidden Inventory cast (young Gojo in sunglasses, Geto, Shoko, Riko, Kuroi, Toji, Utahime).
import { THREE, BrickBuilder, C, plastic, mat4 } from './kit.js';
import { hair as JH, spike, rbox } from './jjk-props.js';

const geoCache = new Map();
const G = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
function taperGeo(bw, tw, h, d, td = d) {
  return G(`tp${bw},${tw},${h},${d},${td}`, () => {
    const g = new THREE.BoxGeometry(bw, h, d);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * (tw / bw)); p.setZ(i, p.getZ(i) * (td / d)); }
    g.computeVertexNormals();
    return g.translate(0, h / 2, 0);
  });
}

// ---- face atlas ----------------------------------------------------------------------------
const FACES = ['ygojo', 'ygeto', 'shoko', 'riko', 'kuroi', 'toji', 'utahime', 'fan', 'gojoAwake'];
const SKIN = { ygojo: '#f7e2cf', gojoAwake: '#f7e2cf', riko: '#f8e0cc' };
let faceMat = null;
function drawFace(g, name, W, H) {
  g.fillStyle = SKIN[name] || '#f3d2b3'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.scale(0.57, 1);
  const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const eyes = (iris, { y = -12, dx = 30, rx = 11, ry = 12, lid = 0 } = {}) => {
    for (const sd of [-1, 1]) {
      ell(sd * dx, y, rx + 3, ry + 1, '#fff'); ell(sd * dx, y + 1, rx, ry, iris); ell(sd * dx, y + 2, rx * 0.45, ry * 0.5, '#111'); ell(sd * dx - 4, y - 4, 3, 3, '#fff');
      if (lid) { g.fillStyle = SKIN[name] || '#f3d2b3'; g.fillRect(sd * dx - rx - 5, y - ry - 4, rx * 2 + 10, lid); }
      line([[sd * (dx - rx - 4), y - ry - 2 + lid], [sd * (dx + rx + 4), y - ry - 4 + lid]], '#1b1b1b', 4);
    }
  };
  const brows = (col, y = -34, tilt = 0) => { for (const sd of [-1, 1]) line([[sd * 16, y + tilt], [sd * 44, y - tilt]], col, 6); };
  const smile = (w = 18, y = 22, col = '#3a1a1a') => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(0, y - 10, w, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); };
  const flat = (w = 14, y = 26) => line([[-w, y], [w, y]], '#3a1a1a', 5);
  switch (name) {
    case 'ygojo':   // round black sunglasses, cocky grin
      for (const sd of [-1, 1]) { ell(sd * 30, -12, 19, 16, '#0d0e14'); ell(sd * 34, -18, 5, 4, '#5a6a8a'); }
      line([[-12, -14], [12, -14]], '#0d0e14', 4); for (const sd of [-1, 1]) line([[sd * 48, -16], [sd * 70, -20]], '#0d0e14', 4);
      brows('#e8e8f0', -40, -2); g.strokeStyle = '#3a1a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-18, 22); g.quadraticCurveTo(4, 34, 22, 16); g.stroke(); break;
    case 'gojoAwake':   // Six Eyes wide open, manic grin
      for (const sd of [-1, 1]) { ell(sd * 30, -12, 16, 14, '#fff'); ell(sd * 30, -11, 12, 13, '#38c8ff'); ell(sd * 30, -11, 6, 7, '#e8fbff'); line([[sd * 12, -28], [sd * 48, -30]], '#e8e8f0', 5); }
      g.fillStyle = '#3a0a0a'; g.beginPath(); g.moveTo(-28, 16); g.quadraticCurveTo(0, 44, 28, 16); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-22, 17, 44, 5); break;
    case 'ygeto':
      for (const sd of [-1, 1]) line([[sd * 16, -12], [sd * 44, -16]], '#111', 5); brows('#111', -30, -2); smile(20, 26); break;
    case 'shoko':
      eyes('#6a4a2a', { lid: 9 }); ell(-40, 10, 3, 3, '#3a2a1a'); brows('#5a3a2a', -36, 0); flat(10, 28); break;
    case 'riko':
      eyes('#2a3a7a', { ry: 14, rx: 12 }); for (const sd of [-1, 1]) ell(sd * 42, 10, 9, 5, '#f8b0b0'); brows('#111', -38, 2); smile(16, 24, '#a0303a'); break;
    case 'kuroi':
      eyes('#3a2a2a', { ry: 10 }); brows('#111', -34, 2); smile(12, 26); break;
    case 'toji':
      eyes('#2a4a3a', { ry: 8, rx: 10, lid: 4 }); brows('#111', -30, -5);
      g.strokeStyle = '#3a1a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-18, 26); g.quadraticCurveTo(4, 30, 20, 20); g.stroke();
      line([[10, 12], [16, 40]], '#c89a8a', 4); break;
    case 'utahime':
      eyes('#4a2a3a'); brows('#111', -36, 2); flat(10, 28);
      line([[-52, 10], [-20, -2], [20, -30], [50, -44]], '#c88a8a', 5); break;
    case 'fan':   // Star Religious Group devotee: closed smiling eyes
      for (const sd of [-1, 1]) { g.strokeStyle = '#1b1b1b'; g.lineWidth = 5; g.beginPath(); g.arc(sd * 30, -8, 11, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      g.fillStyle = '#3a0a0a'; g.beginPath(); g.moveTo(-24, 14); g.quadraticCurveTo(0, 40, 24, 14); g.closePath(); g.fill(); break;
  }
  g.restore();
}
function faceAtlas() {
  if (faceMat) return faceMat;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  FACES.forEach((n, k) => { g.save(); g.translate((k % 4) * 256, Math.floor(k / 4) * 128); g.beginPath(); g.rect(0, 0, 256, 128); g.clip(); drawFace(g, n, 256, 128); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  faceMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.28 });
  return faceMat;
}
function faceGeo(name) {
  return G('face' + name, () => {
    const k = FACES.indexOf(name), u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4;
    const g = new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0);
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, u0 + 0.01, v0 + 0.02);
      else uv.setXY(i, u0 + uv.getX(i) * 0.25, v0 + (0.02 + uv.getY(i) * 0.96) * 0.25);
    }
    return g;
  });
}

// ---- minifig (same contract as jjk-props humanoid): { root, body, armL, armR, s, top } ----------
export function fig(o) {
  const s = o.s, wide = o.wide ?? 1;
  const root = new THREE.Group();
  const b = new BrickBuilder(1);
  const legs = o.legs ?? 0x1f2433, skin = o.skinHex ?? 0xf3d2b3;
  for (const sd of [-1, 1]) {
    b.box(sd * 0.27 * s * wide, 0, 0.06 * s, 0.5 * s * wide, 0.28 * s, 0.76 * s, o.shoes ?? C.black);
    b.box(sd * 0.27 * s * wide, 0.28 * s, 0, 0.5 * s * wide, 1.02 * s, 0.6 * s, legs);
  }
  b.box(0, 1.3 * s, 0, 1.08 * s * wide, 0.26 * s, 0.62 * s, o.hips ?? legs);
  b.add(taperGeo(1.14 * wide, 0.86 * wide, 1.3, 0.64), plastic(o.torso), 0, 1.56 * s, 0, 0, s, s, s);
  if (o.collar !== false) b.cyl(0, 2.78 * s, 0, 0.36 * s, 0.22 * s, o.collar ?? o.torso, { seg: 12 });
  if (o.buttons) for (let k = 0; k < 3; k++) b.box(0, (2.3 - k * 0.3) * s, 0.31 * s, 0.1 * s, 0.1 * s, 0.06 * s, o.buttons);
  b.cyl(0, 2.86 * s, 0, 0.2 * s, 0.14 * s, skin, { seg: 10 });
  b.add(faceGeo(o.face), faceAtlas(), 0, 2.98 * s, 0, Math.PI, 0.43 * s, 0.74 * s, 0.43 * s);
  const top = 3.72 * s;
  o.hair?.(b, s, top);
  o.extra?.(b, s);
  root.add(b.build({ name: 'fig-body' }));
  const arms = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 0.56 * s * wide, 2.64 * s, 0);
    const a = new BrickBuilder(1);
    a.add(taperGeo(0.36, 0.42, 1.12, 0.44), plastic(o.arms ?? o.torso), 0, -1.12 * s, 0, 0, s * wide, s, s);
    a.cyl(0, -1.42 * s, 0, 0.19 * s, 0.34 * s, o.hands ?? skin, { seg: 10 });
    (sd < 0 ? o.itemR : o.itemL)?.(a, s);
    pv.add(a.build({ name: 'fig-arm' }));
    pv.rotation.z = sd * 0.1;
    root.add(pv); arms.push(pv);
  }
  return { root, body: root.children[0], armR: arms[0], armL: arms[1], s, top };
}

// hair ---------------------------------------------------------------------------------------
function longHair(col, len = 1.3, bangs = true) {
  return (b, s, top) => {
    b.cyl(0, top - 0.3 * s, 0, 0.5 * s, 0.42 * s, col, { seg: 14 });
    b.box(0, top - (0.3 + len) * s, -0.3 * s, 0.96 * s, len * s, 0.3 * s, col);
    for (const sd of [-1, 1]) b.box(sd * 0.38 * s, top - (0.2 + len * 0.7) * s, -0.06 * s, 0.2 * s, len * 0.7 * s, 0.56 * s, col);
    if (bangs) b.box(0, top - 0.34 * s, 0.34 * s, 0.86 * s, 0.2 * s, 0.14 * s, col);
  };
}
const skirt = (b, s, col) => b.add(taperGeo(1.24, 1.04, 0.62, 0.72), plastic(col), 0, 0.92 * s, 0, 0, s, s, s);
const UNI = 0x1d2233, GOLD = 0xdcbc81;

// ---- the cast ----------------------------------------------------------------------------------
export function youngGojo(s) {
  return fig({ s, face: 'ygojo', skinHex: 0xf7e2cf, torso: UNI, legs: UNI, arms: UNI, collar: UNI, buttons: GOLD, hair: JH.gojo,
    extra: (b, s) => { b.cyl(0, 2.7 * s, 0, 0.44 * s, 0.4 * s, UNI, { seg: 12 }); } });
}
export function gojoAwake(s) {
  return fig({ s, face: 'gojoAwake', skinHex: 0xf7e2cf, torso: UNI, legs: UNI, arms: UNI, collar: UNI, buttons: GOLD, hair: JH.gojo,
    extra: (b, s) => { b.cyl(0, 2.7 * s, 0, 0.44 * s, 0.4 * s, UNI, { seg: 12 }); for (let k = 0; k < 4; k++) b.box((k - 1.5) * 0.18 * s, (1.7 + (k % 2) * 0.4) * s, 0.33 * s, 0.12 * s, 0.3 * s, 0.04 * s, 0x8a1010); } });
}
export function youngGeto(s) {
  return fig({ s, face: 'ygeto', torso: UNI, legs: UNI, arms: UNI, collar: UNI, buttons: GOLD, hair: JH.geto, wide: 1.05,
    extra: (b, s) => { b.add(taperGeo(1.3, 1.12, 1.1, 0.8), plastic(UNI), 0, 0.2 * s, 0, 0, s, s, s); for (const sd of [-1, 1]) b.cyl(sd * 0.44 * s, 3.2 * s, 0, 0.1 * s, 0.1 * s, 0x1b1b1b, { seg: 8 }); } });
}
export function shoko(s) {
  return fig({ s, face: 'shoko', torso: UNI, legs: 0xf3d2b3, hips: UNI, arms: UNI, buttons: GOLD, shoes: 0x3a2a1a, hair: longHair(0x6a3a22, 1.2, false),
    extra: (b, s) => skirt(b, s, UNI),
    itemR: (a, s) => { a.box(0, -1.5 * s, 0.3 * s, 0.08 * s, 0.08 * s, 0.5 * s, C.white); } });
}
export function riko(s) {
  return fig({ s, face: 'riko', skinHex: 0xf8e0cc, torso: 0x1d2233, legs: 0xf8e0cc, hips: 0x1d2233, arms: 0x1d2233, collar: C.white, shoes: 0x3a2a1a, hair: longHair(0x15161c, 1.6),
    extra: (b, s) => { skirt(b, s, 0x1d2233); b.box(0, 2.42 * s, 0.33 * s, 0.4 * s, 0.24 * s, 0.08 * s, C.red); b.box(0, 2.64 * s, -0.24 * s, 1.0 * s, 0.24 * s, 0.4 * s, C.white);
      for (const sd of [-1, 1]) b.box(sd * 0.42 * s, 3.62 * s, 0, 0.12 * s, 0.24 * s, 0.4 * s, 0xf4f4f4); } });
}
export function kuroi(s) {
  return fig({ s, face: 'kuroi', torso: 0x1b1b1b, legs: 0x1b1b1b, hips: 0x1b1b1b, arms: 0x1b1b1b, collar: C.white, hair: (b, s, top) => { b.cyl(0, top - 0.3 * s, 0, 0.5 * s, 0.44 * s, 0x15161c, { seg: 14 }); b.box(0, top - 0.8 * s, -0.24 * s, 0.94 * s, 0.6 * s, 0.4 * s, 0x15161c); b.box(0, top + 0.02 * s, 0, 0.9 * s, 0.14 * s, 0.4 * s, C.white); },
    extra: (b, s) => { b.add(taperGeo(1.5, 1.1, 1.3, 0.9), plastic(0x1b1b1b), 0, 0, 0, 0, s, s, s); b.box(0, 0.5 * s, 0.4 * s, 0.9 * s, 1.6 * s, 0.06 * s, C.white); b.box(0, 2.1 * s, 0.33 * s, 0.6 * s, 0.5 * s, 0.05 * s, C.white); } });
}
export function toji(s) {
  return fig({ s, face: 'toji', torso: 0x1b1b1b, legs: 0xe8e2d4, hips: 0xe8e2d4, arms: 0xf3d2b3, shoes: 0x1b1b1b, wide: 1.12, collar: false,
    hair: (b, s, top) => { b.cyl(0, top - 0.24 * s, 0, 0.47 * s, 0.34 * s, 0x15161c, { seg: 14 }); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; spike(b, Math.sin(a) * 0.3 * s, top - 0.04 * s, Math.cos(a) * 0.3 * s, 0.18 * s, 0.3 * s, Math.cos(a) * 1.1, -Math.sin(a) * 1.1, 0x15161c); } },
    extra: (b, s) => { b.add(taperGeo(1.3, 1.1, 1.0, 0.8), plastic(0xe8e2d4), 0, 0.3 * s, 0, 0, s, s, s); for (const sd of [-1, 1]) b.box(sd * 0.48 * s, 2.3 * s, 0, 0.3 * s, 0.5 * s, 0.68 * s, 0x1b1b1b); } });
}
export function utahime(s) {
  return fig({ s, face: 'utahime', torso: C.white, legs: C.red, hips: C.red, arms: C.white, collar: C.white, shoes: C.white, hair: longHair(0x15161c, 1.4),
    extra: (b, s) => { b.add(taperGeo(1.4, 1.1, 1.3, 0.8), plastic(C.red), 0, 0, 0, 0, s, s, s); b.box(0, 2.6 * s, 0.31 * s, 0.12 * s, 0.3 * s, 0.04 * s, C.red); b.box(0, top0(s), -0.4 * s, 0.24 * s, 0.24 * s, 0.24 * s, C.white); } });
}
const top0 = (s) => 3.1 * s;
export function devotee(s, k = 0) {
  return fig({ s, face: 'fan', torso: C.white, legs: C.white, arms: C.white, collar: C.white, shoes: 0x8a8a8a, hair: (b, s, top) => { b.cyl(0, top - 0.22 * s, 0, 0.46 * s, 0.3 * s, [0x15161c, 0x5a3a2a, 0x8a8a8a][k % 3], { seg: 14 }); },
    extra: (b, s) => { b.add(taperGeo(1.4, 1.14, 1.3, 0.8), plastic(C.white), 0, 0, 0, 0, s, s, s); b.box(0, 2.0 * s, 0.33 * s, 0.24 * s, 0.24 * s, 0.04 * s, GOLD); } });
}

// ---- curses and weapons ------------------------------------------------------------------------
export const RAINBOW = [0xff3a3a, 0xff9a2a, 0xffe03a, 0x4ad84a, 0x3ab8ff, 0x5a5aff, 0xb04aff];
// one body segment of Geto's rainbow dragon (local +Z forward)
export function dragonSeg(col, s = 1) {
  const b = new BrickBuilder(1);
  b.add(G('dseg', () => new THREE.SphereGeometry(1, 12, 8)), plastic(col, { emissive: col, emissiveIntensity: 0.25 }), 0, 0, 0, 0, 1.7 * s, 1.5 * s, 1.9 * s);
  spike(b, 0, 1.2 * s, 0, 0.5 * s, 1.4 * s, -0.4, 0, C.white);
  for (const sd of [-1, 1]) rbox(b, sd * 1.6 * s, -0.3 * s, 0, 1.4 * s, 0.25 * s, 1.0 * s, 0, 0, sd * 0.5, col);
  return b.build({ name: 'dragon-seg' });
}
export function dragonHead(s = 1) {
  const b = new BrickBuilder(1);
  const W = 0xf4f4f4;
  b.box(0, -1.2 * s, 0.4 * s, 3 * s, 2.2 * s, 3.4 * s, 0xff6a8a);
  b.box(0, -1.4 * s, 2.6 * s, 2.4 * s, 1.0 * s, 2.4 * s, 0xff8aa0);
  b.box(0, -0.4 * s, 2.5 * s, 2.4 * s, 0.8 * s, 2.2 * s, 0xff6a8a);
  for (let k = -2; k <= 2; k++) { spike(b, k * 0.45 * s, -0.4 * s, 3.5 * s, 0.18 * s, 0.6 * s, Math.PI, 0, W); spike(b, k * 0.45 * s, -0.5 * s, 3.5 * s, 0.18 * s, 0.6 * s, 0, 0, W); }
  for (const sd of [-1, 1]) {
    b.sphere(sd * 1.2 * s, 0.5 * s, 1.2 * s, 0.45 * s, 0xffe040, { matOpts: { emissive: 0xffd020, emissiveIntensity: 2 } });
    spike(b, sd * 0.9 * s, 0.8 * s, -0.6 * s, 0.35 * s, 2.6 * s, -1.1, sd * 0.4, 0xffe8a0);
    rbox(b, sd * 1.9 * s, -1.0 * s, 3.0 * s, 0.12 * s, 0.12 * s, 3 * s, 0, sd * 0.5, 0, 0xffe8a0);
  }
  return b.build({ name: 'dragon-head' });
}
// Toji's curse that stores his weapons: a pale segmented worm arcing out of the ground (local
// XY plane, rising at -X), its open mouth diving back down at the +X end
export function storageWorm(s = 1) {
  const b = new BrickBuilder(1);
  const body = [0xc8a8c0, 0xb898b0], END = 0.8 * Math.PI;
  for (let k = 0; k <= 11; k++) {
    const a = END * (k / 11);
    b.add(G('wseg', () => new THREE.SphereGeometry(1, 12, 8)), plastic(body[k % 2]), -Math.cos(a) * 6 * s, Math.sin(a) * 6 * s, 0, 0, 1.9 * s, 1.9 * s, 1.9 * s);
  }
  const g = new THREE.Group(); g.add(b.build({ name: 'worm' }));
  const h = new BrickBuilder(1);   // head, mouth facing local +Y
  h.cyl(0, -0.8 * s, 0, 2.3 * s, 1.6 * s, 0xd8b8d0, { seg: 12 });
  h.cyl(0, 0.6 * s, 0, 1.7 * s, 0.3 * s, 0x2a0a1a, { seg: 12 });
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; spike(h, Math.cos(a) * 1.6 * s, 0.6 * s, Math.sin(a) * 1.6 * s, 0.25 * s, 0.9 * s, Math.sin(a) * 0.5, -Math.cos(a) * 0.5, C.white); }
  for (const sd of [-1, 1]) h.sphere(1.6 * s, -0.4 * s, sd * 1.3 * s, 0.35 * s, 0x1b0a0a);
  const hg = h.build({ name: 'worm-head' });
  const ex = -Math.cos(END) * 6 * s, ey = Math.sin(END) * 6 * s, tx = Math.sin(END), ty = Math.cos(END);
  hg.position.set(ex + tx * 1.4 * s, ey + ty * 1.4 * s, 0); hg.rotation.z = Math.atan2(-tx, ty);
  g.add(hg);
  return g;
}
// Inverted Spear of Heaven: short jitte-like blade with a side hook (along local +X)
export function invertedSpear(b, x, y, z, s = 1) {
  const steel = { matOpts: { metal: 0.7, rough: 0.25 } };
  b.box(x, y - 0.25 * s, z, 1.2 * s, 0.5 * s, 0.5 * s, 0x2a2a3a);
  rbox(b, x + 2.2 * s, y, z, 3.4 * s, 0.24 * s, 0.6 * s, 0, 0, 0, 0xd8e0ea, steel);
  rbox(b, x + 1.0 * s, y, z + 0.6 * s, 0.24 * s, 0.24 * s, 1.0 * s, 0, 0, 0, 0xd8e0ea, steel);
  rbox(b, x + 1.5 * s, y, z + 1.0 * s, 0.9 * s, 0.24 * s, 0.24 * s, 0, 0, 0, 0xd8e0ea, steel);
  spike(b, x + 3.9 * s, y, z, 0.32 * s, 1.0 * s, 0, -Math.PI / 2, 0xd8e0ea);
}

// ---- Okinawa & Tokyo props (static, into a builder) --------------------------------------------
// shisa lion-dog guardian
export function shisa(b, x, y, z, rot, s = 1, col = 0xc8743a) {
  const ca = Math.cos(rot), sa = Math.sin(rot), P = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca];
  let [px, pz] = P(0, 0); b.box(px, y, pz, 2.4 * s, 0.6 * s, 2.4 * s, C.ltgray, { rot });
  [px, pz] = P(0, -0.2); b.box(px, y + 0.6 * s, pz, 1.4 * s, 1.6 * s, 1.6 * s, col, { rot });
  [px, pz] = P(0, 0.3); b.box(px, y + 2.0 * s, pz, 1.7 * s, 1.4 * s, 1.5 * s, col, { rot });
  [px, pz] = P(0, 1.1); b.box(px, y + 2.1 * s, pz, 1.3 * s, 0.6 * s, 0.4 * s, 0x8a2a1a, { rot });
  for (const sd of [-1, 1]) { [px, pz] = P(sd * 0.45, 1.06); b.box(px, y + 2.9 * s, pz, 0.36 * s, 0.36 * s, 0.1 * s, C.white, { rot }); [px, pz] = P(sd * 0.7, 0.3); b.box(px, y + 3.3 * s, pz, 0.4 * s, 0.4 * s, 0.4 * s, 0x8a4a1a, { rot }); }
  [px, pz] = P(0, 0.2); b.box(px, y + 3.4 * s, pz, 1.9 * s, 0.4 * s, 1.0 * s, 0x8a4a1a, { rot });
  [px, pz] = P(0, -1); b.cone(px, y + 1.6 * s, pz, 0.5 * s, 1.5 * s, 0x8a4a1a, { seg: 6 });
}
// red-tiled Okinawan house with white mortar ridges, a shisa on the roof
export function ryukyuHouse(b, x, z, w, d, rot, wall = 0xf2ead8) {
  b.box(x, 0, z, w, 4, d, wall, { rot });
  const ca = Math.cos(rot), sa = Math.sin(rot);
  for (let t = 0; t < 2; t++) for (const sd of [-1, 1]) {
    const lz = sd * d * 0.26;
    b.boxM(mat4(x + lz * sa, 4.9 + t * 0.12, z + lz * ca, sd * 0.45, rot, 0, w + 1.6 - t * 0.2, 0.5, d * 0.62), t ? C.white : 0xc0402a);
  }
  b.box(x, 5.6, z, w + 1.4, 0.6, 0.7, C.white, { rot });
  shisa(b, x, 6.0, z, rot, 0.5);
  b.box(x + sa * (d / 2 + 0.05), 0, z + ca * (d / 2 + 0.05), 1.6, 2.6, 0.2, C.rbrown, { rot });
  for (let n = 0; n < 7; n++) { const lx = (n - 3) * 1.4, lz = d / 2 + 3; b.box(x + lx * ca + lz * sa, 0, z - lx * sa + lz * ca, 1.3, 1.6, 1.0, n % 2 ? C.ltgray : 0xd8d0c0, { rot }); }
}
export function umbrella(b, x, z, col, s = 1) {
  b.cyl(x, 0, z, 0.12 * s, 4.4 * s, C.white, { seg: 6 });
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; b.boxM(mat4(x + Math.sin(a) * 1.5 * s, 4.2 * s, z + Math.cos(a) * 1.5 * s, 0.32, a, 0, 1.3 * s, 0.12, 3.2 * s), k % 2 ? col : C.white); }
  b.box(x + 1.6 * s, 0, z + 0.6 * s, 1.6 * s, 0.08, 3.6 * s, k2(col));
}
const k2 = (c) => (c === C.red ? C.yellow : C.azure);
export function hibiscus(b, x, z, s = 1, rnd = Math.random) {
  b.sphere(x, 1.2 * s, z, 1.5 * s, C.green, { sy: 0.8 });
  for (let k = 0; k < 4; k++) b.sphere(x + (rnd() - 0.5) * 2.4 * s, (1.6 + rnd() * 0.8) * s, z + (rnd() - 0.5) * 2.4 * s, 0.4 * s, rnd() < 0.7 ? 0xff2a4a : 0xff8aa0);
}
// summer vending machine (the Jujutsu High break spot)
export function vending(b, x, z, rot, col = C.red) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  b.box(x, 0, z, 2.6, 4.4, 1.8, col, { rot });
  const fx = x + sa * 0.92, fz = z + ca * 0.92;
  b.box(fx, 2.2, fz, 2.2, 1.8, 0.06, 0xe8f4ff, { rot, matOpts: { emissive: 0xd8ecff, emissiveIntensity: 0.9 } });
  for (let n = 0; n < 5; n++) b.box(fx + ca * (n - 2) * 0.4, 2.9, fz - sa * (n - 2) * 0.4, 0.26, 0.5, 0.1, [C.red, C.blue, C.yellow, C.green, C.orange][n], { rot });
  b.box(fx, 0.5, fz, 1.6, 0.5, 0.08, C.black, { rot });
}
// sunflower patch
export function sunflower(b, x, z, s = 1) {
  b.cyl(x, 0, z, 0.1 * s, 3.4 * s, C.green, { seg: 5 });
  b.cyl(x, 3.4 * s, z, 0.9 * s, 0.2 * s, C.yellow, { seg: 10 });
  b.cyl(x, 3.5 * s, z, 0.45 * s, 0.2 * s, C.brown, { seg: 8 });
}
// whale shark and manta (aquarium tank residents)
export function whaleShark(s = 1) {
  const b = new BrickBuilder(1);
  const sk = 0x3a5a7a, belly = 0xe8eef2;
  b.box(-0.0, -1.2 * s, -2 * s, 3.2 * s, 2.6 * s, 9 * s, sk); b.box(0, -1.6 * s, -2 * s, 2.8 * s, 0.6 * s, 8.6 * s, belly);
  b.box(0, -1.0 * s, 3 * s, 3.6 * s, 2.2 * s, 2 * s, sk); b.box(0, -1.1 * s, 4.1 * s, 3.4 * s, 0.6 * s, 0.3 * s, 0x1b2a34);
  for (let k = 0; k < 14; k++) b.box(((k * 7) % 5 - 2) * 0.6 * s, 0.12 * s, -5 * s + k * 0.6 * s, 0.3 * s, 0.1 * s, 0.3 * s, C.white);
  rbox(b, 0, 1.2 * s, -2.5 * s, 0.3 * s, 2.2 * s, 1.6 * s, -0.5, 0, 0, sk);
  for (const sd of [-1, 1]) rbox(b, sd * 2.6 * s, -1.4 * s, 0.8 * s, 3 * s, 0.25 * s, 1.4 * s, 0, sd * 0.4, sd * 0.3, sk);
  rbox(b, 0, 0, -7.6 * s, 0.3 * s, 4 * s, 1.4 * s, 0.3, 0, 0, sk);
  return b.build({ name: 'whale-shark' });
}
export function manta(s = 1) {
  const b = new BrickBuilder(1);
  b.box(0, 0, 0, 2 * s, 0.6 * s, 3 * s, 0x2a3a4a);
  for (const sd of [-1, 1]) rbox(b, sd * 2.4 * s, 0.3 * s, -0.2 * s, 3.2 * s, 0.25 * s, 2.2 * s, 0, sd * 0.3, 0, 0x2a3a4a);
  rbox(b, 0, 0.3 * s, -3 * s, 0.15 * s, 0.15 * s, 3 * s, 0, 0, 0, 0x1b2a34);
  return b.build({ name: 'manta' });
}
