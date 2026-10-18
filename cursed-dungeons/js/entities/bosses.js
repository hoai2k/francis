// Special Grade bosses: the shared runtime. Each boss (entities/bosses/<id>.js)
// is a definition with stats, a model builder (rig with idle/onPhase hooks),
// a pattern list per phase and its canon moves as generator coroutines that
// yield wait times. Every big hit is telegraphed with a ground marker.
//
// Definition fields (all optional except name/hp/build/phases/moves):
//   name, hudName, title, kanji-free stats: hp, speed, dmg, color, radius, height, keepDist
//   phaseAt [0.66, 0.33], phaseNames ['', 'PHASE 2 · …', …], phaseMove { 1: 'move', 2: 'move' }
//   build() -> Rig            model (boss-looks.js helpers)
//   phases [[moves…] ×3]      pattern pool per phase
//   moves { name: function*() }  run with `this` = the Boss
//   init(), tick(dt), onDamage(dmg, src, o) -> dmg, onDeath(), linked (not a mission boss)
//
// Boss helpers for moves: still()/free(), pose(), aim(), players(), gy(),
// mark(), hurt(), hurtLine(), hurtCone(), callout(), task(), addProp(),
// summon(), around(), domain().
import * as THREE from 'three/webgpu';
import { FLASH_MATERIAL } from './character.js';
import { moveEntity } from '../physics.js';
import { damp, dampAngle, angleDiff } from '../util.js';
import { toast } from '../ui/ui.js';
import { BOSS_DEFS } from './bosses/index.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();

export const BOSSES = BOSS_DEFS;
// mission bosses (linked second bodies such as Kechizu are spawned by their partner)
export const BOSS_IDS = Object.keys(BOSSES).filter((k) => !BOSSES[k].linked);

export class Boss {
  constructor(game, id, pos, level = 1, opts = {}) {
    this.game = game; this.id = id; this.B = BOSSES[id] ?? BOSSES.jogo;
    const B = this.B;
    this.level = level;
    this.def = { name: B.name, grade: 'S', knockResist: 0.95, pitch: B.pitch ?? 0.5 };
    this.displayName = B.hudName ?? B.name;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = B.radius ?? 1.1; this.height = B.height ?? 4.2;
    const np = Math.max(1, game.players.length);
    this.maxHp = B.hp * (1 + (level - 1) * 0.45) * (1 + (np - 1) * 0.6) * (opts.hpMul ?? 1); this.hp = this.maxHp;
    this.dmg = B.dmg * (1 + (level - 1) * 0.2);
    this.rig = B.build(); this.object = this.rig.root; this.object.position.copy(pos);
    this.facing = opts.facing ?? 0; this.phase = 0; this.isBoss = true; this.isEnemy = true;
    this.co = null; this.coWait = 0; this.flashT = 0; this.dead = false; this.deathT = 0;
    this.grounded = false; this.coyote = 0; this.visY = pos.y; this.stepUp = true;
    this.anim = null; this.moving = true; this.untargetable = false;
    this.speedMul = 1; this.dmgTaken = 1;
    this.tasks = []; this.props = []; this.st = {};
    this.parent = opts.parent ?? null; this.linkedTo = [];
    this.home = pos.clone();
    const room = game.mission?.L?.bossRoom;
    this.arena = room ? { c: room.center.clone().setY(room.y ?? pos.y), R: (room.x1 - room.x0) / 2 - 1 } : { c: pos.clone(), R: 11 };
    this.intro = opts.intro ?? 2.6;
    this.lastPattern = null;
    this.lightH = game.lights.attach(this.object, B.color, 4, 10, { offsetY: Math.max(5, this.height + 1), priority: 3 });
    B.init?.call(this);
  }
  get name() { return this.B.name; }
  get color() { return this.B.color; }
  // ---------------------------------------------------------------- damage
  takeDamage(amount, src, o = {}) {
    if (this.dead || this.untargetable || this.intro > 0) return 0;
    let dmg = amount * this.dmgTaken;
    if (this.B.onDamage) dmg = this.B.onDamage.call(this, dmg, src, o);
    if (!(dmg > 0)) return 0;
    this.hp -= dmg; this.flashT = 0.08;
    if (o.knock) this.knock.addScaledVector(o.knock, 0.08);
    const f = this.hp / this.maxHp, at = this.B.phaseAt ?? [0.66, 0.33];
    const want = f < at[1] ? 2 : f < at[0] ? 1 : 0;
    if (want > this.phase && this.hp > 0) this.enterPhase(want);
    if (this.hp <= 0) this.die();
    return dmg;
  }
  enterPhase(n) {
    const g = this.game;
    this.phase = n;
    this.resetMove();
    this.co = this.phaseRoutine(n); this.coWait = 0;
    if (!this.parent) toast(this.B.phaseNames?.[n] ?? `PHASE ${n + 1}`, 'big');
    g.audio?.boss();
    g.fx.flash(this.B.color, 0.4, 0.3);
    g.shake(0.7);
    this.rig.onPhase?.(n, this);
    this.B.onPhase?.call(this, n);
  }
  *phaseRoutine(n) {
    yield* this.roar();
    const m = this.B.phaseMove?.[n];
    if (m) yield* this.run(m);
  }
  die() {
    const g = this.game;
    if (this.dead) return;
    this.dead = true; this.deathT = 0; this.co = null; this.tasks.length = 0; this.object.visible = true; this.untargetable = false; this.st.airborne = false;
    if (g.domain && g.domain.caster === this) g.domainSys.collapse();   // the barrier cracks and shatters with its caster
    this.B.onDeath?.call(this);
    for (const p of this.props) this.removeProp(p, true);
    g.lights.remove(this.lightH);
    for (const c of this.linkedTo) if (!c.dead) c.die();
    if (this.parent) {   // a linked second body: falls without ending the fight
      g.audio?.enemyDie(true); g.shake(0.6); g.fx.flash(this.B.color, 0.4, 0.25);
      g.pickups.drop('heal', this.pos, 2); g.pickups.drop('coin', this.pos, 12, 1);
      if (!this.parent.dead) this.parent.B.onLinkedDeath?.call(this.parent, this);
      return;
    }
    g.slowMo(1.6, 0.25);
    g.shake(1); g.fx.flash(0xffffff, 0.7, 0.4);
    g.audio?.enemyDie(true); g.audio?.gong();
    for (const m of g.markers.items) if (m.active && !m.keep) g.markers.cancel(m);
    g.onBossKilled?.(this);
  }
  // ---------------------------------------------------------------- helpers for moves
  run(name) {
    const fn = this.B.moves[name];
    if (typeof fn !== 'function') { console.warn('boss move missing', this.id, name); return this.B.moves[this.B.phases[0][0]].call(this); }
    return fn.call(this);
  }
  target() {
    let best = null, bd = Infinity;
    for (const p of this.game.hostileTargets()) { if (p.dead || p.downed) continue; const d = p.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  players() { return this.game.hostileTargets().filter((p) => !p.dead && !p.downed); }
  // stop / resume walking, set an animation pose
  still(anim = null) { this.moving = false; if (anim) this.anim = anim; }
  free() { this.moving = true; this.anim = null; }
  pose(type, o = {}) { this.anim = { type, t: o.t ?? 0, ...o }; return this.anim; }
  aim(t = this.target()) { if (t) this.facing = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z); return t; }
  fwd(out = new THREE.Vector3()) { return out.set(Math.sin(this.facing), 0, Math.cos(this.facing)); }
  ground(p) { const gy = this.game.world.groundBelow(p.x, p.z, p.y + 4); return isFinite(gy) ? gy : p.y; }
  gy(p) { const q = p.clone(); q.y = this.ground(q); return q; }
  // keep a point inside the arena floor
  clampArena(p, margin = 1) {
    const a = this.arena; tmp3.subVectors(p, a.c).setY(0); const d = tmp3.length(), R = a.R - margin;
    if (d > R) { p.x = a.c.x + tmp3.x / d * R; p.z = a.c.z + tmp3.z / d * R; }
    return p;
  }
  around(center, rMin, rMax, a = Math.random() * Math.PI * 2) {
    const r = rMin + Math.random() * (rMax - rMin);
    return this.gy(this.clampArena(center.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))));
  }
  mark(pos, o = {}) { return this.game.markers.spawn({ color: 0xff3a2a, ...o, pos: o.raw ? pos : this.gy(pos) }); }
  // damage every hostile target within radius of center (horizontal), returns the ones hit
  hurt(center, radius, dmg, knockPow = 8, o = {}) {
    const out = [];
    for (const p of this.game.hostileTargets()) {
      if (p.dead) continue;
      tmp.subVectors(p.pos, center); const dy = tmp.y; tmp.y = 0;
      if (tmp.length() < radius + (p.radius ?? 0.3) && Math.abs(dy) < (o.dy ?? 3) && (!o.filter || o.filter(p))) {
        const k = tmp.lengthSq() > 1e-4 ? tmp.normalize().multiplyScalar(knockPow) : new THREE.Vector3(0, 0, 0);
        if (o.up) k.y = o.up;
        if (p.takeDamage(dmg, this, { knock: k, dot: o.dot, noKnock: o.noKnock }) > 0) { out.push(p); o.onHit?.(p); }
      }
    }
    return out;
  }
  hurtPlayers(center, radius, dmg, knockPow = 8, filter = null) { return this.hurt(center, radius, dmg, knockPow, { filter }); }
  // a straight strip from origin along dir (halfW to each side)
  hurtLine(origin, dir, len, halfW, dmg, knockPow = 6, o = {}) {
    const out = [], d = tmp2.copy(dir).setY(0).normalize();
    for (const p of this.game.hostileTargets()) {
      if (p.dead) continue;
      tmp.subVectors(p.pos, origin); const dy = tmp.y; tmp.y = 0;
      const along = tmp.dot(d), lat = Math.abs(tmp.x * d.z - tmp.z * d.x);
      if (along > -0.5 && along < len && lat < halfW + (p.radius ?? 0.3) && Math.abs(dy) < (o.dy ?? 3)) {
        const k = o.side ? new THREE.Vector3(d.z, 0, -d.x).multiplyScalar(Math.sign(tmp.x * d.z - tmp.z * d.x) * knockPow) : d.clone().multiplyScalar(knockPow);
        if (o.up) k.y = o.up;
        if (p.takeDamage(dmg, this, { knock: k, dot: o.dot }) > 0) { out.push(p); o.onHit?.(p); }
      }
    }
    return out;
  }
  hurtCone(origin, facing, range, halfArc, dmg, knockPow = 6, o = {}) {
    const out = [];
    for (const p of this.game.hostileTargets()) {
      if (p.dead) continue;
      tmp.subVectors(p.pos, origin); const dy = tmp.y; tmp.y = 0; const d = tmp.length();
      if (d < range + (p.radius ?? 0.3) && Math.abs(dy) < 3 && (d < 0.8 || Math.abs(angleDiff(facing, Math.atan2(tmp.x, tmp.z))) < halfArc)) {
        if (p.takeDamage(dmg, this, { knock: tmp.normalize().multiplyScalar(knockPow), dot: o.dot }) > 0) { out.push(p); o.onHit?.(p); }
      }
    }
    return out;
  }
  // the move's canon name in the boss colour (big = centre-screen banner)
  callout(text, big = false) {
    if (big) { toast(text, 'big'); return; }
    const layer = document.getElementById('toast-layer'); if (!layer) return;
    const el = document.createElement('div');
    el.className = 'toast bossmove'; el.textContent = text;
    el.style.setProperty('--bc', '#' + new THREE.Color(this.B.color).getHexString());
    layer.appendChild(el); setTimeout(() => el.remove(), 2200);
  }
  // a parallel coroutine owned by the boss (paused with it, cancelled when it dies)
  task(gen) { this.tasks.push({ gen, wait: 0 }); return gen; }
  // scene props that belong to the fight (removed with the mission or the boss)
  addProp(o) { if (this.game.mission) this.game.mission.addProp(o); else this.game.scene.add(o); this.props.push(o); return o; }
  removeProp(o, keepList = false) {
    this.game.scene.remove(o);
    const mp = this.game.mission?.props; if (mp) { const i = mp.indexOf(o); if (i >= 0) mp.splice(i, 1); }
    if (!keepList) { const i = this.props.indexOf(o); if (i >= 0) this.props.splice(i, 1); }
  }
  summon(kind, n, { name = null, color = this.B.color, r0 = 2.5, r1 = 5, around: c = this.pos, elite = null, list = null } = {}) {
    const g = this.game, out = [];
    for (let i = 0; i < n; i++) {
      const s = this.around(c, r0, r1, i / n * Math.PI * 2 + Math.random() * 0.6);
      const e = g.spawnEnemy(kind, s, { summoned: true, level: g.mission?.difficulty ?? this.level, elite });
      if (e) { if (name) e.displayName = name; g.fx.summonCircle(s, color); out.push(e); list?.push(e); }
    }
    g.audio?.energy('summon');
    return out;
  }
  // a dash along dir, hitting what it passes once
  *dash(dir, speed, steps, hitR, dmg, knockPow = 12, o = {}) {
    const g = this.game, hit = new Set();
    for (let k = 0; k < steps; k++) {
      this.knock.copy(dir).multiplyScalar(speed);
      for (const p of g.hostileTargets()) {
        if (p.dead || hit.has(p) || p.pos.distanceTo(this.pos) > hitR + this.radius) continue;
        hit.add(p); p.takeDamage(dmg, this, { knock: dir.clone().multiplyScalar(knockPow) }); o.onHit?.(p);
      }
      o.trail?.(k);
      if (o.blocks !== false) g.combat.hitBlocks(this.pos, dir, hitR + 0.6, 1.2, 80, null);
      yield 0.04;
    }
    this.knock.set(0, 0, 0);
    return hit;
  }
  // leap onto a point (arc), slam on landing
  *leap(to, dur = 0.7, height = 6) {
    const from = this.pos.clone(); this.untargetable = true; this.st.airborne = true;
    const steps = Math.max(4, Math.round(dur / 0.03));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      this.pos.lerpVectors(from, to, t); this.pos.y = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * height;
      this.vel.set(0, 0, 0); this.knock.set(0, 0, 0);
      yield dur / steps;
    }
    this.pos.copy(to); this.untargetable = false; this.st.airborne = false; this.vel.set(0, 0, 0);
  }
  // a Domain Expansion cast by the boss through the shared domain system: the
  // barrier closes over the whole arena (centred on it), trapping the players
  // inside with the boss until it ends or the boss dies. No camera move.
  // (One domain at a time; js/domain.js resolves a clash by power.)
  domain(def) {
    const g = this.game;
    if (!g.domainSys || (g.domain && g.domain.phase !== 'collapse')) return false;
    const a = this.arena, inArena = a && Math.hypot(this.pos.x - a.c.x, this.pos.z - a.c.z) < a.R + 4;
    return g.domainSys.start(this, { sureHit: false, radius: 24, ...def, center: inArena ? a.c : this.pos, minRadius: inArena ? a.R + 3 : 0 });
  }
  // ---------------------------------------------------------------- coroutines
  *roar() {
    const g = this.game;
    this.untargetable = true; this.anim = { type: 'raise', t: 0 }; this.moving = false;
    g.fx.shockwave(this.pos, this.B.color, 7);
    this.hurt(this.pos, 4, this.dmg * 0.5, 14);
    yield 1.2;
    this.untargetable = false; this.anim = null; this.moving = true;
  }
  // clean slate before each pattern (a move can be cut short, e.g. by Higuruma's court)
  resetMove() {
    this.object.visible = true; this.untargetable = false; this.st.airborne = false;
    this.anim = null; this.moving = true;
    this.B.reset?.call(this);
  }
  pickPattern() {
    const list = this.B.phases[Math.max(0, Math.min(2, this.phase | 0))];
    let p;
    for (let i = 0; i < 4; i++) { p = list[Math.floor(Math.random() * list.length)]; if (p !== this.lastPattern) break; }
    this.lastPattern = p;
    return this.run(p);
  }
  // ---------------------------------------------------------------- update
  update(dt) {
    const g = this.game;
    if (this.dead) {
      this.deathT += dt;
      if (Math.random() < 0.5) g.fx.explosion(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * this.height, (Math.random() - 0.5) * 3)), this.B.color, 1.5);
      this.object.scale.setScalar(Math.max(0.01, (1 - this.deathT / 1.8)) * this.rig.spec.scale);
      this.object.rotation.y += dt * 4;
      if (this.deathT > 1.8) { g.fx.curseDeath(this.pos.clone().setY(this.pos.y + 2), 3, this.B.color); return false; }
      return true;
    }
    if (g.frozen && g.domainSys.inside(this.pos)) { this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null); this.flashT -= dt; return true; }
    if (this.parent && this.parent.dead) { this.die(); return true; }
    this.flashT -= dt;
    this.intro = Math.max(0, this.intro - dt);
    const t = this.target();
    // coroutine + parallel tasks
    if (this.intro <= 0) {
      this.B.tick?.call(this, dt);
      if (this.coWait > 0) this.coWait -= dt;
      else {
        if (!this.co) { this.resetMove(); this.co = this.pickPattern(); }
        const r = this.co.next();
        if (r.done) { this.co = null; this.coWait = Math.max(0.15, 0.4 + Math.random() * 0.6 - this.phase * 0.15); }
        else this.coWait = r.value ?? 0;
      }
      for (let i = this.tasks.length - 1; i >= 0 && !this.dead; i--) {
        const k = this.tasks[i];
        if ((k.wait -= dt) > 0) continue;
        const r = k.gen.next(dt);
        if (r.done) this.tasks.splice(i, 1); else k.wait = r.value ?? 0;
      }
      if (this.dead) return true;
    }
    // movement toward the nearest player
    let move = tmp2.set(0, 0, 0);
    if (t && this.moving && this.intro <= 0) {
      tmp.subVectors(t.pos, this.pos).setY(0); const d = tmp.length();
      if (d > (this.B.keepDist ?? this.radius + 2.4)) move.copy(tmp.normalize().multiplyScalar(this.B.speed * this.speedMul * (1 + this.phase * 0.2)));
      this.facing = dampAngle(this.facing, Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z), 4, dt);
    }
    this.vel.x = damp(this.vel.x, move.x + this.knock.x, 8, dt); this.vel.z = damp(this.vel.z, move.z + this.knock.z, 8, dt);
    this.knock.multiplyScalar(Math.exp(-dt * 5));
    if (!this.st.airborne) moveEntity(this, g.world, dt);
    if (this.pos.y < -4) { this.pos.copy(this.home); this.vel.set(0, 0, 0); }
    // visuals
    this.visY = this.stepped ? damp(this.visY, this.pos.y, 12, dt) : this.pos.y; if (Math.abs(this.visY - this.pos.y) < 0.01) this.stepped = 0;
    this.object.position.set(this.pos.x, this.visY + (this.intro > 0 ? -this.intro * 1.2 : 0) + (this.hover ?? 0), this.pos.z);
    this.object.rotation.y = this.facing;
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    const sp = Math.hypot(this.vel.x, this.vel.z) / this.B.speed;
    this.rig.animate({ dt, speed: Math.min(1, sp), vel: this.vel, action: this.anim ?? (this.intro > 0 ? { type: 'raise', t: 0 } : null) });
    this.rig.idle?.(dt, this);   // per-boss idle animation and VFX (boss-looks.js / bosses/<id>.js)
    return true;
  }
}
