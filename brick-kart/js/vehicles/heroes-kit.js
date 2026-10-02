// Small building helpers for the Marvel & Jurassic vehicle pack (heroes.js).
// Everything here runs once at build time; nothing allocates per frame.
import * as THREE from 'three';
import { plastic } from '../lego.js';

const geoCache = new Map();
const cached = (k, make) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };

const E = new THREE.Euler(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), SC = new THREE.Vector3();
// matrix from position, rotation (radians, Euler order) and scale
export function mat(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') {
  return new THREE.Matrix4().compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz, order)), SC.set(sx, sy, sz));
}
const mopt = (opts) => opts.mat || plastic(opts.color, opts.matOpts);

// rotated box: centre (x, y, z), size (sx, sy, sz), rotation (rx, ry, rz)
export function rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts = {}) {
  b.boxM(mat(x, y, z, rx, ry, rz, sx, sy, sz, opts.order), color, opts);
}

// cylinder / tube between two points
const YA = new THREE.Vector3(0, 1, 0), D = new THREE.Vector3();
export function tube(b, x1, y1, z1, x2, y2, z2, r, color, opts = {}) {
  const seg = opts.seg || 8;
  const g = cached('tube' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0));
  D.set(x2 - x1, y2 - y1, z2 - z1);
  const len = D.length();
  Q.setFromUnitVectors(YA, D.normalize());
  b.addMatrix(g, mopt({ ...opts, color }), new THREE.Matrix4().compose(P.set(x1, y1, z1), Q, SC.set(r, len, opts.rz ?? r)));
}

// disc / wheel-like cylinder centred at (x, y, z) with its axis along 'x', 'y' or 'z'
export function disc(b, x, y, z, r, h, axis, color, opts = {}) {
  const seg = opts.seg || 16;
  const g = cached('disc' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg));
  const rx = axis === 'z' ? Math.PI / 2 : 0, rz = axis === 'x' ? Math.PI / 2 : 0;
  b.addMatrix(g, mopt({ ...opts, color }), mat(x, y, z, rx, 0, rz, r, h, r));
}

// cone pointing along +axis ('x' | 'y' | 'z', sign by dir) with its base centred at (x, y, z)
export function cone(b, x, y, z, r, h, axis, dir, color, opts = {}) {
  const seg = opts.seg || 10;
  const g = cached('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg).translate(0, 0.5, 0));
  let rx = 0, rz = 0;
  if (axis === 'z') rx = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  else if (axis === 'x') rz = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  else if (dir < 0) rx = Math.PI;
  b.addMatrix(g, mopt({ ...opts, color }), mat(x, y, z, rx, 0, rz, r, h, r));
}

// ring (torus) with its axis along 'x', 'y' or 'z'; arc < 2PI for partial rings
export function ring(b, x, y, z, R, t, axis, color, opts = {}) {
  const arc = opts.arc ?? Math.PI * 2, rs = opts.rs || 8, ts = opts.ts || 28;
  const g = cached(`ring${R},${t},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(R, t, rs, ts, arc));
  const ry = axis === 'x' ? Math.PI / 2 : 0, rx = axis === 'y' ? Math.PI / 2 : 0;
  b.addMatrix(g, mopt({ ...opts, color }), mat(x, y, z, rx + (opts.rx || 0), ry + (opts.ry || 0), opts.rz || 0, 1, 1, 1, 'YXZ'));
}

// ellipsoid (or part of one: theta0..theta1 = polar range from the top)
export function blob(b, x, y, z, sx, sy, sz, color, opts = {}) {
  const t0 = opts.t0 ?? 0, t1 = opts.t1 ?? Math.PI, ws = opts.ws || 16, hs = opts.hs || 10;
  const g = cached(`blob${t0},${t1},${ws},${hs}`, () => new THREE.SphereGeometry(1, ws, hs, 0, Math.PI * 2, t0, t1 - t0));
  b.addMatrix(g, mopt({ ...opts, color }), mat(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0, sx, sy, sz));
}

// own (unshared) glowing material so a vehicle can pulse it in fx
export function glowMat(color, emissive, intensity = 1.2, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.3, ...extra });
}

// ---- decal atlas: [Jurassic Park logo][12][05][spider web] in one 512x128 texture ------------
let atlasMat = null;
function drawLogo(g, ox) {
  const cx = ox + 64, cy = 64;
  const circ = (r, c) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); };
  circ(63, '#f2c414'); circ(59, '#111'); circ(50, '#c8141a');
  // T. rex skeleton silhouette (head left, tail right)
  g.save(); g.beginPath(); g.arc(cx, cy, 50, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#111'; g.strokeStyle = '#111'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 40, cy - 22); g.lineTo(cx - 14, cy - 30); g.lineTo(cx - 10, cy - 18); g.lineTo(cx - 26, cy - 12); g.lineTo(cx - 40, cy - 14); g.closePath(); g.fill(); // skull
  g.beginPath(); g.moveTo(cx - 38, cy - 8); g.lineTo(cx - 16, cy - 10); g.lineTo(cx - 20, cy - 4); g.lineTo(cx - 36, cy - 3); g.closePath(); g.fill();   // jaw
  g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 12, cy - 20); g.quadraticCurveTo(cx + 10, cy - 30, cx + 52, cy - 6); g.stroke(); // spine + tail
  g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const x = cx - 6 + i * 6; g.beginPath(); g.moveTo(x, cy - 22 + i * 0.5); g.lineTo(x + 3, cy - 2 + Math.abs(i - 2.5) * 2); g.stroke(); } // ribs
  g.lineWidth = 6; g.beginPath(); g.moveTo(cx + 22, cy - 14); g.lineTo(cx + 14, cy + 8); g.lineTo(cx + 22, cy + 22); g.stroke(); // leg
  g.beginPath(); g.moveTo(cx + 26, cy - 12); g.lineTo(cx + 30, cy + 8); g.lineTo(cx + 26, cy + 22); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 6, cy - 12); g.lineTo(cx - 12, cy - 4); g.stroke(); // arm
  g.restore();
  // banner with the name
  g.fillStyle = '#f2c414'; g.fillRect(ox + 4, cy + 18, 120, 26);
  g.fillStyle = '#111'; g.fillRect(ox + 7, cy + 21, 114, 20);
  g.fillStyle = '#ffffff'; g.font = 'bold 15px Impact, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('JURASSIC PARK', cx, cy + 32, 108);
}
function drawNumber(g, ox, txt, bg, fg) {
  g.fillStyle = bg; g.fillRect(ox + 8, 20, 112, 88);
  g.fillStyle = fg; g.font = 'bold 76px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, ox + 64, 68, 104);
}
function drawWeb(g, ox) {
  const cx = ox + 64, cy = 64;
  g.strokeStyle = '#111'; g.lineWidth = 3;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62); g.stroke(); }
  for (let r = 14; r < 64; r += 14) {
    g.beginPath();
    for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * 2; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? g.quadraticCurveTo(cx + Math.cos(a - 0.39) * r * 0.85, cy + Math.sin(a - 0.39) * r * 0.85, x, y) : g.moveTo(x, y); }
    g.stroke();
  }
}
export function decalMat() {
  if (atlasMat) return atlasMat;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  drawLogo(g, 0);
  drawNumber(g, 128, '12', '#d8c39a', '#111');
  drawNumber(g, 256, '05', '#f2c414', '#111');
  drawWeb(g, 384);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  atlasMat = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.4 });
  return atlasMat;
}
// cell: 0 logo, 1 '12', 2 '05', 3 web. face: '+x' '-x' '+z' '-z' 'up' (readable from behind)
export function decal(b, cell, x, y, z, w, h, face) {
  const g = cached('decal' + cell, () => {
    const p = new THREE.PlaneGeometry(1, 1);
    const uv = p.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (cell + uv.getX(i)) / 4);
    return p;
  });
  const rot = { '+x': [0, Math.PI / 2], '-x': [0, -Math.PI / 2], '+z': [0, 0], '-z': [0, Math.PI], up: [-Math.PI / 2, Math.PI] }[face];
  b.addMatrix(g, decalMat(), mat(x, y, z, rot[0], rot[1], 0, w, h, 1, 'YXZ'));
}

// flat bar (box) from point 1 to point 2: w across, h thick (kept roughly level)
export function beam(b, x1, y1, z1, x2, y2, z2, w, h, color, opts = {}) {
  D.set(x2 - x1, y2 - y1, z2 - z1);
  const len = D.length();
  const yaw = Math.atan2(D.x, D.z), pitch = -Math.asin(D.y / len);
  b.boxM(mat((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, pitch, yaw, opts.roll || 0, w, h, len + (opts.ext || 0), 'YXZ'), color, opts);
}

// The driver's size (kit.rig, seat frame, hips at the origin) boiled down to the numbers the
// cockpits need. A typical figure is ~2.0 tall and 1.3 wide; huge ones reach 2.9 x 2.0.
//   H height (top of head), W overall width, hip = hip/thigh half-width,
//   sx/sy = shoulder half-width / height, big/wide = 0..1 beyond a typical figure
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function fitOf(rig) {
  const H = clamp(rig?.height ?? 1.8, 1.1, 3.0), W = clamp(rig?.width ?? 1.2, 0.8, 2.1);
  const sx = clamp(Math.abs(rig?.shoulder?.x ?? 0.56), 0.2, 1.0), sy = clamp(rig?.shoulder?.y ?? 1.2, 0.6, 1.6);
  return { H, W, sx, sy, hip: clamp(0.12 + W * 0.26, 0.3, 0.7), big: clamp((H - 2.05) / 0.85, 0, 1), wide: clamp((W - 1.3) / 0.65, 0, 1) };
}
