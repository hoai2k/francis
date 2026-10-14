// Geto-style kit — Cursed Spirit Manipulation.
// Geto commands the curses he has absorbed. Curses he finishes off can be
// absorbed too, banking "stock" that powers Uzumaki.
//   LMB  martial-arts combo.
//   RMB  Spirit Swarm: loose three homing grub spirits. Kills may absorb the curse.
//   1    Release Spirits: absorbed curses fight at your side.
//   2    Rainbow Dragon: an armoured serpent spirit tears through a line of curses.
//   3    Maximum: Uzumaki — compress every summoned spirit and banked stock into
//        one spiralling blast. More spirits, more power.
//   F    Abyss of Ten Thousand Curses (invented — Geto never shows a domain):
//        spirits pour out, curses inside are battered by spiralling spirits, and
//        weakened curses are absorbed outright.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { buildCurseModel } from '../entities/curses.js';
import { FLASH_MATERIAL } from '../entities/character.js';
import { moveEntity, groundAhead } from '../physics.js';
import { damp, dampAngle, clamp } from '../util.js';
import { makeOrb } from '../gfx/orbs.js';

const VIOLET = 0x9a5aff, DEEP = 0x3a1a6a, BLACK = 0x0a0610;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('geto', {
  name: 'Geto', technique: 'Cursed Spirit Manipulation', rarity: 'legendary', title: 'Curse User',
  desc: 'Release absorbed cursed spirits as allies, send a Rainbow Dragon through the horde, absorb weakened curses and compress them all into Uzumaki.',
  domain: 'Abyss of Ten Thousand Curses', color: '#9a5aff',
});

registerLook('geto', {
  paint: { skinTone: 0xf0cdb0, hair: 0x121216, hairVolume: true, top: 0x1c1c22, kimono: true, sash: 0x6a5a3a, scarf: 0x5a5a62, sleeve: 0x1c1c22, pants: 0x1c1c22, shoes: 0x2a2620, eye: 0x2a1a10, eyeWhite: 0x2a1a10, fringe: 2, hairSide: 5, hairBack: 7 },
  paintExtra(S) {
    // narrow, smiling eyes and the long forelock
    S.px(9, 12, 0xf0cdb0); S.px(14, 12, 0xf0cdb0);
    S.px(10, 15, 0xa87a68); S.px(13, 15, 0xa87a68);
    S.rect(12, 8, 1, 6, 0x121216, 0.05);
  },
  hair: (m) => [
    { x: 0, y: 8, z: -0.5, w: 7, h: 2, d: 7, material: m },
    { x: 1, y: 3, z: 3.6, w: 1.5, h: 6, d: 1, rz: 0.08, material: m },   // the forelock
    { x: -3.5, y: 2, z: -0.5, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 40 },
    { x: 3.5, y: 2, z: -0.5, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 40 },
  ],
  hairColor: 0x121216, accent: VIOLET, emit: 0,
  cape: { color: 0x1c1c22, segments: 3, length: 10, width: 9 },
  props(rig, K) {
    const hair = K.mat(0x121216, { roughness: 0.7 }), gold = K.mat(0xc8a040, { metalness: 0.8, roughness: 0.3 });
    // the half-up bun
    K.box(rig.head, 4, 3.5, 4, hair, 0, 9.2, -1.8);
    // stretched earlobes with gauges
    K.box(rig.head, 1, 2, 1.4, gold, -4.4, 1.6, 0.3); K.box(rig.head, 1, 2, 1.4, gold, 4.4, 1.6, 0.3);
    // the kasaya stole draped over one shoulder
    const stole = K.mat(0x6a6070, { roughness: 0.9 });
    K.box(rig.torso, 9.4, 3, 5, stole, 0, 7, 0, 0, 0, 0.7);
    K.box(rig.torso, 2.5, 9, 4.6, stole, 2.4, 5, 0, 0, 0, 0.1);
  },
});

registerDomainEnv('myriad_curses', {
  skyTop: 0x05020a, skyHorizon: 0x3a1a5a, fog: 0x120818, fogDensity: 0.022, hemiSky: 0xa08ad8, hemiGround: 0x0a0410, hemiI: 0.9, sun: 0xb89aff, sunI: 0.7,
  grade: { tint: [0.98, 0.92, 1.12], lift: [0.01, 0.0, 0.03], sat: 0.9, contrast: 1.2, vignette: 0.6 }, floor: B.dark_brick,
});

// ---------------------------------------------------------------- spirits
const SPIRITS = {
  swarmer: { hp: 60, speed: 6.5, dmg: 12, range: 1.6, cd: 0.9, radius: 0.4, height: 1.2, style: 'swingR' },
  imp: { hp: 35, speed: 7.5, dmg: 8, range: 1.4, cd: 0.7, radius: 0.35, height: 1, style: 'punch' },
  spitter: { hp: 70, speed: 4, dmg: 14, range: 9, cd: 1.6, radius: 0.4, height: 2.1, ranged: true },
  tank: { hp: 240, speed: 3.6, dmg: 28, range: 2.4, cd: 1.6, radius: 0.8, height: 2.9, style: 'slam', aoe: true },
};

// An absorbed curse fighting for its master. Same contract as Ally.
class Spirit {
  constructor(game, owner, model, pos, o = {}) {
    const S = SPIRITS[model];
    this.game = game; this.owner = owner; this.kind = 'spirit'; this.model = model; this.S = S;
    this.rig = buildCurseModel(model); this.object = this.rig.root;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = S.radius; this.height = S.height;
    this.maxHp = S.hp * (o.hpMult ?? 1); this.hp = this.maxHp; this.dmg = S.dmg * (o.dmgMult ?? 1);
    this.life = o.life ?? 18; this.cd = 0.4; this.atkT = 0; this.facing = owner.facing;
    this.dead = false; this.isAlly = true; this.grounded = false; this.coyote = 0; this.flashT = 0; this.visY = pos.y;
    this.object.position.copy(pos);
    game.scene.add(this.object);
    game.fx.summonCircle(pos, VIOLET);
    game.particles.burst(pos.clone().setY(pos.y + 0.6), { count: 24, color: BLACK, additive: false, speed: 3, up: 1.5, life: 0.8, size: 0.6, sizeEnd: 2 });
  }
  takeDamage(amount, src, o = {}) {
    if (this.dead) return 0;
    this.hp -= amount; this.flashT = 0.08;
    if (o.knock) this.knock.addScaledVector(o.knock, 0.5);
    if (this.hp <= 0) this.despawn();
    return amount;
  }
  despawn(quiet = false) {
    if (this.dead) return;
    this.dead = true;
    if (!quiet) this.game.particles.burst(this.pos.clone().setY(this.pos.y + 0.6), { count: 24, color: DEEP, speed: 3, life: 0.7, size: 0.4, sizeEnd: 1.5 });
    this.game.scene.remove(this.object);
  }
  dispose() { this.despawn(true); }
  target() {
    let best = null, bd = 16;
    for (const e of this.game.enemies) { if (e.dead || e.isDummy || e.untargetable) continue; const d = e.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  update(dt) {
    const g = this.game, S = this.S;
    if (this.dead) return false;
    this.life -= dt; this.cd -= dt; this.flashT -= dt; this.atkT = Math.max(0, this.atkT - dt);
    if (this.life <= 0) { this.despawn(); return false; }
    const e = this.target();
    const want = this.want || (this.want = new THREE.Vector3()); want.set(0, 0, 0);
    if (e) {
      tmp2.subVectors(e.pos, this.pos).setY(0); const d = tmp2.length();
      this.facing = dampAngle(this.facing, Math.atan2(tmp2.x, tmp2.z), 10, dt);
      if (d > S.range * 0.8) want.copy(tmp2.normalize().multiplyScalar(S.speed));
      if (d < S.range + e.radius && this.cd <= 0) this.attack(e);
    } else {
      tmp2.subVectors(this.owner.pos, this.pos).setY(0); const d = tmp2.length();
      if (d > 3) { want.copy(tmp2.normalize().multiplyScalar(S.speed * Math.min(1, d / 6))); this.facing = dampAngle(this.facing, Math.atan2(tmp2.x, tmp2.z), 6, dt); }
      if (d > 22) this.pos.copy(this.owner.pos);
    }
    if (want.lengthSq() > 0.01 && !groundAhead(g.world, this.pos.x + want.x * 0.12, this.pos.y, this.pos.z + want.z * 0.12, 2.5)) want.set(0, 0, 0);
    this.vel.x = damp(this.vel.x, want.x + this.knock.x, 10, dt); this.vel.z = damp(this.vel.z, want.z + this.knock.z, 10, dt);
    this.knock.multiplyScalar(Math.exp(-dt * 6));
    moveEntity(this, g.world, dt);
    if (this.pos.y < -8) this.pos.copy(this.owner.pos);
    const sp = clamp(Math.hypot(this.vel.x, this.vel.z) / S.speed, 0, 1);
    const act = this.atkT > 0 ? { type: 'attack', t: 1 - this.atkT / 0.4, style: S.style ?? 'punch', windup: 0.3, strike: 0.5 } : null;
    this.rig.animate({ dt, speed: sp, vel: this.vel, action: act });
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    this.object.position.set(this.pos.x, this.pos.y + (this.rig.float ?? 0), this.pos.z);
    this.object.rotation.y = this.facing;
    // violet contract aura so they read as Geto's
    if (Math.random() < 0.4) g.particles.glow.emit(this.pos.x + (Math.random() - 0.5) * this.radius * 2, this.pos.y + Math.random() * this.height, this.pos.z + (Math.random() - 0.5) * this.radius * 2, 0, 0.6, 0, 0.6, 1.2, 0.6, 2.2, 0.12, -0.2, 1, 0.3, 0);
    return true;
  }
  attack(e) {
    const g = this.game, S = this.S, own = this.owner;
    this.cd = S.cd; this.atkT = 0.4;
    const mult = 1 + (own.kit?.rank?.('legion') ?? 0) * 0.2;
    if (S.ranged) {
      const from = this.pos.clone().setY(this.pos.y + this.height * 0.8);
      const v = tmp.subVectors(e.pos, from).setY(e.pos.y + e.height * 0.5 - from.y).normalize().multiplyScalar(16);
      g.projectiles.fire({ pos: from, vel: v, team: 'player', shape: 'orb', color: 0xb8ff6a, life: 1, scale: 0.8, radius: 0.35,
        onHit: (t, q) => { g.combat.damageEnemy(t, this.dmg * mult, own, { stagger: 0.25, ceGain: 1, knock: q.vel.clone().setLength(2) }); g.fx.splat(q.pos, 0xb8ff6a); } });
      g.audio?.energy('spit');
      return;
    }
    setTimeout(() => {
      if (this.dead || e.dead) return;
      const dir = tmp.subVectors(e.pos, this.pos).setY(0).normalize();
      if (S.aoe) {
        g.combat.aoe(e.pos, 2.4, this.dmg * mult, own, { knock: 7, stagger: 0.6, ceGain: 1, blocks: false });
        g.fx.shockwave(e.pos, VIOLET, 3); g.shake(0.12);
      } else g.combat.damageEnemy(e, this.dmg * mult, own, { knock: dir.multiplyScalar(3), stagger: 0.35, ceGain: 1 });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.5), null, { color: VIOLET });
      g.audio?.impact(S.aoe ? 1.2 : 0.7);
    }, 120);
  }
}

let dragonMats = null;
function getDragonMats() {
  if (dragonMats) return dragonMats;
  const m = (c, e = 0.35) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.35, metalness: 0.5, emissive: c, emissiveIntensity: e });
  dragonMats = { body: [0xffa0a0, 0xffd0a0, 0xfff0a0, 0xa8ffb0, 0xa0e0ff, 0xb8a8ff, 0xffa8e8].map((c) => m(c)), horn: m(0xf0e8d8, 0.1), eye: m(0xff2a2a, 3), belly: m(0x2a2438, 0.05) };
  return dragonMats;
}

export const GETO_SKILLS = [
  { id: 'swarm', name: 'Grub Swarm', desc: 'More, stronger grub spirits; kills absorb curses more often.', max: 3 },
  { id: 'legion', name: 'Legion', desc: '+20% spirit damage per rank; one more spirit released.', max: 3 },
  { id: 'hardy', name: 'Hardy Spirits', desc: 'Spirits are tougher and last longer.', max: 2, req: 'legion' },
  { id: 'dragon', name: 'Rainbow Dragon', desc: 'The dragon is bigger and hits harder.', max: 3 },
  { id: 'uzumaki', name: 'Uzumaki', desc: 'Uzumaki gains more power from each spirit.', max: 3 },
  { id: 'abyss', name: 'Abyss', desc: 'Domain absorbs curses at higher health and lasts longer.', max: 2 },
];

class GetoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.6, arc: 1.1, lunge: 7, knock: 3, stop: 0.045, shake: 0.14, trail: VIOLET, sparkColor: 0xd0b0ff, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 13, range: 2.7, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.15, trail: VIOLET, chainAt: 0.55 },
      { style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 14, range: 2.7, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.15, trail: VIOLET, chainAt: 0.55 },
      { style: 'spin', dur: 0.48, windup: 0.3, strike: 0.55, dmg: 22, range: 3.2, arc: Math.PI, lunge: 3, knock: 9, stop: 0.08, shake: 0.32, ring: true, ringColor: VIOLET, trail: DEEP },
    ];
    this.slots = {
      ranged: this.ability({ name: 'Spirit Swarm', icon: '🐛', cd: 1.1, ce: 0, use: () => this.swarm() }),
      t1: this.ability({ name: 'Release Spirits', icon: '👹', cd: 12, ce: 16, use: () => this.release() }),
      t2: this.ability({ name: 'Rainbow Dragon', icon: '🐉', cd: 10, ce: 20, use: () => this.dragon() }),
      t3: this.ability({ name: 'Uzumaki', icon: '🌀', cd: 18, ce: 35, use: () => this.uzumaki() }),
    };
    this.domain = {
      name: 'Abyss of Ten Thousand Curses', icon: '🌀', key: 'myriad_curses', type: 3, color: VIOLET, sound: 'abyss', flash: 0x3a1a6a,
      duration: 8 + r('abyss'), radius: 24,
      onStart: (g) => {
        g.toast?.('No canon domain — the curses pour out regardless.');
        ['swarmer', 'tank', 'spitter', 'swarmer'].forEach((m, i) => this.summon(m, i, 10, true));
      },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt; d.absorbT = (d.absorbT ?? 0) - dt;
        const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
        if (d.tick <= 0) {
          d.tick = 0.35;
          for (let i = 0; i < Math.min(2, list.length); i++) {
            const e = list[Math.floor(Math.random() * list.length)];
            g.combat.damageEnemy(e, 9, this.p, { stagger: 0.2, ceGain: 0 });
            this.spiralFx(e.pos, e.height);
          }
        }
        if (d.absorbT <= 0) {
          d.absorbT = 1;
          for (const e of list) if (!e.isBoss && e.hp / e.maxHp < 0.3 + r('abyss') * 0.08) this.absorb(e);
        }
      },
    };
    this.stock = 0;
  }
  dispose() { super.dispose(); this.disposed = true; }
  spirits() { return this.game.allies.filter((a) => a.owner === this.p && a.kind === 'spirit' && !a.dead); }
  summon(model, i = 0, life = null, free = false) {
    const g = this.game, p = this.p;
    const mine = this.spirits();
    while (!free && mine.length >= 6) mine.shift().despawn();
    const a = (i - 1) * 0.9 + Math.PI;
    const pos = p.pos.clone().add(tmp.set(Math.sin(p.facing + a) * 1.8, 0, Math.cos(p.facing + a) * 1.8));
    const gy = g.world.groundBelow(pos.x, pos.z, p.pos.y + 2); pos.y = isFinite(gy) && Math.abs(gy - p.pos.y) < 3 ? gy : p.pos.y;
    if (!isFinite(gy) || Math.abs(gy - p.pos.y) >= 3) pos.set(p.pos.x, p.pos.y, p.pos.z);
    const hard = this.rank('hardy');
    const s = new Spirit(g, p, model, pos, { life: life ?? 18 + hard * 6, hpMult: 1 + hard * 0.4 });
    g.allies.push(s);
    return s;
  }
  // a weakened curse is swallowed into Geto's stock
  absorb(e) {
    const g = this.game, p = this.p;
    if (!e.dead) g.combat.damageEnemy(e, (e.hp + 1) / Math.max(0.2, 1 - (e.armor ?? 0)), p, { unblockable: true, stagger: 0, color: '#9a5aff' });
    if (!e.dead) return;
    this.stock = Math.min(10, this.stock + 1);
    const from = e.pos.clone().setY(e.pos.y + e.height * 0.5);
    for (let i = 0; i < 14; i++) {
      const k = i / 14;
      g.particles.glow.emit(from.x, from.y, from.z, (p.pos.x - from.x) * (1.4 + k), (p.pos.y + 1.2 - from.y) * 1.5 + 1, (p.pos.z - from.z) * (1.4 + k), 0.6, 1.4, 0.7, 2.6, 0.2, 0, 0.5, 0.2, 0);
    }
    g.particles.burst(from, { count: 18, color: BLACK, additive: false, speed: 2, life: 0.6, size: 0.5, sizeEnd: 0.1 });
    g.fx.darkRings.spawn(tmp.set(from.x, e.pos.y + 0.06, from.z), { color: 0x000000, r0: 1.8, r1: 0.1, dur: 0.4, thick: 0.35 });
    g.audio?.tone({ freq: 220, to: 70, dur: 0.35, gain: 0.12, type: 'sawtooth', filter: 900 });
  }
  spiralFx(at, h = 1.5) {
    const g = this.game;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 4, y = at.y + i / 10 * h * 1.2;
      g.particles.glow.emit(at.x + Math.cos(a) * 0.9, y, at.z + Math.sin(a) * 0.9, -Math.cos(a) * 2, 0.5, -Math.sin(a) * 2, 0.35, 1.4, 0.6, 2.4, 0.14, 0, 2, 0.2, 0);
    }
  }
  tick() {
    // banked stock circles Geto as tiny dark spirits
    const g = this.game, p = this.p;
    if (this.stock > 0 && Math.random() < 0.5) {
      const a = g.time * 3 + Math.floor(Math.random() * this.stock) / this.stock * Math.PI * 2;
      g.particles.glow.emit(p.pos.x + Math.cos(a) * 1.1, p.pos.y + 1.3 + Math.sin(g.time * 4 + a) * 0.2, p.pos.z + Math.sin(a) * 1.1, 0, 0, 0, 0.3, 1.2, 0.5, 2.2, 0.16, 0, 0, 0.5, 0);
    }
  }
  // ---------------------------------------------------------- techniques
  swarm() {
    const g = this.game, p = this.p, rk = this.rank('swarm');
    this.cast(0.3);
    const n = 3 + (rk >= 2 ? 1 : 0);
    const base = Math.atan2(p.aimDir.x, p.aimDir.z);
    const sure = g.domainSys?.sureHit(p);
    const tgt = sure ? g.nearestEnemy(p.pos, 30) : this.aimTarget();
    for (let i = 0; i < n; i++) {
      const a = base + (i / (n - 1) - 0.5) * 0.7;
      const dir = new THREE.Vector3(Math.sin(a), 0.15, Math.cos(a));
      g.projectiles.fire({ pos: this.handPos(), vel: dir.multiplyScalar(17), team: 'player', shape: 'orb', color: VIOLET, emissive: 2, life: 1.2, scale: 1.1, radius: 0.4,
        homing: tgt ? (sure ? 14 : 5) : 0, target: tgt,
        trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color: BLACK, additive: false, speed: 0.4, life: 0.4, size: 0.3, sizeEnd: 0.7 }); },
        onHit: (e, q) => {
          g.combat.damageEnemy(e, 8 + rk * 3, p, { knock: q.vel.clone().setLength(2), stagger: 0.2 });
          g.fx.hitSpark(q.pos, null, { color: VIOLET });
          if (e.dead && !e.isDummy && !e.isBoss && Math.random() < 0.25 + rk * 0.1) this.absorb(e);
        } });
    }
    g.audio?.energy('spit');
  }
  release() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const n = 2 + Math.min(2, this.rank('legion'));
    const models = ['swarmer', 'swarmer', 'imp', 'spitter'];
    if (this.stock >= 3) { models[0] = 'tank'; }   // a big stock buys a Grade 2 bruiser
    for (let i = 0; i < n; i++) this.summon(models[i], i);
    g.fx.summonCircle(p.pos, VIOLET);
    g.fx.flash(DEEP, 0.2, 0.12);
    g.audio?.energy('summon');
  }
  dragon() {
    const g = this.game, p = this.p, rk = this.rank('dragon');
    this.cast(0.5, true);
    const dir = p.aimDir.clone().setY(0).normalize(), side = new THREE.Vector3(dir.z, 0, -dir.x);
    const start = p.pos.clone().addScaledVector(dir, -2.5).setY(p.pos.y + 1.4);
    const L = 26 + rk * 2, dur = 1.15, size = 1 + rk * 0.15;
    const M = getDragonMats();
    const grp = new THREE.Group(); g.scene.add(grp);
    const segs = [];
    const N = 16;
    for (let i = 0; i < N; i++) {
      const s = (i === 0 ? 1.3 : 1.05 - i / N * 0.6) * size;
      const seg = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.8 * s, 0.9 * s), M.body[i % M.body.length]); body.castShadow = true; seg.add(body);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.3 * s, 0.6 * s), M.horn); plate.position.y = 0.5 * s; seg.add(plate);
      if (i === 0) {
        for (const x of [-0.3, 0.3]) {
          const horn = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.12 * s, 0.7 * s), M.horn); horn.position.set(x * s, 0.45 * s, -0.4 * s); horn.rotation.x = 0.5; seg.add(horn);
          const eye = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.1 * s, 0.05 * s), M.eye); eye.position.set(x * s, 0.15 * s, 0.46 * s); seg.add(eye);
        }
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7 * s, 0.25 * s, 0.6 * s), M.belly); jaw.position.set(0, -0.35 * s, 0.35 * s); seg.add(jaw);
      }
      seg.visible = false; grp.add(seg); segs.push(seg);
    }
    const light = g.lights.attach(segs[0], VIOLET, 6, 9, { offsetY: 0, priority: 4 });
    const trail = [start.clone()];
    const hit = new Set();
    const dmg = 40 + rk * 14;
    let t = 0, blockT = 0;
    g.audio?.energy('summon'); g.audio?.whoosh(1.6);
    g.addUpdater((dt) => {
      t += dt; blockT -= dt;
      const k = t / dur;
      const head = start.clone().addScaledVector(dir, L * k).addScaledVector(side, Math.sin(k * Math.PI * 3) * 1.6);
      head.y += Math.sin(k * Math.PI * 2) * 0.5;
      if (head.distanceTo(trail[0]) > 0.45) trail.unshift(head.clone());
      if (trail.length > N + 2) trail.length = N + 2;
      segs.forEach((seg, i) => {
        const at = trail[Math.min(i, trail.length - 1)], nx = trail[Math.min(Math.max(0, i - 1), trail.length - 1)];
        seg.visible = i < trail.length;
        seg.position.copy(i === 0 ? head : at);
        if (i === 0) seg.lookAt(tmp.copy(head).add(dir)); else if (nx !== at) seg.lookAt(nx);
      });
      if (k < 1) {
        for (const e of g.enemies) {
          if (e.dead || hit.has(e) || e.untargetable) continue;
          tmp.subVectors(e.pos, head); tmp.y = 0;
          if (tmp.length() > 1.8 * size + e.radius || Math.abs(e.pos.y + e.height * 0.5 - head.y) > 2.5) continue;
          hit.add(e);
          g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().multiplyScalar(9).addScaledVector(side, Math.sign(tmp.dot(side)) * 4), stagger: 0.8 });
          if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
          g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.5), dir, { color: 0xfff0a0, big: true });
          g.hitStop(0.03); g.audio?.impact(1.3);
        }
        if (blockT <= 0) { blockT = 0.06; g.combat.hitBlocks(head.clone().setY(p.pos.y), dir, 1.6 * size, Math.PI, 40, p); }
        if (Math.random() < 0.9) { const c = M.body[Math.floor(Math.random() * M.body.length)].color; g.particles.burst(trail[trail.length - 1], { count: 2, color: c, speed: 1, life: 0.5, size: 0.3, sizeEnd: 0.05, intensity: 1.5 }); }
      }
      if (t < dur + 0.35) {
        if (k > 1) segs.forEach((seg) => seg.scale.setScalar(Math.max(0.01, 1 - (t - dur) / 0.35)));
        return true;
      }
      g.particles.burst(head, { count: 30, color: VIOLET, speed: 4, life: 0.6, size: 0.4, sizeEnd: 0.05 });
      g.scene.remove(grp); g.lights.remove(light);
      return false;
    });
    g.shake(0.2);
  }
  uzumaki() {
    const g = this.game, p = this.p, rk = this.rank('uzumaki');
    const mine = this.spirits();
    const power = Math.min(12, mine.length * (1 + rk * 0.25) + this.stock);
    // every spirit is drawn back and compressed
    for (const s of mine) {
      const from = s.pos.clone().setY(s.pos.y + s.height * 0.5);
      for (let i = 0; i < 12; i++) g.particles.glow.emit(from.x, from.y, from.z, (p.pos.x - from.x) * 2, (p.pos.y + 1.4 - from.y) * 2, (p.pos.z - from.z) * 2, 0.5, 1.6, 0.8, 2.8, 0.25, 0, 0.3, 0.2, 0);
      s.despawn();
    }
    this.stock = 0;
    p.action = { type: 'cast', both: true, dur: 1.05, elapsed: 0, t: 0, moveScale: 0.1, lock: true, hold: true, cancelable: false, faceAim: true };
    const orb = makeOrb(VIOLET, { radius: 0.3, darkCore: true, coreColor: 0x000000 });
    g.scene.add(orb);
    const light = g.lights.attach(orb, VIOLET, 8, 10, { offsetY: 0, priority: 5 });
    g.fx.dimTarget = 0.35;
    g.toast?.(power > 0 ? `🌀 Maximum: Uzumaki ×${Math.round(power)}` : '🌀 Uzumaki');
    g.audio?.charge(0.95, 0.6);
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
      const hp = this.handPos();
      orb.position.copy(hp); orb.rotation.y += dt * 12;
      orb.scale.setScalar(0.3 + t * (0.6 + power * 0.05));
      for (let i = 0; i < 4; i++) {
        const a = g.time * 9 + i * Math.PI / 2, r = 2.2 - (t % 0.3) * 4;
        g.particles.glow.emit(hp.x + Math.cos(a) * r, hp.y + Math.sin(a * 0.7) * 0.6, hp.z + Math.sin(a) * r, -Math.cos(a) * 5, 0, -Math.sin(a) * 5, 0.3, 1.4, 0.6, 2.6, 0.16, 0, 3, 0.1, 0);
      }
      if (t < 0.95) return true;
      g.scene.remove(orb); g.lights.remove(light);
      g.fx.dimTarget = 0;
      p.action = null;
      this.fireUzumaki(power);
      return false;
    });
  }
  fireUzumaki(power) {
    const g = this.game, p = this.p, rk = this.rank('uzumaki');
    const dir = p.aimDir.clone().setY(0).normalize();
    const from = this.handPos();
    const L = 20 + power, W = 1.5 + power * 0.12;
    const dmg = 55 + power * 20 + rk * 15;
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from).setY(0); const along = tmp.dot(dir);
      if (along < 0 || along > L) continue;
      if (Math.abs(tmp.x * dir.z - tmp.z * dir.x) > W + e.radius) continue;
      g.combat.damageEnemy(e, dmg, p, { unblockable: true, knock: dir.clone().multiplyScalar(12), stagger: 1, color: '#c8a0ff' });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.5), dir, { color: VIOLET, big: true });
    }
    // the spiral itself: two helices of compressed spirits
    const side = new THREE.Vector3(dir.z, 0, -dir.x);
    for (let s = 0; s < L; s += 0.35) {
      for (const ph of [0, Math.PI]) {
        const a = s * 1.4 + ph, r = W * (0.6 + 0.4 * Math.sin(s * 0.5));
        const x = from.x + dir.x * s + side.x * Math.cos(a) * r, y = from.y + Math.sin(a) * r * 0.8, z = from.z + dir.z * s + side.z * Math.cos(a) * r;
        g.particles.glow.emit(x, y, z, dir.x * 6 + side.x * Math.cos(a) * 2, Math.sin(a) * 2, dir.z * 6 + side.z * Math.cos(a) * 2, 0.6 + Math.random() * 0.3, 1.6, 0.7, 2.8, 0.3, 0, 2, 0.1, 0);
      }
      if (Math.random() < 0.4) g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: 2, color: BLACK, additive: false, speed: 2, life: 0.7, size: 0.6, sizeEnd: 1.6 });
    }
    g.fx.slashLine(from, dir, L, 0xffffff, W * 0.5, 0.3);
    g.fx.slashLine(from, dir, L, VIOLET, W * 1.6, 0.5);
    for (let s = 2; s < L; s += 3) g.fx.darkRings.spawn(tmp.copy(from).addScaledVector(dir, s).setY(p.pos.y + 0.08), { color: 0x000000, r0: 0.4, r1: W + 1, dur: 0.5, thick: 0.3 });
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(tmp2.copy(from).addScaledVector(dir, s).setY(p.pos.y), dir, W, Math.PI, 80, p);
    g.lights.flash(from.clone().addScaledVector(dir, L * 0.4), VIOLET, 20 + power, 20, 0.6, { priority: 8 });
    g.fx.screenWave(from.clone().addScaledVector(dir, 4), 1.2, 0.6); g.fx.flash(0x6a3aff, 0.4, 0.2); g.fx.chroma(1.2);
    g.shake(0.5 + power * 0.04); g.hitStop(0.08);
    g.audio?.energy('purple');
  }
}
registerKit('geto', GetoKit, GETO_SKILLS);
