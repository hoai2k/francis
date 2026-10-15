// Choso kit — Blood Manipulation.
//   LMB  blood-coated martial arts; the finisher is Blood Edge, a blade of
//        hardened blood along the forearm.
//   RMB  Piercing Blood: compressed blood fired as a near-instant beam that
//        pierces every curse (and crate) in a line.
//   1    Convergence: compress blood between the palms — the next few Piercing
//        Bloods become huge, wall-cutting beams.
//   2    Flowing Red Scale: blood pressure and temperature surge — faster,
//        stronger, tougher, with glowing veins.
//   3    Slicing Exorcism: two spinning discs of blood fly out and back.
//   F    Ultimate (Choso has no canon domain): Supernova — a ring of
//        compressed blood orbs swells around him and bursts one after another,
//        spraying Piercing Blood in every direction.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const BLOOD = 0xd0102a, DARK = 0x5a0410, CORE = 0xffb0b8;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('choso', {
  name: 'Choso', technique: 'Blood Manipulation', rarity: 'epic', title: 'Eldest Brother', color: '#d0102a',
  desc: 'Blood Manipulation: Convergence-charged Piercing Blood, Flowing Red Scale, Blood Edge and Slicing Exorcism — and Supernova, a storm of bursting blood orbs, as his ultimate.',
  ultimate: 'Supernova',
});

registerLook('choso', {
  paint: { skinTone: 0xecc8ae, hair: 0x141216, hairVolume: true, top: 0xe6ded0, kimono: true, sash: 0x3a2048, sleeve: 0xe6ded0, pants: 0x2e2238, shoes: 0x141014, eye: 0x3a1a10, fringe: 2, hairSide: 3, hairBack: 5 },
  hair: (m) => [
    { x: -2.6, y: 8, z: -0.5, w: 2.5, h: 4, d: 2.5, rx: -0.2, rz: 0.6, material: m },   // two spiky tufts
    { x: 2.6, y: 8, z: -0.5, w: 2.5, h: 4, d: 2.5, rx: -0.2, rz: -0.6, material: m },
    { x: 0, y: 8, z: 1.5, w: 5, h: 1.5, d: 3, rx: 0.4, material: m },
  ],
  hairColor: 0x141216, accent: BLOOD, emit: 0.3, cape: null,
  paintExtra(S) {
    // the dark band of blood across the bridge of the nose
    for (let x = 8; x < 16; x++) S.px(x, 13, 0x2a0a10);
    S.px(9, 11, 0x141216); S.px(14, 11, 0x141216);
  },
  props(rig, K) {
    const blood = K.mat(BLOOD, { emissive: 1.2, roughness: 0.2 });
    K.box(rig.handR, 1.4, 1.4, 1.4, blood, 0, -1.5, 1.6);
    K.box(rig.handL, 1.4, 1.4, 1.4, blood, 0, -1.5, 1.6);
  },
});

export const CHOSO_SKILLS = [
  { id: 'piercing', name: 'Piercing Blood', desc: 'Longer, stronger beams and Slicing Exorcism discs.', max: 3 },
  { id: 'convergence', name: 'Convergence', desc: '+1 empowered shot per Convergence and bigger beams.', max: 2, req: 'piercing' },
  { id: 'scale', name: 'Flowing Red Scale', desc: 'Red Scale lasts 2s longer and boosts more.', max: 3 },
  { id: 'nova', name: 'Supernova', desc: 'More orbs and bigger bursts in your ultimate.', max: 2 },
  { id: 'brawl', name: 'Blood Fists', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'womb', name: 'Death Painting', desc: '+15 max HP per rank (a Death Painting\'s body is hard to kill).', max: 2 },
];

class ChosoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.5, arc: 1.1, lunge: 7, knock: 3, stop: 0.045, shake: 0.14, trail: BLOOD, sparkColor: 0xff5a6a, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 13, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.16, trail: BLOOD, sparkColor: 0xff5a6a, chainAt: 0.55 },
      { style: 'uppercut', dur: 0.38, windup: 0.3, strike: 0.5, dmg: 16, range: 2.6, arc: 1.0, lunge: 5, knock: 5, stop: 0.065, shake: 0.22, trail: BLOOD, launch: true, chainAt: 0.6 },
      { style: 'swingR', dur: 0.5, windup: 0.4, strike: 0.6, dmg: 27, range: 3.4, arc: 1.6, lunge: 6, knock: 9, stop: 0.09, shake: 0.38, stagger: 0.55, trail: BLOOD, edge: true },   // Blood Edge
    ];
    this.p.stats.meleeMult += r('brawl') * 0.08;
    this.p.maxHp += r('womb') * 15; this.p.hp = Math.min(this.p.hp + r('womb') * 15, this.p.maxHp);
    this.slots = {
      ranged: this.ability({ name: 'Piercing Blood', icon: '🩸', cd: 1.1, ce: 0, use: () => this.piercing() }),
      t1: this.ability({ name: 'Convergence', icon: '🔴', cd: 10, ce: 12, use: () => this.convergence() }),
      t2: this.ability({ name: 'Red Scale', icon: '♨️', cd: 16, ce: 18, use: () => this.redScale() }),
      t3: this.ability({ name: 'Slicing Exorcism', icon: '⭕', cd: 9, ce: 18, use: () => this.slicing() }),
    };
    this.conv = 0; this.scaleT = 0;
    this.ultimate = { name: 'Supernova', icon: '💥', use: () => this.supernova() };
  }
  onMeleeHit(e, step) {
    const g = this.game;
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
    g.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOD);
    if (step.edge) g.fx.slashLine(e.pos.clone().add(new THREE.Vector3(-1.1, e.height * 0.9, 0)), new THREE.Vector3(1, -0.6, Math.random() - 0.5).normalize(), 2.6, BLOOD, 0.35, 0.2, Math.random());
  }
  onIncoming(amount) { return this.scaleT > 0 ? amount * (0.75 - this.rank('scale') * 0.04) : amount; }
  // ------------------------------------------------------------ Piercing Blood
  piercing() {
    const g = this.game, p = this.p;
    const big = this.conv > 0, rk = this.rank('piercing'), cv = this.rank('convergence');
    if (big) this.conv--;
    this.cast(big ? 0.4 : 0.28, true);
    let dir = p.aimDir.clone();
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    if (sure) dir = tmp2.subVectors(sure.pos, p.pos).setY(0).normalize().clone();
    p.facing = Math.atan2(dir.x, dir.z);
    const L = (big ? 26 : 15) + rk * 2, W = big ? 1.1 + cv * 0.25 : 0.5, dmg = (big ? 55 + cv * 15 : 15) + rk * 5;
    const from = p.pos.clone().setY(p.pos.y + 1.3).addScaledVector(dir, 0.7);
    // the beam: a dark wake, a red body and a pale compressed core
    g.fx.slashLine(from, dir, L, DARK, W * 2.2, 0.35, 0);
    g.fx.slashLine(from, dir, L, BLOOD, W * 1.4, 0.3, 0);
    g.fx.slashLine(from, dir, L, CORE, W * 0.5, 0.22, 0);
    g.fx.slashLine(from, dir, L, BLOOD, W * 1.2, 0.3, Math.PI / 2);
    for (let s = 0.5; s < L; s += big ? 0.7 : 1.1) g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: big ? 3 : 1, color: BLOOD, speed: big ? 3 : 1.2, life: 0.35, size: big ? 0.2 : 0.1, shape: 1, intensity: 2 });
    g.fx.rings.spawn(from, { color: BLOOD, r0: 0.2, r1: big ? 2 : 0.9, dur: 0.2, thick: 0.3, tilt: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir) });
    g.lights.flash(from.clone().addScaledVector(dir, 3), BLOOD, big ? 14 : 5, big ? 14 : 7, 0.2);
    let hit = 0;
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, p.pos); const along = tmp.dot(dir);
      if (along < 0 || along > L) continue;
      if (Math.abs(tmp.x * dir.z - tmp.z * dir.x) > W + e.radius) continue;
      g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().multiplyScalar(big ? 7 : 2), stagger: big ? 0.8 : 0.3, unblockable: big });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), dir, { color: BLOOD, big });
      hit++;
    }
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y), dir, big ? 1.4 : 0.6, Math.PI, big ? 40 : 14, p);
    if (big) { g.shake(0.45); g.hitStop(0.05); g.fx.screenWave(from, 0.6, 0.3); g.audio?.energy('red'); }
    else { if (hit) g.shake(0.1); g.audio?.energy('slash'); }
    g.audio?.tone({ freq: big ? 300 : 900, to: big ? 80 : 300, dur: 0.18, gain: 0.1, type: 'sawtooth', filter: 2500 });
  }
  convergence() {
    const g = this.game, p = this.p;
    this.cast(0.55, true, { lock: true });
    g.audio?.charge(0.5, 0.9);
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      const h = this.handPos();
      for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, rr = 1.2 + Math.random(); g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.5) * 1.2, h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 4, 0, -Math.sin(a) * rr * 4, 0.25, 2.2, 0.08, 0.15, 0.12, 0, 0, 0.3, 1); }
      if (t < 0.5) return true;
      this.conv = 3 + this.rank('convergence');
      g.particles.burst(h, { count: 20, color: BLOOD, speed: 6, life: 0.4, size: 0.12, shape: 1 });
      g.fx.flash(0x400008, 0.18, 0.15);
      g.toast?.(`Convergence ×${this.conv}`);
      g.audio?.impact(0.8);
      return false;
    });
  }
  redScale() {
    const g = this.game, p = this.p, rk = this.rank('scale');
    const fresh = this.scaleT <= 0;
    this.scaleT = 8 + rk * 2;
    if (fresh) { this.boost = { as: 1.3 + rk * 0.05, mm: 0.25 + rk * 0.05 }; p.stats.attackSpeed *= this.boost.as; p.stats.meleeMult += this.boost.mm; this.speedMul = 1.3; }
    this.cast(0.4, true, { type: 'raise' });
    g.toast?.('Flowing Red Scale');
    g.fx.flash(0x500010, 0.25, 0.2);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: BLOOD, r0: 0.4, r1: 3.5, dur: 0.45, thick: 0.15 });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 30, color: BLOOD, speed: 5, up: 1.5, life: 0.6, size: 0.12, shape: 1 });
    g.audio?.energy('fire');
  }
  tick(dt) {
    const g = this.game, p = this.p;
    if (this.scaleT > 0) {
      this.scaleT -= dt;
      p.rig.material.userData.emitMask.value = 0.9 + Math.sin(g.time * 9) * 0.3;   // pulsing veins
      p.rig.setGlow?.(0x3a0006);
      if (Math.random() < 0.6) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.7, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.7, 0, 1.4, 0, 0.5, 2.2, 0.1, 0.15, 0.12, -1, 1, 0.1, 0);
      if (this.scaleT <= 0) {
        p.stats.attackSpeed /= this.boost.as; p.stats.meleeMult -= this.boost.mm; this.speedMul = 1;
        p.rig.material.userData.emitMask.value = 0.3; p.rig.setGlow?.(0x000000);
      }
    }
    if (this.conv > 0 && Math.random() < 0.5) { const h = this.handPos(); g.particles.glow.emit(h.x, h.y, h.z, (Math.random() - 0.5), 0.5, (Math.random() - 0.5), 0.3, 2.4, 0.1, 0.2, 0.08 + this.conv * 0.03, 0, 1, 0.3, 0); }
  }
  // ------------------------------------------------------------ Slicing Exorcism
  // Two spinning discs of blood fly out in arcs and come back to Choso.
  slicing() {
    const g = this.game, p = this.p, rk = this.rank('piercing');
    this.cast(0.4, true);
    const face = Math.atan2(p.aimDir.x, p.aimDir.z);
    p.facing = face;
    const geo = new THREE.TorusGeometry(0.55, 0.07, 4, 24);
    const mat = new THREE.MeshBasicNodeMaterial({ color: BLOOD, fog: false });
    const core = new THREE.MeshBasicNodeMaterial({ color: CORE, fog: false });
    const discs = [-1, 1].map((side) => {
      const d = new THREE.Group();
      const ring = new THREE.Mesh(geo, mat); ring.rotation.x = Math.PI / 2; d.add(ring);
      const inner = new THREE.Mesh(geo, core); inner.rotation.x = Math.PI / 2; inner.scale.setScalar(0.6); d.add(inner);
      g.scene.add(d);
      return { d, side, hit: new Map() };
    });
    const L = 9 + rk, dmg = 18 + rk * 5, T = 1.1;
    const origin = p.pos.clone();
    let t = 0;
    g.audio?.whoosh(1.2);
    g.addUpdater((dt) => {
      t += dt;
      const k = Math.min(1, t / T);
      const out = Math.sin(k * Math.PI);                     // out and back
      for (const D of discs) {
        const a = face + D.side * (0.9 - k * 1.8) * 0.6;     // sweep across the front
        const base = tmp2.copy(origin).lerp(p.pos, k);
        D.d.position.set(base.x + Math.sin(a) * L * out, p.pos.y + 1.1, base.z + Math.cos(a) * L * out);
        D.d.rotation.y += dt * 30;
        if (Math.random() < 0.6) g.particles.burst(D.d.position, { count: 1, color: BLOOD, speed: 0.6, life: 0.3, size: 0.12, shape: 1 });
        for (const e of g.combat.query(D.d.position, tmp.set(0, 0, 1), 0.9, Math.PI)) {
          if (g.time - (D.hit.get(e) ?? -9) < 0.35) continue;
          D.hit.set(e, g.time);
          g.combat.damageEnemy(e, dmg, p, { stagger: 0.4, unblockable: true, knock: tmp2.subVectors(e.pos, D.d.position).setY(0).normalize().multiplyScalar(3) });
          g.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOD);
          g.audio?.energy('slash');
        }
      }
      if (k < 1) return true;
      for (const D of discs) g.scene.remove(D.d);
      geo.dispose(); mat.dispose(); core.dispose();
      return false;
    });
  }
  // ------------------------------------------------------------ Ultimate: Supernova
  burst(at, R, dmg) {
    const g = this.game, p = this.p;
    g.fx.explosion(at, BLOOD, R);
    g.combat.aoe(at, R, dmg, p, { knock: 6, stagger: 0.6 });
    // shrapnel of piercing blood in every direction
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.random() * 0.3, d = new THREE.Vector3(Math.cos(a), (Math.random() - 0.3) * 0.4, Math.sin(a)).normalize();
      g.fx.slashLine(at, d, R * 1.8, i % 2 ? BLOOD : CORE, 0.18, 0.25);
      for (const e of g.combat.query(at, d, R * 1.8, 0.2)) g.combat.damageEnemy(e, dmg * 0.25, p, { stagger: 0.2, ceGain: 0 });
    }
    g.audio?.energy('explode');
  }
  // Blood compressed into orbs all around Choso, which then burst, spraying
  // Piercing Blood in every direction.
  supernova() {
    const g = this.game, p = this.p, rk = this.rank('nova');
    const n = 16 + rk * 4, R = 3.2 + rk * 0.5, dmg = 55 + rk * 15;
    p.action = { type: 'sign', dur: 1.2, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes ?? 0, 1.6);
    g.slowMo(1.1, 0.25); g.fx.dimTarget = 0.55;
    g.toast?.('SUPERNOVA', 'domain');
    g.audio?.charge(1.1, 0.7);
    g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), BLOOD, 10, 12, 1.2, { priority: 7 });
    const foes = g.enemies.filter((e) => !e.dead && !e.isDummy && e.pos.distanceTo(p.pos) < 18);
    const orbs = [];
    for (let i = 0; i < n; i++) {
      const pr = g.projectiles.fire({ pos: p.pos.clone().setY(p.pos.y + 1.4), vel: new THREE.Vector3(), team: 'player', shape: 'orb', color: BLOOD, emissive: 3, scale: 2, radius: 0.6, life: 99, ghost: true, light: i % 4 === 0 ? 5 : 0,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: BLOOD, speed: 0.5, life: 0.3, size: 0.3, sizeEnd: 0.05 }); },
        onExpire: (q) => this.burst(q.pos.clone(), R, dmg) });
      if (pr) orbs.push({ q: pr, a: i / n * Math.PI * 2, h: 0.6 + (i % 3) * 0.9, target: foes.length && i % 2 === 0 ? foes[(i / 2) % foes.length | 0] : null });
    }
    if (!orbs.length) { if (p.action?.type === 'sign') p.action = null; g.fx.dimTarget = 0; return false; }
    let t = 0, popped = 0;
    const center = p.pos.clone();
    g.addUpdater((dt) => {
      t += dt;
      // compress: orbs gather and swell around Choso, then fan out toward curses
      const spread = t < 0.7 ? 1.5 : 1.5 + (t - 0.7) * 9;
      orbs.forEach((o) => {
        if (o.done) return;
        const ring = tmp.set(center.x + Math.cos(o.a + t * 2.5) * Math.min(spread, 7), center.y + o.h + Math.sin(t * 6 + o.a) * 0.15, center.z + Math.sin(o.a + t * 2.5) * Math.min(spread, 7));
        if (o.target && !o.target.dead && t > 0.7) ring.lerp(tmp2.copy(o.target.pos).setY(o.target.pos.y + o.target.height * 0.5), Math.min(1, (t - 0.7) * 2.2));
        o.q.pos.copy(ring); o.q.t = 0;
      });
      if (t > 0.7 && p.action?.type === 'sign') { p.action = null; g.fx.dimTarget = 0; }
      if (t < 1.25) return true;
      // detonate one after another
      const due = Math.min(orbs.length, Math.floor((t - 1.25) / 0.04) + 1);
      for (; popped < due; popped++) { const o = orbs[popped]; o.done = true; o.q.life = 0; }
      if (popped === 1) { g.fx.flash(0xff2030, 0.5, 0.3); g.fx.screenWave(center.clone().setY(center.y + 1), 1.6, 0.8); g.fx.chroma(1.4); }
      g.shake(0.25);
      if (popped < orbs.length) return true;
      g.shake(0.9); g.hitStop(0.1);
      g.fx.darkRings.spawn(tmp.set(center.x, center.y + 0.07, center.z), { color: 0x000000, r0: 0.5, r1: 9, dur: 0.7, thick: 0.5 });
      return false;
    });
  }
  dispose() { super.dispose(); this.scaleT = 0; this.speedMul = 1; }
}
registerKit('choso', ChosoKit, CHOSO_SKILLS);
