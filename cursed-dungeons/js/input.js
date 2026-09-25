// Unified input: keyboard+mouse, up to four gamepads and touch. Each local
// player is bound to one device; per-frame state gives a move vector, an aim
// (mouse point, right stick or auto-aim) and edge-triggered buttons.
import { isMobile } from './util.js';

const ACTIONS = ['attack', 'ranged', 'dodge', 't1', 't2', 't3', 'domain', 'interact', 'heal', 'map', 'pause', 'rotL', 'rotR'];
const KEYMAP = {
  Space: 'dodge', Digit1: 't1', Digit2: 't2', Digit3: 't3', KeyF: 'domain', KeyE: 'interact', KeyQ: 'heal',
  Tab: 'map', Escape: 'pause', KeyP: 'pause', KeyZ: 'rotL', KeyC: 'rotR', ShiftLeft: 'dodge',
};
// Standard gamepad mapping
const PADMAP = { 0: 'attack', 1: 'dodge', 2: 'interact', 3: 't3', 4: 't1', 5: 't2', 6: 'domain', 7: 'ranged', 8: 'map', 9: 'pause', 12: 'heal' };

function blank() { const o = {}; for (const a of ACTIONS) o[a] = false; return o; }

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0, left: false, right: false, moved: false };
    this.wheel = 0;
    this.pinch = 0;
    this.touch = { stick: null, stickVec: { x: 0, y: 0 }, buttons: blank(), active: isMobile };
    this.prev = new Map();         // device -> previous held map
    this.state = new Map();        // device -> current state
    this.lastDevice = isMobile ? 'touch' : 'kbm';
    this.onPadJoin = null;
    this.bindKeyboard();
    this.bindTouchPinch();
  }
  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      this.keys.add(e.code); this.lastDevice = 'kbm';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; });
    const c = this.canvas;
    c.addEventListener('mousemove', (e) => this.setMouse(e));
    window.addEventListener('mousemove', (e) => this.setMouse(e));
    c.addEventListener('mousedown', (e) => { this.setMouse(e); if (e.button === 0) this.mouse.left = true; if (e.button === 2) this.mouse.right = true; this.lastDevice = 'kbm'; });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.wheel += Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60 + 0.5); }, { passive: false });
  }
  setMouse(e) {
    this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    this.mouse.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    this.mouse.moved = true;
  }
  bindTouchPinch() {
    let startD = 0;
    this.canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 2) startD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && startD) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.pinch += (startD - d) / 25; startD = d;
      }
    }, { passive: true });
  }
  pads() { return navigator.getGamepads ? [...navigator.getGamepads()].filter((p) => p && p.connected) : []; }
  padById(idx) { const all = navigator.getGamepads ? navigator.getGamepads() : []; return all[idx] || null; }

  // Poll once per frame.
  poll() {
    // keyboard + mouse
    const k = this.keys;
    const kb = blank();
    for (const code of k) { const a = KEYMAP[code]; if (a) kb[a] = true; }
    kb.attack = this.mouse.left; kb.ranged = this.mouse.right;
    let mx = 0, my = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1; if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) my += 1; if (k.has('KeyS') || k.has('ArrowDown')) my -= 1;
    const ml = Math.hypot(mx, my) || 1;
    this.setState('kbm', { move: { x: mx / ml, y: my / ml }, aimStick: null, mouse: true, held: kb });
    // gamepads
    for (const p of this.pads()) {
      const id = 'pad' + p.index;
      const held = blank();
      p.buttons.forEach((b, i) => { const a = PADMAP[i]; if (a && (b.pressed || b.value > 0.5)) held[a] = true; });
      const dz = (x, y) => { const l = Math.hypot(x, y); if (l < 0.2) return { x: 0, y: 0 }; const s = Math.min(1, (l - 0.2) / 0.75) / l; return { x: x * s, y: y * s }; };
      const move = dz(p.axes[0] || 0, -(p.axes[1] || 0));
      if (p.buttons[14]?.pressed) move.x = -1; if (p.buttons[15]?.pressed) move.x = 1;
      if (p.buttons[13]?.pressed) move.y = -1;
      const aim = dz(p.axes[2] || 0, -(p.axes[3] || 0));
      held.rotL = false; held.rotR = false;
      this.setState(id, { move, aimStick: (aim.x || aim.y) ? aim : null, mouse: false, held });
      if (Object.values(held).some(Boolean) || move.x || move.y) this.lastDevice = id;
    }
    // touch
    this.setState('touch', { move: { ...this.touch.stickVec }, aimStick: null, mouse: false, held: { ...this.touch.buttons }, auto: true });
  }
  setState(dev, s) {
    const prev = this.state.get(dev);
    const prevHeld = prev ? prev.held : blank();
    s.pressed = {}; s.released = {};
    for (const a of ACTIONS) { s.pressed[a] = s.held[a] && !prevHeld[a]; s.released[a] = !s.held[a] && prevHeld[a]; }
    this.state.set(dev, s);
  }
  get(dev) { return this.state.get(dev) || { move: { x: 0, y: 0 }, held: blank(), pressed: blank(), released: blank() }; }
  // consumes wheel/pinch zoom
  takeZoom() { const z = this.wheel + this.pinch; this.wheel = 0; this.pinch = 0; return z; }

  // Menu navigation merged across every device (edge-triggered).
  menu() {
    const out = { up: false, down: false, left: false, right: false, confirm: false, back: false, start: false, device: null };
    const k = this.keys; const pk = this._menuPrevKeys || new Set();
    const edge = (code) => k.has(code) && !pk.has(code);
    if (edge('ArrowUp') || edge('KeyW')) out.up = true; if (edge('ArrowDown') || edge('KeyS')) out.down = true;
    if (edge('ArrowLeft') || edge('KeyA')) out.left = true; if (edge('ArrowRight') || edge('KeyD')) out.right = true;
    if (edge('Enter')) { out.confirm = true; out.device = 'kbm'; }
    if (edge('Escape') || edge('Backspace')) out.back = true;
    this._menuPrevKeys = new Set(k);
    this._padPrev = this._padPrev || {};
    for (const p of this.pads()) {
      const id = 'pad' + p.index; const prev = this._padPrev[id] || {};
      const cur = {
        up: p.buttons[12]?.pressed || (p.axes[1] ?? 0) < -0.6, down: p.buttons[13]?.pressed || (p.axes[1] ?? 0) > 0.6,
        left: p.buttons[14]?.pressed || (p.axes[0] ?? 0) < -0.6, right: p.buttons[15]?.pressed || (p.axes[0] ?? 0) > 0.6,
        confirm: p.buttons[0]?.pressed, back: p.buttons[1]?.pressed, start: p.buttons[9]?.pressed,
      };
      for (const key in cur) if (cur[key] && !prev[key]) { out[key] = true; if (key === 'confirm' || key === 'start') out.device = id; }
      this._padPrev[id] = cur;
    }
    return out;
  }
}
