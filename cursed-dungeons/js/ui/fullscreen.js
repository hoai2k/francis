// Fullscreen: a corner button, Alt+Enter / F11-style toggle, and menu
// entries. On phones it also locks the screen to landscape where allowed.
// iPhone Safari has no fullscreen API for pages, so it explains the
// Add-to-Home-Screen route instead.
import { h, toast } from './ui.js';

const el = () => document.documentElement;
export const fullscreenSupported = () => !!(el().requestFullscreen || el().webkitRequestFullscreen);
export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

export async function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
      return;
    }
    if (!fullscreenSupported()) {
      toast('Fullscreen: tap Share → Add to Home Screen, then open the game from your home screen');
      return;
    }
    await (el().requestFullscreen?.({ navigationUI: 'hide' }) ?? el().webkitRequestFullscreen?.());
    try { await screen.orientation?.lock?.('landscape'); } catch (e) { /* desktop / not allowed */ }
  } catch (e) {
    toast('Fullscreen was blocked by the browser');
  }
}

// Floating ⛶ button in the top-right corner plus the keyboard shortcut.
export function installFullscreen() {
  const btn = h('button', { class: 'fs-btn', title: 'Fullscreen (Alt+Enter)', 'aria-label': 'Toggle fullscreen', onclick: (e) => { e.stopPropagation(); toggleFullscreen(); btn.blur(); } });
  const sync = () => { const on = isFullscreen(); btn.textContent = on ? '🗗' : '⛶'; btn.classList.toggle('on', on); };
  sync();
  document.body.appendChild(btn);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if ((e.code === 'Enter' && e.altKey) || e.code === 'F11') { e.preventDefault(); toggleFullscreen(); }
  });
}
