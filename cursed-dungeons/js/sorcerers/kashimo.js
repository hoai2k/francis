// Kashimo kit — cursed energy with the properties of electricity.
//   Kashimo's electric cursed energy charges whatever it touches, and his
//   lightning is drawn to the charge — it cannot miss a charged target.
//   LMB  Nyoi staff combo; every hit stores Charge on the curse. At 5 Charge
//        the stored electricity discharges as a lightning strike.
//   RMB  Electric Discharge: a bolt that chains between curses, favouring
//        charged ones. During Mythical Beast Amber it becomes a beam.
//   1    Nyoi Staff Throw: the staff flies out and plants itself as a
//        lightning rod that zaps every curse around it.
//   2    Charged Strike: every charged curse is struck from the sky at once.
//   3    Full Discharge: all his stored electricity leaves his body in a burst.
//   F    Ultimate (Kashimo has no canon domain): Mythical Beast Amber — his
//        one-time technique. An electromagnetic burst, then 12s as living
//        lightning (huge speed and damage, lightning on every hit, arcs that
//        leap to curses, Discharge becomes a beam) — and when it ends his body
//        breaks down: most of his HP drains away and he cannot use techniques
//        for a few seconds.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const VOLT = 0x6ae8ff, WHITE = 0xe8fbff, DEEP = 0x2a7aff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('kashimo', {
  name: 'Kashimo', technique: 'Mythical Beast Amber', rarity: 'legendary', title: 'The God of Lightning', color: '#6ae8ff',
  desc: 'His cursed energy is electricity: staff hits charge curses and his lightning cannot miss them. His ultimate, Mythical Beast Amber, turns him into living lightning — at the cost of his body.',
  ultimate: 'Mythical Beast Amber',
});

registerLook('kashimo', {
  paint: { skinTone: 0xf2dccc, hair: 0x8adcf0, hairVolume: true, top: 0x1a1e2c, kimono: true, sash: 0x6ae8ff, sleeve: 0x1a1e2c, pants: 0x14161f, shoes: 0x0c0c10, eye: 0x2ab8e8, brow: 0x6ac0d8, fringe: 2, hairSide: 3, hairBack: 4 },
  hair: (m) => [
    { x: 0, y: 8.4, z: -1, w: 3, h: 6, d: 3, rx: -0.15, material: m },                // tall top-knot
    { x: -1, y: 11, z: -1.4, w: 2.4, h: 4, d: 2.4, rx: -0.5, rz: 0.4, material: m },
    { x: 1, y: 11, z: -1.4, w: 2.4, h: 4, d: 2.4, rx: -0.5, rz: -0.4, material: m },
    { x: -2.6, y: 7.5, z: 1.5, w: 2.5, h: 3, d: 2.5, rx: 0.6, rz: 0.4, material: m },
    { x: 2.6, y: 7.5, z: 1.5, w: 2.5, h: 3, d: 2.5, rx: 0.6, rz: -0.4, material: m },
  ],
  hairColor: 0x8adcf0, accent: VOLT, emit: 0.4,
  cape: { color: 0xd8e4ea, length: 7, width: 9, segments: 2 },   // pale haori
  props(rig, K) {
    const pole = K.mat(0x2a3040, { metalness: 0.6, roughness: 0.4 }), tip = K.mat(VOLT, { metalness: 0.8, roughness: 0.2, emissive: 1.4 });
    const staff = new THREE.Group();
    K.box(staff, 1.1, 34, 1.1, pole, 0, -6, 0);
    K.box(staff, 1.6, 2, 1.6, tip, 0, 10.5, 0); K.box(staff, 1.6, 2, 1.6, tip, 0, -22.5, 0);
    K.box(staff, 1.4, 0.6, 1.4, tip, 0, 2, 0); K.box(staff, 1.4, 0.6, 1.4, tip, 0, -4, 0);
    staff.rotation.x = Math.PI / 2; staff.position.z = 2 * K.PX;
    rig.handR.add(staff); rig.extras.weapon = staff;
  },
});

export const KASHIMO_SKILLS = [
  { id: 'conduct', name: 'Conductivity', desc: 'Charge stacks faster; strikes and Full Discharge hit harder.', max: 3 },
  { id: 'chain', name: 'Chain Lightning', desc: 'Discharge jumps to one more curse per rank.', max: 2 },
  { id: 'staff', name: 'Nyoi Staff', desc: '+8% melee damage per rank; the planted staff lasts longer.', max: 3 },
  { id: 'clap', name: 'Charged Strike', desc: 'Charged Strike hits harder per Charge.', max: 2, req: 'conduct' },
  { id: 'amber', name: 'Mythical Beast', desc: 'Mythical Beast Amber lasts 2s longer and the breakdown is gentler.', max: 2 },
];

// Jagged lightning between two points, drawn from short slash quads.
function zap(g, a, b, color = VOLT, width = 0.28, segs = 6) {
  let prev = a.clone();
  const span = tmp2.subVectors(b, a).length();
  for (let i = 1; i <= segs; i++) {
    const next = a.clone().lerp(b, i / segs);
    if (i < segs) next.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(span * 0.12));
    const d = next.clone().sub(prev); const len = d.length();
    if (len > 0.01) {
      g.fx.slashLine(prev, d.normalize(), len * 1.05, color, width, 0.16, Math.random() * 3);
      if (i % 2) g.fx.slashLine(prev, d, len * 1.05, WHITE, width * 0.35, 0.12, Math.random() * 3);
    }
    prev = next;
  }
}

class KashimoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 13, range: 3.1, arc: 1.25, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: VOLT, sparkColor: WHITE, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 13, range: 3.1, arc: 1.25, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: VOLT, sparkColor: WHITE, chainAt: 0.55 },
      { style: 'punch', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 15, range: 3.6, arc: 0.6, lunge: 8, knock: 6, stop: 0.05, shake: 0.18, trail: VOLT, sparkColor: WHITE, chainAt: 0.55 },
      { style: 'spin', dur: 0.42, windup: 0.25, strike: 0.55, dmg: 18, range: 3.4, arc: Math.PI, lunge: 3, knock: 7, stop: 0.06, shake: 0.25, trail: VOLT, sparkColor: WHITE, chainAt: 0.6 },
      { style: 'slam', dur: 0.56, windup: 0.42, strike: 0.6, dmg: 28, range: 3.5, arc: Math.PI, lunge: 4, knock: 11, stop: 0.09, shake: 0.42, ring: true, ringColor: VOLT, stagger: 0.55, trail: VOLT },
    ];
    this.p.stats.meleeMult += r('staff') * 0.08;
    this.slots = {
      ranged: this.ability({ name: 'Electric Discharge', icon: '⚡', cd: 0.9, ce: 0, use: () => (this.amberT > 0 ? this.beam() : this.discharge()) }),
      t1: this.ability({ name: 'Staff Throw', icon: '🦯', cd: 8, ce: 12, use: () => this.staffThrow() }),
      t2: this.ability({ name: 'Charged Strike', icon: '🌩️', cd: 7, ce: 16, use: () => this.thunderclap() }),
      t3: this.ability({ name: 'Full Discharge', icon: '💥', cd: 12, ce: 26, use: () => this.fullDischarge() }),
    };
    this.amberT = 0; this.burnT = 0; this.arcT = 0; this.rod = null;
    this.ultimate = { name: 'Mythical Beast Amber', icon: '🐉', use: () => this.amber() };
  }
  // ------------------------------------------------------------ charge & lightning
  charge(e, n) {
    if (e.dead) return;
    e.kCharge = (e.kCharge ?? 0) + n * (1 + this.rank('conduct') * 0.25);
    if (e.kCharge >= 5) { e.kCharge = 0; this.strike(e.pos.clone(), 30 + this.rank('conduct') * 10, 2); this.game.fx.damageNumber(e.pos, 0, { text: 'DISCHARGE', color: '#6ae8ff', crit: true }); }
  }
  // a lightning bolt from the sky onto a point
  strike(at, dmg, R = 1.6) {
    const g = this.game, p = this.p;
    const gy = g.world.groundBelow(at.x, at.z, at.y + 2); const floor = isFinite(gy) ? gy : at.y;
    const ground = new THREE.Vector3(at.x, floor + 0.1, at.z);
    zap(g, ground.clone().setY(floor + 10), ground, VOLT, 0.4, 7);
    g.particles.burst(ground.clone().setY(floor + 0.4), { count: 18, color: VOLT, speed: 8, up: 1, life: 0.3, size: 0.08, shape: 3, intensity: 4 });
    g.fx.rings.spawn(ground, { color: VOLT, r0: 0.3, r1: R + 0.8, dur: 0.25, thick: 0.15 });
    g.lights.flash(ground.clone().setY(floor + 2), VOLT, 14, 10, 0.18);
    if (dmg > 0) g.combat.aoe(ground, R, dmg * (1 + this.rank('conduct') * 0.1), p, { stagger: 0.5, knock: 2, blocks: false, color: '#6ae8ff' });
    g.audio?.noise({ dur: 0.25, gain: 0.35, type: 'highpass', freq: 2500, sweep: 600, rev: 0.3 });
    g.audio?.tone({ freq: 120, to: 40, dur: 0.3, gain: 0.25, type: 'sawtooth', filter: 800 });
    g.shake(0.12);
  }
  onMeleeHit(e, step) {
    if (this.amberT > 0) { this.strike(e.pos.clone(), 16, 1.8); return; }
    this.charge(e, step.ring ? 2 : 1);
    if (Math.random() < 0.5) zap(this.game, this.handPos(), e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.18, 3);
  }
  // ------------------------------------------------------------ techniques
  discharge() {
    const g = this.game, p = this.p;
    this.cast(0.25);
    const from = this.handPos();
    let first = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    if (!first) { const cone = g.combat.query(p.pos, p.aimDir, 12, 0.45); cone.sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)); first = cone[0] ?? g.nearestEnemy(p.aimPoint, 3); }
    if (!first) { zap(g, from, from.clone().addScaledVector(p.aimDir, 8), VOLT, 0.25, 6); g.audio?.whoosh(0.5); return; }
    const hops = 2 + this.rank('chain');
    const hit = new Set();
    let cur = first, src = from;
    for (let i = 0; i <= hops && cur; i++) {
      const at = cur.pos.clone().setY(cur.pos.y + cur.height * 0.6);
      zap(g, src, at, i ? DEEP : VOLT, i ? 0.22 : 0.3, 5);
      g.combat.damageEnemy(cur, (14 - i * 2) * (this.amberT > 0 ? 1.6 : 1), p, { stagger: 0.3, knock: tmp.subVectors(cur.pos, p.pos).setY(0).normalize().multiplyScalar(2) });
      g.fx.hitSpark(at, null, { color: VOLT });
      this.charge(cur, 1);
      hit.add(cur); src = at;
      // next hop: prefer charged curses within reach
      let best = null, bs = -1;
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || e.isDummy && !cur.isDummy) continue;
        const d = e.pos.distanceTo(cur.pos); if (d > 6.5) continue;
        const s = (e.kCharge ?? 0) * 2 + (6.5 - d);
        if (s > bs) { bs = s; best = e; }
      }
      cur = best;
    }
    g.audio?.noise({ dur: 0.15, gain: 0.3, type: 'highpass', freq: 3000, sweep: 1200 });
  }
  staffThrow() {
    const g = this.game, p = this.p;
    if (this.rod) { g.toast?.('The staff is still planted'); g.audio?.ui('back'); return false; }
    const w = p.rig.extras.weapon;
    p.action = { type: 'attack', step: { style: 'throw', strike: 0.5, windup: 0.3 }, style: 'throw', dur: 0.4, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0.3 };
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const dir = sure ? tmp.subVectors(sure.pos, p.pos).setY(0).normalize().clone() : p.aimDir.clone();
    p.facing = Math.atan2(dir.x, dir.z);
    const pr = g.projectiles.fire({ pos: p.pos.clone().setY(p.pos.y + 1.3), vel: dir.multiplyScalar(30), team: 'player', shape: 'arrow', color: 0x7a90b0, emissive: 1.2, scale: 1.5, radius: 0.6, life: 0.45, pierce: true, light: 4,
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: VOLT, speed: 1.5, life: 0.25, size: 0.08, shape: 3 }),
      onHit: (e, q) => { g.combat.damageEnemy(e, 20 + this.rank('staff') * 6, p, { knock: q.vel.clone().setLength(5), stagger: 0.5 }); this.charge(e, 2); },
      onExpire: (q) => this.plantRod(q.pos.clone()) });
    if (!pr) return false;
    if (w) w.visible = false;
    g.audio?.whoosh(1.2);
  }
  plantRod(at) {
    const g = this.game, p = this.p;
    const gy = g.world.groundBelow(at.x, at.z, at.y + 1); at.y = isFinite(gy) ? gy : p.pos.y;
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), new THREE.MeshStandardNodeMaterial({ color: 0x2a3040, metalness: 0.6, roughness: 0.4 }));
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), new THREE.MeshStandardNodeMaterial({ color: VOLT, emissive: VOLT, emissiveIntensity: 3 }));
    pole.position.y = 1.4; tip.position.y = 3.05; pole.castShadow = true;
    grp.add(pole, tip); grp.position.copy(at); grp.rotation.z = 0.12;
    g.scene.add(grp);
    const light = g.lights.attach(tip, VOLT, 6, 8, { offsetY: 0, priority: 3 });
    this.strike(at.clone(), 20, 2);
    this.rod = { grp, light, t: 5 + this.rank('staff') * 1.5, tick: 0.2, top: at.clone().setY(at.y + 3) };
  }
  removeRod() {
    if (!this.rod) return;
    const g = this.game;
    g.scene.remove(this.rod.grp); g.lights.remove(this.rod.light);
    g.fx.blinkPuff(this.rod.grp.position, VOLT);
    this.rod = null;
    const w = this.p.rig.extras.weapon; if (w) w.visible = true;
  }
  thunderclap() {
    const g = this.game, p = this.p, rk = this.rank('clap');
    const sure = g.domainSys?.sureHit(p);
    const list = g.enemies.filter((e) => !e.dead && (e.kCharge ?? 0) > 0 && (sure ? g.domainSys.inside(e.pos) : e.pos.distanceTo(p.pos) < 16));
    if (!list.length) { g.toast?.('No charged curses'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true, { type: 'raise' });
    g.fx.flash(0x9ad8ff, 0.25, 0.15);
    list.forEach((e, i) => setTimeout(() => {
      if (e.dead) return;
      const stacks = Math.max(1, Math.round(e.kCharge ?? 1)); e.kCharge = 0;
      this.strike(e.pos.clone(), 0, 1.2);
      g.combat.damageEnemy(e, (16 + rk * 6) * stacks, p, { stagger: 0.8, unblockable: true, color: '#6ae8ff' });
    }, i * 60));
    g.shake(0.35); g.fx.chroma(0.6);
  }
  // Full output: every bit of stored electricity leaves his body at once.
  fullDischarge() {
    const g = this.game, p = this.p, rk = this.rank('conduct');
    const R = 7.5;
    this.cast(0.5, true, { type: 'raise' });
    g.audio?.charge(0.3, 1.6);
    setTimeout(() => {
      const body = p.pos.clone().setY(p.pos.y + 1.2);
      g.fx.flash(0xc0f0ff, 0.35, 0.2); g.fx.chroma(0.8);
      g.fx.shockwave(p.pos, VOLT, R); g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: WHITE, r0: 0.5, r1: R, dur: 0.35, thick: 0.15 });
      g.lights.flash(body, VOLT, 18, R + 4, 0.3, { priority: 6 });
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; zap(g, body, body.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.8, (Math.random() - 0.5) * 1.5, Math.sin(a) * R * 0.8)), i % 2 ? VOLT : WHITE, 0.2, 4); }
      for (const e of g.combat.query(p.pos, tmp.set(0, 0, 1), R, Math.PI)) {
        const stacks = Math.round(e.kCharge ?? 0); e.kCharge = 0;
        zap(g, body, e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.3, 5);
        g.combat.damageEnemy(e, (26 + rk * 6) * (1 + stacks * 0.35) * (this.amberT > 0 ? 1.5 : 1), p, { stagger: 0.9, knock: tmp2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), color: '#6ae8ff' });
      }
      g.shake(0.45); g.hitStop(0.05);
      g.audio?.noise({ dur: 0.5, gain: 0.5, type: 'highpass', freq: 2000, sweep: 400, rev: 0.4 }); g.audio?.blackFlash();
    }, 260);
  }
  // In Mythical Beast Amber, Discharge becomes a beam of pure electricity.
  beam() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const dir = p.aimDir.clone().setY(0).normalize(); p.facing = Math.atan2(dir.x, dir.z);
    const from = p.pos.clone().setY(p.pos.y + 1.3).addScaledVector(dir, 0.6), L = 22, W = 1.1;
    g.fx.slashLine(from, dir, L, DEEP, W * 2.2, 0.3, 0); g.fx.slashLine(from, dir, L, VOLT, W * 1.3, 0.26, 0); g.fx.slashLine(from, dir, L, WHITE, W * 0.5, 0.2, 0);
    for (let s = 2; s < L; s += 3) zap(g, from.clone().addScaledVector(dir, s - 2), from.clone().addScaledVector(dir, s + 1), WHITE, 0.15, 3);
    g.lights.flash(from.clone().addScaledVector(dir, 4), VOLT, 16, 14, 0.2);
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, p.pos); const along = tmp.dot(dir);
      if (along < 0 || along > L || Math.abs(tmp.x * dir.z - tmp.z * dir.x) > W + e.radius) continue;
      g.combat.damageEnemy(e, 45, p, { stagger: 0.8, unblockable: true, knock: dir.clone().multiplyScalar(6), color: '#e8fbff' });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), dir, { color: VOLT, big: true });
    }
    for (let s = 1; s < L; s += 1.5) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y), dir, 1, Math.PI, 30, p);
    g.shake(0.3); g.audio?.energy('red');
  }
  // Ultimate: Mythical Beast Amber — Kashimo's one-time technique. His body is
  // rebuilt to turn every phenomenon of his electric cursed energy into
  // reality: a blinding electromagnetic burst, then a short reign of pure
  // lightning... and a body that breaks down when it ends.
  amber() {
    const g = this.game, p = this.p;
    if (this.amberT > 0 || this.burnT > 0) { g.toast?.('His body is still breaking down'); g.audio?.ui('back'); return false; }
    const rk = this.rank('amber');
    p.action = { type: 'sign', dur: 1.1, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes ?? 0, 1.6);
    g.slowMo(1.2, 0.2); g.fx.dimTarget = 0.65;
    g.toast?.('MYTHICAL BEAST AMBER', 'domain');
    g.audio?.charge(1.0, 1.2);
    // lightning gathers onto him from the sky
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      if (Math.random() < 0.5) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 4; zap(g, p.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 8, Math.sin(a) * r)), p.pos.clone().setY(p.pos.y + 1.2), Math.random() < 0.5 ? VOLT : WHITE, 0.25, 6); }
      return t < 0.9;
    });
    this.amberTimer = setTimeout(() => {
      this.amberTimer = null;
      if (p.action?.type === 'sign') p.action = null;
      g.fx.dimTarget = 0;
      this.amberT = 12 + rk * 2;
      this.boost = { as: 1.6, mm: 0.6, tm: 0.5 };
      p.stats.attackSpeed *= this.boost.as; p.stats.meleeMult += this.boost.mm; p.stats.techMult += this.boost.tm; this.speedMul = 1.6;
      // the transformation's electromagnetic burst
      const c = p.pos.clone(), R = 14;
      g.fx.flash(WHITE, 0.9, 0.5); g.fx.screenWave(c.clone().setY(c.y + 1), 2, 0.9); g.fx.chroma(2); g.fx.blackFlash(0.15);
      g.shake(1); g.hitStop(0.12);
      zap(g, c.clone().setY(c.y + 30), c.clone().setY(c.y + 0.2), WHITE, 1.2, 10);
      zap(g, c.clone().setY(c.y + 30), c.clone().setY(c.y + 0.2), VOLT, 0.7, 8);
      for (let i = 0; i < 4; i++) g.fx.rings.spawn(tmp.set(c.x, c.y + 0.1 + i * 0.5, c.z), { color: i % 2 ? WHITE : VOLT, r0: 0.5, r1: R * (0.5 + i * 0.17), dur: 0.5 + i * 0.12, thick: 0.15 });
      g.lights.flash(c.clone().setY(c.y + 3), VOLT, 40, R + 10, 0.7, { priority: 9 });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 3 + Math.random() * (R - 4); this.strike(c.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)), 0, 2); }
      for (const e of g.combat.query(c, tmp.set(0, 0, 1), R, Math.PI)) {
        zap(g, c.clone().setY(c.y + 1.2), e.pos.clone().setY(e.pos.y + e.height * 0.6), WHITE, 0.35, 6);
        g.combat.damageEnemy(e, 90 + rk * 20 + (e.isBoss ? e.maxHp * 0.06 : 0), p, { stagger: 1.2, unblockable: true, knock: tmp2.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(12), color: '#e8fbff' });
        this.charge(e, 3);
      }
      g.audio?.blackFlash(); g.audio?.energy('explode');
    }, 1000);
  }
  endAmber() {
    const g = this.game, p = this.p;
    p.stats.attackSpeed /= this.boost.as; p.stats.meleeMult -= this.boost.mm; p.stats.techMult -= this.boost.tm; this.speedMul = 1;
    // the transformation destroys the body that hosts it
    this.burnT = 4; this.burnLeft = p.hp * (0.7 - this.rank('amber') * 0.1);
    p.slowT = 6;
    g.toast?.('Mythical Beast Amber fades — his body breaks down (no techniques for 4s)', 'big');
    g.fx.flash(0x101820, 0.5, 0.35);
    g.audio?.hurt();
  }
  // a breaking-down body cannot channel techniques
  canCast(s) { if (this.burnT > 0 && s !== this.ultimate) return false; return super.canCast(s); }
  tick(dt) {
    const g = this.game, p = this.p;
    const mat = p.rig.material.userData;
    if (this.amberT > 0) {
      this.amberT -= dt;
      mat.emitMask.value = 2.2 + Math.random() * 0.8;
      p.rig.setGlow?.(Math.random() < 0.2 ? 0x8ae8ff : 0x2a6a8a);
      p.heroLight.color.setHex(VOLT); p.heroLight.intensity = 3.5 + Math.random() * 2;
      for (let i = 0; i < 3; i++) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.9, p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.25, 0.8, 2.6, 3.2, 0.08, 0, 2, 0.1, 3);
      // arcs leap from his body to nearby curses on their own
      this.arcT -= dt;
      if (this.arcT <= 0) {
        this.arcT = 0.4;
        const e = g.nearestEnemy(p.pos, 8);
        const body = p.pos.clone().setY(p.pos.y + 1.2);
        if (e) { zap(g, body, e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.2, 4); g.combat.damageEnemy(e, 8, p, { stagger: 0.2, ceGain: 0 }); }
        else zap(g, body, body.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random(), (Math.random() - 0.5) * 3)), WHITE, 0.12, 3);
      }
      if (this.amberT <= 0) this.endAmber();
    } else if (this.burnT > 0) {
      this.burnT -= dt;
      const loss = Math.min(this.burnLeft * dt / 4, Math.max(0, p.hp - 1));
      p.hp -= loss;
      if (Math.random() < 0.4) g.particles.smoke.emit(p.pos.x + (Math.random() - 0.5) * 0.6, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.6, 0, 1, 0, 0.8, 0.12, 0.12, 0.14, 0.25, -0.5, 1, 2, 0);
      if (Math.random() < 0.15) zap(g, p.pos.clone().setY(p.pos.y + 1), p.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2)), 0x3a6a8a, 0.1, 2);
      if (Math.random() < dt * 3) g.fx.damageNumber(p.pos, loss, { color: '#7ab0c8', text: '⚡ breakdown' });
      mat.emitMask.value = 0.4; p.rig.setGlow?.(0x000000); p.heroLight.color.setHex(0xffe8d0); p.heroLight.intensity = 1.6;
    }
    // planted staff: a lightning rod
    const rod = this.rod;
    if (rod) {
      rod.t -= dt; rod.tick -= dt;
      if (rod.tick <= 0) {
        rod.tick = 0.4;
        for (const e of g.enemies) if (!e.dead && !e.isDummy && e.pos.distanceTo(rod.grp.position) < 5.5) {
          zap(g, rod.top, e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.2, 4);
          g.combat.damageEnemy(e, 8, p, { stagger: 0.25, ceGain: 1 });
          this.charge(e, 1);
        }
        if (Math.random() < 0.5) zap(g, rod.top, rod.top.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2)), WHITE, 0.1, 3);
      }
      if (rod.t <= 0) this.removeRod();
    }
    // charged curses crackle
    if (Math.random() < 0.35) for (const e of g.enemies) if (!e.dead && e.kCharge > 0 && Math.random() < 0.35) g.particles.glow.emit(e.pos.x + (Math.random() - 0.5) * 0.8, e.pos.y + Math.random() * e.height, e.pos.z + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, 0.2, 0.8, 2.4, 3, 0.05 + e.kCharge * 0.015, 0, 2, 0.2, 3);
  }
  dispose() { super.dispose(); this.removeRod(); if (this.amberTimer) { clearTimeout(this.amberTimer); this.amberTimer = null; } this.game.fx.dimTarget = 0; this.amberT = 0; this.burnT = 0; this.speedMul = 1; }
}
registerKit('kashimo', KashimoKit, KASHIMO_SKILLS);
