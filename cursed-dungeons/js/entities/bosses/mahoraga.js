// EIGHT-HANDLED SWORD DIVERGENT SILA DIVINE GENERAL MAHORAGA — the strongest
// of the Ten Shadows, which no Ten Shadows user has ever tamed.
//   The Wheel      it ADAPTS: every attack that keeps hitting it (melee, each
//                  technique, domains, lingering damage) builds toward a turn of
//                  the eight-handled wheel; each turn (clank + flash + banner)
//                  makes it take far less damage from that source. Switch it
//                  up: an adaptation loosens after a while without that source.
//   Sword of Extermination  a sweeping cut of positive energy
//   Extermination Cleave    an overhead strike that splits the ground
//   Divine Leap    it jumps onto you
//   Rush           a straight barrage of blows
//   Adaptive Guard (phase 2+) the wheel spins while it stands guard; strike it
//                  and it counters instantly
import * as THREE from 'three/webgpu';
import { Skin, Rig, PX } from '../character.js';
import { pixMat, glowMat, groundFX, Parts, M4, grp, face, ring, paintBox, finishMaterial, HS, rate, rnd } from '../boss-looks.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const WHITE = 0xe8e2d4, GOLDW = 0xfff0b0;
const v1 = new THREE.Vector3();
const RESIST = [0, 0.45, 0.72, 0.9];
const ROMAN = ['', 'I', 'II', 'III'];

// =====================================================================
// look
// =====================================================================
export function buildMahoraga() {
  const S = new Skin(8008);
  const SK = 0xece8de, SK2 = 0xd4cfc2, SK3 = 0xb8b2a4, LIP = 0x9a7a8a, CL = 0x1e1d24, CL2 = 0x2c2a34, BAND = 0x5a4a8a;
  // head: smooth white, no eyes (the wings sit there), heavy lips
  S.mat = 'skin'; paintBox(S, 'head', SK, 0.03);
  S.rect(8, 0, 8, 8, SK2, 0.03);
  S.fineRect(8, 9, 8, 0.5, SK3, 'skin');
  S.rect(9, 13, 6, 2, LIP, 0.04); S.fineRect(9, 13.75, 6, 0.5, 0x3a2030, 'skin'); S.fineRect(9.5, 13, 5, 0.5, 0xb894a4, 'skin');
  S.fineRect(11.5, 11, 1, 1.5, SK3, 'skin');
  // body: carved white muscle
  S.mat = 'skin'; paintBox(S, 'body', SK, 0.03);
  { const [fx, fy] = face('body').front;
    S.fineRect(fx + 3.75, fy + 1, 0.5, 10, SK3, 'skin'); S.fineRect(fx + 0.5, fy + 4, 7, 0.5, SK3, 'skin');
    for (const y of [6, 8, 10]) S.fineRect(fx + 2, fy + y, 4, 0.5, SK2, 'skin');
    const [bx, by] = face('body').back; S.fineRect(bx + 3.75, by, 0.5, 12, SK3, 'skin'); }
  // the dark lower garment on the jacket layer (only the hips) and the legs
  S.mat = 'cloth'; { const [x, y, w] = face('jacket').ring; S.rect(x, y + 9, w, 3, CL, 0.06); S.fineRect(x, y + 9, w, 0.5, BAND, 'cloth'); }
  { const [x, y, w, h] = face('jacket').ring; S.ctx.clearRect(x, y, w, 9); const [tx, ty] = face('jacket').top; S.ctx.clearRect(tx, ty, 8, 4); }
  for (const k of ['armR', 'armL']) { S.mat = 'skin'; paintBox(S, k, SK, 0.03); const [x, y, w] = face(k).ring; S.fineRect(x, y + 5, w, 0.5, SK3, 'skin'); S.rect(x, y + 10, w, 2, SK2, 0.03); }
  for (const ko of ['armRo', 'armLo']) { const f = face(ko); S.ctx.clearRect(f.ring[0], f.ring[1], f.ring[2], 12); S.ctx.clearRect(f.top[0], f.top[1], 4, 4); S.ctx.clearRect(f.bottom[0], f.bottom[1], 4, 4); }
  for (const k of ['legR', 'legL']) {
    S.mat = 'cloth'; paintBox(S, k, CL, 0.06); const f = face(k);
    for (let i = 1; i < 16; i += 3) S.fineRect(f.ring[0] + i, f.ring[1], 0.5, 7, CL2, 'cloth');
    S.mat = 'skin'; S.rect(f.ring[0], f.ring[1] + 7, 16, 5, SK, 0.03); S.rect(f.bottom[0], f.bottom[1], 4, 4, SK2, 0.03);
    S.fineRect(f.ring[0], f.ring[1] + 7, 16, 0.5, BAND, 'cloth');
  }
  const m = finishMaterial(S, { emit: 0.6, fill: 0.16, rim: 0xfff0c0, rimStrength: 0.35 });
  const rig = new Rig({ material: m, scale: 2.6 });
  const P = new Parts(rig);
  const skin = pixMat(SK, { noise: 0.05, rim: 0xfff0c0, rimStrength: 0.35 }), skin2 = pixMat(SK2, { noise: 0.05 }), cloth = pixMat(CL, { noise: 0.1 }), cloth2 = pixMat(CL2, { noise: 0.1 }), band = pixMat(BAND, { noise: 0.08 });
  const feather = pixMat(0xf6f2ea, { noise: 0.06, emissive: 0.08, rim: 0xffffff, rimStrength: 0.4 }), featherD = pixMat(0xd8d2c4, { noise: 0.06 });
  const steel = pixMat(0xd8dce2, { metal: 0.9, rough: 0.22, noise: 0.03, rim: 0xffffff, rimStrength: 0.5 }), edge = glowMat(0xfff4d0, 2.2);
  const wheelM = pixMat(0x8a7a4a, { metal: 0.85, rough: 0.3, noise: 0.05 }), wheelD = pixMat(0x5a4a2a, { metal: 0.7, rough: 0.4 });
  // bulk: traps, deltoids, pecs, biceps, forearms, calves
  P.box(rig.torso, 9.6, 2.6, 4.6, skin, M4(0, 11.4, -0.2)); P.box(rig.torso, 3.6, 2.6, 1.2, skin2, M4(-2, 9.4, 2.3)); P.box(rig.torso, 3.6, 2.6, 1.2, skin2, M4(2, 9.4, 2.3));
  for (const arm of [rig.armR, rig.armL]) { P.box(arm, 5.4, 4.4, 5.4, skin, M4(0, 0.6, 0)); P.box(arm, 4.6, 4, 4.8, skin2, M4(0, -3.4, 0.2)); }
  for (const hand of [rig.handR, rig.handL]) { P.box(hand, 5, 4.4, 5, skin, M4(0, 2.6, 0)); P.box(hand, 4.6, 0.8, 4.6, band, M4(0, 3.6, 0)); P.box(hand, 4.8, 2.6, 4.4, skin2, M4(0, -1.2, 0)); }
  for (const leg of [rig.legR, rig.legL]) { P.box(leg, 5, 6.6, 5, cloth, M4(0, -3.2, 0)); P.box(leg, 4.6, 3.4, 4.8, skin2, M4(0, -8.6, 0.2)); }
  P.box(rig.hips, 9.2, 2.4, 5.2, cloth2, M4(0, 0.4, 0)); P.box(rig.hips, 3.2, 6, 0.8, cloth, M4(0, -2.6, 2.6)); P.box(rig.hips, 3.2, 6, 0.8, cloth, M4(0, -2.6, -2.6));
  // head wings: two pairs where the eyes should be
  const wings = [];
  for (const sx of [-1, 1]) for (const [y, a, l] of [[5.2, 0.35, 1], [3.4, -0.25, 0.8]]) {
    const w = grp(rig.head, sx * 4.2 * HS, y * HS, 2.2 * HS, 0, 0, 0);
    for (let i = 0; i < 4; i++) P.box(w, 0.8, 1.4 - i * 0.15, (3.4 - i * 0.6) * l, i % 2 ? featherD : feather, M4(sx * (0.8 + i * 1.0), 0.4 * i * (a > 0 ? 1 : -0.6), -i * 0.5, 0, sx * (0.25 + i * 0.12), sx * a));
    wings.push({ g: w, sx, ph: y });
  }
  P.box(rig.head, 8.4, 1.4, 1.0, featherD, M4(0, 4.4 * HS, 4.3 * HS));
  // Sword of Extermination fixed along the right forearm
  const sword = grp(rig.handR, 0, 1, 2.8);
  P.box(sword, 2.2, 4, 1.2, band, M4(0, 1.2, -0.4)); P.box(sword, 1.6, 1.2, 2.4, wheelM, M4(0, -1.2, 0));
  P.box(sword, 0.7, 22, 2.6, steel, M4(0, -12.8, 0.4)); P.box(sword, 0.5, 6, 1.8, steel, M4(0, -26.2, 0.6, 0.12, 0, 0));
  P.box(sword, 0.3, 22, 0.5, edge, M4(0, -12.8, 1.8)); P.box(sword, 0.3, 6, 0.4, edge, M4(0, -26.2, 1.6, 0.12, 0, 0));
  // the eight-handled wheel above the head
  const wheel = grp(rig.head, 0, 15, 0);
  const wspin = grp(wheel, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    P.box(wspin, 0.9, 0.9, 6.4, wheelM, M4(Math.sin(a) * 3.2, 0, Math.cos(a) * 3.2, 0, a, 0));      // spoke
    P.box(wspin, 3.2, 0.8, 0.9, wheelM, M4(Math.sin(a) * 6.2, 0, Math.cos(a) * 6.2, 0, a, 0));      // rim segment
    P.box(wspin, 0.8, 0.8, 2.6, wheelD, M4(Math.sin(a) * 8.0, 0, Math.cos(a) * 8.0, 0, a, 0));      // handle
    P.box(wspin, 1.4, 1.4, 1.4, wheelM, M4(Math.sin(a) * 9.4, 0, Math.cos(a) * 9.4, 0, a, 0));      // handle knob
  }
  P.box(wspin, 2.4, 1.6, 2.4, wheelD, M4(0, 0, 0));
  const wglowM = glowMat(GOLDW, 0.01, { transparent: true, additive: true });
  const wglow = new THREE.Mesh(new THREE.CylinderGeometry(10.5 * PX, 10.5 * PX, 0.6 * PX, 24), wglowM); wglow.castShadow = false; wspin.add(wglow);
  P.flush();
  const fx = groundFX(rig, 0xfff0c0, 1.8);
  let notch = 0, ang = 0, pulse = 0, spin = 0;
  rig.extras.sword = sword; rig.extras.wheel = wheel;
  rig.extras.turnWheel = () => { notch++; pulse = 1; };
  rig.extras.spin = (on) => { spin = on ? 1 : 0; };
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    // the wheel ratchets one handle per adaptation, with a springy overshoot; spins on guard
    const want = notch * Math.PI / 4;
    ang += (want - ang) * Math.min(1, dt * 10) + spin * dt * 6;
    if (spin) notch = Math.round(ang / (Math.PI / 4));
    wspin.rotation.y = ang;
    wheel.position.y = 15 * PX + Math.sin(t * 1.6) * 0.4 * PX;
    pulse = Math.max(0, pulse - dt * 1.4);
    wglowM.userData.amp.value = pulse * 3 + spin * 1.2;
    m.userData.emitMask.value = 0.6 + pulse * 2;
    for (const w of wings) w.g.rotation.y = w.sx * Math.sin(t * 2.4 + w.ph) * 0.12;
    if (b.lightH) { b.lightH.intensity = 3 + pulse * 6; b.lightH.offsetY = 7.5; }
    if (pulse > 0.6) for (let i = rate(40, dt, bud); i > 0; i--) { wheel.getWorldPosition(v1); const a = Math.random() * 6.28; Pt.glow.spawn({ x: v1.x + Math.cos(a) * 1.4, y: v1.y, z: v1.z + Math.sin(a) * 1.4, vx: Math.cos(a) * 3, vy: 1, vz: Math.sin(a) * 3, life: 0.6, r: 2.4, g: 2.2, b: 1.4, size: 0.16, drag: 2, sizeEnd: 0.1 }); }
    // a faint shadow haze at the feet (it is a shikigami of the Ten Shadows)
    for (let i = rate(5, dt, bud); i > 0; i--) Pt.smoke.spawn({ x: b.pos.x + rnd(1.4), y: b.pos.y + 0.1, z: b.pos.z + rnd(1.4), vy: 0.3, life: 1.4, r: 0.03, g: 0.03, b: 0.05, size: 0.6, gravity: -0.1, drag: 1, sizeEnd: 2.6 });
  };
  rig.fx = fx;
  return rig;
}

// which attack hit it: melee, a domain, lingering damage, or the technique the attacker cast last
function sourceOf(b, src, o) {
  const g = b.game;
  if (o.melee) return ['melee', 'Physical Strikes'];
  if (g.domain && g.domain.caster === src && g.domain.caster !== b) return ['domain', g.domain.def.name];
  if (o.dot) return ['dot', 'Lingering Damage'];
  const kit = src?.kit;
  if (kit?.slots) {
    let best = null, be = Infinity;
    for (const k in kit.slots) { const s = kit.slots[k]; if (!(s.cdLeft > 0)) continue; const el = s.cd * (kit.cdr ?? 1) - s.cdLeft; if (el < be) { be = el; best = [k, s.name]; } }
    if (best && be < 4) return ['tech:' + best[0], best[1]];
    if (kit.ultimate && src.ce < 5) return ['ult', kit.ultimate.name];
  }
  return ['tech', 'Cursed Techniques'];
}

export const mahoraga = {
  name: 'Mahoraga', hudName: 'Divine General Mahoraga', title: 'EIGHT-HANDLED SWORD DIVERGENT SILA DIVINE GENERAL MAHORAGA',
  hp: 3300, speed: 3.4, dmg: 26, color: GOLDW, radius: 1.5, height: 5.2, keepDist: 3.6, pitch: 0.4,
  build: buildMahoraga,
  phaseNames: ['', 'THE WHEEL TURNS FASTER', 'MAHORAGA · FULLY ADAPTED'],
  phases: [
    ['sword_of_extermination', 'rush', 'extermination_cleave', 'divine_leap'],
    ['sword_of_extermination', 'rush', 'extermination_cleave', 'divine_leap', 'adaptive_guard'],
    ['extermination_combo', 'divine_leap', 'adaptive_guard', 'sword_of_extermination', 'rush', 'extermination_cleave'],
  ],
  init() { this.st.adapt = new Map(); this.st.hudT = 0; },
  reset() { this.rig.extras.spin(false); this.st.guard = false; },
  onDamage(dmg, src, o) {
    const g = this.game;
    const [key, label] = sourceOf(this, src, o);
    let a = this.st.adapt.get(key);
    if (!a) { a = { key, label, turns: 0, prog: 0, last: g.time }; this.st.adapt.set(key, a); }
    a.last = g.time;
    // countering the guard
    if (this.st.guard && src && !src.dead) { this.st.guardHit = src; }
    const out = dmg * (1 - RESIST[a.turns]);
    if (a.turns > 0 && Math.random() < 0.35) g.fx.damageNumber(this.pos.clone().setY(this.pos.y + 1.5), 0, { text: 'ADAPTED', color: '#d8cfa0' });
    // progress toward the next turn of the wheel: hits and damage both count
    if (a.turns < 3) {
      a.prog += 1 + dmg / (this.maxHp * 0.02);
      const need = 7 + a.turns * 3;
      if (a.prog >= need) { a.prog = 0; a.turns++; this.B.turnWheel.call(this, a); }
    }
    return out;
  },
  turnWheel(a) {
    const g = this.game;
    this.rig.extras.turnWheel();
    const w = this.rig.extras.wheel.getWorldPosition(V());
    g.fx.flash(GOLDW, 0.35, 0.25); g.fx.screenWave(w, 0.7, 0.4);
    g.fx.rings.spawn(this.gy(this.pos).setY(this.pos.y + 0.08), { color: GOLDW, r0: 1, r1: 7, dur: 0.6, thick: 0.08 });
    g.lights.flash(w, GOLDW, 10, 14, 0.4);
    // the clank of the wheel
    const au = g.audio; if (au?.started) { au.tone({ freq: 160, to: 120, dur: 0.25, gain: 0.35, type: 'square', filter: 900 }); au.noise({ dur: 0.12, gain: 0.4, type: 'bandpass', freq: 2400, q: 3 }); au.tone({ freq: 640, dur: 0.6, gain: 0.08, type: 'triangle', rev: 0.6, at: 0.05 }); }
    this.callout(`⎈ THE WHEEL TURNS — ADAPTED TO ${a.label.toUpperCase()} ${ROMAN[a.turns]}`);
    this.B.hud.call(this);
  },
  hud() {
    const el = this.game.hud?.boss?.children?.[0]; if (!el || this.game.mission?.boss !== this) return;
    const list = [...this.st.adapt.values()].filter((a) => a.turns > 0).map((a) => `${a.label} ${ROMAN[a.turns]}`);
    el.textContent = this.displayName + (list.length ? `  ⎈ ${list.join(' · ')}` : '');
  },
  tick(dt) {
    const g = this.game;
    // adaptations loosen one turn after 9 s without that source
    let changed = false;
    for (const a of this.st.adapt.values()) if (a.turns > 0 && g.time - a.last > 9) { a.turns--; a.last = g.time; changed = true; }
    if (changed) this.B.hud.call(this);
  },
  moves: {
    // Sword of Extermination: a wide sweeping cut
    *sword_of_extermination() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      const R = 6.4;
      g.markers.spawn({ pos: this.gy(this.pos), radius: R, dur: 0.85, shape: 'cone', arc: 0.42, facing: this.facing, color: 0xff3a2a });
      this.pose('attack', { t: 0.2, style: 'swingR', windup: 0.3, strike: 0.5 });
      this.callout('Sword of Extermination');
      yield 0.85;
      this.pose('attack', { t: 0.6, style: 'swingR', windup: 0.3, strike: 0.5 });
      g.fx.slashArc(this.pos, this.facing, GOLDW, R, 0.45, 0.22); g.fx.slashArc(this.pos.clone().setY(this.pos.y + 0.4), this.facing, 0xffffff, R * 0.9, 0.45, 0.2);
      g.audio?.energy('slash'); g.audio?.impact(1.6); g.shake(0.5);
      this.hurtCone(this.pos, this.facing, R, 1.35, this.dmg * 1.1, 10);
      g.combat.hitBlocks(this.pos, this.fwd(), R, 1.3, 90, null);
      this.free();
      yield 0.7;
    },
    // Extermination Cleave: an overhead strike splitting the ground in a line
    *extermination_cleave() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      const L = 14;
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 2.8, length: L, facing: this.facing, dur: 1.0, color: 0xff2a1a });
      this.pose('attack', { t: 0.15, style: 'slam', windup: 0.35, strike: 0.55 });
      this.callout('Extermination Cleave');
      yield 1.0;
      this.pose('attack', { t: 0.6, style: 'slam', windup: 0.35, strike: 0.55 });
      const dir = this.fwd();
      g.audio?.impact(2); g.shake(0.8);
      for (let s = 1.5; s < L; s += 1.5) { const q = this.gy(this.pos.clone().addScaledVector(dir, s)); g.particles.burst(q, { count: 5, color: 0x9a8a7a, additive: false, speed: 4, up: 3, life: 0.6, size: 0.5, gravity: 10 }); g.particles.burst(q, { count: 3, color: GOLDW, speed: 3, up: 4, life: 0.4, size: 0.2 }); }
      g.fx.slashLine(this.pos.clone().setY(this.pos.y + 0.3), dir, L, GOLDW, 0.6, 0.3);
      this.hurtLine(this.pos, dir, L, 1.4, this.dmg * 1.4, 4, { up: 9 });
      for (let s = 2; s < L; s += 2.5) g.combat.hitBlocks(this.pos.clone().addScaledVector(dir, s), dir, 1.2, Math.PI, 90, null);
      this.free();
      yield 0.8;
    },
    // it jumps onto you
    *divine_leap() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('raise');
      const to = this.gy(this.clampArena(t.pos.clone()));
      this.mark(to, { radius: 3.6, dur: 1.1, color: 0xff2a1a });
      this.callout('Divine Leap');
      yield 0.35;
      yield* this.leap(to, 0.75, 7);
      g.fx.explosion(to, 0xd8d0b8, 3.6); g.fx.screenWave(to, 1, 0.45); g.shake(0.9); g.audio?.impact(2);
      this.hurt(to, 3.6, this.dmg * 1.3, 14, { up: 6 });
      g.combat.hitBlocks(to, V(0, 0, 1), 3, Math.PI, 120, null);
      this.free();
      yield 0.8;
    },
    // a straight barrage of blows
    *rush() {
      const g = this.game;
      this.callout('Rush');
      for (let k = 0; k < 4; k++) {
        const t = this.aim(); if (!t) break;
        this.still();
        g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 2.6, length: 5.5, facing: this.facing, dur: 0.45, color: 0xff3a2a, follow: this });
        this.pose('attack', { t: 0.2, style: k % 2 ? 'swingL' : 'punch', windup: 0.3, strike: 0.5 });
        yield 0.45;
        this.pose('attack', { t: 0.6, style: k % 2 ? 'swingL' : 'punch', windup: 0.3, strike: 0.5 });
        const dir = this.fwd(); this.knock.copy(dir).multiplyScalar(14);
        g.audio?.impact(1.3); g.shake(0.3);
        this.hurtLine(this.pos, dir, 5.5, 1.3, this.dmg * 0.75, 9);
        yield 0.18;
      }
      this.free();
      yield 0.6;
    },
    // the wheel spins while it guards; strike it and it answers at once
    *adaptive_guard() {
      const g = this.game;
      this.still(); this.pose('sign');
      this.callout('The wheel spins… (don\'t strike it!)');
      this.rig.extras.spin(true); this.st.guard = true; this.st.guardHit = null;
      for (let k = 0; k < 18 && !this.st.guardHit; k++) yield 0.1;
      this.rig.extras.spin(false); this.st.guard = false;
      const who = this.st.guardHit;
      if (who && !who.dead) {
        this.callout('Counter!');
        this.aim(who);
        const to = this.gy(this.clampArena(who.pos.clone()));
        g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 3, length: Math.min(14, this.pos.distanceTo(to) + 2), facing: this.facing, dur: 0.4, color: 0xff1a1a });
        yield 0.4;
        yield* this.dash(this.fwd(), 38, 8, 1.6, this.dmg * 1.4, 14, { trail: () => g.fx.slashArc(this.pos, this.facing + Math.PI / 2, GOLDW, 3, 0.5, 0.15) });
      }
      this.free();
      yield 0.5;
    },
    // phase 3: sweep, cleave, leap without a pause
    *extermination_combo() {
      yield* this.B.moves.sword_of_extermination.call(this);
      yield* this.B.moves.extermination_cleave.call(this);
    },
  },
};
