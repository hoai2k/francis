// Takako Uro-style kit — Sky Manipulation (the Heian sorcerer of the Sendai
// colony, former leader of the Fujiwara Clan's Sun, Moon and Stars squad).
// She treats the sky itself as a surface she can grip, fold, flip and crack.
// 20 abilities on the technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB        quick strikes, the last one cracking the air like glass.
//   Fold       Sky Shard (start, RMB), Sky Ripple, Sky Fold, Sky Flip,
//              Horizon Sweep, Falling Heavens
//   Thin Ice   Thin Ice Breaker, Spreading Cracks, Frozen Sky, Shatterstorm
//   Surface    Folded Deflection, Sky Wall, Sky Pull, Sky Cocoon
//   Flight     Sky Walk, Sky Dive, Unfold, Clear Skies, Boundless Sky, Starfall
//   F          Ultimate: Thin Ice Breaker: Shattered Heavens (no canon domain) —
//              she grips the whole sky over the battlefield, cracks it like
//              thin ice and brings it down in shards.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { GEO, glow, mat, temp, mesh, beam, pillar, meshShot, pull, sigil, aimAt } from './fxlib.js';

const SKY = 0x6ac8ff, DEEPSKY = 0x2a6ae8, CRACK = 0xffffff, DUSK = 0xffb07a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('uro', { name: 'Uro', technique: 'Sky Manipulation', rarity: 'rare', title: 'Sun, Moon and Stars', desc: 'Grip the sky like a surface: fold it onto curses, flip the ground, deflect attacks and crack the heavens like thin ice.', ultimate: 'Thin Ice Breaker: Shattered Heavens', color: '#6ac8ff' });

registerLook('uro', {
  paint: { skinTone: 0xf2d8c6, hair: 0x0e0e14, hairVolume: true, top: 0x1a1e2e, collar: 0x1a1e2e, topTrim: 0x6ac8ff, buttons: 0x6ac8ff, sleeve: 0x1a1e2e, pants: 0x14161e, skirt: 0x14161e, tights: 0x101016, shoes: 0x0e0e14, eye: 0x3a5a8a, fringe: 3, hairSide: 7, hairBack: 8 },
  paintExtra(S) { S.mat = 'cloth'; for (let y = 20; y < 32; y += 3) S.px(23, y, 0x6ac8ff); S.rect(20, 28, 8, 1, 0x6ac8ff, 0.05); },
  hair: (m) => [
    { x: 0, y: 8, z: -0.4, w: 8, h: 1.5, d: 8, material: m },
    { x: -3.6, y: 4, z: 0, w: 2, h: 12, d: 6, hang: true, material: m, stiff: 22 },
    { x: 3.6, y: 4, z: 0, w: 2, h: 12, d: 6, hang: true, material: m, stiff: 22 },
    { x: 0, y: 5, z: -3.7, w: 8, h: 15, d: 2, hang: true, material: m, stiff: 20 },
  ],
  hairColor: 0x0e0e14, accent: SKY, emit: 0.2, cape: null, scale: 1.2,
  props(rig, K) {
    // the sky clinging to her fingertips like folded cloth
    const sky = K.mat(SKY, { emissive: 1.5 }), cloth = K.mat(0x1a1e2e, { roughness: 0.9 });
    K.box(rig.handR, 2, 0.4, 2, sky, 0, -3, 0.6, 0.3); K.box(rig.handL, 2, 0.4, 2, sky, 0, -3, 0.6, 0.3);
    K.box(rig.torso, 8.6, 2, 4.6, cloth, 0, 11.8, 0);   // high collar
  },
});

export const URO_SKILLS = [
  { id: 'poise', name: 'Poise', icon: '🌙', desc: '+6% movement speed and +6% melee damage per rank.', max: 3, branch: 'Flight', tier: 0 },
  { id: 'fold', name: 'Sky Folding', icon: '🌌', desc: 'Folded sky is wider and hits harder.', max: 3, req: 'ab:shard', branch: 'Fold', tier: 1 },
  { id: 'ice', name: 'Thin Ice', icon: '🧊', desc: 'Cracks spread further and shatter harder.', max: 3, req: 'ab:breaker', branch: 'Thin Ice', tier: 2 },
  { id: 'surface', name: 'Surface', icon: '🪞', desc: 'Defensive sky lasts longer.', max: 2, req: 'ab:deflect', branch: 'Surface', tier: 2 },
  { id: 'heavens', name: 'Shattered Heavens', icon: '🌠', desc: 'The ultimate covers more ground and its shards hit harder.', max: 2, req: 'ice', branch: 'Thin Ice', tier: 4 },
];

class UroKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const sk = { trail: SKY, sparkColor: CRACK };
    this.combo = [
      { ...sk, style: 'swingR', dur: 0.28, windup: 0.26, strike: 0.5, dmg: 12, range: 2.7, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.12 },
      { ...sk, style: 'swingL', dur: 0.28, windup: 0.26, strike: 0.5, dmg: 13, range: 2.7, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.12 },
      { ...sk, style: 'punch', dur: 0.46, windup: 0.38, strike: 0.58, dmg: 24, range: 3.2, arc: 1.1, lunge: 4, knock: 10, stop: 0.08, shake: 0.32, ring: true, ringColor: SKY, stagger: 0.6, crackHit: true },
    ];
    this.p.stats.speed += r('poise') * 0.06; this.p.stats.meleeMult += r('poise') * 0.06;
    this.branches = ['Fold', 'Thin Ice', 'Surface', 'Flight'];
    this.foldMul = 1 + r('fold') * 0.15; this.iceMul = 1 + r('ice') * 0.15; this.surfMul = 1 + r('surface') * 0.3;
    this.library = {
      // ---- Fold
      shard: ability({ name: 'Sky Shard', icon: '🔷', kind: 'basic', desc: 'Tear off a pane of sky and fling it edge first.', cd: 0.75, ce: 0, branch: 'Fold', tier: 0, start: true, legacy: 'ranged', use: () => this.shard() }),
      ripple: ability({ name: 'Sky Ripple', icon: '〰️', kind: 'basic', desc: 'Flick the sky like a sheet: a ripple runs along it and knocks curses down.', cd: 1.1, ce: 0, branch: 'Fold', tier: 1, req: 'shard', use: () => this.ripple() }),
      fold: ability({ name: 'Sky Fold', icon: '🌌', kind: 'technique', desc: 'Fold a sheet of the sky down on the aim like a closing book.', cd: 7, ce: 14, branch: 'Fold', tier: 1, legacy: 't1', req: 'shard', use: () => this.fold() }),
      flip: ability({ name: 'Sky Flip', icon: '🔄', kind: 'technique', desc: 'Flip the surface under the curses at the aim: they are thrown upside-down into the air and land hard.', cd: 10, ce: 16, branch: 'Fold', tier: 2, req: 'fold', use: () => this.flip() }),
      sweep: ability({ name: 'Horizon Sweep', icon: '🌅', kind: 'technique', desc: 'Pull the horizon itself across the battlefield in a long, wide slice.', cd: 9, ce: 14, branch: 'Fold', tier: 2, req: 'ripple', use: () => this.sweep() }),
      falling: ability({ name: 'Falling Heavens', icon: '⬇️', kind: 'technique', desc: 'Grip a great slab of sky high above the aim and drag it down.', cd: 18, ce: 34, branch: 'Fold', tier: 4, legacy: 't3', req: ['flip', 'sweep'], use: () => this.falling() }),
      // ---- Thin Ice
      breaker: ability({ name: 'Thin Ice Breaker', icon: '🧊', kind: 'technique', desc: 'Grip the air in front of you like thin ice and strike: it shatters through a line of curses.', cd: 8, ce: 14, branch: 'Thin Ice', tier: 1, legacy: 't2', use: () => this.breaker() }),
      cracks: ability({ name: 'Spreading Cracks', icon: '🕸️', kind: 'technique', desc: 'Cracks race out across the surface around you, then the whole web shatters.', cd: 10, ce: 16, branch: 'Thin Ice', tier: 2, req: 'breaker', use: () => this.cracks() }),
      frozen: ability({ name: 'Frozen Sky', icon: '❄️', kind: 'technique', desc: 'Turn the sky over the aim to brittle glass for 4s: curses under it are slowed and take more from shattering.', cd: 14, ce: 16, branch: 'Thin Ice', tier: 3, req: 'cracks', use: () => this.frozen() }),
      shatterstorm: ability({ name: 'Shatterstorm', icon: '💠', kind: 'technique', desc: 'Shards of broken sky whirl around you for 3s, slicing everything close.', cd: 12, ce: 16, branch: 'Thin Ice', tier: 3, req: 'cracks', use: () => this.shatterstorm() }),
      // ---- Surface
      deflect: ability({ name: 'Folded Deflection', icon: '🪞', kind: 'defence', desc: 'Fold the sky in front of you for 3s: shots are turned back on the curses, and you take 40% less damage.', cd: 12, ce: 10, branch: 'Surface', tier: 1, use: () => this.deflect() }),
      wall: ability({ name: 'Sky Wall', icon: '🧱', kind: 'defence', desc: 'Stand a pane of sky up as a wall for 5s; curses that run into it are thrown back.', cd: 14, ce: 12, branch: 'Surface', tier: 2, req: 'deflect', use: () => this.wall() }),
      pull: ability({ name: 'Sky Pull', icon: '🫳', kind: 'technique', desc: 'Grab the sky over the aim and yank it toward you, dragging curses along with it.', cd: 8, ce: 10, branch: 'Surface', tier: 2, req: 'deflect', use: () => this.skyPull() }),
      cocoon: ability({ name: 'Sky Cocoon', icon: '🫧', kind: 'defence', desc: 'Wrap yourself in folded sky for 4s: nearly untouchable, and you heal a little.', cd: 22, ce: 14, branch: 'Surface', tier: 3, req: 'wall', use: () => this.cocoon() }),
      // ---- Flight
      walk: ability({ name: 'Sky Walk', icon: '👣', kind: 'movement', desc: 'Step up onto the sky and stride through the air to the aim.', cd: 6, ce: 6, branch: 'Flight', tier: 1, use: () => this.skyWalk() }),
      dive: ability({ name: 'Sky Dive', icon: '🦅', kind: 'movement', desc: 'Leap onto the sky above the targeted curse and drop on it.', cd: 9, ce: 10, branch: 'Flight', tier: 2, req: 'walk', use: () => this.dive() }),
      unfold: ability({ name: 'Unfold', icon: '📄', kind: 'movement', desc: 'Fold the space between, step through and unfold it behind you.', cd: 5, ce: 5, branch: 'Flight', tier: 2, req: 'walk', use: () => this.unfold() }),
      clear: ability({ name: 'Clear Skies', icon: '☀️', kind: 'heal', desc: 'The sky clears over you: restore 25% of your health.', cd: 20, ce: 14, branch: 'Flight', tier: 3, req: 'unfold', use: () => this.rctHeal(0.25, 2, SKY) }),
      boundless: ability({ name: 'Boundless Sky', icon: '🌤️', kind: 'buff', desc: 'For 10s the whole sky is yours: cooldowns tick 40% faster and you move faster.', cd: 30, ce: 16, branch: 'Flight', tier: 3, req: 'dive', use: () => this.boundless() }),
      starfall: ability({ name: 'Starfall', icon: '🌠', kind: 'technique', desc: 'Crack the night sky over the aim: its stars fall in streaks for 3s.', cd: 22, ce: 40, branch: 'Flight', tier: 4, req: ['boundless', 'clear'], use: () => this.starfall() }),
    };
    this.passives = {
      sun: passive({ name: 'Sun Squad', icon: '☀️', desc: '+8% technique damage and +5% critical chance.', branch: 'Fold', tier: 2, req: 'ripple', apply: (pl) => { pl.stats.techMult += 0.08; pl.stats.crit += 0.05; } }),
      moon: passive({ name: 'Moon Squad', icon: '🌙', desc: 'Movement abilities leave a crack behind that shatters for damage.', branch: 'Flight', tier: 2, req: 'walk', apply: (pl, k) => { k.moonTrail = true; } }),
      stars: passive({ name: 'Star Squad', icon: '⭐', desc: 'Thin Ice techniques restore 3 Cursed Energy per curse they hit (once per cast).', branch: 'Thin Ice', tier: 3, req: 'cracks', apply: (pl, k) => { k.starCE = true; } }),
      mirror: passive({ name: 'Mirror Sky', icon: '🪞', desc: '+8% damage reduction; deflected shots hit twice as hard.', branch: 'Surface', tier: 3, req: 'wall', apply: (pl, k) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.08); k.mirror = true; } }),
    };
    this.ultimate = { name: 'Thin Ice Breaker: Shattered Heavens', short: 'Shattered Heavens', icon: '🌠', use: () => this.shatteredHeavens() };
  }
  shit(e, dmg, o = {}) { return this.hit(e, dmg * this.foldMul, { color: '#a8e0ff', ...o }); }
  ihit(e, dmg, o = {}) { const d = this.hit(e, dmg * this.iceMul * (e.frozenSky > this.game.time ? 1.3 : 1), { color: '#e8f8ff', ...o }); if (this.starCE && o.cast && !o.cast.has(e)) { o.cast.add(e); this.p.gainCE(3); } return d; }
  pane(w, h, opacity = 0.55) { const m = mesh(GEO.box, mat(SKY, { emissive: 0.9, opacity, roughness: 0.05, metalness: 0.2 }), [w, 0.12, h]); return m; }
  crackLines(c, R, n = 8) {
    const g = this.game;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.random() * 0.3; g.fx.slashLine(tmp.set(c.x, c.y + 0.12, c.z), tmp2.set(Math.cos(a), 0, Math.sin(a)), R * (0.6 + Math.random() * 0.4), CRACK, 0.08, 0.5); }
  }
  shatterFx(at, n = 14) { this.game.particles.burst(tmp.copy(at), { count: n, color: SKY, speed: 6, up: 2, life: 0.6, size: 0.18, gravity: 10, shape: 1, intensity: 2.2 }); this.game.audio?.tone({ freq: 3000, to: 1500, dur: 0.12, gain: 0.05, type: 'triangle' }); }
  onMeleeHit(e, step) { if (step.crackHit) { this.shatterFx(e.pos.clone().setY(e.pos.y + 1)); this.ihit(e, 10, { stagger: 0.3 }); } }
  trailCrack(from, to) {
    if (!this.moonTrail) return;
    const g = this.game, d = tmp.subVectors(to, from).setY(0), L = d.length(); if (L < 1) return;
    g.fx.slashLine(from.clone().setY(from.y + 0.15), d.normalize(), L, CRACK, 0.1, 0.8);
    const f = d.clone(), a = from.clone();
    this.after(0.6, () => { this.line(a, f, L, 1.2, (e) => this.ihit(e, 16, { stagger: 0.3 })); for (let s = 0; s < L; s += 1.5) this.shatterFx(a.clone().addScaledVector(f, s).setY(a.y + 0.3), 4); });
  }
  // ------------------------------------------------------------ Fold
  shard() {
    const g = this.game;
    this.cast(0.26);
    const { dir } = aimAt(this, this.handPos(), 16);
    const pane = this.pane(0.9, 0.6, 0.7);
    meshShot(this, pane, { pos: this.handPos(), vel: dir.clone().multiplyScalar(24), life: 0.7, radius: 0.55, pierce: true, spin: 0,
      trail: (q, dt) => { pane.rotateY(dt * 12); if (Math.random() < 0.4) g.particles.burst(q.pos, { count: 1, color: SKY, speed: 0.3, life: 0.3, size: 0.15, shape: 1 }); },
      onHit: (e, q) => { this.shit(e, 12, { stagger: 0.25, knock: q.vel.clone().setY(0).setLength(2) }); g.fx.hitSpark(q.pos, null, { color: SKY }); } });
    g.audio?.whoosh(0.8);
  }
  ripple() {
    const g = this.game, p = this.p, f = this.fwd(), L = 11;
    this.cast(0.3);
    const hit = new Set();
    const ring = mesh(GEO.torus, glow(SKY, 2.2, 0.8), 1); ring.rotation.y = Math.atan2(f.x, f.z);
    temp(this, ring, 0.5, (t, dt, k) => {
      const c = tmp.copy(p.pos).addScaledVector(f, 1 + k * L); ring.position.set(c.x, p.pos.y + 1, c.z); ring.scale.setScalar(1.2 + k * 0.8);
      for (const e of this.foes(c, 1.8)) if (!hit.has(e)) { hit.add(e); this.shit(e, 12, { stagger: 0.6, knock: tmp2.copy(f).setLength(6) }); }
    });
    g.audio?.noise({ dur: 0.3, gain: 0.2, type: 'bandpass', freq: 800, sweep: 2400, q: 1 });
  }
  fold() {
    const g = this.game, c = this.aimGround(12), W = 3.2 + this.rank('fold') * 0.4, L = 6;
    this.cast(0.45, true);
    const f = this.fwd(), yaw = Math.atan2(f.x, f.z);
    g.markers.spawn({ pos: c.clone().addScaledVector(f, -L / 2), dur: 0.45, shape: 'rect', width: W * 2, length: L, facing: yaw, color: SKY });
    const hinge = new THREE.Group(); hinge.position.copy(c).addScaledVector(f, -L / 2).setY(c.y + 0.1); hinge.rotation.y = yaw;
    const sheet = this.pane(W * 2, L, 0.6); sheet.position.z = L / 2; hinge.add(sheet);
    // the sheet starts standing up behind (the sky) and closes down like a book
    temp(this, hinge, 0.6, (t, dt, k) => { hinge.rotation.x = -(1 - Math.min(1, k / 0.75)) * Math.PI * 0.9; }, () => {
      this.line(c.clone().addScaledVector(f, -L / 2), f, L, W, (e) => { this.shit(e, 44, { stagger: 0.9, unblockable: true }); this.stun(e, 0.6); });
      g.fx.screenWave(c, 0.8, 0.4); g.shake(0.4); g.audio?.impact(1.4); this.shatterFx(c.clone().setY(c.y + 0.4), 20);
    });
    g.audio?.whoosh(1.2);
  }
  flip() {
    const g = this.game, c = this.aimGround(12), R = 4;
    this.cast(0.45, true);
    sigil(this, c, R, SKY, 0.4);
    const disc = mesh(GEO.cylSolid, mat(SKY, { emissive: 0.8, opacity: 0.6 }), [R, 0.15, R]);
    temp(this, disc, 0.7, (t, dt, k) => { disc.position.set(c.x, c.y + 0.1 + Math.sin(k * Math.PI) * 1.5, c.z); disc.rotation.x = k * Math.PI; });
    this.after(0.3, () => {
      const list = this.foes(c, R);
      for (const e of list) { this.stun(e, 1.4); if (!e.isBoss) e.vel.y = 14; this.shit(e, 16, { stagger: 0.4 }); }
      this.after(0.9, () => { for (const e of list) if (!e.dead) { this.shit(e, 32, { stagger: 0.8 }); g.fx.landDust(e.pos, 18); } g.audio?.impact(1.2); });
      g.audio?.whoosh(1.4);
    });
  }
  sweep() {
    const g = this.game, p = this.p, f = this.fwd(), side = new THREE.Vector3(f.z, 0, -f.x), R = 9;
    this.cast(0.45, true);
    const line = mesh(GEO.box, glow(DUSK, 2.5, 0.8), [0.12, 0.12, R]);
    const hit = new Set();
    temp(this, line, 0.45, (t, dt, k) => {
      const a = Math.atan2(f.x, f.z) + (k - 0.5) * 2.4, d = tmp.set(Math.sin(a), 0, Math.cos(a));
      line.position.copy(p.pos).addScaledVector(d, R / 2).setY(p.pos.y + 1); line.rotation.y = a;
      for (const e of this.foes(p.pos, R, d, 0.15)) if (!hit.has(e)) { hit.add(e); this.shit(e, 30, { stagger: 0.7, knock: tmp2.copy(side).multiplyScalar(k < 0.5 ? -6 : 6) }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: DUSK }); }
    });
    g.audio?.energy('slash');
  }
  falling() {
    const g = this.game, p = this.p, c = this.aimGround(13), R = 5.5;
    p.action = { type: 'cast', both: true, dur: 0.9, elapsed: 0, t: 0, moveScale: 0.1, lock: true, faceAim: true };
    g.toast?.('Falling Heavens'); g.audio?.charge(1, 0.6);
    g.markers.spawn({ pos: c, dur: 1.1, radius: R, color: SKY });
    const slab = mesh(GEO.box, mat(DEEPSKY, { emissive: 0.8, opacity: 0.8, roughness: 0.05 }), [R * 1.8, 1.2, R * 1.8]);
    temp(this, slab, 1.1, (t, dt, k) => { slab.position.set(c.x, c.y + 0.6 + (1 - k * k) * 26, c.z); slab.rotation.y = k * 0.5; }, () => {
      this.blast(c, R, 95 * this.foldMul, { color: SKY, knock: 12, stagger: 1, unblockable: true });
      for (let i = 0; i < 4; i++) this.shatterFx(c.clone().add(tmp.set((Math.random() - 0.5) * R, 0.5, (Math.random() - 0.5) * R)), 24);
      this.crackLines(c, R + 2, 12);
      g.fx.screenWave(c, 1.3, 0.6); g.hitStop(0.08); g.shake(0.8); g.audio?.energy('explode');
    });
  }
  // ------------------------------------------------------------ Thin Ice
  breaker() {
    const g = this.game, p = this.p, f = this.fwd(), L = 11 + this.rank('ice');
    p.action = { type: 'cast', both: true, dur: 0.55, elapsed: 0, t: 0, moveScale: 0.1, lock: true, faceAim: true };
    // grip: a pane of sky forms in front of her fist, then the strike shatters it forward
    const pane = this.pane(2.4, 2.4, 0.5); pane.rotation.set(Math.PI / 2, 0, 0); pane.rotation.y = Math.atan2(f.x, f.z);
    temp(this, pane, 0.28, () => { pane.position.copy(p.pos).addScaledVector(f, 1.2).setY(p.pos.y + 1.2); pane.rotation.set(Math.PI / 2, 0, -Math.atan2(f.x, f.z), 'YXZ'); });
    this.after(0.28, () => {
      this.pose('punch', 0.25);
      const cast = new Set();
      this.line(p.pos.clone(), f, L, 1.6, (e) => this.ihit(e, 46, { stagger: 0.9, knock: tmp.copy(f).setLength(8), cast }));
      for (let s = 1; s < L; s += 0.8) { const at = p.pos.clone().addScaledVector(f, s).setY(p.pos.y + 1); this.after(s * 0.012, () => this.shatterFx(at, 5)); }
      g.fx.slashLine(p.pos.clone().setY(p.pos.y + 1.2), f, L, CRACK, 0.3, 0.3);
      g.hitStop(0.05); g.shake(0.4); g.audio?.impact(1.5, 'crit');
    });
  }
  cracks() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 6 + this.rank('ice') * 0.6;
    this.cast(0.45, true);
    this.crackLines(c, R, 10);
    g.audio?.tone({ freq: 1800, to: 2600, dur: 0.6, gain: 0.04, type: 'triangle' });
    this.after(0.6, () => {
      const cast = new Set();
      for (const e of this.foes(c, R)) this.ihit(e, 40, { stagger: 0.8, knock: tmp.subVectors(e.pos, c).setY(0).setLength(6), cast });
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; this.shatterFx(c.clone().add(tmp.set(Math.cos(a) * R * 0.6, 0.3, Math.sin(a) * R * 0.6)), 10); }
      g.shake(0.4); g.audio?.impact(1.3);
    });
  }
  frozen() {
    const g = this.game, c = this.aimGround(12), R = 5;
    this.cast(0.4, true);
    const glass = mesh(GEO.cylSolid, mat(0xd8f4ff, { emissive: 0.5, opacity: 0.35, roughness: 0.02 }), [R, 0.1, R]);
    temp(this, glass, 4, (t) => { glass.position.set(c.x, c.y + 5, c.z); glass.rotation.y = t * 0.2; });
    this.zone(c, R, 4, 0.4, (list) => { for (const e of list) { this.slow(e, 0.6); e.frozenSky = this.game.time + 0.6; } }, { color: 0xd8f4ff, particles: 0.5 });
    g.audio?.tone({ freq: 2400, to: 1200, dur: 0.8, gain: 0.05, type: 'sine', rev: 0.6 });
  }
  shatterstorm() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const shards = []; for (let i = 0; i < 9; i++) { const s = this.pane(0.5, 0.35, 0.75); g.scene.add(s); shards.push(s); }
    let tick = 0; const cast = new Set();
    this.during(3, (t, dt) => {
      shards.forEach((s, i) => { const a = t * 6 + i / shards.length * Math.PI * 2, rr = 2.2; s.position.set(p.pos.x + Math.cos(a) * rr, p.pos.y + 0.6 + (i % 3) * 0.6, p.pos.z + Math.sin(a) * rr); s.rotation.set(t * 5 + i, -a, 0.6); });
      tick -= dt; if (tick <= 0) { tick = 0.25; for (const e of this.foes(p.pos, 3)) this.ihit(e, 8, { stagger: 0.15, cast }); }
    }, () => { for (const s of shards) { this.shatterFx(s.position, 4); g.scene.remove(s); } });
  }
  // ------------------------------------------------------------ Surface
  deflect() {
    const g = this.game, p = this.p, dur = 3 * this.surfMul;
    this.cast(0.3, true);
    const pane = this.pane(2.6, 2.4, 0.4);
    g.audio?.energy('infinity');
    this.buff('deflect', dur, {
      onStart: () => g.scene.add(pane),
      incoming: (a) => a * 0.6,
      onTick: () => {
        const f = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
        pane.position.copy(p.pos).addScaledVector(f, 1.1).setY(p.pos.y + 1.2); pane.rotation.set(Math.PI / 2, 0, -p.facing, 'YXZ');
        // shots that reach the fold are turned around
        for (const q of [...g.projectiles.list]) if (q.team === 'enemy' && q.pos.distanceTo(pane.position) < 1.8) {
          const at = q.pos.clone(), v = q.vel.clone().negate(), dmg = (q.dmg ?? 10) * (this.mirror ? 2 : 1);
          g.projectiles.kill(q, 'absorb');
          meshShot(this, this.pane(0.4, 0.4, 0.8), { pos: at, vel: v, life: 1, radius: 0.5, onHit: (e) => this.shit(e, dmg, { stagger: 0.4 }) });
          this.shatterFx(at, 4);
        }
      },
      onEnd: () => g.scene.remove(pane),
    });
  }
  wall() {
    const g = this.game, p = this.p, f = this.fwd(), c = p.pos.clone().addScaledVector(f, 3), dur = 5 * this.surfMul;
    this.cast(0.35, true);
    const w = mesh(GEO.box, mat(SKY, { emissive: 0.8, opacity: 0.45, roughness: 0.05 }), [6, 3, 0.2]); w.rotation.y = Math.atan2(f.x, f.z);
    temp(this, w, dur, (t) => {
      w.position.set(c.x, this.groundAt(c.x, c.z, c.y) + 1.5, c.z); w.scale.y = 3 * Math.min(1, t * 5);
      for (const q of [...g.projectiles.list]) if (q.team === 'enemy') { tmp.subVectors(q.pos, c); if (Math.abs(tmp.dot(f)) < 0.6 && Math.abs(tmp.x * f.z - tmp.z * f.x) < 3.2) { this.shatterFx(q.pos, 4); g.projectiles.kill(q, 'barrier'); } }
      for (const e of this.foes(c, 3.4)) { tmp.subVectors(e.pos, c); if (Math.abs(tmp.dot(f)) < 1 && Math.abs(tmp.x * f.z - tmp.z * f.x) < 3.2 && !e.isBoss) e.knock?.addScaledVector(f, tmp.dot(f) >= 0 ? 3 : -3); }
    });
    g.audio?.energy('infinity');
  }
  skyPull() {
    const g = this.game, p = this.p, c = this.aimGround(13), R = 4;
    this.cast(0.4, true);
    const sheet = this.pane(R * 2, R * 2, 0.4);
    const from = c.clone().setY(c.y + 0.5);
    temp(this, sheet, 0.5, (t, dt, k) => { sheet.position.lerpVectors(from, p.pos.clone().setY(p.pos.y + 0.5), k * 0.8); sheet.scale.set(R * 2 * (1 - k * 0.5), 0.12, R * 2 * (1 - k * 0.5)); });
    for (const e of this.foes(c, R)) { if (!e.isBoss) { tmp.subVectors(p.pos, e.pos).setY(0); e.knock?.addScaledVector(tmp.normalize(), Math.min(20, e.pos.distanceTo(p.pos) * 1.6)); } this.shit(e, 14, { stagger: 0.6 }); }
    g.audio?.whoosh(1.2);
  }
  cocoon() {
    const g = this.game, p = this.p, dur = 4 * this.surfMul;
    this.cast(0.35, true);
    const shell = mesh(GEO.sphere, mat(SKY, { emissive: 0.9, opacity: 0.35, roughness: 0.02 }), 1.4);
    g.audio?.energy('heal');
    this.buff('cocoon', dur, {
      onStart: () => g.scene.add(shell),
      incoming: (a) => a * 0.15,
      onTick: (dt) => { shell.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z); shell.rotation.y += dt; p.heal?.(p.maxHp * 0.02 * dt, true); },
      onEnd: () => { g.scene.remove(shell); this.shatterFx(shell.position, 16); },
    });
  }
  // ------------------------------------------------------------ Flight
  skyWalk() {
    const g = this.game, p = this.p, to = this.aimGround(12), from = p.pos.clone();
    p.invulnerable = true;
    p.action = { type: 'cast', both: true, dur: 0.55, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    let step = 0;
    this.during(0.5, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 3.5;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      step -= dt; if (step <= 0) { step = 0.1; g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.05, p.pos.z), { color: SKY, r0: 0.2, r1: 0.9, dur: 0.4, thick: 0.08 }); }
    }, () => { p.invulnerable = false; p.action = null; this.trailCrack(from, p.pos.clone()); });
    g.audio?.whoosh(1.2);
  }
  dive() {
    const g = this.game, p = this.p, t = this.target(13);
    const to = t ? t.pos.clone() : this.aimGround(11), from = p.pos.clone();
    to.y = this.groundAt(to.x, to.z, p.pos.y);
    p.invulnerable = true;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.9, windup: 0.3 }, style: 'slam', dur: 0.7, elapsed: 0, t: 0, windup: 0.3, strike: 0.9, struck: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.markers.spawn({ pos: to, dur: 0.6, radius: 3, color: SKY });
    this.during(0.6, (tt, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(Math.min(1, k * 1.3) * Math.PI) * 7;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
    }, () => {
      p.invulnerable = false; p.action = null;
      this.blast(p.pos.clone(), 3, 40 * this.foldMul, { color: SKY, knock: 10, stagger: 0.8 });
      this.crackLines(p.pos, 4, 8); this.trailCrack(from, p.pos.clone());
    });
    g.audio?.whoosh(1.5);
  }
  unfold() {
    const g = this.game, p = this.p, f = this.fwd(), from = p.pos.clone();
    const to = p.pos.clone().addScaledVector(f, 8);
    if (!this.blink(to, { color: SKY })) return false;
    // the folded space snaps back flat behind you
    const pane = this.pane(2, 3, 0.5); pane.rotation.set(Math.PI / 2, 0, -Math.atan2(f.x, f.z), 'YXZ');
    temp(this, pane, 0.4, (t, dt, k) => { pane.position.lerpVectors(from, p.pos, k).setY(from.y + 1.2); pane.scale.set(2 * (1 - k), 0.12, 3); });
    this.line(from, f, 8, 1.2, (e) => this.shit(e, 16, { stagger: 0.4 }));
    this.trailCrack(from, p.pos.clone());
    g.audio?.energy('teleport');
  }
  boundless() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.fx.flash(SKY, 0.2, 0.25); g.audio?.tone({ freq: 660, to: 1320, dur: 0.8, gain: 0.07, type: 'sine', rev: 0.7 });
    this.statBuff('boundless', 10, { speed: 0.15 }, {
      onStart: () => { this.cdMul *= 0.6; },
      onTick: () => { if (Math.random() < 0.3) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 2.5, p.pos.z), { count: 1, color: SKY, speed: 0.4, up: 1, life: 0.6, size: 0.18, shape: 1 }); },
      onEnd: () => { this.cdMul /= 0.6; },
    });
  }
  starfall() {
    const g = this.game, c = this.aimGround(13), R = 6;
    this.cast(0.5, true);
    g.toast?.('Starfall'); g.markers.spawn({ pos: c, dur: 0.5, radius: R, color: SKY });
    let tick = 0.4;
    this.during(3.2, (t, dt) => {
      tick -= dt; if (tick > 0) return; tick = 0.1;
      const list = this.foes(c, R); const e = list.length && Math.random() < 0.6 ? list[Math.floor(Math.random() * list.length)] : null;
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      const at = e ? e.pos.clone() : new THREE.Vector3(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr); at.y = this.groundAt(at.x, at.z, c.y);
      const from = at.clone().add(tmp.set(4, 14, 2));
      beam(this, from, tmp2.subVectors(at, from).normalize(), from.distanceTo(at), 0.25, 0xd8f0ff, { core: CRACK, pierce: true, light: Math.random() < 0.25, dur: 0.25 });
      g.combat.aoe(at, 1.5, 16 * this.foldMul, this.p, { knock: 3, stagger: 0.3, blocks: false });
      this.shatterFx(at.clone().setY(at.y + 0.3), 6);
    });
  }
  // ------------------------------------------------------------ F: Shattered Heavens
  shatteredHeavens() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 13 + this.rank('heavens') * 2;
    p.action = { type: 'cast', both: true, dur: 1.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Thin Ice Breaker: Shattered Heavens');
    g.fx.dimTarget = 0.3;
    // the sky over the battlefield turns into a single pane, cracking
    const dome = mesh(GEO.cylSolid, mat(DEEPSKY, { emissive: 0.7, opacity: 0.5, roughness: 0.02 }), [R, 0.3, R]);
    temp(this, dome, 1.45, (t, dt, k) => { dome.position.set(c.x, c.y + 9, c.z); dome.scale.set(R * Math.min(1, t * 3), 0.3, R * Math.min(1, t * 3)); });
    for (let i = 0; i < 16; i++) this.after(0.2 + i * 0.05, () => { const a = Math.random() * Math.PI * 2; g.fx.slashLine(tmp.set(c.x, c.y + 8.7, c.z), tmp2.set(Math.cos(a), 0, Math.sin(a)), R * (0.5 + Math.random() * 0.5), CRACK, 0.15, 1); });
    g.audio?.charge(1.2, 1.4);
    [2400, 2800, 3200].forEach((f, i) => g.audio?.tone({ freq: f, to: f * 0.7, dur: 0.3, gain: 0.04, type: 'triangle', at: 0.3 + i * 0.25 }));
    this.after(1.3, () => {
      g.fx.dimTarget = 0;
      g.fx.flash(0xe8f8ff, 0.6, 0.3); g.shake(0.6);
      // the shards of the broken sky come down everywhere, heaviest on the curses
      const list = this.foes(c, R);
      for (const e of list) for (let k = 0; k < 3; k++) this.after(k * 0.18 + Math.random() * 0.1, () => {
        if (e.dead) return;
        const at = e.pos.clone(), from = at.clone().add(tmp.set((Math.random() - 0.5) * 3, 9, (Math.random() - 0.5) * 3));
        const sh = this.pane(1.8, 1.2, 0.8);
        temp(this, sh, 0.4, (t, dt, kk) => { sh.position.lerpVectors(from, at, kk); sh.rotation.set(kk * 6, kk * 3, 0); }, () => {
          const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6);
          this.ihit(e, (e.isBoss ? 30 + mx * 0.02 : Math.max(36, mx * 0.25)) * (1 + this.rank('heavens') * 0.15), { stagger: 0.7, unblockable: true, crit: false });
          this.shatterFx(at.clone().setY(at.y + 0.6), 10);
        });
      });
      for (let i = 0; i < 30; i++) this.after(Math.random() * 1.2, () => {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R, at = new THREE.Vector3(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr); at.y = this.groundAt(at.x, at.z, c.y);
        const sh = this.pane(1.3, 0.9, 0.75), from = at.clone().setY(at.y + 9);
        temp(this, sh, 0.45, (t, dt, kk) => { sh.position.lerpVectors(from, at, kk); sh.rotation.set(kk * 5, 0, kk * 4); }, () => { g.combat.aoe(at, 1.6, 14, p, { stagger: 0.3, blocks: false }); this.shatterFx(at.clone().setY(at.y + 0.3), 6); });
      });
      this.after(0.9, () => { g.audio?.energy('explode'); g.fx.screenWave(c, 1.2, 0.6); });
    });
    this.after(1.4, () => { if (p.action?.lock) p.action = null; });
  }
}
registerKit('uro', UroKit, URO_SKILLS);
