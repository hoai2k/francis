// Helpers for the Brick Kart Originals drivers (./classic.js): maths for gestures, canvas
// faces, hand grips that keep a prop upright, effect parts (glows, puffs, rings, sparkles)
// and a finish() that measures the rig. See ../driver.js for the seated-rig contract.
import { THREE, BrickBuilder, C, plastic, seatedFig, rbox, rod, mat4, cached, taperGeo, glowMat, faceMat } from './kit.js';

export { THREE, BrickBuilder, C, plastic, seatedFig, rbox, rod, mat4, cached, taperGeo, glowMat };

// ---- maths ------------------------------------------------------------------------------
export const S = Math.sin, CO = Math.cos, PI = Math.PI, abs = Math.abs, UP = -2.75;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (f, a, b) => clamp01((f - a) / (b - a));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const bump = (f, a = 0, b = 1) => Math.sin(PI * seg(f, a, b));          // 0 → 1 → 0 over [a, b]
export const winF = (t) => (t % 1.6) / 1.6;                                      // driver.js loops 'win' every 1.6 s
export const vis = (o, on) => { if (o.visible !== on) o.visible = on; };
export const hex = (c) => '#' + new THREE.Color(c).getHexString();

// ---- faces ------------------------------------------------------------------------------
// A canvas face print. draw(P) works in a centred, x-squeezed space (x ±~110, y ±64, y down)
// so circles stay round on a cylinder head; sq = head height / (PI * radius).
export function face(key, skin, draw, sq = 0.53) {
  return faceMat('orig-' + key, (g) => {
    g.save(); g.translate(128, 64); g.scale(sq, 1);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const P = {
      g,
      ell(x, y, rx, ry, col, rot = 0) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, PI * 2); g.fill(); },
      line(pts, col, w) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); },
      poly(pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); },
      curve(x0, y0, cx, cy, x1, y1, col, w) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke(); },
      rect(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); },
      // mouths: grin (open, teeth on top), smile, open (O / roar), smirk, flat, frown
      mouth(y, w, kind = 'smile', col = '#1b1b1b') {
        if (kind === 'grin' || kind === 'open') {
          g.fillStyle = col; g.beginPath();
          if (kind === 'grin') { g.moveTo(-w, y); g.quadraticCurveTo(0, y + w * 1.5, w, y); g.closePath(); }
          else g.ellipse(0, y + w * 0.5, w * 0.8, w * 0.75, 0, 0, PI * 2);
          g.fill();
          g.fillStyle = '#fff'; g.fillRect(-w * 0.62, y + (kind === 'open' ? -w * 0.2 : 0), w * 1.24, w * 0.3);
          P.ell(0, y + w * (kind === 'open' ? 0.95 : 0.6), w * 0.42, w * 0.28, '#d94a5a');
        } else if (kind === 'smile') P.curve(-w, y, 0, y + w * 0.9, w, y, col, 6);
        else if (kind === 'frown') P.curve(-w, y + w * 0.5, 0, y - w * 0.3, w, y + w * 0.5, col, 6);
        else if (kind === 'smirk') P.curve(-w * 0.8, y + w * 0.2, w * 0.3, y + w * 0.45, w, y - w * 0.25, col, 6);
        else P.line([[-w, y], [w, y]], col, 6);
      },
      // a pair of shiny cartoon eyes
      eyes(dx, y, rx, ry, col = '#1b1b1b', shine = true) {
        for (const sd of [-1, 1]) { P.ell(sd * dx, y, rx, ry, col); if (shine) P.ell(sd * dx + rx * 0.35, y - ry * 0.4, rx * 0.32, ry * 0.28, '#fff'); }
      },
    };
    draw(P);
    g.restore();
  }, hex(skin));
}

// ---- materials / effect parts --------------------------------------------------------------
// additive, unlit glow for effects (beams, sparks, magic, flames)
const fxCache = new Map();
export function fxMat(color, opacity = 0.85) {
  const key = color + '|' + opacity;
  let m = fxCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    fxCache.set(key, m);
  }
  return m;
}
// see-through plastic (bubble helmets, water)
export const clear = (c, opacity = 0.3) => plastic(c, { trans: true, opacity, rough: 0.05 });
export const metal = (c) => plastic(c, { metal: 0.65, rough: 0.28 });

// geometry helpers: a top hemisphere (dome), a frustum, a tapered rod, a yawed/tilted box
export const domeGeo = () => cached('origDome', () => new THREE.SphereGeometry(1, 16, 7, 0, PI * 2, 0, PI / 2));
export const frustum = (rt, rb, segs = 16) => cached(`origFr${rt},${rb},${segs}`, () => new THREE.CylinderGeometry(rt, rb, 1, segs).translate(0, 0.5, 0));
const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0), _Q = new THREE.Quaternion(), _M = new THREE.Matrix4(), _Sc = new THREE.Vector3();
export function trod(b, a, c, r0, r1, color, segs = 8) {
  _A.set(...a); _B.set(...c);
  const dir = _B.sub(_A), len = dir.length(), k = Math.round((r1 / r0) * 50) / 50;
  const g = cached(`origTrod${k},${segs}`, () => new THREE.CylinderGeometry(k, 1, 1, segs).translate(0, 0.5, 0));
  _M.compose(_A, _Q.setFromUnitVectors(_Y, dir.normalize()), _Sc.set(r0, len, r0));
  b.addMatrix(g, typeof color === 'number' ? plastic(color) : color, _M);
}
const _E = new THREE.Euler();
// box yawed by ry then tilted by rx/rz in its own frame (Euler order YXZ)
export function ybox(b, x, y, z, sx, sy, sz, ry, rx, rz, color) {
  _E.set(rx, ry, rz, 'YXZ'); _Q.setFromEuler(_E);
  _M.compose(_A.set(x, y, z), _Q, _Sc.set(sx, sy, sz));
  b.boxM(_M, color);
}
// any cached geometry with a full transform
export function geoM(b, geo, mat, x, y, z, rx, ry, rz, sx, sy = sx, sz = sx) {
  _E.set(rx, ry, rz, 'XYZ'); _Q.setFromEuler(_E);
  _M.compose(_A.set(x, y, z), _Q, _Sc.set(sx, sy, sz));
  b.addMatrix(geo, typeof mat === 'number' ? plastic(mat) : mat, _M);
}
export const torusGeo = (t = 0.25, segs = 20) => cached(`origTorus${t},${segs}`, () => new THREE.TorusGeometry(1, t, 6, segs));
export const coneGeo = () => cached('origCone', () => new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0));
export const sphGeo = () => cached('origSph', () => new THREE.SphereGeometry(1, 12, 8));

const sph = () => cached('origSph', () => new THREE.SphereGeometry(1, 12, 8));
const oct = () => cached('origOct', () => new THREE.OctahedronGeometry(1, 0));

// a separately built part on its own pivot (so it can be shown, hidden, moved or spun)
export function prop(parent, fn, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, name = 'driver-prop', visible = true } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); g.visible = visible;
  const b = new BrickBuilder(1); fn(b); g.add(b.build({ name }));
  parent.add(g);
  return g;
}
// an empty pivot (hidden by default) for effects
export function fxg(parent, { x = 0, y = 0, z = 0, visible = false } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.visible = visible; parent.add(g); return g;
}
// The fist of an arm pivot: a group at the hand whose +Y is the prop's "up". hold(grip, arm, a)
// re-aims it every frame so the prop points at angle a from straight up (towards +Z) in the
// torso frame, whatever the arm is doing (call it from rig.idle / rig.fx).
export function grip(arm, s, name = 'grip') {
  const g = new THREE.Group(); g.name = name; g.rotation.order = 'ZYX'; g.position.set(0, -0.6 * s, 0.02 * s); arm.add(g); return g;
}
export function hold(g, arm, a, k = 1) { g.rotation.x = a - arm.rotation.x * k; g.rotation.z = -arm.rotation.z * k; }

// a glowing ball (unlit, additive) — r is the radius
export function ball(parent, color, r, x = 0, y = 0, z = 0, opacity = 0.85) {
  const m = new THREE.Mesh(sph(), fxMat(color, opacity)); m.scale.setScalar(r); m.position.set(x, y, z); parent.add(m); return m;
}
// a torus in the XZ plane (horizontal) — unit radius R, tube thickness t (relative)
export function ring(parent, mat, R, t = 0.06, segs = 28) {
  const g = cached(`origRing${t},${segs}`, () => new THREE.TorusGeometry(1, t, 6, segs).rotateX(PI / 2));
  const m = new THREE.Mesh(g, mat); m.scale.setScalar(R); parent.add(m); return m;
}
// a seeded random generator
export function rnd(seed = 7) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
// one mesh of n puffs (smoke, dust, steam, water drops) scattered in a ball of radius spread
export function puffs(parent, mat, n, spread, r, seed = 3, { up = 0, flat = 1 } = {}) {
  const R = rnd(seed), b = new BrickBuilder(1);
  for (let i = 0; i < n; i++) {
    const a = R() * PI * 2, e = (R() - 0.3) * PI * 0.6, d = spread * (0.35 + R() * 0.65);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d * flat + up * R(), Math.sin(a) * Math.cos(e) * d),
      new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(r * (0.6 + R() * 0.7)));
    b.addMatrix(sph(), typeof mat === 'number' ? plastic(mat) : mat, m);
  }
  const g = b.build({ name: 'puffs' }); parent.add(g); return g;
}
// one mesh of n twinkling star sparkles (octahedra) on a ring/shell of radius R
export function sparkles(parent, color, n, R, size, seed = 5, { flat = 0.6, opacity = 0.95 } = {}) {
  const r = rnd(seed), b = new BrickBuilder(1), mat = fxMat(color, opacity);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + r() * 0.5, e = (r() - 0.5) * PI * flat, d = R * (0.7 + r() * 0.5);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, 0)), new THREE.Vector3(size, size * 1.6, size).multiplyScalar(0.6 + r() * 0.7));
    b.addMatrix(oct(), mat, m);
  }
  const g = b.build({ name: 'sparkles' }); parent.add(g); return g;
}
// a flame: nested additive cones pointing down -Y from the origin (length 1, scale it)
export function flame(parent, outer = 0xff6a00, inner = 0xffe070) {
  const g = new THREE.Group(); parent.add(g);
  const cone = cached('origFlame', () => new THREE.ConeGeometry(1, 1, 10, 1, true).rotateX(PI).translate(0, -0.5, 0));
  const a = new THREE.Mesh(cone, fxMat(outer, 0.8)); a.scale.set(0.16, 1, 0.16); g.add(a);
  const b = new THREE.Mesh(cone, fxMat(inner, 0.95)); b.scale.set(0.08, 0.6, 0.08); g.add(b);
  return g;
}

// Measures the visible rig (props included, hidden effects not) for height/width.
const _bb = new THREE.Box3(), _v = new THREE.Vector3();
export function finish(rig, width) {
  rig.root.updateMatrixWorld(true);
  _bb.makeEmpty();
  rig.root.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 3) _bb.expandByPoint(_v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
  });
  rig.height = _bb.max.y;
  rig.width = width ?? rig.width;
  return rig;
}
