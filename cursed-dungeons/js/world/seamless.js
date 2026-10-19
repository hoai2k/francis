// The seamless open world: the nine regions are tiles of one continuous map.
// You walk from Jujutsu High into Shibuya and on into the Tokyo colony with no
// gate, no fade and no loading: the next region is built in the background
// while you play, drawn beside the one you are in as you near the border, and
// when the party crosses it becomes the current region in the same frame.
//
// How it works
//   * Each region stays its own World "tile" with its own coordinates, so
//     anchors, zones, quests, crowds, interiors and the spawn director keep
//     working unchanged. game.level / game.world is always the tile you are in,
//     at the origin; a neighbour is drawn at its offset (seams.js tileOffset:
//     the road centre lines meet and the road heights match).
//   * Background work (time-sliced, a few ms per frame, nearest border first):
//     build the neighbour (region builders are generators: buildRegionSteps),
//     then prepare it (World.init without meshing, decorations a tile at a
//     time, sun shafts, its minimap). Chunks of a neighbour are meshed only in
//     the strip you can see, by the normal streaming code.
//   * Collision is continuous: World.get outside the tile's bounds answers from
//     the neighbour (voxel.js adj), so players, curses, projectiles and debris
//     cross the seam physically before the region switches. Co-op players can
//     stand either side of the line.
//   * Crossing: when the party's centre is HYST cells past the border, rebase:
//     everything that moves (players, allies, curses, projectiles, pickups,
//     hazards, markers, debris, particles, flashes, the camera) shifts by the
//     tile offset in the same frame, the neighbour becomes game.level, the old
//     region's systems are disposed (main.leaveRegion) and the new region's
//     start (main.enterRegion). The old tile stays cached and drawn as a
//     neighbour, so you can walk straight back.
//   * The look (sky, fog, light, grading, time of day) blends across a band
//     round the border (Environment.setBlend); ambience crossfades.
//   * Memory: only the current region and its neighbours are kept; the rest are
//     dropped. Fast travel / dungeons (main.clearLevel) detach every tile; the
//     cached builds are reused when you come back.
//
// API (game.seam)
//   acquire(id) -> L          the region's build (finishing a background build now if needed)
//   enter(L)                  main.loadRegion: L is current; start preparing its neighbours
//   detach()                  main.clearLevel: unlink and unmesh every tile
//   update(realDt)            per frame (main.frame)
//   localize(pos) -> { region, pos }   which region a point in the current frame is in (saves)
//   tileFor(regionId)         { id, L, state, … } or null;  stats: { maxStep, rebases, … }
import * as THREE from 'three/webgpu';
import { REGIONS, neighbours, buildRegionSteps, cachedRegion, dropRegionCache, cachedRegionIds } from './regions/index.js';
import { tileOffset, OPP } from './regions/seams.js';
import { distanceFieldG } from '../ui/tracker.js';
import { skinTexture, SORCERER_LOOKS } from '../entities/models.js';

const SIDES = ['n', 's', 'e', 'w'];
const HYST = 3;            // cells past the border before the region switches (no flip-flopping on the line)
const BLEND = 44;          // the look blends over this many cells either side of a border
const SHOW = 40;           // a neighbour is drawn when the party is within view radius + SHOW of its border
const FAR_ENEMY = 64;      // curses further than this from the party are not carried over a border

const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export class SeamlessWorld {
  constructor(game) {
    this.game = game;
    this.tiles = new Map();      // id -> { id, L, state: 'building'|'built'|'preparing'|'live', job, prep, shown, off }
    this.cur = null;
    this.enabled = true;
    this.stats = { maxStep: 0, maxStepAt: '', maxFrameWork: 0, rebases: 0, built: 0, prepared: 0, lastRebaseMs: 0 };
    this._f = [];
  }
  get L() { return this.cur?.L ?? null; }
  viewRadius() { return { low: 56, medium: 70, high: 86 }[this.game.gr.quality] ?? 96; }
  tileFor(id) { return this.tiles.get(id) ?? null; }

  // ---------------------------------------------------------------- tiles
  tile(id) {
    let t = this.tiles.get(id);
    if (!t) {
      const L = cachedRegion(id);
      t = { id, L, state: L ? 'built' : 'queued', job: null, prep: null, shown: false, off: null };
      this.tiles.set(id, t);
    }
    return t;
  }
  // the region's build, now (behind a fade: fast travel, loading a save, leaving a dungeon)
  acquire(id) {
    const t = this.tile(id);
    if (!t.L) {
      t.job ??= buildRegionSteps(id);
      while (!t.job.done) t.job.step(Infinity);
      t.L = t.job.L; t.job = null;
    }
    t.state = 'live'; t.prep = null;     // main.loadWorld meshes it and builds its decorations
    return t.L;
  }
  enter(L) {
    const t = this.tile(L.regionId);
    t.L = L; t.state = 'live'; t.prep = null; t.shown = true; t.off = { x: 0, y: 0, z: 0 };
    this.cur = t;
    L.world.group.position.set(0, 0, 0);
    const sg = L.shafts?.group; if (sg) { sg.userData.base ??= sg.position.clone(); sg.position.copy(sg.userData.base); }
    this.floor(L, true);
    this.evict();
    this.relink();
  }
  // the region's far ground plane only shows under the current tile
  floor(L, on) { for (const c of L.world.group.children) if (c.name === 'region-floor') c.visible = on; }
  // keep the current region and its neighbours; drop the rest
  evict() {
    const keep = new Set([this.cur.id, ...Object.values(neighbours(this.cur.id))]);
    for (const [id, t] of this.tiles) if (!keep.has(id)) { this.hide(t); if (t.L?.world.meshed) t.L.world.unload(); this.tiles.delete(id); }
    for (const id of cachedRegionIds()) if (!keep.has(id)) dropRegionCache(id);
    for (const id of keep) if (REGIONS[id]) this.tile(id);
  }
  // every tile off the map and unmeshed (dungeon, fast travel, title): builds stay cached
  detach() {
    const g = this.game;
    for (const t of this.tiles.values()) {
      this.hide(t);
      if (t.state === 'live' || t.state === 'preparing') { if (t.L?.world.meshed) t.L.world.unload(); t.state = t.L ? 'built' : 'queued'; t.prep = null; }
      if (t.L) t.L.world.adj = null;
    }
    if (this.cur?.L) this.cur.L.world.adj = null;
    this.cur = null;
    g.minimap && (g.minimap.links = []);
    g.env?.setBlend(null);
  }
  hide(t) {
    const g = this.game;
    if (!t.L) return;
    if (t !== this.cur) {
      if (t.L.world.group.parent) g.scene.remove(t.L.world.group);
      if (t.L.shafts?.group?.parent) g.scene.remove(t.L.shafts.group);
      g.foliage?.unlink(t.L.world);
    }
    t.shown = false;
  }

  // ---------------------------------------------------------------- background work
  // Build / prepare the neighbour whose border is nearest, a slice at a time.
  work(budget) {
    const t0 = performance.now();
    const order = this.neighbourOrder().filter((x) => x.t.state !== 'live');
    for (const { t } of order) {
      while (performance.now() - t0 < budget) {
        const s0 = performance.now();
        const done = this.advance(t, budget - (performance.now() - t0));
        const dt = performance.now() - s0;
        if (dt > this.stats.maxStep) { this.stats.maxStep = dt; this.stats.maxStepAt = `${t.id}:${t.state}:${t.job?.label ?? t.prepLabel ?? ''}`; }
        if (done) break;
      }
      if (performance.now() - t0 >= budget) break;
    }
  }
  advance(t, ms) {
    const g = this.game;
    if (t.state === 'queued') { t.job = buildRegionSteps(t.id); t.state = 'building'; }
    if (t.state === 'building') {
      if (!t.job.step(Math.max(0.3, Math.min(ms, 4)))) return false;
      t.L = t.job.L; t.job = null; t.state = 'built'; this.stats.built++;
    }
    if (t.state === 'built') { t.prep = this.prepare(t.L); t.state = 'preparing'; return false; }
    if (t.state === 'preparing') {
      const r = t.prep.next();
      t.prepLabel = r.value;
      if (r.done) { t.prep = null; t.state = 'live'; this.stats.prepared++; this.relink(); return true; }
      return false;
    }
    void g;
    return true;
  }
  // make a built tile drawable without meshing it: world init, decorations, shafts, minimap
  *prepare(L) {
    const g = this.game, w = L.world;
    w.viewRadius = this.viewRadius();
    if (!w.meshed) { w.init(g.materials, { streaming: true, focus: { x: -1e6, z: -1e6 }, initialRadius: 0 }); yield 'init'; }
    if (L.deco.buildG) yield* L.deco.buildG(w, g.materials, g.gr.preset.decoDensity);
    else { L.deco.build(w, g.materials, g.gr.preset.decoDensity); yield 'deco'; }
    this.floor(L, false);
    const P = g.gr?.preset ?? {};
    if (L.shafts) {
      L.shafts.group.visible = !!P.shafts;
      L.shafts.group.userData.base ??= L.shafts.group.position.clone();
      if (P.sunShafts > 0 && L.shafts.addAuto && !L.shafts.auto && L.biome?.look?.shafts !== false) { try { L.shafts.addAuto(w, { count: P.sunShafts }); } catch (e) { console.warn('sun shafts', e); } yield 'shafts'; }
    }
    if (g.minimap?.prebuildG) yield* g.minimap.prebuildG(L);
    // what the region's systems would otherwise work out the moment you walk in:
    // the spawn director's walkable-ground flood, the people's painted skins
    if (L._walk === undefined && L.spawn) { try { L._walk = yield* distanceFieldG(w, L.spawn, 2); } catch (e) { L._walk = null; } }
    for (const look of new Set((L.people ?? []).map((p) => p.look ?? 'npc_civ_2'))) if (SORCERER_LOOKS[look]) { skinTexture(look); yield 'skin'; }
    return true;
  }
  // neighbours of the current tile, nearest border first (signed distance: < 0 = past it)
  neighbourOrder() {
    const L = this.L; if (!L) return [];
    const c = this.centre(), w = L.world, out = [];
    for (const [side, id] of Object.entries(neighbours(L.regionId))) {
      if (!REGIONS[id]) continue;
      const d = side === 'e' ? w.sx - c.x : side === 'w' ? c.x : side === 's' ? w.sz - c.z : c.z;
      out.push({ side, id, d, t: this.tile(id) });
    }
    return out.sort((a, b) => a.d - b.d);
  }
  centre() {
    const g = this.game;
    // hosting: the party is every player in the world, the guests' sorcerers too
    const all = g.net?.isHost ? [...g.players, ...g.net.crossingFigures()] : g.players;
    const ps = all.filter((p) => !p.dead);
    const list = ps.length ? ps : all;
    const c = this._c ??= new THREE.Vector3();
    if (!list.length) return c.copy(g.rig.focus);
    c.set(0, 0, 0); for (const p of list) c.add(p.pos); return c.divideScalar(list.length);
  }

  // ---------------------------------------------------------------- links
  // Offsets and collision links for the current tile's live neighbours.
  relink() {
    const L = this.L; if (!L) return;
    const adj = [];
    for (const [side, id] of Object.entries(neighbours(L.regionId))) {
      const t = this.tiles.get(id);
      if (!t?.L || t.state !== 'live') continue;
      const o = tileOffset(L, side, t.L); if (!o) continue;
      t.off = o; t.side = side;
      adj.push({ w: t.L.world, ox: o.x, oy: o.y, oz: o.z, id, side });
      t.L.world.adj = null;
    }
    L.world.adj = adj.length ? adj : null;
    this.relights();
  }
  // the light manager's lanterns: this region's and the visible neighbours' (in this frame)
  relights() {
    const g = this.game, L = this.L; if (!L) return;
    const list = [...L.world.staticLights];
    for (const t of this.tiles.values()) if (t !== this.cur && t.shown && t.off) for (const s of t.L.world.staticLights) list.push({ ...s, x: s.x + t.off.x, y: s.y + t.off.y, z: s.z + t.off.z });
    g.lights.setStatic(list);
  }

  // ---------------------------------------------------------------- per frame
  update(realDt) {
    const g = this.game;
    if (!this.enabled || !this.cur || g.mode !== 'world' || g.level !== this.cur.L) return;
    const t0 = performance.now();
    const L = this.L, w = L.world;
    w.adjBlocked = !!g.worldMission;                 // a curtain is down: nobody crosses
    const order = this.neighbourOrder();
    const near = order[0] && order[0].d < this.viewRadius() + SHOW + 60;
    // background building: more time when a border is close and its region is not ready yet
    const urgent = order.find((o) => o.t.state !== 'live' && o.d < 120);
    // (the frame's CPU budget: what is left of ~10 ms after the game's own work, at least 1 ms)
    const spent = performance.now() - (g.frameT0 ?? t0);
    if (order.some((o) => o.t.state !== 'live')) this.work(Math.max(1, Math.min(urgent ? 7 : 3, (urgent ? 12 : 9) - spent)));
    // show / stream / blend the live neighbours
    const R = this.viewRadius(), fl = this._f; fl.length = 0;
    for (const p of g.players) fl.push(p.pos);
    if (g.net) for (const f of g.net.figures) if (f.inWorld) fl.push(f.pos);
    fl.push(g.rig.focus);
    let blend = null, bk = 0, changed = false;
    for (const { side, d, t } of order) {
      if (t.state !== 'live' || !t.off) continue;
      const want = d < R + SHOW;
      if (want !== t.shown) {
        changed = true;
        if (want) {
          t.L.world.group.position.set(t.off.x, t.off.y, t.off.z);
          g.scene.add(t.L.world.group);
          if (t.L.shafts?.group) { const b = t.L.shafts.group.userData.base ?? new THREE.Vector3(); t.L.shafts.group.position.set(b.x + t.off.x, b.y + t.off.y, b.z + t.off.z); g.scene.add(t.L.shafts.group); }
          t.shown = true;
        } else this.hide(t);
      }
      const tw = t.L.world;
      if (t.shown) {
        // mesh the strip of the neighbour the party can see (its own coordinates)
        const lf = t._lf ??= [];
        lf.length = fl.length;
        for (let i = 0; i < fl.length; i++) { const q = lf[i] ??= { x: 0, z: 0 }; q.x = fl[i].x - t.off.x; q.z = fl[i].z - t.off.z; }
        if (!g.streamedNow || d < 24) tw.stream(lf, 1, 1.5);   // (one chunk column a frame between the two worlds)
        tw.flush(1);
        if (d < 96) g.foliage?.link(tw, t.L.foliage ?? t.L.biome?.look?.foliage ?? {}, t.off);
        else g.foliage?.unlink(tw);
      } else if (tw.loaded.size && d > R + SHOW + 64) { for (const key of [...tw.loaded]) { const [kx, kz] = key.split(',').map(Number); tw.unloadColumn(kx, kz); } }
      // the look: half way at the border, all theirs HYST.. cells past it
      const k = d >= 0 ? 0.5 * (1 - smooth(d / BLEND)) : 0.5 + 0.5 * smooth(-d / BLEND);
      if (k > bk) { bk = k; blend = t; }
    }
    if (changed) { this.relights(); this.minimapLinks(); }
    g.env?.setBlend(blend ? blend.L.biome : null, bk);
    // crossing
    if (near && g.state === 'playing') this.checkCross(order);
    const dt = performance.now() - t0;
    if (dt > this.stats.maxFrameWork) this.stats.maxFrameWork = dt;
    this.stats.lastFrameWork = dt;
  }
  minimapLinks() {
    const g = this.game; if (!g.minimap) return;
    g.minimap.links = [...this.tiles.values()].filter((t) => t !== this.cur && t.shown && t.off && t.L._miniBase).map((t) => ({ canvas: t.L._miniBase, x: t.off.x, z: t.off.z }));
  }
  canCross() {
    const g = this.game;
    return g.state === 'playing' && g.mode === 'world' && !g.worldMission && !g.traveling && !g.cutscenes?.active && !g.domainSys?.active && !g.paused && g.wipeLeft <= 0;
  }
  checkCross(order) {
    if (!this.canCross() || this.game.net?.isGuest) return;   // visiting: the host's screen decides (js/online/net.js)
    const c = this.centre(), w = this.L.world;
    for (const { side, t } of order) {
      if (t.state !== 'live' || !t.off) continue;
      const past = side === 'e' ? c.x - w.sx : side === 'w' ? -c.x : side === 's' ? c.z - w.sz : -c.z;
      if (past < HYST) continue;
      // the centre must actually be over the neighbour (not off the end of a shorter border)
      const lx = Math.floor(c.x - t.off.x), lz = Math.floor(c.z - t.off.z), tw = t.L.world;
      if (lx < 0 || lz < 0 || lx >= tw.sx || lz >= tw.sz) continue;
      this.rebase(t);
      return;
    }
  }

  // ---------------------------------------------------------------- crossing
  rebase(t) {
    const g = this.game, t0 = performance.now();
    const A = this.cur, d = new THREE.Vector3(t.off.x, t.off.y, t.off.z);
    const carried = (g.spawns?.live?.() ?? []).slice();
    // 1. the old region's systems go (the party, allies and the fight stay)
    g.leaveRegion();
    // 2. everything that moves shifts into the new tile's frame
    this.shiftAll(d);
    // 3. swap the tiles
    t.off = { x: 0, y: 0, z: 0 };
    A.off = { x: -d.x, y: -d.y, z: -d.z };
    A.side = OPP[t.side];
    for (const o of this.tiles.values()) if (o !== t && o !== A) { o.off = null; }
    A.L.world.group.position.set(A.off.x, A.off.y, A.off.z);
    t.L.world.group.position.set(0, 0, 0);
    for (const [tile, o] of [[A, A.off], [t, t.off]]) if (tile.L.shafts?.group) { const b = tile.L.shafts.group.userData.base ?? new THREE.Vector3(); tile.L.shafts.group.position.set(b.x + o.x, b.y + o.y, b.z + o.z); }
    this.floor(A.L, false); this.floor(t.L, true);
    if (!A.L.world.group.parent) g.scene.add(A.L.world.group);
    if (!t.L.world.group.parent) g.scene.add(t.L.world.group);
    A.shown = true; t.shown = true;
    A.L.world.adj = null;
    g.foliage?.link(t.L.world, t.L.foliage ?? t.L.biome?.look?.foliage ?? {}, { x: d.x, y: d.y, z: d.z });   // (in case it was not linked yet)
    g.foliage?.rebase(t.L.world, d);
    this.cur = t;
    const L = t.L, w = L.world;
    w.viewRadius = this.viewRadius();
    g.level = L; g.world = w; g.biome = L.biome; g.shafts = L.shafts;
    g.env?.adoptWorld(w);
    g.env?.set(L.biome, { seamless: true });
    g.audio?.setAmbience(L.biome?.ambience, { fade: 2.5 });
    if (g.state === 'playing') g.audio?.setMusic(L.biome?.music ?? 'hub');
    // where you respawn after a wipe here: the border road you came in on
    const lead = g.players.find((p) => !p.dead) ?? g.players[0];
    const gate = L.gates.find((x) => x.to === A.id);
    L.respawn = (gate?.arrive ?? lead?.pos ?? L.spawn).clone();
    this.relink();
    // 4. the new region's systems start
    g.enterRegion(L, { seamless: true, from: A.id });
    this.carried = carried;   // handed to the new spawn director once it exists (onSystemsReady)
    this.evict();
    this.minimapLinks();
    this.stats.rebases++;
    this.stats.lastRebaseMs = performance.now() - t0;
    this.stats.maxRebaseMs = Math.max(this.stats.maxRebaseMs ?? 0, this.stats.lastRebaseMs);
  }
  // main.enterRegion finished starting the new region's systems (one per frame after a crossing):
  // curses that followed you over the line join its spawn director (it fades them when far)
  onSystemsReady(L) {
    const g = this.game, carried = this.carried ?? []; this.carried = null;
    if (!g.spawns || g.spawns.L !== L) return;
    for (const e of carried) if (!e.dead && g.enemies.includes(e) && !g.spawns.list.includes(e)) { e.ambient = true; g.spawns.list.push(e); }
  }
  // Shift every moving thing by -d (the new tile's frame), each vector once.
  shiftAll(d) {
    const g = this.game, seen = new Set();
    const mv = (v) => { if (v && v.isVector3 && !seen.has(v)) { seen.add(v); v.sub(d); } };
    const my = (o, k) => { if (o && typeof o[k] === 'number') o[k] -= d.y; };
    // characters
    for (const p of g.players) { mv(p.pos); mv(p.object?.position); mv(p.safePos); mv(p.aimPoint); mv(p.lastPos); my(p, 'visY'); }
    for (const a of g.allies) { mv(a.pos); mv(a.object?.position); mv(a.home); mv(a.lastPos); my(a, 'visY'); }
    // curses: near ones come along, far ones are left behind (they would only be despawned)
    const c = this.centre().clone().sub(d);
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      mv(e.pos); mv(e.object?.position); mv(e.home); mv(e.lastPos); my(e, 'visY'); my(e, 'floorY');
      if (e.arena?.c) mv(e.arena.c);
      if (!e.isDummy && !e.dead && e.pos.distanceTo(c) > FAR_ENEMY && !e.questTag) { g.scene.remove(e.object); g.enemies.splice(i, 1); if (e.marker) { try { g.markers.cancel(e.marker); } catch { /* gone */ } } }
    }
    // pooled effects that keep their own positions
    for (const h of g.hazards?.list ?? []) mv(h.pos);
    for (const it of g.debris?.items ?? []) if (it?.active) mv(it.pos);
    for (const b of g.bolts?.bolts ?? []) mv(b.origin);
    for (const l of g.lights?.dynamic ?? []) if (!l.follow) { l.x -= d.x; l.y -= d.y; l.z -= d.z; }
    for (const pool of [g.particles?.glow, g.particles?.smoke, ...(g.particles?.pools ?? [])]) {
      if (!pool?.a0 || seen.has(pool)) continue; seen.add(pool);
      const a = pool.a0.array; for (let i = 0; i < a.length; i += 4) { a[i] -= d.x; a[i + 1] -= d.y; a[i + 2] -= d.z; }
      pool.dirtyMin = 0; pool.dirtyMax = pool.max - 1;
    }
    // every other object straight in the scene (projectiles, pickups, effect meshes, markers, character
    // models) — but not the world tiles, the sky, the lights, foliage or GPU pools
    const skip = new Set([g.foliage?.group, g.lights?.sun, g.lights?.sun?.target, g.lights?.hemi, g.debris?.mesh, g.bolts?.core, g.bolts?.glow, g.particles?.glow?.mesh, g.particles?.smoke?.mesh, ...(g.particles?.pools ?? []).map((p) => p.mesh)]);
    for (const t of this.tiles.values()) if (t.L) { skip.add(t.L.world.group); if (t.L.shafts?.group) skip.add(t.L.shafts.group); }
    for (const o of g.scene.children) { if (skip.has(o) || o.isLight || o.name === 'clouds') continue; mv(o.position); }
    // the camera
    const rig = g.rig; mv(rig.focus); mv(rig.dead); mv(rig.camera.position); if (rig.cine?.center) mv(rig.cine.center);
    rig.camera.updateMatrixWorld();
    if (g.tracker?.goal?.pos) mv(g.tracker.goal.pos);
  }

  // Which region a point (current frame) is in: for saving the party's position.
  localize(pos) {
    const L = this.L; if (!L || !pos) return null;
    const w = L.world;
    if (pos.x >= 0 && pos.z >= 0 && pos.x < w.sx && pos.z < w.sz) return { region: L.regionId, pos };
    for (const t of this.tiles.values()) {
      if (t === this.cur || !t.off || t.state !== 'live') continue;
      const lx = pos.x - t.off.x, lz = pos.z - t.off.z, tw = t.L.world;
      if (lx >= 0 && lz >= 0 && lx < tw.sx && lz < tw.sz) return { region: t.id, pos: new THREE.Vector3(lx, pos.y - t.off.y, lz) };
    }
    return { region: L.regionId, pos };
  }
}
