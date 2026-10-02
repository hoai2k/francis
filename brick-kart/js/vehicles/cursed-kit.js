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
