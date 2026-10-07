// Shared helpers for the class minigames drawn as HTML panels over the 3D scene: a panel
// that takes pointer/touch input, keyboard/controller navigation of a grid of cells, and a
// clean exit.
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';

export function panel(cls, html) {
  const el = document.createElement('div');
  el.className = 'lesson ' + cls;
  el.innerHTML = html;
  document.getElementById('hud').appendChild(el);
  return el;
}

// runs a lesson: setup(el, api) returns { update(dt) }; resolve with api.finish(result)
export function lesson({ cls, html, music = 'castle', setup }) {
  return new Promise((resolve) => {
    const el = panel(cls, html);
    let done = false;
    const api = {
      el,
      finish(result) { if (done) return; done = true; el.remove(); mgExit(); resolve(result); },
      hud(text) { G.ui.minigameHUD(text); },
    };
    const game = setup(el, api);
    mgEnter({ music, abort: () => api.finish({ aborted: true }), update(dt) { if (!done) game.update?.(dt); } });
  });
}

// grid focus helper: cols x rows of elements; moves with nav input, returns the focused index
export function gridNav(cells, cols, start = 0) {
  let i = start;
  const mark = () => cells.forEach((c, k) => c.classList.toggle('focus', k === i));
  mark();
  return {
    get i() { return i; },
    set(k) { i = k; mark(); },
    update() {
      const n = G.input.nav();
      const rows = Math.ceil(cells.length / cols);
      if (n.left) i = (i % cols === 0) ? i + cols - 1 : i - 1;
      if (n.right) i = (i % cols === cols - 1) ? i - cols + 1 : i + 1;
      if (n.up) i = (i - cols + cells.length) % cells.length;
      if (n.down) i = (i + cols) % cells.length;
      i = Math.max(0, Math.min(cells.length - 1, i));
      if (n.left || n.right || n.up || n.down) { mark(); G.audio.sfx('uimove'); }
      void rows;
      return n.confirm || G.input.isPressed('interact') || G.input.isPressed('cast');
    },
  };
}
