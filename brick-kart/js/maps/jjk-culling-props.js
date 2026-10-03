// Jujutsu Kaisen Season 3 (Culling Games) brick characters and props for the
// "Culling Games Colony" map. Bodies reuse the shared minifig humanoid from
// jjk-props.js; the new faces come from this file's own canvas atlas.
import { THREE, BrickBuilder, C, plastic, mat4 } from './kit.js';
import * as P from './jjk-props.js';

const rbox = P.rbox, spike = P.spike;

// ---- face atlas ----------------------------------------------------------------------
const FACES = ['hakari', 'kashimo', 'higuruma', 'hana', 'ryu', 'maki', 'judge', 'uro'];
const SKIN = { kashimo: '#f4ece6', judge: '#1b1b22', hana: '#f8e2d0' };
function drawFace(g, name, W, H) {
  g.fillStyle = SKIN[name] || '#f3d2b3'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.scale(0.57, 1);
  const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const eyes = (iris, { y = -12, dx = 30, rx = 10, ry = 11, lid = 0 } = {}) => {
    for (const sd of [-1, 1]) {
      ell(sd * dx, y, rx + 3, ry + 1, '#fff'); ell(sd * dx, y + 1, rx, ry, iris); ell(sd * dx, y + 2, rx * 0.45, ry * 0.5, '#111'); ell(sd * dx - 4, y - 4, 3, 3, '#fff');
      if (lid) { g.fillStyle = SKIN[name] || '#f3d2b3'; g.fillRect(sd * dx - rx - 5, y - ry - 4, (rx + 5) * 2, lid); }
      line([[sd * (dx - rx - 4), y - ry - 2 + lid], [sd * (dx + rx + 4), y - ry - 4 + lid]], '#1b1b1b', 4);
    }
  };
  const brows = (col, y = -34, tilt = 0) => { for (const sd of [-1, 1]) line([[sd * 16, y + tilt], [sd * 44, y - tilt]], col, 6); };
  const grin = (w = 26, y = 20) => { g.fillStyle = '#3a0a0a'; g.beginPath(); g.moveTo(-w, y); g.quadraticCurveTo(0, y + 24, w, y); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-w * 0.8, y + 1, w * 1.6, 5); };
  const smile = (w = 16, y = 24, col = '#3a1a1a') => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(0, y - 10, w, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); };
  switch (name) {
    case 'hakari': eyes('#4a5a3a', { ry: 9, lid: 4 }); brows('#c8c4bc', -32, 5); grin(28, 18); line([[46, 4], [52, 14]], '#c9a860', 3); break;
    case 'kashimo': eyes('#2a6aa0', { rx: 9, ry: 7, lid: 3 }); for (const sd of [-1, 1]) line([[sd * 18, -30], [sd * 44, -26]], '#3ab8d8', 4); g.strokeStyle = '#3a1a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-14, 24); g.quadraticCurveTo(6, 30, 18, 18); g.stroke(); break;
    case 'higuruma': eyes('#2a2a2a', { ry: 8, lid: 5 }); brows('#111', -30, -3); for (let k = 0; k < 40; k++) ell((k * 37 % 70) - 35, 26 + (k * 13 % 24), 1.6, 1.6, '#5a4a40'); line([[-12, 22], [12, 22]], '#3a1a1a', 4); break;
    case 'hana': eyes('#3a8ad8', { ry: 13, rx: 11 }); brows('#d8b050', -38, 0); ell(-44, 10, 8, 5, '#f8a0a0'); ell(44, 10, 8, 5, '#f8a0a0'); smile(14, 26, '#b04050'); break;
    case 'ryu': eyes('#3a2a1a', { ry: 9 }); brows('#111', -32, 4); grin(30, 18); break;
    case 'maki':
      eyes('#4a3a2a', { ry: 9, lid: 3 }); brows('#111', -32, 3); line([[-12, 26], [12, 26]], '#3a1a1a', 5);
      for (const [a, b] of [[[-70, -48], [-16, 30]], [[-60, -10], [-30, 36]], [[10, -50], [40, -20]]]) line([a, b], '#b06a5a', 5);
      break;
    case 'judge':
      for (const sd of [-1, 1]) { ell(sd * 30, -10, 15, 8, '#f4f4f4'); ell(sd * 30, -10, 4, 7, '#111'); }
      g.fillStyle = '#f4f4f4'; g.fillRect(-40, 20, 80, 8); for (let k = -4; k <= 4; k++) g.fillRect(k * 9 - 2, 14, 4, 20); break;
    case 'uro': eyes('#3a2a2a', { ry: 10, lid: 3 }); brows('#111', -34, -2); g.fillStyle = '#b02030'; g.beginPath(); g.ellipse(0, 24, 12, 5, 0, 0, Math.PI * 2); g.fill(); break;
  }
  g.restore();
}
let faceMat = null;
function faceAtlas() {
  if (faceMat) return faceMat;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  FACES.forEach((n, k) => { g.save(); g.translate((k % 4) * 256, Math.floor(k / 4) * 128); g.beginPath(); g.rect(0, 0, 256, 128); g.clip(); drawFace(g, n, 256, 128); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  faceMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.28 });
  return faceMat;
}
const faceGeos = new Map();
function faceGeo(name) {
  let g = faceGeos.get(name);
  if (g) return g;
  const k = FACES.indexOf(name), u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 2;
  g = new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, u0 + 0.01, v0 + 0.02);
    else uv.setXY(i, u0 + uv.getX(i) * 0.25, v0 + (0.02 + uv.getY(i) * 0.96) * 0.5);
  }
  faceGeos.set(name, g);
  return g;
}
export function head(b, name, x, y, z, r, h, rot = Math.PI) { b.add(faceGeo(name), faceAtlas(), x, y, z, rot, r, h, r); }
// humanoid with one of this file's faces (the shared figure's own head shrinks out of sight)
function fig(o) {
  const ex = o.extra;
  return P.humanoid({ ...o, face: null, headR: 0.05, extra: (b, s) => { head(b, o.myFace, 0, 2.98 * s, 0, 0.43 * s, 0.74 * s); ex?.(b, s); } });
}
function spiky(b, s, top, col, n, len, spread, seed = 7) {
  b.cyl(0, top - 0.24 * s, 0, 0.47 * s, 0.36 * s, col, { seg: 14 });
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, ring = k % 2 ? 0.28 : 0.4; spike(b, Math.sin(a) * ring * s, top - 0.05 * s, Math.cos(a) * ring * s, 0.2 * s, (len + r() * 0.3) * s, Math.cos(a) * spread, -Math.sin(a) * spread, col); }
}

// ---- characters -------------------------------------------------------------------------
// Kinji Hakari: swept-back light hair, dark jacket over a white shirt
export function hakari(s) {
  const HAIR = 0xd8d4cc;
  return fig({ s, myFace: 'hakari', torso: 0x23262c, legs: 0x2a2e3a, arms: 0x23262c, collar: C.white,
    hair: (b, s, top) => { b.cyl(0, top - 0.26 * s, -0.04 * s, 0.48 * s, 0.38 * s, HAIR, { seg: 14 }); rbox(b, 0, top + 0.02 * s, -0.12 * s, 0.86 * s, 0.3 * s, 0.9 * s, -0.35, 0, 0, HAIR); rbox(b, 0, top - 0.5 * s, -0.5 * s, 0.4 * s, 0.6 * s, 0.25 * s, 0.5, 0, 0, HAIR); },
    extra: (b, s) => { b.box(0, 1.6 * s, 0.31 * s, 0.34 * s, 1.15 * s, 0.05 * s, C.white); for (const sd of [-1, 1]) b.sphere(sd * 0.45 * s, 3.2 * s, 0, 0.06 * s, 0xf2cd37); } });
}
// Hajime Kashimo: cyan topknot, white robe, carrying his staff
export function kashimo(s) {
  const HAIR = 0x5ad0e8;
  return fig({ s, myFace: 'kashimo', skinHex: 0xf4ece6, torso: C.white, legs: 0x2a3a5a, arms: C.white, hands: 0xf4ece6, collar: 0x2a3a5a,
    hair: (b, s, top) => { spiky(b, s, top, HAIR, 10, 0.35, 0.9); b.cyl(0, top, -0.1 * s, 0.16 * s, 0.4 * s, 0x1b2a34, { seg: 8 }); spike(b, 0, top + 0.35 * s, -0.1 * s, 0.32 * s, 1.5 * s, -0.25, 0, HAIR); },
    extra: (b, s) => { rbox(b, 0, 1.9 * s, 0.3 * s, 0.24 * s, 1.4 * s, 0.05 * s, 0, 0, 0.5, 0x2a3a5a); b.box(0, 1.35 * s, 0, 1.15 * s, 0.18 * s, 0.68 * s, 0x2a3a5a); },
    itemR: (a, s) => { a.cyl(0, -3.6 * s, 0.1 * s, 0.09 * s, 4.4 * s, 0x2a2a34, { seg: 6 }); a.sphere(0, 0.85 * s, 0.1 * s, 0.18 * s, 0x6ad8ff, { matOpts: { emissive: 0x3ab8ff, emissiveIntensity: 2 } }); } });
}
// Hiromi Higuruma: messy black hair, dark suit and tie, gold lawyer's badge, holding his gavel
export function higuruma(s) {
  return fig({ s, myFace: 'higuruma', torso: 0x1c1c22, legs: 0x1c1c22, arms: 0x1c1c22, collar: C.white,
    hair: (b, s, top) => spiky(b, s, top, 0x15161c, 12, 0.35, 1.05, 11),
    extra: (b, s) => { b.box(0, 1.8 * s, 0.31 * s, 0.32 * s, 1.0 * s, 0.05 * s, C.white); b.box(0, 1.85 * s, 0.33 * s, 0.12 * s, 0.9 * s, 0.05 * s, 0x6a1a1a); b.cyl(0.32 * s, 2.35 * s, 0.33 * s, 0.09 * s, 0.04 * s, 0xf2cd37, { seg: 10 }); },
    itemR: (a, s) => { a.cyl(0, -2.6 * s, 0, 0.07 * s, 1.3 * s, 0x6a3a1a, { seg: 6 }); rbox(a, 0, -2.6 * s, 0, 0.36 * s, 0.36 * s, 0.9 * s, 0, 0, 0, 0x6a3a1a); rbox(a, 0, -2.6 * s, 0, 0.4 * s, 0.4 * s, 0.12 * s, 0, 0, 0, 0xf2cd37); } });
}
// Hana Kurusu (Angel): blonde hair, white dress, two pairs of feathered wings (returned for flapping)
export function hana(s) {
  const HAIR = 0xf2d070;
  const f = fig({ s, myFace: 'hana', skinHex: 0xf8e2d0, torso: C.white, legs: C.white, arms: C.white, hands: 0xf8e2d0, shoes: 0xf2d070, collar: 0xf2d070,
    hair: (b, s, top) => { b.cyl(0, top - 0.3 * s, 0, 0.5 * s, 0.42 * s, HAIR, { seg: 14 }); b.box(0, top - 1.3 * s, -0.3 * s, 0.94 * s, 1.1 * s, 0.26 * s, HAIR); for (const sd of [-1, 1]) b.box(sd * 0.38 * s, top - 1.0 * s, 0, 0.2 * s, 0.8 * s, 0.6 * s, HAIR); },
    extra: (b, s) => { b.add(new THREE.CylinderGeometry(0.62, 0.8, 1, 14).translate(0, 0.5, 0), plastic(C.white), 0, 0.3 * s, 0, 0, s, 1.1 * s, s); } });
  const wings = [];
  for (const sd of [-1, 1]) for (const tier of [0, 1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 0.3 * s, (2.5 - tier * 0.7) * s, -0.35 * s);
    const w = new BrickBuilder(1);
    for (let k = 0; k < 5; k++) rbox(w, sd * (0.5 + k * 0.42) * s, (0.3 - k * 0.12 + tier * 0.2) * s, -0.1 * s, 0.5 * s, (1.6 - k * 0.18 - tier * 0.4) * s, 0.12 * s, 0, 0, -sd * (0.2 + k * 0.12), k % 2 ? 0xf4f4f4 : 0xe6e8f0);
    pv.add(w.build({ name: 'wing' })); pv.rotation.y = sd * 0.4; f.root.add(pv); wings.push(pv);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.4 * s, 0.06 * s, 8, 24).rotateX(Math.PI / 2), P.neon(0xfff0a0, 2));
  halo.position.set(0, f.top + 0.5 * s, 0); f.root.add(halo);
  f.wings = wings;
  return f;
}
// Ryu Ishigori: enormous black pompadour, long black gakuran
export function ryu(s) {
  return fig({ s, myFace: 'ryu', torso: 0x15161c, legs: 0x15161c, arms: 0x15161c, buttons: 0xdcbc81, wide: 1.15,
    hair: (b, s, top) => { b.cyl(0, top - 0.26 * s, -0.05 * s, 0.48 * s, 0.4 * s, 0x15161c, { seg: 14 }); b.add(new THREE.CylinderGeometry(1, 1, 1, 14).rotateX(Math.PI / 2), plastic(0x15161c), 0, top + 0.1 * s, 0.7 * s, 0, 0.5 * s, 0.42 * s, 2.0 * s); b.sphere(0, top + 0.1 * s, 1.7 * s, 0.5 * s, 0x15161c, { sy: 0.85 }); },
    extra: (b, s) => { b.add(new THREE.CylinderGeometry(0.64, 0.76, 1, 14).translate(0, 0.5, 0), plastic(0x15161c), 0, 0.2 * s, 0, 0, s * 1.1, 1.2 * s, s); } });
}
// Maki Zen'in after the clan massacre: cropped hair, burn scars, no glasses, Split Soul Katana
export function maki(s) {
  return fig({ s, myFace: 'maki', torso: 0x1b1b22, legs: 0x1b1b22, arms: 0x1b1b22, buttons: 0x6a6a74,
    hair: (b, s, top) => spiky(b, s, top, 0x1e2e26, 10, 0.18, 1.3, 5),
    extra: (b, s) => { rbox(b, 0, 2.0 * s, -0.36 * s, 0.14 * s, 2.4 * s, 0.14 * s, 0, 0, 0.7, 0x3a2a1a); },
    itemR: (a, s) => { a.box(0, -1.6 * s, 0, 0.14 * s, 0.6 * s, 0.14 * s, C.black); a.box(0, -1.68 * s, 0, 0.42 * s, 0.08 * s, 0.42 * s, 0xdcbc81); rbox(a, 0, -1.6 * s, 1.7 * s, 0.06 * s, 0.2 * s, 3.3 * s, 0, 0, 0, 0xdfe6ee, { matOpts: { metal: 0.7, rough: 0.2 } }); } });
}
// Takako Uro: long dark ponytail, dark kimono top
export function uro(s) {
  return fig({ s, myFace: 'uro', torso: 0x2a2a3a, legs: 0x3a3a4a, arms: 0x2a2a3a, collar: 0xb02030,
    hair: (b, s, top) => { b.cyl(0, top - 0.3 * s, 0, 0.5 * s, 0.42 * s, 0x1a1418, { seg: 14 }); rbox(b, 0, top - 0.9 * s, -0.55 * s, 0.3 * s, 1.6 * s, 0.3 * s, -0.3, 0, 0, 0x1a1418); } });
}
// Judgeman: Higuruma's hooded shikigami holding the scales of justice
export function judgeman(s) {
  const root = new THREE.Group(), b = new BrickBuilder(1), ROBE = 0x15151c;
  b.add(new THREE.CylinderGeometry(0.9, 1.6, 1, 16).translate(0, 0.5, 0), plastic(ROBE), 0, 0, 0, 0, s, 3.4 * s, s);
  head(b, 'judge', 0, 3.4 * s, 0, 0.6 * s, 1.0 * s);
  b.cone(0, 3.3 * s, -0.05 * s, 0.85 * s, 2.0 * s, ROBE, { seg: 12 });
  b.box(0, 3.2 * s, -0.4 * s, 1.5 * s, 0.6 * s, 0.6 * s, ROBE);
  for (const sd of [-1, 1]) { rbox(b, sd * 1.0 * s, 2.6 * s, 0.4 * s, 0.4 * s, 1.6 * s, 0.4 * s, -0.9, 0, -sd * 0.3, ROBE); }
  // the scales
  b.cyl(0, 3.0 * s, 1.4 * s, 0.06 * s, 2.0 * s, 0xdcbc81, { seg: 6 });
  b.box(0, 4.9 * s, 1.4 * s, 2.2 * s, 0.08 * s, 0.08 * s, 0xdcbc81);
  for (const sd of [-1, 1]) { b.cyl(sd * 1.05 * s, 4.0 * s, 1.4 * s, 0.4 * s, 0.08 * s, 0xdcbc81, { seg: 12 }); b.cyl(sd * 1.05 * s, 4.08 * s, 1.4 * s, 0.02 * s, 0.82 * s, 0xdcbc81, { seg: 4 }); }
  root.add(b.build({ name: 'judgeman' }));
  return root;
}
// Kogane: the little golden game-master shikigami that announces points
export function kogane(s = 1) {
  const b = new BrickBuilder(1), Y = 0xf2c230;
  b.sphere(0, 1.4 * s, 0, 1.4 * s, Y, { sy: 0.9 });
  b.sphere(0, 0.3 * s, 0, 0.8 * s, Y);
  for (const sd of [-1, 1]) {
    b.sphere(sd * 0.5 * s, 1.6 * s, 1.1 * s, 0.32 * s, C.white); b.sphere(sd * 0.5 * s, 1.6 * s, 1.35 * s, 0.17 * s, 0x111111);
    spike(b, sd * 0.9 * s, 2.3 * s, 0, 0.4 * s, 0.9 * s, 0, -sd * 0.4, Y);
    b.sphere(sd * 0.9 * s, 0.4 * s, 0.3 * s, 0.3 * s, Y);
  }
  b.sphere(0, 1.05 * s, 1.25 * s, 0.32 * s, 0x5a1a1a, { sy: 0.6 });
  b.sphere(0, 1.3 * s, 1.35 * s, 0.14 * s, 0x2a1a1a);
  b.cyl(0, -0.6 * s, -0.6 * s, 0.12 * s, 0.6 * s, Y, { seg: 6 });
  return b.build({ name: 'kogane' });
}
// a brick cockroach (Kurourushi's swarm)
export function roach(b, x, y, z, s, rot) {
  const ca = Math.cos(rot), sa = Math.sin(rot), L = (f, sd) => [x + sa * f + ca * sd, z + ca * f - sa * sd];
  b.sphere(x, y + 0.5 * s, z, 0.7 * s, 0x4a2a14, { sy: 0.45 });
  rbox(b, x, y + 0.6 * s, z, 1.2 * s, 0.3 * s, 2.2 * s, 0, rot, 0, 0x5a3418);
  const [hx, hz] = L(1.2 * s, 0); b.sphere(hx, y + 0.5 * s, hz, 0.4 * s, 0x2a1a0a);
  for (const sd of [-1, 1]) {
    const [ax, az] = L(1.9 * s, sd * 0.5 * s); rbox(b, ax, y + 0.8 * s, az, 0.06 * s, 0.06 * s, 1.6 * s, -0.4, rot + sd * 0.4, 0, 0x2a1a0a);
    for (const f of [-0.6, 0, 0.6]) { const [lx, lz] = L(f * s, sd * 0.9 * s); rbox(b, lx, y + 0.25 * s, lz, 0.9 * s, 0.08 * s, 0.08 * s, 0, rot, sd * 0.5, 0x2a1a0a); }
  }
}
// Kurourushi: the giant cockroach curse, standing up
export function kurourushi(s) {
  const b = new BrickBuilder(1), SH = 0x4a2a14, DK = 0x2a1a0a;
  b.sphere(0, 4.2 * s, 0, 1.6 * s, SH, { sy: 1.7 });
  for (const sd of [-1, 1]) rbox(b, sd * 0.7 * s, 4.6 * s, -0.9 * s, 1.2 * s, 4.4 * s, 0.25 * s, 0.15, 0, sd * 0.15, 0x6a3a18, { matOpts: { rough: 0.15 } });
  b.sphere(0, 7.4 * s, 0.3 * s, 0.9 * s, DK);
  for (const sd of [-1, 1]) {
    b.sphere(sd * 0.45 * s, 7.6 * s, 0.95 * s, 0.25 * s, 0xff3020, { matOpts: { emissive: 0xff2010, emissiveIntensity: 1.5 } });
    rbox(b, sd * 0.8 * s, 9.0 * s, 0.6 * s, 0.1 * s, 3.2 * s, 0.1 * s, 0.3, 0, -sd * 0.6, DK);
    for (const h of [2.4, 3.8, 5.2]) rbox(b, sd * 2.0 * s, h * s, 0.4 * s, 2.6 * s, 0.22 * s, 0.22 * s, 0, 0, sd * (h < 3 ? 0.7 : -0.3), DK);
  }
  const g = new THREE.Group(); g.add(b.build({ name: 'kurourushi' }));
  return g;
}
// pachinko machine cabinet facing +Z (pins, a gold frame, flashing lamp rows)
export function pachinkoCabinet(b, x, z, rot, s = 1) {
  const ca = Math.cos(rot), sa = Math.sin(rot), L = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca];
  b.box(x, 0, z, 4.4 * s, 9 * s, 2 * s, 0xc81a2a, { rot });
  const [fx, fz] = L(0, 1.02 * s);
  b.box(fx, 2.4 * s, fz, 3.8 * s, 5.4 * s, 0.1 * s, 0xf2e6c8, { rot });
  for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) { const [px, pz] = L((c - 2 + (r % 2) * 0.5) * 0.65 * s, 1.1 * s); b.cyl(px, (2.9 + r * 0.8) * s, pz, 0.06 * s, 0.05 * s, 0xc8ccd4, { seg: 5 }); }
  const [tx, tz] = L(0, 1.06 * s); b.box(tx, 7.9 * s, tz, 4.4 * s, 1.0 * s, 0.2 * s, 0xf2cd37, { rot, matOpts: { emissive: 0xffc020, emissiveIntensity: 1.2 } });
  const [hx, hz] = L(0, 1.4 * s); b.box(hx, 1.0 * s, hz, 3.6 * s, 0.8 * s, 0.8 * s, 0xc8ccd4, { rot, matOpts: { metal: 0.7, rough: 0.2 } });
}
// giant gavel (handle along -Y from the pivot, head at the end)
export function gavel(len) {
  const b = new BrickBuilder(1), WOOD = 0x6a3a1a;
  b.cyl(0, 0, 0, 0.7, len, WOOD, { seg: 10 });
  b.add(new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2), plastic(WOOD), 0, len + 0.4, 0, 0, 9, 2.1, 2.1);
  for (const sd of [-1, 1]) b.add(new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2), plastic(0xf2cd37, { metal: 0.6, rough: 0.3 }), sd * 3.6, len + 0.4, 0, 0, 0.8, 2.25, 2.25);
  const g = b.build({ name: 'gavel' });
  g.rotation.x = Math.PI;   // handle points down from the pivot
  const hold = new THREE.Group(); hold.add(g);
  return hold;
}
