// Mai Zenin-style kit — Construction (and a revolver).
//   LMB  pistol-whip and kick combo.
//   RMB  Revolver: six shots, reloading one round at a time.
//   1    Ricochet: a trick shot that bounces from curse to curse.
//   2    Smoke Cover: a smoke bomb and a back-step; inside the smoke she is
//        hard to hit and every shot is a critical.
//   3    Fan the Hammer: she empties whatever is left in the cylinder in one
//        rapid volley.
//   F    Ultimate — Construction: Special Bullet. Mai has no Domain Expansion;
//        her Construction can build only one bullet at a time and it takes a
//        toll on her body (it costs HP). Fired when the opponent thinks she is
//        out of rounds (empty revolver) it becomes the canon "seventh bullet"
//        and hits even harder.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const BRASS = 0xffd27a, SMOKE = 0x9a9aa4, CONSTRUCT = 0x9ae8ff;
const tmp = new THREE.Vector3();

registerSorcerer('mai', {
  name: 'Mai', technique: 'Construction', rarity: 'common', title: 'Zenin Clan', color: '#d8c08a', ultimate: 'Construction: Special Bullet',
  desc: 'A six-shot revolver, ricochet trick shots and smoke cover — plus Construction: one bullet built from her own body that ends fights.',
});

registerLook('mai', {
  paint: { skinTone: 0xf2d2bc, hair: 0x16181e, hairVolume: true, bob: true, top: 0x1b2030, collar: 0x151822, pants: 0x1b2030, skirt: 0x1b2030, shoes: 0x101010, eye: 0x3a2a20, fringe: 3, hairSide: 6, hairBack: 6 },
  hair: (m) => [
    { x: 2.5, y: 7.5, z: 3.6, w: 4, h: 4, d: 1.5, rx: 0.15, rz: -0.25, material: m },   // swept fringe over one eye
    { x: -3.6, y: 3, z: 0.5, w: 1.5, h: 3, d: 5, hang: true, material: m, stiff: 45 },
    { x: 3.6, y: 3, z: 0.5, w: 1.5, h: 4, d: 5, hang: true, material: m, stiff: 45 },
    { x: 0, y: 3, z: -3.6, w: 7, h: 3, d: 1.5, hang: true, material: m, stiff: 45 },
  ],
  hairColor: 0x16181e, accent: BRASS,
  cape: null,
  paintExtra(S) {
    // long uniform skirt down to the ankles
    for (const [u, v] of [[0, 16], [16, 48]]) S.rect(u, v + 4, 16, 9, 0x1b2030, 0.06);
    S.rect(20, 29, 8, 1, 0x3a2a1a, 0.05);   // belt with a holster strap
    S.px(26, 29, BRASS);
  },
  props(rig, K) {
    const gun = new THREE.Group();
    const steel = K.mat(0x2a2c32, { metalness: 0.9, roughness: 0.3 }), grip = K.mat(0x5a3a22, { roughness: 0.7 });
    K.box(gun, 1.2, 2.2, 1.4, grip, 0, -1.2, 0.8, 0.3);      // grip
    K.box(gun, 1.7, 1.7, 1.7, steel, 0, -2.8, 0);           // cylinder
    K.box(gun, 0.9, 4.6, 0.9, steel, 0, -5.6, 0);           // barrel (points along the arm)
    K.box(gun, 0.4, 0.6, 0.4, steel, 0, -7.6, -0.6);        // front sight
    rig.handR.add(gun); rig.extras.weapon = gun;
  },
});

export const MAI_SKILLS = [
  { id: 'caliber', name: 'Heavy Caliber', desc: 'Revolver rounds deal more damage.', max: 3 },
  { id: 'quickdraw', name: 'Quick Reload', desc: 'Rounds reload faster.', max: 3 },
  { id: 'ricochet', name: 'Ricochet', desc: 'Trick shots bounce more; regular shots gain a bounce at rank 2.', max: 3 },
  { id: 'smoke', name: 'Smoke Screen', desc: 'Bigger, longer-lasting smoke.', max: 2 },
  { id: 'construct', name: 'Construction', desc: 'The Special Bullet (ultimate) hits harder and its blast grows.', max: 3, req: 'caliber' },
  { id: 'zenin', name: 'Zenin Training', desc: '+10% melee damage per rank.', max: 2 },
];

class MaiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 10, range: 2.5, arc: 1.1, lunge: 6, knock: 3, stop: 0.04, shake: 0.12, trail: BRASS, sparkColor: BRASS },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 10, range: 2.5, arc: 1.1, lunge: 6, knock: 3, stop: 0.04, shake: 0.12, trail: BRASS },
      { style: 'spin', dur: 0.42, windup: 0.3, strike: 0.55, dmg: 17, range: 2.8, arc: Math.PI, lunge: 3, knock: 8, stop: 0.07, shake: 0.25, ring: true, ringColor: BRASS, trail: 0xdddddd },
    ];
    this.p.stats.meleeMult += r('zenin') * 0.1;
    this.slots = {
      ranged: this.ability({ name: 'Revolver', icon: '🔫', cd: 0.75 - r('quickdraw') * 0.12, ce: 0, use: () => this.shoot(), maxCharges: 6, chargesLeft: 6, gateTime: 0.2 }),
      t1: this.ability({ name: 'Ricochet', icon: '↯', cd: 4.5, ce: 8, use: () => this.trickShot() }),
      t2: this.ability({ name: 'Smoke Cover', icon: '💨', cd: 12, ce: 12, use: () => this.smoke() }),
      t3: this.ability({ name: 'Fan the Hammer', icon: '💥', cd: 10, ce: 16, use: () => this.fanHammer() }),
    };
    this.ultimate = { name: 'Construction: Special Bullet', icon: '🔹', use: () => this.special() };
    this.smokeT = 0; this.smokeAt = new THREE.Vector3(); this.smokeR = 0;
  }
  inSmoke(pos = this.p.pos) { return this.smokeT > 0 && Math.hypot(pos.x - this.smokeAt.x, pos.z - this.smokeAt.z) < this.smokeR; }
  onIncoming(amount) { return this.inSmoke() ? amount * 0.4 : amount; }
  muzzle(from, dir) {
    const g = this.game;
    g.particles.burst(from, { count: 8, color: BRASS, speed: 6, dir: dir.clone().multiplyScalar(1.2), spread: 0.4, life: 0.12, size: 0.12, shape: 1, intensity: 4 });
    g.particles.burst(from, { count: 1, color: 0xfff0c0, speed: 0, life: 0.06, size: 0.9, sizeEnd: 0.3, intensity: 3 });
    g.lights.flash(from, BRASS, 6, 5, 0.08);
  }
  bullet(from, dir, dmg, { bounces = 0, target = null, hitSet = null, color = BRASS } = {}) {
    const g = this.game, p = this.p;
    const homing = target || (g.domainSys?.sureHit(p) ? g.nearestEnemy(p.aimPoint, 30) : null);
    const hit = hitSet ?? new Set();
    return g.projectiles.fire({ pos: from, vel: dir.clone().multiplyScalar(55), team: 'player', dmg, shape: 'nail', color, emissive: 4, scale: 1.3, life: 0.5, radius: 0.3,
      homing: homing ? 25 : 0, target: homing,
      trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color, speed: 0.1, life: 0.12, size: 0.08, shape: 1 }); },
      onHit: (e, q) => {
        hit.add(e);
        const crit = this.inSmoke() ? true : undefined;
        g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(2), stagger: 0.25, crit });
        g.fx.hitSpark(q.pos, q.vel.clone().normalize(), { color, crit: !!crit });
        if (bounces > 0) this.ricochet(q.pos.clone(), hit, bounces - 1, dmg * 1.15, color);
      } });
  }
  ricochet(from, hit, left, dmg, color) {
    const g = this.game;
    let best = null, bd = 8;
    for (const e of g.enemies) { if (e.dead || hit.has(e)) continue; const d = e.pos.distanceTo(from); if (d < bd) { bd = d; best = e; } }
    if (!best) return;
    const to = tmp.copy(best.pos).setY(best.pos.y + best.height * 0.55);
    const dir = to.clone().sub(from).normalize();
    g.fx.slashLine(from, dir, Math.min(bd, 1.5), 0xffffff, 0.1, 0.1);
    g.audio?.tone({ freq: 2600, to: 1800, dur: 0.07, gain: 0.06, type: 'square', filter: 6000 });
    setTimeout(() => this.bullet(from, dir, dmg, { bounces: left, target: best, hitSet: hit, color }), 40);
  }
  shoot() {
    const g = this.game, p = this.p;
    this.cast(0.2);
    const from = this.handPos(), dir = p.aimDir.clone();
    this.bullet(from, dir, 11 + this.rank('caliber') * 4, { bounces: this.rank('ricochet') >= 2 ? 1 : 0 });
    this.muzzle(from, dir);
    g.audio?.noise({ dur: 0.12, gain: 0.45, type: 'lowpass', freq: 3500, sweep: 400 });
    g.audio?.tone({ freq: 160, to: 60, dur: 0.1, gain: 0.25 });
    g.shake(0.06);
  }
  trickShot() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const from = this.handPos(), dir = p.aimDir.clone();
    this.bullet(from, dir, 18 + this.rank('caliber') * 4, { bounces: 3 + this.rank('ricochet'), color: 0xfff0a0 });
    this.muzzle(from, dir);
    g.audio?.noise({ dur: 0.14, gain: 0.5, type: 'lowpass', freq: 4000, sweep: 300 });
    g.audio?.tone({ freq: 1800, to: 2600, dur: 0.12, gain: 0.05, type: 'square', filter: 6000, at: 0.05 });
    g.shake(0.08);
  }
  smoke() {
    const g = this.game, p = this.p, rk = this.rank('smoke');
    this.smokeAt.copy(p.pos); this.smokeR = 4.5 + rk * 0.8; this.smokeT = 5 + rk * 1.5;
    // throw down the bomb and hop back into it
    const back = p.aimDir.clone().setY(0).normalize().multiplyScalar(-11);
    p.action = { type: 'cast', dur: 0.25, elapsed: 0, t: 0, root: back, faceAim: true, moveScale: 0 };
    p.vel.x = back.x; p.vel.z = back.z; p.iframes = Math.max(p.iframes, 0.4);
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 0.5), { count: 40, color: SMOKE, additive: false, speed: 5, up: 0.4, life: 1.4, size: 0.8, sizeEnd: 3, drag: 3 });
    g.fx.flash(0xffffff, 0.15, 0.08);
    g.audio?.noise({ dur: 0.8, gain: 0.45, type: 'lowpass', freq: 1200, sweep: 300, rev: 0.3 });
    for (const e of g.enemies) if (!e.dead && this.inSmoke(e.pos) && e.state === 'windup') { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.5; }
  }
  fanHammer() {
    const g = this.game, p = this.p, s = this.slots.ranged;
    const n = s.chargesLeft;
    if (n <= 0) { g.toast?.('Out of rounds'); g.audio?.tone({ freq: 900, dur: 0.05, gain: 0.08, type: 'square', filter: 4000 }); return false; }
    s.chargesLeft = 0; s.recharge = 0;
    p.action = { type: 'cast', dur: 0.12 + n * 0.07, elapsed: 0, t: 0, moveScale: 0.25, faceAim: true };
    const dmg = 13 + this.rank('caliber') * 4;
    for (let i = 0; i < n; i++) setTimeout(() => {
      if (this.p.kit !== this) return;
      const from = this.handPos(), dir = p.aimDir.clone();
      dir.applyAxisAngle(tmp.set(0, 1, 0), (Math.random() - 0.5) * 0.22);
      this.bullet(from, dir, dmg, { bounces: this.rank('ricochet') >= 2 ? 1 : 0 });
      this.muzzle(from, dir);
      g.audio?.noise({ dur: 0.1, gain: 0.45, type: 'lowpass', freq: 3500, sweep: 400 });
      g.audio?.tone({ freq: 170, to: 60, dur: 0.08, gain: 0.22 });
      g.shake(0.07);
    }, i * 70);
  }
  // Ultimate: Construction — one bullet built from nothing, paid for by her body.
  special() {
    const g = this.game, p = this.p, rk = this.rank('construct');
    if (this.constructing) return false;
    this.constructing = true;
    const seventh = this.slots.ranged.chargesLeft <= 0;   // they think she is out of ammo
    p.action = { type: 'cast', both: true, dur: 1.3, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    // Construction strains her body: it costs HP (never lethal here)
    const cost = Math.min(Math.max(0, p.hp - 1), p.maxHp * 0.12);
    p.hp -= cost;
    if (cost > 0) { g.fx.hurtVignette(); g.fx.damageNumber(p.pos, cost, { color: '#ff6a6a' }); }
    g.toast?.(seventh ? 'Construction — the seventh bullet' : 'Construction: Special Bullet', 'big');
    g.audio?.charge(1.1, 1.2);
    g.fx.dimTarget = 0.6; g.slowMo(1.1, 0.4); g.fx.chroma(0.6);
    let t = 0;
    g.addUpdater((dt) => {
      if (this.p.kit !== this) { this.constructing = false; g.fx.dimTarget = 0; return false; }
      t += dt;
      const h = this.handPos();
      const k = Math.min(1, t / 1.1);
      for (let i = 0; i < 5; i++) {   // cursed energy threads weaving the bullet
        const a = Math.random() * Math.PI * 2, rr = 0.4 + (1 - k) * 1.6 + Math.random() * 0.6;
        g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.5) * 1.4 * (1 - k), h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 3, 0, -Math.sin(a) * rr * 3, 0.32, 0.8, 1.8, 2.2, 0.1, 0, 0, 0.2, 1);
      }
      g.particles.burst(h, { count: 1, color: CONSTRUCT, speed: 0, life: 0.08, size: 0.2 + k * 0.5, sizeEnd: 0.1, intensity: 3 });
      if (t < 1.15) return true;
      this.constructing = false;
      g.fx.dimTarget = 0; p.action = null;
      const dir = p.aimDir.clone(), dmg = (300 + rk * 90) * (seventh ? 1.5 : 1);
      const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.aimPoint, 30) : null;
      g.projectiles.fire({ pos: h.clone(), vel: dir.clone().multiplyScalar(80), team: 'player', dmg, shape: 'arrow', color: CONSTRUCT, emissive: 8, scale: 0.8, life: 0.6, radius: 0.8, pierce: true, light: 10,
        homing: target ? 20 : 0, target,
        trail: (q) => { g.particles.burst(q.pos, { count: 5, color: CONSTRUCT, speed: 1.5, life: 0.35, size: 0.3, sizeEnd: 0.05, intensity: 3 }); },
        onHit: (e, q) => {
          g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(16), stagger: 1.4, unblockable: true, crit: true, critMult: 1.5 });
          g.fx.hitSpark(q.pos, q.vel.clone().normalize(), { color: CONSTRUCT, big: true, crit: true });
          g.fx.screenWave(q.pos, 0.6, 0.3);
          g.hitStop(0.1); g.shake(0.5); g.audio?.impact(2.2);
        },
        onExpire: (q) => {
          const R = 3 + rk * 0.7;
          g.combat.aoe(q.pos, R, 60 + rk * 25, p, { knock: 10, stagger: 0.8 });
          g.fx.explosion(q.pos, CONSTRUCT, R);
        } });
      g.fx.slashLine(h, dir, 30, CONSTRUCT, 0.6, 0.35);
      g.fx.slashLine(h, dir, 30, 0xffffff, 0.2, 0.25);
      this.muzzle(h, dir);
      g.fx.flash(0xc0f0ff, 0.6, 0.2); g.fx.screenWave(h, 1.4, 0.5); g.fx.chroma(1.4);
      g.shake(0.9); g.hitStop(0.12); g.slowMo(0.5, 0.3);
      g.audio?.blackFlash(); g.audio?.energy('explode');
      return false;
    });
  }
  tick(dt) {
    if (this.smokeT <= 0) return;
    this.smokeT -= dt;
    const g = this.game, c = this.smokeAt, R = this.smokeR;
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      g.particles.smoke.emit(c.x + Math.cos(a) * rr, c.y + 0.2 + Math.random() * 1.6, c.z + Math.sin(a) * rr, (Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4, 1.6, 0.42, 0.42, 0.46, 1.2, 0, 1, 2.6, 0);
    }
    for (const e of g.enemies) if (!e.dead && this.inSmoke(e.pos)) e.slowT = 0.3;
  }
}
registerKit('mai', MaiKit, MAI_SKILLS);
