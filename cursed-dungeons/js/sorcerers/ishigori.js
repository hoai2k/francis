// Ryu Ishigori-style kit — Granite Blast (the Heian sorcerer with the
// greatest cursed-energy output, pompadour and all). 20 abilities on the
// technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB        a brawler's haymakers wrapped in raw cursed energy.
//   Output     Cursed Energy Blast (start, RMB), Rapid Fire, Granite Blast,
//              Scatter Blast, Blast Barrage, Overload
//   Cannon     Fingertip Cannon, Recoil Jump, Recoil Dash, Ground Blast
//   Brawler    Pompadour Charge, Output Haymaker, Granite Suplex, Output Guard
//   Rock'n'Roll Hungry for a Fight, Spinning Output, Roar, Second Wind,
//              Meteor Drop, Big Bang
//   F          Ultimate: Granite Blast: Maximum Output (no canon domain) — every
//              drop of his output poured into one beam that ends in a crater.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { GEO, glow, mat, temp, mesh, beam, meshShot, pull, sigil, aimAt, makeOrb } from './fxlib.js';

const BLAST = 0x5ac8ff, CORE = 0xe8f8ff, HOT = 0x8a6aff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('ishigori', { name: 'Ishigori', technique: 'Granite Blast', rarity: 'rare', title: 'Heian-era Brawler', desc: 'Huge cursed-energy output: blasts, barrages and recoil jumps, a pompadour charge and the colossal Granite Blast.', ultimate: 'Granite Blast: Maximum Output', color: '#5ac8ff' });

registerLook('ishigori', {
  paint: { skinTone: 0xe8bc94, hair: 0x101010, hairVolume: true, top: 0x15151c, collar: 0x15151c, topTrim: 0x0a0a10, buttons: 0xd8b040, sleeve: 0x15151c, pants: 0x15151c, shoes: 0x0a0a0a, eye: 0x2a1a10, fringe: 1, hairSide: 2, hairBack: 4 },
  paintExtra(S) {
    // a wide grin and heavy brows
    S.mat = 'skin'; S.rect(10, 14, 4, 1, 0xf0f0f0, 0.05); S.fineRect(10, 14.5, 4, 0.5, 0x8a4a3a, 'skin');
    S.mat = 'hair'; S.rect(9, 11, 2, 1, 0x101010, 0.05); S.rect(13, 11, 2, 1, 0x101010, 0.05);
    // the open collar of the long gakuran
    S.mat = 'cloth'; S.rect(22, 20, 4, 3, 0xe8bc94, 0.05);
  },
  hair: (m) => [
    // the towering pompadour
    { x: 0, y: 8, z: 0.5, w: 8, h: 2.5, d: 7, material: m },
    { x: 0, y: 9.5, z: 3, w: 7, h: 3, d: 5, rx: 0.5, material: m },
    { x: 0, y: 10.5, z: 6, w: 6, h: 2.5, d: 3, rx: 0.9, material: m },
    { x: 0, y: 6, z: -3.6, w: 8, h: 4, d: 2, hang: true, material: m, stiff: 50 },
  ],
  hairColor: 0x101010, accent: BLAST, emit: 0.1,
  cape: { color: 0x15151c, segments: 3, length: 12, width: 9 },   // the long coat's tails
  scale: 1.34,
  props(rig, K) {
    const glowM = K.mat(BLAST, { emissive: 2.5 });
    K.box(rig.handR, 1.6, 1.6, 1.6, glowM, 0, -2.6, 0); K.box(rig.handL, 1.6, 1.6, 1.6, glowM, 0, -2.6, 0);
    K.box(rig.torso, 9, 1.4, 5, K.mat(0x0a0a10, { roughness: 0.8 }), 0, 11.5, 0);
  },
});

export const ISHIGORI_SKILLS = [
  { id: 'brawn', name: 'Brawn', icon: '💪', desc: '+10% melee damage and +10 max health per rank.', max: 3, branch: 'Brawler', tier: 0 },
  { id: 'output', name: 'Output', icon: '🔋', desc: 'Every blast is bigger and hits harder.', max: 3, req: 'ab:blast', branch: 'Output', tier: 1 },
  { id: 'recoil', name: 'Recoil', icon: '🚀', desc: 'Recoil movement goes further.', max: 2, req: 'ab:recoil_jump', branch: 'Cannon', tier: 2 },
  { id: 'rocknroll', name: 'Rock\'n\'Roll', icon: '🎸', desc: 'Buffs last longer.', max: 2, req: 'ab:hungry', branch: 'Rock\'n\'Roll', tier: 2 },
  { id: 'granite', name: 'Heaviest Output', icon: '☄️', desc: 'Granite Blast and Maximum Output hit harder and blow up wider.', max: 2, req: 'ab:granite', branch: 'Output', tier: 4 },
];

class IshigoriKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const raw = { trail: BLAST, sparkColor: CORE };
    this.combo = [
      { ...raw, style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 15, range: 2.8, arc: 1.0, lunge: 6, knock: 5, stop: 0.05, shake: 0.18 },
      { ...raw, style: 'swingL', dur: 0.34, windup: 0.3, strike: 0.5, dmg: 16, range: 2.9, arc: 1.2, lunge: 6, knock: 5, stop: 0.05, shake: 0.18 },
      { ...raw, style: 'uppercut', dur: 0.38, windup: 0.32, strike: 0.52, dmg: 19, range: 2.9, arc: 1.0, lunge: 5, knock: 6, stop: 0.06, shake: 0.22 },
      { ...raw, style: 'punch', dur: 0.55, windup: 0.42, strike: 0.6, dmg: 30, range: 3.4, arc: 1.1, lunge: 4, knock: 14, stop: 0.1, shake: 0.45, ring: true, ringColor: BLAST, stagger: 0.7, blastFist: true },
    ];
    this.p.stats.meleeMult += r('brawn') * 0.1;
    this.p.maxHp += r('brawn') * 10; this.p.hp = Math.min(this.p.hp + r('brawn') * 10, this.p.maxHp);
    this.branches = ['Output', 'Cannon', 'Brawler', 'Rock\'n\'Roll'];
    this.outMul = 1 + r('output') * 0.15; this.recoilMul = 1 + r('recoil') * 0.25; this.rockMul = 1 + r('rocknroll') * 0.3;
    this.library = {
      // ---- Output
      blast: ability({ name: 'Cursed Energy Blast', icon: '💥', kind: 'basic', desc: 'A raw ball of cursed energy that explodes on impact.', cd: 0.8, ce: 0, branch: 'Output', tier: 0, start: true, legacy: 'ranged', use: () => this.blastShot() }),
      rapid: ability({ name: 'Rapid Fire', icon: '🔫', kind: 'basic', desc: 'Four quick bolts of output in a burst.', cd: 1, ce: 0, branch: 'Output', tier: 1, req: 'blast', use: () => this.rapid() }),
      granite: ability({ name: 'Granite Blast', icon: '☄️', kind: 'technique', desc: 'Charge, then fire a torrent of cursed energy that blows up at the end of its flight.', cd: 9, ce: 18, branch: 'Output', tier: 1, legacy: 't1', req: 'blast', use: () => this.granite() }),
      scatter: ability({ name: 'Scatter Blast', icon: '🎆', kind: 'technique', desc: 'A wide cone of output at close range, like a shotgun.', cd: 6, ce: 10, branch: 'Output', tier: 2, req: 'rapid', use: () => this.scatter() }),
      barrage: ability({ name: 'Blast Barrage', icon: '🌠', kind: 'technique', desc: 'Fire blasts high into the air: they come down over the aim in a barrage.', cd: 14, ce: 22, branch: 'Output', tier: 3, req: ['granite', 'scatter'], use: () => this.barrage() }),
      overload: ability({ name: 'Overload', icon: '⚡', kind: 'technique', desc: 'Hold nothing back: a sustained beam of output for 2s that you can sweep.', cd: 20, ce: 40, branch: 'Output', tier: 4, legacy: 't3', req: 'barrage', use: () => this.overload() }),
      // ---- Cannon
      finger: ability({ name: 'Fingertip Cannon', icon: '🫵', kind: 'technique', desc: 'Five thin beams of output, one from each finger, fanned in front of you.', cd: 6, ce: 10, branch: 'Cannon', tier: 1, legacy: 't2', use: () => this.finger() }),
      recoil_jump: ability({ name: 'Recoil Jump', icon: '🚀', kind: 'movement', desc: 'Blast the ground beneath you and ride the recoil to the aim, blowing up where you land.', cd: 7, ce: 8, branch: 'Cannon', tier: 2, req: 'finger', use: () => this.recoilJump() }),
      recoil_dash: ability({ name: 'Recoil Dash', icon: '💨', kind: 'movement', desc: 'Fire a blast behind you and rocket forward on the recoil.', cd: 5, ce: 5, branch: 'Cannon', tier: 2, req: 'finger', use: () => this.recoilDash() }),
      ground_blast: ability({ name: 'Ground Blast', icon: '🕳️', kind: 'technique', desc: 'Punch output straight into the ground: it erupts in a ring around you.', cd: 9, ce: 14, branch: 'Cannon', tier: 3, req: 'recoil_jump', use: () => this.groundBlast() }),
      // ---- Brawler
      charge: ability({ name: 'Pompadour Charge', icon: '🦬', kind: 'technique', desc: 'Lower your head and charge, pompadour first, ramming curses aside.', cd: 7, ce: 8, branch: 'Brawler', tier: 1, use: () => this.charge() }),
      haymaker: ability({ name: 'Output Haymaker', icon: '👊', kind: 'technique', desc: 'Close in and land a punch loaded with output that blasts through the curse.', cd: 8, ce: 12, branch: 'Brawler', tier: 2, req: 'charge', use: () => this.haymaker() }),
      suplex: ability({ name: 'Granite Suplex', icon: '🤼', kind: 'technique', desc: 'Grab the targeted curse, hoist it and slam it down in an explosion.', cd: 11, ce: 14, branch: 'Brawler', tier: 3, req: 'haymaker', use: () => this.suplex() }),
      guard: ability({ name: 'Output Guard', icon: '🛡️', kind: 'defence', desc: 'Coat yourself in raw output for 5s: 45% less damage, and attackers get blasted.', cd: 16, ce: 12, branch: 'Brawler', tier: 2, req: 'charge', use: () => this.guard() }),
      // ---- Rock'n'Roll
      hungry: ability({ name: 'Hungry for a Fight', icon: '🤤', kind: 'buff', desc: '"I\'m starving!" For 10s: +20% damage and Cursed Energy flows back fast.', cd: 24, ce: 10, branch: 'Rock\'n\'Roll', tier: 1, use: () => this.hungry() }),
      spin: ability({ name: 'Spinning Output', icon: '🌀', kind: 'technique', desc: 'Spin with your fists out, spraying output in every direction for 1.5s.', cd: 9, ce: 14, branch: 'Rock\'n\'Roll', tier: 2, req: 'hungry', use: () => this.spinOut() }),
      roar: ability({ name: 'Roar', icon: '🗣️', kind: 'technique', desc: 'A roar loaded with cursed energy: curses around you are blown back and stunned.', cd: 10, ce: 10, branch: 'Rock\'n\'Roll', tier: 2, req: 'hungry', use: () => this.roar() }),
      second_wind: ability({ name: 'Second Wind', icon: '💚', kind: 'heal', desc: 'Grit your teeth: restore 30% of your health.', cd: 20, ce: 16, branch: 'Rock\'n\'Roll', tier: 3, req: 'roar', use: () => this.rctHeal(0.3, 1.5, BLAST) }),
      meteor: ability({ name: 'Meteor Drop', icon: '☄️', kind: 'movement', desc: 'Leap high and come down on the aim fist first in a huge blast.', cd: 12, ce: 16, branch: 'Rock\'n\'Roll', tier: 3, req: 'spin', use: () => this.meteorDrop() }),
      big_bang: ability({ name: 'Big Bang', icon: '💣', kind: 'technique', desc: 'Gather your output into your body and let it all go at once: a colossal explosion around you.', cd: 24, ce: 44, branch: 'Rock\'n\'Roll', tier: 4, req: ['meteor', 'second_wind'], use: () => this.bigBang() }),
    };
    this.passives = {
      reservoir: passive({ name: 'Bottomless Reservoir', icon: '🔋', desc: '+30 max Cursed Energy and +15% Cursed Energy gained.', branch: 'Output', tier: 2, req: 'rapid', apply: (pl) => { pl.maxCe += 30; pl.stats.ceGain += 0.15; } }),
      thick_skull: passive({ name: 'Thick Skull', icon: '🪨', desc: '+8% damage reduction; Pompadour Charge stuns.', branch: 'Brawler', tier: 3, req: 'charge', apply: (pl, k) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.08); k.thick = true; } }),
      fighter: passive({ name: 'Born Fighter', icon: '🥊', desc: 'Melee hits restore 2 Cursed Energy.', branch: 'Brawler', tier: 2, req: 'charge', apply: (pl, k) => { k.fighter = true; } }),
      heian: passive({ name: 'Heian-era Output', icon: '🏯', desc: 'Blasts hit 15% harder and explode 20% wider.', branch: 'Output', tier: 3, req: 'granite', apply: (pl, k) => { k.outMul *= 1.15; k.wide = 1.2; } }),
    };
    this.wide = 1;
    this.ultimate = { name: 'Granite Blast: Maximum Output', short: 'Granite Blast: Max', icon: '☄️', use: () => this.maximumOutput() };
  }
  bhit(e, dmg, o = {}) { return this.hit(e, dmg * this.outMul, { color: '#8ad8ff', ...o }); }
  boom(at, R, dmg, o = {}) { R *= this.wide; return this.blast(at, R, dmg * this.outMul, { color: BLAST, knock: 8, stagger: 0.5, ...o }); }
  onMeleeHit(e, step) {
    if (this.fighter) this.p.gainCE(2);
    if (step.blastFist) { this.boom(e.pos.clone().setY(e.pos.y + 1), 2.2, 16, { knock: 10 }); }
  }
  orb(from, vel, R, dmg, o = {}) {
    const g = this.game, o3 = makeOrb(BLAST, { radius: o.size ?? 0.35, coreColor: CORE });
    return meshShot(this, o3, { pos: from, vel, life: o.life ?? 0.9, radius: 0.5, light: o.light ?? 3, color: BLAST, gravity: o.gravity ?? 0, face: false, homing: o.homing ?? 0, target: o.target,
      trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color: BLAST, speed: 0.5, life: 0.3, size: 0.25, sizeEnd: 0.05 }); },
      onExpire: (q) => { this.boom(q.pos.clone(), R, dmg, o.blast ?? {}); } });
  }
  // ------------------------------------------------------------ Output
  blastShot() {
    const g = this.game;
    this.cast(0.3);
    const from = this.handPos(), { dir, t } = aimAt(this, from, 16);
    this.orb(from, dir.clone().multiplyScalar(22), 2 + this.rank('output') * 0.3, 16, { homing: g.domainSys?.sureHit(this.p) ? 8 : 0, target: t });
    g.audio?.energy('red');
  }
  rapid() {
    const g = this.game;
    this.cast(0.32);
    for (let i = 0; i < 4; i++) this.after(i * 0.07, () => {
      const from = this.handPos(), { dir } = aimAt(this, from, 16);
      dir.x += (Math.random() - 0.5) * 0.08; dir.z += (Math.random() - 0.5) * 0.08; dir.normalize();
      this.orb(from, dir.multiplyScalar(28), 1.2, 7, { size: 0.18, light: 1, life: 0.6, blast: { knock: 3, stagger: 0.2, explode: false, sound: false } });
      g.audio?.tone({ freq: 500, to: 200, dur: 0.07, gain: 0.07, type: 'square', filter: 2000 });
    });
  }
  granite() {
    const g = this.game, p = this.p, CH = 0.45, rk = this.rank('granite');
    p.action = { type: 'cast', both: true, dur: CH + 0.4, elapsed: 0, t: 0, moveScale: 0.15, lock: true, faceAim: true };
    g.audio?.charge(CH, 0.9);
    const ball = makeOrb(BLAST, { radius: 0.2, coreColor: CORE });
    temp(this, ball, CH, (t, dt, k) => { ball.position.copy(this.handPos()); ball.scale.setScalar(0.2 + k * 0.6); });
    this.after(CH, () => {
      const from = this.handPos(), { dir } = aimAt(this, from, 20);
      const res = beam(this, from, dir, 18, 0.9 + rk * 0.15, BLAST, { dmg: 26 * this.outMul, core: CORE, knock: 6, stagger: 0.5 });
      this.boom(res.end, 3.5 + rk * 0.6, 50 + rk * 15, { knock: 12, stagger: 0.9 });
      g.shake(0.4); g.audio?.energy('explode');
    });
  }
  scatter() {
    const g = this.game, p = this.p, f = this.fwd(), R = 6;
    this.cast(0.35, true);
    for (let i = 0; i < 9; i++) { const a = Math.atan2(f.x, f.z) + (i - 4) * 0.11; beam(this, this.handPos(), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), R, 0.16, BLAST, { core: CORE, light: i === 4, pierce: false }); }
    for (const e of this.foes(p.pos, R, f, 0.55)) { const d = e.pos.distanceTo(p.pos); this.bhit(e, 34 * Math.max(0.4, 1 - d / R), { stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(10) }); }
    g.shake(0.3); g.audio?.energy('red');
  }
  barrage() {
    const g = this.game, p = this.p, c = this.aimGround(13), R = 5.5;
    this.cast(0.5, true);
    g.markers.spawn({ pos: c, dur: 1, radius: R, color: BLAST });
    for (let i = 0; i < 10; i++) this.after(i * 0.06, () => this.orb(this.handPos(), new THREE.Vector3((Math.random() - 0.5) * 3, 22, (Math.random() - 0.5) * 3), 0, 0, { size: 0.25, life: 0.5, light: 1, blast: { fx: false, knock: 0 } }));
    for (let i = 0; i < 12; i++) this.after(0.6 + i * 0.08, () => {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      const at = new THREE.Vector3(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr); at.y = this.groundAt(at.x, at.z, c.y);
      this.orb(at.clone().setY(at.y + 12), new THREE.Vector3(0, -30, 0), 2.2, 22, { size: 0.3, life: 0.39, light: 2, blast: { knock: 6, stagger: 0.5 } });
    });
    g.audio?.energy('red');
  }
  overload() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 2.3, elapsed: 0, t: 0, moveScale: 0.15, lock: true, hold: true, cancelable: false, faceAim: true };
    g.toast?.('Overload'); g.audio?.energy('purple');
    let tick = 0;
    this.during(2.2, (t, dt) => {
      tick -= dt; if (tick > 0) return; tick = 0.1;
      p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
      const from = this.handPos(), { dir } = aimAt(this, from, 20);
      beam(this, from, dir, 20, 1.1, BLAST, { dmg: 13 * this.outMul, core: CORE, knock: 3, stagger: 0.3, dur: 0.14, light: Math.random() < 0.3 });
      g.shake(0.12);
    });
  }
  // ------------------------------------------------------------ Cannon
  finger() {
    const g = this.game, base = this.aimAngle();
    this.cast(0.35);
    for (let i = 0; i < 5; i++) { const a = base + (i - 2) * 0.13; beam(this, this.handPos(), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), 14, 0.2, BLAST, { dmg: 16 * this.outMul, core: CORE, knock: 4, stagger: 0.35, light: i === 2, blocks: false }); }
    g.audio?.energy('slash'); g.shake(0.15);
  }
  recoilJump() {
    const g = this.game, p = this.p, to = this.aimGround(11 * this.recoilMul), from = p.pos.clone();
    this.boom(from.clone(), 2.4, 14, { knock: 8 });
    p.invulnerable = true;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.9, windup: 0.3 }, style: 'slam', dur: 0.6, elapsed: 0, t: 0, windup: 0.3, strike: 0.9, struck: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.markers.spawn({ pos: to, dur: 0.5, radius: 3.2, color: BLAST });
    this.during(0.5, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 5;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      g.particles.burst(tmp.set(p.pos.x, p.pos.y, p.pos.z), { count: 2, color: BLAST, speed: 2, spread: 0.3, dir: tmp2.set(0, -4, 0), life: 0.4, size: 0.4, sizeEnd: 0.05 });
    }, () => { p.invulnerable = false; p.action = null; this.boom(p.pos.clone(), 3.2, 30, { knock: 11, stagger: 0.7 }); g.fx.landDust(p.pos, 25); });
  }
  recoilDash() {
    const g = this.game, p = this.p, f = this.fwd();
    beam(this, this.handPos(), tmp.copy(f).negate(), 5, 0.6, BLAST, { core: CORE, pierce: true, light: false });
    this.dash(f, 9 * this.recoilMul, 0.22, { hitR: 1.6, dmg: 16 * this.outMul, color: BLAST });
    g.audio?.energy('red');
  }
  groundBlast() {
    const g = this.game, p = this.p, c = p.pos.clone();
    this.pose('slam', 0.5);
    this.after(0.25, () => {
      this.boom(c, 3, 30, { knock: 10, stagger: 0.7 });
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; this.after(0.08 + i * 0.03, () => { const at = c.clone().add(tmp.set(Math.cos(a) * 4.5, 0, Math.sin(a) * 4.5)); at.y = this.groundAt(at.x, at.z, c.y); beam(this, at, tmp2.set(0, 1, 0), 6, 0.7, BLAST, { core: CORE, pierce: true, light: false }); this.boom(at, 1.8, 18, { knock: 6, explode: false, sound: false }); for (const e of this.foes(at, 1.8)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 10); }); }
      g.shake(0.5);
    });
  }
  // ------------------------------------------------------------ Brawler
  charge() {
    const g = this.game, p = this.p, f = this.fwd();
    this.dash(f, 10, 0.4, { hitR: 1.7, dmg: 24, color: BLAST, hitOpts: { melee: true, stagger: 0.8 }, onHit: (e) => { if (this.thick) this.stun(e, 1.2); g.audio?.impact(1.2); } });
    g.audio?.whoosh(1.3);
  }
  haymaker() {
    const g = this.game, p = this.p, t = this.target(8);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, BLAST);
    this.pose('punch', 0.4);
    this.after(0.16, () => {
      if (t.dead) return;
      const f = tmp.subVectors(t.pos, p.pos).setY(0).normalize().clone();
      this.hit(t, 40, { melee: true, stagger: 1, knock: f.clone().setLength(16) });
      beam(this, p.pos.clone().setY(p.pos.y + 1.2), f, 9, 0.8, BLAST, { dmg: 20 * this.outMul, core: CORE, knock: 8 });
      g.hitStop(0.07); g.shake(0.5); g.audio?.impact(1.7, 'crit');
    });
  }
  suplex() {
    const g = this.game, p = this.p, t = this.target(7);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, BLAST);
    p.action = { type: 'cast', both: true, dur: 0.7, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    this.stun(t, 1); t.cancelAttack?.();
    const big = !!t.isBoss, from = t.pos.clone(), back = p.pos.clone().addScaledVector(tmp.subVectors(p.pos, t.pos).setY(0).normalize(), 1.6);
    this.during(0.55, (tt, dt, k) => { if (t.dead || big) return; t.pos.lerpVectors(from, back, k); t.pos.y = from.y + Math.sin(k * Math.PI) * 3.5; t.vel.set(0, 0, 0); }, () => {
      if (p.action?.lock) p.action = null;
      if (t.dead) return;
      this.hit(t, 52, { melee: true, stagger: 1, unblockable: true });
      this.boom(t.pos.clone(), 3, 22, { knock: 9 });
      g.fx.landDust(t.pos, 30); g.hitStop(0.08);
    });
  }
  guard() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const aura = makeOrb(BLAST, { radius: 1.4, coreColor: CORE });
    aura.userData.core.visible = false;
    g.audio?.energy('infinity');
    this.buff('guard', 5, {
      onStart: () => g.scene.add(aura),
      incoming: (a, src) => { if (src && src.maxHp && !src.dead && src.pos && src.pos.distanceTo(p.pos) < 4) { this.bhit(src, 14, { stagger: 0.4, knock: tmp.subVectors(src.pos, p.pos).setY(0).setLength(8) }); g.fx.explosion(src.pos.clone().setY(src.pos.y + 1), BLAST, 1); } return a * 0.55; },
      onTick: () => { aura.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z); },
      onEnd: () => g.scene.remove(aura),
    });
  }
  // ------------------------------------------------------------ Rock'n'Roll
  hungry() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('"I\'m starving!"');
    g.fx.flash(BLAST, 0.15, 0.2); g.audio?.tone({ freq: 196, to: 392, dur: 0.4, gain: 0.12, type: 'sawtooth', filter: 1600 });
    this.statBuff('hungry', 10 * this.rockMul, { damage: 0.2 }, { onTick: (dt) => { p.gainCE(4 * dt); if (Math.random() < 0.5) g.particles.burst(tmp.set(p.pos.x + (Math.random() - 0.5), p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5)), { count: 1, color: BLAST, speed: 0.4, up: 2, life: 0.4, size: 0.2 }); } });
  }
  spinOut() {
    const g = this.game, p = this.p;
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.5, windup: 0.1 }, style: 'spin', dur: 1.5, elapsed: 0, t: 0, windup: 0.1, strike: 0.5, struck: true, moveScale: 0.5 };
    let tick = 0;
    this.during(1.5, (t, dt) => {
      p.facing += dt * 14;
      tick -= dt; if (tick > 0) return; tick = 0.12;
      const a = p.facing; beam(this, p.pos.clone().setY(p.pos.y + 1.2), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), 6, 0.3, BLAST, { core: CORE, light: false, dur: 0.12, pierce: true });
      for (const e of this.foes(p.pos, 5)) this.bhit(e, 6, { stagger: 0.15, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(3) });
    }, () => { if (p.action?.style === 'spin') p.action = null; });
    g.audio?.whoosh(1.4);
  }
  roar() {
    const g = this.game, p = this.p, R = 6;
    this.cast(0.45, true);
    for (const e of this.foes(p.pos, R)) { this.stun(e, 1.2); this.bhit(e, 12, { stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(12) }); }
    for (let k = 1; k <= 3; k++) this.after(k * 0.08, () => g.fx.shockwave(p.pos, BLAST, R * k / 3 + 1));
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.5), 1, 0.4); g.shake(0.4);
    g.audio?.tone({ freq: 110, to: 70, dur: 0.8, gain: 0.4, type: 'sawtooth', filter: 800, rev: 0.4 }); g.audio?.noise({ dur: 0.6, gain: 0.3, type: 'bandpass', freq: 400, sweep: 200, q: 1 });
  }
  meteorDrop() {
    const g = this.game, p = this.p, to = this.aimGround(12), from = p.pos.clone();
    p.invulnerable = true;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.9, windup: 0.3 }, style: 'slam', dur: 0.85, elapsed: 0, t: 0, windup: 0.3, strike: 0.9, struck: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.markers.spawn({ pos: to, dur: 0.75, radius: 4.5, color: BLAST });
    g.audio?.whoosh(1.5);
    this.during(0.75, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 9;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      if (k > 0.5) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.5, p.pos.z), { count: 3, color: BLAST, speed: 1, life: 0.4, size: 0.5, sizeEnd: 0.05 });
    }, () => {
      p.invulnerable = false; p.action = null;
      this.boom(p.pos.clone(), 4.5, 60, { knock: 14, stagger: 1, unblockable: true });
      g.fx.landDust(p.pos, 40); g.fx.screenWave(p.pos, 1, 0.5); g.hitStop(0.06);
    });
  }
  bigBang() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 9;
    p.action = { type: 'cast', both: true, dur: 1.1, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Big Bang'); g.audio?.charge(0.8, 0.6);
    g.markers.spawn({ pos: c, dur: 0.8, radius: R, color: BLAST });
    const orb = makeOrb(BLAST, { radius: 0.5, coreColor: CORE });
    temp(this, orb, 0.8, (t, dt, k) => { orb.position.set(p.pos.x, p.pos.y + 1.2, p.pos.z); orb.scale.setScalar(0.5 + k * 2.5); });
    p.iframes = Math.max(p.iframes, 1.2);
    this.after(0.8, () => {
      this.boom(c, R, 120, { knock: 18, stagger: 1, unblockable: true });
      for (let k = 1; k <= 3; k++) this.after(k * 0.07, () => g.fx.explosion(c.clone().add(tmp.set((Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6)), BLAST, 3));
      g.fx.flash(0xc8f0ff, 0.6, 0.3); g.fx.chroma(1.3); g.fx.screenWave(c, 1.5, 0.7); g.shake(1); g.hitStop(0.1);
      g.audio?.energy('explode'); g.audio?.blackFlash();
    });
  }
  // ------------------------------------------------------------ F: Granite Blast: Maximum Output
  maximumOutput() {
    const g = this.game, p = this.p, CH = 1.1, rk = this.rank('granite');
    p.action = { type: 'cast', both: true, dur: CH + 1.2, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    g.toast?.('Granite Blast: Maximum Output'); g.audio?.charge(CH, 0.5);
    g.fx.dimTarget = 0.35;
    const ball = makeOrb(BLAST, { radius: 0.3, coreColor: CORE });
    const light = g.lights.attach(ball, BLAST, 10, 16, { offsetY: 0, priority: 6 });
    temp(this, ball, CH, (t, dt, k) => {
      ball.position.copy(this.handPos()); ball.scale.setScalar(0.3 + k * 1.6);
      for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, rr = 3 + Math.random() * 2; const h = ball.position; g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.5) * 3, h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 3, 0, -Math.sin(a) * rr * 3, 0.3, 1, 2.4, 3, 0.18, 0, 1, 0.2, 0); }
      g.shake(0.05 + k * 0.15);
    }, () => g.lights.remove(light));
    this.after(CH, () => {
      g.fx.dimTarget = 0;
      const from = this.handPos(), { dir } = aimAt(this, from, 30);
      const res = beam(this, from, dir, 30, 3 + rk * 0.3, BLAST, { dmg: 140 * this.outMul * (1 + rk * 0.2), core: CORE, pierce: true, knock: 16, stagger: 1, unblockable: true, dur: 0.9 });
      this.after(0.08, () => beam(this, from, dir, 30, 1.6, HOT, { core: 0xffffff, pierce: true, light: false, dur: 0.7 }));
      this.after(0.35, () => {
        const end = res.end; end.y = this.groundAt(end.x, end.z, end.y);
        const R = 8 + rk * 1.5;
        this.boom(end, R, 120 * (1 + rk * 0.2), { knock: 18, stagger: 1, unblockable: true });
        for (let i = 0; i < 4; i++) this.after(i * 0.08, () => g.fx.explosion(end.clone().add(tmp.set((Math.random() - 0.5) * R, 1 + Math.random() * 2, (Math.random() - 0.5) * R)), BLAST, R * 0.5));
        for (let i = 0; i < 26; i++) g.debris.spawn(end.clone().setY(end.y + 0.6), new THREE.Vector3((Math.random() - 0.5) * 18, 6 + Math.random() * 10, (Math.random() - 0.5) * 18), 0.3, new THREE.Color(Math.random() < 0.4 ? 0x8ad8ff : 0x4a4048), 3);
        g.fx.screenWave(end, 1.6, 0.8); g.fx.flash(0xc8f0ff, 0.6, 0.35); g.hitStop(0.1); g.slowMo?.(0.35, 0.4);
        g.audio?.energy('explode'); g.audio?.blackFlash();
      });
      g.fx.chroma(1.5); g.shake(1); g.audio?.energy('purple');
    });
  }
}
registerKit('ishigori', IshigoriKit, ISHIGORI_SKILLS);
