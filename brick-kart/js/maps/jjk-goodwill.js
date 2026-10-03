// Kyoto Goodwill Clash (Jujutsu Kaisen Season 1): start under the gates of Kyoto
// Jujutsu High, race through Arashiyama bamboo into the Goodwill Event forest
// where released curses roam, Hanami's roots burst through the dirt road and Todo
// claps karts into each other's places, climb the ridge and glide over the lake to
// the juvenile detention centre (Sukuna's first awakening), splash through
// Mahito's sewer tunnel, cross the Yasohachi Bridge, dodge Mechamaru's Ultra Cannon
// and run the bases of the season-finale baseball game back to Kyoto.
import { THREE, BrickBuilder, C, plastic, groundPlane, pine, roundTree, rock, lamp, crossing, liquid, disc, strokeTrack, inRange, each, edges, arch, tunnel, mat4, canvasTexture, grandstand, billboard } from './kit.js';
import * as P from './jjk-props.js';
import * as G from './jjk-goodwill-props.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const fxOf = (ctx) => ctx.world.race?.fx;
const sfx = (ctx, n, p) => ctx.world.race?.audio.sfx(n, p);
const NAVY = 0x1d2233;

// ---- hazards --------------------------------------------------------------------------------

let crackTex = null;
function crackTexture() {
  if (crackTex) return crackTex;
  crackTex = canvasTexture(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(40,24,10,0.95)'; g.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      let a = k / 9 * 6.28 + Math.random() * 0.4, x = w / 2, y = w / 2; g.lineWidth = 9; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 6; s++) { a += (Math.random() - 0.5) * 0.8; x += Math.cos(a) * 20; y += Math.sin(a) * 20; g.lineTo(x, y); g.lineWidth = 9 - s; }
      g.stroke();
    }
    g.fillStyle = 'rgba(30,18,8,0.9)'; g.beginPath(); g.arc(w / 2, w / 2, 22, 0, 7); g.fill();
  });
  return crackTex;
}
// Hanami's roots: the road cracks and glows green, then a thicket of roots bursts up.
function rootBurst(ctx, { k, lat = 0, period = 3.8, offset = 0, r = 3.4 }) {
  const tr = ctx.track, i = tr.kToIndex(k), c = tr.at(i, lat, 0.05);
  const g = new THREE.Group(); g.position.copy(c); g.rotation.y = tr.yawAt(i);
  const crackMat = new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, opacity: 0.35, depthWrite: false });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(r * 2.6, r * 2.6).rotateX(-Math.PI / 2), crackMat));
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7aff4a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.7, 28).rotateX(-Math.PI / 2), ringMat); ring.position.y = 0.04; g.add(ring);
  const hold = new THREE.Group(); hold.add(G.rootCluster(r)); hold.scale.y = 0.01; hold.visible = false; g.add(hold);
  ctx.group.add(g);
  const TEL = 1.3, UP = 0.9, DOWN = 0.5;
  let state = 0, rise = 0, burst = false;
  return {
    update(dt, t) {
      const ph = (t + offset) % period, s0 = period - TEL - UP - DOWN;
      if (ph < s0) { state = 0; rise = 0; burst = false; ringMat.opacity = 0; crackMat.opacity = 0.35; hold.visible = false; return; }
      hold.visible = true;
      if (ph < s0 + TEL) {
        state = 1; const f = (ph - s0) / TEL;
        ringMat.opacity = (0.3 + 0.6 * f) * (0.5 + 0.5 * Math.sin(t * (14 + f * 20)));
        crackMat.opacity = 0.35 + 0.6 * f; rise = 0.06 + 0.1 * f; hold.position.x = Math.sin(t * 60) * 0.12;
        const fx = fxOf(ctx); if (fx && Math.random() < 0.5) fx.spark(c.x + (Math.random() - 0.5) * r * 2, c.y + 0.3, c.z + (Math.random() - 0.5) * r * 2, 0, 3 + Math.random() * 4, 0, Math.random() < 0.5 ? 0x7aff4a : 0x8a6a3a, 0.5, 10);
      } else if (ph < s0 + TEL + UP) {
        state = 2; const f = (ph - s0 - TEL) / UP; rise = Math.min(1, f / 0.15); hold.position.x = 0;
        ringMat.opacity = 0.8 * (1 - f);
        if (!burst) { burst = true; const fx = fxOf(ctx); if (fx) { fx.dust({ pos: c, yaw: 0 }, 0x7a5a3a, 14); for (let n = 0; n < 16; n++) { const a = Math.random() * 6.28; fx.spark(c.x, c.y + 1, c.z, Math.cos(a) * 8, 6 + Math.random() * 8, Math.sin(a) * 8, n % 3 ? 0x6a4a2a : 0xf7b8c8, 0.7, 16); } } sfx(ctx, 'wall', c); }
      } else { state = 3; rise = 1 - (ph - s0 - TEL - UP) / DOWN; ringMat.opacity = 0; crackMat.opacity = 0.35 + 0.6 * rise; }
      hold.scale.set(0.6 + rise * 0.4, Math.max(0.01, rise), 0.6 + rise * 0.4);
    },
    test(p) { return state === 2 && rise > 0.5 && Math.hypot(p.x - c.x, p.z - c.z) < r + 0.6 && p.y < c.y + 5 ? 'wreck' : null; },
    near(p, rr) { return state >= 1 && Math.hypot(p.x - c.x, p.z - c.z) < r + rr; },
  };
}

// Todo's Boogie Woogie: one of two hand-print pads glows faster and faster; on Todo's clap
// any kart standing on it swaps places across the road and spins out. Then the other pad lights.
let handTex = null;
function handTexture() {
  if (handTex) return handTex;
  handTex = canvasTexture(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w); g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(128, 150, 52, 58, 0, 0, 7); g.fill();
    for (let k = 0; k < 4; k++) { g.save(); g.translate(86 + k * 28, 100); g.rotate((k - 1.5) * 0.12); g.beginPath(); g.ellipse(0, -40, 12, 40, 0, 0, 7); g.fill(); g.restore(); }
    g.save(); g.translate(64, 160); g.rotate(-0.9); g.beginPath(); g.ellipse(0, -26, 13, 32, 0, 0, 7); g.fill(); g.restore();
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke();
  });
  return handTex;
}
function boogieWoogie(ctx, { k, period = 2.6, offset = 0, todo }) {
  const tr = ctx.track, i = tr.kToIndex(k), hw = tr.HW[i], L = hw * 0.48, R = Math.min(5.6, hw * 0.33);
  const ctr = tr.at(i, 0, 0), rx = tr.R[i * 2], rz = tr.R[i * 2 + 1];
  const pads = [-1, 1].map((sd) => {
    const p = tr.at(i, sd * L, 0.07);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x4ac8ff, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending });
    const handMat = new THREE.MeshBasicMaterial({ map: handTexture(), color: 0x6ad8ff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
    const m = new THREE.Group(); m.position.copy(p); m.rotation.y = tr.yawAt(i);
    m.add(new THREE.Mesh(new THREE.RingGeometry(R - 0.7, R, 32).rotateX(-Math.PI / 2), ringMat));
    const hand = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.8, R * 1.8).rotateX(-Math.PI / 2), handMat); hand.position.y = 0.02; if (sd > 0) hand.scale.x = -1; m.add(hand);
    ctx.group.add(m);
    return { p, ringMat, handMat };
  });
  let t0 = 0, clapT = -9, hitSide = 0, lastCycle = -1, side = 0;
  return {
    update(dt, t) {
      t0 = t;
      const tt = t + offset, cyc = Math.floor(tt / period), ph = (tt % period) / period;
      if (cyc !== lastCycle) {
        if (lastCycle >= 0) {
          clapT = t; hitSide = side;
          const fx = fxOf(ctx); if (fx) for (const pd of pads) { fx.pop(pd.p, 0x6ad8ff); for (let n = 0; n < 10; n++) { const a = n / 10 * 6.28; fx.spark(pd.p.x, pd.p.y + 0.5, pd.p.z, Math.cos(a) * 9, 3, Math.sin(a) * 9, 0x9ae8ff, 0.4); } }
          sfx(ctx, 'shield', ctr);
        }
        lastCycle = cyc; side = cyc % 2;
      }
      const flash = Math.max(0, 1 - (t - clapT) / 0.3);
      pads.forEach((pd, n) => {
        const on = n === side, pulse = 0.5 + 0.5 * Math.sin(tt * (8 + ph * 26));
        pd.ringMat.opacity = on ? 0.3 + 0.6 * ph * pulse + flash * 0.4 : 0.1 + flash * 0.6;
        pd.handMat.opacity = on ? 0.2 + 0.7 * ph * pulse : 0.08 + flash * 0.6;
        pd.ringMat.color.setHex(on && ph > 0.7 ? 0xffffff : 0x4ac8ff);
      });
      if (todo) { const c = ph > 0.86 ? Math.sin((ph - 0.86) / 0.14 * Math.PI / 2) : 0, open = 1 - c; todo.armR.rotation.set(-1.35, 0, 0.95 * open - 0.05); todo.armL.rotation.set(-1.35, 0, -0.95 * open + 0.05); }
    },
    test(p) {
      if (t0 - clapT > 0.22) return null;
      const pd = pads[hitSide];
      if (Math.hypot(p.x - pd.p.x, p.z - pd.p.z) > R + 0.9 || Math.abs(p.y - pd.p.y) > 4) return null;
      const d = (p.x - ctr.x) * rx + (p.z - ctr.z) * rz;
      p.y = tr.surfaceY(i, -d) + (p.y - tr.surfaceY(i, d)); p.x -= 2 * d * rx; p.z -= 2 * d * rz;
      fxOf(ctx)?.pop(p, 0x6ad8ff);
      return 'spin';
    },
    near(p, r) { const pd = pads[side]; return Math.hypot(p.x - pd.p.x, p.z - pd.p.z) < R + r; },
  };
}

// Mechamaru's Ultra Cannon: the eye and a laser sight glow, a red line flashes across the
// road, then a beam blasts along it.
function ultraCannon(ctx, { from, to, period = 5.6, offset = 0, mech, radius = 2.4 }) {
  const dir = V1.subVectors(to, from).clone(), L = dir.length(); dir.normalize();
  const g = new THREE.Group(); g.position.copy(from); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 1, depthWrite: false });
  const outMat = new THREE.MeshBasicMaterial({ color: 0xff8a20, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const sightMat = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, L, 14, 1, true).translate(0, L / 2, 0), coreMat);
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, L, 16, 1, true).translate(0, L / 2, 0), outMat);
  const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, L, 6, 1, true).translate(0, L / 2, 0), sightMat);
  g.add(core, outer, sight); core.visible = outer.visible = false;
  ctx.group.add(g);
  // telegraph band on the ground under the beam
  const gx = to.x - from.x, gz = to.z - from.z, gl = Math.hypot(gx, gz);
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, gl).rotateX(-Math.PI / 2), bandMat);
  band.position.set((from.x + to.x) / 2, (ctx.track.roadHeightNear((from.x + to.x) / 2, (from.z + to.z) / 2) ?? 0) + 0.12, (from.z + to.z) / 2); band.rotation.y = Math.atan2(gx, gz);
  ctx.group.add(band);
  const muzzle = P.glow(0xff9a40, 8, 1); muzzle.position.copy(from); muzzle.visible = false; ctx.group.add(muzzle);
  const TEL = 1.6, FIRE = 0.65;
  let state = 0, fired = false;
  return {
    update(dt, t) {
      const ph = (t + offset) % period, s0 = period - TEL - FIRE;
      if (ph < s0) { state = 0; fired = false; sightMat.opacity = 0; bandMat.opacity = 0.04; core.visible = outer.visible = muzzle.visible = false; if (mech) mech.eye.emissiveIntensity = 1.2; return; }
      if (ph < s0 + TEL) {
        state = 1; const f = (ph - s0) / TEL, pulse = 0.5 + 0.5 * Math.sin(t * (12 + f * 24));
        sightMat.opacity = 0.3 + 0.6 * pulse; bandMat.opacity = (0.15 + 0.5 * f) * pulse;
        muzzle.visible = true; muzzle.scale.setScalar(2 + f * 7);
        if (mech) mech.eye.emissiveIntensity = 1.5 + f * 4 * pulse;
        return;
      }
      state = 2; const f = (ph - s0 - TEL) / FIRE;
      core.visible = outer.visible = true; sightMat.opacity = 0; bandMat.opacity = 0.7;
      const w = Math.sin(Math.min(1, f * 1.2) * Math.PI) * 0.8 + 0.3;
      core.scale.set(w, 1, w); outer.scale.set(w * (1 + Math.sin(t * 50) * 0.1), 1, w);
      muzzle.scale.setScalar(12 * w);
      if (!fired) { fired = true; sfx(ctx, 'cannon', from); }
      const fx = fxOf(ctx);
      if (fx) { const s = Math.random(); fx.spark(from.x + (to.x - from.x) * s, from.y + (to.y - from.y) * s, from.z + (to.z - from.z) * s, (Math.random() - 0.5) * 8, 4 + Math.random() * 6, (Math.random() - 0.5) * 8, Math.random() < 0.5 ? 0xff9a30 : 0xffffff, 0.5, 12); }
    },
    test(p) {
      if (state !== 2) return null;
      const s = Math.max(0, Math.min(1, ((p.x - from.x) * gx + (p.z - from.z) * gz) / (gl * gl)));
      const qx = from.x + gx * s, qz = from.z + gz * s, by = from.y + (to.y - from.y) * s;
      return Math.hypot(p.x - qx, p.z - qz) < radius + 1.1 && p.y < by + 2.2 && p.y > by - 7 ? 'wreck' : null;
    },
    near(p, r) {
      if (!state) return false;
      const s = Math.max(0, Math.min(1, ((p.x - from.x) * gx + (p.z - from.z) * gz) / (gl * gl)));
      return Math.hypot(p.x - from.x - gx * s, p.z - from.z - gz * s) < radius + r;
    },
  };
}

// Fly balls off Maki's bat: a giant brick baseball arcs onto a marked spot on the base path.
function flyBalls(ctx, { from, targets, period = 2.8, offset = 0 }) {
  const tr = ctx.track;
  const bb = new BrickBuilder(1); bb.sphere(0, 0, 0, 1.6, C.white);
  for (const sd of [-1, 1]) for (let n = 0; n < 6; n++) { const a = (n / 5 - 0.5) * 2.4; bb.box(Math.sin(a) * 1.55 * sd * 0.5 + sd * 0.7, Math.cos(a) * 1.4 - 0.1, Math.sin(a) * 1.0, 0.2, 0.18, 0.2, C.red); }
  const ball = bb.build({ name: 'baseball' });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.35, depthWrite: false });
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.RingGeometry(3.2, 3.9, 28).rotateX(-Math.PI / 2), ringMat));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(3.2, 28).rotateX(-Math.PI / 2), fillMat); marker.add(fill);
  ctx.group.add(ball, marker); ball.visible = marker.visible = false;
  let t0 = -offset, flying = false, boom = 0;
  const target = new THREE.Vector3(), FLIGHT = 1.9;
  return {
    update(dt, t) {
      boom = Math.max(0, boom - dt);
      if (!flying && t - t0 > period) {
        t0 = t; flying = true;
        const [k, latF] = targets[Math.floor(Math.random() * targets.length)];
        const i = tr.wrap(tr.kToIndex(k) + Math.floor((Math.random() - 0.5) * 10));
        tr.at(i, (latF + (Math.random() - 0.5) * 0.4) * tr.HW[i], 0.1, target);
        sfx(ctx, 'bump', from);
      }
      if (!flying) return;
      const f = (t - t0) / FLIGHT;
      if (f >= 1) {
        flying = false; boom = 0.3; ball.visible = marker.visible = false;
        const fx = fxOf(ctx); if (fx) { fx.dust({ pos: target, yaw: 0 }, 0xc8905a, 12); fx.pop(target, 0xffffff); }
        sfx(ctx, 'wall', target); return;
      }
      ball.visible = marker.visible = true;
      ball.position.lerpVectors(from, target, f); ball.position.y += Math.sin(f * Math.PI) * 46 + 1.6;
      ball.rotation.set(t * 8, t * 3, 0);
      marker.position.copy(target); fill.scale.setScalar(Math.max(0.01, f));
      ringMat.opacity = 0.45 + 0.45 * Math.abs(Math.sin(t * 10));
    },
    test(p) { return boom > 0 && p.y < target.y + 4 && Math.hypot(p.x - target.x, p.z - target.z) < 4.2 ? 'spin' : null; },
    near(p, r) { return flying && Math.hypot(p.x - target.x, p.z - target.z) < 4.2 + r; },
  };
}

// ---- effect helpers -------------------------------------------------------------------------
// drifting glowing motes around a spot
function motes(ctx, x, y, z, radius, height, n, color, size = 1.1, speed = 1) {
  const pos = new Float32Array(n * 3), a0 = new Float32Array(n), r0 = new Float32Array(n), h0 = new Float32Array(n), w = new Float32Array(n);
  for (let k = 0; k < n; k++) { a0[k] = Math.random() * 6.28; r0[k] = radius * Math.sqrt(Math.random()); h0[k] = Math.random() * height; w[k] = (0.2 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: P.glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.position.set(x, y, z); pts.frustumCulled = false;
  ctx.group.add(pts);
  ctx.anim((dt, t) => {
    for (let k = 0; k < n; k++) { const a = a0[k] + t * w[k] * speed, hh = (h0[k] + t * 2.2 * speed * Math.abs(w[k])) % height; pos[k * 3] = Math.cos(a) * r0[k]; pos[k * 3 + 1] = hh; pos[k * 3 + 2] = Math.sin(a) * r0[k]; }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}
function beam(b, ax, ay, az, bx, by, bz, t, color, opts) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
  b.boxM(mat4((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, -Math.asin(dy / L), Math.atan2(dx, dz), 0, t, t, L), color, opts);
}

// ---- the map ------------------------------------------------------------------------------------------
export default {
  id: 'jjk-goodwill', name: 'Kyoto Goodwill Clash', subtitle: 'Season 1 · The Goodwill Event, Yasohachi Bridge and the baseball finale', cup: 'jjk', seed: 1801,
  width: 28, shoulder: 6, edge: 'fence', start: 0.5,
  points: [[225, 150, 0], [236, 70, 0], [228, -10, 0], [196, -80, 1], [205, -150, 2], [168, -215, 3], [100, -252, 5], [30, -232, 10], [-35, -262, 17], [-100, -282, 24], [-180, -270, 18], [-248, -205, 6], [-272, -120, 2], [-266, -35, 0], [-250, 45, 0], [-222, 120, 0], [-160, 195, 8], [-80, 238, 2], [20, 222, 0], [100, 272, 0], [150, 190, 0]],
  sections: [
    { from: 20.3, to: 2.2, surface: 'stone', edge: 'fence', shoulder: 6 },
    { from: 2.2, to: 9.0, surface: 'dirt', edge: 'open', shoulder: 9 },
    { from: 4.8, to: 6.4, width: 32 },
    { from: 6.85, to: 7.65, width: 36 },
    { from: 7.6, to: 9.0, edge: 'wall', shoulder: 3 },
    { from: 9.05, to: 10.7, gap: true },
    { from: 10.7, to: 13.4, edge: 'wall', shoulder: 3 },
    { from: 13.5, to: 15.0, surface: 'sewer', edge: 'wall', shoulder: 1.5, width: 26 },
    { from: 15.45, to: 16.55, surface: 'bridge', edge: 'wall', shoulder: 1.5, width: 26, support: 'pillar' },
    { from: 17.8, to: 20.25, surface: 'clay', shoulder: 6 },
  ],
  items: [1.2, 3.0, 4.5, 6.7, 8.45, 11.5, 14.25, 17.0, 19.2],
  boosts: [[2.5, 0], [4.15, -0.4], [6.55, 0.4], [7.95, 0], [8.7, 0], [11.15, 0.35], [12.8, -0.3], [15.95, 0], [18.4, -0.3], [20.28, 0]],
  ramps: [3.85, 20.45],
  gliders: [8.95],
  studs: [[0.9, -0.4, 8], [2.7, 0, 8], [4.6, 0.6, 6], [6.3, -0.2, 6], [7.4, 0, 6], [8.2, 0, 6], [11.0, 0, 8], [12.4, 0.4, 6], [14.6, 0, 8], [16.0, 0, 6], [17.5, -0.4, 6], [18.9, 0, 8], [20.0, 0.3, 4]],
  theme: {
    sky: [0x34509a, 0xffb07a, 0x8a5a4a], fog: [0xf2b890, 210, 1050],
    sun: { color: 0xffcf9a, intensity: 2.4, dir: [-0.75, 0.55, -0.3] },
    hemi: [0xffe0c0, 0x4a5a3a, 1.15], envIntensity: 0.6,
    ground: 0x4a7a30, groundPitch: 1.6, shoulder: 0x5a8a38, dust: 0x9a7a4a,
    road: { base: '#55524c', line: '#f4f4f4' },
    surfaces: {
      stone: { base: '#a39a88', line: null, seams: 'rgba(60,45,30,0.4)' },
      dirt: { base: '#8a6a42', line: null, seams: 'rgba(50,32,16,0.35)', rough: 0.85 },
      sewer: { base: '#46544c', line: '#c8d040', dashed: true, seams: 'rgba(0,0,0,0.35)', emissive: 0x0a1a0a, emissiveIntensity: 1, rough: 0.25 },
      bridge: { base: '#8c8a84', line: '#f2cd37', seams: 'rgba(0,0,0,0.25)' },
      clay: { base: '#c07a48', line: '#ffffff', seams: 'rgba(90,40,10,0.25)', rough: 0.8 },
    },
    wall: [C.dkstone, C.ltgray], curb: [C.red, C.white], gate: [0x6a1a12, C.black], fence: [0x6a1a12, C.black],
    support: 'bank', pillar: C.ltgray, pillar2: C.dkstone, skirt: ['#6a5a42', '#4a3e2a'], skirtColor: C.dkstone,
    rampSide: C.rbrown, ramp: C.orange,
    music: { bpm: 144, root: 52, scale: 'dorian', style: 'rock' },
  },

  decor(ctx) {
    const { b, rand, track: tr, scene, bounds } = ctx;
    const nb = ctx.bNoShadow;
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    // the first spot at/after `lat` (signed: + outside, - infield) with `r` clearance from all road
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

    // ---- water: the lake under the glide and the river down to the Yasohachi Bridge ---------
    const LAKE = [-150, -292];
    const gliding = (i) => inRange(tr, i, 8.95, 10.8);
    const RIVER = [[-150, -240], [-142, -120], [-138, -20], [-152, 70], [-166, 160], [-170, 230], [-186, 330], [-200, 520]];
    const riverPath = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = g.lineJoin = 'round'; g.beginPath(); RIVER.forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); };
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = g.strokeStyle = '#000';
      riverPath(g, toPx, sc, 30); disc(g, toPx, sc, LAKE[0], LAKE[1], 78); strokeTrack(g, tr, toPx, sc, 14, gliding);
    });
    ctx.cutGround(hole);
    const water = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = g.strokeStyle = '#fff'; riverPath(g, toPx, sc, 34); disc(g, toPx, sc, LAKE[0], LAKE[1], 82); strokeTrack(g, tr, toPx, sc, 18, gliding); });
    liquid(ctx, water, 0x2a6a9a, -2.4, { size: 1600, speed: 0.12 });
    // forest floor darker under the trees, golden autumn grass around Kyoto
    const forest = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, 80, (i) => inRange(tr, i, 2.2, 8.9)); });
    scene.add(groundPlane(0x2e5226, -0.05, 1600, 1.6, { mask: forest }));
    const kyoto = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, 300, 60, 120); });
    scene.add(groundPlane(0x8a8a3a, -0.04, 1600, 1.6, { mask: kyoto }));
    const outSide = (i) => { const p = tr.at(i, 10, 0), q = tr.at(i, -10, 0); return Math.hypot(p.x - bounds.cx, p.z - bounds.cz) > Math.hypot(q.x - bounds.cx, q.z - bounds.cz) ? 1 : -1; };

    // ---- Kyoto Jujutsu High (start) ------------------------------------------------------------
    { // main hall and the five-storey pagoda on the outside of the start straight
      const h = spot(0.85, 42, 22); P.hall(b, h.x, h.z, 34, 20, 8, Math.atan2(tr.px(K(0.85)) - h.x, tr.pz(K(0.85)) - h.z), { tiers: 2, wall: 0xf2ead8, wood: 0x4a2a1a, roof: 0x2a2a30 }); ctx.claim(h.x, h.z, 24);
      const pg = spot(2.0, 40, 12); const top = P.hall(b, pg.x, pg.z, 14, 14, 6, 0.2, { tiers: 5, wall: 0x6a2a1a, wood: 0x2a1a12, roof: 0x2a2a30 });
      b.cyl(pg.x, top, pg.z, 0.4, 11, C.gold, { seg: 6 }); for (let k = 0; k < 6; k++) b.cyl(pg.x, top + 2 + k * 1.3, pg.z, 1.1 - k * 0.1, 0.3, C.gold, { seg: 10 }); ctx.claim(pg.x, pg.z, 13);
      const h2 = spot(0.1, -40, 16); P.hall(b, h2.x, h2.z, 24, 16, 7, Math.atan2(tr.px(K(0.1)) - h2.x, tr.pz(K(0.1)) - h2.z), { tiers: 1, wall: 0xf2ead8, wood: 0x4a2a1a }); ctx.claim(h2.x, h2.z, 17);
      const h3 = spot(1.5, -44, 14); P.hall(b, h3.x, h3.z, 20, 14, 6, Math.atan2(tr.px(K(1.5)) - h3.x, tr.pz(K(1.5)) - h3.z), { tiers: 2, wall: 0xf2ead8, wood: 0x6a1a12 }); ctx.claim(h3.x, h3.z, 15);
    }
    // the great sanmon gate over the road, Gojo standing on its roof
    { const i = K(1.55), p = tr.at(i, 0, 0), span = 2 * (edgeLat(i) + 1);
      G.sanmon(b, p.x, Math.min(tr.surfaceY(i, -span / 2), tr.surfaceY(i, span / 2)), p.z, span, tr.yawAt(i));
      const gj = P.gojo(2.6); gj.root.position.set(p.x, p.y + 11 + 9.6, p.z); gj.root.rotation.y = tr.yawAt(i) + Math.PI; ctx.group.add(gj.root);
      gj.armR.rotation.set(-0.3, 0, 0.3); anims.push((dt, t) => { gj.armL.rotation.z = -2.4 - Math.sin(t * 4) * 0.4; });
    }
    arch(ctx, 0.2, { cols: [0x6a1a12, C.black], text: 'KYOTO JUJUTSU HIGH', bg: '#3a0a06', fg: '#ffd070' });
    // plaster walls with gold lines along the start straight, lanterns and maples
    each(tr, 20.4, 1.35, 7, (i) => { for (const sd of [-1, 1]) { const a = tr.at(i, sd * (edgeLat(i) + 2.5), 0), q = tr.at(tr.wrap(i + 7), sd * (edgeLat(tr.wrap(i + 7)) + 2.5), 0); G.plasterWall(b, a.x, a.z, q.x, q.z, 3.6); } });
    edges(ctx, 1.75, 2.3, 9, 2, (p) => P.lantern(b, p.x, p.z, 1.2));
    ctx.scatter(70, { minC: 6, maxC: 90, r: 4, test: (x, z) => kyoto.test(x, z) || Math.hypot(x - 150, z - 90) < 70 }, (x, z) => (rand() < 0.75 ? G.maple(b, x, z, 1 + rand() * 0.5, rand) : P.sakura(b, x, z, 1.1, rand)));
    // a Kyoto garden pond with a red footbridge in the infield
    { const x = 150, z = 70;
      const pond = new THREE.Mesh(new THREE.CircleGeometry(16, 28).rotateX(-Math.PI / 2), plastic(0x3a7aaa, { rough: 0.1 })); pond.position.set(x, 0.05, z); scene.add(pond);
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; rock(b, x + Math.cos(a) * 16.5, 0, z + Math.sin(a) * 16.5, 0.9 + rand() * 0.6, rand, [C.dkstone, C.ltgray]); }
      for (let n = -4; n <= 4; n++) { const y = 2.2 * Math.cos(n / 4 * Math.PI / 2); b.box(x + n * 1.8, y, z, 1.9, 0.4, 4, C.red); }
      for (const sd of [-1, 1]) for (let n = -4; n <= 4; n += 2) b.box(x + n * 1.8, 2.2 * Math.cos(n / 4 * Math.PI / 2), z + sd * 2, 0.3, 1.4, 0.3, C.red);
      for (let k = 0; k < 6; k++) { const kf = new BrickBuilder(1); kf.box(0, 0, 0, 0.7, 0.5, 1.8, k % 2 ? C.orange : C.white); kf.box(0, 0.1, -1.1, 0.1, 0.4, 0.6, C.orange); const m = kf.build({ name: 'koi' }); scene.add(m); const ph = k * 1.1, r = 6 + (k % 3) * 3; anims.push((dt, t) => { const a = t * 0.4 + ph; m.position.set(x + Math.cos(a) * r, -0.05, z + Math.sin(a) * r); m.rotation.y = -a; }); }
      ctx.claim(x, z, 20); }

    // ---- Arashiyama bamboo grove into the forest -----------------------------------------------
    edges(ctx, 2.25, 3.3, 5, 1.5, (p) => G.bamboo(b, p.x, p.z, 1 + rand() * 0.3, rand));
    ctx.scatter(80, { minC: 3, maxC: 40, r: 3, test: (x, z) => forest.test(x, z) && Math.hypot(x - 225, z + 50) < 90 }, (x, z) => G.bamboo(b, x, z, 1 + rand() * 0.4, rand));
    // ---- the Goodwill Event forest --------------------------------------------------------------
    ctx.scatter(260, { minC: 4, maxC: 75, r: 4, test: (x, z) => forest.test(x, z) && hole.test(x, z) }, (x, z) => {
      const r = rand();
      if (r < 0.45) G.cedar(b, x, z, 1 + rand() * 0.7);
      else if (r < 0.7) roundTree(b, x, 0, z, 1.4 + rand() * 0.6, rand() < 0.5 ? C.dkgreen : 0x2a5a2a);
      else if (r < 0.85) G.maple(b, x, z, 1.1 + rand() * 0.4, rand);
      else rock(b, x, 0, z, 1.4 + rand(), rand, [0x5a6a5a, C.dkstone, 0x4a5a3a]);
    });
    edges(ctx, 3.3, 7.6, 10, 2.5, (p) => { if (rand() < 0.75) G.cedar(b, p.x, p.z, 0.9 + rand() * 0.5); });
    // the veil drawn over the event: a dark translucent dome far over the forest
    { const veil = new THREE.Mesh(new THREE.SphereGeometry(260, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
      veil.position.set(80, -30, -200); scene.add(veil); anims.push((dt, t) => { veil.material.opacity = 0.1 + Math.sin(t * 0.6) * 0.03; }); }
    // released curses floating among the trees
    for (let n = 0; n < 12; n++) {
      const k = 3.2 + n * 0.45, sd = n % 2 ? 1 : -1, p = spot(k, sd * 22, 3);
      const s = new THREE.Group(); const m = G.spirit(n); m.scale.setScalar(1.2 + (n % 3) * 0.3); s.add(m); s.position.set(p.x, 3, p.z); faceRoad(s, k); ctx.group.add(s);
      const ph = n * 0.7; anims.push((dt, t) => { m.position.y = 1 + Math.sin(t * 1.6 + ph) * 1.2; m.rotation.y = Math.sin(t * 0.7 + ph) * 0.5; });
      if (n % 3 === 0) motes(ctx, p.x, 0, p.z, 6, 9, 24, 0xa070ff, 1.0);
    }
    arch(ctx, 3.35, { cols: [C.black, 0x6a1a12], text: 'GOODWILL EVENT', bg: '#0a0a14', fg: '#9ad8ff' });
    // curses scurrying across the dirt road (bumps)
    for (const [k, v, sp, off, kind] of [[3.55, 0, 5, 0, 'bump'], [3.75, 2, 4.2, 0.5, 'bump'], [8.25, 1, 6, 0.3, 'spin']]) {
      const hold = new THREE.Group(); const m = G.spirit(v); hold.add(m);
      ctx.hazard(crossing(ctx, { mesh: hold, k, speed: sp, radius: 1.8, kind, offset: off, span: 0.95 }));
      const ph = rand() * 6; anims.push((dt, t) => { m.position.y = Math.abs(Math.sin(t * 6 + ph)) * 0.6; m.rotation.z = Math.sin(t * 5 + ph) * 0.15; });
    }
    // Hanami looming over its roots, flowers blooming around it
    { const p = spot(5.6, 30, 10); const hn = add(G.hanami(5.2), p, 5.6);
      anims.push((dt, t) => { hn.armR.rotation.x = -0.9 + Math.sin(t * 1.1) * 0.25; hn.armR.rotation.z = -0.5; hn.armL.rotation.x = -0.4 + Math.sin(t * 0.9) * 0.2; });
      for (let n = 0; n < 40; n++) { const a = rand() * 6.28, r = 6 + rand() * 18, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r; if (tr.clearance(x, z, 12) < 3) continue; b.cyl(x, 0, z, 0.1, 1.2, C.green, { seg: 4 }); b.sphere(x, 1.3, z, 0.45, [0xf7b8c8, 0xfff0a0, C.white, 0xfc97ac][n % 4]); }
      motes(ctx, p.x, 0, p.z, 16, 22, 70, 0xf7b8c8, 1.2, 0.6); ctx.claim(p.x, p.z, 12); }
    [[5.0, -0.45, 0], [5.3, 0.45, 0.95], [5.6, 0, 1.9], [5.9, -0.5, 2.85], [6.15, 0.45, 0.45]].forEach(([k, l, off]) => {
      const i = K(k); ctx.hazard(rootBurst(ctx, { k, lat: l * tr.HW[i], period: 3.8, offset: off }));
    });
    // Todo and Yuji at the Boogie Woogie pads
    { const i = K(7.25), td = add(P.todo(3.8), spot(7.25, 26, 6), 7.25);
      ctx.hazard(boogieWoogie(ctx, { k: 7.25, period: 2.6, todo: td }));
      const yj = add(P.yuji(3.5), spot(7.1, -26, 6), 7.1); anims.push((dt, t) => { yj.armR.rotation.x = -1.4 + Math.sin(t * 6) * 0.3; yj.armL.rotation.x = -0.6; });
      arch(ctx, 6.9, { cols: [C.black, C.azure], text: 'BOOGIE WOOGIE', bg: '#06203a', fg: '#9ae8ff' }); }
    // Maki vs Mai, Megumi and Inumaki, Nobara with her hammer
    { const mk = add(P.maki(3.4), spot(3.15, -26, 5), 3.15); anims.push((dt, t) => { mk.armR.rotation.x = -1.2 + Math.sin(t * 3) * 0.6; });
      const ma = add(G.mai(3.4), spot(3.3, 26, 5), 3.3); ma.armR.rotation.x = -1.5; anims.push((dt, t) => { ma.armR.rotation.x = -1.5 + Math.max(0, Math.sin(t * 4)) * -0.25; });
      const mg = add(P.megumi(3.4), spot(4.35, 26, 6), 4.35); mg.armR.rotation.set(-1.3, 0, 0.35); mg.armL.rotation.set(-1.3, 0, -0.35);
      const dog = P.divineDog(0x15161c, 1.6); dog.position.set(5, 0, 3); mg.root.add(dog);
      const in_ = add(G.inumaki(3.4), spot(4.2, -26, 5), 4.2); anims.push((dt, t) => { in_.armR.rotation.x = -1.6 + Math.sin(t * 2) * 0.2; });
      { const mp = new BrickBuilder(1); mp.cyl(0, 0, 0, 0.35, 0.4, C.white); mp.cone(0, 0.4, 0, 0.8, 1.4, C.white); const meg = mp.build({ name: 'megaphone' }); meg.rotation.x = Math.PI; meg.position.set(0, -1.9 * 3.4, 0.4); in_.armR.add(meg); }
      const nbr = add(P.nobara(3.4), spot(6.6, -26, 6), 6.6); anims.push((dt, t) => { const ph = (t % 2) / 2; nbr.armR.rotation.x = ph < 0.7 ? -2.8 + ph * 0.6 : -2.4 + (ph - 0.7) / 0.3 * 2.6; }); }
    // the ridge before the glide: rocky cliffs and a waterfall into the lake
    edges(ctx, 7.6, 8.95, 6, 1.5, (p, i) => { rock(b, p.x, 0, p.z, 2.2 + rand() * 1.4, rand, [0x6a6a60, C.dkstone, 0x8a8478]); });
    { const i = K(8.95), p = tr.at(i, edgeLat(i) + 6, 0), yaw = tr.yawAt(i);
      const wf = plastic(0xbfe8ff, { trans: true, opacity: 0.7, emissive: 0x6ab8ff, emissiveIntensity: 0.4 });
      nb.box(p.x + Math.sin(yaw) * 6, -2.4, p.z + Math.cos(yaw) * 6, 10, p.y + 2, 1.5, 0, { rot: yaw + Math.PI / 2, mat: wf });
      for (let n = 0; n < 6; n++) nb.sphere(p.x + Math.sin(yaw) * (8 + n * 0.8) + (rand() - 0.5) * 6, -1.8, p.z + Math.cos(yaw) * (8 + n * 0.8) + (rand() - 0.5) * 6, 1.6, C.white, { sy: 0.5 }); }
    arch(ctx, 8.75, { cols: [C.white, C.azure], text: 'CURSE HUNT', bg: '#0a2a4a', fg: '#ffffff' });
    // boats and lotus on the lake
    for (let n = 0; n < 20; n++) { const a = rand() * 6.28, r = rand() * 64, x = LAKE[0] + Math.cos(a) * r, z = LAKE[1] + Math.sin(a) * r; if (tr.clearance(x, z, 30) < 22) continue; nb.cyl(x, -2.3, z, 1 + rand(), 0.2, 0x3a8a3a, { seg: 10 }); if (n % 3 === 0) nb.sphere(x, -2.0, z, 0.5, 0xfc97ac); }

    // ---- juvenile detention centre (Sukuna's first awakening) ------------------------------------
    { const p = spot(12.2, 40, 30), x = p.x, z = p.z, i = K(12.2), rot = Math.atan2(tr.px(i) - x, tr.pz(i) - z);
      const ca = Math.cos(rot), sa = Math.sin(rot), L = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca];
      b.box(x, 0, z, 52, 16, 26, 0x8a8a86, { rot }); b.box(x, 16, z, 54, 1, 28, 0x6a6a68, { rot });
      for (let f = 0; f < 4; f++) for (let n = -6; n <= 6; n++) { const [wx, wz] = L(n * 3.8, 13.05); b.box(wx, 2 + f * 3.6, wz, 1.6, 1.8, 0.2, 0x2a3038, { rot }); for (let bar = -1; bar <= 1; bar++) { const [bx, bz] = L(n * 3.8 + bar * 0.5, 13.2); b.box(bx, 2 + f * 3.6, bz, 0.12, 1.8, 0.12, C.ltgray, { rot }); } }
      { const [ex, ez] = L(0, 13.2); b.box(ex, 0, ez, 8, 6, 0.4, 0x2a2a2a, { rot }); billboard(ctx.group, nb, ex + sa * 1.5, 7, ez + ca * 1.5, rot, 'DETENTION CENTRE', '#3a3a3a', '#f4f4f4', 18, 3); }
      // perimeter wall with barbed wire and a watchtower
      const W = 44, D = 26;
      for (const [ax, az, bx, bz] of [[-W, D, W, D], [W, D, W, -D], [W, -D, -W, -D], [-W, -D, -W, D]]) {
        const [x1, z1] = L(ax, az), [x2, z2] = L(bx, bz), len = Math.hypot(x2 - x1, z2 - z1), r2 = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2;
        if (az === D && bz === D) for (const [s0, s1] of [[-W, -6], [6, W]]) { const [y1, w1] = L(s0, D), [y2, w2] = L(s1, D); b.box((y1 + y2) / 2, 0, (w1 + w2) / 2, s1 - s0, 6, 1, 0x9a9a94, { rot: r2 }); b.box((y1 + y2) / 2, 6.6, (w1 + w2) / 2, s1 - s0, 0.2, 0.2, C.dkgray, { rot: r2 }); }
        else { b.box((x1 + x2) / 2, 0, (z1 + z2) / 2, len, 6, 1, 0x9a9a94, { rot: r2 }); b.box((x1 + x2) / 2, 6.6, (z1 + z2) / 2, len, 0.2, 0.2, C.dkgray, { rot: r2 }); }
      }
      { const [tx, tz] = L(-W, -D); b.box(tx, 0, tz, 4, 14, 4, 0x7a7a76, { rot }); b.box(tx, 14, tz, 6, 3, 6, 0x5a5a58, { rot }); b.box(tx, 17, tz, 7, 0.6, 7, C.dkgray, { rot }); b.sphere(tx, 15.5, tz, 0.6, 0xffe08a, { matOpts: { emissive: 0xffd070, emissiveIntensity: 2 } }); }
      ctx.claim(x, z, 52);
      // Sukuna (in Yuji's body) on the roof, the special-grade curse womb beside him
      const [sx, sz] = L(6, 6); const sk = G.sukunaYuji(3.6); sk.root.position.set(sx, 17, sz); sk.root.rotation.y = rot; ctx.group.add(sk.root);
      anims.push((dt, t) => { sk.armR.rotation.set(-0.2 - Math.max(0, Math.sin(t * 1.4)) * 1.6, 0, -0.3); sk.armL.rotation.set(0.2, 0, 0.5); sk.root.position.y = 17 + Math.max(0, Math.sin(t * 2.8)) * 0.4; });
      const [cx, cz] = L(-12, 4); { const cw = new BrickBuilder(1); cw.sphere(0, 4, 0, 4, 0x6a4a5a, { sy: 1.2 }); for (let n = 0; n < 12; n++) { const a = n / 12 * 6.28; P.spike(cw, Math.cos(a) * 3.2, 3 + (n % 3), Math.sin(a) * 3.2, 0.6, 3, Math.sin(a) * 1.1, -Math.cos(a) * 1.1, 0x3a2a3a); } cw.sphere(1.2, 6, 3.5, 0.9, C.white); cw.sphere(1.2, 6, 4.1, 0.45, 0xb01010); const g = cw.build({ name: 'curse-womb' }); g.position.set(cx, 17, cz); g.rotation.y = rot; ctx.group.add(g); anims.push((dt, t) => { g.scale.y = 1 + Math.sin(t * 2) * 0.05; }); }
      motes(ctx, sx, 17, sz, 8, 10, 40, 0xff3040, 1.2);
      // rain clouds over the prison
      const cloudM = plastic(0x4a4a56, { rough: 0.9 });
      for (let n = 0; n < 14; n++) nb.sphere(x + (rand() - 0.5) * 70, 52 + rand() * 6, z + (rand() - 0.5) * 50, 8 + rand() * 6, 0, { mat: cloudM, sy: 0.5 });
      const RN = 500, rp = new Float32Array(RN * 3);
      for (let k = 0; k < RN; k++) { rp[k * 3] = (Math.random() - 0.5) * 90; rp[k * 3 + 1] = Math.random() * 50; rp[k * 3 + 2] = (Math.random() - 0.5) * 70; }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
      const rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xc8d8ff, size: 0.5, transparent: true, opacity: 0.7, depthWrite: false })); rain.position.set(x, 0, z); rain.frustumCulled = false; scene.add(rain);
      anims.push((dt) => { for (let k = 0; k < RN; k++) { rp[k * 3 + 1] -= dt * 40; if (rp[k * 3 + 1] < 0) rp[k * 3 + 1] += 50; } rg.attributes.position.needsUpdate = true; });
      pl(0xff4040, sx, 24, sz, 3, 80);
      // Megumi and Nobara at the gate
      const [gx, gz] = L(-4, D + 6), [hx, hz] = L(5, D + 6);
      const mg = P.megumi(3.2); mg.root.position.set(gx, 0, gz); mg.root.rotation.y = rot + Math.PI; ctx.group.add(mg.root); mg.armR.rotation.x = -1.3;
      const nob = P.nobara(3.2); nob.root.position.set(hx, 0, hz); nob.root.rotation.y = rot + Math.PI; ctx.group.add(nob.root); nob.armR.rotation.x = -2.6;
    }
    edges(ctx, 10.8, 13.3, 12, 2, (p) => lamp(b, p.x, p.y, p.z, 0xffe0a0));
    ctx.scatter(40, { minC: 6, maxC: 70, r: 4, test: (x, z) => x < -180 && z > -200 && z < 40 && hole.test(x, z) }, (x, z) => pine(b, x, 0, z, 1.2 + rand() * 0.6, false, 0x2a4a2a));

    // ---- Mahito's sewer tunnel ------------------------------------------------------------------------
    tunnel(ctx, 13.5, 15.0, { wall: 0x5a6a5a, roof: 0x3a4a42, height: 9, lights: 0xb0ff7a });
    each(tr, 13.5, 15.0, 6, (i) => { const p = tr.at(i, 0, 0); b.box(p.x, 11, p.z, 2 * (edgeLat(i) + 10), 5, 6.5, 0x5a6a42, { rot: tr.yawAt(i) }); });
    each(tr, 13.55, 14.95, 8, (i) => { for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) - 0.3), 0); nb.box(q.x, q.y + 0.02, q.z, 0.9, 0.08, 7.8, 0x6aff4a, { rot: tr.yawAt(i), matOpts: { emissive: 0x3ac81a, emissiveIntensity: 0.8 } }); const w = tr.at(i, sd * (edgeLat(i) + 0.2), 0); b.cyl(w.x, w.y + 5, w.z, 0.8, 0.6, 0x6a6a62, { seg: 10 }); } });
    for (const k of [13.5, 15.0]) { const i = K(k), yaw = tr.yawAt(i), w = edgeLat(i) + 2.6;
      for (let n = 0; n <= 12; n++) { const a = n / 12 * Math.PI, q = tr.at(i, Math.cos(a) * w, 0); b.box(q.x, q.y + Math.sin(a) * 11 - 1, q.z, 3.2, 3.2, 4.4, n % 2 ? 0x7a7a70 : 0x8a8a80, { rot: yaw }); } }
    arch(ctx, 13.4, { cols: [0x5a6a5a, C.dkgray], text: 'SEWER', bg: '#1a2a1a', fg: '#b0ff7a' });
    for (const [k, v, sp, off] of [[13.95, 0, 3.4, 0], [14.4, 1, 3.0, 0.5], [14.75, 2, 2.7, 0.2]]) {
      const hold = new THREE.Group(); const tf = P.transfigured(v); hold.add(tf);
      ctx.hazard(crossing(ctx, { mesh: hold, k, speed: sp, radius: 1.9, kind: 'spin', offset: off, span: 1.0 }));
      const ph = rand() * 6; anims.push((dt, t) => { tf.rotation.z = Math.sin(t * 3 + ph) * 0.18; });
    }
    // Mahito and Junpei by the tunnel mouth
    { const p = spot(15.15, 26, 7); const mh = add(P.mahito(4), p, 15.15); anims.push((dt, t) => { mh.armR.rotation.z = -1.2 - Math.sin(t * 1.5) * 0.4; mh.armL.rotation.z = 1.2 + Math.sin(t * 1.5 + 1) * 0.4; });
      const jp = add(G.junpei(3.2), spot(15.25, 26, 5), 15.25); jp.armR.rotation.x = -0.4;
      { const jf = new BrickBuilder(1); jf.sphere(0, 0, 0, 1.6, 0xd8e8ff, { matOpts: { trans: true, opacity: 0.55 } }); for (let n = 0; n < 6; n++) { const a = n / 6 * 6.28; P.rbox(jf, Math.cos(a) * 0.9, -2.2, Math.sin(a) * 0.9, 0.15, 3, 0.15, 0, 0, 0, 0xc8d8ff, { matOpts: { trans: true, opacity: 0.6 } }); } jf.sphere(0, 0.2, 1.3, 0.3, 0x2a2a6a); const jel = jf.build({ name: 'moon-dregs' }); jel.position.set(jp.root.position.x + 3, 9, jp.root.position.z); ctx.group.add(jel); anims.push((dt, t) => { jel.position.y = 9 + Math.sin(t * 1.4) * 0.8; jel.rotation.y = t * 0.4; }); }
      motes(ctx, p.x, 0, p.z, 10, 14, 50, 0x8aa0ff, 1.1); }

    // ---- Yasohachi Bridge ---------------------------------------------------------------------------------
    { const a = K(15.5), z0 = K(16.5), n = (z0 - a + tr.N) % tr.N;
      for (const sd of [-1, 1]) {
        let prev = null;
        for (let o = 0; o <= n; o += 4) {
          const i = tr.wrap(a + o), f = o / n, q = tr.at(i, sd * (edgeLat(i) + 0.8), 0), y = q.y + 1 + Math.sin(f * Math.PI) * 16;
          if (prev) beam(b, prev.x, prev.y, prev.z, q.x, y, q.z, 1.2, 0xc8401a);
          if (o % 16 === 0 && f > 0.05 && f < 0.95) b.box(q.x, q.y, q.z, 0.4, y - q.y, 0.4, 0xc8401a);
          prev = { x: q.x, y, z: q.z };
        }
      }
      each(tr, 15.5, 16.5, 8, (i) => { for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) + 0.2), 0); b.box(q.x, q.y + 2.4, q.z, 0.6, 0.6, 0.6, 0xffd070, { matOpts: { emissive: 0xffb040, emissiveIntensity: 1.6 } }); } });
      arch(ctx, 15.45, { cols: [0xc8401a, C.black], text: 'YASOHACHI BRIDGE', bg: '#3a0a06', fg: '#ffb070' });
      // Eso and Kechizu (the Death Painting brothers) lurking under the bridge
      const m = tr.at(K(16.0), 0, 0);
      for (const [dx, col, sz] of [[-14, 0x4a7a3a, 1.6], [14, 0x8a6a4a, 2.0]]) { const s = new THREE.Group(); const sp = G.spirit(dx < 0 ? 2 : 0); sp.scale.setScalar(sz); s.add(sp); s.position.set(m.x + dx, -2, m.z + 8); s.rotation.y = Math.PI; ctx.group.add(s); const ph = dx; anims.push((dt, t) => { sp.position.y = Math.sin(t * 1.2 + ph) * 0.5; }); }
      motes(ctx, m.x, -2, m.z, 28, 14, 60, 0xff6a40, 1.0, 0.5);
    }

    // ---- Mechamaru and Panda -------------------------------------------------------------------------------
    { const k = 17.35, i = K(k), sd = outSide(i), MS = 2.4;
      const p = spot(k, sd * (edgeLat(i) + 12), 10);
      const mc = add(G.mechamaru(MS), p, k);
      mc.root.updateMatrixWorld(true);
      // aim the cannon arm down at the far side of the road
      const to = tr.at(i, -sd * (edgeLat(i) + 3), 0.6);
      const sh = new THREE.Vector3().setFromMatrixPosition(mc.armR.matrixWorld);
      const loc = mc.root.worldToLocal(to.clone()).sub(mc.armR.position).normalize();
      mc.armR.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), loc);
      mc.root.updateMatrixWorld(true);
      const from = mc.barrel.clone().applyMatrix4(mc.armR.matrixWorld);
      ctx.hazard(ultraCannon(ctx, { from, to, period: 5.6, mech: mc }));
      anims.push((dt, t) => { mc.armL.rotation.x = -0.3 + Math.sin(t * 0.8) * 0.15; });
      motes(ctx, sh.x, 0, sh.z, 10, 18, 30, 0xff9a40, 1.0);
      const pd = P.panda(3.3); const pp = spot(k - 0.15, -sd * (edgeLat(i) + 6), 6); pd.root.position.set(pp.x, 0, pp.z); faceRoad(pd.root, k); ctx.group.add(pd.root);
      anims.push((dt, t) => { pd.armR.rotation.x = -1.6 + Math.sin(t * 5) * 0.6; pd.armL.rotation.x = -1.6 - Math.sin(t * 5) * 0.6; });
      arch(ctx, 17.0, { cols: [C.dkgray, C.orange], text: 'ULTRA CANNON', bg: '#2a1a0a', fg: '#ffb040' });
    }

    // ---- the season-finale baseball game -------------------------------------------------------------------
    const H = tr.at(K(18.0), 0, 0), B1 = tr.at(K(19.0), 0, 0), B2 = tr.at(K(20.0), 0, 0);
    const B3 = new THREE.Vector3(H.x + B2.x - B1.x, 0, H.z + B2.z - B1.z), MID = new THREE.Vector3((H.x + B2.x) / 2, 0, (H.z + B2.z) / 2);
    { // infield grass (a diamond plane) with the dirt base paths and the mound
      const grassTex = canvasTexture(256, 256, (g, w) => { for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#4a8a3a' : '#5a9a44'; g.fillRect(0, k * w / 16, w, w / 16); } });
      const d = Math.hypot(B1.x - H.x, B1.z - H.z);
      const inf = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.86, d * 0.86).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.8 }));
      inf.position.set(MID.x, 0.04, MID.z); inf.rotation.y = Math.atan2(B1.x - H.x, B1.z - H.z); inf.receiveShadow = true; scene.add(inf);
      const dirt = plastic(0xc07a48, { rough: 0.9 });
      for (const [a, c] of [[B2, B3], [B3, H]]) { const L = Math.hypot(c.x - a.x, c.z - a.z); b.box((a.x + c.x) / 2, 0, (a.z + c.z) / 2, 7, 0.12, L + 6, 0, { rot: Math.atan2(c.x - a.x, c.z - a.z), mat: dirt }); }
      b.cyl(MID.x, 0, MID.z, 6, 0.7, 0, { seg: 20, mat: dirt }); b.box(MID.x, 0.7, MID.z, 1.6, 0.15, 0.4, C.white, { rot: inf.rotation.y });
      b.box(B3.x, 0.1, B3.z, 2, 0.3, 2, C.white, { rot: inf.rotation.y + Math.PI / 4 });
      // bases painted on the base-path road
      for (const [q, k] of [[H, 18.0], [B1, 19.0], [B2, 20.0]]) nb.box(q.x, q.y + 0.04, q.z, 3.2, 0.06, 3.2, C.white, { rot: tr.yawAt(K(k)) + Math.PI / 4 });
      ctx.claim(MID.x, MID.z, d * 0.55);
      // pitcher Mai on the mound, batter Maki at home, Panda catching
      const mai = G.mai(3.2); mai.root.position.set(MID.x, 0.7, MID.z); mai.root.rotation.y = Math.atan2(H.x - MID.x, H.z - MID.z); ctx.group.add(mai.root);
      const hb = V2.set(H.x - MID.x, 0, H.z - MID.z).normalize();
      const bat = P.humanoid({ s: 3.4, face: 'maki', torso: NAVY, legs: NAVY, arms: NAVY, hair: P.hair.maki, buttons: C.gold, itemR: (a, s) => { a.add(new THREE.CylinderGeometry(0.22, 0.1, 1, 10).translate(0, 0.5, 0), plastic(0xc8945a), 0, -1.7 * s, 0, 0, s, 2.6 * s, s); } });
      const bp = new THREE.Vector3(H.x + hb.x * 10 - hb.z * 6, 0, H.z + hb.z * 10 + hb.x * 6); bat.root.position.copy(bp); bat.root.rotation.y = Math.atan2(MID.x - bp.x, MID.z - bp.z) + 1.2; ctx.group.add(bat.root);
      bat.armR.rotation.set(Math.PI, 0, 0); bat.armL.rotation.set(-2.6, 0, -0.4);
      anims.push((dt, t) => { const ph = (t % 2.8) / 2.8, sw = ph > 0.85 ? (ph - 0.85) / 0.15 : 0; bat.armR.rotation.set(Math.PI - sw * 1.6, 0, sw * 1.2); bat.root.rotation.y = Math.atan2(MID.x - bp.x, MID.z - bp.z) + 1.2 - sw * 1.4; mai.armR.rotation.x = ph < 0.7 ? -0.2 - ph * 2 : -2.6 + (ph - 0.7) * 10; });
      const pda = P.panda(3); pda.root.position.set(H.x + hb.x * 16, 0, H.z + hb.z * 16); pda.root.rotation.y = Math.atan2(MID.x - pda.root.position.x, MID.z - pda.root.position.z); ctx.group.add(pda.root); pda.armL.rotation.z = 1.2; pda.armR.rotation.z = -1.2;
      const from = new THREE.Vector3(bp.x, 6, bp.z);
      const balls = [[19.35, -0.3], [19.55, 0.3], [19.7, 0], [19.85, -0.35], [19.95, 0.3]];
      ctx.hazard(flyBalls(ctx, { from, targets: balls, period: 2.8 }));
      ctx.hazard(flyBalls(ctx, { from, targets: balls, period: 3.4, offset: 1.4 }));
      // Megumi on first, Yuji and Nobara cheering in the dugout
      const mg = add(P.megumi(3.2), spot(19.05, 22, 5), 19.05); mg.armL.rotation.z = -2.6;
      const yj = add(P.yuji(3.2), spot(18.6, -40, 5), 18.6); const nbr = add(P.nobara(3.2), spot(18.75, -40, 5), 18.75);
      anims.push((dt, t) => { yj.armR.rotation.z = 2.6 + Math.sin(t * 6) * 0.3; yj.armL.rotation.z = -2.6 - Math.sin(t * 6) * 0.3; nbr.armL.rotation.z = -2.4 + Math.sin(t * 5 + 1) * 0.4; });
    }
    // bleachers, floodlights, scoreboard and the home-run fence
    { const i0 = K(18.15), i1 = K(18.85); grandstand(b, tr, i0, (i1 - i0 + tr.N) % tr.N, 1, rand); }
    { const i0 = K(19.15), i1 = K(19.8); grandstand(b, tr, i0, (i1 - i0 + tr.N) % tr.N, 1, rand); }
    const flood = plastic(0xfff8e0, { emissive: 0xfff0c0, emissiveIntensity: 2 });
    for (const [k, l] of [[18.0, 30], [19.0, 30], [20.0, 28], [18.5, -60]]) { const p = spot(k, l, 3); let y = 0; for (let n = 0; n < 12; n++) y = b.box(p.x, y, p.z, 1.4, 3, 1.4, n % 2 ? C.ltgray : C.dkgray); b.box(p.x, y, p.z, 7, 4, 1, C.dkgray); for (let r = 0; r < 2; r++) for (let c = -1; c <= 1; c++) nb.box(p.x + c * 2, y + 0.6 + r * 1.8, p.z, 1.6, 1.3, 1.2, 0, { mat: flood }); ctx.claim(p.x, p.z, 4); }
    { const p = spot(20.7, 34, 14), rot = Math.atan2(MID.x - p.x, MID.z - p.z);
      b.box(p.x, 0, p.z, 1.2, 10, 1.2, C.dkgray); b.box(p.x - Math.cos(rot) * 10, 0, p.z + Math.sin(rot) * 10, 1.2, 10, 1.2, C.dkgray); b.box(p.x + Math.cos(rot) * 10, 0, p.z - Math.sin(rot) * 10, 1.2, 10, 1.2, C.dkgray);
      const sb = canvasTexture(512, 256, (g, w, h) => { g.fillStyle = '#123a1a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2cd37'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#fff'; g.font = '900 44px Arial Black, Arial'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('TOKYO', 30, 80); g.fillText('KYOTO', 30, 170); g.fillStyle = '#ffd040'; g.textAlign = 'right'; g.fillText('2', w - 40, 80); g.fillText('0', w - 40, 170); });
      const m = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 1), [plastic(C.dkgray), plastic(C.dkgray), plastic(C.dkgray), plastic(C.dkgray), new THREE.MeshStandardMaterial({ map: sb, emissive: 0xffffff, emissiveMap: sb, emissiveIntensity: 0.35 }), new THREE.MeshStandardMaterial({ map: sb, emissive: 0xffffff, emissiveMap: sb, emissiveIntensity: 0.35 })]);
      m.position.set(p.x, 16, p.z); m.rotation.y = rot; ctx.group.add(m); ctx.claim(p.x, p.z, 13); }
    arch(ctx, 20.55, { cols: [C.white, C.green], text: 'HOME RUN!', bg: '#1a4a1a', fg: '#ffffff' });
    edges(ctx, 20.25, 20.6, 3, 0.5, (p) => { nb.box(p.x, 0, p.z, 1.6, 4, 1.6, 0x2a6a2a); nb.box(p.x, 4, p.z, 1.8, 0.4, 1.8, C.yellow); });
    // giant ball and bat by the outfield
    { const p = spot(20.85, -30, 8); b.sphere(p.x, 5, p.z, 5, C.white); for (let n = -3; n <= 3; n++) b.box(p.x + n * 0.9, 5 + Math.cos(n * 0.4) * 4.7, p.z + 1.6, 0.4, 0.3, 0.3, C.red); P.rbox(b, p.x + 6, 3, p.z + 4, 1.2, 14, 1.2, 0.2, 0, 1.1, 0xc8945a); }

    // ---- distant Kyoto mountains, clouds and the sunset -------------------------------------------------
    { const cols = [0x4a5a6a, 0x5a6a7a, 0x3a4a5a];
      for (let a = 0; a < Math.PI * 2; a += 0.09) { const r = 760 + rand() * 160, x = 40 + Math.cos(a) * r, z = -20 + Math.sin(a) * r; if (!hole.test(x, z)) continue; const rad = 70 + rand() * 90, h = 70 + rand() * 120; nb.cone(x, -2, z, rad, h, cols[Math.floor(rand() * 3)], { seg: 7 }); if (rand() < 0.5) nb.cone(x, h * 0.55 - 2, z, rad * 0.45, h * 0.45, 0xb05a3a, { seg: 7 }); }
      const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshBasicMaterial({ color: 0xffe0a0, fog: false }));
      sunDisc.position.set(900, 260, 360); sunDisc.lookAt(0, 0, 0); scene.add(sunDisc);
      const sg = P.glow(0xffa860, 520, 0.6); sg.position.copy(sunDisc.position); scene.add(sg);
      const cm = plastic(0xffd0b0, { rough: 0.9, emissive: 0xff9a6a, emissiveIntensity: 0.25 });
      for (let n = 0; n < 18; n++) { const a = rand() * 6.28, r = 500 + rand() * 300, cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 150 + rand() * 80; for (let k = 0; k < 4; k++) nb.sphere(cx + (rand() - 0.5) * 50, cy + rand() * 6, cz + (rand() - 0.5) * 30, 14 + rand() * 10, 0, { mat: cm, sy: 0.45 }); }
    }
    pl(0xffb070, 230, 20, 60, 3, 160);
    // TEMP camera hook
    { let lt = 0;
      { ctx.anim((dt, t) => { const r = ctx.world.race; if (!r) return;
          if (t - lt > 8) { lt = t; console.warn('laps', r.karts.map((kk) => (kk.raceDist / tr.N).toFixed(2)).join(' '), 'state', r.state, r.time?.toFixed?.(1)); }
          const q = location.hash.slice(1); if (!q) return; const [k, h, back, side, ahead] = q.split(',').map(Number); const i = K(k), p = tr.at(i, side || 0, h), yaw = tr.yawAt(i), L = tr.at(tr.wrap(i + (ahead || 30)), 0, 2);
          p.x -= Math.sin(yaw) * back; p.z -= Math.cos(yaw) * back;
          for (const c of [r.introCam, ...r.cams.map((c) => c.chase.cam)]) { if (k < 0) { scene.fog.near = 4000; scene.fog.far = 6000; c.position.set(bounds.cx, 900, bounds.cz + 1); c.lookAt(bounds.cx, 0, bounds.cz); } else { c.position.copy(p); c.lookAt(L); } }
        }); } }
  },
};
