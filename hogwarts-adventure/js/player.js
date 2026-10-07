// Player character: movement, jumping, dodge rolls, health/mana and damage handling.
import * as THREE from 'three';
import { G } from './state.js';
import { makeWizard, SKIN_TONES, HAIR_COLORS, WAND_WOODS } from './models.js';
import { clamp, damp, dampAngle, wrapAngle } from './util.js';
import { postHit } from './engine.js';
import { WATER_Y } from './world/terrain.js';
import { defMult, regenMult, applyStats } from './progress.js';

const _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.radius = 0.38;
    this.height = 1.8;
    this.team = 'player';
    this.alive = true;
    this.maxHp = 100;
    this.hp = 100;
    this.maxMana = 100;
    this.mana = 100;
    this.grounded = true;
    this.support = null;
    this.dodgeT = 0;
    this.dodgeCd = 0;
    this.dodgeDir = new THREE.Vector3();
    this.iframes = 0;
    this.blocking = false;
    this.blockT = 0;
    this.lastHurt = 99;
    this.lastCast = 99;
    this.aiming = false;
    this.aimT = 0;
    this.status = {};
    this.buffs = {}; // name -> seconds
    this.control = true;
    this.flying = false;
    this.fovKick = 0;
    this.stepPhase = 0;
    this.coyote = 0;
    this.root = new THREE.Group();
    G.scene.add(this.root);
    this.rebuild();
  }

  rebuild() {
    const s = G.save || {};
    const look = s.look || {};
    if (this.model) this.root.remove(this.model.root);
    this.model = makeWizard({
      house: s.house || null,
      skin: SKIN_TONES[look.skin ?? 1],
      hairColor: HAIR_COLORS[look.hairColor ?? 1],
      hairStyle: look.hairStyle || 'short',
      glasses: !!look.glasses,
      hat: !!look.hat,
      wandColor: WAND_WOODS[look.wand || 'holly'],
      eyeColor: look.eyes || '#3a2a1a',
      scarf: true,
    });
    this.root.add(this.model.root);
    this.anim = this.model.anim;
    this.wandTip = this.model.wandTip;
    applyStats();
  }

  get alive_() { return this.alive; }
  teleport(p, yaw = this.yaw) {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.root.position.copy(p);
    this.root.rotation.y = yaw;
    this.support = null;
  }

  wandPos(out = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    return this.wandTip.getWorldPosition(out);
  }

  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  damage(amount, info = {}) {
    if (!this.alive || G.mode !== 'play' && G.mode !== 'minigame') return false;
    if (this.iframes > 0) {
      if (info.dodgeable !== false) { G.ui.floatText(this.pos.clone().add(UP), 'Dodged!', 'dodge'); return false; }
    }
    if (this.blocking && info.blockable !== false && G.spells.shieldUp) {
      return G.spells.shieldAbsorb(amount, info);
    }
    if (this.buffs.wiggenweld) amount *= 0.7;
    amount *= defMult() * (G.diffDmg ?? 1);
    if (this.buffs.shielded) { amount *= 0.25; G.fx.burst(this.pos.clone().setY(this.pos.y + 1), 0x9fe08a, 12, 3); }
    this.hp -= amount;
    this.lastHurt = 0;
    this.anim.trigger('hit');
    G.cam.shake(Math.min(0.6, 0.18 + amount / 60));
    G.input.rumble(0.6, 0.4, 160);
    postHit(Math.min(2, amount / 15));
    G.audio.sfx('hurt');
    if (info.knock) {
      this.vel.addScaledVector(info.knock, 1);
      this.vel.y = Math.max(this.vel.y, 3);
      this.grounded = false;
    }
    G.ui.floatText(this.pos.clone().add(new THREE.Vector3(0, 2, 0)), `-${Math.round(amount)}`, 'hurt');
    if (this.hp <= 0) {
      if (G.minigame?.onPlayerDown) { this.hp = 0; G.minigame.onPlayerDown(); } else this.faint();
    }
    return true;
  }

  async faint() {
    this.hp = 0;
    this.alive = false;
    this.anim.set('down');
    G.audio.sfx('faint');
    G.slowmo = 1.2;
    G.events.emit('playerDown');
    await new Promise((r) => setTimeout(r, 1800));
    await G.ui.fade(1, 0.5);
    this.alive = true;
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.anim.set('idle');
    G.events.emit('respawn');
    await G.ui.fade(0, 0.5);
  }

  update(dt) {
    const I = G.input;
    const col = G.zone.colliders;
    this.lastHurt += dt;
    this.lastCast += dt;
    for (const k in this.buffs) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) { delete this.buffs[k]; G.ui.updateBuffs(); } }
    // regen
    const regenDelay = this.lastCast > 0.9;
    if (regenDelay && !this.blocking) this.mana = Math.min(this.maxMana, this.mana + dt * (14 + (this.buffs.focus ? 14 : 0)) * regenMult());
    if (this.lastHurt > 5) this.hp = Math.min(this.maxHp, this.hp + dt * 4);
    if (this.regen) { this.heal(this.regen.rate * dt); this.regen.t -= dt; if (this.regen.t <= 0) this.regen = null; }
    if (this.status.burn > 0) { this.status.burn -= dt; this.hp -= dt * 4; this.lastHurt = 0; if (Math.random() < 0.4) G.fx.emit({ pos: this.pos.clone().setY(this.pos.y + Math.random() * 1.6), color: 0xffb030, color2: 0xff2000, count: 1, speed: 1, size: 0.3, life: 0.4, intensity: 3, up: 2, noScale: true }); if (this.hp <= 0 && this.alive) this.faint(); }

    if (this.flying) return; // a minigame drives the player
    if (this.petrified > 0) {
      this.petrified -= dt;
      if (Math.random() < 0.3) G.fx.emit({ pos: this.pos.clone().setY(this.pos.y + Math.random() * 1.8), color: 0xc8c0b0, count: 1, speed: 0.3, size: 0.15, life: 0.6, intensity: 1.5, noScale: true });
    }
    const canAct = this.alive && this.control && G.mode === 'play' && !(this.petrified > 0);
    const camYaw = G.cam.yaw;
    let mx = canAct ? I.move.x : 0, my = canAct ? I.move.y : 0;
    const mag = Math.min(1, Math.hypot(mx, my));
    const fwd = _v.set(Math.sin(camYaw), 0, Math.cos(camYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3().addScaledVector(fwd, my).addScaledVector(right, mx);
    if (wish.lengthSq() > 1) wish.normalize();

    // dodge / sprint
    this.dodgeCd -= dt;
    if (canAct && I.isPressed('dodge') && this.dodgeCd <= 0 && this.grounded && !this.blocking) {
      this.dodgeT = 0.42;
      this.dodgeCd = 0.65;
      this.iframes = 0.36;
      this.dodgeDir.copy(wish.lengthSq() > 0.01 ? wish : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw))).normalize();
      this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
      G.audio.sfx('dodge');
      G.fx.emit({ pos: this.pos.clone().add(new THREE.Vector3(0, 0.2, 0)), color: 0xb0a080, count: 10, speed: 1.5, size: 0.6, size1: 1.3, life: 0.6, smoke: true, alpha: 0.25 });
      this.fovKick = 6;
    }
    this.iframes -= dt;
    const sprint = canAct && I.isHeld('sprint') && this.dodgeT <= 0 && mag > 0.5 && !this.blocking;
    let speed = (sprint ? 8.2 : 5.2) * (this.buffs.swift ? 1.2 : 1);
    if (this.blocking) speed *= 0.45;
    if (this.aimT > 0) speed *= 0.85;
    const target = new THREE.Vector3();
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      target.copy(this.dodgeDir).multiplyScalar(12 * (0.4 + this.dodgeT / 0.42 * 0.8));
    } else target.copy(wish).multiplyScalar(speed);
    const accel = this.grounded ? 14 : 3;
    this.vel.x = damp(this.vel.x, target.x, accel, dt);
    this.vel.z = damp(this.vel.z, target.z, accel, dt);
    if (this.dodgeT <= 0) this.fovKick = sprint ? 5 : 0;

    // jump
    this.coyote -= dt;
    if (this.grounded) this.coyote = 0.12;
    if (canAct && I.isPressed('jump') && this.coyote > 0 && this.dodgeT <= 0) {
      this.vel.y = 6.6;
      this.grounded = false;
      this.coyote = 0;
      G.audio.sfx('jump');
    }
    this.vel.y -= 19 * dt;

    // integrate horizontal with collision
    const old = this.pos.clone();
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    col.resolve(this.pos, this.radius, this.height);
    // never wade into deep water
    if (G.zone.outdoor) {
      const g2 = col.ground(this.pos.x, this.pos.z, this.pos.y);
      if (g2.y < WATER_Y - 0.5) { this.pos.x = old.x; this.pos.z = old.z; }
      const r = Math.hypot(this.pos.x, this.pos.z + 40);
      if (r > 330) { this.pos.x = old.x; this.pos.z = old.z; }
    }
    // vertical
    this.pos.y += this.vel.y * dt;
    const g = col.ground(this.pos.x, this.pos.z, Math.max(this.pos.y, old.y));
    if (this.pos.y <= g.y + 0.02 && this.vel.y <= 0.5) {
      if (!this.grounded && this.vel.y < -9) { G.audio.sfx('land'); G.cam.shake(0.12); }
      this.pos.y = g.y;
      this.vel.y = Math.max(0, this.vel.y);
      this.grounded = true;
      this.support = g.support;
    } else if (this.pos.y > g.y + 0.25) {
      this.grounded = false;
      this.support = null;
    } else if (this.vel.y <= 0) {
      // snap down small steps / slopes
      this.pos.y = g.y;
      this.vel.y = 0;
      this.grounded = true;
      this.support = g.support;
    }
    if (this.pos.y < -40) this.teleport(G.zone.spawn.pos, G.zone.spawn.yaw);
    // pits and deep water inside dungeons send you back to the last checkpoint
    if (G.zone.killY != null && this.pos.y < G.zone.killY) {
      const cp = G.zone.checkpoint || G.zone.spawn;
      this.teleport(cp.pos, cp.yaw);
      this.damage(8, { blockable: false, dodgeable: false });
      G.cam.snap();
    }

    // facing
    const flatSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.aimT -= dt;
    this.aiming = this.aimT > 0 || this.blocking || !!G.cam.lockTarget;
    if (this.aiming && this.dodgeT <= 0) {
      const lt = G.cam.lockTarget;
      const want = lt ? Math.atan2(lt.pos.x - this.pos.x, lt.pos.z - this.pos.z) : camYaw;
      this.yaw = dampAngle(this.yaw, want, 18, dt);
    } else if (flatSpeed > 0.5 && this.dodgeT <= 0) {
      this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 12, dt);
    }

    // animation state
    if (!this.alive) this.anim.set('down');
    else if (this.dodgeT > 0) this.anim.set('roll');
    else if (!this.grounded) this.anim.set(this.vel.y > 0 ? 'jump' : 'fall');
    else if (this.blocking) this.anim.set('block');
    else if (this.aimT > 0) this.anim.set('aim');
    else this.anim.set('idle');
    if (this.status.override) this.anim.set(this.status.override);
    this.anim.update(dt, this.grounded ? flatSpeed : 0);
    // roll spin
    if (this.dodgeT > 0) this.model.parts.body.rotation.x = (1 - this.dodgeT / 0.42) * Math.PI * 2;
    // footsteps
    if (this.grounded && flatSpeed > 1) {
      const prev = this.stepPhase;
      this.stepPhase += dt * (2.2 + flatSpeed * 1.25) / Math.PI;
      if (Math.floor(prev) !== Math.floor(this.stepPhase)) G.audio.sfx('step', { soft: !G.zone.outdoor ? 0 : 1 });
    }
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
  }
}
