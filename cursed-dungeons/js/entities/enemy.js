// Curses: shared enemy behaviour (targeting, steering, separation, pit
// avoidance, knockback, stagger, telegraphed attacks, death) plus the
// archetype AIs: swarmer (melee), spitter (ranged), bulwark (shield tank),
// phantom (teleporter), brood mother (summoner) and bloater (explodes).
import * as THREE from 'three/webgpu';
import { moveEntity, groundAhead } from '../physics.js';
import { buildCurseModel, CURSES, addEliteShell } from './curses.js';
import { FLASH_MATERIAL } from './character.js';
import { damp, dampAngle, clamp, angleDiff } from '../util.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const ELITE_AFFIX = {
  swift: { color: 0x4affd8, label: 'Swift' },
  armored: { color: 0xffc24a, label: 'Armored' },
  vampiric: { color: 0xff3a5a, label: 'Vampiric' },
  explosive: { color: 0xff8a2a, label: 'Explosive' },
  shadow: { color: 0xb05aff, label: 'Blinking' },
};

export class Enemy {
  constructor(game, kind, pos, { elite = null, level = 1 } = {}) {
    this.game = game; this.kind = kind; this.def = CURSES[kind];
    const d = this.def;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = d.radius; this.height = d.height;
    const scale = 1 + (level - 1) * 0.35;
    this.maxHp = d.hp * scale; this.dmg = d.dmg * (1 + (level - 1) * 0.25);
    this.speed = d.speed * (0.92 + Math.random() * 0.16);
    this.armor = d.armor ?? 0;
    this.elite = elite;
    if (elite) {
      this.maxHp *= 2.6; this.dmg *= 1.3;
      if (elite === 'swift') this.speed *= 1.45;
      if (elite === 'armored') this.armor = Math.min(0.6, this.armor + 0.35);
    }
    this.hp = this.maxHp;
    this.rig = buildCurseModel(d.model);
    if (elite) addEliteShell(this.rig, ELITE_AFFIX[elite].color);
    this.object = this.rig.root;
    this.object.position.copy(this.pos);
    this.facing = Math.random() * Math.PI * 2;
    this.state = 'idle'; this.stateT = 0; this.cd = 0.5 + Math.random() * 1.2;
    this.stagger = 0; this.flashT = 0; this.dead = false; this.deathT = 0;
    this.grounded = false; this.coyote = 0; this.visY = pos.y;
    this.home = pos.clone(); this.wanderT = 0; this.aggro = false;
    this.action = null; this.marker = null;
    this.spawnT = 0.5;  // rise-out-of-ground intro
    this.blinkCd = 2 + Math.random() * 2;
    this.summonCount = 0;
    this.isEnemy = true;
  }
  get name() { return (this.elite ? ELITE_AFFIX[this.elite].label + ' ' : '') + this.def.name; }

  // ---------------------------------------------------------------- damage
  takeDamage(amount, src, o = {}) {
    if (this.dead || this.spawnT > 0.2) return 0;
    let dmg = amount;
    // Bulwark shields block frontal hits
    if (this.def.shield && src && !o.unblockable && this.state !== 'stagger') {
      const from = Math.atan2(src.pos.x - this.pos.x, src.pos.z - this.pos.z);
      if (Math.abs(angleDiff(this.facing, from)) < 0.9) { dmg *= 0.2; o.blocked = true; this.game.fx.hitSpark(tmp.copy(this.pos).setY(this.pos.y + 1.2).addScaledVector(tmp2.set(Math.sin(this.facing), 0, Math.cos(this.facing)), 0.8), null, { color: 0xffe0a0 }); this.game.audio?.tone({ freq: 900, to: 600, dur: 0.12, gain: 0.1, type: 'square', filter: 3000 }); }
    }
    dmg *= 1 - this.armor;
    this.hp -= dmg;
    this.flashT = 0.1;
    this.aggro = true;
    if (src && src.isPlayer && !this.target) this.target = src;
    if (o.knock) {
      const k = o.knock.clone().multiplyScalar(1 - (this.def.knockResist ?? 0) * (o.blocked ? 1 : 0.8));
      this.knock.add(k);
      if (k.length() > 6) this.vel.y = Math.max(this.vel.y, 4 + k.length() * 0.25);
    }
    const st = (o.stagger ?? 0.2) * (this.def.knockResist ? 0.5 : 1) * (this.elite ? 0.6 : 1);
    if (st > 0.15 && !o.blocked && (this.state !== 'windup' || st > 0.4 || !this.def.superArmor)) {
      if (this.state === 'windup') this.cancelAttack();
      this.state = 'stagger'; this.stateT = 0; this.stagger = st;
    }
    this.game.audio?.enemyHurt(this.def.pitch ?? 1);
    if (this.hp <= 0) this.die(o);
    else if (this.elite === 'shadow' && Math.random() < 0.25) this.blink(true);
    return dmg;
  }
  cancelAttack() { if (this.marker) { this.game.markers.cancel(this.marker); this.marker = null; } this.action = null; }
  die(o = {}) {
    if (this.dead) return;
    this.dead = true; this.deathT = 0; this.state = 'dead';
    this.cancelAttack();
    const g = this.game;
    const c = this.pos.clone(); c.y += this.height * 0.5;
    g.fx.curseDeath(c, this.height, this.elite ? 0xff8aff : 0x7a3aa8);
    g.audio?.enemyDie(this.def.grade <= '2');
    g.onEnemyKilled?.(this, o);
    if (this.elite === 'explosive' || this.def.ai === 'blob') this.explode(o.fromBlob);
  }
  explode(chained) {
    const g = this.game;
    const c = this.pos.clone();
    const R = this.def.ai === 'blob' ? 3 : 2.6;
    g.fx.explosion(c, this.def.ai === 'blob' ? 0xff4a2a : 0xff8a2a, R);
    g.audio?.energy('explode');
    g.shake(0.35);
    for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(c) < R + 0.4) p.takeDamage(this.dmg * (this.def.ai === 'blob' ? 1 : 0.6), this, { knock: tmp.subVectors(p.pos, c).setY(0).normalize().multiplyScalar(9) });
    // blobs hurt other curses too
    for (const e of g.enemies) if (e !== this && !e.dead && e.pos.distanceTo(c) < R) e.takeDamage(this.dmg * 0.8, null, { knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(8), fromBlob: true });
    g.combat.hitBlocks(c, tmp.set(0, 0, 1), R, Math.PI, 60, null);
  }

  // ---------------------------------------------------------------- AI
  pickTarget() {
    const g = this.game;
    let best = null, bd = this.aggro ? 30 : 15;
    for (const t of g.hostileTargets()) {
      if (t.dead || t.downed || t.untargetable) continue;
      const d = t.pos.distanceTo(this.pos);
      if (d < bd) { bd = d; best = t; }
    }
    if (best) this.aggro = true;
    this.target = best;
    return best;
  }
  // Steering: desired direction with separation and ledge avoidance.
  steer(dir, speedMul = 1) {
    const g = this.game;
    const want = tmp.copy(dir).setY(0);
    if (want.lengthSq() > 0) want.normalize();
    // separation
    for (const o of g.enemies) {
      if (o === this || o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z; const d2 = dx * dx + dz * dz; const r = this.radius + o.radius + 0.25;
      if (d2 < r * r && d2 > 1e-4) { const d = Math.sqrt(d2); want.x += dx / d * (r - d) * 2.2; want.z += dz / d * (r - d) * 2.2; }
    }
    for (const o of g.hostileTargets()) {
      if (o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z; const d2 = dx * dx + dz * dz; const r = this.radius + (o.radius ?? 0.35) + 0.1;
      if (d2 < r * r && d2 > 1e-4) { const d = Math.sqrt(d2); want.x += dx / d * (r - d) * 4; want.z += dz / d * (r - d) * 4; }
    }
    // don't walk off ledges on purpose
    const ax = this.pos.x + want.x * 0.9, az = this.pos.z + want.z * 0.9;
    if (want.lengthSq() > 0.01 && !groundAhead(g.world, ax, this.pos.y, az, 2.2)) { want.set(-want.z, 0, want.x).multiplyScalar(0.3); }
    const sp = this.speed * speedMul * (this.slowT > 0 ? 0.4 : 1);
    return want.multiplyScalar(sp);
  }
  faceTo(p, dt, rate = 10) { this.facing = dampAngle(this.facing, Math.atan2(p.x - this.pos.x, p.z - this.pos.z), rate, dt); }

  update(dt) {
    const g = this.game;
    if (this.dead) {
      this.deathT += dt;
      this.rig.swap(null);
      this.object.scale.setScalar(Math.max(0.01, 1 - this.deathT * 2.2) * (this.rig.spec.scale ?? 1));
      this.object.position.y -= dt * 0.8;
      this.rig.animate({ dt, speed: 0, vel: this.vel, action: { type: 'death', t: Math.min(1, this.deathT * 2) } });
      return this.deathT < 0.5;
    }
    if (g.frozen && g.domainSys.inside(this.pos)) { // Unlimited Void: everything stops
      this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null); this.flashT -= dt;
      this.moveBody(dt, tmp.set(0, 0, 0));
      return true;
    }
    if (this.sealT > 0) { // Prison Realm: sealed in place
      this.sealT -= dt; this.flashT -= dt;
      if (Math.random() < 0.3) g.particles.glow.emit(this.pos.x + (Math.random() - 0.5), this.pos.y + Math.random() * this.height, this.pos.z + (Math.random() - 0.5), 0, 0.3, 0, 0.6, 1.2, 1.1, 1.8, 0.12, 0, 1, 1, 1);
      this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
      this.moveBody(dt, tmp2.set(0, 0, 0));
      return true;
    }
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.stateT += dt; this.cd -= dt; this.flashT -= dt; this.slowT = (this.slowT ?? 0) - dt;
    this.blinkCd -= dt;
    const t = this.pickTarget();
    let move = tmp2.set(0, 0, 0);
    const ai = this.def.ai;
    if (this.state === 'stagger') {
      if (this.stateT > this.stagger) this.state = 'idle';
    } else if (this.state === 'windup') {
      if (t) this.faceTo(t.pos, dt, this.def.ai === 'tank' ? 2.5 : 6);
      if (ai === 'blob') move.copy(this.steer(t ? tmp.subVectors(t.pos, this.pos) : tmp.set(0, 0, 0), 0.4));
      if (this.stateT >= this.action.windup) this.release();
    } else if (this.state === 'recover') {
      if (this.stateT > (this.action?.recover ?? 0.35)) { this.state = 'idle'; this.action = null; }
      if (this.lunge) { move.copy(this.lunge); this.lunge.multiplyScalar(Math.exp(-dt * 8)); }
    } else if (t) {
      const d = t.pos.distanceTo(this.pos);
      const toT = tmp.subVectors(t.pos, this.pos);
      switch (ai) {
        case 'melee': case 'tank':
          if (d > this.def.range * 0.9) move.copy(this.steer(toT)); else move.copy(this.steer(toT, 0.1));
          this.faceTo(t.pos, dt);
          if (d < this.def.range + 0.2 && this.cd <= 0) this.startAttack(ai === 'tank' ? 'slam' : 'bite');
          break;
        case 'blob':
          move.copy(this.steer(toT, 1));
          this.faceTo(t.pos, dt);
          if (d < this.def.range + 0.4) this.startAttack('inflate');
          break;
        case 'ranged': case 'summon': {
          const keep = this.def.keep;
          if (d > this.def.range) move.copy(this.steer(toT));
          else if (d < keep - 1.5) move.copy(this.steer(toT.negate(), 0.8));
          else { const side = tmp.set(-toT.z, 0, toT.x).normalize().multiplyScalar(Math.sin(this.stateT * 0.8 + this.home.x) > 0 ? 1 : -1); move.copy(this.steer(side, 0.5)); }
          this.faceTo(t.pos, dt);
          if (this.cd <= 0 && d < this.def.range + 1) this.startAttack(ai === 'summon' && this.summonCount < 6 ? 'summon' : 'spit');
          break;
        }
        case 'teleport':
          if (this.blinkCd <= 0 && d > 3) { this.blink(false); break; }
          move.copy(this.steer(toT, d > 2 ? 1 : 0.1));
          this.faceTo(t.pos, dt);
          if (d < this.def.range + 0.3 && this.cd <= 0) this.startAttack('slash');
          break;
      }
    } else {
      // idle wander near home
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = 2 + Math.random() * 3; this.wander = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(Math.random() < 0.4 ? 0 : 0.35); if (this.pos.distanceTo(this.home) > 5) this.wander = tmp.subVectors(this.home, this.pos).setY(0).normalize().multiplyScalar(0.35); }
      if (this.wander) { move.copy(this.steer(this.wander, 0.35)); if (this.wander.lengthSq() > 0) this.facing = dampAngle(this.facing, Math.atan2(this.wander.x, this.wander.z), 4, dt); }
    }
    if (this.spawnT > 0) move.set(0, 0, 0);
    this.moveBody(dt, move);
    // visuals
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    this.animate(dt);
    if (this.def.ai === 'summon' && this.rig.extras.orbs) this.rig.extras.orbs.rotation.y += dt * 2;
    // cursed smoke leaking
    this.smokeT = (this.smokeT ?? Math.random()) - dt;
    if (this.smokeT <= 0) { this.smokeT = this.elite ? 0.08 : 0.22; g.fx.curseSmoke(this, this.elite ? ELITE_AFFIX[this.elite].color : null); }
    return true;
  }
  moveBody(dt, move) {
    const g = this.game;
    const accel = this.grounded ? 12 : 3;
    this.vel.x = damp(this.vel.x, move.x + this.knock.x, accel, dt);
    this.vel.z = damp(this.vel.z, move.z + this.knock.z, accel, dt);
    this.knock.multiplyScalar(Math.exp(-dt * 6));
    this.stepUp = this.knock.lengthSq() < 4;
    if (this.rig.float) { this.noGravity = true; this.pos.y = damp(this.pos.y, (this.floorY ?? this.pos.y), 8, dt); }
    moveEntity(this, g.world, dt);
    if (this.rig.float) {
      const gy = g.world.groundBelow(this.pos.x, this.pos.z, this.pos.y + 1.5);
      if (isFinite(gy)) this.floorY = gy; else { this.noGravity = false; }
    }
    if (!Number.isFinite(this.pos.x + this.pos.y + this.pos.z)) { this.pos.copy(this.home); this.vel.set(0, 0, 0); this.knock.set(0, 0, 0); }
    if (this.pos.y < -6) { this.hp = 0; this.die({ pit: true }); g.onPitKill?.(this); }
  }
  animate(dt) {
    const a = this.action;
    const speed = Math.hypot(this.vel.x, this.vel.z) / Math.max(1, this.speed);
    let act = null;
    if (this.state === 'windup' && a) act = a.anim === 'raise' ? { type: 'raise', t: 0 } : a.anim === 'cast' ? { type: 'cast', t: 1, both: true } : { type: 'attack', t: Math.min(0.28, this.stateT / a.windup * 0.25), style: a.style, windup: 0.3, strike: 0.5 };
    else if (this.state === 'recover' && a) act = { type: 'attack', t: 0.3 + Math.min(0.7, this.stateT / (a.recover ?? 0.35) * 0.7), style: a.style, windup: 0.3, strike: 0.5 };
    else if (this.state === 'stagger') act = { type: 'hit', t: Math.min(1, this.stateT / Math.max(0.2, this.stagger)) };
    const bob = this.rig.float ? Math.sin(this.stateT * 2 + this.home.x) * 0.15 + this.rig.float : 0;
    let y = this.pos.y;
    this.visY = this.stepped ? damp(this.visY, y, 14, dt) : y; if (Math.abs(this.visY - y) < 0.01) this.stepped = 0;
    const rise = this.spawnT > 0 ? -this.spawnT * 3 : 0;
    this.object.position.set(this.pos.x, this.visY + bob + rise, this.pos.z);
    this.object.rotation.y = this.facing;
    if (this.rig.blob) {
      const inflate = this.state === 'windup' ? 1 + this.stateT / a.windup * 0.5 : 1;
      const sq = 1 + Math.sin(this.stateT * 12) * 0.08 * speed;
      this.rig.root.scale.set(inflate * sq * 0.9, inflate / sq * 0.9, inflate * sq * 0.9);
    }
    this.rig.animate({ dt, speed: Math.min(1, speed), vel: this.vel, action: act });
    if (this.rig.hunch) this.rig.torso.rotation.x += this.rig.hunch;
  }

  // ---------------------------------------------------------------- attacks
  startAttack(kind) {
    const g = this.game;
    const d = this.def;
    const A = {
      bite: { windup: d.windup, recover: 0.35, style: 'swingR', range: d.range + 0.3 },
      slam: { windup: d.windup, recover: 0.7, style: 'slam', range: 3, marker: 'circleFront' },
      inflate: { windup: d.windup, recover: 0.1, anim: 'none', marker: 'circle', radius: 3 },
      spit: { windup: d.windup, recover: 0.4, anim: 'cast' },
      summon: { windup: d.windup + 0.4, recover: 0.6, anim: 'raise', marker: 'summon' },
      slash: { windup: d.windup, recover: 0.4, style: 'swingL', range: d.range + 0.4, marker: 'cone' },
    }[kind];
    this.action = { kind, ...A };
    this.state = 'windup'; this.stateT = 0;
    if (A.marker === 'circleFront') {
      const f = tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(1.6).add(this.pos);
      this.marker = g.markers.spawn({ pos: f, radius: 2.6, dur: A.windup });
      this.action.center = f.clone();
    } else if (A.marker === 'circle') {
      this.marker = g.markers.spawn({ pos: this.pos, radius: A.radius, dur: A.windup, follow: this });
    } else if (A.marker === 'cone') {
      this.marker = g.markers.spawn({ pos: this.pos, radius: A.range, dur: A.windup, shape: 'cone', arc: 0.35, facing: this.facing, follow: this });
    }
    if (kind === 'inflate') g.audio?.charge(A.windup, 0.8);
    if (kind === 'summon') g.audio?.energy('summon');
    // eyes flare during wind-up
    if (d.grade <= '2') g.audio?.warn();
  }
  release() {
    const g = this.game, a = this.action, t = this.target;
    this.marker = null;
    this.state = 'recover'; this.stateT = 0;
    this.cd = this.def.cd * (0.8 + Math.random() * 0.4) * (this.elite === 'swift' ? 0.7 : 1);
    const fwd = tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing));
    switch (a.kind) {
      case 'bite': case 'slash': {
        this.lunge = fwd.clone().multiplyScalar(a.kind === 'slash' ? 7 : 6);
        for (const p of g.hostileTargets()) {
          if (p.dead) continue;
          const to = tmp2.subVectors(p.pos, this.pos); const dist = to.setY(0).length();
          if (dist < a.range + p.radius && Math.abs(angleDiff(this.facing, Math.atan2(to.x, to.z))) < 1.0) this.hitPlayer(p, this.dmg, fwd.clone().multiplyScalar(5));
        }
        g.fx.slashArc(this.pos, this.facing, a.kind === 'slash' ? 0xd05aff : 0xff4a4a, a.range, 0.3, 0.16);
        g.audio?.swing(0);
        break;
      }
      case 'slam': {
        const c = a.center;
        g.fx.shockwave(c, 0xff8a4a, 3.2);
        g.shake(0.3);
        g.audio?.impact(1.8);
        for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(c) < 2.8 + p.radius) this.hitPlayer(p, this.dmg, tmp2.subVectors(p.pos, c).setY(0).normalize().multiplyScalar(10));
        break;
      }
      case 'inflate': this.hp = 0; this.die({}); break;
      case 'spit': {
        if (!t) break;
        const from = this.pos.clone().add(new THREE.Vector3(0, this.height * 0.8, 0)).addScaledVector(fwd, 0.4);
        const lead = t.vel ? t.pos.clone().addScaledVector(t.vel, 0.45) : t.pos.clone();
        const dist = lead.distanceTo(from);
        const flight = clamp(dist / 11, 0.45, 1.1);
        const grav = 14;
        const vel = new THREE.Vector3((lead.x - from.x) / flight, (lead.y + 0.8 - from.y) / flight + 0.5 * grav * flight, (lead.z - from.z) / flight);
        const self = this;
        g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg, gravity: grav, life: 3, shape: 'orb', color: this.kind === 'summoner' ? 0xff6ad8 : 0x9aff3a, scale: 1.1, light: 3,
          trail: (p) => { if (Math.random() < 0.6) g.particles.burst(p.pos, { count: 1, color: p.color ?? 0x9aff3a, speed: 0.3, life: 0.4, size: 0.25, sizeEnd: 0.1, drag: 3 }); },
          onHit: (target, p) => { self.hitPlayer(target, self.dmg, p.vel.clone().setY(0).normalize().multiplyScalar(4)); g.fx.splat(p.pos, 0x9aff3a); },
          onExpire: (p, why) => { if (why !== 'hit') { g.fx.splat(p.pos, 0x9aff3a); g.hazards?.acid(p.pos, self.dmg * 0.4); } } });
        g.audio?.energy('spit');
        break;
      }
      case 'summon': {
        const n = 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const a2 = this.facing + (i - (n - 1) / 2) * 0.9;
          const p = this.pos.clone().add(new THREE.Vector3(Math.sin(a2) * 1.8, 0, Math.cos(a2) * 1.8));
          const gy = g.world.groundBelow(p.x, p.z, p.y + 2); if (!isFinite(gy)) continue;
          p.y = gy;
          g.spawnEnemy('imp', p, { summoned: true });
          g.fx.summonCircle(p, 0xff6ad8);
          this.summonCount++;
        }
        break;
      }
    }
  }
  hitPlayer(p, dmg, knock) {
    if (p.iframes > 0 || p.dead) return;
    const dealt = p.takeDamage(dmg, this, { knock });
    if (dealt > 0 && this.elite === 'vampiric') { this.hp = Math.min(this.maxHp, this.hp + dealt * 1.5); }
  }
  blink(evade) {
    const g = this.game, t = this.target;
    let dest = null;
    for (let tries = 0; tries < 8 && !dest; tries++) {
      const base = t && !evade ? t.pos : this.pos;
      const ang = t && !evade ? Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z) + (Math.random() - 0.5) * 1.5 : Math.random() * Math.PI * 2;
      const r = evade ? 4 + Math.random() * 3 : 2.2;
      const p = base.clone().add(new THREE.Vector3(Math.sin(ang) * r, 0, Math.cos(ang) * r));
      const gy = g.world.groundBelow(p.x, p.z, base.y + 3);
      if (isFinite(gy) && Math.abs(gy - base.y) < 3 && !g.world.solidAt(p.x, gy + 0.5, p.z) && !g.world.solidAt(p.x, gy + 1.5, p.z)) { p.y = gy; dest = p; }
    }
    if (!dest) { this.blinkCd = 1; return; }
    g.fx.blinkPuff(this.pos, 0xb05aff);
    this.pos.copy(dest); this.visY = dest.y; this.vel.set(0, 0, 0);
    g.fx.blinkPuff(this.pos, 0xb05aff);
    g.audio?.energy('teleport');
    this.blinkCd = 3 + Math.random() * 2;
    if (t) { this.facing = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z); if (!evade) this.cd = Math.min(this.cd, 0.15); }
  }
}

export { ELITE_AFFIX };
