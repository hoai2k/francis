// Brick Kart: game shell. Renderer, menus, player join/character select,
// track select, options, Grand Prix / Quick Race / Time Trial flow,
// results, standings and the podium.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Input, KB2_JOIN, isTouchDevice } from './input.js';
import { Audio } from './audio.js';
import { Race } from './race.js';
import { TRACKS, CUPS } from './tracks.js';
import { CHARACTERS, buildKart, bodyName } from './characters.js';
import { DRIVERS, UNIVERSES, combinedStats } from './driver.js';
import { Showcase, driverPortrait, kartPortrait } from './showcase.js';
import { ICONS, ITEMS } from './items.js';
import { fmt } from './hud.js';

const PCOL = ['#ff4a3a', '#3b8bff', '#3bdc5a', '#ffc93b'];
const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0];
const CC = { 50: 0.8, 100: 0.92, 150: 1.06, 200: 1.22 };
const SKEY = 'brickkart.settings.v1', TKEY = 'brickkart.tt.v1';
const MOBILE = isTouchDevice() && Math.min(screen.width, screen.height) < 820;

function load(key, def) { try { return { ...def, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { ...def }; } }
function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ORD = (n) => n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

class Game {
  constructor() {
    this.settings = load(SKEY, { cc: 100, difficulty: 'normal', laps: 3, racers: 13, music: 0.5, sfx: 0.8, autoGas: false, useChars: true, quality: MOBILE ? 'low' : 'high' });
    // Use Characters became the default: switch it on once for players who saved settings before
    if (!this.settings.charsDefault) { this.settings.useChars = true; this.settings.charsDefault = 1; save(SKEY, this.settings); }
    this.best = load(TKEY, {});
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
    this.touchRoot = document.getElementById('touch');
    this.input.buildTouch(this.touchRoot);
    this.menuEvents = [];
    this.players = [];
    this.race = null; this.attract = null;
    this.paused = false;
    addEventListener('resize', () => this.resize());
    this.resize();
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
    if (q.get('gallery')) {
      // developer view of the movie-character drivers
      import('./gallery.js').then(({ Gallery }) => { this.attract = new Gallery(this, q); });
    } else if (q.get('quick')) {
      // developer shortcut: ?quick=<trackId>&char=<n>&players=<n>
      const np = +(q.get('players') || 1);
      // &chars=1 races with movie-character drivers, &driver=<id> picks player 1's driver
      if (q.get('chars') || q.get('driver')) this.settings.useChars = q.get('chars') !== '0';
      const d0 = Math.max(0, DRIVERS.findIndex((d) => d.id === q.get('driver')));
      this.players = Array.from({ length: np }, (_, i) => this.makePlayer({ id: i, device: i === 0 ? 'kb' : 'pad' + (i - 1), cursor: (+(q.get('char') || 0) + i) % 8, driver: (d0 + i) % Math.max(1, DRIVERS.length), color: PCOL[i] }));
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

  // Player 1 is always there: the device that was driving the menus, else a connected
  // controller, else touch / keyboard.
  p1Device() {
    const pads = this.input.pads();
    if (this.lastDevice && (this.lastDevice === 'kb' || pads.includes(this.lastDevice))) return this.lastDevice;
    if (pads.length) return pads[0];
    return isTouchDevice() ? 'touch' : 'kb';
  }

  // "Use Characters": karts get movie-character drivers
  charsOn() { return !!this.settings.useChars && DRIVERS.length > 0; }

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

  // ---- portraits & thumbnails ------------------------------------------------------
  // classic racer portraits are only needed in menus, so they're rendered on first use
  get portraits() { return (this._portraits ||= this.renderPortraits()); }
  get thumbs() { return (this._thumbs ||= TRACKS.map((t) => this.trackThumb(t))); }
  renderPortraits() {
    const size = 256;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(size, size); r.setPixelRatio(1);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    const pm = new THREE.PMREMGenerator(r);
    const scene = new THREE.Scene();
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.8;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.4));
    const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(3, 5, 4); scene.add(d);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.set(4.2, 3.0, 6.2); cam.lookAt(0, 0.85, 0.1);
    const out = CHARACTERS.map((ch) => {
      const k = buildKart(ch);
      k.root.rotation.y = 0.35;
      k.head.rotation.y = 0.3;
      scene.add(k.root);
      r.render(scene, cam);
      const url = r.domElement.toDataURL('image/png');
      scene.remove(k.root);
      return url;
    });
    r.dispose(); r.forceContextLoss?.();
    return out;
  }
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
    const race = this.race || this.attract;
    if (race && !this.paused && dt > 0) {
      const steps = dt > 1 / 45 ? 2 : 1;
      for (let i = 0; i < steps; i++) race.update(dt / steps);
    }
    if (race) race.render(this.renderer);
  }

  startAttract() {
    this.attract?.dispose();
    const def = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    this.attract = new Race(this, { def, mode: 'attract', cc: 0.95, difficulty: 'hard', laps: 99 });
    this.attract.world.sun.shadow.mapSize.set(this.shadowSize, this.shadowSize);
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
    const el = e.target.closest('[data-i], [data-act]');
    if (!el || !this.screen) return;
    this.audio.unlock();
    if (el.dataset.act && this.screen.act) { this.screen.act(el.dataset.act, el); return; }
    if (el.dataset.i !== undefined && this.screen.click) this.screen.click(+el.dataset.i, e);
  }

  // generic vertical menu
  menu({ title, items, back, sub = '', cls = '' }) {
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
    };
    this.setScreen(render(), sc);
  }

  // ---- screens ------------------------------------------------------------------------
  enterFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      p?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    } catch { /* not allowed here */ }
  }
  toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    else this.enterFullscreen();
  }

  showTitle() {
    this.onTitle = true;
    this.hudRoot.classList.add('hidden');
    this.setScreen(`<div class="screen title"><div class="logo">${logoHTML()}</div>
      <div class="tagline">A brick-built kart racer · ${TRACKS.length} maps · 16 racers + ${DRIVERS.length} movie drivers · gliders · 1–4 players</div>
      <button class="press" data-act="start">PRESS <b>START</b> · <b>ENTER</b> · <b>TAP</b></button>
      <div class="pads-note">🎮 Controllers supported — plug in up to 4 for split-screen</div></div>`, {
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
        { label: 'Options', action: () => this.showOptions(() => this.showMain()) },
        { label: 'How to Play', action: () => this.showHelp(() => this.showMain()) },
      ],
      back: () => this.showTitle(),
    });
  }

  showOptions(back) {
    const s = this.settings;
    const cyc = (key, list, dir) => { const i = list.indexOf(s[key]); s[key] = list[(i + dir + list.length) % list.length]; save(SKEY, s); };
    const vol = (key, dir) => { s[key] = Math.round(Math.max(0, Math.min(1, s[key] + dir * 0.1)) * 10) / 10; save(SKEY, s); this.audio.setVolumes(s.music, s.sfx); };
    const ccs = [50, 100, 150, 200], diffs = ['easy', 'normal', 'hard'], laps = [1, 2, 3, 4, 5], racers = [4, 8, 10, 13, 16];
    this.menu({
      title: 'Options',
      items: [
        { label: 'Engine class', value: () => s.cc + 'cc', left: () => cyc('cc', ccs, -1), right: () => cyc('cc', ccs, 1) },
        { label: 'CPU racers', value: () => s.difficulty[0].toUpperCase() + s.difficulty.slice(1), left: () => cyc('difficulty', diffs, -1), right: () => cyc('difficulty', diffs, 1) },
        { label: 'Racers per race', value: () => String(s.racers), left: () => cyc('racers', racers, -1), right: () => cyc('racers', racers, 1) },
        { label: 'Laps', value: () => String(s.laps), left: () => cyc('laps', laps, -1), right: () => cyc('laps', laps, 1) },
        { label: 'Use Characters', value: () => (s.useChars ? 'On' : 'Off'), left: () => { s.useChars = !s.useChars; save(SKEY, s); }, right: () => { s.useChars = !s.useChars; save(SKEY, s); } },
        { label: 'Auto-accelerate', value: () => (s.autoGas ? 'On' : 'Off'), left: () => { s.autoGas = !s.autoGas; save(SKEY, s); }, right: () => { s.autoGas = !s.autoGas; save(SKEY, s); } },
        { label: 'Music', value: () => Math.round(s.music * 10) + '/10', left: () => vol('music', -1), right: () => vol('music', 1) },
        { label: 'Sound FX', value: () => Math.round(s.sfx * 10) + '/10', left: () => vol('sfx', -1), right: () => vol('sfx', 1) },
        { label: 'Fullscreen', value: () => (document.fullscreenElement || document.webkitFullscreenElement ? 'On' : 'Off'), left: () => this.toggleFullscreen(), right: () => this.toggleFullscreen() },
        { label: 'Graphics', value: () => (s.quality === 'high' ? 'High' : 'Fast'), left: () => { cyc('quality', ['high', 'low'], 1); this.applyQuality(); }, right: () => { cyc('quality', ['high', 'low'], 1); this.applyQuality(); } },
        { label: 'Done', action: back },
      ],
      back,
    });
  }

  showHelp(back) {
    const items = Object.keys(ITEMS).map((k) => `<div class="it"><span class="ic">${ICONS[k]}</span><b>${ITEMS[k].name}</b><span>${ITEM_HELP[k]}</span></div>`).join('');
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
          <h3>📱 Touch</h3><p>◀ ▶ steer, DRIFT, ITEM, BRAKE. Gas is automatic.</p></div>
        <div><h3>🏁 Tips</h3><ul>
          <li>Hold drift through corners until the sparks turn <b style="color:#7fd4ff">blue</b>, <b style="color:#ff9a1a">orange</b>, then <b style="color:#d05aff">purple</b>, then let go for a mini-turbo.</li>
          <li>Press drift in mid-air off a ramp to do a trick and land with a boost.</li>
          <li>Collect gold studs: each one raises your top speed, up to 10. Getting hit drops some.</li>
          <li>Hold accelerate right as the second light comes on for a rocket start.</li>
          <li>Orange arrow pads give a boost.</li></ul></div>
      </div>
      <h3>Power-ups (23) · racers further back get stronger ones</h3><div class="items">${items}</div>
      <div class="hint">${hintHTML('Back')}</div></div></div>`, {
      update: () => { for (const [, m] of this.menuEvents) if (m.back || m.ok || m.start) { this.audio.sfx('back'); back(); return; } },
      act: (a) => { if (a === 'back') back(); },
    });
  }

  // ---- character select with drop-in players -------------------------------------------------
  showSelect(mode) {
    if (this.charsOn()) return this.showSelectChars(mode);
    this.mode = mode;
    const max = mode === 'tt' ? 1 : 4;
    const players = [];   // { id, device, cursor, locked, color }
    const taken = () => new Set(players.filter((p) => p.locked).map((p) => p.cursor));
    const cards = CHARACTERS.map((ch, i) => `
      <div class="ccard" data-i="${i}" style="--kc:${hex(ch.kart)}">
        <img src="${this.portraits[i]}" alt="">
        <div class="nm">${esc(ch.name)}</div><div class="bl">${esc(ch.blurb)}</div>
        <div class="stats">${['speed', 'accel', 'handling', 'weight'].map((s) => `<div class="st"><span>${s.slice(0, 5).toUpperCase()}</span><i style="width:${ch.stats[s] * 20}%"></i></div>`).join('')}</div>
        <div class="tags"></div></div>`).join('');
    const titles = { gp: 'Grand Prix', race: 'Quick Race', tt: 'Time Trial' };
    this.setScreen(`<div class="screen select"><div class="panel wide"><h2>${titles[mode]} · Choose your racer</h2>
      <div class="joinbar"></div>
      <div class="cgrid">${cards}</div>
      <div class="selfoot"><button class="bbtn" data-act="back">◀ Back</button><div class="hint2"></div><button class="bbtn go" data-act="go">Race! ▶</button></div></div></div>`);
    const deviceLabel = (d) => d === 'kb' ? (this.input.split ? 'Keys WASD' : 'Keyboard') : d === 'kb2' ? 'Keys Arrows' : d === 'touch' ? 'Touch' : this.input.padName(d);
    const refresh = () => {
      const tk = taken();
      this.ui.querySelectorAll('.ccard').forEach((c, i) => {
        const here = players.filter((p) => p.cursor === i);
        c.querySelector('.tags').innerHTML = here.map((p) => `<span class="ptag${p.locked ? ' lock' : ''}" style="background:${p.color}">P${p.id + 1}${p.locked ? ' ✓' : ''}</span>`).join('');
        c.classList.toggle('taken', tk.has(i));
        c.style.outline = here.length ? `4px solid ${here[here.length - 1].color}` : '';
      });
      const bar = this.ui.querySelector('.joinbar');
      let html = '';
      for (let s = 0; s < max; s++) {
        const p = players[s];
        html += p ? `<div class="slot on" style="--pc:${p.color}"><b>P${p.id + 1}</b> ${esc(deviceLabel(p.device))}<em>${p.locked ? esc(CHARACTERS[p.cursor].name) : 'choosing…'}</em></div>`
          : `<div class="slot"><b>P${s + 1}</b> ${s === 0 ? 'Press A / Enter / tap a racer' : 'Press A to join'}</div>`;
      }
      bar.innerHTML = html;
      const ready = players.length && players.every((p) => p.locked);
      this.ui.querySelector('.go').classList.toggle('ready', !!ready);
      this.ui.querySelector('.hint2').innerHTML = ready ? 'All set! Press <b>A</b> / <b>Start</b> / <b>Enter</b> to race' : (mode !== 'tt' ? 'More players: press <b>A</b> on another controller · 2nd keyboard: <b>Right Shift</b>' : 'Time Trial is solo: beat your best time');
    };
    const join = (device) => {
      if (players.length >= max || players.some((p) => p.device === device)) return null;
      const id = [0, 1, 2, 3].find((n) => !players.some((p) => p.id === n));
      const tk = taken();
      let cursor = 0; while (tk.has(cursor)) cursor++;
      const p = { id, device, cursor, locked: false, color: PCOL[id] };
      players.push(p);
      players.sort((a, b) => a.id - b.id);
      this.audio.sfx('join');
      refresh();
      return p;
    };
    const go = () => {
      if (!players.length || !players.every((p) => p.locked)) return;
      this.audio.sfx('select');
      this.players = players.map((p) => this.makePlayer(p));
      if (mode === 'gp') this.showCups();
      else this.showTracks(mode);
    };
    const leave = (p) => {
      players.splice(players.indexOf(p), 1);
      if (p.device === 'kb2') this.input.split = false;
      this.audio.sfx('back');
      refresh();
    };
    const back = () => { this.input.split = false; this.showMain(); };
    this.screen = {
      update: () => {
        // keyboard 2 join
        if (mode !== 'tt' && players.some((p) => p.device === 'kb') && !players.some((p) => p.device === 'kb2') && this.input.edge && KB2_JOIN.some((k) => this.input.edge.has(k))) {
          this.input.split = true; join('kb2');
        }
        for (const [dev, m] of this.menuEvents) {
          let p = players.find((q) => q.device === dev);
          if (!p) {
            if (m.ok || m.start) {
              if (players.length === 0 && dev === 'kb2') continue;
              p = join(dev);
            } else if (m.back && players.length === 0) { back(); return; }
            continue;
          }
          const NC = CHARACTERS.length, cols = matchMedia('(max-width: 820px)').matches ? 4 : 8;
          let moved = false;
          if (!p.locked) {
            if (m.left) { p.cursor = (p.cursor + NC - 1) % NC; moved = true; }
            if (m.right) { p.cursor = (p.cursor + 1) % NC; moved = true; }
            if (m.up) { p.cursor = (p.cursor + NC - cols) % NC; moved = true; }
            if (m.down) { p.cursor = (p.cursor + cols) % NC; moved = true; }
            if (moved) { this.audio.sfx('click'); refresh(); }
            if (m.ok && !taken().has(p.cursor)) { p.locked = true; this.audio.sfx('select'); refresh(); continue; }
            if (m.back) { if (p === players[0]) { back(); return; } leave(p); continue; }
          } else {
            if (m.back) { p.locked = false; this.audio.sfx('back'); refresh(); continue; }
            if (m.ok || m.start) { go(); return; }
          }
          if (m.start) go();
        }
      },
      click: (i) => {
        let p = players.find((q) => q.device === 'touch' || q.device === 'kb') || players[0];
        if (!p) p = join(isTouchDevice() ? 'touch' : 'kb');
        if (!p) return;
        if (taken().has(i) && !(p.locked && p.cursor === i)) return;
        p.cursor = i; p.locked = true;
        this.audio.sfx('select');
        refresh();
      },
      act: (a) => { if (a === 'back') back(); if (a === 'go') go(); },
    };
    join(this.p1Device());
    refresh();
  }

  // ---- "Use Characters" select: pick a movie-character driver, then a kart ----------------------------
  showSelectChars(mode) {
    this.mode = mode;
    const max = mode === 'tt' ? 1 : 4;
    const ND = DRIVERS.length, NK = CHARACTERS.length;
    const players = [];   // { id, device, dcur, kcur, phase: 'driver' | 'kart' | 'done', color }
    this.charPicks ||= {};
    const uni = (id) => UNIVERSES.find((u) => u.id === id) || { name: id, color: '#fff' };
    let groups = '';
    for (const u of UNIVERSES) {
      const list = DRIVERS.map((d, i) => [d, i]).filter(([d]) => d.from === u.id);
      if (!list.length) continue;
      groups += `<div class="uhead" style="--uc:${u.color}">${esc(u.name)}</div>` + list.map(([d, i]) => `
        <div class="dcard" data-i="${i}" style="--dc:${hex(d.color ?? 0xffffff)}"><img alt="" data-d="${i}"><span>${esc(d.name)}</span><div class="tags"></div></div>`).join('');
    }
    const karts = CHARACTERS.map((ch, i) => `<div class="kcard" data-i="${1000 + i}" style="--kc:${hex(ch.kart)}"><img alt="" data-k="${i}"><span>${esc(ch.vehicle)}</span><div class="tags"></div></div>`).join('');
    const titles = { gp: 'Grand Prix', race: 'Quick Race', tt: 'Time Trial' };
    this.setScreen(`<div class="screen select chars"><div class="panel wide xl"><h2>${titles[mode]} · Choose your driver &amp; kart</h2>
      <div class="joinbar"></div>
      <div class="csel">
        <div class="stage"><canvas class="pv"></canvas>
          <div class="pvinfo"><div class="pvfrom"></div><div class="pvname"></div><div class="pvblurb"></div><div class="pvkart"></div><div class="stats big"></div></div>
          <div class="pvstep"></div></div>
        <div class="picks"><div class="dgrid">${groups}</div><div class="khead">Karts</div><div class="kgrid">${karts}</div></div>
      </div>
      <div class="selfoot"><button class="bbtn" data-act="back">◀ Back</button><div class="hint2"></div><button class="bbtn go" data-act="go">Race! ▶</button></div></div></div>`);
    const ui = this.ui;
    const dcards = [...ui.querySelectorAll('.dcard')], kcards = [...ui.querySelectorAll('.kcard')];
    const dEl = new Map(dcards.map((c) => [+c.dataset.i, c]));
    const show = new Showcase(ui.querySelector('canvas.pv'), { cam: [5.6, 3.6, 8.4], look: [0, 1.25, 0], spin: 0.4 });
    this.cleanup = () => show.dispose();
    let pv = null, pvKey = '';   // the player the stage follows
    const deviceLabel = (d) => d === 'kb' ? (this.input.split ? 'Keys WASD' : 'Keyboard') : d === 'kb2' ? 'Keys Arrows' : d === 'touch' ? 'Touch' : this.input.padName(d);
    const taken = (me) => new Set(players.filter((p) => p !== me && p.phase !== 'driver').map((p) => p.dcur));
    // portraits fill in a few per frame
    const pendingImgs = [...ui.querySelectorAll('img[data-d], img[data-k]')];
    const fillImgs = (n) => {
      while (n-- > 0 && pendingImgs.length) {
        const img = pendingImgs.shift();
        img.src = img.dataset.d !== undefined ? driverPortrait(DRIVERS[+img.dataset.d]) : kartPortrait(CHARACTERS[+img.dataset.k]);
      }
    };
    const statBars = (st) => ['speed', 'accel', 'handling', 'weight'].map((k) => `<div class="st"><span>${k.slice(0, 5).toUpperCase()}</span><i style="width:${st[k] * 20}%"></i></div>`).join('');
    const refreshStage = (cheer) => {
      const p = pv || players[0];
      const d = DRIVERS[p ? p.dcur : 0], ch = CHARACTERS[p ? p.kcur : 0];
      const key = (d?.id || '') + '|' + ch.id;
      if (key !== pvKey) {
        const ry = show.items[0]?.m.root.rotation.y ?? 0.6;
        const sameDriver = pvKey.split('|')[0] === d?.id;
        show.set([{ ch, driver: d, ry, phase: p?.phase === 'done' ? 'win' : 'pre' }]);
        pvKey = key;
        if (!sameDriver) show.play(0, 'yay');
      }
      if (show.items[0]) show.items[0].phase = p?.phase === 'done' ? 'win' : 'pre';
      if (cheer) { show.play(0, 'cheer'); this.audio.voice(d.voice, 'cheer', 0.9); }
      ui.querySelector('.pvfrom').textContent = uni(d.from).name;
      ui.querySelector('.pvfrom').style.color = uni(d.from).color;
      ui.querySelector('.pvname').textContent = d.name;
      ui.querySelector('.pvblurb').textContent = `${d.blurb}${d.blurb ? ' · ' : ''}${d.weight[0].toUpperCase() + d.weight.slice(1)}`;
      ui.querySelector('.pvkart').innerHTML = `in the <b>${esc(ch.vehicle)}</b> · ${esc(bodyName(ch))}`;
      ui.querySelector('.stats.big').innerHTML = statBars(combinedStats(ch.stats, d));
      const step = !p ? 'Press <b>A</b> / <b>Enter</b> or tap a driver' : p.phase === 'driver' ? `P${p.id + 1}: pick a <b>driver</b>` : p.phase === 'kart' ? `P${p.id + 1}: pick a <b>kart</b>` : `P${p.id + 1} is ready!`;
      ui.querySelector('.pvstep').innerHTML = step;
    };
    const refresh = (cheer = false) => {
      for (const c of dcards) {
        const i = +c.dataset.i, here = players.filter((p) => p.phase !== 'done' && p.dcur === i || p.phase === 'done' && p.dcur === i);
        c.querySelector('.tags').innerHTML = here.map((p) => `<span class="ptag${p.phase !== 'driver' ? ' lock' : ''}" style="background:${p.color}">P${p.id + 1}${p.phase !== 'driver' ? ' ✓' : ''}</span>`).join('');
        const cur = players.filter((p) => p.dcur === i);
        c.style.outline = cur.length ? `4px solid ${cur[cur.length - 1].color}` : '';
        c.classList.toggle('taken', players.some((p) => p.phase !== 'driver' && p.dcur === i) && !players.some((p) => p.phase === 'driver' && p.dcur !== i) && players.length > 1);
      }
      for (const c of kcards) {
        const i = +c.dataset.i - 1000, cur = players.filter((p) => p.phase !== 'driver' && p.kcur === i);
        c.querySelector('.tags').innerHTML = cur.map((p) => `<span class="ptag${p.phase === 'done' ? ' lock' : ''}" style="background:${p.color}">P${p.id + 1}${p.phase === 'done' ? ' ✓' : ''}</span>`).join('');
        const on = cur.filter((p) => p.phase === 'kart');
        c.style.outline = on.length ? `4px solid ${on[on.length - 1].color}` : '';
      }
      ui.querySelector('.kgrid').classList.toggle('active', players.some((p) => p.phase === 'kart'));
      let html = '';
      for (let s2 = 0; s2 < max; s2++) {
        const p = players[s2];
        html += p ? `<div class="slot on" style="--pc:${p.color}"><b>P${p.id + 1}</b> ${esc(deviceLabel(p.device))}<em>${p.phase === 'driver' ? 'choosing…' : esc(DRIVERS[p.dcur].name) + (p.phase === 'done' ? ' · ' + esc(CHARACTERS[p.kcur].vehicle) : ' · kart?')}</em></div>`
          : `<div class="slot"><b>P${s2 + 1}</b> ${s2 === 0 ? 'Press A / Enter / tap a driver' : 'Press A to join'}</div>`;
      }
      ui.querySelector('.joinbar').innerHTML = html;
      const ready = players.length && players.every((p) => p.phase === 'done');
      ui.querySelector('.go').classList.toggle('ready', !!ready);
      ui.querySelector('.hint2').innerHTML = ready ? 'All set! Press <b>A</b> / <b>Start</b> / <b>Enter</b> to race' : (mode !== 'tt' ? 'More players: press <b>A</b> on another controller · 2nd keyboard: <b>Right Shift</b>' : 'Time Trial is solo: beat your best time');
      refreshStage(cheer);
    };
    const scrollTo = (el) => el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    const join = (device) => {
      if (players.length >= max || players.some((p) => p.device === device)) return null;
      const id = [0, 1, 2, 3].find((n) => !players.some((p) => p.id === n));
      const prev = this.charPicks[id] || {};
      const tk = taken(null);
      let dcur = prev.dcur ?? id; while (tk.has(dcur % ND)) dcur++;
      const p = { id, device, dcur: dcur % ND, kcur: prev.kcur ?? id % NK, phase: 'driver', color: PCOL[id] };
      players.push(p);
      players.sort((a, b) => a.id - b.id);
      pv = p;
      this.audio.sfx('join');
      refresh();
      scrollTo(dEl.get(p.dcur));
      return p;
    };
    const go = () => {
      if (!players.length || !players.every((p) => p.phase === 'done')) return;
      this.audio.sfx('select');
      for (const p of players) this.charPicks[p.id] = { dcur: p.dcur, kcur: p.kcur };
      this.players = players.map((p) => this.makePlayer({ id: p.id, device: p.device, cursor: p.kcur, driver: p.dcur, color: p.color }));
      if (mode === 'gp') this.showCups();
      else this.showTracks(mode);
    };
    const leave = (p) => {
      players.splice(players.indexOf(p), 1);
      if (p.device === 'kb2') this.input.split = false;
      if (pv === p) pv = players[0] || null;
      this.audio.sfx('back');
      refresh();
    };
    const back = () => { this.input.split = false; this.showMain(); };
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
    const lockDriver = (p) => {
      if (taken(p).has(p.dcur)) { this.audio.sfx('wrong'); return; }
      p.phase = 'kart'; pv = p;
      this.audio.sfx('select');
      refresh(true);
      scrollTo(kcards[p.kcur]);
    };
    const lockKart = (p) => { p.phase = 'done'; pv = p; this.audio.sfx('select'); show.play(0, 'win'); this.audio.voice(DRIVERS[p.dcur].voice, 'win', 0.9); refresh(); };
    this.screen = {
      update: (dt) => {
        fillImgs(3);
        show.update(dt);
        if (mode !== 'tt' && players.some((p) => p.device === 'kb') && !players.some((p) => p.device === 'kb2') && this.input.edge && KB2_JOIN.some((k) => this.input.edge.has(k))) {
          this.input.split = true; join('kb2');
        }
        for (const [dev, m] of this.menuEvents) {
          let p = players.find((q) => q.device === dev);
          if (!p) {
            if (m.ok || m.start) {
              if (players.length === 0 && dev === 'kb2') continue;
              p = join(dev);
            } else if (m.back && players.length === 0) { back(); return; }
            continue;
          }
          const dx = m.left ? -1 : m.right ? 1 : 0, dy = m.up ? -1 : m.down ? 1 : 0;
          if (p.phase === 'driver') {
            if (dx || dy) {
              const i = dcards.findIndex((c) => +c.dataset.i === p.dcur);
              p.dcur = +dcards[nav(dcards, Math.max(0, i), dx, dy)].dataset.i;
              pv = p; this.audio.sfx('click'); refresh(); scrollTo(dEl.get(p.dcur));
            }
            if (m.ok) { lockDriver(p); continue; }
            if (m.back) { if (p === players[0]) { back(); return; } leave(p); continue; }
          } else if (p.phase === 'kart') {
            if (dx || dy) { p.kcur = nav(kcards, p.kcur, dx, dy); pv = p; this.audio.sfx('click'); refresh(); scrollTo(kcards[p.kcur]); }
            if (m.ok) { lockKart(p); continue; }
            if (m.back) { p.phase = 'driver'; pv = p; this.audio.sfx('back'); refresh(); scrollTo(dEl.get(p.dcur)); continue; }
          } else {
            if (m.back) { p.phase = 'kart'; pv = p; this.audio.sfx('back'); refresh(); continue; }
            if (m.ok || m.start) { go(); return; }
          }
          if (m.start) go();
        }
      },
      click: (i) => {
        let p = players.find((q) => q.device === 'touch' || q.device === 'kb') || players[0];
        if (!p) p = join(isTouchDevice() ? 'touch' : 'kb');
        if (!p) return;
        pv = p;
        if (i >= 1000) {
          if (p.phase === 'driver') { if (taken(p).has(p.dcur)) return; p.phase = 'kart'; }
          p.kcur = i - 1000;
          lockKart(p);
          return;
        }
        if (taken(p).has(i)) return;
        p.dcur = i;
        lockDriver(p);
      },
      act: (a) => { if (a === 'back') back(); if (a === 'go') go(); },
    };
    join(this.p1Device());
    refresh();
  }

  makePlayer(p) {
    const input = this.input;
    return {
      id: p.id, device: p.device, charIndex: p.cursor, driverIndex: p.driver ?? null, color: p.color,
      autoGas: this.settings.autoGas || p.device === 'touch',
      rumble: (s, ms) => input.rumble(p.device, s, ms),
    };
  }

  // ---- track select --------------------------------------------------------------------------------
  showTracks(mode) {
    let focus = this.lastTrack ?? 0;
    const cards = TRACKS.map((t, i) => {
      const b = this.best[t.id];
      return `<div class="tcard" data-i="${i}"><img src="${this.thumbs[i]}" alt=""><div class="tn">${esc(t.name)}</div><div class="ts">${esc(t.subtitle)}</div>${mode === 'tt' && b ? `<div class="tb">Best ${fmt(b)}</div>` : ''}</div>`;
    }).join('') + `<div class="tcard rnd" data-i="${TRACKS.length}"><div class="q">?</div><div class="tn">Random</div><div class="ts">Surprise me</div></div>`;
    this.setScreen(`<div class="screen tracks"><div class="panel wide"><h2>${mode === 'tt' ? 'Time Trial' : 'Quick Race'} · Choose a map</h2>
      <div class="tgrid">${cards}</div><div class="selfoot"><button class="bbtn" data-act="back">◀ Back</button><div class="hint2">${this.settings.cc}cc · ${this.settings.laps} laps · CPU ${this.settings.difficulty}</div><span></span></div></div></div>`);
    const n = TRACKS.length + 1;
    const refresh = () => this.ui.querySelectorAll('.tcard').forEach((c, i) => c.classList.toggle('focus', i === focus));
    const pick = (i) => {
      this.audio.sfx('select');
      const idx = i >= TRACKS.length ? Math.floor(Math.random() * TRACKS.length) : i;
      this.lastTrack = i;
      this.startRace({ def: TRACKS[idx], mode });
    };
    this.screen = {
      update: () => {
        for (const [, m] of this.menuEvents) {
          if (m.left) { focus = (focus + n - 1) % n; this.audio.sfx('click'); refresh(); }
          if (m.right) { focus = (focus + 1) % n; this.audio.sfx('click'); refresh(); }
          if (m.up) { focus = (focus + n - 5) % n; this.audio.sfx('click'); refresh(); }
          if (m.down) { focus = (focus + 5) % n; this.audio.sfx('click'); refresh(); }
          if (m.ok || m.start) { pick(focus); return; }
          if (m.back) { this.audio.sfx('back'); this.showSelect(mode); return; }
        }
      },
      hover: (i) => { focus = i; refresh(); },
      click: (i) => pick(i),
      act: (a) => { if (a === 'back') this.showSelect(mode); },
    };
    refresh();
  }

  // ---- racing ------------------------------------------------------------------------------------------
  showCups() {
    let focus = 0;
    const cards = CUPS.map((c, i) => {
      const imgs = c.tracks.slice(0, 3).map((id) => `<img src="${this.thumbs[TRACKS.findIndex((t) => t.id === id)]}" alt="">`).join('');
      return `<div class="cup" data-i="${i}" style="--cc:${c.color}"><div class="trophy">🏆</div><div class="cn">${esc(c.name)}</div><div class="cthumbs">${imgs}</div><div class="cl">${c.tracks.map((id) => esc(TRACKS.find((t) => t.id === id).name)).join(' · ')}</div></div>`;
    }).join('');
    this.setScreen(`<div class="screen tracks"><div class="panel wide"><h2>Grand Prix · Choose a cup</h2><div class="cupgrid">${cards}</div>
      <div class="selfoot"><button class="bbtn" data-act="back">◀ Back</button><div class="hint2">${this.settings.cc}cc · ${this.settings.racers} racers · ${this.settings.laps} laps · CPU ${this.settings.difficulty}</div><span></span></div></div></div>`);
    const refresh = () => this.ui.querySelectorAll('.cup').forEach((c, i) => c.classList.toggle('focus', i === focus));
    const pick = (i) => { this.audio.sfx('select'); this.startGP(CUPS[i]); };
    this.screen = {
      update: () => {
        for (const [, m] of this.menuEvents) {
          if (m.left || m.up) { focus = (focus + CUPS.length - 1) % CUPS.length; this.audio.sfx('click'); refresh(); }
          if (m.right || m.down) { focus = (focus + 1) % CUPS.length; this.audio.sfx('click'); refresh(); }
          if (m.ok || m.start) { pick(focus); return; }
          if (m.back) { this.audio.sfx('back'); this.showSelect('gp'); return; }
        }
      },
      hover: (i) => { focus = i; refresh(); },
      click: (i) => pick(i),
      act: (a) => { if (a === 'back') this.showSelect('gp'); },
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
      this.attract?.dispose(); this.attract = null;
      this.race?.dispose();
      const s = this.settings;
      this.race = new Race(this, { ...opts, players: this.players, useChars: this.charsOn(), cc: CC[s.cc] || 0.92, difficulty: s.difficulty, racers: s.racers, laps: opts.mode === 'tt' ? 3 : s.laps, bestTime: opts.mode === 'tt' ? this.best[opts.def.id] : 0 });
      this.race.world.sun.shadow.mapSize.set(this.shadowSize, this.shadowSize);
      this.race.onDone = (res) => this.onRaceDone(res);
      this.race.warmup(this.renderer);
      this.paused = false;
      this.touchRoot.classList.toggle('hidden', !this.players.some((p) => p.device === 'touch'));
      ld.classList.add('hidden');
      this.screen = null;
    }, 60);
  }

  pause(player) {
    if (this.paused || !this.race) return;
    this.paused = true;
    this.audio.sfx('pause');
    for (const c of this.race.cams) c.kart.engine?.set(0, false, false);
    const resume = () => { this.paused = false; this.clearScreen(); };
    this.menu({
      title: 'Paused', cls: 'pause',
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
      this.gp.ent.set(e.key, { charIndex: r.charIndex, driverIndex: r.driverIndex });
      this.gp.points.set(e.key, (this.gp.points.get(e.key) || 0) + (POINTS[r.place - 1] || 0));
    });
    const items = mode === 'gp'
      ? [{ label: 'Standings ▶', action: () => this.showStandings() }]
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

  // who a result / standings row is: the movie-character driver (Use Characters) or the classic racer
  entrant(r) {
    const d = r.driverIndex >= 0 ? DRIVERS[r.driverIndex] : null;
    if (d) return { key: 'd' + r.driverIndex, name: d.name, img: driverPortrait(d) };
    return { key: 'c' + r.charIndex, name: CHARACTERS[r.charIndex].name, img: this.portraits[r.charIndex] };
  }
  playerKey(p) { return this.charsOn() && p.driverIndex != null ? 'd' + p.driverIndex : 'c' + p.charIndex; }

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
    gp.grid = [...order].reverse().map((o) => ({ charIndex: o.charIndex, driverIndex: o.driverIndex, player: humanChars.get(o.key) || null }));
    const last = gp.round >= gp.tracks.length;
    this.resultsMenu(last ? 'Final Standings' : `Standings after race ${gp.round}/${gp.tracks.length}`, `<div class="results">${rows}</div>`, last
      ? [{ label: 'Award ceremony ▶', action: () => this.showPodium(order) }]
      : [{ label: `Next: ${TRACKS.find((t) => t.id === gp.tracks[gp.round]).name} ▶`, action: () => this.nextGPRace() }, { label: 'Quit Grand Prix', action: () => this.quitToMenu() }]);
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

  // the top three drivers celebrate on the podium in 3D (Use Characters)
  podium3D(top) {
    const cv = this.ui.querySelector('canvas.pod3d');
    if (!cv) return;
    const show = new Showcase(cv, { cam: [0, 4.4, 16], look: [0, 1.7, 0], fov: 32, spin: 0 });
    const spots = [[0, 1.2, 0], [-4.2, 0.7, 0.4], [4.2, 0.35, 0.4]];
    show.set(top.map((o, n) => ({ ch: CHARACTERS[o.charIndex], driver: DRIVERS[o.driverIndex], x: spots[n][0], y: spots[n][1], z: spots[n][2], ry: [0.2, 0.45, -0.45][n], phase: n === 0 ? 'win' : 'pre', idle: n !== 0 })), { plate: false });
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
  golden: 'Invincible and extra fast. Smash through other karts!',
  storm: 'Rains bricks down on the racers ahead.',
  bullet: 'Turn into a giant brick bullet that drives itself at huge speed, blasting karts aside.',
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
