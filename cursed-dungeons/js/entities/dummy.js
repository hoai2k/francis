// Straw training dummy: an unkillable target that wobbles, flashes and shows
// damage numbers (with a DPS readout) so combos can be practised.
import * as THREE from 'three/webgpu';
import { buildDummy } from './models.js';
import { FLASH_MATERIAL } from './character.js';

export class TrainingDummy {
  constructor(game, pos) {
    this.game = game; this.pos = pos.clone(); this.vel = new THREE.Vector3();
    this.radius = 0.45; this.height = 1.9; this.hp = 1e9; this.maxHp = 1e9;
    this.rig = buildDummy(); this.object = this.rig.root; this.object.position.copy(pos);
    this.facing = Math.PI * 0.15; this.object.rotation.y = this.facing;
    this.wob = 0; this.wobV = 0; this.flashT = 0; this.isDummy = true; this.def = { name: 'Training Dummy' };
    this.log = [];
  }
  takeDamage(amount, src, o = {}) {
    this.flashT = 0.08;
    const k = o.knock ? o.knock.length() : 3;
    this.wobV += (0.6 + k * 0.12) * (Math.random() < 0.5 ? 1 : -1);
    this.log.push({ t: this.game.time, a: amount });
    return amount;
  }
  get dps() { const now = this.game.time; this.log = this.log.filter((l) => now - l.t < 4); const s = this.log.reduce((a, b) => a + b.a, 0); return this.log.length ? s / Math.max(1, Math.min(4, now - this.log[0].t + 0.5)) : 0; }
  update(dt) {
    this.flashT -= dt;
    this.wobV += (-this.wob * 90 - this.wobV * 7) * dt; this.wob += this.wobV * dt;
    this.object.rotation.set(this.wob * 0.5, this.facing, this.wob);
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    this.rig.animate({ dt, speed: 0, vel: this.vel });
    this.rig.armR.rotation.z = 1.4; this.rig.armL.rotation.z = -1.4;
    return true;
  }
}
