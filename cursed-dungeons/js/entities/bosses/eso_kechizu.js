// ESO & KECHIZU — Death Painting Wombs No. 2 and No. 3, brothers of Choso,
// woken from the stolen paintings (Yasohachi Bridge). Kechizu is a second,
// linked body: he fights alongside Eso and falls on his own.
// Technique: Rot Technique — their blood is poison; when BOTH brothers' blood
// is on you, it activates: Decay (heavy rot damage over time).
//   Wing King          Eso's blood wings open and fire volleys of blood darts
//   Rot Spray          a cone of rotting blood mist that leaves poison pools
//   Rot Claw           a lunging slash
//   Decay Rain         (phase 3) rotten blood falls across the arena
//   Kechizu: Blood Spit (lobbed, pools), Belly Flop (hops onto you), Vomit Stream
import * as THREE from 'three/webgpu';
import { Skin, Rig, PX } from '../character.js';
import { pixMat, glowMat, bloodMat, groundFX, Parts, M4, grp, face, ring, paintBox, finishMaterial, HS, rate, rnd } from '../boss-looks.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ROT = 0x9a1a2a, ROTG = 0x6aa83a, BILE = 0x8ac83a;
const v1 = new THREE.Vector3();

// =====================================================================
// Eso: gaunt, pale green, a second face gaping on his bare back; blood wings
// =====================================================================
export function buildEso() {
  const S = new Skin(2020);
  const SK = 0xa6b48e, SK2 = 0x8a9a72, SK3 = 0x6a7a56, HAIR = 0x1a2416, VEST = 0x2a3a3a, VEST2 = 0x1a2626, TRIM = 0xd8d0b8, PANTS = 0x2a2420, MARK = 0x8a1020;
  S.mat = 'skin'; for (const k of ['head', 'body', 'armR', 'armL']) paintBox(S, k, SK, 0.05);
  S.mat = 'hair'; S.rect(8, 0, 8, 8, HAIR, 0.1); for (const x of [0, 16, 24]) S.rect(x, 8, 8, 3, HAIR, 0.1); S.rect(8, 8, 8, 1, HAIR, 0.1);
  S.rect(24, 11, 8, 2, HAIR, 0.1);
  // face: hollow cheeks, blood-red markings under round staring eyes, a wide lipless mouth
  S.mat = 'skin'; S.rect(8, 9, 8, 1, SK2, 0.04); S.rect(8, 12, 1, 3, SK3, 0.04); S.rect(15, 12, 1, 3, SK3, 0.04);
  S.mat = 'eye'; S.rect(9, 10, 2, 2, 0xf0e8d0, 0.02); S.rect(13, 10, 2, 2, 0xf0e8d0, 0.02); S.fineRect(9.5, 10.5, 1, 1, 0x1a0a08); S.fineRect(13.5, 10.5, 1, 1, 0x1a0a08);
  S.mat = 'skin'; S.fineRect(9, 12, 2, 0.5, MARK, 'skin'); S.fineRect(13, 12, 2, 0.5, MARK, 'skin'); S.fineRect(9.5, 12.5, 0.5, 1.5, MARK, 'skin'); S.fineRect(14, 12.5, 0.5, 1.5, MARK, 'skin');
  S.fineRect(9.5, 14, 5, 0.5, 0x2a0a10, 'skin'); for (let x = 10; x < 14.5; x += 1) S.fineRect(x, 14, 0.5, 0.5, 0xe8e0c8, 'eye');
  // the face on his back
  { const [bx, by] = face('body').back; S.mat = 'flesh'; S.rect(bx + 1, by + 1, 6, 10, SK2, 0.05);
    S.mat = 'eye'; S.rect(bx + 1, by + 2, 2, 2, 0x140806, 0.02); S.rect(bx + 5, by + 2, 2, 2, 0x140806, 0.02); S.px(bx + 2, by + 3, 0xff3a2a); S.px(bx + 5, by + 3, 0xff3a2a);
    S.mat = 'flesh'; S.rect(bx + 1, by + 6, 6, 4, 0x2a060a, 0.04); for (let x = 1; x < 7; x++) { S.fineRect(bx + x, by + 6, 0.5, 1, 0xe8e0c8, 'eye'); S.fineRect(bx + x + 0.5, by + 9.5, 0.5, 0.5, 0xe8e0c8, 'eye'); } }
  // a sleeveless vest open at the back, baggy trousers
  S.mat = 'cloth'; paintBox(S, 'jacket', VEST, 0.06);
  { const [x, y, w] = face('jacket').ring; S.fineRect(x, y + 11.5, w, 0.5, TRIM, 'cloth');
    const [bx, by] = face('jacket').back; S.ctx.clearRect(bx + 1, by, 6, 12);
    const [fx, fy] = face('jacket').front; S.ctx.clearRect(fx + 3, fy, 2, 6); S.rect(fx + 2, fy, 1, 6, TRIM, 0.03); S.rect(fx + 5, fy, 1, 6, TRIM, 0.03);
    const [tx, ty] = face('jacket').top; S.rect(tx, ty, 8, 4, VEST2, 0.05); }
  for (const ko of ['armRo', 'armLo']) { const f = face(ko); S.ctx.clearRect(f.ring[0], f.ring[1], f.ring[2], 12); S.ctx.clearRect(f.top[0], f.top[1], 4, 4); S.ctx.clearRect(f.bottom[0], f.bottom[1], 4, 4); }
  for (const k of ['armR', 'armL']) { const [x, y, w] = face(k).ring; S.mat = 'skin'; S.rect(x, y + 9, w, 3, SK3, 0.06); for (let i = 0; i < w; i += 2) S.fineRect(x + i, y + 11.5, 0.5, 0.5, MARK, 'skin'); }
  for (const k of ['legR', 'legL']) { S.mat = 'cloth'; paintBox(S, k, PANTS, 0.06); const f = face(k); S.rect(f.ring[0], f.ring[1] + 9, 16, 1, TRIM, 0.04); S.mat = 'skin'; S.rect(f.ring[0], f.ring[1] + 10, 16, 2, SK3, 0.05); S.rect(f.bottom[0], f.bottom[1], 4, 4, SK3, 0.05); }
  const m = finishMaterial(S, { emit: 1.6, fill: 0.13, rim: 0xff3a4a, rimStrength: 0.35 });
  const hair = Skin.hairMaterial(HAIR);
  const rig = new Rig({ material: m, scale: 2.05, hair: [
    { x: 0, y: 8.2, z: -1.2, w: 3.0, h: 3.6, d: 3.0, rx: -0.5, material: hair, stiff: 60 },
    { x: 0, y: 8.0, z: 1.2, w: 7.6, h: 1.0, d: 3.4, rx: 0.15, material: hair, stiff: 80 },
  ] });
  const P = new Parts(rig);
  const skin = pixMat(SK, { noise: 0.08, rim: 0xff3a4a, rimStrength: 0.3 }), skin3 = pixMat(SK3, { noise: 0.1 }), bone = pixMat(0xe8e0c8, { noise: 0.06, rough: 0.5 }), pants = pixMat(PANTS, { noise: 0.08 });
  const blood = bloodMat(ROT, { emissive: 0.5 }), bloodD = bloodMat(0x5a0a14, { emissive: 0.3 });
  // the back face's teeth jut out, ribs show at the sides
  for (let i = 0; i < 5; i++) { P.box(rig.torso, 0.6, 1.4, 0.8, bone, M4(-2.4 + i * 1.2, 5.2, -2.4)); P.box(rig.torso, 0.6, 1.2, 0.8, bone, M4(-2.4 + i * 1.2, 2.0, -2.4)); }
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) P.box(rig.torso, 0.6, 0.5, 3.4, skin3, M4(sx * 4.1, 6 + i * 1.6, 0));
  for (const leg of [rig.legR, rig.legL]) P.box(leg, 5.2, 6, 5.2, pants, M4(0, -3.4, 0));
  // claw-like fingers dipped in blood
  for (const hand of [rig.handR, rig.handL]) for (let i = 0; i < 3; i++) P.box(hand, 0.7, 2.6, 0.7, blood, M4(-1.3 + i * 1.3, -2.8, 1.4, 0.3, 0, 0));
  // Wing King: membrane wings of blood on the back (folded, open for the attack)
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = grp(rig.torso, sx * 2.4, 10, -2.6, 0, 0, 0);
    const arm = grp(w, 0, 0, 0);
    P.box(arm, 12, 1.2, 1.2, bloodD, M4(sx * 6, 2, 0, 0, 0, sx * 0.3));
    for (let i = 0; i < 4; i++) P.box(arm, 1.0, 9 - i * 1.4, 0.6, bloodD, M4(sx * (3 + i * 3), -2 - i * 0.4, 0, 0, 0, sx * (0.15 - i * 0.12)));
    for (let i = 0; i < 4; i++) P.box(arm, 2.8, 7.5 - i * 1.4, 0.3, blood, M4(sx * (4.5 + i * 3), -1.2 - i * 0.5, 0.05, 0, 0, sx * (0.1 - i * 0.1)));
    w.scale.setScalar(0.01); w.visible = false;
    wings.push({ w, sx });
  }
  P.flush();
  const fx = groundFX(rig, ROT, 1.2);
  let open = 0, openWant = 0;
  rig.extras.wings = (on) => { openWant = on ? 1 : 0; if (on) for (const w of wings) w.w.visible = true; };
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    open += (openWant - open) * Math.min(1, dt * 6);
    for (const w of wings) { w.w.scale.setScalar(0.01 + open); w.w.visible = open > 0.02; w.w.rotation.y = w.sx * (0.5 - open * 0.4 + Math.sin(t * 6) * 0.15 * open); }
    m.userData.emitMask.value = 1.4 + Math.sin(t * 2.6) * 0.5;
    if (b.lightH) { b.lightH.intensity = 3.2; b.lightH.offsetY = 5; }
    // blood dripping from the claws, rot haze at the feet
    if (Math.random() < dt * 4) { (Math.random() < 0.5 ? rig.handR : rig.handL).getWorldPosition(v1); Pt.glow.spawn({ x: v1.x, y: v1.y - 0.2, z: v1.z, vy: -1, life: 0.7, r: 1.5, g: 0.08, b: 0.12, size: 0.08, gravity: 14, drag: 0.2, sizeEnd: 0.6, shape: 'square' }); }
    for (let i = rate(4, dt, bud); i > 0; i--) Pt.smoke.spawn({ x: b.pos.x + rnd(1), y: b.pos.y + 0.2, z: b.pos.z + rnd(1), vx: rnd(0.2), vy: 0.4, vz: rnd(0.2), life: 1.6, r: 0.22, g: 0.3, b: 0.08, size: 0.5, gravity: -0.1, drag: 1, sizeEnd: 2.4 });
  };
  rig.fx = fx;
  return rig;
}

// =====================================================================
// Kechizu: a squat lump of flesh on stubby legs, a fanged mouth on top of
// its head, tiny eyes, a little face on its rear
// =====================================================================
export function buildKechizu() {
  const S = new Skin(3030);
  const SK = 0x9a5a48, SK2 = 0x7a4232, SK3 = 0xb87a62, PANTS = 0x3a3a2a, MARK = 0x5a1414;
  S.mat = 'flesh'; for (const k of ['head', 'body', 'armR', 'armL']) paintBox(S, k, SK, 0.07);
  { const [x, y, w, h] = face('body').ring; for (let i = 0; i < 14; i++) S.rect(x + Math.floor(S.r() * (w - 2)), y + Math.floor(S.r() * (h - 2)), 2, 1, i % 2 ? SK2 : SK3, 0.06); }
  S.rect(8, 0, 8, 8, 0x3a0a0a, 0.05);                            // the mouth on top (3D lips/teeth)
  S.mat = 'eye'; S.px(9, 12, 0x140806); S.px(14, 12, 0x140806); S.fine(9, 12, 0xffd84a); S.fine(14.5, 12, 0xffd84a);
  S.mat = 'flesh'; S.fineRect(10, 14, 4, 0.5, MARK, 'flesh'); S.rect(8, 9, 8, 1, SK2, 0.05);
  { const [bx, by] = face('body').back; S.mat = 'eye'; S.px(bx + 2, by + 6, 0x140806); S.px(bx + 5, by + 6, 0x140806); S.mat = 'flesh'; S.fineRect(bx + 3, by + 8, 2, 0.5, MARK, 'flesh'); }
  { const [x, y, w] = face('jacket').ring; S.ctx.clearRect(x, y, w, 12); const t = face('jacket').top; S.ctx.clearRect(t[0], t[1], 8, 4); }
  for (const ko of ['armRo', 'armLo']) { const f = face(ko); S.ctx.clearRect(f.ring[0], f.ring[1], f.ring[2], 12); S.ctx.clearRect(f.top[0], f.top[1], 4, 4); S.ctx.clearRect(f.bottom[0], f.bottom[1], 4, 4); }
  for (const k of ['legR', 'legL']) { S.mat = 'cloth'; paintBox(S, k, PANTS, 0.06); const f = face(k); S.mat = 'flesh'; S.rect(f.ring[0], f.ring[1] + 8, 16, 4, SK2, 0.06); S.rect(f.bottom[0], f.bottom[1], 4, 4, SK2, 0.05); }
  const m = finishMaterial(S, { emit: 1.4, fill: 0.13, rim: 0xffb84a, rimStrength: 0.3 });
  const rig = new Rig({ material: m, scale: 2.1, legH: 6, bodyH: 9, headS: 10 });
  const P = new Parts(rig);
  const flesh = pixMat(SK, { noise: 0.14, rim: 0xffb84a, rimStrength: 0.3 }), flesh2 = pixMat(SK2, { noise: 0.14 }), lip = pixMat(0x6a1a1a, { noise: 0.1 }), bone = pixMat(0xe8dcc0, { noise: 0.06, rough: 0.5 }), maw = glowMat(0x5a0a0a, 0.8);
  const blood = bloodMat(ROT, { emissive: 0.5 });
  // a huge belly bulging out of the small frame
  P.box(rig.torso, 12, 7, 8.4, flesh, M4(0, 3.2, 0.8)); P.box(rig.torso, 10, 2.4, 7, flesh2, M4(0, 7.4, 0)); P.box(rig.torso, 8, 1.6, 1.2, flesh2, M4(0, 1.4, 5.1));
  for (const [x, y, z] of [[4.2, 5, 5.0], [-4.6, 2.4, 5.0], [6.1, 2.6, -1], [-6.1, 5, 1.6], [1, 1, -4.4]]) P.box(rig.torso, 1.6, 1.4, 0.8, flesh2, M4(x, y, z));
  // the mouth on top of the head: lips, black maw, fangs; a lolling tongue of blood
  const top = 10 / 8 * 8 * HS;
  // tilted toward the front so the gaping mouth reads from the camera
  const mouth = grp(rig.head, 0, top, 0.6, 0.35, 0, 0);
  P.box(mouth, 11, 1.4, 11, lip, M4(0, 0.2, 0)); P.box(mouth, 8, 0.6, 8, maw, M4(0, 0.6, 0));
  for (let i = 0; i < 7; i++) { P.box(mouth, 0.8, 1.6, 0.8, bone, M4(-3.6 + i * 1.2, 1.4, 4)); P.box(mouth, 0.8, 1.6, 0.8, bone, M4(-3.6 + i * 1.2, 1.4, -4)); }
  for (let i = 0; i < 5; i++) { P.box(mouth, 0.8, 1.6, 0.8, bone, M4(4, 1.4, -2.4 + i * 1.2)); P.box(mouth, 0.8, 1.6, 0.8, bone, M4(-4, 1.4, -2.4 + i * 1.2)); }
  const tongue = grp(mouth, 0, 0.8, 4.6);
  P.box(tongue, 2, 0.6, 2.4, blood, M4(0, 0.4, 0.6, -0.2, 0, 0)); P.box(tongue, 1.6, 0.6, 1.2, blood, M4(0, 0.2, 2, 0.5, 0, 0));
  for (const hand of [rig.handR, rig.handL]) P.box(hand, 4.6, 3, 4.6, flesh2, M4(0, 1, 0));
  P.flush();
  const fx = groundFX(rig, ROT, 1.4);
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    tongue.rotation.x = Math.sin(t * 3) * 0.2; tongue.rotation.y = Math.sin(t * 2.2) * 0.3;
    rig.torso.scale.y *= 1 + Math.sin(t * 2) * 0.03;
    if (b.lightH) { b.lightH.intensity = 2.4; b.lightH.offsetY = 4; }
    if (Math.random() < dt * 5) { tongue.getWorldPosition(v1); Pt.glow.spawn({ pos: v1, vx: rnd(0.3), vy: 0.4, vz: rnd(0.3), life: 0.8, r: 1.4, g: 0.06, b: 0.1, size: 0.1, gravity: 12, drag: 0.2, sizeEnd: 0.6, shape: 'square' }); }
    for (let i = rate(3, dt, bud); i > 0; i--) Pt.smoke.spawn({ x: b.pos.x + rnd(1), y: b.pos.y + 0.2, z: b.pos.z + rnd(1), vy: 0.4, life: 1.4, r: 0.24, g: 0.32, b: 0.08, size: 0.5, gravity: -0.1, drag: 1, sizeEnd: 2.2 });
  };
  rig.fx = fx;
  return rig;
}

// a rotting pool left by their blood
function rotPool(b, at, r = 1.6) { b.game.hazards.add({ pos: at, radius: r, dps: b.dmg * 0.35, dur: 5, color: ROTG, slow: 0.3 }); }
// mark a sorcerer with one brother's blood; with both, Decay activates
function bleedOn(eso, p, who) {
  if (!eso || eso.dead || !p || p.dead) return;
  const g = eso.game, r = eso.st.rot.get(p) ?? { e: -99, k: -99, decay: 0 };
  r[who] = g.time; eso.st.rot.set(p, r);
  g.fx.damageNumber(p.pos, 0, { text: who === 'e' ? 'ESO\'S BLOOD' : 'KECHIZU\'S BLOOD', color: '#c84a5a' });
  if (g.time - r.e < 7 && g.time - r.k < 7 && r.decay <= 0) {
    r.decay = 4; r.tick = 0; r.e = r.k = -99;
    eso.callout('ROT TECHNIQUE: DECAY', true);
    g.fx.flash(0x4a6a1a, 0.3, 0.3);
  }
}

export const eso_kechizu = {
  name: 'Eso & Kechizu', hudName: 'Eso & Kechizu · Death Painting Wombs', title: 'ESO & KECHIZU · DEATH PAINTING WOMBS',
  hp: 2400, speed: 3.2, dmg: 21, color: ROT, radius: 0.95, height: 4.0, keepDist: 5,
  build: buildEso,
  phaseNames: ['', 'ESO · "WE ARE BROTHERS"', 'ROT TECHNIQUE · DECAY RAIN'],
  phases: [
    ['wing_king', 'rot_spray', 'rot_claw', 'wing_king'],
    ['wing_king', 'rot_spray', 'rot_claw', 'wing_king', 'rot_spray'],
    ['decay_rain', 'wing_king', 'rot_spray', 'rot_claw', 'decay_rain'],
  ],
  init() { this.st.rot = new Map(); },
  reset() { this.rig.extras.wings(false); },
  tick(dt) {
    const g = this.game;
    // Kechizu crawls out of the painting beside his brother
    if (!this.st.kSpawned) {
      this.st.kSpawned = true;
      const at = this.around(this.pos, 2.5, 3.5);
      const k = new this.constructor(g, 'kechizu', at, this.level, { parent: this, intro: 1.4, facing: this.facing });
      g.scene.add(k.object); g.enemies.push(k); this.linkedTo.push(k); this.st.kechizu = k;
      g.fx.summonCircle(at, ROT);
    }
    // Decay eats whoever carries both brothers' blood
    for (const [p, r] of this.st.rot) {
      if (r.decay > 0) {
        r.decay -= dt; r.tick -= dt;
        if (r.tick <= 0) { r.tick = 0.4; p.takeDamage(this.dmg * 0.22, this, { dot: true, noKnock: true }); }
        if (Math.random() < dt * 25) g.particles.smoke.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.6, y: p.pos.y + Math.random() * 1.6, z: p.pos.z + (Math.random() - 0.5) * 0.6, vy: 0.6, life: 0.9, r: 0.2, g: 0.35, b: 0.06, size: 0.25, gravity: -0.2, drag: 1, sizeEnd: 1.6 });
      }
      if (p.dead) this.st.rot.delete(p);
    }
  },
  onLinkedDeath(k) {
    // Eso is enraged at his brother's death
    this.callout('"KECHIZU!!"', true);
    this.speedMul = 1.35; this.dmg *= 1.2; this.dmgTaken = 0.9;
    this.game.fx.flash(ROT, 0.4, 0.3);
  },
  moves: {
    // 翅王 Wing King: blood wings open and fire volleys of blood darts
    *wing_king() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('raise');
      this.rig.extras.wings(true);
      this.callout('Wing King');
      g.audio?.whoosh(1.4);
      yield 0.6;
      const self = this;
      for (let v = 0; v < 3; v++) {
        const tg = this.players()[v % this.players().length] ?? t; this.aim(tg);
        const n = 5 + this.phase;
        g.markers.spawn({ pos: this.gy(this.pos), radius: 12, dur: 0.4, shape: 'cone', arc: 0.2, facing: this.facing, color: 0xff2a3a });
        yield 0.4;
        for (let i = 0; i < n; i++) {
          const a = this.facing + (i - (n - 1) / 2) * 0.13;
          const from = this.pos.clone().setY(this.pos.y + 3.2).add(V(Math.sin(a) * 0.8, 0, Math.cos(a) * 0.8));
          g.projectiles.fire({ pos: from, vel: V(Math.sin(a) * 18, -1.2, Math.cos(a) * 18), team: 'enemy', dmg: this.dmg * 0.4, shape: 'nail', color: 0xd01a2a, emissive: 2, life: 1.2, scale: 2.2, radius: 0.35,
            onHit: (p) => { p.takeDamage(self.dmg * 0.4, self, { knock: V(Math.sin(a) * 3, 0, Math.cos(a) * 3) }); bleedOn(self, p, 'e'); },
            onExpire: (pr) => g.particles.burst(pr.pos, { count: 4, color: ROT, speed: 2, life: 0.4, size: 0.14, shape: 1 }) });
        }
        g.audio?.energy('nail');
        yield 0.3;
      }
      this.rig.extras.wings(false);
      this.free();
      yield 0.6;
    },
    // a cone of rotting blood mist that leaves poison pools
    *rot_spray() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      const R = 7.5;
      g.markers.spawn({ pos: this.gy(this.pos), radius: R, dur: 0.8, shape: 'cone', arc: 0.25, facing: this.facing, color: 0x8aff3a });
      this.pose('cast', { t: 1, both: true });
      this.callout('Rot Technique: Blood Spray');
      yield 0.8;
      g.audio?.energy('spit');
      for (let k = 0; k < 10; k++) {
        const dir = this.fwd(), from = this.pos.clone().setY(this.pos.y + 2.2).addScaledVector(dir, 1);
        g.particles.burst(from, { count: 8, color: ROT, speed: 13, spread: 0.3, dir, life: 0.6, size: 0.4, sizeEnd: 1.8, drag: 1.6, intensity: 1.6 });
        g.particles.burst(from, { count: 4, color: 0x3a5a1a, additive: false, speed: 10, spread: 0.3, dir, life: 0.7, size: 0.5, sizeEnd: 2, drag: 1.6 });
        if (k % 3 === 0) this.hurtCone(this.pos, this.facing, R, 0.75, this.dmg * 0.35, 3, { onHit: (p) => bleedOn(this, p, 'e') });
        yield 0.06;
      }
      for (let i = 0; i < 3; i++) rotPool(this, this.gy(this.pos.clone().addScaledVector(this.fwd(), 2.5 + i * 2).add(V((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2))), 1.5);
      this.free();
      yield 0.6;
    },
    // a lunging slash with bloody claws
    *rot_claw() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 2.4, length: 9, facing: this.facing, dur: 0.65, color: 0xff2a3a });
      this.pose('attack', { t: 0.2, style: 'swingR', windup: 0.3, strike: 0.5 });
      this.callout('Rot Claw');
      yield 0.65;
      yield* this.dash(this.fwd(), 26, 8, 1.1, this.dmg * 1.0, 8, { onHit: (p) => bleedOn(this, p, 'e'), trail: () => g.fx.slashArc(this.pos, this.facing, ROT, 2.4, 0.4, 0.14) });
      this.free();
      yield 0.6;
    },
    // rotten blood rains across the arena
    *decay_rain() {
      const g = this.game;
      this.still(); this.pose('raise');
      this.rig.extras.wings(true);
      this.callout('Decay Rain', true);
      for (let w = 0; w < 3; w++) {
        const spots = this.players().map((p) => this.gy(p.pos));
        for (let i = 0; i < 6; i++) spots.push(this.around(this.arena.c, 1, this.arena.R));
        for (const s of spots) this.mark(s, { radius: 1.6, dur: 0.9, color: 0x8aff3a });
        yield 0.9;
        for (const s of spots) { g.particles.burst(s.clone().setY(s.y + 4), { count: 10, color: ROT, speed: 2, life: 0.6, size: 0.2, gravity: 30, shape: 1 }); this.hurt(s, 1.6, this.dmg * 0.6, 2, { onHit: (p) => bleedOn(this, p, 'e') }); }
        rotPool(this, spots[spots.length - 1], 1.4);
        yield 0.3;
      }
      this.rig.extras.wings(false);
      this.free();
      yield 0.5;
    },
  },
};

export const kechizu = {
  name: 'Kechizu', hudName: 'Kechizu · Death Painting Womb No. 3', title: 'KECHIZU', linked: true,
  hp: 1100, speed: 2.4, dmg: 18, color: 0xc84a3a, radius: 1.0, height: 2.8, keepDist: 3,
  build: buildKechizu,
  phaseAt: [-1, -1],
  phases: [['blood_spit', 'belly_flop', 'vomit_stream', 'blood_spit'], ['blood_spit'], ['blood_spit']],
  moves: {
    // a gob of blood lobbed in an arc; it pools where it lands
    *blood_spit() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('raise');
      const land = this.gy(t.pos), from = this.pos.clone().setY(this.pos.y + 2.8), T = 1.0;
      this.mark(land, { radius: 1.8, dur: T + 0.3, color: 0x8aff3a });
      yield 0.3;
      g.audio?.energy('spit');
      const vel = new THREE.Vector3().subVectors(land, from).divideScalar(T); vel.y = (land.y - from.y) / T + 0.5 * 16 * T;
      const self = this, eso = this.parent;
      g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg * 0.6, shape: 'cube', color: ROT, emissive: 1.2, gravity: 16, life: T + 0.05, scale: 2.2, radius: 0.6,
        trail: (pr) => g.particles.burst(pr.pos, { count: 1, color: ROT, speed: 0.4, life: 0.4, size: 0.2 }),
        onHit: (p) => { p.takeDamage(self.dmg * 0.6, self, {}); bleedOn(eso, p, 'k'); },
        onExpire: (pr) => { g.fx.splat(pr.pos, ROT); self.hurt(pr.pos, 1.8, self.dmg * 0.5, 4, { onHit: (p) => bleedOn(eso, p, 'k') }); rotPool(self, pr.pos, 1.6); } });
      this.free();
      yield 1.2;
    },
    // hops onto you with its whole weight
    *belly_flop() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('raise');
      const to = this.gy(this.clampArena(t.pos.clone()));
      this.mark(to, { radius: 2.6, dur: 1.0, color: 0xff2a1a });
      yield 0.35;
      yield* this.leap(to, 0.65, 5);
      g.fx.shockwave(to, ROT, 3); g.fx.splat(to.clone().setY(to.y + 0.5), ROT); g.shake(0.6); g.audio?.impact(1.8);
      this.hurt(to, 2.6, this.dmg * 1.1, 10, { onHit: (p) => bleedOn(this.parent, p, 'k') });
      this.free();
      yield 0.9;
    },
    // a short, ugly stream of blood from the mouth on its head
    *vomit_stream() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      g.markers.spawn({ pos: this.gy(this.pos), radius: 5, dur: 0.75, shape: 'cone', arc: 0.22, facing: this.facing, color: 0x8aff3a });
      this.pose('attack', { t: 0.2, style: 'slam', windup: 0.3, strike: 0.5 });
      yield 0.75;
      for (let k = 0; k < 8; k++) {
        const dir = this.fwd(); const from = this.pos.clone().setY(this.pos.y + 2.6).addScaledVector(dir, 0.6);
        g.particles.burst(from, { count: 8, color: ROT, speed: 9, spread: 0.25, dir: dir.clone().setY(0.3), life: 0.5, size: 0.3, gravity: 10, shape: 1 });
        if (k % 3 === 0) this.hurtCone(this.pos, this.facing, 5, 0.7, this.dmg * 0.4, 3, { onHit: (p) => bleedOn(this.parent, p, 'k') });
        yield 0.06;
      }
      rotPool(this, this.gy(this.pos.clone().addScaledVector(this.fwd(), 3)), 1.6);
      this.free();
      yield 0.8;
    },
  },
};
