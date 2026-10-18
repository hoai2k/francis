// Cursed Dungeons — entry point, game states and the main loop.
import * as THREE from 'three/webgpu';
import { GameRenderer, QUALITY_LABEL, Grade } from './gfx/renderer.js';
import { buildBlockAtlas, buildSpriteAtlas } from './gfx/textures.js';
import { createBlockMaterial, createRoofMaterial, createWaterMaterial, createGlowLiquidMaterial, createDecoMaterial, U } from './gfx/materials.js';
import { LightManager } from './gfx/lights.js';
import { Particles } from './gfx/particles.js';
import { Effects } from './gfx/effects.js';
import { Debris, Bolts } from './gfx/debris.js';
import { Markers } from './gfx/markers.js';
import { CameraRig } from './camera.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Combat } from './combat.js';
import { Projectiles } from './projectiles.js';
import { Hazards } from './hazards.js';
import { UI, h, toast } from './ui/ui.js';
import { HUD } from './ui/hud.js';
import { openSettings } from './ui/settingsScreen.js';
import { TouchControls } from './ui/touch.js';
import { settings, saveSettings } from './settings.js';
import { Environment, BIOMES } from './world/biomes.js';
import { makePropMaterials } from './world/deco.js';
import { BLOCKS } from './world/blocks.js';
import { HubNpcs, RegionNpcs } from './entities/npcs.js';
import { REGIONS, START_REGION, buildRegion, captureMeta } from './world/regions/all.js';
import { QuestSystem } from './quests/all.js';
import { openWorldMap } from './ui/worldMap.js';
import { openQuestLog } from './ui/questLog.js';
import { Dialogue } from './ui/dialogue.js';
import { SpawnDirector } from './world/spawnDirector.js';
import { installQuestMarkers } from './story/questMarkers.js';
import { generateLevel } from './world/levelgen.js';
import { Mission } from './mission.js';
import { Pickups } from './pickups.js';
import { Minimap } from './ui/minimap.js';
import { BOSS_IDS, BOSSES } from './entities/bosses.js';
import { Player, PLAYER_COLORS } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { TrainingDummy } from './entities/dummy.js';
import { FLASH_MATERIAL } from './entities/character.js';
import { SORCERER_IDS, rollTechnique } from './sorcerers/index.js';
import './sorcerers/all.js';
import { Save } from './save.js';
import { rollChest, itemInfo, RARITY } from './loot.js';
import { installFullscreen, toggleFullscreen } from './ui/fullscreen.js';
import { openTitle, openSelect, openInventory, openSkills, openShop, openMapTable, openSaveCode, openLoadout } from './ui/screens.js';
import { Tracker } from './ui/tracker.js';
import { Cutscenes } from './story/cutscenes.js';
import { openInstructions } from './ui/instructions.js';
import { buildSorcererModel } from './entities/models.js';
import { openPhotoMode } from './photo.js';
import { DomainSystem } from './domain.js';
import { Trench } from './gfx/materials.js';
import { isMobile } from './util.js';

const loadFill = document.getElementById('load-fill');
const loadText = document.getElementById('load-text');
const progress = (p, t) => { loadFill.style.width = (p * 100).toFixed(0) + '%'; if (t) loadText.textContent = t; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

class Game {
  constructor() {
    this.settings = settings;
    this.players = []; this.enemies = []; this.allies = [];
    this.time = 0; this.hitstop = 0; this.slowmo = 0; this.slowmoScale = 1;
    this.paused = false; this.state = 'loading';
    this.wipeLeft = 0;
    this.interactables = [];
    this.flashMaterial = FLASH_MATERIAL;
    this.toast = toast;
    this.save = new Save();
  }
  async boot() {
    progress(0.05, 'Detecting GPU…');
    this.gr = new GameRenderer();
    this.startedWebGL = settings.forceWebGL;
    await this.gr.init(document.getElementById('app'), { forceWebGL: settings.forceWebGL, quality: settings.quality });
    this.gr.dynRes = settings.dynRes; this.gr.motionBlur = settings.motionBlur;
    progress(0.2, `${this.gr.info.name} · ${this.gr.backend} · ${QUALITY_LABEL[this.gr.quality]}`);
    await nextFrame();
    this.scene = new THREE.Scene();
    this.rig = new CameraRig(window.innerWidth / window.innerHeight);
    this.rig.shakeScale = settings.shake; this.rig.zoomTarget = settings.cameraZoom;
    this.input = new Input(this.gr.renderer.domElement);
    this.ui = new UI(this);
    this.audio = new Audio();
    const startAudio = () => { this.audio.start(); if (this.audio.pendingAmb) { this.audio.setAmbience(this.audio.pendingAmb); this.audio.pendingAmb = null; } if (this.audio.pendingMusic) { this.audio.setMusic(this.audio.pendingMusic); this.audio.pendingMusic = null; } };
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, startAudio, { passive: true });
    window.addEventListener('gamepadconnected', startAudio);
    progress(0.3, 'Painting textures…');
    await nextFrame();
    const atlas = buildBlockAtlas();
    const sprites = buildSpriteAtlas();
    this.atlas = atlas;
    this.materials = {
      block: createBlockMaterial(atlas),
      water: createWaterMaterial(),
      glow: { cursed: createGlowLiquidMaterial(atlas, 0xc070ff, 2.4), lava: createGlowLiquidMaterial(atlas, 0xff8a3a, 2.8) },
      deco: createDecoMaterial(sprites),
      props: makePropMaterials(),
      makeRoof: () => createRoofMaterial(atlas),
    };
    this.lights = new LightManager(this.scene);
    this.lights.configure(this.gr.preset);
    this.env = new Environment(this.scene, this.lights, this);   // time of day, sky, foliage (gfx/environment.js)
    this.particles = new Particles(this.scene, this.gr.preset.particles);
    this.particles.budget = this.gr.quality === 'low' ? 0.5 : this.gr.quality === 'medium' ? 0.75 : 1;
    this.fx = new Effects(this);
    this.debris = new Debris(this);
    this.bolts = new Bolts(this.scene);
    this.markers = new Markers(this.scene, 64);   // boss patterns telegraph many spots at once
    this.combat = new Combat(this);
    this.projectiles = new Projectiles(this);
    this.hazards = new Hazards(this);
    this.hud = new HUD(this);
    this.tracker = new Tracker(this);   // "where do I go": game.tracker.setGoal / clear
    this.cutscenes = new Cutscenes(this);   // in-engine cinematics: play(id, { onEnd }) (story/cutscenes.js)
    this.pickups = new Pickups(this);
    this.minimap = new Minimap(this);
    this.coins = 0;
    this.domainSys = new DomainSystem(this);
    this.quests = new QuestSystem(this);   // main + side quests (quests/index.js)
    this.save.beforeWrite = () => this.rememberWorldPos();
    this.updaters = [];
    this.targetDof = 0;
    progress(0.45, 'Building the world…');
    await nextFrame();
    this.loadHub();
    progress(0.75, 'Compiling shaders…');
    await nextFrame();
    this.gr.setScene(this.scene, this.rig.camera);
    try { await this.gr.renderer.compileAsync(this.scene, this.rig.camera); } catch (e) { console.warn(e); }
    progress(1, 'Ready');
    window.addEventListener('resize', () => this.gr.resize());
    const persist = () => this.save.write();
    window.addEventListener('beforeunload', persist);
    window.addEventListener('pagehide', persist);       // iOS / mobile never fire beforeunload
    // autosave every 15 s while playing (coins, XP and loot are kept even if the tab is killed)
    setInterval(() => { if (this.state === 'playing') this.save.write(); }, 15000);
    if (!this.save.write()) setTimeout(() => toast('⚠ Your browser is blocking saves — use Pause → Save Code to keep progress', 'big'), 4000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { persist(); if (this.state === 'playing' && !this.paused && !this.ui.stack.length) this.pause(); } });
    installFullscreen();
    window.addEventListener('keydown', (e) => { if (e.code === 'F3') { settings.showFps = !settings.showFps; saveSettings(); this.setReadout(settings.showFps); } });
    // J: the quest log (any time in play, outside cutscenes)
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyJ' || e.repeat || this.state !== 'playing' || this.cutscenes?.active || this.dialogue?.active) return;
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (this.ui.isOpen('questlog')) { this.ui.close('questlog'); this.paused = false; this.last = performance.now(); }
      else if (!this.ui.stack.length || this.ui.isOpen('worldmap')) { this.ui.close('worldmap'); this.openQuestLog(); }
    });
    if (isMobile) { document.body.classList.add('is-touch'); this.touch = new TouchControls(this); this.touch.show(true); }
    this.setReadout(settings.showFps);
    document.getElementById('loading').classList.add('fade');
    setTimeout(() => document.getElementById('loading').remove(), 600);
    this.last = performance.now();
    this.gr.renderer.setAnimationLoop(() => this.frame());
    this.toTitle();
  }
  // ---------------------------------------------------------------- front-end flow
  toTitle() {
    this.state = 'title';
    this.wipeLeft = 0;
    this.hud.show(false); this.touch?.show(false);
    this.worldMission?.end();   // a curtain still down (world/worldMission.js) lifts at once
    for (const p of this.players) this.removePlayer(p);
    this.players = [];
    if (this.mode !== 'world' || this.level?.regionId !== START_REGION) this.loadHub();
    const tc = this.level?.titleCam;
    this.rig.cinematic({ center: tc?.center?.clone() ?? new THREE.Vector3(19, 8, 22), dur: 1e9, dist: tc?.dist ?? 34, pitch: tc?.pitch ?? 34 * Math.PI / 180, orbit: 0.05 });
    this.audio.setMusic('title');
    openTitle(this);
  }
  enterSelectView(slots) {
    this.state = 'select';
    this.exitSelectView(true);
    const st = this.level.stage;
    this.selectRigs = slots.map((s, i) => {
      const rig = buildSorcererModel(SORCERER_IDS[s.char]);
      rig.root.position.set(st.x + (i - (slots.length - 1) / 2) * 2.4, st.y, st.z);
      this.scene.add(rig.root);
      this.fx.summonCircle(rig.root.position, 0x9a7aff);
      return rig;
    });
    this.rig.cinematic({ center: new THREE.Vector3(st.x, st.y + 1.4, st.z), dur: 1e9, dist: 6 + slots.length * 1.3, pitch: 12 * Math.PI / 180, orbit: 0 });
    this.rig.yawSteps = 0;
  }
  exitSelectView(keepCam) {
    for (const r of this.selectRigs ?? []) this.scene.remove(r.root);
    this.selectRigs = [];
    if (!keepCam) this.rig.cine = null;
  }
  beginSession(list) {
    for (const p of this.players) this.removePlayer(p);
    this.players = [];
    for (const l of list) this.addPlayer(l.device, l.sorcerer);
    this.rig.cine = null;
    this.state = 'playing';
    this.hud.show(true); this.touch?.show(true);
    // a new save sees the opening first (story/cutscenes.js), then Jujutsu High;
    // Continue puts you back where you were in the open world (or at the
    // dungeon entrance you were in when you quit)
    const enterWorld = () => {
      const W = this.worldSave(), V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
      if (W.returnTo && REGIONS[W.returnTo.region]) { const r = W.returnTo; W.returnTo = null; this.loadRegion(r.region, { at: V3(r.pos) }); }
      else if (W.region && REGIONS[W.region] && W.pos) this.loadRegion(W.region, { at: V3(W.pos) });
      else { this.loadRegion(START_REGION); this.cutscenes?.playOnce('arrive_hub'); }
      toast(REGIONS[this.level.regionId]?.name ?? 'Jujutsu High', 'big');
    };
    if (!this.cutscenes?.playOnce('opening', { onEnd: enterWorld })) enterWorld();
  }
  openPhotoMode() { return openPhotoMode(this); }
  removePlayer(p) { this.scene.remove(p.object); p.kit.dispose?.(); this.lights.remove(p.heroLight); }
  applyQuality(q) {
    this.gr.setQualityPreset(q === 'auto' ? this.gr.info.tier : q, false);
    this.lights.configure(this.gr.preset);
    U.bakeStrength.value = this.gr.preset.bake;
    this.particles.budget = this.gr.quality === 'low' ? 0.5 : this.gr.quality === 'medium' ? 0.75 : 1;
    if (this.shafts) this.shafts.group.visible = !!this.gr.preset.shafts;
    this.gr.buildPipeline();
    this.setReadout(settings.showFps);
  }
  // ---------------------------------------------------------------- level lifecycle
  clearLevel() {
    if (this.dialogue?.active) this.dialogue.cancel();   // a line from the old region (Kogane, an NPC) never follows you to the next
    this.wipeLeft = 0;
    this.domainSys?.end();
    if (this.world) { this.scene.remove(this.world.group); this.world.group.traverse((o) => o.geometry?.dispose()); }
    if (this.shafts) this.scene.remove(this.shafts.group);
    for (const e of this.enemies) this.scene.remove(e.object);
    for (const a of this.allies) { a.dispose?.(); this.scene.remove(a.object); }
    this.enemies = []; this.allies = [];
    this.projectiles.clear(); this.hazards.clear(); this.pickups.clear();
    for (const m of this.markers.items) this.markers.cancel(m);
    this.updaters = []; this.interactables = [];
    this.mission?.dispose(); this.mission = null;
    this.exitPortal = null; this.objectiveDone = false;
    this.lights.dynamic = this.lights.dynamic.filter((d) => this.players.some((p) => p.heroLight === d));
    Trench.glow.value = 0; this.trenchFade = 0;
    this.hud.setBoss(null); this.hud.setObjective(null);
    for (const o of this.hubProps ?? []) this.scene.remove(o); this.hubProps = [];
    this.hitstop = 0; this.slowmo = 0; this.frozen = false;
    this.quests?.clearSpawned();
  }
  loadWorld(level, biome, opts = {}) {
    this.level = level; this.world = level.world; this.biome = biome;
    this.world.init(this.materials, { focus: opts.focus ?? level.spawn });
    this.scene.add(this.world.group);
    level.deco.build(this.world, this.materials, this.gr.preset.decoDensity);
    this.shafts = level.shafts; this.scene.add(level.shafts.group);
    this.shafts.group.visible = !!this.gr.preset.shafts;
    this.lights.setStatic(this.world.staticLights);
    this.sunOffset0 ??= this.lights.sunOffset.clone();
    this.lights.sunOffset.copy(level.sunOffset ?? this.sunOffset0);   // the hub has a low dusk sun
    this.env.set(biome);
    this.env.buildProbe(this.gr.renderer, biome);
    U.bakeStrength.value = this.gr.preset.bake;
    U.wind.value = biome.wind;
    this.audio.setAmbience(biome.ambience);
  }
  // keepHp: travelling through a region gate or Window keeps the party's health
  placePlayers(at, { keepHp = false } = {}) {
    this.wipeLeft = 0;
    this.players.forEach((p, i) => {
      const hp = p.hp, alive = !p.dead && !p.downed;
      p.spawn(at.clone().add(new THREE.Vector3((i % 2) * 1.4 - 0.7 * (i > 0), 0, Math.floor(i / 2) * 1.4)));
      p.hp = keepHp && alive && hp > 0 ? Math.min(p.maxHp, hp) : p.maxHp; p.dead = false; p.downed = false; p.deadT = 0; p.downT = 0; p.reviveProgress = 0;
      p.action = null; p.healCharges = p.healMax; p.iframes = 2; p.knock?.set(0, 0, 0);
      p.hurtT = 0; p.rig.swap(null); p.invulnerable = false; p.domainActive = false;
      p.rig.hips.rotation.x = 0;
    });
    this.rig.snap(at);
  }
  // ---------------------------------------------------------------- the open world
  loadHub() { this.loadRegion(START_REGION); }
  worldSave() {
    const d = this.save.data;
    d.world ??= {};
    const W = d.world; W.discovered ??= {}; W.stations ??= {}; W.meta ??= {};
    return W;
  }
  rememberWorldPos() {
    if (this.mode !== 'world' || !this.level?.regionId || this.state !== 'playing') return;
    const p = this.players.find((q) => !q.dead) ?? this.players[0]; if (!p) return;
    const W = this.worldSave(); W.region = this.level.regionId; W.pos = [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)];
  }
  // Where the party appears: opts.at (a Vector3), opts.gateFrom (the region we
  // came from: its gate), opts.station (a station id), else the region spawn.
  arrivalPoint(L, opts) {
    const w = L.world;
    const ok = (v) => { if (!v) return null; const y = w.standY(v.x, v.z, v.y, 6); return isFinite(y) ? new THREE.Vector3(v.x, y, v.z) : null; };
    if (opts.at) { const v = ok(opts.at); if (v) return v; }
    if (opts.gateFrom) { const g = L.gates.find((x) => x.to === opts.gateFrom); const v = ok(g?.arrive); if (v) return v; }
    if (opts.station) { const s = L.stations.find((x) => x.id === opts.station); if (s?.pos) { const v = ok(s.pos.clone().add(new THREE.Vector3(0, 0, 0))); if (v) return v; } }
    return L.spawn.clone();
  }
  // Load an open-world region (world/regions/): build or reuse it, mesh the
  // chunks round the arrival point, place the party, wire up gates, Window
  // stations, people, quests, roaming curses, the minimap and the tracker.
  loadRegion(id, opts = {}) {
    this.clearLevel();
    this.dialogue ??= new Dialogue(this);   // game.dialogue.say(speaker, lines, { onEnd }) (ui/dialogue.js)
    this.hubNpcs?.dispose(); this.hubNpcs = null;
    this.regionNpcs?.dispose(); this.regionNpcs = null;
    if (!REGIONS[id]) id = START_REGION;
    const L = buildRegion(id);
    if (L.world.meshed) L.world.unload();          // a cached build: its old meshes went with the last level
    L.world.viewRadius = { low: 56, medium: 70, high: 86 }[this.gr.quality] ?? 96;
    const at = this.arrivalPoint(L, opts);
    this.loadWorld(L, L.biome ?? BIOMES.jujutsu_high, { focus: at });
    if (this.state === 'playing') this.audio.setMusic(L.biome?.music ?? 'hub');
    this.placePlayers(at, { keepHp: !!opts.keepHp });
    L.respawn = at.clone();
    this.hubProps = [];
    this.wave = 0;
    this.mode = 'world';
    const W = this.worldSave();
    const firstVisit = !W.discovered[id];
    W.discovered[id] = true;
    if (this.state === 'playing') W.region = id;   // (the title screen's backdrop must not move your save)
    try { W.meta[id] = captureMeta(L); } catch (e) { console.warn('region meta', e); }
    // Jujutsu High: the residents, the training dummy, the shop, locker, technique tree and map table
    if (L.hub) this.setupHub(L);
    // gates on the roads to the neighbouring regions
    for (const g of L.gates) {
      if (!g.pos || !REGIONS[g.to]) continue;
      this.interactables.push({ id: 'gate-' + g.to, pos: g.pos, radius: g.radius ?? 4, label: `${g.label ?? 'Travel to ' + REGIONS[g.to].name}${W.discovered[g.to] ? '' : ' (unexplored)'}`, action: () => this.travelTo(g.to, { gateFrom: id }) });
    }
    // Window stations: found by walking up to them; interact to fast travel
    for (const s of L.stations) {
      if (!s.pos) continue;
      this.interactables.push({ id: 'station-' + s.id, pos: s.shrine ?? s.pos, radius: 2.6, label: `${s.name} · Window: fast travel`, action: () => { this.discoverStation(s); L.respawn = s.pos.clone(); openWorldMap(this, { station: s.id }); } });
    }
    let chk = 0;
    this.addUpdater((dt) => {
      if ((chk -= dt) > 0) return; chk = 0.5;
      const lead = this.players.find((p) => !p.dead); if (!lead) return;
      for (const s of L.stations) if (s.pos && !W.stations[s.id] && lead.pos.distanceTo(s.pos) < 7) { this.discoverStation(s); L.respawn = s.pos.clone(); }
    });
    // people (and the NPCs quests need here)
    try { this.regionNpcs = new RegionNpcs(this, L, this.quests.npcPosts(L)); const rn = this.regionNpcs; this.addUpdater((dt) => { rn.update(dt); }); } catch (e) { console.warn('region NPCs', e); }
    // natural curse spawning: roaming packs, curse nests, world events (world/spawnDirector.js) -> game.spawns
    this.spawns?.dispose?.(); this.spawns = this.roaming = null;
    try { const sp = this.spawns = this.roaming = new SpawnDirector(this, L); this.addUpdater((dt) => sp.update(dt)); } catch (e) { console.warn('spawn director', e); }
    // region systems (city crowds, building interiors…): L.onLoad(game, L) from the region build
    try { L.onLoad?.(this, L); } catch (e) { console.warn('region onLoad', e); }
    this.minimap.buildRegion(L);
    this.hud.mini.classList.remove('hidden');
    try { this.questMarkers = installQuestMarkers(this, L); } catch (e) { console.warn('quest markers', e); }
    this.quests.onRegionLoaded(L);
    this.regionNpcs?.refreshMarks();
    if (firstVisit && this.state === 'playing' && id !== START_REGION) setTimeout(() => toast(`Region discovered: ${REGIONS[id].name}`, 'big'), 600);
    if (this.state === 'playing') this.save.write();
  }
  setupHub(L) {
    const dummy = new TrainingDummy(this, L.dummy);
    this.scene.add(dummy.object); this.enemies.push(dummy);
    const who = (p) => p ?? this.players[0];
    // Jujutsu High's residents (entities/npcs.js); the station NPCs open their menus after any new lines
    let npcs = null;
    try { npcs = this.hubNpcs = new HubNpcs(this, L); } catch (e) { console.warn('hub NPCs', e); }
    const station = (id, open) => (npcs ? npcs.station(id, open) : open());
    this.interactables.push({ id: 'summon', pos: L.dummy.clone().add(new THREE.Vector3(1.6, 0, 0)), radius: 2.0, label: 'Talisman: summon training curses', action: () => this.spawnWave() });
    this.interactables.push({ id: 'map', pos: L.mapTable, radius: 2.6, label: npcs?.label('ijichi', 'Missions') ?? 'Mission map', action: () => station('ijichi', () => openMapTable(this)) });
    this.interactables.push({ id: 'shop', pos: L.shop, radius: 2.4, label: npcs?.label('merchant', 'Shop') ?? 'Merchant', action: (p) => station('merchant', () => openShop(this, who(p))) });
    this.interactables.push({ id: 'stash', pos: L.stash, radius: 2.0, label: 'Your locker: inventory', action: (p) => openInventory(this, who(p)) });
    this.interactables.push({ id: 'skills', pos: L.skills, radius: 2.4, label: npcs?.label('yaga', 'Technique tree') ?? 'Technique tree', action: (p) => station('yaga', () => openSkills(this, who(p))) });
    if (npcs) this.addUpdater((dt) => { npcs.update(dt); });
  }
  discoverStation(s) {
    const W = this.worldSave();
    if (W.stations[s.id]) return;
    W.stations[s.id] = true;
    toast(`窓 Window station found: ${s.name}`, 'big');
    this.audio?.ui?.('buy');
    this.save.write();
  }
  fastTravel(stationId) {
    if (this.worldMission) { toast('The curtain is down — finish the mission (or Pause → Abandon mission) first'); return; }
    const region = String(stationId).split(':')[0];
    if (!REGIONS[region]) return;
    if (this.mode === 'world' && this.level?.regionId === region) {
      const s = this.level.stations.find((x) => x.id === stationId);
      if (s?.pos) { this.fade(true).then(() => { this.placePlayers(this.arrivalPoint(this.level, { station: stationId }), { keepHp: true }); this.world.stream(this.players.map((p) => p.pos), Infinity); this.fade(false); }); }
      return;
    }
    this.travelTo(region, { station: stationId });
  }
  // Fade out, load a region, fade in (gates, Window stations, leaving a dungeon).
  async travelTo(id, opts = {}) {
    if (this.traveling) return;
    if (this.worldMission && this.state === 'playing') { toast('The curtain is down — finish the mission (or Pause → Abandon mission) first'); return; }
    this.traveling = true;
    if (this.cutscenes?.active) this.cutscenes.abort();
    this.ui.closeAll();
    const R = REGIONS[id];
    await this.fade(true, R ? `${R.icon} ${R.name}` : '');
    await nextFrame(); await nextFrame();
    try { this.loadRegion(id, { keepHp: true, ...opts }); }
    catch (e) { console.error('travel', e); toast('The road is blocked — back to Jujutsu High'); this.loadRegion(START_REGION); }
    await nextFrame();
    this.paused = false; this.last = performance.now();
    this.fade(false);
    toast(REGIONS[this.level.regionId]?.name ?? '', 'big');
    this.traveling = false;
  }
  fade(on, text = '') {
    let el = document.getElementById('travel-fade');
    if (!el) { el = h('div', { id: 'travel-fade', 'aria-hidden': 'true' }, h('div', { class: 'tf-text' })); document.body.appendChild(el); }
    el.querySelector('.tf-text').textContent = text;
    el.classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, on ? 380 : 10));
  }
  openWorldMap(opts) { openWorldMap(this, opts); }
  openQuestLog(opts) { openQuestLog(this, opts); }
  // A side-quest lair (cave / curtain): start its dungeon, come back to the entrance after.
  enterLair(def) { this.startMission(def); }
  // Leave a dungeon: back to the entrance it was started from.
  returnToWorld() {
    const W = this.worldSave(), r = W.returnTo; W.returnTo = null;
    const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    if (r && REGIONS[r.region]) this.travelTo(r.region, { at: V3(r.pos), keepHp: false });
    else this.travelTo(W.region ?? START_REGION, { keepHp: false });
  }
  startMission(def) {
    if (this.cutscenes?.active) this.cutscenes.abort();
    this.ui.closeAll(); this.paused = false;
    // remember the way back out: the lair entrance (or where you stood)
    if (this.mode === 'world' && this.level?.regionId) {
      const lead = this.players.find((p) => !p.dead) ?? this.players[0];
      const rp = this.returnPoint ?? { region: this.level.regionId, pos: lead?.pos ?? this.level.spawn };
      this.worldSave().returnTo = { region: rp.region, pos: [rp.pos.x, rp.pos.y, rp.pos.z] };
      this.save.write();
    }
    this.returnPoint = null;
    this.regionNpcs?.dispose(); this.regionNpcs = null;
    this.clearLevel();
    const L = generateLevel(def);
    this.loadWorld(L, L.biome);
    this.audio.setMusic(L.biome.music);
    this.placePlayers(L.spawn);
    this.minimap.build(L);
    this.hud.mini.classList.remove('hidden');
    this.mission = new Mission(this, def, L);
    this.mission.setup();
    this.mode = 'mission';
    toast(`${L.biome.name} · ${L.biome.sub}`, 'big');
    if (def.id) this.cutscenes?.playOnce('mission_' + def.id);   // a short briefing the first time
  }
  completeMission() {
    const m = this.mission; if (!m || m.complete) return;
    m.complete = true;
    const d = this.save.data;
    try { this.quests?.onMissionComplete(m.def); } catch (e) { console.warn('quests', e); }
    if (!m.def.quest) d.completed[m.def.id ?? 'custom'] = Math.max(d.completed[m.def.id ?? 'custom'] ?? 0, m.def.difficulty);
    d.stats.missions++; d.stats.kills += m.stats.kills;
    d.spins = (d.spins ?? 0) + 2;
    const ups = this.save.addXp(80 * m.def.difficulty);
    this.save.write();
    this.audio.levelUp();
    this.showResults(true);
    if (ups) this.levelUp();
  }
  showResults(victory) {
    const m = this.mission; const st = m?.stats ?? {};
    this.paused = true;
    this.ui.open('results', (el) => {
      const mins = Math.floor((st.time ?? 0) / 60), secs = Math.floor((st.time ?? 0) % 60);
      el.appendChild(h('div', { class: 'panel', style: 'min-width:min(460px,94vw);text-align:center' },
        h('h2', { style: `font-size:34px;color:${victory ? '#ffd23a' : '#ff5a6a'}` }, victory ? 'MISSION COMPLETE' : 'DEFEATED'),
        h('div', { class: 'stat-line' }, 'Curses exorcised', h('b', {}, String(st.kills ?? 0))),
        h('div', { class: 'stat-line' }, 'Time', h('b', {}, `${mins}:${String(secs).padStart(2, '0')}`)),
        h('div', { class: 'stat-line' }, 'Coins collected', h('b', {}, String(st.coins ?? 0))),
        h('div', { class: 'stat-line' }, 'Secrets found', h('b', {}, String(st.secrets ?? 0))),
        victory ? h('div', { class: 'stat-line' }, 'Technique rerolls earned', h('b', {}, '🎲 +2')) : null,
        victory && m?.def?.outro ? h('p', { class: 'results-outro' }, m.def.outro) : null,
        h('div', { class: 'loot-list', id: 'results-loot' }),
        h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' },
          !victory ? h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { const d = m.def; this.ui.close('results'); this.startMission(d); } }, 'Retry') : null,
          h('button', { class: 'btn' + (victory ? ' primary' : ''), 'data-autofocus': victory, onclick: () => { this.ui.close('results'); this.paused = false; this.returnToWorld(); } }, `Return to ${REGIONS[this.save.data.world?.returnTo?.region ?? this.save.data.world?.region]?.name ?? 'the world'}`))));
      const lootEl = el.querySelector('#results-loot');
      for (const it of st.loot ?? []) { const b = itemInfo(it); lootEl.appendChild(h('div', { class: `item ${b.rarity}`, title: b.name }, b.icon, h('span', { class: 'pw' }, String(it.power)))); }
      if (!(st.loot ?? []).length) lootEl.appendChild(h('div', { class: 'hint' }, 'No loot this time.'));
    }, { dim: true });
  }
  returnToHub() { this.returnToWorld(); }
  openMissionSelect() {
    const biomes = Object.keys(BIOMES);
    const state = this.msState ?? (this.msState = { biome: 'jujutsu_high', objective: 'exorcise', boss: 'jogo', difficulty: 1 });
    this.paused = true;
    this.ui.open('missions', (el) => {
      const opt = (key, list, label) => h('div', { class: 'setting' }, h('label', {}, label), (() => {
        const sel = h('select', {}, ...list.map(([v, t]) => { const o = h('option', { value: v }, t); if (state[key] == v) o.selected = true; return o; }));
        sel.addEventListener('change', () => { state[key] = isNaN(+sel.value) ? sel.value : +sel.value; });
        return sel;
      })());
      el.appendChild(h('div', { class: 'panel', style: 'width:min(520px,94vw)' }, h('h2', {}, 'Mission Board'),
        opt('biome', biomes.map((b) => [b, BIOMES[b].name]), 'Location'),
        opt('objective', [['exorcise', 'Exorcise the curses'], ['rescue', 'Rescue students'], ['seal', 'Seal cursed objects']], 'Objective'),
        opt('boss', BOSS_IDS.map((id) => [id, BOSSES[id].name]), 'Special Grade'),
        opt('difficulty', [[1, 'Grade 3'], [2, 'Grade 2'], [3, 'Grade 1'], [4, 'Special Grade']], 'Threat'),
        h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:12px' },
          h('button', { class: 'btn', onclick: () => { this.ui.close('missions'); this.paused = false; } }, 'Back'),
          h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => this.startMission({ ...state, seed: (Math.random() * 1e9) | 0 }) }, 'Deploy'))));
    }, { dim: true, onBack: () => { this.ui.close('missions'); this.paused = false; } });
  }
  openMap() {
    if (this.mode === 'world') { openWorldMap(this); return; }
    if (!this.minimap.level) return;
    this.paused = true;
    this.ui.open('map', (el) => {
      const cv = h('canvas', { class: 'mapview', width: 640, height: 640 });
      el.appendChild(h('div', { class: 'panel', style: 'text-align:center' }, h('h2', {}, 'Map'), cv, h('div', { class: 'hint' }, '■ objective  ■ chest  ● curse  ■ boss arena  ● exit'), h('button', { class: 'btn', 'data-autofocus': true, onclick: () => { this.ui.close('map'); this.paused = false; } }, 'Close')));
      this.minimap.draw(cv, { full: true });
    }, { dim: true, onBack: () => { this.ui.close('map'); this.paused = false; } });
  }
  addCoins(n) { this.save.data.coins += n; if (this.mission) this.mission.stats.coins += n; }
  addPlayer(device, sorcerer) {
    const i = this.players.length;
    const p = new Player(this, i, device, sorcerer);
    const base = this.players[0]?.pos ?? this.level.spawn;
    p.spawn(base.clone().add(new THREE.Vector3(i ? (i - 1.5) * 1.2 : 0, 0, i ? 1.2 : 0)));
    this.scene.add(p.object);
    this.players.push(p);
    this.hud?.rebuildCards();
    return p;
  }
  spawnEnemy(kind, pos, opts = {}) {
    const cap = this.gr.preset.enemyCap;
    if (this.enemies.filter((e) => !e.dead && !e.isDummy).length >= cap && opts.summoned) return null;
    const e = new Enemy(this, kind, pos, opts);
    this.scene.add(e.object);
    this.enemies.push(e);
    return e;
  }
  spawnWave() {
    this.wave++;
    const kinds = [
      ['swarmer', 'swarmer', 'flyhead', 'flyhead', 'flyhead'],
      ['transfigured', 'transfigured', 'spitter', 'blob', 'swarmer'],
      ['grasshopper', 'embryo', 'swarmer', 'flyhead', 'flyhead'],
      ['doll', 'spitter', 'spitter', 'burrower', 'swarmer'],
      ['lantern', 'maw', 'ashspirit', 'transfigured', 'transfigured'],
      ['tank', 'longneck', 'shadow', 'swarmer', 'swarmer'],
      ['gravekeeper', 'teleporter', 'grasshopper', 'flyhead', 'flyhead'],
      ['serpent', 'healer', 'doll', 'swarmer', 'swarmer'],
      ['summoner', 'tank', 'teleporter', 'blob', 'spitter', 'swarmer', 'swarmer'],
    ][(this.wave - 1) % 9];
    const c = this.level.dummy;
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * Math.PI * 2 + Math.random();
      const pos = new THREE.Vector3(c.x + Math.cos(a) * 7, c.y, c.z + 4 + Math.sin(a) * 5);
      const gy = this.world.standY(pos.x, pos.z, c.y); if (!isFinite(gy)) return;
      pos.y = gy;
      const elite = this.wave >= 3 && i === 0 ? ['swift', 'armored', 'vampiric', 'explosive', 'shadow'][this.wave % 5] : null;
      this.spawnEnemy(k, pos, { elite });
      this.fx.summonCircle(pos, 0xb05aff);
    });
    this.audio.energy('summon');
    toast(`Wave ${this.wave}`);
  }
  // per-frame callbacks for technique effects; return false to finish
  addUpdater(fn) { this.updaters.push(fn); }
  startDomain(p, def) { return this.domainSys.start(p, def); }
  hostileTargets() { return this.allies.length ? [...this.players, ...this.allies] : this.players; }
  surfaceAt(pos) { const id = this.world.get(Math.floor(pos.x), Math.floor(pos.y - 0.1), Math.floor(pos.z)); return id ? BLOCKS[id].step : 'stone'; }
  nearestEnemy(pos, range) {
    let best = null, bd = range * range;
    for (const e of this.enemies) { if (e.dead || e.untargetable) continue; const d = e.pos.distanceToSquared(pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  // ---------------------------------------------------------------- feel
  hitStop(s) { if (settings.hitstop) this.hitstop = Math.max(this.hitstop, Math.min(0.2, s)); }
  shake(a) { this.rig.addTrauma(a * settings.shake); }
  slowMo(dur, scale = 0.3) { if (!settings.slowmo) return; this.slowmo = Math.max(this.slowmo, dur); this.slowmoScale = scale; }
  onEnemyKilled(e) {
    this.mission?.onKill(e);
    try { this.quests?.onKill(e); } catch (err) { console.warn('quests', err); }
    const k = e.lastAttacker;
    if (k?.isPlayer && k.procs) {
      if (k.procs.leech) k.heal(k.maxHp * 0.02 * k.procs.leech, true);
      if (k.procs.rampage) k.rampageT = 5;
      if (k.procs.explode) { this.combat.aoe(e.pos, 2.6, e.maxHp * 0.2 * k.procs.explode, k, { knock: 6, blocks: false }); this.fx.explosion(e.pos, 0xff8a3a, 2.4); }
    }
    if (!e.isDummy) {
      const ups = this.save.addXp(e.def.xp ?? 3);
      if (ups) this.levelUp();
      const [a, b] = e.def.coins ?? [1, 2];
      this.pickups.drop('coin', e.pos, a + Math.floor(Math.random() * (b - a + 1)));
      if (Math.random() < 0.08) this.pickups.drop('heal', e.pos, 1);
      if (Math.random() < 0.12) this.pickups.drop('ce', e.pos, 1);
    }
  }
  onBossKilled(b) { this.mission?.onBossKilled(b); if (this.save.addXp(150)) this.levelUp(); }
  levelUp() {
    const d = this.save.data;
    toast(`LEVEL ${d.level}! +1 enchantment point, +2 technique points, +1 reroll`, 'big');
    this.audio.levelUp();
    for (const p of this.players) { this.fx.heal(p.pos, 0xffd23a); p.hp = p.maxHp; }
    this.save.write();
  }
  onChestOpened(c, p) {
    const power = this.mission?.def.difficulty ?? 1;
    const items = rollChest(power, c.boss ? 'boss' : c.rarity);
    items.forEach((it, i) => {
      this.save.data.inventory.push(it);
      this.mission?.stats.loot.push(it);
      const b = itemInfo(it), R = RARITY[b.rarity];
      setTimeout(() => {
        toast(`${b.icon} ${R.label}: ${b.name}`);
        this.audio.loot(b.rarity);
        const col = new THREE.Color(R.color);
        this.particles.burst(c.pos.clone().setY(c.pos.y + 1), { count: 30, color: col, speed: 3, up: 4, life: 1.2, size: 0.18, gravity: -2, shape: 1 });
        this.lights.flash(c.pos.clone().setY(c.pos.y + 2), col, 8, 8, 1.2);
      }, 350 + i * 450);
    });
    this.save.write();
  }
  onPlayerDied(p) {
    if (this.wipeLeft > 0 || !this.players.length || !this.players.every((q) => q.dead || q.downed)) return;
    for (const q of this.players) if (q.downed) { q.downed = false; q.dead = true; q.deadT = 0; }
    this.wipeLeft = 2.5;
    toast('Party defeated — respawning', 'big');
  }
  updateWipe(dt) {
    if (this.wipeLeft <= 0 || this.paused || this.state !== 'playing') return;
    this.wipeLeft -= dt;
    if (this.wipeLeft <= 0) { this.placePlayers(this.level.respawn ?? this.level.spawn); toast('Revived', 'big'); }
  }

  setReadout(on) { this.readoutOn = on; document.getElementById('readout').classList.toggle('hidden', !on); }
  pause(player = this.players[0]) {
    if (this.paused) return;
    this.paused = true;
    // Pause is a game menu: anyone can navigate it. Its character menus
    // (inventory, tree, loadout) and Drop out act for the player who pressed
    // the button, never for whoever opened the pause menu.
    const mine = (e, fn) => {
      const dev = e?.detail > 0 ? 'kbm' : this.ui.lastConfirmDevice;
      const p = this.players.find((q) => q.device === dev) ?? (this.players.length === 1 ? this.players[0] : null);
      if (!p) { toast('Only a player can do that: join first'); return; }
      this.ui.close('pause'); fn(p);
    };
    this.ui.open('pause', (el) => {
      el.appendChild(h('div', { class: 'panel menu-col', style: 'min-width:280px;text-align:center' },
        h('h2', {}, 'Paused'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => this.resume() }, 'Resume'),
        h('button', { class: 'btn', onclick: (e) => mine(e, (p) => openInventory(this, p)) }, 'Inventory'),
        h('button', { class: 'btn', onclick: (e) => mine(e, (p) => openSkills(this, p)) }, 'Technique Tree'),
        h('button', { class: 'btn', onclick: (e) => mine(e, (p) => openLoadout(this, p)) }, 'Loadout'),
        this.mode === 'world' ? h('button', { class: 'btn', onclick: () => { this.ui.close('pause'); openWorldMap(this); } }, '🗾 World Map') : null,
        h('button', { class: 'btn', onclick: () => { this.ui.close('pause'); openQuestLog(this); } }, '📜 Quest Log'),
        h('button', { class: 'btn', onclick: () => openInstructions(this) }, 'How to Play'),
        h('button', { class: 'btn', onclick: () => { toast(this.save.write() ? '💾 Game saved' : '⚠ Browser blocked saving — use Save Code'); this.audio.ui('buy'); } }, '💾 Save Game'),
        h('button', { class: 'btn', onclick: () => openSaveCode(this) }, 'Save Code'),
        h('button', { class: 'btn', onclick: () => openSettings(this) }, 'Settings'),
        h('button', { class: 'btn', onclick: () => toggleFullscreen() }, '⛶ Fullscreen'),
        h('button', { class: 'btn', onclick: () => { this.ui.close('pause'); this.openPhotoMode(); } }, '📷 Photo Mode'),
        this.players.length > 1 ? h('button', { class: 'btn', title: 'Leaves the game for the player who presses it', onclick: (e) => mine(e, (p) => { this.paused = false; this.last = performance.now(); this.dropOut(p); }) }, 'Drop out') : null,
        h('button', { class: 'btn', onclick: () => { this.ui.close('pause'); this.paused = false; this.save.write(); this.toTitle(); } }, 'Quit to Title'),
        this.mode === 'mission' ? h('button', { class: 'btn danger', onclick: () => { this.ui.close('pause'); this.paused = false; this.returnToWorld(); } }, 'Abandon mission') : null,
        this.worldMission ? h('button', { class: 'btn danger', onclick: () => { this.ui.close('pause'); this.paused = false; this.last = performance.now(); this.worldMission?.abandon(); } }, 'Abandon mission (lift the curtain)') : null,
      ));
    }, { dim: true, onBack: () => this.resume() });
  }
  resume() { this.save.write(); this.ui.close('pause'); this.paused = false; this.last = performance.now(); }

  // Drop-in co-op: an unassigned controller pressing Start/A joins.
  // A player leaves the session from their pause menu; the others carry on.
  // Their controller (or the keyboard) can join again later the usual way.
  dropOut(p) {
    if (!p || this.players.length <= 1 || !this.players.includes(p)) return;
    if (this.domain?.caster === p) this.domainSys.end();
    this.save.write();
    this.removePlayer(p);
    this.players.splice(this.players.indexOf(p), 1);
    this.players.forEach((q, i) => { q.index = i; q.color = PLAYER_COLORS[i]; });
    // the button that confirmed "Drop out" must be let go before it can rejoin
    (this.joinBlock ??= {})[p.device] = performance.now() + 1200;
    this.hud?.rebuildCards();
    toast(`${p.device === 'kbm' ? 'Keyboard player' : 'Player'} dropped out · press ${p.device === 'kbm' ? 'Enter' : 'A / Start'} to join again`);
    this.audio.ui('back');
  }
  checkJoin() {
    if (isMobile || this.players.length >= 4) return;
    const blocked = (id, held) => {
      const b = this.joinBlock?.[id]; if (!b) return false;
      if (performance.now() < b || held) { if (held) this.joinBlock[id] = Math.max(b, performance.now() + 200); return true; }
      delete this.joinBlock[id]; return false;
    };
    // the keyboard can drop back in with Enter after dropping out
    if (!this.players.some((p) => p.device === 'kbm')) {
      const enter = this.input.keys.has('Enter') || this.input.keys.has('NumpadEnter');
      if (!blocked('kbm', enter) && enter && !this.ui.stack.length) {
        const tech = SORCERER_IDS.includes(this.save.data.technique) ? this.save.data.technique : rollTechnique();
        const p = this.addPlayer('kbm', tech);
        this.fx.summonCircle(p.pos, 0x6ad8ff); toast(`Player ${p.index + 1} joined (keyboard)`); this.audio.ui('buy');
      }
    }
    for (const pad of this.input.pads()) {
      const id = 'pad' + pad.index;
      if (this.players.some((p) => p.device === id)) continue;
      if (blocked(id, pad.buttons[9]?.pressed || pad.buttons[0]?.pressed)) continue;
      if (pad.buttons[9]?.pressed || pad.buttons[0]?.pressed) {
        // a lone keyboard P1 who has been idle hands control to the controller instead
        const p0 = this.players[0];
        if (this.players.length === 1 && p0.device === 'kbm' && performance.now() - (this.input.kbmActivity ?? 0) > 8000) {
          p0.device = id; toast('Controller connected to Player 1'); continue;
        }
        // the keyboard player keeps P1; if P1 is idle on keyboard and this is the only pad, still add
        const pick = rollTechnique();
        const p = this.addPlayer(id, pick);
        this.fx.summonCircle(p.pos, 0x6ad8ff);
        toast(`Player ${p.index + 1} joined`);
        this.audio.ui('buy');
      }
    }
  }
  updateInteract(dt) {
    for (const p of this.players) p.nearInteract = false;
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      let near = null;
      for (const p of this.players) if (!p.dead && !p.downed && p.pos.distanceTo(it.pos) < it.radius) near = p;
      if (!near) { it.progress = 0; it.touchHold = false; continue; }
      near.nearInteract = true;   // a gamepad's A interacts here instead of jumping
      const key = near.device === 'kbm' ? 'E' : near.device === 'touch' ? '👆' : 'A';
      const inp = this.input.get(near.device);
      if (it.hold) {
        const holding = inp.held.interact || it.touchHold;
        if (holding && !it.progress) it.onHoldStart?.();
        it.progress = holding ? (it.progress ?? 0) + dt / it.hold : Math.max(0, (it.progress ?? 0) - dt);
        const bar = '▮'.repeat(Math.round((it.progress ?? 0) * 8)).padEnd(8, '▯');
        this.hud.prompt(it.id, it.pos.clone().setY(it.pos.y + 2.4), `${key}  ${it.label}  ${it.progress > 0 ? bar : '(hold)'}`, () => { it.touchHold = true; });
        if (it.progress >= 1) { it.progress = 0; it.touchHold = false; it.action(near); }
      } else {
        this.hud.prompt(it.id, it.pos.clone().setY(it.pos.y + 2.2), `${key}  ${it.label}`, () => it.action(near));
        if (inp.pressed.interact) it.action(near);
      }
    }
  }

  frame() {
    const now = performance.now();
    const realDt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.input.poll();
    const gr = this.gr;
    gr.trackFps(realDt, now / 1000);
    const playing = this.state === 'playing';
    const cs = this.cutscenes?.active;
    const pausePlayer = playing && !cs && this.players.find((p) => this.input.get(p.device).pressed.pause);
    const invP = playing && !cs && !this.ui.stack.length && this.players.find((p) => this.input.get(p.device).pressed.inv);
    if (invP) openInventory(this, invP);
    // Tab (keyboard) opens the map; on a controller View opens it on release, and a long press opens the quest log
    let anyMap = playing && !cs && this.players.some((p) => !p.device.startsWith('pad') && this.input.get(p.device).pressed.map);
    if (playing && !cs) for (const pad of this.input.pads()) {
      const k = 'pad' + pad.index; this.viewHold ??= {};
      const st = this.viewHold[k] ??= { t: 0, fired: false };
      if (pad.buttons[8]?.pressed) {
        st.t += realDt;
        if (st.t > 0.5 && !st.fired) { st.fired = true; if (this.ui.isOpen('questlog')) { this.ui.close('questlog'); this.paused = false; } else if (!this.ui.stack.length || this.ui.isOpen('worldmap') || this.ui.isOpen('map')) { this.ui.close('worldmap'); this.ui.close('map'); this.openQuestLog(); } }
      } else { if (st.t > 0 && !st.fired) anyMap = true; st.t = 0; st.fired = false; }
    }
    if (this.ui.stack.length) { if (!cs) this.ui.update(); if (anyMap && (this.ui.isOpen('map') || this.ui.isOpen('worldmap'))) { this.ui.close('map'); this.ui.close('worldmap'); this.paused = false; } }
    else if (pausePlayer) this.pause(pausePlayer);
    else if (anyMap) this.openMap();
    let dt = realDt;
    if (this.paused) dt = 0;
    else if (this.hitstop > 0) { this.hitstop -= realDt; dt = 0; }
    else if (this.slowmo > 0) { this.slowmo -= realDt; dt *= this.slowmoScale; }
    this.updateWipe(realDt);
    this.time += dt;
    U.time.value = this.time;
    if (cs) this.cutscenes.update(realDt);   // a cutscene drives its figures and the camera (on real time, even under a menu); gameplay waits
    else if (!this.paused) {
      if (playing) this.checkJoin();
      const z = this.input.takeZoom(); if (z) this.rig.zoom(z * 1.6);
      const p0 = this.players[0];
      if (settings.cameraRotate && p0) { const ip = this.input.get(p0.device); if (ip.pressed.rotL) this.rig.rotate(-1); if (ip.pressed.rotR) this.rig.rotate(1); }
      for (const p of this.players) p.update(dt);
      for (let i = this.allies.length - 1; i >= 0; i--) if (!this.allies[i].update(dt)) this.allies.splice(i, 1);
      for (const r of this.selectRigs ?? []) { r.root.rotation.y += realDt * 0.8; r.animate({ dt: realDt, speed: 0, vel: new THREE.Vector3() }); }
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (!e.update(dt)) { this.scene.remove(e.object); this.enemies.splice(i, 1); }
      }
      for (let i = this.updaters.length - 1; i >= 0; i--) if (this.updaters[i](dt, realDt) === false) this.updaters.splice(i, 1);
      this.projectiles.update(dt);
      this.hazards.update(dt);
      this.updateInteract(dt);
      this.pickups.update(dt);
      this.mission?.update(dt);
      this.quests?.update(dt);
    }
    this.domainSys.update(dt, this.paused ? 0 : realDt);
    if (this.trenchFade > 0) { this.trenchFade -= dt; Trench.glow.value = Math.min(1.4, this.trenchFade / 6); }
    Grade.dofAmount.value += (this.targetDof - Grade.dofAmount.value) * Math.min(1, realDt * 4);
    this.markers.update(dt);
    this.debris.update(dt);
    this.bolts.update(realDt);
    // camera + world
    this.rig.update(dt, this.players.length ? this.players : [this.idleFocus ?? (this.idleFocus = { pos: (this.level?.titleCam?.center ?? new THREE.Vector3(19, 6, 24)).clone(), vel: new THREE.Vector3(), aimDir: new THREE.Vector3(), dead: false })], realDt);
    if (cs) this.cutscenes.applyCamera();
    U.camPos.value.copy(this.rig.camera.position);
    for (let i = 0; i < 4; i++) {
      const pl = this.players[i];
      if (pl && !pl.dead && !cs) U.players.array[i].set(pl.pos.x, pl.pos.y, pl.pos.z, 1); else U.players.array[i].set(0, -999, 0, 0);
    }
    this.lights.update(dt, this.rig.focus);
    this.world.updateRoofs(this.players, realDt);
    if (this.world.streaming) {   // open-world regions: mesh the chunks round the party, drop the far ones
      const fl = this.streamFocus ??= [];
      fl.length = 0; for (const p of this.players) fl.push(p.pos);
      fl.push(this.rig.focus);
      this.world.stream(fl, this.traveling ? 8 : 1, this.traveling ? 12 : 2.5);
    }
    this.world.flush(2);
    this.env.update(realDt);
    if (!this.paused) this.fx.ambient(dt, this.biome.particles, this.rig.focus);
    this.fx.update(dt, realDt);
    this.particles.upload();
    this.hud.update(realDt);
    this.tracker?.update(realDt);
    if (this.minimap.level && (this.frameN = (this.frameN ?? 0) + 1) % 3 === 0 && !this.hud.mini.classList.contains('hidden')) this.minimap.draw(this.hud.mini);
    gr.render();
    if (this.readoutOn) this.updateReadout();
  }
  updateReadout() {
    this.readoutT = (this.readoutT ?? 0) + 1;
    if (this.readoutT % 15) return;
    const gr = this.gr;
    const info = gr.renderer.info;
    const dummy = this.enemies.find((e) => e.isDummy);
    document.getElementById('readout').textContent =
      `${QUALITY_LABEL[gr.quality]} · ${gr.backend}\n${gr.fps.toFixed(0)} FPS · ${(gr.pixelRatio).toFixed(2)}x res` +
      `\n${info.render.drawCalls ?? info.render.calls ?? 0} draws · ${this.lights.pool.length} lights` + (dummy && dummy.dps > 0 ? `\nDummy DPS ${dummy.dps.toFixed(0)}` : '');
  }
}

const game = new Game();
window.__game = game;
game.boot().catch((e) => {
  console.error(e);
  loadText.textContent = 'Failed to start: ' + (e.message || e) + ' — your browser needs WebGPU or WebGL2.';
});
