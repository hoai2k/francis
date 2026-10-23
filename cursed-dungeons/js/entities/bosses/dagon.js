// DAGON — Special Grade Cursed Spirit, born from humanity's fear of the sea,
// matured out of its cursed-womb shell in Shibuya. Technique: water and fish
// shikigami.
//   Death Swarm       schools of fish shikigami pour out of water portals and home in
//   Tidal Wave        a wall of sea sweeps across the arena (find the gap)
//   Water Spout       geysers burst under the sorcerers
//   Tentacle Lash     the tentacles of its face whip in a wide arc
//   Horizon of the Captivating Skandha (phase 3) its Domain Expansion: a
//                     tropical shore under a blue sky; the shikigami never stop
import * as THREE from 'three/webgpu';
import { Skin, Rig, PX } from '../character.js';
import { pixMat, glowMat, waterMat, groundFX, Parts, M4, grp, face, ring, paintBox, finishMaterial, HS, rate, rnd } from '../boss-looks.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SEA = 0x3ab8ff, FOAM = 0xc8f4ff;
const FISH = [0x5ad8ff, 0xffb84a, 0xff6a8a, 0x7affc8, 0xc89aff];
const v1 = new THREE.Vector3();

// =====================================================================
// look: a hulking maroon body, a great octopus head, tentacles for a beard
// =====================================================================
export function buildDagon() {
  const S = new Skin(4747);
  const SK = 0x8e2c2a, SK2 = 0x6e1e1e, SK3 = 0xb4584a, SPOT = 0x5a1414, BELLY = 0xc87a62, EYE = 0xffe04a;
  const spots = (k, n) => { const [x, y, w, h] = face(k).ring; for (let i = 0; i < n; i++) S.rect(x + Math.floor(S.r() * (w - 1)), y + Math.floor(S.r() * (h - 1)), 1 + (S.r() < 0.4 ? 1 : 0), 1, SPOT, 0.05); };
  S.mat = 'flesh'; for (const k of ['head', 'body', 'armR', 'armL', 'legR', 'legL']) paintBox(S, k, SK, 0.05);
  spots('head', 8); spots('body', 10); spots('armR', 6); spots('armL', 6); spots('legR', 5); spots('legL', 5);
  S.rect(8, 0, 8, 8, SK2, 0.06);
  // face: small yellow eyes set deep, a heavy brow; the rest is tentacles (3D)
  S.mat = 'flesh'; S.rect(8, 8, 8, 2, SK2, 0.05); S.rect(8, 12, 8, 4, SK3, 0.05);
  S.mat = 'eye'; S.rect(9, 10, 2, 1, 0x140806, 0.02); S.rect(13, 10, 2, 1, 0x140806, 0.02);
  S.px(10, 10, EYE); S.px(13, 10, EYE); S.fine(10, 10, 0xffffff); S.fine(13.5, 10, 0xffffff);
  // belly and chest plates
  { const [fx, fy] = face('body').front; S.mat = 'flesh'; S.rect(fx + 1, fy + 3, 6, 9, BELLY, 0.05); for (let y = 4; y < 12; y += 2) S.fineRect(fx + 1, fy + y, 6, 0.5, 0xa85a48, 'flesh'); }
  { const [x, y, w] = face('jacket').ring; S.ctx.clearRect(x, y, w, 12); const t = face('jacket').top; S.ctx.clearRect(t[0], t[1], 8, 4); }
  for (const ko of ['armRo', 'armLo']) { const f = face(ko); S.ctx.clearRect(f.ring[0], f.ring[1], f.ring[2], 12); S.ctx.clearRect(f.top[0], f.top[1], 4, 4); S.ctx.clearRect(f.bottom[0], f.bottom[1], 4, 4); }
  // suckered forearms
  for (const k of ['armR', 'armL']) { const f = face(k); for (let i = 0; i < 4; i++) S.rect(f.front[0] + 1, f.front[1] + 5 + i * 2, 2, 1, BELLY, 0.04); }
  const m = finishMaterial(S, { emit: 2.2, fill: 0.13, rim: 0x6ad8ff, rimStrength: 0.45 });
  const flesh = pixMat(SK, { noise: 0.12, rim: 0x6ad8ff, rimStrength: 0.4 }), fleshD = pixMat(SK2, { noise: 0.12 }), fleshL = pixMat(SK3, { noise: 0.1 }), belly = pixMat(BELLY, { noise: 0.08 });
  const tent = Skin.hairMaterial(0x9a3430), tentL = Skin.hairMaterial(0xb4584a);
  // tentacles hang from the lower face and swing like hair (spring physics)
  const hair = [];
  for (let i = 0; i < 7; i++) { const x = -3.3 + i * 1.1; hair.push({ x, y: 2.6, z: 4.3, w: 1.0, h: 7 + (i % 3) * 2.2 + (i === 3 ? 3 : 0), d: 1.0, hang: true, material: i % 2 ? tentL : tent, stiff: 14 + i % 3 * 4 }); }
  for (const sx of [-1, 1]) hair.push({ x: sx * 4.2, y: 2.4, z: 2.6, w: 1.0, h: 8, d: 1.0, hang: true, material: tent, stiff: 16 });
  const rig = new Rig({ material: m, scale: 2.4, hair, headS: 9 });
  const P = new Parts(rig);
  // the bulbous octopus head swelling up and back
  const top = 9 * HS;
  // a mantle that swells wider than the face and sags back like an octopus
  P.box(rig.head, 11, 3, 11, flesh, M4(0, top + 0.4, -0.8)); P.box(rig.head, 12.4, 3.4, 12, fleshD, M4(0, top + 2.6, -2.2, -0.25, 0, 0));
  P.box(rig.head, 11.6, 3.2, 11, flesh, M4(0, top + 4.2, -4.4, -0.45, 0, 0)); P.box(rig.head, 9, 2.6, 8.4, fleshD, M4(0, top + 5.2, -7, -0.6, 0, 0));
  P.box(rig.head, 6, 2, 5.6, flesh, M4(0, top + 5.6, -9.2, -0.75, 0, 0));
  P.box(rig.head, 10, 1.4, 1.2, fleshD, M4(0, 8.2, 4.4));                         // the heavy brow
  for (const [x, y, z] of [[3.4, top + 1.6, 4.8], [-2.6, top + 3.4, 3.4], [1.2, top + 4.6, 1.6], [-6.2, top + 2.2, -2], [6.2, top + 3.6, -3], [-3, top + 5.6, -5.4], [2.6, top + 6.2, -6.8]]) P.box(rig.head, 1.4, 1.4, 0.8, fleshL, M4(x, y, z));
  // hulking shoulders and arms
  P.box(rig.torso, 12, 4, 6.4, flesh, M4(0, 11, -0.4)); P.box(rig.torso, 9, 4, 1.2, belly, M4(0, 5, 2.4));
  for (const arm of [rig.armR, rig.armL]) { P.box(arm, 6.4, 5, 6.4, flesh, M4(0, 0, 0)); P.box(arm, 5.6, 5, 5.6, fleshD, M4(0, -5.4, 0)); }
  for (const hand of [rig.handR, rig.handL]) { P.box(hand, 6, 3.6, 6, flesh, M4(0, 0.4, 0)); for (let i = 0; i < 3; i++) P.box(hand, 1.2, 3, 1.2, fleshL, M4(-1.6 + i * 1.6, -2.6, 1.8, 0.3, 0, 0)); }
  for (const leg of [rig.legR, rig.legL]) { P.box(leg, 5.4, 7, 5.4, flesh, M4(0, -4, 0)); P.box(leg, 6, 1.6, 7, fleshD, M4(0, -11.2, 1)); }
  P.flush();
  // a ring of water swirling round its waist
  const swirlM = waterMat(0x0a4a8a, FOAM, { opacity: 0.65, emissive: 0.6 });
  const swirl = new THREE.Group(); rig.root.add(swirl);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const s = rig.mesh(new THREE.BoxGeometry(5 * PX, 1.2 * PX, 2 * PX), swirlM); s.castShadow = false; s.position.set(Math.cos(a) * 11 * PX, (8 + (i % 3)) * PX, Math.sin(a) * 11 * PX); s.rotation.y = -a; swirl.add(s); }
  const fx = groundFX(rig, SEA, 1.5);
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    swirl.rotation.y += dt * 1.6; swirl.position.y = Math.sin(t * 1.4) * 0.1;
    m.userData.emitMask.value = 2 + Math.sin(t * 2.2) * 0.6;
    if (b.lightH) { b.lightH.intensity = 3.4 + Math.sin(t * 1.8) * 0.5; b.lightH.offsetY = 6.5; }
    // dripping water and bubbles
    for (let i = rate(10, dt, bud); i > 0; i--) Pt.glow.spawn({ x: b.pos.x + rnd(1.3), y: b.pos.y + 1 + Math.random() * 4, z: b.pos.z + rnd(1.3), vy: -1, life: 0.7, r: 0.5, g: 1.4, b: 2.2, size: 0.06, gravity: 12, drag: 0.2, sizeEnd: 0.6, shape: 'square' });
    for (let i = rate(4, dt, bud); i > 0; i--) Pt.glow.spawn({ x: b.pos.x + rnd(1.6), y: b.pos.y + Math.random() * 3, z: b.pos.z + rnd(1.6), vx: rnd(0.2), vy: 0.8, vz: rnd(0.2), life: 1.6, r: 0.8, g: 1.6, b: 2, size: 0.12, gravity: -0.5, drag: 1, sizeEnd: 0.5, shape: 'ring' });
  };
  rig.fx = fx;
  return rig;
}

// fish shikigami (pooled projectiles) launched from a point, homing on a target
function fish(b, from, target, speed = 9, dmg = 0.4) {
  const g = b.game, col = FISH[Math.floor(Math.random() * FISH.length)];
  const a = Math.random() * Math.PI * 2;
  return g.projectiles.fire({ pos: from.clone(), vel: V(Math.cos(a) * speed * 0.6, 3 + Math.random() * 3, Math.sin(a) * speed * 0.6), team: 'enemy', dmg: b.dmg * dmg, shape: 'arrow', color: col, emissive: 2, life: 3.2, homing: 2.4, target, scale: 0.55, radius: 0.4,
    trail: (pr) => { if (Math.random() < 0.5) g.particles.glow.spawn({ pos: pr.pos, vy: 0.2, life: 0.35, r: 0.6, g: 1.6, b: 2.4, size: 0.1, drag: 1, sizeEnd: 0.05, shape: 'ring' }); },
    onHit: (p, pr) => { p.takeDamage(b.dmg * dmg, b, { knock: pr.vel.clone().setY(0).setLength(3) }); g.fx.splash(pr.pos, 0.6); },
    onExpire: (pr) => g.fx.splash(pr.pos, 0.5) });
}
// a water portal on the ground that the fish pour out of
function portal(b, at, dur = 2.4) {
  const g = b.game;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 20), waterMat(0x062a5a, SEA, { emissive: 1.2 })); m.position.copy(at).setY(at.y + 0.06); m.scale.setScalar(0.01); b.addProp(m);
  let t = 0;
  b.task((function* () { while (t < dur) { const dt = yield 0; t += dt ?? 0.016; m.scale.setScalar(Math.min(1, t * 4) * (t > dur - 0.3 ? (dur - t) / 0.3 : 1) + 0.01); m.rotation.y += 0.05; } b.removeProp(m); })());
}

export const dagon = {
  name: 'Dagon', hudName: 'Dagon · Special Grade Cursed Spirit', title: 'DAGON · SPECIAL GRADE CURSED SPIRIT',
  hp: 3000, speed: 2.6, dmg: 22, color: SEA, radius: 1.3, height: 4.8, keepDist: 4,
  build: buildDagon,
  phaseNames: ['', 'DAGON · THE SEA RISES', 'DOMAIN EXPANSION · HORIZON OF THE CAPTIVATING SKANDHA'],
  phaseMove: { 2: 'horizon_of_the_captivating_skandha' },
  phases: [
    ['death_swarm', 'tentacle_lash', 'water_spout', 'death_swarm'],
    ['death_swarm', 'tidal_wave', 'water_spout', 'tentacle_lash'],
    ['tidal_wave', 'death_swarm', 'water_spout', 'tentacle_lash', 'horizon_of_the_captivating_skandha'],
  ],
  tick(dt) { this.st.domainCd = Math.max(0, (this.st.domainCd ?? 0) - dt); },
  moves: {
    // 死累累湧軍 Death Swarm: schools of fish pour from water portals and home in
    *death_swarm() {
      const g = this.game;
      this.still(); this.pose('raise');
      this.callout('Death Swarm');
      const ports = [];
      for (let i = 0; i < 3 + this.phase; i++) { const s = this.around(this.pos, 2.5, 6, i / (3 + this.phase) * Math.PI * 2 + Math.random()); portal(this, s, 2.6); ports.push(s); }
      g.audio?.energy('summon');
      yield 0.6;
      const targets = this.players();
      for (let w = 0; w < 4; w++) {
        for (const s of ports) { const tg = targets[Math.floor(Math.random() * targets.length)]; if (tg) fish(this, s.clone().setY(s.y + 0.5), tg); }
        g.audio?.energy('spit');
        yield 0.32;
      }
      this.free();
      yield 0.6;
    },
    // a wall of sea sweeps the arena; one gap is safe
    *tidal_wave() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('raise');
      this.callout('Tidal Wave', true);
      const a = this.arena, dir = V(t.pos.x - a.c.x, 0, t.pos.z - a.c.z); if (dir.lengthSq() < 0.01) dir.set(0, 0, 1); dir.normalize();
      const side = V(dir.z, 0, -dir.x);
      const start = a.c.clone().addScaledVector(dir, -a.R - 1), L = a.R * 2 + 2, half = a.R + 2;
      const gap = (Math.random() - 0.5) * a.R * 1.2, gw = 1.8;
      // two strips of warning either side of the gap
      const wA = (half - (gap + gw)), wB = (gap - gw + half);
      const cA = start.clone().addScaledVector(side, gap + gw + wA / 2), cB = start.clone().addScaledVector(side, gap - gw - wB / 2);
      const facing = Math.atan2(dir.x, dir.z);
      g.markers.spawn({ pos: this.gy(cA), shape: 'rect', width: wA, length: L, facing, dur: 1.6, color: 0x3a8aff });
      g.markers.spawn({ pos: this.gy(cB), shape: 'rect', width: wB, length: L, facing, dur: 1.6, color: 0x3a8aff });
      yield 1.6;
      const wm = waterMat(0x0a4a8a, FOAM, { opacity: 0.8, emissive: 0.7 });
      const wave = new THREE.Group();
      const mA = new THREE.Mesh(new THREE.BoxGeometry(wA, 3.2, 1.6), wm), mB = new THREE.Mesh(new THREE.BoxGeometry(wB, 3.2, 1.6), wm);
      mA.position.set(gap + gw + wA / 2, 1.6, 0); mB.position.set(gap - gw - wB / 2, 1.6, 0); wave.add(mA, mB);
      wave.rotation.y = facing; this.addProp(wave);
      g.audio?.noise?.({ dur: 2.2, gain: 0.5, type: 'lowpass', freq: 600, sweep: 2000, attack: 0.3, rev: 0.4 });
      const hit = new Set();
      for (let s = 0; s <= L; s += 0.9) {
        const c = start.clone().addScaledVector(dir, s); wave.position.copy(c).setY(a.c.y);
        for (const p of this.players()) {
          if (hit.has(p)) continue;
          const rel = V().subVectors(p.pos, c); const along = rel.dot(dir), lat = rel.dot(side);
          if (Math.abs(along) < 1.2 && Math.abs(lat - gap) > gw - 0.2) { hit.add(p); p.takeDamage(this.dmg * 1.1, this, { knock: dir.clone().multiplyScalar(14).setY(6) }); g.fx.splash(p.pos, 2); }
        }
        if (Math.random() < 0.8) for (let i = 0; i < 4; i++) { const q = c.clone().addScaledVector(side, (Math.random() - 0.5) * half * 2); if (Math.abs(q.clone().sub(c).dot(side) - gap) > gw) g.particles.burst(q.setY(a.c.y + 3), { count: 2, color: FOAM, speed: 3, up: 2, life: 0.5, size: 0.2, gravity: 10 }); }
        yield 0.04;
      }
      this.removeProp(wave);
      this.free();
      yield 0.6;
    },
    // geysers burst under the sorcerers
    *water_spout() {
      const g = this.game;
      this.still(); this.pose('attack', { t: 0.25, style: 'slam', windup: 0.3, strike: 0.5 });
      this.callout('Water Spout');
      const spots = this.players().map((p) => this.gy(p.pos));
      for (let i = 0; i < 2 + this.phase; i++) spots.push(this.around(this.arena.c, 2, this.arena.R - 1));
      for (const s of spots) this.mark(s, { radius: 2, dur: 1.0, color: 0x3a8aff });
      yield 1.0;
      this.free();
      for (const s of spots) {
        for (let i = 0; i < 30 * (g.particles.budget ?? 1); i++) g.particles.glow.spawn({ x: s.x + (Math.random() - 0.5) * 1.2, y: s.y + 0.3, z: s.z + (Math.random() - 0.5) * 1.2, vx: (Math.random() - 0.5) * 2, vy: 10 + Math.random() * 8, vz: (Math.random() - 0.5) * 2, life: 1, r: 0.6, g: 1.6, b: 2.4, size: 0.22, gravity: 18, drag: 0.3, sizeEnd: 0.6, shape: 'square' });
        g.fx.splash(s, 3); g.fx.shockwave(s, SEA, 2.4);
        this.hurt(s, 2, this.dmg * 0.95, 3, { up: 13 });
        yield 0.05;
      }
      g.audio?.impact(1.2);
      yield 0.6;
    },
    // the tentacles of its face whip in a wide arc
    *tentacle_lash() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      const R = 5.2;
      g.markers.spawn({ pos: this.gy(this.pos), radius: R, dur: 0.7, shape: 'cone', arc: 0.55, facing: this.facing, color: 0xff3a2a, follow: this });
      this.pose('attack', { t: 0.2, style: 'swingL', windup: 0.3, strike: 0.5 });
      this.callout('Tentacle Lash');
      yield 0.7;
      this.pose('attack', { t: 0.6, style: 'swingL', windup: 0.3, strike: 0.5 });
      g.fx.slashArc(this.pos, this.facing, 0xb4584a, R, 0.55, 0.22); g.fx.slashArc(this.pos, this.facing, FOAM, R * 0.8, 0.55, 0.2, true);
      g.audio?.whoosh(1.5); g.audio?.impact(1.3);
      this.hurtCone(this.pos, this.facing, R, 1.6, this.dmg, 10);
      this.free();
      yield 0.6;
    },
    // 領域展開「蕩蘊平線」 Horizon of the Captivating Skandha
    *horizon_of_the_captivating_skandha() {
      const g = this.game;
      if (this.st.domainCd > 0 || g.domain) { yield* this.B.moves.death_swarm.call(this); return; }
      this.still(); this.pose('sign');
      const ok = this.domain({ name: 'Horizon of the Captivating Skandha', key: 'resonance', type: 6, color: SEA, sound: 'resonance', flash: 0xc8f4ff, duration: 8, radius: 24,
        look: { floor: 0xe8d29a, seam: 0x5ad8ff, sparkle: 0xffffff, skyTop: 0x1a6ad8, skyHorizon: 0xbfeaff, stars: 0, band: 0x2aa8ff } });
      if (!ok) { this.free(); return; }
      this.st.domainCd = 34;
      yield 1.6;
      // sure-hit shikigami: fish without end, from everywhere
      let n = 0;
      while (g.domain?.caster === this) {
        for (const p of this.players()) {
          const a = Math.random() * 6.28, from = this.gy(p.pos.clone().add(V(Math.cos(a) * 7, 0, Math.sin(a) * 7))).setY(p.pos.y + 1);
          fish(this, from, p, 11, 0.25);
        }
        if (++n % 10 === 0) {   // and the sea erupts under them now and then
          const spots = this.players().map((p) => this.gy(p.pos));
          for (const s of spots) this.mark(s, { radius: 2, dur: 0.9, color: 0x3a8aff });
          const self = this;
          this.task((function* () { yield 0.9; for (const s of spots) { g.fx.splash(s, 3); g.fx.shockwave(s, SEA, 2.4); self.hurt(s, 2, self.dmg * 0.8, 3, { up: 12 }); } })());
        }
        yield 0.22;
      }
      this.free();
      yield 0.4;
    },
  },
};
