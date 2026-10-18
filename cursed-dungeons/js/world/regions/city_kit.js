// City kit: the street-level toolkit Shibuya and Shinjuku are built with
// (shared; any city region can use it). Works on a RegionBuilder R.
//   street(R, pts, { width, walk, block, walkBlock, line, crowd, y, step })
//       asphalt road (R.road) + paved sidewalks either side + the crowd's sidewalk paths
//   band(R, pts, r0, r1, block)          paint ground cells between r0 and r1 from a polyline
//   rect(R, x0, z0, x1, z1, block, alt, p)   paint the ground in a rectangle
//   zebra(R, p0, p1, width)               crosswalk stripes from p0 to p1
//   tower(R, x0, z0, w, d, h, o)          a solid skyscraper (window grid, setbacks, crown,
//                                         hollow floors, a slice plane for cut buildings)
//   crater(R, cx, cz, r, depth, o)        a blast crater (scorched, rubble rim)
//   slash(R, p0, p1, o)                   a Malevolent Shrine cleave: a scorched groove that
//                                         also cuts through anything standing on it
//   rubble(R, cx, cz, r, n)               broken concrete and debris
//   car(R, x, z, yaw, color) / bin / planter / bench / vending
//   sign(R, x, y, z, lines, o)            a lit sign (canvas text) facing yaw
//   neonBar(R, x, y0, z, h, block)        a vertical neon strip
//   viaduct(R, pts, { y, width, rail })   an elevated deck on pillars (rail lines, expressways)
import * as THREE from 'three/webgpu';
import { B } from './common.js';
import { BLOCKS } from '../blocks.js';
import { signMesh } from './common.js';

// how far north-west of a tall building a player can stand and still be hidden by it
export const CUT_REACH = 11;
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return [Math.hypot(px - (ax + dx * t), pz - (az + dz * t)), t];
}
const offsetLine = (pts, off) => pts.map((p, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  return [p[0] - dz / l * off, p[1] + dx / l * off];
});

// paint the top block of every cell whose distance to the polyline is in (r0, r1]
export function band(R, pts, r0, r1, block, o = {}) {
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r1 - 1)), x1 = Math.min(R.sx - 1, Math.ceil(Math.max(ax, bx) + r1 + 1));
    const z0 = Math.max(0, Math.floor(Math.min(az, bz) - r1 - 1)), z1 = Math.min(R.sz - 1, Math.ceil(Math.max(az, bz) + r1 + 1));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const [d] = segDist(x + 0.5, z + 0.5, ax, az, bx, bz);
      if (d <= r0 || d > r1) continue;
      const i = R.i(x, z);
      if (R.roadId[i] && !o.over) continue;
      if (R.lock[i] === 2 && !o.over) continue;
      R.world.setRaw(x, R.hAt(x, z) - 1, z, typeof block === 'function' ? block(x, z) : block);
      if (!R.lock[i]) R.lock[i] = 1;
    }
  }
}
export function rect(R, x0, z0, x1, z1, block, alt = null, p = 0.15) {
  for (let z = Math.max(0, z0); z <= Math.min(R.sz - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(R.sx - 1, x1); x++) {
    R.world.setRaw(x, R.hAt(x, z) - 1, z, alt && R.chance(p) ? alt : (typeof block === 'function' ? block(x, z) : block));
    const i = R.i(x, z); if (!R.lock[i]) R.lock[i] = 1;
  }
}
// A city street: plan before the terrain (R.road), paint after paveRoads (street.paint()).
export function street(R, pts, o = {}) {
  const width = o.width ?? 8, walk = o.walk ?? 3;
  R.road(pts, { width, block: o.block ?? B.asphalt, alt: o.alt ?? null, altP: o.altP ?? 0.05, y: o.y ?? R.base, line: o.line === false ? null : (o.line ?? B.asphalt_line) });
  const s = { pts, width, walk, o };
  (R.streets ??= []).push(s);
  if (o.crowd && walk > 0) {
    const off = width / 2 + walk / 2;
    const trim = (line) => { const a = line[0], b = line[line.length - 1]; const t0 = o.trim0 ?? 0, t1 = o.trim1 ?? 0; const pa = line[1] ?? b, pb = line[line.length - 2] ?? a; const la = Math.hypot(pa[0] - a[0], pa[1] - a[1]) || 1, lb = Math.hypot(pb[0] - b[0], pb[1] - b[1]) || 1; const L = line.slice(); L[0] = [a[0] + (pa[0] - a[0]) / la * t0, a[1] + (pa[1] - a[1]) / la * t0]; L[L.length - 1] = [b[0] + (pb[0] - b[0]) / lb * t1, b[1] + (pb[1] - b[1]) / lb * t1]; return L; };
    for (const sd of [-1, 1]) if (o.sides === undefined || o.sides === sd) o.crowd.path(trim(offsetLine(pts, sd * off)), { width: walk - 0.6, step: o.step ?? 8, weight: o.weight ?? 1 });
  }
  return s;
}
// after paveRoads: paint every street's sidewalks (kerb + paving)
export function paintStreets(R) {
  for (const s of R.streets ?? []) {
    if (!s.walk) continue;
    const hw = s.width / 2;
    band(R, s.pts, hw - 0.01, hw + 0.75, s.o.kerb ?? B.stone_brick);
    band(R, s.pts, hw + 0.75, hw + s.walk, s.o.walkBlock ?? ((x, z) => ((x + z) % 7 === 0 ? B.stone_brick : B.concrete)));
  }
}
// crosswalk stripes (piano keys) from p0 to p1
export function zebra(R, p0, p1, width = 4, block = B.marble) {
  const [ax, az] = p0, [bx, bz] = p1, dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  const hw = width / 2;
  for (let z = Math.floor(Math.min(az, bz) - hw - 1); z <= Math.ceil(Math.max(az, bz) + hw + 1); z++) for (let x = Math.floor(Math.min(ax, bx) - hw - 1); x <= Math.ceil(Math.max(ax, bx) + hw + 1); x++) {
    if (!R.in(x, z)) continue;
    const px = x + 0.5 - ax, pz = z + 0.5 - az, t = px * ux + pz * uz, s = -px * uz + pz * ux;
    if (t < 0.5 || t > L - 0.5 || Math.abs(s) > hw) continue;
    const id = R.world.get(x, R.hAt(x, z) - 1, z);
    if (id !== B.asphalt && id !== B.asphalt_line && id !== block) continue;
    if (Math.floor(t * 0.999 / 1) % 2 === 0) R.world.setRaw(x, R.hAt(x, z) - 1, z, block);
  }
}

// ---------------------------------------------------------------- towers
// A skyscraper standing on (x0, z0) w × d, h blocks tall. o: { y, wall, glass, glass2, trim,
// col (mullion spacing), lit (0..1 lit windows), band (floor height), setbacks: [[fromH, inset]…],
// crown: 'helipad'|'antenna'|'spire'|'tank'|'pyramid'|'none', hollow, slice: { p: [x,y,z], n: [x,y,z] },
// base: podium storeys with shop glass, round: corner chamfer }
export function tower(R, x0, z0, w, d, h, o = {}) {
  const W = R.world, x1 = x0 + w - 1, z1 = z0 + d - 1;
  const y = o.y ?? R.hAt(x0 + (w >> 1), z0 + (d >> 1));
  const top = Math.min(R.sy - 4, y + h);
  const wall = o.wall ?? B.concrete, trim = o.trim ?? B.concrete_pillar, g1 = o.glass ?? B.window, g2 = o.glass2 ?? B.window_dark;
  const col = o.col ?? 3, fb = o.band ?? 4, lit = o.lit ?? 0.45, base = o.base ?? 1;
  const seed = (x0 * 73856093) ^ (z0 * 19349663);
  const lit01 = (a, b) => { let k = (a * 374761393 + b * 668265263 + seed) | 0; k = (k ^ (k >>> 13)) * 1274126177; return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
  const sb = (o.setbacks ?? []).slice().sort((a, b) => a[0] - b[0]);
  const insetAt = (hh) => { let k = 0; for (const [at, ins] of sb) if (hh >= at) k = ins; return k; };
  const ch = o.round ?? 0;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { W.column(x, z, y - 6, y - 1, B.stone); W.setRaw(x, y - 1, z, o.floor ?? B.polished); for (let yy = y; yy <= top + 8 && yy < R.sy; yy++) W.setRaw(x, yy, z, 0); }
  for (let yy = y; yy < top; yy++) {
    const hh = yy - y, ins = insetAt(hh), a0 = x0 + ins, a1 = x1 - ins, b0 = z0 + ins, b1 = z1 - ins;
    if (a1 - a0 < 2 || b1 - b0 < 2) break;
    const lvl = hh % fb, floor = Math.floor(hh / fb);
    const podium = floor < base;
    const face = (t, len) => {
      if (t === 0 || t === len) return trim;
      if (podium) return lvl === fb - 1 ? (o.band2 ?? wall) : (t % 4 === 0 ? trim : (lvl < fb - 1 ? (o.shop ?? B.window) : wall));
      if (t % col === 0) return o.mullion ?? trim;
      if (lvl === 0) return o.bandBlock ?? wall;
      return lit01(t + (len << 8), floor) < lit ? g1 : g2;
    };
    const solid = !o.hollow;
    for (let z = b0; z <= b1; z++) for (let x = a0; x <= a1; x++) {
      const edgeX = x === a0 || x === a1, edgeZ = z === b0 || z === b1;
      if (ch) { const cx = Math.min(x - a0, a1 - x), cz = Math.min(z - b0, b1 - z); if (cx + cz < ch) continue; if (cx + cz === ch) { W.set(x, yy, z, face(1 + ((x + z) & 1), 4)); continue; } }
      if (edgeX || edgeZ) W.set(x, yy, z, edgeZ ? face(x - a0, a1 - a0) : face(z - b0, b1 - b0));
      else if (solid || lvl === fb - 1 || yy === top - 1) W.set(x, yy, z, B.concrete);
    }
  }
  // the roof level and crown
  const ins = insetAt(top - y - 1), a0 = x0 + ins, a1 = x1 - ins, b0 = z0 + ins, b1 = z1 - ins;
  for (let x = a0; x <= a1; x++) { W.set(x, top, b0, trim); W.set(x, top, b1, trim); }
  for (let z = b0; z <= b1; z++) { W.set(a0, top, z, trim); W.set(a1, top, z, trim); }
  const cx = (a0 + a1) >> 1, cz = (b0 + b1) >> 1;
  const crown = o.crown ?? 'tank';
  if (crown === 'helipad' && a1 - a0 >= 8) {
    for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) if (Math.hypot(x - cx, z - cz) <= 3.4) W.set(x, top - 1, z, B.asphalt);
    for (let k = -2; k <= 2; k++) { W.set(cx - 1, top - 1, cz + k, B.marble); W.set(cx + 1, top - 1, cz + k, B.marble); } W.set(cx, top - 1, cz, B.marble);
    W.addLight(cx + 0.5, top + 1, cz + 0.5, 0xff4a3a, 2, 6);
  } else if (crown === 'antenna') {
    for (let k = 0; k < (o.mast ?? 10); k++) W.set(cx, top + k, cz, B.metal_grate);
    R.props.box(cx + 0.5, top + (o.mast ?? 10), cz + 0.5, 0.4, 0.4, 0.4, 0xff3a2a, { emit: 4, vary: 0 });
  } else if (crown === 'spire') {
    for (let k = 0; k < 4; k++) for (let z = cz - (3 - k); z <= cz + (3 - k); z++) for (let x = cx - (3 - k); x <= cx + (3 - k); x++) W.set(x, top + k, z, k === 3 ? B.metal_grate : g2);
    for (let k = 4; k < 12; k++) W.set(cx, top + k, cz, B.metal_grate);
  } else if (crown === 'pyramid') {
    for (let k = 0; k < 6; k++) { const r = Math.min(a1 - a0, b1 - b0) / 2 - k * 1.2; if (r < 0.5) break; for (let z = Math.ceil(cz - r); z <= Math.floor(cz + r); z++) for (let x = Math.ceil(cx - r); x <= Math.floor(cx + r); x++) W.set(x, top + k, z, k % 2 ? g2 : trim); }
  } else if (crown === 'tank') {
    for (let k = 0; k < 2; k++) W.set(a0 + 2, top + k, b0 + 2, B.metal_grate);
    if (a1 - a0 > 7) { W.set(a1 - 3, top, b1 - 3, B.concrete); W.set(a1 - 4, top, b1 - 3, B.concrete); }
  }
  // the slice: everything above a plane is cut away (rubble falls round the base)
  if (o.slice) {
    const [px, py, pz] = o.slice.p, [nx, ny, nz] = o.slice.n;
    let cut = 0;
    for (let yy = y; yy < top + 14 && yy < R.sy; yy++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if ((x - px) * nx + (yy - py) * ny + (z - pz) * nz <= 0) continue;
      if (W.get(x, yy, z)) { W.set(x, yy, z, 0); cut++; }
    }
    // the cut face scorched in places
    for (let yy = y; yy < top && yy < R.sy; yy++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!W.get(x, yy, z) || W.get(x, yy + 1, z)) continue;
      if (R.chance(0.18)) W.set(x, yy, z, R.chance(0.5) ? B.cracked_brick : B.blood_brick);
    }
    rubble(R, cx + Math.round(nx * (w / 2 + 4)), cz + Math.round(nz * (d / 2 + 4)), Math.max(w, d) * 0.6, Math.min(80, cut / 40));
  }
  W.addLight(cx + 0.5, y + 2.5, z1 + 1.5, o.lightColor ?? 0xfff0d0, 2.2, 8);
  // cutaway (o.cutaway: true): everything above the first storey is a World roof that fades while a player stands
  // where the tower would hide them (the camera looks from the south-east: north-west of it)
  if (o.cutaway === true && top - y > (o.cutFrom ?? 5) + 3) {   // opt-in: every roof is meshed at load, so this costs load time
    const from = y + (o.cutFrom ?? 5), reach = Math.min(CUT_REACH, Math.ceil((top - y) / 1.19 / 1.2));
    W.addRoof([x0, from, z0], [x1, Math.min(R.sy - 1, top + 14), z1], [[x0 - reach, y - 2, z0 - reach], [x1 + 2, y + 6, z1 + 2]]);
  }
  R.reserve(x0 - 1, z0 - 1, x1 + 1, z1 + 1, 2);
  return { x0, z0, x1, z1, y, top, cx, cz };
}

// ---------------------------------------------------------------- ruins
export function crater(R, cx, cz, r, depth, o = {}) {
  const W = R.world;
  const lining = o.lining ?? [B.obsidian, B.cracked_brick, B.stone, B.blood_brick];
  for (let z = Math.floor(cz - r - 3); z <= Math.ceil(cz + r + 3); z++) for (let x = Math.floor(cx - r - 3); x <= Math.ceil(cx + r + 3); x++) {
    if (!R.in(x, z) || x < 2 || z < 2 || x > R.sx - 3 || z > R.sz - 3) continue;
    const dd = Math.hypot(x + 0.5 - cx, z + 0.5 - cz) / r;
    const i = R.i(x, z), g = Math.round(R.H[i]);
    if (dd <= 1) {
      const dep = Math.round(depth * (1 - dd * dd));
      const ny = Math.max(3, g - dep);
      for (let yy = ny; yy < R.sy; yy++) W.setRaw(x, yy, z, 0);
      W.setRaw(x, ny - 1, z, lining[Math.floor(R.r() * lining.length)]);
      W.setRaw(x, ny - 2, z, B.stone);
      R.H[i] = ny; R.lock[i] = 4;
      if (o.lava && dd < 0.25 && R.chance(0.5)) W.setRaw(x, ny - 1, z, o.lava);
    } else if (dd < 1.35) {   // a rim of upturned rubble
      if (R.chance(0.45)) { const hh = 1 + Math.floor(R.r() * 2); for (let k = 0; k < hh; k++) W.setRaw(x, g + k, z, R.chance(0.5) ? B.cracked_brick : B.concrete); }
      R.lock[i] = Math.max(R.lock[i], 4);
    }
  }
}
export function slash(R, p0, p1, o = {}) {
  const W = R.world, [ax, az] = p0, [bx, bz] = p1, L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L * 2);
  const wid = o.width ?? 1.2, dep = o.depth ?? 2, high = o.height ?? 40;
  const done = new Set();
  for (let s = 0; s <= n; s++) {
    const t = s / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const x = Math.floor(px + dx), z = Math.floor(pz + dz); if (!R.in(x, z) || x < 2 || z < 2 || x > R.sx - 3 || z > R.sz - 3) continue;
      const [d] = segDist(x + 0.5, z + 0.5, ax, az, bx, bz); if (d > wid) continue;
      const i = R.i(x, z); if (done.has(i)) continue; done.add(i);
      const g = Math.round(R.H[i]);
      const ny = Math.max(3, g - dep);
      for (let yy = ny; yy < Math.min(R.sy, g + high); yy++) W.setRaw(x, yy, z, 0);
      W.setRaw(x, ny - 1, z, R.chance(0.6) ? B.blood_brick : B.obsidian);
      R.H[i] = ny; R.lock[i] = 4;
    }
    // scorched edges
    if (s % 2 === 0) for (const sd of [-1, 1]) { const ex = Math.floor(px - (bz - az) / L * (wid + 1) * sd), ez = Math.floor(pz + (bx - ax) / L * (wid + 1) * sd); if (R.in(ex, ez) && R.chance(0.6)) { const g = Math.round(R.H[R.i(ex, ez)]); W.setRaw(ex, g - 1, ez, R.chance(0.5) ? B.cracked_brick : B.obsidian); } }
  }
}
export function rubble(R, cx, cz, r, n = 20) {
  const W = R.world;
  for (let k = 0; k < n; k++) {
    const a = R.r() * Math.PI * 2, dd = R.r() * r, x = Math.floor(cx + Math.cos(a) * dd), z = Math.floor(cz + Math.sin(a) * dd);
    if (!R.in(x, z) || x < 3 || z < 3 || x > R.sx - 4 || z > R.sz - 4) continue;
    const g = R.world.groundBelow(x + 0.5, z + 0.5, R.sy - 1); if (!isFinite(g) || g > R.hAt(x, z) + 3) continue;
    const hh = R.chance(0.3) ? 2 : 1;
    for (let q = 0; q < hh; q++) W.setRaw(x, g + q, z, [B.cracked_brick, B.concrete, B.stone, B.concrete_pillar][Math.floor(R.r() * 4)]);
    if (R.chance(0.3)) R.deco.prop('rubble', x + 0.5, g, z + 0.5);
  }
}

// ---------------------------------------------------------------- street furniture
export function car(R, x, z, yaw = 0, color = null) {
  const y = R.hAt(Math.floor(x), Math.floor(z));
  const cols = [0xd8d8d8, 0x1a1a1a, 0x8a1a1a, 0x2a4a8a, 0xf0f0f0, 0x3a3a3a, 0xf0c020];
  R.deco.prop('car', x, y, z, { color: color ?? cols[Math.floor(R.r() * cols.length)], rot: yaw });
  const W = R.world, c = Math.cos(yaw), s = Math.sin(yaw);
  for (let k = -1; k <= 1; k++) { const bx = Math.floor(x + c * k * 1.2), bz = Math.floor(z - s * k * 1.2); if (!W.get(bx, y, bz)) W.set(bx, y, bz, B.barrier); }
}
export function taxi(R, x, z, yaw = 0) { car(R, x, z, yaw, 0x2a7a3a); R.props.box(x, R.hAt(Math.floor(x), Math.floor(z)) + 1.75, z, 0.5, 0.25, 0.3, 0xffd84a, { emit: 2, ry: yaw }); }
export function bench(R, x, z, yaw = 0) { R.deco.prop('bench', x, R.hAt(Math.floor(x), Math.floor(z)), z, { rot: yaw }); }
export function planter(R, x, z, kind = 'tree') {
  const W = R.world, y = R.hAt(x, z);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { W.set(x + dx, y, z + dz, (dx || dz) ? B.stone_brick : B.dirt); }
  if (kind === 'tree') { R.tree(x, z, 'oak', { y: y + 1, h: 4 }); }
  else { W.set(x, y + 1, z, B.leaves); }
  R.lock[R.i(x, z)] = 4;
}
export function vending(R, x, z, yaw = 0) {
  const W = R.world, y = R.hAt(x, z);
  W.set(x, y, z, B.vending); W.set(x, y + 1, z, B.vending);
  void yaw;
}
export function sign(R, x, y, z, lines, o = {}) {
  R.deco.extra(() => { const m = signMesh(lines, { w: o.w ?? 4, h: o.h ?? 1.2, color: o.color ?? '#ffd84a', bg: o.bg, glow: o.glow ?? 1.8, font: o.font, border: o.border }); m.position.set(x, y, z); m.rotation.y = o.yaw ?? 0; return m; });
}
export function neonBar(R, x, y0, z, h, block = B.neon_pink) { for (let k = 0; k < h; k++) R.world.set(x, y0 + k, z, block); }
// big screen on a facade (a lit sign mesh), facing yaw
export function screen(R, x, y, z, w, h, lines, o = {}) { sign(R, x, y, z, lines, { w, h, color: o.color ?? '#9af0ff', bg: o.bg ?? 'rgba(10,20,40,0.95)', glow: o.glow ?? 2.2, yaw: o.yaw ?? 0, font: o.font ?? `bold ${Math.round(260 / Math.max(2, lines.length + 1))}px "Pixelify Sans", sans-serif`, border: o.border ?? '#2a4a6a' }); }

// an elevated deck on pillars: rail viaducts, the Shuto expressway
export function viaduct(R, pts, o = {}) {
  const W = R.world, y = o.y ?? R.base + 7, hw = (o.width ?? 6) / 2, every = o.every ?? 10;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L);
    const ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let s = 0; s <= n; s++) {
      const px = ax + ux * s, pz = az + uz * s;
      for (let q = -hw; q <= hw; q += 0.5) {
        const x = Math.floor(px - uz * q), z = Math.floor(pz + ux * q); if (!R.in(x, z)) continue;
        const edge = Math.abs(q) >= hw - 0.25;
        W.set(x, y, z, B.concrete); W.set(x, y - 1, z, B.concrete);
        W.set(x, y + 1, z, edge ? (o.wall ?? B.concrete_pillar) : 0);
        if (o.rail && !edge && (Math.abs(Math.abs(q) - hw * 0.45) < 0.3)) W.set(x, y, z, B.rail);
        if (o.lane && !edge && Math.abs(q) < 0.3 && s % 4 < 2) W.set(x, y, z, B.asphalt_line);
        else if (o.lane && !edge && !o.rail) W.set(x, y, z, B.asphalt);
      }
      if (s % every === 0) for (const q of [-hw + 1, hw - 1]) {
        const x = Math.floor(px - uz * q), z = Math.floor(pz + ux * q); if (!R.in(x, z)) continue;
        const g = R.hAt(x, z);
        if (R.lock[R.i(x, z)] === 1 && R.roadId[R.i(x, z)] && !o.pillarsOnRoad) continue;
        for (let yy = g; yy < y - 1; yy++) W.set(x, yy, z, B.concrete_pillar);
      }
      if (o.lights && s % 16 === 0) W.addLight(px, y + 2, pz, 0xffe0b0, 2.5, 10);
    }
  }
}

// A faster World.collectBlockLights for big, tall city maps (same result: one static light per
// light-emitting block kind per 4×4×4 cell): scans the voxel array linearly with a lookup table.
//   R.world.collectBlockLights = () => fastBlockLights(R.world)   (before R.finish)
const LIGHT_IDS = BLOCKS.map((b) => !!b.light);
export function fastBlockLights(W) {
  const { sx, sz, data } = W, n = data.length, layer = sx * sz, seen = new Set();
  for (let i = 0; i < n; i++) {
    const id = data[i]; if (!id || !LIGHT_IDS[id]) continue;
    const y = (i / layer) | 0, r = i - y * layer, z = (r / sx) | 0, x = r - z * sx;
    const key = id + ':' + (x >> 2) + ',' + (y >> 2) + ',' + (z >> 2);
    if (seen.has(key)) continue; seen.add(key);
    const def = BLOCKS[id], L = def.light;
    W.staticLights.push({ x: x + 0.5, y: y + (def.liquid ? 1.2 : 0.5), z: z + 0.5, color: new THREE.Color(L[0]), intensity: L[1], distance: L[2], block: true });
  }
}

void THREE;
