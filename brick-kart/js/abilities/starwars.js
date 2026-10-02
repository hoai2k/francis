// Star Wars abilities (see ../abilities.js for the contract).
//   Force Push      – a rippling Force wave cone: lifts, spins and shoves the karts ahead aside
//                     and blows traps and projectiles off the road
//   Lightsaber Spin – a double-bladed saber whirls round your kart for 5 s: spins out anyone
//                     who touches it, bats projectiles away and slices traps in half
//   Hyperspace Jump – your kart stretches, the stars streak and you jump to lightspeed
//                     ~150 m up the track, landing safely on the road with a boost
import * as THREE from 'three';
import { BrickBuilder, C } from '../lego.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), S4 = new THREE.Vector3(), P4 = new THREE.Vector3();
const LOC = {};

// sounds are only played when the listener is near (tone/noiseHit aren't positional)
function snd(ctx, pos, fn) {
  const au = ctx.audio;
  if (!au?.ctx) return;
  const a = pos && au.att ? au.att(pos) : 1;
  if (a > 0.02) fn(au, a);
}
const chaseOf = (ctx, k) => ctx.race.cams?.find((c) => c.kart === k)?.chase;
const glow = (color, opacity = 1, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...extra });

// karts that already have a saber / jump going (one of each at a time)
const SABERS = new WeakMap();
const JUMPS = new WeakMap();
const HOLD = new WeakMap();   // AI: when a CPU first considered using its saber

// a quick additive flash (sphere + flat lens streak), its own little entity
let sphereGeo = null;
function flash(ctx, pos, color, size = 4, life = 0.4, yaw = 0) {
  sphereGeo ||= new THREE.SphereGeometry(1, 18, 12);
  const core = new THREE.Mesh(sphereGeo, glow(0xffffff, 1));
  const halo = new THREE.Mesh(sphereGeo, glow(color, 0.7));
  const flare = new THREE.Mesh(sphereGeo, glow(color, 0.9));
  const g = new THREE.Group();
  g.add(halo, core, flare);
  g.position.copy(pos);
  g.rotation.y = yaw;
  ctx.scene.add(g);
  let t = 0;
  ctx.spawn({
    name: 'sw-flash',
    update(dt) {
      t += dt;
      const f = Math.min(1, t / life), e = 1 - (1 - f) * (1 - f);
      core.scale.setScalar(size * 0.45 * (0.3 + e) * (1 - f * 0.6));
      halo.scale.setScalar(size * (0.2 + e));
      flare.scale.set(size * 3.2 * (0.3 + e), size * 0.07, size * 0.07);
      core.material.opacity = 1 - f;
      halo.material.opacity = 0.7 * (1 - f);
      flare.material.opacity = 0.9 * (1 - f) * (1 - f);
      return t < life;
    },
    dispose() { ctx.scene.remove(g); core.material.dispose(); halo.material.dispose(); flare.material.dispose(); },
  });
}

// ---- Force Push ---------------------------------------------------------------------------------
const FP_HALF = 0.6;         // half-angle of the cone (rad)
const FP_RANGE = 36;         // how far the wave travels
const FP_SPEED = 64;         // wave front speed (u/s)
let fpGeo = null, fpTex = null;
function forceAssets() {
  if (fpGeo) return;
  // a curved, slightly forward-curling wall: one sector of a cone, bottom at y = 0
  fpGeo = new THREE.CylinderGeometry(1.14, 1, 1, 22, 1, true, -FP_HALF, FP_HALF * 2).translate(0, 0.5, 0);
  // soft-edged band with ripples (additive: brightness = opacity)
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d'), img = x.createImageData(64, 64);
  for (let py = 0; py < 64; py++) for (let px = 0; px < 64; px++) {
    const u = px / 63, v = 1 - py / 63;
    const edge = Math.pow(Math.sin(Math.PI * u), 0.6);
    const prof = Math.min(1, v / 0.12) * Math.pow(1 - v, 1.3);
    const rip = 0.62 + 0.38 * Math.sin(v * Math.PI * 7 + u * 9);
    const b = Math.round(255 * Math.min(1, edge * prof * rip * 1.5));
    const o = (py * 64 + px) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = b; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  fpTex = new THREE.CanvasTexture(c);
}
function inCone(rel, f, reach, slack = 0.12) {
  const along = rel.x * f.x + rel.z * f.z;
  if (along < -1 || along > reach) return false;
  const side = rel.x * f.z - rel.z * f.x;
  return Math.abs(Math.atan2(side, Math.max(0.01, along))) < FP_HALF + slack || (along < 4 && Math.abs(side) < 3);
}
function forceTargets(k, ctx, reach = 32) {
  const f = k.forward(V3);
  return ctx.near(k.pos, reach + 2, k).filter((o) => Math.abs(o.pos.y - k.pos.y) < 5 && inCone(V1.copy(o.pos).sub(k.pos), f, reach));
}

function forcePush(k, ctx) {
  forceAssets();
  const items = ctx.race.items, tr = ctx.track, fx = ctx.fx;
  const origin = k.pos.clone(), yaw = k.yaw, f = k.forward(), side = new THREE.Vector3(f.z, 0, -f.x);
  const base = k.speed * 0.6;   // the wave rides on your speed
  // alternate solid-ish blue ripples (read on bright tracks) with additive glowing ones
  const waves = [0x2f7dff, 0xaee0ff, 0x1a55e0, 0x7fc4ff].map((col, n) => {
    const m = new THREE.Mesh(fpGeo, n % 2 ? glow(col, 0, { map: fpTex }) : new THREE.MeshBasicMaterial({ color: col, alphaMap: fpTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(origin); m.position.y += 0.1;
    m.rotation.y = yaw;
    m.visible = false;
    ctx.scene.add(m);
    return { m, delay: n * 0.07, h: 3.8 - n * 0.35, op: n % 2 ? 0.6 : 0.9 };
  });
  const hitSet = new Set(), shoves = [];
  let victims = 0;   // the wave runs out of power after a few karts
  let t = 0;
  ctx.ring(origin.clone().addScaledVector(f, 2), 4, 0x5a9bff);
  snd(ctx, origin, (au, a) => {
    au.noiseHit(0.9, { vol: 0.4 * a, freq: 260, sweep: 5, q: 0.7 });
    au.tone(95, 0.7, { vol: 0.2 * a, type: 'sine', slide: 0.45 });
    au.tone(380, 0.5, { vol: 0.05 * a, type: 'sawtooth', slide: 0.35, filter: 1200 });
  });
  const blast = (pos, colors) => {
    for (let j = 0; j < 4; j++) fx.debrisOne(pos.clone().setY(pos.y + 0.6), colors[j % colors.length], f.clone().multiplyScalar(18 + Math.random() * 12).addScaledVector(side, (Math.random() - 0.5) * 14).setY(9 + Math.random() * 7), 1);
    for (let j = 0; j < 8; j++) fx.spark(pos.x, pos.y + 1, pos.z, f.x * 20 + (Math.random() - 0.5) * 8, 3 + Math.random() * 5, f.z * 20 + (Math.random() - 0.5) * 8, 0xbfe0ff, 0.45);
  };
  return ctx.spawn({
    name: 'forcepush', kart: k,
    update(dt) {
      t += dt;
      const front = Math.min(FP_RANGE, 2 + t * (FP_SPEED + base));
      // the waves: curved walls rushing forward, rising then fading
      for (const w of waves) {
        const tt = t - w.delay;
        w.m.visible = tt > 0 && tt < 0.75;
        if (!w.m.visible) continue;
        const r = 2 + tt * (FP_SPEED + base) * (1 - tt * 0.25);
        const e = Math.min(1, tt / 0.12);
        w.m.scale.set(r, w.h * e * (1 + tt * 0.6), r);
        w.m.material.opacity = Math.min(1, tt * 8) * Math.max(0, 1 - tt / 0.75) * w.op;
      }
      // shimmering particles riding the wave front
      if (t < 0.55) for (let j = 0; j < 5; j++) {
        const a = (Math.random() - 0.5) * FP_HALF * 2 + yaw, r = front * (0.92 + Math.random() * 0.1);
        const px = origin.x + Math.sin(a) * r, pz = origin.z + Math.cos(a) * r;
        fx.spark(px, origin.y + 0.4 + Math.random() * 2.8, pz, Math.sin(a) * 26, 1 + Math.random() * 2, Math.cos(a) * 26, j % 2 ? 0xbfe0ff : 0x5a9bff, 0.35);
        if (j === 0) fx.puff(px, origin.y + 0.3, pz, Math.sin(a) * 12, 1.5, Math.cos(a) * 12, 0xcfe0ff, 0.6);
      }
      if (t < 0.7) {
        // karts the front reaches: lifted, spun and shoved aside
        for (const o of ctx.race.karts) {
          if (o === k || hitSet.has(o) || o.respawn > 0 || Math.abs(o.pos.y - origin.y) > 5) continue;
          if (victims >= 4 || !inCone(V1.copy(o.pos).sub(origin), f, front)) continue;
          hitSet.add(o);
          if (ctx.hit(o, 'spin', k, 'forcepush')) {
            victims++;
            const s = Math.sign(V1.dot(side)) || (Math.random() < 0.5 ? -1 : 1);
            shoves.push({ o, v: side.clone().multiplyScalar(s * 15).addScaledVector(f, 8), life: 0.55 });
            if (o.grounded) { o.vy = 7.5; o.grounded = false; }
            fx.pop(o.pos, 0x9ad0ff);
          }
        }
        // traps and projectiles in the cone are blown away
        for (const tp of [...items.traps]) {
          if (!inCone(V1.copy(tp.pos).sub(origin), f, front, 0.2)) continue;
          blast(tp.pos, tp.kind === 'puddle' ? [C.purple, C.magenta] : tp.kind === 'fakebox' ? [0xff6ab0, 0xffffff] : tp.kind === 'bomb' ? [C.black, C.dkgray] : [C.red, C.yellow, C.blue, C.green]);
          items.removeTrap(tp);
        }
        for (const p of items.proj) {
          if (p.owner === k || p.life <= 0 || !inCone(V1.copy(p.pos).sub(origin), f, front, 0.2) || Math.abs(p.pos.y - origin.y) > 8) continue;
          p.life = 0; p.mesh.visible = false;
          blast(p.pos, [C.white, C.ltgray]);
          fx.pop(p.pos, 0x9ad0ff);
        }
        // other packs' entities may opt in to being blown away
        for (const e of items.ents) if (e.deflect) { V2.copy(origin).addScaledVector(f, front); e.deflect(V2, Math.max(4, front * 0.55), k); }
      }
      // shoves: slide the victims sideways, but never off the road
      for (let n = shoves.length - 1; n >= 0; n--) {
        const s = shoves[n];
        s.life -= dt;
        if (s.life <= 0 || s.o.respawn > 0) { shoves.splice(n, 1); continue; }
        const dx = s.v.x * dt, dz = s.v.z * dt;
        const L = tr.locate(s.o.pos.x + dx, s.o.pos.y, s.o.pos.z + dz, s.o.loc.i ?? 0, LOC);
        if (Math.abs(L.lat) < L.hw - 1.2 || Math.abs(L.lat) < Math.abs(s.o.loc.lat ?? 0)) { s.o.pos.x += dx; s.o.pos.z += dz; }
        s.v.multiplyScalar(Math.exp(-4 * dt));
        if (Math.random() < 0.5) fx.puff(s.o.pos.x, s.o.pos.y + 0.4, s.o.pos.z, 0, 1.5, 0, 0xcfe0ff, 0.5);
      }
      return t < 0.95 || shoves.length > 0;
    },
    dispose() { for (const w of waves) { ctx.scene.remove(w.m); w.m.material.dispose(); } },
  });
}

// ---- Lightsaber Spin ------------------------------------------------------------------------------
const SABER_COLORS = [0x2f8fff, 0x33ff66, 0xff2a2a, 0xb04aff, 0x33ff66, 0x2f8fff, 0xffd02a, 0xff2a2a];
const SABER_TIME = 5;
const SABER_Y = 2.0;         // spin plane height (above the hood, at the driver's hands)
const BLADE = 3.2;           // blade length; the hilt is 1.2 long, so the saber sweeps a ~3.6 radius
let saberAssets = null;
function saberParts() {
  if (saberAssets) return saberAssets;
  // LEGO hilt along x: silver tube, black grip rings, emitter shrouds
  const b = new BrickBuilder(1);
  b.cyl(0, -0.6, 0, 0.17, 1.2, C.ltgray, { seg: 12 });
  for (const y of [-0.38, -0.18, 0.02, 0.22]) b.cyl(0, y, 0, 0.2, 0.1, C.black, { seg: 12 });
  for (const s of [-1, 1]) b.cyl(0, s > 0 ? 0.48 : -0.62, 0, 0.22, 0.14, C.dkgray, { seg: 12 });
  b.box(0.17, 0.3, -0.06, 0.06, 0.16, 0.12, C.red);
  const hilt = b.build({ shadows: false, name: 'saberHilt' });
  hilt.rotation.z = -Math.PI / 2;
  // blades are capsules from the hilt tip outwards (+x)
  const core = new THREE.CapsuleGeometry(0.09, BLADE, 4, 8).rotateZ(-Math.PI / 2).translate(BLADE / 2 + 0.6, 0, 0);
  const mid = new THREE.CapsuleGeometry(0.23, BLADE, 4, 10).rotateZ(-Math.PI / 2).translate(BLADE / 2 + 0.6, 0, 0);
  const outer = new THREE.CapsuleGeometry(0.45, BLADE + 0.2, 4, 10).rotateZ(-Math.PI / 2).translate(BLADE / 2 + 0.6, 0, 0);
  // motion trail: a flat sector behind the blade, fading with angle (vertex alpha)
  const ANG = 1.5;
  const trail = new THREE.RingGeometry(0.7, BLADE + 0.7, 28, 1, -ANG, ANG);
  const pos = trail.attributes.position, cols = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i), pos.getX(i)), r = Math.hypot(pos.getX(i), pos.getY(i));
    const v = Math.pow(Math.max(0, 1 + a / ANG), 2.2) * (0.35 + 0.65 * (r / (BLADE + 0.7)));
    cols[i * 4] = cols[i * 4 + 1] = cols[i * 4 + 2] = 1; cols[i * 4 + 3] = v;
  }
  trail.setAttribute('color', new THREE.BufferAttribute(cols, 4));
  trail.rotateX(-Math.PI / 2);
  saberAssets = { hilt, core, mid, outer, trail };
  return saberAssets;
}

function saberSpin(k, ctx) {
  const prev = SABERS.get(k);
  if (prev) { prev.extend(); return prev; }
  const A = saberParts();
  const items = ctx.race.items, fx = ctx.fx;
  const col = SABER_COLORS[Math.max(0, ctx.race.karts.indexOf(k)) % SABER_COLORS.length];
  const tint = new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.55).getHex();
  // white-hot core, a saturated trans-plastic blade (reads on bright tracks), an additive halo
  const mats = [
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false }),
    glow(tint, 0.35),
    new THREE.MeshBasicMaterial({ color: col, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }),
  ];
  const spinner = new THREE.Group();
  const blades = [];
  for (const s of [0, Math.PI]) {
    const arm = new THREE.Group();
    arm.rotation.y = s;
    const blade = new THREE.Group();
    blade.add(new THREE.Mesh(A.core, mats[0]), new THREE.Mesh(A.mid, mats[1]), new THREE.Mesh(A.outer, mats[2]));
    const trail = new THREE.Mesh(A.trail, mats[3]);
    arm.add(blade, trail);
    spinner.add(arm);
    blades.push({ blade, trail });
  }
  spinner.add(A.hilt.clone());
  spinner.position.y = SABER_Y;
  spinner.rotation.z = 0.06;
  k.model.root.add(spinner);
  const R = BLADE + 0.6;
  const cool = new Map();
  let t = 0, life = SABER_TIME, hum = 0, ended = false;
  snd(ctx, k.pos, (au, a) => {
    au.tone(70, 0.7, { vol: 0.22 * a, type: 'sawtooth', slide: 2.2, filter: 700 });
    au.noiseHit(0.45, { vol: 0.25 * a, freq: 2400, sweep: 0.25, q: 1.5 });
    au.tone(150, 0.9, { vol: 0.08 * a, type: 'square', slide: 0.8, filter: 500, at: 0.2 });
  });
  const clash = (p, c2 = col) => {
    for (let j = 0; j < 14; j++) fx.spark(p.x, p.y, p.z, (Math.random() - 0.5) * 18, Math.random() * 10, (Math.random() - 0.5) * 18, j % 3 ? 0xffffff : c2, 0.3 + Math.random() * 0.2, 25);
  };
  const ent = {
    name: 'saberspin', kart: k,
    extend() { life = Math.max(life, t + SABER_TIME); },
    update(dt) {
      t += dt;
      const gone = k.respawn > 0 || k.wreckTime > 0 || !k.model.root.parent;
      if (gone && !ended) { ended = true; life = Math.min(life, t); }
      // ignite / spin / retract
      const len = Math.min(1, t / 0.22) * Math.min(1, Math.max(0, (life + 0.25 - t) / 0.25));
      spinner.rotation.y += dt * 15;
      const flick = 0.9 + Math.sin(t * 53) * 0.06 + Math.sin(t * 31) * 0.04;
      for (const b of blades) { b.blade.scale.set(Math.max(0.001, len), flick, flick); b.trail.scale.set(Math.max(0.001, len), 1, Math.max(0.001, len)); }
      mats[2].opacity = 0.35 * flick;
      if (t > life + 0.25 || (gone && t > life)) return false;
      if (len < 0.3 || gone || k.ghostTime > 0) return true;   // nothing to cut while in hyperspace / ghosted
      // hum
      hum -= dt;
      if (hum <= 0) { hum = 0.45; snd(ctx, k.pos, (au, a) => au.tone(92 + Math.random() * 8, 0.5, { vol: 0.06 * a, type: 'sawtooth', filter: 380 })); }
      const reach = R * len * (k.megaScale || 1);
      // blade-tip sparks
      if (Math.random() < 0.5) {
        const a = spinner.rotation.y + (Math.random() < 0.5 ? 0 : Math.PI) + k.model.root.rotation.y;
        fx.spark(k.pos.x + Math.cos(a) * reach, k.pos.y + SABER_Y, k.pos.z - Math.sin(a) * reach, 0, 1, 0, col, 0.25);
      }
      // anyone who touches the blade spins out
      for (const [o, c] of cool) if (c < t) cool.delete(o);
      for (const o of ctx.race.karts) {
        if (o === k || o.respawn > 0 || cool.has(o)) continue;
        const dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z;
        const rr = reach + 0.9 * (o.megaScale || 1);
        if (dx * dx + dz * dz > rr * rr || Math.abs(o.pos.y - k.pos.y) > 2.6) continue;
        cool.set(o, t + 1.2);
        if (ctx.hit(o, 'spin', k, 'saberspin')) {
          V1.copy(o.pos).add(k.pos).multiplyScalar(0.5).setY(k.pos.y + 1.3);
          clash(V1);
          snd(ctx, V1, (au, a) => { au.noiseHit(0.18, { vol: 0.35 * a, freq: 3200, q: 3 }); au.tone(1300, 0.18, { vol: 0.1 * a, type: 'sawtooth', slide: 0.4, filter: 4000 }); });
        }
      }
      // projectiles are batted away (bouncers / freeze bricks / boomerangs fly back out) or cut down
      for (const p of items.proj) {
        if (p.life <= 0 || p.owner === k) continue;
        const pr = reach + 1.2 + (p.speed || 0) * dt + (p.type === 'seeker' ? 2.5 : 0);
        const dx = p.pos.x - k.pos.x, dz = p.pos.z - k.pos.z;
        if (dx * dx + dz * dz > pr * pr || Math.abs(p.pos.y - (k.pos.y + 1)) > (p.type === 'seeker' ? 6 : 3)) continue;
        if (p.type === 'seeker' && !p.diving) continue;
        clash(p.pos, 0xffd060);
        if (p.type === 'cannon' || p.type === 'ice' || p.type === 'boomerang') {
          p.yaw = Math.atan2(dx, dz); p.owner = k; p.safe = 0.6; p.life = Math.max(p.life, 2.5);
          if (p.hitSet) p.hitSet.clear();
          if (p.t !== undefined) p.t = 0;
          const d = Math.hypot(dx, dz) || 1;
          p.pos.x = k.pos.x + dx / d * (reach + 1.6); p.pos.z = k.pos.z + dz / d * (reach + 1.6);
        } else { p.life = 0; p.mesh.visible = false; fx.explosion(p.pos); }
        snd(ctx, p.pos, (au, a) => au.tone(900, 0.2, { vol: 0.12 * a, type: 'sawtooth', slide: 0.35, filter: 3000 }));
      }
      // traps in the way are sliced apart
      for (const tp of items.traps) {
        if (tp.kind === 'puddle' || tp.air) continue;
        const dx = tp.pos.x - k.pos.x, dz = tp.pos.z - k.pos.z;
        if (dx * dx + dz * dz > (reach + 1) ** 2 || Math.abs(tp.pos.y - k.pos.y) > 3) continue;
        clash(V1.copy(tp.pos).setY(tp.pos.y + 0.8));
        fx.debris(tp.pos, tp.kind === 'fakebox' ? [0xff6ab0, 0xffffff] : tp.kind === 'bomb' ? [C.black, C.dkgray] : [C.red, C.yellow, C.blue], 6, 0.8);
        items.removeTrap(tp);
        snd(ctx, tp.pos, (au, a) => au.noiseHit(0.2, { vol: 0.3 * a, freq: 2600, q: 2 }));
        break;   // the list changed; the rest wait a frame
      }
      for (const e of items.ents) if (e !== ent && e.deflect) e.deflect(k.pos, reach + 1, k);
      return true;
    },
    dispose() {
      spinner.removeFromParent();
      for (const m of mats) m.dispose();
      if (SABERS.get(k) === ent) SABERS.delete(k);
    },
  };
  SABERS.set(k, ent);
  return ctx.spawn(ent);
}

// ---- Hyperspace Jump ------------------------------------------------------------------------------
const HJ_CHARGE = 0.55, HJ_WARP = 0.6, HJ_ARRIVE = 0.4;
const STREAKS = 44;
let streakGeo = null;
function hyperJump(k, ctx) {
  if (JUMPS.has(k)) return null;
  const tr = ctx.track, N = tr.N, fx = ctx.fx, race = ctx.race;
  streakGeo ||= new THREE.BoxGeometry(1, 1, 1);
  // where to come out: ~150-170 samples ahead (further for karts further back), on real road
  const n = race.karts.length;
  const rankFrac = n > 1 ? (k.rank - 1) / (n - 1) : 1;
  const i0 = k.loc.i ?? 0;
  const lat0 = k.loc.lat ?? 0;
  const want = i0 + 150 + Math.round(20 * rankFrac);
  let land = null;
  for (let o = 0; o < 240 && !land; o += 2) {
    const i = tr.wrap(want + o), hw = tr.HW[i];
    for (const l of [Math.max(-0.45, Math.min(0.45, lat0 / (hw || 1))) * hw, 0, -0.3 * hw, 0.3 * hw]) {
      if (k.spawnOk(i, l)) { land = { i, lat: l }; break; }
    }
  }
  land ||= { i: tr.wrap(want), lat: 0 };
  const dist = (land.i - i0 + N) % N;
  // streak tunnel: thin glowing bars around the kart's line of travel
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const tunnel = new THREE.InstancedMesh(streakGeo, mat, STREAKS);
  tunnel.frustumCulled = false;
  const sd = [];
  const cc = new THREE.Color();
  for (let j = 0; j < STREAKS; j++) {
    const a = -0.35 + Math.random() * (Math.PI + 0.7);
    sd.push({ x: Math.cos(a) * (2.6 + Math.random() * 7), y: 1.1 + Math.sin(a) * (2 + Math.random() * 6), z: (Math.random() - 0.5) * 80, sp: 0.7 + Math.random() * 0.6, w: 0.08 + Math.random() * 0.1 });
    tunnel.setColorAt(j, cc.set([0xffffff, 0xbfe4ff, 0x7fc4ff, 0xdff0ff][j % 4]));
  }
  ctx.scene.add(tunnel);
  // a blue-white glow shell that wraps the kart while it charges
  sphereGeo ||= new THREE.SphereGeometry(1, 18, 12);
  const shell = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0, depthWrite: false }));
  shell.position.y = 1; shell.scale.set(1.9, 1.35, 2.5);
  k.model.root.add(shell);
  let t = 0, phase = 0, lastX = k.pos.x, lastY = k.pos.y, lastZ = k.pos.z;
  const root = k.model.root;
  snd(ctx, k.pos, (au, a) => {
    au.tone(70, HJ_CHARGE + 0.1, { vol: 0.16 * a, type: 'sawtooth', slide: 9, filter: 2400 });
    au.tone(140, HJ_CHARGE + 0.1, { vol: 0.07 * a, type: 'square', slide: 9, filter: 2000 });
    au.noiseHit(HJ_CHARGE, { vol: 0.25 * a, freq: 300, sweep: 12, q: 1.2 });
  });
  const boom = (p) => snd(ctx, p, (au, a) => {
    au.noiseHit(0.5, { vol: 0.45 * a, freq: 500, type: 'lowpass' });
    au.tone(1900, 0.35, { vol: 0.1 * a, type: 'sine', slide: 0.15 });
    au.tone(60, 0.4, { vol: 0.25 * a, type: 'sine', slide: 0.5 });
  });
  const burst = (p, dir, n2) => {
    for (let j = 0; j < n2; j++) {
      const a = Math.random() * 6.28, b = Math.random() * 3.14, s = 6 + Math.random() * 16;
      fx.spark(p.x, p.y + 1, p.z, Math.cos(a) * Math.sin(b) * s + dir.x * 20, Math.abs(Math.cos(b)) * s * 0.6, Math.sin(a) * Math.sin(b) * s + dir.z * 20, j % 3 ? 0xdff0ff : 0x5aa8ff, 0.45 + Math.random() * 0.3);
    }
    fx.debris(p, [0xffffff, 0x9ad8ff, C.mdblue], 8, 0.8);
  };
  const ent = {
    name: 'hyperjump', kart: k,
    update(dt) {
      t += dt;
      // a respawn cancels the jump (the crane wins)
      if (k.respawn > 0 || !root.parent) return false;
      const chase = chaseOf(ctx, k);
      let stretch = 1, tunnelLen = 0, tunnelOp = 0;
      if (phase === 0) {
        const f = Math.min(1, t / HJ_CHARGE);
        stretch = 1 + 1.5 * f * f;
        tunnelLen = 0.5 + 4 * f * f; tunnelOp = f * f * 0.8;
        shell.material.opacity = 0.08 + 0.27 * f;
        k.model.body.visible = true;     // no invulnerability blinking while charging
        k.invuln = Math.max(k.invuln, 0.15);
        if (Math.random() < 0.8) { const fw = k.forward(V1); fx.spark(k.pos.x - fw.x * 2, k.pos.y + 1, k.pos.z - fw.z * 2, -fw.x * 14 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3, -fw.z * 14 + (Math.random() - 0.5) * 4, 0xbfe4ff, 0.3); }
        if (chase) chase.fov = Math.min(chase.fov, 74 - 10 * f);   // a little zoom-in before the kick
        if (t >= HJ_CHARGE) {
          phase = 1;
          const fw = k.forward(V1);
          flash(ctx, V2.copy(k.pos).setY(k.pos.y + 1.2), 0x7fc4ff, 3.2, 0.4, k.yaw + Math.PI / 2);
          ctx.ring(k.pos, 12, 0x9ad8ff);
          burst(k.pos, fw, 30);
          boom(k.pos);
          if (k.human) race.flash(0xdff0ff);
          shell.visible = false;
          k.cancelDrift();
          if (k.gliding) k.setGliding(false);
          lastX = k.pos.x; lastY = k.pos.y; lastZ = k.pos.z;
        }
      }
      if (phase === 1) {
        const u = Math.min(1, (t - HJ_CHARGE) / HJ_WARP);
        const s = u * u * (3 - 2 * u);
        const i = tr.wrap(i0 + Math.round(dist * s));
        const hw = tr.HW[i];
        k.place(i, Math.max(-hw * 0.6, Math.min(hw * 0.6, lat0 + (land.lat - lat0) * s)));
        k.speed = k.topSpeed * 1.25;
        k.ghostTime = Math.max(k.ghostTime, 0.2);   // untouchable and no bumping while in hyperspace
        root.visible = false;
        tunnelLen = 16; tunnelOp = 1;
        // a light trail streaks along the road
        const nx = k.pos.x, ny = k.pos.y + 1, nz = k.pos.z;
        const seg = Math.min(14, Math.ceil(Math.hypot(nx - lastX, nz - lastZ) / 1.4));
        for (let j = 0; j < seg; j++) {
          const f = j / seg;
          fx.spark(lastX + (nx - lastX) * f + (Math.random() - 0.5) * 0.6, lastY + 1 + (ny - lastY - 1) * f + (Math.random() - 0.5) * 0.6, lastZ + (nz - lastZ) * f + (Math.random() - 0.5) * 0.6, 0, 0, 0, j % 2 ? 0xffffff : 0x8fd0ff, 0.55);
        }
        lastX = nx; lastY = ny - 1; lastZ = nz;
        if (chase) { chase.fov = 70 + 46 * Math.sin(Math.min(1, u * 1.4) * Math.PI / 2); chase.shake = Math.max(chase.shake, 0.25); }
        if (u >= 1) {
          phase = 2;
          k.place(land.i, land.lat);
          k.speed = k.topSpeed * 1.3;
          k.boost(1.4);
          k.invuln = Math.max(k.invuln, 0.6);
          const fw = k.forward(V1);
          flash(ctx, V2.copy(k.pos).addScaledVector(fw, 3).setY(k.pos.y + 1.2), 0x9ad8ff, 3, 0.35, k.yaw + Math.PI / 2);
          ctx.ring(k.pos, 14, 0x9ad8ff);
          burst(k.pos.clone().addScaledVector(fw, 2), fw, 34);
          boom(k.pos);
          if (chase) { chase.init = false; chase.fov = 112; }
        }
      }
      if (phase === 2) {
        const u = Math.min(1, (t - HJ_CHARGE - HJ_WARP) / HJ_ARRIVE);
        stretch = 1 + 1.6 * Math.pow(1 - u, 3) - Math.sin(u * Math.PI) * 0.12;
        tunnelLen = 16 * (1 - u); tunnelOp = 1 - u;
        k.model.body.visible = true;
        if (u >= 1) return false;
      }
      // stretch the kart along its length (the kart resets its scale every frame)
      if (phase !== 1 && root.parent) {
        const sq = 1 / Math.sqrt(stretch);
        root.scale.x *= sq; root.scale.y *= Math.max(0.7, sq); root.scale.z *= stretch;
      }
      // streaks rush past
      mat.opacity = tunnelOp;
      tunnel.visible = tunnelOp > 0.01;
      if (tunnel.visible) {
        tunnel.position.copy(k.pos);
        tunnel.rotation.y = k.yaw;
        tunnel.updateMatrixWorld();
        const vel = phase === 1 ? 260 : 60;
        for (let j = 0; j < STREAKS; j++) {
          const d = sd[j];
          d.z -= vel * d.sp * dt;
          if (d.z < -40) d.z += 80;
          P4.set(d.x, d.y, d.z);
          S4.set(d.w, d.w, tunnelLen * d.sp + 0.3);
          tunnel.setMatrixAt(j, M4.compose(P4, Q4.identity(), S4));
        }
        tunnel.instanceMatrix.needsUpdate = true;
      }
      return true;
    },
    dispose() {
      ctx.scene.remove(tunnel);
      tunnel.dispose(); mat.dispose();
      shell.removeFromParent(); shell.material.dispose();
      if (!root.visible && k.respawn <= 0) root.visible = true;
      if (JUMPS.get(k) === ent) JUMPS.delete(k);
    },
  };
  JUMPS.set(k, ent);
  return ctx.spawn(ent);
}

// ---- icons (LEGO style, viewBox 0 0 64 64) ---------------------------------------------------------
const ICON_PUSH = '<svg viewBox="0 0 64 64"><path d="M30 10q22 22 0 44" stroke="#cfe6ff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/><path d="M40 6q26 26 0 52" stroke="#7fb8ff" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M51 12q18 20 0 40" stroke="#36aebf" stroke-width="4" fill="none" stroke-linecap="round"/><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><rect x="4" y="40" width="12" height="16" rx="2" fill="#6c6e68"/><path d="M10 42V22a3.5 3.5 0 0 1 7 0v-6a3.5 3.5 0 0 1 7 0v2a3.5 3.5 0 0 1 7 0v4a3.5 3.5 0 0 1 7 0v18q0 10-10 12H16q-6-2-6-10z" fill="#f2cd37"/></g><path d="M17 22v12M24 18v14M31 22v12" stroke="#1b2a34" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>';
const ICON_SABER = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="none" stroke="#33ff66" stroke-opacity=".35" stroke-width="7"/><path d="M12 18A25 25 0 0 1 32 7M52 46A25 25 0 0 1 32 57" stroke="#33ff66" stroke-width="3" fill="none" stroke-linecap="round"/><g transform="rotate(-35 32 32)"><rect x="2" y="28" width="24" height="8" rx="4" fill="#d8ffe0" stroke="#33ff66" stroke-width="3.5"/><rect x="38" y="28" width="24" height="8" rx="4" fill="#d8ffe0" stroke="#33ff66" stroke-width="3.5"/><rect x="22" y="26" width="20" height="12" rx="2.5" fill="#a0a5a9" stroke="#1b2a34" stroke-width="3"/><path d="M27 27v10M32 27v10M37 27v10" stroke="#1b2a34" stroke-width="2.5"/></g></svg>';
const ICON_HYPER = (() => {
  let s = '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#0b1a3a" stroke="#1b2a34" stroke-width="3"/><g stroke-linecap="round">';
  for (let j = 0; j < 14; j++) {
    const a = j / 14 * Math.PI * 2 + 0.2, r0 = 7 + (j % 3) * 2, r1 = 19 + (j % 2) * 6 + (j % 3);
    const f = (v) => v.toFixed(1);
    s += `<path d="M${f(32 + Math.cos(a) * r0)} ${f(32 + Math.sin(a) * r0)}L${f(32 + Math.cos(a) * r1)} ${f(32 + Math.sin(a) * r1)}" stroke="${j % 2 ? '#7fc4ff' : '#ffffff'}" stroke-width="${j % 3 ? 3 : 4}"/>`;
  }
  return s + '</g><circle cx="32" cy="32" r="5" fill="#ffffff" stroke="#7fc4ff" stroke-width="2"/></svg>';
})();

export default [
  {
    id: 'forcepush', name: 'Force Push', color: '#7fb8ff', icon: ICON_PUSH,
    help: 'A rippling Force wave that lifts, spins and shoves aside the karts just ahead of you and blows traps and shots off the road.',
    odds: [3, 4, 4, 3, 2],
    gesture: 'use',
    // push when someone (or something) is in the cone just ahead
    ai: (k, ctx) => forceTargets(k, ctx, 30).length > 0
      || ctx.race.items.traps.some((t) => t.owner !== k && inCone(V1.copy(t.pos).sub(k.pos), k.forward(V3), 22))
      || ctx.race.items.proj.some((p) => p.owner !== k && inCone(V1.copy(p.pos).sub(k.pos), k.forward(V3), 26)),
    use(k, ctx) { forcePush(k, ctx); },
  },
  {
    id: 'saberspin', name: 'Lightsaber Spin', color: '#33ff66', icon: ICON_SABER,
    help: 'A double-bladed lightsaber whirls round your kart for 5 seconds, spinning out anyone it touches and batting away shots.',
    odds: [3, 3, 3, 2, 1],
    gesture: 'use',
    // ignite when a shot is incoming or a rival is alongside; otherwise after holding it a while
    ai(k, ctx) {
      const now = ctx.race.time;
      if (!HOLD.has(k)) HOLD.set(k, now);
      const threat = ctx.race.items.proj.some((p) => p.owner !== k && p.pos.distanceTo(k.pos) < 30);
      const rival = ctx.near(k.pos, 7, k).length > 0;
      const go = threat || rival || now - HOLD.get(k) > 6;
      if (go) HOLD.delete(k);
      return go;
    },
    use(k, ctx) { HOLD.delete(k); saberSpin(k, ctx); },
  },
  {
    id: 'hyperjump', name: 'Hyperspace Jump', color: '#bfe4ff', icon: ICON_HYPER,
    help: 'Punch it! Your kart stretches into a streak of light and jumps to lightspeed, warping far up the track.',
    odds: [0, 0, 0, 4, 7],
    gesture: 'use',
    // any time on the ground and in control
    ai: (k) => k.grounded && !k.stunned && k.respawn <= 0 && !k.finished,
    use(k, ctx) { hyperJump(k, ctx); },
  },
];
