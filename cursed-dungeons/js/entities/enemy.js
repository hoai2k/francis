// Curses: shared enemy behaviour (targeting, steering, separation, pit
// avoidance, knockback, stagger, telegraphed attacks, death) plus the
// archetype AIs: swarmer (melee), spitter (ranged), bulwark (shield tank),
// phantom (teleporter), brood mother (summoner) and bloater (explodes), and
// the wider bestiary: fly heads that dive (fly), the womb that bursts into
// imps (crawl), the pouncing grasshopper (leap), the tunnelling hand
// (burrow), the maw turret (turret), the ash spirit's burning trail (ember),
// the grave deity's coffin (grave), the lantern's sniper beam (beam), the
// slit-mouth's neck lunge (lunge), the corpse doll's guard aura (guard), the
// shadow's cloaked ambush (ambush), the serpent's charge (charge) and the
// bodhisattva's blessing (buff).
//
// Every attack is telegraphed (a ground marker that fills during the
// wind-up) and can be dodged by leaving it. The attacks themselves (timings,
// telegraphs, wind-up, hit, active phase) live in enemyAttacks.js. Close-range attackers share the
// attack-token rule: only MAX_ATTACKERS of them engage one target at once.
import * as THREE from 'three/webgpu';
import { moveEntity, groundAhead } from '../physics.js';
import { buildCurseModel, CURSES, addEliteShell } from './curses.js';
import { ATTACKS } from './enemyAttacks.js';
import { FLASH_MATERIAL } from './character.js';
import { damp, dampAngle, clamp, angleDiff } from '../util.js';

const MAX_ATTACKERS = 3;   // melee curses allowed to engage one target at a time
// AIs that close in to attack and so need an attack token
const TOKEN_AI = new Set(['melee', 'tank', 'fly', 'leap', 'burrow', 'charge', 'lunge', 'ambush', 'ember']);

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
const MOVE = new THREE.Vector3();   // this frame's walk (kept apart from the scratch vectors attacks use)
const UP = new THREE.Vector3(0, 1, 0);
const ELITE_AFFIX = {
  swift: { color: 0x4affd8, label: 'Swift' },
  armored: { color: 0xffc24a, label: 'Armored' },
  vampiric: { color: 0xff3a5a, label: 'Vampiric' },
  explosive: { color: 0xff8a2a, label: 'Explosive' },
  shadow: { color: 0xb05aff, label: 'Blinking' },
};

// The shadow stalker while cloaked: a faint violet shimmer.
const CLOAK_MATERIAL = new THREE.MeshBasicNodeMaterial({ transparent: true, opacity: 0.1, depthWrite: false });
CLOAK_MATERIAL.color = new THREE.Color(0x3a1a6a);

// The grave deity's coffin: one cached mesh pair, cloned per trap.
let COFFIN = null;
function coffinModel() {
  if (!COFFIN) {
    const L = [], G = [];
    const b = (list, w, h, d, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateY(ry); g.translate(x, y, z); list.push(g); };
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; b(L, 1.3, 2.4, 0.12, Math.sin(a) * 0.62, 1.2, Math.cos(a) * 0.62, a); }
    b(L, 1.45, 0.16, 1.45, 0, 2.45, 0); b(L, 1.5, 0.12, 1.5, 0, 0.06, 0);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; b(L, 0.16, 2.6, 0.16, Math.sin(a + 0.785) * 0.88, 1.25, Math.cos(a + 0.785) * 0.88); }
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; b(G, 0.12, 1.4, 0.04, Math.sin(a) * 0.69, 1.4, Math.cos(a) * 0.69, a); b(G, 0.6, 0.1, 0.04, Math.sin(a) * 0.69, 1.7, Math.cos(a) * 0.69, a); }
    const merge = (list) => { const out = list[0].toNonIndexed(); const parts = list.map((g) => g.toNonIndexed()); const pos = [], nrm = []; for (const g of parts) { pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); out.dispose(); return geo; };
    const wood = new THREE.MeshStandardNodeMaterial({ color: 0x3e2a1e, roughness: 0.85 });
    const glow = new THREE.MeshBasicNodeMaterial(); glow.color = new THREE.Color(0xc060ff).multiplyScalar(3);
    COFFIN = { wood: merge(L), glow: merge(G), mw: wood, mg: glow };
  }
  const grp = new THREE.Group();
  const a = new THREE.Mesh(COFFIN.wood, COFFIN.mw); a.castShadow = true; grp.add(a);
  grp.add(new THREE.Mesh(COFFIN.glow, COFFIN.mg));
  return grp;
}

export class Enemy {
  constructor(game, kind, pos, { elite = null, level = 1, summoned = false } = {}) {
    this.game = game; this.kind = kind; this.def = CURSES[kind];
    const d = this.def;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = d.radius; this.height = d.height;
    this.level = level; this.summoned = summoned;
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
    if (elite) addEliteShell(this.rig, ELITE_AFFIX[elite].color, elite, d.radius);
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
    this.liftOff = 0; this.liftWant = 0;    // visual height offset (dives, pounces, digging)
    this.empowerT = 0; this.guardT = 0; this.revealT = 0; this.retreatT = 0; this.fireT = 1 + Math.random();
    this.cloaked = false;
    this.isEnemy = true;
  }
  get name() { return (this.elite ? ELITE_AFFIX[this.elite].label + ' ' : '') + this.def.name; }

  // ---------------------------------------------------------------- damage
  takeDamage(amount, src, o = {}) {
    if (this.dead || this.spawnT > 0.2 || this.untargetable) return 0;
    let dmg = amount;
    // Bulwark / corpse-doll shields block frontal hits
    if (this.def.shield && src && !o.unblockable && this.state !== 'stagger') {
      const from = Math.atan2(src.pos.x - this.pos.x, src.pos.z - this.pos.z);
      if (Math.abs(angleDiff(this.facing, from)) < 0.9) { dmg *= 0.2; o.blocked = true; this.game.fx.hitSpark(tmp.copy(this.pos).setY(this.pos.y + 1.2).addScaledVector(tmp2.set(Math.sin(this.facing), 0, Math.cos(this.facing)), 0.8), null, { color: 0xffe0a0 }); this.game.audio?.tone({ freq: 900, to: 600, dur: 0.12, gain: 0.1, type: 'square', filter: 3000 }); }
    }
    // a corpse doll's guard halves the hit
    if (this.guardT > 0 && this.def.ai !== 'guard') {
      dmg *= 0.5;
      if (Math.random() < 0.5) this.game.fx.hitSpark(tmp.copy(this.pos).setY(this.pos.y + this.height * 0.6), null, { color: 0x5ae8ff });
    }
    dmg *= 1 - this.armor;
    this.hp -= dmg;
    this.flashT = 0.1;
    this.aggro = true;
    if (this.def.ai === 'ambush') this.revealT = 1.6;
    if (src && src.isPlayer && !this.target) this.target = src;
    if (o.knock && !this.def.rooted) {
      const k = o.knock.clone().multiplyScalar(1 - (this.def.knockResist ?? 0) * (o.blocked ? 1 : 0.8));
      this.knock.add(k);
      if (k.length() > 6 && this.state !== 'active') this.vel.y = Math.max(this.vel.y, 4 + k.length() * 0.25);
    }
    const st = (o.stagger ?? 0.2) * (this.def.knockResist ? 0.5 : 1) * (this.elite ? 0.6 : 1);
    if (st > 0.15 && !o.blocked && this.state !== 'active' && (this.state !== 'windup' || st > 0.4 || !this.def.superArmor)) {
      if (this.state === 'windup') this.cancelAttack();
      this.state = 'stagger'; this.stateT = 0; this.stagger = st;
    }
    this.game.audio?.enemyHurt(this.def.pitch ?? 1);
    if (this.hp <= 0) this.die(o);
    else if (this.elite === 'shadow' && Math.random() < 0.25 && this.state !== 'active') this.blink(true);
    return dmg;
  }
  cancelAttack() { if (this.marker) { this.game.markers.cancel(this.marker); this.marker = null; } this.action = null; this.neckExt = 0; }
  die(o = {}) {
    if (this.dead) return;
    this.dead = true; this.deathT = 0; this.state = 'dead';
    this.cancelAttack();
    this.untargetable = false; this.burrowed = false; this.object.visible = true; this.guarding = false;
    const g = this.game;
    const c = this.pos.clone(); c.y += this.height * 0.5;
    g.fx.curseDeath(c, this.height, this.elite ? 0xff8aff : 0x7a3aa8);
    g.audio?.enemyDie(this.def.grade <= '2');
    g.onEnemyKilled?.(this, o);
    if (this.elite === 'explosive' || this.def.ai === 'blob') this.explode(o.fromBlob);
    // Mahito's victims: about half split into two crawling remnants
    if (this.def.split && !o.pit && !this.summoned && Math.random() < 0.5) {
      for (const s of [-1, 1]) {
        const p = this.pos.clone().add(tmp.set(Math.cos(this.facing) * s * 0.7, 0, -Math.sin(this.facing) * s * 0.7));
        const gy = g.world.standY(p.x, p.z, this.pos.y); if (!isFinite(gy)) continue;
        p.y = gy;
        const e = g.spawnEnemy(this.def.split, p, { summoned: true, level: this.level });
        if (e) { e.spawnT = 0.25; e.aggro = true; e.knock.set(Math.cos(this.facing) * s * 4, 0, -Math.sin(this.facing) * s * 4); }
      }
      g.fx.splat(c, 0x6affd0);
    }
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
  // Melee attack tokens: the closest MAX_ATTACKERS close-range curses on a target may engage.
  hasToken(t) {
    const g = this.game;
    if (g.time - (this.tokenAt ?? -9) < 0.25) return this.token;
    this.tokenAt = g.time;
    const my = this.pos.distanceToSquared(t.pos);
    let closer = 0;
    for (const o of g.enemies) {
      if (o === this || o.dead || o.isDummy || o.target !== t) continue;
      if (!TOKEN_AI.has(o.def?.ai)) continue;
      if (o.pos.distanceToSquared(t.pos) < my) closer++;
    }
    this.token = closer < MAX_ATTACKERS;
    return this.token;
  }
  pickTarget() {
    const g = this.game;
    let best = null, bd = this.aggro ? 22 : 12;
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
      if (o === this || o.dead || o.burrowed) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z; const d2 = dx * dx + dz * dz; const r = this.radius + o.radius + 0.25;
      if (d2 < r * r && d2 > 1e-4) { const d = Math.sqrt(d2); want.x += dx / d * (r - d) * 2.2; want.z += dz / d * (r - d) * 2.2; }
    }
    if (!this.burrowed) for (const o of g.hostileTargets()) {
      if (o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z; const d2 = dx * dx + dz * dz; const r = this.radius + (o.radius ?? 0.35) + 0.1;
      if (d2 < r * r && d2 > 1e-4) { const d = Math.sqrt(d2); want.x += dx / d * (r - d) * 4; want.z += dz / d * (r - d) * 4; }
    }
    // don't walk off ledges on purpose
    const ax = this.pos.x + want.x * 0.9, az = this.pos.z + want.z * 0.9;
    if (want.lengthSq() > 0.01 && !groundAhead(g.world, ax, this.pos.y, az, 2.2)) { want.set(-want.z, 0, want.x).multiplyScalar(0.3); }
    // transfigured humans lurch forward in surges; blessed curses hurry
    const lurch = this.def.lurch ? 0.4 + 1.25 * Math.max(0, Math.sin(g.time * 4 + this.home.x)) : 1;
    const sp = this.speed * speedMul * lurch * (this.slowT > 0 ? 0.4 : 1) * (this.empowerT > 0 ? 1.3 : 1);
    return want.multiplyScalar(sp);
  }
  faceTo(p, dt, rate = 10) { this.facing = dampAngle(this.facing, Math.atan2(p.x - this.pos.x, p.z - this.pos.z), rate, dt); }
  // keep a distance band: close in beyond `range`, back off inside `keep`, else strafe
  kite(t, d, toT, keep, range, move, strafe = 0.5) {
    if (d > range) move.copy(this.steer(toT));
    else if (d < keep - 1.5) move.copy(this.steer(tmp3.copy(toT).negate(), 0.85));
    else { const side = tmp3.set(-toT.z, 0, toT.x).normalize().multiplyScalar(Math.sin(this.stateT * 0.8 + this.home.x) > 0 ? 1 : -1); move.copy(this.steer(side, strafe)); }
  }
  // circle a target at a ring while waiting for an attack token
  waitRing(t, d, toT, ring, move) {
    if (d > ring + 1) move.copy(this.steer(toT, 0.8));
    else if (d < ring - 0.8) move.copy(this.steer(tmp3.copy(toT).negate(), 0.6));
    else { const side = tmp3.set(-toT.z, 0, toT.x).normalize().multiplyScalar(Math.sin(this.stateT * 0.6 + this.home.z) > 0 ? 1 : -1); move.copy(this.steer(side, 0.35)); }
  }
  // free length of a straight line along the floor before a wall (beams, charges, lunges)
  clearLen(facing, max, y = 1.0) {
    const w = this.game.world, sx = Math.sin(facing), sz = Math.cos(facing);
    for (let s = 0.6; s <= max; s += 0.4) {
      const x = this.pos.x + sx * s, z = this.pos.z + sz * s;
      if (w.solidAt(x, this.pos.y + y, z) || w.solidAt(x, this.pos.y + y + 0.8, z)) return Math.max(0, s - 0.4);
    }
    return max;
  }
  // re-aim a rectangle marker (markers.js places rects from their base)
  aimRect(m, facing, len, width) {
    if (!m) return;
    const mesh = m.mesh;
    mesh.rotation.set(-Math.PI / 2, 0, facing + Math.PI);
    mesh.scale.set(width / 2, Math.max(0.1, len) / 2, 1);
    mesh.position.set(this.pos.x + Math.sin(facing) * len / 2, this.pos.y + 0.05, this.pos.z + Math.cos(facing) * len / 2);
    m.follow = null;
  }
  inRect(p, facing, len, width) {
    const fx = Math.sin(facing), fz = Math.cos(facing);
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const along = dx * fx + dz * fz, across = Math.abs(dx * fz - dz * fx);
    return along > -0.3 && along < len + (p.radius ?? 0.35) && across < width / 2 + (p.radius ?? 0.35) && Math.abs(p.pos.y - this.pos.y) < 2.2;
  }
  // a corpse doll looks for the curse it should protect
  findWard() {
    const g = this.game;
    if (g.time - (this.wardAt ?? -9) < 0.5 && this.ward && !this.ward.dead) return this.ward;
    this.wardAt = g.time;
    let best = null, bd = 12 * 12;
    for (const e of g.enemies) {
      if (e === this || e.dead || e.isBoss || e.isDummy || !e.def || e.def.ai === 'guard' || e.burrowed) continue;
      const d = e.pos.distanceToSquared(this.pos);
      if (d < bd) { bd = d; best = e; }
    }
    this.ward = best;
    return best;
  }
  alliesNear(r) { return this.game.enemies.filter((e) => e !== this && !e.dead && !e.isBoss && !e.isDummy && e.def && e.pos.distanceTo(this.pos) < r); }

  // one frame; returns false once the body has finished dying (main.js then removes it)
  update(dt) {
    if (this.dead) return this.updateDead(dt);
    if (this.updateHeld(dt)) return true;
    const g = this.game;
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.stateT += dt; this.cd -= dt; this.flashT -= dt; this.slowT = (this.slowT ?? 0) - dt;
    this.blinkCd -= dt;
    this.empowerT = Math.max(0, this.empowerT - dt); this.guardT = Math.max(0, this.guardT - dt);
    this.revealT = Math.max(0, this.revealT - dt); this.retreatT = Math.max(0, this.retreatT - dt);
    this.liftWant = 0; this.guarding = false;
    const t = this.pickTarget();
    const move = MOVE.set(0, 0, 0);
    const skipMove = this.updateState(dt, t, move);
    if (this.spawnT > 0 || this.def.rooted) move.set(0, 0, 0);
    if (!skipMove) this.moveBody(dt, move);
    this.liftOff = this.state === 'active' ? this.liftWant : damp(this.liftOff, this.liftWant, 8, dt);
    // visuals
    this.updateCloak();
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : this.cloaked ? CLOAK_MATERIAL : null);
    this.animate(dt);
    if (this.def.ai === 'summon' && this.rig.extras.orbs) this.rig.extras.orbs.rotation.y += dt * 2;
    // cursed smoke leaking (not from a cloaked or buried curse)
    this.smokeT = (this.smokeT ?? Math.random()) - dt;
    if (this.smokeT <= 0 && !this.cloaked && !this.burrowed) { this.smokeT = this.elite ? 0.08 : 0.22; g.fx.curseSmoke(this, this.elite ? ELITE_AFFIX[this.elite].color : null); }
    this.statusFx(dt);
    return true;
  }
  updateDead(dt) {
    this.deathT += dt;
    this.rig.swap(null);
    this.object.scale.setScalar(Math.max(0.01, 1 - this.deathT * 2.2) * (this.rig.spec.scale ?? 1));
    this.object.position.y -= dt * 0.8;
    this.rig.animate({ dt, speed: 0, vel: this.vel, action: { type: 'death', t: Math.min(1, this.deathT * 2) } });
    return this.deathT < 0.5;
  }
  // held in place by a technique (Unlimited Void, Prison Realm); returns true when held this frame
  updateHeld(dt) {
    const g = this.game;
    if (g.frozen && g.domainSys.inside(this.pos)) { // Unlimited Void: everything stops
      this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null); this.flashT -= dt;
      if (this.state !== 'active') this.moveBody(dt, tmp.set(0, 0, 0));
      return true;
    }
    if (this.sealT > 0) { // Prison Realm: sealed in place
      this.sealT -= dt; this.flashT -= dt;
      if (Math.random() < 0.3) g.particles.glow.spawn({ x: this.pos.x + (Math.random() - 0.5), y: this.pos.y + Math.random() * this.height, z: this.pos.z + (Math.random() - 0.5), vy: 0.3, life: 0.6, r: 1.2, g: 1.1, b: 1.8, size: 0.12, drag: 1, sizeEnd: 1, shape: 'square' });
      this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
      if (this.state !== 'active') this.moveBody(dt, tmp2.set(0, 0, 0));
      return true;
    }
    return false;
  }
  // the attack state machine (stagger, wind-up, active, recover), else the archetype's AI;
  // fills `move` and returns true when the body was moved already
  updateState(dt, t, move) {
    const ai = this.def.ai;
    if ((this.state === 'windup' || this.state === 'active') && !this.action) this.state = 'idle';   // (an attack cancelled by a stun / seal)
    let skipMove = false;
    if (this.state === 'stagger') {
      if (this.stateT > this.stagger) this.state = 'idle';
    } else if (this.state === 'windup') {
      if (t && !this.action.lockFace) this.faceTo(t.pos, dt, ai === 'tank' ? 2.5 : ai === 'turret' ? 3 : 6);
      if (ai === 'blob') move.copy(this.steer(t ? tmp.subVectors(t.pos, this.pos) : tmp.set(0, 0, 0), 0.4));
      this.windupStep(dt, t);
      if (this.action && this.stateT >= this.action.windup) this.release();
    } else if (this.state === 'active') {
      skipMove = this.activeStep(dt, t, move);
    } else if (this.state === 'recover') {
      if (this.stateT > (this.action?.recover ?? 0.35)) { this.state = 'idle'; this.action = null; }
      if (this.lunge) { move.copy(this.lunge); this.lunge.multiplyScalar(Math.exp(-dt * 8)); }
    } else if (t) this.think(dt, t, move);
    else this.roam(dt, move);
    return skipMove;
  }
  // the archetype AIs: close in, keep distance, circle, pick the next attack
  think(dt, t, move) {
    const g = this.game, ai = this.def.ai;
    const d = t.pos.distanceTo(this.pos);
    const toT = tmp.subVectors(t.pos, this.pos);
    switch (ai) {
      case 'melee': case 'tank':
        // Only a few curses may attack the same target at once; the rest
        // circle at a short distance and wait their turn.
        if (!this.isBoss && !this.hasToken(t)) { this.waitRing(t, d, toT, this.def.range + 2.2, move); this.faceTo(t.pos, dt); break; }
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
        this.kite(t, d, toT, this.def.keep, this.def.range, move);
        this.faceTo(t.pos, dt);
        if (this.cd <= 0 && d < this.def.range + 1) this.startAttack(ai === 'summon' && this.summonCount < 3 ? 'summon' : 'spit');
        break;
      }
      case 'teleport':
        if (this.blinkCd <= 0 && d > 3) { this.blink(false); break; }
        move.copy(this.steer(toT, d > 2 ? 1 : 0.1));
        this.faceTo(t.pos, dt);
        if (d < this.def.range + 0.3 && this.cd <= 0) this.startAttack('slash');
        break;
      case 'fly': {
        // hover in an orbit round the target; token holders tighten in and dive
        const tok = this.hasToken(t);
        const ring = tok && this.cd < 0.8 ? 3.4 : 5.6;
        const side = tmp3.set(-toT.z, 0, toT.x).normalize().multiplyScalar(Math.sin(this.stateT * 0.45 + this.home.x * 3) > 0 ? 1 : -1);
        const radial = tmp.copy(toT).normalize().multiplyScalar(clamp((d - ring) * 0.6, -1, 1));
        move.copy(this.steer(radial.add(side), 0.9));
        this.faceTo(t.pos, dt);
        if (tok && this.cd <= 0 && d < this.def.range + 0.5) this.startAttack('dive');
        break;
      }
      case 'crawl':
        move.copy(this.steer(toT, 1));
        this.faceTo(t.pos, dt, 5);
        if (d < this.def.range + 0.3) this.startAttack('burst');
        break;
      case 'leap': {
        const tok = this.hasToken(t);
        if (d < 2.0 && this.cd <= 0 && tok) { this.startAttack('slash'); break; }
        if (tok && this.cd <= 0 && d < this.def.range && d > 2.6) { this.startAttack('pounce'); break; }
        this.kite(t, d, toT, this.def.keep, this.def.range, move, 0.6);
        this.faceTo(t.pos, dt);
        break;
      }
      case 'burrow': {
        const tok = this.hasToken(t);
        if (tok && this.cd <= 0 && d > 3.6 && d < 16) { this.startAttack('dig'); break; }
        if (!tok) { this.waitRing(t, d, toT, 4.5, move); this.faceTo(t.pos, dt); break; }
        move.copy(this.steer(toT, d > this.def.range * 0.9 ? 1 : 0.1));
        this.faceTo(t.pos, dt);
        if (d < this.def.range + 0.2 && this.cd <= 0) this.startAttack('bite');
        break;
      }
      case 'turret':
        this.faceTo(t.pos, dt, 3);
        if (this.cd <= 0 && d < 3.0) this.startAttack('chomp');
        else if (this.cd <= 0 && d < this.def.range) this.startAttack('volley');
        break;
      case 'ember': {
        // scuttles in zigzags, leaving burning ground; flares up when close
        const tok = this.hasToken(t);
        const zig = tmp3.set(-toT.z, 0, toT.x).normalize().multiplyScalar(Math.sin(g.time * 2.2 + this.home.x) * 0.8);
        if (!tok) this.waitRing(t, d, toT, 4.5, move);
        else move.copy(this.steer(tmp.copy(toT).normalize().add(zig), d > 1.6 ? 1 : 0.1));
        this.faceTo(t.pos, dt);
        if (tok && d < this.def.range + 0.3 && this.cd <= 0) this.startAttack('flare');
        this.dropFire(dt);
        break;
      }
      case 'grave': {
        this.kite(t, d, toT, this.def.keep, this.def.range, move, 0.45);
        this.faceTo(t.pos, dt);
        if (this.cd <= 0 && d < this.def.range && !(t.coffinT > 0) && g.time > (t.coffinFree ?? 0)) this.startAttack('coffin');
        break;
      }
      case 'beam': {
        const face = Math.atan2(toT.x, toT.z);
        const clear = this.clearLen(face, d + 1, 1.6) >= d - 0.6;
        if (!clear) move.copy(this.steer(toT, 0.8));           // no line of sight: reposition
        else this.kite(t, d, toT, this.def.keep, this.def.range, move, 0.35);
        this.faceTo(t.pos, dt);
        if (clear && this.cd <= 0 && d < this.def.range) this.startAttack('beam');
        break;
      }
      case 'charge': {
        const tok = this.hasToken(t), face = Math.atan2(toT.x, toT.z);
        this.kite(t, d, toT, this.def.keep, this.def.range * 0.8, move, 0.7);
        this.faceTo(t.pos, dt, 6);
        if (tok && this.cd <= 0 && d < this.def.range && this.clearLen(face, d, 0.8) > Math.min(d, 5)) this.startAttack('charge');
        break;
      }
      case 'lunge': {
        const tok = this.hasToken(t), face = Math.atan2(toT.x, toT.z);
        if (d < 2.0) move.copy(this.steer(tmp3.copy(toT).negate(), 0.9));
        else this.kite(t, d, toT, this.def.keep, this.def.range - 0.6, move, 0.5);
        this.faceTo(t.pos, dt);
        if (tok && this.cd <= 0 && d < this.def.range - 0.4 && d > 1.8 && this.clearLen(face, d, 1.8) >= d - 0.5) this.startAttack('lunge');
        break;
      }
      case 'guard': {
        const ward = this.findWard();
        if (ward) {
          // stand between the ward and the target, shield up, and cover everyone nearby
          const goal = tmp3.copy(t.pos).sub(ward.pos).setY(0); const gl = goal.length();
          goal.multiplyScalar(gl > 0.01 ? Math.min(1.8, gl * 0.5) / gl : 0).add(ward.pos).sub(this.pos).setY(0);
          if (goal.length() > 0.4) move.copy(this.steer(goal, goal.length() > 3 ? 1.1 : 0.6));
          this.faceTo(t.pos, dt, 6);
          this.guardAura(dt);
          if (d < this.def.range + 0.3 && this.cd <= 0) this.startAttack('slam');
          break;
        }
        if (!this.hasToken(t)) { this.waitRing(t, d, toT, this.def.range + 2.2, move); this.faceTo(t.pos, dt); break; }
        move.copy(this.steer(toT, d > this.def.range * 0.9 ? 1 : 0.1));
        this.faceTo(t.pos, dt);
        if (d < this.def.range + 0.2 && this.cd <= 0) this.startAttack('slam');
        break;
      }
      case 'ambush': {
        // slinks round behind the target while cloaked; strikes from close, then withdraws
        if (this.retreatT > 0) { const away = (this._away ??= new THREE.Vector3()).copy(this.pos).sub(toT); move.copy(this.steer(tmp3.copy(toT).negate(), 1.1)); this.faceTo(away, dt, 6); break; }
        const tok = this.hasToken(t);
        if (tok && this.cd <= 0 && d < 4.2) { this.startAttack('ambush'); break; }
        const tf = t.facing ?? 0;
        const goal = tmp3.set(t.pos.x - Math.sin(tf) * 2.6, 0, t.pos.z - Math.cos(tf) * 2.6).sub(this.pos).setY(0);
        if (!tok || this.cd > 0) { if (d < 5) goal.copy(toT).negate(); else goal.set(-toT.z, 0, toT.x).add(tmp.copy(toT).multiplyScalar(0.3)); }
        move.copy(this.steer(goal, 1.05));
        this.faceTo(t.pos, dt);
        break;
      }
      case 'buff': {
        const allies = this.alliesNear(8);
        if (d < 5) move.copy(this.steer(tmp3.copy(toT).negate(), 1));
        else this.kite(t, d, toT, this.def.keep, this.def.range + 3, move, 0.4);
        this.faceTo(t.pos, dt);
        if (this.cd <= 0) { if (allies.length) this.startAttack('bless'); else if (d < this.def.range) this.startAttack('spit'); }
        break;
      }
    }
  }
  // no target: wander near home (a burrowed hand surfaces first)
  roam(dt, move) {
    if (this.burrowed && this.state !== 'windup') this.startAttack('emerge');
    this.wanderT -= dt;
    if (this.wanderT <= 0) { this.wanderT = 2 + Math.random() * 3; this.wander = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(Math.random() < 0.4 ? 0 : 0.35); if (this.pos.distanceTo(this.home) > 5) this.wander = tmp.subVectors(this.home, this.pos).setY(0).normalize().multiplyScalar(0.35); }
    if (this.wander && !this.def.rooted) { move.copy(this.steer(this.wander, 0.35)); if (this.wander.lengthSq() > 0) this.facing = dampAngle(this.facing, Math.atan2(this.wander.x, this.wander.z), 4, dt); }
  }
  // blessed (empowered) curses burn red; buried hands churn the floor; cloaked shadows shimmer
  statusFx(dt) {
    const g = this.game, Pt = g.particles, bud = Pt.budget ?? 1;
    if (this.empowerT > 0 && Math.random() < 8 * dt * bud) Pt.glow.spawn({ x: this.pos.x + (Math.random() - 0.5) * this.radius * 2, y: this.pos.y + Math.random() * this.height, z: this.pos.z + (Math.random() - 0.5) * this.radius * 2, vy: 1.2, life: 0.6, r: 2.4, g: 0.5, b: 0.2, size: 0.1, gravity: -0.5, drag: 1, sizeEnd: 0.1 });
    if (this.burrowed && Math.random() < 30 * dt * bud) Pt.smoke.spawn({ x: this.pos.x + (Math.random() - 0.5) * 0.8, y: this.pos.y + 0.1, z: this.pos.z + (Math.random() - 0.5) * 0.8, vx: (Math.random() - 0.5) * 1.5, vy: 1.2 + Math.random(), vz: (Math.random() - 0.5) * 1.5, life: 0.6, r: 0.22, g: 0.17, b: 0.12, size: 0.25, gravity: 5, drag: 2, sizeEnd: 1.0 });
    if (this.cloaked && Math.random() < 3 * dt * bud) Pt.glow.spawn({ x: this.pos.x + (Math.random() - 0.5) * 0.6, y: this.pos.y + Math.random() * this.height, z: this.pos.z + (Math.random() - 0.5) * 0.6, vy: 0.3, life: 0.5, r: 0.5, g: 0.25, b: 0.9, size: 0.06, drag: 1, sizeEnd: 0.1 });
  }
  updateCloak() {
    if (this.def.ai !== 'ambush') return;
    const want = !(this.revealT > 0) && this.state !== 'windup' && this.state !== 'recover' && this.state !== 'active' && this.state !== 'stagger' && this.spawnT <= 0;
    if (want === this.cloaked) return;
    this.cloaked = want;
    this.object.traverse((m) => { if (m.userData.shell) m.visible = !want; });
    if (!want) { this.game.fx.blinkPuff(this.pos, 0x8a4aff); this.game.audio?.noise({ dur: 0.35, gain: 0.25, type: 'highpass', freq: 2500, sweep: 6000, q: 1 }); }
  }
  // the ash spirit's trail: a patch of fire every couple of seconds while hunting (at most 3 alive)
  dropFire(dt) {
    this.fireT -= dt;
    if (this.fireT > 0 || Math.hypot(this.vel.x, this.vel.z) < 0.8) return;
    this.fireT = 2.2;
    const g = this.game;
    this.fires = (this.fires ?? []).filter((h) => g.hazards.list.includes(h));
    if (this.fires.length >= 3) return;
    const n = g.hazards.list.length;
    g.hazards.add({ pos: this.pos, radius: 1.0, dps: this.dmg * 0.5, dur: 3.6, color: 0xff6a1a });
    if (g.hazards.list.length > n) this.fires.push(g.hazards.list[g.hazards.list.length - 1]);
  }
  // the corpse doll's guard: halves the damage taken by curses within 5.5 m
  guardAura(dt) {
    const g = this.game;
    this.guarding = true;
    const Pt = g.particles, bud = Pt.budget ?? 1;
    for (const e of this.alliesNear(5.5)) {
      if (e.def.ai === 'guard') continue;
      e.guardT = 0.3;
      if (Math.random() < 5 * dt * bud) {
        // a thread of light from the doll's core to each guarded curse
        const k = Math.random();
        Pt.glow.spawn({ x: this.pos.x + (e.pos.x - this.pos.x) * k, y: this.pos.y + 1.1 + (e.pos.y - this.pos.y) * k + Math.sin(k * Math.PI) * 0.5, z: this.pos.z + (e.pos.z - this.pos.z) * k, vy: 0.1, life: 0.5, r: 0.4, g: 1.6, b: 2.0, size: 0.09, drag: 1, sizeEnd: 0.1 });
        Pt.glow.spawn({ x: e.pos.x + (Math.random() - 0.5) * e.radius * 2, y: e.pos.y + Math.random() * e.height, z: e.pos.z + (Math.random() - 0.5) * e.radius * 2, vy: 0.4, life: 0.5, r: 0.3, g: 1.2, b: 1.6, size: 0.07, drag: 1, sizeEnd: 0.1 });
      }
    }
  }
  moveBody(dt, move) {
    const g = this.game;
    const accel = this.grounded ? 12 : 3;
    if (this.def.rooted) this.knock.set(0, 0, 0);
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
    if (this.state === 'windup' && a) act = a.anim === 'none' ? null : a.anim === 'raise' ? { type: 'raise', t: 0 } : a.anim === 'cast' ? { type: 'cast', t: 1, both: true } : { type: 'attack', t: Math.min(0.28, this.stateT / a.windup * 0.25), style: a.style, windup: 0.3, strike: 0.5 };
    else if ((this.state === 'recover' || this.state === 'active') && a && a.anim !== 'none') act = { type: 'attack', t: 0.3 + Math.min(0.7, this.stateT / (a.recover || 0.35) * 0.7), style: a.style, windup: 0.3, strike: 0.5 };
    else if (this.state === 'stagger') act = { type: 'hit', t: Math.min(1, this.stateT / Math.max(0.2, this.stagger)) };
    const bob = this.rig.float ? Math.sin(this.stateT * 2 + this.home.x) * 0.15 + this.rig.float : 0;
    let y = this.pos.y;
    this.visY = this.stepped ? damp(this.visY, y, 14, dt) : y; if (Math.abs(this.visY - y) < 0.01) this.stepped = 0;
    const rise = this.spawnT > 0 ? -this.spawnT * 3 : 0;
    this.object.position.set(this.pos.x, this.visY + bob + rise + this.liftOff, this.pos.z);
    this.object.rotation.y = this.facing;
    this.object.visible = !this.burrowed;
    if (this.rig.blob) {
      const inflate = this.state === 'windup' ? 1 + this.stateT / a.windup * 0.5 : 1;
      const sq = 1 + Math.sin(this.stateT * 12) * 0.08 * speed;
      this.rig.root.scale.set(inflate * sq * 0.9, inflate / sq * 0.9, inflate * sq * 0.9);
    }
    this.rig.animate({ dt, speed: Math.min(1, speed), vel: this.vel, action: act });
    if (this.rig.hunch) this.rig.torso.rotation.x += this.rig.hunch;
    this.rig.idle?.(dt, this);   // per-kind flavour: jaws, eyes, sacs, tails, particles
  }

  // ---------------------------------------------------------------- attacks
  // Every attack is an entry in ATTACKS (enemyAttacks.js); these run its phases.
  startAttack(kind) {
    const g = this.game;
    const d = this.def, t = this.target;
    const atk = ATTACKS[kind];
    const A = atk.spec(d);
    this.action = { kind, ...A };
    this.state = 'windup'; this.stateT = 0;
    if (A.marker === 'circleFront') {
      const f = tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(A.front ?? 1.6).add(this.pos);
      this.marker = g.markers.spawn({ pos: f, radius: A.radius ?? 2.6, dur: A.windup });
      this.action.center = f.clone();
    } else if (A.marker === 'circle') {
      this.marker = g.markers.spawn({ pos: this.pos, radius: A.radius, dur: A.windup, follow: this, color: A.color ?? 0xff2020 });
    } else if (A.marker === 'cone') {
      this.marker = g.markers.spawn({ pos: this.pos, radius: A.range, dur: A.windup, shape: 'cone', arc: 0.35, facing: this.facing, follow: this });
    } else if (A.marker === 'target' && t) {
      // a fixed circle where the target stands now (led a little for a pounce)
      const c = t.pos.clone();
      if (A.lead && t.vel) c.addScaledVector(tmp.set(t.vel.x, 0, t.vel.z), A.lead);
      const gy = g.world.standY(c.x, c.z, t.pos.y, 2);
      if (!isFinite(gy)) c.copy(t.pos); else c.y = gy;
      this.action.center = c;
      this.marker = g.markers.spawn({ pos: c, radius: A.radius, dur: A.windup, color: A.color ?? 0xff2020 });
    } else if (A.marker === 'here') {
      this.action.center = this.pos.clone();
      this.marker = g.markers.spawn({ pos: this.pos, radius: A.radius, dur: A.windup });
    } else if (A.marker === 'rect') {
      this.action.len = this.clearLen(this.facing, A.max, A.aimY ?? 0.9);
      this.marker = g.markers.spawn({ pos: this.pos, shape: 'rect', width: A.width, length: Math.max(0.5, this.action.len), facing: this.facing, dur: A.windup, color: A.color ?? 0xff2020 });
    }
    atk.start?.(this, this.action);
    // eyes flare during wind-up
    if (d.grade <= '2') g.audio?.warn();
  }
  // per-frame work during a wind-up: tracking lines, crouches, the buried hand's rumble
  windupStep(dt, t) {
    const a = this.action; if (!a) return;
    ATTACKS[a.kind].windup?.(this, a, dt, t, Math.min(1, this.stateT / a.windup));
  }
  // per-frame work while an attack is in motion; returns true when it moved the body itself
  activeStep(dt, t, move) {
    const a = this.action;
    if (!a) { this.state = 'idle'; return false; }
    a.t = (a.t ?? 0) + dt;
    const active = ATTACKS[a.kind].active;
    if (active) return !!active(this, a, dt, t, move);
    this.state = 'recover'; this.stateT = 0;
    return false;
  }
  // the wind-up is over: the attack lands (or sets off, for the ones with an active phase)
  release() {
    const a = this.action, t = this.target;
    this.marker = null;
    this.state = 'recover'; this.stateT = 0;
    this.cd = this.def.cd * (0.8 + Math.random() * 0.4) * (this.elite === 'swift' ? 0.7 : 1) * (this.empowerT > 0 ? 0.75 : 1);
    ATTACKS[a.kind].release?.(this, a, t, tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing)));
  }
  fireSpit(t, angle = 0) {
    const g = this.game;
    const fwd = tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing));
    const from = this.pos.clone().add(new THREE.Vector3(0, this.height * 0.8, 0)).addScaledVector(fwd, 0.4);
    const lead = t.vel ? t.pos.clone().addScaledVector(t.vel, 0.45) : t.pos.clone();
    if (angle) lead.sub(from).applyAxisAngle(UP, angle).add(from);
    const dist = lead.distanceTo(from);
    const flight = clamp(dist / 11, 0.45, 1.1);
    const grav = 14;
    const vel = new THREE.Vector3((lead.x - from.x) / flight, (lead.y + 0.8 - from.y) / flight + 0.5 * grav * flight, (lead.z - from.z) / flight);
    const self = this;
    const col = this.kind === 'summoner' ? 0xff6ad8 : this.kind === 'maw' ? 0xff7a3a : this.kind === 'healer' ? 0x6aff8a : 0x9aff3a;
    g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg, gravity: grav, life: 3, shape: 'orb', color: col, scale: 1.1, light: 3,
      trail: (p) => { if (Math.random() < 0.6) g.particles.burst(p.pos, { count: 1, color: col, speed: 0.3, life: 0.4, size: 0.25, sizeEnd: 0.1, drag: 3 }); },
      onHit: (target, p) => { self.hitPlayer(target, self.dmg, p.vel.clone().setY(0).normalize().multiplyScalar(4)); g.fx.splat(p.pos, col); },
      onExpire: (p, why) => { if (why !== 'hit') { g.fx.splat(p.pos, col); if (self.kind !== 'maw' || angle === 0) g.hazards?.acid(p.pos, self.dmg * 0.4); } } });
  }
  // the womb splits open: a burst of gore and three imps (killing it first prevents this)
  wombBurst() {
    const g = this.game, c = this.pos.clone();
    g.fx.explosion(c, 0xff5ab0, 2.4); g.audio?.energy('explode'); g.shake(0.3);
    for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(c) < 2.6 + (p.radius ?? 0.35)) this.hitPlayer(p, this.dmg, tmp.subVectors(p.pos, c).setY(0).normalize().multiplyScalar(8));
    for (let i = 0; i < 3; i++) {
      const a = this.facing + i * 2.094;
      const p = c.clone().add(tmp.set(Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2));
      const gy = g.world.standY(p.x, p.z, c.y); if (!isFinite(gy)) continue;
      p.y = gy;
      const e = g.spawnEnemy('imp', p, { summoned: true, level: this.level });
      if (e) { e.spawnT = 0.3; e.aggro = true; g.fx.summonCircle(p, 0xff6ad8); }
    }
    this.hp = 0; this.die({ burst: true });
  }
  // the grave deity's seal: a coffin closes round the player for a moment
  trapInCoffin(p) {
    const g = this.game;
    p.coffinT = 1.1; p.coffinFree = g.time + 4;   // a short immunity after breaking out
    const at = p.pos.clone();
    const mesh = coffinModel(); mesh.position.copy(at); mesh.rotation.y = this.facing; g.scene.add(mesh);
    p.takeDamage(this.dmg * 0.5, this, {});
    g.audio?.impact(1.2); g.shake(0.25);
    const self = this;
    g.addUpdater((dt) => {
      p.coffinT -= dt;
      if (!p.dead && !p.downed) { p.pos.x = at.x; p.pos.z = at.z; p.vel.x = 0; p.vel.z = 0; p.knock?.set(0, 0, 0); }
      const k = 1.1 - p.coffinT;
      mesh.scale.set(1, Math.min(1, k * 7), 1);
      if (Math.random() < 0.4) g.particles.glow.spawn({ x: at.x + (Math.random() - 0.5) * 1.2, y: at.y + Math.random() * 2.4, z: at.z + (Math.random() - 0.5) * 1.2, vy: 0.6, life: 0.6, r: 1.2, g: 0.4, b: 1.8, size: 0.1, drag: 1, sizeEnd: 0.1 });
      if (p.coffinT <= 0 || p.dead || !g.scene.children.includes(mesh)) {
        g.scene.remove(mesh);
        g.fx.debris(at.clone().setY(at.y + 1.2), 0x4a3426, 10); g.audio?.breakBlock('wood');
        if (!p.dead && !p.downed) p.takeDamage(self.dmg * 0.3, null, { dot: true, noKnock: true });
        p.coffinT = 0; p.iframes = Math.max(p.iframes, 0.6);
        return false;
      }
    });
  }
  hitPlayer(p, dmg, knock) {
    if (p.iframes > 0 || p.dead) return;
    const dealt = p.takeDamage(dmg * (this.empowerT > 0 ? 1.25 : 1), this, { knock });
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
      const gy = g.world.standY(p.x, p.z, base.y, 2);
      if (isFinite(gy)) { p.y = gy; dest = p; }
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
