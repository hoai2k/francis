// Minecraft Dungeons-style camera: narrow-FOV perspective at ~50° pitch and
// 45° yaw, damped follow with a dead zone and look-ahead, zoom, optional 90°
// rotation, trauma-based screen shake and scripted cinematic moves.
import * as THREE from 'three/webgpu';
import { clamp, damp, noise1, lerp, smooth } from './util.js';

const DEG = Math.PI / 180;

export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(35, aspect, 0.5, 220);
    this.yawBase = 45 * DEG; this.yawSteps = 0; this.yaw = 45 * DEG;
    this.pitch = 50 * DEG;
    this.minDist = 12; this.maxDist = 42;
    this.zoomTarget = 22; this.dist = 22;
    this.focus = new THREE.Vector3(); this.dead = new THREE.Vector3();
    this.look = new THREE.Vector3(); this.lookTarget = new THREE.Vector3();
    this.trauma = 0; this.shakeScale = 1; this.t = 0;
    this.cine = null;            // active cinematic
    this.cineBlend = 0;
    this.extraDist = 0;
    this._v = new THREE.Vector3(); this._ray = new THREE.Raycaster();
    this.initialized = false;
  }
  get forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  get right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
  // Convert a 2D input (x right, y up on screen) to a world XZ direction.
  screenToWorldDir(x, y, out = new THREE.Vector3()) {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    out.set(x * c - y * s, 0, -x * s - y * c);
    return out;
  }
  rotate(dir) { this.yawSteps += dir; }
  zoom(delta) { this.zoomTarget = clamp(this.zoomTarget + delta, this.minDist, this.maxDist); }
  addTrauma(a) { this.trauma = Math.min(1, this.trauma + a); }
  snap(pos) { this.focus.copy(pos); this.dead.copy(pos); this.initialized = true; }

  // type: 'orbit' (domain expansion), 'push' (boss intro / photo)
  cinematic(opts) { this.cine = { t: 0, dur: 3, dist: 13, pitch: 38 * DEG, orbit: 0.6, ...opts }; }

  update(dt, players, realDt = dt) {
    this.t += realDt;
    // ---- follow target: centroid of living players
    const alive = players.filter((p) => !p.dead);
    const list = alive.length ? alive : players;
    const c = this._v.set(0, 0, 0);
    let spread = 0;
    const la = new THREE.Vector3();
    for (const p of list) { c.add(p.pos); la.addScaledVector(p.vel, 0.28); la.addScaledVector(p.aimDir, p.aiming ? 1.4 : 0.6); }
    if (list.length) { c.divideScalar(list.length); la.divideScalar(list.length); }
    for (const p of list) spread = Math.max(spread, Math.hypot(p.pos.x - c.x, p.pos.z - c.z));
    la.y = 0; if (la.length() > 3) la.setLength(3);
    if (!this.initialized) this.snap(c);
    // dead zone: ignore tiny moves so the frame doesn't jitter
    const dz = 0.35;
    const off = c.clone().sub(this.dead);
    const offH = Math.hypot(off.x, off.z);
    if (offH > dz) { const k = (offH - dz) / offH; this.dead.x += off.x * k; this.dead.z += off.z * k; }
    this.dead.y = damp(this.dead.y, c.y, 5, realDt);
    this.lookTarget.copy(la);
    this.look.x = damp(this.look.x, la.x, 2.5, realDt); this.look.z = damp(this.look.z, la.z, 2.5, realDt);
    const goal = this.dead.clone().add(this.look);
    this.focus.x = damp(this.focus.x, goal.x, 5.5, realDt);
    this.focus.z = damp(this.focus.z, goal.z, 5.5, realDt);
    this.focus.y = damp(this.focus.y, goal.y, 4, realDt);
    // ---- zoom (co-op pulls the camera back to fit everyone)
    const fit = Math.max(0, spread * 1.5 - 4);
    const want = clamp(this.zoomTarget + fit + this.extraDist, this.minDist, this.maxDist + 14);
    this.dist = damp(this.dist, want, 4, realDt);
    // ---- rotation
    const yawGoal = this.yawBase + this.yawSteps * 90 * DEG;
    this.yaw = damp(this.yaw, yawGoal, 7, realDt);
    let yaw = this.yaw, pitch = this.pitch, dist = this.dist;
    const focus = this.focus.clone();
    // ---- cinematic override
    if (this.cine) {
      const k = this.cine;
      k.t += realDt;
      const inT = Math.min(1, k.t / 0.6), outT = Math.min(1, Math.max(0, (k.dur - k.t) / 0.8));
      const w = smooth(Math.min(inT, outT));
      this.cineBlend = w;
      if (k.center) focus.lerp(k.center, w);
      yaw += (k.orbit || 0) * k.t * w;
      pitch = lerp(pitch, k.pitch, w);
      dist = lerp(dist, k.dist, w);
      if (k.t >= k.dur) { this.cine = null; this.cineBlend = 0; }
    }
    // ---- place camera
    const cp = Math.cos(pitch);
    const pos = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp).multiplyScalar(dist).add(focus);
    this.camera.position.copy(pos);
    this.camera.lookAt(focus.x, focus.y + 0.8, focus.z);
    // ---- shake (trauma²)
    this.trauma = Math.max(0, this.trauma - realDt * 1.5);
    const sh = this.trauma * this.trauma * this.shakeScale;
    if (sh > 0.0001) {
      const tt = this.t * 28;
      this.camera.rotateX(noise1(tt) * 0.035 * sh);
      this.camera.rotateY(noise1(tt + 50) * 0.035 * sh);
      this.camera.rotateZ(noise1(tt + 100) * 0.05 * sh);
    }
    this.camera.updateMatrixWorld();
  }
  // Ray from normalised device coords to the horizontal plane y = h.
  groundPoint(ndcX, ndcY, h, out = new THREE.Vector3()) {
    this._ray.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const r = this._ray.ray;
    const t = (h - r.origin.y) / (r.direction.y || -1e-6);
    return out.copy(r.origin).addScaledVector(r.direction, Math.max(0, t));
  }
}
