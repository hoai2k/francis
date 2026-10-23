// Brick Kart: game shell. Renderer, menus, player join/character select,
// track select, options, Grand Prix / Quick Race / Time Trial flow,
// results, standings and the podium.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Input, isTouchDevice } from './input.js';
import { Audio } from './audio.js';
import { Race } from './race.js';
import { TRACKS, CUPS } from './tracks.js';
import { CHARACTERS } from './characters.js';
import { DRIVERS } from './driver.js';
import { KARTS } from './vehicles.js';
import { GLIDERS, gliderIndex } from './gliders.js';
import { ABILITY } from './abilities.js';
import { Showcase, driverPortrait } from './showcase.js';
import { ICONS, ITEMS } from './items.js';
import { setDetail } from './decor.js';
import { createChrome, requestFullscreen, exitFullscreen, fullscreenElement, canFullscreen, standalone } from './chrome.js';
import { fmt } from './hud.js';
import { SKEY, TKEY, save, loadSettings, loadRecords, loadPicks } from './settings.js';
import { PCOL, MAX_PLAYERS, esc, hex, isPhone } from './menu-kit.js';
import { showSelect } from './select.js';

const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0];
const CC = { 50: 0.8, 100: 0.92, 150: 1.06, 200: 1.22 };
const MOBILE = isTouchDevice() && Math.min(screen.width, screen.height) < 820;
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

const ORD = (n) => n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

class Game {
  constructor() {
    this.settings = loadSettings(MOBILE);
    this.best = loadRecords();
    this.picks = loadPicks();
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
    if (this.race && !this.paused && !this.screen) this.dropIn();
    const race = this.race || this.attract;
    if (race && !this.paused && dt > 0) {
      const steps = dt > 1 / 45 ? 2 : 1;
      for (let i = 0; i < steps; i++) race.update(dt / steps);
    }
    if (race && !window.__bkNoRender) race.render(this.renderer);
  }

  // the driver, kart and glider last picked in player slot `id` (indices), or null if none is saved
  savedLook(id) {
    const c = this.picks?.chars?.[id];
    const driver = c ? DRIVERS.findIndex((d) => d.id === c.driver) : -1;
    if (driver < 0) return null;
    const kart = KARTS.findIndex((k) => k.id === c.kart), glider = GLIDERS.findIndex((g) => g.id === c.glider);
    return { driver, kart: kart >= 0 ? kart : null, glider: glider >= 0 ? glider : null };
  }
  // a controller that isn't playing presses A or Start during a race: it joins by taking over a CPU
  // kart (see Race.addPlayer; online, the host hands one over: Online.dropIn), in the look last
  // picked for its player slot, and stays in for the races after
  dropIn() {
    const race = this.race, online = race.net ? this.online : null;
    const pending = online?.drops || [];
    const using = new Set(this.players.map((p) => p.device));
    for (const dev of this.input.pads()) {
      if (using.has(dev) || !(this.input.pEdge(dev, 0) || this.input.pEdge(dev, 9))) continue;
      // a press always gets an answer: joining, or why not
      const wait = pending.find((d) => d.player.device === dev);
      if (wait) { this.toast(`🎮 P${wait.slot + 1} is joining…`); return; }
      const ids = new Set([...this.players.map((p) => p.id), ...pending.map((d) => d.slot), ...(online?.local || []).map((p) => p.slot)]);
      let id = 0; while (ids.has(id)) id++;
      const why = this.dropInBlock(race, online, id);
      if (why) { this.audio.sfx('back'); this.toast(`🎮 Can't join: ${why}`); return; }
      const p = this.makePlayer({ id, device: dev, cursor: 0, color: PCOL[id] });
      if (online) {
        const r = online.dropIn(p, this.savedLook(id));
        if (r !== true) { this.audio.sfx('back'); this.toast(`🎮 Can't join: ${r}`); }
        return;
      }
      const k = race.addPlayer(p, this.savedLook(id));
      if (!k) { this.audio.sfx('back'); this.toast("🎮 Can't join: no CPU kart is free to take over right now"); return; }
      this.players.push(p);
      this.players.sort((a, b) => a.id - b.id);
      this.audio.sfx('select');
      this.toast(`🎮 P${id + 1} joined, driving ${k.driver?.name || 'a CPU kart'}`);
      return;
    }
  }
  // why a spare controller can't drop in right now (null: it can)
  dropInBlock(race, online, id) {
    if (isPhone()) return 'split screen isn\'t available on a phone';
    if (race.mode === 'tt') return 'Time Trial is a solo race';
    if (id >= MAX_PLAYERS || this.players.length >= MAX_PLAYERS) return `${MAX_PLAYERS} players on one screen is the most`;
    if (online) return !race.net || race.net.ended || online.view !== 'race' ? 'this race is finishing, so join the next one' : null;
    if (race.doneTimer >= 0 || race.finishedCalled) return 'this race is finishing, so join the next one';
    if (!race.dropInKart()) return 'no CPU kart is free to take over right now (try again in a moment)';
    return null;
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

  // How to Play: short sections that open and close (the basics and the controls for the device in
  // use start open). Controller / keyboard: ↑ ↓ move between sections and scroll through a long open
  // one, A / Enter opens or closes, the right stick scrolls, B / Esc goes back.
  showHelp(back) {
    const card = (k) => `<div class="it"><span class="ic">${ICONS[k]}</span><b>${ITEMS[k].name}</b><span>${ITEM_HELP[k] ?? ABILITY[k]?.help ?? ''}</span></div>`;
    const base = Object.keys(ITEMS).filter((k) => !ABILITY[k]), powers = Object.keys(ITEMS).filter((k) => ABILITY[k]);
    const rows = (r) => `<table>${r.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
    const sections = [
      { id: 'basics', title: '🏁 The basics', html: `<ul>
        <li>Race the laps and cross the line first.</li>
        <li>Drive through <b>? boxes</b> for power-ups, then use them on your rivals.</li>
        <li><b>Drift</b> through corners for a speed boost.</li>
        <li>Pick up <b>gold studs</b> to go faster.</li></ul>` },
      { id: 'pad', title: '🎮 Controller', html: rows([
        ['Steer', 'Left stick / D-pad'], ['Accelerate', 'A or RT'], ['Brake / reverse', 'B or LT'],
        ['Hop & drift', 'RB (hold while turning)'], ['Use item', 'LB, X or Y'], ['Throw back / forward', 'Hold stick ↓ / ↑ + item'],
        ['Look behind', 'Press a stick'], ['Pause', 'Start'], ['Join mid-race', 'A or Start on a spare controller: takes over a CPU kart as your saved racer']]) },
      { id: 'kb', title: '⌨️ Keyboard', html: rows([
        ['Steer', 'A / D or ← / →'], ['Accelerate', 'W or ↑'], ['Brake / reverse', 'S or ↓'],
        ['Hop & drift', 'Space (hold while turning)'], ['Use item', 'E or Shift'], ['Throw back / forward', 'Hold S + item / R'],
        ['Look behind', 'Q'], ['Pause', 'Esc / P'],
        ['2nd keyboard player', 'Join with Right Shift. Arrows steer, Right Shift drifts, Enter uses an item, \' throws it forward']]) },
      { id: 'touch', title: '📱 Touch', html: `<ul>
        <li>Drag a finger left / right anywhere to steer; drag it down to brake.</li>
        <li>While steering, touch with a second finger to hop and drift.</li>
        <li>ITEM (bottom right) shows what you hold: tap to use it, flick up to throw it forward, flick down to fire it behind.</li>
        <li>Gas is automatic.</li></ul>` },
      { id: 'tips', title: '💡 Racing tips', html: `<ul>
        <li>Hold drift through a corner until the sparks turn <b style="color:#7fd4ff">blue</b>, <b style="color:#ff9a1a">orange</b>, then <b style="color:#d05aff">purple</b>, then let go for a mini-turbo.</li>
        <li>Press drift in mid-air off a ramp to do a trick and land with a boost.</li>
        <li>Each gold stud raises your top speed, up to 10. Getting hit drops some.</li>
        <li>Hold accelerate just as the second start light comes on for a rocket start.</li>
        <li>Orange arrow pads give a boost.</li>
        <li>Gliders: steer while you fly. Come down on a rooftop to drive across it, then drive off the edge to glide again.</li></ul>` },
      { id: 'items', title: `🎁 Power-ups (${base.length})`, html: `<p class="sub">Racers further back get stronger ones.</p><div class="items">${base.map(card).join('')}</div>` },
      { id: 'powers', title: `🎬 Movie &amp; game powers (${powers.length})`, html: `<p class="sub">They turn up on every track (in Simplified mode, only on their own map).</p><div class="items">${powers.map(card).join('')}</div>` },
    ];
    const dev = this.lastDevice || this.input.lastDevice || 'kb';
    const open = new Set(['basics', dev.startsWith('pad') ? 'pad' : dev === 'touch' ? 'touch' : 'kb']);
    let focus = 0;
    this.setScreen(`<div class="screen help"><div class="panel wide"><h2>How to Play</h2>
      <div class="acc">${sections.map((sc, i) => `<section class="sec${open.has(sc.id) ? ' open' : ''}">
        <button class="mbtn shead${i === focus ? ' focus' : ''}" data-i="${i}" aria-expanded="${open.has(sc.id)}"><span>${sc.title}</span><span class="chev">▾</span></button>
        <div class="sbody">${sc.html}</div></section>`).join('')}</div>
      <div class="hint"><span><b>↑</b><b>↓</b> move &amp; scroll</span><span><b>A</b>/<b>Enter</b> open / close</span><span><b>B</b>/<b>Esc</b> Back</span><span>Right stick scrolls</span></div></div></div>`, {
      update: (dt) => {
        const box = this.ui.querySelector('.help .acc');
        if (!box) return;
        const heads = [...box.querySelectorAll('.shead')];
        const view = box.getBoundingClientRect(), step = Math.max(80, view.height * 0.45);
        const show = () => {
          heads.forEach((h, i) => h.classList.toggle('focus', i === focus));
          const r = heads[focus].getBoundingClientRect();
          if (r.top < view.top) box.scrollTop -= view.top - r.top + 8;
          else if (r.bottom > view.bottom) box.scrollTop += r.bottom - view.bottom + 8;
        };
        for (const [, m] of this.menuEvents) {
          if (m.back) { this.audio.sfx('back'); back(); return; }
          if (m.ok || m.start) { toggle(focus); return; }
          if (m.down) {
            // read on through a long open section before moving to the next heading
            const next = heads[focus + 1];
            const end = next ? next.getBoundingClientRect().top : box.scrollHeight - box.scrollTop + view.top;
            if (end > view.bottom + 4) box.scrollTop += step;
            else if (next) { focus++; this.audio.sfx('click'); show(); }
          }
          if (m.up) {
            const prev = heads[focus - 1];
            if (prev && prev.getBoundingClientRect().top < view.top - step) box.scrollTop -= step;
            else if (prev) { focus--; this.audio.sfx('click'); show(); }
            else if (box.scrollTop > 0) box.scrollTop -= step;
          }
        }
        // the right stick scrolls freely
        for (const d of this.input.pads()) {
          const ay = this.input.padNow.get(d)?.ax[3] || 0;
          if (Math.abs(ay) > 0.2) box.scrollTop += ay * 900 * dt;
        }
      },
      hover: (i) => { if (i !== focus) { focus = i; this.ui.querySelectorAll('.help .shead').forEach((h, j) => h.classList.toggle('focus', j === focus)); } },
      click: (i) => toggle(i),
      act: (a) => { if (a === 'back') back(); },
      dismiss: back,
    });
    const toggle = (i) => {
      const sec = this.ui.querySelectorAll('.help .sec')[i];
      if (!sec) return;
      focus = i;
      const on = sec.classList.toggle('open');
      const head = sec.querySelector('.shead');
      head.setAttribute('aria-expanded', on);
      this.ui.querySelectorAll('.help .shead').forEach((h, j) => h.classList.toggle('focus', j === focus));
      this.audio.sfx(on ? 'select' : 'back');
      // an opened section scrolls up to the top of the list so its contents show; a closed one stays in view
      const box = this.ui.querySelector('.help .acc'), hr = head.getBoundingClientRect(), br = box.getBoundingClientRect();
      if (on) box.scrollTop += hr.top - br.top - 4;
      else if (hr.top < br.top || hr.bottom > br.bottom) box.scrollTop += hr.top - br.top - 4;
    };
  }

  // ---- racer select with drop-in players -----------------------------------------------------------
  // Each player picks a driver from the grid (A locks it in), then flips through karts with ◀︎ ▶︎ in
  // their own preview (A locks that in too), so nobody waits on anyone else.
  // resume: coming back from the cup / map screen, everyone is still locked in
  // online: hooks from js/online/online.js (one player per screen; a room panel instead of the
  // player slots; readiness, taken drivers and the Race button go through it)
  // the character select screen (js/select.js)
  showSelect(mode, resume = false, online = null) { showSelect(this, mode, resume, online); }

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
      const b = this.best[this.bestKey(t.id)];
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
      // a Grand Prix grid: anyone who dropped in mid-race drives the racer they took over
      if (opts.grid) for (const p of this.players) {
        if (opts.grid.some((g) => g.player === p)) continue;
        const g = opts.grid.find((g) => !g.player && g.driverIndex === p.driverIndex);
        if (g) g.player = p;
      }
      const s = this.settings;
      this.buildRace({ ...opts, players: this.players, simple: !!s.simple, cc: CC[s.cc] || 0.92, difficulty: s.difficulty, racers: 12, laps: opts.mode === 'tt' ? 3 : s.laps, ttKey: this.bestKey(opts.def.id), bestTime: opts.mode === 'tt' ? this.best[this.bestKey(opts.def.id)] : 0 });
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

  bestKey(mapId) { return `${mapId}@${this.settings.cc}`; }

  showTTResult(res) {
    const r = res[0];
    // the class the run was driven in, even if Options changed it since
    const id = this.race.opts.ttKey;
    const prev = this.best[id];
    const newBest = !prev || r.time < prev;
    if (newBest) { this.best[id] = r.time; save(TKEY, this.best); }
    const laps = r.laps.map((t, i) => `<div class="rrow"><span class="pl">Lap ${i + 1}</span><span class="nm"></span><span class="tm">${fmt(t)}</span></div>`).join('');
    this.resultsMenu(`Time Trial · ${this.race.opts.def.name} · ${id.split('@')[1]}cc`, `<div class="results">${laps}<div class="rrow me" style="--pc:#ffd23a"><span class="pl">Total</span><span class="nm">${newBest ? '⭐ NEW BEST!' : `Best ${fmt(prev)}`}</span><span class="tm">${fmt(r.time)}</span></div></div>`, [
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
  trap: 'Drop a pile of loose bricks. Ouch! Throw it forward with stick ↑, R or a flick up.',
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
