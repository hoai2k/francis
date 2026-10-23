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
import { Kit, ability, passive } from './kit.js';
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
  { id: 'ratio', name: '7:3', icon: '📏', desc: 'Ratio criticals hit harder.', max: 3, branch: 'Ratio', tier: 1, req: 'ab:ratio_strike' },
  { id: 'window', name: 'Exposed Point', icon: '👁️', desc: 'The weak point stays exposed longer.', max: 3, branch: 'Ratio', tier: 3, req: 'ab:weak_point' },
  { id: 'flurry', name: 'Diligent Work', icon: '🗡️', desc: '7:3 Flurry cuts faster and harder; Black Flash hits harder.', max: 2, branch: 'Blade', tier: 3, req: 'ab:flurry' },
  { id: 'collapse', name: 'Collapse', icon: '🧱', desc: 'Every Collapse (and the ultimate) shatters a wider area and brings down more rubble.', max: 3, branch: 'Collapse', tier: 1 },
  { id: 'overtime', name: 'Overtime', icon: '🕔', desc: 'Overtime lasts longer and hits harder.', max: 3, branch: 'Overtime', tier: 3, req: 'ab:overtime' },
  { id: 'contract', name: 'Binding Vow', icon: '📜', desc: 'Overtime clocks in sooner on its own.', max: 2, branch: 'Overtime', tier: 4, req: 'up:overtime' },
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
    this.branches = ['Ratio', 'Blade', 'Black Flash', 'Overtime', 'Collapse'];
    this.library = {
      // ---- Ratio Technique (7:3)
      ratio_strike: ability({ name: 'Ratio Strike', icon: '📏', kind: 'basic', desc: 'Lunge at the marked curse and cut its 7:3 point — always a critical, far bigger while the weak point is exposed.', cd: 1.6, ce: 0, branch: 'Ratio', tier: 0, start: true, legacy: 'ranged', use: () => this.ratioStrike() }),
      weak_point: ability({ name: 'Forced Weak Point', icon: '📐', kind: 'technique', desc: 'Draw the ten-part line across a curse and fix its 7:3 mark: its weak point stays exposed for 5s.', cd: 9, ce: 10, branch: 'Ratio', tier: 1, req: 'ratio_strike', use: () => this.forceWeakPoint() }),
      parry: ability({ name: 'Calculated Parry', icon: '🤺', kind: 'defence', desc: 'Read the attack: for 1.2s the next hit is deflected completely and answered with a Ratio critical on the attacker.', cd: 10, ce: 8, branch: 'Ratio', tier: 2, req: 'ratio_strike', use: () => this.parry() }),
      ten_division: ability({ name: 'Ten Divisions', icon: '📊', kind: 'technique', desc: 'Divide everything in a line ahead into ten parts (marked on the ground), then cut all of it at the 7:3 line.', cd: 8, ce: 14, branch: 'Ratio', tier: 2, req: 'weak_point', use: () => this.tenDivisions() }),
      critical_point: ability({ name: '7:3 Critical Point', icon: '🎯', kind: 'technique', desc: 'One flawless cut through the marked curse\'s weak point. The more wounded it is, the deeper it goes; doubled on an exposed mark.', cd: 16, ce: 26, branch: 'Ratio', tier: 4, req: 'ten_division', use: () => this.criticalPoint() }),
      // ---- the cloth-wrapped blade
      rising_cut: ability({ name: 'Rising Cut', icon: '🗡️', kind: 'basic', desc: 'A quick upward cut with the wrapped blade that pops light curses into the air.', cd: 0.8, ce: 0, branch: 'Blade', tier: 1, use: () => this.risingCut() }),
      flurry: ability({ name: '7:3 Flurry', icon: '⚔️', kind: 'technique', desc: 'Seven fast cuts, then a heavy cut through the weak point.', cd: 6, ce: 12, branch: 'Blade', tier: 2, legacy: 't1', req: 'rising_cut', use: () => this.flurry() }),
      sweep: ability({ name: 'Horizontal Sweep', icon: '🌙', kind: 'technique', desc: 'A wide, flat cut all around you that throws curses back.', cd: 6, ce: 8, branch: 'Blade', tier: 2, req: 'rising_cut', use: () => this.sweep() }),
      measured_step: ability({ name: 'Measured Step', icon: '👞', kind: 'movement', desc: 'A precise dash that cuts through everything in the way; the first curse cut has its weak point exposed.', cd: 5, ce: 5, branch: 'Blade', tier: 3, req: 'sweep', use: () => this.measuredStep() }),
      blunt_edge: ability({ name: 'Blunt Edge', icon: '🔨', kind: 'technique', desc: 'The blade is bound in cloth — swing it like a club: a crushing overhead blow that stuns and breaks guards in front of you.', cd: 9, ce: 12, branch: 'Blade', tier: 3, req: 'flurry', use: () => this.bluntEdge() }),
      // ---- Black Flash (Nanami held the record: four in a row)
      black_flash: ability({ name: 'Black Flash', icon: '⚡', kind: 'technique', desc: 'A tie-wrapped punch that always sparks black. Chain them within a few seconds for up to four in a row, each one harder.', cd: 7, ce: 16, branch: 'Black Flash', tier: 1, legacy: 't2', use: () => this.blackFlashPunch() }),
      kick: ability({ name: 'Straight Kick', icon: '🦶', kind: 'technique', desc: 'A flat front kick that sends a curse flying back into the ones behind it.', cd: 5, ce: 6, branch: 'Black Flash', tier: 2, req: 'black_flash', use: () => this.straightKick() }),
      tie_wrap: ability({ name: 'Tie Wrap', icon: '👔', kind: 'buff', desc: 'Wrap your tie around your fist: for 8s melee hits 20% harder and every combo blow may spark a Black Flash.', cd: 16, ce: 12, branch: 'Black Flash', tier: 2, req: 'black_flash', use: () => this.tieWrap() }),
      bf_record: ability({ name: 'Consecutive Black Flash', icon: '🏆', kind: 'technique', desc: 'The record: four Black Flashes in a row on one curse, each harder than the last.', cd: 18, ce: 30, branch: 'Black Flash', tier: 3, req: 'kick', use: () => this.bfRecord() }),
      // ---- Overtime
      overtime: ability({ name: 'Overtime', icon: '🕔', kind: 'buff', desc: 'The binding vow lifts — damage up, speed up, and every weak point stays exposed. Also clocks in by itself after a long fight.', cd: 24, ce: 30, branch: 'Overtime', tier: 1, legacy: 't3', use: () => { this.cast(0.4, true); this.startOvertime(9 + this.rank('overtime') * 2); } }),
      clock_out: ability({ name: 'Clocking Out', icon: '🚪', kind: 'movement', desc: 'Step back out of reach (invulnerable), leaving a 7:3 cut where you stood.', cd: 6, ce: 4, branch: 'Overtime', tier: 2, req: 'overtime', use: () => this.clockOut() }),
      time_mgmt: ability({ name: 'Time Management', icon: '⏱️', kind: 'buff', desc: 'Work efficiently: for 5s your other cooldowns run twice as fast.', cd: 20, ce: 12, branch: 'Overtime', tier: 2, req: 'overtime', use: () => this.timeManagement() }),
      grit: ability({ name: 'Grit', icon: '🔥', kind: 'defence', desc: 'Keep working through the burns (Shibuya): for 5s take 40% less damage, recover 15% health, and nothing can drop you below 1 health.', cd: 24, ce: 14, branch: 'Overtime', tier: 3, req: 'clock_out', use: () => this.grit() }),
      overtime_rush: ability({ name: 'Overtime Rush', icon: '💼', kind: 'technique', desc: 'Push forward through ten rapid cuts. During Overtime every cut is a critical.', cd: 14, ce: 22, branch: 'Overtime', tier: 4, req: 'time_mgmt', use: () => this.overtimeRush() }),
      // ---- Extension Technique: Collapse
      collapse_line: ability({ name: 'Collapse: Fault Line', icon: '🪨', kind: 'technique', desc: 'Strike the 7:3 point of the floor ahead: the ground ruptures along a line (marked first), throwing curses up and slowing them.', cd: 10, ce: 18, branch: 'Collapse', tier: 2, req: 'weak_point', use: () => this.collapseLine() }),
      rubble_rain: ability({ name: 'Falling Rubble', icon: '🧱', kind: 'technique', desc: 'Break the structure above the aimed spot: rubble rains down on the marked circle for 2s.', cd: 14, ce: 22, branch: 'Collapse', tier: 3, req: 'collapse_line', use: () => this.rubbleRain() }),
      crater: ability({ name: 'Collapse: Crater', icon: '🕳️', kind: 'technique', desc: 'Drive the blade into the floor at your feet: everything around you caves in — curses are battered, stunned and buried.', cd: 18, ce: 30, branch: 'Collapse', tier: 4, req: 'rubble_rain', use: () => this.crater() }),
    };
    this.passives = {
      precise_eye: passive({ name: 'Precise Eye', icon: '👓', desc: 'The weak point stays exposed 50% longer, and forced weak points last 2s more.', branch: 'Ratio', tier: 3, req: 'weak_point', apply: (pl, k) => { k.eyeBonus = true; } }),
      discipline: passive({ name: 'Grade 1 Discipline', icon: '🧑‍💼', desc: '+12% melee damage and +5% critical chance.', branch: 'Blade', tier: 2, req: 'rising_cut', apply: (pl) => { pl.stats.meleeMult += 0.12; pl.stats.crit += 0.05; } }),
      record: passive({ name: 'Record Holder', icon: '📈', desc: 'Every Black Flash restores 10 extra Cursed Energy and the streak lasts 2s longer.', branch: 'Black Flash', tier: 3, req: 'tie_wrap', apply: (pl, k) => { k.recordHolder = true; } }),
      contract: passive({ name: 'Contract Hours', icon: '📝', desc: 'Overtime grants 15% more damage and clocks in on its own 15s sooner.', branch: 'Overtime', tier: 3, req: 'time_mgmt', apply: (pl, k) => { k.contractHours = true; } }),
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
  exposed(e) { return e && (this.overtime || this.game.domainSys?.sureHit(this.p) || (e.ratioUntil ?? 0) > this.game.time || (e === this.mark && this.cycle < (0.35 + this.rank('window') * 0.07) * (this.eyeBonus ? 1.5 : 1))); }
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
      if (ex && Math.random() < 0.4) { const w = this.weakPoint(e); g.particles.glow.spawn({ pos: w, vx: (Math.random() - 0.5) * 2, vy: 0.4, vz: (Math.random() - 0.5) * 2, life: 0.3, r: 3, g: 2.4, b: 0.6, size: 0.08, drag: 2, shape: 'square' }); }
    } else m.visible = false;
    // overtime: clocks in by itself after a long, continuous fight
    const fighting = g.enemies.some((e) => !e.dead && !e.isDummy && e.pos.distanceTo(p.pos) < 20);
    if (this.overtime) {
      this.overtimeT -= dt;
      if (Math.random() < 0.5) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.8, y: p.pos.y + Math.random() * 1.8, z: p.pos.z + (Math.random() - 0.5) * 0.8, vy: 1, life: 0.5, r: 2.6, g: 2, b: 0.5, size: 0.1, drag: 1, shape: 'square' });
      if (this.overtimeT <= 0) this.endOvertime();
    } else if (fighting) {
      this.workT += dt;
      if (this.workT >= 45 - this.rank('contract') * 10 - (this.contractHours ? 15 : 0)) this.startOvertime(7 + this.rank('overtime') * 1.5);
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
    this.bfStreak = Math.min(4, this.bfStreak + 1); this.bfT = this.recordHolder ? 6 : 4;
    if (this.recordHolder) p.gainCE(10);
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
    for (let i = 0; i < 8; i++) this.after(i * gap / 1000, () => {
      if (p.dead) return;
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
    });
  }
  // ============================================================== tree abilities
  // Tie Wrap: combo blows may spark a Black Flash
  blackFlashReady() {
    if (!this.buffs.has('tie_wrap')) return false;
    if (Math.random() < 0.2) { this.bfStreak = Math.min(4, this.bfStreak + 1); this.bfT = this.recordHolder ? 6 : 4; if (this.recordHolder) this.p.gainCE(10); return true; }
    return false;
  }
  // draw the ten-part ruler across a curse (gold ticks, the 7:3 mark in white)
  rulerFx(e) {
    const g = this.game, p = this.p;
    const side = tmp2.set(Math.cos(p.facing), 0, -Math.sin(p.facing)).clone();
    const base = e.pos.clone().addScaledVector(side, -(e.radius + 0.6));
    g.fx.slashLine(base.clone().setY(e.pos.y), new THREE.Vector3(0, 1, 0), e.height * 1.1, GOLD, 0.06, 0.6);
    for (let i = 1; i < 10; i++) g.fx.slashLine(base.clone().setY(e.pos.y + e.height * i / 10), side, i === 7 ? (e.radius + 0.6) * 2 : 0.35, i === 7 ? 0xffffff : GOLD, i === 7 ? 0.08 : 0.04, 0.6);
  }
  forceWeakPoint() {
    const g = this.game, p = this.p;
    const t = this.target(12) ?? this.mark;
    if (!t || t.dead) { g.toast?.('No curse to mark'); g.audio?.ui('back'); return false; }
    this.cast(0.35);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    t.ratioUntil = g.time + 5 + (this.eyeBonus ? 2 : 0);
    this.mark = t; p.autoTarget = t;
    this.rulerFx(t);
    g.fx.hitSpark(this.weakPoint(t), null, { color: GOLD, big: true });
    g.lights.flash(this.weakPoint(t), GOLD, 6, 6, 0.3);
    g.audio?.tone?.({ freq: 880, to: 1320, dur: 0.18, gain: 0.08, type: 'triangle' });
  }
  parry() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.fx.slashArc(p.pos, p.facing, GOLD, 1.8, 0.8, 0.3);
    g.audio?.whoosh(0.7);
    let used = false;
    this.buff('parry', 1.2, {
      incoming: (a, src) => {
        if (used) return a;
        used = true; this.buffs.get('parry').left = 0;
        g.fx.damageNumber(p.pos.clone().setY(p.pos.y + 1.6), 0, { text: 'PARRY', color: '#ffd84a' });
        g.fx.hitSpark(this.handPos(), null, { color: 0xffffff, big: true });
        p.iframes = Math.max(p.iframes, 0.4);
        if (src && src.pos && !src.dead && !src.isPlayer && src.takeDamage) {
          p.facing = Math.atan2(src.pos.x - p.pos.x, src.pos.z - p.pos.z);
          this.pose('swingR', 0.3);
          src.ratioUntil = Math.max(src.ratioUntil ?? 0, g.time + 3);
          this.ratioCut(src, 20 + this.rank('ratio') * 6, this.ratioMult() * 1.4, { melee: true, stagger: 1, knock: tmp.subVectors(src.pos, p.pos).setY(0).normalize().multiplyScalar(6) });
          g.hitStop(0.08); g.shake(0.3);
        }
        g.audio?.impact(1.6, 'crit');
        return 0;
      },
      onTick: () => { if (Math.random() < 0.5) g.particles.burst(this.handPos(), { count: 1, color: GOLD, speed: 1, life: 0.2, size: 0.1, shape: 1 }); },
    });
  }
  tenDivisions() {
    const g = this.game, p = this.p;
    const f = this.fwd(), side = new THREE.Vector3(f.z, 0, -f.x), L = 10, from = p.pos.clone().setY(p.pos.y + 0.12);
    p.facing = this.aimAngle();
    // the line is divided into ten on the ground; the seventh mark burns white
    g.fx.slashLine(from, f, L, GOLD, 0.1, 0.55);
    for (let i = 1; i <= 10; i++) g.fx.slashLine(from.clone().addScaledVector(f, L * i / 10).addScaledVector(side, -0.7), side, 1.4, i === 7 ? 0xffffff : GOLD, i === 7 ? 0.14 : 0.06, 0.55);
    this.cast(0.5, false, { lock: true, hold: true, cancelable: false, moveScale: 0 });
    g.audio?.tone?.({ freq: 660, to: 990, dur: 0.3, gain: 0.07, type: 'triangle' });
    this.after(0.35, () => {
      if (p.action?.lock) p.action = null;
      this.pose('swingR', 0.3);
      const at = p.pos.clone().setY(p.pos.y + 1.1);
      g.fx.slashLine(at, f, L, 0xffffff, 0.4, 0.2); g.fx.slashLine(at.clone().setY(at.y - 0.05), f, L, GOLD, 0.2, 0.35);
      let n = 0;
      this.line(p.pos, f, L, 1.1, (e) => { this.ratioCut(e, 22 + this.rank('ratio') * 6, this.ratioMult() * (this.exposed(e) ? 1.4 : 1), { stagger: 0.7, knock: f.clone().multiplyScalar(3) }); n++; });
      if (n) { g.hitStop(0.07); g.shake(0.3); g.fx.chroma(0.5); }
      g.audio?.energy('slash');
    });
  }
  criticalPoint() {
    const g = this.game, p = this.p;
    const t = (this.mark && !this.mark.dead && this.mark.pos.distanceTo(p.pos) < 9) ? this.mark : this.target(9);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, GOLD);
    this.rulerFx(t);
    p.action = { type: 'cast', both: true, dur: 0.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes, 0.7);
    g.audio?.charge?.(0.3, 0.35);
    this.after(0.32, () => {
      if (p.action?.lock) p.action = null;
      if (t.dead) return;
      this.pose('swingL', 0.35);
      const missing = Math.min((t.maxHp - t.hp) * 0.35, t.isBoss ? 260 : 400);
      const mult = this.ratioMult() * (this.exposed(t) ? 2 : 1);
      this.ratioCut(t, 26 + this.rank('ratio') * 8 + missing / Math.max(1, mult), mult, { melee: true, unblockable: true, stagger: 1.2, knock: tmp.subVectors(t.pos, p.pos).setY(0).normalize().multiplyScalar(6) });
      const w = this.weakPoint(t);
      g.fx.slashX(w, 2.4 + t.height * 0.4, 0xffffff);
      g.fx.screenWave(w, 0.9, 0.4); g.fx.flash(0xfff0b0, 0.3, 0.12); g.fx.chroma(1);
      g.hitStop(0.12); g.shake(0.55); g.audio?.impact(2, 'crit');
    });
  }
  risingCut() {
    const g = this.game, p = this.p;
    p.facing = this.aimAngle();
    this.pose('uppercut', 0.28);
    this.after(0.08, () => {
      const f = this.fwd();
      let n = 0;
      for (const e of this.foes(p.pos, 3, f, 0.8)) {
        this.hit(e, 14, { melee: true, stagger: 0.4, knock: f.clone().multiplyScalar(1.5) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
        if (this.exposed(e)) this.ratioCut(e, 8, this.ratioMult(), { melee: true });
        n++;
      }
      g.fx.slashArc(p.pos, p.facing, GOLD, 2.8, 0.4, 0.15, true);
      if (n) { g.hitStop(0.04); g.audio?.impact(1); }
      g.audio?.swing(1);
    });
  }
  sweep() {
    const g = this.game, p = this.p, R = 3.8;
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.45, windup: 0.2 }, style: 'spin', dur: 0.45, elapsed: 0, t: 0, windup: 0.2, strike: 0.45, struck: true, moveScale: 0.2 };
    this.after(0.12, () => {
      let n = 0;
      for (const e of this.foes(p.pos, R)) {
        const kd = tmp.subVectors(e.pos, p.pos).setY(0).normalize();
        this.hit(e, 22 + this.rank('flurry') * 5, { melee: true, stagger: 0.6, knock: kd.multiplyScalar(9) });
        if (this.exposed(e)) this.ratioCut(e, 10, this.ratioMult(), { melee: true });
        n++;
      }
      g.fx.slashArc(p.pos, p.facing, GOLD, R, 1, 0.25); g.fx.slashArc(p.pos, p.facing + Math.PI, CLOTH, R * 0.9, 1, 0.25, true);
      g.fx.shockwave(p.pos, GOLD, R + 0.5);
      if (n) { g.hitStop(0.06); g.shake(0.3); g.audio?.impact(1.3); }
      g.audio?.whoosh(1.2);
    });
  }
  measuredStep() {
    const g = this.game, p = this.p, f = this.fwd();
    let first = true;
    this.pose('swingR', 0.25);
    g.audio?.whoosh(1.2);
    this.dash(f, 7, 0.2, { color: GOLD, hitR: 1.5, dmg: 18, hitOpts: { melee: true, stagger: 0.5 }, onHit: (e) => {
      if (first) { first = false; e.ratioUntil = Math.max(e.ratioUntil ?? 0, g.time + 3); this.mark = e; this.rulerFx(e); }
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: GOLD });
    }, onEnd: () => g.fx.slashLine(p.pos.clone().addScaledVector(f, -7).setY(p.pos.y + 1), f, 7, GOLD, 0.25, 0.25) });
  }
  bluntEdge() {
    const g = this.game, p = this.p;
    p.facing = this.aimAngle();
    this.pose('slam', 0.5);
    g.audio?.whoosh(1.1);
    this.after(0.22, () => {
      const f = this.fwd(), c = p.pos.clone().addScaledVector(f, 1.6);
      let n = 0;
      for (const e of this.foes(p.pos, 3.4, f, 0.9)) {
        e.guarding = false;
        this.hit(e, 36 + this.rank('flurry') * 8, { melee: true, unblockable: true, stagger: 1, knock: f.clone().multiplyScalar(4) });
        this.stun(e, 1.5);
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.7), null, { color: 0xffffff, big: true });
        n++;
      }
      g.fx.shockwave(c, GOLD, 3); g.fx.landDust(c, 20); g.debris.burst(c.clone().setY(c.y + 0.3), B.stone, 5, 0.7);
      g.combat.hitBlocks(c, f, 1.6, Math.PI, 40, p);
      g.shake(0.45); g.hitStop(n ? 0.08 : 0.03); g.audio?.impact(1.8);
    });
  }
  straightKick() {
    const g = this.game, p = this.p;
    const t = this.target(4, 0.2);
    if (t) this.closeIn(t, GOLD);
    this.pose('uppercut', 0.3);
    this.after(0.1, () => {
      const f = this.fwd();
      const e = (t && !t.dead) ? t : this.foes(p.pos, 2.8, f, 0.8)[0];
      g.audio?.whoosh(1.1);
      if (!e) return;
      this.hit(e, 24, { melee: true, stagger: 0.9, knock: new THREE.Vector3() });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: 0xffffff, big: true });
      g.hitStop(0.07); g.shake(0.35); g.audio?.impact(1.5);
      if (e.isBoss) return;
      const dir = tmp.subVectors(e.pos, p.pos).setY(0).normalize().clone(), seen = new Set([e]);
      this.during(0.4, () => {
        if (e.dead) return false;
        e.knock.copy(dir).multiplyScalar(18);
        for (const o of this.foes(e.pos, 1.5)) if (!seen.has(o)) { seen.add(o); this.hit(o, 18, { stagger: 0.7, knock: dir.clone().multiplyScalar(7) }); this.hit(e, 8, { stagger: 0.2 }); g.audio?.impact(1); }
      });
    });
  }
  tieWrap() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    g.toast?.('👔 Tie wrapped'); g.audio?.charge?.(0.3, 0.4);
    const tie = p.rig.extras.tie;
    this.statBuff('tie_wrap', 8, { meleeMult: 0.2 }, {
      onStart: () => { if (tie) tie.visible = true; },
      onTick: () => { if (Math.random() < 0.35) { const h = tmp.set(p.pos.x - Math.sin(p.facing + 1.2) * 0.4, p.pos.y + 1.1, p.pos.z - Math.cos(p.facing + 1.2) * 0.4); g.particles.burst(h, { count: 1, color: 0xff2a2a, speed: 1.2, life: 0.2, size: 0.08, shape: 1 }); } },
      onEnd: () => { if (tie && !this.overtime) tie.visible = false; },
    });
  }
  bfRecord() {
    const g = this.game, p = this.p;
    let t = (this.mark && !this.mark.dead && this.mark.pos.distanceTo(p.pos) < 8) ? this.mark : this.target(8);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    if (p.rig.extras.tie) p.rig.extras.tie.visible = true;
    p.iframes = Math.max(p.iframes, 1.1);
    this.bfStreak = 0;
    const styles = ['punch', 'swingL', 'swingR', 'uppercut'];
    for (let i = 0; i < 4; i++) this.after(i * 0.22, () => {
      if (!t || t.dead) t = this.target(8);
      if (!t) return;
      this.closeIn(t, 0xff2a2a);
      this.pose(styles[i], 0.2);
      this.landBlackFlash(t);
      if (i === 3) { g.fx.screenWave(t.pos.clone().setY(t.pos.y + 1), 1, 0.45); g.fx.chroma(1.1); g.shake(0.6); }
    });
    this.after(1, () => { if (p.rig.extras.tie && !this.overtime && !this.buffs.has('tie_wrap')) p.rig.extras.tie.visible = false; });
  }
  clockOut() {
    const g = this.game, p = this.p;
    const back = this.fwd().negate(), at = p.pos.clone();
    g.audio?.whoosh(1);
    this.dash(back, 6, 0.2, { color: GOLD, iframes: 0.4 });
    p.facing = Math.atan2(-back.x, -back.z);
    // a parting cut across the spot you left
    const side = new THREE.Vector3(back.z, 0, -back.x);
    g.fx.slashLine(at.clone().setY(at.y + 1).addScaledVector(side, -2), side, 4, GOLD, 0.25, 0.3);
    for (const e of this.foes(at, 2.4)) this.ratioCut(e, 12, this.exposed(e) ? this.ratioMult() : 1.5, { stagger: 0.5 });
  }
  timeManagement() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.toast?.('⏱️ Time Management'); g.audio?.tone?.({ freq: 1200, to: 1200, dur: 0.06, gain: 0.08, type: 'square' });
    const self = this.library.time_mgmt;
    this.buff('time_mgmt', 5, { onTick: (dt) => {
      for (const k in this.slots) { const s = this.slots[k]; if (s === self || s.empty) continue; if (s.maxCharges) s.recharge = (s.recharge ?? 0) + dt; else s.cdLeft = Math.max(0, s.cdLeft - dt); }
      if (Math.random() < 0.3) { const a = g.time * 4; g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * 0.9, y: p.pos.y + 1.2, z: p.pos.z + Math.sin(a) * 0.9, vy: 0.3, life: 0.4, r: 2.6, g: 2, b: 0.5, size: 0.1, drag: 1, shape: 'square' }); }
    } });
  }
  grit() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    g.toast?.('🔥 Grit'); g.fx.flash(0x3a1004, 0.25, 0.2); g.audio?.charge?.(0.3, 0.5);
    if (p.hp < p.maxHp) p.healOverTime = { left: p.maxHp * 0.15, t: 2.5 };
    this.buff('grit', 5, {
      incoming: (a) => { a *= 0.6; if (p.hp - a < 1) a = Math.max(0, p.hp - 1); return a; },
      onTick: () => { if (Math.random() < 0.4) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.8, y: p.pos.y + Math.random() * 1.6, z: p.pos.z + (Math.random() - 0.5) * 0.8, vy: 1, life: 0.5, r: 2.6, g: 1, b: 0.3, size: 0.1, drag: 1, shape: 'square' }); },
    });
  }
  overtimeRush() {
    const g = this.game, p = this.p;
    const crit = this.overtime;
    p.iframes = Math.max(p.iframes, 0.6);
    for (let i = 0; i < 10; i++) this.after(i * 0.07, () => {
      p.facing = this.aimAngle();
      const f = this.fwd(), last = i === 9;
      const nx = p.pos.x + f.x * 0.55, nz = p.pos.z + f.z * 0.55;
      if (!g.world.solidAt(nx, p.pos.y + 0.5, nz) && !g.world.solidAt(nx, p.pos.y + 1.5, nz)) { p.pos.x = nx; p.pos.z = nz; }
      this.pose(last ? 'slam' : i % 2 ? 'swingL' : 'swingR', last ? 0.35 : 0.08);
      for (const e of this.foes(p.pos, last ? 3.6 : 3, f, last ? Math.PI : 0.9)) {
        if (last || this.exposed(e)) this.ratioCut(e, last ? 26 : 6, this.ratioMult() * (crit ? 1.3 : 1), { melee: true, stagger: last ? 1 : 0.2, knock: f.clone().multiplyScalar(last ? 9 : 0.6) });
        else this.hit(e, 8, { melee: true, crit: crit || undefined, stagger: 0.2, knock: f.clone().multiplyScalar(0.6) });
      }
      g.fx.slashArc(p.pos, p.facing + (Math.random() - 0.5) * 0.7, i % 2 ? CLOTH : GOLD, 2.9, 0.35, 0.1, i % 2 === 1);
      g.audio?.swing(i % 4);
      if (last) { g.fx.shockwave(p.pos.clone().addScaledVector(f, 1.4), GOLD, 4); g.shake(0.45); g.hitStop(0.08); g.audio?.impact(1.8, 'crit'); }
    });
  }
  // a smaller Collapse: the floor ruptures along a line
  collapseLine() {
    const g = this.game, p = this.p, rk = this.rank('collapse');
    const f = this.fwd(), L = 11 + rk, start = p.pos.clone();
    p.facing = this.aimAngle();
    g.fx.slashLine(start.clone().setY(start.y + 0.12), f, L, GOLD, 0.5, 0.6);
    g.fx.slashLine(start.clone().setY(start.y + 0.12).addScaledVector(f, L * 0.7), new THREE.Vector3(f.z, 0, -f.x), 0.01, 0xffffff, 0.01, 0.1);
    this.pose('slam', 0.5);
    g.audio?.charge?.(0.3, 0.4);
    for (let i = 1; i <= 6; i++) this.after(0.3 + i * 0.06, () => {
      const c = start.clone().addScaledVector(f, L * i / 6); c.y = this.groundAt(c.x, c.z, start.y);
      g.combat.aoe(c, 1.9 + rk * 0.2, 30 + rk * 8, p, { knock: 3, stagger: 0.7, blocks: false, color: '#ffd84a' });
      for (const e of this.foes(c, 2)) { if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8); this.slow(e, 2.5); }
      g.combat.hitBlocks(c.clone().setY(c.y - 0.5), f, 1.4, Math.PI, 60, p);
      g.debris.burst(c.clone().setY(c.y + 0.3), B.stone_brick, 5, 0.9);
      g.fx.shockwave(c, GOLD, 2.2, 0.3);
      g.shake(0.15); g.audio?.impact(1.1);
    });
    this.after(0.3, () => { g.audio?.breakBlock?.('stone'); });
  }
  rubbleRain() {
    const g = this.game, p = this.p, rk = this.rank('collapse');
    const c = this.aimGround(12), R = 4 + rk * 0.5;
    this.pose('swingR', 0.35);
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: GOLD, r0: R, r1: R * 0.96, dur: 2.4, thick: 0.08 });
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: 0xffffff, r0: 0.3, r1: R, dur: 0.5, thick: 0.06 });
    g.audio?.breakBlock?.('stone');
    for (let i = 0; i < 16 + rk * 4; i++) this.after(0.35 + i * 0.11, () => {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      const from = tmp.set(c.x + Math.cos(a) * rr, c.y + 9 + Math.random() * 3, c.z + Math.sin(a) * rr).clone();
      g.projectiles.fire({ pos: from, vel: new THREE.Vector3(0, -10, 0), team: 'player', shape: 'cube', color: 0x8a8070, emissive: 0.05, gravity: 26, life: 2, scale: 1.4 + Math.random(), radius: 0.7,
        onHit: (e) => { this.hit(e, 16 + rk * 4, { stagger: 0.5, knock: new THREE.Vector3() }); },
        onExpire: (q) => { g.combat.aoe(q.pos, 1.6, 10 + rk * 3, p, { stagger: 0.3, blocks: false }); g.fx.debris(q.pos, 0x8a8070, 4); g.audio?.impact(0.6); } });
    });
  }
  crater() {
    const g = this.game, p = this.p, rk = this.rank('collapse'), R = 6 + rk * 0.8;
    p.action = { type: 'cast', both: true, dur: 0.6, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes, 0.9);
    const c = p.pos.clone();
    // the ruler lines across the floor, then it caves in
    for (let i = -2; i <= 2; i++) { const o = i / 2 * R * 0.8, half = Math.sqrt(Math.max(0, R * R - o * o)); g.fx.slashLine(c.clone().setY(c.y + 0.12).add(tmp.set(o, 0, -half)), new THREE.Vector3(0, 0, 1), half * 2, GOLD, 0.1, 0.6); g.fx.slashLine(c.clone().setY(c.y + 0.12).add(tmp.set(-half, 0, o)), new THREE.Vector3(1, 0, 0), half * 2, GOLD, 0.1, 0.6); }
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.1, c.z), { color: GOLD, r0: R, r1: R * 0.95, dur: 0.6, thick: 0.1 });
    g.audio?.charge?.(0.4, 0.5);
    this.after(0.25, () => { p.action = { type: 'attack', step: { style: 'slam', strike: 0.5, windup: 0.35 }, style: 'slam', dur: 0.45, elapsed: 0, t: 0, windup: 0.35, strike: 0.5, struck: true, moveScale: 0 }; });
    this.after(0.45, () => {
      const n = g.combat.aoe(c, R, 60 + rk * 16, p, { knock: 5, stagger: 1, blocks: false, falloff: true, color: '#ffd84a' });
      for (const e of this.foes(c, R + 0.5)) { this.stun(e, 1.4); this.slow(e, 4); }
      for (let rr = 2; rr <= R; rr += 2) g.combat.hitBlocks(c.clone().setY(c.y - 1), tmp.set(0, 0, 1), rr, Math.PI, 300, p);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.debris.burst(c.clone().add(tmp.set(Math.cos(a) * R * 0.6, 0.4, Math.sin(a) * R * 0.6)), B.stone_brick, 8, 1.3); }
      g.fx.shockwave(c, GOLD, R + 1.5, 0.6); g.fx.screenWave(c, 1.2, 0.5);
      g.particles.burst(c.clone().setY(c.y + 0.5), { count: 40, color: 0x8a7a6a, additive: false, speed: R, up: 0.6, life: 1.2, size: 0.7, drag: 3, sizeEnd: 2.5 });
      g.fx.flash(0x3a2408, 0.35, 0.2); g.shake(0.8); g.hitStop(n ? 0.1 : 0.04);
      g.audio?.breakBlock?.('stone'); g.audio?.energy('explode');
    });
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
    if (!this.overtime && !this.otBonus) { this.otBonus = 0.25 + this.rank('overtime') * 0.08 + (this.contractHours ? 0.15 : 0); p.stats.damage += this.otBonus; }
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
