// Fullscreen helpers. Browsers only allow fullscreen from a user gesture, so it is
// requested when the player starts or continues a game (and on the first tap in
// landscape on phones). iPhone Safari has no element fullscreen; there "Add to Home
// Screen" is the way to hide the browser bars.
import { G } from './state.js';

export const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
export const canFullscreen = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

export function enterFullscreen() {
  if (fullscreenElement() || !canFullscreen()) return;
  const el = document.documentElement;
  try {
    const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.();
    r?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch?.(() => { /* refused */ });
  } catch { /* not allowed here */ }
}
export function exitFullscreen() {
  try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {}); } catch { /* ignore */ }
}
export function toggleFullscreen() {
  if (fullscreenElement()) exitFullscreen(); else enterFullscreen();
}
// called when entering the game from the title screen
export function autoFullscreen() {
  if (G.settings?.fullscreen !== false) enterFullscreen();
}
export function initFullscreen() {
  // phones: the first tap in landscape goes fullscreen
  if (matchMedia('(pointer: coarse)').matches) {
    document.addEventListener('pointerup', () => {
      if (innerWidth > innerHeight && G.settings?.fullscreen !== false) enterFullscreen();
    }, { capture: true });
  }
  const relabel = () => document.querySelectorAll('.fs-btn').forEach((b) => { b.textContent = fullscreenElement() ? 'Exit fullscreen' : 'Fullscreen'; });
  document.addEventListener('fullscreenchange', relabel);
  document.addEventListener('webkitfullscreenchange', relabel);
  // F11-style shortcut that does not clash with game keys
  window.addEventListener('keydown', (e) => { if (e.code === 'F11') { e.preventDefault(); toggleFullscreen(); } });
}
