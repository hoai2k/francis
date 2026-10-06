// Third-person over-the-shoulder camera with collision, lock-on framing,
// trauma-based screen shake and cinematic overrides for dialogue/minigames.
import * as THREE from 'three';
import { G } from './state.js';
import { clamp, damp, dampAngle, noise2, lerp } from './util.js';

const _v = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.yaw = Math.PI;
    this.pitch = -0.15;
    this.dist = 4.6;
    this.curDist = 4.6;
    this.shoulder = 0.55;
    this.trauma = 0;
    this.fovKick = 0;
    this.baseFov = 60;
    this.target = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.cine = null; // {pos, look, lerp}
    this.lockTarget = null;
    this.recenter = 0;
  }
  shake(amount) { if (G.settings?.shake !== false) this.trauma = Math.min(1, this.trauma + amount); }
  forward(out = _v) { return out.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  snap() {
    const p = G.player;
    if (!p) return;
    this.yaw = p.yaw;
    this.pitch = -0.12;
    this.update(0, true);
  }
  setCinematic(pos, look, speed = 3, snap = false) {
    this.cine = pos ? { pos: pos.clone(), look: look.clone(), speed } : null;
    if (pos && (snap || speed >= 50)) { this.pos.copy(pos); this.lookAt.copy(look); }
  }

  update(dt, instant = false) {
    const I = G.input;
    const cam = this.cam;
    if (this.cine) {
      const k = instant ? 1 : 1 - Math.exp(-this.cine.speed * dt);
      this.pos.lerp(this.cine.pos, k);
      this.lookAt.lerp(this.cine.look, k);
      cam.position.copy(this.pos);
      cam.lookAt(this.lookAt);
      this._applyShake(dt);
      return;
    }
    const p = G.player;
    if (!p) return;
    if (G.mode === 'play' && !G.paused && !p.flying && !G.ui.wheel) {
      this.yaw -= I.look.x;
      this.pitch = clamp(this.pitch - I.look.y, -1.2, 0.85);
    }
    // lock-on: steer yaw toward the target
    const lt = this.lockTarget;
    if (lt && lt.alive) {
      _d.subVectors(lt.pos, p.pos);
      const want = Math.atan2(_d.x, _d.z);
      this.yaw = dampAngle(this.yaw, want, 8, dt);
      const flat = Math.hypot(_d.x, _d.z);
      this.pitch = damp(this.pitch, clamp(Math.atan2(_d.y + lt.height * 0.5 - 1.6, flat) - 0.15, -0.6, 0.4), 5, dt);
    } else if (lt) this.lockTarget = null;
    // recenter behind the player (R3)
    if (I.isPressed('recenter')) this.recenter = 0.4;
    if (this.recenter > 0) {
      this.recenter -= dt;
      this.yaw = dampAngle(this.yaw, p.yaw, 12, dt);
    }
    const aiming = p.aiming;
    const wantDist = (aiming ? 3.3 : this.dist) * (p.flying ? 1.6 : 1);
    this.curDist = damp(this.curDist, wantDist, 6, dt);
    // pivot: above the player's shoulder
    const h = p.flying ? 1.5 : 1.55;
    this.target.set(p.pos.x, p.pos.y + h, p.pos.z);
    if (!instant) this._smooth = this._smooth ? this._smooth.lerp(this.target, 1 - Math.exp(-20 * dt)) : this.target.clone();
    else this._smooth = this.target.clone();
    const f = this.forward(_t);
    const right = _d.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const pivot = _v.copy(this._smooth).addScaledVector(right, this.shoulder * (p.flying ? 0 : 1));
    const back = f.clone().multiplyScalar(-1);
    // collision
    let dist = this.curDist;
    const col = G.zone?.colliders;
    if (col) {
      const hit = col.raycast(pivot, back, dist + 0.3, { skipThin: true });
      if (hit < dist + 0.3) dist = Math.max(0.6, hit - 0.35);
    }
    this.pos.copy(pivot).addScaledVector(back, dist);
    // keep above terrain
    if (col && col.terrain) {
      const gy = col.terrain(this.pos.x, this.pos.z) + 0.4;
      if (this.pos.y < gy) this.pos.y = gy;
    }
    cam.position.copy(this.pos);
    this.lookAt.copy(pivot).addScaledVector(f, 10);
    cam.lookAt(this.lookAt);
    // FOV kick for sprint/dodge/boost
    this.fovKick = damp(this.fovKick, p.fovKick || 0, 6, dt);
    cam.fov = this.baseFov + this.fovKick;
    cam.updateProjectionMatrix();
    this._applyShake(dt);
  }

  _applyShake(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const s = this.trauma * this.trauma;
    if (s > 0.0001) {
      const t = G.realTime * 25;
      this.cam.rotation.z += (noise2(t, 1) - 0.5) * 0.1 * s;
      this.cam.rotateX((noise2(t, 7) - 0.5) * 0.08 * s);
      this.cam.rotateY((noise2(t, 13) - 0.5) * 0.08 * s);
    }
  }
}
