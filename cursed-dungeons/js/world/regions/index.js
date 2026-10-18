// Region registry: the open world is nine big regions, each its own voxel map
// (streamed by chunks around the players, see voxel.js), joined
// seamlessly over their borders (world/seamless.js) and by fast travel
// between Window stations.
//
// ------------------------------------------------------------------ API
//   registerRegion(id, def)       add or replace a region (Phase 2 region
//                                 files call this to swap a placeholder out)
//   REGIONS[id] / region(id)      the definition
//   REGION_IDS                    the nine ids, in world-map order
//   neighbours(id)                { n, s, e, w } -> region id (from the map grid)
//   gateSide(from, to)            which edge of `from` leads to `to`
//   routeTo(from, to)             region ids on the shortest gate route
//   buildRegion(id)               build (or reuse the cached build of) a region -> L
//   buildRegionSteps(id)          the same in time slices: job.step(ms) -> done (job.L)
//   cachedRegion(id)              the cached build or null
//   regionMeta(save, id)          what the world map knows about a region
//
// A definition:
//   {
//     name, sub,                  display name and subtitle
//     kind: 'hub'|'wild'|'city'|'colony',
//     grid: [col, row],           cell on the stylised 3×3 world map
//     color, accent,              world-map tile colours (css)
//     icon,                       world-map emblem
//     blurb,                      one line for the world map
//     biome,                      look & feel (a world/biomes.js-shaped object:
//                                 sky, fog, lights, grade, ambience, music…)
//     build(ctx) -> L             build the map; ctx = { id, def, seed }.
//                                 Most regions use RegionBuilder (./common.js),
//                                 whose finish() returns a valid L.
//   }
//
// The level object L a build returns (RegionBuilder.finish fills all of it):
//   world, deco, shafts, biome, sunOffset, titleCam?
//   spawn                         default arrival (Vector3 on the floor)
//   gates:    [{ side, to, at, pos, arrive, radius, label }]
//             where a road leaves over the border into region `to` (no gate any
//             more: you walk straight on, world/seamless.js); pos is on the road
//             by the edge (the tracker leads there), `arrive` a little further in
//   seams:    { side: { to, at, y, kind, colony } }  the shared border profile
//             (regions/seams.js): `at` the road centre, `y` its height at the edge
//   runtimeHooks: [fn(game, L) -> dispose]   regionRuntime.js onRegionLoad
//   stations: [{ id, name, pos }]       Window stations (fast travel)
//   pois:     [{ id, name, icon, pos, kind }]
//   anchors:  { name: Vector3 }         quest anchors. Main quests look for
//             'lair_<chapterId>' (the curtain/cave entrance) and
//             'giver_<chapterId>' (where the quest giver stands); missing
//             anchors fall back to the spawn / a station.
//   people:   [{ id, name, look, pos, yaw, pose, lines, barks, color, wander }]
//             ambient NPCs (entities/npcs.js RegionNpcs)
//   npcs:     Jujutsu High's named residents (HubNpcs posts), hub only
//   roam:     [{ x0, z0, x1, z1, kinds?, level? }] roaming-curse zones
//   safe:     [{ x0, z0, x1, z1 }] no curse may enter (barriers, towns)
//   roads:    [[[x, z], …], …]       polylines, for the minimap/world map
//   groundAt(x, z)                    terrain height (first free cell)
import * as THREE from 'three/webgpu';

export const REGIONS = {};
export const REGION_IDS = ['okinawa_coast', 'cursed_forest', 'colony_sendai', 'kyoto', 'jujutsu_high', 'shinjuku', 'colony_sakurajima', 'shibuya', 'colony_tokyo1'];
export const START_REGION = 'jujutsu_high';

export function registerRegion(id, def) {
  const prev = REGIONS[id];
  REGIONS[id] = { id, ...(prev ? { grid: prev.grid, color: prev.color, accent: prev.accent, icon: prev.icon } : {}), ...def };
  cache.delete(id);
  return REGIONS[id];
}
export const region = (id) => REGIONS[id] ?? null;

const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
export const OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e' };
export function neighbours(id) {
  const r = REGIONS[id]; const out = {};
  if (!r?.grid) return out;
  for (const [side, [dx, dz]] of Object.entries(DIRS)) {
    const o = Object.values(REGIONS).find((q) => q.grid && q.grid[0] === r.grid[0] + dx && q.grid[1] === r.grid[1] + dz);
    if (o) out[side] = o.id;
  }
  return out;
}
export function gateSide(from, to) { const n = neighbours(from); return Object.keys(n).find((s) => n[s] === to) ?? null; }
// Shortest list of regions from `from` to `to` (inclusive), walking through gates.
export function routeTo(from, to) {
  if (from === to) return [from];
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const c = q.shift();
    for (const n of Object.values(neighbours(c))) {
      if (n in prev) continue;
      prev[n] = c;
      if (n === to) { const path = [to]; let k = c; while (k) { path.unshift(k); k = prev[k]; } return path; }
      q.push(n);
    }
  }
  return null;
}

// ------------------------------------------------------------------ building
// Built regions are cached (voxel data, decorations, props), so coming back
// from a dungeon or walking back over a border does not regenerate the map.
// The seamless world (world/seamless.js) decides what stays: the region you
// are in and its neighbours; far ones are dropped (dropRegionCache).
//
// A def.build(ctx) may return L, or a generator (function*) that yields
// between steps and returns L: buildRegionSteps(id) runs it a slice at a time
// (no frame hitch); buildRegion(id) runs it to the end at once.
const cache = new Map();
const CACHE_MAX = 6;
export function cachedRegion(id) { return cache.get(id) ?? null; }
export function cachedRegionIds() { return [...cache.keys()]; }
export function buildRegion(id) {
  if (cache.has(id)) { const L = cache.get(id); cache.delete(id); cache.set(id, L); return L; }
  const job = buildRegionSteps(id);
  while (!job.done) job.step(Infinity);
  return job.L;
}
// A build you can run in slices: job.step(ms) runs steps for about ms
// milliseconds and returns true when the region is built (job.L).
export function buildRegionSteps(id) {
  const def = REGIONS[id]; if (!def) throw new Error('unknown region ' + id);
  if (cache.has(id)) return { id, done: true, L: cache.get(id), step: () => true, longest: 0 };
  const seed = (def.seed ?? hash(id)) >>> 0;
  let it = null, L = null;
  const job = {
    id, done: false, L: null, longest: 0, steps: 0, ms: 0,
    step(ms = 4) {
      if (job.done) return true;
      const t0 = performance.now();
      do {
        const t = performance.now();
        if (!it) { const r = def.build({ id, def, seed }); if (r && typeof r.next === 'function') it = r; else { L = r; } }
        else { const r = it.next(); if (r.done) L = r.value; else { job.prev = job.label; job.label = r.value; } }
        const dt = performance.now() - t; job.steps++; job.ms += dt; if (dt > job.longest) { job.longest = dt; job.longestAt = (job.prev ?? 'start') + ' -> ' + (L ? 'end' : job.label); }
        if (L) { job.L = finishBuild(id, def, L); job.done = true; return true; }
      } while (performance.now() - t0 < ms);
      return false;
    },
  };
  return job;
}
function finishBuild(id, def, L) {
  L.regionId = id; L.region = def;
  L.biome = L.biome ?? def.biome;
  L.gates ??= []; L.stations ??= []; L.pois ??= []; L.anchors ??= {}; L.people ??= []; L.roam ??= []; L.safe ??= []; L.roads ??= [];
  L.seams ??= {}; L.runtimeHooks ??= [];
  cache.set(id, L);
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return L;
}
export function dropRegionCache(id) { if (id) cache.delete(id); else cache.clear(); }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// What the world map knows about a region: saved when a region is built, as
// positions normalised to 0..1 across the map (save.data.world.meta[id]).
export function captureMeta(L) {
  const w = L.world, nx = (v) => +(v.x / w.sx).toFixed(4), nz = (v) => +(v.z / w.sz).toFixed(4);
  return {
    v: 1,
    stations: L.stations.map((s) => [s.id, s.name, nx(s.pos), nz(s.pos)]),
    pois: L.pois.map((p) => [p.id, p.name, p.icon ?? '◆', nx(p.pos), nz(p.pos)]),
    gates: L.gates.map((g) => [g.side, g.to, nx(g.pos), nz(g.pos)]),
    anchors: Object.fromEntries(Object.entries(L.anchors).map(([k, v]) => [k, [nx(v), nz(v)]])),
    roads: L.roads.map((r) => r.map(([x, z]) => [+(x / w.sx).toFixed(3), +(z / w.sz).toFixed(3)])),
    size: [w.sx, w.sz],
  };
}
export function regionMeta(save, id) { return save?.data?.world?.meta?.[id] ?? null; }

// Find a standable floor near (x, z) at about height y (for anchors without a y).
export function floorAt(L, x, z, y = null) {
  const w = L.world;
  const gy = y ?? (L.groundAt ? L.groundAt(x, z) : w.groundBelow(x, z, w.sy - 1));
  const s = w.standY(x, z, gy, 6);
  return new THREE.Vector3(x, isFinite(s) ? s : gy, z);
}
