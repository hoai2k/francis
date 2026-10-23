// Yuji-style kit — raw physical power. 21 abilities on the technique tree;
// four are equipped (RMB takes a basic one) plus F.
//   LMB        five-hit combo; press again right as a hit lands to arm a Black Flash
//              (2.5× damage, black-red lightning, heavy hit-stop) on the next blow.
//   Fists      Rubble Throw (start, RMB), Cursed Energy Wave, Divergent Fist,
//              Suplex, Divergent Barrage, Soul Strike
//   Kicks      Dropkick, Manji Kick, Ground Slam, Vessel Endurance, Superhuman Sprint
//   Black Flash Rising Uppercut, Black Flash, The Zone, Reverse Cursed Technique
//   Blood      (Choso's Blood Manipulation) Blood Edge, Piercing Blood, Flowing
//              Red Scale, Supernova
//   Shrine     (late manga) Dismantle, Cleave
//   F          Ultimate (no domain): Consecutive Black Flash — four Black Flashes in a
//              row on the strongest curse, then a Divergent Fist finisher.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit } from './index.js';

const RED = 0xff3a2a;
const tmp = new THREE.Vector3();

export const YUJI_SKILLS = [
  { id: 'bf_window', name: 'Sparks of Black', icon: '✴️', desc: 'Wider Black Flash timing window.', max: 3, branch: 'Black Flash', tier: 0 },
  { id: 'bf_ce', name: 'Black Spark Surge', icon: '🔋', desc: 'Black Flashes restore Cursed Energy.', max: 2, req: 'bf_window', branch: 'Black Flash', tier: 2 },
  { id: 'combo', name: 'Heavy Hands', icon: '✊', desc: '+8% melee damage per rank.', max: 3, branch: 'Fists', tier: 2, req: 'ab:ce_wave' },
  { id: 'divergent', name: 'Divergent Impact', icon: '💠', desc: 'The delayed impact hits harder.', max: 3, req: 'ab:divergent', branch: 'Fists', tier: 3 },
  { id: 'manji', name: 'Wider Manji', icon: '🌀', desc: 'Bigger launch radius and damage.', max: 2, req: 'ab:manji', branch: 'Kicks', tier: 4 },
  { id: 'rubble', name: 'Boulder', icon: '🪨', desc: 'Rubble Throw is bigger and explodes.', max: 2, req: 'ab:rubble', branch: 'Fists', tier: 1 },
  { id: 'vitality', name: 'Vessel Body', icon: '🫀', desc: '+15 max HP per rank.', max: 3, branch: 'Kicks', tier: 0 },
  { id: 'focus', name: 'Deeper Zone', icon: '🔥', desc: 'The Zone lasts longer.', max: 2, req: 'ab:zone', branch: 'Black Flash', tier: 4 },
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
    this.branches = ['Fists', 'Kicks', 'Black Flash', 'Blood', 'Shrine'];
    this.bfMul = 1; this.bloodCe = 1;
    this.library = {
      // ---- Fists
      rubble: ability({ name: 'Rubble Throw', icon: '🪨', kind: 'basic', desc: 'Rip up a chunk of the floor and hurl it.', cd: 2.2, ce: 0, branch: 'Fists', tier: 0, start: true, legacy: 'ranged', use: () => this.rubble() }),
      ce_wave: ability({ name: 'Cursed Energy Wave', icon: '🌊', kind: 'basic', desc: 'Punch the air so hard a wave of cursed energy flies out and cuts through curses.', cd: 0.9, ce: 0, branch: 'Fists', tier: 1, req: 'rubble', use: () => this.ceWave() }),
      divergent: ability({ name: 'Divergent Fist', icon: '👊', kind: 'technique', desc: 'A dash punch whose cursed energy lands a second time a beat later.', cd: 5, ce: 10, branch: 'Fists', tier: 1, legacy: 't1', use: () => this.divergent() }),
      grapple: ability({ name: 'Suplex', icon: '🤼', kind: 'technique', desc: 'Grab the nearest curse, flip it over your head and drive it into the ground.', cd: 7, ce: 10, branch: 'Fists', tier: 2, req: 'divergent', use: () => this.suplex() }),
      barrage: ability({ name: 'Divergent Barrage', icon: '🥊', kind: 'technique', desc: 'Six fast punches; every one of them lands again a beat later.', cd: 9, ce: 16, branch: 'Fists', tier: 3, req: 'divergent', use: () => this.dBarrage() }),
      soul_strike: ability({ name: 'Soul Strike', icon: '👻', kind: 'technique', desc: 'You can feel the boundary of the soul: a blow that strikes it directly, ignoring guards and scaling with the curse\'s size.', cd: 14, ce: 22, branch: 'Fists', tier: 4, req: 'barrage', use: () => this.soulStrike() }),
      // ---- Kicks / body
      dropkick: ability({ name: 'Dropkick', icon: '🦶', kind: 'movement', desc: 'A flying kick that carries you across the floor and bowls curses over.', cd: 5, ce: 6, branch: 'Kicks', tier: 1, use: () => this.dropkick() }),
      manji: ability({ name: 'Manji Kick', icon: '🦵', kind: 'technique', desc: 'A spinning kick that launches everything around you.', cd: 8, ce: 14, branch: 'Kicks', tier: 2, legacy: 't2', req: 'dropkick', use: () => this.manji() }),
      slam: ability({ name: 'Ground Slam', icon: '💥', kind: 'technique', desc: 'Leap and smash both fists into the ground, cratering it.', cd: 7, ce: 10, branch: 'Kicks', tier: 2, req: 'dropkick', use: () => this.groundSlam() }),
      endurance: ability({ name: 'Vessel Endurance', icon: '🛡️', kind: 'defence', desc: 'Brace for 3s: take 60% less damage and punch back at anything that hits you.', cd: 14, ce: 12, branch: 'Kicks', tier: 3, req: 'slam', use: () => this.endure() }),
      sprint: ability({ name: 'Superhuman Sprint', icon: '🏃', kind: 'buff', desc: 'For 5s you move 50% faster and your dodge recharges instantly.', cd: 16, ce: 10, branch: 'Kicks', tier: 3, req: 'manji', use: () => this.sprint() }),
      // ---- Black Flash
      uppercut: ability({ name: 'Rising Uppercut', icon: '⤴️', kind: 'technique', desc: 'Launch a curse into the air — and arm a Black Flash for your next blow.', cd: 6, ce: 8, branch: 'Black Flash', tier: 1, use: () => this.risingUppercut() }),
      black_flash: ability({ name: 'Black Flash', icon: '⚡', kind: 'technique', desc: 'Close in and land a guaranteed Black Flash; you enter the Zone afterwards.', cd: 14, ce: 18, branch: 'Black Flash', tier: 2, req: 'uppercut', use: () => this.blackFlashStrike(48) }),
      zone: ability({ name: 'The Zone', icon: '🔥', kind: 'buff', desc: 'The flow state after a Black Flash: the timing window widens and your first hit is a guaranteed Black Flash.', cd: 18, ce: 25, branch: 'Black Flash', tier: 3, legacy: 't3', req: 'uppercut', use: () => this.focus() }),
      rct: ability({ name: 'Reverse Cursed Technique', icon: '💚', kind: 'heal', desc: 'Yuji\'s late-awakened RCT: heal 30% health over 2s.', cd: 32, ce: 28, branch: 'Black Flash', tier: 4, req: 'black_flash', use: () => this.rctHeal(0.3, 2) }),
      // ---- Blood Manipulation (Choso's, inherited)
      blood_edge: ability({ name: 'Blood Edge', icon: '🩸', kind: 'basic', desc: 'Two crescent slashes of hardened blood fly out and cut through curses.', cd: 1.2, ce: 3, branch: 'Blood', tier: 2, req: 'ce_wave', use: () => this.bloodEdge() }),
      piercing_blood: ability({ name: 'Piercing Blood', icon: '🎯', kind: 'technique', desc: 'Compress your blood and fire it at hypersonic speed in a piercing beam.', cd: 9, ce: 18, branch: 'Blood', tier: 3, req: 'blood_edge', use: () => this.piercingBlood() }),
      red_scale: ability({ name: 'Flowing Red Scale', icon: '❤️‍🔥', kind: 'buff', desc: 'Speed your blood up: for 8s you move faster and hit harder and quicker.', cd: 22, ce: 16, branch: 'Blood', tier: 3, req: 'blood_edge', use: () => this.redScale() }),
      supernova: ability({ name: 'Supernova', icon: '💫', kind: 'technique', desc: 'Orbs of compressed blood gather around you, then burst outward all at once.', cd: 16, ce: 30, branch: 'Blood', tier: 4, req: 'piercing_blood', use: () => this.supernova() }),
      // ---- Shrine (late manga)
      dismantle: ability({ name: 'Dismantle', icon: '〰️', kind: 'basic', desc: 'Sukuna\'s technique, carved into your body: a cutting wave along a line.', cd: 1, ce: 4, branch: 'Shrine', tier: 4, req: 'black_flash', use: () => this.yujiDismantle() }),
      cleave: ability({ name: 'Cleave', icon: '✖️', kind: 'technique', desc: 'An adaptive cut tuned to the curse\'s toughness and cursed energy.', cd: 10, ce: 22, branch: 'Shrine', tier: 5, req: 'dismantle', use: () => this.yujiCleave() }),
    };
    this.passives = {
      black_spark: passive({ name: 'Black Spark Instinct', icon: '⚫', desc: 'The Black Flash timing window is 50% wider.', branch: 'Black Flash', tier: 2, req: 'uppercut', apply: (pl, k) => { k.window *= 1.5; } }),
      vessel: passive({ name: 'Vessel\'s Constitution', icon: '🫀', desc: '+30 max health.', branch: 'Fists', tier: 2, req: 'divergent', apply: (pl) => { pl.maxHp += 30; pl.hp += 30; } }),
      blood_ties: passive({ name: 'Blood Ties', icon: '🩸', desc: 'Blood abilities cost 30% less and you heal for 4% of the damage you deal.', branch: 'Blood', tier: 3, req: 'blood_edge', apply: (pl, k) => { pl.stats.lifesteal += 0.04; for (const id of ['blood_edge', 'piercing_blood', 'red_scale', 'supernova']) k.library[id].ce *= 0.7; } }),
      unbreakable: passive({ name: 'Unbreakable Will', icon: '🔥', desc: 'Below 25% health you deal 25% more damage.', branch: 'Kicks', tier: 4, req: 'endurance', apply: (pl, k) => { k.willBonus = 0; } }),
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
    if (this.willBonus != null) {
      const want = this.p.hp < this.p.maxHp * 0.25 ? 0.25 : 0;
      if (want !== this.willBonus) { const d = want - this.willBonus; this.p.stats.techMult += d; this.p.stats.meleeMult += d; this.willBonus = want; }
    }
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
    this.after(0.38, () => {
      for (const e of hits) {
        if (e.dead) continue;
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
        g.combat.damageEnemy(e, dmg, p, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), stagger: 0.7, color: '#6ad8ff' });
        g.fx.hitSpark(at, null, { color: 0x6ad8ff, big: true });
        g.fx.screenWave(at, 0.5, 0.3);
      }
      if (hits.length) { g.hitStop(0.08); g.shake(0.3); g.audio?.impact(1.6); }
    });
  }
  manji() {
    const g = this.game, p = this.p, rk = this.rank('manji');
    const R = 3.4 + rk * 0.6;
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.45, windup: 0.2 }, style: 'spin', dur: 0.5, elapsed: 0, t: 0, windup: 0.2, strike: 0.45, struck: true, moveScale: 0.2 };
    this.after(0.2, () => {
      const n = g.combat.aoe(p.pos, R, 26 + rk * 12, p, { melee: true, knock: 7, stagger: 0.8 });
      for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(p.pos) < R) e.vel.y = Math.max(e.vel.y, 11);
      g.fx.slashArc(p.pos, p.facing, RED, R, 1, 0.3);
      g.fx.shockwave(p.pos, RED, R + 1);
      if (n) { g.hitStop(0.08); g.shake(0.35); g.audio?.impact(1.5); }
    });
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
  // ============================================================== new abilities
  ceWave() {
    const g = this.game, p = this.p;
    this.pose('punch', 0.28); p.facing = this.aimAngle();
    const f = this.fwd();
    const pr = this.shoot({ pos: p.pos.clone().addScaledVector(f, 0.8).setY(p.pos.y + 1.1), speed: 22, shape: 'slash', color: 0x6ad8ff, emissive: 3, scale: 1.1, life: 0.5, radius: 0.9, pierce: true, light: 3,
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: 0x9ad8ff, speed: 1, life: 0.25, size: 0.3, sizeEnd: 0.05 }),
      onHit: (e, q) => { this.hit(e, 14 + this.rank('combo') * 2, { stagger: 0.35, knock: q.vel.clone().setLength(3) }); g.fx.hitSpark(q.pos, null, { color: 0x9ad8ff }); } });
    if (!pr) return false;
    g.particles.burst(this.handPos(), { count: 8, color: 0x9ad8ff, speed: 4, life: 0.2, size: 0.1, shape: 1, dir: f, spread: 0.6 });
    g.audio?.whoosh(1);
  }
  suplex() {
    const g = this.game, p = this.p;
    const t = this.target(4, 0);
    if (!t) { g.toast?.('Nothing close enough to grab'); g.audio?.ui('back'); return false; }
    this.closeIn(t, RED);
    p.invulnerable = true;
    this.pose('uppercut', 0.6);
    const from = t.pos.clone(), behind = p.pos.clone().addScaledVector(tmp.subVectors(p.pos, t.pos).setY(0).normalize(), 1.4);
    const big = t.isBoss;
    this.during(0.45, (tt, dt, k) => {
      if (big || t.dead) return;
      t.pos.set(from.x + (behind.x - from.x) * k, from.y + Math.sin(k * Math.PI) * 3, from.z + (behind.z - from.z) * k);
      t.vel?.set(0, 0, 0);
    }, () => {
      p.invulnerable = false;
      const at = big ? t.pos.clone() : behind;
      if (!big && !t.dead) { t.pos.y = this.groundAt(at.x, at.z, p.pos.y); this.stun(t, 1.2); }
      if (!t.dead) this.hit(t, 44 + this.rank('combo') * 4, { melee: true, stagger: 1, unblockable: true, knock: new THREE.Vector3() });
      g.combat.aoe(at, 2.5, 16, p, { melee: true, knock: 6, stagger: 0.4, blocks: false });
      g.fx.shockwave(at, RED, 3.5); g.fx.landDust(at, 26); g.debris.burst(at.clone().setY(at.y + 0.3), 7, 5, 0.7);
      g.shake(0.55); g.hitStop(0.08); g.audio?.impact(1.8);
    });
  }
  dBarrage() {
    const g = this.game, p = this.p;
    const styles = ['punch', 'swingL', 'swingR'];
    const marks = new Map();
    let i = 0, next = 0;
    this.during(0.75, (t) => {
      p.facing = this.aimAngle();
      if (t < next) return true;
      next += 0.12;
      this.pose(styles[i % 3], 0.13);
      const f = this.fwd();
      const bf = i === 5 && this.blackFlashReady();
      for (const e of this.foes(p.pos, 3, f, 0.8)) {
        this.hit(e, 10, { melee: true, stagger: 0.3, knock: f.clone().multiplyScalar(0.8), blackFlash: bf });
        marks.set(e, (marks.get(e) ?? 0) + 1);
        if (bf) g.combat.blackFlashFx(p, e);
      }
      g.fx.hitSpark(p.pos.clone().addScaledVector(f, 1.6).setY(p.pos.y + 1.1), f, { color: 0xffc0a0 });
      this.windowAt = g.time;
      g.audio?.impact(0.8);
      if (++i >= 6) return false;
    }, () => {
      this.after(0.38, () => {
        for (const [e, n] of marks) {
          if (e.dead) continue;
          const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
          this.hit(e, n * (9 + this.rank('divergent') * 3), { stagger: 0.8, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(8), color: '#6ad8ff' });
          g.fx.hitSpark(at, null, { color: 0x6ad8ff, big: true }); g.fx.screenWave(at, 0.5, 0.3);
        }
        if (marks.size) { g.hitStop(0.07); g.shake(0.35); g.audio?.impact(1.6); }
      });
    });
  }
  soulStrike() {
    const g = this.game, p = this.p, t = this.target(6);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, 0xbfe8ff);
    this.pose('punch', 0.4);
    this.after(0.1, () => {
      if (t.dead) return;
      const at = t.pos.clone().setY(t.pos.y + t.height * 0.6);
      const dmg = 30 + Math.min(t.maxHp * 0.09, 160);
      this.hit(t, dmg, { melee: true, unblockable: true, stagger: 1.1, knock: tmp.subVectors(t.pos, p.pos).setY(0).normalize().multiplyScalar(6), color: '#bfe8ff' });
      if (!t.isBoss) this.stun(t, 1);
      // the soul is knocked half out of the body
      for (let i = 0; i < 24; i++) g.particles.glow.spawn({ pos: at, vx: (Math.random() - 0.5) * 3 + Math.sin(p.facing) * 4, vy: (Math.random() - 0.2) * 3, vz: (Math.random() - 0.5) * 3 + Math.cos(p.facing) * 4, life: 0.7, r: 1.6, g: 2, b: 2.4, size: 0.18, drag: 2, sizeEnd: 0.4 });
      g.fx.flash(0xbfe8ff, 0.3, 0.15); g.fx.screenWave(at, 1, 0.45); g.fx.chroma(0.8);
      g.fx.hitSpark(at, null, { color: 0xffffff, big: true });
      g.hitStop(0.1); g.shake(0.55); g.audio?.impact(1.9, 'crit');
    });
  }
  dropkick() {
    const g = this.game, p = this.p;
    this.pose('uppercut', 0.3);
    g.audio?.whoosh(1.3);
    this.dash(this.fwd(), 9, 0.28, { hitR: 1.6, dmg: 22 + this.rank('combo') * 3, color: RED, hitOpts: { melee: true, stagger: 0.8 }, onHit: (e) => { if (!e.isBoss) e.knock.add(this.fwd().multiplyScalar(14)); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: 0xffc0a0, big: true }); g.audio?.impact(1.3); } });
  }
  groundSlam() {
    const g = this.game, p = this.p;
    p.vel.y = 11; p.grounded = false; p.iframes = Math.max(p.iframes, 0.5);
    this.pose('slam', 0.8);
    let up = true;
    this.during(1.6, (t) => {
      if (up && t > 0.25) { up = false; p.vel.y = -26; }
      if (!up && (p.grounded || p.inLiquid)) {
        const c = p.pos.clone().setY(p.pos.y + 0.3), R = 4.2;
        g.combat.aoe(c, R, 34 + this.rank('combo') * 4, p, { melee: true, knock: 11, stagger: 0.9, falloff: true });
        for (const e of this.foes(c, R)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
        g.fx.shockwave(p.pos, RED, R + 1); g.fx.landDust(p.pos, 40); g.debris.burst(c, 7, 10, 1.1);
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0xffffff, r0: 0.4, r1: R, dur: 0.3, thick: 0.3 });
        g.shake(0.7); g.hitStop(0.07); g.audio?.impact(1.9);
        if (p.action?.type === 'attack') p.action = null;
        return false;
      }
    });
  }
  endure() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.toast?.('Brace!'); g.audio?.charge?.(0.3, 0.4);
    let counterT = 0;
    this.buff('endure', 3, {
      incoming: (a, src) => {
        if (src && src.pos && !src.dead && g.time - counterT > 0.3 && src.pos.distanceTo(p.pos) < 4) {
          counterT = g.time;
          p.facing = Math.atan2(src.pos.x - p.pos.x, src.pos.z - p.pos.z);
          this.pose('punch', 0.25);
          if (src.takeDamage && !src.isPlayer) this.hit(src, 22, { melee: true, stagger: 0.8, knock: tmp.subVectors(src.pos, p.pos).setY(0).normalize().multiplyScalar(8) });
          g.fx.hitSpark(src.pos.clone().setY(src.pos.y + 1), null, { color: 0xffc0a0, big: true });
        }
        return a * 0.4;
      },
      onTick: () => { if (Math.random() < 0.5) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5), y: p.pos.y + Math.random() * 1.8, z: p.pos.z + (Math.random() - 0.5), vy: 0.8, life: 0.4, r: 2, g: 0.6, b: 0.4, size: 0.12, drag: 1, sizeEnd: 0.05, shape: 'square' }); },
    });
  }
  sprint() {
    const g = this.game, p = this.p;
    g.audio?.whoosh(1);
    this.statBuff('sprint', 5, { speed: 0.5 }, { onTick: () => {
      p.dodgeCd = 0;
      if (Math.hypot(p.vel.x, p.vel.z) > 3 && Math.random() < 0.6) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.2, p.pos.z), { count: 1, color: 0xd8c8a8, additive: false, speed: 1, up: 0.5, life: 0.4, size: 0.3, sizeEnd: 0.8 });
    } });
  }
  risingUppercut() {
    const g = this.game, p = this.p;
    const t = this.target(4, 0);
    if (t) this.closeIn(t, RED);
    this.pose('uppercut', 0.4);
    this.after(0.1, () => {
      const f = this.fwd();
      let n = 0;
      for (const e of this.foes(p.pos, 3, f, 0.9)) { this.hit(e, 30 + this.rank('combo') * 3, { melee: true, stagger: 0.9, knock: f.clone().multiplyScalar(2) }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 14); n++; }
      this.armed = true;
      g.fx.slashArc(p.pos, p.facing, RED, 2.6, 0.5, 0.2);
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0xff1a1a, r0: 1.4, r1: 0.4, dur: 0.18, thick: 0.25 });
      if (n) { g.hitStop(0.06); g.shake(0.35); g.audio?.impact(1.4); }
    });
  }
  onBlackFlash() { this.focusT = Math.max(this.focusT, 4); this.focusFirst = true; if (this.rank('bf_ce')) this.p.gainCE(6 * this.rank('bf_ce')); }
  bloodEdge() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const base = this.aimAngle();
    for (let i = 0; i < 2; i++) this.after(i * 0.1, () => {
      const a = base + (i ? 0.08 : -0.08), dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      g.projectiles.fire({ pos: this.handPos(), vel: dir.multiplyScalar(26), team: 'player', shape: 'slash', color: 0xc0101a, emissive: 2.5, scale: 0.9, life: 0.6, radius: 0.8, pierce: true,
        trail: (q) => g.particles.burst(q.pos, { count: 1, color: 0x8a0010, speed: 0.5, life: 0.3, size: 0.12, gravity: 8, shape: 1 }),
        onHit: (e, q) => { this.hit(e, 14, { stagger: 0.3, knock: q.vel.clone().setLength(2), color: '#ff4a4a' }); g.fx.splat(q.pos.clone(), 0xa00010); } });
    });
    g.audio?.energy('slash');
  }
  piercingBlood() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 0.75, elapsed: 0, t: 0, moveScale: 0.1, lock: true, hold: true, cancelable: false, faceAim: true };
    g.audio?.charge?.(0.4, 0.4);
    // Convergence: the blood compresses between the palms
    this.during(0.4, () => { const h = this.handPos(); for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; g.particles.glow.spawn({ x: h.x + Math.cos(a) * 0.8, y: h.y + (Math.random() - 0.5) * 0.6, z: h.z + Math.sin(a) * 0.8, vx: -Math.cos(a) * 3, vz: -Math.sin(a) * 3, life: 0.25, r: 1.6, g: 0.05, b: 0.08, size: 0.1, sizeEnd: 0.03, shape: 'square' }); } }, () => {
      const f = this.fwd(), from = this.handPos(), L = 26;
      this.line(p.pos, f, L, 0.55, (e) => { this.hit(e, 72, { stagger: 0.9, unblockable: true, knock: f.clone().multiplyScalar(5), color: '#ff4a4a' }); g.fx.splat(e.pos.clone().setY(e.pos.y + 1), 0xa00010); });
      g.fx.slashLine(from, f, L, 0xd0101a, 0.45, 0.35); g.fx.slashLine(from, f, L, 0xffb0b0, 0.12, 0.25);
      for (let s = 1; s < L; s += 1) g.combat.hitBlocks(from.clone().addScaledVector(f, s).setY(p.pos.y), f, 0.5, Math.PI, 40, p);
      g.lights.flash(from.clone().addScaledVector(f, 6), 0xff2030, 14, 14, 0.3);
      g.fx.screenWave(from, 0.7, 0.35); g.shake(0.4); g.hitStop(0.05);
      g.audio?.tone?.({ freq: 1500, to: 300, dur: 0.25, gain: 0.12, type: 'sawtooth', filter: 3500 });
      this.after(0.2, () => { if (p.action?.lock) p.action = null; });
    });
  }
  redScale() {
    const g = this.game, p = this.p;
    g.fx.flash(0x400008, 0.25, 0.2); g.audio?.charge?.(0.4, 0.5);
    g.toast?.('Flowing Red Scale');
    this.statBuff('red_scale', 8, { speed: 0.25, meleeMult: 0.2, attackSpeed: 0.15 }, { onTick: () => {
      if (Math.random() < 0.5) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.5, y: p.pos.y + 1 + Math.random() * 0.8, z: p.pos.z + (Math.random() - 0.5) * 0.5, vy: 0.4, life: 0.5, r: 1.4, g: 0.04, b: 0.06, size: 0.1, drag: 1, sizeEnd: 0.05, shape: 'square' });
    } });
  }
  supernova() {
    const g = this.game, p = this.p;
    this.cast(0.6, true);
    const N = 8, orbs = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardNodeMaterial({ color: 0x8a0010, emissive: 0xd0101a, emissiveIntensity: 2, roughness: 0.3 }));
      g.scene.add(m); orbs.push(m);
    }
    g.audio?.charge?.(0.6, 0.5);
    this.during(0.7, (t, dt, k) => {
      orbs.forEach((m, i) => { const a = i / N * Math.PI * 2 + t * 3, rr = 1.2 + k * 2.6; m.position.set(p.pos.x + Math.cos(a) * rr, p.pos.y + 1.2 + Math.sin(t * 6 + i) * 0.3, p.pos.z + Math.sin(a) * rr); m.scale.setScalar(1 + k); });
    }, () => {
      for (const m of orbs) {
        const c = m.position.clone(); g.scene.remove(m); m.geometry.dispose();
        g.combat.aoe(c, 2.4, 32, p, { knock: 9, stagger: 0.7, falloff: true, color: '#ff4a4a' });
        g.fx.explosion(c, 0xd0101a, 1.8);
        g.particles.burst(c, { count: 10, color: 0x8a0010, speed: 7, life: 0.5, size: 0.12, gravity: 14, shape: 1 });
      }
      g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1, 0.45); g.fx.chroma(0.8);
      g.shake(0.7); g.hitStop(0.06); g.audio?.energy('explode');
    });
  }
  yujiDismantle() {
    const g = this.game, p = this.p;
    this.cast(0.25);
    const f = this.fwd(), from = p.pos.clone().setY(p.pos.y + 1.1).addScaledVector(f, 0.6), L = 10;
    g.fx.slashLine(from, f, L, 0xffffff, 0.45, 0.16, Math.random() * 0.4 - 0.2);
    g.fx.slashLine(from.clone().setY(from.y - 0.05), f, L * 0.9, RED, 0.22, 0.3);
    this.line(p.pos, f, L, 0.9, (e) => { this.hit(e, 18, { stagger: 0.3, knock: f.clone().multiplyScalar(2) }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), f, { color: RED }); });
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(from.clone().addScaledVector(f, s).setY(p.pos.y), f, 0.8, Math.PI, 18, p);
    g.audio?.energy('slash');
  }
  yujiCleave() {
    const g = this.game, p = this.p, t = this.target(7);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.4);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    const at = t.pos.clone().setY(t.pos.y + t.height * 0.55);
    g.fx.slashX(at, 2.6 + t.height * 0.4, 0xffffff);
    this.after(0.12, () => {
      if (t.dead) return;
      this.hit(t, 30 + Math.min(t.maxHp * 0.14, 190), { stagger: 1, unblockable: true, knock: new THREE.Vector3() });
      g.fx.slashX(at, 3 + t.height * 0.5, RED); g.fx.hitSpark(at, null, { color: RED, big: true });
      g.hitStop(0.08); g.shake(0.4); g.fx.chroma(0.6); g.audio?.energy('slash'); g.audio?.impact(1.6);
    });
  }
  dispose() { super.dispose(); this.endChain(); }
}
registerKit('yuji', YujiKit, YUJI_SKILLS);
