// Gojo-style kit — Limitless.
//   RMB  Red (Reversal): a crimson orb that detonates in a huge repulsion blast.
//   1    Blue (Lapse): a singularity that drags curses (and rubble) inward.
//   2    Infinity: a brief untouchable barrier that stops projectiles dead.
//   3    Hollow Purple: Blue and Red spiral together, then an erasing beam
//        tears through walls, leaving a glowing trench and flying debris.
//   F    Domain Expansion: Unlimited Void — every curse freezes in a starry void.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit } from './index.js';
import { makeOrb, infinityMaterial, beamMaterial } from '../gfx/orbs.js';
import { Trench } from '../gfx/materials.js';
import { BLOCKS } from '../world/blocks.js';
import { tileAvgColor } from '../gfx/textures.js';

const BLUE = 0x3ab8ff, RED = 0xff2a3a, PURPLE = 0xb04aff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

export const GOJO_SKILLS = [
  { id: 'six_eyes', name: 'Six Eyes', desc: '+4% crit chance and +10% CE gain per rank.', max: 3 },
  { id: 'blue_radius', name: 'Maximum Blue', desc: 'Blue pulls from further away and hits harder.', max: 3 },
  { id: 'blue_duration', name: 'Lingering Lapse', desc: 'Blue lasts longer.', max: 2 },
  { id: 'red_power', name: 'Reversal: Red', desc: 'Bigger, stronger Red explosions.', max: 3 },
  { id: 'red_charges', name: 'Twin Red', desc: 'Red holds two charges.', max: 1, req: 'red_power' },
  { id: 'infinity_duration', name: 'Infinity', desc: 'Infinity lasts longer.', max: 2 },
  { id: 'infinity_reflect', name: 'Reflection', desc: 'Projectiles stopped by Infinity fly back at curses.', max: 1, req: 'infinity_duration' },
  { id: 'purple_width', name: 'Imaginary Mass', desc: 'Hollow Purple is wider and deals more damage.', max: 3 },
  { id: 'purple_cost', name: 'Efficiency', desc: 'Hollow Purple costs less CE and recharges faster.', max: 2, req: 'purple_width' },
  { id: 'void_duration', name: 'Infinite Void', desc: 'Unlimited Void lasts 2s longer per rank.', max: 2 },
];

class GojoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 11, range: 2.6, arc: 1.1, lunge: 7, knock: 3, stop: 0.04, shake: 0.14, trail: BLUE, sparkColor: 0x9ad8ff },
      { style: 'swingL', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 12, range: 2.7, arc: 1.2, lunge: 6, knock: 4, stop: 0.045, shake: 0.16, trail: BLUE, sparkColor: 0x9ad8ff },
      { style: 'spin', dur: 0.42, windup: 0.28, strike: 0.55, dmg: 15, range: 2.9, arc: Math.PI, lunge: 3, knock: 6, stop: 0.06, shake: 0.22, trail: 0xbfe8ff, sparkColor: 0xbfe8ff },
      { style: 'slam', dur: 0.55, windup: 0.4, strike: 0.6, dmg: 26, range: 3.4, arc: Math.PI, lunge: 4, knock: 11, stop: 0.09, shake: 0.4, ring: true, ringColor: BLUE, stagger: 0.55, trail: BLUE, sparkColor: BLUE },
    ];
    const redCharges = 1 + r('red_charges');
    this.slots = {
      ranged: this.ability({ name: 'Red', icon: '🔴', cd: 1.6, ce: 0, use: () => this.red(), maxCharges: redCharges, chargesLeft: redCharges, gateTime: 0.35 }),
      t1: this.ability({ name: 'Blue', icon: '🔵', cd: 7, ce: 12, use: () => this.blue() }),
      t2: this.ability({ name: 'Infinity', icon: '∞', cd: 11, ce: 10, use: () => this.infinity() }),
      t3: this.ability({ name: 'Hollow Purple', icon: '🟣', cd: 16 - r('purple_cost') * 2.5, ce: 45 - r('purple_cost') * 8, use: () => this.purple() }),
    };
    this.domain = {
      name: 'Unlimited Void', icon: '∞', key: 'unlimited_void', type: 1, color: 0x9ad8ff, sound: 'void', flash: 0xffffff,
      duration: 8 + r('void_duration') * 2, radius: 26,
      onStart: (g) => { g.frozen = true; },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt;
        if (d.tick <= 0) {
          d.tick = 0.5;
          for (const e of g.enemies) if (!e.dead && g.domainSys.inside(e.pos)) { g.combat.damageEnemy(e, 5, this.p, { stagger: 0, ceGain: 0 }); g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height), { count: 3, color: 0x9ad8ff, speed: 1, life: 0.6, size: 0.12, up: 1, shape: 1 }); }
        }
      },
      onEnd: (g) => { g.frozen = false; },
    };
    this.p.stats.crit += r('six_eyes') * 0.04; this.p.stats.ceGain += r('six_eyes') * 0.1;
    this.infT = 0;
    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 3), infinityMaterial());
    this.shell.visible = false; this.shell.renderOrder = 23;
    this.game.scene.add(this.shell);
    this.auraT = 0;
    this.beamMats = [beamMaterial(PURPLE), beamMaterial(0xffd8ff, true)];
  }
  // -------------------------------------------------------------- aura
  tick(dt) {
    const p = this.p, g = this.game;
    const k = p.ce / p.maxCe;
    this.auraT += dt * (2 + 30 * k * k);
    const n = Math.floor(this.auraT); this.auraT -= n;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.25;
      g.particles.glow.emit(p.pos.x + Math.cos(a) * r, p.pos.y + 0.1 + Math.random() * 1.6, p.pos.z + Math.sin(a) * r, Math.cos(a) * 0.3, 1.2 + Math.random() * 1.2, Math.sin(a) * 0.3, 0.5 + Math.random() * 0.4, 0.4 + k, 1.2 + k * 1.5, 3 + k * 2, 0.12 + k * 0.1, -1, 1.5, 0.1, 0);
    }
    p.heroLight.color.setRGB(1 - k * 0.5, 1 - k * 0.1, 1);
    p.heroLight.intensity = 1.6 + k * 2.5;
    p.rig.material.userData.emitMask.value = 0.6 + k * 1.2;
    // Infinity shell
    if (this.infT > 0) {
      this.infT -= dt;
      this.shell.visible = true;
      this.shell.position.set(p.pos.x, p.pos.y + 1, p.pos.z);
      const u = this.shell.material.userData;
      u.alpha.value = Math.min(1, this.infT * 3, (this.infDur - this.infT) * 6 + 0.2);
      u.hit.value = Math.max(0, u.hit.value - dt * 3);
      // stop projectiles dead, push curses out
      for (const pr of g.projectiles.list) {
        if (pr.team !== 'enemy') continue;
        if (pr.pos.distanceTo(this.shell.position) < 2.2) {
          if (this.rank('infinity_reflect')) { pr.team = 'player'; pr.vel.multiplyScalar(-1.4); pr.onHit = (e) => g.combat.damageEnemy(e, pr.dmg * 2, p, { knock: pr.vel.clone().setLength(5) }); pr.hit.clear(); }
          else { pr.vel.multiplyScalar(0.8); pr.gravity = 3; }
        }
      }
      for (const e of g.enemies) {
        if (e.dead || e.isDummy) continue;
        tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length();
        if (d < 1.6) e.knock.addScaledVector(tmp.normalize(), (1.6 - d) * 20 * dt * 10);
      }
      if (this.infT <= 0) { this.shell.visible = false; p.invulnerable = false; }
    }
  }
  onIncoming(amount, src) {
    if (this.infT > 0) {
      this.shell.material.userData.hit.value = 1;
      this.game.audio?.energy('infinity');
      if (src && src.pos) this.game.fx.hitSpark(tmp.copy(src.pos).lerp(this.p.pos, 0.6).setY(this.p.pos.y + 1), null, { color: 0x9ad8ff });
      return 0;
    }
    return amount;
  }
  // -------------------------------------------------------------- Red
  red() {
    const g = this.game, p = this.p;
    this.cast(0.32);
    const from = this.handPos();
    const orb = makeOrb(RED, { radius: 0.32, coreColor: 0xffe0e0 });
    orb.position.copy(from); g.scene.add(orb);
    const power = this.rank('red_power');
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const pr = g.projectiles.fire({
      pos: from, vel: p.aimDir.clone().multiplyScalar(26), team: 'player', dmg: 0, shape: 'orb', color: RED, scale: 0.01, life: 0.6, radius: 0.6, light: 6,
      homing: target ? 12 : 0, target,
      trail: (q) => { orb.position.copy(q.pos); orb.rotation.y += 0.3; g.particles.burst(q.pos, { count: 2, color: RED, speed: 1, life: 0.3, size: 0.3, sizeEnd: 0.1 }); },
      onExpire: (q) => { g.scene.remove(orb); this.redBlast(q.pos.clone(), power); },
    });
    if (!pr) { g.scene.remove(orb); return false; }
    g.audio?.whoosh(0.8);
    g.audio?.tone({ freq: 700, to: 300, dur: 0.25, gain: 0.12, type: 'sawtooth', filter: 2500 });
    return true;
  }
  redBlast(c, power) {
    const g = this.game, p = this.p;
    const R = 3.4 + power * 0.6;
    g.combat.aoe(c, R, 30 + power * 10, p, { knock: 17 + power * 3, stagger: 0.6, falloff: true, unblockable: true });
    for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(c) < R) e.vel.y = Math.max(e.vel.y, 7);
    g.fx.explosion(c, RED, R);
    g.fx.screenWave(c, 0.9, 0.45);
    g.fx.chroma(0.6);
    g.shake(0.45);
    g.hitStop(0.05);
    g.audio?.energy('red');
    g.particles.burst(c, { count: 30, color: 0xff6a6a, speed: 16, life: 0.4, size: 0.1, drag: 3, shape: 1, intensity: 4 });
  }
  // -------------------------------------------------------------- Blue
  blue() {
    const g = this.game, p = this.p;
    this.cast(0.4);
    const range = 9;
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const d = target ? target.pos.clone() : p.aimPoint.clone();
    tmp.subVectors(d, p.pos).setY(0); if (tmp.length() > range) d.copy(p.pos).addScaledVector(tmp.normalize(), range);
    const gy = g.world.groundBelow(d.x, d.z, p.pos.y + 3); d.y = (isFinite(gy) ? gy : p.pos.y) + 1.3;
    const rk = this.rank('blue_radius'), dur = 1.7 + this.rank('blue_duration') * 0.5;
    const R = 6 + rk * 1.2, dps = 26 + rk * 8;
    const orb = makeOrb(BLUE, { radius: 0.1, darkCore: true });
    orb.position.copy(d); g.scene.add(orb);
    const light = g.lights.flash(d, BLUE, 12, 12, dur + 0.4, { priority: 4, fade: false });
    g.audio?.energy('blue');
    let t = 0, tick = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      const grow = Math.min(1, t / 0.25), shrink = t > dur ? Math.max(0, 1 - (t - dur) / 0.2) : 1;
      orb.scale.setScalar((0.9 + Math.sin(t * 20) * 0.05) * grow * shrink);
      orb.rotation.y += dt * 4;
      // spiral-in particles and dust
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * R * 0.7;
        const px = d.x + Math.cos(a) * r, pz = d.z + Math.sin(a) * r, py = d.y - 1 + Math.random() * 2.5;
        const sp = 5 + Math.random() * 4;
        g.particles.glow.emit(px, py, pz, (d.x - px) / r * sp - Math.sin(a) * 4, (d.y - py) * 1.5, (d.z - pz) / r * sp + Math.cos(a) * 4, r / sp, 0.4, 1.4, 3.5, 0.12, 0, 0, 0.3, 1);
      }
      if (Math.random() < 0.5) g.particles.smoke.emit(d.x + (Math.random() - 0.5) * R, d.y - 1.2, d.z + (Math.random() - 0.5) * R, 0, 1.5, 0, 0.8, 0.35, 0.3, 0.28, 0.5, 0, 1, 1.5, 0);
      // pull
      for (const e of g.enemies) {
        if (e.dead || e.isDummy) continue;
        tmp.subVectors(d, e.pos); const dy = tmp.y; tmp.y = 0; const dist = tmp.length();
        if (dist > R || Math.abs(dy) > 4) continue;
        const pull = Math.min(dist * 6, 14) * (1 - (e.def?.knockResist ?? 0) * 0.5);
        e.knock.lerp(tmp.normalize().multiplyScalar(pull), Math.min(1, dt * 10));
        if (e.state === 'windup') e.cancelAttack?.(), e.state = 'stagger', e.stateT = 0, e.stagger = 0.3;
      }
      if (tick <= 0) {
        tick = 0.2;
        const hits = g.combat.query(d, tmp2.set(0, 0, 1), 2.4, Math.PI);
        for (const e of hits) g.combat.damageEnemy(e, dps * 0.2, p, { stagger: 0.1, ceGain: 1 });
        g.combat.hitBlocks(tmp.copy(d).setY(d.y - 1.3), tmp2.set(0, 0, 1), 2, Math.PI, 20, p);
      }
      if (t > dur + 0.2) {
        g.scene.remove(orb); g.lights.remove(light);
        // implosion
        g.combat.aoe(d, 3, 22 + rk * 8, p, { knock: -6, stagger: 0.5 });
        g.fx.shockwave(tmp.copy(d).setY(d.y - 1.3), BLUE, 3.5);
        g.particles.burst(d, { count: 40, color: 0x9ad8ff, speed: 10, life: 0.5, size: 0.12, drag: 4, shape: 1, intensity: 3 });
        g.fx.screenWave(d, 0.6, 0.35);
        g.shake(0.25);
        g.audio?.impact(1.4);
        return false;
      }
      return true;
    });
  }
  // -------------------------------------------------------------- Infinity
  infinity() {
    const g = this.game, p = this.p;
    this.infDur = 2.5 + this.rank('infinity_duration') * 0.8;
    this.infT = this.infDur;
    p.invulnerable = true;
    g.audio?.energy('infinity');
    g.fx.flash(0x9ad8ff, 0.12, 0.15);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0x9ad8ff, r0: 0.4, r1: 2.6, dur: 0.4, thick: 0.1 });
  }
  // -------------------------------------------------------------- Hollow Purple
  purple() {
    const g = this.game, p = this.p;
    const rk = this.rank('purple_width');
    const W = 1.7 + rk * 0.35, L = 40, DMG = 150 + rk * 45;
    p.action = { type: 'cast', both: true, dur: 1.55, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    p.invulnerable = true;
    g.fx.dimTarget = 0.62;
    g.audio?.energy('purple');
    g.rig.extraDist = -4;
    const blue = makeOrb(BLUE, { radius: 0.35, coreColor: 0xd8f0ff }), red = makeOrb(RED, { radius: 0.35, coreColor: 0xffe0e0 });
    g.scene.add(blue, red);
    const lb = g.lights.attach(blue, BLUE, 8, 8, { offsetY: 0, priority: 5 }), lr = g.lights.attach(red, RED, 8, 8, { offsetY: 0, priority: 5 });
    let t = 0, fired = false, beam = null;
    const CH = 1.15;
    g.addUpdater((dt, realDt) => {
      t += realDt;
      const fwd = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const side = tmp2.set(fwd.z, 0, -fwd.x);
      const front = p.pos.clone().addScaledVector(fwd, 1.1); front.y += 1.35;
      if (!fired) {
        p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
        const k = Math.min(1, t / CH);
        const ang = k * Math.PI * 3, rad = (1 - k) * 1.3 + 0.05;
        blue.position.copy(front).addScaledVector(side, Math.cos(ang) * rad).setY(front.y + Math.sin(ang) * rad * 0.6);
        red.position.copy(front).addScaledVector(side, -Math.cos(ang) * rad).setY(front.y - Math.sin(ang) * rad * 0.6);
        for (const o of [blue, red]) g.particles.burst(o.position, { count: 2, color: o === blue ? BLUE : RED, speed: 0.6, life: 0.35, size: 0.3, sizeEnd: 0.1 });
        if (t >= CH) {
          fired = true;
          g.scene.remove(blue, red); g.lights.remove(lb); g.lights.remove(lr);
          beam = this.fireBeam(front, fwd.clone(), W, L, DMG);
        }
        return true;
      }
      // beam fade
      const bt = t - CH;
      const a = Math.max(0, 1 - bt / 0.9);
      if (beam) { beam.scale.set(W * (1 + Math.sin(bt * 60) * 0.06) * Math.min(1, bt * 12) * (0.4 + a * 0.6), 1, W * (0.4 + a * 0.6) * Math.min(1, bt * 12)); this.beamMats.forEach((m) => { m.userData.alpha.value = a; }); }
      if (bt > 0.9) {
        if (beam) { g.scene.remove(beam); beam = null; }
        g.fx.dimTarget = 0; g.rig.extraDist = 0;
        p.invulnerable = false; p.action = null;
        return false;
      }
      return true;
    });
  }
  fireBeam(from, dir, W, L, DMG) {
    const g = this.game, p = this.p, w = g.world;
    // visual
    const grp = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, L, 24, 1, true), this.beamMats[0]);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, L, 16, 1, true), this.beamMats[1]);
    for (const m of [outer, inner]) { m.rotation.x = Math.PI / 2; m.position.z = L / 2; m.renderOrder = 24; }
    grp.add(outer, inner);
    grp.position.copy(from); grp.lookAt(from.clone().add(dir));
    g.scene.add(grp);
    this.beamMats.forEach((m) => { m.userData.alpha.value = 1; });
    // feel
    g.fx.flash(0xe0a0ff, 0.85, 0.3);
    g.fx.screenWave(from, 1.6, 0.7);
    g.fx.chroma(2);
    g.shake(1);
    g.hitStop(0.1);
    g.slowMo(0.5, 0.35);
    g.audio?.blackFlash();
    g.lights.flash(from.clone().addScaledVector(dir, 6), PURPLE, 30, 26, 0.9, { priority: 9 });
    g.lights.flash(from.clone().addScaledVector(dir, 16), PURPLE, 26, 24, 0.9, { priority: 8 });
    // damage everything in the capsule
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from); const along = tmp.dot(dir);
      if (along < -1 || along > L) continue;
      const perp = tmp.addScaledVector(dir, -along); perp.y = 0;
      if (perp.length() > W + e.radius + 0.4) continue;
      g.combat.damageEnemy(e, DMG, p, { knock: perp.lengthSq() > 0.01 ? perp.normalize().multiplyScalar(14) : dir.clone().multiplyScalar(10), stagger: 1, unblockable: true, crit: false });
      e.vel.y = 9;
      g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 16, color: PURPLE, speed: 8, life: 0.5, size: 0.14, drag: 3, shape: 1 });
    }
    // erase terrain: carve a trench through walls and the floor
    const floorY = Math.floor(p.pos.y) - 1;
    const removed = [];
    for (let s = 1.2; s < L; s += 0.5) {
      const cx = from.x + dir.x * s, cz = from.z + dir.z * s;
      const r = Math.ceil(W + 0.5);
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const bx = Math.floor(cx) + dx, bz = Math.floor(cz) + dz;
        const ox = bx + 0.5 - cx, oz = bz + 0.5 - cz;
        const lat = Math.abs(ox * dir.z - oz * dir.x);
        if (lat > W) continue;
        for (let by = floorY; by <= Math.floor(from.y + W + 0.5); by++) {
          const id = w.get(bx, by, bz);
          if (!id || BLOCKS[id].liquid) continue;
          if (by === floorY && lat > W * 0.75) continue;
          w.set(bx, by, bz, 0);
          removed.push([bx, by, bz, id]);
        }
      }
    }
    w.flush(64);
    // flying rubble (throttled)
    const every = Math.max(1, Math.floor(removed.length / 120));
    for (let i = 0; i < removed.length; i += every) {
      const [bx, by, bz, id] = removed[i];
      const c = new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5);
      tmp.subVectors(c, from); const along = tmp.dot(dir); const lat = tmp.addScaledVector(dir, -along).setY(0);
      const v = lat.normalize().multiplyScalar(4 + Math.random() * 6).addScaledVector(dir, 3 + Math.random() * 6); v.y = 5 + Math.random() * 7;
      g.debris.spawn(c, v, 0.25 + Math.random() * 0.25, (tileAvgColor[BLOCKS[id].side] ?? new THREE.Color(0.5, 0.5, 0.5)).clone(), 3 + Math.random());
    }
    for (let s = 2; s < L; s += 1.5) g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: 5, color: PURPLE, speed: 5, life: 0.7, size: 0.3, drag: 2, sizeEnd: 0.1, up: 0.4 });
    // glowing trench
    Trench.a.value.set(from.x, floorY + 0.5, from.z); Trench.b.value.set(from.x + dir.x * L, floorY + 0.5, from.z + dir.z * L);
    Trench.width.value = W + 0.3; Trench.glow.value = 1.4;
    g.trenchFade = 14;
    return grp;
  }
}
registerKit('gojo', GojoKit);
