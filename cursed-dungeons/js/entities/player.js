// Player controller: movement with voxel collision, aiming (mouse, right
// stick or auto-aim), facing, dodge roll with i-frames, falling into pits
// and respawn at the last safe spot. Combat is layered on in combat.js and
// the sorcerer modules.
import * as THREE from 'three/webgpu';
import { moveEntity } from '../physics.js';
import { buildSorcererModel } from './models.js';
import { damp, dampAngle, clamp } from '../util.js';

export const PLAYER_COLORS = ['#4fc8ff', '#ff5a6a', '#7aff7a', '#ffc94a'];

export class Player {
  constructor(game, index, device, sorcerer) {
    this.game = game; this.index = index; this.device = device; this.sorcerer = sorcerer;
    this.color = PLAYER_COLORS[index];
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.radius = 0.32; this.height = 1.8;
    this.grounded = false; this.coyote = 0; this.visY = 0;
    this.facing = 0; this.aimDir = new THREE.Vector3(0, 0, 1); this.aiming = false;
    this.aimPoint = new THREE.Vector3();
    this.speed = 5.6;
    this.maxHp = 100; this.hp = 100; this.maxCe = 100; this.ce = 30;
    this.dead = false; this.downed = false; this.reviveT = 0;
    this.iframes = 0; this.dodgeT = 0; this.dodgeCd = 0; this.dodgeDir = new THREE.Vector3();
    this.action = null;   // current animation action
    this.safePos = new THREE.Vector3(); this.safeT = 0;
    this.fallT = 0;
    this.stats = { damage: 1, armor: 0, speed: 1, cdr: 0, ceGain: 1, crit: 0.08, lifesteal: 0 };
    this.rig = buildSorcererModel(sorcerer);
    this.object = this.rig.root;
    this.object.userData.player = this;
    this.stepT = 0;
    this.onLand = (v) => { if (v > 12) game.fx?.landDust(this.pos, v); };
  }
  spawn(p) { this.pos.copy(p); this.vel.set(0, 0, 0); this.visY = p.y; this.safePos.copy(p); this.object.position.copy(p); }
  input() { return this.game.input.get(this.device); }

  // Determine aim direction for this frame.
  updateAim(inp) {
    const g = this.game;
    this.aiming = false;
    if (inp.mouse) {
      g.rig.groundPoint(g.input.mouse.ndcX, g.input.mouse.ndcY, this.pos.y + 0.9, this.aimPoint);
      const d = this.aimPoint.clone().sub(this.pos); d.y = 0;
      if (d.lengthSq() > 0.04) { this.aimDir.copy(d.normalize()); this.aiming = true; }
    } else if (inp.aimStick) {
      g.rig.screenToWorldDir(inp.aimStick.x, inp.aimStick.y, this.aimDir).normalize();
      this.aiming = true;
      this.aimPoint.copy(this.pos).addScaledVector(this.aimDir, 6);
    } else {
      // auto-aim at nearest enemy, else movement direction
      const t = g.nearestEnemy?.(this.pos, 11);
      if (t) { this.aimDir.set(t.pos.x - this.pos.x, 0, t.pos.z - this.pos.z).normalize(); this.aimPoint.copy(t.pos); this.autoTarget = t; }
      else {
        this.autoTarget = null;
        if (this.vel.lengthSq() > 0.5) this.aimDir.set(this.vel.x, 0, this.vel.z).normalize();
        this.aimPoint.copy(this.pos).addScaledVector(this.aimDir, 5);
      }
    }
  }

  update(dt) {
    const g = this.game, inp = this.input();
    if (this.dead) { this.animate(dt); return; }
    this.updateAim(inp);
    // movement intent
    const mv = g.rig.screenToWorldDir(inp.move.x, inp.move.y, new THREE.Vector3());
    const mvLen = Math.min(1, Math.hypot(inp.move.x, inp.move.y));
    if (mvLen > 0.01) mv.normalize().multiplyScalar(mvLen);
    this.moveIntent = mv;
    this.iframes = Math.max(0, this.iframes - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    // dodge roll
    if (inp.pressed.dodge && this.dodgeCd <= 0 && !this.downed && (!this.action || this.action.cancelable !== false || this.action.type === 'attack')) this.startDodge(mv);
    let speed = this.speed * this.stats.speed * (this.inLiquid === 'water' ? 0.7 : 1) * (this.slow ?? 1);
    const want = new THREE.Vector3();
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const k = this.dodgeT / this.dodgeDur;
      want.copy(this.dodgeDir).multiplyScalar(15 * (0.35 + k * 0.9));
      if (this.dodgeT <= 0) this.action = null;
    } else if (this.action && this.action.root) {
      want.copy(this.action.root);                         // attack lunges etc.
    } else if (!this.downed) {
      const busy = this.action && this.action.moveScale !== undefined ? this.action.moveScale : 1;
      want.copy(mv).multiplyScalar(speed * busy);
    }
    if (this.knock && this.knock.lengthSq() > 0.01) { want.add(this.knock); this.knock.multiplyScalar(Math.exp(-dt * 8)); }
    const accel = this.dodgeT > 0 ? 30 : this.grounded ? 16 : 4;
    this.vel.x = damp(this.vel.x, want.x, accel, dt);
    this.vel.z = damp(this.vel.z, want.z, accel, dt);
    moveEntity(this, g.world, dt);
    // pits: fell out of the world → respawn at last safe spot
    if (this.pos.y < -6) this.fellOff();
    if (this.grounded && !this.inLiquid) {
      this.safeT += dt;
      if (this.safeT > 0.4 && this.edgeSafe()) { this.safePos.copy(this.pos); this.safeT = 0; }
    }
    // facing
    const moving = Math.hypot(this.vel.x, this.vel.z) > 0.4;
    let targetFacing = this.facing;
    if (this.dodgeT > 0) targetFacing = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
    else if (this.action && this.action.faceAim !== false) targetFacing = Math.atan2(this.aimDir.x, this.aimDir.z);
    else if ((inp.mouse && this.aiming && (inp.held.attack || inp.held.ranged)) || inp.aimStick) targetFacing = Math.atan2(this.aimDir.x, this.aimDir.z);
    else if (moving) targetFacing = Math.atan2(this.vel.x, this.vel.z);
    this.facing = dampAngle(this.facing, targetFacing, this.action ? 30 : 14, dt);
    // footsteps
    if (moving && this.grounded && this.dodgeT <= 0) {
      this.stepT += dt * Math.hypot(this.vel.x, this.vel.z) / 2.2;
      if (this.stepT > 1) { this.stepT = 0; g.audio?.footstep(g.surfaceAt(this.pos), this.pos); if (this.inLiquid) g.fx?.splash(this.pos, 0.4); }
    }
    this.animate(dt);
  }
  edgeSafe() {
    const w = this.game.world;
    for (const [dx, dz] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]]) if (!isFinite(w.groundBelow(this.pos.x + dx, this.pos.z + dz, this.pos.y)) || w.groundBelow(this.pos.x + dx, this.pos.z + dz, this.pos.y) < this.pos.y - 2) return false;
    return true;
  }
  startDodge(mv) {
    const dir = mv.lengthSq() > 0.01 ? mv.clone().normalize() : new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    this.dodgeDir.copy(dir); this.dodgeDur = 0.42; this.dodgeT = this.dodgeDur;
    this.iframes = 0.36; this.dodgeCd = 0.75 * (1 - this.stats.cdr * 0.5);
    this.action = { type: 'dodge', t: 0, dur: this.dodgeDur, elapsed: 0 };
    this.game.audio?.whoosh(0.6);
    this.game.fx?.dodgeTrail(this);
    this.onDodge?.();
  }
  fellOff() {
    this.game.fx?.poof(this.pos);
    this.spawn(this.safePos);
    this.iframes = 1;
    this.takeDamage?.(this.maxHp * 0.1, null, { pure: true, noKnock: true });
    this.game.audio?.hurt();
  }
  animate(dt) {
    const a = this.action;
    if (a) { a.elapsed = (a.elapsed ?? 0) + dt; a.t = Math.min(1, a.elapsed / a.dur); }
    const speed = Math.hypot(this.vel.x, this.vel.z) / this.speed;
    this.visY = this.stepped ? damp(this.visY, this.pos.y, 16, dt) : this.pos.y;
    if (Math.abs(this.visY - this.pos.y) < 0.01) this.stepped = 0;
    this.object.position.set(this.pos.x, this.visY, this.pos.z);
    this.object.rotation.y = this.facing;
    this.rig.animate({ dt, speed: this.dodgeT > 0 ? 0 : clamp(speed, 0, 1), vel: this.vel, action: this.dead ? { type: 'death', t: Math.min(1, (this.deadT = (this.deadT ?? 0) + dt)) } : this.downed ? { type: 'down', t: 1 } : a });
    if (a && a.t >= 1 && a.type !== 'dodge' && !a.hold) this.action = null;
  }
}
