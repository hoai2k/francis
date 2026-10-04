// Small building helpers for the Sonic Rides vehicle pack (js/vehicles/sonic.js).
// Everything here runs at build time except pitchAbout/rollAbout/ease (cheap, allocation-free).
import * as THREE from 'three';
import { BrickBuilder, C, plastic } from '../lego.js';

export { THREE, BrickBuilder, C, plastic };
export const PI = Math.PI, S = Math.sin, CO = Math.cos;
const e = new THREE.Euler(), q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
const mat = (color, o) => o?.mat || plastic(color, o?.matOpts || {});
export const CHROME = { matOpts: { metal: 0.85, rough: 0.22 } };
export const GLASS = { matOpts: { trans: true, opacity: 0.4 } };
export const LIT = (c, i = 1) => ({ matOpts: { emissive: c, emissiveIntensity: i } });
export const BACK = -PI / 2;   // boost flames pointing straight back
// transform matrix: position, euler rotation, scale
export const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
// unit shapes
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 16, 10),
  cylX: new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(PI / 2),
  cylZ: new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(PI / 2),
  cylY: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 12),
  rod: new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0),
  ring: new THREE.TorusGeometry(1, 0.22, 8, 22),                // a gold ring, XY plane
  bowl: new THREE.SphereGeometry(1, 22, 10, 0, PI * 2, PI / 2, PI / 2),   // lower hemisphere (open top)
};
// centred box with a rotation
export function rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, o) { b.addMatrix(G.box, mat(color, o), M(x, y, z, rx, ry, rz, sx, sy, sz)); }
// any geometry with a transform
export function geo(b, g, color, m, o) { b.addMatrix(g, mat(color, o), m); }
// ellipsoid (radii rx, ry, rz) with an optional x tilt
export function ell(b, x, y, z, rx, ry, rz, color, o, tilt = 0) { b.addMatrix(G.sphere, mat(color, o), M(x, y, z, tilt, 0, 0, rx, ry, rz)); }
// rod between two points
export function rod(b, a, c, r, color, o) {
  const A = new THREE.Vector3(...a), D = new THREE.Vector3(...c).sub(A), len = D.length();
  b.addMatrix(G.rod, mat(color, o), new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(UP, D.normalize()), new THREE.Vector3(r, len, r)));
}
// a gold ring standing in the XY plane (or turned by ry)
export function ring(b, x, y, z, r, ry = 0, o, rx = 0) { b.addMatrix(G.ring, o?.mat || gold(), M(x, y, z, rx, ry, 0, r, r, r)); }
let goldM = null;
export const gold = () => (goldM ||= plastic(0xffc21a, { emissive: 0xb07800, emissiveIntensity: 0.7, metal: 0.55, rough: 0.25 }));
// a per-vehicle glowing material (own instance so fx can pulse it)
export function glow(color, intensity = 1.2, o = {}) {
  return new THREE.MeshStandardMaterial({ color: o.base ?? color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, transparent: !!o.trans, opacity: o.opacity ?? 1, depthWrite: !o.trans });
}
// additive flame / jet material (own instance)
export const jetMat = (c, op = 0.8) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

// The driver's size (kit.rig, seat frame, hips at the origin) boiled down to the numbers the
// rides need. A typical figure is ~2.0 tall and 1.3 wide; huge ones reach 2.9 x 2.0.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function fitOf(rig) {
  const H = clamp(rig?.height ?? 1.8, 1.1, 3.0), W = clamp(rig?.width ?? 1.2, 0.8, 2.1);
  const sx = clamp(Math.abs(rig?.shoulder?.x ?? 0.56), 0.2, 1.0), sy = clamp(rig?.shoulder?.y ?? 1.2, 0.6, 1.6);
  return { H, W, sx, sy, hip: clamp(W * 0.46, 0.35, 0.95), big: clamp((H - 2.05) / 0.85, 0, 1), wide: clamp((W - 1.3) / 0.65, 0, 1) };
}
export function grow(objs, sx, sy, sz) {
  const g = new THREE.Group();
  for (const o of objs) g.add(o);
  g.scale.set(sx, sy, sz);
  return g;
}
// pitch a sprung group about a pivot (y, z) in the kart frame, keeping that point fixed
export function pitchAbout(g, p, py, pz, lift = 0) {
  const c = Math.cos(p), s = Math.sin(p);
  g.rotation.x = p;
  g.position.y = py - (py * c - pz * s) + lift;
  g.position.z = pz - (py * s + pz * c);
}
export const ease = (dt, k) => Math.min(1, dt * k);
// the shared glider wing (added to the sprung group by buildVehicle after build): rides that
// fly on their own wings hide it each frame while gliding
export const findGlider = (sprung) => sprung.children.find((o) => o.name === 'glider');
