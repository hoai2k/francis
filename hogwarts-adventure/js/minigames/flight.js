// Shared flight controller for the broom (Quidditch) and Hippogriff minigames.
import * as THREE from 'three';
import { G } from '../state.js';
import { clamp, damp, el } from '../util.js';

const _v = new THREE.Vector3();

export class Flight {
  constructor(o) {
    this.pos = o.pos.clone();
    this.yaw = o.yaw || 0;
    this.pitch = 0;
    this.bank = 0;
    this.speed = o.speed || 16;
    this.base = o.speed || 16;
    this.boostSpeed = o.boost || 30;
    this.stamina = 1;
    this.rollT = 0;
    this.rollCd = 0;
    this.iframes = 0;
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.minAlt = o.minAlt ?? 1.5;
    this.maxAlt = o.maxAlt ?? 110;
    this.bounds = o.bounds; // {cx, cz, r}
    this.mount = o.mount; // object3D to place (player root or hippogriff)
    this.turn = o.turn || 1.5;
    this.camDist = o.camDist || 6;
    this.camH = o.camH || 1.8;
    this.boosting = false;
  }
  forward(out = _v) { return out.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }

  update(dt) {
    const I = G.input;
    const S = G.settings;
    const inv = S.invertY ? -1 : 1;
    let steerX = I.move.x, steerY = I.move.y;
    if (I.device === 'pad') { steerX = I.lstick.x; steerY = I.lstick.y * inv; }
    // mouse steering on top
    steerX += I.look.x * 12;
    steerY -= I.look.y * 12 * (I.device === 'touch' ? 0.5 : 1);
    if (I.device === 'pad') { steerX += I.rstick.x * 0.4; }
    steerX = clamp(steerX, -1.3, 1.3);
    steerY = clamp(steerY, -1.3, 1.3);
    const yawRate = -steerX * this.turn;
    this.yaw += yawRate * dt;
    this.pitch = damp(this.pitch, clamp(steerY * 0.85, -0.95, 0.95), 3, dt);
    this.bank = damp(this.bank, clamp(-yawRate * 0.45, -0.8, 0.8), 4, dt);
    // boost
    const wantBoost = I.isHeld('sprint') || I.isHeld('cast') || I.rt > 0.4;
    this.boosting = wantBoost && this.stamina > 0.02;
    this.stamina = clamp(this.stamina + (this.boosting ? -0.32 : 0.16) * dt, 0, 1);
    const brake = I.keys.has('KeyS') && I.device === 'kbm' ? 0 : 0;
    const target = (this.boosting ? this.boostSpeed : this.base) - brake;
    this.speed = damp(this.speed, target, 2.5, dt);
    // barrel roll dodge
    this.rollCd -= dt;
    this.iframes -= dt;
    if (I.isPressed('jump') && this.rollCd <= 0) {
      this.rollT = 0.55; this.rollCd = 1.1; this.iframes = 0.55;
      this.rollDir = steerX >= 0 ? -1 : 1;
      G.audio.sfx('whoosh');
    }
    let rollAng = 0;
    if (this.rollT > 0) { this.rollT -= dt; rollAng = (1 - this.rollT / 0.55) * Math.PI * 2 * this.rollDir; }
    const f = this.forward(new THREE.Vector3());
    this.vel.copy(f).multiplyScalar(this.speed);
    if (this.rollT > 0) this.vel.addScaledVector(new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)), -this.rollDir * 9);
    this.knock.multiplyScalar(Math.exp(-dt * 3));
    this.pos.addScaledVector(this.vel, dt).addScaledVector(this.knock, dt);
    // ground / ceiling
    const col = G.zone.colliders;
    const g = col.terrain ? Math.max(col.terrain(this.pos.x, this.pos.z), -0.8) : 0;
    if (this.pos.y < g + this.minAlt) { this.pos.y = g + this.minAlt; this.pitch = Math.max(this.pitch, 0.15); }
    if (this.pos.y > this.maxAlt) { this.pos.y = this.maxAlt; this.pitch = Math.min(this.pitch, 0); }
    // solid obstacles (towers etc.) push us out
    const p = this.pos.clone();
    col.resolve(p, 0.8, 1.2, -10);
    if (p.distanceToSquared(this.pos) > 0.0001) { this.pos.copy(p); this.speed *= 0.97; }
    if (this.bounds) {
      const dx = this.pos.x - this.bounds.cx, dz = this.pos.z - this.bounds.cz, d = Math.hypot(dx, dz);
      if (d > this.bounds.r) {
        this.pos.x = this.bounds.cx + (dx / d) * this.bounds.r; this.pos.z = this.bounds.cz + (dz / d) * this.bounds.r;
        // steer back inward
        const want = Math.atan2(-dx, -dz);
        let dd = want - this.yaw; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2;
        this.yaw += dd * Math.min(1, dt * 2);
        this.edge = true;
      } else this.edge = false;
    }
    // place the mount
    if (this.mount) {
      this.mount.position.copy(this.pos);
      this.mount.rotation.set(0, 0, 0);
      this.mount.rotation.order = 'YXZ';
      this.mount.rotation.y = this.yaw;
      this.mount.rotation.x = -this.pitch * 0.8;
      this.mount.rotation.z = this.bank + rollAng;
    }
    // chase camera
    const back = this.forward(new THREE.Vector3()).multiplyScalar(-1);
    const camPos = this.pos.clone().addScaledVector(back, this.camDist + (this.boosting ? 1.2 : 0)).add(new THREE.Vector3(0, this.camH, 0));
    const cg = col.terrain ? col.terrain(camPos.x, camPos.z) + 0.8 : 0;
    if (camPos.y < cg) camPos.y = cg;
    const look = this.pos.clone().addScaledVector(this.forward(new THREE.Vector3()), 12).add(new THREE.Vector3(0, 0.8, 0));
    G.cam.setCinematic(camPos, look, 8);
    G.player.fovKick = this.boosting ? 14 : 4;
    G.camera.fov = damp(G.camera.fov, 62 + (this.boosting ? 16 : 0), 4, dt);
    G.camera.updateProjectionMatrix();
    G.audio.wind(0.25 + (this.speed / this.boostSpeed) * 0.75);
    // speed streaks
    if (this.boosting && Math.random() < 0.8) {
      const fwd = this.forward(new THREE.Vector3());
      const at = this.pos.clone().addScaledVector(fwd, 14).add(new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 10));
      G.fx.emit({ pos: at, color: 0xffffff, count: 1, speed: 0.1, size: 0.12, size1: 0.05, life: 0.5, intensity: 1.5, vel: fwd.multiplyScalar(-this.speed * 1.2), noScale: true });
    }
  }
}

// Screen-space marker for a world target during flight minigames.
export class FlightMarker {
  constructor(label = '') {
    this.el = el('div', 'fmarker', `<div class="fm-ring"></div><div class="fm-label">${label}</div>`);
    document.getElementById('hud').appendChild(this.el);
  }
  set(pos, label) {
    if (!pos) { this.el.classList.add('hidden'); return; }
    this.el.classList.remove('hidden');
    const s = G.ui.project(pos);
    let x = s.x, y = s.y;
    const pad = 46;
    const off = s.behind || x < pad || x > innerWidth - pad || y < pad || y > innerHeight - pad;
    if (s.behind) { x = innerWidth - x; y = innerHeight - y; }
    if (off) {
      const cx = innerWidth / 2, cy = innerHeight / 2;
      const a = Math.atan2(y - cy, x - cx);
      const r = Math.min(innerWidth, innerHeight) * 0.42;
      x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r;
      this.el.style.setProperty('--rot', a + Math.PI / 2 + 'rad');
    }
    this.el.classList.toggle('off', off);
    this.el.style.transform = `translate(${x}px, ${y}px)`;
    if (label != null) this.el.querySelector('.fm-label').textContent = label;
  }
  remove() { this.el.remove(); }
}

// A glowing ring to fly through.
export function makeRing(radius = 2.4, color = 0xffc850) {
  const g = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.16, 10, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.5) }));
  const inner = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.add(torus, inner);
  g.userData = { torus, inner, radius };
  return g;
}
// did a moving point pass through the ring's disc this frame?
export function passedRing(ring, prev, cur) {
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(ring.quaternion);
  const c = ring.position;
  const d0 = _v.subVectors(prev, c).dot(n);
  const d1 = new THREE.Vector3().subVectors(cur, c).dot(n);
  if (Math.sign(d0) === Math.sign(d1) && Math.abs(d1) > 0.6) return false;
  const t = d0 / (d0 - d1 || 1e-6);
  const hit = prev.clone().lerp(cur, clamp(t, 0, 1));
  return hit.distanceTo(c) < ring.userData.radius * 1.15;
}
