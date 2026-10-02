// Marvel abilities (see ../abilities.js for the contract): Mjolnir, Cap's Shield, Web Shot and
// the Infinity Snap. Meshes and the lightning/dust effects live in ./marvel-fx.js.
import * as THREE from 'three';
import { hammerMesh, shieldMesh, webBallMesh, webNetMesh, webTrapMesh, gauntletMesh, strandLine, stretch, Bolt, dustPool, STONES } from './marvel-fx.js';

const UP = new THREE.Vector3(0, 1, 0);
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
const TAU = Math.PI * 2;
const wrapA = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);
const angleDiff = (a, b) => wrapA(b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const live = (o) => !!o && !o.finished && !(o.respawn > 0);
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;

// sounds, attenuated by distance to the nearest listener
function snd(ctx, pos, fn) {
  const au = ctx.audio;
  if (!au || !au.ctx) return;
  const a = pos && au.att ? au.att(pos) : 1;
  if (a > 0.03) fn(au, a);
}
const thunder = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.noiseHit(0.12, { vol: 0.5 * a, freq: 5200, q: 0.6, type: 'highpass' });
  au.noiseHit(1.6, { vol: 0.55 * a, freq: 260, type: 'lowpass', at: 0.05 });
  au.tone(55, 1.1, { vol: 0.22 * a, type: 'sawtooth', slide: 0.6, filter: 380, at: 0.04 });
  for (let i = 0; i < 5; i++) au.noiseHit(0.05, { vol: 0.25 * a, freq: 3000 + Math.random() * 3000, q: 4, at: 0.1 + i * 0.07 + Math.random() * 0.04 });
});
const zap = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.noiseHit(0.18, { vol: 0.35 * a, freq: 3800, q: 1.2, sweep: 0.4 });
  au.tone(900, 0.16, { vol: 0.08 * a, type: 'sawtooth', slide: 0.3, filter: 3000 });
});
const whoosh = (ctx, pos, f = 900) => snd(ctx, pos, (au, a) => au.noiseHit(0.45, { vol: 0.3 * a, freq: f, sweep: 2.2, q: 1.4 }));
const clang = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.tone(1650, 0.5, { vol: 0.14 * a, type: 'triangle', slide: 0.97 });
  au.tone(2480, 0.35, { vol: 0.09 * a, type: 'sine', slide: 0.98 });
  au.tone(3720, 0.2, { vol: 0.05 * a, type: 'sine' });
  au.noiseHit(0.07, { vol: 0.3 * a, freq: 6000, q: 0.8 });
});
const thwip = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.noiseHit(0.16, { vol: 0.32 * a, freq: 2600, sweep: 0.35, q: 2.5 });
  au.tone(1300, 0.12, { vol: 0.07 * a, type: 'sine', slide: 0.45 });
});
const splat = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.noiseHit(0.25, { vol: 0.35 * a, freq: 700, sweep: 0.5, q: 1.5 });
  au.tone(240, 0.18, { vol: 0.1 * a, type: 'triangle', slide: 0.5 });
});

// ground height under p (road surface if over the road, else keep)
function groundY(ctx, e) {
  e.loc = ctx.track.locate(e.pos.x, e.pos.y, e.pos.z, e.si, e.loc || {});
  e.si = e.loc.i;
  return e.loc.y;
}
// steer a flier toward aim (turn-rate limited) and move it forward
function steer(e, aim, turn, dt) {
  const want = Math.atan2(aim.x - e.pos.x, aim.z - e.pos.z);
  e.yaw = wrapA(e.yaw + clamp(angleDiff(e.yaw, want), -turn * dt, turn * dt));
  e.pos.x += Math.sin(e.yaw) * e.speed * dt;
  e.pos.z += Math.cos(e.yaw) * e.speed * dt;
}
// go straight at a point in 3D; returns the remaining distance
function homeIn(e, aim, dt) {
  const d = v3.subVectors(aim, e.pos), L = d.length();
  if (L > 1e-4) e.pos.addScaledVector(d, Math.min(1, (e.speed * dt) / L));
  e.yaw = Math.atan2(d.x, d.z);
  return Math.max(0, L - e.speed * dt);
}
const chest = (o, out, h = 1.3) => out.copy(o.pos).setY(o.pos.y + h * (o.megaScale || 1));

// =============================================================================================
// Mjolnir: flies to the kart ahead, a lightning strike chains to up to 3 karts near it, then the
// hammer flies back to its owner.
// =============================================================================================
class Mjolnir {
  constructor(k, ctx, back) {
    this.k = k; this.ctx = ctx;
    this.dir = back ? -1 : 1;
    this.target = (back ? ctx.behind(k, 1) : ctx.ahead(k, 1)).find(live) || null;
    this.mesh = hammerMesh();
    ctx.scene.add(this.mesh);
    this.pos = k.pos.clone().addScaledVector(k.forward(v1), 2.5 * this.dir).setY(k.pos.y + 3);
    this.yaw = back ? wrapA(k.yaw + Math.PI) : k.yaw;
    this.speed = Math.max(80, Math.abs(k.speed) + 36);
    this.si = k.loc.i ?? 0; this.loc = {};
    this.phase = 'fly'; this.t = 0; this.pt = 0;
    this.chain = []; this.links = []; this.sky = null; this.sky2 = null;
    this.anchor = new THREE.Vector3();
    this.rejag = 0;
    this.mesh.position.copy(this.pos);
  }
  update(dt) {
    const ctx = this.ctx, fx = ctx.fx;
    this.t += dt; this.pt += dt;
    const spin = this.mesh.userData.spin;
    if (this.phase === 'fly') {
      const tg = live(this.target) ? this.target : null;
      const gy = groundY(ctx, this);
      if (tg) {
        const aim = chest(tg, v2, 1.6);
        const d = aim.distanceTo(this.pos);
        if (d < 12) { if (homeIn(this, aim, dt) < 1.2) this.strike(); }
        else {
          // far away: fly along the road toward them (they may be round a bend)
          if (d < 45) steer(this, aim, 9, dt);
          else steer(this, ctx.at(this.loc.i + 14 * this.dir, 0, 0, v1), 6, dt);
          this.pos.y += (Math.max(gy + 3, aim.y) - this.pos.y) * Math.min(1, dt * 6);
        }
      } else {
        steer(this, ctx.at(this.loc.i + 14 * this.dir, 0, 0, v1), 6, dt);
        this.pos.y += (gy + 3 - this.pos.y) * Math.min(1, dt * 6);
        if (this.t > 1.0) this.strike();
      }
      if (this.phase === 'fly' && this.t > 6) this.strike();
      spin.rotation.x += dt * 22;
      // crackling trail
      for (let n = 0; n < 2; n++) fx.spark(this.pos.x + rnd(0.8), this.pos.y + rnd(0.8), this.pos.z + rnd(0.8), rnd(5), rnd(5), rnd(5), n ? 0xffffff : 0x8fd8ff, 0.22);
    } else if (this.phase === 'strike') {
      this.updateStrike(dt);
    } else {
      // back to the owner's hand
      const k = this.k;
      if (!live(k) || this.pt > 3) return false;
      this.speed = Math.min(110, this.speed + 60 * dt);
      if (homeIn(this, chest(k, v2, 2.2), dt) < 3) {
        fx.pop(k.pos, 0x8fd8ff);
        snd(ctx, k.pos, (au, a) => { au.tone(180, 0.15, { vol: 0.2 * a, type: 'square', filter: 900 }); au.noiseHit(0.1, { vol: 0.2 * a, freq: 3000 }); });
        return false;
      }
      spin.rotation.x -= dt * 22;
      if (Math.random() < 0.6) fx.spark(this.pos.x, this.pos.y, this.pos.z, rnd(3), rnd(3), rnd(3), 0x8fd8ff, 0.2);
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    const g = this.mesh.userData.glow;
    g.scale.setScalar((this.phase === 'strike' ? 1.5 : 1) * (0.85 + Math.random() * 0.3));
    return true;
  }
  // knocked aside by a block (Force Push, lightsaber…): only its owner is worthy, so it flies home
  deflect(pos, r) {
    if (this.phase !== 'fly' || this.pos.distanceToSquared(pos) > r * r) return;
    this.ctx.fx.pop(this.pos, 0x8fd8ff);
    zap(this.ctx, this.pos);
    this.phase = 'return'; this.pt = 0; this.speed = 60;
  }
  strike() {
    const ctx = this.ctx, scene = ctx.scene;
    this.phase = 'strike'; this.pt = 0;
    const first = live(this.target) && this.target.pos.distanceTo(this.pos) < 9 ? this.target : null;
    const center = first ? first.pos : this.pos;
    this.anchor.copy(center);
    // chain: always hop to the nearest kart (not the thrower) that has not been struck yet
    const chain = first ? [first] : [];
    const pool = ctx.near(center, 26, this.k).filter((o) => o !== first && !o.finished);
    let from = first ? first.pos : center;
    while (pool.length && chain.length < 4) {
      let bi = -1, bd = (first || chain.length ? 20 : 11) ** 2;
      pool.forEach((o, i) => { const d = o.pos.distanceToSquared(from); if (d < bd) { bd = d; bi = i; } });
      if (bi < 0) break;
      const o = pool.splice(bi, 1)[0];
      chain.push(o); from = o.pos;
    }
    this.chain = chain;
    this.sky = new Bolt(scene, 0x4aa8ff, 14, 0.3);
    this.sky2 = new Bolt(scene, 0x9a7bff, 10, 0.14);
    this.skyTop = new THREE.Vector3(center.x + rnd(6), center.y + 46, center.z + rnd(6));
    for (let i = 1; i < chain.length; i++) { const b = new Bolt(scene, 0x4aa8ff, 8, 0.2); b.fade(0); this.links.push(b); }
    this.struck = 0;
    thunder(ctx, center);
    // a flash when someone on screen is involved
    if (this.k.human || chain.some((o) => o.human)) ctx.race.flash?.(0xdff2ff);
    ctx.ring(center, 10, 0x8fd8ff);
    ctx.fx.explosion(center);
    this.hitNext();
  }
  hitNext() {
    const ctx = this.ctx, o = this.chain[this.struck];
    if (!o) return;
    this.struck++;
    ctx.hit(o, 'spin', this.k, 'mjolnir');
    ctx.fx.pop(o.pos, 0x9fe8ff);
    ctx.fx.pop(o.pos, 0xffffff);
    if (this.struck > 1) zap(ctx, o.pos);
  }
  updateStrike(dt) {
    const ctx = this.ctx, fx = ctx.fx, pt = this.pt, ch = this.chain;
    const LINK = 0.15;
    while (this.struck < ch.length && pt >= LINK * this.struck) this.hitNext();
    // hammer hovers above the strike, spinning hard
    const top = ch[0] ? ch[0].pos : this.anchor;
    this.pos.lerp(v1.set(top.x, top.y + 5.5, top.z), Math.min(1, dt * 10));
    this.mesh.userData.spin.rotation.x += dt * 30;
    // re-jag the bolts a few times a second so they crackle
    this.rejag -= dt;
    if (this.rejag <= 0) {
      this.rejag = 0.045;
      const end = ch[0] ? chest(ch[0], v2, 1) : v2.copy(this.anchor);
      this.sky.set(this.skyTop, end, 7);
      this.sky2.set(this.skyTop, end, 9);
      for (let i = 0; i < this.links.length; i++) this.links[i].set(chest(ch[i], v1, 1), chest(ch[i + 1], v2, 1), 2.2);
      if (ch[0] || this.anchor) { const e = ch[0] ? ch[0].pos : this.anchor; for (let n = 0; n < 4; n++) fx.spark(e.x, e.y + 0.6, e.z, rnd(10), Math.random() * 9, rnd(10), n % 2 ? 0xffffff : 0x8fd8ff, 0.35, 12); }
    }
    const skyO = pt < 0.5 ? 0.65 + Math.random() * 0.35 : 1 - (pt - 0.5) / 0.3;
    this.sky.fade(skyO); this.sky2.fade(skyO * 0.9);
    this.links.forEach((b, i) => { const t0 = LINK * (i + 1), a = pt - t0; b.fade(a < 0 ? 0 : a < 0.4 ? 0.7 + Math.random() * 0.3 : 1 - (a - 0.4) / 0.25); });
    const end = Math.max(0.8, LINK * ch.length + 0.65);
    if (pt > end) {
      this.disposeBolts();
      this.phase = 'return'; this.pt = 0; this.speed = 70;
      whoosh(ctx, this.pos, 600);
    }
  }
  disposeBolts() {
    for (const b of [this.sky, this.sky2, ...this.links]) b?.dispose();
    this.sky = this.sky2 = null; this.links = [];
  }
  dispose() { this.ctx.scene.remove(this.mesh); this.disposeBolts(); }
}

// =============================================================================================
// Cap's Shield: ricochets between up to 3 karts ahead (or behind), then returns to the thrower.
// =============================================================================================
class CapShield {
  constructor(k, ctx, back) {
    this.k = k; this.ctx = ctx;
    this.dir = back ? -1 : 1;
    this.queue = (back ? ctx.behind(k, 3) : ctx.ahead(k, 3)).filter(live);
    this.hitSet = new Set([k]);
    this.target = this.next();
    this.mesh = shieldMesh();
    ctx.scene.add(this.mesh);
    this.pos = k.pos.clone().addScaledVector(k.forward(v1), 3 * this.dir).setY(k.pos.y + 1.6);
    this.yaw = back ? wrapA(k.yaw + Math.PI) : k.yaw;
    this.speed = Math.max(84, Math.abs(k.speed) + 38);
    this.si = k.loc.i ?? 0; this.loc = {};
    this.phase = 'out'; this.t = 0; this.leg = 0; this.hits = 0; this.hop = 0;
    this.mesh.userData.tilt.rotation.x = -0.85;
    this.mesh.position.copy(this.pos);
  }
  next() {
    while (this.queue.length) {
      const o = this.queue.shift();
      if (live(o) && !this.hitSet.has(o) && (!this.pos || o.pos.distanceTo(this.pos) < 110)) return o;
    }
    if (!this.pos) return null;
    // otherwise the nearest un-hit kart in front of the shield
    let best = null, bd = 48 * 48;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (const o of this.ctx.race.karts) {
      if (!live(o) || this.hitSet.has(o)) continue;
      const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, d = dx * dx + dz * dz;
      if (d < bd && dx * fx + dz * fz > 0) { bd = d; best = o; }
    }
    return best;
  }
  update(dt) {
    const ctx = this.ctx, fx = ctx.fx, k = this.k;
    this.t += dt; this.leg += dt;
    if (this.t > 11) return false;
    const gy = groundY(ctx, this);
    if (this.phase === 'out') {
      if (this.target && !live(this.target)) this.target = this.next();
      const tg = this.target;
      if (tg) {
        const aim = chest(tg, v2, 1.2);
        const d = aim.distanceTo(this.pos);
        if (d < 10) homeIn(this, aim, dt);
        else {
          if (d < 50) steer(this, aim, 8, dt);
          else steer(this, ctx.at(this.loc.i + 14 * this.dir, 0, 0, v1), 6, dt);
          this.pos.y += (gy + 1.6 + this.hop - this.pos.y) * Math.min(1, dt * 8);
        }
        if (this.leg > 4) this.turnBack();
      } else {
        steer(this, ctx.at(this.loc.i + 14 * this.dir, 0, 0, v1), 6, dt);
        this.pos.y += (gy + 1.6 + this.hop - this.pos.y) * Math.min(1, dt * 8);
        if (this.leg > (this.hits ? 0.5 : 1.2)) this.turnBack();
      }
      // ricochet off anyone it touches
      for (const o of ctx.race.karts) {
        if (this.hitSet.has(o) || !live(o)) continue;
        const r = 2.6 * (o.megaScale || 1);
        if (o.pos.distanceToSquared(this.pos) < r * r && Math.abs(o.pos.y + 1 - this.pos.y) < 3 * (o.megaScale || 1)) { this.ricochet(o); break; }
      }
    } else {
      if (!live(k)) { fx.pop(this.pos, 0xffffff); return false; }
      this.speed = Math.min(120, this.speed + 50 * dt);
      if (homeIn(this, chest(k, v2, 1.8), dt) < 1.6) {
        // caught! a little turbo from the momentum
        k.boost(0.6);
        fx.pop(k.pos, 0x9ad8ff);
        clang(ctx, k.pos);
        return false;
      }
    }
    this.hop = Math.max(0, this.hop - dt * 6);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    this.mesh.userData.spin.rotation.y += dt * 24;
    if (Math.random() < 0.7) fx.spark(this.pos.x, this.pos.y, this.pos.z, rnd(2), rnd(1), rnd(2), Math.random() < 0.5 ? 0xffffff : 0xff5a4a, 0.25);
    return true;
  }
  ricochet(o) {
    const ctx = this.ctx;
    this.hitSet.add(o); this.hits++;
    ctx.hit(o, 'spin', this.k, 'capshield');
    clang(ctx, this.pos);
    ctx.fx.pop(this.pos, 0xffffff);
    ctx.fx.pop(this.pos, 0xc4141c);
    ctx.ring(o.pos, 5, 0xbfe0ff);
    this.hop = 2.2; this.leg = 0;
    this.speed = Math.max(this.speed, 90);
    if (this.hits >= 3) this.turnBack();
    else { this.target = this.next(); if (!this.target) this.yaw = wrapA(this.yaw + rnd(0.6)); }
  }
  // blocked: it clangs off and heads home
  deflect(pos, r) {
    if (this.phase !== 'out' || this.pos.distanceToSquared(pos) > r * r) return;
    clang(this.ctx, this.pos);
    this.ctx.fx.pop(this.pos, 0xffffff);
    this.hop = 2.5;
    this.turnBack();
  }
  turnBack() {
    if (this.phase === 'back') return;
    this.phase = 'back'; this.leg = 0;
    this.mesh.userData.tilt.rotation.x = 0.85;   // keep the star facing the thrower's camera
    whoosh(this.ctx, this.pos, 1400);
  }
  dispose() { this.ctx.scene.remove(this.mesh); }
}

// =============================================================================================
// Web Shot: a web ball forward (sticks the first kart it hits) or a sticky web trap backward.
// =============================================================================================
const WEB_SLOW = 0.27;      // fraction of top speed a webbed kart can do
// stick a kart in a web net (respects shields, invulnerability, mega/golden/bullet karts)
function webKart(o, dur, by, ctx, label) {
  if (!live(o) || o.finishedCoast) return false;
  if (o.invincible || o.megaTime > 0) { ctx.fx.debris(o.pos, [0xf4f4f4, 0xdfe6ee], 6, 0.6); return false; }
  if (o.shieldBlocks()) return false;
  splat(ctx, o.pos);
  ctx.fx.debris(chest(o, v1, 1.6), [0xf4f4f4, 0xffffff], 8, 0.6);
  if (o.mvWeb && !o.mvWeb.done) { o.mvWeb.extend(dur); return true; }
  o.cancelDrift?.();
  o.speed *= 0.5;
  o.boostTime = 0;
  o.emote?.('ouch');
  o.player?.rumble(0.5, 250);
  if (by && by !== o && by.human) by.player?.rumble(0.2, 80);
  ctx.race.onHit?.(o, 'spin', by);
  ctx.race.onProjectileHit?.(by, o, label);
  o.mvWeb = ctx.spawn(new WebNet(o, dur, ctx));
  return true;
}
class WebNet {
  constructor(k, dur, ctx) {
    this.k = k; this.ctx = ctx; this.dur = dur; this.t = 0; this.done = false;
    this.mesh = webNetMesh();
    this.mesh.scale.setScalar(0.01);
    ctx.scene.add(this.mesh);
  }
  extend(d) { this.dur = Math.max(this.dur, this.t + d); }
  update(dt) {
    const k = this.k, ctx = this.ctx;
    this.t += dt;
    if (!live(k)) return false;
    // a turbo (or boost pad) bursts the web early
    if (this.t > 0.6 && k.boostTime > 0) this.dur = Math.min(this.dur, this.t);
    if (this.t >= this.dur) {
      ctx.fx.debris(chest(k, v1, 1.2), [0xf4f4f4, 0xdfe6ee, 0xffffff], 10, 0.8);
      snd(ctx, k.pos, (au, a) => au.noiseHit(0.2, { vol: 0.3 * a, freq: 1800, sweep: 1.8, q: 1 }));
      k.invuln = Math.max(k.invuln, 0.8);
      return false;
    }
    // crawl
    const cap = k.topSpeed * WEB_SLOW;
    if (k.speed > cap) k.speed -= (k.speed - cap) * Math.min(1, dt * 12);
    if (k.speed < -cap) k.speed = -cap;
    // the net hugs the kart, popping in and straining as it struggles
    const R = k.model.root;
    this.mesh.position.copy(R.position);
    this.mesh.quaternion.copy(R.quaternion);
    const pop = this.t < 0.18 ? (this.t / 0.18) * 1.15 : this.t < 0.3 ? 1.15 - (this.t - 0.18) / 0.12 * 0.15 : 1;
    const out = this.dur - this.t < 0.15 ? 1 + (0.15 - (this.dur - this.t)) * 2 : 1;
    const s = pop * out * (k.megaScale || 1);
    this.mesh.scale.set(s * (1 + Math.sin(this.t * 17) * 0.03), s * (1 - Math.sin(this.t * 17) * 0.04), s);
    if (Math.random() < dt * 6) ctx.fx.puff(k.pos.x + rnd(1.5), k.pos.y + 0.3, k.pos.z + rnd(1.5), rnd(1), 1.5, rnd(1), 0xffffff, 0.5);
    return true;
  }
  dispose() {
    this.done = true;
    this.ctx.scene.remove(this.mesh);
    if (this.k.mvWeb === this) this.k.mvWeb = null;
  }
}
class WebBall {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx;
    this.mesh = webBallMesh();
    ctx.scene.add(this.mesh);
    this.line = strandLine(ctx.scene);
    this.pos = k.pos.clone().addScaledVector(k.forward(v1), 3).setY(k.pos.y + 1.4);
    this.yaw = k.yaw;
    this.speed = Math.max(74, k.speed + 32);
    this.si = k.loc.i ?? 0; this.loc = {};
    this.t = 0; this.tg = null;
    this.hand = new THREE.Vector3();
    this.mesh.position.copy(this.pos);
  }
  deflect(pos, r) { if (this.pos.distanceToSquared(pos) < r * r) this.cut = true; }
  update(dt) {
    const ctx = this.ctx, k = this.k;
    this.t += dt;
    if (this.t > 2.4 || this.cut) { ctx.fx.debris(this.pos, [0xf4f4f4], 4, 0.5); return false; }
    // gentle homing on a kart in a cone in front
    if (!live(this.tg)) {
      this.tg = null;
      let bd = 36 * 36;
      for (const o of ctx.race.karts) {
        if (o === k || !live(o)) continue;
        const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, d = dx * dx + dz * dz;
        if (d < bd && Math.abs(angleDiff(this.yaw, Math.atan2(dx, dz))) < 0.5) { bd = d; this.tg = o; }
      }
    }
    if (this.tg && this.tg.pos.distanceToSquared(this.pos) < 64) homeIn(this, chest(this.tg, v2, 1.2), dt);
    else if (this.tg) steer(this, this.tg.pos, 5, dt);
    else { this.pos.x += Math.sin(this.yaw) * this.speed * dt; this.pos.z += Math.cos(this.yaw) * this.speed * dt; }
    const gy = groundY(ctx, this);
    const onRoad = !this.loc.gap && Math.abs(this.loc.lat) < this.loc.hw + this.loc.sh;
    if (onRoad) this.pos.y += (gy + 1.3 - this.pos.y) * Math.min(1, dt * 8);
    else this.pos.y -= 14 * dt;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    this.mesh.userData.spin.rotation.x += dt * 14;
    // the web line from Spidey's hand stretches out, then snaps off
    const lo = 1 - this.t / 0.4;
    this.line.visible = lo > 0 && live(k);
    if (this.line.visible) {
      this.hand.copy(k.pos).setY(k.pos.y + 2.2);
      stretch(this.line, this.hand, this.pos, 0.07);
      this.line.material.opacity = lo;
    }
    if (Math.random() < 0.5) ctx.fx.puff(this.pos.x, this.pos.y, this.pos.z, rnd(1), rnd(1), rnd(1), 0xffffff, 0.35);
    for (const o of ctx.race.karts) {
      if ((o === k && this.t < 0.4) || !live(o)) continue;
      const r = 2.7 * (o.megaScale || 1);
      if (o.pos.distanceToSquared(this.pos) < r * r && Math.abs(o.pos.y + 1 - this.pos.y) < 3 * (o.megaScale || 1)) {
        webKart(o, 2.2, k, ctx, 'webshot');
        return false;
      }
    }
    return true;
  }
  dispose() {
    this.ctx.scene.remove(this.mesh);
    this.ctx.scene.remove(this.line);
    this.line.material.dispose();
  }
}
const webTraps = new Set();
class WebTrap {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx;
    this.pos = k.pos.clone().addScaledVector(k.forward(v1), -3.8);
    this.si = k.loc.i ?? 0; this.loc = {};
    const gy = groundY(ctx, this), L = this.loc;
    const onRoad = !L.gap && Math.abs(L.lat) < L.hw + L.sh;
    if (onRoad) this.pos.y = gy;
    this.mesh = webTrapMesh();
    // lie flat on the (banked, sloped) road
    if (onRoad) {
      const n = v1.set(-L.rx * L.bank, 1, -L.rz * L.bank).normalize();
      const t = v2.set(L.tx, L.ty, L.tz);
      n.addScaledVector(t, -n.dot(t)).normalize();
      this.mesh.quaternion.setFromUnitVectors(UP, n);
    }
    this.mesh.rotateY(Math.random() * TAU);
    this.mesh.position.copy(this.pos).addScaledVector(UP, 0.05);
    this.mesh.scale.setScalar(0.2);
    ctx.scene.add(this.mesh);
    this.t = 0; this.safe = 0.8; this.dead = false;
    webTraps.add(this);
    if (webTraps.size > 10) { const old = webTraps.values().next().value; old.dead = true; webTraps.delete(old); }
  }
  deflect(p, r) { if (p.distanceToSquared(this.pos) < r * r && !this.dead) { this.dead = true; this.ctx.fx.debris(this.pos, [0xf4f4f4, 0xdfe6ee], 8, 0.7); } }
  danger(p, r) { return !this.dead && p.distanceToSquared(this.pos) < (r + 3) ** 2; }
  update(dt) {
    const ctx = this.ctx;
    this.t += dt; this.safe -= dt;
    if (this.dead || this.t > 30) return false;
    this.mesh.scale.setScalar(Math.min(1, 0.2 + this.t * 5));
    for (const o of ctx.race.karts) {
      if ((o === this.k && this.safe > 0) || !live(o)) continue;
      if (!o.grounded && o.pos.y > this.pos.y + 1.5) continue;
      const r = 2.9 + ((o.megaScale || 1) - 1) * 2;
      if (o.pos.distanceToSquared(this.pos) < r * r) {
        if (o.megaTime > 0 || o.bulletTime > 0 || o.goldenTime > 0) ctx.fx.debris(this.pos, [0xf4f4f4, 0xdfe6ee], 8, 0.7);
        else webKart(o, 1.7, this.k, ctx, 'webtrap');
        return false;
      }
    }
    return true;
  }
  dispose() { this.dead = true; webTraps.delete(this); this.ctx.scene.remove(this.mesh); }
}

// =============================================================================================
// Infinity Snap: the gauntlet snaps and half the racers ahead crumble to brick dust, crawl
// along unseen, then reform.
// =============================================================================================
class Snap {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx; this.t = 0; this.snapped = false;
    this.mesh = gauntletMesh();
    this.mesh.scale.setScalar(0.01);
    ctx.scene.add(this.mesh);
    snd(ctx, k.pos, (au, a) => { for (let i = 0; i < 6; i++) au.tone(220 * Math.pow(1.26, i), 0.5, { vol: 0.05 * a, type: 'sine', at: i * 0.05 }); });
  }
  update(dt) {
    const ctx = this.ctx, k = this.k;
    this.t += dt;
    const t = this.t;
    if (t > 2.3) return false;
    // hovers above the caster, back of the hand (stones) toward their camera
    const f = k.forward(v1);
    this.mesh.position.set(k.pos.x - f.x * 0.6, k.pos.y + 4.6 * (k.megaScale || 1), k.pos.z - f.z * 0.6);
    this.mesh.rotation.y = k.yaw + Math.PI;
    const appear = t < 0.3 ? (t / 0.3) * 1.2 : t < 0.42 ? 1.2 - (t - 0.3) / 0.12 * 0.2 : 1;
    const leave = t > 1.9 ? Math.max(0.01, 1 - (t - 1.9) / 0.4) : 1;
    const hand = this.mesh.userData.hand;
    // the snap: a sharp jolt and a golden flash
    const since = t - 0.6;
    hand.rotation.z = since > 0 && since < 0.25 ? Math.sin(since * 60) * 0.18 * (1 - since / 0.25) : 0;
    const punch = since > 0 && since < 0.3 ? 1 + 0.3 * (1 - since / 0.3) : 1;
    this.mesh.scale.setScalar(1.8 * appear * leave * punch);
    this.mesh.userData.glow.scale.setScalar((since > 0 && since < 0.5 ? 1.6 : 1) * (0.9 + Math.random() * 0.15));
    if (Math.random() < 0.5) { const c = STONES[Math.floor(Math.random() * 6)]; const p = this.mesh.position; ctx.fx.spark(p.x + rnd(1.5), p.y + rnd(1.5), p.z + rnd(1.5), rnd(2), 2, rnd(2), c, 0.5); }
    if (!this.snapped && since >= 0) this.snap();
    return true;
  }
  snap() {
    const ctx = this.ctx, k = this.k, fx = ctx.fx;
    this.snapped = true;
    const p = this.mesh.position;
    snd(ctx, null, (au) => {
      au.noiseHit(0.05, { vol: 0.6, freq: 3200, q: 2.5 });                       // *snap*
      au.tone(70, 1.6, { vol: 0.28, type: 'sine', slide: 0.5, at: 0.05 });         // deep boom
      au.noiseHit(1.4, { vol: 0.25, freq: 1500, sweep: 0.25, q: 0.6, at: 0.2 });  // the dust wind
      for (let i = 0; i < 6; i++) au.tone(880 * Math.pow(1.19, i), 0.6, { vol: 0.05, type: 'sine', at: 0.05 + i * 0.04 });
    });
    ctx.race.flash?.(0xffd040);
    ctx.ring(k.pos, 34, 0xffd040);
    ctx.ring(k.pos, 20, 0xfff2b0);
    for (let n = 0; n < 60; n++) {
      const a = Math.random() * TAU, b = Math.random() * Math.PI, s = 8 + Math.random() * 10;
      fx.spark(p.x, p.y, p.z, Math.cos(a) * Math.sin(b) * s, Math.cos(b) * s, Math.sin(a) * Math.sin(b) * s, n % 3 ? 0xffd040 : STONES[n % 6], 0.6, 4);
    }
    // half of the racers ahead, picked at random
    const ahead = ctx.ahead(k, 11).filter((o) => live(o) && !o.mvDust);
    for (let i = ahead.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ahead[i], ahead[j]] = [ahead[j], ahead[i]]; }
    ahead.slice(0, Math.ceil(ahead.length / 2)).forEach((o, i) => { o.mvDust = ctx.spawn(new Dust(o, k, 0.3 + i * 0.16, ctx)); });
  }
  dispose() { this.ctx.scene.remove(this.mesh); }
}
const ASH = [0x6b5a45, 0x8a7a66, 0x3a3430];
class Dust {
  constructor(o, by, delay, ctx) {
    this.o = o; this.by = by; this.ctx = ctx; this.t = -delay; this.started = false; this.acc = 0;
    this.colors = (o.model.colors && o.model.colors.length ? o.model.colors : [o.ch?.kart ?? 0xc91a09]).concat(ASH);
  }
  emitBody(n, wind) {
    const o = this.o, pool = this.pool, s = o.megaScale || 1;
    const sy = Math.sin(o.yaw), cy = Math.cos(o.yaw);
    for (let i = 0; i < n; i++) {
      const lx = rnd(1.5) * s, lz = rnd(2.1) * s, ly = (0.2 + Math.random() * 2.6) * s;
      const x = o.pos.x + lx * cy + lz * sy, z = o.pos.z - lx * sy + lz * cy;
      // drift up and away to one side, like ash in the wind
      pool.emit(x, o.pos.y + ly, z, wind.x + rnd(1.5), 1 + Math.random() * 2.5, wind.z + rnd(1.5), this.colors[Math.floor(Math.random() * this.colors.length)], 1.2 + Math.random() * 0.8, 0.8 + Math.random() * 0.6);
    }
  }
  update(dt) {
    const o = this.o, ctx = this.ctx;
    this.t += dt;
    if (this.t < 0) return true;
    if (!this.started) {
      this.started = true;
      if (!live(o) || !ctx.hit(o, 'spin', this.by, 'snap')) return false;
      this.pool = dustPool(ctx);
      // the wind blows across the kart's path
      const side = Math.random() < 0.5 ? -1 : 1;
      this.wind = new THREE.Vector3(Math.cos(o.yaw) * 3.5 * side - Math.sin(o.yaw) * 2, 0, -Math.sin(o.yaw) * 3.5 * side - Math.cos(o.yaw) * 2);
      snd(ctx, o.pos, (au, a) => au.noiseHit(1.1, { vol: 0.35 * a, freq: 2400, sweep: 0.3, q: 0.7 }));
    }
    if (!live(o)) return false;
    const t = this.t, R = o.model.root, top = o.topSpeed;
    if (this.pool.dead) this.pool = dustPool(ctx);
    let rate = 0, cap = top;
    if (t < 0.9) {
      // crumbling away
      const f = t / 0.9;
      rate = 170;
      R.scale.multiplyScalar(1 - 0.35 * f);
      R.visible = Math.random() > f * f;
      cap = top * (1 - 0.75 * f);
    } else if (t < 2.5) {
      R.visible = false;
      rate = 12;
      cap = top * 0.18;
    } else if (t < 3.1) {
      // reforming from the dust
      const f = (t - 2.5) / 0.6;
      R.scale.multiplyScalar(0.25 + 0.75 * (1 - (1 - f) * (1 - f)));
      cap = top * 0.3;
      this.acc += dt * 110;
      while (this.acc >= 1) {
        this.acc--;
        const d = v1.set(rnd(1), rnd(0.6), rnd(1)).normalize().multiplyScalar(3.5);
        this.pool.emit(o.pos.x + d.x, o.pos.y + 1.2 + d.y, o.pos.z + d.z, -d.x / 0.3 + Math.sin(o.yaw) * o.speed, -d.y / 0.3, -d.z / 0.3 + Math.cos(o.yaw) * o.speed, this.colors[Math.floor(Math.random() * this.colors.length)], 0.3, 0.9);
      }
      if (Math.random() < 0.5) ctx.fx.sparkle(o);
    } else {
      o.invuln = Math.max(o.invuln, 1.0);
      ctx.fx.pop(o.pos, 0xffd040);
      snd(ctx, o.pos, (au, a) => au.tone(660, 0.3, { vol: 0.08 * a, type: 'sine', slide: 1.5 }));
      return false;
    }
    if (rate) {
      this.acc += dt * rate;
      const n = Math.floor(this.acc); this.acc -= n;
      if (n) this.emitBody(n, this.wind);
    }
    if (o.speed > cap) o.speed -= (o.speed - cap) * Math.min(1, dt * 10);
    return true;
  }
  dispose() { if (this.o.mvDust === this) this.o.mvDust = null; }
}

// ---- AI helpers -------------------------------------------------------------------------------
function gapTo(k, o) { return o ? Math.abs(o.raceDist - k.raceDist) : Infinity; }
function inSights(k, o, maxD, cone) {
  if (!live(o)) return false;
  const dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z;
  return dx * dx + dz * dz < maxD * maxD && Math.abs(angleDiff(k.yaw, Math.atan2(dx, dz))) < cone;
}

// ---- icons (viewBox 0 0 64 64, chunky LEGO style) ----------------------------------------------
const ICON_MJOLNIR = '<svg viewBox="0 0 64 64"><path d="M10 4l-4 9h6l-5 10M54 4l4 9h-6l5 10" stroke="#9fe8ff" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><rect x="27" y="32" width="10" height="26" rx="2" fill="#7c503a"/><rect x="24" y="56" width="16" height="6" rx="2" fill="#6c6e68"/><rect x="13" y="10" width="38" height="24" rx="3" fill="#b8bec6"/><rect x="9" y="8" width="8" height="28" rx="2" fill="#7d848c"/><rect x="47" y="8" width="8" height="28" rx="2" fill="#7d848c"/></g><path d="M28 39h8M28 45h8M28 51h8" stroke="#583927" stroke-width="2.5"/><rect x="19" y="14" width="26" height="4" fill="#eef3f8"/><g fill="#a0a5a9" stroke="#1b2a34" stroke-width="1.5"><rect x="22" y="5" width="7" height="5"/><rect x="35" y="5" width="7" height="5"/></g></svg>';
const ICON_SHIELD = '<svg viewBox="0 0 64 64"><path d="M4 22q-2 10 0 20M9 16q-3 16 0 32" stroke="#bfe0ff" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="35" cy="32" r="27" fill="#c4141c" stroke="#1b2a34" stroke-width="3"/><circle cx="35" cy="32" r="20" fill="#f4f4f4"/><circle cx="35" cy="32" r="14" fill="#c4141c"/><circle cx="35" cy="32" r="9" fill="#1f3a93"/><path d="M35 23.5l2.1 6 6.4.1-5.1 3.9 1.9 6.2-5.3-3.7-5.3 3.7 1.9-6.2-5.1-3.9 6.4-.1z" fill="#f4f4f4"/><path d="M18 18q6-7 14-8" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/></svg>';
const ICON_WEB = '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="33" rx="23" ry="28" fill="#c91a09" stroke="#1b2a34" stroke-width="3"/><g stroke="#1b2a34" stroke-width="1.6" fill="none" opacity=".8"><path d="M32 5v56M9 33h46M16 13l32 40M48 13L16 53"/><ellipse cx="32" cy="33" rx="9" ry="11"/><ellipse cx="32" cy="33" rx="17" ry="20"/></g><path d="M13 24q11-1 16 11q-11 5-16-11z" fill="#fff" stroke="#1b2a34" stroke-width="3.2" stroke-linejoin="round"/><path d="M51 24q-11-1-16 11q11 5 16-11z" fill="#fff" stroke="#1b2a34" stroke-width="3.2" stroke-linejoin="round"/></svg>';
const ICON_SNAP = '<svg viewBox="0 0 64 64"><g stroke="#7a5a00" stroke-width="2.5" stroke-linejoin="round" fill="#e8b830"><rect x="20" y="50" width="24" height="11" rx="2" fill="#b88a1a"/><rect x="17" y="12" width="7" height="20" rx="3"/><rect x="25" y="20" width="7" height="12" rx="3"/><rect x="33" y="9" width="7" height="23" rx="3"/><rect x="41" y="14" width="6" height="18" rx="3"/><path d="M17 42l-9-12 5-4 10 9z"/><rect x="16" y="28" width="32" height="24" rx="4"/></g><g stroke="#1b2a34" stroke-width="1.5"><circle cx="20.5" cy="31" r="3" fill="#8a2be2"/><circle cx="28.5" cy="31" r="3" fill="#1e6bff"/><circle cx="36.5" cy="31" r="3" fill="#e0201a"/><circle cx="44" cy="31" r="3" fill="#ff8a10"/><circle cx="11" cy="31" r="2.6" fill="#22c24a"/><ellipse cx="32" cy="42" rx="5" ry="6" fill="#ffd21a"/></g><path d="M28 6l2 5M22 9l3 4M35 3v5" stroke="#fff2b0" stroke-width="2.5" stroke-linecap="round"/></svg>';

export default [
  {
    id: 'mjolnir', name: 'Mjolnir', color: '#8fd8ff', icon: ICON_MJOLNIR, gesture: 'throwF',
    help: 'Hurl Thor\'s hammer at the kart ahead: lightning chains to up to 3 more karts around it, then the hammer flies back to you.',
    odds: [0, 3, 5, 5, 4],
    ai: (k, ctx) => {
      const a = ctx.ahead(k, 1)[0];
      if (a) return live(a) && gapTo(k, a) < 200;
      const b = ctx.behind(k, 1)[0];
      return live(b) && gapTo(k, b) < 60 ? { back: true } : false;
    },
    use(k, ctx, { back }) {
      ctx.spawn(new Mjolnir(k, ctx, !!back));
      whoosh(ctx, k.pos, 500);
      snd(ctx, k.pos, (au, a) => au.noiseHit(0.3, { vol: 0.2 * a, freq: 4000, q: 0.8 }));
    },
  },
  {
    id: 'capshield', name: 'Cap\'s Shield', color: '#c4141c', icon: ICON_SHIELD, gesture: 'throwF',
    help: 'Throw Captain America\'s shield: it ricochets off up to 3 karts ahead (or behind), then comes back to you for a little boost.',
    odds: [2, 4, 4, 3, 2],
    ai: (k, ctx) => {
      const a = ctx.ahead(k, 1)[0];
      if (a && live(a) && gapTo(k, a) < 150) return true;
      const b = ctx.behind(k, 1)[0];
      return !a && live(b) && gapTo(k, b) < 40 ? { back: true } : false;
    },
    use(k, ctx, { back }) {
      ctx.spawn(new CapShield(k, ctx, !!back));
      whoosh(ctx, k.pos, 1200);
    },
  },
  {
    id: 'webshot', name: 'Web Shot', color: '#e0301a', icon: ICON_WEB, gesture: 'throwF',
    help: 'Shoot a web that sticks the first kart it hits to the road; throw it backwards to leave a sticky web trap.',
    odds: [6, 4, 2, 1, 0],
    ai: (k, ctx) => {
      const a = ctx.ahead(k, 1)[0];
      if (inSights(k, a, 42, 0.3)) return true;
      const b = ctx.behind(k, 1)[0];
      if (live(b) && gapTo(k, b) < 22) return { back: true };
      return false;
    },
    use(k, ctx, { back }) {
      if (back) ctx.spawn(new WebTrap(k, ctx));
      else ctx.spawn(new WebBall(k, ctx));
      thwip(ctx, k.pos);
    },
  },
  {
    id: 'snap', name: 'Infinity Snap', color: '#ffc21a', icon: ICON_SNAP, gesture: 'use',
    help: 'Snap the Infinity Gauntlet: half the racers ahead of you crumble to dust and crawl along until they reform.',
    odds: [0, 0, 0, 2, 5],
    ai: (k, ctx) => ctx.ahead(k, 11).filter((o) => live(o) && !o.mvDust).length >= 2,
    use(k, ctx) { ctx.spawn(new Snap(k, ctx)); },
  },
];
