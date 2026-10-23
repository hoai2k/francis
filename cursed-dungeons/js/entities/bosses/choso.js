// CHOSO — the eldest of the Death Painting Wombs, at Shibuya Station on the
// Fukutoshin Line. Technique: Blood Manipulation (inherited from the Kamo clan).
//   Piercing Blood   compressed blood fired faster than sound: a line on the
//                    ground tracks you, locks, then the beam fires
//   Convergence      blood squeezed between the palms: a huge, sweeping Piercing Blood
//   Supernova        blood orbs hang around the arena and burst into spikes
//   Slicing Exorcism two spinning discs of blood fly out and come back
//   Blood Edge       hardened blood along the forearm, a three-cut combo
//   Flowing Red Scale  blood pressure surges: faster and stronger for a while
import * as THREE from 'three/webgpu';
import { Skin, Rig, PX } from '../character.js';
import { pixMat, glowMat, bloodMat, groundFX, Parts, M4, grp, face, ring, paintBox, finishMaterial, HS, rate, rnd } from '../boss-looks.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const BLOOD = 0xd0102a, CORE = 0xffb0b8;
const v1 = new THREE.Vector3();

// =====================================================================
// look: pale kimono top, purple sash and hakama, two black tufts, the blood band
// =====================================================================
export function buildChoso() {
  const S = new Skin(9090);
  const SK = 0xecc8ae, SK2 = 0xd6ae94, HAIR = 0x141216, TOP = 0xe6ded0, TOP2 = 0xcfc6b6, SASH = 0x3a2048, SASH2 = 0x24142e, PANTS = 0x2e2238, PANTS2 = 0x221a2a, BAND = 0x2a0a10;
  S.mat = 'skin'; paintBox(S, 'head', SK, 0.04);
  S.mat = 'hair'; S.rect(8, 0, 8, 8, HAIR, 0.1);
  S.rect(0, 8, 8, 2, HAIR, 0.1); S.rect(16, 8, 8, 2, HAIR, 0.1); S.rect(24, 8, 8, 5, HAIR, 0.1);
  S.rect(8, 8, 8, 1, HAIR, 0.1); S.rect(8, 9, 1, 2, HAIR, 0.1); S.rect(15, 9, 1, 2, HAIR, 0.1);
  for (const x of [9, 11, 12, 14]) S.fineRect(x + 0.25, 9, 0.5, 0.75, HAIR, 'hair');
  S.mat = 'eye';
  S.rect(9, 11, 2, 1, 0xf2eee6, 0.02); S.rect(13, 11, 2, 1, 0xf2eee6, 0.02);
  S.px(10, 11, 0x3a1a10); S.px(13, 11, 0x3a1a10);
  S.fineRect(9, 10.5, 2, 0.5, 0x1a1214); S.fineRect(13, 10.5, 2, 0.5, 0x1a1214);
  S.fineRect(9, 11.75, 2, 0.25, 0x7a5a50); S.fineRect(13, 11.75, 2, 0.25, 0x7a5a50);   // tired eyes
  S.mat = 'skin'; S.fineRect(8, 12.25, 8, 0.5, BAND, 'skin'); S.fineRect(4, 12.25, 4, 0.5, BAND, 'skin'); S.fineRect(16, 12.25, 4, 0.5, BAND, 'skin');   // the band across the nose
  S.fineRect(11.5, 12, 1, 0.25, SK2, 'skin');
  S.fineRect(10.5, 14.5, 3, 0.5, 0x8a5a50, 'skin');
  // kimono top with crossed collar, sash, hakama
  S.mat = 'skin'; paintBox(S, 'body', SK, 0.04);
  S.mat = 'cloth'; paintBox(S, 'jacket', TOP, 0.05);
  { const [fx, fy] = face('jacket').front;
    for (const [r, x, w] of [[0, 2, 4], [1, 3, 2], [2, 3, 2], [3, 4, 1]]) { S.ctx.clearRect(fx + x, fy + r, w, 1); S.px(fx + x - 1, fy + r, TOP2); S.px(fx + x + w, fy + r, TOP2); }
    for (let r = 4; r < 8; r++) S.fineRect(fx + 4 - (r - 4) * 0.4, fy + r, 0.5, 1, TOP2, 'cloth');
    for (const [x, y] of [[fx + 1, fy + 3], [fx + 6, fy + 4], [fx + 2, fy + 7]]) S.fineRect(x, y, 0.5, 3, TOP2, 'cloth'); }
  ring(S, 'jacket', 8, 2, SASH, 0.06); { const [x, y, w] = face('jacket').ring; S.fineRect(x, y + 8, w, 0.5, 0x5a3a6a, 'cloth'); }
  { const [x, y, w] = face('jacket').ring; S.rect(x, y + 10, w, 2, PANTS, 0.06); }
  for (const [k, ko] of [['armR', 'armRo'], ['armL', 'armLo']]) {
    S.mat = 'skin'; paintBox(S, k, SK, 0.04);
    S.mat = 'cloth'; const fo = face(ko); S.rect(fo.top[0], fo.top[1], 4, 4, TOP, 0.05); S.rect(fo.ring[0], fo.ring[1], fo.ring[2], 9, TOP, 0.05);
    for (let i = 1; i < 16; i += 4) S.fineRect(fo.ring[0] + i, fo.ring[1] + 1, 0.5, 7, TOP2, 'cloth');
    S.rect(fo.ring[0], fo.ring[1] + 9, fo.ring[2], 1, TOP2, 0.04);
  }
  for (const k of ['legR', 'legL']) {
    S.mat = 'cloth'; paintBox(S, k, PANTS, 0.06); const f = face(k);
    for (let i = 1; i < 16; i += 3) S.fineRect(f.ring[0] + i, f.ring[1], 0.5, 10, PANTS2, 'cloth');
    S.mat = 'leather'; S.rect(f.ring[0], f.ring[1] + 10, 16, 2, 0x141014, 0.05); S.rect(f.bottom[0], f.bottom[1], 4, 4, 0x141014, 0.05);
  }
  const m = finishMaterial(S, { emit: 0.8, fill: 0.13, rim: 0xff3a4a, rimStrength: 0.4 });
  const hair = Skin.hairMaterial(HAIR);
  const rig = new Rig({ material: m, scale: 2.0, hair: [
    { x: -2.4, y: 8.0, z: -1.2, w: 2.2, h: 3.6, d: 2.2, rx: -0.35, rz: 0.35, material: hair, stiff: 50 },
    { x: 2.4, y: 8.0, z: -1.2, w: 2.2, h: 3.6, d: 2.2, rx: -0.35, rz: -0.35, material: hair, stiff: 50 },
    { x: -2.6, y: 9.4, z: -1.8, w: 1.4, h: 2.4, d: 1.4, rx: -0.6, rz: 0.9, material: hair, stiff: 40 },
    { x: 2.6, y: 9.4, z: -1.8, w: 1.4, h: 2.4, d: 1.4, rx: -0.6, rz: -0.9, material: hair, stiff: 40 },
    { x: 0, y: 8.1, z: 1.4, w: 7.4, h: 1.2, d: 3.6, rx: 0.3, material: hair, stiff: 80 },
  ] });
  const P = new Parts(rig);
  const top = pixMat(TOP, { noise: 0.06, rim: 0xff4a5a, rimStrength: 0.3 }), top2 = pixMat(TOP2, { noise: 0.06 }), sash = pixMat(SASH, { noise: 0.08 }), sash2 = pixMat(SASH2, { noise: 0.08 }), pants = pixMat(PANTS, { noise: 0.08 });
  const blood = bloodMat(BLOOD, { emissive: 0.6 }), core = glowMat(CORE, 2.4, { pulse: 6 });
  // wide sleeves and hakama (inflated overlay regions)
  rig.armR.add(rig.mesh(new THREE.BoxGeometry(5.6 * PX, 7 * PX, 5.6 * PX).translate(0, -3 * PX, 0), top));
  rig.armL.add(rig.mesh(new THREE.BoxGeometry(5.6 * PX, 7 * PX, 5.6 * PX).translate(0, -3 * PX, 0), top));
  for (const leg of [rig.legR, rig.legL]) { P.box(leg, 5.4, 8, 5.4, pants, M4(0, -4.2, 0)); }
  P.box(rig.hips, 9.4, 2.2, 5.4, pants, M4(0, 0.2, 0));
  // sash knot at the back and its tails
  P.box(rig.torso, 3, 2.2, 1.4, sash, M4(0, 3, -2.6)); const tails = grp(rig.torso, 0, 2.2, -2.9);
  P.box(tails, 1.2, 5, 0.4, sash2, M4(-0.6, -2.5, 0, 0, 0, 0.06)); P.box(tails, 1.2, 4, 0.4, sash, M4(0.7, -2, 0, 0, 0, -0.08));
  // blood spheres held at the palms
  for (const hand of [rig.handR, rig.handL]) { P.box(hand, 1.8, 1.8, 1.8, blood, M4(0, -1.4, 1.8)); }
  // Blood Edge on the right forearm (hidden), veins for Flowing Red Scale
  const edge = grp(rig.handR, 0, 2, 2.4); edge.visible = false;
  P.box(edge, 0.7, 14, 1.8, blood, M4(0, -5, 0)); P.box(edge, 0.3, 14, 0.4, core, M4(0, -5, 0.9));
  P.flush();
  // orbiting blood orbs (Supernova reserve)
  const orbs = [];
  const orbG = new THREE.BoxGeometry(1.4 * PX, 1.4 * PX, 1.4 * PX);
  for (let i = 0; i < 4; i++) { const o = rig.mesh(orbG, blood); rig.root.add(o); orbs.push(o); }
  const fx = groundFX(rig, BLOOD, 1.2);
  let scale = 0;
  rig.extras.edge = edge;
  rig.extras.scale = (on) => { scale = on ? 1 : 0; };
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    tails.rotation.x = 0.1 + Math.sin(t * 2) * 0.06 + Math.min(1, b.vel.length() / 4) * 0.4;
    for (let i = 0; i < orbs.length; i++) { const a = t * 1.4 + i / orbs.length * Math.PI * 2; orbs[i].position.set(Math.cos(a) * 16 * PX, (22 + Math.sin(t * 2 + i) * 2) * PX, Math.sin(a) * 16 * PX); orbs[i].rotation.set(t * 2, t * 3, 0); }
    m.userData.emitMask.value = 0.8 + scale * 2;
    m.userData.glow.value.setRGB(0.25 * scale, 0.0, 0.02 * scale);
    if (b.lightH) { b.lightH.intensity = 3 + scale * 3; b.lightH.offsetY = 5.2; }
    // dripping blood, and steam off him while Flowing Red Scale burns
    if (Math.random() < dt * 3) { (Math.random() < 0.5 ? rig.handR : rig.handL).getWorldPosition(v1); Pt.glow.spawn({ x: v1.x, y: v1.y - 0.1, z: v1.z, vy: -1, life: 0.8, r: 1.6, g: 0.05, b: 0.1, size: 0.08, gravity: 14, drag: 0.2, sizeEnd: 0.6, shape: 'square' }); }
    if (scale) for (let i = rate(14, dt, bud); i > 0; i--) { Pt.smoke.spawn({ x: b.pos.x + rnd(0.7), y: b.pos.y + 1 + Math.random() * 2.5, z: b.pos.z + rnd(0.7), vx: rnd(0.3), vy: 1.2, vz: rnd(0.3), life: 1, r: 0.7, g: 0.62, b: 0.62, size: 0.3, gravity: -0.5, drag: 1.2, sizeEnd: 2 }); Pt.glow.spawn({ x: b.pos.x + rnd(0.6), y: b.pos.y + Math.random() * 3.5, z: b.pos.z + rnd(0.6), vy: 1, life: 0.6, r: 2.4, g: 0.1, b: 0.2, size: 0.1, drag: 1, sizeEnd: 0.1 }); }
  };
  rig.fx = fx;
  return rig;
}

// a Piercing Blood beam: a near-instant line with a white-hot core
function beamFx(b, from, dir, len, width) {
  const g = b.game;
  g.fx.slashLine(from, dir, len, 0xffffff, width * 0.5, 0.28);
  g.fx.slashLine(from, dir, len, BLOOD, width, 0.4);
  g.fx.slashLine(from.clone().setY(from.y + 0.05), dir, len, 0xff4a5a, width * 1.6, 0.25, Math.PI / 2);
  for (let s = 0; s < len; s += 1.4) g.particles.burst(from.clone().addScaledVector(dir, s), { count: 2, color: BLOOD, speed: 3, life: 0.4, size: 0.18, shape: 1 });
  g.lights.flash(from.clone().addScaledVector(dir, len * 0.4), BLOOD, 10, 16, 0.2);
  g.audio?.energy('red');
  for (let s = 2; s < len; s += 2.5) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(from.y - 1), dir, 0.8, Math.PI, 70, null);
}

export const choso = {
  name: 'Choso', hudName: 'Choso · Death Painting Womb No. 1', title: 'CHOSO · DEATH PAINTING WOMB No. 1',
  hp: 3000, speed: 3.6, dmg: 23, color: BLOOD, radius: 0.9, height: 3.9, keepDist: 6,
  build: buildChoso,
  phaseNames: ['', 'CHOSO · "I AM THE BIG BROTHER"', 'FLOWING RED SCALE'],
  phaseMove: { 2: 'flowing_red_scale' },
  reset() { this.rig.extras.edge.visible = false; },
  phases: [
    ['piercing_blood', 'slicing_exorcism', 'blood_edge', 'piercing_blood'],
    ['piercing_blood', 'convergence', 'supernova', 'slicing_exorcism', 'blood_edge'],
    ['convergence', 'supernova', 'piercing_blood', 'blood_edge', 'flowing_red_scale', 'slicing_exorcism'],
  ],
  tick(dt) {
    if (this.st.scaleT > 0) { this.st.scaleT -= dt; if (this.st.scaleT <= 0) { this.speedMul = 1; this.dmg = this.st.baseDmg ?? this.dmg; this.rig.extras.scale(false); } }
  },
  moves: {
    // 穿血 Piercing Blood: the line tracks you, locks, then fires
    *piercing_blood(big = false) {
      const g = this.game;
      const shots = big ? 1 : 1 + (this.phase >= 1 ? 1 : 0) + (this.st.scaleT > 0 ? 1 : 0);
      for (let s = 0; s < shots; s++) {
        const t = this.aim(); if (!t) break;
        this.still(); this.pose('sign');
        this.callout(big ? 'Convergence · Piercing Blood' : 'Piercing Blood');
        const L = big ? 30 : 24, W = big ? 2.6 : 1.1;
        const mk = g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: W, length: L, facing: this.facing, dur: big ? 1.6 : 1.0, color: 0xff2a3a, follow: this });
        const track = big ? 10 : 6;
        for (let k = 0; k < track; k++) {
          const tg = this.target(); if (tg) this.aim(tg);
          mk.mesh.rotation.z = this.facing + Math.PI; mk.offset.set(Math.sin(this.facing) * L / 2, 0.05, Math.cos(this.facing) * L / 2);
          const h = this.rig.handR.getWorldPosition(V()); g.particles.burst(h, { count: 3, color: BLOOD, speed: 1.5, life: 0.3, size: 0.16 });
          yield 0.1;
        }
        yield big ? 0.55 : 0.35;        // locked
        this.pose('cast', { t: 1, both: true });
        const dir = this.fwd(), from = this.pos.clone().setY(this.pos.y + 1.6).addScaledVector(dir, 0.8);
        beamFx(this, from, dir, L, W);
        this.hurtLine(this.pos, dir, L, W / 2 + 0.1, this.dmg * (big ? 1.8 : 1.0), big ? 10 : 6);
        g.shake(big ? 0.7 : 0.3);
        if (big) {   // the beam sweeps across after it fires
          for (let k = 0; k < 8; k++) { this.facing += 0.07; const d2 = this.fwd(); beamFx(this, from, d2, L, W * 0.8); this.hurtLine(this.pos, d2, L, W / 2, this.dmg * 0.4, 6); yield 0.06; }
        }
        yield 0.35;
      }
      this.free();
      yield 0.4;
    },
    // 百斂 Convergence: blood squeezed between the palms, then a huge Piercing Blood
    *convergence() {
      const g = this.game;
      this.still(); this.pose('sign');
      this.callout('Convergence');
      g.audio?.charge(0.9, 0.7);
      for (let k = 0; k < 9; k++) { const h = this.rig.handR.getWorldPosition(V()); for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, r = 1.6; g.particles.glow.spawn({ x: h.x + Math.cos(a) * r, y: h.y + (Math.random() - 0.5), z: h.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 3, vz: -Math.sin(a) * r * 3, life: 0.3, r: 2, g: 0.05, b: 0.1, size: 0.14, sizeEnd: 0.05 }); } yield 0.1; }
      yield* this.B.moves.piercing_blood.call(this, true);
    },
    // 超新星 Supernova: blood orbs hang in the air and burst into spikes
    *supernova() {
      const g = this.game;
      this.still(); this.pose('raise');
      this.callout('Supernova', true);
      const spots = this.players().map((p) => this.gy(p.pos));
      for (let i = 0; i < 4 + this.phase * 2; i++) spots.push(this.around(this.arena.c, 2, this.arena.R - 1));
      const orbs = [], om = bloodMat(BLOOD, { emissive: 1 });
      for (const s of spots) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), om); o.position.copy(this.pos).setY(this.pos.y + 3); this.addProp(o); orbs.push({ o, s }); this.mark(s, { radius: 2.4, dur: 1.4, color: 0xff2a3a }); }
      for (let k = 1; k <= 10; k++) { for (const { o, s } of orbs) { o.position.lerpVectors(this.pos.clone().setY(this.pos.y + 3), s.clone().setY(s.y + 1.6), k / 10); o.rotation.y += 0.3; o.scale.setScalar(1 + k * 0.05); } yield 0.05; }
      yield 0.9;
      for (const { o, s } of orbs) {
        this.removeProp(o);
        const c = s.clone().setY(s.y + 1.4);
        g.fx.explosion(s, BLOOD, 2.4);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.fx.slashLine(c, V(Math.cos(a), -0.15, Math.sin(a)), 3.2, BLOOD, 0.2, 0.25); }
        this.hurt(s, 2.4, this.dmg * 0.9, 9);
        yield 0.07;
      }
      this.free();
      yield 0.7;
    },
    // 苅祓 Slicing Exorcism: two spinning blood discs fly out and back
    *slicing_exorcism() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: true });
      this.callout('Slicing Exorcism');
      const L = 15, angs = [this.facing - 0.28, this.facing + 0.28];
      for (const a of angs) g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 1.8, length: L, facing: a, dur: 0.7, color: 0xff3a3a });
      yield 0.7;
      const dm = bloodMat(BLOOD, { emissive: 1.2 });
      const discs = angs.map((a) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 12), dm); this.addProp(d); return { d, a, hit: new Set() }; });
      g.audio?.whoosh(1.2);
      for (let k = 0; k <= 24; k++) {
        const u = k <= 12 ? k / 12 : 1 - (k - 12) / 12;
        for (const D of discs) {
          const dir = V(Math.sin(D.a), 0, Math.cos(D.a)); D.d.position.copy(this.pos).setY(this.pos.y + 1.2).addScaledVector(dir, u * L); D.d.rotation.y += 0.8;
          g.particles.burst(D.d.position, { count: 1, color: BLOOD, speed: 1, life: 0.3, size: 0.2 });
          if (k === 12) D.hit.clear();
          for (const p of this.players()) if (!D.hit.has(p) && p.pos.distanceTo(V(D.d.position.x, p.pos.y, D.d.position.z)) < 1.2) { D.hit.add(p); p.takeDamage(this.dmg * 0.6, this, { knock: dir.clone().multiplyScalar(5) }); }
        }
        yield 0.04;
      }
      for (const D of discs) this.removeProp(D.d);
      this.free();
      yield 0.4;
    },
    // Blood Edge: a blade of hardened blood along the forearm
    *blood_edge() {
      const g = this.game;
      this.rig.extras.edge.visible = true;
      this.callout('Blood Edge');
      for (let k = 0; k < 3; k++) {
        const t = this.aim(); if (!t) break;
        this.still();
        if (t.pos.distanceTo(this.pos) > 5) { const dir = this.fwd(); yield* this.dash(dir, 24, 5, 0.8, this.dmg * 0.5, 4, { blocks: false }); }
        g.markers.spawn({ pos: this.gy(this.pos), radius: 4, dur: 0.45, shape: 'cone', arc: 0.42, facing: this.facing, color: 0xff2a3a, follow: this });
        this.pose('attack', { t: 0.2, style: k % 2 ? 'swingL' : 'swingR', windup: 0.3, strike: 0.5 });
        yield 0.45;
        this.pose('attack', { t: 0.6, style: k % 2 ? 'swingL' : 'swingR', windup: 0.3, strike: 0.5 });
        g.fx.slashArc(this.pos, this.facing, BLOOD, 4, 0.42, 0.18, k % 2 === 1); g.audio?.energy('slash');
        this.hurtCone(this.pos, this.facing, 4.3, 1.3, this.dmg * 0.9, 7);
        yield 0.2;
      }
      this.rig.extras.edge.visible = false;
      this.free();
      yield 0.5;
    },
    // 赤鱗躍動 Flowing Red Scale: faster, stronger, glowing veins and steam
    *flowing_red_scale() {
      const g = this.game;
      this.still(); this.pose('sign');
      this.callout('FLOWING RED SCALE', true);
      g.fx.shockwave(this.pos, BLOOD, 5); g.audio?.charge(0.6, 1.2);
      this.rig.extras.scale(true);
      this.st.scaleT = 9; this.speedMul = 1.6; this.st.baseDmg ??= this.dmg; this.dmg = this.st.baseDmg * 1.25;
      yield 0.7;
      this.free();
      yield* this.B.moves.blood_edge.call(this);
    },
  },
};
