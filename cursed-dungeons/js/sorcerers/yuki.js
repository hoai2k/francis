// Yuki Tsukumo-style kit — Star Rage (Bonbaye). 21 abilities on the technique
// tree; four are equipped (RMB takes a basic one) plus F.
//   LMB         heavy brawler combo; every blow carries virtual mass (huge
//               knockback), the finisher drops a mass shockwave.
//   Stellar     Star Shot (start, RMB), Star Volley, Comet, Meteor Shower, Supernova
//   Bonbaye     Bonbaye (meteor charge), Star Dash, Falling Star, Planet Crusher
//   Mass        Heavy Fist, Virtual Mass: Overload, Mass Throw, Mass Barrage
//   Garuda      Garuda (shikigami), Garuda Dive, Garuda Lash (she wields Garuda as
//               a rigid rod, as against Kenjaku), Garuda Coil, Garuda Spear
//   Singularity Inertia, Gravity Well, Event Horizon, Collapse
//   Talismans   Special Grade Physique, Infinite Mass, Garuda Bond, Bonbaye Momentum
//   F    Ultimate — Star Rage: Black Hole. Yuki has no Domain Expansion shown
//        in canon; her last resort against Kenjaku was to give herself
//        near-infinite mass and collapse into a black hole. She becomes the
//        singularity: everything is dragged in, then crushed in the implosion.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { makeOrb } from '../gfx/orbs.js';

const GOLD = 0xffb02a, STAR = 0xffe08a, VOID = 0x9a5aff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('yuki', {
  name: 'Yuki', technique: 'Star Rage', rarity: 'legendary', title: 'Special Grade', color: '#ffb02a', ultimate: 'Star Rage: Black Hole',
  desc: 'Star Rage loads every blow with virtual mass: crater-making punches, a meteor charge, the shikigami Garuda — and, at the very end, collapsing into a Black Hole.',
});

registerLook('yuki', {
  paint: { skinTone: 0xf2d0b6, hair: 0xf0d27a, hairVolume: true, top: 0x1a1a1e, collar: 0x2a2a30, topTrim: 0x2a2a30, buttons: 0x2a2a30, pants: 0x2b3448, shoes: 0x2a1a12, eye: 0x7a4a2a, fringe: 2, hairSide: 6, hairBack: 8 },
  hair: (m) => [
    { x: -3.5, y: 4, z: -0.5, w: 2, h: 7, d: 4, hang: true, material: m, stiff: 30 },
    { x: 3.5, y: 4, z: -0.5, w: 2, h: 7, d: 4, hang: true, material: m, stiff: 30 },
    { x: 0, y: 5, z: -3.6, w: 8, h: 9, d: 2, hang: true, material: m, stiff: 26 },
    { x: -1.5, y: 8.3, z: 2.5, w: 4, h: 2, d: 3, rx: 0.5, rz: 0.3, material: m },
    { x: 2, y: 8.3, z: 2.5, w: 3, h: 2, d: 3, rx: 0.6, rz: -0.35, material: m },
  ],
  hairColor: 0xf0d27a, accent: GOLD, emit: 0.3,
  cape: { color: 0x15151a, length: 7, width: 9, segments: 3 },
  paintExtra(S) {
    // open biker jacket over a dark top, gold zip
    S.rect(20, 20, 8, 12, 0x15151a, 0.06); S.rect(23, 22, 2, 10, 0x3a3a44, 0.05);
    for (let y = 22; y < 31; y += 2) S.px(24, y, 0xd8b440);
    S.px(10, 12, 0x7a4a2a); S.px(13, 12, 0x7a4a2a);
  },
  props(rig, K) {
    // gold earring and a faint star of cursed energy on her right knuckles
    K.box(rig.head, 0.6, 1.2, 0.6, K.mat(0xffd060, { metalness: 0.9, roughness: 0.25 }), -4.6, 3, 0.5);
    K.box(rig.handR, 4.4, 1.2, 4.4, K.mat(GOLD, { emissive: 1.2 }), 0, -1.5, 0);
  },
});

export const YUKI_SKILLS = [
  { id: 'mass', name: 'Virtual Mass', icon: '🏋️', desc: '+8% melee damage and heavier knockback per rank.', max: 3, branch: 'Mass', tier: 0 },
  { id: 'star_shot', name: 'Heavy Star', icon: '🌟', desc: 'Star Shot craters are bigger and hit harder.', max: 3, req: 'ab:star_shot', branch: 'Stellar', tier: 1 },
  { id: 'bonbaye', name: 'Bonbaye', icon: '🚀', desc: 'The meteor charge reaches further and its landing hits harder.', max: 3, req: 'ab:bonbaye', branch: 'Bonbaye', tier: 2 },
  { id: 'garuda', name: 'Garuda', icon: '🐦‍⬛', desc: 'Garuda stays longer and slams more often.', max: 2, req: 'ab:garuda', branch: 'Garuda', tier: 2 },
  { id: 'lash', name: 'Garuda Lash', icon: '🪶', desc: 'Garuda Lash sweeps wider and hits harder.', max: 3, req: 'ab:garuda_lash', branch: 'Garuda', tier: 4 },
  { id: 'black_hole', name: 'Singularity', icon: '🕳️', desc: 'Black Hole (ultimate) and Collapse pull from further away and implode harder.', max: 3, req: 'ab:gravity_well', branch: 'Singularity', tier: 3 },
];

class YukiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const knock = 1 + r('mass') * 0.15;
    this.combo = [
      { style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 13, range: 2.6, arc: 1.1, lunge: 7, knock: 6 * knock, stop: 0.06, shake: 0.2, trail: GOLD, sparkColor: STAR },
      { style: 'swingL', dur: 0.34, windup: 0.3, strike: 0.52, dmg: 14, range: 2.7, arc: 1.2, lunge: 6, knock: 6 * knock, stop: 0.06, shake: 0.22, trail: GOLD, sparkColor: STAR },
      { style: 'uppercut', dur: 0.42, windup: 0.32, strike: 0.52, dmg: 18, range: 2.7, arc: 1.0, lunge: 5, knock: 7 * knock, stop: 0.08, shake: 0.28, trail: STAR, launch: true },
      { style: 'slam', dur: 0.62, windup: 0.45, strike: 0.62, dmg: 32, range: 3.6, arc: Math.PI, lunge: 4, knock: 15 * knock, stop: 0.12, shake: 0.6, ring: true, ringColor: GOLD, stagger: 0.7, trail: GOLD, mass: true },
    ];
    this.p.stats.meleeMult += r('mass') * 0.08;
    this.massMul = 1; this.garudaMul = 1; this.moveMul = 1;
    this.branches = ['Stellar', 'Bonbaye', 'Mass', 'Garuda', 'Singularity'];
    this.library = {
      // ---- Stellar
      star_shot: ability({ name: 'Star Shot', icon: '⭐', kind: 'basic', desc: 'A fist-sized orb of virtual mass that craters on impact.', cd: 1.3, ce: 0, branch: 'Stellar', tier: 0, start: true, legacy: 'ranged', use: () => this.starShot() }),
      star_volley: ability({ name: 'Star Volley', icon: '✨', kind: 'basic', desc: 'Three smaller mass orbs in a fan; each one craters where it lands.', cd: 2, ce: 3, branch: 'Stellar', tier: 1, req: 'star_shot', use: () => this.starVolley() }),
      comet: ability({ name: 'Comet', icon: '🌠', kind: 'technique', desc: 'Lob a huge star high into the air: it crashes down on the marked spot with crushing mass.', cd: 8, ce: 14, branch: 'Stellar', tier: 2, req: 'star_shot', use: () => this.comet() }),
      meteor_shower: ability({ name: 'Meteor Shower', icon: '🌧️', kind: 'technique', desc: 'Ten mass-laden meteors rain down over the aim area, each one marked before it lands.', cd: 14, ce: 24, branch: 'Stellar', tier: 3, req: 'comet', use: () => this.meteorShower() }),
      supernova: ability({ name: 'Supernova', icon: '💥', kind: 'technique', desc: 'Gather mass into yourself (taking half damage), then release it in a vast stellar explosion.', cd: 30, ce: 55, branch: 'Stellar', tier: 5, req: 'meteor_shower', use: () => this.supernova() }),
      // ---- Bonbaye
      bonbaye: ability({ name: 'Bonbaye', icon: '☄️', kind: 'technique', desc: 'Charge as a mass-laden meteor, ploughing curses aside, ending in a cratering slam.', cd: 6, ce: 12, branch: 'Bonbaye', tier: 1, legacy: 't1', use: () => this.bonbaye() }),
      star_dash: ability({ name: 'Star Dash', icon: '💫', kind: 'movement', desc: 'A short burst of weightless speed that slams heavy into whatever it touches. Two charges.', cd: 4, ce: 4, branch: 'Bonbaye', tier: 2, req: 'bonbaye', maxCharges: 2, chargesLeft: 2, gateTime: 0.35, use: () => this.starDash() }),
      falling_star: ability({ name: 'Falling Star', icon: '⬇️', kind: 'movement', desc: 'Leap to the aim point and land with the weight of a star.', cd: 9, ce: 12, branch: 'Bonbaye', tier: 3, req: 'star_dash', use: () => this.fallingStar() }),
      planet_crusher: ability({ name: 'Planet Crusher', icon: '🪐', kind: 'technique', desc: 'Soar high, mark the ground, and come down with planetary mass: a huge unblockable crater.', cd: 20, ce: 34, branch: 'Bonbaye', tier: 4, req: 'falling_star', use: () => this.planetCrusher() }),
      // ---- Mass
      heavy_fist: ability({ name: 'Heavy Fist', icon: '👊', kind: 'basic', desc: 'One straight punch carrying virtual mass: a forward shockwave that hurls curses away.', cd: 1.6, ce: 0, branch: 'Mass', tier: 1, use: () => this.heavyFist() }),
      mass_overload: ability({ name: 'Virtual Mass: Overload', icon: '🏋️', kind: 'buff', desc: 'For 8s: +35% melee damage and +15% damage reduction, at the cost of a little speed.', cd: 22, ce: 16, branch: 'Mass', tier: 2, req: 'heavy_fist', use: () => this.massOverload() }),
      mass_throw: ability({ name: 'Mass Throw', icon: '🤾', kind: 'technique', desc: 'Grab a curse, load it with mass and hurl it at the aim point, where it lands like a meteor.', cd: 9, ce: 12, branch: 'Mass', tier: 3, req: 'heavy_fist', use: () => this.massThrow() }),
      mass_barrage: ability({ name: 'Mass Barrage', icon: '🥊', kind: 'technique', desc: 'Eight lightning-fast mass punches in front of you, the last a cratering blow.', cd: 12, ce: 20, branch: 'Mass', tier: 4, req: 'mass_throw', use: () => this.massBarrage() }),
      // ---- Garuda
      garuda: ability({ name: 'Garuda', icon: '🐦‍⬛', kind: 'summon', desc: 'Her shikigami circles her and whips its mass-heavy tail down on nearby curses.', cd: 16, ce: 18, branch: 'Garuda', tier: 1, legacy: 't2', use: () => this.summonGaruda() }),
      garuda_dive: ability({ name: 'Garuda: Dive', icon: '🦅', kind: 'technique', desc: 'Garuda folds its wings and dives along the aim line, crushing every curse it passes.', cd: 6, ce: 10, branch: 'Garuda', tier: 2, req: 'garuda', use: () => this.garudaDive() }),
      garuda_lash: ability({ name: 'Garuda Lash', icon: '🪶', kind: 'technique', desc: 'Take Garuda in hand as a rigid, mass-laden rod and swing it round in one crushing sweep.', cd: 11, ce: 22, branch: 'Garuda', tier: 3, legacy: 't3', req: 'garuda', use: () => this.garudaLash() }),
      garuda_coil: ability({ name: 'Garuda: Coil', icon: '🌀', kind: 'defence', desc: 'Garuda coils around you for 6s: hits on you are halved and the attacker is lashed back.', cd: 16, ce: 14, branch: 'Garuda', tier: 3, req: 'garuda_dive', use: () => this.garudaCoil() }),
      garuda_spear: ability({ name: 'Garuda: Mass Spear', icon: '🔱', kind: 'technique', desc: 'Hurl Garuda as a rigid spear of mass: it pierces a long line and bursts at the end.', cd: 14, ce: 26, branch: 'Garuda', tier: 4, req: 'garuda_lash', use: () => this.garudaSpear() }),
      // ---- Singularity
      inertia: ability({ name: 'Inertia', icon: '🛡️', kind: 'defence', desc: 'Give yourself immense mass for 3s: you take 70% less damage and curses that strike you rebound.', cd: 12, ce: 10, branch: 'Singularity', tier: 1, use: () => this.inertia() }),
      gravity_well: ability({ name: 'Gravity Well', icon: '🌑', kind: 'technique', desc: 'Plant a point of mass at the aim: it drags curses together for 2s, then bursts.', cd: 9, ce: 14, branch: 'Singularity', tier: 2, req: 'inertia', use: () => this.gravityWell() }),
      event_horizon: ability({ name: 'Event Horizon', icon: '⭕', kind: 'buff', desc: 'For 6s a ring of crushing gravity surrounds you: curses inside crawl and are ground down, projectiles vanish.', cd: 18, ce: 22, branch: 'Singularity', tier: 3, req: 'gravity_well', use: () => this.eventHorizon() }),
      collapse: ability({ name: 'Star Rage: Collapse', icon: '🕳️', kind: 'technique', desc: 'Collapse mass into a small black hole at the aim: it swallows curses for a moment, then implodes.', cd: 32, ce: 60, branch: 'Singularity', tier: 5, req: 'event_horizon', use: () => this.collapse() }),
    };
    this.passives = {
      physique: passive({ name: 'Special Grade Physique', icon: '💪', desc: '+30 max health and +6% damage reduction.', branch: 'Mass', tier: 2, req: 'heavy_fist', apply: (pl) => { pl.maxHp += 30; pl.hp += 30; pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.06); } }),
      infinite_mass: passive({ name: 'Infinite Mass', icon: '⚖️', desc: 'Mass explosions (stars, meteors, craters, slams) deal 25% more damage.', branch: 'Stellar', tier: 2, req: 'star_volley', apply: (pl, k) => { k.massMul *= 1.25; } }),
      garuda_bond: passive({ name: 'Garuda Bond', icon: '🐦‍⬛', desc: 'Garuda abilities hit 30% harder and Garuda stays 50% longer.', branch: 'Garuda', tier: 2, req: 'garuda', apply: (pl, k) => { k.garudaMul *= 1.3; k.garudaLife = 1.5; } }),
      momentum: passive({ name: 'Bonbaye Momentum', icon: '🏃‍♀️', desc: 'Charges, dashes and leaps hit 30% harder.', branch: 'Bonbaye', tier: 3, req: 'star_dash', apply: (pl, k) => { k.moveMul *= 1.3; } }),
    };
    this.ultimate = { name: 'Star Rage: Black Hole', icon: '🕳️', use: () => this.blackHole() };
    this.garuda = null; this.bh = null;
  }
  dispose() { super.dispose(); this.dismissGaruda(); this.endBlackHole(); if (this.rod) this.p.rig.handR.remove(this.rod); for (const o of this.temps ?? []) this.game.scene.remove(o); this.temps?.clear(); }
  onMeleeHit(e, step) {
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
  }
  onStrike(step) {
    if (!step.mass) return;
    // the finisher's virtual mass ripples outward
    const g = this.game, p = this.p;
    const c = p.pos.clone().addScaledVector(tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing)), 1.3);
    g.combat.aoe(c, 4.5, 12 + this.rank('mass') * 6, p, { melee: true, knock: 9, stagger: 0.4, falloff: true });
    g.fx.debris(c, 0x8a7a6a, 8);
    g.fx.screenWave(c, 0.5, 0.3);
  }
  // ------------------------------------------------------------- Star Shot
  starShot() {
    const g = this.game, p = this.p, rk = this.rank('star_shot');
    this.cast(0.3);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const pr = g.projectiles.fire({ pos: this.handPos(), vel: p.aimDir.clone().multiplyScalar(21), team: 'player', dmg: 0, shape: 'orb', color: STAR, emissive: 4, scale: 1.5, life: 0.7, radius: 0.55, light: 5,
      homing: target ? 12 : 0, target,
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: GOLD, speed: 0.6, life: 0.35, size: 0.35, sizeEnd: 0.05 }),
      onExpire: (q) => this.massBlast(q.pos.clone(), 2.3 + rk * 0.4, 18 + rk * 7, 10 + rk * 2) });
    if (!pr) return false;
    g.audio?.whoosh(0.9);
    g.audio?.tone({ freq: 220, to: 90, dur: 0.25, gain: 0.12, type: 'triangle' });
  }
  massBlast(c, R, dmg, knock) {
    const g = this.game, p = this.p;
    g.combat.aoe(c, R, dmg * this.massMul, p, { knock, stagger: 0.5, falloff: true });
    g.fx.explosion(c, GOLD, R * 0.8);
    g.fx.debris(c, 0x8a7a6a, 6);
    g.shake(0.3); g.hitStop(0.04);
    g.audio?.impact(1.4);
  }
  // ------------------------------------------------------------- Bonbaye
  bonbaye() {
    const g = this.game, p = this.p, rk = this.rank('bonbaye');
    const dir = p.aimDir.clone().setY(0).normalize();
    const dur = 0.38 + rk * 0.06, speed = 24;
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'cast', dur: dur + 0.1, elapsed: 0, t: 0, lock: true, cancelable: false, faceAim: false, root: dir.clone().multiplyScalar(speed) };
    p.vel.x = dir.x * speed; p.vel.z = dir.z * speed;
    p.iframes = Math.max(p.iframes, dur + 0.15);
    g.audio?.charge(0.3, 0.6); g.audio?.whoosh(1.4);
    const hit = new Set();
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 4, color: GOLD, speed: 2, life: 0.4, size: 0.5, sizeEnd: 0.1, intensity: 2 });
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || e.pos.distanceTo(p.pos) > 1.5 + e.radius) continue;
        hit.add(e);
        tmp.subVectors(e.pos, p.pos).setY(0).normalize();
        const side = Math.sign(tmp.x * dir.z - tmp.z * dir.x) || 1;
        tmp2.set(dir.z * side, 0, -dir.x * side).multiplyScalar(10).addScaledVector(dir, 8);
        g.combat.damageEnemy(e, (24 + rk * 8) * this.moveMul, p, { knock: tmp2.clone(), stagger: 0.7 });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
        g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.6), dir, { color: STAR, big: true });
        g.hitStop(0.03); g.audio?.impact(1.2);
      }
      if (t < dur) return true;
      p.action = null;
      const c = p.pos.clone();
      g.combat.aoe(c, 3.4, (32 + rk * 12) * this.moveMul * this.massMul, p, { knock: 13, stagger: 0.8 });
      g.fx.explosion(c, GOLD, 3.2);
      g.fx.shockwave(c, STAR, 5);
      g.fx.debris(c, 0x7a6a5a, 12);
      g.fx.screenWave(c, 0.8, 0.4);
      g.shake(0.55); g.hitStop(0.07);
      g.audio?.energy('explode');
      return false;
    });
  }
  // ------------------------------------------------------------- Garuda
  buildGaruda() {
    const grp = new THREE.Group();
    const body = new THREE.MeshStandardNodeMaterial({ color: 0x15121c, roughness: 0.5, emissive: VOID, emissiveIntensity: 0.25 });
    const glow = new THREE.MeshStandardNodeMaterial({ color: STAR, emissive: STAR, emissiveIntensity: 3 });
    const b = (w, h, d, x, y, z, m, parent = grp) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = true; parent.add(mm); return mm; };
    b(0.45, 0.4, 0.9, 0, 0, 0, body);           // body
    b(0.32, 0.3, 0.4, 0, 0.1, 0.6, body);       // head
    b(0.12, 0.08, 0.3, 0, 0.05, 0.9, glow);     // beak-blade
    b(0.08, 0.08, 0.05, -0.1, 0.18, 0.79, glow); b(0.08, 0.08, 0.05, 0.1, 0.18, 0.79, glow);
    const wings = [b(1.3, 0.06, 0.45, -0.85, 0.1, 0, body), b(1.3, 0.06, 0.45, 0.85, 0.1, 0, body)];
    const tail = [];
    let parent = grp, z = -0.45;
    for (let i = 0; i < 4; i++) { const seg = new THREE.Group(); seg.position.z = z; parent.add(seg); b(0.22 - i * 0.03, 0.2 - i * 0.03, 0.38, 0, 0, -0.19, body, seg); tail.push(seg); parent = seg; z = -0.38; }
    b(0.3, 0.06, 0.3, 0, 0, -0.45, glow, tail[3]);
    grp.userData = { wings, tail };
    return grp;
  }
  dismissGaruda() {
    const G = this.garuda; if (!G) return;
    this.game.scene.remove(G.mesh); this.game.lights.remove(G.light);
    this.game.fx.blinkPuff(G.mesh.position.clone().setY(G.mesh.position.y - 1), VOID);
    this.garuda = null;
  }
  summonGaruda() {
    const g = this.game, p = this.p, rk = this.rank('garuda');
    this.dismissGaruda();
    this.cast(0.45, true);
    const mesh = this.buildGaruda();
    mesh.position.copy(p.pos).setY(p.pos.y + 2);
    g.scene.add(mesh);
    const G = this.garuda = { mesh, light: g.lights.attach(mesh, VOID, 3, 6, { offsetY: 0, priority: 2 }), life: (10 + rk * 4) * (this.garudaLife ?? 1), ang: 0, cd: 0.6, dive: null };
    g.fx.summonCircle(p.pos, VOID);
    g.audio?.energy('summon');
    const pos = mesh.position;
    g.addUpdater((dt) => {
      if (this.garuda !== G) return false;
      G.life -= dt; G.cd -= dt; G.ang += dt * 2.6;
      const u = mesh.userData;
      u.wings[0].rotation.z = Math.sin(G.ang * 6) * 0.5; u.wings[1].rotation.z = -Math.sin(G.ang * 6) * 0.5;
      u.tail.forEach((s, i) => { s.rotation.y = Math.sin(G.ang * 4 - i) * 0.35; });
      if (G.dive) {
        const D = G.dive; D.t += dt;
        const k = Math.min(1, D.t / 0.22);
        pos.lerpVectors(D.from, tmp.copy(D.e.pos).setY(D.e.pos.y + 0.6), k);
        mesh.lookAt(tmp.copy(D.e.pos).setY(D.e.pos.y + 0.6));
        if (k >= 1) {
          const c = D.e.pos.clone();
          g.combat.aoe(c, 2.2, (22 + rk * 8) * this.garudaMul, p, { knock: 11, stagger: 0.6, blocks: false });
          if (!D.e.isBoss && !D.e.dead) D.e.vel.y = Math.max(D.e.vel.y, 7);
          g.fx.shockwave(c, VOID, 3); g.fx.hitSpark(c.setY(c.y + 0.6), null, { color: STAR, big: true });
          g.shake(0.2); g.audio?.impact(1.3);
          G.dive = null; G.cd = 1.1 - rk * 0.2;
        }
      } else {
        const target = G.cd <= 0 ? g.nearestEnemy(p.pos, 9) : null;
        if (target) G.dive = { e: target, t: 0, from: pos.clone() };
        else {
          tmp.set(p.pos.x + Math.cos(G.ang) * 1.9, p.pos.y + 2.1 + Math.sin(G.ang * 2) * 0.2, p.pos.z + Math.sin(G.ang) * 1.9);
          pos.lerp(tmp, Math.min(1, dt * 8));
          mesh.lookAt(tmp2.set(p.pos.x + Math.cos(G.ang + 0.4) * 1.9, pos.y, p.pos.z + Math.sin(G.ang + 0.4) * 1.9));
        }
      }
      if (Math.random() < 0.5) g.particles.glow.emit(pos.x, pos.y, pos.z, 0, 0.2, 0, 0.5, 0.9, 0.5, 1.6, 0.12, 0, 1, 0.1, 0);
      if (G.life <= 0) { this.dismissGaruda(); return false; }
      return true;
    });
  }
  // ------------------------------------------------------------- Garuda Lash
  garudaLash() {
    const g = this.game, p = this.p, rk = this.rank('lash');
    const held = !!this.garuda;
    if (held) this.dismissGaruda();   // Garuda straightens into her weapon
    if (this.rod) p.rig.handR.remove(this.rod);
    const rod = this.rod = new THREE.Group();
    const m = new THREE.MeshStandardNodeMaterial({ color: 0x15121c, roughness: 0.5, emissive: VOID, emissiveIntensity: 0.6 });
    const tipM = new THREE.MeshStandardNodeMaterial({ color: STAR, emissive: STAR, emissiveIntensity: 3 });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.8, 0.14).translate(0, -1.4, 0), m);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), tipM); tip.position.y = -2.8;
    rod.add(shaft, tip); p.rig.handR.add(rod);
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.55, windup: 0.3 }, style: 'spin', dur: 0.5, elapsed: 0, t: 0, windup: 0.3, strike: 0.55, struck: true, moveScale: 0.15 };
    g.audio?.whoosh(1.5);
    let t = 0, done = false;
    g.addUpdater((dt) => {
      t += dt;
      if (!done && t >= 0.2) {
        done = true;
        const R = 5 + rk * 0.6, dmg = (38 + rk * 14) * (held ? 1.3 : 1) * this.garudaMul;
        g.combat.aoe(p.pos, R, dmg, p, { melee: true, knock: 15, stagger: 0.9, unblockable: true });
        g.fx.slashArc(p.pos, p.facing, STAR, R, Math.PI, 0.3);
        g.fx.slashArc(p.pos, p.facing, VOID, R * 0.85, Math.PI, 0.35, true);
        g.fx.shockwave(p.pos, GOLD, R + 1); g.fx.debris(p.pos, 0x8a7a6a, 10);
        g.shake(0.45); g.hitStop(0.06); g.audio?.impact(1.8);
      }
      if (t < 0.5) return true;
      if (this.rod === rod) { p.rig.handR.remove(rod); this.rod = null; }
      return false;
    });
  }
  // ------------------------------------------------------------- Black Hole (ultimate)
  // Yuki gives herself near-infinite virtual mass and collapses into a black
  // hole: she is the singularity, everything is dragged in, then crushed.
  blackHole() {
    const g = this.game, p = this.p, rk = this.rank('black_hole');
    if (this.bh) return false;
    const R = 15 + rk * 2, dur = 3.4;
    const c = p.pos.clone(); c.y += 2.4;
    const orb = makeOrb(VOID, { radius: 0.1, darkCore: true });
    orb.position.copy(c); g.scene.add(orb);
    const light = g.lights.flash(c, VOID, 22, R * 2.2, dur + 1, { priority: 6, fade: false });
    const B = this.bh = { orb, light };
    p.invulnerable = true;
    p.action = { type: 'raise', dur: dur + 0.5, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Star Rage: Black Hole', 'big');
    g.fx.dimTarget = 0.55; g.fx.flash(0x000000, 0.7, 0.4); g.fx.chroma(1.2);
    g.slowMo(0.9, 0.35); g.shake(0.4);
    g.audio?.charge(1.2, 0.5); g.audio?.energy('blue');
    g.audio?.tone({ freq: 45, to: 22, dur, gain: 0.5, type: 'sawtooth', filter: 300, rev: 0.5 });
    let t = 0, tick = 0, ring = 0;
    g.addUpdater((dt) => {
      if (this.bh !== B) return false;
      t += dt; tick -= dt; ring -= dt;
      const grow = Math.min(1, t / 0.8);
      orb.scale.setScalar((0.4 + grow * 2.4) * (1 + Math.sin(t * 30) * 0.05));
      orb.rotation.y += dt * 8;
      const gy = p.pos.y + 0.08;
      if (ring <= 0) {
        ring = 0.14;
        g.fx.darkRings.spawn(tmp.set(c.x, gy, c.z), { color: 0x000000, r0: R, r1: 0.6, dur: 0.55, thick: 0.4 });
        g.fx.rings.spawn(tmp.set(c.x, gy + 0.05, c.z), { color: GOLD, r0: R * 0.85, r1: 0.5, dur: 0.5, thick: 0.1 });
      }
      for (let i = 0; i < 14; i++) {   // accretion disc spiralling into her
        const a = Math.random() * Math.PI * 2, rr = 1.5 + Math.random() * R;
        const px = c.x + Math.cos(a) * rr, pz = c.z + Math.sin(a) * rr, py = c.y + (Math.random() - 0.5) * 1.5;
        const sp = 7 + Math.random() * 5, col = Math.random() < 0.5 ? [2.2, 1.3, 0.3] : [1.2, 0.6, 2.2];
        g.particles.glow.emit(px, py, pz, (c.x - px) / rr * sp - Math.sin(a) * 7, (c.y - py), (c.z - pz) / rr * sp + Math.cos(a) * 7, rr / sp, col[0], col[1], col[2], 0.14, 0, 0, 0.3, 1);
      }
      for (const e of g.enemies) {
        if (e.dead || e.isDummy) continue;
        tmp.subVectors(c, e.pos); const dy = tmp.y; tmp.y = 0; const dist = tmp.length();
        if (dist > R * 1.2 || Math.abs(dy) > 7) continue;
        e.slowT = 0.3;
        e.knock.lerp(tmp.normalize().multiplyScalar(Math.min(dist * 8, 22) * (1 - (e.def?.knockResist ?? 0) * 0.4)), Math.min(1, dt * 10));
        if (e.state === 'windup') { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.3; }
      }
      for (const pr of [...g.projectiles.list]) {   // nothing escapes the event horizon
        if (pr.team === 'enemy' && pr.pos.distanceTo(c) < R) g.projectiles.kill(pr, 'cut');
      }
      if (tick <= 0) { tick = 0.2; g.combat.aoe(tmp2.set(c.x, p.pos.y, c.z), 4, 12 + rk * 4, p, { stagger: 0.15, ceGain: 0, blocks: false }); }
      if (t < dur) return true;
      // collapse
      this.endBlackHole();
      const gc = p.pos.clone(), I = R * 0.7;
      g.combat.aoe(gc, I, 260 + rk * 70, p, { knock: 22, stagger: 1.2, unblockable: true, falloff: true, ceGain: 0 });
      for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(gc) < I) e.vel.y = Math.max(e.vel.y, 12);
      g.fx.explosion(c, VOID, 6); g.fx.explosion(gc, GOLD, 4);
      g.fx.shockwave(gc, GOLD, R + 4, 0.7); g.fx.shockwave(gc, VOID, R, 0.5);
      g.particles.burst(c, { count: 90, color: STAR, speed: 24, life: 0.6, size: 0.14, drag: 3, shape: 1, intensity: 4 });
      g.fx.flash(0xffffff, 0.9, 0.35); g.fx.screenWave(c, 2, 0.8); g.fx.chroma(2);
      g.shake(1.2); g.hitStop(0.15); g.slowMo(0.6, 0.25);
      g.audio?.blackFlash(); g.audio?.energy('purple'); g.audio?.energy('explode');
      return false;
    });
  }
  endBlackHole() {
    const B = this.bh; if (!B) return;
    this.bh = null;
    const g = this.game, p = this.p;
    g.scene.remove(B.orb); g.lights.remove(B.light);
    p.invulnerable = false; g.fx.dimTarget = 0;
    if (p.action?.type === 'raise') p.action = null;
  }
  // ============================================================== library abilities
  // a temporary scene object, removed when it ends or when the kit is rebuilt
  temp(o) { (this.temps || (this.temps = new Set())).add(o); this.game.scene.add(o); return o; }
  untemp(o) { this.temps?.delete(o); this.game.scene.remove(o); }
  // a fair warning on the ground: a steady outer ring and one closing inward
  warn(c, R, dur, col = GOLD) {
    const g = this.game, y = this.groundAt(c.x, c.z, c.y) + 0.07;
    g.fx.rings.spawn(tmp.set(c.x, y, c.z), { color: col, r0: R, r1: R, dur, thick: 0.1 });
    g.fx.rings.spawn(tmp.set(c.x, y + 0.01, c.z), { color: col, r0: R, r1: 0.3, dur, thick: 0.3 });
  }
  // a jump along an arc to `to` (world-collision safe); onLand runs on touchdown
  leapTo(to, dur, height, onLand, style = 'slam') {
    const g = this.game, p = this.p, from = p.pos.clone();
    p.invulnerable = true;
    p.action = { type: 'attack', step: { style, strike: 0.9, windup: 0.3 }, style, dur: dur + 0.1, elapsed: 0, t: 0, windup: 0.3, strike: 0.9, struck: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    this.during(dur, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * height;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 2, color: GOLD, speed: 1, life: 0.35, size: 0.4, sizeEnd: 0.05, intensity: 2 });
    }, () => { p.invulnerable = false; if (p.action?.lock) p.action = null; if (!this.disposed) onLand?.(p.pos.clone()); });
  }
  crater(c, R, dmg, o = {}) {
    const g = this.game;
    this.blast(c, R, dmg * this.massMul, { color: GOLD, knock: 12, stagger: 0.8, falloff: true, ...o });
    g.fx.debris(c, 0x7a6a5a, Math.round(6 + R * 2));
    g.fx.shockwave(c, STAR, R + 1.5);
    g.combat.hitBlocks(c, tmp2.set(0, 0, 1), R * 0.6, Math.PI, 30, this.p);
    for (const e of this.foes(c, R)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6 + R);
  }
  // ---- Stellar
  starVolley() {
    const g = this.game, p = this.p, rk = this.rank('star_shot');
    this.cast(0.3);
    const base = this.aimAngle();
    for (let i = -1; i <= 1; i++) {
      const a = base + i * 0.22;
      g.projectiles.fire({ pos: this.handPos(), vel: tmp.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(20), team: 'player', dmg: 0, shape: 'orb', color: STAR, emissive: 4, scale: 1, life: 0.55, radius: 0.45, light: 2,
        trail: (q) => g.particles.burst(q.pos, { count: 1, color: GOLD, speed: 0.5, life: 0.3, size: 0.25, sizeEnd: 0.05 }),
        onExpire: (q) => this.massBlast(q.pos.clone(), 1.7 + rk * 0.25, 12 + rk * 4, 7) });
    }
    g.audio?.whoosh(0.8);
  }
  comet() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const c = this.aimGround(13), R = 3.6, fall = 0.8;
    this.warn(c, R, fall);
    const orb = this.temp(makeOrb(STAR, { radius: 0.7 }));
    const from = this.handPos().clone(); from.y += 1;
    g.audio?.whoosh(1.2); g.audio?.tone({ freq: 300, to: 80, dur: fall, gain: 0.12, type: 'triangle' });
    this.during(fall, (t, dt, k) => {
      orb.position.set(from.x + (c.x - from.x) * k, from.y + (c.y - from.y) * k + Math.sin(k * Math.PI) * 9, from.z + (c.z - from.z) * k);
      orb.scale.setScalar(1 + k);
      g.particles.burst(orb.position, { count: 3, color: GOLD, speed: 1, life: 0.4, size: 0.5, sizeEnd: 0.05, intensity: 2.5 });
    }, () => {
      this.untemp(orb);
      this.crater(c, R, 55 + this.rank('star_shot') * 10);
      g.fx.screenWave(c, 0.8, 0.4); g.hitStop(0.05);
    });
  }
  meteorShower() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = this.aimGround(13), R = 5;
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: GOLD, r0: R, r1: R, dur: 2.4, thick: 0.08 });
    g.audio?.charge(0.4, 0.8);
    for (let i = 0; i < 10; i++) this.after(0.2 + i * 0.2, () => {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      const at = new THREE.Vector3(c.x + Math.cos(a) * rr, 0, c.z + Math.sin(a) * rr); at.y = this.groundAt(at.x, at.z, c.y);
      this.warn(at, 1.8, 0.45);
      const m = this.temp(makeOrb(GOLD, { radius: 0.45 }));
      const top = at.clone().add(tmp2.set(-3, 12, -1.5));
      this.during(0.45, (t, dt, k) => {
        m.position.lerpVectors(top, at, k);
        g.particles.burst(m.position, { count: 2, color: STAR, speed: 0.8, life: 0.35, size: 0.4, sizeEnd: 0.05, intensity: 2.5 });
      }, () => { this.untemp(m); this.crater(at, 1.9, 26 + this.rank('star_shot') * 5, { knock: 8 }); });
    });
  }
  supernova() {
    const g = this.game, p = this.p, R = 8, ch = 1.2;
    p.action = { type: 'raise', dur: ch + 0.2, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    this.buff('supernova_guard', ch + 0.2, { incoming: (a) => a * 0.5 });
    this.warn(p.pos, R, ch);
    g.toast?.('Supernova'); g.audio?.charge(ch, 0.6);
    const light = g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), STAR, 6, 12, ch + 0.3, { priority: 5, fade: false });
    this.during(ch, (t, dt, k) => {
      const h = tmp.set(p.pos.x, p.pos.y + 1.3, p.pos.z);
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2, rr = 2 + Math.random() * (R - 2) * (1 - k * 0.6);
        g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.3) * 2, h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 2.5, 0, -Math.sin(a) * rr * 2.5, 0.35, 2.2, 1.6, 0.5, 0.15, 0, 0, 0.2, 1);
      }
      g.shake(0.04 + k * 0.1);
    }, () => {
      g.lights.remove(light);
      if (p.action?.type === 'raise') p.action = null;
      const c = p.pos.clone();
      this.crater(c, R, 160 + this.rank('star_shot') * 25, { unblockable: true, knock: 18 });
      g.fx.explosion(c, STAR, 6); g.fx.shockwave(c, GOLD, R + 4, 0.7);
      g.particles.burst(c.clone().setY(c.y + 1.4), { count: 80, color: STAR, speed: 22, life: 0.6, size: 0.14, drag: 3, shape: 1, intensity: 4 });
      g.fx.flash(0xfff0c0, 0.7, 0.3); g.fx.screenWave(c, 1.8, 0.7); g.fx.chroma(1.5);
      g.shake(1); g.hitStop(0.12); g.audio?.energy('explode'); g.audio?.blackFlash();
    });
  }
  // ---- Bonbaye
  starDash() {
    const g = this.game;
    this.dash(this.fwd(), 6.5, 0.2, { hitR: 1.6, dmg: 16 * this.moveMul, color: GOLD, onHit: (e) => { if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 5); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: STAR }); } });
    g.audio?.whoosh(1.2);
  }
  fallingStar() {
    const g = this.game, to = this.aimGround(10);
    this.warn(to, 3.5, 0.5);
    g.audio?.whoosh(1.3);
    this.leapTo(to, 0.5, 3.5, (c) => { this.crater(c, 3.5, (40 + this.rank('bonbaye') * 8) * this.moveMul); g.hitStop(0.05); });
  }
  planetCrusher() {
    const g = this.game, p = this.p, to = this.aimGround(12), R = 6;
    this.warn(to, R, 1.05);
    g.toast?.('Planet Crusher'); g.audio?.charge(1, 0.5);
    this.leapTo(to, 1.05, 9, (c) => {
      this.crater(c, R, (110 + this.rank('bonbaye') * 20) * this.moveMul, { unblockable: true, knock: 16 });
      g.fx.explosion(c, GOLD, 4.5); g.fx.screenWave(c, 1.4, 0.6); g.fx.flash(0xffe0a0, 0.4, 0.2);
      g.shake(0.9); g.hitStop(0.1); g.audio?.energy('explode');
    });
  }
  // ---- Mass
  heavyFist() {
    const g = this.game, p = this.p, f = this.fwd(), rk = this.rank('mass');
    this.pose('punch', 0.32);
    this.after(0.1, () => {
      for (const e of this.foes(p.pos, 4.2, f, 0.7)) {
        this.hit(e, (22 + rk * 6) * this.massMul, { melee: true, stagger: 0.6, knock: f.clone().multiplyScalar(14 + rk * 2) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 4);
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), f, { color: STAR, big: true });
      }
      const front = p.pos.clone().addScaledVector(f, 1.5);
      g.fx.slashArc(p.pos, p.facing, GOLD, 4, 0.4, 0.2); g.fx.shockwave(front, GOLD, 2.5); g.fx.screenWave(front.setY(front.y + 1), 0.4, 0.25);
      g.particles.burst(front, { count: 16, color: STAR, speed: 12, dir: f.clone(), spread: 0.4, life: 0.3, size: 0.12, drag: 4, shape: 1 });
      g.shake(0.25); g.audio?.impact(1.4);
    });
  }
  massOverload() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('Virtual Mass: Overload'); g.fx.shockwave(p.pos, GOLD, 4); g.audio?.charge(0.4, 0.6);
    this.statBuff('mass_overload', 8, { meleeMult: 0.35, armor: 0.15, speed: -0.1 }, {
      onTick: () => { if (Math.random() < 0.5) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5), p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5), 0, 0.6, 0, 0.5, 2, 1.3, 0.3, 0.14, 0, 1, 0.1, 0); },
    });
  }
  massThrow() {
    const g = this.game, p = this.p, t = this.target(8);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, GOLD);
    this.pose('uppercut', 0.4);
    const to = this.aimGround(12);
    this.warn(to, 3, 0.6);
    g.audio?.whoosh(1.4);
    this.after(0.12, () => {
      if (t.dead) return;
      this.hit(t, 20 * this.massMul, { melee: true, stagger: 1 });
      if (!t.isBoss) {
        const d = tmp.subVectors(to, t.pos).setY(0);
        t.knock.copy(d).multiplyScalar(1 / 0.45); t.vel.y = 9;
      }
    });
    this.after(0.6, () => {
      const c = t.isBoss || t.dead ? to : t.pos.clone();
      if (!t.dead) this.hit(t, 40 * this.massMul, { stagger: 1, unblockable: true });
      this.crater(c, 3, 45 + this.rank('mass') * 8);
    });
  }
  massBarrage() {
    const g = this.game, p = this.p, f = this.fwd();
    p.action = { type: 'cast', dur: 0.95, elapsed: 0, t: 0, moveScale: 0.15, lock: true, faceAim: true };
    for (let i = 0; i < 8; i++) this.after(i * 0.1, () => {
      const last = i === 7, ff = this.fwd();
      this.pose(i % 2 ? 'swingL' : 'punch', 0.12);
      if (!last) p.action.lock = true;
      for (const e of this.foes(p.pos, 3.4, ff, 0.8)) {
        this.hit(e, last ? 42 * this.massMul : 10 + this.rank('mass') * 2, { melee: true, stagger: last ? 1 : 0.3, knock: ff.clone().multiplyScalar(last ? 15 : 1.5) });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), ff, { color: last ? STAR : GOLD, big: last });
      }
      const c = p.pos.clone().addScaledVector(ff, 1.6);
      g.fx.slashArc(p.pos, p.facing + (Math.random() - 0.5) * 0.6, GOLD, 3, 0.25, 0.12, i % 2 === 1);
      if (last) { g.fx.shockwave(c, GOLD, 4); g.fx.screenWave(c.setY(c.y + 1), 0.6, 0.3); g.shake(0.5); g.hitStop(0.07); g.audio?.impact(1.9); }
      else { g.audio?.impact(0.8); g.shake(0.08); }
    });
  }
  // ---- Garuda
  garudaDive() {
    const g = this.game, p = this.p, f = this.fwd(), L = 12;
    this.cast(0.35, true);
    const had = !!this.garuda;
    const mesh = had ? null : this.temp(this.buildGaruda());
    const G = had ? this.garuda.mesh : mesh;
    if (had) this.garuda.dive = null;
    const from = p.pos.clone().setY(p.pos.y + 3), to = p.pos.clone().addScaledVector(f, L).setY(p.pos.y + 0.8);
    g.fx.slashLine(p.pos.clone().setY(p.pos.y + 0.1), f, L, VOID, 1.2, 0.35);
    const hit = new Set();
    g.audio?.whoosh(1.5);
    this.during(0.32, (t, dt, k) => {
      if (had && !this.garuda) return false;
      G.position.lerpVectors(from, to, k); G.lookAt(to);
      g.particles.burst(G.position, { count: 3, color: VOID, speed: 2, life: 0.35, size: 0.35, sizeEnd: 0.05 });
      this.line(from.clone().setY(p.pos.y), f, L * k, 1.3, (e) => {
        if (hit.has(e)) return; hit.add(e);
        this.hit(e, 30 * this.garudaMul, { stagger: 0.7, knock: f.clone().multiplyScalar(8) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6);
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: STAR, big: true });
      });
    }, () => {
      g.fx.shockwave(to, VOID, 3.5); g.audio?.impact(1.4); g.shake(0.25);
      if (mesh) { this.untemp(mesh); g.fx.blinkPuff(to, VOID); }
    });
  }
  garudaCoil() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const mesh = this.temp(this.buildGaruda());
    let ang = 0;
    g.audio?.energy('summon');
    this.buff('garuda_coil', 6, {
      incoming: (a, src) => {
        if (src && g.enemies.includes(src) && !src.dead) {
          this.hit(src, 20 * this.garudaMul, { stagger: 0.6, knock: tmp.subVectors(src.pos, p.pos).setY(0).normalize().multiplyScalar(10) });
          g.fx.slashLine(mesh.position.clone(), tmp2.subVectors(src.pos, mesh.position).normalize(), Math.min(4, src.pos.distanceTo(mesh.position)), VOID, 0.3, 0.2);
          g.audio?.impact(1.1);
        }
        return a * 0.5;
      },
      onTick: (dt) => {
        ang += dt * 7;
        mesh.position.set(p.pos.x + Math.cos(ang) * 1.1, p.pos.y + 1 + Math.sin(ang * 2) * 0.4, p.pos.z + Math.sin(ang) * 1.1);
        mesh.lookAt(tmp.set(p.pos.x + Math.cos(ang + 0.5) * 1.1, mesh.position.y, p.pos.z + Math.sin(ang + 0.5) * 1.1));
        const u = mesh.userData; u.wings[0].rotation.z = Math.sin(ang * 3) * 0.5; u.wings[1].rotation.z = -Math.sin(ang * 3) * 0.5;
        if (Math.random() < 0.5) g.particles.glow.emit(mesh.position.x, mesh.position.y, mesh.position.z, 0, 0.2, 0, 0.4, 0.9, 0.5, 1.6, 0.12, 0, 1, 0.1, 0);
      },
      onEnd: () => { this.untemp(mesh); g.fx.blinkPuff(p.pos, VOID); },
    });
  }
  garudaSpear() {
    const g = this.game, p = this.p, f = this.fwd(), L = 18;
    if (this.garuda) this.dismissGaruda();
    this.pose('swingR', 0.35);
    const spear = this.temp(new THREE.Group());
    const m = new THREE.MeshStandardNodeMaterial({ color: 0x15121c, roughness: 0.5, emissive: VOID, emissiveIntensity: 0.8 });
    const tipM = new THREE.MeshStandardNodeMaterial({ color: STAR, emissive: STAR, emissiveIntensity: 3 });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 3), m), tip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.5), tipM); tip.position.z = 1.6;
    spear.add(shaft, tip);
    const from = this.handPos().clone(), to = from.clone().addScaledVector(f, L);
    spear.position.copy(from); spear.lookAt(to);
    const hit = new Set();
    g.audio?.whoosh(1.6);
    this.during(0.4, (t, dt, k) => {
      spear.position.lerpVectors(from, to, k);
      g.particles.burst(spear.position, { count: 3, color: Math.random() < 0.5 ? VOID : STAR, speed: 1, life: 0.35, size: 0.3, sizeEnd: 0.05, intensity: 2 });
      this.line(from.clone().setY(p.pos.y), f, L * k, 1, (e) => {
        if (hit.has(e)) return; hit.add(e);
        this.hit(e, 70 * this.garudaMul, { stagger: 0.9, unblockable: true, knock: f.clone().multiplyScalar(9) });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: STAR, big: true }); g.hitStop(0.03);
      });
      if (g.world.solidAt(spear.position.x, spear.position.y, spear.position.z)) return false;
    }, () => {
      const c = spear.position.clone(); c.y = this.groundAt(c.x, c.z, p.pos.y);
      this.untemp(spear); shaft.geometry.dispose(); tip.geometry.dispose();
      this.crater(c, 3, 40 * this.garudaMul);
    });
  }
  // ---- Singularity
  inertia() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.fx.shockwave(p.pos, GOLD, 3); g.audio?.impact(1.2); g.audio?.tone({ freq: 80, to: 50, dur: 0.4, gain: 0.3, type: 'sine' });
    const shell = this.temp(makeOrb(GOLD, { radius: 1.3 }));
    this.buff('inertia', 3, {
      incoming: (a, src) => {
        if (src && g.enemies.includes(src) && !src.dead) { this.hit(src, 10, { stagger: 0.8, knock: tmp.subVectors(src.pos, p.pos).setY(0).normalize().multiplyScalar(14) }); g.fx.hitSpark(src.pos.clone().setY(src.pos.y + 1), null, { color: GOLD }); }
        return a * 0.3;
      },
      onTick: (dt, b) => { shell.position.set(p.pos.x, p.pos.y + 1, p.pos.z); shell.scale.setScalar(0.9 + Math.sin(g.time * 12) * 0.04); shell.visible = b.left > 0.3 || Math.sin(g.time * 40) > 0; },
      onEnd: () => this.untemp(shell),
    });
  }
  pull(c, R, dt, pow = 12) {
    for (const e of this.foes(c, R)) {
      if (e.isDummy) continue;
      tmp.subVectors(c, e.pos).setY(0); const d = tmp.length(); if (d < 0.3) continue;
      e.knock.lerp(tmp.normalize().multiplyScalar(Math.min(d * 4, pow) * (1 - (e.def?.knockResist ?? 0) * 0.5)), Math.min(1, dt * 8));
      e.slowT = Math.max(e.slowT ?? 0, 0.2);
    }
  }
  gravityWell() {
    const g = this.game, p = this.p, c = this.aimGround(12), R = 6;
    this.cast(0.35, true);
    const orb = this.temp(makeOrb(VOID, { radius: 0.3, darkCore: true }));
    orb.position.copy(c).setY(c.y + 1.2);
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: VOID, r0: R, r1: R, dur: 2, thick: 0.08 });
    g.audio?.energy('blue');
    let ring = 0;
    this.during(2, (t, dt) => {
      ring -= dt;
      orb.scale.setScalar(1 + t * 0.6 + Math.sin(t * 25) * 0.05);
      this.pull(c, R, dt);
      if (ring <= 0) { ring = 0.25; g.fx.darkRings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: 0x000000, r0: R, r1: 0.5, dur: 0.5, thick: 0.25 }); }
      for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, rr = 1 + Math.random() * R; g.particles.glow.emit(c.x + Math.cos(a) * rr, c.y + 1.2, c.z + Math.sin(a) * rr, -Math.cos(a) * rr * 2, 0, -Math.sin(a) * rr * 2, 0.5, 1.2, 0.6, 2.2, 0.12, 0, 0, 0.2, 1); }
    }, () => {
      this.untemp(orb);
      this.blast(c, 3.2, (40 + this.rank('black_hole') * 10) * this.massMul, { color: VOID, knock: 6, stagger: 0.8 });
    });
  }
  eventHorizon() {
    const g = this.game, p = this.p, R = 5;
    this.cast(0.4, true);
    g.toast?.('Event Horizon'); g.audio?.energy('blue');
    let tick = 0, ring = 0;
    this.buff('event_horizon', 6, {
      onTick: (dt) => {
        tick -= dt; ring -= dt;
        const c = p.pos;
        if (ring <= 0) {
          ring = 0.3;
          g.fx.darkRings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: 0x000000, r0: R, r1: R * 0.85, dur: 0.3, thick: 0.3 });
          g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: GOLD, r0: R, r1: R, dur: 0.3, thick: 0.06 });
        }
        for (const e of this.foes(c, R)) e.slowT = Math.max(e.slowT ?? 0, 0.3);
        for (const pr of [...g.projectiles.list]) if (pr.team === 'enemy' && Math.hypot(pr.pos.x - c.x, pr.pos.z - c.z) < R) { g.particles.burst(pr.pos, { count: 6, color: VOID, speed: 2, life: 0.3, size: 0.15 }); g.projectiles.kill(pr, 'cut'); }
        if (tick <= 0) { tick = 0.5; for (const e of this.foes(c, R)) this.hit(e, 9 + this.rank('black_hole') * 3, { stagger: 0.2, ceGain: 0.4 }); }
        if (Math.random() < 0.6) { const a = Math.random() * Math.PI * 2; g.particles.glow.emit(c.x + Math.cos(a) * R, c.y + 0.3, c.z + Math.sin(a) * R, -Math.cos(a) * 3, 0.4, -Math.sin(a) * 3, 0.6, 1.4, 0.8, 0.3, 0.14, 0, 1, 0.1, 0); }
      },
    });
  }
  collapse() {
    const g = this.game, p = this.p, c = this.aimGround(12), rk = this.rank('black_hole');
    const R = 9 + rk, dur = 2.4;
    this.cast(0.6, true);
    g.toast?.('Star Rage: Collapse'); g.audio?.charge(0.6, 0.5); g.audio?.energy('blue');
    this.warn(c, 4.5, dur, VOID);
    const orb = this.temp(makeOrb(VOID, { radius: 0.1, darkCore: true }));
    const top = c.clone().setY(c.y + 1.8); orb.position.copy(top);
    const light = g.lights.flash(top, VOID, 12, R * 1.5, dur + 0.5, { priority: 5, fade: false });
    let tick = 0, ring = 0;
    this.during(dur, (t, dt) => {
      tick -= dt; ring -= dt;
      orb.scale.setScalar((0.4 + Math.min(1, t / 0.6) * 1.6) * (1 + Math.sin(t * 30) * 0.05));
      this.pull(c, R, dt, 18);
      if (ring <= 0) { ring = 0.16; g.fx.darkRings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: 0x000000, r0: R, r1: 0.6, dur: 0.5, thick: 0.35 }); }
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2, rr = 1.2 + Math.random() * R, px = top.x + Math.cos(a) * rr, pz = top.z + Math.sin(a) * rr, sp = 6 + Math.random() * 4;
        g.particles.glow.emit(px, top.y + (Math.random() - 0.5), pz, (top.x - px) / rr * sp - Math.sin(a) * 5, 0, (top.z - pz) / rr * sp + Math.cos(a) * 5, rr / sp, 1.4, 0.7, 2.2, 0.12, 0, 0, 0.3, 1);
      }
      for (const pr of [...g.projectiles.list]) if (pr.team === 'enemy' && pr.pos.distanceTo(top) < R) g.projectiles.kill(pr, 'cut');
      if (tick <= 0) { tick = 0.25; g.combat.aoe(c, 3, 10 + rk * 3, p, { stagger: 0.2, ceGain: 0, blocks: false }); }
    }, () => {
      this.untemp(orb); g.lights.remove(light);
      this.blast(c, 4.5, (140 + rk * 30) * this.massMul, { color: VOID, knock: 16, stagger: 1.1, unblockable: true });
      for (const e of this.foes(c, 4.5)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 10);
      g.particles.burst(top, { count: 60, color: STAR, speed: 18, life: 0.5, size: 0.12, drag: 3, shape: 1, intensity: 4 });
      g.fx.flash(0xffffff, 0.5, 0.2); g.fx.screenWave(top, 1.2, 0.5); g.fx.chroma(1.2);
      g.shake(0.8); g.hitStop(0.1); g.audio?.energy('purple');
    });
  }
}
registerKit('yuki', YukiKit, YUKI_SKILLS);
