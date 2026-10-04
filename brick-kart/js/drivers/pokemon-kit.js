// Helpers for the Pokémon drivers (see ./pokemon.js and ../driver.js for the rig contract):
// a tiny shape kit over BrickBuilder (rotated boxes, ellipsoids, cones, rods, big glossy
// Pokémon eyes), pivots, glow sprites and the signature effects (electric sparks, flames,
// water jets, music notes, Zzz, aura spheres). pokeBall() is shared with the Pokémon karts and
// power-ups.
import { THREE, BrickBuilder, C, plastic, seatedFig, faceMat, rbox, rod, cached } from './kit.js';

export { THREE, BrickBuilder, C, plastic, seatedFig, faceMat, rbox, rod, cached };
export const S = Math.sin, CO = Math.cos, PI = Math.PI, abs = Math.abs, UP = -2.75;
export const LOOP = (PI * 2) / 1.6;   // one cycle of the looped win pose
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (f, a, b) => clamp01((f - a) / (b - a));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const bump = (f, a, b) => S(PI * seg(f, a, b));
export const vis = (o, on) => { if (o.visible !== on) o.visible = on; };

// ---- shapes ----------------------------------------------------------------------------------
const G = {
  box: () => cached('pk-box', () => new THREE.BoxGeometry(1, 1, 1)),
  sph: () => cached('pk-sph', () => new THREE.SphereGeometry(1, 14, 10)),
  cyl: (n) => cached('pk-cyl' + n, () => new THREE.CylinderGeometry(1, 1, 1, n)),
  cone: (n) => cached('pk-cone' + n, () => new THREE.ConeGeometry(1, 1, n)),
  hemi: () => cached('pk-hemi', () => new THREE.SphereGeometry(1, 16, 6, 0, PI * 2, 0, PI / 2)),
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const M = (x, y, z, rx, ry, rz, sx, sy, sz) => _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
const matOf = (col, o) => o.mat || plastic(col, o.matOpts);
// A shape kit over a builder. o: { rx, ry, rz, mat, matOpts, seg }
export function shape(b) {
  const put = (g, col, x, y, z, sx, sy, sz, o) => b.addMatrix(g, matOf(col, o), M(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, sx, sy, sz));
  const L = {
    b,
    box: (x, y, z, sx, sy, sz, col, o = {}) => put(G.box(), col, x, y, z, sx, sy, sz, o),
    ell: (x, y, z, rx, ry, rz, col, o = {}) => put(G.sph(), col, x, y, z, rx, ry, rz, o),
    hemi: (x, y, z, rx, ry, rz, col, o = {}) => put(G.hemi(), col, x, y, z, rx, ry, rz, o),
    cyl: (x, y, z, r, h, col, o = {}) => put(G.cyl(o.seg || 12), col, x, y, z, r, h, o.r2 ?? r, o),
    cone: (x, y, z, r, h, col, o = {}) => put(G.cone(o.seg || 10), col, x, y, z, r, h, o.r2 ?? r, o),
    rod: (a, c, r, col, o = {}) => rod(b, a, c, r, o.mat || plastic(col, o.matOpts), o.seg || 8),
    // a flat ring (radius R, tube t) around the Y axis; o.sz stretches it along Z
    ring: (x, y, z, R, t, col, o = {}) => put(cached(`pk-ring${R},${t}`, () => new THREE.TorusGeometry(R, t, 8, 36).rotateX(PI / 2)), col, x, y, z, 1, 1, o.sz ?? 1, o),
    // a LEGO stud on top of a part
    stud: (x, y, z, r, col) => put(G.cyl(12), col, x, y + r * 0.35, z, r, r * 0.7, r, {}),
    // a big glossy Pokémon eye on a surface facing yaw / pitch: dark oval, coloured iris, two highlights
    eye: (x, y, z, r, yaw, o = {}) => {
      const pitch = o.pitch || 0, roll = o.roll || 0;
      put(G.sph(), o.rim ?? 0x111111, x, y, z, r, r * (o.tall ?? 1.25), r * 0.4, { ry: yaw, rx: -pitch, rz: roll });
      const fx = S(yaw) * r * 0.16, fz = CO(yaw) * r * 0.16;
      if (o.iris) put(G.sph(), o.iris, x + fx, y - r * 0.15, z + fz, r * 0.62, r * 0.75, r * 0.3, { ry: yaw, rx: -pitch });
      if (o.pupil) put(G.sph(), o.pupil, x + fx * 1.6, y - r * 0.15, z + fz * 1.6, r * 0.35, r * 0.45, r * 0.25, { ry: yaw, rx: -pitch });
      put(G.sph(), C.white, x + fx * 2 - CO(yaw) * r * 0.25 * (o.side ?? 1), y + r * 0.45, z + fz * 2 + S(yaw) * r * 0.25 * (o.side ?? 1), r * 0.3, r * 0.34, r * 0.18, { ry: yaw });
      if (!o.oneShine) put(G.sph(), C.white, x + fx * 2 + CO(yaw) * r * 0.25 * (o.side ?? 1), y - r * 0.45, z + fz * 2 - S(yaw) * r * 0.25 * (o.side ?? 1), r * 0.12, r * 0.12, r * 0.08, { ry: yaw });
    },
  };
  return L;
}
// a point on an ellipsoid (centre c, radii r) at a yaw (around Y, 0 = +Z) and pitch (up)
export function onEll(c, r, yaw, pitch, out = []) {
  out[0] = c[0] + r[0] * CO(pitch) * S(yaw); out[1] = c[1] + r[1] * S(pitch); out[2] = c[2] + r[2] * CO(pitch) * CO(yaw);
  return out;
}
// a merged part built with the shape kit
export function part(fn, name = 'pk-part') {
  const b = new BrickBuilder(1);
  fn(shape(b));
  return b.build({ name, shadows: false });
}
// a pivot group (optionally holding a part)
export function pv(parent, x, y, z, child) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  if (child) g.add(child);
  parent.add(g);
  return g;
}
// a hidden effect group
export function fxg(parent, x = 0, y = 0, z = 0) { const g = pv(parent, x, y, z); g.visible = false; return g; }

// ---- Poké Ball (shared with the karts and power-ups): r = radius, centred at (x, y, z) -----------
// the button faces +Z; o.open lifts the top half by that angle about the back hinge
export function pokeBall(L, x, y, z, r, o = {}) {
  const top = o.top ?? C.red, bot = o.bottom ?? C.white, band = o.band ?? 0x1b1b1b;
  L.hemi(x, y + r * 0.04, z, r, r, r, top, o.topOpts || {});
  L.hemi(x, y - r * 0.04, z, r, r, r, bot, { rx: PI });
  L.cyl(x, y, z, r * 1.005, r * 0.09, band, { seg: 20 });
  L.cyl(x, y, z + r * 0.93, r * 0.3, r * 0.16, band, { rx: PI / 2, seg: 16 });
  L.cyl(x, y, z + r * 1.0, r * 0.2, r * 0.08, C.white, { rx: PI / 2, seg: 16 });
  if (o.studs) L.stud(x, y + r, z, r * 0.22, top);
}

// ---- glow / fx materials ------------------------------------------------------------------------
let gTex = null;
export function glowTex() {
  if (gTex) return gTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  gTex = new THREE.CanvasTexture(c);
  return gTex;
}
const mats = new Map();
const once = (k, make) => { let m = mats.get(k); if (!m) { m = make(); mats.set(k, m); } return m; };
export const spriteMat = (c, op = 0.9) => once(`spr${c}|${op}`, () => new THREE.SpriteMaterial({ map: glowTex(), color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
export const fxMat = (c, op = 0.85) => once(`fx${c}|${op}`, () => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
export const neon = (c, k = 2.2) => plastic(c, { emissive: c, emissiveIntensity: k });
export function addGlow(parent, color, size, x = 0, y = 0, z = 0, op = 0.9) {
  const s = new THREE.Sprite(spriteMat(color, op)); s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s;
}

// ---- signature effects (each returns a hidden group with an update(t, k) method) ---------------
// electric sparks: zigzag bolts that flicker around a centre
export function sparks(parent, x, y, z, R = 0.6, n = 6, color = 0xfff04a) {
  const g = fxg(parent, x, y, z);
  const bolts = [];
  for (let i = 0; i < n; i++) {
    const b = new BrickBuilder(1), L = shape(b);
    let px = 0, py = 0;
    for (let s2 = 0; s2 < 4; s2++) {
      const nx = px + (s2 % 2 ? -0.07 : 0.07), ny = py + 0.11;
      L.rod([px, py, 0], [nx, ny, 0], 0.018, 0, { mat: fxMat(s2 % 2 ? color : 0xffffff, 0.95), seg: 4 });
      px = nx; py = ny;
    }
    const m = b.build({ name: 'spark', shadows: false });
    const a = (i / n) * PI * 2;
    const h = pv(g, CO(a) * R, S(a * 1.7) * R * 0.4, S(a) * R * 0.6, m);
    h.rotation.set(0, a, S(a) * 1.2 + PI / 2 * (i % 2));
    bolts.push(h);
  }
  const glow = addGlow(g, color, R * 2.6, 0, 0, 0, 0.55);
  g.update = (t, k = 1) => {
    for (const h of bolts) { const on = Math.random() < 0.55; h.visible = on; if (on) { h.rotation.y += 1.9; h.scale.setScalar((0.7 + Math.random() * 0.8) * k); } }
    glow.scale.setScalar(R * 2.6 * k * (0.75 + Math.random() * 0.4));
  };
  return g;
}
// a flame (tail tip / mouth): emissive cones and a glow sprite that flicker; points along +Y
export function flame(parent, x, y, z, size = 0.3, hidden = false) {
  const g = pv(parent, x, y, z); g.visible = !hidden;
  const b = new BrickBuilder(1), L = shape(b);
  L.cone(0, size * 0.55, 0, size * 0.45, size * 1.3, 0xff6a10, { mat: neon(0xff5a10, 2.6) });
  L.cone(0, size * 0.75, 0, size * 0.28, size * 1.0, 0xffd040, { mat: neon(0xffc030, 3) });
  L.ell(0, size * 0.1, 0, size * 0.45, size * 0.4, size * 0.45, 0xff8a20, { mat: neon(0xff7a10, 2.4) });
  const inner = pv(g, 0, 0, 0, b.build({ name: 'flame', shadows: false }));
  const glow = addGlow(g, 0xff9a30, size * 2.4, 0, size * 0.5, 0, 0.45);
  g.update = (t, k = 1) => {
    inner.scale.set(k * (1 + S(t * 31) * 0.1), k * (1 + S(t * 23) * 0.18 + S(t * 37) * 0.08), k * (1 + S(t * 29) * 0.1));
    inner.rotation.z = S(t * 17) * 0.12;
    glow.scale.setScalar(size * 2.4 * k * (0.9 + S(t * 41) * 0.12));
  };
  return g;
}
// a jet (fire breath, water gun): a stack of puffs along +Z that stream and swell
export function jet(parent, x, y, z, cols, len = 2.4, r = 0.18) {
  const g = fxg(parent, x, y, z);
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(spriteMat(cols[i % cols.length], 0.42));
    g.add(s); puffs.push(s);
  }
  const core = new THREE.Mesh(G.cone(10), fxMat(cols[0], 0.4));
  core.rotation.x = PI / 2; g.add(core);
  g.update = (t, k = 1) => {
    puffs.forEach((s, i) => {
      const u = ((t * 2.6 + i / puffs.length) % 1);
      s.position.set(S(t * 13 + i) * 0.06 * u * len, S(t * 11 + i * 2) * 0.05 * u * len, u * len * k);
      s.scale.setScalar((r * 1.6 + u * r * 5.5) * k);
    });
    core.scale.set(r * 1.3 * k, len * 0.75 * k, r * 1.3 * k);
    core.position.z = len * 0.37 * k;
  };
  return g;
}
// music notes rising (Jigglypuff's song)
export function notes(parent, x, y, z, cols = [0xff6ab0, 0x5ab0ff, 0xffd040]) {
  const g = fxg(parent, x, y, z);
  const list = [];
  for (let i = 0; i < 4; i++) {
    const b = new BrickBuilder(1), L = shape(b), m = neon(cols[i % cols.length], 1.4);
    L.ell(0, 0, 0, 0.11, 0.085, 0.05, 0, { mat: m, rz: 0.4 });
    L.box(0.09, 0.2, 0, 0.035, 0.42, 0.035, 0, { mat: m });
    if (i % 2) { L.ell(0.3, 0.06, 0, 0.11, 0.085, 0.05, 0, { mat: m, rz: 0.4 }); L.box(0.39, 0.26, 0, 0.035, 0.42, 0.035, 0, { mat: m }); L.box(0.24, 0.43, 0, 0.32, 0.06, 0.035, 0, { mat: m, rz: 0.2 }); }
    else L.box(0.15, 0.36, 0, 0.12, 0.05, 0.035, 0, { mat: m, rz: -0.6 });
    list.push(pv(g, 0, 0, 0, b.build({ name: 'note', shadows: false })));
  }
  g.update = (t) => {
    list.forEach((n, i) => {
      const u = (t * 0.55 + i / list.length) % 1, a = i * 1.7 + t * 0.8;
      n.position.set(S(a) * (0.5 + u * 0.6), u * 1.8, CO(a) * (0.3 + u * 0.4));
      n.rotation.set(0, -a * 0.3, S(t * 5 + i) * 0.3);
      n.scale.setScalar(0.6 + S(u * PI) * 0.7);
    });
  };
  return g;
}
// "Zzz" letters drifting up (Snorlax)
export function zzz(parent, x, y, z, col = 0xdff0ff) {
  const g = fxg(parent, x, y, z);
  const list = [];
  for (let i = 0; i < 3; i++) {
    const b = new BrickBuilder(1), L = shape(b), m = neon(col, 1.2);
    L.box(0, 0.16, 0, 0.32, 0.07, 0.06, 0, { mat: m });
    L.box(0, -0.16, 0, 0.32, 0.07, 0.06, 0, { mat: m });
    L.box(0, 0, 0, 0.42, 0.07, 0.06, 0, { mat: m, rz: 0.86 });
    list.push(pv(g, 0, 0, 0, b.build({ name: 'zzz', shadows: false })));
  }
  g.update = (t) => {
    list.forEach((n, i) => {
      const u = (t * 0.45 + i / list.length) % 1;
      n.position.set(u * 0.9 + S(t * 2 + i) * 0.1, u * 1.6, -u * 0.2);
      n.rotation.z = S(t * 3 + i) * 0.25;
      n.scale.setScalar(0.5 + u * 0.9);
    });
  };
  return g;
}
// a glowing energy sphere (Aura Sphere, Shadow Ball)
export function orb(parent, x, y, z, color, r = 0.3, core = 0xffffff) {
  const g = fxg(parent, x, y, z);
  const b = new BrickBuilder(1), L = shape(b);
  L.ell(0, 0, 0, r * 0.55, r * 0.55, r * 0.55, 0, { mat: fxMat(core, 0.95) });
  L.ell(0, 0, 0, r, r, r, 0, { mat: fxMat(color, 0.55) });
  const ball = pv(g, 0, 0, 0, b.build({ name: 'orb', shadows: false }));
  const glow = addGlow(g, color, r * 4.2, 0, 0, 0, 0.55);
  const sp = sparks(g, 0, 0, 0, r * 1.2, 4, color); sp.visible = true;
  g.update = (t, k = 1) => {
    ball.scale.setScalar(k * (1 + S(t * 19) * 0.08));
    ball.rotation.set(t * 3, t * 4, 0);
    glow.scale.setScalar(r * 4.2 * k * (0.9 + S(t * 27) * 0.1));
    sp.update(t, k * 0.8);
  };
  return g;
}
