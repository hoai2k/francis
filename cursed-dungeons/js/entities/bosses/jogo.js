// JOGO — Special Grade Cursed Spirit, born from humanity's fear of the earth
// (volcanoes). Technique: Disaster Flames.
//   Ember Insects      homing flame bugs that burst on contact
//   Volcano            a crater erupts under each sorcerer
//   Disaster Flames    a cone of fire from both hands / a ring of flame bursts
//   Maximum: Meteor    a burning boulder the size of a house
//   Coffin of the Iron Mountain (phase 3)  Domain Expansion: the arena becomes
//                      a volcano's interior; heat scorches, magma vents erupt;
//                      afterwards his technique burns out for a moment
import * as THREE from 'three/webgpu';
import { buildJogo } from '../boss-looks.js';
import { angleDiff } from '../../util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ORANGE = 0xff6a1a, MAGMA = 0xff3a0a;

// a little rock cone that pushes up out of the ground, erupts and sinks back
function cone(b, at, size = 1) {
  const g = b.game, grp = new THREE.Group(); grp.position.copy(at);
  const rock = new THREE.MeshStandardNodeMaterial({ color: 0x2a201c, roughness: 0.95 });
  const hot = new THREE.MeshStandardNodeMaterial({ color: 0xff6a1a, emissive: 0xff5a0a, emissiveIntensity: 3 });
  for (let i = 0; i < 3; i++) { const s = (1.6 - i * 0.45) * size; const m = new THREE.Mesh(new THREE.BoxGeometry(s, 0.45 * size, s), rock); m.position.y = (0.22 + i * 0.42) * size; m.rotation.y = i * 0.4; grp.add(m); }
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.55 * size, 0.2, 0.55 * size), hot); lip.position.y = 1.18 * size; grp.add(lip);
  grp.scale.y = 0.01;
  b.addProp(grp);
  let t = 0;
  b.task((function* () {
    while (t < 2.2) { const dt = yield 0; t += dt ?? 0.016; grp.scale.y = t < 0.25 ? t / 0.25 : t > 1.8 ? Math.max(0.01, 1 - (t - 1.8) / 0.4) : 1; }
    b.removeProp(grp);
  })());
  return grp;
}
function erupt(b, at, r, dmg) {
  const g = b.game;
  g.fx.explosion(at, ORANGE, r);
  for (let i = 0; i < 26 * (g.particles.budget ?? 1); i++) g.particles.glow.spawn({ x: at.x + (Math.random() - 0.5) * r * 0.5, y: at.y + 0.6, z: at.z + (Math.random() - 0.5) * r * 0.5, vx: (Math.random() - 0.5) * 3, vy: 9 + Math.random() * 9, vz: (Math.random() - 0.5) * 3, life: 1.1, r: 3.2, g: 1.2, b: 0.25, size: 0.22, gravity: 16, drag: 0.4, sizeEnd: 0.5, shape: 'square' });
  for (let i = 0; i < 8; i++) g.particles.smoke.spawn({ x: at.x, y: at.y + 1, z: at.z, vx: (Math.random() - 0.5) * 2, vy: 4 + Math.random() * 3, vz: (Math.random() - 0.5) * 2, life: 2, r: 0.12, g: 0.08, b: 0.07, size: 0.9, gravity: -0.5, drag: 1.2, sizeEnd: 3.4 });
  b.hurt(at, r, dmg, 4, { up: 11 });
  g.combat.hitBlocks(at, V(0, 0, 1), r * 0.8, Math.PI, 40, null);
  g.audio?.energy('explode');
}

export const jogo = {
  name: 'Jogo', hudName: 'Jogo · Special Grade Cursed Spirit', title: 'JOGO · SPECIAL GRADE CURSED SPIRIT',
  hp: 2600, speed: 2.6, dmg: 22, color: ORANGE, radius: 1.1, height: 4.2,
  build: buildJogo,
  phaseNames: ['', 'JOGO · "HUMANS ARE THE FAKES!"', 'DOMAIN EXPANSION · COFFIN OF THE IRON MOUNTAIN'],
  phaseMove: { 2: 'coffin_of_the_iron_mountain' },
  phases: [
    ['ember_insects', 'volcano', 'disaster_flames', 'disaster_flames'],
    ['ember_insects', 'volcano', 'disaster_flames', 'flame_burst', 'maximum_meteor'],
    ['maximum_meteor', 'volcano', 'ember_insects', 'flame_burst', 'disaster_flames', 'coffin_of_the_iron_mountain'],
  ],
  onDamage(dmg) { return dmg * (this.st.burnout > 0 ? 1.6 : 1); },
  tick(dt) {
    if (this.st.burnout > 0) {
      this.st.burnout -= dt;
      if (Math.random() < dt * 20) this.game.particles.smoke.spawn({ x: this.pos.x + (Math.random() - 0.5), y: this.pos.y + 4.4, z: this.pos.z + (Math.random() - 0.5), vy: 1.4, life: 1.6, r: 0.25, g: 0.25, b: 0.25, size: 0.6, gravity: -0.3, drag: 1, sizeEnd: 2.6 });
    }
    this.st.domainCd = Math.max(0, (this.st.domainCd ?? 0) - dt);
  },
  moves: {
    // 蟲 Ember Insects: little flame bugs launched in a fan, homing in, bursting on contact
    *ember_insects() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: true });
      this.callout('Ember Insects');
      g.audio?.charge(0.5, 1.3);
      yield 0.5;
      const n = 5 + this.phase * 2, self = this, targets = this.players();
      for (let i = 0; i < n; i++) {
        const tg = targets[i % targets.length] ?? t;
        const a = this.facing + (i - (n - 1) / 2) * 0.32;
        const from = this.pos.clone().setY(this.pos.y + 2.4).add(V(Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2));
        g.projectiles.fire({ pos: from, vel: V(Math.sin(a) * 9, 2.5 + Math.random() * 2, Math.cos(a) * 9), team: 'enemy', dmg: this.dmg * 0.45, shape: 'cube', color: 0xffa03a, emissive: 4, life: 3.2, homing: 1.6, target: tg, scale: 0.9, radius: 0.45, light: i % 3 === 0 ? 2 : 0,
          trail: (pr) => { if (Math.random() < 0.7) g.particles.glow.spawn({ pos: pr.pos, vx: (Math.random() - 0.5) * 0.6, vy: 0.6, vz: (Math.random() - 0.5) * 0.6, life: 0.35, r: 3, g: 1.3, b: 0.3, size: 0.16, drag: 1, sizeEnd: 0.05 }); pr.mesh.rotation.z += 0.4; },
          onHit: (p, pr) => { p.takeDamage(self.dmg * 0.45, self, { knock: pr.vel.clone().setY(0).setLength(4) }); },
          onExpire: (pr) => { g.fx.explosion(pr.pos, ORANGE, 1.4); self.hurt(pr.pos, 1.3, self.dmg * 0.3, 5); } });
        g.audio?.energy('nail');
        yield 0.07;
      }
      this.free();
      yield 0.6;
    },
    // Volcano: the ground under each sorcerer cracks red, then a crater erupts
    *volcano() {
      const g = this.game;
      this.still(); this.pose('attack', { t: 0.25, style: 'slam', windup: 0.3, strike: 0.5 });
      this.callout('Volcano');
      const spots = this.players().map((p) => this.gy(p.pos));
      if (this.phase >= 1) for (let i = 0; i < this.phase * 2; i++) spots.push(this.around(this.arena.c, 2, this.arena.R - 1));
      for (const s of spots) this.mark(s, { radius: 2.2, dur: 1.05, color: MAGMA });
      yield 0.35;
      g.shake(0.25); g.audio?.impact(1.2);
      for (const s of spots) for (let i = 0; i < 6; i++) g.particles.burst(s.clone().add(V((Math.random() - 0.5) * 2.5, 0.1, (Math.random() - 0.5) * 2.5)), { count: 2, color: MAGMA, speed: 2, up: 3, life: 0.5, size: 0.14 });
      yield 0.7;
      this.free();
      for (const s of spots) { cone(this, s, 1.1); erupt(this, s, 2.2, this.dmg * 1.05); g.hazards.fire(s, this.dmg * 0.35, 1.4); yield 0.06; }
      g.shake(0.6);
      yield 0.6;
    },
    // Disaster Flames: a roaring cone of fire from both hands
    *disaster_flames() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      g.markers.spawn({ pos: this.gy(this.pos), radius: 10, dur: 0.9, shape: 'cone', arc: 0.22, facing: this.facing, color: MAGMA });
      this.pose('cast', { t: 1, both: true });
      this.callout('Disaster Flames');
      yield 0.9;
      g.audio?.energy('fire');
      for (let k = 0; k < 14; k++) {
        const dir = V(Math.sin(this.facing), 0, Math.cos(this.facing));
        const from = this.pos.clone().setY(this.pos.y + 2.5).addScaledVector(dir, 1.5);
        g.particles.burst(from, { count: 10, color: 0xff7a2a, speed: 16, spread: 0.25, dir, life: 0.6, size: 0.5, sizeEnd: 2.5, drag: 1.5, intensity: 3 });
        if (k % 3 === 0) this.hurtCone(this.pos, this.facing, 10.5, 0.72, this.dmg * 0.35, 4);
        g.lights.flash(from.addScaledVector(dir, 4), ORANGE, 8, 10, 0.1);
        yield 0.06;
      }
      this.free();
      yield 0.5;
    },
    // flame bursts: three rings of fire popping outward from his feet
    *flame_burst() {
      const g = this.game;
      this.still(); this.pose('raise');
      this.callout('Flame Burst');
      for (let ring = 1; ring <= 3; ring++) {
        const R = ring * 3.2, n = 5 + ring * 3, spots = [];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring; const s = this.gy(this.pos.clone().add(V(Math.cos(a) * R, 0, Math.sin(a) * R))); spots.push(s); this.mark(s, { radius: 1.5, dur: 0.75, color: MAGMA }); }
        yield 0.75;
        for (const s of spots) { g.particles.burst(s, { count: 8, color: 0xff6a1a, speed: 7, up: 3, life: 0.6, size: 0.3, gravity: 12, shape: 1 }); this.hurt(s, 1.5, this.dmg * 0.7, 6); }
        g.audio?.impact(1.2); g.shake(0.2);
        yield 0.2;
      }
      this.free();
      yield 0.4;
    },
    // 極ノ番「隕」 Maximum: Meteor
    *maximum_meteor() {
      const g = this.game, t = this.target(); if (!t) return;
      this.still(); this.pose('raise');
      const c = this.gy(t.pos);
      const R = 6.5;
      this.mark(c, { radius: R, dur: 2.6, color: 0xff2a0a });
      this.callout('MAXIMUM: METEOR', true);
      g.audio?.charge(2.4, 0.4);
      const rockM = new THREE.MeshStandardNodeMaterial({ color: 0x3a2018, roughness: 0.9, emissive: 0xff4a0a, emissiveIntensity: 0.6 });
      const lavaM = new THREE.MeshStandardNodeMaterial({ color: 0xff6a1a, emissive: 0xff5a1a, emissiveIntensity: 3 });
      const rock = new THREE.Group();
      rock.add(new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), rockM));
      for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.6, 1.2), lavaM); m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); rock.add(m); }
      for (const [x, y, z] of [[2, 1.5, 1], [-1.6, -1.8, 2], [1, -2, -1.8], [-2, 1, -1.5]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), rockM); m.position.set(x, y, z); rock.add(m); }
      rock.position.copy(c).add(V(0, 40, 0)); this.addProp(rock);
      const light = g.lights.attach(rock, 0xff6a1a, 10, 30, { priority: 4 });
      for (let k = 0; k < 26; k++) {
        rock.position.y = c.y + 2.5 + 38 * (1 - k / 26); rock.rotation.x += 0.1; rock.rotation.z += 0.07;
        g.particles.burst(rock.position, { count: 8, color: 0xff7a2a, speed: 3, life: 0.6, size: 0.9, sizeEnd: 2.4 });
        g.particles.burst(rock.position, { count: 4, color: 0x2a1a14, additive: false, speed: 2, life: 1.2, size: 1.2, sizeEnd: 3 });
        yield 0.1;
      }
      this.removeProp(rock); g.lights.remove(light);
      g.fx.explosion(c, ORANGE, R); g.fx.screenWave(c, 1.4, 0.7); g.shake(1); g.fx.flash(0xff8a3a, 0.5, 0.3);
      this.hurt(c, R, this.dmg * 2.5, 16, { up: 8 });
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.hazards.fire(c.clone().add(V(Math.cos(a) * 3, 0, Math.sin(a) * 3)), this.dmg * 0.4, 1.4); }
      g.combat.hitBlocks(c, V(0, 0, 1), 5, Math.PI, 200, null);
      this.free();
      yield 1.2;
    },
    // 領域展開「蓋棺鉄囲山」 Coffin of the Iron Mountain
    *coffin_of_the_iron_mountain() {
      const g = this.game;
      if (this.st.domainCd > 0 || g.domain) { yield* this.B.moves.volcano.call(this); return; }
      this.still(); this.pose('sign');
      const ok = this.domain({ name: 'Coffin of the Iron Mountain', key: 'coffin_iron_mountain', type: 4, color: 0xff5a1a, sound: 'fire', flash: 0xff6a1a, duration: 7, radius: 24,
        onTick: (gg, d, dt) => {
          d.heat = (d.heat ?? 0.6) - dt;
          if (d.heat > 0) return;
          d.heat = 0.6;
          for (const p of this.players()) if (gg.domainSys.inside(p.pos)) {   // sure-hit: the heat of the volcano itself
            p.takeDamage(this.dmg * 0.09, this, { dot: true, noKnock: true });
            gg.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 6, color: 0xff7a2a, speed: 2, up: 2, life: 0.5, size: 0.18 });
          }
        } });
      if (!ok) { this.free(); return; }
      this.st.domainCd = 30;
      this.untargetable = true;
      yield 1.6;
      this.untargetable = false;
      // magma vents erupt across the floor: under the sorcerers, then everywhere
      for (let w = 0; w < 5 && g.domain?.caster === this; w++) {
        const spots = this.players().map((p) => this.gy(p.pos));
        for (let i = 0; i < 3 + w; i++) spots.push(this.around(this.arena.c, 1, this.arena.R));
        for (const s of spots) this.mark(s, { radius: 1.9, dur: 0.95, color: MAGMA });
        yield 0.95;
        for (const s of spots) { cone(this, s, 0.9); erupt(this, s, 1.9, this.dmg * 0.8); }
        g.shake(0.4);
        yield 0.35;
      }
      while (g.domain?.caster === this) yield 0.2;
      // burnout: the domain cost him; he smokes and staggers
      this.st.burnout = 3.5;
      this.callout('Burnout — strike now!');
      this.pose('stagger');
      yield 2.2;
      this.free();
    },
  },
};
