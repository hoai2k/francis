// Toji-style kit — Heavenly Restriction.
// Toji has zero cursed energy: no passive flow, every tool costs nothing.
// The CE bar becomes his "Hunter's Instinct" meter, filled only by hits and kills.
//   LMB  five-hit cursed-tool combo, monstrous physical damage.
//   RMB  Inverted Spear of Heaven: dash-stab through a line of curses,
//        nullifying shields and techniques.
//   1    Chain of a Thousand Miles: the spear whirls on its endless chain,
//        sweeping a huge circle and dragging curses in.
//   2    Playful Cloud: a six-blow three-section-staff flurry ending in a
//        crushing smash.
//   3    Split Soul Katana: blink to a curse and cut its soul — ignores armor,
//        scales with the target's toughness.
//   F    Sorcerer Killer (ultimate — Toji has no domain): the full Hunter's
//        Instinct meter (filled only by hits and kills) unleashes the hunt that
//        killed Gojo once. Slow-mo, Toji blinks through the curses around his
//        prey cutting their souls, then runs the strongest one through with the
//        Inverted Spear of Heaven: its technique is nullified, a normal curse
//        dies outright and a boss takes a massive wound. A short rampage follows.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { B } from '../world/blocks.js';

const GREEN = 0xb8f070, SILVER = 0xe8f0f4, BLOOD = 0xff3a3a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('toji', {
  name: 'Toji', technique: 'Heavenly Restriction', rarity: 'legendary', title: 'Sorcerer Killer',
  desc: 'Zero cursed energy, monstrous body: cursed tools (Inverted Spear, Chain, Playful Cloud, Split Soul Katana) cost nothing, and hits fuel a Hunter\'s Instinct rampage.',
  ultimate: 'Sorcerer Killer', color: '#b8f070',
});

registerLook('toji', {
  paint: { skinTone: 0xe6bc9c, hair: 0x0e0e10, hairVolume: true, top: 0x141418, collar: 0x141418, topTrim: 0x101014, buttons: 0x141418, sleeve: 0xe6bc9c, pants: 0xdcdad2, shoes: 0x1a1a1a, eye: 0x2a3a2a, fringe: 2, hairSide: 3, hairBack: 4 },
  paintExtra(S) {
    // the scar across the right corner of his mouth
    S.px(10, 13, 0xc88a86); S.px(10, 14, 0xc88a86); S.px(10, 15, 0xc88a86);
    // muscle shading on the tight shirt
    S.rect(21, 23, 2, 3, 0x0a0a0c, 0.05); S.rect(25, 23, 2, 3, 0x0a0a0c, 0.05);
  },
  hair: (m) => [
    { x: -2, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.4, rz: 0.3, material: m },
    { x: 1.5, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.5, rz: -0.3, material: m },
    { x: 0, y: 8, z: -1.5, w: 5, h: 2.5, d: 4, rx: -0.4, material: m },
    { x: 0, y: 7, z: 3.2, w: 4, h: 2, d: 1.5, rx: 1.1, material: m },
  ],
  hairColor: 0x0e0e10, accent: GREEN, emit: 0, cape: null,
  props(rig, K) {
    // the worm curse that stores his arsenal, coiled around his torso
    const worm = K.mat(0x6a5a78, { roughness: 0.8 }), band = K.mat(0x3a2e44, { roughness: 0.8 }), eye = K.mat(0xffe04a, { emissive: 2 });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      K.box(rig.torso, 2.6, 2.6, 2.6, i % 2 ? band : worm, Math.sin(a) * 5, 4 + i * 0.55, Math.cos(a) * 3.2, 0, a, 0.3);
    }
    const head = K.box(rig.torso, 3.6, 3.2, 3.6, worm, 3.6, 11.5, -1.5, 0, 0.6, -0.3);
    K.box(head, 0.8, 0.8, 0.4, eye, -0.8, 0.5, 1.9); K.box(head, 0.8, 0.8, 0.4, eye, 0.8, 0.5, 1.9);
    // cursed tools, one visible at a time in the right hand
    const tool = (build) => { const g = new THREE.Group(); build(g); g.rotation.x = Math.PI / 2; g.position.z = 3 * K.PX; g.visible = false; rig.handR.add(g); return g; };
    const steel = K.mat(0xd8e0e8, { metalness: 0.9, roughness: 0.25 }), grip = K.mat(0x2a1a14, { roughness: 0.9 });
    const spear = tool((g) => {
      K.box(g, 1.2, 4, 1.2, grip, 0, 0, 0);
      K.box(g, 3.2, 0.8, 1, steel, 0, -2.2, 0);
      K.box(g, 1, 7, 0.4, steel, 0, -6, 0);
      K.box(g, 0.8, 2.2, 0.4, steel, 0.9, -4.2, 0, 0, 0, 0.5);   // the jitte hook
      K.box(g, 0.4, 0.4, 8, K.mat(0x8a8a90, { metalness: 0.8 }), 0, 1.5, -3);   // chain trailing off
    });
    const cloud = tool((g) => {
      const red = K.mat(0x9a2a24, { roughness: 0.5, metalness: 0.3 }), gold = K.mat(0xd8a830, { metalness: 0.8, roughness: 0.3 });
      for (let s = 0; s < 3; s++) { K.box(g, 1.3, 8, 1.3, red, s * 1.5 - 1.5, -3, 0, 0, 0, (s - 1) * 0.35); K.box(g, 1.6, 1, 1.6, gold, s * 1.5 - 1.5, -7, 0, 0, 0, (s - 1) * 0.35); }
    });
    const katana = tool((g) => {
      K.box(g, 1.1, 4, 1.1, grip, 0, 0, 0);
      K.box(g, 2.4, 0.6, 2.4, K.mat(0x1a1a1a), 0, -2.1, 0);
      K.box(g, 0.9, 13, 0.3, K.mat(0xf0f4f8, { metalness: 0.9, roughness: 0.15, emissive: 0.3, emissiveColor: GREEN }), 0, -8.8, 0);
    });
    spear.visible = true;
    rig.extras.tools = { spear, cloud, katana };
    rig.extras.weapon = spear;
  },
});

export const TOJI_SKILLS = [
  { id: 'spear', name: 'Inverted Spear', desc: 'The spear dash reaches further and stabs harder.', max: 3 },
  { id: 'chain', name: 'Thousand Miles', desc: 'Wider chain sweep and a stronger pull.', max: 2 },
  { id: 'cloud', name: 'Playful Cloud', desc: 'Every staff blow hits harder.', max: 3 },
  { id: 'katana', name: 'Split Soul', desc: 'The katana cuts deeper into tough curses.', max: 3, req: 'spear' },
  { id: 'physique', name: 'Heavenly Body', desc: '+20 max HP and +5% speed per rank.', max: 3 },
  { id: 'instinct', name: 'Hunter\'s Instinct', desc: 'Kills fill the meter faster; Sorcerer Killer cuts down more curses and its rampage lasts longer.', max: 2 },
];

class TojiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    // Heavenly Restriction: no cursed energy flows at all
    p.ceRegen = 0;
    p.stats.speed += 0.3 + r('physique') * 0.05;
    p.stats.meleeMult += 0.45;
    p.stats.crit += 0.06;
    p.stats.armor += 0.1;
    const hpBonus = 60 + r('physique') * 20;
    p.maxHp += hpBonus; p.hp = Math.min(p.hp + hpBonus, p.maxHp);
    this.combo = [
      { style: 'swingR', dur: 0.26, windup: 0.26, strike: 0.48, dmg: 15, range: 2.9, arc: 1.2, lunge: 9, knock: 4, stop: 0.05, shake: 0.16, trail: SILVER, sparkColor: 0xe8fff0, chainAt: 0.55 },
      { style: 'swingL', dur: 0.26, windup: 0.26, strike: 0.48, dmg: 15, range: 2.9, arc: 1.2, lunge: 9, knock: 4, stop: 0.05, shake: 0.16, trail: SILVER, sparkColor: 0xe8fff0, chainAt: 0.55 },
      { style: 'punch', dur: 0.24, windup: 0.25, strike: 0.45, dmg: 14, range: 2.6, arc: 1.0, lunge: 11, knock: 6, stop: 0.05, shake: 0.18, trail: GREEN, chainAt: 0.55 },
      { style: 'uppercut', dur: 0.34, windup: 0.3, strike: 0.5, dmg: 19, range: 2.7, arc: 1.0, lunge: 6, knock: 5, stop: 0.07, shake: 0.24, trail: GREEN, launch: true, chainAt: 0.6 },
      { style: 'slam', dur: 0.5, windup: 0.4, strike: 0.6, dmg: 34, range: 3.5, arc: Math.PI, lunge: 5, knock: 13, stop: 0.1, shake: 0.5, ring: true, ringColor: GREEN, stagger: 0.7, trail: SILVER },
    ];
    this.slots = {
      ranged: this.ability({ name: 'Inverted Spear', icon: '🗡️', cd: 1.4, ce: 0, use: () => this.spear() }),
      t1: this.ability({ name: 'Thousand Miles', icon: '⛓️', cd: 5, ce: 0, use: () => this.chain() }),
      t2: this.ability({ name: 'Playful Cloud', icon: '🥢', cd: 8, ce: 0, use: () => this.cloud() }),
      t3: this.ability({ name: 'Split Soul', icon: '⚔️', cd: 12, ce: 0, use: () => this.katana() }),
    };
    // no domain: the meter is spent on one perfect kill
    this.ultimate = { name: 'Sorcerer Killer', icon: '🐆', use: () => this.sorcererKiller() };
    this.rampageT = 0;
    this.readyPinged = false;
  }
  get rampage() { return this.rampageT > 0; }
  get speedMul() { return this.rampage ? 1.45 : 1; }
  dispose() {
    super.dispose(); this.disposed = true;
    clearTimeout(this.toolTimer);
    for (const id of this.ultTimers ?? []) clearTimeout(id);
    this.ultTimers = [];
    if (this.ultActive) { this.game.fx.dimTarget = 0; this.ultActive = false; }
  }
  // ------------------------------------------------------------- helpers
  showTool(name, dur = 1.1) {
    const tools = this.p.rig.extras.tools; if (!tools) return;
    for (const k in tools) tools[k].visible = k === name;
    clearTimeout(this.toolTimer);
    if (name !== 'spear') this.toolTimer = setTimeout(() => { if (!this.disposed) for (const k in tools) tools[k].visible = k === 'spear'; }, dur * 1000);
  }
  safeSpot(x, z, y) {
    const w = this.game.world;
    const gy = w.groundBelow(x, z, y + 2);
    if (!isFinite(gy) || Math.abs(gy - y) > 3 || w.solidAt(x, gy + 0.5, z) || w.solidAt(x, gy + 1.5, z)) return null;
    return new THREE.Vector3(x, gy, z);
  }
  blinkTo(to) {
    const p = this.p, g = this.game;
    for (let i = 0; i < 6; i++) { const k = i / 6; g.particles.burst(tmp.lerpVectors(p.pos, to, k).setY(p.pos.y + 1), { count: 3, color: GREEN, speed: 0.6, life: 0.3, size: 0.35, sizeEnd: 0.05, intensity: 1.2 }); }
    p.pos.copy(to); p.visY = to.y; p.vel.set(0, 0, 0);
  }
  hit(e, dmg, o = {}) {
    const dealt = this.game.combat.damageEnemy(e, dmg, this.p, o);
    if (dealt > 0 && e.dead) this.onKill(e);
    return dealt;
  }
  onKill(e) {
    if (e.isDummy) return;
    this.p.gainCE(6 + this.rank('instinct') * 4 + (e.isBoss ? 30 : 0));
  }
  onMeleeHit(e, step) {
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
    if (e.dead) this.onKill(e);
  }
  tick(dt) {
    const p = this.p, g = this.game;
    if (!this.domainLocked && !this.readyPinged && p.ce >= p.maxCe) { this.readyPinged = true; g.toast?.('🐆 Hunter\'s Instinct is full — Sorcerer Killer is ready (F)'); }
    if (p.ce < p.maxCe) this.readyPinged = false;
    this.rampageT = Math.max(0, this.rampageT - dt);
    if (this.rampage && Math.random() < 0.5) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 1.2, 0, 0.4, 1.4, 2.2, 0.8, 0.12, 0, 1, 0.2, 1);
  }
  // ---------------------------------------------------------- techniques
  spear() {
    const g = this.game, p = this.p, rk = this.rank('spear');
    const dir = p.aimDir.clone().setY(0).normalize();
    const L = 6 + rk * 1.3;
    let dist = 0, to = p.pos.clone();
    for (let s = 0.5; s <= L; s += 0.5) { const q = this.safeSpot(p.pos.x + dir.x * s, p.pos.z + dir.z * s, p.pos.y); if (!q || Math.abs(q.y - p.pos.y) > 1.1) break; dist = s; to = q; }
    this.showTool('spear');
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.3, windup: 0.15 }, style: 'punch', dur: 0.3, elapsed: 0, t: 0, windup: 0.15, strike: 0.3, struck: true, moveScale: 0 };
    p.iframes = Math.max(p.iframes, 0.3);
    const from = p.pos.clone().setY(p.pos.y + 1.1);
    const reach = dist + 1.6;
    if (dist > 0.4) this.blinkTo(to);
    g.fx.slashLine(from, dir, reach, 0xffffff, 0.45, 0.2);
    g.fx.slashLine(from.clone().setY(from.y - 0.08), dir, reach, GREEN, 0.25, 0.32);
    const dmg = 24 + rk * 8;
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from).setY(0); const along = tmp.dot(dir);
      if (along < -0.5 || along > reach) continue;
      if (Math.abs(tmp.x * dir.z - tmp.z * dir.x) > 1 + e.radius) continue;
      // the spear nullifies techniques: shields and guards don't matter
      this.hit(e, dmg, { melee: true, unblockable: true, knock: dir.clone().multiplyScalar(5), stagger: 0.5, color: '#e8fff0' });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), dir, { color: SILVER, big: true });
      n++;
    }
    g.combat.hitBlocks(to, dir, 1.5, 0.8, 30, p);
    if (n) { g.hitStop(0.06); g.shake(0.22); g.audio?.impact(1.3, 'crit'); }
    g.audio?.energy('slash'); g.audio?.whoosh(1.1);
  }
  chain() {
    const g = this.game, p = this.p, rk = this.rank('chain');
    const R = 6.5 + rk * 1.5;
    this.showTool('spear', 0.8);
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.45, windup: 0.2 }, style: 'spin', dur: 0.55, elapsed: 0, t: 0, windup: 0.2, strike: 0.45, struck: true, moveScale: 0.3 };
    g.audio?.whoosh(1.4);
    // the chain whirls a full circle, its spear tip drawing a ring of links
    let t = 0; const a0 = p.facing;
    g.addUpdater((dt) => {
      t += dt;
      const a = a0 + t / 0.4 * Math.PI * 2;
      const hand = tmp.set(p.pos.x, p.pos.y + 1.2, p.pos.z);
      for (let i = 1; i <= 10; i++) {
        const k = i / 10 * R;
        g.particles.glow.emit(hand.x + Math.sin(a) * k, hand.y - i * 0.04, hand.z + Math.cos(a) * k, 0, 0, 0, 0.12, 1.6, 1.7, 1.8, 0.09, 0, 0, 1, 1);
      }
      g.particles.burst(tmp2.set(hand.x + Math.sin(a) * R, hand.y - 0.4, hand.z + Math.cos(a) * R), { count: 2, color: GREEN, speed: 1, life: 0.25, size: 0.2, shape: 1 });
      return t < 0.4;
    });
    setTimeout(() => {
      const hits = g.combat.query(p.pos, tmp.set(0, 0, 1), R, Math.PI);
      for (const e of hits) {
        const toward = tmp.subVectors(p.pos, e.pos).setY(0); const d = toward.length(); toward.normalize();
        this.hit(e, 20 + rk * 8, { melee: true, knock: toward.multiplyScalar(Math.min(14, d * 2) + rk * 2), stagger: 0.7 });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: SILVER });
      }
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1, p.pos.z), { color: SILVER, r0: R * 0.9, r1: R, dur: 0.35, thick: 0.06 });
      g.fx.slashArc(p.pos, p.facing, GREEN, R, 1, 0.3);
      g.combat.hitBlocks(p.pos, tmp.set(0, 0, 1), R, Math.PI, 18, p);
      if (hits.length) { g.hitStop(0.07); g.shake(0.3); g.audio?.impact(1.4); }
    }, 200);
  }
  cloud() {
    const g = this.game, p = this.p, rk = this.rank('cloud');
    this.showTool('cloud', 1.3);
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const styles = ['swingR', 'swingL', 'swingR', 'swingL', 'spin', 'slam'];
    styles.forEach((style, i) => setTimeout(() => {
      if (p.dead || this.disposed) return;
      const last = i === styles.length - 1;
      p.action = { type: 'attack', step: { style, strike: 0.4, windup: 0.2 }, style, dur: last ? 0.4 : 0.16, elapsed: 0, t: 0, windup: 0.2, strike: 0.4, struck: true, moveScale: 0.3 };
      const fwd = tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const R = last ? 4.4 : 3.6;
      const hits = g.combat.query(p.pos, fwd, R, last ? Math.PI : 1.1);
      for (const e of hits) {
        const kd = tmp.subVectors(e.pos, p.pos).setY(0).normalize();
        this.hit(e, last ? 34 + rk * 12 : 9 + rk * 3, { melee: true, knock: kd.multiplyScalar(last ? 16 : 2), stagger: last ? 1 : 0.3 });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), kd, { color: last ? BLOOD : 0xffd8a0, big: last });
      }
      g.fx.slashArc(p.pos, p.facing, last ? BLOOD : 0xd8a830, R, last ? 1 : 0.4, 0.16, i % 2 === 1);
      g.audio?.swing(i);
      if (last) {
        const c = p.pos.clone().addScaledVector(fwd, 1.5);
        g.fx.shockwave(c, BLOOD, R + 1); g.debris.burst(c.clone().setY(c.y + 0.3), B.concrete, 8);
        g.combat.hitBlocks(c, fwd, R, Math.PI, 60, p);
        g.shake(0.5); g.hitStop(0.09); g.audio?.impact(1.9); g.fx.screenWave(c, 0.6, 0.35);
      } else if (hits.length) { g.hitStop(0.025); g.shake(0.1); g.audio?.impact(0.8); }
    }, i * 80));
  }
  katana() {
    const g = this.game, p = this.p, rk = this.rank('katana');
    let t = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    if (!t) { let bd = 10; for (const e of g.enemies) { if (e.dead || e.untargetable) continue; tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length(); if (d < bd && (d < 3 || tmp.normalize().dot(p.aimDir) > 0.4)) { bd = d; t = e; } } }
    if (!t) { g.audio?.ui('back'); return false; }
    this.showTool('katana', 1);
    // blink past the target and cut through its soul
    const dir = tmp.subVectors(t.pos, p.pos).setY(0).normalize();
    const behind = this.safeSpot(t.pos.x + dir.x * (t.radius + 1.1), t.pos.z + dir.z * (t.radius + 1.1), t.pos.y);
    if (behind) this.blinkTo(behind);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    p.action = { type: 'attack', step: { style: 'swingL', strike: 0.35, windup: 0.15 }, style: 'swingL', dur: 0.4, elapsed: 0, t: 0, windup: 0.15, strike: 0.35, struck: true, moveScale: 0 };
    p.iframes = Math.max(p.iframes, 0.4);
    const at = t.pos.clone().setY(t.pos.y + t.height * 0.55);
    g.fx.slashX(at, 2.6 + t.height * 0.4, 0xffffff);
    setTimeout(() => {
      if (t.dead) return;
      const soul = Math.min(t.maxHp * (0.14 + rk * 0.04), 240);
      // the blade strikes the soul itself: armor is irrelevant
      const dmg = (44 + rk * 14 + soul) / Math.max(0.2, 1 - (t.armor ?? 0));
      this.hit(t, dmg, { melee: true, unblockable: true, stagger: 1, knock: new THREE.Vector3(), color: '#b8f070' });
      g.fx.slashX(at, 3.2 + t.height * 0.5, GREEN);
      g.fx.slashLine(at.clone().add(tmp2.set(-1.8, 0.2, 0)), tmp.set(1, -0.1, 0), 3.6, 0xffffff, 0.3, 0.25);
      g.fx.hitSpark(at, null, { color: GREEN, big: true, crit: true });
      g.particles.burst(at, { count: 30, color: 0xd8ffd0, speed: 4, up: 1.5, life: 0.8, size: 0.25, sizeEnd: 0.05, intensity: 2 });
      g.lights.flash(at, GREEN, 10, 10, 0.3);
      g.fx.flash(0x102008, 0.3, 0.15); g.fx.chroma(0.9); g.slowMo(0.25, 0.25);
      g.hitStop(0.1); g.shake(0.4);
      g.audio?.energy('slash'); g.audio?.impact(1.8, 'crit');
    }, 140);
  }
  // ---------------------------------------------------------- ultimate
  // Sorcerer Killer: the prey is the toughest curse in reach. Its escorts are
  // cut down first, then the Inverted Spear of Heaven runs it through.
  sorcererKiller() {
    const g = this.game, p = this.p, rk = this.rank('instinct');
    if (this.ultActive) return false;
    let prey = null, best = -1;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      const d = e.pos.distanceTo(p.pos); if (d > 22) continue;
      const score = (e.isBoss ? 1e6 : 0) + e.maxHp - d;
      if (score > best) { best = score; prey = e; }
    }
    if (!prey) { g.toast?.('🐆 No prey in sight — the meter waits.'); g.audio?.ui('back'); return false; }
    this.ultActive = true; this.ultTimers = [];
    const later = (ms, fn) => this.ultTimers.push(setTimeout(() => { if (!this.disposed && !p.dead) fn(); }, ms));
    const escorts = g.enemies.filter((e) => e !== prey && !e.dead && !e.untargetable && !e.isBoss && e.pos.distanceTo(prey.pos) < 11)
      .sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, 4 + rk * 2);
    const total = 650 + escorts.length * 170 + 900;
    p.iframes = Math.max(p.iframes, total / 1000 + 0.4);
    g.slowMo(total / 1000, 0.3);
    g.fx.dimTarget = 0.45; g.fx.flash(0x0a1408, 0.5, 0.3); g.fx.chroma(0.8);
    g.toast?.('SORCERER KILLER', 'domain');
    g.rig.cinematic?.({ center: prey.pos.clone().setY(prey.pos.y + 0.6), dur: total / 1000 + 0.6, dist: 11, pitch: 0.45, orbit: 0.35 });
    g.audio?.charge(0.6, 0.7);
    // the hunter's stare: green motes rush in toward Toji
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
      g.particles.glow.emit(p.pos.x + Math.cos(a) * r, p.pos.y + 0.3 + Math.random() * 2, p.pos.z + Math.sin(a) * r, -Math.cos(a) * r * 2, 0, -Math.sin(a) * r * 2, 0.5, 1.4, 2.4, 0.8, 0.14, 0, 1, 0.2, 1);
    }
    // 1) cut down the escorts, one blink each — a soul cut, no armor
    escorts.forEach((e, i) => later(650 + i * 170, () => {
      if (e.dead) return;
      this.assassinate(e, 70 + rk * 20 + Math.min(e.maxHp * 0.35, 200));
      g.fx.slashX(e.pos.clone().setY(e.pos.y + e.height * 0.55), 2.4, GREEN);
    }));
    // 2) the kill: blink in front of the prey and run it through
    const strike = 650 + escorts.length * 170 + 150;
    later(strike, () => {
      if (prey.dead) return;
      const dir = tmp.subVectors(prey.pos, p.pos).setY(0); if (dir.lengthSq() < 0.01) dir.set(Math.sin(p.facing), 0, Math.cos(p.facing)); dir.normalize();
      const front = this.safeSpot(prey.pos.x - dir.x * (prey.radius + 1.3), prey.pos.z - dir.z * (prey.radius + 1.3), prey.pos.y);
      if (front) this.blinkTo(front);
      p.facing = Math.atan2(prey.pos.x - p.pos.x, prey.pos.z - p.pos.z);
      this.showTool('spear', 1.2);
      p.action = { type: 'attack', step: { style: 'punch', strike: 0.35, windup: 0.3 }, style: 'punch', dur: 0.5, elapsed: 0, t: 0, windup: 0.3, strike: 0.35, struck: true, moveScale: 0 };
      // the Inverted Spear of Heaven forcibly nullifies its technique
      prey.cancelAttack?.(); prey.cd = Math.max(prey.cd ?? 0, 5); prey.sealT = Math.max(prey.sealT ?? 0, prey.isBoss ? 1.2 : 2);
      g.fx.rings.spawn(tmp2.set(prey.pos.x, prey.pos.y + prey.height * 0.55, prey.pos.z), { color: SILVER, r0: prey.radius + 2.5, r1: 0.2, dur: 0.3, thick: 0.12 });
      g.audio?.energy('infinity');
    });
    later(strike + 260, () => {
      if (prey.dead) return;
      const at = prey.pos.clone().setY(prey.pos.y + prey.height * 0.55);
      const dir = tmp.subVectors(prey.pos, p.pos).setY(0).normalize();
      const from = p.pos.clone().setY(p.pos.y + 1.1);
      // a normal curse dies outright; a boss takes a wound it cannot shrug off
      const dmg = prey.isBoss ? 160 + Math.min(prey.maxHp * (0.28 + rk * 0.04), 900) : (prey.hp + 1) / Math.max(0.2, 1 - (prey.armor ?? 0));
      this.hit(prey, dmg, { melee: true, unblockable: true, crit: true, critMult: 1, stagger: 1.2, knock: dir.clone().multiplyScalar(prey.isBoss ? 2 : 16), color: '#e8fff0', ceGain: 0 });
      g.fx.slashLine(from, dir, 9, 0xffffff, 0.7, 0.35);
      g.fx.slashLine(from.clone().setY(from.y - 0.1), dir, 12, GREEN, 0.35, 0.5);
      g.fx.hitSpark(at, dir, { color: SILVER, big: true, crit: true });
      g.particles.burst(at, { count: 50, color: BLOOD, additive: false, speed: 7, dir: dir.clone().multiplyScalar(6), up: 0.6, life: 0.7, size: 0.18, gravity: 14, shape: 1 });
      g.particles.burst(at, { count: 40, color: 0xe8fff0, speed: 9, life: 0.5, size: 0.14, shape: 1, intensity: 3 });
      g.fx.shockwave(prey.pos, SILVER, 6); g.fx.screenWave(at, 1.4, 0.6);
      g.lights.flash(at, 0xe8fff0, 22, 18, 0.5, { priority: 8 });
      g.fx.flash(0xffffff, 0.55, 0.12); g.fx.blackFlash(0.2); g.fx.chroma(1.4);
      g.hitStop(0.16); g.shake(0.9);
      g.audio?.impact(2.2, 'crit'); g.audio?.energy('slash');
    });
    // 3) the follow-through: a katana cross through whatever is left
    this.ultTimers.push(setTimeout(() => { if (!this.disposed) { this.ultActive = false; g.fx.dimTarget = 0; } }, strike + 560));
    later(strike + 560, () => {
      this.rampageT = 4 + rk * 1.5;
      if (prey.dead) { g.toast?.('🐆 Target eliminated.'); return; }
      this.showTool('katana', 0.6);
      const at = prey.pos.clone().setY(prey.pos.y + prey.height * 0.55);
      this.hit(prey, 50 + rk * 20, { melee: true, unblockable: true, stagger: 0.8, knock: new THREE.Vector3(), color: '#b8f070' });
      g.fx.slashX(at, 3.6 + prey.height * 0.5, GREEN);
      g.shake(0.4); g.audio?.energy('slash');
    });
    return true;
  }
  // rampage: blink to a curse and cut it down

  assassinate(e, dmg) {
    const g = this.game, p = this.p;
    const a = Math.random() * Math.PI * 2;
    const spot = this.safeSpot(e.pos.x + Math.sin(a) * (e.radius + 1), e.pos.z + Math.cos(a) * (e.radius + 1), e.pos.y);
    if (!spot) return;
    this.blinkTo(spot);
    p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    const style = Math.random() < 0.5 ? 'swingR' : 'swingL';
    p.action = { type: 'attack', step: { style, strike: 0.4, windup: 0.15 }, style, dur: 0.22, elapsed: 0, t: 0, windup: 0.15, strike: 0.4, struck: true, moveScale: 0.5 };
    this.showTool(Math.random() < 0.5 ? 'katana' : 'spear', 0.4);
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
    this.hit(e, dmg, { melee: true, unblockable: true, stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(4) });
    g.fx.slashLine(at.clone().addScaledVector(tmp2.set(Math.cos(a), 0.4, Math.sin(a)), -1.5), tmp2.set(Math.cos(a), -0.4, Math.sin(a)), 3, 0xffffff, 0.3, 0.18);
    g.fx.hitSpark(at, null, { color: GREEN, big: true });
    g.hitStop(0.03); g.shake(0.15);
    g.audio?.energy('slash');
  }
}
registerKit('toji', TojiKit, TOJI_SKILLS);
