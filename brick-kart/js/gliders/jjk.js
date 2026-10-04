// Cursed gliders (see the contract at the top of js/gliders.js): Megumi's Nue carrying the driver
// by its talons, and the roof of Sukuna's Malevolent Shrine as a canopy.

// small transform helpers on top of the kit
function tools({ THREE, plastic }) {
  const V = THREE.Vector3, Q = new THREE.Quaternion(), E = new THREE.Euler(), UP = new V(0, 1, 0);
  const SPH = tools.sph ||= new THREE.SphereGeometry(1, 10, 7);
  const CONE = tools.cone ||= new THREE.ConeGeometry(1, 1, 8);
  const CYL = tools.cyl ||= new THREE.CylinderGeometry(1, 1, 1, 6);
  const BOX = tools.box ||= new THREE.BoxGeometry(1, 1, 1);
  const M = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new V(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), new V(sx, sy, sz));
  const mat = (col, o = {}) => o.mat || plastic(col, o.matOpts);
  const T = {
    M,
    R: (b, x, y, z, sx, sy, sz, rx, ry, rz, col, o) => b.boxM(M(x, y, z, rx, ry, rz, sx, sy, sz), col, o || {}),
    // a box placed in the local frame of another transform (roof sections etc.)
    RL: (b, frame, x, y, z, sx, sy, sz, rx, ry, rz, col, o = {}) => b.addMatrix(BOX, mat(col, o), frame.clone().multiply(M(x, y, z, rx, ry, rz, sx, sy, sz))),
    ell: (b, x, y, z, sx, sy, sz, rx, ry, rz, col, o = {}) => b.addMatrix(SPH, mat(col, o), M(x, y, z, rx, ry, rz, sx, sy, sz)),
    cone: (b, x, y, z, r, h, rz2, rx, ry, rz, col, o = {}) => b.addMatrix(CONE, mat(col, o), M(x, y, z, rx, ry, rz, r, h, rz2)),
    rod(b, p1, p2, r, col, o = {}) {
      const a = new V(...p1), c = new V(...p2), d = c.clone().sub(a), len = d.length();
      b.addMatrix(CYL, mat(col, o), new THREE.Matrix4().compose(a.add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), new V(r, len, r)));
    },
    // a jagged bolt through the given points
    zig(b, pts, r, col, o) { for (let i = 0; i < pts.length - 1; i++) T.rod(b, pts[i], pts[i + 1], r, col, o); },
  };
  return T;
}

const LIT = (c, i = 1.5) => ({ matOpts: { emissive: c, emissiveIntensity: i } });

// ---- Nue: the Ten Shadows thunderbird; Megumi-style, the driver hangs from its talons ------------
const nue = {
  id: 'nueglider', name: 'Nue', blurb: 'Ten Shadows: Nue!', colors: [0x24262b, 0x6fd0ff],
  build(kit) {
    const { THREE, BrickBuilder, C } = kit; const T = tools(kit);
    const N = 0x24262b, N2 = 0x3a3d45, SIL = 0xd0d4d8, MASK = 0xeceff1;
    const ZAP = LIT(0x5fc8ff, 1.8), ZCOL = 0x9fe6ff;
    const b = new BrickBuilder(0.4);
    // feathered body, belly, neck
    T.ell(b, 0, 1.95, 0.0, 0.46, 0.36, 0.95, 0.06, 0, 0, N);
    T.ell(b, 0, 1.82, 0.22, 0.36, 0.26, 0.62, 0.1, 0, 0, N2);
    T.ell(b, 0, 2.08, 0.8, 0.3, 0.3, 0.38, -0.35, 0, 0, N);
    // head: dark skull, white mask with yellow eyes, hooked beak, swept horn tufts
    T.ell(b, 0, 2.2, 1.08, 0.3, 0.28, 0.32, 0, 0, 0, N);
    T.R(b, 0, 2.22, 1.3, 0.4, 0.28, 0.12, -0.15, 0, 0, MASK);
    for (const sd of [-1, 1]) {
      T.R(b, sd * 0.1, 2.27, 1.37, 0.11, 0.06, 0.03, -0.15, 0, sd * -0.25, C.yellow);
      T.R(b, sd * 0.1, 2.27, 1.385, 0.04, 0.04, 0.02, -0.15, 0, 0, 0x111111);
      T.R(b, sd * 0.17, 2.45, 0.98, 0.07, 0.36, 0.1, -0.7, 0, sd * -0.35, N);
      T.R(b, sd * 0.23, 2.58, 0.88, 0.05, 0.16, 0.07, -0.85, 0, sd * -0.45, MASK);
    }
    T.cone(b, 0, 2.12, 1.46, 0.08, 0.26, 0.08, Math.PI / 2 + 0.55, 0, 0, C.yellow);
    // tail fan with silver tips
    for (let i = -2; i <= 2; i++) {
      T.R(b, i * 0.17, 1.9, -1.1, 0.16, 0.05, 0.75, 0.12, i * 0.16, 0, i % 2 ? N2 : N);
      T.R(b, i * 0.24, 1.94, -1.46, 0.16, 0.055, 0.2, 0.12, i * 0.16, 0, SIL);
    }
    // long legs down to a shadow bar the driver grabs; yellow talons clamp round it
    for (const sd of [-1, 1]) {
      T.rod(b, [sd * 0.2, 1.75, 0.1], [sd * 0.26, 0.9, 0.04], 0.07, N2);
      T.rod(b, [sd * 0.26, 0.9, 0.04], [sd * 0.24, 0.12, 0], 0.05, C.dkgray);
      for (const a of [-1, 0, 1]) T.R(b, sd * 0.24 + a * 0.06, 0.07, 0.1, 0.05, 0.05, 0.16, 0.6, a * 0.3, 0, C.yellow);
      T.R(b, sd * 0.24, 0.0, -0.1, 0.05, 0.05, 0.14, -0.6, 0, 0, C.yellow);
    }
    T.R(b, 0, 0.02, 0, 0.9, 0.09, 0.09, 0, 0, 0, 0x14151a);
    const parts = [], bolts = [];
    // lightning that crackles on and off: two patterns per site, at most one shown at a time
    const boltSite = (x, y, z, seed, segs, spread, drop) => {
      const pair = [];
      for (let p = 0; p < 2; p++) {
        let r = seed * 97 + p * 31 + 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647) - 0.5;
        const pts = [[0, 0, 0]];
        for (let i = 1; i <= segs; i++) pts.push([rnd() * spread, -drop * i / segs + rnd() * 0.1, -i * 0.22 + rnd() * 0.15]);
        const bb = new BrickBuilder(0.4);
        T.zig(bb, pts, 0.04, ZCOL, ZAP);
        // a short fork
        const k = 1 + (p + seed) % (segs - 1);
        T.zig(bb, [pts[k], [pts[k][0] + rnd() * 0.5, pts[k][1] - 0.2, pts[k][2] - 0.2]], 0.022, ZCOL, ZAP);
        const m = bb.build({ name: 'nueBolt', shadows: false });
        m.position.set(x, y, z); m.visible = false; pair.push(m);
      }
      bolts.push(pair);
      return pair;
    };
    // wings: flight-feather wings with glowing zig-zag lightning on both faces
    const wings = [];
    for (const sd of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sd * 0.38, 1.98, 0.15);
      const wb = new BrickBuilder(0.4);
      T.R(wb, sd * 0.65, 0, -0.1, 1.3, 0.1, 1.1, 0, 0, 0, N);
      T.R(wb, sd * 0.68, 0.03, 0.45, 1.36, 0.12, 0.12, 0, 0, 0, N2);
      T.R(wb, sd * 1.75, 0.01, -0.2, 0.95, 0.09, 0.9, 0, sd * 0.08, 0, N);
      T.R(wb, sd * 1.75, 0.04, 0.24, 0.95, 0.1, 0.11, 0, sd * 0.08, 0, N2);
      for (let i = 0; i < 5; i++) {
        const th = -0.15 + i * 0.26, len = 1.2 - i * 0.12, bx = 2.15, bz = 0.15 - i * 0.14;
        const dx = Math.cos(th), dz = -Math.sin(th);
        T.R(wb, sd * (bx + dx * len / 2), 0.01 - i * 0.004, bz + dz * len / 2, len, 0.07, 0.21, 0, sd * th, 0, i % 2 ? N2 : N);
        T.R(wb, sd * (bx + dx * (len - 0.1)), 0.02 - i * 0.004, bz + dz * (len - 0.1), 0.22, 0.075, 0.22, 0, sd * th, 0, SIL);
      }
      for (let i = 0; i < 4; i++) T.R(wb, sd * (0.25 + i * 0.4), -0.01, -0.82, 0.38, 0.07, 0.4, 0, sd * 0.05 * i, 0, i % 2 ? N : N2);
      // painted lightning (top and underside)
      const zz = [[0.1, 0.15], [0.55, -0.15], [1.0, 0.12], [1.5, -0.2], [1.95, 0.05], [2.4, -0.25], [2.9, -0.1]];
      for (const y of [0.06, -0.06]) for (let i = 0; i < zz.length - 1; i++) {
        const [x1, z1] = zz[i], [x2, z2] = zz[i + 1];
        T.R(wb, sd * (x1 + x2) / 2, y, (z1 + z2) / 2, Math.hypot(x2 - x1, z2 - z1) + 0.06, 0.03, 0.07, 0, sd * -Math.atan2(z2 - z1, x2 - x1), 0, ZCOL, ZAP);
      }
      w.add(wb.build({ name: 'nueWing' }));
      w.add(...boltSite(sd * 2.6, -0.02, -0.4, sd > 0 ? 3 : 5, 5, 0.35, 0.7));
      w.add(...boltSite(sd * 1.2, -0.04, -0.9, sd > 0 ? 8 : 11, 4, 0.3, 0.6));
      wings.push({ w, sd }); parts.push(w);
    }
    // crackle down the legs too
    for (const sd of [-1, 1]) {
      const pair = boltSite(sd * 0.32, 1.55, 0.1, sd > 0 ? 13 : 17, 5, 0.25, 1.0);
      for (const m of pair) { m.rotation.y = Math.PI / 2 * sd; parts.push(m); }
    }
    let ph = 0, next = 0, seq = 0;
    return {
      mesh: b.build({ name: 'nueglider' }), parts,
      fx(s, dt) {
        ph += dt * (2.6 + s.speed01 * 1.5);
        const a = 0.08 + Math.sin(ph) * 0.2;
        for (const x of wings) x.w.rotation.z = x.sd * (a - s.steer * x.sd * 0.08);
        if (s.t >= next || s.t < next - 1) {
          next = s.t + 0.06 + ((seq * 37) % 7) * 0.012;
          for (let i = 0; i < bolts.length; i++) {
            const h = (seq * 7 + i * 13) % 11;   // cheap pseudo-random pick: off / pattern A / pattern B
            bolts[i][0].visible = h < 4; bolts[i][1].visible = h > 6;
          }
          seq++;
        }
      },
    };
  },
};

// ---- Malevolent Shrine: Sukuna's Domain Expansion roof, upswept eaves lined with fangs, red
// pillars down to a crossbar, and cursed flames flickering on its horns ---------------------------
const shrine = {
  id: 'malevolentshrine', name: 'Malevolent Shrine', blurb: 'Domain Expansion overhead', colors: [0x2b2530, 0x9b1c1c],
  build(kit) {
    const { THREE, BrickBuilder, C } = kit; const T = tools(kit);
    const ROOF = 0x2b2530, TILE = 0x3d3542, RED = 0x9b1c1c, DRED = 0x5e0f12, BONE = 0xe8e0c8, GOLD = 0xdcbc81;
    const FLAME = LIT(0xe0201a, 1.2), MID = LIT(0xff4a10, 1.5), CORE = LIT(0xffc040, 1.7);
    const b = new BrickBuilder(0.4);
    // the grip: a red lacquer crossbar with black caps, two pillars and a tie beam
    T.R(b, 0, 0, 0, 1.2, 0.13, 0.13, 0, 0, 0, RED);
    for (const sd of [-1, 1]) {
      T.R(b, sd * 0.64, 0, 0, 0.1, 0.17, 0.17, 0, 0, 0, C.black);
      b.box(sd * 0.48, -0.06, 0, 0.13, 1.72, 0.13, RED);
      b.box(sd * 0.48, 1.6, 0, 0.2, 0.08, 0.5, C.black);   // bracket under the roof
    }
    T.R(b, 0, 1.25, 0, 1.15, 0.1, 0.1, 0, 0, 0, C.black);
    T.R(b, 0, 1.5, 0, 1.3, 0.12, 0.14, 0, 0, 0, RED);
    // roof: a centre section and two upswept wing sections, each with front and back slopes
    const RIDGE = 2.28, EAVE = 1.72, HALF = 1.35;
    const slopeAng = Math.atan2(RIDGE - EAVE, HALF), slopeLen = Math.hypot(RIDGE - EAVE, HALF) + 0.1;
    const FANG = new THREE.ConeGeometry(1, 1, 5);
    const sections = [[0, 0, 2.1]];
    for (const sd of [-1, 1]) sections.push([sd, sd * 0.28, 1.4]);
    for (const [sd, tilt, len] of sections) {
      for (const fz of [-1, 1]) {
        // frame: centre of this slope, x along the section, z down the slope
        // (the wing sections rotate about their inner end so they sweep upwards)
        const frame = new THREE.Matrix4().makeTranslation(sd * 1.05, (RIDGE + EAVE) / 2, 0)
          .multiply(new THREE.Matrix4().makeRotationZ(tilt)).multiply(T.M(sd * len / 2, 0, fz * HALF / 2, fz * slopeAng, 0, 0, 1, 1, 1));
        T.RL(b, frame, 0, 0, 0, len + (sd ? 0.08 : 0.02), 0.12, slopeLen, 0, 0, 0, ROOF);
        // tile ribs running down the slope
        const n = Math.round(len / 0.3);
        for (let i = 0; i <= n; i++) T.RL(b, frame, -len / 2 + 0.08 + i * (len - 0.16) / n, 0.09, 0, 0.09, 0.08, slopeLen, 0, 0, 0, TILE);
        // red eave beam and the rafters underneath
        T.RL(b, frame, 0, -0.04, fz * slopeLen / 2, len + 0.1, 0.16, 0.16, 0, 0, 0, RED);
        T.RL(b, frame, 0, 0.0, fz * (slopeLen / 2 + 0.06), len + 0.12, 0.13, 0.05, 0, 0, 0, GOLD);
        for (let i = 0; i < Math.round(len / 0.45); i++) T.RL(b, frame, -len / 2 + 0.22 + i * 0.45, -0.11, 0, 0.08, 0.08, slopeLen - 0.1, 0, 0, 0, i % 2 ? DRED : RED);
        // fangs hanging from the eaves: the shrine's mouth
        for (let i = 0; i < Math.round(len / 0.3); i++) {
          const x = -len / 2 + 0.15 + i * 0.3, big = i % 3 === 1;
          b.addMatrix(FANG, kit.plastic(BONE), frame.clone().multiply(T.M(x, -0.2 - (big ? 0.06 : 0), fz * (slopeLen / 2 - 0.04), -fz * slopeAng + Math.PI, 0, 0, 0.06, big ? 0.32 : 0.2, 0.06)));
        }
      }
    }
    // the ridge: a black beam with gold caps, and bone horns curling up at each end
    T.R(b, 0, RIDGE + 0.05, 0, 2.3, 0.24, 0.3, 0, 0, 0, C.black);
    T.R(b, 0, RIDGE + 0.19, 0, 2.36, 0.06, 0.34, 0, 0, 0, GOLD);
    for (const sd of [-1, 1]) {
      T.R(b, sd * 1.12, RIDGE + 0.12, 0, 0.24, 0.42, 0.42, 0, 0, 0, C.black);
      T.R(b, sd * 1.12, RIDGE + 0.12, 0, 0.26, 0.2, 0.44, 0, 0, 0, RED);
      T.cone(b, sd * 1.22, RIDGE + 0.46, 0, 0.1, 0.42, 0.1, 0, 0, sd * -0.5, BONE);
      T.cone(b, sd * 1.4, RIDGE + 0.72, 0, 0.06, 0.24, 0.06, 0, 0, sd * -1.0, BONE);
      // the up-turned eave tips
      const tx = sd * (1.05 + Math.cos(0.28) * 1.4), ty = (RIDGE + EAVE) / 2 + Math.sin(0.28) * 1.4;
      T.R(b, tx, ty + 0.12, 0, 0.18, 0.5, 0.3, 0, 0, sd * -0.28, C.black);
    }
    // a skull mounted on the front and back of the ridge
    for (const fz of [-1, 1]) {
      T.ell(b, 0, RIDGE - 0.05, fz * 0.25, 0.2, 0.18, 0.14, 0, 0, 0, BONE);
      for (const sd of [-1, 1]) T.R(b, sd * 0.07, RIDGE - 0.03, fz * 0.37, 0.07, 0.07, 0.04, 0, 0, 0, C.black);
      T.R(b, 0, RIDGE - 0.17, fz * 0.36, 0.14, 0.05, 0.04, 0, 0, 0, 0x8a8070);
    }
    // cursed flames (one flickering part per site)
    const flames = [], parts = [];
    const fire = (x, y, z, size) => {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const fb = new BrickBuilder(0.4);
      // three dark-red tongues leaning apart, an orange heart showing between them, a yellow core
      for (let i = 0; i < 3; i++) {
        const an = i * 2.1, ox = Math.cos(an) * 0.09 * size, oz = Math.sin(an) * 0.09 * size;
        T.cone(fb, ox, size * (0.3 - i * 0.04), oz, size * 0.13, size * (0.6 - i * 0.1), size * 0.13, oz * 2, 0, -ox * 2, 0x8a0c12, FLAME);
      }
      T.cone(fb, 0, size * 0.32, 0, size * 0.1, size * 0.64, size * 0.1, 0, 0, 0, 0xff5a20, MID);
      T.cone(fb, 0, size * 0.12, 0, size * 0.11, size * 0.24, size * 0.11, 0, 0, 0, 0xffd060, CORE);
      g.add(fb.build({ name: 'cursedFire', shadows: false })); flames.push(g); parts.push(g);
    };
    for (const sd of [-1, 1]) {
      fire(sd * 1.5, RIDGE + 0.82, 0, 0.9);
      fire(sd * (1.05 + Math.cos(0.28) * 1.45), (RIDGE + EAVE) / 2 + Math.sin(0.28) * 1.45 + 0.36, 0, 0.75);
    }
    return {
      mesh: b.build({ name: 'malevolentshrine' }), parts,
      fx(s) {
        for (let i = 0; i < flames.length; i++) {
          const k = s.t * 11 + i * 2.3;
          flames[i].scale.set(1 + Math.sin(k * 1.7) * 0.1, 0.85 + Math.sin(k) * 0.18 + Math.sin(k * 2.9) * 0.1, 1);
          flames[i].rotation.z = Math.sin(k * 0.7) * 0.08;
        }
      },
    };
  },
};

export default [nue, shrine];
