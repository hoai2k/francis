// Choso-style kit — Blood Manipulation.
//   LMB  blood-coated martial arts combo.
//   RMB  Piercing Blood: compressed blood fired as a near-instant beam that
//        pierces every curse (and crate) in a line.
//   1    Convergence: compress blood between the palms — the next few Piercing
//        Bloods become huge, wall-cutting beams.
//   2    Flowing Red Scale: blood pressure and temperature surge — faster,
//        stronger, tougher, with glowing veins.
//   3    Supernova: blood orbs gather around Choso, fly at curses and burst in
//        sprays of piercing blood.
//   F    Domain (invented — Choso has no canon domain): Crimson Womb: Blood
//        Rain — a blood-red sky rains piercing needles on every curse inside
//        while supernovae burst among them and Choso's blood replenishes.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const BLOOD = 0xd0102a, DARK = 0x5a0410, CORE = 0xffb0b8;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('choso', {
  name: 'Choso', technique: 'Blood Manipulation', rarity: 'epic', title: 'Eldest Brother', color: '#d0102a',
  desc: 'Piercing Blood beams, Convergence-charged shots, Flowing Red Scale and exploding Supernova orbs; his Blood Rain domain is invented, as Choso has none in canon.',
  domain: 'Crimson Womb: Blood Rain',
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

registerDomainEnv('blood_rain', {
  skyTop: 0x0c0002, skyHorizon: 0x6a0410, fog: 0x2a0206, fogDensity: 0.02, hemiSky: 0xff4a5a, hemiGround: 0x100002, hemiI: 0.7, sun: 0xff3a4a, sunI: 0.9,
  grade: { tint: [1.12, 0.9, 0.9], lift: [0.02, 0.0, 0.0], sat: 1.15, contrast: 1.18, vignette: 0.55 }, floor: B.blood_brick,
});

export const CHOSO_SKILLS = [
  { id: 'piercing', name: 'Piercing Blood', desc: 'Longer, stronger beams.', max: 3 },
  { id: 'convergence', name: 'Convergence', desc: '+1 empowered shot per Convergence and bigger beams.', max: 2, req: 'piercing' },
  { id: 'scale', name: 'Flowing Red Scale', desc: 'Red Scale lasts 2s longer and boosts more.', max: 3 },
  { id: 'nova', name: 'Supernova', desc: 'More orbs and bigger bursts.', max: 2 },
  { id: 'brawl', name: 'Blood Fists', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'womb', name: 'Death Painting', desc: '+15 max HP per rank; the domain heals more.', max: 2 },
];

class ChosoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.5, arc: 1.1, lunge: 7, knock: 3, stop: 0.045, shake: 0.14, trail: BLOOD, sparkColor: 0xff5a6a, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 13, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.16, trail: BLOOD, sparkColor: 0xff5a6a, chainAt: 0.55 },
      { style: 'uppercut', dur: 0.38, windup: 0.3, strike: 0.5, dmg: 16, range: 2.6, arc: 1.0, lunge: 5, knock: 5, stop: 0.065, shake: 0.22, trail: BLOOD, launch: true, chainAt: 0.6 },
      { style: 'slam', dur: 0.56, windup: 0.42, strike: 0.6, dmg: 27, range: 3.3, arc: Math.PI, lunge: 4, knock: 11, stop: 0.09, shake: 0.42, ring: true, ringColor: BLOOD, stagger: 0.55, trail: BLOOD },
    ];
    this.p.stats.meleeMult += r('brawl') * 0.08;
    this.p.maxHp += r('womb') * 15; this.p.hp = Math.min(this.p.hp + r('womb') * 15, this.p.maxHp);
    this.slots = {
      ranged: this.ability({ name: 'Piercing Blood', icon: '🩸', cd: 1.1, ce: 0, use: () => this.piercing() }),
      t1: this.ability({ name: 'Convergence', icon: '🔴', cd: 10, ce: 12, use: () => this.convergence() }),
      t2: this.ability({ name: 'Red Scale', icon: '♨️', cd: 16, ce: 18, use: () => this.redScale() }),
      t3: this.ability({ name: 'Supernova', icon: '💥', cd: 14, ce: 30, use: () => this.supernova() }),
    };
    this.conv = 0; this.scaleT = 0;
    this.domain = {
      name: 'Crimson Womb: Blood Rain', icon: '🩸', key: 'blood_rain', type: 2, color: BLOOD, sound: 'shrine', flash: 0xff2030,
      duration: 8, radius: 24,
      onStart: (g, d) => { d.needle = 0; d.nova = 1; },
      onTick: (g, d, dt) => {
        // blood rain
        for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.glow.emit(d.center.x + Math.cos(a) * rr, d.center.y + 7 + Math.random() * 3, d.center.z + Math.sin(a) * rr, 0, -14, 0, 0.7, 1.6, 0.05, 0.1, 0.06, 6, 0, 1, 3); }
        this.p.heal(this.p.maxHp * (0.012 + r('womb') * 0.006) * dt, true);
        const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
        if (!list.length) return;
        d.needle -= dt; d.nova -= dt;
        if (d.needle <= 0) {
          d.needle = 0.25;
          for (let i = 0; i < Math.min(3, list.length); i++) {
            const e = list[Math.floor(Math.random() * list.length)];
            const at = e.pos.clone().setY(e.pos.y + e.height + 5);
            g.fx.slashLine(at, new THREE.Vector3((Math.random() - 0.5) * 0.3, -1, (Math.random() - 0.5) * 0.3).normalize(), 5.5, BLOOD, 0.22, 0.18);
            g.combat.damageEnemy(e, 8, this.p, { stagger: 0.12, ceGain: 0, unblockable: true });
            g.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOD);
          }
        }
        if (d.nova <= 0) { d.nova = 1.5; const e = list[Math.floor(Math.random() * list.length)]; this.burst(e.pos.clone().setY(e.pos.y + 0.8), 2.6, 30); }
      },
    };
  }
  onMeleeHit(e, step) {
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
    this.game.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOD);
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
  // ------------------------------------------------------------ Supernova
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
  supernova() {
    const g = this.game, p = this.p, rk = this.rank('nova');
    const n = 6 + rk * 2, R = 2.4 + rk * 0.5, dmg = 34 + rk * 10;
    this.cast(0.6, true, { type: 'raise' });
    g.audio?.charge(0.6, 0.8);
    const orbs = [];
    for (let i = 0; i < n; i++) {
      const pr = g.projectiles.fire({ pos: p.pos.clone().setY(p.pos.y + 1.4), vel: new THREE.Vector3(), team: 'player', shape: 'orb', color: BLOOD, emissive: 2.5, scale: 1.7, radius: 0.55, life: 3, ghost: true, light: i % 3 === 0 ? 4 : 0,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: BLOOD, speed: 0.5, life: 0.3, size: 0.25, sizeEnd: 0.05 }); },
        onExpire: (q) => this.burst(q.pos.clone(), R, dmg) });
      if (pr) orbs.push(pr);
    }
    if (!orbs.length) return false;
    let t = 0, launched = false;
    g.addUpdater((dt) => {
      t += dt;
      if (!launched) {
        orbs.forEach((q, i) => {
          const a = i / orbs.length * Math.PI * 2 + t * 5, rr = 1.2 + t * 1.2;
          q.pos.set(p.pos.x + Math.cos(a) * rr, p.pos.y + 1.4 + Math.sin(t * 8 + i) * 0.2, p.pos.z + Math.sin(a) * rr);
          q.t = 0;
        });
        if (t < 0.6) return true;
        launched = true;
        const foes = g.enemies.filter((e) => !e.dead && !e.isDummy && (e.pos.distanceTo(p.pos) < 16 || (g.domainSys?.sureHit(p) && g.domainSys.inside(e.pos))));
        orbs.forEach((q, i) => {
          const e = foes.length ? foes[i % foes.length] : null;
          const dir = e ? tmp.subVectors(e.pos, q.pos).setY(e.pos.y + e.height * 0.5 - q.pos.y) : tmp.subVectors(q.pos, p.pos).setY(0);
          q.vel.copy(dir.normalize().multiplyScalar(16)); q.life = 0.9; q.t = 0;
          if (e) { q.homing = 10; q.target = e; }
        });
        g.audio?.whoosh(1.3);
        return false;
      }
      return false;
    });
  }
  dispose() { super.dispose(); this.scaleT = 0; this.speedMul = 1; }
}
registerKit('choso', ChosoKit, CHOSO_SKILLS);
