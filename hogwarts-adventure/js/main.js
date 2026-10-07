// Boot, loading screen, main loop and top-level state.
import * as THREE from 'three';
import { G } from './state.js';
import { initEngine, QUALITY, updatePost } from './engine.js';
import { setTextureSize } from './textures.js';
import { Sky } from './sky.js';
import { World } from './world/index.js';
import { FX } from './particles.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { AudioSys } from './audio.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { Spells } from './spells.js';
import { Enemies } from './enemies.js';
import { Story } from './story.js';
import { loadSettings, loadSave, newSave, writeSave } from './save.js';
import { openMainMenu, openPause, openSpellbook, openJournal, menuBackdrop } from './menus.js';
import { nextFrame } from './util.js';
import { initFullscreen } from './fullscreen.js';

class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] ||= []).push(f); }
  off(e, f) { this.h[e] = (this.h[e] || []).filter((x) => x !== f); }
  emit(e, ...a) { for (const f of this.h[e] || []) f(...a); }
}

async function boot() {
  const canvas = document.getElementById('gl');
  G.settings = loadSettings();
  G.save = loadSave() || newSave();
  const q = G.settings.quality;
  const Q = QUALITY[q];
  setTextureSize(q === 'low' ? 256 : 512);
  G.events = new Emitter();
  initFullscreen();
  const ui = (G.ui = new UI());
  const step = async (text, f) => { ui.setLoading(text, f); await nextFrame(); };
  await step('Waking the portraits…', 0.02);
  initEngine(canvas, q);
  G.input = new Input(canvas);
  G.audio = new AudioSys();
  const unlockAudio = () => { G.audio.init(); };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('gamepadconnected', unlockAudio);
  await step('Painting the sky…', 0.06);
  G.skyObj = new Sky(G.scene);
  G.skyObj.tod = G.save.tod ?? 0.68;
  G.world = new World();
  await G.world.build(Q, (label, f) => step(label + '…', 0.08 + f * 0.7));
  await step('Summoning sparkles…', 0.8);
  G.fx = new FX(G.scene, Q.particles);
  G.player = new Player();
  G.cam = new CameraRig(G.camera);
  G.spells = new Spells();
  G.enemies = new Enemies();
  G.input.buildTouch(document.getElementById('touch'));
  G.input.on(() => { ui.showHUD(G.mode === 'play'); ui.refreshPrompts?.(); });
  await step('Writing the story…', 0.88);
  G.story = new Story();
  G.world.setZone('grounds', 'spawn');
  await step('Compiling enchantments…', 0.93);
  G.world.precompile();
  G.composer.render();
  await step('Ready', 1);
  document.getElementById('loading').classList.add('done');
  setTimeout(() => document.getElementById('loading').remove(), 900);
  G.mode = 'menu';
  menuBackdrop(true);
  openMainMenu();
  G.audio.music('menu');
  setInterval(() => { if (G.mode === 'play' || G.mode === 'minigame') { G.save.playTime += 30; writeSave(); } }, 30000);
  window.addEventListener('beforeunload', () => { writeSave(); G.net?.close(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play' && !G.paused) openPause(); });
  requestAnimationFrame(loop);
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.realDt = realDt;
  G.realTime += realDt;
  // slow motion for finishing blows and the spell wheel
  if (G.slowmo > 0) G.slowmo -= realDt;
  const target = G.slowmo > 0 ? 0.22 : G.ui.wheel ? 0.25 : 1;
  G.timeScale += (target - G.timeScale) * Math.min(1, realDt * 10);
  const I = G.input;
  I.update(realDt);
  const menuHandled = G.ui.handleInput();
  // global keys
  if (I.isPressed('mute')) G.audio.toggleMute();
  if ((G.mode === 'play' || G.mode === 'minigame') && !G.paused && !menuHandled) {
    if (I.isPressed('pause')) openPause();
    else if (G.mode === 'play' && !G.minigame && I.isPressed('book')) openSpellbook(true);
    else if (G.mode === 'play' && !G.minigame && I.isPressed('journal')) openJournal(true);
  }
  if (G.ui.wheel) G.ui.updateWheel();
  // online, a menu doesn't stop the world (friends are still playing in it): the game keeps
  // running with your student standing still. Minigames still pause, they're yours alone.
  const paused = G.paused && !(G.net?.live && !G.minigame);
  const dt = paused ? 0 : realDt * G.timeScale;
  if (!paused) {
    G.time += dt;
    const focus = G.player.pos;
    G.skyObj.update(dt, focus);
    G.world.update(dt, G.time);
    if (G.minigame) G.minigame.update(dt, realDt);
    const combat = G.mode === 'play' || (G.minigame && G.minigame.combat);
    if (combat || G.mode === 'dialogue') G.player.update(dt);
    else if (G.mode === 'minigame') G.player.update(dt);
    else if (G.mode === 'menu-custom') { G.player.anim.update(dt, 0); G.player.root.position.copy(G.player.pos); }
    if (combat) {
      G.spells.update(dt);
      G.enemies.update(dt);
    } else {
      G.enemies.list.forEach((e) => e.anim.update?.(dt, 0));
    }
    G.story.update(dt);
    G.fx.update(dt);
    G.lights.update(dt, G.camera.position.clone().lerp(focus, 0.5));
    if (G.mode === 'menu') menuBackdrop(false, realDt);
    G.cam.update(realDt);
    if (G.mode === 'play') {
      G.ui.updateHUD(realDt);
      if (!G.paused) G.story.updatePrompt();
    }
  }
  G.net?.update(realDt);
  updatePost(dt, realDt);
  G.composer.render();
  I.endFrame();
}

boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('load-text');
  if (t) t.textContent = 'Something went wrong: ' + e.message;
});
window.G = G;
window.THREE = THREE;
