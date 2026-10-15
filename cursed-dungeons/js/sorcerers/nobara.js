// Nobara-style kit — Straw Doll Technique.
//   LMB  hammer combo; every hit drives a nail into the curse.
//   RMB  Nails: flick three cursed nails that embed in curses.
//   1    Hairpin: every embedded nail detonates.
//   2    Resonance: the straw doll strikes every curse you have nailed,
//        wherever it is, harder for each nail.
//   3    Nail Storm: a wide fan of nails.
//   F    Ultimate (no domain): Resonance: Blood Doll — she takes the strongest
//        curse's blood (and pays with her own), hammers the nail into a giant
//        straw doll three times, then every embedded nail detonates (Hairpin).
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit } from './index.js';

const ORANGE = 0xffa050;
const tmp = new THREE.Vector3();

export const NOBARA_SKILLS = [
  { id: 'nails', name: 'Iron Nails', desc: 'Nails deal more damage.', max: 3 },
  { id: 'hairpin', name: 'Hairpin', desc: 'Bigger, stronger nail detonations.', max: 3 },
  { id: 'resonance', name: 'Resonance', desc: 'Resonance hits harder per nail.', max: 3 },
  { id: 'hammer', name: 'Heavy Hammer', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'storm', name: 'Nail Storm', desc: 'More nails in the storm.', max: 2, req: 'nails' },
  { id: 'doll', name: 'Straw Doll', desc: 'Resonance also restores Cursed Energy.', max: 1, req: 'resonance' },
];

class NobaraKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 14, range: 2.7, arc: 1.2, lunge: 5, knock: 5, stop: 0.055, shake: 0.2, trail: ORANGE, sparkColor: 0xffc080 },
      { style: 'swingL', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 14, range: 2.7, arc: 1.2, lunge: 5, knock: 5, stop: 0.055, shake: 0.2, trail: ORANGE, sparkColor: 0xffc080 },
      { style: 'slam', dur: 0.6, windup: 0.45, strike: 0.62, dmg: 28, range: 3.2, arc: Math.PI, lunge: 3, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: ORANGE, stagger: 0.6, trail: ORANGE },
    ];
    this.p.stats.meleeMult += r('hammer') * 0.08;
    this.slots = {
      ranged: this.ability({ name: 'Nails', icon: '📌', cd: 0.7, ce: 0, use: () => this.nails(3, 0.22) }),
      t1: this.ability({ name: 'Hairpin', icon: '💥', cd: 4, ce: 8, use: () => this.hairpin() }),
      t2: this.ability({ name: 'Resonance', icon: '🪆', cd: 9, ce: 16, use: () => this.resonance() }),
      t3: this.ability({ name: 'Nail Storm', icon: '🌠', cd: 10, ce: 14, use: () => this.nails(9 + r('storm') * 3, 1.1) }),
    };
    // No canon domain: F is Nobara's full Resonance ritual — the straw doll,
    // her own blood and a nail driven home, then every nail goes off (Hairpin).
    this.ultimate = { name: 'Resonance: Blood Doll', icon: '🩸', use: () => this.bloodDoll() };
  }
  addNail(e, n = 1) {
    e.nails = Math.min(8, (e.nails ?? 0) + n); e.nailT = this.game.time;
    if (!e.nailMarks) e.nailMarks = [];
  }
  onMeleeHit(e) { this.addNail(e, 1); }
  nails(n, spread) {
    const g = this.game, p = this.p;
    this.cast(0.28);
    const base = Math.atan2(p.aimDir.x, p.aimDir.z);
    const dmg = 7 + this.rank('nails') * 3;
    for (let i = 0; i < n; i++) {
      const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * 2);
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      g.projectiles.fire({ pos: this.handPos(), vel: dir.multiplyScalar(30), team: 'player', shape: 'nail', color: 0xd8d8e0, emissive: 0.8, life: 0.8, radius: 0.35,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: ORANGE, speed: 0.2, life: 0.2, size: 0.08, shape: 1 }); },
        onHit: (e, q) => { g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(1.5), stagger: 0.15 }); this.addNail(e, 1); g.fx.hitSpark(q.pos, null, { color: ORANGE }); } });
    }
    g.audio?.energy('nail');
  }
  hairpin() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const rk = this.rank('hairpin');
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || !e.nails) continue;
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
      const pow = e.nails;
      g.fx.explosion(at, ORANGE, 1.4 + rk * 0.3 + pow * 0.1);
      g.combat.aoe(at, 1.6 + rk * 0.4, (10 + rk * 5) * pow, p, { knock: 5, stagger: 0.5, blocks: true });
      e.nails = 0; n++;
    }
    if (n) { g.shake(0.3); g.hitStop(0.05); g.audio?.energy('explode'); }
    else { g.toast?.('No nails embedded'); g.audio?.ui('back'); return false; }
  }
  resonance() {
    const g = this.game, p = this.p;
    this.cast(0.6, true);
    const rk = this.rank('resonance');
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || !e.nails) continue;
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
      g.combat.damageEnemy(e, (14 + rk * 6) * e.nails, p, { stagger: 0.8, unblockable: true, color: '#ffa050' });
      g.fx.hitSpark(at, null, { color: ORANGE, big: true });
      g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: ORANGE, r0: 0.3, r1: 1.8, dur: 0.3, thick: 0.2 });
      e.nails = Math.max(0, e.nails - 2);
      n++;
    }
    if (n && this.rank('doll')) p.gainCE(4 * n);
    if (n) { g.shake(0.25); g.audio?.impact(1.4); g.fx.flash(0x301000, 0.2, 0.12); g.hitStop(0.06); }
    else { g.toast?.('No nailed curses'); g.audio?.ui('back'); return false; }
  }
  tick(dt) {
    // show nails sticking out of curses as tiny sparks
    if (Math.random() < 0.3) for (const e of this.game.enemies) if (!e.dead && e.nails) {
      if (Math.random() < 0.3) this.game.particles.glow.emit(e.pos.x + (Math.random() - 0.5) * 0.6, e.pos.y + e.height * (0.3 + Math.random() * 0.5), e.pos.z + (Math.random() - 0.5) * 0.6, 0, 0.2, 0, 0.3, 2, 1.2, 0.5, 0.06 + e.nails * 0.01, 0, 1, 1, 0);
    }
  }
  // -------------------------------------------------------------- ultimate
  bloodDoll() {
    const g = this.game, p = this.p;
    let tgt = null, bs = -1;
    for (const e of g.enemies) {
      if (e.dead || e.isDummy) continue;
      const d = e.pos.distanceTo(p.pos); if (d > 20) continue;
      const sc = (e.isBoss ? 1e6 : 0) + (e.nails ?? 0) * 500 + e.hp - d;
      if (sc > bs) { bs = sc; tgt = e; }
    }
    if (!tgt) { g.toast?.('No curse to take blood from'); g.audio?.ui('back'); return false; }
    this.removeDoll();
    const rk = this.rank('resonance');
    // Resonance through her own wound: Nobara shares the pain
    const cost = Math.min(p.hp - 1, p.maxHp * 0.1);
    if (cost > 0) { p.hp -= cost; g.fx.damageNumber(p.pos, cost, { color: '#ff5a6a' }); g.fx.splat(p.pos.clone().setY(p.pos.y + 1.2), 0xa00010); }
    this.addNail(tgt, 3);
    p.action = { type: 'cast', both: true, dur: 2.1, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.invulnerable = true;
    g.slowMo(2.2, 0.4);
    g.fx.dimTarget = 0.55;
    g.toast?.('RESONANCE', 'domain');
    g.audio?.charge(0.7, 0.6);
    // the giant straw doll, planted in front of her
    const doll = this.makeDoll();
    const fwd = new THREE.Vector3(p.aimDir.x, 0, p.aimDir.z).normalize();
    doll.position.copy(p.pos).addScaledVector(fwd, 2.4);
    doll.rotation.y = Math.atan2(-fwd.x, -fwd.z);
    doll.scale.setScalar(0.01);
    g.scene.add(doll); this.doll = doll;
    p.facing = Math.atan2(fwd.x, fwd.z);
    let t = 0, strikes = 0;
    const times = [0.55, 0.95, 1.35];
    g.addUpdater((dt) => {
      if (this.doll !== doll) return false;
      t += dt;
      doll.scale.setScalar(Math.min(1, t * 4));
      // her blood (and the curse's) streams into the doll
      if (tgt && !tgt.dead && Math.random() < 0.7) {
        const from = tgt.pos, to = doll.position;
        g.particles.glow.emit(from.x, from.y + tgt.height * 0.6, from.z, (to.x - from.x) * 1.5, 2 + (to.y - from.y) * 1.5, (to.z - from.z) * 1.5, 0.6, 1.6, 0.05, 0.08, 0.14, 4, 0, 0.05, 1);
      }
      if (strikes < times.length && t >= times[strikes]) {
        strikes++;
        const last = strikes === times.length;
        doll.userData.nail.position.z = 1.1 - strikes * 0.28;
        doll.updateMatrixWorld(true);
        const heart = doll.userData.nail.getWorldPosition(new THREE.Vector3());
        g.fx.hitSpark(heart, null, { color: ORANGE, big: true });
        g.fx.shockwave(doll.position, ORANGE, 2 + strikes);
        g.audio?.impact(1.2 + strikes * 0.3, 'crit');
        g.hitStop(0.07); g.shake(0.3 + strikes * 0.15);
        // RESONANCE: the hammer blow lands on the curse through the doll
        if (tgt && !tgt.dead) {
          const at = tgt.pos.clone().setY(tgt.pos.y + tgt.height * 0.6);
          g.combat.damageEnemy(tgt, (45 + rk * 12) * (1 + (tgt.nails ?? 0) * 0.15), p, { unblockable: true, crit: false, stagger: 1, color: '#ff4040' });
          g.fx.hitSpark(at, null, { color: 0xff2030, big: true });
          g.fx.rings.spawn(tmp.set(tgt.pos.x, tgt.pos.y + 0.06, tgt.pos.z), { color: 0xff3030, r0: 0.4, r1: 3, dur: 0.35, thick: 0.25 });
          g.particles.burst(at, { count: 18, color: 0xb00010, speed: 6, life: 0.5, size: 0.12, gravity: 14, shape: 1 });
          if (!tgt.isBoss) tgt.sealT = Math.max(tgt.sealT ?? 0, 0.8);
        }
        // the echo reaches every other nailed curse
        for (const e of g.enemies) if (e !== tgt && !e.dead && e.nails) g.combat.damageEnemy(e, (12 + rk * 4) * e.nails, p, { unblockable: true, crit: false, stagger: 0.5, color: '#ffa050' });
        if (last) {
          // HAIRPIN: every embedded nail detonates at once
          g.fx.flash(0xff6a2a, 0.6, 0.3); g.fx.chroma(1.6); g.fx.screenWave(heart, 1.4, 0.6);
          g.lights.flash(heart, ORANGE, 20, 16, 0.6, { priority: 7 });
          for (const e of g.enemies) {
            if (e.dead || !e.nails) continue;
            const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
            const pow = e.nails, hr = this.rank('hairpin');
            g.fx.explosion(at, ORANGE, 1.8 + hr * 0.3 + pow * 0.15);
            g.combat.aoe(at, 2.2 + hr * 0.4, (18 + hr * 6) * pow, p, { knock: 8, stagger: 0.8, unblockable: true });
            e.nails = 0;
          }
          g.shake(0.9); g.audio?.energy('explode');
          if (this.rank('doll')) p.gainCE(20);
        }
        return true;
      }
      if (t < 1.9) return true;
      this.endDoll();
      return false;
    });
  }
  makeDoll() {
    const grp = new THREE.Group();
    const straw = new THREE.MeshStandardNodeMaterial({ color: 0xc8a860, roughness: 0.9 }), rope = new THREE.MeshStandardNodeMaterial({ color: 0x6a4a2a, roughness: 0.9 });
    const blood = new THREE.MeshStandardNodeMaterial({ color: 0x8a0010, roughness: 0.4, emissive: 0x400008, emissiveIntensity: 0.6 }), iron = new THREE.MeshStandardNodeMaterial({ color: 0xd8d8e0, metalness: 0.9, roughness: 0.3, emissive: ORANGE, emissiveIntensity: 0.4 });
    const b = (w, h, d, x, y, z, m, parent = grp) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = true; parent.add(mm); return mm; };
    b(0.9, 1.6, 0.6, 0, 1.6, 0, straw);                         // body
    b(1, 0.15, 0.7, 0, 1.2, 0, rope); b(1, 0.15, 0.7, 0, 2.1, 0, rope);
    b(0.8, 0.8, 0.6, 0, 2.85, 0, straw); b(0.85, 0.12, 0.65, 0, 2.5, 0, rope);   // head + neck tie
    b(2.4, 0.3, 0.3, 0, 2.15, 0, straw);                        // arms
    b(0.3, 1.1, 0.3, -0.25, 0.55, 0, straw); b(0.3, 1.1, 0.3, 0.25, 0.55, 0, straw);   // legs
    b(0.5, 0.5, 0.08, 0.1, 1.85, 0.32, blood);                  // the blood-soaked heart
    const nail = new THREE.Group(); nail.position.set(0.1, 1.85, 1.1); grp.add(nail);
    b(0.08, 0.08, 1.1, 0, 0, 0, iron, nail); b(0.3, 0.3, 0.06, 0, 0, 0.55, iron, nail);
    grp.userData.nail = nail;
    return grp;
  }
  removeDoll() { if (this.doll) { this.game.scene.remove(this.doll); this.doll = null; } }
  endDoll() {
    this.removeDoll();
    this.p.invulnerable = false; this.p.action = null;
    this.game.fx.dimTarget = 0;
  }
  dispose() { super.dispose(); if (this.doll) this.endDoll(); }
}
registerKit('nobara', NobaraKit, NOBARA_SKILLS);
