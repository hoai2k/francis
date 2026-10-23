// Mahito-style kit — Idle Transfiguration.
// Mahito perceives and reshapes souls by touch. Every touch leaves soul
// distortion (stacking damage over time); a weakened or overloaded non-boss
// curse is transfigured outright, sometimes into a minion that fights for him.
//   LMB  palm combo; each hit distorts the soul.
//   RMB  Idle Transfiguration: a lunging soul-touch (heavy distortion).
//   1    Body Repel: bone spikes erupt from his body in every direction.
//   2    Transfigured Humans: release grotesque reshaped humans that rush curses
//        and burst on death.
//   3    Polymorphic Soul Isomer: hurl a mass of fused souls that detonates.
//   F    Self-Embodiment of Perfection: Mahito's domain — a dark cavern walled
//        with countless reaching hands. Its sure-hit is Idle Transfiguration
//        itself: the instant the domain completes, his touch lands on every
//        soul inside. Ordinary curses are transfigured outright; a boss's soul
//        is mauled (a huge wound plus maximum soul distortion). Anything that
//        wanders in later is touched too.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { moveEntity, groundAhead } from '../physics.js';
import { damp, dampAngle, clamp } from '../util.js';

const SOUL = 0x7ac8f0, FLESH = 0xd8b0a8, BONE = 0xece4d4, STITCH = 0x4a2a2a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('mahito', {
  name: 'Mahito', technique: 'Idle Transfiguration', rarity: 'epic', title: 'Disaster Curse',
  desc: 'Every touch distorts the soul and weakened curses are transfigured outright; spike out with Body Repel, unleash transfigured humans and a Polymorphic Soul Isomer.',
  domain: 'Self-Embodiment of Perfection', color: '#7ac8f0',
});

registerLook('mahito', {
  paint: { skinTone: 0xe2dcd6, hair: 0x8aa0b8, hairVolume: true, top: 0x24242c, collar: 0x30303a, topTrim: 0x3a3a46, buttons: 0x6a6a7a, sleeve: 0x24242c, pants: 0x3a3a46, shoes: 0x22222a, eye: 0x8ab8e0, fringe: 2, hairSide: 6, hairBack: 7, brow: 0x5a6a80 },
  paintExtra(S) {
    // stitched scars across the face and a mismatched skin patch
    S.rect(8, 13, 4, 1, STITCH, 0); S.px(9, 14, STITCH); S.px(11, 14, STITCH);
    S.px(14, 9, STITCH); S.px(14, 10, STITCH); S.px(14, 11, STITCH); S.px(15, 10, STITCH);
    S.rect(13, 13, 3, 2, 0xc4bab2, 0.05);
    // heterochromia
    S.px(10, 12, 0xc8e8ff); S.px(13, 12, 0x3a7ab8);
    // patchwork stitches on the shirt
    S.rect(18, 24, 4, 1, 0x6a6a7a, 0); S.rect(26, 27, 1, 4, 0x6a6a7a, 0);
  },
  hair: (m) => [
    { x: -2, y: 8, z: 0.5, w: 4, h: 2, d: 6, rz: 0.3, material: m },
    { x: 2, y: 8, z: 0.5, w: 4, h: 2, d: 6, rz: -0.3, material: m },
    { x: -3.5, y: 2, z: 0, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 30 },
    { x: 3.5, y: 2, z: 0, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 30 },
    { x: 0, y: 2, z: -3.5, w: 8, h: 3, d: 2, hang: true, material: m, stiff: 30 },
  ],
  hairColor: 0x8aa0b8, accent: SOUL, emit: 0.3, cape: null,
  props(rig, K) {
    // a darker patchwork lock and stitched seams on the forearms
    K.box(rig.head, 1.6, 6, 1.2, K.mat(0x4a5a70, { roughness: 0.7 }), -2.6, 4, 4, 0.1, 0, 0.1);
    const seam = K.mat(STITCH, { roughness: 0.9 });
    K.box(rig.handR, 4.3, 0.4, 4.3, seam, 0, 3, 0); K.box(rig.handL, 4.3, 0.4, 4.3, seam, 0, 4, 0);
  },
});

registerDomainEnv('self_embodiment', {
  skyTop: 0x080a0e, skyHorizon: 0x4a5a6a, fog: 0x14181c, fogDensity: 0.02, hemiSky: 0x9ab0c0, hemiGround: 0x0a0c10, hemiI: 1.0, sun: 0xc8d8e8, sunI: 0.7,
  grade: { tint: [0.94, 1.0, 1.06], lift: [0.0, 0.01, 0.02], sat: 0.6, contrast: 1.22, vignette: 0.6 }, floor: B.bone_block,
});

// ----------------------------------------------------- transfigured humans
const mats = new Map();
const M = (hex, e = 0) => { const k = hex + ':' + e; if (!mats.has(k)) mats.set(k, new THREE.MeshStandardNodeMaterial({ color: hex, roughness: 0.75, emissive: e ? hex : 0, emissiveIntensity: e })); return mats.get(k); };
const FLASH = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });

function buildHuman() {
  const root = new THREE.Group(), meshes = [];
  const box = (parent, w, h, d, x, y, z, mat, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; m.userData.baseMat = mat; parent.add(m); meshes.push(m); return m; };
  const tone = [0xd8b0a8, 0xc8a090, 0xe0c0b8, 0xb89080][Math.floor(Math.random() * 4)];
  const f = M(tone), dark = M(0x2a0a0e), eye = M(SOUL, 2.5);
  const body = new THREE.Group(); body.position.y = 0.75; root.add(body);
  box(body, 0.6, 0.65, 0.45, 0, 0.15, 0, f, 0.3, 0.1);
  box(body, 0.35, 0.3, 0.3, -0.25, 0.45, -0.1, f, 0, 0.5);   // tumour lump
  const head = new THREE.Group(); head.position.set(0.12, 0.6, 0.12); body.add(head);
  box(head, 0.42, 0.38, 0.4, 0, 0, 0, f, 0, -0.25);
  box(head, 0.3, 0.12, 0.05, 0, -0.08, 0.21, dark);           // gaping mouth
  box(head, 0.07, 0.07, 0.03, -0.1, 0.08, 0.21, eye); box(head, 0.1, 0.1, 0.03, 0.12, 0.1, 0.21, eye);
  const arms = [];
  for (const [x, len, w] of [[-0.38, 0.85, 0.12], [0.38, 0.5, 0.22]]) { const g = new THREE.Group(); g.position.set(x, 0.35, 0); body.add(g); box(g, w, len, w, 0, -len / 2, 0, f); arms.push(g); }
  const legs = [];
  for (const x of [-0.15, 0.15]) { const g = new THREE.Group(); g.position.set(x, -0.15, 0); body.add(g); box(g, 0.16, 0.5, 0.16, 0, -0.25, 0, f); legs.push(g); }
  return { root, body, arms, legs, meshes };
}

class TransHuman {
  constructor(game, owner, pos, o = {}) {
    this.game = game; this.owner = owner; this.kind = 'transfigured';
    this.parts = buildHuman(); this.object = this.parts.root; this.meshes = this.parts.meshes;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3(); this.want = new THREE.Vector3();
    this.radius = 0.4; this.height = 1.3; this.speed = 7.5 + Math.random();
    this.maxHp = 45 * (o.hpMult ?? 1); this.hp = this.maxHp; this.dmg = 12 * (o.dmgMult ?? 1);
    this.life = o.life ?? 15; this.cd = 0.3; this.t = Math.random() * 5; this.facing = owner.facing;
    this.dead = false; this.isAlly = true; this.grounded = false; this.coyote = 0; this.flashT = 0; this.visY = pos.y;
    this.object.position.copy(pos);
    game.scene.add(this.object);
    game.particles.burst(pos.clone().setY(pos.y + 0.6), { count: 18, color: FLESH, additive: false, speed: 3, up: 1.5, life: 0.6, size: 0.3, sizeEnd: 0.8 });
    game.fx.rings.spawn(tmp.set(pos.x, pos.y + 0.06, pos.z), { color: SOUL, r0: 1.2, r1: 0.2, dur: 0.35, thick: 0.2 });
  }
  takeDamage(amount, src, o = {}) {
    if (this.dead) return 0;
    this.hp -= amount; this.flashT = 0.08;
    if (o.knock) this.knock.addScaledVector(o.knock, 0.5);
    if (this.hp <= 0) this.despawn();
    return amount;
  }
  // they burst when they die, splashing distorted soul on nearby curses
  despawn(quiet = false) {
    if (this.dead) return;
    this.dead = true;
    const g = this.game, c = this.pos.clone().setY(this.pos.y + 0.7);
    g.scene.remove(this.object);
    if (quiet) return;
    g.fx.splat(c, FLESH); g.fx.splat(c, 0x8a1a1a);
    g.particles.burst(c, { count: 16, color: SOUL, speed: 4, life: 0.4, size: 0.12, shape: 1 });
    g.combat.aoe(c, 2.2, 16 * (1 + (this.owner.kit?.rank?.('collector') ?? 0) * 0.2), this.owner, { knock: 5, stagger: 0.4, ceGain: 0, blocks: false });
    for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(c) < 2.4) this.owner.kit?.soulTouch?.(e, 1);
    g.audio?.energy('spit');
  }
  dispose() { this.despawn(true); }
  target() {
    let best = null, bd = 16;
    for (const e of this.game.enemies) { if (e.dead || e.isDummy || e.untargetable) continue; const d = e.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  update(dt) {
    const g = this.game;
    if (this.dead) return false;
    this.t += dt; this.life -= dt; this.cd -= dt; this.flashT -= dt;
    if (this.life <= 0) { this.despawn(); return false; }
    const e = this.target(), want = this.want.set(0, 0, 0);
    if (e) {
      tmp2.subVectors(e.pos, this.pos).setY(0); const d = tmp2.length();
      this.facing = dampAngle(this.facing, Math.atan2(tmp2.x, tmp2.z), 10, dt);
      if (d > 1.2) want.copy(tmp2.normalize().multiplyScalar(this.speed));
      if (d < 1.5 + e.radius && this.cd <= 0) this.attack(e);
    } else {
      tmp2.subVectors(this.owner.pos, this.pos).setY(0); const d = tmp2.length();
      if (d > 3) { want.copy(tmp2.normalize().multiplyScalar(this.speed * Math.min(1, d / 6))); this.facing = dampAngle(this.facing, Math.atan2(tmp2.x, tmp2.z), 6, dt); }
      if (d > 22) this.pos.copy(this.owner.pos);
    }
    if (want.lengthSq() > 0.01 && !groundAhead(g.world, this.pos.x + want.x * 0.12, this.pos.y, this.pos.z + want.z * 0.12, 2.5)) want.set(0, 0, 0);
    this.vel.x = damp(this.vel.x, want.x + this.knock.x, 10, dt); this.vel.z = damp(this.vel.z, want.z + this.knock.z, 10, dt);
    this.knock.multiplyScalar(Math.exp(-dt * 6));
    moveEntity(this, g.world, dt);
    if (this.pos.y < -8) this.pos.copy(this.owner.pos);
    // shambling, lopsided gait
    const sp = clamp(Math.hypot(this.vel.x, this.vel.z) / this.speed, 0, 1), P = this.parts, cyc = this.t * 13;
    P.legs.forEach((l, i) => { l.rotation.x = Math.sin(cyc + i * Math.PI) * 0.8 * sp; });
    P.arms.forEach((a, i) => { a.rotation.x = Math.sin(cyc * 0.7 + i * 2) * 0.9 * sp - (this.cd > 0.5 ? 1.4 : 0); a.rotation.z = (i ? -0.3 : 0.4) + Math.sin(this.t * 3 + i) * 0.1; });
    P.body.rotation.z = Math.sin(cyc * 0.5) * 0.18 * sp; P.body.position.y = 0.75 + Math.abs(Math.sin(cyc)) * 0.08 * sp;
    this.object.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.object.rotation.y = this.facing;
    for (const m of this.meshes) m.material = this.flashT > 0 ? FLASH : m.userData.baseMat;
    if (Math.random() < 0.15) g.particles.glow.spawn({ x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z, vy: 0.5, life: 0.5, r: 0.6, g: 1.2, b: 1.8, size: 0.1, drag: 1, sizeEnd: 0.3 });
    return true;
  }
  attack(e) {
    const g = this.game, own = this.owner;
    this.cd = 0.8;
    const dir = tmp.subVectors(e.pos, this.pos).setY(0).normalize();
    this.knock.copy(dir).multiplyScalar(4);
    g.combat.damageEnemy(e, this.dmg, own, { knock: dir.clone().multiplyScalar(3), stagger: 0.35, ceGain: 1 });
    g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.5), dir, { color: FLESH });
    g.audio?.impact(0.7);
  }
}

export const MAHITO_SKILLS = [
  { id: 'distort', name: 'Soul Distortion', icon: '🌫️', desc: 'Distorted souls take more damage over time.', max: 3, branch: 'Touch', tier: 1, req: 'ab:touch' },
  { id: 'idle', name: 'Idle Transfiguration', icon: '✋', desc: 'Transfigure curses at higher health.', max: 3, branch: 'Touch', tier: 3, req: 'ab:touch' },
  { id: 'repel', name: 'Body Repel', icon: '🦔', desc: 'More spikes, harder hits.', max: 2, branch: 'Body', tier: 2, req: 'ab:repel' },
  { id: 'collector', name: 'Soul Collector', icon: '🧟', desc: 'Transfigured curses become minions more often; minions burst harder.', max: 3, branch: 'Humans', tier: 2, req: 'ab:humans' },
  { id: 'isomer', name: 'Polymorphic Soul Isomer', icon: '💣', desc: 'Bigger, deadlier isomer.', max: 3, branch: 'Humans', tier: 5, req: 'ab:isomer' },
  { id: 'perfection', name: 'Perfection', icon: '🕳️', desc: 'The domain lasts longer and its sure-hit touch mauls bosses harder.', max: 2, branch: 'Soul', tier: 0 },
];

class MahitoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 11, range: 2.6, arc: 1.1, lunge: 7, knock: 2.5, stop: 0.045, shake: 0.12, trail: SOUL, sparkColor: 0xb0e0ff, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 12, range: 2.7, arc: 1.2, lunge: 6, knock: 3, stop: 0.05, shake: 0.14, trail: SOUL, chainAt: 0.55 },
      { style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 13, range: 2.7, arc: 1.2, lunge: 6, knock: 3, stop: 0.05, shake: 0.14, trail: FLESH, chainAt: 0.55 },
      { style: 'slam', dur: 0.56, windup: 0.42, strike: 0.6, dmg: 24, range: 3.2, arc: Math.PI, lunge: 4, knock: 9, stop: 0.09, shake: 0.4, ring: true, ringColor: SOUL, stagger: 0.6, trail: SOUL },
    ];
    this.branches = ['Touch', 'Body', 'Humans', 'Soul'];
    this.library = {
      // ---- the touch
      touch: ability({ name: 'Idle Transfiguration', icon: '✋', kind: 'basic', desc: 'A lunging soul-touch: heavy soul distortion. A weakened or overloaded curse is transfigured outright.', cd: 1.3, ce: 0, branch: 'Touch', tier: 0, start: true, legacy: 'ranged', use: () => this.touch() }),
      stretch: ability({ name: 'Stretching Arm', icon: '🦾', kind: 'technique', desc: 'Your arm stretches far along your aim, grabs the first soul it touches and drags the curse back to you.', cd: 4, ce: 6, branch: 'Touch', tier: 1, req: 'touch', use: () => this.stretchArm() }),
      palm_barrage: ability({ name: 'Palm Barrage', icon: '🖐️', kind: 'technique', desc: 'Six rapid palm strikes in front of you; every one of them distorts the soul.', cd: 7, ce: 12, branch: 'Touch', tier: 2, req: 'touch', use: () => this.palmBarrage() }),
      soul_rupture: ability({ name: 'Soul Rupture', icon: '💥', kind: 'technique', desc: 'Twist every distorted soul nearby at once: each bursts for damage per distortion stack.', cd: 12, ce: 18, branch: 'Touch', tier: 3, req: 'palm_barrage', use: () => this.soulRupture() }),
      black_flash: ability({ name: 'Black Flash', icon: '⚡', kind: 'technique', desc: 'Shibuya\'s evolution: close in and land a guaranteed Black Flash that tears at the soul.', cd: 14, ce: 20, branch: 'Touch', tier: 4, req: 'soul_rupture', use: () => this.blackFlashStrike(46) }),
      // ---- reshaping his own body
      blade_arm: ability({ name: 'Blade Arm', icon: '🔪', kind: 'basic', desc: 'Reshape an arm into a blade: two quick cuts that distort the soul.', cd: 0.9, ce: 0, branch: 'Body', tier: 1, use: () => this.bladeArm() }),
      repel: ability({ name: 'Body Repel', icon: '🦔', kind: 'technique', desc: 'Bone spikes erupt from your body in every direction.', cd: 6, ce: 12, branch: 'Body', tier: 1, legacy: 't1', use: () => this.repel() }),
      hammer_fist: ability({ name: 'Hammer Fist', icon: '🔨', kind: 'technique', desc: 'Swell an arm into a giant mallet and bring it down on the marked spot, stunning everything under it.', cd: 7, ce: 10, branch: 'Body', tier: 2, req: 'blade_arm', use: () => this.hammerFist() }),
      bone_lance: ability({ name: 'Bone Lance', icon: '🦴', kind: 'basic', desc: 'Grow a bone spike and fire it: it pierces a line of curses.', cd: 1.4, ce: 3, branch: 'Body', tier: 2, req: 'repel', use: () => this.boneLance() }),
      wings: ability({ name: 'Transfigured Wings', icon: '🪽', kind: 'movement', desc: 'Sprout wings and glide forward; landing touches every soul around you.', cd: 6, ce: 6, branch: 'Body', tier: 3, req: 'hammer_fist', use: () => this.wings() }),
      hardened: ability({ name: 'Hardened Body', icon: '🐢', kind: 'defence', desc: 'Harden your skin into a shell for 4s: 60% less damage, and whatever strikes you has its soul distorted.', cd: 14, ce: 10, branch: 'Body', tier: 3, req: 'repel', use: () => this.hardened() }),
      drill: ability({ name: 'Drill Arm', icon: '🌀', kind: 'technique', desc: 'Twist an arm into a drill and charge, grinding through everything in your path (ignores guards).', cd: 9, ce: 14, branch: 'Body', tier: 4, req: 'wings', use: () => this.drillArm() }),
      // ---- transfigured humans
      humans: ability({ name: 'Transfigured Humans', icon: '🧟', kind: 'summon', desc: 'Release grotesque reshaped humans that rush curses and burst on death.', cd: 14, ce: 18, branch: 'Humans', tier: 1, legacy: 't2', use: () => this.humans() }),
      pocket_humans: ability({ name: 'Shrunken Humans', icon: '🫘', kind: 'basic', desc: 'Toss three shrunken humans from your pocket; they swell back to size on impact and burst.', cd: 1.5, ce: 4, branch: 'Humans', tier: 2, req: 'humans', use: () => this.pocketHumans() }),
      multiplicity: ability({ name: 'Soul Multiplicity', icon: '🧌', kind: 'summon', desc: 'Fuse several souls into one hulking transfigured giant that fights for you for 16s.', cd: 22, ce: 28, branch: 'Humans', tier: 3, req: 'humans', use: () => this.multiplicity() }),
      isomer: ability({ name: 'Polymorphic Soul Isomer', icon: '💣', kind: 'technique', desc: 'Hurl a mass of fused souls that detonates and spills out transfigured humans.', cd: 18, ce: 35, branch: 'Humans', tier: 4, legacy: 't3', req: 'multiplicity', use: () => this.isomer() }),
      // ---- the soul itself
      reshape: ability({ name: 'Reshape Body', icon: '💗', kind: 'heal', desc: 'As long as your soul is intact your body is just a shape: restore 30% health over 1.5s and shake off slows.', cd: 24, ce: 22, branch: 'Soul', tier: 1, use: () => this.reshapeBody() }),
      shrink: ability({ name: 'Shrink', icon: '🐭', kind: 'movement', desc: 'Shrink to a tiny shape: for 1.5s curses lose track of you and you move much faster, then you swell back with a burst of spikes.', cd: 8, ce: 6, branch: 'Soul', tier: 2, req: 'reshape', use: () => this.shrink() }),
      perception: ability({ name: 'Soul Perception', icon: '👁️', kind: 'buff', desc: 'See the shape of every soul: for 8s every hit distorts twice and you transfigure curses at higher health.', cd: 16, ce: 10, branch: 'Soul', tier: 2, req: 'reshape', use: () => this.perception() }),
      distorted_killing: ability({ name: 'Instant Spirit Body of Distorted Killing', icon: '👹', kind: 'buff', desc: 'Mahito\'s final form: for 10s you are larger, armoured and far stronger, and every hit tears at the soul.', cd: 40, ce: 45, branch: 'Soul', tier: 5, req: 'perception', use: () => this.distortedKilling() }),
    };
    this.passives = {
      soul_reader: passive({ name: 'Soul Reader', icon: '🔮', desc: 'Soul distortion lasts 2s longer and techniques deal 10% more damage.', branch: 'Touch', tier: 2, req: 'touch', apply: (pl, k) => { k.soulDur = 6; pl.stats.techMult += 0.1; } }),
      disaster: passive({ name: 'Disaster Curse', icon: '☠️', desc: '+40 max health and 8% damage reduction.', branch: 'Body', tier: 3, req: 'hardened', apply: (pl) => { pl.maxHp += 40; pl.hp += 40; pl.stats.armor += 0.08; } }),
      human_collection: passive({ name: 'Human Collection', icon: '🫙', desc: 'Transfigured humans last 5s longer and one more is released each time.', branch: 'Humans', tier: 2, req: 'humans', apply: (pl, k) => { k.humanBonus = true; } }),
      evolving: passive({ name: 'Evolving Soul', icon: '🧬', desc: 'Every transfiguration restores 5 Cursed Energy and 2% health.', branch: 'Soul', tier: 3, req: 'perception', apply: (pl, k) => { k.evolving = true; } }),
    };
    this.domain = {
      name: 'Self-Embodiment of Perfection', icon: '✋', key: 'self_embodiment', type: 6, color: SOUL, sound: 'perfection', flash: 0x9ad8ff,
      // a dim, slate cavern: pale stitched floor seams, a teal soul-glow horizon
      look: { floor: 0x1a1e26, seam: 0x8a96a4, sparkle: 0x7ac8f0, skyTop: 0x030406, skyHorizon: 0x262e3a, stars: 0, band: 0x3a6a84 },
      duration: 8 + r('perfection') * 1.5, radius: 22,
      onStart: (g, d) => { d.touched = new Set(); d.touchT = 0.7; d.tick = 0; this.raiseHands(g, d); },
      onTick: (g, d, dt) => {
        // the sure-hit: once the domain completes, the touch reaches every soul
        if (d.touchT > 0) {
          d.touchT -= dt;
          if (d.touchT <= 0) this.perfectionTouch(g, d, true);
          return;
        }
        d.tick -= dt;
        if (d.tick > 0) return;
        d.tick = 0.4;
        this.perfectionTouch(g, d, false);
      },
      onEnd: (g, d) => { d.touched?.clear(); this.lowerHands(); },
    };
  }
  dispose() { super.dispose(); this.disposed = true; this.lowerHands(); this.p.object?.scale.setScalar(1); }
  // ------------------------------------------------------------ soul
  soulTouch(e, n = 1) {
    if (!e || e.dead) return;
    e.soul = Math.min(6, (e.soul ?? 0) + n * (this.buffs.has('perception') || this.buffs.has('distorted') ? 2 : 1)); e.soulT = this.soulDur ?? 4;
    e.soulTick = e.soulTick ?? 0.5;
    this.checkTransfig(e);
  }
  checkTransfig(e) {
    if (e.dead || e.isDummy) return;
    const thresh = 0.22 + this.rank('idle') * 0.05 + (this.buffs.has('perception') ? 0.1 : 0);
    if (!e.isBoss && (e.hp / e.maxHp <= thresh || e.soul >= 6)) this.transfigure(e);
    else if (e.isBoss && e.soul >= 6) {
      // a soul too big to reshape — it ruptures instead
      e.soul = 0;
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
      this.game.combat.damageEnemy(e, 30 + Math.min(e.maxHp * 0.05, 150), this.p, { unblockable: true, stagger: 0.6, color: '#7ac8f0' });
      this.game.fx.explosion(at, SOUL, 2.5); this.game.audio?.energy('explode');
    }
  }
  transfigure(e) {
    const g = this.game, p = this.p;
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.5), base = e.pos.clone();
    g.combat.damageEnemy(e, (e.hp + 1) / Math.max(0.2, 1 - (e.armor ?? 0)), p, { unblockable: true, stagger: 0, color: '#7ac8f0' });
    if (!e.dead) return;
    if (this.evolving) { p.gainCE(5); p.heal?.(p.maxHp * 0.02, true); }
    // reshape it: the body twists as it collapses
    e.object?.scale.set(1.5, 0.5, 1.2);
    g.fx.splat(at, FLESH); g.fx.splat(at, 0x8a1a1a);
    g.particles.burst(at, { count: 30, color: FLESH, additive: false, speed: 4, up: 1, life: 0.8, size: 0.35, sizeEnd: 0.9 });
    g.particles.burst(at, { count: 20, color: SOUL, speed: 6, life: 0.5, size: 0.14, shape: 1, intensity: 3 });
    g.fx.rings.spawn(tmp.set(base.x, base.y + 0.06, base.z), { color: SOUL, r0: 0.3, r1: 2.4, dur: 0.4, thick: 0.15 });
    g.lights.flash(at, SOUL, 6, 6, 0.25);
    g.audio?.tone({ freq: 500, to: 120, dur: 0.25, gain: 0.1, type: 'sawtooth', filter: 1600 });
    const humans = g.allies.filter((a) => a.owner === p && a.kind === 'transfigured' && !a.dead);
    if (humans.length < 6 && Math.random() < 0.3 + this.rank('collector') * 0.15) {
      const gy = g.world.groundBelow(base.x, base.z, base.y + 1.5);
      if (isFinite(gy)) { base.y = gy; g.allies.push(new TransHuman(g, p, base, { life: 12 })); }
    }
  }
  handprint(e) {
    const g = this.game;
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
    g.fx.arcs.spawn(at, { color: SOUL, r0: 0.5, r1: 0.9, dur: 0.25, thick: 0.4, arc: 0.5, rotY: Math.random() * Math.PI * 2 });
    g.particles.burst(at, { count: 8, color: SOUL, speed: 3, life: 0.3, size: 0.1, shape: 1 });
  }
  onMeleeHit(e) { this.soulTouch(e, 1); }
  tick(dt) {
    const g = this.game, dmgMul = 1 + this.rank('distort') * 0.25;
    for (const e of this.living((e) => e.soul)) {
      e.soulT -= dt; e.soulTick -= dt;
      if (e.soulT <= 0) { e.soul = 0; continue; }
      if (e.soulTick <= 0) {
        e.soulTick = 0.5;
        g.combat.damageEnemy(e, 2.5 * e.soul * dmgMul, this.p, { stagger: 0, ceGain: 0.5, color: '#7ac8f0' });
        if (!e.dead) this.checkTransfig(e);
      }
      if (Math.random() < 0.15 * e.soul) g.particles.glow.spawn({ x: e.pos.x + (Math.random() - 0.5) * e.radius * 2, y: e.pos.y + Math.random() * e.height, z: e.pos.z + (Math.random() - 0.5) * e.radius * 2, vy: 0.6, life: 0.5, r: 0.8, g: 1.6, b: 2.4, size: 0.1, drag: 1, sizeEnd: 0.3 });
    }
  }
  // ---------------------------------------------------------- techniques
  touch() {
    const g = this.game, p = this.p;
    const step = { style: 'punch', dur: 0.34, windup: 0.22, strike: 0.45, dmg: 0, range: 2.8, arc: 0.9, lunge: 14, knock: 0, stop: 0, shake: 0, trail: SOUL, custom: true };
    p.startAttack(step, 0);
    this.pending = p.action.step;
    g.audio?.whoosh(0.8);
  }
  onStrike(step) {
    if (step !== this.pending) return;
    this.pending = null;
    const g = this.game, p = this.p;
    const sure = g.domainSys?.sureHit(p);
    const hits = sure ? [...this.inDomain()] : g.combat.query(p.pos, tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing)), 3, 0.9);
    for (const e of hits) {
      g.combat.damageEnemy(e, 16 + this.rank('idle') * 5, p, { melee: true, stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(2), color: '#7ac8f0' });
      this.handprint(e);
      this.soulTouch(e, 2);
    }
    const hand = this.handPos();
    g.particles.burst(hand, { count: 16, color: SOUL, speed: 3, life: 0.35, size: 0.15, shape: 1, intensity: 3 });
    if (hits.length) { g.hitStop(0.06); g.shake(0.2); g.fx.chroma(0.4); g.audio?.impact(1.2); g.lights.flash(hand, SOUL, 6, 6, 0.2); }
  }
  repel() {
    const g = this.game, p = this.p, rk = this.rank('repel');
    this.cast(0.4, true);
    p.iframes = Math.max(p.iframes, 0.4);
    const n = 16 + rk * 6;
    const c = p.pos.clone().setY(p.pos.y + 1);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.random() * 0.1;
      const dir = new THREE.Vector3(Math.sin(a), (Math.random() - 0.3) * 0.5, Math.cos(a)).normalize();
      g.projectiles.fire({ pos: c.clone().addScaledVector(dir, 0.5), vel: dir.clone().multiplyScalar(24), team: 'player', shape: 'nail', color: BONE, emissive: 0.4, life: 0.32, scale: 3, radius: 0.4, pierce: true,
        onHit: (e, q) => { g.combat.damageEnemy(e, 10 + rk * 4, p, { knock: q.vel.clone().setLength(3), stagger: 0.3 }); g.fx.hitSpark(q.pos, null, { color: BONE }); } });
      if (i % 2 === 0) g.fx.slashLine(c, dir, 2.6 + Math.random(), BONE, 0.15, 0.25);
    }
    g.combat.aoe(p.pos, 3, 22 + rk * 8, p, { knock: 11, stagger: 0.8 });
    g.particles.burst(c, { count: 30, color: BONE, additive: false, speed: 9, life: 0.4, size: 0.18, shape: 1 });
    g.fx.shockwave(p.pos, SOUL, 4);
    g.shake(0.35); g.hitStop(0.05);
    g.audio?.energy('slash'); g.audio?.impact(1.4);
  }
  humans() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const n = 3 + (this.rank('collector') >= 2 ? 1 : 0) + (this.humanBonus ? 1 : 0);
    const old = g.allies.filter((a) => a.owner === p && a.kind === 'transfigured' && !a.dead);
    while (old.length + n > 7) old.shift().despawn(true);
    for (let i = 0; i < n; i++) {
      const a = p.facing + (i - (n - 1) / 2) * 0.8;
      const pos = p.pos.clone().add(tmp.set(Math.sin(a) * 1.5, 0, Math.cos(a) * 1.5));
      const gy = g.world.groundBelow(pos.x, pos.z, p.pos.y + 2);
      if (isFinite(gy) && Math.abs(gy - p.pos.y) < 3) pos.y = gy; else pos.copy(p.pos);
      g.allies.push(new TransHuman(g, p, pos, { life: 15 + (this.humanBonus ? 5 : 0), dmgMult: 1 + this.rank('collector') * 0.15 }));
    }
    // they are spat out of his own body
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 30, color: FLESH, additive: false, speed: 4, life: 0.7, size: 0.35, sizeEnd: 1 });
    g.audio?.energy('summon');
  }
  isomer() {
    const g = this.game, p = this.p, rk = this.rank('isomer');
    p.action = { type: 'attack', step: { style: 'throw', strike: 0.5, windup: 0.3 }, style: 'throw', dur: 0.45, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0.3 };
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const from = p.pos.clone().setY(p.pos.y + 2.2);
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const goal = sure ? sure.pos : p.aimPoint;
    const flat = tmp.subVectors(goal, p.pos).setY(0);
    const dist = Math.min(14, flat.length()) || 9;
    const flight = 0.75, grav = 18;
    const vel = flat.normalize().multiplyScalar(dist / flight); vel.y = 0.5 * grav * flight;
    g.audio?.whoosh(1.2);
    g.projectiles.fire({ pos: from, vel, team: 'player', shape: 'cube', color: FLESH, emissive: 0.15, gravity: grav, life: 2.5, scale: 2.4 + rk * 0.3, radius: 0.8, light: 4,
      trail: (q) => { g.particles.burst(q.pos, { count: 2, color: Math.random() < 0.5 ? FLESH : SOUL, additive: false, speed: 1, life: 0.5, size: 0.3, sizeEnd: 0.1 }); },
      onExpire: (q) => this.detonate(q.pos.clone()) });
  }
  detonate(at) {
    const g = this.game, p = this.p, rk = this.rank('isomer');
    const gy = g.world.groundBelow(at.x, at.z, at.y + 1); if (isFinite(gy)) at.y = gy;
    const R = 5 + rk * 0.8;
    g.fx.explosion(at, SOUL, R);
    g.particles.burst(at.clone().setY(at.y + 1), { count: 50, color: FLESH, additive: false, speed: R * 2, up: 1, life: 1, size: 0.4, sizeEnd: 1.2 });
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.fx.slashLine(at.clone().setY(at.y + 0.5), tmp.set(Math.sin(a), 0.5, Math.cos(a)), R * 0.8, BONE, 0.2, 0.35); }
    g.combat.aoe(at, R, 70 + rk * 25, p, { knock: 13, stagger: 1, falloff: true });
    for (const e of this.near(at, R + 1)) this.soulTouch(e, 2);
    // the fused souls spill out as transfigured humans
    const n = 1 + (rk >= 2 ? 1 : 0);
    for (let i = 0; i < n; i++) g.allies.push(new TransHuman(g, p, at.clone().add(tmp2.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)).setY(at.y), { life: 12 }));
    g.fx.screenWave(at, 1.1, 0.5); g.fx.flash(0x6aa8d0, 0.35, 0.2); g.fx.chroma(1);
    g.shake(0.7); g.hitStop(0.08);
    g.audio?.energy('explode');
  }
  // ============================================================== tree abilities
  onBlackFlash(t) { this.soulTouch(t, 3); this.handprint(t); }
  // a stitched arm stretched from Mahito's shoulder to `to`
  armFx(to, color = FLESH) {
    const g = this.game, from = this.handPos(), n = Math.max(4, Math.round(from.distanceTo(to) * 3));
    for (let i = 0; i <= n; i++) { const k = i / n; g.particles.burst(tmp.lerpVectors(from, to, k), { count: 1, color: i % 5 === 0 ? STITCH : color, additive: false, speed: 0.1, life: 0.18, size: 0.32, sizeEnd: 0.25 }); }
  }
  stretchArm() {
    const g = this.game, p = this.p, f = this.fwd(), L = 11;
    p.facing = this.aimAngle();
    this.pose('punch', 0.35);
    let first = null, fd = L;
    this.line(p.pos, f, L, 0.8, (e, along) => { if (along < fd) { fd = along; first = e; } });
    const tip = first ? first.pos.clone().setY(first.pos.y + first.height * 0.6) : this.handPos().addScaledVector(f, L);
    this.armFx(tip);
    g.audio?.whoosh(1.1);
    if (!first) return;
    this.hit(first, 14 + this.rank('idle') * 4, { stagger: 0.7, knock: new THREE.Vector3(), color: '#7ac8f0' });
    this.handprint(first); this.soulTouch(first, 2);
    if (!first.dead && !first.isBoss) {
      const to = p.pos.clone().addScaledVector(f, 1.4 + first.radius);
      const gy = g.world.groundBelow(to.x, to.z, p.pos.y + 2);
      if (isFinite(gy) && Math.abs(gy - p.pos.y) < 3 && !g.world.solidAt(to.x, gy + 0.5, to.z)) { to.y = gy; g.fx.blinkPuff(first.pos, SOUL); first.pos.copy(to); first.vel?.set(0, 0, 0); }
      this.stun(first, 0.8);
    }
    g.audio?.impact(1.1);
  }
  palmBarrage() {
    const g = this.game, p = this.p;
    const styles = ['punch', 'swingL', 'swingR'];
    for (let i = 0; i < 6; i++) this.after(i * 0.1, () => {
      p.facing = this.aimAngle();
      this.pose(styles[i % 3], 0.11);
      const f = this.fwd();
      for (const e of this.foes(p.pos, 3, f, 0.8)) { this.hit(e, 8 + this.rank('idle') * 2, { melee: true, stagger: 0.25, knock: f.clone().multiplyScalar(0.6), color: '#7ac8f0' }); this.soulTouch(e, 1); this.handprint(e); }
      g.particles.burst(this.handPos(), { count: 6, color: SOUL, speed: 3, life: 0.2, size: 0.1, shape: 1 });
      g.audio?.impact(0.7);
    });
  }
  soulRupture() {
    const g = this.game, p = this.p, R = 14;
    const souls = [...this.near(p.pos, R, (e) => (e.soul ?? 0) > 0)];
    if (!souls.length) { g.toast?.('No distorted souls nearby — touch some first'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: SOUL, r0: 0.4, r1: R, dur: 0.4, thick: 0.1 });
    g.audio?.tone?.({ freq: 160, to: 60, dur: 0.5, gain: 0.18, type: 'sawtooth', filter: 900 });
    this.after(0.25, () => {
      for (const e of souls) {
        if (e.dead) continue;
        const st = e.soul ?? 0, at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
        e.soul = 0;
        this.hit(e, 10 + st * (12 + this.rank('distort') * 3), { unblockable: true, stagger: 0.4 + st * 0.1, color: '#7ac8f0' });
        g.fx.explosion(at, SOUL, 0.8 + st * 0.25);
        g.particles.burst(at, { count: 8 + st * 3, color: FLESH, additive: false, speed: 4, life: 0.6, size: 0.25, sizeEnd: 0.6 });
        if (!e.dead) this.checkTransfig(e);
      }
      g.fx.chroma(0.8); g.shake(0.4); g.hitStop(0.05); g.audio?.energy('explode');
    });
  }
  bladeArm() {
    const g = this.game, p = this.p;
    for (let i = 0; i < 2; i++) this.after(i * 0.13, () => {
      p.facing = this.aimAngle();
      this.pose(i ? 'swingL' : 'swingR', 0.14);
      const f = this.fwd();
      for (const e of this.foes(p.pos, 3.1, f, 1)) { this.hit(e, 11, { melee: true, stagger: 0.3, knock: f.clone().multiplyScalar(1.5) }); this.soulTouch(e, 1); }
      g.fx.slashArc(p.pos, p.facing, i ? BONE : SOUL, 3, 0.45, 0.14, i === 1);
      g.audio?.swing(i);
    });
  }
  hammerFist() {
    const g = this.game, p = this.p, R = 3;
    const c = p.pos.clone().addScaledVector(this.fwd(), 2.6); c.y = this.groundAt(c.x, c.z, p.pos.y);
    p.facing = this.aimAngle();
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: SOUL, r0: R, r1: R * 0.95, dur: 0.35, thick: 0.1 });
    // the arm swells into a huge fleshy mallet
    const mallet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 2.2), new THREE.MeshStandardNodeMaterial({ color: FLESH, roughness: 0.8 }));
    g.scene.add(mallet);
    this.cast(0.5, true, { lock: true, hold: true, cancelable: false, moveScale: 0 });
    this.during(0.32, (t, dt, k) => {
      const a = -1.2 + k * 2.4, h = this.handPos();
      mallet.position.set(h.x + Math.sin(p.facing) * (1 + Math.sin(a + 1.2) * 1.2), p.pos.y + 1.5 + Math.cos(a + 1.2) * 1.6, h.z + Math.cos(p.facing) * (1 + Math.sin(a + 1.2) * 1.2));
      mallet.rotation.set(a, p.facing, 0); mallet.scale.setScalar(0.5 + k * 0.6);
    }, () => {
      g.scene.remove(mallet); mallet.geometry.dispose(); mallet.material.dispose();
      if (p.action?.lock) p.action = null;
      const n = g.combat.aoe(c, R, 38, p, { melee: true, knock: 5, stagger: 1, falloff: true });
      for (const e of this.foes(c, R)) { this.stun(e, 1.3); this.soulTouch(e, 1); }
      g.fx.shockwave(c, SOUL, R + 1); g.fx.landDust(c, 26); g.debris.burst(c.clone().setY(c.y + 0.3), B.stone, 6, 0.8);
      g.shake(0.5); g.hitStop(n ? 0.08 : 0.03); g.audio?.impact(1.8);
    });
  }
  boneLance() {
    const g = this.game, p = this.p;
    this.cast(0.25);
    const pr = this.shoot({ speed: 30, shape: 'arrow', color: BONE, emissive: 0.5, scale: 1.4, life: 0.6, radius: 0.45, pierce: true,
      trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: BONE, additive: false, speed: 0.3, life: 0.2, size: 0.12, sizeEnd: 0.05 }); },
      onHit: (e, q) => { this.hit(e, 18 + this.rank('repel') * 4, { stagger: 0.4, knock: q.vel.clone().setLength(3) }); this.soulTouch(e, 1); g.fx.hitSpark(q.pos, null, { color: BONE }); } });
    if (!pr) return false;
    g.audio?.energy('slash');
  }
  wings() {
    const g = this.game, p = this.p, f = this.fwd();
    // two broad, fleshy wings sprout for the glide
    const mat = new THREE.MeshStandardNodeMaterial({ color: 0xb8a098, roughness: 0.8 });
    const wings = [-1, 1].map((sx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1), mat); g.scene.add(m); return { m, sx }; });
    p.vel.y = 8; p.grounded = false;
    g.audio?.whoosh(1.4);
    this.dash(f, 10, 0.5, { color: SOUL, iframes: 0.6, onEnd: () => {
      for (const w of wings) { g.scene.remove(w.m); w.m.geometry.dispose(); } mat.dispose();
      for (const e of this.foes(p.pos, 3)) { this.hit(e, 16, { stagger: 0.5, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(4) }); this.soulTouch(e, 1); this.handprint(e); }
      g.fx.shockwave(p.pos, SOUL, 3.5); g.fx.landDust(p.pos, 18);
    } });
    this.during(0.5, (t) => {
      for (const w of wings) {
        const a = p.facing + w.sx * Math.PI / 2;
        w.m.position.set(p.pos.x + Math.sin(a) * 1.1 - Math.sin(p.facing) * 0.3, p.pos.y + 1.5, p.pos.z + Math.cos(a) * 1.1 - Math.cos(p.facing) * 0.3);
        w.m.rotation.set(0, p.facing, w.sx * (0.3 + Math.sin(t * 20) * 0.4));
      }
    });
  }
  hardened() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.toast?.('🐢 Hardened Body'); g.audio?.charge?.(0.3, 0.4);
    this.buff('hardened', 4, {
      incoming: (a, src) => { if (src && !src.dead && !src.isPlayer && src.takeDamage && src.pos?.distanceTo(p.pos) < 5) this.soulTouch(src, 1); return a * 0.4; },
      onTick: () => { if (Math.random() < 0.5) g.particles.burst(tmp.set(p.pos.x + (Math.random() - 0.5), p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5)), { count: 1, color: BONE, additive: false, speed: 0.4, life: 0.4, size: 0.2, sizeEnd: 0.05 }); },
    });
  }
  drillArm() {
    const g = this.game, p = this.p, f = this.fwd();
    this.pose('punch', 0.5);
    g.audio?.whoosh(1.6);
    const last = new Map();
    let t0 = 0;
    this.dash(f, 8, 0.5, { color: SOUL, iframes: 0.6 });
    this.during(0.5, (t, dt) => {
      t0 -= dt;
      const h = this.handPos();
      for (let i = 0; i < 3; i++) { const a = t * 40 + i * 2.1; g.particles.burst(tmp.set(h.x + Math.cos(a) * 0.3, h.y + Math.sin(a) * 0.3, h.z), { count: 1, color: i ? BONE : SOUL, additive: !i, speed: 2, life: 0.15, size: 0.12, shape: 1 }); }
      if (t0 > 0) return;
      t0 = 0.08;
      for (const e of this.foes(p.pos, 2, f, 1)) {
        this.hit(e, 9, { melee: true, unblockable: true, stagger: 0.3, knock: f.clone().multiplyScalar(2) });
        if (!last.has(e)) { last.set(e, 1); this.soulTouch(e, 2); }
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: BONE });
      }
      g.combat.hitBlocks(p.pos.clone().addScaledVector(f, 1), f, 1.2, Math.PI, 30, p);
    });
  }
  pocketHumans() {
    const g = this.game, p = this.p;
    this.pose('throw', 0.35);
    const base = this.aimAngle();
    for (let i = 0; i < 3; i++) {
      const a = base + (i - 1) * 0.2, dist = 7 + i, flight = 0.5, grav = 20;
      const vel = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(dist / flight); vel.y = 0.5 * grav * flight;
      g.projectiles.fire({ pos: this.handPos(), vel, team: 'player', shape: 'cube', color: FLESH, emissive: 0.1, gravity: grav, life: 1.5, scale: 0.7, radius: 0.35,
        onHit: (e) => { this.hit(e, 8, { stagger: 0.3 }); this.soulTouch(e, 1); },
        onExpire: (q) => {
          // it swells back to a human's size — and bursts
          g.fx.splat(q.pos, FLESH); g.fx.splat(q.pos, 0x8a1a1a);
          g.particles.burst(q.pos, { count: 12, color: FLESH, additive: false, speed: 3, up: 1, life: 0.5, size: 0.3, sizeEnd: 0.7 });
          g.combat.aoe(q.pos, 2, 12 * (1 + this.rank('collector') * 0.15), p, { knock: 4, stagger: 0.4, blocks: false });
          for (const e of this.foes(q.pos, 2.2)) this.soulTouch(e, 1);
          g.audio?.energy('spit');
        } });
    }
    g.audio?.whoosh(0.8);
  }
  multiplicity() {
    const g = this.game, p = this.p;
    this.cast(0.6, true);
    const pos = p.pos.clone().addScaledVector(this.fwd(), 2);
    const gy = g.world.groundBelow(pos.x, pos.z, p.pos.y + 2);
    if (isFinite(gy) && Math.abs(gy - p.pos.y) < 3) pos.y = gy; else pos.copy(p.pos);
    // several souls are kneaded into one body
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; for (let k = 0; k < 6; k++) g.particles.glow.spawn({ x: pos.x + Math.cos(a) * 3, y: pos.y + 1, z: pos.z + Math.sin(a) * 3, vx: -Math.cos(a) * 6, vy: 0.5, vz: -Math.sin(a) * 6, life: 0.5, r: 0.9, g: 1.4, b: 1.8, size: 0.2, drag: 1, sizeEnd: 0.3 }); }
    const giant = new TransHuman(g, p, pos, { life: 16 + (this.humanBonus ? 5 : 0), hpMult: 5, dmgMult: 3 * (1 + this.rank('collector') * 0.15) });
    giant.object.scale.setScalar(2.2); giant.radius = 0.9; giant.height = 2.8; giant.speed = 5.5;
    g.allies.push(giant);
    g.fx.shockwave(pos, SOUL, 4); g.shake(0.35);
    g.audio?.energy('summon'); g.audio?.tone?.({ freq: 120, to: 60, dur: 0.5, gain: 0.15, type: 'sawtooth', filter: 700 });
  }
  reshapeBody() {
    const g = this.game, p = this.p;
    if (this.rctHeal(0.3, 1.5, SOUL) === false) return false;
    p.slowT = 0;
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 20, color: FLESH, additive: false, speed: 2, life: 0.5, size: 0.3, sizeEnd: 0.05 });
  }
  shrink() {
    const g = this.game, p = this.p;
    const s0 = p.object.scale.x;
    p.untargetable = true;
    for (const e of g.enemies) if (e.target === p) e.target = null;
    g.fx.blinkPuff(p.pos, SOUL);
    g.audio?.tone?.({ freq: 700, to: 1400, dur: 0.15, gain: 0.08, type: 'triangle' });
    this.statBuff('shrink', 1.5, { speed: 0.6 }, {
      onStart: () => p.object.scale.setScalar(s0 * 0.4),
      onTick: () => { for (const e of g.enemies) if (e.target === p) e.target = null; },
      onEnd: (disposing) => {
        p.untargetable = false;
        p.object.scale.setScalar(s0);
        if (disposing) return;
        // swelling back to size: a burst of bone spikes
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.fx.slashLine(p.pos.clone().setY(p.pos.y + 1), tmp.set(Math.sin(a), 0.2, Math.cos(a)), 2.4, BONE, 0.15, 0.25); }
        g.combat.aoe(p.pos, 2.8, 18, p, { knock: 8, stagger: 0.6 });
        for (const e of this.foes(p.pos, 3)) this.soulTouch(e, 1);
        g.fx.shockwave(p.pos, SOUL, 3); g.audio?.energy('slash');
      },
    });
  }
  perception() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    g.toast?.('👁️ Soul Perception'); g.fx.flash(0x0a2030, 0.25, 0.2);
    g.audio?.tone?.({ freq: 300, to: 600, dur: 0.4, gain: 0.08, type: 'sine', rev: 0.5 });
    this.buff('perception', 8, { onTick: () => {
      // every soul nearby glows through the body
      for (const e of this.living()) if (Math.random() < 0.08 && e.pos.distanceTo(p.pos) < 18) g.particles.glow.spawn({ x: e.pos.x, y: e.pos.y + e.height * 0.6, z: e.pos.z, vy: 0.4, life: 0.4, r: 0.8, g: 1.6, b: 2.4, size: 0.25, drag: 1, sizeEnd: 0.4 });
    } });
  }
  distortedKilling() {
    const g = this.game, p = this.p;
    if (this.buffs.has('distorted')) return false;
    p.action = { type: 'cast', both: true, dur: 0.7, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes, 0.9);
    g.toast?.('INSTANT SPIRIT BODY OF DISTORTED KILLING', 'big');
    g.fx.flash(0x0a1a28, 0.45, 0.3); g.fx.chroma(1.2); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1, 0.5);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: SOUL, r0: 0.5, r1: 6, dur: 0.6, thick: 0.2 });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 40, color: FLESH, additive: false, speed: 5, life: 0.8, size: 0.4, sizeEnd: 1 });
    g.audio?.tone?.({ freq: 90, to: 45, dur: 1, gain: 0.25, type: 'sawtooth', filter: 700, rev: 0.6 });
    g.combat.aoe(p.pos, 4, 30, p, { knock: 12, stagger: 1 });
    const s0 = p.object.scale.x;
    this.after(0.6, () => { if (p.action?.lock) p.action = null; });
    this.statBuff('distorted', 10, { meleeMult: 0.4, techMult: 0.25, armor: 0.3, speed: 0.2 }, {
      onStart: () => p.object.scale.setScalar(s0 * 1.25),
      onTick: () => { if (Math.random() < 0.6) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 1.2, y: p.pos.y + Math.random() * 2.3, z: p.pos.z + (Math.random() - 0.5) * 1.2, vy: 1, life: 0.5, r: 0.8, g: 1.6, b: 2.4, size: 0.14, drag: 1, sizeEnd: 0.3, shape: 'square' }); },
      onEnd: () => p.object.scale.setScalar(s0),
    });
  }
  // ------------------------------------------------------------ domain
  // Idle Transfiguration as a sure-hit: every soul inside is touched once
  // (first = the moment the domain completes; later = anything that walks in).
  perfectionTouch(g, d, first) {
    const p = this.p, rk = this.rank('perfection');
    let n = 0;
    for (const e of this.inDomain(null, { dummies: true })) {
      if (e.isBoss) {
        // a soul too vast to reshape in one touch — it is mauled instead
        if (!d.touched.has(e)) {
          d.touched.add(e);
          const wound = 120 + Math.min(e.maxHp * (0.25 + rk * 0.05), 1100);
          g.combat.damageEnemy(e, wound / Math.max(0.2, 1 - (e.armor ?? 0)), p, { unblockable: true, stagger: 1, ceGain: 0, color: '#7ac8f0' });
          e.soul = 5; e.soulT = 6; e.soulTick = 0.5; e.slowT = Math.max(e.slowT ?? 0, 3);
          this.bigHand(e); n++;
        } else if (!e.dead) { this.soulTouch(e, 1); this.handprint(e); }
        continue;
      }
      if (d.touched.has(e)) continue;
      d.touched.add(e);
      this.bigHand(e);
      if (e.isDummy) { g.combat.damageEnemy(e, 200, p, { unblockable: true, stagger: 0.5, ceGain: 0, color: '#7ac8f0' }); continue; }
      this.transfigure(e);   // the shape of its soul is rewritten: death
      n++;
    }
    if (first) {
      g.fx.flash(0x9ad8ff, 0.45, 0.2); g.fx.chroma(1.2); g.fx.screenWave(d.center.clone().setY(d.center.y + 1), 1.2, 0.6);
      g.shake(0.6); g.hitStop(0.1);
      g.toast?.('✋ Idle Transfiguration — sure hit');
      g.audio?.tone({ freq: 140, to: 60, dur: 0.6, gain: 0.25, type: 'sawtooth', filter: 900, rev: 0.5 });
      if (this.handsGrp) this.handsGrp.userData.lunge = 0.5;
    } else if (n) g.audio?.tone({ freq: 220, to: 90, dur: 0.25, gain: 0.1, type: 'triangle' });
  }
  // a pale, stitched hand slaps down on the soul
  bigHand(e) {
    const g = this.game;
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
    this.handprint(e);
    g.fx.arcs.spawn(at, { color: 0xe8f4ff, r0: 0.4, r1: 1.4 + e.radius, dur: 0.35, thick: 0.5, arc: 0.6, rotY: Math.random() * Math.PI * 2 });
    g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.08, e.pos.z), { color: SOUL, r0: 0.2, r1: 2 + e.radius, dur: 0.4, thick: 0.18 });
    g.particles.burst(at, { count: 24, color: SOUL, speed: 5, life: 0.5, size: 0.14, shape: 1, intensity: 3 });
    g.lights.flash(at, SOUL, 8, 8, 0.3);
  }
  // The domain interior: a cavern of enormous hands. A ring of arms reaches
  // in from the barrier wall, arching overhead like ribs, and more hands rise
  // from the floor. They lunge inward when the sure-hit lands.
  raiseHands(g, d) {
    this.lowerHands();
    const grp = new THREE.Group();
    const skin = new THREE.MeshStandardNodeMaterial({ color: 0xb8b0a8, roughness: 0.8 }), pale = new THREE.MeshStandardNodeMaterial({ color: 0x9a948e, roughness: 0.85 });
    const seam = new THREE.MeshStandardNodeMaterial({ color: STITCH, roughness: 0.9 }), glow = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(SOUL).multiplyScalar(2) });
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const hands = [];
    const makeHand = (s, mat, shadow) => {
      const h = new THREE.Group(), arm = new THREE.Group(); h.add(arm);
      const b = (w, hh, dd, x, y, z, m, rx = 0, rz = 0) => { const mm = new THREE.Mesh(unit, m); mm.scale.set(w * s, hh * s, dd * s); mm.position.set(x * s, y * s, z * s); mm.rotation.set(rx, 0, rz); mm.castShadow = shadow; arm.add(mm); };
      b(0.9, 4, 0.9, 0, 2, 0, mat);                 // forearm
      b(0.95, 0.12, 0.95, 0, 2.6, 0, seam);         // stitched seam
      b(1.6, 1.8, 0.5, 0, 4.9, 0, mat);             // palm
      for (let f = 0; f < 4; f++) b(0.32, 1.5, 0.32, (f - 1.5) * 0.42, 6.5, 0.1, mat, 0.25 + Math.random() * 0.3);
      b(0.32, 1.1, 0.32, 0.95, 5, 0.1, mat, 0, -0.8); // thumb
      b(0.5, 0.5, 0.05, 0, 4.9, 0.27, glow);       // a soul-light in the palm
      return { h, arm };
    };
    const R = (d.def.radius ?? 22) * 0.92, c = d.center;
    // wall ring: two tiers, leaning inward so they arch over the arena
    for (let tier = 0; tier < 2; tier++) {
      const n = tier ? 16 : 22;
      for (let i = 0; i < n; i++) {
        const a = (i + tier * 0.5) / n * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
        const s = tier ? 2.2 + Math.random() * 0.6 : 1.5 + Math.random() * 0.5;
        const { h, arm } = makeHand(s, i % 3 ? skin : pale, false);
        const r = R + tier * 1.5;
        h.position.set(c.x + Math.cos(a) * r, c.y - 9, c.z + Math.sin(a) * r);
        h.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));   // face the centre
        arm.rotation.x = tier ? 0.95 : 0.45 + Math.random() * 0.2;   // lean in
        h.userData = { y0: c.y - 0.5 + tier * 2, ph: Math.random() * 6, lean: arm.rotation.x, arm, dir: new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a)), base: new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r) };
        grp.add(h); hands.push(h);
      }
    }
    // floor hands rising between the curses
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * (R - 8);
      const { h, arm } = makeHand(0.9 + Math.random() * 0.5, skin, true);
      h.position.set(c.x + Math.cos(a) * r, c.y - 7, c.z + Math.sin(a) * r);
      h.rotation.y = Math.random() * Math.PI * 2;
      h.userData = { y0: c.y - 0.6, ph: Math.random() * 6, lean: 0, arm, dir: null };
      grp.add(h); hands.push(h);
    }
    grp.userData.res = [unit, skin, pale, seam, glow];
    g.scene.add(grp); this.handsGrp = grp;
    let t = 0;
    g.addUpdater((dt) => {
      if (this.handsGrp !== grp) return false;
      t += dt;
      const L = grp.userData.lunge ?? 0; if (L > 0) grp.userData.lunge = L - dt;
      const k = L > 0 ? Math.sin((1 - L / 0.5) * Math.PI) : 0;   // grab in, then back
      for (const h of hands) {
        const u = h.userData;
        h.position.y += (u.y0 - h.position.y) * Math.min(1, dt * 3);
        u.arm.rotation.x = u.lean + Math.sin(t * 1.1 + u.ph) * 0.06 + (u.dir ? k * 0.35 : 0);
        u.arm.rotation.z = Math.sin(t * 0.8 + u.ph) * 0.08;
        if (u.dir) { h.position.x = u.base.x + u.dir.x * k * 3; h.position.z = u.base.z + u.dir.z * k * 3; }
      }
      return true;
    });
  }
  lowerHands() {
    if (!this.handsGrp) return;
    this.game.scene.remove(this.handsGrp);
    for (const r of this.handsGrp.userData.res ?? []) r.dispose?.();
    this.handsGrp = null;
  }

}
registerKit('mahito', MahitoKit, MAHITO_SKILLS);
