// Uraume-style kit — Ice Formation. 21 abilities on the technique tree;
// four are equipped (RMB takes a basic one) plus F.
//   Chill: ice techniques stack Chill on curses (slowed); at 3 Chill they
//   freeze solid inside a block of ice for a moment.
//   LMB        frost-coated palm strikes that chill.
//   Ice        Direct Ice (start, RMB), Ice Needles, Ice Lance, Ice Slide
//   Frost      Icefall, Frost Calm, Frost Nova, Blizzard, Rime Coat
//   Shatter    Glacial Spike, Shatter, Ice Bloom, Absolute Zero
//   Glacier    Glacier Wave, Ice Pillars, Permafrost Field, Avalanche
//   Cook       Ice Cleaver, Ice Barrier, Flash-Frozen, Banquet for the King
//   F          Ultimate (Uraume has no Domain in canon): Ice Formation: Frost Calm
//              at full output — a white wave of frost freezes everything around
//              solid, then giant Icefall spears erupt through the frozen curses
//              and shatter them.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const ICE = 0x9ae0ff, FROST = 0xe0f6ff, DEEP = 0x4aa8ff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('uraume', { name: 'Uraume', technique: 'Ice Formation', rarity: 'rare', title: 'Sukuna\'s Cook', desc: 'Direct Ice spikes, Icefall shards and the Frost Calm cone freeze curses solid for a devastating Shatter. Ultimate: Frost Calm at full output freezes the whole area.', ultimate: 'Frost Calm: Full Output', color: '#9ae0ff' });

registerLook('uraume', {
  paint: { skinTone: 0xf6e4dc, hair: 0xf2f2f6, hairVolume: true, bob: true, top: 0xe8e2f0, kimono: true, sash: 0x6a5a9a, sleeve: 0xe8e2f0, pants: 0xd8d0e4, shoes: 0x6a5a9a, eye: 0xc0405a, brow: 0xe0e0e8, fringe: 3, hairSide: 6, hairBack: 6 },
  hair: (m) => [
    { x: -3.4, y: 3, z: 0.5, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 40 },
    { x: 3.4, y: 3, z: 0.5, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 40 },
    { x: 0, y: 3, z: -3.4, w: 8, h: 3, d: 2, hang: true, material: m, stiff: 40 },
    { x: 0, y: 8.3, z: 2.6, w: 7, h: 1.5, d: 3, rx: 0.3, material: m },
  ],
  hairColor: 0xf2f2f6, accent: ICE, emit: 0.35,
  cape: { color: 0xd8d0e4, length: 9, width: 8, segments: 3 },
  props(rig, K) {
    // a hovering ice crystal over the left palm
    const ice = K.mat(ICE, { metalness: 0.1, roughness: 0.05, emissive: 1.2 });
    K.box(rig.handL, 1.6, 3, 1.6, ice, 0, -3.4, 0, 0.6, 0.6, 0);
    K.box(rig.handL, 1, 1.8, 1, K.mat(FROST, { emissive: 2 }), 0.8, -2.6, 0.6, -0.4, 0, 0.5);
  },
});

export const URAUME_SKILLS = [
  { id: 'frost_touch', name: 'Frost Touch', icon: '🤚', desc: '+8% melee damage per rank; melee chills harder.', max: 3, branch: 'Cook', tier: 0 },
  { id: 'direct_ice', name: 'Direct Ice', icon: '🧊', desc: 'Longer, stronger ice spike lines.', max: 3, req: 'ab:direct_ice', branch: 'Ice', tier: 1 },
  { id: 'icefall', name: 'Icefall', icon: '🌨️', desc: 'More and bigger falling shards.', max: 3, req: 'ab:icefall', branch: 'Frost', tier: 2 },
  { id: 'frost_calm', name: 'Frost Calm', icon: '❄️', desc: 'Wider, longer freeze.', max: 2, req: 'ab:frost_calm', branch: 'Frost', tier: 3 },
  { id: 'shatter', name: 'Shatter', icon: '💠', desc: 'Shattering hits harder and its shards fly further.', max: 3, req: 'ab:shatter', branch: 'Shatter', tier: 3 },
  { id: 'permafrost', name: 'Permafrost', icon: '🏔️', desc: 'Frozen curses stay frozen longer; Frost Calm: Full Output reaches further.', max: 2, req: 'ab:glacier_wave', branch: 'Glacier', tier: 2 },
];

class UraumeKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const frost = { trail: ICE, sparkColor: FROST };
    this.combo = [
      { ...frost, style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 12, range: 2.6, arc: 1.2, lunge: 6, knock: 3, stop: 0.045, shake: 0.14 },
      { ...frost, style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 12, range: 2.6, arc: 1.2, lunge: 6, knock: 3, stop: 0.045, shake: 0.14 },
      { ...frost, style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 14, range: 2.7, arc: 1.0, lunge: 7, knock: 4, stop: 0.05, shake: 0.16 },
      { ...frost, style: 'spin', dur: 0.48, windup: 0.3, strike: 0.55, dmg: 22, range: 3.2, arc: Math.PI, lunge: 3, knock: 8, stop: 0.08, shake: 0.3, ring: true, ringColor: ICE, stagger: 0.5 },
    ];
    this.p.stats.meleeMult += r('frost_touch') * 0.08;
    this.branches = ['Ice', 'Frost', 'Shatter', 'Glacier', 'Cook'];
    this.chillBonus = 0; this.freezeMul = 1;
    this.library = {
      // ---- Ice
      direct_ice: ability({ name: 'Direct Ice', icon: '🧊', kind: 'basic', desc: 'A line of ice spikes erupts from the ground.', cd: 1.5, ce: 0, branch: 'Ice', tier: 0, start: true, legacy: 'ranged', use: () => this.directIce() }),
      ice_needles: ability({ name: 'Ice Needles', icon: '📍', kind: 'basic', desc: 'Flick a fan of five ice needles; each one chills.', cd: 0.8, ce: 0, branch: 'Ice', tier: 1, req: 'direct_ice', use: () => this.iceNeedles() }),
      ice_lance: ability({ name: 'Ice Lance', icon: '🔱', kind: 'technique', desc: 'A great lance of ice that pierces every curse in a line and chills each one twice.', cd: 6, ce: 10, branch: 'Ice', tier: 2, req: 'ice_needles', use: () => this.iceLance() }),
      ice_slide: ability({ name: 'Ice Slide', icon: '⛸️', kind: 'movement', desc: 'Glide forward on a path of ice, chilling whatever you pass.', cd: 5, ce: 5, branch: 'Ice', tier: 2, req: 'direct_ice', use: () => this.iceSlide() }),
      // ---- Frost
      icefall: ability({ name: 'Icefall', icon: '🌨️', kind: 'technique', desc: 'Huge ice shards rain down on the aim point.', cd: 8, ce: 14, branch: 'Frost', tier: 1, legacy: 't1', use: () => this.icefall() }),
      frost_calm: ability({ name: 'Frost Calm', icon: '❄️', kind: 'technique', desc: 'A freezing breath in a wide cone; everything still in it at the end freezes solid.', cd: 10, ce: 18, branch: 'Frost', tier: 2, legacy: 't2', req: 'icefall', use: () => this.frostCalm() }),
      frost_nova: ability({ name: 'Frost Nova', icon: '✳️', kind: 'technique', desc: 'Cold bursts out of you in a ring of ice spikes, chilling everything nearby twice.', cd: 8, ce: 12, branch: 'Frost', tier: 2, req: 'icefall', use: () => this.frostNova() }),
      blizzard: ability({ name: 'Blizzard', icon: '🌬️', kind: 'technique', desc: 'A blizzard howls over the aim for 5s, cutting and chilling every curse caught in it.', cd: 14, ce: 20, branch: 'Frost', tier: 3, req: 'frost_calm', use: () => this.blizzard() }),
      rime_coat: ability({ name: 'Rime Coat', icon: '🥶', kind: 'buff', desc: 'Frost armour for 8s: 30% less damage, and curses that strike you are chilled twice.', cd: 20, ce: 12, branch: 'Frost', tier: 3, req: 'frost_nova', use: () => this.rimeCoat() }),
      // ---- Shatter
      glacial_spike: ability({ name: 'Glacial Spike', icon: '🗻', kind: 'technique', desc: 'A glowing mark under the targeted curse, then a giant spike of ice impales it (twice as hard if it is frozen).', cd: 6, ce: 10, branch: 'Shatter', tier: 1, use: () => this.glacialSpike() }),
      shatter: ability({ name: 'Shatter', icon: '💠', kind: 'technique', desc: 'Every chilled or frozen curse bursts into razor ice.', cd: 12, ce: 26, branch: 'Shatter', tier: 2, legacy: 't3', req: 'glacial_spike', use: () => this.shatter() }),
      ice_bloom: ability({ name: 'Ice Bloom', icon: '❄', kind: 'technique', desc: 'A crystal flower bursts out of a frozen or chilled curse and freezes every curse around it.', cd: 11, ce: 18, branch: 'Shatter', tier: 3, req: 'shatter', use: () => this.iceBloom() }),
      absolute_zero: ability({ name: 'Absolute Zero', icon: '🧊', kind: 'technique', desc: 'Freeze one curse to its core for 4s (bosses are almost stopped), then it shatters from the inside.', cd: 20, ce: 30, branch: 'Shatter', tier: 4, req: 'ice_bloom', use: () => this.absoluteZero() }),
      // ---- Glacier
      glacier_wave: ability({ name: 'Glacier Wave', icon: '🌊', kind: 'technique', desc: 'A widening wave of ice spikes rolls forward from your feet.', cd: 8, ce: 14, branch: 'Glacier', tier: 1, use: () => this.glacierWave() }),
      ice_pillars: ability({ name: 'Ice Pillars', icon: '🏛️', kind: 'technique', desc: 'Eight ice pillars burst up in a ring around the aim and stand for 5s, chilling every curse beside them.', cd: 12, ce: 16, branch: 'Glacier', tier: 2, req: 'glacier_wave', use: () => this.icePillars() }),
      permafrost_field: ability({ name: 'Permafrost Field', icon: '🏔️', kind: 'technique', desc: 'The ground around you freezes over for 6s: curses on it slip and slow, and frozen ones cannot thaw.', cd: 18, ce: 20, branch: 'Glacier', tier: 3, req: 'ice_pillars', use: () => this.permafrostField() }),
      avalanche: ability({ name: 'Avalanche', icon: '🏔', kind: 'technique', desc: 'A colossal block of ice falls on the marked aim point, crushing and freezing everything under it.', cd: 24, ce: 45, branch: 'Glacier', tier: 4, req: 'permafrost_field', use: () => this.avalanche() }),
      // ---- Cook
      ice_cleaver: ability({ name: 'Ice Cleaver', icon: '🔪', kind: 'technique', desc: 'Form cleavers of ice and cut three times in front of you — the cook\'s cut. Frozen curses take 50% more.', cd: 4, ce: 6, branch: 'Cook', tier: 1, use: () => this.iceCleaver() }),
      ice_barrier: ability({ name: 'Ice Barrier', icon: '🛡️', kind: 'defence', desc: 'An ice shell takes the next three hits (6s); each one chills the attacker and sprays shards.', cd: 15, ce: 12, branch: 'Cook', tier: 2, req: 'ice_cleaver', use: () => this.iceBarrier() }),
      preserve: ability({ name: 'Flash-Frozen', icon: '🧊', kind: 'heal', desc: 'Seal yourself in ice for 1.6s — untouchable — and recover 25% health; the ice bursts outward when it breaks.', cd: 26, ce: 18, branch: 'Cook', tier: 3, req: 'ice_barrier', use: () => this.preserve() }),
      feast: ability({ name: 'Banquet for the King', icon: '🍽️', kind: 'buff', desc: 'For 10s you deal 15% more damage and every curse you kill restores health and Cursed Energy.', cd: 30, ce: 20, branch: 'Cook', tier: 4, req: 'preserve', use: () => this.feast() }),
    };
    this.passives = {
      deep_cold: passive({ name: 'Deep Cold', icon: '🥶', desc: 'Everything that chills adds one more Chill.', branch: 'Frost', tier: 3, req: 'frost_calm', apply: (pl, k) => { k.chillBonus += 1; } }),
      brittle: passive({ name: 'Brittle Ice', icon: '💎', desc: 'Your techniques deal 25% more damage to frozen curses.', branch: 'Shatter', tier: 3, req: 'shatter', apply: (pl, k) => { k.brittle = true; } }),
      permafrost_heart: passive({ name: 'Heart of Permafrost', icon: '🫀', desc: 'Curses stay frozen 40% longer.', branch: 'Glacier', tier: 3, req: 'ice_pillars', apply: (pl, k) => { k.freezeMul *= 1.4; } }),
      servant: passive({ name: 'Servant of the King', icon: '🙇', desc: '+20 max Cursed Energy and +10% Cursed Energy gained.', branch: 'Cook', tier: 3, req: 'ice_barrier', apply: (pl) => { pl.maxCe += 20; pl.stats.ceGain += 0.1; } }),
    };
    // F (no canon Domain): Ice Formation: Frost Calm at full output — the
    // whole area flash-freezes, then Icefall spears burst up through every
    // frozen curse and shatter it.
    this.ultimate = { name: 'Frost Calm: Full Output', icon: '❄️', use: () => this.fullFrostCalm() };
    this.ices = [];
    this.iceGeo = new THREE.BoxGeometry(1, 1, 1);
    this.iceMat = new THREE.MeshStandardNodeMaterial({ color: ICE, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45, emissive: DEEP, emissiveIntensity: 0.6, depthWrite: false });
  }
  dispose() { super.dispose(); for (const it of this.ices) this.game.scene.remove(it.mesh); this.ices = []; this.clearGlacier(); }
  onMeleeHit(e) { this.chill(e, this.rank('frost_touch') >= 2 ? 2 : 1); }
  groundAt(x, z, y) { const gy = this.game.world.groundBelow(x, z, y + 3); return isFinite(gy) ? gy : y; }
  // ------------------------------------------------------------ chill / freeze
  chill(e, n = 1) {
    if (e.dead) return;
    e.chill = Math.min(3, (e.chill ?? 0) + n + this.chillBonus); e.chillT = this.game.time;
    e.slowT = Math.max(e.slowT ?? 0, 1.5);
    if (e.chill >= 3) this.freeze(e, 1.4);
  }
  freeze(e, dur) {
    if (e.dead) return;
    const g = this.game;
    dur *= (1 + this.rank('permafrost') * 0.3) * this.freezeMul;
    e.chill = 0;
    if (e.isBoss) { e.slowT = Math.max(e.slowT ?? 0, dur); return; }
    e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.1;
    e.sealT = Math.max(e.sealT ?? 0, dur);
    e.frozenEnd = Math.max(e.frozenEnd ?? 0, g.time + dur);
    g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.5), { count: 16, color: FROST, speed: 4, life: 0.4, size: 0.12, shape: 1 });
    g.audio?.tone({ freq: 2400, to: 1800, dur: 0.12, gain: 0.06, type: 'triangle', rev: 0.3 });
    if (this.ices.some((it) => it.e === e) || this.ices.length >= 20) return;
    const mesh = new THREE.Mesh(this.iceGeo, this.iceMat); mesh.renderOrder = 22;
    mesh.rotation.y = Math.random() * Math.PI;
    g.scene.add(mesh); this.ices.push({ e, mesh });
  }
  isFrozen(e) { return e.frozenEnd > this.game.time; }
  tick(dt) {
    const g = this.game;
    for (let i = this.ices.length - 1; i >= 0; i--) {
      const it = this.ices[i], e = it.e;
      if (e.dead || !this.isFrozen(e)) {
        g.scene.remove(it.mesh); this.ices.splice(i, 1);
        if (!e.dead) g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.5), { count: 10, color: ICE, speed: 3, life: 0.4, size: 0.1, gravity: 10, shape: 1 });
        continue;
      }
      it.mesh.position.set(e.pos.x, e.pos.y + e.height * 0.5, e.pos.z);
      it.mesh.scale.set(e.radius * 2.4 + 0.3, e.height + 0.3, e.radius * 2.4 + 0.3);
    }
    // chill wears off; chilled curses trail frost
    for (const e of g.enemies) {
      if (!e.chill || e.dead) continue;
      if (g.time - e.chillT > 3) { e.chill = 0; continue; }
      if (Math.random() < 0.15 * e.chill) g.particles.glow.spawn({ x: e.pos.x + (Math.random() - 0.5) * 0.6, y: e.pos.y + Math.random() * e.height, z: e.pos.z + (Math.random() - 0.5) * 0.6, vy: -0.3, life: 0.6, r: 1.4, g: 2, b: 2.6, size: 0.08, drag: 1, sizeEnd: 0.5, shape: 'square' });
    }
  }
  // One spike of ice bursting out of the floor.
  spike(at, R, dmg, chillN = 1) {
    const g = this.game, p = this.p;
    at.y = this.groundAt(at.x, at.z, at.y);
    for (const e of g.combat.query(at, tmp.set(0, 0, 1), R, Math.PI)) {
      g.combat.damageEnemy(e, dmg, p, { stagger: 0.3, knock: new THREE.Vector3(0, 0, 0) });
      this.chill(e, chillN);
      if (!e.isBoss && !this.isFrozen(e)) e.vel.y = Math.max(e.vel.y, 5);
    }
    const c = at.clone().setY(at.y + 0.3);
    g.particles.burst(c, { count: 12, color: ICE, speed: 7, spread: 0.2, dir: tmp.set(0, 2.2, 0), life: 0.45, size: 0.3, sizeEnd: 0.05, gravity: 12, intensity: 2.5 });
    g.particles.burst(c, { count: 8, color: FROST, speed: 3, up: 0.5, life: 0.5, size: 0.08, shape: 1 });
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: ICE, r0: 0.2, r1: R + 0.3, dur: 0.25, thick: 0.15 });
  }
  // ------------------------------------------------------------ RMB
  directIce() {
    const g = this.game, p = this.p, rk = this.rank('direct_ice');
    this.cast(0.35);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const dir = target ? tmp.subVectors(target.pos, p.pos).setY(0).normalize().clone() : p.aimDir.clone().setY(0).normalize();
    const n = 6 + rk * 2, dmg = 11 + rk * 4;
    const start = p.pos.clone();
    for (let i = 0; i < n; i++) this.after(i * 0.04, () => {
      this.spike(start.clone().addScaledVector(dir, 1.5 + i * 1.1), 1.2, dmg);
      if (i % 2 === 0) g.audio?.tone({ freq: 1800 - i * 80, to: 900, dur: 0.08, gain: 0.05, type: 'triangle' });
    });
    g.audio?.noise({ dur: 0.35, gain: 0.25, type: 'highpass', freq: 2500, sweep: 6000 });
  }
  // ------------------------------------------------------------ 1
  icefall() {
    const g = this.game, p = this.p, rk = this.rank('icefall');
    this.cast(0.5, true);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const c = target ? target.pos.clone() : p.aimPoint.clone();
    tmp.subVectors(c, p.pos).setY(0); if (tmp.length() > 12) c.copy(p.pos).addScaledVector(tmp.normalize(), 12);
    c.y = this.groundAt(c.x, c.z, p.pos.y);
    const n = 6 + rk * 2, area = 3.2 + rk * 0.4;
    g.markers.spawn({ pos: c, dur: 0.7, radius: area + 1, color: ICE });
    for (let i = 0; i < n; i++) this.after(0.35 + i * 0.07, () => {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * area;
      const at = c.clone().add(new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr));
      at.y = this.groundAt(at.x, at.z, c.y);
      g.projectiles.fire({ pos: at.clone().add(new THREE.Vector3(1.5, 12, 0.8)), vel: new THREE.Vector3(-3.2, -26, -1.7), team: 'player', shape: 'arrow', color: ICE, emissive: 2.5, scale: 1.8 + rk * 0.2, life: 0.46, radius: 0.6, ghost: true, light: 2,
        trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color: FROST, speed: 0.3, life: 0.3, size: 0.2, sizeEnd: 0.02 }); },
        onHit: (e) => { g.combat.damageEnemy(e, 10 + rk * 3, p, { stagger: 0.3 }); this.chill(e, 1); },
        onExpire: (q) => {
          if (q.pos.y > at.y + 1.5) return;
          this.spike(at, 1.6, 16 + rk * 5);
          g.fx.debris(at.clone().setY(at.y + 0.3), 0xc8eaff, 3);
          g.shake(0.1); g.audio?.impact(0.9);
        } });
    });
    g.audio?.whoosh(1);
  }
  // ------------------------------------------------------------ 2
  frostCalm() {
    const g = this.game, p = this.p, rk = this.rank('frost_calm');
    const range = 7 + rk * 1.5, arc = 0.75 + rk * 0.1;
    p.action = { type: 'cast', both: true, dur: 0.75, elapsed: 0, t: 0, moveScale: 0.15, lock: true, faceAim: true };
    g.toast?.('Ice Formation: Frost Calm');
    g.audio?.noise({ dur: 0.8, gain: 0.4, type: 'highpass', freq: 1500, sweep: 5000, attack: 0.1, rev: 0.3 });
    g.audio?.tone({ freq: 600, to: 1500, dur: 0.7, gain: 0.08, type: 'sine', rev: 0.5 });
    let t = 0, tick = 0;
    const hitOnce = new Set();
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      const dir = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const from = this.handPos();
      for (let i = 0; i < 10; i++) {
        const a = p.facing + (Math.random() - 0.5) * arc * 2, sp = 8 + Math.random() * 6;
        g.particles.glow.spawn({ x: from.x, y: from.y - 0.2, z: from.z, vx: Math.sin(a) * sp, vy: (Math.random() - 0.4) * 1.5, vz: Math.cos(a) * sp, life: range / sp, r: 1.6, g: 2.2, b: 2.8, size: 0.25, gravity: -1, drag: 1.2, sizeEnd: 2.2 });
      }
      if (tick <= 0) {
        tick = 0.15;
        for (const e of g.combat.query(p.pos, dir, range, arc)) {
          g.combat.damageEnemy(e, 6 + rk * 2, p, { stagger: 0.1, ceGain: 1, color: '#9ae0ff' });
          this.chill(e, 1);
          if (!hitOnce.has(e)) { hitOnce.add(e); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.5), dir, { color: FROST }); }
        }
      }
      if (t >= 0.7) {
        // the field it touched glazes over and everything still in it freezes solid
        for (const e of g.combat.query(p.pos, dir, range, arc)) this.freeze(e, 1.6 + rk * 0.4);
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: ICE, r0: 1, r1: range, dur: 0.4, thick: 0.1, arc: arc / Math.PI, rotY: p.facing - Math.PI / 2 });
        g.fx.flash(0xc0e8ff, 0.2, 0.15); g.shake(0.25);
        return false;
      }
      return true;
    });
  }
  // ------------------------------------------------------------ 3
  shatter(fromDomain = false) {
    const g = this.game, p = this.p, rk = this.rank('shatter');
    const list = g.enemies.filter((e) => !e.dead && (this.isFrozen(e) || e.chill > 0) && (fromDomain ? g.domainSys.inside(e.pos) : e.pos.distanceTo(p.pos) < 22));
    if (!list.length) { if (!fromDomain) { g.toast?.('Nothing is frozen'); g.audio?.ui('back'); } return false; }
    if (!fromDomain) this.cast(0.45, true);
    for (const e of list) {
      const frozen = this.isFrozen(e);
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
      const dmg = (frozen ? 45 + rk * 15 : 12 + (e.chill ?? 0) * 6) * (fromDomain ? 0.6 : 1);
      e.frozenEnd = 0; e.chill = 0; if (!e.isBoss) e.sealT = 0;
      this.hit(e, dmg, { stagger: 0.7, unblockable: true, color: '#e0f6ff', frozenNow: frozen });
      g.particles.burst(at, { count: frozen ? 30 : 12, color: ICE, speed: frozen ? 10 : 6, life: 0.6, size: 0.14, gravity: 12, drag: 1.5, shape: 1, intensity: 3 });
      g.particles.burst(at, { count: 1, color: FROST, speed: 0, life: 0.18, size: frozen ? 3 : 1.6, sizeEnd: 1.5, drag: 0, intensity: 2.5 });
      if (frozen) {
        // razor shards fly out and chill whatever they hit
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + Math.random() * 0.4;
          const sh = g.projectiles.fire({ pos: at.clone(), vel: new THREE.Vector3(Math.sin(a), 0.05, Math.cos(a)).multiplyScalar(18), team: 'player', shape: 'nail', color: ICE, emissive: 2.5, scale: 2, life: 0.25 + rk * 0.08, radius: 0.4,
            onHit: (t) => { g.combat.damageEnemy(t, 10 + rk * 4, p, { stagger: 0.2 }); this.chill(t, 1); } });
          sh?.hit.add(e);
        }
        g.fx.shockwave(e.pos, ICE, 2.5);
      }
    }
    g.shake(0.35); g.hitStop(0.06); g.fx.chroma(0.5);
    g.audio?.noise({ dur: 0.4, gain: 0.5, type: 'highpass', freq: 3000, sweep: 9000, rev: 0.3 });
    g.audio?.impact(1.5);
  }
  // ------------------------------------------------------------ F: Frost Calm, full output
  fullFrostCalm() {
    const g = this.game, p = this.p, rk = this.rank('permafrost');
    const R = 18 + rk * 2, c = p.pos.clone();
    p.action = { type: 'cast', both: true, dur: 2.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.invulnerable = true;
    g.slowMo?.(1.4, 0.25);
    g.fx.dimTarget = 0.5;
    g.toast?.('Ice Formation', 'domain');
    this.after(0.45, () => g.toast?.('FROST CALM', 'domain'));
    g.rig.cinematic?.({ center: c.clone().setY(c.y + 0.5), dur: 3.2, dist: 14, pitch: 35 * Math.PI / 180, orbit: 0.3 });
    g.audio?.charge(1.1, 1.6);
    g.audio?.noise({ dur: 1.2, gain: 0.35, type: 'highpass', freq: 1500, sweep: 7000, attack: 1, rev: 0.5 });
    const light = g.lights.flash(c.clone().setY(c.y + 2), ICE, 8, R, 3.4, { priority: 6 });
    const frozen = new Set();
    let t = 0, waveR = 0, phase = 0;
    const CHARGE = 1.0, WAVE = 0.7, ERUPT = 2.1, END = 3.4;
    g.addUpdater((dt, realDt) => {
      t += realDt;
      if (phase === 0) {
        // the cold gathers: frost spirals in towards Uraume's breath
        for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 6; g.particles.glow.spawn({ x: c.x + Math.cos(a) * r, y: c.y + 0.3 + Math.random() * 2.5, z: c.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.4 - Math.sin(a) * 3, vy: 0.3, vz: -Math.sin(a) * r * 1.4 + Math.cos(a) * 3, life: 0.6, r: 1.6, g: 2.2, b: 2.8, size: 0.14, drag: 2.5, sizeEnd: 0.3, shape: 'square' }); }
        if (t < CHARGE) return true;
        phase = 1;
        g.fx.flash(0xe0f6ff, 0.75, 0.35); g.fx.screenWave(c.clone().setY(c.y + 1), 1.6, 0.8); g.fx.chroma(1.2);
        g.shake(0.8); g.fx.dimTarget = 0;
        g.audio?.noise({ dur: 1.4, gain: 0.7, type: 'highpass', freq: 2000, sweep: 9000, rev: 0.6 });
        g.audio?.tone({ freq: 1200, to: 300, dur: 1.4, gain: 0.15, type: 'triangle', rev: 0.7 });
        this.buildGlacier(g, c, R);
      }
      if (phase === 1) {
        // a white wall of frost sweeps outward; everything it passes freezes
        waveR = Math.min(R, ((t - CHARGE) / WAVE) * R);
        g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: FROST, r0: Math.max(0.1, waveR - 0.4), r1: waveR + 0.4, dur: 0.12, thick: 0.25 });
        for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2; g.particles.glow.spawn({ x: c.x + Math.cos(a) * waveR, y: c.y + 0.2 + Math.random() * 1.5, z: c.z + Math.sin(a) * waveR, vx: Math.cos(a) * 4, vy: 1.5, vz: Math.sin(a) * 4, life: 0.6, r: 1.8, g: 2.3, b: 2.8, size: 0.3, gravity: -0.5, drag: 1.5, sizeEnd: 1.4 }); }
        if (this.glacier) this.glacier.userData.reveal(waveR);
        for (const e of g.enemies) {
          if (e.dead || e.isDummy || frozen.has(e) || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > waveR + e.radius) continue;
          frozen.add(e);
          g.combat.damageEnemy(e, 40 + (e.maxHp ?? 100) * (e.isBoss ? 0.04 : 0), p, { stagger: 0.5, unblockable: true, crit: false, ceGain: 0, color: '#e0f6ff' });
          if (e.isBoss) e.slowT = Math.max(e.slowT ?? 0, 5); else this.freeze(e, 4);
        }
        if (t >= ERUPT) {
          phase = 2;
          // Icefall: giant ice spears erupt through every frozen curse and shatter it
          g.toast?.('Icefall');
          for (const e of frozen) {
            if (e.dead) continue;
            const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
            e.frozenEnd = 0; if (!e.isBoss) e.sealT = 0;
            g.combat.damageEnemy(e, e.isBoss ? 120 + (e.maxHp ?? 100) * 0.12 : 160 + (e.maxHp ?? 100) * 0.5, p, { stagger: 1, unblockable: true, ceGain: 0, knock: new THREE.Vector3(0, 0, 0), color: '#e0f6ff' });
            if (!e.dead && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
            g.particles.burst(at, { count: 30, color: ICE, speed: 11, life: 0.7, size: 0.16, gravity: 12, drag: 1.5, shape: 1, intensity: 3 });
            g.particles.burst(at, { count: 1, color: FROST, speed: 0, life: 0.2, size: 3.2, sizeEnd: 1.5, drag: 0, intensity: 2.5 });
            g.fx.shockwave(e.pos, ICE, 3);
          }
          if (this.glacier) this.glacier.userData.erupt();
          g.fx.flash(0xffffff, 0.6, 0.25); g.fx.screenWave(c, 1.4, 0.6); g.fx.chroma(1.6);
          g.shake(1); g.hitStop(0.1);
          g.audio?.impact(2); g.audio?.noise({ dur: 0.8, gain: 0.8, type: 'highpass', freq: 2500, sweep: 10000, rev: 0.4 }); g.audio?.blackFlash?.();
          p.action = null; p.invulnerable = false;
        }
        return true;
      }
      if (t >= END) { g.lights.remove(light); this.clearGlacier(true); return false; }
      return true;
    });
    return true;
  }
  // The frozen field: ice crystals that grow as the frost wave passes, then
  // jut up as giant Icefall spears.
  buildGlacier(g, c, R) {
    this.clearGlacier();
    const grp = new THREE.Group();
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardNodeMaterial({ color: ICE, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.7, emissive: DEEP, emissiveIntensity: 0.8 });
    const items = [];
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, rr = 1.5 + Math.sqrt(Math.random()) * (R - 1.5);
      const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, this.groundAt(x, z, c.y) - 0.1, z);
      m.rotation.set((Math.random() - 0.5) * 0.8, Math.random() * Math.PI, (Math.random() - 0.5) * 0.8);
      m.scale.set(0.01, 0.01, 0.01); m.visible = false; grp.add(m);
      items.push({ m, r: rr, w: 0.4 + Math.random() * 0.6, h: 0.6 + Math.random() * 1.2, big: 2.5 + Math.random() * 4 });
    }
    grp.userData = {
      geo, items,
      reveal: (wr) => { for (const it of items) if (!it.m.visible && it.r <= wr) { it.m.visible = true; it.m.scale.set(it.w, it.h, it.w); } },
      erupt: () => { for (const it of items) { it.m.visible = true; it.m.scale.set(it.w * 1.6, it.big, it.w * 1.6); } },
    };
    g.scene.add(grp); this.glacier = grp;
  }
  clearGlacier(burst = false) {
    if (!this.glacier) return;
    const g = this.game;
    if (burst) for (const it of this.glacier.userData.items) if (Math.random() < 0.25) g.particles.burst(tmp.copy(it.m.position).setY(it.m.position.y + 1), { count: 6, color: ICE, speed: 4, life: 0.5, size: 0.12, gravity: 12, shape: 1 });
    g.scene.remove(this.glacier); this.glacier.userData.geo.dispose(); this.glacier = null;
  }
  // ============================================================== new abilities
  hit(e, dmg, o = {}) { return super.hit(e, dmg * (this.brittle && (o.frozenNow ?? this.isFrozen(e)) ? 1.25 : 1), o); }
  onKill(e) {
    if (!this.buffs.has('feast')) return;
    const p = this.p;
    p.heal(p.maxHp * 0.06, true); p.gainCE(8);
    this.game.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 10, color: FROST, speed: 0, dir: tmp2.subVectors(p.pos, e.pos).setY(0.5).normalize().multiplyScalar(5), spread: 0.2, life: 0.6, size: 0.14, shape: 1 });
  }
  incoming(a, src) {
    if (this.buffs.has('rime') && src && src.maxHp && !src.dead && src.pos && src.pos.distanceTo(this.p.pos) < 4) this.chill(src, 2);
    return a;
  }
  // a crystal of ice that juts out of the ground and melts away
  iceSpire(at, h, w, life = 1.2) {
    const g = this.game;
    const m = new THREE.Mesh(this.spireGeo ??= new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), this.spireMat ??= new THREE.MeshStandardNodeMaterial({ color: ICE, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75, emissive: DEEP, emissiveIntensity: 0.9 }));
    m.position.copy(at).setY(at.y - 0.1); m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
    m.scale.set(w, 0.01, w); m.castShadow = true; g.scene.add(m);
    this.during(life, (t) => { const k = t < 0.08 ? t / 0.08 : t > life - 0.25 ? Math.max(0.01, (life - t) / 0.25) : 1; m.scale.set(w, Math.max(0.01, h * k), w); }, () => g.scene.remove(m));
    return m;
  }
  iceNeedles() {
    const g = this.game, p = this.p, base = this.aimAngle();
    this.cast(0.25);
    for (let i = 0; i < 5; i++) {
      const a = base + (i - 2) * 0.12;
      g.projectiles.fire({ pos: this.handPos(), vel: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(30), team: 'player', shape: 'nail', color: ICE, emissive: 2.5, scale: 1.6, life: 0.55, radius: 0.35,
        trail: (q) => { if (Math.random() < 0.4) g.particles.burst(q.pos, { count: 1, color: FROST, speed: 0.2, life: 0.25, size: 0.1 }); },
        onHit: (e, q) => { this.hit(e, 6 + this.rank('direct_ice') * 2, { stagger: 0.1, knock: q.vel.clone().setLength(1) }); this.chill(e, 1); g.fx.hitSpark(q.pos, null, { color: FROST }); } });
    }
    g.audio?.tone({ freq: 2200, to: 1500, dur: 0.08, gain: 0.05, type: 'triangle' });
  }
  iceLance() {
    const g = this.game, p = this.p, dir = this.fwd();
    this.cast(0.4);
    g.projectiles.fire({ pos: this.handPos(), vel: dir.clone().multiplyScalar(32), team: 'player', shape: 'arrow', color: ICE, emissive: 2.5, scale: 2.6, life: 0.7, radius: 0.7, pierce: true, light: 3,
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: Math.random() < 0.5 ? ICE : FROST, speed: 0.6, life: 0.3, size: 0.2, sizeEnd: 0.02 }),
      onHit: (e, q) => { this.hit(e, 30 + this.rank('direct_ice') * 6, { stagger: 0.6, knock: dir.clone().multiplyScalar(5) }); this.chill(e, 2); g.fx.hitSpark(q.pos, dir, { color: FROST, big: true }); g.audio?.impact(1); },
      onExpire: (q) => { const at = q.pos.clone(); at.y = this.groundAt(at.x, at.z, p.pos.y); this.spike(at, 1.6, 14); } });
    g.audio?.noise({ dur: 0.3, gain: 0.3, type: 'highpass', freq: 2500, sweep: 7000 });
  }
  iceSlide() {
    const g = this.game, p = this.p, f = this.fwd();
    let last = p.pos.clone();
    this.dash(f, 8, 0.32, { hitR: 1.4, dmg: 10, color: ICE, onHit: (e) => this.chill(e, 1) });
    this.during(0.32, () => {
      if (p.pos.distanceTo(last) > 0.8) {
        last = p.pos.clone();
        g.fx.rings.spawn(tmp.set(last.x, last.y + 0.05, last.z), { color: FROST, r0: 0.3, r1: 0.9, dur: 0.8, thick: 0.25 });
        g.particles.burst(tmp.set(last.x, last.y + 0.1, last.z), { count: 4, color: FROST, speed: 2, up: 0.5, life: 0.4, size: 0.1, shape: 1 });
      }
    });
    g.audio?.noise({ dur: 0.35, gain: 0.25, type: 'highpass', freq: 3000, sweep: 6000 });
  }
  frostNova() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 5;
    this.cast(0.4, true);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const at = c.clone().add(tmp.set(Math.cos(a) * R * 0.75, 0, Math.sin(a) * R * 0.75)); at.y = this.groundAt(at.x, at.z, c.y); this.iceSpire(at, 1.4 + Math.random(), 0.35, 0.9); }
    for (const e of this.foes(c, R)) { this.hit(e, 18 + this.rank('frost_calm') * 5, { stagger: 0.4, knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(5) }); this.chill(e, 2); }
    g.fx.shockwave(c, ICE, R + 0.5); g.fx.rings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: FROST, r0: 0.5, r1: R, dur: 0.35, thick: 0.2 });
    g.fx.flash(0xc0e8ff, 0.2, 0.12); g.shake(0.25);
    g.audio?.noise({ dur: 0.5, gain: 0.45, type: 'highpass', freq: 2000, sweep: 8000, rev: 0.3 });
  }
  blizzard() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = this.aimGround(12), R = 5;
    g.audio?.noise({ dur: 5, gain: 0.25, type: 'highpass', freq: 1200, sweep: 2000, attack: 0.5, rev: 0.4 });
    this.during(5, () => {
      for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R; g.particles.glow.spawn({ x: c.x + Math.cos(a) * r - 2, y: c.y + 4 + Math.random() * 2, z: c.z + Math.sin(a) * r, vx: 5, vy: -6, vz: 1.5, life: 0.8, r: 2, g: 2.4, b: 2.8, size: 0.12, drag: 0.5, sizeEnd: 0.6, shape: 'square' }); }
      if (Math.random() < 0.15) g.particles.smoke.spawn({ x: c.x + (Math.random() - 0.5) * R * 2, y: c.y + 1, z: c.z + (Math.random() - 0.5) * R * 2, vx: 2, vz: 0.5, life: 1.5, r: 0.75, g: 0.82, b: 0.9, size: 1.4, drag: 1, sizeEnd: 3 });
    });
    this.zone(c, R, 5, 0.5, (list) => { for (const e of list) { this.hit(e, 6 + this.rank('frost_calm') * 2, { stagger: 0.05, color: '#9ae0ff' }); this.chill(e, 1); } }, { color: FROST, particles: 0.3 });
  }
  rimeCoat() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.fx.flash(0xc0e8ff, 0.2, 0.15); g.audio?.tone({ freq: 1800, to: 2600, dur: 0.3, gain: 0.06, type: 'triangle', rev: 0.4 });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: ICE, r0: 2.5, r1: 0.4, dur: 0.4, thick: 0.15 });
    this.statBuff('rime', 8, { armor: 0.3 }, {
      onTick: () => { if (Math.random() < 0.5) { const a = Math.random() * Math.PI * 2; g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * 0.55, y: p.pos.y + Math.random() * 1.9, z: p.pos.z + Math.sin(a) * 0.55, vy: -0.2, life: 0.6, r: 1.6, g: 2.2, b: 2.8, size: 0.1, drag: 1, sizeEnd: 0.4, shape: 'square' }); } },
    });
  }
  glacialSpike() {
    const g = this.game, p = this.p, t = this.target(14);
    const at = t ? t.pos.clone() : this.aimGround(12); at.y = this.groundAt(at.x, at.z, at.y);
    this.cast(0.4, true);
    g.markers.spawn({ pos: at, dur: 0.45, radius: 1.6, color: ICE });
    this.after(0.45, () => {
      this.iceSpire(at, 4.5, 1.1, 1.4);
      for (const e of this.foes(at, 1.8)) {
        const frozen = this.isFrozen(e);
        this.hit(e, (40 + this.rank('shatter') * 8) * (frozen ? 2 : 1), { stagger: 0.9, unblockable: frozen, knock: new THREE.Vector3(), frozenNow: frozen });
        if (frozen) { e.frozenEnd = 0; if (!e.isBoss) e.sealT = 0; g.particles.burst(e.pos.clone().setY(e.pos.y + e.height * 0.5), { count: 24, color: ICE, speed: 9, life: 0.6, size: 0.14, gravity: 12, shape: 1, intensity: 3 }); }
        else this.chill(e, 2);
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
      }
      g.fx.shockwave(at, ICE, 2.6); g.shake(0.3); g.hitStop(0.04);
      g.audio?.noise({ dur: 0.35, gain: 0.45, type: 'highpass', freq: 2200, sweep: 8000 }); g.audio?.impact(1.2);
    });
  }
  iceBloom() {
    const g = this.game, p = this.p;
    let t = null, bs = -Infinity;
    for (const e of g.enemies) { if (e.dead || !(this.isFrozen(e) || e.chill > 0) || e.pos.distanceTo(p.pos) > 22) continue; const sc = (this.isFrozen(e) ? 100 : 0) + (e.chill ?? 0) * 10 - e.pos.distanceTo(p.aimPoint); if (sc > bs) { bs = sc; t = e; } }
    if (!t) { g.toast?.('Nothing is chilled'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    const c = t.pos.clone(); c.y = this.groundAt(c.x, c.z, c.y);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const at = c.clone().add(tmp.set(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2)); const m = this.iceSpire(at, 2.2, 0.4, 1.4); m.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); }
    this.iceSpire(c, 3, 0.6, 1.4);
    const frozen = this.isFrozen(t);
    this.hit(t, 35 + this.rank('shatter') * 8, { stagger: 0.8, unblockable: true, frozenNow: frozen });
    for (const e of this.foes(c, 4.2)) { if (e === t) continue; this.hit(e, 14, { stagger: 0.4 }); this.freeze(e, 1.8); }
    g.particles.burst(c.clone().setY(c.y + 1.5), { count: 30, color: FROST, speed: 7, life: 0.6, size: 0.14, shape: 1, intensity: 3 });
    g.fx.shockwave(c, ICE, 4.6); g.fx.flash(0xd0f0ff, 0.2, 0.12); g.shake(0.3);
    g.audio?.tone({ freq: 2400, to: 3200, dur: 0.4, gain: 0.07, type: 'triangle', rev: 0.5 }); g.audio?.impact(1.1);
  }
  absoluteZero() {
    const g = this.game, p = this.p, t = this.target(13);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    g.toast?.('Absolute Zero');
    this.freeze(t, 4 / ((1 + this.rank('permafrost') * 0.3) * this.freezeMul));
    if (t.isBoss) t.slowT = Math.max(t.slowT ?? 0, 4);
    g.fx.flash(0xe0f6ff, 0.35, 0.2); g.fx.chroma(0.8);
    g.audio?.noise({ dur: 0.8, gain: 0.4, type: 'highpass', freq: 1500, sweep: 6000, rev: 0.5 });
    let tick = 0;
    this.during(4, (tt, dt) => {
      if (t.dead) return false;
      if (!t.isBoss) t.sealT = Math.max(t.sealT ?? 0, 0.2);
      if (Math.random() < 0.6) g.particles.glow.spawn({ x: t.pos.x + (Math.random() - 0.5) * t.radius * 3, y: t.pos.y + Math.random() * t.height, z: t.pos.z + (Math.random() - 0.5) * t.radius * 3, vy: 0.3, life: 0.6, r: 1.8, g: 2.3, b: 2.8, size: 0.14, drag: 1, sizeEnd: 0.3, shape: 'square' });
      tick -= dt; if (tick > 0) return; tick = 0.5;
      this.hit(t, 6, { stagger: 0, knock: new THREE.Vector3(), crit: false, color: '#e0f6ff', frozenNow: true });
    }, () => {
      if (t.dead) return;
      const at = t.pos.clone().setY(t.pos.y + t.height * 0.5);
      t.frozenEnd = 0; if (!t.isBoss) t.sealT = 0;
      this.hit(t, 90 + this.rank('shatter') * 15 + (t.maxHp ?? 100) * (t.isBoss ? 0.04 : 0.15), { stagger: 1, unblockable: true, crit: false, frozenNow: true, color: '#e0f6ff' });
      g.particles.burst(at, { count: 36, color: ICE, speed: 11, life: 0.7, size: 0.16, gravity: 12, drag: 1.5, shape: 1, intensity: 3 });
      g.particles.burst(at, { count: 1, color: FROST, speed: 0, life: 0.2, size: 3.4, sizeEnd: 1.5, drag: 0, intensity: 2.5 });
      g.combat.aoe(at, 3, 24, p, { knock: 7, stagger: 0.5 });
      g.fx.shockwave(t.pos, ICE, 3.5); g.shake(0.5); g.hitStop(0.08);
      g.audio?.noise({ dur: 0.5, gain: 0.6, type: 'highpass', freq: 3000, sweep: 10000, rev: 0.3 }); g.audio?.impact(1.8);
    });
  }
  glacierWave() {
    const g = this.game, p = this.p, f = this.fwd(), side = new THREE.Vector3(f.z, 0, -f.x), from = p.pos.clone(), hit = new Set();
    this.cast(0.45, true);
    for (let row = 0; row < 7; row++) this.after(row * 0.08, () => {
      const n = 1 + row, d = 1.6 + row * 1.4, w = 0.6 + row * 0.5;
      for (let i = 0; i < n; i++) {
        const at = from.clone().addScaledVector(f, d).addScaledVector(side, n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * w);
        at.y = this.groundAt(at.x, at.z, from.y);
        this.iceSpire(at, 1.2 + Math.random() * 0.8, 0.35, 0.8);
      }
      const c = from.clone().addScaledVector(f, d);
      for (const e of this.foes(c, w + 1.2)) { if (hit.has(e)) continue; hit.add(e); this.hit(e, 22 + this.rank('direct_ice') * 4, { stagger: 0.5, knock: f.clone().multiplyScalar(5) }); this.chill(e, 1); if (!e.isBoss && !this.isFrozen(e)) e.vel.y = Math.max(e.vel.y, 6); }
      if (row % 2 === 0) g.audio?.tone({ freq: 1600 - row * 100, to: 900, dur: 0.08, gain: 0.05, type: 'triangle' });
    });
    g.audio?.noise({ dur: 0.6, gain: 0.3, type: 'highpass', freq: 2000, sweep: 6000 });
  }
  icePillars() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const c = this.aimGround(11), R = 3.4, N = 8;
    g.markers.spawn({ pos: c, dur: 0.4, radius: R + 1, color: ICE });
    this.after(0.4, () => {
      const spots = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2, at = c.clone().add(tmp.set(Math.cos(a) * R, 0, Math.sin(a) * R)); at.y = this.groundAt(at.x, at.z, c.y);
        spots.push(at);
        this.iceSpire(at, 3.6, 0.8, 5);
        for (const e of this.foes(at, 1.3)) { this.hit(e, 26, { stagger: 0.6 }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8); }
      }
      g.shake(0.3); g.audio?.impact(1.2); g.audio?.noise({ dur: 0.4, gain: 0.4, type: 'highpass', freq: 2200, sweep: 7000 });
      let tick = 0;
      this.during(5, (t, dt) => {
        tick -= dt; if (tick > 0) return; tick = 0.6;
        const near = new Set();
        for (const at of spots) for (const e of this.foes(at, 1.9)) near.add(e);
        for (const e of this.foes(c, R)) near.add(e);
        for (const e of near) { this.chill(e, 1); this.hit(e, 4, { stagger: 0, color: '#9ae0ff' }); }
      });
    });
  }
  permafrostField() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 6.5;
    this.cast(0.45, true);
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R; const at = c.clone().add(tmp.set(Math.cos(a) * r, 0, Math.sin(a) * r)); at.y = this.groundAt(at.x, at.z, c.y); this.iceSpire(at, 0.3 + Math.random() * 0.5, 0.3 + Math.random() * 0.3, 6); }
    g.fx.flash(0xc0e8ff, 0.2, 0.15); g.audio?.noise({ dur: 0.8, gain: 0.35, type: 'highpass', freq: 1800, sweep: 5000, rev: 0.4 });
    this.zone(c, R, 6, 0.6, (list) => {
      for (const e of list) {
        this.slow(e, 1);
        if (this.isFrozen(e)) e.frozenEnd = Math.max(e.frozenEnd, g.time + 0.7), e.sealT = e.isBoss ? e.sealT : Math.max(e.sealT ?? 0, 0.7);
        else this.chill(e, 1);
      }
    }, { color: FROST, particles: 0.8 });
  }
  avalanche() {
    const g = this.game, p = this.p, c = this.aimGround(13), R = 5, FALL = 1.2;
    p.action = { type: 'cast', both: true, dur: 0.8, elapsed: 0, t: 0, moveScale: 0.2, lock: true, faceAim: true };
    g.toast?.('Avalanche'); g.audio?.charge(FALL, 1.3);
    g.markers.spawn({ pos: c, dur: FALL, radius: R, color: ICE });
    const block = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshStandardNodeMaterial({ color: ICE, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.8, emissive: DEEP, emissiveIntensity: 0.8 }));
    block.castShadow = true;
    const start = c.clone().setY(c.y + 24);
    block.position.copy(start); block.rotation.set(0.3, 0.6, 0.2); g.scene.add(block);
    const light = g.lights.attach(block, ICE, 8, 18, { offsetY: 0, priority: 5 });
    this.during(FALL, (t, dt, k) => {
      block.position.lerpVectors(start, c.clone().setY(c.y + 2.5), k * k); block.rotation.y += dt;
      for (let i = 0; i < 3; i++) g.particles.burst(tmp.copy(block.position).add(tmp2.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5)), { count: 1, color: FROST, speed: 0.5, up: 2, life: 0.5, size: 0.4, sizeEnd: 1 });
    }, () => {
      g.lights.remove(light);
      this.blast(c, R, 100 + this.rank('permafrost') * 20, { color: ICE, knock: 12, stagger: 1, falloff: true, unblockable: true });
      for (const e of this.foes(c, R)) this.freeze(e, 2);
      for (let i = 0; i < 24; i++) g.debris.spawn(c.clone().setY(c.y + 1), new THREE.Vector3((Math.random() - 0.5) * 14, 5 + Math.random() * 8, (Math.random() - 0.5) * 14), 0.3 + Math.random() * 0.3, new THREE.Color(Math.random() < 0.5 ? ICE : FROST), 3);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; this.iceSpire(c.clone().add(tmp.set(Math.cos(a) * R * 0.7, 0, Math.sin(a) * R * 0.7)), 1.5 + Math.random(), 0.5, 2); }
      g.fx.screenWave(c, 1.4, 0.6); g.fx.flash(0xe0f6ff, 0.5, 0.25); g.fx.chroma(1.2);
      g.shake(0.9); g.hitStop(0.08);
      g.audio?.noise({ dur: 0.8, gain: 0.8, type: 'highpass', freq: 2500, sweep: 10000, rev: 0.4 }); g.audio?.energy('explode');
      this.during(0.5, (t) => { block.scale.setScalar(Math.max(0.01, 1 - t * 2)); block.position.y -= 0.05; }, () => { g.scene.remove(block); block.geometry.dispose(); block.material.dispose(); });
    });
  }
  iceCleaver() {
    const g = this.game, p = this.p, R = 3.3;
    p.facing = this.aimAngle();
    for (let i = 0; i < 3; i++) this.after(i * 0.13, () => {
      this.pose(i % 2 ? 'swingL' : 'swingR', 0.16);
      const dir = tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing)).clone();
      g.fx.slashArc(p.pos, p.facing, i === 2 ? FROST : ICE, R, 1.1, 0.16, i % 2 === 1);
      for (const e of this.foes(p.pos, R, dir, 0.9)) {
        const frozen = this.isFrozen(e);
        this.hit(e, (14 + this.rank('frost_touch') * 2) * (frozen ? 1.5 : 1), { melee: true, stagger: 0.3, knock: dir.clone().multiplyScalar(i === 2 ? 6 : 2), frozenNow: frozen });
        if (!frozen) this.chill(e, 1);
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), dir, { color: FROST });
      }
      g.audio?.energy('slash');
    });
  }
  iceBarrier() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0), new THREE.MeshStandardNodeMaterial({ color: ICE, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, emissive: DEEP, emissiveIntensity: 0.6, depthWrite: false, flatShading: true }));
    shell.renderOrder = 22; g.scene.add(shell);
    let left = 3;
    g.audio?.tone({ freq: 1600, to: 2400, dur: 0.3, gain: 0.06, type: 'triangle', rev: 0.4 });
    this.buff('ice_barrier', 6, {
      incoming: (a, src) => {
        if (left <= 0) return a;
        left--;
        const e = src && src.maxHp && !src.dead && src.pos ? src : null;
        if (e) this.chill(e, 2);
        const at = p.pos.clone().setY(p.pos.y + 1.1);
        for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; g.projectiles.fire({ pos: at.clone(), vel: new THREE.Vector3(Math.sin(ang), 0.05, Math.cos(ang)).multiplyScalar(18), team: 'player', shape: 'nail', color: ICE, emissive: 2.5, scale: 2, life: 0.3, radius: 0.4, onHit: (t) => { this.hit(t, 10, { stagger: 0.2 }); this.chill(t, 1); } }); }
        g.particles.burst(at, { count: 16, color: FROST, speed: 5, life: 0.4, size: 0.12, shape: 1 });
        g.audio?.noise({ dur: 0.25, gain: 0.35, type: 'highpass', freq: 3000, sweep: 8000 });
        if (left <= 0) { const b = this.buffs.get('ice_barrier'); if (b) b.left = 0.01; }
        return 0;
      },
      onTick: (dt, b) => { shell.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z); shell.rotation.y += dt * 0.6; shell.scale.setScalar(Math.min(1, (b.dur - b.left) * 6) * (0.75 + left * 0.1)); },
      onEnd: () => { g.scene.remove(shell); shell.geometry.dispose(); shell.material.dispose(); g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1.1, p.pos.z), { count: 20, color: ICE, speed: 5, life: 0.5, size: 0.12, gravity: 10, shape: 1 }); },
    });
  }
  preserve() {
    const g = this.game, p = this.p;
    if (p.hp >= p.maxHp) { g.toast?.('Already at full health'); g.audio?.ui('back'); return false; }
    p.action = { type: 'cast', both: true, dur: 1.6, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.invulnerable = true;
    p.healOverTime = { left: p.maxHp * 0.25, t: 1.6 };
    const ice = new THREE.Mesh(this.iceGeo, this.iceMat); ice.renderOrder = 22; g.scene.add(ice);
    g.fx.heal(p.pos, FROST); g.audio?.tone({ freq: 1200, to: 2400, dur: 0.4, gain: 0.07, type: 'triangle', rev: 0.5 });
    this.during(1.6, (t) => { ice.position.set(p.pos.x, p.pos.y + 1, p.pos.z); ice.scale.set(1.4, 2.3 * Math.min(1, t * 6), 1.4); }, () => {
      g.scene.remove(ice); p.invulnerable = false; if (p.action?.lock) p.action = null;
      for (const e of this.foes(p.pos, 3.2)) { this.hit(e, 16, { stagger: 0.5, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(6) }); this.chill(e, 2); }
      g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 30, color: ICE, speed: 8, life: 0.6, size: 0.14, gravity: 12, shape: 1, intensity: 3 });
      g.fx.shockwave(p.pos, ICE, 3.5); g.audio?.noise({ dur: 0.4, gain: 0.45, type: 'highpass', freq: 3000, sweep: 9000 });
    });
  }
  feast() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('Banquet for the King'); g.audio?.energy('heal');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0xc0405a, r0: 0.4, r1: 3, dur: 0.4, thick: 0.18 });
    this.statBuff('feast', 10, { techMult: 0.15, meleeMult: 0.15 }, {
      onTick: () => { if (Math.random() < 0.3) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.8, y: p.pos.y + 0.2 + Math.random() * 1.6, z: p.pos.z + (Math.random() - 0.5) * 0.8, vy: 0.6, life: 0.6, r: 2.4, g: 0.8, b: 1.2, size: 0.1, drag: 1, sizeEnd: 0.3, shape: 'square' }); },
    });
  }
}
registerKit('uraume', UraumeKit, URAUME_SKILLS);
