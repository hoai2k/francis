// Panda-style kit — Abrupt Mutated Cursed Corpse (Gorilla / Triceratops cores).
//   LMB  heavy brawler combo.
//   RMB  Panda Clap: a thunderous clap that throws a shockwave cone forward.
//   1    Gorilla Core: swap to his "big brother" core — bigger, heavier hands —
//        with an opening straight whose impact goes through guard and armour.
//   2    Triceratops Core: a horned, damage-shrugging charge that stuns.
//   3    Three Cores: all three of his cores awake at once — bigger,
//        regenerating, and every hit sends a small through-guard beat.
//   F    Ultimate — Gorilla Core: Drumming Beat. Panda has no Domain Expansion;
//        his signature is the Gorilla core's Drumming Beat, a punch whose
//        shockwave ignores defence and passes straight through the body
//        (canon vs Mechamaru/Mahito-era fights). Here: three drumming blows,
//        the last a two-fisted beat that tears through everything in a line.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const RAGE = 0xff6a3a, HORN = 0x6adfa0, BLACK = 0x16161a, WHITE = 0xf0f0ea;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('panda', {
  name: 'Panda', technique: 'Gorilla Core', rarity: 'uncommon', title: 'Cursed Corpse', color: '#e8e8e8', ultimate: 'Gorilla Core: Drumming Beat',
  desc: 'A brawling cursed corpse with three cores: Gorilla core\'s Drumming Beat ignores defence, Triceratops core charges through anything.',
});

registerLook('panda', {
  paint: { skinTone: WHITE, hair: WHITE, top: WHITE, topTrim: WHITE, buttons: WHITE, collar: BLACK, sleeve: BLACK, pants: BLACK, shoes: BLACK, eye: BLACK, eyeWhite: BLACK, brow: BLACK, fringe: 0, hairSide: 0, hairBack: 0 },
  hair: () => [],
  hairColor: BLACK, accent: RAGE, emit: 0, scale: 1.34,
  cape: null,
  paintExtra(S) {
    // black arms, paws and shoulder band
    S.box(40, 16, 4, 12, 4, BLACK, 0.1); S.box(32, 48, 4, 12, 4, BLACK, 0.1);
    S.rect(16, 20, 24, 3, BLACK, 0.1); S.rect(20, 16, 8, 4, BLACK, 0.1);
    S.rect(21, 23, 6, 7, 0xfafaf4, 0.04);           // belly
    // eye patches with tiny shining eyes, nose and mouth
    S.rect(8, 11, 3, 3, BLACK, 0.05); S.rect(13, 11, 3, 3, BLACK, 0.05);
    S.px(10, 12, 0xffffff); S.px(13, 12, 0xffffff);
    S.rect(11, 14, 2, 1, BLACK, 0.02); S.px(11, 15, 0x6a5a5a); S.px(12, 15, 0x6a5a5a);
  },
  props(rig, K) {
    const black = K.mat(BLACK, { roughness: 0.9 }), white = K.mat(WHITE, { roughness: 0.9 });
    K.box(rig.head, 3, 3, 1.6, black, -3.6, 9.6, -0.5);   // round ears
    K.box(rig.head, 3, 3, 1.6, black, 3.6, 9.6, -0.5);
    K.box(rig.head, 4, 2.4, 1.4, white, 0, 2.4, 5);       // snout
    K.box(rig.head, 1.8, 1, 0.6, black, 0, 3.4, 5.8);     // nose
    K.box(rig.torso, 2.2, 2.2, 1.6, black, 0, 1.2, -2.6); // stubby tail
  },
});

export const PANDA_SKILLS = [
  { id: 'fists', name: 'Big Paws', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'clap', name: 'Panda Clap', desc: 'The clap reaches further and hits harder.', max: 3 },
  { id: 'drumming', name: 'Drumming Beat', desc: 'Gorilla Core\'s punch and the Drumming Beat ultimate hit harder and travel further.', max: 3 },
  { id: 'horn', name: 'Triceratops Core', desc: 'Longer charge and a longer damage-shrugging barrier.', max: 2 },
  { id: 'corpse', name: 'Cursed Corpse', desc: '+15 max HP per rank.', max: 3 },
  { id: 'release', name: 'Three Cores', desc: 'Three Cores lasts longer and heals more.', max: 2, req: 'drumming' },
];

// damage that ignores a curse's armour (Drumming Beat strikes inside the body)
const pierce = (e, dmg) => dmg / Math.max(0.25, 1 - (e.armor ?? 0));

class PandaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 13, range: 2.7, arc: 1.1, lunge: 6, knock: 4, stop: 0.05, shake: 0.18, trail: 0xffffff, sparkColor: 0xffffff },
      { style: 'swingL', dur: 0.34, windup: 0.3, strike: 0.52, dmg: 14, range: 2.8, arc: 1.2, lunge: 6, knock: 4.5, stop: 0.05, shake: 0.2, trail: 0xffffff },
      { style: 'swingR', dur: 0.34, windup: 0.3, strike: 0.52, dmg: 15, range: 2.8, arc: 1.2, lunge: 6, knock: 5, stop: 0.055, shake: 0.2, trail: 0xffffff },
      { style: 'slam', dur: 0.62, windup: 0.45, strike: 0.62, dmg: 30, range: 3.5, arc: Math.PI, lunge: 3, knock: 12, stop: 0.1, shake: 0.5, ring: true, ringColor: 0xffffff, stagger: 0.7, trail: 0xffffff },
    ];
    this.p.stats.meleeMult += r('fists') * 0.08;
    this.p.maxHp += r('corpse') * 15; this.p.hp = Math.min(this.p.hp + r('corpse') * 15, this.p.maxHp);
    this.slots = {
      ranged: this.ability({ name: 'Panda Clap', icon: '👏', cd: 1.8, ce: 0, use: () => this.clap() }),
      t1: this.ability({ name: 'Gorilla Core', icon: '🦍', cd: 7, ce: 12, use: () => this.gorilla() }),
      t2: this.ability({ name: 'Triceratops', icon: '🦏', cd: 9, ce: 14, use: () => this.triceratops() }),
      t3: this.ability({ name: 'Three Cores', icon: '🐼', cd: 26, ce: 40, use: () => this.fullRelease() }),
    };
    this.ultimate = { name: 'Gorilla Core: Drumming Beat', icon: '🥁', use: () => this.drummingBeat() };
    this.core = 'panda'; this.coreT = 0; this.releaseT = 0;
    this.baseScale = p.rig.root.scale.x;
  }
  dispose() {
    super.dispose();
    const rig = this.p.rig;
    rig.root.scale.setScalar(this.baseScale);
    rig.material.userData.glow.value.set(0x000000);
    if (this.horn) rig.head.remove(this.horn);
  }
  // ------------------------------------------------------------- cores
  setCore(core, dur) {
    const g = this.game, p = this.p;
    this.core = core; this.coreT = Math.max(this.coreT, dur);
    const big = core === 'gorilla' ? 1.14 : 1;
    p.rig.root.scale.setScalar(this.baseScale * (this.releaseT > 0 ? 1.24 : big));
    p.rig.material.userData.glow.value.set(core === 'gorilla' ? 0x2a0600 : 0x000000);
    if (core === 'gorilla') { g.fx.summonCircle(p.pos, RAGE); g.audio?.tone({ freq: 90, to: 60, dur: 0.4, gain: 0.3, type: 'sawtooth', filter: 600 }); }
  }
  get speedMul() { return this.core === 'gorilla' ? 0.92 : 1; }
  tick(dt) {
    const p = this.p;
    if (this.releaseT > 0) {
      this.releaseT -= dt;
      p.heal((1.5 + this.rank('release')) * dt, true);
      if (Math.random() < 0.4) this.game.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 0.3 + Math.random() * 2), { count: 1, color: RAGE, speed: 1, up: 2, life: 0.5, size: 0.25, sizeEnd: 0.05 });
      if (this.releaseT <= 0) { this.coreT = Math.min(this.coreT, 0.01); }
    }
    if (this.coreT > 0) {
      this.coreT -= dt;
      if (this.core === 'gorilla' && Math.random() < 0.25) this.game.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1.4), { count: 1, color: RAGE, speed: 1.5, life: 0.4, size: 0.18, shape: 1 });
      if (this.coreT <= 0) {
        this.core = 'panda';
        p.rig.root.scale.setScalar(this.baseScale);
        p.rig.material.userData.glow.value.set(0x000000);
      }
    }
  }
  onMeleeHit(e, step, dealt) {
    if (this.core !== 'gorilla' || e.dead) return;
    // Gorilla core: heavier hands, and in Full Release every blow drums
    this.game.combat.damageEnemy(e, dealt * 0.35, this.p, { melee: true, stagger: 0.1, ceGain: 0, crit: false, color: '#ff8a5a' });
    if (this.releaseT > 0) this.beatLine(e.pos, step.dmg * 0.5, 5, false);
  }
  // ------------------------------------------------------------- Panda Clap
  clap() {
    const g = this.game, p = this.p, rk = this.rank('clap');
    this.cast(0.35, true);
    const dir = tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing));
    const R = 5.5 + rk;
    const hits = g.combat.query(p.pos, dir, R, 0.65);
    for (const e of hits) g.combat.damageEnemy(e, 14 + rk * 5, p, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), stagger: 0.5 });
    const front = p.pos.clone().addScaledVector(dir, 1);
    g.fx.slashArc(p.pos, p.facing, 0xffffff, 2.2, 0.6, 0.15);
    g.fx.slashArc(p.pos, p.facing, 0xffffff, R * 0.8, 0.65, 0.25);
    g.fx.shockwave(front, 0xffffff, 2.5);
    g.particles.burst(front.setY(p.pos.y + 1.3), { count: 20, color: 0xffffff, speed: 14, dir: dir.clone(), spread: 0.5, life: 0.3, size: 0.12, drag: 4, shape: 1 });
    if (hits.length) { g.hitStop(0.05); g.shake(0.2); }
    g.audio?.noise({ dur: 0.18, gain: 0.6, type: 'highpass', freq: 1500, sweep: 400 });
    g.audio?.impact(1);
  }
  // ------------------------------------------------------------- Gorilla Core
  gorilla() {
    const p = this.p;
    this.setCore('gorilla', 8);
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const step = { style: 'punch', dur: 0.42, windup: 0.32, strike: 0.5, dmg: 0, range: 3, arc: 0.9, lunge: 12, knock: 0, stop: 0.08, shake: 0.3, trail: RAGE, custom: true };
    p.startAttack(step, 0);
    this.pendingBeat = p.action.step;
  }
  onStrike(step) {
    if (step !== this.pendingBeat) return;
    this.pendingBeat = null;
    const g = this.game, p = this.p, rk = this.rank('drumming');
    const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    const hits = g.domainSys?.sureHit(p) ? g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos)) : g.combat.query(p.pos, dir, 3, 0.9);
    const dmg = 30 + rk * 10;
    for (const e of hits) {
      g.combat.damageEnemy(e, pierce(e, dmg), p, { melee: true, knock: dir.clone().multiplyScalar(5), stagger: 0.8, unblockable: true, color: '#ff8a5a' });
      g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.55), dir, { color: RAGE, big: true });
    }
    this.beatLine(p.pos, dmg * 0.5, 5 + rk, false);
    g.hitStop(0.06); g.shake(0.3);
    g.audio?.impact(1.6); g.audio?.tone({ freq: 70, to: 40, dur: 0.3, gain: 0.4, type: 'sine', rev: 0.3 });
  }
  // ------------------------------------------------------------- Drumming Beat (ultimate)
  // The Gorilla core's beat: the shock is driven inside the body, so guard
  // and armour mean nothing, and it keeps going out the other side.
  drummingBeat() {
    const g = this.game, p = this.p, rk = this.rank('drumming');
    if (this.drumT) return false;
    this.setCore('gorilla', 10);
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    p.iframes = Math.max(p.iframes, 1.8);
    p.action = { type: 'raise', dur: 0.35, elapsed: 0, t: 0, moveScale: 0, lock: true, cancelable: false };
    g.toast?.('Gorilla Core: Drumming Beat', 'big');
    g.fx.dimTarget = 0.35; g.fx.flash(0x401000, 0.35, 0.2); g.slowMo(0.4, 0.4);
    g.audio?.tone({ freq: 55, to: 40, dur: 0.6, gain: 0.5, type: 'sawtooth', filter: 400, rev: 0.4 });
    const blows = [
      { at: 0.35, style: 'punch', dmg: 45 + rk * 14, L: 10 + rk * 2, spread: [0] },
      { at: 0.75, style: 'swingL', dmg: 55 + rk * 16, L: 11 + rk * 2, spread: [0] },
      { at: 1.3, style: 'slam', dmg: 130 + rk * 40, L: 16 + rk * 3, spread: [-0.35, 0, 0.35], final: true },
    ];
    let t = 0, i = 0;
    const T = this.drumT = {};
    g.addUpdater((dt) => {
      if (this.p.kit !== this || this.drumT !== T) { g.fx.dimTarget = 0; return false; }
      t += dt;
      const B = blows[i];
      if (B && t >= B.at - 0.22 && !B.anim) {
        B.anim = true;
        p.action = { type: 'attack', step: { style: B.style, strike: 0.5, windup: 0.3 }, style: B.style, dur: 0.32, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0, lock: true };
      }
      if (B && t >= B.at) { i++; this.drumBlow(B); }
      if (i < blows.length) return true;
      this.drumT = null; g.fx.dimTarget = 0;
      return false;
    });
  }
  drumBlow(B) {
    const g = this.game, p = this.p;
    const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    const front = p.pos.clone().addScaledVector(dir, 1.4);
    for (const e of g.combat.query(p.pos, dir, B.final ? 4.5 : 3.5, B.final ? 1.4 : 1)) {
      g.combat.damageEnemy(e, pierce(e, B.dmg), p, { melee: true, knock: dir.clone().multiplyScalar(B.final ? 16 : 6), stagger: 1, unblockable: true, color: '#ff8a5a' });
      g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.55), dir, { color: RAGE, big: true, crit: B.final });
      if (B.final && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
    }
    for (const a of B.spread) this.beatLine(p.pos, B.dmg * 0.75, B.L, true, dir.clone().applyAxisAngle(tmp2.set(0, 1, 0), a));
    g.fx.shockwave(front, RAGE, B.final ? 7 : 3.5);
    g.fx.screenWave(front.clone().setY(front.y + 1), B.final ? 1.6 : 0.6, B.final ? 0.6 : 0.3);
    g.fx.chroma(B.final ? 1.6 : 0.6);
    g.shake(B.final ? 1.1 : 0.45); g.hitStop(B.final ? 0.14 : 0.07);
    g.audio?.impact(B.final ? 2.5 : 1.8);
    g.audio?.tone({ freq: B.final ? 50 : 70, to: 30, dur: B.final ? 0.8 : 0.35, gain: 0.6, type: 'sine', rev: 0.4 });
    if (B.final) {
      g.combat.aoe(p.pos, 5, B.dmg * 0.4, p, { knock: 12, stagger: 0.8, unblockable: true });
      g.fx.explosion(front, RAGE, 3.5);
      g.fx.flash(0xffd0a0, 0.6, 0.25); g.slowMo(0.5, 0.3);
      g.audio?.blackFlash(); g.audio?.energy('explode');
    }
  }
  beatLine(from, dmg, L, big, dir = null) {
    const g = this.game, p = this.p;
    dir = dir ? dir.clone() : new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    const o = from.clone(), hit = new Set();
    const n = Math.ceil(L / 1.5);
    for (let i = 1; i <= n; i++) setTimeout(() => {
      const c = tmp.copy(o).addScaledVector(dir, i * 1.5);
      g.fx.rings.spawn(tmp2.set(c.x, g.fx.groundY(c) + 0.08, c.z), { color: RAGE, r0: 0.3, r1: big ? 1.8 : 1.1, dur: 0.25, thick: 0.18 });
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > 1.2 + e.radius || Math.abs(e.pos.y - c.y) > 3) continue;
        hit.add(e);
        g.combat.damageEnemy(e, pierce(e, dmg), p, { knock: dir.clone().multiplyScalar(big ? 9 : 4), stagger: 0.5, unblockable: true, ceGain: 1, color: '#ff8a5a' });
        g.fx.screenWave(tmp2.copy(e.pos).setY(e.pos.y + 1), big ? 0.4 : 0.2, 0.25);
      }
    }, i * 35);
    if (big) g.fx.slashLine(o.clone().setY(o.y + 1.1), dir, L, RAGE, 0.6, 0.25);
  }
  // ------------------------------------------------------------- Triceratops
  triceratops() {
    const g = this.game, p = this.p, rk = this.rank('horn');
    const dir = p.aimDir.clone().setY(0).normalize();
    const dur = 0.5 + rk * 0.1, speed = 19;
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'cast', both: true, dur: dur + 0.1, elapsed: 0, t: 0, lock: true, cancelable: false, faceAim: false, root: dir.clone().multiplyScalar(speed) };
    p.vel.x = dir.x * speed; p.vel.z = dir.z * speed;
    p.iframes = Math.max(p.iframes, dur);
    p.barrierT = Math.max(p.barrierT ?? 0, dur + 2 + rk);
    // the Triceratops core grows a horned frill for the charge
    const horn = new THREE.Group();
    const bone = new THREE.MeshStandardNodeMaterial({ color: 0xe8dcc0, roughness: 0.6, emissive: HORN, emissiveIntensity: 0.3 });
    const hb = (w, h, d, x, y, z, rx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * 0.058, h * 0.058, d * 0.058), bone); m.position.set(x * 0.058, y * 0.058, z * 0.058); m.rotation.x = rx; horn.add(m); };
    hb(1.2, 1.2, 4, -2, 8, 4.5, -0.5); hb(1.2, 1.2, 4, 2, 8, 4.5, -0.5); hb(1, 1, 2.5, 0, 3.5, 5.6, -0.2); hb(10, 5, 1, 0, 9, -1, -0.4);
    p.rig.head.add(horn); this.horn = horn;
    g.audio?.whoosh(1.4); g.audio?.tone({ freq: 120, to: 60, dur: 0.5, gain: 0.3, type: 'sawtooth', filter: 500 });
    const hit = new Set();
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      g.fx.landDust(p.pos);
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || e.pos.distanceTo(p.pos) > 1.6 + e.radius) continue;
        hit.add(e);
        g.combat.damageEnemy(e, 22 + rk * 8, p, { knock: dir.clone().multiplyScalar(14), stagger: 1.1 });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6);
        g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + 1), dir, { color: HORN, big: true });
        g.shake(0.25); g.hitStop(0.04); g.audio?.impact(1.4);
      }
      if (t < dur) return true;
      p.action = null;
      p.rig.head.remove(horn); this.horn = null;
      g.fx.shockwave(p.pos, HORN, 3);
      return false;
    });
  }
  // ------------------------------------------------------------- Full Release
  fullRelease() {
    const g = this.game, p = this.p;
    this.releaseT = 10 + this.rank('release') * 2.5;
    this.setCore('gorilla', this.releaseT);
    p.action = { type: 'raise', dur: 0.6, elapsed: 0, t: 0, moveScale: 0 };
    g.combat.aoe(p.pos, 4.5, 30, p, { knock: 12, stagger: 0.8 });
    g.fx.shockwave(p.pos, RAGE, 6); g.fx.explosion(p.pos, RAGE, 2.5);
    g.fx.flash(0x401000, 0.35, 0.2); g.fx.screenWave(p.pos, 1, 0.4);
    g.shake(0.6); g.hitStop(0.06);
    g.toast?.('Three Cores');
    g.audio?.tone({ freq: 60, to: 35, dur: 1, gain: 0.6, type: 'sawtooth', filter: 400, rev: 0.4 });
    g.audio?.energy('explode');
  }
}
registerKit('panda', PandaKit, PANDA_SKILLS);
