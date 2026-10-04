// Track hazards. Maps create them in their decor function through the
// factories below; the race updates them and tests every kart against them.
// Each hazard is { update(dt, t), test(pos) -> 'spin' | 'wreck' | 'bump' | null, near(pos, r) }.
import * as THREE from 'three';
import { BrickBuilder, C, plastic } from './lego.js';

const V = new THREE.Vector3();

// Something that follows a polyline (closed loop or back-and-forth).
export function mover(ctx, { mesh, path, speed = 10, loop = true, oneWay = false, radius = 2.5, kind = 'spin', roll = 0, offset = 0, bob = 0, yOffset = 0 }) {
  ctx.group.add(mesh);
  const pts = path;
  const seg = [];
  let total = 0;
  const n = loop && !oneWay ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const L = a.distanceTo(b); seg.push([a, b, L, total]); total += L; }
  let d = offset * total;
  const pos = new THREE.Vector3();
  const h = {
    pos, radius,
    update(dt, t) {
      d += speed * dt;
      let s = loop || oneWay ? ((d % total) + total) % total : total - Math.abs(((d % (2 * total)) + 2 * total) % (2 * total) - total);
      const forward = loop || oneWay || Math.floor(d / total) % 2 === 0;
      // one-way movers pop in/out at the ends
      if (oneWay) mesh.scale.setScalar(Math.min(1, s / 6, (total - s) / 6) || 0.001);
      let k = seg.length - 1;
      for (let i = 0; i < seg.length; i++) if (s < seg[i][3] + seg[i][2]) { k = i; break; }
      const [a, b, L, s0] = seg[k];
      const f = Math.min(1, (s - s0) / (L || 1));
      pos.lerpVectors(a, b, f);
      mesh.position.copy(pos);
      mesh.position.y += yOffset + (bob ? Math.abs(Math.sin(t * bob)) * 0.4 : 0);
      const dx = (b.x - a.x) * (forward ? 1 : -1), dz = (b.z - a.z) * (forward ? 1 : -1);
      mesh.rotation.y = Math.atan2(dx, dz);
      if (roll && mesh.userData.spin) mesh.userData.spin.rotation.x += (speed * dt) / roll;
    },
    test(p) { return (!oneWay || mesh.scale.x > 0.6) && Math.hypot(p.x - pos.x, p.z - pos.z) < radius + 1.2 && Math.abs(p.y - pos.y) < radius + 1.5 ? kind : null; },
    near(p, r) { return Math.hypot(p.x - pos.x, p.z - pos.z) < radius + r; },
  };
  return h;
}

// A mover driving along the track itself between two k values at a lateral offset.
export function trackMover(ctx, opts) {
  const tr = ctx.track;
  const a = tr.kToIndex(opts.from), b = tr.kToIndex(opts.to ?? opts.from);
  const count = opts.to === undefined ? tr.N : ((b - a + tr.N) % tr.N);
  const path = [];
  for (let o = 0; o <= count; o += 4) {
    const i = tr.wrap(opts.reverse ? a + count - o : a + o);
    path.push(tr.at(i, (opts.lat ?? 0) * tr.HW[i], 0));
  }
  return mover(ctx, { ...opts, path, loop: opts.to === undefined && !opts.oneWay });
}

// Walks back and forth across the road at k (animals, carts...), pausing at each side.
export function crossing(ctx, { mesh, k, speed = 5, radius = 1.8, kind = 'spin', offset = 0, span = 1.25 }) {
  const tr = ctx.track, i = tr.kToIndex(k);
  const w = (tr.HW[i] + tr.SH[i] * 0.6) * span;
  return mover(ctx, { mesh, path: [tr.at(i, -w, 0), tr.at(i, w, 0)], speed, loop: false, radius, kind, offset, bob: 8 });
}

// A vent on the road that bubbles, then erupts.
export function geyser(ctx, { i, lat = 0, period = 5, offset = 0, radius = 2.4, color = 0xff6a10 }) {
  const tr = ctx.track;
  const base = tr.at(i, lat, 0);
  const g = new THREE.Group();
  g.position.copy(base);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, 0.3, 20), plastic(C.black));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.85, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 }));
  pool.position.y = 0.17;
  const colMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.8, transparent: true, opacity: 0.85 });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius * 0.9, 1, 16, 1, true).translate(0, 0.5, 0), colMat);
  column.scale.y = 0.01;
  g.add(ring, pool, column);
  ctx.group.add(g);
  let state = 0;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-0.55 idle, 0.55-0.75 warning, 0.75-1 erupting
      if (ph > 0.75) { state = 2; column.scale.y = 14 * Math.sin((ph - 0.75) / 0.25 * Math.PI); }
      else if (ph > 0.55) { state = 1; column.scale.y = 0.6 + Math.sin(t * 30) * 0.4; }
      else { state = 0; column.scale.y = 0.01; }
      pool.material.emissiveIntensity = state === 1 ? 2 + Math.sin(t * 25) : 1.2;
      if (state >= 1 && Math.random() < 0.4) ctx.world.race?.fx.spark(base.x + (Math.random() - 0.5) * radius, base.y + 0.5, base.z + (Math.random() - 0.5) * radius, 0, 6 + Math.random() * 6, 0, color, 0.6, 12);
    },
    test(p) { return state === 2 && p.y < base.y + column.scale.y && Math.hypot(p.x - base.x, p.z - base.z) < radius + 1 ? 'wreck' : null; },
    near(p, r) { return state >= 1 && Math.hypot(p.x - base.x, p.z - base.z) < radius + r; },
  };
}

// A giant brick that hovers, shakes, then slams onto the road.
export function crusher(ctx, { i, lat = 0, period = 4, offset = 0, size = 6, color = C.dkgray, face = true }) {
  const tr = ctx.track;
  const base = tr.at(i, lat, 0);
  const b = new BrickBuilder(size / 4);
  b.brick(0, 0, 0, 4, 4, 6, color);
  const block = b.build({ name: 'crusher' });
  if (face) {
    const eyes = new BrickBuilder(1);
    for (const sd of [-1, 1]) { eyes.box(sd * size * 0.2, size * 0.3, size / 2 + 0.05, size * 0.16, size * 0.22, 0.1, C.white); eyes.box(sd * size * 0.2, size * 0.32, size / 2 + 0.12, size * 0.07, size * 0.1, 0.1, C.black); }
    eyes.box(0, size * 0.12, size / 2 + 0.05, size * 0.4, size * 0.06, 0.1, C.black);
    block.add(eyes.build());
  }
  const holder = new THREE.Group();
  holder.position.copy(base);
  holder.rotation.y = tr.yawAt(i) + Math.PI;
  holder.add(block);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(size * 0.6, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.position.y = 0.08;
  holder.add(shadow);
  ctx.group.add(holder);
  const topY = 9;
  let h = topY, down = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-0.5 up, 0.5-0.65 shake, 0.65-0.7 slam, 0.7-0.85 down, 0.85-1 rise
      if (ph < 0.5) h = topY;
      else if (ph < 0.65) { h = topY + Math.sin(t * 60) * 0.15; }
      else if (ph < 0.7) h = topY * (1 - (ph - 0.65) / 0.05);
      else if (ph < 0.85) h = 0;
      else h = topY * (ph - 0.85) / 0.15;
      if (h === 0 && !down) { down = true; ctx.world.race?.fx.dust({ pos: base, yaw: 0 }, 0xbbbbbb, 12); ctx.world.race?.audio.sfx('wall', base); }
      if (h > 0) down = false;
      block.position.y = h;
      shadow.material.opacity = 0.15 + 0.35 * (1 - h / topY);
    },
    test(p) { return h < 2.5 && p.y < base.y + 3.5 && Math.abs(p.x - base.x) < size * 0.6 && Math.abs(p.z - base.z) < size * 0.6 ? 'wreck' : null; },
    near(p, r) { return h < topY * 0.6 && Math.hypot(p.x - base.x, p.z - base.z) < size * 0.7 + r; },
  };
}

// A rotating bar of balls/bricks around a centre (fire bar).
export function spinner(ctx, { center, length = 10, speed = 1.2, balls = 6, color = 0xff7a10, glow = true, kind = 'spin', height = 1.2 }) {
  const g = new THREE.Group();
  g.position.copy(center);
  const mat = glow ? new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6 }) : plastic(color);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, height + 0.6, 12), plastic(C.dkgray));
  hub.position.y = (height + 0.6) / 2;
  g.add(hub);
  const arm = new THREE.Group();
  arm.position.y = height;
  for (let k = 0; k < balls; k++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), mat);
    s.position.x = (k + 1) * (length / balls);
    arm.add(s);
  }
  g.add(arm);
  ctx.group.add(g);
  let ang = Math.random() * 6;
  return {
    update(dt) { ang += speed * dt; arm.rotation.y = ang; },
    test(p) {
      const dx = p.x - center.x, dz = p.z - center.z;
      if (Math.abs(p.y - center.y - height) > 2.2) return null;
      const ax = Math.cos(ang), az = -Math.sin(ang);
      const along = dx * ax + dz * az;
      if (along < 0 || along > length + 0.8) return null;
      return Math.abs(-dx * az + dz * ax) < 1.6 ? kind : null;
    },
    near(p, r) { return Math.hypot(p.x - center.x, p.z - center.z) < length + r; },
  };
}

// Periodically lobs a cannonball from a fixed point onto a random target on the road.
export function cannon(ctx, { from, targets, period = 3.5, offset = 0, color = C.black }) {
  const tr = ctx.track;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), plastic(color, { metal: 0.3, rough: 0.4 }));
  ball.castShadow = true;
  const marker = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.2, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.8, depthWrite: false }));
  ctx.group.add(ball, marker);
  let t0 = -offset, target = new THREE.Vector3(), flying = false, boom = 0;
  const FLIGHT = 1.8;
  const pick = () => {
    const [k, latF] = targets[Math.floor(Math.random() * targets.length)];
    const i = tr.kToIndex(k) + Math.floor((Math.random() - 0.5) * 20);
    tr.at(i, (latF + (Math.random() - 0.5) * 0.6) * tr.HW[tr.wrap(i)], 0.1, target);
  };
  return {
    update(dt, t) {
      boom = Math.max(0, boom - dt);
      if (!flying && t - t0 > period) { t0 = t; flying = true; pick(); }
      if (flying) {
        const f = (t - t0) / FLIGHT;
        if (f >= 1) {
          flying = false; boom = 0.25;
          ctx.world.race?.fx.explosion(target);
          ctx.world.race?.audio.sfx('cannon', target);
          ball.visible = false; marker.visible = false;
          return;
        }
        ball.visible = true; marker.visible = true;
        ball.position.lerpVectors(from, target, f);
        ball.position.y += Math.sin(f * Math.PI) * 45;
        marker.position.copy(target);
        marker.scale.setScalar(1.4 - f * 0.6);
        marker.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(t * 12));
      } else { ball.visible = false; marker.visible = false; }
    },
    test(p) { return boom > 0 && p.y < target.y + 4 && Math.hypot(p.x - target.x, p.z - target.z) < 4.2 ? 'wreck' : null; },
    near(p, r) { return flying && Math.hypot(p.x - target.x, p.z - target.z) < 4 + r; },
  };
}

// Race-side manager
export class Hazards {
  constructor(race, list) {
    this.race = race;
    this.list = list;
    this.t = 0;
    this.cool = new Map();
  }
  update(dt) {
    this.t += dt;
    for (const h of this.list) h.update(dt, this.t);
    for (const k of this.race.karts) {
      if (k.respawn > 0) continue;
      const c = (this.cool.get(k) || 0) - dt;
      this.cool.set(k, c);
      if (c > 0) continue;
      const before = this._before ||= new THREE.Vector3();
      for (const h of this.list) {
        before.copy(k.pos);
        const kind = h.test(k.pos);
        if (!kind) continue;
        this.cool.set(k, 1.0);
        // a hazard whose test moves the kart itself (e.g. a swap pad) is an effect, not an obstacle
        if (!k.pos.equals(before)) { if (k.hit(kind) && kind === 'spin') this.knock(k, h, 7); }
        else if (kind === 'spin' && h.pos && h.radius) this.glance(k, h);   // rolling balls, animals, carts
        else this.graded(k, h, kind);
        break;
      }
    }
  }

  // How deep in a hazard's hit zone is p? Probes the hazard's own test() outward in 8 directions
  // (works for any shape: circles, square crushers, a fire bar's arm). Returns { c, ox, oz }: c from
  // 0 (dead centre) to 1 (right at the edge), (ox, oz) the way out through the nearest edge.
  zone(h, p) {
    const q = this._q ||= new THREE.Vector3(), d = [];
    for (let a = 0; a < 8; a++) {
      const dx = Math.cos(a * Math.PI / 4), dz = Math.sin(a * Math.PI / 4);
      let r = 0.35;
      while (r < 10) { q.set(p.x + dx * r, p.y, p.z + dz * r); if (!h.test(q)) break; r += 0.35; }
      d.push(r);
    }
    let m = 0; for (let a = 1; a < 8; a++) if (d[a] < d[m]) m = a;
    const half = (d[m] + d[(m + 4) % 8]) / 2;
    return { c: Math.max(0, Math.min(1, 1 - d[m] / half)), ox: Math.cos(m * Math.PI / 4), oz: Math.sin(m * Math.PI / 4) };
  }

  // Every hit is graded by where in the hazard it lands: square in the middle does the full thing,
  // towards the edge it's a lesser hit, and a clip of the very edge just shoves you out and costs a
  // little speed. So steering away at the last moment pays off.
  graded(k, h, kind) {
    const pro = k.goldenTime > 0 || k.megaTime > 0 || k.bulletTime > 0;
    const { c, ox, oz } = this.zone(h, k.pos);
    const graze = (keep, force, spin = 0) => {
      if (pro || k.invincible || k.shieldBlocks()) return;
      k.cancelDrift();
      const target = k.speed * keep, f = force / k.weight;
      k.shove(ox * f, oz * f, spin * (Math.random() < 0.5 ? -1 : 1));
      k.speed = Math.min(k.speed, target);   // a hit never speeds you up
      k.invuln = Math.max(k.invuln, 0.4);
      k.emote?.('ouch');
      this.race.audio.sfx('bump', k.pos);
      k.player?.rumble(0.5, 200);
    };
    if (kind === 'bump') return graze(0.78 + 0.17 * c, 10 * (1 - 0.4 * c));
    if (kind === 'wreck') {
      if (c < 0.5) { k.hit('wreck'); return; }
      if (c < 0.8) { if (k.hit('spin')) this.knock(k, h, 6, ox, oz); return; }
      return graze(0.75, 9, 1.5);
    }
    if (kind === 'freeze') { if (c < 0.6) k.hit('freeze'); else graze(0.7, 8, 1); return; }
    // 'spin' (and anything else): the core spins you out; the rest is a graze that costs less
    // the nearer the edge
    if (c < 0.45) { if (k.hit(kind)) this.knock(k, h, 6, ox, oz); return; }
    const e = (c - 0.45) / 0.55;
    graze(0.55 + 0.4 * e, 10 * (1 - 0.4 * e), 2.2 * (1 - e));
  }

  // A rolling ball / moving obstacle: hit square in the middle and it stops you (spin-out); clip it
  // towards a side and you're thrown off the other way, spun partly round and slowed (less the
  // nearer the very edge), but keep driving.
  glance(k, h) {
    if (k.invincible || k.megaTime > 0 || k.finishedCoast) return;
    if (k.shieldBlocks()) return;
    const rx = -Math.cos(k.yaw), rz = Math.sin(k.yaw);                    // the kart's right
    const side = ((h.pos.x - k.pos.x) * rx + (h.pos.z - k.pos.z) * rz) / (h.radius + 1.2);
    if (Math.abs(side) < 0.3) {
      if (k.hit('spin')) { k.speed *= 0.3; this.knock(k, h, 4); }
      return;
    }
    const e = Math.min(1, (Math.abs(side) - 0.3) / 0.7);                  // 0 just off centre .. 1 the very edge
    const away = side > 0 ? -1 : 1, f = (11 - 5 * e) / k.weight;         // ball on the right: off to the left
    k.cancelDrift();
    const target = k.speed * (0.45 + 0.5 * e);
    k.shove(rx * away * f, rz * away * f, -away * 3.2 * (1 - 0.6 * e));
    k.speed = Math.min(k.speed, target);
    k.invuln = Math.max(k.invuln, 0.5);
    k.emote?.('ouch');
    this.race.audio.sfx('bump', k.pos);
    k.player?.rumble(0.6 - 0.3 * e, 220);
  }
  // shove a kart away from a hazard (movers expose pos; otherwise off to one side and back a bit)
  knock(k, h, force, ox, oz) {
    let nx, nz;
    if (ox !== undefined) { nx = ox; nz = oz; }
    else if (h.pos) { nx = k.pos.x - h.pos.x; nz = k.pos.z - h.pos.z; }
    else { const side = Math.random() < 0.5 ? 1 : -1; nx = side * Math.cos(k.yaw) - 0.5 * Math.sin(k.yaw); nz = -side * Math.sin(k.yaw) - 0.5 * Math.cos(k.yaw); }
    const L = Math.hypot(nx, nz) || 1, f = force / k.weight;
    k.shove(nx / L * f, nz / L * f);
  }
  near(p, r) { for (const h of this.list) if (h.near(p, r)) return true; return false; }
}
export { V };
