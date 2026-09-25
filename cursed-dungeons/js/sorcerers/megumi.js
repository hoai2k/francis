// Megumi-style kit — Ten Shadows.
//   RMB  Shadow Step: sink into your shadow and burst out at the aim point.
//   1    Divine Dogs: two shadow wolves hunt the nearest curses.
//   2    Nue: a thunder-bird that dive-bombs with lightning.
//   3    Toad: a shikigami that tongue-pulls and stuns curses.
//   F    Domain: Chimera Shadow Garden — the floor floods with shadow, curses
//        are slowed and cut by tendrils, and extra shikigami rise from it.
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
    this.domain = {
      name: 'Chimera Shadow Garden', icon: '🌑', key: 'chimera_garden', type: 3, color: 0x8a8aff, sound: 'garden', flash: 0x101020,
      duration: 8 + r('garden') * 2, radius: 24,
      onStart: (g, d) => {
        const n = 2 + r('garden');
        for (let i = 0; i < n; i++) this.summon(i % 2 ? 'nue' : 'dog', true);
      },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt;
        for (const e of g.enemies) if (!e.dead && g.domainSys.inside(e.pos)) e.slowT = 0.3;
        if (d.tick <= 0) {
          d.tick = 0.45;
          const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
          for (let i = 0; i < Math.min(4, list.length); i++) {
            const e = list[Math.floor(Math.random() * list.length)];
            g.combat.damageEnemy(e, 8, this.p, { stagger: 0.2, ceGain: 0 });
            g.particles.burst(e.pos.clone().setY(e.pos.y + 0.2), { count: 10, color: 0x05050a, additive: false, speed: 3, up: 3, life: 0.5, size: 0.3, sizeEnd: 1.2 });
          }
        }
      },
    };
  }
  summon(kind, free = false) {
    const g = this.game, p = this.p;
    const mine = g.allies.filter((a) => a.owner === p && a.kind === kind && !a.dead);
    const max = kind === 'dog' ? 2 : 1;
    // re-summoning refreshes: dismiss the oldest
    while (!free && mine.length >= max) mine.shift().despawn();
    const n = kind === 'dog' && !free ? 2 : 1;
    this.cast(0.45, true);
    g.audio?.energy('summon');
    for (let i = 0; i < n; i++) {
      const side = new THREE.Vector3(Math.cos(p.facing), 0, -Math.sin(p.facing)).multiplyScalar(i ? 1.4 : -1.4);
      const pos = p.pos.clone().addScaledVector(p.aimDir, 1.2).add(side);
      const gy = g.world.groundBelow(pos.x, pos.z, p.pos.y + 2); pos.y = isFinite(gy) ? gy : p.pos.y;
      const life = kind === 'dog' ? 20 + this.rank('dogs_totality') * 8 : kind === 'nue' ? 15 + this.rank('nue_storm') * 5 : 15;
      const hpMult = kind === 'dog' ? 1 + this.rank('dogs_totality') * 0.4 : kind === 'toad' ? 1 + this.rank('toad_grip') * 0.4 : 1;
      const a = new Ally(g, p, kind, pos, { life: free ? 10 : life, hpMult, color: i ? 0x151518 : 0xf0f0f4 });
      if (kind === 'nue' && this.rank('nue_storm')) a.S = { ...a.S, cd: a.S.cd * (1 - 0.2 * this.rank('nue_storm')) };
      g.allies.push(a);
    }
  }
  shadowStep() {
    const g = this.game, p = this.p;
    const range = 8 + this.rank('shadow_step') * 1.5;
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
