// Spawn director: natural curse spawning in the open world (the way mobs
// roam the Minecraft Dungeons II overworld). One per loaded region
// (main.js loadRegion), exposed as game.spawns (and game.roaming, the old name).
//
// It keeps a target population of curses round the players, scaled by the
// quality tier, the region's danger and the time of day (curses thrive in the
// dark: more packs, bigger packs, higher grades and more elites at night).
// Packs rise out of the ground out of sight, on open walkable floor (never on
// a roof, inside a wall or a building, in water, or in a safe zone / town /
// station / gate / NPC post / suppressed zone), themed by the region's roam
// zones (L.roam kinds and level; outside a zone the nearest zone's, then the
// biome's ENEMY_TABLES in levelgen.js). Pack types:
//   wander   patrols between waypoints (the members' home point moves along)
//   ambush   lurkers (shadows, crawling hands, grasshoppers, slit-mouths) in
//            alleys and woods: still until you come close, then the pack springs
//   gather   curses gathered at a point of interest
//   nest     guardians of a curse nest (below)
// Far curses (55 m+) melt away; a curse that wanders into a safe zone burns.
// The melee 3-attacker rule is enemy.js's token system; spawning also keeps the
// whole level under gr.preset.enemyCap. Everything pauses in cutscenes, menus,
// dialogue, domains, inside buildings and outside the world.
//
// Curse nests: cursed spots holding a guardian pack and a cursed object to
// break (world/cursedObject.js). Region builders place them with
// R.nest(x, z, { kinds, size, level, name }) (common.js); a region with none
// gets a few auto-placed next to its points of interest. Breaking the object
// gives loot; the nest comes back after NEST_RESPAWN seconds of play
// (save.data.world.nests[id] = seconds left). Nests are POIs (☠) on the world
// map and live icons on the minimap (mapMarks()).
//
// World events (world/worldEvents.js) are run by .events.
//
// ------------------------------------------------------------------ API (game.spawns)
//   suppress(zone) / release(zone)   zone = { x, z, r }: no ambient spawns or events inside;
//                                    ambient curses inside are pushed out / despawned.
//                                    Kept on game.spawnSuppress, so it survives region reloads.
//   spawnPack({ x, z, kinds, count, level, elite, y?, spread?, rise?, ambient? }) -> enemies
//                                    a pack on the floor round (x, z) (kinds cycle to count;
//                                    elite: true | affix name, given to the first one)
//   paused                           set true to hold all spawning (existing curses stay)
//   danger                           0..1 for the region and the time of day
//   night                            0..1 (from game.timeOfDay)
//   nests.list / events              the nests and the world-event runner
//   mapMarks()                       [{ pos, icon, color }] live minimap icons
//   stats()                          counts, for tests
import * as THREE from 'three/webgpu';
import { CURSES } from '../entities/curses.js';
import { BLOCKS, B } from './blocks.js';
import { ENEMY_TABLES } from './levelgen.js';
import { captureMeta } from './regions/index.js';
import { mulberry32 } from '../util.js';
import { CursedObject, grantReward } from './cursedObject.js';
import { WorldEvents } from './worldEvents.js';
import { distanceField } from '../ui/tracker.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const inRect = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
const rectDist = (r, x, z) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const SKY_OK = new Set([B.leaves, B.dead_leaves, B.barrier].filter(Boolean));

const QK = { low: 0.6, medium: 0.8, high: 1, ultra: 1.15 };
const KIND_DANGER = { hub: 0.2, wild: 0.45, city: 0.5, colony: 0.68 };
const SWARM = new Set(['swarmer', 'flyhead', 'imp', 'transfigured', 'remnant']);
const AMBUSH = new Set(['shadow', 'burrower', 'grasshopper', 'longneck']);
const TABLE = { jujutsu_high: 'jujutsu_high', cursed_forest: 'cursed_forest', okinawa_coast: 'cursed_forest', kyoto: 'jujutsu_high', shibuya: 'shibuya', shinjuku: 'tokyo_night', colony_tokyo1: 'tokyo_night', colony_sendai: 'tokyo_night', colony_sakurajima: 'tokyo_night' };
const AFFIXES = ['swift', 'armored', 'vampiric', 'explosive', 'shadow'];
export const NEST_RESPAWN = 420;   // seconds of play before a cleansed nest festers again
const DESPAWN_R = 55, SPAWN_MIN = 22, SPAWN_MAX = 36;

const grade = (k) => +(CURSES[k]?.grade ?? 4);
function weighted(list) {   // [[kind, w]] -> pick()
  const tw = list.reduce((a, b) => a + b[1], 0);
  return (rng = Math.random) => { let x = rng() * tw; for (const [k, w] of list) { x -= w; if (x <= 0) return k; } return list[0][0]; };
}
const toWeights = (kinds) => { const m = new Map(); for (const k of kinds) if (CURSES[k]) m.set(k, (m.get(k) ?? 0) + 1); return [...m]; };

export class SpawnDirector {
  constructor(game, L) {
    this.game = game; this.L = L; this.rid = L.regionId ?? 'region';
    this.def = L.region ?? {};
    this.zones = L.roam ?? [];
    this.core = L.core ?? null;
    this.safe = [...(L.safe ?? []), ...(L.core && !(L.safe ?? []).length ? [L.core] : [])];
    this.dense = this.zones.some((z) => z.dense);
    this.groundAt = L.groundAt ?? ((x, z) => game.world.groundBelow(x, z, game.world.sy - 1));
    this.level = Math.max(1, ...this.zones.map((z) => z.level ?? 1));
    this.base = Math.min(0.85, (KIND_DANGER[this.def.kind] ?? 0.4) + (this.level - 1) * 0.07 + (this.dense ? 0.05 : 0));
    this.paused = false;
    this.packs = []; this.list = [];
    this.t = 3; this.packCd = 4 + Math.random() * 4;   // a breather after arriving
    this.warned = false;
    this.mark = { spawned: 0, despawned: 0, burned: 0 };
    game.spawnSuppress ??= [];
    // where curses never appear: stations, gates, NPC posts, quest givers, lair mouths
    this.noGo = [];
    for (const s of L.stations ?? []) if (s.pos) this.noGo.push({ x: s.pos.x, z: s.pos.z, r: 16 });
    for (const g of L.gates ?? []) if (g.pos) this.noGo.push({ x: g.pos.x, z: g.pos.z, r: 11 });
    for (const p of L.people ?? []) if (p.pos) this.noGo.push({ x: p.pos.x, z: p.pos.z, r: 7 });
    for (const [k, v] of Object.entries(L.anchors ?? {})) if (/^(giver_|lair_)/.test(k)) this.noGo.push({ x: v.x, z: v.z, r: k.startsWith('giver_') ? 10 : 6 });
    if (L.respawn) this.noGo.push({ x: L.respawn.x, z: L.respawn.z, r: 8 });
    this.pool = this.makePool();
    this.nests = new Nests(this);
    this.events = new WorldEvents(this);
    // the level going away (a dungeon, the title, another region) ends everything, even
    // when no update runs again (clearLevel drops the updaters)
    const grp = L.world?.group;
    if (grp) { const f = () => { grp.removeEventListener('removed', f); this.dispose(); }; grp.addEventListener('removed', f); }
  }
  get suppressed() { return this.game.spawnSuppress ?? (this.game.spawnSuppress = []); }
  suppress(zone) { if (zone && !this.suppressed.includes(zone)) this.suppressed.push(zone); return zone; }
  release(zone) { const s = this.suppressed; const i = s.findIndex((z) => z === zone || (zone && z.x === zone.x && z.z === zone.z && z.r === zone.r)); if (i >= 0) s.splice(i, 1); }
  get quality() { return this.game.gr?.quality ?? 'medium'; }
  get night() { const d = this.game.timeOfDay?.state?.day; return d == null ? 0 : Math.max(0, Math.min(1, 1 - d)); }
  get danger() { return Math.max(0, Math.min(1, this.base + this.night * 0.3 + (this.events?.cur ? 0.08 : 0))); }
  // ambient curses wanted round the party
  get target() { const n = this.night; return Math.max(2, Math.round((2 + 4 * this.danger) * (QK[this.quality] ?? 1) * (1 + 0.35 * n) + (this.dense ? 1 : 0))); }
  get maxPacks() { return 2 + (this.night > 0.5 ? 1 : 0); }
  heroes() { return this.game.players.filter((p) => !p.dead && !p.downed); }
  lead() { return this.heroes()[0] ?? null; }
  live() { const g = this.game; this.list = this.list.filter((e) => !e.dead && g.enemies.includes(e)); return this.list; }
  active() {
    const g = this.game;
    return !this.paused && !this.disposed && g.level === this.L && g.state === 'playing' && g.mode === 'world' && !g.paused && !g.traveling
      && !g.dialogue?.active && !g.cutscenes?.active && !g.cutscene && !g.ui?.active && !g.domainSys?.active && !g.interiors?.inside;
  }

  // ---------------------------------------------------------------- kinds
  makePool() {
    const t = ENEMY_TABLES[TABLE[this.rid]] ?? ENEMY_TABLES.jujutsu_high;
    const all = new Set([...this.zones.flatMap((z) => z.kinds ?? []), ...t.kinds.map((k) => k[0])]);
    // the night brings the higher grades out: the region's own grade 1-2s, else the table's
    const strong = [...all].filter((k) => grade(k) <= 2 && CURSES[k] && !CURSES[k].rooted);
    return { table: t.kinds.filter(([k]) => CURSES[k]), night: strong.length ? strong : ['tank', 'longneck', 'shadow'] };
  }
  kindsAt(x, z) {
    let zone = this.zones.find((r) => inRect(r, x, z));
    if (!zone) { let bd = 60; for (const r of this.zones) { const d = rectDist(r, x, z); if (d < bd) { bd = d; zone = r; } } }
    const list = zone?.kinds?.length ? toWeights(zone.kinds) : this.pool.table;
    return { list, level: zone?.level ?? this.level, zone, inZone: !!zone && inRect(zone, x, z) };
  }
  // A pack's kinds: a leader and its followers (swarms come in numbers, a big
  // curse brings a few small ones). At night the leader may be a higher grade.
  compose(list, size, o = {}) {
    let pool = list.filter(([k]) => !(o.mobile && CURSES[k]?.rooted));
    if (o.ambush) { const a = pool.filter(([k]) => AMBUSH.has(k)); if (a.length) pool = a; else return null; }
    if (!pool.length) pool = [['swarmer', 1]];
    const pick = weighted(pool);
    const n = this.night, d = this.danger;
    let lead = pick();
    if (!o.ambush && Math.random() < n * (0.25 + 0.35 * d)) {
      const strong = this.pool.night.filter((k) => grade(k) === 2 || (grade(k) === 1 && d > 0.6 && Math.random() < 0.35));
      if (strong.length) lead = strong[Math.floor(Math.random() * strong.length)];
    }
    const kinds = [lead];
    const small = pool.filter(([k]) => grade(k) >= 3);
    const pickSmall = small.length ? weighted(small) : () => 'swarmer';
    let g1 = grade(lead) === 1 ? 1 : 0, g2 = grade(lead) === 2 ? 1 : 0;
    while (kinds.length < size) {
      let k = SWARM.has(lead) && Math.random() < 0.45 ? lead : (grade(lead) <= 2 || Math.random() < 0.5 ? pickSmall() : pick());
      if (o.ambush) k = Math.random() < 0.5 ? lead : pickSmall();
      if (grade(k) === 1 && g1 >= 1) k = pickSmall();
      if (grade(k) === 2 && g2 >= 2) k = pickSmall();
      if (grade(k) === 1) g1++; if (grade(k) === 2) g2++;
      kinds.push(k);
    }
    return kinds;
  }
  packSize(lead) {
    const n = this.night, q = this.quality;
    let s = 2 + (Math.random() < 0.5 ? 1 : 0) + (n > 0.5 ? 1 + (Math.random() < 0.5 ? 1 : 0) : 0) + (this.dense && Math.random() < 0.5 ? 1 : 0);
    if (q === 'low') s = Math.max(2, s - 1);
    if (lead && grade(lead) <= 2) s = Math.max(2, s - 1);
    return Math.min(s, 6);
  }

  // ---------------------------------------------------------------- where
  blocked(x, z, margin = 4) {
    if (this.safe.some((r) => inRect(r, x, z, margin))) return true;
    for (const c of this.noGo) if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
    for (const s of this.suppressed) if (Math.hypot(x - s.x, z - s.z) < (s.r ?? 10) + margin) return true;
    const wm = this.game.worldMission?.zone;
    if (wm && Math.hypot(x - wm.x, z - wm.z) < (wm.r ?? 12) + margin) return true;
    return false;
  }
  // no ceiling, roof or overhang above (leaves are fine): not inside a building
  openSky(x, y, z) {
    const w = this.game.world, bx = Math.floor(x), bz = Math.floor(z);
    for (let yy = Math.floor(y) + 2; yy < Math.min(w.sy, y + 48); yy++) { const id = w.get(bx, yy, bz); if (id && BLOCKS[id]?.solid && !SKY_OK.has(id)) return false; }
    if (w.inRoof?.(x, y + 1, z)) return false;
    return true;
  }
  // Ground the party can walk to: one flood over the region from its spawn
  // (tracker.js distanceField, cached on L). Rooftops, walled-off yards and
  // ledges nobody can reach are never in it.
  walkable(x, y, z) {
    const L = this.L;
    if (L._walk === undefined) {
      try { const t0 = performance.now(); L._walk = distanceField(L.world, L.spawn, 2); L._walkMs = performance.now() - t0; } catch (e) { console.warn('walk field', e); L._walk = null; }
    }
    const f = L._walk; if (!f) return true;
    const i = Math.floor(z) * f.W + Math.floor(x);
    return isFinite(f.d[i]) && Math.abs(f.ys[i] - Math.floor(y)) <= 1;
  }
  // a standable, open-air floor cell near the terrain at (x, z), or null
  floorAt(x, z, o = {}) {
    const w = this.game.world;
    if (x < 4 || z < 4 || x > w.sx - 4 || z > w.sz - 4) return null;
    if (w.isLoaded && !w.isLoaded(x, z)) return null;
    if (!o.noBlock && this.blocked(x, z, o.margin ?? 4)) return null;
    const gy = o.nearY ?? this.groundAt(x, z); if (!isFinite(gy)) return null;
    const y = w.standY(x, z, gy, o.reach ?? 2); if (!isFinite(y)) return null;
    if (w.liquidAt(x, y + 0.2, z) || w.liquidAt(x, y - 0.5, z)) return null;
    if (!this.openSky(x, y, z)) return null;
    if (!this.walkable(x, y, z)) return null;
    return V(x, y, z);
  }
  onScreen(v, pad = 1.12) {
    const cam = this.game.rig?.camera; if (!cam) return false;
    const p = tmp.copy(v).setY(v.y + 1).project(cam);
    return p.z < 1 && Math.abs(p.x) < pad && Math.abs(p.y) < pad;
  }
  // a spot rMin..rMax from `from`, off screen, at least rMin from every hero
  findSpot(from, rMin, rMax, o = {}) {
    const hs = this.heroes();
    for (let i = 0; i < (o.tries ?? 24); i++) {
      const a = Math.random() * Math.PI * 2, d = rMin + Math.random() * (rMax - rMin);
      const x = from.x + Math.cos(a) * d, z = from.z + Math.sin(a) * d;
      if (hs.some((p) => Math.hypot(x - p.pos.x, z - p.pos.z) < Math.min(rMin, o.minHero ?? 14))) continue;
      if (o.inZone && !this.zones.some((r) => inRect(r, x, z))) continue;
      const v = this.floorAt(x, z); if (!v) continue;
      if (Math.abs(v.y - from.y) > (o.dy ?? 9)) continue;
      if (o.offscreen !== false && this.onScreen(v)) continue;
      if (o.cover && this.cover(v) < o.cover) continue;
      return v;
    }
    return null;
  }
  // walls / trunks / props round a spot (alleys, woods)
  cover(v) {
    const w = this.game.world; let n = 0;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { if (Math.abs(dx) < 2 && Math.abs(dz) < 2) continue; if (w.solidAt(v.x + dx, v.y + 1.2, v.z + dz)) n++; }
    return n;
  }

  // ---------------------------------------------------------------- spawning
  // Raise curses out of the ground round a floor point. Returns the enemies.
  raise(kinds, at, o = {}) {
    const g = this.game, out = [];
    const cap = g.gr?.preset?.enemyCap ?? 16;
    const affix = o.elite === true ? AFFIXES[Math.floor(Math.random() * AFFIXES.length)] : (o.elite || null);
    kinds.forEach((kind, i) => {
      if (!CURSES[kind]) return;
      if (!o.force && g.enemies.filter((e) => !e.dead && !e.isDummy).length >= cap + (o.capBonus ?? 0)) return;
      let p = null;
      const spread = o.spread ?? 2.6;
      for (let t = 0; t < 6 && !p; t++) {
        const a = (i / Math.max(1, kinds.length)) * Math.PI * 2 + Math.random() * 1.2, r = i === 0 && t === 0 ? 0 : spread * (0.5 + Math.random() * 0.6);
        const x = at.x + Math.cos(a) * r, z = at.z + Math.sin(a) * r;
        const y = g.world.standY(x, z, at.y, 2);
        if (!isFinite(y) || Math.abs(y - at.y) > 1.6 || g.world.liquidAt(x, y + 0.2, z)) continue;
        if (o.open !== false && !this.openSky(x, y, z)) continue;
        if (!o.noBlock && this.blocked(x, z, 0)) continue;
        p = V(x, y, z);
      }
      p ??= at.clone();
      const e = g.spawnEnemy(kind, p, { level: o.level ?? 1, elite: i === 0 ? affix : null });
      if (!e) return;
      e.spawnT = o.rise === false ? 0.3 : 0.9;   // rises out of the ground (enemy.js)
      e.roamer = true;
      e.packOff = V(p.x - at.x, 0, p.z - at.z); e.spawnAt = p.clone();
      if (o.tag) Object.assign(e, o.tag);
      out.push(e);
      if (o.rise !== false) {
        g.particles?.burst(tmp.set(p.x, p.y + 0.3, p.z), { count: 14, color: 0x151018, additive: false, speed: 1.6, up: 1.4, life: 1.0, size: 0.5, drag: 2, sizeEnd: 2.2 });
        g.fx?.summonCircle?.(p, 0x7a2ab8);
      }
    });
    this.mark.spawned += out.length;
    return out;
  }
  // public: a pack for missions / events / quests
  spawnPack(o = {}) {
    const g = this.game;
    const kinds0 = [o.kinds ?? this.compose(this.kindsAt(o.x, o.z).list, o.count ?? 3)].flat().filter((k) => CURSES[k]);
    if (!kinds0.length) return [];
    const count = o.count ?? kinds0.length;
    const kinds = Array.from({ length: count }, (_, i) => kinds0[i % kinds0.length]);
    let at = null;
    if (o.y != null) at = V(o.x, o.y, o.z);
    else at = this.floorAt(o.x, o.z, { noBlock: true, reach: 4 }) ?? (() => { const gy = this.groundAt(o.x, o.z); const y = g.world.standY(o.x, o.z, gy, 6); return V(o.x, isFinite(y) ? y : gy, o.z); })();
    const list = this.raise(kinds, at, { level: o.level ?? this.kindsAt(o.x, o.z).level, elite: o.elite ?? null, spread: o.spread ?? 2.8, rise: o.rise, capBonus: o.capBonus ?? 6, force: o.force, open: false, noBlock: true, tag: o.tag });
    if (o.ambient) { const pack = this.addPack('gather', list, at); this.list.push(...list); void pack; }
    return list;
  }
  addPack(type, members, center, extra = {}) {
    const pack = { type, members, center: center.clone(), pts: [], wp: 0, born: this.game.time, sprung: false, ...extra };
    for (const e of members) e.pack = pack;
    this.packs.push(pack);
    return pack;
  }
  spawnAmbient() {
    const lead = this.lead(); if (!lead) return 0;
    const r = Math.random();
    const type = r < 0.2 ? 'ambush' : r < 0.42 ? 'gather' : 'wander';
    if (type === 'gather') { const n = this.spawnGather(lead); if (n) return n; }
    if (type === 'ambush') { const n = this.spawnAmbush(lead); if (n) return n; }
    return this.spawnWander(lead);
  }
  spawnWander(lead) {
    const at = this.findSpot(lead.pos, SPAWN_MIN, SPAWN_MAX); if (!at) return 0;
    const K = this.kindsAt(at.x, at.z);
    if (!K.zone && !K.inZone && Math.random() < 0.35) return 0;   // the open road is a little quieter than the wilds
    const kinds = this.compose(K.list, this.packSize(), { mobile: true }); if (!kinds) return 0;
    const level = K.level + (Math.random() < this.night * 0.35 ? 1 : 0);
    const elite = Math.random() < 0.03 + this.night * 0.1 + this.danger * 0.04;
    const list = this.raise(kinds, at, { level, elite });
    if (!list.length) return 0;
    const pack = this.addPack('wander', list, at, { speed: 0.9 + Math.random() * 0.5 });
    // patrol route: a loop of points on open floor
    pack.pts.push(at.clone());
    for (let i = 0; i < 3; i++) {
      const prev = pack.pts[pack.pts.length - 1];
      for (let t = 0; t < 8; t++) {
        const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 16;
        const v = this.floorAt(prev.x + Math.cos(a) * d, prev.z + Math.sin(a) * d);
        if (v && Math.abs(v.y - prev.y) < 3) { pack.pts.push(v); break; }
      }
    }
    pack.wp = 1 % pack.pts.length;
    this.list.push(...list);
    return list.length;
  }
  spawnAmbush(lead) {
    const at = this.findSpot(lead.pos, 15, 26, { cover: 6, tries: 30 }); if (!at) return 0;
    const K = this.kindsAt(at.x, at.z);
    const kinds = this.compose(K.list, 1 + (Math.random() < 0.5 + this.night * 0.4 ? 1 : 0) + (this.night > 0.6 ? 1 : 0), { ambush: true, mobile: true });
    if (!kinds) return 0;
    const list = this.raise(kinds, at, { level: K.level, elite: Math.random() < this.night * 0.12, spread: 1.6 });
    if (!list.length) return 0;
    this.addPack('ambush', list, at);
    this.list.push(...list);
    return list.length;
  }
  spawnGather(lead) {
    const L = this.L, hs = this.heroes();
    const cands = (L.pois ?? []).filter((p) => p.pos && p.kind !== 'nest' && p.kind !== 'camp' && p.kind !== 'chest' && !this.packs.some((k) => k.poi === p.id)
      && Math.hypot(p.pos.x - lead.pos.x, p.pos.z - lead.pos.z) > 24 && Math.hypot(p.pos.x - lead.pos.x, p.pos.z - lead.pos.z) < 62);
    for (let i = 0; i < 6 && cands.length; i++) {
      const p = cands.splice(Math.floor(Math.random() * cands.length), 1)[0];
      for (let t = 0; t < 8; t++) {
        const a = Math.random() * Math.PI * 2, d = 3 + Math.random() * 7;
        const v = this.floorAt(p.pos.x + Math.cos(a) * d, p.pos.z + Math.sin(a) * d);
        if (!v || this.onScreen(v) || hs.some((h) => h.pos.distanceTo(v) < 16)) continue;
        const K = this.kindsAt(v.x, v.z);
        const kinds = this.compose(K.list, this.packSize()); if (!kinds) return 0;
        const list = this.raise(kinds, v, { level: K.level, elite: Math.random() < 0.04 + this.night * 0.1, spread: 3.2 });
        if (!list.length) return 0;
        this.addPack('gather', list, v, { poi: p.id });
        this.list.push(...list);
        return list.length;
      }
    }
    return 0;
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    if (this.disposed) return false;
    if (this.game.level !== this.L) { this.dispose(); return false; }
    if (!this.active()) { this.events.idle?.(); return; }
    this.tickNestTimers(dt);
    this.keepOut(dt);
    this.updatePacks(dt);
    this.nests.update(dt);
    this.events.update(dt);
    this.packCd -= dt;
    if ((this.t -= dt) > 0) return;
    this.t = 1.5;
    this.think();
  }
  think() {
    const g = this.game, lead = this.lead(); if (!lead) return;
    if (this.packCd > 0) return;
    const hs = this.heroes();
    const near = (e, r) => hs.some((p) => p.pos.distanceTo(e.pos) < r);
    const amb = this.live().filter((e) => near(e, 50)).length;
    const others = g.enemies.filter((e) => !e.dead && !e.isDummy && !e.ambient && !this.list.includes(e) && near(e, 34)).length;
    const packs = this.packs.filter((k) => k.type !== 'nest' && k.type !== 'event' && k.members.some((e) => near(e, 50))).length;
    const all = g.enemies.filter((e) => !e.dead && !e.isDummy).length;
    const cap = g.gr?.preset?.enemyCap ?? 16;
    if (packs >= this.maxPacks || amb + others >= this.target - 1 || all >= cap - 3) return;
    const n = this.spawnAmbient();
    if (n) { for (const e of this.list) e.ambient = true; this.packCd = (this.night > 0.5 ? 5 : 9) + Math.random() * (this.night > 0.5 ? 4 : 6); this.packCd /= 0.7 + this.danger * 0.6; }
    else this.packCd = 1.5;
  }
  updatePacks(dt) {
    const g = this.game;
    for (let i = this.packs.length - 1; i >= 0; i--) {
      const k = this.packs[i];
      k.members = k.members.filter((e) => !e.dead && g.enemies.includes(e));
      if (!k.members.length) { this.packs.splice(i, 1); continue; }
      const alert = k.members.some((e) => e.aggro);
      if (alert && !k.sprung) {
        k.sprung = true;
        for (const e of k.members) e.aggro = true;   // the pack moves together
        if (k.type === 'ambush') for (const e of k.members) { g.fx?.blinkPuff?.(e.pos, 0x8a3aff); }
      }
      if (k.type === 'wander' && !alert && k.pts.length > 1) {
        const to = k.pts[k.wp];
        const dx = to.x - k.center.x, dz = to.z - k.center.z, d = Math.hypot(dx, dz);
        if (d < 1.5) k.wp = (k.wp + 1) % k.pts.length;
        else { const s = Math.min(d, k.speed * dt); k.center.x += dx / d * s; k.center.z += dz / d * s; k.center.y = to.y; }
        for (const e of k.members) e.home.set(k.center.x + (e.packOff?.x ?? 0), e.pos.y, k.center.z + (e.packOff?.z ?? 0));
      }
    }
  }
  // Far from everyone: gone. Across a barrier line: burned away. In a suppressed zone: walk out, or fade.
  keepOut(dt) {
    const g = this.game, hs = g.players.filter((p) => !p.dead);
    for (const e of this.live()) {
      const far = hs.length ? Math.min(...hs.map((p) => p.pos.distanceTo(e.pos))) : 99;
      e.farT = far > DESPAWN_R ? (e.farT ?? 0) + dt : 0;
      if (e.farT > 4) { this.vanish(e, false); this.mark.despawned++; continue; }
      const zone = this.safe.find((r) => inRect(r, e.pos.x, e.pos.z));
      if (zone) {
        e.coreT = (e.coreT ?? 0) + dt;
        if (e.coreT > 0.35) {
          this.vanish(e, true); this.mark.burned++;
          if (!this.warned) { this.warned = true; g.toast?.(this.core && zone.x0 === this.core.x0 ? 'Tengen\'s barrier burns away a curse that strayed onto the campus' : 'A barrier burns away a curse that strayed too close'); }
        }
        continue;
      } else e.coreT = 0;
      const sup = [...this.suppressed, g.worldMission?.zone].find((s) => s && Math.hypot(e.pos.x - s.x, e.pos.z - s.z) < (s.r ?? 10));
      if (sup) {
        e.supT = (e.supT ?? 0) + dt;
        const dx = e.pos.x - sup.x, dz = e.pos.z - sup.z, d = Math.hypot(dx, dz) || 1;
        e.home.set(sup.x + dx / d * ((sup.r ?? 10) + 6), e.pos.y, sup.z + dz / d * ((sup.r ?? 10) + 6));
        if (e.pack) e.pack.pts = [];
        if (e.supT > 3 && !e.aggro) { this.vanish(e, false); this.mark.despawned++; }
      } else e.supT = 0;
    }
  }
  vanish(e, burn) {
    const g = this.game;
    if (burn) { g.fx?.curseDeath?.(e.pos, e.height ?? 1.5, 0xffd890); g.lights?.flash(tmp.copy(e.pos).setY(e.pos.y + 1), 0xffe0a0, 5, 6, 0.4); }
    else g.particles?.burst(tmp.copy(e.pos).setY(e.pos.y + 0.4), { count: 10, color: 0x151018, additive: false, speed: 1.2, up: 0.6, life: 0.8, size: 0.4, drag: 2, sizeEnd: 1.8 });
    e.cancelAttack?.();
    if (e.marker) { try { g.markers.cancel(e.marker); } catch (err) { /* already gone */ } e.marker = null; }
    e.dead = true; e.deathT = burn ? 0 : 0.5;   // Enemy.update shrinks it away, then main removes it (no loot)
    this.list = this.list.filter((x) => x !== e);
  }
  tickNestTimers(dt) {
    const W = this.game.save.data.world ??= {}, T = W.nests ??= {};
    for (const k of Object.keys(T)) { T[k] -= dt; if (T[k] <= 0) delete T[k]; }
  }
  mapMarks() {
    const out = [];
    for (const n of this.nests.list) if (n.state !== 'cleared') out.push({ pos: n.pos, icon: '☠', color: n.state === 'active' ? '#ff6ad8' : '#b070ff' });
    const ev = this.events.cur; if (ev?.pos) out.push({ pos: ev.pos, icon: '⚠', color: '#ff5a6a' });
    return out;
  }
  stats() {
    const hs = this.heroes();
    const near = (e) => hs.some((p) => p.pos.distanceTo(e.pos) < 50);
    const live = this.live();
    return { ambient: live.length, near: live.filter(near).length, packs: this.packs.length, types: this.packs.map((k) => k.type), target: this.target, maxPacks: this.maxPacks, danger: +this.danger.toFixed(2), night: +this.night.toFixed(2), ...this.mark,
      nests: this.nests.list.map((n) => ({ id: n.id, state: n.state, guards: n.guards.filter((e) => !e.dead).length })), event: this.events.cur ? { kind: this.events.cur.kind, phase: this.events.cur.phase } : null };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try { this.events.dispose(); } catch (e) { console.warn('events dispose', e); }
    try { this.nests.dispose(); } catch (e) { console.warn('nests dispose', e); }
  }
}

// ------------------------------------------------------------------ curse nests
// Deterministic auto-placement: next to points of interest (not camps, chests or
// stations), spaced out, inside the roam zones where possible.
function autoNests(L, dir) {
  if (L._autoNests) return L._autoNests;
  const r = mulberry32(hash(L.regionId ?? 'x') ^ 0x5eed);
  const want = { wild: 4, colony: 4, city: 3, hub: 3 }[dir.def.kind] ?? 3;
  const out = [];
  const far = (x, z) => out.every((n) => Math.hypot(n.x - x, n.z - z) > 48);
  const ok = (x, z) => !dir.blocked(x, z, 8) && far(x, z) && x > 10 && z > 10 && x < L.world.sx - 10 && z < L.world.sz - 10;
  const pois = (L.pois ?? []).filter((p) => p.pos && !['camp', 'chest', 'station', 'nest', 'shop'].includes(p.kind));
  pois.sort((a, b) => (dir.zones.some((z) => inRect(z, b.pos.x, b.pos.z)) ? 1 : 0) - (dir.zones.some((z) => inRect(z, a.pos.x, a.pos.z)) ? 1 : 0) || (r() - 0.5));
  for (const p of pois) {
    if (out.length >= want) break;
    for (let t = 0; t < 10; t++) {
      const a = r() * Math.PI * 2, d = 7 + r() * 8, x = Math.round(p.pos.x + Math.cos(a) * d), z = Math.round(p.pos.z + Math.sin(a) * d);
      if (ok(x, z)) { out.push({ id: 'auto' + out.length, x, z, name: `Curse Nest near ${p.name}`, size: 3 + Math.floor(r() * 2) }); break; }
    }
  }
  for (let t = 0; t < 200 && out.length < want && dir.zones.length; t++) {
    const zn = dir.zones[Math.floor(r() * dir.zones.length)];
    const x = Math.round(zn.x0 + r() * (zn.x1 - zn.x0)), z = Math.round(zn.z0 + r() * (zn.z1 - zn.z0));
    if (ok(x, z)) out.push({ id: 'auto' + out.length, x, z, name: 'Curse Nest', size: 3 + Math.floor(r() * 2) });
  }
  L._autoNests = out;
  return out;
}

class Nests {
  constructor(dir) {
    this.dir = dir; this.game = dir.game; this.list = []; this.t = 0;
    const L = dir.L;
    const defs = (L.nests?.length ? L.nests : autoNests(L, dir));
    for (const d of defs) {
      // a floor cell next to the requested spot (the terrain may have moved under it)
      let pos = null;
      const gy = dir.groundAt(d.x, d.z), w = L.world;
      for (let k = 0; k < 40 && !pos; k++) {
        const a = k * 2.4, rr = k === 0 ? 0 : 1 + k * 0.25;
        const x = d.x + 0.5 + Math.cos(a) * rr, z = d.z + 0.5 + Math.sin(a) * rr;
        const y = w.standY(x, z, dir.groundAt(x, z), 3);
        if (isFinite(y) && !w.liquidAt(x, y + 0.2, z) && dir.openSky(x, y, z) && dir.walkable(x, y, z)) pos = V(x, y, z);
      }
      pos ??= V(d.x + 0.5, gy, d.z + 0.5);
      this.list.push({ id: `${dir.rid}:${d.id ?? 'n' + this.list.length}`, name: d.name ?? 'Curse Nest', pos, kinds: d.kinds ?? null, size: d.size ?? 4, level: d.level ?? null,
        state: 'dormant', guards: [], obj: null, farT: 0, announced: false });
    }
    // on the maps: a ☠ point of interest per nest (world map), live icons on the minimap
    if (!L._nestPois) {
      L._nestPois = true;
      for (const n of this.list) L.pois.push({ id: 'nest_' + n.id, name: n.name, icon: '☠', pos: n.pos.clone(), x: n.pos.x, z: n.pos.z, kind: 'nest' });
      try { const W = this.game.save.data.world; if (W?.meta && L.regionId) W.meta[L.regionId] = captureMeta(L); } catch (e) { console.warn('nest meta', e); }
    }
    for (const n of this.list) if (this.cleared(n)) n.state = 'cleared'; else this.build(n);
  }
  timers() { const W = this.game.save.data.world ??= {}; return (W.nests ??= {}); }
  cleared(n) { return (this.timers()[n.id] ?? 0) > 0; }
  build(n) {
    if (n.obj && !n.obj.dead) return;
    const lv = n.level ?? this.dir.level;
    n.obj = new CursedObject(this.game, { pos: n.pos, hp: 160 + 90 * lv, look: 'nest', name: 'Cursed Object', shielded: () => n.guards.some((e) => !e.dead && this.game.enemies.includes(e)), onBreak: (src) => this.clear(n, src) });
    (this.game.hubProps ??= []).push(n.obj.object);
  }
  activate(n) {
    const d = this.dir, K = d.kindsAt(n.pos.x, n.pos.z);
    const list = n.kinds?.length ? toWeights(n.kinds) : K.list;
    const size = Math.min(7, n.size + (d.night > 0.5 ? 1 : 0) + (d.quality === 'low' ? -1 : 0));
    const kinds = d.compose(list, Math.max(2, size)) ?? ['swarmer', 'swarmer', 'spitter'];
    const lv = (n.level ?? K.level) + (d.night > 0.6 ? 1 : 0);
    // guardians rise in a ring round the object
    const guards = [];
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * Math.PI * 2, r = 3.2 + Math.random() * 2.5;
      const at = d.floorAt(n.pos.x + Math.cos(a) * r, n.pos.z + Math.sin(a) * r, { noBlock: true, nearY: n.pos.y, reach: 3 }) ?? n.pos.clone();
      guards.push(...d.raise([k], at, { level: lv, elite: i === 0 && Math.random() < 0.25 + d.night * 0.25, capBonus: 4, spread: 0.5, noBlock: true, tag: { nest: n.id } }));
    });
    n.guards = guards;
    const pack = d.addPack('nest', guards, n.pos);
    for (const e of guards) e.packOff = V(e.pos.x - n.pos.x, 0, e.pos.z - n.pos.z);
    void pack;
    n.state = 'active';
    if (!n.announced) { n.announced = true; this.game.toast?.('☠ A curse nest! Break the cursed object'); this.game.audio?.energy?.('summon'); }
  }
  clear(n, src) {
    const g = this.game;
    n.state = 'cleared';
    this.timers()[n.id] = NEST_RESPAWN;
    // the guardians lose their anchor and scatter (ambient now: they fade if left behind)
    for (const e of n.guards) if (!e.dead) { e.aggro = true; this.dir.list.push(e); e.ambient = true; }
    n.guards = [];
    const lv = n.level ?? this.dir.level;
    grantReward(g, n.pos, { coins: 10 + lv * 5 + Math.floor(Math.random() * 8), xp: 30 + lv * 15, loot: Math.random() < 0.3 + this.dir.night * 0.2 ? 'rare' : 'common', power: lv - 1, heal: true });
    g.toast?.(`✔ ${n.name} cleansed`, 'big');
    g.audio?.levelUp?.();
    void src;
  }
  update(dt) {
    if ((this.t -= dt) > 0) return;
    this.t = 0.25;
    const d = this.dir, hs = d.heroes(); if (!hs.length) return;
    for (const n of this.list) {
      const dist = Math.min(...hs.map((p) => Math.hypot(p.pos.x - n.pos.x, p.pos.z - n.pos.z)));
      if (n.state === 'cleared') {
        if (!this.cleared(n) && dist > 30) { n.state = 'dormant'; n.announced = false; this.build(n); }   // festering again
        continue;
      }
      if (!n.obj || n.obj.dead) this.build(n);
      if (n.state === 'dormant' && dist < 34 && !d.blocked(n.pos.x, n.pos.z, 0)) this.activate(n);
      else if (n.state === 'active') {
        n.guards = n.guards.filter((e) => !e.dead && this.game.enemies.includes(e));
        n.farT = dist > 60 ? n.farT + 0.25 : 0;
        if (n.farT > 5) {   // walked away: the guardians sink back into the nest
          for (const e of n.guards) d.vanish(e, false);
          n.guards = []; n.state = 'dormant'; n.farT = 0;
        }
      }
    }
  }
  dispose() { for (const n of this.list) { if (n.obj && !n.obj.dead) n.obj.remove(); } }
}
