// Quests: main quests (the story chapters) and side quests from NPCs.
//
// ------------------------------------------------------------------ define
//   import { registerQuest } from '../quests/index.js';
//   registerQuest({
//     id: 'sq_forest_talismans', kind: 'side',          // 'main' | 'side'
//     title: 'Scattered Talismans', region: 'cursed_forest',   // home region (log + map)
//     summary: 'Mika lost her sealing talismans in the ruins.',
//     requires: { quests: ['m1'], level: 2 },           // optional: before it is offered
//     giver: { region: 'cursed_forest', npc: 'forest_window' },   // who offers it (a region person,
//            // a Jujutsu High resident: 'gojo'…, or a quest NPC: add npcDef { name, look, color, anchor })
//     offer: ['line', { who: 'forest_window', text: '…' }],      // dialogue when offered (then accepted)
//     steps: [ …step objects, below… ],
//     done: ['lines when handed in'],                    // played by the last talk step (optional)
//     rewards: { coins: 80, xp: 120, spins: 1, items: 1, rarity: 'rare' },
//   });
//
// Step types (every step: text — the tracker/log line; region — where it happens):
//   goto      { anchor | pos: [x, z], radius = 4 }                 walk there
//   talk      { npc, lines, npcDef? }                               talk to an NPC (spawned from npcDef if missing)
//   exorcise  { count, kinds?: [...], anchor?, radius = 30, spawn?: { kinds, level, max } }
//             exorcise N curses (of these kinds / near the anchor); `spawn` keeps curses coming there
//   defeat    { anchor, curse: { kind, name, level = 2, elite, hp = 3 } }   a named curse appears near the anchor
//   collect   { item: { name, icon, color }, spots: [anchor | [x, z], …], count = spots.length }
//   rescue    { anchor, npc: { name, look }, escort?: { anchor, radius = 6 } }   free a captive (hold E), then escort
//   lair      { chapter } (a story chapter) or { mission: { biome, objective, boss, difficulty }, anchor, label }
//             enter a curtain/cave: starts the generated dungeon; done when it is cleared
//   mission   { chapter }   a story chapter in the open world: walking into its district drops
//             the curtain (world/worldMission.js); done when the chapter is cleared there
//   enter     {}                                                     reach the region
//
// ------------------------------------------------------------------ runtime (game.quests)
//   state(id)          'locked' | 'available' | 'active' | 'complete'
//   current(id)        the active step object (with .index)
//   accept(id) / advance(id) / complete(id)
//   track(id) / tracked()                    the quest the tracker follows
//   onRegionLoaded(L)  spawns quest NPCs, captives, collectibles for this region
//   onTalk(npcId)      -> true when a quest took the conversation
//   onKill(enemy) / onMissionComplete(def) / update(dt)
//   lairs(regionId)    lair entrances to show in a region (questMarkers.js)
//   mapMarks(regionId) givers / targets for the world map and minimap
// Saved in save.data.quests = { st: { id: { s: 'active'|'complete', i: step, n: count, got: [] } }, tracked }.
// Main-quest completion is read from save.data.completed (old saves keep their chapters).
import * as THREE from 'three/webgpu';
import { rollChest, itemInfo, RARITY } from '../loot.js';
import { CHAPTERS, chapter, chapterUnlocked, chapterDone, missionDef, arc } from '../story/chapters.js';
import { REGIONS, routeTo, gateSide, floorAt } from '../world/regions/index.js';
import { toast, h } from '../ui/ui.js';
import { maybeStartWorldMission, zoneCenter } from '../world/worldMission.js';

export const QUESTS = {};
export const QUEST_ORDER = [];
export function registerQuest(def) {
  if (!QUESTS[def.id]) QUEST_ORDER.push(def.id);
  def.steps = (def.steps ?? []).map((s, i) => ({ ...s, index: i, region: s.region ?? def.region }));
  QUESTS[def.id] = { kind: 'side', ...def };
  return QUESTS[def.id];
}
export const quest = (id) => QUESTS[id] ?? null;
const hash = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
const tmp = new THREE.Vector3();

// Where an anchor is in a loaded region: L.anchors[name], else a spot round a
// station / the spawn (stable per name), on the floor.
export function anchorPos(L, name, salt = name) {
  if (!L) return null;
  if (Array.isArray(name)) return floorAt(L, name[0] + 0.5, name[1] + 0.5);
  if (name && L.anchors?.[name]) return L.anchors[name].clone();
  if (name && L.spots?.[name]) return L.spots[name].clone();
  const base = (L.anchors?.plaza ?? L.stations?.[0]?.pos ?? L.spawn).clone();
  const a = (hash(String(salt)) % 360) * Math.PI / 180, d = 7 + (hash(String(salt) + 'd') % 9);
  return floorAt(L, base.x + Math.cos(a) * d, base.z + Math.sin(a) * d, base.y);
}

export class QuestSystem {
  constructor(game) {
    this.game = game;
    this.spawned = [];          // per-region runtime objects
    this.t = 0;
  }
  get d() { const s = this.game.save.data; s.quests ??= { st: {}, tracked: null }; s.quests.st ??= {}; return s.quests; }
  rec(id) { return this.d.st[id] ?? null; }
  // ---------------------------------------------------------------- state
  state(id) {
    const q = QUESTS[id]; if (!q) return 'locked';
    const sd = this.game.save.data;
    if (q.kind === 'main') {
      const ch = chapter(q.chapter);
      if (chapterDone(sd, ch)) return 'complete';
      return chapterUnlocked(sd, ch) ? 'active' : 'locked';
    }
    const r = this.rec(id);
    if (r?.s === 'complete') return 'complete';
    if (r?.s === 'active') return 'active';
    return this.requirementsMet(q) ? 'available' : 'locked';
  }
  requirementsMet(q) {
    const R = q.requires ?? {}, sd = this.game.save.data;
    if (R.level && (sd.level ?? 1) < R.level) return false;
    for (const id of R.quests ?? []) if (this.state(id) !== 'complete') return false;
    return true;
  }
  stepIndex(id) { return this.rec(id)?.i ?? 0; }
  current(id) {
    const q = QUESTS[id]; if (!q || this.state(id) !== 'active') return null;
    return q.steps[Math.min(q.steps.length - 1, this.stepIndex(id))] ?? null;
  }
  ensure(id) { return (this.d.st[id] ??= { s: 'active', i: 0, n: 0, got: [] }); }
  list(kind = null) { return QUEST_ORDER.map((id) => QUESTS[id]).filter((q) => !kind || q.kind === kind); }
  active() { return QUEST_ORDER.filter((id) => this.state(id) === 'active'); }
  // the tracked quest: the player's pick if still active, else the next main quest, else any active one
  tracked() {
    const t = this.d.tracked;
    if (t && this.state(t) === 'active') return t;
    const main = QUEST_ORDER.find((id) => QUESTS[id].kind === 'main' && this.state(id) === 'active');
    return main ?? this.active()[0] ?? null;
  }
  track(id) { this.d.tracked = id; this.game.save.write(); this.guide(true); }
  accept(id) {
    const q = QUESTS[id]; if (!q || this.state(id) !== 'available') return;
    this.d.st[id] = { s: 'active', i: 0, n: 0, got: [] };
    this.d.tracked = id;
    toast(`New quest: ${q.title}`, 'big');
    this.game.audio?.ui?.('buy');
    this.game.save.write();
    this.refreshRegion();
  }
  advance(id) {
    const q = QUESTS[id]; if (!q) return;
    const r = this.ensure(id);
    r.i = (r.i ?? 0) + 1; r.n = 0; r.got = [];
    if (r.i >= q.steps.length) { this.complete(id); return; }
    const s = q.steps[r.i];
    toast(`${q.title}: ${s.text}`);
    this.game.audio?.ui?.('move');
    this.game.save.write();
    this.refreshRegion();
  }
  complete(id) {
    const q = QUESTS[id]; if (!q) return;
    const g = this.game, sd = g.save.data;
    const r = this.ensure(id); r.s = 'complete'; r.i = q.steps.length;
    if (q.kind !== 'main') {
      const rw = q.rewards ?? {};
      const got = [];
      if (rw.coins) { sd.coins += rw.coins; got.push(`◆${rw.coins}`); }
      if (rw.spins) { sd.spins = (sd.spins ?? 0) + rw.spins; got.push(`🎲 +${rw.spins}`); }
      if (rw.items) {
        const power = Math.max(1, Math.round((sd.level ?? 1) / 3) + (rw.power ?? 1));
        for (const it of rollChest(power, rw.rarity ?? 'rare').slice(0, rw.items)) { sd.inventory.push(it); const b = itemInfo(it); got.push(`${b.icon} ${b.name}`); setTimeout(() => g.audio?.loot?.(b.rarity), 400); void RARITY; }
      }
      let ups = 0; if (rw.xp) { ups = g.save.addXp(rw.xp); got.push(`${rw.xp} XP`); }
      toast(`✔ Quest complete: ${q.title}${got.length ? ' · ' + got.join(' · ') : ''}`, 'big');
      g.audio?.levelUp?.();
      if (ups) g.levelUp?.();
    } else toast(`✔ Main quest complete: ${q.title}`, 'big');
    if (this.d.tracked === id) this.d.tracked = null;
    q.onComplete?.(g);
    g.save.write();
    this.refreshRegion();
  }
  // ---------------------------------------------------------------- region runtime
  get L() { return this.game.mode === 'world' ? this.game.level : null; }
  get regionId() { return this.L?.regionId ?? null; }
  // Called by main.loadRegion after the region's NPCs exist.
  onRegionLoaded(L) {
    this.clearSpawned();
    for (const id of QUEST_ORDER) {
      const q = QUESTS[id], st = this.state(id);
      if (st === 'active') { const s = q.steps.find((x) => x.type === 'enter' && x.index === this.stepIndex(id)); if (s && s.region === L.regionId) { this.advance(id); continue; } }
    }
    this.populate(L);
    this.guide(true);
  }
  clearSpawned() {
    const g = this.game;
    for (const o of this.spawned) { if (o.object) g.scene.remove(o.object); if (o.enemy && !o.enemy.dead) { o.enemy.dead = true; o.enemy.deathT = 0.01; } if (o.light) g.lights.remove(o.light); }
    this.spawned = [];
  }
  // rebuild this region's quest objects (after a state change)
  refreshRegion() {
    const L = this.L; if (!L) { this.guide(true); return; }
    this.clearSpawned();
    this.game.interactables = this.game.interactables.filter((it) => !String(it.id).startsWith('qs-'));
    this.populate(L);
    for (const p of this.npcPosts(L)) { try { this.game.regionNpcs?.add(p); } catch (e) { console.warn('quest npc', e); } }
    this.game.questMarkers?.refresh?.();
    this.game.regionNpcs?.refreshMarks?.();
    this.guide(true);
  }
  // NPCs a quest needs in this region (givers of offered quests, talk targets of active ones)
  npcPosts(L) {
    const out = [];
    const want = (npc, def, salt) => {
      if (!npc || !def) return;
      if (this.game.regionNpcs?.has?.(npc) || this.game.hubNpcs?.byId?.[npc]) return;
      if (out.some((o) => o.id === npc)) return;
      out.push({ id: npc, name: def.name ?? npc, look: def.look ?? 'npc_civ_0', color: def.color, pose: def.pose ?? 'idle', pos: anchorPos(L, def.anchor, salt), lines: def.lines ?? [['…']] });
    };
    for (const id of QUEST_ORDER) {
      const q = QUESTS[id], st = this.state(id);
      if (st === 'complete' || st === 'locked') continue;
      if (q.giver?.region === L.regionId && (st === 'available' || q.kind === 'main')) want(q.giver.npc, q.giver.npcDef, id + ':giver');
      if (st === 'active') for (const s of q.steps) if (s.type === 'talk' && s.region === L.regionId && s.index >= this.stepIndex(id)) want(s.npc, s.npcDef ?? (q.giver?.npc === s.npc ? q.giver.npcDef : null), id + ':' + s.index);
    }
    return out;
  }
  populate(L) {
    const g = this.game;
    for (const id of this.active()) {
      const q = QUESTS[id], s = this.current(id); if (!s || s.region !== L.regionId) continue;
      const r = this.ensure(id);
      if (s.type === 'collect') {
        (s.spots ?? []).forEach((spot, k) => {
          if ((r.got ?? []).includes(k)) return;
          const pos = anchorPos(L, spot, `${id}:c${k}`); if (!pos) return;
          const obj = this.collectible(s.item ?? {}); obj.position.copy(pos); g.scene.add(obj);
          const rec = { kind: 'collect', quest: id, k, object: obj, pos, light: g.lights.attach(obj, new THREE.Color(s.item?.color ?? '#ffd84a').getHex(), 2.5, 6, { offsetY: 1 }) };
          this.spawned.push(rec);
          g.interactables.push({ id: `qs-${id}-c${k}`, pos, radius: 2.2, label: `Pick up ${s.item?.name ?? 'item'}`, enabled: () => !rec.done, action: () => this.pick(rec, s) });
        });
      }
      if (s.type === 'rescue' && !r.freed) {
        const pos = anchorPos(L, s.anchor, `${id}:r`); if (!pos) continue;
        const cage = this.cage(s.npc ?? {}); cage.group.position.copy(pos); g.scene.add(cage.group);
        const rec = { kind: 'cage', quest: id, object: cage.group, rig: cage.rig, pos };
        this.spawned.push(rec);
        g.interactables.push({ id: `qs-${id}-cage`, pos, radius: 2.4, hold: 1.2, label: `Free ${s.npc?.name ?? 'the captive'}`, enabled: () => !rec.done, action: () => this.free(rec, s) });
      }
      if (s.type === 'rescue' && r.freed && s.escort) this.spawnEscort(id, s, L, null);
    }
  }
  // ---------------------------------------------------------------- objects
  collectible(item) {
    const grp = new THREE.Group();
    const col = new THREE.Color(item.color ?? '#ffd84a');
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.06), new THREE.MeshStandardNodeMaterial({ color: col, emissive: col, emissiveIntensity: 1.4 }));
    card.position.y = 1.0; grp.add(card);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 6, 24).rotateX(Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(2) }));
    ring.position.y = 0.06; grp.add(ring);
    grp.userData.spin = card;
    return grp;
  }
  cage(npc) {
    const g = this.game;
    const grp = new THREE.Group();
    let rig = null;
    try { rig = g.regionNpcs?.makeRig?.(npc.look ?? 'npc_civ_2'); } catch (e) { rig = null; }
    if (rig) { grp.add(rig.root); rig.armR.rotation.x = -2.6; rig.armL.rotation.x = -2.4; }
    const bars = new THREE.MeshStandardNodeMaterial({ color: 0x8a4aff, emissive: 0x6a2aff, emissiveIntensity: 1.6, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), bars); b.position.set(Math.cos(a) * 0.9, 1.3, Math.sin(a) * 0.9); grp.add(b); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.15, 8), bars); top.position.y = 2.65; grp.add(top);
    return { group: grp, rig };
  }
  pick(rec, s) {
    if (rec.done) return; rec.done = true;
    const g = this.game, r = this.ensure(rec.quest);
    r.got = [...(r.got ?? []), rec.k]; r.n = (r.n ?? 0) + 1;
    g.scene.remove(rec.object); g.lights.remove(rec.light);
    g.particles?.burst(rec.pos.clone().setY(rec.pos.y + 1), { count: 18, color: new THREE.Color(s.item?.color ?? '#ffd84a'), speed: 3, up: 3, life: 0.8, size: 0.14, shape: 1 });
    g.audio?.loot?.('rare');
    const need = s.count ?? (s.spots ?? []).length;
    toast(`${s.item?.icon ?? '✦'} ${s.item?.name ?? 'Item'} ${r.n} / ${need}`);
    if (r.n >= need) this.advance(rec.quest); else { g.save.write(); this.guide(true); }
  }
  free(rec, s) {
    if (rec.done) return; rec.done = true;
    const g = this.game, r = this.ensure(rec.quest);
    r.freed = true;
    g.fx?.heal?.(rec.pos, 0xb08aff); g.audio?.energy?.('heal');
    toast(`${s.npc?.name ?? 'Captive'} freed!`);
    for (const c of [...rec.object.children]) if (c !== rec.rig?.root) rec.object.remove(c);
    if (s.escort) { g.scene.remove(rec.object); this.spawnEscort(rec.quest, s, this.L, rec.pos); g.save.write(); this.guide(true); }
    else { let t = 0; g.addUpdater((dt) => { t += dt; rec.object.position.y += dt * 2; rec.object.scale.setScalar(Math.max(0.01, 1 - t)); return t < 1; }); this.advance(rec.quest); }
  }
  spawnEscort(id, s, L, at) {
    const g = this.game;
    const rig = g.regionNpcs?.makeRig?.(s.npc?.look ?? 'npc_civ_2'); if (!rig) { this.advance(id); return; }
    const lead = g.players.find((p) => !p.dead) ?? g.players[0];
    const pos = (at ?? lead?.pos ?? L.spawn).clone();
    rig.root.position.copy(pos); g.scene.add(rig.root);
    const rec = { kind: 'escort', quest: id, object: rig.root, rig, pos, vel: new THREE.Vector3() };
    this.spawned.push(rec);
    const goal = anchorPos(L, s.escort.anchor, `${id}:e`);
    rec.goal = goal;
    toast(`${s.npc?.name ?? 'They'} will follow you. Lead them to safety.`);
  }
  spawnNamed(id, s, L) {
    const g = this.game, c = s.curse ?? {};
    const at = anchorPos(L, s.anchor, `${id}:d`); if (!at) return;
    const e = g.spawnEnemy(c.kind ?? 'tank', at, { level: c.level ?? 2, elite: c.elite ?? 'armored' });
    if (!e) return;
    e.maxHp *= c.hp ?? 3; e.hp = e.maxHp; e.questTag = id; e.questName = c.name; e.roamer = false;
    g.fx?.summonCircle?.(at, 0xff3a5a);
    toast(`⚠ ${c.name ?? 'A named curse'} appears!`, 'big');
    g.audio?.energy?.('summon');
    this.spawned.push({ kind: 'named', quest: id, enemy: e });
  }
  // ---------------------------------------------------------------- events
  onTalk(npcId) {
    const g = this.game;
    if (g.net?.isGuest) return false;   // visiting: the quests are the host's
    // a talk step for this NPC (hand-ins first)
    for (const id of this.active()) {
      const q = QUESTS[id], s = this.current(id);
      if (!s || s.type !== 'talk' || s.npc !== npcId || s.region !== this.regionId) continue;
      const last = s.index === q.steps.length - 1;
      const lines = s.lines ?? (last ? q.done : null) ?? ['…'];
      g.dialogue?.say(npcId, lines, { onEnd: () => this.advance(id) });
      return true;
    }
    // an offer
    for (const id of QUEST_ORDER) {
      const q = QUESTS[id];
      if (q.kind !== 'side' || q.giver?.npc !== npcId || this.state(id) !== 'available') continue;
      g.dialogue?.say(npcId, q.offer ?? [q.summary ?? q.title], { onEnd: () => this.accept(id) });
      return true;
    }
    // reminders for active quests from this giver
    for (const id of this.active()) {
      const q = QUESTS[id];
      if (q.kind !== 'side' || q.giver?.npc !== npcId) continue;
      const s = this.current(id);
      g.dialogue?.say(npcId, [q.remind ?? `Still on it? ${s?.text ?? ''}`]);
      return true;
    }
    return false;
  }
  // does this NPC have something for the player? '!' new quest, '?' a hand-in / talk step
  npcMark(npcId) {
    const rid = this.regionId;
    for (const id of this.active()) { const s = this.current(id); if (s?.type === 'talk' && s.npc === npcId && s.region === rid) return '?'; }
    for (const id of QUEST_ORDER) { const q = QUESTS[id]; if (q.kind === 'side' && q.giver?.npc === npcId && this.state(id) === 'available') return '!'; }
    return null;
  }
  onKill(e) {
    if (this.game.mode !== 'world') return;
    for (const id of this.active()) {
      const s = this.current(id); if (!s || s.region !== this.regionId) continue;
      if (s.type === 'defeat' && e.questTag === id) { this.advance(id); continue; }
      if (s.type !== 'exorcise' || e.isDummy) continue;
      if (s.kinds && !s.kinds.includes(e.kind)) continue;
      if (s.anchor) { const a = anchorPos(this.L, s.anchor, `${id}:x`); if (a && Math.hypot(a.x - e.pos.x, a.z - e.pos.z) > (s.radius ?? 30)) continue; }
      const r = this.ensure(id); r.n = (r.n ?? 0) + 1;
      if (r.n >= (s.count ?? 1)) this.advance(id);
      else { toast(`${QUESTS[id].title}: ${r.n} / ${s.count}`); this.game.hud?.setObjective?.(QUESTS[id].title, this.stepText(id)); }
    }
  }
  onMissionComplete(def) {
    for (const id of this.active()) {
      const s = this.current(id); if (s?.type !== 'lair' && s?.type !== 'mission') continue;
      if ((s.chapter && (def.chapter === s.chapter || def.id === s.chapter)) || (def.quest === id)) this.advance(id);
    }
  }
  update(dt) {
    const g = this.game, L = this.L; if (!L || g.state !== 'playing' || g.paused) return;
    this.t += dt;
    const lead = g.players.find((p) => !p.dead && !p.downed); if (!lead) return;
    for (const o of this.spawned) if (o.kind === 'collect' && o.object.userData.spin) o.object.userData.spin.rotation.y += dt * 2;
    for (const id of this.active()) {
      const q = QUESTS[id], s = this.current(id); if (!s || s.region !== L.regionId) continue;
      // a talk step for a resident who is absent because a player has their technique: their message reaches you anyway
      if (s.type === 'talk' && g.hubNpcs?.hiddenByPlayer?.(s.npc)) { toast(`${q.title}: a message from ${s.npc[0].toUpperCase() + s.npc.slice(1)} reaches you`); this.advance(id); return; }
      if (s.type === 'mission' && !g.worldMission && maybeStartWorldMission(g, s.chapter)) return;
      if (s.type === 'goto') {
        const a = anchorPos(L, s.anchor ?? s.pos, `${id}:g${s.index}`);
        if (a && Math.hypot(a.x - lead.pos.x, a.z - lead.pos.z) < (s.radius ?? 4)) { this.advance(id); return; }
      }
      if (s.type === 'defeat' && !this.spawned.some((o) => o.kind === 'named' && o.quest === id && !o.enemy.dead)) {
        const a = anchorPos(L, s.anchor, `${id}:d`);
        if (a && Math.hypot(a.x - lead.pos.x, a.z - lead.pos.z) < 26 && (this.namedCd ?? 0) <= 0) { this.spawnNamed(id, s, L); this.namedCd = 6; }
      }
      if (s.type === 'exorcise' && s.spawn && s.anchor) {
        const a = anchorPos(L, s.anchor, `${id}:x`);
        const near = a && Math.hypot(a.x - lead.pos.x, a.z - lead.pos.z) < (s.radius ?? 30);
        this.spawnT = (this.spawnT ?? 2) - dt;
        const live = this.spawned.filter((o) => o.kind === 'wave' && o.quest === id && !o.enemy.dead).length;
        if (near && this.spawnT <= 0 && live < (s.spawn.max ?? 4)) {
          this.spawnT = 2.5;
          const kinds = s.spawn.kinds ?? s.kinds ?? ['swarmer'];
          const ang = Math.random() * Math.PI * 2, d = 8 + Math.random() * 6;
          const p = floorAt(L, lead.pos.x + Math.cos(ang) * d, lead.pos.z + Math.sin(ang) * d, lead.pos.y);
          if (isFinite(p.y) && !g.world.solidAt(p.x, p.y + 0.5, p.z)) {
            const e = g.spawnEnemy(kinds[Math.floor(Math.random() * kinds.length)], p, { level: s.spawn.level ?? 1 });
            if (e) { g.fx?.summonCircle?.(p, 0xb05aff); this.spawned.push({ kind: 'wave', quest: id, enemy: e }); }
          }
        }
      }
    }
    // escorts follow the leader; arrive at the goal
    for (const o of this.spawned) {
      if (o.kind !== 'escort' || o.done) continue;
      const to = tmp.copy(lead.pos).sub(o.object.position); to.y = 0;
      const d = to.length();
      if (d > 2.2) { to.normalize().multiplyScalar(Math.min(d - 2, 6.5 * dt * (d > 10 ? 1.6 : 1))); o.object.position.add(to); o.object.rotation.y = Math.atan2(to.x, to.z); }
      if (d > 30) o.object.position.copy(lead.pos).add(tmp.set(1.5, 0, 1.5));
      const gy = g.world.standY(o.object.position.x, o.object.position.z, o.object.position.y, 3); if (isFinite(gy)) o.object.position.y += (gy - o.object.position.y) * Math.min(1, dt * 10);
      o.rig.animate?.({ dt, speed: d > 2.2 ? 5 : 0, vel: d > 2.2 ? to.clone().divideScalar(Math.max(1e-4, dt)) : new THREE.Vector3() });
      if (o.goal && o.object.position.distanceTo(o.goal) < ((QUESTS[o.quest].steps.find((x) => x.type === 'rescue')?.escort?.radius) ?? 6)) {
        o.done = true; g.fx?.heal?.(o.object.position, 0xffd23a); toast('Safe and sound!'); this.advance(o.quest); return;
      }
    }
    this.namedCd = (this.namedCd ?? 0) - dt;
    this.guideT = (this.guideT ?? 0) - dt;
    if (this.guideT <= 0) { this.guideT = 1; this.guide(false); }
  }
  // ---------------------------------------------------------------- where to go
  stepText(id) {
    const q = QUESTS[id], s = this.current(id); if (!s) return '';
    const r = this.rec(id);
    if (s.type === 'exorcise') return `${s.text} (${r?.n ?? 0} / ${s.count})`;
    if (s.type === 'collect') return `${s.text} (${r?.n ?? 0} / ${s.count ?? s.spots.length})`;
    if (s.type === 'rescue' && r?.freed && s.escort) return s.escortText ?? 'Lead them to safety';
    void q;
    return s.text ?? '';
  }
  // the position the current step wants, in this region (or null)
  targetIn(id, L) {
    const s = this.current(id); if (!s || !L || s.region !== L.regionId) return null;
    const r = this.rec(id);
    switch (s.type) {
      case 'goto': return anchorPos(L, s.anchor ?? s.pos, `${id}:g${s.index}`);
      case 'talk': return this.game.regionNpcs?.posOf?.(s.npc) ?? this.game.hubNpcs?.byId?.[s.npc]?.pos?.clone() ?? anchorPos(L, s.npcDef?.anchor, `${id}:${s.index}`);
      case 'exorcise': return s.anchor ? anchorPos(L, s.anchor, `${id}:x`) : null;
      case 'defeat': { const e = this.spawned.find((o) => o.kind === 'named' && o.quest === id && !o.enemy.dead)?.enemy; return e ? e.pos.clone() : anchorPos(L, s.anchor, `${id}:d`); }
      case 'collect': { const left = this.spawned.filter((o) => o.kind === 'collect' && o.quest === id && !o.done); const lead = this.game.players[0]?.pos; if (!left.length) return null; left.sort((a, b) => (lead ? a.pos.distanceTo(lead) - b.pos.distanceTo(lead) : 0)); return left[0].pos.clone(); }
      case 'rescue': return r?.freed && s.escort ? anchorPos(L, s.escort.anchor, `${id}:e`) : anchorPos(L, s.anchor, `${id}:r`);
      case 'mission': { const ch = chapter(s.chapter); return ch ? zoneCenter(L, ch) : null; }
      case 'lair': return s.chapter ? anchorPos(L, 'lair_' + s.chapter, `lair:${s.chapter}`) : anchorPos(L, s.anchor ?? ('lair_' + id), `lair:${id}`);
      default: return null;
    }
  }
  // Point the tracker at the tracked quest: here, or the border road on the way to its region.
  guide(force = false) {
    const g = this.game; if (!g.tracker) return;
    if (g.mode !== 'world' || g.worldMission) return;   // a running world mission drives the tracker itself
    const L = this.L; if (!L) return;
    const id = this.tracked();
    if (!id) { if (force) { g.tracker.clear(); g.hud?.setObjective?.(REGIONS[L.regionId]?.name ?? 'Explore', 'No quest tracked · J: quest log · Tab: map'); } return; }
    const q = QUESTS[id], s = this.current(id); if (!s) return;
    let pos = this.targetIn(id, L), where = this.stepText(id);
    if (!pos && s.region && s.region !== L.regionId) {
      const route = routeTo(L.regionId, s.region);
      const next = route?.[1];
      const gate = L.gates.find((x) => x.to === next);
      const name = REGIONS[s.region]?.name ?? s.region;
      if (gate) { pos = gate.pos.clone(); where = next === s.region ? `${s.text} · walk on into ${name}: follow the road over the border (or fast travel)` : `${s.text} · ${name} is beyond ${REGIONS[next]?.name ?? next}: follow the road on through it (or fast travel)`; }
      void gateSide;
    }
    const key = id + ':' + s.index + ':' + (pos ? `${Math.round(pos.x / 2)},${Math.round(pos.z / 2)}` : '-') + ':' + where;
    if (!force && key === this.guideKey && g.tracker.goal) return;
    this.guideKey = key;
    const title = q.kind === 'main' ? `${q.title}` : `◆ ${q.title}`;
    if (!pos) { g.tracker.clear(); g.hud?.setObjective?.(title, where); return; }
    g.tracker.setGoal({ pos, title, where, radius: 2, beam: s.type !== 'lair' && s.type !== 'mission', pinY: 4, feet: s.type !== 'defeat' });
  }
  // ---------------------------------------------------------------- lairs and map marks
  lairs(regionId) {
    const out = [];
    for (const id of QUEST_ORDER) {
      const q = QUESTS[id];
      for (const s of q.steps) {
        if ((s.type !== 'lair' && s.type !== 'mission') || s.region !== regionId) continue;
        const st = this.state(id);
        if (q.kind === 'main') { if (st === 'locked') continue; }
        else if (st !== 'active' || this.stepIndex(id) !== s.index) continue;
        const ready = st === 'active' && this.stepIndex(id) >= s.index;
        out.push({ quest: id, step: s, chapter: s.chapter ?? null, anchor: s.chapter ? 'lair_' + s.chapter : (s.anchor ?? 'lair_' + id), salt: s.chapter ? `lair:${s.chapter}` : `lair:${id}`, state: st === 'complete' ? 'done' : ready ? 'next' : 'open', kind: s.kind ?? 'curtain', label: s.label ?? null });
      }
    }
    return out;
  }
  // Start a side-quest lair's dungeon.
  startLair(lair) {
    const g = this.game, q = QUESTS[lair.quest], s = lair.step;
    const m = s.mission ?? {};
    const def = { id: lair.quest, name: s.label ?? q.title, biome: m.biome ?? 'cursed_forest', objective: m.objective ?? 'exorcise', boss: m.boss ?? 'sugisawa_curse', difficulty: m.difficulty ?? 2, seed: (Math.random() * 1e9) | 0, quest: lair.quest, objText: m.objText, outro: m.outro, place: s.label ?? q.title };
    g.enterLair?.(def, lair);
  }
  openLairPanel(lair) {
    const g = this.game, q = QUESTS[lair.quest], s = lair.step;
    g.paused = true;
    const close = () => { g.ui.close('lair'); g.paused = false; g.last = performance.now(); };
    g.ui.open('lair', (el) => {
      el.appendChild(h('div', { class: 'panel quest-start', style: '--arc:#b05aff' },
        h('div', { class: 'cnum' }, `Side quest · ${REGIONS[q.region]?.name ?? ''}`),
        h('h2', {}, s.label ?? q.title),
        h('div', { class: 'qbrief' }, h('p', {}, s.text ?? 'Enter the lair.'), q.summary ? h('p', {}, q.summary) : null),
        h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' },
          h('button', { class: 'btn', onclick: close }, 'Not yet'),
          h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { g.ui.closeAll(); g.paused = false; this.startLair(lair); } }, '▶ Enter'))));
    }, { dim: true, onBack: close });
  }
  // What the world map shows for a region: [{ kind: 'giver'|'target'|'lair', quest, x, z (0..1), icon, label }]
  mapMarks(regionId, meta) {
    const out = [];
    const norm = (v) => meta?.size ? [v.x / meta.size[0], v.z / meta.size[1]] : null;
    const L = this.L && this.L.regionId === regionId ? this.L : null;
    const anchorNorm = (name) => { if (L) { const p = anchorPos(L, name); return p ? norm(p) : null; } const a = meta?.anchors?.[name]; return a ? a : null; };
    for (const id of QUEST_ORDER) {
      const q = QUESTS[id], st = this.state(id);
      if (st === 'available' && q.giver?.region === regionId) {
        let p = null;
        if (L) { const v = this.game.regionNpcs?.posOf?.(q.giver.npc) ?? this.game.hubNpcs?.byId?.[q.giver.npc]?.pos; if (v) p = norm(v); }
        p ??= anchorNorm(q.giver.anchor ?? q.giver.npcDef?.anchor ?? ('giver_' + id)) ?? anchorNorm(q.giver.npc);
        out.push({ kind: 'giver', quest: id, icon: '!', label: `${q.title} (new)`, pos: p });
      }
      if (st !== 'active') continue;
      const s = this.current(id); if (!s || s.region !== regionId) continue;
      let p = null;
      if (L) { const v = this.targetIn(id, L); if (v) p = norm(v); }
      else if (s.type === 'mission') { const c = chapter(s.chapter)?.world?.center; p = c && meta?.size ? [c[0] / meta.size[0], c[1] / meta.size[1]] : anchorNorm('lair_' + s.chapter); }
      else if (s.type === 'lair') p = anchorNorm(s.chapter ? 'lair_' + s.chapter : (s.anchor ?? 'lair_' + id));
      else if (s.anchor) p = anchorNorm(s.anchor);
      out.push({ kind: s.type === 'lair' || s.type === 'mission' ? 'lair' : 'target', quest: id, icon: q.kind === 'main' ? '◆' : '◇', label: `${q.title}: ${this.stepText(id)}`, pos: p, main: q.kind === 'main', tracked: this.tracked() === id });
    }
    return out;
  }
}

// ------------------------------------------------------------------ save migration
// Old saves: chapters already cleared stay cleared (main quests read
// save.data.completed); nothing else to move. New fields get defaults.
export function migrateQuests(d) {
  d.quests ??= { st: {}, tracked: null };
  d.quests.st ??= {};
  return d;
}
void CHAPTERS; void missionDef; void arc;
