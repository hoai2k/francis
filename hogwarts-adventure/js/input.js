// Unified input: keyboard + mouse, touch (virtual joystick, buttons, swipe-to-cast)
// and gamepads via the Gamepad API (Xbox / PlayStation / Switch prompts, rumble).
import { G } from './state.js';
import { clamp } from './util.js';

const KEYMAP = {
  Space: ['jump', 'confirm'], KeyE: ['interact'], KeyF: ['interact'], KeyQ: ['block'], ShiftLeft: ['dodge', 'sprint'], ShiftRight: ['dodge', 'sprint'],
  Tab: ['lock'], KeyC: ['wheel'], Escape: ['pause', 'back'], KeyP: ['pause'], KeyB: ['book'], KeyJ: ['journal'], KeyM: ['mute'],
  Enter: ['confirm'], Backspace: ['back'], ArrowUp: ['up'], ArrowDown: ['down'], ArrowLeft: ['left'], ArrowRight: ['right'],
  KeyW: ['upMenu'], KeyS: ['downMenu'], KeyA: ['leftMenu'], KeyD: ['rightMenu'], KeyR: ['next'], KeyZ: ['prev'],
  Digit1: ['spell1'], Digit2: ['spell2'], Digit3: ['spell3'], Digit4: ['spell4'], Digit5: ['spell5'], Digit6: ['spell6'], Digit7: ['spell7'], Digit8: ['spell8'],
};
// gamepad button index -> actions
const PADMAP = {
  0: ['jump', 'confirm'], 1: ['dodge', 'back'], 2: ['interact'], 3: ['block'], 8: ['book'], 9: ['pause'], 10: ['sprint'], 11: ['recenter'],
  12: ['up'], 13: ['down'], 14: ['left'], 15: ['right'],
};

export const BINDINGS = [
  // [label, keyboard, padButton]
  ['Move', 'W A S D', 'LS'],
  ['Look / aim', 'Mouse', 'RS'],
  ['Cast selected spell', 'Left click', 'RT'],
  ['Protego (block)', 'Right click / Q', 'Y'],
  ['Lock on to target', 'Tab / middle click', 'LT'],
  ['Previous / next spell', 'Wheel / Z / R', 'LB / RB'],
  ['Spell wheel', 'Hold C', 'Hold LB or RB'],
  ['Pick spell 1–8', '1 – 8', '—'],
  ['Jump', 'Space', 'A'],
  ['Dodge roll (hold: sprint)', 'Shift', 'B (L3 sprint)'],
  ['Interact / talk', 'E', 'X'],
  ['Spellbook', 'B', 'View'],
  ['Quest journal', 'J', '—'],
  ['Pause / menu', 'Esc / P', 'Menu'],
  ['Mute', 'M', '—'],
  ['Menus', 'Arrows · Enter · Esc', 'D-pad · A · B'],
];

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.lstick = { x: 0, y: 0 };
    this.rstick = { x: 0, y: 0 };
    this.lt = 0;
    this.rt = 0;
    this.device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'kbm';
    this.padType = 'xbox';
    this.padIndex = -1;
    this.keys = new Set();
    this.mouseHeld = new Set();
    this.padPrev = [];
    this.padHold = {};
    this.navRepeat = {};
    this.touchHeld = new Set();
    this.touchPressed = new Set();
    this.touchMove = { x: 0, y: 0 };
    this.touchLook = { x: 0, y: 0 };
    this.swipe = null;
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
    this.listeners = [];
    this._bind();
  }

  on(fn) { this.listeners.push(fn); }
  emitDevice() { for (const f of this.listeners) f(this.device, this.padType); }
  setDevice(d) {
    if (d !== this.device) {
      this.device = d;
      document.body.dataset.device = d;
      this.emitDevice();
    }
  }

  _bind() {
    document.body.dataset.device = this.device;
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.setDevice('kbm');
      this.keys.add(e.code);
      for (const a of KEYMAP[e.code] || []) this._press(a);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      for (const a of KEYMAP[e.code] || []) this._release(a);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      for (const a of [...this.held]) this._release(a);
    });
    const c = this.canvas;
    c.addEventListener('mousedown', (e) => {
      this.setDevice('kbm');
      if ((G.mode === 'play' || G.minigame?.wantsPointer) && !document.pointerLockElement && G.settings?.pointerLock !== false) {
        c.requestPointerLock?.();
        return;
      }
      const a = e.button === 0 ? 'cast' : e.button === 2 ? 'block' : 'lock';
      this.mouseHeld.add(a);
      this._press(a);
    });
    window.addEventListener('mouseup', (e) => {
      const a = e.button === 0 ? 'cast' : e.button === 2 ? 'block' : 'lock';
      if (this.mouseHeld.delete(a)) this._release(a);
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      if (document.pointerLockElement === c) {
        this.mouse.dx += e.movementX; this.mouse.dy += e.movementY;
      } else if (e.buttons & 1 && (G.mode === 'play' || G.mode === 'minigame') && G.settings?.pointerLock === false) {
        this.mouse.dx += e.movementX; this.mouse.dy += e.movementY;
      }
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2 && this.device === 'pad') this.setDevice('kbm');
    });
    window.addEventListener('wheel', (e) => {
      if (G.mode !== 'play') return;
      this._press(e.deltaY > 0 ? 'next' : 'prev');
      this._release(e.deltaY > 0 ? 'next' : 'prev');
    }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && (G.mode === 'play' || G.mode === 'minigame') && !G.paused && this.device === 'kbm') {
        this._press('pause');
        this._release('pause');
      }
    });
    window.addEventListener('gamepadconnected', (e) => {
      this.padIndex = e.gamepad.index;
      this.padType = detectPad(e.gamepad.id);
      this.setDevice('pad');
      this.emitDevice();
      G.ui?.toast(`Controller connected: ${this.padType === 'ps' ? 'PlayStation' : this.padType === 'switch' ? 'Switch Pro' : 'Xbox'} layout`, 'info');
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.padIndex) {
        this.padIndex = -1;
        G.ui?.toast('Controller disconnected', 'info');
        if (G.mode === 'play' && !G.paused) { this._press('pause'); this._release('pause'); }
      }
    });
    window.addEventListener('touchstart', () => this.setDevice('touch'), { passive: true });
  }

  _press(a) {
    if (!this.held.has(a)) this.pressed.add(a);
    this.held.add(a);
  }
  _release(a) {
    if (this.held.has(a)) this.released.add(a);
    this.held.delete(a);
  }
  isPressed(a) { return this.pressed.has(a); }
  isHeld(a) { return this.held.has(a); }
  isReleased(a) { return this.released.has(a); }
  consume(a) { const h = this.pressed.has(a); this.pressed.delete(a); return h; }

  // menu navigation that works for every device
  nav() {
    const P = this.pressed;
    return {
      up: P.has('up') || P.has('upMenu'), down: P.has('down') || P.has('downMenu'),
      left: P.has('left') || P.has('leftMenu'), right: P.has('right') || P.has('rightMenu'),
      confirm: P.has('confirm'), back: P.has('back'),
    };
  }

  update(dt) {
    const S = G.settings || {};
    const sens = S.sensitivity ?? 1;
    const inv = S.invertY ? -1 : 1;
    // keyboard move
    let mx = 0, my = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) my += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) my -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    const l = Math.hypot(mx, my);
    if (l > 1) { mx /= l; my /= l; }
    this.move.x = mx; this.move.y = my;
    this.look.x = this.mouse.dx * 0.0024 * sens;
    this.look.y = this.mouse.dy * 0.0024 * sens * inv;
    this.mouse.dx = this.mouse.dy = 0;

    // touch
    if (this.touchMove.x || this.touchMove.y) { this.move.x = this.touchMove.x; this.move.y = this.touchMove.y; }
    this.look.x += this.touchLook.x * 0.0055 * sens;
    this.look.y += this.touchLook.y * 0.0055 * sens * inv;
    this.touchLook.x = this.touchLook.y = 0;
    for (const a of this.touchPressed) this._press(a);
    this.touchPressed.clear();

    // gamepad
    this.lstick.x = this.lstick.y = this.rstick.x = this.rstick.y = 0;
    this.lt = this.rt = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = this.padIndex >= 0 ? pads[this.padIndex] : null;
    if (!gp) for (const p of pads) if (p && p.connected) { gp = p; this.padIndex = p.index; this.padType = detectPad(p.id); }
    if (gp) {
      const dz = S.deadzone ?? 0.18;
      const ls = radial(gp.axes[0] || 0, gp.axes[1] || 0, dz);
      const rs = radial(gp.axes[2] || 0, gp.axes[3] || 0, dz);
      this.lstick.x = ls.x; this.lstick.y = -ls.y;
      this.rstick.x = rs.x; this.rstick.y = -rs.y;
      const bv = (i) => { const b = gp.buttons[i]; return b ? (typeof b === 'object' ? b.value || (b.pressed ? 1 : 0) : b) : 0; };
      this.lt = bv(6); this.rt = bv(7);
      let any = Math.abs(ls.x) + Math.abs(ls.y) + Math.abs(rs.x) + Math.abs(rs.y) > 0.3;
      for (let i = 0; i < gp.buttons.length; i++) {
        const down = bv(i) > 0.45;
        const was = this.padPrev[i];
        if (down) any = true;
        if (down !== was) {
          const acts = [...(PADMAP[i] || [])];
          if (i === 7) acts.push('cast');
          if (i === 6) acts.push('lock');
          if (i === 4 || i === 5) {
            // tap = cycle, hold = spell wheel
            if (down) this.padHold[i] = 0;
            else {
              if ((this.padHold[i] ?? 0) < 0.3) { this._press(i === 4 ? 'prev' : 'next'); this._release(i === 4 ? 'prev' : 'next'); }
              this._release('wheel');
              this.padHold[i] = null;
            }
          }
          for (const a of acts) down ? this._press(a) : this._release(a);
        }
        this.padPrev[i] = down;
      }
      for (const i of [4, 5]) {
        if (this.padHold[i] != null) {
          this.padHold[i] += dt;
          if (this.padHold[i] >= 0.3 && !this.held.has('wheel')) this._press('wheel');
        }
      }
      if (any) this.setDevice('pad');
      if (this.device === 'pad') {
        if (Math.abs(ls.x) > 0 || Math.abs(ls.y) > 0) { this.move.x = ls.x; this.move.y = -ls.y; }
        const ps = (S.padSensitivity ?? 1) * 3.0;
        this.look.x += rs.x * Math.abs(rs.x) * ps * dt * 1.2 + rs.x * ps * dt * 0.3;
        this.look.y += -this.rstick.y * Math.abs(rs.y) * ps * dt * 0.9 * inv;
        // stick-driven menu navigation with repeat
        this._stickNav('up', -ls.y > 0.6, dt);
        this._stickNav('down', ls.y > 0.6, dt);
        this._stickNav('left', ls.x < -0.6, dt);
        this._stickNav('right', ls.x > 0.6, dt);
      }
      this.gp = gp;
    } else this.gp = null;
  }

  _stickNav(dir, on, dt) {
    const a = dir + 'Menu';
    let r = this.navRepeat[dir];
    if (!on) { this.navRepeat[dir] = null; if (this.held.has(a)) this._release(a); return; }
    if (r == null) { this.navRepeat[dir] = 0.4; this._press(a); return; }
    r -= dt;
    if (r <= 0) { this._release(a); this._press(a); r = 0.13; }
    this.navRepeat[dir] = r;
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.swipe = null;
  }

  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    if (G.settings?.rumble === false) return;
    const gp = this.gp;
    if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
      gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }).catch(() => {});
    } else if (this.device === 'touch' && navigator.vibrate) {
      navigator.vibrate(Math.min(ms, 60));
    }
  }

  // --------------------------------------------------------------- touch UI
  buildTouch(root, spells) {
    root.innerHTML = '';
    const stick = document.createElement('div');
    stick.className = 't-stick';
    stick.innerHTML = '<div class="t-base"></div><div class="t-knob"></div>';
    root.appendChild(stick);
    const base = stick.querySelector('.t-base'), knob = stick.querySelector('.t-knob');
    let stickId = null, sx = 0, sy = 0;
    const lookZone = document.createElement('div');
    lookZone.className = 't-look';
    root.appendChild(lookZone);
    const moveZone = document.createElement('div');
    moveZone.className = 't-move';
    root.appendChild(moveZone);
    moveZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      stickId = t.identifier; sx = t.clientX; sy = t.clientY;
      stick.style.left = sx + 'px'; stick.style.top = sy + 'px';
      stick.classList.add('on');
      knob.style.transform = 'translate(-50%,-50%)';
    }, { passive: false });
    const moveStick = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId) continue;
        let dx = t.clientX - sx, dy = t.clientY - sy;
        const r = 55, d = Math.hypot(dx, dy);
        if (d > r) { dx = (dx / d) * r; dy = (dy / d) * r; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.touchMove.x = dx / r; this.touchMove.y = -dy / r;
        if (d > r * 1.05 && G.mode === 'play') this.touchHeld.add('sprint'); else this.touchHeld.delete('sprint');
        if (this.touchHeld.has('sprint')) this._press('sprint'); else this._release('sprint');
      }
    };
    const endStick = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId) continue;
        stickId = null;
        this.touchMove.x = this.touchMove.y = 0;
        stick.classList.remove('on');
        this._release('sprint');
      }
    };
    moveZone.addEventListener('touchmove', moveStick, { passive: true });
    moveZone.addEventListener('touchend', endStick);
    moveZone.addEventListener('touchcancel', endStick);
    // look + swipe-to-cast
    const looks = new Map();
    lookZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) looks.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: performance.now() });
    }, { passive: false });
    lookZone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        const l = looks.get(t.identifier);
        if (!l) continue;
        this.touchLook.x += t.clientX - l.x;
        this.touchLook.y += t.clientY - l.y;
        l.x = t.clientX; l.y = t.clientY;
      }
    }, { passive: true });
    const endLook = (e) => {
      for (const t of e.changedTouches) {
        const l = looks.get(t.identifier);
        looks.delete(t.identifier);
        if (!l) continue;
        const dx = t.clientX - l.x0, dy = t.clientY - l.y0, dtm = performance.now() - l.t0;
        const d = Math.hypot(dx, dy);
        if (d > 70 && dtm < 260) {
          // fast flick: cast toward the swipe direction, undo the look it caused
          this.touchLook.x -= dx * 0.85; this.touchLook.y -= dy * 0.85;
          this.swipe = { x: dx / d, y: -dy / d };
          this.touchPressed.add('cast');
          setTimeout(() => this._release('cast'), 60);
        } else if (d < 12 && dtm < 220 && G.mode !== 'play') {
          this.touchPressed.add('confirm');
          setTimeout(() => this._release('confirm'), 60);
        }
      }
    };
    lookZone.addEventListener('touchend', endLook);
    lookZone.addEventListener('touchcancel', endLook);

    const btn = (cls, label, action, holdable = true) => {
      const b = document.createElement('button');
      b.className = 't-btn ' + cls;
      b.innerHTML = label;
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        b.classList.add('down');
        this._press(action);
        if (!holdable) setTimeout(() => this._release(action), 50);
      }, { passive: false });
      const up = (e) => { e.preventDefault(); b.classList.remove('down'); if (holdable) this._release(action); };
      b.addEventListener('touchend', up);
      b.addEventListener('touchcancel', up);
      root.appendChild(b);
      return b;
    };
    this.tCast = btn('t-cast', '<span>✦</span>', 'cast');
    btn('t-block', '<span>🛡</span>', 'block');
    btn('t-dodge', '<span>⤳</span>', 'dodge');
    btn('t-jump', '<span>⤒</span>', 'jump');
    this.tInteract = btn('t-interact', '<span>✋</span>', 'interact', false);
    btn('t-lock', '<span>◎</span>', 'lock', false);
    btn('t-pause', '<span>❚❚</span>', 'pause', false);
    btn('t-book', '<span>📖</span>', 'book', false);
    const bar = document.createElement('div');
    bar.className = 't-spells';
    root.appendChild(bar);
    this.tSpellBar = bar;
  }
}

function radial(x, y, dz) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const k = Math.min(1, (m - dz) / (1 - dz)) / m;
  return { x: x * k, y: y * k };
}

export function detectPad(id = '') {
  if (/054c|playstation|dualsense|dualshock|wireless controller/i.test(id)) return 'ps';
  if (/057e|nintendo|pro controller|switch|joy-con/i.test(id)) return 'switch';
  return 'xbox';
}

// Button glyph HTML for an action, matching the active device.
const GLYPHS = {
  xbox: { jump: ['A', 'g-a'], confirm: ['A', 'g-a'], dodge: ['B', 'g-b'], back: ['B', 'g-b'], interact: ['X', 'g-x'], block: ['Y', 'g-y'], cast: ['RT', 'g-t'], lock: ['LT', 'g-t'], prev: ['LB', 'g-t'], next: ['RB', 'g-t'], wheel: ['LB', 'g-t'], pause: ['☰', 'g-t'], book: ['⧉', 'g-t'], sprint: ['L3', 'g-t'] },
  ps: { jump: ['✕', 'g-ps-x'], confirm: ['✕', 'g-ps-x'], dodge: ['◯', 'g-ps-o'], back: ['◯', 'g-ps-o'], interact: ['☐', 'g-ps-s'], block: ['△', 'g-ps-t'], cast: ['R2', 'g-t'], lock: ['L2', 'g-t'], prev: ['L1', 'g-t'], next: ['R1', 'g-t'], wheel: ['L1', 'g-t'], pause: ['OPT', 'g-t'], book: ['⧉', 'g-t'], sprint: ['L3', 'g-t'] },
  switch: { jump: ['B', 'g-n'], confirm: ['B', 'g-n'], dodge: ['A', 'g-n'], back: ['A', 'g-n'], interact: ['Y', 'g-n'], block: ['X', 'g-n'], cast: ['ZR', 'g-t'], lock: ['ZL', 'g-t'], prev: ['L', 'g-t'], next: ['R', 'g-t'], wheel: ['L', 'g-t'], pause: ['+', 'g-t'], book: ['−', 'g-t'], sprint: ['L3', 'g-t'] },
  kbm: { jump: ['Space', 'g-k'], confirm: ['Enter', 'g-k'], dodge: ['Shift', 'g-k'], back: ['Esc', 'g-k'], interact: ['E', 'g-k'], block: ['RMB', 'g-k'], cast: ['LMB', 'g-k'], lock: ['Tab', 'g-k'], prev: ['Z', 'g-k'], next: ['R', 'g-k'], wheel: ['C', 'g-k'], pause: ['Esc', 'g-k'], book: ['B', 'g-k'], sprint: ['Shift', 'g-k'] },
  touch: { jump: ['⤒', 'g-k'], confirm: ['Tap', 'g-k'], dodge: ['⤳', 'g-k'], back: ['✕', 'g-k'], interact: ['✋', 'g-k'], block: ['🛡', 'g-k'], cast: ['✦', 'g-k'], lock: ['◎', 'g-k'], prev: ['‹', 'g-k'], next: ['›', 'g-k'], wheel: ['✦', 'g-k'], pause: ['❚❚', 'g-k'], book: ['📖', 'g-k'], sprint: ['⇧', 'g-k'] },
};
export function glyph(action) {
  const I = G.input;
  let set = I ? I.device : 'kbm';
  const pref = G.settings?.prompts;
  if (set === 'pad') set = pref && pref !== 'auto' ? pref : I.padType;
  const g = (GLYPHS[set] || GLYPHS.kbm)[action] || [action, 'g-k'];
  return `<span class="glyph ${g[1]}">${g[0]}</span>`;
}
export function padGlyphSet() {
  const I = G.input;
  const pref = G.settings?.prompts;
  return pref && pref !== 'auto' ? pref : I?.padType || 'xbox';
}
export { GLYPHS };
