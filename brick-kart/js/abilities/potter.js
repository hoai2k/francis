// Harry Potter abilities (see ../abilities.js for the contract). Models and shaders live in
// ./potter-fx.js.
//   Expelliarmus        – a red jet from your wand homes on the kart ahead, spins them out and
//                         snatches the item they were holding for you
//   Wingardium Leviosa  – swish and flick: the 2-3 karts just ahead float helplessly up off the road,
//                         crawl along in the air, then drop
//   Expecto Patronum    – a silver brick stag charges down the track bowling karts aside while its
//                         light shields you from incoming shots
//   Invisibility Cloak  – you fade to a faint shimmer for 6 s: shots, traps and hazards pass through,
//                         rockets lose you, and you slip along a little faster
//   Golden Snitch       – chase the Snitch: it towes you on autopilot far up the track at huge
//                         speed, knocking karts aside, until you catch it
import * as THREE from 'three';
import {
  disposeOwned, glowSprite, stagModel, snitchModel, boltModel, beamMesh, featherModel, tokenModel,
  shieldBubble, runeDisc, shimmerMaterial, stretch, prewarmAll,
} from './potter-fx.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), V4 = new THREE.Vector3();
const LOC = {};
const TAU = Math.PI * 2;
const wrapA = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);
const angleDiff = (a, b) => wrapA(b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const live = (o) => !!o && !o.finished && !(o.respawn > 0);
const gapTo = (k, o) => (o ? Math.abs(o.raceDist - k.raceDist) : Infinity);
const chaseOf = (ctx, k) => ctx.race.cams?.find((c) => c.kart === k)?.chase;

// sounds, attenuated by distance to the nearest listener
function snd(ctx, pos, fn) {
  const au = ctx.audio;
  if (!au?.ctx) return;
  const a = pos && au.att ? au.att(pos) : 1;
  if (a > 0.03) fn(au, a);
}
const chime = (ctx, pos, base = 1320, n = 4, vol = 0.06) => snd(ctx, pos, (au, a) => {
  for (let i = 0; i < n; i++) au.tone(base * Math.pow(1.335, i), 0.5, { vol: vol * a, type: 'sine', at: i * 0.045 });
});
const whoosh = (ctx, pos, f = 900, d = 0.45) => snd(ctx, pos, (au, a) => au.noiseHit(d, { vol: 0.28 * a, freq: f, sweep: 2.2, q: 1.4 }));

// the tip of the driver's wand (right hand, over the hood)
function wandTip(k, out) {
  const s = k.megaScale || 1, sy = Math.sin(k.yaw), cy = Math.cos(k.yaw);
  return out.set(k.pos.x + sy * 1.5 * s - cy * 0.55 * s, k.pos.y + 2.5 * s, k.pos.z + cy * 1.5 * s + sy * 0.55 * s);
}
const chest = (o, out, h = 1.2) => out.copy(o.pos).setY(o.pos.y + h * (o.megaScale || 1));
function groundY(ctx, e) {
  e.loc = ctx.track.locate(e.pos.x, e.pos.y, e.pos.z, e.si, e.loc || {});
  e.si = e.loc.i;
  return e.loc.y;
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
  return Math.max(0, L - e.speed * dt);
}
// slide a kart sideways for a moment (never off the road)
function shove(ctx, o, vx, vz, life = 0.55) {
  let t = life;
  ctx.spawn({
    name: 'hp-shove',
    update(dt) {
      t -= dt;
      if (t <= 0 || !live(o)) return false;
      const dx = vx * dt, dz = vz * dt;
      const L = ctx.track.locate(o.pos.x + dx, o.pos.y, o.pos.z + dz, o.loc.i ?? 0, LOC);
      if (Math.abs(L.lat) < L.hw - 1.2 || Math.abs(L.lat) < Math.abs(o.loc.lat ?? 0)) { o.pos.x += dx; o.pos.z += dz; }
      const f = Math.exp(-4 * dt); vx *= f; vz *= f;
      if (Math.random() < 0.4) ctx.fx.puff(o.pos.x, o.pos.y + 0.4, o.pos.z, 0, 1.5, 0, 0xdfe8ff, 0.5);
      return true;
    },
    dispose() {},
  });
}
// a point on the track at a fractional sample s (smooth motion for runners)
function trackPoint(tr, s, lat, out) {
  const i0 = Math.floor(s), f = s - i0;
  tr.at(i0, lat, 0, V1); tr.at(i0 + 1, lat, 0, V2);
  out.lerpVectors(V1, V2, f);
  // over jump gaps follow the racing line's height rather than the ground below
  const i = tr.wrap(i0);
  if (tr.GAP[i]) out.y = Math.max(out.y, tr.py(i));
  return out;
}

// ============================================================================================
// Expelliarmus: a homing red bolt; whoever it hits spins out and loses their item to you
// ============================================================================================
class Disarm {
  constructor(k, ctx, back) {
    this.k = k; this.ctx = ctx;
    this.dir = back ? -1 : 1;
    this.target = (back ? ctx.behind(k, 1) : ctx.ahead(k, 1)).find(live) || null;
    this.mesh = boltModel();
    ctx.scene.add(this.mesh);
    this.tip = wandTip(k, new THREE.Vector3());
    this.pos = this.tip.clone().addScaledVector(k.forward(V1), back ? -3.5 : 1);
    this.yaw = back ? wrapA(k.yaw + Math.PI) : k.yaw;
    this.speed = Math.max(96, Math.abs(k.speed) + 46);
    this.si = k.loc.i ?? 0; this.loc = {};
    this.t = 0; this.dead = false;
    this.beam = beamMesh(); this.beam2 = beamMesh(0xffd0c0);
    ctx.scene.add(this.beam, this.beam2);
    this.mesh.position.copy(this.pos);
    // the cast: a red flash at the wand and a sharp crack
    for (let j = 0; j < 16; j++) ctx.fx.spark(this.tip.x, this.tip.y, this.tip.z, rnd(8), rnd(6), rnd(8), j % 3 ? 0xff3a20 : 0xffffff, 0.3);
    snd(ctx, k.pos, (au, a) => {
      au.noiseHit(0.08, { vol: 0.45 * a, freq: 4200, q: 1.5 });
      au.tone(520, 0.35, { vol: 0.12 * a, type: 'sawtooth', slide: 2.6, filter: 2600 });
      au.tone(260, 0.3, { vol: 0.1 * a, type: 'square', slide: 1.8, filter: 1200 });
    });
  }
  update(dt) {
    const ctx = this.ctx, fx = ctx.fx, k = this.k;
    this.t += dt;
    if (this.dead || this.t > 4.5) { this.fizzle(); return false; }
    const gy = groundY(ctx, this);
    const tg = live(this.target) ? this.target : null;
    if (tg) {
      const aim = chest(tg, V2, 1.2), d = aim.distanceTo(this.pos);
      if (d < 14) homeIn(this, aim, dt);
      else {
        if (d < 50) steer(this, aim, 10, dt);
        else steer(this, ctx.at(this.loc.i + 14 * this.dir, 0, 0, V1), 6, dt);
        this.pos.y += (Math.max(gy + 1.6, aim.y) - this.pos.y) * Math.min(1, dt * 7);
      }
    } else {
      steer(this, ctx.at(this.loc.i + 14 * this.dir, 0, 0, V1), 6, dt);
      this.pos.y += (gy + 1.6 - this.pos.y) * Math.min(1, dt * 7);
      if (this.t > 2) { this.fizzle(); return false; }
    }
    // hits whoever it touches first
    for (const o of ctx.race.karts) {
      if ((o === k && this.t < 0.5) || !live(o)) continue;
      const r = 2.5 * (o.megaScale || 1);
      if (o.pos.distanceToSquared(this.pos) < r * r && Math.abs(o.pos.y + 1 - this.pos.y) < 3 * (o.megaScale || 1)) { this.strike(o); return false; }
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    const u = this.mesh.userData;
    u.spin.rotation.x += dt * 16; u.spin.rotation.z += dt * 11;
    u.halo.scale.setScalar(4.6 * (0.85 + Math.random() * 0.3));
    // red sparks and a pink haze trail
    for (let n = 0; n < 3; n++) fx.spark(this.pos.x + rnd(0.5), this.pos.y + rnd(0.5), this.pos.z + rnd(0.5), rnd(3), rnd(3), rnd(3), n ? 0xff3a20 : 0xffffff, 0.3);
    if (Math.random() < 0.4) fx.puff(this.pos.x, this.pos.y, this.pos.z, 0, 0.5, 0, 0xff8a80, 0.4);
    // the jet from the wand stretches after the bolt, then fades
    const lo = 1 - this.t / 0.35;
    this.beam.visible = this.beam2.visible = lo > 0 && live(k);
    if (this.beam.visible) {
      wandTip(k, this.tip);
      stretch(this.beam, this.tip, this.pos, 0.45 * lo);
      stretch(this.beam2, this.tip, this.pos, 0.16 * lo);
      this.beam.material.opacity = 0.85 * lo;
      this.beam2.material.opacity = lo;
    }
    return true;
  }
  strike(o) {
    const ctx = this.ctx, fx = ctx.fx, p = this.pos;
    const ok = ctx.hit(o, 'spin', this.k, 'expelliarmus');
    ctx.ring(o.pos, 7, 0xff3a20);
    fx.pop(p, 0xff3a20); fx.pop(p, 0xffffff);
    snd(ctx, p, (au, a) => {
      au.noiseHit(0.25, { vol: 0.4 * a, freq: 2200, sweep: 0.4, q: 1.2 });
      au.tone(880, 0.25, { vol: 0.1 * a, type: 'sawtooth', slide: 0.4, filter: 3000 });
    });
    if (ok) steal(this.k, o, ctx);
  }
  fizzle() { this.ctx.fx.pop(this.pos, 0xff8a70); }
  // blocked (Force Push, saber, Patronus…): the spell breaks up
  deflect(pos, r) { if (this.pos.distanceToSquared(pos) < r * r) this.dead = true; }
  dispose() {
    this.ctx.scene.remove(this.mesh, this.beam, this.beam2);
    disposeOwned(this.mesh); this.beam.material.dispose(); this.beam2.material.dispose();
  }
}
// take the victim's held item (or the one queued behind it) and fly it over to the caster
function steal(k, o, ctx) {
  let it = null, n = 1;
  if (o.item) {
    it = o.item; n = o.itemCount || 1;
    if (it === 'goldturbo') o.goldTurboStarted = false;
    o.item = null; o.itemCount = 0;
  } else if (o.nextItem) { it = o.nextItem; o.nextItem = null; }
  if (!it) return;
  o.player?.rumble(0.3, 150);
  ctx.spawn(new Token(o, k, it, n, ctx));
}
class Token {
  constructor(from, to, item, n, ctx) {
    this.to = to; this.item = item; this.n = n; this.ctx = ctx; this.t = 0;
    this.a = chest(from, new THREE.Vector3(), 2.2);
    this.mesh = tokenModel();
    this.mesh.position.copy(this.a);
    ctx.scene.add(this.mesh);
  }
  update(dt) {
    const ctx = this.ctx, k = this.to;
    this.t += dt;
    if (!live(k)) { ctx.fx.pop(this.mesh.position, 0xffd060); return false; }
    const f = Math.min(1, this.t / 0.7), e = f * f * (3 - 2 * f);
    const b = chest(k, V1, 2.4);
    this.mesh.position.lerpVectors(this.a, b, e);
    this.mesh.position.y += Math.sin(f * Math.PI) * 5;
    this.mesh.rotation.y += dt * 9; this.mesh.rotation.x += dt * 5;
    ctx.fx.spark(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, rnd(2), rnd(2), rnd(2), Math.random() < 0.5 ? 0xffd060 : 0xffffff, 0.35);
    if (f < 1) return true;
    // into the caster's item slot (or the second slot if that's taken)
    if (!k.item && !(k.roulette > 0)) { k.item = this.item; k.itemCount = this.n; if (this.item === 'goldturbo') k.goldTurboStarted = false; }
    else if (!k.nextItem && !(k.roulette2 > 0)) k.nextItem = this.item;
    ctx.fx.pop(k.pos, 0xffd060);
    if (k.human) ctx.audio.sfx('itemget');
    chime(ctx, k.pos, 990, 3, 0.07);
    return false;
  }
  dispose() { disposeOwned(this.mesh); }
}

// ============================================================================================
// Wingardium Leviosa: the karts just ahead float up off the road, then drop
// ============================================================================================
const LEV_TIME = 2.4, LEV_H = 4.2, LEV_SLOW = 0.3;
function leviosa(k, ctx) {
  let victims = ctx.ahead(k, 3).filter((o) => live(o) && !o.hpFloat && gapTo(k, o) < 170);
  if (!victims.length) victims = ctx.behind(k, 2).filter((o) => live(o) && !o.hpFloat && gapTo(k, o) < 70);
  const tip = wandTip(k, V4);
  for (let j = 0; j < 24; j++) ctx.fx.spark(tip.x, tip.y, tip.z, rnd(6), 3 + Math.random() * 6, rnd(6), j % 3 ? 0xfff0a0 : 0xffffff, 0.5, -4);
  snd(ctx, k.pos, (au, a) => {
    au.noiseHit(0.5, { vol: 0.22 * a, freq: 1800, sweep: 2.5, q: 2 });
    for (let i = 0; i < 6; i++) au.tone(660 * Math.pow(1.19, i), 0.6, { vol: 0.05 * a, type: 'sine', at: 0.05 + i * 0.06 });
  });
  victims.forEach((o, i) => { o.hpFloat = ctx.spawn(new Float(o, k, 0.2 + i * 0.14, ctx)); });
}
class Float {
  constructor(o, by, delay, ctx) {
    this.o = o; this.by = by; this.ctx = ctx; this.t = -delay; this.delay = delay; this.started = false;
    this.base = o.pos.y; this.si = o.loc.i ?? 0;
  }
  update(dt) {
    const o = this.o, ctx = this.ctx, fx = ctx.fx;
    this.t += dt;
    if (this.t < 0) {
      // the spell's sparkle stream flies from the wand to the target
      if (live(this.by) && live(o)) {
        const f = 1 + this.t / this.delay;
        wandTip(this.by, V1); chest(o, V2, 1.5);
        for (let n = 0; n < 4; n++) { V3.lerpVectors(V1, V2, Math.min(1, f + n * 0.06)); V3.y += Math.sin(f * Math.PI) * 3; fx.spark(V3.x + rnd(0.4), V3.y + rnd(0.4), V3.z + rnd(0.4), rnd(1), rnd(1), rnd(1), n % 2 ? 0xfff0a0 : 0xffffff, 0.35); }
      }
      return true;
    }
    if (!this.started) {
      this.started = true;
      if (!this.grab()) return false;
      this.feather = featherModel(); this.disc = runeDisc();
      this.glow = glowSprite(0xfff0b0, 6, 0.5);
      ctx.scene.add(this.feather, this.disc, this.glow);
      chime(ctx, o.pos, 1180, 4, 0.06);
    }
    if (!live(o)) return false;
    const t = this.t;
    // the road under the kart (keep the last height over gaps)
    const L = ctx.track.locate(o.pos.x, this.base + 1, o.pos.z, this.si, LOC);
    this.si = L.i;
    if (!L.gap && Math.abs(L.lat) < L.hw + L.sh) this.base = L.y;
    // drift along with the road, never out over the walls
    const lim = Math.max(1, L.hw - 1.2);
    if (Math.abs(L.lat) > lim) { const pen = (Math.abs(L.lat) - lim) * Math.sign(L.lat) * Math.min(1, dt * 8); o.pos.x -= L.rx * pen; o.pos.z -= L.rz * pen; }
    if (o.speed > 0) o.moveYaw += angleDiff(o.moveYaw, Math.atan2(L.tx, L.tz)) * Math.min(1, dt * 2.5);
    if (t < LEV_TIME) {
      const rise = 1 - Math.pow(1 - Math.min(1, t / 0.7), 3);
      o.pos.y = this.base + LEV_H * rise + Math.sin(t * 3.2) * 0.35 * rise;
      o.vy = 0; o.grounded = false;
      if (o.gliding) o.setGliding(false);
      o.cancelDrift();
      const cap = o.topSpeed * LEV_SLOW;
      if (o.speed > cap) o.speed -= (o.speed - cap) * Math.min(1, dt * 3);
      // floats helplessly: a slow tumble (the kart resets its rotation every frame)
      const R = o.model.root;
      R.position.y = o.pos.y;
      R.rotation.z += Math.sin(t * 2.3) * 0.28 * rise;
      R.rotation.x += Math.sin(t * 1.7 + 1) * 0.16 * rise;
      // the feather bobs above, the magic circle turns below
      const s = o.megaScale || 1;
      this.feather.position.set(o.pos.x + Math.sin(t * 1.4) * 0.6, o.pos.y + 3.6 * s + Math.sin(t * 2.6) * 0.3, o.pos.z + Math.cos(t * 1.1) * 0.6);
      this.feather.rotation.set(Math.sin(t * 2.1) * 0.35, t * 1.5, Math.sin(t * 1.6) * 0.5);
      this.disc.position.set(o.pos.x, this.base + 0.15, o.pos.z);
      this.disc.rotation.y = t * 1.2;
      this.disc.scale.setScalar(3.4 * rise * (1 + Math.sin(t * 5) * 0.04) + 0.01);
      this.disc.material.opacity = 0.8 * Math.min(1, (LEV_TIME - t) / 0.4);
      this.glow.position.set(o.pos.x, o.pos.y + 1, o.pos.z);
      if (Math.random() < 0.6) fx.spark(o.pos.x + rnd(2), this.base + 0.3, o.pos.z + rnd(2), 0, 3 + Math.random() * 3, 0, Math.random() < 0.5 ? 0xfff0a0 : 0xffffff, 0.6);
      return true;
    }
    // ... and down it comes
    o.vy = -6; o.grounded = false;
    o.invuln = Math.max(o.invuln, 0.9);
    fx.pop(o.pos, 0xfff0a0);
    snd(ctx, o.pos, (au, a) => au.tone(440, 0.4, { vol: 0.08 * a, type: 'sine', slide: 0.4 }));
    return false;
  }
  // respects shields, invulnerability and mega/golden karts
  grab() {
    const o = this.o, ctx = this.ctx, by = this.by;
    if (!live(o) || o.finishedCoast) return false;
    if (o.invincible || o.megaTime > 0) { ctx.fx.pop(o.pos, 0xfff0a0); return false; }
    if (o.shieldBlocks()) return false;
    o.cancelDrift();
    o.boostTime = 0;
    o.emote?.('ouch');
    o.player?.rumble(0.4, 250);
    if (by && by.human) by.player?.rumble(0.2, 80);
    ctx.race.onHit?.(o, 'spin', by);
    ctx.race.onProjectileHit?.(by, o, 'leviosa');
    return true;
  }
  dispose() {
    for (const m of [this.feather, this.disc, this.glow]) if (m) disposeOwned(m);
    if (this.o.hpFloat === this) this.o.hpFloat = null;
  }
}

// ============================================================================================
// Expecto Patronum: a silver stag charges up the track; its light shields the caster
// ============================================================================================
const PAT_RUN = 3.0, PAT_GUARD = 4.5;
class Patronus {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx; this.t = 0;
    const tr = ctx.track;
    this.s = (k.loc.i ?? 0) + 4;
    this.lat = clamp(k.loc.lat ?? 0, -tr.HW[tr.wrap(this.s)] * 0.6, tr.HW[tr.wrap(this.s)] * 0.6);
    this.speed = Math.max(84, k.speed + 36);
    this.stag = stagModel();
    this.stag.scale.setScalar(0.3);
    ctx.scene.add(this.stag);
    this.p = new THREE.Vector3(); this.yaw = k.yaw; this.phase = 0;
    this.hitSet = new Set([k]);
    this.bubble = shieldBubble();
    k.model.root.add(this.bubble);
    this.blocked = 0;
    const tip = wandTip(k, V4);
    ctx.ring(k.pos, 12, 0xbfe0ff);
    for (let j = 0; j < 40; j++) { const a = Math.random() * TAU, b = Math.random() * Math.PI, sp = 6 + Math.random() * 10; ctx.fx.spark(tip.x, tip.y, tip.z, Math.cos(a) * Math.sin(b) * sp, Math.cos(b) * sp, Math.sin(a) * Math.sin(b) * sp, j % 3 ? 0xdff0ff : 0x7fb8ff, 0.6); }
    if (k.human) ctx.race.flash?.(0xe8f4ff);
    // a shimmering choir chord and a rush of air
    snd(ctx, k.pos, (au, a) => {
      for (const [f, d] of [[392, 0], [494, 0.05], [587, 0.1], [784, 0.15], [988, 0.2]]) au.tone(f, 1.6, { vol: 0.05 * a, type: 'triangle', attack: 0.25, at: d });
      au.tone(196, 1.6, { vol: 0.07 * a, type: 'sine', attack: 0.3 });
      au.noiseHit(1.2, { vol: 0.2 * a, freq: 600, sweep: 4, q: 0.8, at: 0.1 });
    });
  }
  extend() { this.guardEnd = this.t + PAT_GUARD; }
  update(dt) {
    const ctx = this.ctx, k = this.k, fx = ctx.fx, tr = ctx.track, race = ctx.race;
    this.t += dt;
    const t = this.t;
    // ---- the stag
    if (this.stag && t < PAT_RUN + 0.45) {
      this.s += this.speed * dt;
      const i = tr.wrap(Math.floor(this.s)), hw = tr.HW[i] || 8;
      // swerve toward the next kart ahead of it
      let want = this.lat * 0.97, best = 60;
      for (const o of race.karts) {
        if (this.hitSet.has(o) || !live(o)) continue;
        const di = ((o.loc.i ?? 0) - i + tr.N) % tr.N;
        if (di < best && di > 1) { best = di; want = o.loc.lat ?? 0; }
      }
      this.lat += clamp(clamp(want, -hw * 0.75, hw * 0.75) - this.lat, -16 * dt, 16 * dt);
      trackPoint(tr, this.s, this.lat, this.p);
      this.phase += dt * 10;
      const leap = Math.abs(Math.sin(this.phase * 0.5)) * 0.9;
      const S = this.stag, u = S.userData;
      S.position.set(this.p.x, this.p.y + leap, this.p.z);
      this.yaw += angleDiff(this.yaw, tr.yawAt(i + 3)) * Math.min(1, dt * 10);
      S.rotation.set(Math.cos(this.phase * 0.5) * 0.12, this.yaw, 0);
      u.legs.forEach((g, j) => { g.rotation.x = Math.sin(this.phase * 0.5 * 2 + (j < 2 ? 0 : Math.PI) + (j % 2) * 0.5) * 0.85; });
      const fin = t > PAT_RUN ? 1 - (t - PAT_RUN) / 0.45 : 1;
      S.scale.setScalar(1.2 * Math.min(1, 0.3 + t * 3) * (fin < 1 ? 1 + (1 - fin) * 0.4 : 1));
      u.mat.opacity = 0.8 * Math.min(1, t * 4) * fin;
      u.glow.opacity = 0.45 * fin * (0.8 + Math.random() * 0.2);
      u.spr.material.opacity = 0.55 * fin;
      // silver mist and sparkles stream off it
      for (let n = 0; n < 3; n++) fx.spark(this.p.x + rnd(1.5), this.p.y + 1 + Math.random() * 4, this.p.z + rnd(1.5), rnd(2), 1 + Math.random() * 2, rnd(2), n ? 0xdff0ff : 0x8fc0ff, 0.6);
      if (Math.random() < 0.6) fx.puff(this.p.x + rnd(1), this.p.y + 0.4, this.p.z + rnd(1), rnd(1), 1, rnd(1), 0xe0ecff, 0.7);
      // bowls karts aside
      if (fin > 0.3) {
        for (const o of race.karts) {
          if (this.hitSet.has(o) || !live(o)) continue;
          const dx = o.pos.x - this.p.x, dz = o.pos.z - this.p.z, r = 3.8 + ((o.megaScale || 1) - 1) * 2;
          if (dx * dx + dz * dz > r * r || Math.abs(o.pos.y - this.p.y) > 4) continue;
          this.hitSet.add(o);
          if (ctx.hit(o, 'spin', k, 'patronus')) {
            const sd = Math.sign((o.loc.lat ?? 0) - this.lat) || (Math.random() < 0.5 ? -1 : 1);
            const rx = tr.R[i * 2], rz = tr.R[i * 2 + 1], fx2 = Math.sin(this.yaw), fz2 = Math.cos(this.yaw);
            shove(ctx, o, rx * sd * 16 + fx2 * 9, rz * sd * 16 + fz2 * 9);
            if (o.grounded) { o.vy = 7.5; o.grounded = false; }
            fx.pop(o.pos, 0xdff0ff);
            chime(ctx, o.pos, 1560, 3, 0.07);
          }
        }
        // traps in its path dissolve
        const items = race.items;
        for (const tp of items.traps) {
          if (tp.pos.distanceToSquared(this.p) > 16) continue;
          fx.pop(tp.pos, 0xdff0ff);
          items.removeTrap(tp);
          break;
        }
        for (const e of items.ents) if (e !== this && e.deflect && e.k !== k) e.deflect(this.p, 4, k);
      }
      if (t >= PAT_RUN + 0.45) { disposeOwned(this.stag); this.stag = null; }
    }
    // ---- the guard: incoming shots near the caster burst on the silver light
    const end = this.guardEnd ?? PAT_GUARD;
    const on = t < end && live(k);
    if (on) this.guard(dt);
    const fade = Math.min(1, t * 4) * Math.min(1, Math.max(0, (end - t) / 0.4));
    this.bubble.material.uniforms.opacity.value = fade * (0.75 + Math.sin(t * 9) * 0.12 + this.blocked * 0.8);
    this.bubble.scale.set(2.7, 2.2, 3.1).multiplyScalar(1 + this.blocked * 0.12);
    this.blocked = Math.max(0, this.blocked - dt * 3);
    if (on && Math.random() < 0.5) { const a = Math.random() * TAU; fx.spark(k.pos.x + Math.cos(a) * 2.6, k.pos.y + 0.5 + Math.random() * 2, k.pos.z + Math.sin(a) * 2.6, 0, 1.5, 0, 0xdff0ff, 0.4); }
    return !!this.stag || t < end || (live(k) && t < end + 0.1);
  }
  guard() {
    const ctx = this.ctx, k = this.k, items = ctx.race.items, fx = ctx.fx;
    const R = 7.5 * (k.megaScale || 1);
    const block = (p) => {
      fx.pop(p, 0xdff0ff); fx.pop(p, 0x7fb8ff);
      this.blocked = 1;
      snd(ctx, p, (au, a) => { au.tone(1760, 0.3, { vol: 0.09 * a, type: 'triangle', slide: 0.97 }); au.noiseHit(0.12, { vol: 0.25 * a, freq: 5000, q: 1 }); });
    };
    for (const p of items.proj) {
      if (p.owner === k || p.life <= 0) continue;
      if (p.type === 'seeker' && !p.diving) continue;
      const r = R + (p.type === 'seeker' ? 3 : 0) + (p.speed || 0) * 0.03;
      if (p.pos.distanceToSquared(k.pos) > r * r || Math.abs(p.pos.y - k.pos.y) > 8) continue;
      p.life = 0; p.mesh.visible = false;
      block(p.pos);
    }
    for (const s of items.storms) if (s.kart === k && !s.hit) { s.hit = true; block(s.cloud.position); }
    for (const e of items.ents) if (e !== this && e.deflect && e.k !== k && e.kart !== k) e.deflect(k.pos, R, k);
  }
  dispose() {
    if (this.stag) disposeOwned(this.stag);
    disposeOwned(this.bubble);
    if (this.k.hpPatronus === this) this.k.hpPatronus = null;
  }
}

// ============================================================================================
// Invisibility Cloak: fade to a shimmer; untouchable, untargetable, a touch faster
// ============================================================================================
const CLOAK_TIME = 6;
class Cloak {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx; this.t = 0; this.end = CLOAK_TIME;
    this.mat = shimmerMaterial();
    this.swapped = []; this.hidden = [];
    k.model.body.traverse((o) => {
      if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh) { this.swapped.push([o, o.material, o.castShadow]); o.material = this.mat; o.castShadow = false; }
      else if ((o.isInstancedMesh || o.isSkinnedMesh || o.isSprite || o.isPoints || o.isLine) && o.visible) { this.hidden.push(o); o.visible = false; }
    });
    this.swirl(0x9aa8c0);
    snd(ctx, k.pos, (au, a) => {
      au.noiseHit(0.6, { vol: 0.3 * a, freq: 3000, sweep: 0.2, q: 0.9 });
      au.tone(1800, 0.7, { vol: 0.04 * a, type: 'sine', slide: 0.5 });
      au.tone(2400, 0.6, { vol: 0.03 * a, type: 'sine', slide: 0.6, at: 0.08 });
    });
  }
  extend() { this.end = Math.max(this.end, this.t + CLOAK_TIME); }
  swirl(col) {
    const k = this.k, fx = this.ctx.fx;
    for (let j = 0; j < 26; j++) { const a = j / 26 * TAU; fx.spark(k.pos.x + Math.cos(a) * 2.2, k.pos.y + 0.3 + (j % 5) * 0.6, k.pos.z + Math.sin(a) * 2.2, -Math.sin(a) * 6, 2, Math.cos(a) * 6, j % 2 ? col : 0xffffff, 0.5); }
    for (let j = 0; j < 6; j++) fx.puff(k.pos.x + rnd(1.5), k.pos.y + 0.8 + Math.random() * 1.5, k.pos.z + rnd(1.5), rnd(2), 1, rnd(2), 0xc8d0dc, 0.7);
  }
  update(dt) {
    const k = this.k, ctx = this.ctx, race = ctx.race;
    this.t += dt;
    if (k.finished || !k.model.root.parent) return false;
    if (this.t >= this.end) {
      this.swirl(0xdfe6ee);
      snd(ctx, k.pos, (au, a) => { au.noiseHit(0.4, { vol: 0.25 * a, freq: 700, sweep: 4, q: 0.9 }); au.tone(900, 0.35, { vol: 0.05 * a, type: 'sine', slide: 2 }); });
      return false;
    }
    k.ghostTime = Math.max(k.ghostTime, 0.12);   // shots, traps, hazards and karts pass through
    k.model.body.visible = true;                 // no ghost blinking: the shimmer is the look
    const left = this.end - this.t;
    this.mat.uniforms.time.value = this.t;
    this.mat.uniforms.amt.value = (this.t < 0.35 ? 2.2 - this.t * 4 : 0.8) * (left < 0.8 && Math.floor(left * 12) % 2 ? 1.8 : 1);
    // slips along a little faster
    if (k.grounded && !k.stunned && k.speed > k.topSpeed * 0.6) {
      const cap = k.topSpeed * (k.speedMult || 1) * 1.1;
      if (k.speed < cap) k.speed = Math.min(cap, k.speed + 14 * dt);
    }
    // nobody can lock on: rockets and steering abilities lose track
    for (const p of race.items.proj) if (p.target === k) p.target = null;
    for (const o of race.karts) if (o.aimAt === k) o.aimAt = null;
    if (Math.random() < 0.15) ctx.fx.spark(k.pos.x + rnd(1.5), k.pos.y + Math.random() * 2, k.pos.z + rnd(1.5), 0, 0.5, 0, 0xc8d4e8, 0.3);
    return true;
  }
  dispose() {
    for (const [o, m, cs] of this.swapped) { o.material = m; o.castShadow = cs; }
    for (const o of this.hidden) o.visible = true;
    this.mat.dispose();
    if (this.k.hpCloak === this) this.k.hpCloak = null;
  }
}

// ============================================================================================
// Golden Snitch: the Snitch appears ahead and tows you on autopilot far up the track
// ============================================================================================
const SNITCH_TIME = 5;
class Snitch {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx; this.t = 0; this.end = SNITCH_TIME;
    const tr = ctx.track;
    this.s = (k.loc.i ?? 0) + (k.loc.t ?? 0);
    this.lat = k.loc.lat ?? 0;
    this.v = Math.max(0, k.speed);
    this.mesh = snitchModel();
    ctx.scene.add(this.mesh);
    this.sp = new THREE.Vector3(); this.yaw = k.yaw;
    this.snLat = this.lat;
    this.hitSet = new Map();
    this.buzz = 0;
    k.cancelDrift();
    if (k.gliding) k.setGliding(false);
    trackPoint(tr, this.s + 10, this.lat, this.sp);
    this.mesh.position.copy(this.sp).setY(this.sp.y + 2.5);
    ctx.fx.pop(this.mesh.position, 0xffd040);
    ctx.ring(k.pos, 10, 0xffd040);
    snd(ctx, k.pos, (au, a) => {
      for (const [f, d] of [[523, 0], [659, 0.08], [784, 0.16], [1047, 0.24]]) au.tone(f, 0.35, { vol: 0.09 * a, type: 'square', filter: 3000, at: d });
      au.noiseHit(0.8, { vol: 0.25 * a, freq: 500, sweep: 6, q: 0.8 });
    });
  }
  extend() { this.end = Math.max(this.end, this.t + SNITCH_TIME * 0.6); }
  update(dt) {
    const k = this.k, ctx = this.ctx, tr = ctx.track, fx = ctx.fx;
    this.t += dt;
    const t = this.t;
    if (!live(k) || !k.model.root.parent) { this.flyOff(); return false; }
    // don't let go over a gap
    const i = tr.wrap(Math.floor(this.s));
    if (t >= this.end) {
      let gapNear = false;
      for (let o = -4; o < 40; o++) if (tr.GAP[tr.wrap(i + o)]) { gapNear = true; break; }
      if (!gapNear) { this.caught(); return false; }
    }
    // speed up to a blistering chase
    const top = k.topSpeed * 1.95;
    this.v += (top - this.v) * Math.min(1, dt * 3);
    this.s += this.v * dt;
    const hw = tr.HW[i] || 8;
    // the Snitch darts side to side ahead; the kart follows its line
    this.snLat = clamp(Math.sin(t * 1.7) * hw * 0.4 + Math.sin(t * 4.3) * hw * 0.1, -hw * 0.6, hw * 0.6);
    this.lat += clamp(this.snLat - this.lat, -6 * dt, 6 * dt);
    this.lat = clamp(this.lat, -hw * 0.7, hw * 0.7);
    trackPoint(tr, this.s, this.lat, V1);
    const ny = V1.y + 0.9 + Math.sin(t * 6) * 0.15;
    trackPoint(tr, this.s + 4, this.lat + (this.snLat - this.lat) * 0.3, V3);
    this.yaw += angleDiff(this.yaw, Math.atan2(V3.x - V1.x, V3.z - V1.z)) * Math.min(1, dt * 10);
    k.pos.set(V1.x, ny, V1.z);
    k.yaw = k.moveYaw = this.yaw;
    k.speed = this.v; k.vy = 0; k.grounded = true;
    tr.locate(k.pos.x, k.pos.y, k.pos.z, k.loc.i ?? i, k.loc);
    if (!tr.GAP[i]) k.lastSafe = i;
    k.ghostTime = Math.max(k.ghostTime, 0.15);
    k.boostTime = Math.max(k.boostTime, 0.2);
    k.model.body.visible = true;
    k.model.root.position.copy(k.pos);
    k.model.root.rotation.y = this.yaw;
    // the Snitch itself, fluttering 9-12 units ahead
    trackPoint(tr, this.s + 10 + Math.sin(t * 2.1) * 1.5, this.snLat, this.sp);
    const M = this.mesh;
    M.position.set(this.sp.x, this.sp.y + 2.4 + Math.sin(t * 5.3) * 0.6, this.sp.z);
    M.rotation.y = this.yaw + Math.sin(t * 3) * 0.4;
    M.rotation.z = Math.sin(t * 2.4) * 0.3;
    const flap = Math.sin(t * 46) * 0.7;
    M.userData.wings[0].rotation.z = flap; M.userData.wings[1].rotation.z = -flap;
    M.userData.spr.scale.setScalar(4.2 * (0.9 + Math.random() * 0.2));
    M.scale.setScalar(Math.min(1.25, t * 5));
    fx.spark(M.position.x, M.position.y, M.position.z, rnd(2), rnd(2), rnd(2), Math.random() < 0.6 ? 0xffd040 : 0xffffff, 0.5);
    // a golden slipstream off the kart
    const f = k.forward(V2);
    for (let n = 0; n < 2; n++) fx.spark(k.pos.x - f.x * 2 + rnd(1.2), k.pos.y + 0.6 + Math.random() * 1.4, k.pos.z - f.z * 2 + rnd(1.2), -f.x * 20, 0, -f.z * 20, n ? 0xffd040 : 0xfff6c0, 0.3);
    // buzzing wings
    this.buzz -= dt;
    if (this.buzz <= 0) { this.buzz = 0.11; snd(ctx, M.position, (au, a) => au.noiseHit(0.07, { vol: 0.06 * a, freq: 5200 + Math.random() * 1500, q: 6 })); }
    // anyone in the way is knocked aside
    for (const o of ctx.race.karts) {
      if (o === k || !live(o) || (this.hitSet.get(o) || 0) > t) continue;
      const r = 3.4 * Math.max(k.megaScale || 1, o.megaScale || 1);
      if (o.pos.distanceToSquared(k.pos) > r * r || Math.abs(o.pos.y - k.pos.y) > 3) continue;
      this.hitSet.set(o, t + 1.5);
      if (ctx.hit(o, 'spin', k, 'snitch')) {
        const sd = Math.sign((o.loc.lat ?? 0) - this.lat) || (Math.random() < 0.5 ? -1 : 1);
        shove(ctx, o, tr.R[i * 2] * sd * 18 + f.x * 6, tr.R[i * 2 + 1] * sd * 18 + f.z * 6);
        if (o.grounded) { o.vy = 6; o.grounded = false; }
        fx.pop(o.pos, 0xffd040);
      }
    }
    const chase = chaseOf(ctx, k);
    if (chase) { chase.fov = Math.max(chase.fov, 70 + 22 * Math.min(1, t * 2)); chase.shake = Math.max(chase.shake || 0, 0.08); }
    return true;
  }
  caught() {
    const k = this.k, ctx = this.ctx, fx = ctx.fx;
    k.speed = k.topSpeed * 1.2;
    k.boost(0.8);
    k.invuln = Math.max(k.invuln, 1.0);
    const p = this.mesh.position;
    for (let j = 0; j < 40; j++) { const a = Math.random() * TAU, b = Math.random() * Math.PI, s = 6 + Math.random() * 10; fx.spark(p.x, p.y, p.z, Math.cos(a) * Math.sin(b) * s, Math.cos(b) * s, Math.sin(a) * Math.sin(b) * s, j % 3 ? 0xffd040 : 0xffffff, 0.6); }
    ctx.ring(k.pos, 12, 0xffd040);
    snd(ctx, k.pos, (au, a) => { for (const [f, d] of [[784, 0], [988, 0.09], [1175, 0.18], [1568, 0.27]]) au.tone(f, 0.45, { vol: 0.08 * a, type: 'triangle', at: d }); });
  }
  flyOff() { this.ctx.fx.pop(this.mesh.position, 0xffd040); }
  dispose() { disposeOwned(this.mesh); if (this.k.hpSnitch === this) this.k.hpSnitch = null; }
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
const ICON_DISARM = '<svg viewBox="0 0 64 64"><circle cx="44" cy="20" r="15" fill="#ff3a20" opacity=".35"/><path d="M44 6l3 9 9-3-6 8 8 5-10 1 1 10-6-8-6 8 1-10-10-1 8-5-6-8 9 3z" fill="#ff3a20" stroke="#1b2a34" stroke-width="2.5" stroke-linejoin="round"/><circle cx="44" cy="20" r="4.5" fill="#fff"/><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><path d="M8 58l26-28 4 4-26 28z" fill="#7c503a"/><path d="M8 58l8-8 4 4-8 8z" fill="#583927"/></g><path d="M36 30l6-8" stroke="#ff8a70" stroke-width="3.5" stroke-linecap="round"/><g stroke="#1b2a34" stroke-width="2.2"><rect x="44" y="42" width="14" height="14" rx="2" fill="#ffd040" transform="rotate(15 51 49)"/></g><text x="51" y="54" font-size="11" font-weight="900" text-anchor="middle" fill="#1b2a34" font-family="Arial Black,Arial" transform="rotate(15 51 49)">?</text></svg>';
const ICON_LEVIOSA = '<svg viewBox="0 0 64 64"><path d="M6 50q8-26 26-30t26-12" stroke="#f2cd37" stroke-width="3" fill="none" stroke-dasharray="2 5" stroke-linecap="round"/><g transform="rotate(35 34 30)"><path d="M34 4q12 12 8 30-2 8-8 16-6-8-8-16-4-18 8-30z" fill="#f4f4f4" stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"/><path d="M34 8v52" stroke="#958a73" stroke-width="2.5" stroke-linecap="round"/><path d="M34 18l-6-4M34 26l-7-4M34 34l-6-4M34 18l6-4M34 26l7-4M34 34l6-4" stroke="#a0a5a9" stroke-width="1.6"/></g><g fill="#fff6a0" stroke="#f2cd37" stroke-width="1.5"><path d="M10 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M54 44l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/></g></svg>';
const ICON_PATRONUS = '<svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="27" fill="#0b1a3a" stroke="#7fb8ff" stroke-width="3"/><circle cx="32" cy="36" r="19" fill="#5a9aff" opacity=".35"/><g stroke="#dff0ff" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M26 26q-6-8-6-18M21 15l-7-4M22 20l-8 1"/><path d="M38 26q6-8 6-18M43 15l7-4M42 20l8 1"/></g><path d="M24 30q8-6 16 0l-2 12q-2 8-6 10-4-2-6-10z" fill="#e8f4ff" stroke="#7fb8ff" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 30l-6-3 7 7M42 30l6-3-7 7" fill="#e8f4ff" stroke="#7fb8ff" stroke-width="2"/><circle cx="28.5" cy="36" r="1.8" fill="#0b1a3a"/><circle cx="35.5" cy="36" r="1.8" fill="#0b1a3a"/></svg>';
const ICON_CLOAK = '<svg viewBox="0 0 64 64"><path d="M32 4q-14 2-16 18l-8 36q24 8 48 0l-8-36Q46 6 32 4z" fill="#6c7a90" fill-opacity=".55" stroke="#c8d4e8" stroke-width="3" stroke-dasharray="7 3" stroke-linejoin="round"/><path d="M22 22q10-8 20 0" stroke="#1b2a34" stroke-width="3" fill="none" opacity=".6"/><path d="M18 34q6-3 10 0t10 0 10 0M14 46q8-3 12 0t12 0 12 0" stroke="#e8f0ff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".9"/><g fill="#fff"><circle cx="46" cy="14" r="2"/><circle cx="12" cy="28" r="1.5"/><circle cx="52" cy="40" r="1.5"/></g></svg>';
const ICON_SNITCH = '<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="2.5" stroke-linejoin="round"><path d="M24 30Q12 12 2 16q6 4 6 8-4 0-4 4 6 0 8 4-3 2-2 5 10 1 14-7z" fill="#f4f4f4"/><path d="M40 30Q52 12 62 16q-6 4-6 8 4 0 4 4-6 0-8 4 3 2 2 5-10 1-14-7z" fill="#f4f4f4"/><circle cx="32" cy="34" r="11" fill="#f2cd37"/></g><path d="M22 34q10 4 20 0" stroke="#7a5a00" stroke-width="2" fill="none"/><ellipse cx="28" cy="29" rx="3.5" ry="2.2" fill="#fff6c0"/><path d="M10 50l4 2M54 50l-4 2M32 52v6" stroke="#f2cd37" stroke-width="3" stroke-linecap="round"/></svg>';

// ---- DEV (temporary test hook): ?give=<id>[&cpu=1] keeps handing the power out ---------------
const QS = new URLSearchParams(location.search);
const GIVE = QS.get('give'), GIVE_CPU = QS.has('cpu');
function devHook(ctx) {
  if (!GIVE || ctx.race._hpHook) return;
  ctx.race._hpHook = true;
  let t = 0;
  ctx.spawn({ update(dt) { t -= dt; if (t > 0) return true; t = 1; for (const k of ctx.race.karts) if ((k.human || GIVE_CPU) && !k.item && !(k.roulette > 0)) { k.item = GIVE; k.itemCount = 1; } return true; }, dispose() {} });
}

export default [
  {
    id: 'expelliarmus', name: 'Expelliarmus', color: '#ff3a20', icon: ICON_DISARM, gesture: 'throwF',
    help: 'A red disarming jet from your wand homes in on the kart ahead, spins them out and steals the item they were holding for you.',
    odds: [2, 3, 3, 2, 1],
    ai: (k, ctx) => {
      const a = ctx.ahead(k, 1)[0];
      if (live(a) && gapTo(k, a) < 160) return true;
      const b = ctx.behind(k, 1)[0];
      return !a && live(b) && gapTo(k, b) < 40 ? { back: true } : false;
    },
    prewarm: (ctx) => { devHook(ctx); return prewarmAll(); },
    use(k, ctx, { back }) { ctx.spawn(new Disarm(k, ctx, !!back)); },
  },
  {
    id: 'leviosa', name: 'Wingardium Leviosa', color: '#fff0a0', icon: ICON_LEVIOSA, gesture: 'use',
    help: 'Swish and flick! The two or three karts just ahead of you float helplessly up into the air, drift along slowly, then drop.',
    odds: [1, 3, 3, 3, 2],
    ai: (k, ctx) => ctx.ahead(k, 3).filter((o) => live(o) && !o.hpFloat && gapTo(k, o) < 140).length >= (held(k, ctx, 5) ? 1 : 2),
    prewarm: (ctx) => { devHook(ctx); return []; },
    use(k, ctx) { HOLD.delete(k); leviosa(k, ctx); },
  },
  {
    id: 'patronus', name: 'Expecto Patronum', color: '#bfe0ff', icon: ICON_PATRONUS, gesture: 'use',
    help: 'A glowing silver stag charges up the track ahead, bowling karts aside, while its light shields you from incoming shots.',
    odds: [0, 1, 2, 3, 3],
    ai: (k, ctx) => threatened(k, ctx) || ctx.ahead(k, 2).some((o) => live(o) && gapTo(k, o) < 150),
    prewarm: (ctx) => { devHook(ctx); return []; },
    use(k, ctx) {
      if (k.hpPatronus) { k.hpPatronus.extend(); return; }
      k.hpPatronus = ctx.spawn(new Patronus(k, ctx));
    },
  },
  {
    id: 'cloak', name: 'Invisibility Cloak', color: '#9aa8c0', icon: ICON_CLOAK, gesture: 'use',
    help: 'Throw on the cloak and vanish to a faint shimmer for 6 seconds: shots, traps and hazards pass right through you, and you slip along a little faster.',
    odds: [4, 3, 2, 1, 0],
    // when something is coming, or a rival is right behind; otherwise after holding it a while
    ai: (k, ctx) => {
      const go = threatened(k, ctx, 36) || ctx.behind(k, 1).some((o) => live(o) && gapTo(k, o) < 14) || held(k, ctx, 7);
      if (go) HOLD.delete(k);
      return go;
    },
    prewarm: (ctx) => { devHook(ctx); return []; },
    use(k, ctx) {
      HOLD.delete(k);
      if (k.hpCloak) { k.hpCloak.extend(); return; }
      k.hpCloak = ctx.spawn(new Cloak(k, ctx));
    },
  },
  {
    id: 'snitch', name: 'Golden Snitch', color: '#f2cd37', icon: ICON_SNITCH, gesture: 'use',
    help: 'The Golden Snitch appears ahead and you chase it: it tows you on autopilot far up the track at blistering speed, knocking karts aside.',
    odds: [0, 0, 0, 2, 5],
    ai: (k) => k.grounded && !k.stunned && !k.finished && k.respawn <= 0,
    prewarm: (ctx) => { devHook(ctx); return []; },
    use(k, ctx) {
      if (k.hpSnitch) { k.hpSnitch.extend(); return; }
      if (k.bulletTime > 0) { k.boost(1); return; }
      k.hpSnitch = ctx.spawn(new Snitch(k, ctx));
    },
  },
];
