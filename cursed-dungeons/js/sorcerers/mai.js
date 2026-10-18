// Mai Zenin-style kit — Construction (and firearms). 21 abilities on the
// technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB           pistol-whip and kick combo.
//   Revolver      Revolver (start, RMB: six rounds reloading one at a time), Quick
//                 Shot, Fan the Hammer, Speed Loader, Dead Eye
//   Trick Shots   Ricochet, Armour-Piercing Round, Split Round, Sniper Rifle (her
//                 Goodwill Event rifle), Overwatch
//   Construction  Construction: Bullet, Blades, Caltrops, Barricade, Cursed Rounds,
//                 The Last Bullet — everything she builds costs her health
//   Zenin         Smoke Cover, Evasive Roll, Pistol Whip, Flash Grenade, Zenin Pride
//   Talismans     Steady Hand, Extended Cylinder, Hardened Body, Kyoto Sharpshooter
//   F    Ultimate — Construction: Special Bullet. Mai has no Domain Expansion;
//        her Construction can build only one bullet at a time and it takes a
//        toll on her body (it costs HP). Fired when the opponent thinks she is
//        out of rounds (empty revolver) it becomes the canon "seventh bullet"
//        and hits even harder.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const BRASS = 0xffd27a, SMOKE = 0x9a9aa4, CONSTRUCT = 0x9ae8ff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
// damage that ignores a curse's armour
const pierceArmor = (e, dmg) => dmg / Math.max(0.25, 1 - (e.armor ?? 0));

registerSorcerer('mai', {
  name: 'Mai', technique: 'Construction', rarity: 'common', title: 'Zenin Clan', color: '#d8c08a', ultimate: 'Construction: Special Bullet',
  desc: 'A six-shot revolver, ricochet trick shots and smoke cover — plus Construction: one bullet built from her own body that ends fights.',
});

registerLook('mai', {
  paint: { skinTone: 0xf2d2bc, hair: 0x16181e, hairVolume: true, bob: true, top: 0x1b2030, collar: 0x151822, pants: 0x1b2030, skirt: 0x1b2030, shoes: 0x101010, eye: 0x3a2a20, fringe: 3, hairSide: 6, hairBack: 6 },
  hair: (m) => [
    { x: 2.5, y: 7.5, z: 3.6, w: 4, h: 4, d: 1.5, rx: 0.15, rz: -0.25, material: m },   // swept fringe over one eye
    { x: -3.6, y: 3, z: 0.5, w: 1.5, h: 3, d: 5, hang: true, material: m, stiff: 45 },
    { x: 3.6, y: 3, z: 0.5, w: 1.5, h: 4, d: 5, hang: true, material: m, stiff: 45 },
    { x: 0, y: 3, z: -3.6, w: 7, h: 3, d: 1.5, hang: true, material: m, stiff: 45 },
  ],
  hairColor: 0x16181e, accent: BRASS,
  cape: null,
  paintExtra(S) {
    // long uniform skirt down to the ankles
    for (const [u, v] of [[0, 16], [16, 48]]) S.rect(u, v + 4, 16, 9, 0x1b2030, 0.06);
    S.rect(20, 29, 8, 1, 0x3a2a1a, 0.05);   // belt with a holster strap
    S.px(26, 29, BRASS);
  },
  props(rig, K) {
    const gun = new THREE.Group();
    const steel = K.mat(0x2a2c32, { metalness: 0.9, roughness: 0.3 }), grip = K.mat(0x5a3a22, { roughness: 0.7 });
    K.box(gun, 1.2, 2.2, 1.4, grip, 0, -1.2, 0.8, 0.3);      // grip
    K.box(gun, 1.7, 1.7, 1.7, steel, 0, -2.8, 0);           // cylinder
    K.box(gun, 0.9, 4.6, 0.9, steel, 0, -5.6, 0);           // barrel (points along the arm)
    K.box(gun, 0.4, 0.6, 0.4, steel, 0, -7.6, -0.6);        // front sight
    rig.handR.add(gun); rig.extras.weapon = gun;
  },
});

export const MAI_SKILLS = [
  { id: 'caliber', name: 'Heavy Caliber', icon: '🔩', desc: 'Revolver rounds deal more damage.', max: 3, req: 'ab:revolver', branch: 'Revolver', tier: 1 },
  { id: 'quickdraw', name: 'Quick Reload', icon: '⏱️', desc: 'Rounds reload faster.', max: 3, req: 'ab:quick_shot', branch: 'Revolver', tier: 2 },
  { id: 'ricochet', name: 'Ricochet', icon: '↯', desc: 'Trick shots bounce more; regular shots gain a bounce at rank 2.', max: 3, req: 'ab:ricochet', branch: 'Trick Shots', tier: 2 },
  { id: 'smoke', name: 'Smoke Screen', icon: '💨', desc: 'Bigger, longer-lasting smoke.', max: 2, req: 'ab:smoke', branch: 'Zenin', tier: 2 },
  { id: 'construct', name: 'Construction', icon: '🔹', desc: 'Construction abilities and the Special Bullet (ultimate) hit harder; its blast grows.', max: 3, req: 'ab:construct_bullet', branch: 'Construction', tier: 2 },
  { id: 'zenin', name: 'Zenin Training', icon: '🥋', desc: '+10% melee damage per rank.', max: 2, branch: 'Zenin', tier: 0 },
];

class MaiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 10, range: 2.5, arc: 1.1, lunge: 6, knock: 3, stop: 0.04, shake: 0.12, trail: BRASS, sparkColor: BRASS },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 10, range: 2.5, arc: 1.1, lunge: 6, knock: 3, stop: 0.04, shake: 0.12, trail: BRASS },
      { style: 'spin', dur: 0.42, windup: 0.3, strike: 0.55, dmg: 17, range: 2.8, arc: Math.PI, lunge: 3, knock: 8, stop: 0.07, shake: 0.25, ring: true, ringColor: BRASS, trail: 0xdddddd },
    ];
    this.p.stats.meleeMult += r('zenin') * 0.1;
    this.gunMul = 1; this.roundMul = 1; this.hpMul = 1; this.sniperMul = 1; this.bounceBonus = 0;
    this.branches = ['Revolver', 'Trick Shots', 'Construction', 'Zenin'];
    this.library = {
      // ---- Revolver
      revolver: ability({ name: 'Revolver', icon: '🔫', kind: 'basic', desc: 'Six rounds, reloading one at a time.', cd: 0.75 - r('quickdraw') * 0.12, ce: 0, branch: 'Revolver', tier: 0, start: true, legacy: 'ranged', use: () => this.revolver(), maxCharges: 6, chargesLeft: 6, gateTime: 0.2 }),
      quick_shot: ability({ name: 'Quick Shot', icon: '🤠', kind: 'basic', desc: 'A hip-fired double tap from a second, hidden pistol — no rounds used.', cd: 1.3, ce: 0, branch: 'Revolver', tier: 1, req: 'revolver', use: () => this.quickShot() }),
      fan_hammer: ability({ name: 'Fan the Hammer', icon: '💥', kind: 'technique', desc: 'Empty whatever is left in the cylinder in one rapid volley.', cd: 10, ce: 16, branch: 'Revolver', tier: 2, legacy: 't3', req: 'quick_shot', use: () => this.fanHammer() }),
      speed_loader: ability({ name: 'Speed Loader', icon: '🔄', kind: 'buff', desc: 'Reload all six rounds at once; for 6s the revolver fires twice as fast.', cd: 16, ce: 8, branch: 'Revolver', tier: 2, req: 'revolver', use: () => this.speedLoader() }),
      dead_eye: ability({ name: 'Dead Eye', icon: '🎯', kind: 'technique', desc: 'Mark up to five curses in front of you, then put a guaranteed critical round in each.', cd: 15, ce: 22, branch: 'Revolver', tier: 4, req: 'fan_hammer', use: () => this.deadEye() }),
      // ---- Trick Shots
      ricochet: ability({ name: 'Ricochet', icon: '↯', kind: 'technique', desc: 'A trick shot that bounces from curse to curse, harder with every bounce.', cd: 4.5, ce: 8, branch: 'Trick Shots', tier: 1, legacy: 't1', use: () => this.trickShot() }),
      piercing_round: ability({ name: 'Armour-Piercing Round', icon: '📍', kind: 'basic', desc: 'A hardened round that passes through every curse in a line and ignores armour.', cd: 2.2, ce: 4, branch: 'Trick Shots', tier: 2, req: 'ricochet', use: () => this.piercingRound() }),
      split_round: ability({ name: 'Split Round', icon: '🎇', kind: 'basic', desc: 'A round that bursts into five fragments when it hits.', cd: 2.6, ce: 4, branch: 'Trick Shots', tier: 3, req: 'ricochet', use: () => this.splitRound() }),
      rifle: ability({ name: 'Sniper Rifle', icon: '🔭', kind: 'technique', desc: 'Shoulder the rifle and aim (a laser line shows the shot), then fire a round that tears through a long line.', cd: 9, ce: 16, branch: 'Trick Shots', tier: 3, req: 'piercing_round', use: () => this.rifle() }),
      overwatch: ability({ name: 'Overwatch', icon: '👁️', kind: 'buff', desc: 'For 6s you shoot any curse that comes within range, twice a second, while you keep moving.', cd: 20, ce: 20, branch: 'Trick Shots', tier: 4, req: 'rifle', use: () => this.overwatch() }),
      // ---- Construction
      construct_bullet: ability({ name: 'Construction: Bullet', icon: '🔹', kind: 'technique', desc: 'Build a cursed round from nothing (4% health) and fire it: it pierces armour and bursts.', cd: 6, ce: 10, branch: 'Construction', tier: 1, use: () => this.constructBullet() }),
      construct_blade: ability({ name: 'Construction: Blades', icon: '🔪', kind: 'basic', desc: 'Construct three small blades and flick them in a fan; they pierce.', cd: 2, ce: 3, branch: 'Construction', tier: 2, req: 'construct_bullet', use: () => this.constructBlades() }),
      caltrops: ability({ name: 'Construction: Caltrops', icon: '📌', kind: 'technique', desc: 'Scatter constructed spikes over the aim area (3% health): curses there are slowed and cut for 6s.', cd: 12, ce: 12, branch: 'Construction', tier: 2, req: 'construct_bullet', use: () => this.caltrops() }),
      barricade: ability({ name: 'Construction: Barricade', icon: '🧱', kind: 'defence', desc: 'Construct a wall in front of you for 5s (5% health): it stops curse projectiles and holds curses back.', cd: 16, ce: 12, branch: 'Construction', tier: 3, req: 'caltrops', use: () => this.barricade() }),
      cursed_rounds: ability({ name: 'Construction: Cursed Rounds', icon: '✴️', kind: 'buff', desc: 'For 8s every revolver round is constructed (6% health): +60% damage and a small burst.', cd: 22, ce: 14, branch: 'Construction', tier: 3, req: 'construct_blade', use: () => this.cursedRounds() }),
      last_bullet: ability({ name: 'Construction: The Last Bullet', icon: '7️⃣', kind: 'technique', desc: 'Build one more round (8% health) and fire it — the fewer rounds left in the cylinder, the harder it hits. Empties the cylinder.', cd: 18, ce: 26, branch: 'Construction', tier: 5, req: 'cursed_rounds', use: () => this.lastBullet() }),
      // ---- Zenin
      smoke: ability({ name: 'Smoke Cover', icon: '💨', kind: 'defence', desc: 'A smoke bomb and a back-step; inside the smoke you are hard to hit and every shot is a critical.', cd: 12, ce: 12, branch: 'Zenin', tier: 1, legacy: 't2', use: () => this.smoke() }),
      evasive_roll: ability({ name: 'Evasive Roll', icon: '🤸', kind: 'movement', desc: 'Roll backwards out of danger and fire a shot at the aim as you come up. Two charges.', cd: 5, ce: 3, branch: 'Zenin', tier: 1, maxCharges: 2, chargesLeft: 2, gateTime: 0.35, use: () => this.evasiveRoll() }),
      pistol_whip: ability({ name: 'Pistol Whip', icon: '🔨', kind: 'basic', desc: 'Crack the revolver butt across the curses in front of you, stunning them.', cd: 2.4, ce: 0, branch: 'Zenin', tier: 2, req: 'evasive_roll', use: () => this.pistolWhip() }),
      flashbang: ability({ name: 'Flash Grenade', icon: '💡', kind: 'technique', desc: 'Toss a flash grenade at the aim: after a moment every curse in the marked circle is stunned.', cd: 14, ce: 14, branch: 'Zenin', tier: 3, req: 'smoke', use: () => this.flashbang() }),
      zenin_pride: ability({ name: 'Zenin Pride', icon: '🏯', kind: 'buff', desc: 'For 8s: +20% critical chance, +15% speed and +15% melee damage. She has something to prove.', cd: 24, ce: 16, branch: 'Zenin', tier: 4, req: 'flashbang', use: () => this.zeninPride() }),
    };
    this.passives = {
      steady_hand: passive({ name: 'Steady Hand', icon: '✋', desc: 'Revolver and pistol rounds deal 20% more damage.', branch: 'Revolver', tier: 2, req: 'quick_shot', apply: (pl, k) => { k.gunMul *= 1.2; } }),
      cylinder: passive({ name: 'Extended Cylinder', icon: '🔫', desc: 'The revolver holds eight rounds.', branch: 'Revolver', tier: 3, req: 'speed_loader', apply: (pl, k) => { const rv = k.library.revolver; rv.maxCharges = 8; rv.chargesLeft = 8; } }),
      hardened: passive({ name: 'Hardened Body', icon: '🩹', desc: 'Construction costs half as much health.', branch: 'Construction', tier: 2, req: 'construct_bullet', apply: (pl, k) => { k.hpMul *= 0.5; } }),
      sharpshooter: passive({ name: 'Kyoto Sharpshooter', icon: '🎯', desc: 'Rifle and armour-piercing rounds hit 25% harder; trick shots bounce once more.', branch: 'Trick Shots', tier: 3, req: 'piercing_round', apply: (pl, k) => { k.sniperMul *= 1.25; k.bounceBonus += 1; } }),
    };
    this.ultimate = { name: 'Construction: Special Bullet', icon: '🔹', use: () => this.special() };
    this.smokeT = 0; this.smokeAt = new THREE.Vector3(); this.smokeR = 0;
  }
  inSmoke(pos = this.p.pos) { return this.smokeT > 0 && Math.hypot(pos.x - this.smokeAt.x, pos.z - this.smokeAt.z) < this.smokeR; }
  incoming(amount) { return this.inSmoke() ? amount * 0.4 : amount; }
  muzzle(from, dir) {
    const g = this.game;
    g.particles.burst(from, { count: 8, color: BRASS, speed: 6, dir: dir.clone().multiplyScalar(1.2), spread: 0.4, life: 0.12, size: 0.12, shape: 1, intensity: 4 });
    g.particles.burst(from, { count: 1, color: 0xfff0c0, speed: 0, life: 0.06, size: 0.9, sizeEnd: 0.3, intensity: 3 });
    g.lights.flash(from, BRASS, 6, 5, 0.08);
  }
  bullet(from, dir, dmg, { bounces = 0, target = null, hitSet = null, color = BRASS, burst = 0 } = {}) {
    const g = this.game, p = this.p;
    const homing = target || (g.domainSys?.sureHit(p) ? g.nearestEnemy(p.aimPoint, 30) : null);
    const hit = hitSet ?? new Set();
    return g.projectiles.fire({ pos: from, vel: dir.clone().multiplyScalar(55), team: 'player', dmg, shape: 'nail', color, emissive: 4, scale: 1.3, life: 0.5, radius: 0.3,
      homing: homing ? 25 : 0, target: homing,
      trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color, speed: 0.1, life: 0.12, size: 0.08, shape: 1 }); },
      onHit: (e, q) => {
        hit.add(e);
        const crit = this.inSmoke() ? true : undefined;
        g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(2), stagger: 0.25, crit });
        g.fx.hitSpark(q.pos, q.vel.clone().normalize(), { color, crit: !!crit });
        if (bounces > 0) this.ricochet(q.pos.clone(), hit, bounces - 1, dmg * 1.15, color);
        if (burst) { g.combat.aoe(q.pos, 1.6, burst, p, { knock: 4, stagger: 0.3 }); g.fx.explosion(q.pos, CONSTRUCT, 1.2); }
      } });
  }
  ricochet(from, hit, left, dmg, color) {
    const g = this.game;
    let best = null, bd = 8;
    for (const e of g.enemies) { if (e.dead || hit.has(e)) continue; const d = e.pos.distanceTo(from); if (d < bd) { bd = d; best = e; } }
    if (!best) return;
    const to = tmp.copy(best.pos).setY(best.pos.y + best.height * 0.55);
    const dir = to.clone().sub(from).normalize();
    g.fx.slashLine(from, dir, Math.min(bd, 1.5), 0xffffff, 0.1, 0.1);
    g.audio?.tone({ freq: 2600, to: 1800, dur: 0.07, gain: 0.06, type: 'square', filter: 6000 });
    this.after(0.04, () => this.bullet(from, dir, dmg, { bounces: left, target: best, hitSet: hit, color }));
  }
  revolver() {
    const g = this.game, p = this.p;
    this.cast(0.2);
    const from = this.handPos(), dir = p.aimDir.clone(), cr = this.buffs.has('cursed_rounds');
    this.bullet(from, dir, (11 + this.rank('caliber') * 4) * this.gunMul * (cr ? 1.6 : 1), { bounces: this.rank('ricochet') >= 2 ? 1 : 0, color: cr ? CONSTRUCT : BRASS, burst: cr ? 10 + this.rank('construct') * 4 : 0 });
    this.muzzle(from, dir);
    g.audio?.noise({ dur: 0.12, gain: 0.45, type: 'lowpass', freq: 3500, sweep: 400 });
    g.audio?.tone({ freq: 160, to: 60, dur: 0.1, gain: 0.25 });
    g.shake(0.06);
  }
  trickShot() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const from = this.handPos(), dir = p.aimDir.clone();
    this.bullet(from, dir, 18 + this.rank('caliber') * 4, { bounces: 3 + this.rank('ricochet') + this.bounceBonus, color: 0xfff0a0 });
    this.muzzle(from, dir);
    g.audio?.noise({ dur: 0.14, gain: 0.5, type: 'lowpass', freq: 4000, sweep: 300 });
    g.audio?.tone({ freq: 1800, to: 2600, dur: 0.12, gain: 0.05, type: 'square', filter: 6000, at: 0.05 });
    g.shake(0.08);
  }
  smoke() {
    const g = this.game, p = this.p, rk = this.rank('smoke');
    this.smokeAt.copy(p.pos); this.smokeR = 4.5 + rk * 0.8; this.smokeT = 5 + rk * 1.5;
    // throw down the bomb and hop back into it
    const back = p.aimDir.clone().setY(0).normalize().multiplyScalar(-11);
    p.action = { type: 'cast', dur: 0.25, elapsed: 0, t: 0, root: back, faceAim: true, moveScale: 0 };
    p.vel.x = back.x; p.vel.z = back.z; p.iframes = Math.max(p.iframes, 0.4);
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 0.5), { count: 40, color: SMOKE, additive: false, speed: 5, up: 0.4, life: 1.4, size: 0.8, sizeEnd: 3, drag: 3 });
    g.fx.flash(0xffffff, 0.15, 0.08);
    g.audio?.noise({ dur: 0.8, gain: 0.45, type: 'lowpass', freq: 1200, sweep: 300, rev: 0.3 });
    for (const e of g.enemies) if (!e.dead && this.inSmoke(e.pos) && e.state === 'windup') { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.5; }
  }
  fanHammer() {
    const g = this.game, p = this.p, s = this.library.revolver;
    const n = s.chargesLeft;
    if (n <= 0) { g.toast?.('Out of rounds'); g.audio?.tone({ freq: 900, dur: 0.05, gain: 0.08, type: 'square', filter: 4000 }); return false; }
    s.chargesLeft = 0; s.recharge = 0;
    p.action = { type: 'cast', dur: 0.12 + n * 0.07, elapsed: 0, t: 0, moveScale: 0.25, faceAim: true };
    const dmg = (13 + this.rank('caliber') * 4) * this.gunMul;
    for (let i = 0; i < n; i++) this.after(i * 0.07, () => {
      const from = this.handPos(), dir = p.aimDir.clone();
      dir.applyAxisAngle(tmp.set(0, 1, 0), (Math.random() - 0.5) * 0.22);
      this.bullet(from, dir, dmg, { bounces: this.rank('ricochet') >= 2 ? 1 : 0 });
      this.muzzle(from, dir);
      g.audio?.noise({ dur: 0.1, gain: 0.45, type: 'lowpass', freq: 3500, sweep: 400 });
      g.audio?.tone({ freq: 170, to: 60, dur: 0.08, gain: 0.22 });
      g.shake(0.07);
    });
  }
  // Ultimate: Construction — one bullet built from nothing, paid for by her body.
  special() {
    const g = this.game, p = this.p, rk = this.rank('construct');
    if (this.constructing) return false;
    this.constructing = true;
    const seventh = this.library.revolver.chargesLeft <= 0;   // they think she is out of ammo
    p.action = { type: 'cast', both: true, dur: 1.3, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    // Construction strains her body: it costs HP (never lethal here)
    const cost = Math.min(Math.max(0, p.hp - 1), p.maxHp * 0.12);
    p.hp -= cost;
    if (cost > 0) { g.fx.hurtVignette(); g.fx.damageNumber(p.pos, cost, { color: '#ff6a6a' }); }
    g.toast?.(seventh ? 'Construction — the seventh bullet' : 'Construction: Special Bullet', 'big');
    g.audio?.charge(1.1, 1.2);
    g.fx.dimTarget = 0.6; g.slowMo(1.1, 0.4); g.fx.chroma(0.6);
    let t = 0;
    g.addUpdater((dt) => {
      if (this.p.kit !== this) { this.constructing = false; g.fx.dimTarget = 0; return false; }
      t += dt;
      const h = this.handPos();
      const k = Math.min(1, t / 1.1);
      for (let i = 0; i < 5; i++) {   // cursed energy threads weaving the bullet
        const a = Math.random() * Math.PI * 2, rr = 0.4 + (1 - k) * 1.6 + Math.random() * 0.6;
        g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.5) * 1.4 * (1 - k), h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 3, 0, -Math.sin(a) * rr * 3, 0.32, 0.8, 1.8, 2.2, 0.1, 0, 0, 0.2, 1);
      }
      g.particles.burst(h, { count: 1, color: CONSTRUCT, speed: 0, life: 0.08, size: 0.2 + k * 0.5, sizeEnd: 0.1, intensity: 3 });
      if (t < 1.15) return true;
      this.constructing = false;
      g.fx.dimTarget = 0; p.action = null;
      const dir = p.aimDir.clone(), dmg = (300 + rk * 90) * (seventh ? 1.5 : 1);
      const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.aimPoint, 30) : null;
      g.projectiles.fire({ pos: h.clone(), vel: dir.clone().multiplyScalar(80), team: 'player', dmg, shape: 'arrow', color: CONSTRUCT, emissive: 8, scale: 0.8, life: 0.6, radius: 0.8, pierce: true, light: 10,
        homing: target ? 20 : 0, target,
        trail: (q) => { g.particles.burst(q.pos, { count: 5, color: CONSTRUCT, speed: 1.5, life: 0.35, size: 0.3, sizeEnd: 0.05, intensity: 3 }); },
        onHit: (e, q) => {
          g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(16), stagger: 1.4, unblockable: true, crit: true, critMult: 1.5 });
          g.fx.hitSpark(q.pos, q.vel.clone().normalize(), { color: CONSTRUCT, big: true, crit: true });
          g.fx.screenWave(q.pos, 0.6, 0.3);
          g.hitStop(0.1); g.shake(0.5); g.audio?.impact(2.2);
        },
        onExpire: (q) => {
          const R = 3 + rk * 0.7;
          g.combat.aoe(q.pos, R, 60 + rk * 25, p, { knock: 10, stagger: 0.8 });
          g.fx.explosion(q.pos, CONSTRUCT, R);
        } });
      g.fx.slashLine(h, dir, 30, CONSTRUCT, 0.6, 0.35);
      g.fx.slashLine(h, dir, 30, 0xffffff, 0.2, 0.25);
      this.muzzle(h, dir);
      g.fx.flash(0xc0f0ff, 0.6, 0.2); g.fx.screenWave(h, 1.4, 0.5); g.fx.chroma(1.4);
      g.shake(0.9); g.hitStop(0.12); g.slowMo(0.5, 0.3);
      g.audio?.blackFlash(); g.audio?.energy('explode');
      return false;
    });
  }
  tick(dt) {
    if (this.smokeT <= 0) return;
    this.smokeT -= dt;
    const g = this.game, c = this.smokeAt, R = this.smokeR;
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      g.particles.smoke.emit(c.x + Math.cos(a) * rr, c.y + 0.2 + Math.random() * 1.6, c.z + Math.sin(a) * rr, (Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4, 1.6, 0.42, 0.42, 0.46, 1.2, 0, 1, 2.6, 0);
    }
    for (const e of g.enemies) if (!e.dead && this.inSmoke(e.pos)) e.slowT = 0.3;
  }
  // ============================================================== library abilities
  temp(o) { (this.temps || (this.temps = new Set())).add(o); this.game.scene.add(o); return o; }
  untemp(o) { this.temps?.delete(o); this.game.scene.remove(o); }
  dispose() { super.dispose(); for (const o of this.temps ?? []) this.game.scene.remove(o); this.temps?.clear(); this.game.fx.dimTarget = 0; }
  warn(c, R, dur, col = BRASS) {
    const g = this.game, y = this.groundAt(c.x, c.z, c.y) + 0.07;
    g.fx.rings.spawn(tmp.set(c.x, y, c.z), { color: col, r0: R, r1: R, dur, thick: 0.1 });
    g.fx.rings.spawn(tmp.set(c.x, y + 0.01, c.z), { color: col, r0: R, r1: 0.3, dur, thick: 0.3 });
  }
  // Construction is paid for with her body (never lethal)
  bodyCost(frac) {
    const g = this.game, p = this.p;
    const cost = Math.min(Math.max(0, p.hp - 1), p.maxHp * frac * this.hpMul);
    if (cost > 0) { p.hp -= cost; g.fx.damageNumber(p.pos, cost, { color: '#ff6a6a' }); }
    g.particles.burst(this.handPos(), { count: 14, color: CONSTRUCT, speed: 3, life: 0.35, size: 0.12, shape: 1, intensity: 3 });
  }
  gunshot(from, dir, heavy = 1) {
    const g = this.game;
    this.muzzle(from, dir);
    g.audio?.noise({ dur: 0.12 * heavy, gain: 0.45, type: 'lowpass', freq: 3500 / heavy, sweep: 400 });
    g.audio?.tone({ freq: 160 / heavy, to: 60 / heavy, dur: 0.1 * heavy, gain: 0.25 });
    g.shake(0.06 * heavy);
  }
  // ---- Revolver
  quickShot() {
    const p = this.p;
    this.cast(0.25);
    for (let i = 0; i < 2; i++) this.after(i * 0.09, () => {
      const from = this.handPos(), dir = p.aimDir.clone().applyAxisAngle(tmp.set(0, 1, 0), (Math.random() - 0.5) * 0.08);
      this.bullet(from, dir, (9 + this.rank('caliber') * 3) * this.gunMul);
      this.gunshot(from, dir, 0.9);
    });
  }
  speedLoader() {
    const g = this.game, p = this.p, rv = this.library.revolver;
    rv.chargesLeft = rv.maxCharges; rv.recharge = 0;
    this.cast(0.3);
    g.toast?.('Speed Loader');
    g.audio?.tone({ freq: 1400, to: 900, dur: 0.06, gain: 0.08, type: 'square', filter: 5000 });
    g.audio?.tone({ freq: 1600, to: 1100, dur: 0.06, gain: 0.08, type: 'square', filter: 5000, at: 0.08 });
    g.particles.burst(this.handPos(), { count: 6, color: BRASS, speed: 3, life: 0.5, size: 0.08, gravity: 14, shape: 1 });
    this.buff('speed_loader', 6, {
      onStart: () => { this.fastGate = rv.gateTime; rv.gateTime = 0.09; },
      onEnd: () => { rv.gateTime = this.fastGate ?? 0.2; },
      onTick: () => { if (Math.random() < 0.2) g.particles.burst(this.handPos(), { count: 1, color: BRASS, speed: 0.5, life: 0.3, size: 0.1 }); },
    });
  }
  deadEye() {
    const g = this.game, p = this.p;
    const list = this.foes(p.pos, 15, this.fwd(), 0.7).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, 5);
    if (!list.length) { g.toast?.('No curses in sight'); g.audio?.ui('back'); return false; }
    p.action = { type: 'cast', dur: 0.5 + list.length * 0.12, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    g.fx.dimTarget = 0.35; g.audio?.charge(0.45, 1.5);
    for (const e of list) g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.07, e.pos.z), { color: 0xff3030, r0: 1.6, r1: 0.6, dur: 0.45, thick: 0.15 });
    list.forEach((e, i) => this.after(0.45 + i * 0.12, () => {
      if (i === list.length - 1) { g.fx.dimTarget = 0; if (p.action?.lock) p.action = null; }
      if (e.dead) return;
      const from = this.handPos(), dir = tmp2.copy(e.pos).setY(e.pos.y + e.height * 0.55).sub(from).normalize().clone();
      p.facing = Math.atan2(dir.x, dir.z);
      g.projectiles.fire({ pos: from, vel: dir.clone().multiplyScalar(70), team: 'player', shape: 'nail', color: 0xff6040, emissive: 5, scale: 1.4, life: 0.6, radius: 0.35, homing: 30, target: e,
        onHit: (t, q) => { this.hit(t, (30 + this.rank('caliber') * 6) * this.gunMul, { crit: true, stagger: 0.6, knock: q.vel.clone().setLength(3) }); g.fx.hitSpark(q.pos, null, { color: 0xff6040, crit: true }); } });
      this.gunshot(from, dir, 1.1);
    }));
  }
  // ---- Trick Shots
  piercingRound() {
    const g = this.game, p = this.p;
    this.cast(0.25);
    const from = this.handPos(), dir = p.aimDir.clone(), dmg = (24 + this.rank('caliber') * 4) * this.sniperMul;
    g.projectiles.fire({ pos: from, vel: dir.clone().multiplyScalar(65), team: 'player', shape: 'nail', color: 0xfff0c0, emissive: 5, scale: 1.8, life: 0.55, radius: 0.35, pierce: true,
      trail: (q) => g.particles.burst(q.pos, { count: 1, color: 0xfff0c0, speed: 0.1, life: 0.15, size: 0.1, shape: 1 }),
      onHit: (e, q) => { this.hit(e, pierceArmor(e, dmg), { unblockable: true, stagger: 0.4, knock: q.vel.clone().setLength(3) }); g.fx.hitSpark(q.pos, dir, { color: 0xfff0c0 }); } });
    this.gunshot(from, dir, 1.2);
  }
  splitRound() {
    const g = this.game, p = this.p;
    this.cast(0.25);
    const from = this.handPos(), dir = p.aimDir.clone();
    let split = false;
    const burst = (q) => {
      if (split) return; split = true;
      const base = Math.atan2(q.vel.x, q.vel.z);
      for (let i = -2; i <= 2; i++) {
        const a = base + i * 0.3;
        g.projectiles.fire({ pos: q.pos.clone(), vel: tmp.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(40), team: 'player', shape: 'nail', color: BRASS, emissive: 4, life: 0.25, radius: 0.3,
          onHit: (e, qq) => { if (q.hit?.has(e) && i === 0) return; this.hit(e, 9 + this.rank('caliber') * 2, { stagger: 0.2, knock: qq.vel.clone().setLength(2) }); g.fx.hitSpark(qq.pos, null, { color: BRASS }); } });
      }
      g.particles.burst(q.pos, { count: 12, color: BRASS, speed: 8, life: 0.25, size: 0.08, shape: 1, intensity: 4 });
      g.audio?.tone({ freq: 2200, to: 1200, dur: 0.08, gain: 0.06, type: 'square', filter: 6000 });
    };
    g.projectiles.fire({ pos: from, vel: dir.clone().multiplyScalar(50), team: 'player', shape: 'nail', color: 0xffe08a, emissive: 4, scale: 1.4, life: 0.4, radius: 0.35,
      onHit: (e, q) => { this.hit(e, (16 + this.rank('caliber') * 3) * this.gunMul, { stagger: 0.3 }); }, onExpire: (q) => burst(q) });
    this.gunshot(from, dir);
  }
  rifle() {
    const g = this.game, p = this.p, aimT = 0.6;
    p.action = { type: 'cast', dur: aimT + 0.25, elapsed: 0, t: 0, moveScale: 0.15, lock: true, faceAim: true };
    g.audio?.tone({ freq: 500, to: 520, dur: aimT, gain: 0.04, type: 'sine' });
    let laser = 0;
    this.during(aimT, (t, dt) => {
      laser -= dt;
      if (laser <= 0) { laser = 0.06; g.fx.slashLine(this.handPos(), p.aimDir.clone(), 30, 0xff3030, 0.05, 0.08); }
    }, () => {
      const from = this.handPos(), dir = p.aimDir.clone();
      let L = 32;
      for (let s = 0.6; s < L; s += 0.4) if (g.world.solidAt(from.x + dir.x * s, from.y + dir.y * s, from.z + dir.z * s)) { L = s; break; }
      const dmg = (90 + this.rank('caliber') * 12) * this.sniperMul, crit = this.inSmoke() ? true : undefined;
      this.line(from.clone().setY(p.pos.y), dir, L, 0.7, (e) => {
        this.hit(e, pierceArmor(e, dmg), { unblockable: true, stagger: 1, crit, knock: dir.clone().setY(0).setLength(8) });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), dir, { color: 0xfff0c0, big: true, crit: !!crit });
      });
      g.combat.hitBlocks(from.clone().addScaledVector(dir, L), dir, 1, Math.PI, 80, p);
      g.fx.slashLine(from, dir, L, 0xfff0c0, 0.35, 0.3); g.fx.slashLine(from, dir, L, 0xffffff, 0.12, 0.2);
      this.gunshot(from, dir, 1.8);
      p.vel.x -= dir.x * 4; p.vel.z -= dir.z * 4;
      g.hitStop(0.06); g.shake(0.35);
    });
  }
  overwatch() {
    const g = this.game, p = this.p;
    g.toast?.('Overwatch'); g.audio?.tone({ freq: 900, to: 1200, dur: 0.15, gain: 0.06, type: 'square', filter: 4000 });
    let cd = 0, ring = 0;
    this.buff('overwatch', 6, {
      onTick: (dt) => {
        cd -= dt; ring -= dt;
        if (ring <= 0) { ring = 0.5; g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: BRASS, r0: 14, r1: 14, dur: 0.5, thick: 0.05 }); }
        if (cd > 0) return;
        const e = g.nearestEnemy(p.pos, 14); if (!e) return;
        cd = 0.5;
        const from = this.handPos(), dir = tmp2.copy(e.pos).setY(e.pos.y + e.height * 0.55).sub(from).normalize().clone();
        this.bullet(from, dir, (14 + this.rank('caliber') * 3) * this.gunMul, { target: e });
        this.gunshot(from, dir, 0.9);
      },
    });
  }
  // ---- Construction
  constructBullet() {
    const g = this.game, p = this.p;
    this.bodyCost(0.04);
    p.action = { type: 'cast', dur: 0.4, elapsed: 0, t: 0, moveScale: 0.2, faceAim: true };
    this.after(0.3, () => {
      const from = this.handPos(), dir = p.aimDir.clone(), rk = this.rank('construct');
      g.projectiles.fire({ pos: from, vel: dir.clone().multiplyScalar(60), team: 'player', shape: 'arrow', color: CONSTRUCT, emissive: 6, scale: 0.4, life: 0.5, radius: 0.4, light: 3,
        trail: (q) => g.particles.burst(q.pos, { count: 2, color: CONSTRUCT, speed: 0.5, life: 0.25, size: 0.15, sizeEnd: 0.05, intensity: 3 }),
        onHit: (e, q) => { this.hit(e, pierceArmor(e, 55 + rk * 12), { stagger: 0.7, unblockable: true, knock: q.vel.clone().setLength(6) }); g.fx.hitSpark(q.pos, null, { color: CONSTRUCT, big: true }); },
        onExpire: (q) => { g.combat.aoe(q.pos, 2.2, 28 + rk * 8, p, { knock: 6, stagger: 0.5 }); g.fx.explosion(q.pos, CONSTRUCT, 1.8); } });
      this.gunshot(from, dir, 1.3);
    });
  }
  constructBlades() {
    const g = this.game, p = this.p, base = this.aimAngle();
    this.cast(0.25);
    for (let i = -1; i <= 1; i++) {
      const a = base + i * 0.16;
      g.projectiles.fire({ pos: this.handPos(), vel: tmp.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(30), team: 'player', shape: 'slash', color: CONSTRUCT, emissive: 4, scale: 0.35, life: 0.5, radius: 0.35, pierce: true,
        onHit: (e, q) => { this.hit(e, 10 + this.rank('construct') * 3, { stagger: 0.2, knock: q.vel.clone().setLength(1.5) }); g.fx.hitSpark(q.pos, null, { color: CONSTRUCT }); } });
    }
    g.audio?.whoosh(0.8);
  }
  caltrops() {
    const g = this.game, p = this.p, c = this.aimGround(10), R = 3;
    this.bodyCost(0.03);
    this.cast(0.35);
    const spikes = new THREE.Group();
    const mat = new THREE.MeshStandardNodeMaterial({ color: 0xc8f4ff, metalness: 0.6, roughness: 0.3, emissive: CONSTRUCT, emissiveIntensity: 0.8 });
    const geo = new THREE.ConeGeometry(0.1, 0.3, 4);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      const m = new THREE.Mesh(geo, mat); const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      m.position.set(x, this.groundAt(x, z, c.y) + 0.15, z); m.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 3, (Math.random() - 0.5) * 0.6); spikes.add(m);
    }
    this.temp(spikes);
    g.audio?.tone({ freq: 1800, to: 2400, dur: 0.2, gain: 0.05, type: 'triangle' });
    this.zone(c, R, 6, 0.5, (list) => {
      for (const e of list) { this.hit(e, 6 + this.rank('construct') * 2, { stagger: 0.1, ceGain: 0.3, color: '#9ae8ff' }); this.slow(e, 0.7); }
    }, { color: CONSTRUCT, particles: 0.3, onEnd: () => { this.untemp(spikes); geo.dispose(); } });
  }
  barricade() {
    const g = this.game, p = this.p, f = this.fwd();
    this.bodyCost(0.05);
    this.cast(0.4, true);
    const c = p.pos.clone().addScaledVector(f, 2.4); c.y = this.groundAt(c.x, c.z, p.pos.y);
    const W = 4.5, side = tmp2.set(f.z, 0, -f.x).clone();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(W, 2.2, 0.3), new THREE.MeshStandardNodeMaterial({ color: 0x9ad8f0, metalness: 0.4, roughness: 0.3, emissive: CONSTRUCT, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }));
    wall.position.copy(c).setY(c.y + 1.1); wall.rotation.y = Math.atan2(f.x, f.z); wall.castShadow = true;
    this.temp(wall);
    g.particles.burst(wall.position, { count: 30, color: CONSTRUCT, speed: 4, life: 0.5, size: 0.15, shape: 1, intensity: 3 });
    g.audio?.impact(1); g.audio?.energy('infinity');
    const near = (pos) => { tmp.subVectors(pos, c); const lat = tmp.x * side.x + tmp.z * side.z, dep = tmp.x * f.x + tmp.z * f.z; return { lat, dep, inside: Math.abs(lat) < W / 2 + 0.2 }; };
    this.during(5, (t, dt) => {
      wall.scale.y = Math.min(1, t * 6);
      for (const pr of [...g.projectiles.list]) {
        if (pr.team !== 'enemy') continue;
        const n = near(pr.pos); if (n.inside && Math.abs(n.dep) < 0.6 && pr.pos.y < c.y + 2.5) { g.fx.hitSpark(pr.pos, null, { color: CONSTRUCT }); g.projectiles.kill(pr, 'blocked'); }
      }
      for (const e of g.enemies) {
        if (e.dead) continue;
        const n = near(e.pos); const r = (e.radius ?? 0.5) + 0.3;
        if (n.inside && n.dep > 0 && n.dep < r) e.knock.addScaledVector(f, (r - n.dep) * 40 * dt);
      }
    }, () => { this.untemp(wall); wall.geometry.dispose(); g.particles.burst(wall.position, { count: 20, color: CONSTRUCT, speed: 3, life: 0.5, size: 0.12, shape: 1 }); });
  }
  cursedRounds() {
    const g = this.game;
    this.bodyCost(0.06);
    this.cast(0.3);
    g.toast?.('Construction: Cursed Rounds'); g.audio?.charge(0.3, 1.4);
    this.buff('cursed_rounds', 8, { onTick: () => { if (Math.random() < 0.4) g.particles.burst(this.handPos(), { count: 1, color: CONSTRUCT, speed: 0.6, life: 0.3, size: 0.12, intensity: 3 }); } });
  }
  lastBullet() {
    const g = this.game, p = this.p, rv = this.library.revolver;
    const left = Math.max(0, rv.chargesLeft), empty = rv.maxCharges - left;
    this.bodyCost(0.08);
    rv.chargesLeft = 0; rv.recharge = 0;
    p.action = { type: 'cast', dur: 0.65, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    g.audio?.charge(0.5, 1.2); g.fx.dimTarget = 0.3;
    this.during(0.5, () => {
      const h = this.handPos();
      for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, rr = 0.8 + Math.random() * 0.6; g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.5), h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 4, 0, -Math.sin(a) * rr * 4, 0.25, 0.8, 1.8, 2.2, 0.1, 0, 0, 0.2, 1); }
    }, () => {
      g.fx.dimTarget = 0; if (p.action?.lock) p.action = null;
      const from = this.handPos(), dir = p.aimDir.clone(), dmg = (60 + empty * 25 + this.rank('construct') * 15);
      g.projectiles.fire({ pos: from, vel: dir.clone().multiplyScalar(75), team: 'player', shape: 'arrow', color: CONSTRUCT, emissive: 7, scale: 0.6, life: 0.6, radius: 0.6, pierce: true, light: 6,
        trail: (q) => g.particles.burst(q.pos, { count: 3, color: CONSTRUCT, speed: 1, life: 0.3, size: 0.25, sizeEnd: 0.05, intensity: 3 }),
        onHit: (e, q) => { this.hit(e, dmg, { unblockable: true, crit: true, stagger: 1.1, knock: q.vel.clone().setLength(10) }); g.fx.hitSpark(q.pos, null, { color: CONSTRUCT, big: true, crit: true }); g.hitStop(0.06); } });
      g.fx.slashLine(from, dir, 24, CONSTRUCT, 0.4, 0.3);
      this.gunshot(from, dir, 1.6);
      if (empty >= rv.maxCharges) { g.toast?.('The seventh bullet'); g.fx.flash(0xc0f0ff, 0.3, 0.15); }
      g.shake(0.5);
    });
  }
  // ---- Zenin
  evasiveRoll() {
    const g = this.game, p = this.p, back = this.fwd().multiplyScalar(-1);
    this.dash(back, 5, 0.22, { color: SMOKE, onEnd: () => {
      p.facing = this.aimAngle();
      const from = this.handPos(), dir = p.aimDir.clone();
      this.bullet(from, dir, (14 + this.rank('caliber') * 3) * this.gunMul);
      this.gunshot(from, dir);
    } });
    g.audio?.whoosh(1);
  }
  pistolWhip() {
    const g = this.game, p = this.p, f = this.fwd();
    this.pose('swingR', 0.3);
    this.after(0.1, () => {
      for (const e of this.foes(p.pos, 3, f, 0.8)) {
        this.hit(e, 16, { melee: true, stagger: 0.8, knock: f.clone().multiplyScalar(4) });
        this.stun(e, 1);
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.7), f, { color: BRASS });
      }
      g.fx.slashArc(p.pos, p.facing, BRASS, 2.8, 0.35, 0.15); g.audio?.impact(1.1);
    });
  }
  flashbang() {
    const g = this.game, p = this.p, c = this.aimGround(9), R = 4, fuse = 0.7;
    this.cast(0.3);
    this.warn(c, R, fuse, 0xffffff);
    const can = this.temp(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.18), new THREE.MeshStandardNodeMaterial({ color: 0x3a4a3a, metalness: 0.6, roughness: 0.4 })));
    const from = this.handPos();
    this.during(fuse, (t, dt, k) => { can.position.set(from.x + (c.x - from.x) * k, from.y + (c.y - from.y) * k + Math.sin(k * Math.PI) * 2.5, from.z + (c.z - from.z) * k); can.rotation.x += dt * 12; }, () => {
      this.untemp(can); can.geometry.dispose();
      for (const e of this.foes(c, R)) { this.hit(e, 10, { stagger: 0.8 }); this.stun(e, 2); }
      g.particles.burst(c.clone().setY(c.y + 0.8), { count: 1, color: 0xffffff, speed: 0, life: 0.25, size: R * 2.5, sizeEnd: 1.5, intensity: 4 });
      g.particles.burst(c.clone().setY(c.y + 0.8), { count: 30, color: 0xffffff, speed: 10, life: 0.3, size: 0.1, shape: 1, intensity: 4 });
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: 0xffffff, r0: 0.4, r1: R + 1, dur: 0.35, thick: 0.2 });
      g.lights.flash(c.clone().setY(c.y + 1), 0xffffff, 30, 14, 0.3);
      if (p.pos.distanceTo(c) < R + 2) g.fx.flash(0xffffff, 0.4, 0.2);
      g.audio?.noise({ dur: 0.4, gain: 0.6, type: 'highpass', freq: 2000, sweep: 300 }); g.audio?.impact(1.4);
    });
  }
  zeninPride() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    g.toast?.('Zenin Pride'); g.fx.shockwave(p.pos, BRASS, 3); g.audio?.charge(0.3, 1);
    this.statBuff('zenin_pride', 8, { crit: 0.2, speed: 0.15, meleeMult: 0.15 }, {
      onTick: () => { if (Math.random() < 0.3) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5), p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5), 0, 0.5, 0, 0.5, 2, 1.6, 0.6, 0.1, 0, 1, 0.1, 0); },
    });
  }
}
registerKit('mai', MaiKit, MAI_SKILLS);
