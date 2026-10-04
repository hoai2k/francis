// Blocky Biome Run (Minecraft): start in a plains village (villagers, the bell, farms,
// an iron golem), race across the plains where creepers wander onto the road, through
// a birch and oak forest full of skeleton archers, down a ravine where gravel and anvils
// fall, through a mineshaft with minecarts crossing, then dive through a Nether portal:
// netherrack, a lava jump, ghast fireballs and a Nether fortress bridge, before a
// glide over the lava sea through the return portal into a desert of lit TNT.
import { THREE, BrickBuilder, C, plastic, groundPlane, liquid, disc, strokeTrack, inRange, each, edges, arch, tunnel, canvasTexture } from './kit.js';
import * as P from './minecraft-props.js';

const MC = P.MC, B = 2.4;
const fxOf = (ctx) => ctx.world.race?.fx;
const sfx = (ctx, n, p) => ctx.world.race?.audio.sfx(n, p);
const V1 = new THREE.Vector3();
// deterministic per-cycle random (hazards pick a new spot each cycle)
const angDiff = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const hash = (n, s = 0) => { const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
function ringMarker(ctx, R, color = 0xff2a1a) {
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
  const fillMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.RingGeometry(R - 0.6, R, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2), ringMat));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(R - 0.6, 4, Math.PI / 4).rotateX(-Math.PI / 2), fillMat); g.add(fill);
  ctx.group.add(g);
  return { g, ringMat, fillMat, fill, set(o, f = 1) { ringMat.opacity = o; fillMat.opacity = o * 0.35; fill.scale.setScalar(Math.max(0.01, f)); } };
}
// white flash shell for things about to explode
const flashMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });

// ---- hazards --------------------------------------------------------------------------------

// Creepers wander out of the grass onto the road, stop, hiss and flash white
// (a square marks the blast), then explode. They come back somewhere else.
function creeper(ctx, { from, to, period = 7.6, offset = 0, seed = 0 }) {
  const tr = ctx.track, s = 1.45, u = s / 8, R = 5.2;
  const rig = P.mob('creeper', s); ctx.group.add(rig.root);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(8 * u + 0.15, 20 * u + 0.15, 8 * u + 0.15).translate(0, 16 * u, 0), flashMat()); rig.root.add(shell);
  const mk = ringMarker(ctx, R);
  const pos = new THREE.Vector3(), A = new THREE.Vector3(), Bv = new THREE.Vector3();
  let cycle = -1, state = 0, boomed = false;
  const WALK = 2.6, HISS = 1.7, BOOM = 0.3;
  return {
    pos,
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), ph = tt - n * period;
      if (n !== cycle) {
        cycle = n; boomed = false;
        const k = from + (to - from) * hash(n, seed), i = tr.kToIndex(k), sd = hash(n, seed + 1) < 0.5 ? -1 : 1;
        tr.at(i, sd * (tr.HW[i] + tr.SH[i] + 4), 0, A); tr.at(i, (hash(n, seed + 2) - 0.5) * 1.1 * tr.HW[i], 0, Bv);
      }
      rig.root.visible = ph < WALK + HISS;
      if (ph < WALK) {
        state = 1; const f = Math.min(1, ph / (WALK * 0.85));
        pos.lerpVectors(A, Bv, f); rig.root.rotation.y = Math.atan2(Bv.x - A.x, Bv.z - A.z);
        P.walk(rig, t * 9, f < 1 ? 0.6 : 0); rig.root.scale.setScalar(Math.min(1, ph * 3) || 0.01); shell.material.opacity = 0; mk.set(0);
      } else if (ph < WALK + HISS) {
        state = 2; const f = (ph - WALK) / HISS;
        P.walk(rig, 0, 0);
        shell.material.opacity = Math.sin(t * (10 + f * 26)) > 0 ? 0.75 : 0;
        rig.root.scale.set(1 + f * 0.25 + Math.sin(t * 40) * 0.03, 1 + f * 0.12, 1 + f * 0.25);
        mk.set(0.35 + 0.45 * Math.abs(Math.sin(t * 9)), f);
        rig.head.rotation.y = Math.sin(t * 3) * 0.4;
      } else if (ph < WALK + HISS + BOOM) {
        state = 3; mk.set(0.6, 1);
        if (!boomed) { boomed = true; const fx = fxOf(ctx); if (fx) { fx.explosion(pos); fx.debris(pos.clone().setY(pos.y + 1), [0x5da84a, 0x4a9a3a, MC.dirt], 14, 1.2); } sfx(ctx, 'cannon', pos); }
      } else { state = 0; mk.set(Math.max(0, 0.5 - (ph - WALK - HISS - BOOM))); }
      rig.root.position.copy(pos);
      mk.g.position.set(pos.x, pos.y + 0.12, pos.z);
    },
    test(p) {
      if (!state || Math.abs(p.y - pos.y) > 4) return null;
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (state === 3) return d < R ? 'wreck' : null;
      return d < 1.9 ? 'bump' : null;
    },
    near(p, r) { if (!state) return false; const d = Math.hypot(p.x - pos.x, p.z - pos.z); return d < (state >= 2 ? R : 2) + r; },
  };
}

// Skeleton archers stand at the forest edge: one draws its bow (a red lane lights up
// across the road), then looses a volley of three arrows across it.
function skeletonArcher(ctx, { k, side = 1, period = 4.4, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k), e = tr.HW[i] + tr.SH[i];
  const base = tr.at(i, side * (e + 3), 0); base.y = Math.max(0, tr.surfaceY(i, side * e));
  const rx = -tr.R[i * 2] * side, rz = -tr.R[i * 2 + 1] * side;   // across the road, away from the archer
  const tx = tr.T[i * 3], tz = tr.T[i * 3 + 2];
  const rig = P.mob('skeleton', 1.25); rig.root.position.copy(base); rig.root.rotation.y = Math.atan2(rx, rz); ctx.group.add(rig.root);
  // lane strip following the road surface
  const pos = [], idx = [], SEG = 12, L0 = -(e + 1), L1 = e + 1;
  for (let s = 0; s <= SEG; s++) {
    const lat = (L0 + (L1 - L0) * s / SEG) * -side;
    for (const w of [-0.9, 0.9]) { const p = tr.at(i, lat, 0.13); pos.push(p.x + tx * w, p.y, p.z + tz * w); }
    if (s) { const a = (s - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setIndex(idx);
  const laneMat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  ctx.group.add(new THREE.Mesh(lg, laneMat));
  const ab = new BrickBuilder(1);
  ab.box(0, -0.06, -1.4, 0.12, 0.12, 2.8, 0x6b5233); ab.box(0, -0.15, 1.4, 0.3, 0.3, 0.5, 0x8a8a8a); for (const sd of [-1, 1]) ab.box(sd * 0.15, -0.05, -1.3, 0.2, 0.1, 0.6, 0xf4f4f4);
  const arrowG = ab.build({ name: 'arrow' });
  const arrows = [0, 1, 2].map(() => { const a = arrowG.clone(); a.rotation.y = Math.atan2(rx, rz); a.visible = false; ctx.group.add(a); return a; });
  const start = base.clone().add(V1.set(rx * 1.2, 3.1, rz * 1.2)), len = 2 * e + 9, SPEED = 52, AIM = 1.5, GAP = 0.24;
  let state = 0, shot = -1;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period);
      const fire = period - AIM - 1.3;
      if (ph < fire) { state = 0; laneMat.opacity = 0; rig.armR.rotation.x = -0.2; rig.armL.rotation.x = 0.1; shot = -1; }
      else if (ph < fire + AIM) { state = 1; const f = (ph - fire) / AIM; laneMat.opacity = (0.15 + 0.4 * f) * (0.6 + 0.4 * Math.sin(t * 20)); rig.armR.rotation.x = -1.57 * Math.min(1, f * 2); rig.armL.rotation.x = -1.4 * Math.min(1, f * 2); }
      else { state = 2; laneMat.opacity = 0.45; if (shot < 0) { shot = 0; sfx(ctx, 'hop', base); } }
      for (let n = 0; n < 3; n++) {
        const a = arrows[n], f = state === 2 ? (ph - fire - AIM - n * GAP) * SPEED : -1;
        a.visible = f > 0 && f < len;
        if (a.visible) a.position.set(start.x + rx * f, start.y - f * 0.02, start.z + rz * f);
      }
      rig.head.rotation.y = state ? 0 : Math.sin(t * 0.8) * 0.5;
    },
    test(p) {
      if (state !== 2) return null;
      for (const a of arrows) if (a.visible && Math.hypot(p.x - a.position.x, p.z - a.position.z) < 1.7 && Math.abs(p.y + 1.2 - a.position.y) < 2.2) return 'spin';
      return null;
    },
    near(p, r) {
      if (!state) return false;
      const dx = p.x - base.x, dz = p.z - base.z, al = dx * rx + dz * rz;
      return al > -r && al < len + r && Math.abs(dx * tx + dz * tz) < 2 + r;
    },
  };
}

// Gravel and anvils fall from the ravine ledges: a square shadow grows on the road first.
function fallingBlock(ctx, { targets, period = 3.4, offset = 0, anvil = false }) {
  const tr = ctx.track, R = anvil ? 2.6 : 2.4;
  const bb = new BrickBuilder(1), L = new P.Loc(bb);
  if (anvil) { L.box(0, 0, 0, 3.2, 0.7, 2.2, 0x3a3a3e); L.box(0, 0.7, 0, 1.4, 1.1, 1.2, 0x34343a); L.box(0, 1.8, 0, 4.4, 1.2, 2.0, 0x44444a); L.box(2.4, 2.2, 0, 1.0, 0.6, 1.0, 0x44444a); }
  else { L.box(0, 0, 0, 3.6, 3.6, 3.6, 0x857f7c); for (const [x, y, z] of [[1.81, 1, 0.6], [-1.81, 2.2, -0.8], [0.5, 1.6, 1.81], [-0.8, 0.6, -1.81], [0.6, 2.6, 1.81]]) L.box(x, y, z, Math.abs(x) > 1.8 ? 0.1 : 0.8, 0.6, Math.abs(z) > 1.8 ? 0.1 : 0.8, 0x5a5452); L.studs(0, 3.6, 0, 3.6, 3.6, 2, 0x857f7c); }
  const blk = new THREE.Group(); blk.add(bb.build({ name: anvil ? 'anvil' : 'gravel' })); ctx.group.add(blk);
  const shMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2).rotateX(-Math.PI / 2), shMat); ctx.group.add(sh);
  const mk = ringMarker(ctx, R + 1.2, 0xffa020);
  const target = new THREE.Vector3();
  let cycle = -1, state = 0, landed = false;
  const TEL = 1.5, FALL = 0.55, HIT = 0.3, LIE = 0.9;
  return {
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), ph = tt - n * period;
      if (n !== cycle) { cycle = n; landed = false; const [k, lf] = targets[Math.floor(hash(n, 3 + offset) * targets.length)]; const i = tr.wrap(tr.kToIndex(k) + Math.floor((hash(n, 5) - 0.5) * 14)); tr.at(i, (lf + (hash(n, 7) - 0.5) * 0.5) * tr.HW[i], 0, target); blk.rotation.y = tr.yawAt(i); }
      sh.position.set(target.x, target.y + 0.1, target.z); mk.g.position.copy(sh.position);
      const s0 = period - TEL - FALL - HIT - LIE;
      if (ph < s0) { state = 0; blk.visible = false; shMat.opacity = 0; mk.set(0); }
      else if (ph < s0 + TEL + FALL) {
        state = 1; const f = (ph - s0) / (TEL + FALL);
        shMat.opacity = 0.15 + 0.4 * f; sh.scale.setScalar(0.4 + 0.6 * f); mk.set(0.3 + 0.4 * Math.abs(Math.sin(t * 10)), f);
        const g = Math.max(0, (ph - s0 - TEL) / FALL);
        blk.visible = g > 0; blk.position.set(target.x, target.y + 34 * (1 - g * g), target.z);
      } else if (ph < s0 + TEL + FALL + HIT) {
        state = 2; blk.visible = true; blk.position.copy(target); mk.set(0.6, 1);
        if (!landed) { landed = true; const fx = fxOf(ctx); if (fx) { fx.dust({ pos: target, yaw: 0 }, 0x9a9490, 14); fx.debris(V1.copy(target).setY(target.y + 1), [0x857f7c, 0x5a5452], 8, 0.8); } sfx(ctx, anvil ? 'crash' : 'wall', target); }
      } else { state = 3; const f = (ph - s0 - TEL - FALL - HIT) / LIE; blk.position.set(target.x, target.y - f * f * 4, target.z); shMat.opacity = 0; mk.set(0); }
    },
    test(p) {
      if (state < 2 || Math.abs(p.y - target.y) > 4) return null;
      const d = Math.hypot(p.x - target.x, p.z - target.z);
      if (state === 2) return d < R + 0.6 ? (anvil ? 'wreck' : 'spin') : null;
      return blk.position.y > target.y - 2 && d < R ? 'bump' : null;
    },
    near(p, r) { return state > 0 && Math.hypot(p.x - target.x, p.z - target.z) < R + 1 + r; },
  };
}

// Minecarts roll across the mineshaft on side rails; redstone lamps over the
// openings light up just before one comes through.
function minecartCrossing(ctx, { k, period = 6.4, offset = 0, cargo = null, rider = null, lamps }) {
  const tr = ctx.track, i = tr.kToIndex(k), c = tr.at(i, 0, 0), rx = tr.R[i * 2], rz = tr.R[i * 2 + 1];
  const reach = tr.HW[i] + tr.SH[i] + 5;
  const cart = new THREE.Group(); cart.add(P.minecart(1.35, cargo));
  if (rider) { const rb = new BrickBuilder(1); P.mobStatic(rb, rider, 1.1, 0, rider === 'pig' ? 0.6 : -0.2, 0, 0, rider === 'zombie' ? { armL: [-1.5, 0, 0], armR: [-1.5, 0, 0] } : {}); cart.add(rb.build({ name: 'rider' })); }
  ctx.group.add(cart);
  const pos = new THREE.Vector3();
  let dirS = 1, state = 0, rumble = false;
  const CROSS = 2.3, TEL = 1.4;
  return {
    pos,
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), ph = tt - n * period;
      dirS = n % 2 ? -1 : 1;
      const s0 = period - CROSS - TEL;
      const on = ph > s0;
      for (const l of lamps) l.material = on && (ph > s0 + TEL || Math.sin(t * 16) > 0) ? l.userData.on : l.userData.off;
      if (ph < s0 + TEL) { state = ph > s0 ? 1 : 0; cart.visible = false; rumble = false; return; }
      state = 2;
      const f = (ph - s0 - TEL) / CROSS, lat = dirS * (-reach + 2 * reach * f);
      tr.at(i, lat, 0, pos); cart.position.copy(pos); cart.position.y += Math.abs(Math.sin(t * 14)) * 0.08;
      cart.rotation.y = Math.atan2(rx * dirS, rz * dirS);
      cart.visible = Math.abs(lat) < reach - 1;
      if (!rumble && Math.abs(lat) < reach * 0.7) { rumble = true; sfx(ctx, 'bump', pos); }
    },
    test(p) {
      if (state !== 2 || !cart.visible) return null;
      const dx = p.x - pos.x, dz = p.z - pos.z;
      return Math.abs(dx * rx + dz * rz) < 2.6 && Math.abs(dx * rz - dz * rx) < 2.3 && Math.abs(p.y - pos.y) < 4 ? 'spin' : null;
    },
    near(p, r) { if (!state) return false; const dx = p.x - c.x, dz = p.z - c.z; return Math.abs(dx * rz - dz * rx) < 3 + r; },
  };
}

// Ghasts drift over the Nether: one turns, opens its eyes and mouth (a target square
// flashes on the road), then spits a fireball that explodes where it lands.
function ghast(ctx, { center, radius = 30, height = 32, targets, period = 4.8, offset = 0 }) {
  const tr = ctx.track, s = 6.5, R = 4.4;
  const rig = P.mob('ghast', s); ctx.group.add(rig.root); rig.angry.visible = false;
  const tents = Object.keys(rig).filter((n) => n.startsWith('tent')).map((n) => rig[n]);
  const fb = new THREE.Group();
  fb.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), P.neon(0xff7a10, 2.4)), new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4).rotateY(0.6), P.neon(0xffd040, 2.6)), P.glow(0xff8a20, 9, 0.9));
  fb.visible = false; ctx.group.add(fb);
  const mk = ringMarker(ctx, R);
  const target = new THREE.Vector3(), from = new THREE.Vector3(), gp = new THREE.Vector3();
  let cycle = -1, state = 0, boomed = false;
  const CH = 1.3, FLY = 1.5, BOOM = 0.3;
  return {
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), ph = tt - n * period;
      const a = tt * 0.12 + offset;
      gp.set(center.x + Math.cos(a) * radius, height + Math.sin(tt * 0.7) * 3, center.z + Math.sin(a) * radius * 0.7);
      rig.root.position.copy(gp);
      tents.forEach((g, m) => { g.rotation.x = Math.sin(t * 2.2 + m) * 0.3; g.rotation.z = Math.cos(t * 1.7 + m * 2) * 0.3; });
      if (n !== cycle) { cycle = n; boomed = false; const [k, lf] = targets[Math.floor(hash(n, 11 + offset) * targets.length)]; const i = tr.wrap(tr.kToIndex(k) + Math.floor((hash(n, 13) - 0.5) * 16)); tr.at(i, (lf + (hash(n, 17) - 0.5) * 0.6) * tr.HW[i], 0.12, target); }
      const s0 = period - CH - FLY - BOOM - 0.4;
      const look = Math.atan2(target.x - gp.x, target.z - gp.z);
      rig.root.rotation.y += angDiff((ph > s0 - 0.6 ? look : a + Math.PI / 2) - rig.root.rotation.y) * Math.min(1, dt * 3);
      mk.g.position.copy(target);
      if (ph < s0) { state = 0; rig.face.visible = true; rig.angry.visible = false; fb.visible = false; mk.set(0); }
      else if (ph < s0 + CH) { state = 1; rig.face.visible = false; rig.angry.visible = true; mk.set(0.3 + 0.5 * Math.abs(Math.sin(t * 9)), (ph - s0) / CH); from.copy(gp).add(V1.set(Math.sin(rig.root.rotation.y) * 7, 5, Math.cos(rig.root.rotation.y) * 7)); if (ph - dt < s0) sfx(ctx, 'spin', gp); }
      else if (ph < s0 + CH + FLY) {
        state = 1; rig.face.visible = true; rig.angry.visible = false; const f = (ph - s0 - CH) / FLY;
        fb.visible = true; fb.position.lerpVectors(from, target, f); fb.position.y += Math.sin(f * Math.PI) * 6; fb.rotation.set(t * 5, t * 4, 0);
        mk.set(0.5 + 0.4 * Math.abs(Math.sin(t * 14)), 1);
        if (Math.random() < 0.5) fxOf(ctx)?.spark(fb.position.x, fb.position.y, fb.position.z, (Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3, 0xff9a20, 0.5, 2);
      } else if (ph < s0 + CH + FLY + BOOM) {
        state = 2; fb.visible = false; mk.set(0.7, 1);
        if (!boomed) { boomed = true; fxOf(ctx)?.explosion(target); sfx(ctx, 'cannon', target); }
      } else { state = 0; mk.set(0); }
    },
    test(p) { return state === 2 && Math.hypot(p.x - target.x, p.z - target.z) < R && Math.abs(p.y - target.y) < 5 ? 'wreck' : null; },
    near(p, r) { return state > 0 && Math.hypot(p.x - target.x, p.z - target.z) < R + r; },
  };
}

// TNT blocks on the desert road: one gets lit (flashing white, fuse fizzing,
// a square shows the blast), explodes, and a fresh block drops back in.
function tnt(ctx, { k, latF = 0, period = 6.5, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k), pos = tr.at(i, latF * tr.HW[i], 0), R = 5.4, S = 2.6;
  const g = new THREE.Group(); const bb = new BrickBuilder(1); P.tntBlock(bb, 0, 0, 0, S, tr.yawAt(i)); g.add(bb.build({ name: 'tnt' }));
  const shell = new THREE.Mesh(new THREE.BoxGeometry(S + 0.1, S + 0.1, S + 0.1).translate(0, S / 2, 0), flashMat()); shell.rotation.y = tr.yawAt(i); g.add(shell);
  g.position.copy(pos); ctx.group.add(g);
  const mk = ringMarker(ctx, R); mk.g.position.set(pos.x, pos.y + 0.12, pos.z);
  let state = 0, boomed = false;
  const LIT = 2.2, BOOM = 0.3, GONE = 1.8;
  return {
    pos,
    update(dt, t) {
      const ph = (t + offset) % period, s0 = period - LIT - BOOM - GONE;
      if (ph < s0) { state = 0; boomed = false; g.visible = true; g.scale.setScalar(Math.min(1, ph * 4) || 0.01); g.position.y = pos.y + Math.max(0, 1 - ph * 4) * 6; shell.material.opacity = 0; mk.set(0); }
      else if (ph < s0 + LIT) {
        state = 1; const f = (ph - s0) / LIT; g.position.y = pos.y;
        shell.material.opacity = Math.sin(t * (8 + f * 24)) > 0 ? 0.8 : 0; g.scale.set(1 + f * 0.15, 1 + f * 0.15, 1 + f * 0.15);
        mk.set(0.3 + 0.5 * Math.abs(Math.sin(t * 9)), f);
        if (Math.random() < 0.6) fxOf(ctx)?.spark(pos.x, pos.y + S * 1.1 + 0.3, pos.z, (Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2, Math.random() < 0.5 ? 0xffe060 : 0xffffff, 0.4, 4);
      } else if (ph < s0 + LIT + BOOM) {
        state = 2; g.visible = false; mk.set(0.7, 1);
        if (!boomed) { boomed = true; const fx = fxOf(ctx); if (fx) { fx.explosion(pos); fx.debris(V1.copy(pos).setY(pos.y + 1), [MC.tnt, 0xf4f4f4, MC.sand], 14, 1.2); } sfx(ctx, 'cannon', pos); }
      } else { state = 3; g.visible = false; mk.set(Math.max(0, 0.5 - (ph - s0 - LIT - BOOM))); }
    },
    test(p) {
      if (Math.abs(p.y - pos.y) > 4) return null;
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (state === 2) return d < R ? 'wreck' : null;
      return state < 2 && d < 2.2 ? 'bump' : null;
    },
    near(p, r) { const d = Math.hypot(p.x - pos.x, p.z - pos.z); return state === 3 ? false : d < (state ? R : 2.4) + r; },
  };
}

// ---- builders ---------------------------------------------------------------------------------

// villager house: cobblestone footing, plank walls with log corners, glass, a door and a
// stepped dark-oak roof. Returns its local frame.
function house(b, x, z, w, d, h, rot, { wall = MC.plank, roof = MC.dkplank, corner = MC.log, chimney = false, sign = null } = {}) {
  const L = P.Loc.at(b, x, 0, z, rot), W = w * B, D = d * B, F = B * 0.6, H = h * B;
  L.box(0, 0, 0, W + 0.3, F, D + 0.3, MC.cobble);
  L.box(0, F, 0, W, H, D, wall);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.box(sx * W / 2, 0, sz * D / 2, B * 0.7, F + H, B * 0.7, corner);
  for (const sz of [-1, 1]) L.box(0, F + H - B * 0.45, sz * D / 2, W, B * 0.45, B * 0.5, corner);
  L.tile('door', 0, F + B, D / 2 + 0.03, B, 2 * B);
  for (const sd of [-1, 1]) { L.tile('glass', sd * W * 0.3, F + B * 1.6, D / 2 + 0.03, B * 0.9, B * 0.9); L.tile('glass', sd * W * 0.25, F + B * 1.6, -D / 2 - 0.03, B * 0.9, B * 0.9, Math.PI); L.tile('glass', sd * (W / 2 + 0.03), F + B * 1.6, 0, B * 0.9, B * 0.9, sd * Math.PI / 2); }
  if (sign) L.tile(sign, 0, F + H * 0.75, D / 2 + 0.04, B * 0.9, B * 0.9);
  const steps = d + 1;
  for (let n = 0; n < steps; n++) L.box(0, F + H + n * B * 0.5, 0, W + B * 0.8, B * 0.5, Math.max(B * 0.8, D + B - n * B), roof);
  L.studs(0, F + H + steps * B * 0.5, 0, W + B * 0.8, B, Math.round(w + 1) * 2, roof);
  if (chimney) { L.box(W * 0.3, F + H, -D * 0.2, B, B * (steps * 0.5 + 1.2), B, MC.cobble); }
  return L;
}
function hayBale(b, x, y, z, rot = 0) { const L = P.Loc.at(b, x, y, z, rot); L.box(0, 0, 0, B, B, B, 0xd8b030); for (const yy of [0.25, 0.65]) L.box(0, yy * B, 0, B + 0.06, B * 0.12, B + 0.06, 0x8a6a1a); L.studs(0, B, 0, B, B, 2, 0xd8b030); }
function lantern(b, x, y, z, mat) { b.box(x, y, z, 0.25, 3.2, 0.25, MC.log); b.box(x, y + 3.2, z, 0.9, 0.9, 0.9, 0, { mat }); b.box(x, y + 4.1, z, 1.0, 0.2, 1.0, 0x2a2a2a); }

// ---- the map -------------------------------------------------------------------------------------
export default {
  id: 'minecraft', name: 'Blocky Biome Run', subtitle: 'Creepers, a mineshaft, the Nether and a glide over the lava sea', cup: 'games', seed: 512,
  width: 28, shoulder: 6, edge: 'fence', start: 0.5,
  points: [[-150, 262, 0], [-50, 268, 0], [50, 255, 0], [150, 268, 0], [245, 236, 0], [298, 160, 0], [292, 70, 0], [252, -8, 0], [278, -96, 0], [242, -178, 0], [162, -228, 0], [72, -222, 0], [-12, -250, 0], [-100, -262, 2], [-188, -236, 8], [-250, -176, 15], [-272, -96, 20], [-254, -22, 22], [-262, 52, 13], [-282, 122, 3], [-292, 192, 0], [-240, 250, 0]],
  sections: [
    { from: 20.6, to: 2.4, surface: 'path', shoulder: 7 },
    { from: 2.4, to: 5.4, surface: 'grass', edge: 'open', shoulder: 9, width: 32 },
    { from: 5.4, to: 8.5, surface: 'path', shoulder: 5 },
    { from: 8.5, to: 11.2, surface: 'stone', edge: 'open', shoulder: 2.5 },
    { from: 11.2, to: 15.0, surface: 'netherrack', edge: 'open', shoulder: 4, support: 'bank' },
    { from: 12.95, to: 13.04, gap: true },
    { from: 13.5, to: 15.0, edge: 'wall', shoulder: 2.5 },
    { from: 15.0, to: 17.12, surface: 'netherbrick', edge: 'wall', shoulder: 1.5, support: 'pillar', width: 26 },
    { from: 17.16, to: 18.72, gap: true },
    { from: 18.72, to: 20.6, surface: 'sand', edge: 'open', shoulder: 6, support: 'bank' },
  ],
  items: [1.2, 3.6, 6.2, 8.8, 10.5, 12.3, 14.4, 16.3, 19.4],
  boosts: [[2.0, 0], [4.5, 0.35], [7.3, -0.3], [9.3, 0], [11.15, 0], [13.6, 0], [15.6, -0.3], [16.85, 0], [20.1, 0.3]],
  ramps: [12.86],
  gliders: [17.08],
  studs: [[0.6, -0.4, 8], [2.6, 0.3, 6], [4.0, 0, 8], [5.6, -0.3, 6], [6.9, 0.3, 6], [8.2, 0, 6], [9.9, 0, 8], [11.6, 0.3, 6], [14.0, -0.3, 6], [15.3, 0, 8], [18.9, 0, 6], [20.4, -0.3, 8]],
  theme: {
    sky: [0x4a7ee8, 0xb4d4ff, 0x7aa0d8], fog: [0xbcd8ff, 260, 1200],
    sun: { color: 0xfff4e0, intensity: 2.6, dir: [0.45, 1, 0.3] },
    hemi: [0xe0f0ff, 0x5a7a3a, 1.2], envIntensity: 0.65,
    ground: MC.grass, groundPitch: 1.2, shoulder: 0x6aa844, dust: 0x9a7a4a, plateStud: 1.2,
    road: { base: '#8f7346', line: '#e8d8a8' },
    surfaces: {
      path: { base: '#9a7c48', line: null, seams: 'rgba(60,40,15,0.35)', rough: 0.8 },
      grass: { base: '#a08250', line: '#f4f0c8', seams: 'rgba(60,40,15,0.3)', rough: 0.8, dashed: true },
      stone: { base: '#7c7c7c', line: '#ffd040', seams: 'rgba(30,30,30,0.5)', rough: 0.6, dashed: true },
      netherrack: { base: '#7a2e2e', line: null, seams: 'rgba(40,8,8,0.55)', rough: 0.8 },
      netherbrick: { base: '#3a1c22', line: '#ff8a30', seams: 'rgba(10,0,0,0.6)', rough: 0.6 },
      sand: { base: '#d8c888', line: null, seams: 'rgba(140,120,60,0.35)', rough: 0.9 },
    },
    wall: [MC.nbrick, MC.nbrick2], curb: [C.red, C.white], gate: [MC.log, MC.plank], fence: [MC.plank2, MC.log],
    support: 'bank', pillar: MC.nbrick, pillar2: MC.nbrick2, skirt: ['#7a6a5a', '#4a3a2a'], skirtColor: MC.dirt2,
    rampSide: MC.obsidian, ramp: MC.tnt,
    music: { bpm: 124, root: 60, scale: 'major', style: 'space' },
  },

  decor(ctx) {
    const { b, rand, track: tr, scene } = ctx;
    const nb = ctx.bNoShadow;
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    const spot = (k, lat, r) => {
      const i = K(k), sd = Math.sign(lat) || 1;
      for (let l = Math.abs(lat); l < Math.abs(lat) + 160; l += 2) { const p = tr.at(i, l * sd, 0); if (tr.clearance(p.x, p.z, r + 4) >= r && ctx.free(p.x, p.z, r)) { p.y = 0; return p; } }
      const p = tr.at(i, lat, 0); p.y = 0; return p;
    };
    const roadYaw = (x, z, k) => { const q = tr.at(K(k), 0, 0); return Math.atan2(q.x - x, q.z - z); };
    const anims = [];
    ctx.anim((dt, t) => { for (const f of anims) f(dt, t); });
    const pl = (col, x, y, z, I, d) => { const l = new THREE.PointLight(col, I, d, 1.3); l.position.set(x, y, z); scene.add(l); return l; };
    const lampMat = plastic(0xffd890, { emissive: 0xffb040, emissiveIntensity: 2 });
    const glowMat = plastic(MC.glow, { emissive: 0xffc040, emissiveIntensity: 1.6 });
    const lavaMat = plastic(MC.lava, { emissive: 0xff5000, emissiveIntensity: 1.8 });
    const waterMat = plastic(0x3a6ad8, { trans: true, opacity: 0.8, rough: 0.1 });
    // rigs that wander around a home spot
    const wander = (rig, x, z, r, sp = 1, walkRate = 7, ph = rand() * 6) => {
      rig.root.position.set(x, 0, z); ctx.group.add(rig.root);
      anims.push((dt, t) => {
        const a = (t * 0.25 * sp + ph), mv = Math.sin(t * 0.3 * sp + ph * 2) > -0.2;
        if (mv) { rig.root.position.set(x + Math.cos(a) * r, 0, z + Math.sin(a) * r); rig.root.rotation.y = -a + (sp > 0 ? 0 : Math.PI); }
        P.walk(rig, mv ? t * walkRate : 0, mv ? 0.6 : 0);
        if (rig.head && !mv && rig.leg0) rig.head.rotation.x = 0.5 + Math.sin(t * 3) * 0.1;
        else if (rig.head) rig.head.rotation.x = 0;
      });
      return rig;
    };

    // ---- ground: lava sea + lava river (Nether), pond (plains), netherrack, soul sand, desert sand -------
    const nether = (i) => inRange(tr, i, 11.25, 18.6);
    const glide = (i) => inRange(tr, i, 17.1, 18.78);
    const jumpI = K(13.0);
    const river = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = 'round'; g.beginPath(); const a = tr.at(jumpI, -130, 0), c = tr.at(jumpI, 110, 0); const [x1, y1] = toPx(a.x, a.z), [x2, y2] = toPx(c.x, c.z); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const LAVA = [[-210, 30, 70], [-330, 60, 60], [-220, -50, 45], [-150, 90, 40], [-320, -20, 40]];
    const lavaShape = (g, toPx, sc, pad) => { strokeTrack(g, tr, toPx, sc, 34 + pad, glide); for (const [x, z, r] of LAVA) disc(g, toPx, sc, x, z, r + pad); river(g, toPx, sc, 16 + pad * 2); };
    const POND = [[130, 150, 34], [150, 130, 24]];
    const pondShape = (g, toPx, sc, pad) => { for (const [x, z, r] of POND) disc(g, toPx, sc, x, z, r + pad); };
    const netherShape = (g, toPx, sc) => {
      each(tr, 11.25, 18.6, 3, (i) => { const p = tr.at(i, 0, 0), f = inRange(tr, i, 18.2, 18.6) ? 0.4 : 1; disc(g, toPx, sc, p.x, p.z, edgeLat(i) + 75 * f); });
      for (const [x, z, r] of LAVA) disc(g, toPx, sc, x, z, r + 30);
    };
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048); g.fillStyle = g.strokeStyle = '#000'; lavaShape(g, toPx, sc, 0); pondShape(g, toPx, sc, 0); });
    ctx.cutGround(hole);
    liquid(ctx, ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = g.strokeStyle = '#fff'; lavaShape(g, toPx, sc, 4); }), MC.lava, -1.4, { opacity: 1, emissive: 0xff4a00, speed: 0.015, rough: 0.5 });
    liquid(ctx, ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; pondShape(g, toPx, sc, 4); }), 0x3a6ad8, -1.0, { opacity: 0.85, speed: 0.04 });
    const netherM = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; netherShape(g, toPx, sc); g.globalCompositeOperation = 'destination-out'; g.fillStyle = g.strokeStyle = '#000'; lavaShape(g, toPx, sc, 0); });
    scene.add(groundPlane(MC.netherrack, -0.05, 1600, 1.6, { mask: netherM, rough: 0.9 }));
    const soulM = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; for (const k of [11.9, 14.2, 15.6]) { const i = K(k); for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 28), 0); disc(g, toPx, sc, p.x, p.z, 18); } } });
    scene.add(groundPlane(MC.soul, -0.03, 1600, 1.6, { mask: soulM, rough: 0.95 }));
    const desert = (i) => inRange(tr, i, 18.75, 20.55);
    const sandM = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; each(tr, 18.75, 20.55, 3, (i) => { const p = tr.at(i, 0, 0); disc(g, toPx, sc, p.x, p.z, edgeLat(i) + (inRange(tr, i, 20.2, 20.55) ? 30 : 65)); }); g.globalCompositeOperation = 'destination-out'; g.fillStyle = g.strokeStyle = '#000'; lavaShape(g, toPx, sc, 0); });
    scene.add(groundPlane(MC.sand, -0.02, 1600, 1.6, { mask: sandM, rough: 0.9 }));
    const inNether = (x, z) => netherM.test(x, z) || !hole.test(x, z) && x < -100;
    // themed shoulders where the default grass strip would look wrong
    const shoulderStrip = (a, bk, col) => each(tr, a, bk, 2, (i) => { if (tr.GAP[i] || tr.SH[i] < 0.5) return; for (const sd of [-1, 1]) { const lat = sd * (tr.HW[i] + tr.SH[i] / 2), p = tr.at(i, lat, 0); nb.box(p.x, tr.surfaceY(i, sd * tr.HW[i]) + 0.02, p.z, tr.SH[i] + 0.1, 0.06, 2.6, col, { rot: tr.yawAt(i) }); } });
    shoulderStrip(11.2, 15.0, 0x6a2828); shoulderStrip(18.72, 20.6, 0xcabb78); shoulderStrip(8.5, 11.2, 0x6e6e6e);

    // ---- sky: square sun, drifting block clouds; Nether sky when racing there -----------------------
    { const sunT = canvasTexture(64, 64, (g) => { g.fillStyle = '#fff8c0'; g.fillRect(8, 8, 48, 48); g.fillStyle = '#fffbe0'; g.fillRect(18, 18, 28, 28); });
      const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunT, fog: false, depthWrite: false })); sun.scale.setScalar(110); sun.position.set(560, 620, 380); scene.add(sun);
      const CN = 46, cm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 }), CN);
      cm.frustumCulled = false; scene.add(cm);
      const cl = [...Array(CN)].map(() => ({ x: (rand() - 0.5) * 1600, z: (rand() - 0.5) * 1600, y: 150 + rand() * 40, w: 30 + rand() * 60, d: 20 + rand() * 40 }));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
      anims.push((dt, t) => { cl.forEach((c, n) => { const x = ((c.x + t * 4 + 800) % 1600 + 1600) % 1600 - 800; m4.compose(p3.set(x, c.y, c.z), q, s3.set(c.w, 5, c.d)); cm.setMatrixAt(n, m4); }); cm.instanceMatrix.needsUpdate = true; });
      // Nether palette, eased in while the camera's kart is between the portals
      const w = ctx.world, O = { top: new THREE.Color(0x4a7ee8), hor: new THREE.Color(0xb4d4ff), bot: new THREE.Color(0x7aa0d8), fog: new THREE.Color(0xbcd8ff), hs: new THREE.Color(0xe0f0ff), hg: new THREE.Color(0x5a7a3a), sun: new THREE.Color(0xfff4e0) };
      const N = { top: new THREE.Color(0x2a0606), hor: new THREE.Color(0x8a2a14), bot: new THREE.Color(0x3a0a06), fog: new THREE.Color(0x7a2412), hs: new THREE.Color(0xffa080), hg: new THREE.Color(0x6a1a10), sun: new THREE.Color(0xffa070) };
      let f = 0, li = -1, scan = 0; const loc = {};
      anims.push((dt) => {
        const race = w.race, k = race?.cams?.[0]?.kart;
        let i = -1;
        if (k?.loc) i = k.loc.i;
        else { const fp = race?.tv?.focus; if (fp) { scan -= dt; tr.locate(fp.x, fp.y, fp.z, scan < 0 || li < 0 ? -1 : li, loc, 40); if (scan < 0) scan = 0.5; i = li = loc.i; } }
        const tgt = i >= 0 && inRange(tr, i, 11.28, 18.7) ? 1 : 0;
        if (Math.abs(tgt - f) < 0.002 && (f === 0 || f === 1)) return;
        f += (tgt - f) * Math.min(1, dt * 2.5); if (Math.abs(tgt - f) < 0.002) f = tgt;
        const u = w.sky.material.uniforms; u.top.value.lerpColors(O.top, N.top, f); u.hor.value.lerpColors(O.hor, N.hor, f); u.bot.value.lerpColors(O.bot, N.bot, f);
        scene.fog.color.lerpColors(O.fog, N.fog, f); scene.background?.copy?.(u.hor.value);
        w.hemi.color.lerpColors(O.hs, N.hs, f); w.hemi.groundColor.lerpColors(O.hg, N.hg, f); w.sun.color.lerpColors(O.sun, N.sun, f);
        scene.fog.far = 1200 - f * 500; cm.visible = sun.visible = f < 0.5;
      }); }

    // ---- far mountains: stepped grass/stone/snow ----------------------------------------------------------
    for (let a = 0; a < Math.PI * 2; a += 0.13) {
      const r = 760 + rand() * 180, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 50 + rand() * 110, rad = 60 + rand() * 50, n = 7;
      const hot = inNether(Math.cos(a) * 400, Math.sin(a) * 400) && x < 0 && z < 120;
      for (let m = 0; m < n; m++) { const f = 1 - m / n; nb.box(x, m * h / n, z, rad * f * 2, h / n, rad * f * 1.6, hot ? (m % 2 ? MC.netherrack : MC.netherrack2) : m > n * 0.65 ? MC.snow : m === 0 ? MC.grass : m % 2 ? MC.stone : MC.stone2, { rot: a + m * 0.15 }); }
    }

    // ---- infield: a blocky mountain with spruces and a snowy cap -------------------------------------------------
    { const MX = 30, MZ = 20, MR = 120, S = 8;
      for (let gx = -MR; gx <= MR; gx += S) for (let gz = -MR; gz <= MR; gz += S) {
        const x = MX + gx, z = MZ + gz, d = Math.hypot(gx, gz) / MR + (hash(gx, gz) - 0.5) * 0.12;
        if (d > 1 || tr.clearance(x, z, 20, 6) < 6) continue;
        const h = Math.round((1 - d) * (1 - d) * 15 + hash(gz, gx) * 1.5) * 4;
        if (h < 4) continue;
        const snow = h > 34, top = snow ? MC.snow : MC.grass;
        nb.box(x, 0, z, S, h - 3, S, (gx + gz) % 16 ? MC.stone : MC.stone2);
        nb.box(x, h - 3, z, S, 2.2, S, snow ? MC.stone2 : MC.dirt);
        nb.box(x, h - 0.8, z, S + 0.05, 0.8, S + 0.05, top);
        if (!snow && h > 8 && hash(x, z) < 0.18) P.spruce(nb, x, h, z, 2.2, rand, h > 26);
        else if (!snow && hash(z, x) < 0.06) P.oreBlock(nb, x + S / 2 - 1, h - 6, z, 2.4, [MC.coal, MC.iron, MC.gold][Math.floor(rand() * 3)]);
      }
      ctx.claim(MX, MZ, MR); }

    // ================= VILLAGE ===========================================================================
    arch(ctx, 20.95, { cols: [MC.log, MC.plank], text: 'PLAINS VILLAGE', bg: '#4a3420', fg: '#ffe070' });
    const ROBES = [0x7a4a2a, 0x3a5aa0, 0xf4f4f4, 0x6a2a2a, 0x2a6a3a, 0x8a6a3a];
    const TRIMS = [0xd8b040, null, 0xc03030, 0xf4f4f4, 0x2a2a2a, 0x3a8ad8];
    { const lots = [[21.2, -1], [21.45, 1], [21.7, -1], [21.95, 1], [0.95, -1], [1.2, 1], [1.5, -1], [1.75, 1], [2.05, -1], [0.15, 1], [21.0, 1], [1.95, 1]];
      lots.forEach(([k, sd], n) => {
        const i = K(k), w = 4 + Math.floor(rand() * 2), d = 4, h = 2 + (n % 3 === 0 ? 1 : 0);
        const p = tr.at(i, sd * (edgeLat(i) + d * B / 2 + 4), 0), rot = roadYaw(p.x, p.z, k);
        if (!ctx.free(p.x, p.z, 4)) return;
        ctx.claim(p.x, p.z, w * B * 0.6);
        const sign = [null, 'books', null, 'furnace', null, 'craft'][n % 6];
        house(b, p.x, p.z, w, d, h, rot, { chimney: n % 2 === 0, sign, wall: n % 4 === 3 ? MC.cobble : MC.plank, corner: n % 4 === 3 ? MC.log2 : MC.log });
        lantern(b, p.x + Math.sin(rot) * (d * B / 2 + 1.5) + Math.cos(rot) * 3, 0, p.z + Math.cos(rot) * (d * B / 2 + 1.5) - Math.sin(rot) * 3, lampMat);
      });
      // back rows of houses and the farms
      ctx.scatter(16, { minC: 26, maxC: 70, r: 9, test: (x, z) => z > 190 && x > -320 && x < 90 }, (x, z) => { house(b, x, z, 4 + Math.floor(rand() * 2), 4, 2, roadYaw(x, z, 0.5) + Math.round(rand() * 3) * Math.PI / 2, { chimney: rand() < 0.5 }); });
      ctx.scatter(9, { minC: 18, maxC: 80, r: 12, test: (x, z) => z > 150 && x > -280 && x < 120 }, (x, z) => {
        const rot = Math.round(rand() * 2) * Math.PI / 2, L = P.Loc.at(b, x, 0, z, rot), W = 7 * B, D = 9 * B;
        L.box(0, 0, 0, W + B, 0.6, D + B, MC.log);
        for (let r2 = 0; r2 < 7; r2++) { const xx = (r2 - 3) * B; if (r2 === 3) { L.box(xx, 0.1, 0, B, 0.6, D, 0, { mat: waterMat }); continue; } L.box(xx, 0.1, 0, B * 0.95, 0.7, D, 0x5a3a20);
          const crop = [MC.wheat, MC.wheat2, 0xe08a20, 0x6ab040][Math.floor(hash(x, r2) * 4)];
          for (let c2 = 0; c2 < 9; c2++) for (const o of [-0.3, 0.3]) L.box(xx + o * B, 0.8, (c2 - 4) * B, 0.25, 1.0 + hash(c2, r2) * 0.8, 0.25, crop); }
        L.box(W / 2 + B, 0, -D / 2, B, B, B, MC.plank2);
      });
      // the village bell, a well, hay bales and lamp posts
      { const p = spot(0.5, -10, 4), rot = roadYaw(p.x, p.z, 0.5), L = P.Loc.at(b, p.x, 0, p.z, rot);
        L.box(0, 0, 0, 4 * B, 0.6, 3 * B, MC.cobble); for (const sd of [-1, 1]) L.box(sd * 1.6 * B, 0.6, 0, B * 0.6, 3 * B, B * 0.6, MC.log); L.box(0, 3 * B + 0.6, 0, 3.8 * B, B * 0.6, B * 0.6, MC.log);
        const bell = new THREE.Group(); const bb = new BrickBuilder(1), BL = new P.Loc(bb); BL.box(0, -2.6, 0, 2.4, 2.2, 2.4, 0xf2cd37, { matOpts: { metal: 0.6, rough: 0.25 } }); BL.box(0, -3.1, 0, 3.0, 0.6, 3.0, 0xd8a820, { matOpts: { metal: 0.6, rough: 0.25 } }); BL.box(0, -0.5, 0, 0.5, 0.5, 0.5, 0x3a3a3a);
        bell.add(bb.build({ name: 'bell' })); bell.position.set(p.x, 3 * B + 0.6, p.z); bell.rotation.y = rot; ctx.group.add(bell);
        let rung = -1; anims.push((dt, t) => { const T = t % 9; bell.rotation.x = T < 2 ? Math.sin(T * 9) * 0.5 * (1 - T / 2) : 0; if (T < 0.1 && rung !== Math.floor(t / 9)) { rung = Math.floor(t / 9); sfx(ctx, 'lap', bell.position); } });
        ctx.claim(p.x, p.z, 7); }
      { const p = spot(1.35, 14, 6), L = P.Loc.at(b, p.x, 0, p.z, 0);
        for (const [x, z, w, d] of [[0, 1.5, 4, 1], [0, -1.5, 4, 1], [1.5, 0, 1, 2], [-1.5, 0, 1, 2]]) L.box(x * B, 0, z * B, w * B, B, d * B, MC.cobble);
        L.box(0, 0, 0, 2 * B, B * 0.8, 2 * B, 0, { mat: waterMat });
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.box(sx * 1.5 * B, B, sz * 1.5 * B, 0.4, 2.4 * B, 0.4, MC.plank2);
        L.box(0, 3.4 * B, 0, 4.4 * B, 0.5 * B, 4.4 * B, MC.cobble2); L.box(0, 3.9 * B, 0, 2 * B, 0.5 * B, 2 * B, MC.cobble2); ctx.claim(p.x, p.z, 7); }
      for (const k of [21.35, 0.05, 0.8, 1.6, 2.25]) { const p = spot(k, rand() < 0.5 ? -9 : 9, 3); for (let m = 0; m < 3; m++) hayBale(b, p.x + (m % 2) * B, m === 2 ? B : 0, p.z + (m === 1 ? B : 0), 0); ctx.claim(p.x, p.z, 4); }
      edges(ctx, 20.7, 2.3, 22, 1.2, (p) => lantern(b, p.x, 0, p.z, lampMat));
      // church tower with a cleric, blacksmith with lava and an anvil
      { const p = spot(21.55, -26, 10), rot = roadYaw(p.x, p.z, 21.55), L = P.Loc.at(b, p.x, 0, p.z, rot);
        L.box(0, 0, 0, 4 * B, 5 * B, 4 * B, MC.cobble); L.box(0, 5 * B, 0, 3 * B, 3 * B, 3 * B, MC.cobble2); L.box(0, 8 * B, 0, 3.4 * B, 0.6 * B, 3.4 * B, MC.dkplank); L.box(0, 8.6 * B, 0, 2 * B, B, 2 * B, MC.dkplank);
        for (let m = 0; m < 4; m++) L.tile('glass', Math.sin(m * Math.PI / 2) * (1.5 * B + 0.04), 6.6 * B, Math.cos(m * Math.PI / 2) * (1.5 * B + 0.04), B, 1.6 * B, m * Math.PI / 2);
        L.tile('door', 0, 1.0 * B, 2 * B + 0.04, B, 2 * B); L.box(0, 2.6 * B, 2 * B, 2.2 * B, 0.3 * B, 0.5 * B, MC.cobble2);
        ctx.claim(p.x, p.z, 8); }
      { const p = spot(1.05, -28, 9), rot = roadYaw(p.x, p.z, 1.05), L = house(b, p.x, p.z, 5, 4, 2, rot, { wall: MC.cobble, corner: MC.log2, roof: MC.cobble2, sign: 'furnace' });
        L.box(-1.5 * B, 0, 3.4 * B, 2 * B, 0.7 * B, 1.2 * B, MC.cobble2); L.box(-1.5 * B, 0.25 * B, 3.4 * B, 1.6 * B, 0.5 * B, 0.8 * B, 0, { mat: lavaMat }); L.box(1.5 * B, 0, 3.2 * B, 1.4, 1.0, 1.0, 0x3a3a3e); L.box(1.5 * B, 1.0, 3.2 * B, 2.2, 0.8, 1.2, 0x44444a);
        ctx.claim(p.x, p.z, 9); }
      // villagers bustling about, the iron golem patrolling, Steve and Alex at the start line
      for (let n = 0; n < 9; n++) { const k = [21.1, 21.6, 21.9, 0.0, 0.3, 0.7, 0.9, 1.4, 2.0][n], p = spot(k, (n % 2 ? 1 : -1) * (12 + rand() * 6), 3); const v = P.mob('villager', 1.1, ROBES[n % 6], TRIMS[n % 6]); wander(v, p.x, p.z, 3 + rand() * 3, (n % 2 ? 1 : -1) * (0.6 + rand() * 0.6), 6); }
      { const p = spot(21.8, 14, 5); const g = P.mob('golem', 1.25); wander(g, p.x, p.z, 6, 0.35, 3.5); }
      { const p = spot(0.42, 9, 3); const s = P.mob('steve', 1.3); s.root.position.copy(p); s.root.rotation.y = roadYaw(p.x, p.z, 0.42); ctx.group.add(s.root); anims.push((dt, t) => { s.armR.rotation.x = -2.6 + Math.sin(t * 5) * 0.4; s.armR.rotation.z = 0.3; }); }
      { const p = spot(0.58, 9, 3); const a = P.mob('alex', 1.3); a.root.position.copy(p); a.root.rotation.y = roadYaw(p.x, p.z, 0.58); ctx.group.add(a.root); anims.push((dt, t) => { a.root.position.y = Math.max(0, Math.sin(t * 4)) * 0.8; a.armL.rotation.x = -2.8; a.armR.rotation.x = -2.8; }); }
      for (let n = 0; n < 5; n++) { const p = spot(21.3 + n * 0.5, (n % 2 ? -1 : 1) * 30, 2); const ch = P.mob('chicken', 0.9); wander(ch, p.x, p.z, 2, 1.2, 12); }
      pl(0xffc070, tr.at(K(0.6), 0, 0).x, 18, tr.at(K(0.6), 0, 0).z, 2.4, 160);
    }

    // ================= PLAINS ============================================================================
    arch(ctx, 2.45, { cols: [MC.log, MC.leaves], text: 'PLAINS', bg: '#3a7a2a', fg: '#ffffff' });
    { const FL = [0xd02020, 0xf2cd37, 0x3a6ad8, 0xb060d0, 0xf4f4f4, 0xff8ab0];
      ctx.scatter(260, { minC: 2, maxC: 120, r: 1.4, test: (x, z) => x > 80 && z > 60 && hole.test(x, z) }, (x, z) => (rand() < 0.55 ? P.flower(nb, x, z, FL[Math.floor(rand() * FL.length)], 1.4) : P.tallGrass(nb, x, z, 1.6)));
      ctx.scatter(26, { minC: 10, maxC: 110, r: 7, test: (x, z) => x > 60 && z > 40 && hole.test(x, z) }, (x, z) => P.oak(b, x, 0, z, B, rand));
      // grazing animals: a few animated near the road, more stamped further out
      const kinds = ['sheep', 'cow', 'pig', 'sheep', 'chicken', 'cow'], WOOL = [0xeeeeee, 0xeeeeee, 0x1b1b1b, 0x8a5a3a, 0xf090c0, 0x9a9a9a];
      for (let n = 0; n < 12; n++) { const k = 2.6 + n * 0.24, p = spot(k, (n % 2 ? 1 : -1) * (14 + rand() * 18), 4), kd = kinds[n % 6]; const r = P.mob(kd, kd === 'chicken' ? 0.9 : 1.2, ...(kd === 'sheep' ? [WOOL[n % 6]] : [])); wander(r, p.x, p.z, 2 + rand() * 4, (n % 2 ? 1 : -1) * (0.3 + rand() * 0.3), 6); ctx.claim(p.x, p.z, 4); }
      ctx.scatter(30, { minC: 30, maxC: 120, r: 4, test: (x, z) => x > 60 && z > 40 && hole.test(x, z) }, (x, z) => { const kd = kinds[Math.floor(rand() * 6)]; P.mobStatic(nb, kd, kd === 'chicken' ? 0.9 : 1.2, x, 0, z, rand() * 6.28, kd !== 'chicken' && rand() < 0.5 ? { head: [0.6, 0, 0] } : {}, ...(kd === 'sheep' ? [WOOL[Math.floor(rand() * 6)]] : [])); });
      // fences and a pumpkin patch
      for (const k of [3.1, 4.7]) { const p = spot(k, -26, 9); const L = P.Loc.at(b, p.x, 0, p.z, rand()); for (let n = 0; n < 7; n++) L.printed('pumpkin', (n % 3 - 1) * B * 1.6, 0, (Math.floor(n / 3) - 1) * B * 1.6, B, 0xe0861a); for (let n = 0; n < 16; n++) { const a = n / 16 * Math.PI * 2; L.box(Math.cos(a) * 9, 0, Math.sin(a) * 9, 0.4, 1.8, 0.4, MC.plank2); L.box(Math.cos(a) * 9, 1.2, Math.sin(a) * 9, 0.25, 0.25, 3.6, MC.plank2, { ry: -a }); } ctx.claim(p.x, p.z, 10); }
      // sugar cane around the pond
      for (let n = 0; n < 22; n++) { const a = n / 22 * Math.PI * 2, x = POND[0][0] + Math.cos(a) * 37, z = POND[0][1] + Math.sin(a) * 37; if (!hole.test(x, z) || tr.clearance(x, z, 8) < 3) continue; for (let m = 0; m < 3; m++) nb.box(x, m * 1.4, z, 0.5, 1.35, 0.5, m % 2 ? 0x8ac050 : 0x6aa040); }
      // creepers!
      ctx.hazard(creeper(ctx, { from: 2.8, to: 3.9, period: 7.2, offset: 0, seed: 1 }));
      ctx.hazard(creeper(ctx, { from: 3.6, to: 4.6, period: 7.8, offset: 2.5, seed: 2 }));
      ctx.hazard(creeper(ctx, { from: 4.3, to: 5.3, period: 6.9, offset: 5.0, seed: 3 }));
      for (let n = 0; n < 5; n++) { const p = spot(2.8 + n * 0.55, (n % 2 ? 1 : -1) * 36, 3); P.mobStatic(nb, 'creeper', 1.45, p.x, 0, p.z, roadYaw(p.x, p.z, 2.8 + n * 0.55)); }
    }

    // ================= FOREST ============================================================================
    arch(ctx, 5.45, { cols: [MC.birch, MC.log], text: 'BIRCH FOREST', bg: '#2a5a2a', fg: '#f4f4e0' });
    { const forestM = (x, z) => x > 160 && z < 120 && z > -150;
      edges(ctx, 5.5, 8.4, 5, 2.5, (p) => { if (rand() < 0.8) (rand() < 0.55 ? P.birch : P.oak)(b, p.x + (rand() - 0.5) * 3, 0, p.z + (rand() - 0.5) * 3, B, rand); });
      ctx.scatter(150, { minC: 6, maxC: 140, r: 5, test: forestM }, (x, z) => (rand() < 0.5 ? P.birch : P.oak)(b, x, 0, z, B, rand));
      ctx.scatter(60, { minC: 3, maxC: 60, r: 1.5, test: forestM }, (x, z) => { const red = rand() < 0.5; nb.box(x, 0, z, 0.5, 1.2, 0.5, 0xe8e0d0); nb.box(x, 1.2, z, 1.6, 0.6, 1.6, red ? 0xd02020 : 0x9a6a4a); if (red) for (const [dx, dz] of [[0.5, 0.3], [-0.4, -0.4]]) nb.box(x + dx, 1.8, z + dz, 0.3, 0.05, 0.3, 0xf4f4f4); });
      // a woodcutter (Steve) chopping a tree
      { const p = spot(6.05, 10, 4); P.oak(b, p.x + 3.4, 0, p.z, B, rand); const s = P.mob('steve', 1.25); s.root.position.copy(p); s.root.rotation.y = Math.PI / 2; ctx.group.add(s.root);
        const axe = new BrickBuilder(1); axe.box(0, -2.8, 0.2, 0.2, 2.2, 0.2, MC.log); axe.box(0, -3.0, 0.6, 0.15, 0.8, 0.8, 0x9a9a9a); s.armR.add(axe.build({ name: 'axe' }));
        anims.push((dt, t) => { s.armR.rotation.x = -1.2 - Math.abs(Math.sin(t * 5)) * 1.2; }); ctx.claim(p.x, p.z, 5); }
      // endermen carrying blocks, teleporting about
      for (let n = 0; n < 3; n++) {
        const en = P.mob('enderman', 1.15, n % 2 ? [MC.dirt, MC.grass] : [0xd8c888, 0xd8c888]); ctx.group.add(en.root); en.armL.rotation.x = en.armR.rotation.x = -0.9;
        const motes = P.glow(0xcc55ff, 6, 0.0); ctx.group.add(motes);
        const homes = [0, 1, 2, 3].map(() => spot(6.0 + n * 0.8 + rand() * 0.5, (rand() < 0.5 ? -1 : 1) * (12 + rand() * 20), 3));
        let at = -1;
        anims.push((dt, t) => { const T = t * 0.22 + n * 0.37, m = Math.floor(T) % 4, f = T % 1; if (m !== at) { at = m; en.root.position.copy(homes[m]); en.root.rotation.y = rand() * 6.28; } motes.position.set(en.root.position.x, 4, en.root.position.z); motes.material.opacity = f < 0.12 || f > 0.9 ? 0.9 : 0; en.root.visible = f > 0.05 && f < 0.95; en.head.rotation.y = Math.sin(t * 1.3 + n) * 0.6; });
      }
      // skeleton archers along the trail
      ctx.hazard(skeletonArcher(ctx, { k: 6.0, side: 1, period: 4.2, offset: 0 }));
      ctx.hazard(skeletonArcher(ctx, { k: 6.75, side: -1, period: 4.6, offset: 1.4 }));
      ctx.hazard(skeletonArcher(ctx, { k: 7.5, side: 1, period: 4.4, offset: 2.6 }));
      ctx.hazard(skeletonArcher(ctx, { k: 8.15, side: -1, period: 4.0, offset: 0.8 }));
      for (let n = 0; n < 3; n++) { const p = spot(6.3 + n * 0.7, (n % 2 ? 1 : -1) * 24, 3); P.mobStatic(nb, 'zombie', 1.2, p.x, 0, p.z, roadYaw(p.x, p.z, 6.3 + n * 0.7), { armL: [-1.5, 0, 0], armR: [-1.5, 0, 0] }); }
    }

    // ================= RAVINE ============================================================================
    arch(ctx, 8.42, { cols: [MC.stone, MC.cobble], text: 'RAVINE', bg: '#3a3a3a', fg: '#ffd040' });
    { const ORES = [MC.coal, MC.iron, MC.gold, MC.redstone, MC.lapis, MC.diamond, MC.emerald];
      let n = 0;
      each(tr, 8.5, 9.75, 3, (i) => {
        const yaw = tr.yawAt(i), e = edgeLat(i);
        for (const sd of [-1, 1]) {
          for (let c = 0; c < 4; c++) {
            const lat = sd * (e + 1.5 + c * 3), p = tr.at(i, lat, 0), h = 14 + c * 4 + Math.round(hash(i, c + sd) * 3) * 2;
            b.box(p.x, 0, p.z, 3.2, h - 2, 3.4, (n + c) % 3 ? MC.stone : MC.stone2, { rot: yaw });
            nb.box(p.x, h - 2, p.z, 3.2, 1.4, 3.4, MC.dirt, { rot: yaw }); nb.box(p.x, h - 0.6, p.z, 3.25, 0.6, 3.45, MC.grass, { rot: yaw });
            if (c === 0 && hash(i, sd) < 0.35) { const q = tr.at(i, sd * (e + 0.2), 0); P.oreBlock(nb, q.x, 2 + Math.floor(hash(sd, i) * 4) * 2.4, q.z, 2.4, ORES[Math.floor(hash(i, 9) * ORES.length)], yaw); }
          }
        }
        n++;
      });
      // lava falls and a waterfall down the ravine walls, pools at the bottom
      for (const [k, sd, lava] of [[8.8, 1, true], [9.2, -1, true], [9.5, 1, false], [9.0, -1, false]]) {
        const i = K(k), p = tr.at(i, sd * (edgeLat(i) - 0.25), 0), yaw = tr.yawAt(i);
        nb.box(p.x, 0, p.z, 0.5, 22, 3, 0, { rot: yaw, mat: lava ? lavaMat : waterMat });
        const q = tr.at(i, sd * (edgeLat(i) - 1.4), 0); nb.box(q.x, q.y + 0.02, q.z, 2.4, 0.12, 3.6, 0, { rot: yaw, mat: lava ? lavaMat : waterMat });
        if (lava) pl(0xff6a20, p.x, 6, p.z, 3, 50);
      }
      // falling gravel and anvils
      const T = [[8.7, -0.3], [8.9, 0.3], [9.1, 0], [9.3, -0.35], [9.5, 0.35]];
      ctx.hazard(fallingBlock(ctx, { targets: T, period: 3.2, offset: 0 }));
      ctx.hazard(fallingBlock(ctx, { targets: T, period: 3.7, offset: 1.6, anvil: true }));
      ctx.hazard(fallingBlock(ctx, { targets: T.slice(2), period: 3.4, offset: 2.4 }));
    }

    // ================= MINESHAFT ===========================================================================
    tunnel(ctx, 9.7, 11.12, { wall: MC.stone, roof: MC.plank2, height: 11, lights: 0xffc860, stud: false });
    { const torchM = plastic(0xffd040, { emissive: 0xffa020, emissiveIntensity: 2.6 }), web = plastic(0xf0f0f0, { trans: true, opacity: 0.5 });
      let n = 0;
      each(tr, 9.75, 11.08, 8, (i) => {
        const yaw = tr.yawAt(i), e = edgeLat(i), c = tr.at(i, 0, 0);
        for (const sd of [-1, 1]) { const q = tr.at(i, sd * (e + 0.2), 0); b.box(q.x, q.y, q.z, 0.9, 10.6, 0.9, MC.log, { rot: yaw }); if (n % 2 === 0) P.torch(nb, q.x - tr.R[i * 2] * sd * 0.6, q.y + 5, q.z - tr.R[i * 2 + 1] * sd * 0.6, 1.1, torchM);
          if (n % 3 === 1) for (let m = 0; m < 3; m++) P.Loc.at(nb, q.x, q.y + 9, q.z, yaw).box(-sd * 0.8, 0, 0, 0.08, 1.8, 0.08, 0, { mat: web, rz: sd * (0.5 + m * 0.4) }); }
        b.box(c.x, Math.max(tr.surfaceY(i, -e), tr.surfaceY(i, e)) + 9.6, c.z, 2 * e + 1.2, 0.9, 0.9, MC.plank2, { rot: yaw });
        n++;
      });
      // ore veins in the walls and rails along the shoulders
      each(tr, 9.75, 11.08, 5, (i) => { for (const sd of [-1, 1]) if (hash(i, sd * 3) < 0.4) { const q = tr.at(i, sd * (edgeLat(i) + 0.4), 0); P.oreBlock(nb, q.x, q.y + 1 + Math.floor(hash(sd, i) * 3) * 2.4, q.z, 2.2, [MC.coal, MC.iron, MC.gold, MC.redstone, MC.diamond][Math.floor(hash(i, 1) * 5)], tr.yawAt(i)); } });
      const railM = plastic(0x9a9a9a, { metal: 0.6, rough: 0.35 });
      each(tr, 9.75, 11.08, 2, (i) => { const yaw = tr.yawAt(i); for (const sd of [-1, 1]) { const q = tr.at(i, sd * (tr.HW[i] + 1.3), 0); nb.box(q.x, tr.surfaceY(i, sd * tr.HW[i]) + 0.05, q.z, 2.0, 0.15, 0.4, MC.plank2, { rot: yaw }); for (const r of [-0.6, 0.6]) { const s = tr.at(i, sd * (tr.HW[i] + 1.3 + r), 0); nb.box(s.x, tr.surfaceY(i, sd * tr.HW[i]) + 0.2, s.z, 0.15, 0.15, 2.2, 0, { rot: yaw, mat: railM }); } } });
      // the hill over the mineshaft
      each(tr, 9.7, 11.12, 4, (i) => { const yaw = tr.yawAt(i), e = edgeLat(i); for (const sd of [-1, 1]) for (let c = 0; c < 4; c++) { const p = tr.at(i, sd * (e + 4 + c * 5), 0), h = 13 - c * 2.5 + hash(i, c) * 2; b.box(p.x, 0, p.z, 5.2, h, 4.6, c % 2 ? MC.stone : MC.stone2, { rot: yaw }); nb.box(p.x, h, p.z, 5.2, 0.8, 4.6, MC.grass, { rot: yaw }); } const c = tr.at(i, 0, 0); nb.box(c.x, c.y + 12.5, c.z, 2 * e + 6, 0.8, 4.6, MC.grass, { rot: yaw }); });
      // minecarts crossing on side rails, with redstone lamps over the openings
      const lampOff = plastic(0x6a3a20), lampOn = plastic(0xffb050, { emissive: 0xff8a20, emissiveIntensity: 2.4 });
      [[9.95, 'tnt', null, 6.2, 0], [10.4, null, 'pig', 5.6, 2.1], [10.85, 'chest', 'zombie', 6.6, 4.0]].forEach(([k, cargo, rider, period, off]) => {
        const i = K(k), yaw = tr.yawAt(i), lamps = [];
        for (const sd of [-1, 1]) {
          const q = tr.at(i, sd * (edgeLat(i) + 0.12), 0); nb.box(q.x, q.y, q.z, 0.15, 4.2, 4.6, 0x0a0a0c, { rot: yaw });
          const lm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), lampOff); lm.userData = { on: lampOn, off: lampOff }; lm.position.set(q.x - tr.R[i * 2] * sd * 0.4, q.y + 5.4, q.z - tr.R[i * 2 + 1] * sd * 0.4); lm.rotation.y = yaw; ctx.group.add(lm); lamps.push(lm);
        }
        for (let l = -edgeLat(i) - 1; l < edgeLat(i) + 1; l += 2.2) { const s = tr.at(i, l, 0); nb.box(s.x, s.y + 0.05, s.z, 0.5, 0.12, 2.4, MC.plank2, { rot: yaw }); }
        for (const r of [-0.8, 0.8]) { const ii = tr.wrap(i + Math.round(r)), a = tr.at(ii, -edgeLat(ii) - 1, 0), c2 = tr.at(ii, edgeLat(ii) + 1, 0); const L2 = Math.hypot(c2.x - a.x, c2.z - a.z); nb.box((a.x + c2.x) / 2, Math.max(a.y, c2.y) + 0.15, (a.z + c2.z) / 2, 0.18, 0.18, L2, 0, { rot: Math.atan2(c2.x - a.x, c2.z - a.z), mat: railM }); }
        ctx.hazard(minecartCrossing(ctx, { k, period, offset: off, cargo, rider, lamps }));
      });
      { const c = tr.at(K(10.4), 0, 0); pl(0xffb060, c.x, c.y + 8, c.z, 2.5, 90); }
    }

    // ================= NETHER PORTAL ===========================================================================
    const portal = (k, h, extra = 0) => {
      const i = K(k), yaw = tr.yawAt(i), e = edgeLat(i) + 4 + extra, c = tr.at(i, 0, 0), y0 = Math.min(tr.surfaceY(i, -e), tr.surfaceY(i, e)) - 0.6;
      const L = P.Loc.at(b, c.x, y0, c.z, yaw);
      for (const sd of [-1, 1]) for (let y = 0; y < h; y += 3) L.box(sd * (e + 1.5), y, 0, 3, 3, 3, (y / 3) % 2 ? MC.obsidian : MC.obsidian2);
      for (let x = -e - 3; x < e + 3; x += 3) { L.box(x + 1.5, h, 0, 3, 3, 3, (Math.round(x / 3)) % 2 ? MC.obsidian : MC.obsidian2); }
      L.box(0, -2, 0, 2 * e + 6, 2, 3, MC.obsidian);
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2 * e, h), P.portalMat()); sheet.position.set(c.x, y0 + h / 2, c.z); sheet.rotation.y = yaw; ctx.group.add(sheet);
      const gl = P.glow(0xb050ff, h * 2.4, 0.35); gl.position.copy(sheet.position); ctx.group.add(gl);
      pl(0xb050ff, c.x, y0 + h / 2, c.z, 3, 80);
      return sheet;
    };
    portal(11.27, 18);
    const exitPortal = portal(18.76, 27, 4);
    { const pm = P.portalMat(); anims.push((dt, t) => { pm.map.offset.set(Math.sin(t * 0.7) * 0.2, -t * 0.25); pm.opacity = 0.62 + Math.sin(t * 3) * 0.1; }); void exitPortal; }

    // ================= THE NETHER ===========================================================================
    { // netherrack cliffs and spires with glowstone along the road
      let n = 0;
      each(tr, 11.4, 14.9, 4, (i) => {
        if (tr.GAP[i] || inRange(tr, i, 12.88, 13.1)) return;
        const yaw = tr.yawAt(i), e = edgeLat(i);
        for (const sd of [-1, 1]) {
          if (hash(i, sd) < 0.25) continue;
          const p = tr.at(i, sd * (e + 3 + hash(sd, i) * 6), 0), h = 4 + Math.floor(hash(i, sd * 2) * 4) * 3;
          b.box(p.x, 0, p.z, 3.2, h, 3.2, (n + sd) % 2 ? MC.netherrack : MC.netherrack2, { rot: yaw });
          if (hash(i, 5 + sd) < 0.3) nb.box(p.x, h, p.z, 2.6, 2.6, 2.6, 0, { rot: yaw, mat: glowMat });
          else if (hash(i, 7 + sd) < 0.25) { nb.box(p.x, h, p.z, 1.2, 1.2, 1.2, 0x8a1a1a); nb.box(p.x, h + 1.2, p.z, 0.8, 0.8, 0.8, 0xc02020); }
        }
        n++;
      });
      ctx.scatter(70, { minC: 14, maxC: 120, r: 5, test: (x, z) => netherM.test(x, z) && hole.test(x, z) }, (x, z) => {
        const h = 6 + Math.floor(rand() * 8) * 3, s = 4 + rand() * 4;
        let y = 0; for (let m = 0; y < h; m++) y = b.box(x + (m % 2) * 0.8, y, z, s * (1 - m * 0.08), 3, s * (1 - m * 0.08), m % 2 ? MC.netherrack : MC.netherrack2);
        if (rand() < 0.45) { nb.box(x, y, z, 3, 3, 3, 0, { mat: glowMat }); nb.box(x + 1.5, y - 1.5, z + 1, 1.5, 1.5, 1.5, 0, { mat: glowMat }); }
        else if (rand() < 0.5) { // crimson fungus: stem, red cap, glowing shroomlight
          b.box(x, y, z, 1.6, 7, 1.6, 0xa03a2a); b.box(x, y + 7, z, 7, 2.4, 7, 0x9a1a1a); b.box(x, y + 9.4, z, 4, 1.6, 4, 0x9a1a1a); nb.box(x + 2.5, y + 6.2, z - 2, 1.4, 1.4, 1.4, 0, { mat: plastic(0xffa040, { emissive: 0xff8a20, emissiveIntensity: 1.8 }) });
        } else { b.box(x, y, z, 1.6, 6, 1.6, 0x3a6a6a); b.box(x, y + 6, z, 6, 2.4, 6, 0x1a8a7a); b.box(x, y + 8.4, z, 3.4, 1.4, 3.4, 0x1a8a7a); }
      });
      // soul fire on the soul sand, nether wart
      const soulF = plastic(0x6ae8ff, { emissive: 0x30c8ff, emissiveIntensity: 2.2, trans: true, opacity: 0.8 });
      for (const k of [11.9, 14.2, 15.6]) { const i = K(k); for (const sd of [-1, 1]) { const c = tr.at(i, sd * (edgeLat(i) + 28), 0); for (let m = 0; m < 8; m++) { const a = rand() * 6.28, r = rand() * 13, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (tr.clearance(x, z, 6) < 2) continue; if (m % 2) { nb.box(x, 0, z, 1.0, 1.6, 1.0, 0, { mat: soulF }); nb.box(x, 0, z, 0.5, 2.4, 0.5, 0, { mat: soulF }); } else for (let w2 = 0; w2 < 3; w2++) nb.box(x + w2 * 0.5, 0, z, 0.3, 0.8 + w2 * 0.2, 0.3, 0x8a1a2a); } } }
      // lava falls and lava river by the jump
      for (const k of [12.2, 13.9, 14.6]) { const i = K(k), sd = k === 13.9 ? -1 : 1, p = tr.at(i, sd * (edgeLat(i) + 9), 0); b.box(p.x, 0, p.z, 6, 18, 5, MC.netherrack2, { rot: tr.yawAt(i) }); nb.box(p.x - tr.R[i * 2] * sd * 3.1, 0, p.z - tr.R[i * 2 + 1] * sd * 3.1, 0.5, 18, 2.4, 0, { rot: tr.yawAt(i), mat: lavaMat }); }
      // zombified piglins, magma cubes and a strider
      for (let n = 0; n < 6; n++) { const p = spot(11.6 + n * 0.55, (n % 2 ? 1 : -1) * (12 + rand() * 10), 3); const pg = P.mob('piglin', 1.2); wander(pg, p.x, p.z, 2 + rand() * 3, (n % 2 ? 1 : -1) * 0.5, 5); }
      for (let n = 0; n < 5; n++) {
        const p = spot(12.0 + n * 0.6, (n % 2 ? -1 : 1) * (14 + rand() * 10), 3), s = 1.6 + rand() * 1.4, mg = new THREE.Group(), mb = new BrickBuilder(1);
        for (let m = 0; m < 4; m++) mb.box(0, m * s * 0.5, 0, s * 2, s * 0.42, s * 2, m % 2 ? 0x3a1a10 : 0x5a2010); for (let m = 0; m < 3; m++) mb.box(0, m * s * 0.5 + s * 0.42, 0, s * 1.96, s * 0.08, s * 1.96, 0, { mat: plastic(0xff8a20, { emissive: 0xff6010, emissiveIntensity: 2 }) });
        mb.box(-s * 0.4, s * 1.3, s * 1.01, s * 0.4, s * 0.3, 0.05, 0xffd040); mb.box(s * 0.4, s * 1.3, s * 1.01, s * 0.4, s * 0.3, 0.05, 0xffd040);
        mg.add(mb.build({ name: 'magma' })); mg.position.copy(p); ctx.group.add(mg); const ph = rand() * 6;
        anims.push((dt, t) => { const T = (t * 0.9 + ph) % 1; mg.position.y = Math.sin(T * Math.PI) * 4 * s * 0.5; mg.scale.y = T < 0.1 ? 0.6 + T * 4 : 1; mg.rotation.y = ph + Math.floor(t * 0.9 + ph) * 0.8; });
      }
      pl(0xff6a30, tr.at(K(12.8), 0, 0).x, 16, tr.at(K(12.8), 0, 0).z, 3, 170);
      pl(0xff6a30, tr.at(K(14.5), 0, 0).x, 22, tr.at(K(14.5), 0, 0).z, 3, 170);
      // ghasts and their fireballs
      ctx.hazard(ghast(ctx, { center: tr.at(K(12.3), -45, 0), radius: 22, height: 30, targets: [[11.8, -0.3], [12.3, 0.3], [12.6, 0], [13.5, -0.3]], period: 5.0, offset: 0 }));
      ctx.hazard(ghast(ctx, { center: tr.at(K(14.2), 50, 0), radius: 26, height: 36, targets: [[13.8, 0.3], [14.3, -0.3], [14.8, 0], [15.3, 0.3]], period: 5.4, offset: 2.0 }));
      ctx.hazard(ghast(ctx, { center: tr.at(K(16.0), -55, 0), radius: 24, height: 44, targets: [[15.6, -0.3], [16.0, 0.3], [16.4, 0], [16.8, -0.25]], period: 4.8, offset: 3.4 }));
      for (let n = 0; n < 3; n++) { const gh = P.mob('ghast', 5); ctx.group.add(gh.root); const c0 = [[-120, -40], [-330, -140], [-60, -330]][n]; anims.push((dt, t) => { const a = t * 0.06 + n * 2; gh.root.position.set(c0[0] + Math.cos(a) * 50, 50 + Math.sin(t * 0.5 + n) * 5, c0[1] + Math.sin(a) * 50); gh.root.rotation.y = -a; }); }
    }
    // ---- the fortress bridge ----------------------------------------------------------------------------
    { let n = 0;
      each(tr, 14.9, 17.12, 7, (i) => {
        const yaw = tr.yawAt(i), e = edgeLat(i), c = tr.at(i, 0, 0), top = c.y - 1;
        if (top > 3 && n % 2 === 0) { b.box(c.x, -1.5, c.z, 2 * e + 2, top - 6 + 1.5, 4.4, MC.nbrick, { rot: yaw }); for (let m = 0; m < 3; m++) b.box(c.x, top - 6 + m * 2, c.z, 2 * e + 2 - (2 - m) * 4, 2, 4.4, MC.nbrick2, { rot: yaw }); }
        for (const sd of [-1, 1]) { const q = tr.at(i, sd * (e + 0.2), 0); b.box(q.x, q.y + 1.8, q.z, 0.5, 2.4, 0.5, MC.nbrick2, { rot: yaw }); b.box(q.x, q.y + 3.8, q.z, 0.4, 0.4, 3.6, MC.nbrick2, { rot: yaw }); }
        n++;
      });
      // towers at the bridge entrance, a blaze spawner cage with blazes, wither skeletons on guard
      for (const [k, sd] of [[15.1, -1], [15.1, 1], [16.95, -1], [16.95, 1]]) { const i = K(k), p = tr.at(i, sd * (edgeLat(i) + 4), 0); for (let y = -1.5; y < p.y + 14; y += 3) b.box(p.x, y, p.z, 6, 3, 6, (Math.round(y / 3)) % 2 ? MC.nbrick : MC.nbrick2, { rot: tr.yawAt(i) }); b.box(p.x, p.y + 14, p.z, 7, 1, 7, MC.nbrick2, { rot: tr.yawAt(i) }); nb.box(p.x, p.y + 15, p.z, 2, 2, 2, 0, { mat: glowMat }); }
      for (const k of [15.1, 16.95]) { const i = K(k), c = tr.at(i, 0, 0), e = edgeLat(i) + 7; b.box(c.x, c.y + 11, c.z, 2 * e, 3, 4, MC.nbrick, { rot: tr.yawAt(i) }); for (let n = -3; n <= 3; n++) b.box(c.x + Math.cos(tr.yawAt(i)) * n * e / 3.5, c.y + 14, c.z - Math.sin(tr.yawAt(i)) * n * e / 3.5, 1.4, 1.6, 4, MC.nbrick2, { rot: tr.yawAt(i) }); }
      { const i = K(16.0), p = tr.at(i, -(edgeLat(i) + 26), 0), L = P.Loc.at(b, p.x, 0, p.z, tr.yawAt(i));
        for (let y = 0; y < 14; y += 3) L.box(0, y, 0, 12, 3, 12, (y / 3) % 2 ? MC.nbrick : MC.nbrick2);
        L.printed('spawner', 0, 15, 0, 3.6, 0x1a1a2a); ctx.claim(p.x, p.z, 10);
        for (let m = 0; m < 3; m++) { const bz = P.mob('blaze', 1.4); ctx.group.add(bz.root); const ph = m * 2.1, glo = P.glow(0xffa020, 8, 0.6); bz.root.add(glo); glo.position.y = 1;
          anims.push((dt, t) => { const a = t * 0.5 + ph; bz.root.position.set(p.x + Math.cos(a) * 10, 22 + Math.sin(t * 1.6 + ph) * 2.5, p.z + Math.sin(a) * 10); bz.rods.rotation.y = t * 2; bz.root.rotation.y = -a; }); } }
      for (const k of [15.5, 16.3]) for (const sd of [-1, 1]) { const i = K(k), q = tr.at(i, sd * (edgeLat(i) + 3.2), 0); b.box(q.x, q.y - 1.2, q.z, 5, 1.2, 5, MC.nbrick, { rot: tr.yawAt(i) }); P.mobStatic(b, 'wither', 1.5, q.x, q.y, q.z, tr.yawAt(i) - sd * Math.PI / 2, { armR: [-0.9, 0, 0] }); }
      // lava pouring off the bridge into the sea
      for (const k of [16.4, 16.9]) { const i = K(k), sd = k === 16.4 ? 1 : -1, q = tr.at(i, sd * (edgeLat(i) + 1.2), 0); nb.box(q.x, -1.4, q.z, 1.0, q.y + 1.4, 2.4, 0, { rot: tr.yawAt(i), mat: lavaMat }); }
    }
    // ---- the lava sea under the glide: striders, basalt pillars ------------------------------------------------
    { for (let n = 0; n < 4; n++) { const sb = new BrickBuilder(1), L = new P.Loc(sb); L.box(0, 3.6, 0, 3.8, 3.4, 3.8, 0x9a2a2a); for (const sd of [-1, 1]) L.box(sd * 1.1, 0, 0, 0.6, 3.6, 0.6, 0x5a1a1a); for (let m = 0; m < 6; m++) L.box((m % 3 - 1) * 1.2, 7, Math.floor(m / 3) * 1.2 - 0.6, 0.3, 1.2 + (m % 2) * 0.6, 0.3, 0x3a2a2a); L.box(0, 5, 1.95, 2, 0.8, 0.1, 0x1a1a1a);
        const st = new THREE.Group(); st.add(sb.build({ name: 'strider' })); ctx.group.add(st); const c0 = LAVA[n % LAVA.length];
        anims.push((dt, t) => { const a = t * 0.08 + n * 1.6; st.position.set(c0[0] + Math.cos(a) * c0[2] * 0.5, -1.4 + Math.abs(Math.sin(t * 3 + n)) * 0.3, c0[1] + Math.sin(a) * c0[2] * 0.5); st.rotation.y = -a; }); }
      for (let n = 0; n < 14; n++) { const [cx, cz, r] = LAVA[n % LAVA.length], a = rand() * 6.28, x = cx + Math.cos(a) * r * 0.8, z = cz + Math.sin(a) * r * 0.8; if (tr.clearance(x, z, 12) < 6) continue; const h = 4 + rand() * 14; b.box(x, -1.5, z, 3, h, 3, 0x3a3a40); b.box(x + 1.5, -1.5, z + 0.8, 2.2, h * 0.6, 2.2, 0x2a2a30); }
      ctx.claim(-210, 30, 70); }

    // ================= DESERT ===========================================================================
    arch(ctx, 20.0, { cols: [MC.sandstone, 0xe0861a], text: 'DESERT', bg: '#c89a40', fg: '#ffffff' });
    { const dz = (x, z) => sandM.test(x, z) && hole.test(x, z);
      ctx.scatter(40, { minC: 4, maxC: 90, r: 3, test: dz }, (x, z) => P.cactus(b, x, 0, z, B, rand));
      ctx.scatter(40, { minC: 2, maxC: 90, r: 1.5, test: dz }, (x, z) => { for (let m = 0; m < 4; m++) nb.box(x + (m - 1.5) * 0.4, 0, z, 0.15, 0.8 + (m % 2) * 0.6, 0.15, 0x8a6a3a, { rot: m }); });
      // the desert temple
      { const i = K(19.85), p = tr.at(i, edgeLat(i) + 34, 0), rot = roadYaw(p.x, p.z, 19.85), L = P.Loc.at(b, p.x, 0, p.z, rot);
        for (let m = 0; m < 7; m++) L.box(0, m * B, 0, (16 - m * 2) * B, B, (16 - m * 2) * B, m % 2 ? MC.sandstone : MC.sand2);
        for (const sd2 of [-1, 1]) { for (let m = 0; m < 9; m++) L.box(sd2 * 9 * B, m * B, 9 * B, 3 * B, B, 3 * B, m % 3 === 1 ? 0xe0861a : MC.sandstone); L.box(sd2 * 9 * B, 9 * B, 9 * B, 3.4 * B, 0.8 * B, 3.4 * B, 0xe0861a); L.box(sd2 * 9 * B, 4 * B, 10.55 * B, B, B, 0.1, 0x3a6ad8); }
        L.box(0, 0, 8 * B, 3 * B, 4 * B, 0.6, MC.sandstone); L.box(0, 0, 8.4 * B, 1.6 * B, 2.6 * B, 0.2, 0x2a2010); L.box(0, 4 * B, 8.2 * B, 3 * B, 0.4 * B, 0.6, 0xe0861a);
        ctx.claim(p.x, p.z, 32); }
      // a desert well and husks
      { const p = spot(20.25, -18, 5), L = P.Loc.at(b, p.x, 0, p.z, 0); L.box(0, 0, 0, 5 * B, 0.5 * B, 5 * B, MC.sandstone); for (const [x, z, w, d] of [[0, 1, 3, 1], [0, -1, 3, 1], [1, 0, 1, 1], [-1, 0, 1, 1]]) L.box(x * B, 0.5 * B, z * B, w * B, B, d * B, MC.sandstone); L.box(0, 0.5 * B, 0, B, B * 0.9, B, 0, { mat: waterMat }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.box(sx * B, 1.5 * B, sz * B, 0.5, 2 * B, 0.5, MC.sandstone); L.box(0, 3.5 * B, 0, 3.4 * B, 0.5 * B, 3.4 * B, MC.sand2); ctx.claim(p.x, p.z, 7); }
      for (let n = 0; n < 4; n++) { const p = spot(19.1 + n * 0.4, (n % 2 ? 1 : -1) * (14 + rand() * 12), 3); const h = P.mob('husk', 1.2); h.armL.rotation.x = h.armR.rotation.x = -1.5; h.armsFixed = true; wander(h, p.x, p.z, 3, (n % 2 ? 1 : -1) * 0.4, 5); }
      // TNT on the road (and a stack of it by the temple)
      [[19.2, -0.4, 6.8, 0], [19.5, 0.35, 7.2, 2.3], [19.8, -0.1, 6.4, 4.0], [20.1, 0.45, 7.0, 1.1], [20.35, -0.45, 6.6, 3.2]].forEach(([k, latF, period, offset]) => ctx.hazard(tnt(ctx, { k, latF, period, offset })));
      { const p = spot(19.6, -16, 5); for (let m = 0; m < 6; m++) P.tntBlock(b, p.x + (m % 3 - 1) * 2.7, m >= 3 ? 2.6 : 0, p.z + (m >= 3 ? 0.3 : 0), 2.6, 0); ctx.claim(p.x, p.z, 5); }
    }

    // ---- start straight: a sign of the cup ------------------------------------------------------------
    void C;
  },
};
