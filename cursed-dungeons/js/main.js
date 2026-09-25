// Cursed Dungeons — entry point and game loop.
import * as THREE from 'three/webgpu';
import { GameRenderer, QUALITY_LABEL, Grade } from './gfx/renderer.js';
import { buildBlockAtlas, buildSpriteAtlas } from './gfx/textures.js';
import { createBlockMaterial, createRoofMaterial, createWaterMaterial, createGlowLiquidMaterial, createDecoMaterial, U } from './gfx/materials.js';
import { LightManager } from './gfx/lights.js';
import { Particles } from './gfx/particles.js';
import { Effects } from './gfx/effects.js';
import { CameraRig } from './camera.js';
import { Input } from './input.js';
import { UI, h, toast } from './ui/ui.js';
import { openSettings } from './ui/settingsScreen.js';
import { TouchControls } from './ui/touch.js';
import { settings, saveSettings } from './settings.js';
import { Environment, BIOMES } from './world/biomes.js';
import { makePropMaterials } from './world/deco.js';
import { BLOCKS } from './world/blocks.js';
import { buildTestRoom } from './world/testroom.js';
import { Player } from './entities/player.js';
import { buildDummy } from './entities/models.js';
import { isMobile } from './util.js';

const loadFill = document.getElementById('load-fill');
const loadText = document.getElementById('load-text');
const progress = (p, t) => { loadFill.style.width = (p * 100).toFixed(0) + '%'; if (t) loadText.textContent = t; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

class Game {
  constructor() {
    this.settings = settings;
    this.players = [];
    this.enemies = [];
    this.time = 0; this.timeScale = 1; this.hitstop = 0; this.slowmo = 0; this.slowmoScale = 1;
    this.paused = false;
    this.state = 'loading';
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
    this.fx = new Effects(this);
    progress(0.45, 'Building the shrine…');
    await nextFrame();
    this.loadTestRoom();
    progress(0.75, 'Compiling shaders…');
    await nextFrame();
    this.gr.setScene(this.scene, this.rig.camera);
    try { await this.gr.renderer.compileAsync(this.scene, this.rig.camera); } catch (e) { console.warn(e); }
    progress(1, 'Ready');
    window.addEventListener('resize', () => this.gr.resize());
    this.bindGlobalKeys();
    if (isMobile) { document.body.classList.add('is-touch'); this.touch = new TouchControls(this); this.touch.show(true); }
    this.setReadout(settings.showFps);
    document.getElementById('loading').classList.add('fade');
    setTimeout(() => document.getElementById('loading').remove(), 600);
    this.state = 'playing';
    this.last = performance.now();
    this.gr.renderer.setAnimationLoop(() => this.frame());
    toast('Jujutsu High · Test Shrine', 'big');
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
  loadTestRoom() {
    const L = buildTestRoom();
    this.level = L;
    this.world = L.world;
    this.biome = BIOMES.jujutsu_high;
    this.world.init(this.materials);
    this.scene.add(this.world.group);
    L.deco.build(this.world, this.materials, this.gr.preset.decoDensity);
    this.shafts = L.shafts; this.scene.add(L.shafts.group);
    this.shafts.group.visible = !!this.gr.preset.shafts;
    this.lights.setStatic(this.world.staticLights);
    this.env.set(this.biome);
    this.env.buildProbe(this.gr.renderer, this.biome);
    U.bakeStrength.value = this.gr.preset.bake;
    U.wind.value = this.biome.wind;
    // player
    const dev = isMobile ? 'touch' : 'kbm';
    const p = new Player(this, 0, dev, 'gojo');
    p.spawn(L.spawn);
    this.scene.add(p.object);
    this.players = [p];
    this.rig.snap(p.pos);
    // training dummy
    const d = buildDummy(); d.root.position.copy(L.dummy); d.root.rotation.y = Math.PI * 0.1;
    this.scene.add(d.root); this.dummy = d;
  }
  surfaceAt(pos) { const id = this.world.get(Math.floor(pos.x), Math.floor(pos.y - 0.1), Math.floor(pos.z)); return id ? BLOCKS[id].step : 'stone'; }
  nearestEnemy(pos, range) {
    let best = null, bd = range * range;
    for (const e of this.enemies) { if (e.dead) continue; const d = e.pos.distanceToSquared(pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  bindGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') { settings.showFps = !settings.showFps; saveSettings(); this.setReadout(settings.showFps); }
    });
  }
  setReadout(on) {
    this.readoutOn = on;
    document.getElementById('readout').classList.toggle('hidden', !on);
  }
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.ui.open('pause', (el) => {
      el.appendChild(h('div', { class: 'panel menu-col', style: 'min-width:280px;text-align:center' },
        h('h2', {}, 'Paused'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => this.resume() }, 'Resume'),
        h('button', { class: 'btn', onclick: () => openSettings(this) }, 'Settings'),
      ));
    }, { dim: true, onBack: () => this.resume() });
  }
  resume() { this.ui.close('pause'); this.paused = false; this.last = performance.now(); }

  frame() {
    const now = performance.now();
    let realDt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.input.poll();
    const gr = this.gr;
    gr.trackFps(realDt, now / 1000);
    // pause toggle
    const p0 = this.players[0];
    const anyPause = [...this.players.map((p) => this.input.get(p.device).pressed.pause)].some(Boolean);
    if (this.ui.stack.length) { this.ui.update(); }
    else if (anyPause) { this.pause(); }
    // time scale: hit-stop freezes, slow-mo scales
    let dt = realDt;
    if (this.paused) dt = 0;
    else {
      if (this.hitstop > 0) { this.hitstop -= realDt; dt = 0; }
      else if (this.slowmo > 0) { this.slowmo -= realDt; dt *= this.slowmoScale; }
    }
    this.time += dt;
    U.time.value = this.time;
    if (!this.paused) {
      const z = this.input.takeZoom(); if (z) this.rig.zoom(z * 1.6);
      if (settings.cameraRotate) {
        const ip = this.input.get(p0.device);
        if (ip.pressed.rotL) this.rig.rotate(-1); if (ip.pressed.rotR) this.rig.rotate(1);
      }
      for (const p of this.players) p.update(dt);
      if (this.dummy) this.dummy.animate({ dt, speed: 0, vel: new THREE.Vector3() });
    }
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
    gr.render();
    if (this.readoutOn) this.updateReadout();
  }
  updateReadout() {
    this.readoutT = (this.readoutT ?? 0) + 1;
    if (this.readoutT % 15) return;
    const gr = this.gr;
    const info = gr.renderer.info;
    document.getElementById('readout').textContent =
      `${QUALITY_LABEL[gr.quality]} · ${gr.backend}\n${gr.fps.toFixed(0)} FPS · ${(gr.pixelRatio).toFixed(2)}x res` +
      `\n${info.render.drawCalls ?? info.render.calls ?? 0} draws · ${this.lights.pool.length} lights`;
  }
}

const game = new Game();
window.__game = game;
game.boot().catch((e) => {
  console.error(e);
  loadText.textContent = 'Failed to start: ' + (e.message || e) + ' — your browser needs WebGPU or WebGL2.';
});
