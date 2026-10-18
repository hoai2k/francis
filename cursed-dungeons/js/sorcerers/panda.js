// Panda-style kit — Abrupt Mutated Cursed Corpse (Panda / Gorilla /
// Triceratops cores). 21 abilities on the technique tree; four are equipped
// (RMB takes a basic one) plus F.
//   LMB          heavy brawler combo.
//   Panda Core   Panda Clap (start, RMB), Panda Roll, Bear Hug, Panda Guard, Belly
//                Flop, Thunderclap
//   Gorilla Core Gorilla Core (his "big brother": through-guard straight), Gorilla
//                Roar, Boulder Toss, Drumming Ripple, Gorilla Barrage
//   Triceratops  Triceratops Core (his "big sister": horned charge), Horn Gore,
//                Frill Guard, Triceratops Stomp, Stampede
//   Three Cores  Core Shift, Core Recharge, Yaga's Cursed Corpses, Three Cores (all
//                three awake), Three-Core Crush
//   Talismans    Fluffy Fur, Big Brother, Big Sister, Cursed Corpse Body
//   F    Ultimate — Gorilla Core: Drumming Beat. Panda has no Domain Expansion;
//        his signature is the Gorilla core's Drumming Beat, a punch whose
//        shockwave ignores defence and passes straight through the body
//        (canon vs Mechamaru/Mahito-era fights). Here: three drumming blows,
//        the last a two-fisted beat that tears through everything in a line.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const RAGE = 0xff6a3a, HORN = 0x6adfa0, BLACK = 0x16161a, WHITE = 0xf0f0ea;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('panda', {
  name: 'Panda', technique: 'Gorilla Core', rarity: 'uncommon', title: 'Cursed Corpse', color: '#e8e8e8', ultimate: 'Gorilla Core: Drumming Beat',
  desc: 'A brawling cursed corpse with three cores: Gorilla core\'s Drumming Beat ignores defence, Triceratops core charges through anything.',
});

registerLook('panda', {
  paint: { skinTone: WHITE, hair: WHITE, top: WHITE, topTrim: WHITE, buttons: WHITE, collar: BLACK, sleeve: BLACK, pants: BLACK, shoes: BLACK, eye: BLACK, eyeWhite: BLACK, brow: BLACK, fringe: 0, hairSide: 0, hairBack: 0 },
  hair: () => [],
  hairColor: BLACK, accent: RAGE, emit: 0, scale: 1.34,
  cape: null,
  paintExtra(S) {
    // black arms, paws and shoulder band
    S.box(40, 16, 4, 12, 4, BLACK, 0.1); S.box(32, 48, 4, 12, 4, BLACK, 0.1);
    S.rect(16, 20, 24, 3, BLACK, 0.1); S.rect(20, 16, 8, 4, BLACK, 0.1);
    S.rect(21, 23, 6, 7, 0xfafaf4, 0.04);           // belly
    // eye patches with tiny shining eyes, nose and mouth
    S.rect(8, 11, 3, 3, BLACK, 0.05); S.rect(13, 11, 3, 3, BLACK, 0.05);
    S.px(10, 12, 0xffffff); S.px(13, 12, 0xffffff);
    S.rect(11, 14, 2, 1, BLACK, 0.02); S.px(11, 15, 0x6a5a5a); S.px(12, 15, 0x6a5a5a);
  },
  props(rig, K) {
    const black = K.mat(BLACK, { roughness: 0.9 }), white = K.mat(WHITE, { roughness: 0.9 });
    K.box(rig.head, 3, 3, 1.6, black, -3.6, 9.6, -0.5);   // round ears
    K.box(rig.head, 3, 3, 1.6, black, 3.6, 9.6, -0.5);
    K.box(rig.head, 4, 2.4, 1.4, white, 0, 2.4, 5);       // snout
    K.box(rig.head, 1.8, 1, 0.6, black, 0, 3.4, 5.8);     // nose
    K.box(rig.torso, 2.2, 2.2, 1.6, black, 0, 1.2, -2.6); // stubby tail
  },
});

export const PANDA_SKILLS = [
  { id: 'fists', name: 'Big Paws', icon: '🐾', desc: '+8% melee damage per rank.', max: 3, branch: 'Panda Core', tier: 1, req: 'ab:clap' },
  { id: 'clap', name: 'Panda Clap', icon: '👏', desc: 'The clap reaches further and hits harder.', max: 3, req: 'ab:clap', branch: 'Panda Core', tier: 2 },
  { id: 'drumming', name: 'Drumming Beat', icon: '🥁', desc: 'Gorilla Core\'s punches and the Drumming Beat ultimate hit harder and travel further.', max: 3, req: 'ab:gorilla', branch: 'Gorilla Core', tier: 2 },
  { id: 'horn', name: 'Triceratops Core', icon: '🦏', desc: 'Longer charges and a longer damage-shrugging barrier.', max: 2, req: 'ab:triceratops', branch: 'Triceratops', tier: 2 },
  { id: 'corpse', name: 'Cursed Corpse', icon: '🧸', desc: '+15 max HP per rank.', max: 3, branch: 'Three Cores', tier: 0 },
  { id: 'release', name: 'Three Cores', icon: '🐼', desc: 'Three Cores lasts longer and heals more.', max: 2, req: 'ab:full_release', branch: 'Three Cores', tier: 4 },
];

// damage that ignores a curse's armour (Drumming Beat strikes inside the body)
const pierce = (e, dmg) => dmg / Math.max(0.25, 1 - (e.armor ?? 0));

class PandaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 13, range: 2.7, arc: 1.1, lunge: 6, knock: 4, stop: 0.05, shake: 0.18, trail: 0xffffff, sparkColor: 0xffffff },
      { style: 'swingL', dur: 0.34, windup: 0.3, strike: 0.52, dmg: 14, range: 2.8, arc: 1.2, lunge: 6, knock: 4.5, stop: 0.05, shake: 0.2, trail: 0xffffff },
      { style: 'swingR', dur: 0.34, windup: 0.3, strike: 0.52, dmg: 15, range: 2.8, arc: 1.2, lunge: 6, knock: 5, stop: 0.055, shake: 0.2, trail: 0xffffff },
      { style: 'slam', dur: 0.62, windup: 0.45, strike: 0.62, dmg: 30, range: 3.5, arc: Math.PI, lunge: 3, knock: 12, stop: 0.1, shake: 0.5, ring: true, ringColor: 0xffffff, stagger: 0.7, trail: 0xffffff },
    ];
    this.p.stats.meleeMult += r('fists') * 0.08;
    this.p.maxHp += r('corpse') * 15; this.p.hp = Math.min(this.p.hp + r('corpse') * 15, this.p.maxHp);
    this.coreDurMul = 1; this.triMul = 1;
    this.branches = ['Panda Core', 'Gorilla Core', 'Triceratops', 'Three Cores'];
    this.library = {
      // ---- Panda Core
      clap: ability({ name: 'Panda Clap', icon: '👏', kind: 'basic', desc: 'A thunderous clap that throws a shockwave cone forward.', cd: 1.8, ce: 0, branch: 'Panda Core', tier: 0, start: true, legacy: 'ranged', use: () => this.clap() }),
      panda_roll: ability({ name: 'Panda Roll', icon: '⚪', kind: 'movement', desc: 'Curl up and roll forward, bowling over every curse in the way.', cd: 5, ce: 5, branch: 'Panda Core', tier: 1, use: () => this.pandaRoll() }),
      bear_hug: ability({ name: 'Bear Hug', icon: '🫂', kind: 'technique', desc: 'Grab a curse, crush it in a bear hug, then hurl it away.', cd: 9, ce: 12, branch: 'Panda Core', tier: 2, req: 'clap', use: () => this.bearHug() }),
      panda_guard: ability({ name: 'Panda Guard', icon: '🛡️', kind: 'defence', desc: 'Raise your big arms for 3s: hits on you are cut by 70% and the attacker gets a paw in the face.', cd: 12, ce: 8, branch: 'Panda Core', tier: 2, req: 'panda_roll', use: () => this.pandaGuard() }),
      belly_flop: ability({ name: 'Belly Flop', icon: '🐼', kind: 'movement', desc: 'Leap to the aim point and land belly-first, flattening and dazing curses.', cd: 9, ce: 10, branch: 'Panda Core', tier: 3, req: 'panda_roll', use: () => this.bellyFlop() }),
      thunderclap: ability({ name: 'Thunderclap', icon: '⚡', kind: 'technique', desc: 'Wind up (the ring shows its reach) and clap so hard that every curse around you is stunned.', cd: 14, ce: 18, branch: 'Panda Core', tier: 4, req: 'bear_hug', use: () => this.thunderclap() }),
      // ---- Gorilla Core
      gorilla: ability({ name: 'Gorilla Core', icon: '🦍', kind: 'technique', desc: 'Swap to the Gorilla core — bigger, heavier hands — with a straight whose impact goes through guard and armour.', cd: 7, ce: 12, branch: 'Gorilla Core', tier: 1, legacy: 't1', use: () => this.gorilla() }),
      gorilla_roar: ability({ name: 'Gorilla Roar', icon: '📢', kind: 'buff', desc: 'Beat your chest: nearby curses flinch, and for 8s you are in Gorilla core with +25% melee damage and 10% damage reduction.', cd: 20, ce: 14, branch: 'Gorilla Core', tier: 2, req: 'gorilla', use: () => this.gorillaRoar() }),
      boulder_toss: ability({ name: 'Boulder Toss', icon: '🪨', kind: 'technique', desc: 'Rip up a chunk of ground and hurl it at the marked spot.', cd: 9, ce: 12, branch: 'Gorilla Core', tier: 2, req: 'gorilla', use: () => this.boulderToss() }),
      drum_ripple: ability({ name: 'Drumming Ripple', icon: '🥁', kind: 'technique', desc: 'Drum the ground: three rings of through-guard shock ripple outward, ignoring armour.', cd: 10, ce: 16, branch: 'Gorilla Core', tier: 3, req: 'gorilla_roar', use: () => this.drumRipple() }),
      gorilla_barrage: ability({ name: 'Gorilla Barrage', icon: '👊', kind: 'technique', desc: 'Six drumming punches in a row, each beat passing through the curses in front.', cd: 12, ce: 22, branch: 'Gorilla Core', tier: 4, req: 'drum_ripple', use: () => this.gorillaBarrage() }),
      // ---- Triceratops
      triceratops: ability({ name: 'Triceratops Core', icon: '🦏', kind: 'movement', desc: 'Swap to the Triceratops core: a horned, damage-shrugging charge that bowls curses over.', cd: 9, ce: 14, branch: 'Triceratops', tier: 1, legacy: 't2', use: () => this.triceratops() }),
      horn_gore: ability({ name: 'Horn Gore', icon: '📯', kind: 'basic', desc: 'Grow horns for an instant and toss the curses in front of you into the air.', cd: 2.2, ce: 0, branch: 'Triceratops', tier: 2, req: 'triceratops', use: () => this.hornGore() }),
      frill_guard: ability({ name: 'Frill Guard', icon: '🦕', kind: 'defence', desc: 'Raise the bony frill for 5s: damage is halved and curse projectiles glance back at their owners.', cd: 15, ce: 12, branch: 'Triceratops', tier: 3, req: 'triceratops', use: () => this.frillGuard() }),
      tri_stomp: ability({ name: 'Triceratops Stomp', icon: '🦶', kind: 'technique', desc: 'Stomp a fissure forward through the ground, launching every curse along it.', cd: 8, ce: 12, branch: 'Triceratops', tier: 3, req: 'horn_gore', use: () => this.triStomp() }),
      stampede: ability({ name: 'Stampede', icon: '🐃', kind: 'technique', desc: 'Three horned charges in a row, each one turning toward your aim.', cd: 14, ce: 22, branch: 'Triceratops', tier: 4, req: 'tri_stomp', use: () => this.stampede() }),
      // ---- Three Cores
      core_shift: ability({ name: 'Core Shift', icon: '🔄', kind: 'movement', desc: 'Swap cores mid-step: a quick untouchable lunge that shakes off slows and mends a little.', cd: 6, ce: 4, branch: 'Three Cores', tier: 1, use: () => this.coreShift() }),
      corpse_mend: ability({ name: 'Core Recharge', icon: '🔋', kind: 'heal', desc: 'Let your resting cores pour energy into the body: heal 25% health over 3s.', cd: 28, ce: 20, branch: 'Three Cores', tier: 2, req: 'core_shift', use: () => this.rctHeal(0.25, 3, 0xffd0a0) }),
      yaga_corpses: ability({ name: 'Yaga\'s Cursed Corpses', icon: '🧸', kind: 'summon', desc: 'Three of Principal Yaga\'s little cursed corpses waddle out and brawl with curses for 12s.', cd: 22, ce: 22, branch: 'Three Cores', tier: 3, req: 'corpse_mend', use: () => this.yagaCorpses() }),
      full_release: ability({ name: 'Three Cores', icon: '🐼', kind: 'buff', desc: 'All three cores awake at once — bigger, regenerating, and every hit sends a small through-guard beat.', cd: 26, ce: 40, branch: 'Three Cores', tier: 3, legacy: 't3', req: 'core_shift', use: () => this.fullRelease() }),
      three_core_crush: ability({ name: 'Three-Core Crush', icon: '💢', kind: 'technique', desc: 'Panda, Gorilla and Triceratops together: a horned charge that ends in a two-fisted drumming slam.', cd: 30, ce: 55, branch: 'Three Cores', tier: 5, req: 'full_release', use: () => this.threeCoreCrush() }),
    };
    this.passives = {
      fluffy: passive({ name: 'Fluffy Fur', icon: '🐻', desc: '+10% damage reduction.', branch: 'Panda Core', tier: 2, req: 'clap', apply: (pl) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.1); } }),
      big_brother: passive({ name: 'Big Brother', icon: '🦍', desc: 'Gorilla core lasts 50% longer; +10% melee damage.', branch: 'Gorilla Core', tier: 3, req: 'gorilla_roar', apply: (pl, k) => { k.coreDurMul *= 1.5; pl.stats.meleeMult += 0.1; } }),
      big_sister: passive({ name: 'Big Sister', icon: '🦏', desc: 'Triceratops abilities hit 25% harder and leave you a 3s barrier.', branch: 'Triceratops', tier: 3, req: 'horn_gore', apply: (pl, k) => { k.triMul *= 1.25; k.sister = true; } }),
      corpse_body: passive({ name: 'Cursed Corpse Body', icon: '🧸', desc: '+25 max health; heal 3% of it whenever you exorcise a curse.', branch: 'Three Cores', tier: 2, req: 'core_shift', apply: (pl, k) => { pl.maxHp += 25; pl.hp += 25; k.corpseHeal = true; } }),
    };
    this.ultimate = { name: 'Gorilla Core: Drumming Beat', icon: '🥁', use: () => this.drummingBeat() };
    this.core = 'panda'; this.coreT = 0; this.releaseT = 0;
    this.baseScale = p.rig.root.scale.x;
  }
  dispose() {
    super.dispose();
    const rig = this.p.rig;
    rig.root.scale.setScalar(this.baseScale);
    rig.material.userData.glow.value.set(0x000000);
    if (this.horn) rig.head.remove(this.horn);
    for (const o of this.temps ?? []) this.game.scene.remove(o); this.temps?.clear();
  }
  // ------------------------------------------------------------- cores
  setCore(core, dur) {
    const g = this.game, p = this.p;
    if (core === 'gorilla') dur *= this.coreDurMul;
    this.core = core; this.coreT = Math.max(this.coreT, dur);
    const big = core === 'gorilla' ? 1.14 : 1;
    p.rig.root.scale.setScalar(this.baseScale * (this.releaseT > 0 ? 1.24 : big));
    p.rig.material.userData.glow.value.set(core === 'gorilla' ? 0x2a0600 : 0x000000);
    if (core === 'gorilla') { g.fx.summonCircle(p.pos, RAGE); g.audio?.tone({ freq: 90, to: 60, dur: 0.4, gain: 0.3, type: 'sawtooth', filter: 600 }); }
  }
  get speedMul() { return this.core === 'gorilla' ? 0.92 : 1; }
  tick(dt) {
    const p = this.p;
    if (this.releaseT > 0) {
      this.releaseT -= dt;
      p.heal((1.5 + this.rank('release')) * dt, true);
      if (Math.random() < 0.4) this.game.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 0.3 + Math.random() * 2), { count: 1, color: RAGE, speed: 1, up: 2, life: 0.5, size: 0.25, sizeEnd: 0.05 });
      if (this.releaseT <= 0) { this.coreT = Math.min(this.coreT, 0.01); }
    }
    if (this.coreT > 0) {
      this.coreT -= dt;
      if (this.core === 'gorilla' && Math.random() < 0.25) this.game.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1.4), { count: 1, color: RAGE, speed: 1.5, life: 0.4, size: 0.18, shape: 1 });
      if (this.coreT <= 0) {
        this.core = 'panda';
        p.rig.root.scale.setScalar(this.baseScale);
        p.rig.material.userData.glow.value.set(0x000000);
      }
    }
  }
  onMeleeHit(e, step, dealt) {
    if (this.core !== 'gorilla' || e.dead) return;
    // Gorilla core: heavier hands, and in Full Release every blow drums
    this.game.combat.damageEnemy(e, dealt * 0.35, this.p, { melee: true, stagger: 0.1, ceGain: 0, crit: false, color: '#ff8a5a' });
    if (this.releaseT > 0) this.beatLine(e.pos, step.dmg * 0.5, 5, false);
  }
  // ------------------------------------------------------------- Panda Clap
  clap() {
    const g = this.game, p = this.p, rk = this.rank('clap');
    this.cast(0.35, true);
    const dir = tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing));
    const R = 5.5 + rk;
    const hits = g.combat.query(p.pos, dir, R, 0.65);
    for (const e of hits) g.combat.damageEnemy(e, 14 + rk * 5, p, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), stagger: 0.5 });
    const front = p.pos.clone().addScaledVector(dir, 1);
    g.fx.slashArc(p.pos, p.facing, 0xffffff, 2.2, 0.6, 0.15);
    g.fx.slashArc(p.pos, p.facing, 0xffffff, R * 0.8, 0.65, 0.25);
    g.fx.shockwave(front, 0xffffff, 2.5);
    g.particles.burst(front.setY(p.pos.y + 1.3), { count: 20, color: 0xffffff, speed: 14, dir: dir.clone(), spread: 0.5, life: 0.3, size: 0.12, drag: 4, shape: 1 });
    if (hits.length) { g.hitStop(0.05); g.shake(0.2); }
    g.audio?.noise({ dur: 0.18, gain: 0.6, type: 'highpass', freq: 1500, sweep: 400 });
    g.audio?.impact(1);
  }
  // ------------------------------------------------------------- Gorilla Core
  gorilla() {
    const p = this.p;
    this.setCore('gorilla', 8);
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const step = { style: 'punch', dur: 0.42, windup: 0.32, strike: 0.5, dmg: 0, range: 3, arc: 0.9, lunge: 12, knock: 0, stop: 0.08, shake: 0.3, trail: RAGE, custom: true };
    p.startAttack(step, 0);
    this.pendingBeat = p.action.step;
  }
  onStrike(step) {
    if (step !== this.pendingBeat) return;
    this.pendingBeat = null;
    const g = this.game, p = this.p, rk = this.rank('drumming');
    const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    const hits = g.domainSys?.sureHit(p) ? g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos)) : g.combat.query(p.pos, dir, 3, 0.9);
    const dmg = 30 + rk * 10;
    for (const e of hits) {
      g.combat.damageEnemy(e, pierce(e, dmg), p, { melee: true, knock: dir.clone().multiplyScalar(5), stagger: 0.8, unblockable: true, color: '#ff8a5a' });
      g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.55), dir, { color: RAGE, big: true });
    }
    this.beatLine(p.pos, dmg * 0.5, 5 + rk, false);
    g.hitStop(0.06); g.shake(0.3);
    g.audio?.impact(1.6); g.audio?.tone({ freq: 70, to: 40, dur: 0.3, gain: 0.4, type: 'sine', rev: 0.3 });
  }
  // ------------------------------------------------------------- Drumming Beat (ultimate)
  // The Gorilla core's beat: the shock is driven inside the body, so guard
  // and armour mean nothing, and it keeps going out the other side.
  drummingBeat() {
    const g = this.game, p = this.p, rk = this.rank('drumming');
    if (this.drumT) return false;
    this.setCore('gorilla', 10);
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    p.iframes = Math.max(p.iframes, 1.8);
    p.action = { type: 'raise', dur: 0.35, elapsed: 0, t: 0, moveScale: 0, lock: true, cancelable: false };
    g.toast?.('Gorilla Core: Drumming Beat', 'big');
    g.fx.dimTarget = 0.35; g.fx.flash(0x401000, 0.35, 0.2); g.slowMo(0.4, 0.4);
    g.audio?.tone({ freq: 55, to: 40, dur: 0.6, gain: 0.5, type: 'sawtooth', filter: 400, rev: 0.4 });
    const blows = [
      { at: 0.35, style: 'punch', dmg: 45 + rk * 14, L: 10 + rk * 2, spread: [0] },
      { at: 0.75, style: 'swingL', dmg: 55 + rk * 16, L: 11 + rk * 2, spread: [0] },
      { at: 1.3, style: 'slam', dmg: 130 + rk * 40, L: 16 + rk * 3, spread: [-0.35, 0, 0.35], final: true },
    ];
    let t = 0, i = 0;
    const T = this.drumT = {};
    g.addUpdater((dt) => {
      if (this.p.kit !== this || this.drumT !== T) { g.fx.dimTarget = 0; return false; }
      t += dt;
      const B = blows[i];
      if (B && t >= B.at - 0.22 && !B.anim) {
        B.anim = true;
        p.action = { type: 'attack', step: { style: B.style, strike: 0.5, windup: 0.3 }, style: B.style, dur: 0.32, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0, lock: true };
      }
      if (B && t >= B.at) { i++; this.drumBlow(B); }
      if (i < blows.length) return true;
      this.drumT = null; g.fx.dimTarget = 0;
      return false;
    });
  }
  drumBlow(B) {
    const g = this.game, p = this.p;
    const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    const front = p.pos.clone().addScaledVector(dir, 1.4);
    for (const e of g.combat.query(p.pos, dir, B.final ? 4.5 : 3.5, B.final ? 1.4 : 1)) {
      g.combat.damageEnemy(e, pierce(e, B.dmg), p, { melee: true, knock: dir.clone().multiplyScalar(B.final ? 16 : 6), stagger: 1, unblockable: true, color: '#ff8a5a' });
      g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.55), dir, { color: RAGE, big: true, crit: B.final });
      if (B.final && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
    }
    for (const a of B.spread) this.beatLine(p.pos, B.dmg * 0.75, B.L, true, dir.clone().applyAxisAngle(tmp2.set(0, 1, 0), a));
    g.fx.shockwave(front, RAGE, B.final ? 7 : 3.5);
    g.fx.screenWave(front.clone().setY(front.y + 1), B.final ? 1.6 : 0.6, B.final ? 0.6 : 0.3);
    g.fx.chroma(B.final ? 1.6 : 0.6);
    g.shake(B.final ? 1.1 : 0.45); g.hitStop(B.final ? 0.14 : 0.07);
    g.audio?.impact(B.final ? 2.5 : 1.8);
    g.audio?.tone({ freq: B.final ? 50 : 70, to: 30, dur: B.final ? 0.8 : 0.35, gain: 0.6, type: 'sine', rev: 0.4 });
    if (B.final) {
      g.combat.aoe(p.pos, 5, B.dmg * 0.4, p, { knock: 12, stagger: 0.8, unblockable: true });
      g.fx.explosion(front, RAGE, 3.5);
      g.fx.flash(0xffd0a0, 0.6, 0.25); g.slowMo(0.5, 0.3);
      g.audio?.blackFlash(); g.audio?.energy('explode');
    }
  }
  beatLine(from, dmg, L, big, dir = null) {
    const g = this.game, p = this.p;
    dir = dir ? dir.clone() : new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    const o = from.clone(), hit = new Set();
    const n = Math.ceil(L / 1.5);
    for (let i = 1; i <= n; i++) this.after(i * 0.035, () => {
      const c = tmp.copy(o).addScaledVector(dir, i * 1.5);
      g.fx.rings.spawn(tmp2.set(c.x, g.fx.groundY(c) + 0.08, c.z), { color: RAGE, r0: 0.3, r1: big ? 1.8 : 1.1, dur: 0.25, thick: 0.18 });
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > 1.2 + e.radius || Math.abs(e.pos.y - c.y) > 3) continue;
        hit.add(e);
        g.combat.damageEnemy(e, pierce(e, dmg), p, { knock: dir.clone().multiplyScalar(big ? 9 : 4), stagger: 0.5, unblockable: true, ceGain: 1, color: '#ff8a5a' });
        g.fx.screenWave(tmp2.copy(e.pos).setY(e.pos.y + 1), big ? 0.4 : 0.2, 0.25);
      }
    });
    if (big) g.fx.slashLine(o.clone().setY(o.y + 1.1), dir, L, RAGE, 0.6, 0.25);
  }
  // ------------------------------------------------------------- Triceratops
  triceratops() {
    const g = this.game, p = this.p, rk = this.rank('horn');
    const dir = p.aimDir.clone().setY(0).normalize();
    const dur = 0.5 + rk * 0.1, speed = 19;
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'cast', both: true, dur: dur + 0.1, elapsed: 0, t: 0, lock: true, cancelable: false, faceAim: false, root: dir.clone().multiplyScalar(speed) };
    p.vel.x = dir.x * speed; p.vel.z = dir.z * speed;
    p.iframes = Math.max(p.iframes, dur);
    p.barrierT = Math.max(p.barrierT ?? 0, dur + 2 + rk + (this.sister ? 1 : 0));
    // the Triceratops core grows a horned frill for the charge
    const horn = new THREE.Group();
    const bone = new THREE.MeshStandardNodeMaterial({ color: 0xe8dcc0, roughness: 0.6, emissive: HORN, emissiveIntensity: 0.3 });
    const hb = (w, h, d, x, y, z, rx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * 0.058, h * 0.058, d * 0.058), bone); m.position.set(x * 0.058, y * 0.058, z * 0.058); m.rotation.x = rx; horn.add(m); };
    hb(1.2, 1.2, 4, -2, 8, 4.5, -0.5); hb(1.2, 1.2, 4, 2, 8, 4.5, -0.5); hb(1, 1, 2.5, 0, 3.5, 5.6, -0.2); hb(10, 5, 1, 0, 9, -1, -0.4);
    p.rig.head.add(horn); this.horn = horn;
    g.audio?.whoosh(1.4); g.audio?.tone({ freq: 120, to: 60, dur: 0.5, gain: 0.3, type: 'sawtooth', filter: 500 });
    const hit = new Set();
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      g.fx.landDust(p.pos);
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || e.pos.distanceTo(p.pos) > 1.6 + e.radius) continue;
        hit.add(e);
        g.combat.damageEnemy(e, (22 + rk * 8) * this.triMul, p, { knock: dir.clone().multiplyScalar(14), stagger: 1.1 });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6);
        g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + 1), dir, { color: HORN, big: true });
        g.shake(0.25); g.hitStop(0.04); g.audio?.impact(1.4);
      }
      if (t < dur) return true;
      p.action = null;
      p.rig.head.remove(horn); this.horn = null;
      g.fx.shockwave(p.pos, HORN, 3);
      return false;
    });
  }
  // ------------------------------------------------------------- Full Release
  fullRelease() {
    const g = this.game, p = this.p;
    this.releaseT = 10 + this.rank('release') * 2.5;
    this.setCore('gorilla', this.releaseT);
    p.action = { type: 'raise', dur: 0.6, elapsed: 0, t: 0, moveScale: 0 };
    g.combat.aoe(p.pos, 4.5, 30, p, { knock: 12, stagger: 0.8 });
    g.fx.shockwave(p.pos, RAGE, 6); g.fx.explosion(p.pos, RAGE, 2.5);
    g.fx.flash(0x401000, 0.35, 0.2); g.fx.screenWave(p.pos, 1, 0.4);
    g.shake(0.6); g.hitStop(0.06);
    g.toast?.('Three Cores');
    g.audio?.tone({ freq: 60, to: 35, dur: 1, gain: 0.6, type: 'sawtooth', filter: 400, rev: 0.4 });
    g.audio?.energy('explode');
  }
  // ============================================================== library abilities
  temp(o) { (this.temps || (this.temps = new Set())).add(o); this.game.scene.add(o); return o; }
  untemp(o) { this.temps?.delete(o); this.game.scene.remove(o); }
  warn(c, R, dur, col = 0xffffff) {
    const g = this.game, y = this.groundAt(c.x, c.z, c.y) + 0.07;
    g.fx.rings.spawn(tmp.set(c.x, y, c.z), { color: col, r0: R, r1: R, dur, thick: 0.1 });
    g.fx.rings.spawn(tmp.set(c.x, y + 0.01, c.z), { color: col, r0: R, r1: 0.3, dur, thick: 0.3 });
  }
  leapTo(to, dur, height, onLand) {
    const g = this.game, p = this.p, from = p.pos.clone();
    p.invulnerable = true;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.9, windup: 0.3 }, style: 'slam', dur: dur + 0.1, elapsed: 0, t: 0, windup: 0.3, strike: 0.9, struck: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    this.during(dur, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * height;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
    }, () => { p.invulnerable = false; if (p.action?.lock) p.action = null; if (!this.disposed) onLand?.(p.pos.clone()); });
  }
  // the Triceratops core's horns and frill on Panda's head (returns a remover)
  growHorn() {
    const p = this.p;
    if (this.horn) p.rig.head.remove(this.horn);
    const horn = new THREE.Group();
    const bone = new THREE.MeshStandardNodeMaterial({ color: 0xe8dcc0, roughness: 0.6, emissive: HORN, emissiveIntensity: 0.3 });
    const hb = (w, h, d, x, y, z, rx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * 0.058, h * 0.058, d * 0.058), bone); m.position.set(x * 0.058, y * 0.058, z * 0.058); m.rotation.x = rx; horn.add(m); };
    hb(1.2, 1.2, 4, -2, 8, 4.5, -0.5); hb(1.2, 1.2, 4, 2, 8, 4.5, -0.5); hb(1, 1, 2.5, 0, 3.5, 5.6, -0.2); hb(10, 5, 1, 0, 9, -1, -0.4);
    p.rig.head.add(horn); this.horn = horn;
    if (this.sister) p.barrierT = Math.max(p.barrierT ?? 0, 3);
    return () => { if (this.horn === horn) { p.rig.head.remove(horn); this.horn = null; } };
  }
  onKill() { if (this.corpseHeal) this.p.heal(this.p.maxHp * 0.03, true); }
  // ---- Panda Core
  pandaRoll() {
    const g = this.game, p = this.p;
    this.dash(this.fwd(), 7.5, 0.35, { hitR: 1.6, dmg: 16, color: 0xffffff, onHit: (e) => { if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 5); g.audio?.impact(1); } });
    g.audio?.whoosh(1.1);
    this.during(0.35, () => { g.fx.landDust(p.pos); g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.8, p.pos.z), { count: 2, color: 0xffffff, speed: 1, life: 0.3, size: 0.4, sizeEnd: 0.05 }); });
  }
  bearHug() {
    const g = this.game, p = this.p, t = this.target(5);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, 0xffffff);
    p.action = { type: 'raise', dur: 1.15, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    this.stun(t, 1.2);
    g.audio?.tone({ freq: 90, to: 70, dur: 0.8, gain: 0.25, type: 'sawtooth', filter: 400 });
    for (let i = 0; i < 4; i++) this.after(0.15 + i * 0.22, () => {
      if (t.dead) return;
      this.hit(t, 10 + this.rank('fists') * 2, { melee: true, stagger: 0.3, knock: new THREE.Vector3(), unblockable: true });
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + t.height * 0.5), null, { color: 0xffffff }); g.audio?.impact(0.9); g.shake(0.1);
    });
    this.after(1.05, () => {
      if (p.action?.lock) p.action = null;
      if (t.dead) return;
      const f = this.fwd();
      this.pose('slam', 0.35);
      this.hit(t, 26 + this.rank('fists') * 4, { melee: true, stagger: 1, unblockable: true, knock: f.clone().multiplyScalar(16) });
      if (!t.isBoss) t.vel.y = Math.max(t.vel.y, 8);
      g.fx.shockwave(t.pos, 0xffffff, 3); g.shake(0.35); g.audio?.impact(1.5);
    });
  }
  pandaGuard() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0xffffff, r0: 0.4, r1: 2, dur: 0.3, thick: 0.2 });
    g.audio?.tone({ freq: 200, to: 150, dur: 0.2, gain: 0.15, type: 'triangle' });
    this.buff('panda_guard', 3, {
      incoming: (a, src) => {
        if (src && g.enemies.includes(src) && !src.dead && src.pos.distanceTo(p.pos) < 5) {
          this.hit(src, 18 + this.rank('fists') * 3, { melee: true, stagger: 0.8, knock: tmp.subVectors(src.pos, p.pos).setY(0).normalize().multiplyScalar(10) });
          g.fx.hitSpark(src.pos.clone().setY(src.pos.y + 1), null, { color: 0xffffff, big: true }); g.audio?.impact(1.2);
        }
        return a * 0.3;
      },
      onTick: () => { if (Math.random() < 0.5) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 1.6, p.pos.y + 0.5 + Math.random() * 1.5, p.pos.z + (Math.random() - 0.5) * 1.6, 0, 0.3, 0, 0.4, 1.6, 1.6, 1.6, 0.12, 0, 1, 0.1, 0); },
    });
  }
  bellyFlop() {
    const g = this.game, to = this.aimGround(9);
    this.warn(to, 3.6, 0.55);
    g.audio?.whoosh(1.2);
    this.leapTo(to, 0.55, 3.5, (c) => {
      this.blast(c, 3.6, 38 + this.rank('fists') * 5, { color: 0xffffff, knock: 9, stagger: 0.9, melee: true });
      for (const e of this.foes(c, 3.6)) this.stun(e, 0.8);
      g.fx.landDust(c, 30); g.fx.debris(c, 0x8a7a6a, 10); g.hitStop(0.05);
    });
  }
  thunderclap() {
    const g = this.game, p = this.p, R = 5.5 + this.rank('clap') * 0.5, wind = 0.4;
    p.action = { type: 'raise', dur: wind + 0.2, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    this.warn(p.pos, R, wind);
    g.audio?.charge(wind, 1);
    this.after(wind, () => {
      if (p.action?.lock) p.action = null;
      this.cast(0.3, true);
      for (const e of this.foes(p.pos, R)) { this.hit(e, 45 + this.rank('clap') * 8, { stagger: 1, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(10) }); this.stun(e, 1.2); }
      g.fx.shockwave(p.pos, 0xffffff, R + 1); g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0xfff0a0, r0: 0.5, r1: R, dur: 0.3, thick: 0.25 });
      g.particles.burst(p.pos.clone().setY(p.pos.y + 1.4), { count: 40, color: 0xffffff, speed: 16, life: 0.35, size: 0.12, drag: 4, shape: 1, intensity: 3 });
      g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1, 0.4); g.fx.flash(0xffffff, 0.25, 0.1);
      g.shake(0.6); g.hitStop(0.07);
      g.audio?.noise({ dur: 0.3, gain: 0.8, type: 'highpass', freq: 1200, sweep: 300 }); g.audio?.impact(1.8);
    });
  }
  // ---- Gorilla Core
  gorillaRoar() {
    const g = this.game, p = this.p;
    this.setCore('gorilla', 8);
    p.action = { type: 'raise', dur: 0.6, elapsed: 0, t: 0, moveScale: 0 };
    for (const e of this.foes(p.pos, 7)) { e.cancelAttack?.(); this.hit(e, 6, { stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(5) }); }
    for (let i = 0; i < 3; i++) this.after(i * 0.15, () => { g.fx.shockwave(p.pos, RAGE, 3 + i * 2); g.audio?.tone({ freq: 70, to: 45, dur: 0.15, gain: 0.4, type: 'sine' }); g.shake(0.2); });
    g.toast?.('Gorilla Roar');
    this.statBuff('gorilla_roar', 8, { meleeMult: 0.25, armor: 0.1 });
  }
  boulderToss() {
    const g = this.game, p = this.p, to = this.aimGround(13);
    p.action = { type: 'raise', dur: 0.55, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    const rock = this.temp(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.2), new THREE.MeshStandardNodeMaterial({ color: 0x7a7268, roughness: 0.95 })));
    rock.castShadow = true;
    g.fx.debris(p.pos, 0x7a6a5a, 8); g.audio?.impact(1);
    const R = 3;
    this.during(0.4, () => { rock.position.set(p.pos.x, p.pos.y + 3.4, p.pos.z); }, () => {
      this.warn(to, R, 0.55, RAGE);
      this.pose('slam', 0.3);
      const from = rock.position.clone();
      g.audio?.whoosh(1.4);
      this.during(0.55, (t, dt, k) => {
        rock.position.set(from.x + (to.x - from.x) * k, from.y + (to.y + 0.5 - from.y) * k + Math.sin(k * Math.PI) * 4, from.z + (to.z - from.z) * k);
        rock.rotation.x += dt * 8; rock.rotation.z += dt * 5;
      }, () => {
        this.untemp(rock); rock.geometry.dispose();
        const dmg = 50 + this.rank('drumming') * 10;
        for (const e of this.foes(to, R)) { this.hit(e, pierce(e, dmg), { stagger: 1, unblockable: true, knock: tmp.subVectors(e.pos, to).setY(0).normalize().multiplyScalar(10) }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7); }
        g.fx.explosion(to, 0x8a7a6a, 2.5); g.fx.debris(to, 0x7a7268, 14); g.combat.hitBlocks(to, tmp2.set(0, 0, 1), 1.6, Math.PI, 40, p);
        g.shake(0.5); g.hitStop(0.05); g.audio?.impact(1.8);
      });
    });
  }
  drumRipple() {
    const g = this.game, p = this.p, c = p.pos.clone(), rk = this.rank('drumming');
    this.setCore('gorilla', 4);
    this.pose('slam', 0.5);
    for (let i = 0; i < 3; i++) this.after(0.2 + i * 0.18, () => {
      const R = 2.5 + i * 2.2;
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: RAGE, r0: R - 1.5, r1: R, dur: 0.25, thick: 0.3 });
      for (const e of this.foes(c, R + 0.5)) {
        const d = Math.hypot(e.pos.x - c.x, e.pos.z - c.z); if (d < R - 2.4) continue;
        this.hit(e, pierce(e, 22 + rk * 6), { unblockable: true, stagger: 0.6, color: '#ff8a5a', knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(5) });
        g.fx.screenWave(e.pos.clone().setY(e.pos.y + 1), 0.25, 0.2);
      }
      g.audio?.tone({ freq: 70 - i * 8, to: 40, dur: 0.25, gain: 0.5, type: 'sine', rev: 0.3 }); g.shake(0.25);
    });
  }
  gorillaBarrage() {
    const g = this.game, p = this.p, rk = this.rank('drumming');
    this.setCore('gorilla', 5);
    p.action = { type: 'cast', dur: 0.9, elapsed: 0, t: 0, moveScale: 0.1, lock: true, faceAim: true };
    for (let i = 0; i < 6; i++) this.after(i * 0.14, () => {
      const last = i === 5;
      p.facing = this.aimAngle();
      this.pose(last ? 'slam' : i % 2 ? 'swingL' : 'punch', 0.16);
      const f = this.fwd();
      for (const e of this.foes(p.pos, 3, f, 0.9)) { this.hit(e, pierce(e, last ? 40 + rk * 10 : 12 + rk * 3), { melee: true, unblockable: true, stagger: last ? 1 : 0.3, knock: f.clone().multiplyScalar(last ? 12 : 2), color: '#ff8a5a' }); }
      this.beatLine(p.pos, last ? 30 + rk * 8 : 10 + rk * 2, last ? 9 : 5, last);
      g.fx.shockwave(p.pos.clone().addScaledVector(f, 1.4), RAGE, last ? 4 : 2);
      g.audio?.impact(last ? 1.9 : 1.1); g.shake(last ? 0.5 : 0.15); if (last) g.hitStop(0.07);
    });
  }
  // ---- Triceratops
  hornGore() {
    const g = this.game, p = this.p, f = this.fwd();
    const off = this.growHorn();
    this.pose('uppercut', 0.35);
    this.after(0.12, () => {
      for (const e of this.foes(p.pos, 3.2, f, 0.8)) {
        this.hit(e, (18 + this.rank('horn') * 5) * this.triMul, { melee: true, stagger: 0.7, knock: f.clone().multiplyScalar(3) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 10);
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: HORN, big: true });
      }
      g.fx.slashArc(p.pos, p.facing, HORN, 3, 0.35, 0.18); g.audio?.impact(1.2);
    });
    this.after(0.4, off);
  }
  frillGuard() {
    const g = this.game, p = this.p;
    const off = this.growHorn();
    this.cast(0.35, true);
    p.barrierT = Math.max(p.barrierT ?? 0, 5);
    g.fx.shockwave(p.pos, HORN, 3); g.audio?.tone({ freq: 140, to: 90, dur: 0.3, gain: 0.25, type: 'sawtooth', filter: 600 });
    this.buff('frill_guard', 5, {
      onTick: () => {
        for (const pr of [...g.projectiles.list]) {
          if (pr.team !== 'enemy' || pr.pos.distanceTo(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z)) > 2) continue;
          const dmg = (pr.dmg ?? 10) * 1.5 * this.triMul;
          pr.team = 'player'; pr.vel.multiplyScalar(-1.2); pr.hit.clear();
          pr.onHit = (e) => { this.hit(e, dmg, { stagger: 0.5, knock: pr.vel.clone().setLength(4) }); };
          g.fx.hitSpark(pr.pos, null, { color: HORN });
        }
      },
      onEnd: () => off(),
    });
  }
  triStomp() {
    const g = this.game, p = this.p, f = this.fwd(), o = p.pos.clone();
    this.pose('slam', 0.45);
    const hit = new Set();
    for (let i = 1; i <= 6; i++) this.after(0.15 + i * 0.06, () => {
      const c = o.clone().addScaledVector(f, i * 1.5); c.y = this.groundAt(c.x, c.z, o.y);
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: HORN, r0: 0.3, r1: 1.5, dur: 0.3, thick: 0.25 });
      g.fx.debris(c, 0x7a6a5a, 4);
      for (const e of this.foes(c, 1.6)) {
        if (hit.has(e)) continue; hit.add(e);
        this.hit(e, (24 + this.rank('horn') * 6) * this.triMul, { stagger: 0.8, knock: f.clone().multiplyScalar(3) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
      }
      g.audio?.impact(0.9 + i * 0.05); g.shake(0.12);
    });
  }
  stampede() {
    const g = this.game, p = this.p;
    const off = this.growHorn();
    p.barrierT = Math.max(p.barrierT ?? 0, 1.5);
    for (let i = 0; i < 3; i++) this.after(i * 0.42, () => {
      this.dash(this.fwd(), 6, 0.32, { hitR: 1.7, dmg: (24 + this.rank('horn') * 6) * this.triMul, color: HORN, onHit: (e) => { if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: HORN, big: true }); g.audio?.impact(1.3); } });
      g.audio?.whoosh(1.3); g.fx.landDust(p.pos, 20);
    });
    this.after(1.3, off);
  }
  // ---- Three Cores
  coreShift() {
    const g = this.game, p = this.p;
    p.slowT = 0;
    this.dash(this.fwd(), 5, 0.18, { iframes: 0.6, color: RAGE });
    p.heal(p.maxHp * 0.05, true);
    g.fx.blinkPuff(p.pos, RAGE); g.audio?.whoosh(1);
  }
  yagaCorpses() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    g.fx.summonCircle(p.pos, 0xffd0a0); g.audio?.energy('summon');
    const cols = [0xc8a078, 0x9a7a5a, 0xe8d8c0];
    for (let i = 0; i < 3; i++) {
      const doll = new THREE.Group();
      const fur = new THREE.MeshStandardNodeMaterial({ color: cols[i], roughness: 0.9 }), dark = new THREE.MeshStandardNodeMaterial({ color: 0x1a1a1a, roughness: 0.8 });
      const b = (w, h, d, x, y, z, m) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = true; doll.add(mm); return mm; };
      b(0.5, 0.5, 0.4, 0, 0.45, 0, fur); b(0.45, 0.42, 0.42, 0, 0.92, 0, fur);
      b(0.14, 0.14, 0.08, -0.2, 1.18, 0, fur); b(0.14, 0.14, 0.08, 0.2, 1.18, 0, fur);
      b(0.07, 0.07, 0.02, -0.1, 0.96, 0.22, dark); b(0.07, 0.07, 0.02, 0.1, 0.96, 0.22, dark);
      const armL = b(0.14, 0.36, 0.14, -0.32, 0.5, 0, fur), armR = b(0.14, 0.36, 0.14, 0.32, 0.5, 0, fur);
      const a = i / 3 * Math.PI * 2;
      doll.position.set(p.pos.x + Math.cos(a) * 1.4, p.pos.y, p.pos.z + Math.sin(a) * 1.4);
      this.temp(doll);
      const D = { cd: 0.3 + i * 0.2, ph: Math.random() * 6 };
      this.during(12, (t, dt) => {
        D.cd -= dt; D.ph += dt * 12;
        const e = g.nearestEnemy(doll.position, 14);
        const goal = e ? e.pos : tmp.set(p.pos.x + Math.cos(a + t) * 1.6, p.pos.y, p.pos.z + Math.sin(a + t) * 1.6);
        tmp2.subVectors(goal, doll.position).setY(0);
        const d = tmp2.length();
        if (d > (e ? 0.9 + (e.radius ?? 0.5) : 0.3)) {
          doll.position.addScaledVector(tmp2.normalize(), Math.min(d, 6 * dt));
          doll.position.y = this.groundAt(doll.position.x, doll.position.z, doll.position.y) + Math.abs(Math.sin(D.ph)) * 0.12;
          doll.rotation.y = Math.atan2(tmp2.x, tmp2.z);
        } else if (e && D.cd <= 0) {
          D.cd = 0.6;
          (D.ph % 2 > 1 ? armL : armR).rotation.x = -1.4;
          this.hit(e, 8 + this.rank('corpse') * 2, { stagger: 0.25, ceGain: 0.3, knock: tmp2.normalize().multiplyScalar(2) });
          g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 0.8), null, { color: 0xffd0a0 }); g.audio?.impact(0.6);
        }
        armL.rotation.x *= 0.85; armR.rotation.x *= 0.85;
      }, () => { g.fx.poof(doll.position); this.untemp(doll); });
    }
  }
  threeCoreCrush() {
    const g = this.game, p = this.p, rk = this.rank('drumming');
    const off = this.growHorn();
    this.setCore('gorilla', 6);
    g.toast?.('Three-Core Crush'); g.audio?.tone({ freq: 60, to: 35, dur: 0.8, gain: 0.5, type: 'sawtooth', filter: 400 });
    const f = this.fwd();
    this.warn(p.pos.clone().addScaledVector(f, 7.5), 4.8, 0.45, RAGE);
    this.dash(f, 7, 0.38, { hitR: 1.8, dmg: 30 * this.triMul, color: HORN, onEnd: () => {
      off();
      this.pose('slam', 0.4);
      const c = p.pos.clone().addScaledVector(f, 1);
      const dmg = 120 + rk * 30;
      for (const e of this.foes(c, 4.8)) { this.hit(e, pierce(e, dmg), { unblockable: true, stagger: 1.2, knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(14) }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 10); }
      for (const a of [-0.5, 0, 0.5]) this.beatLine(p.pos, dmg * 0.4, 12, true, f.clone().applyAxisAngle(tmp2.set(0, 1, 0), a));
      g.fx.explosion(c, RAGE, 4); g.fx.shockwave(c, HORN, 7); g.fx.screenWave(c.setY(c.y + 1), 1.4, 0.6); g.fx.flash(0xffd0a0, 0.45, 0.2);
      g.shake(1); g.hitStop(0.12); g.audio?.blackFlash(); g.audio?.energy('explode');
    } });
  }
}
registerKit('panda', PandaKit, PANDA_SKILLS);
