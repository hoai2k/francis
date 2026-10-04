// Models and effects for the Pokémon power-ups (./pokemon.js): a sleeping Snorlax (the driver rig
// from ../drivers/pokemon.js, scaled up), the green Protect dome, the Poké Ball, Thunderbolt
// lightning, Quick Attack speed lines. Shared geometry is built once; per-use parts are cheap
// clones or own materials that dispose() frees.
import * as THREE from 'three';
import { BrickBuilder, shape, pokeBall, fxMat, spriteMat, PI } from '../drivers/pokemon-kit.js';
import POKEMON from '../drivers/pokemon.js';

// remove a model and free what it owns (userData.own on geometries / materials)
export function disposeOwned(root) {
  if (!root) return;
  root.parent?.remove(root);
  root.traverse((o) => {
    if (o.geometry?.userData.own) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) if (m.userData.own) m.dispose();
  });
}
const own = (x) => { x.userData.own = true; return x; };

// ---- sleeping Snorlax ----------------------------------------------------------------------------
// the Snorlax driver rig (its fx shows the Zzz, idle makes it breathe); its merged geometry is its own
const SNORLAX = POKEMON.find((d) => d.id === 'snorlax');
export function snorlaxModel(scale = 2.1) {
  const rig = SNORLAX.build();
  rig.root.traverse((o) => { if (o.isMesh) { own(o.geometry); o.castShadow = true; } });
  const g = new THREE.Group();
  rig.root.scale.setScalar(scale);
  rig.root.position.y = 0.3 * scale;
  // lying back a little, arms flopped out, fast asleep
  rig.torso.rotation.x = -0.25;
  rig.head.rotation.x = 0.25;
  rig.armL.rotation.set(-0.3, 0, 0.7); rig.armR.rotation.set(-0.3, 0, -0.7);
  g.add(rig.root);
  g.userData.rig = rig;
  return g;
}

// ---- Protect: a green barrier dome with a glowing hexagon lattice -----------------------------------
let domeGeo = null, latticeGeo = null;
export function protectDome() {
  domeGeo ||= new THREE.SphereGeometry(1, 24, 16);
  latticeGeo ||= new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.02, 1));
  const g = new THREE.Group();
  const shell = new THREE.Mesh(domeGeo, own(new THREE.MeshStandardMaterial({ color: 0x5aff7a, emissive: 0x20c040, emissiveIntensity: 0.7, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide })));
  const lat = new THREE.LineSegments(latticeGeo, own(new THREE.LineBasicMaterial({ color: 0xb8ffb0, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })));
  g.add(shell, lat);
  g.scale.set(2.9, 2.4, 3.3); g.position.y = 1.0;
  g.userData = { shell, lat };
  return g;
}

// ---- Poké Ball -----------------------------------------------------------------------------------
let ballProto = null;
export function ballModel() {
  if (!ballProto) {
    const b = new BrickBuilder(1);
    pokeBall(shape(b), 0, 0, 0, 1, { studs: true });
    ballProto = b.build({ name: 'pokeball', shadows: true });
  }
  const g = new THREE.Group();
  const spin = ballProto.clone();
  g.add(spin);
  g.userData.spin = spin;
  return g;
}
// the red capture beam / flash
let beamGeo = null;
export function beamMesh(color = 0xff4a3a) {
  beamGeo ||= new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0);
  return new THREE.Mesh(beamGeo, own(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
}
const Y = new THREE.Vector3(0, 1, 0), D = new THREE.Vector3();
export function stretch(m, a, b, r) {
  D.subVectors(b, a); const L = D.length();
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(Y, D.normalize());
  m.scale.set(r, Math.max(0.001, L), r);
}

// ---- Thunderbolt: jagged lightning (a few variants, cloned per strike) -------------------------
const bolts = [];
export function boltMesh() {
  if (!bolts.length) {
    for (let v = 0; v < 3; v++) {
      let sd = 7 + v * 13; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647) - 0.5;
      const b = new BrickBuilder(1), L = shape(b);
      let x = 0, z = 0, y = 1;
      const n = 9;
      for (let i = 0; i < n; i++) {
        const y2 = 1 - (i + 1) / n, x2 = i === n - 1 ? 0 : rnd() * 0.22, z2 = i === n - 1 ? 0 : rnd() * 0.22;
        L.rod([x, y, z], [x2, y2, z2], 0.012, 0, { mat: fxMat(0xffffff, 1), seg: 5 });
        L.rod([x, y, z], [x2, y2, z2], 0.03, 0, { mat: fxMat(0xfff04a, 0.6), seg: 6 });
        if (i % 3 === 1) L.rod([x2, y2, z2], [x2 + rnd() * 0.2, y2 - 0.08, z2 + rnd() * 0.2], 0.01, 0, { mat: fxMat(0xfff8a0, 0.9), seg: 4 });
        x = x2; y = y2; z = z2;
      }
      bolts.push(b.build({ name: 'bolt', shadows: false }));
    }
  }
  const m = bolts[Math.floor(Math.random() * bolts.length)].clone();
  return m;
}
export function glowSprite(color, size, op = 0.8) {
  const s = new THREE.Sprite(spriteMat(color, op)); s.scale.setScalar(size); return s;
}

// ---- Quick Attack: white speed lines streaming past the kart ---------------------------------------
let lineGeo = null;
export function speedLines(n = 12) {
  lineGeo ||= new THREE.BoxGeometry(1, 1, 1).translate(0, 0, -0.5);
  const g = new THREE.Group();
  const mat = own(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const lines = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(lineGeo, mat);
    const a = (i / n) * PI * 2;
    m.userData = { x: Math.cos(a) * (1.6 + (i % 3) * 0.35), y: 1.1 + Math.sin(a) * 1.0, z: 1.2 - (i % 4) * 0.5, ph: i * 0.37 };
    g.add(m); lines.push(m);
  }
  g.userData = { lines, mat };
  return g;
}

// prewarm samples (one of each special material)
let warm = null;
export function prewarmAll() {
  warm ||= [protectDome(), ballModel(), boltMesh(), speedLines(2), beamMesh(), glowSprite(0xfff04a, 2), snorlaxModel(1)];
  return warm;
}
