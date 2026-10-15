// Brick Kart: game shell. Renderer, menus, player join/character select,
// track select, options, Grand Prix / Quick Race / Time Trial flow,
// results, standings and the podium.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Input, KB2_JOIN, isTouchDevice } from './input.js';
import { Audio } from './audio.js';
import { Race } from './race.js';
import { TRACKS, CUPS } from './tracks.js';
import { CHARACTERS, bodyName } from './characters.js';
import { DRIVERS, UNIVERSES, combinedStats } from './driver.js';
import { KARTS } from './vehicles.js';
import { simpleDriver, simpleKart, simpleGlider } from './simplified.js';
import { GLIDERS, GLIDER_GROUPS, gliderIndex } from './gliders.js';
import { ABILITY } from './abilities.js';
import { Showcase, driverPortrait } from './showcase.js';
import { ICONS, ITEMS } from './items.js';
import { setDetail } from './decor.js';
import { createChrome, requestFullscreen, exitFullscreen, fullscreenElement, canFullscreen, standalone } from './chrome.js';
import { fmt } from './hud.js';

// arrows: chevrons drawn as SVG (◀ ▶ text gets turned into emoji boxes on iOS; text arrows carry U+FE0E)
const chev = (d) => `<svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHEV_L = chev('M15 4 7 12l8 8'), CHEV_R = chev('M9 4l8 8-8 8');
const GLIDER_GROUP_NAMES = Object.fromEntries(GLIDER_GROUPS.map((g) => [g.id, g]));
const PCOL = ['#ff4a3a', '#3b8bff', '#3bdc5a', '#ffc93b', '#c45aff', '#ff8a1a', '#2fd6d0', '#ff6ab4'];
const MAX_PLAYERS = 8;
const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0];
const CC = { 50: 0.8, 100: 0.92, 150: 1.06, 200: 1.22 };
const SKEY = 'brickkart.settings.v1', TKEY = 'brickkart.tt.v1', PKEY = 'brickkart.picks.v1';
const MOBILE = isTouchDevice() && Math.min(screen.width, screen.height) < 820;
// a phone (not a tablet): too small to share, so the select screen and races are single-player
const isPhone = () => isTouchDevice() && Math.min(screen.width, screen.height) < 600;
// Online play (js/online/): on unless ONLINE_ENABLED is false or the address has ?online=0 (?online=1
// forces it on). Its code is only loaded when someone opens Online; off, the menu item isn't there.
// Tilt (accelerometer) steering doesn't feel right yet: touch steering is drag-only and the tilt
// options are hidden until it does. Flip this to bring them back.
const TILT_ENABLED = false;
const ONLINE_ENABLED = true;
const ONLINE = (() => { const v = new URLSearchParams(location.search).get('online'); return v === null ? ONLINE_ENABLED : v !== '0'; })();
// the online room this browser was in during the last 10 minutes, if any ({ title, t }): the main
// menu offers to rejoin it (js/online/identity.js writes these; read here so nothing online loads)
function recentOnlineRoom() {
  let best = null;
  try {
    for (let n = 0; n < 8; n++) {
      const r = JSON.parse(localStorage.getItem(`brickkart.online.room.${n}`) || 'null');
      if (r && Number.isFinite(r.t) && Date.now() - r.t < 600000 && (!best || r.t > best.t)) best = { title: String(r.title || '').slice(0, 40), t: r.t };
    }
  } catch { /* storage blocked */ }
  return best;
}
// developer / automated-test flag: ?norender runs everything but skips drawing the 3D views (headless
// software rendering is far too slow to drive several online players at once)
const NO_RENDER = new URLSearchParams(location.search).has('norender');
if (NO_RENDER) window.__bkNoRender = true;

function load(key, def) { try { return { ...def, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { ...def }; } }
function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ORD = (n) => n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

class Game {
  constructor() {
    this.settings = load(SKEY, { cc: 100, difficulty: 'normal', laps: 3, music: 0.5, sfx: 0.8, autoGas: false, simple: false, touchSteer: 'both', tiltStyle: 'wheel', tiltSens: 'med', tiltInvert: false, lego: true, quality: MOBILE ? 'low' : 'high' });
    // at most 12 karts per race (players included)
    if ('racers' in this.settings) { delete this.settings.racers; save(SKEY, this.settings); }   // races always have 12 karts
    // characters are always on now: drop the old toggle
    // tilt steering was reworked (it read reversed on some phones): drop an old "Invert tilt"
    // workaround once so the new default is right
    if (!this.settings.tiltV2) { this.settings.tiltInvert = false; this.settings.tiltV2 = true; save(SKEY, this.settings); }
    if ('useChars' in this.settings || 'charsDefault' in this.settings) { delete this.settings.useChars; delete this.settings.charsDefault; save(SKEY, this.settings); }
    this.best = load(TKEY, {});
    // each player slot's last picks, by id: { chars: { 0: { driver, kart } } }
    this.picks = load(PKEY, { chars: {} });
    const app = document.getElementById('app');
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    app.appendChild(r.domElement);
    this.applyQuality();
    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.input = new Input();
    this.audio = new Audio();
    this.audio.setVolumes(this.settings.music, this.settings.sfx);
    this.ui = document.getElementById('ui');
    this.hudRoot = document.getElementById('hud');
    this.flashEl = document.getElementById('flash');
    this.applyTilt();
    this.touchRoot = document.getElementById('touch');
    this.input.buildTouch(this.touchRoot);
    this.menuEvents = [];
    this.players = [];
    this.race = null; this.attract = null;
    this.paused = false;
    addEventListener('resize', () => this.resize());
    this.resize();
    // browser bars: fullscreen on the first tap in landscape where possible; on iPhone Safari a
    // swipe up in the menus tucks the bars away (see chrome.js)
    this.chrome = createChrome({ touch: isTouchDevice(), isPlaying: () => !!this.race && this.race.mode !== 'attract' && !this.paused, hintEl: document.getElementById('bars-hint') });
    // phones and tablets (as in mini/widowsbay): turning the device mid-race pauses it, and the tap
    // on Resume then goes fullscreen in landscape (fullscreen needs a tap; the turn alone can't)
    if (isTouchDevice()) {
      let wasLandscape = innerWidth > innerHeight;
      const turned = () => {
        const l = innerWidth > innerHeight;
        if (l === wasLandscape) return;
        wasLandscape = l;
        if (this.race && this.race.mode !== 'attract' && !this.paused && !this.screen) this.pause();
      };
      addEventListener('resize', turned);
      addEventListener('orientationchange', () => setTimeout(turned, 150));
      screen.orientation?.addEventListener?.('change', () => setTimeout(turned, 150));
    }
    const unlock = (e) => {
      this.audio.unlock();
      // pressing Start/Enter/tap on the title screen goes fullscreen (needs a real key press or tap)
      if (this.onTitle && (e.type === 'pointerdown' || ['Enter', 'Space', 'NumpadEnter'].includes(e.code))) this.enterFullscreen();
    };
    addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
    addEventListener('blur', () => this.audio.setMuted(true));
    addEventListener('focus', () => this.audio.setMuted(document.hidden));
    document.addEventListener('visibilitychange', () => this.audio.setMuted(document.hidden || !document.hasFocus()));
    addEventListener('gamepadconnected', (e) => { this.toast(`🎮 Controller ${e.gamepad.index + 1} connected`); });
    addEventListener('gamepaddisconnected', (e) => { this.toast(`Controller ${e.gamepad.index + 1} disconnected`); });
    this.ui.addEventListener('click', (e) => this.onClick(e));
    this.ui.addEventListener('mouseover', (e) => { const b = e.target.closest('[data-i]'); if (b && this.screen?.hover) this.screen.hover(+b.dataset.i); });
    const q = new URLSearchParams(location.search);
    if (q.get('gallery') || q.get('garage') || (q.get('glider') && !q.get('quick'))) {
      // developer view of the movie-character drivers
      import('./gallery.js').then(({ Gallery }) => { this.attract = new Gallery(this, q); });
    } else if (q.get('quick')) {
      // developer shortcut: ?quick=<trackId>&players=<n>&device=touch; &driver=<id> / &kart=<id> pick player 1's
      const np = +(q.get('players') || 1);
      const d0 = Math.max(0, DRIVERS.findIndex((d) => d.id === q.get('driver')));
      const k0 = Math.max(0, KARTS.findIndex((k) => k.id === q.get('kart')));
      const g0 = gliderIndex(q.get('glider'));
      this.players = Array.from({ length: np }, (_, i) => this.makePlayer({ id: i, device: i === 0 ? (q.get('device') === 'touch' ? 'touch' : 'kb') : 'pad' + (i - 1), cursor: 0, driver: (d0 + i) % Math.max(1, DRIVERS.length), kart: k0, glider: g0, color: PCOL[i] }));
      this.startRace({ def: TRACKS.find((t) => t.id === q.get('quick')) || TRACKS[0], mode: q.get('mode') || 'race' });
    } else {
      // show the title right away; build the background race just after it has painted
      this.showTitle();
      setTimeout(() => { if (!this.race && !this.attract) this.startAttract(); }, 60);
    }
    document.getElementById('loading').classList.add('hidden');
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // Player 1 is always there: a connected controller if there is one (the one that drove the
  // menus, else the first), otherwise the keyboard or touch.
  p1Device() {
    const pads = this.input.pads();
    if (pads.includes(this.lastDevice)) return this.lastDevice;
    if (pads.length) return pads[0];
    return this.lastDevice === 'kb' || !isTouchDevice() ? 'kb' : 'touch';
  }

  applyQuality() {
    const hi = this.settings.quality === 'high';
    this.basePR = Math.min(devicePixelRatio, hi ? 2 : 1);
    this.resScale ??= 1;
    this.renderer.setPixelRatio(this.basePR * this.resScale);
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.shadowSize = hi ? 2048 : 1024;
    this.resize();
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
  }
  // Adaptive resolution: when frames run slow during a race (usually a big or high-DPI
  // screen), render at a lower pixel ratio; creep back up once there's headroom again.
  adaptResolution(frameMs) {
    if (!(frameMs > 0) || frameMs > 250) return;           // ignore pauses / tab switches
    const a = (this.perf ||= { ema: 16.7, t: 0, good: 0 });
    a.ema += (frameMs - a.ema) * 0.05;
    a.t += frameMs;
    if (a.t < 2000) return;
    a.t = 0;
    const minScale = Math.max(0.5, 0.6 / this.basePR);
    let next = this.resScale;
    if (a.ema > 22 && this.resScale > minScale) { next = Math.max(minScale, this.resScale * 0.85); a.good = 0; }
    else if (a.ema < 18) { if (++a.good >= 3 && this.resScale < 1) { next = Math.min(1, this.resScale * 1.1); a.good = 0; } }
    else a.good = 0;
    if (next !== this.resScale) { this.resScale = next; this.renderer.setPixelRatio(this.basePR * next); this.resize(); }
  }
  toast(text) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---- track thumbnails ------------------------------------------------------------
  get thumbs() { return (this._thumbs ||= TRACKS.map((t) => this.trackThumb(t))); }
  trackThumb(def) {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 180;
    const g = c.getContext('2d');
    const th = def.theme;
    const gr = g.createLinearGradient(0, 0, 0, 180);
    gr.addColorStop(0, hex(th.sky[0])); gr.addColorStop(1, hex(th.sky[1]));
    g.fillStyle = gr; g.fillRect(0, 0, 320, 180);
    // ground dots like studs
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 8; x < 320; x += 16) for (let y = 8; y < 180; y += 16) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    const curve = new THREE.CatmullRomCurve3(def.points.map(([x, z, y = 0]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
    const pts = curve.getPoints(300);   // uniform in t: plenty for a thumbnail and far cheaper than arc-length spacing
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const s = Math.min(280 / (maxX - minX), 150 / (maxZ - minZ));
    const ox = 160 - (minX + maxX) / 2 * s, oz = 90 - (minZ + maxZ) / 2 * s;
    const draw = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = g.lineCap = 'round'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x * s + ox, p.z * s + oz) : g.moveTo(p.x * s + ox, p.z * s + oz))); g.stroke(); };
    draw(14, 'rgba(0,0,0,0.45)');
    if (th.road?.base === '#ffffff') {
      const cols = ['#ff3a3a', '#ffa020', '#ffe03a', '#4ad04a', '#3ab0ff', '#9a5aff'];
      cols.forEach((cc, k) => draw(9 - k * 1.3, cc));
    } else { draw(9, th.road?.base || '#666'); draw(1.5, 'rgba(255,255,255,0.6)'); }
    return c.toDataURL();
  }

  // ---- loop ---------------------------------------------------------------------
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    // After a long blocking task the frame timestamp can be OLDER than the last one we saw,
    // so dt can come out negative (or NaN): clamp it to [0, 0.05] so time never runs backwards.
    const frameMs = now - this.last;
    if (this.race && !this.paused) this.adaptResolution(frameMs);
    let dt = (now - this.last) / 1000;
    if (!(dt > 0)) dt = 0; else if (dt > 0.05) dt = 0.05;
    if (now > this.last || !Number.isFinite(this.last)) this.last = now;
    this.input.poll();
    const devs = this.input.menuDevices();
    this.menuEvents = devs.map((d) => [d, this.input.menu(d, dt)]);
    // remember which device is driving the menus: it becomes player 1 on the select screen
    for (const [d, m] of this.menuEvents) if (m.ok || m.start || m.back || m.up || m.down || m.left || m.right) this.lastDevice = d;
    if (this.menuEvents.some(([, m]) => m.ok || m.start)) this.audio.unlock();
    this.screen?.update?.(dt);
    // online play (loaded only once the player opens Online): connection upkeep between frames
    if (this.online) { try { this.online.tick(dt); } catch (e) { console.error('online', e); } }
    const race = this.race || this.attract;
    if (race && !this.paused && dt > 0) {
      const steps = dt > 1 / 45 ? 2 : 1;
      for (let i = 0; i < steps; i++) race.update(dt / steps);
    }
    if (race && !window.__bkNoRender) race.render(this.renderer);
  }

  startAttract() {
    this.attract?.dispose();
    const def = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    // the demo race shows off the whole roster: random drivers in random karts
    this.attract = new Race(this, { def, mode: 'attract', cc: 0.95, difficulty: 'hard', laps: 99, racers: 12 });
    this.attract.world.sun.shadow.mapSize.set(this.shadowSize, this.shadowSize);
    this.attract.warmup(this.renderer);
  }

  // ---- screen helpers -----------------------------------------------------------------
  setScreen(html, screen) {
    this.cleanup?.(); this.cleanup = null;
    this.ui.innerHTML = html;
    this.ui.classList.remove('hidden');
    this.screen = screen || null;
  }
  clearScreen() { this.cleanup?.(); this.cleanup = null; this.ui.innerHTML = ''; this.screen = null; }
  onClick(e) {
    // a tap on the dimmed backdrop around a popup menu (Options, How to Play, Pause…) closes it
    if (this.screen?.dismiss && e.target === this.ui.querySelector('.screen')) { this.audio.unlock(); this.audio.sfx('back'); this.screen.dismiss(); return; }
    const el = e.target.closest('[data-i], [data-act]');
    if (!el || !this.screen) return;
    this.audio.unlock();
    if (el.dataset.act && this.screen.act) { this.screen.act(el.dataset.act, el); return; }
    if (el.dataset.i !== undefined && this.screen.click) this.screen.click(+el.dataset.i, e);
  }

  // generic vertical menu
  // dismissable: a tap outside the panel goes back (not for the main menu, whose back is the title)
  menu({ title, items, back, sub = '', cls = '', dismissable = true }) {
    let focus = 0;
    const render = () => {
      const html = items.map((it, i) => {
        const v = it.value ? `<span class="val">‹ ${esc(it.value())} ›</span>` : '';
        return `<button class="mbtn${i === focus ? ' focus' : ''}${it.disabled ? ' dis' : ''}" data-i="${i}"><span>${esc(it.label)}</span>${v}</button>`;
      }).join('');
      return `<div class="screen menu ${cls}"><div class="logo small">${logoHTML()}</div><div class="panel"><h2>${esc(title)}</h2>${sub}<div class="list">${html}</div>
        <div class="hint">${hintHTML(back ? 'Back' : '')}</div></div></div>`;
    };
    const refresh = () => {
      this.ui.querySelectorAll('.mbtn').forEach((b, i) => {
        b.classList.toggle('focus', i === focus);
        const it = items[i];
        if (it.value) b.querySelector('.val').textContent = `‹ ${it.value()} ›`;
      });
    };
    const sc = {
      update: () => {
        for (const [, m] of this.menuEvents) {
          if (m.up) { focus = (focus + items.length - 1) % items.length; this.audio.sfx('click'); refresh(); }
          if (m.down) { focus = (focus + 1) % items.length; this.audio.sfx('click'); refresh(); }
          const it = items[focus];
          if (m.left && it.left) { it.left(); this.audio.sfx('click'); refresh(); }
          if (m.right && it.right) { it.right(); this.audio.sfx('click'); refresh(); }
          if ((m.ok || m.start) && !it.disabled) { this.audio.sfx('select'); (it.action || it.right)?.(); if (!it.action) refresh(); return; }
          if (m.back && back) { this.audio.sfx('back'); back(); return; }
        }
      },
      hover: (i) => { if (i !== focus) { focus = i; refresh(); } },
      click: (i) => { focus = i; const it = items[i]; if (it.disabled) return; this.audio.sfx('select'); (it.action || it.right)?.(); if (!it.action) refresh(); },
      act: (a) => { if (a === 'back' && back) { this.audio.sfx('back'); back(); } },
      dismiss: back && dismissable ? back : null,
    };
    this.setScreen(render(), sc);
  }

  // ---- screens ------------------------------------------------------------------------
  enterFullscreen() { requestFullscreen(); }
  // Resume on a phone or tablet held sideways goes fullscreen (call it from the tap itself)
  resumeFullscreen() {
    if (isTouchDevice() && !standalone && innerWidth > innerHeight && !fullscreenElement()) requestFullscreen();
  }
  // the pause menu's line for a phone held upright: how to get fullscreen
  pauseNote() {
    return isTouchDevice() && !standalone && canFullscreen() && innerHeight > innerWidth && !fullscreenElement()
      ? '<p class="pause-note">📱 Turn sideways, then tap Resume to play full screen</p>' : '';
  }
  toggleFullscreen() {
    // iPhone Safari can't go fullscreen: point at the ways it can lose its bars
    if (this.chrome?.scrollTrick) { this.chrome.flashHint(); return; }
    if (fullscreenElement()) exitFullscreen(); else requestFullscreen();
  }

  showTitle() {
    this.onTitle = true;
    this.hudRoot.classList.add('hidden');
    this.setScreen(`<div class="screen title"><div class="logo">${logoHTML()}</div>
      <div class="tagline">A brick-built kart racer · ${TRACKS.length} maps · 16 racers + ${DRIVERS.length} movie drivers · gliders · 1–8 players</div>
      <button class="press" data-act="start">PRESS <b>START</b> · <b>ENTER</b> · <b>TAP</b></button>
      <div class="pads-note">🎮 Controllers supported — plug in up to 4 for split-screen</div>
      ${isTouchDevice() && !this.chrome.standalone && !this.chrome.scrollTrick ? '<div class="pads-note">📱 Tip: Add to Home Screen to play full screen</div>' : ''}</div>`, {
      update: () => { if (this.menuEvents.some(([, m]) => m.ok || m.start)) { this.enterFullscreen(); this.onTitle = false; this.audio.sfx('select'); this.showMain(); } },
      act: () => { this.enterFullscreen(); this.onTitle = false; this.audio.sfx('select'); this.showMain(); },
    });
  }

  showMain() {
    this.audio.music({ file: './music/toybox-groove.mp3' });
    this.menu({
      title: 'Main Menu',
      items: [
        { label: 'Grand Prix', action: () => this.showSelect('gp') },
        { label: 'Quick Race', action: () => this.showSelect('race') },
        { label: 'Time Trial', action: () => this.showSelect('tt') },
        ...(ONLINE ? [{ label: 'Online', action: () => this.openOnline() }] : []),
        // just back from an online race (a reload, a closed tab, a phone that dropped the page)
        ...(ONLINE && recentOnlineRoom() ? [{ label: `↩ Rejoin ${recentOnlineRoom().title || 'your online race'}`, action: () => this.openOnline({ rejoin: true }) }] : []),
        { label: 'Options', action: () => this.showOptions(() => this.showMain()) },
        { label: 'How to Play', action: () => this.showHelp(() => this.showMain()) },
      ],
      back: () => this.showTitle(),
      dismissable: false,
    });
  }

  // Online play lives in js/online/ and is only loaded when the player picks Online, so the rest
  // of the game never depends on it (or on the relay being reachable).
  openOnline(opts = {}) {
    if (!ONLINE || this.onlineLoading) return;
    this.onlineLoading = true;
    import('./online/online.js')
      .then((m) => { (this.online ||= new m.Online(this)).open('', '', opts); })
      .catch((e) => { console.error(e); this.toast("Online play isn't available right now"); this.showMain(); })
      .finally(() => { this.onlineLoading = false; });
  }

  // touch steering settings -> the input layer (full lock angle per style and sensitivity)
  applyTilt() {
    const s = this.settings, FULL = { wheel: { low: 45, med: 32, high: 22 }, turn: { low: 55, med: 40, high: 28 } };
    this.input.steerMode = TILT_ENABLED ? s.touchSteer || 'both' : 'drag';
    this.input.tiltCfg = { style: s.tiltStyle === 'turn' ? 'turn' : 'wheel', full: (FULL[s.tiltStyle] || FULL.wheel)[s.tiltSens] || 32, invert: !!s.tiltInvert };
    if (this.input.steerMode !== 'drag' && this.input.tiltOn) this.input.calibrateTilt();
  }

  showOptions(back) {
    const s = this.settings;
    const cyc = (key, list, dir) => { const i = list.indexOf(s[key]); s[key] = list[(i + dir + list.length) % list.length]; save(SKEY, s); };
    const vol = (key, dir) => { s[key] = Math.round(Math.max(0, Math.min(1, s[key] + dir * 0.1)) * 10) / 10; save(SKEY, s); this.audio.setVolumes(s.music, s.sfx); };
    const tilt = (key, list, dir) => { cyc(key, list, dir); this.applyTilt(); if (s.touchSteer !== 'drag') this.input.enableTilt(); };
    const ccs = [50, 100, 150, 200], diffs = ['easy', 'normal', 'hard'], laps = [1, 2, 3, 4, 5];
    this.menu({
      title: 'Options',
      items: [
        { label: 'Engine class', value: () => s.cc + 'cc', left: () => cyc('cc', ccs, -1), right: () => cyc('cc', ccs, 1) },
        { label: 'CPU racers', value: () => s.difficulty[0].toUpperCase() + s.difficulty.slice(1), left: () => cyc('difficulty', diffs, -1), right: () => cyc('difficulty', diffs, 1) },
        { label: 'Laps', value: () => String(s.laps), left: () => cyc('laps', laps, -1), right: () => cyc('laps', laps, 1) },
        { label: 'Legoized', value: () => (s.lego !== false ? 'On' : 'Off'), left: () => { s.lego = s.lego === false; save(SKEY, s); }, right: () => { s.lego = s.lego === false; save(SKEY, s); } },
        { label: 'Simplified mode', value: () => (s.simple ? 'On' : 'Off'), left: () => { s.simple = !s.simple; save(SKEY, s); }, right: () => { s.simple = !s.simple; save(SKEY, s); } },
        // phones: how steering works (dragging always works unless it's tilt only; off for now)
        ...(TILT_ENABLED && isTouchDevice() ? [
          { label: 'Touch steering', value: () => ({ both: 'Tilt + drag', drag: 'Drag only', tilt: 'Tilt only' }[s.touchSteer] || 'Tilt + drag'), left: () => tilt('touchSteer', ['both', 'drag', 'tilt'], -1), right: () => tilt('touchSteer', ['both', 'drag', 'tilt'], 1) },
          { label: 'Tilt style', value: () => (s.tiltStyle === 'turn' ? 'Turn (gyro)' : 'Wheel'), left: () => tilt('tiltStyle', ['wheel', 'turn'], -1), right: () => tilt('tiltStyle', ['wheel', 'turn'], 1) },
          { label: 'Tilt sensitivity', value: () => ({ low: 'Low', med: 'Medium', high: 'High' }[s.tiltSens] || 'Medium'), left: () => tilt('tiltSens', ['low', 'med', 'high'], -1), right: () => tilt('tiltSens', ['low', 'med', 'high'], 1) },
          { label: 'Invert tilt', value: () => (s.tiltInvert ? 'On' : 'Off'), left: () => { s.tiltInvert = !s.tiltInvert; save(SKEY, s); this.applyTilt(); }, right: () => { s.tiltInvert = !s.tiltInvert; save(SKEY, s); this.applyTilt(); } },
        ] : []),
        { label: 'Auto-accelerate', value: () => (s.autoGas ? 'On' : 'Off'), left: () => { s.autoGas = !s.autoGas; save(SKEY, s); }, right: () => { s.autoGas = !s.autoGas; save(SKEY, s); } },
        { label: 'Music', value: () => Math.round(s.music * 10) + '/10', left: () => vol('music', -1), right: () => vol('music', 1) },
        { label: 'Sound FX', value: () => Math.round(s.sfx * 10) + '/10', left: () => vol('sfx', -1), right: () => vol('sfx', 1) },
        { label: 'Fullscreen', value: () => (this.chrome.standalone || fullscreenElement() ? 'On' : this.chrome.scrollTrick ? 'Swipe up' : 'Off'), left: () => this.toggleFullscreen(), right: () => this.toggleFullscreen() },
        { label: 'Graphics', value: () => (s.quality === 'high' ? 'High' : 'Fast'), left: () => { cyc('quality', ['high', 'low'], 1); this.applyQuality(); }, right: () => { cyc('quality', ['high', 'low'], 1); this.applyQuality(); } },
        { label: 'Done', action: back },
      ],
      back,
    });
  }

  showHelp(back) {
    const items = Object.keys(ITEMS).map((k) => `<div class="it"><span class="ic">${ICONS[k]}</span><b>${ITEMS[k].name}</b><span>${ITEM_HELP[k] ?? ABILITY[k]?.help ?? ''}</span></div>`).join('');
    this.setScreen(`<div class="screen help"><div class="panel wide"><h2>How to Play</h2>
      <div class="cols">
        <div><h3>🎮 Controller</h3><table>
          <tr><td>Steer</td><td>Left stick / D-pad</td></tr><tr><td>Accelerate</td><td>A or RT</td></tr><tr><td>Brake / reverse</td><td>B or LT</td></tr>
          <tr><td>Hop & drift</td><td>RB (hold while turning)</td></tr><tr><td>Use item</td><td>LB, X or Y</td></tr><tr><td>Throw back / forward</td><td>Hold stick ↓ / ↑ + item</td></tr>
          <tr><td>Look behind</td><td>Press a stick</td></tr><tr><td>Pause</td><td>Start</td></tr></table></div>
        <div><h3>⌨️ Keyboard</h3><table>
          <tr><td>Steer</td><td>A / D or ← / →</td></tr><tr><td>Accelerate</td><td>W or ↑</td></tr><tr><td>Brake / reverse</td><td>S or ↓</td></tr>
          <tr><td>Hop & drift</td><td>Space</td></tr><tr><td>Use item</td><td>E or Shift</td></tr><tr><td>Look behind</td><td>Q</td></tr><tr><td>Pause</td><td>Esc / P</td></tr>
          <tr><td>2nd keyboard player</td><td>Arrows, Right Shift = drift, Enter = item (join with Right Shift)</td></tr></table>
          <h3>📱 Touch</h3><p>Drag a finger left / right anywhere to steer; drag it down to brake. While steering, touch with a second finger to drift. ITEM (bottom right) shows what you hold. Gas is automatic.</p></div>
        <div><h3>🏁 Tips</h3><ul>
          <li>Hold drift through corners until the sparks turn <b style="color:#7fd4ff">blue</b>, <b style="color:#ff9a1a">orange</b>, then <b style="color:#d05aff">purple</b>, then let go for a mini-turbo.</li>
          <li>Press drift in mid-air off a ramp to do a trick and land with a boost.</li>
          <li>Collect gold studs: each one raises your top speed, up to 10. Getting hit drops some.</li>
          <li>Hold accelerate right as the second light comes on for a rocket start.</li>
          <li>Orange arrow pads give a boost.</li></ul></div>
      </div>
      <h3>Power-ups (${Object.keys(ITEMS).length}) · racers further back get stronger ones · movie &amp; game powers turn up on every track (in Simplified mode, only on their own)</h3><div class="items">${items}</div>
      <div class="hint">${hintHTML('Back')}</div></div></div>`, {
      update: () => { for (const [, m] of this.menuEvents) if (m.back || m.ok || m.start) { this.audio.sfx('back'); back(); return; } },
      act: (a) => { if (a === 'back') back(); },
      dismiss: back,
    });
  }

  // ---- racer select with drop-in players -----------------------------------------------------------
  // Each player picks a driver from the grid (A locks it in), then flips through karts with ◀︎ ▶︎ in
  // their own preview (A locks that in too), so nobody waits on anyone else.
  // resume: coming back from the cup / map screen, everyone is still locked in
  // online: hooks from js/online/online.js (one player per screen; a room panel instead of the
  // player slots; readiness, taken drivers and the Race button go through it)
  showSelect(mode, resume = false, online = null) {
    this.mode = mode;
    // phones are single-player (extra controllers can't join); tablets and up take up to 8
    const phone = isPhone();
    const max = mode === 'tt' || phone ? 1 : MAX_PLAYERS;
    // phase: 'driver' (choosing) -> 'kart' (driver locked: choosing a kart, p.sub = 'kart', then once
    // that's locked in with a spin, the glider, p.sub = 'glider') -> 'done'. Offline, the last
    // player locking in their glider starts the race.
    const players = [];
    const uni = (id) => UNIVERSES.find((u) => u.id === id) || { name: id, color: '#fff' };
    // Simplified mode offers a smaller roster (DRIVERS / KARTS indices, in order) in one grid
    const simple = !!this.settings.simple;
    let allowedD = DRIVERS.map((_, i) => i).filter((i) => !simple || simpleDriver(DRIVERS[i].id));
    let allowedK = KARTS.map((_, i) => i).filter((i) => !simple || simpleKart(KARTS[i].id));
    if (!allowedD.length) allowedD = DRIVERS.map((_, i) => i);
    if (!allowedK.length) allowedK = KARTS.map((_, i) => i);
    let allowedG = GLIDERS.map((_, i) => i).filter((i) => !simple || simpleGlider(GLIDERS[i].id));
    if (!allowedG.length) allowedG = GLIDERS.map((_, i) => i);
    let dgroups = '';
    const groupSizes = [];
    for (const u of UNIVERSES) {
      const list = allowedD.map((i) => [DRIVERS[i], i]).filter(([d]) => d.from === u.id);
      if (!list.length) continue;
      groupSizes.push(list.length);
      dgroups += (simple ? '' : `<div class="uhead" style="--uc:${u.color}">${esc(u.name)}</div>`) + list.map(([d, i]) => `
        <div class="dcard" data-i="${i}" style="--dc:${hex(d.color ?? 0xffffff)}"><img alt="" data-d="${i}"><span>${esc(d.name)}</span><div class="tags"></div></div>`).join('');
    }
    const titles = { gp: 'Grand Prix', race: 'Quick Race', tt: 'Time Trial', online: 'Online' };
    this.setScreen(`<div class="screen select chars${simple ? ' simple' : ''}${phone ? ' phone' : ''}${online ? ' online' : ''}"><div class="panel wide xl"><h2>${titles[mode]} · Choose your racer</h2>
      ${online ? '<div class="olroster"></div>' : '<div class="joinbar"></div>'}
      <div class="csel">
        <div class="stage"><canvas class="pv"></canvas><div class="pvcells"></div></div>
        <div class="picks"><div class="dgrid">${dgroups}</div></div>
      </div>
      <div class="selfoot"><button class="bbtn" data-act="back">◀︎ Back</button><div class="hint2"></div><button class="bbtn go" data-act="go">Race! ▶︎</button></div></div></div>`);
    const ui = this.ui;
    const dcards = [...ui.querySelectorAll('.dcard')];
    const dEl = new Map(dcards.map((c) => [+c.dataset.i, c]));
    const picksEl = ui.querySelector('.picks'), gridEl = ui.querySelector('.dgrid');
    // one preview per player, each drawn into its own cell of the stage
    const stageEl = ui.querySelector('.stage'), cellsEl = ui.querySelector('.pvcells'), canvas = ui.querySelector('canvas.pv');
    // each cell's rect on the canvas, and the rects of its text and buttons (layout boxes, so their
    // animations don't count): the camera keeps the kart or driver clear of them
    const OVERLAYS = '.pvstep, .pvinfo, .karr, .kok, .ksw, .pvfollow, .olnames';
    const cellRects = () => {
      const b = canvas.getBoundingClientRect();
      return [...cellsEl.children].map((c) => {
        const r = c.getBoundingClientRect(), avoid = [];
        for (const e of c.querySelectorAll(OVERLAYS)) {
          if (!e.offsetWidth || e.offsetParent !== c) continue;
          avoid.push([e.offsetLeft - 4, e.offsetTop - 4, e.offsetLeft + e.offsetWidth + 4, e.offsetTop + e.offsetHeight + 4]);
        }
        return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height, avoid };
      });
    };
    const show = new Showcase(canvas, { cam: [5.6, 3.6, 8.4], look: [0, 1.25, 0], spin: 0.4, cells: cellRects });
    this.cleanup = () => show.dispose();
    const slotKeys = [], slotHtml = [];   // what each preview cell currently shows
    // online, with 4 people or fewer in the room (desktops and tablets): the other screens' players get preview cells too,
    // after ours, live from their presence ({ remote: true, key, name, color, phase, sub, dcur, kcur,
    // gcur, stale, status }). rstate remembers each one's step, to mirror their lock-in moves.
    const remotes = () => (online ? online.previewRemotes() : []);
    const rstate = new Map();
    let gridKey = '', picksKey = '';
    // phones hide the grid: drivers are stepped through with arrows instead
    const compact = () => !picksEl.offsetWidth;
    const deviceLabel = (d) => d === 'kb' ? (this.input.split ? 'Keys WASD' : 'Keyboard') : d === 'kb2' ? 'Keys Arrows' : d === 'touch' ? 'Touch' : this.input.padName(d);
    // a driver is locked in once its player is choosing a kart (or done); the online name step comes first
    const locked = (p) => p.phase === 'kart' || p.phase === 'done';
    const taken = (me) => new Set([...players.filter((p) => p !== me && locked(p)).map((p) => p.dcur), ...(online ? online.taken() : [])]);
    // portraits fill in a few per frame
    const pendingD = [...ui.querySelectorAll('img[data-d]')];
    const fillImgs = (n) => { while (n-- > 0 && pendingD.length) { const img = pendingD.shift(); img.src = driverPortrait(DRIVERS[+img.dataset.d]); } };
    const statBars = (st) => ['speed', 'accel', 'handling', 'weight'].map((k) => `<div class="st"><span>${k.slice(0, 5).toUpperCase()}</span><i style="width:${st[k] * 20}%"></i></div>`).join('');
    // size the driver grid. Simplified mode: every card on screen at once, as big as they fit (the
    // panel is full width). Full roster: as many columns as fit, but avoiding movie groups that
    // end in a row with a single card.
    const layoutPicks = () => {
      const W = picksEl.clientWidth, H = picksEl.clientHeight;
      const key = W + 'x' + H;
      if (!W || !H || key === picksKey) return;
      picksKey = key;
      const gap = 6;
      if (simple) {
        const n = dcards.length;
        let w = 120;
        const fits = (w) => { const cols = Math.max(1, Math.floor((W - 8 + gap) / (w + gap))), rows = Math.ceil(n / cols); return rows * (w + Math.max(14, w * 0.17) + 8) + (rows - 1) * gap <= H - 10; };
        while (w > 30 && !fits(w)) w--;
        const apply = () => {
          const cols = Math.max(1, Math.floor((W - 8 + gap) / (w + gap)));
          gridEl.style.gridTemplateColumns = `repeat(${cols}, ${w}px)`;
          gridEl.style.setProperty('--cw', w + 'px');
          gridEl.classList.toggle('tiny', w < 52);   // too small for names: pictures only (the preview names them)
        };
        apply();
        // the estimate is rough: grow while everything still fits, then shrink until nothing scrolls
        const over = () => picksEl.scrollHeight > picksEl.clientHeight + 1;
        for (let n2 = 0; n2 < 60 && w < 140 && !over(); n2++) { w += 2; apply(); }
        for (let n2 = 0; n2 < 60 && over() && w > 30; n2++) { w -= 1; apply(); }
        return;
      }
      const minW = matchMedia('(max-width: 820px)').matches ? 64 : 86;
      const maxCols = Math.max(3, Math.floor((W - 8 + gap) / (minW + gap)));
      let cols = maxCols, best = Infinity;
      for (let c = maxCols; c >= Math.max(3, Math.ceil(maxCols * 0.6)); c--) {
        const singles = groupSizes.filter((g) => g > 1 && g % c === 1).length;
        if (singles < best) { best = singles; cols = c; }
      }
      gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    };
    // lay the preview cells out in the grid that keeps them closest to square
    const layoutCells = () => {
      const n = Math.max(1, cellsEl.children.length), W = stageEl.clientWidth || 1, H = stageEl.clientHeight || 1;
      let cols = 1, best = -Infinity;
      for (let c = 1; c <= n; c++) {
        const r = Math.ceil(n / c), score = Math.min(W / c, (H / r) * 1.2) - (c * r - n) * 8;
        if (score > best) { best = score; cols = c; }
      }
      const key = cols + 'x' + Math.ceil(n / cols);
      if (key === gridKey) return;
      gridKey = key;
      cellsEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      cellsEl.style.gridTemplateRows = `repeat(${Math.ceil(n / cols)}, 1fr)`;
    };
    const gGroup = (gl) => GLIDER_GROUP_NAMES[gl.group] || { name: 'Glider', color: '#fff' };
    const cellHtml = (p, d, ch, following, standing) => {
      if (p?.remote) return remoteHtml(p, d, ch, standing);
      // online: each player first picks the name they race under (see js/online/names.js)
      if (online && p?.phase === 'name') return online.nameCell(p);
      const kartStep = p && locked(p), glideStep = kartStep && p.sub === 'glider';
      const gl = GLIDERS[p?.gcur ?? 0];
      const who = p && !phone ? `<i style="background:${p.color}">P${p.id + 1}</i> ` : '';
      const kn = allowedK.indexOf(p?.kcur) + 1, dn = allowedD.indexOf(p?.dcur) + 1, gn = allowedG.indexOf(p?.gcur) + 1;
      const tag = !p ? 'Press <b>A</b> / <b>Enter</b> or tap a driver'
        : p.phase === 'driver' ? `${who}pick a <b>driver</b><em class="dnum">${dn} / ${allowedD.length}</em>`
        : p.phase === 'kart' ? (glideStep ? `${who}pick a <b>glider</b> <em>${gn} / ${allowedG.length}</em>` : p.kartLock ? `${who}<b>kart</b> locked in ✓` : `${who}pick a <b>kart</b> <em>${kn} / ${allowedK.length}</em>`) : `${who}is ready!`;
      const u = glideStep ? gGroup(gl) : uni(d.from);
      // choosing a kart, then a glider: arrows either side of it (◀︎ ▶︎ on the pad too) and a lock-in
      // button for touch; on phones (no grid) drivers are picked the same way
      const what = glideStep ? 'glider' : 'kart';
      const arrows = p?.phase === 'kart' && !p.kartLock ? `<button class="karr l" data-act="kprev:${p.id}" aria-label="Previous ${what}">${CHEV_L}</button><button class="karr r" data-act="knext:${p.id}" aria-label="Next ${what}">${CHEV_R}</button><button class="kok" data-act="kok:${p.id}">Lock in ✓</button>`
        : p?.phase === 'driver' ? `<button class="karr l drv" data-act="dprev:${p.id}" aria-label="Previous driver">${CHEV_L}</button><button class="karr r drv" data-act="dnext:${p.id}" aria-label="Next driver">${CHEV_R}</button><button class="kok drv" data-act="dok:${p.id}">Lock in ✓</button>` : '';
      const sw = p?.swDir && performance.now() - p.swAt < 700 ? ` sw${p.swDir > 0 ? 'd' : 'u'}` : '';
      return `<div class="pvstep">${tag}</div>${arrows}
        <div class="pvinfo${sw}"><div class="pvfrom" style="color:${u.color}">${esc(u.name)}</div>
        <div class="pvname">${esc(glideStep ? gl.name : kartStep ? ch.vehicle : d.name)}</div>
        <div class="pvblurb">${esc(glideStep ? gl.blurb || 'Glider' : kartStep ? `${ch.form || bodyName(ch)}${ch.blurb ? ' · ' + ch.blurb : ''}` : `${d.blurb}${d.blurb ? ' · ' : ''}${d.weight[0].toUpperCase() + d.weight.slice(1)}`)}</div>
        ${standing ? '' : `<div class="pvkart">${glideStep ? `on the <b>${esc(ch.vehicle)}</b> with <b>${esc(d.name)}</b>` : kartStep ? `driven by <b>${esc(d.name)}</b>${p.phase === 'done' ? ` · <b>${esc(gl.name)}</b>` : ''}` : `in the <b>${esc(ch.vehicle)}</b>`}</div>`}
        ${glideStep ? '' : `<div class="stats big">${statBars(combinedStats(ch.stats, d))}</div>`}</div>${following ? '<div class="pvfollow">▶︎ picking now</div>' : ''}`;
    };
    // another screen's player: the same preview, marked as theirs (🌐 and their name), with no controls
    const remoteHtml = (p, d, ch, standing) => {
      const kartStep = locked(p), glideStep = kartStep && p.sub === 'glider', gl = GLIDERS[p.gcur ?? 0];
      const who = `<i class="rwho" style="background:${p.color}">${p.host ? '👑 ' : '🌐 '}${esc(p.name)}</i> `;
      const tag = p.status ? `${who}<span class="rst">${esc(p.status)}</span>`
        : p.phase === 'name' ? `${who}choosing a name…` : p.phase === 'driver' ? `${who}picking a <b>driver</b>`
        : p.phase === 'kart' ? `${who}picking a <b>${glideStep ? 'glider' : 'kart'}</b>` : `${who}is ready!`;
      const u = glideStep ? gGroup(gl) : uni(d.from);
      const sw = p.swDir && performance.now() - p.swAt < 700 ? ` sw${p.swDir > 0 ? 'd' : 'u'}` : '';
      return `<div class="pvstep">${tag}</div>
        <div class="pvinfo${sw}"><div class="pvfrom" style="color:${u.color}">${esc(u.name)}</div>
        <div class="pvname">${esc(glideStep ? gl.name : kartStep ? ch.vehicle : d.name)}</div>
        ${standing ? '' : `<div class="pvkart">${glideStep ? `on the <b>${esc(ch.vehicle)}</b> with <b>${esc(d.name)}</b>` : `driven by <b>${esc(d.name)}</b>${p.phase === 'done' ? ` · <b>${esc(gl.name)}</b>` : ''}`}</div>`}
        ${glideStep ? '' : `<div class="stats big">${statBars(combinedStats(ch.stats, d))}</div>`}</div>`;
    };
    // a remote player's step changed: play what their own screen shows (driver lock-in jump, the
    // kart's lock-in spin and slide to the glider, the win pose)
    const remoteMoves = (p, i) => {
      const st = rstate.get(p.key) || {}, now = performance.now();
      const was = st.phase, wasSub = st.sub;
      let move = null;
      if (was && (was !== p.phase || wasSub !== p.sub)) {
        if ((was === 'name' || was === 'driver') && p.phase === 'kart') { st.kartAt = now + 1000; move = 'commit'; }
        else if (was === 'kart' && wasSub !== 'glider' && p.phase === 'kart' && p.sub === 'glider') { move = 'slide'; st.swAt = now; }
        else if (p.phase === 'done' && was !== 'done') move = 'win';
      } else if (!was && p.phase === 'kart') st.kartAt = 0;
      st.phase = p.phase; st.sub = p.sub;
      rstate.set(p.key, st);
      p.kartAt = st.kartAt; p.swDir = st.swAt ? 1 : 0; p.swAt = st.swAt || 0;
      return move;
    };
    const refreshStage = (cheerP) => {
      const rem = remotes();
      const list = [...(players.length ? players : [null]), ...rem];
      for (const k of [...rstate.keys()]) if (!rem.some((r) => r.key === k)) rstate.delete(k);
      const fp = followed();
      while (cellsEl.children.length > list.length) cellsEl.lastElementChild.remove();
      while (cellsEl.children.length < list.length) cellsEl.appendChild(document.createElement('div'));
      show.trim(list.length); slotKeys.length = slotHtml.length = list.length;
      ui.querySelector('.csel').classList.toggle('multi', list.length > 1);
      layoutCells();
      list.forEach((p, i) => {
        const move = p?.remote ? remoteMoves(p, i) : null;
        const d = DRIVERS[p ? p.dcur : 0], ch = KARTS[p ? p.kcur : 0];
        // while choosing a driver they stand on their own; the kart joins once they lock in (after
        // their lock-in jump-spin)
        const standing = !p || p.phase === 'driver' || p.phase === 'name' || (p.phase === 'kart' && performance.now() < (p.kartAt || 0));
        const key = (p ? (p.remote ? p.key : p.id) : '-') + '|' + d.id + '|' + (standing ? 'stand' : ch.id), phase = p?.phase === 'done' ? 'win' : 'pre';
        const gl = GLIDERS[p?.gcur ?? 0], glide = !standing && p?.phase === 'kart' && p.sub === 'glider';
        if (key !== slotKeys[i]) {
          const ry = show.items[i]?.m.root.rotation.y ?? 0.6;
          const sameDriver = slotKeys[i] && slotKeys[i].split('|').slice(0, 2).join('|') === key.split('|').slice(0, 2).join('|');
          show.setItem(i, { ch, driver: d, ry, phase, stand: standing, glider: gl, glide });
          slotKeys[i] = key;
          if (!sameDriver) show.play(i, 'yay');
        } else if (!standing) {
          // a new glider or the kart / glider view: changed in place (no rebuild)
          const it = show.items[i];
          if (it && it.glider !== gl) show.setGlider(i, gl);
          if (move === 'slide' && it && !it.slideFx) { show.spinCommit(i); show.play(i, 'cheer'); show.slide(i, 1, () => show.setGlide(i, true)); }
          else if (it && it.glide !== glide && !it.slideFx) show.setGlide(i, glide);
        }
        show.setPhase(i, phase);
        if (p && p === cheerP) { if (standing) show.standMove(i, 'commit'); else show.play(i, 'cheer'); this.audio.voice(d.voice, 'cheer', 0.9); }
        if (move === 'commit' && standing) show.standMove(i, 'commit');
        if (move === 'win') show.play(i, 'win');
        const cell = cellsEl.children[i];
        cell.className = 'pvcell' + (p && p === fp && players.length > 1 ? ' follow' : '') + (p?.remote ? ' remote' + (p.stale ? ' away' : '') : '');
        cell.style.setProperty('--pc', p ? p.color : 'rgba(255,255,255,.25)');
        const html = cellHtml(p, d, ch, p && p === fp && players.length > 1, standing);
        if (html !== slotHtml[i]) { cell.innerHTML = html; slotHtml[i] = html; }
      });
    };
    // the picker scrolls with the first player (in join order) still choosing a driver; once they
    // lock in, it moves on to the next one. Everyone else still sees their own preview update.
    let followEl = null;
    const followed = () => players.find((p) => p.phase === 'driver') || null;
    const follow = () => {
      const f = followed();
      const el = f ? dEl.get(f.dcur) : null;
      if (el && el !== followEl) scrollTo(el);
      followEl = el;
    };
    const refresh = (cheerP = null) => {
      // remember what each player slot is looking at, so coming back to this screen restores it
      this.picks.chars ||= {};
      for (const p of players) this.picks.chars[p.id] = { driver: DRIVERS[p.dcur].id, kart: KARTS[p.kcur].id, glider: GLIDERS[p.gcur]?.id };
      save(PKEY, this.picks);
      for (const c of dcards) {
        const i = +c.dataset.i, here = players.filter((p) => p.dcur === i);
        c.querySelector('.tags').innerHTML = here.map((p) => `<span class="ptag${locked(p) ? ' lock' : ''}" style="background:${p.color}">P${p.id + 1}${locked(p) ? ' ✓' : ''}</span>`).join('') + (online ? online.tags(i) : '');
        c.style.outline = here.length ? `4px solid ${here[here.length - 1].color}` : '';
        c.classList.toggle('taken', players.length > 1 && players.some((p) => locked(p) && p.dcur === i) && !here.some((p) => !locked(p)));
      }
      let html = '';
      for (let s2 = 0; s2 < Math.min(max, players.length + 1); s2++) {
        const p = players[s2];
        const st = !p ? '' : p.phase === 'driver' ? 'choosing a driver…'
          : p.phase === 'kart' ? esc(DRIVERS[p.dcur].name) + (p.sub === 'glider' ? ' · choosing a glider…' : ' · choosing a kart…') : esc(DRIVERS[p.dcur].name) + ' · ' + esc(KARTS[p.kcur].vehicle) + ' · ' + esc(GLIDERS[p.gcur].name) + ' ✓';
        html += p ? `<div class="slot on" style="--pc:${p.color}"><b>P${p.id + 1}</b> ${esc(deviceLabel(p.device))}<em>${st}</em></div>`
          : `<div class="slot"><b>P${s2 + 1}</b> ${s2 === 0 ? 'Press A / Enter / tap a driver' : 'Press A to join'}</div>`;
      }
      if (!online) ui.querySelector('.joinbar').innerHTML = html;
      const ready = players.length && players.every((p) => p.phase === 'done');
      ui.querySelector('.go').classList.toggle('ready', !!ready);
      const swipe = players.length === 1 && players[0].device === 'touch';
      if (online) { online.changed(players); ui.querySelector('.hint2').innerHTML = online.hint(players); ui.querySelector('.go').innerHTML = online.goLabel(players); }
      else ui.querySelector('.hint2').innerHTML = swipe ? (ready ? 'All set! Tap <b>Race!</b>'
        : players[0].phase === 'kart' ? `Swipe <b>◀︎ ▶︎</b> to change ${players[0].sub === 'glider' ? 'glider' : 'kart'}` : 'Swipe <b>◀︎ ▶︎</b> to change driver')
        : ready ? 'All set! Press <b>A</b> / <b>Start</b> / <b>Enter</b> to race'
        : players.some((p) => p.phase === 'kart') ? '<b>◀︎ ▶︎</b> change · <b>A</b> lock it in · <b>B</b> back'
        : mode === 'tt' ? 'Time Trial is solo: beat your best time'
        : phone ? '<b>◀︎ ▶︎</b> change driver · <b>A</b> lock it in'
        : 'More players: press <b>A</b> on another controller · 2nd keyboard: <b>Right Shift</b>';
      refreshStage(cheerP);
      follow();
    };
    // keep the focused card in view; in a group's first row also show its heading (the very top for the first group)
    const scrollTo = (el) => {
      if (!el) return;
      const box = picksEl.getBoundingClientRect(), r = el.getBoundingClientRect();
      let top = r.top - box.top + picksEl.scrollTop, bottom = top + r.height;
      let h = el.previousElementSibling;
      while (h && !h.classList.contains('uhead')) { if (h.getBoundingClientRect().top < r.top - 4) { h = null; break; } h = h.previousElementSibling; }
      if (h) top = h === el.parentElement.firstElementChild ? 0 : h.getBoundingClientRect().top - box.top + picksEl.scrollTop;
      const first = el.parentElement.firstElementChild;
      if (first && Math.abs(first.getBoundingClientRect().top - r.top) < 4) top = 0;
      if (top - 6 < picksEl.scrollTop) picksEl.scrollTop = Math.max(0, top - 6);
      else if (bottom + 8 > picksEl.scrollTop + picksEl.clientHeight) picksEl.scrollTop = bottom + 8 - picksEl.clientHeight;
    };
    const join = (device) => {
      if (players.length >= max || players.some((p) => p.device === device)) return null;
      if (online && !online.canJoin(players.length)) { this.audio.sfx('wrong'); return null; }   // 12 people per room
      const id = [...Array(MAX_PLAYERS).keys()].find((n) => !players.some((p) => p.id === n));
      // start on this slot's picks from last time (a fresh slot starts on its own driver)
      const prev = this.picks.chars?.[id] || {};
      const di = allowedD.findIndex((i) => DRIVERS[i].id === prev.driver), ki = allowedK.findIndex((i) => KARTS[i].id === prev.kart), gi = allowedG.findIndex((i) => GLIDERS[i].id === prev.glider);
      const tk = taken(null), nD = allowedD.length;
      let pos = di >= 0 ? di : id % nD;
      for (let n = 0; n < nD && tk.has(allowedD[pos]); n++) pos = (pos + 1) % nD;
      const p = { id, device, dcur: allowedD[pos], kcur: allowedK[ki >= 0 ? ki : 0], gcur: allowedG[gi >= 0 ? gi : 0], sub: 'kart', phase: online ? 'name' : 'driver', color: PCOL[id] };
      online?.nameStart(p);
      players.push(p);
      players.sort((a, b) => a.id - b.id);
      this.audio.sfx('join');
      refresh();
      return p;
    };
    const go = () => {
      if (online) { online.go(players); return; }
      if (!players.length || !players.every((p) => p.phase === 'done')) return;
      this.audio.sfx('select');
      this.players = players.map((p) => this.makePlayer({ id: p.id, device: p.device, cursor: 0, driver: p.dcur, kart: p.kcur, glider: p.gcur, color: p.color }));
      if (mode === 'gp') this.showCups();
      else this.showTracks(mode);
    };
    const leave = (p) => {
      players.splice(players.indexOf(p), 1);
      if (p.device === 'kb2') this.input.split = false;
      this.audio.sfx('back');
      refresh();
    };
    const back = () => { this.input.split = false; if (online) online.back(); else this.showMain(); };
    // move a cursor through a grid by on-screen position
    const nav = (cards, cur, dx, dy) => {
      const r0 = cards[cur].getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
      let best = -1, bd = Infinity;
      cards.forEach((c, i) => {
        if (i === cur) return;
        const r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const ddx = x - cx, ddy = y - cy;
        if (dx && (Math.sign(ddx) !== dx || Math.abs(ddy) > r0.height * 0.5)) return;
        if (dy && (Math.sign(ddy) !== dy || Math.abs(ddy) < r0.height * 0.5)) return;
        const dd = dx ? Math.abs(ddx) : Math.abs(ddy) * 4 + Math.abs(ddx);
        if (dd < bd) { bd = dd; best = i; }
      });
      if (best < 0 && dx) best = (cur + dx + cards.length) % cards.length;   // wrap rows
      return best < 0 ? cur : best;
    };
    const moveIn = (cards, cur, dx, dy, idOf) => idOf(cards[nav(cards, Math.max(0, cards.findIndex((c) => idOf(c) === cur)), dx, dy)]);
    const lockDriver = (p) => {
      if (taken(p).has(p.dcur)) { this.audio.sfx('wrong'); return; }
      p.phase = 'kart'; p.sub = 'kart'; p.kartLock = 0;
      p.kartAt = performance.now() + 1000;   // the kart rolls in after the lock-in jump-spin
      this.audio.sfx('select');
      refresh(p);
    };
    const stepDriver = (p, dir) => {
      const n = allowedD.length, tk = taken(p);
      let k = Math.max(0, allowedD.indexOf(p.dcur));
      for (let t = 0; t < n; t++) { k = (k + dir + n) % n; if (!tk.has(allowedD[k])) break; }
      p.dcur = allowedD[k];
      this.audio.sfx('click');
      refresh();
    };
    const stepKart = (p, dir) => {
      if (p.sub === 'glider') {
        const n = allowedG.length, k = allowedG.indexOf(p.gcur);
        p.gcur = allowedG[((k < 0 ? 0 : k) + dir + n) % n];
      } else {
        const n = allowedK.length, k = allowedK.indexOf(p.kcur);
        p.kcur = allowedK[((k < 0 ? 0 : k) + dir + n) % n];
      }
      this.audio.sfx('click');
      refresh();
    };
    // flip between choosing the kart and the glider: the preview slides up (dir 1, pressing down)
    // or down (dir -1) out of its cell and back in as the other view, pulled back for the glider
    const switchSub = (p, dir, to = p.sub === 'glider' ? 'kart' : 'glider') => {
      if (to === p.sub) return;
      const i = players.indexOf(p);
      this.audio.sfx('click');
      show.slide(i, dir, () => { p.sub = to; p.swDir = dir; p.swAt = performance.now(); refresh(); show.setGlide(i, to === 'glider'); });
    };
    // a touch player who has tapped or swiped keeps player 1 (a controller can't take it over)
    const touched = () => { for (const q of players) if (q.device === 'touch') q.acted = true; };
    // locking in the kart: a celebration spin, then the glider step slides in; locking in the
    // glider: done (offline, the last one to lock in starts the race after their win pose)
    let goAt = 0;
    const lockKart = (p) => {
      const i = players.indexOf(p);
      if (show.items[i]?.slideFx) return;   // mid-slide to the glider step
      if (p.sub !== 'glider') {
        if (p.kartLock) return;
        p.kartLock = performance.now() + 950;
        this.audio.sfx('select');
        show.spinCommit(i); show.play(i, 'cheer'); this.audio.voice(DRIVERS[p.dcur].voice, 'cheer', 0.9);
        refresh();
        return;
      }
      p.phase = 'done'; this.audio.sfx('select'); refresh(); show.play(i, 'win'); this.audio.voice(DRIVERS[p.dcur].voice, 'win', 0.9);
      if (!online && players.every((q) => q.phase === 'done')) goAt = performance.now() + 1100;
    };
    // B / Back steps back one choice: glider ready -> glider -> kart -> driver
    const stepBack = (p) => {
      goAt = 0;
      if (p.phase === 'done') { p.phase = 'kart'; p.sub = 'glider'; this.audio.sfx('back'); refresh(); return; }
      if (p.kartLock) { p.kartLock = 0; this.audio.sfx('back'); refresh(); return; }
      if (p.sub === 'glider') { this.audio.sfx('back'); switchSub(p, -1, 'kart'); return; }
      p.phase = 'driver'; this.audio.sfx('back'); refresh();
    };
    // touch: swipe a preview sideways for the previous / next driver, kart or glider (like ◀︎ ▶︎), and
    // up or down to flip between choosing the kart and the glider (like ▲ ▼). Swipes don't start on
    // its buttons, so taps on them still work.
    let swipe0 = null;
    stageEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || e.target.closest('button')) return;
      const b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      const i = cellRects().findIndex((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
      swipe0 = players[i] ? { id: e.pointerId, x: e.clientX, y: e.clientY, p: players[i] } : null;
    });
    stageEl.addEventListener('pointermove', (e) => {
      const s = swipe0;
      if (!s || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y, ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < 40) return;
      swipe0 = null;   // one step per swipe
      const p = s.p;
      if (!players.includes(p)) return;
      touched();
      if (ax > ay * 1.2) {
        const dir = dx < 0 ? 1 : -1;   // swipe left: the next one
        if (p.phase === 'driver') stepDriver(p, dir); else if (p.phase === 'kart' && !p.kartLock) stepKart(p, dir);
      }
    });
    const endSwipe = (e) => { if (swipe0?.id === e.pointerId) swipe0 = null; };
    stageEl.addEventListener('pointerup', endSwipe);
    stageEl.addEventListener('pointercancel', endSwipe);
    this.screen = {
      update: (dt) => {
        fillImgs(3);
        if (players.some((p) => p.kartAt && performance.now() >= p.kartAt)) { for (const p of players) if (p.kartAt && performance.now() >= p.kartAt) p.kartAt = 0; refresh(); }
        for (const st of rstate.values()) if (st.kartAt && performance.now() >= st.kartAt) { st.kartAt = 0; refreshStage(); }
        // after the kart's lock-in spin, on to the glider
        for (const p of players) if (p.kartLock && performance.now() >= p.kartLock && p.phase === 'kart') { p.kartLock = 0; switchSub(p, 1, 'glider'); }
        if (goAt && performance.now() >= goAt) { goAt = 0; if (players.length && players.every((p) => p.phase === 'done')) { go(); return; } }
        layoutPicks();
        layoutCells();
        show.update(dt);
        // online: the name keyboard has the controls while it's open
        if (online?.modal) { online.modalUpdate(); return; }
        if (players.length < max && players.some((p) => p.device === 'kb') && !players.some((p) => p.device === 'kb2') && this.input.edge && KB2_JOIN.some((k) => this.input.edge.has(k))) {
          this.input.split = true; join('kb2');
        }
        for (const [dev, m] of this.menuEvents) {
          let p = players.find((q) => q.device === dev);
          if (p && (m.ok || m.start || m.back || m.up || m.down || m.left || m.right)) p.acted = true;
          if (!p) {
            // a controller that only just showed up takes over an untouched keyboard player 1
            if ((m.ok || m.start) && dev.startsWith('pad') && players.length === 1 && !players[0].acted && !players[0].device.startsWith('pad')) {
              players[0].device = dev; players[0].acted = true; this.audio.sfx('join'); refresh(); continue;
            }
            if (m.ok || m.start) {
              if (players.length === 0 && dev === 'kb2') continue;
              p = join(dev);
            } else if (m.back && players.length === 0) { back(); return; }
            continue;
          }
          const dx = m.left ? -1 : m.right ? 1 : 0, dy = m.up ? -1 : m.down ? 1 : 0;
          if (p.phase === 'name') {
            if (dy) { online.nameMove(p, dy); this.audio.sfx('click'); refresh(); }
            if (m.x) { online.nameDelete(p); refresh(); }
            if (m.ok || m.start) { this.audio.sfx('select'); online.nameAccept(p, () => { p.phase = 'driver'; refresh(); }); continue; }
            if (m.back) { if (p === players[0]) { back(); return; } leave(p); }
            continue;
          }
          if (p.phase === 'driver') {
            if (compact()) { if (dx) stepDriver(p, dx); }
            else if (dx || dy) { p.dcur = moveIn(dcards, p.dcur, dx, dy, (c) => +c.dataset.i); this.audio.sfx('click'); refresh(); }
            if (m.ok) { lockDriver(p); continue; }
            if (m.back) { if (online) { p.phase = 'name'; this.audio.sfx('back'); refresh(); continue; } if (p === players[0]) { back(); return; } leave(p); continue; }
          } else if (p.phase === 'kart') {
            if (m.back) { stepBack(p); continue; }
            if (p.kartLock) continue;
            if (dx) stepKart(p, dx);
            if (m.ok) { lockKart(p); continue; }
          } else {
            if (m.back) { stepBack(p); continue; }
            if (m.ok || m.start) { go(); return; }
          }
          if (m.start) go();
        }
      },
      // mouse / touch: tapping a driver locks it in (or swaps it for one already choosing a kart)
      click: (i) => {
        let p = players.find((q) => q.device === 'touch' || q.device === 'kb') || players[0];
        if (!p) p = join(isTouchDevice() ? 'touch' : 'kb');
        touched();
        if (!p || taken(p).has(i)) return;
        if (online && p.phase === 'name') online.nameQuick(p);   // tapping a driver keeps the highlighted name
        p.dcur = i; p.phase = 'driver';
        lockDriver(p);
      },
      act: (a) => {
        touched();
        // the Back button steps back one stage for the mouse / touch player: ready -> kart -> driver -> menu
        if (a.startsWith('ol')) { online?.act(a, players, refresh); return; }
        if (a === 'back') {
          const p = players.find((q) => q.device === 'touch' || q.device === 'kb') || players[0];
          if (p && online && p.phase === 'driver') { p.phase = 'name'; this.audio.sfx('back'); refresh(); return; }
          if (p && p.phase !== 'driver' && p.phase !== 'name') stepBack(p); else back();
          return;
        }
        if (a === 'go') go();
        const [cmd, id] = a.split(':'), p = players.find((q) => q.id === +id);
        if (p?.phase === 'driver') {
          if (cmd === 'dprev') stepDriver(p, -1);
          if (cmd === 'dnext') stepDriver(p, 1);
          if (cmd === 'dok') lockDriver(p);
        }
        if (!p || p.phase !== 'kart' || p.kartLock) return;
        if (cmd === 'kprev') stepKart(p, -1);
        if (cmd === 'knext') stepKart(p, 1);
        if (cmd === 'kok') lockKart(p);
      },
    };
    if (online) online.mount(ui, refresh);
    if (resume && this.players?.length) {
      // back from the cup / map screen: the same players, still locked in
      for (const q of this.players) {
        if (players.length >= max) break;
        players.push({ id: q.id, device: q.device, dcur: q.driverIndex ?? allowedD[0], kcur: q.kartIndex ?? allowedK[0], gcur: q.gliderIndex ?? allowedG[0], sub: 'glider', phase: 'done', color: q.color, acted: true, olName: q.olName });
      }
      refresh();
    } else join(this.p1Device());
    refresh();
  }

  makePlayer(p) {
    const input = this.input;
    return {
      id: p.id, device: p.device, charIndex: p.cursor, driverIndex: p.driver ?? null, kartIndex: p.kart ?? null, gliderIndex: p.glider ?? null, color: p.color,
      autoGas: this.settings.autoGas || p.device === 'touch',
      rumble: (s, ms) => input.rumble(p.device, s, ms),
    };
  }

  // ---- track select --------------------------------------------------------------------------------
  // online: { pick(def), back() } from js/online/online.js (the host picks for the room)
  showTracks(mode, online = null) {
    let focus = this.lastTrack ?? 0;
    const cards = TRACKS.map((t, i) => {
      const b = this.best[t.id];
      return `<div class="tcard" data-i="${i}"><img src="${this.thumbs[i]}" alt=""><div class="tn">${esc(t.name)}</div><div class="ts">${esc(t.subtitle)}</div>${mode === 'tt' && b ? `<div class="tb">Best ${fmt(b)}</div>` : ''}</div>`;
    }).join('') + `<div class="tcard rnd" data-i="${TRACKS.length}"><div class="q">?</div><div class="tn">Random</div><div class="ts">Surprise me</div></div>`;
    this.setScreen(`<div class="screen tracks"><div class="panel wide"><h2>${mode === 'tt' ? 'Time Trial' : mode === 'online' ? 'Online' : 'Quick Race'} · Choose a map</h2>
      <div class="tgrid">${cards}</div><div class="selfoot"><button class="bbtn" data-act="back">◀︎ Back</button><div class="hint2">${this.settings.cc}cc · ${this.settings.laps} laps · CPU ${this.settings.difficulty}</div><span></span></div></div></div>`);
    const n = TRACKS.length + 1;
    const refresh = () => this.ui.querySelectorAll('.tcard').forEach((c, i) => c.classList.toggle('focus', i === focus));
    const pick = (i) => {
      this.audio.sfx('select');
      const idx = i >= TRACKS.length ? Math.floor(Math.random() * TRACKS.length) : i;
      this.lastTrack = i;
      if (online) { online.pick(TRACKS[idx]); return; }
      this.startRace({ def: TRACKS[idx], mode });
    };
    const back = () => { if (online) online.back(); else this.showSelect(mode, true); };
    this.screen = {
      update: () => {
        for (const [, m] of this.menuEvents) {
          if (m.left) { focus = (focus + n - 1) % n; this.audio.sfx('click'); refresh(); }
          if (m.right) { focus = (focus + 1) % n; this.audio.sfx('click'); refresh(); }
          if (m.up) { focus = (focus + n - 5) % n; this.audio.sfx('click'); refresh(); }
          if (m.down) { focus = (focus + 5) % n; this.audio.sfx('click'); refresh(); }
          if (m.ok || m.start) { pick(focus); return; }
          if (m.back) { this.audio.sfx('back'); back(); return; }
        }
      },
      hover: (i) => { focus = i; refresh(); },
      click: (i) => pick(i),
      act: (a) => { if (a === 'back') back(); },
    };
    refresh();
  }

  // ---- racing ------------------------------------------------------------------------------------------
  // online: { pick(cup), back() } from js/online/online.js (the host picks a cup for the room)
  showCups(online = null) {
    let focus = Math.min(this.lastCup ?? 0, CUPS.length - 1), shown = -1;
    const trackOf = (id) => TRACKS.findIndex((t) => t.id === id);
    const cards = CUPS.map((c, i) => `<div class="cup" data-i="${i}" style="--cc:${c.color}"><div class="trophy">🏆</div><div class="cn">${esc(c.name)}</div><div class="cl">${c.tracks.length} races</div></div>`).join('');
    this.setScreen(`<div class="screen tracks cups"><div class="panel wide"><h2>${online ? 'Online · ' : ''}Grand Prix · Choose a cup</h2><div class="cupgrid">${cards}</div>
      <div class="cuppv"></div>
      <div class="selfoot"><button class="bbtn" data-act="back">◀︎ Back</button><div class="hint2">${this.settings.cc}cc · 12 racers · ${this.settings.laps} laps · CPU ${this.settings.difficulty}</div><span></span></div></div></div>`);
    // the focused cup's races, in order, with a picture of each map
    const preview = () => {
      if (shown === focus) return;
      shown = focus;
      const c = CUPS[focus];
      this.ui.querySelector('.cuppv').innerHTML = `<div class="cuph" style="--cc:${c.color}">${esc(c.name)} <span>· ${c.tracks.length} races</span></div>
        <div class="cuptracks">${c.tracks.map((id, n) => { const i = trackOf(id), t = TRACKS[i]; return `<div class="ctrack"><img src="${this.thumbs[i]}" alt=""><div class="cr">Race ${n + 1}</div><div class="tn">${esc(t.name)}</div><div class="ts">${esc(t.subtitle)}</div></div>`; }).join('')}</div>`;
    };
    const refresh = () => { this.ui.querySelectorAll('.cup').forEach((c, i) => c.classList.toggle('focus', i === focus)); preview(); };
    const pick = (i) => { this.lastCup = i; this.audio.sfx('select'); if (online) online.pick(CUPS[i]); else this.startGP(CUPS[i]); };
    const back = () => { if (online) online.back(); else this.showSelect('gp', true); };
    this.screen = {
      update: () => {
        for (const [, m] of this.menuEvents) {
          if (m.left || m.up) { focus = (focus + CUPS.length - 1) % CUPS.length; this.audio.sfx('click'); refresh(); }
          if (m.right || m.down) { focus = (focus + 1) % CUPS.length; this.audio.sfx('click'); refresh(); }
          if (m.ok || m.start) { pick(focus); return; }
          if (m.back) { this.audio.sfx('back'); back(); return; }
        }
      },
      hover: (i) => { focus = i; refresh(); },
      click: (i) => pick(i),
      act: (a) => { if (a === 'back') back(); },
    };
    refresh();
  }
  startGP(cup) {
    this.gp = { cup, round: 0, tracks: cup.tracks, points: new Map(), ent: new Map(), grid: null };
    this.nextGPRace();
  }
  nextGPRace() {
    const gp = this.gp;
    const def = TRACKS.find((t) => t.id === gp.tracks[gp.round]);
    this.startRace({ def, mode: 'gp', gpRound: gp.round + 1, gpTotal: gp.tracks.length, grid: gp.grid, gpName: gp.cup.name.toUpperCase() });
  }

  startRace(opts) {
    this.clearScreen();
    const ld = document.getElementById('loading');
    ld.querySelector('#load-text').textContent = `Building ${opts.def.name}…`;
    ld.classList.remove('hidden');
    this.audio.stopMusic();
    this.lastRaceOpts = opts;
    setTimeout(() => {
      if (isPhone()) this.players = this.players.slice(0, 1);   // no split screen on a phone
      const s = this.settings;
      this.buildRace({ ...opts, players: this.players, simple: !!s.simple, cc: CC[s.cc] || 0.92, difficulty: s.difficulty, racers: 12, laps: opts.mode === 'tt' ? 3 : s.laps, bestTime: opts.mode === 'tt' ? this.best[opts.def.id] : 0 });
      this.race.onDone = (res) => this.onRaceDone(res);
      ld.classList.add('hidden');
      this.screen = null;
    }, 60);
  }
  // build (and warm up) a race now; online races come through here too with their own options
  // attach = false: build it but don't show it yet (online races wait for the shared start)
  buildRace(opts, attach = true) {
    this.attract?.dispose(); this.attract = null;
    this.race?.dispose(); this.race = null;
    const s = this.settings;
    setDetail(s.quality, s.lego !== false);   // Fast graphics: lighter scenery; Legoized: brick-built props
    const race = new Race(this, opts);
    race.world.sun.shadow.mapSize.set(this.shadowSize, this.shadowSize);
    race.warmup(this.renderer);
    this.paused = false;
    if (!attach) return race;
    this.race = race;
    this.touchRoot.classList.toggle('hidden', !(opts.players || []).some((p) => p.device === 'touch'));
    return race;
  }

  pause(player) {
    if (this.race?.net) { this.online?.pause(); return; }   // online races never stop
    if (this.paused || !this.race) return;
    this.paused = true;
    this.audio.sfx('pause');
    for (const c of this.race.cams) c.kart.engine?.set(0, false, false);
    const resume = () => { this.resumeFullscreen(); this.paused = false; this.clearScreen(); };
    this.menu({
      title: 'Paused', cls: 'pause', sub: this.pauseNote(),
      items: [
        { label: 'Resume', action: resume },
        { label: 'Restart race', action: () => { this.paused = false; this.startRace(this.lastRaceOpts); } },
        { label: 'Options', action: () => this.showOptions(() => { this.paused = false; this.pause(player); }) },
        { label: 'Quit to menu', action: () => this.quitToMenu() },
      ],
      back: resume,
    });
    // Start also resumes
    const up = this.screen.update;
    this.screen.update = (dt) => { for (const [, m] of this.menuEvents) if (m.start && !m.ok) { resume(); return; } up(dt); };
  }

  quitToMenu() {
    this.online?.leave('menu');
    this.paused = false;
    this.race?.dispose(); this.race = null;
    this.gp = null;
    this.touchRoot.classList.add('hidden');
    this.startAttract();
    this.showMain();
  }

  onRaceDone(res) {
    const mode = this.race.mode;
    this.touchRoot.classList.add('hidden');
    for (const c of this.race.cams) c.kart.engine?.set(0, false, false);
    if (mode === 'tt') return this.showTTResult(res);
    const rows = res.map((r) => {
      const pts = mode === 'gp' ? POINTS[r.place - 1] || 0 : null, e = this.entrant(r);
      return `<div class="rrow${r.player ? ' me' : ''}" style="${r.player ? `--pc:${r.player.color}` : ''}"><span class="pl">${ORD(r.place)}</span><img src="${e.img}" alt=""><span class="nm">${esc(e.name)}${r.player ? ` <em>P${r.player.id + 1}</em>` : ''}</span><span class="tm">${r.estimated ? '--:--.--' : fmt(r.time)}</span>${pts !== null ? `<span class="pts">+${pts}</span>` : ''}</div>`;
    }).join('');
    if (mode === 'gp') res.forEach((r) => {
      const e = this.entrant(r);
      this.gp.ent.set(e.key, { charIndex: r.charIndex, driverIndex: r.driverIndex, kartIndex: r.kartIndex });
      this.gp.points.set(e.key, (this.gp.points.get(e.key) || 0) + (POINTS[r.place - 1] || 0));
    });
    const items = mode === 'gp'
      ? [{ label: 'Standings ▶︎', action: () => this.showStandings() }]
      : [{ label: 'Race again', action: () => this.startRace(this.lastRaceOpts) }, { label: 'Choose map', action: () => { this.race.dispose(); this.race = null; this.startAttract(); this.showTracks('race'); } }, { label: 'Main menu', action: () => this.quitToMenu() }];
    this.resultsMenu(`Results · ${this.race.opts.def.name}`, `<div class="results">${rows}</div>`, items);
  }

  resultsMenu(title, body, items, outside = '') {
    let focus = 0;
    this.hudRoot.classList.add('hidden');
    const html = `<div class="screen results-s">${outside}<div class="panel"><h2>${esc(title)}</h2>${body}<div class="list row">${items.map((it, i) => `<button class="mbtn${i === 0 ? ' focus' : ''}" data-i="${i}">${esc(it.label)}</button>`).join('')}</div></div></div>`;
    const refresh = () => this.ui.querySelectorAll('.mbtn').forEach((b, i) => b.classList.toggle('focus', i === focus));
    this.setScreen(html, {
      update: () => {
        for (const [, m] of this.menuEvents) {
          if (m.left || m.up) { focus = (focus + items.length - 1) % items.length; refresh(); this.audio.sfx('click'); }
          if (m.right || m.down) { focus = (focus + 1) % items.length; refresh(); this.audio.sfx('click'); }
          if (m.ok || m.start) { this.audio.sfx('select'); items[focus].action(); return; }
        }
      },
      hover: (i) => { focus = i; refresh(); },
      click: (i) => { this.audio.sfx('select'); items[i].action(); },
    });
  }

  // who a result / standings row is: their driver
  entrant(r) {
    const d = DRIVERS[r.driverIndex] || DRIVERS[0];
    return { key: 'd' + r.driverIndex, name: d.name, img: driverPortrait(d) };
  }
  playerKey(p) { return 'd' + p.driverIndex; }

  showStandings() {
    const gp = this.gp;
    const order = [...gp.points.entries()].map(([key, pts]) => ({ key, pts, ...gp.ent.get(key) })).sort((a, b) => b.pts - a.pts);
    const humanChars = new Map(this.players.map((p) => [this.playerKey(p), p]));
    const rows = order.map((o, n) => {
      const p = humanChars.get(o.key), e = this.entrant(o);
      return `<div class="rrow${p ? ' me' : ''}" style="${p ? `--pc:${p.color}` : ''}"><span class="pl">${ORD(n + 1)}</span><img src="${e.img}" alt=""><span class="nm">${esc(e.name)}${p ? ` <em>P${p.id + 1}</em>` : ''}</span><span class="pts big">${o.pts}</span></div>`;
    }).join('');
    gp.round++;
    // next grid: current standings reversed (leader starts at the back)
    gp.grid = [...order].reverse().map((o) => ({ charIndex: o.charIndex, driverIndex: o.driverIndex, kartIndex: o.kartIndex, player: humanChars.get(o.key) || null }));
    const last = gp.round >= gp.tracks.length;
    this.resultsMenu(last ? 'Final Standings' : `Standings after race ${gp.round}/${gp.tracks.length}`, `<div class="results">${rows}</div>`, last
      ? [{ label: 'Award ceremony ▶︎', action: () => this.showPodium(order) }]
      : [{ label: `Next: ${TRACKS.find((t) => t.id === gp.tracks[gp.round]).name} ▶︎`, action: () => this.nextGPRace() }, { label: 'Quit Grand Prix', action: () => this.quitToMenu() }]);
  }

  showPodium(order) {
    const top = order.slice(0, 3);
    const humanChars = new Map(this.players.map((p) => [this.playerKey(p), p]));
    const bestHuman = order.findIndex((o) => humanChars.has(o.key));
    const cupName = this.gp?.cup?.name || 'Cup';
    const msg = bestHuman === 0 ? `🏆 CHAMPION! You won the ${cupName}!` : bestHuman >= 0 && bestHuman < 3 ? `You finished ${ORD(bestHuman + 1)} overall — on the podium!` : `You finished ${ORD(bestHuman + 1)} overall. Try again!`;
    const cup = ['🥇', '🥈', '🥉'];
    const chars = top.some((o) => o.driverIndex >= 0);
    const podium = [1, 0, 2].map((n) => top[n] ? `<div class="pod p${n + 1}">${chars ? '' : `<img src="${this.entrant(top[n]).img}" alt="">`}<div class="nm">${esc(this.entrant(top[n]).name)}</div><div class="block">${cup[n]}<b>${n + 1}</b><span>${top[n].pts} pts</span></div></div>` : '').join('');
    const confetti = Array.from({ length: 60 }, (_, i) => `<i style="left:${Math.random() * 100}%;animation-delay:${(Math.random() * 3).toFixed(2)}s;background:${['#c91a09', '#f2cd37', '#0055bf', '#237841', '#fe8a18', '#fff'][i % 6]}"></i>`).join('');
    this.audio.sfx('finish');
    this.resultsMenu(`${cupName} · Award Ceremony`, `${chars ? '<canvas class="pod3d"></canvas>' : ''}<div class="podium${chars ? ' with3d' : ''}">${podium}</div><p class="cheer">${msg}</p>`, [
      { label: 'Main menu', action: () => this.quitToMenu() },
    ], `<div class="confetti">${confetti}</div>`);
    if (chars) this.podium3D(top);
  }

  // the top three drivers celebrate on the podium in 3D
  podium3D(top) {
    const cv = this.ui.querySelector('canvas.pod3d');
    if (!cv) return;
    const show = new Showcase(cv, { cam: [0, 4.4, 16], look: [0, 1.7, 0], fov: 32, spin: 0 });
    const spots = [[0, 1.2, 0], [-4.2, 0.7, 0.4], [4.2, 0.35, 0.4]];
    show.set(top.map((o, n) => ({ ch: KARTS[o.kartIndex] || CHARACTERS[o.charIndex] || KARTS[0], driver: DRIVERS[o.driverIndex], x: spots[n][0], y: spots[n][1], z: spots[n][2], ry: [0.2, 0.45, -0.45][n], phase: n === 0 ? 'win' : 'pre', idle: n !== 0 })), { plate: false });
    const cols = [0xf2cd37, 0xc0c6cc, 0xc8803a];
    top.forEach((o, n) => {
      const blk = new THREE.Mesh(new THREE.BoxGeometry(3.6, spots[n][1] + 0.01, 3.4), new THREE.MeshStandardMaterial({ color: cols[n], roughness: 0.4, metalness: 0.3 }));
      blk.position.set(spots[n][0], spots[n][1] / 2 - 0.005, spots[n][2]);
      show.scene.add(blk);
    });
    show.items.forEach((it, n) => { if (n) it.nextIdle = 0.4 + n * 0.5; });
    const d0 = DRIVERS[top[0].driverIndex];
    if (d0) setTimeout(() => this.audio.voice(d0.voice, 'win', 1), 500);
    const up = this.screen.update;
    this.screen.update = (dt) => { show.update(dt); up(dt); };
    this.cleanup = () => show.dispose();
  }

  showTTResult(res) {
    const r = res[0];
    const id = this.race.opts.def.id;
    const prev = this.best[id];
    const newBest = !prev || r.time < prev;
    if (newBest) { this.best[id] = r.time; save(TKEY, this.best); }
    const laps = r.laps.map((t, i) => `<div class="rrow"><span class="pl">Lap ${i + 1}</span><span class="nm"></span><span class="tm">${fmt(t)}</span></div>`).join('');
    this.resultsMenu(`Time Trial · ${this.race.opts.def.name}`, `<div class="results">${laps}<div class="rrow me" style="--pc:#ffd23a"><span class="pl">Total</span><span class="nm">${newBest ? '⭐ NEW BEST!' : `Best ${fmt(prev)}`}</span><span class="tm">${fmt(r.time)}</span></div></div>`, [
      { label: 'Retry', action: () => this.startRace(this.lastRaceOpts) },
      { label: 'Choose map', action: () => { this.race.dispose(); this.race = null; this.startAttract(); this.showTracks('tt'); } },
      { label: 'Main menu', action: () => this.quitToMenu() },
    ]);
  }
}

const ITEM_HELP = {
  boost: 'A burst of speed. Great for cutting across the grass.',
  boost3: 'Three turbo boosts in a row.',
  rocket: 'Homes in on the racer ahead of you.',
  cannon: 'Fires straight and bounces off walls. Hold back to fire behind.',
  trap: 'Drop a pile of loose bricks. Ouch! Stick ↑ throws it forward.',
  shield: 'A bubble that blocks the next hit.',
  golden: 'Invincible and extra fast. Bowl other karts over!',
  bullet: 'Turn into a giant brick bullet that drives itself at huge speed, blasting karts aside and spinning them out.',
  rocket3: 'Three homing rockets.',
  cannon3: 'Three bouncer bricks.',
  mega: 'Grow huge for 8 seconds and flatten anyone you touch. A hit shrinks you back.',
  seeker: 'Flies over the track to whoever is in 1st and explodes on them.',
  ice: 'A bouncing brick that freezes whoever it hits in an ice block.',
  ghost: 'Turn invisible to items for 5 seconds and steal an item from a rival.',
  puddle: 'Leave a slippery paint puddle that spins out everyone who drives through it.',
  fakebox: 'Looks like an item box, but it blows up anyone who touches it.',
  bomb: 'Throw it forward (or drop it back). It blows up after a moment with a big blast.',
  studbag: 'Five gold studs at once, plus a little boost.',
  goldturbo: 'Boost as many times as you like for 7 seconds.',
  boomerang: 'Flies out, spins racers it hits, then comes back to you.',
  ink: 'Splats ink over the screens of everyone ahead of you.',
  horn: 'A shockwave that destroys nearby items (even the Leader Seeker) and spins nearby karts.',
};

function logoHTML() {
  const cols = ['#c91a09', '#f2cd37', '#0055bf', '#237841', '#fe8a18'];
  const word = (w, o) => [...w].map((ch, i) => `<span class="lb" style="--c:${cols[(i + o) % cols.length]}">${ch}</span>`).join('');
  return `<div class="lrow">${word('BRICK', 0)}</div><div class="lrow">${word('KART', 2)}</div>`;
}
function hintHTML(back) {
  return `<span><b>A</b>/<b>Enter</b> select</span>${back ? `<span><b>B</b>/<b>Esc</b> ${back}</span>` : ''}<span>Mouse & touch work too</span>`;
}

// boot
function boot() {
  const lt = document.getElementById('load-text');
  try {
    const test = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!test) throw new Error('WebGL is not available in this browser.');
    lt.textContent = 'Snapping bricks together…';
    setTimeout(() => {
      try { window.game = new Game(); window.BK = { TRACKS, CHARACTERS, Race }; } catch (e) { console.error(e); lt.textContent = 'Oops: ' + e.message; }
    }, 30);
  } catch (e) {
    lt.textContent = e.message;
  }
}
boot();
