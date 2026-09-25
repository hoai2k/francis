// Special Grade bosses. Each boss runs attack patterns as coroutines
// (generator functions that yield wait times), picks patterns by phase, and
// telegraphs every big hit with red ground markers.
//   • Volcano Curse (Jogo-style): meteors, flame cone, lava rings, Maximum Meteor.
//   • Grove Curse (Hanami-style): root lines, seed bombs, flower fields, charges, buds.
//   • Patchwork Curse (Mahito-style): blade arms, dashes, transfigured minions, distorted form.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX, FLASH_MATERIAL } from './character.js';
import { moveEntity } from '../physics.js';
import { damp, dampAngle, angleDiff } from '../util.js';
import { toast } from '../ui/ui.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const solid = (hex, e = 0) => new THREE.MeshStandardNodeMaterial({ color: hex, roughness: 0.6, emissive: e ? hex : 0, emissiveIntensity: e });

function paintBoss(S, o) {
  S.box(0, 0, 8, 8, 8, o.skin, 0.15); S.box(32, 0, 8, 8, 8, o.skin, 0.1);
  S.box(16, 16, 8, 12, 4, o.body, 0.15); S.box(16, 32, 8, 12, 4, o.body2 ?? o.body, 0.2);
  S.box(40, 16, 4, 12, 4, o.arm ?? o.skin, 0.15); S.box(32, 48, 4, 12, 4, o.arm ?? o.skin, 0.15);
  S.box(40, 32, 4, 12, 4, o.body2 ?? o.body, 0.2); S.box(48, 48, 4, 12, 4, o.body2 ?? o.body, 0.2);
  S.box(0, 16, 4, 12, 4, o.legs, 0.15); S.box(16, 48, 4, 12, 4, o.legs, 0.15);
  o.face?.(S);
}

const BOSSES = {
  jogo: {
    name: 'Volcano Curse', title: 'SPECIAL GRADE · VOLCANO CURSE', hp: 2400, speed: 2.4, dmg: 22, color: 0xff6a1a, domainKey: 'coffin_iron_mountain',
    build() {
      const S = new Skin(501);
      paintBoss(S, { skin: 0xd8d0c0, body: 0x2a2020, body2: 0x3a2a2a, legs: 0x2a2020, arm: 0xd8d0c0, face: (s) => { s.rect(9, 11, 6, 3, 0x111111); s.rect(11, 11, 2, 2, 0xffe04a); s.px(12, 12, 0xffffff); s.rect(10, 15, 4, 1, 0x3a1a0a); } });
      const m = makeCharMaterial(S.texture(), { emitStrength: 3, fill: 0.2 }); m.alphaTest = 0.5;
      const rig = new Rig({ material: m, scale: 2.1, bodyW: 10, bodyD: 6, headS: 9 });
      // volcano head: stacked narrowing blocks with a glowing crater
      const rock = solid(0xc8bca8), lava = solid(0xff6a1a, 4);
      for (let i = 0; i < 3; i++) { const b = rig.mesh(new THREE.BoxGeometry((8 - i * 2) * PX * 1.12, 2 * PX, (8 - i * 2) * PX * 1.12), rock); b.position.y = (9 + i * 2) * PX * 1.12; rig.head.add(b); }
      const crater = rig.mesh(new THREE.BoxGeometry(2.4 * PX, 1 * PX, 2.4 * PX), lava); crater.position.y = 15.2 * PX * 1.12; rig.head.add(crater);
      rig.extras.crater = crater;
      return rig;
    },
    phases: [['meteors', 'flame_cone', 'flame_cone'], ['meteors', 'flame_cone', 'lava_ring', 'insects'], ['maximum_meteor', 'lava_ring', 'meteors', 'flame_cone', 'insects']],
  },
  hanami: {
    name: 'Grove Curse', title: 'SPECIAL GRADE · GROVE CURSE', hp: 2600, speed: 2.8, dmg: 20, color: 0x7aff5a, domainKey: 'resonance',
    build() {
      const S = new Skin(777);
      paintBoss(S, { skin: 0xe8e4d8, body: 0x6a4a2a, body2: 0x3a2a1a, legs: 0x5a3a20, arm: 0x8a6a4a, face: (s) => { s.rect(9, 11, 2, 2, 0x2a1a0a); s.rect(13, 11, 2, 2, 0x2a1a0a); s.px(9, 11, 0x9aff6a); s.px(14, 11, 0x9aff6a); s.rect(8, 8, 8, 2, 0x2a1a0a); } });
      const m = makeCharMaterial(S.texture(), { emitStrength: 2.5, fill: 0.2 }); m.alphaTest = 0.5;
      const rig = new Rig({ material: m, scale: 2.2, bodyW: 8, bodyD: 5, headS: 8, bodyH: 14 });
      const wood = solid(0x5a3a1a), leaf = solid(0x4a9a3a), flower = solid(0xff7ab0, 1.5);
      // branches from the eyes and a shoulder flower
      for (const sx of [-1, 1]) { const br = rig.mesh(new THREE.BoxGeometry(1.2 * PX, 7 * PX, 1.2 * PX).translate(0, 3.5 * PX, 0), wood); br.position.set(sx * 2.5 * PX * 1.12, 5.5 * PX * 1.12, 4 * PX * 1.12); br.rotation.set(-0.6, 0, -sx * 0.5); rig.head.add(br); const lf = rig.mesh(new THREE.BoxGeometry(3 * PX, 2 * PX, 3 * PX), leaf); lf.position.y = 7 * PX; br.add(lf); }
      const fl = rig.mesh(new THREE.BoxGeometry(4 * PX, 4 * PX, 4 * PX), flower); fl.position.set(5 * PX, 12 * PX, 0); rig.torso.add(fl);
      return rig;
    },
    phases: [['roots', 'seeds', 'roots'], ['roots', 'seeds', 'flowers', 'charge'], ['roots', 'charge', 'flowers', 'buds', 'seeds']],
  },
  mahito: {
    name: 'Patchwork Curse', title: 'SPECIAL GRADE · PATCHWORK CURSE', hp: 2300, speed: 4, dmg: 20, color: 0x7ad8ff, domainKey: 'malevolent_shrine',
    build() {
      const S = new Skin(313);
      paintBoss(S, { skin: 0xc8d4dc, body: 0x2a2a3a, body2: 0x9aa8b8, legs: 0x2a2a3a, arm: 0xb8c4cc, face: (s) => { s.rect(8, 8, 8, 3, 0x6a7a9a); s.px(9, 12, 0x88ccff); s.px(10, 12, 0x223344); s.px(13, 12, 0x223344); s.px(14, 12, 0x88ccff); for (let y = 8; y < 16; y++) s.px(11 + (y % 2), y, 0x3a3a4a); s.rect(10, 14, 4, 1, 0x3a2a3a); } });
      const m = makeCharMaterial(S.texture(), { emitStrength: 2, fill: 0.2 }); m.alphaTest = 0.5;
      const hair = solid(0x6a8aa8);
      const rig = new Rig({ material: m, scale: 1.9, hair: [{ x: 0, y: 6, z: -3.5, w: 7, h: 8, d: 2, hang: true, material: hair, stiff: 30 }, { x: -3.5, y: 6, z: 0, w: 2, h: 7, d: 6, hang: true, material: hair, stiff: 30 }, { x: 3.5, y: 6, z: 0, w: 2, h: 7, d: 6, hang: true, material: hair, stiff: 30 }] });
      const blade = solid(0xd8e8f8, 0.6);
      for (const [hand, s] of [[rig.handR, 1], [rig.handL, -1]]) { const b = rig.mesh(new THREE.BoxGeometry(1.5 * PX, 14 * PX, 5 * PX).translate(0, -7 * PX, 0), blade); b.visible = false; hand.add(b); rig.extras[s > 0 ? 'bladeR' : 'bladeL'] = b; }
      return rig;
    },
    phases: [['blades', 'dash', 'blades'], ['blades', 'dash', 'transfigured', 'repel'], ['distort', 'dash', 'repel', 'blades', 'transfigured']],
  },
};

export const BOSS_IDS = Object.keys(BOSSES);

export class Boss {
  constructor(game, id, pos, level = 1) {
    this.game = game; this.id = id; this.B = BOSSES[id];
    this.def = { name: this.B.name, grade: 'S', knockResist: 0.95, pitch: 0.5 };
    this.displayName = this.B.name;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = 1.1; this.height = 4.2;
    this.maxHp = this.B.hp * (1 + (level - 1) * 0.45) * (1 + (game.players.length - 1) * 0.6); this.hp = this.maxHp;
    this.dmg = this.B.dmg * (1 + (level - 1) * 0.2);
    this.rig = this.B.build(); this.object = this.rig.root; this.object.position.copy(pos);
    this.facing = 0; this.phase = 0; this.isBoss = true; this.isEnemy = true;
    this.co = null; this.coWait = 0; this.flashT = 0; this.dead = false; this.deathT = 0;
    this.grounded = false; this.coyote = 0; this.visY = pos.y; this.stepUp = true;
    this.anim = null; this.moving = true; this.untargetable = false; this.buds = [];
    this.home = pos.clone();
    this.intro = 2.6;
    this.lastPattern = null;
    this.lightH = game.lights.attach(this.object, this.B.color, 4, 10, { offsetY: 5, priority: 3 });
  }
  get name() { return this.B.name; }
  // ---------------------------------------------------------------- damage
  takeDamage(amount, src, o = {}) {
    if (this.dead || this.untargetable || this.intro > 0) return 0;
    let dmg = amount * (this.buds.some((b) => !b.dead) ? 0.4 : 1);
    this.hp -= dmg; this.flashT = 0.08;
    if (o.knock) this.knock.addScaledVector(o.knock, 0.08);
    const f = this.hp / this.maxHp;
    const want = f < 0.33 ? 2 : f < 0.66 ? 1 : 0;
    if (want > this.phase && this.hp > 0) this.enterPhase(want);
    if (this.hp <= 0) this.die();
    return dmg;
  }
  enterPhase(n) {
    const g = this.game;
    this.phase = n;
    this.co = this.roar(); this.coWait = 0;
    toast(`PHASE ${n + 1}`, 'big');
    g.audio?.boss();
    g.fx.flash(this.B.color, 0.4, 0.3);
    g.shake(0.7);
    if (this.id === 'mahito' && n === 2) this.rig.root.scale.setScalar(1.9 * 1.35);
  }
  die() {
    const g = this.game;
    this.dead = true; this.deathT = 0; this.co = null;
    g.slowMo(1.6, 0.25);
    g.shake(1); g.fx.flash(0xffffff, 0.7, 0.4);
    g.audio?.enemyDie(true); g.audio?.gong();
    g.lights.remove(this.lightH);
    for (const m of g.markers.items) if (m.active && !m.keep) g.markers.cancel(m);
    g.onBossKilled?.(this);
  }
  // ---------------------------------------------------------------- helpers
  target() {
    let best = null, bd = Infinity;
    for (const p of this.game.hostileTargets()) { if (p.dead || p.downed) continue; const d = p.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  hurtPlayers(center, radius, dmg, knockPow = 8, filter = null) {
    for (const p of this.game.hostileTargets()) {
      if (p.dead) continue;
      tmp.subVectors(p.pos, center); const dy = tmp.y; tmp.y = 0;
      if (tmp.length() < radius + (p.radius ?? 0.3) && Math.abs(dy) < 3 && (!filter || filter(p))) p.takeDamage(dmg, this, { knock: tmp.normalize().multiplyScalar(knockPow) });
    }
  }
  ground(p) { const gy = this.game.world.groundBelow(p.x, p.z, p.y + 4); return isFinite(gy) ? gy : p.y; }
  // ---------------------------------------------------------------- coroutines
  *roar() {
    const g = this.game;
    this.untargetable = true; this.anim = { type: 'raise', t: 0 }; this.moving = false;
    g.fx.shockwave(this.pos, this.B.color, 7);
    this.hurtPlayers(this.pos, 4, this.dmg * 0.5, 14);
    yield 1.2;
    this.untargetable = false; this.anim = null; this.moving = true;
  }
  *meteors(n = 6) {
    const g = this.game;
    this.anim = { type: 'raise', t: 0 }; this.moving = false;
    const spots = [];
    for (const p of g.hostileTargets()) if (!p.dead) spots.push(p.pos.clone());
    while (spots.length < n + this.phase * 2) { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 8; spots.push(this.home.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))); }
    for (const s of spots) { s.y = this.ground(s); g.markers.spawn({ pos: s, radius: 2, dur: 1.2, color: 0xff4a1a }); }
    yield 1.2;
    this.anim = null; this.moving = true;
    for (const s of spots) {
      g.fx.explosion(s, 0xff6a1a, 2);
      this.hurtPlayers(s, 2, this.dmg, 7);
      g.hazards.fire(s, this.dmg * 0.4, 1.3);
      g.combat.hitBlocks(s, tmp.set(0, 0, 1), 1.5, Math.PI, 40, null);
      g.audio?.energy('explode');
      yield 0.08;
    }
    yield 0.6;
  }
  *flame_cone() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    this.facing = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
    g.markers.spawn({ pos: this.pos, radius: 10, dur: 0.9, shape: 'cone', arc: 0.22, facing: this.facing, color: 0xff5a1a });
    this.anim = { type: 'cast', t: 1, both: true };
    yield 0.9;
    g.audio?.energy('fire');
    for (let k = 0; k < 14; k++) {
      const dir = tmp2.set(Math.sin(this.facing), 0, Math.cos(this.facing));
      const from = this.pos.clone().setY(this.pos.y + 2.5).addScaledVector(dir, 1.5);
      g.particles.burst(from, { count: 10, color: 0xff7a2a, speed: 16, spread: 0.25, dir, life: 0.6, size: 0.5, sizeEnd: 2.5, drag: 1.5, intensity: 3 });
      if (k % 3 === 0) for (const p of g.hostileTargets()) {
        if (p.dead) continue; tmp.subVectors(p.pos, this.pos).setY(0); const d = tmp.length();
        if (d < 10.5 && Math.abs(angleDiff(this.facing, Math.atan2(tmp.x, tmp.z))) < 0.72) p.takeDamage(this.dmg * 0.35, this, { knock: tmp.normalize().multiplyScalar(4) });
      }
      g.lights.flash(from.addScaledVector(dir, 4), 0xff6a1a, 8, 10, 0.1);
      yield 0.06;
    }
    this.anim = null; this.moving = true;
    yield 0.5;
  }
  *lava_ring() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    for (let ring = 1; ring <= 3; ring++) {
      const R = ring * 3.2, n = 6 + ring * 4;
      const spots = [];
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring; const s = this.pos.clone().add(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R)); s.y = this.ground(s); spots.push(s); g.markers.spawn({ pos: s, radius: 1.5, dur: 0.8, color: 0xff3a1a }); }
      yield 0.8;
      for (const s of spots) { g.particles.burst(s, { count: 8, color: 0xff6a1a, speed: 7, up: 3, life: 0.6, size: 0.3, gravity: 12, shape: 1 }); this.hurtPlayers(s, 1.5, this.dmg * 0.7, 6); }
      g.audio?.impact(1.2); g.shake(0.2);
      yield 0.25;
    }
    this.anim = null; this.moving = true;
    yield 0.4;
  }
  *insects() {
    const g = this.game;
    this.anim = { type: 'raise', t: 0 }; this.moving = false;
    for (let i = 0; i < 2 + this.phase; i++) { const a = Math.random() * Math.PI * 2; const s = this.pos.clone().add(new THREE.Vector3(Math.cos(a) * 3, 0, Math.sin(a) * 3)); s.y = this.ground(s); const e = g.spawnEnemy(this.id === 'mahito' ? 'swarmer' : this.id === 'hanami' ? 'spitter' : 'imp', s, { summoned: true, level: g.mission?.difficulty ?? 1 }); if (e) g.fx.summonCircle(s, this.B.color); }
    g.audio?.energy('summon');
    yield 1.0;
    this.anim = null; this.moving = true;
  }
  *maximum_meteor() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    const c = t.pos.clone(); c.y = this.ground(c);
    g.markers.spawn({ pos: c, radius: 6.5, dur: 2.6, color: 0xff2a0a });
    toast('MAXIMUM: METEOR', 'big');
    const rock = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), solid(0xff5a1a, 2.5));
    rock.position.copy(c).add(new THREE.Vector3(0, 40, 0)); g.scene.add(rock);
    for (let k = 0; k < 26; k++) { rock.position.y = c.y + 40 * (1 - k / 26); rock.rotation.x += 0.1; rock.rotation.z += 0.07; g.particles.burst(rock.position, { count: 6, color: 0xff7a2a, speed: 3, life: 0.6, size: 0.8, sizeEnd: 2 }); yield 0.1; }
    g.scene.remove(rock);
    g.fx.explosion(c, 0xff5a1a, 6.5); g.fx.screenWave(c, 1.4, 0.7); g.shake(1); g.fx.flash(0xff8a3a, 0.5, 0.3);
    this.hurtPlayers(c, 6.5, this.dmg * 2.5, 16);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.hazards.fire(c.clone().add(new THREE.Vector3(Math.cos(a) * 3, 0, Math.sin(a) * 3)), this.dmg * 0.4, 1.4); }
    g.combat.hitBlocks(c, tmp.set(0, 0, 1), 5, Math.PI, 200, null);
    this.anim = null; this.moving = true;
    yield 1.2;
  }
  *roots() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'attack', t: 0.25, style: 'slam', windup: 0.3, strike: 0.5 };
    const targets = g.hostileTargets().filter((p) => !p.dead);
    const lines = [];
    for (let i = 0; i < 3 + this.phase; i++) {
      const p = targets[i % Math.max(1, targets.length)];
      const ang = p ? Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z) + (i >= targets.length ? (Math.random() - 0.5) * 1.6 : 0) : Math.random() * 6;
      g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 2.2, length: 16, facing: ang, dur: 1.0, color: 0xff3a1a });
      lines.push(ang);
    }
    this.anim = { type: 'raise', t: 0 };
    yield 1.0;
    g.audio?.impact(1.8); g.shake(0.4);
    for (const ang of lines) {
      const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
      for (let s = 1.5; s < 16; s += 1.2) {
        const q = this.pos.clone().addScaledVector(dir, s); q.y = this.ground(q);
        g.particles.burst(q, { count: 5, color: 0x6a4a2a, additive: false, speed: 4, up: 3, life: 0.6, size: 0.5, gravity: 10, sizeEnd: 1.2 });
        g.debris.spawn(q.clone().setY(q.y + 0.5), new THREE.Vector3((Math.random() - 0.5) * 2, 7 + Math.random() * 3, (Math.random() - 0.5) * 2), 0.5, new THREE.Color(0.3, 0.2, 0.1), 1.2);
      }
      for (const p of g.hostileTargets()) {
        if (p.dead) continue; tmp.subVectors(p.pos, this.pos).setY(0);
        const along = tmp.dot(dir), lat = Math.abs(tmp.x * dir.z - tmp.z * dir.x);
        if (along > 0 && along < 16 && lat < 1.3) p.takeDamage(this.dmg, this, { knock: new THREE.Vector3(0, 0, 0) }), p.vel.y = 9;
      }
    }
    this.anim = null; this.moving = true;
    yield 0.8;
  }
  *seeds() {
    const g = this.game;
    this.anim = { type: 'cast', t: 1, both: false }; this.moving = false;
    const t = this.target();
    for (let i = 0; i < 3 + this.phase; i++) {
      if (!t) break;
      const from = this.pos.clone().setY(this.pos.y + 3.5);
      const self = this;
      g.projectiles.fire({ pos: from, vel: new THREE.Vector3((Math.random() - 0.5) * 6, 8, (Math.random() - 0.5) * 6), team: 'enemy', dmg: this.dmg * 0.6, shape: 'cube', color: 0x9a6a3a, emissive: 0.6, gravity: 6, life: 5, homing: 2.2, target: t, scale: 1.8, radius: 0.6,
        onHit: (p) => { p.takeDamage(self.dmg * 0.6, self, { knock: tmp.subVectors(p.pos, from).setY(0).normalize().multiplyScalar(6) }); },
        onExpire: (pr) => { g.fx.explosion(pr.pos, 0x9aff5a, 1.8); self.hurtPlayers(pr.pos, 1.8, self.dmg * 0.5, 6); } });
      yield 0.3;
    }
    this.anim = null; this.moving = true;
    yield 0.8;
  }
  *flowers() {
    const g = this.game;
    for (const p of g.hostileTargets()) if (!p.dead) { const s = p.pos.clone(); g.markers.spawn({ pos: s, radius: 3.5, dur: 1, color: 0xff7ab0 }); setTimeout(() => g.hazards.add({ pos: s, radius: 3.5, dps: this.dmg * 0.5, dur: 5, color: 0xff7ab0, slow: 0.5 }), 1000); }
    this.anim = { type: 'raise', t: 0 }; this.moving = false;
    yield 1.1;
    this.anim = null; this.moving = true;
  }
  *charge() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const ang = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z); this.facing = ang;
    g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 3, length: 14, facing: ang, dur: 0.9, color: 0xff2a1a });
    this.anim = { type: 'attack', t: 0.2, style: 'slam', windup: 0.3, strike: 0.5 };
    yield 0.9;
    const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
    const hit = new Set();
    for (let k = 0; k < 14; k++) {
      this.knock.copy(dir).multiplyScalar(26);
      for (const p of g.hostileTargets()) { if (!p.dead && !hit.has(p) && p.pos.distanceTo(this.pos) < 2.4) { hit.add(p); p.takeDamage(this.dmg * 1.1, this, { knock: dir.clone().multiplyScalar(12) }); } }
      g.particles.burst(this.pos, { count: 3, color: 0x8a7a6a, additive: false, speed: 2, life: 0.5, size: 0.6, sizeEnd: 1.6 });
      g.combat.hitBlocks(this.pos, dir, 2, 1.2, 80, null);
      yield 0.04;
    }
    this.knock.set(0, 0, 0);
    this.anim = null; this.moving = true;
    yield 0.8;
  }
  *buds() {
    const g = this.game;
    this.anim = { type: 'raise', t: 0 }; this.moving = false;
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + Math.random(); const s = this.home.clone().add(new THREE.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7)); s.y = this.ground(s);
      const e = g.spawnEnemy('summoner', s, { level: g.mission?.difficulty ?? 1 }); if (e) { e.displayName = 'Cursed Bud'; this.buds.push(e); g.fx.summonCircle(s, 0x7aff5a); }
    }
    toast('Destroy the Cursed Buds!');
    yield 1.2;
    this.anim = null; this.moving = true;
  }
  *blades() {
    const g = this.game;
    this.rig.extras.bladeR.visible = this.rig.extras.bladeL.visible = true;
    for (let k = 0; k < 3; k++) {
      const t = this.target(); if (!t) break;
      this.facing = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
      this.moving = false;
      g.markers.spawn({ pos: this.pos, radius: 4.2, dur: 0.55, shape: 'cone', arc: 0.4, facing: this.facing, color: 0xff2a3a, follow: this });
      this.anim = { type: 'attack', t: 0.2, style: k % 2 ? 'swingL' : 'swingR', windup: 0.3, strike: 0.5 };
      yield 0.55;
      this.anim = { type: 'attack', t: 0.6, style: k % 2 ? 'swingL' : 'swingR', windup: 0.3, strike: 0.5 };
      g.fx.slashArc(this.pos, this.facing, 0x9ad8ff, 4.2, 0.4, 0.18, k % 2 === 1);
      g.audio?.energy('slash');
      for (const p of g.hostileTargets()) { if (p.dead) continue; tmp.subVectors(p.pos, this.pos).setY(0); if (tmp.length() < 4.6 && Math.abs(angleDiff(this.facing, Math.atan2(tmp.x, tmp.z))) < 1.3) p.takeDamage(this.dmg, this, { knock: tmp.normalize().multiplyScalar(7) }); }
      this.knock.set(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(8);
      yield 0.25;
    }
    this.rig.extras.bladeR.visible = this.rig.extras.bladeL.visible = false;
    this.anim = null; this.moving = true;
    yield 0.5;
  }
  *dash() {
    const g = this.game;
    for (let k = 0; k < 1 + this.phase; k++) { yield* this.charge(); }
  }
  *transfigured() { yield* this.insects(); }
  *repel() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    g.markers.spawn({ pos: this.pos, radius: 5.5, dur: 1.0, color: 0xff2a3a, follow: this });
    yield 1.0;
    g.fx.explosion(this.pos, 0x9ad8ff, 5.5); g.shake(0.5);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.debris.spawn(this.pos.clone().setY(this.pos.y + 1), new THREE.Vector3(Math.cos(a) * 12, 4, Math.sin(a) * 12), 0.4, new THREE.Color(0.7, 0.8, 0.9), 1.5); }
    this.hurtPlayers(this.pos, 5.5, this.dmg * 1.2, 14);
    this.anim = null; this.moving = true;
    yield 0.6;
  }
  *distort() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'attack', t: 0.25, style: 'slam', windup: 0.3, strike: 0.5 };
    for (let k = 0; k < 3; k++) {
      const spots = g.hostileTargets().filter((p) => !p.dead).map((p) => p.pos.clone());
      for (const s of spots) g.markers.spawn({ pos: s, radius: 3, dur: 0.7, color: 0xff2a3a });
      yield 0.7;
      for (const s of spots) { g.fx.shockwave(s, 0x9ad8ff, 3.4); this.hurtPlayers(s, 3, this.dmg * 1.1, 10); }
      g.audio?.impact(1.6); g.shake(0.4);
      yield 0.3;
    }
    this.anim = null; this.moving = true;
    yield 0.5;
  }
  pickPattern() {
    const list = this.B.phases[Math.max(0, Math.min(2, this.phase | 0))];
    let p;
    for (let i = 0; i < 4; i++) { p = list[Math.floor(Math.random() * list.length)]; if (p !== this.lastPattern) break; }
    if (typeof this[p] !== 'function') { console.warn('boss pattern missing', p, this.phase); p = list[0]; }
    this.lastPattern = p;
    return this[p]();
  }
  // ---------------------------------------------------------------- update
  update(dt) {
    const g = this.game;
    if (this.dead) {
      this.deathT += dt;
      if (Math.random() < 0.5) g.fx.explosion(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 4, (Math.random() - 0.5) * 3)), this.B.color, 1.5);
      this.object.scale.setScalar(Math.max(0.01, (1 - this.deathT / 1.8)) * this.rig.spec.scale);
      this.object.rotation.y += dt * 4;
      if (this.deathT > 1.8) { g.fx.curseDeath(this.pos.clone().setY(this.pos.y + 2), 3, this.B.color); return false; }
      return true;
    }
    if (g.frozen && g.domainSys.inside(this.pos)) { this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null); this.flashT -= dt; return true; }
    this.flashT -= dt;
    this.intro = Math.max(0, this.intro - dt);
    this.buds = this.buds.filter((b) => !b.dead);
    const t = this.target();
    // coroutine
    if (this.intro <= 0) {
      if (this.coWait > 0) this.coWait -= dt;
      else {
        if (!this.co) this.co = this.pickPattern();
        const r = this.co.next();
        if (r.done) { this.co = null; this.coWait = 0.4 + Math.random() * 0.6 - this.phase * 0.15; }
        else this.coWait = r.value ?? 0;
      }
    }
    // movement toward the nearest player
    let move = tmp2.set(0, 0, 0);
    if (t && this.moving && this.intro <= 0) {
      tmp.subVectors(t.pos, this.pos).setY(0); const d = tmp.length();
      if (d > 3.5) move.copy(tmp.normalize().multiplyScalar(this.B.speed * (1 + this.phase * 0.2)));
      this.facing = dampAngle(this.facing, Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z), 4, dt);
    }
    this.vel.x = damp(this.vel.x, move.x + this.knock.x, 8, dt); this.vel.z = damp(this.vel.z, move.z + this.knock.z, 8, dt);
    this.knock.multiplyScalar(Math.exp(-dt * 5));
    moveEntity(this, g.world, dt);
    if (this.pos.y < -4) { this.pos.copy(this.home); this.vel.set(0, 0, 0); }
    // visuals
    this.visY = this.stepped ? damp(this.visY, this.pos.y, 12, dt) : this.pos.y; if (Math.abs(this.visY - this.pos.y) < 0.01) this.stepped = 0;
    this.object.position.set(this.pos.x, this.visY + (this.intro > 0 ? -this.intro * 1.2 : 0), this.pos.z);
    this.object.rotation.y = this.facing;
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    const sp = Math.hypot(this.vel.x, this.vel.z) / this.B.speed;
    this.rig.animate({ dt, speed: Math.min(1, sp), vel: this.vel, action: this.anim ?? (this.intro > 0 ? { type: 'raise', t: 0 } : null) });
    if (this.id === 'jogo' && Math.random() < 0.6) { const c = this.rig.extras.crater.getWorldPosition(tmp); g.particles.glow.emit(c.x, c.y, c.z, (Math.random() - 0.5), 3 + Math.random() * 2, (Math.random() - 0.5), 0.8, 3, 1.1, 0.3, 0.35, 2, 1, 0.3, 0); }
    if (Math.random() < 0.3) g.fx.curseSmoke(this, null);
    return true;
  }
}
