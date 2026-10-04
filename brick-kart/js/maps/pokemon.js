// Kanto Brick Route (Pokémon): start in Pallet Town beside Professor Oak's lab, race up
// Route 1 through the tall grass (Diglett pop out of the dirt road), through Viridian City
// past the Pokémon Center and the Gym (a sleeping Snorlax rolls across the road), into
// Viridian Forest (Caterpie and Weedle crossing, a creek jump), climb into Mt. Moon
// (Zubat, Clefairy, rolling Geodude), glide off the cliff over the sea where Lapras
// swims and Gyarados leaps, dodge Gyarados' Hyper Beam on the Cerulean causeway, and
// finish through the Pokémon Stadium with its big screen, crowds and Voltorb.
import { THREE, BrickBuilder, C, plastic, groundPlane, rock, minifig, liquid, disc, strokeTrack, inRange, each, edges, arch, tunnel, mat4, crossing, cloud, canvasTexture, flowerBed } from './kit.js';
import * as P from './pokemon-props.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const fxOf = (ctx) => ctx.world.race?.fx;
const sfx = (ctx, n, p) => ctx.world.race?.audio.sfx(n, p);
const GRASS = 0x58a83a, DKGRASS = 0x3a8a32, ROCK = 0x8a8278, ROCK2 = 0x6e675e, ROCK3 = 0xa39a8c, SAND = 0xe8d8a0, WOOD = 0x7a4a24;

// a flat quad lying on the (banked) road at sample i
function roadQuad(ctx, i, lat, along, across, color) {
  const tr = ctx.track;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(across, along).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
  m.position.copy(tr.at(i, lat, 0.16)); m.rotation.order = 'YXZ'; m.rotation.set(0, tr.yawAt(i), -Math.atan(tr.BK[i]));
  ctx.group.add(m);
  return m;
}

// ---- hazards --------------------------------------------------------------------------------

// Diglett: a dirt mound on the road rumbles and sprays dirt, then Diglett pops up for a moment.
function diglettPop(ctx, { k, latF, period = 4.6, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k), base = tr.at(i, latF * tr.HW[i], 0.02);
  const g = new THREE.Group(); g.position.copy(base); g.rotation.y = tr.yawAt(i) + Math.PI;
  const mb = new BrickBuilder(1), ML = new P.Local(mb);
  ML.cyl(0, 0, 0, 1.7, 0.3, 0x6a4a2a, { seg: 14 }); ML.cyl(0, 0, 0, 1.05, 0.34, 0x1a120a, { seg: 14 });
  for (let n = 0; n < 7; n++) { const a = n / 7 * Math.PI * 2; ML.sphere(Math.cos(a) * 1.6, 0.25, Math.sin(a) * 1.6, 0.4, n % 2 ? 0x8a6a4a : 0x7a5a3a, { sy: 0.6 }); }
  const mound = mb.build({ name: 'mound' }); g.add(mound);
  const pop = new THREE.Group(); pop.add(P.fig(P.diglett, 1.25, 'diglett')); g.add(pop);
  ctx.group.add(g);
  let state = 0, popped = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.45 hidden, .45-.68 rumble, .68-.74 pop, .74-.9 up, .9-1 duck back
      let up = 0;
      if (ph < 0.45) { state = 0; popped = false; }
      else if (ph < 0.68) { state = 1; up = 0.12 + Math.abs(Math.sin(t * 9)) * 0.08; if (Math.random() < 0.35) fxOf(ctx)?.spark(base.x + (Math.random() - 0.5) * 2.4, base.y + 0.4, base.z + (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 3, 4 + Math.random() * 4, (Math.random() - 0.5) * 3, 0x8a6a4a, 0.5, 14); }
      else if (ph < 0.74) { state = 2; up = (ph - 0.68) / 0.06; if (!popped) { popped = true; sfx(ctx, 'hop', base); } }
      else if (ph < 0.9) { state = 2; up = 1; }
      else { state = 0; up = 1 - (ph - 0.9) / 0.1; }
      pop.position.y = -2.1 * (1 - up); pop.visible = up > 0.02;
      mound.rotation.y = state === 1 ? Math.sin(t * 40) * 0.08 : 0;
    },
    test(p) { return state === 2 && Math.hypot(p.x - base.x, p.z - base.z) < 2.3 && Math.abs(p.y - base.y) < 3 ? 'spin' : null; },
    near(p, r) { return state >= 1 && Math.hypot(p.x - base.x, p.z - base.z) < 1.6 + r; },
  };
}

// Snorlax asleep in the middle of one half of the road, facing the racers: it stirs ("!"),
// a stripe flashes on the other half, then it tumbles over onto it. Its belly is solid.
function snorlaxNap(ctx, { k, period = 8.4, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k), yaw = tr.yawAt(i), HW = tr.HW[i], R = 3.0, s = 1.15;
  const lanes = [-0.5 * HW, 0.5 * HW];
  const holder = new THREE.Group(), roll = new THREE.Group();
  holder.rotation.y = yaw + Math.PI; roll.position.y = R;
  const body = P.fig(P.snorlax, s, 'snorlax'); body.position.y = -R;
  roll.add(body); holder.add(roll); ctx.group.add(holder);
  const zs = [0, 1, 2].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: P.zTexture(), transparent: true, depthWrite: false })); holder.add(sp); return sp; });
  const bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: P.bangTexture(), transparent: true, depthWrite: false })); bang.scale.setScalar(2.6); holder.add(bang);
  const warn = lanes.map((l) => roadQuad(ctx, i, l, 8, 8, 0xff6a20));
  const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  ctx.obstacle(0, 0, 2.9, 6);
  const ob = tr.obstacles.at(-1); ob.y0 = tr.at(i, 0, 0).y; ob.y1 = ob.y0 + 6;
  let lat = lanes[0], state = 0, cycle = -1, thud = true;
  const pos = new THREE.Vector3();
  return {
    pos,
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), ph = (tt - n * period) / period;
      const from = lanes[n % 2], to = lanes[(n + 1) % 2];
      if (n !== cycle) { cycle = n; thud = false; }
      // 0-.58 sleeps, .58-.78 stirs (warning), .78-.92 tumbles over, .92-1 settles
      let shake = 0, spin = 0;
      if (ph < 0.58) { state = 0; lat = from; }
      else if (ph < 0.78) { state = 1; lat = from; shake = (ph - 0.58) / 0.2; }
      else if (ph < 0.92) { state = 2; const u = (ph - 0.78) / 0.14, e = u * u * (3 - 2 * u); lat = from + (to - from) * e; spin = -Math.sign(to - from) * e * Math.PI * 2; }
      else { state = 0; lat = to; if (!thud) { thud = true; sfx(ctx, 'wall', pos); fxOf(ctx)?.pop(pos, 0xf2e4c0); } }
      tr.at(i, lat, 0, pos);
      holder.position.copy(pos);
      roll.rotation.z = spin + (shake ? Math.sin(t * 30) * 0.06 * shake : 0);
      roll.position.y = R + (state === 2 ? Math.sin(Math.abs(spin) / 2) * 0.8 : 0);
      body.scale.y = state === 0 ? 1 + Math.sin(t * 1.6) * 0.03 : 1;
      zs.forEach((sp, m) => { const u = (t * 0.4 + m / 3) % 1; sp.visible = state === 0; sp.position.set(0.8 + Math.sin(u * 6 + m) * 0.6, 6.6 + u * 5, 0); sp.scale.setScalar(0.8 + u * 1.4); sp.material.opacity = Math.min(1, (1 - u) * 2); });
      bang.visible = state === 1; bang.position.set(0, 8 + Math.abs(Math.sin(t * 8)) * 0.5, 0);
      warn.forEach((w, m) => { w.material.opacity = state === 1 && lanes[m] === to ? 0.25 + 0.3 * Math.abs(Math.sin(t * 12)) : state === 2 && lanes[m] === to ? 0.4 : 0; });
      ob.x = pos.x; ob.z = pos.z;
    },
    test(p) {
      if (state !== 2) return null;
      const dx = p.x - pos.x, dz = p.z - pos.z;
      return Math.abs(dx * f.x + dz * f.z) < 3.4 && Math.abs(dx * f.z - dz * f.x) < 3.6 && Math.abs(p.y - pos.y) < 6 ? 'wreck' : null;
    },
    near(p, r) {
      if (Math.hypot(p.x - pos.x, p.z - pos.z) < 3.4 + r) return true;
      if (state < 1) return false;
      const q = tr.at(i, lanes[(cycle + 1) % 2], 0);
      return Math.hypot(p.x - q.x, p.z - q.z) < 4 + r;
    },
  };
}

// Geodude perched up the mountainside shakes, then rolls down across the ledge road and
// tumbles off the cliff; a stripe across the road flashes while it is coming.
function geodudeRoll(ctx, { k, period = 6.5, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k), E = tr.HW[i] + tr.SH[i];
  const S = tr.at(i, E + 24, 0); S.y = tr.at(i, 0, 0).y + 9;
  const A = tr.at(i, E + 2, 0), B = tr.at(i, -E - 2, 0), F = tr.at(i, -E - 22, 0); F.y = A.y - 26;
  A.y += 0.05; B.y = A.y;
  const holder = new THREE.Group(), spin = new THREE.Group(); spin.position.y = 1.15 * 1.4;
  const gd = P.fig(P.geodude, 1.4, 'geodude'); gd.position.y = -1.0 * 1.4; spin.add(gd); holder.add(spin); ctx.group.add(holder);
  holder.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
  const strip = roadQuad(ctx, i, 0, 4.5, 2 * E, 0xff5a20);
  const pos = new THREE.Vector3();
  let state = 0, rolled = 0;
  const WAIT = 0.42, WARN = 0.62, DOWN = 0.72, CROSS = 0.86;   // phase marks
  return {
    pos,
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      const prev = rolled;
      if (ph < WAIT) { state = 0; pos.copy(S); holder.visible = ph > 0.06; holder.scale.setScalar(Math.min(1, ph / 0.06 + 0.01)); rolled = 0; }
      else if (ph < WARN) { state = 1; pos.copy(S); pos.x += Math.sin(t * 40) * 0.15; rolled = 0; holder.visible = true; }
      else if (ph < DOWN) { state = 1; const u = (ph - WARN) / (DOWN - WARN); pos.lerpVectors(S, A, u * u); rolled = u * u * S.distanceTo(A); }
      else if (ph < CROSS) { state = 2; const u = (ph - DOWN) / (CROSS - DOWN); pos.lerpVectors(A, B, u); pos.y += Math.abs(Math.sin(u * Math.PI * 3)) * 0.8; rolled = S.distanceTo(A) + u * A.distanceTo(B); }
      else { state = 0; const u = (ph - CROSS) / (1 - CROSS); pos.lerpVectors(B, F, u); pos.y = B.y + (F.y - B.y) * u * u + Math.sin(u * Math.PI) * 4; rolled += dt * 20; holder.visible = u < 0.9; }
      holder.position.copy(pos);
      spin.rotation.x += Math.max(0, rolled - prev) / 1.6;
      strip.material.opacity = state >= 1 ? 0.2 + 0.35 * Math.abs(Math.sin(t * 10)) : 0;
      if (state === 2 && Math.random() < 0.5) fxOf(ctx)?.puff(pos.x, pos.y + 0.3, pos.z, (Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3, 0xb8b0a0, 0.6);
    },
    test(p) { return state === 2 && Math.hypot(p.x - pos.x, p.z - pos.z) < 2.9 && Math.abs(p.y - pos.y) < 4 ? 'spin' : null; },
    near(p, r) {
      if (state === 0) return false;
      const dx = p.x - A.x, dz = p.z - A.z, bx = B.x - A.x, bz = B.z - A.z, L = Math.hypot(bx, bz);
      return Math.abs((dx * bz - dz * bx) / L) < 3 + r;
    },
  };
}

// Gyarados rises out of the sea beside the causeway, charges up (mouth glows, a line flashes
// across the road) and sweeps a Hyper Beam across the road, then sinks back.
function hyperBeam(ctx, { k, period = 7.2, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k), E = tr.HW[i] + tr.SH[i], s = Math.max(1.25, (tr.at(i, 0, 0).y + 7.5) / 11.7);
  const S = tr.at(i, E + 17, 0); S.y = -2.6;
  const c = tr.at(i, 0, 0);
  const holder = new THREE.Group(); holder.position.copy(S); holder.rotation.y = Math.atan2(c.x - S.x, c.z - S.z);
  const body = P.fig(P.gyarados, s, 'gyarados'); holder.add(body); ctx.group.add(holder);
  const mouthL = new THREE.Vector3(0, (12.2 - 0.5) * s, (1.4 + 2.2) * s);
  const charge = P.glow(0x9ad8ff, 1, 0.95); charge.position.copy(mouthL); body.add(charge);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), beamMat); beam.frustumCulled = false; ctx.group.add(beam);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); beam.add(core);
  const line = roadQuad(ctx, i, 0, 3.4, 2 * E, 0xff4a2a);
  const splash = new THREE.Mesh(new THREE.RingGeometry(3, 4.4, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0, depthWrite: false }));
  splash.position.set(S.x, -2.3, S.z); ctx.group.add(splash);
  const hit = new THREE.Vector3(), mouth = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let state = 0, roared = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.22 under, .22-.36 rises, .36-.6 charges, .6-.76 sweeps, .76-.86 roars, .86-1 sinks
      let h = 0; state = 0; beam.visible = false; charge.scale.setScalar(0.01);
      if (ph < 0.22) { h = 0; roared = false; }
      else if (ph < 0.36) { h = (ph - 0.22) / 0.14; h = h * h * (3 - 2 * h); }
      else if (ph < 0.6) { h = 1; state = 1; const u = (ph - 0.36) / 0.24; charge.scale.setScalar(2 + u * 7 + Math.sin(t * 30) * 0.6); }
      else if (ph < 0.76) {
        h = 1; state = 2; const u = (ph - 0.6) / 0.16;
        tr.at(i, E - 2 * E * u, 0.2, hit); body.localToWorld(mouth.copy(mouthL));
        beam.visible = true; const L = mouth.distanceTo(hit);
        beam.position.lerpVectors(mouth, hit, 0.5); beam.scale.set(1.2 + Math.sin(t * 50) * 0.2, L, 1.2 + Math.sin(t * 50) * 0.2);
        beam.quaternion.setFromUnitVectors(up, V1.subVectors(mouth, hit).normalize());
        charge.scale.setScalar(7);
        if (!roared) { roared = true; sfx(ctx, 'rocket', hit); }
        const fx = fxOf(ctx); if (fx) for (let m = 0; m < 3; m++) fx.spark(hit.x, hit.y, hit.z, (Math.random() - 0.5) * 12, 4 + Math.random() * 10, (Math.random() - 0.5) * 12, m % 2 ? 0xffffff : 0x9ad8ff, 0.5, 12);
      } else if (ph < 0.86) h = 1;
      else { h = 1 - (ph - 0.86) / 0.14; }
      body.position.y = -21 * (1 - h) + Math.sin(t * 1.4) * 0.3 * h;
      body.visible = h > 0.01;
      body.rotation.z = Math.sin(t * 1.1) * 0.06;
      line.material.opacity = state === 1 ? 0.2 + 0.4 * Math.abs(Math.sin(t * 12)) : state === 2 ? 0.55 : 0;
      const sp = ph > 0.2 && ph < 0.4 || ph > 0.86; splash.material.opacity = sp ? 0.7 * Math.abs(Math.sin(t * 4)) : 0; splash.scale.setScalar(1 + (t * 1.5 % 1));
    },
    test(p) { return state === 2 && Math.hypot(p.x - hit.x, p.z - hit.z) < 3.6 && Math.abs(p.y - hit.y) < 4 ? 'wreck' : null; },
    near(p, r) {
      if (!state) return false;
      const dx = p.x - c.x, dz = p.z - c.z, fx = Math.sin(tr.yawAt(i)), fz = Math.cos(tr.yawAt(i));
      return Math.abs(dx * fx + dz * fz) < 3.5 + r && Math.abs(dx * fz - dz * fx) < E + r;
    },
  };
}

// Gyarados leaping out of the sea right across the glide path: the water churns and a ring
// marks where it will burst out, then it arcs over the gliders and dives back in.
function gyaradosLeap(ctx, { k, period = 6.2, offset = 0, dir = 1 }) {
  const tr = ctx.track, i = tr.kToIndex(k), W = 34;
  const A = tr.at(i, dir * W, 0), B = tr.at(i, -dir * W, 0); A.y = B.y = -6;
  const H = 40, s = 1.7, hold = new THREE.Group(), gy = P.fig(P.gyarados, s, 'gyarados');
  gy.rotation.x = Math.PI / 2; gy.position.set(0, 0, -6 * s); hold.add(gy); ctx.group.add(hold);
  const yaw = Math.atan2(B.x - A.x, B.z - A.z);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(4, 6, 24).rotateX(-Math.PI / 2), ringMat); ring.position.set(A.x, -2.3, A.z); ctx.group.add(ring);
  const ring2 = ring.clone(); ring2.position.set(B.x, -2.3, B.z); ctx.group.add(ring2);
  const pos = new THREE.Vector3(), tail = new THREE.Vector3();
  let state = 0, splashed = false;
  const at = (u, out) => out.lerpVectors(A, B, u).setY(-6 + Math.sin(u * Math.PI) * H);
  return {
    pos,
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.4 below, .4-.62 water churns, .62-1 leaps across
      if (ph < 0.62) {
        state = ph < 0.4 ? 0 : 1; hold.visible = false; splashed = false; pos.set(0, -100, 0);
        ringMat.opacity = state ? 0.4 + 0.4 * Math.abs(Math.sin(t * 10)) : 0; ring.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
        if (state && Math.random() < 0.3) fxOf(ctx)?.puff(A.x + (Math.random() - 0.5) * 8, -2, A.z + (Math.random() - 0.5) * 8, 0, 4 + Math.random() * 4, 0, 0xe8f8ff, 0.8);
        return;
      }
      state = 2; const u = (ph - 0.62) / 0.38;
      at(u, pos); at(Math.max(0, u - 0.04), tail);
      hold.visible = true; hold.position.copy(pos);
      hold.rotation.order = 'YXZ'; hold.rotation.set(-Math.atan2(pos.y - tail.y, Math.hypot(pos.x - tail.x, pos.z - tail.z)), yaw, 0);
      ringMat.opacity = Math.max(0, 0.8 - u * 3);
      if (!splashed) { splashed = true; fxOf(ctx)?.splash(V2.set(A.x, -2.4, A.z), 0xe8f8ff); sfx(ctx, 'splash', A); }
      if (u > 0.97) fxOf(ctx)?.splash(V2.set(B.x, -2.4, B.z), 0xe8f8ff);
    },
    test(p) {
      if (state !== 2) return null;
      for (let m = 0; m < 3; m++) { at(Math.max(0, ((pos.x - A.x) * (B.x - A.x) + (pos.z - A.z) * (B.z - A.z)) / (W * W * 4) - m * 0.05), V1); if (V1.distanceTo(p) < 4.2) return 'bump'; }
      return null;
    },
    near(p, r) { return state === 2 && pos.distanceTo(p) < 6 + r; },
  };
}

// Voltorb sitting on the stadium floor: it flashes faster and faster while a ring marks the
// blast, then Self-Destructs and pops back a few seconds later.
function voltorbMine(ctx, { k, latF, period = 5.2, offset = 0, blast = 5.2 }) {
  const tr = ctx.track, i = tr.kToIndex(k), base = tr.at(i, latF * tr.HW[i], 0.02);
  const v = P.voltorb(1.25); v.position.copy(base); v.rotation.y = tr.yawAt(i) + Math.PI; ctx.group.add(v);
  const top = v.userData.top; top.emissive = new THREE.Color(0xff2a10); top.emissiveIntensity = 0;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe040, transparent: true, opacity: 0, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(blast - 0.6, blast, 32).rotateX(-Math.PI / 2), ringMat); ring.position.copy(base); ring.position.y += 0.15; ctx.group.add(ring);
  let state = 0, boomed = false;
  return {
    pos: base,
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.5 idle, .5-.8 flashing, .8-.84 boom, .84-.95 gone, .95-1 pops back
      if (ph < 0.5) { state = 0; v.visible = true; v.scale.setScalar(1); top.emissiveIntensity = 0.15 + 0.15 * Math.sin(t * 3); ringMat.opacity = 0; boomed = false; v.position.y = base.y + Math.abs(Math.sin(t * 2)) * 0.15; }
      else if (ph < 0.8) { state = 1; const u = (ph - 0.5) / 0.3; top.emissiveIntensity = (Math.sin(t * (10 + u * 40)) > 0 ? 2.2 : 0); ringMat.opacity = 0.25 + 0.5 * u * Math.abs(Math.sin(t * 14)); v.scale.setScalar(1 + u * 0.25 + Math.sin(t * 50) * 0.03 * u); }
      else if (ph < 0.84) { state = 2; v.visible = false; ringMat.opacity = 0.8; if (!boomed) { boomed = true; fxOf(ctx)?.explosion(base); fxOf(ctx)?.pop(base, 0xffe040); sfx(ctx, 'cannon', base); } }
      else if (ph < 0.95) { state = 3; v.visible = false; ringMat.opacity = Math.max(0, ringMat.opacity - dt * 3); }
      else { state = 0; v.visible = true; v.scale.setScalar(Math.max(0.01, (ph - 0.95) / 0.05)); ringMat.opacity = 0; }
    },
    test(p) {
      const d = Math.hypot(p.x - base.x, p.z - base.z);
      if (Math.abs(p.y - base.y) > 4) return null;
      if (state === 2) return d < blast + 0.4 ? 'wreck' : null;
      return (state === 0 || state === 1) && d < 2.6 ? 'bump' : null;
    },
    near(p, r) { const d = Math.hypot(p.x - base.x, p.z - base.z); return state === 1 || state === 2 ? d < blast + r : state === 0 && d < 2 + r; },
  };
}

// ---- effects ----------------------------------------------------------------------------------------
function motes(ctx, x, y, z, radius, height, n, color, size = 1.1) {
  const pos = new Float32Array(n * 3), a0 = new Float32Array(n), r0 = new Float32Array(n), h0 = new Float32Array(n), w = new Float32Array(n);
  for (let k = 0; k < n; k++) { a0[k] = Math.random() * 6.28; r0[k] = radius * Math.sqrt(Math.random()); h0[k] = Math.random() * height; w[k] = (0.2 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: P.glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.position.set(x, y, z); pts.frustumCulled = false; ctx.group.add(pts);
  ctx.anim((dt, t) => {
    for (let k = 0; k < n; k++) { const a = a0[k] + t * w[k], hh = (h0[k] + t * 0.8 * Math.abs(w[k])) % height; pos[k * 3] = Math.cos(a) * r0[k]; pos[k * 3 + 1] = hh; pos[k * 3 + 2] = Math.sin(a) * r0[k]; }
    geo.attributes.position.needsUpdate = true;
  });
}
const flap = (g, t, sp = 9, amp = 0.7) => { const f = Math.sin(t * sp) * amp; g.userData.wings[0].rotation.z = -f; g.userData.wings[1].rotation.z = f; };

// ---- the map ------------------------------------------------------------------------------------------
export default {
  id: 'pokemon', name: 'Kanto Brick Route', subtitle: 'Pallet Town, Viridian Forest, Mt. Moon, a sea glide and the Stadium', cup: 'games', seed: 151,
  width: 28, shoulder: 7, edge: 'fence', start: 0.5,
  points: [[-55, 295, 0], [55, 302, 0], [160, 284, 0], [233, 225, 0], [270, 143, 0], [277, 53, 0], [260, -35, 0], [277, -119, 0], [240, -196, 0], [163, -240, 0], [75, -224, 0], [-9, -251, 4], [-97, -268, 12], [-178, -244, 20], [-244, -185, 26], [-284, -108, 28], [-304, -13, 20], [-295, 79, 9], [-264, 163, 2], [-214, 231, 0], [-143, 275, 0]],
  sections: [
    { from: 20.4, to: 1.7, surface: 'pallet', shoulder: 7 },
    { from: 1.7, to: 5.3, surface: 'dirt', edge: 'open', shoulder: 9 },
    { from: 5.3, to: 7.7, surface: 'city', shoulder: 5 },
    { from: 7.7, to: 10.6, surface: 'forest', edge: 'open', shoulder: 5 },
    { from: 9.56, to: 9.62, gap: true },
    { from: 10.6, to: 12.2, surface: 'rock', edge: 'wall', shoulder: 3, support: 'bank' },
    { from: 12.2, to: 13.6, surface: 'cave', edge: 'wall', shoulder: 2, width: 26, support: 'bank' },
    { from: 13.6, to: 15.12, surface: 'rock', edge: 'wall', shoulder: 3, support: 'bank' },
    { from: 15.18, to: 16.6, gap: true },
    { from: 16.6, to: 17.9, surface: 'pier', edge: 'wall', shoulder: 3, support: 'pillar' },
    { from: 17.9, to: 19.0, surface: 'city', shoulder: 5 },
    { from: 19.0, to: 20.4, surface: 'stadium', edge: 'wall', shoulder: 3, width: 40 },
  ],
  items: [1.0, 3.2, 5.8, 8.3, 10.9, 13.0, 17.65, 19.45],
  boosts: [[2.0, 0], [4.9, -0.35], [6.6, 0.3], [9.3, 0], [11.7, 0], [14.6, -0.3], [18.25, 0], [19.75, 0.35], [20.3, -0.35]],
  ramps: [9.45],
  gliders: [15.06],
  studs: [[0.3, -0.4, 8], [1.6, 0.3, 6], [2.6, 0, 6], [4.3, -0.3, 6], [6.2, 0, 8], [7.9, 0.3, 6], [9.0, -0.3, 6], [10.3, 0, 6], [12.5, 0, 8], [14.0, -0.3, 6], [17.0, 0, 6], [18.7, 0, 6], [19.2, -0.5, 6], [19.2, 0.5, 6], [19.9, 0, 6]],
  theme: {
    sky: [0x2f86e8, 0xd2ecff, 0x7ab8d8], fog: [0xcfe6f6, 260, 1250], sun: { color: 0xfff4dc, intensity: 2.8, dir: [0.45, 1, 0.35] },
    hemi: [0xe4f2ff, 0x5a8a4a, 1.25], envIntensity: 0.8,
    ground: GRASS, groundPitch: 1.6, shoulder: 0x7cc04a, dust: 0xc8b078,
    road: { base: '#8a8e92', line: '#f4f4f4' },
    surfaces: {
      pallet: { base: '#d8c8a0', line: null, seams: 'rgba(120,90,50,0.3)' },
      dirt: { base: '#c8a46a', line: null, seams: 'rgba(110,70,30,0.28)', rough: 0.8 },
      city: { base: '#7a7e84', line: '#f2cd37', dashed: true },
      forest: { base: '#8a6a44', line: null, seams: 'rgba(40,24,8,0.35)', rough: 0.85 },
      rock: { base: '#8e867a', line: null, seams: 'rgba(40,30,20,0.4)', rough: 0.8 },
      cave: { base: '#5e564e', line: '#7ae8e0', seams: 'rgba(0,0,0,0.45)', emissive: 0x0a1a1a, emissiveIntensity: 1 },
      pier: { base: '#9a7a54', line: null, seams: 'rgba(50,30,10,0.45)' },
      stadium: { base: '#3a8a3a', line: '#f4f4f4', seams: 'rgba(20,60,20,0.3)', rough: 0.75 },
    },
    wall: [ROCK, ROCK2, ROCK3], curb: [C.red, C.white], gate: [C.red, C.white], fence: [C.white, 0xd8d0c0],
    support: 'bank', pillar: ROCK, pillar2: ROCK2, skirt: ['#8a8278', '#6e675e'], skirtColor: ROCK2,
    rampSide: C.dkblue, ramp: C.red,
    music: { bpm: 150, root: 62, scale: 'major', style: 'adventure' },
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
    // yaw that turns a prop's +Z toward the road centre at k
    const faceYaw = (p, k) => { const q = tr.at(K(k), 0, 0); return Math.atan2(q.x - p.x, q.z - p.z); };
    const anims = [];
    ctx.anim((dt, t) => { for (const f of anims) f(dt, t); });
    // a creature as its own group, facing the road
    const mon = (fn, s, k, lat, r = 3, y = 0) => { const p = spot(k, lat, r); const g = P.fig(fn, s); g.position.set(p.x, y, p.z); g.rotation.y = faceYaw(p, k); ctx.group.add(g); ctx.claim(p.x, p.z, r); return g; };
    // a static creature stamped into the scenery
    const still = (fn, s, k, lat, r = 3, yawOff = 0) => { const p = spot(k, lat, r); P.stamp(b, fn, p.x, 0, p.z, faceYaw(p, k) + yawOff, s); ctx.claim(p.x, p.z, r); return p; };
    const hop = (g, ph, amp = 0.6, sp = 4) => anims.push((dt, t) => { g.position.y = Math.abs(Math.sin(t * sp + ph)) * amp; });

    // ---- ground: the sea (west bay under the glide), beach, forest floor, mountain rock --------
    const BAY = [[-1500, -1500], [-345, -1500], [-345, -95], [-262, -92], [-215, -45], [-222, 30], [-258, 95], [-290, 170], [-262, 222], [-300, 255], [-345, 300], [-345, 1500], [-1500, 1500]];
    const poly = (g, toPx, pts) => { g.beginPath(); pts.forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.closePath(); g.fill(); };
    const creek = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = g.lineJoin = 'round'; g.beginPath(); [[150, -420], [140, -300], [100, -238], [80, -160], [40, -60]].forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); };
    const gliding = (i) => inRange(tr, i, 15.12, 16.65), jump = (i) => inRange(tr, i, 9.52, 9.66);
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = g.strokeStyle = '#000';
      poly(g, toPx, BAY); creek(g, toPx, sc, 9); strokeTrack(g, tr, toPx, sc, 4, jump);
    });
    ctx.cutGround(hole);
    const water = ctx.makeMask(3000, 2048, (g, toPx, sc) => { g.fillStyle = g.strokeStyle = '#fff'; poly(g, toPx, BAY); creek(g, toPx, sc, 14); strokeTrack(g, tr, toPx, sc, 8, jump); });
    liquid(ctx, water, 0x1a7ad0, -2.4, { size: 3000, speed: 0.03, rough: 0.08, opacity: 0.92 });
    const beach = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; g.save(); g.lineWidth = 28 * sc; g.strokeStyle = '#fff'; g.lineJoin = 'round'; g.beginPath(); BAY.slice(2, 11).forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); g.restore(); });
    scene.add(groundPlane(SAND, -0.06, 1600, 1.6, { mask: beach, rough: 0.9 }));
    const FOREST = [[150, -290, 90], [60, -300, 80], [230, -260, 70], [120, -150, 60], [200, -150, 45], [40, -160, 45]];
    const forest = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; for (const [x, z, r] of FOREST) disc(g, toPx, sc, x, z, r); });
    scene.add(groundPlane(0x2f6a2a, -0.04, 1600, 1.6, { mask: forest, rough: 0.9 }));
    const MOUNT = [[-170, -330, 120], [-60, -340, 80], [-250, -250, 70], [-120, -190, 40]];
    const mount = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; for (const [x, z, r] of MOUNT) disc(g, toPx, sc, x, z, r); });
    scene.add(groundPlane(0x9a8e78, -0.03, 1600, 1.6, { mask: mount, rough: 0.9 }));

    // ---- Pallet Town ----------------------------------------------------------------------------------------
    P.signPost(b, 'PALLET TOWN', ...(() => { const p = spot(0.15, edgeLat(K(0.15)) + 2, 2); return [p.x, p.z, faceYaw(p, 0.15) + Math.PI / 2]; })());
    for (const [k, sd, roof] of [[20.65, 1, 0xc83a2a], [0.05, -1, 0xc83a2a], [0.75, 1, 0x2a6ad8], [1.3, 1, 0xc83a2a], [1.45, -1, 0x3a8a4a], [20.85, -1, 0xc83a2a]]) {
      const i = K(k), p = spot(k, sd * (edgeLat(i) + 8), 7), rot = faceYaw(p, k);
      P.kantoHouse(b, p.x, p.z, rot, { roof, w: 9 + rand() * 2, d: 8, h: 5 + rand() });
      // garden fence and flower bed in front
      const fx = Math.sin(rot), fz = Math.cos(rot);
      flowerBed(b, p.x + fx * 6, p.z + fz * 6, 6, [C.red, C.yellow, C.pink, C.white][Math.floor(rand() * 4)], rot + Math.PI / 2);
      ctx.claim(p.x, p.z, 8);
    }
    // Professor Oak's lab on the hill with the three starters in front
    { const i = K(0.95), p = spot(0.95, -(edgeLat(i) + 26), 14), rot = faceYaw(p, 0.95);
      let y = 0; for (let n = 0; n < 3; n++) y = b.cyl(p.x, y, p.z, 20 - n * 2.5, 0.8, n % 2 ? DKGRASS : GRASS, { seg: 20 });
      P.oakLab(b, p.x - Math.sin(rot) * 3, p.z - Math.cos(rot) * 3, rot);
      const fx = Math.sin(rot), fz = Math.cos(rot), rx = Math.cos(rot), rz = -Math.sin(rot);
      [[P.bulbasaur, -4], [P.charmander, 0], [P.squirtle, 4]].forEach(([fn, o], n) => {
        const x = p.x + fx * 9 + rx * o, z = p.z + fz * 9 + rz * o;
        b.cyl(x, y, z, 1.4, 1.0, 0xd8d0c0, { seg: 12 }); const L = new P.Local(b, x, y + 1.0, z, rot, 1);
        P.pokeball(L, 1.1, 0, -0.6, 0.35);
        const g = P.fig(fn, 1.0); g.position.set(x, y + 1, z); g.rotation.y = rot; ctx.group.add(g); hop(g, n * 1.3, 0.35, 3);
        if (fn === P.charmander) { const fl = P.glow(0xffa040, 3, 0.8); fl.position.set(0, 2.0, -1.9); g.add(fl); anims.push((dt, t) => { fl.material.opacity = 0.6 + 0.3 * Math.sin(t * 13); }); }
      });
      ctx.claim(p.x, p.z, 20); }
    // Pikachu cheering at the start line with its trainer
    { const p = spot(0.42, edgeLat(K(0.42)) + 4, 2); const pk = P.fig(P.pikachu, 1.2); pk.position.copy(p); pk.rotation.y = faceYaw(p, 0.42); ctx.group.add(pk); hop(pk, 0, 0.9, 5);
      const sp = P.glow(0xfff060, 4, 0.7); sp.position.set(0, 2.6, 0); pk.add(sp); anims.push((dt, t) => { sp.material.opacity = Math.max(0, Math.sin(t * 7)) * 0.9; });
      minifig(b, p.x + 2, 0, p.z + 1, faceYaw(p, 0.42), C.blue, () => 0.1);
      b.cyl(p.x + 2, 2.8, p.z + 1, 0.46, 0.35, C.red, { seg: 10 }); b.box(p.x + 2, 2.8, p.z + 1.4, 0.8, 0.12, 0.6, C.red, { rot: faceYaw(p, 0.42) }); }
    edges(ctx, 20.5, 1.6, 10, 1.2, (p, i) => { b.box(p.x, 0, p.z, 0.3, 1.6, 0.3, C.white); }, [1, -1]);
    // flower meadows and Pokémon around town
    ctx.scatter(26, { minC: 6, maxC: 60, r: 3, test: (x, z) => z > 220 && x > -120 && x < 180 }, (x, z) => { if (rand() < 0.5) P.kTree(b, x, z, 0.9 + rand() * 0.5); else flowerBed(b, x, z, 4, [C.red, C.yellow, C.pink, C.white][Math.floor(rand() * 4)], rand() * 3); });
    still(P.jigglypuff, 1.0, 20.75, edgeLat(K(20.75)) + 14, 3);
    still(P.eevee, 1.0, 1.15, -(edgeLat(K(1.15)) + 6), 2);

    // ---- Route 1: tall grass, ledges, Pidgey and Rattata, Diglett holes ---------------------------------
    arch(ctx, 1.75, { cols: [C.red, C.white], text: 'ROUTE 1', bg: '#3a8a3a', fg: '#ffffff' });
    const r1 = (x, z) => x > 150 && z > -20 && z < 260;
    ctx.scatter(240, { minC: 1, maxC: 46, r: 1.6, test: r1 }, (x, z) => P.grassTuft(b, x, z, 1 + rand() * 0.4));
    each(tr, 1.8, 5.25, 2, (i) => { for (const sd of [-1, 1]) for (let n = 0; n < 2; n++) { const p = tr.at(i, sd * (edgeLat(i) + 1.5 + rand() * 11), 0); if (ctx.free(p.x, p.z, 1)) P.grassTuft(b, p.x + (rand() - 0.5) * 2, p.z + (rand() - 0.5) * 2, 1 + rand() * 0.5); } });
    ctx.scatter(30, { minC: 18, maxC: 90, r: 4, test: r1 }, (x, z) => P.kTree(b, x, z, 1 + rand() * 0.5));
    // one-way grass ledges along the outside
    each(tr, 2.3, 4.9, 7, (i) => { const p = tr.at(i, edgeLat(i) + 16, 0), yaw = tr.yawAt(i); b.box(p.x, 0, p.z, 3, 1.4, 7.6, DKGRASS, { rot: yaw }); b.box(p.x, 1.4, p.z, 3.2, 0.3, 7.8, GRASS, { rot: yaw }); b.box(p.x - Math.cos(yaw) * 1.6, 0, p.z + Math.sin(yaw) * 1.6, 0.4, 1.2, 7.6, 0x9a8a5a, { rot: yaw }); });
    for (const [k, l] of [[2.4, 12], [3.1, -14], [3.9, 16], [4.6, -12], [2.9, 26], [4.2, -24]]) still(P.rattata, 1.0, k, Math.sign(l) * (edgeLat(K(k)) + Math.abs(l)), 2);
    { const p = spot(2.2, -(edgeLat(K(2.2)) + 3), 2); P.signPost(b, 'ROUTE 1', p.x, p.z, faceYaw(p, 2.2)); }
    for (let n = 0; n < 5; n++) { const pg = P.pidgey(1.3); ctx.group.add(pg); const c = tr.at(K(2.6 + n * 0.55), (n % 2 ? 1 : -1) * 30, 0), r = 22 + n * 4, sp = 0.35 + n * 0.05;
      anims.push((dt, t) => { const a = t * sp + n * 1.7; pg.position.set(c.x + Math.cos(a) * r, 14 + n * 2 + Math.sin(t * 1.3 + n) * 2, c.z + Math.sin(a) * r); pg.rotation.y = -a + (sp > 0 ? Math.PI : 0); pg.rotation.z = 0.25; flap(pg, t + n, 11, 0.7); }); }
    for (const [k, lf, off] of [[2.7, -0.45, 0], [3.0, 0.4, 1.3], [3.35, -0.05, 2.6], [3.75, 0.5, 0.7], [4.1, -0.4, 3.1], [4.45, 0.15, 1.9]])
      ctx.hazard(diglettPop(ctx, { k, latF: lf, period: 4.6, offset: off }));
    still(P.diglett, 1.3, 3.5, edgeLat(K(3.5)) + 4, 2); still(P.diglett, 1.0, 3.55, edgeLat(K(3.55)) + 6, 2);

    // ---- Viridian City ------------------------------------------------------------------------------------
    arch(ctx, 5.35, { cols: [0x3a8a4a, C.white], text: 'VIRIDIAN CITY', bg: '#2a6a3a', fg: '#ffffff' });
    { const p = spot(5.95, edgeLat(K(5.95)) + 12, 12); P.pokeCenter(b, p.x, p.z, faceYaw(p, 5.95)); ctx.claim(p.x, p.z, 12);
      const ch = P.fig(P.pikachu, 1.0); const q = spot(5.95, edgeLat(K(5.95)) + 3, 1.5); ch.position.copy(q); ch.rotation.y = faceYaw(q, 5.95); ctx.group.add(ch); hop(ch, 1, 0.5, 6); }
    { const p = spot(6.3, -(edgeLat(K(6.3)) + 10), 9); P.pokeMart(b, p.x, p.z, faceYaw(p, 6.3)); ctx.claim(p.x, p.z, 9); }
    { const p = spot(6.85, edgeLat(K(6.85)) + 15, 16); P.gym(b, p.x, p.z, faceYaw(p, 6.85)); ctx.claim(p.x, p.z, 16); }
    for (const [k, sd] of [[5.6, -1], [5.65, 1], [6.6, -1], [7.05, -1], [7.3, 1], [6.05, -1]]) {
      const p = spot(k, sd * (edgeLat(K(k)) + 7), 6.5); P.kantoHouse(b, p.x, p.z, faceYaw(p, k), { roof: [0x3a8a4a, 0xc83a2a, 0x2a6ad8][Math.floor(rand() * 3)], w: 9, d: 8, h: 5 + rand() * 2 }); ctx.claim(p.x, p.z, 7);
    }
    ctx.scatter(18, { minC: 4, maxC: 50, r: 3, test: (x, z) => x > 190 && z < -10 && z > -150 }, (x, z) => P.kTree(b, x, z, 1 + rand() * 0.4));
    edges(ctx, 5.4, 7.6, 14, 1.5, (p) => { b.cyl(p.x, 0, p.z, 0.15, 5, 0x3a3a3a, { seg: 6 }); nb.sphere(p.x, 5.2, p.z, 0.45, 0, { mat: P.neon(0xfff2c0, 1.2) }); });
    ctx.hazard(snorlaxNap(ctx, { k: 7.35, period: 8.4 }));
    { const p = spot(7.5, -(edgeLat(K(7.5)) + 4), 2); P.signPost(b, 'VIRIDIAN FOREST', p.x, p.z, faceYaw(p, 7.5)); }

    // ---- Viridian Forest ----------------------------------------------------------------------------------
    arch(ctx, 7.75, { cols: [0x5a3a1a, 0x2f6a2a], text: 'VIRIDIAN FOREST', bg: '#1f4a1f', fg: '#c8f07a' });
    const fTree = (x, z, s) => P.kTree(b, x, z, s, 0, rand() < 0.5 ? 0x1f6a2a : 0x2a7a32, rand() < 0.5 ? 0x2f8a3a : 0x3a9a3a);
    edges(ctx, 7.8, 10.5, 5, 2.5, (p) => { if (rand() < 0.85) fTree(p.x + (rand() - 0.5) * 3, p.z + (rand() - 0.5) * 3, 1.1 + rand() * 0.5); });
    ctx.scatter(190, { minC: 4, maxC: 120, r: 4, test: (x, z) => forest.test(x, z) && hole.test(x, z) }, (x, z) => fTree(x, z, 1.1 + rand() * 0.7));
    for (const [k, l, fn] of [[8.1, 6, P.caterpie], [8.5, -7, P.weedle], [8.95, 8, P.caterpie], [9.9, -6, P.weedle], [10.2, 7, P.caterpie]]) { const g = mon(fn, 1.1, k, Math.sign(l) * (edgeLat(K(k)) + Math.abs(l)), 2); const ph = rand() * 6; anims.push((dt, t) => { g.scale.y = 1 + Math.sin(t * 4 + ph) * 0.06; }); }
    // Metapod hanging from branches
    for (const k of [8.3, 9.2, 10.0]) { const p = spot(k, edgeLat(K(k)) + 3, 1); const L = new P.Local(b, p.x, 4.5, p.z, 0, 1); L.limb(0, 1.6, 0, 0, 3.2, 0, 0.04, 0xe8e8e8); L.sphere(0, 0.9, 0, 0.7, 0x7aa83a, { sy: 1.4 }); L.spike(0, 1.6, 0, 0.4, 0.5, 0, 0, 0x7aa83a); }
    // bugs crossing the forest path
    for (const [k, fn, sp, off] of [[8.7, P.caterpie, 4, 0], [9.05, P.weedle, 5, 0.5], [10.15, P.caterpie, 4.5, 0.3]]) {
      const g = P.fig(fn, 1.2); const hold = new THREE.Group(); g.rotation.y = 0; hold.add(g);
      ctx.hazard(crossing(ctx, { mesh: hold, k, speed: sp, radius: 1.8, kind: 'bump', offset: off, span: 1.1 }));
    }
    // a wild Pikachu in a sunny clearing, sparking
    { const p = spot(9.25, -(edgeLat(K(9.25)) + 10), 6); const pk = P.fig(P.pikachu, 1.3); pk.position.copy(p); pk.rotation.y = faceYaw(p, 9.25); ctx.group.add(pk);
      const sp = P.glow(0xfff060, 6, 0.8); sp.position.y = 2.5; pk.add(sp); anims.push((dt, t) => { const z = Math.sin(t * 3) > 0.6; sp.visible = z; pk.position.y = z ? Math.abs(Math.sin(t * 20)) * 0.3 : 0; if (z && Math.random() < 0.3) fxOf(ctx)?.spark(p.x, 3, p.z, (Math.random() - 0.5) * 10, Math.random() * 8, (Math.random() - 0.5) * 10, 0xfff060, 0.3); });
      b.cyl(p.x, -0.02, p.z, 6, 0.06, 0x7cc04a, { seg: 16 }); ctx.claim(p.x, p.z, 6); }
    // Mew peeking out of the treetops
    { const c = spot(10.35, edgeLat(K(10.35)) + 18, 4); const mw = P.fig(P.mew, 1.4); ctx.group.add(mw); const gl = P.glow(0xffc8e8, 6, 0.6); gl.position.y = 1.5; mw.add(gl);
      anims.push((dt, t) => { mw.position.set(c.x + Math.sin(t * 0.7) * 6, 12 + Math.sin(t * 1.7) * 2, c.z + Math.cos(t * 0.5) * 6); mw.rotation.y = t * 0.6; }); }
    // the creek under the jump
    { const i = K(9.59); for (let n = 0; n < 6; n++) { const p = tr.at(i + (n % 2 ? 5 : -5), (n - 2.5) * 6, 0); rock(b, p.x, -2.2, p.z, 1.2, rand, [ROCK2, ROCK]); } }
    motes(ctx, 140, 0, -220, 90, 10, 140, 0xd8ff8a, 0.9);

    // ---- climbing to Mt. Moon -----------------------------------------------------------------------------
    { const p = spot(11.0, edgeLat(K(11.0)) + 14, 10); P.stamp(b, P.onix, p.x, 0, p.z, faceYaw(p, 11.0) + 1.2, 1.3); ctx.claim(p.x, p.z, 14); }
    // Mt. Moon massif: stacked rock tiers around the north-west corner
    for (const [x, z, r, h] of [[-170, -340, 95, 70], [-60, -345, 60, 40], [-260, -270, 55, 46], [-290, -200, 30, 30]]) {
      const layers = 8;
      for (let n = 0; n < layers; n++) { const f = 1 - n / layers; const rr = r * (0.35 + 0.65 * f); for (let m = 0; m < 6; m++) { const a = m / 6 * Math.PI * 2 + n * 0.4, bx = x + Math.cos(a) * rr * 0.35, bz = z + Math.sin(a) * rr * 0.35; if (tr.clearance(bx, bz, rr + 6, 0) < rr * 0.7) continue; b.box(bx, n * h / layers, bz, rr * 1.2, h / layers + 0.1, rr * 1.0, n % 2 ? ROCK : ROCK2, { rot: a }); } }
      b.cyl(x, h, z, r * 0.15, 1, ROCK3, { seg: 10 }); ctx.claim(x, z, r * 0.8);
    }
    // rocky shoulders hugging the climb, the cave and the ledge (mountain on the outside)
    { let n = 0; each(tr, 10.7, 15.0, 4, (i) => {
      const yaw = tr.yawAt(i), cy = tr.at(i, 0, 0).y, cave = inRange(tr, i, 12.2, 13.6);
      for (const [sd, lats] of [[1, [5, 13, 22, 32]], [-1, cave ? [5, 12] : []]]) lats.forEach((l, m) => {
        const p = tr.at(i, sd * (edgeLat(i) + l), 0), h = cave ? cy + 12 - m * 2 : cy + 2 + m * 4 + (n % 3);
        if (tr.clearance(p.x, p.z, 12, 0) < l - 6) return;
        b.box(p.x, 0, p.z, 9, Math.max(1, h), 6.5, (n + m) % 3 ? ROCK : ROCK2, { rot: yaw + (n % 2) * 0.2 });
      });
      n++; }); }
    { const p = spot(11.55, -(edgeLat(K(11.55)) + 10), 6); const stone = new THREE.Group(); const sb = new BrickBuilder(1); new P.Local(sb).sphere(0, 1.2, 0, 1.0, 0, { mat: P.neon(0xd8e0ff, 1.4), sy: 1.3 }); stone.add(sb.build({ name: 'moonstone' }), P.glow(0xc8d8ff, 7, 0.7)); stone.position.copy(p); ctx.group.add(stone); ctx.claim(p.x, p.z, 7);
      for (let n = 0; n < 4; n++) { const cf = P.fig(P.clefairy, 1.2); ctx.group.add(cf); anims.push((dt, t) => { const a = t * 0.8 + n * Math.PI / 2; cf.position.set(p.x + Math.cos(a) * 4, Math.abs(Math.sin(t * 5 + n)) * 0.6, p.z + Math.sin(a) * 4); cf.rotation.y = -a; }); } }
    // cave mouth and the cave itself
    { const i = K(12.15), c = tr.at(i, 0, 0), yaw = tr.yawAt(i), e = edgeLat(i) + 2.6, fx = Math.sin(yaw), fz = Math.cos(yaw);
      for (let m = 0; m < 4; m++) {
        const x = c.x - fx * m * 1.6, z = c.z - fz * m * 1.6, ww = 12 + m * 5, top = c.y + 15 + m * 3;
        for (const sd of [-1, 1]) { const q = tr.at(i, sd * (e + ww / 2), 0); b.box(q.x - fx * m * 1.6, 0, q.z - fz * m * 1.6, ww, top, 3.2, m % 2 ? ROCK2 : ROCK, { rot: yaw }); }
        b.box(x, c.y + 12.4, z, 2 * e + 0.4, top - c.y - 12.4, 3.2, m % 2 ? ROCK2 : ROCK, { rot: yaw });
      }
      b.box(c.x + fx * 1.7, c.y + 11.6, c.z + fz * 1.7, 2 * e + 2, 1.2, 0.6, 0x3a342e, { rot: yaw }); }
    tunnel(ctx, 12.18, 13.62, { wall: 0x5a524a, roof: 0x3e3832, height: 11, lights: 0x7ae8e0, stud: false });
    { const crys = [0x7ae8e0, 0xb87aff, 0x7ab0ff].map((c) => P.neon(c, 1.8));
      each(tr, 12.25, 13.55, 6, (i) => { for (const sd of [-1, 1]) { if (rand() < 0.3) continue; const q = tr.at(i, sd * (edgeLat(i) + 0.2), 0), m = crys[Math.floor(rand() * 3)]; const L = new P.Local(nb, q.x, q.y + 1 + rand() * 6, q.z, rand() * 6, 0.8 + rand() * 0.6); L.spike(0, 0, 0, 0.5, 2.2, 0.3, sd * 0.5, 0, { mat: m }); L.spike(0.3, 0, 0.2, 0.35, 1.5, -0.3, sd * 0.9, 0, { mat: m }); } });
      const c = tr.at(K(12.9), 0, 0); const l = new THREE.PointLight(0x7ae8e0, 3, 90, 1.3); l.position.set(c.x, c.y + 8, c.z); scene.add(l); }
    // Zubat swarms: through the cave (high) and around the mountain
    { const zs = []; for (let n = 0; n < 9; n++) { const z = P.zubat(1.1); ctx.group.add(z); zs.push(z); }
      const N0 = K(12.25), N1 = K(13.55), span = (N1 - N0 + tr.N) % tr.N;
      anims.push((dt, t) => zs.forEach((z, n) => { const f = ((t * 0.09 + n / zs.length) % 1), i = tr.wrap(N0 + Math.floor(f * span)); tr.at(i, Math.sin(t * 1.3 + n * 2) * 8, 7.5 + Math.sin(t * 3 + n) * 0.8, z.position); z.rotation.y = tr.yawAt(i) + Math.PI + Math.sin(t * 2 + n) * 0.4; flap(z, t + n, 16, 0.8); }));
      const mc = new THREE.Vector3(-170, 60, -330);
      for (let n = 0; n < 10; n++) { const z = P.zubat(1.6); ctx.group.add(z); const r = 40 + (n % 4) * 14, sp = 0.3 + (n % 3) * 0.08;
        anims.push((dt, t) => { const a = t * sp + n * 0.7; z.position.set(mc.x + Math.cos(a) * r, mc.y + Math.sin(t * 1.4 + n) * 6, mc.z + Math.sin(a) * r); z.rotation.y = -a; flap(z, t + n, 14, 0.8); }); } }
    // Geodude: some resting on the slope, some rolling across the ledge
    for (const k of [13.85, 14.3, 14.85]) still(P.geodude, 1.3, k, edgeLat(K(k)) + 9, 2);
    ctx.hazard(geodudeRoll(ctx, { k: 14.1, period: 6.4, offset: 0 }));
    ctx.hazard(geodudeRoll(ctx, { k: 14.55, period: 6.4, offset: 3.2 }));
    { const p = spot(14.95, edgeLat(K(14.95)) + 3, 2); p.y = tr.at(K(14.95), 0, 0).y; P.signPost(b, 'ROUTE 4', p.x, p.z, faceYaw(p, 14.95)); }

    // ---- the sea: Lapras, Magikarp and leaping Gyarados under the glide ------------------------------------
    { const lp = P.fig(P.lapras, 2.0); ctx.group.add(lp); const c = new THREE.Vector3(-262, 0, -10);
      const rider = new BrickBuilder(1); minifig(rider, 0, 2.2, -0.4, 0, C.red, () => 0.3); lp.add(rider.build({ name: 'rider' }));
      anims.push((dt, t) => { const a = t * 0.12; lp.position.set(c.x + Math.cos(a) * 34, -2.6 + Math.sin(t * 1.2) * 0.25, c.z + Math.sin(a) * 60); lp.rotation.y = Math.atan2(-Math.sin(a) * 34, Math.cos(a) * 60); lp.rotation.z = Math.sin(t * 0.9) * 0.05; }); }
    for (let n = 0; n < 7; n++) { const mk = P.fig(P.magikarp, 1.2); ctx.group.add(mk); const x0 = -330 - (n % 3) * 30 + (n * 37 % 50), z0 = -60 + n * 30, per = 3 + (n % 3) * 0.7, ph = n * 0.9;
      anims.push((dt, t) => { const u = ((t + ph) % per) / per, j = u < 0.45 ? u / 0.45 : -1; mk.visible = j >= 0; if (j >= 0) { mk.position.set(x0 + j * 5, -2.4 + Math.sin(j * Math.PI) * 4, z0); mk.rotation.set(0, Math.PI / 2, Math.sin(t * 20) * 0.4 - (j - 0.5) * 1.6); if (j > 0.95 && Math.random() < 0.3) fxOf(ctx)?.splash(mk.position, 0xd8f0ff); } }); }
    // Gyarados leaping across the glide path (dodge it in the air), and one far out in the bay
    ctx.hazard(gyaradosLeap(ctx, { k: 15.85, period: 6.2, offset: 0 }));
    ctx.hazard(gyaradosLeap(ctx, { k: 16.3, period: 6.2, offset: 3.1, dir: -1 }));
    { const gy = P.fig(P.gyarados, 1.6); const hold = new THREE.Group(); gy.rotation.x = Math.PI / 2; gy.position.set(0, 0, -9); hold.add(gy); ctx.group.add(hold);
      anims.push((dt, t) => { const per = 9, u = (t % per) / per; if (u > 0.4) { hold.visible = false; return; } const f = u / 0.4; hold.visible = true; hold.position.set(-420 + f * 70, -8 + Math.sin(f * Math.PI) * 26, 20 + f * 20); hold.rotation.set(-(f - 0.5) * 2.2, 1.1, 0, 'YXZ'); }); }
    // lighthouse on the rocks and a few buoys
    { const x = -360, z = 130; let y = -3; for (let n = 0; n < 4; n++) y = b.cyl(x, y, z, 8 - n, 1.4, n % 2 ? ROCK : ROCK2, { seg: 10 }); for (let n = 0; n < 7; n++) y = b.cyl(x, y, z, 2.6 - n * 0.12, 2.6, n % 2 ? C.white : C.red, { seg: 14 }); b.cyl(x, y, z, 2.2, 2, 0x2a3a4a, { seg: 12 }); nb.sphere(x, y + 1, z, 1.2, 0, { mat: P.neon(0xfff0a0, 2.2) }); b.cone(x, y + 2, z, 2.6, 2.4, C.red, { seg: 12 }); const bm = P.glow(0xfff4c0, 20, 0.6); bm.position.set(x, y + 1, z); ctx.group.add(bm); }
    for (let n = 0; n < 6; n++) { const x = -330 + (n % 2) * 40, z = -60 + n * 40; const bu = new THREE.Group(); const bb = new BrickBuilder(1); bb.cyl(0, -1, 0, 0.9, 2, n % 2 ? C.red : C.white, { seg: 10 }); bb.cone(0, 1, 0, 0.7, 1.4, n % 2 ? C.white : C.red, { seg: 10 }); bu.add(bb.build({ name: 'buoy' })); bu.position.set(x, -2.4, z); ctx.group.add(bu); anims.push((dt, t) => { bu.position.y = -2.4 + Math.sin(t * 1.5 + n) * 0.3; bu.rotation.z = Math.sin(t * 1.1 + n) * 0.12; }); }

    // ---- Cerulean causeway and city ------------------------------------------------------------------------
    arch(ctx, 16.75, { cols: [0x2a6ad8, C.white], text: 'CERULEAN CITY', bg: '#1a4aa8', fg: '#ffffff' });
    edges(ctx, 16.65, 17.9, 6, 1.2, (p) => { b.cyl(p.x, p.y + 0.5, p.z, 0.18, 4, 0x3a3a3a, { seg: 6 }); nb.sphere(p.x, p.y + 4.7, p.z, 0.45, 0, { mat: P.neon(0xfff2c0, 1.2) }); });
    // Gyarados' Hyper Beam across the causeway
    ctx.hazard(hyperBeam(ctx, { k: 18.5, period: 7.2, offset: 0 }));
    { const p = spot(18.05, -(edgeLat(K(18.05)) + 16), 15); P.gym(b, p.x, p.z, faceYaw(p, 18.05), { roof: 0x2a6ad8, wall: 0xe8f0f8, name: 'CERULEAN GYM' }); ctx.claim(p.x, p.z, 15);
      // the water-drop emblem
      nb.sphere(p.x, 14, p.z, 2.2, 0, { mat: plastic(0x5ab8ff, { trans: true, opacity: 0.8 }) }); nb.cone(p.x, 15.4, p.z, 1.6, 2.6, 0, { mat: plastic(0x5ab8ff, { trans: true, opacity: 0.8 }) }); }
    for (const [k, sd] of [[17.95, -1], [18.35, -1], [18.75, -1], [17.85, 1], [18.9, 1]]) { const p = spot(k, sd * (edgeLat(K(k)) + 7), 6.5); if (sd > 0 && !hole.test(p.x, p.z)) continue; P.kantoHouse(b, p.x, p.z, faceYaw(p, k), { roof: 0x2a6ad8, wall: 0xf4f0e4 }); ctx.claim(p.x, p.z, 7); }
    { const p = spot(18.2, -(edgeLat(K(18.2)) + 4), 2); P.signPost(b, 'CERULEAN CITY', p.x, p.z, faceYaw(p, 18.2)); }
    ctx.scatter(16, { minC: 4, maxC: 50, r: 3, test: (x, z) => x < -150 && z > 120 && z < 230 && hole.test(x, z) }, (x, z) => P.kTree(b, x, z, 1 + rand() * 0.3));
    // Psyduck and Slowpoke wandering across the road
    for (const [k, fn, sp, s] of [[18.75, P.psyduck, 4, 1.2], [18.92, P.slowpoke, 2.6, 1.2]]) {
      const g = P.fig(fn, s); const hold = new THREE.Group(); hold.add(g);
      ctx.hazard(crossing(ctx, { mesh: hold, k, speed: sp, radius: 2.0, kind: 'bump', span: 1.05 }));
    }
    { const g = mon(P.psyduck, 1.1, 17.9, -(edgeLat(K(17.9)) + 4), 2); anims.push((dt, t) => { g.rotation.z = Math.sin(t * 2.2) * 0.12; }); }
    still(P.squirtle, 1.0, 17.5, edgeLat(K(17.5)) + 1, 1);

    // ---- Pokémon Stadium -------------------------------------------------------------------------------------------
    arch(ctx, 19.0, { cols: [C.red, C.white], text: 'POKéMON STADIUM', bg: '#1a2a6a', fg: '#f6d23a', height: 13 });
    { // tiers of stands with cheering crowds on both sides, flags and light towers
      const tops = [C.red, C.blue, C.yellow, C.green, C.white, C.orange, 0x9a6ab8, C.azure];
      let n = 0;
      each(tr, 19.08, 20.35, 3, (i) => {
        const yaw = tr.yawAt(i);
        for (const sd of [-1, 1]) {
          for (let t = 0; t < 6; t++) {
            const p = tr.at(i, sd * (edgeLat(i) + 2.4 + t * 2.4), 0), h = 1.2 + t * 1.3;
            b.box(p.x, 0, p.z, 2.4, h, 3.4, t % 2 ? 0xd8d8d8 : 0xb0b4b8, { rot: yaw });
            if (rand() < 0.62) minifig(b, p.x, h, p.z, yaw + (sd > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI, tops[Math.floor(rand() * tops.length)], rand);
          }
          const p = tr.at(i, sd * (edgeLat(i) + 17), 0); b.box(p.x, 0, p.z, 2.4, 10, 3.4, n % 2 ? C.red : C.white, { rot: yaw });
          if (n % 5 === 0) { b.cyl(p.x, 10, p.z, 0.12, 5, 0x3a3a3a, { seg: 4 }); b.box(p.x, 13.4, p.z + 0.9, 0.1, 1.4, 1.8, tops[n % tops.length], { rot: yaw }); }
        }
        n++;
      });
      for (const [k, sd] of [[19.15, 1], [19.6, -1], [20.05, 1], [19.25, -1]]) { const i = K(k), p = tr.at(i, sd * (edgeLat(i) + 22), 0); b.box(p.x, 0, p.z, 1.6, 26, 1.6, 0x8a8e92); b.box(p.x, 26, p.z, 6, 3, 1, 0x3a3a3a, { rot: tr.yawAt(i) + Math.PI / 2 }); for (let m = -1; m <= 1; m++) nb.box(p.x + Math.cos(tr.yawAt(i) + Math.PI / 2) * m * 1.8, 26.6, p.z - Math.sin(tr.yawAt(i) + Math.PI / 2) * m * 1.8, 1.4, 1.8, 1.2, 0, { mat: P.neon(0xffffff, 2) }); }
      // giant Poké Balls on the corners of the stands
      for (const [k, sd] of [[19.1, 1], [19.1, -1], [20.3, 1], [20.3, -1]]) { const i = K(k), p = tr.at(i, sd * (edgeLat(i) + 9), 0); P.pokeball(new P.Local(b, p.x, 9, p.z, tr.yawAt(i) + Math.PI, 1), 0, 0, 0, 3.2); }
    }
    // the big screen on a gantry over the road
    { const i = K(19.85), c = tr.at(i, 0, 0), yaw = tr.yawAt(i), w = edgeLat(i) + 2;
      for (const sd of [-1, 1]) { const p = tr.at(i, sd * (w + 1), 0); b.box(p.x, 0, p.z, 2, 26, 2, 0x5a5e62, { rot: yaw }); }
      b.box(c.x, 15, c.z, 2 * w + 4, 1.4, 2.4, 0x5a5e62, { rot: yaw }); b.box(c.x, 15.6, c.z, 30, 15, 1.6, 0x1a1a1e, { rot: yaw });
      const tex = P.screenTexture();
      const sm = new THREE.MeshBasicMaterial({ map: tex }), sg = new THREE.PlaneGeometry(28, 14);
      for (const sd of [-1, 1]) { const m = new THREE.Mesh(sg, sm); m.position.set(c.x + Math.sin(yaw) * 0.85 * sd, 23.1, c.z + Math.cos(yaw) * 0.85 * sd); m.rotation.y = sd < 0 ? yaw + Math.PI : yaw; ctx.group.add(m); }
      anims.push((dt, t) => { const f = Math.floor(t / 3) % 4; tex.offset.set((f % 2) * 0.5, f < 2 ? 0.5 : 0); }); }
    for (const [k, lf, off] of [[19.3, -0.35, 0], [19.55, 0.3, 1.7], [20.0, -0.1, 3.4], [20.15, 0.45, 2.4]]) ctx.hazard(voltorbMine(ctx, { k, latF: lf, period: 5.2, offset: off }));
    // Charizard circling above the stadium, a Pikachu balloon
    { const cz = P.charizard(2.2); ctx.group.add(cz); const c = tr.at(K(19.7), 0, 0); const fl = P.glow(0xffa040, 6, 0.8); fl.position.set(0, -1.5 * 2.2, -2.6 * 2.2); cz.add(fl);
      anims.push((dt, t) => { const a = t * 0.3; cz.position.set(c.x + Math.cos(a) * 55, 42 + Math.sin(t * 0.8) * 4, c.z + Math.sin(a) * 45); cz.rotation.y = -a; cz.rotation.z = 0.3; flap(cz, t, 4, 0.5); fl.material.opacity = 0.6 + 0.3 * Math.sin(t * 11); }); }
    { const pk = P.fig(P.pikachu, 4.5); ctx.group.add(pk); const c = tr.at(K(19.3), -(edgeLat(K(19.3)) + 30), 0); const bl = new BrickBuilder(1); new P.Local(bl).limb(0, 0, 0, 0, 30, 0, 0.06, 0xe0e0e0); const rope = bl.build(); rope.position.set(c.x, 0, c.z); ctx.group.add(rope);
      anims.push((dt, t) => { pk.position.set(c.x + Math.sin(t * 0.4) * 1.5, 30 + Math.sin(t * 0.7) * 1.2, c.z); pk.rotation.y = Math.sin(t * 0.3) * 0.6 + 1.2; pk.rotation.z = Math.sin(t * 0.5) * 0.06; }); }
    // starters cheering on the stadium sidelines
    for (const [k, fn, sd] of [[19.2, P.bulbasaur, 1], [19.45, P.charmander, -1], [19.7, P.squirtle, 1], [20.1, P.pikachu, -1], [19.3, P.jigglypuff, -1], [20.0, P.eevee, 1]]) { const i = K(k), p = tr.at(i, sd * (tr.HW[i] + 1.2), 0); const g = P.fig(fn, 1.1); g.position.copy(p); g.rotation.y = faceYaw(p, k); ctx.group.add(g); hop(g, k * 3, 0.5, 4.5); }
    pointLight(scene, tr.at(K(19.7), 0, 0), 26, 0xffffff, 2.5, 160);

    // ---- infield: rolling hills, trees, wild Pokémon ------------------------------------------------------------------
    for (const [x, z, r, h] of [[40, 40, 60, 6], [-80, -60, 45, 5], [120, -90, 40, 4], [-120, 120, 40, 4], [100, 160, 35, 3]]) {
      let y = 0; for (let n = 0; n < h; n++) { const rr = r * (1 - n / (h + 1)); if (tr.clearance(x, z, rr + 6, 0) < rr) break; y = b.cyl(x, y, z, rr, 1.2, n % 2 ? DKGRASS : GRASS, { seg: 20 }); }
      ctx.claim(x, z, r);
    }
    P.pokeball(new P.Local(b, 40, 7.2, 40, 0.6, 1), 0, 0, 0, 5); // big Poké Ball on the central hill
    ctx.scatter(110, { minC: 8, maxC: 140, r: 4, test: (x, z) => hole.test(x, z) && !forest.test(x, z) && !mount.test(x, z) }, (x, z) => { if (rand() < 0.7) P.kTree(b, x, z, 1 + rand() * 0.6); else P.grassTuft(b, x, z, 1.2); });
    for (const [x, z, fn, s] of [[-30, 10, P.bulbasaur, 1.3], [90, 60, P.eevee, 1.2], [-100, 30, P.slowpoke, 1.3], [60, -120, P.rattata, 1.2], [0, 100, P.jigglypuff, 1.2], [-60, 160, P.squirtle, 1.2], [150, 0, P.psyduck, 1.2]]) if (ctx.free(x, z, 2)) { P.stamp(b, fn, x, 0, z, rand() * 6, s); ctx.claim(x, z, 2); }
    { const jp = P.fig(P.jigglypuff, 2.2); jp.position.set(40, 7.2, 52); ctx.group.add(jp); motes(ctx, 40, 9, 52, 6, 10, 20, 0xff9ad8, 1.6); anims.push((dt, t) => { jp.rotation.y = 0.2 + Math.sin(t * 0.6) * 0.5; jp.position.y = 7.2 + Math.abs(Math.sin(t * 2)) * 0.4; }); }

    // ---- skyline: distant mountains, clouds, Pidgeot ------------------------------------------------------------
    for (let a = 0; a < Math.PI * 2; a += 0.12) {
      const x = Math.cos(a) * (850 + rand() * 150), z = Math.sin(a) * (850 + rand() * 150);
      if (x < -500 && Math.abs(z) < 600) continue;   // open sea horizon to the west
      const h = 50 + rand() * 110, rad = 70 + rand() * 60, layers = 5;
      for (let n = 0; n < layers; n++) { const f = 1 - n / layers; nb.box(x, n * h / layers, z, rad * f * 2, h / layers, rad * f * 1.7, n === layers - 1 && h > 120 ? C.white : n % 2 ? 0x5a9a5a : 0x4a8a4a, { rot: a + n * 0.2 }); }
    }
    for (let n = 0; n < 22; n++) { const a = rand() * Math.PI * 2, r = 250 + rand() * 450; cloud(nb, Math.cos(a) * r, 90 + rand() * 60, Math.sin(a) * r, 2 + rand() * 2, rand); }
    { const pg = P.pidgey(4); ctx.group.add(pg); anims.push((dt, t) => { const a = t * 0.08; pg.position.set(Math.cos(a) * 260, 75 + Math.sin(t * 0.5) * 6, Math.sin(a) * 200); pg.rotation.y = -a + Math.PI; pg.rotation.z = 0.3; flap(pg, t, 3, 0.5); }); }
  },
};

function pointLight(scene, p, y, col, I, d) { const l = new THREE.PointLight(col, I, d, 1.3); l.position.set(p.x, p.y + y, p.z); scene.add(l); return l; }
