// Kasumi Miwa-style kit — Simple Domain / New Shadow Style. 21 abilities on
// the technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB            katana combo.
//   Iai            Quick Draw (start, RMB), Twin Draw, Piercing Thrust, Flash Draw
//                  (blinks through several curses, one cut each), Hundred Cuts
//   Simple Domain  Simple Domain (a circle at her feet: anything entering is cut by
//                  an automatic draw), Neutralise, Shield, Edge Cut, Counter Draw,
//                  Walking Circle
//   Batto          Batto (wide drawing slash), Rising Moon, Crescent Wave, Full
//                  Moon, Single Instant
//   New Shadow     Shadow Step, Hilt Strike, Sheathe, Afterimage Draw, Resolve
//   Talismans      Counter Mastery, Swordswoman, Kyoto Student, Calm Mind
//   F    Ultimate — Batto Sword Drawing: Simple Domain. Miwa has no Domain
//        Expansion; her signature is New Shadow Style's Simple Domain combined
//        with Batto: she roots herself in a wide circle and anything that
//        enters it (curse or projectile) is cut down by an automatic,
//        ultra-fast draw. It ends in one full-circle Batto.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
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
  { id: 'iai', name: 'Iai', icon: '🗡️', desc: 'Quick Draw and the other iai cuts reach further and cut deeper.', max: 3, req: 'ab:quick_draw', branch: 'Iai', tier: 1 },
  { id: 'circle', name: 'Simple Domain', icon: '⭕', desc: 'Bigger, longer-lasting Simple Domain.', max: 3, req: 'ab:simple_domain', branch: 'Simple Domain', tier: 2 },
  { id: 'counter', name: 'Counter Draw', icon: '↩️', desc: 'Simple Domain counters (and the ultimate\'s draws) hit harder.', max: 2, req: 'circle', branch: 'Simple Domain', tier: 3 },
  { id: 'batto', name: 'Batto', icon: '🌙', desc: 'Batto techniques are wider and hit harder.', max: 3, req: 'ab:batto', branch: 'Batto', tier: 2 },
  { id: 'flash', name: 'Flash Draw', icon: '⚡', desc: 'Flash Draw cuts one more curse per rank.', max: 2, req: 'ab:flash_draw', branch: 'Iai', tier: 4 },
  { id: 'savings', name: 'Broke Sorcerer', icon: '💴', desc: 'Every yen counts: +10% Cursed Energy gain per rank.', max: 2, branch: 'New Shadow', tier: 0 },
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
    this.counterMul = 1; this.sdMul = 1;
    this.branches = ['Iai', 'Simple Domain', 'Batto', 'New Shadow'];
    this.library = {
      // ---- Iai
      quick_draw: ability({ name: 'Quick Draw', icon: '🗡️', kind: 'basic', desc: 'An iai dash-cut along a line.', cd: 1.3, ce: 0, branch: 'Iai', tier: 0, start: true, legacy: 'ranged', use: () => this.quickDraw() }),
      twin_draw: ability({ name: 'Iai: Twin Draw', icon: '✖️', kind: 'basic', desc: 'Draw and cut twice in an X across the curses in front of you.', cd: 1.6, ce: 0, branch: 'Iai', tier: 1, req: 'quick_draw', use: () => this.twinDraw() }),
      iai_thrust: ability({ name: 'Iai: Piercing Thrust', icon: '🪡', kind: 'basic', desc: 'Step in with a lightning thrust that runs through every curse in a long, narrow line.', cd: 2, ce: 3, branch: 'Iai', tier: 2, req: 'quick_draw', use: () => this.iaiThrust() }),
      flash_draw: ability({ name: 'Flash Draw', icon: '⚡', kind: 'technique', desc: 'Blink through several curses in a row, one cut each.', cd: 15, ce: 28, branch: 'Iai', tier: 3, legacy: 't3', req: 'twin_draw', use: () => this.flashDraw() }),
      hundred_cuts: ability({ name: 'Iai: Hundred Cuts', icon: '🌪️', kind: 'technique', desc: 'Step into the marked circle and draw again and again: a storm of cuts on every curse inside.', cd: 18, ce: 30, branch: 'Iai', tier: 4, req: 'flash_draw', use: () => this.hundredCuts() }),
      // ---- Simple Domain
      simple_domain: ability({ name: 'Simple Domain', icon: '⭕', kind: 'defence', desc: 'A small circle around your feet; anything that enters it (curses or their projectiles) is cut down by an automatic draw. Stepping out breaks it.', cd: 12, ce: 14, branch: 'Simple Domain', tier: 1, legacy: 't1', use: () => this.simpleDomain() }),
      sd_neutralise: ability({ name: 'Simple Domain: Neutralise', icon: '🚫', kind: 'defence', desc: 'Flash the circle open for an instant: nearby projectiles are cut from the air and curses winding up are interrupted.', cd: 8, ce: 8, branch: 'Simple Domain', tier: 2, req: 'simple_domain', use: () => this.neutralise() }),
      sd_shield: ability({ name: 'Simple Domain: Shield', icon: '🔵', kind: 'defence', desc: 'For 5s a tight circle moves with you: projectiles inside are cut and hits on you are halved.', cd: 15, ce: 12, branch: 'Simple Domain', tier: 2, req: 'simple_domain', use: () => this.sdShield() }),
      sd_edge: ability({ name: 'Simple Domain: Edge Cut', icon: '💫', kind: 'technique', desc: 'Widen the circle (its edge is marked) and draw once along it: every curse inside is cut.', cd: 9, ce: 14, branch: 'Simple Domain', tier: 3, req: 'sd_neutralise', use: () => this.edgeCut() }),
      sd_counter: ability({ name: 'Simple Domain: Counter Draw', icon: '↩️', kind: 'defence', desc: 'Hold a 1.2s counter stance: the first hit is negated and answered with a devastating draw.', cd: 10, ce: 10, branch: 'Simple Domain', tier: 3, req: 'sd_shield', use: () => this.counterStance() }),
      sd_walk: ability({ name: 'Simple Domain: Walking Circle', icon: '🚶‍♀️', kind: 'buff', desc: 'For 6s your Simple Domain travels with you: anything that comes close is cut automatically.', cd: 22, ce: 24, branch: 'Simple Domain', tier: 4, req: 'sd_counter', use: () => this.walkingCircle() }),
      // ---- Batto
      batto: ability({ name: 'Batto', icon: '🌙', kind: 'technique', desc: 'New Shadow Style: a wide, heavy drawing slash.', cd: 7, ce: 14, branch: 'Batto', tier: 1, legacy: 't2', use: () => this.batto() }),
      batto_rising: ability({ name: 'Batto: Rising Moon', icon: '🌒', kind: 'technique', desc: 'An upward drawing cut that throws the curses in front of you into the air.', cd: 6, ce: 8, branch: 'Batto', tier: 2, req: 'batto', use: () => this.risingMoon() }),
      batto_wave: ability({ name: 'Batto: Crescent Wave', icon: '🌊', kind: 'basic', desc: 'A draw so fast its edge flies on: a crescent of cursed energy that cuts through a line of curses.', cd: 2.2, ce: 4, branch: 'Batto', tier: 3, req: 'batto', use: () => this.crescentWave() }),
      batto_moon: ability({ name: 'Batto: Full Moon', icon: '🌕', kind: 'technique', desc: 'Turn on the spot and draw a full circle (marked first): every curse around you is cut.', cd: 9, ce: 14, branch: 'Batto', tier: 3, req: 'batto_rising', use: () => this.fullMoon() }),
      batto_instant: ability({ name: 'Batto: Single Instant', icon: '🌠', kind: 'technique', desc: 'Sink into a long, still stance (its reach is marked), then one draw too fast to see cuts everything in a wide arc.', cd: 26, ce: 45, branch: 'Batto', tier: 5, req: 'batto_moon', use: () => this.singleInstant() }),
      // ---- New Shadow Style footwork
      shadow_step: ability({ name: 'Shadow Step', icon: '👣', kind: 'movement', desc: 'A gliding sidestep that slips past attacks. Two charges.', cd: 4, ce: 3, branch: 'New Shadow', tier: 1, maxCharges: 2, chargesLeft: 2, gateTime: 0.3, use: () => this.shadowStep() }),
      hilt_strike: ability({ name: 'Hilt Strike', icon: '🔨', kind: 'basic', desc: 'Drive the hilt into the curses in front of you, stunning them.', cd: 2.4, ce: 0, branch: 'New Shadow', tier: 2, req: 'shadow_step', use: () => this.hiltStrike() }),
      sheathe: ability({ name: 'Sheathe', icon: '🧘‍♀️', kind: 'buff', desc: 'Return the blade and breathe: your next three draws (iai and Batto) deal 60% more damage.', cd: 14, ce: 6, branch: 'New Shadow', tier: 2, req: 'shadow_step', use: () => this.sheathe() }),
      afterimage: ability({ name: 'Afterimage Draw', icon: '💨', kind: 'movement', desc: 'Vanish and reappear at the aim point, cutting everything along the way.', cd: 7, ce: 8, branch: 'New Shadow', tier: 3, req: 'hilt_strike', use: () => this.afterimage() }),
      resolve: ability({ name: 'Resolve', icon: '🔥', kind: 'buff', desc: '"I want to be useful too." For 8s: +15% speed, +15% critical chance, +30% Cursed Energy gain.', cd: 26, ce: 12, branch: 'New Shadow', tier: 4, req: 'sheathe', use: () => this.resolve() }),
    };
    this.passives = {
      counter_mastery: passive({ name: 'Counter Mastery', icon: '↩️', desc: 'Automatic counter cuts deal 30% more damage.', branch: 'Simple Domain', tier: 2, req: 'simple_domain', apply: (pl, k) => { k.counterMul *= 1.3; } }),
      swordswoman: passive({ name: 'Swordswoman', icon: '⚔️', desc: '+12% melee damage; Quick Draw recovers 20% faster.', branch: 'Iai', tier: 2, req: 'twin_draw', apply: (pl, k) => { pl.stats.meleeMult += 0.12; k.library.quick_draw.cd *= 0.8; } }),
      kyoto_student: passive({ name: 'Kyoto Student', icon: '🏯', desc: '+15 max health and +15% Cursed Energy gain.', branch: 'New Shadow', tier: 2, req: 'shadow_step', apply: (pl) => { pl.maxHp += 15; pl.hp += 15; pl.stats.ceGain += 0.15; } }),
      calm_mind: passive({ name: 'Calm Mind', icon: '🍃', desc: 'Simple Domain circles are 25% wider and last 50% longer.', branch: 'Simple Domain', tier: 3, req: 'sd_shield', apply: (pl, k) => { k.sdMul *= 1.25; k.sdLife = 1.5; } }),
    };
    this.ultimate = { name: 'Batto Sword Drawing: Simple Domain', icon: '⭕', use: () => this.battoDomain() };
    this.sd = null; this.ult = null;
  }
  // a single automatic iai cut on a curse
  counterCut(e, dmg, face = true) {
    const g = this.game, p = this.p;
    dmg *= this.counterMul;
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
    const dmg = (15 + rk * 6) * this.drawBonus();
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
    this.sd = { c: p.pos.clone(), R: (3 + rk * 0.5) * this.sdMul, t: (4 + rk * 1.2) * (this.sdLife ?? 1), ring: 0, last: new Map() };
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
    const bonus = this.drawBonus();
    this.after(0.32, () => {
      const R = 4.8 + rk * 0.6;
      const dir = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      p.action = { type: 'attack', step: { style: 'swingR', strike: 0.35, windup: 0.1 }, style: 'swingR', dur: 0.35, elapsed: 0, t: 0.1, windup: 0.1, strike: 0.35, struck: true, moveScale: 0.2 };
      const hits = g.domainSys?.sureHit(p) ? g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos)) : g.combat.query(p.pos, dir, R, 1.75);
      for (const e of hits) {
        g.combat.damageEnemy(e, (42 + rk * 14) * bonus, p, { knock: tmp2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), stagger: 0.9 });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), null, { color: SKY, big: true });
      }
      g.fx.slashArc(p.pos, p.facing, STEEL, R, 1.1, 0.22);
      g.fx.slashArc(p.pos, p.facing, SKY, R * 0.85, 1.1, 0.3);
      g.combat.hitBlocks(p.pos, dir, R, 1.75, 40, p);
      if (hits.length) { g.hitStop(0.08); g.shake(0.35); g.fx.chroma(0.4); }
      g.fx.flash(0xc0e0ff, 0.15, 0.08);
      g.audio?.energy('slash'); g.audio?.impact(1.3);
    });
  }
  // ------------------------------------------------------------- Flash Draw
  flashDraw() {
    const g = this.game, p = this.p;
    const n = 3 + this.rank('flash');
    const sure = g.domainSys?.sureHit(p);
    const list = g.enemies.filter((e) => !e.dead && !e.isDummy && (sure ? g.domainSys.inside(e.pos) : e.pos.distanceTo(p.pos) < 11))
      .sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, n);
    if (!list.length) { g.toast?.('No curses in reach'); g.audio?.ui('back'); return false; }
    p.invulnerable = true; this.flashing = true;
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
      if (i < list.length) { this.after(0.11, cut); return; }
      this.after(0.14, () => {
        p.invulnerable = false; this.flashing = false; p.action = null; g.fx.dimTarget = 0;
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: SKY, r0: 0.3, r1: 3, dur: 0.3, thick: 0.1 });
        g.audio?.tone({ freq: 1400, to: 700, dur: 0.3, gain: 0.06, type: 'sine', rev: 0.5 });
        if (p.pos.distanceTo(start) > 30) p.pos.copy(start);
      });
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
  dispose() {
    super.dispose(); this.endUlt();
    if (this.flashing || this.cutting) { this.p.invulnerable = false; this.game.fx.dimTarget = 0; if (this.p.action?.lock) this.p.action = null; }
    for (const o of this.temps ?? []) this.game.scene.remove(o); this.temps?.clear();
  }
  // ============================================================== library abilities
  temp(o) { (this.temps || (this.temps = new Set())).add(o); this.game.scene.add(o); return o; }
  untemp(o) { this.temps?.delete(o); this.game.scene.remove(o); }
  warn(c, R, dur, col = SKY) {
    const g = this.game, y = this.groundAt(c.x, c.z, c.y) + 0.07;
    g.fx.rings.spawn(tmp.set(c.x, y, c.z), { color: col, r0: R, r1: R, dur, thick: 0.1 });
    g.fx.rings.spawn(tmp.set(c.x, y + 0.01, c.z), { color: col, r0: R, r1: 0.3, dur, thick: 0.3 });
  }
  // Sheathe: the next three draws hit 60% harder
  drawBonus() {
    const b = this.buffs.get('sheathe'); if (!b) return 1;
    if (--b.charges <= 0) b.left = 0.01;
    this.game.particles.burst(this.handPos(), { count: 12, color: STEEL, speed: 4, life: 0.3, size: 0.1, shape: 1, intensity: 3 });
    return 1.6;
  }
  swing(style = 'swingR', dur = 0.25) { this.p.action = { type: 'attack', step: { style, strike: 0.4, windup: 0.1 }, style, dur, elapsed: 0, t: 0.1, windup: 0.1, strike: 0.4, struck: true, moveScale: 0.2 }; }
  // ---- Iai
  twinDraw() {
    const g = this.game, p = this.p, f = this.fwd(), rk = this.rank('iai'), bonus = this.drawBonus();
    p.facing = this.aimAngle();
    for (let i = 0; i < 2; i++) this.after(i * 0.12, () => {
      this.swing(i ? 'swingL' : 'swingR', 0.2);
      for (const e of this.foes(p.pos, 3.6, f, 0.65)) { this.hit(e, (12 + rk * 4) * bonus, { melee: true, stagger: 0.35, knock: f.clone().multiplyScalar(2) }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), null, { color: SKY }); }
      const c = p.pos.clone().addScaledVector(f, 2).setY(p.pos.y + 1.1);
      const d = tmp2.set(f.z * (i ? -1 : 1), i ? 0.5 : -0.5, -f.x * (i ? -1 : 1)).normalize();
      g.fx.slashLine(c.clone().addScaledVector(d, -1.8), d.clone(), 3.6, STEEL, 0.3, 0.16);
      g.audio?.energy('slash');
    });
  }
  iaiThrust() {
    const g = this.game, p = this.p, f = this.fwd(), L = 7.5, bonus = this.drawBonus(), from = p.pos.clone();
    this.dash(f, 2, 0.12, { color: SKY });
    this.line(from, f, L, 0.7, (e) => { this.hit(e, (26 + this.rank('iai') * 6) * bonus, { stagger: 0.5, knock: f.clone().multiplyScalar(3) }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), f, { color: SKY }); });
    g.fx.slashLine(from.clone().setY(from.y + 1.1), f, L, STEEL, 0.18, 0.2); g.fx.slashLine(from.clone().setY(from.y + 1.1), f, L, SKY, 0.4, 0.14);
    g.audio?.energy('slash'); g.audio?.whoosh(1.1);
  }
  hundredCuts() {
    const g = this.game, p = this.p, c = this.aimGround(8), R = 3.4;
    this.warn(c, R, 0.25);
    this.blink(c, { color: SKY, quiet: true });
    p.invulnerable = true; this.cutting = true;
    p.action = { type: 'cast', dur: 9, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.fx.dimTarget = 0.35; g.audio?.charge(0.3, 1.6);
    const dmg = 12 + this.rank('iai') * 3;
    let n = 0;
    this.during(1.3, (t) => {
      const want = Math.floor(t / 0.1);
      while (n < want && n < 13) {
        n++;
        const list = this.foes(c, R + 0.5);
        const at = list.length ? list[Math.floor(Math.random() * list.length)] : null;
        const a = Math.random() * Math.PI * 2, rr = Math.random() * R;
        const pos = at ? at.pos.clone().setY(at.pos.y + at.height * 0.55) : tmp.set(c.x + Math.cos(a) * rr, c.y + 1, c.z + Math.sin(a) * rr).clone();
        const d = tmp2.set(Math.cos(a), (Math.random() - 0.5) * 0.8, Math.sin(a)).normalize();
        g.fx.slashLine(pos.clone().addScaledVector(d, -1.6), d.clone(), 3.2, n % 2 ? STEEL : SKY, 0.2, 0.15);
        if (at) { this.hit(at, dmg, { stagger: 0.3, unblockable: true, knock: new THREE.Vector3() }); g.fx.hitSpark(pos, null, { color: SKY }); }
        p.facing = a; this.swing(n % 2 ? 'swingL' : 'swingR', 0.1); p.action.lock = true; p.action.hold = true; p.action.dur = 9;
        g.audio?.energy('slash');
      }
    }, () => {
      p.invulnerable = false; this.cutting = false; g.fx.dimTarget = 0; p.action = null;
      for (const e of this.foes(c, R + 0.5)) { this.hit(e, dmg * 3, { stagger: 1, unblockable: true, knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(8) }); g.fx.slashX(e.pos.clone().setY(e.pos.y + e.height * 0.55), 2.4, SKY); }
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: SKY, r0: R, r1: R + 2, dur: 0.3, thick: 0.15 });
      g.shake(0.5); g.hitStop(0.08); g.audio?.impact(1.6);
    });
  }
  // ---- Simple Domain
  neutralise() {
    const g = this.game, p = this.p, R = 4 * this.sdMul;
    p.action = { type: 'sign', dur: 0.3, elapsed: 0, t: 0, moveScale: 0.3 };
    this.cutProjectiles(p.pos, R + 2);
    for (const e of this.foes(p.pos, R)) { if (e.state === 'windup' || e.isBoss) { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.6; } this.counterCut(e, 10, false); }
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: SKY, r0: 0.3, r1: R, dur: 0.2, thick: 0.15 });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: STEEL, r0: R, r1: R + 0.5, dur: 0.3, thick: 0.06 });
    g.audio?.tone({ freq: 990, to: 660, dur: 0.25, gain: 0.08, type: 'sine', rev: 0.5 });
  }
  sdShield() {
    const g = this.game, p = this.p, R = 2.4 * this.sdMul;
    p.action = { type: 'sign', dur: 0.3, elapsed: 0, t: 0, moveScale: 0.3 };
    g.audio?.tone({ freq: 660, to: 990, dur: 0.3, gain: 0.08, type: 'sine', rev: 0.5 });
    let ring = 0;
    this.buff('sd_shield', 5 * (this.sdLife ?? 1), {
      incoming: (a) => a * 0.5,
      onTick: (dt) => {
        ring -= dt;
        if (ring <= 0) { ring = 0.15; g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: SKY, r0: R, r1: R, dur: 0.18, thick: 0.08 }); }
        this.cutProjectiles(p.pos, R);
      },
    });
  }
  edgeCut() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = (5 + this.rank('circle') * 0.4) * this.sdMul;
    p.action = { type: 'cast', dur: 0.45, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    this.warn(c, R, 0.35);
    g.audio?.charge(0.35, 1.6);
    this.after(0.35, () => {
      if (p.action?.lock) p.action = null;
      this.swing('spin', 0.3);
      for (const e of this.foes(c, R)) { this.counterCut(e, 32 + this.rank('counter') * 8, false); }
      this.cutProjectiles(c, R);
      g.fx.slashArc(p.pos, p.facing, STEEL, R, Math.PI, 0.25); g.fx.slashArc(p.pos, p.facing, SKY, R * 0.9, Math.PI, 0.3, true);
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: STEEL, r0: R, r1: R + 0.6, dur: 0.25, thick: 0.15 });
      g.shake(0.3); g.hitStop(0.05); g.audio?.impact(1.2);
    });
  }
  counterStance() {
    const g = this.game, p = this.p;
    p.action = { type: 'sign', dur: 0.3, elapsed: 0, t: 0, moveScale: 0 };
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: STEEL, r0: 1.6, r1: 1.6, dur: 1.2, thick: 0.12 });
    g.audio?.tone({ freq: 1200, to: 1250, dur: 0.3, gain: 0.05, type: 'sine', rev: 0.6 });
    this.buff('sd_counter', 1.2, {
      incoming: (a, src) => {
        const b = this.buffs.get('sd_counter'); if (b) b.left = 0.01;
        const t = src && g.enemies.includes(src) && !src.dead ? src : this.target(6);
        p.iframes = Math.max(p.iframes, 0.5);
        if (t) {
          if (t.pos.distanceTo(p.pos) < 8) this.closeIn(t, SKY);
          this.counterCut(t, 60 + this.rank('counter') * 15, true);
          g.fx.slashX(t.pos.clone().setY(t.pos.y + t.height * 0.55), 2.6, STEEL);
        }
        for (const e of this.foes(p.pos, 3)) if (e !== t) this.counterCut(e, 28, false);
        g.fx.flash(0xe0f0ff, 0.25, 0.1); g.hitStop(0.08); g.shake(0.35); g.audio?.impact(1.6);
        return 0;
      },
      onTick: () => { if (Math.random() < 0.4) g.particles.burst(this.handPos(), { count: 1, color: STEEL, speed: 0.4, life: 0.3, size: 0.1 }); },
    });
  }
  walkingCircle() {
    const g = this.game, p = this.p, R = 2.6 * this.sdMul, last = new Map();
    p.action = { type: 'sign', dur: 0.35, elapsed: 0, t: 0, moveScale: 0.3 };
    g.toast?.('Simple Domain: Walking Circle'); g.audio?.tone({ freq: 660, to: 990, dur: 0.4, gain: 0.08, type: 'sine', rev: 0.5 });
    let ring = 0;
    this.buff('sd_walk', 6 * (this.sdLife ?? 1), {
      onTick: (dt) => {
        ring -= dt;
        if (ring <= 0) { ring = 0.15; g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: SKY, r0: R, r1: R, dur: 0.18, thick: 0.08 }); g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: STEEL, r0: R * 0.3, r1: R * 0.3, dur: 0.18, thick: 0.04 }); }
        this.cutProjectiles(p.pos, R);
        for (const e of this.foes(p.pos, R)) {
          if (g.time - (last.get(e) ?? -9) < 0.5) continue;
          last.set(e, g.time);
          this.counterCut(e, 22 + this.rank('counter') * 8, false);
        }
      },
    });
  }
  // ---- Batto
  risingMoon() {
    const g = this.game, p = this.p, f = this.fwd(), bonus = this.drawBonus(), rk = this.rank('batto');
    p.facing = this.aimAngle();
    this.swing('uppercut', 0.3);
    for (const e of this.foes(p.pos, 3.8 + rk * 0.3, f, 0.75)) {
      this.hit(e, (30 + rk * 8) * bonus, { stagger: 0.8, knock: f.clone().multiplyScalar(2) });
      if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 11);
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: SKY, big: true });
    }
    const c = p.pos.clone().addScaledVector(f, 1.5).setY(p.pos.y + 0.2);
    g.fx.slashLine(c, tmp2.set(f.x * 0.3, 1, f.z * 0.3).normalize().clone(), 3.6, STEEL, 0.35, 0.2);
    g.fx.slashLine(c, tmp2.set(f.x * 0.3, 1, f.z * 0.3).normalize().clone(), 3.2, SKY, 0.6, 0.25);
    g.audio?.energy('slash'); g.audio?.impact(1.2); g.shake(0.2);
  }
  crescentWave() {
    const g = this.game, p = this.p, f = this.fwd(), bonus = this.drawBonus(), rk = this.rank('batto');
    p.facing = this.aimAngle();
    this.swing('swingR', 0.25);
    const pr = g.projectiles.fire({ pos: this.handPos(), vel: f.clone().multiplyScalar(26), team: 'player', shape: 'slash', color: SKY, emissive: 5, scale: 1.2, life: 0.55, radius: 0.9, pierce: true,
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: STEEL, speed: 0.5, life: 0.2, size: 0.15, sizeEnd: 0.05, intensity: 3 }),
      onHit: (e, q) => { this.hit(e, (26 + rk * 6) * bonus, { stagger: 0.5, knock: q.vel.clone().setLength(3) }); g.fx.hitSpark(q.pos, null, { color: SKY }); } });
    if (pr) pr.mesh.rotation.z = 0;
    g.audio?.energy('slash');
  }
  fullMoon() {
    const g = this.game, p = this.p, rk = this.rank('batto'), R = 4.2 + rk * 0.4;
    p.action = { type: 'cast', dur: 0.35, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    this.warn(p.pos, R, 0.25);
    const bonus = this.drawBonus();
    g.audio?.charge(0.25, 1.6);
    this.after(0.25, () => {
      if (p.action?.lock) p.action = null;
      this.swing('spin', 0.35);
      for (const e of this.foes(p.pos, R)) { this.hit(e, (38 + rk * 10) * bonus, { stagger: 0.8, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(8) }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), null, { color: SKY, big: true }); }
      g.fx.slashArc(p.pos, p.facing, STEEL, R, Math.PI, 0.25); g.fx.slashArc(p.pos, p.facing, SKY, R * 0.85, Math.PI, 0.3, true);
      this.cutProjectiles(p.pos, R);
      g.shake(0.35); g.hitStop(0.05); g.audio?.energy('slash'); g.audio?.impact(1.4);
    });
  }
  singleInstant() {
    const g = this.game, p = this.p, rk = this.rank('batto'), R = 9 + rk, arc = 0.9, ch = 1;
    p.action = { type: 'cast', dur: ch + 0.2, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    const bonus = this.drawBonus();
    g.audio?.charge(ch, 1.8); g.fx.dimTarget = 0.3;
    let tel = 0;
    this.during(ch, (t, dt) => {
      tel -= dt;
      if (tel > 0) return;
      tel = 0.08;
      const base = this.aimAngle();
      for (const a of [base - arc, base + arc]) g.fx.slashLine(p.pos.clone().setY(p.pos.y + 0.15), tmp2.set(Math.sin(a), 0, Math.cos(a)).clone(), R, SKY, 0.08, 0.1);
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: SKY, r0: R, r1: R, dur: 0.1, thick: 0.06, arc: arc / Math.PI, rotY: base - Math.PI / 2 - arc });
    }, () => {
      g.fx.dimTarget = 0; if (p.action?.lock) p.action = null;
      const f = this.fwd();
      this.swing('swingR', 0.3);
      for (const e of this.foes(p.pos, R, f, arc)) { this.hit(e, (160 + rk * 35) * bonus, { unblockable: true, stagger: 1.2, knock: f.clone().multiplyScalar(10) }); g.fx.slashX(e.pos.clone().setY(e.pos.y + e.height * 0.55), 2.6, SKY); }
      g.combat.hitBlocks(p.pos, f, R, arc, 60, p);
      g.fx.slashArc(p.pos, p.facing, STEEL, R, arc / Math.PI * 2, 0.3); g.fx.slashArc(p.pos, p.facing, SKY, R * 0.8, arc / Math.PI * 2, 0.4);
      g.fx.flash(0xe0f0ff, 0.5, 0.15); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1.2, 0.5); g.fx.chroma(1);
      g.shake(0.7); g.hitStop(0.12); g.audio?.energy('slash'); g.audio?.impact(2);
    });
  }
  // ---- New Shadow Style footwork
  shadowStep() {
    const g = this.game, p = this.p;
    const v = tmp.set(p.vel.x, 0, p.vel.z);
    const dir = v.lengthSq() > 1 ? v.clone().normalize() : this.fwd().multiplyScalar(-1);
    this.dash(dir, 4.2, 0.15, { iframes: 0.35, color: SKY });
    g.audio?.whoosh(0.9);
  }
  hiltStrike() {
    const g = this.game, p = this.p, f = this.fwd();
    this.pose('punch', 0.28);
    this.after(0.08, () => {
      for (const e of this.foes(p.pos, 2.8, f, 0.8)) { this.hit(e, 12, { melee: true, stagger: 0.8, knock: f.clone().multiplyScalar(4) }); this.stun(e, 1.2); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.7), f, { color: 0xc8a040 }); }
      g.audio?.impact(1);
    });
  }
  sheathe() {
    const g = this.game, p = this.p;
    p.action = { type: 'sign', dur: 0.4, elapsed: 0, t: 0, moveScale: 0.3 };
    g.audio?.tone({ freq: 2400, to: 1800, dur: 0.15, gain: 0.06, type: 'square', filter: 6000 });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: STEEL, r0: 2, r1: 0.4, dur: 0.4, thick: 0.1 });
    const b = this.buff('sheathe', 12, { onTick: () => { if (Math.random() < 0.25) g.particles.burst(this.handPos(), { count: 1, color: SKY, speed: 0.4, life: 0.3, size: 0.1 }); } });
    b.charges = 3;
  }
  afterimage() {
    const g = this.game, p = this.p, from = p.pos.clone(), to = this.aimGround(8);
    if (!this.blink(to, { color: SKY })) return false;
    const d = tmp2.subVectors(p.pos, from).setY(0); const L = d.length(); if (L < 0.1) return;
    d.normalize();
    p.facing = Math.atan2(d.x, d.z);
    this.swing('swingR', 0.2);
    this.line(from, d, L, 1, (e) => { this.hit(e, 24 + this.rank('iai') * 6, { stagger: 0.6, unblockable: true, knock: new THREE.Vector3() }); g.fx.slashX(e.pos.clone().setY(e.pos.y + e.height * 0.55), 1.8, SKY); });
    g.fx.slashLine(from.clone().setY(from.y + 1.1), d.clone(), L, STEEL, 0.3, 0.25); g.fx.slashLine(from.clone().setY(from.y + 1.1), d.clone(), L, SKY, 0.6, 0.2);
    g.audio?.energy('teleport'); g.audio?.energy('slash');
  }
  resolve() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('Resolve'); g.fx.shockwave(p.pos, SKY, 3); g.audio?.charge(0.3, 1.4);
    this.statBuff('resolve', 8, { speed: 0.15, crit: 0.15, ceGain: 0.3 }, {
      onTick: () => { if (Math.random() < 0.3) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5), y: p.pos.y + Math.random() * 1.8, z: p.pos.z + (Math.random() - 0.5), vy: 0.6, life: 0.5, r: 0.8, g: 1.4, b: 2.2, size: 0.1, drag: 1, sizeEnd: 0.1 }); },
    });
  }
}
registerKit('miwa', MiwaKit, MIWA_SKILLS);
