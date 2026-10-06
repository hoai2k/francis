// Simple collision world: oriented boxes, vertical cylinders and ramps on top of an
// optional heightfield. Boxes double as floors (when their top is within step height).
import * as THREE from 'three';

const CELL = 16;

export class Colliders {
  constructor() {
    this.list = [];
    this.dynamic = [];
    this.terrain = null; // (x,z) => height
    this.grid = new Map();
    this.stamp = 0;
    this.water = -Infinity;
  }

  _add(c) {
    c.id = this.list.length;
    c._s = 0;
    this.list.push(c);
    if (c.dynamic) this.dynamic.push(c);
    else this._insert(c);
    return c;
  }
  _insert(c) {
    const r = c.type === 'cyl' ? c.r : Math.hypot(c.hx, c.hz);
    const x0 = Math.floor((c.x - r) / CELL), x1 = Math.floor((c.x + r) / CELL);
    const z0 = Math.floor((c.z - r) / CELL), z1 = Math.floor((c.z + r) / CELL);
    for (let i = x0; i <= x1; i++)
      for (let j = z0; j <= z1; j++) {
        const k = i * 73856 + j;
        let cell = this.grid.get(k);
        if (!cell) this.grid.set(k, (cell = []));
        cell.push(c);
      }
  }
  // box centred at (x,y,z) with half extents, rotated about Y
  box(x, y, z, hx, hy, hz, rot = 0, opts = {}) {
    return this._add({ type: 'box', x, y, z, hx, hy, hz, rot, cos: Math.cos(rot), sin: Math.sin(rot), ...opts });
  }
  // axis-aligned helper from min/max corners
  aabb(x0, y0, z0, x1, y1, z1, opts) {
    return this.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2, 0, opts);
  }
  cyl(x, z, r, y0, y1, opts = {}) {
    return this._add({ type: 'cyl', x, z, r, y0, y1, ...opts });
  }
  // walkable slope rising from y0 (local -z end) to y1 (local +z end)
  ramp(x, z, hx, hz, rot, y0, y1, opts = {}) {
    return this._add({ type: 'ramp', x, z, hx, hz, rot, cos: Math.cos(rot), sin: Math.sin(rot), y0, y1, y: (y0 + y1) / 2, hy: Math.abs(y1 - y0) / 2 + 0.3, ...opts });
  }
  setRot(c, rot) { c.rot = rot; c.cos = Math.cos(rot); c.sin = Math.sin(rot); }

  candidates(x, z, r = 0) {
    this.stamp++;
    const out = [];
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let i = x0; i <= x1; i++)
      for (let j = z0; j <= z1; j++) {
        const cell = this.grid.get(i * 73856 + j);
        if (!cell) continue;
        for (const c of cell) if (c._s !== this.stamp) { c._s = this.stamp; out.push(c); }
      }
    for (const c of this.dynamic) if (!c.disabled) out.push(c);
    return out;
  }

  local(c, x, z) {
    const dx = x - c.x, dz = z - c.z;
    return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos];
  }

  topAt(c, x, z) {
    if (c.disabled) return null;
    if (c.type === 'cyl') {
      return (x - c.x) ** 2 + (z - c.z) ** 2 <= c.r * c.r ? c.y1 : null;
    }
    const [lx, lz] = this.local(c, x, z);
    if (Math.abs(lx) > c.hx || Math.abs(lz) > c.hz) return null;
    if (c.type === 'ramp') return c.y0 + ((lz + c.hz) / (2 * c.hz)) * (c.y1 - c.y0);
    return c.y + c.hy;
  }

  // highest walkable surface under (x,z) not above y+step
  ground(x, z, y, step = 0.55) {
    let best = this.terrain ? this.terrain(x, z) : -Infinity;
    let support = null;
    for (const c of this.candidates(x, z, 0.5)) {
      if (c.noFloor) continue;
      const t = this.topAt(c, x, z);
      if (t != null && t <= y + step && t > best) { best = t; support = c; }
    }
    return { y: best, support };
  }

  // push a vertical cylinder (pos = feet) out of walls; returns true if touched
  resolve(pos, radius, height, step = 0.55) {
    let hit = false;
    for (const c of this.candidates(pos.x, pos.z, radius + 1)) {
      if (c.disabled || c.type === 'ramp' || c.noWall) continue;
      let top, bottom;
      if (c.type === 'cyl') { top = c.y1; bottom = c.y0; } else { top = c.y + c.hy; bottom = c.y - c.hy; }
      if (top <= pos.y + step || bottom >= pos.y + height) continue;
      if (c.type === 'cyl') {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const d = Math.hypot(dx, dz), m = c.r + radius;
        if (d < m) {
          const k = d > 1e-5 ? (m - d) / d : 0;
          pos.x += dx * k; pos.z += dz * k;
          if (d <= 1e-5) pos.x += m;
          hit = true;
        }
        continue;
      }
      const [lx, lz] = this.local(c, pos.x, pos.z);
      const qx = Math.max(-c.hx, Math.min(c.hx, lx));
      const qz = Math.max(-c.hz, Math.min(c.hz, lz));
      let ddx = lx - qx, ddz = lz - qz;
      const d = Math.hypot(ddx, ddz);
      let px = 0, pz = 0;
      if (d > 1e-6) {
        if (d >= radius) continue;
        px = (ddx / d) * (radius - d); pz = (ddz / d) * (radius - d);
      } else {
        // centre inside: push out along the shallowest axis
        const ox = c.hx - Math.abs(lx), oz = c.hz - Math.abs(lz);
        if (ox < oz) px = Math.sign(lx || 1) * (ox + radius);
        else pz = Math.sign(lz || 1) * (oz + radius);
      }
      pos.x += px * c.cos + pz * c.sin;
      pos.z += -px * c.sin + pz * c.cos;
      hit = true;
    }
    return hit;
  }

  // ray against boxes / cylinders (not ramps) and terrain. returns distance or Infinity
  raycast(o, d, maxDist, opts = {}) {
    let best = maxDist;
    const mx = o.x + d.x * maxDist * 0.5, mz = o.z + d.z * maxDist * 0.5;
    const cands = this.candidates(mx, mz, maxDist * 0.5 + 1);
    for (const c of cands) {
      if (c.disabled || (opts.skipThin && c.thin) || c.noRay) continue;
      let t;
      if (c.type === 'cyl') t = rayCyl(o, d, c);
      else if (c.type === 'box') t = rayBox(o, d, c, this);
      else continue;
      if (t != null && t >= 0 && t < best) best = t;
    }
    if (this.terrain) {
      const steps = Math.ceil(best / 1.5);
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * best;
        const y = o.y + d.y * t;
        if (y < this.terrain(o.x + d.x * t, o.z + d.z * t)) {
          best = Math.max(0, t - best / steps * 0.5);
          break;
        }
      }
    }
    return best < maxDist ? best : Infinity;
  }

  // is this point inside any solid?
  solidAt(p) {
    if (this.terrain && p.y < this.terrain(p.x, p.z) - 0.05) return true;
    for (const c of this.candidates(p.x, p.z, 0.5)) {
      if (c.disabled || c.noRay) continue;
      if (c.type === 'cyl') {
        if (p.y > c.y0 && p.y < c.y1 && (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < c.r * c.r) return true;
      } else if (c.type === 'box') {
        if (Math.abs(p.y - c.y) > c.hy) continue;
        const [lx, lz] = this.local(c, p.x, p.z);
        if (Math.abs(lx) < c.hx && Math.abs(lz) < c.hz) return true;
      }
    }
    return false;
  }
}

function rayBox(o, d, c, w) {
  const [lx, lz] = w.local(c, o.x, o.z);
  const dx = d.x * c.cos - d.z * c.sin, dz = d.x * c.sin + d.z * c.cos;
  const ly = o.y - c.y, dy = d.y;
  let tmin = -Infinity, tmax = Infinity;
  const slab = (p, v, h) => {
    if (Math.abs(v) < 1e-8) return p >= -h && p <= h;
    let t1 = (-h - p) / v, t2 = (h - p) / v;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    return tmin <= tmax;
  };
  if (!slab(lx, dx, c.hx) || !slab(ly, dy, c.hy) || !slab(lz, dz, c.hz)) return null;
  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : 0;
}

function rayCyl(o, d, c) {
  const ox = o.x - c.x, oz = o.z - c.z;
  const a = d.x * d.x + d.z * d.z;
  const b = 2 * (ox * d.x + oz * d.z);
  const cc = ox * ox + oz * oz - c.r * c.r;
  if (cc < 0) { // inside
    return o.y > c.y0 && o.y < c.y1 ? 0 : null;
  }
  if (a < 1e-9) return null;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0) return null;
  const y = o.y + d.y * t;
  return y > c.y0 && y < c.y1 ? t : null;
}

export const _v = new THREE.Vector3();
