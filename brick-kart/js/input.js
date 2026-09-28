// Input devices: keyboard (one player, or split WASD / arrows for two),
// up to four gamepads (standard mapping, with rumble) and touch buttons.
const KB_FULL = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], gas: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'],
  drift: ['Space', 'ShiftRight', 'KeyK'], item: ['KeyE', 'ShiftLeft', 'KeyX', 'KeyJ', 'ControlRight'], look: ['KeyQ', 'KeyC'],
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], ok: ['Enter', 'Space', 'NumpadEnter'], back: ['Escape', 'Backspace'], pause: ['Escape', 'KeyP'],
};
const KB_A = {
  left: ['KeyA'], right: ['KeyD'], gas: ['KeyW'], brake: ['KeyS'], drift: ['Space'], item: ['KeyE', 'ShiftLeft'], look: ['KeyQ'],
  up: ['KeyW'], down: ['KeyS'], ok: ['Space', 'KeyE'], back: ['KeyQ', 'Escape'], pause: ['Escape'],
};
const KB_B = {
  left: ['ArrowLeft'], right: ['ArrowRight'], gas: ['ArrowUp'], brake: ['ArrowDown'], drift: ['ShiftRight', 'Slash'], item: ['Enter', 'Period', 'ControlRight', 'NumpadEnter'], look: ['Comma'],
  up: ['ArrowUp'], down: ['ArrowDown'], ok: ['Enter', 'NumpadEnter'], back: ['Backspace'], pause: ['KeyP'],
};
export const KB2_JOIN = ['ShiftRight', 'Slash'];

const DZ = 0.18;
function dz(v) { const a = Math.abs(v); return a < DZ ? 0 : Math.sign(v) * Math.min(1, (a - DZ) / (1 - DZ)); }

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();      // keys pressed since last poll
    this.split = false;            // two keyboard players
    this.padPrev = new Map();
    this.padNow = new Map();
    this.prevMenu = new Map();     // device -> { dir: {up,down,left,right} timers }
    this.touch = { left: false, right: false, drift: false, item: false, brake: false, gas: true, pause: false, pressed: new Set(), active: false };
    this.lastDevice = 'kb';
    this.prevTouchHeld = {};
    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      this.lastDevice = 'kb';
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    this.edge = new Set();
  }

  // call once per frame
  poll() {
    this.edge = this.pressed;
    this.pressed = new Set();
    this.padPrev = this.padNow;
    this.padNow = new Map();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = p.buttons.map((x) => (typeof x === 'object' ? x.value : x));
      const st = { b, ax: [...p.axes], pad: p };
      this.padNow.set('pad' + p.index, st);
      const prev = this.padPrev.get('pad' + p.index);
      if (prev && (b.some((v, i) => v > 0.5 && !(prev.b[i] > 0.5)) || Math.abs(dz(st.ax[0])) > 0.5 || Math.abs(dz(st.ax[1])) > 0.5)) this.lastDevice = 'pad' + p.index;
    }
    const t = this.touch;
    t.edge = t.pressed; t.pressed = new Set();
  }

  pads() { return [...this.padNow.keys()]; }
  padName(dev) { const s = this.padNow.get(dev); return s ? s.pad.id.replace(/\(.*?\)/g, '').trim().slice(0, 28) || 'Controller' : 'Controller'; }

  layout(dev) { return dev === 'kb2' ? KB_B : dev === 'kb' ? (this.split ? KB_A : KB_FULL) : null; }
  kHeld(list) { return list.some((c) => this.keys.has(c)); }
  kEdge(list) { return list.some((c) => this.edge.has(c)); }
  pHeld(st, i) { return st && st.b[i] > 0.5; }
  pEdge(dev, i) { const n = this.padNow.get(dev), p = this.padPrev.get(dev); return n && n.b[i] > 0.5 && !(p && p.b[i] > 0.5); }

  // Race controls for a device
  race(dev, autoGas = false) {
    const c = { throttle: 0, brake: 0, steer: 0, drift: false, driftPressed: false, item: false, itemPressed: false, back: false, aimFwd: false, look: false, pause: false };
    if (dev === 'kb' || dev === 'kb2') {
      const L = this.layout(dev);
      c.steer = (this.kHeld(L.right) ? 1 : 0) - (this.kHeld(L.left) ? 1 : 0);
      c.throttle = this.kHeld(L.gas) || autoGas ? 1 : 0;
      c.brake = this.kHeld(L.brake) ? 1 : 0;
      c.drift = this.kHeld(L.drift); c.driftPressed = this.kEdge(L.drift);
      c.itemPressed = this.kEdge(L.item);
      c.back = c.brake > 0;
      c.aimFwd = false;
      c.look = this.kHeld(L.look);
      c.pause = this.kEdge(L.pause);
    } else if (dev === 'touch') {
      const t = this.touch;
      c.steer = (t.right ? 1 : 0) - (t.left ? 1 : 0);
      c.brake = t.brake ? 1 : 0;
      c.throttle = c.brake ? 0 : 1;
      c.drift = t.drift; c.driftPressed = t.edge.has('drift');
      c.itemPressed = t.edge.has('item');
      c.pause = t.edge.has('pause');
    } else {
      const s = this.padNow.get(dev);
      if (s) {
        const ax = dz(s.ax[0] || 0), ay = dz(s.ax[1] || 0);
        let st = Math.sign(ax) * Math.pow(Math.abs(ax), 1.3);
        if (this.pHeld(s, 14)) st = -1; if (this.pHeld(s, 15)) st = 1;
        c.steer = st;
        c.throttle = Math.max(s.b[0] || 0, s.b[7] || 0, autoGas ? 1 : 0);
        c.brake = Math.max(s.b[1] || 0, s.b[6] || 0);
        if (c.brake > 0.3) c.throttle = Math.min(c.throttle, autoGas ? 0 : c.throttle);
        c.drift = this.pHeld(s, 5); c.driftPressed = this.pEdge(dev, 5);
        c.itemPressed = this.pEdge(dev, 4) || this.pEdge(dev, 3) || this.pEdge(dev, 2);
        c.back = ay > 0.5 || c.brake > 0.5;
        c.aimFwd = ay < -0.5 || this.pHeld(s, 12);
        c.look = this.pHeld(s, 10) || this.pHeld(s, 11);
        c.pause = this.pEdge(dev, 9);
      }
    }
    return c;
  }

  // Menu navigation for a device (edge-triggered with auto-repeat on directions)
  menu(dev, dt = 1 / 60) {
    const m = { up: false, down: false, left: false, right: false, ok: false, back: false, start: false, x: false };
    let held = { up: false, down: false, left: false, right: false };
    if (dev === 'kb' || dev === 'kb2') {
      const L = this.layout(dev);
      held = { up: this.kHeld(L.up) || this.kEdge(L.up), down: this.kHeld(L.down) || this.kEdge(L.down), left: this.kHeld(L.left) || this.kEdge(L.left), right: this.kHeld(L.right) || this.kEdge(L.right) };
      m.ok = this.kEdge(L.ok); m.back = this.kEdge(L.back);
      m.start = this.kEdge(['Enter', 'NumpadEnter']) && dev !== 'kb2' ? true : dev === 'kb2' && this.kEdge(['Enter']);
      m.x = this.kEdge(['Tab']);
    } else if (dev.startsWith('pad')) {
      const s = this.padNow.get(dev);
      if (!s) return m;
      const ax = s.ax[0] || 0, ay = s.ax[1] || 0;
      held = { up: ay < -0.5 || this.pHeld(s, 12), down: ay > 0.5 || this.pHeld(s, 13), left: ax < -0.5 || this.pHeld(s, 14), right: ax > 0.5 || this.pHeld(s, 15) };
      m.ok = this.pEdge(dev, 0); m.back = this.pEdge(dev, 1); m.start = this.pEdge(dev, 9); m.x = this.pEdge(dev, 2) || this.pEdge(dev, 3);
    }
    let st = this.prevMenu.get(dev);
    if (!st) { st = { up: 0, down: 0, left: 0, right: 0 }; this.prevMenu.set(dev, st); }
    const tapped = (dev === 'kb' || dev === 'kb2') ? { up: this.kEdge(this.layout(dev).up), down: this.kEdge(this.layout(dev).down), left: this.kEdge(this.layout(dev).left), right: this.kEdge(this.layout(dev).right) } : {};
    for (const d of ['up', 'down', 'left', 'right']) {
      if (tapped[d] && st[d] !== 0) { m[d] = true; st[d] = 0.38; continue; }
      if (held[d]) {
        if (st[d] === 0) { m[d] = true; st[d] = 0.38; }
        else { st[d] -= dt; if (st[d] <= 0) { m[d] = true; st[d] = 0.11; } }
      } else st[d] = 0;
    }
    return m;
  }

  // All devices that can navigate menus
  menuDevices() { return ['kb', ...(this.split ? ['kb2'] : []), ...this.pads()]; }

  rumble(dev, strength = 0.6, ms = 200) {
    const s = this.padNow.get(dev);
    const act = s?.pad?.vibrationActuator;
    if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength * 0.7) }).catch(() => {});
    else if (dev === 'touch' && navigator.vibrate) navigator.vibrate(Math.min(ms, 120));
  }

  // --- touch overlay -----------------------------------------------------------------
  buildTouch(root) {
    this.touchRoot = root;
    root.innerHTML = `
      <div class="tpad left"><button data-k="left" aria-label="Steer left">◀</button><button data-k="right" aria-label="Steer right">▶</button></div>
      <div class="tpad right"><button data-k="item" class="t-item" aria-label="Use item">ITEM</button><button data-k="drift" class="t-drift" aria-label="Drift / hop">DRIFT</button><button data-k="brake" class="t-brake" aria-label="Brake">BRAKE</button></div>
      <button data-k="pause" class="t-pause" aria-label="Pause">II</button>`;
    const t = this.touch;
    const owners = new Map();
    const set = (k, v) => { if (v && !t[k]) t.pressed.add(k); t[k] = v; };
    root.querySelectorAll('button').forEach((btn) => {
      const k = btn.dataset.k;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); owners.set(e.pointerId, k); set(k, true); btn.classList.add('on'); this.lastDevice = 'touch'; t.active = true; });
      const up = (e) => { owners.delete(e.pointerId); if (![...owners.values()].includes(k)) { set(k, false); btn.classList.remove('on'); } };
      btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }
}

export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
