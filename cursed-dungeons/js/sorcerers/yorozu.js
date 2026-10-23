// Yorozu-style kit — Construction (the Heian sorcerer who returned in the
// Culling Game). Her construction builds matter out of cursed energy: insect
// armour, liquid metal and the True Sphere. 20 abilities on the technique
// tree; four are equipped (RMB takes a basic one) plus F.
//   LMB        armoured strikes; the finisher drives a construct spike up.
//   Construct  Metal Shards (start, RMB), Construct Spear, Blade Ring,
//              Construct Pillars, Construct Hammer, Construct Rain
//   Insect     Insect Armour, Mantis Blades, Wing Burst, Beetle Charge,
//              Stag Pincers, Hornet Constructs
//   Liquid     Liquid Metal, Mercury Whip, Metal Flood, Metal Shell
//   Sphere     Construct Spheres, Falling Mass, Reconstruction, True Sphere
//   F          Domain: Threefold Affliction — a pale, barren plain under a
//              grey sky, littered with half-built constructs. Canon shows little
//              of its sure-hit, so here construction itself is the sure-hit:
//              liquid-metal spikes and small spheres form inside every curse.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { GEO, glow, mat, temp, mesh, beam, meshShot, rise, insideFoes, pull, sigil, aimAt, makeOrb } from './fxlib.js';

const SILVER = 0xd8d8e8, CHROME = 0xa8b0c0, SHELL = 0x1e2a24, SPHERE = 0xf0f4ff, HEART = 0xff7ab0;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('yorozu', { name: 'Yorozu', technique: 'Construction', rarity: 'epic', title: 'Heian-era Sorcerer', desc: 'Matter built from cursed energy: metal shards, insect armour, flowing liquid metal and the all-destroying True Sphere.', domain: 'Threefold Affliction', color: '#d8d8e8' });

registerLook('yorozu', {
  paint: { skinTone: 0xf2d6c2, hair: 0x2a1e1a, hairVolume: true, top: 0xe8e2d8, collar: 0xe8e2d8, topTrim: 0x2a2a30, buttons: 0x2a2a30, sleeve: 0xe8e2d8, pants: 0x1a1a20, skirt: 0x1a1a20, tights: 0x14141a, shoes: 0x1a1a1a, eye: 0x6a2a4a, fringe: 3, hairSide: 7, hairBack: 8, blush: true },
  paintExtra(S) {
    // a heart-shaped mark under one eye (she is obsessed with Sukuna's "love")
    S.mat = 'skin'; S.fine(9, 13.5, 0xd84a7a, 'skin'); S.fine(9.5, 13.5, 0xd84a7a, 'skin');
    // the dark carapace creeping over the shoulders
    S.mat = 'cloth'; for (let x = 16; x < 32; x += 2) S.px(x, 20, 0x1e2a24);
  },
  hair: (m) => [
    { x: 0, y: 8, z: -0.4, w: 8, h: 1.5, d: 8, material: m },
    { x: -3.6, y: 4, z: 0, w: 2, h: 9, d: 6, hang: true, material: m, stiff: 26 },
    { x: 3.6, y: 4, z: 0, w: 2, h: 9, d: 6, hang: true, material: m, stiff: 26 },
    { x: 0, y: 5, z: -3.7, w: 8, h: 11, d: 2, hang: true, material: m, stiff: 24 },
  ],
  hairColor: 0x2a1e1a, accent: SILVER, emit: 0.15, cape: null, scale: 1.12,
  props(rig, K) {
    const shell = K.mat(SHELL, { metalness: 0.6, roughness: 0.25 }), edge = K.mat(CHROME, { metalness: 0.9, roughness: 0.2 });
    // insect-armour gauntlets with blade spurs
    for (const h of [rig.handR, rig.handL]) { K.box(h, 2.4, 5, 2.4, shell, 0, -1, 0); K.box(h, 0.4, 3, 1.2, edge, 1.3, -1.5, 0, 0, 0, 0.2); }
    // a horned carapace crest over the brow
    K.box(rig.head, 1, 3, 1, shell, 0, 9.5, 2.2, -0.4); K.box(rig.head, 0.8, 1.6, 0.8, edge, 0, 11.2, 1.4, -0.7);
    K.box(rig.torso, 9, 3, 5, shell, 0, 10.5, 0);
  },
});

registerDomainEnv('threefold_affliction', {
  skyTop: 0x3a3a44, skyHorizon: 0xc8c8d0, fog: 0x8a8a94, fogDensity: 0.014, hemiSky: 0xe8e8f0, hemiGround: 0x3a3a40, hemiI: 1.2, sun: 0xf0f0f8, sunI: 1.1,
  grade: { tint: [0.98, 1.0, 1.04], lift: [0.01, 0.01, 0.02], sat: 0.55, contrast: 1.2, vignette: 0.45 }, floor: B.concrete,
});

export const YOROZU_SKILLS = [
  { id: 'carapace', name: 'Carapace', icon: '🪲', desc: '+8% melee damage and +3% damage reduction per rank.', max: 3, branch: 'Insect', tier: 0 },
  { id: 'construct', name: 'Construction', icon: '🔩', desc: 'Constructs are heavier and hit harder.', max: 3, req: 'ab:shards', branch: 'Construct', tier: 1 },
  { id: 'liquid', name: 'Quick Flow', icon: '🪙', desc: 'Liquid metal spreads wider and holds longer.', max: 3, req: 'ab:liquid_metal', branch: 'Liquid', tier: 2 },
  { id: 'sphere', name: 'Perfect Form', icon: '⚪', desc: 'The True Sphere is larger and travels further.', max: 2, req: 'ab:true_sphere', branch: 'Sphere', tier: 4 },
  { id: 'affliction', name: 'Threefold Affliction', icon: '🕸️', desc: 'The domain lasts 2s longer and its constructs strike harder.', max: 1, req: 'construct', branch: 'Construct', tier: 5 },
];

class YorozuKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const arm = { trail: SILVER, sparkColor: 0xffffff };
    this.combo = [
      { ...arm, style: 'swingR', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 13, range: 2.8, arc: 1.2, lunge: 6, knock: 3, stop: 0.045, shake: 0.14 },
      { ...arm, style: 'swingL', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 14, range: 2.8, arc: 1.2, lunge: 6, knock: 3, stop: 0.045, shake: 0.14 },
      { ...arm, style: 'uppercut', dur: 0.36, windup: 0.3, strike: 0.5, dmg: 17, range: 2.8, arc: 1.0, lunge: 5, knock: 5, stop: 0.06, shake: 0.2 },
      { ...arm, style: 'slam', dur: 0.58, windup: 0.44, strike: 0.6, dmg: 28, range: 3.4, arc: Math.PI, lunge: 3, knock: 10, stop: 0.1, shake: 0.42, ring: true, ringColor: SILVER, stagger: 0.7, spike: true },
    ];
    this.p.stats.meleeMult += r('carapace') * 0.08; this.p.stats.armor = Math.min(0.7, this.p.stats.armor + r('carapace') * 0.03);
    this.branches = ['Construct', 'Insect', 'Liquid', 'Sphere'];
    this.cMul = 1 + r('construct') * 0.15; this.lMul = 1 + r('liquid') * 0.2;
    this.library = {
      // ---- Construct
      shards: ability({ name: 'Metal Shards', icon: '🔩', kind: 'basic', desc: 'Construct three metal shards and fire them in a tight spread.', cd: 0.7, ce: 0, branch: 'Construct', tier: 0, start: true, legacy: 'ranged', use: () => this.shards() }),
      spear: ability({ name: 'Construct Spear', icon: '🔱', kind: 'basic', desc: 'A long metal spear that pierces every curse in a line.', cd: 1.3, ce: 0, branch: 'Construct', tier: 1, req: 'shards', use: () => this.spear() }),
      blade_ring: ability({ name: 'Blade Ring', icon: '⚙️', kind: 'technique', desc: 'A ring of blades forms around you, spins, then flies outward.', cd: 7, ce: 12, branch: 'Construct', tier: 1, legacy: 't1', req: 'shards', use: () => this.bladeRing() }),
      pillars: ability({ name: 'Construct Pillars', icon: '🗼', kind: 'technique', desc: 'Metal pillars punch up out of the ground in a line towards the aim.', cd: 8, ce: 14, branch: 'Construct', tier: 2, req: 'spear', use: () => this.pillars() }),
      hammer: ability({ name: 'Construct Hammer', icon: '🔨', kind: 'technique', desc: 'Build a giant hammer over the aim and bring it down.', cd: 10, ce: 18, branch: 'Construct', tier: 2, req: 'blade_ring', use: () => this.hammer() }),
      rain: ability({ name: 'Construct Rain', icon: '🌧️', kind: 'technique', desc: 'Dozens of metal spikes form overhead and rain down on the aim for 2s.', cd: 14, ce: 22, branch: 'Construct', tier: 3, req: ['pillars', 'hammer'], use: () => this.rain() }),
      // ---- Insect
      armour: ability({ name: 'Insect Armour', icon: '🪲', kind: 'defence', desc: 'Build an insect exoskeleton for 10s: 35% less damage and +20% melee damage.', cd: 20, ce: 14, branch: 'Insect', tier: 1, use: () => this.armour() }),
      mantis: ability({ name: 'Mantis Blades', icon: '🦗', kind: 'technique', desc: 'Your arms grow mantis blades: three fast, wide slashes forward.', cd: 6, ce: 10, branch: 'Insect', tier: 2, req: 'armour', use: () => this.mantis() }),
      wings: ability({ name: 'Wing Burst', icon: '🪽', kind: 'movement', desc: 'Insect wings snap open and carry you in a fast dash.', cd: 5, ce: 5, branch: 'Insect', tier: 2, req: 'armour', use: () => this.wings() }),
      beetle: ability({ name: 'Beetle Charge', icon: '🐞', kind: 'technique', desc: 'Grow a beetle horn and charge, tossing every curse in the way into the air.', cd: 9, ce: 12, branch: 'Insect', tier: 3, req: 'wings', use: () => this.beetle() }),
      pincers: ability({ name: 'Stag Pincers', icon: '🦀', kind: 'technique', desc: 'Huge stag-beetle pincers seize the targeted curse, crush it and fling it away.', cd: 10, ce: 14, branch: 'Insect', tier: 3, req: 'mantis', use: () => this.pincers() }),
      hornets: ability({ name: 'Hornet Constructs', icon: '🐝', kind: 'summon', desc: 'Construct a swarm of metal hornets that hunt curses and sting.', cd: 10, ce: 16, branch: 'Insect', tier: 2, req: 'armour', use: () => this.hornets() }),
      // ---- Liquid metal
      liquid_metal: ability({ name: 'Liquid Metal', icon: '🪙', kind: 'technique', desc: 'A wave of liquid metal floods forward and hardens into a field of spikes.', cd: 9, ce: 16, branch: 'Liquid', tier: 1, legacy: 't2', use: () => this.liquidMetal() }),
      whip: ability({ name: 'Mercury Whip', icon: '〰️', kind: 'technique', desc: 'A long whip of liquid metal lashes a wide arc in front of you.', cd: 5, ce: 8, branch: 'Liquid', tier: 2, req: 'liquid_metal', use: () => this.whip() }),
      flood: ability({ name: 'Metal Flood', icon: '🫗', kind: 'technique', desc: 'Liquid metal pools over the aim, then sets solid around the curses standing in it.', cd: 12, ce: 16, branch: 'Liquid', tier: 3, req: 'liquid_metal', use: () => this.flood() }),
      shell: ability({ name: 'Metal Shell', icon: '🛡️', kind: 'defence', desc: 'Liquid metal flows over you and soaks up to 80 damage for 6s.', cd: 16, ce: 12, branch: 'Liquid', tier: 2, req: 'liquid_metal', use: () => this.shellUp() }),
      // ---- Sphere
      spheres: ability({ name: 'Construct Spheres', icon: '🔘', kind: 'technique', desc: 'Three heavy construct spheres roll out and bowl curses over.', cd: 8, ce: 12, branch: 'Sphere', tier: 2, req: 'spear', use: () => this.spheres() }),
      mass: ability({ name: 'Falling Mass', icon: '🧊', kind: 'technique', desc: 'Construct a colossal block high above the aim and drop it.', cd: 16, ce: 28, branch: 'Sphere', tier: 3, req: 'spheres', use: () => this.mass() }),
      rebuild: ability({ name: 'Reconstruction', icon: '💗', kind: 'heal', desc: 'Rebuild your own body out of cursed energy: restore 30% of your health.', cd: 20, ce: 16, branch: 'Sphere', tier: 3, req: 'spheres', use: () => this.rctHeal(0.3, 1.6, HEART) }),
      true_sphere: ability({ name: 'True Sphere', icon: '⚪', kind: 'technique', desc: 'A perfect sphere with no surface area: it rolls slowly forward and destroys anything it touches.', cd: 24, ce: 48, branch: 'Sphere', tier: 4, legacy: 't3', req: 'mass', use: () => this.trueSphere() }),
    };
    this.passives = {
      exo: passive({ name: 'Exoskeleton', icon: '🪲', desc: '+20 max health; Insect Armour lasts 5s longer.', branch: 'Insect', tier: 2, req: 'armour', apply: (pl, k) => { pl.maxHp += 20; pl.hp += 20; k.exo = true; } }),
      mercury: passive({ name: 'Quicksilver', icon: '💧', desc: 'Liquid-metal techniques slow curses for 2s.', branch: 'Liquid', tier: 3, req: 'whip', apply: (pl, k) => { k.quick = true; } }),
      precision: passive({ name: 'Perfect Construction', icon: '📐', desc: 'Construction techniques hit 15% harder and cost 10% less Cursed Energy.', branch: 'Construct', tier: 3, req: 'blade_ring', apply: (pl, k) => { k.cMul *= 1.15; k.ceMul *= 0.9; } }),
      devotion: passive({ name: 'Devotion', icon: '💘', desc: 'Kills restore 2% health ("I will teach you love").', branch: 'Sphere', tier: 2, req: 'spheres', apply: (pl, k) => { k.devotion = true; } }),
    };
    this.domain = {
      name: 'Threefold Affliction', icon: '🕸️', key: 'threefold_affliction', type: 6, color: SILVER, sound: 'void', flash: 0xffffff,
      look: { floor: 0xb8b8c0, seam: 0x5a5a68, sparkle: 0xf0f0ff, skyTop: 0x2a2a34, skyHorizon: 0xd8d8e0, stars: 0, band: 0xffffff },
      duration: 8 + r('affliction') * 2, radius: 24,
      onStart: (g, d) => { this.buildPlain(g, d); g.toast?.('Sure-hit: constructs form inside every curse'); },
      onTick: (g, d, dt) => this.plainTick(g, d, dt),
      onEnd: () => this.clearPlain(),
    };
  }
  dispose() { super.dispose(); this.clearPlain(); }
  onKill() { if (this.devotion) this.p.heal?.(this.p.maxHp * 0.02, true); }
  chit(e, dmg, o = {}) { return this.hit(e, dmg * this.cMul, { color: '#e8e8f8', ...o }); }
  lhit(e, dmg, o = {}) { const d = this.hit(e, dmg * this.lMul, { color: '#c8d0e0', ...o }); if (this.quick) this.slow(e, 2); return d; }
  spikeAt(at, h = 2.4, color = CHROME) {
    const s = mesh(GEO.cone, mat(color, { metalness: 0.9, roughness: 0.15 }), [0.35, h, 0.35]);
    const gy = this.groundAt(at.x, at.z, at.y);
    temp(this, s, 0.9, (t, dt, k) => { const up = Math.min(1, t * 8), down = k > 0.7 ? (k - 0.7) / 0.3 : 0; s.position.set(at.x, gy + h * 0.5 * up - h * down, at.z); s.scale.set(0.35, h * up, 0.35); });
    return s;
  }
  onMeleeHit(e, step) { if (step.spike) { this.spikeAt(e.pos.clone(), 2.6); this.chit(e, 12, { stagger: 0.4 }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8); } }
  // ------------------------------------------------------------ Construct
  shards() {
    const g = this.game;
    this.cast(0.24);
    const { dir } = aimAt(this, this.handPos(), 16), base = Math.atan2(dir.x, dir.z);
    [-0.1, 0, 0.1].forEach((o, i) => this.after(i * 0.03, () => {
      const a = base + o;
      meshShot(this, mesh(GEO.box, mat(CHROME, { metalness: 0.9, roughness: 0.15 }), [0.08, 0.08, 0.7]), { pos: this.handPos(), vel: new THREE.Vector3(Math.sin(a), dir.y, Math.cos(a)).multiplyScalar(30), life: 0.6, radius: 0.35,
        trail: (q) => { if (Math.random() < 0.4) g.particles.burst(q.pos, { count: 1, color: SILVER, speed: 0.2, life: 0.2, size: 0.1, shape: 3 }); },
        onHit: (e, q) => { this.chit(e, 7, { stagger: 0.15, knock: q.vel.clone().setY(0).setLength(1.5) }); g.fx.hitSpark(q.pos, null, { color: SILVER }); } });
    }));
    g.audio?.energy('nail');
  }
  spear() {
    const g = this.game;
    this.cast(0.32);
    const { dir } = aimAt(this, this.handPos(), 18);
    meshShot(this, mesh(GEO.box, mat(SILVER, { metalness: 0.9, roughness: 0.1, emissive: 0.2 }), [0.12, 0.12, 2.4]), { pos: this.handPos(), vel: dir.clone().multiplyScalar(32), life: 0.7, radius: 0.5, pierce: true,
      onHit: (e, q) => { this.chit(e, 18, { stagger: 0.5, knock: q.vel.clone().setY(0).setLength(4) }); g.fx.hitSpark(q.pos, dir, { color: SILVER, big: true }); } });
    g.audio?.whoosh(1);
  }
  bladeRing() {
    const g = this.game, p = this.p, N = 8;
    this.cast(0.4, true);
    const blades = [];
    for (let i = 0; i < N; i++) { const b = mesh(GEO.box, mat(CHROME, { metalness: 0.9, roughness: 0.15, emissive: 0.15 }), [0.1, 0.5, 1.2]); g.scene.add(b); blades.push(b); }
    const hit = new Set();
    this.during(0.6, (t) => {
      blades.forEach((b, i) => { const a = t * 10 + i / N * Math.PI * 2; b.position.set(p.pos.x + Math.cos(a) * 1.8, p.pos.y + 1, p.pos.z + Math.sin(a) * 1.8); b.rotation.y = -a; });
      for (const e of this.foes(p.pos, 2.4)) if (!hit.has(e)) { hit.add(e); this.chit(e, 12, { stagger: 0.3 }); }
    }, () => {
      blades.forEach((b, i) => {
        g.scene.remove(b);
        const a = i / N * Math.PI * 2;
        meshShot(this, b, { pos: b.position.clone(), vel: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(20), life: 0.55, radius: 0.5, pierce: true, onHit: (e) => this.chit(e, 16, { stagger: 0.3 }) });
      });
      g.audio?.energy('slash');
    });
    g.audio?.tone({ freq: 600, to: 1200, dur: 0.5, gain: 0.05, type: 'square', filter: 3000 });
  }
  pillars() {
    const g = this.game, p = this.p, f = this.fwd();
    this.cast(0.4, true);
    for (let i = 0; i < 6; i++) this.after(i * 0.08, () => {
      const at = p.pos.clone().addScaledVector(f, 2.2 + i * 1.8); at.y = this.groundAt(at.x, at.z, p.pos.y);
      const col = mesh(GEO.box, mat(CHROME, { metalness: 0.8, roughness: 0.2 }), [1, 3, 1]);
      temp(this, col, 1, (t, dt, k) => { const up = Math.min(1, t * 9), down = k > 0.75 ? (k - 0.75) * 4 : 0; col.scale.y = 3.2 * up; col.position.set(at.x, at.y + col.scale.y / 2 - down * 3.2, at.z); });
      for (const e of this.foes(at, 1.3)) { this.chit(e, 20, { stagger: 0.6 }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 10); }
      g.fx.landDust(at, 10); g.audio?.impact(0.8);
    });
  }
  hammer() {
    const g = this.game, p = this.p, c = this.aimGround(10), R = 3.4;
    this.cast(0.5, true);
    g.markers.spawn({ pos: c, dur: 0.6, radius: R, color: SILVER });
    const grp = new THREE.Group();
    const head = mesh(GEO.box, mat(CHROME, { metalness: 0.85, roughness: 0.2 }), [2.4, 2.4, 4.4]); grp.add(head);
    const handle = mesh(GEO.box, mat(SHELL, { metalness: 0.5 }), [0.5, 6, 0.5]); handle.position.y = 4; grp.add(handle);
    const piv = p.pos.clone(); const dir = tmp2.subVectors(c, piv).setY(0); const dist = dir.length(); dir.normalize();
    temp(this, grp, 0.6, (t, dt, k) => {
      const ang = -Math.PI * 0.6 + k * k * Math.PI * 0.6;
      const at = tmp.copy(piv).addScaledVector(dir, dist * (0.4 + 0.6 * k)); grp.position.set(at.x, c.y + 1.2 + Math.cos(ang) * 6, at.z);
      grp.rotation.set(0, Math.atan2(dir.x, dir.z), 0); grp.rotateX(ang);
    }, () => {
      this.blast(c, R, 60 * this.cMul, { color: SILVER, knock: 12, stagger: 1, unblockable: true });
      for (let i = 0; i < 12; i++) g.debris.spawn(c.clone().setY(c.y + 0.4), new THREE.Vector3((Math.random() - 0.5) * 9, 3 + Math.random() * 5, (Math.random() - 0.5) * 9), 0.25, new THREE.Color(0x8a8a90), 2);
      g.hitStop(0.06); g.shake(0.6);
    });
    g.audio?.whoosh(1.4);
  }
  rain() {
    const g = this.game, c = this.aimGround(12), R = 5;
    this.cast(0.5, true);
    g.markers.spawn({ pos: c, dur: 0.5, radius: R, color: SILVER });
    g.toast?.('Construct Rain');
    let tick = 0.4;
    this.during(2.4, (t, dt) => {
      tick -= dt; if (tick > 0) return; tick = 0.06;
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      const at = new THREE.Vector3(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr); at.y = this.groundAt(at.x, at.z, c.y);
      meshShot(this, mesh(GEO.cone, mat(CHROME, { metalness: 0.9, roughness: 0.15 }), [0.18, 1, 0.18]), { pos: at.clone().setY(at.y + 10), vel: new THREE.Vector3(0, -34, 0), life: 0.3, radius: 0.1, ghost: true, face: false,
        onExpire: () => { g.combat.aoe(at, 1.1, 10 * this.cMul, this.p, { stagger: 0.25, blocks: false }); g.particles.burst(at.clone().setY(at.y + 0.2), { count: 4, color: SILVER, speed: 3, life: 0.25, size: 0.1, shape: 3 }); } });
    });
  }
  // ------------------------------------------------------------ Insect
  armour() {
    const g = this.game, p = this.p, dur = 10 + (this.exo ? 5 : 0);
    this.cast(0.4, true);
    const plates = new THREE.Group();
    for (const [x, y, z, w, h] of [[0, 1.3, 0.3, 0.9, 0.7], [0, 0.8, 0.3, 0.8, 0.4], [0, 1.9, 0.1, 0.8, 0.3]]) { const pl = mesh(GEO.box, mat(SHELL, { metalness: 0.7, roughness: 0.2, emissive: 0.1, emissiveColor: SILVER }), [w, h, 0.3]); pl.position.set(x, y, z); plates.add(pl); }
    for (const s of [-1, 1]) { const horn = mesh(GEO.cone, mat(CHROME, { metalness: 0.9 }), [0.1, 0.6, 0.1]); horn.position.set(s * 0.25, 2.6, 0.2); horn.rotation.z = -s * 0.4; plates.add(horn); }
    g.fx.flash(SILVER, 0.2, 0.2); g.audio?.energy('nail');
    this.statBuff('armour', dur, { armor: 0.35, meleeMult: 0.2 }, {
      onStart: () => g.scene.add(plates),
      onTick: () => { plates.position.copy(p.pos); plates.rotation.y = p.facing; },
      onEnd: () => g.scene.remove(plates),
    });
  }
  mantis() {
    const g = this.game, p = this.p, f = this.fwd();
    for (let i = 0; i < 3; i++) this.after(i * 0.13, () => {
      this.pose(i % 2 ? 'swingL' : 'swingR', 0.14);
      g.fx.slashArc(p.pos.clone().setY(p.pos.y + 1), p.facing, SILVER, 3.4, 1.0, 0.18, i % 2 === 1);
      for (const e of this.foes(p.pos, 3.6, f, 1.1)) this.chit(e, 16, { melee: true, stagger: 0.35, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(3) });
      g.audio?.energy('slash');
    });
  }
  wings() {
    const g = this.game, p = this.p, f = this.fwd();
    const wings = new THREE.Group();
    for (const s of [-1, 1]) { const w = mesh(GEO.box, glow(0xc8e8ff, 1.2, 0.45), [1.4, 0.03, 0.6]); w.position.set(s * 0.8, 1.6, -0.3); w.rotation.z = s * 0.4; wings.add(w); }
    temp(this, wings, 0.35, (t) => { wings.position.copy(p.pos); wings.rotation.y = p.facing; wings.children.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.4 + Math.sin(t * 80) * 0.3); }); });
    this.dash(f, 8, 0.25, { color: SILVER });
    g.audio?.noise({ dur: 0.3, gain: 0.2, type: 'bandpass', freq: 200, sweep: 400, q: 4 });
  }
  beetle() {
    const g = this.game, p = this.p, f = this.fwd();
    const horn = mesh(GEO.cone, mat(SHELL, { metalness: 0.7, roughness: 0.2 }), [0.3, 1.4, 0.3]);
    temp(this, horn, 0.45, () => { horn.position.set(p.pos.x + Math.sin(p.facing) * 0.9, p.pos.y + 1.6, p.pos.z + Math.cos(p.facing) * 0.9); horn.rotation.set(Math.PI / 2 - 0.6, p.facing, 0, 'YXZ'); });
    this.dash(f, 10, 0.4, { hitR: 1.8, dmg: 26 * this.cMul, color: SILVER, onHit: (e) => { if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 13); g.audio?.impact(1.2); } });
    g.audio?.whoosh(1.3);
  }
  pincers() {
    const g = this.game, p = this.p, t = this.target(9);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    const grp = new THREE.Group();
    for (const s of [-1, 1]) { const j = mesh(GEO.box, mat(SHELL, { metalness: 0.7, roughness: 0.2 }), [0.4, 0.4, 2.6]); j.position.set(s * 1.2, 0, 0); grp.add(j); }
    this.stun(t, 1);
    temp(this, grp, 0.7, (tt, dt, k) => {
      if (t.dead) return false;
      grp.position.set(t.pos.x, t.pos.y + 1, t.pos.z); grp.rotation.y = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
      grp.children.forEach((j, i) => { j.position.x = (i ? 1 : -1) * (1.2 - Math.min(1, k * 2) * 0.7); j.rotation.y = (i ? -1 : 1) * 0.3; });
    }, () => {
      if (t.dead) return;
      this.chit(t, 50, { stagger: 1, unblockable: true, knock: tmp.subVectors(t.pos, p.pos).setY(0).setLength(14) });
      if (!t.isBoss) t.vel.y = 9;
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + 1), null, { color: SILVER, big: true }); g.audio?.impact(1.5); g.shake(0.3);
    });
  }
  hornets() {
    const g = this.game, p = this.p;
    const foes = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 20);
    if (!foes.length) { g.toast?.('No curses to hunt'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    for (let i = 0; i < 7; i++) this.after(i * 0.05, () => {
      const a = i / 7 * Math.PI * 2;
      const h = new THREE.Group(); h.add(mesh(GEO.box, mat(0xd8b040, { metalness: 0.8, roughness: 0.2 }), [0.2, 0.2, 0.45])); const st = mesh(GEO.cone, mat(SHELL), [0.06, 0.2, 0.06]); st.rotation.x = -Math.PI / 2; st.position.z = -0.3; h.add(st);
      meshShot(this, h, { pos: p.pos.clone().setY(p.pos.y + 1.6), vel: new THREE.Vector3(Math.sin(a) * 7, 3, Math.cos(a) * 7), life: 2.2, radius: 0.4, ghost: true, homing: 5, target: foes[i % foes.length],
        trail: (q) => { q.homing = Math.min(14, q.homing + 0.25); },
        onHit: (e) => { this.chit(e, 14, { stagger: 0.25 }); this.slow(e, 1); g.audio?.tone({ freq: 1200, to: 800, dur: 0.06, gain: 0.04, type: 'square', filter: 4000 }); } });
    });
    g.audio?.noise({ dur: 0.6, gain: 0.15, type: 'bandpass', freq: 300, sweep: 500, q: 6 });
  }
  // ------------------------------------------------------------ Liquid metal
  liquidMetal() {
    const g = this.game, p = this.p, f = this.fwd(), L = 10 + this.rank('liquid'), W = 2.2 + this.rank('liquid') * 0.4;
    this.cast(0.45, true);
    const sheet = mesh(GEO.box, mat(CHROME, { metalness: 1, roughness: 0.05 }), [W * 2, 0.15, 0.1]);
    sheet.rotation.y = Math.atan2(f.x, f.z);
    const start = p.pos.clone();
    temp(this, sheet, 0.5, (t, dt, k) => { const c = tmp.copy(start).addScaledVector(f, k * L * 0.5); sheet.position.set(c.x, this.groundAt(c.x, c.z, start.y) + 0.08, c.z); sheet.scale.set(W * 2, 0.15, k * L + 0.1); sheet.position.addScaledVector(f, 0); });
    this.after(0.45, () => {
      for (let i = 0; i < 14; i++) { const at = start.clone().addScaledVector(f, 1.5 + Math.random() * (L - 1.5)).addScaledVector(tmp2.set(f.z, 0, -f.x), (Math.random() - 0.5) * W * 2); this.spikeAt(at, 1.6 + Math.random() * 1.6); }
      this.line(start, f, L, W, (e) => { this.lhit(e, 32, { stagger: 0.8 }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7); });
      g.audio?.impact(1.2); g.shake(0.3);
    });
    g.audio?.noise({ dur: 0.5, gain: 0.2, type: 'lowpass', freq: 400, sweep: 1600 });
  }
  whip() {
    const g = this.game, p = this.p, f = this.fwd(), R = 6.5;
    this.pose('swingR', 0.35);
    g.fx.slashArc(p.pos.clone().setY(p.pos.y + 1), p.facing, CHROME, R, 1.1, 0.25);
    g.fx.slashArc(p.pos.clone().setY(p.pos.y + 1.05), p.facing, 0xffffff, R * 0.95, 1.1, 0.2);
    for (const e of this.foes(p.pos, R, f, 1.15)) this.lhit(e, 22, { stagger: 0.5, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(6) });
    g.audio?.noise({ dur: 0.25, gain: 0.3, type: 'highpass', freq: 2000, sweep: 6000 });
  }
  flood() {
    const g = this.game, c = this.aimGround(12), R = 4 + this.rank('liquid') * 0.5;
    this.cast(0.45, true);
    const pool = mesh(GEO.cylSolid, mat(CHROME, { metalness: 1, roughness: 0.05 }), [0.1, 0.1, 0.1]);
    temp(this, pool, 3.2, (t, dt, k) => { const s = Math.min(1, t * 3) * R; pool.scale.set(s, 0.1, s); pool.position.set(c.x, c.y + 0.06, c.z); });
    for (const e of this.foes(c, R)) this.slow(e, 1);
    this.after(0.8, () => {
      const set = this.foes(c, R);
      for (const e of set) { this.stun(e, 2 * (1 + this.rank('liquid') * 0.15)); this.lhit(e, 26, { stagger: 0.6 }); const shell = mesh(GEO.box, mat(CHROME, { metalness: 1, roughness: 0.1 }), [(e.radius ?? 0.5) * 2.4, (e.height ?? 1.5) * 0.6, (e.radius ?? 0.5) * 2.4]); temp(this, shell, 2, () => { if (e.dead) return false; shell.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) * 0.3, e.pos.z); }); }
      g.audio?.tone({ freq: 300, to: 150, dur: 0.3, gain: 0.12, type: 'square', filter: 1200 });
    });
  }
  shellUp() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    let hp = 80;
    const orb = mesh(GEO.sphere, mat(CHROME, { metalness: 1, roughness: 0.05, opacity: 0.45 }), 1.3);
    g.audio?.energy('infinity');
    this.buff('metal_shell', 6, {
      onStart: () => g.scene.add(orb),
      incoming: (a) => { const s = Math.min(hp, a); hp -= s; g.particles.burst(orb.position, { count: 6, color: SILVER, speed: 3, life: 0.3, size: 0.12, shape: 3 }); if (hp <= 0) { const b = this.buffs.get('metal_shell'); if (b) b.left = 0.01; } return a - s; },
      onTick: () => { orb.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z); orb.scale.setScalar(1.3 + Math.sin(g.time * 6) * 0.05); },
      onEnd: () => g.scene.remove(orb),
    });
  }
  // ------------------------------------------------------------ Sphere
  spheres() {
    const g = this.game, p = this.p, base = this.aimAngle();
    this.cast(0.4, true);
    [-0.35, 0, 0.35].forEach((o) => {
      const a = base + o, b = mesh(GEO.sphere, mat(SPHERE, { metalness: 0.6, roughness: 0.15 }), 0.6);
      meshShot(this, b, { pos: p.pos.clone().setY(p.pos.y + 0.6).add(tmp.set(Math.sin(a), 0, Math.cos(a))), vel: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(12), life: 1.2, radius: 0.7, pierce: true, face: false,
        trail: (q, dt) => { b.rotation.x += dt * 10; q.pos.y = this.groundAt(q.pos.x, q.pos.z, q.pos.y) + 0.6; },
        onHit: (e, q) => { this.chit(e, 20, { stagger: 0.6, knock: q.vel.clone().setY(0).setLength(9) }); g.audio?.impact(1); } });
    });
    g.audio?.noise({ dur: 0.6, gain: 0.2, type: 'lowpass', freq: 200, sweep: 500 });
  }
  mass() {
    const g = this.game, p = this.p, c = this.aimGround(13), R = 4.5;
    p.action = { type: 'cast', both: true, dur: 0.7, elapsed: 0, t: 0, moveScale: 0.2, lock: true, faceAim: true };
    g.toast?.('Falling Mass'); g.markers.spawn({ pos: c, dur: 1.1, radius: R, color: SILVER });
    const block = mesh(GEO.box, mat(0x6a6a74, { metalness: 0.5, roughness: 0.4 }), [R * 1.4, R, R * 1.4]);
    temp(this, block, 1.1, (t, dt, k) => { block.position.set(c.x, c.y + R / 2 + (1 - k * k) * 24, c.z); block.rotation.y = k; }, () => {
      this.blast(c, R, 95 * this.cMul, { color: SILVER, knock: 14, stagger: 1, unblockable: true });
      for (let i = 0; i < 20; i++) g.debris.spawn(c.clone().setY(c.y + 0.6), new THREE.Vector3((Math.random() - 0.5) * 14, 4 + Math.random() * 7, (Math.random() - 0.5) * 14), 0.3, new THREE.Color(0x7a7a84), 3);
      g.fx.screenWave(c, 1.2, 0.5); g.hitStop(0.08); g.shake(0.8); g.audio?.energy('explode');
    });
    g.audio?.charge(1, 0.5);
  }
  trueSphere() {
    const g = this.game, p = this.p, f = this.fwd(), R = 1.6 + this.rank('sphere') * 0.4, L = 18 + this.rank('sphere') * 4;
    p.action = { type: 'cast', both: true, dur: 1.1, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    g.toast?.('True Sphere'); g.audio?.charge(0.8, 0.4);
    const sphere = makeOrb(SPHERE, { radius: 0.1, coreColor: 0xffffff });
    const start = p.pos.clone().addScaledVector(f, 1.8).setY(p.pos.y + R + 0.2);
    const hit = new Set();
    g.fx.dimTarget = 0.3;
    temp(this, sphere, 0.8, (t, dt, k) => { sphere.position.copy(start); sphere.scale.setScalar(R * k); });
    this.after(0.8, () => {
      g.fx.dimTarget = 0;
      const light = g.lights.attach(sphere, SPHERE, 8, 14, { offsetY: 0, priority: 5 });
      temp(this, sphere, 2.4, (t, dt, k) => {
        sphere.position.copy(start).addScaledVector(f, k * L); sphere.scale.setScalar(R);
        const c = sphere.position;
        // nothing survives contact: the sphere has no surface area
        for (const e of this.foes(c, R + 0.6)) if (!hit.has(e)) {
          hit.add(e);
          const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6);
          this.chit(e, e.isBoss ? 160 + mx * 0.04 : Math.max(220, mx * 1.2), { stagger: 1, unblockable: true, crit: false, knock: tmp.copy(f).setLength(6) });
          g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: 0xffffff, big: true }); g.hitStop(0.05);
        }
        g.combat.hitBlocks(c, f, R + 0.5, Math.PI, 400, p);
        if (Math.random() < 0.7) g.particles.burst(c, { count: 2, color: SPHERE, speed: 2, life: 0.4, size: 0.2 });
      }, () => { g.lights.remove(light); g.fx.flash(0xffffff, 0.3, 0.2); });
      g.fx.flash(0xffffff, 0.35, 0.2); g.audio?.energy('purple');
    });
  }
  // ------------------------------------------------------------ Domain
  buildPlain(g, d) {
    this.clearPlain();
    const grp = new THREE.Group(), c = d.center, gy = this.groundAt(c.x, c.z, c.y);
    const metal = mat(0x9a9aa8, { metalness: 0.8, roughness: 0.3 }), pale = mat(0xe0e0e8, { roughness: 0.8 }), dk = mat(0x3a3a44, { metalness: 0.5, roughness: 0.4 });
    // half-built constructs: frames, spheres and spikes scattered over a barren plain
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, rr = 5 + Math.random() * (d.radius - 6), x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      const kind = i % 3;
      if (kind === 0) { const s = 0.6 + Math.random() * 1.6; const o = mesh(GEO.sphere, pale, s); o.position.set(x, gy + s + Math.random() * 1.5, z); grp.add(o); }
      else if (kind === 1) { const h = 2.5 + Math.random() * (rr > d.radius - 6 ? 8 : 3); const o = mesh(GEO.cone, metal, [0.6, h, 0.6]); o.position.set(x, gy + h / 2, z); o.rotation.z = (Math.random() - 0.5) * 0.6; grp.add(o); }
      else { const fr = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = mesh(GEO.box, dk, [0.2, 4, 0.2]); b.position.set((k & 1) * 2 - 1, 2, (k >> 1) * 2 - 1); fr.add(b); } const top = mesh(GEO.box, dk, [2.4, 0.2, 2.4]); top.position.y = 4; fr.add(top); fr.position.set(x, gy, z); fr.rotation.y = Math.random() * 3; grp.add(fr); }
    }
    // three great rings overhead: the threefold affliction
    this.rings3 = [];
    for (let i = 0; i < 3; i++) { const r = mesh(GEO.torus, glow(SILVER, 1.2, 0.7), 6 + i * 6); r.scale.z = 0.4; r.position.set(c.x, gy + 0.15, c.z); r.rotation.x = Math.PI / 2; grp.add(r); this.rings3.push(r); }
    this.plain = rise(this, grp, -7, 0.6);
    this.plainLight = g.lights.flash(c.clone().setY(gy + 12), SILVER, 2, d.radius * 2, 60, { priority: 4, fade: false });
  }
  clearPlain() {
    const g = this.game;
    if (this.plain) { g.scene.remove(this.plain); this.plain = null; }
    if (this.plainLight) { g.lights.remove(this.plainLight); this.plainLight = null; }
  }
  plainTick(g, d, dt) {
    (this.rings3 ?? []).forEach((r, i) => { r.rotation.z += dt * (0.3 + i * 0.2) * (i % 2 ? -1 : 1); });
    d.build = (d.build ?? 0.4) - dt;
    if (d.build > 0) return;
    d.build = 0.65;
    const mul = 1 + this.rank('affliction') * 0.25;
    for (const e of insideFoes(g)) {
      const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6);
      this.spikeAt(e.pos.clone(), (e.height ?? 1.5) + 1.2);
      const s = mesh(GEO.sphere, mat(SPHERE, { metalness: 0.6, roughness: 0.1 }), 0.1);
      temp(this, s, 0.4, (t, dt2, k) => { s.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) * 0.5, e.pos.z); s.scale.setScalar(0.6 * Math.sin(k * Math.PI)); });
      this.hit(e, (e.isBoss ? mx * 0.022 : Math.max(16, mx * 0.2)) * mul, { stagger: e.isBoss ? 0 : 0.5, unblockable: true, crit: false, ceGain: 0, color: '#e8e8f8' });
      if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 5);
    }
    g.audio?.tone({ freq: 800, to: 400, dur: 0.12, gain: 0.05, type: 'square', filter: 2500 });
  }
}
registerKit('yorozu', YorozuKit, YOROZU_SKILLS);
