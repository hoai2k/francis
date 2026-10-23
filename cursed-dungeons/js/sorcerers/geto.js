// Geto-style kit — Cursed Spirit Manipulation.
// Geto commands the curses he has absorbed. Curses he finishes off can be
// absorbed too, banking "stock" that powers Uzumaki.
//   LMB  martial-arts combo.
//   RMB  Spirit Swarm: loose three homing grub spirits. Kills may absorb the curse.
//   1    Release Spirits: absorbed curses fight at your side.
//   2    Rainbow Dragon: an armoured serpent spirit tears through a line of curses.
//   3    Kuchisake-onna: the Slit-Mouthed Woman steps out and asks "Am I
//        pretty?" — every curse around her is bound in place until the question
//        is answered (a simple sure-hit, like the one Geto set on Yuta), then
//        her giant scissors cut them.
//   F    Maximum: Uzumaki (ultimate — Geto never shows a domain): every
//        summoned spirit, every banked stock and a horde from his reserve are
//        compressed into one spiralling mass and fired as a colossal beam.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { buildCurseModel } from '../entities/curses.js';
import { FLASH_MATERIAL } from '../entities/character.js';
import { moveEntity, groundAhead } from '../physics.js';
import { damp, dampAngle, clamp } from '../util.js';
import { makeOrb } from '../gfx/orbs.js';
import { B } from '../world/blocks.js';

const VIOLET = 0x9a5aff, DEEP = 0x3a1a6a, BLACK = 0x0a0610;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('geto', {
  name: 'Geto', technique: 'Cursed Spirit Manipulation', rarity: 'legendary', title: 'Curse User',
  desc: 'Release absorbed cursed spirits as allies, send a Rainbow Dragon through the horde, bind curses with Kuchisake-onna\'s question, absorb weakened curses and compress them all into Maximum: Uzumaki.',
  ultimate: 'Maximum: Uzumaki', color: '#9a5aff',
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

// ---------------------------------------------------------------- spirits
const SPIRITS = {
  swarmer: { hp: 60, speed: 6.5, dmg: 12, range: 1.6, cd: 0.9, radius: 0.4, height: 1.2, style: 'swingR' },
  imp: { hp: 35, speed: 7.5, dmg: 8, range: 1.4, cd: 0.7, radius: 0.35, height: 1, style: 'punch' },
  spitter: { hp: 70, speed: 4, dmg: 14, range: 9, cd: 1.6, radius: 0.4, height: 2.1, ranged: true },
  tank: { hp: 240, speed: 3.6, dmg: 28, range: 2.4, cd: 1.6, radius: 0.8, height: 2.9, style: 'slam', aoe: true },
  blob: { hp: 40, speed: 7, dmg: 44, range: 1.5, cd: 0, radius: 0.55, height: 1.2, kamikaze: true },
  shadow: { hp: 90, speed: 8, dmg: 22, range: 1.9, cd: 0.8, radius: 0.45, height: 2.3, style: 'swingL' },
  maw: { hp: 200, speed: 0, dmg: 16, range: 11, cd: 1.1, radius: 0.85, height: 2.4, ranged: true, rooted: true },
  transfigured: { hp: 70, speed: 6, dmg: 14, range: 1.7, cd: 0.9, radius: 0.45, height: 2.0, style: 'punch' },
  flyhead: { hp: 25, speed: 7, dmg: 7, range: 1.4, cd: 0.6, radius: 0.35, height: 1, style: 'punch' },
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
      if (d > 22 && !S.rooted) this.pos.copy(this.owner.pos);
    }
    if (S.rooted) want.set(0, 0, 0);
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
    if (Math.random() < 0.4) g.particles.glow.spawn({ x: this.pos.x + (Math.random() - 0.5) * this.radius * 2, y: this.pos.y + Math.random() * this.height, z: this.pos.z + (Math.random() - 0.5) * this.radius * 2, vy: 0.6, life: 0.6, r: 1.2, g: 0.6, b: 2.2, size: 0.12, gravity: -0.2, drag: 1, sizeEnd: 0.3 });
    return true;
  }
  attack(e) {
    const g = this.game, S = this.S, own = this.owner;
    this.cd = S.cd; this.atkT = 0.4;
    const mult = (1 + (own.kit?.rank?.('legion') ?? 0) * 0.2) * (own.kit?.buffs?.has('feast') ? 1.5 : 1);
    if (S.kamikaze) {
      // a bloater: it bursts on contact
      const c = this.pos.clone().setY(this.pos.y + 0.6);
      g.combat.aoe(c, 3, this.dmg * mult, own, { knock: 9, stagger: 0.8, ceGain: 2, blocks: false });
      g.fx.explosion(c, VIOLET, 2.4); g.fx.splat(c, 0xb8ff6a); g.fx.shockwave(this.pos, VIOLET, 3.5);
      g.shake(0.3); g.audio?.energy('explode');
      this.despawn(true);
      return;
    }
    if (S.ranged) {
      const from = this.pos.clone().setY(this.pos.y + this.height * 0.8);
      const v = tmp.subVectors(e.pos, from).setY(e.pos.y + e.height * 0.5 - from.y).normalize().multiplyScalar(16);
      g.projectiles.fire({ pos: from, vel: v, team: 'player', shape: 'orb', color: 0xb8ff6a, life: 1, scale: 0.8, radius: 0.35,
        onHit: (t, q) => { g.combat.damageEnemy(t, this.dmg * mult, own, { stagger: 0.25, ceGain: 1, knock: q.vel.clone().setLength(2) }); g.fx.splat(q.pos, 0xb8ff6a); } });
      g.audio?.energy('spit');
      return;
    }
    this.owner.kit.after(0.12, () => {
      if (this.dead || e.dead) return;
      const dir = tmp.subVectors(e.pos, this.pos).setY(0).normalize();
      if (S.aoe) {
        g.combat.aoe(e.pos, 2.4, this.dmg * mult, own, { knock: 7, stagger: 0.6, ceGain: 1, blocks: false });
        g.fx.shockwave(e.pos, VIOLET, 3); g.shake(0.12);
      } else g.combat.damageEnemy(e, this.dmg * mult, own, { knock: dir.multiplyScalar(3), stagger: 0.35, ceGain: 1 });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.5), null, { color: VIOLET });
      g.audio?.impact(S.aoe ? 1.2 : 0.7);
    });
  }
}

// the Rainbow Dragon's body: N armoured segments (hidden until placed)
function buildDragon(g, size, N) {
  const M = getDragonMats();
  const grp = new THREE.Group(); g.scene.add(grp);
  const segs = [];
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
  return { grp, segs };
}
function disposeGroup(g, grp) { g.scene.remove(grp); grp.traverse((o) => o.geometry?.dispose()); }

let dragonMats = null;
function getDragonMats() {
  if (dragonMats) return dragonMats;
  const m = (c, e = 0.35) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.35, metalness: 0.5, emissive: c, emissiveIntensity: e });
  dragonMats = { body: [0xffa0a0, 0xffd0a0, 0xfff0a0, 0xa8ffb0, 0xa0e0ff, 0xb8a8ff, 0xffa8e8].map((c) => m(c)), horn: m(0xf0e8d8, 0.1), eye: m(0xff2a2a, 3), belly: m(0x2a2438, 0.05) };
  return dragonMats;
}

export const GETO_SKILLS = [
  { id: 'swarm', name: 'Grub Swarm', icon: '🐛', desc: 'More, stronger grub spirits; kills absorb curses more often.', max: 3, branch: 'Swarm', tier: 1, req: 'ab:swarm' },
  { id: 'legion', name: 'Legion', icon: '👹', desc: '+20% spirit damage per rank; one more spirit released.', max: 3, branch: 'Spirits', tier: 2, req: 'ab:release' },
  { id: 'hardy', name: 'Hardy Spirits', icon: '💪', desc: 'Spirits are tougher and last longer.', max: 2, branch: 'Spirits', tier: 3, req: 'up:legion' },
  { id: 'dragon', name: 'Rainbow Dragon', icon: '🐉', desc: 'The dragon is bigger and hits harder (its Coil too).', max: 3, branch: 'Grade 1', tier: 2, req: 'ab:dragon' },
  { id: 'uzumaki', name: 'Maximum: Uzumaki', icon: '🌀', desc: 'Uzumaki (and the Maximum ultimate) gains more power from each spirit.', max: 3, branch: 'Special Grade', tier: 1 },
  { id: 'abyss', name: 'Kuchisake-onna', icon: '✂️', desc: 'Her question binds curses longer and her scissors cut deeper.', max: 2, branch: 'Grade 1', tier: 3, req: 'ab:kuchisake' },
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
    this.branches = ['Swarm', 'Spirits', 'Grade 1', 'Special Grade', 'Absorption'];
    this.library = {
      // ---- the swarm of lesser spirits
      swarm: ability({ name: 'Spirit Swarm', icon: '🐛', kind: 'basic', desc: 'Loose three homing grub spirits. Kills may absorb the curse into your stock.', cd: 1.1, ce: 0, branch: 'Swarm', tier: 0, start: true, legacy: 'ranged', use: () => this.swarm() }),
      fly_heads: ability({ name: 'Fly Head Cloud', icon: '🪰', kind: 'basic', desc: 'A buzzing cloud of Grade 4 fly heads pours out in a cone, chewing on curses and slowing them.', cd: 1.6, ce: 4, branch: 'Swarm', tier: 1, req: 'swarm', use: () => this.flyCloud() }),
      spirit_bomb: ability({ name: 'Bloater Spirit', icon: '🎈', kind: 'summon', desc: 'Release a bloated spirit that waddles to the nearest curse and bursts.', cd: 7, ce: 12, branch: 'Swarm', tier: 2, req: 'fly_heads', use: () => this.spiritBomb() }),
      rampart: ability({ name: 'Spirit Rampart', icon: '🧱', kind: 'defence', desc: 'Lesser spirits pile up around you for 4s: half damage taken, and curses that come close are gnawed on.', cd: 14, ce: 14, branch: 'Swarm', tier: 2, req: 'swarm', use: () => this.rampart() }),
      maw: ability({ name: 'Spirit Maw', icon: '👄', kind: 'technique', desc: 'A colossal curse mouth bursts out of the marked ground and bites down. Weakened curses it catches are swallowed into your stock.', cd: 10, ce: 16, branch: 'Swarm', tier: 3, req: 'spirit_bomb', use: () => this.spiritMaw() }),
      // ---- summoned spirits
      release: ability({ name: 'Release Spirits', icon: '👹', kind: 'summon', desc: 'Absorbed curses fight at your side. A big stock buys a Grade 2 bruiser.', cd: 12, ce: 16, branch: 'Spirits', tier: 1, legacy: 't1', use: () => this.release() }),
      stalkers: ability({ name: 'Shadow Stalkers', icon: '🥷', kind: 'summon', desc: 'Two fast Grade 2 stalkers that hunt down curses and hit hard.', cd: 14, ce: 16, branch: 'Spirits', tier: 2, req: 'release', use: () => this.summonStalkers() }),
      maw_pillar: ability({ name: 'Maw Pillar', icon: '🗿', kind: 'summon', desc: 'Plant a rooted pillar spirit that spits at every curse in range for 14s.', cd: 16, ce: 18, branch: 'Spirits', tier: 2, req: 'release', use: () => this.mawPillar() }),
      bulwark: ability({ name: 'Grade 2 Bulwark', icon: '🛡️', kind: 'summon', desc: 'A hulking armoured spirit that draws every curse nearby onto itself.', cd: 20, ce: 22, branch: 'Spirits', tier: 3, req: 'stalkers', use: () => this.bulwark() }),
      manta: ability({ name: 'Manta Ray', icon: '🪽', kind: 'movement', desc: 'Ride a flying ray-shaped spirit over the battlefield, dropping grubs on the curses below.', cd: 7, ce: 8, branch: 'Spirits', tier: 3, req: 'maw_pillar', use: () => this.mantaRide() }),
      night_parade: ability({ name: 'Night Parade of a Hundred Demons', icon: '🏮', kind: 'summon', desc: 'The night parade: a wave of spirits floods forward through the (marked) street, trampling curses, then stays to fight.', cd: 30, ce: 40, branch: 'Spirits', tier: 4, req: 'bulwark', use: () => this.nightParade() }),
      // ---- Grade 1 cursed spirits
      dragon: ability({ name: 'Rainbow Dragon', icon: '🐉', kind: 'technique', desc: 'An armoured serpent spirit tears through a line of curses.', cd: 10, ce: 20, branch: 'Grade 1', tier: 1, legacy: 't2', use: () => this.dragon() }),
      kuchisake: ability({ name: 'Kuchisake-onna', icon: '✂️', kind: 'summon', desc: '"Am I pretty?" Every curse around her is bound until the question is answered — then her giant scissors cut them.', cd: 16, ce: 28, branch: 'Grade 1', tier: 2, legacy: 't3', req: 'dragon', use: () => this.kuchisake() }),
      dragon_coil: ability({ name: 'Rainbow Dragon: Coil', icon: '🌈', kind: 'defence', desc: 'The dragon coils around you for 3s: its armoured body stops 70% of every hit and grinds curses that come close.', cd: 18, ce: 22, branch: 'Grade 1', tier: 3, req: 'dragon', use: () => this.dragonCoil() }),
      smallpox: ability({ name: 'Smallpox Deity', icon: '⚰️', kind: 'technique', desc: 'A grave rises around the aimed curse and a coffin seals it. Count of three — then the grave closes.', cd: 22, ce: 32, branch: 'Grade 1', tier: 4, req: 'kuchisake', use: () => this.smallpox() }),
      // ---- Special Grade
      tamamo: ability({ name: 'Tamamo-no-Mae', icon: '🦊', kind: 'summon', desc: 'The special grade vengeful spirit from the Night Parade: she hovers over the field for 7s, raining foxfire on every curse.', cd: 26, ce: 34, branch: 'Special Grade', tier: 2, req: 'dragon', use: () => this.tamamo() }),
      lesser_uzumaki: ability({ name: 'Uzumaki', icon: '🌀', kind: 'technique', desc: 'Compress up to three stocked spirits into a spiral beam. Every stock spent makes it far stronger.', cd: 14, ce: 26, branch: 'Special Grade', tier: 3, req: 'tamamo', use: () => this.lesserUzumaki() }),
      idle_transfig: ability({ name: 'Extracted: Idle Transfiguration', icon: '✋', kind: 'technique', desc: 'Kenjaku pulled Mahito\'s technique out with Uzumaki: a touch that reshapes the soul. A weakened curse becomes a transfigured spirit that fights for you.', cd: 12, ce: 20, branch: 'Special Grade', tier: 5, req: 'lesser_uzumaki', use: () => this.extractedTouch() }),
      // ---- absorption
      absorb_ab: ability({ name: 'Absorb', icon: '⚫', kind: 'technique', desc: 'Crush a weakened curse (below 40% health) into a black ball and swallow it: +1 stock and you recover 8% health.', cd: 8, ce: 8, branch: 'Absorption', tier: 1, use: () => this.absorbAbility() }),
      horde: ability({ name: 'Stock Release: Horde', icon: '👾', kind: 'summon', desc: 'Empty your stock: every absorbed curse is released at once as a spirit.', cd: 18, ce: 10, branch: 'Absorption', tier: 2, req: 'absorb_ab', use: () => this.horde() }),
      feast: ability({ name: 'Spirit Feast', icon: '🍖', kind: 'buff', desc: 'Your spirits are fully healed, last 6s longer and hit 50% harder for 8s.', cd: 20, ce: 16, branch: 'Absorption', tier: 3, req: 'horde', use: () => this.feast() }),
    };
    this.passives = {
      spirit_master: passive({ name: 'Spirit Master', icon: '👺', desc: 'Your spirits have 30% more health and last 4s longer.', branch: 'Spirits', tier: 2, req: 'release', apply: (pl, k) => { k.spiritHp = 0.3; k.spiritLife = 4; } }),
      grade1: passive({ name: 'Grade 1 Collection', icon: '📿', desc: 'Grade 1 spirits (Rainbow Dragon, Kuchisake-onna, Smallpox Deity) deal 20% more damage.', branch: 'Grade 1', tier: 3, req: 'kuchisake', apply: (pl, k) => { k.g1 = 1.2; } }),
      rag_taste: passive({ name: 'Taste of Rags', icon: '🤢', desc: 'Swallowing a curse tastes vile — but every one absorbed heals 10% health and restores 10 Cursed Energy.', branch: 'Absorption', tier: 2, req: 'absorb_ab', apply: (pl, k) => { k.ragTaste = true; } }),
      vast_stock: passive({ name: 'Vast Stock', icon: '🗃️', desc: 'Stock holds up to 15 curses and the swarm absorbs curses 15% more often.', branch: 'Absorption', tier: 3, req: 'horde', apply: (pl, k) => { k.stockMax = 15; k.absorbBonus = 0.15; } }),
    };
    this.ultimate = { name: 'Maximum: Uzumaki', icon: '🌀', use: () => this.uzumaki() };
    this.stock = 0;
  }
  dispose() {
    super.dispose(); this.disposed = true;
    if (this.tama) { this.game.scene.remove(this.tama); this.tama = null; }
    if (this.kuchi) { this.game.scene.remove(this.kuchi); this.kuchi = null; }
    if (this.uzuOrb) { this.game.scene.remove(this.uzuOrb); this.game.lights.remove(this.uzuLight); this.uzuOrb = null; this.game.fx.dimTarget = 0; }
  }
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
    const s = new Spirit(g, p, model, pos, { life: (life ?? 18 + hard * 6) + (this.spiritLife ?? 0), hpMult: 1 + hard * 0.4 + (this.spiritHp ?? 0) });
    g.allies.push(s);
    return s;
  }
  // a weakened curse is swallowed into Geto's stock
  absorb(e) {
    const g = this.game, p = this.p;
    if (!e.dead) g.combat.damageEnemy(e, (e.hp + 1) / Math.max(0.2, 1 - (e.armor ?? 0)), p, { unblockable: true, stagger: 0, color: '#9a5aff' });
    if (!e.dead) return;
    this.stock = Math.min(this.stockMax ?? 10, this.stock + 1);
    if (this.ragTaste) { p.heal?.(p.maxHp * 0.1, true); p.gainCE(10); }
    const from = e.pos.clone().setY(e.pos.y + e.height * 0.5);
    for (let i = 0; i < 14; i++) {
      const k = i / 14;
      g.particles.glow.spawn({ x: from.x, y: from.y, z: from.z, vx: (p.pos.x - from.x) * (1.4 + k), vy: (p.pos.y + 1.2 - from.y) * 1.5 + 1, vz: (p.pos.z - from.z) * (1.4 + k), life: 0.6, r: 1.4, g: 0.7, b: 2.6, size: 0.2, drag: 0.5 });
    }
    g.particles.burst(from, { count: 18, color: BLACK, additive: false, speed: 2, life: 0.6, size: 0.5, sizeEnd: 0.1 });
    g.fx.darkRings.spawn(tmp.set(from.x, e.pos.y + 0.06, from.z), { color: 0x000000, r0: 1.8, r1: 0.1, dur: 0.4, thick: 0.35 });
    g.audio?.tone({ freq: 220, to: 70, dur: 0.35, gain: 0.12, type: 'sawtooth', filter: 900 });
  }
  spiralFx(at, h = 1.5) {
    const g = this.game;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 4, y = at.y + i / 10 * h * 1.2;
      g.particles.glow.spawn({ x: at.x + Math.cos(a) * 0.9, y, z: at.z + Math.sin(a) * 0.9, vx: -Math.cos(a) * 2, vy: 0.5, vz: -Math.sin(a) * 2, life: 0.35, r: 1.4, g: 0.6, b: 2.4, size: 0.14, drag: 2 });
    }
  }
  tick() {
    // banked stock circles Geto as tiny dark spirits
    const g = this.game, p = this.p;
    if (this.stock > 0 && Math.random() < 0.5) {
      const a = g.time * 3 + Math.floor(Math.random() * this.stock) / this.stock * Math.PI * 2;
      g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * 1.1, y: p.pos.y + 1.3 + Math.sin(g.time * 4 + a) * 0.2, z: p.pos.z + Math.sin(a) * 1.1, life: 0.3, r: 1.2, g: 0.5, b: 2.2, size: 0.16, sizeEnd: 0.5 });
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
          if (e.dead && !e.isDummy && !e.isBoss && Math.random() < 0.25 + rk * 0.1 + (this.absorbBonus ?? 0)) this.absorb(e);
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
    const N = 16;
    const { grp, segs } = buildDragon(g, size, N);
    const light = g.lights.attach(segs[0], VIOLET, 6, 9, { offsetY: 0, priority: 4 });
    const trail = [start.clone()];
    const hit = new Set();
    const dmg = (40 + rk * 14) * (this.g1 ?? 1);
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
      disposeGroup(g, grp); g.lights.remove(light);
      return false;
    });
    g.shake(0.2);
  }
  // Kuchisake-onna: "Am I pretty?" Everyone she asks is bound until they
  // answer; then the scissors come down.
  kuchisake() {
    const g = this.game, p = this.p, rk = this.rank('abyss');
    if (this.kuchi) return false;
    const t = this.aimTarget() ?? g.nearestEnemy(p.pos, 10);
    const at = (t ? t.pos : p.aimPoint).clone(); tmp.subVectors(at, p.pos).setY(0);
    if (tmp.length() > 9) at.copy(p.pos).addScaledVector(tmp.normalize(), 9);
    const gy = g.world.groundBelow(at.x, at.z, p.pos.y + 3); at.y = isFinite(gy) && Math.abs(gy - p.pos.y) < 4 ? gy : p.pos.y;
    this.cast(0.5, true);
    const fig = this.buildKuchisake(); fig.position.copy(at); fig.rotation.y = Math.atan2(p.pos.x - at.x, p.pos.z - at.z) + Math.PI;
    g.scene.add(fig); this.kuchi = fig;
    g.fx.summonCircle(at, VIOLET);
    g.particles.burst(at.clone().setY(at.y + 1), { count: 30, color: BLACK, additive: false, speed: 3, up: 1.5, life: 0.9, size: 0.7, sizeEnd: 2 });
    g.audio?.energy('summon');
    const R = 6.5, hold = 1.6 + rk * 0.4;
    g.fx.damageNumber(at.clone().setY(at.y + 1.2), 0, { text: '「Am I pretty?」', color: '#ffd0d8' });
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: 0xff8aa8, r0: 0.5, r1: R, dur: 0.5, thick: 0.08 });
    // the question binds: no one moves until it is answered
    const bound = [];
    for (const e of this.targetsNear(at, R)) {
      e.cancelAttack?.();
      e.sealT = Math.max(e.sealT ?? 0, e.isBoss ? hold * 0.5 : hold);
      bound.push(e);
    }
    g.audio?.tone({ freq: 660, to: 520, dur: 0.6, gain: 0.07, type: 'triangle', rev: 0.6 });
    let t2 = 0, snipped = false;
    g.addUpdater((dt) => {
      if (this.kuchi !== fig) return false;
      t2 += dt;
      fig.userData.blades.rotation.z = Math.sin(t2 * (snipped ? 2 : 10)) * 0.25 + 0.3;
      if (!snipped && t2 >= hold * 0.8) {
        snipped = true;
        for (const e of bound) {
          if (e.dead) continue;
          const c = e.pos.clone().setY(e.pos.y + e.height * 0.55);
          g.combat.damageEnemy(e, (34 + rk * 14) * (this.g1 ?? 1), p, { unblockable: true, stagger: 0.8, color: '#ffb0c0', knock: tmp.subVectors(e.pos, at).setY(0).normalize().multiplyScalar(4) });
          g.fx.slashX(c, 2 + e.height * 0.4, 0xff8aa8);
          g.fx.hitSpark(c, null, { color: 0xff8aa8, big: true });
        }
        g.fx.slashArc(at, fig.rotation.y, 0xff8aa8, R * 0.7, 1, 0.25);
        g.shake(0.3); if (bound.length) g.hitStop(0.06);
        g.audio?.energy('slash'); g.audio?.impact(1.3);
      }
      if (t2 < hold + 0.4) return true;
      g.particles.burst(fig.position.clone().setY(at.y + 1.2), { count: 24, color: DEEP, speed: 3, life: 0.7, size: 0.4, sizeEnd: 1.5 });
      g.scene.remove(fig); this.kuchi = null;
      return false;
    });
  }
  buildKuchisake() {
    const grp = new THREE.Group();
    const m = (c, e = 0) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.75, emissive: e ? c : 0, emissiveIntensity: e });
    const coat = m(0xc8b898), hair = m(0x0a0a0c), skin = m(0xf0e0d8), mask = m(0xf4f4f0), steel = m(0xd0d4dc), red = m(0xff2a3a, 2);
    const box = (w, h, d, x, y, z, mat, par = grp) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.castShadow = true; par.add(b); return b; };
    box(0.8, 1.6, 0.5, 0, 0.8, 0, coat);                 // long trench coat
    box(0.7, 0.7, 0.45, 0, 1.95, 0, coat);
    box(0.45, 0.45, 0.45, 0, 2.55, 0, skin);             // head
    box(0.47, 0.18, 0.08, 0, 2.47, 0.24, mask);          // surgical mask hiding the slit
    box(0.06, 0.04, 0.02, -0.1, 2.62, 0.235, red); box(0.06, 0.04, 0.02, 0.1, 2.62, 0.235, red);
    box(0.55, 0.3, 0.55, 0, 2.8, -0.02, hair);           // long black hair
    box(0.55, 1.1, 0.2, 0, 2.1, -0.25, hair);
    // the giant scissors in her right hand
    const blades = new THREE.Group(); blades.position.set(0.55, 1.6, 0.2); grp.add(blades);
    box(0.08, 1.4, 0.05, 0, 0.7, 0, steel, blades);
    const b2 = box(0.08, 1.4, 0.05, 0, 0.7, 0, steel, blades); b2.rotation.z = -0.5;
    box(0.25, 0.25, 0.06, 0, -0.1, 0, m(0x3a1a1a), blades);
    grp.userData.blades = blades;
    return grp;
  }
  // ============================================================== tree abilities
  // spawn a spirit at a given spot (summon() places them around Geto)
  summonAt(model, pos, life, o = {}) {
    const g = this.game, p = this.p;
    const mine = this.spirits();
    while (mine.length >= (o.cap ?? 8)) mine.shift().despawn();
    const gy = g.world.groundBelow(pos.x, pos.z, pos.y + 2);
    const at = pos.clone(); if (isFinite(gy) && Math.abs(gy - pos.y) < 4) at.y = gy; else at.copy(p.pos);
    const hard = this.rank('hardy');
    const s = new Spirit(g, p, model, at, { life: life + (this.spiritLife ?? 0), hpMult: (o.hpMult ?? 1) * (1 + hard * 0.4 + (this.spiritHp ?? 0)), dmgMult: o.dmgMult ?? 1 });
    g.allies.push(s);
    return s;
  }
  flyCloud() {
    const g = this.game, p = this.p, rk = this.rank('swarm');
    this.cast(0.3);
    const f = this.fwd(), from = this.handPos();
    for (let i = 0; i < 26; i++) {
      const a = this.aimAngle() + (Math.random() - 0.5) * 1.1, sp = 6 + Math.random() * 6;
      g.particles.burst(from, { count: 1, color: i % 3 ? 0x2a2a1a : VIOLET, additive: i % 3 === 0, speed: 0.2, dir: tmp.set(Math.sin(a) * sp, (Math.random() - 0.3) * 2, Math.cos(a) * sp), life: 0.5, size: 0.22, sizeEnd: 0.15, drag: 1.5 });
    }
    g.audio?.noise?.({ dur: 0.35, gain: 0.18, type: 'bandpass', freq: 420, q: 3 });
    for (let k = 0; k < 2; k++) this.after(0.12 + k * 0.18, () => {
      for (const e of this.foes(p.pos, 5.5, f, 0.6)) { g.combat.damageEnemy(e, 7 + rk * 2, p, { stagger: 0.2, knock: f.clone().multiplyScalar(1) }); this.slow(e, 1); if (e.dead && !e.isDummy && !e.isBoss && Math.random() < 0.15 + (this.absorbBonus ?? 0)) this.absorb(e); }
    });
  }
  spiritBomb() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const at = p.pos.clone().addScaledVector(this.fwd(), 1.5);
    const s = this.summonAt('blob', at, 8, { cap: 10 });
    s.object.scale.setScalar(1.3);
    g.audio?.energy('summon');
  }
  rampart() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    g.toast?.('🧱 Spirit Rampart'); g.audio?.energy('summon');
    let tick = 0;
    this.buff('rampart', 4, {
      incoming: (a) => a * 0.5,
      onTick: (dt) => {
        // a churning ring of dark little spirits
        for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; g.particles.burst(tmp.set(p.pos.x + Math.cos(a) * 1.4, p.pos.y + 0.3 + Math.random() * 1.6, p.pos.z + Math.sin(a) * 1.4), { count: 1, color: i ? BLACK : VIOLET, additive: !i, speed: 0.4, life: 0.4, size: 0.4, sizeEnd: 0.15 }); }
        tick -= dt;
        if (tick <= 0) { tick = 0.4; for (const e of this.foes(p.pos, 2.4)) g.combat.damageEnemy(e, 6, p, { stagger: 0.2, knock: tmp2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(3), ceGain: 1 }); }
      },
    });
  }
  spiritMaw() {
    const g = this.game, p = this.p, R = 3;
    const c = this.aimGround(11);
    this.cast(0.4, true);
    g.fx.darkRings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: 0x000000, r0: R, r1: R * 0.9, dur: 0.6, thick: 0.25 });
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.09, c.z), { color: VIOLET, r0: 0.3, r1: R, dur: 0.5, thick: 0.08 });
    g.audio?.tone?.({ freq: 90, to: 50, dur: 0.6, gain: 0.15, type: 'sawtooth', filter: 600 });
    // the jaws: two rows of teeth rising out of the ground, then snapping shut
    const grp = new THREE.Group(); grp.position.copy(c); g.scene.add(grp);
    const gum = new THREE.MeshStandardNodeMaterial({ color: 0x3a1020, roughness: 0.6 }), tooth = new THREE.MeshStandardNodeMaterial({ color: 0xf0e8d0, roughness: 0.5 });
    const jaws = [];
    for (const side of [-1, 1]) {
      const j = new THREE.Group(); j.position.z = side * R * 0.9; grp.add(j); jaws.push(j);
      const base = new THREE.Mesh(new THREE.BoxGeometry(R * 2, 0.6, 0.8), gum); j.add(base);
      for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), tooth); t.position.set((i - 3) * R * 0.28, 0.8, -side * 0.2); t.rotation.x = side * 0.35; j.add(t); }
    }
    grp.rotation.y = this.aimAngle(); grp.position.y = c.y - 2;
    this.during(0.9, (t) => {
      grp.position.y = c.y - 2 + Math.min(1, t / 0.4) * 2;
      const shut = t < 0.45 ? 0 : Math.min(1, (t - 0.45) / 0.1);
      jaws.forEach((j, i) => { j.position.z = (i ? 1 : -1) * R * 0.9 * (1 - shut * 0.85); j.rotation.x = (i ? 1 : -1) * (0.9 - shut * 0.9); });
    }, () => disposeGroup(g, grp));
    this.after(0.55, () => {
      const n = g.combat.aoe(c, R, 50, p, { stagger: 1, knock: 2, blocks: false, color: '#c8a0ff' });
      for (const e of this.foes(c, R)) if (!e.isBoss && !e.isDummy && e.hp / e.maxHp < 0.35) this.absorb(e);
      g.debris.burst(c.clone().setY(c.y + 0.3), B.stone, 8, 1);
      g.shake(0.45); g.hitStop(n ? 0.07 : 0.02); g.audio?.impact(1.7);
    });
  }
  summonStalkers() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    for (let i = 0; i < 2; i++) this.summonAt('shadow', p.pos.clone().add(tmp.set(Math.sin(p.facing + (i ? 1.6 : -1.6)) * 1.6, 0, Math.cos(p.facing + (i ? 1.6 : -1.6)) * 1.6)), 16, { dmgMult: 1 + this.rank('legion') * 0.1 });
    g.fx.flash(DEEP, 0.2, 0.12); g.audio?.energy('summon');
  }
  mawPillar() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const at = this.aimGround(7);
    const s = this.summonAt('maw', at, 14);
    s.facing = this.aimAngle();
    g.debris.burst(at.clone().setY(at.y + 0.3), B.stone, 6, 0.8);
    g.audio?.energy('summon');
  }
  bulwark() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const at = p.pos.clone().addScaledVector(this.fwd(), 2.5);
    const s = this.summonAt('tank', at, 16, { hpMult: 2.2 });
    s.object.scale.multiplyScalar(1.15);
    // every curse nearby turns on it
    g.fx.rings.spawn(tmp.set(s.pos.x, s.pos.y + 0.1, s.pos.z), { color: VIOLET, r0: 0.5, r1: 10, dur: 0.5, thick: 0.12 });
    for (const e of this.near(s.pos, 10, (e) => !e.isBoss)) e.target = s;
    this.buff('bulwark_taunt', 6, { onTick: () => { if (s.dead) return; for (const e of this.near(s.pos, 8, (e) => !e.isBoss && e.target === p)) e.target = s; } });
    g.audio?.energy('summon'); g.shake(0.25);
  }
  mantaRide() {
    const g = this.game, p = this.p, f = this.fwd();
    // a flat, ray-shaped spirit under Geto's feet
    const ray = new THREE.Group();
    const skin = new THREE.MeshStandardNodeMaterial({ color: 0x3a2a5a, roughness: 0.5, emissive: VIOLET, emissiveIntensity: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.8), skin); ray.add(body);
    const wings = [];
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.2), skin); w.position.x = sx * 1.3; ray.add(w); wings.push(w); }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 1.6), skin); tail.position.z = -1.6; ray.add(tail);
    g.scene.add(ray);
    g.audio?.whoosh(1.4); g.audio?.energy('summon');
    let drop = 0;
    this.dash(f, 11, 0.45, { color: VIOLET, iframes: 0.6, onEnd: () => disposeGroup(g, ray) });
    p.vel.y = 4;
    this.during(0.45, (t, dt) => {
      ray.position.set(p.pos.x, p.pos.y - 0.05, p.pos.z); ray.rotation.y = Math.atan2(f.x, f.z);
      wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 24) * 0.35; });
      drop -= dt;
      if (drop <= 0) {
        drop = 0.09;
        for (const e of this.foes(p.pos, 2.2)) g.combat.damageEnemy(e, 9, p, { stagger: 0.3, knock: f.clone().multiplyScalar(2) });
        g.particles.burst(tmp.set(p.pos.x, p.pos.y, p.pos.z), { count: 3, color: VIOLET, speed: 1.5, life: 0.4, size: 0.25, sizeEnd: 0.05, gravity: 8 });
      }
    });
  }
  nightParade() {
    const g = this.game, p = this.p;
    const f = this.fwd(), side = new THREE.Vector3(f.z, 0, -f.x), L = 18, W = 3.5;
    this.cast(0.7, true);
    g.toast?.('🏮 Night Parade of a Hundred Demons', 'big');
    // the street they will flood is marked
    for (const s of [-W, W]) g.fx.slashLine(p.pos.clone().setY(p.pos.y + 0.12).addScaledVector(side, s), f, L, VIOLET, 0.12, 1);
    g.fx.flash(DEEP, 0.3, 0.2); g.audio?.energy('summon');
    const start = p.pos.clone().addScaledVector(f, -1);
    const hit = new Set();
    // a stampede of dark shapes running down the street
    this.during(1.1, (t, dt, k) => {
      const head = start.clone().addScaledVector(f, L * k);
      for (let i = 0; i < 6; i++) { const o = (Math.random() - 0.5) * 2 * W; g.particles.burst(tmp.copy(head).addScaledVector(side, o).setY(head.y + 0.4 + Math.random() * 1.6), { count: 1, color: i % 3 ? BLACK : VIOLET, additive: i % 3 === 0, speed: 1, dir: f.clone().multiplyScalar(6), life: 0.5, size: 0.7, sizeEnd: 0.2 }); }
      this.line(start, f, L * k, W, (e, along) => {
        if (hit.has(e) || along < L * k - 2.5) return;
        hit.add(e);
        g.combat.damageEnemy(e, 34 + this.rank('legion') * 6, p, { stagger: 0.8, knock: f.clone().multiplyScalar(8) });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: VIOLET, big: true });
      });
      if (Math.random() < 0.3) g.shake(0.1);
    }, () => {
      // the parade stays to fight
      const kinds = ['swarmer', 'imp', 'spitter', 'shadow', 'swarmer', 'flyhead'];
      kinds.forEach((m, i) => this.summonAt(m, start.clone().addScaledVector(f, L * (0.4 + i * 0.1)).addScaledVector(side, (i % 2 ? 1 : -1) * 1.5), 10, { cap: 12 }));
    });
  }
  dragonCoil() {
    const g = this.game, p = this.p, rk = this.rank('dragon');
    this.cast(0.4, true);
    const N = 14, size = 0.9 + rk * 0.1;
    const { grp, segs } = buildDragon(g, size, N);
    const light = g.lights.attach(segs[0], VIOLET, 5, 8, { offsetY: 0, priority: 4 });
    g.audio?.energy('summon'); g.toast?.('🌈 Rainbow Dragon: Coil');
    let tick = 0;
    const done = () => { disposeGroup(g, grp); g.lights.remove(light); };
    this.buff('coil', 3, {
      incoming: (a) => a * 0.3,
      onTick: (dt) => {
        const b = this.buffs.get('coil'), t = 3 - (b?.left ?? 0);
        segs.forEach((seg, i) => {
          const a = t * 3 - i * 0.42, r = 1.6, y = 0.4 + i * 0.09 + Math.sin(t * 4 + i * 0.5) * 0.15;
          seg.visible = true; seg.position.set(p.pos.x + Math.cos(a) * r, p.pos.y + y, p.pos.z + Math.sin(a) * r);
          seg.lookAt(p.pos.x + Math.cos(a + 0.4) * r, p.pos.y + y, p.pos.z + Math.sin(a + 0.4) * r);
        });
        tick -= dt;
        if (tick <= 0) { tick = 0.3; for (const e of this.foes(p.pos, 3.2)) g.combat.damageEnemy(e, (10 + rk * 3) * (this.g1 ?? 1), p, { stagger: 0.4, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(5), ceGain: 1 }); }
      },
      onEnd: done,
    });
  }
  smallpox() {
    const g = this.game, p = this.p;
    const t = this.target(12);
    if (!t) { g.toast?.('No curse to bury'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    const c = t.pos.clone();
    // a ring of grave markers, a coffin closing around the curse
    const grp = new THREE.Group(); grp.position.copy(c); g.scene.add(grp);
    const stone = new THREE.MeshStandardNodeMaterial({ color: 0x8a8a90, roughness: 0.9 }), wood = new THREE.MeshStandardNodeMaterial({ color: 0x4a2a1a, roughness: 0.8 }), cloth = new THREE.MeshStandardNodeMaterial({ color: 0xe8e0d0, roughness: 0.9 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.2), stone); m.position.set(Math.cos(a) * 3, -1.4, Math.sin(a) * 3); m.rotation.y = -a; grp.add(m); }
    const H = t.height + 0.6, Wd = t.radius * 2 + 0.6;
    const coffin = new THREE.Group(); grp.add(coffin);
    for (const [w, h, d, x, z] of [[Wd, H, 0.15, 0, Wd / 2], [Wd, H, 0.15, 0, -Wd / 2], [0.15, H, Wd, Wd / 2, 0], [0.15, H, Wd, -Wd / 2, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, H / 2, z); coffin.add(m); }
    const lid = new THREE.Mesh(new THREE.BoxGeometry(Wd + 0.2, 0.15, Wd + 0.2), wood); lid.position.y = H + 4; grp.add(lid);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.05), cloth); tag.position.set(0, H * 0.6, Wd / 2 + 0.1); coffin.add(tag);
    coffin.scale.y = 0.01;
    g.audio?.tone?.({ freq: 110, to: 70, dur: 0.8, gain: 0.15, type: 'sawtooth', filter: 500, rev: 0.6 });
    const hold = 3;
    this.stun(t, t.isBoss ? 1.5 : hold + 0.4);
    if (!t.isBoss) t.sealT = Math.max(t.sealT ?? 0, hold + 0.4);
    let count = 3;
    this.during(hold + 0.5, (tt) => {
      grp.children.forEach((m) => { if (m.geometry?.parameters?.height === 1.4) m.position.y = Math.min(0.7, -1.4 + tt * 4); });
      coffin.scale.y = Math.min(1, tt * 2);
      if (!t.dead && !t.isBoss) { t.pos.x = c.x; t.pos.z = c.z; }
      lid.position.y = H + 4 - Math.min(1, tt / hold) * 4;
      if (tt >= (3 - count) * (hold / 3) && count > 0) { g.fx.damageNumber(c.clone().setY(c.y + H + 0.8), 0, { text: String(count), color: '#e8e0d0' }); g.audio?.tone?.({ freq: 300, to: 300, dur: 0.12, gain: 0.1, type: 'square' }); count--; }
    }, () => disposeGroup(g, grp));
    this.after(hold, () => {
      if (t.dead) return;
      const dmg = (90 + Math.min(t.maxHp * (t.isBoss ? 0.12 : 0.6), t.isBoss ? 420 : 600)) * (this.g1 ?? 1);
      g.combat.damageEnemy(t, dmg, p, { unblockable: true, stagger: 1.2, knock: new THREE.Vector3(), color: '#e8e0d0' });
      g.combat.aoe(c, 3, 26, p, { knock: 6, stagger: 0.5, blocks: false });
      g.fx.shockwave(c, 0xe8e0d0, 4); g.debris.burst(c.clone().setY(c.y + 0.4), B.stone, 10, 1.2);
      g.fx.screenWave(c.clone().setY(c.y + 1), 0.9, 0.4);
      g.shake(0.55); g.hitStop(0.1); g.audio?.impact(2);
    });
  }
  tamamo() {
    const g = this.game, p = this.p;
    if (this.tama) return false;
    this.cast(0.6, true);
    const fig = this.buildTamamo();
    const at = p.pos.clone().addScaledVector(this.fwd(), -1.5).setY(p.pos.y + 2.2);
    fig.position.copy(at); g.scene.add(fig); this.tama = fig;
    const light = g.lights.attach(fig, 0x9ad8ff, 8, 12, { offsetY: 1, priority: 4 });
    g.fx.summonCircle(p.pos, 0x9ad8ff); g.fx.flash(0x203050, 0.3, 0.2);
    g.toast?.('🦊 Tamamo-no-Mae', 'big'); g.audio?.energy('summon');
    let shot = 0;
    this.during(7, (t, dt) => {
      if (this.tama !== fig) return false;
      fig.position.lerp(tmp.set(p.pos.x - Math.sin(p.facing) * 1.5, p.pos.y + 2.4 + Math.sin(t * 2) * 0.3, p.pos.z - Math.cos(p.facing) * 1.5), Math.min(1, dt * 3));
      fig.rotation.y = p.facing;
      fig.userData.tails.forEach((tl, i) => { tl.rotation.z = Math.sin(t * 3 + i) * 0.3 + (i - 4) * 0.18; });
      shot -= dt;
      if (shot <= 0) {
        shot = 0.4;
        const e = g.nearestEnemy(fig.position, 16);
        if (e) g.projectiles.fire({ pos: fig.position.clone().setY(fig.position.y + 1), vel: tmp.subVectors(e.pos, fig.position).setY(1).normalize().multiplyScalar(14), team: 'player', shape: 'orb', color: 0x7ab8ff, emissive: 3, scale: 1.4, life: 1.6, radius: 0.5, homing: 8, target: e, light: 2,
          trail: (q) => g.particles.burst(q.pos, { count: 1, color: 0x7ab8ff, speed: 0.3, life: 0.3, size: 0.3, sizeEnd: 0.05 }),
          onHit: (en, q) => { g.combat.damageEnemy(en, 18, p, { stagger: 0.3, knock: q.vel.clone().setLength(2), color: '#9ad8ff' }); g.fx.explosion(q.pos, 0x7ab8ff, 1.2); } });
      }
    }, () => { g.particles.burst(fig.position.clone(), { count: 30, color: 0x9ad8ff, speed: 3, life: 0.6, size: 0.3, sizeEnd: 0.05 }); disposeGroup(g, fig); g.lights.remove(light); if (this.tama === fig) this.tama = null; });
  }
  buildTamamo() {
    const grp = new THREE.Group();
    const m = (c, e = 0) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.6, emissive: e ? c : 0, emissiveIntensity: e });
    const robe = m(0xf4f0ff, 0.25), hair = m(0x1a1a2a), skin = m(0xf8eee8), fire = m(0x7ab8ff, 2.5), red = m(0xc02030);
    const box = (w, h, d, x, y, z, mat, par = grp) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); par.add(b); return b; };
    box(1, 1.6, 0.7, 0, 0, 0, robe); box(1.3, 0.3, 0.9, 0, -0.9, 0, robe);
    box(0.6, 0.6, 0.6, 0, 1.15, 0, skin); box(0.7, 0.4, 0.7, 0, 1.45, -0.05, hair); box(0.7, 1.2, 0.2, 0, 0.9, -0.35, hair);
    box(0.1, 0.06, 0.02, -0.13, 1.2, 0.31, red); box(0.1, 0.06, 0.02, 0.13, 1.2, 0.31, red);
    for (const sx of [-0.2, 0.2]) box(0.12, 0.3, 0.12, sx, 1.8, 0, hair);   // fox ears
    const tails = [];
    for (let i = 0; i < 9; i++) { const t = new THREE.Group(); t.position.set(0, -0.6, -0.4); grp.add(t); box(0.18, 1.4, 0.18, 0, -0.7, -0.3, i % 2 ? robe : fire, t); tails.push(t); }
    grp.userData.tails = tails;
    return grp;
  }
  lesserUzumaki() {
    const g = this.game, p = this.p, rk = this.rank('uzumaki');
    const spend = Math.min(3, this.stock);
    this.stock -= spend;
    const power = spend * 2 + 2;
    p.action = { type: 'cast', both: true, dur: 0.75, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    const orb = makeOrb(VIOLET, { radius: 0.3, darkCore: true, coreColor: 0x000000 });
    g.scene.add(orb);
    g.audio?.charge?.(0.5, 0.5);
    if (spend) g.toast?.(`🌀 Uzumaki — ${spend} stock compressed`);
    this.during(0.55, (t, dt, k) => {
      orb.position.copy(this.handPos().setY(p.pos.y + 2)); orb.scale.setScalar(0.3 + k * (0.6 + power * 0.08)); orb.rotation.y += dt * 12;
      this.spiralFx(p.pos, 1.5);
    }, () => {
      g.scene.remove(orb);
      if (p.action?.lock) p.action = null;
      const dir = p.aimDir.clone().setY(0).normalize(), from = this.handPos(), L = 18, W = 1.2 + power * 0.1;
      const dmg = 40 + spend * 28 + rk * 10;
      this.line(p.pos, dir, L, W, (e) => { g.combat.damageEnemy(e, dmg, p, { unblockable: true, stagger: 0.8, knock: dir.clone().multiplyScalar(8), color: '#c8a0ff' }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), dir, { color: VIOLET, big: true }); });
      const side = new THREE.Vector3(dir.z, 0, -dir.x);
      for (let s = 0; s < L; s += 0.5) for (const ph of [0, Math.PI]) { const a = s * 1.4 + ph; g.particles.glow.spawn({ x: from.x + dir.x * s + side.x * Math.cos(a) * W, y: from.y + Math.sin(a) * W * 0.8, z: from.z + dir.z * s + side.z * Math.cos(a) * W, vx: dir.x * 5, vz: dir.z * 5, life: 0.5, r: 1.6, g: 0.7, b: 2.8, size: 0.25, drag: 2, sizeEnd: 0.1 }); }
      g.fx.slashLine(from, dir, L, VIOLET, W * 1.4, 0.4); g.fx.slashLine(from, dir, L, 0xffffff, W * 0.4, 0.25);
      for (let s = 1; s < L; s += 1.5) g.combat.hitBlocks(tmp2.copy(from).addScaledVector(dir, s).setY(p.pos.y), dir, W, Math.PI, 50, p);
      g.fx.screenWave(from, 0.9, 0.4); g.shake(0.4); g.hitStop(0.06);
      g.audio?.energy('purple');
    });
  }
  extractedTouch() {
    const g = this.game, p = this.p, t = this.target(6);
    if (!t) { g.toast?.('No soul in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, 0x7ac8f0);
    this.pose('punch', 0.35);
    this.after(0.1, () => {
      if (t.dead) return;
      const at = t.pos.clone().setY(t.pos.y + t.height * 0.55), base = t.pos.clone();
      g.fx.arcs.spawn(at, { color: 0x7ac8f0, r0: 0.4, r1: 1.4 + t.radius, dur: 0.35, thick: 0.5, arc: 0.6, rotY: Math.random() * Math.PI * 2 });
      g.particles.burst(at, { count: 24, color: 0x7ac8f0, speed: 5, life: 0.5, size: 0.14, shape: 1, intensity: 3 });
      if (!t.isBoss && !t.isDummy && t.hp / t.maxHp < 0.5) {
        // the soul is reshaped: the body collapses into a transfigured spirit of Geto's
        g.combat.damageEnemy(t, (t.hp + 1) / Math.max(0.2, 1 - (t.armor ?? 0)), p, { unblockable: true, stagger: 0, color: '#7ac8f0' });
        if (t.dead) { g.fx.splat(at, 0xd8b0a8); g.fx.splat(at, 0x8a1a1a); this.summonAt('transfigured', base, 14); }
      } else {
        g.combat.damageEnemy(t, 48, p, { melee: true, unblockable: true, stagger: 0.9, color: '#7ac8f0' });
        this.slow(t, 3);
      }
      g.lights.flash(at, 0x7ac8f0, 8, 8, 0.25); g.hitStop(0.07); g.shake(0.3);
      g.audio?.tone?.({ freq: 500, to: 120, dur: 0.25, gain: 0.1, type: 'sawtooth', filter: 1600 });
    });
  }
  absorbAbility() {
    const g = this.game, p = this.p;
    const best = this.nearest(p.pos, (e) => !e.untargetable && !e.isBoss && !e.isDummy && e.hp / e.maxHp < 0.4, 9);
    if (!best) { g.toast?.('No curse weak enough to absorb (below 40%)'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    const at = best.pos.clone().setY(best.pos.y + best.height * 0.5);
    // the curse is crushed into a black ball, then swallowed
    const ball = makeOrb(BLACK, { radius: 0.25, darkCore: true, coreColor: 0x000000 }); ball.position.copy(at); g.scene.add(ball);
    this.absorb(best);
    p.heal?.(p.maxHp * 0.08, true);
    this.during(0.4, (t, dt, k) => { ball.position.lerpVectors(at, this.handPos().setY(p.pos.y + 1.6), k); ball.scale.setScalar(1 - k * 0.6); }, () => g.scene.remove(ball));
    g.fx.heal(p.pos, VIOLET);
  }
  horde() {
    const g = this.game, p = this.p;
    if (this.stock <= 0) { g.toast?.('Your stock is empty — absorb some curses first'); g.audio?.ui('back'); return false; }
    this.cast(0.6, true);
    const n = Math.min(8, this.stock);
    const kinds = ['swarmer', 'imp', 'spitter', 'flyhead', 'shadow', 'swarmer', 'tank', 'imp'];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; this.summonAt(kinds[i % kinds.length], p.pos.clone().add(tmp.set(Math.cos(a) * 2, 0, Math.sin(a) * 2)), 14, { cap: 12 }); }
    this.stock = 0;
    g.toast?.(`👾 ${n} spirits released`);
    g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0x000000, r0: 0.5, r1: 4, dur: 0.5, thick: 0.3 });
    g.fx.flash(DEEP, 0.25, 0.15); g.audio?.energy('summon');
  }
  feast() {
    const g = this.game, p = this.p;
    const mine = this.spirits();
    if (!mine.length) { g.toast?.('No spirits out to feed'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    for (const s of mine) { s.hp = s.maxHp; s.life += 6; g.fx.heal(s.pos, VIOLET); this.spiralFx(s.pos, s.height); }
    this.buff('feast', 8);
    g.toast?.('🍖 Spirit Feast'); g.audio?.energy('heal');
  }
  // Maximum: Uzumaki — the ultimate. Every spirit and stock, plus a horde
  // from Geto's reserve, compressed into one spiral.
  uzumaki() {
    const g = this.game, p = this.p, rk = this.rank('uzumaki');
    if (this.uzuOrb) return false;
    const mine = this.spirits();
    const power = Math.min(24, 8 + mine.length * (1 + rk * 0.25) + this.stock);
    // every spirit is drawn back and compressed
    for (const s of mine) {
      const from = s.pos.clone().setY(s.pos.y + s.height * 0.5);
      for (let i = 0; i < 12; i++) g.particles.glow.spawn({ x: from.x, y: from.y, z: from.z, vx: (p.pos.x - from.x) * 2, vy: (p.pos.y + 1.4 - from.y) * 2, vz: (p.pos.z - from.z) * 2, life: 0.5, r: 1.6, g: 0.8, b: 2.8, size: 0.25, drag: 0.3 });
      s.despawn();
    }
    this.stock = 0;
    const CH = 1.6;   // real seconds of charge
    p.action = { type: 'cast', both: true, dur: 9, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    p.iframes = Math.max(p.iframes, CH + 0.4);
    const orb = makeOrb(VIOLET, { radius: 0.3, darkCore: true, coreColor: 0x000000 });
    g.scene.add(orb); this.uzuOrb = orb;
    const light = g.lights.attach(orb, VIOLET, 10, 14, { offsetY: 0, priority: 6 }); this.uzuLight = light;
    g.fx.dimTarget = 0.5;
    g.slowMo(CH + 0.6, 0.35);
    g.toast?.('MAXIMUM: UZUMAKI', 'domain');
    this.after(0.6, () => g.toast?.(`🌀 ${Math.round(power * 186)} curses compressed into one`));
    g.rig.cinematic?.({ center: p.pos.clone().setY(p.pos.y + 1.5), dur: CH + 1.2, dist: 13, pitch: 0.35, orbit: 0.3 });
    g.audio?.charge(CH, 0.5); g.audio?.energy('summon');
    let t = 0, ring = 0;
    g.addUpdater((dt, realDt) => {
      if (this.uzuOrb !== orb) return false;
      if (p.dead) { g.scene.remove(orb); g.lights.remove(light); this.uzuOrb = null; g.fx.dimTarget = 0; p.action = null; return false; }
      t += realDt;
      p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
      // the mass hangs above his raised hand, swallowing the horde
      const hp = this.handPos().setY(p.pos.y + 2.4 + Math.min(1, t) * 0.8);
      orb.position.copy(hp); orb.rotation.y += realDt * 14;
      orb.scale.setScalar(0.4 + Math.min(1, t / CH) * (1.6 + power * 0.08));
      // curses pouring in from every direction: a black and violet vortex
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 7, y = hp.y + (Math.random() - 0.4) * 5;
        const sx = hp.x + Math.cos(a) * r, sz = hp.z + Math.sin(a) * r;
        g.particles.glow.spawn({ x: sx, y, z: sz, vx: (hp.x - sx) * 2.4 - Math.sin(a) * 4, vy: (hp.y - y) * 2.4, vz: (hp.z - sz) * 2.4 + Math.cos(a) * 4, life: 0.4, r: 1.3, g: 0.55, b: 2.6, size: 0.22, drag: 0.5, sizeEnd: 0.05 });
      }
      if (Math.random() < 0.6) { const a = Math.random() * Math.PI * 2; g.particles.burst(tmp2.set(hp.x + Math.cos(a) * 6, hp.y + (Math.random() - 0.5) * 3, hp.z + Math.sin(a) * 6), { count: 2, color: BLACK, additive: false, speed: 1, dir: tmp.set(-Math.cos(a) * 9, 0, -Math.sin(a) * 9), life: 0.6, size: 0.7, sizeEnd: 0.1 }); }
      ring -= realDt;
      if (ring <= 0) { ring = 0.3; g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0x000000, r0: 7, r1: 0.5, dur: 0.4, thick: 0.3 }); g.shake(0.12); }
      if (t < CH) return true;
      g.scene.remove(orb); g.lights.remove(light); this.uzuOrb = null;
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
    const L = 22 + power, W = 1.8 + power * 0.13;
    const dmg = 80 + power * 18 + rk * 20;
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
        g.particles.glow.spawn({ x, y, z, vx: dir.x * 6 + side.x * Math.cos(a) * 2, vy: Math.sin(a) * 2, vz: dir.z * 6 + side.z * Math.cos(a) * 2, life: 0.6 + Math.random() * 0.3, r: 1.6, g: 0.7, b: 2.8, size: 0.3, drag: 2, sizeEnd: 0.1 });
      }
      if (Math.random() < 0.4) g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: 2, color: BLACK, additive: false, speed: 2, life: 0.7, size: 0.6, sizeEnd: 1.6 });
    }
    g.fx.slashLine(from, dir, L, 0xffffff, W * 0.5, 0.3);
    g.fx.slashLine(from, dir, L, VIOLET, W * 1.6, 0.5);
    for (let s = 2; s < L; s += 3) g.fx.darkRings.spawn(tmp.copy(from).addScaledVector(dir, s).setY(p.pos.y + 0.08), { color: 0x000000, r0: 0.4, r1: W + 1, dur: 0.5, thick: 0.3 });
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(tmp2.copy(from).addScaledVector(dir, s).setY(p.pos.y), dir, W, Math.PI, 80, p);
    g.lights.flash(from.clone().addScaledVector(dir, L * 0.4), VIOLET, 20 + power, 20, 0.6, { priority: 8 });
    g.fx.screenWave(from.clone().addScaledVector(dir, 4), 1.6, 0.7); g.fx.flash(0x6a3aff, 0.55, 0.3); g.fx.chroma(1.5); g.fx.blackFlash(0.15);
    g.shake(0.6 + power * 0.03); g.hitStop(0.12);

    g.audio?.energy('purple');
  }
}
registerKit('geto', GetoKit, GETO_SKILLS);
