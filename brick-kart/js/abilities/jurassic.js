// Jurassic World abilities (see ../abilities.js for the contract):
//   T. rex Roar       a giant brick T. rex head bursts up behind you, snaps up anything
//                     chasing you, then ROARS a sound-wave cone that spins out karts ahead
//   Raptor Pack       Blue, Charlie and Delta sprint up the track and pounce on the karts ahead
//   Mosasaurus Breach the mosasaurus leaps out of the road ahead of the next kart, arcs over
//                     the track and crashes down in a splash wave (leaving a puddle)
import * as THREE from 'three';
import { take, give, GEO, glow, water, layOnTrack, raptorRun } from './jurassic-rigs.js';

const TAU = Math.PI * 2;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const prog = (k) => (k.loc.i ?? 0) + (k.loc.t || 0);
const live = (o) => !o.finished && o.respawn <= 0;
// signed distance along the track from sample a to sample b (shortest way round)
function along(tr, a, b) { const N = tr.N; let d = (((b - a) % N) + N) % N; return d > N / 2 ? d - N : d; }
// a smooth point on the track at a fractional sample index
function trackPt(tr, s, lat, h, out) {
  const i0 = Math.floor(s), f = s - i0;
  tr.at(tr.wrap(i0), lat, h, _a); tr.at(tr.wrap(i0 + 1), lat, h, _b);
  return out.lerpVectors(_a, _b, f);
}
function shakeCams(race, pos, r, amt) {
  for (const c of race.cams) {
    const d = c.kart.pos.distanceTo(pos);
    if (d < r) c.chase.shake = Math.max(c.chase.shake, amt * (1 - 0.6 * d / r));
  }
}
const att = (ctx, pos) => (ctx.audio.att ? ctx.audio.att(pos) : 1);

// ---- sounds (built from the synth primitives) --------------------------------------------
function roarSound(au, a) {
  if (a < 0.03 || !au.ctx) return;
  au.noiseHit(1.6, { vol: 0.5 * a, freq: 900, sweep: 0.3, q: 0.7, type: 'lowpass' });
  au.noiseHit(1.3, { vol: 0.22 * a, freq: 1700, q: 1.6, sweep: 0.45 });
  au.tone(118, 1.5, { type: 'sawtooth', vol: 0.24 * a, slide: 0.5, filter: 1000, attack: 0.09 });
  au.tone(86, 1.6, { type: 'square', vol: 0.16 * a, slide: 0.55, filter: 520, attack: 0.12 });
  au.tone(176, 1.15, { type: 'sawtooth', vol: 0.1 * a, slide: 0.45, filter: 1600, attack: 0.06 });
}
function screech(au, a, at = 0) {
  if (a < 0.03 || !au.ctx) return;
  au.tone(1350 + Math.random() * 400, 0.3, { type: 'sawtooth', vol: 0.07 * a, slide: 0.5, filter: 3800, at });
  au.tone(2300 + Math.random() * 300, 0.14, { type: 'square', vol: 0.03 * a, slide: 0.65, filter: 4000, at: at + 0.03 });
}
function growl(au, a, at = 0) {
  if (a < 0.03 || !au.ctx) return;
  au.tone(70, 0.9, { type: 'sawtooth', vol: 0.2 * a, slide: 0.6, filter: 420, attack: 0.08, at });
  au.noiseHit(0.8, { vol: 0.2 * a, freq: 260, type: 'lowpass', at });
}

// ======================================================================================
// T. rex Roar
// ======================================================================================
function rexRoar(k, ctx) {
  const { race, scene, fx } = ctx;
  const rig = take('rex');
  const S = 1.6, BACK = -5, SIDE = 9.5, LIFT = -5, TURN = 0.85;
  rig.holder.scale.setScalar(S);
  rig.holder.visible = true;
  scene.add(rig.holder);
  const T = 2.4, RISE = 0.32, ROAR = 0.66, SINK = 1.85, R = 32, V = 78;
  // it rises beside-and-behind you, on the side nearer the middle of the road
  const tr = ctx.track, ri = tr.wrap(k.loc.i ?? 0);
  const sideSign = -Math.sign((Math.cos(k.yaw) * tr.R[ri * 2] - Math.sin(k.yaw) * tr.R[ri * 2 + 1]) || 1) * Math.sign(k.loc.lat || 1);
  // the sound wave: a faint cone and expanding rings
  const cone = new THREE.Mesh(GEO.cone, glow(0xffd27a, 0, false));
  const rings = [];
  for (let n = 0; n < 5; n++) {
    const m = new THREE.Mesh(GEO.torus, glow(n % 2 ? 0xffb347 : 0xfff0c0, 0, false));
    m.visible = false;
    rings.push({ m, t0: ROAR + n * 0.075 });
    scene.add(m);
  }
  cone.visible = false;
  scene.add(cone);
  const origin = new THREE.Vector3(), mouth = new THREE.Vector3(), fwd = new THREE.Vector3(), side = new THREE.Vector3();
  const hitSet = new Set();
  let t = 0, yaw = k.yaw, roared = false, chomp = 0, groundY = k.pos.y;
  const place = (out) => {
    const sx = Math.sin(yaw), sz = Math.cos(yaw);
    return out.set(k.pos.x - sx * BACK + sz * SIDE * sideSign, groundY, k.pos.z - sz * BACK - sx * SIDE * sideSign);
  };
  // bursting out of the road
  place(_c);
  fx.debris(_c, [0x6c6e68, 0x595d60, 0x958a73, 0x7a5a3c], 18, 1.2);
  for (let j = 0; j < 16; j++) fx.puff(_c.x + (Math.random() - 0.5) * 5, _c.y + 0.3, _c.z + (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 7, 2 + Math.random() * 5, (Math.random() - 0.5) * 7, 0xb8a888, 0.9);
  ctx.audio.sfx('crash', k.pos);
  growl(ctx.audio, att(ctx, k.pos) * 0.7);

  return {
    jurassic: true,
    update(dt) {
      t += dt;
      if (t >= T) return false;
      // the head rides along beside its owner
      yaw += angDiff(yaw, k.yaw) * Math.min(1, dt * 9);
      if (k.respawn <= 0) groundY += (k.pos.y - groundY) * Math.min(1, dt * 12);
      const up = smooth(0, RISE, t) * (1 - smooth(SINK, T, t));
      const h = rig.holder;
      place(h.position);
      h.position.y += LIFT - 16 * S * (1 - up);
      h.rotation.y = yaw - sideSign * TURN;
      // pose: rise looking up, draw breath, then snap forward and roar
      const breath = smooth(RISE * 0.6, ROAR, t), snap = smooth(ROAR - 0.06, ROAR + 0.06, t), close = smooth(SINK - 0.2, SINK + 0.15, t);
      chomp = Math.max(0, chomp - dt * 5);
      rig.neck.rotation.x = -0.25 * breath + 0.32 * snap - 0.2 * close;
      rig.head.rotation.x = -0.55 - 0.35 * breath + 0.7 * snap - 0.2 * close + chomp * 0.3;
      rig.head.rotation.y = Math.sin(t * 31) * 0.05 * snap * (1 - close);
      const roarJaw = snap * (1 - close) * (0.8 + Math.sin(t * 48) * 0.06);
      rig.jaw.rotation.x = 0.1 + 0.32 * breath * (1 - snap) + roarJaw + chomp * 0.5 - (chomp > 0.6 ? 0.6 : 0);
      if (!roared && t >= ROAR) {
        roared = true;
        fwd.set(Math.sin(k.yaw), 0, Math.cos(k.yaw));
        side.set(fwd.z, 0, -fwd.x);
        h.updateMatrixWorld(true);
        rig.jaw.localToWorld(mouth.set(0, 0.3, 4.6));
        origin.copy(k.pos).addScaledVector(fwd, 1.5);
        cone.position.copy(mouth);
        cone.lookAt(_c.copy(origin).addScaledVector(fwd, R).setY(groundY + 2));
        roarSound(ctx.audio, Math.max(0.35, att(ctx, origin)));
        shakeCams(race, origin, 55, 1.0);
      }
      // the sound wave travels out, spinning out everyone it reaches
      if (roared) {
        const tw = t - ROAR, front = Math.min(R, V * tw);
        const fade = 1 - smooth(R * 0.55, R, V * tw);
        cone.visible = fade > 0.01;
        if (cone.visible) {
          const r = 2 + front * 0.42;
          cone.scale.set(r, r * 0.72, Math.max(0.1, front));
          cone.material.opacity = 0.22 * fade;
        }
        for (const ring of rings) {
          const rt = t - ring.t0, d = V * rt;
          ring.m.visible = rt > 0 && d < R + 4;
          if (!ring.m.visible) continue;
          const r = 1.4 + d * 0.42, w = Math.min(1, d / 16);
          // from the mouth, drifting onto the kart's line as it spreads
          ring.m.position.set(mouth.x + (origin.x - mouth.x) * w, mouth.y + (groundY + 2 - mouth.y) * w, mouth.z + (origin.z - mouth.z) * w).addScaledVector(fwd, d);
          ring.m.rotation.set(0, Math.atan2(fwd.x, fwd.z), 0);
          ring.m.scale.set(r, r * 0.7, r);
          ring.m.material.opacity = 0.85 * Math.pow(Math.max(0, 1 - d / (R + 4)), 0.7);
        }
        if (V * tw < R + 6) {
          // dust kicked up along the wave front
          for (let j = 0; j < 3; j++) {
            const w = (Math.random() - 0.5) * 2 * (2 + front * 0.42);
            fx.puff(origin.x + fwd.x * front + side.x * w, groundY + 0.4, origin.z + fwd.z * front + side.z * w, fwd.x * 8, 2 + Math.random() * 3, fwd.z * 8, 0xd8c8a0, 0.7);
          }
          for (const o of race.karts) {
            if (o === k || hitSet.has(o) || o.respawn > 0) continue;
            const dx = o.pos.x - origin.x, dz = o.pos.z - origin.z;
            const al = dx * fwd.x + dz * fwd.z;
            if (al < -3 || al > front + 1 || al > R) continue;
            const lat = Math.abs(dx * side.x + dz * side.z);
            if (lat > 3.5 + al * 0.42 || Math.abs(o.pos.y - groundY) > 8) continue;
            hitSet.add(o);
            if (ctx.hit(o, 'spin', k, 'rexroar')) {
              const c = race.cams.find((cc) => cc.kart === o);
              if (c) c.chase.shake = Math.max(c.chase.shake, 1.1);
              fx.puff(o.pos.x, o.pos.y + 1, o.pos.z, fwd.x * 10, 4, fwd.z * 10, 0xfff2c8, 0.6);
            }
          }
        }
      }
      // while it's up, the T. rex snaps up rockets and shells chasing its owner
      if (t > RISE * 0.5 && t < SINK) {
        for (const p of race.items.proj) {
          if (p.owner === k || p.life <= 0) continue;
          if (p.pos.distanceToSquared(k.pos) > (p.type === 'seeker' ? 14 * 14 : 10 * 10)) continue;
          p.life = 0;
          chomp = 1;
          fx.debris(p.pos, [0xc91a09, 0xf4f4f4, 0x6c6e68], 8, 0.8);
          ctx.audio.sfx('crash', p.pos);
        }
      }
      return true;
    },
    dispose() {
      give('rex', rig);
      for (const m of [cone, ...rings.map((r) => r.m)]) { m.removeFromParent(); m.material.dispose(); }
    },
  };
}

// ======================================================================================
// Raptor Pack
// ======================================================================================
const PACK = ['blue', 'charlie', 'delta'];
function raptorEnt(k, ctx, name, n, target, claimed) {
  const { race, scene, fx, track: tr } = ctx;
  const key = 'raptor:' + name;
  const rig = take(key);
  const SC = 1.0;
  rig.holder.scale.setScalar(SC);
  rig.holder.rotation.set(0, k.yaw, 0);
  rig.holder.visible = false;
  rig.root.rotation.set(0, 0, 0);
  scene.add(rig.holder);
  const pos = new THREE.Vector3(), prev = new THREE.Vector3(), from = new THREE.Vector3();
  const LAT = [-2.4, 0, 2.4][n];
  let s = prog(k) + 2 + n * 0.6, lat = (k.loc.lat || 0) + LAT;
  let speed = Math.max(30, k.speed + 10), yaw = k.yaw, ph = n * 2;
  let phase = 'wait', pt = n * 0.12, life = 0, spin = 0, flee = 1;
  const go = (p, time = 0) => { phase = p; pt = time; };
  function retarget() {
    let best = null, bd = 1e9;
    for (const o of race.karts) {
      if (o === k || !live(o) || claimed.has(o)) continue;
      const d = along(tr, s, prog(o));
      const score = d >= -4 ? d : 300 - d * 2;   // prefer karts still ahead of the raptor
      if (Math.abs(d) < 220 && score < bd) { bd = score; best = o; }
    }
    return best;
  }
  function vanish() {
    go('gone');
    fx.debris(_c.copy(pos).setY(pos.y + 1.5), [0x7d8a8a, 0x5d6a3e, 0x237841, 0x184632], 8, 0.7);
    for (let j = 0; j < 8; j++) fx.puff(pos.x + (Math.random() - 0.5) * 2, pos.y + 0.5, pos.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4, 0xc8b890, 0.7);
  }
  return {
    jurassic: true,
    update(dt) {
      life += dt; pt += dt;
      const h = rig.holder;
      if (phase === 'wait') {
        // waiting to leap out beside the kart (staggered)
        pt -= 2 * dt;
        s = prog(k) + 2 + n * 0.6; lat = (k.loc.lat || 0) + LAT;
        if (pt > 0) return true;
        go('run');
        trackPt(tr, s, clamp(lat, -tr.HW[tr.wrap(Math.round(s))] + 1, tr.HW[tr.wrap(Math.round(s))] - 1), 0, pos);
        prev.copy(pos);
        h.visible = true;
        fx.debris(_c.copy(pos).setY(pos.y + 1), [0x237841, 0x184632, 0x4b9f4a], 6, 0.6);
        screech(ctx.audio, att(ctx, pos), 0.02);
      }
      if (phase === 'run') {
        if (!target || !live(target) || (claimed.has(target) && target.invuln > 0)) target = retarget();
        if (!target || life > 9) { vanish(); return true; }
        const rel = along(tr, s, prog(target));
        const dir = rel >= 0 ? 1 : -1;
        const want = Math.min(115, Math.abs(target.speed) + 16 + Math.min(70, Math.abs(rel) * 0.5));
        speed += (want - speed) * Math.min(1, dt * 2.5);
        s += dir * Math.min(speed * dt, Math.abs(rel) + 0.5);
        const rate = (Math.abs(rel) < 35 ? 22 : 7) * dt;
        lat += clamp((target.loc.lat || 0) - lat, -rate, rate);
        const hw = tr.HW[tr.wrap(Math.round(s))] - 1.2;
        lat = clamp(lat, -hw, hw);
        prev.copy(pos);
        trackPt(tr, s, lat, 0, pos);
        ph += dt * (6 + speed * 0.3);
        raptorRun(rig, ph, 0.95);
        rig.root.rotation.x = 0.1;
        if (Math.abs(rel) < 5 && pos.distanceTo(target.pos) < 6) {
          go('pounce'); from.copy(pos);
          screech(ctx.audio, att(ctx, pos));
        }
      } else if (phase === 'pounce') {
        // leap onto the target
        const u = Math.min(1, pt / 0.3);
        prev.copy(pos);
        pos.lerpVectors(from, target.pos, u);
        pos.y += Math.sin(u * Math.PI) * 2.8 + u * 0.9;
        rig.legL.rotation.x = rig.legR.rotation.x = -0.9 * Math.sin(u * Math.PI) + 0.3;
        rig.jaw.rotation.x = 0.7;
        rig.head.rotation.x = -0.2;
        rig.root.rotation.x = 0.35 - u * 0.4;
        if (u >= 1) {
          claimed.add(target);
          if (ctx.hit(target, 'spin', k, 'raptorpack')) { go('ride'); spin = 0; }
          else { flee = Math.random() < 0.5 ? -1 : 1; from.copy(pos); go('leap'); }
        }
      } else if (phase === 'ride') {
        // clinging on, biting, while the kart spins out
        prev.copy(pos);
        pos.copy(target.pos); pos.y += 1.2 * (target.megaScale || 1);
        spin += dt * 9;
        yaw = target.yaw + spin;
        rig.jaw.rotation.x = 0.15 + Math.abs(Math.sin(pt * 18)) * 0.6;
        rig.head.rotation.x = 0.25;
        rig.legL.rotation.x = 0.5; rig.legR.rotation.x = -0.2;
        rig.root.rotation.x = 0.25;
        if (pt > 0.7 || target.respawn > 0) { from.copy(pos); flee = Math.random() < 0.5 ? -1 : 1; go('leap'); }
      } else if (phase === 'leap') {
        // bound off into the bushes
        const u = Math.min(1, pt / 0.45);
        prev.copy(pos);
        const f = target ? target.yaw : yaw;
        pos.set(from.x + Math.cos(f) * flee * u * 7 + Math.sin(f) * u * 4, from.y + Math.sin(u * Math.PI) * 3.5, from.z - Math.sin(f) * flee * u * 7 + Math.cos(f) * u * 4);
        raptorRun(rig, ph += dt * 14, 0.6);
        if (u >= 1) vanish();
      } else if (phase === 'knock') {
        // knocked flying by a Force Push / lightsaber: tumble away, then vanish
        const u = Math.min(1, pt / 0.55);
        prev.copy(pos);
        pos.x += from.x * dt; pos.z += from.z * dt; pos.y += (from.y - 30 * pt) * dt;
        rig.root.rotation.x += dt * 14;
        if (u >= 1) vanish();
        h.position.copy(pos);
        return true;
      } else if (phase === 'gone') {
        const u = Math.min(1, pt / 0.25);
        h.scale.setScalar(SC * (1 - u));
        h.position.copy(pos);
        return u < 1;
      }
      // face where we're going
      if (phase !== 'ride') {
        const dx = pos.x - prev.x, dz = pos.z - prev.z;
        if (dx * dx + dz * dz > 1e-5) yaw += angDiff(yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 14);
      }
      h.position.copy(pos);
      h.rotation.y = yaw;
      if (phase === 'run' && Math.random() < 0.3) fx.puff(pos.x, pos.y + 0.2, pos.z, (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, 0xc8b890, 0.4);
      return true;
    },
    // blocking powers (Force Push, Lightsaber Spin...) bat raptors away
    deflect(p, r, by) {
      if (by === k || (phase !== 'run' && phase !== 'pounce') || pos.distanceToSquared(p) > r * r) return;
      const dx = pos.x - p.x, dz = pos.z - p.z, d = Math.hypot(dx, dz) || 1;
      from.set(dx / d * 22, 11, dz / d * 22);
      go('knock');
      screech(ctx.audio, att(ctx, pos));
      fx.puff(pos.x, pos.y + 1.5, pos.z, 0, 2, 0, 0xffffff, 0.4);
    },
    dispose() {
      rig.holder.scale.setScalar(SC);
      rig.root.rotation.set(0, 0, 0);
      give(key, rig);
    },
  };
}
function raptorPack(k, ctx) {
  let targets = ctx.ahead(k, 6).filter(live).slice(0, 3);
  if (!targets.length) targets = ctx.behind(k, 3).filter(live);
  const claimed = new Set();
  PACK.forEach((name, n) => ctx.spawn(raptorEnt(k, ctx, name, n, targets.length ? targets[n % targets.length] : null, claimed)));
  const a = att(ctx, k.pos);
  for (let n = 0; n < 3; n++) screech(ctx.audio, a, n * 0.13);
}

// ======================================================================================
// Mosasaurus Breach
// ======================================================================================
function mosaBreach(k, ctx) {
  const { race, scene, fx, track: tr } = ctx;
  const target = ctx.ahead(k, 4).find(live) || null;
  const rig = take('mosa');
  const S = 0.72, NOSE = 23.5 * S;
  rig.holder.scale.setScalar(S);
  rig.holder.rotation.order = 'YXZ';
  rig.holder.visible = false;
  scene.add(rig.holder);
  let rigOut = true;
  const WARN = 0.75, FLY = 1.6, WAVE = 0.6, PUDDLE = 5.5, D0 = 17, H = 15, R_SPLASH = 13, R_PUDDLE = 6.5;
  // pieces: warning ring at the landing spot, a bubbling pool where it breaches, the splash wave and puddle
  const warn = new THREE.Mesh(GEO.ring, glow(0xbfe8ff, 0));
  const pool = new THREE.Mesh(GEO.disc, water(0));
  const wave = new THREE.Mesh(GEO.wall, water(0));
  const foam = new THREE.Mesh(GEO.ring, glow(0xffffff, 0, false));
  const puddle = new THREE.Group();
  const pMat = water(0), tMat = new THREE.MeshStandardMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0, roughness: 0.1, emissive: 0x2a6aa0, emissiveIntensity: 0.4, depthWrite: false });
  const disc = new THREE.Mesh(GEO.disc, pMat);
  disc.scale.setScalar(R_PUDDLE);
  puddle.add(disc);
  // trans-light-blue round tiles and studs splashed around the puddle (it's LEGO water)
  for (let j = 0; j < 9; j++) {
    const a = j / 9 * TAU + Math.random() * 0.5, r = R_PUDDLE * (0.25 + Math.random() * 0.75);
    const m = new THREE.Mesh(j % 3 ? GEO.stud : GEO.tile, tMat);
    if (j % 3 === 0) m.scale.set(0.9, 1, 0.9);
    m.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
    puddle.add(m);
  }
  for (const m of [warn, pool, wave, foam, puddle]) { m.visible = false; scene.add(m); }

  let t = 0, crashT = -1, landS = 0, landLat = 0, emS = 0, emLat = 0, breached = false;
  const E = new THREE.Vector3(), L = new THREE.Vector3(), C = new THREE.Vector3(), dirH = new THREE.Vector3();
  const hitSet = new Set(), wetSet = new Set();
  function predict() {
    const tl = WARN + FLY * 0.7 - t;
    if (target && live(target)) {
      landS = prog(target) + clamp(target.speed, 6, 48) * tl + 4;
      landLat = target.loc.lat || 0;
    } else if (t === 0) landS = prog(k) + 80;
    const hwL = tr.HW[tr.wrap(Math.round(landS))];
    landLat = clamp(landLat, -hwL + 3, hwL - 3);
    emS = landS + 38;
    const hwE = tr.HW[tr.wrap(Math.round(emS))];
    emLat = (landLat > 0 ? -1 : 1) * hwE * 0.35;
    trackPt(tr, landS, landLat, 0, L);
  }
  predict();
  ctx.audio.sfx('splash', k.pos);

  return {
    jurassic: true,
    update(dt) {
      t += dt;
      const h = rig.holder;
      if (t < WARN) {
        // warning: bubbles where it will breach, a pulsing ring where it will land
        predict();
        layOnTrack(pool, tr, emS, emLat, 0.12);
        pool.visible = true;
        pool.scale.setScalar(1 + 5 * smooth(0, WARN, t));
        pool.material.opacity = 0.8 * smooth(0, 0.2, t);
        trackPt(tr, emS, emLat, 0, E);
        if (Math.random() < 0.7) fx.puff(E.x + (Math.random() - 0.5) * 6, E.y + 0.3, E.z + (Math.random() - 0.5) * 6, 0, 3 + Math.random() * 3, 0, 0xe8f6ff, 0.5);
      } else if (!breached) {
        breached = true;
        trackPt(tr, emS, emLat, 0, E);
        trackPt(tr, landS, landLat, 0, L);
        dirH.set(L.x - E.x, 0, L.z - E.z);
        fx.splash(E, 0xffffff); fx.splash(_c.copy(E).add(_a.set(2, 0, 1)), 0xbfe8ff);
        fx.debris(_c.copy(E).setY(E.y + 1), [0x36aebf, 0xf4f4f4, 0x9ad8ff, 0x0055bf], 16, 1.3);
        ctx.audio.sfx('splash', E);
        growl(ctx.audio, att(ctx, E));
        h.visible = true;
      }
      // warning ring follows the predicted landing spot until it lands
      if (crashT < 0) {
        layOnTrack(warn, tr, landS, landLat, 0.15);
        warn.visible = true;
        const pulse = (t * 2.2) % 1;
        warn.scale.setScalar(R_SPLASH * (0.45 + 0.55 * pulse));
        warn.material.opacity = 0.85 * (1 - pulse) * smooth(0, 0.3, t);
      }
      if (breached && pool.visible) {
        const u = smooth(WARN, WARN + 0.7, t);
        pool.material.opacity = 0.8 * (1 - u);
        if (u >= 1) pool.visible = false;
      }
      // the leap: out of the road, over the track, nose-first back into it
      if (breached && rigOut) {
        const u = (t - WARN) / FLY;
        const D = Math.max(1, dirH.length());
        const base = E.y + (L.y - E.y) * u;
        const y = base - D0 + (H + D0) * 4 * u * (1 - u);
        const dy = (L.y - E.y) + (H + D0) * 4 * (1 - 2 * u);
        const pitch = Math.atan2(dy, D);
        h.position.set(E.x + dirH.x * u, y, E.z + dirH.z * u);
        h.rotation.set(-pitch, Math.atan2(dirH.x, dirH.z), Math.sin(Math.min(1, u) * Math.PI) * 0.3);
        rig.jaw.rotation.x = 0.12 + 0.55 * Math.sin(clamp(u, 0, 1) * Math.PI);
        rig.tail.rotation.y = Math.sin(t * 9) * 0.35;
        // dripping water
        for (let j = 0; j < 3; j++) {
          const f = (Math.random() - 0.4) * 22 * S * 2;
          fx.spark(h.position.x + dirH.x / D * f * Math.cos(pitch), y + Math.sin(pitch) * f, h.position.z + dirH.z / D * f * Math.cos(pitch), 0, -2, 0, 0xbfe8ff, 0.7, 22);
        }
        const noseY = y + Math.sin(pitch) * NOSE;
        if (crashT < 0 && u > 0.5 && noseY < L.y + 0.8) {
          // CRASH: giant splash
          crashT = t;
          C.copy(L);
          warn.visible = false;
          fx.splash(C, 0xffffff);
          for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; fx.splash(_c.set(C.x + Math.cos(a) * 4, C.y, C.z + Math.sin(a) * 4), j % 2 ? 0xbfe8ff : 0x9ad8ff); }
          fx.debris(_c.copy(C).setY(C.y + 1), [0x36aebf, 0xf4f4f4, 0x9ad8ff, 0x0055bf], 30, 1.6);
          layOnTrack(wave, tr, landS, landLat, 0);
          layOnTrack(foam, tr, landS, landLat, 0.2);
          layOnTrack(puddle, tr, landS, landLat, 0.1);
          wave.visible = foam.visible = puddle.visible = true;
          const a = Math.max(0.4, att(ctx, C));
          ctx.audio.sfx('splash', C); ctx.audio.sfx('crash', C);
          if (ctx.audio.ctx) { ctx.audio.noiseHit(1.1, { vol: 0.5 * a, freq: 500, type: 'lowpass', sweep: 0.4 }); ctx.audio.tone(60, 0.8, { type: 'sine', vol: 0.35 * a, slide: 0.5 }); }
          shakeCams(race, C, 60, 1.3);
        }
        if (u > 1.25) { h.visible = false; give('mosa', rig); rigOut = false; }
      }
      if (crashT >= 0) {
        const tc = t - crashT;
        // the splash wave rolls outwards, spinning out everyone it reaches
        const w = smooth(0, WAVE, tc);
        const rw = 2 + (R_SPLASH - 2) * w;
        wave.visible = tc < WAVE + 0.3;
        if (wave.visible) {
          wave.scale.set(rw, 4.2 * (1 - w) + 0.4, rw);
          wave.material.opacity = 0.75 * (1 - smooth(WAVE * 0.6, WAVE + 0.3, tc));
          foam.scale.setScalar(rw + 1);
          foam.material.opacity = 0.9 * (1 - w);
          for (let j = 0; j < 6; j++) {
            const a = Math.random() * TAU;
            fx.puff(C.x + Math.cos(a) * rw, C.y + 0.4, C.z + Math.sin(a) * rw, Math.cos(a) * 6, 4 + Math.random() * 6, Math.sin(a) * 6, j % 2 ? 0xffffff : 0xbfe8ff, 0.8);
          }
        } else foam.visible = false;
        // puddle fades in under the wave, lingers, then dries up
        const pa = smooth(0, 0.3, tc) * (1 - smooth(PUDDLE - 0.8, PUDDLE, tc));
        pMat.opacity = 0.72 * pa; tMat.opacity = 0.75 * pa;
        if (Math.random() < 0.08) fx.puff(C.x + (Math.random() - 0.5) * R_PUDDLE, C.y + 0.2, C.z + (Math.random() - 0.5) * R_PUDDLE, 0, 1.5, 0, 0xe8f6ff, 0.4);
        for (const o of race.karts) {
          if (o === k || o.respawn > 0) continue;
          const dx = o.pos.x - C.x, dz = o.pos.z - C.z, d2 = dx * dx + dz * dz;
          if (Math.abs(o.pos.y - C.y) > 5) continue;
          if (tc < WAVE + 0.1 && !hitSet.has(o) && d2 < rw * rw) {
            hitSet.add(o);
            ctx.hit(o, 'spin', k, 'mosabreach');
          } else if (tc > 0.3 && tc < PUDDLE - 0.5 && !wetSet.has(o) && o.grounded && d2 < (R_PUDDLE - 0.6) ** 2 && o.invuln <= 0) {
            wetSet.add(o);
            ctx.hit(o, 'spin', k, 'mosapuddle');
          }
        }
        if (tc > PUDDLE) return false;
      }
      return t < 12;
    },
    // AI drivers steer around the landing zone and the puddle
    danger(p, r) {
      if (crashT < 0) return breached || t > 0.3 ? Math.hypot(p.x - L.x, p.z - L.z) < R_SPLASH * 0.7 + r : false;
      return t - crashT < PUDDLE - 0.5 && Math.hypot(p.x - C.x, p.z - C.z) < R_PUDDLE + r;
    },
    dispose() {
      if (rigOut) give('mosa', rig);
      rigOut = false;
      for (const m of [warn, pool, wave, foam]) { m.removeFromParent(); m.material.dispose(); }
      puddle.removeFromParent(); pMat.dispose(); tMat.dispose();
    },
  };
}

// ======================================================================================
const ICON_REX = '<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round">'
  + '<path d="M4 60V34l6-10h22l10 3v9H22l-4 4v20z" fill="#7a5a3c"/>'
  + '<path d="M20 42l4-2h14l4 6-4 5H24z" fill="#7a5a3c"/>'
  + '<path d="M22 36h18M24 46h14" stroke="#d04a4a" stroke-width="3"/></g>'
  + '<path d="M24 36l2 4 2-4 2 4 2-4 2 4 2-4M26 46l2-3 2 3 2-3 2 3 2-3" stroke="#fff" stroke-width="2" fill="none"/>'
  + '<rect x="14" y="26" width="6" height="4" fill="#ffa020" stroke="#1b2a34" stroke-width="1.5"/>'
  + '<path d="M48 26q6 8 0 16M54 20q10 14 0 28M60 15q12 19 0 38" stroke="#ff9a1a" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
const raptorHead = (x, y, body, stripe) => `<g transform="translate(${x} ${y})" stroke="#1b2a34" stroke-width="2.5" stroke-linejoin="round">`
  + `<path d="M0 20V8l6-6h12l14 5v6l-10 2-2 3H8v4z" fill="${body}"/><path d="M6 5h12l12 4" stroke="${stripe}" stroke-width="3" fill="none"/>`
  + '<rect x="11" y="7" width="4" height="3" fill="#f2cd37" stroke-width="1.2"/><path d="M20 15l1 2 1-2 1 2 1-2" stroke="#fff" stroke-width="1.4" fill="none"/></g>';
const ICON_RAPTORS = '<svg viewBox="0 0 64 64">' + raptorHead(2, 38, '#5d6a3e', '#1b2a1a') + raptorHead(28, 30, '#4f7a78', '#2f4a48') + raptorHead(12, 6, '#7d8a8a', '#2a5ab8') + '</svg>';
const ICON_MOSA = '<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round">'
  + '<path d="M14 52L26 18l16-12 8 4-6 14 -8 4-10 24z" fill="#3a4a58"/>'
  + '<path d="M40 24l12 2-4 6-14 0z" fill="#d8dcd0"/>'
  + '<path d="M2 56q8-8 16 0t16 0 16 0 14 0v8H2z" fill="#36aebf"/></g>'
  + '<path d="M38 24l2 3 2-3 2 3 2-3 2 3" stroke="#fff" stroke-width="2" fill="none"/>'
  + '<rect x="38" y="10" width="5" height="3" fill="#f2cd37" stroke="#1b2a34" stroke-width="1.2"/>'
  + '<g fill="#bfe8ff" stroke="#1b2a34" stroke-width="1.5"><circle cx="8" cy="44" r="3"/><circle cx="54" cy="40" r="3"/><circle cx="58" cy="50" r="2"/><circle cx="12" cy="36" r="2"/></g></svg>';

// a CPU holding the Roar lines up behind a nearby rival; a tiny watcher clears the aim
function aimRoar(k, ctx, o) {
  if (k.aimAt === o) return;
  if (k.aimAt && !k._jpAim) return;   // someone else is steering this CPU
  k.aimAt = o;
  if (k._jpAim) return;
  k._jpAim = true;
  let t = 0;
  ctx.spawn({
    jurassic: true,
    update(dt) { t += dt; return t < 5 && k.item === 'rexroar' && !!k.aimAt; },
    dispose() { if (k._jpAim) { k.aimAt = null; k._jpAim = false; } },
  });
}
function roarAI(k, ctx) {
  const ahead = ctx.ahead(k, 4).filter(live);
  if (ahead.some((o) => coneHas(k, o)) || ctx.race.items.proj.some((p) => p.owner !== k && p.pos.distanceTo(k.pos) < 22)) return true;
  const o = ahead.find((a) => a.pos.distanceTo(k.pos) < 40);
  if (o) aimRoar(k, ctx, o);
  return false;
}
// sample meshes for shader warm-up (made once) and the pooled rigs built ahead of time
let SAMPLES = null;
function prewarm() {
  for (const key of ['rex', 'mosa', 'raptor:blue', 'raptor:charlie', 'raptor:delta']) give(key, take(key));
  if (!SAMPLES) {
    SAMPLES = [new THREE.Mesh(GEO.torus, glow(0xffffff, 0.5)), new THREE.Mesh(GEO.cone, glow(0xffffff, 0.5, false)), new THREE.Mesh(GEO.disc, water(0.5)),
      new THREE.Mesh(GEO.stud, new THREE.MeshStandardMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.5, roughness: 0.1, emissive: 0x2a6aa0, emissiveIntensity: 0.4, depthWrite: false }))];
  }
  return SAMPLES;
}

const coneHas = (k, o, R = 28) => {
  const dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z, fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
  const al = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
  return al > 2 && al < R && lat < 3.5 + al * 0.4 && Math.abs(o.pos.y - k.pos.y) < 6;
};

export default [
  {
    id: 'rexroar', name: 'T. rex Roar', color: '#c8862a', icon: ICON_REX, gesture: 'use',
    help: 'A giant T. rex head bursts up behind you, gobbles anything chasing you and ROARS, spinning out every kart in front of you.',
    odds: [4, 4, 3, 2, 1],
    ai: roarAI,
    prewarm,
    use(k, ctx) {
      if (k._jpAim) { k.aimAt = null; k._jpAim = false; }
      ctx.spawn(rexRoar(k, ctx));
    },
  },
  {
    id: 'raptorpack', name: 'Raptor Pack', color: '#2a5ab8', icon: ICON_RAPTORS, gesture: 'throwF',
    help: 'Blue, Charlie and Delta sprint up the track, each hunting down a different kart ahead of you and pouncing on it.',
    odds: [1, 2, 4, 4, 3],
    ai: (k, ctx) => {
      const a = ctx.ahead(k, 1)[0];
      if (a) return a.raceDist - k.raceDist < 200;
      const b = ctx.behind(k, 1)[0];
      return !!b && k.raceDist - b.raceDist < 60;
    },
    use(k, ctx) { raptorPack(k, ctx); },
  },
  {
    id: 'mosabreach', name: 'Mosasaurus Breach', color: '#36aebf', icon: ICON_MOSA, gesture: 'use',
    help: 'The Mosasaurus leaps out of the road just past the kart ahead and crashes down in a huge splash that spins out everyone nearby.',
    odds: [0, 0, 1, 3, 5],
    ai: (k, ctx) => { const a = ctx.ahead(k, 1)[0]; return !!a && a.raceDist - k.raceDist > 12 && a.raceDist - k.raceDist < 400; },
    use(k, ctx) { ctx.spawn(mosaBreach(k, ctx)); },
  },
];
