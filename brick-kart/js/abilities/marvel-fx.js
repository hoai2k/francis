// Shared visuals for the Marvel abilities: brick-built Mjolnir, Cap's shield, web ball /
// web net / web trap, the Infinity Gauntlet, crackling lightning bolts and a pool of tiny
// "brick dust" plates for the snap. Mesh templates are built once and cloned (clones share
// geometry and materials, so removing them from the scene is all the cleanup they need).
import * as THREE from 'three';
import { BrickBuilder, C, plastic, brickGeometry } from '../lego.js';

const UP = new THREE.Vector3(0, 1, 0);
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tD = new THREE.Vector3();
const tM = new THREE.Matrix4(), tQ = new THREE.Quaternion(), tS = new THREE.Vector3(), tE = new THREE.Euler();

export const STEEL = 0xb8bec6;
const STONES = [0x8a2be2, 0x1e6bff, 0xe0201a, 0xff8a10, 0x22c24a, 0xffd21a]; // power space reality soul time mind

function m4(x, y, z, rx, ry, rz, sx, sy, sz) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}
const glowMat = (color, opacity = 0.5) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

// ---- Mjolnir -------------------------------------------------------------------------
let hammerT = null;
export function hammerMesh() {
  if (!hammerT) {
    const b = new BrickBuilder(1);
    const steel = plastic(STEEL, { metal: 0.55, rough: 0.28 });
    const dark = plastic(0x7d848c, { metal: 0.5, rough: 0.35 });
    // handle (pivot of the spin is around the head/handle joint, so build it centred there)
    b.cyl(0, -1.75, 0, 0.17, 1.75, C.rbrown, { seg: 10 });
    for (let k = 0; k < 5; k++) b.cyl(0, -1.6 + k * 0.3, 0, 0.2, 0.12, C.brown, { seg: 10 });
    b.cyl(0, -1.95, 0, 0.25, 0.22, 0x7d848c, { seg: 10, mat: dark });
    b.boxM(m4(0, -2.25, 0, 0, 0, 0, 0.08, 0.5, 0.36), C.brown);     // wrist strap
    // head: a chunky steel block with lighter end caps and a stud row on top
    b.box(0, 0, 0, 1.0, 1.0, 1.7, STEEL, { mat: steel });
    for (const s of [-1, 1]) b.box(0, -0.06, s * 0.9, 1.12, 1.12, 0.14, 0, { mat: dark });
    for (const s of [-1, 1]) b.box(0, 0.42, s * 0.42, 1.04, 0.1, 0.1, 0, { mat: dark });
    for (const s of [-1, 1]) b.cyl(0, 1.0, s * 0.42, 0.24, 0.14, 0, { mat: steel, seg: 12 });
    const inner = b.build({ name: 'mjolnir' });
    inner.position.y = -0.3;   // spin about a point just under the head
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 10), glowMat(0x8fd8ff, 0.2));
    glow.position.y = 0.2;
    glow.name = 'glow';
    const spin = new THREE.Group(); spin.name = 'spin';
    spin.add(inner, glow);
    spin.scale.setScalar(1.25);
    hammerT = new THREE.Group();
    hammerT.add(spin);
  }
  const g = hammerT.clone();
  g.userData.spin = g.getObjectByName('spin');
  g.userData.glow = g.getObjectByName('glow');
  return g;
}

// ---- Captain America's shield ----------------------------------------------------------
let shieldT = null;
function shieldTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), m = 128;
  [['#c4141c', 1], ['#f4f4f4', 0.8], ['#c4141c', 0.6], ['#1f3a93', 0.4]].forEach(([col, f]) => { g.fillStyle = col; g.beginPath(); g.arc(m, m, m * f, 0, 7); g.fill(); });
  g.fillStyle = '#f4f4f4'; g.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? m * 0.15 : m * 0.37; g.lineTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr); }
  g.fill();
  // a few highlight scratches so it reads as metal
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 6; g.beginPath(); g.arc(m, m, m * 0.9, 3.6, 4.4); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export function shieldMesh() {
  if (!shieldT) {
    const top = new THREE.MeshStandardMaterial({ map: shieldTexture(), metalness: 0.35, roughness: 0.3, emissive: 0x222222 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.4, 0.24, 30), [plastic(STEEL, { metal: 0.5, rough: 0.3 }), top, plastic(0x8a9098, { metal: 0.4 })]);
    disc.castShadow = true;
    // a soft white-blue glint so it stays readable at speed
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.3, 30).rotateX(-Math.PI / 2), glowMat(0xbfe0ff, 0.35));
    halo.name = 'halo';
    const spin = new THREE.Group(); spin.name = 'spin';
    spin.add(disc, halo);
    spin.scale.setScalar(1.2);
    const tilt = new THREE.Group(); tilt.name = 'tilt';
    tilt.add(spin);
    shieldT = new THREE.Group();
    shieldT.add(tilt);
  }
  const g = shieldT.clone();
  g.userData.spin = g.getObjectByName('spin');
  g.userData.tilt = g.getObjectByName('tilt');
  return g;
}

// ---- Spider-Man webs -------------------------------------------------------------------
let ballT = null, netT = null, trapT = null;
const WEB = 0xf4f4f4;
export function webBallMesh() {
  if (!ballT) {
    const b = new BrickBuilder(1);
    b.sphere(0, -0.75, 0, 0.75, WEB);
    for (let k = 0; k < 4; k++) b.boxM(m4(0, 0, 0, 0, k * Math.PI / 4, 0, 0.12, 1.75, 1.7), 0xdfe6ee);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.boxM(m4(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8, 0, -a, 0.6, 0.1, 0.9, 0.1), WEB); }
    const inner = b.build({ name: 'webball' });
    const spin = new THREE.Group(); spin.name = 'spin'; spin.add(inner);
    spin.scale.setScalar(1.35);
    ballT = new THREE.Group(); ballT.add(spin);
  }
  const g = ballT.clone();
  g.userData.spin = g.getObjectByName('spin');
  return g;
}
// a dome of web strands that wraps a kart (about 4 wide x 5.6 long x 2.8 tall)
export function webNetMesh() {
  if (!netT) {
    const b = new BrickBuilder(1);
    const RX = 2.3, RZ = 3.0, H = 2.9, RIB = 10;
    const pt = (a, e) => tA.set(Math.cos(a) * Math.cos(e) * RX, Math.sin(e) * H, Math.sin(a) * Math.cos(e) * RZ);
    const strand = (p, q, w = 0.12) => {
      const len = tD.subVectors(q, p).length();
      tQ.setFromUnitVectors(UP, tD.normalize());
      b.boxM(new THREE.Matrix4().compose(tB.addVectors(p, q).multiplyScalar(0.5).clone(), tQ.clone(), new THREE.Vector3(w, len + 0.06, w)), WEB);
    };
    // ribs from the ground to the top
    for (let r = 0; r < RIB; r++) {
      const a = r / RIB * Math.PI * 2;
      for (let s = 0; s < 4; s++) { const p = pt(a, s / 4 * Math.PI / 2).clone(); strand(p, pt(a, (s + 1) / 4 * Math.PI / 2).clone()); }
    }
    // sagging rings between the ribs
    for (const e of [0.18, 0.62, 1.05]) {
      for (let r = 0; r < RIB; r++) {
        const a0 = r / RIB * Math.PI * 2, a1 = (r + 1) / RIB * Math.PI * 2;
        const p = pt(a0, e).clone(), q = pt(a1, e).clone();
        const mid = pt((a0 + a1) / 2, e - 0.09).clone();
        strand(p, mid, 0.1); strand(mid, q, 0.1);
      }
    }
    // blobs where strands stick to the kart
    for (let r = 0; r < RIB; r += 2) { const p = pt(r / RIB * Math.PI * 2, 0.05); b.sphere(p.x, p.y, p.z, 0.22, WEB); }
    b.sphere(0, H - 0.25, 0, 0.32, WEB);
    netT = new THREE.Group();
    const inner = b.build({ name: 'webnet', shadows: false });
    netT.add(inner);
  }
  return netT.clone();
}
// a flat web stuck to the road (radius ~2.9)
export function webTrapMesh() {
  if (!trapT) {
    const b = new BrickBuilder(1);
    const R = 2.9, SP = 12;
    for (let k = 0; k < SP; k++) { const a = k / SP * Math.PI * 2; b.boxM(m4(Math.cos(a) * R / 2, 0.08, Math.sin(a) * R / 2, 0, -a, 0, R, 0.16, 0.2), WEB); }
    for (const rr of [0.7, 1.35, 2.0, 2.65]) {
      for (let k = 0; k < SP; k++) {
        const a0 = k / SP * Math.PI * 2, a1 = (k + 1) / SP * Math.PI * 2, am = (a0 + a1) / 2, r2 = rr * 0.9;
        const p = new THREE.Vector3(Math.cos(a0) * rr, 0.07, Math.sin(a0) * rr), q = new THREE.Vector3(Math.cos(a1) * rr, 0.07, Math.sin(a1) * rr);
        const m = new THREE.Vector3(Math.cos(am) * r2, 0.07, Math.sin(am) * r2);
        for (const [u, v] of [[p, m], [m, q]]) {
          const len = tD.subVectors(v, u).length();
          b.boxM(m4((u.x + v.x) / 2, 0.09, (u.z + v.z) / 2, 0, -Math.atan2(tD.z, tD.x), 0, len + 0.05, 0.14, 0.16), WEB);
        }
      }
    }
    b.cyl(0, 0, 0, 0.35, 0.18, WEB);
    const inner = b.build({ name: 'webtrap', shadows: false });
    // a faint white sheen so the trap reads on any road colour
    const sheen = new THREE.Mesh(new THREE.CircleGeometry(R + 0.2, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }));
    sheen.position.y = 0.04;
    trapT = new THREE.Group(); trapT.add(sheen, inner);
  }
  return trapT.clone();
}

// a web line from the shooter's hand to the ball (one thin cylinder; own material for fading)
const LINE_GEO = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true).translate(0, 0.5, 0);
export function strandLine(scene) {
  const m = new THREE.Mesh(LINE_GEO, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
  m.frustumCulled = false;
  scene.add(m);
  return m;
}
export function stretch(mesh, a, b, w) {
  const len = tD.subVectors(b, a).length() || 0.001;
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(UP, tD.multiplyScalar(1 / len));
  mesh.scale.set(w, len, w);
}

// ---- Infinity Gauntlet ----------------------------------------------------------------
let gauntT = null;
export function gauntletMesh() {
  if (!gauntT) {
    const gold = plastic(0xe8b830, { metal: 0.6, rough: 0.25 });
    const goldDk = plastic(0xb88a1a, { metal: 0.6, rough: 0.3 });
    const b = new BrickBuilder(1);
    // cuff + palm (the back of the hand faces +z, stones on it)
    b.cyl(0, -1.6, 0, 0.95, 1.0, 0, { mat: goldDk, seg: 16 });
    b.cyl(0, -0.75, 0, 0.82, 0.25, 0, { mat: gold, seg: 16 });
    b.box(0, -0.5, 0, 1.7, 1.6, 0.8, 0, { mat: gold });
    // fingers (index, ring, pinky up; middle curled for the snap; thumb across)
    const fx = [-0.62, -0.2, 0.22, 0.62];
    fx.forEach((x, k) => {
      if (k === 1) { b.boxM(m4(x, 1.25, 0.2, 1.1, 0, 0, 0.38, 0.7, 0.4), 0, { mat: gold }); return; }
      const len = k === 3 ? 0.9 : 1.15;
      b.boxM(m4(x, 1.1 + len / 2 - 0.05, 0, 0, 0, 0, 0.36, len, 0.4), 0, { mat: gold });
      b.boxM(m4(x, 1.12, 0.02, 0, 0, 0, 0.4, 0.12, 0.44), 0, { mat: goldDk });
    });
    b.boxM(m4(-0.95, 0.75, 0.25, 0.4, 0, 0.75, 0.38, 1.0, 0.4), 0, { mat: gold });
    const inner = b.build({ name: 'gauntlet' });
    const stones = new BrickBuilder(1);
    // five knuckle stones + the big one on the back of the hand
    fx.forEach((x, k) => stones.sphere(x, 0.95, 0.42, 0.17, 0, { mat: plastic(STONES[k], { emissive: STONES[k], emissiveIntensity: 1.6 }) }));
    stones.sphere(-0.95, 0.65, 0.48, 0.16, 0, { mat: plastic(STONES[4], { emissive: STONES[4], emissiveIntensity: 1.6 }) });
    stones.sphere(0, -0.15, 0.42, 0.34, 0, { mat: plastic(STONES[5], { emissive: STONES[5], emissiveIntensity: 1.8 }), sy: 1.25 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), glowMat(0xffc840, 0.28));
    glow.name = 'glow';
    const hand = new THREE.Group(); hand.name = 'hand';
    hand.add(inner, stones.build({ name: 'stones', shadows: false }), glow);
    gauntT = new THREE.Group(); gauntT.add(hand);
  }
  const g = gauntT.clone();
  g.userData.hand = g.getObjectByName('hand');
  g.userData.glow = g.getObjectByName('glow');
  return g;
}

// ---- lightning --------------------------------------------------------------------------
// A jagged bolt of n cylinder segments (white core + coloured glow), re-jagged on demand.
const BOLT_GEO = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true).translate(0, 0.5, 0);
export class Bolt {
  constructor(scene, color = 0x8fd8ff, n = 8, width = 0.22) {
    this.scene = scene; this.n = n; this.width = width;
    this.core = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    this.glow = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    this.group = new THREE.Group();
    this.cores = []; this.glows = [];
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(BOLT_GEO, this.core), g = new THREE.Mesh(BOLT_GEO, this.glow);
      c.frustumCulled = g.frustumCulled = false;
      this.cores.push(c); this.glows.push(g); this.group.add(c, g);
    }
    this.pts = Array.from({ length: n + 1 }, () => new THREE.Vector3());
    scene.add(this.group);
  }
  // re-jag between a and b; jitter = max sideways wander
  set(a, b, jitter = 1.5) {
    const n = this.n, P = this.pts;
    for (let i = 0; i <= n; i++) {
      const t = i / n, env = Math.sin(t * Math.PI) * jitter;
      P[i].lerpVectors(a, b, t);
      // zig-zag: alternate sides so it reads as lightning, not a wobbly beam
      if (i > 0 && i < n) { const s = (i % 2 ? 1 : -1) * (0.5 + Math.random() * 0.5); P[i].x += s * env * (Math.random() < 0.5 ? 1 : -1) * 0.6 + (Math.random() - 0.5) * env; P[i].y += (Math.random() - 0.5) * 0.8 * env; P[i].z += (Math.random() - 0.5) * 2 * env; }
    }
    for (let i = 0; i < n; i++) {
      const w = this.width * (0.7 + Math.random() * 0.6);
      stretch(this.cores[i], P[i], P[i + 1], w);
      stretch(this.glows[i], P[i], P[i + 1], w * 2.4);
    }
    return this;
  }
  fade(o) { this.core.opacity = Math.max(0, o); this.glow.opacity = Math.max(0, o) * 0.4; this.group.visible = o > 0.01; }
  dispose() { this.scene.remove(this.group); this.core.dispose(); this.glow.dispose(); }
}

// ---- brick dust ---------------------------------------------------------------------------
// One pool of tiny 1x1 plates per scene, shared by every snap; it is an ability entity that
// lives while any dust is flying and then removes itself.
const pools = new WeakMap();
export function dustPool(ctx) {
  let p = pools.get(ctx.scene);
  if (p && !p.dead) return p;
  p = new DustPool(ctx);
  pools.set(ctx.scene, p);
  ctx.spawn(p);
  return p;
}
class DustPool {
  constructor(ctx) {
    const N = this.N = 900;
    this.ctx = ctx;
    this.mesh = new THREE.InstancedMesh(brickGeometry(1, 1, 1, 0.34, true, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    const col = new THREE.Color(1, 1, 1);
    for (let i = 0; i < N; i++) { this.mesh.setMatrixAt(i, tM.makeScale(0, 0, 0)); this.mesh.setColorAt(i, col); }
    this.pos = new Float32Array(N * 3); this.vel = new Float32Array(N * 3); this.rot = new Float32Array(N * 3);
    this.life = new Float32Array(N); this.max = new Float32Array(N); this.size = new Float32Array(N);
    this.cursor = 0; this.alive = 0; this.idle = 0; this.dead = false;
    this.col = col;
    ctx.scene.add(this.mesh);
  }
  emit(x, y, z, vx, vy, vz, color, life = 1, size = 1) {
    const i = this.cursor++ % this.N, j = i * 3;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z;
    this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.rot[j] = Math.random() * 6; this.rot[j + 1] = Math.random() * 6; this.rot[j + 2] = Math.random() * 6;
    this.life[i] = this.max[i] = life; this.size[i] = size;
    this.mesh.setColorAt(i, this.col.setHex(color));
    this.mesh.instanceColor.needsUpdate = true;
    this.idle = 0;
  }
  update(dt) {
    let n = 0;
    const P = this.pos, V = this.vel, R = this.rot;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.mesh.setMatrixAt(i, tM.makeScale(0, 0, 0)); continue; }
      n++;
      const j = i * 3, drag = Math.exp(-0.8 * dt);
      V[j] *= drag; V[j + 1] = V[j + 1] * drag + 1.2 * dt; V[j + 2] *= drag;   // floats up like ash
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      R[j] += dt * 5; R[j + 1] += dt * 3.3;
      const f = this.life[i] / this.max[i];
      tM.compose(tA.set(P[j], P[j + 1], P[j + 2]), tQ.setFromEuler(tE.set(R[j], R[j + 1], R[j + 2])), tS.setScalar(this.size[i] * Math.min(1, f * 2.5)));
      this.mesh.setMatrixAt(i, tM);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.idle = n ? 0 : this.idle + dt;
    return this.idle < 1.5;
  }
  dispose() { this.dead = true; this.ctx.scene.remove(this.mesh); this.mesh.material.dispose(); this.mesh.dispose(); }
}

export { STONES };
