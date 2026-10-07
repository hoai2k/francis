// Bringing a friend along: creates / removes the companion and keeps it in step
// with zones, cutscenes and minigames.
import { G } from './state.js';
import { Companion } from './companion.js';
import { FRIENDS, friendLevel, placeFriends } from './friends.js';

export function setCompanion(id) {
  if (G.companion) { G.companion.remove(); G.companion = null; }
  G.save.companion = id || null;
  if (id) {
    G.companion = new Companion(id);
    G.ui.toast(`${FRIENDS[id].short} joins you. Hold ${G.input.device === 'pad' ? 'D-pad ←' : G.input.device === 'touch' ? 'the 👥 button' : 'G'} for orders.`, 'tip', 4500);
  }
  placeFriends();
  G.ui.updateCompanion?.();
}
// called every frame from the main loop
export function updateCompanion(dt) {
  const c = G.companion;
  if (!c) return;
  const visible = (G.mode === 'play' || G.mode === 'dialogue') && !G.minigame && !G.story.journeyQuest && G.zone && !G.zone.noCompanion;
  c.root.visible = visible;
  if (visible && G.mode === 'play') c.update(dt);
  else if (visible) c.anim.update(dt, 0);
}
export function restoreCompanion() {
  const id = G.save.companion;
  if (G.companion?.id !== id) setCompanion(id && FRIENDS[id] && friendLevel(id) >= 2 ? id : null);
  else if (G.companion) G.companion.placeNear();
}
