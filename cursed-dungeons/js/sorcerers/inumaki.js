// Inumaki kit — Cursed Speech.
//   Every word is an order that curses must obey, but each one strains Toge's
//   throat — and the stronger the target, the harder the backlash. Past the
//   limit he coughs blood (loses HP) to keep speaking; cough syrup helps.
//   LMB  quick kick-and-jab combo.
//   RMB  "Blast away": a cone of commanding voice that hurls curses back.
//   1    "Don't move": everything nearby freezes in place.
//   2    "Get crushed": the aim point folds in on itself.
//   3    "Twist": the curses in front are wrung like rags.
//   F    Ultimate (Inumaki has no canon domain): "DIE" — the strongest order
//        he can give. Every curse in range dies outright and bosses are torn
//        apart, but the word rips his throat: a huge HP cost, and he cannot
//        speak (no words) for a while afterwards.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const VOICE = 0xb89aff, BLOOD = 0xc0102a, UNIFORM = 0x1b2030;
const tmp = new THREE.Vector3();

registerSorcerer('inumaki', {
  name: 'Inumaki', technique: 'Cursed Speech', rarity: 'epic', title: 'Cursed Speech', color: '#b89aff',
  desc: 'Words are commands — "Blast away", "Don\'t move", "Get crushed", "Twist" — each straining his throat (more against stronger curses) until he coughs blood. His ultimate order, "Die", kills but tears his throat.',
  ultimate: 'Die',
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

export const INUMAKI_SKILLS = [
  { id: 'voice', name: 'Commanding Voice', desc: 'Every word hits 12% harder per rank.', max: 3 },
  { id: 'throat', name: 'Trained Throat', desc: 'Words strain your throat less.', max: 3 },
  { id: 'syrup', name: 'Cough Syrup', desc: 'Throat strain recovers faster.', max: 2, req: 'throat' },
  { id: 'freeze', name: 'Don\'t Move', desc: 'Freeze lasts longer and reaches further.', max: 3 },
  { id: 'crush', name: 'Get Crushed', desc: 'Bigger, harder crush; "Twist" wrings harder.', max: 2 },
  { id: 'die', name: 'Die', desc: '"Die" reaches further and tears bosses harder, but costs more HP.', max: 2, req: 'voice' },
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
      t3: this.ability({ name: 'Twist', icon: '🌀', cd: 12, ce: 26, use: () => this.twist() }),
    };
    this.strain = 0; this.quietT = 0; this.muteT = 0;
    this.ultimate = { name: 'Die', icon: '☠️', use: () => this.die() };
  }
  // Backlash grows with the strength of whoever is ordered.
  weight(list) {
    let w = 1;
    for (const e of list) w += e.isBoss ? 0.9 : e.elite ? 0.25 : e.def?.grade === '1' ? 0.2 : 0.04;
    return Math.min(3, w);
  }
  // The throat is torn: no words for a while.
  mute() {
    if (this.muteT <= 0) return false;
    const g = this.game;
    if ((g.time - (this.muteMsgT ?? -9)) > 1.5) { this.muteMsgT = g.time; g.toast?.(`🩸 Toge's throat is torn — he can't speak (${Math.ceil(this.muteT)}s)`); g.audio?.ui('back'); }
    return true;
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
    this.muteT = Math.max(0, this.muteT - dt);
    if (this.quietT <= 0) this.strain = Math.max(0, this.strain - dt * (9 + this.rank('syrup') * 7));
    if (this.strain > 70 && Math.random() < dt * 2) g.particles.burst(this.mouth(), { count: 3, color: BLOOD, speed: 1.5, life: 0.5, size: 0.07, gravity: 12, shape: 1, intensity: 1.2 });
  }
  targets(range, arc) {
    const g = this.game, p = this.p;
    if (g.domainSys?.sureHit(p)) return g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
    return g.combat.query(p.pos, p.aimDir, range, arc);
  }
  dispose() { super.dispose(); if (this.dieT) { clearTimeout(this.dieT); this.dieT = null; } this.game.fx.dimTarget = 0; }
  // ------------------------------------------------------------ words
  blastAway() {
    if (this.mute()) return false;
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
    this.strainBy(5 * this.weight(this.targets(7, 0.6)));
  }
  dontMove() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, rk = this.rank('freeze');
    const R = 9 + rk * 1.5;
    this.cast(0.45, true);
    this.say('Don\'t move', true);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: VOICE, r0: 0.5, r1: R, dur: 0.5, thick: 0.08 });
    g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: 0x000000, r0: 0.5, r1: R * 0.9, dur: 0.6, thick: 0.2 });
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.6), 0.8, 0.5);
    let n = 0; const held = [];
    for (const e of g.enemies) {
      if (e.dead || e.isDummy || (e.pos.distanceTo(p.pos) > R && !g.domainSys?.sureHit(p))) continue;
      held.push(e);
      e.cancelAttack?.();
      if (e.isBoss) { e.slowT = Math.max(e.slowT ?? 0, 2 + rk * 0.5); g.combat.damageEnemy(e, 6, p, { stagger: 1 }); }
      else e.sealT = Math.max(e.sealT ?? 0, 2.2 + rk * 0.6);
      g.fx.summonCircle(e.pos, VOICE);
      n++;
    }
    g.shake(0.2); g.audio?.energy('infinity');
    this.strainBy(14 * this.weight(held));
    if (!n) g.toast?.('Nothing to stop');
  }
  getCrushed() {
    if (this.mute()) return false;
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
    this.strainBy(20 * this.weight(g.combat.query(at, tmp.set(0, 0, 1), R, Math.PI)));
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
  }
  twist() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, rk = this.rank('crush');
    let list = this.targets(8, 0.7);
    if (!list.length) { const e = g.nearestEnemy(p.pos, 7); if (e) list = [e]; }
    if (!list.length) { g.toast?.('No one to command'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    this.say('Twist', true);
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.6), 0.7, 0.4);
    for (const e of list) {
      e.slowT = Math.max(e.slowT ?? 0, 1.5);
      for (let k = 0; k < 3; k++) setTimeout(() => {
        if (e.dead) return;
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
        g.combat.damageEnemy(e, (16 + rk * 6) * this.mult, p, { stagger: 0.5, unblockable: true, color: '#b89aff' });
        g.fx.slashArc(e.pos, k * 2.1 + Math.random(), VOICE, 0.9 + e.radius, 0.9, 0.22, k % 2 === 1);
        g.particles.burst(at, { count: 8, color: k === 2 ? BLOOD : VOICE, speed: 4, life: 0.4, size: 0.1, shape: 1 });
        g.audio?.impact(0.9);
      }, 120 + k * 140);
    }
    g.shake(0.3);
    this.strainBy(18 * this.weight(list));
  }
  // Ultimate: "Die".
  die() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, rk = this.rank('die');
    const R = 15 + rk * 3;
    const list = g.enemies.filter((e) => !e.dead && !e.isDummy && e.pos.distanceTo(p.pos) < R);
    if (!list.length) { g.toast?.('No one to command'); g.audio?.ui('back'); return false; }
    p.action = { type: 'sign', dur: 1.0, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes ?? 0, 1.5);
    g.slowMo(1.4, 0.2); g.fx.dimTarget = 0.7;
    g.toast?.('「DIE」', 'domain');
    // the collar comes down: the snake-and-fangs seal glows as he draws breath
    g.particles.burst(this.mouth(), { count: 30, color: VOICE, speed: 2, life: 0.8, size: 0.15, sizeEnd: 0.02 });
    g.lights.flash(this.mouth(), VOICE, 8, 6, 0.9, { priority: 6 });
    g.audio?.charge(0.9, 0.5);
    for (const e of list) { e.cancelAttack?.(); if (!e.isBoss) e.sealT = Math.max(e.sealT ?? 0, 1.2); }
    const bosses = list.filter((e) => e.isBoss).length;
    this.dieT = setTimeout(() => {
      this.dieT = null;
      if (p.action?.type === 'sign') p.action = null;
      g.fx.dimTarget = 0;
      this.say('Die', false);
      g.fx.flash(0x5a0010, 0.8, 0.45); g.fx.blackFlash(0.25); g.fx.chroma(2);
      g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.7), 2, 0.9);
      for (let i = 0; i < 5; i++) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1 + i * 0.4, p.pos.z), { color: i % 2 ? BLOOD : VOICE, r0: 0.5, r1: R * (0.6 + i * 0.1), dur: 0.5 + i * 0.1, thick: 0.12 });
      g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: 0x000000, r0: 0.5, r1: R, dur: 0.8, thick: 0.6 });
      g.lights.flash(p.pos.clone().setY(p.pos.y + 2), BLOOD, 30, R + 6, 0.6, { priority: 8 });
      g.shake(1); g.hitStop(0.12);
      g.audio?.blackFlash(); g.audio?.energy('explode');
      list.forEach((e, i) => setTimeout(() => {
        if (e.dead) return;
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
        e.sealT = 0;
        const dmg = e.isBoss ? e.maxHp * (0.22 + rk * 0.04) + 200 : Math.max(e.hp, 1) * 6 + 300;
        g.combat.damageEnemy(e, dmg, p, { stagger: 1.5, unblockable: true, crit: false, color: '#ff3a5a', ceGain: 0 });
        g.particles.burst(at, { count: 30, color: BLOOD, speed: 7, life: 0.6, size: 0.14, gravity: 12, shape: 1, intensity: 1.6 });
        g.fx.darkRings.spawn(tmp.set(e.pos.x, e.pos.y + 0.07, e.pos.z), { color: 0x000000, r0: 0.3, r1: 3, dur: 0.5, thick: 0.4 });
        g.lights.flash(at, BLOOD, 10, 8, 0.4);
      }, 40 + i * 35));
      // the order tears Toge's throat
      const cost = Math.min(p.hp - 1, p.maxHp * (0.3 + rk * 0.04 + bosses * 0.08));
      if (cost > 0) {
        p.hp -= cost;
        g.fx.damageNumber(p.pos, cost, { color: '#ff3a4a', text: `-${Math.round(cost)} 🩸`, crit: true });
        g.particles.burst(this.mouth(), { count: 40, color: BLOOD, speed: 4, life: 0.8, size: 0.12, gravity: 14, shape: 1, intensity: 1.5 });
        g.audio?.hurt();
      }
      this.strain = 130; this.quietT = 4; this.muteT = 8;
      setTimeout(() => g.toast?.('🩸 The order tears Toge\'s throat — he can\'t speak for 8s'), 700);
    }, 900);
  }
}
registerKit('inumaki', InumakiKit, INUMAKI_SKILLS);
