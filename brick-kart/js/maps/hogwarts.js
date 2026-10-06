// Hogwarts Brick Express (Harry Potter): start at snowy Hogsmeade Station beside the
// Hogwarts Express, race through Hogsmeade village (watch for the Knight Bus), over
// the stone viaduct where Dementors swoop, through the Great Hall under floating
// candles, across the Quidditch pitch dodging Bludgers, past Hagrid's hut and the
// Whomping Willow, into the Forbidden Forest (Aragog's spiders), then glide over the
// Black Lake and race the giant squid's tentacles back to the station.
import { THREE, BrickBuilder, C, plastic, groundPlane, pine, rock, minifig, liquid, disc, strokeTrack, inRange, each, edges, arch, tunnel, mat4, crossing, brickGeometry, canvasTexture, cycleRandom } from './kit.js';
import * as P from './hogwarts-props.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const fxOf = (ctx) => ctx.world.race?.fx;
const STONE = 0x8a8478, STONE2 = 0x7a746a, DKSTONE = 0x5a564e, SLATE = 0x2a3448, SNOW = 0xf2f6fc, WOOD = 0x5a3a24;
let winMatC = null;
const winMat = () => (winMatC ||= plastic(0xffd890, { emissive: 0xffb850, emissiveIntensity: 1.3 }));

// ---- hazards --------------------------------------------------------------------------------

// The Whomping Willow: the tree shudders and a flashing arc marks its reach, then a
// huge branch whips across the near half of the road and swings back up.
function whompingWillow(ctx, { k, side = 1, period = 5.4, offset = 0, reach = 0.55 }) {
  const tr = ctx.track, i = tr.kToIndex(k), yaw = tr.yawAt(i);
  const base = tr.at(i, (tr.HW[i] + tr.SH[i] + 5) * side, 0); base.y = 0;
  const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), across = new THREE.Vector3(-tr.R[i * 2] * side, 0, -tr.R[i * 2 + 1] * side);
  const L = tr.HW[i] * (1 + reach) + tr.SH[i] + 5;
  const dir = (phi, out) => out.set(-f.x * Math.cos(phi) + across.x * Math.sin(phi), 0, -f.z * Math.cos(phi) + across.z * Math.sin(phi));
  // trunk + canopy
  const tb = new BrickBuilder(1), BARK = 0x4a3a2a, BARK2 = 0x3a2c20;
  for (let n = 0; n < 6; n++) tb.cyl(Math.sin(n * 1.3) * 0.6, n * 1.6, Math.cos(n * 1.1) * 0.6, 2.6 - n * 0.18, 1.7, n % 2 ? BARK : BARK2, { seg: 9 });
  for (let n = 0; n < 5; n++) { const a = n * 1.26; P.rbox(tb, Math.cos(a) * 2.2, 0.4, Math.sin(a) * 2.2, 1.0, 1.0, 4, 0.5, a, 0, BARK2); }
  for (let n = 0; n < 9; n++) {
    const a = n / 9 * Math.PI * 2, r = 5 + (n % 3);
    P.beam(tb, 0, 9, 0, Math.cos(a) * r, 13 + (n % 2) * 2, Math.sin(a) * r, 0.7, BARK);
    for (let m = 0; m < 4; m++) P.rbox(tb, Math.cos(a) * (r + 0.5), 11 - m * 1.8, Math.sin(a) * (r + 0.5), 0.25, 3.4, 0.25, 0.15 * Math.cos(a), 0, 0.15 * Math.sin(a), m % 2 ? 0x4a6a2a : 0x3a5424);
  }
  tb.sphere(0, 13, 0, 4.2, 0x3a5424, { sy: 0.6 });
  const tree = tb.build({ name: 'willow' }); const treeG = new THREE.Group(); treeG.add(tree); treeG.position.copy(base); ctx.group.add(treeG);
  ctx.obstacle(base.x, base.z, 3.2, 12);
  // the whipping branch (built along local +X)
  const yawG = new THREE.Group(); yawG.position.set(base.x, 3.4, base.z);
  const pitchG = new THREE.Group(); yawG.add(pitchG);
  const bb = new BrickBuilder(1);
  const limb = new THREE.CylinderGeometry(1, 1, 1, 8).rotateZ(Math.PI / 2);
  for (let n = 0; n < 6; n++) { const x0 = n * L / 6; bb.add(limb, plastic(n % 2 ? BARK : BARK2), x0 + L / 12, -n * 0.18, 0, 0, L / 6 + 0.3, 1.1 - n * 0.13, 1.1 - n * 0.13); }
  for (let n = 1; n < 6; n++) { P.rbox(bb, n * L / 6, -n * 0.18 + 0.4, 0.6, 0.25, 0.25, 2.4, 0.5, 0.6, 0, BARK); P.rbox(bb, n * L / 6 + 1, -n * 0.18 - 0.2, -0.7, 0.2, 2, 0.2, 0.4, 0, 0.3, 0x4a6a2a); }
  pitchG.add(bb.build({ name: 'willow-branch' }));
  ctx.group.add(yawG);
  // warning arc on the road
  const SEG = 18, pos = [], idx = [];
  for (let s = 0; s <= SEG; s++) {
    const d = dir(s / SEG * Math.PI, V1);
    for (const r of [3, L]) { const x = base.x + d.x * r, z = base.z + d.z * r; pos.push(x, (tr.roadHeightNear(x, z) ?? 0) + 0.14, z); }
    if (s) { const a = (s - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ag.setIndex(idx);
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  ctx.group.add(new THREE.Mesh(ag, arcMat));
  let state = 0, phi = 0, whoosh = false;
  const cur = new THREE.Vector3();
  const setDir = (ph, lift) => { dir(ph, cur); yawG.rotation.y = Math.atan2(-cur.z, cur.x); pitchG.rotation.z = lift; };
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.45 rest (raised), .45-.7 wind-up (lowers, shakes), .7-.8 whip, .8-.86 hold, .86-1 lift back
      if (ph < 0.45) { state = 0; phi = -0.15; setDir(phi, 0.9); arcMat.opacity = 0; treeG.rotation.z = Math.sin(t * 1.3) * 0.01; whoosh = false; }
      else if (ph < 0.7) { state = 1; const w = (ph - 0.45) / 0.25; phi = -0.15 - w * 0.25; setDir(phi + Math.sin(t * 40) * 0.03, 0.9 - w * 0.9); arcMat.opacity = (0.15 + 0.3 * w) * (0.6 + 0.4 * Math.sin(t * 22)); treeG.rotation.z = Math.sin(t * 30) * 0.03 * w; treeG.rotation.x = Math.cos(t * 27) * 0.02 * w; }
      else if (ph < 0.8) { state = 2; const w = (ph - 0.7) / 0.1; phi = -0.4 + (Math.PI + 0.55) * w * w * (3 - 2 * w); setDir(phi, -0.05); arcMat.opacity = 0.55; if (!whoosh) { whoosh = true; ctx.world.race?.audio.sfx('wall', base); } }
      else if (ph < 0.86) { state = 0; setDir(Math.PI + 0.15, 0); arcMat.opacity = Math.max(0, arcMat.opacity - dt * 3); }
      else { state = 0; const w = (ph - 0.86) / 0.14; setDir(Math.PI + 0.15 - (Math.PI + 0.3) * w, 0.9 * Math.min(1, w * 3)); arcMat.opacity = 0; }
    },
    test(p) {
      if (state !== 2 || p.y > base.y + 6) return null;
      const dx = p.x - base.x, dz = p.z - base.z, a = dx * cur.x + dz * cur.z;
      if (a < 2 || a > L + 1) return null;
      return Math.abs(dx * cur.z - dz * cur.x) < 2.2 ? 'wreck' : null;
    },
    near(p, r) {
      if (!state) return false;
      const dx = p.x - base.x, dz = p.z - base.z;
      return Math.hypot(dx, dz) < L + r && dx * across.x + dz * across.z > -2;
    },
  };
}

// Dementors: one circles high above the viaduct; a frost ring spreads on the road,
// then it swoops onto the spot and freezes anyone caught there.
function dementorSwoop(ctx, { center, targets, period = 5.5, offset = 0, radius = 4.4 }) {
  const tr = ctx.track;
  const dm = P.dementor(1.2); const hold = new THREE.Group(); hold.add(dm); ctx.group.add(hold);
  const chill = P.glow(0x9ad8ff, 10, 0.35); chill.position.y = 3; hold.add(chill);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0, depthWrite: false });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x6ac0ff, transparent: true, opacity: 0, depthWrite: false });
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.RingGeometry(radius - 0.6, radius, 32).rotateX(-Math.PI / 2), ringMat));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.6, 32).rotateX(-Math.PI / 2), fillMat); marker.add(fill);
  for (let n = 0; n < 6; n++) { const s = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.6, 0.04, 0.25), ringMat); s.rotation.y = n * Math.PI / 6; s.position.y = 0.02; marker.add(s); }
  ctx.group.add(marker);
  const target = new THREE.Vector3(), from = new THREE.Vector3(), cpos = new THREE.Vector3();
  let state = 0, cycle = -1, frozeFx = false;
  const rnd = cycleRandom();   // (the same pick on every online screen)
  const TEL = 1.7, DIVE = 0.7, HIT = 0.45, RISE = 1.3;
  return {
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), ph = tt - n * period;
      const a = tt * 0.45;
      cpos.set(center.x + Math.cos(a) * 26, center.y + 20 + Math.sin(tt * 1.3) * 2, center.z + Math.sin(a) * 18);
      if (n !== cycle) {
        cycle = n;
        const [k, lf] = targets[Math.floor(rnd(n, 0) * targets.length)];
        const i = tr.wrap(tr.kToIndex(k) + Math.floor((rnd(n, 1) - 0.5) * 10));
        tr.at(i, (lf + (rnd(n, 2) - 0.5) * 0.4) * tr.HW[i], 0.14, target);
      }
      const s0 = period - TEL - DIVE - HIT - RISE;
      marker.position.copy(target);
      if (ph < s0) { state = 0; hold.position.copy(cpos); ringMat.opacity = fillMat.opacity = 0; frozeFx = false; }
      else if (ph < s0 + TEL) {
        state = 1; const f = (ph - s0) / TEL; hold.position.copy(cpos); from.copy(cpos);
        ringMat.opacity = 0.35 + 0.45 * Math.abs(Math.sin(t * 8)); fillMat.opacity = 0.12 + 0.2 * f; fill.scale.setScalar(Math.max(0.01, f));
      } else if (ph < s0 + TEL + DIVE) {
        state = 1; const f = (ph - s0 - TEL) / DIVE, e = f * f;
        hold.position.lerpVectors(from, target, e); hold.position.y += Math.sin(f * Math.PI) * 4;
        ringMat.opacity = 0.8; fillMat.opacity = 0.35; fill.scale.setScalar(1);
      } else if (ph < s0 + TEL + DIVE + HIT) {
        state = 2; hold.position.copy(target); hold.position.y += 0.6;
        if (!frozeFx) { frozeFx = true; const fx = fxOf(ctx); if (fx) { fx.pop(target, 0xbfe8ff); for (let m = 0; m < 22; m++) { const an = Math.random() * 6.28; fx.spark(target.x, target.y + 0.5, target.z, Math.cos(an) * 8, 3 + Math.random() * 6, Math.sin(an) * 8, m % 2 ? 0xffffff : 0x9ad8ff, 0.7, 4); } } ctx.world.race?.audio.sfx('shield', target); }
        ringMat.opacity = 0.9; fillMat.opacity = 0.5;
      } else {
        state = 0; const f = (ph - s0 - TEL - DIVE - HIT) / RISE;
        hold.position.lerpVectors(target, cpos, f * f * (3 - 2 * f)); ringMat.opacity = fillMat.opacity = Math.max(0, 0.6 * (1 - f * 2));
      }
      dm.rotation.y = t * 0.4;
      dm.rotation.x = state === 1 ? 0.4 : 0;
      chill.material.opacity = state ? 0.6 : 0.3;
    },
    test(p) { return state === 2 && Math.hypot(p.x - target.x, p.z - target.z) < radius + 0.4 && Math.abs(p.y - target.y) < 4 ? 'freeze' : null; },
    near(p, r) { return state > 0 && Math.hypot(p.x - target.x, p.z - target.z) < radius + r; },
  };
}

// The giant squid: a tentacle rears out of the lake, shudders, and slams across the road.
function tentacleSlam(ctx, { S, T, period = 4.8, offset = 0 }) {
  const hx = T.x - S.x, hz = T.z - S.z, dh = Math.hypot(hx, hz), dy = S.y - T.y - 0.8;
  const len = Math.hypot(dh, dy) + 1, aDown = Math.atan2(dh, dy), aUp = Math.PI + 0.3;
  const pivot = new THREE.Group(); pivot.position.copy(S); pivot.rotation.y = Math.atan2(-hz, hx);
  const inner = new THREE.Group(); pivot.add(inner);
  const tb = new BrickBuilder(1), SK = 0xb04a5a, SK2 = 0x9a3a4c;
  const n = 9, segG = new THREE.CylinderGeometry(1, 1.08, 1, 10);
  for (let m = 0; m < n; m++) {
    const r = 1.7 - m * 0.15, y = -(m + 0.5) * len / n;
    tb.add(segG, plastic(m % 2 ? SK : SK2), 0, y, 0, 0, r, len / n + 0.2, r);
    for (const sd of [-1, 1]) tb.sphere(sd * r * 0.5, y, r * 0.86, r * 0.32, 0xf0c8c8);
  }
  P.spike(tb, 0, -len, 0, 0.35, 2.0, Math.PI, 0, SK);
  const tent = tb.build({ name: 'tentacle' }); inner.add(tent);
  ctx.group.add(pivot);
  const midX = (S.x + T.x) / 2, midZ = (S.z + T.z) / 2;
  const shMat = new THREE.MeshBasicMaterial({ color: 0x1a0a30, transparent: true, opacity: 0.15, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(dh, 4.2).rotateX(-Math.PI / 2), shMat);
  shadow.position.set(midX, T.y + 0.13, midZ); shadow.rotation.y = Math.atan2(-hz, hx); ctx.group.add(shadow);
  const splash = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.4, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.5, depthWrite: false }));
  splash.position.set(S.x, -1.3, S.z); ctx.group.add(splash);
  let a = aUp, down = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.4 reared up and swaying, .4-.62 rises & shudders, .62-.68 slam, .68-.8 down, .8-1 lift
      if (ph < 0.4) { a = aUp + Math.sin(t * 1.7) * 0.12; inner.rotation.x = Math.sin(t * 1.3) * 0.15; }
      else if (ph < 0.62) { a = aUp + 0.18 + Math.sin(t * 45) * 0.03; inner.rotation.x = 0; }
      else if (ph < 0.68) a = aUp + 0.18 + (aDown - aUp - 0.18) * ((ph - 0.62) / 0.06);
      else if (ph < 0.8) a = aDown;
      else a = aDown + (aUp - aDown) * ((ph - 0.8) / 0.2);
      inner.rotation.z = a;
      const isDown = Math.abs(a - aDown) < 0.02;
      if (isDown && !down) { down = true; const fx = fxOf(ctx); if (fx) { fx.dust({ pos: T, yaw: 0 }, 0xd8f0ff, 14); fx.pop(T, 0x9ad8ff); } ctx.world.race?.audio.sfx('wall', T); }
      if (!isDown) down = false;
      shMat.opacity = ph > 0.38 && ph < 0.8 ? 0.25 + 0.35 * Math.abs(Math.sin(t * 10)) : 0.1;
      splash.scale.setScalar(1 + (t * 1.5 % 1) * 0.8); splash.material.opacity = 0.5 * (1 - (t * 1.5 % 1));
    },
    test(p) {
      if (!down || p.y > T.y + 4) return null;
      const dx = p.x - S.x, dz = p.z - S.z, u = (dx * hx + dz * hz) / dh;
      return u > 0 && u < dh + 1.5 && Math.abs(dx * hz - dz * hx) / dh < 2.4 ? 'wreck' : null;
    },
    near(p, r) {
      if (!(down || shMat.opacity > 0.2)) return false;
      const dx = p.x - S.x, dz = p.z - S.z, u = (dx * hx + dz * hz) / dh;
      return u > -r && u < dh + r && Math.abs(dx * hz - dz * hx) / dh < 2.4 + r;
    },
  };
}

// Bludgers: iron balls zig-zagging over the Quidditch pitch (Lissajous paths).
function bludgers(ctx, { k, along = 50, wx = 0.5, wz = 1.3, ph = 0, latF = 0.85 }) {
  const tr = ctx.track, i = tr.kToIndex(k), c = tr.at(i, 0, 0), yaw = tr.yawAt(i);
  const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = tr.R[i * 2], rz = tr.R[i * 2 + 1], W = tr.HW[i] * latF;
  const m = P.bludger(1.3, 1.7); ctx.group.add(m);
  const pos = new THREE.Vector3();
  return {
    update(dt, t) {
      const u = Math.sin(t * wx + ph) * along, v = Math.sin(t * wz + ph * 1.7) * W;
      pos.set(c.x + fx * u + rx * v, c.y, c.z + fz * u + rz * v);
      m.position.copy(pos);
      m.userData.ball.position.y = 1.7 + Math.abs(Math.sin(t * 3.1 + ph)) * 1.2;
      m.userData.ball.rotation.x += dt * 9; m.userData.ball.rotation.z += dt * 4;
    },
    test(p) { return Math.hypot(p.x - pos.x, p.z - pos.z) < 2.6 && Math.abs(p.y - pos.y) < 3.5 ? 'spin' : null; },
    near(p, r) { return Math.hypot(p.x - pos.x, p.z - pos.z) < 2.6 + r; },
  };
}

// The Knight Bus bangs out of a side street, crosses the road, then comes back.
function knightBusCrossing(ctx, { k, period = 9, offset = 0, reach = 70 }) {
  const tr = ctx.track, i = tr.kToIndex(k), c = tr.at(i, 0, 0);
  const rx = tr.R[i * 2], rz = tr.R[i * 2 + 1];
  const bus = P.knightBus(); ctx.group.add(bus);
  const pos = new THREE.Vector3();
  let dirS = 1, honked = false;
  const CROSS = 4.4;
  return {
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), ph = tt - n * period;
      dirS = n % 2 ? -1 : 1;
      const f = Math.min(1, ph / CROSS), e = f;   // constant speed
      const lat = dirS * (-reach + 2 * reach * e);
      pos.set(c.x + rx * lat, c.y, c.z + rz * lat);
      bus.position.copy(pos); bus.position.y = c.y + Math.abs(Math.sin(t * 9)) * 0.15;
      bus.rotation.y = Math.atan2(rx * dirS, rz * dirS);
      bus.rotation.z = Math.sin(t * 4) * 0.04;
      bus.visible = f < 1;
      if (ph < 0.2) honked = false;
      if (!honked && Math.abs(lat) < reach * 0.6 && f < 1) { honked = true; ctx.world.race?.audio.sfx('bump', pos); }
    },
    test(p) {
      if (!bus.visible) return null;
      const dx = p.x - pos.x, dz = p.z - pos.z, a = (dx * rx + dz * rz), b = Math.abs(dx * rz - dz * rx);
      return Math.abs(a) < 7 && b < 3.4 && Math.abs(p.y - pos.y) < 6 ? 'wreck' : null;
    },
    near(p, r) { if (!bus.visible) return false; const dx = p.x - pos.x, dz = p.z - pos.z; return Math.abs(dx * rx + dz * rz) < 7 + r * 2 && Math.abs(dx * rz - dz * rx) < 3.4 + r; },
  };
}

// ---- effects helpers ------------------------------------------------------------------------------
function motes(ctx, x, y, z, radius, height, n, color, size = 1.1, speed = 1) {
  const pos = new Float32Array(n * 3), a0 = new Float32Array(n), r0 = new Float32Array(n), h0 = new Float32Array(n), w = new Float32Array(n);
  for (let k = 0; k < n; k++) { a0[k] = Math.random() * 6.28; r0[k] = radius * Math.sqrt(Math.random()); h0[k] = Math.random() * height; w[k] = (0.2 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: P.glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.position.set(x, y, z); pts.frustumCulled = false;
  ctx.group.add(pts);
  ctx.anim((dt, t) => {
    for (let k = 0; k < n; k++) {
      const a = a0[k] + t * w[k] * speed, hh = (h0[k] + t * 1.2 * speed * Math.abs(w[k])) % height;
      pos[k * 3] = Math.cos(a) * r0[k]; pos[k * 3 + 1] = hh; pos[k * 3 + 2] = Math.sin(a) * r0[k];
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}
// rising smoke puffs (instanced bricks) from a point; pos may be a function for moving sources
function smoke(ctx, src, { n = 12, life = 4, rise = 18, drift = 6, size = 1.2, color = 0xd8dce4, opacity = 0.6 } = {}) {
  const m = new THREE.InstancedMesh(brickGeometry(2, 2, 3, 1, true, 8), new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity }), n);
  m.frustumCulled = false; ctx.group.add(m);
  const ps = [...Array(n)].map((_, k) => ({ t: (k / n) * life, x: 0, y: 0, z: 0, a: Math.random() * 6.28 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e = new THREE.Euler();
  ctx.anim((dt) => {
    for (let k = 0; k < n; k++) {
      const p = ps[k]; p.t += dt;
      if (p.t > life) { p.t = 0; const s = typeof src === 'function' ? src() : src; p.x = s.x; p.y = s.y; p.z = s.z; p.a = Math.random() * 6.28; }
      const f = p.t / life;
      p3.set(p.x + Math.cos(p.a) * f * drift, p.y + f * rise, p.z + Math.sin(p.a) * f * drift);
      s3.setScalar(size * (0.5 + f * 2.2) * (f > 0.85 ? (1 - f) / 0.15 : 1));
      q.setFromEuler(e.set(f * 2, p.a, f)); m4.compose(p3, q, s3); m.setMatrixAt(k, m4);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return m;
}

// wooden shop signs: 4 x 4 atlas of 256 x 128 cells
const SIGNS = ['HOGSMEADE', 'HONEYDUKES', 'THREE BROOMSTICKS', "ZONKO'S", "HOG'S HEAD", 'POST OFFICE', 'GLADRAGS', 'DERVISH & BANGES', "SCRIVENSHAFT'S", 'HOGSMEADE STATION', 'BUTTERBEER', 'SWEETS', 'QUIDDITCH', 'HOGWARTS', 'OWLS', 'PLATFORM 1'];
let signMatC = null;
function signMat() {
  if (signMatC) return signMatC;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  SIGNS.forEach((text, k) => {
    const x = (k % 4) * 256, y = Math.floor(k / 4) * 128;
    g.fillStyle = k === 9 || k === 15 ? '#1a2a4a' : '#3a2414'; g.fillRect(x, y, 256, 128);
    g.strokeStyle = '#d8b050'; g.lineWidth = 6; g.strokeRect(x + 8, y + 8, 240, 112);
    g.fillStyle = k === 1 || k === 11 ? '#ff9ac8' : '#f0d070';
    let fs = 64; g.font = `bold ${fs}px Georgia, serif`;
    while (g.measureText(text).width > 222 && fs > 14) { fs -= 3; g.font = `bold ${fs}px Georgia, serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + 128, y + 66);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  signMatC = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45, side: THREE.DoubleSide });
  return signMatC;
}
const signGeos = new Map();
function sign(b, k, x, y, z, w, rot) {
  let g = signGeos.get(k);
  if (!g) {
    g = new THREE.PlaneGeometry(1, 1);
    const u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4, uv = g.attributes.uv;
    for (let n = 0; n < uv.count; n++) uv.setXY(n, u0 + uv.getX(n) * 0.25, v0 + uv.getY(n) * 0.25);
    signGeos.set(k, g);
  }
  b.addMatrix(g, signMat(), mat4(x, y, z, 0, rot, 0, w, w / 2, 1));
}

// snowy Hogsmeade cottage: walls, lit windows, steep snow-covered roof, crooked chimney. Returns roof top y
function cottage(b, x, z, w, d, h, col, rot, { roof = 0x3a2a2a, chimney = true, floors = 1 } = {}) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const L = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca];
  b.box(x, 0, z, w, h, d, col, { rot });
  for (let f = 0; f < floors; f++) for (let n = -1; n <= 1; n += 2) { const [wx, wz] = L(n * w * 0.26, d / 2 + 0.05); b.box(wx, 1.4 + f * 3.2, wz, 1.4, 1.6, 0.2, 0, { rot, mat: winMat() }); }
  const [dx, dz] = L(0, d / 2 + 0.06); b.box(dx, 0, dz, 1.6, 2.6, 0.2, WOOD, { rot });
  for (const sd of [-1, 1]) {
    const [rx, rz] = L(0, sd * d * 0.27);
    b.boxM(mat4(rx, h + d * 0.26, rz, sd * 0.85, rot, 0, w + 0.8, 0.5, d * 0.68), roof);
    b.boxM(mat4(rx + sa * sd * 0.05, h + d * 0.26 + 0.38, rz + ca * sd * 0.05, sd * 0.85, rot, 0, w + 1.0, 0.4, d * 0.66), SNOW);
  }
  if (chimney) { const [cx, cz] = L(w * 0.3, -d * 0.1); b.box(cx, h, cz, 1.2, d * 0.55 + 2.2, 1.2, DKSTONE, { rot: rot + 0.08 }); b.box(cx, h + d * 0.55 + 2.2, cz, 1.4, 0.3, 1.4, SNOW, { rot }); }
  return h + d * 0.55;
}

// ---- the map ------------------------------------------------------------------------------------------
export default {
  id: 'hogwarts', name: 'Hogwarts Brick Express', subtitle: 'Hogsmeade, the Great Hall, Quidditch and a glide over the Black Lake', cup: 'movie', seed: 934,
  width: 28, shoulder: 6, edge: 'fence', start: 0.5,
  points: [[300,120,0],[305,20,0],[290,-60,0],[258,-118,0],[195,-160,2],[115,-195,8],[25,-215,14],[-65,-213,14],[-140,-195,8],[-200,-152,3],[-250,-95,0],[-278,-15,0],[-278,75,0],[-248,145,0],[-188,188,0],[-118,200,0],[-55,222,0],[-5,268,0],[50,300,4],[98,302,14],[138,288,24],[215,286,16],[290,275,6],[332,215,0]],
  sections: [
    { from: 23.4, to: 1.4, surface: 'cobble', shoulder: 7 },
    { from: 1.4, to: 3.9, surface: 'snowy', shoulder: 4 },
    { from: 4.25, to: 7.75, edge: 'wall', shoulder: 1.5, width: 26, support: 'none', surface: 'cobble' },
    { from: 7.75, to: 8.2, edge: 'wall', shoulder: 3, surface: 'cobble' },
    { from: 8.2, to: 9.35, edge: 'wall', shoulder: 2, surface: 'hall' },
    { from: 9.35, to: 10.1, edge: 'wall', shoulder: 3, surface: 'cobble' },
    { from: 10.3, to: 12.6, width: 44, edge: 'open', shoulder: 10, surface: 'pitch', bank: 0.4 },
    { from: 12.75, to: 14.8, surface: 'snowy', shoulder: 6, bank: 0.5 },
    { from: 14.8, to: 18.35, surface: 'forest', edge: 'open', shoulder: 5 },
    { from: 17.56, to: 17.62, gap: true },
    { from: 18.35, to: 20.05, support: 'bank', edge: 'wall', shoulder: 3 },
    { from: 20.12, to: 21.55, gap: true },
    { from: 21.55, to: 23.4, support: 'bank', edge: 'wall', shoulder: 4, surface: 'cobble' },
  ],
  items: [0.95, 3.0, 5.9, 9.85, 11.5, 14.3, 16.55, 18.9, 21.8],
  boosts: [[2.2, 0], [4.6, 0.35], [7.1, -0.3], [10.6, 0], [12.35, 0.4], [15.3, -0.3], [17.25, 0], [19.6, 0], [23.4, 0.3]],
  ramps: [17.45],
  gliders: [20.03],
  studs: [[0.5, -0.4, 8], [1.8, 0.3, 6], [3.5, 0, 6], [5.2, -0.3, 8], [6.6, 0.3, 6], [8.7, 0, 8], [11.0, -0.5, 6], [11.0, 0.5, 6], [13.4, 0, 6], [15.9, 0.3, 6], [19.3, 0, 6], [22.4, -0.3, 6], [23.0, 0.3, 6]],
  theme: {
    sky: [0x070a24, 0x3a3270, 0x0c0e22], fog: [0x2c2c5a, 190, 1050], stars: 3500,
    sun: { color: 0xc4d0ff, intensity: 1.8, dir: [-0.4, 1, -0.5] },
    hemi: [0xaab6ff, 0x4a4a66, 1.4], envIntensity: 0.45,
    ground: 0xd6deea, groundPitch: 1.6, shoulder: 0xe4eaf2, dust: 0xf4f8ff, particles: 'snow',
    road: { base: '#6a645c', line: '#e8e0c8' },
    surfaces: {
      cobble: { base: '#7a7266', line: null, seams: 'rgba(30,24,16,0.45)' },
      snowy: { base: '#b8beca', line: null, seams: 'rgba(80,90,110,0.35)', rough: 0.7 },
      hall: { base: '#6a4a34', line: '#d8b050', seams: 'rgba(30,16,8,0.45)', rough: 0.4 },
      pitch: { base: '#3a7a3a', line: '#f4f4f4', seams: 'rgba(20,60,20,0.35)', rough: 0.8 },
      forest: { base: '#4a3e30', line: null, seams: 'rgba(10,8,4,0.4)', rough: 0.9 },
    },
    wall: [STONE, DKSTONE], curb: [C.dkred, C.gold], gate: [C.dkred, C.gold], fence: [0x3a2a1a, 0x5a4a3a],
    support: 'pillar', pillar: STONE, pillar2: STONE2, skirt: ['#8a8478', '#5a564e'], skirtColor: DKSTONE,
    rampSide: 0x3a1a10, ramp: C.dkred,
    music: { bpm: 138, root: 64, scale: 'minor', style: 'jingle' },
  },

  decor(ctx) {
    const { b, rand, track: tr, scene } = ctx;
    const nb = ctx.bNoShadow;
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    const spot = (k, lat, r) => {
      const i = K(k), sd = Math.sign(lat) || 1;
      for (let l = Math.abs(lat); l < Math.abs(lat) + 160; l += 2) { const p = tr.at(i, l * sd, 0); if (tr.clearance(p.x, p.z, r + 4) >= r) { p.y = 0; return p; } }
      const p = tr.at(i, lat, 0); p.y = 0; return p;
    };
    const faceRoad = (obj, k) => { const q = tr.at(K(k), 0, 0); obj.rotation.y = Math.atan2(q.x - obj.position.x, q.z - obj.position.z); };
    const add = (f, p, k, y = 0) => { f.root.position.set(p.x, y, p.z); faceRoad(f.root, k); ctx.group.add(f.root); return f; };
    const pl = (col, x, y, z, I, d) => { const l = new THREE.PointLight(col, I, d, 1.3); l.position.set(x, y, z); scene.add(l); return l; };
    const anims = [];
    ctx.anim((dt, t) => { for (const f of anims) f(dt, t); });
    const win = winMat();

    // ---- ground: Black Lake (infield + outer bay under the glide), viaduct gorge, forest floor, pitch --------
    const LAKE = [[30, 40, 112], [215, 395, 110], [160, 330, 60]];
    const gliding = (i) => inRange(tr, i, 20.05, 21.62);
    const viaduct = (i) => inRange(tr, i, 4.75, 7.3);
    const shore = (g, toPx, sc, pad) => each(tr, 21.4, 23.4, 3, (i) => { const p = tr.at(i, edgeLat(i) + 26, 0); disc(g, toPx, sc, p.x, p.z, 18 + pad); });
    const creek = (i) => inRange(tr, i, 17.5, 17.68);
    const channel = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = g.lineJoin = 'round'; g.beginPath(); [[30, 40], [110, 150], [170, 250], [200, 330]].forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); };
    const gorge = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = g.lineJoin = 'round'; g.beginPath(); [[60, -700], [50, -330], [30, -215], [20, -110], [30, 40]].forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); };
    const brook = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = 'round'; g.beginPath(); [[-60, 420], [20, 290], [40, 200], [30, 40]].forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); };
    const waterShape = (g, toPx, sc, pad) => { shore(g, toPx, sc, pad); for (const [x, z, r] of LAKE) disc(g, toPx, sc, x, z, r + pad); channel(g, toPx, sc, 70 + pad * 2); gorge(g, toPx, sc, 34 + pad * 2); brook(g, toPx, sc, 8 + pad * 2); };
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = g.strokeStyle = '#000';
      waterShape(g, toPx, sc, 0);
      strokeTrack(g, tr, toPx, sc, 20, gliding); strokeTrack(g, tr, toPx, sc, 14, viaduct); strokeTrack(g, tr, toPx, sc, 2, creek);
    });
    ctx.cutGround(hole);
    const water = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = g.strokeStyle = '#fff'; waterShape(g, toPx, sc, 4); strokeTrack(g, tr, toPx, sc, 24, gliding); strokeTrack(g, tr, toPx, sc, 18, viaduct); strokeTrack(g, tr, toPx, sc, 6, creek); });
    liquid(ctx, water, 0x10284a, -2.4, { size: 1600, speed: 0.04, rough: 0.08 });
    const forest = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; for (const [x, z, r] of [[-120, 300, 110], [-30, 360, 110], [60, 400, 80], [-40, 230, 60], [-110, 140, 40], [-210, 280, 90]]) disc(g, toPx, sc, x, z, r); });
    scene.add(groundPlane(0x3a4438, -0.05, 1600, 1.6, { mask: forest, rough: 0.9 }));
    // Quidditch pitch: green oval on the infield side of the wide straight
    const pitchC = tr.at(K(11.5), -46, 0), pitchYaw = tr.yawAt(K(11.5));
    const pitchM = ctx.makeMask(1600, 1024, (g, toPx, sc) => { const [px, py] = toPx(pitchC.x, pitchC.z); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(px, py, 48 * sc, 104 * sc, -pitchYaw, 0, Math.PI * 2); g.fill(); });
    scene.add(groundPlane(0x3a7a3a, -0.04, 1600, 1.6, { mask: pitchM, rough: 0.85 }));
    const pitchLines = plastic(0xf4f4f4, { rough: 0.7 });
    { const c = pitchC; nb.cyl(c.x, -0.02, c.z, 9, 0.08, 0, { mat: pitchLines, seg: 32 }); nb.cyl(c.x, -0.01, c.z, 8.4, 0.08, 0, { mat: plastic(0x3a7a3a, { rough: 0.85 }), seg: 32 }); }

    // ---- Hogsmeade Station ------------------------------------------------------------------------
    // platform (outer side), lamps, benches, trunks and the station house
    each(tr, 23.75, 0.95, 4, (i) => { const p = tr.at(i, edgeLat(i) + 5.5, 0); b.box(p.x, 0, p.z, 7, 1.3, 4.4, STONE, { rot: tr.yawAt(i) }); b.box(p.x, 1.3, p.z, 7.2, 0.2, 4.6, 0xb8b0a0, { rot: tr.yawAt(i) }); });
    each(tr, 23.8, 0.9, 16, (i) => { const p = tr.at(i, edgeLat(i) + 3.2, 0); b.cyl(p.x, 1.4, p.z, 0.16, 6, 0x1b1b1b, { seg: 6 }); b.box(p.x, 7.4, p.z, 0.9, 1.2, 0.9, 0x1b1b1b); nb.box(p.x, 7.6, p.z, 0.6, 0.8, 0.6, 0, { mat: win }); });
    each(tr, 23.9, 0.8, 22, (i) => { const p = tr.at(i, edgeLat(i) + 7, 0), r = tr.yawAt(i); b.box(p.x, 1.5, p.z, 4, 0.4, 1.2, WOOD, { rot: r }); b.box(p.x + Math.cos(r) * 0.5, 1.9, p.z - Math.sin(r) * 0.5, 4, 1, 0.2, WOOD, { rot: r }); for (let n = 0; n < 3; n++) b.box(p.x + Math.sin(r) * (n - 1) * 2.4 + Math.cos(r) * -1.5, 1.5, p.z + Math.cos(r) * (n - 1) * 2.4 - Math.sin(r) * 1.5, 1.6, 1 + (n % 2) * 0.4, 1, [0x6a3a1a, 0x3a2a1a, 0x8a1a1a][n], { rot: r }); });
    { const i = K(0.35), p = tr.at(i, edgeLat(i) + 7.5, 0), r = tr.yawAt(i) + Math.PI / 2;
      b.box(p.x, 1.5, p.z, 14, 6, 4, 0x8a6a4a, { rot: r }); b.boxM(mat4(p.x, 8.2, p.z, 0, r, 0, 15, 0.5, 6), SLATE); b.boxM(mat4(p.x, 8.6, p.z, 0, r, 0, 15.4, 0.3, 6.2), SNOW);
      sign(nb, 9, p.x + Math.sin(r) * 2.15, 6.3, p.z + Math.cos(r) * 2.15, 9, r);
      for (let n = -2; n <= 2; n++) if (n) nb.box(p.x + Math.cos(r) * n * 2.6 + Math.sin(r) * 2.05, 2.4, p.z - Math.sin(r) * n * 2.6 + Math.cos(r) * 2.05, 1.4, 2.2, 0.1, 0, { rot: r, mat: win });
      // station clock
      const ck = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), new THREE.MeshBasicMaterial({ color: 0xfff4d8 })); ck.position.set(p.x + Math.sin(r) * 2.4, 10.2, p.z + Math.cos(r) * 2.4); ck.rotation.y = r; ctx.group.add(ck); }
    // the Hogwarts Express on its rails beyond the platform: steams in, waits, pulls away
    { const A = tr.at(K(23.6), 0, 0), B = tr.at(K(1.15), 0, 0), dx = B.x - A.x, dz = B.z - A.z, Lr = Math.hypot(dx, dz), ux = dx / Lr, uz = dz / Lr;
      const off = edgeLat(K(0.3)) + 13, nx = -uz, nz = ux;   // right of the station line (outer side)
      const sgn = (tr.at(K(0.3), 10, 0).x - tr.at(K(0.3), 0, 0).x) * nx + (tr.at(K(0.3), 10, 0).z - tr.at(K(0.3), 0, 0).z) * nz > 0 ? 1 : -1;
      const ox = A.x + nx * off * sgn, oz = A.z + nz * off * sgn, yaw = Math.atan2(ux, uz);
      const railM = plastic(0x8a8a8a, { metal: 0.7, rough: 0.3 });
      const S0 = -130, S1 = Lr + 110;
      for (let s = S0; s < S1; s += 3) { const x = ox + ux * s, z = oz + uz * s; b.box(x, 0, z, 4.4, 0.3, 0.9, 0x4a3a2a, { rot: yaw + Math.PI / 2 }); }
      for (const sd of [-1, 1]) for (let s = S0; s < S1; s += 20) { const x = ox + ux * (s + 10) + nx * sd * 1.6, z = oz + uz * (s + 10) + nz * sd * 1.6; nb.box(x, 0.3, z, 0.3, 0.3, 20, 0, { rot: yaw, mat: railM }); }
      for (let s = S0; s < S1; s += 8) ctx.claim(ox + ux * s, oz + uz * s, 4);
      // tunnel portals at both ends of the line, set into rocky mounds
      for (const [s, f] of [[S0, -1], [S1, 1]]) { const x = ox + ux * s, z = oz + uz * s;
        for (let m = 0; m < 4; m++) b.box(x + ux * f * (6 + m * 3), -0.1, z + uz * f * (6 + m * 3), 26 - m * 4, 14 - m * 2.5, 12, m % 2 ? DKSTONE : 0x6a665e, { rot: yaw });
        b.box(x, 0, z, 9, 11, 3, STONE, { rot: yaw }); b.box(x - ux * f * 0.2, 0, z - uz * f * 0.2, 5.4, 8, 3, 0x0a0a0e, { rot: yaw }); b.cyl(x - ux * f * 0.2, 5.6, z - uz * f * 0.2, 2.7, 3, 0x0a0a0e, { seg: 12, rot: 0 });
        ctx.claim(x + ux * f * 8, z + uz * f * 8, 14); }
      const ex = P.express(4); ctx.group.add(ex.root); ex.root.rotation.y = yaw;
      const stopS = Lr * 0.72, chim = new THREE.Vector3();
      let s = -300;
      const trainS = (t) => { const T = t % 46; if (T < 9) { const f = T / 9; return stopS - 320 * (1 - f) * (1 - f); } if (T < 24) return stopS; const f = (T - 24) / 22; return stopS + 520 * f * f; };
      anims.push((dt, t) => { s = trainS(t); ex.root.position.set(ox + ux * s, 0, oz + uz * s); ex.root.visible = s > S0 && s - ex.length < S1; chim.set(ox + ux * (s - 1.4), 7.2, oz + uz * (s - 1.4)); });
      smoke(ctx, () => chim, { n: 18, life: 3.2, rise: 16, drift: 5, size: 1.1, color: 0xe8ecf4, opacity: 0.55 });
      ctx.claim(ox + ux * Lr / 2, oz + uz * Lr / 2, 8); }
    // Hagrid with his lantern ("Firs' years!"), the trio on the platform, Hedwig overhead
    { const p = tr.at(K(0.05), edgeLat(K(0.05)) + 6, 1.5); const hg = P.hagrid(3.0); hg.root.position.copy(p); faceRoad(hg.root, 0.05); ctx.group.add(hg.root);
      hg.armL.rotation.set(-1.0, 0, -0.2); const lan = new THREE.Group(); const lb = new BrickBuilder(1); lb.box(0, -0.6, 0, 0.9, 1.2, 0.9, 0x1b1b1b); lb.box(0, -0.5, 0, 0.7, 0.9, 0.7, 0, { mat: plastic(0xffd070, { emissive: 0xffb040, emissiveIntensity: 2.5 }) }); lan.add(lb.build(), P.glow(0xffc060, 6, 0.8)); lan.position.set(0, -1.6 * 3, 0.4 * 3); hg.armL.add(lan);
      anims.push((dt, t) => { hg.armL.rotation.x = -1.0 + Math.sin(t * 1.4) * 0.25; hg.armR.rotation.z = -0.3 - Math.max(0, Math.sin(t * 0.9)) * 0.9; }); }
    for (const [k, lat, fn, s] of [[0.45, 5.5, P.harry, 2.4], [0.52, 4.6, P.hermione, 2.3], [0.6, 5.8, P.ron, 2.4]]) {
      const i = K(k), p = tr.at(i, edgeLat(i) + lat, 1.5), f = fn(s); f.root.position.copy(p); faceRoad(f.root, k); ctx.group.add(f.root);
      const ph = rand() * 6; anims.push((dt, t) => { f.armR.rotation.x = -0.4 - Math.max(0, Math.sin(t * 1.6 + ph)) * 1.6; f.armL.rotation.z = 0.1 + Math.sin(t * 2 + ph) * 0.1; });
    }
    { const hw = P.hedwig(1.6); ctx.group.add(hw); const c = tr.at(K(0.6), 30, 0);
      anims.push((dt, t) => { const a = t * 0.4; hw.position.set(c.x + Math.cos(a) * 45, 26 + Math.sin(t * 0.9) * 4, c.z + Math.sin(a) * 60); hw.rotation.y = -a; hw.rotation.z = 0.25; const fl = Math.sin(t * 7) * 0.6; hw.userData.wings[0].rotation.z = -fl; hw.userData.wings[1].rotation.z = fl; }); }
    pl(0xffc070, tr.at(K(0.3), 20, 0).x, 14, tr.at(K(0.3), 20, 0).z, 3, 150);

    // ---- Hogsmeade village --------------------------------------------------------------------------
    arch(ctx, 1.45, { cols: [WOOD, DKSTONE], text: 'HOGSMEADE', bg: '#3a2414', fg: '#f0d070' });
    { const i = K(2.65), c = tr.at(i, 0, 0), rx = tr.R[i * 2], rz = tr.R[i * 2 + 1]; for (let l = 18; l < 80; l += 5) for (const sd of [-1, 1]) ctx.claim(c.x + rx * sd * l, c.z + rz * sd * l, 6.5); }
    const shopCols = [0x8a6a5a, 0x6a5a7a, 0xa88a6a, 0x5a6a5a, 0x9a7a5a, 0x7a5a4a, 0xb89a7a, 0x6a6a7a];
    const shops = [[1.75, 1, 1, 'HONEYDUKES', 0xd88aa8], [1.95, -1, 2], [2.2, 1, 4], [2.45, -1, 3], [2.95, 1, 5], [3.2, -1, 7], [3.45, 1, 6], [3.7, -1, 8], [2.0, 1, -1], [3.1, 1, -1], [2.85, -1, -1], [3.55, -1, -1], [1.6, -1, -1], [3.85, 1, -1]];
    for (const [k, sd, si, , tint] of shops) {
      const i = K(k), w = 9 + rand() * 4, d = 8 + rand() * 3, h = 5 + rand() * 3;
      const p = tr.at(i, sd * (edgeLat(i) + d / 2 + 2), 0), rot = tr.yawAt(i) + (sd > 0 ? Math.PI / 2 : -Math.PI / 2);
      if (!ctx.free(p.x, p.z, 3)) continue;
      ctx.claim(p.x, p.z, Math.max(w, d) * 0.55);
      const top = cottage(b, p.x, p.z, w, d, h, tint ?? shopCols[Math.floor(rand() * shopCols.length)], rot, { floors: h > 6.5 ? 2 : 1 });
      if (si > 0) { const fx = Math.sin(rot) * (d / 2 + 0.3), fz = Math.cos(rot) * (d / 2 + 0.3); sign(nb, si, p.x + fx, h - 0.6, p.z + fz, Math.min(w * 0.9, 8), rot); }
      if (si === 1) for (let n = 0; n < 5; n++) { const fx = Math.sin(rot) * (d / 2 + 0.6), fz = Math.cos(rot) * (d / 2 + 0.6); b.sphere(p.x + fx + Math.cos(rot) * (n - 2) * 1.3, 1.2, p.z + fz - Math.sin(rot) * (n - 2) * 1.3, 0.4, [0xff5a8a, 0x5ac8ff, 0xffe040, 0x8aff5a, 0xff9a3a][n], { matOpts: { emissive: [0xff5a8a, 0x5ac8ff, 0xffe040, 0x8aff5a, 0xff9a3a][n], emissiveIntensity: 1.2 } }); }
      if (si === 2) { const fx = Math.sin(rot) * (d / 2 + 1.2), fz = Math.cos(rot) * (d / 2 + 1.2); P.rbox(b, p.x + fx, h + 0.8, p.z + fz, 0.25, 0.25, 4, 0, rot + Math.PI / 2, 0.3, WOOD); for (let n = 0; n < 6; n++) P.rbox(b, p.x + fx + Math.cos(rot) * 2.2, h + 0.3 + n * 0.12, p.z + fz - Math.sin(rot) * 2.2, 0.12, 1.4, 0.12, 0, 0, (n - 2.5) * 0.15, 0xc8a050); }
    }
    // back rows of cottages, Christmas trees, lanterns and snowmen
    ctx.scatter(26, { minC: 22, maxC: 70, r: 7, test: (x, z) => x > 140 && z < 0 && z > -230 }, (x, z) => { const rot = rand() * 6.28; cottage(b, x, z, 8 + rand() * 4, 7 + rand() * 3, 4.5 + rand() * 3, shopCols[Math.floor(rand() * shopCols.length)], rot); });
    edges(ctx, 1.5, 3.85, 18, 1.5, (p) => { b.cyl(p.x, 0, p.z, 0.15, 5, 0x1b1b1b, { seg: 6 }); b.box(p.x, 5, p.z, 0.8, 1.0, 0.8, 0x1b1b1b); nb.box(p.x, 5.1, p.z, 0.55, 0.75, 0.55, 0, { mat: win }); });
    const fairy = [0xff4a4a, 0x4aff6a, 0xffe040, 0x4ab8ff].map((c) => plastic(c, { emissive: c, emissiveIntensity: 2 }));
    const xmas = (x, z, s) => { pine(b, x, 0, z, s, true, C.dkgreen); for (let n = 0; n < 9; n++) { const a = n * 2.3, hh = (1 + n * 0.9) * s, r = (3.4 - n * 0.33) * s; nb.sphere(x + Math.cos(a) * r, hh, z + Math.sin(a) * r, 0.25 * s, 0, { mat: fairy[n % 4] }); } nb.sphere(x, 10 * s, z, 0.5 * s, 0, { mat: plastic(0xffe060, { emissive: 0xffd040, emissiveIntensity: 2.4 }) }); };
    for (const k of [1.6, 2.35, 3.0, 3.8]) { const p = spot(k, rand() < 0.5 ? 9 : -9, 4); xmas(p.x, p.z, 1.1); ctx.claim(p.x, p.z, 4); }
    for (const k of [1.9, 3.3]) { const p = spot(k, -7, 3); b.sphere(p.x, 1.6, p.z, 1.7, SNOW); b.sphere(p.x, 4, p.z, 1.2, SNOW); b.sphere(p.x, 5.8, p.z, 0.85, SNOW); b.cone(p.x, 5.8, p.z + 0.8, 0.14, 0.9, C.orange); b.box(p.x, 4.8, p.z, 2.2, 0.35, 2.2, C.dkred); }
    // the Shrieking Shack on its hill
    { const p = spot(3.15, 70, 20); let y = 0; for (let n = 0; n < 4; n++) y = b.cyl(p.x, y, p.z, 20 - n * 4, 2, n % 2 ? 0xc8d0dc : SNOW, { seg: 16 });
      const r = 0.25; b.box(p.x, y, p.z, 9, 7, 7, 0x4a3a30, { rot: r }); b.boxM(mat4(p.x, y + 9, p.z, 0.15, r, 0.2, 10, 0.6, 9), 0x2a2420); b.box(p.x + 3, y, p.z, 1.4, 12, 1.4, 0x3a2a24, { rot: 0.3 }); for (let n = 0; n < 4; n++) b.box(p.x + Math.cos(r) * (n - 1.5) * 2, y + 2 + (n % 2) * 2, p.z - Math.sin(r) * (n - 1.5) * 2 + 3.6, 1.6, 0.4, 0.2, WOOD, { rot: r + 0.4 * (n % 2 ? 1 : -1) });
      ctx.claim(p.x, p.z, 21); }
    // the Knight Bus thundering through the village crossroads
    { const i = K(2.65), c = tr.at(i, 0, 0), rx = tr.R[i * 2], rz = tr.R[i * 2 + 1], yaw = tr.yawAt(i);
      for (const sd of [-1, 1]) b.box(c.x + rx * sd * 45, -0.04, c.z + rz * sd * 45, 9, 0.1, 60, 0x9aa2b0, { rot: yaw + Math.PI / 2 });
      ctx.hazard(knightBusCrossing(ctx, { k: 2.65, period: 8.5, reach: 66 })); }
    // Dobby (a free elf!), Luna and Neville in the village
    { const p = spot(2.05, -8, 3); const db = add(P.dobby(1.5), p, 2.05); anims.push((dt, t) => { db.armL.rotation.x = -2.6 + Math.sin(t * 6) * 0.3; db.root.position.y = Math.abs(Math.sin(t * 3)) * 0.6; }); }
    { const p = spot(3.3, 8, 3); const ln = add(P.luna(2.3), p, 3.3); ln.armR.rotation.x = -1.2; anims.push((dt, t) => { ln.root.rotation.z = Math.sin(t * 1.2) * 0.04; }); }
    { const p = spot(3.6, -8, 3); const nv = add(P.neville(2.3), p, 3.6); nv.armL.rotation.x = -0.8; }
    pl(0xffb060, tr.at(K(2.6), 0, 0).x, 16, tr.at(K(2.6), 0, 0).z, 3.2, 160);

    // ---- the viaduct ----------------------------------------------------------------------------------
    arch(ctx, 4.3, { cols: [STONE, DKSTONE], text: 'HOGWARTS', bg: '#2a1a40', fg: '#f0d070' });
    { const piers = [];
      each(tr, 4.4, 7.6, 16, (i) => piers.push(i));
      for (let n = 0; n < piers.length; n++) {
        const i = piers[n], p = tr.at(i, 0, 0), yaw = tr.yawAt(i), w = 2 * edgeLat(i) + 3, top = p.y - 1;
        if (top < 2) continue;
        b.box(p.x, -6, p.z, w, top + 6, 3.4, n % 2 ? STONE : STONE2, { rot: yaw });
        b.box(p.x, -6, p.z, w + 1.2, 2, 4.6, DKSTONE, { rot: yaw });
        if (n + 1 < piers.length) {
          const j = piers[n + 1], q = tr.at(j, 0, 0), dx = q.x - p.x, dz = q.z - p.z, span = Math.hypot(dx, dz), ay = (p.y + q.y) / 2 - 1;
          if (ay < 4) continue;
          for (let m = 1; m < 8; m++) {
            const f = m / 8, a = f * Math.PI, hh = Math.sin(a) * Math.min(span * 0.42, ay * 0.6);
            const x = p.x + dx * f, z = p.z + dz * f, y0 = ay - (Math.min(span * 0.42, ay * 0.6) - hh) - 1.6;
            b.box(x, y0, z, w, ay - y0 + 0.2, span / 8 + 0.3, m % 2 ? STONE2 : STONE, { rot: Math.atan2(dx, dz) + Math.PI / 2 * 0 });
          }
        }
      }
      each(tr, 4.4, 7.6, 12, (i) => { for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) + 1.2), 0); b.cyl(q.x, q.y + 1.2, q.z, 0.14, 4.5, 0x1b1b1b, { seg: 6 }); b.box(q.x, q.y + 5.7, q.z, 0.8, 1.0, 0.8, 0x1b1b1b); nb.box(q.x, q.y + 5.8, q.z, 0.55, 0.75, 0.55, 0, { mat: win }); } });
      // rocks on the gorge banks
      for (let n = 0; n < 40; n++) { const z = -420 + n * 8 + rand() * 6, x = 40 + (n % 2 ? 1 : -1) * (20 + rand() * 10) - (z > -215 ? (z + 215) * 0.1 : 0); if (tr.clearance(x, z, 10) < 3 || !hole.test(x, z)) continue; rock(b, x, -1, z, 1.4 + rand(), rand, [DKSTONE, 0x6a665e, C.ltgray]); }
    }
    // Dementors over the bridge
    { const c = tr.at(K(6.1), 0, 0); const T = [[5.2, -0.35], [5.6, 0.3], [6.0, 0], [6.4, -0.3], [6.8, 0.3], [7.2, 0]];
      ctx.hazard(dementorSwoop(ctx, { center: c, targets: T, period: 5.2, offset: 0 }));
      ctx.hazard(dementorSwoop(ctx, { center: tr.at(K(5.4), 0, 0), targets: T.slice(0, 3), period: 6.1, offset: 2.4 }));
      ctx.hazard(dementorSwoop(ctx, { center: tr.at(K(6.9), 0, 0), targets: T.slice(3), period: 5.7, offset: 4.1 }));
      // a ring of Dementors circling high over the gorge
      for (let n = 0; n < 7; n++) { const d = P.dementor(1.4); ctx.group.add(d); const r = 50 + (n % 3) * 18, h = 34 + (n % 4) * 6, sp = 0.14 + (n % 3) * 0.04, a0 = n * 0.9;
        anims.push((dt, t) => { const a = a0 + t * sp; d.position.set(c.x + Math.cos(a) * r, h + Math.sin(t + n) * 3, c.z + Math.sin(a) * r * 0.7); d.rotation.y = -a; }); }
      motes(ctx, c.x, 0, c.z, 70, 30, 120, 0xbfe8ff, 1.0, 0.5); }
    // Harry's stag Patronus galloping along the gorge
    { const pb = new BrickBuilder(1), PM = plastic(0xd8f0ff, { trans: true, opacity: 0.65, emissive: 0x9ad8ff, emissiveIntensity: 2.2 });
      pb.box(0, 2.4, 0, 1.4, 1.4, 3.6, 0, { mat: PM }); P.rbox(pb, 0, 3.6, 2.0, 0.8, 1.8, 0.8, 0.6, 0, 0, 0, { mat: PM }); pb.box(0, 4.2, 2.6, 0.9, 0.9, 1.4, 0, { mat: PM });
      for (const sd of [-1, 1]) { for (const z of [1.2, -1.2]) pb.box(sd * 0.5, 0, z, 0.3, 2.4, 0.3, 0, { mat: PM }); for (let m = 0; m < 3; m++) P.rbox(pb, sd * (0.6 + m * 0.4), 5.4 + m * 0.5, 2.4 - m * 0.2, 0.16, 1.4, 0.16, 0, 0, sd * (0.5 + m * 0.2), 0, { mat: PM }); }
      const stag = new THREE.Group(); stag.add(pb.build({ name: 'patronus', shadows: false }), P.glow(0xbfe8ff, 18, 0.6)); ctx.group.add(stag);
      anims.push((dt, t) => { const f = (t * 0.06) % 1, z = -400 + f * 330; stag.position.set(35 + Math.sin(f * 9) * 6, -1.6 + Math.abs(Math.sin(t * 6)) * 0.8, z); stag.rotation.y = 0.05; }); }

    // ---- the castle -------------------------------------------------------------------------------------
    const CX = -112, CZ = -108;
    { // rocky hill
      for (let n = 0; n < 7; n++) { const a = n * 0.9, r = 34 + (n % 3) * 8; b.box(CX + Math.cos(a) * 16, -0.1, CZ + Math.sin(a) * 14, r * 1.6, 5 + (n % 2) * 2, r * 1.3, n % 2 ? DKSTONE : 0x6a665e, { rot: a }); }
      for (let n = 0; n < 7; n++) { const a = n * 0.9, r = 34 + (n % 3) * 8; b.box(CX + Math.cos(a) * 16, 4.9 + (n % 2) * 2, CZ + Math.sin(a) * 14, r * 1.6 + 0.4, 0.4, r * 1.3 + 0.4, SNOW, { rot: a }); }
      b.box(CX, 5, CZ, 96, 2, 80, 0x6a665e, { rot: 0.1 }); b.box(CX, 7, CZ, 96.4, 0.12, 80.4, 0xc8d0dc, { rot: 0.1 });
      for (let n = 0; n < 24; n++) { const a = n / 24 * Math.PI * 2; rock(b, CX + Math.cos(a) * 58, -0.5, CZ + Math.sin(a) * 50, 2.2 + rand() * 1.6, rand, [DKSTONE, 0x6a665e, 0x8a8478]); }
      const Y = 7, w = (x, z, sx, sz, h, col = STONE) => b.box(CX + x, Y, CZ + z, sx, h, sz, col, { rot: 0 });
      // main keep with rows of lit windows
      w(0, 0, 54, 24, 24); w(0, 0, 56, 26, 1.2, DKSTONE);
      for (let f = 0; f < 4; f++) for (let n = -6; n <= 6; n++) for (const sd of [-1, 1]) nb.box(CX + n * 4, Y + 3 + f * 5.2, CZ + sd * 12.05, 1.2, 2.4, 0.2, 0, { mat: win });
      for (let n = -6; n <= 6; n++) for (const sd of [-1, 1]) b.brick(CX + n * 4.3, Y + 24, CZ + sd * 12.3, 2, 1, 3, STONE, { pitch: 1.4 });
      for (const sd of [-1, 1]) b.boxM(mat4(CX, Y + 28, CZ + sd * 6.5, sd * 0.75, 0, 0, 52, 1, 17), SLATE);
      // east wing toward the viaduct + clock tower
      w(38, -14, 26, 18, 18); for (let f = 0; f < 3; f++) for (let n = -2; n <= 2; n++) nb.box(CX + 38 + n * 4.5, Y + 3 + f * 5, CZ - 14 + 9.05, 1.2, 2.4, 0.2, 0, { mat: win });
      for (const sd of [-1, 1]) b.boxM(mat4(CX + 38, Y + 21.5, CZ - 14 + sd * 4.8, sd * 0.75, 0, 0, 25, 1, 12), SLATE);
      w(52, -24, 9, 9, 40); b.cone(CX + 52, Y + 40, CZ - 24, 7.4, 12, SLATE, { seg: 4, rot: Math.PI / 4 });
      const clock = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); clock.position.set(CX + 52, Y + 33, CZ - 24 - 4.56); clock.rotation.y = Math.PI; ctx.group.add(clock);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.1).translate(0, 1.2, 0), new THREE.MeshBasicMaterial({ color: 0x1b1b1b })); hand.position.copy(clock.position); hand.position.z -= 0.1; hand.rotation.y = Math.PI; ctx.group.add(hand);
      anims.push((dt, t) => { hand.rotation.z = -t * 0.2; });
      // towers
      const towers = [[-30, -14, 5.5, 56, C.dkred], [30, 12, 4.5, 44, 0x1a2e6a], [-24, 14, 4, 40, null], [0, -16, 3.6, 36, null], [26, -12, 4, 34, 0xe8c030], [-36, 6, 3.4, 30, null], [16, 16, 3, 32, 0x1a5a32], [48, -2, 3.6, 28, null], [-10, 18, 3, 26, null], [62, -12, 3, 24, null]];
      for (const [x, z, r, h, flag] of towers) P.castleTower(b, CX + x, Y, CZ + z, r, h, { win, flag, roofH: 2.0 + (h > 40 ? 0.6 : 0) });
      // Astronomy Tower: tallest, with an open top
      { const x = CX - 44, z = CZ - 22; let yy = Y; for (let n = 0; n < 22; n++) yy = b.cyl(x, yy, z, 5, 3, n % 2 ? STONE : STONE2, { seg: 14 }); b.cyl(x, yy, z, 6.4, 1, DKSTONE, { seg: 14 }); for (let n = 0; n < 8; n++) { const a = n / 8 * Math.PI * 2; b.box(x + Math.cos(a) * 5.6, yy + 1, z + Math.sin(a) * 5.6, 1, 5, 1, STONE); } b.cone(x, yy + 6, z, 7, 12, SLATE, { seg: 14 }); for (let f = Y + 6; f < yy; f += 6) nb.box(x + 5.05, f, z, 0.2, 2.4, 1.2, 0, { mat: win }); }
      ctx.claim(CX, CZ, 62);
      pl(0xffb060, CX + 20, 40, CZ + 30, 4, 220);
    }
    // castle gate at the end of the viaduct: towers and winged boars on pillars
    { const i = K(7.8), yaw = tr.yawAt(i);
      for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 4), 0); P.castleTower(b, p.x, 0, p.z, 4, p.y + 18, { win, roofH: 1.8 });
        const q = tr.at(K(7.55), sd * (edgeLat(K(7.55)) + 2.4), 0); b.box(q.x, 0, q.z, 2.2, q.y + 5, 2.2, STONE, { rot: yaw }); const by = q.y + 5;
        b.box(q.x, by, q.z, 1.2, 1.2, 2.2, 0x9a948a, { rot: yaw }); b.box(q.x + Math.sin(yaw) * 1.3, by + 0.6, q.z + Math.cos(yaw) * 1.3, 0.9, 0.9, 0.9, 0x9a948a, { rot: yaw });
        for (const w2 of [-1, 1]) P.rbox(b, q.x + Math.cos(yaw) * w2 * 0.9, by + 1.6, q.z - Math.sin(yaw) * w2 * 0.9, 0.2, 1.8, 1.4, 0, yaw, w2 * 0.5, 0x9a948a); }
      const c = tr.at(i, 0, 0); b.box(c.x, c.y + 13, c.z, 2 * edgeLat(i) + 10, 4, 4, STONE, { rot: yaw }); for (let n = -4; n <= 4; n++) b.brick(c.x + Math.cos(yaw) * n * 3.2, c.y + 17, c.z - Math.sin(yaw) * n * 3.2, 1, 2, 3, STONE, { pitch: 1.6, rot: yaw }); }
    // Dumbledore and McGonagall greeting racers at the gate, Snape lurking in the courtyard
    { const p = spot(7.95, -26, 5); const dd = add(P.dumbledore(3.0), p, 7.95); dd.armR.rotation.set(-2.2, 0, 0.3);
      const lum = P.glow(0xe8f4ff, 8, 0.8); lum.position.set(-0.56 * 3, 2.64 * 3 + 1.5 * 3, 0.9 * 3); dd.root.add(lum);
      anims.push((dt, t) => { dd.armR.rotation.x = -2.2 + Math.sin(t * 1.1) * 0.25; lum.material.opacity = 0.6 + 0.3 * Math.sin(t * 4); }); }
    { const p = spot(8.05, 28, 5); const mg = add(P.mcgonagall(2.8), p, 8.05); mg.armR.rotation.x = -1.3; }
    { const p = spot(9.6, -22, 5); const sn = add(P.snape(2.8), p, 9.6); sn.armR.rotation.x = -1.1; anims.push((dt, t) => { sn.root.rotation.y += Math.sin(t * 0.5) * 0.002; }); }

    // ---- the Great Hall ----------------------------------------------------------------------------------
    tunnel(ctx, 8.2, 9.35, { wall: STONE, roof: 0x1a2050, height: 15, lights: 0xffd890, stud: false });
    { const cb = new BrickBuilder(1);
      each(tr, 8.22, 9.33, 2, (i) => {
        const yaw = tr.yawAt(i), w = edgeLat(i);
        for (let n = 0; n < 3; n++) { const q = tr.at(i, (rand() - 0.5) * 2 * w * 0.9, 0); P.candle(cb, q.x, q.y + 9 + rand() * 3.5, q.z, 1.0); }
        // enchanted ceiling stars
        if (rand() < 0.7) { const q = tr.at(i, (rand() - 0.5) * 2 * w, 0); nb.box(q.x, q.y + 15 + Math.max(0, tr.BK[i]) - 0.05 + 0.0, q.z, 0.25, 0.08, 0.25, 0, { mat: plastic(0xffffff, { emissive: 0xffffff, emissiveIntensity: 2 }) }); }
      });
      const candles = cb.build({ name: 'candles', shadows: false }); ctx.group.add(candles);
      anims.push((dt, t) => { candles.position.y = Math.sin(t * 1.2) * 0.4; });
      const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
      let n = 0;
      each(tr, 8.3, 9.25, 9, (i) => { const yaw = tr.yawAt(i); for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) + 0.15), 0); P.banner(b, q.x, q.y + 13.5, q.z, houses[(n + (sd > 0 ? 2 : 0)) % 4], yaw + (sd > 0 ? Math.PI / 2 : -Math.PI / 2), 3.2, 6.5); } n++; });
      // long house tables on the shoulders
      each(tr, 8.3, 9.25, 4, (i) => { const yaw = tr.yawAt(i); for (const sd of [-1, 1]) { const q = tr.at(i, sd * (tr.HW[i] + 1.1), 0); b.box(q.x, q.y, q.z, 1.4, 1.1, 4.2, WOOD, { rot: yaw }); nb.box(q.x, q.y + 1.1, q.z, 0.3, 0.3, 0.3, 0xf2cd37, { matOpts: { metal: 0.8, rough: 0.2 } }); } });
      // the hall's outside: tall walls, arched windows and a steep roof
      each(tr, 8.2, 9.35, 3, (i) => {
        const yaw = tr.yawAt(i), w = edgeLat(i) + 1.4, c = tr.at(i, 0, 0);
        for (const sd of [-1, 1]) { const q = tr.at(i, sd * (w + 0.4), 0); b.box(q.x, q.y + 10, q.z, 2.6, 13, 3.4, STONE2, { rot: yaw }); }
        const top = c.y + 23;
        for (const sd of [-1, 1]) { const q = tr.at(i, sd * w * 0.52, 0); b.boxM(mat4(q.x, top + w * 0.36, q.z, 0, yaw, sd * 0.62, w * 1.28, 0.9, 3.4), SLATE); }
      });
      each(tr, 8.25, 9.3, 9, (i) => { for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) + 3.3), 0); nb.box(q.x, q.y + 8, q.z, 0.2, 9, 2.2, 0, { rot: tr.yawAt(i), mat: win }); } });
      { const c = tr.at(K(8.75), 0, 0); pl(0xffc070, c.x, c.y + 11, c.z, 4, 90); }
    }

    // ---- Quidditch pitch ----------------------------------------------------------------------------------
    arch(ctx, 10.3, { cols: [C.dkred, C.gold], text: 'QUIDDITCH PITCH', bg: '#5a0a0a', fg: '#f0d070' });
    { const tall = [['gryffindor'], ['slytherin'], ['ravenclaw'], ['hufflepuff']];
      let n = 0;
      // stands along the outer side and behind the far side of the pitch
      each(tr, 10.45, 12.5, 14, (i) => {
        const yaw = tr.yawAt(i), hs = P.HOUSES[tall[n++ % 4][0]];
        for (const lat of [edgeLat(i) + 7, -(edgeLat(i) + 92)]) {
          const p = tr.at(i, lat, 0); if (!ctx.free(p.x, p.z, 5) && lat < 0) continue;
          const h = 16 + (n % 3) * 4;
          b.box(p.x, 0, p.z, 6, h, 6, 0x6a4a30, { rot: yaw }); for (let m = 0; m < 4; m++) b.box(p.x, m * h / 4, p.z, 6.4, 0.5, 6.4, 0x4a3420, { rot: yaw });
          b.box(p.x, h, p.z, 8, 4, 8, hs[0], { rot: yaw }); b.box(p.x, h + 1.5, p.z, 8.2, 0.6, 8.2, hs[1], { rot: yaw });
          b.cone(p.x, h + 4, p.z, 6.4, 6, hs[0], { seg: 4, rot: yaw + Math.PI / 4 }); b.cyl(p.x, h + 10, p.z, 0.12, 3, 0x3a3a3a, { seg: 4 }); b.box(p.x + 0.8, h + 11.6, p.z, 1.6, 1, 0.08, hs[1]);
          for (let m = -1; m <= 1; m++) { const fx = Math.cos(yaw) * m * 2.4, fz = -Math.sin(yaw) * m * 2.4; nb.box(p.x + fx, h + 2.1, p.z + fz, 0.6, 0.6, 0.6, 0, { mat: plastic([0xff5a5a, 0x5ac85a, 0x5a8aff, 0xffe05a][(n + m + 3) % 4], { emissive: [0xc83030, 0x30a030, 0x3060c8, 0xc8a030][(n + m + 3) % 4], emissiveIntensity: 1 }) }); }
          ctx.claim(p.x, p.z, 5);
        }
      });
      // three golden hoops at each end of the pitch
      const hoopGeo = new THREE.TorusGeometry(2.6, 0.32, 8, 24);
      for (const k of [10.5, 12.45]) { const i = K(k), yaw = tr.yawAt(i);
        [[-24, 18], [-46, 24], [-68, 18]].forEach(([lat, h]) => { const p = tr.at(i, lat, 0); b.cyl(p.x, 0, p.z, 0.35, h, 0xd8b040, { seg: 8, matOpts: { metal: 0.6, rough: 0.3 } }); b.add(hoopGeo, plastic(0xe8c040, { metal: 0.7, rough: 0.25, emissive: 0x6a4a10, emissiveIntensity: 0.4 }), p.x, h + 2.6, p.z, yaw); });
      }
      // Harry and Draco on broomsticks chasing the Snitch above the pitch
      const broom = (fig, s) => { const bb = new BrickBuilder(1); bb.box(0, 1.25 * s, 0.3 * s, 0.16 * s, 0.16 * s, 3.4 * s, 0x6a4a2a); for (let m = 0; m < 8; m++) P.rbox(bb, Math.cos(m) * 0.25 * s, 1.33 * s + Math.sin(m) * 0.25 * s, -1.9 * s, 0.1 * s, 0.1 * s, 1.6 * s, Math.sin(m) * 0.15, Math.cos(m) * 0.15, 0, 0xc8a050); fig.root.add(bb.build({ name: 'broom' })); };
      const sn = P.snitch(1.4); ctx.group.add(sn);
      const flyers = [[P.harry(1.7), 0], [P.draco(1.7), -0.6]].map(([f, lag]) => { broom(f, 1.7); f.armR.rotation.x = -1.4; f.armL.rotation.x = -0.6; ctx.group.add(f.root); return { f, lag }; });
      const pc = pitchC, py = pitchYaw, fx = Math.sin(py), fz = Math.cos(py), rx = Math.cos(py), rz = -Math.sin(py);
      const sPos = (t, o) => { const u = Math.sin(t * 0.33) * 85, v = Math.sin(t * 0.71 + 1) * 30; return o.set(pc.x + fx * u + rx * v, 14 + Math.sin(t * 1.3) * 6, pc.z + fz * u + rz * v); };
      anims.push((dt, t) => {
        sPos(t, sn.position); const fl = Math.sin(t * 40) * 0.7; sn.userData.wings[0].rotation.z = fl; sn.userData.wings[1].rotation.z = -fl;
        for (const { f, lag } of flyers) { sPos(t - 0.8 + lag, V1); sPos(t - 0.75 + lag, V2); f.root.position.copy(V1); f.root.position.y -= 2; f.root.rotation.y = Math.atan2(V2.x - V1.x, V2.z - V1.z); f.root.rotation.z = Math.sin(t * 0.71) * 0.3; }
      });
      // Bludgers on the pitch
      ctx.hazard(bludgers(ctx, { k: 11.1, along: 40, wx: 0.45, wz: 1.25, ph: 0 }));
      ctx.hazard(bludgers(ctx, { k: 11.8, along: 40, wx: 0.38, wz: 1.05, ph: 2.1 }));
      ctx.hazard(bludgers(ctx, { k: 11.45, along: 55, wx: 0.3, wz: 0.85, ph: 4.0, latF: 0.7 }));
      // Draco-free spectators: students with scarves along the pitch rail
      const scarves = [0x8a1a1a, 0x1a5a32, 0x1a2e6a, 0xe8c030];
      edges(ctx, 10.5, 12.4, 3, 2.5, (p, i) => { if (rand() < 0.75) minifig(b, p.x, 0, p.z, tr.yawAt(i) + Math.PI / 2, scarves[Math.floor(rand() * 4)], rand); }, [1]);
    }

    // ---- Hagrid's hut, the pumpkin patch and the Whomping Willow --------------------------------------------
    { const p = spot(13.3, -22, 9); const hx = p.x, hz = p.z;
      let y = 0; for (let n = 0; n < 4; n++) y = b.cyl(hx, y, hz, 6.5, 1.6, n % 2 ? 0x8a7a6a : 0x7a6a5a, { seg: 10 });
      b.cone(hx, y, hz, 8.2, 6.5, 0x6a5030, { seg: 10 }); b.cone(hx, y + 0.3, hz, 7.4, 5.6, SNOW, { seg: 10 });
      const q = tr.at(K(13.3), 0, 0), rot = Math.atan2(q.x - hx, q.z - hz);
      b.box(hx + Math.sin(rot) * 6.3, 0, hz + Math.cos(rot) * 6.3, 2.4, 3.6, 0.6, WOOD, { rot });
      for (const sd of [-1, 1]) nb.box(hx + Math.sin(rot + sd * 0.6) * 6.4, 2.2, hz + Math.cos(rot + sd * 0.6) * 6.4, 1.3, 1.3, 0.3, 0, { rot: rot + sd * 0.6, mat: win });
      b.box(hx - 3, y - 1, hz - 2, 1.6, 8, 1.6, DKSTONE); smoke(ctx, new THREE.Vector3(hx - 3, y + 7, hz - 2), { n: 10, life: 5, rise: 18, size: 0.9, color: 0xb8bcc8, opacity: 0.45 });
      ctx.claim(hx, hz, 9);
      // pumpkin patch with giant pumpkins and a low fence
      const pp = spot(12.95, -24, 10); for (let n = 0; n < 14; n++) { const a = rand() * 6.28, r = rand() * 8; P.pumpkin(b, pp.x + Math.cos(a) * r, pp.z + Math.sin(a) * r, 0.8 + rand() * 1.6); } ctx.claim(pp.x, pp.z, 10);
      for (let n = 0; n < 16; n++) { const a = n / 16 * Math.PI * 2; b.box(pp.x + Math.cos(a) * 11, 0, pp.z + Math.sin(a) * 11, 0.4, 1.6, 4.2, WOOD, { rot: -a }); }
      const bk = P.buckbeak(1.6); bk.position.set(pp.x + 12, 0, pp.z - 9); bk.rotation.y = rot; ctx.group.add(bk);
      const fg = P.fang(1.1); fg.position.set(hx + Math.sin(rot) * 9, 0, hz + Math.cos(rot) * 9); fg.rotation.y = rot + 0.5; ctx.group.add(fg); anims.push((dt, t) => { fg.rotation.z = Math.sin(t * 6) * 0.04; }); }
    ctx.hazard(whompingWillow(ctx, { k: 14.15, side: 1, period: 5.4 }));
    edges(ctx, 13.9, 14.5, 10, 3, (p) => { if (rand() < 0.6) rock(b, p.x, 0, p.z, 0.8 + rand() * 0.6, rand, [DKSTONE, 0x6a665e]); }, [1]);
    // the flying Ford Anglia stuck near the willow
    { const p = spot(14.5, 14, 4); const car = P.fordAnglia(); car.position.set(p.x, 0.6, p.z); car.rotation.set(0.1, 1.2, 0.18); ctx.group.add(car); ctx.claim(p.x, p.z, 4); }

    // ---- the Forbidden Forest ------------------------------------------------------------------------------
    arch(ctx, 14.9, { cols: [0x2a2420, 0x1a2a1a], text: 'FORBIDDEN FOREST', bg: '#0a140a', fg: '#9adf7a' });
    const darkTree = (x, z, s) => { if (rand() < 0.55) pine(b, x, 0, z, s, rand() < 0.4, rand() < 0.5 ? 0x1a3a2a : 0x22402c); else { const h = (9 + rand() * 6) * s; b.cyl(x, 0, z, 0.9 * s, h, 0x3a2c20, { seg: 7 }); for (let n = 0; n < 4; n++) { const a = n * 1.6 + rand(); P.beam(b, x, h * 0.6, z, x + Math.cos(a) * 4 * s, h * 0.9, z + Math.sin(a) * 4 * s, 0.4 * s, 0x3a2c20); b.sphere(x + Math.cos(a) * 4 * s, h * 0.95, z + Math.sin(a) * 4 * s, 2.4 * s, 0x1e3424, { sy: 0.7 }); } } };
    edges(ctx, 14.8, 18.3, 6, 2.5, (p, i) => { if (rand() < 0.85) darkTree(p.x + (rand() - 0.5) * 3, p.z + (rand() - 0.5) * 3, 1.1 + rand() * 0.6); });
    ctx.scatter(170, { minC: 4, maxC: 130, r: 4, test: (x, z) => forest.test(x, z) && hole.test(x, z) }, (x, z) => darkTree(x, z, 1.2 + rand() * 0.9));
    // glowing eyes in the dark, cobwebs between trees
    const eyeM = plastic(0xd0ff60, { emissive: 0xc0ff40, emissiveIntensity: 2.6 });
    for (let n = 0; n < 26; n++) { const k = 14.9 + rand() * 3.3, sd = rand() < 0.5 ? -1 : 1, i = K(k), p = tr.at(i, sd * (edgeLat(i) + 8 + rand() * 14), 0), yaw = tr.yawAt(i), hh = 1 + rand() * 4; for (const e of [-0.4, 0.4]) nb.sphere(p.x + Math.sin(yaw) * e, hh, p.z + Math.cos(yaw) * e, 0.15, 0, { mat: eyeM }); }
    const webM = plastic(0xe8e8f0, { trans: true, opacity: 0.5 });
    edges(ctx, 15.8, 17.3, 9, 1, (p, i, sd) => { const yaw = tr.yawAt(i); for (let m = 0; m < 5; m++) P.rbox(nb, p.x, 4 + m * 0.3, p.z, 0.06, 0.06, 6, m * 0.6, yaw, 0, 0, { mat: webM }); for (let m = 0; m < 3; m++) P.rbox(nb, p.x, 4.6, p.z, 0.06, 2 + m * 1.5, 0.06, 0, yaw + m * 1.0, 0, 0, { mat: webM }); });
    // Aragog in his hollow
    { const p = spot(16.6, 26, 12); const ar = P.spider(4.2, 0x2a2420); ar.position.set(p.x, 0, p.z); faceRoad(ar, 16.6); ctx.group.add(ar); ctx.claim(p.x, p.z, 14);
      anims.push((dt, t) => { P.spiderWalk(ar, t * 1.6, 0.18); ar.position.y = Math.sin(t * 1.1) * 0.3; });
      for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2; P.beam(nb, p.x + Math.cos(a) * 18, 0, p.z + Math.sin(a) * 18, p.x + Math.cos(a + 0.6) * 10, 14, p.z + Math.sin(a + 0.6) * 10, 0.08, 0, { mat: webM }); } }
    for (let n = 0; n < 6; n++) { const p = spot(15.6 + n * 0.3, (n % 2 ? 1 : -1) * 18, 3); const sp = P.spider(0.9); sp.position.set(p.x, 0, p.z); sp.rotation.y = rand() * 6; ctx.group.add(sp); const ph = rand() * 6; anims.push((dt, t) => P.spiderWalk(sp, t * 3 + ph, 0.2)); }
    // spiders scuttling across the path
    for (const [k, off, sp] of [[15.75, 0, 7], [16.35, 0.5, 6], [16.95, 0.2, 8]]) {
      const s = P.spider(0.85); const hold = new THREE.Group(); hold.add(s);
      ctx.hazard(crossing(ctx, { mesh: hold, k, speed: sp, radius: 1.8, kind: 'bump', offset: off, span: 1.1 }));
      anims.push((dt, t) => P.spiderWalk(s, t * 12, 0.35));
    }
    // Voldemort in a dark clearing near the creek
    { const p = spot(17.75, -24, 6); const vd = add(P.voldemort(3.0), p, 17.75); vd.armR.rotation.set(-1.5, 0, 0.2);
      const g2 = P.glow(0x40ff60, 10, 0.8); g2.position.set(-0.56 * 3, 2.64 * 3, 1.6 * 3); vd.root.add(g2);
      anims.push((dt, t) => { g2.material.opacity = 0.4 + 0.4 * Math.abs(Math.sin(t * 3)); vd.armR.rotation.x = -1.5 + Math.sin(t * 0.9) * 0.15; });
      motes(ctx, p.x, 0, p.z, 10, 10, 50, 0x40ff60, 0.9); }
    pl(0x8aff9a, tr.at(K(16.4), 0, 0).x, 12, tr.at(K(16.4), 0, 0).z, 2.2, 120);
    // the creek under the jump
    { const i = K(17.59); for (let n = 0; n < 6; n++) { const p = tr.at(i + (n % 2 ? 4 : -4), (n - 2.5) * 6, 0); rock(b, p.x, -2.5, p.z, 1.2, rand, [DKSTONE, 0x5a5048]); } }

    // ---- the cliff and the Black Lake ----------------------------------------------------------------------------
    { let n = 0; each(tr, 18.4, 20.05, 7, (i) => { const p = tr.at(i, edgeLat(i) + 7 + (n % 3) * 3, 0); b.box(p.x, -0.1, p.z, 10 + (n % 3) * 4, Math.max(2, p.y - 1 + (n % 2) * 4), 9, n % 2 ? DKSTONE : 0x6a665e, { rot: tr.yawAt(i) + n }); n++; if (n % 2) pine(b, p.x, Math.max(2, p.y - 1), p.z, 1.1, true, 0x1a3a2a); }); }
    arch(ctx, 19.85, { cols: [DKSTONE, 0x1a2a4a], text: 'THE BLACK LAKE', bg: '#0a1830', fg: '#9ad8ff' });
    // the giant squid in the bay under the glide
    { const SQ = new THREE.Vector3(185, -2.4, 340), sb = new BrickBuilder(1), SK = 0xb04a5a;
      sb.add(new THREE.ConeGeometry(1, 1, 12).translate(0, 0.5, 0), plastic(SK), 0, 0, 0, 0, 7, 16, 7);
      for (const sd of [-1, 1]) { P.rbox(sb, sd * 5, 12, 0, 6, 0.6, 4, 0, 0, sd * 0.5, 0x9a3a4c); sb.sphere(sd * 4.4, 3.4, 3.6, 1.5, 0xf4f0d0); sb.sphere(sd * 4.6, 3.4, 4.8, 0.8, 0x1b1b1b); }
      const body = new THREE.Group(); body.add(sb.build({ name: 'squid' })); body.position.copy(SQ); body.scale.setScalar(1.6); ctx.group.add(body);
      const arms = [];
      for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2, g = new THREE.Group(), tb = new BrickBuilder(1); for (let m = 0; m < 7; m++) tb.cyl(0, m * 2.2, 0, 1.2 - m * 0.14, 2.3, m % 2 ? SK : 0x9a3a4c, { seg: 8 }); g.add(tb.build({ name: 'squid-arm' })); g.position.set(SQ.x + Math.cos(a) * 15, -3, SQ.z + Math.sin(a) * 15); g.scale.setScalar(1.5); ctx.group.add(g); arms.push([g, a]); }
      anims.push((dt, t) => { body.position.y = SQ.y - 3 + Math.sin(t * 0.6) * 1.5; body.rotation.y = Math.sin(t * 0.2) * 0.4; arms.forEach(([g, a], n) => { g.rotation.set(Math.sin(t * 1.3 + n) * 0.5 + Math.sin(a) * 0.4, 0, Math.cos(t * 1.1 + n * 2) * 0.5 - Math.cos(a) * 0.4); }); }); }
    // first-years' boats with lanterns crossing the lake toward the castle
    for (let n = 0; n < 5; n++) { const bt = new BrickBuilder(1); bt.box(0, 0, 0, 2.2, 0.9, 4.6, WOOD); bt.box(0, 0.9, 1.9, 0.2, 2, 0.2, 0x1b1b1b); bt.sphere(0, 2.9, 1.9, 0.35, 0, { mat: plastic(0xffd070, { emissive: 0xffb040, emissiveIntensity: 2.4 }) }); for (let m = 0; m < 3; m++) bt.cyl((m - 1) * 0.6, 0.9, -0.6 + (m % 2) * 0.8, 0.3, 1.2, [0x15161c, 0x8a1a1a, 0x1a2e6a][m], { seg: 8 });
      const g = bt.build({ name: 'boat' }); g.add(P.glow(0xffc060, 4, 0.7)).children.at(-1).position.set(0, 2.9, 1.9); ctx.group.add(g);
      const ph = n * 0.2; anims.push((dt, t) => { const f = ((t * 0.012 + ph) % 1), x = 110 - f * 150, z = 150 - f * 130; g.position.set(x + Math.sin(n * 3) * 8 + Math.sin(t * 0.3 + n) * 2, -2.3 + Math.sin(t * 1.5 + n) * 0.15, z + n * 7); g.rotation.y = Math.atan2(-150, -130); }); }
    // boathouse and jetty on the shore
    { const p = spot(22.95, 16, 6); const rot = tr.yawAt(K(22.95)); b.box(p.x, -2.4, p.z, 10, 7.4, 8, WOOD, { rot }); for (const sd of [-1, 1]) b.boxM(mat4(p.x + Math.cos(rot) * sd * 2.6, 6.2, p.z - Math.sin(rot) * sd * 2.6, 0, rot, sd * 0.7, 7, 0.5, 9), SLATE); nb.box(p.x, 1.5, p.z + 0, 2, 2, 8.2, 0, { rot, mat: win }); ctx.claim(p.x, p.z, 7); }
    // tentacles slamming across the shore road (from the lake side)
    for (const [k, latF, off] of [[22.2, -0.15, 0], [22.6, 0.25, 1.6], [23.0, -0.2, 3.2]]) {
      const i = K(k), S = tr.at(i, edgeLat(i) + 9, 0); S.y = -2.2;
      ctx.hazard(tentacleSlam(ctx, { S, T: tr.at(i, latF * tr.HW[i], 0.1), period: 4.8, offset: off }));
    }
    motes(ctx, 120, -2, 120, 120, 12, 160, 0x9ad8ff, 1.0, 0.4);

    // ---- distant highlands, the moon -------------------------------------------------------------------------------
    for (let a = 0; a < Math.PI * 2; a += 0.11) {
      const r = 820 + rand() * 160, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 60 + rand() * 120, rad = 70 + rand() * 60;
      const layers = 6;
      for (let n = 0; n < layers; n++) { const f = 1 - n / layers; nb.box(x, n * h / layers, z, rad * f * 2, h / layers, rad * f * 1.7, n > layers * 0.55 ? SNOW : n % 2 ? 0x3a4050 : 0x2c3240, { rot: a + n * 0.2 }); }
    }
    const moonTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#fff6e0'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.fillStyle = 'rgba(200,190,170,0.5)'; for (const [x, y, r] of [[44, 50, 12], [80, 76, 9], [70, 38, 6], [50, 86, 7]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false })); moon.scale.setScalar(100);
    moon.position.set(-520, 380, -880); scene.add(moon);
    const mg = P.glow(0xd8e0ff, 300, 0.5); mg.position.copy(moon.position); scene.add(mg);
    // owls drifting over the grounds
    for (let n = 0; n < 4; n++) { const ow = P.hedwig(1.1); ow.traverse((o) => { if (o.material && o.material.color && n % 2) o.material = plastic(0x8a6a4a); }); ctx.group.add(ow); const c0 = [[-112, -108], [-200, 60], [0, 200], [200, -100]][n];
      anims.push((dt, t) => { const a = t * (0.3 + n * 0.05) + n; ow.position.set(c0[0] + Math.cos(a) * 60, 40 + Math.sin(t + n) * 5, c0[1] + Math.sin(a) * 60); ow.rotation.y = -a; ow.rotation.z = 0.25; const fl = Math.sin(t * 6 + n) * 0.5; ow.userData.wings[0].rotation.z = -fl; ow.userData.wings[1].rotation.z = fl; }); }
  },
};
