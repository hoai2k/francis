// Pokémon power-ups (see ../abilities.js for the contract). Models in ./pokemon-fx.js.
//   Snorlax       – a sleeping Snorlax dropped behind you (or tossed ahead) blocks part of the
//                   road, snoring; karts that hit it bounce off its belly and spin out
//   Protect       – a green Protect dome for 6 s: every hit is blocked and shots bounce away
//   Poké Ball     – thrown, it homes in on the kart ahead and catches it: sucked inside, the ball
//                   wobbles three times, then it bursts out (about 1.5 s lost)
//   Quick Attack  – three dashes with white speed lines that bump aside karts you touch
//   Thunderbolt   – Pikachu's lightning strikes every racer ahead: they spin out and shrink
import * as THREE from 'three';
import { disposeOwned, snorlaxModel, protectDome, ballModel, beamMesh, stretch, boltMesh, glowSprite, speedLines, prewarmAll } from './pokemon-fx.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const LOC = {};
const TAU = Math.PI * 2, PI = Math.PI;
const wrapA = (a) => a - TAU * Math.floor((a + PI) / TAU);
const angleDiff = (a, b) => wrapA(b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const live = (o) => !!o && !o.finished && !(o.respawn > 0);
const gapTo = (k, o) => (o ? Math.abs(o.raceDist - k.raceDist) : Infinity);
const chest = (o, out, h = 1.2) => out.copy(o.pos).setY(o.pos.y + h * (o.megaScale || 1));

// sounds, attenuated by distance to the nearest listener
function snd(ctx, pos, fn) {
  const au = ctx.audio;
  if (!au?.ctx) return;
  const a = pos && au.att ? au.att(pos) : 1;
  if (a > 0.03) fn(au, a);
}
const thunder = (ctx, pos, v = 1) => snd(ctx, pos, (au, a) => {
  a *= v;
  au.noiseHit(0.1, { vol: 0.5 * a, freq: 5200, q: 0.6, type: 'highpass' });
  au.noiseHit(1.3, { vol: 0.5 * a, freq: 240, type: 'lowpass', at: 0.04 });
  au.tone(60, 0.9, { vol: 0.2 * a, type: 'sawtooth', slide: 0.6, filter: 380, at: 0.03 });
  for (let i = 0; i < 4; i++) au.noiseHit(0.05, { vol: 0.22 * a, freq: 3000 + Math.random() * 3000, q: 4, at: 0.08 + i * 0.06 });
});
const zap = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.noiseHit(0.16, { vol: 0.3 * a, freq: 3800, q: 1.2, sweep: 0.4 });
  au.tone(1200, 0.14, { vol: 0.07 * a, type: 'square', slide: 0.4, filter: 3000 });
});
const whoosh = (ctx, pos, f = 900) => snd(ctx, pos, (au, a) => au.noiseHit(0.4, { vol: 0.3 * a, freq: f, sweep: 2.4, q: 1.4 }));
const click = (ctx, pos, v = 1) => snd(ctx, pos, (au, a) => { au.tone(1900, 0.05, { vol: 0.12 * a * v, type: 'square' }); au.noiseHit(0.04, { vol: 0.2 * a * v, freq: 4000, q: 3 }); });

function groundAt(ctx, e) {
  e.loc = ctx.track.locate(e.pos.x, e.pos.y, e.pos.z, e.si ?? 0, e.loc || {});
  e.si = e.loc.i;
  return e.loc;
}
function steer(e, aim, turn, dt) {
  const want = Math.atan2(aim.x - e.pos.x, aim.z - e.pos.z);
  e.yaw = wrapA(e.yaw + clamp(angleDiff(e.yaw, want), -turn * dt, turn * dt));
  e.pos.x += Math.sin(e.yaw) * e.speed * dt;
  e.pos.z += Math.cos(e.yaw) * e.speed * dt;
}
function homeIn(e, aim, dt) {
  const d = V3.subVectors(aim, e.pos), L = d.length();
  if (L > 1e-4) e.pos.addScaledVector(d, Math.min(1, (e.speed * dt) / L));
  e.yaw = Math.atan2(d.x, d.z);
}

// ============================================================================================
// Snorlax: a sleeping road block
// ============================================================================================
const LAX_TIME = 12, LAX_R = 3.0;
class Snorlax {
  constructor(k, ctx, fwd) {
    this.k = k; this.ctx = ctx; this.t = 0; this.out = 0; this.squash = 0;
    const f = k.forward(V1);
    this.pos = k.pos.clone().addScaledVector(f, fwd ? 4.5 : -6);
    this.pos.y += fwd ? 1.5 : 2.2;
    this.vel = fwd ? f.clone().multiplyScalar(14 + Math.max(0, k.speed) * 0.45).setY(11) : new THREE.Vector3(0, 3, 0);
    this.air = true; this.si = k.loc.i ?? 0;
    this.yaw = k.yaw + PI;   // its belly faces whoever comes next
    this.model = snorlaxModel();
    this.rig = this.model.userData.rig;
    this.model.scale.setScalar(0.2);
    ctx.scene.add(this.model);
    this.cool = new Map();
    this.snore = 1.2;
    // it pops out of a Poké Ball
    ctx.fx.pop(this.pos, 0xffffff); ctx.fx.pop(this.pos, 0xd0262a);
    snd(ctx, k.pos, (au, a) => { au.tone(700, 0.12, { vol: 0.1 * a, type: 'square', slide: 1.6 }); au.noiseHit(0.2, { vol: 0.25 * a, freq: 2400, q: 1 }); });
  }
  update(dt) {
    const ctx = this.ctx, fx = ctx.fx;
    this.t += dt;
    const L = groundAt(ctx, this);
    if (this.air) {
      this.vel.y -= 40 * dt;
      this.pos.addScaledVector(this.vel, dt);
      const ok = !L.gap && Math.abs(L.lat) < L.hw + L.sh;
      if (ok && this.pos.y <= L.y && this.vel.y < 0) {
        this.pos.y = L.y; this.air = false;
        // the ground shakes as it lands
        ctx.ring(this.pos, 7, 0xdfe8ee);
        for (let j = 0; j < 10; j++) fx.puff(this.pos.x + rnd(2.5), this.pos.y + 0.3, this.pos.z + rnd(2.5), rnd(4), 2 + Math.random() * 2, rnd(4), 0xd8d0c0, 0.8);
        snd(ctx, this.pos, (au, a) => { au.noiseHit(0.4, { vol: 0.45 * a, freq: 160, type: 'lowpass' }); au.tone(70, 0.35, { vol: 0.25 * a, type: 'sine', slide: 0.5 }); });
        for (const c of ctx.race.cams || []) if (c.kart.pos.distanceTo(this.pos) < 25) c.chase.shake = Math.max(c.chase.shake || 0, 0.5);
      }
      if (this.pos.y < L.y - 15) return false;
    } else {
      // stay on the road (never out past the edge)
      const lim = Math.max(1, L.hw - 1.5);
      if (Math.abs(L.lat) > lim) { const pen = (Math.abs(L.lat) - lim) * Math.sign(L.lat); this.pos.x -= L.rx * pen; this.pos.z -= L.rz * pen; }
      if (!L.gap) this.pos.y = L.y;
    }
    // appear, sleep, then get up and wander off (pop back into its ball)
    const grow = Math.min(1, this.t / 0.35), leave = this.t > LAX_TIME ? Math.min(1, (this.t - LAX_TIME) / 0.4) : 0;
    if (leave >= 1) { fx.pop(this.pos, 0xffffff); fx.pop(this.pos, 0xd0262a); return false; }
    this.squash = Math.max(0, this.squash - dt * 3);
    const s = (0.2 + 0.8 * (1 - (1 - grow) ** 3)) * (1 - leave);
    this.model.scale.set(s * (1 + this.squash * 0.18), s * (1 - this.squash * 0.22), s * (1 + this.squash * 0.18));
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw + (this.air ? this.t * 4 : 0);
    this.rig.idle?.(this.t, dt);
    this.rig.fx?.('taunt', 0.5, this.t);
    // snoring
    if (!this.air && (this.snore -= dt) <= 0) {
      this.snore = 2.6;
      snd(ctx, this.pos, (au, a) => { au.noiseHit(0.9, { vol: 0.22 * a, freq: 180, q: 2, type: 'bandpass', sweep: 1.6 }); au.tone(85, 0.9, { vol: 0.08 * a, type: 'sawtooth', filter: 300, slide: 1.2 }); });
    }
    if (this.air || grow < 0.6) return true;
    // karts bounce off its belly and spin out
    const R0 = LAX_R * s;
    for (const o of ctx.race.karts) {
      if (!live(o) || (o === this.k && this.t < 1.2)) continue;
      const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, R = R0 + ((o.megaScale || 1) - 1) * 1.6;
      const d2 = dx * dx + dz * dz;
      if (d2 > R * R || Math.abs(o.pos.y - this.pos.y) > 4 || (!o.grounded && o.pos.y > this.pos.y + 3.5)) continue;
      // super-powered karts (star, bullet, mega) knock it right out of the way
      if (o.bulletTime > 0 || o.megaTime > 0 || o.goldenTime > 0) {
        fx.debris(this.pos.clone().setY(this.pos.y + 2), [0x2e5f73, 0xf0e0bc], 10, 1);
        snd(ctx, this.pos, (au, a) => au.tone(260, 0.4, { vol: 0.15 * a, type: 'triangle', slide: 0.4 }));
        this.t = Math.max(this.t, LAX_TIME);
        return true;
      }
      const d = Math.sqrt(d2) || 1, nx = dx / d, nz = dz / d;
      // push out of the body, then a springy bounce away from the belly
      o.pos.x = this.pos.x + nx * R; o.pos.z = this.pos.z + nz * R;
      const last = this.cool.get(o) ?? -9;
      if (this.t - last < 0.6) continue;
      this.cool.set(o, this.t);
      const w = o.weight || 1, v = 10 + Math.max(0, o.speed) * 0.35;
      o.shove(nx * v / w, nz * v / w, rnd(1.2));
      if (o.speed > 0) o.speed *= 0.4;
      this.squash = 1;
      ctx.hit(o, 'spin', this.k, 'snorlax');
      o.anim?.play('bonk');
      snd(ctx, o.pos, (au, a) => { au.tone(140, 0.25, { vol: 0.25 * a, type: 'sine', slide: 2.2 }); au.noiseHit(0.15, { vol: 0.2 * a, freq: 400, type: 'lowpass' }); });
      fx.pop(o.pos.clone().setY(o.pos.y + 1), 0xf0e0bc);
    }
    return true;
  }
  danger(p, r) { return !this.air && p.distanceToSquared(this.pos) < (r + LAX_R) ** 2; }
  dispose() { disposeOwned(this.model); }
}

// ============================================================================================
// Protect: a green barrier dome; nothing gets through, shots bounce off
// ============================================================================================
const PROTECT_TIME = 6;
class Protect {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx; this.t = 0; this.end = PROTECT_TIME; this.blocked = 0;
    this.dome = protectDome();
    k.model.root.add(this.dome);
    // while it's up, every hit is blocked (without using up a Brick Shield)
    const self = this, base = Object.getPrototypeOf(k).shieldBlocks;
    this.wrap = function () { if (self.t < self.end) { self.ping(k.pos); return true; } return base.call(k); };
    k.shieldBlocks = this.wrap;
    ctx.ring(k.pos, 8, 0x5aff7a);
    snd(ctx, k.pos, (au, a) => {
      for (const [f, d] of [[523, 0], [784, 0.06], [1047, 0.12]]) au.tone(f, 0.5, { vol: 0.07 * a, type: 'triangle', at: d, slide: 1.02 });
      au.noiseHit(0.5, { vol: 0.18 * a, freq: 1400, sweep: 2.5, q: 1.2 });
    });
  }
  extend() { this.end = this.t + PROTECT_TIME; }
  ping(p) {
    this.blocked = 1;
    this.ctx.fx.pop(p, 0x8aff9a);
    snd(this.ctx, p, (au, a) => { au.tone(1568, 0.25, { vol: 0.09 * a, type: 'triangle', slide: 0.97 }); au.noiseHit(0.1, { vol: 0.2 * a, freq: 5000, q: 1 }); });
  }
  update(dt) {
    const k = this.k, ctx = this.ctx, items = ctx.race.items;
    this.t += dt;
    if (this.t >= this.end || k.finished) return false;
    const R = 6.5 * (k.megaScale || 1);
    // shots bounce off the dome; rockets and diving seekers burst on it
    for (const p of items.proj) {
      if (p.owner === k || p.life <= 0) continue;
      if (p.type === 'seeker' && !p.diving) continue;
      const r = R + (p.type === 'seeker' ? 3 : 0) + (p.speed || 0) * 0.03;
      if (p.pos.distanceToSquared(k.pos) > r * r || Math.abs(p.pos.y - k.pos.y) > 8) continue;
      if (p.type === 'rocket' || p.type === 'seeker') { p.life = 0; p.mesh.visible = false; this.ping(p.pos); continue; }
      const a = Math.atan2(p.pos.x - k.pos.x, p.pos.z - k.pos.z);
      p.yaw = a; p.owner = k; p.safe = 0.8; p.target = null;
      p.pos.x = k.pos.x + Math.sin(a) * (R + 0.5); p.pos.z = k.pos.z + Math.cos(a) * (R + 0.5);
      this.ping(p.pos);
      ctx.audio.sfx('bounce', p.pos);
    }
    for (const e of items.ents) if (e !== this && e.deflect && e.k !== k && e.kart !== k) e.deflect(k.pos, R, k);
    // the dome pulses and flickers out in its last second
    const D = this.dome, u = D.userData, left = this.end - this.t;
    const fade = Math.min(1, this.t * 5) * (left < 1.2 ? (Math.floor(this.t * 14) % 2 ? 0.35 : 1) : 1);
    u.shell.material.opacity = (0.22 + Math.sin(this.t * 8) * 0.05 + this.blocked * 0.35) * fade;
    u.lat.material.opacity = (0.6 + this.blocked * 0.4) * fade;
    u.lat.rotation.y += dt * 0.6;
    D.scale.set(2.9, 2.4, 3.3).multiplyScalar(Math.min(1, 0.4 + this.t * 4) * (1 + this.blocked * 0.1));
    this.blocked = Math.max(0, this.blocked - dt * 3);
    return true;
  }
  dispose() {
    if (this.k.shieldBlocks === this.wrap) delete this.k.shieldBlocks;
    disposeOwned(this.dome);
    if (this.k.pkProtect === this) this.k.pkProtect = null;
  }
}

// ============================================================================================
// Poké Ball: homes in, catches the kart, wobbles three times, then it bursts out
// ============================================================================================
const BALL_R = 0.42, CATCH = 0.35, WOBBLE = 1.05, BURST = 0.2;
class Ball {
  constructor(k, ctx, back) {
    this.k = k; this.ctx = ctx; this.t = 0; this.phase = 'fly';
    this.dir = back ? -1 : 1;
    this.target = (back ? ctx.behind(k, 1) : ctx.ahead(k, 1)).find(live) || null;
    this.mesh = ballModel(); this.mesh.scale.setScalar(BALL_R);
    ctx.scene.add(this.mesh);
    this.pos = chest(k, new THREE.Vector3(), 2.0).addScaledVector(k.forward(V1), back ? -3.5 : 2.2);
    this.yaw = back ? wrapA(k.yaw + PI) : k.yaw;
    this.speed = Math.max(84, Math.abs(k.speed) + 40);
    this.si = k.loc.i ?? 0;
    this.beam = beamMesh(); this.beam.visible = false; ctx.scene.add(this.beam);
    this.glow = glowSprite(0xff4a3a, 1.6, 0.8); this.glow.visible = false; ctx.scene.add(this.glow);
    whoosh(ctx, k.pos, 1200);
  }
  update(dt) {
    const ctx = this.ctx, fx = ctx.fx, k = this.k;
    this.t += dt;
    if (this.phase === 'fly') return this.fly(dt);
    const o = this.o, T = this.t, M = this.mesh, sp = M.userData.spin;
    if (!live(o)) { this.release(false); return false; }
    // hold the caught kart in place, shrunk away inside the ball
    o.pos.copy(this.hold); o.speed = 0; o.vy = 0; o.kvx = o.kvz = 0; o.grounded = true;
    o.cancelDrift?.();
    if (T < CATCH) {
      // sucked in by a red beam
      const f = T / CATCH;
      o.model.root.scale.multiplyScalar(Math.max(0.02, 1 - f));
      o.model.root.position.lerp(V1.copy(this.pos), f * 0.8);
      this.beam.visible = true;
      stretch(this.beam, this.pos, chest(o, V2, 0.9), 0.5 + f * 0.6);
      this.beam.material.opacity = 0.8 * (1 - f * 0.5);
      this.pos.y += (this.ground + 2.2 - this.pos.y) * Math.min(1, dt * 8);
      sp.rotation.x = -0.5; sp.rotation.z = 0;
      if (Math.random() < 0.7) fx.spark(this.pos.x + rnd(1), this.pos.y + rnd(1), this.pos.z + rnd(1), rnd(3), rnd(3), rnd(3), 0xff6a5a, 0.3);
    } else if (T < CATCH + WOBBLE) {
      // the ball drops to the ground and wobbles three times, the button blinking red
      o.model.root.visible = false;
      this.beam.visible = false;
      const f = (T - CATCH) / WOBBLE, n = Math.floor(f * 3), u = f * 3 - n;
      this.pos.y += (this.ground + BALL_R * 2 * 0.95 - this.pos.y) * Math.min(1, dt * 14);
      sp.rotation.x = 0;
      sp.rotation.z = Math.sin(u * PI * 2) * 0.45 * Math.sin(u * PI);
      if (n !== this.wob) { this.wob = n; click(this.ctx, this.pos); }
      this.glow.visible = u < 0.5;
      this.glow.position.copy(this.pos).addScaledVector(V1.set(Math.sin(this.face), 0, Math.cos(this.face)), BALL_R * 2.1);
    } else if (T < CATCH + WOBBLE + BURST) {
      // ... and it bursts open
      if (!this.burst) {
        this.burst = true; this.glow.visible = false;
        this.release(true);
        fx.pop(this.pos, 0xffffff); fx.pop(this.pos, 0xff4a3a);
        for (let j = 0; j < 22; j++) fx.spark(this.pos.x, this.pos.y + 0.5, this.pos.z, rnd(9), 3 + Math.random() * 7, rnd(9), j % 2 ? 0xffffff : 0xff4a3a, 0.5, -10);
        ctx.ring(this.pos, 6, 0xffffff);
        snd(ctx, this.pos, (au, a) => { au.noiseHit(0.3, { vol: 0.35 * a, freq: 1800, sweep: 0.5, q: 1 }); au.tone(440, 0.25, { vol: 0.1 * a, type: 'square', slide: 1.8, filter: 2400 }); });
      }
      M.scale.setScalar(BALL_R * 2 * (1 + (T - CATCH - WOBBLE) / BURST * 0.6));
    } else return false;
    M.position.copy(this.pos);
    if (this.phase === 'caught' && T >= CATCH) M.scale.setScalar(BALL_R * 2 * (this.burst ? 1 : 1 + Math.max(0, 0.15 - (T - CATCH)) * 2));
    return true;
  }
  fly(dt) {
    const ctx = this.ctx, fx = ctx.fx, k = this.k;
    if (this.dead || this.t > 4) { this.fizzle(); return false; }
    const L = groundAt(ctx, this), gy = L.y;
    const tg = live(this.target) && !this.target.pkCaught ? this.target : null;
    if (tg) {
      const aim = chest(tg, V2, 1.1), d = aim.distanceTo(this.pos);
      if (d < 14) homeIn(this, aim, dt);
      else {
        if (d < 55) steer(this, aim, 9, dt);
        else steer(this, ctx.at(L.i + 14 * this.dir, 0, 0, V1), 6, dt);
        this.pos.y += (Math.max(gy + 1.8, aim.y) - this.pos.y) * Math.min(1, dt * 6);
      }
    } else {
      steer(this, ctx.at(L.i + 14 * this.dir, 0, 0, V1), 6, dt);
      this.pos.y += (gy + 1.6 - this.pos.y) * Math.min(1, dt * 6);
      if (this.t > 2.2) { this.fizzle(); return false; }
    }
    for (const o of ctx.race.karts) {
      if ((o === k && this.t < 0.6) || !live(o) || o.pkCaught) continue;
      const r = 2.5 * (o.megaScale || 1);
      if (o.pos.distanceToSquared(this.pos) < r * r && Math.abs(o.pos.y + 1 - this.pos.y) < 3 * (o.megaScale || 1)) { this.capture(o); return true; }
    }
    this.mesh.position.copy(this.pos);
    const sp = this.mesh.userData.spin;
    sp.rotation.y = this.yaw; sp.rotation.x += dt * 16;
    if (Math.random() < 0.6) fx.spark(this.pos.x, this.pos.y, this.pos.z, rnd(1.5), rnd(1.5), rnd(1.5), Math.random() < 0.5 ? 0xff4a3a : 0xffffff, 0.3);
    return true;
  }
  capture(o) {
    const ctx = this.ctx;
    // shields, Protect, stars and the like: it bounces off and pops
    if (!ctx.hit(o, 'spin', this.k, 'pokeball')) { this.fizzle(); this.dead = true; this.phase = 'fly'; this.t = 99; return; }
    this.phase = 'caught'; this.o = o; this.t = 0; o.pkCaught = this;
    this.hold = o.pos.clone();
    groundAt(ctx, this);
    this.ground = this.hold.y;
    this.face = Math.atan2(this.k.pos.x - o.pos.x, this.k.pos.z - o.pos.z);
    // the button faces the thrower; the inner spin rocks side to side for the wobbles
    this.mesh.rotation.set(0, this.face, 0);
    this.mesh.userData.spin.rotation.set(0, 0, 0);
    ctx.fx.pop(this.pos, 0xff4a3a);
    snd(ctx, this.pos, (au, a) => { au.tone(1400, 0.35, { vol: 0.1 * a, type: 'sine', slide: 0.35 }); au.noiseHit(0.35, { vol: 0.25 * a, freq: 2600, sweep: 0.3, q: 1.5 }); });
  }
  release(ok) {
    const o = this.o;
    if (!o || o.pkCaught !== this) return;
    o.pkCaught = null;
    o.model.root.visible = true;
    if (ok && live(o)) {
      o.invuln = Math.max(o.invuln, 1.2);
      o.vy = 6; o.grounded = false;
      o.emote?.('ouch');
    }
  }
  fizzle() { if (!this.popped) { this.popped = true; this.ctx.fx.pop(this.pos, 0xffffff); this.ctx.fx.pop(this.pos, 0xff4a3a); } }
  // blocked (Protect, Force Push…): the ball is knocked away
  deflect(pos, r) { if (this.phase === 'fly' && this.pos.distanceToSquared(pos) < r * r) this.dead = true; }
  dispose() {
    this.release(true);
    this.ctx.scene.remove(this.mesh);
    disposeOwned(this.beam); this.ctx.scene.remove(this.glow);
  }
}

// ============================================================================================
// Quick Attack: a burst of speed with white speed lines; bumps aside anyone you touch
// ============================================================================================
const QA_TIME = 0.75;
class QuickAttack {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx;
    this.lines = speedLines();
    k.model.root.add(this.lines);
    this.dash();
  }
  dash() {
    const k = this.k, ctx = this.ctx;
    this.t = 0; this.hitSet = new Set([k]);
    k.boost(0.75);
    k.speed = Math.max(k.speed, k.topSpeed * 1.38);
    whoosh(ctx, k.pos, 1400);
    snd(ctx, k.pos, (au, a) => au.tone(1320, 0.18, { vol: 0.06 * a, type: 'triangle', slide: 1.6 }));
    for (let j = 0; j < 8; j++) ctx.fx.puff(k.pos.x + rnd(1), k.pos.y + 0.6, k.pos.z + rnd(1), rnd(3), 1, rnd(3), 0xffffff, 0.4);
  }
  update(dt) {
    const k = this.k, ctx = this.ctx, fx = ctx.fx;
    this.t += dt;
    if (this.t > QA_TIME || !live(k)) return false;
    const f = this.t / QA_TIME;
    if (k.grounded && !k.stunned && k.speed < k.topSpeed * 1.3) k.speed += 70 * dt;
    // the lines stream back past the kart
    const { lines, mat } = this.lines.userData;
    mat.opacity = 0.85 * Math.min(1, f * 6) * (1 - f * f);
    for (const m of lines) {
      const u = m.userData, w = ((this.t * 5 + u.ph) % 1);
      m.position.set(u.x, u.y, u.z - w * 3.5);
      m.scale.set(0.05, 0.05, 2.2 + Math.sin(u.ph * 9) * 0.8);
    }
    if (Math.random() < 0.5) fx.puff(k.pos.x + rnd(1.2), k.pos.y + 0.8 + Math.random(), k.pos.z + rnd(1.2), 0, 0.5, 0, 0xf4f8ff, 0.35);
    // bump aside anyone touched
    const fwd = k.forward(V1);
    for (const o of ctx.race.karts) {
      if (this.hitSet.has(o) || !live(o)) continue;
      const r = 3.4 * Math.max(k.megaScale || 1, o.megaScale || 1);
      if (o.pos.distanceToSquared(k.pos) > r * r || Math.abs(o.pos.y - k.pos.y) > 2.5) continue;
      this.hitSet.add(o);
      const side = Math.sign((o.pos.x - k.pos.x) * fwd.z - (o.pos.z - k.pos.z) * fwd.x) || 1;
      const w = o.weight || 1, sx = fwd.z * side, sz = -fwd.x * side;
      o.shove((sx * 18 + fwd.x * 4) / w, (sz * 18 + fwd.z * 4) / w, side * 1.5);
      o.anim?.play('bonk');
      o.player?.rumble(0.4, 150);
      fx.pop(V2.copy(o.pos).add(k.pos).multiplyScalar(0.5).setY(o.pos.y + 1), 0xffffff);
      ctx.audio.sfx('bump', o.pos);
      ctx.race.onProjectileHit?.(k, o, 'quickattack');
    }
    return true;
  }
  dispose() {
    disposeOwned(this.lines);
    if (this.k.pkQuick === this) this.k.pkQuick = null;
  }
}

// ============================================================================================
// Thunderbolt: lightning strikes every racer ahead; they spin out and shrink for a while
// ============================================================================================
const SHRINK_TIME = 4, SHRINK = 0.55;
function thunderbolt(k, ctx) {
  const order = ctx.race.order, my = order.indexOf(k);
  const victims = order.slice(0, Math.max(0, my)).filter(live);
  // Pikachu's charge goes up into the sky from the caster…
  ctx.spawn(new Bolt(ctx, k, null, 0, true));
  thunder(ctx, k.pos, 0.8);
  ctx.race.flash?.(0xfff4a0);
  for (let j = 0; j < 24; j++) ctx.fx.spark(k.pos.x, k.pos.y + 2, k.pos.z, rnd(8), 4 + Math.random() * 10, rnd(8), j % 3 ? 0xfff04a : 0xffffff, 0.5);
  // …and comes down on everyone ahead, leader first
  victims.forEach((o, i) => ctx.spawn(new Bolt(ctx, k, o, 0.25 + i * 0.07)));
}
class Bolt {
  constructor(ctx, by, o, delay, up = false) {
    this.ctx = ctx; this.by = by; this.o = o; this.t = -delay; this.up = up;
  }
  update(dt) {
    const ctx = this.ctx, fx = ctx.fx;
    this.t += dt;
    if (this.t < 0) return true;
    const src = this.up ? this.by : this.o;
    if (!this.mesh) {
      if (!live(src)) return false;
      this.mesh = boltMesh(); this.glow = glowSprite(0xfff04a, 7, 0.9);
      ctx.scene.add(this.mesh, this.glow);
      this.mesh.rotation.y = Math.random() * TAU;
      if (!this.up) {
        thunder(ctx, src.pos, 0.6);
        ctx.ring(src.pos, 7, 0xfff04a);
        for (let j = 0; j < 14; j++) fx.spark(src.pos.x, src.pos.y + 0.5, src.pos.z, rnd(8), 3 + Math.random() * 8, rnd(8), j % 3 ? 0xfff04a : 0xffffff, 0.45, -12);
        if (ctx.hit(src, 'spin', this.by, 'thunderbolt')) shrink(src, ctx);
      }
    }
    const life = 0.38;
    if (this.t > life) return false;
    // flicker; the strike follows its kart
    const on = Math.floor(this.t * 30) % 3 !== 1;
    this.mesh.visible = on;
    this.mesh.position.copy(src.pos);
    if (this.up) { this.mesh.position.y += 2.2; this.mesh.scale.set(4, 45, 4); this.mesh.rotation.x = 0; }
    else { this.mesh.scale.set(6, 42, 6); }
    this.glow.position.copy(src.pos).setY(src.pos.y + (this.up ? 2.5 : 1));
    this.glow.scale.setScalar((on ? 7 : 4) * (1 - this.t / life * 0.5));
    return true;
  }
  dispose() { if (this.mesh) this.ctx.scene.remove(this.mesh, this.glow); }
}
// shrunk for a while: smaller, slower, a few sparks crackling off
function shrink(o, ctx) {
  if (o.pkShrink) { o.pkShrink.t = 0; return; }
  o.pkShrink = ctx.spawn({
    t: 0, k: o,
    update(dt) {
      this.t += dt;
      if (this.t > SHRINK_TIME || o.finished) return false;
      const f = this.t, s = 1 - (1 - SHRINK) * Math.min(1, f / 0.3) * Math.min(1, (SHRINK_TIME - f) / 0.4);
      o.model.root.scale.multiplyScalar(s);
      const cap = o.topSpeed * 0.78;
      if (o.speed > cap && !(o.boostTime > 0)) o.speed -= (o.speed - cap) * Math.min(1, dt * 3);
      if (Math.random() < 0.15) ctx.fx.spark(o.pos.x + rnd(0.8), o.pos.y + 0.8, o.pos.z + rnd(0.8), rnd(3), 2 + Math.random() * 3, rnd(3), 0xfff04a, 0.25);
      return true;
    },
    dispose() { if (o.pkShrink === this) o.pkShrink = null; },
  });
}

// ---- AI helpers ------------------------------------------------------------------------------
const HOLD = new WeakMap();   // when a CPU started holding an item it wants to save
function held(k, ctx, secs) {
  const now = ctx.race.time;
  if (!HOLD.has(k)) HOLD.set(k, now);
  if (now - HOLD.get(k) > secs) { HOLD.delete(k); return true; }
  return false;
}
const threatened = (k, ctx, r = 32) => ctx.race.items.proj.some((p) => p.owner !== k && p.life > 0 && p.pos.distanceTo(k.pos) < r);

// ---- icons (viewBox 0 0 64 64, chunky LEGO style) -----------------------------------------------
const ICON_SNORLAX = '<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><path d="M14 22l4-12 8 9M50 22l-4-12-8 9" fill="#2e5f73"/><ellipse cx="32" cy="38" rx="26" ry="22" fill="#2e5f73"/><ellipse cx="32" cy="40" rx="18" ry="14" fill="#f0e0bc"/></g><path d="M22 34h8M34 34h8" stroke="#1b2a34" stroke-width="3" stroke-linecap="round"/><path d="M24 44q8 5 16 0" stroke="#1b2a34" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M27 44l1.5-3 1.5 3M34 44l1.5-3 1.5 3" fill="#fff"/><g fill="#dff0ff" stroke="#1b2a34" stroke-width="1.5" stroke-linejoin="round"><path d="M44 4h10v3l-6 6h6v3H44v-3l6-6h-6z"/><path d="M56 18h6v2l-3.5 3.5H62v2h-6v-2l3.5-3.5H56z"/></g></svg>';
const ICON_PROTECT = '<svg viewBox="0 0 64 64"><path d="M32 4l24 14v28L32 60 8 46V18z" fill="#5aff7a" fill-opacity=".45" stroke="#1d9a3a" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 4v56M8 18l48 28M56 18L8 46" stroke="#b8ffb0" stroke-width="2" opacity=".8"/><path d="M32 18l12 7v14l-12 7-12-7V25z" fill="#b8ffb0" fill-opacity=".7" stroke="#1d9a3a" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const ICON_BALL = '<svg viewBox="0 0 64 64"><g stroke="#1b1b1b" stroke-width="3.5"><path d="M6 32a26 26 0 0 1 52 0z" fill="#d0262a"/><path d="M6 32a26 26 0 0 0 52 0z" fill="#f4f4f4"/><path d="M6 32h52"/><circle cx="32" cy="32" r="8" fill="#f4f4f4"/></g><circle cx="32" cy="32" r="3.5" fill="#fff" stroke="#1b1b1b" stroke-width="1.5"/><ellipse cx="22" cy="17" rx="7" ry="3.5" fill="#ff8a7a" opacity=".7" transform="rotate(-25 22 17)"/></svg>';
const ICON_QUICK = '<svg viewBox="0 0 64 64"><g stroke-linecap="round" fill="none"><path d="M4 18h22M2 30h18M6 42h20M10 54h14" stroke="#9ad8ff" stroke-width="4"/><path d="M4 18h22M2 30h18M6 42h20M10 54h14" stroke="#fff" stroke-width="2"/></g><path d="M30 8l24 6-12 8 18 10-26 4 10 10-26-6 12-10-14-8 18-4z" fill="#fff" stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"/><path d="M38 20l8 2-4 3 6 4-9 1" stroke="#f2cd37" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg>';
const ICON_THUNDER = '<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><path d="M10 22a10 10 0 0 1 12-10 12 12 0 0 1 22 0 10 10 0 0 1 10 14H12a8 8 0 0 1-2-4z" fill="#6c6e68"/><path d="M34 22L18 42h12l-6 20 24-28H36l8-12z" fill="#f2cd37"/></g><path d="M34 26l-6 8" stroke="#fff6c0" stroke-width="3" stroke-linecap="round"/><path d="M8 40l6 2M54 46l4 4M50 40l8-2" stroke="#fff04a" stroke-width="3" stroke-linecap="round"/></svg>';

export default [
  {
    id: 'snorlaxblock', name: 'Snorlax', color: '#2e5f73', icon: ICON_SNORLAX, gesture: 'throwB',
    help: 'Drop a sleeping Snorlax behind you (or toss it ahead) to block the road: karts that hit its belly bounce off and spin out until it wakes up and leaves.',
    odds: [5, 4, 2, 1, 0],
    ai: (k, ctx) => {
      const b = ctx.behind(k, 1)[0];
      if ((live(b) && gapTo(k, b) < 30) || held(k, ctx, 6)) { HOLD.delete(k); return { back: true }; }
      return false;
    },
    prewarm: () => prewarmAll(),
    use(k, ctx, { back, aimFwd }) { HOLD.delete(k); ctx.spawn(new Snorlax(k, ctx, !back && !!aimFwd)); },
  },
  {
    id: 'protect', name: 'Protect', color: '#5aff7a', icon: ICON_PROTECT, gesture: 'use',
    help: 'A green Protect dome surrounds your kart for 6 seconds: every hit is blocked and shots bounce right off it.',
    odds: [5, 3, 2, 1, 0],
    ai: (k, ctx) => {
      if (k.pkProtect) return false;
      const go = threatened(k, ctx, 34) || ctx.behind(k, 1).some((o) => live(o) && gapTo(k, o) < 10) || held(k, ctx, 8);
      if (go) HOLD.delete(k);
      return go;
    },
    use(k, ctx) {
      HOLD.delete(k);
      if (k.pkProtect) { k.pkProtect.extend(); return; }
      k.pkProtect = ctx.spawn(new Protect(k, ctx));
    },
  },
  {
    id: 'pokeball', name: 'Poké Ball', color: '#d0262a', icon: ICON_BALL, gesture: 'throwF',
    help: 'Throw a Poké Ball that homes in on the kart ahead and catches it: they are sucked inside while it wobbles three times, then burst out well behind.',
    odds: [2, 4, 4, 3, 1],
    ai: (k, ctx) => {
      const a = ctx.ahead(k, 1)[0];
      if (live(a) && !a.pkCaught && gapTo(k, a) < 150) return true;
      const b = ctx.behind(k, 1)[0];
      return live(b) && gapTo(k, b) < 40 && (!a || held(k, ctx, 6)) ? { back: true } : false;
    },
    use(k, ctx, { back }) { HOLD.delete(k); ctx.spawn(new Ball(k, ctx, !!back)); },
  },
  {
    id: 'quickattack', name: 'Quick Attack', color: '#e8f4ff', icon: ICON_QUICK, gesture: 'use', multi: 3,
    help: 'Three lightning-fast dashes trailing white speed lines; any kart you touch mid-dash gets bumped aside.',
    odds: [2, 3, 4, 4, 2],
    ai: (k) => k.grounded && !k.stunned && !k.pkQuick && Math.abs(k.loc.curv || 0) < 0.5,
    use(k, ctx) {
      if (k.pkQuick) { k.pkQuick.dash(); return; }
      k.pkQuick = ctx.spawn(new QuickAttack(k, ctx));
    },
  },
  {
    id: 'thunderbolt', name: 'Thunderbolt', color: '#fff04a', icon: ICON_THUNDER, gesture: 'use',
    help: "Pikachu's Thunderbolt strikes every racer ahead of you: they spin out and shrink, slowed down for a few seconds.",
    odds: [0, 0, 1, 3, 6],
    ai: (k, ctx) => ctx.ahead(k, 12).filter(live).length >= 3 || (ctx.ahead(k, 1).some(live) && held(k, ctx, 4)),
    use(k, ctx) { HOLD.delete(k); thunderbolt(k, ctx); },
  },
];
