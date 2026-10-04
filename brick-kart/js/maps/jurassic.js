// Jurassic Brick Park: Main Street, the Jurassic Park gate, Dilophosaurus in the
// jungle, the Pteranodon aviary, Gyrosphere Valley (with a Gallimimus
// stampede), the T. rex paddock, the Indominus rex enclosure, a Spinosaurus
// river ford, Blue's raptor pack chasing Owen, the Mount Sibo volcano, a glide
// from the helipad cliff over the Mosasaurus lagoon and the Visitor Center.
import { THREE, BrickBuilder, C, plastic, groundPlane, pick, rock, palm, cloud, jungleTree, fern, cannon, crossing, trackMover, tunnel, disc, strokeTrack, inRange, edges, each, arch, canvasTexture, brickGeometry, minifig, roundTree, mountain } from './kit.js';
import * as P from './jurassic-props.js';

const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const f = Math.max(0, Math.min(1, (x - a) / (b - a))); return f * f * (3 - 2 * f); };
const lerpAng = (a, b, f) => { let d = b - a; d = Number.isFinite(d) ? d - Math.round(d / TAU) * TAU : 0; return a + d * f; };

function holder(ctx, rig, s = 1, name = null) {
  const h = new THREE.Group();
  if (name) (ctx.group.userData.dinos ||= {})[name] = h;
  rig.root.scale.setScalar(s);
  h.add(rig.root);
  ctx.group.add(h);
  return h;
}

// ---------------------------------------------------------------------------------
// Hazards (each follows the { update, test, near } contract)
// ---------------------------------------------------------------------------------

// T. rex breaks out of its paddock: roars at the roadside, stomps across, roars, walks back.
function rexCrossing(ctx, rig, i, side, s) {
  const tr = ctx.track, fx = () => ctx.world.race?.fx, au = () => ctx.world.race?.audio;
  const W = tr.HW[i] + tr.SH[i] + 13;
  const A = tr.at(i, side * W, 0), B = tr.at(i, -side * W, 0);
  const h = holder(ctx, rig, s, 'rex');
  const L = A.distanceTo(B), speed = 9, dwell = 4.5, walk = L / speed, T = 2 * (dwell + walk);
  const yawAB = Math.atan2(B.x - A.x, B.z - A.z);
  const pos = new THREE.Vector3().copy(A);
  let yaw = yawAB, lastRoar = -1, lastStep = 0, walking = false;
  h.position.copy(A);
  return {
    update(dt, t) {
      const ph = t % T;
      const cyc = Math.floor(t / T);
      let roar = 0;
      walking = false;
      if (ph < dwell || (ph >= dwell + walk && ph < 2 * dwell + walk)) {
        const atA = ph < dwell, t0 = atA ? 0 : dwell + walk, f = ph - t0;
        pos.copy(atA ? A : B);
        const want = atA ? yawAB : yawAB + Math.PI;
        yaw = lerpAng(atA ? yawAB + Math.PI : yawAB, want, smooth(0, 1.4, f));
        roar = smooth(1.6, 2.0, f) * (1 - smooth(3.2, 3.6, f));
        const key = cyc * 2 + (atA ? 0 : 1);
        if (roar > 0.5 && lastRoar !== key) {
          lastRoar = key;
          au()?.sfx('storm', pos);
          const hp = pos;
          for (let k = 0; k < 10; k++) fx()?.puff(hp.x + Math.sin(yaw) * 14 * s, hp.y + 14 * s, hp.z + Math.cos(yaw) * 14 * s, Math.sin(yaw) * 8 + (Math.random() - 0.5) * 4, 2, Math.cos(yaw) * 8 + (Math.random() - 0.5) * 4, 0xe8e0d0, 0.7);
        }
        P.theroIdle(rig, t, roar);
      } else {
        walking = true;
        const toB = ph < dwell + walk;
        const f = (ph - (toB ? dwell : 2 * dwell + walk)) / walk;
        if (toB) pos.lerpVectors(A, B, f); else pos.lerpVectors(B, A, f);
        yaw = toB ? yawAB : yawAB + Math.PI;
        const wp = f * walk * speed * 0.42 / s;
        P.theroWalk(rig, wp, 0.5);
        rig.head.rotation.x = Math.sin(wp * 2) * 0.05; rig.head.rotation.y = 0; rig.jaw.rotation.x = 0.15;
        const step = Math.floor(wp / Math.PI);
        if (step !== lastStep) {
          lastStep = step;
          const fp = pos;
          for (let k = 0; k < 6; k++) fx()?.puff(fp.x + (Math.random() - 0.5) * 6, fp.y + 0.3, fp.z + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5, 1 + Math.random() * 2, (Math.random() - 0.5) * 5, 0x9a8a6a, 0.7);
        }
      }
      h.position.copy(pos);
      h.rotation.y = yaw;
      h.userData.walking = walking;
    },
    test(p) { const d = Math.hypot(p.x - pos.x, p.z - pos.z); return Math.abs(p.y - pos.y) > 8 ? null : d < 3.4 * s ? 'wreck' : d < 4.8 * s ? 'bump' : null; },
    near(p, r) { return Math.hypot(p.x - pos.x, p.z - pos.z) < 5.5 * s + r; },
  };
}

// A herd of Gallimimus sprinting across the road in waves.
function stampede(ctx, k, n, side, rand) {
  const tr = ctx.track, i0 = tr.kToIndex(k);
  const P0 = 12;
  const herd = [];
  for (let j = 0; j < n; j++) {
    const i = tr.wrap(i0 + Math.round((rand() - 0.5) * 30));
    const W = tr.HW[i] + tr.SH[i] + 40;
    const A = tr.at(i, side * W, 0), B = tr.at(i, -side * W, 0);
    const rig = P.gallimimus();
    const h = holder(ctx, rig, 1.25, 'galli' + j);
    h.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
    h.visible = false;
    herd.push({ rig, h, A, B, L: A.distanceTo(B), delay: j * 0.32 + rand() * 0.5, speed: 20 + rand() * 4, on: false, pos: new THREE.Vector3(), ph: rand() * 6 });
  }
  return {
    update(dt, t) {
      const tc = t % P0;
      for (const a of herd) {
        const s = (tc - a.delay) * a.speed;
        a.on = s > 0 && s < a.L;
        a.h.visible = a.on;
        if (!a.on) continue;
        a.pos.lerpVectors(a.A, a.B, s / a.L);
        a.h.position.copy(a.pos);
        const w = s * 0.9 + a.ph;
        a.rig.legL.rotation.x = Math.sin(w) * 0.9; a.rig.legR.rotation.x = -Math.sin(w) * 0.9;
        a.rig.bodyP.position.y = Math.abs(Math.cos(w)) * 0.3;
        if (Math.random() < 0.15) ctx.world.race?.fx.puff(a.pos.x, a.pos.y + 0.3, a.pos.z, (Math.random() - 0.5) * 3, 1.5, (Math.random() - 0.5) * 3, 0xb0a078, 0.6);
      }
    },
    test(p) { for (const a of herd) if (a.on && Math.abs(p.x - a.pos.x) < 2 && Math.abs(p.z - a.pos.z) < 2 && Math.hypot(p.x - a.pos.x, p.z - a.pos.z) < 1.9 && p.y < a.pos.y + 3.5) return 'spin'; return null; },
    near(p, r) { for (const a of herd) if (a.on && Math.hypot(p.x - a.pos.x, p.z - a.pos.z) < 2 + r) return true; return false; },
  };
}

// Dilophosaurus by the roadside: rattles its frill, then spits venom onto the road.
function diloSpit(ctx, i, side, offset, rand) {
  const tr = ctx.track, fx = () => ctx.world.race?.fx;
  const rig = P.dilophosaurus();
  const base = tr.at(i, side * (tr.HW[i] + tr.SH[i] + 3.5), 0);
  const c = tr.at(i, 0, 0);
  const h = holder(ctx, rig, 2.2, 'dilo' + side);
  h.position.copy(base);
  h.rotation.y = Math.atan2(c.x - base.x, c.z - base.z);
  const goo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), plastic(0x9aff3a, { emissive: 0x5acc10, emissiveIntensity: 1.2 }));
  const marker = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.7, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8aff2a, transparent: true, opacity: 0.8, depthWrite: false }));
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(2.5, 18).rotateX(-Math.PI / 2), plastic(0x7ae02a, { trans: true, opacity: 0.75, emissive: 0x3a9a10, emissiveIntensity: 0.8 }));
  ctx.group.add(goo, marker, puddle);
  goo.visible = marker.visible = puddle.visible = false;
  const from = base.clone(); from.y += 8;
  const target = new THREE.Vector3();
  const PER = 4.6, FL = 0.8;
  let cyc = -1, puddleT = 0;
  return {
    update(dt, t) {
      const tt = t + offset, ph = tt % PER, cy = Math.floor(tt / PER);
      const warn = smooth(1.6, 2.2, ph) * (1 - smooth(3.2, 3.6, ph));
      P.diloFrill(rig, warn, t + offset);
      rig.head.rotation.x = -warn * 0.35 + Math.sin(t * 2 + offset) * 0.05;
      rig.head.rotation.y = Math.sin(t * 0.7 + offset) * 0.3 * (1 - warn);
      rig.bodyP.rotation.x = -warn * 0.08;
      if (cy !== cyc && ph > 2.4) {
        cyc = cy;
        const j = tr.wrap(i + Math.round(rand() * 20 - 8));
        tr.at(j, (rand() * 1.3 - 0.65) * tr.HW[j], 0.08, target);
      }
      if (cyc === cy && ph > 2.4 && ph < 2.4 + FL) {
        const f = (ph - 2.4) / FL;
        goo.visible = marker.visible = true;
        goo.position.lerpVectors(from, target, f); goo.position.y += Math.sin(f * Math.PI) * 5;
        marker.position.copy(target);
        marker.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(t * 14));
      } else if (goo.visible) {
        goo.visible = marker.visible = false;
        puddleT = 2.3; puddle.position.copy(target); puddle.visible = true;
        fx()?.splash(target, 0x8aff3a);
      } else if (ph > 2.0 && ph < 2.4) {
        marker.visible = true; marker.position.copy(target);
        marker.material.opacity = 0.3 + 0.4 * Math.abs(Math.sin(t * 14));
      }
      if (puddleT > 0) { puddleT -= dt; puddle.scale.setScalar(Math.min(1, puddleT * 2)); if (puddleT <= 0) puddle.visible = false; }
    },
    test(p) { return puddleT > 0.2 && Math.hypot(p.x - target.x, p.z - target.z) < 2.5 && Math.abs(p.y - target.y) < 2 ? 'spin' : null; },
    near(p, r) { return (puddleT > 0 || marker.visible) && Math.hypot(p.x - target.x, p.z - target.z) < 2.6 + r; },
  };
}

// Pteranodon circling high over the road, then diving to skim it head-on.
function pteroSwoop(ctx, k, lat, offset, radius = 40) {
  const tr = ctx.track, i0 = tr.kToIndex(k);
  const rig = P.pteranodon();
  const h = holder(ctx, rig, 1.35);
  const Cc = tr.at(i0, 0, 0);
  const S = tr.at(i0 + 26, lat * tr.HW[tr.wrap(i0 + 26)], 2.2), E = tr.at(i0 - 26, lat * tr.HW[tr.wrap(i0 - 26)], 2.2);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  ctx.group.add(shadow);
  const PER = 11, pos = new THREE.Vector3(), prev = new THREE.Vector3(), a0 = new THREE.Vector3(), tmp = new THREE.Vector3();
  const circ = (tt, out) => { const a = tt * 0.55 + offset; return out.set(Cc.x + Math.cos(a) * radius, Cc.y + 30 + Math.sin(tt * 0.7) * 3, Cc.z + Math.sin(a) * radius); };
  let low = false;
  return {
    update(dt, t) {
      const tt = t + offset * 3, ph = tt % PER, base = tt - ph;
      prev.copy(pos);
      low = false;
      if (ph < 6) { circ(tt, pos); P.flap(rig, t, 3, 0.25); }
      else if (ph < 7.4) { circ(base + 6, a0); const f = smooth(6, 7.4, ph); pos.lerpVectors(a0, S, f); pos.y += Math.sin(f * Math.PI) * 4; P.flap(rig, t, 2, 0.1); rig.wingL.rotation.z = rig.wingR.rotation.z = 0; rig.wingL.rotation.z = 0.35 * f; rig.wingR.rotation.z = -0.35 * f; }
      else if (ph < 8.8) { const f = (ph - 7.4) / 1.4; pos.lerpVectors(S, E, f); pos.y += Math.sin(t * 5) * 0.2; low = true; P.flap(rig, t, 9, 0.35); }
      else { circ(base + PER, a0); const f = smooth(8.8, PER, ph); pos.lerpVectors(E, a0, f); pos.y += Math.sin(f * Math.PI) * 6; P.flap(rig, t, 7, 0.55); }
      h.position.copy(pos);
      tmp.subVectors(pos, prev);
      if (tmp.lengthSq() > 1e-6) { h.rotation.y = Math.atan2(tmp.x, tmp.z); rig.root.rotation.x = Math.max(-0.6, Math.min(0.6, -Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)))); }
      const showSh = ph > 6.3 && ph < 8.9;
      shadow.visible = showSh;
      if (showSh) {
        const f = ph < 7.4 ? smooth(6.3, 7.4, ph) : 1;
        shadow.position.set(ph < 7.4 ? S.x : pos.x, (ph < 7.4 ? S.y : pos.y) - 2.1, ph < 7.4 ? S.z : pos.z);
        shadow.scale.setScalar(0.6 + f * 0.8);
        shadow.material.opacity = 0.15 + 0.3 * f;
      }
    },
    test(p) { return low && Math.hypot(p.x - pos.x, p.z - pos.z) < 3 && Math.abs(p.y - pos.y) < 3 ? 'spin' : null; },
    near(p, r) { return low && Math.hypot(p.x - pos.x, p.z - pos.z) < 4 + r; },
  };
}

// Spinosaurus standing in the river beside the ford: rears up, then lunges its jaws over the outer lane.
function spinoLunge(ctx, rig, i, side, s) {
  const tr = ctx.track;
  const home = tr.at(i, side * (tr.HW[i] + 24 * s), 0); home.y = -1.2;
  const c = tr.at(i, 0, 0);
  const yaw = Math.atan2(c.x - home.x, c.z - home.z);
  const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const h = holder(ctx, rig, s, 'spino');
  h.rotation.y = yaw;
  const zone = tr.at(i, side * (tr.HW[i] - 4.5), 0);
  const PER = 6.5;
  let hot = false, lastRoar = -1;
  return {
    update(dt, t) {
      const ph = t % PER;
      const rear = smooth(3.0, 3.8, ph) * (1 - smooth(4.0, 4.3, ph));
      const lunge = smooth(4.0, 4.35, ph) * (1 - smooth(5.0, 5.8, ph));
      hot = ph > 4.15 && ph < 5.2;
      h.position.copy(home).addScaledVector(dir, lunge * 7 * s - rear * 1.5 * s);
      rig.bodyP.rotation.x = -rear * 0.3 + lunge * 0.42;
      rig.bodyP.position.y = rear * 1.5 - lunge * 2.2;
      rig.head.rotation.x = -rear * 0.5 + lunge * 0.35;
      rig.jaw.rotation.x = 0.1 + rear * 0.6 + lunge * (0.35 + Math.sin(t * 22) * 0.3);
      rig.legL.rotation.x = Math.sin(t * 0.6) * 0.05 - lunge * 0.25; rig.legR.rotation.x = lunge * 0.3;
      rig.tail1.rotation.y = Math.sin(t * 0.9) * 0.2; rig.tail2.rotation.y = Math.sin(t * 0.9 - 0.7) * 0.3;
      rig.tail1.rotation.x = -lunge * 0.3;
      if (ph < 3) { rig.head.rotation.y = Math.sin(t * 0.8) * 0.35; } else rig.head.rotation.y *= 0.9;
      const cyc = Math.floor(t / PER);
      if (rear > 0.6 && lastRoar !== cyc) { lastRoar = cyc; ctx.world.race?.audio.sfx('storm', home); }
      if (hot && Math.random() < 0.3) ctx.world.race?.fx.splash(zone, 0x9ad8ff);
    },
    test(p) { return hot && Math.hypot(p.x - zone.x, p.z - zone.z) < 5 && Math.abs(p.y - zone.y) < 4 ? 'spin' : null; },
    near(p, r) { return hot && Math.hypot(p.x - zone.x, p.z - zone.z) < 5 + r; },
  };
}

// Mosasaurus bursting out of the lagoon and slamming its jaws over the sea wall.
function mosaLunge(ctx, rig, i, side, offset, s) {
  const tr = ctx.track, fx = () => ctx.world.race?.fx;
  const home = tr.at(i, side * (tr.HW[i] + tr.SH[i] + 20), 0); home.y = -2;
  const c = tr.at(i, 0, 0);
  const yaw = Math.atan2(c.x - home.x, c.z - home.z);
  const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const h = holder(ctx, rig, s, 'mosaShore');
  h.rotation.y = yaw;
  const zone = tr.at(i, side * (tr.HW[i] - 4), 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3, 4.2, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
  ring.position.copy(home).addScaledVector(dir, 8); ring.position.y = -1.3;
  ctx.group.add(ring);
  const PER = 7.5;
  let hot = false, splashed = -1;
  return {
    update(dt, t) {
      const tt = t + offset, ph = tt % PER, cyc = Math.floor(tt / PER);
      const warn = smooth(3.2, 4.8, ph) * (1 - smooth(5.2, 5.4, ph));
      ring.visible = warn > 0.01;
      ring.scale.setScalar(0.6 + ((t * 1.5) % 1) * 1.2);
      ring.material.opacity = warn * 0.7 * (1 - ((t * 1.5) % 1));
      if (warn > 0.3 && Math.random() < 0.25) fx()?.puff(ring.position.x + (Math.random() - 0.5) * 6, -1.2, ring.position.z + (Math.random() - 0.5) * 6, 0, 2, 0, 0xffffff, 0.5);
      const rise = smooth(4.8, 5.3, ph) * (1 - smooth(6.1, 6.9, ph));
      const slam = smooth(5.3, 5.6, ph) * (1 - smooth(6.0, 6.6, ph));
      hot = ph > 5.45 && ph < 6.2;
      h.visible = ph > 4.7 && ph < 7.0;
      h.position.copy(home).addScaledVector(dir, 4 * s * rise);
      h.position.y = -14 * s + rise * 13 * s;
      rig.root.rotation.x = -0.9 * rise + slam * 1.15;
      rig.jaw.rotation.x = 0.1 + rise * 0.5 - slam * 0.4;
      rig.tail.rotation.y = Math.sin(t * 6) * 0.3;
      if (slam > 0.8 && splashed !== cyc) { splashed = cyc; fx()?.splash(zone, 0xbfe8ff); fx()?.splash(ring.position, 0xffffff); ctx.world.race?.audio.sfx('splash', zone); }
    },
    test(p) { return hot && Math.hypot(p.x - zone.x, p.z - zone.z) < 5 && Math.abs(p.y - zone.y) < 4 ? 'spin' : null; },
    near(p, r) { return ring.visible && Math.hypot(p.x - zone.x, p.z - zone.z) < 5 + r; },
  };
}

// ---------------------------------------------------------------------------------
export default {
  id: 'jurassic', name: 'Jurassic Brick Park', subtitle: 'Outrun the T. rex, dodge the raptors, glide over the Mosasaurus',
  cup: 'movie', seed: 93, width: 28, shoulder: 8, edge: 'fence', start: 0.5,
  points: [[-159, -222, 0], [-48, -231, 0], [64, -222, 0], [159, -238, 0], [255, -199, 0], [294, -111, 0], [262, -24, 0], [302, 64, 0], [271, 151, 0], [183, 199, 0], [95, 183, 0], [48, 111, 2], [-24, 87, 4], [-64, 159, 8], [-127, 215, 14], [-222, 222, 22], [-294, 159, 28], [-310, 64, 30], [-262, -31, 14], [-222, -120, 4], [-238, -172, 0], [-208, -216, 0]],
  sections: [
    { from: 20.6, to: 1.5, edge: 'wall', shoulder: 5 },
    { from: 4.3, to: 7.6, edge: 'open', shoulder: 14, width: 34 },
    { from: 10.95, to: 11.25, surface: 'water' },
    { from: 11.6, to: 14.2, surface: 'dirt', shoulder: 6 },
    { from: 16.45, to: 17.1, surface: 'helipad', edge: 'wall', shoulder: 3 },
    { from: 17.14, to: 18.45, gap: true },
    { from: 18.45, to: 19.15, edge: 'wall', shoulder: 3 },
    { from: 19.15, to: 19.9, edge: 'wall', shoulder: 12 },
  ],
  items: [1.0, 3.3, 5.6, 8.6, 12.4, 15.2, 18.75],
  boosts: [[0.6, 0], [2.7, 0.4], [4.8, -0.3], [7.0, 0.3], [9.8, 0], [12.9, -0.3], [14.8, 0], [16.2, 0], [19.6, 0]],
  ramps: [],
  gliders: [17.04],
  studs: [[0.3, 0.4, 8], [2.2, -0.4, 6], [4.4, 0, 8], [7.9, 0, 6], [10.2, 0.4, 6], [11.9, 0, 8], [14.0, -0.3, 6], [15.8, 0.3, 6], [16.7, 0, 6], [19.4, 0, 6], [21.0, -0.4, 6]],
  theme: {
    sky: [0x3f8fd8, 0xdff0e0, 0x6a8a5a], fog: [0xd4e8d4, 220, 1050], sun: { color: 0xfff0d0, intensity: 2.6, dir: [0.5, 1, 0.3] },
    hemi: [0xe8f4ff, 0x4a6a3a, 1.2], envIntensity: 0.7,
    ground: 0x3a8a32, groundPitch: 1.6, shoulder: 0x58a040, dust: 0x9a7a4a,
    road: { base: '#4e4b47', line: '#f2cd37' },
    surfaces: {
      dirt: { base: '#9a7a4a', line: null, seams: 'rgba(60,40,20,0.3)' },
      helipad: { base: '#8a8e90', line: '#f2cd37', seams: 'rgba(0,0,0,0.25)', dashed: true },
    },
    wall: [C.dkstone, C.ltgray], curb: [C.yellow, C.black], gate: [C.rbrown, C.dktan], fence: [C.dkgray, C.yellow, C.black],
    support: 'bank', pillar: C.dkstone, pillar2: C.dkgray, skirt: ['#7a6a4a', '#4a3e2a'], skirtColor: C.dkstone,
    rampSide: C.rbrown, ramp: C.yellow,
    music: { bpm: 126, root: 55, scale: 'major', style: 'rock' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    const L = new P.Local(b);
    const cx = bounds.cx, cz = bounds.cz;
    // which lateral side of sample i faces away from the park centre
    const outSide = (i) => { const p = tr.at(i, 10, 0), q = tr.at(i, -10, 0); return Math.hypot(p.x - cx, p.z - cz) > Math.hypot(q.x - cx, q.z - cz) ? 1 : -1; };
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    const anims = [];
    ctx.anim((dt, t) => { for (const f of anims) f(dt, t); });
    const flame = plastic(0xff9a20, { trans: true, opacity: 0.85, emissive: 0xff7010, emissiveIntensity: 2.5 });

    // ---- water: the Mosasaurus lagoon (under the glide), a jungle river and its lake ----
    const inGlide = (i) => inRange(tr, i, 17.0, 18.6);
    const ford = tr.at(K(11.1), 0, 0);
    const LAG = [-181, -40, 82];
    const LAKE = [16, 170, 18];
    const river = [[LAKE[0], LAKE[1]], [ford.x, ford.z], [27, 35], [-53, -9], [-124, -35]];
    const drawRiver = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = g.lineJoin = 'round'; g.beginPath(); river.forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); };
    // the volcano site is needed for the island outline
    let V = null;
    for (let off = 100; off < 260 && !V; off += 8) { const i = K(15.0), sd = outSide(i), p = tr.at(i, sd * (edgeLat(i) + off), 0); if (tr.clearance(p.x, p.z, 130) > 92) V = p; }
    const bumps = [];
    for (let n = 0; n < 40; n++) { const i = Math.floor(rand() * tr.N), sd = outSide(i); const p = tr.at(i, sd * (edgeLat(i) + 120 + rand() * 60), 0); bumps.push([p.x, p.z, 40 + rand() * 50]); }
    const islandMask = (grow, res) => ctx.makeMask(3000, res, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.strokeStyle = '#000';
      strokeTrack(g, tr, toPx, sc, 150 + grow);
      for (const [x, z, r] of bumps) disc(g, toPx, sc, x, z, r + grow);
      if (V) disc(g, toPx, sc, V.x, V.z, 120 + grow);
      g.fillStyle = '#000';
      disc(g, toPx, sc, LAG[0], LAG[1], LAG[2] - grow); disc(g, toPx, sc, LAKE[0], LAKE[1], LAKE[2] - grow);
      strokeTrack(g, tr, toPx, sc, 34 - grow, inGlide);
      drawRiver(g, toPx, sc, 20 - grow * 2);
    });
    const hole = islandMask(0, 2048);
    ctx.cutGround(hole);
    const sea = groundPlane(0x1a78c0, -1.6, 3000, 1.6, { transparent: true, opacity: 0.88, rough: 0.12 });
    scene.add(sea);
    ctx.anim((dt, t) => { sea.material.map.offset.set(Math.sin(t * 0.3) * 0.3, t * 0.04); sea.material.bumpMap.offset.copy(sea.material.map.offset); });
    scene.add(groundPlane(0xe4cd9e, -0.35, 3000, 1.6, { mask: islandMask(9, 1024) }));
    const dry = (x, z) => hole.test(x, z);
    // sandy / rocky banks
    ctx.scatter(40, { minC: 0, maxC: 200, r: 3, pad: 60, test: (x, z) => dry(x, z) && (Math.hypot(x - LAG[0], z - LAG[1]) < LAG[2] + 14 || Math.hypot(x - LAKE[0], z - LAKE[1]) < LAKE[2] + 10) }, (x, z) => rock(b, x, 0, z, 1.2, rand, [C.dkstone, C.tan, C.dkgray]));

    // ---- keep creature paths clear of trees ----
    const claimLine = (i, w, r) => { for (let l = -w; l <= w; l += 5) { const p = tr.at(i, l, 0); ctx.claim(p.x, p.z, r); } };
    claimLine(K(9.35), edgeLat(K(9.35)) + 20, 9);
    for (let o = -16; o <= 16; o += 4) claimLine(tr.wrap(K(6.38) + o), edgeLat(K(6.38)) + 42, 3);
    for (const sd of [-1, 1]) { const i = K(11.1); for (let l = tr.HW[i]; l < tr.HW[i] + 40; l += 5) { const p = tr.at(i, sd * l, 0); ctx.claim(p.x, p.z, 11); } }
    for (const [k, sd] of [[2.55, 1], [3.0, -1]]) { const i = K(k), p = tr.at(i, sd * (edgeLat(i) + 3.5), 0); ctx.claim(p.x, p.z, 6); }
    // ---- ground patches: Main Street paving, valley meadow, volcanic rock ----
    const onMain = (i) => inRange(tr, i, 20.6, 1.55);
    const pave = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, 30, onMain); });
    scene.add(groundPlane(0xb8b2a0, -0.04, 1600, 1.6, { mask: pave }));
    const inValley = (i) => inRange(tr, i, 4.2, 7.7);
    const meadow = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, 110, inValley); });
    scene.add(groundPlane(0x6aaa3a, -0.06, 1600, 1.6, { mask: meadow }));
    const inValleyXZ = (x, z) => meadow.test(x, z);

    // ================= MAIN STREET (Jurassic World) =================
    const shopCols = [C.white, C.tan, C.sand, 0xe8d8b0, C.ltgray];
    const awnCols = [C.red, C.azure, C.yellow, C.green, C.orange, C.blue];
    const shopNames = ['DINO DOGS', 'T-REX CAFE', 'CREATION LAB', 'GYRO TOURS', 'MR. DNA', 'AMBER GIFTS', 'RAPTOR PIZZA', 'FOSSIL SHOP'];
    let sn = 0;
    each(tr, 20.7, 1.35, 16, (i) => {
      for (const sd of [-1, 1]) {
        const lat = sd * (edgeLat(i) + 9);
        const p = tr.at(i, lat, 0);
        if (!ctx.free(p.x, p.z, 7)) continue;
        const yaw = tr.yawAt(i) + (sd > 0 ? Math.PI / 2 : -Math.PI / 2);
        const S = new P.Local(b, p.x, 0, p.z, yaw);
        const h = 8 + Math.floor(rand() * 3) * 3;
        S.boxB(0, 0, -2, 13, h, 10, pick(rand, shopCols));
        S.boxB(0, h, -2, 13.6, 0.8, 10.6, C.dkgray);
        S.boxB(0, 0.2, 3.05, 9, 4, 0.2, C.azure, { matOpts: { trans: true, opacity: 0.55 } });
        S.box(0, 4.8, 4.2, 12, 0.3, 2.6, pick(rand, awnCols), { rx: -0.25 });
        S.boxB(0, 5.6, 3.1, 10, 1.8, 0.3, C.black);
        for (let w = -4; w <= 4; w += 4) S.boxB(w, 6.2 + (h > 9 ? 2 : 0), 3.05, 2, 2, 0.2, C.azure);
        const tex = P.textTexture(shopNames[sn++ % shopNames.length], '#1b2a34', pick(rand, ['#f2cd37', '#ffffff', '#ff8a3a', '#6ad8ff']), 256, 48);
        const m = P.signPlane(ctx.group, tex, 0, 0, 0, 0, 9.6, 1.7, 0.4);
        const q = new THREE.Vector3(0, 6.5, 3.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        m.position.set(p.x + q.x, q.y, p.z + q.z); m.rotation.y = yaw;
        ctx.claim(p.x, p.z, 8);
        // crowds on the sidewalk
        for (let n = 0; n < 3; n++) {
          const f = tr.at(i + (rand() - 0.5) * 12, sd * (tr.HW[i] + tr.SH[i] + 1.5 + rand() * 2.5), 0);
          minifig(b, f.x, 0, f.z, yaw + Math.PI + (rand() - 0.5), pick(rand, [C.red, C.blue, C.yellow, C.white, C.green, C.orange, C.azure, C.pink]), rand);
        }
      }
    });
    edges(ctx, 20.7, 1.4, 12, 1.4, (p) => { b.box(p.x, 0, p.z, 0.4, 6, 0.4, C.dkgray); b.box(p.x, 6, p.z, 1.2, 0.5, 1.2, C.dkgray); b.box(p.x, 5.6, p.z, 0.8, 0.4, 0.8, C.yellow, { matOpts: { emissive: 0xffe08a, emissiveIntensity: 1 } }); });
    // Innovation Center at the head of Main Street (park side)
    {
      const i = K(0.9), sd = -outSide(i);
      const p = tr.at(i, sd * (edgeLat(i) + 58), 0);
      if (tr.clearance(p.x, p.z, 80) > 30) {
        const c = tr.at(i, 0, 0);
        P.innovationCenter(new P.Local(b, p.x, 0, p.z, Math.atan2(c.x - p.x, c.z - p.z)));
        ctx.claim(p.x, p.z, 34);
      }
      // JURASSIC WORLD sign on the other side
      const q = tr.at(K(0.35), -sd * (edgeLat(K(0.35)) + 12), 0);
      const yaw = tr.yawAt(K(0.35));
      const S = new P.Local(b, q.x, 0, q.z, yaw);
      S.boxB(-9, 0, 0, 1.2, 9, 1.2, C.dkgray); S.boxB(9, 0, 0, 1.2, 9, 1.2, C.dkgray); S.boxB(0, 9, 0, 22, 6, 1, C.black);
      P.signPlane(ctx.group, P.textTexture('JURASSIC WORLD', '#101418', '#f2cd37', 512, 128), q.x - Math.sin(yaw) * 0.6, 12, q.z - Math.cos(yaw) * 0.6, yaw + Math.PI, 21, 5.4, 0.5);
      ctx.claim(q.x, q.z, 12);
    }
    // monorail on the outside of Main Street
    {
      const pts = [];
      each(tr, 20.7, 1.5, 8, (i) => { const sd = outSide(i); const p = tr.at(i, sd * (edgeLat(i) + 26), 0); pts.push(p); });
      for (let n = 0; n < pts.length; n++) {
        const p = pts[n];
        if (n % 2 === 0) { b.box(p.x, 0, p.z, 1.6, 9, 1.6, C.white); b.box(p.x, 8.6, p.z, 3.4, 0.8, 1.6, C.white); }
        if (n) { const q = pts[n - 1]; b.boxM(new THREE.Matrix4().compose(new THREE.Vector3((p.x + q.x) / 2, 9.6, (p.z + q.z) / 2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(p.x - q.x, p.z - q.z)), new THREE.Vector3(1.6, 1.2, p.distanceTo(q) + 0.2)), C.ltgray); }
      }
      const train = P.part((T) => {
        for (let c = 0; c < 3; c++) { T.box(0, 12, c * 9 - 9, 3.4, 3.6, 8.6, C.white); T.box(0, 12.6, c * 9 - 9, 3.45, 1.3, 7.6, C.azure); T.box(0, 10.6, c * 9 - 9, 3.45, 0.5, 8.6, C.red); }
        T.box(0, 12, 14.5, 3.0, 3.0, 3, C.white, { rx: 0.4 });
      }, 'monorail');
      ctx.group.add(train);
      let s = 0, dir = 1;
      const lens = [0]; for (let n = 1; n < pts.length; n++) lens.push(lens[n - 1] + pts[n].distanceTo(pts[n - 1]));
      const total = lens[lens.length - 1];
      anims.push((dt) => {
        s += dir * dt * 16; if (s > total - 15) { s = total - 15; dir = -1; } if (s < 15) { s = 15; dir = 1; }
        let n = 1; while (n < pts.length - 1 && lens[n] < s) n++;
        const a = pts[n - 1], c = pts[n], f = (s - lens[n - 1]) / (lens[n] - lens[n - 1] || 1);
        train.position.set(a.x + (c.x - a.x) * f, 0, a.z + (c.z - a.z) * f);
        train.rotation.y = Math.atan2(c.x - a.x, c.z - a.z) + (dir < 0 ? Math.PI : 0);
      });
    }

    // ================= JURASSIC PARK GATE =================
    {
      const i = K(1.95), p = tr.at(i, 0, 0), yaw = tr.yawAt(i);
      const span = edgeLat(i) + 1;
      const X = P.jpGate(new P.Local(b, p.x, 0, p.z, yaw), span, flame);
      const logo = P.logoTexture();
      const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      P.signPlane(ctx.group, logo, p.x - fw.x * 1.75, 22.5, p.z - fw.z * 1.75, yaw + Math.PI, X * 1.2, X * 0.3, 0.3);
      P.signPlane(ctx.group, logo, p.x + fw.x * 1.75, 22.5, p.z + fw.z * 1.75, yaw, X * 1.2, X * 0.3, 0.3);
      for (const sd of [-1, 1]) { const q = tr.at(i, sd * (X + 30), 0); ctx.claim(q.x, q.z, 30); }
      const light = new THREE.PointLight(0xff9a3a, 2.5, 60, 1.6); light.position.set(p.x, 26, p.z); scene.add(light);
      anims.push((dt, t) => { light.intensity = 2.2 + Math.sin(t * 11) * 0.4; });
    }

    // ================= JUNGLE (everywhere that isn't valley, town or water) =================
    const jungleOK = (x, z) => dry(x, z) && !inValleyXZ(x, z) && !pave.test(x, z);
    edges(ctx, 1.6, 4.2, 9, 2.5, (p) => { if (rand() < 0.85 && ctx.free(p.x, p.z, 2)) (rand() < 0.3 ? palm(b, p.x, 0, p.z, 1.1, rand) : jungleTree(b, p.x, p.z, 1 + rand() * 0.5, rand)); });
    edges(ctx, 7.7, 16.3, 11, 3, (p, i) => { if (rand() < 0.7 && dry(p.x, p.z) && tr.py(i) < 3 && ctx.free(p.x, p.z, 2)) jungleTree(b, p.x, p.z, 1 + rand() * 0.5, rand); });

    // ================= DILOPHOSAURUS =================
    ctx.hazard(diloSpit(ctx, K(2.55), 1, 0, rand));
    ctx.hazard(diloSpit(ctx, K(3.0), -1, 2.1, rand));

    // ================= PTERANODON AVIARY =================
    {
      const i = K(3.7), sd = outSide(i);
      const p = tr.at(i, sd * (edgeLat(i) + 62), 0);
      const R = 42;
      for (let m = 0; m < 12; m++) {
        const a = m / 12 * TAU;
        for (let k = 0; k < 8; k++) {
          const e0 = k / 8 * Math.PI / 2, e1 = (k + 1) / 8 * Math.PI / 2;
          const x0 = p.x + Math.cos(a) * R * Math.cos(e0), z0 = p.z + Math.sin(a) * R * Math.cos(e0), y0 = R * 0.8 * Math.sin(e0);
          const x1 = p.x + Math.cos(a) * R * Math.cos(e1), z1 = p.z + Math.sin(a) * R * Math.cos(e1), y1 = R * 0.8 * Math.sin(e1);
          const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
          const m4 = new THREE.Matrix4().lookAt(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1), new THREE.Vector3(0, 1, 0));
          m4.scale(new THREE.Vector3(0.6, 0.6, len)); m4.setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
          b.boxM(m4, C.ltgray);
        }
      }
      for (const e of [0.3, 0.6, 0.85]) {
        const r = R * Math.cos(e * Math.PI / 2), y = R * 0.8 * Math.sin(e * Math.PI / 2);
        for (let m = 0; m < 24; m++) { const a = (m + 0.5) / 24 * TAU; b.box(p.x + Math.cos(a) * r, y - 0.3, p.z + Math.sin(a) * r, 0.5, 0.6, TAU * r / 24 + 0.3, C.ltgray, { rot: -a }); }
      }
      for (let k = 0; k < 10; k++) { const a = rand() * TAU, r = rand() * R * 0.7; rock(b, p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r, 2, rand, [C.dkstone, C.dkgray]); }
      ctx.claim(p.x, p.z, R + 2);
      const birds = [];
      for (let n = 0; n < 4; n++) { const rig = P.pteranodon(); const h = holder(ctx, rig, 1.1); birds.push({ rig, h, r: 12 + n * 7, y: 14 + n * 5, s: 0.35 + rand() * 0.3, o: rand() * TAU }); }
      anims.push((dt, t) => birds.forEach((q) => { const a = t * q.s + q.o; q.h.position.set(p.x + Math.cos(a) * q.r, q.y + Math.sin(t + q.o) * 2, p.z + Math.sin(a) * q.r); q.h.rotation.y = -a; q.rig.root.rotation.z = 0.35; P.flap(q.rig, t + q.o, 4, 0.4); }));
      ctx.hazard(pteroSwoop(ctx, 3.55, 0.25, 0, 35));
      ctx.hazard(pteroSwoop(ctx, 4.05, -0.3, 2.4, 45));
      arch(ctx, 3.95, { cols: [C.dkgray, C.yellow], text: 'AVIARY', bg: '#1b2a34', fg: '#f2cd37' });
    }

    // ================= GYROSPHERE VALLEY =================
    arch(ctx, 4.35, { cols: [C.white, C.azure], text: 'GYROSPHERE VALLEY', bg: '#0a6a8a', fg: '#ffffff' });
    {
      // station: glass pavilion
      const i = K(4.5), sd = -outSide(i), p = tr.at(i, sd * (edgeLat(i) + 16), 0);
      const S = new P.Local(b, p.x, 0, p.z, tr.yawAt(i));
      S.boxB(0, 0, 0, 16, 1, 12, C.ltgray);
      for (const x of [-7, 7]) for (const z of [-5, 5]) S.boxB(x, 1, z, 0.8, 6, 0.8, C.white);
      S.boxB(0, 7, 0, 17, 0.8, 13, C.white);
      S.sphere(0, 7.8, 0, 5, 0x6ac0e8, { sy: 0.5, matOpts: { trans: true, opacity: 0.55 } });
      ctx.claim(p.x, p.z, 11);
    }
    const herdSpots = [];
    ctx.scatter(26, { minC: 12, maxC: 120, r: 12, pad: 80, test: (x, z) => inValleyXZ(x, z) && dry(x, z) }, (x, z, c) => herdSpots.push([x, z, c]));
    const herd = [];
    herdSpots.forEach(([x, z, c], n) => {
      const kind = n % 6;
      const ry = rand() * TAU;
      let rig, s = 1;
      if (kind === 0 && c > 30) { rig = P.brachiosaurus(); s = 0.9 + rand() * 0.15; }
      else if (kind === 1 || kind === 4) { rig = P.triceratops(); s = 1 + rand() * 0.2; }
      else if (kind === 2) { rig = P.stegosaurus(); s = 1.1; }
      else if (kind === 3 || kind === 5) { rig = P.parasaurolophus(); s = 1; }
      else return;
      const h = holder(ctx, rig, s, 'herd' + n); h.position.set(x, 0, z); h.rotation.y = ry;
      herd.push({ rig, o: rand() * TAU });
      if (kind === 0) for (let k = 0; k < 3; k++) roundTree(b, x + Math.sin(ry) * 20 + (rand() - 0.5) * 10, 0, z + Math.cos(ry) * 20 + (rand() - 0.5) * 10, 2.4 + rand(), C.dkgreen);
    });
    anims.push((dt, t) => {
      for (const q of herd) {
        const r = q.rig, o = q.o;
        if (r.neck) { r.neck.rotation.y = Math.sin(t * 0.25 + o) * 0.35; r.neck.rotation.x = Math.sin(t * 0.21 + o) * 0.1; }
        r.head.rotation.x = Math.sin(t * 0.6 + o) * 0.25 + (r.neck ? 0 : 0.15);
        r.head.rotation.y = Math.sin(t * 0.35 + o * 2) * 0.3;
        r.tail.rotation.y = Math.sin(t * 0.5 + o) * 0.25;
      }
    });
    // extra brachiosaurus pair beside the road for scale
    for (const [k, off] of [[5.0, 42], [6.9, 50]]) {
      const i = K(k), sd = k < 6 ? -outSide(i) : outSide(i), p = tr.at(i, sd * (edgeLat(i) + off), 0);
      if (tr.clearance(p.x, p.z, 40) < 12) continue;
      const rig = P.brachiosaurus(); const h = holder(ctx, rig, 1.05); h.position.set(p.x, 0, p.z); h.rotation.y = tr.yawAt(i) + sd * 0.6;
      herd.push({ rig, o: rand() * TAU });
      ctx.claim(p.x, p.z, 12);
    }
    // gyrospheres rolling around the meadow, and two crossing the road
    for (let n = 0; n < 5; n++) {
      const g = P.gyrosphere([C.azure, C.yellow, C.lime][n % 3]);
      ctx.group.add(g);
      const [x0, z0] = herdSpots[(n * 3 + 1) % Math.max(1, herdSpots.length)] || [300, -100];
      const R = 14 + rand() * 12, sp = 0.2 + rand() * 0.15, o = rand() * TAU;
      anims.push((dt, t) => { const a = t * sp + o; g.position.set(x0 + Math.cos(a) * R, 0, z0 + Math.sin(a) * R); g.rotation.y = -a; g.userData.ring.rotation.x = t * 3; });
    }
    for (const [k, off] of [[5.25, 0], [7.25, 0.5]]) {
      const g = P.gyrosphere(C.azure);
      ctx.hazard(crossing(ctx, { mesh: g, k, speed: 7, kind: 'bump', radius: 2.4, offset: off }));
      anims.push((dt, t) => { g.userData.ring.rotation.x = t * 4; });
    }
    // Gallimimus stampede (the flock from the first film)
    ctx.hazard(stampede(ctx, 6.38, 8, outSide(K(6.38)), rand));
    ctx.scatter(40, { minC: 6, maxC: 130, r: 4, pad: 80, test: (x, z) => inValleyXZ(x, z) && dry(x, z) }, (x, z) => (rand() < 0.5 ? roundTree(b, x, 0, z, 1.2 + rand() * 0.8, pick(rand, [C.green, C.dkgreen, C.lime])) : rock(b, x, 0, z, 1.3, rand, [C.dkgray, C.ltgray, C.tan])));

    // ================= T. REX PADDOCK =================
    {
      const i0 = K(8.05), i1 = K(10.35), iRex = K(9.35);
      const sd = outSide(iRex);
      let prev = null, n = 0;
      for (let i = i0; i <= i1; i += 8) {
        const p = tr.at(i, sd * (edgeLat(i) + 5), 0);
        const broken = Math.abs(i - iRex) < 18;
        if (prev && !broken && !prev.broken) P.paddockFence(L, prev.x, prev.z, p.x, p.z, 13);
        if (broken && n++ % 2 === 0) { b.boxM(new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0.8, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, rand() * 3, 1.35)), new THREE.Vector3(1.2, 12, 1.2)), C.dkgray); }
        prev = p; prev.broken = broken;
      }
      // DANGER signs
      const warn = P.textTexture('DANGER  10,000 VOLTS', '#f2cd37', '#111111', 512, 96);
      for (const k of [8.4, 9.0, 9.9]) {
        const i = K(k), p = tr.at(i, sd * (edgeLat(i) + 4.3), 0);
        P.signPlane(ctx.group, warn, p.x, 5, p.z, tr.yawAt(i) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), 7, 1.4, 0.3);
      }
      // inside the paddock: jungle, the goat, a jeep up a tree, a flipped tour car
      const inPad = (x, z) => { const c = tr.clearance(x, z, 120); return c > 8 && c < 110; };
      for (let k = 0; k < 40; k++) {
        const f = rand(), i = Math.round(i0 + (i1 - i0) * f), p = tr.at(i, sd * (edgeLat(i) + 12 + rand() * 80), 0);
        if (inPad(p.x, p.z) && ctx.free(p.x, p.z, 4) && dry(p.x, p.z)) { jungleTree(b, p.x, p.z, 1.2 + rand() * 0.6, rand); ctx.claim(p.x, p.z, 4); }
      }
      const gp = tr.at(iRex + 30, sd * (edgeLat(iRex) + 22), 0);
      b.box(gp.x, 0, gp.z, 0.4, 4, 0.4, C.rbrown);
      b.box(gp.x + 1.2, 0.9, gp.z, 1.6, 0.9, 0.8, C.white); b.box(gp.x + 2.1, 1.5, gp.z, 0.6, 0.7, 0.5, C.white); for (const [dx, dz] of [[0.6, 0.3], [0.6, -0.3], [1.8, 0.3], [1.8, -0.3]]) b.box(gp.x + dx, 0, gp.z + dz, 0.2, 0.9, 0.2, C.white);
      const jp = tr.at(iRex - 40, sd * (edgeLat(iRex) + 16), 0);
      jungleTree(b, jp.x, jp.z, 2, rand);
      P.jeep(L, jp.x + 1, jp.z, 1.2, { y: 14, s: 1.3 });
      const ep = tr.at(iRex + 55, sd * (edgeLat(iRex) + 14), 0);
      {
        const Q = new THREE.Matrix4().compose(new THREE.Vector3(ep.x, 3.9, ep.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.7, Math.PI)), new THREE.Vector3(1.2, 1.2, 1.2));
        const eb = new BrickBuilder(1); P.explorer(new P.Local(eb), 0, 0, 0); const g = eb.build({ name: 'explorer' }); g.applyMatrix4(Q); ctx.group.add(g);
      }
      // the rex
      const rig = P.trex();
      ctx.hazard(rexCrossing(ctx, rig, iRex, sd, 1.15));
      arch(ctx, 8.0, { cols: [C.dkgray, C.yellow], text: 'T. REX KINGDOM', bg: '#1b1b1b', fg: '#f2cd37' });
    }

    // ================= INDOMINUS REX ENCLOSURE =================
    {
      let best = null;
      for (let x = 60; x <= 240; x += 12) for (let z = -160; z <= 60; z += 12) { const c = tr.clearance(x, z, 120); if (c > 48 && dry(x, z) && ctx.free(x, z, 30) && (!best || Math.hypot(x - 160, z + 50) < Math.hypot(best[0] - 160, best[1] + 50))) best = [x, z]; }
      if (best) {
        const [x, z] = best, S = 26, H = 15;
        const toRoad = tr.at(K(6.8), 0, 0);
        const yaw = Math.atan2(toRoad.x - x, toRoad.z - z);
        const E = new P.Local(b, x, 0, z, yaw);
        for (const [a, bb, w, d] of [[0, S, 2 * S + 3, 3], [0, -S, 2 * S + 3, 3], [S, 0, 3, 2 * S], [-S, 0, 3, 2 * S]]) {
          E.boxB(a, 0, bb, w, H, d, C.ltgray);
          E.boxB(a, H, bb, w + 0.4, 1, d + 0.4, C.dkgray);
        }
        for (let k = 0; k < 4; k++) E.box(-6 + k * 1.3, 11 - k * 0.4, S + 1.6, 0.5, 6, 0.3, C.black, { rz: 0.35 });
        E.boxB(S * 0.6, H + 1, S + 1, 8, 4, 5, C.white); E.boxB(S * 0.6, H + 2, S + 3.6, 7, 2, 0.2, C.azure);
        E.boxB(-S * 0.5, 0, S + 1.6, 10, 16, 0.4, C.dkgray);
        for (let k = 0; k < 6; k++) jungleTree(b, x + Math.sin(yaw) * (-S * 0.6) + Math.cos(yaw) * (rand() - 0.5) * S * 1.6, z + Math.cos(yaw) * (-S * 0.6) - Math.sin(yaw) * (rand() - 0.5) * S * 1.6, 1.1 + rand() * 0.4, rand);
        ctx.claim(x, z, S * 1.45);
        const rig = P.theropod({ body: 0xe4e6e2, dark: 0x9aa0a0, belly: 0xc8ccc8, eye: 0xff3010, spikes: 0x8a9090, arm: 1.6 });
        const h = holder(ctx, rig, 1.3, 'indominus');
        const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        anims.push((dt, t) => {
          const ph = t * 0.12, s = Math.sin(ph);
          h.position.set(x + rt.x * s * 12 + fw.x * 8, 0, z + rt.z * s * 12 + fw.z * 8);
          const moving = Math.abs(Math.cos(ph)) > 0.25;
          h.rotation.y = yaw + (Math.cos(ph) > 0 ? Math.PI / 2 : -Math.PI / 2) * (moving ? 1 : 0.4);
          if (moving) P.theroWalk(rig, t * 2.2, 0.35); else P.theroIdle(rig, t, smooth(0.1, 0.2, 0.25 - Math.abs(Math.cos(ph))));
          rig.head.rotation.y = moving ? -Math.sign(Math.cos(ph)) * 0.5 : Math.sin(t) * 0.3;
        });
      }
    }

    // ================= SPINOSAURUS RIVER FORD =================
    {
      const i = K(11.1);
      const up = tr.at(i, 20, 0);
      const sd = Math.hypot(up.x - LAKE[0], up.z - LAKE[1]) < Math.hypot(ford.x - LAKE[0], ford.z - LAKE[1]) ? 1 : -1;
      const rig = P.theropod({ body: 0x4e544a, dark: 0x2a2e28, belly: 0x9a9a82, eye: 0xffd020, croc: true, sail: C.dkred, sail2: 0xc0401a, arm: 1.5 });
      ctx.hazard(spinoLunge(ctx, rig, i, sd, 1.05));
      // river rocks and a waterfall feeding the lake
      for (let k = 0; k < 8; k++) rock(b, LAKE[0] + (rand() - 0.5) * 30, 0, LAKE[1] - LAKE[2] - 4 - rand() * 8, 2.2, rand, [C.dkstone, C.dkgray]);
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(10, 14), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.8, emissive: 0x3a7aaa, emissiveIntensity: 0.4, side: THREE.DoubleSide, map: canvasTexture(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#ffffff' : '#bfe8ff'; g.fillRect(0, y, w, 8); } }) }));
      fall.material.map.wrapS = fall.material.map.wrapT = THREE.RepeatWrapping;
      fall.position.set(LAKE[0], 6, LAKE[1] - LAKE[2] - 2);
      scene.add(fall);
      b.box(LAKE[0], 0, LAKE[1] - LAKE[2] - 7, 20, 14, 8, C.dkstone);
      anims.push((dt, t) => { fall.material.map.offset.y = t * 1.6; });
    }

    // ================= RAPTOR PADDOCK + RAPTOR RUN =================
    {
      let best = null;
      for (let x = -140; x <= 60; x += 10) for (let z = -120; z <= 80; z += 10) { const c = tr.clearance(x, z, 80); if (c > 30 && dry(x, z) && Math.hypot(x - LAG[0], z - LAG[1]) > LAG[2] + 30 && ctx.free(x, z, 26) && (!best || Math.hypot(x + 30, z - 40) < Math.hypot(best[0] + 30, best[1] - 40))) best = [x, z]; }
      if (best) {
        const [x, z] = best, R = 22;
        for (let m = 0; m < 20; m++) {
          const a = m / 20 * TAU;
          if (m === 5) continue;
          b.box(x + Math.cos(a) * R, 0, z + Math.sin(a) * R, 3, 12, TAU * R / 20 + 0.4, C.ltgray, { rot: -a });
          b.box(x + Math.cos(a) * (R - 2.5), 12, z + Math.sin(a) * (R - 2.5), 3, 0.5, TAU * R / 20 + 0.6, C.dkgray, { rot: -a });
          b.box(x + Math.cos(a) * (R - 3.8), 12.5, z + Math.sin(a) * (R - 3.8), 0.2, 1.2, TAU * R / 20, C.yellow, { rot: -a });
        }
        for (let k = 0; k < 8; k++) fern(b, x + (rand() - 0.5) * 26, z + (rand() - 0.5) * 26, 2, rand);
        ctx.claim(x, z, R + 3);
        // Owen on the catwalk with raptors below
        const O = new P.Local(b);
        P.fig(O, x, 12.5, z - R + 3, 0, 0xb09a6a, C.dkblue, C.rbrown, { vest: 0x5a3a22, arms: 0.3, armRx: -0.6 });
      }
      // the pack sprinting along the road with Owen on his motorbike
      const pack = [['blue', -0.45, 0.0], ['charlie', 0.35, 0.025], ['delta', -0.05, 0.045], ['echo', 0.6, 0.07]];
      pack.forEach(([name, lat, off]) => {
        const rig = P.raptor(P.RAPTORS[name]);
        const h = new THREE.Group(); rig.root.scale.setScalar(1.35); h.add(rig.root); (ctx.group.userData.dinos ||= {})[name] = h;
        ctx.hazard(trackMover(ctx, { mesh: h, from: 11.7, to: 14.3, oneWay: true, lat, speed: 23, radius: 1.6, kind: 'spin', offset: off }));
        const o = rand() * TAU;
        anims.push((dt, t) => P.raptorRun(rig, t * 15 + o, 0.85));
      });
      const owen = P.motorbikeOwen();
      const oh = new THREE.Group(); oh.add(owen); ctx.group.userData.dinos.owen = oh;
      ctx.hazard(trackMover(ctx, { mesh: oh, from: 11.7, to: 14.3, oneWay: true, lat: -0.7, speed: 23, radius: 1.6, kind: 'bump', offset: 0.03 }));
      arch(ctx, 11.65, { cols: [C.dkgray, C.blue], text: 'RAPTOR RUN', bg: '#0a2a5a', fg: '#ffffff' });
    }

    // ================= MOUNT SIBO (Fallen Kingdom) + the climb =================
    {
      // rocky terraces under the rising road so it reads as a mountain ridge
      each(tr, 13.6, 17.12, 5, (i) => {
        const y = tr.py(i);
        if (y < 5) return;
        for (const sd of [-1, 1]) for (let st = 0; st < 4; st++) {
          const lat = sd * (edgeLat(i) + 4 + st * 7.5), p = tr.at(i, lat, 0), h = y * (1 - st * 0.27) - 0.6;
          if (h < 2 || !ctx.free(p.x, p.z, 3) || !dry(p.x, p.z)) continue;
          const col = st % 2 ? C.dkstone : (rand() < 0.5 ? C.dkgray : C.dktan);
          b.box(p.x, 0, p.z, 8 + rand() * 3, h, 7 + rand() * 3, col, { rot: tr.yawAt(i) + (rand() - 0.5) * 0.3 });
          if (rand() < 0.5) b.box(p.x, h, p.z, 7, 0.8, 6, C.green, { rot: tr.yawAt(i) });
          else if (rand() < 0.25) fern(b, p.x, p.z, 1.5, rand);
        }
      });
      // the volcano
      if (V) {
        let y = 0;
        for (let k = 0; k < 17; k++) y = b.cyl(V.x + Math.sin(k) * 1.5, y, V.z + Math.cos(k) * 1.5, 92 - k * 5.1, 5.5, k % 3 === 2 ? C.black : k % 2 ? C.dkstone : C.dkgray, { seg: 24 });
        b.cyl(V.x, y - 0.2, V.z, 7, 0.4, 0xff6a00, { seg: 20, matOpts: { emissive: 0xff5000, emissiveIntensity: 2.2 } });
        for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.3; b.box(V.x + Math.cos(a) * 40, 0, V.z + Math.sin(a) * 40, 3, y - 4, 1.2, 0xff5a00, { rot: -a, matOpts: { emissive: 0xff4a00, emissiveIntensity: 1.8 } }); }
        for (let k = 0; k < 14; k++) { const a = rand() * TAU; jungleTree(b, V.x + Math.cos(a) * 100, V.z + Math.sin(a) * 100, 1.3, rand); }
        ctx.claim(V.x, V.z, 96);
        const vl = new THREE.PointLight(0xff5a1a, 4, 220, 1.4); vl.position.set(V.x, y + 10, V.z); scene.add(vl);
        const smokeG = new THREE.InstancedMesh(brickGeometry(2, 2, 3, 2, true, 8), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 1, transparent: true, opacity: 0.7 }), 30);
        scene.add(smokeG);
        const sm = [...Array(30)].map((_, k) => ({ t: k / 30 * 8, a: rand() * TAU }));
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e = new THREE.Euler();
        const top = y;
        anims.push((dt, t) => {
          sm.forEach((s) => { s.t += dt; if (s.t > 8) { s.t = 0; s.a = rand() * TAU; } const f = s.t / 8; p3.set(V.x + Math.cos(s.a) * f * 20, top + f * 70, V.z + Math.sin(s.a) * f * 20 + f * 25); s3.setScalar(1 + f * 3); q.setFromEuler(e.set(f * 2, s.a, f)); m4.compose(p3, q, s3); smokeG.setMatrixAt(sm.indexOf(s), m4); });
          smokeG.instanceMatrix.needsUpdate = true;
          vl.intensity = 3.6 + Math.sin(t * 2.3) * 0.6;
        });
        const vent = new THREE.Vector3(V.x, top + 2, V.z);
        ctx.hazard(cannon(ctx, { from: vent, targets: [[14.6, 0], [15.1, 0.3], [15.6, -0.3], [16.05, 0.2]], period: 3.0, color: 0xff5a00 }));
        ctx.hazard(cannon(ctx, { from: vent, targets: [[14.9, -0.3], [15.4, 0.3], [15.9, 0]], period: 3.8, offset: 1.5, color: 0xff5a00 }));
      }
      arch(ctx, 14.3, { cols: [C.dkgray, C.orange], text: 'MOUNT SIBO', bg: '#3a1a0a', fg: '#ff9a3a' });
    }

    // ================= HELIPAD, WATERFALL, GLIDE OVER THE LAGOON =================
    {
      const i = K(16.75), sd = outSide(i), p = tr.at(i, sd * (edgeLat(i) + 15), 0);
      const y = tr.py(i);
      b.cyl(p.x, 0, p.z, 11, y, C.dkstone, { seg: 16 });
      b.cyl(p.x, y, p.z, 11.5, 0.5, C.dkgray, { seg: 20 });
      b.cyl(p.x, y + 0.5, p.z, 9, 0.1, C.yellow, { seg: 20 });
      b.cyl(p.x, y + 0.55, p.z, 8.2, 0.1, C.dkgray, { seg: 20 });
      const H = new P.Local(b, p.x, y + 0.6, p.z, tr.yawAt(i));
      H.boxB(-2.5, 0, 0, 1, 0.1, 8, C.white); H.boxB(2.5, 0, 0, 1, 0.1, 8, C.white); H.boxB(0, 0, 0, 5, 0.1, 1, C.white);
      ctx.claim(p.x, p.z, 12);
      const heli = P.helicopter();
      const hh = holder(ctx, heli, 1.1, 'heli');
      const pad = new THREE.Vector3(p.x, y + 0.6, p.z);
      const yaw0 = tr.yawAt(i);
      // flight: lift off, loop around the island on a circle through the pad, land
      const Cc = new THREE.Vector3((pad.x + cx) / 2, 0, (pad.z + cz) / 2);
      const Rh = Math.hypot(pad.x - Cc.x, pad.z - Cc.z) + 60, a0 = Math.atan2(pad.z - Cc.z, pad.x - Cc.x);
      Cc.set(pad.x - Math.cos(a0) * Rh, 0, pad.z - Math.sin(a0) * Rh);
      anims.push((dt, t) => {
        const ph = t % 46;
        heli.rotor.rotation.y += dt * (ph < 6 ? 6 : 22); heli.tailRotor.rotation.x += dt * 30;
        if (ph < 8) { hh.position.copy(pad); hh.rotation.y = yaw0; hh.rotation.z = 0; }
        else if (ph < 12) { const f = smooth(8, 12, ph); hh.position.set(pad.x, pad.y + f * 45, pad.z); hh.rotation.y = yaw0; hh.rotation.z = 0; }
        else if (ph < 40) { const a = a0 + smooth(12, 40, ph) * TAU; hh.position.set(Cc.x + Math.cos(a) * Rh, pad.y + 45 + Math.sin((ph - 12) / 28 * Math.PI) * 25, Cc.z + Math.sin(a) * Rh); hh.rotation.y = -a; hh.rotation.z = -0.18; }
        else { const f = smooth(40, 46, ph); hh.position.set(pad.x, pad.y + 45 * (1 - f), pad.z); hh.rotation.y = yaw0; hh.rotation.z = 0; }
      });
      // waterfall pouring off the cliff next to the glider ramp
      const wi = K(17.2), wp = tr.at(wi, 0, 0), wy = tr.py(K(17.0));
      for (const off of [-24, 24]) {
        const fall = new THREE.Mesh(new THREE.PlaneGeometry(12, wy + 2), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.8, emissive: 0x3a7aaa, emissiveIntensity: 0.4, side: THREE.DoubleSide, map: canvasTexture(64, 256, (g, w, h) => { for (let yy = 0; yy < h; yy += 8) { g.fillStyle = yy % 16 ? '#ffffff' : '#bfe8ff'; g.fillRect(0, yy, w, 8); } }) }));
        fall.material.map.wrapS = fall.material.map.wrapT = THREE.RepeatWrapping;
        fall.position.set(wp.x + tr.R[wi * 2] * off, (wy + 2) / 2 - 1.6, wp.z + tr.R[wi * 2 + 1] * off); fall.rotation.y = tr.yawAt(wi);
        scene.add(fall);
        anims.push((dt, t) => { fall.material.map.offset.y = t * 1.8; });
        const rp = tr.at(K(17.08), off * 1.25, 0);
        b.box(rp.x, 0, rp.z, 14, wy - 1, 10, C.dkstone, { rot: tr.yawAt(wi) });
      }
      arch(ctx, 16.95, { cols: [C.white, C.red], text: 'GLIDE!', bg: '#1a8cff' });
    }

    // ================= THE LAGOON: Mosasaurus, the shark feed, grandstands =================
    {
      const gi = K(17.75), gp = tr.at(gi, 0, 0);
      const toC = new THREE.Vector3(LAG[0] - gp.x, 0, LAG[1] - gp.z).normalize();
      // crane with a shark dangling over the water
      const cb = new THREE.Vector3(LAG[0] + 30, 0, LAG[1] + 40);
      const hook = new THREE.Vector3().lerpVectors(cb, gp, 0.45); hook.y = 22;
      {
        const dx = hook.x - cb.x, dz = hook.z - cb.z, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
        const Cr = new P.Local(b, cb.x, 0, cb.z, ry);
        Cr.boxB(0, -2, 0, 5, 30, 5, C.white); Cr.boxB(0, 28, len / 2, 2.4, 2.4, len + 6, C.white); Cr.boxB(0, 26, -4, 4, 4, 6, C.dkgray);
        Cr.boxB(0, 28, len, 0.3, 0.3 - 0, 0.3, C.black);
        ctx.claim(cb.x, cb.z, 5);
      }
      const rope = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2), plastic(C.black));
      ctx.group.add(rope);
      const sk = P.shark();
      const shk = new THREE.Group(); sk.rotation.x = -Math.PI / 2; sk.position.y = -3.5; shk.add(sk); ctx.group.add(shk);
      const mrig = P.mosasaurus();
      const mh = holder(ctx, mrig, 1.1, 'mosa');
      const start = new THREE.Vector3().copy(hook).addScaledVector(toC, 34); start.y = -26;
      const end = new THREE.Vector3().copy(hook).addScaledVector(toC, -30); end.y = -26;
      mh.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
      const PER = 13, tmp = new THREE.Vector3();
      let splashA = -1, splashB = -1;
      anims.push((dt, t) => {
        const ph = t % PER, cyc = Math.floor(t / PER);
        const f = smooth(7.5, 10.5, ph);
        const flying = ph > 7.3 && ph < 10.8;
        mh.visible = flying;
        if (flying) {
          const u = (ph - 7.5) / 3;
          tmp.lerpVectors(start, end, u);
          tmp.y = -26 + Math.sin(Math.max(0, Math.min(1, u)) * Math.PI) * 50;
          mh.position.copy(tmp);
          mrig.root.rotation.x = -Math.cos(Math.max(0, Math.min(1, u)) * Math.PI) * 0.95;
          mrig.jaw.rotation.x = u > 0.25 && u < 0.5 ? 0.6 : 0.1;
          mrig.tail.rotation.y = Math.sin(t * 5) * 0.25;
          if (u > 0.2 && splashA !== cyc) { splashA = cyc; tmp.set(start.x + (end.x - start.x) * 0.2, -1.5, start.z + (end.z - start.z) * 0.2); ctx.world.race?.fx.splash(tmp, 0xffffff); }
          if (u > 0.8 && splashB !== cyc) { splashB = cyc; tmp.set(start.x + (end.x - start.x) * 0.82, -1.5, start.z + (end.z - start.z) * 0.82); ctx.world.race?.fx.splash(tmp, 0xffffff); ctx.world.race?.audio.sfx('splash', tmp); }
        }
        void f;
        // shark: eaten at the top of the leap, then lowered again
        const drop = ph < 7 ? smooth(0, 5, ph) : 1;
        const eaten = ph > 9 && ph < PER;
        shk.visible = !eaten && ph > 0.3;
        const ropeLen = 2 + drop * 6;
        shk.position.set(hook.x, hook.y + 6 - ropeLen, hook.z);
        shk.rotation.y = Math.sin(t * 0.8) * 0.5; shk.rotation.z = Math.sin(t * 1.3) * 0.08;
        rope.position.set(hook.x, hook.y + 6 - ropeLen / 2, hook.z); rope.scale.y = ropeLen;
      });
      // grandstands along the lagoon's park-side shore
      for (let n = 0; n < 5; n++) {
        const a = -0.9 + n * 0.45;
        const x = LAG[0] + Math.cos(a) * (LAG[2] + 14), z = LAG[1] + Math.sin(a) * (LAG[2] + 14);
        if (tr.clearance(x, z, 40) < 10 || !ctx.free(x, z, 10)) continue;
        const S = new P.Local(b, x, 0, z, Math.atan2(LAG[0] - x, LAG[1] - z));
        for (let r = 0; r < 5; r++) { S.boxB(0, 0, -r * 2.2, 18, 1.2 + r * 1.3, 2.2, r % 2 ? C.dkgray : C.ltgray); for (let q = -3; q <= 3; q++) if (rand() < 0.6) minifig(b, x + Math.cos(-Math.atan2(LAG[0] - x, LAG[1] - z)) * q * 2.4 - Math.sin(Math.atan2(LAG[0] - x, LAG[1] - z)) * r * 2.2, 1.2 + r * 1.3, z + Math.sin(-Math.atan2(LAG[0] - x, LAG[1] - z)) * q * 2.4 - Math.cos(Math.atan2(LAG[0] - x, LAG[1] - z)) * r * 2.2, Math.atan2(LAG[0] - x, LAG[1] - z), pick(rand, [C.red, C.blue, C.yellow, C.white, C.green, C.orange]), rand); }
        S.boxB(0, 7.5, -10, 19, 0.6, 12, C.white);
        ctx.claim(x, z, 11);
      }
      // the Mosasaurus lunging at the shore road
      const si = K(18.85);
      const sd = (() => { const p = tr.at(si, 20, 0); return Math.hypot(p.x - LAG[0], p.z - LAG[1]) < Math.hypot(tr.px(si) - LAG[0], tr.pz(si) - LAG[1]) ? 1 : -1; })();
      ctx.hazard(mosaLunge(ctx, P.mosasaurus(), si, sd, 0, 0.62));
    }

    // ================= VISITOR CENTER =================
    {
      const a = 19.2, z = 19.85, im = K((a + z) / 2), p = tr.at(im, 0, 0), yaw = tr.yawAt(im);
      const len = (K(z) - K(a) + tr.N) % tr.N;
      tunnel(ctx, a, z, { wall: C.tan, roof: C.dktan, height: 17, lights: 0xffe0a0 });
      P.visitorCenter(new P.Local(b, p.x, 0, p.z, yaw), edgeLat(im) + 3, len, 19);
      ctx.claim(p.x, p.z, 50);
      // rex skeleton on one shoulder, amber mosquito on the other
      const sk = tr.at(im + 4, (tr.HW[im] + 7), 0);
      P.rexSkeleton(L, sk.x, sk.z, yaw + Math.PI, 0.85);
      ctx.obstacle(sk.x, sk.z, 3.4, 12);
      const am = tr.at(im - 6, -(tr.HW[im] + 7), 0);
      b.cyl(am.x, 0, am.z, 1.4, 4, C.dkgray, { seg: 10 });
      b.sphere(am.x, 5.4, am.z, 1.6, 0xffa020, { matOpts: { trans: true, opacity: 0.8, emissive: 0xc06010, emissiveIntensity: 0.8 } });
      ctx.obstacle(am.x, am.z, 1.8, 7);
      // "When Dinosaurs Ruled the Earth" banner
      const ban = P.signPlane(ctx.group, P.textTexture('WHEN DINOSAURS RULED THE EARTH', '#b01a10', '#f4e8c0', 1024, 128), p.x, 13, p.z, yaw + Math.PI, 30, 3.8, 0.35);
      anims.push((dt, t) => { ban.rotation.x = Math.sin(t * 1.3) * 0.12; });
      const vtex = P.logoTexture();
      const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      P.signPlane(ctx.group, vtex, p.x - fw.x * (len / 2 + 3.2), 20.5, p.z - fw.z * (len / 2 + 3.2), yaw + Math.PI, 26, 6.5, 0.3);
    }

    // ================= JUNGLE FILL, CLOUDS =================
    // jungle-covered hills out towards the coast
    ctx.scatter(14, { minC: 70, maxC: 150, r: 34, pad: 200, test: (x, z) => jungleOK(x, z) && hole.test(x + 40, z) && hole.test(x - 40, z) && hole.test(x, z + 40) && hole.test(x, z - 40) }, (x, z) => {
      mountain(b, x, 0, z, 26 + rand() * 12, 24 + rand() * 26, rand, [C.dkgreen, C.green, 0x2f6a2a], C.dkgreen, ctx.track);
      for (let k = 0; k < 6; k++) { const a = rand() * TAU, r = 22 + rand() * 12; jungleTree(b, x + Math.cos(a) * r, z + Math.sin(a) * r, 1.3, rand); }
    });
    ctx.scatter(620, { minC: 2, maxC: 190, r: 3.5, pad: 260, tries: 40, test: jungleOK }, (x, z, c) => { const u = rand(); if (u < 0.5) jungleTree(b, x, z, 1 + rand() * 0.9, rand); else if (u < 0.68) palm(b, x, 0, z, 1 + rand() * 0.6, rand); else if (u < 0.82) roundTree(b, x, 0, z, 1.6 + rand() * 1.2, pick(rand, [C.dkgreen, C.green, 0x2f6a2a])); else fern(b, x, z, 1.5 + rand(), rand); void c; });
    // distant islands (Isla Sorna on the horizon)
    for (const [x, z, r, h] of [[900, -500, 120, 70], [-950, 450, 160, 90], [-300, -1000, 90, 50]]) mountain(ctx.bNoShadow, x, -1.6, z, r, h, rand, [C.dkgreen, C.green], C.dkgreen);
    for (let k = 0; k < 16; k++) cloud(ctx.bNoShadow, cx + (rand() - 0.5) * 1100, 120 + rand() * 60, cz + (rand() - 0.5) * 1100, 2.5, rand);
  },
};
