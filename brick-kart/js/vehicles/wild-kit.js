// Shape helpers shared by the Wild Rides vehicles (js/vehicles/wild.js).
// Everything adds into a BrickBuilder so each body still merges into a few meshes.
const geos = new Map();

export function shapes({ THREE, plastic }) {
  const cache = (k, f) => { let g = geos.get(k); if (!g) { g = f(); geos.set(k, g); } return g; };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const P = new THREE.Vector3(), S = new THREE.Vector3(), D = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const mat = (col, o) => o.mat || plastic(col, o.matOpts);
  const boxG = () => cache('box', () => new THREE.BoxGeometry(1, 1, 1));
  const cylG = (n) => cache('cyl' + n, () => new THREE.CylinderGeometry(1, 1, 1, n));
  const sphG = (n) => cache('sph' + n, () => new THREE.SphereGeometry(1, n, Math.max(6, Math.round(n * 0.6))));
  const coneG = (n) => cache('cone' + n, () => new THREE.ConeGeometry(1, 1, n));
  const put = (b, geo, x, y, z, rx, ry, rz, sx, sy, sz, col, o) => {
    M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
    b.addMatrix(geo, mat(col, o), M);
  };
  const sh = {
    // centred box, optional rotation o.rx / o.ry / o.rz
    box: (b, x, y, z, sx, sy, sz, col, o = {}) => put(b, boxG(), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, sx, sy, sz, col, o),
    // centred ellipsoid with radii rx, ry, rz
    ell: (b, x, y, z, rx, ry, rz, col, o = {}) => put(b, sphG(o.seg || 14), x, y, z, o.ax || 0, o.ay || 0, o.az || 0, rx, ry, rz, col, o),
    // centred cylinders along X / Z (o.r2 = second radius for oval sections)
    cylX: (b, x, y, z, r, len, col, o = {}) => put(b, cylG(o.seg || 14), x, y, z, 0, 0, Math.PI / 2, r, len, o.r2 ?? r, col, o),
    cylZ: (b, x, y, z, r, len, col, o = {}) => put(b, cylG(o.seg || 14), x, y, z, Math.PI / 2, 0, 0, r, len, o.r2 ?? r, col, o),
    // centred cone, apex towards +Y before the o.rx / o.rz rotation
    cone: (b, x, y, z, r, h, col, o = {}) => put(b, coneG(o.seg || 12), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, r, h, o.r2 ?? r, col, o),
    // cylinder between two points
    tube: (b, a, c, r, col, o = {}) => {
      D.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      const len = D.length();
      Q.setFromUnitVectors(Y, D.normalize());
      M.compose(P.set((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2), Q, S.set(r, len, r));
      b.addMatrix(cylG(o.seg || 8), mat(col, o), M);
    },
    // a fender arc of n boxes around an axle at (cy, cz) in the y/z plane, from angle th0 to th1
    // (0 = straight ahead, PI/2 = straight up). frame = extra X rotation for parts built in a tilted group.
    arc: (b, x, cy, cz, R, th0, th1, n, w, t, col, o = {}) => {
      const f = o.frame || 0, cf = Math.cos(f), sf = Math.sin(f);
      const seg = (R * Math.abs(th1 - th0) / n) * 1.12;
      for (let k = 0; k < n; k++) {
        const th = th0 + ((k + 0.5) * (th1 - th0)) / n;
        const dy = R * Math.sin(th), dz = R * Math.cos(th);
        const phi = Math.atan2(-Math.cos(th), -Math.sin(th));
        put(b, boxG(), x, cy + dy * cf - dz * sf, cz + dy * sf + dz * cf, phi + f, 0, 0, w, t, seg, col, o);
      }
    },
  };
  return sh;
}

// The driver's size (kit.rig, seat frame, hips at the origin) boiled down to the numbers the
// rides need. A typical figure is ~2.0 tall and 1.3 wide; huge ones reach 2.9 x 2.0.
//   H height (top of head), W overall width, hip = hip/thigh half-width,
//   sx/sy = shoulder half-width / height, big/wide = 0..1 beyond a typical figure
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function fitOf(rig) {
  const H = clamp(rig?.height ?? 1.8, 1.1, 3.0), W = clamp(rig?.width ?? 1.2, 0.8, 2.1);
  const sx = clamp(Math.abs(rig?.shoulder?.x ?? 0.56), 0.2, 1.0), sy = clamp(rig?.shoulder?.y ?? 1.2, 0.6, 1.6);
  return { H, W, sx, sy, hip: clamp(W * 0.46, 0.35, 0.95), big: clamp((H - 2.05) / 0.85, 0, 1), wide: clamp((W - 1.3) / 0.65, 0, 1) };
}

// Wraps a ride's body and moving parts in one group scaled about the ground origin (for rides
// that grow a little under big riders). Keep sy === sz when it holds round wheels.
export function grow(THREE, objs, sx, sy, sz) {
  const g = new THREE.Group();
  for (const o of objs) g.add(o);
  g.scale.set(sx, sy, sz);
  return g;
}

// keeps a sprung group's pitch centred on a pivot point (y, z) in the kart frame
export function pitchAbout(g, p, py, pz, lift = 0) {
  const c = Math.cos(p), s = Math.sin(p);
  g.rotation.x = p;
  g.position.y = py - (py * c - pz * s) + lift;
  g.position.z = pz - (py * s + pz * c);
}
