// Helpers for the Sonic the Hedgehog drivers (see ./sonic.js and ../driver.js for the rig
// contract): toon() builds a seated brick "Mobian" — a minifig body with a big round head,
// sculpted eyes, muzzle, ears and quills, white gloves and chunky shoes — and the shared
// effect parts (gold rings, Chaos Emeralds, glow sprites, spark bursts, hearts, fire).
import { THREE, BrickBuilder, C, plastic, seatedFig, rod, mat4, cached } from './kit.js';

export { THREE, BrickBuilder, C, plastic, rod, mat4, cached };
export const S = Math.sin, CO = Math.cos, PI = Math.PI, abs = Math.abs, UP = -2.75;
export const LOOP = (PI * 2) / 1.6;   // one cycle of the looped win pose
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (f, a, b) => clamp01((f - a) / (b - a));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const bump = (f, a, b) => S(PI * seg(f, a, b));
export const vis = (o, on) => { if (o.visible !== on) o.visible = on; };
export const GLOVE = 0xf6f6f2, PEACH = 0xf2c49a, SHOE = 0xd8202a;
export const EMERALDS = [0x2fd84a, 0x2a6aff, 0xff2a2a, 0xffe02a, 0x30e8ff, 0xc0c0d8, 0xc040ff];

// ---- materials / glow --------------------------------------------------------------------
const mats = new Map();
const once = (k, make) => { let m = mats.get(k); if (!m) { m = make(); mats.set(k, m); } return m; };
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
export const spriteMat = (c, op = 0.9) => once(`spr${c}|${op}`, () => new THREE.SpriteMaterial({ map: glowTex(), color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
export const fxMat = (c, op = 0.85) => once(`fx${c}|${op}`, () => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
export const neon = (c, k = 2) => plastic(c, { emissive: c, emissiveIntensity: k });
export const metal = (c, k = 0.6) => plastic(c, { metal: k, rough: 0.28 });
export function addGlow(parent, color, size, x = 0, y = 0, z = 0, op = 0.9) {
  const s = new THREE.Sprite(spriteMat(color, op)); s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s;
}
export function fxg(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.visible = false; parent.add(g); return g; }
const col = (c) => (typeof c === 'number' ? plastic(c) : c);

// ---- shapes ------------------------------------------------------------------------------
const sphG = () => cached('snSph', () => new THREE.SphereGeometry(1, 18, 12));
const coneG = () => cached('snCone', () => new THREE.ConeGeometry(1, 1, 10).translate(0, 0.5, 0));
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1), _y = new THREE.Vector3(0, 1, 0);
// ellipsoid with radii (rx, ry, rz); n (a direction) turns its local +Z to face along it
export function blob(b, x, y, z, rx, ry, rz, c, n = null, roll = 0) {
  const q = new THREE.Quaternion();
  if (n) q.setFromUnitVectors(_z, _a.set(n[0], n[1], n[2]).normalize());
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(_z, roll));
  b.addMatrix(sphG(), col(c), new THREE.Matrix4().compose(_b.set(x, y, z), q, new THREE.Vector3(rx, ry, rz)));
}
// a cone from base point a to tip point c (a quill, a spike, an ear)
export function spike(b, a, c, r, cl) {
  const A = _a.set(a[0], a[1], a[2]), dir = _b.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]), len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_y, dir.normalize());
  b.addMatrix(coneG(), col(cl), new THREE.Matrix4().compose(A.clone(), q, new THREE.Vector3(r, len, r * 0.8)));
}
// a gold ring (a Sonic ring), torus in the XY plane
export const ringGeo = () => cached('snRing', () => new THREE.TorusGeometry(0.2, 0.05, 6, 18));
export const goldMat = () => once('gold', () => plastic(0xffc21a, { emissive: 0xb07800, emissiveIntensity: 0.9, metal: 0.55, rough: 0.25 }));
export function ring(parent, size = 1) { const m = new THREE.Mesh(ringGeo(), goldMat()); m.scale.setScalar(size); parent.add(m); return m; }
// a Chaos Emerald: a faceted, glowing cut gem
export const gemGeo = () => cached('snGem', () => { const g = new THREE.CylinderGeometry(0.5, 0.75, 0.42, 6, 1).translate(0, 0.21, 0); const t = new THREE.ConeGeometry(0.75, 0.75, 6).rotateX(PI).translate(0, -0.375, 0); return mergeTwo(g, t); });
function mergeTwo(a, b) {
  const pa = a.toNonIndexed().attributes.position.array, pb = b.toNonIndexed().attributes.position.array;
  const arr = new Float32Array(pa.length + pb.length); arr.set(pa); arr.set(pb, pa.length);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); g.computeVertexNormals();
  return g;
}
export const gemMat = (c) => once('gem' + c, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.15, flatShading: true }));
export function emerald(parent, c, size = 0.3) { const m = new THREE.Mesh(gemGeo(), gemMat(c)); m.scale.setScalar(size); parent.add(m); return m; }
// a flat heart (Amy / Rouge), in the XY plane
export const heartGeo = () => cached('snHeart', () => {
  const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.15, -0.3, -0.55, -0.1, -0.5, 0.18); s.bezierCurveTo(-0.45, 0.48, -0.08, 0.5, 0, 0.25);
  s.bezierCurveTo(0.08, 0.5, 0.45, 0.48, 0.5, 0.18); s.bezierCurveTo(0.55, -0.1, 0.15, -0.3, 0, -0.5);
  return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.06);
});
// radial burst of glowing streaks + a glow (spin/scale it in fx)
export function burst(parent, color, n = 10, len = 0.5, seed = 5, col2 = 0xffffff) {
  const g = fxg(parent);
  const b = new BrickBuilder(1);
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const u = rnd() * 2 - 1, a = rnd() * PI * 2, q = Math.sqrt(1 - u * u), l = len * (0.6 + rnd() * 0.5);
    const dx = q * CO(a), dz = q * S(a);
    rod(b, [dx * l * 0.35, u * l * 0.35, dz * l * 0.35], [dx * l, u * l, dz * l], 0.02, fxMat(k % 3 ? color : col2, 0.95), 4);
  }
  g.add(b.build({ name: 'sn-burst', shadows: false }));
  addGlow(g, color, len * 2.4, 0, 0, 0, 0.75);
  return g;
}
// a flickering flame (cones), base at the origin pointing +Y
export function flame(parent, size = 1, c1 = 0xff6a10, c2 = 0xffd040) {
  const g = fxg(parent), b = new BrickBuilder(1);
  b.cone(0, 0, 0, 0.16, 0.5, 0, { mat: fxMat(c1, 0.9) });
  b.cone(0, 0, 0, 0.09, 0.34, 0, { mat: fxMat(c2, 0.95) });
  for (const sd of [-1, 1]) b.cone(sd * 0.08, 0, 0, 0.07, 0.28, 0, { mat: fxMat(c1, 0.8) });
  g.add(b.build({ name: 'sn-flame', shadows: false })); addGlow(g, c1, 0.8, 0, 0.15, 0, 0.7);
  g.scale.setScalar(size);
  return g;
}
// orbiting set of children (rings, emeralds, debris): call spin(t, r, y) each frame
export function orbit(parent, items, y = 1.5) {
  const g = fxg(parent, 0, y, 0);
  for (const m of items) g.add(m);
  return {
    g, items,
    set(on, t, R = 1.6, speed = 2.4, wob = 0.15) {
      vis(g, on); if (!on) return;
      const n = items.length;
      items.forEach((m, k) => { const a = t * speed + (k / n) * PI * 2; m.position.set(S(a) * R, S(a * 2 + k) * wob, CO(a) * R); m.rotation.y = a + t * 3; });
    },
  };
}

// ---- the toon figure ---------------------------------------------------------------------------
// toon(o): a seated Mobian. o: { name, s, R (head radius × s), body, skin (muzzle), arms, legs,
//   belly, hands, shoes, strap, cuff, wide, deep, iris, eyes: { dx, y, w, h, joined, lash, pupil },
//   muzzle: false | { y, w, h, d }, nose, mouth: 'smirk'|'smile'|'grin'|'frown'|null, ears: { col, inner, len, a },
//   head(H, hb, d) extra head parts, torso(b, d), arm(ab, sd, d) }
// H (head helper): { R, cy, at(yaw, pitch, out) -> [x,y,z], n(yaw, pitch) -> normal, blob, spike,
//   quill(yaw, p0, p1, len, r, col, yaw1) }
export function toon(o) {
  const s = o.s ?? 1.15, R = (o.R ?? 0.44) * s;
  const rig = seatedFig({
    name: o.name, s, wide: o.wide ?? 0.82, deep: o.deep ?? 0.95, noStud: true, extraHeight: o.extraHeight ?? 0,
    torso: o.body, arms: o.arms ?? o.skin ?? PEACH, hands: o.hands ?? GLOVE, legs: o.legs ?? o.body, hips: o.hips ?? o.legs ?? o.body,
    skin: o.skin ?? PEACH, neck: o.neck ?? o.body,
    head: (hb, d) => { const H = headKit(hb, R, o); o.head?.(H, hb, d); d.headH = H.top; },
    torsoExtra: (b, d) => {
      const s2 = d.s;
      if (o.belly) blob(b, 0, d.chestY + 0.36 * s2, 0.16 * s2 * d.D, 0.24 * s2 * d.W, 0.3 * s2, 0.1 * s2, o.belly);
      // chunky shoes on the ends of the seated thighs
      for (const sd of [-1, 1]) {
        const x = sd * 0.22 * s2 * d.W;
        if (o.shoes !== null) {
          b.box(x, -0.26 * s2, 0.74 * s2, 0.36 * s2 * d.W, 0.32 * s2, 0.5 * s2, o.shoes ?? SHOE);
          if (o.strap !== null) b.box(x, -0.0 * s2, 0.74 * s2, 0.37 * s2 * d.W, 0.07 * s2, 0.18 * s2, o.strap ?? GLOVE);
          if (o.sole) b.box(x, -0.3 * s2, 0.74 * s2, 0.37 * s2 * d.W, 0.06 * s2, 0.52 * s2, o.sole);
        }
      }
      o.torso?.(b, d);
    },
    arm: (ab, sd, d) => {
      const s2 = d.s;
      ab.sphere(0, -0.6 * s2, 0, 0.135 * s2, o.hands ?? GLOVE);                                   // puffy glove
      if (o.cuff !== null) ab.cyl(0, -0.5 * s2, 0, 0.125 * s2, 0.07 * s2, o.cuff ?? o.hands ?? GLOVE, { seg: 10 });
      o.arm?.(ab, sd, d);
    },
  });
  rig.R = R;
  return rig;
}
function headKit(hb, R, o) {
  const cy = R * 0.9;
  const at = (yaw, pitch, out = 1) => [S(yaw) * CO(pitch) * R * out, cy + S(pitch) * R * out, CO(yaw) * CO(pitch) * R * out];
  const n = (yaw, pitch) => [S(yaw) * CO(pitch), S(pitch), CO(yaw) * CO(pitch)];
  const H = {
    R, cy, at, n, top: cy + R,
    blob: (p, rx, ry, rz, c, nn, roll) => blob(hb, p[0], p[1], p[2], rx, ry, rz, c, nn, roll),
    spike: (a, c, r, cl) => spike(hb, a, c, r, cl),
    // a quill rooted inside the head at (yaw, p0) and reaching out to (yaw1, p1) at len × R
    quill: (yaw, p0, p1, len, r, cl, yaw1 = yaw) => spike(hb, at(yaw, p0, 0.45), at(yaw1, p1, len), r * R, cl ?? o.body),
  };
  hb.add(sphG(), col(o.headMat ?? o.body), 0, cy, 0, 0, R, R * (o.headSy ?? 1), R * (o.headSz ?? 1));
  // muzzle + nose + mouth
  const mz = o.muzzle === false ? null : { y: -0.36, w: 0.56, h: 0.4, d: 0.52, ...(o.muzzle || {}) };
  if (mz) {
    blob(hb, 0, cy + mz.y * R, 0.58 * R, mz.w * R, mz.h * R, mz.d * R, o.skin ?? PEACH);
    if (o.nose !== null) blob(hb, 0, cy + (mz.y + 0.24) * R, (0.58 + mz.d - 0.04) * R, 0.13 * R, 0.1 * R, 0.1 * R, o.nose ?? 0x141414);
    const my = cy + (mz.y - 0.12) * R, mzz = 0.58 * R + mz.d * R * 0.86;
    const mc = 0x2a1010;
    if (o.mouth === 'smirk') blob(hb, 0.1 * R, my, mzz, 0.18 * R, 0.035 * R, 0.05 * R, mc, [0.25, -0.3, 1], -0.35);
    else if (o.mouth === 'smile') for (const sd of [-1, 1]) blob(hb, sd * 0.09 * R, my + 0.02 * R, mzz, 0.11 * R, 0.03 * R, 0.05 * R, mc, [sd * 0.25, -0.3, 1], sd * 0.4);
    else if (o.mouth === 'grin') blob(hb, 0, my, mzz - 0.03 * R, 0.17 * R, 0.08 * R, 0.07 * R, 0xf4f4f4, [0, -0.35, 1]);
    else if (o.mouth === 'frown') blob(hb, 0, my, mzz, 0.15 * R, 0.03 * R, 0.05 * R, mc, [0, -0.3, 1]);
  }
  // eyes: whites, irises looking a touch inward, pupils, highlights
  const E = { dx: 0.27, y: 0.2, w: 0.2, h: 0.3, ...(o.eyes || {}) };
  if (o.eyes !== false) for (const sd of [-1, 1]) {
    const yaw = sd * E.dx, p = E.y;
    if (E.white !== null) H.blob(at(yaw, p, 0.86), E.w * R, E.h * R, 0.22 * R, E.white ?? 0xffffff, n(yaw, p), sd * (E.tilt ?? 0));
    const iy = yaw - sd * 0.06, ip = p - 0.03;
    H.blob(at(iy, ip, 0.98), E.w * 0.5 * R, E.h * 0.6 * R, 0.12 * R, E.irisMat ?? (o.iris ?? 0x2bb34a), n(iy, ip));
    if (E.pupil !== null) H.blob(at(iy, ip, 1.035), E.w * 0.26 * R, E.h * 0.34 * R, 0.08 * R, E.pupil ?? 0x101010, n(iy, ip));
    if (E.shine !== false) H.blob(at(iy + sd * 0.04, ip + 0.08, 1.075), 0.04 * R, 0.05 * R, 0.03 * R, 0xffffff, n(iy, ip));
    if (E.lash) H.spike(at(yaw + sd * E.w * 0.6, p + 0.1, 1.0), at(yaw + sd * (E.w * 0.6 + 0.25), p + 0.22, 1.08), 0.05 * R, 0x141414);
    if (E.lid) H.blob(at(yaw, p + E.h * 0.62, 0.92), E.w * 1.1 * R, 0.07 * R, 0.24 * R, E.lid, n(yaw, p + E.h * 0.62), sd * (E.lidRoll ?? 0.32));
  }
  // ears
  if (o.ears) {
    const e = { len: 0.55, a: 0.62, p: 0.68, r: 0.2, ...o.ears };
    for (const sd of [-1, 1]) {
      const base = at(sd * e.a, e.p, 0.75), tip = at(sd * (e.a + 0.25), e.p + 0.55, 1 + e.len);
      H.spike(base, tip, e.r * R, e.col ?? o.body);
      if (e.inner) H.spike([base[0], base[1], base[2] + 0.05 * R], [tip[0] * 0.95, tip[1] - 0.12 * R, tip[2] + 0.06 * R], e.r * 0.55 * R, e.inner);
    }
  }
  return H;
}

// a pivot group (for props / animated parts) holding a freshly built brick part
export function part(parent, fn, name, x = 0, y = 0, z = 0) {
  const b = new BrickBuilder(1); fn(b);
  const g = new THREE.Group(); g.position.set(x, y, z); g.add(b.build({ name, shadows: false }));
  parent.add(g);
  return g;
}
// hand position along an arm pivot (scaled by the driver animator, so props stay in hand)
export const handY = (rig) => -0.62 * rig.dims.s;
