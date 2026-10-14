// Nanami-style kit — Ratio Technique (7:3).
// Nanami forcibly creates a weak point at the 7:3 mark of whatever he targets.
// The marked curse shows a 7:3 gauge; when it flashes gold, the weak point is
// exposed and blade strikes on it land a massive Ratio critical.
//   LMB  cloth-wrapped blade combo (bonus Ratio crit on the exposed mark).
//   RMB  Ratio Strike: lunge at the mark and cut the 7:3 point — always a crit.
//   1    7:3 Flurry: seven fast cuts, then a heavy cut through the weak point.
//   2    Collapse: strike the ground's weak point — terrain shatters and rubble
//        rains on every curse nearby.
//   3    Overtime: the binding vow lifts — damage up, speed up, and the weak
//        point stays exposed. Overtime also clocks in by itself after a long fight.
//   F    Endless Overtime (invented — Nanami has no canon domain): every curse
//        inside is marked and ratio lines cut through them on the clock.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const GOLD = 0xffd84a, CLOTH = 0xf2f0e8, SUIT = 0xd8c8a0;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('nanami', {
  name: 'Nanami', technique: 'Ratio Technique', rarity: 'rare', title: 'Grade 1 Salaryman',
  desc: 'Mark a curse and cut its 7:3 weak point for huge crits, Collapse the terrain onto curses, and work Overtime for raw power.',
  domain: 'Endless Overtime', color: '#ffd84a',
});

registerLook('nanami', {
  paint: { skinTone: 0xf0d0b4, hair: 0xe8d088, hairVolume: true, top: SUIT, collar: 0x5a7ab8, topTrim: 0x9a6a2a, buttons: 0x3a2410, sleeve: SUIT, pants: 0xcfbf96, shoes: 0x3a2a1a, eye: 0x3a5a2a, fringe: 2, hairSide: 3, hairBack: 4 },
  paintExtra(S) {
    // tinted goggle-glasses
    S.rect(9, 12, 2, 1, 0x2a4a3a, 0); S.rect(13, 12, 2, 1, 0x2a4a3a, 0); S.px(11, 12, 0xc8c8c8); S.px(12, 12, 0xc8c8c8);
    S.px(8, 12, 0xc8c8c8); S.px(15, 12, 0xc8c8c8);
    // leopard-print tie
    for (const [x, y] of [[23, 22], [24, 24], [23, 27], [24, 29]]) S.px(x, y, 0x2a1408);
  },
  hair: (m) => [
    { x: -1.5, y: 8, z: 1, w: 5, h: 2, d: 5, rx: -0.1, rz: 0.25, material: m },   // side part
    { x: 2.5, y: 7.5, z: 0.5, w: 3, h: 2, d: 5, rz: -0.35, material: m },
    { x: 0, y: 7.5, z: -2, w: 6, h: 2, d: 3, rx: -0.4, material: m },
    { x: -3, y: 7, z: 3, w: 3, h: 2, d: 1.5, rx: 0.6, rz: 0.3, material: m },
  ],
  hairColor: 0xe8d088, accent: GOLD, emit: 0,
  cape: { color: SUIT, segments: 2, length: 5, width: 8 },
  props(rig, K) {
    // a blunt blade bound completely in polka-dot cloth
    const blade = new THREE.Group();
    const cloth = K.mat(CLOTH, { roughness: 0.95 }), dot = K.mat(0x151515, { roughness: 0.9 }), grip = K.mat(0x3a2a1a, { roughness: 0.9 });
    K.box(blade, 1.3, 4, 1.3, grip, 0, 0, 0);
    K.box(blade, 2.2, 13, 1, cloth, 0, -8.5, 0);
    for (let i = 0; i < 6; i++) K.box(blade, 0.6, 0.6, 1.1, dot, i % 2 ? 0.5 : -0.5, -3.5 - i * 1.9, 0);
    K.box(blade, 2.4, 0.5, 1.2, K.mat(0xe0dccf), 0, -15, 0);
    blade.rotation.x = Math.PI / 2; blade.position.z = 3 * K.PX;
    rig.handR.add(blade); rig.extras.weapon = blade;
    // the tie he wraps around his fist when he clocks out
    const tie = K.box(rig.handL, 2.4, 2, 2.4, K.mat(0x9a6a2a, { roughness: 0.8 }), 0, -1, 0);
    tie.visible = false; rig.extras.tie = tie;
  },
});

registerDomainEnv('endless_overtime', {
  skyTop: 0x1a0c08, skyHorizon: 0xff9a40, fog: 0x3a1c0c, fogDensity: 0.016, hemiSky: 0xffc890, hemiGround: 0x2a1408, hemiI: 1.1, sun: 0xffb060, sunI: 1.3,
  grade: { tint: [1.1, 1.0, 0.86], lift: [0.03, 0.015, 0.0], sat: 1.1, contrast: 1.12, vignette: 0.45 }, floor: B.polished,
});

export const NANAMI_SKILLS = [
  { id: 'ratio', name: '7:3', desc: 'Ratio criticals hit harder.', max: 3 },
  { id: 'window', name: 'Precise Eye', desc: 'The weak point stays exposed longer.', max: 3 },
  { id: 'flurry', name: 'Diligent Work', desc: '7:3 Flurry cuts faster and harder.', max: 2 },
  { id: 'collapse', name: 'Collapse', desc: 'Wider collapse and more falling rubble.', max: 3 },
  { id: 'overtime', name: 'Overtime', desc: 'Overtime lasts longer and hits harder.', max: 3 },
  { id: 'contract', name: 'Binding Vow', desc: 'Overtime clocks in sooner on its own.', max: 2, req: 'overtime' },
];

class NanamiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 13, range: 2.8, arc: 1.15, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.16, trail: GOLD, sparkColor: 0xfff0b0 },
      { style: 'swingL', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 13, range: 2.8, arc: 1.15, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.16, trail: GOLD, sparkColor: 0xfff0b0 },
      { style: 'punch', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 15, range: 2.9, arc: 0.9, lunge: 8, knock: 4, stop: 0.06, shake: 0.18, trail: CLOTH },
      { style: 'slam', dur: 0.55, windup: 0.42, strike: 0.6, dmg: 28, range: 3.2, arc: Math.PI, lunge: 4, knock: 10, stop: 0.09, shake: 0.42, ring: true, ringColor: GOLD, stagger: 0.6, trail: GOLD },
    ];
    this.slots = {
      ranged: this.ability({ name: 'Ratio Strike', icon: '📏', cd: 1.6, ce: 0, use: () => this.ratioStrike() }),
      t1: this.ability({ name: '7:3 Flurry', icon: '🗡️', cd: 6, ce: 12, use: () => this.flurry() }),
      t2: this.ability({ name: 'Collapse', icon: '🧱', cd: 10, ce: 20, use: () => this.collapse() }),
      t3: this.ability({ name: 'Overtime', icon: '🕔', cd: 24, ce: 30, use: () => { this.cast(0.4, true); this.startOvertime(9 + r('overtime') * 2); } }),
    };
    this.domain = {
      name: 'Endless Overtime', icon: '🕔', key: 'endless_overtime', type: 5, color: GOLD, sound: 'overtime', flash: 0xffb060,
      duration: 8, radius: 24,
      onStart: (g) => { this.startOvertime(9, true); g.toast?.('No canon domain — this one is pure overtime.'); },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt;
        if (d.tick > 0) return;
        d.tick = 0.5;
        const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
        for (let i = 0; i < Math.min(3, list.length); i++) this.ratioCut(list[Math.floor(Math.random() * list.length)], 16, 2.2);
      },
    };
    this.mark = null; this.cycle = 0; this.workT = 0; this.overtimeT = 0;
    this.buildMarker();
  }
  dispose() { super.dispose(); this.disposed = true; }
  // ------------------------------------------------------------ 7:3 marker
  buildMarker() {
    const grp = new THREE.Group();
    const mk = (c, o = 1) => new THREE.MeshBasicNodeMaterial({ color: c, transparent: true, opacity: o, depthTest: false, depthWrite: false, fog: false });
    this.barMat = mk(0xffffff, 0.55); this.tickMat = mk(GOLD, 1);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), this.barMat); bar.position.y = 0.5;
    grp.add(bar);
    for (let i = 0; i <= 10; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(i % 10 === 0 ? 0.3 : 0.12, 0.025, 0.025), this.barMat); d.position.y = i / 10; grp.add(d); }
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.07), this.tickMat); tick.position.y = 0.7; grp.add(tick);
    this.tickMesh = tick;
    for (const m of grp.children) { m.renderOrder = 40; m.frustumCulled = false; }
    grp.visible = false;
    this.marker = this.own(grp);
  }
  get overtime() { return this.overtimeT > 0; }
  get speedMul() { return this.overtime ? 1.2 : 1; }
  exposed(e) { return e && (this.overtime || this.game.domainSys?.sureHit(this.p) || (e === this.mark && this.cycle < 0.35 + this.rank('window') * 0.07)); }
  ratioMult() { return (1.6 + this.rank('ratio') * 0.35) * (this.overtime ? 1.3 + this.rank('overtime') * 0.08 : 1); }
  weakPoint(e) { return e.pos.clone().setY(e.pos.y + e.height * 0.7); }
  pickMark() {
    const g = this.game, p = this.p;
    const a = this.p.autoTarget;
    if (a && !a.dead) return a;
    if (this.mark && !this.mark.dead && this.mark.pos.distanceTo(p.pos) < 14) return this.mark;
    return g.nearestEnemy(p.aimPoint, 4) || g.nearestEnemy(p.pos, 9);
  }
  tick(dt) {
    const g = this.game, p = this.p;
    this.cycle = (this.cycle + dt) % 1.4;
    this.mark = this.pickMark();
    const m = this.marker;
    if (this.mark && !this.mark.dead) {
      const e = this.mark;
      m.visible = true;
      m.position.copy(e.pos).addScaledVector(tmp.set(Math.sin(p.facing + 1.6), 0, Math.cos(p.facing + 1.6)), e.radius + 0.25);
      m.quaternion.copy(g.rig.camera.quaternion);
      m.scale.set(1, e.height, 1);
      const ex = this.exposed(e);
      this.tickMat.color.set(ex ? GOLD : 0x8a7a50);
      this.tickMesh.scale.set(ex ? 1.5 + Math.sin(g.time * 30) * 0.15 : 1, 1 / Math.max(0.5, e.height) * (ex ? 1.6 : 1), 1);
      if (ex && Math.random() < 0.4) { const w = this.weakPoint(e); g.particles.glow.emit(w.x, w.y, w.z, (Math.random() - 0.5) * 2, 0.4, (Math.random() - 0.5) * 2, 0.3, 3, 2.4, 0.6, 0.08, 0, 2, 0.2, 1); }
    } else m.visible = false;
    // overtime: clocks in by itself after a long, continuous fight
    const fighting = g.enemies.some((e) => !e.dead && !e.isDummy && e.pos.distanceTo(p.pos) < 20);
    if (this.overtime) {
      this.overtimeT -= dt;
      if (Math.random() < 0.5) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 1, 0, 0.5, 2.6, 2, 0.5, 0.1, 0, 1, 0.2, 1);
      if (this.overtimeT <= 0) this.endOvertime();
    } else if (fighting) {
      this.workT += dt;
      if (this.workT >= 45 - this.rank('contract') * 10) this.startOvertime(7 + this.rank('overtime') * 1.5);
    }
  }
  // ------------------------------------------------------------ ratio hits
  ratioCut(e, base, mult, o = {}) {
    const g = this.game, p = this.p;
    if (!e || e.dead) return 0;
    const w = this.weakPoint(e);
    const dealt = g.combat.damageEnemy(e, base, p, { crit: true, critMult: mult, stagger: 0.6, color: '#ffd84a', ...o });
    const side = tmp2.set(Math.cos(p.facing), 0, -Math.sin(p.facing));
    g.fx.slashLine(w.clone().addScaledVector(side, -1.2), side, 2.4, 0xffffff, 0.22, 0.18);
    g.fx.slashLine(w.clone().addScaledVector(side, -1.0).setY(w.y - 0.03), side, 2, GOLD, 0.12, 0.3);
    g.fx.hitSpark(w, null, { color: GOLD, big: true, crit: true });
    g.lights.flash(w, GOLD, 8, 7, 0.2);
    return dealt;
  }
  onMeleeHit(e, step) {
    if (!this.exposed(e) || this.ratioLock === this.game.time) return;
    this.ratioLock = this.game.time;  // one ratio bonus per strike
    this.ratioCut(e, step.dmg * 0.8, this.ratioMult(), { melee: true });
    this.game.hitStop(0.05); this.game.audio?.impact(1.3, 'crit');
  }
  ratioStrike() {
    const g = this.game, p = this.p;
    const t = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : this.mark;
    if (t && !t.dead) p.aimDir.copy(tmp.subVectors(t.pos, p.pos).setY(0).normalize());
    const step = { style: 'swingR', dur: 0.34, windup: 0.22, strike: 0.45, dmg: 0, range: 2.8, arc: 0.9, lunge: 15, knock: 0, stop: 0, shake: 0, trail: GOLD, custom: true };
    p.startAttack(step, 0);
    this.pending = { step: p.action.step, target: t };
    g.audio?.whoosh(0.9);
  }
  onStrike(step) {
    if (!this.pending || step !== this.pending.step) return;
    const g = this.game, p = this.p, t = this.pending.target; this.pending = null;
    const rk = this.rank('ratio');
    let target = t && !t.dead && t.pos.distanceTo(p.pos) < 3.6 + t.radius ? t : null;
    if (!target) target = g.combat.query(p.pos, tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing)), 3, 0.9)[0];
    if (!target) { g.fx.slashArc(p.pos, p.facing, GOLD, 2.8, 0.4, 0.2); return; }
    const mult = (2.4 + rk * 0.3) * (this.exposed(target) ? 1.5 : 1) * (this.overtime ? 1.2 : 1);
    this.ratioCut(target, 18 + rk * 6, mult, { melee: true, knock: tmp.subVectors(target.pos, p.pos).setY(0).normalize().multiplyScalar(5) });
    g.hitStop(0.08); g.shake(0.25); g.fx.chroma(0.5);
    g.audio?.energy('slash'); g.audio?.impact(1.5, 'crit');
  }
  flurry() {
    const g = this.game, p = this.p, rk = this.rank('flurry');
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const gap = 60 - rk * 8;
    for (let i = 0; i < 8; i++) setTimeout(() => {
      if (p.dead || this.disposed) return;
      const last = i === 7;
      const style = last ? 'slam' : i % 2 ? 'swingL' : 'swingR';
      p.action = { type: 'attack', step: { style, strike: 0.4, windup: 0.2 }, style, dur: last ? 0.42 : 0.12, elapsed: 0, t: 0, windup: 0.2, strike: 0.4, struck: true, moveScale: 0.25 };
      const fwd = tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const hits = g.combat.query(p.pos, fwd, 3.2, 1.0);
      if (!last) {
        for (const e of hits) { g.combat.damageEnemy(e, 6 + rk * 2, p, { melee: true, stagger: 0.25, knock: fwd.clone().multiplyScalar(0.8) }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * (0.3 + Math.random() * 0.5)), fwd, { color: 0xfff0b0 }); }
        g.fx.slashArc(p.pos, p.facing + (Math.random() - 0.5) * 0.6, i % 2 ? CLOTH : GOLD, 2.9, 0.35, 0.12, i % 2 === 1);
        g.audio?.swing(i % 4);
        if (hits.length) g.hitStop(0.015);
      } else {
        // the heavy finisher goes straight through the weak point
        for (const e of hits) this.ratioCut(e, 20 + rk * 8, this.ratioMult() * 1.4, { melee: true, knock: fwd.clone().multiplyScalar(9), stagger: 0.9 });
        g.fx.shockwave(p.pos.clone().addScaledVector(fwd, 1.4), GOLD, 4);
        g.shake(0.4); g.hitStop(0.09); g.audio?.impact(1.7, 'crit');
      }
    }, i * gap);
  }
  collapse() {
    const g = this.game, p = this.p, rk = this.rank('collapse');
    const to = p.aimPoint.clone(); tmp.subVectors(to, p.pos).setY(0);
    if (tmp.length() > 9) to.copy(p.pos).addScaledVector(tmp.normalize(), 9);
    const gy = g.world.groundBelow(to.x, to.z, p.pos.y + 3); to.y = isFinite(gy) ? gy : p.pos.y;
    const R = 4 + rk * 0.8;
    p.facing = Math.atan2(to.x - p.pos.x, to.z - p.pos.z);
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.55, windup: 0.4 }, style: 'slam', dur: 0.6, elapsed: 0, t: 0, windup: 0.4, strike: 0.55, struck: true, moveScale: 0.1 };
    // ratio lines etched across the ground first
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI + Math.random() * 0.3; const d = tmp2.set(Math.cos(a), 0, Math.sin(a)); g.fx.slashLine(to.clone().setY(to.y + 0.12).addScaledVector(d, -R), d.clone(), R * 2, GOLD, 0.15, 0.5); }
    g.fx.rings.spawn(tmp.set(to.x, to.y + 0.08, to.z), { color: GOLD, r0: R, r1: R * 0.7, dur: 0.35, thick: 0.08 });
    g.audio?.charge(0.3, 1.2);
    setTimeout(() => {
      if (this.disposed) return;
      g.combat.hitBlocks(to.clone().setY(to.y - 1), tmp.set(0, 0, 1), R, Math.PI, 400, p);
      g.combat.hitBlocks(to, tmp.set(0, 0, 1), R, Math.PI, 400, p);
      const n = g.combat.aoe(to, R, 30 + rk * 12, p, { knock: 6, stagger: 1, blocks: false, crit: true, critMult: 1.5 });
      for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(to) < R + 1) e.slowT = 2.5;   // buried in rubble
      g.debris.burst(to.clone().setY(to.y + 0.4), B.stone_brick, 16, 1.3);
      g.fx.shockwave(to, GOLD, R + 1.5); g.fx.screenWave(to, 0.9, 0.5);
      g.fx.flash(0x2a1a08, 0.3, 0.15);
      g.shake(0.6); g.hitStop(n ? 0.08 : 0.04);
      g.audio?.breakBlock('stone'); g.audio?.energy('explode');
      // rubble rains down
      const rocks = 6 + rk * 2;
      for (let i = 0; i < rocks; i++) setTimeout(() => {
        const a = Math.random() * Math.PI * 2, rr = Math.random() * R;
        const from = to.clone().add(tmp.set(Math.cos(a) * rr, 7 + Math.random() * 3, Math.sin(a) * rr));
        g.projectiles.fire({ pos: from, vel: new THREE.Vector3(0, -6, 0), team: 'player', shape: 'cube', color: 0x8a8070, emissive: 0.05, gravity: 24, life: 2, scale: 1.4 + Math.random(), radius: 0.6, ghost: false,
          onHit: (e) => { g.combat.damageEnemy(e, 14 + rk * 4, p, { stagger: 0.5, knock: new THREE.Vector3(0, 0, 0) }); },
          onExpire: (q) => { g.combat.aoe(q.pos, 1.4, 8 + rk * 3, p, { stagger: 0.3, blocks: false }); g.fx.debris(q.pos, 0x8a8070, 4); g.audio?.impact(0.6); } });
      }, 120 + i * 70);
    }, 330);
  }
  startOvertime(dur, quiet = false) {
    const g = this.game, p = this.p;
    if (!this.overtime && !this.otBonus) { this.otBonus = 0.25 + this.rank('overtime') * 0.08; p.stats.damage += this.otBonus; }
    this.overtimeT = Math.max(this.overtimeT, dur); this.workT = 0;
    if (p.rig.extras.tie) p.rig.extras.tie.visible = true;
    if (!quiet) { g.toast?.('🕔 OVERTIME — clocking out of the contract', 'big'); g.fx.flash(0xffa040, 0.35, 0.2); }
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GOLD, r0: 0.4, r1: 4, dur: 0.5, thick: 0.15 });
    g.audio?.charge(0.5, 0.8);
  }
  endOvertime() {
    this.overtimeT = 0;
    if (this.otBonus && !this.disposed) this.p.stats.damage -= this.otBonus;
    this.otBonus = 0;
    if (this.p.rig.extras.tie) this.p.rig.extras.tie.visible = false;
  }
}
registerKit('nanami', NanamiKit, NANAMI_SKILLS);
