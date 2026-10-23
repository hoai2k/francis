// Kenjaku-style kit — Anti-Gravity System (the technique he took from Kaori
// Itadori's body), with the Cursed Spirit Manipulation and barrier mastery he
// carries in Geto's. 20 abilities on the technique tree; four are equipped
// (RMB takes a basic one) plus F.
//   LMB        a monk's palm strikes; the finisher repels everything in front.
//   Gravity    Anti-Gravity Pulse (start, RMB), Gravity Lance, Anti-Gravity
//              Repulsion, Weightless, Gravity Crush, Anti-Gravity System: Maximum
//   Spirits    Release Spirit, Spirit Horde, Rainbow Dragon, Smallpox Deity,
//              Kuchisake-onna, Maximum: Uzumaki
//   Barriers   Curtain, Barrier Wall, Sealing Barrier
//   Mastermind Levitation, Cursed Womb: Death Painting, Reverse Cursed
//              Technique, Culling Game Edict, A Thousand Years of Scheming
//   F          Domain: Womb Profusion — a womb of flesh and cords. Its sure-hit
//              is gravity: every curse inside is lifted weightless, then slammed
//              into the floor again and again.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { GEO, glow, mat, temp, mesh, beam, meshShot, rise, insideFoes, pull, sigil, aimAt, makeOrb } from './fxlib.js';

const GRAV = 0xb85aff, FLESH = 0xc83a5a, SPIRIT = 0x7a4aa8, BARRIER = 0x1a1a2a, PALE = 0xe8d8ff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('kenjaku', { name: 'Kenjaku', technique: 'Anti-Gravity System', rarity: 'special', title: 'The Mastermind', desc: 'Anti-gravity that flings, lifts and crushes, a thousand years of stocked curses and barrier mastery.', domain: 'Womb Profusion', color: '#b85aff' });

registerLook('kenjaku', {
  paint: { skinTone: 0xf0cdb0, hair: 0x101014, hairVolume: true, top: 0x1a1a1e, kimono: true, sash: 0x8a7a3a, scarf: 0x4a4a2e, sleeve: 0x1a1a1e, pants: 0x1a1a1e, shoes: 0x2a2620, eye: 0x2a1a10, eyeWhite: 0x2a1a10, fringe: 2, hairSide: 6, hairBack: 8 },
  paintExtra(S) {
    // the stitches across the forehead
    S.mat = 'skin';
    S.fineRect(8, 9.5, 8, 0.5, 0x8a3a3a, 'skin');
    for (let x = 8.5; x < 16; x += 1) S.fine(x, 9, 0x3a1a1a, 'skin'), S.fine(x, 10, 0x3a1a1a, 'skin');
    S.fineRect(0, 9.5, 8, 0.5, 0x8a3a3a, 'skin'); S.fineRect(16, 9.5, 8, 0.5, 0x8a3a3a, 'skin');
    // a thin, knowing smile
    S.px(10, 15, 0xa87a68); S.px(13, 14, 0xa87a68);
    S.rect(12, 8, 1, 5, 0x101014, 0.05);
  },
  hair: (m) => [
    { x: 0, y: 8, z: -0.5, w: 7, h: 2, d: 7, material: m },
    { x: 1, y: 3, z: 3.6, w: 1.5, h: 6, d: 1, rz: 0.08, material: m },
    { x: 0, y: 6, z: -3.8, w: 7, h: 12, d: 2, hang: true, material: m, stiff: 26 },
    { x: -3.5, y: 2, z: -0.5, w: 2, h: 6, d: 6, hang: true, material: m, stiff: 34 },
    { x: 3.5, y: 2, z: -0.5, w: 2, h: 6, d: 6, hang: true, material: m, stiff: 34 },
  ],
  hairColor: 0x101014, accent: GRAV, emit: 0.1,
  cape: { color: 0x1a1a1e, segments: 3, length: 11, width: 9 },
  props(rig, K) {
    const stole = K.mat(0x5a5a30, { roughness: 0.9 }), gold = K.mat(0xc8a040, { metalness: 0.8, roughness: 0.3 }), thread = K.mat(0x3a1a1a, { roughness: 0.8 });
    // the olive kasaya over the shoulder, a gold ring at the knot
    K.box(rig.torso, 9.4, 3, 5, stole, 0, 7, 0, 0, 0, -0.7);
    K.box(rig.torso, 2.5, 10, 4.6, stole, -2.4, 4.5, 0, 0, 0, -0.1);
    K.box(rig.torso, 1.6, 1.6, 0.6, gold, -2.4, 8, 2.6);
    // the stitched seam standing proud of the brow
    K.box(rig.head, 8.4, 0.35, 0.3, thread, 0, 5.6, 4.1);
    for (let i = -3; i <= 3; i++) K.box(rig.head, 0.25, 1, 0.3, thread, i * 1.1, 5.6, 4.15);
    K.box(rig.head, 1, 2, 1.4, gold, -4.4, 1.6, 0.3); K.box(rig.head, 1, 2, 1.4, gold, 4.4, 1.6, 0.3);
  },
});

registerDomainEnv('womb_profusion', {
  skyTop: 0x1a0408, skyHorizon: 0x8a2a3a, fog: 0x3a0a14, fogDensity: 0.02, hemiSky: 0xff8a9a, hemiGround: 0x2a0408, hemiI: 1.0, sun: 0xff9aa8, sunI: 0.9,
  grade: { tint: [1.1, 0.92, 0.95], lift: [0.02, 0.0, 0.01], sat: 1.15, contrast: 1.15, vignette: 0.55 }, floor: B.blood_brick,
});

export const KENJAKU_SKILLS = [
  { id: 'monk', name: 'Monk\'s Discipline', icon: '📿', desc: '+8% melee damage and +8% technique damage per rank.', max: 3, branch: 'Mastermind', tier: 0 },
  { id: 'gravity', name: 'Anti-Gravity', icon: '🪐', desc: 'Gravity techniques reach further and hit harder.', max: 3, req: 'ab:pulse', branch: 'Gravity', tier: 1 },
  { id: 'stock', name: 'Stocked Curses', icon: '👻', desc: 'Released spirits hit harder and more of them come.', max: 3, req: 'ab:release', branch: 'Spirits', tier: 2 },
  { id: 'barrier', name: 'Barrier Mastery', icon: '⛩️', desc: 'Barriers last longer.', max: 2, req: 'ab:curtain', branch: 'Barriers', tier: 2 },
  { id: 'womb', name: 'Cursed Womb', icon: '🫀', desc: 'The domain lasts 2s longer and slams harder.', max: 1, req: 'gravity', branch: 'Gravity', tier: 5 },
];

class KenjakuKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const palm = { trail: GRAV, sparkColor: PALE };
    this.combo = [
      { ...palm, style: 'punch', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 13, range: 2.7, arc: 1.1, lunge: 6, knock: 4, stop: 0.045, shake: 0.15 },
      { ...palm, style: 'swingL', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 14, range: 2.8, arc: 1.2, lunge: 6, knock: 4, stop: 0.045, shake: 0.15 },
      { ...palm, style: 'punch', dur: 0.5, windup: 0.4, strike: 0.6, dmg: 24, range: 3.4, arc: 1.2, lunge: 3, knock: 16, stop: 0.08, shake: 0.35, ring: true, ringColor: GRAV, stagger: 0.6 },
    ];
    this.p.stats.meleeMult += r('monk') * 0.08; this.p.stats.techMult = (this.p.stats.techMult ?? 1) + r('monk') * 0.08;
    this.branches = ['Gravity', 'Spirits', 'Barriers', 'Mastermind'];
    this.gravMul = 1 + r('gravity') * 0.15; this.stockMul = 1 + r('stock') * 0.15; this.barrierMul = 1 + r('barrier') * 0.25;
    this.library = {
      // ---- Gravity
      pulse: ability({ name: 'Anti-Gravity Pulse', icon: '🪐', kind: 'basic', desc: 'A ripple of anti-gravity that flings the curse it hits away.', cd: 0.8, ce: 0, branch: 'Gravity', tier: 0, start: true, legacy: 'ranged', use: () => this.pulse() }),
      lance: ability({ name: 'Gravity Lance', icon: '🔻', kind: 'basic', desc: 'A narrow spear of compressed gravity that pierces a line of curses.', cd: 1.2, ce: 0, branch: 'Gravity', tier: 1, req: 'pulse', use: () => this.lance() }),
      repulse: ability({ name: 'Anti-Gravity Repulsion', icon: '💫', kind: 'technique', desc: 'Anti-Gravity System: everything around you is hurled outward at once.', cd: 7, ce: 12, branch: 'Gravity', tier: 1, legacy: 't1', req: 'pulse', use: () => this.repulse() }),
      weightless: ability({ name: 'Weightless', icon: '🎈', kind: 'technique', desc: 'Curses at the aim lose their weight and float helpless for 2s, then gravity comes back all at once.', cd: 11, ce: 16, branch: 'Gravity', tier: 2, req: 'repulse', use: () => this.weightless() }),
      crush: ability({ name: 'Gravity Crush', icon: '⬇️', kind: 'technique', desc: 'Reverse the field: a column of crushing weight flattens everything at the aim.', cd: 9, ce: 16, branch: 'Gravity', tier: 2, req: 'lance', use: () => this.crush() }),
      maximum: ability({ name: 'Anti-Gravity System: Maximum', icon: '🌌', kind: 'technique', desc: 'A vast anti-gravity field: every curse nearby is thrown into the sky and smashed back down.', cd: 22, ce: 44, branch: 'Gravity', tier: 4, legacy: 't3', req: ['weightless', 'crush'], use: () => this.maximum() }),
      // ---- Spirits
      release: ability({ name: 'Release Spirit', icon: '👻', kind: 'summon', desc: 'Release stocked cursed spirits that hunt down curses.', cd: 8, ce: 14, branch: 'Spirits', tier: 1, legacy: 't2', use: () => this.release() }),
      horde: ability({ name: 'Spirit Horde', icon: '👹', kind: 'defence', desc: 'A ring of low-grade spirits surrounds you for 8s, soaking hits and biting back.', cd: 16, ce: 12, branch: 'Spirits', tier: 2, req: 'release', use: () => this.horde() }),
      dragon: ability({ name: 'Rainbow Dragon', icon: '🐉', kind: 'summon', desc: 'The armoured Rainbow Dragon bursts out and charges through a long line of curses.', cd: 12, ce: 20, branch: 'Spirits', tier: 2, req: 'release', use: () => this.dragon() }),
      smallpox: ability({ name: 'Smallpox Deity', icon: '⚰️', kind: 'technique', desc: 'Graves rise around the targeted curse: it is sealed in a coffin, held, and crushed under the earth.', cd: 14, ce: 20, branch: 'Spirits', tier: 3, req: 'horde', use: () => this.smallpox() }),
      kuchisake: ability({ name: 'Kuchisake-onna', icon: '✂️', kind: 'technique', desc: '"Am I pretty?" Curses near the aim freeze to answer, then giant scissors cut through them.', cd: 12, ce: 16, branch: 'Spirits', tier: 3, req: 'dragon', use: () => this.kuchisake() }),
      uzumaki: ability({ name: 'Maximum: Uzumaki', icon: '🌀', kind: 'technique', desc: 'Compress every stocked spirit into one sphere and fire it as a devastating spiral beam.', cd: 24, ce: 46, branch: 'Spirits', tier: 4, req: ['smallpox', 'kuchisake'], use: () => this.uzumaki() }),
      // ---- Barriers
      curtain: ability({ name: 'Curtain', icon: '⛩️', kind: 'technique', desc: '"Emerging from the darkness…" A black curtain drops over the aim: curses inside are trapped and slowed for 5s.', cd: 14, ce: 16, branch: 'Barriers', tier: 1, use: () => this.curtain() }),
      wall: ability({ name: 'Barrier Wall', icon: '🧱', kind: 'defence', desc: 'A barrier stands in front of you for 5s and stops every shot and curse.', cd: 14, ce: 10, branch: 'Barriers', tier: 2, req: 'curtain', use: () => this.wall() }),
      seal: ability({ name: 'Sealing Barrier', icon: '🔐', kind: 'defence', desc: 'Wrap yourself in a layered barrier for 4s: 60% less damage.', cd: 18, ce: 12, branch: 'Barriers', tier: 3, req: 'wall', use: () => this.seal() }),
      // ---- Mastermind
      levitate: ability({ name: 'Levitation', icon: '🕊️', kind: 'movement', desc: 'Cancel your own weight and glide to the aim, repelling curses where you land.', cd: 7, ce: 8, branch: 'Mastermind', tier: 1, use: () => this.levitate() }),
      death_painting: ability({ name: 'Cursed Womb: Death Painting', icon: '🩸', kind: 'technique', desc: 'Throw one of your Death Painting wombs: it bursts into corrosive blood that eats at curses.', cd: 10, ce: 14, branch: 'Mastermind', tier: 2, req: 'levitate', use: () => this.deathPainting() }),
      rct: ability({ name: 'Reverse Cursed Technique', icon: '✚', kind: 'heal', desc: 'Restore 30% of your health.', cd: 20, ce: 16, branch: 'Mastermind', tier: 2, req: 'levitate', use: () => this.rctHeal(0.3, 1.5, PALE) }),
      edict: ability({ name: 'Culling Game Edict', icon: '📜', kind: 'technique', desc: 'Declare a rule over the curses near you for 8s: each one that dies restores Cursed Energy and health.', cd: 20, ce: 12, branch: 'Mastermind', tier: 3, req: 'death_painting', use: () => this.edict() }),
      scheming: ability({ name: 'A Thousand Years of Scheming', icon: '🧠', kind: 'buff', desc: 'For 10s every technique costs no Cursed Energy and cools down 30% faster.', cd: 40, ce: 20, branch: 'Mastermind', tier: 4, req: ['edict', 'rct'], use: () => this.scheming() }),
    };
    this.passives = {
      vessel: passive({ name: 'Borrowed Body', icon: '🧬', desc: '+25 max health; the techniques of every body you have worn: +5% critical chance.', branch: 'Mastermind', tier: 2, req: 'levitate', apply: (pl) => { pl.maxHp += 25; pl.hp += 25; pl.stats.crit += 0.05; } }),
      orbit: passive({ name: 'Orbital Field', icon: '🪐', desc: 'Curses that strike you up close are flung away by anti-gravity.', branch: 'Gravity', tier: 3, req: 'repulse', apply: (pl, k) => { k.orbit = true; } }),
      thousand: passive({ name: 'Thousand-year Stock', icon: '📦', desc: 'Released spirits restore 1 Cursed Energy per bite; +2 spirits.', branch: 'Spirits', tier: 3, req: 'release', apply: (pl, k) => { k.stockCE = true; k.extraSpirits = 2; } }),
      architect: passive({ name: 'Barrier Architect', icon: '📐', desc: 'Barriers last 50% longer and Curtain also weakens curses inside (they take 15% more damage).', branch: 'Barriers', tier: 3, req: 'curtain', apply: (pl, k) => { k.barrierMul *= 1.5; k.architect = true; } }),
    };
    this.domain = {
      name: 'Womb Profusion', icon: '🫀', key: 'womb_profusion', type: 6, color: FLESH, sound: 'shrine', flash: 0xff8a9a,
      look: { floor: 0x5a1a22, seam: 0xff5a7a, sparkle: 0xffc0d0, skyTop: 0x200408, skyHorizon: 0xa83a4a, stars: 0, band: 0xff8a9a },
      duration: 8 + r('womb') * 2, radius: 25,
      onStart: (g, d) => { this.buildWomb(g, d); g.toast?.('Sure-hit: gravity — every curse inside is lifted and slammed down'); g.shake(0.6); },
      onTick: (g, d, dt) => this.wombTick(g, d, dt),
      onEnd: () => this.clearWomb(),
    };
  }
  dispose() { super.dispose(); this.clearWomb(); }
  incoming(a, src) {
    if (this.orbit && src && src.maxHp && !src.dead && src.pos && src.pos.distanceTo(this.p.pos) < 3.5 && !src.isBoss) { src.knock?.add(tmp.subVectors(src.pos, this.p.pos).setY(0).setLength(14)); src.vel.y = Math.max(src.vel.y, 6); }
    return a;
  }
  ghit(e, dmg, o = {}) { return this.hit(e, dmg * this.gravMul * (this.edictOn && this.architect && e.curtained ? 1.15 : 1), { color: '#d8aaff', ...o }); }
  // ------------------------------------------------------------ Gravity
  pulse() {
    const g = this.game, p = this.p;
    this.cast(0.28);
    const ring = mesh(GEO.torus, glow(GRAV, 2.5), 0.5);
    const { dir } = aimAt(this, this.handPos(), 16);
    meshShot(this, ring, { pos: this.handPos(), vel: dir.clone().multiplyScalar(20), life: 0.8, radius: 0.6,
      trail: (q, dt) => { ring.scale.setScalar(0.5 + q.t * 1.2); if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: GRAV, speed: 0.5, life: 0.3, size: 0.2 }); },
      onHit: (e, q) => { this.ghit(e, 13, { stagger: 0.4, knock: q.vel.clone().setY(0).setLength(12) }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 5); g.fx.shockwave(q.pos, GRAV, 1.6); } });
    g.audio?.tone({ freq: 220, to: 660, dur: 0.18, gain: 0.08, type: 'sine', rev: 0.3 });
  }
  lance() {
    const g = this.game, from = this.handPos();
    this.cast(0.3);
    const { dir } = aimAt(this, from, 16);
    beam(this, from, dir, 16, 0.25, GRAV, { dmg: 16 * this.gravMul, core: PALE, stagger: 0.4, knock: 3, numColor: '#d8aaff', blocks: false });
    g.audio?.tone({ freq: 900, to: 300, dur: 0.15, gain: 0.07, type: 'sawtooth', filter: 2500 });
  }
  repulse() {
    const g = this.game, p = this.p, R = 5.5 + this.rank('gravity') * 0.6;
    this.cast(0.4, true);
    this.blast(p.pos.clone(), R, 24 * this.gravMul, { color: GRAV, knock: 20, stagger: 0.7, explode: false });
    for (const e of this.foes(p.pos, R)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
    for (let k = 1; k <= 3; k++) this.after(k * 0.06, () => g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.5 + k * 0.4, p.pos.z), { color: k % 2 ? GRAV : PALE, r0: 0.5, r1: R + k, dur: 0.4, thick: 0.15 }));
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 0.8, 0.4); g.audio?.energy('red');
  }
  weightless() {
    const g = this.game, c = this.aimGround(12), R = 4.5;
    this.cast(0.45, true);
    sigil(this, c, R, GRAV, 0.4);
    const held = this.foes(c, R);
    for (const e of held) this.stun(e, 2.2);
    g.audio?.tone({ freq: 300, to: 900, dur: 1, gain: 0.08, type: 'sine', rev: 0.6 });
    this.during(2, (t) => {
      for (const e of held) if (!e.dead && !e.isBoss) { e.pos.y += (c.y + 3.5 + Math.sin(t * 3 + e.pos.x) * 0.3 - e.pos.y) * 0.08; e.vel.set(0, 0, 0); }
      if (Math.random() < 0.6) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R; g.particles.burst(tmp.set(c.x + Math.cos(a) * rr, c.y + 0.2, c.z + Math.sin(a) * rr), { count: 1, color: GRAV, speed: 0.5, up: 3, life: 0.8, size: 0.2 }); }
    }, () => {
      for (const e of held) if (!e.dead) { if (!e.isBoss) e.vel.y = -28; this.after(0.15, () => { if (!e.dead) { this.ghit(e, 46, { stagger: 0.9 }); g.fx.landDust(e.pos, 25); } }); }
      this.after(0.15, () => { g.fx.shockwave(c, GRAV, R + 1); g.shake(0.5); g.audio?.impact(1.6); });
    });
  }
  crush() {
    const g = this.game, t = this.target(13), c = t ? t.pos.clone() : this.aimGround(12), R = 2.8;
    c.y = this.groundAt(c.x, c.z, this.p.pos.y);
    this.cast(0.4, true);
    g.markers.spawn({ pos: c, dur: 0.45, radius: R, color: GRAV });
    this.after(0.45, () => {
      const col = mesh(GEO.cyl, glow(GRAV, 1.5, 0.5), [R, 12, R]);
      temp(this, col, 0.45, (tt, dt, k) => { col.position.set(c.x, c.y + 6 - k * 3, c.z); col.scale.set(R * (1 - k * 0.6), 12, R * (1 - k * 0.6)); });
      for (const e of this.foes(c, R + 0.5)) { this.ghit(e, 60, { stagger: 1, unblockable: true }); this.stun(e, 0.8); if (!e.isBoss) e.vel.y = -20; }
      for (let i = 0; i < 16; i++) g.debris.spawn(c.clone().setY(c.y + 0.4), new THREE.Vector3((Math.random() - 0.5) * 10, 3 + Math.random() * 4, (Math.random() - 0.5) * 10), 0.25, new THREE.Color(0x4a4048), 2);
      g.combat.hitBlocks(c, tmp.set(0, 0, 1), R, Math.PI, 120, this.p);
      g.fx.shockwave(c, GRAV, R + 1.5); g.shake(0.5); g.hitStop(0.05); g.audio?.energy('explode');
    });
  }
  maximum() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 10;
    p.action = { type: 'cast', both: true, dur: 1.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Anti-Gravity System: Maximum'); g.audio?.charge(0.6, 0.5);
    g.markers.spawn({ pos: c, dur: 0.6, radius: R, color: GRAV });
    this.after(0.6, () => {
      const list = this.foes(c, R);
      for (const e of list) { this.stun(e, 1.6); if (!e.isBoss) e.vel.y = 18; this.ghit(e, 30, { stagger: 0.5 }); }
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.2, c.z), { color: GRAV, r0: 1, r1: R + 2, dur: 0.6, thick: 0.3 });
      g.fx.screenWave(c, 1.4, 0.6); g.shake(0.6); g.audio?.energy('red');
      this.after(0.75, () => {
        for (const e of list) if (!e.dead) { if (!e.isBoss) e.vel.y = -40; this.after(0.12, () => { if (!e.dead) { this.ghit(e, 110, { stagger: 1, unblockable: true }); g.fx.shockwave(e.pos, GRAV, 2.5); g.fx.landDust(e.pos, 30); } }); }
        this.after(0.14, () => { g.fx.flash(0x8a3aff, 0.4, 0.25); g.shake(1); g.hitStop(0.08); g.audio?.energy('explode'); g.audio?.blackFlash(); });
      });
    });
  }
  // ------------------------------------------------------------ Spirits
  spiritMesh(color = SPIRIT) {
    const grp = new THREE.Group();
    const body = mesh(GEO.ico0, mat(color, { emissive: 0.8, roughness: 0.5 }), 0.4); grp.add(body);
    for (const s of [-1, 1]) { const eye = mesh(GEO.box, glow(0xffe04a, 3), 0.08); eye.position.set(s * 0.14, 0.1, 0.34); grp.add(eye); }
    const mouth = mesh(GEO.box, glow(0xff3a5a, 2), [0.24, 0.05, 0.05]); mouth.position.set(0, -0.12, 0.36); grp.add(mouth);
    return grp;
  }
  release() {
    const g = this.game, p = this.p;
    const foes = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 22);
    if (!foes.length) { g.toast?.('No curses to hunt'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    g.fx.summonCircle(p.pos, SPIRIT);
    const n = 4 + this.rank('stock') + (this.extraSpirits ?? 0);
    for (let i = 0; i < n; i++) this.after(i * 0.08, () => {
      const a = i / n * Math.PI * 2;
      meshShot(this, this.spiritMesh([SPIRIT, 0x4a6a3a, 0x8a3a3a][i % 3]), { pos: p.pos.clone().add(tmp.set(Math.sin(a), 1.4, Math.cos(a))), vel: new THREE.Vector3(Math.sin(a) * 5, 3, Math.cos(a) * 5), life: 2.6, radius: 0.55, ghost: true, homing: 4, target: foes[i % foes.length],
        trail: (q) => { q.homing = Math.min(12, q.homing + 0.2); if (Math.random() < 0.4) g.particles.burst(q.pos, { count: 1, color: 0x1a0a20, additive: false, speed: 0.3, life: 0.5, size: 0.4, sizeEnd: 0.05 }); },
        onHit: (e, q) => { this.hit(e, 20 * this.stockMul, { stagger: 0.4, knock: q.vel.clone().setY(0).setLength(4) }); if (this.stockCE) p.gainCE(1); g.fx.curseDeath?.(q.pos, 1, SPIRIT); g.audio?.impact(0.8); } });
    });
    g.audio?.energy('summon');
  }
  horde() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const sp = []; for (let i = 0; i < 6; i++) { const m = this.spiritMesh(i % 2 ? SPIRIT : 0x5a5a3a); m.scale.setScalar(0.8); g.scene.add(m); sp.push(m); }
    g.audio?.energy('summon');
    this.buff('horde', 8, {
      incoming: (a, src) => {
        const m = sp.pop(); if (!m) return a;
        g.scene.remove(m); g.fx.curseDeath?.(m.position, 1, SPIRIT);
        if (src && src.maxHp && !src.dead && src.pos) this.hit(src, 18 * this.stockMul, { stagger: 0.4 });
        if (!sp.length) { const b = this.buffs.get('horde'); if (b) b.left = 0.01; }
        return a * 0.2;
      },
      onTick: () => { const T = g.time * 1.8; sp.forEach((m, i) => { const a = T + i / sp.length * Math.PI * 2; m.position.set(p.pos.x + Math.cos(a) * 1.6, p.pos.y + 0.9 + Math.sin(T * 3 + i) * 0.2, p.pos.z + Math.sin(a) * 1.6); m.lookAt(p.pos.x + Math.cos(a) * 4, m.position.y, p.pos.z + Math.sin(a) * 4); }); },
      onEnd: () => { for (const m of sp) g.scene.remove(m); sp.length = 0; },
    });
  }
  dragon() {
    const g = this.game, p = this.p, f = this.fwd(), L = 18, from = p.pos.clone().addScaledVector(f, -2);
    this.cast(0.45, true);
    g.markers.spawn({ pos: p.pos.clone(), dur: 0.35, shape: 'rect', width: 3, length: L, facing: Math.atan2(f.x, f.z), color: SPIRIT });
    const segs = [], scale = mat(0x4a8a8a, { roughness: 0.3, metalness: 0.6, emissive: 0.15 }), head = mat(0x6ad8c8, { roughness: 0.3, metalness: 0.5, emissive: 0.3 });
    const grp = new THREE.Group();
    for (let i = 0; i < 12; i++) { const s = mesh(GEO.box, i ? scale : head, i ? [1.1 - i * 0.04, 1.1 - i * 0.04, 1.2] : [1.4, 1.2, 1.8]); grp.add(s); segs.push(s); }
    const hitSet = new Set();
    this.after(0.35, () => temp(this, grp, 1, (t, dt, k) => {
      segs.forEach((s, i) => { const d = k * (L + 6) - i * 1.1; const at = tmp.copy(from).addScaledVector(f, d); s.position.set(at.x, p.pos.y + 1.2 + Math.sin(d * 0.6) * 0.8, at.z); s.lookAt(tmp2.copy(s.position).add(f)); s.visible = d > 0; });
      const hp = segs[0].position;
      for (const e of this.foes(hp, 1.8)) { if (hitSet.has(e)) continue; hitSet.add(e); this.hit(e, 44 * this.stockMul, { stagger: 0.8, knock: tmp2.copy(f).setLength(10) }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8); g.audio?.impact(1.2); }
      g.particles.burst(hp, { count: 2, color: 0xa8fff0, speed: 1, life: 0.4, size: 0.3, sizeEnd: 0.05 });
    }));
    g.audio?.energy('summon'); g.audio?.noise({ dur: 1.2, gain: 0.25, type: 'lowpass', freq: 300, sweep: 900, attack: 0.3 });
  }
  smallpox() {
    const g = this.game, t = this.target(13);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    const c = t.pos.clone(); c.y = this.groundAt(c.x, c.z, c.y);
    const stone = mat(0x8a8a90, { roughness: 0.9 }), wood = mat(0x4a3020, { roughness: 0.8 });
    const grp = new THREE.Group(); grp.position.copy(c);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const gs = mesh(GEO.box, stone, [0.7, 1.6, 0.25]); gs.position.set(Math.cos(a) * 2.2, 0.8, Math.sin(a) * 2.2); gs.rotation.y = -a; grp.add(gs); }
    const coffin = mesh(GEO.box, wood, [1.2, (t.height ?? 1.5) + 0.6, 0.9]); coffin.position.y = ((t.height ?? 1.5) + 0.6) / 2; coffin.visible = false; grp.add(coffin);
    this.stun(t, 3.2); t.cancelAttack?.();
    g.toast?.('Smallpox Deity');
    let sealed = false;
    temp(this, grp, 3.2, (tt) => {
      if (tt > 0.9 && !sealed) { sealed = true; coffin.visible = true; g.audio?.impact(1.2); g.fx.landDust(c, 20); }
      if (!t.dead) { grp.position.set(t.pos.x, grp.position.y, t.pos.z); if (sealed && !t.isBoss) t.pos.y = Math.max(c.y - 0.2, t.pos.y - 0.02); }
      if (sealed) coffin.position.y = ((t.height ?? 1.5) + 0.6) / 2 - Math.max(0, tt - 1.4) * 0.9;
    }, () => { if (!t.dead) { this.hit(t, 90 * this.stockMul, { stagger: 1, unblockable: true }); g.fx.shockwave(c, SPIRIT, 3); g.shake(0.4); g.audio?.energy('explode'); } });
    for (let i = 0; i < 3; i++) this.after(0.15 + i * 0.2, () => { g.fx.landDust(c.clone().add(tmp.set(Math.cos(i * 2.1) * 2.2, 0, Math.sin(i * 2.1) * 2.2)), 12); g.audio?.impact(0.7); });
  }
  kuchisake() {
    const g = this.game, c = this.aimGround(11), R = 4;
    this.cast(0.4, true);
    g.toast?.('"Am I pretty?"');
    const list = this.foes(c, R);
    for (const e of list) this.stun(e, 1.4);
    sigil(this, c, R, 0xff5a7a, 0.6);
    g.audio?.tone({ freq: 500, to: 380, dur: 0.6, gain: 0.08, type: 'triangle', rev: 0.6 });
    this.after(0.9, () => {
      for (const e of list) if (!e.dead) {
        const at = e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.6);
        g.fx.slashX(at, 1.6, 0xd8d8e8);
        this.hit(e, 48 * this.stockMul, { stagger: 0.9, unblockable: true, color: '#ff8aa0' });
      }
      g.audio?.energy('slash'); g.shake(0.3);
    });
  }
  uzumaki() {
    const g = this.game, p = this.p, CH = 0.9;
    p.action = { type: 'cast', both: true, dur: CH + 0.5, elapsed: 0, t: 0, moveScale: 0.05, lock: true, hold: true, cancelable: false, faceAim: true };
    g.toast?.('Maximum: Uzumaki'); g.audio?.charge(CH, 0.6);
    const orb = makeOrb(SPIRIT, { radius: 0.3, darkCore: true });
    temp(this, orb, CH, (t, dt, k) => {
      orb.position.copy(this.handPos()).setY(p.pos.y + 2.2); orb.scale.setScalar(0.3 + k * 1.2); orb.rotation.y += dt * 8;
      for (let i = 0; i < 3; i++) { const a = t * 10 + i * 2.1, rr = 3 * (1 - k) + 0.6; g.particles.burst(tmp.set(orb.position.x + Math.cos(a) * rr, orb.position.y + Math.sin(a * 0.5) * 0.5, orb.position.z + Math.sin(a) * rr), { count: 1, color: i ? SPIRIT : 0x1a0a20, additive: i > 0, speed: 0.3, life: 0.4, size: 0.4, sizeEnd: 0.05 }); }
    });
    this.after(CH, () => {
      const from = this.handPos().setY(p.pos.y + 1.6), { dir } = aimAt(this, from, 26);
      beam(this, from, dir, 26, 2.2, SPIRIT, { dmg: 150 * this.stockMul, core: 0xffd8ff, pierce: true, knock: 14, stagger: 1, unblockable: true, dur: 0.7 });
      this.after(0.1, () => beam(this, from, dir, 26, 1.2, 0xff5aa8, { dmg: 30 * this.stockMul, core: 0xffffff, pierce: true, light: false, dur: 0.5 }));
      g.fx.flash(0x8a3aff, 0.4, 0.3); g.fx.chroma(1.2); g.shake(0.8); g.hitStop(0.06); g.audio?.energy('purple');
    });
  }
  // ------------------------------------------------------------ Barriers
  curtain() {
    const g = this.game, c = this.aimGround(12), R = 5, dur = 5 * this.barrierMul;
    this.cast(0.5, true);
    g.toast?.('"Emerging from the darkness, blacker than black…"');
    const dome = mesh(GEO.sphere, mat(BARRIER, { opacity: 0.55, roughness: 0.2, metalness: 0.5, side: THREE.DoubleSide }), [R, R * 0.8, R]);
    const trapped = this.foes(c, R);
    for (const e of trapped) e.curtained = true;
    let tick = 0;
    temp(this, dome, dur, (t, dt, k) => {
      dome.position.copy(c); dome.scale.set(R, R * 0.8 * Math.min(1, t * 2.5), R);
      for (const e of trapped) if (!e.dead) { this.slow(e, 0.5); tmp.subVectors(e.pos, c).setY(0); if (tmp.length() > R - 0.6) e.pos.set(c.x, e.pos.y, c.z).addScaledVector(tmp.setLength(R - 0.6), 1); }
      tick -= dt; if (tick <= 0) { tick = 0.5; if (Math.random() < 0.6) g.particles.burst(tmp.set(c.x + (Math.random() - 0.5) * R, c.y + R * 0.6, c.z + (Math.random() - 0.5) * R), { count: 3, color: 0x050508, additive: false, speed: 1, gravity: 2, life: 0.8, size: 0.6, sizeEnd: 0.1 }); }
    }, () => { for (const e of trapped) e.curtained = false; });
    this.edictOn = true; this.after(dur, () => { this.edictOn = false; });
    g.audio?.tone({ freq: 80, to: 60, dur: 1.2, gain: 0.25, type: 'sawtooth', filter: 400, rev: 0.5 });
  }
  wall() {
    const g = this.game, p = this.p, f = this.fwd(), c = p.pos.clone().addScaledVector(f, 2.2), dur = 5 * this.barrierMul;
    this.cast(0.35, true);
    const w = mesh(GEO.box, mat(0x2a2a3a, { opacity: 0.6, emissive: 0.4, emissiveColor: GRAV, roughness: 0.2 }), [6, 3, 0.3]);
    w.rotation.y = Math.atan2(f.x, f.z);
    temp(this, w, dur, (t) => {
      w.position.set(c.x, this.groundAt(c.x, c.z, c.y) + 1.5 * Math.min(1, t * 4), c.z); w.scale.y = 3 * Math.min(1, t * 4);
      for (const q of [...g.projectiles.list]) if (q.team === 'enemy') { tmp.subVectors(q.pos, c); if (Math.abs(tmp.dot(f)) < 0.6 && Math.abs(tmp.x * f.z - tmp.z * f.x) < 3.2 && tmp.y < 3.5) { g.particles.burst(q.pos, { count: 6, color: GRAV, speed: 2, life: 0.3, size: 0.2 }); g.projectiles.kill(q, 'barrier'); } }
      for (const e of this.foes(c, 3.5)) { tmp.subVectors(e.pos, c); const s = tmp.dot(f); if (Math.abs(s) < 0.9 && Math.abs(tmp.x * f.z - tmp.z * f.x) < 3.2) e.pos.addScaledVector(f, (s >= 0 ? 1 : -1) * (0.9 - Math.abs(s))); }
    });
    g.audio?.energy('infinity');
  }
  seal() {
    const g = this.game, p = this.p, dur = 4 * this.barrierMul;
    this.cast(0.3, true);
    const shells = [1.3, 1.6].map((r, i) => mesh(GEO.box, mat(0x1a1a2a, { opacity: 0.35, emissive: 0.5, emissiveColor: i ? GRAV : PALE }), r * 1.6));
    g.audio?.energy('infinity');
    this.buff('seal', dur, {
      onStart: () => shells.forEach((s) => g.scene.add(s)),
      incoming: (a) => a * 0.4,
      onTick: () => shells.forEach((s, i) => { s.position.set(p.pos.x, p.pos.y + 1, p.pos.z); s.rotation.set(g.time * (i ? 0.7 : -0.5), g.time * (i ? 0.4 : 0.9), 0); }),
      onEnd: () => shells.forEach((s) => g.scene.remove(s)),
    });
  }
  // ------------------------------------------------------------ Mastermind
  levitate() {
    const g = this.game, p = this.p, to = this.aimGround(10), from = p.pos.clone();
    p.invulnerable = true;
    p.action = { type: 'cast', both: true, dur: 0.6, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.audio?.tone({ freq: 300, to: 800, dur: 0.6, gain: 0.07, type: 'sine', rev: 0.5 });
    this.during(0.55, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 3;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.1, p.pos.z), { count: 2, color: GRAV, speed: 0.5, life: 0.5, size: 0.25, sizeEnd: 0.05 });
    }, () => {
      p.invulnerable = false; p.action = null;
      this.blast(p.pos.clone(), 3, 16 * this.gravMul, { color: GRAV, knock: 12, stagger: 0.5, explode: false });
    });
  }
  deathPainting() {
    const g = this.game, p = this.p, to = this.aimGround(12), from = this.handPos();
    this.cast(0.35);
    const womb = mesh(GEO.ico, mat(0x8a3a4a, { roughness: 0.4, emissive: 0.3 }), 0.4);
    g.markers.spawn({ pos: to, dur: 0.6, radius: 3, color: FLESH });
    temp(this, womb, 0.6, (t, dt, k) => { womb.position.lerpVectors(from, to, k); womb.position.y += Math.sin(k * Math.PI) * 3; womb.rotation.x += dt * 5; }, () => {
      this.blast(to, 3, 26, { color: FLESH, knock: 5, stagger: 0.5, explode: false });
      g.particles.burst(to.clone().setY(to.y + 0.5), { count: 30, color: 0xa01020, speed: 6, up: 2, life: 0.7, size: 0.15, gravity: 14, shape: 1, intensity: 1.4 });
      g.hazards.add({ pos: to, radius: 2.4, dps: 14, dur: 4, color: 0xa01020, team: 'player', src: p });
      g.audio?.energy('spit'); g.audio?.impact(1);
    });
  }
  edict() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const list = this.foes(p.pos, 12);
    if (!list.length) { g.toast?.('No curses to judge'); g.audio?.ui('back'); return false; }
    g.toast?.('New rule: every curse that dies here feeds me');
    for (const e of list) e.edictT = g.time + 8;
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0xffd84a, r0: 1, r1: 12, dur: 0.6, thick: 0.15 });
    g.audio?.gong();
  }
  onKill(e) {
    if (e.edictT && e.edictT > this.game.time) { this.p.gainCE(6); this.p.heal?.(this.p.maxHp * 0.03, true); this.game.particles.burst(e.pos.clone().setY(e.pos.y + 1), { count: 10, color: 0xffd84a, speed: 3, up: 2, life: 0.6, size: 0.2 }); }
  }
  scheming() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    g.toast?.('A thousand years of scheming'); g.fx.flash(0x5a2a8a, 0.3, 0.3); g.audio?.energy('infinity');
    this.buff('scheming', 10, {
      onStart: () => { this.ceMul *= 0.0001; this.cdMul *= 0.7; },
      onTick: () => { if (Math.random() < 0.3) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 2.4, p.pos.z), { count: 1, color: GRAV, speed: 0.6, up: 1, life: 0.6, size: 0.18 }); },
      onEnd: () => { this.ceMul /= 0.0001; this.cdMul /= 0.7; },
    });
  }
  // ------------------------------------------------------------ Domain
  buildWomb(g, d) {
    this.clearWomb();
    const grp = new THREE.Group(), c = d.center, gy = this.groundAt(c.x, c.z, c.y);
    const flesh = mat(0x9a2a3a, { roughness: 0.35, emissive: 0.25 }), vein = mat(0x5a0a1a, { roughness: 0.4, emissive: 0.4, emissiveColor: 0xff3a5a }), cord = mat(0xd87a8a, { roughness: 0.3 });
    // a ring of fleshy walls folding inward like a womb
    const N = 30;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, R = d.radius - 0.8, h = 8 + Math.random() * 6;
      const w = mesh(GEO.sphere, flesh, [3.2, h, 2.6]);
      w.position.set(c.x + Math.cos(a) * R, gy + h * 0.4, c.z + Math.sin(a) * R); w.rotation.y = -a; w.rotateZ(0.25); grp.add(w);
      if (i % 3 === 0) { const v = mesh(GEO.box, vein, [0.3, h * 1.1, 0.3]); v.position.set(c.x + Math.cos(a) * (R - 1.4), gy + h * 0.45, c.z + Math.sin(a) * (R - 1.4)); v.rotation.z = (Math.random() - 0.5) * 0.4; grp.add(v); }
    }
    // umbilical cords hanging from above, and swollen pods on the floor
    this.cords = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, rr = d.radius - 3 - Math.random() * 4;
      const cd = mesh(GEO.cylSolid, cord, [0.25, 10, 0.25]); cd.position.set(c.x + Math.cos(a) * rr, gy + 11, c.z + Math.sin(a) * rr); grp.add(cd); this.cords.push(cd);
      const pr = 5 + Math.random() * (d.radius - 9); const pod = mesh(GEO.sphere, flesh, [1 + Math.random(), 0.7 + Math.random() * 0.5, 1 + Math.random()]); pod.position.set(c.x + Math.cos(a + 0.4) * pr, gy + 0.3, c.z + Math.sin(a + 0.4) * pr); grp.add(pod);
    }
    this.womb = rise(this, grp, -10, 0.7);
    this.wombLight = g.lights.flash(c.clone().setY(gy + 8), FLESH, 5, d.radius * 2, 60, { priority: 4, fade: false });
  }
  clearWomb() {
    const g = this.game;
    if (this.womb) { g.scene.remove(this.womb); this.womb = null; }
    if (this.wombLight) { g.lights.remove(this.wombLight); this.wombLight = null; }
  }
  wombTick(g, d, dt) {
    for (const [i, cd] of (this.cords ?? []).entries()) cd.rotation.z = Math.sin(g.time * 0.8 + i) * 0.08;
    if (this.womb) this.womb.children.forEach((m, i) => { if (i % 4 === 0) m.scale.x = 3.2 * (1 + Math.sin(g.time * 2 + i) * 0.04); });
    d.phaseT = (d.phaseT ?? 0.5) - dt;
    if (d.phaseT > 0) return;
    d.lifted = !d.lifted;
    d.phaseT = d.lifted ? 0.6 : 0.5;
    const slam = 1 + this.rank('womb') * 0.25;
    for (const e of insideFoes(g)) {
      if (d.lifted) {
        // weightless: lifted helpless into the air
        this.stun(e, 0.7);
        if (!e.isBoss) e.vel.y = 12;
        g.particles.burst(e.pos.clone().setY(e.pos.y + 0.2), { count: 6, color: GRAV, speed: 1, up: 3, life: 0.6, size: 0.25 });
      } else {
        // gravity returns all at once
        if (!e.isBoss) e.vel.y = -32;
        const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6);
        this.hit(e, (e.isBoss ? mx * 0.022 : Math.max(16, mx * 0.2)) * slam, { stagger: e.isBoss ? 0 : 0.6, unblockable: true, crit: false, ceGain: 0, color: '#ff8aa0' });
        g.fx.shockwave(e.pos, FLESH, 1.8);
      }
    }
    if (!d.lifted) { g.shake(0.25); g.audio?.impact(1.1); }
  }
}
registerKit('kenjaku', KenjakuKit, KENJAKU_SKILLS);
