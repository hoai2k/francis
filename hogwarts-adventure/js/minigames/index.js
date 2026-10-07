// Minigame runner: loads a minigame, remembers where the player was, shows results,
// awards house points and restores the world afterwards.
import * as THREE from 'three';
import { G } from '../state.js';
import { writeSave } from '../save.js';
import { openResults } from '../menus.js';
import { addXP } from '../progress.js';

export async function runMinigame(id, opts = {}) {
  const mod = await import(`./${id}.js`);
  const ctx = { zone: G.zone.name, pos: G.player.pos.clone(), yaw: G.player.yaw, mode: opts.fromMenu ? 'menu' : 'play' };
  G.ui.prompt(null);
  G.enemies.clearZone();
  let result;
  for (;;) {
    G.ui.closeAll();
    G.paused = false;
    result = await mod.play(opts, ctx);
    G.minigame = null;
    G.ui.cancelDialogue();
    if (G.quitting) { G.ui.minigameHUD(null); return result; }
    G.ui.minigameHUD(null);
    if (result.aborted) break;
    const best = G.save.best[id];
    const isBest = result.score != null && (best == null || result.score > best);
    if (isBest) G.save.best[id] = result.score;
    let pts = result.points || 0;
    if (opts.practice && !G.save.house) pts = 0;
    if (pts && G.save.house) G.story.addPoints(G.save.house, pts, result.title, true);
    if (!opts.practice || G.save.started) addXP(20 + Math.max(0, pts) * 4);
    G.audio.sfx(result.success ? 'victory' : 'fail');
    G.mode = 'results';
    G.ui.showHUD(false);
    document.exitPointerLock?.();
    const choice = await openResults({ title: result.title, sub: result.sub, lines: result.lines, points: pts && G.save.house ? pts : 0, best: isBest && G.save.best[id] > 0, retry: !result.noRetry });
    writeSave();
    if (choice !== 'retry') break;
  }
  // restore the player where they were
  G.player.flying = false;
  G.player.control = true;
  G.player.status.override = null;
  G.player.root.visible = true;
  G.player.model.root.position.set(0, 0, 0);
  G.player.model.root.rotation.set(0, 0, 0);
  G.cam.setCinematic(null);
  G.audio.wind(0);
  G.enemies.clearZone();
  if (result.restore !== false) {
    await G.ui.fade(1, 0.3);
    G.world.setZone(ctx.zone, { pos: ctx.pos, yaw: ctx.yaw });
    G.cam.snap();
    G.ui.fade(0, 0.5);
  }
  G.mode = ctx.mode;
  if (G.mode === 'play') { G.ui.showHUD(true); G.ui.refreshHUD(); }
  G.ui.closeAll();
  return result;
}

// shared helpers for minigames
export function mgEnter(mg) {
  G.minigame = mg;
  G.mode = mg.combat ? 'play' : 'minigame';
  G.ui.showHUD(!!mg.combat);
  document.getElementById('hud').classList.remove('hidden');
  if (!mg.combat) {
    for (const id of ['spellbar', 'crosshair', 'quest', 'prompt', 'marker']) document.getElementById(id)?.classList.add('mg-hide');
  }
  G.audio.music(mg.music);
}
export function mgExit() {
  for (const id of ['spellbar', 'crosshair', 'quest', 'prompt', 'marker']) document.getElementById(id)?.classList.remove('mg-hide');
}
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
