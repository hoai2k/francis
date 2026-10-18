// Choso kit — Blood Manipulation.
//   LMB  blood-coated martial arts; the finisher is Blood Edge, a blade of
//        hardened blood along the forearm.
//   RMB  Piercing Blood: compressed blood fired as a near-instant beam that
//        pierces every curse (and crate) in a line.
//   1    Convergence: compress blood between the palms — the next few Piercing
//        Bloods become huge, wall-cutting beams.
//   2    Flowing Red Scale: blood pressure and temperature surge — faster,
//        stronger, tougher, with glowing veins.
//   3    Slicing Exorcism: two spinning discs of blood fly out and back.
//   F    Ultimate (Choso has no canon domain): Supernova — a ring of
//        compressed blood orbs swells around him and bursts one after another,
//        spraying Piercing Blood in every direction.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const BLOOD = 0xd0102a, DARK = 0x5a0410, CORE = 0xffb0b8;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('choso', {
  name: 'Choso', technique: 'Blood Manipulation', rarity: 'epic', title: 'Eldest Brother', color: '#d0102a',
  desc: 'Blood Manipulation: Convergence-charged Piercing Blood, Flowing Red Scale, Blood Edge and Slicing Exorcism — and Supernova, a storm of bursting blood orbs, as his ultimate.',
  ultimate: 'Supernova',
});

registerLook('choso', {
  paint: { skinTone: 0xecc8ae, hair: 0x141216, hairVolume: true, top: 0xe6ded0, kimono: true, sash: 0x3a2048, sleeve: 0xe6ded0, pants: 0x2e2238, shoes: 0x141014, eye: 0x3a1a10, fringe: 2, hairSide: 3, hairBack: 5 },
  hair: (m) => [
    { x: -2.6, y: 8, z: -0.5, w: 2.5, h: 4, d: 2.5, rx: -0.2, rz: 0.6, material: m },   // two spiky tufts
    { x: 2.6, y: 8, z: -0.5, w: 2.5, h: 4, d: 2.5, rx: -0.2, rz: -0.6, material: m },
    { x: 0, y: 8, z: 1.5, w: 5, h: 1.5, d: 3, rx: 0.4, material: m },
  ],
  hairColor: 0x141216, accent: BLOOD, emit: 0.3, cape: null,
  paintExtra(S) {
    // the dark band of blood across the bridge of the nose
    for (let x = 8; x < 16; x++) S.px(x, 13, 0x2a0a10);
    S.px(9, 11, 0x141216); S.px(14, 11, 0x141216);
  },
  props(rig, K) {
    const blood = K.mat(BLOOD, { emissive: 1.2, roughness: 0.2 });
    K.box(rig.handR, 1.4, 1.4, 1.4, blood, 0, -1.5, 1.6);
    K.box(rig.handL, 1.4, 1.4, 1.4, blood, 0, -1.5, 1.6);
  },
});

export const CHOSO_SKILLS = [
  { id: 'piercing', name: 'Piercing Blood', icon: '🩸', desc: 'Longer, stronger beams and Slicing Exorcism discs (and every Piercing Blood technique).', max: 3, req: 'ab:piercing', branch: 'Piercing Blood', tier: 2 },
  { id: 'convergence', name: 'Convergence', icon: '🔴', desc: '+1 empowered shot per Convergence and bigger beams.', max: 2, req: ['piercing', 'ab:convergence'], branch: 'Piercing Blood', tier: 3 },
  { id: 'scale', name: 'Flowing Red Scale', icon: '♨️', desc: 'Red Scale lasts 2s longer and boosts more.', max: 3, req: 'ab:red_scale', branch: 'Red Scale', tier: 2 },
  { id: 'nova', name: 'Supernova', icon: '💥', desc: 'More orbs and bigger bursts in your ultimate.', max: 2, branch: 'Piercing Blood', tier: 5 },
  { id: 'brawl', name: 'Blood Fists', icon: '✊', desc: '+8% melee damage per rank.', max: 3, branch: 'Red Scale', tier: 0 },
  { id: 'womb', name: 'Death Painting', icon: '🫀', desc: '+15 max HP per rank (a Death Painting\'s body is hard to kill).', max: 2, branch: 'Death Painting', tier: 0 },
];

class ChosoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.5, arc: 1.1, lunge: 7, knock: 3, stop: 0.045, shake: 0.14, trail: BLOOD, sparkColor: 0xff5a6a, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 13, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.16, trail: BLOOD, sparkColor: 0xff5a6a, chainAt: 0.55 },
      { style: 'uppercut', dur: 0.38, windup: 0.3, strike: 0.5, dmg: 16, range: 2.6, arc: 1.0, lunge: 5, knock: 5, stop: 0.065, shake: 0.22, trail: BLOOD, launch: true, chainAt: 0.6 },
      { style: 'swingR', dur: 0.5, windup: 0.4, strike: 0.6, dmg: 27, range: 3.4, arc: 1.6, lunge: 6, knock: 9, stop: 0.09, shake: 0.38, stagger: 0.55, trail: BLOOD, edge: true },   // Blood Edge
    ];
    this.p.stats.meleeMult += r('brawl') * 0.08;
    this.p.maxHp += r('womb') * 15; this.p.hp = Math.min(this.p.hp + r('womb') * 15, this.p.maxHp);
    this.branches = ['Piercing Blood', 'Red Scale', 'Blood Arts', 'Death Painting'];
    this.library = {
      // ---- Piercing Blood
      piercing: ability({ name: 'Piercing Blood', icon: '🩸', kind: 'basic', desc: 'Compressed blood fired as a near-instant beam that pierces every curse (and crate) in a line.', cd: 1.1, ce: 0, branch: 'Piercing Blood', tier: 0, start: true, legacy: 'ranged', use: () => this.piercing() }),
      pierce_spread: ability({ name: 'Piercing Blood: Scatter', icon: '🔱', kind: 'basic', desc: 'Three thinner beams fanned out in front of you.', cd: 1.4, ce: 2, branch: 'Piercing Blood', tier: 1, req: 'piercing', use: () => this.pierceSpread() }),
      convergence: ability({ name: 'Convergence', icon: '🔴', kind: 'buff', desc: 'Compress blood between the palms — the next few Piercing Bloods become huge, wall-cutting beams.', cd: 10, ce: 12, branch: 'Piercing Blood', tier: 1, legacy: 't1', use: () => this.convergence() }),
      blood_orb: ability({ name: 'Compressed Blood Orb', icon: '🔮', kind: 'technique', desc: 'Lob a dense orb of compressed blood: it bursts on contact into needles of Piercing Blood in every direction.', cd: 7, ce: 12, branch: 'Piercing Blood', tier: 2, req: 'convergence', use: () => this.bloodOrb() }),
      pierce_sweep: ability({ name: 'Piercing Blood: Sweep', icon: '〽️', kind: 'technique', desc: 'Hold the beam and sweep it across the front for a second, cutting through everything it crosses.', cd: 11, ce: 20, branch: 'Piercing Blood', tier: 3, req: 'blood_orb', use: () => this.pierceSweep() }),
      full_convergence: ability({ name: 'Piercing Blood: Full Convergence', icon: '☄️', kind: 'technique', desc: 'Compress every drop (the line ahead is marked), then fire one colossal beam that tears through curses and walls alike.', cd: 18, ce: 34, branch: 'Piercing Blood', tier: 4, req: 'pierce_sweep', use: () => this.fullConvergence() }),
      // ---- Red Scale
      red_scale: ability({ name: 'Flowing Red Scale', icon: '♨️', kind: 'buff', desc: 'Blood pressure and temperature surge — faster, stronger, tougher, with glowing veins.', cd: 16, ce: 18, branch: 'Red Scale', tier: 1, legacy: 't2', use: () => this.redScale() }),
      blood_dash: ability({ name: 'Red Scale Rush', icon: '💨', kind: 'movement', desc: 'Pump blood to the legs and burst forward, bowling over curses in the way (further under Red Scale).', cd: 5, ce: 6, branch: 'Red Scale', tier: 2, req: 'red_scale', use: () => this.bloodDash() }),
      heavy_blow: ability({ name: 'Red Scale: Heavy Blow', icon: '👊', kind: 'technique', desc: 'Close in and drive a blood-hardened fist through a curse (40% harder under Red Scale).', cd: 7, ce: 10, branch: 'Red Scale', tier: 2, req: 'red_scale', use: () => this.heavyBlow() }),
      red_scale_stack: ability({ name: 'Flowing Red Scale: Stack', icon: '❤️‍🔥', kind: 'buff', desc: 'Push Red Scale past its limit for 8s (costs 8% health): much faster and stronger, techniques included.', cd: 30, ce: 24, branch: 'Red Scale', tier: 3, req: 'heavy_blow', use: () => this.redScaleStack() }),
      eldest_resolve: ability({ name: 'Eldest Brother\'s Resolve', icon: '🛡️', kind: 'buff', desc: 'An older brother does not fall: for 6s nothing can bring you below 1 health, you deal 20% more damage and heal 10%.', cd: 45, ce: 30, branch: 'Red Scale', tier: 4, req: 'red_scale_stack', use: () => this.eldestResolve() }),
      // ---- Blood Arts
      blood_edge: ability({ name: 'Blood Edge', icon: '🗡️', kind: 'basic', desc: 'Two crescent slashes of hardened blood fly off the forearm blade.', cd: 0.9, ce: 0, branch: 'Blood Arts', tier: 1, use: () => this.bloodEdge() }),
      slicing: ability({ name: 'Slicing Exorcism', icon: '⭕', kind: 'technique', desc: 'Two spinning discs of blood fly out and back.', cd: 9, ce: 18, branch: 'Blood Arts', tier: 2, legacy: 't3', req: 'blood_edge', use: () => this.slicing() }),
      meteorite: ability({ name: 'Blood Meteorite', icon: '☄️', kind: 'technique', desc: 'Harden blood into three heavy balls and hurl them in an arc onto the aim; each one bursts where it lands.', cd: 8, ce: 12, branch: 'Blood Arts', tier: 2, req: 'blood_edge', use: () => this.meteorite() }),
      binding: ability({ name: 'Crimson Binding', icon: '🪢', kind: 'technique', desc: 'Ropes of blood lash around every curse in the marked circle: bound for 3s (bosses are slowed).', cd: 13, ce: 16, branch: 'Blood Arts', tier: 3, req: 'slicing', use: () => this.crimsonBinding() }),
      blood_burst: ability({ name: 'Blood Burst', icon: '💥', kind: 'technique', desc: 'Every drop of your blood clinging to curses detonates at once — harder for each blood mark on them.', cd: 12, ce: 20, branch: 'Blood Arts', tier: 4, req: ['binding', 'meteorite'], use: () => this.bloodBurst() }),
      // ---- Death Painting
      blood_wall: ability({ name: 'Hardened Blood Wall', icon: '🧱', kind: 'defence', desc: 'A wall of hardened blood erupts in front of you, shoving curses back; behind it you take 70% less damage for 4s.', cd: 14, ce: 12, branch: 'Death Painting', tier: 1, use: () => this.bloodWall() }),
      blood_pack: ability({ name: 'Blood Pack', icon: '🩹', kind: 'heal', desc: 'Tear open a blood pack and take it in: heal 25% health and restore 15 Cursed Energy.', cd: 28, ce: 0, branch: 'Death Painting', tier: 2, req: 'blood_wall', use: () => this.bloodPack() }),
      bag_burst: ability({ name: 'Blood Pack Burst', icon: '🎯', kind: 'technique', desc: 'Throw a full blood pack and burst it in mid-air at the aim: Piercing Blood needles shoot out in every direction.', cd: 10, ce: 16, branch: 'Death Painting', tier: 3, req: 'blood_pack', use: () => this.bagBurst() }),
      blood_sense: ability({ name: 'Blood Sense', icon: '👁️', kind: 'buff', desc: 'Feel every drop of blood around you: for 8s +15% critical chance and Piercing Blood locks onto the nearest curse.', cd: 22, ce: 12, branch: 'Death Painting', tier: 3, req: 'blood_pack', use: () => this.bloodSense() }),
      brothers_bond: ability({ name: 'For My Brothers', icon: '🫂', kind: 'buff', desc: 'Fight for Eso and Kechizu: for 10s +15% damage, and every curse you kill restores 8% health and 10 Cursed Energy.', cd: 35, ce: 20, branch: 'Death Painting', tier: 4, req: ['bag_burst', 'blood_sense'], use: () => this.brothersBond() }),
    };
    this.passives = {
      toxic_blood: passive({ name: 'Death Painting\'s Blood', icon: '☠️', desc: 'Your blood is poison to curses: every blood hit makes them bleed for 3s.', branch: 'Blood Arts', tier: 2, req: 'blood_edge', apply: (pl, k) => { k.toxic = true; } }),
      blood_bank: passive({ name: 'Blood Bank', icon: '🏦', desc: 'Blood Pack and the Blood Wall recharge 30% faster; Convergence charges one extra shot.', branch: 'Death Painting', tier: 3, req: 'blood_pack', apply: (pl, k) => { k.convBonus = 1; for (const id of ['blood_pack', 'blood_wall']) k.library[id].cd *= 0.7; } }),
      womb_body: passive({ name: 'Cursed Womb Body', icon: '🫀', desc: '+25 max health and 8% damage reduction.', branch: 'Death Painting', tier: 2, req: 'blood_wall', apply: (pl) => { pl.maxHp += 25; pl.hp += 25; pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.08); } }),
      big_brother: passive({ name: 'Big Brother', icon: '🧣', desc: 'Flowing Red Scale lasts 4s longer and heals 10% health when it starts.', branch: 'Red Scale', tier: 3, req: 'red_scale', apply: (pl, k) => { k.scaleBonus = 4; } }),
    };
    this.conv = 0; this.scaleT = 0;
    this.ultimate = { name: 'Supernova', icon: '💥', use: () => this.supernova() };
  }
  onMeleeHit(e, step) {
    const g = this.game;
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
    g.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOD);
    if (step.edge) g.fx.slashLine(e.pos.clone().add(new THREE.Vector3(-1.1, e.height * 0.9, 0)), new THREE.Vector3(1, -0.6, Math.random() - 0.5).normalize(), 2.6, BLOOD, 0.35, 0.2, Math.random());
  }
  onIncoming(amount, src, o) {
    amount = super.onIncoming(amount, src, o); if (amount <= 0) return 0;
    if (this.buffs.has('eldest')) amount = Math.min(amount, Math.max(0, this.p.hp - 1));
    return this.scaleT > 0 ? amount * (0.75 - this.rank('scale') * 0.04) : amount;
  }
  // ------------------------------------------------------------ Piercing Blood
  piercing() {
    const g = this.game, p = this.p;
    const big = this.conv > 0, rk = this.rank('piercing'), cv = this.rank('convergence');
    if (big) this.conv--;
    this.cast(big ? 0.4 : 0.28, true);
    let dir = p.aimDir.clone();
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const sensed = !sure && this.buffs.has('blood_sense') ? g.nearestEnemy(p.pos, 18) : null;
    if (sure || sensed) dir = tmp2.subVectors((sure ?? sensed).pos, p.pos).setY(0).normalize().clone();
    p.facing = Math.atan2(dir.x, dir.z);
    const L = (big ? 26 : 15) + rk * 2, W = big ? 1.1 + cv * 0.25 : 0.5, dmg = (big ? 55 + cv * 15 : 15) + rk * 5;
    const from = p.pos.clone().setY(p.pos.y + 1.3).addScaledVector(dir, 0.7);
    // the beam: a dark wake, a red body and a pale compressed core
    g.fx.slashLine(from, dir, L, DARK, W * 2.2, 0.35, 0);
    g.fx.slashLine(from, dir, L, BLOOD, W * 1.4, 0.3, 0);
    g.fx.slashLine(from, dir, L, CORE, W * 0.5, 0.22, 0);
    g.fx.slashLine(from, dir, L, BLOOD, W * 1.2, 0.3, Math.PI / 2);
    for (let s = 0.5; s < L; s += big ? 0.7 : 1.1) g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: big ? 3 : 1, color: BLOOD, speed: big ? 3 : 1.2, life: 0.35, size: big ? 0.2 : 0.1, shape: 1, intensity: 2 });
    g.fx.rings.spawn(from, { color: BLOOD, r0: 0.2, r1: big ? 2 : 0.9, dur: 0.2, thick: 0.3, tilt: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir) });
    g.lights.flash(from.clone().addScaledVector(dir, 3), BLOOD, big ? 14 : 5, big ? 14 : 7, 0.2);
    let hit = 0;
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, p.pos); const along = tmp.dot(dir);
      if (along < 0 || along > L) continue;
      if (Math.abs(tmp.x * dir.z - tmp.z * dir.x) > W + e.radius) continue;
      g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().multiplyScalar(big ? 7 : 2), stagger: big ? 0.8 : 0.3, unblockable: big });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), dir, { color: BLOOD, big });
      hit++;
    }
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y), dir, big ? 1.4 : 0.6, Math.PI, big ? 40 : 14, p);
    if (big) { g.shake(0.45); g.hitStop(0.05); g.fx.screenWave(from, 0.6, 0.3); g.audio?.energy('red'); }
    else { if (hit) g.shake(0.1); g.audio?.energy('slash'); }
    g.audio?.tone({ freq: big ? 300 : 900, to: big ? 80 : 300, dur: 0.18, gain: 0.1, type: 'sawtooth', filter: 2500 });
  }
  convergence() {
    const g = this.game, p = this.p;
    this.cast(0.55, true, { lock: true });
    g.audio?.charge(0.5, 0.9);
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      const h = this.handPos();
      for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, rr = 1.2 + Math.random(); g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.5) * 1.2, h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 4, 0, -Math.sin(a) * rr * 4, 0.25, 2.2, 0.08, 0.15, 0.12, 0, 0, 0.3, 1); }
      if (t < 0.5) return true;
      this.conv = 3 + this.rank('convergence') + (this.convBonus ?? 0);
      g.particles.burst(h, { count: 20, color: BLOOD, speed: 6, life: 0.4, size: 0.12, shape: 1 });
      g.fx.flash(0x400008, 0.18, 0.15);
      g.toast?.(`Convergence ×${this.conv}`);
      g.audio?.impact(0.8);
      return false;
    });
  }
  redScale() {
    const g = this.game, p = this.p, rk = this.rank('scale');
    const fresh = this.scaleT <= 0;
    this.scaleT = 8 + rk * 2 + (this.scaleBonus ?? 0);
    if (fresh && this.scaleBonus) p.healOverTime = { left: p.maxHp * 0.1, t: 1 };
    if (fresh) { this.boost = { as: 1.3 + rk * 0.05, mm: 0.25 + rk * 0.05 }; p.stats.attackSpeed *= this.boost.as; p.stats.meleeMult += this.boost.mm; this.speedMul = 1.3; }
    this.cast(0.4, true, { type: 'raise' });
    g.toast?.('Flowing Red Scale');
    g.fx.flash(0x500010, 0.25, 0.2);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: BLOOD, r0: 0.4, r1: 3.5, dur: 0.45, thick: 0.15 });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 30, color: BLOOD, speed: 5, up: 1.5, life: 0.6, size: 0.12, shape: 1 });
    g.audio?.energy('fire');
  }
  tick(dt) {
    const g = this.game, p = this.p;
    this.bleedTick(dt);
    if (this.scaleT > 0) {
      this.scaleT -= dt;
      p.rig.material.userData.emitMask.value = 0.9 + Math.sin(g.time * 9) * 0.3;   // pulsing veins
      p.rig.setGlow?.(0x3a0006);
      if (Math.random() < 0.6) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.7, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.7, 0, 1.4, 0, 0.5, 2.2, 0.1, 0.15, 0.12, -1, 1, 0.1, 0);
      if (this.scaleT <= 0) {
        p.stats.attackSpeed /= this.boost.as; p.stats.meleeMult -= this.boost.mm; this.speedMul = 1;
        p.rig.material.userData.emitMask.value = 0.3; p.rig.setGlow?.(0x000000);
      }
    }
    if (this.conv > 0 && Math.random() < 0.5) { const h = this.handPos(); g.particles.glow.emit(h.x, h.y, h.z, (Math.random() - 0.5), 0.5, (Math.random() - 0.5), 0.3, 2.4, 0.1, 0.2, 0.08 + this.conv * 0.03, 0, 1, 0.3, 0); }
  }
  // ------------------------------------------------------------ blood marks
  // Every blood technique leaves blood on the curse (Blood Burst detonates it;
  // with Death Painting's Blood it also makes the curse bleed).
  onHitEnemy(e, dealt, o) {
    if (o?.noMark || e.dead) return;
    e.chosoBlood = Math.min(6, (e.chosoBlood ?? 0) + 1);
    if (this.toxic) e.chosoBleedT = 3;
  }
  onKill() {
    if (!this.buffs.has('brothers')) return;
    const p = this.p;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.08); p.gainCE(10);
    this.game.fx.heal(p.pos, BLOOD);
  }
  bleedTick(dt) {
    const g = this.game;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (e.chosoBleedT > 0) {
        e.chosoBleedT -= dt; e.chosoBleedAcc = (e.chosoBleedAcc ?? 0) + dt;
        if (e.chosoBleedAcc >= 0.5) { e.chosoBleedAcc = 0; this.hit(e, 3 + this.rank('piercing'), { noMark: true, stagger: 0, crit: false, ceGain: 0, color: '#a0102a' }); if (!e.dead) g.particles.burst(e.pos.clone().setY(e.pos.y + e.height * 0.5), { count: 3, color: BLOOD, speed: 1.5, life: 0.4, size: 0.08, gravity: 12, shape: 1 }); }
      }
      if (e.chosoBlood > 0 && Math.random() < 0.02) g.particles.burst(e.pos.clone().setY(e.pos.y + e.height * (0.3 + Math.random() * 0.5)), { count: 1, color: DARK, speed: 0.4, life: 0.5, size: 0.08, gravity: 10, shape: 1 });
    }
  }
  // a quick Piercing Blood beam along dir (from the hand)
  beam(dir, L, W, dmg, o = {}) {
    const g = this.game, p = this.p;
    const from = p.pos.clone().setY(p.pos.y + 1.3).addScaledVector(dir, 0.7);
    g.fx.slashLine(from, dir, L, DARK, W * 2.2, o.dur ?? 0.3, 0);
    g.fx.slashLine(from, dir, L, BLOOD, W * 1.4, o.dur ?? 0.26, 0);
    g.fx.slashLine(from, dir, L, CORE, W * 0.5, o.dur ?? 0.2, 0);
    if (o.particles !== false) for (let s = 0.5; s < L; s += 1.4) g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: 1, color: BLOOD, speed: 1.2, life: 0.3, size: 0.1, shape: 1, intensity: 2 });
    const hitList = [];
    this.line(p.pos, dir, L, W, (e) => {
      if (o.filter && !o.filter(e)) return;
      hitList.push(e);
      if (dmg > 0) this.hit(e, dmg, { knock: dir.clone().multiplyScalar(o.knock ?? 2), stagger: o.stagger ?? 0.3, unblockable: !!o.unblockable });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), dir, { color: BLOOD, big: !!o.big });
    });
    if (o.blocks) for (let s = 1; s < L; s += 1) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y), dir, o.blockR ?? 0.6, Math.PI, o.blocks, p);
    return hitList;
  }
  // ------------------------------------------------------------ Piercing Blood (more)
  pierceSpread() {
    const g = this.game, p = this.p, rk = this.rank('piercing');
    this.cast(0.3, true);
    const base = this.aimAngle();
    for (const off of [-0.2, 0, 0.2]) this.beam(new THREE.Vector3(Math.sin(base + off), 0, Math.cos(base + off)), 13 + rk, 0.35, 10 + rk * 3, { blocks: 10 });
    g.audio?.energy('slash');
    g.audio?.tone({ freq: 1000, to: 350, dur: 0.15, gain: 0.08, type: 'sawtooth', filter: 2500 });
  }
  bloodOrb() {
    const g = this.game, p = this.p, rk = this.rank('piercing');
    this.cast(0.35, true);
    let done = false;
    const pop = (at) => { if (done) return; done = true; this.burst(at, 2.8, 40 + rk * 10); g.shake(0.3); };
    this.shoot({ speed: 15, color: BLOOD, emissive: 3, scale: 2.4, radius: 0.55, life: 0.9, light: 4,
      trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color: BLOOD, speed: 0.5, life: 0.3, size: 0.25, sizeEnd: 0.05 }); },
      onHit: (e, q) => pop(q.pos.clone()), onExpire: (q) => pop(q.pos.clone()) });
    g.audio?.charge(0.2, 1.6);
  }
  pierceSweep() {
    const g = this.game, p = this.p, rk = this.rank('piercing');
    this.cast(1.05, true, { lock: true, moveScale: 0 });
    const base = this.aimAngle(), hits = new Map(), L = 15 + rk * 2;
    g.audio?.noise({ dur: 1.0, gain: 0.25, type: 'bandpass', freq: 1800, sweep: 600, q: 2 });
    let acc = 0;
    this.during(1, (t, dt, k) => {
      if (p.dead) return false;
      acc += dt; if (acc < 0.05) return; acc = 0;
      const a = base - 0.85 + k * 1.7; p.facing = a;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      this.beam(dir, L, 0.5, 0, { dur: 0.09, particles: false, filter: (e) => { if (g.time - (hits.get(e) ?? -9) < 0.25) return false; hits.set(e, g.time); return true; }, blocks: 12 });
      for (const [e, tt] of hits) if (tt === g.time && !e.dead) this.hit(e, 11 + rk * 3, { stagger: 0.3 });
    });
  }
  fullConvergence() {
    const g = this.game, p = this.p, rk = this.rank('piercing'), cv = this.rank('convergence');
    const dir = this.fwd(), L = 32, W = 1.8 + cv * 0.2;
    this.cast(1.25, true, { lock: true, moveScale: 0 });
    p.facing = Math.atan2(dir.x, dir.z);
    g.audio?.charge(0.9, 0.7);
    for (let s = 2; s <= L; s += 2.5) { const c = p.pos.clone().addScaledVector(dir, s); c.y = this.groundAt(c.x, c.z, p.pos.y) + 0.07; g.fx.rings.spawn(c, { color: BLOOD, r0: W, r1: W * 0.9, dur: 0.9, thick: 0.08 }); }
    this.during(0.9, () => { const h = this.handPos(); for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, rr = 1.5 + Math.random(); g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.5) * 1.5, h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 4, 0, -Math.sin(a) * rr * 4, 0.25, 2.2, 0.08, 0.15, 0.16, 0, 0, 0.3, 1); } });
    this.after(0.9, () => {
      if (p.dead) return;
      this.beam(dir, L, W, 120 + rk * 25 + cv * 20, { big: true, unblockable: true, knock: 10, stagger: 1.2, dur: 0.5, blocks: 80, blockR: 1.6 });
      const from = p.pos.clone().setY(p.pos.y + 1.3);
      g.fx.slashLine(from, dir, L, BLOOD, W * 1.6, 0.45, Math.PI / 2);
      g.fx.rings.spawn(from, { color: BLOOD, r0: 0.3, r1: 3, dur: 0.3, thick: 0.4, tilt: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir) });
      g.lights.flash(from.clone().addScaledVector(dir, 5), BLOOD, 24, 18, 0.35, { priority: 6 });
      g.fx.flash(0x500010, 0.3, 0.2); g.fx.screenWave(from, 1, 0.4); g.fx.chroma(1);
      g.shake(0.7); g.hitStop(0.08); g.audio?.energy('red'); g.audio?.impact(2, 'crit');
    });
  }
  // ------------------------------------------------------------ Red Scale (more)
  bloodDash() {
    const g = this.game, p = this.p;
    const dist = this.scaleT > 0 ? 10 : 7.5;
    this.dash(this.fwd(), dist, 0.26, { hitR: 1.5, dmg: 14 + this.rank('brawl') * 4, color: BLOOD,
      onHit: (e) => g.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOD) });
    g.audio?.whoosh(1.1);
  }
  heavyBlow() {
    const g = this.game, p = this.p, t = this.target(7);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, BLOOD);
    this.pose('punch', 0.35);
    this.after(0.1, () => {
      if (t.dead) return;
      const at = t.pos.clone().setY(t.pos.y + t.height * 0.6);
      this.hit(t, (50 + this.rank('brawl') * 10) * (this.scaleT > 0 ? 1.4 : 1), { melee: true, stagger: 1, unblockable: true, knock: tmp.subVectors(t.pos, p.pos).setY(0).normalize().multiplyScalar(t.isBoss ? 4 : 14) });
      g.fx.hitSpark(at, null, { color: BLOOD, big: true }); g.fx.splat(at, BLOOD);
      g.fx.shockwave(t.pos, BLOOD, 2.5, 0.3);
      g.hitStop(0.08); g.shake(0.45); g.audio?.impact(1.8, 'crit');
    });
  }
  redScaleStack() {
    const g = this.game, p = this.p;
    if (this.buffs.has('rs_stack')) { g.toast?.('Already stacked'); g.audio?.ui('back'); return false; }
    if (this.scaleT <= 0) this.redScale();
    const cost = Math.min(p.hp - 1, p.maxHp * 0.08);
    if (cost > 0) { p.hp -= cost; g.fx.damageNumber(p.pos, cost, { color: '#ff4a5a', text: `-${Math.round(cost)} 🩸` }); }
    this.cast(0.4, true, { type: 'raise' });
    this.statBuff('rs_stack', 8, { attackSpeed: 0.35, meleeMult: 0.4, techMult: 0.25 }, {
      onTick: () => { if (Math.random() < 0.7) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.9, p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5) * 0.9, 0, 2.4, 0, 0.45, 2.6, 0.12, 0.2, 0.16, -1, 1, 0.1, 0); } });
    g.toast?.('❤️‍🔥 Flowing Red Scale: Stack', 'big');
    g.fx.flash(0x700010, 0.35, 0.25); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 0.6, 0.4);
    for (let i = 0; i < 3; i++) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1 + i * 0.6, p.pos.z), { color: BLOOD, r0: 0.4, r1: 3 + i, dur: 0.45 + i * 0.1, thick: 0.15 });
    g.audio?.energy('fire'); g.audio?.charge(0.3, 1.2);
  }
  eldestResolve() {
    const g = this.game, p = this.p;
    this.cast(0.45, true, { type: 'raise' });
    p.healOverTime = { left: p.maxHp * 0.1, t: 1 };
    this.statBuff('eldest', 6, { damage: 0.2 }, { onTick: () => { if (Math.random() < 0.4) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 1.2, 0, 0.6, 2.2, 0.3, 0.3, 0.14, 0, 1, 0.1, 0); } });
    g.toast?.('🛡️ "I\'m the eldest brother — I won\'t fall."', 'big');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: BLOOD, r0: 0.4, r1: 4, dur: 0.5, thick: 0.2 });
    g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), BLOOD, 10, 8, 0.5);
    g.audio?.energy('infinity');
  }
  // ------------------------------------------------------------ Blood Arts (more)
  bloodEdge() {
    const g = this.game, p = this.p, rk = this.rank('brawl');
    this.cast(0.28);
    const base = this.aimAngle();
    [-0.12, 0.12].forEach((off, i) => this.after(i * 0.08, () => {
      const a = base + off, vel = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(26);
      g.projectiles.fire({ pos: this.handPos(), vel, team: 'player', shape: 'slash', color: BLOOD, emissive: 2.5, scale: 1, radius: 0.6, life: 0.42, pierce: true,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: BLOOD, speed: 0.4, life: 0.2, size: 0.12, shape: 1 }); },
        onHit: (e, q) => { this.hit(e, 14 + rk * 3, { stagger: 0.3, knock: q.vel.clone().setY(0).setLength(2) }); g.fx.splat(q.pos, BLOOD); } });
      g.audio?.energy('slash');
    }));
  }
  meteorite() {
    const g = this.game, p = this.p, rk = this.rank('piercing');
    const c = this.aimGround(11);
    this.cast(0.4, true);
    const T = 0.6, G = 20;
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + Math.random(), rr = i ? 1.6 : 0;
      const at = new THREE.Vector3(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr);
      g.fx.rings.spawn(tmp.set(at.x, at.y + 0.07, at.z), { color: BLOOD, r0: 2, r1: 1.8, dur: T + i * 0.08, thick: 0.08 });
      this.after(i * 0.08, () => {
        const from = this.handPos();
        const vel = new THREE.Vector3((at.x - from.x) / T, ((at.y + 0.3 - from.y) + 0.5 * G * T * T) / T, (at.z - from.z) / T);
        let done = false;
        const pop = (q) => { if (done) return; done = true; const hp = q.pos.clone(); g.fx.explosion(hp, BLOOD, 1.6); g.combat.aoe(hp, 2, 26 + rk * 6, p, { knock: 5, stagger: 0.5 }); g.fx.splat(hp, BLOOD); g.shake(0.2); g.audio?.impact(1.2); };
        g.projectiles.fire({ pos: from, vel, team: 'player', shape: 'orb', color: DARK, emissive: 1.5, scale: 1.8, radius: 0.5, gravity: G, life: T + 0.25, light: 2,
          trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: BLOOD, speed: 0.4, life: 0.3, size: 0.2, sizeEnd: 0.04 }); },
          onHit: (e, q) => pop(q), onExpire: (q) => pop(q) });
      });
    }
    g.audio?.whoosh(1);
  }
  crimsonBinding() {
    const g = this.game, p = this.p, R = 3.6;
    const c = this.aimGround(10);
    this.cast(0.4, true);
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: BLOOD, r0: R, r1: R * 0.96, dur: 0.35, thick: 0.12 });
    this.after(0.25, () => {
      const list = this.foes(c, R);
      for (const e of list) {
        this.hit(e, 12, { stagger: 0.6 });
        if (e.isBoss) { this.slow(e, 3); e.cancelAttack?.(); } else this.stun(e, 3);
        e.chosoBlood = Math.min(6, (e.chosoBlood ?? 0) + 1);
        // blood ropes lash around the curse
        for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; const s = e.pos.clone().add(new THREE.Vector3(Math.cos(a) * 1.4, 0.1, Math.sin(a) * 1.4)); g.fx.slashLine(s, tmp.subVectors(e.pos.clone().setY(e.pos.y + e.height * (0.3 + k * 0.15)), s).normalize().clone(), 1.6, k % 2 ? BLOOD : DARK, 0.16, 0.6); }
        for (let k = 0; k < 3; k++) g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.3 + k * e.height * 0.3, e.pos.z), { color: BLOOD, r0: (e.radius ?? 0.5) + 0.5, r1: (e.radius ?? 0.5) + 0.2, dur: 3, thick: 0.08 });
      }
      g.audio?.energy('slash'); g.shake(0.2);
      if (!list.length) g.toast?.('Nothing to bind');
    });
  }
  bloodBurst() {
    const g = this.game, p = this.p;
    const list = g.enemies.filter((e) => !e.dead && (e.chosoBlood ?? 0) > 0 && e.pos.distanceTo(p.pos) < 18);
    if (!list.length) { g.toast?.('None of your blood is on a curse'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    g.fx.flash(0x400008, 0.2, 0.15);
    list.forEach((e, i) => this.after(i * 0.04, () => {
      if (e.dead) return;
      const n = e.chosoBlood ?? 1; e.chosoBlood = 0;
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
      this.hit(e, 12 + n * 10 + this.rank('piercing') * 4, { unblockable: true, stagger: 0.8, noMark: true, color: '#ff3a4a' });
      g.fx.explosion(at, BLOOD, 0.8 + n * 0.25);
      g.particles.burst(at, { count: 8 + n * 3, color: BLOOD, speed: 6, life: 0.5, size: 0.12, gravity: 14, shape: 1 });
      g.audio?.impact(1 + n * 0.1);
    }));
    g.shake(0.35);
  }
  // ------------------------------------------------------------ Death Painting
  bloodWall() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const dir = this.fwd(), face = Math.atan2(dir.x, dir.z);
    const at = p.pos.clone().addScaledVector(dir, 1.6); at.y = this.groundAt(at.x, at.z, p.pos.y);
    const geo = new THREE.BoxGeometry(3.4, 2.4, 0.4);
    const mat = new THREE.MeshStandardNodeMaterial({ color: 0x8a0a1c, emissive: BLOOD, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.2 });
    const wall = new THREE.Mesh(geo, mat); wall.castShadow = true;
    wall.position.set(at.x, at.y - 1.2, at.z); wall.rotation.y = face;
    g.scene.add(wall);
    for (const e of this.foes(at, 2.2)) this.hit(e, 16, { stagger: 0.7, knock: dir.clone().multiplyScalar(e.isBoss ? 3 : 12) });
    g.particles.burst(at.clone().setY(at.y + 0.4), { count: 20, color: BLOOD, speed: 5, up: 1.5, life: 0.5, size: 0.12, gravity: 14, shape: 1 });
    g.audio?.impact(1.2);
    this.buff('blood_wall', 4, {
      incoming: (amt) => (p.pos.distanceTo(wall.position) < 3.6 ? amt * 0.3 : amt),
      onTick: (dt, b) => {
        const t = b.dur - b.left;
        wall.position.y = at.y + Math.min(1.2, -1.2 + t * 16);
        if (b.left < 0.3) wall.scale.y = Math.max(0.01, b.left / 0.3);
      },
      onEnd: () => { g.scene.remove(wall); geo.dispose(); mat.dispose(); g.particles.burst(at.clone().setY(at.y + 1), { count: 14, color: DARK, speed: 3, life: 0.5, size: 0.12, gravity: 14, shape: 1 }); } });
  }
  bloodPack() {
    if (this.rctHeal(0.25, 1.5, BLOOD) === false) return false;
    this.p.gainCE(15);
    this.game.toast?.('🩹 Blood pack');
  }
  bagBurst() {
    const g = this.game, p = this.p, rk = this.rank('piercing');
    const c = this.aimGround(11); c.y += 1.2;
    this.cast(0.35);
    const T = 0.45, G = 16, from = this.handPos();
    const vel = new THREE.Vector3((c.x - from.x) / T, ((c.y - from.y) + 0.5 * G * T * T) / T, (c.z - from.z) / T);
    g.fx.rings.spawn(tmp.set(c.x, c.y - 1.15, c.z), { color: BLOOD, r0: 6, r1: 5.8, dur: T, thick: 0.08 });
    let done = false;
    const pop = (q) => {
      if (done) return; done = true;
      const at = q.pos.clone();
      g.fx.explosion(at, BLOOD, 1.2); g.fx.splat(at, BLOOD);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
        g.fx.slashLine(at, d, 6, i % 2 ? BLOOD : CORE, 0.2, 0.3);
        this.line(at.clone().setY(at.y - 1.2), d, 6, 0.45, (e) => { this.hit(e, 18 + rk * 4, { stagger: 0.3, knock: d.clone().multiplyScalar(2) }); });
      }
      g.shake(0.3); g.audio?.energy('explode');
    };
    g.projectiles.fire({ pos: from, vel, team: 'player', shape: 'cube', color: 0xa0101e, emissive: 1.2, scale: 1.4, radius: 0.4, gravity: G, life: T, ghost: true, onExpire: (q) => pop(q) });
    g.audio?.whoosh(0.8);
  }
  bloodSense() {
    const g = this.game, p = this.p;
    this.cast(0.35);
    this.statBuff('blood_sense', 8, { crit: 0.15 }, { onTick: () => { if (Math.random() < 0.08) for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < 18) g.particles.glow.emit(e.pos.x, e.pos.y + e.height + 0.3, e.pos.z, 0, 0.3, 0, 0.5, 2.4, 0.1, 0.2, 0.12, 0, 1, 0.5, 1); } });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: BLOOD, r0: 0.4, r1: 18, dur: 0.8, thick: 0.08 });
    g.toast?.('👁️ Blood Sense');
    g.audio?.energy('infinity');
  }
  brothersBond() {
    const g = this.game, p = this.p;
    this.cast(0.45, true, { type: 'raise' });
    this.statBuff('brothers', 10, { damage: 0.15 }, { onTick: () => { if (Math.random() < 0.3) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 1, 0, 0.6, 2.2, 0.2, 0.3, 0.12, 0, 1, 0.1, 0); } });
    g.toast?.('🫂 "Eso. Kechizu. Watch your big brother."', 'big');
    g.fx.flash(0x400010, 0.2, 0.2);
    for (let i = 0; i < 2; i++) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1 + i * 0.5, p.pos.z), { color: i ? 0x3a8a3a : BLOOD, r0: 0.4, r1: 3.5, dur: 0.5, thick: 0.15 });
    g.audio?.energy('infinity');
  }
  // ------------------------------------------------------------ Slicing Exorcism
  // Two spinning discs of blood fly out in arcs and come back to Choso.
  slicing() {
    const g = this.game, p = this.p, rk = this.rank('piercing');
    this.cast(0.4, true);
    const face = Math.atan2(p.aimDir.x, p.aimDir.z);
    p.facing = face;
    const geo = new THREE.TorusGeometry(0.55, 0.07, 4, 24);
    const mat = new THREE.MeshBasicNodeMaterial({ color: BLOOD, fog: false });
    const core = new THREE.MeshBasicNodeMaterial({ color: CORE, fog: false });
    const discs = [-1, 1].map((side) => {
      const d = new THREE.Group();
      const ring = new THREE.Mesh(geo, mat); ring.rotation.x = Math.PI / 2; d.add(ring);
      const inner = new THREE.Mesh(geo, core); inner.rotation.x = Math.PI / 2; inner.scale.setScalar(0.6); d.add(inner);
      g.scene.add(d);
      return { d, side, hit: new Map() };
    });
    const L = 9 + rk, dmg = 18 + rk * 5, T = 1.1;
    const origin = p.pos.clone();
    let t = 0;
    g.audio?.whoosh(1.2);
    g.addUpdater((dt) => {
      t += dt;
      const k = Math.min(1, t / T);
      const out = Math.sin(k * Math.PI);                     // out and back
      for (const D of discs) {
        const a = face + D.side * (0.9 - k * 1.8) * 0.6;     // sweep across the front
        const base = tmp2.copy(origin).lerp(p.pos, k);
        D.d.position.set(base.x + Math.sin(a) * L * out, p.pos.y + 1.1, base.z + Math.cos(a) * L * out);
        D.d.rotation.y += dt * 30;
        if (Math.random() < 0.6) g.particles.burst(D.d.position, { count: 1, color: BLOOD, speed: 0.6, life: 0.3, size: 0.12, shape: 1 });
        for (const e of g.combat.query(D.d.position, tmp.set(0, 0, 1), 0.9, Math.PI)) {
          if (g.time - (D.hit.get(e) ?? -9) < 0.35) continue;
          D.hit.set(e, g.time);
          g.combat.damageEnemy(e, dmg, p, { stagger: 0.4, unblockable: true, knock: tmp2.subVectors(e.pos, D.d.position).setY(0).normalize().multiplyScalar(3) });
          g.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOD);
          g.audio?.energy('slash');
        }
      }
      if (k < 1) return true;
      for (const D of discs) g.scene.remove(D.d);
      geo.dispose(); mat.dispose(); core.dispose();
      return false;
    });
  }
  // ------------------------------------------------------------ Ultimate: Supernova
  burst(at, R, dmg) {
    const g = this.game, p = this.p;
    g.fx.explosion(at, BLOOD, R);
    g.combat.aoe(at, R, dmg, p, { knock: 6, stagger: 0.6 });
    // shrapnel of piercing blood in every direction
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.random() * 0.3, d = new THREE.Vector3(Math.cos(a), (Math.random() - 0.3) * 0.4, Math.sin(a)).normalize();
      g.fx.slashLine(at, d, R * 1.8, i % 2 ? BLOOD : CORE, 0.18, 0.25);
      for (const e of g.combat.query(at, d, R * 1.8, 0.2)) g.combat.damageEnemy(e, dmg * 0.25, p, { stagger: 0.2, ceGain: 0 });
    }
    g.audio?.energy('explode');
  }
  // Blood compressed into orbs all around Choso, which then burst, spraying
  // Piercing Blood in every direction.
  supernova() {
    const g = this.game, p = this.p, rk = this.rank('nova');
    const n = 16 + rk * 4, R = 3.2 + rk * 0.5, dmg = 55 + rk * 15;
    p.action = { type: 'sign', dur: 1.2, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes ?? 0, 1.6);
    g.slowMo(1.1, 0.25); g.fx.dimTarget = 0.55;
    g.toast?.('SUPERNOVA', 'domain');
    g.audio?.charge(1.1, 0.7);
    g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), BLOOD, 10, 12, 1.2, { priority: 7 });
    const foes = g.enemies.filter((e) => !e.dead && !e.isDummy && e.pos.distanceTo(p.pos) < 18);
    const orbs = [];
    for (let i = 0; i < n; i++) {
      const pr = g.projectiles.fire({ pos: p.pos.clone().setY(p.pos.y + 1.4), vel: new THREE.Vector3(), team: 'player', shape: 'orb', color: BLOOD, emissive: 3, scale: 2, radius: 0.6, life: 99, ghost: true, light: i % 4 === 0 ? 5 : 0,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: BLOOD, speed: 0.5, life: 0.3, size: 0.3, sizeEnd: 0.05 }); },
        onExpire: (q) => this.burst(q.pos.clone(), R, dmg) });
      if (pr) orbs.push({ q: pr, a: i / n * Math.PI * 2, h: 0.6 + (i % 3) * 0.9, target: foes.length && i % 2 === 0 ? foes[(i / 2) % foes.length | 0] : null });
    }
    if (!orbs.length) { if (p.action?.type === 'sign') p.action = null; g.fx.dimTarget = 0; return false; }
    let t = 0, popped = 0;
    const center = p.pos.clone();
    g.addUpdater((dt) => {
      t += dt;
      // compress: orbs gather and swell around Choso, then fan out toward curses
      const spread = t < 0.7 ? 1.5 : 1.5 + (t - 0.7) * 9;
      orbs.forEach((o) => {
        if (o.done) return;
        const ring = tmp.set(center.x + Math.cos(o.a + t * 2.5) * Math.min(spread, 7), center.y + o.h + Math.sin(t * 6 + o.a) * 0.15, center.z + Math.sin(o.a + t * 2.5) * Math.min(spread, 7));
        if (o.target && !o.target.dead && t > 0.7) ring.lerp(tmp2.copy(o.target.pos).setY(o.target.pos.y + o.target.height * 0.5), Math.min(1, (t - 0.7) * 2.2));
        o.q.pos.copy(ring); o.q.t = 0;
      });
      if (t > 0.7 && p.action?.type === 'sign') { p.action = null; g.fx.dimTarget = 0; }
      if (t < 1.25) return true;
      // detonate one after another
      const due = Math.min(orbs.length, Math.floor((t - 1.25) / 0.04) + 1);
      for (; popped < due; popped++) { const o = orbs[popped]; o.done = true; o.q.life = 0; }
      if (popped === 1) { g.fx.flash(0xff2030, 0.5, 0.3); g.fx.screenWave(center.clone().setY(center.y + 1), 1.6, 0.8); g.fx.chroma(1.4); }
      g.shake(0.25);
      if (popped < orbs.length) return true;
      g.shake(0.9); g.hitStop(0.1);
      g.fx.darkRings.spawn(tmp.set(center.x, center.y + 0.07, center.z), { color: 0x000000, r0: 0.5, r1: 9, dur: 0.7, thick: 0.5 });
      return false;
    });
  }
  dispose() { super.dispose(); this.scaleT = 0; this.speedMul = 1; }
}
registerKit('choso', ChosoKit, CHOSO_SKILLS);
