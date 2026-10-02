// Small geometry helpers for the Star Wars vehicle pack (starwars.js). Everything here
// runs at build time only: shapes are added to a BrickBuilder with an optional parent
// matrix, so whole assemblies (wings, engines, legs) can be posed by one transform.
import * as THREE from 'three';
import { BrickBuilder, C, plastic } from '../lego.js';

export { THREE, BrickBuilder, C, plastic };

const geos = new Map();
const cached = (key, make) => { let g = geos.get(key); if (!g) { g = make(); geos.set(key, g); } return g; };
const E = new THREE.Euler(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

// a transform: position, euler rotation (XYZ) and scale
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
}
const under = (base, m) => (base ? base.clone().multiply(m) : m);
const material = (color, o = {}) => o.mat || plastic(color, o.matOpts);

// unit shapes, centred on the origin
const unitBox = () => cached('box', () => new THREE.BoxGeometry(1, 1, 1));
const unitCyl = (seg) => cached('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg));
const unitCone = (seg) => cached('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg));
const unitSph = (w, h) => cached('sph' + w + ',' + h, () => new THREE.SphereGeometry(1, w, h));
// an open-ended tube (no caps) and its inside-out twin for hollow tubs
const unitTube = (seg) => cached('tube' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg, 1, true));
export function flipped(g) {
  const f = g.clone();
  const idx = f.index.array.slice();
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  f.setIndex(Array.from(idx));
  const n = f.attributes.normal.array;
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return f;
}
const unitTubeIn = (seg) => cached('tubein' + seg, () => flipped(unitTube(seg).clone()));

// centred box (o.rx/ry/rz rotate it)
export function box(b, base, x, y, z, sx, sy, sz, color, o = {}) {
  b.addMatrix(unitBox(), material(color, o), under(base, mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, sx, sy, sz)));
}
const AX = { x: [0, 0, -Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };
// centred cylinder of radius r (ry = second radius) and length len along an axis
export function cyl(b, base, x, y, z, r, len, color, axis = 'z', o = {}) {
  const a = AX[axis];
  const m = mat(x, y, z, a[0], a[1], a[2]).multiply(mat(0, 0, 0, 0, o.spin || 0, 0, r, len, o.r2 ?? r));
  b.addMatrix(o.tube ? (o.inside ? unitTubeIn(o.seg || 16) : unitTube(o.seg || 16)) : unitCyl(o.seg || 14), material(color, o), under(base, m));
}
// cone along an axis: base at (x, y, z), tip `len` along +axis (negative len points back)
export function cone(b, base, x, y, z, r, len, color, axis = 'z', o = {}) {
  const a = AX[axis];
  const m = mat(x, y, z, a[0], a[1], a[2]).multiply(mat(0, len / 2, 0, 0, 0, 0, r, len, o.r2 ?? r));
  b.addMatrix(unitCone(o.seg || 12), material(color, o), under(base, m));
}
// frustum along z from z0 (w0 x h0) to z1 (w1 x h1): a tapered square nose or engine
export function frustum(b, base, x, y, z0, z1, w0, h0, w1, h1, color, o = {}) {
  const k = w1 / w0, kh = h1 / h0;
  const key = 'fr' + k.toFixed(3) + ',' + kh.toFixed(3) + ',' + (o.drop || 0);
  const g = cached(key, () => {
    const gg = new THREE.BoxGeometry(1, 1, 1);
    const p = gg.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0) { p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * kh + (o.drop || 0)); }
    gg.computeVertexNormals();
    return gg;
  });
  b.addMatrix(g, material(color, o), under(base, mat(x, y, (z0 + z1) / 2, 0, 0, 0, w0, h0, z1 - z0)));
}
export function sphere(b, base, x, y, z, r, color, o = {}) {
  b.addMatrix(unitSph(o.w || 14, o.h || 9), material(color, o), under(base, mat(x, y, z, 0, 0, 0, r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1))));
}
// any custom geometry
export function geo(b, base, g, color, m, o = {}) { b.addMatrix(g, material(color, o), under(base, m)); }
// a rod between two points
export function rod(b, base, a, c, r, color, o = {}) {
  const A = new THREE.Vector3(...a), D = new THREE.Vector3(...c).sub(A);
  const len = D.length();
  const m = new THREE.Matrix4().compose(A.clone().addScaledVector(D, 0.5), new THREE.Quaternion().setFromUnitVectors(UP, D.normalize()), new THREE.Vector3(r, len, r));
  b.addMatrix(unitCyl(o.seg || 8), material(color, o), under(base, m));
}
// a few low-poly studs on a top surface (LEGO look without the triangle cost)
export function studs(b, base, x, y, z, nx, nz, color, pitch = 0.4, o = {}) {
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    cyl(b, base, x + (i - (nx - 1) / 2) * pitch, y + 0.035, z + (j - (nz - 1) / 2) * pitch, pitch * 0.3, 0.07, color, 'y', { seg: 8, ...o });
  }
}

// The driver's size (kit.rig, seat frame, hips at the origin) boiled down to the few numbers
// the cockpits need. A typical figure is ~2.0 tall and 1.3 wide; huge ones reach 2.9 x 2.0.
//   H     height to the top of the head      W     overall width (arms included)
//   hip   half-width of the hips and thighs  sx/sy shoulder half-width / height
//   big   0..1 how much taller than typical  wide  0..1 how much wider than typical
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function fitOf(rig) {
  const H = clamp(rig?.height ?? 1.8, 1.1, 3.0), W = clamp(rig?.width ?? 1.2, 0.8, 2.1);
  const sx = clamp(Math.abs(rig?.shoulder?.x ?? 0.56), 0.2, 1.0), sy = clamp(rig?.shoulder?.y ?? 1.2, 0.6, 1.6);
  return { H, W, sx, sy, hip: clamp(W * 0.46, 0.35, 0.95), big: clamp((H - 2.05) / 0.85, 0, 1), wide: clamp((W - 1.3) / 0.65, 0, 1), clamp };
}

// A per-vehicle glowing material (own instance, so fx can pulse it without touching
// other karts).
export function glow(color, intensity = 1.2, o = {}) {
  return new THREE.MeshStandardMaterial({ color: o.base ?? color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, transparent: !!o.trans, opacity: o.opacity ?? 1, depthWrite: !o.trans });
}

// Builds the same assembly twice (k = 0 and k = 1) and returns ONE group whose meshes
// morph between the two poses: mesh.morphTargetInfluences[0] = k. Cheap animated
// folding parts (S-foils) without extra meshes or per-frame geometry work.
export function morphPair(pitch, fn, name = 'morph') {
  const b0 = new BrickBuilder(pitch); fn(b0, 0);
  const b1 = new BrickBuilder(pitch); fn(b1, 1);
  const g0 = b0.build({ name }), g1 = b1.build({ name: name + '1' });
  const meshes = [];
  g0.children.forEach((m, i) => {
    const o = g1.children[i];
    if (!o || o.material !== m.material || o.geometry.attributes.position.count !== m.geometry.attributes.position.count) throw new Error('morphPair: poses differ');
    m.geometry.morphAttributes.position = [o.geometry.attributes.position];
    m.geometry.morphAttributes.normal = [o.geometry.attributes.normal];
    m.updateMorphTargets();
    m.geometry.computeBoundingSphere();
    m.geometry.boundingSphere.radius += 0.6;
    meshes.push(m);
  });
  return { group: g0, meshes };
}

