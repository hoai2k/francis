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
import { buildTestRoom } from './world/testroom.js';
import { generateLevel } from './world/levelgen.js';
import { Mission } from './mission.js';
import { Pickups } from './pickups.js';
import { Minimap } from './ui/minimap.js';
import { BOSS_IDS } from './entities/bosses.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { TrainingDummy } from './entities/dummy.js';
import { FLASH_MATERIAL } from './entities/character.js';
import { SORCERER_IDS } from './sorcerers/index.js';
import './sorcerers/gojo.js';
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
    this.interactables = [];
    this.flashMaterial = FLASH_MATERIAL;
    this.toast = toast;
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
    this.env = new Environment(this.scene, this.lights);
    this.particles = new Particles(this.scene, this.gr.preset.particles);
    this.particles.budget = this.gr.quality === 'low' ? 0.5 : this.gr.quality === 'medium' ? 0.75 : 1;
    this.fx = new Effects(this);
    this.debris = new Debris(this);
    this.bolts = new Bolts(this.scene);
    this.markers = new Markers(this.scene);
    this.combat = new Combat(this);
    this.projectiles = new Projectiles(this);
    this.hazards = new Hazards(this);
    this.hud = new HUD(this);
    this.pickups = new Pickups(this);
    this.minimap = new Minimap(this);
    this.coins = 0;
    this.domainSys = new DomainSystem(this);
    this.updaters = [];
    this.targetDof = 0;
    progress(0.45, 'Building the shrine…');
    await nextFrame();
    this.loadTestRoom();
    progress(0.75, 'Compiling shaders…');
    await nextFrame();
    this.gr.setScene(this.scene, this.rig.camera);
    try { await this.gr.renderer.compileAsync(this.scene, this.rig.camera); } catch (e) { console.warn(e); }
    progress(1, 'Ready');
    window.addEventListener('resize', () => this.gr.resize());
    window.addEventListener('keydown', (e) => { if (e.code === 'F3') { settings.showFps = !settings.showFps; saveSettings(); this.setReadout(settings.showFps); } });
    if (isMobile) { document.body.classList.add('is-touch'); this.touch = new TouchControls(this); this.touch.show(true); }
    this.setReadout(settings.showFps);
    document.getElementById('loading').classList.add('fade');
    setTimeout(() => document.getElementById('loading').remove(), 600);
    this.state = 'playing';
    this.hud.show(true);
    this.last = performance.now();
    this.gr.renderer.setAnimationLoop(() => this.frame());
    toast('Jujutsu High · Training Shrine', 'big');
    this.hud.setObjective('Training', isMobile ? 'Tap the talisman by the dummy to summon curses' : 'Press E at the talisman by the dummy to summon curses');
  }
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
    this.hitstop = 0; this.slowmo = 0; this.frozen = false;
  }
  loadWorld(level, biome) {
    this.level = level; this.world = level.world; this.biome = biome;
    this.world.init(this.materials);
    this.scene.add(this.world.group);
    level.deco.build(this.world, this.materials, this.gr.preset.decoDensity);
    this.shafts = level.shafts; this.scene.add(level.shafts.group);
    this.shafts.group.visible = !!this.gr.preset.shafts;
    this.lights.setStatic(this.world.staticLights);
    this.env.set(biome);
    this.env.buildProbe(this.gr.renderer, biome);
    U.bakeStrength.value = this.gr.preset.bake;
    U.wind.value = biome.wind;
    this.audio.setAmbience(biome.ambience);
  }
  placePlayers(at) {
    this.players.forEach((p, i) => {
      p.spawn(at.clone().add(new THREE.Vector3((i % 2) * 1.4 - 0.7 * (i > 0), 0, Math.floor(i / 2) * 1.4)));
      p.hp = p.maxHp; p.dead = false; p.downed = false; p.deadT = 0; p.action = null; p.healCharges = p.healMax;
      p.rig.hips.rotation.x = 0;
    });
    this.rig.snap(at);
  }
  loadTestRoom() {
    this.clearLevel();
    const L = buildTestRoom();
    this.loadWorld(L, BIOMES.jujutsu_high);
    this.audio.setMusic('shrine');
    if (!this.players.length) this.addPlayer(isMobile ? 'touch' : 'kbm', 'gojo');
    this.placePlayers(L.spawn);
    const dummy = new TrainingDummy(this, L.dummy);
    this.scene.add(dummy.object); this.enemies.push(dummy);
    this.interactables.push({ id: 'summon', pos: L.dummy.clone().add(new THREE.Vector3(1.6, 0, 0)), radius: 2.2, label: 'Summon curses', action: () => this.spawnWave() });
    this.interactables.push({ id: 'board', pos: new THREE.Vector3(18.5, L.spawn.y, 19.5), radius: 2.6, label: 'Mission board', action: () => this.openMissionSelect() });
    this.wave = 0;
    this.minimap.level = null;
    this.hud.mini.classList.add('hidden');
    this.hud.setObjective('Training Shrine', isMobile ? 'Tap the talisman by the dummy to summon curses · Mission board by the lanterns' : 'E at the talisman: summon curses · E at the lanterns: mission board');
    this.mode = 'hub';
  }
  startMission(def) {
    this.ui.closeAll(); this.paused = false;
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
  }
  completeMission() {
    const m = this.mission; if (!m || m.complete) return;
    m.complete = true;
    this.audio.levelUp();
    this.showResults(true);
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
        h('div', { class: 'loot-list', id: 'results-loot' }),
        h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' },
          !victory ? h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { const d = m.def; this.ui.close('results'); this.startMission(d); } }, 'Retry') : null,
          h('button', { class: 'btn' + (victory ? ' primary' : ''), 'data-autofocus': victory, onclick: () => { this.ui.close('results'); this.paused = false; this.returnToHub(); } }, 'Return to Jujutsu High'))));
      this.onResultsShown?.(el, victory);
    }, { dim: true });
  }
  returnToHub() { this.loadTestRoom(); }
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
        opt('boss', [['jogo', 'Volcano Curse'], ['hanami', 'Grove Curse'], ['mahito', 'Patchwork Curse']], 'Special Grade'),
        opt('difficulty', [[1, 'Grade 3'], [2, 'Grade 2'], [3, 'Grade 1'], [4, 'Special Grade']], 'Threat'),
        h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:12px' },
          h('button', { class: 'btn', onclick: () => { this.ui.close('missions'); this.paused = false; } }, 'Back'),
          h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => this.startMission({ ...state, seed: (Math.random() * 1e9) | 0 }) }, 'Deploy'))));
    }, { dim: true, onBack: () => { this.ui.close('missions'); this.paused = false; } });
  }
  openMap() {
    if (!this.minimap.level) return;
    this.paused = true;
    this.ui.open('map', (el) => {
      const cv = h('canvas', { class: 'mapview', width: 640, height: 640 });
      el.appendChild(h('div', { class: 'panel', style: 'text-align:center' }, h('h2', {}, 'Map'), cv, h('div', { class: 'hint' }, '■ objective  ■ chest  ● curse  ■ boss arena  ● exit'), h('button', { class: 'btn', 'data-autofocus': true, onclick: () => { this.ui.close('map'); this.paused = false; } }, 'Close')));
      this.minimap.draw(cv, { full: true });
    }, { dim: true, onBack: () => { this.ui.close('map'); this.paused = false; } });
  }
  addCoins(n) { this.coins += n; if (this.mission) this.mission.stats.coins += n; }
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
    const kinds = [['swarmer', 'swarmer', 'swarmer', 'swarmer'], ['swarmer', 'swarmer', 'spitter', 'blob', 'swarmer'], ['tank', 'swarmer', 'swarmer', 'spitter', 'teleporter'], ['summoner', 'tank', 'teleporter', 'blob', 'spitter', 'swarmer', 'swarmer']][(this.wave - 1) % 4];
    const c = this.level.dummy;
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * Math.PI * 2 + Math.random();
      const pos = new THREE.Vector3(c.x + Math.cos(a) * 7, c.y, c.z + 4 + Math.sin(a) * 5);
      const gy = this.world.groundBelow(pos.x, pos.z, pos.y + 3); if (!isFinite(gy)) return;
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
    if (!e.isDummy) {
      const [a, b] = e.def.coins ?? [1, 2];
      this.pickups.drop('coin', e.pos, a + Math.floor(Math.random() * (b - a + 1)));
      if (Math.random() < 0.08) this.pickups.drop('heal', e.pos, 1);
      if (Math.random() < 0.12) this.pickups.drop('ce', e.pos, 1);
    }
  }
  onBossKilled(b) { this.mission?.onBossKilled(b); }
  onPlayerDied(p) {
    if (!this.players.every((q) => q.dead)) return;
    if (this.mode === 'mission') setTimeout(() => this.showResults(false), 1800);
    else setTimeout(() => { this.placePlayers(this.level.spawn); toast('Revived'); }, 2500);
  }

  setReadout(on) { this.readoutOn = on; document.getElementById('readout').classList.toggle('hidden', !on); }
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.ui.open('pause', (el) => {
      el.appendChild(h('div', { class: 'panel menu-col', style: 'min-width:280px;text-align:center' },
        h('h2', {}, 'Paused'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => this.resume() }, 'Resume'),
        h('button', { class: 'btn', onclick: () => openSettings(this) }, 'Settings'),
        this.mode === 'mission' ? h('button', { class: 'btn danger', onclick: () => { this.ui.close('pause'); this.paused = false; this.returnToHub(); } }, 'Abandon mission') : null,
      ));
    }, { dim: true, onBack: () => this.resume() });
  }
  resume() { this.ui.close('pause'); this.paused = false; this.last = performance.now(); }

  // Drop-in co-op: an unassigned controller pressing Start/A joins.
  checkJoin() {
    if (isMobile || this.players.length >= 4) return;
    for (const pad of this.input.pads()) {
      const id = 'pad' + pad.index;
      if (this.players.some((p) => p.device === id)) continue;
      if (pad.buttons[9]?.pressed || pad.buttons[0]?.pressed) {
        // the keyboard player keeps P1; if P1 is idle on keyboard and this is the only pad, still add
        const used = new Set(this.players.map((p) => p.sorcerer));
        const pick = SORCERER_IDS.find((s) => !used.has(s)) ?? 'gojo';
        const p = this.addPlayer(id, pick);
        this.fx.summonCircle(p.pos, 0x6ad8ff);
        toast(`Player ${p.index + 1} joined`);
        this.audio.ui('buy');
      }
    }
  }
  updateInteract(dt) {
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      let near = null;
      for (const p of this.players) if (!p.dead && !p.downed && p.pos.distanceTo(it.pos) < it.radius) near = p;
      if (!near) { it.progress = 0; it.touchHold = false; continue; }
      const key = near.device === 'kbm' ? 'E' : near.device === 'touch' ? '👆' : 'X';
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
    const anyPause = this.players.some((p) => this.input.get(p.device).pressed.pause);
    const anyMap = this.players.some((p) => this.input.get(p.device).pressed.map);
    if (this.ui.stack.length) { this.ui.update(); if (anyMap && this.ui.isOpen('map')) { this.ui.close('map'); this.paused = false; } }
    else if (anyPause) this.pause();
    else if (anyMap) this.openMap();
    let dt = realDt;
    if (this.paused) dt = 0;
    else if (this.hitstop > 0) { this.hitstop -= realDt; dt = 0; }
    else if (this.slowmo > 0) { this.slowmo -= realDt; dt *= this.slowmoScale; }
    this.time += dt;
    U.time.value = this.time;
    if (!this.paused) {
      this.checkJoin();
      const z = this.input.takeZoom(); if (z) this.rig.zoom(z * 1.6);
      const p0 = this.players[0];
      if (settings.cameraRotate && p0) { const ip = this.input.get(p0.device); if (ip.pressed.rotL) this.rig.rotate(-1); if (ip.pressed.rotR) this.rig.rotate(1); }
      for (const p of this.players) p.update(dt);
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
    }
    this.domainSys.update(dt, this.paused ? 0 : realDt);
    if (this.trenchFade > 0) { this.trenchFade -= dt; Trench.glow.value = Math.min(1.4, this.trenchFade / 6); }
    Grade.dofAmount.value += (this.targetDof - Grade.dofAmount.value) * Math.min(1, realDt * 4);
    this.markers.update(dt);
    this.debris.update(dt);
    this.bolts.update(realDt);
    // camera + world
    this.rig.update(dt, this.players, realDt);
    U.camPos.value.copy(this.rig.camera.position);
    for (let i = 0; i < 4; i++) {
      const pl = this.players[i];
      if (pl && !pl.dead) U.players.array[i].set(pl.pos.x, pl.pos.y, pl.pos.z, 1); else U.players.array[i].set(0, -999, 0, 0);
    }
    this.lights.update(dt, this.rig.focus);
    this.world.updateRoofs(this.players, realDt);
    this.world.flush(2);
    this.env.update(realDt);
    if (!this.paused) this.fx.ambient(dt, this.biome.particles, this.rig.focus);
    this.fx.update(dt, realDt);
    this.particles.upload();
    this.hud.update(realDt);
    if (this.minimap.level && (this.frameN = (this.frameN ?? 0) + 1) % 3 === 0) this.minimap.draw(this.hud.mini);
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
