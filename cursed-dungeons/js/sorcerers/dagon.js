// Dagon-style kit — Disaster Tides. (The Dagon boss in js/entities/bosses/dagon.js
// is separate and unchanged; this is the playable technique.)
// 20 abilities on the technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB        heavy, wet slaps; the finisher drops a splash of seawater.
//   Tides      Water Jet (start, RMB), Bubble Burst, Disaster Tides (a great
//              wave), Whirlpool, Water Prison, Tsunami
//   Shikigami  Death Swarm (the fish shikigami), Flying Fish, Piranha Pack,
//              Electric Eel, Shoal Shield
//   Deep       Great Shark, Octopus Grasp, Jellyfish Bloom, Whale Breach
//   Ocean      Tidal Surge, Undertow, Riptide, Brine Mending, High Tide
//   F          Domain: Horizon of the Captivating Skandha — a sunlit tropical
//              beach. Its sure-hit is the shikigami: an endless swarm of fish
//              pours out of the sea and dives into every curse inside.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { GEO, glow, mat, temp, mesh, beam, meshShot, rise, insideFoes, pull, sigil, aimAt } from './fxlib.js';

const SEA = 0x3ab8ff, FOAM = 0xd8f4ff, DEEP = 0x1a4a8a, FISH = 0xff9a4a, CORAL = 0xff6a7a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('dagon', { name: 'Dagon', technique: 'Disaster Tides', rarity: 'epic', title: 'Disaster Curse', desc: 'Water jets, crushing waves and whirlpools, swarms of shikigami fish and great sea beasts rising out of the ground.', domain: 'Horizon of the Captivating Skandha', color: '#3ab8ff' });

registerLook('dagon', {
  paint: { skinTone: 0x8a9a7a, hair: 0x8a9a7a, brow: 0x5a6a4a, top: 0x1e3a4a, kimono: true, sash: 0x0e1a22, sleeve: 0x1e3a4a, pants: 0x14262e, shoes: 0x0e1a22, eye: 0x101010, eyeWhite: 0xd8d0a0, fringe: 0, hairSide: 0, hairBack: 0 },
  paintExtra: (S) => {
    // the tentacled mouth and gill slits
    S.mat = 'skin';
    for (let x = 10; x < 14; x++) S.px(x, 14, 0x4a5a3a);
    S.px(9, 13, 0x6a7a5a); S.px(14, 13, 0x6a7a5a);
    for (let y = 10; y < 14; y += 2) { S.px(8, y, 0x4a5a3a); S.px(15, y, 0x4a5a3a); }
    // wave pattern on the robe
    S.mat = 'cloth';
    for (let x = 20; x < 28; x++) S.px(x, 26 + (x % 3 === 0 ? 0 : 1), 0x3a7a9a);
  },
  hair: () => [], hairColor: 0x8a9a7a, accent: SEA, emit: 0.3, cape: { color: 0x1e3a4a, length: 10, width: 8, segments: 3 }, scale: 1.32,
  props(rig, K) {
    const skin = K.mat(0x8a9a7a, { roughness: 0.5 }), dark = K.mat(0x5a6a4a, { roughness: 0.5 }), wet = K.mat(SEA, { emissive: 0.6 });
    // the great bulbous head swelling up and back
    K.box(rig.head, 9, 6, 10, skin, 0, 10, -1);
    K.box(rig.head, 7, 4, 8, skin, 0, 14, -2, -0.2);
    K.box(rig.head, 4, 3, 5, dark, 0, 16.5, -3, -0.3);
    // tentacles hanging from the mouth like a beard
    for (const [x, l] of [[-2.4, 7], [-0.8, 9], [0.8, 9], [2.4, 7]]) { K.box(rig.head, 1.1, l, 1.1, skin, x, 1 - l / 2, 4.2, 0.15); K.box(rig.head, 0.9, 1.2, 0.9, dark, x, 0.4 - l, 4.4); }
    // a wet shimmer at the palms
    K.box(rig.handR, 1.4, 1.4, 1.4, wet, 0, -2.6, 0); K.box(rig.handL, 1.4, 1.4, 1.4, wet, 0, -2.6, 0);
  },
});

registerDomainEnv('captivating_skandha', {
  skyTop: 0x1a6ad8, skyHorizon: 0x9adcff, fog: 0x4aa8e0, fogDensity: 0.004, hemiSky: 0xbfe4ff, hemiGround: 0x8a7a50, hemiI: 1.05, sun: 0xfff2d0, sunI: 1.2,
  grade: { tint: [1.0, 1.03, 1.06], lift: [0.0, 0.01, 0.02], sat: 1.3, contrast: 1.12, vignette: 0.35 }, floor: B.sand,
});

export const DAGON_SKILLS = [
  { id: 'brine', name: 'Brine Body', icon: '🌊', desc: '+8% melee damage and +10 max health per rank.', max: 3, branch: 'Ocean', tier: 0 },
  { id: 'tide', name: 'Rising Sea', icon: '🌊', desc: 'Waves and jets hit harder and push further.', max: 3, req: 'ab:water_jet', branch: 'Tides', tier: 1 },
  { id: 'shoal', name: 'Shoal', icon: '🐟', desc: 'More fish in every swarm.', max: 3, req: 'ab:death_swarm', branch: 'Shikigami', tier: 2 },
  { id: 'deep', name: 'The Deep', icon: '🦈', desc: 'Sea beasts bite harder.', max: 2, req: 'ab:shark', branch: 'Deep', tier: 3 },
  { id: 'skandha', name: 'Captivating Skandha', icon: '🏖️', desc: 'The domain lasts 2s longer and its fish swarm thicker.', max: 1, req: 'shoal', branch: 'Shikigami', tier: 5 },
];

class DagonKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const wet = { trail: SEA, sparkColor: FOAM };
    this.combo = [
      { ...wet, style: 'swingR', dur: 0.34, windup: 0.3, strike: 0.55, dmg: 14, range: 2.9, arc: 1.2, lunge: 5, knock: 5, stop: 0.05, shake: 0.18 },
      { ...wet, style: 'swingL', dur: 0.34, windup: 0.3, strike: 0.55, dmg: 15, range: 2.9, arc: 1.2, lunge: 5, knock: 5, stop: 0.05, shake: 0.18 },
      { ...wet, style: 'slam', dur: 0.6, windup: 0.45, strike: 0.62, dmg: 30, range: 3.6, arc: Math.PI, lunge: 3, knock: 12, stop: 0.1, shake: 0.45, ring: true, ringColor: SEA, stagger: 0.7, splash: true },
    ];
    this.p.stats.meleeMult += r('brine') * 0.08;
    this.p.maxHp += r('brine') * 10; this.p.hp = Math.min(this.p.hp + r('brine') * 10, this.p.maxHp);
    this.branches = ['Tides', 'Shikigami', 'Deep', 'Ocean'];
    this.tideMul = 1 + r('tide') * 0.15; this.fishBonus = r('shoal') * 2; this.deepMul = 1 + r('deep') * 0.2;
    this.library = {
      // ---- Tides
      water_jet: ability({ name: 'Water Jet', icon: '💦', kind: 'basic', desc: 'A high-pressure jet of seawater that punches through curses.', cd: 0.8, ce: 0, branch: 'Tides', tier: 0, start: true, legacy: 'ranged', use: () => this.waterJet() }),
      bubbles: ability({ name: 'Bubble Burst', icon: '🫧', kind: 'basic', desc: 'A spread of heavy bubbles that burst on whatever they touch.', cd: 1, ce: 0, branch: 'Tides', tier: 1, req: 'water_jet', use: () => this.bubbles() }),
      tide: ability({ name: 'Disaster Tides', icon: '🌊', kind: 'technique', desc: 'A great wave rolls out in front of you, battering and carrying curses away.', cd: 7, ce: 14, branch: 'Tides', tier: 1, legacy: 't1', req: 'water_jet', use: () => this.wave(1) }),
      whirlpool: ability({ name: 'Whirlpool', icon: '🌀', kind: 'technique', desc: 'A whirlpool opens at the aim for 4s, dragging curses in and spinning them.', cd: 12, ce: 18, branch: 'Tides', tier: 2, req: 'tide', use: () => this.whirlpool() }),
      prison: ability({ name: 'Water Prison', icon: '🔵', kind: 'technique', desc: 'A sphere of water swallows the targeted curse: it is held and drowning for 3s.', cd: 11, ce: 14, branch: 'Tides', tier: 2, req: 'bubbles', use: () => this.prison() }),
      tsunami: ability({ name: 'Tsunami', icon: '🌊', kind: 'technique', desc: 'Raise a towering wall of sea across a wide front and bring it crashing down the battlefield.', cd: 22, ce: 42, branch: 'Tides', tier: 4, legacy: 't3', req: 'whirlpool', use: () => this.wave(2.4) }),
      // ---- Shikigami
      death_swarm: ability({ name: 'Death Swarm', icon: '🐟', kind: 'summon', desc: 'Summon a swarm of shikigami fish that hunt down curses and bite.', cd: 9, ce: 16, branch: 'Shikigami', tier: 1, legacy: 't2', use: () => this.deathSwarm() }),
      flying_fish: ability({ name: 'Flying Fish', icon: '🐠', kind: 'basic', desc: 'Fling a volley of flying fish shikigami that dart through curses.', cd: 1.2, ce: 0, branch: 'Shikigami', tier: 2, req: 'death_swarm', use: () => this.flyingFish() }),
      piranha: ability({ name: 'Piranha Pack', icon: '🦷', kind: 'summon', desc: 'A pack of piranha shikigami latches onto the targeted curse and strips it for 3s.', cd: 12, ce: 14, branch: 'Shikigami', tier: 2, req: 'death_swarm', use: () => this.piranha() }),
      eel: ability({ name: 'Electric Eel', icon: '⚡', kind: 'technique', desc: 'An eel shikigami lunges at a curse and its shock jumps from curse to curse.', cd: 9, ce: 14, branch: 'Shikigami', tier: 3, req: 'flying_fish', use: () => this.eel() }),
      shoal_shield: ability({ name: 'Shoal Shield', icon: '🛡️', kind: 'defence', desc: 'A shoal circles you for 8s: each fish takes most of a hit and bites back.', cd: 16, ce: 12, branch: 'Shikigami', tier: 3, req: 'piranha', use: () => this.shoalShield() }),
      // ---- Deep
      shark: ability({ name: 'Great Shark', icon: '🦈', kind: 'summon', desc: 'The ground ripples like water under the aim, then a giant shark shikigami bursts out jaws first.', cd: 10, ce: 18, branch: 'Deep', tier: 2, req: 'tide', use: () => this.shark() }),
      octopus: ability({ name: 'Octopus Grasp', icon: '🐙', kind: 'technique', desc: 'Tentacles burst out of the ground around the aim, seize curses and slam them down.', cd: 12, ce: 18, branch: 'Deep', tier: 3, req: 'shark', use: () => this.octopus() }),
      jellyfish: ability({ name: 'Jellyfish Bloom', icon: '🪼', kind: 'technique', desc: 'Jellyfish shikigami drift over the aim for 6s, stinging and numbing curses that touch them.', cd: 14, ce: 16, branch: 'Deep', tier: 3, req: 'shark', use: () => this.jellyfish() }),
      whale: ability({ name: 'Whale Breach', icon: '🐋', kind: 'summon', desc: 'A colossal whale shikigami breaches out of the earth and crashes down on the aim.', cd: 24, ce: 46, branch: 'Deep', tier: 4, req: ['octopus', 'jellyfish'], use: () => this.whale() }),
      // ---- Ocean
      surge: ability({ name: 'Tidal Surge', icon: '🏄', kind: 'movement', desc: 'Ride a surging wave forward, bowling curses over.', cd: 6, ce: 6, branch: 'Ocean', tier: 1, use: () => this.surge() }),
      undertow: ability({ name: 'Undertow', icon: '💧', kind: 'movement', desc: 'Sink into a pool of water and surface at the aim in a geyser.', cd: 8, ce: 8, branch: 'Ocean', tier: 2, req: 'surge', use: () => this.undertow() }),
      riptide: ability({ name: 'Riptide', icon: '↩️', kind: 'technique', desc: 'A current rushes back toward you along a line, dragging curses into reach.', cd: 8, ce: 10, branch: 'Ocean', tier: 2, req: 'surge', use: () => this.riptide() }),
      mending: ability({ name: 'Brine Mending', icon: '💚', kind: 'heal', desc: 'Cool seawater washes over you and restores 25% of your health over 3s.', cd: 20, ce: 16, branch: 'Ocean', tier: 3, req: 'undertow', use: () => this.rctHeal(0.25, 3, SEA) }),
      high_tide: ability({ name: 'High Tide', icon: '🌕', kind: 'buff', desc: 'The tide rises for 10s: water techniques hit 25% harder and you regain Cursed Energy steadily.', cd: 24, ce: 10, branch: 'Ocean', tier: 4, req: ['riptide', 'mending'], use: () => this.highTide() }),
    };
    this.passives = {
      gills: passive({ name: 'Gills', icon: '🫁', desc: 'Standing in your own water heals 1% health per second; +6% damage reduction.', branch: 'Ocean', tier: 2, req: 'surge', apply: (pl, k) => { k.gills = true; pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.06); } }),
      school: passive({ name: 'School of Fish', icon: '🐡', desc: '+3 fish in every swarm; fish bites restore Cursed Energy.', branch: 'Shikigami', tier: 2, req: 'death_swarm', apply: (pl, k) => { k.fishBonus += 3; k.fishCE = true; } }),
      undercurrent: passive({ name: 'Undercurrent', icon: '🌊', desc: 'Waves and whirlpools slow every curse they touch for 2s.', branch: 'Tides', tier: 3, req: 'whirlpool', apply: (pl, k) => { k.undercurrent = true; } }),
      apex: passive({ name: 'Apex Predator', icon: '🦈', desc: 'Sea beasts hit 25% harder against curses below half health.', branch: 'Deep', tier: 4, req: 'octopus', apply: (pl, k) => { k.apex = true; } }),
    };
    this.fishGeo = new THREE.BoxGeometry(0.22, 0.28, 0.6);
    this.domain = {
      name: 'Horizon of the Captivating Skandha', icon: '🏖️', key: 'captivating_skandha', type: 6, color: SEA, sound: 'resonance', flash: 0xc8f4ff,
      look: { floor: 0xe8d8a8, seam: 0x8ad8ff, sparkle: 0xffffff, skyTop: 0x2a8ae8, skyHorizon: 0xe8fcff, stars: 0, band: 0xffffff },
      duration: 8 + r('skandha') * 2, radius: 25,
      onStart: (g, d) => { this.buildBeach(g, d); g.toast?.('Sure-hit: an endless swarm of shikigami fish pours out of the sea'); },
      onTick: (g, d, dt) => this.beachTick(g, d, dt),
      onEnd: () => this.clearBeach(),
    };
    this.tick = (dt) => {
      if (this.gills && !this.p.isRemote && this.pools?.some((q) => q.t > 0 && Math.hypot(this.p.pos.x - q.at.x, this.p.pos.z - q.at.z) < q.r)) this.p.heal?.(this.p.maxHp * 0.01 * dt, true);
      if (this.pools) { for (const q of this.pools) q.t -= dt; this.pools = this.pools.filter((q) => q.t > 0); }
    };
  }
  dispose() { super.dispose(); this.clearBeach(); }
  get water() { return this.tideMul * (this.buffs.has('high_tide') ? 1.25 : 1); }
  puddle(at, r, dur) { (this.pools ??= []).push({ at: at.clone(), r, t: dur }); this.game.hazards.add({ pos: at, radius: r, dps: 4 * this.water, dur, color: SEA, team: 'player', src: this.p }); }
  wetHit(e, dmg, o = {}) { const d = this.hit(e, dmg, { color: '#8ad8ff', ...o }); if (this.undercurrent && o.current) this.slow(e, 2); return d; }
  splashFx(at, s = 1) { const g = this.game; g.particles.burst(tmp.copy(at).setY(at.y + 0.3), { count: Math.round(16 * s), color: FOAM, speed: 5 * s, up: 3, life: 0.7, size: 0.18, gravity: 14, drag: 1, shape: 1 }); g.fx.splash?.(at, s); }
  onMeleeHit(e, step) { if (step.splash) { this.splashFx(e.pos, 1.2); this.puddle(e.pos, 1.4, 3); } }
  fishMesh(color = FISH) {
    const grp = new THREE.Group();
    const body = mesh(this.fishGeo, mat(color, { emissive: 0.6, roughness: 0.4 })); grp.add(body);
    const tail = mesh(GEO.box, mat(color, { emissive: 0.4 }), [0.04, 0.26, 0.22]); tail.position.z = -0.38; grp.add(tail);
    const eye = mesh(GEO.box, glow(0xffffff, 2), [0.24, 0.05, 0.05]); eye.position.set(0, 0.05, 0.22); grp.add(eye);
    return grp;
  }
  // ------------------------------------------------------------ Tides
  waterJet() {
    const g = this.game, from = this.handPos();
    this.cast(0.26);
    const { dir } = aimAt(this, from, 16);
    beam(this, from, dir, 15, 0.3, SEA, { dmg: 14 * this.water, core: FOAM, knock: 6 * this.tideMul, stagger: 0.3, blocks: false, numColor: '#8ad8ff', onHit: (e) => this.splashFx(e.pos, 0.5) });
    g.audio?.noise({ dur: 0.25, gain: 0.25, type: 'bandpass', freq: 1400, sweep: 500, q: 1 });
  }
  bubbles() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const base = this.aimAngle();
    for (let i = 0; i < 5; i++) {
      const a = base + (i - 2) * 0.16;
      const b = mesh(GEO.sphere, glow(FOAM, 1.2, 0.45), 0.32);
      meshShot(this, b, { pos: this.handPos(), vel: new THREE.Vector3(Math.sin(a), 0.05, Math.cos(a)).multiplyScalar(13 + Math.random() * 3), life: 0.9, radius: 0.5, face: false,
        onHit: (e) => this.wetHit(e, 8 * this.water, { stagger: 0.2 }),
        onExpire: (q) => { g.combat.aoe(q.pos, 1.4, 6 * this.water, p, { knock: 3, stagger: 0.2, blocks: false }); g.particles.burst(q.pos, { count: 10, color: FOAM, speed: 3, life: 0.35, size: 0.14, shape: 2 }); } });
    }
    g.audio?.tone({ freq: 400, to: 900, dur: 0.15, gain: 0.08, type: 'sine' });
  }
  // a wave rolling forward (scale 1 = Disaster Tides, 2.4 = Tsunami)
  wave(s) {
    const g = this.game, p = this.p, f = this.fwd(), side = new THREE.Vector3(f.z, 0, -f.x);
    const W = 3.5 * s, H = 1.6 * s, L = 13 + s * 5, dur = 0.9 + s * 0.25;
    p.action = { type: 'cast', both: true, dur: 0.45, elapsed: 0, t: 0, moveScale: 0.2, lock: true, faceAim: true };
    if (s > 1) { g.toast?.('Tsunami'); g.fx.flash(SEA, 0.25, 0.3); }
    const start = p.pos.clone().addScaledVector(f, 1.5);
    const grp = new THREE.Group();
    const wall = mesh(GEO.box, mat(SEA, { emissive: 0.5, opacity: 0.75, roughness: 0.1 }), [W * 2, H, 1.2 * s]); wall.position.y = H / 2; grp.add(wall);
    const crest = mesh(GEO.box, glow(FOAM, 1.6, 0.8), [W * 2.05, 0.35 * s, 0.9 * s]); crest.position.set(0, H, 0.35 * s); grp.add(crest);
    grp.rotation.y = Math.atan2(f.x, f.z);
    const hitSet = new Set();
    temp(this, grp, dur, (t, dt, k) => {
      const c = tmp.copy(start).addScaledVector(f, k * L);
      grp.position.set(c.x, this.groundAt(c.x, c.z, start.y), c.z);
      grp.scale.y = Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.8) * 4);
      for (let i = 0; i < 3 * s; i++) { const o = (Math.random() - 0.5) * W * 2; g.particles.burst(tmp2.copy(c).addScaledVector(side, o).setY(grp.position.y + H * grp.scale.y), { count: 1, color: FOAM, speed: 2, up: 2, life: 0.5, size: 0.2, gravity: 10, shape: 1 }); }
      this.line(c.clone().addScaledVector(side, -W), side, W * 2, 1.2 * s, (e) => {
        if (!e.isBoss) e.knock?.addScaledVector(f, 1.4 * this.tideMul);
        if (hitSet.has(e)) return; hitSet.add(e);
        this.wetHit(e, (s > 1 ? 70 : 28) * this.water, { stagger: 0.7, knock: tmp2.copy(f).setLength(8 * s), current: true });
      });
    }, () => this.puddle(start.clone().addScaledVector(f, L * 0.7), 1.8 * s, 3));
    g.audio?.noise({ dur: dur + 0.4, gain: 0.35 * s, type: 'lowpass', freq: 500, sweep: 1500, attack: 0.2, rev: 0.3 }); g.shake(0.2 * s);
  }
  whirlpool() {
    const g = this.game, c = this.aimGround(12), R = 5;
    this.cast(0.45, true);
    sigil(this, c, R, SEA, 0.5);
    const disc = mesh(GEO.torus, glow(SEA, 2), R * 0.8); disc.rotation.x = Math.PI / 2; disc.position.copy(c).setY(c.y + 0.15);
    const disc2 = mesh(GEO.torus, glow(FOAM, 2), R * 0.45); disc2.rotation.x = Math.PI / 2; disc2.position.copy(c).setY(c.y + 0.2);
    const grp = new THREE.Group(); grp.add(disc, disc2);
    let tick = 0;
    temp(this, grp, 4, (t, dt) => {
      disc.rotation.z += dt * 4; disc2.rotation.z -= dt * 7;
      pull(this, c, R + 1.5, 0.8, 0);
      for (const e of this.foes(c, R)) if (!e.isBoss) { tmp.subVectors(e.pos, c).setY(0); e.knock?.add(tmp2.set(-tmp.z, 0, tmp.x).setLength(0.7)); }
      for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1, rr = R * (0.3 + ((t * 0.7 + i * 0.3) % 1) * 0.7); g.particles.burst(tmp.set(c.x + Math.cos(a) * rr, c.y + 0.3, c.z + Math.sin(a) * rr), { count: 1, color: FOAM, speed: 0.4, life: 0.4, size: 0.2, shape: 1 }); }
      tick -= dt; if (tick > 0) return; tick = 0.4;
      for (const e of this.foes(c, R * 0.6)) this.wetHit(e, 10 * this.water, { stagger: 0.25, current: true });
    });
    g.audio?.noise({ dur: 1.5, gain: 0.25, type: 'bandpass', freq: 300, sweep: 900, q: 1 });
  }
  prison() {
    const g = this.game, t = this.target(13);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.35);
    const ball = mesh(GEO.sphere, mat(SEA, { emissive: 0.6, opacity: 0.55, roughness: 0.05 }), 1);
    this.stun(t, 3); t.cancelAttack?.();
    let tick = 0;
    temp(this, ball, 3, (tt, dt) => {
      if (t.dead) return false;
      const s = Math.max(1.2, (t.height ?? 1.5) * 0.8);
      ball.position.set(t.pos.x, t.pos.y + (t.height ?? 1.5) * 0.5, t.pos.z); ball.scale.setScalar(s * Math.min(1, tt * 5));
      if (Math.random() < 0.4) g.particles.burst(ball.position, { count: 1, color: FOAM, speed: 0.3, up: 2, life: 0.6, size: 0.12, shape: 2 });
      tick -= dt; if (tick <= 0) { tick = 0.5; this.wetHit(t, 12 * this.water, { stagger: 0.05 }); }
    }, () => this.splashFx(t.pos, 1.5));
    g.audio?.tone({ freq: 200, to: 120, dur: 0.6, gain: 0.15, type: 'sine', rev: 0.4 });
  }
  // ------------------------------------------------------------ Shikigami
  deathSwarm(n0, origin, targets) {
    const g = this.game, p = this.p;
    const foes = targets ?? g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 22);
    if (!foes.length) { g.toast?.('No curses to hunt'); g.audio?.ui('back'); return false; }
    const n = n0 ?? 8 + this.fishBonus;
    if (!origin) this.cast(0.45, true);
    for (let i = 0; i < n; i++) this.after(i * 0.04, () => {
      const a = (i / n) * Math.PI * 2;
      const from = origin ? origin.clone().add(tmp.set((Math.random() - 0.5) * 6, Math.random() * 2, (Math.random() - 0.5) * 6)) : p.pos.clone().add(tmp.set(Math.sin(a) * 1.2, 1.2, Math.cos(a) * 1.2));
      const tg = foes[i % foes.length];
      meshShot(this, this.fishMesh(i % 4 ? FISH : CORAL), { pos: from, vel: new THREE.Vector3(Math.sin(a) * 6, 3 + Math.random() * 2, Math.cos(a) * 6), life: 2.4, radius: 0.45, ghost: true, homing: 5, target: tg,
        trail: (q) => { q.homing = Math.min(14, q.homing + 0.3); if (Math.random() < 0.4) g.particles.burst(q.pos, { count: 1, color: FOAM, speed: 0.3, life: 0.3, size: 0.12, shape: 1 }); },
        onHit: (e, q) => { this.wetHit(e, 12 * this.water, { stagger: 0.25 }); if (this.fishCE) p.gainCE(1); g.particles.burst(q.pos, { count: 6, color: SEA, speed: 3, life: 0.3, size: 0.15, shape: 1 }); g.audio?.impact(0.6); } });
    });
    if (!origin) g.audio?.energy('summon');
  }
  flyingFish() {
    const g = this.game;
    this.cast(0.28);
    const base = this.aimAngle();
    for (let i = 0; i < 4; i++) this.after(i * 0.05, () => {
      const a = base + (Math.random() - 0.5) * 0.35;
      meshShot(this, this.fishMesh(0x9ad8ff), { pos: this.handPos(), vel: new THREE.Vector3(Math.sin(a), 0.12, Math.cos(a)).multiplyScalar(22), gravity: 4, life: 0.8, radius: 0.45, pierce: true,
        onHit: (e, q) => { this.wetHit(e, 9 * this.water, { stagger: 0.15, knock: q.vel.clone().setY(0).setLength(2) }); } });
    });
    g.audio?.whoosh(0.8);
  }
  piranha() {
    const g = this.game, t = this.target(14);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.35, true);
    const fish = []; for (let i = 0; i < 5 + Math.floor(this.fishBonus / 2); i++) { const m = this.fishMesh(0xb83a3a); g.scene.add(m); fish.push(m); m.position.copy(this.handPos()); }
    let tick = 0;
    this.during(3, (tt, dt) => {
      if (t.dead) return false;
      fish.forEach((m, i) => {
        const a = tt * 9 + i * 1.3, rr = (t.radius ?? 0.5) + 0.4;
        const goal = tmp.set(t.pos.x + Math.cos(a) * rr, t.pos.y + 0.5 + (i % 3) * 0.4, t.pos.z + Math.sin(a) * rr);
        m.position.lerp(goal, Math.min(1, dt * 10)); m.lookAt(t.pos.x, t.pos.y + 0.8, t.pos.z);
      });
      tick -= dt; if (tick <= 0) { tick = 0.25; this.wetHit(t, 5 * this.water * (this.apex && t.hp < t.maxHp * 0.5 ? 1.25 : 1), { stagger: 0.05 }); g.particles.burst(tmp.copy(t.pos).setY(t.pos.y + 1), { count: 3, color: 0xc03a3a, speed: 2, life: 0.3, size: 0.12, gravity: 8, shape: 1 }); }
    }, () => { for (const m of fish) g.scene.remove(m); });
    g.audio?.energy('summon');
  }
  eel() {
    const g = this.game, p = this.p;
    let cur = this.target(13);
    if (!cur) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.35);
    const hit = new Set(); let from = this.handPos();
    for (let j = 0; j < 5 && cur; j++) {
      const a = from.clone(), b = cur.pos.clone().setY(cur.pos.y + (cur.height ?? 1.5) * 0.5), e = cur;
      this.after(j * 0.1, () => {
        g.fx.slashLine(a, tmp.subVectors(b, a).normalize(), a.distanceTo(b), 0xd8f8ff, 0.18, 0.25);
        if (!e.dead) { this.wetHit(e, (26 - j * 3) * this.water, { stagger: 0.5 }); this.stun(e, 0.5); }
        g.particles.burst(b, { count: 8, color: 0xd8f8ff, speed: 4, life: 0.25, size: 0.1, shape: 3 });
        g.audio?.tone({ freq: 1200, to: 300, dur: 0.1, gain: 0.06, type: 'square', filter: 4000 });
      });
      hit.add(cur); from = b;
      cur = g.enemies.filter((x) => !x.dead && !hit.has(x) && x.pos.distanceTo(cur.pos) < 6).sort((x, y) => x.pos.distanceTo(b) - y.pos.distanceTo(b))[0];
    }
    meshShot(this, this.fishMesh(0x2a3a4a), { pos: this.handPos(), vel: p.aimDir.clone().multiplyScalar(18), life: 0.3, radius: 0.1, ghost: true });
  }
  shoalShield() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const fish = []; for (let i = 0; i < 5 + Math.ceil(this.fishBonus / 2); i++) { const m = this.fishMesh(i % 2 ? FISH : 0xffd84a); g.scene.add(m); fish.push(m); }
    g.audio?.energy('summon');
    this.buff('shoal_shield', 8, {
      incoming: (a, src) => {
        const m = fish.pop(); if (!m) return a;
        g.scene.remove(m); this.splashFx(m.position, 0.6);
        if (src && src.maxHp && !src.dead && src.pos) this.wetHit(src, 16 * this.water, { stagger: 0.3 });
        if (!fish.length) { const b = this.buffs.get('shoal_shield'); if (b) b.left = 0.01; }
        return a * 0.2;
      },
      onTick: () => { const T = g.time * 2.5; fish.forEach((m, i) => { const a = T + i / fish.length * Math.PI * 2; m.position.set(p.pos.x + Math.cos(a) * 1.4, p.pos.y + 1 + Math.sin(T * 2 + i) * 0.3, p.pos.z + Math.sin(a) * 1.4); m.rotation.y = -a + Math.PI; }); },
      onEnd: () => { for (const m of fish) g.scene.remove(m); fish.length = 0; },
    });
  }
  // ------------------------------------------------------------ Deep
  beast(e, dmg, o) { return this.wetHit(e, dmg * this.deepMul * (this.apex && e.maxHp && e.hp < e.maxHp * 0.5 ? 1.25 : 1), o); }
  ripple(c, R, dur) {
    const g = this.game;
    g.markers.spawn({ pos: c, dur, radius: R, color: SEA });
    this.during(dur, () => { if (Math.random() < 0.5) g.fx.rings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: FOAM, r0: 0.3, r1: R, dur: 0.5, thick: 0.06 }); });
  }
  shark() {
    const g = this.game, p = this.p, t = this.target(14), c = t ? t.pos.clone() : this.aimGround(12);
    c.y = this.groundAt(c.x, c.z, p.pos.y);
    this.cast(0.4, true);
    this.ripple(c, 2.4, 0.55);
    this.after(0.55, () => {
      const grp = new THREE.Group(), grey = mat(0x5a6a7a, { roughness: 0.5 }), white = mat(0xe8e8e8), red = glow(0xff3a3a, 1.5);
      const body = mesh(GEO.box, grey, [1.4, 1.4, 4]); grp.add(body);
      const belly = mesh(GEO.box, white, [1.2, 0.5, 3.6]); belly.position.y = -0.55; grp.add(belly);
      const fin = mesh(GEO.box, grey, [0.2, 1.2, 1]); fin.position.set(0, 1.1, -0.3); fin.rotation.x = -0.4; grp.add(fin);
      const tail = mesh(GEO.box, grey, [0.2, 1.6, 0.8]); tail.position.set(0, 0.2, -2.3); grp.add(tail);
      const jaw = mesh(GEO.box, red, [1.1, 0.4, 0.4]); jaw.position.set(0, -0.1, 2); grp.add(jaw);
      grp.rotation.x = -Math.PI / 2.4;
      temp(this, grp, 0.9, (tt, dt, k) => { grp.position.set(c.x, c.y - 2 + Math.sin(k * Math.PI) * 5, c.z); grp.rotation.z = k * 2; });
      this.blast(c, 2.6, 46, { color: SEA, knock: 4, stagger: 0.9, explode: false, sound: false });
      for (const e of this.foes(c, 2.8)) { this.beast(e, 20, { stagger: 0.3 }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 11); }
      this.splashFx(c, 2); this.puddle(c, 2, 3);
      g.audio?.impact(1.6); g.audio?.noise({ dur: 0.5, gain: 0.35, type: 'lowpass', freq: 900, sweep: 300 });
    });
  }
  octopus() {
    const g = this.game, c = this.aimGround(11), R = 4.5;
    this.cast(0.45, true);
    this.ripple(c, R, 0.5);
    this.after(0.5, () => {
      const grabbed = this.foes(c, R).slice(0, 8);
      const arms = new THREE.Group(), m = mat(0xb84a6a, { roughness: 0.4, emissive: 0.15 }), sucker = mat(0xf0c0c8);
      const pts = grabbed.length ? grabbed.map((e) => e.pos.clone()) : Array.from({ length: 5 }, (_, i) => c.clone().add(tmp.set(Math.cos(i * 1.26) * R * 0.6, 0, Math.sin(i * 1.26) * R * 0.6)));
      for (const at of pts) {
        const arm = new THREE.Group(); arm.position.copy(at).setY(this.groundAt(at.x, at.z, c.y));
        for (let s = 0; s < 5; s++) { const seg = mesh(GEO.box, m, [0.7 - s * 0.1, 0.9, 0.7 - s * 0.1]); seg.position.set(Math.sin(s * 0.7) * 0.3, 0.45 + s * 0.85, 0); seg.rotation.z = Math.sin(s * 0.7) * 0.3; arm.add(seg); const su = mesh(GEO.box, sucker, [0.2, 0.2, 0.05]); su.position.set(seg.position.x, seg.position.y, 0.36 - s * 0.05); arm.add(su); }
        arms.add(arm);
      }
      for (const e of grabbed) { this.stun(e, 1.2); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7); }
      temp(this, arms, 1.3, (tt, dt, k) => { arms.children.forEach((a, i) => { a.scale.y = Math.min(1, tt * 5) * (k > 0.6 ? 1 - (k - 0.6) * 2.4 : 1); a.rotation.x = k > 0.45 ? (k - 0.45) * 3 : 0; }); });
      this.after(0.7, () => { for (const e of grabbed) if (!e.dead) { this.beast(e, 40, { stagger: 0.9, knock: tmp.subVectors(e.pos, c).setY(0).setLength(4) }); g.fx.landDust(e.pos, 20); } g.shake(0.4); g.audio?.impact(1.5); });
      g.audio?.noise({ dur: 0.6, gain: 0.3, type: 'lowpass', freq: 400, sweep: 1200 });
    });
  }
  jellyfish() {
    const g = this.game, c = this.aimGround(12), R = 4.5;
    this.cast(0.4, true);
    const jellies = [];
    for (let i = 0; i < 6; i++) {
      const j = new THREE.Group();
      const bell = mesh(GEO.sphere, glow(0xd8a8ff, 1.4, 0.6), [0.6, 0.4, 0.6]); j.add(bell);
      for (let k = 0; k < 4; k++) { const tn = mesh(GEO.box, glow(0xb88aff, 1.2, 0.5), [0.05, 1.2, 0.05]); tn.position.set(Math.cos(k * 1.57) * 0.3, -0.7, Math.sin(k * 1.57) * 0.3); j.add(tn); }
      const a = i / 6 * Math.PI * 2, rr = R * (0.3 + Math.random() * 0.6);
      j.userData = { x: c.x + Math.cos(a) * rr, z: c.z + Math.sin(a) * rr, ph: Math.random() * 6 };
      jellies.push(j);
    }
    const grp = new THREE.Group(); jellies.forEach((j) => grp.add(j));
    let tick = 0;
    temp(this, grp, 6, (tt, dt) => {
      for (const j of jellies) { const u = j.userData; j.position.set(u.x + Math.sin(tt + u.ph) * 0.6, c.y + 1.6 + Math.sin(tt * 2 + u.ph) * 0.3, u.z + Math.cos(tt * 0.8 + u.ph) * 0.6); j.scale.y = 1 + Math.sin(tt * 4 + u.ph) * 0.15; }
      tick -= dt; if (tick > 0) return; tick = 0.5;
      for (const j of jellies) for (const e of this.foes(j.position.clone().setY(c.y), 1.4)) { this.beast(e, 9, { stagger: 0.2 }); this.slow(e, 1); if (Math.random() < 0.3) this.stun(e, 0.5); }
    });
    g.audio?.tone({ freq: 600, to: 900, dur: 0.4, gain: 0.06, type: 'sine', rev: 0.5 });
  }
  whale() {
    const g = this.game, p = this.p, c = this.aimGround(14), R = 7;
    p.action = { type: 'cast', both: true, dur: 0.8, elapsed: 0, t: 0, moveScale: 0.1, lock: true, faceAim: true };
    g.toast?.('Whale Breach'); g.audio?.charge(1.1, 0.4);
    this.ripple(c, R, 1.4);
    const grp = new THREE.Group(), body = mat(0x2a3a5a, { roughness: 0.5 }), belly = mat(0xc8d0d8);
    const b = mesh(GEO.box, body, [4, 3.4, 11]); grp.add(b);
    const bl = mesh(GEO.box, belly, [3.6, 1.2, 10]); bl.position.y = -1.6; grp.add(bl);
    const tail = mesh(GEO.box, body, [6, 0.4, 2]); tail.position.set(0, 0, -6.4); grp.add(tail);
    for (const s of [-1, 1]) { const fin = mesh(GEO.box, body, [2.4, 0.3, 1.4]); fin.position.set(s * 2.8, -1, 2); fin.rotation.z = s * 0.4; grp.add(fin); }
    const start = c.clone().add(tmp.set(-Math.sin(p.facing) * 10, -6, -Math.cos(p.facing) * 10));
    grp.rotation.y = p.facing;
    temp(this, grp, 1.4, (tt, dt, k) => {
      grp.position.lerpVectors(start, c, k); grp.position.y = c.y + Math.sin(k * Math.PI) * 12 - 4 * (1 - k);
      grp.rotation.x = -Math.cos(k * Math.PI) * 0.9;
    }, () => {
      this.blast(c, R, 120, { color: SEA, knock: 15, stagger: 1, unblockable: true });
      for (const e of this.foes(c, R)) this.beast(e, 30, { stagger: 0.5 });
      for (let i = 0; i < 4; i++) this.splashFx(c.clone().add(tmp.set((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)), 2.5);
      this.puddle(c, R * 0.6, 4);
      g.fx.screenWave(c, 1.4, 0.6); g.shake(0.9); g.hitStop(0.08); g.audio?.energy('explode');
    });
    this.after(0.8, () => { if (p.action?.lock) p.action = null; });
  }
  // ------------------------------------------------------------ Ocean
  surge() {
    const g = this.game, p = this.p, f = this.fwd(), from = p.pos.clone();
    this.dash(f, 8, 0.3, { hitR: 1.8, dmg: 14 * this.water, color: SEA, hitOpts: { color: '#8ad8ff' }, onHit: (e) => { if (!e.isBoss) e.knock?.addScaledVector(f, 8); }, onEnd: () => this.puddle(from.clone().addScaledVector(f, 4), 1.6, 2.5) });
    this.during(0.3, () => g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.4, p.pos.z), { count: 4, color: FOAM, speed: 3, up: 2, life: 0.5, size: 0.16, gravity: 10, shape: 1 }));
    g.audio?.noise({ dur: 0.4, gain: 0.3, type: 'lowpass', freq: 600, sweep: 1600 });
  }
  undertow() {
    const g = this.game, p = this.p, to = this.aimGround(11), from = p.pos.clone();
    this.splashFx(from, 1.2); this.puddle(from, 1.4, 2);
    if (!this.blink(to, { color: SEA })) return false;
    // the geyser you rise in
    beam(this, to.clone(), tmp.set(0, 1, 0), 6, 0.9, SEA, { core: FOAM, pierce: true, light: false });
    this.blast(to, 2.6, 24 * this.water, { color: SEA, knock: 9, stagger: 0.6, explode: false });
    for (const e of this.foes(to, 2.6)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
    this.splashFx(to, 2); this.puddle(to, 1.8, 3);
    g.audio?.noise({ dur: 0.5, gain: 0.3, type: 'lowpass', freq: 800, sweep: 300 });
  }
  riptide() {
    const g = this.game, p = this.p, f = this.fwd(), L = 12;
    this.cast(0.4, true);
    g.markers.spawn({ pos: p.pos.clone(), dur: 0.25, shape: 'rect', width: 3, length: L, facing: Math.atan2(f.x, f.z), color: SEA });
    this.after(0.2, () => {
      this.line(p.pos.clone(), f, L, 1.6, (e, along) => { this.wetHit(e, 14 * this.water, { stagger: 0.5, current: true }); if (!e.isBoss) e.knock?.addScaledVector(f, -Math.min(16, along * 1.5)); });
      for (let s = 1; s < L; s += 0.7) g.particles.burst(tmp.copy(p.pos).addScaledVector(f, s).setY(p.pos.y + 0.3), { count: 1, color: FOAM, speed: 5, spread: 0.1, dir: tmp2.copy(f).multiplyScalar(-6), life: 0.4, size: 0.18, shape: 1 });
      g.audio?.noise({ dur: 0.5, gain: 0.3, type: 'bandpass', freq: 900, sweep: 300, q: 1 });
    });
  }
  highTide() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.fx.flash(SEA, 0.25, 0.3); g.audio?.energy('heal');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: SEA, r0: 0.4, r1: 5, dur: 0.6, thick: 0.2 });
    this.buff('high_tide', 10, { onTick: (dt) => { p.gainCE(3 * dt); if (Math.random() < 0.4) g.particles.burst(tmp.set(p.pos.x + (Math.random() - 0.5), p.pos.y + 0.2, p.pos.z + (Math.random() - 0.5)), { count: 1, color: SEA, speed: 0.5, up: 2, life: 0.6, size: 0.15, shape: 2 }); } });
  }
  // ------------------------------------------------------------ Domain
  buildBeach(g, d) {
    this.clearBeach();
    const grp = new THREE.Group(), c = d.center, gy = this.groundAt(c.x, c.z, c.y);
    // the sea: a shining ring of water around the beach, waves lapping in
    const sea = mesh(GEO.cylSolid, mat(0x1a7ad0, { emissive: 0.15, roughness: 0.05, metalness: 0.3 }), [d.radius + 4, 0.2, d.radius + 4]); sea.position.set(c.x, gy + 0.02, c.z); grp.add(sea);
    const sand = mesh(GEO.cylSolid, mat(0xd8c08a, { roughness: 0.95 }), [d.radius * 0.72, 0.26, d.radius * 0.72]); sand.position.set(c.x, gy + 0.05, c.z); grp.add(sand);
    const foam = mesh(GEO.torus, glow(0xffffff, 1.2, 0.7), d.radius * 0.73); foam.rotation.x = Math.PI / 2; foam.position.set(c.x, gy + 0.2, c.z); grp.add(foam);
    this.foamRing = foam;
    // palm trees on the sand
    const trunk = mat(0x8a6a3a, { roughness: 0.9 }), leaf = mat(0x3aa84a, { roughness: 0.6 });
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + 0.3, rr = d.radius * (0.62 + Math.random() * 0.08);
      const tree = new THREE.Group(); tree.position.set(c.x + Math.cos(a) * rr, gy, c.z + Math.sin(a) * rr);
      for (let s = 0; s < 6; s++) { const seg = mesh(GEO.box, trunk, [0.5, 1.1, 0.5]); seg.position.set(s * 0.12, 0.55 + s * 1.05, 0); seg.rotation.z = -0.08; tree.add(seg); }
      for (let k = 0; k < 6; k++) { const fr = mesh(GEO.box, leaf, [0.5, 0.12, 3]); fr.position.set(0.7 + Math.cos(k) * 1.2, 6.4, Math.sin(k) * 1.2); fr.rotation.set(0.35, k * 1.05, 0); fr.translateZ(1.2); tree.add(fr); }
      tree.rotation.y = Math.random() * 6; grp.add(tree);
    }
    // the beach umbrellas and the sun low over the horizon
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1, rr = d.radius * 0.3; const u = new THREE.Group(); u.position.set(c.x + Math.cos(a) * rr, gy, c.z + Math.sin(a) * rr);
      const pole = mesh(GEO.box, mat(0xffffff), [0.12, 2.6, 0.12]); pole.position.y = 1.3; u.add(pole);
      const top = mesh(GEO.cone, mat(i % 2 ? 0xff5a5a : 0x5aa8ff), [1.1, 0.45, 1.1]); top.position.y = 2.3; u.add(top); grp.add(u);
    }
    const sun = mesh(GEO.sphere, glow(0xfff4c0, 3), 4); sun.position.set(c.x, gy + 14, c.z - d.radius - 6); grp.add(sun);
    this.beach = rise(this, grp, -5, 0.5);
    this.beachLight = g.lights.flash(c.clone().setY(gy + 10), 0xfff8e0, 1.5, d.radius * 2, 60, { priority: 4, fade: false });
  }
  clearBeach() {
    const g = this.game;
    if (this.beach) { g.scene.remove(this.beach); this.beach = null; }
    if (this.beachLight) { g.lights.remove(this.beachLight); this.beachLight = null; }
  }
  beachTick(g, d, dt) {
    if (this.foamRing) this.foamRing.scale.setScalar(d.radius * (0.73 + Math.sin(g.time * 1.5) * 0.02));
    d.swarm = (d.swarm ?? 0.3) - dt;
    if (d.swarm > 0) return;
    d.swarm = 0.55 - this.rank('skandha') * 0.1;
    const list = insideFoes(g);
    if (!list.length) return;
    // shikigami fish leap out of the surf and dive at every curse inside: the sure-hit
    for (const e of list) {
      const a = Math.random() * Math.PI * 2;
      const from = new THREE.Vector3(d.center.x + Math.cos(a) * d.radius * 0.8, e.pos.y + 1.5, d.center.z + Math.sin(a) * d.radius * 0.8);
      const fish = this.fishMesh(Math.random() < 0.5 ? FISH : 0x6ad8ff);
      const to = e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.5);
      temp(this, fish, 0.45, (t, dt2, k) => { fish.position.lerpVectors(from, to, k); fish.position.y += Math.sin(k * Math.PI) * 4; fish.lookAt(to); }, () => {
        if (e.dead) return;
        const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6);
        this.hit(e, e.isBoss ? mx * 0.012 : Math.max(10, mx * 0.12), { stagger: e.isBoss ? 0 : 0.2, unblockable: true, crit: false, ceGain: 0, color: '#8ad8ff' });
        g.particles.burst(to, { count: 6, color: FOAM, speed: 3, life: 0.3, size: 0.14, shape: 1 });
      });
    }
    if (Math.random() < 0.5) g.audio?.noise({ dur: 0.3, gain: 0.08, type: 'bandpass', freq: 1200, sweep: 600, q: 1 });
  }
}
registerKit('dagon', DagonKit, DAGON_SKILLS);
