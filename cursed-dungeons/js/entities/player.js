// Player controller: movement with voxel collision, aiming (mouse, right
// stick or auto-aim), facing, dodge roll with i-frames, falling into pits
// and respawn at the last safe spot. Combat is layered on in combat.js and
// the sorcerer modules.
import * as THREE from 'three/webgpu';
import { moveEntity } from '../physics.js';
import { buildSorcererModel } from './models.js';
import { damp, dampAngle, clamp } from '../util.js';
import { BASE_COMBO } from '../combat.js';
import { createKit } from '../sorcerers/index.js';
import { applyGear } from '../loot.js';
import { useArtifact } from '../artifacts.js';

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
    this.isPlayer = true;
    this.combo = BASE_COMBO; this.comboStep = 0; this.comboT = 0; this.attackBuffer = 0; this.struck = false;
    this.healCharges = 3; this.healMax = 3; this.healCd = 0;
    this.downT = 0; this.reviveProgress = 0;
    this.slowT = 0;
    this.procs = {}; this.artifacts = [];
    this.skills = game.save ? game.save.sorc(sorcerer).skills : {};
    applyGear(this, game.save ? game.save.gearFor(sorcerer) : []);
    this.hp = this.maxHp;
    this.kit = createKit(this);
    this.heroLight = game.lights.attach(this.object, 0xffe8d0, 1.6, 7, { offsetY: 2.2, priority: 6 });
  }
  // Re-apply gear/skills (after inventory or skill-tree changes).
  refreshLoadout() {
    const g = this.game;
    this.skills = g.save ? g.save.sorc(this.sorcerer).skills : {};
    applyGear(this, g.save ? g.save.gearFor(this.sorcerer) : []);
    this.kit.dispose?.();
    this.kit = createKit(this);
  }
  // ---------------------------------------------------------------- vitals
  gainCE(a) { if (this.domainActive) return; this.ce = Math.min(this.maxCe, this.ce + a * this.stats.ceGain); }
  heal(a, silent = false) {
    if (this.dead || this.downed) return;
    this.hp = Math.min(this.maxHp, this.hp + a);
    if (!silent) this.game.fx.damageNumber(this.pos, a, { color: '#6aff9a', text: '+' + Math.round(a) });
  }
  takeDamage(amount, src, o = {}) {
    const g = this.game;
    if (this.dead || this.downed) return 0;
    if (!o.pure && (this.iframes > 0 || this.invulnerable)) return 0;
    if (this.kit.onIncoming) { const r = this.kit.onIncoming(amount, src, o); if (r === 0) return 0; if (typeof r === 'number') amount = r; }
    const dmg = amount * (o.pure ? 1 : (1 - this.stats.armor)) * (g.difficultyDamageDealt ?? 1) * (this.barrierT > 0 ? 0.5 : 1);
    this.hp -= dmg;
    this.hurtT = 0.12;
    this.rig.swap(g.flashMaterial);
    if (o.knock && !o.noKnock) { this.knock = (this.knock || new THREE.Vector3()).add(o.knock); }
    if (!o.dot) {
      this.action = this.action && this.action.type !== 'attack' ? this.action : { type: 'hit', dur: 0.25, elapsed: 0, t: 0, moveScale: 0.5 };
      g.shake(Math.min(0.5, 0.15 + dmg / 60));
      g.fx.hurtVignette();
      g.audio?.hurt();
      this.iframes = Math.max(this.iframes, 0.25);
    }
    g.fx.damageNumber(this.pos, dmg, { color: '#ff5a6a' });
    if (this.hp <= 0) this.goDown();
    return dmg;
  }
  goDown() {
    const g = this.game;
    this.hp = 0;
    const others = g.players.filter((p) => p !== this && !p.dead && !p.downed);
    if (others.length) { this.downed = true; this.downT = 25; this.reviveProgress = 0; this.action = null; g.toast?.(`Player ${this.index + 1} is down! Stand close to revive`); }
    else { this.dead = true; this.deadT = 0; g.onPlayerDied?.(this); }
    this.domainActive = false;
    g.audio?.enemyDie(true);
  }
  revive(frac = 0.4) { this.downed = false; this.dead = false; this.hp = this.maxHp * frac; this.iframes = 2; this.action = null; this.game.fx.heal(this.pos); this.game.audio?.energy('heal'); }
  useHeal() {
    if (this.healCharges <= 0 || this.healCd > 0 || this.hp >= this.maxHp) return;
    this.healCharges--; this.healCd = 1.2;
    this.healOverTime = { left: this.maxHp * (0.45 + (this.stats.healBonus ?? 0)), t: 1.2 };
    this.game.fx.heal(this.pos, 0x9affd8);
    this.game.audio?.energy('heal');
    this.action = { type: 'sign', dur: 0.6, elapsed: 0, t: 0, moveScale: 0.6, cancelable: true };
    this.game.toast?.('Reverse Cursed Technique');
  }
  // ---------------------------------------------------------------- combat
  updateCombat(dt, inp) {
    const g = this.game;
    this.comboT -= dt; this.healCd = Math.max(0, this.healCd - dt);
    if (this.healOverTime) { const r = this.healOverTime; const k = Math.min(r.left, (r.left / Math.max(0.05, r.t)) * dt); this.hp = Math.min(this.maxHp, this.hp + k); r.left -= k; r.t -= dt; if (r.t <= 0 || r.left <= 0) this.healOverTime = null; }
    if (inp.pressed.attack || (inp.held.attack && !inp.mouse && this.autoRepeat)) this.attackBuffer = 0.28;
    else this.attackBuffer -= dt;
    if (inp.held.attack) this.attackHeldT = (this.attackHeldT ?? 0) + dt; else this.attackHeldT = 0;
    if (inp.pressed.heal) this.useHeal();
    this.barrierT = Math.max(0, (this.barrierT ?? 0) - dt); this.rampageT = Math.max(0, (this.rampageT ?? 0) - dt);
    this.artifacts.forEach((art, i) => {
      art.cdLeft = Math.max(0, art.cdLeft - dt);
      if (inp.pressed['art' + (i + 1)] && art.cdLeft <= 0 && this.dodgeT <= 0 && !(this.action && this.action.lock)) { art.cdLeft = art.cd * (1 - this.stats.cdr); useArtifact(g, this, art); }
    });
    if (this.barrierT > 0 && Math.random() < 0.4) g.particles.glow.emit(this.pos.x + (Math.random() - 0.5) * 1.2, this.pos.y + Math.random() * 2, this.pos.z + (Math.random() - 0.5) * 1.2, 0, 0.5, 0, 0.6, 2, 1.8, 0.8, 0.1, 0, 1, 1, 1);
    const a = this.action;
    // chain / start melee
    const canChain = !a || a.type === 'hit' || (a.type === 'attack' && a.t >= (a.step.chainAt ?? 0.62)) || a.type === 'sign';
    if (this.attackBuffer > 0 && canChain && this.dodgeT <= 0 && !this.kit.blocksMelee?.()) {
      if ((!a || a.type !== 'attack') && this.comboT < 0) this.comboStep = 0;   // combo window expired
      const combo = this.kit.combo || this.combo;
      const step = combo[this.comboStep % combo.length];
      this.startAttack(step, this.comboStep % combo.length);
      this.comboStep = (this.comboStep + 1) % combo.length;
      this.attackBuffer = 0;
    }
    if (this.comboT < -0.45 && (!this.action || this.action.type !== 'attack')) this.comboStep = 0;
    // strike moment
    if (this.action && this.action.type === 'attack' && !this.action.struck && this.action.t >= this.action.step.strike) {
      this.action.struck = true;
      this.kit.onStrike?.(this.action.step);
      if (!this.action.step.custom) g.combat.meleeStrike(this, this.action.step);
      g.fx.slashArc(this.pos, this.facing, this.action.step.trail ?? this.rig.look?.accent ?? 0xffffff, this.action.step.range * 0.9, this.action.step.arc > 2 ? 1 : 0.28, 0.16, this.action.step.style === 'swingL');
    }
    if (this.action && this.action.type === 'attack') {
      const st = this.action.step, k = this.action.t;
      // lunge during strike window
      const lunge = k > (st.windup ?? 0.3) * 0.8 && k < (st.strike ?? 0.5) + 0.1 ? (st.lunge ?? 0) : 0;
      this.action.root = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(lunge).addScaledVector(this.moveIntent || new THREE.Vector3(), 1.4);
    }
    this.kit.update?.(dt, inp);
  }
  startAttack(step, idx) {
    // snap facing to aim; melee "magnetises" toward a curse in front of you
    this.facing = Math.atan2(this.aimDir.x, this.aimDir.z);
    let best = null, bd = 4.5;
    for (const e of this.game.enemies) {
      if (e.dead || e.untargetable) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < bd && Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - this.facing), Math.cos(Math.atan2(dx, dz) - this.facing))) < 0.9) { bd = d; best = e; }
    }
    if (best) { this.facing = Math.atan2(best.pos.x - this.pos.x, best.pos.z - this.pos.z); step = { ...step, lunge: step.lunge * Math.min(1.6, Math.max(0.2, (bd - 1.2) / 1.6)) }; }
    this.action = { type: 'attack', step, style: step.style, dur: step.dur / ((this.stats.attackSpeed ?? 1) * (this.rampageT > 0 ? 1 + (this.procs.rampage ?? 0) * 0.1 : 1)), elapsed: 0, t: 0, windup: step.windup, strike: step.strike, struck: false, step: step, idx, moveScale: 0.25 };
    this.comboT = step.dur + 0.35;
    this.game.audio?.swing(idx);
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
    if (this.downed) {
      this.downT -= dt;
      const helper = g.players.find((p) => p !== this && !p.dead && !p.downed && p.pos.distanceTo(this.pos) < 2.2);
      this.reviveProgress = helper ? this.reviveProgress + dt / 2.2 : Math.max(0, this.reviveProgress - dt);
      if (this.reviveProgress >= 1) this.revive(0.4);
      else if (this.downT <= 0) { this.downed = false; this.dead = true; this.deadT = 0; g.onPlayerDied?.(this); }
      this.vel.set(0, this.vel.y, 0); moveEntity(this, g.world, dt); this.animate(dt); return;
    }
    this.updateAim(inp);
    // movement intent
    const mv = g.rig.screenToWorldDir(inp.move.x, inp.move.y, new THREE.Vector3());
    const mvLen = Math.min(1, Math.hypot(inp.move.x, inp.move.y));
    if (mvLen > 0.01) mv.normalize().multiplyScalar(mvLen);
    this.moveIntent = mv;
    this.iframes = Math.max(0, this.iframes - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    // dodge roll
    if (inp.pressed.dodge && this.dodgeCd <= 0 && !this.downed && (!this.action || this.action.cancelable !== false) && !this.kit.blocksDodge?.()) this.startDodge(mv);
    if (!this.downed) this.updateCombat(dt, inp);
    if (this.hurtT > 0) { this.hurtT -= dt; if (this.hurtT <= 0) this.rig.swap(null); }
    this.slowT = Math.max(0, this.slowT - dt);
    let speed = this.speed * this.stats.speed * (this.inLiquid === 'water' ? 0.7 : 1) * (this.slowT > 0 ? 0.6 : 1) * (this.kit.speedMul ?? 1);
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
    if (!Number.isFinite(this.pos.x + this.pos.y + this.pos.z + this.vel.x + this.vel.z)) { this.pos.copy(this.safePos); this.vel.set(0, 0, 0); this.knock?.set(0, 0, 0); }
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
