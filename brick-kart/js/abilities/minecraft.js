// Minecraft powers (see ../abilities.js for the contract). Models live in ./minecraft-fx.js.
//   Creeper          – dropped behind you (or tossed ahead): it hisses and flashes when a kart comes
//                      near, then blows up, spinning out everyone close and blasting items away
//   Totem of Undying – floats over your kart and cancels the next hit with a green-and-gold burst
//                      and a little boost
//   Trident          – thrown at the kart ahead; it homes in and Channeling calls lightning down on them
//   Elytra Rockets   – elytra wings spread on your kart and three firework rockets boost you along
//   Ender Pearl      – thrown far up the track; you teleport to where it lands in a puff of purple
import * as THREE from 'three';
import {
  disposeOwned, creeperModel, totemModel, tridentModel, pearlModel, elytraModel, boltModel, flashModel, prewarmAll,
  ICON_CREEPER, ICON_TOTEM, ICON_TRIDENT, ICON_ELYTRA, ICON_PEARL,
} from './minecraft-fx.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const TAU = Math.PI * 2;
const wrapA = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);
const angleDiff = (a, b) => wrapA(b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const live = (o) => !!o && !o.finished && !(o.respawn > 0);
const gapTo = (k, o) => (o ? Math.abs(o.raceDist - k.raceDist) : Infinity);
const chaseOf = (ctx, k) => ctx.race.cams?.find((c) => c.kart === k)?.chase;
const PURPLE = [0xc050ff, 0x8a20d0, 0xff90ff, 0x30e0c0];
const FIREWORK = [0xff3030, 0xffd040, 0x40a0ff, 0x60ff60, 0xff60ff, 0xffffff];

// sounds, attenuated by distance to the nearest listener
function snd(ctx, pos, fn) {
  const au = ctx.audio;
  if (!au?.ctx) return;
  const a = pos && au.att ? au.att(pos) : 1;
  if (a > 0.03) fn(au, a);
}
const hiss = (ctx, pos) => snd(ctx, pos, (au, a) => au.noiseHit(1.1, { vol: 0.3 * a, freq: 5200, sweep: 0.7, q: 0.9 }));
const boom = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.sfx('crash', pos);
  au.noiseHit(0.9, { vol: 0.5 * a, freq: 260, type: 'lowpass' });
  au.tone(70, 0.6, { vol: 0.3 * a, type: 'sine', slide: 0.4 });
});
const thunder = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.noiseHit(0.12, { vol: 0.5 * a, freq: 5000, q: 0.7 });
  au.noiseHit(1.4, { vol: 0.45 * a, freq: 140, type: 'lowpass', at: 0.05 });
  au.tone(55, 0.9, { vol: 0.25 * a, type: 'sawtooth', slide: 0.6, filter: 300 });
});
const warp = (ctx, pos) => snd(ctx, pos, (au, a) => {
  au.tone(1200, 0.35, { vol: 0.1 * a, type: 'sine', slide: 0.25 });
  au.tone(600, 0.35, { vol: 0.08 * a, type: 'triangle', slide: 0.25, at: 0.03 });
  au.noiseHit(0.3, { vol: 0.2 * a, freq: 2400, sweep: 0.3, q: 1.5 });
});
// a burst of square sparks
function sparks(ctx, p, n, cols, speed = 10, up = 0, life = 0.5) {
  for (let j = 0; j < n; j++) ctx.fx.spark(p.x, p.y, p.z, rnd(speed), rnd(speed) + up, rnd(speed), cols[j % cols.length], life * (0.6 + Math.random() * 0.6));
}
// a short-lived flash ball (its own entity)
function flash(ctx, pos, color, size = 4, life = 0.4) {
  const g = flashModel(color); g.position.copy(pos); ctx.scene.add(g);
  let t = 0;
  g.userData.set(0, size);
  ctx.spawn({ update(dt) { t += dt; g.userData.set(Math.min(1, t / life), size); return t < life; }, dispose() { disposeOwned(g); } });
}
function groundY(ctx, e) {
  e.loc = ctx.track.locate(e.pos.x, e.pos.y, e.pos.z, e.si, e.loc || {});
  e.si = e.loc.i;
  return e.loc;
}
// a point on the track at a fractional sample s
const TP = new THREE.Vector3();
function trackPoint(tr, s, lat, out) {
  const i0 = Math.floor(s), f = s - i0;
  tr.at(i0 + 1, lat, 0, TP); tr.at(i0, lat, 0, out);
  out.lerp(TP, f);
  const i = tr.wrap(i0);
  if (tr.GAP[i]) out.y = Math.max(out.y, tr.py(i));
  return out;
}

// ============================================================================================
// Creeper: a walking trap. Hisses, flashes and swells when a kart comes near, then explodes.
// ============================================================================================
const FUSE = 1.1, WAKE = 11, BLAST = 7.5;
class Creeper {
  constructor(k, ctx, ahead) {
    this.k = k; this.ctx = ctx;
    this.mesh = creeperModel();
    ctx.scene.add(this.mesh);
    const f = k.forward(V1);
    this.pos = k.pos.clone().addScaledVector(f, ahead ? 3.5 : -4.2);
    this.yaw = wrapA(k.yaw + Math.PI);   // faces the karts coming up behind
    this.si = k.loc.i ?? 0; this.loc = {};
    this.air = !!ahead; this.vel = null;
    if (ahead) { this.vel = f.clone().multiplyScalar(Math.max(0, k.speed) + 24).setY(13); this.pos.y += 1.2; }
    else this.pos.y = groundY(ctx, this).y;
    this.safe = 0.7; this.t = 0; this.fuse = -1; this.target = null; this.dead = false;
    this.mesh.position.copy(this.pos);
    snd(ctx, this.pos, (au, a) => au.tone(180, 0.18, { vol: 0.12 * a, type: 'square', slide: 0.6, filter: 900 }));
  }
  update(dt) {
    const ctx = this.ctx, M = this.mesh, U = M.userData;
    this.t += dt; this.safe -= dt;
    if (this.air) {
      this.vel.y -= 40 * dt;
      this.pos.addScaledVector(this.vel, dt);
      const L = groundY(ctx, this);
      if (!L.gap && Math.abs(L.lat) < L.hw + L.sh && this.pos.y <= L.y) { this.pos.y = L.y; this.air = false; ctx.fx.puff(this.pos.x, this.pos.y + 0.3, this.pos.z, 0, 1, 0, 0xcfc8b0, 0.5); }
      if (this.pos.y < L.y - 15) return false;
      M.rotation.x = -this.t * 6;
    } else {
      M.rotation.x = 0;
      const L = groundY(ctx, this);
      this.pos.y += (L.y - this.pos.y) * Math.min(1, dt * 12);
    }
    if (this.t > 40 && this.fuse < 0) { this.poof(); return false; }
    if (this.dead) { this.explode(); return false; }
    // who's near: touching it sets it off at once, coming close lights the fuse
    let near = null, nd = Infinity;
    if (!this.air) for (const o of ctx.race.karts) {
      if (!live(o) || (o === this.k && this.safe > 0)) continue;
      const d = o.pos.distanceTo(this.pos);
      if (d < 2.7 * (o.megaScale || 1) && Math.abs(o.pos.y - this.pos.y) < 3) { this.explode(); return false; }
      if (d < nd) { nd = d; near = o; }
    }
    if (this.fuse < 0 && near && nd < WAKE) { this.fuse = 0; this.target = near; hiss(ctx, this.pos); }
    let flick = 0, swell = 0;
    if (this.fuse >= 0) {
      this.fuse += dt;
      flick = Math.floor(this.fuse * (this.fuse > FUSE * 0.6 ? 16 : 8)) % 2 ? 0.95 : 0;
      swell = this.fuse / FUSE * 0.25;
      // shuffles after its target
      const tg = live(this.target) ? this.target : near;
      if (tg) {
        const want = Math.atan2(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z);
        this.yaw = wrapA(this.yaw + clamp(angleDiff(this.yaw, want), -6 * dt, 6 * dt));
        this.pos.x += Math.sin(this.yaw) * 4.5 * dt; this.pos.z += Math.cos(this.yaw) * 4.5 * dt;
      }
      if (this.fuse >= FUSE) { this.explode(); return false; }
    } else if (near && nd < 30) {
      // turns to watch the nearest kart
      const want = Math.atan2(near.pos.x - this.pos.x, near.pos.z - this.pos.z);
      this.yaw = wrapA(this.yaw + clamp(angleDiff(this.yaw, want), -2.5 * dt, 2.5 * dt));
    }
    for (const m of U.mats) m.emissiveIntensity = flick;
    U.inner.scale.set(1 + swell, 1 + swell * 0.6, 1 + swell);
    const step = this.fuse >= 0 ? 14 : 3;
    U.feet.forEach((p, i) => { p.rotation.x = Math.sin(this.t * step + (i % 2 ^ (i >> 1)) * Math.PI) * (this.fuse >= 0 ? 0.6 : 0.08); });
    U.head.rotation.z = this.fuse >= 0 ? Math.sin(this.t * 40) * 0.06 : 0;
    M.position.copy(this.pos);
    M.rotation.y = this.yaw;
    return true;
  }
  explode() {
    const ctx = this.ctx, fx = ctx.fx, p = V2.copy(this.pos).setY(this.pos.y + 1.2), race = ctx.race;
    fx.explosion(p);
    flash(ctx, p, 0xfff4d0, 5, 0.35);
    for (let j = 0; j < 14; j++) fx.puff(p.x + rnd(2), p.y + rnd(1), p.z + rnd(2), rnd(6), 2 + Math.random() * 4, rnd(6), j % 2 ? 0xd8d8d8 : 0x9a9a9a, 0.9 + Math.random() * 0.5);
    fx.debris(p, [0x5aa83a, 0x4a9a2e, 0x7a5230, 0x8a8a8a], 16, 1.2);
    ctx.ring(this.pos, BLAST + 2, 0xf0f0f0);
    boom(ctx, p);
    for (const o of race.karts) {
      if (!live(o) || o.pos.distanceTo(this.pos) > BLAST * (o.megaScale || 1)) continue;
      if (ctx.hit(o, 'spin', this.k, 'creeper') && o.grounded) { o.vy = 7; o.grounded = false; }
    }
    // the blast clears traps and shots nearby
    const items = race.items, R2 = (BLAST + 2) ** 2;
    for (const t of [...items.traps]) if (t.pos.distanceToSquared(this.pos) < R2) { fx.pop(t.pos, 0xffffff); items.removeTrap(t); }
    for (const q of items.proj) if (q.pos.distanceToSquared(this.pos) < R2) q.life = 0;
    for (const e of items.ents) if (e !== this && e.deflect) e.deflect(this.pos, BLAST + 2, this.k);
    for (const o of race.karts) if (o.human && o.pos.distanceTo(this.pos) < 16) { const c = chaseOf(ctx, o); if (c) c.shake = Math.max(c.shake || 0, 0.5); }
  }
  poof() { this.ctx.fx.pop(this.pos, 0xb0b0b0); }
  // blown away (Force Push, another blast…): it goes off where it stands
  deflect(pos, r) { if (pos.distanceToSquared(this.pos) < r * r) this.dead = true; }
  danger(pos, r) { return !this.air && pos.distanceToSquared(this.pos) < (r + 3.5) ** 2; }
  dispose() { disposeOwned(this.mesh); }
}

// ============================================================================================
// Totem of Undying: hovers over the kart; the next hit is cancelled with the totem burst
// ============================================================================================
class Totem {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx; this.t = 0; this.used = -1;
    this.mesh = totemModel();
    k.model.root.add(this.mesh);
    this.top = (k.model.top ?? 3) + 0.9;
    // the kart's shield check: our totem goes first, then any normal shield
    const base = Object.getPrototypeOf(k).shieldBlocks;
    this.hook = () => (this.used < 0 && live(k) ? this.save() : base.call(k));
    k.shieldBlocks = this.hook;
    sparks(ctx, V1.copy(k.pos).setY(k.pos.y + this.top), 14, [0xffd040, 0x40ff60], 5, 3);
    snd(ctx, k.pos, (au, a) => { for (let i = 0; i < 3; i++) au.tone(660 * Math.pow(1.26, i), 0.25, { vol: 0.07 * a, type: 'triangle', at: i * 0.06 }); });
  }
  save() {
    const k = this.k, ctx = this.ctx, fx = ctx.fx, p = V1.copy(k.pos).setY(k.pos.y + 1.4);
    this.used = 0;
    k.invuln = Math.max(k.invuln, 1.2);
    k.boost(0.9);
    // the green-and-gold totem burst spirals up round the kart
    for (let j = 0; j < 46; j++) {
      const a = j * 0.55, s = 5 + Math.random() * 6;
      fx.spark(p.x + Math.cos(a) * 1.5, p.y + rnd(0.8), p.z + Math.sin(a) * 1.5, Math.cos(a + 1.2) * s, 6 + Math.random() * 9, Math.sin(a + 1.2) * s, j % 3 ? 0x40ff60 : 0xffd040, 0.8 + Math.random() * 0.5, -2);
    }
    ctx.ring(k.pos, 10, 0x40ff60);
    flash(ctx, p, 0x80ff60, 3.5, 0.4);
    if (k.human) ctx.race.flash?.(0x60ff80);
    k.player?.rumble(0.4, 200);
    snd(ctx, k.pos, (au, a) => {
      for (const [f, d] of [[523, 0], [659, 0.07], [784, 0.14], [1047, 0.21], [1319, 0.3]]) au.tone(f, 0.5, { vol: 0.09 * a, type: 'triangle', at: d });
      au.noiseHit(0.5, { vol: 0.2 * a, freq: 3000, sweep: 0.5, q: 1 });
    });
    return true;
  }
  update(dt) {
    const k = this.k, M = this.mesh;
    this.t += dt;
    if (!M.parent) return false;
    if (this.used >= 0) {
      // the totem flies up spinning and fades out
      this.used += dt;
      const f = this.used / 1.0;
      M.position.set(0, this.top + f * 4, 0);
      M.rotation.y += dt * 18;
      M.scale.setScalar(1 + f * 1.5);
      M.userData.spr.material.opacity = 0.6 * (1 - f);
      if (Math.random() < 0.6) this.ctx.fx.spark(k.pos.x + rnd(1), k.pos.y + this.top + f * 4, k.pos.z + rnd(1), rnd(3), rnd(3), rnd(3), Math.random() < 0.5 ? 0x40ff60 : 0xffd040, 0.4);
      return f < 1;
    }
    M.position.set(0, this.top + Math.sin(this.t * 3) * 0.15, 0);
    M.rotation.y = this.t * 2.2;
    M.userData.spr.scale.setScalar(2.4 + Math.sin(this.t * 6) * 0.3);
    if (Math.random() < dt * 6) this.ctx.fx.spark(k.pos.x + rnd(0.6), k.pos.y + this.top + rnd(0.5), k.pos.z + rnd(0.6), 0, 1.5, 0, 0xffd040, 0.4);
    return true;
  }
  dispose() {
    if (this.k.shieldBlocks === this.hook) delete this.k.shieldBlocks;
    if (this.k.mcTotem === this) this.k.mcTotem = null;
    disposeOwned(this.mesh);
  }
}

// ============================================================================================
// Trident: homes in on the kart ahead; on a hit Channeling calls down lightning
// ============================================================================================
class Trident {
  constructor(k, ctx, back) {
    this.k = k; this.ctx = ctx; this.dir = back ? -1 : 1;
    this.target = (back ? ctx.behind(k, 1) : ctx.ahead(k, 1)).find(live) || null;
    this.mesh = tridentModel(); ctx.scene.add(this.mesh);
    const f = k.forward(V1);
    this.pos = k.pos.clone().addScaledVector(f, back ? -3 : 2).setY(k.pos.y + 2.2);
    this.yaw = back ? wrapA(k.yaw + Math.PI) : k.yaw;
    this.speed = Math.max(90, Math.abs(k.speed) + 44);
    this.si = k.loc.i ?? 0; this.loc = {}; this.t = 0; this.dead = false;
    this.mesh.position.copy(this.pos);
    snd(ctx, k.pos, (au, a) => { au.noiseHit(0.35, { vol: 0.35 * a, freq: 1800, sweep: 2.5, q: 2 }); au.tone(330, 0.3, { vol: 0.06 * a, type: 'triangle', slide: 1.8 }); });
  }
  update(dt) {
    const ctx = this.ctx, k = this.k;
    this.t += dt;
    if (this.dead || this.t > 4.5) { this.fizzle(); return false; }
    const gy = groundY(ctx, this).y, tg = live(this.target) ? this.target : null;
    let aim;
    if (tg) aim = V2.copy(tg.pos).setY(tg.pos.y + 1.3 * (tg.megaScale || 1));
    else aim = ctx.at(this.loc.i + 14 * this.dir, 0, 0, V2).setY(gy + 2);
    const d = V3.subVectors(aim, this.pos), L = d.length();
    if (tg && L < 16) { if (L > 1e-4) this.pos.addScaledVector(d, Math.min(1, this.speed * dt / L)); this.yaw = Math.atan2(d.x, d.z); }
    else {
      const want = Math.atan2(d.x, d.z);
      this.yaw = wrapA(this.yaw + clamp(angleDiff(this.yaw, want), -(tg ? 9 : 5) * dt, (tg ? 9 : 5) * dt));
      this.pos.x += Math.sin(this.yaw) * this.speed * dt; this.pos.z += Math.cos(this.yaw) * this.speed * dt;
      this.pos.y += (Math.max(gy + 1.8, tg ? aim.y : 0) - this.pos.y) * Math.min(1, dt * 7);
      if (!tg && this.t > 1.8) { this.strikeGround(); return false; }
    }
    for (const o of ctx.race.karts) {
      if ((o === k && this.t < 0.5) || !live(o)) continue;
      const r = 2.6 * (o.megaScale || 1);
      if (o.pos.distanceToSquared(this.pos) < r * r && Math.abs(o.pos.y + 1 - this.pos.y) < 3 * (o.megaScale || 1)) { this.strike(o); return false; }
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(0, this.yaw, 0);
    if (Math.random() < 0.8) ctx.fx.spark(this.pos.x + rnd(0.3), this.pos.y + rnd(0.3), this.pos.z + rnd(0.3), rnd(2), rnd(2), rnd(2), Math.random() < 0.5 ? 0x60e8ff : 0xffffff, 0.3);
    return true;
  }
  strike(o) {
    const ctx = this.ctx;
    ctx.hit(o, 'spin', this.k, 'trident');
    lightning(ctx, o.pos, o);
  }
  strikeGround() { lightning(this.ctx, this.pos.clone().setY(this.loc.y ?? this.pos.y), null); }
  fizzle() { this.ctx.fx.pop(this.pos, 0x60e8ff); }
  deflect(pos, r) { if (this.pos.distanceToSquared(pos) < r * r) this.dead = true; }
  dispose() { disposeOwned(this.mesh); }
}
// Channeling: a jagged bolt from the sky onto pos (follows a kart if given)
function lightning(ctx, pos, follow) {
  const g = boltModel(), at = pos.clone(), H = 34;
  g.position.copy(at); g.userData.rejag(H);
  ctx.scene.add(g);
  flash(ctx, V1.copy(at).setY(at.y + 1), 0xa0d0ff, 6, 0.45);
  ctx.ring(at, 9, 0xa0d8ff);
  sparks(ctx, V1.copy(at).setY(at.y + 0.5), 26, [0xffffff, 0xa0d8ff, 0x60e8ff], 12, 6, 0.5);
  thunder(ctx, at);
  if (follow?.human) ctx.race.flash?.(0xe0f0ff);
  let t = 0, j = 0;
  ctx.spawn({
    update(dt) {
      t += dt; j -= dt;
      if (follow && live(follow)) g.position.copy(follow.pos);
      if (j <= 0) { j = 0.06; g.userData.rejag(H, 0.3 + Math.random() * 0.2); }
      const fl = t < 0.5 ? (Math.random() < 0.75 ? 1 : 0.3) : Math.max(0, 1 - (t - 0.5) / 0.15);
      g.userData.mat.opacity = 0.9 * fl; g.userData.core.opacity = fl;
      return t < 0.65;
    },
    dispose() { disposeOwned(g); },
  });
}

// ============================================================================================
// Elytra Rockets: wings spread on the kart; each of three rockets is a firework boost
// ============================================================================================
class Elytra {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx; this.t = 0; this.open = 0; this.last = 0;
    const { g, wings } = elytraModel();
    this.g = g; this.wings = wings;
    const rig = k.model.driver, torso = rig?.torso || k.model.root;
    const sy = rig?.shoulder?.y ?? 1.2, w = Math.max(1, Math.min(1.5, (rig?.width ?? 1.3) / 1.3));
    g.position.set(0, sy * 0.92, -0.32 * w); g.scale.setScalar(w);
    torso.add(g);
  }
  fire() {
    const k = this.k, ctx = this.ctx, fx = ctx.fx, f = k.forward(V1);
    this.last = this.t;
    k.speed = Math.max(k.speed, k.topSpeed * 1.2);
    k.boost(1.5);
    // a firework pops behind the kart in a ball of coloured stars
    const p = V2.copy(k.pos).addScaledVector(f, -3).setY(k.pos.y + 2.4);
    const c1 = FIREWORK[Math.floor(Math.random() * FIREWORK.length)], c2 = FIREWORK[Math.floor(Math.random() * FIREWORK.length)];
    for (let j = 0; j < 34; j++) {
      const a = Math.random() * TAU, b = Math.random() * Math.PI, s = 9 + Math.random() * 5;
      fx.spark(p.x, p.y, p.z, Math.cos(a) * Math.sin(b) * s - f.x * 10, Math.cos(b) * s, Math.sin(a) * Math.sin(b) * s - f.z * 10, j % 2 ? c1 : c2, 0.7, 6);
    }
    flash(ctx, p, c1, 2.5, 0.3);
    snd(ctx, k.pos, (au, a) => {
      au.sfx('rocket', k.pos);
      au.noiseHit(0.08, { vol: 0.35 * a, freq: 3000, q: 1, at: 0.25 });
      for (let i = 0; i < 5; i++) au.noiseHit(0.04, { vol: 0.12 * a, freq: 5000 + Math.random() * 3000, q: 4, at: 0.3 + i * 0.06 + Math.random() * 0.03 });
    });
  }
  update(dt) {
    const k = this.k, fx = this.ctx.fx;
    this.t += dt;
    if (!this.g.parent) return false;
    const flying = k.boostTime > 0 && this.t - this.last < 2.2;
    this.open += ((flying ? 1 : 0) - this.open) * Math.min(1, dt * 7);
    const flap = Math.sin(this.t * 9) * 0.08 * this.open;
    for (const w of this.wings) {
      // folded: hanging down the back; open: swept out sideways and back
      w.p.rotation.set(-0.25 * this.open, w.sd * (0.35 * this.open), w.sd * (-1.25 * (1 - this.open) + flap - 0.05));
    }
    this.g.visible = this.open > 0.03 || k.item === 'elytra';
    // a firework trail streams from behind while the rocket burns
    if (flying && live(k)) {
      const f = k.forward(V1);
      for (let n = 0; n < 2; n++) fx.spark(k.pos.x - f.x * 2.2 + rnd(0.4), k.pos.y + 1.0 + rnd(0.3), k.pos.z - f.z * 2.2 + rnd(0.4), -f.x * 16 + rnd(2), rnd(2), -f.z * 16 + rnd(2), Math.random() < 0.5 ? 0xffd040 : 0xffffff, 0.35);
    }
    return k.item === 'elytra' || this.open > 0.02 || this.t - this.last < 0.3;
  }
  dispose() { disposeOwned(this.g); if (this.k.mcElytra === this) this.k.mcElytra = null; }
}

// ============================================================================================
// Ender Pearl: arcs far up the track; you teleport to where it lands
// ============================================================================================
const PEARL_T = 1.25;
class Pearl {
  constructor(k, ctx) {
    this.k = k; this.ctx = ctx; this.t = 0;
    const tr = ctx.track, n = ctx.race.karts.length;
    const rankFrac = n > 1 ? (k.rank - 1) / (n - 1) : 1;
    this.i0 = k.loc.i ?? 0; this.lat0 = k.loc.lat ?? 0;
    this.land = landing(k, tr, this.i0 + 150 + Math.round(20 * rankFrac), this.i0, this.lat0);
    this.dist = ((this.land ? this.land.i : this.i0 + 150) - this.i0 + tr.N) % tr.N;
    this.mesh = pearlModel(); ctx.scene.add(this.mesh);
    this.start = k.pos.clone().setY(k.pos.y + 2.4);
    this.pos = this.start.clone();
    snd(ctx, k.pos, (au, a) => { au.noiseHit(0.4, { vol: 0.3 * a, freq: 1400, sweep: 2.2, q: 1.6 }); au.tone(500, 0.3, { vol: 0.06 * a, type: 'sine', slide: 1.6 }); });
  }
  update(dt) {
    const ctx = this.ctx, k = this.k, fx = ctx.fx, tr = ctx.track;
    this.t += dt;
    if (!live(k)) { fx.pop(this.pos, 0xb050ff); return false; }
    const u = Math.min(1, this.t / PEARL_T);
    // flies along the track, high in an arc, from the thrower to the landing spot
    trackPoint(tr, this.i0 + this.dist * u, this.lat0 + ((this.land?.lat ?? this.lat0) - this.lat0) * u, V1);
    const lift = Math.sin(Math.PI * u) * 16 + 2.4 * (1 - u) + 0.4;
    if (u < 0.12) V1.lerp(this.start, 1 - u / 0.12);
    this.pos.set(V1.x, V1.y + lift, V1.z);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(this.t * 7, this.t * 5, 0);
    fx.spark(this.pos.x + rnd(0.3), this.pos.y + rnd(0.3), this.pos.z + rnd(0.3), rnd(1.5), rnd(1.5), rnd(1.5), PURPLE[Math.floor(Math.random() * 4)], 0.45);
    if (u < 1) return true;
    this.teleport();
    return false;
  }
  teleport() {
    const ctx = this.ctx, k = this.k, race = ctx.race, tr = ctx.track;
    // never put the kart down over a gap (glides, jumps, lava seas): re-check the spot now
    if (this.land && !k.spawnOk(this.land.i, this.land.lat)) this.land = landing(k, tr, this.land.i, this.i0, this.lat0);
    if (!this.land) { k.boost(1.2); ctx.fx.pop(this.pos, 0xb050ff); return; }
    const from = V2.copy(k.pos).setY(k.pos.y + 1.2);
    sparks(ctx, from, 30, PURPLE, 7, 2, 0.7);
    flash(ctx, from, 0xb050ff, 3.5, 0.35);
    warp(ctx, from);
    k.cancelDrift();
    if (k.gliding) k.setGliding?.(false);
    k.place(this.land.i, this.land.lat);
    k.speed = k.topSpeed * 1.15;
    k.boost(1.0);
    k.invuln = Math.max(k.invuln, 0.8);
    const to = V3.copy(k.pos).setY(k.pos.y + 1.2);
    sparks(ctx, to, 40, PURPLE, 8, 3, 0.8);
    flash(ctx, to, 0xc070ff, 4, 0.4);
    ctx.ring(k.pos, 8, 0xb050ff);
    warp(ctx, to);
    const chase = chaseOf(ctx, k);
    if (chase) { chase.init = false; chase.fov = Math.max(chase.fov || 70, 96); }
    if (k.human) race.flash?.(0xd8a0ff);
    // a little cloud of portal sparks lingers round the kart
    let t = 0;
    ctx.spawn({ update(dt) { t += dt; if (live(k) && Math.random() < 0.8) ctx.fx.spark(k.pos.x + rnd(1.4), k.pos.y + 0.4 + Math.random() * 2, k.pos.z + rnd(1.4), rnd(1), 1 + Math.random() * 2, rnd(1), PURPLE[Math.floor(Math.random() * 3)], 0.5); return t < 1.2; }, dispose() {} });
  }
  dispose() { disposeOwned(this.mesh); if (this.k.mcPearl === this) this.k.mcPearl = null; }
}

// Where a pearl may land: real road with no glide / jump gap under it or just ahead (k.spawnOk), searched
// forward from `want` (up to half a lap), then back towards the thrower; failing that the nearest gap-free
// sample ahead of want, or null (no safe spot: the pearl just gives a boost)
function landing(k, tr, want, i0, lat0) {
  const N = tr.N, ok = (i) => {
    const hw = tr.HW[i];
    for (const l of [clamp(lat0 / (hw || 1), -0.45, 0.45) * hw, 0, -0.3 * hw, 0.3 * hw]) if (k.spawnOk(i, l)) return { i, lat: l };
    return null;
  };
  let got = null;
  for (let o = 0; o < N / 2 && !got; o += 2) got = ok(tr.wrap(want + o));
  for (let o = 2; want - o > i0 + 20 && !got; o += 2) got = ok(tr.wrap(want - o));
  for (let o = 0; o < N && !got; o++) { const i = tr.wrap(want + o); if (!tr.GAP[i] && !tr.GAP[tr.wrap(i + 1)] && !tr.GAP[tr.wrap(i - 1)]) got = { i, lat: 0 }; }
  return got;
}

// ---- AI helpers ------------------------------------------------------------------------------
const HOLD = new WeakMap();
function held(k, ctx, secs) {
  const now = ctx.race.time;
  if (!HOLD.has(k)) HOLD.set(k, now);
  if (now - HOLD.get(k) > secs) { HOLD.delete(k); return true; }
  return false;
}
const calm = (k) => k.grounded && !k.stunned && !k.finished && k.respawn <= 0;

export default [
  {
    id: 'creeper', name: 'Creeper', color: '#5aa83a', icon: ICON_CREEPER, gesture: 'throwB',
    help: 'Drop a Creeper behind you (or toss it ahead): when a kart comes near it hisses, flashes and blows up, spinning out everyone close and blasting items away.',
    odds: [6, 4, 2, 1, 0],
    ai: (k, ctx) => {
      const go = ctx.behind(k, 1).some((o) => live(o) && gapTo(k, o) < 28) || held(k, ctx, 5);
      if (go) HOLD.delete(k);
      return go;
    },
    prewarm: () => prewarmAll(),
    use(k, ctx, { back, aimFwd }) { HOLD.delete(k); ctx.spawn(new Creeper(k, ctx, !back && !!aimFwd)); },
  },
  {
    id: 'totem', name: 'Totem of Undying', color: '#ffd040', icon: ICON_TOTEM, gesture: 'use',
    help: 'The Totem of Undying floats over your kart and cancels the next hit with a green-and-gold burst and a little boost.',
    odds: [4, 3, 2, 1, 0],
    ai: (k) => !k.mcTotem,
    use(k, ctx) {
      if (k.mcTotem && k.mcTotem.used < 0) { k.boost(0.6); return; }
      k.mcTotem = ctx.spawn(new Totem(k, ctx));
    },
  },
  {
    id: 'trident', name: 'Trident', color: '#3aa8a0', icon: ICON_TRIDENT, gesture: 'throwF',
    help: 'Throw a Trident that homes in on the kart ahead, and Channeling calls a lightning bolt down to spin them out.',
    odds: [1, 4, 4, 3, 1],
    ai: (k, ctx) => {
      const a = ctx.ahead(k, 1)[0];
      if (live(a) && gapTo(k, a) < 170) return true;
      const b = ctx.behind(k, 1)[0];
      return !a && live(b) && gapTo(k, b) < 40 ? { back: true } : false;
    },
    use(k, ctx, { back }) { ctx.spawn(new Trident(k, ctx, !!back)); },
  },
  {
    id: 'elytra', name: 'Elytra Rockets', color: '#a8a8c8', icon: ICON_ELYTRA, gesture: 'use', multi: 3,
    help: 'Elytra wings spread on your kart and three firework rockets each blast you forward.',
    odds: [2, 3, 4, 4, 2],
    ai: (k) => calm(k) && k.boostTime <= 0.15,
    use(k, ctx) {
      if (!k.mcElytra) k.mcElytra = ctx.spawn(new Elytra(k, ctx));
      k.mcElytra.fire();
    },
  },
  {
    id: 'enderpearl', name: 'Ender Pearl', color: '#b050ff', icon: ICON_PEARL, gesture: 'throwF',
    help: 'Throw an Ender Pearl far up the track and teleport to where it lands in a puff of purple, coming out with a boost.',
    odds: [0, 0, 0, 3, 6],
    ai: (k) => calm(k) && !k.mcPearl,
    use(k, ctx) {
      if (k.mcPearl) { k.boost(1); return; }
      k.mcPearl = ctx.spawn(new Pearl(k, ctx));
    },
  },
];
