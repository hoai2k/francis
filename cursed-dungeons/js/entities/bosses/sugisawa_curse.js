// THE SUGISAWA CURSE — the many-eyed curse that crawled into Sugisawa Third
// High the night the sealed finger was opened (chapter 1). Grade 1, drawn to
// the finger like every curse in the city.
//   Crushing Slam   one long arm pounds the ground in a line
//   Double Slam     both fists come down in front of it
//   Devour          a lunge, mouth first
//   Bile Spit       acid lobbed in arcs; it pools
//   Drawn by the Finger  lesser curses pour in to feed
//   Frenzy          (phase 3) the finger's pull drives it wild: faster, angrier
import * as THREE from 'three/webgpu';
import { Skin, Rig, PX } from '../character.js';
import { pixMat, glowMat, groundFX, Parts, M4, grp, face, ring, paintBox, finishMaterial, HS, rate, rnd } from '../boss-looks.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const VIOLET = 0x9a6aff, ACID = 0x9aff3a;
const v1 = new THREE.Vector3();

// =====================================================================
// look: a hunched grey-violet hulk, a head crowded with eyes, a split maw
// =====================================================================
export function buildSugisawa() {
  const S = new Skin(1111);
  const SK = 0x6a6078, SK2 = 0x544a62, SK3 = 0x8a7e96, GUM = 0x5a1a2a;
  S.mat = 'flesh'; for (const k of ['head', 'body', 'armR', 'armL', 'legR', 'legL']) paintBox(S, k, SK, 0.08);
  for (const k of ['body', 'armR', 'armL', 'legR', 'legL']) { const [x, y, w, h] = face(k).ring; for (let i = 0; i < 10; i++) S.rect(x + Math.floor(S.r() * (w - 2)), y + Math.floor(S.r() * (h - 2)), 2, 1, i % 2 ? SK2 : SK3, 0.06); }
  // eyes everywhere on the head, a split maw
  S.mat = 'eye';
  for (const [x, y] of [[9, 9], [13, 9], [11, 8], [8, 11], [15, 11], [10, 11], [13, 11], [2, 10], [5, 9], [18, 9], [21, 10]]) { S.px(x, y, 0xf0e8b0); S.fine(x + 0.25, y + 0.25, 0x1a0a06); S.fine(x + 0.5, y + 0.25, 0x1a0a06); }
  S.mat = 'flesh'; S.rect(9, 13, 6, 3, GUM, 0.05); S.mat = 'eye'; for (let x = 9; x < 15; x++) { S.fineRect(x, 13, 0.5, 1, 0xe8e0c8); S.fineRect(x + 0.5, 15, 0.5, 1, 0xe8e0c8); }
  // more eyes on the body and arms
  { const [fx, fy] = face('body').front; S.mat = 'eye'; for (const [x, y] of [[1, 2], [5, 3], [3, 6], [6, 8], [1, 9]]) { S.px(fx + x, fy + y, 0xf0e8b0); S.fine(fx + x + 0.25, fy + y + 0.25, 0x1a0a06); } }
  for (const k of ['armR', 'armL']) { const f = face(k); S.mat = 'eye'; S.px(f.front[0] + 1, f.front[1] + 3, 0xf0e8b0); S.fine(f.front[0] + 1.25, f.front[1] + 3.25, 0x1a0a06); }
  { const [x, y, w] = face('jacket').ring; S.ctx.clearRect(x, y, w, 12); const t = face('jacket').top; S.ctx.clearRect(t[0], t[1], 8, 4); }
  for (const ko of ['armRo', 'armLo']) { const f = face(ko); S.ctx.clearRect(f.ring[0], f.ring[1], f.ring[2], 12); S.ctx.clearRect(f.top[0], f.top[1], 4, 4); S.ctx.clearRect(f.bottom[0], f.bottom[1], 4, 4); }
  const m = finishMaterial(S, { emit: 2.6, fill: 0.13, rim: VIOLET, rimStrength: 0.5 });
  const rig = new Rig({ material: m, scale: 2.3, legH: 8, headS: 8 });
  const P = new Parts(rig);
  const hide = pixMat(SK, { noise: 0.14, rim: VIOLET, rimStrength: 0.45 }), hide2 = pixMat(SK2, { noise: 0.14 }), hide3 = pixMat(SK3, { noise: 0.12 }), tooth = pixMat(0xe8e0c8, { noise: 0.05, rough: 0.5 }), gum = pixMat(GUM, { noise: 0.1 });
  const eyeW = pixMat(0xf0e8b0, { emissive: 0.8, noise: 0.04 }), pupil = pixMat(0x140806, { noise: 0.02 });
  const eyeBall = (parent, x, y, z, s = 1.4, ry = 0) => { P.box(parent, s, s, s * 0.6, eyeW, M4(x, y, z, 0, ry, 0)); P.box(parent, s * 0.45, s * 0.45, 0.3, pupil, M4(x + Math.sin(ry) * s * 0.32, y, z + Math.cos(ry) * s * 0.32, 0, ry, 0)); };
  // hunched hump of flesh over the shoulders, studded with eyes
  P.box(rig.torso, 12, 6, 8, hide, M4(0, 10.4, -1)); P.box(rig.torso, 9, 4, 6.6, hide2, M4(0, 14, -2.2)); P.box(rig.torso, 11, 7, 6.4, hide, M4(0, 4.4, 0.6));
  for (const [x, y, z, ry] of [[-3.6, 12, 3, 0], [2.8, 13.4, 1.2, 0], [5.4, 10, 2.4, 0.6], [-5.6, 8.4, 2.2, -0.6], [0.6, 15.6, -0.4, 0], [-1.2, 6, 3.9, 0]]) eyeBall(rig.torso, x, y, z, 1.5, ry);
  // the maw: a lower jaw hanging open with teeth
  const top = 8 * HS;
  const jaw = grp(rig.head, 0, 0.6, 1.2);
  P.box(jaw, 9.2, 1.6, 6, hide2, M4(0, -0.8, 2)); P.box(jaw, 7.4, 0.6, 4.8, gum, M4(0, 0.1, 2.2));
  for (let i = 0; i < 6; i++) P.box(jaw, 0.8, 1.4, 0.8, tooth, M4(-3 + i * 1.2, 0.8, 4.6));
  for (let i = 0; i < 5; i++) P.box(rig.head, 0.8, 1.4, 0.8, tooth, M4(-2.4 + i * 1.2, 1.6, 4.9 * HS));
  P.box(rig.head, 9.4, 2.4, 9.4, hide2, M4(0, top + 0.4, -0.6));
  eyeBall(rig.head, -2.4, top + 0.8, 4.6, 1.6); eyeBall(rig.head, 2.6, top + 1.2, 4.4, 1.2);
  // long knuckle-dragging forearms
  for (const hand of [rig.handR, rig.handL]) { P.box(hand, 5.4, 8, 5.4, hide, M4(0, -2, 0)); P.box(hand, 6.4, 4, 6.4, hide2, M4(0, -7.6, 0.4)); for (let i = 0; i < 3; i++) P.box(hand, 1.4, 2.4, 1.4, hide3, M4(-1.8 + i * 1.8, -10.4, 2.4, 0.4, 0, 0)); }
  for (const leg of [rig.legR, rig.legL]) { P.box(leg, 5.6, 6, 5.6, hide, M4(0, -3.4, 0)); P.box(leg, 6, 1.6, 7, hide2, M4(0, -7.4, 1)); }
  P.flush();
  const fx = groundFX(rig, VIOLET, 1.4);
  rig.extras.jaw = jaw;
  let blink = 1.5;
  // always hunched forward: an offset on top of the procedural animation
  const anim = rig.animate.bind(rig);
  rig.animate = (p) => { rig.torso.rotation.x -= 0.35; anim(p); rig.torso.rotation.x += 0.35; };
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    jaw.rotation.x = 0.25 + Math.abs(Math.sin(t * 1.7)) * 0.25 + (b.anim?.type === 'cast' ? 0.5 : 0);
    blink -= dt; if (blink < 0) blink = 1 + Math.random() * 2;
    m.userData.emitMask.value = blink < 0.12 ? 0.2 : 2.4 + Math.sin(t * 3) * 0.5;
    if (b.lightH) { b.lightH.intensity = 3; b.lightH.offsetY = 5.5; }
    for (let i = rate(5, dt, bud); i > 0; i--) Pt.smoke.emit(b.pos.x + rnd(1.3), b.pos.y + Math.random() * 3.5, b.pos.z + rnd(1.3), rnd(0.2), 0.5, rnd(0.2), 1.6, 0.1, 0.06, 0.16, 0.5, -0.2, 1.2, 2.4, 0);
    if (Math.random() < dt * 3) { jaw.getWorldPosition(v1); Pt.glow.emit(v1.x, v1.y, v1.z, 0, -1, 0, 0.8, 0.9, 1.6, 0.4, 0.08, 14, 0.2, 0.6, 1); }
  };
  rig.fx = fx;
  return rig;
}

export const sugisawa_curse = {
  name: 'The Sugisawa Curse', hudName: 'Sugisawa Curse · Grade 1 Cursed Spirit', title: 'THE SUGISAWA CURSE · GRADE 1 CURSED SPIRIT',
  hp: 1500, speed: 2.8, dmg: 16, color: VIOLET, radius: 1.3, height: 4.4, keepDist: 3.4, pitch: 0.35,
  build: buildSugisawa,
  phaseNames: ['', 'IT SMELLS THE FINGER', 'FRENZY'],
  phases: [
    ['crushing_slam', 'double_slam', 'bile_spit', 'crushing_slam'],
    ['crushing_slam', 'double_slam', 'bile_spit', 'devour', 'drawn_by_the_finger'],
    ['devour', 'crushing_slam', 'double_slam', 'bile_spit', 'drawn_by_the_finger', 'devour'],
  ],
  onPhase(n) { if (n === 2) { this.speedMul = 1.35; this.dmg *= 1.15; } },
  moves: {
    *crushing_slam() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      const L = 11;
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 2.4, length: L, facing: this.facing, dur: 0.95, color: 0xff2a1a });
      this.pose('attack', { t: 0.15, style: 'throw', windup: 0.35, strike: 0.55 });
      this.callout('Crushing Slam');
      yield 0.95;
      this.pose('attack', { t: 0.6, style: 'throw', windup: 0.35, strike: 0.55 });
      const dir = this.fwd();
      g.shake(0.6); g.audio?.impact(1.8);
      for (let s = 2; s < L; s += 2) { const q = this.gy(this.pos.clone().addScaledVector(dir, s)); g.particles.burst(q, { count: 5, color: 0x7a6a5a, additive: false, speed: 4, up: 3, life: 0.6, size: 0.5, gravity: 10 }); g.combat.hitBlocks(q, dir, 1, Math.PI, 60, null); }
      this.hurtLine(this.pos, dir, L, 1.2, this.dmg * 1.1, 5, { up: 7 });
      this.free();
      yield 0.7;
    },
    *double_slam() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      const c = this.gy(this.pos.clone().addScaledVector(this.fwd(), 3));
      this.mark(c, { radius: 3.6, dur: 1.0, color: 0xff2a1a });
      this.pose('attack', { t: 0.15, style: 'slam', windup: 0.35, strike: 0.55 });
      this.callout('Double Slam');
      yield 1.0;
      this.pose('attack', { t: 0.6, style: 'slam', windup: 0.35, strike: 0.55 });
      g.fx.shockwave(c, VIOLET, 4.5); g.shake(0.8); g.audio?.impact(2);
      this.hurt(c, 3.6, this.dmg * 1.3, 12, { up: 6 });
      g.combat.hitBlocks(c, V(0, 0, 1), 3, Math.PI, 80, null);
      this.free();
      yield 0.8;
    },
    // a lunge, mouth first
    *devour() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: true });
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 3, length: 12, facing: this.facing, dur: 0.85, color: 0xff1a2a });
      this.callout('Devour');
      yield 0.85;
      yield* this.dash(this.fwd(), 24, 11, 1.4, this.dmg * 1.25, 10, { trail: () => g.particles.burst(this.pos, { count: 2, color: 0x7a6a5a, additive: false, speed: 2, life: 0.5, size: 0.6, sizeEnd: 1.6 }) });
      this.free();
      yield 0.8;
    },
    // acid lobbed in arcs; it pools
    *bile_spit() {
      const g = this.game;
      this.still(); this.pose('cast', { t: 1, both: false });
      this.callout('Bile Spit');
      const self = this;
      for (let i = 0; i < 3 + this.phase; i++) {
        const tg = this.players()[i % this.players().length]; if (!tg) break;
        const land = this.gy(tg.pos.clone().add(V((Math.random() - 0.5) * 2.5, 0, (Math.random() - 0.5) * 2.5)));
        const from = this.rig.head.getWorldPosition(V()), T = 1.0;
        const vel = new THREE.Vector3().subVectors(land, from).divideScalar(T); vel.y = (land.y - from.y) / T + 0.5 * 14 * T;
        this.mark(land, { radius: 1.6, dur: T, color: 0x9aff3a });
        g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg * 0.6, shape: 'orb', color: ACID, emissive: 2, gravity: 14, life: T + 0.05, scale: 2, radius: 0.5,
          trail: (pr) => g.particles.burst(pr.pos, { count: 1, color: ACID, speed: 0.3, life: 0.3, size: 0.18 }),
          onHit: (p) => p.takeDamage(self.dmg * 0.6, self, {}),
          onExpire: (pr) => { g.fx.splat(pr.pos, ACID); self.hurt(pr.pos, 1.6, self.dmg * 0.5, 4); g.hazards.acid(pr.pos, self.dmg * 0.3); } });
        g.audio?.energy('spit');
        yield 0.28;
      }
      this.free();
      yield 0.7;
    },
    // lesser curses pour in to feed on the finger
    *drawn_by_the_finger() {
      this.still(); this.pose('raise');
      this.callout('Drawn by the Finger');
      this.summon('swarmer', 3, { name: 'Grade 4 Curse', r0: 4, r1: 7 });
      if (this.phase >= 2) this.summon('spitter', 1, { r0: 5, r1: 7 });
      yield 1.0;
      this.free();
    },
  },
};
