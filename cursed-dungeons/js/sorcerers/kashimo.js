// Kashimo kit — cursed energy with the properties of electricity.
//   Kashimo's electric cursed energy charges whatever it touches, and his
//   lightning is drawn to the charge — it cannot miss a charged target.
//   LMB  Nyoi staff combo; every hit stores Charge on the curse. At 5 Charge
//        the stored electricity discharges as a lightning strike.
//   RMB  Electric Discharge: a bolt that chains between curses, favouring
//        charged ones. During Mythical Beast Amber it becomes a beam.
//   1    Nyoi Staff Throw: the staff flies out and plants itself as a
//        lightning rod that zaps every curse around it.
//   2    Charged Strike: every charged curse is struck from the sky at once.
//   3    Full Discharge: all his stored electricity leaves his body in a burst.
//   F    Ultimate (Kashimo has no canon domain): Mythical Beast Amber — his
//        one-time technique. An electromagnetic burst, then 12s as living
//        lightning (huge speed and damage, lightning on every hit, arcs that
//        leap to curses, Discharge becomes a beam) — and when it ends his body
//        breaks down: most of his HP drains away and he cannot use techniques
//        for a few seconds.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const VOLT = 0x6ae8ff, WHITE = 0xe8fbff, DEEP = 0x2a7aff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('kashimo', {
  name: 'Kashimo', technique: 'Mythical Beast Amber', rarity: 'legendary', title: 'The God of Lightning', color: '#6ae8ff',
  desc: 'His cursed energy is electricity: staff hits charge curses and his lightning cannot miss them. His ultimate, Mythical Beast Amber, turns him into living lightning — at the cost of his body.',
  ultimate: 'Mythical Beast Amber',
});

registerLook('kashimo', {
  paint: { skinTone: 0xf2dccc, hair: 0x8adcf0, hairVolume: true, top: 0x1a1e2c, kimono: true, sash: 0x6ae8ff, sleeve: 0x1a1e2c, pants: 0x14161f, shoes: 0x0c0c10, eye: 0x2ab8e8, brow: 0x6ac0d8, fringe: 2, hairSide: 3, hairBack: 4 },
  hair: (m) => [
    { x: 0, y: 8.4, z: -1, w: 3, h: 6, d: 3, rx: -0.15, material: m },                // tall top-knot
    { x: -1, y: 11, z: -1.4, w: 2.4, h: 4, d: 2.4, rx: -0.5, rz: 0.4, material: m },
    { x: 1, y: 11, z: -1.4, w: 2.4, h: 4, d: 2.4, rx: -0.5, rz: -0.4, material: m },
    { x: -2.6, y: 7.5, z: 1.5, w: 2.5, h: 3, d: 2.5, rx: 0.6, rz: 0.4, material: m },
    { x: 2.6, y: 7.5, z: 1.5, w: 2.5, h: 3, d: 2.5, rx: 0.6, rz: -0.4, material: m },
  ],
  hairColor: 0x8adcf0, accent: VOLT, emit: 0.4,
  cape: { color: 0xd8e4ea, length: 7, width: 9, segments: 2 },   // pale haori
  props(rig, K) {
    const pole = K.mat(0x2a3040, { metalness: 0.6, roughness: 0.4 }), tip = K.mat(VOLT, { metalness: 0.8, roughness: 0.2, emissive: 1.4 });
    const staff = new THREE.Group();
    K.box(staff, 1.1, 34, 1.1, pole, 0, -6, 0);
    K.box(staff, 1.6, 2, 1.6, tip, 0, 10.5, 0); K.box(staff, 1.6, 2, 1.6, tip, 0, -22.5, 0);
    K.box(staff, 1.4, 0.6, 1.4, tip, 0, 2, 0); K.box(staff, 1.4, 0.6, 1.4, tip, 0, -4, 0);
    staff.rotation.x = Math.PI / 2; staff.position.z = 2 * K.PX;
    rig.handR.add(staff); rig.extras.weapon = staff;
  },
});

export const KASHIMO_SKILLS = [
  { id: 'conduct', name: 'Conductivity', icon: '⚡', desc: 'Charge stacks faster; strikes and Full Discharge hit harder.', max: 3, branch: 'Charge', tier: 0 },
  { id: 'chain', name: 'Chain Lightning', icon: '⛓️', desc: 'Discharge jumps to one more curse per rank.', max: 2, req: 'ab:discharge', branch: 'Discharge', tier: 1 },
  { id: 'staff', name: 'Nyoi Staff', icon: '🦯', desc: '+8% melee damage per rank; staff techniques hit harder and the planted staff lasts longer.', max: 3, branch: 'Staff', tier: 0 },
  { id: 'clap', name: 'Charged Strike', icon: '🌩️', desc: 'Charged Strike hits harder per Charge.', max: 2, req: ['conduct', 'ab:thunderclap'], branch: 'Charge', tier: 2 },
  { id: 'amber', name: 'Mythical Beast', icon: '🐉', desc: 'Mythical Beast Amber lasts 2s longer and the breakdown is gentler.', max: 2, branch: 'Storm', tier: 5 },
];

// Jagged lightning between two points, drawn from short slash quads.
function zap(g, a, b, color = VOLT, width = 0.28, segs = 6) {
  let prev = a.clone();
  const span = tmp2.subVectors(b, a).length();
  for (let i = 1; i <= segs; i++) {
    const next = a.clone().lerp(b, i / segs);
    if (i < segs) next.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(span * 0.12));
    const d = next.clone().sub(prev); const len = d.length();
    if (len > 0.01) {
      g.fx.slashLine(prev, d.normalize(), len * 1.05, color, width, 0.16, Math.random() * 3);
      if (i % 2) g.fx.slashLine(prev, d, len * 1.05, WHITE, width * 0.35, 0.12, Math.random() * 3);
    }
    prev = next;
  }
}

class KashimoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 13, range: 3.1, arc: 1.25, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: VOLT, sparkColor: WHITE, chainAt: 0.55 },
      { style: 'swingL', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 13, range: 3.1, arc: 1.25, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: VOLT, sparkColor: WHITE, chainAt: 0.55 },
      { style: 'punch', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 15, range: 3.6, arc: 0.6, lunge: 8, knock: 6, stop: 0.05, shake: 0.18, trail: VOLT, sparkColor: WHITE, chainAt: 0.55 },
      { style: 'spin', dur: 0.42, windup: 0.25, strike: 0.55, dmg: 18, range: 3.4, arc: Math.PI, lunge: 3, knock: 7, stop: 0.06, shake: 0.25, trail: VOLT, sparkColor: WHITE, chainAt: 0.6 },
      { style: 'slam', dur: 0.56, windup: 0.42, strike: 0.6, dmg: 28, range: 3.5, arc: Math.PI, lunge: 4, knock: 11, stop: 0.09, shake: 0.42, ring: true, ringColor: VOLT, stagger: 0.55, trail: VOLT },
    ];
    this.p.stats.meleeMult += r('staff') * 0.08;
    this.branches = ['Discharge', 'Staff', 'Charge', 'Storm'];
    this.library = {
      // ---- Discharge: raw electric cursed energy
      discharge: ability({ name: 'Electric Discharge', icon: '⚡', kind: 'basic', desc: 'A bolt that chains between curses, favouring charged ones. During Mythical Beast Amber it becomes a beam.', cd: 0.9, ce: 0, branch: 'Discharge', tier: 0, start: true, legacy: 'ranged', use: () => (this.amberT > 0 ? this.beam() : this.discharge()) }),
      spark_bolt: ability({ name: 'Spark Bolt', icon: '🌠', kind: 'basic', desc: 'A fast, straight bolt that stores 2 Charge in the curse it hits.', cd: 0.7, ce: 0, branch: 'Discharge', tier: 1, req: 'discharge', use: () => this.sparkBolt() }),
      ball_lightning: ability({ name: 'Ball Lightning', icon: '🔵', kind: 'technique', desc: 'A slow, crackling orb that zaps and charges every curse it drifts past, then bursts into a lightning strike.', cd: 8, ce: 12, branch: 'Discharge', tier: 2, req: 'spark_bolt', use: () => this.ballLightning() }),
      em_wave: ability({ name: 'Electromagnetic Wave', icon: '📡', kind: 'technique', desc: 'A wave of electromagnetism washes over the front: curses are charged (+2), jolted stiff for a moment and shown to you.', cd: 9, ce: 12, branch: 'Discharge', tier: 3, req: 'spark_bolt', use: () => this.emWave() }),
      full_discharge: ability({ name: 'Full Discharge', icon: '💥', kind: 'technique', desc: 'All his stored electricity leaves his body in a burst.', cd: 12, ce: 26, branch: 'Discharge', tier: 3, legacy: 't3', req: 'ball_lightning', use: () => this.fullDischarge() }),
      lightning_beam: ability({ name: 'Lightning Beam', icon: '🔆', kind: 'technique', desc: 'Gather current in the palm for half a second, then fire a beam of pure electricity that cuts through curses and walls.', cd: 12, ce: 22, branch: 'Discharge', tier: 4, req: 'full_discharge', use: () => this.lightningBeam() }),
      // ---- Staff: the Nyoi staff
      staff_throw: ability({ name: 'Staff Throw', icon: '🦯', kind: 'technique', desc: 'The staff flies out and plants itself as a lightning rod that zaps every curse around it.', cd: 8, ce: 12, branch: 'Staff', tier: 1, legacy: 't1', use: () => this.staffThrow() }),
      staff_sweep: ability({ name: 'Nyoi Sweep', icon: '🌀', kind: 'technique', desc: 'Whirl the staff around you: every curse it strikes is knocked back and charged.', cd: 5, ce: 6, branch: 'Staff', tier: 1, use: () => this.staffSweep() }),
      staff_thrust: ability({ name: 'Extending Thrust', icon: '🥢', kind: 'basic', desc: 'The staff shoots out to twice its length, piercing everything on the line.', cd: 1.0, ce: 0, branch: 'Staff', tier: 2, req: 'staff_sweep', use: () => this.staffThrust() }),
      pole_vault: ability({ name: 'Pole Vault', icon: '🤸', kind: 'movement', desc: 'Vault on the staff to the aim point and land in a lightning strike.', cd: 7, ce: 8, branch: 'Staff', tier: 2, req: 'staff_throw', use: () => this.poleVault() }),
      staff_flurry: ability({ name: 'Staff Flurry', icon: '🎋', kind: 'technique', desc: 'Eight lightning-quick jabs into the front, each one storing Charge.', cd: 8, ce: 12, branch: 'Staff', tier: 3, req: 'staff_thrust', use: () => this.staffFlurry() }),
      // ---- Charge: lightning drawn to the charge
      thunderclap: ability({ name: 'Charged Strike', icon: '🌩️', kind: 'technique', desc: 'Every charged curse is struck from the sky at once.', cd: 7, ce: 16, branch: 'Charge', tier: 1, legacy: 't2', use: () => this.thunderclap() }),
      static_field: ability({ name: 'Static Field', icon: '🟦', kind: 'technique', desc: 'Electrify the marked ground for 5s: curses inside are zapped and charged every half second.', cd: 12, ce: 14, branch: 'Charge', tier: 2, req: 'thunderclap', use: () => this.staticField() }),
      magnetize: ability({ name: 'Magnetize', icon: '🧲', kind: 'technique', desc: 'Charged curses are dragged together toward the aim point — harder the more Charge they carry.', cd: 10, ce: 12, branch: 'Charge', tier: 2, req: 'thunderclap', use: () => this.magnetize() }),
      conductor: ability({ name: 'Conductor', icon: '🔗', kind: 'technique', desc: 'Current jumps between every pair of charged curses close to each other, burning them all.', cd: 9, ce: 16, branch: 'Charge', tier: 3, req: 'magnetize', use: () => this.conductor() }),
      overload: ability({ name: 'Overload', icon: '🔋', kind: 'technique', desc: 'Double the Charge in every charged curse — anything pushed past the limit discharges on the spot.', cd: 14, ce: 22, branch: 'Charge', tier: 4, req: ['conductor', 'static_field'], use: () => this.overload() }),
      // ---- Storm: the God of Lightning
      lightning_step: ability({ name: 'Lightning Step', icon: '⚡', kind: 'movement', desc: 'Move as a bolt: blink forward, zapping and charging every curse you pass through.', cd: 5, ce: 6, branch: 'Storm', tier: 1, use: () => this.lightningStep() }),
      reflexes: ability({ name: 'Lightning Reflexes', icon: '🧠', kind: 'buff', desc: 'Electricity races down his nerves: 30% faster attacks and 20% faster movement for 6s.', cd: 18, ce: 12, branch: 'Storm', tier: 2, req: 'lightning_step', use: () => this.reflexes() }),
      electro_shield: ability({ name: 'Electric Barrier', icon: '🛡️', kind: 'defence', desc: 'A crackling field for 4s: you take 40% less damage and every attacker is shocked and charged.', cd: 15, ce: 12, branch: 'Storm', tier: 2, req: 'lightning_step', use: () => this.electroShield() }),
      thunderstorm: ability({ name: 'Thunderstorm', icon: '⛈️', kind: 'technique', desc: 'For 4s lightning rains down around you (each bolt\'s spot flashes first), seeking charged curses.', cd: 16, ce: 26, branch: 'Storm', tier: 3, req: 'reflexes', use: () => this.thunderstorm() }),
      heaven_strike: ability({ name: 'Heaven\'s Strike', icon: '🌩️', kind: 'technique', desc: 'Mark the aim with a ring, then call down a colossal bolt that blasts, charges and stuns everything inside.', cd: 18, ce: 32, branch: 'Storm', tier: 4, req: 'thunderstorm', use: () => this.heavenStrike() }),
    };
    this.passives = {
      conductive_body: passive({ name: 'Conductive Body', icon: '🔌', desc: 'Charge builds 50% faster.', branch: 'Charge', tier: 2, req: 'thunderclap', apply: (pl, k) => { k.chargeMul = 1.5; } }),
      static_skin: passive({ name: 'Static Skin', icon: '✴️', desc: 'Anything that hits you is shocked and charged.', branch: 'Storm', tier: 3, req: 'electro_shield', apply: (pl, k) => { k.staticSkin = true; } }),
      lightning_rod: passive({ name: 'Lightning Rod', icon: '🗼', desc: 'The planted staff lasts 3s longer, reaches 2m further and zaps 30% harder.', branch: 'Staff', tier: 3, req: 'staff_throw', apply: (pl, k) => { k.rodBonus = 3; k.rodR = 7.5; k.rodMul = 1.3; } }),
      seeker: passive({ name: 'Seeker of the Strongest', icon: '🔥', desc: '400 years of looking for a worthy fight: +12% damage and +20 max health.', branch: 'Discharge', tier: 3, req: 'spark_bolt', apply: (pl) => { pl.stats.damage += 0.12; pl.maxHp += 20; pl.hp += 20; } }),
    };
    this.amberT = 0; this.burnT = 0; this.arcT = 0; this.rod = null;
    this.ultimate = { name: 'Mythical Beast Amber', icon: '🐉', use: () => this.amber() };
  }
  // ------------------------------------------------------------ charge & lightning
  charge(e, n) {
    if (e.dead) return;
    e.kCharge = (e.kCharge ?? 0) + n * (1 + this.rank('conduct') * 0.25) * (this.chargeMul ?? 1);
    if (e.kCharge >= 5) { e.kCharge = 0; this.strike(e.pos.clone(), 30 + this.rank('conduct') * 10, 2); this.game.fx.damageNumber(e.pos, 0, { text: 'DISCHARGE', color: '#6ae8ff', crit: true }); }
  }
  // a lightning bolt from the sky onto a point
  strike(at, dmg, R = 1.6) {
    const g = this.game, p = this.p;
    const gy = g.world.groundBelow(at.x, at.z, at.y + 2); const floor = isFinite(gy) ? gy : at.y;
    const ground = new THREE.Vector3(at.x, floor + 0.1, at.z);
    zap(g, ground.clone().setY(floor + 10), ground, VOLT, 0.4, 7);
    g.particles.burst(ground.clone().setY(floor + 0.4), { count: 18, color: VOLT, speed: 8, up: 1, life: 0.3, size: 0.08, shape: 3, intensity: 4 });
    g.fx.rings.spawn(ground, { color: VOLT, r0: 0.3, r1: R + 0.8, dur: 0.25, thick: 0.15 });
    g.lights.flash(ground.clone().setY(floor + 2), VOLT, 14, 10, 0.18);
    if (dmg > 0) g.combat.aoe(ground, R, dmg * (1 + this.rank('conduct') * 0.1), p, { stagger: 0.5, knock: 2, blocks: false, color: '#6ae8ff' });
    g.audio?.noise({ dur: 0.25, gain: 0.35, type: 'highpass', freq: 2500, sweep: 600, rev: 0.3 });
    g.audio?.tone({ freq: 120, to: 40, dur: 0.3, gain: 0.25, type: 'sawtooth', filter: 800 });
    g.shake(0.12);
  }
  onMeleeHit(e, step) {
    if (this.amberT > 0) { this.strike(e.pos.clone(), 16, 1.8); return; }
    this.charge(e, step.ring ? 2 : 1);
    if (Math.random() < 0.5) zap(this.game, this.handPos(), e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.18, 3);
  }
  // ------------------------------------------------------------ techniques
  discharge() {
    const g = this.game, p = this.p;
    this.cast(0.25);
    const from = this.handPos();
    let first = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    if (!first) { const cone = g.combat.query(p.pos, p.aimDir, 12, 0.45); cone.sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)); first = cone[0] ?? g.nearestEnemy(p.aimPoint, 3); }
    if (!first) { zap(g, from, from.clone().addScaledVector(p.aimDir, 8), VOLT, 0.25, 6); g.audio?.whoosh(0.5); return; }
    const hops = 2 + this.rank('chain');
    const hit = new Set();
    let cur = first, src = from;
    for (let i = 0; i <= hops && cur; i++) {
      const at = cur.pos.clone().setY(cur.pos.y + cur.height * 0.6);
      zap(g, src, at, i ? DEEP : VOLT, i ? 0.22 : 0.3, 5);
      g.combat.damageEnemy(cur, (14 - i * 2) * (this.amberT > 0 ? 1.6 : 1), p, { stagger: 0.3, knock: tmp.subVectors(cur.pos, p.pos).setY(0).normalize().multiplyScalar(2) });
      g.fx.hitSpark(at, null, { color: VOLT });
      this.charge(cur, 1);
      hit.add(cur); src = at;
      // next hop: prefer charged curses within reach
      let best = null, bs = -1;
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || e.isDummy && !cur.isDummy) continue;
        const d = e.pos.distanceTo(cur.pos); if (d > 6.5) continue;
        const s = (e.kCharge ?? 0) * 2 + (6.5 - d);
        if (s > bs) { bs = s; best = e; }
      }
      cur = best;
    }
    g.audio?.noise({ dur: 0.15, gain: 0.3, type: 'highpass', freq: 3000, sweep: 1200 });
  }
  staffThrow() {
    const g = this.game, p = this.p;
    if (this.rod) { g.toast?.('The staff is still planted'); g.audio?.ui('back'); return false; }
    const w = p.rig.extras.weapon;
    p.action = { type: 'attack', step: { style: 'throw', strike: 0.5, windup: 0.3 }, style: 'throw', dur: 0.4, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0.3 };
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const dir = sure ? tmp.subVectors(sure.pos, p.pos).setY(0).normalize().clone() : p.aimDir.clone();
    p.facing = Math.atan2(dir.x, dir.z);
    const pr = g.projectiles.fire({ pos: p.pos.clone().setY(p.pos.y + 1.3), vel: dir.multiplyScalar(30), team: 'player', shape: 'arrow', color: 0x7a90b0, emissive: 1.2, scale: 1.5, radius: 0.6, life: 0.45, pierce: true, light: 4,
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: VOLT, speed: 1.5, life: 0.25, size: 0.08, shape: 3 }),
      onHit: (e, q) => { g.combat.damageEnemy(e, 20 + this.rank('staff') * 6, p, { knock: q.vel.clone().setLength(5), stagger: 0.5 }); this.charge(e, 2); },
      onExpire: (q) => this.plantRod(q.pos.clone()) });
    if (!pr) return false;
    if (w) w.visible = false;
    g.audio?.whoosh(1.2);
  }
  plantRod(at) {
    const g = this.game, p = this.p;
    const gy = g.world.groundBelow(at.x, at.z, at.y + 1); at.y = isFinite(gy) ? gy : p.pos.y;
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), new THREE.MeshStandardNodeMaterial({ color: 0x2a3040, metalness: 0.6, roughness: 0.4 }));
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), new THREE.MeshStandardNodeMaterial({ color: VOLT, emissive: VOLT, emissiveIntensity: 3 }));
    pole.position.y = 1.4; tip.position.y = 3.05; pole.castShadow = true;
    grp.add(pole, tip); grp.position.copy(at); grp.rotation.z = 0.12;
    g.scene.add(grp);
    const light = g.lights.attach(tip, VOLT, 6, 8, { offsetY: 0, priority: 3 });
    this.strike(at.clone(), 20, 2);
    this.rod = { grp, light, t: 5 + this.rank('staff') * 1.5 + (this.rodBonus ?? 0), tick: 0.2, top: at.clone().setY(at.y + 3) };
  }
  removeRod() {
    if (!this.rod) return;
    const g = this.game;
    g.scene.remove(this.rod.grp); g.lights.remove(this.rod.light);
    g.fx.blinkPuff(this.rod.grp.position, VOLT);
    this.rod = null;
    const w = this.p.rig.extras.weapon; if (w) w.visible = true;
  }
  thunderclap() {
    const g = this.game, p = this.p, rk = this.rank('clap');
    const sure = g.domainSys?.sureHit(p);
    const list = g.enemies.filter((e) => !e.dead && (e.kCharge ?? 0) > 0 && (sure ? g.domainSys.inside(e.pos) : e.pos.distanceTo(p.pos) < 16));
    if (!list.length) { g.toast?.('No charged curses'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true, { type: 'raise' });
    g.fx.flash(0x9ad8ff, 0.25, 0.15);
    list.forEach((e, i) => setTimeout(() => {
      if (e.dead) return;
      const stacks = Math.max(1, Math.round(e.kCharge ?? 1)); e.kCharge = 0;
      this.strike(e.pos.clone(), 0, 1.2);
      g.combat.damageEnemy(e, (16 + rk * 6) * stacks, p, { stagger: 0.8, unblockable: true, color: '#6ae8ff' });
    }, i * 60));
    g.shake(0.35); g.fx.chroma(0.6);
  }
  // Full output: every bit of stored electricity leaves his body at once.
  fullDischarge() {
    const g = this.game, p = this.p, rk = this.rank('conduct');
    const R = 7.5;
    this.cast(0.5, true, { type: 'raise' });
    g.audio?.charge(0.3, 1.6);
    setTimeout(() => {
      const body = p.pos.clone().setY(p.pos.y + 1.2);
      g.fx.flash(0xc0f0ff, 0.35, 0.2); g.fx.chroma(0.8);
      g.fx.shockwave(p.pos, VOLT, R); g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: WHITE, r0: 0.5, r1: R, dur: 0.35, thick: 0.15 });
      g.lights.flash(body, VOLT, 18, R + 4, 0.3, { priority: 6 });
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; zap(g, body, body.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.8, (Math.random() - 0.5) * 1.5, Math.sin(a) * R * 0.8)), i % 2 ? VOLT : WHITE, 0.2, 4); }
      for (const e of g.combat.query(p.pos, tmp.set(0, 0, 1), R, Math.PI)) {
        const stacks = Math.round(e.kCharge ?? 0); e.kCharge = 0;
        zap(g, body, e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.3, 5);
        g.combat.damageEnemy(e, (26 + rk * 6) * (1 + stacks * 0.35) * (this.amberT > 0 ? 1.5 : 1), p, { stagger: 0.9, knock: tmp2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), color: '#6ae8ff' });
      }
      g.shake(0.45); g.hitStop(0.05);
      g.audio?.noise({ dur: 0.5, gain: 0.5, type: 'highpass', freq: 2000, sweep: 400, rev: 0.4 }); g.audio?.blackFlash();
    }, 260);
  }
  // ------------------------------------------------------------ library abilities
  incoming(amount, src) {
    // Static Skin: whatever touches him gets shocked
    const g = this.game, p = this.p;
    if (this.staticSkin && src && src.pos && !src.dead && !src.isPlayer && g.enemies.includes(src) && g.time - (this.skinT ?? -9) > 0.3) {
      this.skinT = g.time;
      zap(g, p.pos.clone().setY(p.pos.y + 1.2), src.pos.clone().setY(src.pos.y + (src.height ?? 1.5) * 0.6), VOLT, 0.22, 4);
      this.hit(src, 6, { stagger: 0.3, ceGain: 0 }); this.charge(src, 1);
    }
    return amount;
  }
  chargedFoes(R = 16) { const p = this.p; return this.game.enemies.filter((e) => !e.dead && (e.kCharge ?? 0) > 0 && e.pos.distanceTo(p.pos) < R); }
  // ---- Discharge
  sparkBolt() {
    const g = this.game, p = this.p;
    this.cast(0.22);
    this.shoot({ speed: 42, shape: 'arrow', color: VOLT, emissive: 3, scale: 0.7, radius: 0.35, life: 0.45, light: 2,
      trail: (q) => { if (Math.random() < 0.7) g.particles.burst(q.pos, { count: 1, color: WHITE, speed: 1, life: 0.15, size: 0.06, shape: 3 }); },
      onHit: (e, q) => { this.hit(e, 12 + this.rank('conduct') * 2, { stagger: 0.25, knock: q.vel.clone().setY(0).setLength(1.5) }); this.charge(e, 2); g.fx.hitSpark(q.pos, null, { color: VOLT }); } });
    g.audio?.noise({ dur: 0.1, gain: 0.25, type: 'highpass', freq: 3500, sweep: 1500 });
  }
  ballLightning() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    let done = false;
    const pop = (q) => { if (done) return; done = true; this.strike(q.pos.clone(), 22, 2.2); };
    this.shoot({ speed: 9, color: VOLT, emissive: 3.5, scale: 2.2, radius: 0.6, life: 1.7, light: 5, ghost: true, pierce: true, zt: 0,
      trail: (q, dt) => {
        if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color: Math.random() < 0.5 ? VOLT : WHITE, speed: 2.5, life: 0.2, size: 0.07, shape: 3 });
        q.zt -= dt ?? 0.016;
        if (q.zt > 0) return;
        q.zt = 0.25;
        for (const e of this.foes(q.pos, 3.5)) { zap(g, q.pos, e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.18, 4); this.hit(e, 7, { stagger: 0.2, ceGain: 1 }); this.charge(e, 1); }
        if (Math.random() < 0.5) zap(g, q.pos, q.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3)), WHITE, 0.1, 3);
      },
      onExpire: (q) => pop(q) });
    g.audio?.charge(0.3, 1.8);
  }
  emWave() {
    const g = this.game, p = this.p, R = 9;
    this.cast(0.35, true);
    const face = this.aimAngle();
    for (let i = 0; i < 5; i++) this.after(i * 0.04, () => g.fx.slashArc(p.pos, face, i % 2 ? WHITE : VOLT, 1.8 + i * 1.8, 0.8, 0.25));
    const list = this.foes(p.pos, R, this.fwd(), 0.8);
    for (const e of list) {
      this.hit(e, 10 + this.rank('conduct') * 3, { stagger: 0.5 }); this.charge(e, 2);
      if (!e.isBoss) this.stun(e, 0.6); else e.cancelAttack?.();
      g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height + 0.2), 0, { text: `⚡${Math.round(e.kCharge ?? 0)}`, color: '#6ae8ff' });
    }
    g.fx.chroma(0.4); g.audio?.noise({ dur: 0.35, gain: 0.3, type: 'bandpass', freq: 900, sweep: 3000, q: 3 });
  }
  lightningBeam() {
    const g = this.game, p = this.p;
    this.cast(0.85, true, { lock: true, moveScale: 0 });
    g.audio?.charge(0.5, 1.6);
    this.during(0.5, () => { const h = this.handPos(); zap(g, h.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2.5)), h, Math.random() < 0.5 ? VOLT : WHITE, 0.12, 3); });
    this.after(0.5, () => { if (p.dead) return; this.beam(); for (const e of this.foes(p.pos, 22, this.fwd(), 0.12)) this.charge(e, 1); g.fx.flash(0xc0f0ff, 0.2, 0.12); });
  }
  // ---- Staff
  staffSweep() {
    const g = this.game, p = this.p, R = 3.6;
    this.pose('spin', 0.42);
    let n = 0;
    for (const e of this.foes(p.pos, R)) {
      this.hit(e, 18 + this.rank('staff') * 5, { melee: true, stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(e.isBoss ? 3 : 9) });
      this.charge(e, 1); n++;
      zap(g, p.pos.clone().setY(p.pos.y + 1.1), e.pos.clone().setY(e.pos.y + e.height * 0.5), VOLT, 0.15, 3);
    }
    g.fx.slashArc(p.pos, p.facing, VOLT, R, Math.PI, 0.25); g.fx.slashArc(p.pos, p.facing + Math.PI, WHITE, R * 0.8, Math.PI, 0.2);
    if (n) { g.hitStop(0.04); g.audio?.impact(1.1); } else g.audio?.swing(2);
  }
  staffThrust() {
    const g = this.game, p = this.p, dir = this.fwd(), L = 6.5;
    this.pose('punch', 0.28); p.facing = Math.atan2(dir.x, dir.z);
    const from = p.pos.clone().setY(p.pos.y + 1.15);
    g.fx.slashLine(from, dir, L, 0x7a90b0, 0.22, 0.18, 0); g.fx.slashLine(from, dir, L, VOLT, 0.1, 0.2, Math.PI / 2);
    this.line(p.pos, dir, L, 0.7, (e) => { this.hit(e, 16 + this.rank('staff') * 4, { melee: true, stagger: 0.4, knock: dir.clone().multiplyScalar(4) }); this.charge(e, 1); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), dir, { color: VOLT }); });
    g.audio?.swing(1);
  }
  poleVault() {
    const g = this.game, p = this.p;
    const to = this.aimGround(9);
    const d = tmp.subVectors(to, p.pos).setY(0); let dist = d.length();
    if (dist < 3) { d.copy(this.fwd()); dist = 4; }
    d.normalize();
    p.vel.y = Math.max(p.vel.y, 9);
    this.dash(d.clone(), dist, 0.42, { color: VOLT, iframes: 0.5, onEnd: () => {
      this.strike(p.pos.clone(), 30 + this.rank('staff') * 6, 2.6);
      for (const e of this.foes(p.pos, 2.6)) this.charge(e, 1);
      g.fx.shockwave(p.pos, VOLT, 3);
    } });
    g.audio?.whoosh(1.2);
  }
  staffFlurry() {
    const g = this.game, p = this.p;
    this.cast(0.75, true, { lock: true, moveScale: 0.3 });
    for (let i = 0; i < 8; i++) this.after(i * 0.08, () => {
      if (p.dead) return;
      const dir = this.fwd(); p.facing = Math.atan2(dir.x, dir.z);
      const from = p.pos.clone().setY(p.pos.y + 0.9 + Math.random() * 0.5);
      const jd = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3)).normalize();
      g.fx.slashLine(from, jd, 3.6, i % 2 ? VOLT : 0x9ab0d0, 0.16, 0.1, Math.random() * 3);
      const list = this.foes(p.pos, 3.6, dir, 0.6);
      for (const e of list) { this.hit(e, 7 + this.rank('staff') * 2, { melee: true, stagger: 0.25, knock: dir.clone().multiplyScalar(i === 7 ? 8 : 0.8) }); this.charge(e, 0.5); }
      if (list.length) { g.audio?.impact(0.7); g.hitStop(0.015); } else g.audio?.swing(i % 3);
    });
  }
  // ---- Charge
  staticField() {
    const g = this.game, p = this.p, R = 4;
    const c = this.aimGround(10);
    this.cast(0.35);
    zap(g, this.handPos(), c.clone().setY(c.y + 0.2), VOLT, 0.25, 5);
    this.zone(c, R, 5, 0.5, (list) => {
      for (const e of list) { this.hit(e, 4 + this.rank('conduct'), { stagger: 0.15, ceGain: 1 }); this.charge(e, 1); zap(g, c.clone().setY(c.y + 0.3), e.pos.clone().setY(e.pos.y + e.height * 0.5), VOLT, 0.14, 3); }
      const a = Math.random() * Math.PI * 2, r = Math.random() * R;
      zap(g, c.clone().setY(c.y + 0.2), c.clone().add(new THREE.Vector3(Math.cos(a) * r, 0.2, Math.sin(a) * r)), WHITE, 0.1, 3);
    }, { color: VOLT });
    g.audio?.noise({ dur: 0.3, gain: 0.2, type: 'highpass', freq: 2500, sweep: 800 });
  }
  magnetize() {
    const g = this.game, p = this.p, list = this.chargedFoes();
    if (!list.length) { g.toast?.('No charged curses'); g.audio?.ui('back'); return false; }
    const c = this.aimGround(10);
    this.cast(0.4, true);
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: VOLT, r0: 4, r1: 0.4, dur: 0.4, thick: 0.15 });
    for (const e of list) {
      const to = tmp2.subVectors(c, e.pos).setY(0); const d = to.length();
      if (!e.isBoss && d > 0.5) e.knock?.addScaledVector(to.normalize(), Math.min(18, d * (1.6 + (e.kCharge ?? 0) * 0.3)));
      this.hit(e, 6 * Math.max(1, Math.round(e.kCharge ?? 1)), { stagger: 0.6, color: '#6ae8ff' });
      zap(g, c.clone().setY(c.y + 1), e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.2, 5);
    }
    g.audio?.noise({ dur: 0.4, gain: 0.3, type: 'bandpass', freq: 400, sweep: 1600, q: 2 });
  }
  conductor() {
    const g = this.game, p = this.p, list = this.chargedFoes();
    if (!list.length) { g.toast?.('No charged curses'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true, { type: 'raise' });
    const dmg = 10 + this.rank('conduct') * 3, burnt = new Map();
    const burn = (e) => burnt.set(e, (burnt.get(e) ?? 0) + 1);
    let links = 0;
    for (let i = 0; i < list.length && links < 24; i++) for (let j = i + 1; j < list.length && links < 24; j++) {
      const a = list[i], b = list[j];
      if (a.pos.distanceTo(b.pos) > 9) continue;
      zap(g, a.pos.clone().setY(a.pos.y + a.height * 0.6), b.pos.clone().setY(b.pos.y + b.height * 0.6), links % 2 ? WHITE : VOLT, 0.22, 5);
      burn(a); burn(b); links++;
    }
    if (!links) { zap(g, p.pos.clone().setY(p.pos.y + 1.2), list[0].pos.clone().setY(list[0].pos.y + 1), VOLT, 0.25, 5); burn(list[0]); }
    for (const [e, n] of burnt) this.hit(e, dmg * Math.min(4, n) * (1 + (e.kCharge ?? 0) * 0.1), { stagger: 0.5, unblockable: true, color: '#6ae8ff' });
    g.fx.chroma(0.5); g.shake(0.25);
    g.audio?.noise({ dur: 0.3, gain: 0.35, type: 'highpass', freq: 2500, sweep: 900, rev: 0.3 });
  }
  overload() {
    const g = this.game, p = this.p, list = this.chargedFoes();
    if (!list.length) { g.toast?.('No charged curses'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true, { type: 'raise' });
    g.fx.flash(0x9ad8ff, 0.2, 0.12);
    list.forEach((e, i) => this.after(i * 0.05, () => {
      if (e.dead) return;
      zap(g, p.pos.clone().setY(p.pos.y + 1.4), e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.2, 5);
      this.hit(e, 8, { stagger: 0.4, ceGain: 1 });
      this.charge(e, Math.max(1, (e.kCharge ?? 0) / ((1 + this.rank('conduct') * 0.25) * (this.chargeMul ?? 1))));
    }));
    g.audio?.charge(0.3, 2);
  }
  // ---- Storm
  lightningStep() {
    const g = this.game, p = this.p, dir = this.fwd();
    const from = p.pos.clone();
    for (const d of [8, 6, 4]) {
      if (this.blink(from.clone().addScaledVector(dir, d), { color: VOLT, quiet: true, iframes: 0.35 })) {
        zap(g, from.clone().setY(from.y + 1), p.pos.clone().setY(p.pos.y + 1), WHITE, 0.4, 6);
        zap(g, from.clone().setY(from.y + 1), p.pos.clone().setY(p.pos.y + 1), VOLT, 0.25, 6);
        this.line(from, dir, d, 1, (e) => { this.hit(e, 14 + this.rank('conduct') * 3, { stagger: 0.4 }); this.charge(e, 1); });
        g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), VOLT, 8, 8, 0.15);
        g.audio?.noise({ dur: 0.2, gain: 0.3, type: 'highpass', freq: 3000, sweep: 1000 });
        return;
      }
    }
    g.audio?.ui('back'); return false;
  }
  reflexes() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    this.statBuff('reflexes', 6, { attackSpeed: 0.3, speed: 0.2 }, { onTick: () => { if (Math.random() < 0.15) zap(g, p.pos.clone().setY(p.pos.y + 0.4 + Math.random() * 1.4), p.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.5 + Math.random() * 1.4, (Math.random() - 0.5) * 1.6)), VOLT, 0.08, 2); } });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: VOLT, r0: 0.4, r1: 3, dur: 0.35, thick: 0.15 });
    g.toast?.('🧠 Lightning Reflexes');
    g.audio?.noise({ dur: 0.25, gain: 0.25, type: 'highpass', freq: 3000, sweep: 800 });
  }
  electroShield() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    this.buff('electro_shield', 4, {
      onTick: () => {
        if (Math.random() < 0.4) { const a = Math.random() * Math.PI * 2, b = a + 0.8 + Math.random(); zap(g, p.pos.clone().add(new THREE.Vector3(Math.cos(a) * 1.2, 0.3 + Math.random() * 1.6, Math.sin(a) * 1.2)), p.pos.clone().add(new THREE.Vector3(Math.cos(b) * 1.2, 0.3 + Math.random() * 1.6, Math.sin(b) * 1.2)), VOLT, 0.1, 3); }
      },
      incoming: (amt, src) => {
        if (src && src.pos && !src.dead && !src.isPlayer && g.enemies.includes(src)) { zap(g, p.pos.clone().setY(p.pos.y + 1.2), src.pos.clone().setY(src.pos.y + (src.height ?? 1.5) * 0.6), WHITE, 0.25, 4); this.hit(src, 8, { stagger: 0.5, ceGain: 0 }); this.charge(src, 2); }
        return amt * 0.6;
      } });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { color: VOLT, r0: 0.4, r1: 1.6, dur: 0.3, thick: 0.15 });
    g.audio?.noise({ dur: 0.4, gain: 0.25, type: 'highpass', freq: 2500, sweep: 500 });
  }
  thunderstorm() {
    const g = this.game, p = this.p;
    this.cast(0.45, true, { type: 'raise' });
    g.fx.flash(0x203040, 0.25, 0.3);
    let acc = 0.2;
    this.during(4, (t, dt) => {
      if (p.dead) return false;
      acc -= dt; if (acc > 0) return; acc = 0.3;
      const charged = this.chargedFoes(10);
      let at;
      if (charged.length && Math.random() < 0.7) at = charged[Math.floor(Math.random() * charged.length)].pos.clone();
      else { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 7; at = new THREE.Vector3(p.pos.x + Math.cos(a) * r, p.pos.y, p.pos.z + Math.sin(a) * r); }
      at.y = this.groundAt(at.x, at.z, p.pos.y);
      g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: VOLT, r0: 2, r1: 0.3, dur: 0.22, thick: 0.15 });
      this.after(0.22, () => this.strike(at, 22 + this.rank('conduct') * 4, 1.8));
    });
  }
  heavenStrike() {
    const g = this.game, p = this.p, R = 4.2;
    const c = this.aimGround(12);
    this.cast(0.6, true, { type: 'raise', lock: true });
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: VOLT, r0: R, r1: R * 0.97, dur: 0.9, thick: 0.12 });
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: WHITE, r0: R, r1: 0.3, dur: 0.9, thick: 0.2 });
    g.audio?.charge(0.8, 1.2);
    this.during(0.9, () => { if (Math.random() < 0.3) zap(g, c.clone().setY(c.y + 14), c.clone().add(new THREE.Vector3((Math.random() - 0.5) * R, 6 + Math.random() * 4, (Math.random() - 0.5) * R)), DEEP, 0.15, 4); });
    this.after(0.9, () => {
      zap(g, c.clone().setY(c.y + 30), c.clone().setY(c.y + 0.2), WHITE, 1.4, 10);
      zap(g, c.clone().setY(c.y + 30), c.clone().setY(c.y + 0.2), VOLT, 0.8, 8);
      this.blast(c, R, 110 + this.rank('conduct') * 20, { color: VOLT, knock: 9, stagger: 1 });
      for (const e of this.foes(c, R)) { this.charge(e, 2); this.stun(e, 0.8); }
      g.lights.flash(c.clone().setY(c.y + 3), VOLT, 30, R + 10, 0.4, { priority: 7 });
      g.fx.flash(WHITE, 0.45, 0.2); g.fx.chroma(1.2); g.hitStop(0.08);
      g.audio?.blackFlash(); g.audio?.noise({ dur: 0.6, gain: 0.5, type: 'highpass', freq: 1800, sweep: 400, rev: 0.4 });
    });
  }
  // In Mythical Beast Amber, Discharge becomes a beam of pure electricity.
  beam() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const dir = p.aimDir.clone().setY(0).normalize(); p.facing = Math.atan2(dir.x, dir.z);
    const from = p.pos.clone().setY(p.pos.y + 1.3).addScaledVector(dir, 0.6), L = 22, W = 1.1;
    g.fx.slashLine(from, dir, L, DEEP, W * 2.2, 0.3, 0); g.fx.slashLine(from, dir, L, VOLT, W * 1.3, 0.26, 0); g.fx.slashLine(from, dir, L, WHITE, W * 0.5, 0.2, 0);
    for (let s = 2; s < L; s += 3) zap(g, from.clone().addScaledVector(dir, s - 2), from.clone().addScaledVector(dir, s + 1), WHITE, 0.15, 3);
    g.lights.flash(from.clone().addScaledVector(dir, 4), VOLT, 16, 14, 0.2);
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, p.pos); const along = tmp.dot(dir);
      if (along < 0 || along > L || Math.abs(tmp.x * dir.z - tmp.z * dir.x) > W + e.radius) continue;
      g.combat.damageEnemy(e, 45, p, { stagger: 0.8, unblockable: true, knock: dir.clone().multiplyScalar(6), color: '#e8fbff' });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), dir, { color: VOLT, big: true });
    }
    for (let s = 1; s < L; s += 1.5) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y), dir, 1, Math.PI, 30, p);
    g.shake(0.3); g.audio?.energy('red');
  }
  // Ultimate: Mythical Beast Amber — Kashimo's one-time technique. His body is
  // rebuilt to turn every phenomenon of his electric cursed energy into
  // reality: a blinding electromagnetic burst, then a short reign of pure
  // lightning... and a body that breaks down when it ends.
  amber() {
    const g = this.game, p = this.p;
    if (this.amberT > 0 || this.burnT > 0) { g.toast?.('His body is still breaking down'); g.audio?.ui('back'); return false; }
    const rk = this.rank('amber');
    p.action = { type: 'sign', dur: 1.1, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes ?? 0, 1.6);
    g.slowMo(1.2, 0.2); g.fx.dimTarget = 0.65;
    g.toast?.('MYTHICAL BEAST AMBER', 'domain');
    g.audio?.charge(1.0, 1.2);
    // lightning gathers onto him from the sky
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      if (Math.random() < 0.5) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 4; zap(g, p.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 8, Math.sin(a) * r)), p.pos.clone().setY(p.pos.y + 1.2), Math.random() < 0.5 ? VOLT : WHITE, 0.25, 6); }
      return t < 0.9;
    });
    this.amberTimer = setTimeout(() => {
      this.amberTimer = null;
      if (p.action?.type === 'sign') p.action = null;
      g.fx.dimTarget = 0;
      this.amberT = 12 + rk * 2;
      this.boost = { as: 1.6, mm: 0.6, tm: 0.5 };
      p.stats.attackSpeed *= this.boost.as; p.stats.meleeMult += this.boost.mm; p.stats.techMult += this.boost.tm; this.speedMul = 1.6;
      // the transformation's electromagnetic burst
      const c = p.pos.clone(), R = 14;
      g.fx.flash(WHITE, 0.9, 0.5); g.fx.screenWave(c.clone().setY(c.y + 1), 2, 0.9); g.fx.chroma(2); g.fx.blackFlash(0.15);
      g.shake(1); g.hitStop(0.12);
      zap(g, c.clone().setY(c.y + 30), c.clone().setY(c.y + 0.2), WHITE, 1.2, 10);
      zap(g, c.clone().setY(c.y + 30), c.clone().setY(c.y + 0.2), VOLT, 0.7, 8);
      for (let i = 0; i < 4; i++) g.fx.rings.spawn(tmp.set(c.x, c.y + 0.1 + i * 0.5, c.z), { color: i % 2 ? WHITE : VOLT, r0: 0.5, r1: R * (0.5 + i * 0.17), dur: 0.5 + i * 0.12, thick: 0.15 });
      g.lights.flash(c.clone().setY(c.y + 3), VOLT, 40, R + 10, 0.7, { priority: 9 });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 3 + Math.random() * (R - 4); this.strike(c.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)), 0, 2); }
      for (const e of g.combat.query(c, tmp.set(0, 0, 1), R, Math.PI)) {
        zap(g, c.clone().setY(c.y + 1.2), e.pos.clone().setY(e.pos.y + e.height * 0.6), WHITE, 0.35, 6);
        g.combat.damageEnemy(e, 90 + rk * 20 + (e.isBoss ? e.maxHp * 0.06 : 0), p, { stagger: 1.2, unblockable: true, knock: tmp2.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(12), color: '#e8fbff' });
        this.charge(e, 3);
      }
      g.audio?.blackFlash(); g.audio?.energy('explode');
    }, 1000);
  }
  endAmber() {
    const g = this.game, p = this.p;
    p.stats.attackSpeed /= this.boost.as; p.stats.meleeMult -= this.boost.mm; p.stats.techMult -= this.boost.tm; this.speedMul = 1;
    // the transformation destroys the body that hosts it
    this.burnT = 4; this.burnLeft = p.hp * (0.7 - this.rank('amber') * 0.1);
    p.slowT = 6;
    g.toast?.('Mythical Beast Amber fades — his body breaks down (no techniques for 4s)', 'big');
    g.fx.flash(0x101820, 0.5, 0.35);
    g.audio?.hurt();
  }
  // a breaking-down body cannot channel techniques
  canCast(s) { if (this.burnT > 0 && s !== this.ultimate) return false; return super.canCast(s); }
  tick(dt) {
    const g = this.game, p = this.p;
    const mat = p.rig.material.userData;
    if (this.amberT > 0) {
      this.amberT -= dt;
      mat.emitMask.value = 2.2 + Math.random() * 0.8;
      p.rig.setGlow?.(Math.random() < 0.2 ? 0x8ae8ff : 0x2a6a8a);
      p.heroLight.color.setHex(VOLT); p.heroLight.intensity = 3.5 + Math.random() * 2;
      for (let i = 0; i < 3; i++) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.9, p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.25, 0.8, 2.6, 3.2, 0.08, 0, 2, 0.1, 3);
      // arcs leap from his body to nearby curses on their own
      this.arcT -= dt;
      if (this.arcT <= 0) {
        this.arcT = 0.4;
        const e = g.nearestEnemy(p.pos, 8);
        const body = p.pos.clone().setY(p.pos.y + 1.2);
        if (e) { zap(g, body, e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.2, 4); g.combat.damageEnemy(e, 8, p, { stagger: 0.2, ceGain: 0 }); }
        else zap(g, body, body.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random(), (Math.random() - 0.5) * 3)), WHITE, 0.12, 3);
      }
      if (this.amberT <= 0) this.endAmber();
    } else if (this.burnT > 0) {
      this.burnT -= dt;
      const loss = Math.min(this.burnLeft * dt / 4, Math.max(0, p.hp - 1));
      p.hp -= loss;
      if (Math.random() < 0.4) g.particles.smoke.emit(p.pos.x + (Math.random() - 0.5) * 0.6, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.6, 0, 1, 0, 0.8, 0.12, 0.12, 0.14, 0.25, -0.5, 1, 2, 0);
      if (Math.random() < 0.15) zap(g, p.pos.clone().setY(p.pos.y + 1), p.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2)), 0x3a6a8a, 0.1, 2);
      if (Math.random() < dt * 3) g.fx.damageNumber(p.pos, loss, { color: '#7ab0c8', text: '⚡ breakdown' });
      mat.emitMask.value = 0.4; p.rig.setGlow?.(0x000000); p.heroLight.color.setHex(0xffe8d0); p.heroLight.intensity = 1.6;
    }
    // planted staff: a lightning rod
    const rod = this.rod;
    if (rod) {
      rod.t -= dt; rod.tick -= dt;
      if (rod.tick <= 0) {
        rod.tick = 0.4;
        for (const e of g.enemies) if (!e.dead && !e.isDummy && e.pos.distanceTo(rod.grp.position) < (this.rodR ?? 5.5)) {
          zap(g, rod.top, e.pos.clone().setY(e.pos.y + e.height * 0.6), VOLT, 0.2, 4);
          g.combat.damageEnemy(e, 8 * (this.rodMul ?? 1), p, { stagger: 0.25, ceGain: 1 });
          this.charge(e, 1);
        }
        if (Math.random() < 0.5) zap(g, rod.top, rod.top.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2)), WHITE, 0.1, 3);
      }
      if (rod.t <= 0) this.removeRod();
    }
    // charged curses crackle
    if (Math.random() < 0.35) for (const e of g.enemies) if (!e.dead && e.kCharge > 0 && Math.random() < 0.35) g.particles.glow.emit(e.pos.x + (Math.random() - 0.5) * 0.8, e.pos.y + Math.random() * e.height, e.pos.z + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, 0.2, 0.8, 2.4, 3, 0.05 + e.kCharge * 0.015, 0, 2, 0.2, 3);
  }
  dispose() { super.dispose(); this.removeRod(); if (this.amberTimer) { clearTimeout(this.amberTimer); this.amberTimer = null; } this.game.fx.dimTarget = 0; this.amberT = 0; this.burnT = 0; this.speedMul = 1; }
}
registerKit('kashimo', KashimoKit, KASHIMO_SKILLS);
