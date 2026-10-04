// Models and little effect helpers for the Sonic the Hedgehog abilities (./sonic.js):
// a brick Motobug Badnik (and the Flicky it frees), the spinning spin-ball, the Lightning
// Shield bubble with its crackling arcs, the seven Chaos Emeralds and the Super Sonic gold.
import * as THREE from 'three';
import { BrickBuilder, C, plastic } from '../lego.js';
import { gemGeo, gemMat, EMERALDS, glowTex } from '../drivers/sonic-kit.js';

export { EMERALDS, glowTex };
export const TAU = Math.PI * 2;
const wrapA = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);
export const angleDiff = (a, b) => wrapA(b - a);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const live = (o) => !!o && !o.finished && !(o.respawn > 0);

// sounds, attenuated by distance to the nearest listener
export function snd(ctx, pos, fn) {
  const au = ctx.audio;
  if (!au?.ctx) return;
  const a = pos && au.att ? au.att(pos) : 1;
  if (a > 0.03) fn(au, a);
}
// the classic ring "ching"
export const ringSnd = (ctx, pos, vol = 0.09) => snd(ctx, pos, (au, a) => { au.tone(2093, 0.08, { vol: vol * a, type: 'square', filter: 5000 }); au.tone(2637, 0.22, { vol: vol * a, type: 'square', filter: 5000, at: 0.06 }); });

// ---- shared materials ------------------------------------------------------------------------
const mats = {};
export const additive = (c, op = 0.8) => (mats['a' + c + op] ||= new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
export const spriteMat = (c, op = 0.9) => (mats['s' + c + op] ||= new THREE.SpriteMaterial({ map: glowTex(), color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
export const goldMat = () => (mats.gold ||= new THREE.MeshStandardMaterial({ color: 0xffcc30, emissive: 0xc08000, emissiveIntensity: 0.55, metalness: 0.55, roughness: 0.25 }));
export const studGold = () => (mats.stud ||= new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0xb07800, emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.25 }));
export function glowSprite(c, size, op = 0.9) { const s = new THREE.Sprite(spriteMat(c, op)); s.scale.setScalar(size); return s; }
const G = {};
const geo = (k, make) => (G[k] ||= make());

// ---- Motobug: a red ladybug Badnik rolling on one wheel (faces +Z, wheel on the ground) --------
export function motobugMesh() {
  const b = new BrickBuilder(1);
  const RED = 0xd8202c, BK = 0x1b1b22, SIL = 0xa0a5a9;
  const ell = (x, y, z, rx, ry, rz, c, o) => b.add(geo('sph', () => new THREE.SphereGeometry(1, 16, 10)), o?.mat || plastic(c, o?.matOpts), x, y, z, 0, rx, ry, rz);
  ell(0, 1.15, -0.1, 0.95, 0.8, 1.05, RED);                          // the ladybug shell
  b.box(0, 1.12, -0.12, 0.06, 0.7, 2.0, BK);                          // shell seam
  for (const [x, y, z] of [[0.5, 1.55, 0.2], [-0.5, 1.55, 0.2], [0.55, 1.4, -0.55], [-0.55, 1.4, -0.55], [0, 1.85, -0.35]]) ell(x, y, z, 0.17, 0.12, 0.17, BK);
  ell(0, 0.95, 0.75, 0.55, 0.5, 0.42, SIL);                           // face plate
  for (const sd of [-1, 1]) {
    ell(sd * 0.24, 1.08, 1.07, 0.16, 0.18, 0.08, C.white);
    ell(sd * 0.22, 1.08, 1.13, 0.08, 0.1, 0.05, 0x1060ff, { matOpts: { emissive: 0x2050ff, emissiveIntensity: 0.6 } });
    b.cyl(sd * 0.45, 0.4, 0.35, 0.08, 0.5, SIL, { seg: 8 });             // little arms down to the axle
    b.add(geo('cylZ', () => new THREE.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2)), plastic(SIL), sd * 0.35, 0.9, -1.15, 0, 0.12, 0.12, 0.45);   // exhaust pipes
  }
  ell(0, 0.82, 1.1, 0.14, 0.1, 0.1, BK);                              // mouth grille
  b.box(0, 0.22, 0.35, 0.5, 0.18, 0.18, SIL);
  const g = new THREE.Group();
  const body = b.build({ name: 'motobug' }); g.add(body);
  // the wheel (spun while it patrols)
  const wb = new BrickBuilder(1);
  wb.add(geo('cylX', () => new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2)), plastic(BK), 0, 0, 0, 0, 0.38, 0.38, 0.32);
  wb.add(geo('cylX', () => new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2)), plastic(C.yellow), 0, 0, 0, 0, 0.18, 0.18, 0.36);
  const wheel = wb.build({ name: 'motobug-wheel' }); wheel.position.set(0, 0.38, 0.35); g.add(wheel);
  const puff = glowSprite(0xcfd8e0, 0.7, 0.5); puff.position.set(0, 0.9, -1.45); g.add(puff);
  g.userData = { body, wheel, puff };
  return g;
}
// a freed Flicky bird (blue, faces +Z)
export function flickyMesh() {
  const b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 0.3, 0x2a6aff);
  b.sphere(0, -0.05, 0.12, 0.2, C.white);
  b.cone(0, 0.0, 0.3, 0.07, 0.18, C.yellow, { seg: 6 });
  for (const sd of [-1, 1]) { b.sphere(sd * 0.12, 0.1, 0.22, 0.05, C.black); b.box(sd * 0.32, -0.02, -0.05, 0.3, 0.05, 0.22, 0x2a6aff); }
  return b.build({ name: 'flicky' });
}

// ---- spin ball: a spiky blue ball (the colour of the driver) with speed blur rings ----------------
export function spinBallMesh(color = 0x1f5fd8) {
  const g = new THREE.Group();
  const b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 1.3, color);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU, y = Math.sin(k * 2.1) * 0.5;
    const d = new THREE.Vector3(Math.sin(a), y, Math.cos(a)).normalize();
    const m = new THREE.Matrix4().compose(d.clone().multiplyScalar(1.05), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d), new THREE.Vector3(0.38, 0.8, 0.38));
    b.addMatrix(geo('cone', () => new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0)), plastic(color), m);
  }
  b.sphere(0, 0.2, 1.05, 0.42, 0xf2c49a);
  const ball = b.build({ name: 'spinball' }); g.add(ball);
  const blur = new THREE.Mesh(geo('blur', () => new THREE.TorusGeometry(1.55, 0.18, 6, 28)), additive(0x7fc4ff, 0.55));
  blur.rotation.y = Math.PI / 2; g.add(blur);
  const blur2 = new THREE.Mesh(geo('blur', () => new THREE.TorusGeometry(1.55, 0.18, 6, 28)), additive(0xffffff, 0.35));
  blur2.rotation.y = Math.PI / 2; blur2.scale.setScalar(0.85); g.add(blur2);
  g.add(glowSprite(0x6ab0ff, 4.2, 0.45));
  g.userData = { ball, blur, blur2 };
  return g;
}

// ---- Lightning Shield: a blue bubble wrapped in flickering yellow arcs -------------------------------
export function thunderShieldMesh() {
  const g = new THREE.Group();
  const bub = new THREE.Mesh(geo('bub', () => new THREE.SphereGeometry(2.7, 24, 16)), mats.bub ||= new THREE.MeshStandardMaterial({ color: 0x6ad0ff, transparent: true, opacity: 0.22, roughness: 0.05, emissive: 0x2a88ff, emissiveIntensity: 0.7, depthWrite: false }));
  g.add(bub);
  // arcs: jagged polylines on the sphere, regenerated by crackle()
  const N = 5, P = 9;
  const pos = new Float32Array(N * (P - 1) * 2 * 3);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(lg, mats.arc ||= new THREE.LineBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  lines.frustumCulled = false;
  g.add(lines);
  g.add(glowSprite(0x7fd0ff, 6.5, 0.35));
  const spark = glowSprite(0xfff27a, 1.4, 0.9); g.add(spark);
  const v = new THREE.Vector3();
  const crackle = () => {
    let o = 0;
    for (let n = 0; n < N; n++) {
      let a = Math.random() * TAU, e = (Math.random() - 0.3) * 1.4;
      let px = 0, py = 0, pz = 0;
      for (let p = 0; p < P; p++) {
        v.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).multiplyScalar(2.72 + Math.random() * 0.25);
        if (p > 0) { pos[o++] = px; pos[o++] = py; pos[o++] = pz; pos[o++] = v.x; pos[o++] = v.y; pos[o++] = v.z; }
        px = v.x; py = v.y; pz = v.z;
        a += 0.25 + Math.random() * 0.2; e += (Math.random() - 0.5) * 0.6;
      }
    }
    lg.attributes.position.needsUpdate = true;
    spark.position.copy(v);
  };
  crackle();
  g.userData = { bub, lines, crackle };
  return g;
}

// ---- the seven Chaos Emeralds on a ring --------------------------------------------------------------
export function emeraldRing(size = 0.42) {
  const g = new THREE.Group();
  const gems = EMERALDS.map((c) => {
    const p = new THREE.Group();
    const m = new THREE.Mesh(gemGeo(), gemMat(c)); m.scale.setScalar(size); p.add(m);
    p.add(glowSprite(c, size * 3.2, 0.55));
    g.add(p);
    return p;
  });
  g.userData = { gems };
  return g;
}

// ---- a gold stud flying to a kart (the Lightning Shield's magnet) -------------------------------------
export function studMesh() {
  return new THREE.Mesh(geo('stud', () => new THREE.CylinderGeometry(0.5, 0.5, 0.26, 14).rotateX(Math.PI / 2)), studGold());
}
