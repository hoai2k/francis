// Ui Ui-style kit — Space Manipulation (Mei Mei's younger brother: his
// technique teleports people and things through space). 20 abilities on the
// technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB        light strikes that hop a short way through space.
//   Transfer   Warp Bolt (start, RMB), Rift Slice, Sky Drop, Scramble,
//              Gathering, Telefrag
//   Rift       Teleport, Displacement Field, Recall, Return to Sender, Emergency
//              Transfer, Space Tear
//   Sister     Black Birds, Bird Strike, Sister's Axe (Mei Mei's crows and axe,
//              teleported straight onto the curses)
//   Space      Folded Space, Compression, Phase Out, Mass Exit, Spatial Collapse
//   F          Ultimate: Space Manipulation: Mass Transfer (no canon domain) —
//              every curse nearby is transferred high into the sky over one
//              point and dropped into a single crushing pile.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { GEO, glow, mat, temp, mesh, beam, meshShot, pull, sigil, aimAt, makeOrb } from './fxlib.js';

const WARP = 0x7a5aff, RIFT = 0x2a1a5a, EDGE = 0xd8c8ff, CROW = 0x14141a, GOLD = 0xd8b040;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('uiui', { name: 'Ui Ui', technique: 'Space Manipulation', rarity: 'common', title: 'Mei Mei\'s Brother', desc: 'Teleport curses: drop them from the sky, scramble them, pile them up and transfer them into each other, with Mei Mei\'s crows on call.', ultimate: 'Space Manipulation: Mass Transfer', color: '#7a5aff' });

registerLook('uiui', {
  paint: { skinTone: 0xf6dcc8, hair: 0xf0e8c8, hairVolume: true, top: 0x15151c, kimono: true, sash: 0xd8b040, sleeve: 0x15151c, pants: 0x15151c, shoes: 0x14141a, eye: 0x6a5a8a, fringe: 4, hairSide: 7, hairBack: 8, blush: true },
  paintExtra(S) { S.mat = 'cloth'; for (let y = 20; y < 28; y += 2) S.px(22, y, 0xd8b040); },
  hair: (m) => [
    { x: 0, y: 8, z: -0.4, w: 8, h: 1.6, d: 8, material: m },
    { x: 0, y: 6.5, z: 3.6, w: 7, h: 4, d: 1, hang: true, material: m, stiff: 60 },   // the long fringe over his eyes
    { x: -3.6, y: 4, z: 0, w: 2, h: 10, d: 6, hang: true, material: m, stiff: 24 },
    { x: 3.6, y: 4, z: 0, w: 2, h: 10, d: 6, hang: true, material: m, stiff: 24 },
    { x: 0, y: 5, z: -3.7, w: 6, h: 14, d: 2, hang: true, material: m, stiff: 20 },
  ],
  hairColor: 0xf0e8c8, accent: WARP, emit: 0.2, cape: { color: 0x15151c, length: 9, width: 8, segments: 3 }, scale: 1.05,
  props(rig, K) {
    const rift = K.mat(WARP, { emissive: 2 });
    K.box(rig.handR, 1.2, 0.3, 1.2, rift, 0, -3, 0.5); K.box(rig.handL, 1.2, 0.3, 1.2, rift, 0, -3, 0.5);
    K.box(rig.head, 1.6, 0.6, 0.6, K.mat(GOLD, { metalness: 0.8, roughness: 0.3 }), 0, 1, -4.2);   // a gold hair tie
  },
});

export const UIUI_SKILLS = [
  { id: 'devoted', name: 'Devoted Brother', icon: '🫶', desc: '+8% technique damage and +10 max health per rank.', max: 3, branch: 'Space', tier: 0 },
  { id: 'transfer', name: 'Transfer', icon: '🌀', desc: 'Teleports reach further and drop curses from higher.', max: 3, req: 'ab:warp_bolt', branch: 'Transfer', tier: 1 },
  { id: 'crows', name: 'Crows', icon: '🐦‍⬛', desc: 'More of Mei Mei\'s crows come and they hit harder.', max: 3, req: 'ab:birds', branch: 'Sister', tier: 2 },
  { id: 'mass', name: 'Long-range Transfer', icon: '🌌', desc: 'Mass Transfer reaches further and drops from higher.', max: 2, req: 'transfer', branch: 'Transfer', tier: 4 },
];

class UiUiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const sp = { trail: WARP, sparkColor: EDGE };
    this.combo = [
      { ...sp, style: 'punch', dur: 0.26, windup: 0.25, strike: 0.5, dmg: 10, range: 2.6, arc: 1.1, lunge: 8, knock: 3, stop: 0.04, shake: 0.12 },
      { ...sp, style: 'swingL', dur: 0.28, windup: 0.25, strike: 0.5, dmg: 11, range: 2.6, arc: 1.2, lunge: 8, knock: 3, stop: 0.04, shake: 0.12 },
      { ...sp, style: 'swingR', dur: 0.42, windup: 0.34, strike: 0.56, dmg: 19, range: 3, arc: 1.2, lunge: 5, knock: 8, stop: 0.06, shake: 0.25, ring: true, ringColor: WARP, stagger: 0.6, hop: true },
    ];
    this.p.stats.techMult += r('devoted') * 0.08;
    this.p.maxHp += r('devoted') * 10; this.p.hp = Math.min(this.p.hp + r('devoted') * 10, this.p.maxHp);
    this.branches = ['Transfer', 'Rift', 'Sister', 'Space'];
    this.reach = 1 + r('transfer') * 0.15; this.dropH = 9 + r('transfer') * 2; this.crowBonus = r('crows');
    this.trail = [];
    this.library = {
      // ---- Transfer
      warp_bolt: ability({ name: 'Warp Bolt', icon: '🌀', kind: 'basic', desc: 'A small rift that hits a curse and transfers it a few metres away, dazed.', cd: 0.8, ce: 0, branch: 'Transfer', tier: 0, start: true, legacy: 'ranged', use: () => this.warpBolt() }),
      rift_slice: ability({ name: 'Rift Slice', icon: '🔪', kind: 'basic', desc: 'Cut the space in front of you: a thin rift slices every curse along it.', cd: 1.1, ce: 0, branch: 'Transfer', tier: 1, req: 'warp_bolt', use: () => this.riftSlice() }),
      sky_drop: ability({ name: 'Sky Drop', icon: '⬇️', kind: 'technique', desc: 'Transfer the curses at the aim high into the sky. They fall.', cd: 7, ce: 14, branch: 'Transfer', tier: 1, legacy: 't1', req: 'warp_bolt', use: () => this.skyDrop() }),
      scramble: ability({ name: 'Scramble', icon: '🔀', kind: 'technique', desc: 'Every curse near the aim is transferred to a random spot nearby and left reeling.', cd: 10, ce: 14, branch: 'Transfer', tier: 2, req: 'sky_drop', use: () => this.scramble() }),
      gather: ability({ name: 'Gathering', icon: '🧲', kind: 'technique', desc: 'Transfer every curse nearby into one pile at the aim, slamming them together.', cd: 11, ce: 16, branch: 'Transfer', tier: 2, req: 'rift_slice', use: () => this.gather() }),
      telefrag: ability({ name: 'Telefrag', icon: '💢', kind: 'technique', desc: 'Transfer two curses into the same space: both take massive damage.', cd: 12, ce: 18, branch: 'Transfer', tier: 3, req: ['scramble', 'gather'], use: () => this.telefrag() }),
      // ---- Rift
      teleport: ability({ name: 'Teleport', icon: '✨', kind: 'movement', desc: 'Transfer yourself to the aim.', cd: 5, ce: 5, branch: 'Rift', tier: 1, use: () => this.teleport() }),
      field: ability({ name: 'Displacement Field', icon: '🫧', kind: 'technique', desc: 'For 4s, curses at the aim keep being transferred about inside it, unable to act.', cd: 14, ce: 18, branch: 'Rift', tier: 2, req: 'teleport', use: () => this.field() }),
      recall: ability({ name: 'Recall', icon: '⏪', kind: 'movement', desc: 'Transfer back to where you stood 2 seconds ago and recover a little health.', cd: 10, ce: 8, branch: 'Rift', tier: 2, req: 'teleport', use: () => this.recall() }),
      emergency: ability({ name: 'Emergency Transfer', icon: '🚨', kind: 'defence', desc: 'Vanish and reappear behind the curses, leaving a rift that bursts where you stood.', cd: 12, ce: 8, branch: 'Rift', tier: 3, req: 'recall', use: () => this.emergency() }),
      sender: ability({ name: 'Return to Sender', icon: '📮', kind: 'defence', desc: 'Open a portal in front of you for 4s: curse shots that enter it come back out at the curses.', cd: 12, ce: 10, branch: 'Rift', tier: 2, req: 'teleport', use: () => this.sender() }),
      tear: ability({ name: 'Space Tear', icon: '🌌', kind: 'technique', desc: 'Tear a long rift through space: curses along it are pulled in and shredded for 2s.', cd: 14, ce: 22, branch: 'Rift', tier: 3, req: 'field', use: () => this.tear() }),
      // ---- Sister
      birds: ability({ name: 'Black Birds', icon: '🐦‍⬛', kind: 'summon', desc: 'Transfer a flock of Mei Mei\'s crows onto the battlefield to dive at curses.', cd: 9, ce: 14, branch: 'Sister', tier: 1, legacy: 't2', use: () => this.birds() }),
      bird_strike: ability({ name: 'Bird Strike', icon: '💥', kind: 'technique', desc: 'Mei Mei\'s finisher: one crow gives up its restriction and slams into the targeted curse at tremendous force.', cd: 14, ce: 24, branch: 'Sister', tier: 3, req: 'birds', use: () => this.birdStrike() }),
      axe: ability({ name: 'Sister\'s Axe', icon: '🪓', kind: 'technique', desc: 'Transfer Mei Mei\'s great axe directly above the targeted curse and let it fall.', cd: 9, ce: 14, branch: 'Sister', tier: 2, req: 'birds', use: () => this.axe() }),
      // ---- Space
      folded: ability({ name: 'Folded Space', icon: '📐', kind: 'defence', desc: 'Fold space around you for 5s: half the hits aimed at you land somewhere else.', cd: 16, ce: 12, branch: 'Space', tier: 1, use: () => this.folded() }),
      compress: ability({ name: 'Compression', icon: '🔘', kind: 'technique', desc: 'Compress the space at the aim to a point and let it snap back.', cd: 9, ce: 14, branch: 'Space', tier: 2, req: 'folded', use: () => this.compress() }),
      phase: ability({ name: 'Phase Out', icon: '👻', kind: 'defence', desc: 'Step half out of space for 1.5s: untouchable.', cd: 18, ce: 10, branch: 'Space', tier: 2, req: 'folded', use: () => this.phase() }),
      exit: ability({ name: 'Mass Exit', icon: '🚪', kind: 'heal', desc: 'Transfer yourself and nearby allies to safety ahead; everyone recovers 15% health.', cd: 22, ce: 14, branch: 'Space', tier: 3, req: 'phase', use: () => this.massExit() }),
      collapse: ability({ name: 'Spatial Collapse', icon: '🕳️', kind: 'technique', desc: 'A whole region of space caves in on itself, crushing everything inside.', cd: 22, ce: 42, branch: 'Space', tier: 4, legacy: 't3', req: ['compress', 'telefrag'], use: () => this.collapse() }),
    };
    this.passives = {
      escort: passive({ name: 'Escort Duty', icon: '🛡️', desc: '+8% damage reduction; Teleport leaves a burst behind.', branch: 'Rift', tier: 2, req: 'teleport', apply: (pl, k) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.08); k.escort = true; } }),
      family: passive({ name: 'Family Business', icon: '💰', desc: 'Kills restore 3 Cursed Energy; crows restore 1 per hit.', branch: 'Sister', tier: 2, req: 'birds', apply: (pl, k) => { k.family = true; } }),
      vertigo: passive({ name: 'Vertigo', icon: '😵', desc: 'Curses you transfer stay dazed 50% longer.', branch: 'Transfer', tier: 3, req: 'sky_drop', apply: (pl, k) => { k.dazeMul = 1.5; } }),
      precise: passive({ name: 'Precise Coordinates', icon: '📍', desc: 'Teleport and Recall cool down 30% faster.', branch: 'Space', tier: 3, req: 'phase', apply: (pl, k) => { k.library.teleport.cd *= 0.7; k.library.recall.cd *= 0.7; } }),
    };
    this.dazeMul = 1;
    this.ultimate = { name: 'Space Manipulation: Mass Transfer', short: 'Mass Transfer', icon: '🌌', use: () => this.massTransfer() };
    this.tick = (dt) => {
      // breadcrumbs for Recall
      this.trailT = (this.trailT ?? 0) - dt;
      if (this.trailT <= 0) { this.trailT = 0.1; this.trail.push(this.p.pos.clone()); if (this.trail.length > 20) this.trail.shift(); }
    };
  }
  onKill() { if (this.family) this.p.gainCE(3); }
  daze(e, t) { this.stun(e, t * this.dazeMul); }
  riftFx(at, s = 1) {
    const g = this.game, r = mesh(GEO.torus, glow(WARP, 3), 0.2);
    r.position.copy(at); r.rotation.x = Math.PI / 2;
    temp(this, r, 0.4, (t, dt, k) => { r.scale.setScalar(s * Math.sin(k * Math.PI) * 1.2 + 0.05); r.rotation.z += dt * 10; });
    g.particles.burst(at, { count: Math.round(10 * s), color: EDGE, speed: 2.5 * s, life: 0.4, size: 0.15, shape: 3 });
  }
  // transfer a curse to `to` (bosses only flicker: they are too big to move)
  transfer(e, to, o = {}) {
    if (e.dead) return false;
    const g = this.game;
    this.riftFx(e.pos.clone().setY(e.pos.y + 1), 0.9);
    if (e.isBoss && !o.boss) return false;
    const gy = g.world.groundBelow(to.x, to.z, Math.max(to.y, e.pos.y) + 3);
    const air = o.air ?? 0;
    if (!isFinite(gy) || (!air && g.world.solidAt(to.x, gy + 0.5, to.z))) return false;
    e.pos.set(to.x, gy + air, to.z); e.vel.set(0, 0, 0); e.knock?.set(0, 0, 0);
    this.riftFx(e.pos.clone().setY(e.pos.y + 1), 0.9);
    return true;
  }
  shit(e, dmg, o = {}) { return this.hit(e, dmg, { color: '#c8b8ff', ...o }); }
  onMeleeHit(e, step) { if (step.hop && !e.isBoss) { const p = this.p; this.transfer(e, e.pos.clone().addScaledVector(tmp.subVectors(e.pos, p.pos).setY(0).normalize(), 4)); this.daze(e, 0.6); } }
  // ------------------------------------------------------------ Transfer
  warpBolt() {
    const g = this.game, p = this.p;
    this.cast(0.26);
    const orb = makeOrb(WARP, { radius: 0.25, darkCore: true });
    const { dir } = aimAt(this, this.handPos(), 16);
    meshShot(this, orb, { pos: this.handPos(), vel: dir.clone().multiplyScalar(22), life: 0.8, radius: 0.5, face: false,
      onHit: (e) => { this.shit(e, 11, { stagger: 0.3 }); if (!e.isBoss) { const to = e.pos.clone().addScaledVector(tmp.subVectors(e.pos, p.pos).setY(0).normalize(), 3.5 * this.reach); this.transfer(e, to); } this.daze(e, 0.5); } });
    g.audio?.energy('teleport');
  }
  riftSlice() {
    const g = this.game, p = this.p, f = this.fwd(), L = 9;
    this.cast(0.28);
    g.fx.slashLine(p.pos.clone().setY(p.pos.y + 1).addScaledVector(f, 0.5), f, L, WARP, 0.25, 0.3);
    g.fx.slashLine(p.pos.clone().setY(p.pos.y + 1.02).addScaledVector(f, 0.5), f, L, EDGE, 0.08, 0.25);
    this.line(p.pos.clone(), f, L, 0.9, (e) => this.shit(e, 14, { stagger: 0.3 }));
    g.audio?.energy('slash');
  }
  skyDrop() {
    const g = this.game, c = this.aimGround(12 * this.reach), R = 3.4;
    this.cast(0.4, true);
    sigil(this, c, R, WARP, 0.3);
    let n = 0;
    for (const e of this.foes(c, R)) {
      if (e.isBoss) { this.shit(e, 40, { stagger: 0.6 }); continue; }
      if (this.transfer(e, e.pos.clone(), { air: this.dropH })) { n++; this.daze(e, 1.4); e.vel.y = -4; this.after(0.75, () => { if (!e.dead) { this.shit(e, 30 + this.dropH * 2, { stagger: 0.9 }); g.fx.landDust(e.pos, 22); } }); }
    }
    if (n) this.after(0.75, () => { g.shake(0.3); g.audio?.impact(1.3); });
    g.audio?.energy('teleport');
  }
  scramble() {
    const g = this.game, c = this.aimGround(12 * this.reach), R = 5;
    this.cast(0.4, true);
    sigil(this, c, R, WARP, 0.35);
    for (const e of this.foes(c, R)) {
      const a = Math.random() * Math.PI * 2, rr = 4 + Math.random() * 5;
      this.transfer(e, c.clone().add(tmp.set(Math.cos(a) * rr, 0, Math.sin(a) * rr)));
      this.daze(e, 1.6); this.shit(e, 16, { stagger: 0.5 });
    }
    g.audio?.energy('teleport'); g.audio?.tone({ freq: 400, to: 1600, dur: 0.3, gain: 0.06, type: 'sine', rev: 0.4 });
  }
  gather() {
    const g = this.game, c = this.aimGround(12), R = 8 * this.reach;
    const list = this.foes(c, R);
    if (!list.length) { g.toast?.('No curses to gather'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    list.forEach((e, k) => this.after(k * 0.05, () => { const a = k * 2.4, rr = 0.6 + (k % 3) * 0.5; this.transfer(e, c.clone().add(tmp.set(Math.cos(a) * rr, 0, Math.sin(a) * rr)), { air: 1.5 }); }));
    this.after(0.15 + list.length * 0.05, () => { this.blast(c, 2.8, 30, { color: WARP, knock: 2, stagger: 0.9 }); for (const e of list) this.daze(e, 0.8); });
    g.audio?.energy('teleport');
  }
  telefrag() {
    const g = this.game, p = this.p, t = this.target(14);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    const other = g.enemies.filter((e) => !e.dead && e !== t && !e.isBoss && e.pos.distanceTo(t.pos) < 14).sort((a, b) => a.pos.distanceTo(t.pos) - b.pos.distanceTo(t.pos))[0];
    this.cast(0.45, true);
    if (other) this.transfer(other, t.pos.clone(), { air: 0.5 });
    this.after(0.12, () => {
      const at = t.pos.clone().setY(t.pos.y + 1);
      for (const e of [t, other]) if (e && !e.dead) this.shit(e, 80, { stagger: 1, unblockable: true });
      this.riftFx(at, 2.5); g.fx.explosion(at, WARP, 2.5); g.hitStop(0.06); g.shake(0.5); g.audio?.impact(1.8, 'crit');
    });
  }
  // ------------------------------------------------------------ Rift
  teleport() {
    const g = this.game, p = this.p, from = p.pos.clone(), to = this.aimGround(12 * this.reach);
    if (!this.blink(to, { color: WARP })) return false;
    this.riftFx(from.clone().setY(from.y + 1), 1.2); this.riftFx(p.pos.clone().setY(p.pos.y + 1), 1.2);
    if (this.escort) this.blast(from, 2.6, 18, { color: WARP, knock: 6, stagger: 0.4, explode: false });
    g.audio?.energy('teleport');
  }
  field() {
    const g = this.game, c = this.aimGround(12), R = 4.5;
    this.cast(0.45, true);
    const bubble = mesh(GEO.sphere, mat(RIFT, { emissive: 0.8, emissiveColor: WARP, opacity: 0.35 }), [R, R * 0.7, R]);
    let tick = 0;
    temp(this, bubble, 4, (t, dt) => {
      bubble.position.copy(c); bubble.rotation.y += dt;
      tick -= dt; if (tick > 0) return; tick = 0.45;
      for (const e of this.foes(c, R)) { const a = Math.random() * Math.PI * 2, rr = Math.random() * (R - 1); this.transfer(e, c.clone().add(tmp.set(Math.cos(a) * rr, 0, Math.sin(a) * rr))); this.daze(e, 0.6); this.shit(e, 8, { stagger: 0.2 }); }
    });
    g.audio?.tone({ freq: 300, to: 600, dur: 1, gain: 0.06, type: 'sine', rev: 0.6 });
  }
  recall() {
    const g = this.game, p = this.p, back = this.trail[0];
    if (!back || back.distanceTo(p.pos) < 1) { g.toast?.('Nowhere to recall to'); g.audio?.ui('back'); return false; }
    const from = p.pos.clone();
    if (!this.blink(back, { color: WARP, quiet: true })) return false;
    p.heal?.(p.maxHp * 0.08, true);
    this.riftFx(from.setY(from.y + 1), 1); this.riftFx(p.pos.clone().setY(p.pos.y + 1), 1);
    g.audio?.tone({ freq: 1500, to: 300, dur: 0.25, gain: 0.08, type: 'sine', rev: 0.4 });
  }
  emergency() {
    const g = this.game, p = this.p, from = p.pos.clone(), t = this.target(14);
    const dir = t ? tmp.subVectors(t.pos, p.pos).setY(0).normalize().clone() : this.fwd();
    const to = (t ? t.pos.clone() : p.pos.clone()).addScaledVector(dir, 4);
    if (!this.blink(to, { color: WARP, iframes: 0.8 }) && !this.blink(p.pos.clone().addScaledVector(dir, -6), { color: WARP, iframes: 0.8 })) return false;
    p.facing = Math.atan2(-dir.x, -dir.z);
    this.riftFx(from.clone().setY(from.y + 1), 1.5);
    this.after(0.35, () => { this.blast(from, 3.2, 32, { color: WARP, knock: 9, stagger: 0.7 }); });
    g.audio?.energy('teleport');
  }
  tear() {
    const g = this.game, p = this.p, f = this.fwd(), L = 12, from = p.pos.clone().addScaledVector(f, 1);
    this.cast(0.45, true);
    const rift = mesh(GEO.box, mat(0x05030a, { emissive: 0.4, emissiveColor: WARP }), [0.2, 2.4, L]);
    rift.rotation.y = Math.atan2(f.x, f.z);
    const edge = mesh(GEO.box, glow(EDGE, 2.5, 0.8), [0.35, 2.6, L]); edge.rotation.y = rift.rotation.y;
    const grp = new THREE.Group(); grp.add(edge, rift);
    let tick = 0;
    temp(this, grp, 2, (t, dt, k) => {
      const c = tmp.copy(from).addScaledVector(f, L / 2); grp.position.set(c.x, this.groundAt(c.x, c.z, from.y) + 1.2, c.z);
      grp.scale.y = Math.min(1, t * 4) * (1 - Math.max(0, k - 0.85) * 6);
      tick -= dt; if (tick > 0) return; tick = 0.25;
      this.line(from, f, L, 2.2, (e, along) => { if (!e.isBoss) { const side = (e.pos.x - from.x) * f.z - (e.pos.z - from.z) * f.x; e.knock?.add(tmp2.set(-f.z, 0, f.x).multiplyScalar(-Math.sign(side) * 2)); } this.shit(e, 10, { stagger: 0.25 }); });
    });
    g.audio?.noise({ dur: 2, gain: 0.2, type: 'bandpass', freq: 200, sweep: 800, q: 2 });
  }
  sender() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const ring = mesh(GEO.torus, glow(WARP, 3), 1.4);
    const disc = mesh(GEO.sphere, mat(RIFT, { emissive: 0.6, emissiveColor: WARP, opacity: 0.6 }), [1.3, 1.3, 0.1]);
    const gate = new THREE.Group(); gate.add(ring, disc);
    g.audio?.energy('teleport');
    this.buff('sender', 4, {
      onStart: () => g.scene.add(gate),
      onTick: (dt) => {
        const f = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
        gate.position.copy(p.pos).addScaledVector(f, 1.4).setY(p.pos.y + 1.2); gate.rotation.set(0, p.facing, 0); ring.rotation.z += dt * 4;
        for (const q of [...g.projectiles.list]) if (q.team === 'enemy' && q.pos.distanceTo(gate.position) < 1.8) {
          const at = q.pos.clone(), dmg = Math.max(12, (q.dmg ?? 10) * 1.5), tg = g.nearestEnemy(p.pos, 20);
          g.projectiles.kill(q, 'absorb');
          const v = tg ? tmp2.subVectors(tg.pos, at).setY(0).normalize().multiplyScalar(22) : f.clone().multiplyScalar(22);
          meshShot(this, makeOrb(WARP, { radius: 0.25, darkCore: true }), { pos: at, vel: v.clone(), life: 1.2, radius: 0.5, face: false, homing: tg ? 6 : 0, target: tg, onHit: (e) => this.shit(e, dmg, { stagger: 0.4 }) });
          this.riftFx(at, 0.8);
        }
      },
      onEnd: () => g.scene.remove(gate),
    });
  }
  // ------------------------------------------------------------ Sister
  crow() {
    const grp = new THREE.Group(), b = mat(CROW, { roughness: 0.6 });
    grp.add(mesh(GEO.box, b, [0.25, 0.22, 0.5]));
    for (const s of [-1, 1]) { const w = mesh(GEO.box, b, [0.5, 0.04, 0.3]); w.position.set(s * 0.35, 0.05, 0); grp.add(w); }
    const beak = mesh(GEO.box, mat(0xd8b040), [0.08, 0.06, 0.16]); beak.position.z = 0.32; grp.add(beak);
    return grp;
  }
  birds() {
    const g = this.game, p = this.p;
    const foes = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 22);
    if (!foes.length) { g.toast?.('No curses to hunt'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    const n = 6 + this.crowBonus * 2;
    for (let i = 0; i < n; i++) this.after(i * 0.06, () => {
      const a = i / n * Math.PI * 2, from = p.pos.clone().add(tmp.set(Math.cos(a) * 3, 4, Math.sin(a) * 3));
      this.riftFx(from, 0.6);
      meshShot(this, this.crow(), { pos: from, vel: new THREE.Vector3(Math.cos(a) * 3, -1, Math.sin(a) * 3), life: 2.4, radius: 0.45, ghost: true, homing: 6, target: foes[i % foes.length],
        trail: (q) => { q.homing = Math.min(14, q.homing + 0.3); q.vel.setLength(Math.min(22, q.vel.length() + 0.6)); },
        onHit: (e) => { this.shit(e, 14 + this.crowBonus * 3, { stagger: 0.3 }); if (this.family) p.gainCE(1); g.particles.burst(e.pos.clone().setY(e.pos.y + 1), { count: 6, color: CROW, additive: false, speed: 2, life: 0.6, size: 0.15, gravity: 3 }); } });
    });
    g.audio?.noise({ dur: 0.6, gain: 0.15, type: 'bandpass', freq: 1200, sweep: 600, q: 3 });
  }
  birdStrike() {
    const g = this.game, p = this.p, t = this.target(16);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    p.action = { type: 'cast', both: true, dur: 0.6, elapsed: 0, t: 0, moveScale: 0, lock: true, faceAim: true };
    g.toast?.('Bird Strike');
    const from = t.pos.clone().add(tmp.set(0, 12, 0)), c = this.crow(); c.scale.setScalar(2.2);
    this.riftFx(from, 2);
    g.markers.spawn({ pos: t.pos.clone(), dur: 0.5, radius: 2.4, color: WARP });
    temp(this, c, 0.5, (tt, dt, k) => { const to = t.dead ? from : t.pos.clone().setY(t.pos.y + 1); c.position.lerpVectors(from, to, k * k); c.lookAt(to); g.particles.burst(c.position, { count: 2, color: 0x8a6aff, speed: 1, life: 0.4, size: 0.4, sizeEnd: 0.05 }); }, () => {
      const at = t.dead ? from.setY(from.y - 12) : t.pos.clone();
      if (!t.dead) this.shit(t, 140 + this.crowBonus * 20, { stagger: 1, unblockable: true });
      this.blast(at, 3.2, 30, { color: 0x8a6aff, knock: 12, stagger: 0.8 });
      g.fx.flash(0x8a6aff, 0.3, 0.2); g.hitStop(0.08); g.shake(0.7); g.audio?.blackFlash();
    });
  }
  axe() {
    const g = this.game, t = this.target(14), c = t ? t.pos.clone() : this.aimGround(12);
    c.y = this.groundAt(c.x, c.z, this.p.pos.y);
    this.cast(0.4, true);
    g.markers.spawn({ pos: c, dur: 0.5, radius: 2.6, color: WARP });
    const axe = new THREE.Group();
    const handle = mesh(GEO.box, mat(0x3a2a1a), [0.25, 4, 0.25]); axe.add(handle);
    const blade = mesh(GEO.box, mat(0xc8c8d0, { metalness: 0.9, roughness: 0.2 }), [0.15, 1.6, 2.2]); blade.position.set(0, -1.4, 0.9); axe.add(blade);
    const from = c.clone().setY(c.y + 10);
    this.riftFx(from, 1.5);
    temp(this, axe, 0.5, (tt, dt, k) => { axe.position.lerpVectors(from, c.clone().setY(c.y + 2), k * k); axe.rotation.x = Math.PI + k * Math.PI * 1.5; }, () => {
      this.blast(c, 2.6, 60, { color: 0xc8c8d0, knock: 8, stagger: 1, unblockable: true });
      g.fx.slashLine(c.clone().setY(c.y + 0.2), this.fwd(), 4, 0xffffff, 0.3, 0.3);
      g.hitStop(0.05); g.audio?.impact(1.6);
    });
  }
  // ------------------------------------------------------------ Space
  folded() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const ring = mesh(GEO.torus, glow(WARP, 2.5, 0.8), 1.3); ring.rotation.x = Math.PI / 2;
    this.buff('folded', 5, {
      onStart: () => g.scene.add(ring),
      incoming: (a) => { if (Math.random() < 0.5) { this.riftFx(p.pos.clone().setY(p.pos.y + 1).add(tmp.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)), 0.7); return 0; } return a; },
      onTick: (dt) => { ring.position.set(p.pos.x, p.pos.y + 1, p.pos.z); ring.rotation.z += dt * 3; },
      onEnd: () => g.scene.remove(ring),
    });
    g.audio?.energy('infinity');
  }
  compress() {
    const g = this.game, c = this.aimGround(12), R = 4.5;
    this.cast(0.4, true);
    const orb = makeOrb(WARP, { radius: R, darkCore: true });
    orb.position.copy(c).setY(c.y + 1);
    temp(this, orb, 0.55, (t, dt, k) => { orb.scale.setScalar(R * (1 - k) + 0.1); pull(this, c, R + 1, 1.2, 0); }, () => {
      this.blast(c, R, 46, { color: WARP, knock: 14, stagger: 0.9 });
      this.riftFx(c.clone().setY(c.y + 1), 3);
    });
    g.audio?.tone({ freq: 800, to: 80, dur: 0.55, gain: 0.12, type: 'sawtooth', filter: 1500 });
  }
  phase() {
    const g = this.game, p = this.p;
    this.cast(0.2, true);
    p.iframes = Math.max(p.iframes, 1.5);
    this.buff('phase', 1.5, { incoming: () => 0, onTick: () => { if (Math.random() < 0.6) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 1, color: WARP, speed: 1, life: 0.4, size: 0.4, sizeEnd: 0.05 }); } });
    g.fx.flash(WARP, 0.15, 0.2); g.audio?.energy('teleport');
  }
  massExit() {
    const g = this.game, p = this.p, f = this.fwd();
    this.cast(0.4, true);
    const crew = g.players.filter((pl) => !pl.dead && pl.pos.distanceTo(p.pos) < 6);
    crew.forEach((pl, i) => {
      const to = pl.pos.clone().addScaledVector(f, -8);
      const gy = g.world.groundBelow(to.x, to.z, pl.pos.y + 3);
      if (isFinite(gy) && !g.world.solidAt(to.x, gy + 0.5, to.z) && !g.world.solidAt(to.x, gy + 1.5, to.z)) { this.riftFx(pl.pos.clone().setY(pl.pos.y + 1), 1); pl.pos.set(to.x, gy, to.z); pl.visY = gy; this.riftFx(pl.pos.clone().setY(pl.pos.y + 1), 1); }
      pl.heal?.(pl.maxHp * 0.15, true); pl.iframes = Math.max(pl.iframes ?? 0, 0.8);
    });
    g.audio?.energy('heal'); g.audio?.energy('teleport');
  }
  collapse() {
    const g = this.game, p = this.p, c = this.aimGround(12), R = 7;
    p.action = { type: 'cast', both: true, dur: 1, elapsed: 0, t: 0, moveScale: 0, lock: true, faceAim: true };
    g.toast?.('Spatial Collapse');
    g.markers.spawn({ pos: c, dur: 1, radius: R, color: WARP });
    const dome = mesh(GEO.sphere, mat(RIFT, { emissive: 1, emissiveColor: WARP, opacity: 0.5 }), R);
    temp(this, dome, 1, (t, dt, k) => { dome.position.copy(c); dome.scale.set(R * (1 - k * 0.9), R * (1 - k * 0.9) * 0.7, R * (1 - k * 0.9)); pull(this, c, R + 1, 1.4, 0); for (const e of this.foes(c, R)) this.daze(e, 0.2); }, () => {
      this.blast(c, R, 120, { color: WARP, knock: 16, stagger: 1, unblockable: true });
      this.riftFx(c.clone().setY(c.y + 1), 5);
      g.fx.flash(0x8a6aff, 0.5, 0.3); g.fx.chroma(1.2); g.fx.screenWave(c, 1.4, 0.6); g.hitStop(0.08); g.shake(0.8); g.audio?.energy('explode');
    });
    g.audio?.charge(1, 0.5);
  }
  // ------------------------------------------------------------ F: Mass Transfer
  massTransfer() {
    const g = this.game, p = this.p, R = 14 + this.rank('mass') * 3, H = 14 + this.rank('mass') * 4;
    const c = this.aimGround(10); c.y = this.groundAt(c.x, c.z, p.pos.y);
    const list = this.foes(p.pos, R);
    p.action = { type: 'cast', both: true, dur: 1.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    g.toast?.('Space Manipulation: Mass Transfer');
    g.markers.spawn({ pos: c, dur: 1.3, radius: 5, color: WARP });
    // a great rift opens in the sky over the drop point
    const gate = mesh(GEO.torus, glow(WARP, 3), 5); gate.rotation.x = Math.PI / 2; gate.position.copy(c).setY(c.y + H);
    temp(this, gate, 2, (t) => { gate.scale.setScalar(Math.min(1, t * 2)); gate.rotation.z += 0.05; });
    g.audio?.charge(0.6, 0.8);
    list.forEach((e, k) => this.after(0.3 + k * 0.04, () => {
      if (e.dead) return;
      const a = k * 2.4, rr = 0.5 + (k % 4) * 0.6;
      if (e.isBoss) { this.riftFx(e.pos.clone().setY(e.pos.y + 1), 1.5); this.stun(e, 1.5); return; }
      this.transfer(e, c.clone().add(tmp.set(Math.cos(a) * rr, 0, Math.sin(a) * rr)), { air: H - 2 });
      this.stun(e, 2); e.vel.y = -2;
    }));
    this.after(1.3, () => {
      for (const e of list) if (!e.dead) { const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6); this.shit(e, e.isBoss ? 40 + mx * 0.04 : Math.max(70, mx * 0.55), { stagger: 1, unblockable: true, crit: false }); }
      this.blast(c, 5, 50, { color: WARP, knock: 10, stagger: 1 });
      this.riftFx(c.clone().setY(c.y + 1), 4);
      for (let i = 0; i < 20; i++) g.debris.spawn(c.clone().setY(c.y + 0.6), new THREE.Vector3((Math.random() - 0.5) * 14, 5 + Math.random() * 8, (Math.random() - 0.5) * 14), 0.3, new THREE.Color(0x4a4058), 3);
      g.fx.flash(0x8a6aff, 0.5, 0.3); g.fx.screenWave(c, 1.4, 0.6); g.hitStop(0.1); g.shake(0.9); g.audio?.energy('explode'); g.audio?.blackFlash();
    });
  }
}
registerKit('uiui', UiUiKit, UIUI_SKILLS);
