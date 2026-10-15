// Megumi-style kit — Ten Shadows.
//   RMB  Shadow Step: sink into your shadow and burst out at the aim point.
//   1    Divine Dogs: two shadow wolves hunt the nearest curses.
//   2    Nue: a thunder-bird that dive-bombs with lightning.
//   3    Toad: a shikigami that tongue-pulls and stuns curses.
//   F    Domain: Chimera Shadow Garden (incomplete — no sure-hit) — the floor
//        floods with liquid shadow, curses sink and flounder, shikigami rise
//        from any shadow and Shadow Step reaches anywhere inside.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit } from './index.js';
import { Ally } from '../entities/ally.js';

const SHADOW = 0x6a6aff;
const tmp = new THREE.Vector3();

export const MEGUMI_SKILLS = [
  { id: 'shikigami', name: 'Ten Shadows', desc: '+20% shikigami damage per rank.', max: 3 },
  { id: 'dogs_totality', name: 'Divine Dog: Totality', desc: 'Divine Dogs last longer and are tougher.', max: 2, req: 'shikigami' },
  { id: 'nue_storm', name: 'Nue Storm', desc: 'Nue lasts longer and attacks faster.', max: 2 },
  { id: 'toad_grip', name: 'Toad Grip', desc: 'Toad is tougher and pulls harder.', max: 2 },
  { id: 'shadow_step', name: 'Shadow Swim', desc: 'Shadow Step reaches further and hits harder.', max: 3 },
  { id: 'blade', name: 'Shadow Blade', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'garden', name: 'Chimera Garden', desc: 'Domain lasts 2s longer and spawns more shikigami.', max: 2 },
];

class MegumiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 12, range: 2.8, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: SHADOW, sparkColor: 0xb0b0ff },
      { style: 'swingL', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 12, range: 2.8, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: SHADOW, sparkColor: 0xb0b0ff },
      { style: 'spin', dur: 0.46, windup: 0.3, strike: 0.55, dmg: 20, range: 3, arc: Math.PI, lunge: 3, knock: 8, stop: 0.07, shake: 0.28, ring: true, ringColor: SHADOW, trail: SHADOW },
    ];
    this.p.stats.meleeMult += r('blade') * 0.08;
    this.slots = {
      ranged: this.ability({ name: 'Shadow Step', icon: '🌑', cd: 3.2, ce: 0, use: () => this.shadowStep() }),
      t1: this.ability({ name: 'Divine Dogs', icon: '🐺', cd: 14, ce: 14, use: () => this.summon('dog') }),
      t2: this.ability({ name: 'Nue', icon: '🦅', cd: 16, ce: 14, use: () => this.summon('nue') }),
      t3: this.ability({ name: 'Toad', icon: '🐸', cd: 12, ce: 10, use: () => this.summon('toad') }),
    };
    // Canon: Megumi's domain is INCOMPLETE — it has no sure-hit. Instead the
    // ground becomes a sea of shadow: curses sink and flounder in it, Megumi
    // can surface anywhere (Shadow Step reaches the whole domain), and
    // shikigami rise out of any shadow, including the curses' own.
    this.domain = {
      name: 'Chimera Shadow Garden', icon: '🌑', key: 'chimera_garden', type: 3, color: 0x8a8aff, sound: 'garden', flash: 0x101020,
      duration: 8 + r('garden') * 2, radius: 24, sureHit: false,
      onStart: (g, d) => {
        g.toast?.('Incomplete domain — no sure-hit; shikigami rise from every shadow');
        const n = 2 + r('garden');
        const foes = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
        for (let i = 0; i < n; i++) { const e = foes[i % Math.max(1, foes.length)]; this.summon(i % 3 === 2 ? 'nue' : i % 2 ? 'toad' : 'dog', true, e?.pos); }
        d.rise = 1.4;
      },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt; d.rise -= dt;
        const list = [];
        for (const e of g.enemies) {
          if (e.dead || e.isDummy || !g.domainSys.inside(e.pos)) continue;
          list.push(e);
          e.slowT = 0.3;   // floundering in liquid shadow
          if (Math.random() < 0.15) g.particles.burst(e.pos.clone().setY(e.pos.y + 0.1), { count: 2, color: 0x05050a, additive: false, speed: 1.5, up: 1.2, life: 0.5, size: 0.3, sizeEnd: 0.9 });
        }
        // a curse is dragged under the shadow for a moment
        if (d.tick <= 0) {
          d.tick = 0.6;
          for (let i = 0; i < Math.min(3, list.length); i++) {
            const e = list[Math.floor(Math.random() * list.length)];
            g.combat.damageEnemy(e, 7, this.p, { stagger: 0.3, ceGain: 0 });
            if (!e.isBoss) e.sealT = Math.max(e.sealT ?? 0, 0.5);
            g.fx.darkRings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: 0x000000, r0: 0.4, r1: 1.8, dur: 0.4, thick: 0.3 });
            g.particles.burst(e.pos.clone().setY(e.pos.y + 0.2), { count: 10, color: 0x05050a, additive: false, speed: 3, up: 3, life: 0.5, size: 0.3, sizeEnd: 1.2 });
          }
        }
        // shikigami surface from a curse's shadow
        if (d.rise <= 0 && list.length) {
          d.rise = 1.6 - r('garden') * 0.3;
          const mine = g.allies.filter((a) => a.owner === this.p && !a.dead).length;
          if (mine < 6) { const e = list[Math.floor(Math.random() * list.length)]; this.summon(Math.random() < 0.6 ? 'dog' : 'toad', true, e.pos); }
        }
      },
    };
  }
  inMyGarden() { const d = this.game.domain; return d && d.caster === this.p && d.phase === 'hold'; }
  tick(dt) {
    // the whole garden is Megumi's shadow: Shadow Step recovers much faster
    if (this.inMyGarden()) this.slots.ranged.cdLeft = Math.max(0, this.slots.ranged.cdLeft - dt * 2);
  }
  summon(kind, free = false, at = null) {
    const g = this.game, p = this.p;
    const mine = g.allies.filter((a) => a.owner === p && a.kind === kind && !a.dead);
    const max = kind === 'dog' ? 2 : 1;
    // re-summoning refreshes: dismiss the oldest
    while (!free && mine.length >= max) mine.shift().despawn();
    const n = kind === 'dog' && !free ? 2 : 1;
    if (!free) this.cast(0.45, true);
    g.audio?.energy('summon');
    for (let i = 0; i < n; i++) {
      const side = new THREE.Vector3(Math.cos(p.facing), 0, -Math.sin(p.facing)).multiplyScalar(i ? 1.4 : -1.4);
      // from the summoner's shadow — or, inside the garden, from the shadow under a curse
      const pos = at ? at.clone().add(tmp.set((Math.random() - 0.5) * 2.4, 0, (Math.random() - 0.5) * 2.4)) : p.pos.clone().addScaledVector(p.aimDir, 1.2).add(side);
      const gy = g.world.groundBelow(pos.x, pos.z, (at ? at.y : p.pos.y) + 2); pos.y = isFinite(gy) ? gy : (at ? at.y : p.pos.y);
      const life = kind === 'dog' ? 20 + this.rank('dogs_totality') * 8 : kind === 'nue' ? 15 + this.rank('nue_storm') * 5 : 15;
      const hpMult = kind === 'dog' ? 1 + this.rank('dogs_totality') * 0.4 : kind === 'toad' ? 1 + this.rank('toad_grip') * 0.4 : 1;
      const a = new Ally(g, p, kind, pos, { life: free ? 10 : life, hpMult, dmgMult: 1 + this.rank('shikigami') * 0.2, color: (free ? Math.random() < 0.5 : i) ? 0x151518 : 0xf0f0f4 });
      if (kind === 'nue' && this.rank('nue_storm')) a.S = { ...a.S, cd: a.S.cd * (1 - 0.2 * this.rank('nue_storm')) };
      g.allies.push(a);
    }
  }
  shadowStep() {
    const g = this.game, p = this.p;
    const range = this.inMyGarden() ? 28 : 8 + this.rank('shadow_step') * 1.5;
    const to = p.aimPoint.clone(); tmp.subVectors(to, p.pos).setY(0);
    if (tmp.length() > range) to.copy(p.pos).addScaledVector(tmp.normalize(), range);
    const gy = g.world.groundBelow(to.x, to.z, p.pos.y + 3);
    if (!isFinite(gy) || Math.abs(gy - p.pos.y) > 4 || g.world.solidAt(to.x, gy + 0.5, to.z) || g.world.solidAt(to.x, gy + 1.5, to.z)) { g.audio?.ui('back'); return false; }
    to.y = gy;
    const puff = (at) => { g.particles.burst(at.clone().setY(at.y + 0.3), { count: 26, color: 0x05050a, additive: false, speed: 3, up: 1.5, life: 0.7, size: 0.5, sizeEnd: 2 }); g.fx.darkRings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: 0x000000, r0: 1.6, r1: 0.2, dur: 0.35, thick: 0.4 }); };
    puff(p.pos);
    p.iframes = Math.max(p.iframes, 0.45);
    p.object.visible = false;
    g.audio?.energy('teleport');
    setTimeout(() => {
      p.pos.copy(to); p.visY = to.y; p.vel.set(0, 0, 0); p.object.visible = true;
      puff(to);
      const dmg = 16 + this.rank('shadow_step') * 8;
      g.combat.aoe(to, 2.6, dmg, p, { knock: 7, stagger: 0.6 });
      g.fx.shockwave(to, SHADOW, 3);
      g.shake(0.2); g.audio?.impact(1.1);
    }, 170);
  }
}
registerKit('megumi', MegumiKit, MEGUMI_SKILLS);
