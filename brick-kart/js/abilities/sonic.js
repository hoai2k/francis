// Sonic the Hedgehog abilities (see ../abilities.js for the contract). Models live in ./sonic-fx.js.
//   Motobug           – a ladybug Badnik dropped behind you (or tossed ahead) patrols the road,
//                       weaving across it; karts that hit it spin out and free a Flicky
//   Lightning Shield  – a crackling bubble blocks the next hit and pulls nearby gold studs to you
//   Homing Attack     – curl into a spinning ball, leap onto the kart ahead (spin-out) and
//                       bounce off it with a boost
//   Spin Dash         – rev up in a cloud of dust, then blast off at huge speed, spinning out
//                       anyone you ram
//   Super Sonic       – the seven Chaos Emeralds circle you and your kart turns gold: invincible
//                       and very fast for 7 s, bowling karts aside
import * as THREE from 'three';
import {
  TAU, angleDiff, clamp, live, snd, ringSnd, additive, glowSprite, glowTex, goldMat,
  motobugMesh, flickyMesh, spinBallMesh, thunderShieldMesh, emeraldRing, studMesh,
} from './sonic-fx.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const HOLD = new WeakMap();   // AI: when a CPU first considered using a held power
const SHIELDS = new WeakMap(), SUPERS = new WeakMap(), DASHES = new WeakMap();
const held = (k, ctx, s) => { const now = ctx.race.time; if (!HOLD.has(k)) HOLD.set(k, now); return now - HOLD.get(k) > s; };
const done = (k) => HOLD.delete(k);
const trackGap = (ctx, k, o) => { const N = ctx.track.N; return ((o.loc.i - k.loc.i) % N + N) % N; };   // samples ahead (1 sample ≈ 1 unit)
const ballColor = (k) => k.driver?.color ?? k.model?.colors?.[2] ?? 0x1f5fd8;

// a short-lived expanding glow (transform flash, impact)
function flash(ctx, pos, color, size = 5, life = 0.35) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.copy(pos); ctx.scene.add(s);
  let t = 0;
  ctx.spawn({
    name: 'sn-flash',
    update(dt) { t += dt; const f = t / life; s.scale.setScalar(size * (0.4 + f)); s.material.opacity = Math.max(0, 1 - f); return t < life; },
    dispose() { ctx.scene.remove(s); s.material.dispose(); },
  });
}
function sparks(ctx, p, n, cols, speed = 10, life = 0.5) {
  for (let j = 0; j < n; j++) {
    const a = Math.random() * TAU, e = Math.random() * 1.2;
    ctx.fx.spark(p.x, p.y, p.z, Math.cos(a) * Math.cos(e) * speed, Math.sin(e) * speed * 0.8, Math.sin(a) * Math.cos(e) * speed, cols[j % cols.length], life * (0.6 + Math.random() * 0.6));
  }
}
// a point on the road with a fractional sample index
function roadAt(ctx, i, lat, out) {
  const tr = ctx.track, i0 = Math.floor(i), f = i - i0;
  tr.at(tr.wrap(i0), lat, 0, out);
  const x = out.x, y = out.y, z = out.z;
  tr.at(tr.wrap(i0 + 1), lat, 0, out);
  return out.set(x + (out.x - x) * f, y + (out.y - y) * f, z + (out.z - z) * f);
}

// ---- Motobug -------------------------------------------------------------------------------------
const BUG_LIFE = 30;
function freeFlicky(ctx, pos) {
  const bird = flickyMesh(); bird.position.copy(pos); ctx.scene.add(bird);
  let t = 0; const yaw = Math.random() * TAU;
  ctx.spawn({
    name: 'sn-flicky',
    update(dt) {
      t += dt;
      bird.position.x += Math.sin(yaw) * 6 * dt; bird.position.z += Math.cos(yaw) * 6 * dt; bird.position.y += (5 - t * 2) * dt + Math.sin(t * 20) * 0.04;
      bird.rotation.set(0, yaw, Math.sin(t * 25) * 0.3);
      return t < 1.6;
    },
    dispose() { ctx.scene.remove(bird); bird.traverse((o) => o.geometry?.dispose()); },
  });
}
function motobug(k, ctx, { back, aimFwd }) {
  const tr = ctx.track, fwd = !back && aimFwd;
  const mesh = motobugMesh(); ctx.scene.add(mesh);
  const { wheel, body, puff } = mesh.userData;
  let i = k.loc.i + (fwd ? 26 : -5);
  const hw0 = tr.HW[tr.wrap(Math.round(i))] ?? 8;
  let lat = clamp(k.loc.lat ?? 0, -hw0 * 0.7, hw0 * 0.7);
  const start = k.pos.clone().setY(k.pos.y + 1), land = roadAt(ctx, i, lat, new THREE.Vector3());
  const fly = fwd ? 0.65 : 0.35;
  const pos = mesh.position.copy(start);
  let t = 0, dir = Math.random() < 0.5 ? 1 : -1, yaw = k.yaw, safe = 0.8, dead = false;
  const pop = (smash) => {
    if (dead) return; dead = true;
    ctx.fx.explosion(pos);
    ctx.fx.debris(V1.copy(pos).setY(pos.y + 1), [0xd8202c, 0x1b1b22, 0xa0a5a9], 10, 0.8);
    freeFlicky(ctx, V1.copy(pos).setY(pos.y + 1.2));
    snd(ctx, pos, (au, a) => { au.noiseHit(0.3, { vol: 0.3 * a, freq: 600, type: 'lowpass' }); au.tone(smash ? 300 : 520, 0.25, { vol: 0.1 * a, type: 'square', slide: 0.4, filter: 2200 }); });
  };
  snd(ctx, k.pos, (au, a) => { au.tone(180, 0.18, { vol: 0.12 * a, type: 'square', slide: 1.8, filter: 1500 }); au.clatter(5, 0.2, 0.2 * a); });
  const ent = {
    name: 'motobug', owner: k, pos,
    update(dt) {
      if (dead) return false;
      t += dt; safe -= dt;
      if (t < fly) {
        const u = t / fly;
        pos.lerpVectors(start, land, u); pos.y += Math.sin(u * Math.PI) * (fwd ? 5 : 1.5);
        mesh.rotation.set(0, yaw, 0);
        return true;
      }
      // patrol: roll slowly back down the road towards oncoming karts, weaving side to side
      const hw = tr.HW[tr.wrap(Math.round(i))] ?? 8;
      i -= 2.2 * dt; lat += dir * 3.4 * dt;
      if (Math.abs(lat) > hw * 0.75) { lat = Math.sign(lat) * hw * 0.75; dir = -dir; }
      roadAt(ctx, i, lat, pos);
      const want = tr.yawAt(tr.wrap(Math.round(i))) + Math.PI + dir * 0.75;
      yaw += clamp(angleDiff(yaw, want), -4 * dt, 4 * dt);
      mesh.rotation.set(0, yaw, 0);
      wheel.rotation.x += dt * 9;
      body.position.y = Math.abs(Math.sin(t * 9)) * 0.06;
      puff.scale.setScalar(0.5 + Math.abs(Math.sin(t * 6)) * 0.5);
      // karts that run into it
      for (const o of ctx.race.karts) {
        if ((o === k && safe > 0) || o.respawn > 0) continue;
        const s = o.megaScale || 1;
        if (Math.abs(o.pos.x - pos.x) > 2.2 * s || Math.abs(o.pos.z - pos.z) > 2.2 * s || Math.abs(o.pos.y - pos.y) > 2) continue;
        if (o.pos.distanceToSquared(pos) > (2.1 * s) ** 2) continue;
        if (o.megaTime > 0 || o.bulletTime > 0 || o.goldenTime > 0) { pop(true); return false; }   // squashed
        if (o.invincible) continue;
        const sh = o.shieldTime > 0;
        if (ctx.hit(o, 'spin', k, 'motobug') || sh) { pop(false); return false; }
      }
      return t < BUG_LIFE;
    },
    danger: (p, r) => !dead && t > fly && p.distanceToSquared(pos) < (r + 1.6) ** 2,
    deflect(p, r) { if (p.distanceToSquared(pos) < (r + 2) ** 2) pop(true); },
    dispose() { if (!dead && t >= BUG_LIFE) ctx.fx.pop?.(pos, 0xd8202c); ctx.scene.remove(mesh); mesh.traverse((o) => o.isMesh && o.geometry?.dispose()); },
  };
  return ctx.spawn(ent);
}

// ---- Lightning Shield ----------------------------------------------------------------------------
const SHIELD_TIME = 14, MAGNET = 16;
function thunderShield(k, ctx) {
  k.shieldTime = SHIELD_TIME;
  snd(ctx, k.pos, (au, a) => {
    au.noiseHit(0.5, { vol: 0.3 * a, freq: 3000, q: 0.8, sweep: 0.3 });
    au.tone(660, 0.35, { vol: 0.1 * a, type: 'sawtooth', slide: 2.2, filter: 3000 });
    au.tone(990, 0.3, { vol: 0.06 * a, type: 'square', at: 0.08, slide: 1.5, filter: 3000 });
  });
  if (SHIELDS.has(k)) return;   // already up: just topped up
  const mesh = thunderShieldMesh(); mesh.position.y = 1; k.model.root.add(mesh);
  const { lines, crackle } = mesh.userData;
  const studs = ctx.track.studs || [], flying = [];
  let t = 0, ct = 0, ended = false;
  const ent = {
    name: 'thundershield', kart: k,
    update(dt) {
      t += dt; ct -= dt;
      if (k.respawn > 0) return false;
      if (k.shieldTime <= 0) {
        // blocked a hit (or ran out): discharge
        if (!ended && t < SHIELD_TIME - 0.1) {
          sparks(ctx, V1.copy(k.pos).setY(k.pos.y + 1.2), 18, [0xfff27a, 0x7fd0ff, 0xffffff], 14);
          ctx.ring(k.pos, 7, 0xfff27a);
          snd(ctx, k.pos, (au, a) => { au.noiseHit(0.35, { vol: 0.4 * a, freq: 2500, q: 0.6 }); au.tone(1200, 0.2, { vol: 0.08 * a, type: 'sawtooth', slide: 0.3 }); });
        }
        ended = true; mesh.visible = false;
        return tickStuds(dt);
      }
      k.bubble.visible = false;   // our crackling bubble replaces the plain one
      if (ct <= 0) { crackle(); ct = 0.05 + Math.random() * 0.05; lines.material.opacity = 0.6 + Math.random() * 0.4; }
      mesh.rotation.y += dt * 1.5;
      mesh.scale.setScalar(1 + Math.sin(t * 13) * 0.03);
      // magnet: nearby gold studs fly to you
      for (const s of studs) {
        if (!s.active || flying.length >= 8) continue;
        const dx = s.pos.x - k.pos.x, dz = s.pos.z - k.pos.z;
        if (dx * dx + dz * dz > MAGNET * MAGNET || Math.abs(s.pos.y - k.pos.y) > 6) continue;
        s.active = false; s.timer = 9;
        const m = studMesh(); m.position.copy(s.pos); ctx.scene.add(m);
        flying.push({ m, t: 0 });
      }
      tickStuds(dt);
      return true;
    },
    dispose() {
      mesh.removeFromParent(); lines.geometry.dispose();
      for (const f of flying) ctx.scene.remove(f.m);
      if (SHIELDS.get(k) === ent) SHIELDS.delete(k);
    },
  };
  function tickStuds(dt) {
    for (let n = flying.length - 1; n >= 0; n--) {
      const f = flying[n]; f.t += dt;
      const d = V2.copy(k.pos).setY(k.pos.y + 1.2).sub(f.m.position), L = d.length(), sp = 18 + f.t * 60;
      f.m.position.addScaledVector(d, Math.min(1, (sp * dt) / Math.max(L, 1e-3)));
      f.m.rotation.y += dt * 12;
      if (L < 1.2 || f.t > 1.5) {
        ctx.scene.remove(f.m); flying.splice(n, 1);
        k.studs = Math.min(10, k.studs + 1);
        ctx.fx.studPickup(f.m.position);
        ringSnd(ctx, k.pos, k.human ? 0.08 : 0.04);
      }
    }
    return flying.length > 0;
  }
  SHIELDS.set(k, ent);
  return ctx.spawn(ent);
}

// ---- Homing Attack -------------------------------------------------------------------------------
const HA_CURL = 0.22, HA_RANGE = 70;
function homingTarget(k, ctx) {
  const o = ctx.ahead(k, 1)[0];
  if (!live(o)) return null;
  const g = trackGap(ctx, k, o);
  return g > 0 && g < HA_RANGE && Math.abs(o.pos.y - k.pos.y) < 12 ? o : null;
}
function homingAttack(k, ctx) {
  const tr = ctx.track, N = tr.N;
  const target = homingTarget(k, ctx);
  const holder = new THREE.Group(), ball = spinBallMesh(ballColor(k)); holder.add(ball); ctx.scene.add(holder);
  holder.visible = false;
  const reticle = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.0, 24), additive(0xff3a3a, 0.85));
  const i0 = k.loc.i, lat0 = k.loc.lat ?? 0;
  const gap0 = target ? trackGap(ctx, k, target) : 24;
  const flyT = clamp(gap0 / 75, 0.3, 0.9);
  if (target) ctx.scene.add(reticle);
  let t = 0, phase = 0;
  snd(ctx, k.pos, (au, a) => { au.tone(300, 0.2, { vol: 0.12 * a, type: 'square', slide: 2.5, filter: 2400 }); au.noiseHit(0.25, { vol: 0.2 * a, freq: 1200, sweep: 3 }); });
  const ent = {
    name: 'homingattack', kart: k,
    update(dt) {
      t += dt;
      if (k.respawn > 0 || k.finished) return false;
      k.model.body.visible = false;      // curled into a ball
      holder.visible = true;
      ball.rotation.x += dt * 28;
      holder.rotation.y = k.yaw;
      ball.userData.blur.material.opacity = 0.4 + Math.random() * 0.3;
      if (target && reticle.parent) { reticle.position.copy(target.pos).setY(target.pos.y + 1.4); reticle.lookAt(V1.copy(k.pos).setY(k.pos.y + 1.4)); reticle.rotation.z += dt * 4; }
      if (phase === 0) {
        // curl up and hop
        const u = t / HA_CURL;
        holder.position.copy(k.pos).setY(k.pos.y + 1.3 + Math.sin(Math.min(1, u) * Math.PI * 0.5) * 1.2);
        k.speed *= Math.exp(-2 * dt);
        if (u >= 1) { phase = 1; t = 0; ctx.fx.dust?.(k, 0xdddddd, 6); if (k.gliding) k.setGliding(false); k.cancelDrift(); }
        return true;
      }
      if (phase === 1) {
        // fly to the target along the road
        const u = Math.min(1, t / flyT), e = u * u * (3 - 2 * u);
        const ok = target && live(target);
        const toI = i0 + (ok ? ((target.loc.i - i0) % N + N) % N : gap0), toLat = ok ? target.loc.lat ?? 0 : lat0;
        const i = Math.round(i0 + (toI - i0) * e);
        const hw = tr.HW[tr.wrap(i)] ?? 8;
        k.place(tr.wrap(i), clamp(lat0 + (toLat - lat0) * e, -hw * 0.85, hw * 0.85));
        k.speed = k.topSpeed * 1.1;
        k.ghostTime = Math.max(k.ghostTime, 0.15);
        holder.position.copy(k.pos).setY(k.pos.y + 1.4 + Math.sin(u * Math.PI) * 3.5 + (1 - u) * 1.2);
        k.model.body.visible = false;
        if (Math.random() < 0.9) ctx.fx.spark(holder.position.x, holder.position.y, holder.position.z, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, Math.random() < 0.5 ? 0x7fc4ff : 0xffffff, 0.35);
        if (u >= 1) {
          // strike!
          if (ok) {
            const hit = ctx.hit(target, 'spin', k, 'homingattack');
            if (hit) target.speed *= 0.5;
            k.place(tr.wrap(target.loc.i), target.loc.lat ?? 0);
          }
          k.vy = 10; k.grounded = false;
          const chase = ctx.race.cams?.find((c) => c.kart === k)?.chase;
          if (chase) chase.init = false;   // snap the camera back behind the kart
          k.speed = k.topSpeed * 1.2;
          k.boost(1.1);
          k.ghostTime = Math.max(k.ghostTime, 0.5);
          const p = V1.copy(k.pos).setY(k.pos.y + 1.4);
          flash(ctx, p, 0xbfe4ff, 6, 0.3);
          sparks(ctx, p, 22, [0xffffff, 0x7fc4ff, 0xffe060], 14);
          ctx.ring(k.pos, 9, 0x7fc4ff);
          snd(ctx, p, (au, a) => { au.noiseHit(0.25, { vol: 0.4 * a, freq: 900, type: 'lowpass' }); au.tone(880, 0.25, { vol: 0.1 * a, type: 'square', slide: 1.8, filter: 3000 }); });
          phase = 2; t = 0;
        }
        return true;
      }
      // bounce off, still curled for a moment
      holder.position.copy(k.pos).setY(k.pos.y + 1.4);
      if (t > 0.35) { k.model.body.visible = true; return false; }
      return true;
    },
    dispose() {
      ctx.scene.remove(holder); ctx.scene.remove(reticle); reticle.geometry.dispose();
      ball.userData.ball.traverse((o) => o.isMesh && o.geometry.dispose());
      if (k.model) k.model.body.visible = true;
    },
  };
  return ctx.spawn(ent);
}

// ---- Spin Dash -----------------------------------------------------------------------------------
const SD_REV = 0.6, SD_RUN = 2.4;
let arcGeo = null;
function spinWheel() {
  arcGeo ||= new THREE.TorusGeometry(1.75, 0.17, 6, 16, Math.PI * 0.6);
  const outer = new THREE.Group(), inner = new THREE.Group(); outer.add(inner);
  outer.rotation.y = Math.PI / 2;   // a wheel of blue arcs along the kart, spinning forward
  for (let n = 0; n < 3; n++) { const a = new THREE.Mesh(arcGeo, additive(n ? 0x5aa8ff : 0xffffff, n ? 0.7 : 0.6)); a.rotation.z = (n * TAU) / 3; inner.add(a); }
  outer.add(glowSprite(0x4a90ff, 4.5, 0.35));
  outer.userData.inner = inner;
  return outer;
}
function spinDash(k, ctx) {
  if (DASHES.has(k)) return;
  const wheel = spinWheel(); wheel.position.y = 1.2; wheel.scale.set(1, 1, 1); k.model.root.add(wheel);
  const inner = wheel.userData.inner, rammed = new Set();
  let t = 0, phase = 0;
  // the rev: three rising "vrr"s
  snd(ctx, k.pos, (au, a) => {
    for (let n = 0; n < 3; n++) au.tone(220 + n * 120, 0.2, { vol: 0.1 * a, type: 'sawtooth', slide: 2.2, filter: 2600, at: n * 0.19 });
    au.noiseHit(SD_REV, { vol: 0.15 * a, freq: 500, sweep: 4, q: 1.5 });
  });
  const ent = {
    name: 'spindash', kart: k,
    update(dt) {
      t += dt;
      if (k.respawn > 0) return false;
      inner.rotation.z -= dt * (phase === 0 ? 18 + t * 40 : 34);
      if (phase === 0) {
        k.speed *= Math.exp(-2.2 * dt);
        wheel.scale.setScalar(0.75 + t / SD_REV * 0.35 + Math.sin(t * 50) * 0.04);
        const fw = k.forward(V1);
        for (let j = 0; j < 2; j++) ctx.fx.puff(k.pos.x - fw.x * 2 + (Math.random() - 0.5) * 2, k.pos.y + 0.3, k.pos.z - fw.z * 2 + (Math.random() - 0.5) * 2, -fw.x * 6 + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, -fw.z * 6 + (Math.random() - 0.5) * 3, 0xd8d0c0, 0.6);
        if (t >= SD_REV) {
          phase = 1; t = 0;
          k.cancelDrift();
          k.boost(SD_RUN);
          k.speed = k.topSpeed * 1.75;
          ctx.ring(k.pos, 8, 0x5aa8ff);
          flash(ctx, V2.copy(k.pos).setY(k.pos.y + 1), 0x9ad8ff, 5, 0.3);
          snd(ctx, k.pos, (au, a) => { au.noiseHit(0.6, { vol: 0.4 * a, freq: 700, sweep: 0.25, q: 1 }); au.tone(900, 0.4, { vol: 0.1 * a, type: 'square', slide: 0.3, filter: 3000 }); });
        }
        return true;
      }
      // blasting off: rams anyone in the way
      k.speed = Math.max(k.speed, k.topSpeed * (1.75 - t / SD_RUN * 0.45));
      wheel.scale.setScalar(1.05);
      const fw = k.forward(V1);
      if (Math.random() < 0.8) ctx.fx.spark(k.pos.x - fw.x * 2.4, k.pos.y + 0.8 + Math.random(), k.pos.z - fw.z * 2.4, -fw.x * 12, Math.random() * 2, -fw.z * 12, Math.random() < 0.5 ? 0x5aa8ff : 0xffffff, 0.35);
      for (const o of ctx.near(k.pos, 3.6 * (k.megaScale || 1), k)) {
        if (rammed.has(o)) continue;
        rammed.add(o);
        if (ctx.hit(o, 'spin', k, 'spindash')) { sparks(ctx, V2.copy(o.pos).setY(o.pos.y + 1), 10, [0xffffff, 0x7fc4ff], 10); o.shove?.(fw.x * 8 / (o.weight || 1), fw.z * 8 / (o.weight || 1), 1); }
      }
      return t < SD_RUN;
    },
    dispose() { wheel.removeFromParent(); if (DASHES.get(k) === ent) DASHES.delete(k); },
  };
  DASHES.set(k, ent);
  return ctx.spawn(ent);
}

// ---- Super Sonic ---------------------------------------------------------------------------------
const SS_TIME = 7;
function superSonic(k, ctx) {
  k.goldenTime = Math.max(k.goldenTime, SS_TIME);
  k.boost(1.2);
  const chord = () => snd(ctx, k.pos, (au, a) => {
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => au.tone(440 * Math.pow(2, (n + 3) / 12), 0.22, { vol: 0.09 * a, type: 'square', filter: 4000, at: i * 0.06 }));
    au.noiseHit(0.9, { vol: 0.25 * a, freq: 2500, sweep: 0.4, q: 0.6 });
  });
  chord();
  const p0 = V1.copy(k.pos).setY(k.pos.y + 1.3);
  flash(ctx, p0, 0xffe070, 9, 0.5);
  ctx.ring(k.pos, 12, 0xffd040);
  if (k.human) ctx.race.flash?.(0xfff0a0);
  if (SUPERS.has(k)) { SUPERS.get(k).extend(); return; }
  // the emeralds spiral in, then circle the kart
  const ring = emeraldRing(0.52); ring.position.y = 1.5; k.model.root.add(ring);
  const gems = ring.userData.gems;
  // the kart (and driver) turn gold
  const swapped = [];
  k.model.body.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material, std = (x) => x && x.isMeshStandardMaterial && !x.transparent;
    if (Array.isArray(m) ? m.some(std) : std(m)) { swapped.push([o, m]); o.material = goldMat(); }
  });
  let t = 0, life = SS_TIME, boosted = false;
  const ent = {
    name: 'supersonic', kart: k,
    extend() { life = t + SS_TIME; boosted = false; },
    update(dt) {
      t += dt;
      if (k.respawn > 0 || t > life + 0.6 || (t > 0.5 && k.goldenTime <= 0)) return false;
      const intro = Math.min(1, t / 0.8), out = Math.max(0, (t - life) / 0.6);
      const R = 2.7 + (1 - intro) * 5 + out * 4;
      gems.forEach((g, n) => {
        const a = t * 3.2 + (n / gems.length) * TAU;
        g.position.set(Math.sin(a) * R, Math.sin(a * 2 + n) * 0.25 + (1 - intro) * 2, Math.cos(a) * R * 1.2);
        g.children[0].rotation.y = t * 4 + n;
        g.visible = out < 1;
      });
      ring.rotation.y = Math.sin(t * 0.7) * 0.2;
      if (t > life * 0.5 && !boosted) { boosted = true; k.boost(0.8, false); }
      if (Math.random() < 0.7) {
        const a = Math.random() * TAU;
        ctx.fx.spark(k.pos.x + Math.sin(a) * 2, k.pos.y + 0.5 + Math.random() * 2, k.pos.z + Math.cos(a) * 2, 0, 2 + Math.random() * 2, 0, Math.random() < 0.6 ? 0xffe070 : 0xffffff, 0.45);
      }
      return true;
    },
    dispose() {
      ring.removeFromParent();
      for (const [o, m] of swapped) o.material = m;
      if (SUPERS.get(k) === ent) SUPERS.delete(k);
    },
  };
  SUPERS.set(k, ent);
  return ctx.spawn(ent);
}

// ---- AI helpers ----------------------------------------------------------------------------------
function straightAhead(ctx, k, n = 40) {
  const tr = ctx.track;
  return Math.abs(angleDiff(tr.yawAt(k.loc.i), tr.yawAt(tr.wrap(k.loc.i + n)))) < 0.45;
}
const inControl = (k) => k.grounded && !k.stunned && k.respawn <= 0 && !k.finished;

// ---- prewarm -------------------------------------------------------------------------------------
function prewarm() {
  const gold = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), goldMat());
  return [motobugMesh(), flickyMesh(), spinBallMesh(), thunderShieldMesh(), emeraldRing(), studMesh(), spinWheel(), gold];
}

// ---- icons (viewBox 0 0 64 64) -------------------------------------------------------------------
const ICON_MOTOBUG = '<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><path d="M8 40a24 22 0 0 1 44-8l4 8z" fill="#d8202c"/><path d="M34 22v18" fill="none"/><rect x="44" y="30" width="14" height="14" rx="6" fill="#a0a5a9"/><circle cx="30" cy="50" r="9" fill="#1b2a34"/><path d="M6 38h-2M6 32H2" stroke-linecap="round"/></g><circle cx="30" cy="50" r="4" fill="#f2cd37"/><circle cx="52" cy="36" r="4" fill="#fff"/><circle cx="53" cy="36" r="2" fill="#1060ff"/><g fill="#1b2a34"><circle cx="20" cy="30" r="3"/><circle cx="26" cy="24" r="2.5"/><circle cx="18" cy="38" r="2.5"/></g></svg>';
const ICON_SHIELD = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#6ad0ff" fill-opacity=".45" stroke="#2a88ff" stroke-width="4"/><path d="M36 8L20 34h11l-5 22 18-30H33z" fill="#fff27a" stroke="#1b2a34" stroke-width="2.5" stroke-linejoin="round"/><path d="M10 22l6 4-4 4M54 40l-6-2 4-5" stroke="#fff27a" stroke-width="2.5" fill="none" stroke-linecap="round"/><g fill="#ffc21a" stroke="#7a5a00" stroke-width="1.5"><circle cx="54" cy="14" r="4"/><circle cx="10" cy="50" r="4"/></g></svg>';
const ICON_HOMING = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="#ff3a3a" stroke-width="3" stroke-dasharray="10 6"/><path d="M32 2v10M32 52v10M2 32h10M52 32h10" stroke="#ff3a3a" stroke-width="3"/><g stroke="#1b2a34" stroke-width="2.5" stroke-linejoin="round"><path d="M32 14l6 6 8-2-2 8 6 6-8 2 2 8-8-2-4 6-4-6-8 2 2-8-8-2 6-6-2-8 8 2z" fill="#1f5fd8"/></g><ellipse cx="34" cy="34" rx="6" ry="5" fill="#f2c49a"/><path d="M22 24a14 14 0 0 1 8-6" stroke="#bfe4ff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
const ICON_DASH = '<svg viewBox="0 0 64 64"><g stroke-linecap="round" stroke-width="4"><path d="M4 22h16M2 32h14M4 42h16" stroke="#7fc4ff"/></g><ellipse cx="18" cy="54" rx="14" ry="5" fill="#d8d0c0"/><g stroke="#1b2a34" stroke-width="2.5" stroke-linejoin="round"><circle cx="40" cy="32" r="18" fill="#1f5fd8"/><path d="M40 14l-4-8 10 4zM56 26l8-2-4 9zM54 46l8 4-9 3z" fill="#1f5fd8"/></g><path d="M28 24a14 14 0 0 1 12-6M52 40a14 14 0 0 1-8 8" stroke="#bfe4ff" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="46" cy="34" r="5" fill="#f2c49a"/></svg>';
const ICON_SUPER = (() => {
  let s = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="13" fill="#ffd040" stroke="#7a5a00" stroke-width="3"/><path d="M26 22l6-10 6 10M22 30l-8-4 8-2M42 30l8-4-8-2" fill="#ffe680" stroke="#7a5a00" stroke-width="2" stroke-linejoin="round"/>';
  const cols = ['#2fd84a', '#2a6aff', '#ff2a2a', '#ffe02a', '#30e8ff', '#c0c0d8', '#c040ff'];
  cols.forEach((c, i) => {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2, x = 32 + Math.cos(a) * 24, y = 32 + Math.sin(a) * 24;
    s += `<path d="M${(x - 5).toFixed(1)} ${(y - 2).toFixed(1)}l3-4h4l3 4-5 7z" fill="${c}" stroke="#1b2a34" stroke-width="2" stroke-linejoin="round"/>`;
  });
  return s + '</svg>';
})();

export default [
  {
    id: 'motobug', name: 'Motobug', color: '#d8202c', icon: ICON_MOTOBUG,
    help: 'Drop a ladybug Badnik behind you (or toss it ahead) that weaves across the road, spinning out anyone who hits it.',
    odds: [5, 4, 2, 1, 0],
    gesture: 'throwB',
    // drop it on a rival right behind, otherwise after a while
    ai(k, ctx) {
      const b = ctx.behind(k, 1)[0];
      if (b && live(b) && trackGap(ctx, b, k) < 22) { done(k); return { back: true }; }
      if (held(k, ctx, 7)) { done(k); return { back: true }; }
      return false;
    },
    use(k, ctx, o) { done(k); motobug(k, ctx, o); },
    prewarm,
  },
  {
    id: 'thundershield', name: 'Lightning Shield', color: '#fff27a', icon: ICON_SHIELD,
    help: 'A crackling Lightning Shield blocks the next hit and pulls nearby gold studs to you like rings.',
    odds: [5, 3, 2, 1, 0],
    gesture: 'use',
    // raise it when something's coming, a rival is alongside, or studs are nearby; else after a while
    ai(k, ctx) {
      if (k.shieldTime > 0) return false;
      const threat = ctx.race.items.proj.some((p) => p.owner !== k && p.pos.distanceTo(k.pos) < 30);
      const rival = ctx.near(k.pos, 8, k).length > 0;
      const studs = (ctx.track.studs || []).some((s) => s.active && s.pos.distanceTo(k.pos) < MAGNET);
      const go = threat || rival || (studs && k.studs < 8) || held(k, ctx, 5);
      if (go) done(k);
      return go;
    },
    use(k, ctx) { done(k); thunderShield(k, ctx); },
  },
  {
    id: 'homingattack', name: 'Homing Attack', color: '#ff3a3a', icon: ICON_HOMING,
    help: 'Curl into a spinning ball, leap onto the kart just ahead to spin them out, and bounce off with a boost.',
    odds: [1, 4, 4, 3, 1],
    gesture: 'use',
    // lock on when the kart ahead is in range (the leader just uses it as a dash)
    ai(k, ctx) {
      if (!inControl(k)) return false;
      if (homingTarget(k, ctx)) { const o = ctx.ahead(k, 1)[0]; return !(o.human && o.invuln > 0) || held(k, ctx, 8); }
      return k.rank === 1 ? held(k, ctx, 4) : false;
    },
    use(k, ctx) { done(k); homingAttack(k, ctx); },
  },
  {
    id: 'spindash', name: 'Spin Dash', color: '#5aa8ff', icon: ICON_DASH,
    help: 'Rev up in a cloud of dust, then blast off at huge speed, spinning out any kart you ram.',
    odds: [2, 3, 4, 4, 2],
    gesture: 'use',
    // on a straight, or to ram a rival close ahead
    ai(k, ctx) {
      if (!inControl(k) || DASHES.has(k)) return false;
      const a = ctx.ahead(k, 1)[0];
      return straightAhead(ctx, k) || (a && live(a) && trackGap(ctx, k, a) < 25) || held(k, ctx, 6);
    },
    use(k, ctx) { done(k); spinDash(k, ctx); },
  },
  {
    id: 'supersonic', name: 'Super Sonic', color: '#ffd040', icon: ICON_SUPER,
    help: 'The seven Chaos Emeralds circle you and your kart turns gold: invincible and very fast for 7 seconds, bowling karts aside.',
    odds: [0, 0, 0, 3, 6],
    gesture: 'use',
    ai: (k) => inControl(k),
    use(k, ctx) { superSonic(k, ctx); },
  },
];
