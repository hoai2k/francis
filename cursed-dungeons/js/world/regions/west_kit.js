// Building kit for the western regions (Kyoto, the Okinawa coast) — usable
// by any region built with RegionBuilder (./common.js):
//
//   maple(R, x, z, o)            autumn maple: voxel trunk, a red/orange/gold canopy
//                                of swaying props, fallen leaves round its foot
//   grove(R, o)                  scatter trees: o.rect, o.step, o.density (number | fn),
//                                o.pick(x, z) -> 'maple' | any R.tree kind | fn(R, x, z), o.where
//   hipRoof(R, x0, z0, x1, z1, y, o)   stepped hipped roof that closes at the ridge (no size cap)
//   hall(R, x0, z0, w, d, o)     temple hall: plinth, lacquered posts and shoji walls, a
//                                big hipped roof with flared corners (fades when you walk in)
//   pagoda(R, cx, cz, o)         a five-storey (o.tiers) pagoda with eaves and a gold sōrin
//   toriiPath(R, pts, o)         a tunnel of torii along a polyline (Fushimi Inari)
//   fox(R, x, z, o) / shisa(R, x, z, o)   guardian statues (props)
//   paperLanterns(R, x0, z0, x1, z1, y, n)  a string of hanging paper lanterns
//   parasol(R, x, z, o) / deckChair(R, x, z, o)   beach furniture
//   banyan(R, x, z, o)           Okinawan gajumaru: thick trunk, wide canopy, hanging roots
//   coral(R, x0, z0, x1, z1, n)  coral heads on the lagoon floor (props, faintly glowing)
//   stall(R, x, z, o)            a market stall with a striped awning
//   bench(R, x, z, o)
// All props go through R.props (merged per 64×64 tile).
import { B } from './common.js';

export const MAPLE_COLS = [0xd8321e, 0xe8502a, 0xf07a28, 0xf2a42e, 0xe8c040, 0xc8281e, 0xff6a2a];

export function maple(R, x, z, o = {}) {
  const W = R.world, y = o.y ?? R.groundY(x, z); if (!isFinite(y)) return false;
  const h = o.h ?? 3 + Math.floor(R.r() * 2);
  for (let i = 0; i < h; i++) W.set(x, y + i, z, B.bark_dark);
  const pal = o.palette ?? MAPLE_COLS, P = R.props, cx = x + 0.5, cz = z + 0.5, top = y + h;
  const pick = () => pal[Math.floor(R.r() * pal.length)];
  const main = pick(), s = o.s ?? 1;
  P.box(cx, top - 0.8, cz, 3.6 * s, 1.9 * s, 3.6 * s, main, { emit: 0.06, sway: 0.25, vary: 0.08 });
  P.box(cx, top + 0.9, cz, 2.4 * s, 1.3 * s, 2.4 * s, main, { emit: 0.06, sway: 0.4, vary: 0.08 });
  for (let i = 0; i < 5; i++) {
    const a = R.r() * 6.28, d = R.rnd(1.1, 2.3) * s, q = R.rnd(0.9, 1.5) * s;
    P.box(cx + Math.cos(a) * d, top + R.rnd(-1.2, 0.8), cz + Math.sin(a) * d, q, q * 0.8, q, i % 3 ? main : pick(), { emit: 0.07, sway: 0.55, ry: a });
  }
  W.set(x, top - 1, z, B.leaves);   // a solid core so the canopy blocks jumps / casts a voxel shadow
  if (o.leaves !== false) for (let i = 0; i < 3; i++) {
    const lx = x + Math.floor(R.rnd(-2, 3)), lz = z + Math.floor(R.rnd(-2, 3)), ly = R.groundY(lx, lz);
    if (isFinite(ly) && Math.abs(ly - y) <= 1) P.box(lx + R.rnd(0.2, 0.8), ly, lz + R.rnd(0.2, 0.8), R.rnd(0.5, 0.9), 0.04, R.rnd(0.5, 0.9), pick(), { ry: R.r() * 3, vary: 0.1 });
  }
  return true;
}

export function grove(R, o = {}) { const it = groveG(R, o); let r; do r = it.next(); while (!r.done); return r.value; }
// the same, yielding every few rows (time-sliced region builds)
export function* groveG(R, o = {}) {
  const [x0, z0, x1, z1] = o.rect ?? [3, 3, R.sx - 4, R.sz - 4];
  const step = o.step ?? 4, dens = o.density ?? 0.5;
  let n = 0;
  for (let z = z0; z <= z1; z += step) for (let x = x0; x <= x1; x += step) {
    if (x === x0 && ((z - z0) / step) % 8 === 7) yield 'grove';
    const px = x + Math.floor(R.rnd(0, step)), pz = z + Math.floor(R.rnd(0, step));
    if (!R.chance(typeof dens === 'function' ? dens(px, pz) : dens)) continue;
    if (o.where && !o.where(px, pz)) continue;
    if (!R.freeCell(px, pz, o.clear ?? 1)) continue;
    const k = o.pick ? o.pick(px, pz) : 'maple';
    const ok = typeof k === 'function' ? k(R, px, pz) : k === 'maple' ? maple(R, px, pz) : k === 'banyan' ? banyan(R, px, pz) : R.tree(px, pz, k);
    if (ok !== false) { n++; R.lock[R.i(px, pz)] = 4; }
  }
  return n;
}

// Stepped hipped roof over [x0..x1]×[z0..z1] starting at y; closes into a ridge.
// o: { block, rim, ridge, flare: true }
export function hipRoof(R, x0, z0, x1, z1, y, o = {}) {
  const W = R.world, roof = o.block ?? B.roof, rim = o.rim ?? B.dark_planks, ridge = o.ridge ?? roof;
  let ax0 = x0, az0 = z0, ax1 = x1, az1 = z1, yy = y, lvl = 0;
  while (ax0 <= ax1 && az0 <= az1 && lvl < 20) {
    const last = ax1 - ax0 < 2 || az1 - az0 < 2;
    for (let z = az0; z <= az1; z++) for (let x = ax0; x <= ax1; x++) {
      const ring = Math.min(x - ax0, ax1 - x, z - az0, az1 - z) < 1;
      if (ring || last) W.set(x, yy, z, last ? ridge : lvl === 0 && ring ? rim : roof);
    }
    if (last) break;
    ax0++; az0++; ax1--; az1--; yy++; lvl++;
  }
  if (o.flare !== false) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) W.set(x, y + 1, z, rim);
  return yy;
}

// Temple hall. (x0, z0) NW corner of the walls, w × d. o: { y, h, post, wall, floor, roof, rim, ridge,
// door: 's'|'n'|'e'|'w', plinth: true, eave: 2, light }
export function hall(R, x0, z0, w, d, o = {}) {
  const W = R.world, x1 = x0 + w - 1, z1 = z0 + d - 1;
  const y = (o.y ?? R.hAt(x0 + (w >> 1), z0 + (d >> 1))) + (o.plinth === false ? 0 : 1);
  const h = o.h ?? 5, post = o.post ?? B.pillar_red, wall = o.wall ?? B.shoji, eave = o.eave ?? 2;
  const door = o.door ?? 's';
  // plinth (stone base one step up) and floor
  for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    W.column(x, z, y - 8, y - 2, B.stone);
    W.setRaw(x, y - 1, z, (x < x0 || x > x1 || z < z0 || z > z1) ? B.stone_brick : (o.floor ?? B.floor_boards));
    for (let yy = y; yy < y + h + 12; yy++) W.setRaw(x, yy, z, 0);
  }
  if (o.plinth !== false) for (let z = z0 - 2; z <= z1 + 2; z++) for (let x = x0 - 2; x <= x1 + 2; x++) {
    if (x >= x0 - 1 && x <= x1 + 1 && z >= z0 - 1 && z <= z1 + 1) continue;
    if (!R.in(x, z)) continue;
    W.column(x, z, y - 6, y - 2, B.stone_brick);
    for (let yy = y - 1; yy < y + h + 12; yy++) W.setRaw(x, yy, z, 0);
  }
  const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
  for (let yy = y; yy < y + h; yy++) {
    const lvl = yy - y;
    const pick = (t, len) => (t % 3 === 0 || t === len) ? post : lvl === h - 1 ? B.dark_planks : lvl === 0 ? B.dark_planks : wall;
    for (let x = x0; x <= x1; x++) { W.set(x, yy, z0, pick(x - x0, w - 1)); W.set(x, yy, z1, pick(x - x0, w - 1)); }
    for (let z = z0; z <= z1; z++) { W.set(x0, yy, z, pick(z - z0, d - 1)); W.set(x1, yy, z, pick(z - z0, d - 1)); }
  }
  // wide doorway (3 cells, 4 high)
  for (let yy = y; yy < y + Math.min(4, h - 1); yy++) for (let t = -1; t <= 1; t++) {
    if (door === 's') W.set(cx + t, yy, z1, 0); if (door === 'n') W.set(cx + t, yy, z0, 0);
    if (door === 'e') W.set(x1, yy, cz + t, 0); if (door === 'w') W.set(x0, yy, cz + t, 0);
  }
  // ceiling slab then the roof with deep eaves
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, y + h, z, B.dark_planks);
  const top = hipRoof(R, x0 - eave, z0 - eave, x1 + eave, z1 + eave, y + h, { block: o.roof ?? B.roof, rim: o.rim ?? B.dark_planks, ridge: o.ridge ?? B.gold_trim });
  W.addRoof([x0 - eave, y + h, z0 - eave], [x1 + eave, top + 1, z1 + eave], [[x0, y, z0], [x1, y + h - 1, z1]]);
  if (o.light !== false) W.addLight(cx + 0.5, y + 2.5, cz + 0.5, o.lightColor ?? 0xffc080, 3, 9);
  R.reserve(x0 - eave - 1, z0 - eave - 1, x1 + eave + 1, z1 + eave + 1, 2);
  const dz = door === 's' ? z1 + 2 : door === 'n' ? z0 - 2 : cz, dx = door === 'e' ? x1 + 2 : door === 'w' ? x0 - 2 : cx;
  return { x0, z0, x1, z1, y, top, door: [dx, dz], center: [cx, cz] };
}

// Pagoda centred on (cx, cz). o: { y, tiers: 5, half: 4, post, wall, roof, color }
export function pagoda(R, cx, cz, o = {}) {
  const W = R.world, P = R.props;
  const y0 = o.y ?? R.hAt(cx, cz), tiers = o.tiers ?? 5, half0 = o.half ?? 4;
  const post = o.post ?? B.pillar_red, wall = o.wall ?? B.plaster, roof = o.roof ?? B.roof;
  // stone plinth
  for (let dz = -half0 - 3; dz <= half0 + 3; dz++) for (let dx = -half0 - 3; dx <= half0 + 3; dx++) {
    W.column(cx + dx, cz + dz, y0 - 6, y0 - 1, B.stone);
    for (let yy = y0; yy < y0 + tiers * 6 + 14; yy++) W.setRaw(cx + dx, yy, cz + dz, 0);
    if (Math.abs(dx) <= half0 + 1 && Math.abs(dz) <= half0 + 1) W.setRaw(cx + dx, y0, cz + dz, B.stone_brick);
  }
  let yy = y0 + 1;
  for (let t = 0; t < tiers; t++) {
    const half = Math.max(1, Math.round(half0 - t * (half0 - 1.5) / Math.max(1, tiers - 1)));
    const bh = t === 0 ? 4 : 3;
    for (let k = 0; k < bh; k++) for (let dz = -half; dz <= half; dz++) for (let dx = -half; dx <= half; dx++) {
      const edge = Math.abs(dx) === half || Math.abs(dz) === half; if (!edge) continue;
      const corner = Math.abs(dx) === half && Math.abs(dz) === half;
      let b = corner ? post : (k === 1 && (dx === 0 || dz === 0)) ? B.shoji : (k === bh - 1 ? B.dark_planks : wall);
      if (t === 0 && k < 3 && dz === half && Math.abs(dx) < 1) b = 0;   // the door on the south side
      W.set(cx + dx, yy + k, cz + dz, b);
    }
    yy += bh;
    const e = half + 2;
    for (let dz = -e; dz <= e; dz++) for (let dx = -e; dx <= e; dx++) {
      const rim = Math.max(Math.abs(dx), Math.abs(dz)) === e;
      W.set(cx + dx, yy, cz + dz, rim ? B.dark_planks : roof);
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.set(cx + sx * e, yy + 1, cz + sz * e, roof);   // upturned corners
    for (let dz = -e + 1; dz <= e - 1; dz++) for (let dx = -e + 1; dx <= e - 1; dx++) if (t === tiers - 1 || Math.max(Math.abs(dx), Math.abs(dz)) >= half) W.set(cx + dx, yy + 1, cz + dz, roof);
    if (t === tiers - 1) for (let dz = -half; dz <= half; dz++) for (let dx = -half; dx <= half; dx++) W.set(cx + dx, yy + 2, cz + dz, Math.max(Math.abs(dx), Math.abs(dz)) === half ? B.dark_planks : roof);
    yy += 2;
  }
  // sōrin: a bronze/gold spire with nine rings
  for (let k = 0; k < 2; k++) W.set(cx, yy + k, cz, B.gold_trim);
  for (let i = 0; i < 9; i++) P.box(cx + 0.5, yy + 2 + i * 0.55, cz + 0.5, 1.1 - i * 0.04, 0.16, 1.1 - i * 0.04, 0xd8b048, { emit: 0.35, vary: 0 });
  P.box(cx + 0.5, yy + 2, cz + 0.5, 0.22, 5.6, 0.22, 0xb89038, { vary: 0 });
  P.box(cx + 0.5, yy + 7.6, cz + 0.5, 0.5, 0.5, 0.5, 0xffd860, { emit: 1.2, vary: 0 });
  W.addLight(cx + 0.5, y0 + 2.5, cz + 0.5, 0xffb070, 3, 8);
  W.addLight(cx + 0.5, yy + 6, cz + 0.5, 0xffd890, 2.5, 10);
  R.reserve(cx - half0 - 4, cz - half0 - 4, cx + half0 + 4, cz + half0 + 4, 2);
  return yy + 8;
}

// Torii every `gap` cells along a polyline (the path should be planned as a road).
export function toriiPath(R, pts, o = {}) {
  const gap = o.gap ?? 1.5, w = o.w ?? 3.6, h = o.h ?? 3.8, color = o.color ?? 0xe0401c;
  let n = 0, carry = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az);
    const along = Math.abs(bz - az) >= Math.abs(bx - ax) ? 'x' : 'z';
    for (let s = carry; s < len; s += gap) {
      const x = ax + (bx - ax) * s / len, z = az + (bz - az) * s / len;
      const y = R.groundY(Math.floor(x), Math.floor(z)); if (!isFinite(y)) continue;
      if (o.skip && o.skip(x, z)) continue;
      R.torii(x, y, z, w, h, { along, color, thick: 0.34, collide: o.collide ?? true });
      n++;
    }
    carry = (carry + Math.ceil((len - carry) / gap) * gap) - len;
  }
  return n;
}

// kitsune guardian on a plinth, facing `ry` (radians, 0 = +z)
export function fox(R, x, z, o = {}) {
  const P = R.props, y = o.y ?? R.groundY(Math.floor(x), Math.floor(z)), ry = o.ry ?? 0, s = o.s ?? 1;
  const col = o.color ?? 0xe8e2d4, fx = Math.sin(ry), fz = Math.cos(ry);
  P.box(x, y, z, 1.0 * s, 0.9 * s, 1.0 * s, 0x8a8680);
  P.box(x, y + 0.9 * s, z, 0.62 * s, 0.9 * s, 0.8 * s, col, { ry });
  P.box(x + fx * 0.18 * s, y + 1.7 * s, z + fz * 0.18 * s, 0.5 * s, 0.46 * s, 0.5 * s, col, { ry });
  P.box(x + fx * 0.42 * s, y + 1.76 * s, z + fz * 0.42 * s, 0.2 * s, 0.18 * s, 0.24 * s, col, { ry });
  for (const sd of [-1, 1]) P.box(x + fx * 0.12 * s + fz * sd * 0.15 * s, y + 2.12 * s, z + fz * 0.12 * s - fx * sd * 0.15 * s, 0.12 * s, 0.26 * s, 0.1 * s, col, { ry });
  P.box(x + fx * 0.3 * s, y + 1.4 * s, z + fz * 0.3 * s, 0.56 * s, 0.26 * s, 0.14 * s, 0xd8301c, { ry });   // red bib
  P.box(x - fx * 0.42 * s, y + 1.0 * s, z - fz * 0.42 * s, 0.26 * s, 0.9 * s, 0.26 * s, col, { ry, rx: -0.5 });   // tail
  R.world.set(Math.floor(x), y, Math.floor(z), B.barrier);
}

// Okinawan shisa (terracotta lion-dog)
export function shisa(R, x, z, o = {}) {
  const P = R.props, y = o.y ?? R.groundY(Math.floor(x), Math.floor(z)), ry = o.ry ?? 0, s = o.s ?? 1;
  const col = o.color ?? 0xc8703a, dark = 0x8a4a22, fx = Math.sin(ry), fz = Math.cos(ry);
  if (o.plinth !== false) P.box(x, y, z, 0.95 * s, 0.7 * s, 0.95 * s, 0xd8d0b8);
  const b = y + (o.plinth !== false ? 0.7 : 0) * s;
  P.box(x, b, z, 0.6 * s, 0.6 * s, 0.8 * s, col, { ry });
  P.box(x + fx * 0.25 * s, b + 0.55 * s, z + fz * 0.25 * s, 0.72 * s, 0.6 * s, 0.6 * s, col, { ry });
  P.box(x + fx * 0.2 * s, b + 0.5 * s, z + fz * 0.2 * s, 0.9 * s, 0.7 * s, 0.34 * s, dark, { ry });   // mane
  P.box(x + fx * 0.58 * s, b + 0.62 * s, z + fz * 0.58 * s, 0.5 * s, 0.14 * s, 0.1 * s, 0xf0e8d0, { ry });   // teeth
  P.box(x - fx * 0.4 * s, b + 0.5 * s, z - fz * 0.4 * s, 0.3 * s, 0.4 * s, 0.2 * s, dark, { ry });
}

export function paperLanterns(R, x0, z0, x1, z1, y, n = 6, o = {}) {
  const P = R.props, cols = o.colors ?? [0xff4a2a, 0xffe2a0, 0xff6a3a];
  const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0);
  P.box((x0 + x1) / 2, y + 0.4, (z0 + z1) / 2, 0.04, 0.04, len, 0x2a1a10, { ry });
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, sag = Math.sin(t * Math.PI) * 0.35;
    P.box(x, y - 0.25 - sag, z, 0.36, 0.5, 0.36, cols[i % cols.length], { emit: 2.0, vary: 0, sway: 0.3 });
  }
}

export function parasol(R, x, z, o = {}) {
  const P = R.props, y = o.y ?? R.groundY(Math.floor(x), Math.floor(z));
  const cols = [0xff5a5a, 0x4ab0ff, 0xffd24a, 0x5ad88a, 0xff8ad0, 0xffffff];
  const c = o.color ?? cols[Math.floor(R.r() * cols.length)];
  P.box(x, y, z, 0.1, 2.5, 0.1, 0xf0f0f0, { vary: 0 });
  P.box(x, y + 2.4, z, 2.6, 0.12, 2.6, c, { vary: 0.03 });
  P.box(x, y + 2.52, z, 1.8, 0.12, 1.8, 0xffffff, { vary: 0 });
  P.box(x, y + 2.64, z, 0.9, 0.14, 0.9, c);
}
export function deckChair(R, x, z, o = {}) {
  const P = R.props, y = o.y ?? R.groundY(Math.floor(x), Math.floor(z)), ry = o.ry ?? 0;
  const c = o.color ?? [0x4ab0ff, 0xffffff, 0xff7a5a, 0x5ad88a][Math.floor(R.r() * 4)];
  P.box(x, y, z, 0.7, 0.3, 1.8, 0xd8c8a0, { ry });
  P.box(x, y + 0.3, z, 0.66, 0.06, 1.7, c, { ry });
  P.box(x - Math.sin(ry) * 0.75, y + 0.3, z - Math.cos(ry) * 0.75, 0.66, 0.6, 0.12, c, { ry, rx: -0.6 });
}
export function bench(R, x, z, o = {}) {
  const P = R.props, y = o.y ?? R.groundY(Math.floor(x), Math.floor(z)), ry = o.ry ?? 0;
  P.box(x, y + 0.42, z, 1.8, 0.1, 0.6, o.color ?? 0x8a5a34, { ry });
  P.box(x, y, z, 1.6, 0.42, 0.4, 0x4a3020, { ry });
  if (o.red) P.box(x, y + 0.52, z, 1.9, 0.04, 0.7, 0xd8301c, { ry });   // a red felt cloth (tea house)
}

// Gajumaru (banyan): 2×2 trunk, a wide flat voxel canopy, aerial roots
export function banyan(R, x, z, o = {}) {
  const W = R.world, y = o.y ?? R.groundY(x, z); if (!isFinite(y)) return false;
  const h = o.h ?? 5 + Math.floor(R.r() * 2), r = o.r ?? 4 + Math.floor(R.r() * 2);
  for (let i = 0; i < h; i++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) W.set(x + dx, y + i, z + dz, B.log);
  for (let dy = 0; dy < 3; dy++) {
    const rr = r - (dy === 2 ? 2 : dy === 0 ? 0 : 1);
    for (let dz = -rr; dz <= rr + 1; dz++) for (let dx = -rr; dx <= rr + 1; dx++) {
      if ((dx - 0.5) ** 2 + (dz - 0.5) ** 2 > (rr + 0.4) ** 2) continue;
      if (dy === 0 && R.chance(0.25)) continue;
      if (!W.get(x + dx, y + h + dy - 1, z + dz)) W.set(x + dx, y + h + dy - 1, z + dz, B.leaves);
    }
  }
  for (let i = 0; i < 9; i++) {
    const a = R.r() * 6.28, d = R.rnd(1.5, r - 0.5), rx = x + 1 + Math.cos(a) * d, rz = z + 1 + Math.sin(a) * d;
    const gy = R.groundY(Math.floor(rx), Math.floor(rz)); if (!isFinite(gy)) continue;
    const top = y + h - 1, len = Math.max(1, top - gy);
    R.props.box(rx, top - len * R.rnd(0.4, 1), rz, 0.12, len * R.rnd(0.4, 1), 0.12, 0x6a5038, { sway: 0.15 });
  }
  return true;
}

// Dense bamboo: n straight stalks with leafy tops (2 props each), one barrier cell.
export function bambooClump(R, x, z, o = {}) {
  const y = o.y ?? R.groundY(x, z); if (!isFinite(y)) return false;
  const P = R.props, n = o.n ?? 5;
  for (let k = 0; k < n; k++) {
    const bx = x + R.rnd(0.1, 0.9), bz = z + R.rnd(0.1, 0.9), h = R.rnd(o.hMin ?? 6, o.hMax ?? 9.5);
    P.box(bx, y, bz, 0.2, h, 0.2, R.chance(0.5) ? 0x8ab84e : 0x6e9e3c, { sway: 0.28, vary: 0.06 });
    P.box(bx, y + h - 1.4, bz, R.rnd(0.9, 1.4), 1.3, R.rnd(0.9, 1.4), R.chance(0.5) ? 0x5e9a30 : 0x78ac3c, { sway: 0.7, ry: R.r() * 3, emit: 0.03 });
  }
  R.world.set(x, y, z, B.barrier);
  return true;
}

export function coral(R, x0, z0, x1, z1, n = 40) {
  const W = R.world, cols = [0xff6a8a, 0xff9a4a, 0xb06aff, 0xffd24a, 0x4ad8c8, 0xff5ab0, 0xf0f0e0];
  let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    const x = Math.floor(R.rnd(x0, x1)), z = Math.floor(R.rnd(z0, z1)); if (!R.in(x, z)) continue;
    let y = -1; for (let yy = 20; yy > 0; yy--) { const b = W.get(x, yy, z); if (b && b !== B.water) { y = yy + 1; break; } }
    if (y < 0 || W.get(x, y, z) !== B.water || W.get(x, y + 1, z) !== B.water) continue;
    const c = cols[Math.floor(R.r() * cols.length)], P = R.props, cx = x + 0.5, cz = z + 0.5;
    if (R.chance(0.5)) {   // branching coral
      for (let b = 0; b < 4; b++) P.box(cx + R.rnd(-0.4, 0.4), y, cz + R.rnd(-0.4, 0.4), 0.18, R.rnd(0.6, 1.3), 0.18, c, { emit: 0.25, rx: R.rnd(-0.4, 0.4), rz: R.rnd(-0.4, 0.4), sway: 0.2 });
    } else {               // brain / table coral
      P.box(cx, y, cz, R.rnd(0.7, 1.3), R.rnd(0.35, 0.7), R.rnd(0.7, 1.3), c, { emit: 0.2, ry: R.r() * 3 });
    }
    k++;
  }
  return k;
}

export function stall(R, x, z, o = {}) {
  const P = R.props, y = o.y ?? R.groundY(Math.floor(x), Math.floor(z)), ry = o.ry ?? 0;
  const c = o.color ?? [0xff5a5a, 0x4ab0ff, 0xffb02a, 0x5ad88a][Math.floor(R.r() * 4)];
  const fx = Math.sin(ry), fz = Math.cos(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
  P.box(x, y, z, 2.6, 0.9, 1.1, 0x8a5a34, { ry });
  for (const s of [-1, 1]) P.box(x + sx * s * 1.2 - fx * 0.45, y, z + sz * s * 1.2 - fz * 0.45, 0.12, 2.3, 0.12, 0x5a3a20);
  for (let i = 0; i < 4; i++) P.box(x + sx * (i - 1.5) * 0.68 + fx * 0.15, y + 2.25, z + sz * (i - 1.5) * 0.68 + fz * 0.15, 0.68, 0.1, 1.7, i % 2 ? 0xffffff : c, { ry, rx: 0.18 });
  const goods = o.goods ?? [0xff8a3a, 0x8ad04a, 0xffd23a, 0xd04a4a];
  for (let i = 0; i < 5; i++) P.box(x + sx * (i - 2) * 0.45, y + 0.9, z + sz * (i - 2) * 0.45, 0.32, 0.22, 0.32, goods[i % goods.length]);
  R.world.set(Math.floor(x), y, Math.floor(z), B.barrier);
}
