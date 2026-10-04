// Wizarding gliders (see the contract at the top of js/gliders.js): Fawkes the phoenix, who carries
// the driver by his tail feathers, and the Marauder's Map unfolded into a paper wing.

// small transform helpers on top of the kit
function tools({ THREE, plastic }) {
  const V = THREE.Vector3, Q = new THREE.Quaternion(), E = new THREE.Euler(), UP = new V(0, 1, 0);
  const SPH = tools.sph ||= new THREE.SphereGeometry(1, 10, 7);
  const CONE = tools.cone ||= new THREE.ConeGeometry(1, 1, 8);
  const CYL = tools.cyl ||= new THREE.CylinderGeometry(1, 1, 1, 6);
  const M = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new V(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), new V(sx, sy, sz));
  const mat = (col, o = {}) => o.mat || plastic(col, o.matOpts);
  return {
    M,
    R: (b, x, y, z, sx, sy, sz, rx, ry, rz, col, o) => b.boxM(M(x, y, z, rx, ry, rz, sx, sy, sz), col, o || {}),
    ell: (b, x, y, z, sx, sy, sz, rx, ry, rz, col, o = {}) => b.addMatrix(SPH, mat(col, o), M(x, y, z, rx, ry, rz, sx, sy, sz)),
    cone: (b, x, y, z, r, h, rz2, rx, ry, rz, col, o = {}) => b.addMatrix(CONE, mat(col, o), M(x, y, z, rx, ry, rz, r, h, rz2)),
    rod(b, p1, p2, r, col, o = {}) {
      const a = new V(...p1), c = new V(...p2), d = c.clone().sub(a), len = d.length();
      b.addMatrix(CYL, mat(col, o), new THREE.Matrix4().compose(a.add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), new V(r, len, r)));
    },
  };
}

const LIT = (c, i = 1.4) => ({ matOpts: { emissive: c, emissiveIntensity: i } });

// ---- Fawkes: Dumbledore's phoenix; flapping crimson wings trailing flickering fire ---------------
const fawkes = {
  id: 'fawkes', name: 'Fawkes', blurb: 'Hang on to the phoenix tail', colors: [0xc91a09, 0xf2b52a],
  build(kit) {
    const { THREE, BrickBuilder } = kit; const T = tools(kit);
    const RED = 0xc91a09, DRED = 0x8e1408, ORA = 0xe8501a, GOLD = 0xf2b52a;
    const FIRE = LIT(0xff5a10, 1.6), CORE = LIT(0xffc830, 1.8);
    const b = new BrickBuilder(0.4);
    // body, orange breast, neck and head
    T.ell(b, 0, 1.88, 0.0, 0.42, 0.34, 0.85, 0.08, 0, 0, RED);
    T.ell(b, 0, 1.76, 0.25, 0.32, 0.26, 0.55, 0.1, 0, 0, ORA);
    T.ell(b, 0, 2.02, 0.72, 0.26, 0.26, 0.34, -0.3, 0, 0, RED);
    T.ell(b, 0, 2.12, 0.98, 0.25, 0.24, 0.27, 0, 0, 0, RED);
    T.cone(b, 0, 2.06, 1.3, 0.09, 0.3, 0.08, Math.PI / 2 + 0.35, 0, 0, GOLD);     // hooked beak
    for (const sd of [-1, 1]) {
      T.R(b, sd * 0.2, 2.18, 1.1, 0.04, 0.09, 0.09, 0, 0, 0, GOLD);
      T.R(b, sd * 0.215, 2.18, 1.11, 0.03, 0.05, 0.05, 0, 0, 0, 0x111111);
    }
    // golden crest swept back over the head
    for (let i = 0; i < 3; i++) T.R(b, (i - 1) * 0.07, 2.34 + (i === 1 ? 0.04 : 0), 0.82, 0.05, 0.05, 0.42, -0.55 - Math.abs(i - 1) * 0.15, 0, 0, i === 1 ? GOLD : ORA);
    // the long tail feathers hang down to the driver's hands (Harry's grip in the Chamber)
    const tail = [[-0.07, GOLD], [0, RED], [0.07, ORA]];
    for (const [x, col] of tail) {
      T.rod(b, [x, 1.7, -0.6], [x * 1.4, 0.95, -0.42], 0.045, col);
      T.rod(b, [x * 1.4, 0.95, -0.42], [x * 0.6, 0.0, 0.0], 0.04, col);
    }
    T.ell(b, 0, -0.08, 0, 0.13, 0.2, 0.13, 0, 0, 0, GOLD);                          // feather plume at the grip
    // two showy plumes streaming back
    for (const sd of [-1, 1]) {
      T.rod(b, [sd * 0.12, 1.75, -0.7], [sd * 0.3, 1.55, -1.4], 0.035, GOLD);
      T.ell(b, sd * 0.32, 1.53, -1.45, 0.1, 0.05, 0.16, 0.2, 0, 0, RED);
    }
    // flickering fire at the plume tips (one part per side)
    const flames = [];
    const flameGroup = (x, y, z, dir, n, len) => {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const fb = new BrickBuilder(0.4);
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.22, h = len * (0.75 + 0.35 * ((i * 7) % 3) / 2);
        // cones pointing back (-z), flattened into tongues
        T.cone(fb, off, 0, -h / 2, 0.11, h, 0.05, -Math.PI / 2, 0, 0, 0xff7a20, FIRE);
        T.cone(fb, off, 0.01, -h * 0.32, 0.06, h * 0.62, 0.03, -Math.PI / 2, 0, 0, 0xffd860, CORE);
      }
      g.add(fb.build({ name: 'fawkesFire', shadows: false })); g.rotation.y = dir;
      return g;
    };
    const parts = [];
    for (const sd of [-1, 1]) { const f = flameGroup(sd * 0.33, 1.53, -1.55, 0, 1, 0.5); parts.push(f); flames.push(f); }
    // wings: crimson arm, orange hand, fanned primaries with golden tips, fire along the trailing edge
    const wings = [];
    for (const sd of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sd * 0.3, 1.92, 0.1);
      const wb = new BrickBuilder(0.4);
      T.R(wb, sd * 0.75, 0, 0.0, 1.5, 0.1, 1.0, 0, 0, 0, RED);
      T.R(wb, sd * 0.78, 0.04, 0.5, 1.56, 0.12, 0.14, 0, 0, 0, GOLD);              // leading edge
      T.R(wb, sd * 1.95, 0.03, 0.05, 1.0, 0.09, 0.78, 0, sd * 0.1, 0, DRED);
      T.R(wb, sd * 1.95, 0.07, 0.42, 1.0, 0.1, 0.12, 0, sd * 0.1, 0, GOLD);
      for (let i = 0; i < 5; i++) {
        const th = -0.2 + i * 0.27, len = 1.15 - i * 0.12, bx = 2.35, bz = 0.25 - i * 0.12;
        const dx = Math.cos(th), dz = -Math.sin(th);
        T.R(wb, sd * (bx + dx * len / 2), 0.02 - i * 0.004, bz + dz * len / 2, len, 0.07, 0.2, 0, sd * th, 0, i % 2 ? ORA : RED);
        T.R(wb, sd * (bx + dx * (len - 0.1)), 0.03 - i * 0.004, bz + dz * (len - 0.1), 0.24, 0.075, 0.21, 0, sd * th, 0, GOLD);
      }
      for (let i = 0; i < 5; i++)                                                  // secondaries
        T.R(wb, sd * (0.2 + i * 0.36), -0.01, -0.68, 0.34, 0.07, 0.5, 0, sd * 0.06 * i, 0, i % 2 ? GOLD : ORA);
      w.add(wb.build({ name: 'fawkesWing' }));
      const f1 = flameGroup(sd * 1.0, 0, -0.9, 0, 5, 0.6);
      const f2 = flameGroup(sd * 2.85, 0, -0.55, sd * 0.55, 2, 0.5);
      w.add(f1, f2); flames.push(f1, f2);
      wings.push({ w, sd }); parts.push(w);
    }
    let ph = 0;
    return {
      mesh: b.build({ name: 'fawkes' }), parts,
      fx(s, dt) {
        ph += dt * (4.2 + s.speed01 * 2.5);
        const a = 0.1 + Math.sin(ph) * 0.3;
        for (const x of wings) x.w.rotation.z = x.sd * (a - s.steer * x.sd * 0.08);
        for (let i = 0; i < flames.length; i++) {
          const f = flames[i], k = s.t * 14 + i * 1.7;
          f.scale.set(1, 1 + Math.sin(k * 1.3) * 0.25, 0.75 + Math.sin(k) * 0.2 + Math.sin(k * 2.7) * 0.12);
        }
      },
    };
  },
};

// ---- The Marauder's Map: the folded parchment opened into an accordion wing, held up on a lit
// wand; ink footprints wander across it ("I solemnly swear that I am up to no good") -------------
let mapMats = null;
function mapMaterials(THREE) {
  if (mapMats) return mapMats;
  const make = (seed) => {
    const c = document.createElement('canvas'); c.width = 192; c.height = 256;
    const g = c.getContext('2d');
    let r = seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    g.fillStyle = '#d9b77a'; g.fillRect(0, 0, 192, 256);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(130,85,35,${0.06 + rnd() * 0.08})`; g.beginPath(); g.arc(rnd() * 192, rnd() * 256, 8 + rnd() * 26, 0, 7); g.fill(); }
    const ink = '#3a200c';
    g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(8, 8, 176, 240); g.lineWidth = 1.5; g.strokeRect(14, 14, 164, 228);
    // castle rooms and corridors
    g.lineWidth = 3.5;
    for (let i = 0; i < 7; i++) {
      const x = 22 + rnd() * 110, y = 24 + rnd() * 170, w = 24 + rnd() * 40, h = 18 + rnd() * 34;
      g.strokeRect(x, y, w, h);
      g.beginPath(); g.moveTo(x + w, y + h / 2); g.lineTo(x + w + 10 + rnd() * 20, y + h / 2); g.stroke();
      // a label scribble
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 4, y + h / 2); for (let k = 0; k < 6; k++) g.lineTo(x + 6 + k * (w - 10) / 6, y + h / 2 + (k % 2 ? -2 : 2)); g.stroke(); g.lineWidth = 3.5;
    }
    // a winding staircase
    g.beginPath(); g.arc(150 - rnd() * 40, 200, 18, 0, 7); g.stroke();
    for (let k = 0; k < 8; k++) { const a = k * 0.8; g.beginPath(); g.moveTo(130 + Math.cos(a) * 4, 200 + Math.sin(a) * 4); g.lineTo(130 + Math.cos(a) * 16, 200 + Math.sin(a) * 16); g.stroke(); }
    // footprints with name ribbons
    g.fillStyle = ink;
    for (let t = 0; t < 2; t++) {
      let fx = 30 + rnd() * 120, fy = 40 + rnd() * 160;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(fx + (k % 2 ? 5 : -5), fy - k * 12, 2.6, 4.4, 0, 0, 7); g.fill(); }
      g.strokeRect(fx - 16, fy + 8, 32, 9); g.fillRect(fx - 12, fy + 11, 24, 2);
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: tex, color: 0xe8dcc4, roughness: 0.85 });
  };
  // the centre panels carry the title cartouche
  const title = make(91);
  const cg = title.map.image.getContext('2d');
  cg.fillStyle = '#d9b77a'; cg.fillRect(36, 92, 120, 64);
  cg.strokeStyle = '#3a200c'; cg.lineWidth = 2.5; cg.strokeRect(36, 92, 120, 64); cg.strokeRect(41, 97, 110, 54);
  cg.fillStyle = '#3a200c'; cg.font = 'bold 15px Georgia, serif'; cg.textAlign = 'center';
  cg.fillText('The', 96, 116); cg.fillText("Marauder's", 96, 132); cg.fillText('Map', 96, 148);
  title.map.needsUpdate = true;
  mapMats = [title, make(7), make(4242)];
  return mapMats;
}

const marauders = {
  id: 'maraudersmap', name: "Marauder's Map", blurb: 'Up to no good', colors: [0xe4cd9e, 0x4a2c14],
  build(kit) {
    const { THREE, BrickBuilder } = kit; const T = tools(kit);
    const mats = mapMaterials(THREE);
    const W = 1.15, D = 1.7, TH = 0.04, Y0 = 1.8, A = [0.22, -0.2, 0.14];
    const INK = 0x4a2c14, WAND = 0x3a2414;
    const b = new BrickBuilder(0.4);
    // centre pair of panels (fixed): a valley fold down the middle
    for (const sd of [-1, 1]) T.R(b, sd * Math.cos(A[0]) * W / 2, Y0 + Math.sin(A[0]) * W / 2, 0, W, TH, D, 0, 0, sd * A[0], 0, { mat: mats[0] });
    // the wand: carved handle where the driver grips, a slim shaft and a Lumos glow under the map
    b.cyl(0, -0.25, 0, 0.075, 0.55, WAND, { seg: 8 });
    for (const y of [-0.27, 0.05, 0.3]) b.cyl(0, y, 0, 0.095, 0.06, 0x5a3a20, { seg: 8 });
    T.rod(b, [0, 0.3, 0], [0, 1.74, 0.02], 0.04, WAND);
    T.ell(b, 0, 1.74, 0.02, 0.07, 0.07, 0.07, 0, 0, 0, 0xeaf6ff, LIT(0xcfe8ff, 2.2));
    // ribbon ties from the wand up to the first folds
    const hx = Math.cos(A[0]) * W, hy = Y0 + Math.sin(A[0]) * W;
    for (const sd of [-1, 1]) for (const z of [-0.75, 0.75]) T.rod(b, [0, 0.45, 0], [sd * hx, hy - 0.03, z], 0.015, 0x8a6a40);
    // outer folds hinge so the paper can flutter
    const parts = [], hinges = [];
    const panel = (m, sd) => { const pb = new BrickBuilder(0.4); T.R(pb, sd * W / 2, 0, 0, W, TH, D, 0, 0, 0, 0, { mat: m }); return pb.build({ name: 'mapPanel' }); };
    for (const sd of [-1, 1]) {
      const h1 = new THREE.Group(); h1.position.set(sd * hx, hy, 0);
      h1.add(panel(mats[1], sd));
      const h2 = new THREE.Group(); h2.position.set(sd * W, 0, 0);
      h2.add(panel(mats[2], sd)); h1.add(h2);
      hinges.push({ h1, h2, sd }); parts.push(h1);
    }
    // wandering footprints (one trail on top of the map, one underneath)
    const walkers = [];
    for (const sd of [-1, 1]) {
      const g = new THREE.Group(), wb = new BrickBuilder(0.4), up = sd > 0 ? 1 : -1;
      for (let k = 0; k < 4; k++) T.ell(wb, (k % 2 ? 0.05 : -0.05), up * 0.025, -k * 0.13, 0.03, 0.008, 0.05, 0, 0, 0, INK);
      g.add(wb.build({ name: 'footprints', shadows: false }));
      const holder = new THREE.Group();
      holder.position.set(sd * Math.cos(A[0]) * W / 2, Y0 + Math.sin(A[0]) * W / 2, 0); holder.rotation.z = sd * A[0];
      holder.add(g); parts.push(holder); walkers.push({ g, sd });
    }
    return {
      mesh: b.build({ name: 'maraudersmap' }), parts,
      fx(s) {
        for (const h of hinges) {
          h.h1.rotation.z = h.sd * (A[1] + Math.sin(s.t * 3.1 + h.sd) * 0.05);
          h.h2.rotation.z = h.sd * (A[2] - A[1] + Math.sin(s.t * 3.1 + h.sd - 0.9) * 0.1);
        }
        for (const w of walkers) {
          const p = ((s.t * 0.22 + (w.sd > 0 ? 0 : 0.5)) % 1);
          w.g.position.set(Math.sin(p * 9) * 0.18 * w.sd, 0, 0.75 - p * 1.1);
          w.g.scale.setScalar(Math.min(1, p * 8, (1 - p) * 8));
        }
      },
    };
  },
};

export default [fawkes, marauders];
