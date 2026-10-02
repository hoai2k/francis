// Small building helpers for the Cursed & Fantasy vehicle pack (js/vehicles/cursed.js).
// Everything is built once at kart creation; nothing here runs per frame.
export function tools({ THREE, plastic }) {
  const e = new THREE.Euler(), q = new THREE.Quaternion();
  // transform matrix: position, euler rotation, scale
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const mat = (color, opts) => plastic(color, opts?.matOpts || opts || {});
  return {
    M,
    // centred box with a rotation
    rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts) { b.boxM(M(x, y, z, rx, ry, rz, sx, sy, sz), color, opts); },
    // any geometry with a transform
    geo(b, g, color, m, opts) { b.addMatrix(g, mat(color, opts), m); },
    // rod between two points (radius r, n sides)
    rod(b, a, c, r, color, opts, n = 8) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...c);
      const d = B.clone().sub(A), len = d.length();
      const g = new THREE.CylinderGeometry(r, r, 1, n).translate(0, 0.5, 0);
      const m = new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, len, 1));
      b.addMatrix(g, mat(color, opts), m);
    },
    sphere: new THREE.SphereGeometry(1, 14, 9),
    lowSphere: new THREE.SphereGeometry(1, 10, 7),
    cylX: new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2),   // unit cylinder along x
    cylX8: new THREE.CylinderGeometry(1, 1, 1, 8).rotateZ(Math.PI / 2),
    cone: new THREE.ConeGeometry(1, 1, 10),
  };
}

// The driver's size (kit.rig, seat frame, hips at the origin) boiled down to the numbers the
// rides need. A typical figure is ~2.0 tall and 1.3 wide; huge ones reach 2.9 x 2.0.
//   H height (top of head), W overall width, hip = hip/thigh half-width,
//   sx/sy = shoulder half-width / height, big/wide = 0..1 beyond a typical figure
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function fitOf(rig) {
  const H = clamp(rig?.height ?? 1.8, 1.1, 3.0), W = clamp(rig?.width ?? 1.2, 0.8, 2.1);
  const sx = clamp(Math.abs(rig?.shoulder?.x ?? 0.56), 0.2, 1.0), sy = clamp(rig?.shoulder?.y ?? 1.2, 0.6, 1.6);
  return { H, W, sx, sy, hip: clamp(0.12 + W * 0.26, 0.3, 0.7), big: clamp((H - 2.05) / 0.85, 0, 1), wide: clamp((W - 1.3) / 0.65, 0, 1) };
}

// Wraps a ride's body and moving parts in one group scaled about the ground origin, for
// rides that grow a little under big riders. Returns the group (use it as the mesh).
export function grow(THREE, objs, sx, sy, sz) {
  const g = new THREE.Group();
  for (const o of objs) g.add(o);
  g.scale.set(sx, sy, sz);
  return g;
}
