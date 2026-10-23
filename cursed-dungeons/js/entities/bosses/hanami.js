// HANAMI — Special Grade Cursed Spirit, born from humanity's fear of the
// forests. Technique: Disaster Plants. It speaks in a language that sounds
// wrong but is understood.
//   Root Spikes        wooden spikes rip up along lines toward the sorcerers
//   Wooden Balls       seed pods lobbed in arcs that burst
//   Cursed Buds        seeds that root in a sorcerer and drain Cursed Energy
//                      (dodge-roll to tear them off)
//   Flower Field       flowers bloom at your feet: a calm that slows the body
//   Wood Ram           a charging shoulder of living wood
//   Left Arm Unveiled  (phase 3) the cloth falls away and the flower on its
//                      shoulder fires a planet-draining cursed energy beam
//   Ceremonial Sea of Light (phase 3) its Domain Expansion: a sea of light and
//                      flowers; buds bloom under every sorcerer
import * as THREE from 'three/webgpu';
import { buildHanami } from '../boss-looks.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const GREEN = 0x7aff5a, PINK = 0xff7ab0, WOOD = 0x6a4a2a;

let spikeGeo = null, spikeMat = null, budMat = null, budCore = null;
function spikeAssets() {
  if (!spikeGeo) {
    spikeGeo = new THREE.BoxGeometry(0.5, 2.2, 0.5).translate(0, 1.1, 0);
    spikeMat = new THREE.MeshStandardNodeMaterial({ color: 0x5a3e24, roughness: 0.95 });
    budMat = new THREE.MeshStandardNodeMaterial({ color: 0xff8ac0, emissive: 0xff5aa0, emissiveIntensity: 0.8, roughness: 0.6 });
    budCore = new THREE.MeshStandardNodeMaterial({ color: 0xc8ff6a, emissive: 0x9aff3a, emissiveIntensity: 2 });
  }
}
// a row of spikes pushing up out of the ground and sinking back
function spikeRow(b, origin, dir, len, step = 1.1) {
  spikeAssets();
  const grp = new THREE.Group(); b.addProp(grp);
  const list = [];
  for (let s = 1.2; s < len; s += step) {
    const q = b.gy(origin.clone().addScaledVector(dir, s));
    const m = new THREE.Mesh(spikeGeo, spikeMat); m.position.copy(q); m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5);
    m.scale.set(1, 0.01, 1); m.castShadow = true; grp.add(m); list.push({ m, d: s / len, h: 0.8 + Math.random() * 0.6 });
  }
  let t = 0;
  b.task((function* () {
    while (t < 1.6) {
      const dt = yield 0; t += dt ?? 0.016;
      for (const it of list) { const k = Math.max(0, Math.min(1, (t - it.d * 0.25) / 0.12)); const out = t > 1.2 ? Math.max(0, 1 - (t - 1.2) / 0.4) : 1; it.m.scale.y = Math.max(0.01, k * out * it.h); }
    }
    b.removeProp(grp);
  })());
}

export const hanami = {
  name: 'Hanami', hudName: 'Hanami · Special Grade Cursed Spirit', title: 'HANAMI · SPECIAL GRADE CURSED SPIRIT',
  hp: 2700, speed: 2.8, dmg: 20, color: GREEN, radius: 1.2, height: 4.6,
  build: buildHanami,
  phaseNames: ['', 'HANAMI · "THIS PLANET IS SCREAMING"', 'HANAMI · LEFT ARM UNVEILED'],
  phaseMove: { 2: 'left_arm_unveiled' },
  phases: [
    ['root_spikes', 'wooden_balls', 'root_spikes', 'cursed_buds'],
    ['root_spikes', 'wooden_balls', 'flower_field', 'wood_ram', 'cursed_buds'],
    ['left_arm_unveiled', 'root_spikes', 'wood_ram', 'flower_field', 'cursed_buds', 'ceremonial_sea_of_light'],
  ],
  init() { this.st.buds = new Map(); },
  // living buds on a sorcerer drain their Cursed Energy (and feed Hanami)
  tick(dt) {
    const g = this.game;
    this.st.seaCd = Math.max(0, (this.st.seaCd ?? 0) - dt);
    for (const [p, bud] of this.st.buds) {
      bud.t -= dt;
      const shake = p.dodgeT > 0 || p.dead || p.downed;
      if (bud.t <= 0 || shake) {
        bud.mesh.parent?.remove(bud.mesh); this.st.buds.delete(p);
        if (shake && !p.dead) { g.particles.burst(p.pos.clone().setY(p.pos.y + 1.2), { count: 14, color: PINK, speed: 4, life: 0.5, size: 0.14, shape: 1 }); }
        continue;
      }
      p.ce = Math.max(0, p.ce - 9 * dt);
      bud.tick -= dt;
      if (bud.tick <= 0) { bud.tick = 0.8; p.takeDamage(this.dmg * 0.08, this, { dot: true, noKnock: true }); this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.002); }
      bud.mesh.scale.setScalar(1 + Math.sin(g.time * 8) * 0.12 + (1 - bud.t / 7) * 0.6);
      if (Math.random() < dt * 10) g.particles.glow.spawn({ x: p.pos.x, y: p.pos.y + 1.4, z: p.pos.z, vx: (Math.random() - 0.5), vy: 1.4, vz: (Math.random() - 0.5), life: 0.5, r: 0.6, g: 2.2, b: 0.5, size: 0.1, drag: 1, sizeEnd: 0.1 });
    }
  },
  onDeath() { for (const [, bud] of this.st.buds) bud.mesh.parent?.remove(bud.mesh); this.st.buds.clear(); },
  moves: {
    // wooden root spikes tearing up along lines toward each sorcerer
    *root_spikes() {
      const g = this.game;
      this.still(); this.pose('attack', { t: 0.25, style: 'slam', windup: 0.3, strike: 0.5 });
      this.callout('Root Spikes');
      const targets = this.players(), lines = [];
      for (let i = 0; i < 3 + this.phase; i++) {
        const p = targets[i % Math.max(1, targets.length)];
        const ang = p ? Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z) + (i >= targets.length ? (Math.random() - 0.5) * 1.8 : 0) : Math.random() * 6;
        g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 2.2, length: 16, facing: ang, dur: 1.0, color: 0xff3a1a });
        lines.push(ang);
      }
      this.pose('raise');
      yield 1.0;
      g.audio?.impact(1.8); g.audio?.breakBlock('wood'); g.shake(0.4);
      for (const ang of lines) {
        const dir = V(Math.sin(ang), 0, Math.cos(ang));
        spikeRow(this, this.pos, dir, 16);
        for (let s = 1.5; s < 16; s += 2.4) { const q = this.gy(this.pos.clone().addScaledVector(dir, s)); g.particles.burst(q, { count: 4, color: 0x6a4a2a, additive: false, speed: 4, up: 3, life: 0.6, size: 0.5, gravity: 10, sizeEnd: 1.2 }); }
        this.hurtLine(this.pos, dir, 16, 1.1, this.dmg, 2, { up: 10 });
      }
      this.free();
      yield 0.8;
    },
    // wooden balls: seed pods lobbed in arcs that burst on landing
    *wooden_balls() {
      const g = this.game, t = this.target(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: false });
      this.callout('Wooden Balls');
      const self = this;
      for (let i = 0; i < 3 + this.phase; i++) {
        const tg = this.players()[i % this.players().length] ?? t;
        const land = this.gy(tg.pos.clone().add(V((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)));
        const from = this.pos.clone().setY(this.pos.y + 4);
        const T = 1.1, vel = new THREE.Vector3().subVectors(land, from).divideScalar(T); vel.y = (land.y - from.y) / T + 0.5 * 14 * T;
        this.mark(land, { radius: 2, dur: T, color: 0xff6a3a });
        g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg * 0.6, shape: 'cube', color: 0x8a5a2a, emissive: 0.4, gravity: 14, life: T + 0.05, scale: 2.6, radius: 0.7,
          trail: (pr) => { pr.mesh.rotation.x += 0.2; if (Math.random() < 0.3) g.particles.burst(pr.pos, { count: 1, color: GREEN, speed: 0.5, life: 0.4, size: 0.14 }); },
          onHit: (p) => { p.takeDamage(self.dmg * 0.6, self, { knock: V(0, 4, 0) }); },
          onExpire: (pr) => { g.fx.explosion(pr.pos, 0x9aff5a, 2); self.hurt(pr.pos, 2, self.dmg * 0.55, 6); g.debris.spawn(pr.pos.clone().setY(pr.pos.y + 0.4), V((Math.random() - 0.5) * 4, 6, (Math.random() - 0.5) * 4), 0.4, new THREE.Color(0.35, 0.22, 0.1), 1.4); } });
        yield 0.3;
      }
      this.free();
      yield 0.8;
    },
    // Cursed Buds: seeds that root in the flesh and drain Cursed Energy
    *cursed_buds() {
      const g = this.game; spikeAssets();
      this.still(); this.pose('cast', { t: 1, both: true });
      this.callout('Cursed Buds');
      yield 0.45;
      const self = this;
      for (const tg of this.players()) {
        for (let k = 0; k < 2; k++) {
          const from = this.pos.clone().setY(this.pos.y + 3.2);
          const a = this.facing + (k ? 0.5 : -0.5);
          g.projectiles.fire({ pos: from, vel: V(Math.sin(a) * 8, 3, Math.cos(a) * 8), team: 'enemy', dmg: 0, shape: 'orb', color: 0xff8ac0, emissive: 2.5, life: 3, homing: 2.6, target: tg, scale: 1.1, radius: 0.45,
            trail: (pr) => { if (Math.random() < 0.6) g.particles.glow.spawn({ pos: pr.pos, vy: 0.3, life: 0.4, r: 2, g: 0.8, b: 1.4, size: 0.1, drag: 1, sizeEnd: 0.05 }); },
            onHit: (p) => {
              p.takeDamage(self.dmg * 0.3, self, { knock: V(0, 0, 0) });
              if (self.st.buds.has(p) || p.dead) return;
              const mesh = new THREE.Group();
              for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.12), budMat); m.rotation.y = i * Math.PI / 4; mesh.add(m); }
              const c = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), budCore); c.position.y = 0.06; mesh.add(c);
              mesh.position.set(0.18, 1.45, 0.12); p.object.add(mesh);
              self.st.buds.set(p, { mesh, t: 7, tick: 0.8 });
              g.toast?.('A Cursed Bud took root! Dodge-roll to tear it off');
            } });
          yield 0.12;
        }
      }
      this.free();
      yield 0.7;
    },
    // Flower Field: blossoms open under the sorcerers; their calm slows the body
    *flower_field() {
      const g = this.game;
      this.still(); this.pose('raise');
      this.callout('Flower Field');
      const spots = this.players().map((p) => this.gy(p.pos));
      for (const s of spots) this.mark(s, { radius: 3.5, dur: 1, color: PINK });
      yield 1.0;
      for (const s of spots) {
        g.hazards.add({ pos: s, radius: 3.5, dps: this.dmg * 0.35, dur: 5, color: PINK, slow: 0.5 });
        g.particles.burst(s.clone().setY(s.y + 0.3), { count: 40, color: PINK, speed: 3, up: 2, life: 1.2, size: 0.18, drag: 2 });
        g.particles.burst(s.clone().setY(s.y + 0.3), { count: 20, color: 0xfff0f4, speed: 2, up: 3, life: 1.4, size: 0.12, drag: 2 });
      }
      this.free();
      yield 0.6;
    },
    // a charging shoulder of living wood
    *wood_ram() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      const ang = this.facing;
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 3, length: 14, facing: ang, dur: 0.9, color: 0xff2a1a });
      this.pose('attack', { t: 0.2, style: 'slam', windup: 0.3, strike: 0.5 });
      this.callout('Wood Ram');
      yield 0.9;
      const dir = V(Math.sin(ang), 0, Math.cos(ang));
      yield* this.dash(dir, 26, 14, 1.4, this.dmg * 1.1, 12, { trail: () => g.particles.burst(this.pos, { count: 3, color: 0x8a7a6a, additive: false, speed: 2, life: 0.5, size: 0.6, sizeEnd: 1.6 }) });
      this.free();
      yield 0.8;
    },
    // the cloth falls from the left arm; the shoulder flower fires a beam that drains the earth
    *left_arm_unveiled() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: false });
      this.rig.extras.unveil(true);
      this.callout('LEFT ARM UNVEILED', true);
      const L = 26, W = 3.2;
      let mk = g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: W, length: L, facing: this.facing, dur: 2.0, color: 0xff2a1a, follow: this });
      g.audio?.charge(1.9, 0.6);
      // charge: the beam tracks slowly, then locks
      for (let k = 0; k < 20; k++) {
        const tg = this.target();
        if (tg && k < 13) { const want = Math.atan2(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z); this.facing += Math.max(-0.05, Math.min(0.05, ((want - this.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI)); }
        mk.mesh.rotation.z = this.facing + Math.PI; mk.offset.set(Math.sin(this.facing) * L / 2, 0.05, Math.cos(this.facing) * L / 2);
        const sh = this.rig.extras.shoulder.getWorldPosition(V());
        for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28, r = 2 + Math.random() * 2; g.particles.glow.spawn({ x: sh.x + Math.cos(a) * r, y: sh.y + (Math.random() - 0.5) * 2, z: sh.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 2, vz: -Math.sin(a) * r * 2, life: 0.45, r: 1.2, g: 3, b: 0.8, size: 0.16, sizeEnd: 0.05 }); }
        yield 0.1;
      }
      g.markers.cancel(mk);
      // the beam
      const beamM = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xc8ff9a).multiplyScalar(3), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      const coreM = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(3) });
      const beam = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, L).translate(0, 0, L / 2), beamM), inner = new THREE.Mesh(new THREE.BoxGeometry(1, 1, L).translate(0, 0, L / 2), coreM);
      beam.add(outer, inner); this.addProp(beam);
      const light = g.lights.attach(beam, 0xaaff7a, 12, 24, { priority: 5 });
      g.audio?.energy('purple'); g.fx.flash(0xc8ff9a, 0.4, 0.25); g.shake(0.8);
      for (let k = 0; k < 14; k++) {
        const sh = this.rig.extras.shoulder.getWorldPosition(V());
        const dir = this.fwd();
        beam.position.copy(sh); beam.lookAt(sh.clone().add(dir));
        const pulse = 1 + Math.sin(k * 1.7) * 0.15; outer.scale.set(pulse, pulse, 1);
        if (k % 2 === 0) this.hurtLine(this.pos, dir, L, W / 2, this.dmg * 0.55, 7, { side: true });
        for (let s = 2; s < L; s += 3) { const q = this.gy(this.pos.clone().addScaledVector(dir, s)); g.particles.burst(q, { count: 2, color: 0xc8ff9a, speed: 4, up: 3, life: 0.5, size: 0.2 }); }
        g.combat.hitBlocks(this.pos.clone().addScaledVector(dir, 6), dir, 6, 0.3, 120, null);
        this.facing += 0.012;
        yield 0.08;
      }
      this.removeProp(beam); g.lights.remove(light);
      this.pose('raise');
      yield 0.8;
      this.rig.extras.unveil(this.phase >= 2 && Math.random() < 0.5);
      this.free();
      yield 0.6;
    },
    // 領域展開 Ceremonial Sea of Light
    *ceremonial_sea_of_light() {
      const g = this.game;
      if (this.st.seaCd > 0 || g.domain) { yield* this.B.moves.flower_field.call(this); return; }
      this.still(); this.pose('sign');
      const ok = this.domain({ name: 'Ceremonial Sea of Light', key: 'resonance', type: 6, color: 0xc8ff9a, sound: 'garden', flash: 0xfff2c0, duration: 7, radius: 24,
        look: { floor: 0x5a6a2a, seam: 0xffe08a, sparkle: 0xfff2c0, skyTop: 0x2a3a10, skyHorizon: 0xfff0b0, stars: 0.6, band: 0xffd86a } });
      if (!ok) { this.free(); return; }
      this.st.seaCd = 32;
      this.untargetable = true;
      yield 1.6;
      this.untargetable = false;
      // sure-hit blooms: flowers open under each sorcerer in waves (dodge out of the circle)
      while (g.domain?.caster === this) {
        const spots = this.players().map((p) => this.gy(p.pos));
        for (const s of spots) this.mark(s, { radius: 2.3, dur: 0.8, color: PINK });
        yield 0.8;
        for (const s of spots) {
          g.particles.burst(s.clone().setY(s.y + 0.3), { count: 30, color: PINK, speed: 4, up: 3, life: 1, size: 0.2 });
          g.particles.burst(s.clone().setY(s.y + 0.3), { count: 14, color: 0xfff2c0, speed: 2, up: 5, life: 1.2, size: 0.14 });
          this.hurt(s, 2.3, this.dmg * 0.6, 3, { up: 6, onHit: (p) => { p.slowT = 1.2; p.ce = Math.max(0, p.ce - 10); } });
        }
        yield 0.5;
      }
      this.free();
      yield 0.5;
    },
  },
};
