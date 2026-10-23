// Small building helpers for the Wizarding Rides vehicle pack (js/vehicles/potter.js).
// Everything here runs at build time except pitchAbout/rollAbout (cheap, allocation-free).
import * as THREE from 'three';
import { BrickBuilder, C, plastic } from '../lego.js';
import { clamp, ease, fitOf, pitchAbout, grow } from './common.js';
export { clamp, ease, fitOf, pitchAbout, grow };

export { THREE, BrickBuilder, C, plastic };
const e = new THREE.Euler(), q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
const mat = (color, o) => o?.mat || plastic(color, o?.matOpts || {});
// transform matrix: position, euler rotation, scale
export const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
// unit shapes
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 14, 9),
  low: new THREE.SphereGeometry(1, 9, 6),
  cylX: new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2),
  cylX8: new THREE.CylinderGeometry(1, 1, 1, 8).rotateZ(Math.PI / 2),
  cylZ: new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2),
  cylY: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 10),
  rod: new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0),
};
// centred box with a rotation
export function rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, o) { b.addMatrix(G.box, mat(color, o), M(x, y, z, rx, ry, rz, sx, sy, sz)); }
// any geometry with a transform
export function geo(b, g, color, m, o) { b.addMatrix(g, mat(color, o), m); }
// ellipsoid (radii rx, ry, rz) with an optional x tilt
export function ell(b, x, y, z, rx, ry, rz, color, o, tilt = 0) { b.addMatrix(o?.low ? G.low : G.sphere, mat(color, o), M(x, y, z, tilt, 0, 0, rx, ry, rz)); }
// rod between two points
export function rod(b, a, c, r, color, o) {
  const A = new THREE.Vector3(...a), D = new THREE.Vector3(...c).sub(A), len = D.length();
  b.addMatrix(G.rod, mat(color, o), new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(UP, D.normalize()), new THREE.Vector3(r, len, r)));
}
// a per-vehicle glowing material (own instance so fx can pulse it)
export function glow(color, intensity = 1.2, o = {}) {
  return new THREE.MeshStandardMaterial({ color: o.base ?? color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, transparent: !!o.trans, opacity: o.opacity ?? 1, depthWrite: !o.trans });
}

// roll a group about a ground line at x = px (positive r lifts the +X side)
export function rollAbout(g, r, px) {
  g.rotation.z = r;
  g.position.x = px - px * Math.cos(r);
  g.position.y = -px * Math.sin(r);
}
