// More procedural creatures for the later years. Each returns { root, anim, parts }
// where anim has set(state), trigger(name) and update(dt, speed) like the originals.
import * as THREE from 'three';
import { glowSprite } from './textures.js';
import { damp, clamp } from './util.js';

const mats = new Map();
function std(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return mats.get(key);
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent?.add(m);
  return m;
}
const glowMat = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const simpleAnim = (update) => ({ state: 'idle', shots: {}, set(s) { this.state = s; }, trigger(n, d = 0.4) { this.shots[n] = d; }, update(dt, sp = 0) { for (const k in this.shots) { this.shots[k] -= dt; if (this.shots[k] <= 0) delete this.shots[k]; } update(this, dt, sp); } });

// ------------------------------------------------------------------ small serpent (Year 2 snake-spawn)
export function makeSnake(color = '#3a5a2a') {
  const root = new THREE.Group();
  const skin = std(color, { roughness: 0.45, metalness: 0.1 });
  const belly = std('#a8a070', { roughness: 0.6 });
  const segs = [];
  let parent = root;
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    g.position.z = i === 0 ? 0 : -0.26;
    parent.add(g);
    const r = 0.13 * (1 - i / 12);
    const m = mesh(new THREE.SphereGeometry(r, 8, 6), i % 3 === 1 ? belly : skin, 0, r, 0, g);
    m.scale.set(1, 0.8, 1.6);
    segs.push(g);
    parent = g;
  }
  const head = segs[0];
  const hm = mesh(new THREE.SphereGeometry(0.15, 10, 8), skin, 0, 0.16, 0.16, head);
  hm.scale.set(1.1, 0.75, 1.5);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.03, 6, 4), glowMat(2, 1.8, 0.2), s * 0.07, 0.22, 0.28, head);
  const anim = simpleAnim((a, dt, sp) => {
    a.t = (a.t || 0) + dt * (2 + sp * 2);
    const lunge = a.shots.bite ? Math.sin((1 - a.shots.bite / 0.4) * Math.PI) : 0;
    segs.forEach((g, i) => { g.rotation.y = Math.sin(a.t * 3 - i * 0.8) * (0.35 + sp * 0.05) * (i ? 1 : 0.3); });
    head.position.y = lunge * 0.3;
    head.rotation.x = -lunge * 0.4;
  });
  return { root, anim, parts: { head }, height: 0.5 };
}

// ------------------------------------------------------------------ the Wyrm of the Undercroft (Year 2 boss)
// Head + neck chain; the body is an instanced chain of segments that follows the head's trail.
export function makeSerpent() {
  const root = new THREE.Group(); // positioned at the head; body segments live in world space
  const skin = new THREE.MeshStandardMaterial({ color: '#2a4a26', roughness: 0.4, metalness: 0.15 });
  const scales = new THREE.MeshStandardMaterial({ color: '#5a7a3a', roughness: 0.5 });
  const head = new THREE.Group();
  head.position.y = 1.6;
  root.add(head);
  const skull = mesh(new THREE.SphereGeometry(1, 16, 12), skin, 0, 0, 0, head);
  skull.scale.set(1.0, 0.7, 1.6);
  const snout = mesh(new THREE.SphereGeometry(0.7, 14, 10), skin, 0, -0.1, 1.2, head);
  snout.scale.set(0.9, 0.55, 1.2);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.35, 0.3);
  head.add(jaw);
  const jm = mesh(new THREE.SphereGeometry(0.75, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), scales, 0, 0, 0.8, jaw);
  jm.scale.set(1, 0.5, 1.5);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 2; k++) mesh(new THREE.ConeGeometry(0.07, 0.4, 6), std('#f0ead8'), s * (0.35 - k * 0.12), -0.35, 1.5 - k * 0.3, head).rotation.x = Math.PI;
    const crest = mesh(new THREE.ConeGeometry(0.15, 0.9, 6), scales, s * 0.55, 0.45, -0.3, head);
    crest.rotation.set(-0.9, 0, s * 0.4);
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 0.3) });
  const eyes = [-1, 1].map((s) => mesh(new THREE.SphereGeometry(0.17, 10, 8), eyeMat, s * 0.58, 0.22, 0.75, head));
  const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(3, 2.4, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  eyeGlow.position.set(0, 0.25, 0.9);
  eyeGlow.scale.setScalar(0.01);
  head.add(eyeGlow);
  // body
  const N = 30;
  const segGeo = new THREE.SphereGeometry(1, 12, 8);
  const body = new THREE.InstancedMesh(segGeo, skin, N);
  body.castShadow = true;
  body.frustumCulled = false;
  const trail = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
  const anim = simpleAnim((a, dt) => {
    a.t = (a.t || 0) + dt;
    const open = a.shots.bite ? Math.sin((1 - a.shots.bite / 0.6) * Math.PI) : a.state === 'roar' ? 0.8 : 0.1 + Math.sin(a.t * 2) * 0.05;
    jaw.rotation.x = open * 0.7;
    eyeGlow.scale.setScalar(a.gaze ? 2 + Math.sin(a.t * 20) * 0.4 : 0.01);
  });
  // call every frame after moving root: lays the body along the trail of head positions
  const layBody = (dt, groundY, submerged) => {
    root.updateMatrixWorld();
    const hp = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld);
    const last = trail[0];
    if (!last || last.distanceTo(hp) > 0.35) { trail.unshift(hp.clone()); if (trail.length > N * 4) trail.pop(); }
    for (let i = 0; i < N; i++) {
      const k = Math.min(trail.length - 1, i * 3 + 2);
      const p = trail[k] || hp;
      const r = 0.95 * (1 - Math.pow(i / N, 1.4) * 0.85);
      const sink = submerged ? -3 : 0;
      _p.set(p.x, Math.max(groundY + r * 0.7 + sink, p.y - i * 0.18 + sink), p.z);
      _e.set(0, Math.atan2((trail[k - 1] || p).x - p.x, (trail[k - 1] || p).z - p.z), 0);
      _q.setFromEuler(_e);
      _m.compose(_p, _q, _s.set(r, r * 0.85, r * 1.6));
      body.setMatrixAt(i, _m);
    }
    body.instanceMatrix.needsUpdate = true;
  };
  return { root, anim, parts: { head, jaw, eyes, eyeGlow }, body, layBody, trail, height: 3 };
}

// ------------------------------------------------------------------ duelling dummy (DADA lessons)
export function makeDummy() {
  const root = new THREE.Group();
  const straw = std('#c8a860', { roughness: 1 });
  const cloth = std('#6a2a2a', { roughness: 0.95 });
  const wood = std('#5a3a20', { roughness: 0.9 });
  const body = new THREE.Group();
  root.add(body);
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.0, 8), wood, 0, 0.5, 0, root);
  mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 10), wood, 0, 0.1, 0, root);
  mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 10), cloth, 0, 1.4, 0, body);
  mesh(new THREE.SphereGeometry(0.22, 10, 8), straw, 0, 2.05, 0, body);
  const arm = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6), straw, 0, 1.6, 0, body);
  arm.rotation.z = Math.PI / 2;
  const target = mesh(new THREE.CircleGeometry(0.14, 16), glowMat(2, 0.4, 0.3), 0, 1.5, 0.29, body);
  const anim = simpleAnim((a, dt) => {
    const h = a.shots.hit ? a.shots.hit / 0.4 : 0;
    a.wob = damp(a.wob || 0, 0, 4, dt) + h * 0.06;
    body.rotation.x = Math.sin((a.t = (a.t || 0) + dt * 12)) * a.wob;
  });
  return { root, anim, parts: { body, target }, height: 2.2 };
}

// ------------------------------------------------------------------ werewolf (Year 3 chase)
export function makeWerewolf() {
  const root = new THREE.Group();
  const fur = std('#5a4a3a', { roughness: 1 });
  const dark = std('#2a2018', { roughness: 1 });
  const body = new THREE.Group(); body.position.y = 1.3; root.add(body);
  const torso = mesh(new THREE.SphereGeometry(0.6, 14, 10), fur, 0, 0.3, 0, body); torso.scale.set(1, 1.3, 0.85);
  const chest = mesh(new THREE.SphereGeometry(0.55, 12, 10), fur, 0, 0.85, 0.15, body); chest.scale.set(1.15, 0.9, 0.9);
  const head = new THREE.Group(); head.position.set(0, 1.3, 0.45); body.add(head);
  mesh(new THREE.SphereGeometry(0.3, 12, 10), fur, 0, 0, 0, head).scale.set(1, 0.9, 1.1);
  const snout = mesh(new THREE.ConeGeometry(0.17, 0.5, 8), dark, 0, -0.05, 0.38, head); snout.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    mesh(new THREE.ConeGeometry(0.08, 0.3, 5), fur, s * 0.17, 0.3, -0.05, head).rotation.z = -s * 0.3;
    mesh(new THREE.SphereGeometry(0.045, 6, 4), glowMat(2.4, 1.6, 0.3), s * 0.11, 0.08, 0.24, head);
  }
  const limbs = [];
  for (const [sx, y, len, isArm] of [[-1, 0.9, 0.9, 1], [1, 0.9, 0.9, 1], [-1, -0.1, 1.0, 0], [1, -0.1, 1.0, 0]]) {
    const g = new THREE.Group(); g.position.set(sx * (isArm ? 0.6 : 0.28), y, isArm ? 0.1 : 0); body.add(g);
    mesh(new THREE.CapsuleGeometry(isArm ? 0.13 : 0.16, len, 4, 8), fur, 0, -len / 2, 0, g);
    for (let k = -1; k <= 1; k++) mesh(new THREE.ConeGeometry(0.03, 0.14, 4), std('#e8e0c0'), k * 0.06, -len - 0.12, 0.08, g).rotation.x = Math.PI;
    limbs.push({ g, isArm, sx });
  }
  const anim = simpleAnim((a, dt, sp) => {
    a.ph = (a.ph || 0) + dt * (2 + sp * 1.1);
    const run = Math.min(1, sp / 8);
    body.rotation.x = run * 0.6 + (a.state === 'howl' ? -0.6 : 0);
    head.rotation.x = a.state === 'howl' ? -0.9 : -run * 0.4;
    for (const l of limbs) l.g.rotation.x = Math.sin(a.ph + (l.sx > 0 ? 0 : Math.PI) + (l.isArm ? Math.PI : 0)) * (0.3 + run * 0.9) - (l.isArm ? run * 0.6 : 0);
    if (a.shots.swipe) limbs[1].g.rotation.x = -2 + (a.shots.swipe / 0.4) * 2;
  });
  return { root, anim, parts: { head, body }, height: 2.4 };
}

// ------------------------------------------------------------------ thestral (carriages from Year 5)
export function makeThestral() {
  const root = new THREE.Group();
  const skin = std('#1a1a1e', { roughness: 0.6 });
  const wingM = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  const body = new THREE.Group(); body.position.y = 1.3; root.add(body);
  mesh(new THREE.CapsuleGeometry(0.32, 1.2, 4, 8), skin, 0, 0, 0, body).rotation.x = Math.PI / 2;
  const neck = new THREE.Group(); neck.position.set(0, 0.2, 0.75); neck.rotation.x = -0.7; body.add(neck);
  mesh(new THREE.CapsuleGeometry(0.12, 0.7, 4, 6), skin, 0, 0.4, 0, neck);
  const head = mesh(new THREE.CapsuleGeometry(0.11, 0.45, 4, 6), skin, 0, 0.85, 0.15, neck); head.rotation.x = 1.6;
  mesh(new THREE.SphereGeometry(0.05, 6, 4), glowMat(2.6, 2.6, 2.6), 0.08, 0.9, 0.2, neck);
  mesh(new THREE.SphereGeometry(0.05, 6, 4), glowMat(2.6, 2.6, 2.6), -0.08, 0.9, 0.2, neck);
  const legs = [];
  for (const [x, z] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]]) { const g = new THREE.Group(); g.position.set(x, -0.1, z); body.add(g); mesh(new THREE.CylinderGeometry(0.04, 0.03, 1.2, 5), skin, 0, -0.6, 0, g); legs.push(g); }
  const wings = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.3, 0.25, 0.2); body.add(g);
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.6, 0.3), new THREE.Vector2(1.9, -0.4), new THREE.Vector2(1.2, -0.6), new THREE.Vector2(0.6, -0.9), new THREE.Vector2(0, -0.5)]);
    const w = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingM); w.rotation.x = -Math.PI / 2; w.scale.x = s;
    g.add(w);
    return g;
  });
  const anim = simpleAnim((a, dt, sp) => {
    a.ph = (a.ph || 0) + dt * (2 + sp);
    legs.forEach((g, i) => (g.rotation.x = Math.sin(a.ph * 2 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.4));
    wings.forEach((g, i) => (g.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(a.ph * 1.5) * 0.15)));
  });
  return { root, anim, height: 2 };
}
