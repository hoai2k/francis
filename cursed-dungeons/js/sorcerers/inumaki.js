// Inumaki-style kit — Cursed Speech.
//   Every word is an order that curses must obey, but each one strains Toge's
//   throat; past the limit he coughs blood (loses HP) to keep speaking.
//   LMB  quick kick-and-jab combo.
//   RMB  "Blast away": a cone of commanding voice that hurls curses back.
//   1    "Don't move": everything nearby freezes in place.
//   2    "Get crushed": the aim point folds in on itself.
//   3    "Die": a massive killing word — it tears Toge's throat and costs HP.
//   F    Domain (invented — Inumaki has no canon domain): Cursed Speech:
//        Echo Chamber — "Sleep" lulls every curse inside, his voice echoes
//        "Twist" on them, and the domain closes on "EXPLODE".
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const VOICE = 0xb89aff, BLOOD = 0xc0102a, UNIFORM = 0x1b2030;
const tmp = new THREE.Vector3();

registerSorcerer('inumaki', {
  name: 'Inumaki', technique: 'Cursed Speech', rarity: 'epic', title: 'Cursed Speech', color: '#b89aff',
  desc: 'Words are commands — "Blast away", "Don\'t move", "Get crushed", "Die" — each straining his throat until he coughs blood; his Echo Chamber domain is invented, as Inumaki has none in canon.',
  domain: 'Cursed Speech: Echo Chamber',
});

registerLook('inumaki', {
  paint: { skinTone: 0xf2d6c2, hair: 0xe8e2f0, hairVolume: true, top: UNIFORM, collar: UNIFORM, pants: UNIFORM, eye: 0x7a5ac8, brow: 0xd8d0e8, fringe: 3, hairSide: 3, hairBack: 5 },
  hair: (m) => [
    { x: -2.5, y: 8, z: 1.5, w: 3, h: 3, d: 3, rx: 0.4, rz: 0.5, material: m },
    { x: 0, y: 8.4, z: 1.5, w: 3, h: 3, d: 3, rx: 0.5, material: m },
    { x: 2.5, y: 8, z: 1.5, w: 3, h: 3, d: 3, rx: 0.4, rz: -0.5, material: m },
    { x: -1.5, y: 8, z: -1.5, w: 3, h: 3, d: 3, rx: -0.5, rz: 0.3, material: m },
    { x: 1.5, y: 8, z: -1.5, w: 3, h: 3, d: 3, rx: -0.5, rz: -0.3, material: m },
  ],
  hairColor: 0xe8e2f0, accent: VOICE, emit: 0.25, cape: null,
  paintExtra(S) {
    // high zipped collar hides the mouth (and the snake-and-fang seal)
    S.rect(8, 13, 8, 3, UNIFORM, 0.06); S.rect(0, 13, 8, 3, UNIFORM, 0.06); S.rect(16, 13, 8, 3, UNIFORM, 0.06); S.rect(24, 13, 8, 3, UNIFORM, 0.06);
    S.px(11, 13, 0xc8ccd8); S.px(11, 14, 0xc8ccd8); S.px(11, 15, 0xc8ccd8);
    S.rect(40, 13, 8, 3, UNIFORM, 0.06);   // hat layer collar rim
  },
  props(rig, K) {
    const cloth = K.mat(UNIFORM, { roughness: 0.85 });
    K.box(rig.torso, 9.2, 3, 5.2, cloth, 0, 12.4, 0);           // collar column
    K.box(rig.torso, 0.6, 2.6, 0.4, K.mat(0xc8ccd8, { metalness: 0.8, roughness: 0.3 }), 0, 12.4, 2.7);   // zip
  },
});

registerDomainEnv('echo_chamber', {
  skyTop: 0x05030c, skyHorizon: 0x3a2a6a, fog: 0x100a20, fogDensity: 0.015, hemiSky: 0xc0a8ff, hemiGround: 0x0a0610, hemiI: 1.0, sun: 0xd8c8ff, sunI: 0.7,
  grade: { tint: [1.0, 0.95, 1.1], lift: [0.01, 0.0, 0.03], sat: 0.9, contrast: 1.15, vignette: 0.55 }, floor: B.tatami,
});

export const INUMAKI_SKILLS = [
  { id: 'voice', name: 'Commanding Voice', desc: 'Every word hits 12% harder per rank.', max: 3 },
  { id: 'throat', name: 'Trained Throat', desc: 'Words strain your throat less.', max: 3 },
  { id: 'syrup', name: 'Cough Syrup', desc: 'Throat strain recovers faster.', max: 2, req: 'throat' },
  { id: 'freeze', name: 'Don\'t Move', desc: 'Freeze lasts longer and reaches further.', max: 3 },
  { id: 'crush', name: 'Get Crushed', desc: 'Bigger, harder crush.', max: 2 },
  { id: 'die', name: 'Die', desc: '"Die" hits harder but costs more HP.', max: 2, req: 'voice' },
];

class InumakiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.26, windup: 0.26, strike: 0.48, dmg: 11, range: 2.5, arc: 1.1, lunge: 7, knock: 3, stop: 0.04, shake: 0.13, trail: VOICE, sparkColor: 0xe0d0ff, chainAt: 0.52 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 12, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: VOICE, sparkColor: 0xe0d0ff, chainAt: 0.55 },
      { style: 'spin', dur: 0.44, windup: 0.26, strike: 0.55, dmg: 19, range: 3, arc: Math.PI, lunge: 4, knock: 8, stop: 0.07, shake: 0.28, ring: true, ringColor: VOICE, trail: VOICE },
    ];
    this.mult = 1 + r('voice') * 0.12;
    this.slots = {
      ranged: this.ability({ name: 'Blast Away', icon: '📢', cd: 1.3, ce: 0, use: () => this.blastAway() }),
      t1: this.ability({ name: 'Don\'t Move', icon: '✋', cd: 9, ce: 14, use: () => this.dontMove() }),
      t2: this.ability({ name: 'Get Crushed', icon: '⬇️', cd: 7, ce: 16, use: () => this.getCrushed() }),
      t3: this.ability({ name: 'Die', icon: '☠️', cd: 18, ce: 35, use: () => this.die() }),
    };
    this.strain = 0; this.quietT = 0;
    this.domain = {
      name: 'Cursed Speech: Echo Chamber', icon: '🍙', key: 'echo_chamber', type: 1, color: VOICE, sound: 'void', flash: 0xd8c8ff,
      duration: 8, radius: 22,
      onStart: (g, d) => {
        this.say('Sleep', true);
        d.word = 1.4; d.n = 0;
        this.sleepAll(g, d);
      },
      onTick: (g, d, dt) => {
        if (Math.random() < 0.5) { const a = Math.random() * Math.PI * 2; g.fx.rings.spawn(tmp.set(d.center.x + Math.cos(a) * 6, d.center.y + 0.08, d.center.z + Math.sin(a) * 6), { color: VOICE, r0: 0.5, r1: 4, dur: 0.8, thick: 0.05 }); }
        d.word -= dt;
        if (d.word > 0) return;
        d.word = 1.3;
        this.sleepAll(g, d);
        const twist = d.n++ % 2 === 0;
        this.say(twist ? 'Twist' : 'Sleep', false);
        if (twist) for (const e of d.sleepers) if (!e.dead) {
          g.combat.damageEnemy(e, 14 * this.mult, this.p, { stagger: 0.2, ceGain: 0, unblockable: true, color: '#b89aff' });
          g.fx.slashArc(e.pos, Math.random() * 6.3, VOICE, 1.2, 0.6, 0.2);
        }
      },
      onEnd: (g, d) => {
        this.say('EXPLODE', true);
        for (const e of d.sleepers ?? []) if (!e.dead) {
          e.sealT = 0;
          g.fx.explosion(e.pos, VOICE, 2);
          g.combat.damageEnemy(e, 70 * this.mult, this.p, { stagger: 1, unblockable: true, knock: new THREE.Vector3(0, 0, 0) });
        }
        g.shake(0.6); g.audio?.energy('explode');
        this.strainBy(60, true);
      },
    };
  }
  sleepAll(g, d) {
    d.sleepers = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
    for (const e of d.sleepers) {
      if (e.isBoss) e.slowT = Math.max(e.slowT ?? 0, 1.5); else e.sealT = Math.max(e.sealT ?? 0, 1.6);
      if (Math.random() < 0.4) g.fx.damageNumber(e.pos, 0, { text: 'z z z', color: '#c8b8ff' });
    }
  }
  // ------------------------------------------------------------ the voice
  say(word, big) {
    const g = this.game, p = this.p;
    g.fx.damageNumber(p.pos.clone().setY(p.pos.y + 0.4), 0, { text: `「${word}」`, color: '#d8c8ff', crit: true });
    if (big) g.toast?.(`「${word.toUpperCase()}」`, 'big');
    g.audio?.tone({ freq: 180, to: 120, dur: 0.35, gain: 0.25, type: 'sawtooth', filter: 900, rev: 0.4 });
    g.audio?.noise({ dur: 0.3, gain: 0.25, type: 'bandpass', freq: 600, sweep: 200, q: 2, rev: 0.4 });
    const m = this.mouth();
    g.particles.burst(m, { count: 10, color: VOICE, speed: 5, life: 0.4, size: 0.12, shape: 2, dir: p.aimDir.clone(), spread: 0.5 });
  }
  mouth() { const p = this.p; return tmp.set(p.pos.x + Math.sin(p.facing) * 0.35, p.pos.y + 1.75, p.pos.z + Math.cos(p.facing) * 0.35).clone(); }
  // Returns the HP the word cost (0 when the throat can still take it).
  strainBy(n, quiet = false) {
    const g = this.game, p = this.p;
    this.strain = Math.min(130, this.strain + n * (1 - this.rank('throat') * 0.18));
    this.quietT = 1.6;
    if (this.strain < 100) return 0;
    const cost = Math.min(p.hp - 1, p.maxHp * 0.04 * (this.strain / 100));
    if (cost > 0) {
      p.hp -= cost;
      g.fx.damageNumber(p.pos, cost, { color: '#ff4a5a', text: `-${Math.round(cost)} 🩸` });
      g.particles.burst(this.mouth(), { count: 14, color: BLOOD, speed: 3, life: 0.6, size: 0.1, gravity: 14, shape: 1, intensity: 1.4 });
      g.fx.flash(0x400008, 0.15, 0.15);
      if (!quiet && (g.time - (this.coughT ?? -9)) > 4) { this.coughT = g.time; g.toast?.('🩸 Throat strained — words cost HP'); }
    }
    return cost;
  }
  tick(dt) {
    const g = this.game, p = this.p;
    this.quietT -= dt;
    if (this.quietT <= 0) this.strain = Math.max(0, this.strain - dt * (9 + this.rank('syrup') * 7));
    if (this.strain > 70 && Math.random() < dt * 2) g.particles.burst(this.mouth(), { count: 3, color: BLOOD, speed: 1.5, life: 0.5, size: 0.07, gravity: 12, shape: 1, intensity: 1.2 });
  }
  targets(range, arc) {
    const g = this.game, p = this.p;
    if (g.domainSys?.sureHit(p)) return g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
    return g.combat.query(p.pos, p.aimDir, range, arc);
  }
  // ------------------------------------------------------------ words
  blastAway() {
    const g = this.game, p = this.p;
    this.cast(0.32);
    this.say('Blast away', false);
    const face = Math.atan2(p.aimDir.x, p.aimDir.z);
    for (let i = 0; i < 4; i++) setTimeout(() => g.fx.slashArc(p.pos, face, VOICE, 1.6 + i * 1.6, 0.45, 0.25), i * 45);
    g.particles.burst(this.handPos(), { count: 24, color: VOICE, speed: 14, spread: 0.35, dir: p.aimDir.clone(), life: 0.4, size: 0.14, shape: 1 });
    for (const e of this.targets(7, 0.6)) {
      const k = tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(e.isBoss ? 4 : 15);
      g.combat.damageEnemy(e, 12 * this.mult, p, { knock: k, stagger: 0.5 });
      g.combat.hitBlocks(e.pos, p.aimDir, 1, Math.PI, 20, p);
    }
    g.combat.hitBlocks(p.pos, p.aimDir, 5, 0.5, 15, p);
    g.shake(0.15);
    this.strainBy(5);
  }
  dontMove() {
    const g = this.game, p = this.p, rk = this.rank('freeze');
    const R = 9 + rk * 1.5;
    this.cast(0.45, true);
    this.say('Don\'t move', true);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: VOICE, r0: 0.5, r1: R, dur: 0.5, thick: 0.08 });
    g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: 0x000000, r0: 0.5, r1: R * 0.9, dur: 0.6, thick: 0.2 });
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.6), 0.8, 0.5);
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || e.isDummy || (e.pos.distanceTo(p.pos) > R && !g.domainSys?.sureHit(p))) continue;
      e.cancelAttack?.();
      if (e.isBoss) { e.slowT = Math.max(e.slowT ?? 0, 2 + rk * 0.5); g.combat.damageEnemy(e, 6, p, { stagger: 1 }); }
      else e.sealT = Math.max(e.sealT ?? 0, 2.2 + rk * 0.6);
      g.fx.summonCircle(e.pos, VOICE);
      n++;
    }
    g.shake(0.2); g.audio?.energy('infinity');
    this.strainBy(18);
    if (!n) g.toast?.('Nothing to stop');
  }
  getCrushed() {
    const g = this.game, p = this.p, rk = this.rank('crush');
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const at = sure ? sure.pos.clone() : (g.nearestEnemy(p.aimPoint, 2.5)?.pos.clone() ?? p.aimPoint.clone());
    tmp.subVectors(at, p.pos).setY(0); if (!sure && tmp.length() > 10) at.copy(p.pos).addScaledVector(tmp.normalize(), 10);
    const gy = g.world.groundBelow(at.x, at.z, p.pos.y + 3); at.y = isFinite(gy) ? gy : p.pos.y;
    const R = 3.4 + rk * 0.7;
    this.cast(0.4);
    this.say('Get crushed', true);
    // the air above folds down
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R; g.particles.glow.emit(at.x + Math.cos(a) * rr, at.y + 4 + Math.random() * 2, at.z + Math.sin(a) * rr, 0, -18, 0, 0.25, 1.6, 1.2, 3, 0.18, 0, 0, 0.6, 1); }
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: VOICE, r0: R * 1.4, r1: 0.3, dur: 0.25, thick: 0.2 });
    setTimeout(() => {
      for (const e of g.combat.query(at, tmp.set(0, 0, 1), R, Math.PI)) {
        g.combat.damageEnemy(e, (46 + rk * 16) * this.mult, p, { stagger: 1, unblockable: true });
        e.vel.y = Math.min(e.vel.y, -8); e.slowT = Math.max(e.slowT ?? 0, 2);
      }
      g.combat.hitBlocks(at, tmp.set(0, 0, 1), R, Math.PI, 60, p);
      g.fx.shockwave(at, VOICE, R + 1.5); g.fx.debris(at.clone().setY(at.y + 0.3), 0x6a5a5a, 8);
      g.fx.darkRings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: 0x000000, r0: 0.3, r1: R, dur: 0.5, thick: 0.4 });
      g.fx.screenWave(at, 0.9, 0.4);
      g.shake(0.45); g.hitStop(0.06); g.audio?.impact(2);
    }, 220);
    this.strainBy(25);
  }
  die() {
    const g = this.game, p = this.p, rk = this.rank('die');
    let list = this.targets(10, 0.5);
    if (!list.length) { const e = g.nearestEnemy(p.pos, 8); if (e) list = [e]; }
    if (!list.length) { g.toast?.('No one to command'); g.audio?.ui('back'); return false; }
    this.cast(0.7, true, { lock: true });
    g.fx.dimTarget = 0.5; g.slowMo(0.45, 0.3);
    g.toast?.('「DIE」', 'domain');
    this.say('Die', false);
    g.audio?.blackFlash();
    setTimeout(() => {
      g.fx.dimTarget = 0;
      g.fx.flash(0x5a0010, 0.6, 0.3); g.fx.chroma(1.6); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.7), 1.5, 0.7);
      for (const e of list) {
        if (e.dead) continue;
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
        g.combat.damageEnemy(e, (150 + rk * 45) * this.mult, p, { stagger: 1.5, unblockable: true, crit: true, color: '#ff3a5a' });
        g.particles.burst(at, { count: 30, color: BLOOD, speed: 7, life: 0.6, size: 0.14, gravity: 12, shape: 1, intensity: 1.6 });
        g.fx.darkRings.spawn(tmp.set(e.pos.x, e.pos.y + 0.07, e.pos.z), { color: 0x000000, r0: 0.3, r1: 3, dur: 0.5, thick: 0.4 });
        g.lights.flash(at, BLOOD, 10, 8, 0.4);
      }
      g.shake(0.8); g.hitStop(0.1);
      // the word tears Toge's throat
      const cost = Math.min(p.hp - 1, p.maxHp * (0.15 + rk * 0.03));
      if (cost > 0) {
        p.hp -= cost;
        g.fx.damageNumber(p.pos, cost, { color: '#ff3a4a', text: `-${Math.round(cost)} 🩸`, crit: true });
        g.particles.burst(this.mouth(), { count: 30, color: BLOOD, speed: 4, life: 0.8, size: 0.12, gravity: 14, shape: 1, intensity: 1.5 });
        g.audio?.hurt();
      }
      this.strainBy(45, true);
    }, 300);
  }
}
registerKit('inumaki', InumakiKit, INUMAKI_SKILLS);
