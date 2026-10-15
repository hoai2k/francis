// Kasumi Miwa-style kit — Simple Domain / New Shadow Style.
//   LMB  katana combo.
//   RMB  Quick Draw: an iai dash-cut along a line.
//   1    Simple Domain: a small circle around her feet; anything that enters
//        it (curses or their projectiles) is cut down by an automatic draw.
//   2    New Shadow Style: Batto — a wide, heavy drawing slash.
//   3    Flash Draw: she blinks through several curses in a row, one cut each
//        (an extrapolation of her quick draw).
//   F    Ultimate — Batto Sword Drawing: Simple Domain. Miwa has no Domain
//        Expansion; her signature is New Shadow Style's Simple Domain combined
//        with Batto: she roots herself in a wide circle and anything that
//        enters it (curse or projectile) is cut down by an automatic,
//        ultra-fast draw. It ends in one full-circle Batto.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const SKY = 0x7ac0ff, STEEL = 0xe8f4ff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('miwa', {
  name: 'Miwa', technique: 'Simple Domain', rarity: 'common', title: 'New Shadow Style', color: '#7ac0ff', ultimate: 'Batto Sword Drawing: Simple Domain',
  desc: 'A katana and the New Shadow Style: quick-draw dashes, a wide Batto and a Simple Domain that auto-counters anything that steps inside.',
});

registerLook('miwa', {
  paint: { skinTone: 0xf4d6c2, hair: 0x7ab0e8, hairVolume: true, top: 0x1b2238, collar: 0xe8e8f0, topTrim: 0x151a2a, buttons: 0xc8c8d0, pants: 0x1b2238, skirt: 0x1b2238, tights: 0x101014, eye: 0x2a4a7a, fringe: 3, hairSide: 7, hairBack: 8, blush: true },
  hair: (m) => [
    { x: -3.6, y: 4, z: 0, w: 1.8, h: 8, d: 5, hang: true, material: m, stiff: 30 },
    { x: 3.6, y: 4, z: 0, w: 1.8, h: 8, d: 5, hang: true, material: m, stiff: 30 },
    { x: 0, y: 6, z: -3.7, w: 8, h: 13, d: 1.8, hang: true, material: m, stiff: 22 },   // waist-long back
    { x: 0, y: 8.4, z: 3, w: 7, h: 1.5, d: 2.5, rx: 0.35, material: m },              // straight bangs
  ],
  hairColor: 0x7ab0e8, accent: SKY,
  cape: null,
  props(rig, K) {
    const steel = K.mat(STEEL, { metalness: 0.95, roughness: 0.15 }), wrap = K.mat(0x1a1a22, { roughness: 0.8 }), guard = K.mat(0xc8a040, { metalness: 0.8, roughness: 0.3 });
    const sword = new THREE.Group();
    K.box(sword, 1, 3.5, 1, wrap, 0, 0.6, 0);         // tsuka
    K.box(sword, 2.4, 0.4, 2.4, guard, 0, -1.4, 0);    // tsuba
    K.box(sword, 0.35, 13, 0.9, steel, 0, -8, 0.1);    // blade along the arm
    rig.handR.add(sword); rig.extras.weapon = sword;
    // empty saya on the left hip
    K.box(rig.torso, 1.2, 1.2, 14, K.mat(0x14161e, { roughness: 0.5 }), 4.6, 1.5, -1, 0.5, 0, 0);
  },
});

export const MIWA_SKILLS = [
  { id: 'iai', name: 'Iai', desc: 'Quick Draw cuts further and deeper.', max: 3 },
  { id: 'circle', name: 'Simple Domain', desc: 'Bigger, longer-lasting Simple Domain.', max: 3 },
  { id: 'counter', name: 'Counter Draw', desc: 'Simple Domain counters (and the ultimate\'s draws) hit harder.', max: 2, req: 'circle' },
  { id: 'batto', name: 'Batto', desc: 'Batto is wider and hits harder.', max: 3 },
  { id: 'flash', name: 'Flash Draw', desc: 'Flash Draw cuts one more curse per rank.', max: 2, req: 'iai' },
  { id: 'savings', name: 'Broke Sorcerer', desc: 'Every yen counts: +10% Cursed Energy gain per rank.', max: 2 },
];

class MiwaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.28, windup: 0.26, strike: 0.48, dmg: 12, range: 2.9, arc: 1.2, lunge: 7, knock: 3, stop: 0.045, shake: 0.13, trail: STEEL, sparkColor: SKY },
      { style: 'swingL', dur: 0.28, windup: 0.26, strike: 0.48, dmg: 12, range: 2.9, arc: 1.2, lunge: 7, knock: 3, stop: 0.045, shake: 0.13, trail: STEEL, sparkColor: SKY },
      { style: 'swingR', dur: 0.3, windup: 0.26, strike: 0.48, dmg: 14, range: 3, arc: 1.3, lunge: 7, knock: 4, stop: 0.05, shake: 0.16, trail: SKY, sparkColor: SKY },
      { style: 'spin', dur: 0.44, windup: 0.26, strike: 0.55, dmg: 22, range: 3.3, arc: Math.PI, lunge: 3, knock: 8, stop: 0.08, shake: 0.3, ring: true, ringColor: SKY, trail: SKY },
    ];
    this.p.stats.ceGain += r('savings') * 0.1;
    this.slots = {
      ranged: this.ability({ name: 'Quick Draw', icon: '🗡️', cd: 1.3, ce: 0, use: () => this.quickDraw() }),
      t1: this.ability({ name: 'Simple Domain', icon: '⭕', cd: 12, ce: 14, use: () => this.simpleDomain() }),
      t2: this.ability({ name: 'Batto', icon: '🌙', cd: 7, ce: 14, use: () => this.batto() }),
      t3: this.ability({ name: 'Flash Draw', icon: '⚡', cd: 15, ce: 28, use: () => this.flashDraw() }),
    };
    this.ultimate = { name: 'Batto Sword Drawing: Simple Domain', icon: '⭕', use: () => this.battoDomain() };
    this.sd = null; this.ult = null;
  }
  // a single automatic iai cut on a curse
  counterCut(e, dmg, face = true) {
    const g = this.game, p = this.p;
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
    const a = Math.random() * Math.PI;
    const dir = tmp2.set(Math.cos(a), (Math.random() - 0.5) * 0.4, Math.sin(a)).normalize();
    g.fx.slashLine(at.clone().addScaledVector(dir, -1.4), dir, 2.8, STEEL, 0.2, 0.14);
    g.fx.slashLine(at.clone().addScaledVector(dir, -1.2), dir, 2.4, SKY, 0.1, 0.2);
    g.combat.damageEnemy(e, dmg, p, { stagger: 0.7, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(5), unblockable: true });
    g.fx.hitSpark(at, null, { color: SKY });
    if (face) { p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z); p.action = { type: 'attack', step: { style: 'swingR', strike: 0.4, windup: 0.1 }, style: 'swingR', dur: 0.2, elapsed: 0, t: 0.35, windup: 0.1, strike: 0.4, struck: true, moveScale: 0.5 }; }
    g.audio?.energy('slash');
  }
  cutProjectiles(c, R) {
    const g = this.game;
    for (const pr of [...g.projectiles.list]) {
      if (pr.team !== 'enemy' || Math.hypot(pr.pos.x - c.x, pr.pos.z - c.z) > R) continue;
      g.fx.slashLine(pr.pos.clone().add(tmp.set(-0.7, 0.3, 0)), tmp2.set(1, -0.4, 0).normalize(), 1.4, STEEL, 0.15, 0.12);
      g.fx.hitSpark(pr.pos, null, { color: STEEL });
      g.projectiles.kill(pr, 'cut');
    }
  }
  // ------------------------------------------------------------- Quick Draw
  quickDraw() {
    const g = this.game, p = this.p, rk = this.rank('iai');
    const dir = p.aimDir.clone().setY(0).normalize();
    const L = 5 + rk * 0.8;
    const from = p.pos.clone();
    // the draw carries her through the cut (physics stops her at walls)
    const speed = 30;
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'cast', dur: 0.15, elapsed: 0, t: 0, lock: true, cancelable: false, faceAim: false, root: dir.clone().multiplyScalar(speed) };
    p.vel.x = dir.x * speed; p.vel.z = dir.z * speed;
    p.iframes = Math.max(p.iframes, 0.2);
    const dmg = 15 + rk * 6;
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from); const along = tmp.dot(dir);
      if (along < -0.5 || along > L || Math.abs(tmp.y) > 3) continue;
      if (Math.abs(tmp.x * dir.z - tmp.z * dir.x) > 1 + e.radius) continue;
      g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().multiplyScalar(2), stagger: 0.4 });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), dir, { color: SKY });
    }
    const y = from.y + 1.1;
    g.fx.slashLine(from.clone().setY(y), dir, L, STEEL, 0.4, 0.16);
    g.fx.slashLine(from.clone().setY(y - 0.05), dir, L * 0.9, SKY, 0.2, 0.25);
    g.particles.burst(from.clone().setY(from.y + 1), { count: 10, color: SKY, speed: 6, dir: dir.clone(), spread: 0.4, life: 0.25, size: 0.1, shape: 1 });
    g.audio?.energy('slash'); g.audio?.whoosh(0.9);
  }
  // ------------------------------------------------------------- Simple Domain
  simpleDomain() {
    const g = this.game, p = this.p, rk = this.rank('circle');
    this.sd = { c: p.pos.clone(), R: 3 + rk * 0.5, t: 4 + rk * 1.2, ring: 0, last: new Map() };
    p.action = { type: 'sign', dur: 0.4, elapsed: 0, t: 0, moveScale: 0 };
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: SKY, r0: 0.3, r1: this.sd.R, dur: 0.3, thick: 0.12 });
    g.audio?.tone({ freq: 660, to: 990, dur: 0.4, gain: 0.08, type: 'sine', rev: 0.5 });
    g.toast?.('Simple Domain');
  }
  tick(dt) {
    const S = this.sd; if (!S) return;
    const g = this.game, p = this.p;
    S.t -= dt; S.ring -= dt;
    // stepping out of the circle breaks it
    if (S.t <= 0 || Math.hypot(p.pos.x - S.c.x, p.pos.z - S.c.z) > S.R + 0.3) { this.sd = null; g.fx.rings.spawn(tmp.set(S.c.x, S.c.y + 0.06, S.c.z), { color: SKY, r0: S.R, r1: S.R + 1, dur: 0.25, thick: 0.05 }); return; }
    if (S.ring <= 0) {
      S.ring = 0.15;
      g.fx.rings.spawn(tmp.set(S.c.x, S.c.y + 0.07, S.c.z), { color: SKY, r0: S.R, r1: S.R, dur: 0.18, thick: 0.08 });
      g.fx.rings.spawn(tmp.set(S.c.x, S.c.y + 0.07, S.c.z), { color: STEEL, r0: S.R * 0.3, r1: S.R * 0.3, dur: 0.18, thick: 0.04 });
    }
    this.cutProjectiles(S.c, S.R);
    const dmg = 28 + this.rank('counter') * 12;
    for (const e of g.enemies) {
      if (e.dead || Math.hypot(e.pos.x - S.c.x, e.pos.z - S.c.z) > S.R + e.radius) continue;
      if (g.time - (S.last.get(e) ?? -9) < 0.45) continue;
      S.last.set(e, g.time);
      this.counterCut(e, dmg);
      g.hitStop(0.03);
    }
  }
  // ------------------------------------------------------------- Batto
  batto() {
    const g = this.game, p = this.p, rk = this.rank('batto');
    p.action = { type: 'cast', dur: 0.32, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    g.audio?.charge(0.28, 1.6);
    setTimeout(() => {
      const R = 4.8 + rk * 0.6;
      const dir = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      p.action = { type: 'attack', step: { style: 'swingR', strike: 0.35, windup: 0.1 }, style: 'swingR', dur: 0.35, elapsed: 0, t: 0.1, windup: 0.1, strike: 0.35, struck: true, moveScale: 0.2 };
      const hits = g.domainSys?.sureHit(p) ? g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos)) : g.combat.query(p.pos, dir, R, 1.75);
      for (const e of hits) {
        g.combat.damageEnemy(e, 42 + rk * 14, p, { knock: tmp2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), stagger: 0.9 });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), null, { color: SKY, big: true });
      }
      g.fx.slashArc(p.pos, p.facing, STEEL, R, 1.1, 0.22);
      g.fx.slashArc(p.pos, p.facing, SKY, R * 0.85, 1.1, 0.3);
      g.combat.hitBlocks(p.pos, dir, R, 1.75, 40, p);
      if (hits.length) { g.hitStop(0.08); g.shake(0.35); g.fx.chroma(0.4); }
      g.fx.flash(0xc0e0ff, 0.15, 0.08);
      g.audio?.energy('slash'); g.audio?.impact(1.3);
    }, 320);
  }
  // ------------------------------------------------------------- Flash Draw
  flashDraw() {
    const g = this.game, p = this.p;
    const n = 3 + this.rank('flash');
    const sure = g.domainSys?.sureHit(p);
    const list = g.enemies.filter((e) => !e.dead && !e.isDummy && (sure ? g.domainSys.inside(e.pos) : e.pos.distanceTo(p.pos) < 11))
      .sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, n);
    if (!list.length) { g.toast?.('No curses in reach'); g.audio?.ui('back'); return false; }
    p.invulnerable = true;
    p.action = { type: 'cast', dur: 9, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.fx.dimTarget = 0.4;
    const start = p.pos.clone();
    let i = 0;
    const cut = () => {
      const e = list[i++];
      if (e && !e.dead) {
        const from = p.pos.clone();
        tmp.subVectors(e.pos, from).setY(0);
        const d = tmp.length(); tmp.normalize();
        const to = e.pos.clone().addScaledVector(tmp, 1.2);
        const gy = g.world.groundBelow(to.x, to.z, e.pos.y + 2);
        if (isFinite(gy) && Math.abs(gy - e.pos.y) < 2.5 && !g.world.solidAt(to.x, gy + 0.5, to.z) && !g.world.solidAt(to.x, gy + 1.5, to.z)) { to.y = gy; p.pos.copy(to); p.visY = to.y; }
        p.facing = Math.atan2(tmp.x, tmp.z);
        g.fx.slashLine(from.clone().setY(from.y + 1.1), tmp.clone(), d + 1.2, STEEL, 0.3, 0.2);
        g.fx.blinkPuff(from, SKY);
        g.combat.damageEnemy(e, 46 + this.rank('iai') * 8, p, { stagger: 1, unblockable: true, knock: new THREE.Vector3() });
        g.fx.slashX(e.pos.clone().setY(e.pos.y + e.height * 0.55), 2 + e.height * 0.3, SKY);
        g.hitStop(0.05); g.shake(0.2); g.audio?.energy('slash');
      }
      if (i < list.length) { setTimeout(cut, 110); return; }
      setTimeout(() => {
        p.invulnerable = false; p.action = null; g.fx.dimTarget = 0;
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: SKY, r0: 0.3, r1: 3, dur: 0.3, thick: 0.1 });
        g.audio?.tone({ freq: 1400, to: 700, dur: 0.3, gain: 0.06, type: 'sine', rev: 0.5 });
        if (p.pos.distanceTo(start) > 30) p.pos.copy(start);
      }, 140);
    };
    g.audio?.energy('teleport');
    cut();
  }
  // ------------------------------------------------------------- Ultimate
  // Batto Sword Drawing: Simple Domain — rooted in a wide circle, she cuts
  // down anything that enters it, then finishes with a full-circle Batto.
  battoDomain() {
    const g = this.game, p = this.p;
    if (this.ult) return false;
    this.sd = null;
    const R = 7 + this.rank('circle') * 0.6, dur = 3.6;
    const U = this.ult = { c: p.pos.clone(), R, t: 0, cut: 0, ring: 0, last: new Map() };
    p.invulnerable = true;   // nothing that enters the circle reaches her
    const stance = () => { p.action = { type: 'cast', dur: 9, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false }; };
    stance();
    g.toast?.('Batto Sword Drawing: Simple Domain', 'big');
    g.fx.dimTarget = 0.45; g.fx.flash(0xc0e0ff, 0.35, 0.2); g.slowMo(0.6, 0.35);
    g.fx.rings.spawn(tmp.set(U.c.x, U.c.y + 0.06, U.c.z), { color: SKY, r0: 0.3, r1: R, dur: 0.45, thick: 0.18 });
    g.audio?.tone({ freq: 660, to: 990, dur: 0.6, gain: 0.1, type: 'sine', rev: 0.6 });
    g.audio?.charge(0.5, 1.6);
    const cutDmg = 38 + this.rank('counter') * 12 + this.rank('iai') * 4;
    g.addUpdater((dt) => {
      if (this.ult !== U || this.p.kit !== this) return false;
      U.t += dt; U.cut -= dt; U.ring -= dt;
      const c = U.c;
      if (U.ring <= 0) {
        U.ring = 0.12;
        g.fx.rings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: SKY, r0: R, r1: R, dur: 0.15, thick: 0.12 });
        g.fx.rings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: STEEL, r0: R * 0.55, r1: R * 0.55, dur: 0.15, thick: 0.05 });
        g.fx.rings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: STEEL, r0: 0.9, r1: 0.9, dur: 0.15, thick: 0.05 });
      }
      this.cutProjectiles(c, R);
      if (U.cut <= 0) {
        // the draw is automatic: whatever is inside and was not cut most recently
        let best = null, bt = Infinity;
        for (const e of g.enemies) {
          if (e.dead || e.isDummy || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > R + e.radius) continue;
          const lt = U.last.get(e) ?? -9;
          if (lt < bt) { bt = lt; best = e; }
        }
        if (best) {
          U.cut = 0.11; U.last.set(best, g.time);
          this.counterCut(best, cutDmg, false);
          p.facing = Math.atan2(best.pos.x - p.pos.x, best.pos.z - p.pos.z);
          g.fx.slashLine(p.pos.clone().setY(p.pos.y + 1.1), tmp2.set(best.pos.x - p.pos.x, 0, best.pos.z - p.pos.z).normalize().clone(), Math.min(R, best.pos.distanceTo(p.pos)), SKY, 0.15, 0.1);
          if (best.state === 'windup') { best.cancelAttack?.(); best.state = 'stagger'; best.stateT = 0; best.stagger = 0.4; }
          g.hitStop(0.02);
        }
      }
      if (U.t < dur) return true;
      // the closing draw: one full-circle Batto through everything inside
      this.endUlt();
      const dmg = 150 + this.rank('batto') * 40;
      for (const e of g.enemies) {
        if (e.dead || e.isDummy || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > R + e.radius) continue;
        g.combat.damageEnemy(e, dmg, p, { stagger: 1.2, unblockable: true, knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(10) });
        g.fx.slashX(e.pos.clone().setY(e.pos.y + e.height * 0.55), 2.4 + e.height * 0.3, SKY);
      }
      p.action = { type: 'attack', step: { style: 'spin', strike: 0.4, windup: 0.1 }, style: 'spin', dur: 0.4, elapsed: 0, t: 0.1, windup: 0.1, strike: 0.4, struck: true, moveScale: 0 };
      g.fx.slashArc(p.pos, p.facing, STEEL, R, Math.PI, 0.3);
      g.fx.slashArc(p.pos, p.facing, SKY, R * 0.8, Math.PI, 0.4, true);
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: SKY, r0: R, r1: R + 3, dur: 0.4, thick: 0.2 });
      g.fx.flash(0xe0f0ff, 0.6, 0.2); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1.2, 0.5); g.fx.chroma(1.2);
      g.shake(0.8); g.hitStop(0.12); g.slowMo(0.45, 0.3);
      g.audio?.energy('slash'); g.audio?.impact(2); g.audio?.blackFlash();
      return false;
    });
  }
  endUlt() {
    if (!this.ult) return;
    this.ult = null;
    this.p.invulnerable = false; this.game.fx.dimTarget = 0;
    if (this.p.action?.type === 'cast') this.p.action = null;
  }
  dispose() { super.dispose(); this.endUlt(); }
}
registerKit('miwa', MiwaKit, MIWA_SKILLS);
