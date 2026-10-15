// Yuji-style kit — raw physical power.
//   LMB  five-hit combo; press again right as a hit lands to arm a Black Flash
//        (2.5× damage, black-red lightning, heavy hit-stop) on the next blow.
//   RMB  Rubble Throw: rip up a chunk of the floor and hurl it.
//   1    Divergent Fist: dash punch whose cursed energy lands a second time a beat later.
//   2    Manji Kick: spinning kick that launches everything around you.
//   3    The Zone: the post-Black-Flash flow state — for a few seconds the timing
//        window widens and the first hit is a guaranteed Black Flash.
//   F    Ultimate (no domain): Consecutive Black Flash — four Black Flashes in a
//        row on the strongest curse, then a Divergent Fist finisher.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit } from './index.js';

const RED = 0xff3a2a;
const tmp = new THREE.Vector3();

export const YUJI_SKILLS = [
  { id: 'bf_window', name: 'Sparks of Black', desc: 'Wider Black Flash timing window.', max: 3 },
  { id: 'bf_ce', name: 'Black Spark Surge', desc: 'Black Flashes restore Cursed Energy.', max: 2, req: 'bf_window' },
  { id: 'combo', name: 'Heavy Hands', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'divergent', name: 'Divergent Fist', desc: 'The delayed impact hits harder.', max: 3 },
  { id: 'manji', name: 'Manji Kick', desc: 'Bigger launch radius and damage.', max: 2 },
  { id: 'rubble', name: 'Boulder', desc: 'Rubble Throw is bigger and explodes.', max: 2 },
  { id: 'vitality', name: 'Vessel Body', desc: '+15 max HP per rank.', max: 3 },
  { id: 'focus', name: 'Deeper Zone', desc: 'The Zone lasts longer.', max: 2, req: 'bf_window' },
];

class YujiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.5, arc: 1.1, lunge: 7, knock: 3, stop: 0.045, shake: 0.14, trail: RED, sparkColor: 0xffc0a0, chainAt: 0.55 },
      { style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 13, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.16, trail: RED, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 14, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.16, trail: RED, chainAt: 0.55 },
      { style: 'uppercut', dur: 0.4, windup: 0.3, strike: 0.5, dmg: 18, range: 2.6, arc: 1.0, lunge: 5, knock: 5, stop: 0.07, shake: 0.24, trail: 0xffa080, launch: true, chainAt: 0.6 },
      { style: 'slam', dur: 0.58, windup: 0.42, strike: 0.6, dmg: 30, range: 3.4, arc: Math.PI, lunge: 4, knock: 12, stop: 0.1, shake: 0.5, ring: true, ringColor: RED, stagger: 0.6, trail: RED },
    ];
    this.p.stats.meleeMult += r('combo') * 0.08;
    this.p.maxHp += r('vitality') * 15; this.p.hp = Math.min(this.p.hp + r('vitality') * 15, this.p.maxHp);
    this.slots = {
      ranged: this.ability({ name: 'Rubble Throw', icon: '🪨', cd: 2.2, ce: 0, use: () => this.rubble() }),
      t1: this.ability({ name: 'Divergent Fist', icon: '👊', cd: 5, ce: 10, use: () => this.divergent() }),
      t2: this.ability({ name: 'Manji Kick', icon: '🦵', cd: 8, ce: 14, use: () => this.manji() }),
      t3: this.ability({ name: 'The Zone', icon: '⚡', cd: 18, ce: 25, use: () => this.focus() }),
    };
    // Yuji has no canon Domain Expansion to cast here: F is his payoff move —
    // a chain of consecutive Black Flashes (he tied Nanami's record of four)
    // sealed with a Divergent Fist whose cursed energy lands a beat later.
    this.ultimate = { name: 'Consecutive Black Flash', icon: '⚡', use: () => this.blackFlashChain() };
    this.window = 0.13 + r('bf_window') * 0.035;
    this.windowAt = -9; this.armed = false; this.focusT = 0;
  }
  // timing: pressing attack shortly after a hit lands arms a Black Flash (see onStrike)
  tick(dt, inp) {
    this.focusT = Math.max(0, this.focusT - dt);
    if (inp.pressed.attack) {
      const w = this.window * (this.focusT > 0 ? 2.5 : 1);
      const dtHit = this.game.time - this.windowAt;
      if (dtHit >= 0 && dtHit <= w) {
        this.armed = true;
        this.game.fx.rings.spawn(tmp.set(this.p.pos.x, this.p.pos.y + 0.08, this.p.pos.z), { color: 0xff1a1a, r0: 1.4, r1: 0.4, dur: 0.18, thick: 0.25 });
      }
    }
    // red sparks when armed
    if (this.armed && Math.random() < 0.6) this.game.particles.burst(this.handPos(), { count: 1, color: 0xff2020, speed: 2, life: 0.25, size: 0.1, shape: 1 });
  }
  blackFlashReady() {
    if (this.focusT > 0 && this.focusFirst) { this.focusFirst = false; return true; }
    if (!this.armed) return false;
    this.armed = false;
    return true;
  }
  onMeleeHit(e, step, dealt, bf) {
    if (bf) { this.game.save && (this.game.bfCount = (this.game.bfCount ?? 0) + 1); if (this.rank('bf_ce')) this.p.gainCE(6 * this.rank('bf_ce')); }
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
  }
  // -------------------------------------------------------------- techniques
  rubble() {
    const g = this.game, p = this.p, big = this.rank('rubble');
    this.p.action = { type: 'attack', step: { style: 'throw', strike: 0.5, windup: 0.3 }, style: 'throw', dur: 0.4, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0.3 };
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const from = p.pos.clone().setY(p.pos.y + 2);
    g.fx.debris(p.pos.clone().setY(p.pos.y + 0.3), 0x8a7a6a, 3);
    const dist = Math.min(12, p.aimPoint.distanceTo(p.pos)) || 8;
    const flight = 0.55, grav = 20;
    const vel = p.aimDir.clone().multiplyScalar(dist / flight); vel.y = 0.5 * grav * flight;
    g.projectiles.fire({ pos: from, vel, team: 'player', shape: 'cube', color: 0x7a6a5a, emissive: 0.05, gravity: grav, life: 2, scale: 1.6 + big * 0.5, radius: 0.7,
      onHit: (e, q) => { g.combat.damageEnemy(e, 22 + big * 8, p, { knock: q.vel.clone().setY(0).setLength(8), stagger: 0.6 }); },
      onExpire: (q) => { g.debris.burst(q.pos, 7, 8); g.combat.aoe(q.pos, 2 + big * 0.8, 12 + big * 10, p, { knock: 6, stagger: 0.4 }); g.fx.shockwave(q.pos, 0xc8a080, 2.5 + big); g.audio?.impact(1.3); g.shake(0.2); } });
    g.audio?.whoosh(1);
  }
  divergent() {
    const g = this.game, p = this.p;
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const step = { style: 'punch', dur: 0.36, windup: 0.25, strike: 0.45, dmg: 20, range: 2.8, arc: 0.9, lunge: 16, knock: 6, stop: 0.07, shake: 0.25, trail: 0x6ad8ff, sparkColor: 0x9ad8ff, custom: true };
    p.startAttack(step, 0);
    this.pendingDivergent = p.action.step;
  }
  onStrike(step) {
    this.windowAt = this.game.time;
    if (step !== this.pendingDivergent) return;
    this.pendingDivergent = null;
    const g = this.game, p = this.p;
    const hits = g.combat.query(p.pos, tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing)), 3, 0.9);
    const bf = this.blackFlashReady();
    for (const e of hits) g.combat.damageEnemy(e, 20, p, { melee: true, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(4), stagger: 0.4, blackFlash: bf });
    if (hits.length) { g.hitStop(0.06); g.shake(0.2); g.audio?.impact(1.1); if (bf) g.combat.blackFlashFx(p, hits[0]); }
    // the cursed energy arrives a beat later
    const dmg = 26 + this.rank('divergent') * 10;
    setTimeout(() => {
      for (const e of hits) {
        if (e.dead) continue;
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
        g.combat.damageEnemy(e, dmg, p, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), stagger: 0.7, color: '#6ad8ff' });
        g.fx.hitSpark(at, null, { color: 0x6ad8ff, big: true });
        g.fx.screenWave(at, 0.5, 0.3);
      }
      if (hits.length) { g.hitStop(0.08); g.shake(0.3); g.audio?.impact(1.6); }
    }, 380);
  }
  manji() {
    const g = this.game, p = this.p, rk = this.rank('manji');
    const R = 3.4 + rk * 0.6;
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.45, windup: 0.2 }, style: 'spin', dur: 0.5, elapsed: 0, t: 0, windup: 0.2, strike: 0.45, struck: true, moveScale: 0.2 };
    setTimeout(() => {
      const n = g.combat.aoe(p.pos, R, 26 + rk * 12, p, { melee: true, knock: 7, stagger: 0.8 });
      for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(p.pos) < R) e.vel.y = Math.max(e.vel.y, 11);
      g.fx.slashArc(p.pos, p.facing, RED, R, 1, 0.3);
      g.fx.shockwave(p.pos, RED, R + 1);
      if (n) { g.hitStop(0.08); g.shake(0.35); g.audio?.impact(1.5); }
    }, 200);
    g.audio?.whoosh(1.2);
  }
  focus() {
    const g = this.game;
    this.focusT = 5 + this.rank('focus') * 1.5; this.focusFirst = true;
    g.fx.flash(0x200000, 0.35, 0.2);
    g.audio?.charge(0.5, 0.6);
    g.toast?.('In the Zone');
    g.bolts.spawn(this.p.pos.clone().setY(this.p.pos.y + 1), { count: 5, length: 2, life: 0.3 });
  }
  // -------------------------------------------------------------- ultimate
  pickVictim(range) {
    const g = this.game, p = this.p;
    let best = null, bs = -1;
    for (const e of g.enemies) {
      if (e.dead || e.isDummy) continue;
      const d = e.pos.distanceTo(p.pos); if (d > range) continue;
      const sc = (e.isBoss ? 1e6 : 0) + e.hp - d * 2;
      if (sc > bs) { bs = sc; best = e; }
    }
    return best;
  }
  blackFlashChain() {
    const g = this.game, p = this.p;
    let tgt = this.pickVictim(14);
    if (!tgt) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    const HITS = 4;
    const styles = ['punch', 'swingR', 'swingL', 'uppercut'];
    p.invulnerable = true; this.chainOn = true;
    g.slowMo(2.6, 0.35);
    g.fx.dimTarget = 0.5;
    g.toast?.('BLACK FLASH', 'domain');
    g.audio?.charge(0.6, 0.5);
    g.bolts.spawn(p.pos.clone().setY(p.pos.y + 1), { count: 8, length: 2.5, life: 0.4 });
    let t = 0, n = 0, phase = 'chain', fin = 0;
    const strikeAt = (e) => {
      // blink to the curse's side and strike
      tmp.subVectors(p.pos, e.pos).setY(0); if (tmp.lengthSq() < 0.01) tmp.set(0, 0, -1);
      tmp.setLength(e.radius + 1.1);
      const to = e.pos.clone().add(tmp);
      if (!g.world.solidAt(to.x, to.y + 0.5, to.z) && !g.world.solidAt(to.x, to.y + 1.5, to.z)) { p.pos.copy(to); p.visY = to.y; p.vel.set(0, 0, 0); }
      p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    };
    g.addUpdater((dt) => {
      if (!this.chainOn) return false;
      t += dt;
      if (phase === 'chain') {
        if (t < 0.17) return true;
        t = 0;
        if (!tgt || tgt.dead) tgt = this.pickVictim(10);
        if (!tgt) { phase = 'finish'; return true; }
        strikeAt(tgt);
        const st = styles[n % styles.length];
        p.action = { type: 'attack', step: { style: st, strike: 0.5, windup: 0.3 }, style: st, dur: 0.22, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0 };
        g.combat.damageEnemy(tgt, 42, p, { melee: true, blackFlash: true, unblockable: true, crit: false, stagger: 0.8, knock: new THREE.Vector3() });
        g.combat.aoe(tgt.pos, 2.4, 14, p, { melee: true, knock: 3, stagger: 0.3, blocks: false });
        g.combat.blackFlashFx(p, tgt);
        g.fx.hitSpark(tgt.pos.clone().setY(tgt.pos.y + tgt.height * 0.6), null, { color: 0xff2020, big: true });
        g.hitStop(0.09); g.shake(0.45);
        g.audio?.impact(1.6, 'crit');
        if (this.rank('bf_ce')) p.gainCE(6 * this.rank('bf_ce'));
        g.bfCount = (g.bfCount ?? 0) + 1;
        if (++n >= HITS) phase = 'finish';
        return true;
      }
      // Divergent Fist: the punch lands, then the cursed energy a beat later
      if (fin === 0) {
        if (t < 0.22) return true;
        fin = 1; t = 0;
        if (!tgt || tgt.dead) tgt = this.pickVictim(10);
        if (tgt) strikeAt(tgt);
        p.action = { type: 'attack', step: { style: 'punch', strike: 0.5, windup: 0.3 }, style: 'punch', dur: 0.4, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0 };
        if (tgt) g.combat.damageEnemy(tgt, 40, p, { melee: true, unblockable: true, crit: false, stagger: 0.6, knock: new THREE.Vector3() });
        g.fx.hitSpark(this.handPos(), null, { color: 0x9ad8ff, big: true });
        g.audio?.impact(1.3);
        return true;
      }
      if (t < 0.32) return true;
      const c = tgt && !tgt.dead ? tgt.pos.clone() : this.handPos().setY(p.pos.y);
      const dmg = 110 + this.rank('divergent') * 25;
      if (tgt && !tgt.dead) g.combat.damageEnemy(tgt, dmg, p, { unblockable: true, crit: false, stagger: 1.2, knock: tmp.subVectors(tgt.pos, p.pos).setY(0).normalize().multiplyScalar(16), color: '#6ad8ff' });
      g.combat.aoe(c, 4.5, 45 + this.rank('divergent') * 10, p, { knock: 12, stagger: 0.8, falloff: true });
      g.fx.explosion(c.clone().setY(c.y + 1), 0x6ad8ff, 4);
      g.fx.shockwave(c, 0x6ad8ff, 6);
      g.fx.screenWave(c.clone().setY(c.y + 1), 1.4, 0.6);
      g.fx.flash(0x9ad8ff, 0.5, 0.25); g.fx.chroma(1.5);
      g.shake(0.9); g.hitStop(0.12);
      g.debris.burst(c, 7, 12, 1.3);
      g.audio?.impact(2);
      this.endChain();
      // the Zone after a Black Flash: sharper timing for a while
      this.focusT = Math.max(this.focusT, 6); this.focusFirst = true;
      return false;
    });
  }
  endChain() {
    if (!this.chainOn) return;
    this.chainOn = false;
    this.p.invulnerable = false; this.p.action = null;
    this.game.fx.dimTarget = 0;
  }
  dispose() { super.dispose(); this.endChain(); }
}
registerKit('yuji', YujiKit, YUJI_SKILLS);
