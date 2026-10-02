// Shape helpers for the rebuilt Original Karts (js/vehicles/originals.js).
// Everything adds into a BrickBuilder so a body still merges into a few meshes; nothing
// here allocates per frame. Geometries are cached per module.
const geos = new Map();

export function kit(K) {
  const { THREE, plastic } = K;
  const cache = (k, f) => { let g = geos.get(k); if (!g) { g = f(); geos.set(k, g); } return g; };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const P = new THREE.Vector3(), S = new THREE.Vector3(), D = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const mat = (col, o) => o.mat || plastic(col, o.m || o.matOpts);
  const boxG = () => cache('box', () => new THREE.BoxGeometry(1, 1, 1));
  const cylG = (n) => cache('cyl' + n, () => new THREE.CylinderGeometry(1, 1, 1, n));
  const sphG = (n) => cache('sph' + n, () => new THREE.SphereGeometry(1, n, Math.max(6, Math.round(n * 0.6))));
  const coneG = (n) => cache('cone' + n, () => new THREE.ConeGeometry(1, 1, n));
  const torG = (t, n, arc) => cache('tor' + t + '|' + n + '|' + arc, () => new THREE.TorusGeometry(1, t, 6, n, arc));
  const domeG = (n, f) => cache('dome' + n + '|' + f, () => new THREE.SphereGeometry(1, n, Math.round(n * 0.5), 0, Math.PI * 2, 0, Math.PI * f));
  const put = (b, geo, x, y, z, rx, ry, rz, sx, sy, sz, col, o) => {
    M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
    b.addMatrix(geo, mat(col, o), M);
  };
  const sh = {
    // centred box, rotation o.rx / o.ry / o.rz
    box: (b, x, y, z, sx, sy, sz, col, o = {}) => put(b, boxG(), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, sx, sy, sz, col, o),
    // ellipsoid with radii rx, ry, rz
    ell: (b, x, y, z, rx, ry, rz, col, o = {}) => put(b, sphG(o.seg || 14), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, rx, ry, rz, col, o),
    // dome (top part of a sphere, frac of PI), opening down; radii rx, ry, rz
    dome: (b, x, y, z, rx, ry, rz, col, o = {}) => put(b, domeG(o.seg || 18, o.frac ?? 0.5), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, rx, ry, rz, col, o),
    // centred cylinders along each axis (o.r2 = second radius for ovals)
    cylX: (b, x, y, z, r, len, col, o = {}) => put(b, cylG(o.seg || 14), x, y, z, o.rx || 0, 0, Math.PI / 2, r, len, o.r2 ?? r, col, o),
    cylY: (b, x, y, z, r, len, col, o = {}) => put(b, cylG(o.seg || 14), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, r, len, o.r2 ?? r, col, o),
    cylZ: (b, x, y, z, r, len, col, o = {}) => put(b, cylG(o.seg || 14), x, y, z, Math.PI / 2, 0, o.rz || 0, r, len, o.r2 ?? r, col, o),
    // centred cone, apex +Y before rotation
    cone: (b, x, y, z, r, h, col, o = {}) => put(b, coneG(o.seg || 10), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, r, h, o.r2 ?? r, col, o),
    // torus of radius R (tube t relative to R) lying in the XY plane before rotation
    tor: (b, x, y, z, R, t, col, o = {}) => put(b, torG(t, o.seg || 20, o.arc ?? Math.PI * 2), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx ?? R, o.sy ?? R, o.sz ?? R, col, o),
    // rod between two points
    tube: (b, a, c, r, col, o = {}) => {
      D.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      const len = D.length();
      Q.setFromUnitVectors(Y, D.normalize());
      M.compose(P.set((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2), Q, S.set(r, len, o.r2 ?? r));
      b.addMatrix(cylG(o.seg || 8), mat(col, o), M);
    },
    // arc of n boxes around (cy, cz) in the y/z plane, angle th0..th1 (0 = +z, PI/2 = up)
    arc: (b, x, cy, cz, R, th0, th1, n, w, t, col, o = {}) => {
      const seg = (R * Math.abs(th1 - th0) / n) * 1.12;
      for (let k = 0; k < n; k++) {
        const th = th0 + ((k + 0.5) * (th1 - th0)) / n;
        put(b, boxG(), x, cy + R * Math.sin(th), cz + R * Math.cos(th), Math.atan2(-Math.cos(th), -Math.sin(th)), 0, 0, w, t, seg, col, o);
      }
    },
    // arc in the x/y plane around (cx, cy) at depth z (0 = +x, PI/2 = up)
    arcXY: (b, cx, cy, z, R, th0, th1, n, d, t, col, o = {}) => {
      const seg = (R * Math.abs(th1 - th0) / n) * 1.12;
      for (let k = 0; k < n; k++) {
        const th = th0 + ((k + 0.5) * (th1 - th0)) / n;
        put(b, boxG(), cx + R * Math.cos(th), cy + R * Math.sin(th), z, 0, 0, th + Math.PI / 2, seg, t, d, col, o);
      }
    },
    // a group holding one BrickBuilder build, positioned at (x, y, z)
    part: (name, x, y, z, fill) => {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const pb = new K.BrickBuilder(0.4); fill(pb); g.add(pb.build({ name })); return g;
    },
  };
  // a material owned by this kart (safe to animate: plastic() materials are shared)
  sh.own = (color, o = {}) => new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.34, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1,
    transparent: !!o.trans, opacity: o.opacity ?? 1, depthWrite: !o.trans,
  });
  // a custom spoked wheel (axle along X) as a spinning group: rim, spokes, hub, optional tyre
  sh.spoked = (name, r, w, rimCol, spokeCol, hubCol, o = {}) => {
    const g = new THREE.Group();
    const sb = new K.BrickBuilder(0.4);
    const n = o.spokes || 8;
    for (const x of o.xs || [0]) {
      sh.tor(sb, x, 0, 0, r - 0.05, 0.1 / r * 0.9, rimCol, { ry: Math.PI / 2, seg: 22, m: o.rimM });
      if (o.tyre) sh.tor(sb, x, 0, 0, r - 0.02, 0.06 / r, o.tyre, { ry: Math.PI / 2, seg: 22 });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        sh.box(sb, x, Math.sin(a) * r * 0.48, Math.cos(a) * r * 0.48, w * 0.35, 0.07, r * 0.92, spokeCol, { rx: -a, m: o.spokeM });
      }
      sh.cylX(sb, x, 0, 0, r * 0.2, w, hubCol, { seg: 10, m: o.hubM });
    }
    const spin = new THREE.Group(); spin.add(sb.build({ name })); g.add(spin);
    return { g, spin };
  };
  return sh;
}

export const ease = (dt, k) => Math.min(1, dt * k);
// pitch a sprung group about a pivot (y, z) in the kart frame, keeping that point fixed
export function pitchAbout(g, p, py, pz, lift = 0) {
  const c = Math.cos(p), s = Math.sin(p);
  g.rotation.x = p;
  g.position.y = py - (py * c - pz * s) + lift;
  g.position.z = pz - (py * s + pz * c);
}
