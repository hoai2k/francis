// Allied summons (Megumi's shikigami, the Cursed Corpse doll): blocky
// creature models with simple AI — follow the summoner, pick the nearest
// curse, attack (melee bite, dive, tongue pull, ranged) and despawn.
import * as THREE from 'three/webgpu';
import { moveEntity, groundAhead } from '../physics.js';
import { damp, dampAngle, angleDiff } from '../util.js';
import { FLASH_MATERIAL } from './character.js';

const tmp = new THREE.Vector3();
const mats = new Map();
const M = (hex, e = 0) => { const k = hex + ':' + e; if (!mats.has(k)) mats.set(k, new THREE.MeshStandardNodeMaterial({ color: hex, roughness: 0.7, emissive: e ? hex : 0, emissiveIntensity: e })); return mats.get(k); };

function box(parent, w, h, d, x, y, z, mat, list) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); list.push(m); m.userData.baseMat = mat; return m; }

// Quadruped (dog / panda-ish) and bird / toad builders return { root, parts, meshes }
const BUILD = {
  dog(color) {
    const root = new THREE.Group(), meshes = [];
    const body = new THREE.Group(); body.position.y = 0.75; root.add(body);
    const c = M(color), dark = M(0x0a0a10), eye = M(0xffffff, 3);
    box(body, 0.55, 0.5, 1.2, 0, 0, 0, c, meshes);
    const head = new THREE.Group(); head.position.set(0, 0.25, 0.7); body.add(head);
    box(head, 0.5, 0.45, 0.5, 0, 0, 0, c, meshes); box(head, 0.3, 0.25, 0.35, 0, -0.08, 0.35, dark, meshes);
    box(head, 0.12, 0.25, 0.1, -0.16, 0.3, -0.05, c, meshes); box(head, 0.12, 0.25, 0.1, 0.16, 0.3, -0.05, c, meshes);
    box(head, 0.08, 0.06, 0.02, -0.13, 0.08, 0.26, eye, meshes); box(head, 0.08, 0.06, 0.02, 0.13, 0.08, 0.26, eye, meshes);
    const legs = [];
    for (const [x, z] of [[-0.18, 0.4], [0.18, 0.4], [-0.18, -0.4], [0.18, -0.4]]) { const g = new THREE.Group(); g.position.set(x, -0.2, z); body.add(g); box(g, 0.16, 0.55, 0.16, 0, -0.27, 0, c, meshes); legs.push(g); }
    const tail = new THREE.Group(); tail.position.set(0, 0.15, -0.6); body.add(tail); box(tail, 0.12, 0.12, 0.5, 0, 0, -0.25, c, meshes);
    return { root, body, head, legs, tail, meshes };
  },
  bird(color) {
    const root = new THREE.Group(), meshes = [];
    const body = new THREE.Group(); body.position.y = 2.6; root.add(body);
    const c = M(color), white = M(0xe8e8f0), eye = M(0xffe04a, 3);
    box(body, 0.5, 0.45, 0.9, 0, 0, 0, c, meshes);
    const head = new THREE.Group(); head.position.set(0, 0.2, 0.55); body.add(head);
    box(head, 0.4, 0.4, 0.4, 0, 0, 0, white, meshes); box(head, 0.12, 0.12, 0.3, 0, -0.05, 0.3, M(0xd8a030), meshes);
    box(head, 0.06, 0.06, 0.02, -0.12, 0.05, 0.21, eye, meshes); box(head, 0.06, 0.06, 0.02, 0.12, 0.05, 0.21, eye, meshes);
    const wings = [];
    for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * 0.25, 0.1, 0); body.add(g); box(g, 1.4, 0.06, 0.6, s * 0.7, 0, 0, c, meshes); wings.push(g); }
    return { root, body, head, wings, legs: [], meshes, flying: true };
  },
  toad(color) {
    const root = new THREE.Group(), meshes = [];
    const body = new THREE.Group(); body.position.y = 0.55; root.add(body);
    const c = M(color), belly = M(0xc8c0a0), eye = M(0xffe04a, 2.5);
    box(body, 1.2, 0.8, 1.1, 0, 0, 0, c, meshes); box(body, 1.0, 0.3, 0.9, 0, -0.3, 0.1, belly, meshes);
    box(body, 0.3, 0.3, 0.3, -0.35, 0.5, 0.35, c, meshes); box(body, 0.3, 0.3, 0.3, 0.35, 0.5, 0.35, c, meshes);
    box(body, 0.12, 0.12, 0.05, -0.35, 0.55, 0.52, eye, meshes); box(body, 0.12, 0.12, 0.05, 0.35, 0.55, 0.52, eye, meshes);
    const legs = [];
    for (const [x, z] of [[-0.55, 0.3], [0.55, 0.3], [-0.6, -0.35], [0.6, -0.35]]) { const g = new THREE.Group(); g.position.set(x, -0.3, z); body.add(g); box(g, 0.3, 0.3, 0.45, 0, -0.1, 0, c, meshes); legs.push(g); }
    const tongue = box(body, 0.15, 0.08, 1, 0, 0, 0.9, M(0xff5a8a, 0.5), meshes); tongue.visible = false;
    return { root, body, head: body, legs, meshes, tongue };
  },
  panda() {
    const root = new THREE.Group(), meshes = [];
    const body = new THREE.Group(); body.position.y = 1.1; root.add(body);
    const w = M(0xf0f0f0), k = M(0x151518), eye = M(0xffffff, 1);
    box(body, 1.0, 1.1, 0.7, 0, 0, 0, w, meshes); box(body, 1.02, 0.4, 0.72, 0, 0.35, 0, k, meshes);
    const head = new THREE.Group(); head.position.set(0, 0.85, 0.05); body.add(head);
    box(head, 0.75, 0.65, 0.65, 0, 0, 0, w, meshes); box(head, 0.2, 0.2, 0.05, -0.18, 0.05, 0.33, k, meshes); box(head, 0.2, 0.2, 0.05, 0.18, 0.05, 0.33, k, meshes);
    box(head, 0.2, 0.2, 0.15, -0.3, 0.38, 0, k, meshes); box(head, 0.2, 0.2, 0.15, 0.3, 0.38, 0, k, meshes);
    const legs = [];
    for (const [x, y, z] of [[-0.6, 0.2, 0.1], [0.6, 0.2, 0.1], [-0.25, -0.55, 0], [0.25, -0.55, 0]]) { const g = new THREE.Group(); g.position.set(x, y, z); body.add(g); box(g, 0.32, 0.6, 0.32, 0, -0.3, 0, k, meshes); legs.push(g); }
    return { root, body, head, legs, meshes };
  },
};

export class Ally {
  // kind: dog | nue | toad | corpse
  constructor(game, owner, kind, pos, opts = {}) {
    this.game = game; this.owner = owner; this.kind = kind;
    const spec = {
      dog: { model: () => BUILD.dog(opts.color ?? 0xf0f0f4), hp: 80, speed: 8.2, dmg: 14, range: 1.6, cd: 0.8, radius: 0.45, height: 1.2 },
      nue: { model: () => BUILD.bird(0x2a2a3a), hp: 60, speed: 9, dmg: 22, range: 2.4, cd: 2.2, radius: 0.5, height: 3.2, fly: true },
      toad: { model: () => BUILD.toad(0x4a6a3a), hp: 120, speed: 3.5, dmg: 10, range: 8, cd: 2.6, radius: 0.7, height: 1.2 },
      corpse: { model: () => BUILD.panda(), hp: 200, speed: 5.5, dmg: 24, range: 1.9, cd: 1.0, radius: 0.6, height: 2.2 },
    }[kind];
    this.S = spec;
    this.parts = spec.model();
    this.object = this.parts.root; this.meshes = this.parts.meshes;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = spec.radius; this.height = spec.height;
    this.maxHp = spec.hp * (opts.hpMult ?? 1); this.hp = this.maxHp; this.dmg = spec.dmg * (opts.dmgMult ?? 1);
    this.life = opts.life ?? Infinity; this.cd = 0.5; this.t = 0; this.facing = owner.facing;
    this.dead = false; this.isAlly = true; this.grounded = false; this.coyote = 0; this.flashT = 0;
    this.noGravity = !!spec.fly; this.visY = pos.y;
    this.object.position.copy(pos);
    game.scene.add(this.object);
    game.fx.summonCircle(pos, 0x6a6aff);
    game.particles.burst(pos.clone().setY(pos.y + 0.5), { count: 20, color: 0x0a0a14, additive: false, speed: 3, up: 1, life: 0.7, size: 0.5, sizeEnd: 1.8 });
  }
  takeDamage(amount, src, o = {}) {
    if (this.dead) return 0;
    this.hp -= amount; this.flashT = 0.08;
    if (o.knock) this.knock.addScaledVector(o.knock, 0.5);
    if (this.hp <= 0) this.despawn();
    return amount;
  }
  despawn() {
    if (this.dead) return;
    this.dead = true;
    const g = this.game;
    g.particles.burst(this.pos.clone().setY(this.pos.y + 0.6), { count: 24, color: 0x06060c, additive: false, speed: 3, life: 0.8, size: 0.6, sizeEnd: 2 });
    g.scene.remove(this.object);
  }
  dispose() { this.despawn(); }
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
    const S = this.S, e = this.target();
    let want = new THREE.Vector3();
    if (e) {
      tmp.subVectors(e.pos, this.pos).setY(0); const d = tmp.length();
      this.facing = dampAngle(this.facing, Math.atan2(tmp.x, tmp.z), 10, dt);
      if (d > S.range * 0.8) want.copy(tmp.normalize().multiplyScalar(S.speed));
      if (d < S.range + e.radius && this.cd <= 0) this.attack(e);
    } else {
      // follow owner
      tmp.subVectors(this.owner.pos, this.pos).setY(0); const d = tmp.length();
      if (d > 3) { want.copy(tmp.normalize().multiplyScalar(S.speed * Math.min(1, d / 6))); this.facing = dampAngle(this.facing, Math.atan2(tmp.x, tmp.z), 6, dt); }
      if (d > 22) { this.pos.copy(this.owner.pos); }
    }
    if (!S.fly && want.lengthSq() > 0.01 && !groundAhead(g.world, this.pos.x + want.x * 0.12, this.pos.y, this.pos.z + want.z * 0.12, 2.5)) want.set(0, 0, 0);
    this.vel.x = damp(this.vel.x, want.x + this.knock.x, 10, dt); this.vel.z = damp(this.vel.z, want.z + this.knock.z, 10, dt);
    this.knock.multiplyScalar(Math.exp(-dt * 6));
    if (S.fly) {
      const gy = g.world.groundBelow(this.pos.x, this.pos.z, this.pos.y + 3);
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      const hover = (isFinite(gy) ? gy : this.owner.pos.y) + (this.dive > 0 ? 0.2 : 0);
      this.pos.y = damp(this.pos.y, hover, this.dive > 0 ? 12 : 3, dt);
      this.dive = Math.max(0, (this.dive ?? 0) - dt);
    } else moveEntity(this, g.world, dt);
    if (this.pos.y < -8) this.pos.copy(this.owner.pos);
    // animate
    const sp = Math.hypot(this.vel.x, this.vel.z) / S.speed;
    const P = this.parts;
    const cyc = this.t * 14;
    P.legs.forEach((l, i) => { l.rotation.x = Math.sin(cyc + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.7 * sp; });
    if (P.wings) P.wings.forEach((w, i) => { w.rotation.z = Math.sin(this.t * 10) * 0.6 * (i ? -1 : 1); });
    if (P.tail) P.tail.rotation.y = Math.sin(this.t * 12) * 0.5;
    if (this.kind === 'toad') P.body.position.y = 0.55 + Math.abs(Math.sin(this.t * 6)) * 0.3 * sp;
    this.object.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.object.rotation.y = this.facing;
    for (const m of this.meshes) m.material = this.flashT > 0 ? FLASH_MATERIAL : m.userData.baseMat;
    // faint shadow smoke so they read as shikigami
    if (this.kind !== 'corpse' && Math.random() < 0.3) g.particles.smoke.emit(this.pos.x + (Math.random() - 0.5) * 0.6, this.pos.y + 0.2, this.pos.z + (Math.random() - 0.5) * 0.6, 0, 0.4, 0, 0.8, 0.02, 0.02, 0.04, 0.35, 0, 1, 2, 0);
    return true;
  }
  attack(e) {
    const g = this.game, S = this.S;
    this.cd = S.cd;
    const own = this.owner;
    const mult = own.kit?.rank?.('shikigami') ? 1 + own.kit.rank('shikigami') * 0.2 : 1;
    if (this.kind === 'toad') {
      // tongue: pull the curse in and stun it
      const P = this.parts; P.tongue.visible = true; P.tongue.scale.z = Math.min(8, e.pos.distanceTo(this.pos)); P.tongue.position.z = 0.5 + P.tongue.scale.z / 2;
      setTimeout(() => { P.tongue.visible = false; }, 250);
      e.knock?.add(tmp.subVectors(this.pos, e.pos).setY(0).normalize().multiplyScalar(14));
      e.state = 'stagger'; e.stateT = 0; e.stagger = 1.0;
      g.combat.damageEnemy(e, this.dmg * mult, own, { stagger: 0.8, ceGain: 1 });
      g.audio?.tone({ freq: 400, to: 150, dur: 0.2, gain: 0.08, type: 'triangle' });
      return;
    }
    if (this.kind === 'nue') {
      this.dive = 0.4;
      this.pos.x = e.pos.x - Math.sin(this.facing) * 0.5; this.pos.z = e.pos.z - Math.cos(this.facing) * 0.5;
      g.combat.damageEnemy(e, this.dmg * mult, own, { knock: tmp.set(0, 0, 0), stagger: 0.6, ceGain: 1 });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: 0x9ad8ff, big: true });
      g.bolts.spawn(e.pos.clone().setY(e.pos.y + 2.5), { count: 3, length: 2.5, life: 0.25 });
      g.lights.flash(e.pos, 0x9ad8ff, 8, 8, 0.2);
      g.audio?.impact(1.2);
      return;
    }
    // melee bite / smash
    const dir = tmp.subVectors(e.pos, this.pos).setY(0).normalize();
    this.knock.copy(dir).multiplyScalar(5);
    g.combat.damageEnemy(e, this.dmg * mult, own, { knock: dir.clone().multiplyScalar(this.kind === 'corpse' ? 8 : 3), stagger: 0.4, ceGain: 1 });
    g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 0.8), dir, { color: this.kind === 'corpse' ? 0xffffff : 0xb0b0ff });
    g.audio?.impact(0.8);
  }
}
