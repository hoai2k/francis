// Gojo-style kit — Limitless. 23 abilities on the technique tree; the
// player equips four (RMB must be a basic one) plus F.
//   Red      Reversal: Red (start, RMB), Red: Point-Blank, Red: Rapid Fire,
//            Red: Maximum
//   Blue     Lapse: Blue, Blue: Vortex Shot, Blue: Rush, Blue: Strike,
//            Blue: Maximum Output
//   Infinity Infinity, Infinity: Repel, Neutral Infinity
//   Purple   Lapse & Reversal, Hollow Purple, Purple: Fragment, Hollow
//            Technique: Purple (orb), Hollow Purple 200%
//   Six Eyes Teleport, Six Eyes: Insight, Sky Drop, Black Flash, RCT:
//            Restore, Unlimited Void: 0.2 Seconds
//   F        Domain Expansion: Unlimited Void — infinite information paralyses
//            everything inside (sure-hit stun, no damage); Gojo hits freely.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit } from './index.js';
import { makeOrb, infinityMaterial, beamMaterial } from '../gfx/orbs.js';
import { Trench } from '../gfx/materials.js';
import { BLOCKS } from '../world/blocks.js';
import { tileAvgColor } from '../gfx/textures.js';

const BLUE = 0x3ab8ff, RED = 0xff2a3a, PURPLE = 0xb04aff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();

export const GOJO_SKILLS = [
  { id: 'six_eyes', name: 'Six Eyes', icon: '👁️', desc: '+4% crit chance and +10% CE gain per rank.', max: 3, branch: 'Six Eyes', tier: 0 },
  { id: 'blue_radius', name: 'Maximum Blue', icon: '🌀', desc: 'Blue pulls from further away and hits harder.', max: 3, req: 'ab:lapse_blue', branch: 'Blue', tier: 2 },
  { id: 'blue_duration', name: 'Lingering Lapse', icon: '⏳', desc: 'Blue lasts longer.', max: 2, req: 'blue_radius', branch: 'Blue', tier: 3 },
  { id: 'red_power', name: 'Amplified Red', icon: '💢', desc: 'Bigger, stronger Red explosions.', max: 3, req: 'ab:red', branch: 'Red', tier: 1 },
  { id: 'red_charges', name: 'Twin Red', icon: '♊', desc: 'Red holds two charges.', max: 1, req: 'red_power', branch: 'Red', tier: 2 },
  { id: 'infinity_duration', name: 'Infinity', icon: '⏳', desc: 'Infinity lasts longer.', max: 2, req: 'ab:infinity', branch: 'Infinity', tier: 2 },
  { id: 'infinity_reflect', name: 'Reflection', icon: '🔁', desc: 'Projectiles stopped by Infinity fly back at curses.', max: 1, req: 'infinity_duration', branch: 'Infinity', tier: 3 },
  { id: 'purple_width', name: 'Imaginary Mass', icon: '🟪', desc: 'Hollow Purple is wider and deals more damage.', max: 3, req: 'ab:hollow_purple', branch: 'Purple', tier: 4 },
  { id: 'purple_cost', name: 'Efficiency', icon: '♻️', desc: 'Hollow Purple costs less CE and recharges faster.', max: 2, req: 'purple_width', branch: 'Purple', tier: 5 },
  { id: 'void_duration', name: 'Infinite Void', icon: '∞', desc: 'Unlimited Void lasts 2s longer per rank.', max: 2, req: 'core:unlock_domain', branch: 'Six Eyes', tier: 5 },
];

class GojoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 11, range: 2.6, arc: 1.1, lunge: 7, knock: 3, stop: 0.04, shake: 0.14, trail: BLUE, sparkColor: 0x9ad8ff },
      { style: 'swingL', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 12, range: 2.7, arc: 1.2, lunge: 6, knock: 4, stop: 0.045, shake: 0.16, trail: BLUE, sparkColor: 0x9ad8ff },
      { style: 'spin', dur: 0.42, windup: 0.28, strike: 0.55, dmg: 15, range: 2.9, arc: Math.PI, lunge: 3, knock: 6, stop: 0.06, shake: 0.22, trail: 0xbfe8ff, sparkColor: 0xbfe8ff },
      { style: 'slam', dur: 0.55, windup: 0.4, strike: 0.6, dmg: 26, range: 3.4, arc: Math.PI, lunge: 4, knock: 11, stop: 0.09, shake: 0.4, ring: true, ringColor: BLUE, stagger: 0.55, trail: BLUE, sparkColor: BLUE },
    ];
    const redCharges = 1 + r('red_charges');
    this.branches = ['Red', 'Blue', 'Infinity', 'Purple', 'Six Eyes'];
    this.library = {
      // ---- Red
      red: ability({ name: 'Reversal: Red', icon: '🔴', kind: 'basic', desc: 'A crimson orb that detonates in a huge repulsion blast, launching curses.', cd: 1.6, ce: 0, branch: 'Red', tier: 0, start: true, legacy: 'ranged', use: () => this.red(), maxCharges: redCharges, chargesLeft: redCharges, gateTime: 0.35 }),
      red_point: ability({ name: 'Red: Point-Blank', icon: '💥', kind: 'technique', desc: 'Reversal at arm\'s length: a cone of repulsion that blasts everything in front of you away.', cd: 5, ce: 10, branch: 'Red', tier: 1, req: 'red', use: () => this.redPoint() }),
      red_burst: ability({ name: 'Red: Rapid Fire', icon: '🔺', kind: 'basic', desc: 'Three small Reds in quick succession, each a little burst of repulsion.', cd: 2.4, ce: 4, branch: 'Red', tier: 3, req: 'red_point', use: () => this.redBurst() }),
      red_max: ability({ name: 'Red: Maximum', icon: '☄️', kind: 'technique', desc: 'Charge Reversal to its maximum output and fire a slow, enormous Red that levels the area.', cd: 22, ce: 45, branch: 'Red', tier: 4, req: 'red_burst', use: () => this.redMax() }),
      // ---- Blue
      lapse_blue: ability({ name: 'Lapse: Blue', icon: '🔵', kind: 'technique', desc: 'A singularity that drags curses and rubble inward, grinding them, then implodes.', cd: 7, ce: 12, branch: 'Blue', tier: 1, legacy: 't1', use: () => this.blue() }),
      blue_shot: ability({ name: 'Blue: Vortex Shot', icon: '🌀', kind: 'basic', desc: 'Flick a small Blue that bursts on impact and yanks the curses around it together.', cd: 1.2, ce: 0, branch: 'Blue', tier: 2, req: 'lapse_blue', use: () => this.blueShot() }),
      blue_rush: ability({ name: 'Blue: Rush', icon: '💨', kind: 'movement', desc: 'Use Blue on yourself: you are pulled across the battlefield, striking everything in the way.', cd: 5, ce: 6, branch: 'Blue', tier: 3, req: 'lapse_blue', use: () => this.blueRush() }),
      blue_strike: ability({ name: 'Blue: Strike', icon: '👊', kind: 'technique', desc: 'Blue drags a curse into a flurry of attraction-boosted blows, ending in a crushing slam.', cd: 9, ce: 16, branch: 'Blue', tier: 4, req: 'blue_rush', use: () => this.blueStrike() }),
      blue_max: ability({ name: 'Blue: Maximum Output', icon: '🌌', kind: 'technique', desc: 'A colossal Blue that rips up the ground and swallows every curse in a wide radius.', cd: 24, ce: 50, branch: 'Blue', tier: 5, req: 'blue_shot', use: () => this.blue({ R: 11, dur: 3.4, dps: 46, size: 2.2, range: 14, max: true }) }),
      // ---- Infinity
      infinity: ability({ name: 'Infinity', icon: '∞', kind: 'defence', desc: 'Attacks slow down infinitely as they approach and never arrive.', cd: 11, ce: 10, branch: 'Infinity', tier: 1, legacy: 't2', use: () => this.infinity() }),
      infinity_repel: ability({ name: 'Infinity: Repel', icon: '🫸', kind: 'defence', desc: 'Push Infinity outward: curses are thrown back and attacks in the air are turned around.', cd: 8, ce: 12, branch: 'Infinity', tier: 2, req: 'infinity', use: () => this.repel() }),
      neutral_infinity: ability({ name: 'Neutral Infinity', icon: '🫧', kind: 'buff', desc: 'For 8s, everything near you crawls as if approaching infinity and is ground down.', cd: 20, ce: 22, branch: 'Infinity', tier: 4, req: 'infinity_repel', use: () => this.neutralInfinity() }),
      // ---- Purple
      lapse_red: ability({ name: 'Lapse & Reversal', icon: '🌗', kind: 'technique', desc: 'Blue gathers the curses, then Red detonates in the middle of them.', cd: 10, ce: 20, branch: 'Purple', tier: 2, req: ['lapse_blue', 'red_point'], use: () => this.lapseRed() }),
      hollow_purple: ability({ name: 'Hollow Purple', icon: '🟣', kind: 'technique', desc: 'Blue and Red spiral together, then an erasing beam tears through walls and curses.', cd: 16 - r('purple_cost') * 2.5, ce: 45 - r('purple_cost') * 8, branch: 'Purple', tier: 3, legacy: 't3', req: 'lapse_red', use: () => this.purple() }),
      purple_flick: ability({ name: 'Purple: Fragment', icon: '🔮', kind: 'basic', desc: 'A needle of imaginary mass that pierces every curse in a line.', cd: 1.4, ce: 5, branch: 'Purple', tier: 3, req: 'lapse_red', use: () => this.purpleFlick() }),
      purple_orb: ability({ name: 'Hollow Technique: Purple', icon: '🪐', kind: 'technique', desc: 'Release a slow sphere of erasure that rolls forward, deleting curses and walls alike.', cd: 20, ce: 40, branch: 'Purple', tier: 4, req: 'hollow_purple', use: () => this.purpleOrb() }),
      purple_200: ability({ name: 'Hollow Purple: 200%', icon: '🟪', kind: 'technique', desc: 'Nine incantations, twice the output: a vast erasing beam with a long charge.', cd: 45, ce: 80, branch: 'Purple', tier: 5, req: 'purple_orb', use: () => this.purple({ W: 3.4, L: 56, DMG: 380, CH: 1.9 }) }),
      // ---- Six Eyes
      teleport: ability({ name: 'Teleport', icon: '✨', kind: 'movement', desc: 'Blue-powered instant movement to where you aim. Two charges.', cd: 4, ce: 4, branch: 'Six Eyes', tier: 1, use: () => this.teleport(), maxCharges: 2, chargesLeft: 2, gateTime: 0.3 }),
      insight: ability({ name: 'Six Eyes: Insight', icon: '👁️', kind: 'buff', desc: 'For 8s your techniques cost half the Cursed Energy and crit far more often.', cd: 25, ce: 10, branch: 'Six Eyes', tier: 2, req: 'teleport', use: () => this.insight() }),
      sky_drop: ability({ name: 'Sky Drop', icon: '🌠', kind: 'movement', desc: 'Float up on Blue, then drop onto the aim point in a burst of Red.', cd: 9, ce: 14, branch: 'Six Eyes', tier: 2, req: 'teleport', use: () => this.skyDrop() }),
      black_flash: ability({ name: 'Black Flash', icon: '⚡', kind: 'technique', desc: 'Close the distance and land a guaranteed Black Flash — cursed energy within 0.000001s of the blow.', cd: 14, ce: 18, branch: 'Six Eyes', tier: 3, req: 'insight', use: () => this.blackFlash() }),
      rct_restore: ability({ name: 'RCT: Restore', icon: '💠', kind: 'heal', desc: 'Reverse Cursed Technique heals 30% health and restores your Infinity.', cd: 30, ce: 25, branch: 'Six Eyes', tier: 3, req: 'insight', use: () => this.restore() }),
      void_flash: ability({ name: 'Unlimited Void: 0.2s', icon: '🌐', kind: 'technique', desc: 'Expand the domain for 0.2 seconds: every curse nearby is paralysed by a flash of infinite information.', cd: 35, ce: 40, branch: 'Six Eyes', tier: 4, req: 'black_flash', use: () => this.voidFlash() }),
    };
    this.passives = {
      six_eyes_t: passive({ name: 'Six Eyes', icon: '👁️', desc: 'Techniques cost 25% less Cursed Energy.', branch: 'Six Eyes', tier: 1, req: 'teleport', apply: (pl, k) => { k.ceMul *= 0.75; } }),
      auto_infinity: passive({ name: 'Automatic Infinity', icon: '♾️', desc: 'Every 10s, Infinity stops the next hit on its own.', branch: 'Infinity', tier: 3, req: 'infinity_repel', apply: (pl, k) => { k.autoInf = 0; } }),
      limitless: passive({ name: 'Limitless Mastery', icon: '🔴', desc: 'Red holds one more charge and techniques deal 10% more damage.', branch: 'Red', tier: 2, req: 'red_point', apply: (pl, k) => { pl.stats.techMult += 0.1; const a = k.library.red; a.maxCharges++; a.chargesLeft++; } }),
      auto_rct: passive({ name: 'Auto Reverse Curse', icon: '💚', desc: 'Below 35% health you regenerate 2% health per second.', branch: 'Six Eyes', tier: 4, req: 'rct_restore', apply: (pl, k) => { k.autoRct = true; } }),
    };
    this.domain = {
      name: 'Unlimited Void', icon: '∞', key: 'unlimited_void', type: 1, color: 0x9ad8ff, sound: 'void', flash: 0xffffff,
      duration: 8 + r('void_duration') * 2, radius: 26,
      // Canon: the sure-hit is not damage but INFINITE INFORMATION — everything
      // inside perceives everything forever and can't act. Gojo then hits freely.
      onStart: (g) => { g.frozen = true; g.toast?.('Infinite information floods every mind'); },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt;
        // streams of information pouring into every frozen head
        for (const e of g.enemies) {
          if (e.dead || !g.domainSys.inside(e.pos) || Math.random() > 0.35) continue;
          const hx = e.pos.x, hy = e.pos.y + e.height, hz = e.pos.z;
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 2;
          g.particles.glow.emit(hx + Math.cos(a) * r, hy + 1 + Math.random() * 2, hz + Math.sin(a) * r, -Math.cos(a) * r * 2.2, -2, -Math.sin(a) * r * 2.2, 0.45, 1.6, 1.9, 2.4, 0.08, 0, 0, 0.02, 1);
        }
        if (d.tick <= 0) {
          d.tick = 0.6;
          for (const e of g.enemies) if (!e.dead && g.domainSys.inside(e.pos)) { e.flashT = 0.06; e.cancelAttack?.(); }
        }
      },
      onEnd: (g) => {
        g.frozen = false;
        // the brain is still processing: the paralysis lingers a moment
        for (const e of g.enemies) if (!e.dead && !e.isBoss && g.domainSys.inside(e.pos)) e.sealT = Math.max(e.sealT ?? 0, 1.5);
      },
    };
    this.p.stats.crit += r('six_eyes') * 0.04; this.p.stats.ceGain += r('six_eyes') * 0.1;
    this.infT = 0;
    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 3), infinityMaterial());
    this.shell.visible = false; this.shell.renderOrder = 23;
    this.own(this.shell);
    this.auraT = 0;
    this.beamMats = [beamMaterial(PURPLE), beamMaterial(0xffd8ff, true)];
  }
  // -------------------------------------------------------------- aura
  tick(dt) {
    const p = this.p, g = this.game;
    this.passiveTick(dt);
    const k = p.ce / p.maxCe;
    this.auraT += dt * (2 + 30 * k * k);
    const n = Math.floor(this.auraT); this.auraT -= n;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.25;
      g.particles.glow.emit(p.pos.x + Math.cos(a) * r, p.pos.y + 0.1 + Math.random() * 1.6, p.pos.z + Math.sin(a) * r, Math.cos(a) * 0.3, 1.2 + Math.random() * 1.2, Math.sin(a) * 0.3, 0.5 + Math.random() * 0.4, 0.4 + k, 1.2 + k * 1.5, 3 + k * 2, 0.12 + k * 0.1, -1, 1.5, 0.1, 0);
    }
    p.heroLight.color.setRGB(1 - k * 0.5, 1 - k * 0.1, 1);
    p.heroLight.intensity = 1.6 + k * 2.5;
    p.rig.material.userData.emitMask.value = 0.6 + k * 1.2;
    // Infinity shell
    if (this.infT > 0) {
      this.infT -= dt;
      this.shell.visible = true;
      this.shell.position.set(p.pos.x, p.pos.y + 1, p.pos.z);
      const u = this.shell.material.userData;
      u.alpha.value = Math.min(1, this.infT * 3, (this.infDur - this.infT) * 6 + 0.2);
      u.hit.value = Math.max(0, u.hit.value - dt * 3);
      // stop projectiles dead, push curses out
      for (const pr of g.projectiles.list) {
        if (pr.team !== 'enemy') continue;
        const dist = pr.pos.distanceTo(this.shell.position);
        if (dist < 3.2) {
          // Infinity: the closer it gets, the slower it goes — it never arrives
          pr.vel.multiplyScalar(Math.max(0, Math.min(1, (dist - 1.3) / 1.9)) ** (dt * 30));
          pr.gravity = 0; pr.t = Math.min(pr.t, pr.life - 0.2); pr.stalled = true;
          if (this.rank('infinity_reflect') && pr.vel.lengthSq() < 0.5) { pr.team = 'player'; pr.stalled = false; tmp2.subVectors(pr.pos, p.pos).setY(0).normalize().multiplyScalar(26); pr.vel.copy(tmp2); pr.t = 0; pr.onHit = (e) => g.combat.damageEnemy(e, pr.dmg * 2, p, { knock: pr.vel.clone().setLength(5) }); pr.hit.clear(); }
        }
      }
      for (const e of g.enemies) {
        if (e.dead || e.isDummy) continue;
        tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length();
        if (d < 1.6) e.knock.addScaledVector(tmp.normalize(), (1.6 - d) * 20 * dt * 10);
      }
      if (this.infT <= 0) {
        this.shell.visible = false; p.invulnerable = false;
        // Infinity drops: the stalled attacks fall out of the air
        for (const pr of g.projectiles.list) if (pr.stalled) { pr.stalled = false; pr.gravity = 14; pr.vel.set(0, -1, 0); }
      }
    }
  }
  onIncoming(amount, src, o) {
    if (this.infT > 0 || (this.autoInf === 0 && !o?.pure)) {
      if (this.infT <= 0) { this.autoInf = 10; this.game.fx.rings.spawn(tmp.set(this.p.pos.x, this.p.pos.y + 1, this.p.pos.z), { color: 0x9ad8ff, r0: 0.4, r1: 1.6, dur: 0.25, thick: 0.1 }); }
      this.shell.material.userData.hit.value = 1;
      this.game.audio?.energy('infinity');
      if (src && src.pos) this.game.fx.hitSpark(tmp.copy(src.pos).lerp(this.p.pos, 0.6).setY(this.p.pos.y + 1), null, { color: 0x9ad8ff });
      return 0;
    }
    return super.onIncoming(amount, src, o);
  }
  // -------------------------------------------------------------- Red
  red(o = {}) {
    const g = this.game, p = this.p;
    if (!o.small) this.cast(0.32);
    const from = this.handPos();
    const dir = o.angle != null ? new THREE.Vector3(Math.sin(o.angle), 0, Math.cos(o.angle)) : p.aimDir.clone();
    const orb = makeOrb(RED, { radius: o.small ? 0.2 : 0.32, coreColor: 0xffe0e0 });
    orb.position.copy(from); g.scene.add(orb);
    const power = this.rank('red_power');
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const pr = g.projectiles.fire({
      pos: from, vel: dir.multiplyScalar(26), team: 'player', dmg: 0, shape: 'orb', color: RED, scale: 0.01, life: 0.6, radius: 0.6, light: 6,
      homing: target ? 12 : 0, target,
      trail: (q) => { orb.position.copy(q.pos); orb.rotation.y += 0.3; g.particles.burst(q.pos, { count: 2, color: RED, speed: 1, life: 0.3, size: 0.3, sizeEnd: 0.1 }); },
      onExpire: (q) => { g.scene.remove(orb); if (o.small) this.redBlast(q.pos.clone(), power, 2.2 + power * 0.3, 14 + power * 4, true); else this.redBlast(q.pos.clone(), power); },
    });
    if (!pr) { g.scene.remove(orb); return false; }
    g.audio?.whoosh(0.8);
    g.audio?.tone({ freq: 700, to: 300, dur: 0.25, gain: 0.12, type: 'sawtooth', filter: 2500 });
    return true;
  }
  redBlast(c, power, Rr = null, dmg = null, small = false) {
    const g = this.game, p = this.p;
    const R = Rr ?? 3.4 + power * 0.6;
    g.combat.aoe(c, R, dmg ?? 30 + power * 10, p, { knock: (small ? 9 : 17) + power * 3, stagger: 0.6, falloff: true, unblockable: true });
    for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(c) < R) e.vel.y = Math.max(e.vel.y, 7);
    g.fx.explosion(c, RED, R);
    g.fx.screenWave(c, small ? 0.4 : 0.9, 0.45);
    g.fx.chroma(small ? 0.2 : 0.6);
    g.shake(small ? 0.15 : 0.45);
    g.hitStop(0.05);
    g.audio?.energy('red');
    g.particles.burst(c, { count: 30, color: 0xff6a6a, speed: 16, life: 0.4, size: 0.1, drag: 3, shape: 1, intensity: 4 });
  }
  // -------------------------------------------------------------- Blue
  blue(o = {}) {
    const g = this.game, p = this.p;
    if (!o.at) this.cast(0.4);
    const d = (o.at ? o.at.clone() : this.aimGround(o.range ?? 9));
    d.y += 1.3 * (o.size ?? 1);
    const rk = this.rank('blue_radius'), dur = o.dur ?? 1.7 + this.rank('blue_duration') * 0.5;
    const R = (o.R ?? 6) + rk * 1.2, dps = (o.dps ?? 26) + rk * 8, S = o.size ?? 1;
    const orb = makeOrb(BLUE, { radius: 0.1, darkCore: true });
    orb.position.copy(d); g.scene.add(orb);
    const light = g.lights.flash(d, BLUE, 12 * S, 12 * S, dur + 0.4, { priority: 4, fade: false });
    g.audio?.energy('blue');
    if (o.max) { g.fx.flash(0x3ab8ff, 0.25, 0.25); g.fx.chroma(1); g.shake(0.4); }
    let t = 0, tick = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      const grow = Math.min(1, t / 0.25), shrink = t > dur ? Math.max(0, 1 - (t - dur) / 0.2) : 1;
      orb.scale.setScalar((0.9 + Math.sin(t * 20) * 0.05) * grow * shrink * S);
      // Maximum Output tears up the ground around it
      if (o.max && Math.random() < 0.5) {
        const a = Math.random() * Math.PI * 2, rr = 3 + Math.random() * R * 0.8;
        const c = new THREE.Vector3(d.x + Math.cos(a) * rr, d.y - 1.3 * S, d.z + Math.sin(a) * rr);
        g.debris.spawn(c, new THREE.Vector3(-Math.cos(a) * rr * 1.4, 6 + Math.random() * 5, -Math.sin(a) * rr * 1.4), 0.3 + Math.random() * 0.4, new THREE.Color(0.45, 0.42, 0.38), 1.2);
        if (Math.random() < 0.3) g.combat.hitBlocks(c, tmp2.set(0, 0, 1), 1.2, Math.PI, 60, p);
      }
      orb.rotation.y += dt * 4;
      // spiral-in particles and dust
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * R * 0.7;
        const px = d.x + Math.cos(a) * r, pz = d.z + Math.sin(a) * r, py = d.y - 1 + Math.random() * 2.5;
        const sp = 5 + Math.random() * 4;
        g.particles.glow.emit(px, py, pz, (d.x - px) / r * sp - Math.sin(a) * 4, (d.y - py) * 1.5, (d.z - pz) / r * sp + Math.cos(a) * 4, r / sp, 0.4, 1.4, 3.5, 0.12, 0, 0, 0.3, 1);
      }
      if (Math.random() < 0.5) g.particles.smoke.emit(d.x + (Math.random() - 0.5) * R, d.y - 1.2, d.z + (Math.random() - 0.5) * R, 0, 1.5, 0, 0.8, 0.35, 0.3, 0.28, 0.5, 0, 1, 1.5, 0);
      // pull
      for (const e of g.enemies) {
        if (e.dead || e.isDummy) continue;
        tmp.subVectors(d, e.pos); const dy = tmp.y; tmp.y = 0; const dist = tmp.length();
        if (dist > R || Math.abs(dy) > 4) continue;
        const pull = Math.min(dist * 6, 14) * (1 - (e.def?.knockResist ?? 0) * 0.5);
        e.knock.lerp(tmp.normalize().multiplyScalar(pull), Math.min(1, dt * 10));
        if (e.state === 'windup') e.cancelAttack?.(), e.state = 'stagger', e.stateT = 0, e.stagger = 0.3;
      }
      if (tick <= 0) {
        tick = 0.2;
        const hits = g.combat.query(d, tmp2.set(0, 0, 1), 2.4 * S, Math.PI);
        for (const e of hits) g.combat.damageEnemy(e, dps * 0.2, p, { stagger: 0.1, ceGain: 1 });
        g.combat.hitBlocks(tmp.copy(d).setY(d.y - 1.3), tmp2.set(0, 0, 1), 2, Math.PI, 20, p);
      }
      if (t > dur + 0.2) {
        g.scene.remove(orb); g.lights.remove(light);
        // implosion
        g.combat.aoe(d, 3 * S, (22 + rk * 8) * (o.max ? 3 : 1), p, { knock: -6, stagger: 0.5 });
        g.fx.shockwave(tmp.copy(d).setY(d.y - 1.3 * S), BLUE, 3.5 * S);
        g.particles.burst(d, { count: 40, color: 0x9ad8ff, speed: 10, life: 0.5, size: 0.12, drag: 4, shape: 1, intensity: 3 });
        g.fx.screenWave(d, 0.6, 0.35);
        g.shake(0.25);
        g.audio?.impact(1.4);
        return false;
      }
      return true;
    });
  }
  // -------------------------------------------------------------- Infinity
  infinity() {
    const g = this.game, p = this.p;
    this.infDur = 2.5 + this.rank('infinity_duration') * 0.8;
    this.infT = this.infDur;
    p.invulnerable = true;
    g.audio?.energy('infinity');
    g.fx.flash(0x9ad8ff, 0.12, 0.15);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0x9ad8ff, r0: 0.4, r1: 2.6, dur: 0.4, thick: 0.1 });
  }
  // -------------------------------------------------------------- Hollow Purple
  purple(o = {}) {
    const g = this.game, p = this.p;
    const rk = this.rank('purple_width');
    const W = (o.W ?? 1.7) + rk * 0.35, L = o.L ?? 40, DMG = (o.DMG ?? 150) + rk * 45;
    const CH = o.CH ?? 1.15;
    if (o.CH) g.toast?.('Nine ropes. Polarized light. Crow and Declaration. Between front and back.', 'domain');
    p.action = { type: 'cast', both: true, dur: CH + 0.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    p.invulnerable = true;
    g.fx.dimTarget = 0.62;
    g.audio?.energy('purple');
    g.rig.extraDist = -4;
    const blue = makeOrb(BLUE, { radius: 0.35, coreColor: 0xd8f0ff }), red = makeOrb(RED, { radius: 0.35, coreColor: 0xffe0e0 });
    g.scene.add(blue, red);
    const lb = g.lights.attach(blue, BLUE, 8, 8, { offsetY: 0, priority: 5 }), lr = g.lights.attach(red, RED, 8, 8, { offsetY: 0, priority: 5 });
    let t = 0, fired = false, beam = null;
    g.addUpdater((dt, realDt) => {
      t += realDt;
      const fwd = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const side = tmp2.set(fwd.z, 0, -fwd.x);
      const front = p.pos.clone().addScaledVector(fwd, 1.1); front.y += 1.35;
      if (!fired) {
        p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
        const k = Math.min(1, t / CH);
        const ang = k * Math.PI * 3, rad = (1 - k) * 1.3 + 0.05;
        blue.position.copy(front).addScaledVector(side, Math.cos(ang) * rad).setY(front.y + Math.sin(ang) * rad * 0.6);
        red.position.copy(front).addScaledVector(side, -Math.cos(ang) * rad).setY(front.y - Math.sin(ang) * rad * 0.6);
        for (const o of [blue, red]) g.particles.burst(o.position, { count: 2, color: o === blue ? BLUE : RED, speed: 0.6, life: 0.35, size: 0.3, sizeEnd: 0.1 });
        if (t >= CH) {
          fired = true;
          g.scene.remove(blue, red); g.lights.remove(lb); g.lights.remove(lr);
          beam = this.fireBeam(front, fwd.clone(), W, L, DMG);
        }
        return true;
      }
      // beam fade
      const bt = t - CH;
      const a = Math.max(0, 1 - bt / 0.9);
      if (beam) { beam.scale.set(W * (1 + Math.sin(bt * 60) * 0.06) * Math.min(1, bt * 12) * (0.4 + a * 0.6), 1, W * (0.4 + a * 0.6) * Math.min(1, bt * 12)); this.beamMats.forEach((m) => { m.userData.alpha.value = a; }); }
      if (bt > 0.9) {
        if (beam) { g.scene.remove(beam); beam = null; }
        g.fx.dimTarget = 0; g.rig.extraDist = 0;
        p.invulnerable = false; p.action = null;
        return false;
      }
      return true;
    });
  }
  fireBeam(from, dir, W, L, DMG) {
    const g = this.game, p = this.p, w = g.world;
    // visual
    const grp = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, L, 24, 1, true), this.beamMats[0]);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, L, 16, 1, true), this.beamMats[1]);
    for (const m of [outer, inner]) { m.rotation.x = Math.PI / 2; m.position.z = L / 2; m.renderOrder = 24; }
    grp.add(outer, inner);
    grp.position.copy(from); grp.lookAt(from.clone().add(dir));
    g.scene.add(grp);
    this.beamMats.forEach((m) => { m.userData.alpha.value = 1; });
    // feel
    g.fx.flash(0xe0a0ff, 0.85, 0.3);
    g.fx.screenWave(from, 1.6, 0.7);
    g.fx.chroma(2);
    g.shake(1);
    g.hitStop(0.1);
    g.slowMo(0.5, 0.35);
    g.audio?.blackFlash();
    g.lights.flash(from.clone().addScaledVector(dir, 6), PURPLE, 30, 26, 0.9, { priority: 9 });
    g.lights.flash(from.clone().addScaledVector(dir, 16), PURPLE, 26, 24, 0.9, { priority: 8 });
    // damage everything in the capsule
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from); const along = tmp.dot(dir);
      if (along < -1 || along > L) continue;
      const perp = tmp.addScaledVector(dir, -along); perp.y = 0;
      if (perp.length() > W + e.radius + 0.4) continue;
      g.combat.damageEnemy(e, DMG, p, { knock: perp.lengthSq() > 0.01 ? perp.normalize().multiplyScalar(14) : dir.clone().multiplyScalar(10), stagger: 1, unblockable: true, crit: false });
      e.vel.y = 9;
      g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 16, color: PURPLE, speed: 8, life: 0.5, size: 0.14, drag: 3, shape: 1 });
    }
    // erase terrain: carve a trench through walls and the floor
    const floorY = Math.floor(p.pos.y) - 1;
    const removed = [];
    for (let s = 1.2; s < L; s += 0.5) {
      const cx = from.x + dir.x * s, cz = from.z + dir.z * s;
      const r = Math.ceil(W + 0.5);
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const bx = Math.floor(cx) + dx, bz = Math.floor(cz) + dz;
        const ox = bx + 0.5 - cx, oz = bz + 0.5 - cz;
        const lat = Math.abs(ox * dir.z - oz * dir.x);
        if (lat > W) continue;
        for (let by = floorY; by <= Math.floor(from.y + W + 0.5); by++) {
          const id = w.get(bx, by, bz);
          if (!id || BLOCKS[id].liquid) continue;
          if (by === floorY && lat > W * 0.75) continue;
          w.set(bx, by, bz, 0);
          removed.push([bx, by, bz, id]);
        }
      }
    }
    w.flush(64);
    // flying rubble (throttled)
    const every = Math.max(1, Math.floor(removed.length / 120));
    for (let i = 0; i < removed.length; i += every) {
      const [bx, by, bz, id] = removed[i];
      const c = new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5);
      tmp.subVectors(c, from); const along = tmp.dot(dir); const lat = tmp.addScaledVector(dir, -along).setY(0);
      const v = lat.normalize().multiplyScalar(4 + Math.random() * 6).addScaledVector(dir, 3 + Math.random() * 6); v.y = 5 + Math.random() * 7;
      g.debris.spawn(c, v, 0.25 + Math.random() * 0.25, (tileAvgColor[BLOCKS[id].side] ?? new THREE.Color(0.5, 0.5, 0.5)).clone(), 3 + Math.random());
    }
    for (let s = 2; s < L; s += 1.5) g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: 5, color: PURPLE, speed: 5, life: 0.7, size: 0.3, drag: 2, sizeEnd: 0.1, up: 0.4 });
    // glowing trench
    Trench.a.value.set(from.x, floorY + 0.5, from.z); Trench.b.value.set(from.x + dir.x * L, floorY + 0.5, from.z + dir.z * L);
    Trench.width.value = W + 0.3; Trench.glow.value = 1.4;
    g.trenchFade = 14;
    return grp;
  }
  // ============================================================== new abilities
  // -------------------------------------------------------------- Red
  redPoint() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const f = this.fwd(), c = p.pos.clone().addScaledVector(f, 1.6).setY(p.pos.y + 1);
    const power = this.rank('red_power');
    let n = 0;
    for (const e of this.foes(p.pos, 6 + power * 0.5, f, 0.75)) {
      this.hit(e, 42 + power * 10, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(22), stagger: 0.9, unblockable: true });
      if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
      n++;
    }
    g.combat.hitBlocks(c, f, 5, 0.75, 40, p);
    g.fx.explosion(c, RED, 2.6);
    g.fx.slashArc(p.pos, p.facing, RED, 5.5, 0.75, 0.3);
    g.fx.slashArc(p.pos, p.facing, 0xffb0b0, 4, 0.75, 0.22);
    g.fx.screenWave(c, 0.8, 0.4); g.fx.chroma(0.7);
    g.particles.burst(c, { count: 36, color: 0xff6a6a, speed: 18, life: 0.35, size: 0.12, drag: 3, shape: 1, intensity: 4, dir: f, spread: 0.5 });
    g.shake(0.45); if (n) g.hitStop(0.06);
    g.audio?.energy('red');
  }
  redBurst() {
    const base = this.aimAngle();
    this.cast(0.42);
    for (let i = 0; i < 3; i++) this.after(i * 0.11, () => this.red({ angle: base + (i - 1) * 0.12, small: true }));
  }
  redMax() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 0.95, elapsed: 0, t: 0, moveScale: 0.1, lock: true, hold: true, cancelable: false, faceAim: true };
    const orb = makeOrb(RED, { radius: 0.2, coreColor: 0xffe0e0 });
    g.scene.add(orb);
    const light = g.lights.attach(orb, RED, 10, 12, { offsetY: 0, priority: 6 });
    g.audio?.charge?.(0.9, 0.6);
    g.fx.dimTarget = 0.35;
    this.during(0.9, (t) => {
      orb.position.copy(this.handPos()).setY(p.pos.y + 1.6);
      orb.scale.setScalar(0.2 + t * 1.2);
      for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, rr = 2 + Math.random() * 1.5; g.particles.glow.emit(orb.position.x + Math.cos(a) * rr, orb.position.y + (Math.random() - 0.5) * 2, orb.position.z + Math.sin(a) * rr, -Math.cos(a) * rr * 3, 0, -Math.sin(a) * rr * 3, 0.3, 3, 0.4, 0.4, 0.16, 0, 0, 0.05, 1); }
    }, () => {
      g.fx.dimTarget = 0; if (p.action?.lock) p.action = null;
      const from = orb.position.clone(); g.scene.remove(orb); g.lights.remove(light);
      const big = makeOrb(RED, { radius: 1.3, coreColor: 0xffe0e0 }); big.position.copy(from); g.scene.add(big);
      const pr = g.projectiles.fire({ pos: from, vel: p.aimDir.clone().multiplyScalar(15), team: 'player', dmg: 0, shape: 'orb', color: RED, scale: 0.01, life: 1.4, radius: 1.3, light: 10, pierce: true,
        trail: (q) => { big.position.copy(q.pos); big.rotation.y += 0.2; g.particles.burst(q.pos, { count: 4, color: RED, speed: 3, life: 0.4, size: 0.5, sizeEnd: 0.1 }); },
        onHit: (e) => this.hit(e, 30, { stagger: 0.4, knock: tmp.subVectors(e.pos, big.position).setY(0).normalize().multiplyScalar(8) }),
        onExpire: (q) => {
          g.scene.remove(big);
          const c = q.pos.clone(), R = 8;
          g.combat.aoe(c, R, 150 + this.rank('red_power') * 25, p, { knock: 26, stagger: 1, falloff: true, unblockable: true });
          for (const e of this.foes(c, R)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 12);
          g.fx.explosion(c, RED, R); g.fx.explosion(c, 0xffd0d0, R * 0.5);
          g.fx.shockwave(c, RED, R + 3); g.fx.screenWave(c, 1.6, 0.7); g.fx.flash(0xff4a4a, 0.5, 0.3); g.fx.chroma(1.8);
          g.lights.flash(c, RED, 30, 24, 0.7, { priority: 9 });
          g.debris.burst(c, 7, 14, 1.4);
          g.shake(1); g.hitStop(0.1); g.audio?.energy('red'); g.audio?.energy('explode');
        } });
      if (!pr) g.scene.remove(big);
      g.audio?.whoosh(1.5);
    });
  }
  // -------------------------------------------------------------- Blue
  blueShot() {
    const g = this.game, p = this.p;
    this.cast(0.26);
    const pull = (c) => {
      for (const e of this.foes(c, 4)) {
        tmp.subVectors(c, e.pos).setY(0);
        if (!e.isBoss) e.knock.add(tmp.multiplyScalar(3.2));
        this.hit(e, 13, { stagger: 0.35, ceGain: 1 });
      }
      g.fx.darkRings.spawn(tmp.set(c.x, this.groundAt(c.x, c.z, c.y) + 0.06, c.z), { color: 0x000000, r0: 3.5, r1: 0.3, dur: 0.3, thick: 0.3 });
      g.fx.rings.spawn(tmp.set(c.x, this.groundAt(c.x, c.z, c.y) + 0.08, c.z), { color: BLUE, r0: 4, r1: 0.2, dur: 0.35, thick: 0.15 });
      for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, rr = 2 + Math.random() * 2; g.particles.glow.emit(c.x + Math.cos(a) * rr, c.y + (Math.random() - 0.5), c.z + Math.sin(a) * rr, -Math.cos(a) * rr * 5, 0, -Math.sin(a) * rr * 5, 0.2, 0.4, 1.3, 3.5, 0.12, 0, 0, 0.05, 1); }
      g.audio?.energy('blue');
    };
    const orb = makeOrb(BLUE, { radius: 0.22, darkCore: true });
    g.scene.add(orb);
    const pr = this.shoot({ speed: 24, color: BLUE, scale: 0.01, life: 0.7, radius: 0.5, light: 4, homing: 4, target: this.target(16),
      trail: (q) => { orb.position.copy(q.pos); g.particles.burst(q.pos, { count: 1, color: BLUE, speed: 0.5, life: 0.25, size: 0.25, sizeEnd: 0.05 }); },
      onExpire: (q) => { g.scene.remove(orb); pull(q.pos.clone()); } });
    if (!pr) { g.scene.remove(orb); return false; }
    g.audio?.whoosh(0.6);
  }
  blueRush() {
    const g = this.game, p = this.p;
    const to = this.aimGround(11);
    const d = tmp3.subVectors(to, p.pos).setY(0); const dist = Math.max(3, d.length());
    const anchor = makeOrb(BLUE, { radius: 0.35, darkCore: true }); anchor.position.copy(to).setY(to.y + 1.2); g.scene.add(anchor);
    g.audio?.energy('blue');
    this.dash(d.lengthSq() > 0.01 ? d : this.fwd(), dist, 0.24, { hitR: 1.6, dmg: 18, color: BLUE, iframes: 0.4,
      onEnd: () => {
        g.scene.remove(anchor);
        for (const e of this.foes(p.pos, 4.5)) { if (!e.isBoss) e.knock.add(tmp.subVectors(p.pos, e.pos).setY(0).multiplyScalar(2.5)); this.hit(e, 10, { stagger: 0.3 }); }
        g.fx.shockwave(p.pos, BLUE, 4); g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0, r0: 4, r1: 0.3, dur: 0.3, thick: 0.3 });
        g.shake(0.2); g.audio?.impact(1.1);
      } });
  }
  blueStrike() {
    const g = this.game, p = this.p;
    const t = this.target(10);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    tmp.subVectors(p.pos, t.pos).setY(0); if (tmp.lengthSq() < 0.01) tmp.set(0, 0, -1);
    this.blink(tmp3.copy(t.pos).add(tmp.setLength(t.radius + 1)), { color: BLUE, quiet: true });
    p.invulnerable = true;
    const styles = ['punch', 'swingL', 'swingR', 'punch', 'uppercut'];
    let i = 0, next = 0;
    this.during(0.8, (tt) => {
      if (t.dead) return false;
      p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
      if (tt < next) return true;
      next += 0.12;
      const st = styles[i % styles.length];
      p.action = { type: 'attack', step: { style: st, strike: 0.5, windup: 0.3 }, style: st, dur: 0.14, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0 };
      if (!t.isBoss) t.knock.add(tmp.subVectors(p.pos, t.pos).setY(0).multiplyScalar(1.5));
      this.hit(t, 11, { melee: true, stagger: 0.4, knock: new THREE.Vector3() });
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + t.height * 0.6), null, { color: BLUE });
      g.fx.rings.spawn(tmp.set(t.pos.x, t.pos.y + t.height * 0.5, t.pos.z), { color: BLUE, r0: 1.4, r1: 0.2, dur: 0.15, thick: 0.1 });
      g.audio?.impact(0.9); g.hitStop(0.025);
      if (++i >= 5) return false;
    }, () => {
      p.invulnerable = false; p.action = null;
      if (t.dead) return;
      this.hit(t, 46, { melee: true, stagger: 1, unblockable: true, knock: tmp.subVectors(t.pos, p.pos).setY(0).normalize().multiplyScalar(14) });
      g.fx.explosion(t.pos.clone().setY(t.pos.y + 1), BLUE, 2.4); g.fx.shockwave(t.pos, BLUE, 4); g.fx.screenWave(t.pos, 0.7, 0.35);
      g.shake(0.5); g.hitStop(0.08); g.audio?.impact(1.7);
    });
  }
  // -------------------------------------------------------------- Infinity
  repel() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const R = 6.5;
    for (const e of this.foes(p.pos, R)) {
      this.hit(e, 20, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(e.isBoss ? 6 : 24), stagger: 0.8, unblockable: true });
      if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 5);
    }
    for (const pr of g.projectiles.list) {
      if (pr.team !== 'enemy' || pr.pos.distanceTo(p.pos) > R) continue;
      pr.team = 'player'; pr.stalled = false; pr.t = 0; pr.gravity = 0;
      pr.vel.subVectors(pr.pos, p.pos).setY(0).normalize().multiplyScalar(26); pr.hit.clear();
      pr.onHit = (e) => this.hit(e, (pr.dmg ?? 10) * 2, { knock: pr.vel.clone().setLength(5) });
    }
    this.shell.visible = true; this.shell.position.set(p.pos.x, p.pos.y + 1, p.pos.z);
    const u = this.shell.material.userData; u.hit.value = 1;
    this.during(0.4, (t, dt, k) => { if (this.infT > 0) return false; this.shell.position.set(p.pos.x, p.pos.y + 1, p.pos.z); this.shell.scale.setScalar(1 + k * 4); u.alpha.value = 1 - k; }, () => { this.shell.scale.setScalar(1); if (this.infT <= 0) this.shell.visible = false; });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0x9ad8ff, r0: 0.6, r1: R, dur: 0.35, thick: 0.25 });
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 0.8, 0.4); g.fx.flash(0x9ad8ff, 0.15, 0.12);
    g.shake(0.35); g.audio?.energy('infinity'); g.audio?.impact(1.2);
  }
  neutralInfinity() {
    const g = this.game, p = this.p;
    let tick = 0;
    g.audio?.energy('infinity');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0x9ad8ff, r0: 0.3, r1: 4.5, dur: 0.4, thick: 0.15 });
    this.buff('neutral_inf', 8, { onTick: (dt) => {
      tick -= dt;
      for (const pr of g.projectiles.list) if (pr.team === 'enemy' && pr.pos.distanceTo(p.pos) < 3.5) pr.vel.multiplyScalar(Math.pow(0.08, dt));
      if (Math.random() < 0.6) { const a = Math.random() * Math.PI * 2; g.particles.glow.emit(p.pos.x + Math.cos(a) * 4.5, p.pos.y + 0.2 + Math.random() * 1.5, p.pos.z + Math.sin(a) * 4.5, -Math.cos(a) * 0.6, 0.2, -Math.sin(a) * 0.6, 0.8, 0.6, 1.2, 2, 0.1, 0, 1, 0.05, 1); }
      if (tick > 0) return;
      tick = 0.5;
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0x9ad8ff, r0: 4.3, r1: 4.5, dur: 0.5, thick: 0.06 });
      for (const e of this.foes(p.pos, 4.5)) { this.slow(e, 0.7); this.hit(e, 8, { stagger: 0.15, ceGain: 0.5, crit: false }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: 0x9ad8ff }); }
    } });
  }
  // -------------------------------------------------------------- Purple
  lapseRed() {
    const g = this.game;
    const c = this.aimGround(10);
    this.blue({ at: c, R: 7, dur: 0.85, dps: 20, quiet: true });
    this.after(1.0, () => { this.redBlast(c.clone().setY(c.y + 1.2), this.rank('red_power') + 2, 5.5, 70); g.fx.flash(0xb04aff, 0.2, 0.15); });
  }
  purpleFlick() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const f = this.fwd(), from = this.handPos();
    const L = 20, W = 0.6;
    this.line(p.pos, f, L, W, (e) => { this.hit(e, 24, { stagger: 0.4, unblockable: true, knock: f.clone().multiplyScalar(3) }); g.particles.burst(e.pos.clone().setY(e.pos.y + 1), { count: 8, color: PURPLE, speed: 5, life: 0.35, size: 0.1, shape: 1 }); });
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(tmp.copy(from).addScaledVector(f, s).setY(p.pos.y), f, 0.6, Math.PI, 30, p);
    g.fx.slashLine(from, f, L, PURPLE, 0.5, 0.25);
    g.fx.slashLine(from, f, L, 0xffd8ff, 0.18, 0.18);
    g.lights.flash(from.clone().addScaledVector(f, 5), PURPLE, 10, 12, 0.25);
    g.audio?.tone?.({ freq: 1200, to: 200, dur: 0.2, gain: 0.1, type: 'sawtooth', filter: 3000 });
  }
  purpleOrb() {
    const g = this.game, p = this.p, w = g.world;
    this.cast(0.6, true);
    const f = this.fwd();
    const orb = makeOrb(PURPLE, { radius: 1.3, coreColor: 0xffe0ff });
    const pos = p.pos.clone().addScaledVector(f, 1.6).setY(p.pos.y + 1.3);
    orb.position.copy(pos); g.scene.add(orb);
    const light = g.lights.attach(orb, PURPLE, 14, 14, { offsetY: 0, priority: 7 });
    const floorY = Math.floor(p.pos.y);
    const lastHit = new Map();
    g.audio?.energy('purple'); g.fx.flash(0xe0a0ff, 0.3, 0.2);
    this.during(2.4, (t, dt) => {
      pos.addScaledVector(f, 9 * dt);
      orb.position.copy(pos); orb.rotation.y += dt * 3; orb.scale.setScalar(1.3 * (1 + Math.sin(t * 30) * 0.05));
      g.particles.burst(pos, { count: 3, color: PURPLE, speed: 3, life: 0.5, size: 0.4, sizeEnd: 0.05 });
      for (const e of this.foes(pos, 2.2)) {
        if (g.time - (lastHit.get(e) ?? -9) < 0.3) continue; lastHit.set(e, g.time);
        this.hit(e, 34, { stagger: 0.6, unblockable: true, knock: f.clone().multiplyScalar(5) });
      }
      // erase what it rolls through (never digs below the floor you stood on)
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) for (let by = floorY; by <= floorY + 3; by++) {
        const bx = Math.floor(pos.x) + dx, bz = Math.floor(pos.z) + dz;
        if (Math.hypot(bx + 0.5 - pos.x, bz + 0.5 - pos.z, by + 0.5 - pos.y) > 1.9) continue;
        const id = w.get(bx, by, bz); if (!id || BLOCKS[id].liquid) continue;
        w.set(bx, by, bz, 0);
        if (Math.random() < 0.3) g.debris.spawn(new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5), new THREE.Vector3((Math.random() - 0.5) * 4, 4 + Math.random() * 4, (Math.random() - 0.5) * 4), 0.3, (tileAvgColor[BLOCKS[id].side] ?? new THREE.Color(0.5, 0.5, 0.5)).clone(), 2);
      }
      w.flush(8);
    }, () => {
      g.scene.remove(orb); g.lights.remove(light);
      g.fx.explosion(pos, PURPLE, 3); g.fx.screenWave(pos, 0.8, 0.4); g.shake(0.3);
    });
  }
  // -------------------------------------------------------------- Six Eyes
  teleport() {
    const g = this.game;
    const to = this.aimGround(12);
    if (!this.blink(to, { color: BLUE, iframes: 0.35 })) return false;
    g.fx.rings.spawn(tmp.set(to.x, this.p.pos.y + 0.06, to.z), { color: 0x9ad8ff, r0: 1.6, r1: 0.2, dur: 0.25, thick: 0.15 });
    g.audio?.energy('teleport');
  }
  insight() {
    const g = this.game, p = this.p;
    g.fx.flash(0x9ad8ff, 0.2, 0.2); g.audio?.charge?.(0.4, 0.5);
    g.toast?.('Six Eyes: everything is visible');
    this.statBuff('insight', 8, { crit: 0.35 }, {
      onStart: () => { this.ceMul *= 0.5; },
      onEnd: (disposing) => { if (!disposing) this.ceMul /= 0.5; },
      onTick: () => { if (Math.random() < 0.4) g.particles.glow.emit(p.pos.x + Math.sin(p.facing) * 0.25, p.pos.y + 1.75, p.pos.z + Math.cos(p.facing) * 0.25, (Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4, 0.4, 0.6, 1.4, 3, 0.08, 0, 1, 0.02, 1); },
    });
  }
  skyDrop() {
    const g = this.game, p = this.p;
    const to = this.aimGround(10);
    p.vel.y = 16; p.grounded = false; p.iframes = Math.max(p.iframes, 0.9);
    g.audio?.energy('blue');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: BLUE, r0: 0.3, r1: 2.4, dur: 0.3, thick: 0.15 });
    let phase = 0;
    this.during(2.2, (t) => {
      if (phase === 0) {
        g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.5, p.pos.z), { count: 2, color: BLUE, speed: 1, life: 0.3, size: 0.25, sizeEnd: 0.05 });
        if (t < 0.45) return true;
        phase = 1;
        const w = g.world;
        if (!w.solidAt(to.x, p.pos.y + 0.5, to.z) && !w.solidAt(to.x, p.pos.y + 1.5, to.z)) { g.fx.blinkPuff?.(p.pos, BLUE); p.pos.x = to.x; p.pos.z = to.z; }
        p.vel.set(0, -34, 0); p.iframes = Math.max(p.iframes, 0.8);
        return true;
      }
      g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 3, color: RED, speed: 1, life: 0.3, size: 0.4, sizeEnd: 0.05 });
      if (p.grounded || p.inLiquid) {
        const c = p.pos.clone().setY(p.pos.y + 0.6);
        g.combat.aoe(c, 5, 52 + this.rank('red_power') * 8, p, { knock: 16, stagger: 0.9, falloff: true });
        g.fx.explosion(c, RED, 4); g.fx.shockwave(p.pos, RED, 6); g.fx.landDust(p.pos, 30); g.fx.screenWave(c, 1, 0.45);
        g.shake(0.7); g.hitStop(0.07); g.audio?.energy('red'); g.audio?.impact(1.8);
        return false;
      }
    });
  }
  blackFlash() {
    const g = this.game, p = this.p;
    const t = this.target(7);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    tmp.subVectors(p.pos, t.pos).setY(0); if (tmp.lengthSq() < 0.01) tmp.set(0, 0, -1);
    this.blink(tmp3.copy(t.pos).add(tmp.setLength(t.radius + 1)), { color: 0xff2020, quiet: true });
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.5, windup: 0.3 }, style: 'punch', dur: 0.35, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0 };
    this.after(0.08, () => {
      if (t.dead) return;
      this.hit(t, 44, { melee: true, blackFlash: true, unblockable: true, crit: false, stagger: 1, knock: tmp.subVectors(t.pos, p.pos).setY(0).normalize().multiplyScalar(12) });
      g.combat.blackFlashFx(p, t);
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + t.height * 0.6), null, { color: 0xff2020, big: true });
      g.hitStop(0.1); g.shake(0.6); g.audio?.impact(1.8, 'crit');
      p.gainCE(15);
    });
  }
  restore() {
    const g = this.game, p = this.p;
    if (p.hp >= p.maxHp && this.library.infinity.cdLeft <= 0) { g.toast?.('Already at full health'); g.audio?.ui('back'); return false; }
    p.healOverTime = { left: p.maxHp * 0.3, t: 1.5 };
    this.library.infinity.cdLeft = 0;
    g.fx.heal(p.pos, 0x9affd8); g.audio?.energy('heal');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0x9affd8, r0: 0.3, r1: 3, dur: 0.5, thick: 0.15 });
    this.cast(0.5, true);
  }
  voidFlash() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const R = 12;
    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), infinityMaterial());
    sphere.renderOrder = 23; sphere.position.set(p.pos.x, p.pos.y + 1, p.pos.z); g.scene.add(sphere);
    const u = sphere.material.userData; u.hit.value = 1;
    g.fx.flash(0xffffff, 0.75, 0.3); g.fx.chroma(1.4); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1.4, 0.5);
    g.audio?.energy('void'); g.toast?.('Domain Expansion: 0.2 seconds');
    for (const e of this.foes(p.pos, R)) {
      this.stun(e, 3);
      e.flashT = 0.15;
      this.hit(e, 12, { stagger: 1, crit: false, ceGain: 0 });
      for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2, rr = 1.5 + Math.random() * 2; g.particles.glow.emit(e.pos.x + Math.cos(a) * rr, e.pos.y + e.height + 1.5, e.pos.z + Math.sin(a) * rr, -Math.cos(a) * rr * 2.5, -2.5, -Math.sin(a) * rr * 2.5, 0.45, 1.6, 1.9, 2.4, 0.08, 0, 0, 0.02, 1); }
    }
    this.during(0.55, (t, dt, k) => {
      sphere.position.set(p.pos.x, p.pos.y + 1, p.pos.z);
      const s = k < 0.35 ? (k / 0.35) * R : R * (1 - (k - 0.35) / 0.65 * 0.15);
      sphere.scale.setScalar(Math.max(0.1, s));
      u.alpha.value = k < 0.35 ? 1 : Math.max(0, 1 - (k - 0.35) / 0.65);
    }, () => g.scene.remove(sphere));
  }
  // passives that need a per-frame check
  passiveTick(dt) {
    const p = this.p;
    if (this.autoRct && p.hp > 0 && p.hp < p.maxHp * 0.35) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.02 * dt);
    if (this.autoInf != null) this.autoInf = Math.max(0, this.autoInf - dt);
  }
}
registerKit('gojo', GojoKit, GOJO_SKILLS);
