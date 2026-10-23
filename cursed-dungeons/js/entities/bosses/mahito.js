// MAHITO — Special Grade Cursed Spirit, born from humans' hatred and fear of
// each other. Technique: Idle Transfiguration (he reshapes the soul, and the
// body follows).
//   Idle Transfiguration   a palm on your soul: your body warps (slowed, bleeding)
//   Blade Arms             transfigured bone blades, a three-cut combo
//   Body Repel             spikes burst out of his whole body
//   Transfigured Humans    shrunken people spat out, grown into monsters
//   Polymorphic Soul Isomer  several souls fused into one mass and hurled
//   Instant Spirit Body of Distorted Killing (phase 3) his true form: harder,
//                          faster, extra arms; Distorted Killing dashes
import * as THREE from 'three/webgpu';
import { buildMahito } from '../boss-looks.js';
import { angleDiff } from '../../util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SOUL = 0x7ad8ff, FLESH = 0xd4b4ac;

let spikeGeo = null, spikeMat = null, massMat = null;
function assets() {
  if (spikeGeo) return;
  spikeGeo = new THREE.BoxGeometry(0.22, 0.22, 2.4).translate(0, 0, 1.2);
  spikeMat = new THREE.MeshStandardNodeMaterial({ color: 0xece6da, roughness: 0.4, emissive: 0x9ad8ff, emissiveIntensity: 0.25 });
  massMat = new THREE.MeshStandardNodeMaterial({ color: FLESH, roughness: 0.7, emissive: 0x5a2a3a, emissiveIntensity: 0.3 });
}

export const mahito = {
  name: 'Mahito', hudName: 'Mahito · Special Grade Cursed Spirit', title: 'MAHITO · SPECIAL GRADE CURSED SPIRIT',
  hp: 2500, speed: 4, dmg: 20, color: SOUL, radius: 1.0, height: 4.0,
  build: buildMahito,
  phaseNames: ['', 'MAHITO · "LET ME SHOW YOU YOUR SOUL"', 'INSTANT SPIRIT BODY OF DISTORTED KILLING'],
  phases: [
    ['blade_arms', 'idle_transfiguration', 'blade_arms', 'body_repel'],
    ['blade_arms', 'idle_transfiguration', 'transfigured_humans', 'body_repel', 'polymorphic_soul_isomer'],
    ['distorted_killing', 'idle_transfiguration', 'body_repel', 'polymorphic_soul_isomer', 'transfigured_humans', 'distorted_killing'],
  ],
  init() { this.st.warped = new Map(); },
  reset() { this.rig.extras.bladeR.visible = this.rig.extras.bladeL.visible = false; },
  onPhase(n) {
    if (n === 2) { this.dmgTaken = 0.8; this.speedMul = 1.5; this.radius = 1.3; this.height = 5; }
  },
  // sorcerers whose soul he touched: warped body, slowed, bleeding
  tick(dt) {
    const g = this.game;
    for (const [p, w] of this.st.warped) {
      w.t -= dt; w.tick -= dt;
      const k = Math.max(0, w.t / 3);
      p.object.scale.set(1 + Math.sin(g.time * 9) * 0.22 * k, 1 - Math.sin(g.time * 9) * 0.18 * k, 1 + Math.cos(g.time * 7) * 0.22 * k);
      p.slowT = Math.max(p.slowT ?? 0, 0.2);
      if (w.tick <= 0) { w.tick = 0.5; p.takeDamage(this.dmg * 0.1, this, { dot: true, noKnock: true }); }
      if (Math.random() < dt * 12) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.6, y: p.pos.y + Math.random() * 1.6, z: p.pos.z + (Math.random() - 0.5) * 0.6, vy: 0.8, life: 0.6, r: 0.6, g: 1.4, b: 2.2, size: 0.12, drag: 1, sizeEnd: 0.1 });
      if (w.t <= 0 || p.dead || p.downed) { p.object.scale.set(1, 1, 1); this.st.warped.delete(p); }
    }
  },
  onDeath() { for (const [p] of this.st.warped) p.object.scale.set(1, 1, 1); this.st.warped.clear(); },
  moves: {
    // 無為転変 Idle Transfiguration: a lunge and a palm on the soul
    *idle_transfiguration() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: false });
      const reach = 6 + this.phase;
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 2.2, length: reach, facing: this.facing, dur: 0.75, color: 0x7ad8ff });
      this.callout('Idle Transfiguration');
      for (let i = 0; i < 10; i++) { const h = this.rig.handR.getWorldPosition(V()); g.particles.glow.spawn({ pos: h, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, life: 0.4, r: 0.8, g: 1.6, b: 2.6, size: 0.18, drag: 3, sizeEnd: 0.05 }); }
      yield 0.75;
      const dir = this.fwd();
      const hit = yield* this.dash(dir, 30, 7, 1.1, this.dmg * 0.9, 3, { blocks: false });
      for (const p of hit) {
        if (p.dead) continue;
        this.st.warped.set(p, { t: 3, tick: 0.5 });
        g.fx.flash(SOUL, 0.3, 0.2); g.fx.chroma(1.2);
        g.particles.burst(p.pos.clone().setY(p.pos.y + 1.2), { count: 26, color: SOUL, speed: 5, life: 0.6, size: 0.16 });
        g.toast?.('Your soul was touched — your body warps');
      }
      this.free();
      yield 0.5;
    },
    // transfigured bone blades: a three-cut combo
    *blade_arms() {
      const g = this.game;
      this.rig.extras.bladeR.visible = this.rig.extras.bladeL.visible = true;
      this.callout('Transfiguration: Blade Arms');
      for (let k = 0; k < 3; k++) {
        const t = this.aim(); if (!t) break;
        this.still();
        const R = this.phase >= 2 ? 5.4 : 4.2;
        g.markers.spawn({ pos: this.gy(this.pos), radius: R, dur: 0.55, shape: 'cone', arc: 0.4, facing: this.facing, color: 0xff2a3a, follow: this });
        this.pose('attack', { t: 0.2, style: k % 2 ? 'swingL' : 'swingR', windup: 0.3, strike: 0.5 });
        yield 0.55;
        this.pose('attack', { t: 0.6, style: k % 2 ? 'swingL' : 'swingR', windup: 0.3, strike: 0.5 });
        g.fx.slashArc(this.pos, this.facing, 0x9ad8ff, R, 0.4, 0.18, k % 2 === 1);
        g.audio?.energy('slash');
        this.hurtCone(this.pos, this.facing, R + 0.4, 1.3, this.dmg, 7);
        this.knock.copy(this.fwd()).multiplyScalar(8);
        yield 0.25;
      }
      this.rig.extras.bladeR.visible = this.rig.extras.bladeL.visible = false;
      this.free();
      yield 0.5;
    },
    // Body Repel: spikes erupt from his whole body
    *body_repel() {
      const g = this.game; assets();
      this.still(); this.pose('raise');
      const R = 5.5;
      this.mark(this.pos, { radius: R, dur: 1.0, color: 0xff2a3a, follow: this });
      this.callout('Body Repel');
      yield 1.0;
      const grp = new THREE.Group(); grp.position.copy(this.pos).setY(this.pos.y + 1.8); this.addProp(grp);
      const spikes = [];
      for (let i = 0; i < 26; i++) {
        const m = new THREE.Mesh(spikeGeo, spikeMat); const a = i / 26 * Math.PI * 2 + Math.random() * 0.2, e = (Math.random() - 0.3) * 1.2;
        m.lookAt(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)); m.scale.set(1, 1, 0.01); grp.add(m); spikes.push(m);
      }
      g.fx.explosion(this.pos, 0x9ad8ff, R); g.shake(0.5); g.audio?.impact(1.6);
      this.hurt(this.pos, R, this.dmg * 1.2, 14);
      for (let k = 0; k <= 12; k++) { const s = k < 3 ? (k + 1) / 3 * 2.2 : Math.max(0.01, 2.2 * (1 - (k - 3) / 9)); for (const m of spikes) m.scale.z = s; yield 0.04; }
      this.removeProp(grp);
      this.free();
      yield 0.6;
    },
    // shrunken transfigured humans spat out, grown back into monsters
    *transfigured_humans() {
      const g = this.game;
      this.still(); this.pose('raise');
      this.callout('Transfigured Humans');
      const head = this.rig.head.getWorldPosition(V());
      for (let i = 0; i < 6; i++) g.particles.burst(head, { count: 4, color: FLESH, additive: false, speed: 6, up: 2, life: 0.6, size: 0.3, gravity: 14 });
      yield 0.5;
      this.summon('swarmer', 2 + this.phase, { name: 'Transfigured Human', color: SOUL });
      if (this.phase >= 1) this.summon('blob', 1, { name: 'Transfigured Human', color: SOUL, r0: 4, r1: 6 });
      yield 0.8;
      this.free();
    },
    // 多重魂 撥体 Polymorphic Soul Isomer: souls fused into one mass, hurled
    *polymorphic_soul_isomer() {
      const g = this.game, t = this.aim(); if (!t) return; assets();
      this.still(); this.pose('cast', { t: 1, both: true });
      this.callout('Polymorphic Soul Isomer', true);
      const L = 18, dir = this.fwd();
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 3.4, length: L, facing: this.facing, dur: 1.3, color: 0xff2a3a });
      const mass = new THREE.Group();
      for (let i = 0; i < 9; i++) { const s = 0.7 + Math.random() * 0.7; const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), massMat); m.position.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); mass.add(m); }
      mass.scale.setScalar(0.1); this.addProp(mass);
      const start = this.pos.clone().setY(this.pos.y + 2.4).addScaledVector(dir, 1.6);
      for (let k = 0; k < 13; k++) { mass.position.copy(start); mass.scale.setScalar(0.1 + k / 13 * 1.1); mass.rotation.y += 0.3; g.particles.burst(start, { count: 3, color: SOUL, speed: 2, life: 0.4, size: 0.2 }); yield 0.1; }
      g.audio?.whoosh(1.4);
      const pos = start.clone(); let exploded = false;
      for (let s = 0; s < L && !exploded; s += 1.2) {
        pos.addScaledVector(dir, 1.2); mass.position.copy(pos); mass.rotation.x += 0.4;
        for (const p of this.players()) if (p.pos.distanceTo(V(pos.x, p.pos.y, pos.z)) < 1.6) exploded = true;
        if (g.world.solidAt(pos.x, pos.y - 1, pos.z)) exploded = true;
        yield 0.03;
      }
      this.removeProp(mass);
      const at = this.gy(pos);
      g.fx.explosion(at, 0xd4a4b4, 4); g.fx.screenWave(at, 1, 0.5); g.shake(0.7);
      this.hurt(at, 4, this.dmg * 1.6, 14, { up: 6 });
      for (let i = 0; i < 10; i++) g.debris.spawn(at.clone().setY(at.y + 1), V((Math.random() - 0.5) * 10, 6 + Math.random() * 4, (Math.random() - 0.5) * 10), 0.4, new THREE.Color(0.8, 0.65, 0.62), 1.6);
      this.free();
      yield 0.8;
    },
    // 遍殺即霊体: Distorted Killing — a chain of slashing dashes in his true form
    *distorted_killing() {
      const g = this.game;
      this.callout('Distorted Killing');
      this.rig.extras.bladeR.visible = this.rig.extras.bladeL.visible = true;
      for (let k = 0; k < 3; k++) {
        const t = this.aim(); if (!t) break;
        this.still(); this.pose('attack', { t: 0.15, style: 'spin', windup: 0.3, strike: 0.6 });
        g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 3.2, length: 12, facing: this.facing, dur: 0.6, color: 0xff2a3a });
        yield 0.6;
        const dir = this.fwd();
        yield* this.dash(dir, 34, 9, 1.6, this.dmg * 1.1, 10, { trail: () => { g.fx.slashArc(this.pos, this.facing + Math.PI / 2, 0x9ad8ff, 2.6, 0.5, 0.15); } });
        g.audio?.energy('slash');
        yield 0.2;
      }
      this.rig.extras.bladeR.visible = this.rig.extras.bladeL.visible = false;
      this.free();
      yield 0.6;
    },
  },
};
