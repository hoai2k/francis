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
import { Kit, ability, passive } from './kit.js';
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
  { id: 'clap', name: 'Boogie Woogie', icon: '👏', desc: 'Longer swap range; swapped curses stay confused longer.', max: 3, branch: 'Clap', tier: 1, req: 'ab:clap_swap' },
  { id: 'spark', name: 'Black Spark', icon: '✴️', desc: 'Higher Black Flash chance.', max: 3, branch: 'Black Flash', tier: 2, req: 'ab:black_flash' },
  { id: 'barrage', name: 'Clap Barrage', icon: '🎶', desc: 'More claps and harder shuffles.', max: 2, branch: 'Swap', tier: 2, req: 'ab:barrage' },
  { id: 'stone', name: 'Stone Swap', icon: '🥌', desc: 'Bigger crashes when you swap to a rock or drop a curse from the sky.', max: 2, branch: 'Swap', tier: 3, req: 'ab:stone_swap' },
  { id: 'brother', name: 'My Brother', icon: '⚡', desc: 'Boogie Woogie × Black Flash (ultimate) claps more often and hits harder.', max: 3, branch: 'Black Flash', tier: 4, req: 'up:spark' },
  { id: 'body', name: 'Brawler\'s Body', icon: '🏋️', desc: '+8% melee damage and +12 max HP per rank.', max: 3, branch: 'Brawl', tier: 0 },
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
    this.branches = ['Clap', 'Swap', 'Brawl', 'Black Flash'];
    this.library = {
      // ---- the clap
      clap_swap: ability({ name: 'Boogie Woogie', icon: '👏', kind: 'basic', desc: 'Clap and swap places with the aimed curse. With no target, the two nearest curses swap with each other instead.', cd: 1.1, ce: 0, branch: 'Clap', tier: 0, start: true, legacy: 'ranged', use: () => this.clapSwap() }),
      double_clap: ability({ name: 'Double Clap', icon: '🙏', kind: 'technique', desc: 'Clap — swap in and slug the curse — clap — and you\'re back where you started before it knows what hit it.', cd: 5, ce: 8, branch: 'Clap', tier: 1, req: 'clap_swap', use: () => this.doubleClap() }),
      far_clap: ability({ name: 'Long-Range Swap', icon: '📡', kind: 'movement', desc: 'Swap with the farthest curse you\'re aiming at (up to 24m) and land on its spot with a stomp.', cd: 7, ce: 8, branch: 'Clap', tier: 2, req: 'double_clap', use: () => this.farClap() }),
      swap_escape: ability({ name: 'Pebble Escape', icon: '🪨', kind: 'movement', desc: 'Flick a pebble behind you and clap: you swap out of trouble, and the curses that were on you are left swinging at nothing.', cd: 6, ce: 6, branch: 'Clap', tier: 2, req: 'clap_swap', use: () => this.swapEscape() }),
      feint_clap: ability({ name: 'Feint Clap', icon: '🙌', kind: 'technique', desc: 'A clap that swaps nothing. Every curse nearby flinches, braced for a swap that never comes — their attacks fall apart and your next blow is a sure Black Flash.', cd: 12, ce: 18, branch: 'Clap', tier: 3, legacy: 't3', req: 'double_clap', use: () => this.feintClap() }),
      vibraslap: ability({ name: 'Vibraslap', icon: '🪇', kind: 'technique', desc: 'Shinjuku: with a hand gone, the rattle of a vibraslap triggers Boogie Woogie. Every curse in a wide (marked) ring is swapped around three times, battered and left reeling.', cd: 20, ce: 34, branch: 'Clap', tier: 5, req: 'feint_clap', use: () => this.vibraslap() }),
      // ---- swaps
      barrage: ability({ name: 'Clap Barrage', icon: '🎶', kind: 'technique', desc: 'Six claps shuffle you and every curse nearby, leaving them dizzy and battered.', cd: 8, ce: 14, branch: 'Swap', tier: 1, legacy: 't1', use: () => this.barrage() }),
      stone_swap: ability({ name: 'Stone Swap', icon: '🥌', kind: 'technique', desc: 'Hurl a rock, then clap — you swap to it mid-battle and crash down on the curses around it.', cd: 7, ce: 12, branch: 'Swap', tier: 2, legacy: 't2', req: 'barrage', use: () => this.stoneSwap() }),
      into_fist: ability({ name: 'Into the Fist', icon: '🤜', kind: 'technique', desc: 'Throw a punch at thin air and clap: the aimed curse is swapped right into it. A crushing hit with a high Black Flash chance.', cd: 7, ce: 10, branch: 'Swap', tier: 2, req: 'barrage', use: () => this.intoFist() }),
      sky_swap: ability({ name: 'Sky Swap', icon: '☁️', kind: 'technique', desc: 'Toss a stone high over a curse and clap: the curse is swapped into the sky and crashes down on its friends.', cd: 10, ce: 16, branch: 'Swap', tier: 3, req: 'stone_swap', use: () => this.skySwap() }),
      swap_guard: ability({ name: 'Swap Guard', icon: '🔄', kind: 'defence', desc: 'For 4s, the first blow aimed at you triggers a reflex clap: you swap with another curse and it takes the hit instead.', cd: 12, ce: 10, branch: 'Swap', tier: 3, req: 'into_fist', use: () => this.swapGuard() }),
      // ---- the brawler
      boulder: ability({ name: 'Boulder Hurl', icon: '🪨', kind: 'basic', desc: 'Tear a slab out of the ground and hurl it.', cd: 2, ce: 0, branch: 'Brawl', tier: 1, use: () => this.boulder() }),
      haymaker: ability({ name: 'Haymaker', icon: '👊', kind: 'technique', desc: 'Wind up and throw everything into one punch: a cone of force that sends curses flying.', cd: 6, ce: 8, branch: 'Brawl', tier: 2, req: 'boulder', use: () => this.haymaker() }),
      brother_lesson: ability({ name: 'Brother\'s Lesson', icon: '🤝', kind: 'buff', desc: 'Memories of a brother you never had: for 8s +20% melee damage, +15% speed, and every punch that lands shortens Boogie Woogie\'s cooldown.', cd: 20, ce: 14, branch: 'Brawl', tier: 2, req: 'boulder', use: () => this.brotherLesson() }),
      elbow_drop: ability({ name: 'Elbow Drop', icon: '💥', kind: 'technique', desc: 'Leap onto the marked spot elbow-first, cratering the ground and launching curses.', cd: 9, ce: 12, branch: 'Brawl', tier: 3, req: 'haymaker', use: () => this.elbowDrop() }),
      iron_hide: ability({ name: 'Iron Hide', icon: '🛡️', kind: 'defence', desc: 'Flex: for 4s take 50% less damage and punch back at anything that hits you.', cd: 15, ce: 10, branch: 'Brawl', tier: 3, req: 'brother_lesson', use: () => this.ironHide() }),
      takada: ability({ name: 'Takada-chan\'s Cheer', icon: '🎤', kind: 'heal', desc: 'Your idol is watching! Recover 25% health over 2s and fight 15% harder for 6s.', cd: 30, ce: 20, branch: 'Brawl', tier: 4, req: 'iron_hide', use: () => this.takadaCheer() }),
      // ---- Black Flash
      black_flash: ability({ name: 'Black Flash', icon: '⚡', kind: 'technique', desc: 'Close in and land a guaranteed Black Flash.', cd: 12, ce: 18, branch: 'Black Flash', tier: 1, use: () => this.blackFlashStrike(46, 7) }),
      spark: ability({ name: 'Black Spark', icon: '✴️', kind: 'buff', desc: 'Feel the spark: for 6s every blow has a 40% higher Black Flash chance.', cd: 18, ce: 16, branch: 'Black Flash', tier: 2, req: 'black_flash', use: () => this.blackSpark() }),
      swap_flash: ability({ name: 'Swap Flash', icon: '🌩️', kind: 'technique', desc: 'Clap behind a curse and Black Flash it — then do it again to two more.', cd: 14, ce: 22, branch: 'Black Flash', tier: 3, req: 'spark', use: () => this.swapFlash() }),
      rhythm_black: ability({ name: 'Rhythm of Black', icon: '🥁', kind: 'technique', desc: 'Five blows on one curse, clapping to its other side between each; the fifth is always a Black Flash.', cd: 16, ce: 26, branch: 'Black Flash', tier: 4, req: 'swap_flash', use: () => this.rhythmBlack() }),
    };
    this.passives = {
      clap_rhythm: passive({ name: 'Clap Rhythm', icon: '🎵', desc: 'Boogie Woogie recharges 0.3s faster and swapped curses stay confused 30% longer.', branch: 'Clap', tier: 2, req: 'double_clap', apply: (pl, k) => { k.library.clap_swap.cd -= 0.3; k.confuseMul = 1.3; } }),
      physique: passive({ name: 'Todo\'s Physique', icon: '💪', desc: '+30 max health and +10% melee damage.', branch: 'Brawl', tier: 2, req: 'boulder', apply: (pl) => { pl.maxHp += 30; pl.hp += 30; pl.stats.meleeMult += 0.1; } }),
      idol_fan: passive({ name: 'Idol Fan', icon: '💖', desc: 'Every kill restores 4 Cursed Energy and 2% health.', branch: 'Brawl', tier: 3, req: 'brother_lesson', apply: (pl, k) => { k.idolFan = true; } }),
      best_friend: passive({ name: 'My Best Friend', icon: '🫂', desc: 'Every Black Flash heals 5% health and restores 8 Cursed Energy.', branch: 'Black Flash', tier: 3, req: 'spark', apply: (pl, k) => { k.bestFriend = true; } }),
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
    const d = dur * (1 + this.rank('clap') * 0.2) * (this.confuseMul ?? 1);
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
    const chance = 0.06 + this.rank('spark') * 0.03 + (this.openT > 0 ? 0.35 : 0) + (this.buffs.has('spark') ? 0.4 : 0);
    if (Math.random() < chance) { this.openT = 0; return true; }
    return false;
  }
  onMeleeHit(e, step, dealt, bf) {
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
    if (bf) { this.p.gainCE(5); this.game.toast && Math.random() < 0.25 && this.game.toast('⚡ BLACK FLASH!'); this.onBlackFlash(e); }
    if (this.buffs.has('brother_lesson')) { const s = this.library.clap_swap; s.cdLeft = Math.max(0, s.cdLeft - 0.3); }
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
    for (let i = 0; i < claps; i++) this.after(i * 0.17, () => {
      if (p.dead) return;
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
    });
    this.after(claps * 0.17, () => { this.openT = 1.5; });
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
  // ============================================================== tree abilities
  onBlackFlash() { if (this.bestFriend) { this.p.heal?.(this.p.maxHp * 0.05, true); this.p.gainCE(8); } }
  onKill(e) { if (this.idolFan && !e.isDummy) { this.p.gainCE(4); this.p.heal?.(this.p.maxHp * 0.02, true); } }
  // move an entity to a spot (a one-sided swap with a pebble or thin air)
  placeAt(e, to) {
    const g = this.game, w = g.world;
    if (w.solidAt(to.x, to.y + 0.5, to.z) || w.solidAt(to.x, to.y + 1.5, to.z)) return false;
    g.fx.blinkPuff(e.pos, SWAP); e.pos.copy(to); if ('visY' in e) e.visY = to.y; e.vel?.set(0, 0, 0); e.knock?.set(0, 0, 0); g.fx.blinkPuff(to, SWAP);
    return true;
  }
  ground(x, z, y) { const gy = this.game.world.groundBelow(x, z, y + 3); return isFinite(gy) && Math.abs(gy - y) < 5 ? new THREE.Vector3(x, gy, z) : null; }
  punchAt(e, dmg, o = {}) {
    const g = this.game, p = this.p;
    const bf = o.bf ?? this.blackFlashReady();
    const kd = tmp.subVectors(e.pos, p.pos).setY(0).normalize();
    g.combat.damageEnemy(e, dmg, p, { melee: true, blackFlash: bf, stagger: o.stagger ?? 0.8, knock: kd.clone().multiplyScalar((o.knock ?? 6) * (bf ? 1.8 : 1)) });
    if (bf) { g.combat.blackFlashFx(p, e); this.onBlackFlash(e); g.hitStop(0.1); g.shake(0.45); g.audio?.impact(1.8, 'crit'); }
    else { g.hitStop(0.05); g.shake(0.25); g.audio?.impact(1.3); }
    g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), kd, { color: bf ? 0xff2020 : 0xe0c0ff, big: true });
    return bf;
  }
  doubleClap() {
    const g = this.game, p = this.p;
    const t = this.aimed(13 + this.rank('clap') * 2);
    if (!t) { g.toast?.('No curse to swap with'); g.audio?.ui('back'); return false; }
    const home = p.pos.clone();
    this.cast(0.2, true); this.clapFx(p.pos);
    this.swapEntities(p, t);
    p.iframes = Math.max(p.iframes, 0.6);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    this.after(0.12, () => {
      if (t.dead) return;
      this.pose('swingR', 0.25);
      this.punchAt(t, 26, { knock: 2 });
      this.confuse(t, 1);
    });
    this.after(0.42, () => {
      this.clapFx(p.pos);
      // second clap: back home (a pebble left there), the curse stays put
      if (Math.abs(home.y - p.pos.y) < 5 && this.placeAt(p, home)) g.fx.rings.spawn(tmp.set(home.x, home.y + 0.06, home.z), { color: SWAP, r0: 1.4, r1: 0.2, dur: 0.25, thick: 0.25 });
    });
  }
  farClap() {
    const g = this.game, p = this.p;
    let best = null, bd = 0;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length();
      if (d > 24 || d < 3) continue;
      if (tmp.normalize().dot(p.aimDir) > 0.82 && d > bd) { bd = d; best = e; }
    }
    if (!best) { g.toast?.('No curse far enough in that direction'); g.audio?.ui('back'); return false; }
    this.cast(0.25, true); this.clapFx(p.pos, 1.2);
    this.swapEntities(p, best);
    this.confuse(best, 1.4);
    p.iframes = Math.max(p.iframes, 0.3);
    this.pose('slam', 0.35);
    const R = 3.2;
    g.combat.aoe(p.pos, R, 22, p, { melee: true, knock: 8, stagger: 0.6 });
    for (const e of this.foes(p.pos, R)) this.confuse(e, 0.8);
    g.fx.shockwave(p.pos, VIOLET, R + 1); g.fx.landDust(p.pos, 20);
    g.shake(0.35); g.audio?.impact(1.4);
    this.openT = 1.4;
  }
  swapEscape() {
    const g = this.game, p = this.p;
    const back = this.fwd().negate();
    let to = null;
    for (let d = 9; d >= 3 && !to; d -= 1.5) { const q = this.ground(p.pos.x + back.x * d, p.pos.z + back.z * d, p.pos.y); if (q && !g.world.solidAt(q.x, q.y + 0.5, q.z) && !g.world.solidAt(q.x, q.y + 1.5, q.z)) to = q; }
    if (!to) { g.audio?.ui('back'); return false; }
    this.cast(0.2, true);
    g.projectiles.fire({ pos: this.handPos(), vel: back.clone().multiplyScalar(14).setY(4), team: 'player', shape: 'cube', color: 0x7a7068, emissive: 0.1, gravity: 20, life: 0.25, scale: 0.6, radius: 0.2 });
    const from = p.pos.clone();
    this.after(0.12, () => {
      this.clapFx(p.pos);
      if (!this.placeAt(p, to)) return;
      p.iframes = Math.max(p.iframes, 0.4);
      for (const e of this.foes(from, 3.5)) { if (e.state === 'windup') e.cancelAttack?.(); this.confuse(e, 1); }
      this.openT = 1;
    });
  }
  vibraslap() {
    const g = this.game, p = this.p, R = 10;
    this.cast(0.6, true);
    g.toast?.('🪇 Vibraslap');
    // the rattle spreads out first (the area is marked), then the swaps begin
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1, p.pos.z), { color: SWAP, r0: R, r1: R * 0.97, dur: 1.6, thick: 0.1 });
    for (let i = 0; i < 4; i++) this.after(i * 0.1, () => g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 1.2, p.pos.z), { color: PINK, r0: 0.4, r1: R, dur: 0.4, thick: 0.08 }));
    const c = p.pos.clone();
    for (let k = 0; k < 14; k++) this.after(k * 0.03, () => g.audio?.noise?.({ dur: 0.04, gain: 0.3, type: 'bandpass', freq: 2400 + Math.random() * 1200, q: 3 }));
    for (let r = 0; r < 3; r++) this.after(0.35 + r * 0.4, () => {
      const pool = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(c) < R);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      for (let i = 0; i + 1 < pool.length; i += 2) this.swapPair(pool[i], pool[i + 1], 16);
      if (pool.length % 2 === 1) { const e = pool[pool.length - 1]; g.combat.damageEnemy(e, 16, p, { stagger: 0.5, color: '#9ad8ff' }); this.confuse(e, 1.2); }
      for (const e of pool) this.confuse(e, 2.5);
      this.clapFx(p.pos, 1.3);
      g.fx.screenWave(c.clone().setY(c.y + 1), 0.6, 0.3);
    });
    this.after(1.6, () => { this.openT = 2; this.bfChain = Math.max(this.bfChain, 1); });
  }
  intoFist() {
    const g = this.game, p = this.p;
    const t = this.aimed(16);
    if (!t) { g.toast?.('No curse to swap in'); g.audio?.ui('back'); return false; }
    p.facing = this.aimAngle();
    this.pose('punch', 0.4);
    this.clapFx(p.pos, 0.8);
    const f = this.fwd(), spot = this.ground(p.pos.x + f.x * (1.2 + t.radius), p.pos.z + f.z * (1.2 + t.radius), p.pos.y);
    if (t.isBoss || !spot || !this.placeAt(t, spot)) this.closeIn(t, SWAP);
    this.after(0.1, () => {
      if (t.dead) return;
      if (Math.random() < 0.45) this.bfChain = Math.max(this.bfChain, 1);
      this.punchAt(t, 34, { knock: 10, stagger: 1 });
      this.confuse(t, 1);
    });
  }
  skySwap() {
    const g = this.game, p = this.p, rk = this.rank('stone');
    const t = this.aimed(15) ?? this.target(15);
    if (!t) { g.toast?.('No curse to send up'); g.audio?.ui('back'); return false; }
    this.pose('throw', 0.4);
    g.projectiles.fire({ pos: this.handPos(), vel: new THREE.Vector3((t.pos.x - p.pos.x) * 1.2, 16, (t.pos.z - p.pos.z) * 1.2), team: 'player', shape: 'cube', color: 0x7a7068, emissive: 0.1, gravity: 20, life: 0.6, scale: 1, radius: 0.2 });
    g.audio?.whoosh(1);
    this.after(0.55, () => {
      if (t.dead) return;
      this.clapFx(p.pos);
      if (t.isBoss) { g.combat.damageEnemy(t, 40 + rk * 12, p, { stagger: 0.8, color: '#9ad8ff' }); this.confuse(t, 1); return; }
      g.fx.blinkPuff(t.pos, SWAP);
      t.pos.y += 9; t.vel.set(0, -4, 0);
      g.fx.blinkPuff(t.pos, SWAP);
      this.stun(t, 1.4);
      let landed = false;
      this.during(2, (tt) => {
        if (t.dead) return false;
        if (tt > 0.15 && (t.grounded || t.vel.y >= -0.1)) {
          landed = true;
          const c = t.pos.clone(), R = 3 + rk * 0.6;
          g.combat.damageEnemy(t, 40 + rk * 14, p, { stagger: 1, unblockable: true, color: '#9ad8ff' });
          g.combat.aoe(c, R, 24 + rk * 8, p, { knock: 8, stagger: 0.7 });
          for (const e of this.foes(c, R)) this.confuse(e, 1);
          g.fx.shockwave(c, VIOLET, R + 1); g.fx.landDust(c, 30); g.debris.burst(c.clone().setY(c.y + 0.3), B.stone, 7, 1);
          g.shake(0.5); g.hitStop(0.06); g.audio?.impact(1.8);
          return false;
        }
      }, () => { if (!landed && !t.dead) g.combat.damageEnemy(t, 30, p, { stagger: 0.6 }); });
    });
  }
  swapGuard() {
    const g = this.game, p = this.p;
    this.cast(0.25, true);
    g.toast?.('🔄 Swap Guard');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 1.2, p.pos.z), { color: SWAP, r0: 0.3, r1: 1.6, dur: 0.3, thick: 0.15 });
    let used = false;
    this.buff('swap_guard', 4, {
      incoming: (a, src) => {
        if (used) return a;
        const other = g.enemies.filter((e) => !e.dead && !e.untargetable && e !== src && e.pos.distanceTo(p.pos) < 14).sort((x, y) => x.pos.distanceTo(p.pos) - y.pos.distanceTo(p.pos))[0];
        if (!other) return a;
        used = true; this.buffs.get('swap_guard').left = 0;
        this.clapFx(p.pos, 1.2);
        this.swapEntities(p, other);
        // the blow meant for Todo lands on the curse now standing there
        g.combat.damageEnemy(other, a * 2 + 15, p, { stagger: 0.8, color: '#9ad8ff', ceGain: 4 });
        this.confuse(other, 1.4);
        p.iframes = Math.max(p.iframes, 0.5);
        this.openT = 1.5;
        return 0;
      },
      onTick: () => { if (Math.random() < 0.4) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1.3, p.pos.z), { count: 1, color: SWAP, speed: 1.5, life: 0.2, size: 0.1, shape: 1 }); },
    });
  }
  boulder() {
    const g = this.game, p = this.p, rk = this.rank('stone');
    this.pose('throw', 0.4);
    p.facing = this.aimAngle();
    g.fx.debris(p.pos.clone().setY(p.pos.y + 0.3), 0x8a7a6a, 3);
    const dist = Math.min(13, p.aimPoint.distanceTo(p.pos)) || 9, flight = 0.55, grav = 20;
    const vel = p.aimDir.clone().setY(0).normalize().multiplyScalar(dist / flight); vel.y = 0.5 * grav * flight;
    g.projectiles.fire({ pos: p.pos.clone().setY(p.pos.y + 2.1), vel, team: 'player', shape: 'cube', color: 0x7a6a5a, emissive: 0.05, gravity: grav, life: 2, scale: 2, radius: 0.75,
      onHit: (e, q) => { g.combat.damageEnemy(e, 24, p, { knock: q.vel.clone().setY(0).setLength(8), stagger: 0.6 }); },
      onExpire: (q) => { g.debris.burst(q.pos, B.stone, 7, 1); g.combat.aoe(q.pos, 2.4 + rk * 0.4, 14, p, { knock: 6, stagger: 0.4 }); g.fx.shockwave(q.pos, 0xc8a080, 3); g.audio?.impact(1.3); g.shake(0.2); } });
    g.audio?.whoosh(1);
  }
  haymaker() {
    const g = this.game, p = this.p;
    p.facing = this.aimAngle();
    this.cast(0.35, false, { lock: true, hold: true, cancelable: false, moveScale: 0 });
    g.audio?.charge?.(0.25, 0.3);
    this.during(0.3, () => g.particles.burst(this.handPos(), { count: 1, color: VIOLET, speed: 2, life: 0.2, size: 0.12, shape: 1 }), () => {
      if (p.action?.lock) p.action = null;
      this.pose('punch', 0.35);
      const f = this.fwd();
      let n = 0;
      for (const e of this.foes(p.pos, 4, f, 0.7)) { this.punchAt(e, 32, { knock: 16, stagger: 1 }); n++; }
      g.fx.slashArc(p.pos, p.facing, VIOLET, 3.8, 0.6, 0.2);
      g.fx.shockwave(p.pos.clone().addScaledVector(f, 2), VIOLET, 3);
      g.combat.hitBlocks(p.pos.clone().addScaledVector(f, 1.5), f, 2, 0.8, 40, p);
      if (!n) g.audio?.whoosh(1.3);
    });
  }
  brotherLesson() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('🤝 Brother!'); g.fx.flash(0x2a1040, 0.25, 0.2); g.audio?.charge?.(0.4, 0.5);
    this.statBuff('brother_lesson', 8, { meleeMult: 0.2, speed: 0.15 }, { onTick: () => {
      if (Math.random() < 0.4) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 0.8, 0, 0.5, 2.2, 1, 2.6, 0.1, 0, 1, 0.2, 1);
    } });
  }
  elbowDrop() {
    const g = this.game, p = this.p;
    const to = this.aimGround(9), R = 3.6;
    g.fx.rings.spawn(tmp.set(to.x, to.y + 0.08, to.z), { color: VIOLET, r0: R, r1: R * 0.95, dur: 0.55, thick: 0.1 });
    p.vel.y = 10; p.grounded = false; p.iframes = Math.max(p.iframes, 0.7);
    this.pose('slam', 0.6);
    const from = p.pos.clone();
    this.during(0.45, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k;
      if (!g.world.solidAt(x, p.pos.y + 0.5, z) && !g.world.solidAt(x, p.pos.y + 1.5, z)) { p.pos.x = x; p.pos.z = z; }
    }, () => {
      p.vel.y = -22;
      const c = p.pos.clone().setY(this.groundAt(p.pos.x, p.pos.z, p.pos.y) + 0.3);
      const n = g.combat.aoe(c, R, 42, p, { melee: true, knock: 8, stagger: 0.9, falloff: true });
      for (const e of this.foes(c, R)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
      g.fx.shockwave(c, VIOLET, R + 1.5); g.fx.landDust(c, 34); g.debris.burst(c, B.stone, 9, 1.1);
      g.shake(0.65); g.hitStop(n ? 0.08 : 0.03); g.audio?.impact(1.9);
    });
  }
  ironHide() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.toast?.('🛡️ Iron Hide'); g.audio?.charge?.(0.3, 0.4);
    let lastT = -9;
    this.buff('iron_hide', 4, {
      incoming: (a, src) => {
        if (src && src.pos && !src.dead && !src.isPlayer && src.takeDamage && g.time - lastT > 0.3 && src.pos.distanceTo(p.pos) < 4) {
          lastT = g.time;
          p.facing = Math.atan2(src.pos.x - p.pos.x, src.pos.z - p.pos.z);
          this.pose('punch', 0.22);
          this.punchAt(src, 20, { knock: 8 });
        }
        return a * 0.5;
      },
      onTick: () => { if (Math.random() < 0.4) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5), p.pos.y + Math.random() * 1.9, p.pos.z + (Math.random() - 0.5), 0, 0.7, 0, 0.4, 2.2, 1.4, 2.4, 0.12, 0, 1, 0.05, 1); },
    });
  }
  takadaCheer() {
    const g = this.game, p = this.p;
    if (p.hp < p.maxHp) this.rctHeal(0.25, 2, 0xff8ad8); else this.cast(0.5, true);
    g.toast?.('🎤 Takada-chan is cheering for you!');
    g.fx.damageNumber(p.pos.clone().setY(p.pos.y + 2), 0, { text: '♪ Takada-chan ♪', color: '#ff8ad8' });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.particles.glow.emit(p.pos.x + Math.cos(a) * 1.2, p.pos.y + 2.2, p.pos.z + Math.sin(a) * 1.2, Math.cos(a) * 0.5, 1.2, Math.sin(a) * 0.5, 0.9, 2.6, 1, 2, 0.16, -0.5, 1, 0.3, 1); }
    this.statBuff('takada', 6, { damage: 0.15 });
  }
  blackSpark() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.toast?.('✴️ Black Spark'); g.fx.flash(0x200000, 0.3, 0.15);
    g.bolts?.spawn(p.pos.clone().setY(p.pos.y + 1), { count: 4, length: 1.6, life: 0.25 });
    g.audio?.charge?.(0.4, 0.5);
    this.buff('spark', 6, { onTick: () => { if (Math.random() < 0.5) g.particles.burst(this.handPos(), { count: 1, color: 0xff2020, speed: 2, life: 0.2, size: 0.1, shape: 1 }); } });
  }
  swapFlash() {
    const g = this.game, p = this.p;
    const pool = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 14).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, 3);
    if (!pool.length) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    p.iframes = Math.max(p.iframes, pool.length * 0.3 + 0.3);
    pool.forEach((e, i) => this.after(i * 0.28, () => {
      if (e.dead) return;
      this.clapFx(p.pos);
      // swap a pebble behind it with Todo
      const back = tmp.subVectors(e.pos, p.pos).setY(0).normalize();
      const spot = this.ground(e.pos.x + back.x * (e.radius + 1), e.pos.z + back.z * (e.radius + 1), e.pos.y);
      if (!spot || !this.placeAt(p, spot)) this.closeIn(e, SWAP);
      p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      this.pose(i % 2 ? 'swingL' : 'punch', 0.22);
      this.punchAt(e, 34, { bf: true, knock: 5 });
    }));
  }
  rhythmBlack() {
    const g = this.game, p = this.p;
    const t = this.aimed(10) ?? this.target(8);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, SWAP);
    p.iframes = Math.max(p.iframes, 1.3);
    const styles = ['punch', 'swingL', 'swingR', 'uppercut', 'slam'];
    for (let i = 0; i < 5; i++) this.after(i * 0.22, () => {
      if (t.dead) return;
      if (i > 0) {
        // clap to the other side of it
        this.clapFx(p.pos, 0.7);
        const d = tmp.subVectors(t.pos, p.pos).setY(0).normalize();
        const spot = this.ground(t.pos.x + d.x * (t.radius + 1), t.pos.z + d.z * (t.radius + 1), t.pos.y);
        if (spot) this.placeAt(p, spot);
      }
      p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
      this.pose(styles[i], i === 4 ? 0.35 : 0.18);
      const last = i === 4;
      this.punchAt(t, last ? 40 : 14, { bf: last ? true : undefined, knock: last ? 12 : 1, stagger: last ? 1.2 : 0.4 });
      if (last) { g.fx.screenWave(t.pos.clone().setY(t.pos.y + 1), 1, 0.45); g.fx.shockwave(t.pos, 0xff2020, 4); }
    });
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
