// In-world story missions. A main quest's mission step no longer teleports
// into a generated dungeon: a curtain (帳, a black barrier dome — the same
// shell as a Domain's barrier, gfx/barrier.js, with a night sky inside) pours
// down over a real district of the region round the chapter's anchor, and the
// chapter plays out on the region's own streets, woods and stations:
//   1. objective  exorcise N curses in waves at the district's landmarks,
//                 free the trapped (cages on the floor near landmarks; a pack
//                 guards each), or seal cursed objects at altars (each wakes a
//                 pack when you start the seal) — guided by the tracker;
//   2. boss       the Special Grade rises at the arena (a clear, flat floor
//                 near the anchor) with its boss_<id> entrance;
//   3. won        boss_down cutscene, its chest, the chapter's rewards and the
//                 results panel; the curtain cracks and lifts, the quest
//                 completes.
// While it runs nobody crosses the curtain (players, curses — it is a barrier),
// gates and Window stations are shut, ambient spawns are suppressed inside the
// zone, and dying respawns you at the curtain's edge with the mission kept.
// Pause → Abandon mission lifts it (the quest step stays; walk back in to retry).
//
// API
//   missionZone(L, ch)         the chapter's zone in a loaded region (cached per region build):
//                              { id, x, z, y, r, center, cells, spots: [{ pos, name }], arena: { pos, R, name } }
//   zoneCenter(L, ch)          the zone's centre (cheap: no flood)
//   startWorldMission(game, ch | id, threat = 0)   travel there if needed and drop the curtain
//   maybeStartWorldMission(game, chId)             quests: auto-start when the party walks in
//   game.worldMission          the running WorldMission (also game.mission while it runs, so
//                              kills, the boss, chests and cutscenes find it), with .zone { x, z, r }
//   worldMission.abandon()     lift the curtain without finishing
//   lairDef(ch, threat)        the chapter's optional "Cursed Lair" dungeon (the old generated
//                              level, game.startMission) offered once the chapter is cleared
import * as THREE from 'three/webgpu';
import { Mission } from '../mission.js';
import { buildSorcererModel } from '../entities/models.js';
import { makeBarrier, skyUniforms, WALL } from '../gfx/barrier.js';
import { distanceField } from '../ui/tracker.js';
import { ENEMY_TABLES } from './levelgen.js';
import { CURSES } from '../entities/curses.js';
import { chapter, missionDef, arc, BOSS_NAMES } from '../story/chapters.js';
import { REGIONS, buildRegion, floorAt } from './regions/index.js';
import { toast, h } from '../ui/ui.js';
import { showChapterCard } from '../ui/chapterMap.js';
import { itemInfo } from '../loot.js';

const tmpC = new THREE.Color();
const FORM = 1.8, CRACK = 0.9, SHATTER = 1.5;
// under the curtain it is night (an environment override, like a Domain's; gfx/environment.js)
const CURTAIN_ENV = { skyTop: 0x020208, skyHorizon: 0x14102a, fog: 0x0a0818, fogDensity: 0.012, hemiSky: 0x7a80c8, hemiGround: 0x101018, hemiI: 0.85, sun: 0xa0b0ff, sunI: 0.4, grade: { tint: [0.9, 0.93, 1.1], lift: [0.0, 0.0, 0.02], sat: 0.85, contrast: 1.15, vignette: 0.55 }, __domain: true };

// ------------------------------------------------------------------ the zone
function standable(world, x, y, z) {
  return y > 0 && y < world.sy - 2 && world.solidAt(x + 0.5, y - 0.5, z + 0.5) && !world.solidAt(x + 0.5, y + 0.5, z + 0.5) && !world.solidAt(x + 0.5, y + 1.5, z + 0.5);
}
const W_OF = (ch) => ch.world ?? {};

export function zoneCenter(L, ch) {
  const W = W_OF(ch);
  if (W.center) return floorAt(L, W.center[0] + 0.5, W.center[1] + 0.5, W.y ?? null);
  const a = L.anchors?.['lair_' + ch.id];
  return (a ?? L.spawn).clone();
}

// Every reachable floor cell within the zone (flooded from the centre, so the
// curses, cages and altars it places can all be walked to), the objective
// spots at its landmarks and the flattest open floor near the arena hint.
export function missionZone(L, ch) {
  L._wmZones ??= {};
  if (L._wmZones[ch.id]) return L._wmZones[ch.id];
  const W = W_OF(ch), world = L.world;
  const c = zoneCenter(L, ch);
  const r = W.r ?? 34;
  const field = distanceField(world, c, 2.5);
  const cells = [], grid = new Map();
  const cx = Math.floor(c.x), cz = Math.floor(c.z);
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const x = cx + dx, z = cz + dz;
    if (x < 1 || z < 1 || x >= world.sx - 1 || z >= world.sz - 1) continue;
    const e = Math.hypot(x + 0.5 - c.x, z + 0.5 - c.z);
    if (e > r - 2.5) continue;
    const i = z * field.W + x, d = field.d[i];
    if (!isFinite(d) || d > e * 2.6 + 12) continue;
    const y = field.ys[i];
    const open = !world.solidAt(x + 0.5, y + 2.5, z + 0.5) && !world.solidAt(x + 0.5, y + 3.5, z + 0.5);
    const cell = { x: x + 0.5, y, z: z + 0.5, e, d, open };
    cells.push(cell); grid.set(x + ',' + z, cell);
  }
  if (!cells.length) { const cell = { x: c.x, y: c.y, z: c.z, e: 0, d: 0, open: true }; cells.push(cell); grid.set(Math.floor(c.x) + ',' + Math.floor(c.z), cell); }
  const near = (x, z, maxR = 10, wantOpen = true) => {
    let best = null, bd = Infinity;
    for (const q of cells) {
      if (wantOpen && !q.open) continue;
      const dd = Math.hypot(q.x - x, q.z - z); if (dd < bd && dd <= maxR) { bd = dd; best = q; }
    }
    return best ?? (wantOpen ? near(x, z, maxR * 2, false) : cells[0]);
  };
  const V = (q) => new THREE.Vector3(q.x, q.y, q.z);
  // the arena: the flattest open floor near the hint
  const hint = W.arena ? { x: W.arena[0] + 0.5, z: W.arena[1] + 0.5 } : { x: c.x, z: c.z };
  let arena = null, best = -Infinity;
  for (const q of cells) {
    const dh = Math.hypot(q.x - hint.x, q.z - hint.z); if (dh > (W.arena ? 10 : 16) || !q.open || q.e > r - 10) continue;
    let score = 0, n = 0;
    for (let dz = -7; dz <= 7; dz += 1) for (let dx = -7; dx <= 7; dx += 1) {
      if (dx * dx + dz * dz > 49) continue; n++;
      const o = grid.get(Math.floor(q.x + dx) + ',' + Math.floor(q.z + dz));
      if (o && Math.abs(o.y - q.y) <= 1 && o.open) score++;
    }
    const s = score / n - dh * 0.012;
    if (s > best) { best = s; arena = q; }
  }
  arena ??= near(hint.x, hint.z);
  // objective spots: the chapter's landmarks, then far-apart open floor
  const count = W.count ?? (ch.objective === 'exorcise' ? 4 : 3);
  const spots = [];
  for (const s of W.spots ?? []) { if (spots.length >= count) break; const q = near(s[0] + 0.5, s[1] + 0.5, 9); if (q) spots.push({ pos: V(q), name: s[2] ?? null }); }
  const pool = cells.filter((q) => q.open && q.e > r * 0.2 && q.e < r - 6);
  while (spots.length < count && pool.length) {
    let pick = null, pd = -1;
    for (let k = 0; k < pool.length; k += 3) {
      const q = pool[k];
      let md = Math.hypot(q.x - arena.x, q.z - arena.z) * 0.8;
      for (const s of spots) md = Math.min(md, Math.hypot(q.x - s.pos.x, q.z - s.pos.z));
      if (md > pd) { pd = md; pick = q; }
    }
    if (!pick) break;
    spots.push({ pos: V(pick), name: null });
  }
  const zone = { id: ch.id, x: c.x, z: c.z, y: c.y, r, center: c.clone(), cells, grid, spots, arena: { pos: V(arena), R: W.arenaR ?? 11, name: W.arenaName ?? 'the arena' }, near };
  L._wmZones[ch.id] = zone;
  return zone;
}
// A floor cell just inside the curtain on the side facing `from`.
function edgeSpot(zone, from) {
  const dx = from.x - zone.x, dz = from.z - zone.z, n = Math.hypot(dx, dz) || 1;
  let best = null, bs = -Infinity;
  for (const q of zone.cells) {
    if (q.e < zone.r - 9 || q.e > zone.r - 3.5) continue;
    const s = ((q.x - zone.x) * dx + (q.z - zone.z) * dz) / (n * q.e) + (q.open ? 0.1 : 0);
    if (s > bs) { bs = s; best = q; }
  }
  best ??= zone.cells[0];
  return new THREE.Vector3(best.x, best.y, best.z);
}
// A random reachable floor between r0 and r1 from `around`.
function spawnSpot(zone, around, r0, r1) {
  const C = zone.cells;
  for (let k = 0; k < 40; k++) {
    const q = C[(Math.random() * C.length) | 0];
    const d = Math.hypot(q.x - around.x, q.z - around.z);
    if (d >= r0 && d <= r1 && q.e < zone.r - 3) return new THREE.Vector3(q.x + (Math.random() - 0.5) * 0.6, q.y, q.z + (Math.random() - 0.5) * 0.6);
  }
  const q = zone.near(around.x, around.z, r1 + 4, false);
  return new THREE.Vector3(q.x, q.y, q.z);
}

// The optional Cursed Lair: the chapter's old generated dungeon, for loot.
export function lairDef(ch, threat = 0) {
  const d = missionDef(ch, threat);
  return { ...d, id: 'lair_' + ch.id, quest: 'lair_' + ch.id, name: `Cursed Lair: ${ch.place}`, place: `Cursed Lair · ${ch.place}`, outro: 'The lair falls silent. Whatever nested here is gone — for now.', chapter: undefined };
}

// ------------------------------------------------------------------ the mission
const OBJ = {
  exorcise: (o) => `${o.done} / ${o.need} curses exorcised`,
  rescue: (o) => `${o.done} / ${o.need} freed`,
  seal: (o) => `${o.done} / ${o.need} sealed`,
};

export class WorldMission extends Mission {
  constructor(game, ch, threat, zone, entry) {
    const def = { ...missionDef(ch, threat), world: true };
    const items = ch.objective === 'exorcise' ? [] : zone.spots.map((s) => ({ pos: s.pos.clone(), name: s.name, done: false, room: null }));
    const W = W_OF(ch);
    const need = ch.objective === 'exorcise' ? (W.need ?? 10 + def.difficulty * 3) : items.length;
    const a = zone.arena;
    const level = {
      objective: { type: ch.objective, items, need, done: 0 }, chests: [], rooms: [], gates: [],
      bossRoom: { center: a.pos.clone(), y: a.pos.y, x0: a.pos.x - a.R - 1, x1: a.pos.x + a.R + 1, z0: a.pos.z - a.R - 1, z1: a.pos.z + a.R + 1, type: 'boss', spawns: [[a.pos.x, a.pos.y, a.pos.z]] },
      world: game.world, biome: game.biome, spawn: entry,
    };
    super(game, def, level);
    this.isWorld = true;
    this.ch = ch; this.Z = zone; this.threat = threat;
    this.zone = { x: zone.x, z: zone.z, r: zone.r };
    this.entry = entry.clone();
    this.stage = 'form'; this.t = 0; this.formT = 0;
    this.enemiesList = [];
    this.sides = new Map();
    this.table = ENEMY_TABLES[ch.biome] ?? ENEMY_TABLES.jujutsu_high;
    this.sites = ch.objective === 'exorcise' ? zone.spots.map((s) => ({ pos: s.pos.clone(), name: s.name, waves: 2 + (def.difficulty >= 3 ? 1 : 0), waveIdx: 0, waveT: 0, live: [], started: false })) : [];
    this.siteIdx = 0; this.trickleT = 14;
  }
  // ---------------------------------------------------------------- start
  setup() {
    const g = this.game, Lr = g.level, ch = this.ch, A = arc(ch.arc);
    g.worldMission = this; g.mission = this;
    // the curtain
    this.sky = skyUniforms();
    this.sky.type.value = 6; this.sky.cTop.value.set(0x010208); this.sky.cHor.value.set(0x0c0718); this.sky.cStars.value = 0.55; this.sky.cBand.value.set(new THREE.Color(A?.color ?? '#7a5cff').multiplyScalar(0.35));
    this.barrier = makeBarrier(this.sky);
    this.B = this.barrier.material.userData;
    this.B.radius.value = this.Z.r; this.B.rim.value.set(A?.color ?? '#7a5cff'); this.B.form.value = 0; this.B.crack.value = 0; this.B.shatter.value = 0;
    this.barrier.position.set(this.Z.x, this.Z.y - 0.5, this.Z.z); this.barrier.scale.setScalar(this.Z.r);
    this.barrier.visible = true;
    g.scene.add(this.barrier);
    // the party inside; respawns at the edge
    this.prevRespawn = Lr.respawn?.clone() ?? null;
    Lr.respawn = this.entry.clone();
    const lead = g.players.find((p) => !p.dead) ?? g.players[0];
    for (const p of g.players) {
      if (Math.hypot(p.pos.x - this.Z.x, p.pos.z - this.Z.z) > this.Z.r - 3) { p.pos.copy(lead && Math.hypot(lead.pos.x - this.Z.x, lead.pos.z - this.Z.z) < this.Z.r - 3 ? lead.pos : this.entry); p.vel?.set(0, 0, 0); }
    }
    for (const e of [...g.players, ...g.allies]) this.sides.set(e, true);
    // no ambient curses inside; gates and Window stations shut while it runs
    g.spawns?.suppress?.(this.zone);
    this.shut = [];
    for (const it of g.interactables) {
      if (!/^(gate-|station-|lair-)/.test(String(it.id))) continue;
      const prev = it.enabled; this.shut.push([it, prev]);
      it.enabled = () => !g.worldMission && (!prev || prev());
    }
    // objective props
    for (const it of this.obj.items) { if (this.obj.type === 'rescue') this.makeCage(it); else this.makeAltar(it); }
    g.questMarkers?.refresh?.();
    g.tracker?.clear();
    this.updateText();
    this.guideKey = null; this.guideT = 0;
    // the banner (no camera move), the chapter's briefing cutscene the first time, its title card
    this.banner(`帳 · The curtain descends`, ch.place, `Ijichi: "Emerge from the darkness, blacker than black. Purify the impure."`, A?.color);
    g.audio?.gong?.(); g.audio?.energy?.('summon'); g.shake?.(0.3);
    g.cutscenes?.playOnce('mission_' + ch.id);
    showChapterCard(g, this.def);
    g.save.write();
  }
  banner(kicker, name, line, color = '#7a5cff') {
    document.querySelector('.wm-banner')?.remove();
    const el = h('div', { class: 'wm-banner', style: `--wm:${color}`, 'aria-live': 'polite' }, h('div', { class: 'wm-kicker' }, kicker), h('div', { class: 'wm-name' }, name), line ? h('div', { class: 'wm-line' }, line) : null);
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 5000);
  }
  // ---------------------------------------------------------------- props
  makeCage(it) {
    const g = this.game, k = this.obj.items.indexOf(it);
    const looks = W_OF(this.ch).captives ?? ['npc_civ_0', 'npc_civ_2', 'npc_civ_5'];
    const grp = new THREE.Group(); grp.position.copy(it.pos);
    const look = looks[k % looks.length];
    let rig = null;
    try { rig = g.regionNpcs?.makeRig?.(look) ?? buildSorcererModel(look); } catch (e) { rig = buildSorcererModel('yuji'); }
    rig.root.scale.multiplyScalar(0.95); grp.add(rig.root);
    rig.armR.rotation.x = -2.6; rig.armL.rotation.x = -2.4;
    const bars = new THREE.MeshStandardNodeMaterial({ color: 0x8a4aff, emissive: 0x6a2aff, emissiveIntensity: 1.6, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), bars); bar.position.set(Math.cos(a) * 0.9, 1.3, Math.sin(a) * 0.9); grp.add(bar); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.15, 8), bars); top.position.y = 2.65; grp.add(top);
    this.addProp(grp);
    it.object = grp; it.rig = rig;
    it.light = g.lights.attach(grp, 0xa070ff, 3, 6, { offsetY: 2 });
    const who = W_OF(this.ch).captiveLabel ?? 'Free the captive';
    g.interactables.push({ id: 'obj' + k, pos: it.pos, radius: 2.4, label: who, hold: 1.2, action: () => this.completeItem(it), enabled: () => !it.done && this.stage === 'objective' });
  }
  makeAltar(it) {
    super.makeAltar(it);
    const ia = this.game.interactables.find((x) => x.id === 'obj' + this.obj.items.indexOf(it));
    if (ia) { const en = ia.enabled; ia.enabled = () => en() && this.stage === 'objective'; ia.label = W_OF(this.ch).sealLabel ?? ia.label; }
  }
  altarWave(it) {
    if (it.waved) return; it.waved = true;
    toast('The cursed object resists!');
    this.spawnPack(it.pos, 4 + Math.min(3, this.def.difficulty - 1), 4, 8, 0xff2a4a);
  }
  completeItem(it) {
    if (it.done) return;
    const g = this.game;
    it.done = true; this.obj.done++;
    g.audio?.energy('heal'); g.audio?.levelUp();
    if (this.obj.type === 'rescue') {
      g.fx.heal(it.pos, 0xffd23a);
      if (it.light) g.lights.remove(it.light);
      let t = 0; g.addUpdater((dt) => { t += dt; it.object.position.y += dt * 3; it.object.scale.setScalar(Math.max(0.01, 1 - t)); return t < 1; });
      toast(W_OF(this.ch).freedText ?? 'Freed! They run for the edge of the curtain.');
    } else {
      g.fx.heal(it.pos, 0xff5a7a);
      it.finger.material = new THREE.MeshStandardNodeMaterial({ color: 0xe8dcb0 });
      g.lights.remove(it.light);
      toast('Cursed object sealed!');
    }
    this.checkObjective();
  }
  // ---------------------------------------------------------------- curses
  pickKinds(n) {
    const T = this.table, out = [];
    if (Math.random() < 0.6 && T.groups?.length) out.push(...T.groups[(Math.random() * T.groups.length) | 0].slice(0, n));
    const tw = T.kinds.reduce((a, b) => a + b[1], 0);
    let g1 = out.filter((k) => CURSES[k]?.grade === '1').length;
    while (out.length < n) {
      let x = Math.random() * tw, k = T.kinds[0][0];
      for (const [kind, w] of T.kinds) { x -= w; if (x <= 0) { k = kind; break; } }
      if (CURSES[k]?.grade === '1' && g1 >= 1 + Math.floor(this.def.difficulty / 3)) k = T.kinds[0][0];
      if (CURSES[k]?.grade === '1') g1++;
      out.push(k);
    }
    return out;
  }
  // the mission's curses plus whatever the boss summoned (not the roamers, building packs or quest curses)
  strays() { const g = this.game; return g.enemies.filter((e) => !e.dead && !e.isDummy && !e.isBoss && !e.roamer && !e.questTag && !e.interior && Math.hypot(e.pos.x - this.Z.x, e.pos.z - this.Z.z) < this.Z.r + 1); }
  alive() { this.enemiesList = this.enemiesList.filter((e) => !e.dead && this.game.enemies.includes(e)); return this.enemiesList; }
  spawnPack(at, n, r0, r1, color = 0x9a5aff, list = null) {
    const g = this.game, cap = g.gr.preset.enemyCap ?? 24, out = [];
    const ELITES = ['swift', 'armored', 'vampiric', 'explosive', 'shadow'];
    for (const kind of this.pickKinds(n)) {
      if (g.enemies.filter((e) => !e.dead && !e.isDummy).length >= cap) break;
      const pos = spawnSpot(this.Z, at, r0, r1);
      const elite = Math.random() < 0.06 + this.threat * 0.08 ? ELITES[(Math.random() * ELITES.length) | 0] : null;
      const e = g.spawnEnemy(kind, pos, { level: this.def.difficulty, elite });
      if (!e) continue;
      e.roamer = false; e.worldMission = this.ch.id; e.spawnT = 0.5;
      this.sides.set(e, true);
      this.enemiesList.push(e); list?.push(e); out.push(e);
      g.fx.summonCircle(pos, e.elite ? 0xff9aff : color);
    }
    if (out.length) g.audio?.energy('summon');
    return out;
  }
  onKill(e) {
    this.stats.kills++;
    if (this.obj.type === 'exorcise' && !e.isBoss && this.stage === 'objective' && Math.hypot(e.pos.x - this.Z.x, e.pos.z - this.Z.z) < this.Z.r + 2) {
      this.obj.done = Math.min(this.obj.need, this.obj.done + 1); this.checkObjective();
    }
  }
  checkObjective() {
    this.updateText();
    if (this.stage !== 'objective' || this.obj.done < this.obj.need) return;
    this.stage = 'bossReady'; this.objDone = true; this.game.objectiveDone = true;
    const g = this.game, bn = BOSS_NAMES[this.def.boss]?.name ?? 'The Special Grade';
    toast(`Objective complete — ${bn} stirs at ${this.Z.arena.name}`, 'big');
    g.audio?.gong();
    this.guideKey = null;
    this.updateText();
  }
  // ---------------------------------------------------------------- text + tracker
  updateText() {
    const g = this.game, bn = this.boss?.B?.name ?? BOSS_NAMES[this.def.boss]?.name ?? 'the Special Grade';
    let t = `帳 ${this.def.objText ?? this.ch.title}`, d = OBJ[this.obj.type]?.(this.obj) ?? '';
    if (this.stage === 'objective' && this.obj.type === 'exorcise') { const s = this.sites[this.siteIdx % Math.max(1, this.sites.length)]; if (s?.name) d += ` · ${s.name}`; }
    if (this.stage === 'bossReady') { t = `帳 Defeat ${bn}`; d = `It waits at ${this.Z.arena.name}: follow the gold beam`; }
    if (this.stage === 'boss') { t = `帳 Defeat ${bn}`; d = 'Exorcise the Special Grade curse'; }
    if (this.stage === 'won' || this.stage === 'lift') { t = `帳 ${this.ch.title}`; d = this.abandoned ? 'Mission abandoned' : 'The curtain is lifting'; }
    if (this.stage === 'form') d = 'The curtain is coming down…';
    g.hud.setObjective(t, d);
  }
  guideTarget() {
    const g = this.game;
    if (this.stage === 'bossReady') return this.Z.arena.pos;
    if (this.stage !== 'objective') return null;
    const lead = g.tracker?.leader?.()?.pos ?? this.entry;
    if (this.obj.items.length) {
      let best = null, bd = Infinity;
      for (const it of this.obj.items) { if (it.done) continue; const d = Math.hypot(it.pos.x - lead.x, it.pos.z - lead.z); if (d < bd) { bd = d; best = it.pos; } }
      return best;
    }
    const s = this.sites[this.siteIdx % Math.max(1, this.sites.length)];
    if (s && !(s.started && Math.hypot(s.pos.x - lead.x, s.pos.z - lead.z) < 14)) return s.pos;
    let best = null, bd = Infinity;
    for (const e of this.alive()) { const d = e.pos.distanceToSquared(lead); if (d < bd) { bd = d; best = e.pos; } }
    return best ?? s?.pos ?? null;
  }
  updateGuide() {
    const g = this.game; if (!g.tracker) return;
    const pos = this.guideTarget();
    const key = pos ? `${Math.round(pos.x / 3)},${Math.round(pos.z / 3)}` : '';
    if (key === this.guideKey && (pos ? g.tracker.goal : !g.tracker.goal)) return;
    this.guideKey = key;
    if (!pos) { g.tracker.clear(); return; }
    g.tracker.setGoal({ pos: pos.clone(), radius: 2, quiet: true, beam: true });
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    if (this.ended) return;
    const g = this.game;
    this.stats.time += dt; this.t += dt;
    this.updateBarrier(dt);
    if (this.stage !== 'lift') this.contain();
    if (this.stage === 'form') { if (this.formT >= FORM * 0.6) { this.stage = 'objective'; this.updateText(); this.guideKey = null; } }
    else if (this.stage === 'objective') this.updateObjective(dt);
    else if (this.stage === 'bossReady') {
      const near = g.players.some((p) => !p.dead && Math.hypot(p.pos.x - this.Z.arena.pos.x, p.pos.z - this.Z.arena.pos.z) < 12);
      if (near && !g.cutscenes?.active) this.startBoss(this.L.bossRoom);
    } else if (this.stage === 'won') { this.wonT -= dt; if (this.wonT <= 0 && !g.cutscenes?.active) this.finish(); }
    for (const it of this.obj.items) if (!it.done && it.finger) it.finger.rotation.y += dt * 2;
    this.guideT -= dt;
    if (this.guideT <= 0) { this.guideT = 0.5; this.updateGuide(); }
  }
  updateObjective(dt) {
    const g = this.game, lead = g.players.find((p) => !p.dead && !p.downed); if (!lead) return;
    if (this.obj.type === 'exorcise' && this.sites.length) {
      const s = this.sites[this.siteIdx % this.sites.length];
      const d = Math.hypot(s.pos.x - lead.pos.x, s.pos.z - lead.pos.z);
      s.live = s.live.filter((e) => !e.dead);
      s.waveT -= dt;
      if (!s.started && d < 18) { s.started = true; s.waveIdx = 1; s.waveT = 3; this.spawnPack(s.pos, 4 + Math.min(3, this.def.difficulty), 3, 9, 0x9a5aff, s.live); if (s.name) toast(`Curses swarm ${s.name}!`); this.guideKey = null; this.updateText(); }
      else if (s.started && s.live.length <= 1 && s.waveT <= 0) {
        if (s.waveIdx < s.waves) { s.waveIdx++; s.waveT = 3; this.spawnPack(s.pos, 4 + Math.min(3, this.def.difficulty), 3, 10, 0x9a5aff, s.live); }
        else if (!s.live.length) {
          this.siteIdx++;
          const nx = this.sites[this.siteIdx % this.sites.length];
          if (this.siteIdx % this.sites.length === 0) for (const q of this.sites) { q.started = false; q.waveIdx = 0; }
          if (nx.name) toast(`More curses gather at ${nx.name}`);
          this.guideKey = null; this.updateText();
        }
      }
    }
    if (this.obj.type === 'rescue') {
      for (const it of this.obj.items) {
        if (it.done || it.guarded) continue;
        if (Math.hypot(it.pos.x - lead.pos.x, it.pos.z - lead.pos.z) < 20) { it.guarded = true; this.spawnPack(it.pos, 3 + Math.min(3, this.def.difficulty), 3, 8, 0x9a5aff); toast('Curses guard the captive!'); }
      }
    }
    // a trickle of curses through the district so it is never empty
    this.trickleT -= dt;
    if (this.trickleT <= 0) {
      this.trickleT = 9 + Math.random() * 6;
      if (this.alive().length < 3) this.spawnPack(lead.pos, 2, 12, 20);
    }
  }
  // ---------------------------------------------------------------- the barrier
  updateBarrier(dt) {
    const g = this.game, B = this.B; if (!B) return;
    const alive = g.players.filter((p) => !p.dead);
    const f = new THREE.Vector3();
    if (alive.length) { for (const p of alive) f.add(p.pos); f.divideScalar(alive.length); } else f.copy(g.rig?.focus ?? this.entry);
    B.focus.value.set(f.x, f.y + 1, f.z);
    B.inside.value = Math.hypot(f.x - this.Z.x, f.z - this.Z.z) < this.Z.r ? 1 : 0;
    // night inside the curtain (a Domain cast in here takes over the look while it lasts)
    const vin = B.inside.value === 1 && this.stage !== 'lift' && this.formT > FORM * 0.3;
    this.envT = (this.envT ?? 0) - dt;
    if (!g.domainSys?.active && (vin !== this.viewIn || (vin && this.envT <= 0 && g.env?.ovTarget !== 1))) { this.viewIn = vin; g.env?.set(vin ? CURTAIN_ENV : g.biome, false); }
    if (this.envT <= 0) this.envT = 0.5;
    if (this.stage === 'lift') {
      this.liftT += dt;
      B.crack.value = Math.min(1, this.liftT / CRACK);
      const s = Math.max(0, (this.liftT - CRACK) / SHATTER);
      B.shatter.value = s;
      if (this.liftT >= CRACK && !this.burst) { this.burst = true; this.shatterFx(); }
      if (s >= 1) this.end();
      return;
    }
    this.formT += dt;
    const k = Math.min(1, this.formT / FORM);
    B.form.value = 1 - Math.pow(1 - k, 2);
  }
  shatterFx() {
    const g = this.game, R = this.Z.r;
    g.audio?.impact?.(1.4); g.shake?.(0.35);
    tmpC.set(arc(this.ch.arc)?.color ?? '#7a5cff');
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2, q = Math.random() * (1 + WALL);
      const y = q < WALL ? q : WALL + Math.sin((q - WALL) * Math.PI / 2), rr = q < WALL ? 1 : Math.cos((q - WALL) * Math.PI / 2);
      const x = this.Z.x + Math.cos(a) * rr * R, z = this.Z.z + Math.sin(a) * rr * R, hy = this.Z.y + y * R;
      const dark = Math.random() < 0.65, k = dark ? 0.02 : 2.5;
      g.particles.glow.emit(x, hy, z, Math.cos(a) * (1 + Math.random() * 3), -1 - Math.random() * 2, Math.sin(a) * (1 + Math.random() * 3), 0.9 + Math.random() * 0.6, dark ? k : tmpC.r * k, dark ? k : tmpC.g * k, dark ? k : tmpC.b * k, dark ? 0.6 : 0.22, 9, 0.5, 0.4, dark ? 1 : 3);
    }
  }
  // The curtain is a wall: nobody crosses it (players, allies, curses), either way.
  contain() {
    const g = this.game, cx = this.Z.x, cz = this.Z.z, R = this.Z.r;
    for (const e of [...g.players, ...g.allies, ...g.enemies]) {
      if (!e || e.dead || !e.pos || e.isDummy) continue;
      const dx = e.pos.x - cx, dz = e.pos.z - cz, r = Math.hypot(dx, dz);
      let side = this.sides.get(e);
      if (side === undefined) { side = e.isPlayer || e.isAlly ? true : r < R; this.sides.set(e, side); }
      const rad = Math.min(2.5, e.radius ?? 0.5);
      const lim = side ? R - rad - 0.4 : R + rad + 0.4;
      if (side ? r <= lim : r >= lim) continue;
      const nx = r > 1e-4 ? dx / r : 1, nz = r > 1e-4 ? dz / r : 0;
      e.pos.x = cx + nx * lim; e.pos.z = cz + nz * lim;
      if (e.isPlayer || e.isAlly || side) { const gy = g.world.standY(e.pos.x, e.pos.z, e.pos.y, 4); if (isFinite(gy) && gy > e.pos.y + 0.6) e.pos.y = gy; }
      const sgn = side ? 1 : -1;
      for (const v of [e.vel, e.knock]) {
        if (!v) continue;
        const vn = (v.x * nx + v.z * nz) * sgn;
        if (vn > 0) { v.x -= nx * vn * sgn; v.z -= nz * vn * sgn; }
      }
      if ((e._curtainFx ?? 0) < g.time) {
        e._curtainFx = g.time + 0.3;
        tmpC.set(arc(this.ch.arc)?.color ?? '#7a5cff');
        const wx = cx + nx * R, wz = cz + nz * R, wy = e.pos.y + 0.4 + Math.random() * 1.5;
        for (let i = 0; i < 5; i++) g.particles.glow.emit(wx, wy + (Math.random() - 0.5), wz, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.35, tmpC.r * 2.5, tmpC.g * 2.5, tmpC.b * 2.5, 0.16, 0, 3, 0.05, 1);
        if (e.isPlayer && (this.wallMsgT ?? 0) < g.time) { this.wallMsgT = g.time + 6; toast('The curtain holds — finish the mission (or Pause → Abandon mission)'); }
      }
    }
  }
  // ---------------------------------------------------------------- the boss
  startBoss(room) {
    this.stage = 'boss';
    super.startBoss(room);
    if (this.boss) { this.sides.set(this.boss, true); this.boss.roamer = false; }
    this.game.tracker?.clear(); this.guideKey = null;
    this.updateText();
  }
  onBossKilled(boss) {
    if (boss !== this.boss || this.stage !== 'boss') return;
    const g = this.game;
    g.cutscenes?.playOnce('boss_down_' + boss.id, { opts: { boss } });
    g.pickups.drop('coin', boss.pos, 40, 1);
    g.pickups.drop('heal', boss.pos, 3);
    this.stage = 'won'; this.wonT = 2.2;
    for (const e of new Set([...this.alive(), ...this.strays()])) if (!e.isBoss) { e.hp = 0; e.dead = true; e.deathT = 0.01; g.fx?.curseDeath?.(e.pos.clone().setY(e.pos.y + 1), 1, 0x9a5aff); }
    this.updateText();
  }
  // rewards, the boss chest and the results panel; the curtain lifts after
  finish() {
    if (this.complete) return;
    this.complete = true;
    const g = this.game, d = g.save.data, def = this.def;
    const lead = g.players.find((p) => !p.dead) ?? g.players[0];
    const a = this.Z.arena.pos;
    const cp = a.clone().add(new THREE.Vector3(2.5, 0, 0)); const cy = g.world.standY(cp.x, cp.z, cp.y, 4); if (isFinite(cy)) cp.y = cy; else cp.copy(a);
    const chest = { pos: cp, room: { type: 'boss' }, rarity: 'rare', opened: false, boss: true };
    this.L.chests.push(chest); this.makeChest(chest); this.openChest(chest, lead);
    try { g.quests?.onMissionComplete(def); } catch (e) { console.warn('quests', e); }
    d.completed[def.id] = Math.max(d.completed[def.id] ?? 0, def.difficulty);
    d.stats.missions++; d.stats.kills += this.stats.kills;
    d.spins = (d.spins ?? 0) + 2;
    const ups = g.save.addXp(80 * def.difficulty);
    g.save.write();
    g.audio?.levelUp();
    this.showResults();
    if (ups) g.levelUp();
  }
  showResults() {
    const g = this.game, st = this.stats, ch = this.ch, A = arc(ch.arc);
    g.paused = true;
    const go = () => { g.ui.close('results'); g.paused = false; g.last = performance.now(); this.lift(); };
    g.ui.open('results', (el) => {
      const mins = Math.floor(st.time / 60), secs = Math.floor(st.time % 60);
      el.appendChild(h('div', { class: 'panel', style: `min-width:min(460px,94vw);text-align:center;--arc:${A?.color ?? '#7a5cff'}` },
        h('div', { class: 'cnum' }, `Arc ${A?.num}: ${A?.title} · Chapter ${ch.num}`),
        h('h2', { style: 'font-size:32px;color:#ffd23a' }, 'CHAPTER CLEARED'),
        h('div', { class: 'stat-line' }, 'Curses exorcised', h('b', {}, String(st.kills))),
        h('div', { class: 'stat-line' }, 'Time', h('b', {}, `${mins}:${String(secs).padStart(2, '0')}`)),
        h('div', { class: 'stat-line' }, 'Coins collected', h('b', {}, String(st.coins))),
        h('div', { class: 'stat-line' }, 'Technique rerolls earned', h('b', {}, '🎲 +2')),
        ch.outro ? h('p', { class: 'results-outro' }, ch.outro) : null,
        h('div', { class: 'loot-list', id: 'results-loot' }),
        h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' },
          h('button', { class: 'btn primary', 'data-autofocus': true, onclick: go }, 'Lift the curtain'))));
      const lootEl = el.querySelector('#results-loot');
      for (const it of st.loot) { const b = itemInfo(it); lootEl.appendChild(h('div', { class: `item ${b.rarity}`, title: b.name }, b.icon, h('span', { class: 'pw' }, String(it.power)))); }
      if (!st.loot.length) lootEl.appendChild(h('div', { class: 'hint' }, 'No loot this time.'));
    }, { dim: true, onBack: go });
  }
  lift() {
    if (this.stage === 'lift' || this.ended) return;
    this.stage = 'lift'; this.liftT = 0; this.burst = false;
    this.game.hud.setBoss(null);
    this.updateText();
    this.game.tracker?.clear();
    toast(this.abandoned ? 'The curtain lifts — mission abandoned' : 'The curtain lifts', 'big');
    this.game.audio?.setMusic(this.game.level?.biome?.music ?? 'hub');
  }
  abandon() {
    if (this.ended || this.stage === 'lift') return;
    const g = this.game;
    this.abandoned = true;
    g._wmCooldown = { id: this.ch.id, x: this.Z.x, z: this.Z.z, r: this.Z.r };
    if (g.cutscenes?.active) g.cutscenes.abort();
    for (const e of new Set([...this.alive(), ...this.strays()])) { e.dead = true; e.deathT = 0.01; }
    this.vanishBoss();
    this.lift();
  }
  // the boss leaves without falling (abandon / quit): no loot, no cutscene
  vanishBoss() {
    const g = this.game;
    for (const b of [this.boss, ...(this.boss?.linkedTo ?? [])]) {
      if (!b || b.dead) continue;
      b.dead = true; b.deathT = 1.79; b.co = null; b.tasks.length = 0;
      if (g.domain && g.domain.caster === b) g.domainSys.collapse();
      for (const p of [...b.props]) b.removeProp(p, true);
      g.lights.remove(b.lightH);
      g.scene.remove(b.object);
    }
    for (const m of g.markers.items) if (m.active && !m.keep) g.markers.cancel(m);
  }
  // ---------------------------------------------------------------- the end
  cleanup(live) {
    if (this.ended) return;
    this.ended = true;
    const g = this.game;
    if (this.barrier) { g.scene.remove(this.barrier); this.barrier.geometry.dispose(); this.barrier = null; }
    if (this.viewIn && !g.domainSys?.active) { this.viewIn = false; g.env?.set(g.biome, !live); }
    super.dispose();
    for (const it of this.obj.items) if (it.light) g.lights.remove(it.light);
    for (const [it, prev] of this.shut ?? []) it.enabled = prev;
    g.spawns?.release?.(this.zone);
    if (g.worldMission === this) g.worldMission = null;
    if (g.mission === this) g.mission = null;
    document.querySelector('.wm-banner')?.remove();
    if (!live) return;
    g.interactables = g.interactables.filter((it) => !/^(obj\d|chest\d)/.test(String(it.id)));
    if (g.level && this.prevRespawn) g.level.respawn = this.prevRespawn;
    for (const e of this.alive()) { e.dead = true; e.deathT = 0.01; }
    this.vanishBoss();
    g.hud.setBoss(null);
    g.objectiveDone = false;
    try { g.quests?.refreshRegion(); } catch (e) { console.warn('quests', e); }
    g.save.write();
  }
  end() { this.cleanup(true); }
  dispose() { this.cleanup(false); }
}

// ------------------------------------------------------------------ starting one
// From the chapter map, a quest marker or the quest log: go there (travelling to
// the region, or a short fade inside it) and drop the curtain.
export async function startWorldMission(game, chOrId, threat = 0) {
  const g = game, ch = typeof chOrId === 'string' ? chapter(chOrId) : chOrId;
  if (!ch) return null;
  if (g.worldMission) { toast('Finish (or abandon) the mission you are in first'); return null; }
  if (g.cutscenes?.active) g.cutscenes.abort();
  g.ui.closeAll(); g.paused = false; g.last = performance.now();
  const region = ch.region ?? 'jujutsu_high';
  g._wmStarting = true;   // no auto-start of another chapter while we get there
  try { return await goAndBegin(g, ch, threat, region); } finally { g._wmStarting = false; }
}
async function goAndBegin(g, ch, threat, region) {
  if (g.mode !== 'world' || g.level?.regionId !== region) {
    let at = null;
    try { const L = buildRegion(region); const z = missionZone(L, ch); at = edgeSpot(z, L.spawn); } catch (e) { console.warn('world mission', e); }
    await g.travelTo(region, at ? { at } : {});
    if (g.level?.regionId !== region) return null;
    return begin(g, ch, threat);
  }
  const z = missionZone(g.level, ch);
  const lead = g.players.find((p) => !p.dead) ?? g.players[0];
  if (lead && Math.hypot(lead.pos.x - z.x, lead.pos.z - z.z) > z.r - 3) {
    const at = edgeSpot(z, lead.pos);
    await g.fade(true, `帳 ${ch.place}`);
    g.placePlayers(at, { keepHp: true });
    g.world.stream(g.players.map((p) => p.pos), Infinity);
    g.fade(false);
  }
  return begin(g, ch, threat);
}
function begin(g, ch, threat) {
  if (g.worldMission || g.mode !== 'world') return null;
  const z = missionZone(g.level, ch);
  const lead = g.players.find((p) => !p.dead) ?? g.players[0];
  const entry = edgeSpot(z, lead?.pos ?? g.level.spawn);
  const wm = new WorldMission(g, ch, threat, z, entry);
  wm.setup();
  return wm;
}
// Quests call this while a chapter's mission step is active in the loaded
// region: the curtain falls when the party walks into the district.
export function maybeStartWorldMission(game, chId) {
  const g = game;
  if (g.worldMission || g._wmStarting || g.mode !== 'world' || g.state !== 'playing' || g.paused || g.traveling || g.cutscenes?.active || g.dialogue?.active || g.ui?.stack?.length) return false;
  const ch = chapter(chId); if (!ch || (ch.region ?? 'jujutsu_high') !== g.level?.regionId) return false;
  const lead = g.players.find((p) => !p.dead && !p.downed); if (!lead) return false;
  const c = zoneCenter(g.level, ch), r = W_OF(ch).r ?? 34;
  const d = Math.hypot(lead.pos.x - c.x, lead.pos.z - c.z);
  const cd = g._wmCooldown;
  if (cd) { if (cd.id === chId && Math.hypot(lead.pos.x - cd.x, lead.pos.z - cd.z) < cd.r + 8) return false; g._wmCooldown = null; }
  if (d > r - 4) return false;
  begin(g, ch, 0);
  return true;
}
void REGIONS;
