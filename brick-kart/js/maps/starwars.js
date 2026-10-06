// Tatooine Podrace: a Boonta Eve podrace from Mos Espa through the dune sea
// (Jawas and their sandcrawler), Beggar's Canyon, a glide over the Sarlacc
// pit, Mos Eisley (Cad Bane, Darth Maul, the Mandalorian), the battle of Hoth
// (AT-ATs) and a Death Star trench run under the superlaser.
import { THREE, BrickBuilder, C, plastic, groundPlane, baseplateMat, canvasTexture, grandstand, arch, each, inRange, strokeTrack, disc, crossing, rock, crystal, mountain, cycleRandom } from './kit.js';
import * as P from './starwars-props.js';

const SW = P.SW;
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const Q1 = new THREE.Quaternion(), YUP = new THREE.Vector3(0, 1, 0);

function pew(ctx, pos, f = 1500, vol = 0.1) {
  const au = ctx.world.race?.audio;
  if (!au?.ctx) return;
  const a = au.att(pos);
  if (a < 0.05) return;
  au.tone(f, 0.16, { vol: vol * a, type: 'square', slide: 0.25, filter: 3200 });
}

// A kart inside [ka, kb] picked by u in [0, 1) (or null). (Karts are in grid order on every screen.)
function kartIn(ctx, ka, kb, u) {
  const r = ctx.world.race;
  if (!r) return null;
  const list = r.karts.filter((k) => k.respawn <= 0 && !k.finished && k.loc.i !== undefined && inRange(ctx.track, k.loc.i, ka, kb));
  return list.length ? list[Math.floor(u * list.length)] : null;
}

// Blaster shots: a red ring marks where the bolt will land (leading a kart in
// range), then the bolt flies from the shooter's muzzle and pops.
function blaster(ctx, o) {
  const tr = ctx.track;
  const color = o.color ?? 0xff2a1a;
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.6, 6).rotateX(Math.PI / 2), P.glow(color, 3.5));
  const mk = new THREE.Group();
  const mm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });
  mk.add(new THREE.Mesh(new THREE.RingGeometry((o.radius ?? 3) - 0.7, o.radius ?? 3, 24).rotateX(-Math.PI / 2), mm));
  mk.add(new THREE.Mesh(new THREE.CircleGeometry(0.7, 12).rotateX(-Math.PI / 2), mm));
  bolt.visible = mk.visible = false;
  ctx.group.add(bolt, mk);
  const aimT = o.aim ?? 1.1, FLY = 0.25, R = o.radius ?? 3;
  const target = new THREE.Vector3(), from = new THREE.Vector3();
  // One shot per cycle (wait, aim, fly, burst), timed off the hazard clock, with its choices hashed
  // from the cycle number: the same shots on every online screen.
  const BOOM = 0.32, C = o.period + aimT + FLY + BOOM, off = o.offset ?? 0, rnd = cycleRandom();
  let state = 0, picked = -1, shot = -1, burst = -1;
  const pick = (n) => {
    const k = kartIn(ctx, o.ka, o.kb, rnd(n, 0));
    if (k && rnd(n, 1) < 0.8) {
      const lead = Math.max(0, k.speed) * (aimT + FLY) * (0.8 + rnd(n, 2) * 0.3);
      target.set(k.pos.x + Math.sin(k.moveYaw) * lead, 0, k.pos.z + Math.cos(k.moveYaw) * lead);
      const loc = tr.locate(target.x, k.pos.y, target.z, k.loc.i, {});
      if (loc.gap || Math.abs(loc.lat) > loc.hw + 2) { tr.at(loc.i, Math.max(-loc.hw, Math.min(loc.hw, loc.lat)), 0.1, target); } else target.y = loc.y + 0.1;
    } else {
      const ia = tr.kToIndex(o.ka), ib = tr.kToIndex(o.kb);
      const i = tr.wrap(ia + Math.floor(rnd(n, 3) * ((ib - ia + tr.N) % tr.N)));
      tr.at(i, (rnd(n, 4) - 0.5) * 1.6 * tr.HW[i], 0.1, target);
    }
  };
  return {
    update(dt, t) {
      const x = t + off, n = Math.floor(x / C), p = x - n * C;
      if (p < o.period) { state = 0; bolt.visible = mk.visible = false; return; }
      if (picked !== n) { picked = n; pick(n); mk.position.copy(target); }
      if (p < o.period + aimT) {
        state = 1; mk.visible = true;
        const f = (p - o.period) / aimT;
        mm.opacity = 0.35 + 0.55 * Math.abs(Math.sin(t * (8 + f * 14)));
        mk.scale.setScalar(1.5 - f * 0.5);
        o.onAim?.(target, f);
      } else if (p < o.period + aimT + FLY) {
        state = 2;
        if (shot !== n) { shot = n; o.muzzle(from); pew(ctx, from, o.pitch ?? 1500); }
        bolt.visible = true;
        bolt.position.lerpVectors(from, target, (p - o.period - aimT) / FLY);
        bolt.lookAt(target);
      } else {
        state = 3; bolt.visible = false; mk.visible = false;
        if (burst !== n) {
          burst = n;
          const fx = ctx.world.race?.fx;
          if (fx) for (let j = 0; j < 22; j++) { const a = Math.random() * 6.28; fx.spark(target.x, target.y + 0.4, target.z, Math.cos(a) * 9, 4 + Math.random() * 8, Math.sin(a) * 9, j % 2 ? color : 0xffe0a0, 0.45, 14); }
          ctx.world.race?.audio.sfx('bump', target);
        }
      }
    },
    test(p) { return state === 3 && Math.abs(p.y - target.y) < 4 && Math.hypot(p.x - target.x, p.z - target.z) < R ? (o.kind ?? 'spin') : null; },
    near(p, r) { return (state === 1 || state === 3) && Math.hypot(p.x - target.x, p.z - target.z) < R + r; },
  };
}

// Darth Maul whirling his double-bladed saber in the middle of the plaza.
function maulSpinner(ctx, k) {
  const tr = ctx.track, i = tr.kToIndex(k);
  const c = tr.at(i, 0, 0);
  const m = P.maul(2.8, 11);
  m.position.copy(c);
  ctx.group.add(m);
  // plinth so it reads as a stage
  ctx.b.cyl(c.x, c.y - 0.1, c.z, 2.2, 0.35, SW.stone2, { seg: 16 });
  ctx.obstacle(c.x, c.z, 1.9, 9);
  const { hz, tilt, L } = m.userData.saber;
  const reach = L * Math.cos(tilt);
  let ang = 0;
  const hum = { t: 0 };
  return {
    update(dt, t) {
      ang = 1.45 * t; m.rotation.y = ang;   // (a function of the hazard clock: the same on every screen) m.position.y = c.y + Math.abs(Math.sin(t * 2.9)) * 0.15;
      hum.t -= dt;
      if (hum.t < 0) { hum.t = 2.2; const au = ctx.world.race?.audio; if (au?.ctx) { const a = au.att(c); if (a > 0.05) au.tone(110, 0.5, { vol: 0.07 * a, type: 'sawtooth', slide: 1.3, filter: 600 }); } }
    },
    test(p) {
      if (Math.abs(p.y - c.y) > 3) return null;
      const dx = p.x - c.x, dz = p.z - c.z;
      const cs = Math.cos(ang), sn = Math.sin(ang);
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      return lx > 4.6 && lx < reach + 1 && Math.abs(lz - hz) < 1.7 ? 'spin' : null;
    },
    near(p, r) { return Math.hypot(p.x - c.x, p.z - c.z) < reach + r; },
  };
}

// AT-AT walking back and forth across the road: stomping feet and chin-gun bolts.
function walker(ctx, { k, len = 46, speed = 2.6, s = 1.2, offset = 0, dir = 1 }) {
  const tr = ctx.track, i = tr.kToIndex(k);
  const w = P.atat(s);
  ctx.group.add(w.root);
  const c = tr.at(i, 0, 0); c.y = tr.groundY;
  const rx = tr.R[i * 2], rz = tr.R[i * 2 + 1];
  const base = Math.atan2(rx, rz);
  // Where it is, which way it faces and its stride are functions of the hazard clock (so every
  // online screen agrees): walk across (W s), turn round (TURN s), walk back, turn round.
  const TURN = 4.5, W = 2 * len / speed, T = 2 * (W + TURN), pos0 = (offset * 2 - 1) * len;
  const ph0 = dir > 0 ? (pos0 + len) / speed : W + TURN + (len - pos0) / speed;
  let pos = pos0, yaw = dir > 0 ? base : base + Math.PI, lastT = 0;
  const feet = w.legs.map(() => ({ x: 0, z: 0, kind: null, lastU: 0 }));
  const H = w.H;
  const laser = blaster(ctx, {
    ka: k - 1.1, kb: k + 0.6, period: 2.6, aim: 1.2, kind: 'spin', radius: 3.2, pitch: 700, offset: 1 + offset * 2,
    muzzle: (out) => { const lz = 10.8 * s + 8.2 * s, ly = H + 3 * s - 2.05 * s; out.set(w.root.position.x + Math.sin(yaw) * lz, ly, w.root.position.z + Math.cos(yaw) * lz); },
    onAim: (tg) => { const a = Math.atan2(tg.x - w.root.position.x, tg.z - w.root.position.z) - yaw; let d = Math.atan2(Math.sin(a), Math.cos(a)); d = Math.max(-0.7, Math.min(0.7, d)); w.headP.rotation.y += (d - w.headP.rotation.y) * 0.1; },
  });
  // keep scenery out of the walking lane
  for (let o = -len - 10; o <= len + 10; o += 8) ctx.claim(c.x + rx * o, c.z + rz * o, 14 * s);
  return {
    update(dt, t) {
      const ph = ((ph0 + t) % T + T) % T;
      let stride = speed;
      if (ph < W) { pos = -len + ph * speed; yaw = base; }
      else if (ph < W + TURN) { pos = len; yaw = base + Math.PI * (ph - W) / TURN; stride = 0.4; }
      else if (ph < 2 * W + TURN) { pos = len - (ph - W - TURN) * speed; yaw = base + Math.PI; }
      else { pos = -len; yaw = base + Math.PI + Math.PI * (ph - 2 * W - TURN) / TURN; stride = 0.4; }
      w.step(t - lastT, stride); lastT = t;   // (the legs' phase adds up to the clock exactly)
      w.root.position.set(c.x + rx * pos, c.y, c.z + rz * pos);
      w.root.rotation.y = yaw;
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      w.legs.forEach((L, n) => {
        const f = feet[n], lz = L.z + L.dz;
        f.x = w.root.position.x + L.x * cs + lz * sn;
        f.z = w.root.position.z - L.x * sn + lz * cs;
        f.kind = L.lift > 1.2 ? null : (L.u < 0.1 || L.u > 0.95) ? 'wreck' : 'bump';
        if (L.u < f.lastU) {
          // foot lands: dust and a thud
          const fx = ctx.world.race?.fx;
          if (fx) for (let j = 0; j < 8; j++) { const a = Math.random() * 6.28; fx.puff(f.x + Math.cos(a) * 2, 0.4, f.z + Math.sin(a) * 2, Math.cos(a) * 5, 1 + Math.random() * 2, Math.sin(a) * 5, 0xffffff, 0.9); }
          V1.set(f.x, 0, f.z); ctx.world.race?.audio.sfx('wall', V1);
        }
        f.lastU = L.u;
      });
      if (laser.state !== 1) w.headP.rotation.y *= 0.98;
      laser.update(dt, t);
    },
    test(p) {
      if (p.y > tr.groundY + 4) return null;
      for (const f of feet) if (f.kind && Math.hypot(p.x - f.x, p.z - f.z) < 2.0 * s + (f.kind === 'wreck' ? 1.1 : 0)) return f.kind;
      return laser.test(p);
    },
    near(p, r) {
      for (const f of feet) if (Math.hypot(p.x - f.x, p.z - f.z) < 2.4 * s + r) return true;
      return laser.near(p, r);
    },
  };
}

// TIE fighter strafing run down the trench: a line of targets lights up on one
// lane, then the TIE screams in head-on and the shots land one after another.
function strafe(ctx, { ka, kb, period = 7, offset = 0, shots = 6 }) {
  const tr = ctx.track;
  const tie = P.tie(1.15);
  tie.visible = false;
  ctx.group.add(tie);
  const mat = new THREE.MeshBasicMaterial({ color: 0x40ff60, transparent: true, opacity: 0.8, depthWrite: false });
  const ringG = new THREE.RingGeometry(2.0, 2.7, 20).rotateX(-Math.PI / 2);
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 6).translate(0, 0.5, 0).rotateX(Math.PI / 2), P.glow(0x40ff60, 3.5));
  bolt.visible = false;
  ctx.group.add(bolt);
  const pts = [], rings = [], boom = [], offN = [];
  for (let n = 0; n < shots; n++) { const r = new THREE.Mesh(ringG, mat); r.visible = false; ctx.group.add(r); rings.push(r); pts.push(new THREE.Vector3()); boom.push(0); offN.push(0); }
  const ia = tr.kToIndex(ka), ib = tr.kToIndex(kb), span = (ib - ia + tr.N) % tr.N;
  let state = 0, d = 0, fired = 0, boltT = 0, cur = -1;
  const WARN = 1.5, SPEED = 75, PASS = (span + 130) / SPEED, CYC = period + WARN + PASS, rnd = cycleRandom();
  const fireT = offN.map(() => Infinity);
  return {
    // run n of the hazard clock: wait, light up a lane (hashed from n), fly the pass. The TIE's
    // position and each shot are functions of the clock: the same on every online screen.
    update(dt, t) {
      if (boltT > 0) { boltT -= dt; if (boltT <= 0) bolt.visible = false; }
      const x = t + offset, n = Math.floor(x / CYC), q = x - n * CYC;
      for (let k = 0; k < shots; k++) boom[k] = t >= fireT[k] && t < fireT[k] + 0.34 ? fireT[k] + 0.34 - t : 0;
      if (q < period) {
        if (state !== 0) { tie.visible = false; for (const r of rings) r.visible = false; }
        state = 0; return;
      }
      if (cur !== n) {
        cur = n; fired = 0;
        const lane = [-0.55, -0.2, 0.2, 0.55][Math.floor(rnd(n, 0) * 4)];
        for (let k = 0; k < shots; k++) {
          offN[k] = Math.round((k + 0.5) / shots * span);
          const i = tr.wrap(ib - offN[k]);
          tr.at(i, (lane + (rnd(n, 1 + k) - 0.5) * 0.15) * tr.HW[i], 0.1, pts[k]);
          rings[k].position.copy(pts[k]); rings[k].visible = true;
          fireT[k] = Infinity;
        }
      }
      if (q < period + WARN) { state = 1; tie.visible = false; mat.opacity = 0.3 + 0.5 * Math.abs(Math.sin(t * 12)); return; }
      state = 2;
      const tS = t - (q - period - WARN);
      d = -40 + SPEED * (t - tS);
      tie.visible = d <= span + 90;
      mat.opacity = 0.3 + 0.5 * Math.abs(Math.sin(t * 20));
      const i = tr.wrap(ib + 30 - Math.round(d));
      tr.at(i, 0, 7 + Math.sin(d * 0.05) * 1.5, tie.position);
      tie.rotation.set(0, tr.yawAt(i) + Math.PI, Math.sin(d * 0.03) * 0.3, 'YXZ');
      // fire at each target once the TIE is ~30 units before it
      while (fired < shots && d >= offN[fired]) {
        const k = fired++;
        fireT[k] = tS + (offN[k] + 40) / SPEED;
        boom[k] = Math.max(0, fireT[k] + 0.34 - t); rings[k].visible = false;
        bolt.position.copy(tie.position); bolt.lookAt(pts[k]); bolt.scale.set(1, 1, tie.position.distanceTo(pts[k])); bolt.visible = true; boltT = 0.07;
        const fx = ctx.world.race?.fx;
        if (fx) for (let j = 0; j < 16; j++) { const a = Math.random() * 6.28; fx.spark(pts[k].x, pts[k].y + 0.4, pts[k].z, Math.cos(a) * 8, 4 + Math.random() * 7, Math.sin(a) * 8, j % 2 ? 0x40ff60 : 0xffffff, 0.4, 14); }
        pew(ctx, pts[k], 1800, 0.08);
      }
    },
    test(p) { for (let n = 0; n < shots; n++) if (boom[n] > 0 && Math.abs(p.y - pts[n].y) < 4 && Math.hypot(p.x - pts[n].x, p.z - pts[n].z) < 2.9) return 'spin'; return null; },
    near(p, r) { if (!state) return false; for (let n = 0; n < shots; n++) if ((rings[n].visible || boom[n] > 0) && Math.hypot(p.x - pts[n].x, p.z - pts[n].z) < 2.7 + r) return true; return false; },
  };
}

// The Death Star's superlaser: tributary beams converge, a green line lights up
// across the road, then the beam sweeps from one side to the other.
function superlaser(ctx, { k, focus, dish, period = 10, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k);
  const W = tr.HW[i] + 5;
  const a = tr.at(i, -W, 0.1), b = tr.at(i, W, 0.1);
  const green = new THREE.MeshBasicMaterial({ color: 0x6aff5a, fog: false, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const core = new THREE.MeshBasicMaterial({ color: 0xb8ff9a, fog: false });
  const beam = new THREE.Group();
  const bg = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2);
  const outer = new THREE.Mesh(bg, green); outer.scale.set(5, 5, 1);
  const inner = new THREE.Mesh(bg, core); inner.scale.set(1.2, 1.2, 1);
  beam.add(outer, inner);
  beam.visible = false;
  ctx.scene.add(beam);
  // tributaries converging at the focal point
  const trib = new THREE.Group();
  for (let n = 0; n < 8; n++) {
    const m = new THREE.Mesh(bg, green);
    const ang = n / 8 * Math.PI * 2;
    V1.set(Math.cos(ang), Math.sin(ang), 0).applyQuaternion(dish.q).multiplyScalar(dish.r * 0.8).add(dish.c);
    m.position.copy(V1); m.lookAt(focus); m.scale.set(1.2, 1.2, V1.distanceTo(focus));
    trib.add(m);
  }
  trib.visible = false;
  ctx.scene.add(trib);
  // targeting stripe across the road
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6aff5a, transparent: true, opacity: 0.6, depthWrite: false }));
  stripe.position.copy(tr.at(i, 0, 0.12)); stripe.rotation.y = tr.yawAt(i) + Math.PI / 2;
  const stripeHold = new THREE.Group(); stripeHold.add(stripe);
  stripe.rotation.set(0, 0, 0); stripe.position.set(0, 0, 0);
  stripeHold.position.copy(tr.at(i, 0, 0.12)); stripeHold.rotation.y = tr.yawAt(i);
  stripeHold.visible = false;
  ctx.group.add(stripeHold);
  const hit = new THREE.Vector3();
  let state = 0, sfxT = 0;
  const CHARGE = 2.6, FIRE = 2.4, CYC = period + CHARGE + FIRE;
  return {
    // wait, charge, fire: an exact cycle of the hazard clock (the same on every online screen)
    update(dt, t) {
      const x = t + offset, n = Math.floor(x / CYC), q = x - n * CYC;
      const next = q <= period ? 0 : q <= period + CHARGE ? 1 : 2, ph = next === 1 ? q - period : q - period - CHARGE;
      if (next === 0) { if (state !== 0) { beam.visible = false; stripeHold.visible = false; trib.visible = false; } state = 0; return; }
      if (next === 1 && state !== 1) { state = 1; trib.visible = true; stripeHold.visible = true; beam.visible = false; const au = ctx.world.race?.audio; if (au?.ctx && au.att(a) > 0.05) au.tone(90, CHARGE, { vol: 0.12 * au.att(a), type: 'sawtooth', slide: 6, filter: 1200 }); }
      if (next === 2 && state !== 2) { state = 2; beam.visible = true; trib.visible = false; stripeHold.visible = true; ctx.world.race?.audio.sfx('rocket', a); }
      if (state === 1) {
        const f = ph / CHARGE;
        stripe.material.opacity = 0.25 + 0.6 * Math.abs(Math.sin(t * (6 + f * 18)));
        trib.children.forEach((m) => { m.scale.x = m.scale.y = 0.6 + f * 1.4; });
      } else if (state === 2) {
        const f = ph / FIRE;
        hit.lerpVectors(a, b, f);
        beam.position.copy(focus); beam.lookAt(hit); beam.scale.z = focus.distanceTo(hit);
        outer.scale.x = outer.scale.y = 5 + Math.sin(t * 40) * 0.8;
        stripe.material.opacity = 0.2;
        sfxT -= dt;
        const fx = ctx.world.race?.fx;
        if (fx) for (let j = 0; j < 4; j++) { const an = Math.random() * 6.28; fx.spark(hit.x, hit.y + 0.3, hit.z, Math.cos(an) * 10, 6 + Math.random() * 10, Math.sin(an) * 10, j % 2 ? 0x6aff5a : 0xffffff, 0.5, 14); }
        if (sfxT < 0) { sfxT = 0.3; ctx.world.race?.audio.sfx('bump', hit); }
      }
    },
    test(p) { return state === 2 && Math.abs(p.y - hit.y) < 5 && Math.hypot(p.x - hit.x, p.z - hit.z) < 3.4 ? 'wreck' : null; },
    near(p, r) { return state >= 1 && Math.hypot(p.x - (a.x + b.x) / 2, p.z - (a.z + b.z) / 2) < W + r && Math.abs((p.x - a.x) * tr.T[i * 3] + (p.z - a.z) * tr.T[i * 3 + 2]) < 3 + r; },
  };
}

// Something flying along the track (podracers, the X-wing trench run)
function flyAlong(ctx, obj, { ka, kb, h = 6, lat = 0, speed = 50, period = 10, offset = 0, wobble = 1 }) {
  const tr = ctx.track, ia = tr.kToIndex(ka), span = (tr.kToIndex(kb) - ia + tr.N) % tr.N;
  obj.rotation.order = 'YXZ';
  ctx.group.add(obj);
  ctx.anim((dt, t) => {
    const d = (((t + offset) % period) + period) % period * speed;
    if (d > span) { obj.visible = false; return; }
    obj.visible = true;
    const i = tr.wrap(ia + Math.round(d));
    const hw = tr.HW[i];
    tr.at(i, lat * hw + Math.sin(t * 1.3 + offset) * 2 * wobble, h + Math.sin(t * 2.1 + offset) * 0.6 * wobble, obj.position);
    obj.rotation.y = tr.yawAt(i + 4);
    obj.rotation.z = Math.cos(t * 1.3 + offset) * 0.25 * wobble;
    const sc = Math.min(1, d / 12, (span - d) / 12);
    obj.scale.setScalar(Math.max(0.01, sc));
  });
}

function haloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,240,200,0.6)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default {
  id: 'starwars', name: 'Tatooine Podrace', subtitle: 'Jawas, Maul, AT-ATs, a Sarlacc glide and the Death Star trench',
  cup: 'movie', seed: 77, width: 26, shoulder: 5, edge: 'open', surface: 'sand', start: 0.5,
  points: [[-161, -167, 0], [-40, -177, 0], [75, -161, 0], [168, -121, 0], [212, -47, 0], [182, 20, 2], [223, 87, 3], [195, 161, 4], [121, 195, 4], [40, 201, 3], [-40, 195, 1], [-121, 168, 0], [-167, 108, 0], [-134, 48, 0], [-53, 40, 0], [20, 75, 0], [81, 34, 2], [75, -40, 8], [0, -87, 16], [-100, -94, 16], [-195, -81, 10], [-262, -110, 4], [-242, -161, 0]],
  sections: [
    { from: 22.55, to: 1.35, surface: 'road', edge: 'fence', shoulder: 4 },
    { from: 3.35, to: 8.15, edge: 'wall', shoulder: 3 },
    { from: 8.2, to: 10.35, gap: true },
    { from: 10.35, to: 12.55, surface: 'road', shoulder: 5 },
    { from: 11.85, to: 12.3, width: 44 },
    { from: 12.7, to: 16.6, surface: 'snow', shoulder: 6 },
    { from: 14.6, to: 14.69, gap: true },
    { from: 16.6, to: 18.0, surface: 'deathstar', edge: 'wall', shoulder: 1.5, support: 'pillar' },
    { from: 18.0, to: 20.25, surface: 'deathstar', edge: 'wall', shoulder: 1 },
  ],
  items: [1.6, 4.3, 6.8, 11.55, 13.1, 15.0, 17.3, 19.1, 21.4],
  boosts: [[0.95, 0], [3.0, -0.4], [5.3, 0.35], [7.5, 0], [12.6, 0], [14.2, 0], [16.3, -0.3], [18.15, 0], [21.9, 0.3]],
  ramps: [14.5],
  gliders: [8.12],
  studs: [[0.2, 0.4, 8], [2.5, 0, 6], [4.8, -0.3, 6], [7.0, 0, 8], [11.2, -0.3, 6], [13.1, 0.4, 6], [15.8, 0, 6], [17.6, 0, 8], [19.5, -0.4, 8], [21.0, 0.3, 6]],
  theme: {
    sky: [0x3b78cc, 0xf4d9a8, 0xd6ae78], fog: [0xf0d4a4, 260, 1300], sun: { color: 0xfff0d2, intensity: 2.7, dir: [0.75, 0.62, -0.3] },
    hemi: [0xfff2dc, 0xb88a58, 1.2], envIntensity: 0.75,
    ground: SW.sand, groundPitch: 1.6, shoulder: 0xcfa468, dust: 0xd8b070,
    road: { base: '#a07e5a', line: '#f4e6c8' },
    surfaces: {
      sand: { base: '#c89c66', line: null, seams: 'rgba(110,70,30,0.22)' },
      snow: { base: '#e9f1f7', line: '#8ab8d8', seams: 'rgba(110,140,170,0.3)', rough: 0.4 },
      deathstar: { base: '#4c5158', line: '#ff5a3a', seams: 'rgba(0,0,0,0.55)', metal: 0.35, rough: 0.45 },
    },
    wall: [SW.stone, SW.stone2, SW.stone3], curb: [C.red, C.white], gate: [SW.stone, C.red], fence: [SW.stone2, C.red],
    support: 'bank', pillar: SW.imp, pillar2: SW.imp2, skirt: ['#b98a58', '#8a6440'], skirtColor: SW.stone2,
    rampSide: SW.rust2, ramp: C.orange,
    music: { bpm: 140, root: 57, scale: 'minor', style: 'space' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    const sideP = (k, sd, extra, h = 0) => { const i = K(k); return tr.at(i, sd * (edgeLat(i) + extra), h); };
    // yaw that makes a prop's +Z face the road from side sd
    const faceRoad = (k, sd) => { const i = K(k); return Math.atan2(-sd * tr.R[i * 2], -sd * tr.R[i * 2 + 1]); };
    const place = (obj, p, yaw = 0, y = null) => { obj.position.set(p.x, y ?? p.y, p.z); obj.rotation.y = yaw; ctx.group.add(obj); if (obj.userData.anim) ctx.anim((dt, t) => obj.userData.anim(t)); return obj; };
    // distance check against the whole track, optionally ignoring a k-range
    const far = (x, z, r, ka, kb) => {
      const ia = ka === undefined ? -1 : K(ka), ib = ka === undefined ? -1 : K(kb);
      for (let i = 0; i < tr.N; i += 2) {
        if (ia >= 0 && (ia <= ib ? i >= ia && i <= ib : i >= ia || i <= ib)) continue;
        if (Math.hypot(x - tr.px(i), z - tr.pz(i)) < r + edgeLat(i) + 2) return false;
      }
      return true;
    };

    // ---------------------------------------------------------------- regions
    const pitC = tr.at(K(9.3), 0, 0).setY(0), PIT_R = 38, GW = 27, GD = -15;
    const gorgeI = []; each(tr, 8.2, 10.35, 2, (i) => gorgeI.push(i));
    const gorgePath = (g, toPx, sc) => {
      g.strokeStyle = '#000'; g.lineWidth = GW * 2 * sc; g.lineCap = 'butt'; g.lineJoin = 'round';
      g.beginPath(); gorgeI.forEach((i, n) => { const [x, y] = toPx(tr.px(i), tr.pz(i)); if (n) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
    };
    const trenchI = K(14.645), tX = tr.px(trenchI), tZ = tr.pz(trenchI), tRx = tr.R[trenchI * 2], tRz = tr.R[trenchI * 2 + 1];
    const inHoth = (i) => inRange(tr, i, 12.6, 16.7);
    const snow = ctx.makeMask(1600, 1024, (g, toPx, sc) => {
      g.fillStyle = '#fff';
      strokeTrack(g, tr, toPx, sc, 55, inHoth);
      for (const [x, z, r] of [[-60, 120, 70], [40, 150, 60], [-130, 0, 60], [150, 90, 55]]) disc(g, toPx, sc, x * 0.79, z * 0.79, r * 0.8);
    });
    const snowPlane = groundPlane(SW.snow, tr.groundY - 0.03, 1600, 1.6, { mask: snow, rough: 0.5 });
    scene.add(snowPlane);
    const isSnow = (x, z) => snow.test(x, z);
    // holes in the desert: the Sarlacc pit and the Hoth trench under the jump
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = '#000'; disc(g, toPx, sc, pitC.x, pitC.z, PIT_R + 1);
      gorgePath(g, toPx, sc);
      g.strokeStyle = '#000'; g.lineWidth = 9 * sc;
      const [a1, a2] = toPx(tX - tRx * 90, tZ - tRz * 90), [b1, b2] = toPx(tX + tRx * 90, tZ + tRz * 90);
      g.beginPath(); g.moveTo(a1, a2); g.lineTo(b1, b2); g.stroke();
    });
    ctx.cutGround(hole);
    // same trench cut in the snow layer
    snowPlane.material.alphaMap = new THREE.CanvasTexture(ctx.makeMask(1600, 1024, (g, toPx, sc) => {
      g.drawImage(snow, 0, 0);
      g.strokeStyle = '#000'; g.lineWidth = 9 * sc;
      const [a1, a2] = toPx(tX - tRx * 90, tZ - tRz * 90), [b1, b2] = toPx(tX + tRx * 90, tZ + tRz * 90);
      g.beginPath(); g.moveTo(a1, a2); g.lineTo(b1, b2); g.stroke();
    }));
    ctx.claim(pitC.x, pitC.z, PIT_R + 20);

    // ---------------------------------------------------------------- sky
    const haloT = haloTexture();
    for (const [x, y, z, r, c] of [[1100, 270, -420, 36, 0xfff6d8], [1180, 215, -300, 25, 0xffe0a8]]) {
      const sun = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12), new THREE.MeshBasicMaterial({ color: c, fog: false }));
      sun.position.set(x, y, z); scene.add(sun);
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT, color: c, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      h.scale.setScalar(r * 7); h.position.set(x, y, z); scene.add(h);
    }
    // the Death Star
    const DS = new THREE.Vector3(-1050, 330, -150), DSR = 150;
    const dsMat = baseplateMat(0x8c9298, 1, 0.6); dsMat.map.repeat.set(DSR * 0.5, DSR * 0.25); dsMat.bumpMap.repeat.copy(dsMat.map.repeat); dsMat.fog = false;
    const ds = new THREE.Mesh(new THREE.SphereGeometry(DSR, 48, 32), dsMat);
    ds.position.copy(DS); scene.add(ds);
    const dsDark = new THREE.MeshStandardMaterial({ color: 0x3e4247, roughness: 0.6, fog: false, side: THREE.DoubleSide });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(DSR * 1.004, DSR * 1.004, 5, 64, 1, true), dsDark);
    band.position.copy(DS); scene.add(band);
    const laserK = 20.72;
    const target = tr.at(K(laserK), 0, 0);
    const n0 = V2.subVectors(target, DS).normalize().add(V3.set(0, 0.42, 0)).normalize().clone();
    const dishC = DS.clone().addScaledVector(n0, DSR * 0.985), dishR = DSR * 0.24;
    const dq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n0);
    const dish = new THREE.Mesh(new THREE.CircleGeometry(dishR, 40), dsDark);
    dish.position.copy(dishC); dish.quaternion.copy(dq); scene.add(dish);
    const rim = new THREE.Mesh(new THREE.RingGeometry(dishR * 0.35, dishR * 0.42, 40), new THREE.MeshStandardMaterial({ color: 0x5a5e64, fog: false, side: THREE.DoubleSide }));
    rim.position.copy(dishC).addScaledVector(n0, 0.5); rim.quaternion.copy(dq); scene.add(rim);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(dishR * 0.12, 16, 10), new THREE.MeshBasicMaterial({ color: 0x8aff7a, fog: false }));
    lens.position.copy(dishC).addScaledVector(n0, 1); scene.add(lens);
    const focus = dishC.clone().addScaledVector(n0, dishR * 0.9);
    ctx.hazard(superlaser(ctx, { k: laserK, focus, dish: { c: dishC, q: dq, r: dishR }, period: 9, offset: 3 }));
    // Star Destroyer drifting over Hoth
    const sd = P.starDestroyer(1.7);
    sd.position.set(250, 250, -760); sd.rotation.y = -Math.PI / 2 - 0.3; scene.add(sd);
    ctx.anim((dt, t) => { sd.position.x = 250 - ((t * 6) % 900); });
    // Millennium Falcon chased by TIE fighters around the whole course
    const fal = P.falcon(1.2), ties = [P.tie(1), P.tie(1)];
    scene.add(fal, ...ties);
    [fal, ...ties].forEach((o) => { o.rotation.order = 'YXZ'; });
    const loop = (o, a, y) => { const A = 400, B = 340; o.position.set(bounds.cx + Math.cos(a) * A, y, bounds.cz + Math.sin(a) * B); o.rotation.y = Math.atan2(-A * Math.sin(a), B * Math.cos(a)); o.rotation.z = -0.35; };
    ctx.anim((dt, t) => { const a = t * 0.085; loop(fal, a, 70 + Math.sin(t * 0.4) * 10); loop(ties[0], a - 0.07, 72 + Math.sin(t * 0.5) * 8); ties[0].position.x += 6; loop(ties[1], a - 0.1, 66 + Math.sin(t * 0.6) * 8); });
    // TIE squadron over the Death Star plateau
    const sq = [0, 1, 2].map(() => { const tt = P.tie(1.1); tt.rotation.order = 'YXZ'; scene.add(tt); return tt; });
    ctx.anim((dt, t) => sq.forEach((o, n) => { const a = t * 0.35 + n * 0.12; const r = 150 + n * 8; o.position.set(-92 + Math.cos(a) * r, 60 + n * 5 + Math.sin(t + n) * 2, -87 + Math.sin(a) * r * 0.7); o.rotation.y = Math.atan2(-Math.sin(a) * r, Math.cos(a) * r * 0.7); o.rotation.z = 0.4; }));

    // ---------------------------------------------------------------- Mos Espa arena (start)
    const i0 = K(22.62), i1 = K(1.3), len = (i1 - i0 + tr.N) % tr.N;
    grandstand(b, tr, i0, len, 1, rand);
    grandstand(b, tr, i0 + 30, len - 60, -1, rand);
    const flagCols = [C.red, C.yellow, C.blue, C.orange, C.green, C.purple];
    each(tr, 22.62, 1.3, 16, (i) => { for (const sdd of [-1, 1]) { const p = tr.at(i, sdd * (edgeLat(i) + 13), 0); b.box(p.x, 0, p.z, 0.3, 14, 0.3, C.dkgray); b.box(p.x + tr.T[i * 3] * 1.2, 11, p.z + tr.T[i * 3 + 2] * 1.2, 0.1, 2.4, 2.4, flagCols[(i >> 4) % flagCols.length], { rot: tr.yawAt(i) + Math.PI / 2 }); } });
    // Jabba's viewing tower
    {
      const p = sideP(0.95, -1, 22);
      let y = 0;
      for (let n = 0; n < 5; n++) y = b.cyl(p.x, y, p.z, 6 - n * 0.3, 3.2, n % 2 ? SW.stone : SW.stone3, { seg: 14 });
      b.cyl(p.x, y, p.z, 8, 1, SW.stone2, { seg: 16 });
      P.stamp(b, (bb) => P.jabba(bb, 1.1), p.x, y + 1, p.z, faceRoad(0.95, -1));
      for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2; b.box(p.x + Math.cos(a) * 7, y + 1, p.z + Math.sin(a) * 7, 0.4, 6, 0.4, C.dkgray); }
      b.cyl(p.x, y + 7, p.z, 8.5, 0.5, C.red, { seg: 16 });
      b.cone(p.x, y + 7.5, p.z, 8.5, 2.5, C.dkred, { seg: 16 });
      ctx.claim(p.x, p.z, 12);
    }
    // podracers parked in the pit lane
    const pods = [[0x8aa0c8, 0x1f55b8, 0x2a5ab8], [0xe07020, 0x3a3a3a, 0xe07020], [0x7aa05a, C.yellow, 0x3a6a2a], [0xc8c8c8, C.red, C.red], [0x4a4ae0, C.white, 0x2a2aa0], [0xd8b040, C.dkred, 0x9a3a2a]];
    pods.forEach((c, n) => {
      const kk = n < 3 ? 22.1 + n * 0.14 : 1.3 + (n - 3) * 0.14;
      const p = sideP(kk, 1, 7);
      ctx.claim(p.x, p.z, 8);
      P.stamp(b, (bb) => P.podracerB(bb, 0.8, ...c), p.x, 1.2, p.z, tr.yawAt(K(kk)) + Math.PI);
      b.box(p.x, 0, p.z, 1.2, 1.2, 1.2, C.dkgray);
    });
    arch(ctx, 0.9, { cols: [SW.stone, C.red], text: 'BOONTA EVE CLASSIC', bg: '#9a2a1a', fg: '#ffd040', height: 13 });
    arch(ctx, 22.8, { cols: [SW.stone, C.red], text: 'MOS ESPA GRAND ARENA', bg: '#5a3a24', fg: '#ffd040', height: 13 });
    // Mos Espa town behind the stands
    ctx.scatter(26, { minC: 20, maxC: 90, r: 7, test: (x, z) => Math.hypot(x + 120, z + 220) < 170 && !isSnow(x, z) && far(x, z, 18) }, (x, z) => P.stamp(b, (bb) => P.adobe(bb, 7 + rand() * 6, 4 + rand() * 4, rand() < 0.6 ? SW.adobe : SW.adobe2, rand), x, 0, z, rand() * 6.28));

    // ---------------------------------------------------------------- Dune Sea: Jawas, sandcrawler, droids
    {
      const k = 2.0, i = K(k);
      const p = sideP(k, -1, 27);
      P.stamp(b, (bb) => P.sandcrawler(bb, 1), p.x, 0, p.z, faceRoad(k, -1));
      ctx.claim(p.x, p.z, 22);
      [1.9, 2.12].forEach((kk, n) => ctx.hazard(crossing(ctx, { mesh: P.jawa(1.35), k: kk, speed: 4.2 + n * 0.6, kind: 'spin', radius: 1.2, offset: n * 0.45 })));
      const q = sideP(k, 1, 6);
      place(P.c3po(2.5), q, faceRoad(k, 1));
      const q2 = sideP(k + 0.06, 1, 6);
      place(P.r2d2(2.1), q2, faceRoad(k, 1) - 0.4);
      ctx.claim(q.x, q.z, 8);
      // more Jawas haggling next to the droids
      for (const [dk, e] of [[-0.07, 5], [0.13, 7]]) { const jq = sideP(k + dk, 1, e); const j = P.jawa(1.35); j.position.copy(jq); j.rotation.y = faceRoad(k, 1) + 0.8; ctx.group.add(j); }
      void i;
    }
    // Lars homestead
    {
      const p = sideP(3.0, 1, 45);
      if (far(p.x, p.z, 16)) {
        P.stamp(b, (bb) => {
          P.put(bb, P.HEMI, SW.adobe, 0, 0, 0, 7, 5, 7);
          P.box(bb, 0x3a2a1a, 0, 1.4, 6.6, 2.4, 2.8, 1.2);
          P.rod(bb, SW.adobe2, -18, -0.2, 0, -18, 0.8, 0, 10, P.CYL20);
          P.rod(bb, 0x9a7a4a, -18, 0.8, 0, -18, 0.9, 0, 8.6, P.CYL20);
          P.put(bb, P.HEMI, SW.adobe, 12, 0, -4, 3, 2.4, 3);
          for (const [x, z] of [[8, 10], [-6, -12], [16, 6]]) P.stamp(bb, (b3) => P.vaporator(b3, 1), x, 0, z);
        }, p.x, 0, p.z, rand() * 6);
        ctx.claim(p.x, p.z, 30);
      }
    }
    // Krayt dragon skeleton half-buried in the sand
    {
      const p = sideP(1.1, 1, 34);
      if (far(p.x, p.z, 20)) {
        P.stamp(b, (bb) => {
          for (let n = 0; n < 16; n++) {
            const z = -22 + n * 2.8, y = 4 + Math.sin(n / 15 * Math.PI) * 3;
            P.ball(bb, 0xf0e6d0, 0, y, z, 0.9);
            if (n > 2 && n < 13) for (const s of [-1, 1]) { P.rod(bb, 0xf0e6d0, 0, y, z, s * 4, y - 1.5, z, 0.35, P.CYL8); P.rod(bb, 0xf0e6d0, s * 4, y - 1.5, z, s * 5, -0.5, z + 0.5, 0.3, P.CYL8); }
          }
          P.put(bb, P.SPH, 0xf0e6d0, 0, 4.5, 23, 3, 2, 4.5);
          P.ball(bb, 0x3a3020, 1.3, 5.2, 24, 0.9); P.ball(bb, 0x3a3020, -1.3, 5.2, 24, 0.9);
          for (const s of [-1, 1]) P.put(bb, P.CONE, 0xf0e6d0, s * 2, 6.5, 21, 0.5, 3, 0.5, -0.8, 0, 0);
        }, p.x, 0, p.z, rand() * 6);
        ctx.claim(p.x, p.z, 28);
      }
    }
    // banthas with Tusken riders plodding along
    for (const [k, e, o] of [[3.6, 30, 0], [3.2, 40, 2]]) {
      const p = sideP(k, -1, e);
      if (!far(p.x, p.z, 10)) continue;
      const g = P.bantha(1.1);
      const rider = P.tusken(1.4); rider.position.set(0, 7.6, -0.5); g.add(rider);
      place(g, p, 0);
      ctx.claim(p.x, p.z, 16);
      const x0 = p.x, z0 = p.z;
      ctx.anim((dt, t) => { const a = t * 0.08 + o; g.position.set(x0 + Math.cos(a) * 8, Math.abs(Math.sin(t * 2.2 + o)) * 0.25, z0 + Math.sin(a) * 8); g.rotation.y = -a; rider.userData.anim?.(t); });
    }

    // ---------------------------------------------------------------- Beggar's Canyon & the Jundland plateau
    const strata = [SW.stone, SW.stone3, SW.stone2, 0xc4905a, SW.stone];
    const cliffTop = {};
    each(tr, 3.35, 8.15, 4, (i) => {
      const yaw = tr.yawAt(i), ry = tr.py(i);
      const plateau = false;
      for (const sd of [-1, 1]) {
        const base = edgeLat(i) - 0.6;
        let y = 0, layer = 0, inset = 0;
        const n = Math.sin(i * 0.05 + sd * 2) * 0.5 + Math.sin(i * 0.13 + sd) * 0.3;
        const top = plateau ? ry + 3 + n * 2 : 17 + n * 8 + (i % 7);
        while (y < top) {
          const hL = Math.min(top - y, 3 + rand() * 3.5);
          const th = (plateau ? 26 : 10) + rand() * 7;
          const lat = sd * (base + inset + th / 2);
          const p = tr.at(i, lat, 0);
          if (!far(p.x, p.z, th / 2, 3.2, 8.3)) break;
          b.box(p.x, y, p.z, th, hL, 5.2, strata[(layer + (i >> 5)) % strata.length], { rot: yaw });
          y += hL; layer++;
          if (!plateau) inset += rand() * 0.9;
        }
        cliffTop[i + '' + sd] = [y, base + inset];
      }
    });
    // the Dune Sea gorge under the glide: terraced sand walls and cliff faces at both ends
    for (const i of gorgeI) {
      const yaw = tr.yawAt(i);
      for (const sd of [-1, 1]) for (let n = 0; n < 5; n++) {
        const p = tr.at(i, sd * (GW - 2 - n * 3.6), 0);
        if (Math.hypot(p.x - pitC.x, p.z - pitC.z) < PIT_R + 2) continue;
        b.box(p.x, -3 * n - 3.4, p.z, 4.2, 3.4, 2.6, n % 2 ? SW.sand2 : SW.dune, { rot: yaw });
      }
    }
    for (const [k, dir] of [[8.2, 1], [10.35, -1]]) {
      const i = K(k), p = tr.at(i, 0, 0), yaw = tr.yawAt(i);
      b.box(p.x - tr.T[i * 3] * dir * 1.5, GD, p.z - tr.T[i * 3 + 2] * dir * 1.5, GW * 2 + 2, p.y - 0.9 - GD, 3, SW.stone2, { rot: yaw });
      for (let n = 0; n < 4; n++) b.box(p.x - tr.T[i * 3] * dir * 1.5, GD + n * 3.5, p.z - tr.T[i * 3 + 2] * dir * 1.5, GW * 2 + 2.4, 0.6, 3.3, SW.stone, { rot: yaw });
    }
    const floorMask = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, pitC.x, pitC.z, PIT_R + 2); g.strokeStyle = '#fff'; g.lineWidth = GW * 2 * sc; g.lineCap = 'butt'; g.beginPath(); gorgeI.forEach((i, n) => { const [x, y] = toPx(tr.px(i), tr.pz(i)); if (n) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); });
    scene.add(groundPlane(SW.sand2, GD, 1600, 1.6, { mask: floorMask }));
    // natural rock arches over the canyon
    for (const k of [4.75, 6.05]) {
      const i = K(k), yaw = tr.yawAt(i), W = edgeLat(i) + 3;
      const c = tr.at(i, 0, 0);
      for (const sd of [-1, 1]) { const p = tr.at(i, sd * (W + 2), 0); b.box(p.x, 0, p.z, 7, 22, 8, SW.stone2, { rot: yaw }); }
      b.box(c.x, c.y + 13, c.z, W * 2 + 8, 3, 7, SW.stone, { rot: yaw });
      b.box(c.x, c.y + 16, c.z, W * 2 + 12, 4, 8, SW.stone3, { rot: yaw });
      for (const sd of [-1, 1]) { const p = tr.at(i, sd * (W - 3), 0); b.box(p.x, c.y + 11, p.z, 6, 2.5, 6.5, SW.stone, { rot: yaw }); }
    }
    // Tusken Raiders up on the canyon rim, podracers screaming through
    for (const [k, sd] of [[4.25, -1], [5.55, 1], [6.55, -1], [3.9, 1]]) {
      const i = K(k);
      let ct = null;
      for (let o = 0; o < 4 && !ct; o++) ct = cliffTop[tr.wrap(i + o) + '' + sd] || cliffTop[tr.wrap(i - o) + '' + sd];
      if (!ct) continue;
      const p = tr.at(i, sd * (ct[1] + 3), 0);
      place(P.tusken(2.3), p, faceRoad(k, sd), ct[0]);
    }
    flyAlong(ctx, P.podracer(0.9), { ka: 3.2, kb: 7.9, h: 5.5, lat: -0.3, speed: 60, period: 13, offset: 0 });
    flyAlong(ctx, P.podracer(0.9, 0xe07020, 0x3a3a3a, 0xe07020), { ka: 3.2, kb: 7.9, h: 6.5, lat: 0.3, speed: 58, period: 13, offset: -0.4 });
    arch(ctx, 3.45, { cols: [SW.stone, SW.stone2], text: "BEGGAR'S CANYON", bg: '#7a4a2a', fg: '#ffe0a0', height: 12 });
    arch(ctx, 7.88, { cols: [C.azure, C.white], text: 'SARLACC GLIDE!', bg: '#1a6ad0', fg: '#fff', height: 12 });

    // ---------------------------------------------------------------- the Great Pit of Carkoon
    {
      const rings = 9;
      for (let n = 0; n < rings; n++) {
        const r = PIT_R - n * 3.4, y = -n * 1.6;
        const segs = Math.max(10, Math.round(r * 2 * Math.PI / 4.5));
        for (let m = 0; m < segs; m++) {
          const a = m / segs * Math.PI * 2;
          const bx = pitC.x + Math.cos(a) * r, bz = pitC.z + Math.sin(a) * r;
          if (gorgeI.some((gi) => Math.hypot(bx - tr.px(gi), bz - tr.pz(gi)) < GW - 1)) continue;
          b.box(pitC.x + Math.cos(a) * r, y - 3.2, pitC.z + Math.sin(a) * r, 4.2, 3.2, r * 2 * Math.PI / segs + 0.6, n % 2 ? SW.sand2 : SW.dune, { rot: -a });
        }
      }
      b.cyl(pitC.x, GD - 0.6, pitC.z, 13, 1, 0x8a6a4a, { seg: 20 });
      const sar = P.sarlacc(1.05);
      place(sar, V1.set(pitC.x, GD + 0.4, pitC.z), 0);
      // Boba Fett jetpacking around the pit
      const bf = P.boba(2.2); bf.rotation.order = 'YXZ';
      place(bf, pitC, 0);
      ctx.anim((dt, t) => { const a = t * 0.35; bf.position.set(pitC.x + Math.cos(a) * 24, -2 + Math.sin(t * 0.9) * 3, pitC.z + Math.sin(a) * 24); bf.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)); bf.rotation.x = 0.25; });
      // Jabba's sail barge hovering beside the pit
      const bar = P.sailBarge(1.2);
      place(bar, V1.set(pitC.x + 10, 8, pitC.z + 72), Math.PI / 2 + 0.2);
      ctx.anim((dt, t) => { bar.position.y = 8 + Math.sin(t * 0.7) * 0.8; bar.rotation.z = Math.sin(t * 0.5) * 0.03; });
      ctx.claim(pitC.x + 10, pitC.z + 72, 22);
    }

    // ---------------------------------------------------------------- Mos Eisley
    // Cad Bane on a rooftop, sniping at the street
    {
      const k = 11.55, sd = 1, p = sideP(k, sd, 8);
      P.stamp(b, (bb) => { P.box(bb, SW.adobe2, 0, 3.5, 0, 9, 7, 9); P.box(bb, SW.adobe, 0, 7.2, 0, 9.6, 0.5, 9.6); for (const [x, z] of [[4.4, 0], [-4.4, 0], [0, 4.4], [0, -4.4]]) P.box(bb, SW.adobe, x, 7.8, z, x ? 0.8 : 9.6, 1, z ? 0.8 : 9.6); P.box(bb, 0x3a2a1a, 0, 1.4, 4.55, 2, 2.8, 0.2); }, p.x, 0, p.z, faceRoad(k, sd));
      ctx.claim(p.x, p.z, 9);
      const bane = place(P.cadBane(2.4), p, faceRoad(k, sd), 7.45);
      const base = faceRoad(k, sd);
      const mz = bane.userData.muzzle;
      ctx.hazard(blaster(ctx, {
        ka: 11.15, kb: 12.35, period: 1.7, aim: 1.15, kind: 'spin', radius: 3.0, pitch: 1700,
        muzzle: (out) => out.set(bane.position.x + Math.sin(bane.rotation.y) * mz.z, bane.position.y + mz.y, bane.position.z + Math.cos(bane.rotation.y) * mz.z),
        onAim: (tg) => {
          const dx = tg.x - bane.position.x, dz = tg.z - bane.position.z;
          let d = Math.atan2(dx, dz) - base; d = Math.atan2(Math.sin(d), Math.cos(d));
          bane.rotation.y = base + Math.max(-1.2, Math.min(1.2, d));
          bane.userData.arms.rotation.x = Math.atan2(bane.position.y + 2.3 * 2.4 - tg.y, Math.hypot(dx, dz)) * 0.9;
        },
      }));
    }
    // Darth Maul in the plaza
    ctx.hazard(maulSpinner(ctx, 12.07));
    ctx.claim(tr.px(K(12.07)), tr.pz(K(12.07)), 12);
    // the Mandalorian and Grogu by the Razor Crest
    {
      const k = 11.1, sd = 1;
      const rc = sideP(k, sd, 20);
      if (far(rc.x, rc.z, 13)) { P.stamp(b, (bb) => P.razorCrest(bb, 1.1), rc.x, 0, rc.z, tr.yawAt(K(k)) + 0.4); ctx.claim(rc.x, rc.z, 16); }
      const p = sideP(k, sd, 4.5);
      place(P.mando(2.6), p, faceRoad(k, sd));
      const gq = sideP(k + 0.035, sd, 4.5);
      const gg = place(P.grogu(2.4), gq, faceRoad(k, sd), 2.2); gg.userData.baseY = 2.2;
      ctx.claim(p.x, p.z, 6);
    }
    // the cantina, with Chewbacca outside
    {
      const k = 11.35, sd = -1, p = sideP(k, sd, 24);
      P.stamp(b, (bb) => {
        P.put(bb, P.HEMI, SW.adobe, 0, 0, 0, 14, 9, 14);
        P.put(bb, P.HEMI, SW.adobe2, 12, 0, -6, 7, 6, 7);
        P.put(bb, P.HEMI, SW.adobe2, -12, 0, -4, 6, 5, 6);
        P.box(bb, SW.adobe, 0, 2.5, 12.5, 7, 5, 5);
        P.box(bb, 0x2a1a10, 0, 1.6, 15.05, 3, 3.2, 0.2);
        P.rod(bb, 0x8a8a8a, 5, 8, 0, 5, 14, 0, 0.2, P.CYL8);
        P.ball(bb, 0x8a8a8a, 5, 14, 0, 0.6);
      }, p.x, 0, p.z, faceRoad(k, sd));
      ctx.claim(p.x, p.z, 17);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.8), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 64, (g, w, h) => { g.fillStyle = '#3a2210'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcf6a'; g.font = '900 40px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CANTINA', w / 2, h / 2 + 2); }), emissive: 0xffffff, emissiveIntensity: 0.15 }));
      const yaw = faceRoad(k, sd);
      sign.position.set(p.x + Math.sin(yaw) * 15.2, 5.8, p.z + Math.cos(yaw) * 15.2); sign.rotation.y = yaw;
      ctx.group.add(sign);
      const cq = sideP(k - 0.07, sd, 5);
      place(P.chewie(2.9), cq, faceRoad(k, sd));
      ctx.claim(cq.x, cq.z, 5);
    }
    // stormtrooper checkpoint at the edge of town
    for (const sd of [-1, 1]) for (let n = 0; n < 3; n++) {
      const k = 10.7 + n * 0.05, p = sideP(k, sd, 3 + (n % 2) * 2);
      P.stamp(b, (bb) => P.trooper(bb, 1.5), p.x, p.y, p.z, faceRoad(k, sd));
      ctx.claim(p.x, p.z, 3);
    }
    // adobe houses along the streets
    each(tr, 10.55, 12.65, 7, (i) => {
      for (const sd of [-1, 1]) {
        if (rand() < 0.2) continue;
        const w = 6 + rand() * 6, e = w / 2 + 3 + rand() * 12;
        const p = tr.at(i, sd * (edgeLat(i) + e), 0);
        if (!ctx.free(p.x, p.z, w * 0.7) || !far(p.x, p.z, w * 0.6) || isSnow(p.x, p.z)) continue;
        ctx.claim(p.x, p.z, w * 0.7);
        P.stamp(b, (bb) => P.adobe(bb, w, 3.5 + rand() * 4, rand() < 0.6 ? SW.adobe : SW.adobe2, rand), p.x, 0, p.z, Math.atan2(-sd * tr.R[i * 2], -sd * tr.R[i * 2 + 1]));
      }
    });
    // market awnings
    each(tr, 10.6, 12.6, 23, (i) => {
      const sd = (i >> 3) % 2 ? 1 : -1, p = tr.at(i, sd * (edgeLat(i) + 2.5), 0);
      if (!ctx.free(p.x, p.z, 2.5)) return;
      const yaw = tr.yawAt(i);
      for (const [dx, dz] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]]) b.box(p.x + Math.cos(yaw) * dx + Math.sin(yaw) * dz, 0, p.z - Math.sin(yaw) * dx + Math.cos(yaw) * dz, 0.2, 3, 0.2, C.rbrown);
      b.box(p.x, 3, p.z, 3.6, 0.2, 3, [C.red, C.orange, C.yellow, C.azure][(i >> 2) % 4], { rot: yaw });
      b.box(p.x, 0, p.z, 3, 1.1, 1.6, SW.stone2, { rot: yaw });
    });

    // ---------------------------------------------------------------- Hoth
    ctx.hazard(walker(ctx, { k: 13.55, len: 44, speed: 2.6, s: 1.2, offset: 0.3, dir: 1 }));
    ctx.hazard(walker(ctx, { k: 15.4, len: 44, speed: 2.4, s: 1.2, offset: 0.75, dir: -1 }));
    // snowspeeders circling the first walker
    {
      const wc = tr.at(K(13.55), 0, 0);
      const sps = [P.snowspeeder(1.3), P.snowspeeder(1.3)];
      sps.forEach((o) => { o.rotation.order = 'YXZ'; scene.add(o); });
      ctx.anim((dt, t) => sps.forEach((o, n) => { const a = t * 0.55 + n * Math.PI; const r = 42; o.position.set(wc.x + Math.cos(a) * r, 18 + n * 4 + Math.sin(t * 1.3) * 2, wc.z + Math.sin(a) * r); o.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)); o.rotation.z = -0.5; }));
    }
    // Echo Base hangar in the mountainside
    {
      const k = 13.05, sd = -1, p = sideP(k, sd, 40);
      if (far(p.x, p.z, 22) && ctx.free(p.x, p.z, 20)) {
        mountain(b, p.x, 0, p.z, 26, 34, rand, [SW.snow, 0xdfe8ee], SW.snow, ctx.track);
        const yaw = faceRoad(k, sd);
        const fx = p.x + Math.sin(yaw) * 20, fz = p.z + Math.cos(yaw) * 20;
        b.box(fx, 0, fz, 22, 12, 8, 0xdfe8ee, { rot: yaw });
        b.box(fx + Math.sin(yaw) * 4.05, 0, fz + Math.cos(yaw) * 4.05, 16, 9, 0.2, 0x1a1e24, { rot: yaw });
        for (let n = 0; n < 5; n++) b.box(fx + Math.sin(yaw) * 4.2 + Math.cos(yaw) * (n - 2) * 3.5, 9.3, fz + Math.cos(yaw) * 4.2 - Math.sin(yaw) * (n - 2) * 3.5, 1.4, 0.4, 0.2, 0, { mat: P.glow(0xfff0a0, 2) });
        P.stamp(b, (bb) => P.xwingB(bb, 0.9), fx + Math.sin(yaw) * 10, 1.6, fz + Math.cos(yaw) * 10, yaw + 2.6);
        ctx.claim(p.x, p.z, 34);
      }
    }
    // ion cannon and shield generator
    {
      const p = sideP(14.1, -1, 42);
      if (far(p.x, p.z, 12) && ctx.free(p.x, p.z, 10)) {
        P.stamp(b, (bb) => { P.rod(bb, 0x8a9096, 0, 0, 0, 0, 6, 0, 6, P.CYL20); P.ball(bb, 0xa0a6ac, 0, 12, 0, 7.5); P.rod(bb, 0x5a5e64, 0, 12, 0, 0, 22, 9, 1.2, P.CYL8); P.box(bb, 0x5a5e64, 0, 11, 0, 16, 1, 1.5); }, p.x, 0, p.z, rand() * 6);
        ctx.claim(p.x, p.z, 14);
      }
      const q = sideP(16.0, 1, 40);
      if (far(q.x, q.z, 12) && ctx.free(q.x, q.z, 10)) {
        P.stamp(b, (bb) => { P.rod(bb, 0x8a9096, 0, 0, 0, 0, 14, 0, 1.6, P.CYL8); P.put(bb, P.HEMI, 0xb8bec4, 0, 22, 0, 9, 3.5, 9, Math.PI, 0, 0); P.ball(bb, 0x6a6e74, 0, 14, 0, 3); P.rod(bb, 0x6a6e74, 0, 18.5, 0, 0, 26, 0, 0.4, P.CYL8); P.ball(bb, P.glow(0xff3a2a, 2), 0, 26.4, 0, 0.6); }, q.x, 0, q.z, 0);
        ctx.claim(q.x, q.z, 14);
      }
    }
    // the trench under the jump: sandbags and rebel troopers
    {
      const trenchMat = new THREE.MeshStandardMaterial({ color: 0x9aaab8, roughness: 0.9, side: THREE.DoubleSide });
      const tf = new THREE.Mesh(new THREE.PlaneGeometry(9, 180).rotateX(-Math.PI / 2), trenchMat);
      tf.position.set(tX, -3.5, tZ); tf.rotation.y = Math.atan2(tRx, tRz); scene.add(tf);
      for (const s2 of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(180, 3.6), trenchMat);
        w.position.set(tX + tr.T[trenchI * 3] * s2 * 4.5, -1.75, tZ + tr.T[trenchI * 3 + 2] * s2 * 4.5); w.rotation.y = Math.atan2(-tRz, tRx) + (s2 < 0 ? Math.PI : 0);
        scene.add(w);
      }
      for (let o = -84; o <= 84; o += 3.2) {
        if (Math.abs(o) < edgeLat(trenchI) + 2) continue;
        for (const s2 of [-1, 1]) {
          const x = tX + tRx * o + tr.T[trenchI * 3] * s2 * 5.6, z = tZ + tRz * o + tr.T[trenchI * 3 + 2] * s2 * 5.6;
          b.box(x, 0, z, 3, 1.1, 1.4, 0xd8dcd0, { rot: Math.atan2(-tRz, tRx) });
          if (s2 > 0 && Math.abs(o) > 24 && (Math.round(o / 3.2) % 3 === 0)) P.stamp(b, (bb) => P.rebel(bb, 1.3), x + tr.T[trenchI * 3] * 1.6, -1.2, z + tr.T[trenchI * 3 + 2] * 1.6, tr.yawAt(trenchI) + Math.PI);
        }
      }
    }
    // snowy mountains, ice
    const mts = [[-190, -20, 32, 40], [-10, 175, 30, 36], [120, 150, 26, 32], [-260, 60, 28, 30], [170, 0, 22, 26], [-110, 150, 24, 26]].map(([x, z, r, h]) => [x * 0.79, z * 0.79, r * 0.9, h]);
    for (const [x, z, r, h] of mts) if (far(x, z, r * 0.8) && ctx.free(x, z, r * 0.7)) { mountain(b, x, 0, z, r, h, rand, [SW.snow, 0xd8e2ea, 0xb8c8d6], SW.snow, ctx.track); ctx.claim(x, z, r); }
    ctx.scatter(40, { minC: 4, maxC: 70, r: 3, pad: 60, test: (x, z) => isSnow(x, z) && hole.test(x, z) }, (x, z) => (rand() < 0.5 ? crystal(b, x, 0, z, 1.2, rand, SW.ice) : rock(b, x, 0, z, 1.4, rand, [SW.snow, 0xd8e2ea])));

    // ---------------------------------------------------------------- Imperial bridge & Death Star trench
    const banner = canvasTexture(128, 256, (g, w, h) => {
      g.fillStyle = '#9a1010'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.fillRect(8, 0, w - 16, h);
      g.strokeStyle = '#d8d8d8'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, 90, 36, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(w / 2, 90, 14, 0, Math.PI * 2); g.stroke();
      for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 14, 90 + Math.sin(a) * 14); g.lineTo(w / 2 + Math.cos(a) * 36, 90 + Math.sin(a) * 36); g.stroke(); }
    });
    const banMat = new THREE.MeshStandardMaterial({ map: banner, side: THREE.DoubleSide, roughness: 0.6 });
    each(tr, 16.6, 18.0, 2, (i) => { for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 0.5), 0); b.box(p.x, p.y - 0.4, p.z, 1.4, 2.2, 2.6, (i >> 3) % 2 ? SW.imp : SW.imp2, { rot: tr.yawAt(i) }); } });
    each(tr, 16.7, 17.95, 22, (i) => {
      for (const sd of [-1, 1]) {
        const p = tr.at(i, sd * (edgeLat(i) + 0.4), 0);
        b.box(p.x, p.y, p.z, 0.5, 9, 0.5, SW.imp2);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 5.6), banMat);
        m.position.set(p.x, p.y + 5.6, p.z); m.rotation.y = tr.yawAt(i) + Math.PI / 2;
        ctx.group.add(m);
      }
    });
    for (const sd of [-1, 1]) for (let n = 0; n < 4; n++) {
      const k = 16.45 + n * 0.035, p = sideP(k, sd, 3 + (n % 2) * 1.6);
      P.stamp(b, (bb) => P.trooper(bb, 1.5), p.x, 0, p.z, faceRoad(k, sd));
    }
    arch(ctx, 17.0, { cols: [SW.imp, SW.imp2], text: 'IMPERIAL CHECKPOINT', bg: '#1a1a1a', fg: '#e02020', height: 12 });
    // trench walls + the Death Star surface either side
    const TOP = 31;
    const lights = [P.glow(0xff3a2a, 2.2), P.glow(0xfff2c0, 2.0)];
    each(tr, 18.0, 20.25, 3, (i) => {
      const yaw = tr.yawAt(i), ry = tr.py(i);
      for (const sd of [-1, 1]) {
        const base = edgeLat(i) - 0.3;
        const p = tr.at(i, sd * (base + 1.2), 0);
        b.box(p.x, 0, p.z, 2.4, TOP, 3.6, (i >> 2) % 3 ? SW.imp : SW.imp2, { rot: yaw });
        // greebles on the trench wall
        if (rand() < 0.75) {
          const gy = ry + 1.5 + rand() * (TOP - ry - 4);
          const g = tr.at(i, sd * (base - 0.1), 0);
          b.box(g.x, gy, g.z, 1, 1 + rand() * 3, 2 + rand() * 2.5, rand() < 0.5 ? SW.dark : 0x7a8088, { rot: yaw });
          if (rand() < 0.5) b.box(g.x, gy - 0.6, g.z, 0.9, 0.3, 1.2, 0, { rot: yaw, mat: lights[rand() < 0.6 ? 0 : 1] });
        }
        if ((i >> 2) % 4 === 0) { const g = tr.at(i, sd * (base - 0.05), 0); b.box(g.x, ry + 6, g.z, 0.6, 0.5, 3.8, SW.dark, { rot: yaw }); b.box(g.x, ry + 12, g.z, 0.6, 0.5, 3.8, SW.dark, { rot: yaw }); }
        // the Death Star surface, stepping down in tiers away from the trench
        let off = base + 2.3;
        for (const [w, h, c] of [[10, TOP, (i >> 3) % 2 ? SW.imp : 0x868c92], [12, TOP - 7, (i >> 3) % 2 ? 0x7a8086 : SW.imp], [12, TOP - 15, 0x6e747a]]) {
          const q = tr.at(i, sd * (off + w / 2), 0);
          if (!far(q.x, q.z, w / 2, 17.8, 20.4)) break;
          b.box(q.x, 0, q.z, w, h, 3.4, c, { rot: yaw });
          if (rand() < 0.25) { const g = tr.at(i, sd * (off + 1 + rand() * (w - 2)), 0); b.box(g.x, h, g.z, 1.5 + rand() * 3, 0.8 + rand() * 3, 1.5 + rand() * 3, rand() < 0.5 ? SW.imp2 : 0x9aa0a6, { rot: yaw }); }
          if ((i >> 1) % 5 === 0) { const g = tr.at(i, sd * (off + w), 0); b.box(g.x, h - 2.5, g.z, 0.4, 1, 3.5, SW.dark, { rot: yaw }); }
          off += w;
        }
      }
    });
    // trench-top turbolaser towers
    for (const [k, sd] of [[18.3, 1], [18.9, -1], [19.4, 1], [19.9, -1]]) {
      const p = sideP(k, sd, 7.5);
      if (!far(p.x, p.z, 4, 17.8, 20.4)) continue;
      P.stamp(b, (bb) => { P.box(bb, SW.imp2, 0, 2.5, 0, 5, 5, 5); P.box(bb, SW.imp, 0, 5.6, 0, 6, 1.2, 6); P.rod(bb, SW.dark, 0, 7.4, 0, 0, 7.4, 5, 0.3, P.CYL8); P.rod(bb, SW.dark, 1.2, 7.4, 0, 1.2, 7.4, 5, 0.3, P.CYL8); P.box(bb, SW.imp2, 0.6, 6.8, 0, 3, 1.6, 3); }, p.x, TOP, p.z, faceRoad(k, sd));
    }
    // Darth Vader watching over the trench entrance
    { const k = 18.12, sd = -1, p = sideP(k, sd, 6); place(P.vader(3.4), p, faceRoad(k, sd) - 0.6, TOP); }
    // exhaust port at the end of the trench
    { const i = K(20.05), p = tr.at(i, edgeLat(i) - 0.2, 0); b.box(p.x, p.y + 1, p.z, 0.4, 4, 4, SW.dark, { rot: tr.yawAt(i) }); b.box(p.x, p.y + 2.2, p.z, 0.5, 1.6, 1.6, 0, { rot: tr.yawAt(i), mat: P.glow(0xffa030, 2.5) }); }
    [[18.3, 18.95, 0], [19.3, 19.95, 3.5]].forEach(([ka, kb, off]) => ctx.hazard(strafe(ctx, { ka, kb, period: 7.5, offset: off, shots: 6 })));
    // Red Five's trench run, with Vader's TIE on his tail
    flyAlong(ctx, P.xwing(1.1), { ka: 17.9, kb: 20.3, h: 10, lat: 0, speed: 52, period: 9, offset: 0 });
    flyAlong(ctx, P.tie(1.0), { ka: 17.9, kb: 20.3, h: 10.5, lat: 0.15, speed: 52, period: 9, offset: -0.55 });
    flyAlong(ctx, P.tie(1.0), { ka: 17.9, kb: 20.3, h: 9.5, lat: -0.25, speed: 52, period: 9, offset: -0.85 });

    // ---------------------------------------------------------------- open desert everywhere else
    const trenchPts = []; each(tr, 17.8, 20.4, 8, (i) => trenchPts.push([tr.px(i), tr.pz(i)]));
    const desert = (x, z) => !isSnow(x, z) && hole.test(x, z) && Math.hypot(x - pitC.x, z - pitC.z) > PIT_R + 8 && trenchPts.every(([px, pz]) => Math.hypot(x - px, z - pz) > 60);
    ctx.scatter(70, { minC: 6, maxC: 260, r: 16, pad: 320, test: desert }, (x, z, c) => { const r = Math.min(12 + rand() * 26, c + 8); b.sphere(x, -r * 0.08, z, r, rand() < 0.5 ? SW.dune : SW.sand2, { sy: 0.22 + rand() * 0.12 }); });
    ctx.scatter(38, { minC: 5, maxC: 120, r: 3, test: desert }, (x, z) => P.stamp(b, (bb) => P.vaporator(bb, 1 + rand() * 0.3), x, 0, z, rand() * 6));
    ctx.scatter(40, { minC: 4, maxC: 140, r: 4, pad: 200, test: desert }, (x, z) => rock(b, x, 0, z, 1.6 + rand(), rand, [SW.stone, SW.stone2, SW.stone3]));
    // big mesas on the horizon
    for (let n = 0; n < 16; n++) {
      const a = n / 16 * Math.PI * 2 + rand() * 0.2, r = 520 + rand() * 180;
      const x = bounds.cx + Math.cos(a) * r, z = bounds.cz + Math.sin(a) * r;
      let y = 0; const w = 40 + rand() * 50;
      for (let l = 0; l < 4; l++) { const h = 8 + rand() * 10; b.box(x, y, z, w * (1 - l * 0.12), h, w * 0.7 * (1 - l * 0.1), strata[l % strata.length], { rot: a }); y += h; }
    }
    void plastic; void BrickBuilder; void V3; void Q1; void YUP;
  },
};
