// Marvel gliders (see the contract at the top of js/gliders.js).
import { THREE, BrickBuilder, C, plastic, mat, box, cyl, cone, sphere, rod, glow, plate } from './movie-kit.js';

const PI = Math.PI;

// ---- Iron Man: a red and gold armour wing with a helmet nose and roaring repulsors -------
const IRED = 0xb3121b, IGOLD = 0xd9a72e, DARK = 0x3a3e46, BEAM = 0xbff4ff;
const IRONWING = {
  id: 'repulsorwing', name: 'Repulsor Wing', blurb: 'Mark-85 flight module, repulsors hot',
  colors: [IRED, IGOLD],
  build({ mast }) {
    const b = new BrickBuilder(0.4);
    const core = glow(BEAM, 1.6), jet = glow(BEAM, 1.4);
    mast(b, 1.6, DARK);
    // spine: red hull with a gold stripe, the arc reactor glowing on top
    box(b, null, 0, 1.72, 0, 0.9, 0.22, 1.9, IRED);
    box(b, null, 0, 1.84, -0.1, 0.3, 0.04, 1.6, IGOLD);
    cyl(b, null, 0, 1.87, -0.35, 0.3, 0.08, DARK, 'y', { seg: 16 });
    cyl(b, null, 0, 1.9, -0.35, 0.22, 0.05, 0, 'y', { mat: core, seg: 16 });
    // the helmet as the nose: red dome, gold faceplate, glowing eye slits
    sphere(b, null, 0, 1.82, 0.95, 0.42, IRED, { sy: 0.95 });
    box(b, null, 0, 1.76, 1.24, 0.5, 0.5, 0.2, IGOLD, { rx: -0.08 });
    box(b, null, 0, 1.55, 1.2, 0.34, 0.14, 0.18, IGOLD);
    for (const sd of [-1, 1]) box(b, null, sd * 0.12, 1.86, 1.35, 0.16, 0.05, 0.03, 0, { mat: core, rz: sd * -0.15 });
    box(b, null, 0, 1.62, 1.34, 0.16, 0.025, 0.03, DARK);
    for (const sd of [-1, 1]) {
      const X = (x) => sd * x;
      // inner red wing, gold mid section, red swept tip, each with a gold / dark trim
      plate(b, null, [X(0.4), 1.74, -0.85, 0.75], [X(1.9), 1.86, -0.9, 0.35], 0.12, IRED);
      plate(b, null, [X(0.4), 1.75, 0.68, 0.82], [X(1.9), 1.87, 0.28, 0.42], 0.14, IGOLD);
      plate(b, null, [X(1.9), 1.86, -0.9, 0.42], [X(3.0), 1.98, -1.0, -0.05], 0.1, IGOLD);
      plate(b, null, [X(3.0), 1.98, -1.0, -0.05], [X(3.6), 2.1, -1.25, -0.6], 0.08, IRED);
      plate(b, null, [X(0.4), 1.73, -0.95, -0.8], [X(3.0), 1.97, -1.1, -0.95], 0.1, DARK);
      // a panel line and a stud row on top
      box(b, null, X(1.15), 1.88, -0.25, 1.2, 0.03, 0.06, DARK, { rz: sd * 0.08 });
      for (let i = 0; i < 3; i++) cyl(b, null, X(0.8 + i * 0.4), 1.86 + i * 0.03, 0.05, 0.1, 0.07, IRED, 'y', { seg: 8 });
      // repulsor pods under the wing: boot-like nacelles with glowing back ends and a palm disc
      cyl(b, null, X(1.6), 1.55, -0.35, 0.22, 1.3, IRED, 'z', { seg: 12 });
      cyl(b, null, X(1.6), 1.55, 0.32, 0.18, 0.12, IGOLD, 'z', { seg: 12 });
      cyl(b, null, X(1.6), 1.55, -1.02, 0.18, 0.06, 0, 'z', { mat: jet, seg: 12 });
      rod(b, null, [X(1.6), 1.6, -0.2], [X(1.6), 1.78, -0.2], 0.08, DARK);
      cyl(b, null, X(3.05), 1.92, -0.55, 0.16, 0.06, 0, 'y', { mat: jet, seg: 12 });
      cyl(b, null, X(3.05), 1.94, -0.55, 0.2, 0.05, DARK, 'y', { seg: 12 });
    }
    const mesh = b.build({ name: 'repulsorwing' });
    // repulsor blasts: soft cones out of the back of the pods
    const fb = new BrickBuilder(0.4), flame = plastic(BEAM, { trans: true, opacity: 0.5, emissive: BEAM, emissiveIntensity: 1.2 });
    cone(fb, null, 0, 0, 0, 0.15, 0.9, 0, 'z', { mat: flame, seg: 10 });
    const jets = [];
    for (const sd of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(sd * 1.6, 1.55, -1.05); g.rotation.y = PI; jets.push(g);
    }
    const blast = fb.build({ name: 'repulsor', shadows: false });
    jets.forEach((g, i) => g.add(i ? blast.clone() : blast));
    return {
      mesh, parts: jets,
      fx(s) {
        const t = s.t;
        jets.forEach((g, i) => { const k = (0.85 + 0.25 * s.speed01 + 0.15 * Math.sin(t * 37 + i * 1.7)); g.scale.set(k, k, k * (1 + 0.2 * Math.sin(t * 23 + i))); });
        core.emissiveIntensity = 1.4 + 0.5 * Math.sin(t * 5);
        jet.emissiveIntensity = 1.2 + 0.6 * s.speed01 + 0.3 * Math.sin(t * 29);
      },
    };
  },
};

// ---- Spider-Man: a web strung between red and blue rim strands, swung from two web lines -
const SRED = 0xc4141c, SBLUE = 0x1f3a93, WEB = 0xf4f4f4;
const WEBGLIDER = {
  id: 'webglider', name: 'Web Glider', blurb: 'Thwip! A parachute of pure web',
  colors: [SRED, SBLUE],
  build() {
    const b = new BrickBuilder(0.4);
    const RX = 3.3, RZ = 1.45, RIM = 1.6, DOME = 0.45, N = 12, RINGS = [0.28, 0.52, 0.76, 1];
    const ang = (i) => (i / N) * PI * 2 + PI / N;
    // the web lives in its own group, pivoting on the rim so the middle can bounce
    const wb = new BrickBuilder(0.4);
    const pt = (i, r) => [Math.cos(ang(i)) * RX * r, DOME * (1 - r * r), Math.sin(ang(i)) * RZ * r];
    for (let i = 0; i < N; i++) {
      rod(wb, null, [0, DOME + 0.04, 0], pt(i, 1), 0.03, WEB, { seg: 4 });
      for (const r of RINGS.slice(0, -1)) rod(wb, null, pt(i, r), pt(i + 1, r), 0.025, WEB, { seg: 4 });
      // the rim: thick red / blue strands with knots
      rod(wb, null, pt(i, 1), pt(i + 1, 1), 0.065, i % 2 ? SBLUE : SRED, { seg: 6 });
      sphere(wb, null, ...pt(i, 1), 0.09, SRED);
    }
    // the hub: a red disc with the black spider emblem
    cyl(wb, null, 0, DOME + 0.02, 0, 0.42, 0.08, SRED, 'y', { seg: 16 });
    cyl(wb, null, 0, DOME + 0.02, 0, 0.47, 0.05, SBLUE, 'y', { seg: 16 });
    sphere(wb, null, 0, DOME + 0.1, 0.1, 0.07, C.black, { sy: 0.6 });
    sphere(wb, null, 0, DOME + 0.1, -0.06, 0.1, C.black, { sy: 0.5, sz: 1.5 });
    for (const sd of [-1, 1]) for (let j = 0; j < 4; j++) {
      const a = -0.6 + j * 0.45, x0 = sd * 0.05, z0 = 0.02;
      const x1 = sd * (0.18 + 0.06 * Math.cos(a)), z1 = z0 + Math.sin(a) * 0.15;
      rod(wb, null, [x0, DOME + 0.11, z0], [x1, DOME + 0.11, z1], 0.018, C.black, { seg: 4 });
      rod(wb, null, [x1, DOME + 0.11, z1], [x1 + sd * 0.07, DOME + 0.11, z1 + (j < 2 ? -0.12 : 0.12)], 0.016, C.black, { seg: 4 });
    }
    const web = new THREE.Group(); web.position.y = RIM;
    web.add(wb.build({ name: 'web' }));
    // web lines from the hands up to the rim, and a little web-shooter grip
    box(b, null, 0, 0, 0, 0.7, 0.08, 0.08, SRED);
    for (const sd of [-1, 1]) {
      cyl(b, null, sd * 0.3, 0, 0, 0.07, 0.14, SBLUE, 'x', { seg: 8 });
      for (const i of sd > 0 ? [0, 11, 2, 9] : [5, 6, 3, 8]) {
        const p = pt(i, 1); rod(b, null, [sd * 0.3, 0.02, 0], [p[0], RIM + p[1], p[2]], 0.02, WEB, { seg: 4 });
      }
    }
    return {
      mesh: b.build({ name: 'webglider' }), parts: [web],
      fx(s) { web.scale.y = 1 + 0.18 * Math.sin(s.t * 3.2) - 0.1 * s.speed01; },
    };
  },
};

export default [IRONWING, WEBGLIDER];
