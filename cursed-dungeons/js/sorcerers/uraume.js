// Uraume-style kit — Ice Formation.
//   Chill: ice techniques stack Chill on curses (slowed); at 3 Chill they
//   freeze solid inside a block of ice for a moment.
//   LMB  frost-coated palm strikes that chill.
//   RMB  Direct Ice: a line of ice spikes erupts from the ground.
//   1    Icefall: huge ice shards rain down on the aim point.
//   2    Frost Calm: a freezing breath in a wide cone.
//   3    Shatter: every chilled or frozen curse bursts into razor ice.
//   F    Ultimate (Uraume has no Domain in canon): Ice Formation: Frost Calm
//        at full output — a white wave of frost freezes everything around
//        solid, then giant Icefall spears erupt through the frozen curses
//        and shatter them.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const ICE = 0x9ae0ff, FROST = 0xe0f6ff, DEEP = 0x4aa8ff;
const tmp = new THREE.Vector3();

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
  { id: 'frost_touch', name: 'Frost Touch', desc: '+8% melee damage per rank; melee chills harder.', max: 3 },
  { id: 'direct_ice', name: 'Direct Ice', desc: 'Longer, stronger ice spike lines.', max: 3 },
  { id: 'icefall', name: 'Icefall', desc: 'More and bigger falling shards.', max: 3 },
  { id: 'frost_calm', name: 'Frost Calm', desc: 'Wider, longer freeze.', max: 2 },
  { id: 'shatter', name: 'Shatter', desc: 'Shatter hits harder and its shards fly further.', max: 3, req: 'frost_calm' },
  { id: 'permafrost', name: 'Permafrost', desc: 'Frozen curses stay frozen longer; Frost Calm: Full Output reaches further.', max: 2 },
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
    this.slots = {
      ranged: this.ability({ name: 'Direct Ice', icon: '🧊', cd: 1.5, ce: 0, use: () => this.directIce() }),
      t1: this.ability({ name: 'Icefall', icon: '🌨️', cd: 8, ce: 14, use: () => this.icefall() }),
      t2: this.ability({ name: 'Frost Calm', icon: '❄️', cd: 10, ce: 18, use: () => this.frostCalm() }),
      t3: this.ability({ name: 'Shatter', icon: '💠', cd: 12, ce: 26, use: () => this.shatter() }),
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
    e.chill = Math.min(3, (e.chill ?? 0) + n); e.chillT = this.game.time;
    e.slowT = Math.max(e.slowT ?? 0, 1.5);
    if (e.chill >= 3) this.freeze(e, 1.4);
  }
  freeze(e, dur) {
    if (e.dead) return;
    const g = this.game;
    dur *= 1 + this.rank('permafrost') * 0.3;
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
      if (Math.random() < 0.15 * e.chill) g.particles.glow.emit(e.pos.x + (Math.random() - 0.5) * 0.6, e.pos.y + Math.random() * e.height, e.pos.z + (Math.random() - 0.5) * 0.6, 0, -0.3, 0, 0.6, 1.4, 2, 2.6, 0.08, 0, 1, 0.5, 1);
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
    for (let i = 0; i < n; i++) setTimeout(() => {
      this.spike(start.clone().addScaledVector(dir, 1.5 + i * 1.1), 1.2, dmg);
      if (i % 2 === 0) g.audio?.tone({ freq: 1800 - i * 80, to: 900, dur: 0.08, gain: 0.05, type: 'triangle' });
    }, i * 40);
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
    for (let i = 0; i < n; i++) setTimeout(() => {
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
    }, 350 + i * 70);
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
        g.particles.glow.emit(from.x, from.y - 0.2, from.z, Math.sin(a) * sp, (Math.random() - 0.4) * 1.5, Math.cos(a) * sp, range / sp, 1.6, 2.2, 2.8, 0.25, -1, 1.2, 2.2, 0);
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
      g.combat.damageEnemy(e, dmg, p, { stagger: 0.7, unblockable: true, color: '#e0f6ff' });
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
    setTimeout(() => g.toast?.('FROST CALM', 'domain'), 450);
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
        for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 6; g.particles.glow.emit(c.x + Math.cos(a) * r, c.y + 0.3 + Math.random() * 2.5, c.z + Math.sin(a) * r, -Math.cos(a) * r * 1.4 - Math.sin(a) * 3, 0.3, -Math.sin(a) * r * 1.4 + Math.cos(a) * 3, 0.6, 1.6, 2.2, 2.8, 0.14, 0, 2.5, 0.3, 1); }
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
        for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2; g.particles.glow.emit(c.x + Math.cos(a) * waveR, c.y + 0.2 + Math.random() * 1.5, c.z + Math.sin(a) * waveR, Math.cos(a) * 4, 1.5, Math.sin(a) * 4, 0.6, 1.8, 2.3, 2.8, 0.3, -0.5, 1.5, 1.4, 0); }
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
}
registerKit('uraume', UraumeKit, URAUME_SKILLS);
