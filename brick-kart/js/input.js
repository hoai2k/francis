// Input devices: keyboard (one player, or split WASD / arrows for two),
// up to four gamepads (standard mapping, with rumble) and touch buttons.
const KB_FULL = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], gas: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'],
  drift: ['Space', 'ShiftRight', 'KeyK'], item: ['KeyE', 'ShiftLeft', 'KeyX', 'KeyJ', 'ControlRight'], itemFwd: ['KeyR', 'KeyL'], look: ['KeyQ', 'KeyC'],
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], ok: ['Enter', 'Space', 'NumpadEnter'], back: ['Escape', 'Backspace'], pause: ['Escape', 'KeyP'],
};
const KB_A = {
  left: ['KeyA'], right: ['KeyD'], gas: ['KeyW'], brake: ['KeyS'], drift: ['Space'], item: ['KeyE', 'ShiftLeft'], itemFwd: ['KeyR'], look: ['KeyQ'],
  up: ['KeyW'], down: ['KeyS'], ok: ['Space', 'KeyE'], back: ['KeyQ', 'Escape'], pause: ['Escape'],
};
const KB_B = {
  left: ['ArrowLeft'], right: ['ArrowRight'], gas: ['ArrowUp'], brake: ['ArrowDown'], drift: ['ShiftRight', 'Slash'], item: ['Enter', 'Period', 'ControlRight', 'NumpadEnter'], itemFwd: ['Quote'], look: ['Comma'],
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
    this.touch = { drift: false, item: false, itemAim: 0, brake: false, gas: true, pause: false, pressed: new Set(), active: false, drag: null };
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
    this.used = new Set();         // edge-triggered race controls already handed out this frame
  }

  // call once per frame
  poll() {
    this.used.clear();
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
      // the item key fires its usual way (hold brake to fire or drop it behind); the throw key
      // throws it forward (traps, Boom Bricks)
      const fwd = this.kEdge(L.itemFwd);
      c.itemPressed = this.kEdge(L.item) || fwd;
      c.back = c.brake > 0 && !fwd;
      c.aimFwd = fwd;
      c.look = this.kHeld(L.look);
      c.pause = this.kEdge(L.pause);
    } else if (dev === 'touch') {
      const t = this.touch;
      c.steer = t.drag ? t.drag.axis : 0;
      c.brake = t.brake ? 1 : 0;
      c.throttle = c.brake ? 0 : 1;
      c.drift = t.drift; c.driftPressed = t.edge.has('drift');
      // ITEM: a tap fires it the usual way, a flick up throws it forward, a flick down fires or drops it
      // behind (so does a tap while dragging down to brake)
      c.itemPressed = t.edge.has('item');
      c.aimFwd = c.itemPressed && t.itemAim < 0;
      c.back = c.itemPressed ? t.itemAim > 0 || (!t.itemAim && c.brake > 0) : c.brake > 0;
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
    // a press counts once per frame: a slow frame steps the race twice with the same input, which
    // used to fire a Triple item twice (or hop twice) for one press
    if (c.itemPressed && this.used.has(dev + ':i')) c.itemPressed = false; else if (c.itemPressed) this.used.add(dev + ':i');
    if (c.driftPressed && this.used.has(dev + ':d')) c.driftPressed = false; else if (c.driftPressed) this.used.add(dev + ':d');
    if (c.pause && this.used.has(dev + ':p')) c.pause = false; else if (c.pause) this.used.add(dev + ':p');
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
      // (with a 2nd keyboard player, Enter is theirs: it isn't also player 1's Start)
      m.start = dev === 'kb2' ? this.kEdge(['Enter']) : !this.split && this.kEdge(['Enter', 'NumpadEnter']);
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
  // No steering buttons: drag a finger left/right anywhere on the screen (it steers relative to
  // where it touched down, and the anchor follows past full lock so reversing is instant). Drag
  // that finger well down to brake (and reverse); touch anywhere with a second finger to drift
  // (or hop, or do a trick in the air). One button: ITEM, which shows the item you hold (the HUD
  // moves its item slots into it) and is greyed out while you have none.
  buildTouch(root) {
    this.touchRoot = root;
    root.innerHTML = `
      <div class="tzone"></div>
      <button data-k="item" class="t-item empty" aria-label="Use item"><span class="t-lbl">ITEM</span></button>
      <button data-k="pause" class="t-pause" aria-label="Pause">II</button>`;
    const t = this.touch;
    const owners = new Map();
    const set = (k, v) => { if (v && !t[k]) t.pressed.add(k); t[k] = v; };
    // ITEM waits for the finger to say which way: it fires on a flick up (forward) or down (behind), on
    // release (a tap), or after a short hold without a flick
    const FLICK = 22, HOLD = 0.18;
    let aiming = null;   // { id, y0, timer }
    const fireItem = (aim) => {
      if (!aiming) return;
      clearTimeout(aiming.timer); aiming = null;
      t.itemAim = aim; t.pressed.add('item');
    };
    root.querySelectorAll('button').forEach((btn) => {
      const k = btn.dataset.k;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); btn.setPointerCapture?.(e.pointerId); owners.set(e.pointerId, k); btn.classList.add('on'); this.lastDevice = 'touch'; t.active = true;
        if (k !== 'item') { set(k, true); return; }
        if (aiming) fireItem(0);
        t.item = true;
        aiming = { id: e.pointerId, y0: e.clientY, timer: setTimeout(() => fireItem(0), HOLD * 1000) };
      });
      if (k === 'item') {
        btn.addEventListener('pointermove', (e) => {
          if (!aiming || aiming.id !== e.pointerId) return;
          const dy = e.clientY - aiming.y0;
          if (Math.abs(dy) > FLICK) fireItem(Math.sign(dy));
        });
      }
      const up = (e) => {
        if (k === 'item' && aiming && aiming.id === e.pointerId) fireItem(0);
        owners.delete(e.pointerId); if (![...owners.values()].includes(k)) { set(k, false); btn.classList.remove('on'); }
      };
      btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    // the steering finger, plus any extra fingers (held = drift)
    const zone = root.querySelector('.tzone');
    const R = () => Math.max(46, Math.min(90, innerWidth * 0.12));    // sideways drag for full lock
    const B = () => Math.max(60, Math.min(120, innerHeight * 0.16));  // downward drag that brakes
    const extra = new Set();
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.lastDevice = 'touch'; t.active = true;
      zone.setPointerCapture?.(e.pointerId);
      if (!t.drag) { t.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: 0 }; return; }
      extra.add(e.pointerId); set('drift', true);
    });
    zone.addEventListener('pointermove', (e) => {
      const d = t.drag;
      if (!d || d.id !== e.pointerId) return;
      const r = R(), dx = e.clientX - d.x0;
      if (Math.abs(dx) > r) d.x0 = e.clientX - Math.sign(dx) * r;   // anchor follows past full lock
      const v = (e.clientX - d.x0) / r;
      d.axis = Math.abs(v) < 0.06 ? 0 : v;
      // brake: the finger well below where it went down (the anchor follows it back up)
      if (e.clientY < d.y0) d.y0 = e.clientY;
      const dy = e.clientY - d.y0, b = B();
      if (!t.brake && dy > b) set('brake', true);
      else if (t.brake && dy < b * 0.5) set('brake', false);
    });
    const end = (e) => {
      if (t.drag && t.drag.id === e.pointerId) { t.drag = null; set('brake', false); }
      if (extra.delete(e.pointerId) && !extra.size) set('drift', false);
    };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
    zone.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
