// Yuki Tsukumo-style kit — Star Rage (Bonbaye).
//   LMB  heavy brawler combo; every blow carries virtual mass (huge knockback),
//        the finisher drops a mass shockwave.
//   RMB  Star Shot: a fist-sized orb of virtual mass that craters on impact.
//   1    Bonbaye: she charges as a mass-laden meteor, ploughing curses aside,
//        and ends in a cratering slam.
//   2    Garuda: her shikigami circles her and whips its mass-heavy tail down
//        on nearby curses.
//   3    Garuda Lash: Yuki takes Garuda in hand as a rigid, mass-laden rod and
//        swings it round in one crushing sweep (canon: she wields Garuda as a
//        weapon against Kenjaku).
//   F    Ultimate — Star Rage: Black Hole. Yuki has no Domain Expansion shown
//        in canon; her last resort against Kenjaku was to give herself
//        near-infinite mass and collapse into a black hole. She becomes the
//        singularity: everything is dragged in, then crushed in the implosion.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
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
  { id: 'mass', name: 'Virtual Mass', desc: '+8% melee damage and heavier knockback per rank.', max: 3 },
  { id: 'star_shot', name: 'Heavy Star', desc: 'Star Shot craters are bigger and hit harder.', max: 3 },
  { id: 'bonbaye', name: 'Bonbaye', desc: 'The meteor charge reaches further and its landing hits harder.', max: 3 },
  { id: 'garuda', name: 'Garuda', desc: 'Garuda stays longer and slams more often.', max: 2 },
  { id: 'lash', name: 'Garuda Lash', desc: 'Garuda Lash sweeps wider and hits harder.', max: 3, req: 'garuda' },
  { id: 'black_hole', name: 'Singularity', desc: 'Black Hole (ultimate) pulls from further away and implodes harder.', max: 3, req: 'star_shot' },
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
    this.slots = {
      ranged: this.ability({ name: 'Star Shot', icon: '⭐', cd: 1.3, ce: 0, use: () => this.starShot() }),
      t1: this.ability({ name: 'Bonbaye', icon: '☄️', cd: 6, ce: 12, use: () => this.bonbaye() }),
      t2: this.ability({ name: 'Garuda', icon: '🐦‍⬛', cd: 16, ce: 18, use: () => this.summonGaruda() }),
      t3: this.ability({ name: 'Garuda Lash', icon: '🪶', cd: 11, ce: 22, use: () => this.garudaLash() }),
    };
    this.ultimate = { name: 'Star Rage: Black Hole', icon: '🕳️', use: () => this.blackHole() };
    this.garuda = null; this.bh = null;
  }
  dispose() { super.dispose(); this.dismissGaruda(); this.endBlackHole(); if (this.rod) this.p.rig.handR.remove(this.rod); }
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
    g.combat.aoe(c, R, dmg, p, { knock, stagger: 0.5, falloff: true });
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
        g.combat.damageEnemy(e, 24 + rk * 8, p, { knock: tmp2.clone(), stagger: 0.7 });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
        g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.6), dir, { color: STAR, big: true });
        g.hitStop(0.03); g.audio?.impact(1.2);
      }
      if (t < dur) return true;
      p.action = null;
      const c = p.pos.clone();
      g.combat.aoe(c, 3.4, 32 + rk * 12, p, { knock: 13, stagger: 0.8 });
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
    const G = this.garuda = { mesh, light: g.lights.attach(mesh, VOID, 3, 6, { offsetY: 0, priority: 2 }), life: 10 + rk * 4, ang: 0, cd: 0.6, dive: null };
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
          g.combat.aoe(c, 2.2, 22 + rk * 8, p, { knock: 11, stagger: 0.6, blocks: false });
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
        const R = 5 + rk * 0.6, dmg = (38 + rk * 14) * (held ? 1.3 : 1);
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
}
registerKit('yuki', YukiKit, YUKI_SKILLS);
