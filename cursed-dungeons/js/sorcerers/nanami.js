// Nanami-style kit — Ratio Technique (7:3).
// Nanami forcibly creates a weak point at the 7:3 mark of whatever he targets.
// The marked curse shows a 7:3 gauge; when it flashes gold, the weak point is
// exposed and blade strikes on it land a massive Ratio critical.
//   LMB  cloth-wrapped blade combo (bonus Ratio crit on the exposed mark).
//   RMB  Ratio Strike: lunge at the mark and cut the 7:3 point — always a crit.
//   1    7:3 Flurry: seven fast cuts, then a heavy cut through the weak point.
//   2    Black Flash: a tie-wrapped punch that always sparks black. Nanami
//        holds the record — chain them within a few seconds for up to four in a
//        row, each one harder than the last.
//   3    Overtime: the binding vow lifts — damage up, speed up, and the weak
//        point stays exposed. Overtime also clocks in by itself after a long fight.
//   F    Extension Technique: Collapse (ultimate — Nanami has no canon domain):
//        the 7:3 point of the ground itself is struck. The whole floor around
//        him shatters, curses are buried, and the ceiling's worth of rubble
//        comes down on them.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { B } from '../world/blocks.js';

const GOLD = 0xffd84a, CLOTH = 0xf2f0e8, SUIT = 0xd8c8a0;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('nanami', {
  name: 'Nanami', technique: 'Ratio Technique', rarity: 'rare', title: 'Grade 1 Salaryman',
  desc: 'Mark a curse and cut its 7:3 weak point for huge crits, land record-setting Black Flashes, work Overtime for raw power, and Collapse the very ground onto curses.',
  ultimate: 'Collapse', color: '#ffd84a',
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

export const NANAMI_SKILLS = [
  { id: 'ratio', name: '7:3', desc: 'Ratio criticals hit harder.', max: 3 },
  { id: 'window', name: 'Precise Eye', desc: 'The weak point stays exposed longer.', max: 3 },
  { id: 'flurry', name: 'Diligent Work', desc: '7:3 Flurry cuts faster and harder; Black Flash hits harder.', max: 2 },
  { id: 'collapse', name: 'Collapse', desc: 'Collapse (ultimate) shatters a wider area and brings down more rubble.', max: 3 },
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
      t2: this.ability({ name: 'Black Flash', icon: '⚡', cd: 7, ce: 16, use: () => this.blackFlashPunch() }),
      t3: this.ability({ name: 'Overtime', icon: '🕔', cd: 24, ce: 30, use: () => { this.cast(0.4, true); this.startOvertime(9 + r('overtime') * 2); } }),
    };
    this.ultimate = { name: 'Collapse', icon: '🧱', use: () => this.collapse() };
    this.mark = null; this.cycle = 0; this.workT = 0; this.overtimeT = 0; this.bfStreak = 0; this.bfT = 0;
    this.buildMarker();
  }
  dispose() { super.dispose(); this.disposed = true; for (const id of this.timers ?? []) clearTimeout(id); this.timers = []; this.game.fx.dimTarget = 0; }
  later(ms, fn) { if ((this.timers ??= []).length > 200) this.timers = this.timers.slice(-100); this.timers.push(setTimeout(() => { if (!this.disposed) fn(); }, ms)); }
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
    this.bfT -= dt; if (this.bfT <= 0) this.bfStreak = 0;
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
  // Black Flash: cursed energy lands within 0.000001s of the blow — the
  // impact distorts space and the hit is 2.5x. Nanami's record is four in a row.
  blackFlashPunch() {
    const g = this.game, p = this.p;
    const t = this.mark && !this.mark.dead && this.mark.pos.distanceTo(p.pos) < 7 ? this.mark : g.nearestEnemy(p.pos, 6);
    if (t) p.aimDir.copy(tmp.subVectors(t.pos, p.pos).setY(0).normalize());
    if (p.rig.extras.tie) p.rig.extras.tie.visible = true;
    const step = { style: 'punch', dur: 0.36, windup: 0.3, strike: 0.5, dmg: 0, range: 2.8, arc: 0.9, lunge: 13, knock: 0, stop: 0, shake: 0, trail: 0xff2a2a, custom: true };
    p.startAttack(step, 0);
    this.pendingBF = { step: p.action.step, target: t };
    g.audio?.whoosh(1);
  }
  landBlackFlash(target) {
    const g = this.game, p = this.p, rk = this.rank('flurry');
    this.bfStreak = Math.min(4, this.bfStreak + 1); this.bfT = 4;
    const kd = tmp.subVectors(target.pos, p.pos).setY(0).normalize();
    g.combat.damageEnemy(target, (20 + rk * 6) * (1 + (this.bfStreak - 1) * 0.15), p, { melee: true, blackFlash: true, stagger: 1, knock: kd.clone().multiplyScalar(11) });
    g.combat.blackFlashFx(p, target);
    g.fx.hitSpark(target.pos.clone().setY(target.pos.y + target.height * 0.6), kd, { color: 0xff2020, big: true, crit: true });
    g.hitStop(0.1); g.shake(0.45);
    // in the zone: the flow of cursed energy sharpens after a Black Flash
    p.gainCE(6);
    g.toast?.(this.bfStreak >= 4 ? '⚡ BLACK FLASH ×4 — the record' : `⚡ BLACK FLASH${this.bfStreak > 1 ? ' ×' + this.bfStreak : ''}`);
  }
  onStrike(step) {
    if (this.pendingBF && step === this.pendingBF.step) {
      const g = this.game, p = this.p, t = this.pendingBF.target; this.pendingBF = null;
      if (p.rig.extras.tie && !this.overtime) p.rig.extras.tie.visible = false;
      let target = t && !t.dead && t.pos.distanceTo(p.pos) < 3.4 + t.radius ? t : null;
      if (!target) target = g.combat.query(p.pos, tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing)), 3, 0.9)[0];
      if (!target) { g.fx.slashArc(p.pos, p.facing, 0xff2a2a, 2.4, 0.3, 0.15); return; }
      this.landBlackFlash(target);
      return;
    }
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
  // Extension Technique: Collapse. Nanami strikes the weak point of the
  // ground — it is a structure like any other, so the 7:3 point brings the
  // whole thing down. Ultimate: a huge area, in slow motion.
  collapse() {
    const g = this.game, p = this.p, rk = this.rank('collapse');
    const to = p.aimPoint.clone(); tmp.subVectors(to, p.pos).setY(0);
    if (tmp.length() > 5) to.copy(p.pos).addScaledVector(tmp.normalize(), 5);
    const gy = g.world.groundBelow(to.x, to.z, p.pos.y + 3); to.y = isFinite(gy) ? gy : p.pos.y;
    const R = 10 + rk * 1.3;
    p.facing = Math.atan2(to.x - p.pos.x, to.z - p.pos.z);
    p.action = { type: 'cast', both: true, dur: 0.75, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes, 1.4);
    g.slowMo(1.3, 0.3);
    g.fx.dimTarget = 0.45; g.fx.chroma(0.6);
    g.toast?.('EXTENSION TECHNIQUE: COLLAPSE', 'domain');
    g.rig.cinematic?.({ center: to.clone().setY(to.y + 0.5), dur: 2.4, dist: 17, pitch: 0.75, orbit: 0.2 });
    // the 7:3 lines: Nanami reads the ground as one huge target
    const fwd = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing)), side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    for (let i = -3; i <= 3; i++) {
      const o = i / 3 * R * 0.8, half = Math.sqrt(Math.max(0, R * R - o * o));
      g.fx.slashLine(to.clone().setY(to.y + 0.12).addScaledVector(side, o).addScaledVector(fwd, -half), fwd.clone(), half * 2, GOLD, 0.12, 0.9);
      g.fx.slashLine(to.clone().setY(to.y + 0.12).addScaledVector(fwd, o).addScaledVector(side, -half), side.clone(), half * 2, GOLD, 0.12, 0.9);
    }
    // the weak point itself: the 7:3 mark along his line of sight
    const weak = to.clone().addScaledVector(fwd, R * 0.4).setY(to.y + 0.15);
    g.fx.rings.spawn(weak, { color: 0xffffff, r0: 2.4, r1: 0.2, dur: 0.6, thick: 0.25 });
    g.fx.slashLine(weak.clone().addScaledVector(side, -R * 0.7), side.clone(), R * 1.4, 0xffffff, 0.3, 0.9);
    g.fx.rings.spawn(tmp.set(to.x, to.y + 0.1, to.z), { color: GOLD, r0: R, r1: R * 0.96, dur: 0.8, thick: 0.08 });
    g.audio?.charge(0.6, 1.1);
    this.later(320, () => { p.action = { type: 'attack', step: { style: 'slam', strike: 0.5, windup: 0.35 }, style: 'slam', dur: 0.55, elapsed: 0, t: 0, windup: 0.35, strike: 0.5, struck: true, moveScale: 0 }; });
    this.later(560, () => {
      g.fx.dimTarget = 0;
      // the floor goes: a crater of broken blocks across the whole area
      for (let rr = 0; rr <= R; rr += 3) g.combat.hitBlocks(to.clone().setY(to.y - 1), tmp.set(0, 0, 1), Math.max(2, rr), Math.PI, 500, p);
      g.combat.hitBlocks(to, tmp.set(0, 0, 1), R * 0.6, Math.PI, 500, p);
      const n = g.combat.aoe(to, R, 70 + rk * 22, p, { knock: 7, stagger: 1.2, blocks: false, crit: true, critMult: 1.5, falloff: true, color: '#ffd84a' });
      for (const e of g.enemies) {
        if (e.dead || e.pos.distanceTo(to) > R + 1) continue;
        e.slowT = Math.max(e.slowT ?? 0, 5);                       // buried in rubble
        if (!e.isBoss) { e.sealT = Math.max(e.sealT ?? 0, 1.4); e.cancelAttack?.(); }
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6);
      }
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.debris.burst(to.clone().add(tmp.set(Math.cos(a) * R * 0.55, 0.4, Math.sin(a) * R * 0.55)), B.stone_brick, 10, 1.6); }
      g.debris.burst(to.clone().setY(to.y + 0.4), B.stone_brick, 24, 2);
      g.fx.shockwave(to, GOLD, R + 2, 0.7); g.fx.shockwave(to, 0xffffff, R * 0.5, 0.4); g.fx.screenWave(to, 1.6, 0.7);
      g.particles.burst(to.clone().setY(to.y + 0.5), { count: 60, color: 0x8a7a6a, additive: false, speed: R, up: 0.6, life: 1.4, size: 0.8, drag: 3, sizeEnd: 3 });
      g.lights.flash(to.clone().setY(to.y + 2), GOLD, 20, R * 2, 0.5, { priority: 8 });
      g.fx.flash(0x3a2408, 0.5, 0.25); g.fx.chroma(1.2);
      g.shake(1); g.hitStop(n ? 0.14 : 0.06);
      g.audio?.breakBlock('stone'); g.audio?.energy('explode'); g.audio?.impact(2.2);
      // then everything above comes down
      const rocks = 22 + rk * 6;
      for (let i = 0; i < rocks; i++) this.later(160 + i * 55, () => {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
        const from = to.clone().add(tmp.set(Math.cos(a) * rr, 9 + Math.random() * 5, Math.sin(a) * rr));
        g.projectiles.fire({ pos: from, vel: new THREE.Vector3(0, -8, 0), team: 'player', shape: 'cube', color: 0x8a8070, emissive: 0.05, gravity: 26, life: 2.2, scale: 1.6 + Math.random() * 1.4, radius: 0.8, ghost: false,
          onHit: (e) => { g.combat.damageEnemy(e, 22 + rk * 6, p, { stagger: 0.6, knock: new THREE.Vector3(0, 0, 0) }); },
          onExpire: (q) => { g.combat.aoe(q.pos, 1.8, 12 + rk * 4, p, { stagger: 0.4, blocks: false }); g.fx.debris(q.pos, 0x8a8070, 5); g.shake(0.08); g.audio?.impact(0.7); } });
      });
    });
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
