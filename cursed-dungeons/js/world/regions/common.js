// RegionBuilder: the toolkit every open-world region is built with.
//
//   const R = new RegionBuilder(ctx, { size: [256, 64, 256], base: 10 });
//   // 1. plan (before terrain): roads, flat areas, rivers, gates, stations
//   R.road([[0, 128], [128, 128], [255, 128]], { width: 6, block: B.dirt_path });
//   R.flat(100, 100, 150, 150, { y: 10 });            // a town square
//   R.river([[20, 0], [60, 120], [40, 255]], { width: 5 });
//   R.gate('e', 'shinjuku');  R.gate('w', 'okinawa_coast', { at: 140 });
//   R.station('town', 'Town Station', 128, 120);
//   // 2. terrain: a heightfield that eases into the roads and flats
//   R.terrain({ amp: 16, scale: 0.018 });               // or { fn: (x, z) => height }
//   R.carve({ top: B.grass, sub: B.dirt, rock: B.stone, sea: 6 });
//   R.paveRoads();
//   // 3. dress: houses, towers, trees, lanterns, people, POIs, quest anchors
//   R.house(110, 104, 9, 7, { door: 's' });  R.forest({ density: 0.05 });
//   R.anchor('lair_m5', 128, 140);  R.poi('crossing', 'Scramble Crossing', '🚦', 128, 128);
//   R.person({ id: 'old_man', name: 'Old Man', look: 'npc_civ_2', x: 120, z: 126, lines: [['Hello!']] });
//   R.roamZone(0, 0, 80, 255, { kinds: ['swarmer', 'spitter'] });  R.safeZone(100, 100, 150, 150);
//   // 4. finish: builds the gates/stations, edges, lights -> the level object L
//   return R.finish({ spawn: [128, 130] });
//
// Coordinates are voxel cells: +x east, +z south, y up. Heights from H / groundY
// are the first free cell above the ground. Static props (lanterns, signs,
// torii, fences) go through R.props.box(...) and are merged per 64×64 tile;
// sprites (grass, flowers) through R.deco.add(...), also tiled.
import * as THREE from 'three/webgpu';
import { max } from 'three/tsl';
import { World } from '../voxel.js';
import { B, BLOCKS } from '../blocks.js';
import { Kit } from '../kit.js';
import { Decorations } from '../deco.js';
import { LightShafts } from '../shafts.js';
import { Props } from '../jujutsuHigh.js';
import { ditherMask, occlusionAmount } from '../../gfx/materials.js';
import { mulberry32 } from '../../util.js';
import { neighbours, OPPOSITE, REGIONS } from './index.js';

export { B };
const TILE = 64;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ noise
// Seeded 2D value noise with fbm and ridged variants (0..1 / -1..1).
export function makeNoise(seed = 1) {
  const r = mulberry32(seed), P = new Uint8Array(512), G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const v = (x, z) => G[P[P[x & 255] + (z & 255)]];
  const n2 = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
    const a = v(xi, zi), b = v(xi + 1, zi), c = v(xi, zi + 1), d = v(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  const fbm = (x, z, oct = 4) => { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += n2(x * f, z * f) * a; t += a; a *= 0.5; f *= 2.03; } return s / t; };
  const ridge = (x, z, oct = 4) => { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += (1 - Math.abs(n2(x * f, z * f))) * a; t += a; a *= 0.5; f *= 2.1; } return s / t; };
  return { n2, fbm, ridge };
}

// ------------------------------------------------------------------ tiled decorations / props
// Same interface as Decorations, but items are split into 64×64 tiles so each
// tile is its own mesh (frustum-culled), and extra meshes (merged props,
// signs, the backdrop) are added when the world is (re)built.
export class TiledDeco {
  constructor() { this.tiles = new Map(); this.extras = []; this.roofDither = true; }
  tile(x, z) { const k = Math.floor(x / TILE) + ',' + Math.floor(z / TILE); if (!this.tiles.has(k)) this.tiles.set(k, new Decorations()); return this.tiles.get(k); }
  add(type, x, y, z, o = {}) { this.tile(x, z).add(type, x, y, z, o); }
  prop(kind, x, y, z, o = {}) { this.tile(x, z).prop(kind, x, y, z, o); }
  get items() { return [...this.tiles.values()].flatMap((t) => t.items); }
  // extra(fn): fn() -> Object3D (or array), called on every build
  extra(fn) { this.extras.push(fn); }
  build(world, materials, density = 1) {
    for (const t of this.tiles.values()) t.build(world, materials, density);
    if (this.roofDither) for (const r of world.roofs) {
      const m = r.material; if (!m || m.userData.hubDither || !m.userData.fade) continue;
      m.maskNode = ditherMask(max(m.userData.fade.div(0.88), occlusionAmount()));
      m.userData.hubDither = true; m.needsUpdate = true;
    }
    for (const fn of this.extras) { const o = fn(); for (const m of [o].flat()) if (m) world.group.add(m); }
  }
}
export class TiledProps {
  constructor(seed = 7) { this.tiles = new Map(); this.seed = seed; }
  at(x, z) { const k = Math.floor(x / TILE) + ',' + Math.floor(z / TILE); if (!this.tiles.has(k)) this.tiles.set(k, new Props(this.seed + this.tiles.size * 13)); return this.tiles.get(k); }
  // box standing on (x, y, z), centred on x/z — see Props.box in jujutsuHigh.js
  box(x, y, z, w, h, d, color, o = {}) { this.at(x, z).box(x, y, z, w, h, d, color, o); }
  build() { return [...this.tiles.values()].map((p) => p.build()).filter(Boolean); }
}

// A flat sign with text (canvas texture), facing +z unless rotated.
export function signMesh(lines, { w = 3, h = 1, color = '#ffd84a', bg = 'rgba(14,10,26,0.92)', border = null, glow = 1.6, font = 'bold 44px "Pixelify Sans", sans-serif' } = {}) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
  const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = border ?? color; c.lineWidth = 12; c.strokeRect(6, 6, cv.width - 12, cv.height - 12);
  const L = [lines].flat(); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font;
  L.forEach((t, i) => c.fillText(t, cv.width / 2, cv.height * (i + 0.5) / L.length));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicNodeMaterial({ map: tex, side: THREE.DoubleSide }));
  m.material.color = new THREE.Color(glow, glow, glow);
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

// ------------------------------------------------------------------ the builder
export class RegionBuilder {
  // ctx: { id, def, seed } from buildRegion; o.size [sx, sy, sz]; o.base ground height
  constructor(ctx, o = {}) {
    const [sx, sy, sz] = o.size ?? [256, 64, 256];
    this.id = ctx.id; this.def = ctx.def ?? REGIONS[ctx.id] ?? {}; this.seed = ctx.seed ?? 1;
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.base = o.base ?? 10;
    this.world = new World(sx, sy, sz);
    this.deco = new TiledDeco();
    this.shafts = new LightShafts();
    this.kit = new Kit(this.world, this.deco, this.shafts, this.seed);
    this.props = new TiledProps(this.seed);
    this.r = mulberry32(this.seed ^ 0x9e3779b9);
    this.noise = makeNoise(this.seed);
    this.H = new Float32Array(sx * sz).fill(this.base);
    this.lock = new Uint8Array(sx * sz);      // 1 road, 2 flat/building, 3 water, 4 reserved: no trees / scatter
    this.roadId = new Int16Array(sx * sz);    // road index + 1
    this.roadY = new Float32Array(sx * sz);
    this.riverCells = new Map();              // cell -> { bottom, surface }
    this.plan = { roads: [], flats: [], rivers: [] };
    this.gates = []; this.stations = []; this.pois = []; this.anchors = {}; this.people = []; this.roam = []; this.safe = [];
    this.lairs = []; this.later = []; this.terrainDone = false;
  }
  rnd(a = 0, b = 1) { return a + (b - a) * this.r(); }
  chance(p) { return this.r() < p; }
  i(x, z) { return z * this.sx + x; }
  in(x, z) { return x >= 0 && z >= 0 && x < this.sx && z < this.sz; }
  // terrain height (first free cell) from the heightfield
  hAt(x, z) { x = Math.max(0, Math.min(this.sx - 1, Math.floor(x))); z = Math.max(0, Math.min(this.sz - 1, Math.floor(z))); return Math.round(this.H[z * this.sx + x]); }
  // actual top of the voxel column (after buildings/trees: the highest solid + 1)
  groundY(x, z) { return this.world.groundBelow(x + 0.5, z + 0.5, this.sy - 1); }
  // standable floor near the terrain at (x, z)
  floor(x, z) { const w = this.world, h = this.hAt(x, z); const s = w.standY(x + 0.5, z + 0.5, h, 6); return isFinite(s) ? s : h; }
  reserve(x0, z0, x1, z1, v = 4) { for (let z = Math.max(0, z0); z <= Math.min(this.sz - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(this.sx - 1, x1); x++) if (!this.lock[this.i(x, z)]) this.lock[this.i(x, z)] = v; }

  // ---------------------------------------------------------------- planning
  // A road polyline. width in cells; y: a fixed height, or 'follow' (the road
  // follows the natural terrain, smoothed, at most ~1 block per 3 cells).
  road(pts, o = {}) { this.plan.roads.push({ pts, width: o.width ?? 5, block: o.block ?? B.dirt_path, alt: o.alt ?? null, altP: o.altP ?? 0.15, edge: o.edge ?? null, y: o.y ?? this.base, line: o.line ?? null }); return this; }
  // A flat area (plaza, town, building pads) at height y (default: base).
  flat(x0, z0, x1, z1, o = {}) { this.plan.flats.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y: o.y ?? this.base, block: o.block ?? null, alt: o.alt ?? null, altP: o.altP ?? 0.15 }); return this; }
  // A river polyline (flows from the first point to the last), width in cells.
  river(pts, o = {}) { this.plan.rivers.push({ pts, width: o.width ?? 5, depth: o.depth ?? 2 }); return this; }
  // A region gate on edge `side` ('n'|'s'|'e'|'w') leading to region `to`.
  // o.at: position along the edge (default: the middle). Plans a road stub.
  gate(side, to, o = {}) {
    const { sx, sz } = this; const at = o.at ?? (side === 'n' || side === 's' ? Math.floor(sx / 2) : Math.floor(sz / 2));
    const edge = { n: [at + 0.5, 1.5], s: [at + 0.5, sz - 1.5], w: [1.5, at + 0.5], e: [sx - 1.5, at + 0.5] }[side];
    const inward = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] }[side];
    const g = { side, to, at, edge, inward, label: o.label ?? null, y: o.y ?? null };
    this.gates.push(g);
    if (o.road !== false) this.road([[edge[0] - inward[0] * 2, edge[1] - inward[1] * 2], [edge[0] + inward[0] * 24, edge[1] + inward[1] * 24]], { width: o.width ?? 7, block: o.block ?? B.cobble, alt: B.stone_brick, y: o.y ?? 'follow' });
    return g;
  }
  // Gates to every grid neighbour on the world map (o[side] = { at, … } overrides).
  autoGates(o = {}) { for (const [side, to] of Object.entries(neighbours(this.id))) if (o[side] !== false) this.gate(side, to, o[side] ?? {}); return this; }
  // A Window station (fast travel) at (x, z), facing `facing` ('s' default).
  // o.build: false = register the station only (you built your own: a city
  // train station…); interacting at (x, z) opens fast travel.
  station(id, name, x, z, o = {}) {
    const s = { id: `${this.id}:${id}`, name, x: Math.floor(x), z: Math.floor(z), facing: o.facing ?? 's', kind: o.kind ?? 'window', build: o.build !== false };
    this.stations.push(s);
    if (!this.terrainDone) this.flat(s.x - 3, s.z - 3, s.x + 3, s.z + 3, { y: o.y ?? 'auto', block: B.stone_brick });
    return s;
  }
  poi(id, name, icon, x, z, kind = 'landmark') { this.pois.push({ id: `${this.id}:${id}`, name, icon, x, z, kind }); return this; }
  // Quest anchor: a named floor position (y found after the terrain is built).
  anchor(name, x, z, y = null) { this.anchors[name] = { x: x + 0.5, z: z + 0.5, y }; return this; }
  // A dungeon entrance for a main-quest chapter or a side quest: anchor 'lair_<id>'.
  lair(id, x, z, o = {}) { this.anchor('lair_' + id, x, z, o.y ?? null); this.lairs.push({ id, x, z, kind: o.kind ?? 'curtain' }); if (!this.terrainDone) this.flat(x - 3, z - 3, x + 3, z + 3, { y: o.y ?? 'auto' }); return this; }
  // An ambient NPC post. lines: [[...lines], [...]] (one set per talk), barks: short bubbles.
  person(p) { this.people.push({ pose: 'idle', yaw: 0, ...p }); return this; }
  roamZone(x0, z0, x1, z1, o = {}) { this.roam.push({ x0, z0, x1, z1, ...o }); return this; }
  safeZone(x0, z0, x1, z1) { this.safe.push({ x0, z0, x1, z1 }); return this; }

  // ---------------------------------------------------------------- terrain
  // o.fn(x, z) natural height (default: rolling fbm hills around base, amp/scale);
  // o.falloff: cells over which the land rises away from roads/flats (default 10).
  terrain(o = {}) {
    const { sx, sz, noise } = this, N = sx * sz, base = this.base;
    const amp = o.amp ?? 14, scale = o.scale ?? 0.02, falloff = o.falloff ?? 10;
    const fn = o.fn ?? ((x, z) => base + amp * (noise.fbm(x * scale, z * scale, 4) * 0.5 + 0.5) - amp * 0.25);
    const Hn = new Float32Array(N);
    for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) Hn[z * sx + x] = fn(x, z);
    this.Hn = Hn;
    const nat = (x, z) => Hn[Math.max(0, Math.min(sz - 1, Math.round(z))) * sx + Math.max(0, Math.min(sx - 1, Math.round(x)))];
    // sources: cells with a fixed height (roads, flats, river banks)
    const dist = new Float32Array(N).fill(1e9), srcY = new Float32Array(N);
    const src = (x, z, y, d = 0) => { if (!this.in(x, z)) return; const i = z * sx + x; if (d < dist[i]) { dist[i] = d; srcY[i] = y; } };
    const sample = (pts) => {
      const out = [];
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, az] = pts[k], [bx, bz] = pts[k + 1]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
        for (let s = 0; s < n; s++) out.push([ax + (bx - ax) * s / n, az + (bz - az) * s / n]);
      }
      out.push(pts[pts.length - 1]); return out;
    };
    const profile = (S, fixed, monotone = false) => {
      let ys = S.map(([x, z]) => (typeof fixed === 'number' ? fixed : nat(x, z)));
      if (typeof fixed !== 'number') {
        const W = 6, sm = ys.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - W); j <= Math.min(ys.length - 1, i + W); j++) { s += ys[j]; c++; } return s / c; });
        ys = sm;
        if (monotone) for (let i = 1; i < ys.length; i++) ys[i] = Math.min(ys[i], ys[i - 1]);
        const lim = 0.34;
        for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i - 1] - lim, Math.min(ys[i - 1] + lim, ys[i]));
        for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.max(ys[i + 1] - lim, Math.min(ys[i + 1] + lim, ys[i]));
      }
      return ys.map((y) => Math.round(y));
    };
    // flats: 'auto' height = the natural mean of the area
    for (const f of this.plan.flats) {
      if (f.y === 'auto') { let s = 0, c = 0; for (let z = f.z0; z <= f.z1; z++) for (let x = f.x0; x <= f.x1; x++) { s += nat(x, z); c++; } f.y = Math.round(s / Math.max(1, c)); }
      for (let z = f.z0; z <= f.z1; z++) for (let x = f.x0; x <= f.x1; x++) { src(x, z, f.y); if (this.in(x, z)) this.lock[this.i(x, z)] = 2; }
    }
    // road profiles first (rivers dip under the roads that cross them)
    this.plan.roads.forEach((rd) => { rd.samples = sample(rd.pts); rd.ys = profile(rd.samples, rd.y); });
    // rivers: banks two blocks above the water, never above a road that crosses them
    for (const rv of this.plan.rivers) {
      const S = sample(rv.pts);
      let ys = profile(S, 'follow', true);
      const reach = rv.width / 2 + 4;
      ys = ys.map((y, k) => { let m = y; const [px, pz] = S[k]; for (const rd of this.plan.roads) rd.samples.forEach(([qx, qz], j) => { if (Math.abs(qx - px) < reach && Math.abs(qz - pz) < reach && Math.hypot(qx - px, qz - pz) < reach) m = Math.min(m, rd.ys[j]); }); return m; });
      for (let i = 1; i < ys.length; i++) ys[i] = Math.min(ys[i], ys[i - 1] + 0.34);
      for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] + 0.34);
      ys = ys.map((y) => Math.round(y));
      const r = rv.width / 2;
      S.forEach(([px, pz], k) => {
        const bank = ys[k];
        for (let dz = -Math.ceil(r + 2); dz <= Math.ceil(r + 2); dz++) for (let dx = -Math.ceil(r + 2); dx <= Math.ceil(r + 2); dx++) {
          const x = Math.floor(px + dx), z = Math.floor(pz + dz); if (!this.in(x, z)) continue;
          const d = Math.hypot(px - (x + 0.5), pz - (z + 0.5));
          if (d <= r) { const i = this.i(x, z); const cur = this.riverCells.get(i); const surf = bank - 2; if (!cur || surf < cur.surface) this.riverCells.set(i, { surface: surf, bottom: surf - rv.depth }); this.lock[i] = 3; }
          src(x, z, bank, Math.max(0, d - r));
        }
      });
    }
    // roads last, so they win over flats and rivers (bridges)
    this.plan.roads.forEach((rd, ri) => {
      const S = rd.samples, ys = rd.ys;
      const r = rd.width / 2;
      S.forEach(([px, pz], k) => {
        for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          const x = Math.floor(px + dx), z = Math.floor(pz + dz); if (!this.in(x, z)) continue;
          const d = Math.hypot(px - (x + 0.5), pz - (z + 0.5)); if (d > r) continue;
          const i = this.i(x, z);
          if (!this.roadId[i] || d < 0.75) { this.roadId[i] = ri + 1; this.roadY[i] = ys[k]; }
          dist[i] = 0; srcY[i] = this.roadY[i];
          if (this.lock[i] !== 3) this.lock[i] = 1;
        }
      });
    });
    // chamfer distance transform, carrying the nearest source's height
    const pass = (x, z, nx, nz, c) => { if (!this.in(nx, nz)) return; const i = z * sx + x, j = nz * sx + nx; if (dist[j] + c < dist[i]) { dist[i] = dist[j] + c; srcY[i] = srcY[j]; } };
    for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) { pass(x, z, x - 1, z, 1); pass(x, z, x, z - 1, 1); pass(x, z, x - 1, z - 1, 1.414); pass(x, z, x + 1, z - 1, 1.414); }
    for (let z = sz - 1; z >= 0; z--) for (let x = sx - 1; x >= 0; x--) { pass(x, z, x + 1, z, 1); pass(x, z, x, z + 1, 1); pass(x, z, x + 1, z + 1, 1.414); pass(x, z, x - 1, z + 1, 1.414); }
    for (let i = 0; i < N; i++) {
      if (dist[i] >= 1e8) { this.H[i] = Hn[i]; continue; }
      const t = smoothstep(0, falloff, dist[i]);
      this.H[i] = srcY[i] + (Hn[i] - srcY[i]) * t;
    }
    this.dist = dist;
    // gates take the road height at the edge
    for (const g of this.gates) g.y ??= Math.round(this.H[this.i(Math.floor(g.edge[0]), Math.floor(g.edge[1]))]);
    this.terrainDone = true;
    return this;
  }
  // Fill the columns. top/sub/stone blocks; rock on slopes >= rockSlope;
  // sea: water up to this height over low ground (sand shores).
  carve(o = {}) {
    const { sx, sz, world: W } = this;
    const top = o.top ?? B.grass, sub = o.sub ?? B.dirt, stone = o.stone ?? B.stone, rock = o.rock ?? B.stone, rock2 = o.rock2 ?? B.mossy_brick;
    const rockSlope = o.rockSlope ?? 2, sea = o.sea ?? -1, shore = o.shore ?? B.sand;
    const Hr = new Int16Array(sx * sz);
    for (let i = 0; i < Hr.length; i++) Hr[i] = Math.max(1, Math.min(this.sy - 8, Math.round(this.H[i])));
    const h = (x, z) => Hr[Math.max(0, Math.min(sz - 1, z)) * sx + Math.max(0, Math.min(sx - 1, x))];
    for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
      const i = z * sx + x, y = Hr[i];
      const slope = Math.max(Math.abs(y - h(x + 1, z)), Math.abs(y - h(x - 1, z)), Math.abs(y - h(x, z + 1)), Math.abs(y - h(x, z - 1)));
      const rv = this.riverCells.get(i);
      if (rv && !this.roadId[i]) {
        W.column(x, z, 0, rv.bottom - 2, stone); W.setRaw(x, rv.bottom - 1, z, B.sand);
        W.column(x, z, rv.bottom, rv.surface, B.water); continue;
      }
      if (rv && this.roadId[i]) {   // a bridge: water under a plank deck
        W.column(x, z, 0, rv.bottom - 2, stone); W.setRaw(x, rv.bottom - 1, z, B.sand);
        W.column(x, z, rv.bottom, rv.surface, B.water);
        W.setRaw(x, y - 1, z, B.planks); continue;
      }
      const isRock = slope >= rockSlope && !this.roadId[i] && this.lock[i] !== 2;
      W.column(x, z, 0, y - 4, stone);
      W.column(x, z, y - 3, y - 2, isRock ? rock : sub);
      let t = isRock ? (this.chance(0.35) ? rock2 : rock) : (o.topFn ? o.topFn(x, z, y) : top);
      if (sea > 0 && y <= sea + 1 && !isRock) t = shore;
      W.setRaw(x, y - 1, z, t);
      if (sea > 0 && y < sea) { W.column(x, z, y, sea - 1, B.water); this.lock[i] = 3; }
    }
    this.Hr = Hr;
    return this;
  }
  // Pave the planned roads and flats (their blocks), clearing the air above.
  paveRoads() {
    const { sx, sz, world: W } = this;
    for (const f of this.plan.flats) if (f.block) for (let z = f.z0; z <= f.z1; z++) for (let x = f.x0; x <= f.x1; x++) {
      if (!this.in(x, z) || this.roadId[this.i(x, z)]) continue;
      const y = this.hAt(x, z); W.setRaw(x, y - 1, z, f.alt && this.chance(f.altP) ? f.alt : f.block);
    }
    for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
      const i = z * sx + x, ri = this.roadId[i]; if (!ri) continue;
      if (this.riverCells.has(i)) continue;
      const rd = this.plan.roads[ri - 1], y = this.hAt(x, z);
      W.setRaw(x, y - 1, z, rd.alt && this.chance(rd.altP) ? rd.alt : rd.block);
    }
    // centre lines (city roads) and kerbs
    for (const rd of this.plan.roads) if (rd.line || rd.edge) rd.samples?.forEach(([px, pz], k) => {
      const x = Math.floor(px), z = Math.floor(pz); if (!this.in(x, z)) return;
      if (rd.line && k % 4 < 2) W.setRaw(x, this.hAt(x, z) - 1, z, rd.line);
    });
    return this;
  }

  // ---------------------------------------------------------------- dressing
  // Trees. kind: 'oak' | 'cedar' | 'dead' | 'pine' | 'bamboo' | 'palm' | 'sakura'
  tree(x, z, kind = 'oak', o = {}) {
    const W = this.world, y = o.y ?? this.groundY(x, z); if (!isFinite(y)) return false;
    const k = this.kit;
    if (kind === 'oak') k.tree(x, z, y, { h: o.h ?? 4 + Math.floor(this.r() * 3) });
    else if (kind === 'dead') { const h = o.h ?? 4 + Math.floor(this.r() * 3); for (let i = 0; i < h; i++) W.set(x, y + i, z, B.bark_dark); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.chance(0.5)) W.set(x + dx, y + h - 1 - Math.floor(this.r() * 2), z + dz, B.bark_dark); if (this.chance(0.5)) for (let i = 0; i < 3; i++) W.set(x + Math.floor(this.rnd(-1, 2)), y + h, z + Math.floor(this.rnd(-1, 2)), B.dead_leaves); }
    else if (kind === 'cedar' || kind === 'pine') {
      const h = o.h ?? 8 + Math.floor(this.r() * 5);
      for (let i = 0; i < h; i++) W.set(x, y + i, z, B.bark_dark);
      const t = y + h;
      for (let dy = -Math.floor(h * 0.7); dy <= 1; dy++) {
        const r = dy >= 0 ? 0 : dy > -3 ? 1 : (dy & 1) ? 1 : 2;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          if (!W.get(x + dx, t + dy, z + dz)) W.set(x + dx, t + dy, z + dz, o.leaves ?? B.leaves);
        }
      }
    } else if (kind === 'bamboo') {
      for (let n = 0; n < 4; n++) { const bx = x + Math.floor(this.rnd(-1, 2)), bz = z + Math.floor(this.rnd(-1, 2)); const h = 6 + Math.floor(this.r() * 5); this.props.box(bx + 0.5, y, bz + 0.5, 0.22, h, 0.22, 0x6a9a3a, { sway: 0.25 }); for (let s = 2; s < h; s += 1.4) this.props.box(bx + 0.5 + this.rnd(-0.5, 0.5), y + s, bz + 0.5 + this.rnd(-0.5, 0.5), 0.9, 0.08, 0.3, 0x5a8a2a, { sway: 0.6, ry: this.rnd(0, 3) }); }
    } else if (kind === 'palm') {
      const h = 5 + Math.floor(this.r() * 3), lean = this.rnd(-0.25, 0.25);
      for (let i = 0; i < h; i++) this.props.box(x + 0.5 + lean * i, y + i, z + 0.5, 0.45, 1, 0.45, 0x8a6a42, { vary: 0.08 });
      for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; this.props.box(x + 0.5 + lean * h + Math.cos(ang) * 1.2, y + h, z + 0.5 + Math.sin(ang) * 1.2, 2.6, 0.12, 0.6, 0x4a8a32, { ry: -ang, rz: 0.3, sway: 0.5 }); }
      W.set(x, y, z, B.barrier); W.set(x, y + 1, z, B.barrier);
    } else if (kind === 'sakura') {
      const h = 4; for (let i = 0; i < h; i++) W.set(x, y + i, z, B.bark_dark);
      const cols = [0xf7bccb, 0xf2a3ba, 0xfbcfda, 0xec93ad];
      this.props.box(x + 0.5, y + h, z + 0.5, 3.2, 1.6, 3.2, cols[1], { emit: 0.05, sway: 0.3 });
      for (let i = 0; i < 16; i++) { const a = this.r() * 6.28, d = this.rnd(0.6, 2.4), s = this.rnd(0.7, 1.3); this.props.box(x + 0.5 + Math.cos(a) * d, y + h + this.rnd(-0.4, 1.4), z + 0.5 + Math.sin(a) * d, s, s * 0.8, s, cols[i % 4], { emit: 0.06, sway: 0.55, ry: a }); }
    }
    return true;
  }
  // can a tree / prop stand here? (no roads, flats, water, steep or reserved ground)
  freeCell(x, z, r = 1) {
    if (x < 3 || z < 3 || x > this.sx - 4 || z > this.sz - 4) return false;
    const y = this.groundY(x, z); if (!isFinite(y)) return false;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const i = this.i(x + dx, z + dz); if (this.lock[i]) return false;
      const yy = this.groundY(x + dx, z + dz); if (!isFinite(yy) || Math.abs(yy - y) > 1 || this.world.get(x + dx, yy, z + dz)) return false;
      const b = this.world.get(x + dx, yy - 1, z + dz); if (b === B.water || BLOCKS[b]?.liquid) return false;
    }
    return true;
  }
  // Scatter trees: o.density per cell, o.kinds [[kind, weight]…] or a list, o.where(x, z) filter, o.rect
  forest(o = {}) {
    const [x0, z0, x1, z1] = o.rect ?? [2, 2, this.sx - 3, this.sz - 3];
    const kinds = o.kinds ?? ['oak'], step = o.step ?? 3, dens = o.density ?? 0.4;
    const pickKind = () => { const k = kinds[Math.floor(this.r() * kinds.length)]; return Array.isArray(k) ? k[0] : k; };
    let n = 0;
    for (let z = z0; z <= z1; z += step) for (let x = x0; x <= x1; x += step) {
      const px = x + Math.floor(this.rnd(0, step)), pz = z + Math.floor(this.rnd(0, step));
      if (!this.chance(typeof dens === 'function' ? dens(px, pz) : dens)) continue;
      if (o.where && !o.where(px, pz)) continue;
      if (!this.freeCell(px, pz, o.clear ?? 1)) continue;
      if (this.tree(px, pz, pickKind())) { n++; this.lock[this.i(px, pz)] = 4; }
    }
    return n;
  }
  // grass / flowers on the grass, tiled
  scatter(o = {}) { this.kit.scatter(o.x0 ?? 1, o.z0 ?? 1, o.x1 ?? this.sx - 2, o.z1 ?? this.sz - 2, { density: o.density ?? 0.12, types: o.types }); return this; }
  // stone lantern (tōrō) with a light; s = scale
  lantern(x, z, o = {}) {
    const P = this.props, y = o.y ?? this.groundY(Math.floor(x), Math.floor(z)), s = o.s ?? 1;
    P.box(x, y, z, 0.72 * s, 0.22 * s, 0.72 * s, 0x6e6c6a); P.box(x, y + 0.22 * s, z, 0.3 * s, 0.7 * s, 0.3 * s, 0x8e8c88);
    P.box(x, y + 0.92 * s, z, 0.64 * s, 0.14 * s, 0.64 * s, 0x8e8c88);
    P.box(x, y + 1.06 * s, z, 0.44 * s, 0.4 * s, 0.44 * s, o.glow ?? 0xffd89a, { emit: 2.6, vary: 0 });
    P.box(x, y + 1.46 * s, z, 0.86 * s, 0.14 * s, 0.86 * s, 0x6e6c6a); P.box(x, y + 1.6 * s, z, 0.46 * s, 0.16 * s, 0.46 * s, 0x8e8c88);
    if (o.light !== false) this.world.addLight(x, y + 1.3 * s, z, o.lightColor ?? 0xffb060, 3.2, 8);
    this.world.set(Math.floor(x), y, Math.floor(z), B.barrier);
  }
  streetLight(x, z, o = {}) {
    const P = this.props, y = o.y ?? this.groundY(Math.floor(x), Math.floor(z));
    P.box(x, y, z, 0.16, 4.6, 0.16, 0x3a3e45); P.box(x + 0.5, y + 4.5, z, 1.2, 0.12, 0.22, 0x3a3e45);
    P.box(x + 1.0, y + 4.38, z, 0.44, 0.12, 0.3, 0xfff0d0, { emit: 3, vary: 0 });
    if (o.light !== false) this.world.addLight(x + 1, y + 4, z, 0xffe6b0, 3, 9);
    this.world.set(Math.floor(x), y, Math.floor(z), B.barrier);
  }
  // torii; along 'x': posts on x (the gate faces ±z)
  torii(x, y, z, w = 5, h = 5.2, o = {}) {
    const P = this.props, along = o.along ?? 'x', red = o.color ?? 0xd0391e, black = 0x1a1412, thick = o.thick ?? 0.5;
    const at = (a, yy, b, sx, sy, sz, col, oo) => along === 'x' ? P.box(x + a, yy, z + b, sx, sy, sz, col, oo) : P.box(x + b, yy, z + a, sz, sy, sx, col, oo);
    for (const s of [-1, 1]) {
      at(s * w / 2, y, 0, thick, h, thick, red, { vary: 0.02 }); at(s * w / 2, y, 0, thick + 0.16, 0.42, thick + 0.16, black);
      if (o.collide !== false) for (let yy = y; yy < y + 3; yy++) this.world.set(Math.floor(along === 'x' ? x + s * w / 2 : x), yy, Math.floor(along === 'x' ? z : z + s * w / 2), B.barrier);
    }
    at(0, y + h - 1.1, 0, w + 1.0, thick * 0.6, thick * 0.75, red);
    at(0, y + h - 0.3, 0, w + 1.5, 0.32, thick * 1.05, red);
    at(0, y + h, 0, w + 2.0, 0.34, thick * 1.35, black);
  }
  // A Japanese house: plaster/timber walls, a door, a hipped tile roof (fades when you go in).
  // (x0, z0) north-west corner, w × d footprint. o: { floors, wall, post, roof, door: 'n'|'s'|'e'|'w', y }
  house(x0, z0, w, d, o = {}) {
    const W = this.world, x1 = x0 + w - 1, z1 = z0 + d - 1;
    const y = o.y ?? this.hAt(x0 + (w >> 1), z0 + (d >> 1));
    const h = (o.floors ?? 1) * 4, wall = o.wall ?? B.plaster, post = o.post ?? B.dark_planks, beam = o.beam ?? B.dark_planks;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { W.column(x, z, y - 8, y - 2, B.stone); W.setRaw(x, y - 1, z, o.floor ?? B.floor_boards); for (let yy = y; yy < y + h + 8; yy++) W.setRaw(x, yy, z, 0); }
    for (let yy = y; yy < y + h; yy++) {
      const lvl = yy - y;
      for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) W.set(x, yy, z, (x - x0) % 3 === 0 || x === x1 ? post : lvl === h - 1 ? beam : (lvl === 1 && (x - x0) % 3 === 1 && o.windows !== false) ? (o.win ?? B.lantern) : wall);
      for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) W.set(x, yy, z, (z - z0) % 3 === 0 || z === z1 ? post : lvl === h - 1 ? beam : wall);
    }
    const door = o.door ?? 's', cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let yy = y; yy < y + 3; yy++) for (const t of [-1, 0]) {
      if (door === 's') W.set(cx + t, yy, z1, 0); if (door === 'n') W.set(cx + t, yy, z0, 0);
      if (door === 'e') W.set(x1, yy, cz + t, 0); if (door === 'w') W.set(x0, yy, cz + t, 0);
    }
    // hipped roof
    let ax0 = x0 - 1, az0 = z0 - 1, ax1 = x1 + 1, az1 = z1 + 1, yy = y + h, lvl = 0;
    const roof = o.roof ?? B.roof;
    while (ax0 <= ax1 && az0 <= az1 && lvl < 8) {
      const last = ax1 - ax0 < 2 || az1 - az0 < 2;
      for (let z = az0; z <= az1; z++) for (let x = ax0; x <= ax1; x++) { const ring = Math.min(x - ax0, ax1 - x, z - az0, az1 - z) < 1; if (ring || last) W.set(x, yy, z, lvl === 0 && ring ? B.dark_planks : roof); }
      if (last) break;
      ax0++; az0++; ax1--; az1--; yy++; lvl++;
    }
    W.addRoof([x0 - 1, y + h, z0 - 1], [x1 + 1, yy + 1, z1 + 1], [[x0, y, z0], [x1, y + h - 1, z1]]);
    W.addLight(cx + 0.5, y + 2.5, cz + 0.5, 0xffc080, 2.4, 7);
    this.reserve(x0 - 1, z0 - 1, x1 + 1, z1 + 1, 2);
    const dz = door === 's' ? z1 + 1 : door === 'n' ? z0 - 1 : cz, dx = door === 'e' ? x1 + 1 : door === 'w' ? x0 - 1 : cx;
    return { x0, z0, x1, z1, y, door: V(dx + 0.5, y, dz + 0.5), center: V(cx + 0.5, y, cz + 0.5) };
  }
  // A city building: concrete shell, window grid, ground-floor door and an
  // open ground floor (the floors above fade when you walk in).
  tower(x0, z0, w, d, floors = 4, o = {}) {
    const W = this.world, x1 = x0 + w - 1, z1 = z0 + d - 1;
    const y = o.y ?? this.hAt(x0 + (w >> 1), z0 + (d >> 1));
    const fh = 4, top = y + floors * fh, wall = o.wall ?? B.concrete, win = o.win ?? (this.chance(0.5) ? B.window : B.window_dark), trim = o.trim ?? B.concrete_pillar;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { W.column(x, z, y - 8, y - 2, B.stone); W.setRaw(x, y - 1, z, o.floor ?? B.polished); for (let yy = y; yy <= top + 2; yy++) W.setRaw(x, yy, z, 0); }
    for (let yy = y; yy < top; yy++) {
      const lvl = (yy - y) % fh;
      const pick = (t, len) => (t === 0 || t === len || t % 4 === 0) ? trim : lvl === fh - 1 ? wall : (lvl >= 1 && yy >= y + fh) ? win : wall;
      for (let x = x0; x <= x1; x++) { W.set(x, yy, z0, pick(x - x0, w - 1)); W.set(x, yy, z1, pick(x - x0, w - 1)); }
      for (let z = z0; z <= z1; z++) { W.set(x0, yy, z, pick(z - z0, d - 1)); W.set(x1, yy, z, pick(z - z0, d - 1)); }
      if (lvl === 0 && yy > y) for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 1; x < x1; x++) W.set(x, yy - 1, z, B.concrete);
    }
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, top, z, (x === x0 || x === x1 || z === z0 || z === z1) ? trim : B.concrete);
    const door = o.door ?? 's', cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let yy = y; yy < y + 3; yy++) for (const t of [-1, 0, 1]) {
      if (door === 's') W.set(cx + t, yy, z1, 0); if (door === 'n') W.set(cx + t, yy, z0, 0);
      if (door === 'e') W.set(x1, yy, cz + t, 0); if (door === 'w') W.set(x0, yy, cz + t, 0);
    }
    if (o.sign) { const c = [B.neon_pink, B.sign, B.lantern][Math.floor(this.r() * 3)]; for (let yy = y + fh + 1; yy < Math.min(top - 1, y + fh + 6); yy++) W.set(door === 'e' || door === 'w' ? cx : x1, yy, door === 'e' || door === 'w' ? z1 : cz, c); }
    if (floors > 1) W.addRoof([x0, y + fh - 1, z0], [x1, top + 1, z1], [[x0 + 1, y, z0 + 1], [x1 - 1, y + fh - 2, z1 - 1]]);
    W.addLight(cx + 0.5, y + 2.6, cz + 0.5, o.lightColor ?? 0xfff0d0, 2.6, 8);
    this.reserve(x0 - 1, z0 - 1, x1 + 1, z1 + 1, 2);
    const dz = door === 's' ? z1 + 1 : door === 'n' ? z0 - 1 : cz, dx = door === 'e' ? x1 + 1 : door === 'w' ? x0 - 1 : cx;
    return { x0, z0, x1, z1, y, top, door: V(dx + 0.5, y, dz + 0.5), center: V(cx + 0.5, y, cz + 0.5) };
  }
  // Ruined walls and pillars (mossy, broken) around a centre.
  ruin(cx, cz, r = 6, o = {}) {
    const W = this.world, y = o.y ?? this.hAt(cx, cz);
    const ids = o.blocks ?? [B.mossy_brick, B.stone_brick, B.cracked_brick, B.stone];
    for (let a = 0; a < Math.PI * 2; a += 0.18) {
      if (this.chance(0.35)) continue;
      const x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r);
      const gy = this.groundY(x, z); if (!isFinite(gy) || Math.abs(gy - y) > 2) continue;
      const hh = 1 + Math.floor(this.r() * (o.h ?? 4));
      for (let k = 0; k < hh; k++) W.set(x, gy + k, z, ids[Math.floor(this.r() * ids.length)]);
    }
    for (let k = 0; k < (o.pillars ?? 4); k++) {
      const a = this.r() * Math.PI * 2, d = this.rnd(1, r - 2), x = Math.round(cx + Math.cos(a) * d), z = Math.round(cz + Math.sin(a) * d);
      const gy = this.groundY(x, z); if (!isFinite(gy)) continue;
      const hh = 2 + Math.floor(this.r() * 5); for (let q = 0; q < hh; q++) W.set(x, gy + q, z, q === hh - 1 && this.chance(0.4) ? B.cracked_brick : B.stone_brick);
    }
    for (let k = 0; k < 6; k++) { const a = this.r() * 6.28, d = this.rnd(0, r); this.deco.add(this.chance(0.5) ? 'bone' : 'paper', cx + Math.cos(a) * d, this.groundY(Math.round(cx + Math.cos(a) * d), Math.round(cz + Math.sin(a) * d)), cz + Math.sin(a) * d, { mode: 'flat', scale: 0.9 }); }
    this.reserve(cx - r, cz - r, cx + r, cz + r, 4);
  }
  fence(x0, z0, x1, z1, y = null, col = 0x4a3020) {
    const P = this.props, len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2)), ry = Math.atan2(x1 - x0, z1 - z0);
    const yy = y ?? this.groundY(Math.floor(x0), Math.floor(z0));
    for (let i = 0; i <= n; i++) { const t = i / n; P.box(x0 + (x1 - x0) * t, yy, z0 + (z1 - z0) * t, 0.16, 1.05, 0.16, col); }
    for (const hh of [0.42, 0.85]) P.box((x0 + x1) / 2, yy + hh, (z0 + z1) / 2, 0.08, 0.1, len, 0x7a5434, { ry });
  }

  // ---------------------------------------------------------------- finish
  buildGate(g) {
    const W = this.world, P = this.props;
    const [ex, ez] = g.edge, [ix, iz] = g.inward;
    const tx = ex + ix * 6, tz = ez + iz * 6;
    const y = this.floor(Math.floor(tx), Math.floor(tz));
    const along = g.side === 'n' || g.side === 's' ? 'x' : 'z';
    this.torii(tx, y, tz, 6, 6, { along, color: 0xd0391e, thick: 0.6 });
    for (const s of [-1, 1]) this.lantern(tx + (along === 'x' ? s * 5 : ix * -1), tz + (along === 'z' ? s * 5 : iz * -1), { y, s: 1.1 });
    const toDef = REGIONS[g.to];
    const name = g.label ?? toDef?.name ?? g.to;
    this.deco.extra(() => {   // rebuilt on every load (clearLevel disposes the old geometry)
      const sign = signMesh([`→ ${name}`], { w: 4, h: 0.9, color: toDef?.accent ?? '#ffd84a' });
      sign.position.set(tx, y + 4.3, tz);
      sign.rotation.y = along === 'x' ? 0 : Math.PI / 2;
      return sign;
    });
    const pos = V(ex + ix * 3.5, this.floor(Math.floor(ex + ix * 3.5), Math.floor(ez + iz * 3.5)), ez + iz * 3.5);
    const ax = ex + ix * 12, az = ez + iz * 12;
    g.pos = pos; g.arrive = V(ax, this.floor(Math.floor(ax), Math.floor(az)), az); g.radius = 4.2;
    g.label = `Travel to ${name}`;
    g.yaw = Math.atan2(ix, iz);
    W.addLight(tx, y + 4, tz, 0xffd0a0, 3, 9);
  }
  buildStation(s) {
    const W = this.world, P = this.props, x = s.x, z = s.z;
    const y = this.floor(x, z);
    if (!s.build) { s.pos = V(x + 0.5, y, z + 0.5); s.shrine = s.pos.clone(); return; }   // the region built its own (a train station…)
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { W.set(x + dx, y - 1, z + dz, (dx + dz) & 1 ? B.stone_brick : B.polished); for (let k = 0; k < 6; k++) W.set(x + dx, y + k, z + dz, 0); }
    // four posts, a tiled canopy and a glowing Window shrine at the back
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) P.box(x + 0.5 + dx * 0.95, y, z + 0.5 + dz * 0.95, 0.28, 3.4, 0.28, 0x2a2a34);
    P.box(x + 0.5, y + 3.4, z + 0.5, 5.6, 0.25, 5.6, 0x2a3a5a); P.box(x + 0.5, y + 3.65, z + 0.5, 4.2, 0.4, 4.2, 0x1e2a44);
    const back = { s: [0, -1], n: [0, 1], e: [-1, 0], w: [1, 0] }[s.facing] ?? [0, -1];
    const bx = x + 0.5 + back[0] * 1.6, bz = z + 0.5 + back[1] * 1.6;
    P.box(bx, y, bz, 1.2, 1.1, 1.2, 0x4a4e58);
    P.box(bx, y + 1.1, bz, 0.9, 1.3, 0.9, 0x6ad8ff, { emit: 2.2, vary: 0 });
    P.box(bx, y + 2.4, bz, 1.3, 0.16, 1.3, 0x2a2a34);
    W.set(Math.floor(bx), y, Math.floor(bz), B.barrier); W.set(Math.floor(bx), y + 1, Math.floor(bz), B.barrier);
    W.addLight(bx, y + 1.8, bz, 0x6ad8ff, 4, 9);
    this.deco.extra(() => {
      const sign = signMesh(['窓 WINDOW', s.name], { w: 3.2, h: 1.4, color: '#7ae0ff', font: 'bold 40px "Pixelify Sans", sans-serif' });
      sign.position.set(x + 0.5 - back[0] * 2.85, y + 2.9, z + 0.5 - back[1] * 2.85);
      sign.rotation.y = Math.atan2(-back[0], -back[1]);
      return sign;
    });
    s.pos = V(x + 0.5, y, z + 0.5);
    s.shrine = V(bx, y, bz);
    this.reserve(x - 3, z - 3, x + 3, z + 3, 2);
  }
  // Barriers round the edge of the map (6 blocks above the ground).
  edges() {
    const W = this.world, { sx, sz } = this;
    const wall = (x, z) => { const y = this.groundY(x, z); const y0 = isFinite(y) ? y : this.base; for (let yy = y0; yy < Math.min(this.sy, y0 + 8); yy++) if (!W.get(x, yy, z)) W.setRaw(x, yy, z, B.barrier); };
    for (let x = 0; x < sx; x++) { wall(x, 0); wall(x, sz - 1); }
    for (let z = 0; z < sz; z++) { wall(0, z); wall(sx - 1, z); }
  }
  // Distant mountains in a ring round the map, plus a far ground plane.
  backdrop(o = {}) {
    const { sx, sz } = this, cx = sx / 2, cz = sz / 2, R0 = Math.hypot(sx, sz) / 2 + 30;
    const c0 = new THREE.Color(o.c0 ?? 0x2a3446), c1 = new THREE.Color(o.c1 ?? 0x7a8098), by = o.y ?? this.base - 18;
    this.deco.extra(() => {
      const pos = [], col = [], R = mulberry32(this.seed + 5);
      for (const [n, r0, r1, h0, h1] of [[22, R0, R0 + 30, 30, 60], [16, R0 + 40, R0 + 70, 46, 86]]) for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + R() * 0.3, r = r0 + R() * (r1 - r0), hgt = h0 + R() * (h1 - h0), w = 34 + R() * 34;
        const mx = cx + Math.cos(a) * r, mz = cz + Math.sin(a) * r, peak = [mx, by + hgt, mz];
        for (let s = 0; s < 5; s++) {
          const b0 = a + (s / 5) * Math.PI * 2, b1 = a + ((s + 1) / 5) * Math.PI * 2;
          pos.push(mx + Math.cos(b0) * w, by, mz + Math.sin(b0) * w, ...peak, mx + Math.cos(b1) * w, by, mz + Math.sin(b1) * w);
          const sh = 0.8 + 0.2 * Math.cos(a + s);
          col.push(c0.r * sh, c0.g * sh, c0.b * sh, c1.r, c1.g, c1.b, c0.r * sh, c0.g * sh, c0.b * sh);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.frustumCulled = false; m.name = 'region-backdrop';
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: o.ground ?? 0x1c2a22, roughness: 1 }));
      floor.position.set(cx, by + 2, cz); floor.name = 'region-floor';
      return [m, floor];
    });
  }
  // Build gates and stations, edge walls and lights, and return the level object.
  // o: { spawn: [x, z] | Vector3, biome, sunOffset, titleCam, backdrop: false | {…}, extra: {…} }
  finish(o = {}) {
    for (const g of this.gates) this.buildGate(g);
    for (const s of this.stations) this.buildStation(s);
    for (const fn of this.later) fn();
    this.edges();
    if (o.backdrop !== false) this.backdrop(o.backdrop ?? {});
    this.deco.extra(() => this.props.build());
    this.world.collectBlockLights();
    const anchors = {};
    for (const [k, a] of Object.entries(this.anchors)) anchors[k] = V(a.x, a.y ?? this.floor(Math.floor(a.x), Math.floor(a.z)), a.z);
    const spawnXZ = o.spawn ?? this.stations[0]?.pos ?? [this.sx / 2, this.sz / 2];
    const spawn = spawnXZ.isVector3 ? spawnXZ.clone() : V(spawnXZ[0] + 0.5, this.floor(Math.floor(spawnXZ[0]), Math.floor(spawnXZ[1])), spawnXZ[1] + 0.5);
    const people = this.people.map((p) => ({ ...p, pos: p.pos ?? V(p.x + 0.5, this.floor(Math.floor(p.x), Math.floor(p.z)), p.z + 0.5) }));
    const pois = this.pois.map((p) => ({ ...p, pos: V(p.x + 0.5, this.floor(Math.floor(p.x), Math.floor(p.z)), p.z + 0.5) }));
    const H = this.H, sx = this.sx, sz = this.sz;
    return {
      world: this.world, deco: this.deco, shafts: this.shafts, kit: this.kit,
      biome: o.biome ?? this.def.biome, sunOffset: o.sunOffset ?? null,
      spawn, gates: this.gates, stations: this.stations, pois, anchors, people, lairs: this.lairs,
      roam: this.roam, safe: this.safe,
      roads: this.plan.roads.map((r) => r.pts),
      rivers: this.plan.rivers.map((r) => r.pts),
      groundAt: (x, z) => Math.round(H[Math.max(0, Math.min(sz - 1, Math.floor(z))) * sx + Math.max(0, Math.min(sx - 1, Math.floor(x)))]),
      titleCam: o.titleCam ?? { center: spawn.clone().setY(spawn.y + 4), dist: 40, pitch: 24 * Math.PI / 180 },
      stage: o.stage ?? spawn.clone(),
      ...(o.extra ?? {}),
    };
  }
}

// A plain region (Phase 1 placeholder): terrain in the region's palette,
// roads from every gate to a central plaza with a Window station, a few
// buildings and trees. Phase 2 replaces each with a real build.
//   p: { size, base, amp, scale, top, sub, rock, road, plaza, trees: [kinds],
//        treeDensity, sea, buildings: 'houses'|'towers'|'ruins'|'temples'|null,
//        roam: [kinds], dome: color (Culling Game barrier), fn(x, z) height }
export function buildBasicRegion(ctx, p = {}) {
  const R = new RegionBuilder(ctx, { size: p.size ?? [256, 64, 256], base: p.base ?? 10 });
  const cx = R.sx >> 1, cz = R.sz >> 1;
  R.autoGates();
  for (const g of R.gates) R.road([[g.edge[0], g.edge[1]], [cx + 0.5, cz + 0.5]], { width: 7, block: p.road ?? B.cobble, alt: p.roadAlt ?? B.stone_brick, y: R.base, line: p.line ?? null });
  R.flat(cx - 14, cz - 14, cx + 14, cz + 14, { y: R.base, block: p.plaza ?? B.stone_brick, alt: p.plazaAlt ?? B.cobble });
  R.station('plaza', p.stationName ?? `${R.def.name ?? ctx.id} Station`, cx, cz - 9, { y: R.base });
  R.terrain({ amp: p.amp ?? 16, scale: p.scale ?? 0.02, fn: p.fn, falloff: p.falloff ?? 12 });
  R.carve({ top: p.top ?? B.grass, sub: p.sub ?? B.dirt, rock: p.rock ?? B.stone, rock2: p.rock2 ?? B.mossy_brick, sea: p.sea ?? -1 });
  R.paveRoads();
  if (p.buildings === 'houses' || p.buildings === 'temples') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3, d = 24; const x = Math.round(cx + Math.cos(a) * d) - 4, z = Math.round(cz + Math.sin(a) * d) - 3; if (R.lock[R.i(x, z)] === 1) continue; R.house(x, z, 8, 7, { door: Math.abs(Math.cos(a)) > 0.7 ? (Math.cos(a) > 0 ? 'w' : 'e') : (Math.sin(a) > 0 ? 'n' : 's'), floors: p.buildings === 'temples' ? 2 : 1, roof: p.roofBlock ?? B.roof }); }
  if (p.buildings === 'towers') for (let gz = -3; gz <= 3; gz++) for (let gx = -3; gx <= 3; gx++) {
    if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue;
    const x = cx + gx * 22 - 7, z = cz + gz * 22 - 7;
    if (x < 8 || z < 8 || x + 16 > R.sx - 8 || z + 16 > R.sz - 8) continue;
    let onRoad = false; for (let dz = 0; dz < 15 && !onRoad; dz += 2) for (let dx = 0; dx < 15; dx += 2) if (R.roadId[R.i(x + dx, z + dz)]) { onRoad = true; break; }
    if (onRoad) continue;
    R.tower(x, z, 10 + Math.floor(R.r() * 5), 10 + Math.floor(R.r() * 5), 2 + Math.floor(R.r() * (p.maxFloors ?? 6)), { sign: R.chance(0.5), door: gz < 0 ? 's' : 'n' });
  }
  if (p.buildings === 'ruins') for (let i = 0; i < 6; i++) { const a = R.r() * 6.28, d = R.rnd(30, 90); R.ruin(Math.round(cx + Math.cos(a) * d), Math.round(cz + Math.sin(a) * d), 5 + Math.floor(R.r() * 4)); }
  for (const g of R.gates) for (const s of [-1, 1]) { const t = 0.55; const x = g.edge[0] + (cx - g.edge[0]) * t + (g.side === 'n' || g.side === 's' ? s * 5 : 0), z = g.edge[1] + (cz - g.edge[1]) * t + (g.side === 'e' || g.side === 'w' ? s * 5 : 0); (p.buildings === 'towers' ? R.streetLight(x, z) : R.lantern(x, z)); }
  for (const [x, z] of [[cx - 12, cz - 12], [cx + 12, cz - 12], [cx - 12, cz + 12], [cx + 12, cz + 12]]) (p.buildings === 'towers' ? R.streetLight(x + 0.5, z + 0.5) : R.lantern(x + 0.5, z + 0.5));
  if (p.trees !== null) R.forest({ kinds: p.trees ?? ['oak'], density: p.treeDensity ?? 0.3, step: 3 });
  R.scatter({ density: p.grass ?? 0.08, types: p.grassTypes });
  R.roamZone(8, 8, R.sx - 8, R.sz - 8, { kinds: p.roam ?? ['swarmer', 'spitter'], level: p.level ?? 1 });
  R.safeZone(cx - 18, cz - 18, cx + 18, cz + 18);
  R.anchor('plaza', cx, cz + 4);
  R.person({ id: `${ctx.id}_window`, name: 'Window Agent', look: 'npc_ijichi', x: cx + 3, z: cz - 6, yaw: 0, lines: [[`This is ${R.def.name ?? ctx.id}. The Window keeps a station here for sorcerers.`, 'Touch the station to travel to any Window you have found.']] });
  if (p.dome) {
    const col = new THREE.Color(p.dome), r = Math.hypot(R.sx, R.sz) * 0.5 + 6;
    R.deco.extra(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(0.6), transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false })); m.position.set(cx, R.base - 4, cz); m.material.fog = false; m.name = 'colony-barrier'; return m; });
  }
  p.extra?.(R);
  return R.finish({ spawn: [cx, cz + 6], biome: p.biome ?? R.def.biome, backdrop: p.backdrop ?? {} });
}
