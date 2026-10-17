// "Where do I go?": one goal at a time, shown everywhere you walk.
//   - the HUD objective line (title + where);
//   - a gold beam and ring at the goal with a spinning chevron;
//   - a gold arrow at the screen edge (with the distance) when the goal is off
//     screen, or a pin over it when it is on screen;
//   - glowing footprints along the walkable way there, from a distance field
//     worked out once per goal over the voxel world (2.5D: it follows the
//     floor the goal stands on, over bridges and up one-block steps).
// In the hub the goal is the next chapter's quest marker (story/questMarkers.js);
// in a mission it is the next thing to do (Mission.updateGuide).
// API: game.tracker.setGoal({ pos, title, where, radius?, feet?, quiet? }) / clear().
import * as THREE from 'three/webgpu';
import { h } from './ui.js';

const STEPS = 26;          // footprints shown ahead of the leader
const GAP = 1.5;           // metres between footprints
const tmp = new THREE.Vector3();
const ARROW = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 6 L34 20 L8 34 L14 20 Z" fill="#ffd84a" stroke="#3a1a5a" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

// Can a sorcerer stand in cell (x, y, z)? Solid below, two blocks of air.
function standable(world, x, y, z) {
  return y > 0 && y < world.sy - 2 && world.solidAt(x + 0.5, y - 0.5, z + 0.5) && !world.solidAt(x + 0.5, y + 0.5, z + 0.5) && !world.solidAt(x + 0.5, y + 1.5, z + 0.5);
}
// Floor near y in column (x, z): y itself, one up, or a few down.
function floorNear(world, x, z, y) {
  if (standable(world, x, y, z)) return y;
  if (standable(world, x, y + 1, z)) return y + 1;
  for (let k = 1; k <= 3; k++) if (standable(world, x, y - k, z)) return y - k;
  return -1;
}

// Distance (in cells) from every reachable column to the goal, flooding out
// from the goal's floor. From a column the walker may climb one block or drop
// up to three on the way to the goal.
export function distanceField(world, goal, radius = 1.5) {
  const W = world.sx, D = world.sz, n = W * D;
  const ys = new Int16Array(n).fill(-1);
  const d = new Float32Array(n).fill(Infinity);
  const q = new Int32Array(n * 2); let qh = 0, qt = 0;
  const r = Math.ceil(radius), gx = Math.floor(goal.x), gz = Math.floor(goal.z), gy = Math.round(goal.y);
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const x = gx + dx, z = gz + dz;
    if (x < 0 || z < 0 || x >= W || z >= D || Math.hypot(dx, dz) > radius + 0.5) continue;
    const y = floorNear(world, x, z, gy); if (y < 0) continue;
    const i = z * W + x; ys[i] = y; d[i] = 0; q[qt++] = i;
  }
  const N = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (qh < qt) {
    const i = q[qh++ % q.length]; const x = i % W, z = (i / W) | 0, y = ys[i];
    for (const [dx, dz, c] of N) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
      const j = nz * W + nx;
      let yj = ys[j];
      if (yj < 0) {
        // the walker comes from j toward i: j may be up to 3 above (a drop) or 1 below (a step up)
        yj = -1;
        for (const k of [0, 1, -1, 2, 3]) if (standable(world, nx, y + k, nz)) { yj = y + k; break; }
        if (yj < 0) continue;
      } else if (yj - y > 3 || y - yj > 1) continue;
      if (dx && dz && (!standable(world, nx, y, z) && !standable(world, x, y, nz))) continue;   // no corner cutting
      const nd = d[i] + c;
      if (nd < d[j] - 1e-3) { d[j] = nd; ys[j] = yj; q[qt++ % q.length] = j; if (qt - qh >= q.length) return { d, ys, W, D }; }
    }
  }
  return { d, ys, W, D };
}
// Walk downhill on the field from (x, z): the cells of the way to the goal.
export function pathFrom(field, x, z, maxLen = 90) {
  const { d, ys, W, D } = field;
  let cx = Math.floor(x), cz = Math.floor(z);
  const at = (a, b) => (a < 0 || b < 0 || a >= W || b >= D ? Infinity : d[b * W + a]);
  if (!isFinite(at(cx, cz))) {
    let best = null, bd = Infinity;
    for (let r = 1; r <= 3 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const v = at(cx + dx, cz + dz); if (v < bd) { bd = v; best = [cx + dx, cz + dz]; } }
    if (!best) return [];
    [cx, cz] = best;
  }
  const out = [];
  for (let i = 0; i < maxLen; i++) {
    out.push([cx + 0.5, ys[cz * W + cx], cz + 0.5]);
    const here = at(cx, cz); if (here <= 0) break;
    let nx = cx, nz = cz, nd = here;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const v = at(cx + dx, cz + dz) + (dx && dz ? 0.01 : 0); if (v < nd) { nd = v; nx = cx + dx; nz = cz + dz; } }
    if (nx === cx && nz === cz) break;
    cx = nx; cz = nz;
  }
  return out;
}

export class Tracker {
  constructor(game) {
    this.game = game; this.goal = null; this.field = null; this.t = 0; this.pathT = 0; this.path = [];
    this.layer = h('div', { class: 'trk-layer', 'aria-hidden': 'true' });
    this.arrow = h('div', { class: 'trk-arrow hidden' }, h('span', { class: 'ic', html: ARROW }), h('span', { class: 'dist' }));
    this.pin = h('div', { class: 'trk-pin hidden' }, h('span', { class: 'chev' }, '▼'), h('span', { class: 'dist' }));
    this.layer.append(this.arrow, this.pin);
    document.body.appendChild(this.layer);
    const gold = new THREE.Color(0xffd84a);
    const add = (o) => { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; return o; };
    this.group = new THREE.Group(); this.group.visible = false;
    this.beam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 18, 14, 1, true).translate(0, 9, 0),
      new THREE.MeshBasicNodeMaterial({ color: gold.clone().multiplyScalar(1.5), transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })));
    this.ring = add(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 6, 40).rotateX(Math.PI / 2),
      new THREE.MeshBasicNodeMaterial({ color: gold.clone().multiplyScalar(2.2), transparent: true, opacity: 0.9, depthWrite: false })));
    this.ring.position.y = 0.08;
    this.ring2 = add(new THREE.Mesh(new THREE.RingGeometry(0.2, 1.4, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicNodeMaterial({ color: gold.clone().multiplyScalar(1.2), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending })));
    this.ring2.position.y = 0.06;
    this.chev = add(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 4).rotateX(Math.PI), new THREE.MeshBasicNodeMaterial({ color: gold.clone().multiplyScalar(2.4) })));
    this.group.add(this.beam, this.ring, this.ring2, this.chev);
    this.feet = add(new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.03, 0.42), new THREE.MeshBasicNodeMaterial({ color: 0xffffff }), STEPS));
    this.feet.count = 0; this.feet.visible = false;
    for (let i = 0; i < STEPS; i++) this.feet.setColorAt(i, gold);
    this.col = new THREE.Color();
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.s = new THREE.Vector3(1, 1, 1);
  }
  // goal: { pos (Vector3 on the floor), title, where (or desc), radius,
  //   feet (false: no footprints), quiet (true: leave the HUD objective alone),
  //   beam (false: no beam/ring: the goal has its own), pinY (pin height) }
  setGoal(goal) {
    const g = this.game;
    this.goal = goal || null;
    this.field = null; this.path = []; this.pathT = 0;
    if (!goal || !goal.pos) { this.goal = null; this.hide(); return; }
    if (!goal.quiet && goal.title) g.hud?.setObjective(goal.title, goal.where ?? goal.desc ?? '');
    this.reattach();
    this.group.position.copy(goal.pos);
    this.fieldWorld = g.world;
    try { if (goal.feet !== false && g.world) this.field = distanceField(g.world, goal.pos, goal.radius ?? 1.5); } catch (e) { console.warn('tracker', e); this.field = null; }
  }
  clear() { this.setGoal(null); }
  hide() { this.group.visible = false; this.feet.visible = false; this.arrow.classList.add('hidden'); this.pin.classList.add('hidden'); }
  // a level change rebuilds the scene contents: put the beam back
  reattach() { const s = this.game.scene; if (this.group.parent !== s) s.add(this.group); if (this.feet.parent !== s) s.add(this.feet); }
  leader() { return this.game.players.find((p) => !p.dead && !p.downed) ?? null; }
  visible() {
    const g = this.game;
    if (!this.goal || g.state !== 'playing') return false;
    if (g.ui?.active || g.cutscene || g.cutscenes?.active || g.cutscenes?.playing) return false;
    if (document.getElementById('hud')?.classList.contains('hidden')) return false;
    return true;
  }
  update(dt) {
    const g = this.game, goal = this.goal;
    if (goal && this.fieldWorld !== g.world) { this.hide(); return; }   // a goal from another level (or a cutscene set is showing)
    if (!this.visible()) { this.hide(); return; }
    const lead = this.leader(); if (!lead) { this.hide(); return; }
    this.reattach();
    const still = reduced();
    this.t += dt;
    this.group.visible = true;
    this.beam.visible = this.ring.visible = this.ring2.visible = goal.beam !== false;
    this.chev.position.y = 4.4 + (still ? 0 : Math.sin(this.t * 2.6) * 0.25);
    this.chev.rotation.y = still ? 0 : this.t * 1.4;
    const pulse = still ? 1 : 1 + Math.sin(this.t * 3) * 0.06;
    this.ring.scale.setScalar(pulse);
    this.ring2.material.opacity = still ? 0.25 : 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(this.t * 3));
    const dist = Math.hypot(goal.pos.x - lead.pos.x, goal.pos.z - lead.pos.z);
    this.beam.material.opacity = Math.min(0.24, 0.08 + dist * 0.008);
    this.pathT -= dt;
    if (this.pathT <= 0 && this.field) { this.pathT = 0.35; this.path = pathFrom(this.field, lead.pos.x, lead.pos.z, 110); }
    // no way there (a gate was still shut, a bridge just formed): work the way out again now and then
    this.refieldT = (this.refieldT ?? 0) - dt;
    if (this.field && !this.path.length && dist > 5 && this.refieldT <= 0 && goal.feet !== false) {
      this.refieldT = 2;
      try { this.field = distanceField(g.world, goal.pos, goal.radius ?? 1.5); } catch (e) { /* keep the old one */ }
    }
    if (goal.feet === false || !this.field) this.feet.visible = false; else this.drawFeet(dist, still);
    // screen: a pin over the goal, or an arrow at the edge
    const cam = g.rig.camera;
    tmp.copy(goal.pos).setY(goal.pos.y + (goal.pinY ?? 3.4)).project(cam);
    const behind = tmp.z > 1;
    const sw = window.innerWidth, sh = window.innerHeight;
    let sx = (tmp.x * 0.5 + 0.5) * sw, sy = (-tmp.y * 0.5 + 0.5) * sh;
    if (behind) { sx = sw - sx; sy = sh - sy; }
    const m = 48, mt = 90, mb = 130;
    const label = dist < 3 ? '' : `${Math.round(dist)} m`;
    if (!behind && sx > m && sx < sw - m && sy > mt && sy < sh - mb) {
      this.arrow.classList.add('hidden'); this.pin.classList.remove('hidden');
      this.pin.style.transform = `translate(${sx.toFixed(0)}px, ${sy.toFixed(0)}px)`;
      const dl = this.pin.lastChild; if (dl.textContent !== label) dl.textContent = label;
    } else {
      this.pin.classList.add('hidden'); this.arrow.classList.remove('hidden');
      const cx = sw / 2, cy = sh / 2; let dx = sx - cx, dy = sy - cy;
      if (Math.hypot(dx, dy) < 1) dy = -1;
      const k = Math.min((cx - m) / Math.abs(dx || 1e-6), (dy < 0 ? cy - mt : cy - mb) / Math.abs(dy || 1e-6));
      const ax = cx + dx * k, ay = cy + dy * k, ang = Math.atan2(dy, dx);
      this.arrow.style.transform = `translate(${ax.toFixed(0)}px, ${ay.toFixed(0)}px)`;
      this.arrow.firstChild.style.transform = `rotate(${ang.toFixed(3)}rad)`;
      const dl = this.arrow.lastChild; if (dl.textContent !== label) dl.textContent = label;
    }
  }
  drawFeet(dist, still) {
    const path = this.path;
    if (!path.length || dist < 5) { this.feet.visible = false; return; }
    this.feet.visible = true;
    let n = 0, carry = 1.4, side = 1;
    for (let i = 1; i < path.length && n < STEPS; i++) {
      const [ax, ay, az] = path[i - 1], [bx, by, bz] = path[i];
      const L = Math.hypot(bx - ax, bz - az); if (L < 1e-4) continue;
      let t = carry;
      while (t <= L && n < STEPS) {
        const f = t / L, x = ax + (bx - ax) * f, z = az + (bz - az) * f, y = f < 0.5 ? ay : by;
        const yaw = Math.atan2(bx - ax, bz - az);
        const ox = Math.cos(yaw) * 0.16 * side, oz = -Math.sin(yaw) * 0.16 * side;
        this.e.set(0, yaw, 0); this.q.setFromEuler(this.e);
        this.m4.compose(tmp.set(x + ox, y + 0.04, z + oz), this.q, this.s);
        this.feet.setMatrixAt(n, this.m4);
        const a = still ? 0.9 : 0.55 + 0.75 * Math.max(0, Math.sin(this.t * 4 - n * 0.55));
        const fade = 0.55 + 0.45 * Math.min(1, (STEPS - n) / 6);
        this.feet.setColorAt(n, this.col.setRGB(1.0 * a * fade, 0.62 * a * fade, 0.08 * a * fade));
        n++; side = -side; t += GAP;
      }
      carry = t - L;
    }
    this.feet.count = n;
    this.feet.instanceMatrix.needsUpdate = true;
    if (this.feet.instanceColor) this.feet.instanceColor.needsUpdate = true;
  }
}
