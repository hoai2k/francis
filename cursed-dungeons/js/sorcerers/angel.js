// Hana Kurusu / Angel-style kit — Jacob's Ladder, the Heian sorcerer's light
// that extinguishes every cursed technique it touches. 20 abilities on the
// technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB        a light, darting fighter's strikes, the last a radiant palm.
//   Heaven     Holy Arrow (start, RMB), Feather Volley, Ray of Jacob's Ladder,
//              Ladder of Light, Divine Lance, Choir of Heaven
//   Wings      Flight, Wing Gust, Feather Storm, Wing Shield, Angelic Descent
//   Halo       Halo Disc, Halo Bind, Crown of Light, Sun Flare
//   Purify     Technique Extinguishment, Sanctuary, Hana's Healing, Judgement,
//              Seraph Form, Eyes of the Angel
//   F          Ultimate: Jacob's Ladder (no canon domain) — a vast column of light
//              falls from the heavens over the battlefield and erases curses.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { GEO, glow, mat, temp, mesh, beam, pillar, meshShot, pull, sigil, aimAt, makeOrb } from './fxlib.js';

const HOLY = 0xfff0b0, GOLD = 0xffcc4a, SKY = 0xbfe8ff, WHITE = 0xffffff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('angel', { name: 'Angel', technique: 'Jacob\'s Ladder', rarity: 'epic', title: 'Hana Kurusu', desc: 'Arrows and rays of heavenly light, wings and a halo, and a light that extinguishes cursed techniques.', ultimate: 'Jacob\'s Ladder', color: '#fff0b0' });

registerLook('angel', {
  paint: { skinTone: 0xf6dcc8, hair: 0xf0dca0, hairVolume: true, top: 0xf4f0e8, collar: 0xf4f0e8, topTrim: 0xd8b040, buttons: 0xd8b040, sleeve: 0xf4f0e8, pants: 0xf4f0e8, skirt: 0xf4f0e8, tights: 0xe8e0d8, shoes: 0xd8c8a8, eye: 0xd8a040, eyeWhite: 0xffffff, fringe: 3, hairSide: 7, hairBack: 8, blush: true },
  paintExtra(S) { S.mat = 'cloth'; S.rect(20, 28, 8, 1, 0xd8b040, 0.05); for (let x = 16; x < 32; x += 3) S.px(x, 31, 0xd8b040); },
  hair: (m) => [
    { x: 0, y: 8, z: -0.4, w: 8, h: 1.5, d: 8, material: m },
    { x: -3.6, y: 4, z: 0, w: 2, h: 11, d: 6, hang: true, material: m, stiff: 22 },
    { x: 3.6, y: 4, z: 0, w: 2, h: 11, d: 6, hang: true, material: m, stiff: 22 },
    { x: 0, y: 5, z: -3.7, w: 8, h: 14, d: 2, hang: true, material: m, stiff: 20 },
  ],
  hairColor: 0xf0dca0, accent: HOLY, emit: 0.3, cape: null, scale: 1.12,
  props(rig, K) {
    const feather = K.mat(0xffffff, { roughness: 0.8, emissive: 0.25 }), eye = K.mat(0x3a2a6a, { emissive: 0.6, emissiveColor: 0x8a6aff }), halo = K.mat(GOLD, { emissive: 3 });
    // four great wings, their feathers dotted with eyes
    for (const s of [-1, 1]) for (const [y, len, rz] of [[9, 12, 0.5], [5, 9, 0.9]]) {
      const w = K.box(rig.torso, len, 3, 0.8, feather, s * (len / 2 + 2), y, -2.8, 0, s * 0.3, s * rz);
      for (let i = 1; i < 4; i++) K.box(w, 1, 1, 0.3, eye, i * len / 4 - len / 2, 0, 0.5);
    }
    // the halo
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.box(rig.head, 1.2, 0.5, 1.2, halo, Math.cos(a) * 4, 11, Math.sin(a) * 4 - 0.5, 0, -a, 0); }
  },
});

export const ANGEL_SKILLS = [
  { id: 'grace', name: 'Grace', icon: '🕊️', desc: '+8% movement speed and +10 max health per rank.', max: 3, branch: 'Wings', tier: 0 },
  { id: 'radiance', name: 'Radiance', icon: '✨', desc: 'Light techniques hit harder.', max: 3, req: 'ab:arrow', branch: 'Heaven', tier: 1 },
  { id: 'halo', name: 'Halo', icon: '😇', desc: 'Halo techniques hold curses longer.', max: 2, req: 'ab:halo_disc', branch: 'Halo', tier: 2 },
  { id: 'mercy', name: 'Mercy', icon: '💛', desc: 'Healing techniques restore more.', max: 2, req: 'ab:sanctuary', branch: 'Purify', tier: 2 },
  { id: 'ladder', name: 'Stairway to Heaven', icon: '🪜', desc: 'Jacob\'s Ladder is wider and burns longer.', max: 2, req: 'ab:ray', branch: 'Heaven', tier: 4 },
];

class AngelKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const holy = { trail: HOLY, sparkColor: GOLD };
    this.combo = [
      { ...holy, style: 'swingR', dur: 0.28, windup: 0.26, strike: 0.5, dmg: 11, range: 2.6, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.12 },
      { ...holy, style: 'swingL', dur: 0.28, windup: 0.26, strike: 0.5, dmg: 12, range: 2.6, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.12 },
      { ...holy, style: 'punch', dur: 0.45, windup: 0.38, strike: 0.58, dmg: 22, range: 3.2, arc: 1.1, lunge: 4, knock: 9, stop: 0.07, shake: 0.3, ring: true, ringColor: HOLY, stagger: 0.6, radiant: true },
    ];
    this.p.stats.speed += r('grace') * 0.08;
    this.p.maxHp += r('grace') * 10; this.p.hp = Math.min(this.p.hp + r('grace') * 10, this.p.maxHp);
    this.branches = ['Heaven', 'Wings', 'Halo', 'Purify'];
    this.lightMul = 1 + r('radiance') * 0.15; this.healMul = 1 + r('mercy') * 0.25;
    this.library = {
      // ---- Heaven
      arrow: ability({ name: 'Holy Arrow', icon: '🏹', kind: 'basic', desc: 'An arrow of heavenly light that pierces two curses.', cd: 0.7, ce: 0, branch: 'Heaven', tier: 0, start: true, legacy: 'ranged', use: () => this.arrow() }),
      feathers: ability({ name: 'Feather Volley', icon: '🪶', kind: 'basic', desc: 'Loose a fan of razor feathers of light from your wings.', cd: 1.1, ce: 0, branch: 'Heaven', tier: 1, req: 'arrow', use: () => this.feathers() }),
      ray: ability({ name: 'Ray of Jacob\'s Ladder', icon: '🔆', kind: 'technique', desc: 'A ray of the ladder\'s light falls on the targeted curse, burning it and extinguishing its technique (its attack is cancelled).', cd: 7, ce: 14, branch: 'Heaven', tier: 1, legacy: 't1', req: 'arrow', use: () => this.ray() }),
      ladder_line: ability({ name: 'Ladder of Light', icon: '🪜', kind: 'technique', desc: 'Rays of light fall one after another in a line toward the aim.', cd: 9, ce: 16, branch: 'Heaven', tier: 2, req: 'ray', use: () => this.ladderLine() }),
      lance: ability({ name: 'Divine Lance', icon: '🔱', kind: 'technique', desc: 'Hurl a spear of light that explodes into a burst of radiance.', cd: 8, ce: 14, branch: 'Heaven', tier: 2, req: 'feathers', use: () => this.lance() }),
      choir: ability({ name: 'Choir of Heaven', icon: '🎶', kind: 'technique', desc: 'For 3s rays rain on every curse around you, one after another.', cd: 22, ce: 42, branch: 'Heaven', tier: 4, legacy: 't3', req: ['ladder_line', 'lance'], use: () => this.choir() }),
      // ---- Wings
      flight: ability({ name: 'Flight', icon: '🪽', kind: 'movement', desc: 'Spread your wings and fly to the aim, landing in a burst of feathers.', cd: 6, ce: 6, branch: 'Wings', tier: 1, use: () => this.flight() }),
      gust: ability({ name: 'Wing Gust', icon: '🌬️', kind: 'technique', desc: 'One beat of your wings blows curses back in a wide cone.', cd: 7, ce: 10, branch: 'Wings', tier: 2, req: 'flight', use: () => this.gust() }),
      storm: ability({ name: 'Feather Storm', icon: '🌪️', kind: 'technique', desc: 'Feathers of light whirl around you for 3s, slicing every curse close by.', cd: 12, ce: 16, branch: 'Wings', tier: 3, req: 'gust', use: () => this.storm() }),
      descent: ability({ name: 'Angelic Descent', icon: '🌤️', kind: 'movement', desc: 'Rise into the sky and descend on the targeted curse wrapped in a ray of the ladder.', cd: 10, ce: 12, branch: 'Wings', tier: 3, req: 'wing_shield', use: () => this.descent() }),
      wing_shield: ability({ name: 'Wing Shield', icon: '🛡️', kind: 'defence', desc: 'Wrap your wings around yourself for 3s: hits are almost completely blocked.', cd: 14, ce: 10, branch: 'Wings', tier: 2, req: 'flight', use: () => this.wingShield() }),
      // ---- Halo
      halo_disc: ability({ name: 'Halo Disc', icon: '⭕', kind: 'technique', desc: 'Throw your halo: it slices out and back like a boomerang.', cd: 6, ce: 10, branch: 'Halo', tier: 1, legacy: 't2', use: () => this.haloDisc() }),
      halo_bind: ability({ name: 'Halo Bind', icon: '😇', kind: 'technique', desc: 'Halos of light lock around the curses at the aim and hold them still.', cd: 11, ce: 14, branch: 'Halo', tier: 2, req: 'halo_disc', use: () => this.haloBind() }),
      crown: ability({ name: 'Crown of Light', icon: '👑', kind: 'buff', desc: 'For 10s your halo blazes: +20% technique damage and you regenerate health.', cd: 24, ce: 16, branch: 'Halo', tier: 3, req: 'halo_bind', use: () => this.crown() }),
      flare: ability({ name: 'Sun Flare', icon: '🌞', kind: 'technique', desc: 'A blinding flash from your halo: curses around you are dazed.', cd: 12, ce: 12, branch: 'Halo', tier: 3, req: 'halo_disc', use: () => this.flare() }),
      // ---- Purify
      extinguish: ability({ name: 'Technique Extinguishment', icon: '🕯️', kind: 'technique', desc: 'The light of Jacob\'s Ladder washes over everything around you: curses\' attacks and shields are erased, and they burn.', cd: 10, ce: 16, branch: 'Purify', tier: 1, use: () => this.extinguish() }),
      sanctuary: ability({ name: 'Sanctuary', icon: '⛪', kind: 'heal', desc: 'A circle of light for 6s: you and your allies inside heal, and curses inside burn.', cd: 20, ce: 18, branch: 'Purify', tier: 2, req: 'extinguish', use: () => this.sanctuary() }),
      healing: ability({ name: 'Hana\'s Healing', icon: '💗', kind: 'heal', desc: 'Restore 30% of your health at once.', cd: 18, ce: 14, branch: 'Purify', tier: 2, req: 'extinguish', use: () => this.healing() }),
      judgement: ability({ name: 'Judgement', icon: '⚖️', kind: 'technique', desc: 'Mark every curse near the aim; after a moment a ray of light falls on each.', cd: 14, ce: 20, branch: 'Purify', tier: 3, req: 'sanctuary', use: () => this.judgement() }),
      seraph: ability({ name: 'Seraph Form', icon: '👼', kind: 'buff', desc: 'Angel takes over for 12s: +25% technique damage, faster movement and every hit has a chance to call down a ray.', cd: 40, ce: 30, branch: 'Purify', tier: 4, req: ['judgement', 'healing'], use: () => this.seraph() }),
    };
    this.passives = {
      eyes: passive({ name: 'Eyes of the Angel', icon: '👁️', desc: '+8% critical chance; rays seek out the curse you aim at.', branch: 'Purify', tier: 2, req: 'extinguish', apply: (pl) => { pl.stats.crit += 0.08; } }),
      featherlight: passive({ name: 'Featherlight', icon: '🪶', desc: 'Flight and Wing Gust cool down 25% faster; +5% movement speed.', branch: 'Wings', tier: 2, req: 'flight', apply: (pl, k) => { k.library.flight.cd *= 0.75; k.library.gust.cd *= 0.75; pl.stats.speed += 0.05; } }),
      blessing: passive({ name: 'Blessing', icon: '🙏', desc: 'Every heal also restores 6 Cursed Energy and +10% healing.', branch: 'Purify', tier: 3, req: 'sanctuary', apply: (pl, k) => { k.blessing = true; k.healMul *= 1.1; } }),
      purity: passive({ name: 'Purity', icon: '🤍', desc: 'Light techniques deal 25% more damage to bosses and elites.', branch: 'Heaven', tier: 3, req: 'ray', apply: (pl, k) => { k.purity = true; } }),
    };
    this.ultimate = { name: 'Jacob\'s Ladder', icon: '🪜', use: () => this.jacobsLadder() };
  }
  holy(e, dmg, o = {}) { return this.hit(e, dmg * this.lightMul * (this.purity && (e.isBoss || e.elite) ? 1.25 : 1), { color: '#fff0b0', ...o }); }
  healSelf(frac) { const p = this.p; p.heal?.(p.maxHp * frac * this.healMul, false); if (this.blessing) p.gainCE(6); }
  onMeleeHit(e, step) { if (step.radiant) { this.holy(e, 10, { stagger: 0.3 }); this.game.fx.flash(HOLY, 0.08, 0.1); } }
  onHitEnemy(e) { if (this.buffs.has('seraph') && Math.random() < 0.15 && !this.raying) { this.raying = true; this.rayOn(e.pos.clone(), 0.9, 20, 0.25); this.after(0.3, () => { this.raying = false; }); } }
  // a ray of Jacob's Ladder falling on `at` after `warn` seconds
  rayOn(at, R, dmg, warn = 0.35, o = {}) {
    const g = this.game;
    at.y = this.groundAt(at.x, at.z, at.y);
    if (warn > 0.05) g.markers.spawn({ pos: at, dur: warn, radius: R, color: GOLD });
    this.after(warn, () => {
      pillar(this, at, R * 0.8, 26, HOLY, 0.6, { core: WHITE });
      for (const e of this.foes(at, R + 0.3)) { this.holy(e, dmg, { stagger: 0.5, unblockable: true }); e.cancelAttack?.(); if (o.stun) this.stun(e, o.stun); }
      g.fx.rings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: HOLY, r0: 0.2, r1: R + 0.8, dur: 0.35, thick: 0.12 });
      g.particles.burst(at.clone().setY(at.y + 0.4), { count: 12, color: HOLY, speed: 3, up: 4, life: 0.7, size: 0.2 });
      if (o.sound !== false) g.audio?.tone({ freq: 1320, to: 1760, dur: 0.4, gain: 0.06, type: 'sine', rev: 0.6 });
    });
  }
  // ------------------------------------------------------------ Heaven
  arrow() {
    const g = this.game;
    this.cast(0.24);
    const { dir } = aimAt(this, this.handPos(), 18);
    let n = 0;
    meshShot(this, mesh(GEO.box, glow(HOLY, 3), [0.1, 0.1, 1.2]), { pos: this.handPos(), vel: dir.clone().multiplyScalar(30), life: 0.7, radius: 0.45, pierce: true, light: 2, color: HOLY,
      trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color: HOLY, speed: 0.2, life: 0.25, size: 0.15 }); },
      onHit: (e, q) => { this.holy(e, 13, { stagger: 0.25, knock: q.vel.clone().setY(0).setLength(2) }); g.fx.hitSpark(q.pos, dir, { color: HOLY }); if (++n >= 2) g.projectiles.kill(q, 'hit'); } });
    g.audio?.tone({ freq: 1400, to: 2000, dur: 0.12, gain: 0.06, type: 'sine', rev: 0.3 });
  }
  feathers() {
    const g = this.game, base = this.aimAngle();
    this.cast(0.3);
    for (let i = 0; i < 7; i++) {
      const a = base + (i - 3) * 0.12;
      meshShot(this, mesh(GEO.box, glow(WHITE, 2), [0.05, 0.25, 0.7]), { pos: this.p.pos.clone().setY(this.p.pos.y + 1.8), vel: new THREE.Vector3(Math.sin(a), -0.05, Math.cos(a)).multiplyScalar(24), life: 0.55, radius: 0.35,
        onHit: (e, q) => { this.holy(e, 7, { stagger: 0.12, knock: q.vel.clone().setY(0).setLength(1) }); } });
    }
    g.audio?.whoosh(0.9);
  }
  ray() {
    const g = this.game, t = this.target(16), at = t ? t.pos.clone() : this.aimGround(14);
    this.cast(0.4, true);
    this.rayOn(at, 1.6, 42, 0.35, { stun: 0.6 });
  }
  ladderLine() {
    const g = this.game, p = this.p, f = this.fwd();
    this.cast(0.45, true);
    for (let i = 0; i < 6; i++) this.rayOn(p.pos.clone().addScaledVector(f, 2.5 + i * 2.2), 1.5, 30, 0.3 + i * 0.1, { sound: i % 2 === 0 });
  }
  lance() {
    const g = this.game, p = this.p;
    this.cast(0.35);
    const { dir } = aimAt(this, this.handPos(), 18);
    meshShot(this, mesh(GEO.box, glow(GOLD, 3), [0.18, 0.18, 2.2]), { pos: this.handPos(), vel: dir.clone().multiplyScalar(26), life: 0.75, radius: 0.5, light: 3, color: GOLD,
      onExpire: (q) => { this.blast(q.pos.clone(), 3, 34 * this.lightMul, { color: HOLY, knock: 7, stagger: 0.6 }); g.fx.flash(HOLY, 0.12, 0.12); } });
    g.audio?.whoosh(1.1);
  }
  choir() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    g.toast?.('Choir of Heaven'); g.audio?.tone({ freq: 523, dur: 2.5, gain: 0.05, type: 'triangle', rev: 0.8 }); g.audio?.tone({ freq: 659, dur: 2.5, gain: 0.05, type: 'triangle', rev: 0.8, at: 0.2 });
    let tick = 0;
    this.during(3, (t, dt) => {
      tick -= dt; if (tick > 0) return; tick = 0.16;
      const list = this.foes(p.pos, 13);
      const e = list.length ? list[Math.floor(Math.random() * list.length)] : null;
      const at = e ? e.pos.clone() : p.pos.clone().add(tmp.set((Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 18));
      this.rayOn(at, 1.4, 28, 0.15, { sound: Math.random() < 0.3 });
    });
  }
  // ------------------------------------------------------------ Wings
  flight() {
    const g = this.game, p = this.p, to = this.aimGround(12), from = p.pos.clone();
    p.invulnerable = true;
    p.action = { type: 'cast', both: true, dur: 0.6, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.audio?.whoosh(1.4);
    this.during(0.5, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 4;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1.4, p.pos.z), { count: 2, color: WHITE, speed: 1, life: 0.6, size: 0.18, gravity: 1 });
    }, () => {
      p.invulnerable = false; p.action = null;
      this.blast(p.pos.clone(), 2.8, 18 * this.lightMul, { color: HOLY, knock: 8, stagger: 0.5, explode: false });
      g.particles.burst(p.pos.clone().setY(p.pos.y + 0.8), { count: 24, color: WHITE, speed: 4, up: 2, life: 0.9, size: 0.2, gravity: 2 });
    });
  }
  gust() {
    const g = this.game, p = this.p, f = this.fwd(), R = 7;
    this.cast(0.4, true);
    for (const e of this.foes(p.pos, R, f, 0.9)) { this.holy(e, 14, { stagger: 0.5, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(16) }); }
    for (let i = 0; i < 30; i++) { const a = Math.atan2(f.x, f.z) + (Math.random() - 0.5) * 1.8; g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1 + Math.random(), p.pos.z), { count: 1, color: WHITE, speed: 14, spread: 0.1, dir: tmp2.set(Math.sin(a) * 14, 0, Math.cos(a) * 14), life: 0.4, size: 0.18, drag: 2 }); }
    g.fx.screenWave(p.pos.clone().addScaledVector(f, 2), 0.6, 0.3);
    g.audio?.noise({ dur: 0.5, gain: 0.35, type: 'lowpass', freq: 600, sweep: 1800 });
  }
  storm() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const feathers = [];
    for (let i = 0; i < 10; i++) { const m = mesh(GEO.box, glow(i % 2 ? WHITE : HOLY, 2), [0.05, 0.22, 0.6]); g.scene.add(m); feathers.push(m); }
    let tick = 0;
    this.during(3, (t, dt) => {
      feathers.forEach((m, i) => { const a = t * 7 + i / feathers.length * Math.PI * 2, rr = 2 + Math.sin(t * 3 + i) * 0.5; m.position.set(p.pos.x + Math.cos(a) * rr, p.pos.y + 0.6 + (i % 3) * 0.5, p.pos.z + Math.sin(a) * rr); m.rotation.y = -a; });
      tick -= dt; if (tick <= 0) { tick = 0.25; for (const e of this.foes(p.pos, 2.8)) this.holy(e, 8, { stagger: 0.15 }); }
    }, () => { for (const m of feathers) g.scene.remove(m); });
    g.audio?.whoosh(1);
  }
  wingShield() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const wings = new THREE.Group();
    for (const s of [-1, 1]) { const w = mesh(GEO.box, mat(WHITE, { emissive: 0.4, roughness: 0.8 }), [1.6, 2.2, 0.2]); w.position.set(s * 0.6, 1.1, 0.5); w.rotation.y = -s * 0.6; wings.add(w); }
    this.buff('wing_shield', 3, {
      onStart: () => g.scene.add(wings),
      incoming: (a) => { g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1.2, p.pos.z), { count: 5, color: WHITE, speed: 2, life: 0.5, size: 0.15 }); return a * 0.1; },
      onTick: () => { wings.position.copy(p.pos); wings.rotation.y = p.facing; },
      onEnd: () => g.scene.remove(wings),
    });
    g.audio?.energy('infinity');
  }
  descent() {
    const g = this.game, p = this.p, t = this.target(14);
    const to = t ? t.pos.clone() : this.aimGround(12), from = p.pos.clone();
    to.y = this.groundAt(to.x, to.z, p.pos.y);
    p.invulnerable = true;
    p.action = { type: 'cast', both: true, dur: 0.75, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.markers.spawn({ pos: to, dur: 0.7, radius: 2.6, color: GOLD });
    this.during(0.7, (tt, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(Math.min(1, k * 1.2) * Math.PI) * 8;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1.4, p.pos.z), { count: 2, color: WHITE, speed: 1, life: 0.6, size: 0.2, gravity: 1 });
    }, () => {
      p.invulnerable = false; p.action = null;
      this.rayOn(p.pos.clone(), 2.6, 44, 0.02, { stun: 0.8 });
      g.particles.burst(p.pos.clone().setY(p.pos.y + 0.8), { count: 30, color: WHITE, speed: 5, up: 2, life: 1, size: 0.2, gravity: 2 });
    });
    g.audio?.whoosh(1.5);
  }
  // ------------------------------------------------------------ Halo
  haloDisc() {
    const g = this.game, p = this.p, f = this.fwd(), L = 11;
    this.cast(0.3);
    const ring = mesh(GEO.torus, glow(GOLD, 3), 0.8); ring.rotation.x = Math.PI / 2;
    const hit = new Set(), start = p.pos.clone().setY(p.pos.y + 1.2);
    temp(this, ring, 1.1, (t, dt, k) => {
      const out = Math.sin(k * Math.PI) * L;
      const back = k > 0.5 ? tmp.copy(p.pos).setY(p.pos.y + 1.2) : start;
      ring.position.copy(start).lerp(back, Math.max(0, k - 0.5) * 2).addScaledVector(f, out); ring.rotation.z += dt * 18;
      if (k > 0.5 && hit.size && !ring.userData.reset) { hit.clear(); ring.userData.reset = true; }
      for (const e of this.foes(ring.position, 1.3)) if (!hit.has(e)) { hit.add(e); this.holy(e, 18, { stagger: 0.4 }); g.fx.hitSpark(ring.position, null, { color: GOLD }); }
      if (Math.random() < 0.5) g.particles.burst(ring.position, { count: 1, color: GOLD, speed: 0.3, life: 0.3, size: 0.2 });
    });
    g.audio?.whoosh(1);
  }
  haloBind() {
    const g = this.game, c = this.aimGround(12), R = 4;
    this.cast(0.4, true);
    const list = this.foes(c, R).slice(0, 8);
    if (!list.length) { this.rayOn(c, 1.5, 20, 0.3); return; }
    const dur = 2.2 + this.rank('halo') * 0.6;
    for (const e of list) {
      this.stun(e, dur); e.cancelAttack?.();
      const ring = mesh(GEO.torus, glow(GOLD, 3), (e.radius ?? 0.5) + 0.6); ring.rotation.x = Math.PI / 2;
      temp(this, ring, dur, (t) => { if (e.dead) return false; ring.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) * 0.5 + Math.sin(t * 4) * 0.2, e.pos.z); });
      this.holy(e, 14, { stagger: 0.3 });
    }
    g.audio?.tone({ freq: 880, to: 1320, dur: 0.3, gain: 0.06, type: 'sine', rev: 0.5 });
  }
  crown() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.fx.flash(HOLY, 0.2, 0.25); g.audio?.energy('heal');
    this.statBuff('crown', 10, { techMult: 0.2 }, {
      onTick: (dt) => { p.heal?.(p.maxHp * 0.012 * dt * this.healMul, true); if (Math.random() < 0.4) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 2.8, p.pos.z), { count: 1, color: GOLD, speed: 0.5, up: 1, life: 0.5, size: 0.2 }); },
    });
  }
  flare() {
    const g = this.game, p = this.p, R = 6;
    this.cast(0.35, true);
    for (const e of this.foes(p.pos, R)) { this.stun(e, 1.5); this.holy(e, 12, { stagger: 0.4 }); }
    g.fx.flash(0xffffff, 0.7, 0.3); g.lights.flash(p.pos.clone().setY(p.pos.y + 3), HOLY, 30, 20, 0.5, { priority: 6 });
    g.fx.shockwave(p.pos, HOLY, R + 1);
    g.audio?.tone({ freq: 2000, to: 3000, dur: 0.3, gain: 0.08, type: 'sine', rev: 0.4 });
  }
  // ------------------------------------------------------------ Purify
  extinguish() {
    const g = this.game, p = this.p, R = 6.5;
    this.cast(0.45, true);
    sigil(this, p.pos, R, HOLY, 0.4);
    for (const e of this.foes(p.pos, R)) {
      e.cancelAttack?.(); e.guardT = 0;
      if (e.buffT) e.buffT = 0;
      this.holy(e, 26, { stagger: 0.7, unblockable: true });
      g.particles.burst(e.pos.clone().setY(e.pos.y + 1), { count: 8, color: HOLY, speed: 2, up: 3, life: 0.6, size: 0.2 });
    }
    // also douses curse shots in the light
    for (const q of [...g.projectiles.list]) if (q.team === 'enemy' && q.pos.distanceTo(p.pos) < R + 2) g.projectiles.kill(q, 'absorb');
    pillar(this, p.pos.clone(), R * 0.6, 14, HOLY, 0.5, { core: WHITE });
    g.audio?.tone({ freq: 660, to: 1320, dur: 0.6, gain: 0.08, type: 'triangle', rev: 0.6 });
  }
  sanctuary() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 4.5;
    this.cast(0.45, true);
    g.audio?.energy('heal');
    this.zone(c, R, 6, 0.5, (list) => {
      for (const e of list) this.holy(e, 7, { stagger: 0.1 });
      for (const pl of g.players) if (!pl.dead && pl.pos.distanceTo(c) < R) { pl.heal?.(pl.maxHp * 0.03 * this.healMul, true); if (pl === p && this.blessing) p.gainCE(1); }
    }, { color: HOLY, particles: 0.9 });
  }
  healing() {
    const g = this.game, p = this.p;
    if (p.hp >= p.maxHp) { g.toast?.('Already at full health'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    this.healSelf(0.3);
    g.fx.heal(p.pos, 0xfff0b0); g.audio?.energy('heal');
  }
  judgement() {
    const g = this.game, c = this.aimGround(13), R = 6;
    this.cast(0.4, true);
    const list = this.foes(c, R).slice(0, 10);
    if (!list.length) { g.toast?.('No curses to judge'); g.audio?.ui('back'); return false; }
    for (const e of list) {
      const mark = mesh(GEO.box, glow(GOLD, 3), [0.3, 0.3, 0.3]);
      temp(this, mark, 0.9, (t) => { if (e.dead) return false; mark.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) + 0.6, e.pos.z); mark.rotation.y = t * 6; }, () => { if (!e.dead) this.rayOn(e.pos.clone(), 1.2, 46, 0.05, { sound: false }); });
    }
    this.after(0.95, () => g.audio?.tone({ freq: 1760, to: 880, dur: 0.5, gain: 0.08, type: 'sine', rev: 0.6 }));
  }
  seraph() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    g.toast?.('Angel takes over'); g.fx.flash(0xffffff, 0.5, 0.35);
    const halo = mesh(GEO.torus, glow(GOLD, 4), 1.2); halo.rotation.x = Math.PI / 2;
    this.statBuff('seraph', 12, { techMult: 0.25, speed: 0.15 }, {
      onStart: () => g.scene.add(halo),
      onTick: () => { halo.position.set(p.pos.x, p.pos.y + 3, p.pos.z); halo.rotation.z += 0.05; if (Math.random() < 0.5) g.particles.burst(tmp.set(p.pos.x + (Math.random() - 0.5), p.pos.y + 1.5, p.pos.z + (Math.random() - 0.5)), { count: 1, color: WHITE, speed: 0.4, life: 0.8, size: 0.16, gravity: 0.5 }); },
      onEnd: () => g.scene.remove(halo),
    });
    g.audio?.tone({ freq: 523, to: 1046, dur: 1.2, gain: 0.08, type: 'triangle', rev: 0.8 });
  }
  // ------------------------------------------------------------ F: Jacob's Ladder
  jacobsLadder() {
    const g = this.game, p = this.p, t = this.target(18);
    const c = t ? t.pos.clone() : this.aimGround(14);
    c.y = this.groundAt(c.x, c.z, p.pos.y);
    const R = 7 + this.rank('ladder') * 1.2, DUR = 2.4 + this.rank('ladder') * 0.5;
    p.action = { type: 'cast', both: true, dur: 1.2, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    g.toast?.('Jacob\'s Ladder');
    g.markers.spawn({ pos: c, dur: 0.9, radius: R, color: GOLD });
    g.fx.dimTarget = 0.35;
    // the clouds part: a ring of light opens high above
    const opening = mesh(GEO.torus, glow(HOLY, 3), R); opening.rotation.x = Math.PI / 2; opening.position.copy(c).setY(c.y + 30);
    temp(this, opening, 0.9 + DUR, (tt) => { opening.scale.setScalar(Math.min(1, tt / 0.6)); opening.rotation.z += 0.02; });
    g.audio?.charge(0.9, 1.2);
    [523, 659, 784, 1046].forEach((f, i) => g.audio?.tone({ freq: f, dur: 3, gain: 0.06, type: 'triangle', rev: 0.9, at: 0.6 + i * 0.12 }));
    this.after(0.9, () => {
      g.fx.dimTarget = 0;
      // a broad soft column, the ladder's rungs of light round its rim and a blazing core
      pillar(this, c, R, 30, HOLY, DUR, { core: WHITE, soft: true, faint: true });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pillar(this, c.clone().add(tmp.set(Math.cos(a) * R * 0.92, 0, Math.sin(a) * R * 0.92)), 0.3, 22, GOLD, DUR, { core: WHITE, soft: true }); }
      const rungs = new THREE.Group();
      for (let k = 0; k < 6; k++) { const ring = mesh(GEO.torus, glow(GOLD, 1.4, 0.6), R * 0.92); ring.rotation.x = Math.PI / 2; ring.position.y = 1 + k * 1.6; rungs.add(ring); }
      rungs.position.copy(c);
      temp(this, rungs, DUR, (tt) => { rungs.children.forEach((ring, k) => { ring.position.y = ((k * 1.6 + tt * 4) % 9.6) + 0.2; }); });
      g.fx.flash(0xfff8e0, 0.45, 0.35); g.fx.chroma(1); g.shake(0.6); g.hitStop(0.06);
      const light = g.lights.flash(c.clone().setY(c.y + 6), HOLY, 4, R * 2.5, DUR + 0.3, { priority: 7 });
      let tick = 0;
      this.during(DUR, (tt, dt) => {
        for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R; g.particles.glow.spawn({ x: c.x + Math.cos(a) * rr, y: c.y + 0.2, z: c.z + Math.sin(a) * rr, vy: 4 + Math.random() * 6, life: 1, r: 3, g: 2.8, b: 2, size: 0.2, drag: 0.5, sizeEnd: 0.05 }); }
        tick -= dt; if (tick > 0) return; tick = 0.3;
        // the light extinguishes techniques: curses are erased, bosses scorched
        for (const e of this.foes(c, R)) {
          const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6);
          e.cancelAttack?.();
          this.holy(e, e.isBoss ? 20 + mx * 0.025 : Math.max(30, mx * 0.3), { stagger: e.isBoss ? 0.2 : 0.6, unblockable: true, crit: false });
          if (!e.isBoss) this.stun(e, 0.4);
        }
      }, () => g.lights.remove(light));
    });
    this.after(1.2, () => { if (p.action?.lock) p.action = null; });
  }
}
registerKit('angel', AngelKit, ANGEL_SKILLS);
