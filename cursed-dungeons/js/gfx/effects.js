// High-level visual effects built from particles, pooled meshes and lights:
// hit sparks, shockwave rings, slash arcs, damage numbers, dust, splashes,
// ambient biome particles and screen-space grading pulses.
import * as THREE from 'three/webgpu';
import { uniform, uv, vec3, vec4, float, smoothstep, length, sin, atan, mix, abs, fract, positionLocal } from 'three/tsl';
import { Grade } from './renderer.js';
import { U } from './materials.js';

const tmp = new THREE.Vector3();

// Pool of expanding ground rings / arcs driven by per-mesh uniforms.
class RingPool {
  constructor(scene, n, additive = true) {
    this.items = [];
    for (let i = 0; i < n; i++) {
      const prog = uniform(0), col = uniform(new THREE.Color()), thick = uniform(0.15), arc = uniform(1);
      const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, fog: false });
      const p = uv().sub(0.5).mul(2); const r = length(p);
      const edge = float(1).sub(thick);
      const ring = smoothstep(edge.sub(0.08), edge, r).mul(smoothstep(1.0, 0.94, r));
      const ang = atan(p.y, p.x).div(Math.PI * 2).add(0.5);
      const arcMask = smoothstep(arc, arc.sub(0.05), abs(ang.sub(0.5)).mul(2));
      const a = ring.mul(float(1).sub(prog)).mul(arcMask);
      m.colorNode = vec4(vec3(col).mul(a).mul(2.5), a);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
      mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 15; mesh.frustumCulled = false;
      scene.add(mesh);
      this.items.push({ mesh, prog, col, thick, arc, t: 0, dur: 0.4, r0: 0.2, r1: 3, active: false });
    }
    this.i = 0;
  }
  spawn(pos, { color = 0xffffff, r0 = 0.2, r1 = 3, dur = 0.35, thick = 0.12, arc = 1, rotY = 0, tilt = null } = {}) {
    const it = this.items[this.i]; this.i = (this.i + 1) % this.items.length;
    it.active = true; it.t = 0; it.dur = dur; it.r0 = r0; it.r1 = r1;
    it.col.value.set(color); it.thick.value = thick; it.arc.value = arc;
    it.mesh.position.copy(pos); it.mesh.visible = true;
    it.mesh.rotation.set(-Math.PI / 2, 0, rotY);
    if (tilt) it.mesh.quaternion.copy(tilt);
    return it;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.active) continue;
      it.t += dt; const k = Math.min(1, it.t / it.dur);
      const e = 1 - Math.pow(1 - k, 3);
      it.mesh.scale.setScalar(it.r0 + (it.r1 - it.r0) * e);
      it.prog.value = k;
      if (k >= 1) { it.active = false; it.mesh.visible = false; }
    }
  }
}

export class Effects {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    this.rings = new RingPool(scene, 24, true);
    this.arcs = new RingPool(scene, 16, true);
    this.darkRings = new RingPool(scene, 8, false);
    this.numbers = [];
    this.numLayer = document.getElementById('dmg-layer');
    this.ambientT = 0;
    this.flashT = 0; this.flashDur = 0; this.bfT = 0; this.waveT = -1; this.dimTarget = 0;
  }
  get p() { return this.game.particles; }

  // ---------------- hits
  hitSpark(pos, dir, { color = 0xffe0a0, big = false, crit = false } = {}) {
    const c = new THREE.Color(color);
    this.p.burst(pos, { count: big ? 26 : 14, color: c, speed: big ? 11 : 8, spread: 0.9, dir: dir ? dir.clone().multiplyScalar(0.8) : null, up: 0.4, life: 0.35, size: 0.12, gravity: 14, drag: 3, shape: 1, sizeEnd: 0.1 });
    this.p.burst(pos, { count: 1, color: c, speed: 0, life: 0.14, size: big ? 2.6 : 1.6, drag: 0, sizeEnd: 1.6, intensity: 2.2 });
    if (crit) this.p.burst(pos, { count: 10, color: 0xffffff, speed: 6, life: 0.3, size: 0.09, gravity: 0, drag: 5, shape: 1 });
    const ground = pos.clone(); ground.y = Math.floor(pos.y - 0.9) + 0.05 + (this.game.world ? 0 : 0);
    this.rings.spawn(tmp.set(pos.x, this.groundY(pos) + 0.06, pos.z), { color: c, r1: big ? 2.6 : 1.5, dur: 0.3, thick: 0.18 });
  }
  groundY(pos) { const g = this.game.world.groundBelow(pos.x, pos.z, pos.y + 0.5); return isFinite(g) ? g : pos.y; }
  shockwave(pos, color = 0xffffff, radius = 4, dur = 0.45) {
    this.rings.spawn(tmp.set(pos.x, this.groundY(pos) + 0.07, pos.z), { color, r1: radius, dur, thick: 0.1 });
    this.p.burst(tmp.set(pos.x, this.groundY(pos) + 0.2, pos.z), { count: 24, color: 0x9a8a7a, additive: false, speed: radius * 2.2, spread: 0.2, up: 0.1, life: 0.6, size: 0.45, drag: 4, sizeEnd: 2, intensity: 0.8 });
  }
  slashArc(pos, facing, color = 0xffffff, radius = 2.2, arc = 0.35, dur = 0.18, flip = false) {
    this.arcs.spawn(tmp.set(pos.x, pos.y + 1.0, pos.z), { color, r0: radius * 0.8, r1: radius, dur, thick: 0.35, arc, rotY: facing + (flip ? Math.PI : 0) - Math.PI / 2 });
  }
  // Floating damage number (DOM, projected each frame).
  damageNumber(pos, amount, { crit = false, color = null, text = null } = {}) {
    if (!this.game.settings.damageNumbers) return;
    const el = document.createElement('div');
    el.className = 'dmg' + (crit ? ' crit' : '');
    el.textContent = text ?? Math.round(amount);
    if (color) el.style.color = color;
    this.numLayer.appendChild(el);
    this.numbers.push({ el, pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.9, (Math.random() - 0.5) * 0.6)), t: 0, vy: 2.2, crit });
  }
  // ---------------- movement fx
  landDust(pos, v) { this.p.burst(tmp.set(pos.x, pos.y + 0.1, pos.z), { count: 10, color: 0x8a7a6a, additive: false, speed: 3, up: 0.1, life: 0.5, size: 0.35, drag: 5, sizeEnd: 1.8, intensity: 0.7 }); }
  splash(pos, s = 1) { this.p.burst(tmp.set(pos.x, pos.y + 0.2, pos.z), { count: Math.round(10 * s), color: 0x9ad0ff, speed: 3.5, up: 1.4, life: 0.5, size: 0.1, gravity: 16, drag: 1, shape: 1, intensity: 1.2 }); }
  poof(pos) { this.p.burst(tmp.set(pos.x, pos.y + 0.8, pos.z), { count: 20, color: 0xdddddd, additive: false, speed: 2.5, life: 0.7, size: 0.5, drag: 3, sizeEnd: 2 }); }
  dodgeTrail(pl) {
    const c = new THREE.Color(pl.rig.look?.accent ?? 0x88ccff);
    for (let i = 0; i < 3; i++) setTimeout(() => this.p.burst(tmp.set(pl.pos.x, pl.pos.y + 0.6, pl.pos.z), { count: 6, color: c, speed: 1, life: 0.4, size: 0.3, drag: 4, sizeEnd: 0.1, intensity: 1.5 }), i * 60);
    this.p.burst(tmp.set(pl.pos.x, pl.pos.y + 0.15, pl.pos.z), { count: 8, color: 0x8a7a6a, additive: false, speed: 2.5, up: 0.05, life: 0.45, size: 0.35, drag: 5, sizeEnd: 1.6, intensity: 0.6 });
  }
  debris(pos, color, n = 8) {
    this.p.burst(pos, { count: n * 2, color, additive: false, speed: 4, up: 0.8, life: 0.5, size: 0.3, drag: 3, sizeEnd: 1.4, intensity: 0.6 });
  }
  // ---------------- screen fx
  flash(color = 0xffffff, amount = 0.6, dur = 0.12) { Grade.flash.value.set(...new THREE.Color(color).toArray(), amount); this.flashT = dur; this.flashDur = dur; this.flashAmt = amount; }
  blackFlash(dur = 0.28) { this.bfT = dur; Grade.blackFlash.value = 1; }
  screenWave(worldPos, strength = 1, dur = 0.5) {
    const v = worldPos.clone().project(this.game.rig.camera);
    Grade.wave.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5, 0, strength);
    this.waveT = 0; this.waveDur = dur; this.waveStrength = strength;
  }
  chroma(a = 1) { Grade.chroma.value = Math.max(Grade.chroma.value, a); }

  // ---------------- ambient
  ambient(dt, kind, focus) {
    this.ambientT += dt;
    const rate = { fireflies: 6, embers: 10, spores: 10, drips: 6 }[kind] ?? 0;
    const n = Math.floor(this.ambientT * rate); if (!n) return;
    this.ambientT -= n / rate;
    for (let i = 0; i < n; i++) {
      const x = focus.x + (Math.random() - 0.5) * 34, z = focus.z + (Math.random() - 0.5) * 34;
      const y = focus.y + Math.random() * 5 + 0.5;
      if (kind === 'fireflies') this.p.glow.emit(x, y, z, (Math.random() - 0.5) * 0.6, 0.2, (Math.random() - 0.5) * 0.6, 3 + Math.random() * 3, 2.2, 2.6, 0.8, 0.09, 0, 0.1, 1, 0);
      else if (kind === 'embers') this.p.glow.emit(x, focus.y + Math.random(), z, (Math.random() - 0.5) * 0.8, 1 + Math.random(), (Math.random() - 0.5) * 0.8, 3 + Math.random() * 2, 3, 1.1, 0.3, 0.07, -0.2, 0.3, 0.2, 1);
      else if (kind === 'spores') this.p.glow.emit(x, y, z, (Math.random() - 0.5) * 0.3, 0.15, (Math.random() - 0.5) * 0.3, 4 + Math.random() * 3, 0.9, 0.5, 1.6, 0.08, 0, 0.2, 1, 0);
      else if (kind === 'drips') this.p.glow.emit(x, focus.y + 7, z, 0, -2, 0, 0.9, 0.5, 0.8, 1.0, 0.05, 12, 0, 1, 1);
    }
  }

  update(dt, realDt) {
    this.rings.update(dt); this.arcs.update(dt); this.darkRings.update(dt);
    // screen grading pulses use real time so they still play during hit-stop
    if (this.flashT > 0) { this.flashT -= realDt; Grade.flash.value.w = Math.max(0, this.flashT / this.flashDur) * this.flashAmt; } else Grade.flash.value.w = 0;
    if (this.bfT > 0) { this.bfT -= realDt; Grade.blackFlash.value = this.bfT > 0 ? 1 : 0; }
    if (this.waveT >= 0) {
      this.waveT += realDt; const k = this.waveT / this.waveDur;
      Grade.wave.value.z = k * 0.9; Grade.wave.value.w = this.waveStrength * (1 - k);
      if (k >= 1) { this.waveT = -1; Grade.wave.value.w = 0; }
    }
    Grade.chroma.value = Math.max(0, Grade.chroma.value - realDt * 3);
    Grade.dim.value += (this.dimTarget - Grade.dim.value) * Math.min(1, realDt * 6);
    // damage numbers
    const cam = this.game.rig.camera; const W = window.innerWidth, H = window.innerHeight;
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.t += realDt; n.pos.y += n.vy * realDt; n.vy *= Math.exp(-realDt * 3);
      const v = tmp.copy(n.pos).project(cam);
      const life = n.crit ? 1.1 : 0.8;
      const s = n.t < 0.1 ? 0.6 + n.t * 6 : 1;
      n.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px) translate(-50%,-50%) scale(${s})`;
      n.el.style.opacity = String(Math.max(0, 1 - Math.max(0, n.t - life * 0.6) / (life * 0.4)));
      if (n.t > life || v.z > 1) { n.el.remove(); this.numbers.splice(i, 1); }
    }
  }
}
