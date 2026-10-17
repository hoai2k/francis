// RYOMEN SUKUNA — the King of Curses, in his vessel's body (Shibuya,
// 31 October). Technique: Shrine.
//   Dismantle        invisible cutting waves (thin lines flash first)
//   Dismantle Web    a rotating fan of cuts around him
//   Cleave           an X-cut that adjusts itself to the target's toughness
//                    (scales with your max HP); the circle follows, then locks
//   Black Flash      a blink and a punch wrapped in black sparks
//   Fuga ("Open")    a bow of flame forms; the arrow explodes into a firestorm
//   Malevolent Shrine (phase 3) an open domain — no barrier: the shrine of
//                    mouths and skulls rises and everything in reach is cut
import * as THREE from 'three/webgpu';
import { Skin, Rig, PX } from '../character.js';
import { pixMat, glowMat, groundFX, Parts, M4, grp, face, ring, paintBox, finishMaterial, HS, rate, rnd } from '../boss-looks.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const CRIMSON = 0xff2a3a, FIRE = 0xff7a2a;
const v1 = new THREE.Vector3();

// =====================================================================
// look: Yuji's body in the torn Jujutsu High uniform, Sukuna's markings
// =====================================================================
export function buildSukuna() {
  const S = new Skin(1913);
  const SK = 0xeec5a6, SK2 = 0xd8aa8a, HAIR = 0xf08ca0, HAIRD = 0xc8607a, UNDER = 0x2a1a16, INK = 0x14080a;
  const UNI = 0x1b1e2c, UNI2 = 0x262a3c, UNID = 0x101220, HOOD = 0xb3232e, GOLD = 0xd8b04a, RED = 0xff2a2a;
  // head: skin, swept-back pink hair over a dark undercut
  S.mat = 'skin'; paintBox(S, 'head', SK, 0.04);
  S.mat = 'hair';
  S.rect(8, 0, 8, 8, HAIR, 0.12);
  for (const [x, w] of [[0, 8], [16, 8], [24, 8]]) { S.rect(x, 8, w, 2, HAIR, 0.1); S.rect(x, 10, w, 3, UNDER, 0.08); }
  S.rect(8, 8, 8, 1, HAIR, 0.1); S.fineRect(8, 9, 8, 0.5, HAIRD, 'hair');
  for (let x = 8; x < 16; x += 2) S.fineRect(x + 0.5, 0, 0.5, 8, HAIRD, 'hair');
  // face: two pairs of eyes (the lower pair are slits), black marks under them
  S.mat = 'skin';
  S.fineRect(8.5, 9.5, 2.5, 0.5, INK); S.fineRect(13, 9.5, 2.5, 0.5, INK);              // brow marks
  S.fineRect(11.5, 8.5, 1, 1, INK);                                                     // forehead mark
  S.mat = 'eye';
  for (const x of [9, 13]) { S.rect(x, 11, 2, 1, 0xd8cfc2, 0.02); }
  S.px(10, 11, RED); S.px(13, 11, RED);
  S.fine(10.5, 11.5, 0x200000); S.fine(13, 11.5, 0x200000);
  S.fineRect(9, 10.5, 2, 0.5, INK); S.fineRect(13, 10.5, 2, 0.5, INK);
  // the second pair of eyes under the first: narrow red slits with black lids
  S.fineRect(9, 12, 2, 0.5, INK); S.fineRect(13, 12, 2, 0.5, INK);
  S.fineRect(9.5, 12.5, 1, 0.5, 0xe02020); S.fineRect(13.5, 12.5, 1, 0.5, 0xe02020);
  S.fineRect(9, 13, 2, 0.25, INK); S.fineRect(13, 13, 2, 0.25, INK);
  S.mat = 'skin';
  for (const y of [13.5, 14.25]) { S.fineRect(8, y, 1, 0.5, INK, 'skin'); S.fineRect(15, y, 1, 0.5, INK, 'skin'); }
  for (const y of [11, 12]) { S.fineRect(0, y, 3, 0.5, INK, 'skin'); S.fineRect(21, y, 3, 0.5, INK, 'skin'); }   // marks on the temples
  // the grin
  S.fineRect(10, 14.5, 4, 0.5, 0x3a0a0e, 'skin'); S.fineRect(10.5, 14.5, 3, 0.5, 0xf2ece4, 'eye');
  S.fineRect(9.5, 14, 0.5, 0.5, 0x3a0a0e, 'skin'); S.fineRect(14, 14, 0.5, 0.5, 0x3a0a0e, 'skin');
  // body: bare chest under the open jacket, black marks across it
  S.mat = 'skin'; paintBox(S, 'body', SK, 0.04);
  { const [fx, fy] = face('body').front; S.fineRect(fx + 1, fy + 2, 6, 0.5, INK, 'skin'); S.fineRect(fx + 2, fy + 3, 4, 0.5, INK, 'skin'); S.fineRect(fx + 1, fy + 7, 0.5, 3, INK, 'skin'); S.fineRect(fx + 6.5, fy + 7, 0.5, 3, INK, 'skin'); S.fineRect(fx + 3.75, fy + 5, 0.5, 4, SK2, 'skin'); }
  // uniform jacket on the jacket layer: open at the chest, torn on one side, gold buttons
  S.mat = 'cloth'; paintBox(S, 'jacket', UNI, 0.06);
  { const [fx, fy] = face('jacket').front;
    for (const [r, x, w] of [[0, 1, 6], [1, 2, 4], [2, 2, 4], [3, 3, 2], [4, 3, 2], [5, 3, 2], [6, 3, 2], [7, 3, 2]]) S.ctx.clearRect(fx + x, fy + r, w, 1);
    for (let r = 1; r < 12; r += 3) S.px(fx + 2, fy + r, GOLD);
    S.fineRect(fx, fy + 11.5, 8, 0.5, UNID, 'cloth');
    for (const [x, y] of [[fx + 6, fy + 8], [fx + 7, fy + 9], [fx + 6, fy + 10]]) S.ctx.clearRect(x, y, 1, 1);   // tear
    const [bx, by] = face('jacket').back; S.rect(bx, by, 8, 3, HOOD, 0.06); S.fineRect(bx, by + 3, 8, 0.5, 0x7a1018, 'cloth');
    const [tx, ty] = face('jacket').top; S.rect(tx, ty, 8, 4, UNI2, 0.05); }
  // arms: sleeves pushed up, black bands round the forearms
  for (const [k, ko] of [['armR', 'armRo'], ['armL', 'armLo']]) {
    S.mat = 'skin'; paintBox(S, k, SK, 0.04);
    const [x, y, w] = face(k).ring;
    S.mat = 'skin'; S.rect(x, y + 7, w, 1, INK, 0.02); S.rect(x, y + 9, w, 1, INK, 0.02);
    S.mat = 'cloth'; const fo = face(ko); S.rect(fo.top[0], fo.top[1], 4, 4, UNI, 0.05); S.rect(fo.ring[0], fo.ring[1], fo.ring[2], 5, UNI, 0.06);
    S.rect(fo.ring[0], fo.ring[1] + 5, fo.ring[2], 1, UNI2, 0.05);
  }
  for (const k of ['legR', 'legL']) {
    S.mat = 'cloth'; paintBox(S, k, UNI, 0.06); const f = face(k);
    S.fineRect(f.ring[0], f.ring[1] + 6, 16, 0.5, UNID, 'cloth');
    S.mat = 'leather'; S.rect(f.ring[0], f.ring[1] + 10, 16, 2, 0x8a1a22, 0.05); S.rect(f.ring[0], f.ring[1] + 11, 16, 1, 0xe8e4dc, 0.03); S.rect(f.bottom[0], f.bottom[1], 4, 4, 0x1a1a1a, 0.05);
  }
  const m = finishMaterial(S, { emit: 2.6, fill: 0.13, rim: 0xff3a3a, rimStrength: 0.55 });
  const hair = Skin.hairMaterial(HAIR), hairD = Skin.hairMaterial(HAIRD);
  // swept-back spikes
  const rig = new Rig({ material: m, scale: 2.0, hair: [
    { x: -2.2, y: 8.2, z: 1.2, w: 2.6, h: 3.4, d: 3, rx: -1.1, rz: 0.3, material: hair, stiff: 70 },
    { x: 0.4, y: 8.4, z: 1.6, w: 2.8, h: 3.8, d: 3, rx: -1.2, material: hair, stiff: 70 },
    { x: 2.6, y: 8.2, z: 1.0, w: 2.4, h: 3.2, d: 3, rx: -1.05, rz: -0.3, material: hairD, stiff: 70 },
    { x: -1.2, y: 8.0, z: -1.6, w: 3, h: 3.6, d: 2.6, rx: -1.5, rz: 0.2, material: hairD, stiff: 60 },
    { x: 1.6, y: 8.0, z: -1.4, w: 3, h: 3.2, d: 2.6, rx: -1.45, rz: -0.25, material: hair, stiff: 60 },
  ] });
  const P = new Parts(rig);
  const uni = pixMat(UNI, { noise: 0.08, rim: 0xff3a3a, rimStrength: 0.4 }), uni2 = pixMat(UNI2, { noise: 0.08 }), hood = pixMat(HOOD, { noise: 0.1 }), hoodD = pixMat(0x7a1018, { noise: 0.1 });
  const gold = pixMat(GOLD, { metal: 0.8, rough: 0.3, noise: 0.05 });
  // high collar and the red hood hanging on his back
  P.box(rig.torso, 8.6, 2.2, 1.0, uni2, M4(0, 12.6, -2.1)); P.box(rig.torso, 1.0, 2.2, 4.4, uni2, M4(-4.1, 12.6, 0)); P.box(rig.torso, 1.0, 2.2, 4.4, uni2, M4(4.1, 12.6, 0));
  const hoodG = grp(rig.torso, 0, 12, -2.6);
  P.box(hoodG, 7, 1.6, 1.6, hood, M4(0, -0.4, -0.4)); P.box(hoodG, 6, 4.2, 1.0, hood, M4(0, -2.6, -0.9)); P.box(hoodG, 5, 0.6, 1.1, hoodD, M4(0, -4.8, -0.9));
  // torn sleeve flaps and a button
  P.box(rig.torso, 1.2, 1.2, 0.5, gold, M4(-2, 10, 2.3));
  P.box(rig.armL, 4.8, 1.0, 4.8, uni, M4(0, -1.2, 0)); P.box(rig.armR, 4.8, 1.0, 4.8, uni, M4(0, -1.2, 0));
  // cursed energy flicker at the fingertips (claws of light)
  const clawM = glowMat(0xff3a3a, 2.4, { pulse: 11 });
  const claws = [];
  for (const hand of [rig.handR, rig.handL]) { const c = grp(hand, 0, -2.6, 0); for (let i = 0; i < 4; i++) P.box(c, 0.35, 1.6, 0.35, clawM, M4(-1.3 + i * 0.85, -0.6, 1.6)); c.visible = false; claws.push(c); }
  // the flame bow for Fuga (hidden)
  const bow = grp(rig.handL, 0, -2, 2.4); bow.visible = false;
  const fireM = glowMat(0xff8a2a, 3.2, { pulse: 14 }), fireW = glowMat(0xffe0a0, 3.5);
  for (let i = -4; i <= 4; i++) P.box(bow, 1, 1.6, 1, i % 2 ? fireM : fireW, M4(Math.sin(i / 4 * 1.2) * 0, i * 1.6, -Math.cos(i / 4 * 1.2) * 2 + 2, 0, 0, 0));
  P.box(bow, 0.5, 0.5, 14, fireW, M4(0, 0, 4));
  P.flush();
  const fx = groundFX(rig, 0xff2a3a, 1.2);
  rig.extras.claws = claws; rig.extras.bow = bow;
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    m.userData.emitMask.value = 2.4 + Math.sin(t * 3) * 0.6;
    hoodG.rotation.x = 0.08 + Math.sin(t * 2) * 0.05 + Math.min(1, b.vel.length() / 4) * 0.35;
    if (b.lightH) { b.lightH.intensity = 3.4 + Math.sin(t * 9) * 0.4; b.lightH.offsetY = 5.2; }
    // a dark red haze rising off him, and the odd idle cut flickering in the air
    for (let i = rate(6, dt, bud); i > 0; i--) Pt.smoke.emit(b.pos.x + rnd(0.8), b.pos.y + Math.random() * 3.2, b.pos.z + rnd(0.8), rnd(0.2), 0.6 + Math.random() * 0.4, rnd(0.2), 1.4, 0.16, 0.01, 0.02, 0.45, -0.3, 1.2, 2.4, 0);
    for (let i = rate(5, dt, bud); i > 0; i--) Pt.glow.emit(b.pos.x + rnd(1), b.pos.y + Math.random() * 3.6, b.pos.z + rnd(1), 0, 0.5, 0, 0.8, 2.6, 0.3, 0.3, 0.08, -0.2, 1, 0.2, 0);
    if (Math.random() < dt * 1.2) { const a = Math.random() * 6.28, at = v1.set(b.pos.x + Math.cos(a) * 2.2, b.pos.y + 1 + Math.random() * 2.5, b.pos.z + Math.sin(a) * 2.2); g.fx.slashLine(at, V(-Math.sin(a), rnd(0.3), Math.cos(a)), 1.6, 0xffe0e0, 0.06, 0.12); }
  };
  rig.fx = fx;
  return rig;
}

// the shrine: dark wood on a mound of skulls, its front a fanged mouth
function buildShrine() {
  const grp0 = new THREE.Group();
  const wood = new THREE.MeshStandardNodeMaterial({ color: 0x2a0808, roughness: 0.6 }), roof = new THREE.MeshStandardNodeMaterial({ color: 0x140404, roughness: 0.5 }), bone = new THREE.MeshStandardNodeMaterial({ color: 0xe8dcc0, roughness: 0.8 });
  const maw = new THREE.MeshStandardNodeMaterial({ color: 0x080000, emissive: 0x801008, emissiveIntensity: 1.2 }), lip = new THREE.MeshStandardNodeMaterial({ color: 0x7a0a10, roughness: 0.4 }), eye = new THREE.MeshStandardNodeMaterial({ color: 0x050000 });
  const b = (w, h, d, x, y, z, mt, parent = grp0, rz = 0, ry = 0) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt); mm.position.set(x, y, z); mm.rotation.set(0, ry, rz); mm.castShadow = true; parent.add(mm); return mm; };
  const skull = (x, y, z, s, horns) => {
    const k = new THREE.Group(); k.position.set(x, y, z); k.rotation.y = (Math.random() - 0.5) * 0.8; grp0.add(k);
    b(s, s * 0.85, s, 0, 0, 0, bone, k); b(s * 0.62, s * 0.3, s * 0.7, 0, -s * 0.5, s * 0.12, bone, k);
    b(s * 0.22, s * 0.2, 0.05, -s * 0.2, s * 0.08, s * 0.5, eye, k); b(s * 0.22, s * 0.2, 0.05, s * 0.2, s * 0.08, s * 0.5, eye, k);
    if (horns) { b(s * 1.1, s * 0.16, s * 0.16, -s * 0.85, s * 0.45, 0, bone, k, 0.5); b(s * 1.1, s * 0.16, s * 0.16, s * 0.85, s * 0.45, 0, bone, k, -0.5); }
  };
  for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * 5.5; skull(Math.cos(a) * rr * 1.2, Math.random() * 0.9 * (1 - rr / 6.5), Math.sin(a) * rr * 0.8 + 1, 0.5 + Math.random() * 0.5, Math.random() < 0.15); }
  b(9, 1, 5, 0, 1, 0, wood);
  for (const x of [-3.6, -1.6, 1.6, 3.6]) { b(0.7, 6.5, 0.7, x, 4.5, 1.6, wood); b(0.5, 0.4, 0.1, x, 4.6, 1.98, maw); b(0.62, 0.1, 0.12, x, 4.85, 1.98, lip); b(0.62, 0.1, 0.12, x, 4.35, 1.98, lip); }
  b(8, 6.2, 3, 0, 4.6, -0.4, wood);
  b(4.6, 2.8, 0.3, 0, 3.6, 1.15, maw);
  b(5.2, 0.5, 0.5, 0, 5.15, 1.2, lip); const jaw = b(5.2, 0.5, 0.5, 0, 2.05, 1.2, lip);
  for (let i = 0; i < 9; i++) { b(0.28, 0.6, 0.2, -2 + i * 0.5, 4.65, 1.3, bone); b(0.28, 0.5, 0.2, -2 + i * 0.5 + 0.25, 2.5, 1.3, bone); }
  for (const [w, y, d] of [[11, 7.9, 5.5], [9.5, 8.6, 4.6], [7.2, 9.3, 3.6], [4.5, 9.9, 2.4]]) b(w, 0.5, d, 0, y, 0, roof);
  b(11.6, 0.3, 0.6, 0, 7.7, 2.7, roof, grp0, 0.12); b(11.6, 0.3, 0.6, 0, 7.7, -2.7, roof, grp0, -0.12);
  skull(0, 10.7, 0.4, 1.2, true);
  return { grp: grp0, jaw };
}

export const sukuna = {
  name: 'Ryomen Sukuna', hudName: 'Ryomen Sukuna · King of Curses', title: 'RYOMEN SUKUNA · KING OF CURSES',
  hp: 3600, speed: 4.2, dmg: 25, color: CRIMSON, radius: 0.9, height: 3.9,
  build: buildSukuna,
  phaseNames: ['', 'SUKUNA · "KNOW YOUR PLACE, FOOL"', 'DOMAIN EXPANSION · MALEVOLENT SHRINE'],
  phaseMove: { 2: 'malevolent_shrine' },
  reset() { this.rig.extras.bow.visible = false; },
  phases: [
    ['dismantle', 'cleave', 'black_flash', 'dismantle'],
    ['dismantle', 'dismantle_web', 'cleave', 'fuga', 'black_flash'],
    ['fuga', 'dismantle_web', 'cleave', 'black_flash', 'dismantle', 'malevolent_shrine'],
  ],
  tick(dt) { this.st.shrineCd = Math.max(0, (this.st.shrineCd ?? 0) - dt); },
  moves: {
    // 解 Dismantle: thin lines flash on the ground, then the cuts pass through
    *dismantle() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('attack', { t: 0.2, style: 'swingR', windup: 0.3, strike: 0.5 });
      this.callout('Dismantle');
      const n = 3 + this.phase, lines = [];
      for (let i = 0; i < n; i++) {
        const tg = this.players()[i % this.players().length] ?? t;
        const ang = Math.atan2(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z) + (i >= this.players().length ? (i % 2 ? 1 : -1) * (0.3 + Math.random() * 0.4) : 0);
        g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 1.2, length: 20, facing: ang, dur: 0.6, color: 0xff3a4a });
        lines.push(ang);
      }
      yield 0.6;
      this.pose('attack', { t: 0.6, style: 'swingR', windup: 0.3, strike: 0.5 });
      g.audio?.energy('slash'); g.shake(0.3);
      for (const ang of lines) {
        const dir = V(Math.sin(ang), 0, Math.cos(ang));
        g.fx.slashLine(this.pos.clone().setY(this.pos.y + 1.1), dir, 20, 0xffffff, 0.5, 0.25);
        g.fx.slashLine(this.pos.clone().setY(this.pos.y + 0.6), dir, 20, CRIMSON, 0.25, 0.3);
        this.hurtLine(this.pos, dir, 20, 0.7, this.dmg * 0.9, 5, { side: true });
        for (let s = 2; s < 20; s += 2) { const q = this.pos.clone().addScaledVector(dir, s); g.combat.hitBlocks(q, dir, 0.8, Math.PI, 60, null); }
      }
      this.free();
      yield 0.5;
    },
    // a fan of Dismantles that rotates around him
    *dismantle_web() {
      const g = this.game;
      this.still(); this.pose('raise');
      this.callout('Dismantle');
      const base = Math.random() * 6.28;
      for (let w = 0; w < 3; w++) {
        const n = 6, angs = [];
        for (let i = 0; i < n; i++) { const a = base + i / n * Math.PI * 2 + w * 0.26; angs.push(a); g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 1.1, length: 16, facing: a, dur: 0.55, color: 0xff3a4a }); }
        yield 0.55;
        g.audio?.energy('slash');
        for (const a of angs) { const dir = V(Math.sin(a), 0, Math.cos(a)); g.fx.slashLine(this.pos.clone().setY(this.pos.y + 1), dir, 16, 0xffffff, 0.4, 0.22); this.hurtLine(this.pos, dir, 16, 0.65, this.dmg * 0.7, 5, { side: true }); }
        yield 0.15;
      }
      this.free();
      yield 0.5;
    },
    // 捌 Cleave: the circle hunts the target, locks, then an X-cut tuned to its toughness
    *cleave() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: false });
      this.callout('Cleave');
      const mk = g.markers.spawn({ pos: this.gy(t.pos), radius: 1.9, dur: 1.15, color: 0xff2a3a });
      for (let k = 0; k < 8; k++) { const p = this.gy(t.pos); mk.mesh.position.set(p.x, p.y + 0.05, p.z); yield 0.09; }
      const at = mk.mesh.position.clone();
      yield 0.43;
      g.fx.slashX(at.clone().setY(at.y + 1.2), 3.4, 0xffffff); g.fx.slashX(at.clone().setY(at.y + 1.2), 2.6, CRIMSON);
      g.audio?.energy('slash'); g.audio?.impact(1.4, 'crit'); g.shake(0.4);
      this.hurt(at, 1.9, 0, 0, { onHit: (p) => p.takeDamage(this.dmg * 0.6 + p.maxHp * 0.22, this, { knock: V(0, 3, 0) }) });
      this.free();
      yield 0.4;
    },
    // a blink to the target and a punch wrapped in black sparks
    *black_flash() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still();
      const land = this.gy(this.clampArena(t.pos.clone().addScaledVector(V(Math.sin(this.facing), 0, Math.cos(this.facing)), -1.6)));
      this.mark(t.pos, { radius: 2.2, dur: 0.7, color: 0xff2a3a });
      this.callout('Black Flash');
      g.fx.blinkPuff(this.pos, CRIMSON);
      yield 0.45;
      this.pos.copy(land); this.vel.set(0, 0, 0);
      g.fx.blinkPuff(this.pos, CRIMSON); g.audio?.energy('teleport');
      this.aim(t);
      this.pose('attack', { t: 0.3, style: 'punch', windup: 0.3, strike: 0.5 });
      yield 0.25;
      this.pose('attack', { t: 0.6, style: 'punch', windup: 0.3, strike: 0.5 });
      const hitAt = this.pos.clone().addScaledVector(this.fwd(), 1.6);
      g.fx.blackLightning(hitAt.clone().setY(hitAt.y + 1.2)); g.fx.blackFlash(0.15); g.audio?.blackFlash(); g.shake(0.6);
      this.hurt(hitAt, 2.2, this.dmg * 1.5, 16, { up: 5 });
      this.free();
      yield 0.6;
    },
    // 「■」開 Fuga: a bow of flame forms; the arrow explodes into a firestorm
    *fuga() {
      const g = this.game, t = this.aim(); if (!t) return;
      this.still(); this.pose('cast', { t: 1, both: true });
      this.callout('FUGA · "OPEN"', true);
      this.rig.extras.bow.visible = true;
      const R = 5.5;
      const end = this.gy(t.pos);
      const L = Math.min(22, end.distanceTo(this.pos) + 1);
      g.markers.spawn({ pos: this.gy(this.pos), shape: 'rect', width: 2.2, length: L, facing: this.facing, dur: 1.4, color: 0xff6a1a });
      this.mark(end, { radius: R, dur: 1.4, color: 0xff3a0a });
      g.audio?.charge(1.3, 0.8);
      for (let k = 0; k < 14; k++) { const h = this.rig.handL.getWorldPosition(V()); g.particles.burst(h, { count: 4, color: FIRE, speed: 2, life: 0.4, size: 0.3 }); yield 0.1; }
      this.rig.extras.bow.visible = false;
      g.audio?.energy('fire');
      const dir = this.fwd(), from = this.pos.clone().setY(this.pos.y + 2.2);
      const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2.6), glowMat(0xffc070, 4)); this.addProp(arrow);
      for (let s = 0; s < L; s += 2.2) { arrow.position.copy(from).addScaledVector(dir, s); arrow.lookAt(arrow.position.clone().add(dir)); g.particles.burst(arrow.position, { count: 6, color: FIRE, speed: 3, life: 0.5, size: 0.5, sizeEnd: 1.5 }); yield 0.02; }
      this.removeProp(arrow);
      g.fx.explosion(end, FIRE, R); g.fx.screenWave(end, 1.4, 0.6); g.fx.flash(0xff8a3a, 0.45, 0.3); g.shake(1);
      this.hurt(end, R, this.dmg * 2, 16, { up: 7 });
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.hazards.fire(end.clone().add(V(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6)), this.dmg * 0.35, 1.5); }
      g.combat.hitBlocks(end, V(0, 0, 1), 4, Math.PI, 150, null);
      this.free();
      yield 1.0;
    },
    // 領域展開「伏魔御廚子」 Malevolent Shrine
    *malevolent_shrine() {
      const g = this.game;
      if (this.st.shrineCd > 0 || g.domain) { yield* this.B.moves.dismantle_web.call(this); return; }
      this.still(); this.pose('sign');
      const self = this;
      let shrine = null;
      const ok = this.domain({ name: 'Malevolent Shrine', key: 'malevolent_shrine', type: 2, color: 0xff3a2a, sound: 'shrine', flash: 0xff2020, duration: 8, radius: 26,
        onStart: (gg, d) => {
          gg.domainSys.dome.visible = false;   // no barrier: the real sky stays
          shrine = buildShrine();
          const back = self.fwd().multiplyScalar(-4.5);
          shrine.grp.position.copy(self.gy(self.pos.clone().add(back))); shrine.grp.rotation.y = self.facing;
          self.addProp(shrine.grp);
          gg.toast?.('An open domain — no barrier. Keep moving!');
        },
        onTick: (gg, d, dt) => {
          d.tick = (d.tick ?? 0.5) - dt;
          if (shrine) shrine.jaw.position.y = 2.05 - Math.abs(Math.sin(gg.time * 4)) * 0.4;
          if (d.tick > 0) return;
          d.tick = 0.5;
          for (const p of self.players()) if (gg.domainSys.inside(p.pos)) {   // the constant cut
            p.takeDamage(self.dmg * 0.06, self, { dot: true, noKnock: true });
            const at = p.pos.clone().setY(p.pos.y + 1); const a = Math.random() * 6.28;
            gg.fx.slashLine(at.clone().add(V(Math.cos(a), 0.3, Math.sin(a))), V(-Math.cos(a), -0.3, -Math.sin(a)), 2, 0xffffff, 0.08, 0.12);
          }
          for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28, r = Math.random() * d.radius; const at = d.center.clone().add(V(Math.cos(a) * r, 0.4, Math.sin(a) * r)); gg.fx.slashLine(at, V(Math.cos(a + 1.5), 0, Math.sin(a + 1.5)), 3, 0xff4a4a, 0.08, 0.15); gg.combat.hitBlocks(at, V(0, 0, 1), 1.2, Math.PI, 40, null); }
          if (Math.random() < 0.5) gg.audio?.energy('slash');
        },
        onEnd: () => { if (shrine) { self.removeProp(shrine.grp); shrine = null; } } });
      if (!ok) { this.free(); return; }
      this.st.shrineCd = 40;
      yield 1.6;
      // Cleave rains on the sorcerers' feet and across the arena: circles flash, then cut
      while (g.domain?.caster === this) {
        const spots = this.players().map((p) => this.gy(p.pos));
        for (let i = 0; i < 4; i++) spots.push(this.around(this.arena.c, 1, this.arena.R));
        for (const s of spots) this.mark(s, { radius: 1.7, dur: 0.6, color: 0xff2a3a });
        yield 0.6;
        for (const s of spots) { g.fx.slashX(s.clone().setY(s.y + 1.1), 2.8, 0xffffff); this.hurt(s, 1.7, this.dmg * 0.7, 4); }
        g.audio?.energy('slash'); g.shake(0.25);
        yield 0.35;
      }
      this.free();
      yield 0.4;
    },
  },
};
