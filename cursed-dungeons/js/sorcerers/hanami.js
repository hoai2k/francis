// Hanami-style kit — Disaster Plants.
//   LMB  heavy wooden-armed blows; the slam drives roots up around you.
//   RMB  Wooden Ball Barrage: a burst of hard wooden balls.
//   1    Root Spikes: a line of sharpened roots tears out of the ground.
//   2    Cursed Buds: seeds latch onto curses and drain their life and Cursed
//        Energy into you.
//   3    Flower Field: a field of flowers blooms around you; curses inside are
//        calmed (slowed, attacks interrupted) while you regenerate.
//   F    Domain: Ceremonial Sea of Light — a sea of flowers and trees whose
//        roots and buds sap every curse inside.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const LEAF = 0x6adf6a, BLOOM = 0xff9ad8, WOOD = 0x8a5a2a, SAP = 0xb8ff6a;
const tmp = new THREE.Vector3();

registerSorcerer('hanami', { name: 'Hanami', technique: 'Disaster Plants', rarity: 'rare', title: 'Disaster Curse', desc: 'Wooden ball barrages, root spikes, life-draining cursed buds and a calming Flower Field.', domain: 'Ceremonial Sea of Light', color: '#6adf6a' });

registerLook('hanami', {
  paint: { skinTone: 0xd8d4c4, hair: 0xd8d4c4, brow: 0xd8d4c4, top: 0xd8d4c4, kimono: true, sash: 0x5a3a7a, scarf: 0xeeeae0, sleeve: 0xd8d4c4, pants: 0x2a2a2e, skirt: 0xeeeae0, shoes: 0xb8b4a4, eye: 0x3a2a1a, eyeWhite: 0x2a2018, fringe: 0, hairSide: 0, hairBack: 0 },
  paintExtra: (S) => {
    // black markings across the face, a blank mouthless jaw
    for (let y = 9; y < 16; y++) { S.px(8, y, 0x1a1a1a); S.px(15, y, 0x1a1a1a); }
    S.rect(9, 15, 6, 1, 0x1a1a1a, 0.05);
    for (let y = 20; y < 32; y += 2) { S.px(20, y, 0x2a2a2a); S.px(27, y, 0x2a2a2a); }
  },
  hair: () => [], hairColor: 0xd8d4c4, accent: LEAF, emit: 0.2, scale: 1.38,
  cape: { color: 0xeeeae0, length: 9, width: 7, segments: 3 },
  props(rig, K) {
    // wooden branches growing out of the eye sockets
    const wood = K.mat(WOOD, { roughness: 0.9 }), leaf = K.mat(LEAF, { emissive: 0.4 }), flower = K.mat(BLOOM, { emissive: 0.8 });
    for (const s of [-1, 1]) {
      K.box(rig.head, 1.2, 4, 1.2, wood, s * 1.8, 5.5, 4.4, 0.9, 0, s * -0.35);
      K.box(rig.head, 1, 3, 1, wood, s * 2.6, 8, 5.6, 0.3, 0, s * -0.7);
      K.box(rig.head, 1.4, 1.4, 1.4, leaf, s * 3.2, 9.4, 5.8);
    }
    K.box(rig.head, 1.4, 1.4, 1.4, flower, 3.4, 10.4, 5.2, 0.4, 0.4);
    // the white cloth over the left shoulder
    K.box(rig.torso, 5, 3, 5, K.mat(0xeeeae0, { roughness: 0.95 }), 3.6, 11, 0, 0, 0, -0.3);
    // root-wrapped forearms
    K.box(rig.handR, 2.2, 3, 2.2, wood, 0, -0.5, 0);
    K.box(rig.handL, 2.2, 3, 2.2, wood, 0, -0.5, 0);
  },
});

registerDomainEnv('ceremonial_sea_of_light', {
  skyTop: 0x2a6a9a, skyHorizon: 0xffe0a0, fog: 0x8ab070, fogDensity: 0.012, hemiSky: 0xfff0c0, hemiGround: 0x2a5a1a, hemiI: 1.4, sun: 0xfff0d0, sunI: 1.4,
  grade: { tint: [1.02, 1.06, 0.95], lift: [0.01, 0.02, 0.0], sat: 1.3, contrast: 1.05, vignette: 0.35 }, floor: B.moss_floor,
});

export const HANAMI_SKILLS = [
  { id: 'heartwood', name: 'Heartwood', desc: '+8% melee damage and +10 max HP per rank.', max: 3 },
  { id: 'balls', name: 'Wooden Balls', desc: 'More, harder wooden balls.', max: 3 },
  { id: 'roots', name: 'Root Spikes', desc: 'Root Spikes reach further and hit harder.', max: 3 },
  { id: 'buds', name: 'Cursed Buds', desc: 'Buds drain faster and heal more.', max: 3 },
  { id: 'field', name: 'Flower Field', desc: 'Flower Field is wider and lasts longer.', max: 2, req: 'buds' },
  { id: 'sea', name: 'Sea of Light', desc: 'Domain lasts 2s longer and drains harder.', max: 1, req: 'field' },
];

class HanamiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const wood = { trail: LEAF, sparkColor: 0xd8ffa0 };
    this.combo = [
      { ...wood, style: 'punch', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 15, range: 2.9, arc: 1.1, lunge: 5, knock: 5, stop: 0.06, shake: 0.2 },
      { ...wood, style: 'swingL', dur: 0.38, windup: 0.32, strike: 0.55, dmg: 16, range: 3, arc: 1.3, lunge: 5, knock: 5, stop: 0.06, shake: 0.2 },
      { ...wood, style: 'slam', dur: 0.62, windup: 0.46, strike: 0.62, dmg: 32, range: 3.6, arc: Math.PI, lunge: 3, knock: 12, stop: 0.11, shake: 0.5, ring: true, ringColor: LEAF, stagger: 0.7, roots: true },
    ];
    this.p.stats.meleeMult += r('heartwood') * 0.08;
    this.p.maxHp += r('heartwood') * 10; this.p.hp = Math.min(this.p.hp + r('heartwood') * 10, this.p.maxHp);
    this.slots = {
      ranged: this.ability({ name: 'Wooden Balls', icon: '🟤', cd: 1.3, ce: 0, use: () => this.balls() }),
      t1: this.ability({ name: 'Root Spikes', icon: '🌿', cd: 6, ce: 12, use: () => this.rootLine() }),
      t2: this.ability({ name: 'Cursed Buds', icon: '🌱', cd: 10, ce: 16, use: () => this.buds() }),
      t3: this.ability({ name: 'Flower Field', icon: '🌸', cd: 18, ce: 30, use: () => this.flowerField() }),
    };
    this.domain = {
      name: 'Ceremonial Sea of Light', icon: '🌸', key: 'ceremonial_sea_of_light', type: 5, color: BLOOM, sound: 'garden', flash: 0xfff0c0,
      duration: 8 + r('sea') * 2, radius: 24,
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt;
        // petals drifting across the whole domain
        for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.glow.emit(d.center.x + Math.cos(a) * rr, d.center.y + 0.5 + Math.random() * 4, d.center.z + Math.sin(a) * rr, 1, -0.4, 0.5, 2, 2.4, 1.2, 1.8, 0.14, 0, 0.5, 0.8, 1); }
        if (d.tick > 0) return;
        d.tick = 0.6;
        let drained = 0;
        for (const e of g.enemies) if (!e.dead && !e.isDummy && g.domainSys.inside(e.pos)) {
          e.slowT = 0.7;
          drained += g.combat.damageEnemy(e, 9 + r('sea') * 5, this.p, { stagger: 0.1, ceGain: 0, unblockable: true, color: '#b8ff6a' });
          if (Math.random() < 0.35) this.spike(e.pos.clone(), 1.6, 18);
        }
        if (drained) this.p.heal(drained * 0.08, true);
      },
    };
    this.buddedT = 0;
  }
  onMeleeHit(e, step) { if (step.roots) this.spike(e.pos.clone(), 1.4, 12); }
  groundAt(x, z, y) { const gy = this.game.world.groundBelow(x, z, y + 3); return isFinite(gy) ? gy : y; }
  // One root spike bursting out of the ground.
  spike(at, R, dmg) {
    const g = this.game, p = this.p;
    at.y = this.groundAt(at.x, at.z, at.y);
    g.combat.aoe(at, R, dmg, p, { knock: 3, stagger: 0.5 });
    for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(at) < R + 0.3) e.vel.y = Math.max(e.vel.y, 7);
    const c = at.clone().setY(at.y + 0.2);
    g.particles.burst(c, { count: 10, color: WOOD, additive: false, speed: 6, spread: 0.25, dir: tmp.set(0, 2, 0), life: 0.5, size: 0.35, sizeEnd: 0.15, gravity: 10, intensity: 1 });
    g.particles.burst(c, { count: 8, color: LEAF, speed: 4, up: 2, life: 0.5, size: 0.14, shape: 1 });
    g.fx.debris(c, 0x5a4a2a, 3);
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: LEAF, r0: 0.2, r1: R + 0.4, dur: 0.25, thick: 0.15 });
  }
  // -------------------------------------------------------------- RMB
  balls() {
    const g = this.game, p = this.p, rk = this.rank('balls');
    const n = 4 + rk;
    this.cast(0.45);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    for (let i = 0; i < n; i++) setTimeout(() => {
      const a = Math.atan2(p.aimDir.x, p.aimDir.z) + (Math.random() - 0.5) * 0.25;
      const dir = new THREE.Vector3(Math.sin(a), 0.04, Math.cos(a));
      g.projectiles.fire({ pos: this.handPos().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, 0)), vel: dir.multiplyScalar(24), team: 'player', shape: 'orb', color: WOOD, emissive: 0.15, scale: 1.4, life: 0.8, radius: 0.4, gravity: 3,
        homing: target ? 10 : 0, target,
        onHit: (e, q) => { g.combat.damageEnemy(e, 8 + rk * 3, p, { knock: q.vel.clone().setY(0).setLength(3), stagger: 0.25 }); g.fx.hitSpark(q.pos, null, { color: 0xd8b080 }); g.audio?.impact(0.7, 'wood'); },
        onExpire: (q, why) => { if (why === 'wall') g.fx.debris(q.pos, 0x8a5a2a, 2); } });
      g.audio?.whoosh(0.5);
    }, i * 70);
  }
  // -------------------------------------------------------------- Root Spikes
  rootLine() {
    const g = this.game, p = this.p, rk = this.rank('roots');
    this.cast(0.5, true);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const dir = target ? tmp.subVectors(target.pos, p.pos).setY(0).normalize().clone() : p.aimDir.clone().setY(0).normalize();
    const n = 7 + rk * 2, dmg = 22 + rk * 8;
    for (let i = 0; i < n; i++) setTimeout(() => {
      const at = p.pos.clone().addScaledVector(dir, 1.6 + i * 1.3).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6));
      this.spike(at, 1.5, dmg);
      if (i % 2 === 0) { g.shake(0.12); g.audio?.breakBlock('wood'); }
    }, i * 55);
    g.audio?.noise({ dur: 0.6, gain: 0.3, type: 'lowpass', freq: 300, sweep: 900 });
  }
  // -------------------------------------------------------------- Cursed Buds
  buds() {
    const g = this.game, p = this.p, rk = this.rank('buds');
    const foes = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 14).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, 4 + rk);
    if (!foes.length) { g.toast?.('No curses to plant on'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    for (const [i, e] of foes.entries()) {
      const vel = new THREE.Vector3((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6);
      g.projectiles.fire({ pos: this.handPos(), vel, team: 'player', shape: 'cube', color: SAP, emissive: 2, scale: 0.8, life: 2, radius: 0.5, homing: 8, target: e, ghost: true,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: LEAF, speed: 0.3, life: 0.3, size: 0.12 }); },
        onHit: (t) => this.plantBud(t) });
      if (i === 0) g.audio?.energy('spit');
    }
  }
  plantBud(e) {
    const g = this.game, p = this.p, rk = this.rank('buds');
    if (e.budT > 0) { e.budT = 4; return; }
    e.budT = 4;
    g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), null, { color: SAP });
    let tick = 0;
    g.addUpdater((dt) => {
      if (e.dead) { if (e.budT > 0) { g.fx.splat(e.pos.clone().setY(e.pos.y + 0.6), BLOOM); p.gainCE(6); } e.budT = 0; return false; }
      e.budT -= dt; tick -= dt;
      if (Math.random() < 0.5) g.particles.glow.emit(e.pos.x + (Math.random() - 0.5) * 0.6, e.pos.y + e.height * (0.4 + Math.random() * 0.4), e.pos.z + (Math.random() - 0.5) * 0.6, 0, 0.6, 0, 0.5, 1.4, 2.4, 0.8, 0.14, 0, 1, 0.4, 1);
      if (tick <= 0) {
        tick = 0.5 - rk * 0.06;
        const dealt = g.combat.damageEnemy(e, 7 + rk * 3, p, { stagger: 0, ceGain: 2 + rk, color: '#b8ff6a' });
        p.heal(dealt * (0.25 + rk * 0.08), true);
        // a mote of stolen life floats back to Hanami
        g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 3, color: SAP, speed: 0, dir: tmp.clone().subVectors(p.pos, e.pos).setY(0.5).normalize().multiplyScalar(4), spread: 0.2, life: 0.6, size: 0.15, shape: 1 });
      }
      if (e.budT <= 0) { g.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOM); return false; }
      return true;
    });
  }
  // -------------------------------------------------------------- Flower Field
  flowerField() {
    const g = this.game, p = this.p, rk = this.rank('field');
    const R = 6 + rk * 1.5, dur = 6 + rk * 2;
    this.cast(0.6, true);
    const c = p.pos.clone();
    g.toast?.('Flower Field');
    g.fx.flash(0xffd0f0, 0.25, 0.25);
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: BLOOM, r0: 0.5, r1: R, dur: 0.6, thick: 0.2 });
    g.audio?.energy('heal');
    const light = g.lights.flash(c.clone().setY(c.y + 2), BLOOM, 4, R * 2, dur, { priority: 3, fade: false });
    let t = 0, tick = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
        const col = i % 2 ? [2.4, 1.2, 1.8] : [2.6, 2.4, 1.2];
        g.particles.glow.emit(c.x + Math.cos(a) * rr, c.y + 0.15, c.z + Math.sin(a) * rr, 0, 0.5 + Math.random(), 0, 0.9, col[0], col[1], col[2], 0.16, -0.3, 1, 0.6, 1);
      }
      if (tick <= 0) {
        tick = 0.3;
        // calm: curses inside lose their will to fight
        for (const e of g.enemies) {
          if (e.dead || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > R) continue;
          e.slowT = 0.5;
          if (!e.isBoss && e.state === 'windup' && Math.random() < 0.5) { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.6; g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height + 0.2), { count: 6, color: BLOOM, speed: 1, up: 1, life: 0.7, size: 0.18 }); }
          g.combat.damageEnemy(e, 3, p, { stagger: 0, ceGain: 0.5, color: '#ff9ad8' });
        }
        for (const pl of g.players) if (!pl.dead && pl.pos.distanceTo(c) < R) pl.heal(pl.maxHp * 0.012, true);
      }
      if (t >= dur) { g.lights.remove(light); return false; }
      return true;
    });
  }
}
registerKit('hanami', HanamiKit, HANAMI_SKILLS);
