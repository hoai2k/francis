// Panda-style kit — Abrupt Mutated Cursed Corpse (Gorilla / Triceratops cores).
//   LMB  heavy brawler combo.
//   RMB  Panda Clap: a thunderous clap that throws a shockwave cone forward.
//   1    Gorilla Core: Drumming Beat — swap to the Gorilla core and land a punch
//        that ignores defence; its shockwave passes straight through the curse
//        and everything lined up behind it. Gorilla core stays on briefly.
//   2    Triceratops Core: a horned, damage-shrugging charge that stuns.
//   3    Full Release: all cores awake — bigger, regenerating, and every hit is
//        a small Drumming Beat.
//   F    Domain: Cursed Corpse: Bamboo Grove (invented — Panda has no Domain
//        Expansion in canon): bamboo spears erupt under curses while Panda
//        stays in Gorilla core and patches himself up.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const RAGE = 0xff6a3a, HORN = 0x6adfa0, BAMBOO = 0x7ac850, BLACK = 0x16161a, WHITE = 0xf0f0ea;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('panda', {
  name: 'Panda', technique: 'Gorilla Core', rarity: 'uncommon', title: 'Cursed Corpse', color: '#e8e8e8', domain: 'Cursed Corpse: Bamboo Grove',
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

registerDomainEnv('bamboo_grove', {
  skyTop: 0x050a05, skyHorizon: 0x2a4a1a, fog: 0x0a160a, fogDensity: 0.022, hemiSky: 0xa0e08a, hemiGround: 0x0a1004, hemiI: 1.0, sun: 0xd0ffb0, sunI: 0.8,
  grade: { tint: [0.95, 1.08, 0.92], lift: [0.0, 0.02, 0.0], sat: 1.1, contrast: 1.15, vignette: 0.5 }, floor: B.moss_floor,
});

export const PANDA_SKILLS = [
  { id: 'fists', name: 'Big Paws', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'clap', name: 'Panda Clap', desc: 'The clap reaches further and hits harder.', max: 3 },
  { id: 'drumming', name: 'Drumming Beat', desc: 'Drumming Beat hits harder and travels further.', max: 3 },
  { id: 'horn', name: 'Triceratops Core', desc: 'Longer charge and a longer damage-shrugging barrier.', max: 2 },
  { id: 'corpse', name: 'Cursed Corpse', desc: '+15 max HP per rank.', max: 3 },
  { id: 'release', name: 'Full Release', desc: 'Full Release lasts longer and heals more.', max: 2, req: 'drumming' },
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
      t1: this.ability({ name: 'Drumming Beat', icon: '🦍', cd: 6, ce: 12, use: () => this.drumming() }),
      t2: this.ability({ name: 'Triceratops', icon: '🦏', cd: 9, ce: 14, use: () => this.triceratops() }),
      t3: this.ability({ name: 'Full Release', icon: '🐼', cd: 26, ce: 40, use: () => this.fullRelease() }),
    };
    this.domain = {
      name: 'Cursed Corpse: Bamboo Grove', icon: '🎋', key: 'bamboo_grove', type: 3, color: BAMBOO, sound: 'garden', flash: 0xc0ffa0,
      duration: 8, radius: 22,
      onStart: () => this.setCore('gorilla', 9),
      onTick: (g, d, dt) => {
        this.p.heal(4 * dt, true);
        d.tick = (d.tick ?? 0) - dt;
        if (d.tick > 0) return;
        d.tick = 0.3;
        const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
        if (list.length) this.bambooSpear(list[Math.floor(Math.random() * list.length)]);
      },
    };
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
  // ------------------------------------------------------------- Drumming Beat
  drumming() {
    const p = this.p;
    this.setCore('gorilla', 6);
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
    const dmg = 38 + rk * 14;
    for (const e of hits) {
      g.combat.damageEnemy(e, pierce(e, dmg), p, { melee: true, knock: dir.clone().multiplyScalar(4), stagger: 0.9, unblockable: true, color: '#ff8a5a' });
      g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.55), dir, { color: RAGE, big: true });
    }
    // the beat keeps travelling through the body and out the back
    this.beatLine(p.pos, dmg * 0.7, 9 + rk * 2, true);
    g.hitStop(0.09); g.shake(0.45); g.fx.chroma(0.6);
    g.audio?.impact(2); g.audio?.tone({ freq: 70, to: 40, dur: 0.35, gain: 0.5, type: 'sine', rev: 0.3 });
  }
  beatLine(from, dmg, L, big) {
    const g = this.game, p = this.p;
    const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
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
    g.toast?.('Full Release');
    g.audio?.tone({ freq: 60, to: 35, dur: 1, gain: 0.6, type: 'sawtooth', filter: 400, rev: 0.4 });
    g.audio?.energy('explode');
  }
  // ------------------------------------------------------------- domain
  bambooSpear(e) {
    const g = this.game, p = this.p;
    const c = e.pos.clone();
    const gy = g.world.groundBelow(c.x, c.z, c.y + 1); c.y = isFinite(gy) ? gy : c.y;
    const grp = new THREE.Group();
    const m = this.bambooMat ??= new THREE.MeshStandardNodeMaterial({ color: BAMBOO, roughness: 0.5, emissive: BAMBOO, emissiveIntensity: 0.2 });
    const geo = this.bambooGeo ??= new THREE.BoxGeometry(0.28, 2.6, 0.28).translate(0, 1.3, 0);
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(geo, m);
      s.position.set((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7); s.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
      grp.add(s);
    }
    grp.position.copy(c); grp.scale.set(1, 0.01, 1); g.scene.add(grp);
    g.combat.damageEnemy(e, 15, p, { stagger: 0.5, ceGain: 0, unblockable: true, color: '#9ae86a' });
    if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
    g.fx.debris(c, 0x5a7a3a, 4);
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      grp.scale.y = t < 0.12 ? t / 0.12 : Math.max(0.01, 1 - (t - 0.6) / 0.3);
      if (t < 0.9) return true;
      g.scene.remove(grp); return false;
    });
  }
}
registerKit('panda', PandaKit, PANDA_SKILLS);
