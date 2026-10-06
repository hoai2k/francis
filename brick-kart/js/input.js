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
    this.touch = { drift: false, item: false, brake: false, gas: true, pause: false, pressed: new Set(), active: false, drag: null, tilt: 0 };
    // touch steering: 'both' (tilt, and dragging overrides it while a finger is down), 'drag' or 'tilt'
    // (main.js sets it; drag-only while tilt steering is switched off)
    this.steerMode = 'drag';
    this.tiltOn = false; this.tiltPerm = false;
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
      c.steer = t.drag ? t.drag.axis : this.steerMode !== 'drag' ? t.tilt : 0;
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
    root.querySelectorAll('button').forEach((btn) => {
      const k = btn.dataset.k;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); owners.set(e.pointerId, k); set(k, true); btn.classList.add('on'); this.lastDevice = 'touch'; t.active = true; });
      const up = (e) => { owners.delete(e.pointerId); if (![...owners.values()].includes(k)) { set(k, false); btn.classList.remove('on'); } };
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
      if (!t.drag && this.steerMode !== 'tilt') { t.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: 0 }; return; }
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
    // letting go hands steering back to the tilt (if on), re-centred on how the phone is held now
    const end = (e) => {
      if (t.drag && t.drag.id === e.pointerId) { t.drag = null; set('brake', false); this.recentreTilt(); }
      if (extra.delete(e.pointerId) && !extra.size) set('drift', false);
    };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
    zone.addEventListener('contextmenu', (e) => e.preventDefault());
    // iOS only allows motion sensors after a tap: ask on the first one
    const ask = () => { if (this.steerMode !== 'drag') this.enableTilt(); };
    addEventListener('click', ask); addEventListener('touchend', ask);
  }

  // Tilt steering. Two styles, like mobile racers offer:
  //  'wheel': rotate the phone like a steering wheel (Asphalt, F1 Mobile, Mario Kart Tour's gyro
  //           handling). At calibration the direction of gravity within the screen's plane is
  //           "down" for however the phone is held (portrait, either landscape); the wheel angle is
  //           how far gravity has turned from there. That needs neither the screen-orientation API
  //           (unreliable across browsers) nor gravity's sign (iOS and Android disagree), which made
  //           tilt reversed on some phones.
  //  'turn':  turn the phone left/right as if pointing it. Read from the gyroscope (rotation
  //           around the vertical), integrated into an angle that slowly re-centres.
  // Either way the grip at calibration (each race's GO, and whenever a drag-steer finger lifts) is
  // straight ahead. tiltCfg.full is the angle for full lock; there's a dead zone, a gentle curve
  // so small tilts make small corrections, and smoothing against hand shake. tiltCfg.invert flips
  // it if someone prefers it the other way. While a finger is drag-steering, tilt is ignored.
  enableTilt() {
    if (this.tiltOn) return;
    const start = () => {
      if (this.tiltOn) return;
      this.tiltOn = true;
      const g = this.grav = { x: 0, y: 0, z: 0, n: 0 };
      this.yaw = 0; this._lastMotion = 0;
      addEventListener('devicemotion', (e) => {
        const a = e.accelerationIncludingGravity;
        if (!a || a.x == null) return;
        const k = g.n ? 0.3 : 1;
        g.x += (a.x - g.x) * k; g.y += (a.y - g.y) * k; g.z += ((a.z ?? 0) - g.z) * k; g.n++;
        const now = performance.now(), dt = this._lastMotion ? Math.min(0.1, (now - this._lastMotion) / 1000) : 0;
        this._lastMotion = now;
        // gyroscope: rotation rate (deg/s) around the vertical, in the "up" sign convention
        const r = e.rotationRate;
        if (r && r.alpha != null && this.tiltSign) {
          const L = Math.hypot(g.x, g.y, g.z) || 1, sg = this.tiltSign;
          const rate = ((r.beta || 0) * g.x + (r.gamma || 0) * g.y + (r.alpha || 0) * g.z) * sg / L;
          this.yaw = (this.yaw + rate * dt) * Math.exp(-0.15 * dt);   // slow re-centre against drift
        }
        if (!this.tiltSign) this.calibrateTilt();
        this.updateTilt(dt || 1 / 60);
      });
      addEventListener('orientationchange', () => setTimeout(() => this.calibrateTilt(), 400));
    };
    const DM = window.DeviceMotionEvent;
    if (DM && typeof DM.requestPermission === 'function') {
      if (this.tiltPerm) return;
      this.tiltPerm = true;
      DM.requestPermission().then((r) => { if (r === 'granted') start(); }).catch(() => { this.tiltPerm = false; });
    } else if (DM) start();
  }
  // gravity's component along the screen's left-right axis (device axes: x right, y up in portrait)
  screenX(g) {
    const ang = ((screen.orientation?.angle ?? window.orientation ?? 0) + 360) % 360;
    return ang === 90 ? -g.y : ang === 270 ? g.y : ang === 180 ? -g.x : g.x;
  }
  screenY(g) {
    const ang = ((screen.orientation?.angle ?? window.orientation ?? 0) + 360) % 360;
    return ang === 90 ? g.x : ang === 270 ? -g.x : ang === 180 ? -g.y : g.y;
  }
  // wheel angle in degrees (+ = turned right) for the current gravity reading: the turn of
  // gravity's direction within the screen plane since calibration. Clockwise as you look at the
  // screen = right. Flipping gravity's sign flips both readings, so the angle doesn't care which
  // convention the browser uses.
  wheelAngle() {
    const g = this.grav, a = this.axis0;
    if (!a) return 0;
    const along = g.x * a.x + g.y * a.y, across = g.x * a.y - g.y * a.x;
    if (Math.hypot(along, across) < 1.2) return this._lastWheel ?? 0;   // phone flat: hold the last angle
    return (this._lastWheel = -Math.atan2(across, along) * 180 / Math.PI);
  }
  // the current grip becomes "straight ahead" (called at the start of each race too)
  calibrateTilt() {
    const g = this.grav;
    if (!g || !g.n) return;
    // browsers disagree on gravity's sign (iOS reports it the other way to Android). In any
    // normal grip the screen faces up / towards you: use that to put readings in one convention
    // (the "up" vector, Android's)
    const zs = Math.abs(g.z) > 3 ? Math.sign(g.z) : Math.sign(this.screenY(g)) || 1;
    this.tiltSign = zs;
    // the wheel's reference: gravity's direction within the screen plane right now (or, if the
    // phone is nearly flat, the screen's own "down" from the orientation API)
    const h = Math.hypot(g.x, g.y);
    if (h > 2.5) this.axis0 = { x: g.x / h, y: g.y / h };
    else {
      const ang = ((screen.orientation?.angle ?? window.orientation ?? 0) + 360) % 360;
      const dn = ang === 90 ? { x: -1, y: 0 } : ang === 270 ? { x: 1, y: 0 } : ang === 180 ? { x: 0, y: 1 } : { x: 0, y: -1 };   // screen-down in device axes ("up" convention); -zs turns it into the raw reading for screen-up
      this.axis0 = { x: dn.x * -zs, y: dn.y * -zs };
    }
    this._lastWheel = 0;
    this.wheel0 = 0;
    this.yaw = 0;
    this.touch.tilt = 0;
  }
  // re-centre on the current grip (after a drag-steer finger lifts)
  recentreTilt() { if (this.tiltOn && this.grav?.n && this.steerMode !== 'drag') this.calibrateTilt(); }
  updateTilt(dt = 1 / 60) {
    const t = this.touch, c = this.tiltCfg || {};
    if (!this.tiltSign) { t.tilt = 0; return; }
    // a finger drag-steering owns the steering: tilt is ignored until it lifts (then re-centres)
    if (t.drag) { t.tilt = 0; return; }
    const deg = c.style === 'turn' ? -this.yaw : this.wheelAngle() - this.wheel0;
    const full = c.full || 32, dead = Math.min(6, full * 0.18);
    let v = Math.abs(deg) < dead ? 0 : Math.min(1, (Math.abs(deg) - dead) / (full - dead));
    v = Math.sign(deg) * Math.pow(v, 1.5);   // gentle near the centre, full lock still reachable
    if (c.invert) v = -v;
    // smooth out hand shake (about a 0.08 s lag)
    t.tilt += (v - t.tilt) * Math.min(1, dt * 12);
  }
}

export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
