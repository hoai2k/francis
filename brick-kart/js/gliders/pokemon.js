// Pokémon gliders (see the contract at the top of js/gliders.js): Charizard's wings (orange on top,
// teal membrane below, scalloped trailing edge) flapping over a little back and a flickering tail
// flame, and a Poké Ball parachute whose red / black / white canopy breathes in the wind.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { BrickBuilder, C, plastic } from '../lego.js';

const e = new THREE.Euler(), q = new THREE.Quaternion(), V = (x, y, z) => new THREE.Vector3(x, y, z);
const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), V(sx, sy, sz));
const S = Math.sin, PI = Math.PI;
const SPH = new THREE.SphereGeometry(1, 14, 10);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20);

// ---- Charizard wings ---------------------------------------------------------------------------------
const ORANGE = 0xf08030, DKOR = 0xc85a1e, TEAL = 0x1f8a8a, CREAM = 0xf6e0a0;
// wing outline in (u outward, v forward): finger tips along the trailing edge, scallops between them
const TIPS = [[3.35, 0.0], [2.7, -0.78], [1.95, -1.08], [1.1, -1.12], [0.05, -0.72]];
const ELBOW = [1.2, 0.72];
function wingShape(sd) {
  const s = new THREE.Shape();
  s.moveTo(0, 0.35);
  s.lineTo(sd * ELBOW[0], ELBOW[1]);
  s.lineTo(sd * TIPS[0][0], TIPS[0][1]);
  for (let i = 1; i < TIPS.length; i++) {
    const [u0, v0] = TIPS[i - 1], [u1, v1] = TIPS[i];
    const cu = (u0 + u1) / 2 + (ELBOW[0] - (u0 + u1) / 2) * 0.32, cv = (v0 + v1) / 2 + (ELBOW[1] - (v0 + v1) / 2) * 0.32;
    s.quadraticCurveTo(sd * cu, cv, sd * u1, v1);
  }
  s.lineTo(0, 0.35);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false, curveSegments: 5 });
  g.rotateX(PI / 2);   // shape y -> +z, extrusion goes down
  const ig = mergeVertices(g); g.dispose();
  return ig;
}
let flameOut = null, flameIn = null;
const charizard = {
  id: 'pk-charizard', name: 'Charizard Wings', blurb: 'Spread your wings and blaze the skies', colors: [ORANGE, TEAL],
  build({ mast, limb }) {
    const b = new BrickBuilder(0.4);
    mast(b, 1.62, C.black);
    // a little orange back between the wings with a cream belly, and the tail curling up behind
    b.addMatrix(SPH, plastic(ORANGE), M(0, 1.76, -0.05, 0.08, 0, 0, 0.42, 0.28, 0.85));
    b.addMatrix(SPH, plastic(CREAM), M(0, 1.62, 0.0, 0.08, 0, 0, 0.32, 0.16, 0.7));
    limb(b, V(0, 1.74, -0.7), V(0, 1.62, -1.15), 0.13, ORANGE);
    limb(b, V(0, 1.62, -1.15), V(0, 1.72, -1.45), 0.09, ORANGE);
    const mesh = b.build({ name: 'pk-charizard' });
    const wings = [];
    for (const sd of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(sd * 0.32, 1.8, 0);
      const wb = new BrickBuilder(0.4);
      const g = wingShape(sd);
      wb.addMatrix(g, plastic(ORANGE), M(0, 0.05, 0));
      wb.addMatrix(g, plastic(TEAL), M(0, -0.01, 0));
      g.dispose();
      // arm bone along the leading edge, finger ridges out to each point, a claw at the wrist
      const el = V(sd * ELBOW[0], 0.06, ELBOW[1]);
      limb(wb, V(0, 0.04, 0.32), el, 0.07, ORANGE);
      limb(wb, el, V(sd * TIPS[0][0], 0.04, TIPS[0][1]), 0.05, ORANGE);
      for (let i = 1; i < TIPS.length - 1; i++) limb(wb, el, V(sd * TIPS[i][0], 0.05, TIPS[i][1]), 0.03, DKOR);
      wb.cone(sd * ELBOW[0], 0.06, ELBOW[1] + 0.02, 0.06, 0.22, CREAM, { seg: 6 });
      p.add(wb.build({ name: 'pk-charizard-wing' }));
      wings.push({ p, sd });
    }
    // the tail flame (additive cones that flicker)
    flameOut ||= new THREE.MeshBasicMaterial({ color: 0xff6a10, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    flameIn ||= new THREE.MeshBasicMaterial({ color: 0xffe040, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const flame = new THREE.Group(); flame.position.set(0, 1.76, -1.48);
    const cone = new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0);
    const fo = new THREE.Mesh(cone, flameOut); fo.scale.set(0.2, 0.55, 0.2);
    const fi = new THREE.Mesh(cone, flameIn); fi.scale.set(0.11, 0.36, 0.11);
    flame.add(fo, fi);
    return {
      mesh, parts: [...wings.map((w) => w.p), flame],
      fx(s) {
        const f = S(s.t * 3.0);
        for (const { p, sd } of wings) {
          p.rotation.z = sd * (0.14 + f * 0.2);
          p.rotation.y = sd * (0.05 + f * 0.05);
        }
        const k = 1 + S(s.t * 23) * 0.12 + S(s.t * 37) * 0.08;
        flame.scale.set(1, k, 1);
        flame.rotation.x = -0.5 - (s.speed01 || 0) * 0.5 + S(s.t * 11) * 0.08;
      },
    };
  },
};

// ---- Poké Ball parachute ---------------------------------------------------------------------------
const PRED = 0xe8202a, PBLK = 0x1b1b20, PWHT = 0xf4f4f4;
const RX = 2.45, RY = 1.32, RZ = 1.55, CY = 0.95, RIM = 1.36;
// a band of the canopy between two polar angles, with an inside face so it reads from below too
function band(t0, t1) {
  const out = new THREE.SphereGeometry(1, 24, 3, 0, PI * 2, t0, t1 - t0);
  const inn = out.clone(); inn.scale(0.97, 0.97, 0.97);
  const ix = inn.index.array;
  for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  const n = inn.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return [out, inn];
}
const pokeball = {
  id: 'pk-pokeball', name: 'Poké Chute', blurb: 'Gotta glide \'em all', colors: [PRED, PWHT],
  build({ limb }) {
    const b = new BrickBuilder(0.4);
    // suspension lines from the white skirt down to a grip bar
    const yr = CY + RY * Math.cos(RIM), sr = Math.sin(RIM);
    for (let i = 0; i < 10; i++) {
      const a = (i + 0.5) / 10 * PI * 2, x = Math.cos(a) * RX * sr, z = Math.sin(a) * RZ * sr;
      limb(b, V(x, yr, z), V(Math.sign(x) * 0.42, 0, z * 0.08), 0.016, C.ltgray);
    }
    b.boxM(M(0, 0, 0, 0, 0, 0, 1.0, 0.1, 0.1), PBLK);
    const mesh = b.build({ name: 'pk-pokeball' });
    // the canopy (its own group so it can breathe)
    const cb = new BrickBuilder(0.4), sc = M(0, CY, 0, 0, 0, 0, RX, RY, RZ);
    for (const [t0, t1, col] of [[0, 0.86, PRED], [0.86, 1.0, PBLK], [1.0, RIM, PWHT]]) for (const g of band(t0, t1)) cb.addMatrix(g, plastic(col), sc);
    cb.cyl(0, CY + RY - 0.06, 0, 0.26, 0.14, PRED, { seg: 12 });   // a stud on top
    // the button on the black band, front and back
    const lamp = new THREE.MeshStandardMaterial({ color: PWHT, emissive: 0xffffff, emissiveIntensity: 0.2, roughness: 0.3 });
    const th = 0.93, py = RY * Math.cos(th), pz = RZ * Math.sin(th), tilt = Math.atan2(pz / (RZ * RZ), py / (RY * RY));
    for (const sd of [-1, 1]) {
      cb.addMatrix(CYL, plastic(PBLK), M(0, CY + py, sd * pz, sd * tilt, 0, 0, 0.42, 0.12, 0.42));
      cb.addMatrix(CYL, plastic(PWHT), M(0, CY + py * 1.02, sd * pz * 1.02, sd * tilt, 0, 0, 0.3, 0.14, 0.3));
      cb.addMatrix(CYL, lamp, M(0, CY + py * 1.04, sd * pz * 1.04, sd * tilt, 0, 0, 0.14, 0.12, 0.14));
    }
    // pivot at the rim so the canopy breathes without pulling away from its lines
    const canopy = new THREE.Group(); canopy.position.y = yr;
    const cm = cb.build({ name: 'pk-pokeball-canopy' }); cm.position.y = -yr; canopy.add(cm);
    return {
      mesh, parts: [canopy],
      fx(s) {
        const f = S(s.t * 2.6);
        canopy.scale.set(1 + f * 0.025, 1 - f * 0.035, 1 + f * 0.025);
        lamp.emissiveIntensity = 0.15 + 0.6 * Math.max(0, S(s.t * 4));
      },
    };
  },
};

export default [charizard, pokeball];
