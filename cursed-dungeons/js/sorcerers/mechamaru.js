// Kokichi Muta (Ultimate Mechamaru)-style kit — Puppet Manipulation.
//   LMB  armoured puppet combo with a rotary spin.
//   RMB  Ultra Cannon: a short charge, then a cursed-energy beam from the palm.
//   1    Sword Drill: the arm becomes a spinning drill-blade and he rockets
//        forward, grinding through curses.
//   2    Bastion: a barrier dome that eats projectiles and blunts damage.
//   3    Absolute Mode: mini-drones deploy and fire on curses, and the Ultra
//        Cannon switches to Maximum Output.
//   F    Domain: Puppet Manipulation: Remote Fortress (invented — Mechamaru
//        never expands a domain): puppet turrets rise round the arena and
//        rake curses with cannon fire.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { beamMaterial, orbMaterial } from '../gfx/orbs.js';

const CYAN = 0x40e0ff, WHITE = 0xe0f8ff, STEEL = 0x9aa2ae;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);

registerSorcerer('mechamaru', {
  name: 'Mechamaru', technique: 'Puppet Manipulation', rarity: 'uncommon', title: 'Ultimate Mechamaru', color: '#40e0ff', domain: 'Puppet Manipulation: Remote Fortress',
  desc: 'A remote-piloted battle puppet: palm-mounted Ultra Cannon, Sword Drill, a Bastion barrier and Absolute Mode drones.',
});

registerLook('mechamaru', {
  paint: { skinTone: 0xa8aeb8, hair: 0x7a828e, top: 0xc8ced6, topTrim: 0x3a404a, buttons: 0x3a404a, collar: 0x7a828e, sleeve: 0x9aa2ae, pants: 0x6a727e, shoes: 0x2a2e36, eye: 0x40e8ff, eyeWhite: 0x40e8ff, brow: 0x5a626e, fringe: 1, hairSide: 2, hairBack: 3 },
  hair: () => [],
  hairColor: STEEL, accent: CYAN, emit: 1, scale: 1.3,
  cape: null,
  paintExtra(S) {
    // visor band wrapping the head, mouth grille, panel lines and chest core
    S.rect(8, 11, 8, 2, 0x40e8ff, 0.02); S.rect(0, 11, 8, 1, 0x2a6a80, 0.02); S.rect(16, 11, 8, 1, 0x2a6a80, 0.02);
    for (let x = 10; x < 14; x++) S.px(x, 14, x % 2 ? 0x2a2e36 : 0x5a626e);
    S.rect(20, 25, 8, 1, 0x5a626e, 0.02); S.rect(32, 25, 8, 1, 0x5a626e, 0.02);
    S.rect(23, 21, 2, 2, 0x60f0ff, 0.02);
    for (const [u, v] of [[40, 16], [32, 48]]) S.rect(u, v + 4 + 9, 16, 3, 0x6a727e, 0.05);   // metal hands
  },
  props(rig, K) {
    const steel = K.mat(STEEL, { metalness: 0.85, roughness: 0.3 }), dark = K.mat(0x2a2e36, { metalness: 0.7, roughness: 0.4 }), glow = K.mat(CYAN, { emissive: 3 });
    K.box(rig.head, 9.4, 1.6, 0.6, glow, 0, 4.6, 4.8);                 // visor
    K.box(rig.head, 1, 4, 1.6, steel, -4.9, 7, -0.5, 0, 0, 0.2);        // head fins
    K.box(rig.head, 1, 4, 1.6, steel, 4.9, 7, -0.5, 0, 0, -0.2);
    K.box(rig.armR, 5.4, 3, 5.4, steel, 0, 1.2, 0);                     // shoulder armour
    K.box(rig.armL, 5.4, 3, 5.4, steel, 0, 1.2, 0);
    K.box(rig.handR, 2.6, 0.6, 2.6, glow, 0, -2.2, 0);                  // palm cannon emitter
    K.box(rig.torso, 6, 6, 2.4, dark, 0, 7.5, -3.2);                    // thruster pack
    K.box(rig.torso, 1.6, 1.4, 1.6, glow, -1.8, 4.2, -3.6);
    K.box(rig.torso, 1.6, 1.4, 1.6, glow, 1.8, 4.2, -3.6);
  },
});

registerDomainEnv('puppet_fortress', {
  skyTop: 0x02060a, skyHorizon: 0x0a3a4a, fog: 0x041014, fogDensity: 0.02, hemiSky: 0x8ae8ff, hemiGround: 0x060a0e, hemiI: 1.0, sun: 0xb0f0ff, sunI: 0.8,
  grade: { tint: [0.9, 1.02, 1.1], lift: [0.0, 0.015, 0.025], sat: 0.9, contrast: 1.2, vignette: 0.5 }, floor: B.metal_grate,
});

export const MECHAMARU_SKILLS = [
  { id: 'cannon', name: 'Ultra Cannon', desc: 'Cannon beams hit harder and reach further.', max: 3 },
  { id: 'overcharge', name: 'Overcharge', desc: 'Ultra Cannon recharges faster.', max: 2, req: 'cannon' },
  { id: 'drill', name: 'Sword Drill', desc: 'Longer drilling charge and a harder final thrust.', max: 3 },
  { id: 'bastion', name: 'Bastion', desc: 'Bastion lasts longer; at rank 2 it fires projectiles back.', max: 2 },
  { id: 'drones', name: 'Absolute Mode', desc: '+1 drone per rank and longer Absolute Mode.', max: 2 },
  { id: 'alloy', name: 'Puppet Alloy', desc: '+4% damage reduction per rank.', max: 3 },
];

class MechamaruKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 13, range: 2.7, arc: 1.1, lunge: 6, knock: 4, stop: 0.05, shake: 0.16, trail: CYAN, sparkColor: WHITE },
      { style: 'swingL', dur: 0.34, windup: 0.3, strike: 0.52, dmg: 13, range: 2.8, arc: 1.2, lunge: 6, knock: 4, stop: 0.05, shake: 0.16, trail: CYAN, sparkColor: WHITE },
      { style: 'spin', dur: 0.45, windup: 0.25, strike: 0.55, dmg: 18, range: 3.1, arc: Math.PI, lunge: 3, knock: 7, stop: 0.06, shake: 0.24, trail: WHITE },
      { style: 'slam', dur: 0.6, windup: 0.45, strike: 0.62, dmg: 28, range: 3.4, arc: Math.PI, lunge: 3, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: CYAN, stagger: 0.6, trail: CYAN },
    ];
    this.p.stats.armor = (this.p.stats.armor ?? 0) + r('alloy') * 0.04;
    this.slots = {
      ranged: this.ability({ name: 'Ultra Cannon', icon: '🔆', cd: 1.8 - r('overcharge') * 0.35, ce: 0, use: () => this.cannon() }),
      t1: this.ability({ name: 'Sword Drill', icon: '🌀', cd: 7, ce: 12, use: () => this.swordDrill() }),
      t2: this.ability({ name: 'Bastion', icon: '🛡️', cd: 13, ce: 14, use: () => this.bastion() }),
      t3: this.ability({ name: 'Absolute Mode', icon: '🤖', cd: 28, ce: 40, use: () => this.absolute() }),
    };
    this.domain = {
      name: 'Puppet Manipulation: Remote Fortress', icon: '🏯', key: 'puppet_fortress', type: 3, color: CYAN, sound: 'void', flash: 0xc0f8ff,
      duration: 8, radius: 22,
      onStart: (g, d) => this.raiseTurrets(g, d),
      onTick: (g, d, dt) => {
        for (const T of this.turrets ?? []) {
          T.cd -= dt;
          T.mesh.rotation.y += dt * 0.6;
          if (T.cd > 0) continue;
          T.cd = 1.1 + Math.random() * 0.4;
          const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
          if (!list.length) continue;
          const e = list[Math.floor(Math.random() * list.length)];
          const from = T.mesh.position.clone().setY(T.mesh.position.y + 2.2);
          const to = tmp.copy(e.pos).setY(e.pos.y + e.height * 0.5);
          const dir = to.clone().sub(from); const L = dir.length(); dir.normalize();
          g.fx.slashLine(from, dir, L, CYAN, 0.45, 0.2); g.fx.slashLine(from, dir, L, WHITE, 0.15, 0.12);
          g.combat.damageEnemy(e, 18, this.p, { stagger: 0.4, ceGain: 0, unblockable: true, knock: dir.clone().setY(0).setLength(4) });
          g.fx.hitSpark(to, dir, { color: CYAN });
          g.audio?.tone({ freq: 900, to: 300, dur: 0.15, gain: 0.06, type: 'sawtooth', filter: 3000 });
        }
      },
      onEnd: (g) => { for (const T of this.turrets ?? []) { g.scene.remove(T.mesh); g.fx.poof(T.mesh.position); } this.turrets = null; },
    };
    this.beamMats = [beamMaterial(CYAN), beamMaterial(WHITE, true)];
    this.drones = []; this.absT = 0; this.bastionT = 0;
    this.dome = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 3), orbMaterial(CYAN, { power: 2.2, intensity: 1.6 }));
    this.dome.visible = false; this.dome.renderOrder = 22;
    this.own(this.dome);
  }
  dispose() {
    super.dispose();
    for (const d of this.drones) this.game.scene.remove(d.mesh);
    for (const T of this.turrets ?? []) this.game.scene.remove(T.mesh);
    if (this.drill) this.p.rig.handR.remove(this.drill);
    this.drones = [];
  }
  // ------------------------------------------------------------- Ultra Cannon
  beam(from, dir, L, W, dmg, { pierceWalls = false, knock = 6 } = {}) {
    const g = this.game, p = this.p;
    if (!pierceWalls) for (let s = 0.6; s < L; s += 0.4) if (g.world.solidAt(from.x + dir.x * s, from.y + dir.y * s, from.z + dir.z * s)) { L = s; break; }
    const grp = new THREE.Group();
    const outer = new THREE.Mesh(UNIT_CYL, this.beamMats[0]), inner = new THREE.Mesh(UNIT_CYL, this.beamMats[1]);
    outer.scale.set(W, L, W); inner.scale.set(W * 0.45, L, W * 0.45);
    for (const m of [outer, inner]) { m.rotation.x = Math.PI / 2; m.position.z = L / 2; m.renderOrder = 24; }
    grp.add(outer, inner);
    grp.position.copy(from); grp.lookAt(tmp.copy(from).add(dir));
    g.scene.add(grp);
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from); tmp.y += e.height * 0.5;
      const along = tmp.dot(dir);
      if (along < -0.5 || along > L) continue;
      if (tmp.addScaledVector(dir, -along).length() > W + e.radius + 0.3) continue;
      g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().setY(0).setLength(knock), stagger: 0.5 });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.5), dir, { color: CYAN });
    }
    const end = from.clone().addScaledVector(dir, L);
    g.combat.hitBlocks(end, dir, W + 0.6, Math.PI, dmg * 2, p);
    g.particles.burst(end, { count: 14, color: CYAN, speed: 6, life: 0.3, size: 0.12, drag: 3, shape: 1, intensity: 3 });
    g.lights.flash(from.clone().addScaledVector(dir, Math.min(L, 6)), CYAN, 10 * W, 10, 0.3);
    let t = 0; const dur = 0.3 + W * 0.15;
    this.beamMats.forEach((m) => { m.userData.alpha.value = 1; });
    g.addUpdater((dt) => {
      t += dt;
      const a = Math.max(0, 1 - t / dur), wob = 1 + Math.sin(t * 70) * 0.08;
      outer.scale.set(W * wob * (0.5 + a * 0.5), L, W * wob * (0.5 + a * 0.5));
      this.beamMats.forEach((m) => { m.userData.alpha.value = a; });
      if (t < dur) return true;
      g.scene.remove(grp); return false;
    });
    return L;
  }
  cannon() {
    const g = this.game, p = this.p, rk = this.rank('cannon');
    const max = this.absT > 0;
    const charge = max ? 0.45 : 0.22;
    p.action = { type: 'cast', dur: charge + 0.15, elapsed: 0, t: 0, moveScale: max ? 0.1 : 0.3, faceAim: true, lock: true };
    g.audio?.charge(charge, max ? 0.7 : 1.4);
    if (max) { g.toast?.('Maximum Output: Ultra Cannon'); g.fx.dimTarget = 0.35; }
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      const h = this.handPos();
      g.particles.burst(h, { count: max ? 3 : 1, color: CYAN, speed: -3, life: 0.25, size: 0.15, jitter: max ? 1.6 : 0.8, shape: 1 });
      if (t < charge) return true;
      const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.aimPoint, 30) : null;
      const dir = target ? tmp2.copy(target.pos).setY(target.pos.y + target.height * 0.5).sub(h).normalize().clone() : p.aimDir.clone();
      if (max) {
        g.fx.dimTarget = 0;
        this.beam(h, dir, 24 + rk * 3, 1.1, (40 + rk * 12) * 2.5, { pierceWalls: true, knock: 12 });
        g.fx.flash(0xc0f8ff, 0.45, 0.2); g.fx.screenWave(h, 1, 0.45); g.fx.chroma(1);
        g.shake(0.6); g.hitStop(0.07); g.audio?.energy('purple');
      } else {
        this.beam(h, dir, 13 + rk * 2, 0.4, 16 + rk * 6);
        g.shake(0.12);
        g.audio?.tone({ freq: 1200, to: 200, dur: 0.25, gain: 0.12, type: 'sawtooth', filter: 3500 });
        g.audio?.noise({ dur: 0.25, gain: 0.25, type: 'bandpass', freq: 2500, sweep: 600, q: 2 });
      }
      return false;
    });
  }
  // ------------------------------------------------------------- Sword Drill
  swordDrill() {
    const g = this.game, p = this.p, rk = this.rank('drill');
    const dir = p.aimDir.clone().setY(0).normalize();
    const dur = 0.45 + rk * 0.08, speed = 18;
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'cast', dur: dur + 0.1, elapsed: 0, t: 0, lock: true, cancelable: false, faceAim: false, root: dir.clone().multiplyScalar(speed) };
    p.vel.x = dir.x * speed; p.vel.z = dir.z * speed;
    p.iframes = Math.max(p.iframes, dur);
    // the forearm reforms into a drill-blade
    const drill = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.3, 8).rotateX(Math.PI).translate(0, -0.65, 0),
      new THREE.MeshStandardNodeMaterial({ color: 0xc8d0da, metalness: 0.9, roughness: 0.25, emissive: CYAN, emissiveIntensity: 0.4 }));
    drill.position.y = -0.1; p.rig.handR.add(drill); this.drill = drill;
    g.audio?.whoosh(1.3);
    const caught = new Set();
    let t = 0, tick = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      drill.rotation.y += dt * 40;
      const tip = this.handPos();
      g.particles.burst(tip, { count: 3, color: Math.random() < 0.5 ? CYAN : 0xffe0a0, speed: 6, life: 0.2, size: 0.08, shape: 1, intensity: 3 });
      if (tick <= 0) {
        tick = 0.08;
        for (const e of g.combat.query(p.pos, dir, 2.2, 0.8)) {
          caught.add(e);
          g.combat.damageEnemy(e, 6 + rk * 2, p, { knock: dir.clone().multiplyScalar(speed * 0.9), stagger: 0.3, ceGain: 0.6 });
        }
        g.audio?.tone({ freq: 300 + Math.random() * 80, dur: 0.06, gain: 0.05, type: 'square', filter: 2000 });
      }
      if (t < dur) return true;
      p.action = null;
      p.rig.handR.remove(drill); this.drill = null;
      // final thrust
      for (const e of caught) {
        if (e.dead) continue;
        g.combat.damageEnemy(e, 26 + rk * 9, p, { knock: dir.clone().multiplyScalar(12), stagger: 0.8 });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
      }
      const c = p.pos.clone().addScaledVector(dir, 1.5);
      g.fx.explosion(c, CYAN, 1.8);
      g.combat.hitBlocks(c, dir, 2, 1, 60, p);
      g.shake(0.35); g.hitStop(0.06); g.audio?.impact(1.6);
      return false;
    });
  }
  // ------------------------------------------------------------- Bastion
  bastion() {
    const g = this.game, p = this.p;
    this.bastionDur = 4 + this.rank('bastion') * 1.2;
    this.bastionT = this.bastionDur;
    p.action = { type: 'sign', dur: 0.35, elapsed: 0, t: 0, moveScale: 0.3 };
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: CYAN, r0: 0.4, r1: 2.6, dur: 0.35, thick: 0.15 });
    g.fx.flash(0x80e8ff, 0.12, 0.12);
    g.audio?.energy('infinity');
  }
  onIncoming(amount) {
    if (this.bastionT <= 0) return amount;
    this.dome.material.userData.inten.value = 4;
    return amount * 0.25;
  }
  // ------------------------------------------------------------- Absolute Mode
  absolute() {
    const g = this.game, p = this.p, rk = this.rank('drones');
    for (const d of this.drones) g.scene.remove(d.mesh);
    this.drones = [];
    this.absT = 12 + rk * 3;
    const n = 3 + rk;
    const body = new THREE.MeshStandardNodeMaterial({ color: 0xb8c0ca, metalness: 0.8, roughness: 0.3 });
    const eye = new THREE.MeshStandardNodeMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 3 });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.34), body); b.castShadow = true;
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), eye); e.position.z = 0.18;
      const wl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.1), body), wr = wl.clone(); wl.position.x = -0.3; wr.position.x = 0.3;
      m.add(b, e, wl, wr);
      m.position.copy(p.pos).setY(p.pos.y + 1.2);
      g.scene.add(m);
      this.drones.push({ mesh: m, a: (i / n) * Math.PI * 2, cd: 0.3 + i * 0.15 });
    }
    p.action = { type: 'raise', dur: 0.5, elapsed: 0, t: 0, moveScale: 0.2 };
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 30, color: CYAN, speed: 8, life: 0.4, size: 0.12, shape: 1, drag: 3 });
    g.fx.shockwave(p.pos, CYAN, 4);
    g.toast?.('Absolute Mode');
    g.audio?.energy('summon'); g.audio?.charge(0.5, 1.5);
  }
  raiseTurrets(g, d) {
    const metal = new THREE.MeshStandardNodeMaterial({ color: 0x8a929e, metalness: 0.85, roughness: 0.3 });
    const glow = new THREE.MeshStandardNodeMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 3 });
    this.turrets = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, R = d.radius * 0.6;
      const grp = new THREE.Group();
      const b = (w, h, dd, x, y, z, m) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); mm.position.set(x, y, z); mm.castShadow = true; grp.add(mm); };
      b(1, 1.8, 1, 0, 0.9, 0, metal); b(1.4, 0.6, 1.4, 0, 2, 0, metal); b(0.9, 0.3, 0.2, 0, 2.05, 0.71, glow); b(0.25, 0.25, 1.2, 0, 2.2, 0.8, metal);
      const x = d.center.x + Math.cos(a) * R, z = d.center.z + Math.sin(a) * R;
      const gy = g.world.groundBelow(x, z, d.center.y + 4);
      grp.position.set(x, isFinite(gy) ? gy : d.center.y, z);
      g.scene.add(grp);
      g.fx.summonCircle(grp.position, CYAN);
      this.turrets.push({ mesh: grp, cd: 0.8 + i * 0.2 });
    }
  }
  tick(dt) {
    const g = this.game, p = this.p;
    // Bastion dome
    if (this.bastionT > 0) {
      this.bastionT -= dt;
      const D = this.dome; D.visible = true;
      D.position.set(p.pos.x, p.pos.y + 0.9, p.pos.z);
      const u = D.material.userData;
      u.alpha.value = Math.min(1, this.bastionT * 3, (this.bastionDur - this.bastionT) * 6 + 0.2);
      u.inten.value = Math.max(1.6, u.inten.value - dt * 8);
      for (const pr of [...g.projectiles.list]) {
        if (pr.team !== 'enemy' || pr.pos.distanceTo(D.position) > 2.4) continue;
        g.fx.hitSpark(pr.pos, null, { color: CYAN }); u.inten.value = 4;
        if (this.rank('bastion') >= 2) { pr.team = 'player'; pr.vel.multiplyScalar(-1.3); const dmg = pr.dmg ?? 10; pr.onHit = (e) => g.combat.damageEnemy(e, dmg * 2, p, { knock: pr.vel.clone().setLength(5) }); pr.hit.clear(); }
        else g.projectiles.kill(pr, 'blocked');
      }
      for (const e of g.enemies) {
        if (e.dead || e.isDummy) continue;
        tmp.subVectors(e.pos, p.pos).setY(0); const dd = tmp.length();
        if (dd < 2.3 + e.radius) e.knock.addScaledVector(tmp.normalize(), (2.3 + e.radius - dd) * 60 * dt);
      }
      if (this.bastionT <= 0) D.visible = false;
    }
    // Absolute Mode drones
    if (this.absT > 0) {
      this.absT -= dt;
      for (const d of this.drones) {
        d.a += dt * 1.8; d.cd -= dt;
        const m = d.mesh;
        tmp.set(p.pos.x + Math.cos(d.a) * 2.2, p.pos.y + 2.5 + Math.sin(d.a * 3) * 0.15, p.pos.z + Math.sin(d.a) * 2.2);
        m.position.lerp(tmp, Math.min(1, dt * 10));
        const e = g.domainSys?.sureHit(p) ? g.nearestEnemy(m.position, 30) : g.nearestEnemy(m.position, 12);
        if (e) m.lookAt(tmp2.copy(e.pos).setY(e.pos.y + 1)); else m.rotation.y = -d.a;
        if (e && d.cd <= 0) {
          d.cd = 0.85;
          const to = tmp2.copy(e.pos).setY(e.pos.y + e.height * 0.5);
          const dir = to.clone().sub(m.position); const L = dir.length(); dir.normalize();
          g.fx.slashLine(m.position.clone(), dir, L, CYAN, 0.12, 0.12);
          g.combat.damageEnemy(e, 7 + this.rank('drones') * 2, p, { stagger: 0.15, ceGain: 0.5 });
          g.particles.burst(to, { count: 5, color: CYAN, speed: 4, life: 0.2, size: 0.08, shape: 1 });
          g.audio?.tone({ freq: 1800, to: 900, dur: 0.06, gain: 0.03, type: 'square', filter: 5000 });
        }
      }
      if (this.absT <= 0) { for (const d of this.drones) { g.fx.poof(d.mesh.position.clone().setY(d.mesh.position.y - 0.8)); g.scene.remove(d.mesh); } this.drones = []; }
    }
    // thruster glow
    if (Math.random() < 0.3) {
      const back = tmp.set(-Math.sin(p.facing) * 0.35, 0, -Math.cos(p.facing) * 0.35);
      g.particles.glow.emit(p.pos.x + back.x, p.pos.y + 1.2, p.pos.z + back.z, back.x, -1.2, back.z, 0.3, 0.4, 1.6, 2.2, 0.1, 0, 2, 0.1, 0);
    }
  }
}
registerKit('mechamaru', MechamaruKit, MECHAMARU_SKILLS);
