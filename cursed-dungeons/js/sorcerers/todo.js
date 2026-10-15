// Todo-style kit — Boogie Woogie.
// A clap swaps the positions of anything with cursed energy. Swapped curses
// are left confused and wide open; Todo is a brawler with a knack for Black Flash.
//   LMB  brawler combo; every blow has a chance to be a Black Flash (much
//        higher right after a swap).
//   RMB  Boogie Woogie: clap and swap places with the aimed curse. With no
//        target, the two nearest curses swap with each other instead.
//   1    Clap Barrage: six claps shuffle you and every curse nearby, leaving
//        them dizzy and battered.
//   2    Stone Swap: hurl a rock, then clap — you swap to it mid-battle and
//        crash down on the curses around it.
//   3    Feint Clap: a clap that swaps nothing. Every curse nearby flinches,
//        braced for a swap that never comes — their attacks fall apart and
//        Todo's next blow is a sure Black Flash.
//   F    Boogie Woogie × Black Flash (ultimate — Todo has no canon domain): the
//        Shibuya combo. Slow motion, clap after clap — Todo swaps himself and
//        the curses around his target, every landing is a Black Flash, and the
//        last one is a ground-breaking finisher.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { B } from '../world/blocks.js';

const VIOLET = 0xc070ff, PINK = 0xff5ac8, SWAP = 0x9ad8ff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('todo', {
  name: 'Todo', technique: 'Boogie Woogie', rarity: 'rare', title: 'Best Friend',
  desc: 'Clap to swap places with curses (or swap them with each other), leaving them confused, then brawl with a high Black Flash chance.',
  ultimate: 'Boogie Woogie × Black Flash', color: '#c070ff',
});

registerLook('todo', {
  paint: { skinTone: 0xd8a888, hair: 0x18120e, hairVolume: true, undercut: 0x3a2a20, top: 0xece8de, collar: 0xd8a888, topTrim: 0xd0ccc0, buttons: 0x8a8a8a, sleeve: 0xd8a888, pants: 0x1e1e26, shoes: 0x2a1a10, eye: 0x2a1a10, fringe: 1, hairSide: 2, hairBack: 3, brow: 0x0e0a08 },
  paintExtra(S) {
    // the scar running down over his left eye
    S.px(13, 10, 0xa86a5a); S.px(13, 11, 0xa86a5a); S.px(14, 13, 0xa86a5a); S.px(14, 14, 0xa86a5a);
    // stern mouth and stubble
    S.rect(10, 14, 4, 1, 0x7a4a3a, 0); S.rect(10, 15, 4, 1, 0xb88a70, 0.1);
  },
  hair: (m) => [
    // the tall top-knot
    { x: 0, y: 8.5, z: -0.5, w: 4, h: 3, d: 4, material: m },
    { x: 0, y: 11, z: -1, w: 3, h: 3.5, d: 3, rx: -0.3, material: m },
    { x: 0, y: 13.5, z: -2, w: 2.5, h: 3, d: 2.5, rx: -0.7, material: m },
  ],
  hairColor: 0x18120e, accent: VIOLET, emit: 0, scale: 1.32, cape: null,
  props(rig, K) {
    // Takada-chan fan wristbands
    K.box(rig.handL, 4.6, 1.6, 4.6, K.mat(0xffd040, { emissive: 0.4 }), 0, 1, 0);
    K.box(rig.handR, 4.6, 1.6, 4.6, K.mat(PINK, { emissive: 0.4 }), 0, 1, 0);
  },
});

export const TODO_SKILLS = [
  { id: 'clap', name: 'Boogie Woogie', desc: 'Longer swap range; swapped curses stay confused longer.', max: 3 },
  { id: 'spark', name: 'Black Spark', desc: 'Higher Black Flash chance.', max: 3 },
  { id: 'barrage', name: 'Clap Barrage', desc: 'More claps and harder shuffles.', max: 2, req: 'clap' },
  { id: 'stone', name: 'Stone Swap', desc: 'Bigger crash when you swap to the rock.', max: 2 },
  { id: 'brother', name: 'My Brother', desc: 'Boogie Woogie × Black Flash (ultimate) claps more often and hits harder.', max: 3, req: 'spark' },
  { id: 'body', name: 'Brawler\'s Body', desc: '+8% melee damage and +12 max HP per rank.', max: 3 },
];

class TodoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    p.stats.meleeMult += 0.1 + r('body') * 0.08;
    p.maxHp += 20 + r('body') * 12; p.hp = Math.min(p.hp + 20 + r('body') * 12, p.maxHp);
    this.combo = [
      { style: 'punch', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 14, range: 2.6, arc: 1.1, lunge: 7, knock: 3.5, stop: 0.05, shake: 0.16, trail: VIOLET, sparkColor: 0xe0c0ff, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 15, range: 2.7, arc: 1.2, lunge: 6, knock: 4, stop: 0.05, shake: 0.18, trail: VIOLET, chainAt: 0.55 },
      { style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 16, range: 2.7, arc: 1.2, lunge: 6, knock: 4, stop: 0.05, shake: 0.18, trail: VIOLET, chainAt: 0.55 },
      { style: 'uppercut', dur: 0.4, windup: 0.32, strike: 0.52, dmg: 20, range: 2.7, arc: 1.0, lunge: 5, knock: 5, stop: 0.07, shake: 0.26, trail: PINK, launch: true, chainAt: 0.6 },
      { style: 'slam', dur: 0.6, windup: 0.44, strike: 0.62, dmg: 34, range: 3.6, arc: Math.PI, lunge: 4, knock: 13, stop: 0.11, shake: 0.55, ring: true, ringColor: VIOLET, stagger: 0.7, trail: PINK },
    ];
    this.slots = {
      ranged: this.ability({ name: 'Boogie Woogie', icon: '👏', cd: 1.1, ce: 0, use: () => this.clapSwap() }),
      t1: this.ability({ name: 'Clap Barrage', icon: '🎶', cd: 8, ce: 14, use: () => this.barrage() }),
      t2: this.ability({ name: 'Stone Swap', icon: '🪨', cd: 7, ce: 12, use: () => this.stoneSwap() }),
      t3: this.ability({ name: 'Feint Clap', icon: '🙌', cd: 12, ce: 18, use: () => this.feintClap() }),
    };
    this.ultimate = { name: 'Boogie Woogie × Black Flash', icon: '⚡', use: () => this.brotherFlash() };
    this.openT = 0; this.bfChain = 0;
  }
  dispose() { super.dispose(); this.disposed = true; for (const id of this.timers ?? []) clearTimeout(id); this.timers = []; this.game.fx.dimTarget = 0; }
  later(ms, fn) { if ((this.timers ??= []).length > 200) this.timers = this.timers.slice(-100); this.timers.push(setTimeout(() => { if (!this.disposed && !this.p.dead) fn(); }, ms)); }
  // ------------------------------------------------------------ helpers
  clapFx(at, s = 1) {
    const g = this.game;
    const c = tmp.set(at.x, at.y + 1.4, at.z);
    g.particles.burst(c, { count: Math.round(14 * s), color: 0xffffff, speed: 6 * s, life: 0.25, size: 0.1, shape: 1, drag: 5 });
    g.fx.rings.spawn(tmp2.set(at.x, at.y + 1.2, at.z), { color: SWAP, r0: 0.2, r1: 1.6 * s, dur: 0.2, thick: 0.2 });
    g.audio?.noise({ dur: 0.07, gain: 0.55 * s, type: 'highpass', freq: 1600, q: 0.8 });
    g.audio?.tone({ freq: 900, to: 300, dur: 0.06, gain: 0.08, type: 'triangle' });
  }
  confuse(e, dur) {
    if (!e || e.dead) return;
    const d = dur * (1 + this.rank('clap') * 0.2);
    e.confusedT = Math.max(e.confusedT ?? 0, d);
    e.slowT = Math.max(e.slowT ?? 0, d);
    if (e.isBoss) return;
    if (e.state === 'windup') e.cancelAttack?.();
    e.state = 'stagger'; e.stateT = 0; e.stagger = Math.min(1.4, d);
    e.facing += Math.PI * (0.5 + Math.random());
    e.target = null;
  }
  // swap the positions of any two entities (player, curses, projectiles…)
  swapEntities(a, b) {
    const pa = a.pos.clone(), pb = b.pos.clone();
    const g = this.game;
    g.fx.blinkPuff(pa, SWAP); g.fx.blinkPuff(pb, SWAP);
    a.pos.copy(pb); b.pos.copy(pa);
    for (const x of [a, b]) { if ('visY' in x) x.visY = x.pos.y; x.vel?.set(0, 0, 0); x.knock?.set(0, 0, 0); }
    g.fx.rings.spawn(tmp.set(pa.x, pa.y + 0.06, pa.z), { color: SWAP, r0: 1.4, r1: 0.2, dur: 0.25, thick: 0.25 });
    g.fx.rings.spawn(tmp.set(pb.x, pb.y + 0.06, pb.z), { color: SWAP, r0: 1.4, r1: 0.2, dur: 0.25, thick: 0.25 });
  }
  swapPair(a, b, dmg) {
    const g = this.game, p = this.p;
    if (!a || !b || a.dead || b.dead) return;
    this.swapEntities(a, b);
    for (const e of [a, b]) {
      if (e === p) continue;
      g.combat.damageEnemy(e, dmg, p, { stagger: 0.5, color: '#9ad8ff' });
      this.confuse(e, 1.1);
    }
  }
  aimed(range) {
    const g = this.game, p = this.p;
    if (g.domainSys?.sureHit(p)) return g.nearestEnemy(p.aimPoint, 30);
    let best = null, bs = -1;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length();
      if (d > range || d < 0.8) continue;
      const s = tmp.normalize().dot(p.aimDir) - d * 0.02;
      if (s > 0.7 && s > bs) { bs = s; best = e; }
    }
    return best ?? (p.autoTarget && !p.autoTarget.dead && p.autoTarget.pos.distanceTo(p.pos) < range ? p.autoTarget : null);
  }
  blackFlashReady() {
    if (this.bfChain > 0) { this.bfChain--; return true; }
    const chance = 0.06 + this.rank('spark') * 0.03 + (this.openT > 0 ? 0.35 : 0);
    if (Math.random() < chance) { this.openT = 0; return true; }
    return false;
  }
  onMeleeHit(e, step, dealt, bf) {
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
    if (bf) { this.p.gainCE(5); this.game.toast && Math.random() < 0.25 && this.game.toast('⚡ BLACK FLASH!'); }
    if ((e.confusedT ?? 0) > 0) this.game.combat.damageEnemy(e, step.dmg * 0.3, this.p, { melee: true, stagger: 0.1, color: '#9ad8ff', ceGain: 0 });
  }
  tick(dt) {
    const g = this.game;
    this.openT = Math.max(0, this.openT - dt);
    if (this.openT > 0 && Math.random() < 0.5) g.particles.burst(this.handPos(), { count: 1, color: SWAP, speed: 1.5, life: 0.25, size: 0.1, shape: 1 });
    // dizzy stars over confused curses
    for (const e of g.enemies) {
      if (e.dead || !(e.confusedT > 0)) continue;
      e.confusedT -= dt;
      if (Math.random() < 0.35) { const a = g.time * 6 + e.pos.x; g.particles.glow.emit(e.pos.x + Math.cos(a) * 0.5, e.pos.y + e.height + 0.3, e.pos.z + Math.sin(a) * 0.5, -Math.sin(a) * 1.2, 0.1, Math.cos(a) * 1.2, 0.35, 2.6, 2.4, 0.6, 0.12, 0, 1, 0.3, 1); }
    }
  }
  // ---------------------------------------------------------- techniques
  clapSwap() {
    const g = this.game, p = this.p;
    const t = this.aimed(13 + this.rank('clap') * 2);
    this.cast(0.28, true);
    this.clapFx(p.pos);
    if (t) {
      this.swapEntities(p, t);
      this.confuse(t, 1.2);
      g.combat.damageEnemy(t, 6, p, { stagger: 0.4, color: '#9ad8ff' });
      p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
      p.iframes = Math.max(p.iframes, 0.25);
      this.openT = 1.4;
      return;
    }
    // no target: swap the two nearest curses with each other
    const near = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 12).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos));
    if (near.length >= 2) { this.swapPair(near[0], near[1], 8); this.openT = 1; return; }
    // fake-out clap: everyone close flinches
    for (const e of g.combat.query(p.pos, tmp.set(0, 0, 1), 3, Math.PI)) this.confuse(e, 0.6);
  }
  barrage() {
    const g = this.game, p = this.p, rk = this.rank('barrage');
    const claps = 6 + rk * 2;
    g.toast?.('🎶 Boogie Woogie!');
    for (let i = 0; i < claps; i++) setTimeout(() => {
      if (p.dead || this.disposed) return;
      this.cast(0.16, true);
      this.clapFx(p.pos, 0.8);
      const pool = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 14);
      if (!pool.length) return;
      // pick two random participants — sometimes Todo himself
      const parts = [...pool, ...(Math.random() < 0.35 ? [p] : [])];
      const a = parts.splice(Math.floor(Math.random() * parts.length), 1)[0];
      const b = parts.length ? parts[Math.floor(Math.random() * parts.length)] : p;
      if (a === b) return;
      this.swapPair(a, b, 10 + rk * 4);
      if (a === p || b === p) { p.iframes = Math.max(p.iframes, 0.2); this.openT = 1.2; }
    }, i * 170);
    setTimeout(() => { if (!this.disposed) this.openT = 1.5; }, claps * 170);
  }
  stoneSwap() {
    const g = this.game, p = this.p, rk = this.rank('stone');
    p.action = { type: 'attack', step: { style: 'throw', strike: 0.5, windup: 0.3 }, style: 'throw', dur: 0.4, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0.3 };
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const from = p.pos.clone().setY(p.pos.y + 2);
    const dist = Math.min(13, p.aimPoint.distanceTo(p.pos)) || 9;
    const flight = 0.6, grav = 20;
    const vel = p.aimDir.clone().setY(0).normalize().multiplyScalar(dist / flight); vel.y = 0.5 * grav * flight;
    g.audio?.whoosh(1);
    g.projectiles.fire({ pos: from, vel, team: 'player', shape: 'cube', color: 0x7a7068, emissive: 0.1, gravity: grav, life: 2, scale: 1.6, radius: 0.6,
      trail: (q) => { if (Math.random() < 0.4) g.particles.burst(q.pos, { count: 1, color: SWAP, speed: 0.3, life: 0.3, size: 0.25, sizeEnd: 0.05 }); },
      onHit: (e) => { g.combat.damageEnemy(e, 12, p, { stagger: 0.4 }); },
      onExpire: (q) => {
        if (this.disposed || p.dead) return;
        // clap! Todo appears where the rock was
        const gy = g.world.groundBelow(q.pos.x, q.pos.z, q.pos.y + 1.5);
        const to = new THREE.Vector3(q.pos.x, isFinite(gy) ? gy : q.pos.y, q.pos.z);
        if (Math.abs(to.y - p.pos.y) > 5 || g.world.solidAt(to.x, to.y + 0.5, to.z) || g.world.solidAt(to.x, to.y + 1.5, to.z)) { g.debris.burst(q.pos, B.stone, 5); return; }
        this.clapFx(p.pos);
        g.debris.burst(p.pos.clone().setY(p.pos.y + 0.5), B.stone, 6);
        g.fx.blinkPuff(p.pos, SWAP); g.fx.blinkPuff(to, SWAP);
        p.pos.copy(to); p.visY = to.y; p.vel.set(0, 0, 0);
        p.action = { type: 'attack', step: { style: 'slam', strike: 0.3, windup: 0.1 }, style: 'slam', dur: 0.4, elapsed: 0, t: 0, windup: 0.1, strike: 0.3, struck: true, moveScale: 0 };
        const R = 3.2 + rk * 0.7;
        const n = g.combat.aoe(to, R, 26 + rk * 10, p, { melee: true, knock: 9, stagger: 0.8 });
        for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(to) < R) { e.vel.y = Math.max(e.vel.y, 8); this.confuse(e, 0.8); }
        g.fx.shockwave(to, VIOLET, R + 1); g.fx.screenWave(to, 0.6, 0.35);
        g.shake(0.45); g.hitStop(n ? 0.08 : 0.03); g.audio?.impact(1.7);
        this.openT = 1.4;
      } });
  }
  // Feint Clap: the threat of Boogie Woogie is the technique. A clap that
  // swaps nothing still makes every curse brace for one.
  feintClap() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    this.clapFx(p.pos, 1.5);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1, p.pos.z), { color: SWAP, r0: 0.5, r1: 8, dur: 0.35, thick: 0.1 });
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable || e.pos.distanceTo(p.pos) > 8) continue;
      if (e.state === 'windup') e.cancelAttack?.();   // they flinch out of the attack
      this.confuse(e, 1.3);
      n++;
    }
    this.bfChain = Math.max(this.bfChain, 1);           // the opening: a sure Black Flash
    this.openT = 2;
    p.iframes = Math.max(p.iframes, 0.3);
    if (n) g.toast?.('🙌 Feint! — nothing swapped');
  }
  // Boogie Woogie × Black Flash: clap, swap, Black Flash — over and over.
  brotherFlash() {
    const g = this.game, p = this.p, rk = this.rank('brother');
    let best = null, bs = -1;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      const d = e.pos.distanceTo(p.pos); if (d > 16) continue;
      const s = (e.isBoss ? 1e6 : 0) + e.maxHp - d * 2;
      if (s > bs) { bs = s; best = e; }
    }
    if (!best) { g.toast?.('No one to clap at!'); g.audio?.ui('back'); return false; }
    let t = best;
    const beats = 7 + rk, gap = 250 - rk * 15;
    const total = beats * gap + 700;
    p.iframes = Math.max(p.iframes, total / 1000 + 0.3);
    g.slowMo(total / 1000, 0.35);
    g.fx.dimTarget = 0.4; g.fx.flash(VIOLET, 0.4, 0.2);
    g.toast?.('BOOGIE WOOGIE × BLACK FLASH', 'domain');
    g.rig.cinematic?.({ center: t.pos.clone().setY(t.pos.y + 0.5), dur: total / 1000 + 0.5, dist: 12, pitch: 0.5, orbit: 0.5 });
    const retarget = () => {
      if (t && !t.dead) return t;
      t = g.nearestEnemy(p.pos, 12);
      return t;
    };
    const punch = (e, i, last) => {
      const style = last ? 'slam' : ['punch', 'swingL', 'swingR', 'uppercut'][i % 4];
      p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      p.action = { type: 'attack', step: { style, strike: 0.45, windup: 0.2 }, style, dur: last ? 0.45 : 0.2, elapsed: 0, t: 0, windup: 0.2, strike: 0.45, struck: true, moveScale: 0 };
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
      const kd = tmp.subVectors(e.pos, p.pos).setY(0); if (kd.lengthSq() < 0.01) kd.set(Math.sin(p.facing), 0, Math.cos(p.facing)); kd.normalize();
      g.combat.damageEnemy(e, last ? 45 + rk * 15 : 16 + rk * 5, p, { melee: true, blackFlash: true, unblockable: true, stagger: 0.9, knock: kd.clone().multiplyScalar(last ? 16 : 0.6), ceGain: 0 });
      g.fx.hitSpark(at, kd, { color: 0xff2020, big: true, crit: true });
      g.fx.blackLightning(at); g.fx.blackFlash(last ? 0.3 : 0.12);
      g.lights.flash(at, 0xff1010, last ? 18 : 9, 12, 0.25);
      g.audio?.impact(last ? 2.2 : 1.7, 'crit');
      if (i % 3 === 0 || last) { g.audio?.blackFlash(); g.fx.screenWave(at, last ? 1.6 : 0.8, 0.45); }
      g.shake(last ? 0.9 : 0.3); g.hitStop(last ? 0.16 : 0.04);
      return at;
    };
    for (let i = 0; i < beats; i++) this.later(300 + i * gap, () => {
      const e = retarget(); if (!e) return;
      this.cast(0.12, true);
      this.clapFx(p.pos, 1.1);
      // shuffle: swap with the target, or swap a bystander in front of the fist
      const others = g.enemies.filter((o) => o !== e && !o.dead && !o.untargetable && o.pos.distanceTo(e.pos) < 10);
      const roll = Math.random();
      let victim = e;
      if (others.length && roll < 0.35) { const o = others[Math.floor(Math.random() * others.length)]; this.swapEntities(o, e); this.confuse(o, 1); victim = Math.random() < 0.5 ? o : e; }
      else if (roll < 0.75 || e.pos.distanceTo(p.pos) > 2.6) this.swapEntities(p, e);
      this.confuse(victim, 1.2);
      // land next to it and hit it with a Black Flash
      if (victim.pos.distanceTo(p.pos) > 2.4) {
        const dir = tmp2.subVectors(p.pos, victim.pos).setY(0).normalize();
        const to = victim.pos.clone().addScaledVector(dir, victim.radius + 1);
        const gy = g.world.groundBelow(to.x, to.z, victim.pos.y + 2);
        if (isFinite(gy) && Math.abs(gy - victim.pos.y) < 2 && !g.world.solidAt(to.x, gy + 0.5, to.z)) { g.fx.blinkPuff(p.pos, SWAP); p.pos.set(to.x, gy, to.z); p.visY = gy; p.vel.set(0, 0, 0); }
      }
      punch(victim, i, false);
      if (victim !== e && !e.dead && e.pos.distanceTo(p.pos) < 3.2) punch(e, i + 1, false);
    });
    // the finisher: a final clap pulls the target in front of Todo for one last Black Flash
    this.timers.push(setTimeout(() => { if (!this.disposed) g.fx.dimTarget = 0; }, 300 + beats * gap + 150));
    this.later(300 + beats * gap + 150, () => {
      const e = retarget(); if (!e) return;
      this.clapFx(p.pos, 1.6);
      if (e.pos.distanceTo(p.pos) > 2.4) this.swapEntities(p, e);
      const at = punch(e, beats, true);
      g.combat.aoe(e.pos, 4.5, 30 + rk * 10, p, { knock: 12, stagger: 1, melee: true, ceGain: 0 });
      if (!e.isBoss && !e.dead) e.vel.y = Math.max(e.vel.y, 12);
      g.combat.blackFlashFx(p, e);
      g.fx.shockwave(e.pos, 0xff2020, 6); g.fx.shockwave(e.pos, VIOLET, 4);
      g.debris.burst(at.clone().setY(e.pos.y + 0.3), B.stone, 12, 1.4);
      g.fx.flash(0x000000, 0.5, 0.2); g.fx.chroma(1.5);
      this.openT = 2;
    });
  }

}
registerKit('todo', TodoKit, TODO_SKILLS);
