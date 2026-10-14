// Hakari-style kit — Idle Death Gamble.
//   LMB  rough brawler combo; every hit builds Fever, which raises your odds.
//   RMB  Pachinko Balls: a spray of steel balls that ricochet off the floor.
//   1    Shutter Doors: a line of steel shutters slams down in front of you.
//   2    Rough Energy Rush: a frenzied barrage of jagged, rough-energy punches.
//   3    Reach!: spin the reels outside the domain — three of a kind is a short
//        JACKPOT, a miss bursts into a shower of balls.
//   F    Domain: Idle Death Gamble: Private Pure Love Train — every few seconds
//        the pachinko reels roll; rider riichi (Transit Card, Seat Struggle,
//        Potty Emergency) shift the odds, coloured holds (green / red / gold /
//        rainbow) raise them, and a JACKPOT makes Hakari effectively immortal:
//        huge regeneration, unlimited Cursed Energy and faster attacks.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const GREEN = 0x3aff8a, GOLD = 0xffd23a, SILVER = 0xd8dce8, PINK = 0xff5ac8;
const tmp = new THREE.Vector3();

registerSorcerer('hakari', {
  name: 'Hakari', technique: 'Idle Death Gamble', rarity: 'legendary', title: 'The Gambler', color: '#3aff8a',
  desc: 'A rough-energy brawler who pelts curses with pachinko balls and slams shutter doors, then rolls the Pure Love Train until a JACKPOT makes him unkillable.',
  domain: 'Idle Death Gamble: Private Pure Love Train',
});

registerLook('hakari', {
  paint: { skinTone: 0xf0cdb0, hair: 0x2c2a30, hairVolume: true, top: 0x1c1f2c, collar: 0x12141c, topTrim: 0x101218, buttons: 0x3aff8a, pants: 0x1c1f2c, eye: 0x6a7a88, fringe: 1, hairSide: 3, hairBack: 7, shoes: 0x0e0e12 },
  hair: (m) => [
    { x: 0, y: 8, z: -0.5, w: 7, h: 1.6, d: 7, rx: -0.12, material: m },
    { x: -2, y: 7.4, z: -2.8, w: 3, h: 2.6, d: 3, rx: -0.9, rz: 0.25, material: m },
    { x: 2, y: 7.4, z: -2.8, w: 3, h: 2.6, d: 3, rx: -0.9, rz: -0.25, material: m },
    { x: 0, y: 6, z: -4.2, w: 2, h: 4, d: 2, hang: true, material: m, stiff: 30 },
  ],
  hairColor: 0x2c2a30, accent: GREEN, emit: 0.35,
  cape: { color: 0x1c1f2c, length: 10, width: 9, segments: 3 },   // long uniform coat tails
  paintExtra(S) {
    S.rect(20, 20, 1, 12, 0x3aff8a, 0.05); S.rect(27, 20, 1, 12, 0x3aff8a, 0.05);  // green coat piping
    S.px(10, 14, 0xb08a78);                                                         // smirk
  },
  props(rig, K) {
    const gold = K.mat(GOLD, { metalness: 0.9, roughness: 0.25, emissive: 0.4 });
    K.box(rig.head, 0.8, 1.4, 0.8, gold, -4.8, 3.2, 0.5);   // earrings
    K.box(rig.head, 0.8, 1.4, 0.8, gold, 4.8, 3.2, 0.5);
    K.box(rig.torso, 8.6, 1.2, 4.6, K.mat(0x0c0c10), 0, 1.5, 0);               // belt
    K.box(rig.torso, 1.8, 1.4, 0.6, gold, 0, 1.5, 2.4);                        // buckle
  },
});

registerDomainEnv('pure_love_train', {
  skyTop: 0x02120a, skyHorizon: 0x1aff7a, fog: 0x06281a, fogDensity: 0.016, hemiSky: 0x9affc8, hemiGround: 0x1a0a20, hemiI: 1.15, sun: 0xffe08a, sunI: 1.1,
  grade: { tint: [0.95, 1.1, 0.98], lift: [0.0, 0.02, 0.01], sat: 1.35, contrast: 1.12, vignette: 0.4 }, floor: B.subway_floor,
});

export const HAKARI_SKILLS = [
  { id: 'fever', name: 'Fever', desc: 'Melee builds more Fever (better jackpot odds).', max: 3 },
  { id: 'balls', name: 'Ball Rush', desc: 'More pachinko balls per spray and they hit harder.', max: 3 },
  { id: 'shutter', name: 'Steel Shutters', desc: 'More, heavier shutter doors.', max: 3 },
  { id: 'rough', name: 'Rough Energy', desc: '+8% melee damage per rank; Rough Energy Rush lands more punches.', max: 3 },
  { id: 'jackpot', name: '4 Minutes 11 Seconds', desc: 'Jackpots last 3s longer per rank.', max: 2, req: 'fever' },
  { id: 'riichi', name: 'Riichi Rider', desc: 'Riichi and coloured holds appear more often.', max: 2 },
];

const RIDERS = ['Transit Card Riichi', 'Seat Struggle Riichi', 'Potty Emergency Riichi'];
const HOLDS = [
  { name: 'Green Hold', odds: 0.3, color: GREEN, w: 50 },
  { name: 'Red Hold', odds: 0.5, color: 0xff3a4a, w: 30 },
  { name: 'Gold Hold', odds: 0.8, color: GOLD, w: 15 },
  { name: 'RAINBOW HOLD', odds: 1, color: PINK, w: 5 },
];

class HakariKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const ROUGH = 0x9affb8;
    this.combo = [
      { style: 'punch', dur: 0.24, windup: 0.26, strike: 0.48, dmg: 11, range: 2.5, arc: 1.1, lunge: 7, knock: 2.5, stop: 0.04, shake: 0.13, trail: GREEN, sparkColor: ROUGH, chainAt: 0.5 },
      { style: 'swingL', dur: 0.26, windup: 0.28, strike: 0.5, dmg: 12, range: 2.6, arc: 1.2, lunge: 6, knock: 3, stop: 0.045, shake: 0.15, trail: GREEN, sparkColor: ROUGH, chainAt: 0.52 },
      { style: 'punch', dur: 0.24, windup: 0.26, strike: 0.48, dmg: 12, range: 2.5, arc: 1.1, lunge: 7, knock: 2.5, stop: 0.04, shake: 0.13, trail: GREEN, sparkColor: ROUGH, chainAt: 0.5 },
      { style: 'uppercut', dur: 0.36, windup: 0.3, strike: 0.5, dmg: 17, range: 2.6, arc: 1.0, lunge: 5, knock: 5, stop: 0.07, shake: 0.24, trail: GOLD, launch: true, chainAt: 0.58 },
      { style: 'slam', dur: 0.55, windup: 0.4, strike: 0.6, dmg: 28, range: 3.3, arc: Math.PI, lunge: 4, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: GREEN, stagger: 0.6, trail: GREEN },
    ];
    this.p.stats.meleeMult += r('rough') * 0.08;
    this.slots = {
      ranged: this.ability({ name: 'Pachinko Balls', icon: '🎱', cd: 0.65, ce: 0, use: () => this.balls(4 + r('balls'), 0.28) }),
      t1: this.ability({ name: 'Shutter Doors', icon: '🚪', cd: 6, ce: 12, use: () => this.shutters() }),
      t2: this.ability({ name: 'Rough Rush', icon: '👊', cd: 8, ce: 16, use: () => this.rush() }),
      t3: this.ability({ name: 'Reach!', icon: '🎰', cd: 20, ce: 30, use: () => this.reach() }),
    };
    this.fever = 0; this.jackpotT = 0; this.auraT = 0;
    this.domain = {
      name: 'Idle Death Gamble: Private Pure Love Train', icon: '🎰', key: 'pure_love_train', type: 5, color: GREEN, sound: 'resonance', flash: 0x7affb0,
      duration: 10, radius: 24,
      onStart: (g, d) => { d.roll = 0.6; d.pity = 0; g.toast?.('🚃 Next stop… JACKPOT', 'big'); },
      onTick: (g, d, dt) => {
        // the train rattles past: doors and balls pelt every curse inside
        d.pelt = (d.pelt ?? 0) - dt;
        if (d.pelt <= 0) {
          d.pelt = 0.5;
          for (const e of g.enemies) if (!e.dead && !e.isDummy && g.domainSys.inside(e.pos)) {
            g.combat.damageEnemy(e, 6, this.p, { stagger: 0.15, ceGain: 0 });
            g.particles.burst(tmp.set(e.pos.x, e.pos.y + e.height, e.pos.z), { count: 5, color: SILVER, speed: 4, up: 1.5, gravity: 16, life: 0.5, size: 0.12, shape: 1 });
          }
        }
        if (Math.random() < 0.4) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.glow.emit(d.center.x + Math.cos(a) * rr, d.center.y + 4 + Math.random() * 3, d.center.z + Math.sin(a) * rr, 0, -2, 0, 1.2, Math.random() < 0.5 ? 0.4 : 2.4, 2.4, Math.random() < 0.5 ? 1.2 : 0.4, 0.14, 2, 0.3, 1, 1); }
        if (this.jackpotT > 0) return;           // already immortal: just enjoy the ride
        d.roll -= dt;
        if (d.roll > 0) return;
        d.roll = 1.6;
        if (this.spin(0.18 + this.fever * 0.004 + d.pity, true)) d.pity = 0; else d.pity += 0.14;
      },
    };
  }
  // ------------------------------------------------------------ odds & jackpot
  onMeleeHit(e, step) {
    this.fever = Math.min(100, this.fever + 3 + this.rank('fever') * 1.5);
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
  }
  // One pachinko roll. Returns true on a jackpot.
  spin(odds, domain = false) {
    const g = this.game, p = this.p;
    let chance = odds;
    const words = [];
    if (Math.random() < 0.45 + this.rank('riichi') * 0.1) {
      const rider = RIDERS[Math.floor(Math.random() * RIDERS.length)];
      words.push(rider);
      if (rider.startsWith('Seat')) for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(p.pos) < 14) e.slowT = 2;   // everyone fights for a seat
      if (rider.startsWith('Potty')) p.heal(p.maxHp * 0.08);
      if (rider.startsWith('Transit')) p.gainCE(10);
      let roll = Math.random() * 100 - this.rank('riichi') * 8, hold = HOLDS[0];
      for (const h of HOLDS) { roll -= h.w; if (roll <= 0) { hold = h; break; } }
      if (this.rank('riichi') && Math.random() < 0.15) hold = HOLDS[Math.min(3, HOLDS.indexOf(hold) + 1)];
      words.push(hold.name);
      chance = Math.max(chance, hold.odds * (domain ? 1 : 0.6));
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: hold.color, r0: 0.5, r1: 4, dur: 0.5, thick: 0.15 });
      g.fx.flash(hold.color, 0.12, 0.15);
    }
    const win = Math.random() < chance;
    const digit = () => 1 + Math.floor(Math.random() * 9);
    let reels;
    if (win) { const n = Math.random() < 0.5 ? 7 : digit(); reels = [n, n, n]; } else { reels = [digit(), digit(), digit()]; if (reels[0] === reels[1] && reels[1] === reels[2]) reels[2] = reels[2] % 9 + 1; }
    g.toast?.(`🎰 ${words.length ? words.join(' → ') + ' · ' : ''}${reels.join(' | ')}`);
    g.fx.damageNumber(p.pos, 0, { text: reels.join(' '), color: win ? '#ffd23a' : '#9affb8', crit: win });
    g.audio?.tone({ freq: 660, to: 990, dur: 0.12, gain: 0.08, type: 'square', filter: 3000 });
    if (win) setTimeout(() => this.jackpot(domain ? 12 : 5), 250);
    else g.audio?.ui('back');
    return win;
  }
  jackpot(dur) {
    const g = this.game, p = this.p;
    const fresh = this.jackpotT <= 0;
    this.jackpotT = Math.max(this.jackpotT, dur + this.rank('jackpot') * 3);
    this.fever = 0;
    if (fresh) { p.stats.attackSpeed *= 1.45; this.speedMul = 1.25; }
    g.toast?.('JACKPOT!', 'domain');
    g.fx.flash(GOLD, 0.6, 0.35); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1.4, 0.7); g.fx.chroma(1.2);
    g.shake(0.6); g.slowMo(0.4, 0.3);
    g.lights.flash(p.pos.clone().setY(p.pos.y + 2), GOLD, 26, 18, 1.2, { priority: 8 });
    for (let i = 0; i < 4; i++) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08 + i * 0.6, p.pos.z), { color: i % 2 ? GREEN : GOLD, r0: 0.4, r1: 5 + i * 2, dur: 0.6 + i * 0.15, thick: 0.12 });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1.2), { count: 70, color: GOLD, speed: 12, up: 2, gravity: 10, life: 1.2, size: 0.16, shape: 1, intensity: 4 });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1.2), { count: 40, color: GREEN, speed: 8, up: 1.5, life: 1, size: 0.3, sizeEnd: 0.05 });
    g.audio?.levelUp(); g.audio?.loot('unique');
    for (let i = 0; i < 8; i++) setTimeout(() => g.audio?.coin(), 120 + i * 70);
  }
  onIncoming(amount) {
    // during a jackpot Hakari's body regenerates faster than anything can kill it
    if (this.jackpotT > 0) return Math.min(amount, Math.max(0, this.p.hp - 1));
    return amount;
  }
  tick(dt) {
    const g = this.game, p = this.p;
    this.fever = Math.max(0, this.fever - dt * 1.5);
    const mat = p.rig.material.userData;
    if (this.jackpotT > 0) {
      this.jackpotT -= dt;
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35 * dt);   // regenerates whole limbs
      p.ce = p.maxCe;                                          // infinite Cursed Energy
      mat.emitMask.value = 1.4 + Math.sin(g.time * 12) * 0.4;
      p.rig.setGlow?.(Math.sin(g.time * 6) > 0 ? 0x2a6a20 : 0x5a4a08);
      p.heroLight.color.setHex(Math.sin(g.time * 6) > 0 ? GREEN : GOLD); p.heroLight.intensity = 4;
      this.auraT += dt * 40;
      for (; this.auraT > 1; this.auraT--) {
        const a = Math.random() * Math.PI * 2, rr = 0.4 + Math.random() * 0.4, gold = Math.random() < 0.5;
        g.particles.glow.emit(p.pos.x + Math.cos(a) * rr, p.pos.y + Math.random() * 1.8, p.pos.z + Math.sin(a) * rr, Math.cos(a) * 0.6, 2 + Math.random() * 2, Math.sin(a) * 0.6, 0.6, gold ? 3 : 0.6, gold ? 2.4 : 3, gold ? 0.4 : 1.2, 0.14, -1, 1.2, 0.1, gold ? 1 : 0);
      }
      if (this.jackpotT <= 0) {
        p.stats.attackSpeed /= 1.45; this.speedMul = 1;
        mat.emitMask.value = 0.35; p.rig.setGlow?.(0x000000); p.heroLight.color.setHex(0xffe8d0); p.heroLight.intensity = 1.6;
        g.toast?.('Jackpot over');
      }
    } else if (this.fever > 40 && Math.random() < this.fever / 400) {
      g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 1.6, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 1.2, 0, 0.5, 0.6, 3, 1.2, 0.1, 0, 1, 0.2, 1);
    }
  }
  // ------------------------------------------------------------ techniques
  balls(n, spread) {
    const g = this.game, p = this.p;
    this.cast(0.26);
    const base = Math.atan2(p.aimDir.x, p.aimDir.z);
    const dmg = 5 + this.rank('balls') * 2;
    const homing = g.domainSys?.sureHit(p);
    for (let i = 0; i < n; i++) {
      const a = base + (Math.random() - 0.5) * spread * 2;
      const vel = new THREE.Vector3(Math.sin(a), 0.15 + Math.random() * 0.2, Math.cos(a)).multiplyScalar(20 + Math.random() * 6);
      g.projectiles.fire({ pos: this.handPos(), vel, team: 'player', shape: 'orb', color: i % 3 ? SILVER : GOLD, emissive: 1.2, scale: 0.55, radius: 0.3, gravity: 18, life: 1.1, pierce: true,
        homing: homing ? 10 : 0, target: homing ? g.nearestEnemy(p.pos, 30) : null,
        trail: (q) => {
          // ricochet off the floor like a pachinko ball
          const gy = g.world.groundBelow(q.pos.x, q.pos.z, q.pos.y + 0.3);
          if (isFinite(gy) && q.pos.y < gy + 0.2 && q.vel.y < 0) { q.vel.y = -q.vel.y * 0.65; q.pos.y = gy + 0.2; if (Math.random() < 0.3) g.audio?.coin(); }
          if (Math.random() < 0.3) g.particles.burst(q.pos, { count: 1, color: GREEN, speed: 0.2, life: 0.2, size: 0.1, shape: 1 });
        },
        onHit: (e, q) => { g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setY(0).setLength(2), stagger: 0.12 }); g.fx.hitSpark(q.pos, null, { color: SILVER }); this.fever = Math.min(100, this.fever + 1); } });
    }
    g.audio?.whoosh(0.6);
  }
  ensureShutterAssets() {
    if (this.shutterGeo) return;
    this.shutterGeo = new THREE.BoxGeometry(2.2, 2.6, 0.18);
    this.shutterMat = new THREE.MeshStandardNodeMaterial({ color: 0x8a9098, metalness: 0.85, roughness: 0.35, emissive: GREEN, emissiveIntensity: 0.12 });
    this.slatGeo = new THREE.BoxGeometry(2.25, 0.08, 0.24);
    this.slatMat = new THREE.MeshStandardNodeMaterial({ color: 0x5a6068, metalness: 0.9, roughness: 0.3 });
  }
  shutter(at, facing, dmg) {
    const g = this.game, p = this.p;
    this.ensureShutterAssets();
    const grp = new THREE.Group();
    const door = new THREE.Mesh(this.shutterGeo, this.shutterMat); door.castShadow = true; grp.add(door);
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(this.slatGeo, this.slatMat); s.position.y = -1.1 + i * 0.44; grp.add(s); }
    const gy = g.world.groundBelow(at.x, at.z, p.pos.y + 3); const floor = isFinite(gy) ? gy : p.pos.y;
    grp.position.set(at.x, floor + 6, at.z); grp.rotation.y = facing;
    g.scene.add(grp);
    let t = 0, landed = false;
    g.addUpdater((dt) => {
      t += dt;
      if (!landed) {
        grp.position.y = Math.max(floor + 1.3, grp.position.y - dt * 40);
        if (grp.position.y <= floor + 1.3) {
          landed = true;
          const c = tmp.set(at.x, floor, at.z);
          g.combat.aoe(c, 1.8, dmg, p, { knock: 7, stagger: 0.7 });
          g.fx.shockwave(c, GREEN, 2.4, 0.3);
          g.particles.burst(c.clone().setY(floor + 0.3), { count: 12, color: SILVER, speed: 6, up: 0.6, life: 0.3, size: 0.08, shape: 1, gravity: 10 });
          g.shake(0.18); g.audio?.impact(1.2, 'crit');
        }
        return true;
      }
      if (t > 0.9) grp.scale.y = Math.max(0.01, 1 - (t - 0.9) * 5);
      if (t > 1.1) { g.scene.remove(grp); return false; }
      return true;
    });
  }
  shutters() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const face = Math.atan2(p.aimDir.x, p.aimDir.z);
    const n = 4 + this.rank('shutter');
    const dmg = 20 + this.rank('shutter') * 8;
    const sure = g.domainSys?.sureHit(p) ? g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos)).slice(0, n) : null;
    for (let i = 0; i < n; i++) setTimeout(() => {
      const at = sure && sure[i] ? sure[i].pos.clone() : p.pos.clone().addScaledVector(p.aimDir, 1.8 + i * 1.6);
      this.shutter(at, face, dmg);
    }, i * 70);
    g.audio?.whoosh(1.1);
  }
  rush() {
    const g = this.game, p = this.p;
    const hits = 7 + this.rank('rough') * 2;
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const drive = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing)).multiplyScalar(2.6);
    p.action = { type: 'cast', dur: hits * 0.07 + 0.2, elapsed: 0, t: 0, both: true, moveScale: 0.6, lock: true, hold: true, faceAim: true, root: drive };
    let i = 0;
    const step = () => {
      if (i >= hits || p.dead || p.downed) { p.action = null; return; }
      const fwd = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const front = p.pos.clone().addScaledVector(fwd, 1.2).setY(p.pos.y + 1.1 + (Math.random() - 0.5) * 0.6);
      const targets = g.domainSys?.sureHit(p) ? g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos)) : g.combat.query(p.pos, fwd, 2.9, 0.9);
      for (const e of targets) g.combat.damageEnemy(e, 7 + this.rank('rough') * 2, p, { melee: true, knock: fwd.clone().multiplyScalar(i === hits - 1 ? 10 : 1.2), stagger: 0.3 });
      // jagged, rough cursed energy
      g.fx.slashLine(front.clone().addScaledVector(fwd, -0.6), new THREE.Vector3(fwd.x + (Math.random() - 0.5), (Math.random() - 0.5) * 0.6, fwd.z + (Math.random() - 0.5)).normalize(), 1.6, i % 2 ? GREEN : 0xd8ffe0, 0.3, 0.12, Math.random() * 3);
      g.particles.burst(front, { count: 6, color: GREEN, speed: 5, life: 0.25, size: 0.1, shape: 1, dir: fwd.clone().multiplyScalar(0.8) });
      if (targets.length) { g.hitStop(0.02); g.shake(0.1); g.audio?.impact(0.8); this.fever = Math.min(100, this.fever + 1.5); } else g.audio?.swing(i % 3);
      if (i === hits - 1) { g.fx.shockwave(front, GREEN, 3); g.shake(0.3); }
      i++; setTimeout(step, 70);
    };
    step();
  }
  reach() {
    const g = this.game, p = this.p;
    this.cast(0.6, true, { type: 'raise' });
    g.audio?.charge(0.6, 1.4);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GREEN, r0: 3, r1: 0.4, dur: 0.6, thick: 0.15 });
    setTimeout(() => {
      if (this.spin(0.08 + this.fever * 0.005)) return;
      // a miss still dumps the tray: balls rain down around Hakari
      const c = p.pos.clone();
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, rr = 1 + Math.random() * 4;
        g.projectiles.fire({ pos: c.clone().add(new THREE.Vector3(Math.cos(a) * rr, 7 + Math.random() * 2, Math.sin(a) * rr)), vel: new THREE.Vector3(0, -14, 0), team: 'player', shape: 'orb', color: i % 2 ? SILVER : GOLD, emissive: 1.5, scale: 0.8, radius: 0.5, life: 1.2, ghost: true,
          onHit: (e, q) => g.combat.damageEnemy(e, 14, p, { stagger: 0.3 }),
          onExpire: (q) => g.particles.burst(q.pos, { count: 4, color: SILVER, speed: 3, life: 0.3, size: 0.1, shape: 1 }) });
      }
      g.combat.aoe(c, 5, 24, p, { knock: 4, stagger: 0.4, falloff: true });
      g.fx.shockwave(c, SILVER, 5);
    }, 550);
  }
  dispose() {
    super.dispose();
    this.jackpotT = 0; this.speedMul = 1;   // stats are rebuilt with the next kit
  }
}
registerKit('hakari', HakariKit, HAKARI_SKILLS);
