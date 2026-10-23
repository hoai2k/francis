// THE FINGER BEARER — the Special Grade cursed womb that hatched in the Eishu
// Juvenile Detention Center after swallowing one of Ryomen Sukuna's fingers
// ("Fearsome Womb"). Its innate domain twisted the building into a maze.
//   Rend               two wide claw swipes
//   Limb Tear          a grabbing lunge (it tore off Yuji's hand)
//   Womb Blast         cursed energy blasted from its mouth along a line
//   Twisted Corridors  its innate domain warps space: it vanishes and strikes
//                      from behind (watch for the circle under you)
//   Womb Spawn         lesser curses crawl out of the walls
//   The Finger         (phase 3) Sukuna's finger in its chest pulses: rings of
//                      cursed energy roll outward (dodge through them)
import * as THREE from 'three/webgpu';
import { Skin, Rig, PX } from '../character.js';
import { pixMat, glowMat, bloodMat, groundFX, Parts, M4, grp, face, ring, paintBox, finishMaterial, HS, rate, rnd } from '../boss-looks.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PURPLE = 0xb04aff, RED = 0xff2a4a;
const v1 = new THREE.Vector3();

// =====================================================================
// look: tall and wasted, grey-brown hide, a skull-like head with a grin of
// human teeth and three eyes, a ruff of flesh petals, the finger in its chest
// =====================================================================
export function buildFingerBearer() {
  const S = new Skin(4040);
  const SK = 0x5a4e4a, SK2 = 0x463c3a, SK3 = 0x7a6a62, BONE = 0xd8ccb4, GUM = 0x6a1a2a, RAG = 0xc86a2a, RAG2 = 0x8a4a1a;
  S.mat = 'flesh'; for (const k of ['head', 'body', 'armR', 'armL', 'legR', 'legL']) paintBox(S, k, SK, 0.08);
  for (const k of ['body', 'armR', 'armL', 'legR', 'legL']) { const [x, y, w, h] = face(k).ring; for (let i = 0; i < w; i++) if (S.r() < 0.4) S.fineRect(x + i, y + Math.floor(S.r() * h * 0.5), 0.5, 2 + Math.floor(S.r() * 4), SK2, 'flesh'); }
  // skull face: bone-pale upper face, three eyes, a full-width grin of teeth
  S.mat = 'skin'; S.rect(8, 8, 8, 4, SK3, 0.05); S.rect(8, 0, 8, 8, SK2, 0.06);
  S.mat = 'eye';
  for (const [x, y] of [[9, 10], [13, 10], [11, 8]]) { S.rect(x, y, 2, 1.5 > 1 ? 1 : 1, 0x0a0606, 0.02); S.px(x + (x === 11 ? 0 : x < 11 ? 1 : 0), y, 0xffe8a0); }
  S.fine(11.5, 8.5, 0xff4a2a); S.fine(10, 10.5, 0xff4a2a); S.fine(13.5, 10.5, 0xff4a2a);
  S.mat = 'flesh'; S.rect(8, 12, 8, 3, GUM, 0.05); S.rect(2, 12, 6, 3, GUM, 0.05); S.rect(16, 12, 6, 3, GUM, 0.05);
  S.mat = 'eye'; for (let x = 2; x < 22; x++) { S.fineRect(x, 12, 0.5, 1, BONE); S.fineRect(x + 0.5, 12, 0.5, 0.75, 0xeee2c8); S.fineRect(x, 14, 0.5, 1, BONE); S.fineRect(x + 0.5, 14.25, 0.5, 0.75, 0xeee2c8); }
  // the finger's glow in the chest, veins running from it
  { const [fx, fy] = face('body').front; S.mat = 'glow'; S.rect(fx + 3, fy + 3, 2, 3, 0xff3a5a, 0.02); S.px(fx + 3, fy + 4, 0xffe0e8);
    S.mat = 'flesh'; for (const [dx, dy, l] of [[-1, 0, 3], [2, 0, 3], [-2, 3, 4], [2, 3, 4]]) S.fineRect(fx + 3 + dx + 0.5, fy + 4 + dy, 0.5, l, 0x8a1a3a, 'flesh'); }
  // scraps of the orange inmate uniform it hatched among
  S.mat = 'cloth'; { const [x, y, w] = face('jacket').ring; S.ctx.clearRect(x, y, w, 12); for (let i = 0; i < w; i++) if (S.r() < 0.7) S.rect(x + i, y + 8 + Math.floor(S.r() * 2), 1, 4, i % 3 ? RAG : RAG2, 0.08); const t = face('jacket').top; S.ctx.clearRect(t[0], t[1], 8, 4); }
  for (const ko of ['armRo', 'armLo']) { const f = face(ko); S.ctx.clearRect(f.ring[0], f.ring[1], f.ring[2], 12); S.ctx.clearRect(f.top[0], f.top[1], 4, 4); S.ctx.clearRect(f.bottom[0], f.bottom[1], 4, 4); }
  for (const k of ['legR', 'legL']) { const f = face(k); S.mat = 'cloth'; for (let i = 0; i < 16; i++) if (S.r() < 0.6) S.rect(f.ring[0] + i, f.ring[1], 1, 3 + Math.floor(S.r() * 3), RAG, 0.08); }
  const m = finishMaterial(S, { emit: 2.4, fill: 0.12, rim: 0xb04aff, rimStrength: 0.5 });
  const rig = new Rig({ material: m, scale: 2.35, legH: 14, bodyH: 12, headS: 9 });
  const P = new Parts(rig);
  const hide = pixMat(SK, { noise: 0.14, rim: 0xb04aff, rimStrength: 0.45 }), hide2 = pixMat(SK2, { noise: 0.14 }), hide3 = pixMat(SK3, { noise: 0.12 }), bone = pixMat(BONE, { noise: 0.06, rough: 0.5 }), claw = pixMat(0x2a2224, { noise: 0.08, rough: 0.35 });
  const petal = pixMat(0x6a3a4a, { noise: 0.12, rim: 0xff5a8a, rimStrength: 0.4 }), petal2 = pixMat(0x8a4a5a, { noise: 0.12 });
  const fingerM = glowMat(0xff6a8a, 2.6, { pulse: 4 });
  // the ruff of flesh petals around the neck
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; P.box(rig.torso, 2.6, 0.8, 5, i % 2 ? petal : petal2, M4(Math.sin(a) * 4.6, 12.4, Math.cos(a) * 3.6, -0.5 * Math.cos(a), a, 0.5 * Math.sin(a))); }
  // horn-like bone ridges on the skull, the jaw jutting
  const top = 9 * HS;
  P.box(rig.head, 9.6, 2, 9.6, hide2, M4(0, top + 0.6, -0.4)); P.box(rig.head, 7, 2.2, 7.6, hide, M4(0, top + 2.4, -1.2));
  for (const sx of [-1, 1]) { P.box(rig.head, 1.4, 5, 1.4, bone, M4(sx * 3.4, top + 3.6, -1.6, -0.4, 0, sx * -0.4)); P.box(rig.head, 1.0, 3, 1.0, bone, M4(sx * 4.6, top + 6.6, -2.8, -0.7, 0, sx * -0.6)); }
  P.box(rig.head, 9.4, 2.4, 2, hide3, M4(0, 1.2, 4.2));
  // the finger itself, standing out of the chest
  const finger = grp(rig.torso, 0, 7.6, 2.3);
  P.box(finger, 1.2, 3.6, 1.2, fingerM, M4(0, 0.6, 0.6, 0.6, 0, 0.2)); P.box(finger, 1.0, 0.6, 1.0, bone, M4(0.1, 2.4, 1.6, 0.6, 0, 0.2));
  // long arms ending in long black claws, knobbly spine
  for (const hand of [rig.handR, rig.handL]) { P.box(hand, 4.4, 3, 4.4, hide2, M4(0, 1, 0)); for (let i = 0; i < 4; i++) P.box(hand, 0.7, 5.5, 0.9, claw, M4(-1.5 + i * 1.0, -3.4, 1.6, 0.4, 0, (i - 1.5) * 0.08)); }
  for (const arm of [rig.armR, rig.armL]) P.box(arm, 3, 3, 3, bone, M4(0, -5, -2));
  for (let i = 0; i < 5; i++) P.box(rig.torso, 1.4, 1.4, 1.4, bone, M4(0, 2 + i * 2.2, -2.4));
  for (const leg of [rig.legR, rig.legL]) { P.box(leg, 4.6, 2, 6, hide2, M4(0, -13.4, 1)); for (let i = 0; i < 3; i++) P.box(leg, 0.8, 0.8, 2, claw, M4(-1.4 + i * 1.4, -13.8, 4.6)); }
  P.flush();
  const fx = groundFX(rig, PURPLE, 1.3);
  let pulseT = 0;
  rig.extras.finger = finger;
  rig.extras.pulse = () => { pulseT = 1; };
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    pulseT = Math.max(0, pulseT - dt * 1.5);
    fingerM.userData.amp.value = 2.4 + Math.sin(t * 4) * 0.6 + pulseT * 6;
    m.userData.emitMask.value = 2.2 + Math.sin(t * 4) * 0.5 + pulseT * 3;
    rig.head.rotation.z = Math.sin(t * 0.9) * 0.12;   // an unsettling tilt
    if (b.lightH) { b.lightH.intensity = 3.4 + pulseT * 5; b.lightH.offsetY = 6.5; }
    // a dark miasma and motes drawn toward the finger
    for (let i = rate(6, dt, bud); i > 0; i--) Pt.smoke.spawn({ x: b.pos.x + rnd(1.2), y: b.pos.y + Math.random() * 4.5, z: b.pos.z + rnd(1.2), vx: rnd(0.2), vy: 0.5, vz: rnd(0.2), life: 1.6, r: 0.06, g: 0.02, b: 0.08, size: 0.5, gravity: -0.2, drag: 1.2, sizeEnd: 2.6 });
    for (let i = rate(6, dt, bud); i > 0; i--) { finger.getWorldPosition(v1); const a = Math.random() * 6.28, r = 1.4; Pt.glow.spawn({ x: v1.x + Math.cos(a) * r, y: v1.y + rnd(0.8), z: v1.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6, vz: -Math.sin(a) * r * 1.6, life: 0.6, r: 2.2, g: 0.4, b: 0.8, size: 0.08, drag: 0.5, sizeEnd: 0.1 }); }
  };
  rig.fx = fx;
  return rig;
}

export const finger_bearer = {
  name: 'The Finger Bearer', hudName: 'Finger Bearer · Special Grade Cursed Womb', title: 'THE FINGER BEARER · SPECIAL GRADE CURSED WOMB',
  hp: 2200, speed: 3.0, dmg: 19, color: PURPLE, radius: 1.2, height: 4.8, keepDist: 3.2, pitch: 0.4,
  build: buildFingerBearer,
  phaseNames: ['', 'THE WOMB HAS HATCHED', 'SUKUNA\'S FINGER AWAKENS'],
  phaseMove: { 2: 'the_finger' },
  onDeath() { this.game.fx.dimTarget = 0; this.object.visible = true; },
  reset() { if (this.st.dim) { this.game.fx.dimTarget = 0; this.st.dim = false; } },
  phases: [
    ['rend', 'limb_tear', 'womb_blast', 'rend'],
    ['rend', 'limb_tear', 'womb_blast', 'twisted_corridors', 'womb_spawn'],
    ['the_finger', 'twisted_corridors', 'limb_tear', 'womb_blast', 'rend', 'womb_spawn'],
  ],
  moves: {
    // two wide claw swipes
    *rend() {
      const g = this.game;
      this.callout('Rend');
      for (let k = 0; k < 2; k++) {
        const t = this.aim(); if (!t) break;
        this.still();
        const R = 4.8;
        g.markers.spawn({ pos: this.gy(this.pos), radius: R, dur: 0.6, shape: 'cone', arc: 0.45, facing: this.facing, color: 0xff2a3a, follow: this });
        this.pose('attack', { t: 0.2, style: k ? 'swingL' : 'swingR', windup: 0.3, strike: 0.5 });
        yield 0.6;
        this.pose('attack', { t: 0.6, style: k ? 'swingL' : 'swingR', windup: 0.3, strike: 0.5 });
        g.fx.slashArc(this.pos, this.facing, 0xc89aff, R, 0.45, 0.2, k === 1); g.audio?.energy('slash');
        this.hurtCone(this.pos, this.facing, R, 1.4, this.dmg, 8);
        yield 0.25;
      }
      this.free();
      yield 0.5;
    },
    // a grabbing lunge that tears at a limb
    *limb_tear() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: true });
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 2.4, length: 10, facing: this.facing, dur: 0.8, color: 0xff1a2a });
      this.callout('Limb Tear');
      yield 0.8;
      const hit = yield* this.dash(this.fwd(), 30, 8, 1.2, this.dmg * 0.6, 2, { blocks: false });
      for (const p of hit) {
        p.takeDamage(this.dmg * 1.1, this, { knock: this.fwd().multiplyScalar(-6).setY(4) });
        p.slowT = 1.5;
        g.fx.splat(p.pos.clone().setY(p.pos.y + 1.2), 0xa0101a); g.fx.splat(p.pos.clone().setY(p.pos.y + 1.2), 0xa0101a);
        g.audio?.impact(1.6, 'crit'); g.shake(0.6);
      }
      this.free();
      yield 0.7;
    },
    // cursed energy blasted from the mouth along a tracking line
    *womb_blast() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('raise');
      this.callout('Womb Blast');
      const L = 20, W = 2.2;
      const mk = g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: W, length: L, facing: this.facing, dur: 1.2, color: 0xb04aff, follow: this });
      g.audio?.charge(1.1, 0.6);
      for (let k = 0; k < 8; k++) { const tg = this.target(); if (tg) this.aim(tg); mk.mesh.rotation.z = this.facing + Math.PI; mk.offset.set(Math.sin(this.facing) * L / 2, 0.05, Math.cos(this.facing) * L / 2); const h = this.rig.head.getWorldPosition(V()); g.particles.burst(h.setY(h.y + 0.3), { count: 4, color: PURPLE, speed: 2, life: 0.3, size: 0.2 }); yield 0.1; }
      yield 0.4;
      const dir = this.fwd(), from = this.rig.head.getWorldPosition(V()).setY(this.pos.y + 3.6);
      for (let k = 0; k < 6; k++) {
        g.fx.slashLine(from, V(dir.x, -0.14, dir.z).normalize(), L, PURPLE, W, 0.18); g.fx.slashLine(from, V(dir.x, -0.14, dir.z).normalize(), L, 0xffffff, W * 0.35, 0.15);
        if (k % 2 === 0) this.hurtLine(this.pos, dir, L, W / 2, this.dmg * 0.5, 6);
        yield 0.06;
      }
      for (let s = 2; s < L; s += 2.5) { g.particles.burst(this.gy(this.pos.clone().addScaledVector(dir, s)), { count: 4, color: PURPLE, speed: 3, up: 2, life: 0.5, size: 0.2 }); g.combat.hitBlocks(this.pos.clone().addScaledVector(dir, s), dir, 1, Math.PI, 70, null); }
      g.audio?.energy('purple'); g.shake(0.5);
      this.free();
      yield 0.7;
    },
    // its innate domain warps space: it vanishes and strikes from behind
    *twisted_corridors() {
      const g = this.game;
      this.callout('Innate Domain: Twisted Corridors');
      g.fx.dimTarget = 0.35; this.st.dim = true;
      for (let k = 0; k < 3; k++) {
        const t = this.target(); if (!t) break;
        g.fx.blinkPuff(this.pos, PURPLE); this.untargetable = true; this.object.visible = false;
        const to = this.gy(t.pos);
        this.mark(to, { radius: 2.4, dur: 0.75, color: 0xb04aff });
        yield 0.75;
        const back = V(Math.sin(t.facing ?? 0), 0, Math.cos(t.facing ?? 0)).multiplyScalar(-1.4);
        this.pos.copy(this.gy(this.clampArena(to.clone().add(back)))); this.vel.set(0, 0, 0);
        this.object.visible = true; this.untargetable = false; g.fx.blinkPuff(this.pos, PURPLE); g.audio?.energy('teleport');
        this.facing = Math.atan2(to.x - this.pos.x, to.z - this.pos.z);
        this.pose('attack', { t: 0.55, style: 'slam', windup: 0.3, strike: 0.5 });
        g.fx.slashX(to.clone().setY(to.y + 1.2), 2.6, 0xc89aff);
        this.hurt(to, 2.4, this.dmg * 0.9, 9);
        yield 0.45;
      }
      g.fx.dimTarget = 0; this.st.dim = false;
      this.object.visible = true; this.untargetable = false;
      this.free();
      yield 0.5;
    },
    // lesser curses crawl out of the walls
    *womb_spawn() {
      this.still(); this.pose('raise');
      this.callout('Womb Spawn');
      this.summon('teleporter', 1 + (this.phase >= 2 ? 1 : 0), { name: 'Womb Spawn', r0: 4, r1: 7 });
      this.summon('swarmer', 2, { name: 'Womb Spawn', r0: 3, r1: 6 });
      yield 1.0;
      this.free();
    },
    // Sukuna's finger pulses: rings of cursed energy roll outward
    *the_finger() {
      const g = this.game;
      this.still(); this.pose('raise');
      this.callout('SUKUNA\'S FINGER PULSES', true);
      for (let w = 0; w < 3; w++) {
        this.rig.extras.pulse();
        const c = this.gy(this.pos);
        const rings = [3, 6, 9].map((r) => r + (w % 2) * 1.5);
        // each ring band flashes twice before it fires (the gaps between are safe)
        g.audio?.charge(0.8, 0.5);
        for (let f = 0; f < 3; f++) { for (const r of rings) g.fx.rings.spawn(c.clone().setY(c.y + 0.08), { color: 0xff2a4a, r0: r + 0.9, r1: r + 0.9, dur: 0.3, thick: 1.8 / (r + 0.9) }); yield 0.3; }
        for (const r of rings) {
          g.fx.rings.spawn(c.clone().setY(c.y + 0.1), { color: RED, r0: r - 0.6, r1: r + 0.9, dur: 0.3, thick: 0.25 });
          this.hurt(c, r + 0.9, this.dmg * 0.9, 9, { filter: (p) => Math.hypot(p.pos.x - c.x, p.pos.z - c.z) > r - 0.9 });
        }
        g.fx.flash(RED, 0.2, 0.15); g.shake(0.4); g.audio?.impact(1.4);
        yield 0.5;
      }
      this.free();
      yield 0.5;
    },
  },
};
