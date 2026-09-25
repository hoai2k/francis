// Nobara-style kit — Straw Doll Technique.
//   LMB  hammer combo; every hit drives a nail into the curse.
//   RMB  Nails: flick three cursed nails that embed in curses.
//   1    Hairpin: every embedded nail detonates.
//   2    Resonance: the straw doll strikes every curse you have nailed,
//        wherever it is, harder for each nail.
//   3    Nail Storm: a wide fan of nails.
//   F    Domain: Resonance Field — nails rain on every curse inside and
//        resonance pulses through them.
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
    this.domain = {
      name: 'Resonance Field', icon: '🪆', key: 'coffin_iron_mountain', type: 4, color: 0xff8a3a, sound: 'fire', flash: 0xff9a4a,
      duration: 8, radius: 24,
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt;
        if (d.tick > 0) return;
        d.tick = 0.7;
        for (const e of g.enemies) if (!e.dead && !e.isDummy && g.domainSys.inside(e.pos)) { this.addNail(e, 1); }
        this.resonance(true);
      },
    };
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
      const homing = g.domainSys?.sureHit(p);
      g.projectiles.fire({ pos: this.handPos(), vel: dir.multiplyScalar(30), team: 'player', shape: 'nail', color: 0xd8d8e0, emissive: 0.8, life: 0.8, radius: 0.35,
        homing: homing ? 14 : 0, target: homing ? g.nearestEnemy(p.pos, 30) : null,
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
  resonance(fromDomain = false) {
    const g = this.game, p = this.p;
    if (!fromDomain) this.cast(0.6, true);
    const rk = this.rank('resonance');
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || !e.nails) continue;
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
      g.combat.damageEnemy(e, (14 + rk * 6) * e.nails * (fromDomain ? 0.5 : 1), p, { stagger: 0.8, unblockable: true, color: '#ffa050' });
      g.fx.hitSpark(at, null, { color: ORANGE, big: true });
      g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: ORANGE, r0: 0.3, r1: 1.8, dur: 0.3, thick: 0.2 });
      if (!fromDomain) e.nails = Math.max(0, e.nails - 2);
      n++;
    }
    if (n && this.rank('doll')) p.gainCE(4 * n);
    if (n) { g.shake(0.25); g.audio?.impact(1.4); if (!fromDomain) { g.fx.flash(0x301000, 0.2, 0.12); g.hitStop(0.06); } }
    else if (!fromDomain) { g.toast?.('No nailed curses'); g.audio?.ui('back'); return false; }
  }
  tick(dt) {
    // show nails sticking out of curses as tiny sparks
    if (Math.random() < 0.3) for (const e of this.game.enemies) if (!e.dead && e.nails) {
      if (Math.random() < 0.3) this.game.particles.glow.emit(e.pos.x + (Math.random() - 0.5) * 0.6, e.pos.y + e.height * (0.3 + Math.random() * 0.5), e.pos.z + (Math.random() - 0.5) * 0.6, 0, 0.2, 0, 0.3, 2, 1.2, 0.5, 0.06 + e.nails * 0.01, 0, 1, 1, 0);
    }
  }
}
registerKit('nobara', NobaraKit, NOBARA_SKILLS);
