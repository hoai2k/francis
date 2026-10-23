// Curse attacks: one entry per attack, keyed by the name Enemy.startAttack()
// is given. An attack runs through the same phases on every curse:
//
//   spec(d)                    timings and telegraph from the curse def d:
//                                windup, recover, anim ('none' | 'raise' | 'cast'), style (swing anim),
//                                marker ('circle' | 'circleFront' | 'cone' | 'target' | 'here' | 'rect'),
//                                radius, range, front, width, max, track, color, lead (target marker:
//                                seconds of the target's motion to lead by), aimY (rect: sight height, 0.9)
//                              (the markers themselves are placed by Enemy.startAttack)
//   start(e, a)                the wind-up begins: sounds, flags
//   windup(e, a, dt, t, k)     every wind-up frame (k: 0..1 through the wind-up)
//   release(e, a, t, fwd)      the wind-up ends: the hit, or the switch to state 'active'
//   active(e, a, dt, t, move)  every frame while state is 'active'; call done(e) to recover,
//                              return true when it moved the body itself
//
// `a` is the running action ({ kind, ...spec }), `t` the curse's target and
// `fwd` its facing. An entry marked internal (the burrower's tunnel) is only
// reached from another attack.
import * as THREE from 'three/webgpu';
import { groundAhead } from '../physics.js';
import { angleDiff } from '../util.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();

const done = (e) => { e.state = 'recover'; e.stateT = 0; };

// the lantern's beam, the serpent's charge and the slit-mouth's lunge: a line
// that tracks the target for the first part of the wind-up, then locks
function trackLine(e, a, dt, t, k) {
  if (k < a.track && t) {
    e.faceTo(t.pos, dt, 8);
    a.len = e.clearLen(e.facing, a.max, a.aimY ?? 0.9);
    e.aimRect(e.marker, e.facing, Math.max(0.5, a.len), a.width);
  } else if (!a.locked) { a.locked = true; a.lockFace = true; e.game.audio?.warn(); }
}

// a lunging swipe in front (bite, slash, the shadow's ambush)
function swipe(lungeSpeed, color) {
  return (e, a, t, fwd) => {
    const g = e.game;
    e.lunge = fwd.clone().multiplyScalar(lungeSpeed);
    for (const p of g.hostileTargets()) {
      if (p.dead) continue;
      const to = tmp2.subVectors(p.pos, e.pos); const dist = to.setY(0).length();
      if (dist < a.range + p.radius && Math.abs(angleDiff(e.facing, Math.atan2(to.x, to.z))) < 1.0) e.hitPlayer(p, e.dmg, fwd.clone().multiplyScalar(5));
    }
    g.fx.slashArc(e.pos, e.facing, color, a.range, 0.3, 0.16);
    g.audio?.swing(0);
  };
}

// a shockwave on the marked circle (slam, the maw's chomp)
function groundHit(color, dmgMul) {
  return (e, a) => {
    const g = e.game;
    const c = a.center, R = (a.radius ?? 2.6) + 0.2;
    g.fx.shockwave(c, color, R + 0.4);
    g.shake(0.3);
    g.audio?.impact(1.8);
    for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(c) < R + p.radius) e.hitPlayer(p, e.dmg * dmgMul, tmp2.subVectors(p.pos, c).setY(0).normalize().multiplyScalar(10));
  };
}

// fly heads dive and grasshoppers pounce onto the circle marked at the wind-up
function leapRelease(dur) {
  return (e, a) => {
    if (!a.center) return;
    a.from = e.pos.clone(); a.t = 0; a.dur = dur;
    e.state = 'active';
  };
}
function leapActive(e, a, dt) {
  const g = e.game;
  const k = Math.min(1, a.t / a.dur), ease = a.kind === 'dive' ? k * k : k;
  e.pos.x = a.from.x + (a.center.x - a.from.x) * ease;
  e.pos.z = a.from.z + (a.center.z - a.from.z) * ease;
  e.pos.y = a.from.y + (a.center.y - a.from.y) * ease;
  e.vel.set(0, 0, 0); e.visY = e.pos.y;
  if (a.kind === 'dive') { e.floorY = e.pos.y; e.liftWant = 0.5 - (e.rig.float - 0.15 + 0.5) * ease; }
  else e.liftWant = 4 * k * (1 - k) * 2.4;
  if (k >= 1) {
    e.liftWant = a.kind === 'dive' ? -(e.rig.float - 0.15) : 0;
    const R = a.radius;
    if (a.kind === 'pounce') { g.fx.shockwave(a.center, 0xc8ff5a, R + 0.6); g.fx.landDust(a.center, 8); g.shake(0.25); g.audio?.impact(1.4); }
    else { g.fx.splat(tmp.copy(a.center).setY(a.center.y + 0.3), 0xff4a2a); g.audio?.impact(0.6); }
    for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(a.center) < R + (p.radius ?? 0.35)) e.hitPlayer(p, e.dmg, tmp.subVectors(p.pos, a.center).setY(0).normalize().multiplyScalar(a.kind === 'pounce' ? 8 : 4));
    e.grounded = true;
    done(e);
  }
  return true;
}

// the serpent's charge and the slit-mouth's lunge start moving on release
function lineRelease(e, a) {
  a.t = 0; a.dist = 0; a.hit = new Set(); e.hitWall = false;
  e.state = 'active';
}

export const ATTACKS = {
  // swarmers, transfigured humans, the burrowing hand once surfaced
  bite: {
    spec: (d) => ({ windup: d.windup, recover: 0.35, style: 'swingR', range: d.range + 0.3 }),
    release: swipe(6, 0xff4a4a),
  },
  // the bulwark's and the corpse doll's ground slam
  slam: {
    spec: (d) => ({ windup: d.windup, recover: 0.7, style: 'slam', range: 3, marker: 'circleFront' }),
    release: groundHit(0xff8a4a, 1),
  },
  // the bloater swells and bursts (explode() does the damage)
  inflate: {
    spec: (d) => ({ windup: d.windup, recover: 0.1, anim: 'none', marker: 'circle', radius: 3 }),
    start: (e, a) => e.game.audio?.charge(a.windup, 0.8),
    release: (e) => { e.hp = 0; e.die({}); },
  },
  spit: {
    spec: (d) => ({ windup: d.windup, recover: 0.4, anim: 'cast' }),
    release: (e, a, t) => { if (t) e.fireSpit(t, 0); e.game.audio?.energy('spit'); },
  },
  // the brood mother calls two or three imps
  summon: {
    spec: (d) => ({ windup: d.windup + 0.4, recover: 0.6, anim: 'raise', marker: 'summon' }),
    start: (e) => e.game.audio?.energy('summon'),
    release: (e) => {
      const g = e.game;
      const n = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a2 = e.facing + (i - (n - 1) / 2) * 0.9;
        const p = e.pos.clone().add(new THREE.Vector3(Math.sin(a2) * 1.8, 0, Math.cos(a2) * 1.8));
        const gy = g.world.standY(p.x, p.z, e.pos.y); if (!isFinite(gy)) continue;
        p.y = gy;
        g.spawnEnemy('imp', p, { summoned: true });
        g.fx.summonCircle(p, 0xff6ad8);
        e.summonCount++;
      }
    },
  },
  // the phantom's (and the grasshopper's close-range) slash
  slash: {
    spec: (d) => ({ windup: d.windup, recover: 0.4, style: 'swingL', range: d.range + 0.4, marker: 'cone' }),
    release: swipe(7, 0xd05aff),
  },

  // ------------------------------------------------------------ the wider bestiary
  dive: {
    spec: (d) => ({ windup: d.windup, recover: 0.7, anim: 'none', radius: 1.3, marker: 'target' }),
    start: (e, a) => e.game.audio?.tone({ freq: 160, to: 420, dur: a.windup, gain: 0.06, type: 'sawtooth', filter: 1500 }),
    windup: (e, a, dt, t, k) => { e.liftWant = 0.5 * k; if (a.center) e.faceTo(a.center, dt, 8); },
    release: leapRelease(0.3),
    active: leapActive,
  },
  // the womb splits open into imps
  burst: {
    spec: (d) => ({ windup: d.windup, recover: 0.1, anim: 'none', marker: 'circle', radius: 2.6 }),
    start: (e, a) => e.game.audio?.charge(a.windup, 1.3),
    release: (e) => e.wombBurst(),
  },
  pounce: {
    spec: (d) => ({ windup: d.windup, recover: 0.8, anim: 'none', radius: 2.1, marker: 'target', lead: 0.25 }),
    windup: (e, a, dt, t, k) => { e.liftWant = -0.15 * k; if (a.center) e.faceTo(a.center, dt, 8); },
    release: (e, a) => {
      if (!a.center) return;
      leapRelease(0.55)(e, a);
      e.game.audio?.whoosh(1); e.game.fx.landDust(e.pos, 6);
    },
    active: leapActive,
  },
  // the grave deity seals a player in a coffin
  coffin: {
    spec: (d) => ({ windup: d.windup, recover: 0.6, anim: 'raise', radius: 1.6, marker: 'target', color: 0xd040ff }),
    start: (e) => e.game.audio?.tone({ freq: 220, to: 180, dur: 1.2, gain: 0.12, type: 'triangle', rev: 0.6 }),
    release: (e, a) => {
      const g = e.game;
      const c = a.center; if (!c) return;
      g.fx.shockwave(c, 0xc060ff, 2.2);
      g.particles.burst(tmp2.copy(c).setY(c.y + 0.3), { count: 24, color: 0xb05aff, speed: 3, up: 2, life: 0.7, size: 0.18, drag: 2 });
      for (const p of g.hostileTargets()) if (!p.dead && !p.downed && p.isPlayer && p.pos.distanceTo(c) < a.radius + (p.radius ?? 0.35) && !(p.coffinT > 0) && p.iframes <= 0) e.trapInCoffin(p);
    },
  },
  // the lantern's sniper beam
  beam: {
    spec: (d) => ({ windup: d.windup, recover: 0.6, anim: 'none', marker: 'rect', width: 1.1, track: 0.58, max: d.range + 2, aimY: 1.6, color: 0xff6a20 }),
    start: (e, a) => e.game.audio?.charge(a.windup, 0.6),
    windup: (e, a, dt, t, k) => {
      trackLine(e, a, dt, t, k);
      if (Math.random() < 0.5) {
        // a thin aiming thread from the eye along the line
        const s = Math.random() * a.len;
        e.game.particles.glow.emit(e.pos.x + Math.sin(e.facing) * s, e.pos.y + 1.0 + (1 - s / Math.max(1, a.len)) * 1.2, e.pos.z + Math.cos(e.facing) * s, 0, 0, 0, 0.25, 2.4, 0.9, 0.2, 0.08, 0, 1, 0.1, 0);
      }
    },
    release: (e, a, t, fwd) => {
      const g = e.game;
      const from = tmp3.copy(e.pos).setY(e.pos.y + 2.1);
      g.fx.slashLine(from, tmp2.set(Math.sin(e.facing), -1.1 / Math.max(2, a.len), Math.cos(e.facing)).normalize(), a.len, 0xffb040, 0.7, 0.35);
      g.fx.slashLine(from, tmp2, a.len, 0xffffff, 0.3, 0.3, Math.PI / 2);
      g.lights?.flash(from, 0xffa040, 10, 8, 0.3);
      g.audio?.energy('blue');
      g.shake(0.15);
      for (const p of g.hostileTargets()) if (!p.dead && e.inRect(p, e.facing, a.len, a.width)) e.hitPlayer(p, e.dmg, fwd.clone().multiplyScalar(7));
    },
  },
  // the burrowing hand dives under the floor…
  dig: {
    spec: () => ({ windup: 0.45, recover: 0, anim: 'none' }),
    start: (e) => e.game.audio?.noise({ dur: 0.45, gain: 0.25, type: 'lowpass', freq: 600, sweep: 200 }),
    windup: (e, a, dt, t, k) => { e.liftWant = -1.4 * k; if (Math.random() < 0.6) e.game.fx.debris(tmp.copy(e.pos).setY(e.pos.y + 0.2), 0x5a4a3a, 1); },
    release: (e) => {
      e.burrowed = true; e.untargetable = true;
      e.action = { kind: 'tunnel', t: 0, anim: 'none' };
      e.state = 'active';
      e.game.fx.debris(tmp2.copy(e.pos).setY(e.pos.y + 0.3), 0x5a4a3a, 6);
    },
  },
  // …races under it toward the target…
  tunnel: {
    internal: true,
    active: (e, a, dt, t, move) => {
      e.liftWant = -1.4;
      if (!t || a.t > 3.2) { e.startAttack('emerge'); return false; }
      const toT = tmp.subVectors(t.pos, e.pos).setY(0);
      if (toT.length() < 0.8) { e.startAttack('emerge'); return false; }
      move.copy(e.steer(toT, 1.7));
      e.faceTo(t.pos, dt);
      return false;
    },
  },
  // …and bursts up under it
  emerge: {
    spec: () => ({ windup: 0.9, recover: 0.8, anim: 'none', marker: 'here', radius: 1.9 }),
    windup: (e) => {
      const g = e.game;
      if (Math.random() < 0.7) g.fx.debris(tmp.set(e.pos.x + (Math.random() - 0.5) * 2.4, e.pos.y + 0.1, e.pos.z + (Math.random() - 0.5) * 2.4), 0x5a4a3a, 1);
      if (Math.random() < 0.15) g.shake(0.06);
    },
    release: (e, a) => {
      const g = e.game;
      const c = a.center ?? e.pos;
      e.burrowed = false; e.untargetable = false;
      e.pos.x = c.x; e.pos.z = c.z; e.liftOff = -0.8;
      g.fx.debris(tmp2.copy(c).setY(c.y + 0.4), 0x5a4a3a, 12); g.fx.shockwave(c, 0xa08a6a, 2.4); g.shake(0.3); g.audio?.impact(1.6);
      for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(c) < a.radius + (p.radius ?? 0.35)) e.hitPlayer(p, e.dmg, tmp2.subVectors(p.pos, c).setY(0).normalize().multiplyScalar(8));
    },
  },
  // the serpent charges down the line, knocking players aside
  charge: {
    spec: (d) => ({ windup: d.windup, recover: 1.0, anim: 'none', marker: 'rect', width: 2.0, track: 0.45, max: 14 }),
    windup: trackLine,
    release: (e, a) => { lineRelease(e, a); e.game.audio?.energy('red'); },
    active: (e, a, dt, t, move) => {
      const g = e.game;
      const fwd = tmp.set(Math.sin(e.facing), 0, Math.cos(e.facing));
      const sp = 15;
      a.dist = (a.dist ?? 0) + sp * dt;
      const ahead = groundAhead(g.world, e.pos.x + fwd.x * 1.2, e.pos.y, e.pos.z + fwd.z * 1.2, 2.2);
      if (!ahead || e.hitWall || a.dist > a.len + 0.5) {
        if (e.hitWall) { g.shake(0.2); g.fx.debris(tmp3.copy(e.pos).addScaledVector(fwd, 0.8).setY(e.pos.y + 0.6), 0x8a8a8a, 4); }
        e.vel.set(0, e.vel.y, 0); e.knock.set(0, 0, 0);
        done(e); return false;
      }
      move.copy(fwd).multiplyScalar(sp);
      e.vel.x = move.x; e.vel.z = move.z;
      a.hit = a.hit ?? new Set();
      for (const p of g.hostileTargets()) {
        if (p.dead || a.hit.has(p)) continue;
        if (p.pos.distanceTo(e.pos) < e.radius + (p.radius ?? 0.35) + 0.5) {
          a.hit.add(p);
          const side = tmp3.set(fwd.z, 0, -fwd.x); if (side.dot(tmp2.subVectors(p.pos, e.pos)) < 0) side.negate();
          e.hitPlayer(p, e.dmg, side.multiplyScalar(9).addScaledVector(fwd, 5));
          g.audio?.impact(1.6); g.shake(0.25);
        }
      }
      if (Math.random() < 0.8) g.fx.landDust(e.pos, 3);
      return false;
    },
  },
  // the slit-mouth's head shoots out along the line, bites, and reels back in
  lunge: {
    spec: (d) => ({ windup: d.windup, recover: 0.6, anim: 'none', marker: 'rect', width: 1.4, track: 0.5, max: d.range }),
    windup: trackLine,
    release: lineRelease,
    active: (e, a) => {
      const g = e.game;
      const dur = 0.6, k = Math.min(1, a.t / dur);
      e.neckExt = (k < 0.22 ? k / 0.22 : k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5) * Math.max(0.5, a.len - 0.4);
      if (!a.hitDone && k >= 0.2) {
        a.hitDone = true;
        const fwd = tmp.set(Math.sin(e.facing), 0, Math.cos(e.facing));
        for (const p of g.hostileTargets()) if (!p.dead && e.inRect(p, e.facing, a.len, a.width)) e.hitPlayer(p, e.dmg, fwd.clone().multiplyScalar(6));
        g.fx.slashLine(tmp3.copy(e.pos).setY(e.pos.y + 2.3), fwd, a.len, 0xff3a4a, 0.25, 0.18);
        g.audio?.energy('slash');
      }
      if (k >= 1) { e.neckExt = 0; done(e); }
      return false;
    },
  },
  // the maw turret bites whatever comes close…
  chomp: {
    spec: () => ({ windup: 0.7, recover: 0.7, anim: 'none', marker: 'circleFront', radius: 2.5, front: 1.3 }),
    release: groundHit(0xff4a5a, 1.5),
  },
  // …and lobs three spits at range
  volley: {
    spec: (d) => ({ windup: d.windup, recover: 0.5, anim: 'none' }),
    release: (e, a, t) => { if (t) for (const o of [-0.28, 0, 0.28]) e.fireSpit(t, o); e.game.audio?.energy('spit'); },
  },
  // the ash spirit flares up and leaves the ground burning
  flare: {
    spec: (d) => ({ windup: d.windup, recover: 0.5, anim: 'raise', marker: 'circle', radius: 2.4 }),
    release: (e, a) => {
      const g = e.game;
      g.fx.explosion(e.pos, 0xff6a1a, 2.2); g.audio?.energy('fire'); g.shake(0.2);
      for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(e.pos) < a.radius + (p.radius ?? 0.35)) e.hitPlayer(p, e.dmg, tmp2.subVectors(p.pos, e.pos).setY(0).normalize().multiplyScalar(7));
      g.hazards.add({ pos: e.pos, radius: 1.6, dps: e.dmg * 0.5, dur: 3, color: 0xff6a1a });
    },
  },
  // the bodhisattva heals and empowers the curses round it
  bless: {
    spec: (d) => ({ windup: d.windup, recover: 0.6, anim: 'raise', marker: 'circle', radius: 7, color: 0x4aff7a }),
    start: (e, a) => e.game.audio?.tone({ freq: 330, to: 660, dur: a.windup, gain: 0.1, type: 'sine', rev: 0.6 }),
    release: (e, a) => {
      const g = e.game;
      g.fx.shockwave(e.pos, 0x5aff8a, a.radius);
      g.audio?.energy('heal');
      for (const o of e.alliesNear(a.radius)) {
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.15);
        o.empowerT = 8;
        g.fx.heal(o.pos, 0x6aff8a);
      }
    },
  },
  // the shadow strikes from its cloak, then withdraws
  ambush: {
    spec: (d) => ({ windup: d.windup, recover: 0.5, style: 'swingR', range: d.range, marker: 'cone' }),
    start: (e) => { e.revealT = Math.max(e.revealT, 0.5); },
    release: (e, a, t, fwd) => {
      swipe(9, 0xb07aff)(e, a, t, fwd);
      e.retreatT = 1.6; e.revealT = Math.max(e.revealT, 1.0);
    },
  },
};
