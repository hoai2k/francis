// Kirara Hoshi-style kit — Love Rendezvous. Kirara marks things with the
// stars of the Southern Cross (Acrux, Mimosa, Gacrux, Imai, Ginan); marked
// things are drawn to the next star in the constellation's order and can't
// approach out of order. 20 abilities on the technique tree; four are
// equipped (RMB takes a basic one) plus F.
//   LMB        stylish kicks; the last one stamps a star on the curse.
//   Stars      Star Mark (start, RMB), Twin Stars, Mimosa Snare, Stardust,
//              Shooting Star
//   Rendezvous Rendezvous, Repulsion, Star Trail, Star Swap, Satellite, Order
//              Reversal, Acrux Anchor
//   Crux       Constellation Lines, Star Burst, Crux Crush
//   Idol       Spotlight, Love Barrier, Encore, Fan Dance, Starlight Kick
//   F          Ultimate: Love Rendezvous: Southern Cross (no canon domain) — every
//              curse nearby is stamped with the five stars and dragged together
//              in the constellation's order into one crushing point.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { GEO, glow, mat, temp, mesh, beam, pillar, meshShot, pull, sigil, aimAt } from './fxlib.js';

const PINK = 0xff7ac8, STAR = 0xfff07a, CRUX = [0xfff07a, 0x9ad8ff, 0xff8a6a, 0xd8a8ff, 0xffffff], NAMES = ['Acrux', 'Mimosa', 'Gacrux', 'Imai', 'Ginan'];
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('kirara', { name: 'Kirara', technique: 'Love Rendezvous', rarity: 'uncommon', title: 'Southern Cross', desc: 'Stamp curses with the stars of the Southern Cross: marked curses crash into each other in the constellation\'s order, and none of them can reach you.', ultimate: 'Love Rendezvous: Southern Cross', color: '#ff7ac8' });

registerLook('kirara', {
  paint: { skinTone: 0xf6dcc8, hair: 0xf080b8, hairVolume: true, top: 0x1b2030, collar: 0x1b2030, topTrim: 0xf080b8, buttons: 0xfff07a, sleeve: 0x1b2030, pants: 0x1b2030, skirt: 0x1b2030, tights: 0x14141a, shoes: 0x14141a, eye: 0x8a3a6a, fringe: 3, hairSide: 6, hairBack: 7, blush: true },
  paintExtra(S) {
    // pink eyeshadow, glossy lips and a star stud
    S.mat = 'skin'; S.fine(9, 11.5, 0xe86aa8, 'skin'); S.fine(14.5, 11.5, 0xe86aa8, 'skin'); S.fineRect(11, 14, 2, 0.5, 0xe84a8a, 'skin');
    S.mat = 'cloth'; S.px(21, 22, 0xfff07a); S.px(26, 22, 0xfff07a);
  },
  hair: (m) => [
    { x: 0, y: 8, z: -0.4, w: 8, h: 1.6, d: 8, material: m },
    { x: -3.6, y: 4, z: 0, w: 2, h: 8, d: 6, hang: true, material: m, stiff: 26 },
    { x: 3.6, y: 4, z: 0, w: 2, h: 8, d: 6, hang: true, material: m, stiff: 26 },
    { x: 0, y: 5, z: -3.7, w: 8, h: 10, d: 2, hang: true, material: m, stiff: 24 },
    { x: -1.5, y: 8.2, z: 2.8, w: 4, h: 2, d: 3, rx: 0.5, rz: 0.25, material: m },
  ],
  hairColor: 0xf080b8, accent: PINK, emit: 0.25, cape: null, scale: 1.14,
  props(rig, K) {
    const star = K.mat(STAR, { emissive: 2.5 }), pink = K.mat(PINK, { emissive: 1.2 });
    // a star hair clip and star charms on the wrists
    K.box(rig.head, 1.4, 1.4, 0.4, star, 3.4, 6.5, 3.6, 0, 0, 0.785); K.box(rig.head, 1, 1, 0.5, pink, 3.4, 6.5, 3.6);
    K.box(rig.handR, 1.2, 1.2, 1.2, star, 0, -1, 0, 0, 0.785, 0.785); K.box(rig.handL, 1.2, 1.2, 1.2, star, 0, -1, 0, 0, 0.785, 0.785);
  },
});

export const KIRARA_SKILLS = [
  { id: 'style', name: 'Style', icon: '💅', desc: '+8% melee damage and +6% movement speed per rank.', max: 3, branch: 'Idol', tier: 0 },
  { id: 'starlight', name: 'Starlight', icon: '⭐', desc: 'Stars hit harder and marks last longer.', max: 3, req: 'ab:star_mark', branch: 'Stars', tier: 1 },
  { id: 'attraction', name: 'Attraction', icon: '💞', desc: 'Rendezvous pulls harder and crashes hit harder.', max: 3, req: 'ab:rendezvous', branch: 'Rendezvous', tier: 2 },
  { id: 'cross', name: 'Southern Cross', icon: '✝️', desc: 'The ultimate reaches further and crushes harder.', max: 2, req: 'attraction', branch: 'Crux', tier: 4 },
];

class KiraraKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const kick = { trail: PINK, sparkColor: STAR };
    this.combo = [
      { ...kick, style: 'swingR', dur: 0.28, windup: 0.26, strike: 0.5, dmg: 11, range: 2.7, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.12 },
      { ...kick, style: 'spin', dur: 0.34, windup: 0.28, strike: 0.52, dmg: 13, range: 2.9, arc: Math.PI, lunge: 5, knock: 4, stop: 0.045, shake: 0.14 },
      { ...kick, style: 'uppercut', dur: 0.42, windup: 0.34, strike: 0.56, dmg: 20, range: 3, arc: 1.1, lunge: 5, knock: 7, stop: 0.07, shake: 0.25, ring: true, ringColor: PINK, stagger: 0.6, stamp: true },
    ];
    this.p.stats.meleeMult += r('style') * 0.08; this.p.stats.speed += r('style') * 0.06;
    this.branches = ['Stars', 'Rendezvous', 'Crux', 'Idol'];
    this.starMul = 1 + r('starlight') * 0.15; this.markDur = 10 + r('starlight') * 3; this.attMul = 1 + r('attraction') * 0.2;
    this.next = 0;   // the next star in the Southern Cross to stamp
    this.library = {
      // ---- Stars
      star_mark: ability({ name: 'Star Mark', icon: '⭐', kind: 'basic', desc: 'Throw a star that stamps the curse it hits with the next star of the Southern Cross (Acrux → Mimosa → Gacrux → Imai → Ginan).', cd: 0.7, ce: 0, branch: 'Stars', tier: 0, start: true, legacy: 'ranged', use: () => this.starMark() }),
      twin: ability({ name: 'Twin Stars', icon: '✨', kind: 'basic', desc: 'Two stars at once, stamping two curses with consecutive stars.', cd: 1.1, ce: 0, branch: 'Stars', tier: 1, req: 'star_mark', use: () => this.twin() }),
      snare: ability({ name: 'Mimosa Snare', icon: '🌟', kind: 'technique', desc: 'A star bursts at the aim: curses there are stamped and snared in place for 1.5s.', cd: 8, ce: 12, branch: 'Stars', tier: 2, req: 'twin', use: () => this.snare() }),
      stardust: ability({ name: 'Stardust', icon: '🌌', kind: 'technique', desc: 'Scatter stardust over the aim: every curse there is stamped, in order.', cd: 9, ce: 14, branch: 'Stars', tier: 2, req: 'star_mark', use: () => this.stardust() }),
      shooting: ability({ name: 'Shooting Star', icon: '🌠', kind: 'technique', desc: 'A big shooting star tears through a line of curses and stamps them all.', cd: 9, ce: 14, branch: 'Stars', tier: 3, req: ['snare', 'stardust'], use: () => this.shooting() }),
      // ---- Rendezvous
      rendezvous: ability({ name: 'Rendezvous', icon: '💞', kind: 'technique', desc: 'Every stamped curse is drawn to the next star in the constellation: they crash into each other and take heavy damage.', cd: 6, ce: 12, branch: 'Rendezvous', tier: 1, legacy: 't1', req: 'star_mark', use: () => this.rendezvous() }),
      repulsion: ability({ name: 'Repulsion', icon: '🚫', kind: 'defence', desc: 'Stamp yourself with a star out of order for 6s: stamped curses cannot come near you, and others are pushed back.', cd: 14, ce: 10, branch: 'Rendezvous', tier: 1, legacy: 't2', use: () => this.repulsion() }),
      trail: ability({ name: 'Star Trail', icon: '💫', kind: 'movement', desc: 'Stamp a star on the ground at the aim and on yourself: you are pulled straight to it.', cd: 6, ce: 6, branch: 'Rendezvous', tier: 2, req: 'repulsion', use: () => this.trail() }),
      swap: ability({ name: 'Star Swap', icon: '🔁', kind: 'movement', desc: 'Trade places with the stamped curse you aim at, leaving it dazed.', cd: 8, ce: 8, branch: 'Rendezvous', tier: 2, req: 'rendezvous', use: () => this.swap() }),
      satellite: ability({ name: 'Satellite', icon: '🪐', kind: 'technique', desc: 'A stamped curse is pulled into orbit around you for 3s, smashing into every other curse.', cd: 12, ce: 14, branch: 'Rendezvous', tier: 3, req: 'swap', use: () => this.satellite() }),
      reversal: ability({ name: 'Order Reversal', icon: '↔️', kind: 'technique', desc: 'Reverse the constellation\'s order: every stamped curse near you is violently flung away from you and from each other.', cd: 10, ce: 12, branch: 'Rendezvous', tier: 3, req: 'repulsion', use: () => this.reversal() }),
      anchor: ability({ name: 'Acrux Anchor', icon: '⚓', kind: 'technique', desc: 'Set Acrux on the ground for 4s: every stamped curse nearby is dragged to it again and again.', cd: 14, ce: 18, branch: 'Rendezvous', tier: 3, req: 'trail', use: () => this.anchor() }),
      // ---- Crux
      lines: ability({ name: 'Constellation Lines', icon: '✴️', kind: 'technique', desc: 'Lines of starlight connect the stamped curses in order and cut everything along them.', cd: 8, ce: 14, branch: 'Crux', tier: 2, req: 'rendezvous', use: () => this.lines() }),
      burst: ability({ name: 'Star Burst', icon: '💥', kind: 'technique', desc: 'Every stamp goes off at once, blasting the curses around it.', cd: 10, ce: 16, branch: 'Crux', tier: 3, req: 'lines', use: () => this.starBurst() }),
      crush: ability({ name: 'Crux Crush', icon: '✝️', kind: 'technique', desc: 'All stamped curses are hauled to the aim and crushed together in a flash of the cross.', cd: 18, ce: 34, branch: 'Crux', tier: 4, legacy: 't3', req: ['burst', 'anchor'], use: () => this.cruxCrush() }),
      // ---- Idol
      spotlight: ability({ name: 'Spotlight', icon: '🔦', kind: 'technique', desc: 'Strike a pose under a spotlight: curses around you are dazzled and stunned.', cd: 12, ce: 10, branch: 'Idol', tier: 1, use: () => this.spotlight() }),
      barrier: ability({ name: 'Love Barrier', icon: '💗', kind: 'defence', desc: 'A heart-shaped barrier for 5s soaks up to 70 damage.', cd: 16, ce: 12, branch: 'Idol', tier: 2, req: 'spotlight', use: () => this.loveBarrier() }),
      encore: ability({ name: 'Encore', icon: '🎤', kind: 'heal', desc: 'Restore 25% of your health and 20 Cursed Energy.', cd: 22, ce: 0, branch: 'Idol', tier: 2, req: 'spotlight', use: () => this.encore() }),
      dance: ability({ name: 'Fan Dance', icon: '💃', kind: 'buff', desc: 'For 8s: +15% movement speed, +15% damage and every hit stamps a star.', cd: 24, ce: 14, branch: 'Idol', tier: 3, req: 'barrier', use: () => this.dance() }),
      kick: ability({ name: 'Starlight Kick', icon: '🦵', kind: 'technique', desc: 'Dash in with a spinning kick that stamps and launches the curse.', cd: 6, ce: 8, branch: 'Idol', tier: 3, req: 'encore', use: () => this.starKick() }),
    };
    this.passives = {
      gatekeeper: passive({ name: 'Gatekeeper', icon: '🚪', desc: '+8% damage reduction; curses that hit you up close are stamped.', branch: 'Idol', tier: 2, req: 'spotlight', apply: (pl, k) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.08); k.gate = true; } }),
      hakari: passive({ name: 'Hakari\'s Partner', icon: '🎰', desc: '+8% critical chance; crashes have a chance to be critical hits.', branch: 'Rendezvous', tier: 3, req: 'rendezvous', apply: (pl) => { pl.stats.crit += 0.08; } }),
      brightest: passive({ name: 'Brightest Star', icon: '🌟', desc: 'Curses stamped with Acrux take 20% more damage from you.', branch: 'Stars', tier: 3, req: 'twin', apply: (pl, k) => { k.acrux = true; } }),
      orbit: passive({ name: 'Perfect Order', icon: '🔢', desc: 'Rendezvous and Constellation Lines restore 2 Cursed Energy per curse they hit.', branch: 'Crux', tier: 3, req: 'lines', apply: (pl, k) => { k.orderCE = true; } }),
    };
    this.ultimate = { name: 'Love Rendezvous: Southern Cross', short: 'Southern Cross', icon: '✝️', use: () => this.southernCross() };
    this.tick = () => {
      // stamped curses wear their star over their heads
      for (const [e, m] of this.badges ?? []) {
        if (e.dead || !e.kStar || e.kStar.t < this.game.time) { this.game.scene.remove(m); this.badges.delete(e); if (!e.dead) e.kStar = null; continue; }
        m.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) + 0.7, e.pos.z); m.rotation.y += 0.05;
      }
      if (this.repelT > this.game.time) {
        for (const e of this.foes(this.p.pos, 4.5)) if (!e.isBoss) { tmp.subVectors(e.pos, this.p.pos).setY(0); const d = tmp.length(); if (d < 4.5) e.knock?.addScaledVector(tmp.normalize(), e.kStar ? 3 : 1.2); if (e.kStar && d < 3) e.cancelAttack?.(); }
      }
    };
  }
  dispose() { super.dispose(); for (const [e, m] of this.badges ?? []) { this.game.scene.remove(m); e.kStar = null; } this.badges?.clear(); }
  starMesh(color, s = 0.35) { const grp = new THREE.Group(); const a = mesh(GEO.box, glow(color, 3), [s, s, s * 0.3]); const b = mesh(GEO.box, glow(color, 3), [s, s, s * 0.3]); b.rotation.z = Math.PI / 4; grp.add(a, b); return grp; }
  // stamp a curse with a star (index i, or the next in order)
  stamp(e, i = null) {
    if (!e || e.dead) return -1;
    const g = this.game;
    const idx = i ?? this.next; if (i == null) this.next = (this.next + 1) % 5;
    e.kStar = { i: idx, t: g.time + this.markDur };
    this.badges ??= new Map();
    if (this.badges.has(e)) g.scene.remove(this.badges.get(e));
    const m = this.starMesh(CRUX[idx], 0.45); g.scene.add(m); this.badges.set(e, m);
    g.particles.burst(e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.6), { count: 8, color: CRUX[idx], speed: 2, life: 0.5, size: 0.2, shape: 3 });
    return idx;
  }
  stamped(c = this.p.pos, R = 24) { return this.foes(c, R).filter((e) => e.kStar && e.kStar.t > this.game.time).sort((a, b) => a.kStar.i - b.kStar.i); }
  shit(e, dmg, o = {}) { return this.hit(e, dmg * this.starMul * (this.acrux && e.kStar?.i === 0 ? 1.2 : 1), { color: '#ffb8e0', ...o }); }
  onMeleeHit(e, step) { if (step.stamp || this.buffs.has('dance')) this.stamp(e); }
  incoming(a, src) { if (this.gate && src && src.maxHp && !src.dead && src.pos && src.pos.distanceTo(this.p.pos) < 3.5) this.stamp(src); return a; }
  // crash two curses together (or a curse into a point)
  crash(a, to, dmg) {
    const g = this.game;
    if (a.dead) return;
    tmp.subVectors(to, a.pos).setY(0); const d = tmp.length();
    if (!a.isBoss && d > 0.5) a.knock?.addScaledVector(tmp.normalize(), Math.min(24, d * 3.2) * this.attMul);
    this.after(Math.min(0.35, d * 0.04), () => {
      if (a.dead) return;
      this.shit(a, dmg * this.attMul, { stagger: 0.8 });
      g.fx.hitSpark(a.pos.clone().setY(a.pos.y + 1), null, { color: PINK, big: true });
      if (this.orderCE) this.p.gainCE(2);
    });
  }
  // ------------------------------------------------------------ Stars
  throwStar(dir, i = null, dmg = 11) {
    const g = this.game, s = this.starMesh(STAR, 0.4);
    return meshShot(this, s, { pos: this.handPos(), vel: dir.clone().multiplyScalar(24), life: 0.8, radius: 0.5, face: false, light: 2, color: STAR,
      trail: (q, dt) => { s.rotation.z += dt * 14; if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: PINK, speed: 0.3, life: 0.3, size: 0.15 }); },
      onHit: (e) => { this.shit(e, dmg, { stagger: 0.25 }); this.stamp(e, i); } });
  }
  starMark() {
    const g = this.game;
    this.cast(0.24);
    this.throwStar(aimAt(this, this.handPos(), 16).dir);
    g.audio?.tone({ freq: 1320, to: 1760, dur: 0.1, gain: 0.06, type: 'triangle' });
  }
  twin() {
    const g = this.game, base = this.aimAngle();
    this.cast(0.3);
    [-0.15, 0.15].forEach((o) => this.throwStar(new THREE.Vector3(Math.sin(base + o), 0, Math.cos(base + o)), null, 9));
    g.audio?.tone({ freq: 1320, to: 1980, dur: 0.14, gain: 0.06, type: 'triangle' });
  }
  snare() {
    const g = this.game, c = this.aimGround(12), R = 3.4;
    this.cast(0.35, true);
    sigil(this, c, R, CRUX[1], 0.35);
    this.after(0.3, () => {
      for (const e of this.foes(c, R)) { this.stamp(e, 1); this.stun(e, 1.5); this.shit(e, 16, { stagger: 0.4 }); }
      const s = this.starMesh(CRUX[1], 1.6); s.position.copy(c).setY(c.y + 1.2);
      temp(this, s, 0.5, (t, dt, k) => { s.scale.setScalar(1 + k * 2); s.rotation.z += dt * 6; });
      g.audio?.tone({ freq: 1760, to: 880, dur: 0.3, gain: 0.07, type: 'triangle', rev: 0.4 });
    });
  }
  stardust() {
    const g = this.game, c = this.aimGround(12), R = 5;
    this.cast(0.4, true);
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R; g.particles.burst(tmp.set(c.x + Math.cos(a) * rr, c.y + 3, c.z + Math.sin(a) * rr), { count: 1, color: CRUX[i % 5], speed: 1, gravity: 3, life: 1, size: 0.18, shape: 3 }); }
    this.after(0.4, () => { for (const e of this.foes(c, R)) { this.stamp(e); this.shit(e, 8, { stagger: 0.2 }); } });
    g.audio?.tone({ freq: 2093, dur: 0.5, gain: 0.04, type: 'sine', rev: 0.6 });
  }
  shooting() {
    const g = this.game, from = this.handPos(), { dir } = aimAt(this, from, 18);
    this.cast(0.35);
    beam(this, from, dir, 18, 0.6, STAR, { dmg: 26 * this.starMul, core: 0xffffff, pierce: true, knock: 5, stagger: 0.6, onHit: (e) => this.stamp(e) });
    g.audio?.whoosh(1.2); g.audio?.tone({ freq: 2400, to: 1200, dur: 0.3, gain: 0.06, type: 'triangle' });
  }
  // ------------------------------------------------------------ Rendezvous
  rendezvous() {
    const g = this.game, list = this.stamped();
    if (list.length === 0) { g.toast?.('No stamped curses — mark them with stars first'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    if (list.length === 1) { this.crash(list[0], this.p.pos.clone().addScaledVector(this.fwd(), 1.5), 30); }
    // each star is drawn to the next one in the Southern Cross
    for (let k = 0; k < list.length; k++) {
      const a = list[k], b = list[(k + 1) % list.length];
      if (a === b) continue;
      const mid = a.pos.clone().lerp(b.pos, 0.5);
      g.fx.slashLine(a.pos.clone().setY(a.pos.y + 1), tmp.subVectors(b.pos, a.pos).normalize(), a.pos.distanceTo(b.pos), CRUX[a.kStar.i], 0.12, 0.4);
      this.crash(a, mid, 34);
    }
    g.audio?.tone({ freq: 880, to: 1760, dur: 0.3, gain: 0.08, type: 'triangle', rev: 0.4 }); this.after(0.3, () => g.audio?.impact(1.4));
  }
  repulsion() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    this.repelT = g.time + 6;
    const s = this.starMesh(PINK, 0.7); g.scene.add(s);
    temp(this, s, 6, () => { s.position.set(p.pos.x, p.pos.y + 3, p.pos.z); s.rotation.y += 0.06; });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: PINK, r0: 0.3, r1: 4.5, dur: 0.5, thick: 0.15 });
    g.audio?.energy('infinity');
  }
  trail() {
    const g = this.game, p = this.p, to = this.aimGround(12), f = tmp2.subVectors(to, p.pos).setY(0), d = f.length();
    if (d < 1) return false;
    const s = this.starMesh(STAR, 0.8); s.position.copy(to).setY(to.y + 0.8);
    temp(this, s, 0.5, (t) => { s.rotation.z = t * 8; });
    this.dash(f.normalize(), d, Math.min(0.35, d * 0.03), { hitR: 1.4, dmg: 12 * this.starMul, color: PINK, onHit: (e) => this.stamp(e) });
    g.audio?.tone({ freq: 660, to: 1320, dur: 0.25, gain: 0.07, type: 'sine' });
  }
  swap() {
    const g = this.game, p = this.p;
    const list = this.stamped(p.pos, 14);
    const t = list.find((e) => { tmp.subVectors(e.pos, p.pos).setY(0).normalize(); return tmp.dot(p.aimDir) > 0.3; }) ?? list[0];
    if (!t) { g.toast?.('No stamped curse to swap with'); g.audio?.ui('back'); return false; }
    const a = p.pos.clone(), b = t.pos.clone();
    if (!this.blink(b, { color: PINK, quiet: true })) return false;
    if (!t.isBoss) t.pos.copy(a);
    this.stun(t, 1); this.shit(t, 14, { stagger: 0.5 });
    g.audio?.energy('teleport');
  }
  satellite() {
    const g = this.game, p = this.p;
    const t = this.stamped(p.pos, 12).find((e) => !e.isBoss) ?? this.target(10);
    if (!t || t.isBoss) { g.toast?.('No curse light enough to swing'); g.audio?.ui('back'); return false; }
    this.cast(0.35, true);
    this.stamp(t, t.kStar?.i ?? null);
    this.stun(t, 3.2);
    const hit = new Set();
    this.during(3, (tt) => {
      if (t.dead) return false;
      const a = tt * 6, rr = 3;
      t.pos.set(p.pos.x + Math.cos(a) * rr, p.pos.y + 0.6, p.pos.z + Math.sin(a) * rr); t.vel.set(0, 0, 0);
      for (const e of this.foes(t.pos, 1.6)) if (e !== t && !hit.has(e)) { hit.add(e); this.shit(e, 30, { stagger: 0.8, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(10) }); this.shit(t, 10, { stagger: 0 }); g.audio?.impact(1.1); this.after(0.5, () => hit.delete(e)); }
      if (Math.random() < 0.5) g.particles.burst(t.pos.clone().setY(t.pos.y + 1), { count: 1, color: PINK, speed: 0.4, life: 0.4, size: 0.25 });
    }, () => { if (!t.dead) { t.knock?.add(tmp.subVectors(t.pos, p.pos).setY(0).setLength(14)); } });
  }
  anchor() {
    const g = this.game, c = this.aimGround(12), R = 9;
    this.cast(0.4, true);
    const s = this.starMesh(CRUX[0], 1.4); s.position.copy(c).setY(c.y + 1.5);
    let tick = 0;
    temp(this, s, 4, (t, dt) => {
      s.rotation.z += dt * 3;
      tick -= dt; if (tick > 0) return; tick = 0.8;
      for (const e of this.stamped(c, R)) this.crash(e, c, 18);
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: CRUX[0], r0: R, r1: 0.5, dur: 0.5, thick: 0.1 });
    });
    g.audio?.tone({ freq: 440, to: 220, dur: 0.6, gain: 0.08, type: 'triangle', rev: 0.5 });
  }
  reversal() {
    const g = this.game, p = this.p, list = this.stamped(p.pos, 10);
    if (!list.length) { g.toast?.('No stamped curses nearby'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    for (const e of list) {
      if (!e.isBoss) { e.knock?.add(tmp.subVectors(e.pos, p.pos).setY(0).setLength(20)); e.vel.y = Math.max(e.vel.y, 6); }
      this.shit(e, 22, { stagger: 0.7 });
      g.fx.slashLine(p.pos.clone().setY(p.pos.y + 1), tmp.subVectors(e.pos, p.pos).setY(0).normalize(), e.pos.distanceTo(p.pos), CRUX[e.kStar.i], 0.1, 0.35);
    }
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: PINK, r0: 0.5, r1: 10, dur: 0.45, thick: 0.15 });
    g.audio?.tone({ freq: 1760, to: 440, dur: 0.35, gain: 0.08, type: 'triangle', rev: 0.4 });
  }
  // ------------------------------------------------------------ Crux
  lines() {
    const g = this.game, list = this.stamped();
    if (list.length < 2) { g.toast?.('Stamp at least two curses'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    for (let k = 0; k < list.length - 1; k++) {
      const a = list[k].pos.clone().setY(list[k].pos.y + 1), b = list[k + 1].pos.clone().setY(list[k + 1].pos.y + 1), d = tmp.subVectors(b, a), L = d.length(); d.normalize();
      this.after(k * 0.08, () => {
        beam(this, a, d.clone(), L, 0.3, CRUX[list[k].kStar?.i ?? 0], { core: 0xffffff, pierce: true, light: k === 0, dur: 0.4 });
        this.line(a, d, L, 0.9, (e) => { this.shit(e, 28, { stagger: 0.6 }); if (this.orderCE) this.p.gainCE(2); });
      });
    }
    g.audio?.energy('slash');
  }
  starBurst() {
    const g = this.game, list = this.stamped();
    if (!list.length) { g.toast?.('No stamped curses'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    list.forEach((e, k) => this.after(k * 0.05, () => { const at = e.pos.clone().setY(e.pos.y + 0.8); this.blast(at, 2.6, 30 * this.starMul, { color: CRUX[e.kStar?.i ?? 0], knock: 7, stagger: 0.6 }); if (!e.dead) e.kStar = null; }));
  }
  cruxCrush() {
    const g = this.game, p = this.p, c = this.aimGround(12);
    const list = this.stamped(p.pos, 20);
    if (!list.length) { g.toast?.('No stamped curses'); g.audio?.ui('back'); return false; }
    p.action = { type: 'cast', both: true, dur: 0.8, elapsed: 0, t: 0, moveScale: 0, lock: true, faceAim: true };
    g.toast?.('Crux Crush');
    list.forEach((e, k) => this.after(k * 0.08, () => this.crash(e, c, 20)));
    this.after(0.4 + list.length * 0.08, () => {
      this.blast(c, 4, 70 * this.attMul, { color: PINK, knock: 4, stagger: 1, unblockable: true });
      // the cross flashes over the crushed pile
      for (const [dx, dz, w, l] of [[0, 0, 0.5, 9], [0, 0, 6, 0.5]]) { const bar = mesh(GEO.box, glow(STAR, 3), [w, 0.1, l]); bar.position.copy(c).setY(c.y + 0.2); temp(this, bar, 0.6, (t, dt, k) => { bar.scale.y = 1 + k * 3; }); }
      g.fx.flash(0xfff0c0, 0.4, 0.25); g.hitStop(0.06); g.shake(0.5); g.audio?.energy('explode');
    });
  }
  // ------------------------------------------------------------ Idol
  spotlight() {
    const g = this.game, p = this.p, R = 5.5;
    this.cast(0.5, true);
    pillar(this, p.pos.clone(), 1.4, 16, 0xfff8e0, 0.8, { core: 0xffffff });
    for (const e of this.foes(p.pos, R)) { this.stun(e, 1.6); this.shit(e, 10, { stagger: 0.4 }); }
    g.fx.flash(0xfff0f8, 0.4, 0.2); g.audio?.tone({ freq: 784, to: 1046, dur: 0.4, gain: 0.08, type: 'triangle', rev: 0.4 });
  }
  loveBarrier() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    let hp = 70;
    const heart = new THREE.Group();
    for (const [x, y, s] of [[-0.35, 0.3, 0.7], [0.35, 0.3, 0.7], [0, -0.15, 0.85]]) { const b = mesh(GEO.box, glow(PINK, 1.4, 0.5), [s, s, 0.1]); b.position.set(x, y, 0); b.rotation.z = Math.PI / 4; heart.add(b); }
    heart.scale.setScalar(1.8);
    this.buff('love_barrier', 5, {
      onStart: () => g.scene.add(heart),
      incoming: (a) => { const s = Math.min(hp, a); hp -= s; if (hp <= 0) { const b = this.buffs.get('love_barrier'); if (b) b.left = 0.01; } return a - s; },
      onTick: () => { heart.position.set(p.pos.x + Math.sin(p.facing) * 1.1, p.pos.y + 1.3, p.pos.z + Math.cos(p.facing) * 1.1); heart.rotation.y = p.facing; },
      onEnd: () => g.scene.remove(heart),
    });
    g.audio?.energy('infinity');
  }
  encore() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    p.heal?.(p.maxHp * 0.25, false); p.gainCE(20);
    g.fx.heal(p.pos, PINK); g.audio?.energy('heal');
    for (let i = 0; i < 12; i++) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 1, color: CRUX[i % 5], speed: 3, up: 2, life: 0.8, size: 0.2, shape: 3 });
  }
  dance() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.fx.flash(PINK, 0.2, 0.2); g.audio?.tone({ freq: 523, to: 784, dur: 0.4, gain: 0.08, type: 'square', filter: 3000 });
    this.statBuff('dance', 8, { speed: 0.15, damage: 0.15 }, { onTick: () => { if (Math.random() < 0.4) g.particles.burst(tmp.set(p.pos.x + (Math.random() - 0.5), p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5)), { count: 1, color: Math.random() < 0.5 ? PINK : STAR, speed: 0.5, life: 0.5, size: 0.16, shape: 3 }); } });
  }
  starKick() {
    const g = this.game, p = this.p, t = this.target(9);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, PINK);
    this.pose('spin', 0.35);
    this.after(0.12, () => { if (t.dead) return; this.shit(t, 34, { melee: true, stagger: 0.9, knock: tmp.subVectors(t.pos, p.pos).setY(0).setLength(8) }); this.stamp(t); if (!t.isBoss) t.vel.y = Math.max(t.vel.y, 10); g.fx.hitSpark(t.pos.clone().setY(t.pos.y + 1), null, { color: PINK, big: true }); g.audio?.impact(1.3); });
  }
  // ------------------------------------------------------------ F: Southern Cross
  southernCross() {
    const g = this.game, p = this.p, R = 12 + this.rank('cross') * 2, c = p.pos.clone().addScaledVector(this.fwd(), 4);
    c.y = this.groundAt(c.x, c.z, p.pos.y);
    const list = this.foes(p.pos, R);
    p.action = { type: 'cast', both: true, dur: 1.6, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    g.toast?.('Love Rendezvous: Southern Cross');
    g.fx.dimTarget = 0.45;
    // the five stars of the cross appear in the sky
    const cross = new THREE.Group(); cross.position.copy(c).setY(c.y + 6);
    [[0, -3], [0, 3], [-2.2, 0.4], [2.6, -0.6], [1.2, 1.2]].forEach(([x, y], i) => { const s = this.starMesh(CRUX[i], 1.2 - i * 0.12); s.position.set(x, y, 0); cross.add(s); });
    temp(this, cross, 1.7, (t, dt, k) => { cross.lookAt(p.pos.x, cross.position.y, p.pos.z); cross.scale.setScalar(Math.min(1, t * 3)); });
    list.forEach((e, k) => this.after(0.2 + k * 0.03, () => { this.stamp(e, k % 5); this.stun(e, 1.5); }));
    g.audio?.tone({ freq: 523, dur: 1.5, gain: 0.05, type: 'triangle', rev: 0.8 }); g.audio?.tone({ freq: 784, dur: 1.5, gain: 0.05, type: 'triangle', rev: 0.8, at: 0.2 });
    // dragged together in the constellation's order
    this.after(0.8, () => {
      g.fx.dimTarget = 0;
      const sorted = list.filter((e) => !e.dead).sort((a, b) => (a.kStar?.i ?? 0) - (b.kStar?.i ?? 0));
      sorted.forEach((e, k) => this.after(k * 0.04, () => { if (e.dead) return; if (!e.isBoss) e.knock?.add(tmp.subVectors(c, e.pos).setY(0).multiplyScalar(3.2)); g.fx.slashLine(e.pos.clone().setY(e.pos.y + 1), tmp.subVectors(c, e.pos).normalize(), e.pos.distanceTo(c), CRUX[e.kStar?.i ?? 0], 0.12, 0.4); }));
      this.after(0.5, () => {
        for (const e of this.foes(c, R)) { const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6); this.shit(e, (e.isBoss ? 40 + mx * 0.05 : Math.max(60, mx * 0.5)) * (1 + this.rank('cross') * 0.2), { stagger: 1, unblockable: true, crit: false }); }
        this.blast(c, 5, 60, { color: PINK, knock: 3, stagger: 1 });
        pillar(this, c, 2.5, 18, STAR, 0.8, { core: 0xffffff });
        g.fx.flash(0xfff0c0, 0.6, 0.35); g.fx.chroma(1.2); g.fx.screenWave(c, 1.4, 0.6); g.hitStop(0.1); g.shake(0.9);
        g.audio?.energy('explode'); g.audio?.blackFlash();
      });
    });
  }
}
registerKit('kirara', KiraraKit, KIRARA_SKILLS);
