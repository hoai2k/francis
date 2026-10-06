// Brick Kart online play: the Online menu, rooms, the shared character select, the line-up, races
// and results, on top of the mini-rooms relay. Loaded only when the player opens Online (see
// Game.openOnline), so local play never depends on it.
//
// A room holds up to 12 browsers ("screens"), and each screen brings its local players (split
// screen, extra controllers, a 2nd keyboard: everything local multiplayer does), up to 12 people
// in all. A screen publishes ONE presence message for all of its players and simulates all of
// their karts.
//
// The host's presence carries the room state R (phase, join order, race setup, start time, karts
// it drives for others, results). Everyone follows R; nothing important is a one-off message, so a
// player who joins, reconnects or ends up on a new host after a migration catches up from it.
//
//   R = { g: generation, ph: 'sel' | 'trk' | 'load' | 'race' | 'res', o: [screen uids in join
//         order], n: select round, keep: 1 = keep picks, ri: race id, su: race setup (sent every
//         second and when someone joins), go: shared-clock ms of GO, tk: [grid indices the host
//         drives for someone], res: [[grid index, time, estimated], ...] }
//   setup su = { ri, tr: track id, laps, cc, df: CPU difficulty, sp: simplified, sd: seed,
//                gr: [[screen uid ('' = CPU), player slot, name, driver id, kart id, glider id] x 12] }
//
// Each screen's presence: { v, u: uid, n: name, h?: 1 (host), s: stage, pl: [[slot, name, custom
//   (0/1), driver id, kart id, glider id, 'n' | 'd' | 'k' | 'g' | 'r'], ...], ld: race id loaded,
//   ri, ks: [kart states] (racing), R (host) }
import { DRIVERS } from '../driver.js';
import { KARTS } from '../vehicles.js';
import { GLIDERS } from '../gliders.js';
import { TRACKS, CUPS } from '../tracks.js';
import { driverPortrait } from '../showcase.js';
import { fmt } from '../hud.js';
import { Session, loadMiniRooms } from './session.js';
import { NetRace } from './netrace.js';
import { Lineup } from './lineup.js';
import { Names, NameKeyboard, resolveNames } from './names.js';
import { CAPACITY, RACERS, ID_RE, esc, str, num, int, withSeed, newUid, cleanName } from './proto.js';

const CC = { 50: 0.8, 100: 0.92, 150: 1.06, 200: 1.22 };
const PCOL = ['#ff4a3a', '#3b8bff', '#3bdc5a', '#ffc93b', '#c45aff', '#ff8a1a', '#2fd6d0', '#ff6ab4'];
// one colour per screen (in join order) for the little "which screen" tags
const SCOL = ['#f2cd37', '#3b8bff', '#3bdc5a', '#ff6ab4', '#c45aff', '#ff8a1a', '#2fd6d0', '#ff4a3a', '#9ad0ff', '#e0e070', '#ff9a9a', '#a0ffa0'];
const ORD = (n) => n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const INTRO = 3, COUNT = 3.6, LINGER = 2.5;   // seconds: flyover, countdown, line-up after everyone's loaded
const LOAD_TIMEOUT = 30000;
const PH = ['n', 'd', 'k', 'g', 'r'];
const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];   // Grand Prix points by place (as offline)
const ERR = {
  unreachable: "Can't reach the online server — check your connection.",
  full: 'That room is full.',
  not_found: 'That race has ended.',
  taken: "Couldn't open a room — please try again.",
  host_lost: 'Lost the host, and no new host could be found.',
  rate_limited: 'Disconnected for sending too much.',
  lib: "Can't load online play — check your connection.",
  nohost: "Couldn't reach the host of that room.",
};
const dIdx = (id) => Math.max(0, DRIVERS.findIndex((d) => d.id === id));
const kIdx = (id) => Math.max(0, KARTS.findIndex((k) => k.id === id));
const gIdx = (id) => Math.max(0, GLIDERS.findIndex((g) => g.id === id));

export class Online {
  constructor(game) {
    this.game = game;
    this.names = new Names();
    this.uid = newUid();
    this.session = null;
    this.view = 'none';          // lobby | joining | select | track | lineup | race | results | wait
    this.R = null;               // host: the room state we publish; guests: the latest one we saw
    this.setups = new Map();     // race id -> parsed setup
    this.local = [];             // my players on the select screen: { slot, device, color, d, k, g, ph, pick, name }
    this.netRace = null; this.race = null; this.loadedRi = 0; this.raceRi = 0;
    this.prev = new Map();       // player key -> last seen state (for the bubbles)
    this.modal = null;           // the name keyboard while it's open
    addEventListener('beforeunload', () => { try { this.session?.leave(); } catch { /* closing */ } });
    // a host going into the background (another tab, a locked phone) can't keep the CPU karts
    // going: it hands the room to the next player (see onHidden)
    document.addEventListener('visibilitychange', () => this.onHidden(document.hidden));
    addEventListener('pagehide', () => this.onHidden(true, true));
    document.addEventListener('freeze', () => this.onHidden(true, true));
    if (new URLSearchParams(location.search).has('debug')) window.__net = this;
  }
  get isHost() { return !!this.session?.isHost; }
  // player 1's name for the room title: their last saved name, else their last driver
  p1Name() {
    const l = this.names.last[0];
    if (typeof l === 'string' && l !== 'default' && this.names.saved.includes(l)) return l;
    const d = DRIVERS.find((x) => x.id === this.game.picks?.chars?.[0]?.driver);
    return d?.name || 'Brick Kart';
  }

  // ---- the Online menu (lobby) -----------------------------------------------------------------------
  open(msg = '', error = '') {
    this.game.onTitle = false;
    this.showLobby(msg || (this.lib ? '' : 'Connecting…'), error);
    loadMiniRooms().then((lib) => { this.lib = lib; if (this.view === 'lobby') { this.lobbyState({}); this.watchLobby(); } })
      .catch((e) => { console.warn(e.message); if (this.view === 'lobby') this.lobbyState({ error: ERR.lib }); });
  }
  showLobby(msg = '', error = '') {
    const g = this.game;
    this.leaveRoom();
    this.view = 'lobby';
    this.rooms = [];
    this.lobbyErr = error; this.lobbyMsg = msg;
    g.hudRoot.classList.add('hidden');
    if (!g.attract && !g.race) g.startAttract();
    g.setScreen(`<div class="screen menu online-lobby"><div class="panel ol-panel"><h2>Online</h2>
      <p class="ol-sub">Race friends anywhere. Everyone on this screen can join in (split screen and extra controllers work as usual), up to ${RACERS} people in a race.</p>
      <div class="list ol-list"></div>
      <div class="ol-status"></div>
      <div class="hint"><span><b>A</b>/<b>Enter</b> select</span><span><b>B</b>/<b>Esc</b> Back</span><span>Mouse & touch work too</span></div></div></div>`);
    const ui = g.ui;
    this.lobbyEl = ui.querySelector('.ol-list'); this.statusEl = ui.querySelector('.ol-status');
    let focus = 0;
    const items = () => [...ui.querySelectorAll('.ol-list [data-i]')];
    const refresh = () => items().forEach((b, i) => b.classList.toggle('focus', i === focus));
    const activate = (i) => {
      const el = items()[i];
      if (!el || el.classList.contains('dis')) { g.audio.sfx('wrong'); return; }
      const a = el.dataset.a;
      g.audio.sfx('select');
      if (a === 'host') this.hostRoom();
      else if (a === 'back') { this.closeLobby(); g.showMain(); }
      else if (a === 'retry') this.open('Connecting…');
      else if (a?.startsWith('join:')) this.joinRoom(a.slice(5));
    };
    g.screen = {
      update: () => {
        for (const [, m] of g.menuEvents) {
          const n = items().length || 1;
          if (m.up) { focus = (focus + n - 1) % n; g.audio.sfx('click'); refresh(); }
          if (m.down) { focus = (focus + 1) % n; g.audio.sfx('click'); refresh(); }
          if (m.ok || m.start) { activate(focus); return; }
          if (m.back) { g.audio.sfx('back'); this.closeLobby(); g.showMain(); return; }
        }
      },
      hover: (i) => { focus = i; refresh(); },
      click: (i) => { focus = i; refresh(); activate(i); },
    };
    this.lobbyRefresh = () => { const n = items().length; if (focus >= n) focus = Math.max(0, n - 1); refresh(); };
    this.lobbyState({});
  }
  closeLobby() { this.stopWatch?.(); this.stopWatch = null; if (this.view === 'lobby') this.view = 'none'; }
  watchLobby() {
    this.stopWatch?.();
    if (!this.lib) return;
    try {
      this.lobbyNet ||= new Session(this.lib, { uid: this.uid, name: 'lobby' });
      this.stopWatch = this.lobbyNet.watchRooms(({ rooms, error }) => {
        if (this.view !== 'lobby') { this.stopWatch?.(); this.stopWatch = null; return; }
        if (error) this.lobbyState({ error: ERR.unreachable, rooms: [] });
        else this.lobbyState({ error: '', rooms: Array.isArray(rooms) ? rooms : [] });
      });
    } catch (e) { console.error(e); this.lobbyState({ error: ERR.unreachable }); }
  }
  // redraw the lobby list: Host, the open rooms, Back (and Retry after an error)
  lobbyState({ error, rooms }) {
    if (this.view !== 'lobby' || !this.lobbyEl) return;
    if (rooms) this.rooms = rooms.filter((r) => r && typeof r.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(r.id)).slice(0, 30);
    if (error !== undefined) this.lobbyErr = error;
    if (this.lobbyMsg === 'Connecting…' && rooms) this.lobbyMsg = '';
    const ok = !!this.lib && !this.lobbyErr;
    let i = 0;
    let html = `<button class="mbtn${ok ? '' : ' dis'}" data-i="${i++}" data-a="host"><span>Host a race</span><span class="val">up to ${RACERS}</span></button>`;
    if (ok && rooms !== undefined || ok && this.rooms.length) {
      html += `<div class="ol-rooms-h">${this.rooms.length ? 'Open races' : 'No open races right now — host one!'}</div>`;
      for (const r of this.rooms) {
        const count = int(r.count, 0, 99), cap = int(r.capacity, 1, 99, CAPACITY), full = count >= cap;
        html += `<button class="mbtn ol-room${full ? ' dis' : ''}" data-i="${i++}" data-a="${full ? '' : 'join:' + esc(r.id)}"><span>${esc(str(r.title, 40) || 'Race')}</span><span class="val">${full ? 'Full' : `${count}/${cap} · Join`}</span></button>`;
      }
    } else if (this.lobbyErr) html += `<button class="mbtn" data-i="${i++}" data-a="retry"><span>Retry</span></button>`;
    html += `<button class="mbtn" data-i="${i++}" data-a="back"><span>Back</span></button>`;
    this.lobbyEl.innerHTML = html;
    this.statusEl.innerHTML = this.lobbyErr ? `<span class="err">${esc(this.lobbyErr)}</span>`
      : this.lobbyMsg ? `<span class="note">${esc(this.lobbyMsg)}</span>` : esc(ok ? 'Pick a race to join, or host your own.' : 'Connecting…');
    this.lobbyRefresh?.();
  }

  // ---- hosting / joining ------------------------------------------------------------------------------
  newSession(name) {
    this.leaveRoom();
    const s = this.session = new Session(this.lib, { uid: this.uid, name });
    s.on('status', (st, info) => this.onStatus(s, st, info));
    s.on('fatal', (reason) => this.onFatal(s, reason));
    s.on('peers', (changed) => this.onPeers(s, changed));
    s.on('presence', (peer) => { if (s === this.session && this.netRace && peer.p?.ri === this.netRace.raceId && peer.p.ks) this.netRace.ingest(peer.uid, peer.p.ks); });
    s.on('arrived', (p) => { if (s === this.session) this.onArrived(p); });
    s.on('left', (p) => { if (s === this.session) this.onLeft(p); });
    s.on('topic', (topic, d, peer) => { if (s === this.session && topic === 'ev' && peer) this.netRace?.events(peer.uid, d); });
    s.on('migrated', ({ asHost }) => { if (s === this.session) this.onMigrated(asHost); });
    s.on('reconnected', () => { if (s === this.session) this.publishMine(true); });
    return s;
  }
  hostRoom() {
    if (!this.lib) return;
    this.closeLobby();
    const name = this.p1Name();
    const s = this.newSession(name);
    this.showJoining('Opening your room…');
    s.on('joined', () => {
      if (s !== this.session) return;
      this.joinedAt = performance.now();
      this.R = { g: 0, ph: 'sel', o: s.order, n: 1, keep: 0, ri: 0, tk: [] };
      this.suT = 0;
      this.game.toast(`Room open: ${name}'s race`);
      this.showSelect(false);
    });
    s.host(`${name}'s race`);
  }
  joinRoom(id) {
    if (!this.lib || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return;
    this.closeLobby();
    const s = this.newSession(this.p1Name());
    this.showJoining('Joining…');
    this.joinedAt = performance.now();
    s.on('joined', () => {
      if (s !== this.session) return;
      this.joinedAt = performance.now();
      this.publishMine(true);
      this.followHost();
    });
    s.join(id);
  }
  showJoining(text) {
    this.view = 'joining';
    const cancel = () => { this.game.audio.sfx('back'); this.toLobby(); };
    this.game.setScreen(`<div class="screen menu"><div class="panel ol-panel"><h2>Online</h2><div class="ol-wait"><div class="spinner"><i></i><i></i><i></i></div><p>${esc(text)}</p></div>
      <div class="list"><button class="mbtn focus" data-i="0"><span>Cancel</span></button></div></div></div>`, {
      update: () => { for (const [, m] of this.game.menuEvents) if (m.back || m.ok) { cancel(); return; } },
      click: cancel,
    });
  }

  // ---- presence ------------------------------------------------------------------------------------------
  publishMine(force = false) {
    const s = this.session;
    if (!s) return;
    const m = s.mine;
    m.s = this.stage();
    m.pl = this.local.map((p) => [p.slot, p.name || '', p.pick && p.pick !== 'default' ? 1 : 0, DRIVERS[p.d]?.id || '', KARTS[p.k]?.id || '', GLIDERS[p.g]?.id || '', p.ph]);
    m.ld = this.loadedRi || 0;
    if (s.isHost && this.R) {
      const R = this.roomOut();
      // the race setup and the Grand Prix table ride along every second (and straight away when
      // they change or someone joins), so the 15-a-second race updates stay small
      const su = this.setups.get(this.R.ri), t = performance.now();
      if ((su || this.R.gp) && (t - (this.suT || 0) > 1000 || force)) { if (su) R.su = su.raw; if (this.R.gp) R.gp = this.gpOut(); this.suT = t; }
      m.R = R;
    } else delete m.R;
    s.publish(force, 150);
  }
  // the room state as published (the Grand Prix table only now and then: see publishMine)
  roomOut() {
    const s = this.session, R = { ...this.R, o: s.order, g: s.gen };
    delete R.loadAt; delete R.gp;
    if (this.R.gp) R.gpr = this.R.gp.round;
    return R;
  }
  gpOut() { const gp = this.R.gp; return { c: gp.cup, r: gp.round, tr: gp.tracks, p: gp.pts.map((e) => e.slice(0, 5)) }; }
  // a Grand Prix table from the host: { cup, name, round, tracks, pts: [[key, name, points, driver id, human]] }
  gpIn(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const cup = CUPS.find((c) => c.id === raw.c);
    const tracks = Array.isArray(raw.tr) ? raw.tr.filter((id) => TRACKS.some((t) => t.id === id)).slice(0, 8) : [];
    if (!cup || !tracks.length) return null;
    const pts = (Array.isArray(raw.p) ? raw.p : []).slice(0, 40).filter(Array.isArray).map((e) => [str(e[0], 40), cleanName(str(e[1], 24)), int(e[2], 0, 9999), str(e[3], 40), e[4] ? 1 : 0]);
    return { cup: cup.id, name: cup.name, round: int(raw.r, 0, 8), tracks, pts };
  }
  stage() {
    switch (this.view) {
      case 'select': case 'track': case 'confirm': return this.local.length && this.local.every((p) => p.ph === 'r') ? 'rdy' : 'sel';
      case 'lineup': return this.loadedRi && this.loadedRi === this.raceRi ? (this.netRace?.spectating ? 'spec' : 'race') : 'load';
      case 'race': return this.netRace?.spectating ? 'spec' : 'race';
      case 'results': return 'res';
      default: return 'join';
    }
  }

  // Everyone in the room, screen by screen in join order, each screen's players by slot:
  // [{ key, uid, slot, name, custom, d, k, g, ph, me, host, si (screen index), multi, stage }]
  humans() {
    const s = this.session;
    if (!s) return [];
    const out = [];
    s.members().forEach((m, si) => {
      let list;
      if (m.me) list = this.local.map((p) => ({ slot: p.slot, custom: p.pick && p.pick !== 'default' ? p.pick : null, d: p.d, k: p.k, g: p.g, ph: p.ph, name: p.name }));
      else {
        const pl = Array.isArray(m.p?.pl) ? m.p.pl.slice(0, RACERS) : [];
        list = pl.filter(Array.isArray).map((e) => ({ slot: int(e[0], 0, 7), custom: e[2] ? cleanName(str(e[1], 24)) : null, d: dIdx(e[3]), k: kIdx(e[4]), g: gIdx(e[5]), ph: PH.includes(e[6]) ? e[6] : 'n', name: cleanName(str(e[1], 24)) }));
      }
      for (const h of list) out.push({ ...h, key: m.uid + ':' + h.slot, uid: m.uid, me: m.me, host: m.host, si, multi: list.length > 1, stage: m.me ? this.stage() : str(m.p?.s, 4) });
    });
    // everyone's names, worked out the same way on every screen
    const names = resolveNames(out);
    for (const h of out) h.name = names.get(h.key) || h.name;
    return out;
  }
  // my players' names follow everyone's choices (a clash with someone else's driver changes them)
  resolveMine() {
    let changed = false;
    for (const h of this.humans()) {
      if (!h.me) continue;
      const p = this.local.find((q) => q.slot === h.slot);
      if (p && p.name !== h.name) { p.name = h.name; changed = true; }
    }
    return changed;
  }
  canJoin(nLocal) {
    const others = this.humans().filter((h) => !h.me).length;
    if (others + nLocal < RACERS) return true;
    const t = performance.now();
    if (t - (this.fullToastT || 0) > 2000) { this.fullToastT = t; this.bubble(`The room is full — ${RACERS} players at most`); }
    return false;
  }

  // ---- following the host ------------------------------------------------------------------------------
  // Guests: react to the host's room state.
  followHost() {
    const s = this.session;
    if (!s || s.isHost) return;
    const R = s.hostP?.R;
    if (!R || typeof R !== 'object') {
      if (this.view === 'joining' && performance.now() - (this.joinedAt || 0) > 10000) this.onFatal(s, 'nohost');
      return;
    }
    const ph = ['sel', 'trk', 'load', 'race', 'res'].includes(R.ph) ? R.ph : 'sel';
    const ri = int(R.ri, 0, 1e6);
    if (R.su) this.addSetup(R.su);
    const prev = this.R;
    if (R.gpr === undefined || R.gpr === null) this.gp = null;
    else if (R.gp) { const gp = this.gpIn(R.gp); if (gp) this.gp = gp; }
    const R2 = this.R = { ph, ri, n: int(R.n, 0, 1e6), keep: R.keep ? 1 : 0, go: num(R.go, 0, 1e15, 0) || null, tk: Array.isArray(R.tk) ? R.tk.filter((i) => Number.isInteger(i) && i >= 0 && i < RACERS) : [], res: Array.isArray(R.res) ? R.res : null, o: Array.isArray(R.o) ? R.o : [] };
    if (ph === 'sel' || ph === 'trk') {
      const newRound = prev && prev.n !== R2.n;
      if (!['select', 'track', 'confirm'].includes(this.view) || newRound) {
        if (this.view !== 'confirm' || newRound) this.showSelect(!!R2.keep && newRound && this.local.length > 0);
      } else this.selRefreshSoon();
      return;
    }
    if (ph === 'load' || ph === 'race') {
      const su = this.setups.get(ri);
      if (!su) return;   // the setup comes with the next host update
      if (this.raceRi !== ri) this.startLoading(su);
      if (this.netRace && this.netRace.raceId === ri) {
        if (R2.go && this.netRace.goAt !== R2.go) this.netRace.goAt = R2.go;
        this.netRace.setTaken(R2.tk);
      }
      return;
    }
    if (ph === 'res') {
      // (re-drawn once the Grand Prix table with this race's points arrives)
      if (R2.res && ri === this.raceRi && (this.view !== 'results' || (this.gp && this.gp.round !== this.resRound))) this.showResults(R2.res);
      else if (ri !== this.raceRi && !['results', 'wait'].includes(this.view)) this.showWaiting();
    }
  }
  addSetup(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const ri = int(raw.ri, 1, 1e6, 0);
    if (!ri) return null;
    if (this.setups.has(ri)) return this.setups.get(ri);
    const def = TRACKS.find((t) => t.id === raw.tr);
    if (!def || !Array.isArray(raw.gr) || raw.gr.length !== RACERS) return null;
    const gr = raw.gr.map((e) => {
      const a = Array.isArray(e) ? e : [];
      const u = typeof a[0] === 'string' && ID_RE.test(a[0]) ? a[0] : '';
      return { u, slot: int(a[1], 0, 7), n: u ? cleanName(str(a[2], 24)) : '', d: dIdx(a[3]), k: kIdx(a[4]), g: gIdx(a[5]) };
    });
    const su = { ri, def, laps: int(raw.laps, 1, 5, 3), cc: [50, 100, 150, 200].includes(raw.cc) ? raw.cc : 100, df: ['easy', 'normal', 'hard'].includes(raw.df) ? raw.df : 'normal', sp: !!raw.sp, sd: int(raw.sd, 0, 4294967295), gr, raw };
    // which screen each player is on (colour tags), and whether that screen has several players
    const screens = [...new Set(gr.filter((e) => e.u).map((e) => e.u))];
    for (const e of gr) if (e.u) { e.si = screens.indexOf(e.u); e.multi = gr.filter((x) => x.u === e.u).length > 1; }
    this.setups.set(ri, su);
    if (this.setups.size > 4) this.setups.delete(this.setups.keys().next().value);
    return su;
  }
  devTag(si, slot, multi) { return `<i class="oldev" style="--bc:${SCOL[si % SCOL.length]}" title="Same screen">${multi ? 'P' + (slot + 1) : ''}</i>`; }

  // ---- room panel and bubbles ----------------------------------------------------------------------
  onPeers(s, changed) {
    if (s !== this.session) return;
    const hs = this.humans();
    this.leftNames ||= new Map();
    for (const h of hs) if (!h.me) { const l = this.leftNames.get(h.uid) || []; if (!l.includes(h.name)) { l.push(h.name); if (l.length > 8) l.shift(); } this.leftNames.set(h.uid, l.filter((n) => hs.some((x) => x.uid === h.uid && x.name === n))); }
    // bubbles as people act
    if (performance.now() - (this.joinedAt || 0) > 1500) {
      for (const h of hs) {
        if (h.me) continue;
        const key = `${h.stage}|${h.ph}|${h.d}|${h.k}`;
        const old = this.prev.get(h.key);
        this.prev.set(h.key, key);
        if (old === undefined || old === key) continue;
        const [, oph] = old.split('|');
        const drv = DRIVERS[h.d]?.name || '?', kart = KARTS[h.k]?.vehicle || '?';
        if (h.ph === 'r' && oph !== 'r') this.bubble(h.custom ? `✓ ${h.name} locked in ${drv} + ${kart}` : `✓ ${h.name} locked in the ${kart}`);
        else if (h.ph === 'k' && oph === 'd') this.bubble(h.custom ? `${h.name} picked ${drv}` : `${h.name} is in!`);
        else if (h.stage === 'spec' && old.split('|')[0] !== 'spec' && this.view === 'race') this.bubble(`👀 ${h.name} is watching`);
      }
    } else for (const h of hs) if (!h.me) this.prev.set(h.key, `${h.stage}|${h.ph}|${h.d}|${h.k}`);
    if (!s.isHost && (!changed || changed.some((p) => p.uid === s.hostUid) || this.view === 'joining')) this.followHost();
    if (s.isHost) this.hostCheck();
    if (['select', 'track', 'wait', 'confirm'].includes(this.view)) {
      if (this.resolveMine()) this.publishMine();
      this.renderRoster();
      if (this.view === 'select') this.selRefreshSoon();
    }
  }
  onArrived(p) {
    if (!p) return;
    if (performance.now() - (this.joinedAt || 0) > 1500 && p.uid) {
      const names = this.humans().filter((h) => h.uid === p.uid).map((h) => h.name);
      this.bubble(names.length ? `👋 ${names.join(' & ')} joined` : '👋 Someone joined');
    }
    if (this.isHost) {
      this.publishMine(true);
      this.hostCheck();
    }
  }
  onLeft(p) {
    if (!p) return;
    const names = (this.leftNames?.get(p.uid)) || [];
    for (const k of [...this.prev.keys()]) if (k.startsWith(p.uid + ':')) this.prev.delete(k);
    this.bubble(names.length ? `${names.join(' & ')} left` : 'A player left');
    if (this.isHost && this.netRace) {
      // keep the field at 12: their karts carry on as CPUs
      const nr = this.netRace;
      nr.grid.forEach((g, i) => { if (g.u === p.uid) nr.takeOver(i); });
      this.R.tk = [...nr.taken].sort((a, b) => a - b);
      this.publishMine(true);
    }
    this.renderRoster();
    if (this.isHost) this.hostCheck();
  }
  bubble(text) { this.game.toast(text); }
  stateText(h) {
    if (!h.me && this.session?.missing.has(h.uid)) return 'reconnecting…';
    switch (h.stage) {
      case 'load': return 'loading…';
      case 'race': return 'racing';
      case 'spec': return 'watching';
      case 'res': return 'results';
      case 'join': case '': case undefined: if (!h.me) return 'connecting…';
    }
    return { n: 'choosing a name…', d: 'choosing a driver…', k: 'choosing a kart…', g: 'choosing a glider…', r: 'ready ✓' }[h.ph] || 'connecting…';
  }
  // the room panel: one chip per person (keyed, so portraits aren't rebuilt on every update)
  renderRoster() {
    const el = this.game.ui.querySelector('.olroster');
    if (!el) return;
    if (el !== this.rosterEl) { this.rosterEl = el; this.chips = new Map(); el.innerHTML = ''; }
    const hs = this.humans(), keys = new Set();
    for (const h of hs) {
      keys.add(h.key);
      let c = this.chips.get(h.key);
      if (!c) {
        c = { el: document.createElement('div'), d: -1, txt: '' };
        c.el.innerHTML = '<span class="olp"><img alt=""></span><span class="oln"></span><span class="ols"></span>';
        c.img = c.el.querySelector('img'); c.name = c.el.querySelector('.oln'); c.st = c.el.querySelector('.ols');
        this.chips.set(h.key, c);
      }
      el.appendChild(c.el);   // (keeps them in room order)
      const cls = `olm${h.me ? ' me' : ''}${h.ph === 'r' ? ' rdy' : ''}`;
      if (c.el.className !== cls) c.el.className = cls;
      if (c.d !== h.d) { c.d = h.d; c.img.src = driverPortrait(DRIVERS[h.d] || DRIVERS[0]); }
      const nm = `${h.host && (h.slot === 0 || !h.multi) ? '<i class="crown">👑</i>' : ''}${this.devTag(h.si, h.slot, h.multi)}${esc(h.name)}${h.me ? ' <em>(you)</em>' : ''}`;
      if (c.nm !== nm) { c.nm = nm; c.name.innerHTML = nm; }
      const st = this.stateText(h);
      if (c.txt !== st) { c.txt = st; c.st.textContent = st; }
    }
    for (const [k, c] of this.chips) if (!keys.has(k)) { c.el.remove(); this.chips.delete(k); }
    const pend = this.session?.pendingCount() || 0;
    el.querySelectorAll('.olm.pend').forEach((e) => e.remove());
    for (let i = 0; i < pend; i++) el.insertAdjacentHTML('beforeend', '<div class="olm pend"><span class="olp"></span><span class="oln">Someone</span><span class="ols">connecting…</span></div>');
  }
  selRefreshSoon() {
    if (this.selRefreshT) return;
    this.selRefreshT = setTimeout(() => { this.selRefreshT = 0; if (this.view === 'select') { try { this.selRefresh?.(); } catch (e) { console.error(e); } } }, 120);
  }

  // ---- the select screen ------------------------------------------------------------------------------------
  showSelect(keep) {
    const g = this.game;
    this.disposeRace();
    this.modal = null;
    g.hudRoot.classList.add('hidden');
    g.touchRoot.classList.add('hidden');
    if (!g.attract) g.startAttract();
    this.view = 'select';
    this.raceRi = 0; this.loadedRi = 0;
    this.lastGoPress = 0;
    if (keep && this.local.length) {
      g.players = this.local.map((p) => Object.assign(g.makePlayer({ id: p.slot, device: p.device, cursor: 0, driver: p.d, kart: p.k, glider: p.g, color: p.color }), { olName: p.pick }));
    }
    this.rosterEl = null;
    g.showSelect('online', !!(keep && this.local.length), this.selectHooks());
    this.publishMine(true);
    this.renderRoster();
  }
  selectHooks() {
    const opts = () => this.names.options();
    const optLabel = (o, p) => (o === 'default' ? `Default · ${esc(this.defaultName(p))}` : o === 'new' ? '+ New name…' : esc(o));
    const on = this;
    const hooks = {
      mount: (ui, refresh) => { this.selRefresh = () => refresh(); this.selUi = ui; },
      changed: (players) => {
        this.selPlayers = players;
        const before = JSON.stringify(this.local.map((p) => [p.slot, p.d, p.k, p.g, p.ph, p.pick]));
        this.local = players.map((p) => {
          const old = this.local.find((q) => q.slot === p.id);
          const ph = p.phase === 'name' ? 'n' : p.phase === 'driver' ? 'd' : p.phase === 'kart' ? (p.sub === 'glider' ? 'g' : 'k') : 'r';
          return { slot: p.id, device: p.device, color: p.color, d: p.dcur, k: p.kcur, g: p.gcur, ph, pick: p.olName?.pick || p.olName || 'default', name: old?.name || '' };
        });
        this.resolveMine();
        const after = JSON.stringify(this.local.map((p) => [p.slot, p.d, p.k, p.g, p.ph, p.pick]));
        if (before !== after) this.publishMine(true);
        this.renderRoster();
        if (this.isHost) this.hostCheck();
      },
      hint: (players) => {
        if (!players.length) return this.humans().length >= RACERS ? `The room is full (${RACERS} players) — you can watch the next race` : '<b>A</b> / <b>Enter</b> or tap a driver to join in';
        if (players.some((p) => p.phase === 'name')) return '<b>▲ ▼</b> pick your name · <b>A</b> OK · <b>X</b> forget a saved name';
        const ready = players.length && players.every((p) => p.phase === 'done');
        const more = !isPhoneScreen() && players.length < 8 ? ' · more players here: press <b>A</b> on another controller' : '';
        if (!ready) return (players.some((p) => p.phase === 'kart') ? '<b>◀︎ ▶︎</b> change · <b>▲ ▼</b> kart / glider · <b>A</b> lock it in' : '<b>A</b> lock in your driver') + more;
        const waiting = this.humans().filter((h) => !h.me && h.ph !== 'r').map((h) => h.name);
        if (this.isHost) return waiting.length ? `Waiting for <b>${esc(waiting.slice(0, 3).join(', '))}</b>${waiting.length > 3 ? '…' : ''} · press <b>Race!</b> twice to go without them` : 'Everyone is ready! Press <b>A</b> / <b>Race!</b> to pick a map';
        return this.R?.ph === 'trk' ? 'Host is picking a map…' : `Ready! Waiting for ${waiting.length ? esc(waiting.slice(0, 3).join(', ')) : 'the host'}…`;
      },
      goLabel: (players) => (this.isHost ? 'Race! ▶︎' : players.length && players.every((p) => p.phase === 'done') ? 'Ready ✓' : 'Ready'),
      go: (players) => {
        if (!players.length || !players.every((p) => p.phase === 'done')) { this.game.audio.sfx('wrong'); this.bubble('Lock in your driver and kart first'); return; }
        if (!this.isHost) { this.bubble(this.R?.ph === 'trk' ? 'The host is picking a map…' : 'Waiting for the host to start'); return; }
        const notReady = this.humans().filter((h) => !h.me && h.ph !== 'r');
        const t = performance.now();
        if (notReady.length && t - this.lastGoPress > 4000) {
          this.lastGoPress = t;
          this.bubble(`Waiting for ${notReady.map((h) => h.name).join(', ')} — press again to start without them`);
          return;
        }
        this.toTrack();
      },
      back: () => { this.view = 'confirm'; this.confirmLeave(() => this.showSelect(false)); },
      canJoin: (n) => this.canJoin(n),
      taken: () => this.humans().filter((h) => !h.me && h.ph !== 'n' && h.ph !== 'd' && (h.stage === 'sel' || h.stage === 'rdy')).map((h) => h.d),
      tags: (i) => {
        let html = '';
        for (const h of this.humans()) if (!h.me && h.d === i && h.ph !== 'n' && (h.stage === 'sel' || h.stage === 'rdy')) html += `<span class="ptag ol${h.ph !== 'd' ? ' lock' : ''}">${esc(h.name.slice(0, 9))}${h.ph !== 'd' ? ' ✓' : ''}</span>`;
        return html;
      },
      // ---- the name step ----
      nameStart: (p) => { p.nsel = this.names.startIndex(p.id); const o = opts()[p.nsel]; p.olName = { pick: o === 'new' ? 'default' : o }; },
      nameCell: (p) => {
        const list = opts().map((o, i) => `<button class="olnm${i === p.nsel ? ' on' : ''}" data-act="olnm:${p.id}:${i}">${optLabel(o, p)}${o !== 'default' && o !== 'new' ? `<span class="del" data-act="olnd:${p.id}:${i}" title="Forget this name">✕</span>` : ''}</button>`).join('');
        return `<div class="pvstep"><i style="background:${p.color}">P${p.id + 1}</i> Who's racing?</div><div class="olnames">${list}</div>`;
      },
      nameMove: (p, dy) => { const n = opts().length; p.nsel = ((p.nsel ?? 0) + dy + n) % n; },
      nameDelete: (p) => {
        const o = opts()[p.nsel];
        if (o === 'default' || o === 'new') { this.game.audio.sfx('wrong'); return; }
        this.names.remove(o); this.game.audio.sfx('back');
        p.nsel = Math.min(p.nsel, opts().length - 1);
      },
      nameAccept: (p, next) => this.nameAccept(p, next),
      nameQuick: (p) => { const o = opts()[p.nsel ?? 0]; const pick = o === 'new' ? 'default' : o; p.olName = { pick }; this.names.remember(p.id, pick); },
      act: (a, players, refresh) => {
        const [cmd, id, n] = a.split(':');
        if (cmd === 'olk') { this.modal?.act(a); return; }
        const p = players.find((q) => q.id === +id);
        if (!p || p.phase !== 'name') return;
        if (cmd === 'olnd') { p.nsel = +n; hooks.nameDelete(p); refresh(); return; }
        if (cmd === 'olnm') { p.nsel = +n; this.game.audio.sfx('select'); this.nameAccept(p, () => { p.phase = 'driver'; refresh(); }); refresh(); }
      },
      get modal() { return on.modal; },
      modalUpdate: () => this.modal?.update(),
    };
    return hooks;
  }
  nameAccept(p, next) {
    const opts = this.names.options(), o = opts[p.nsel ?? 0];
    if (o === 'new') {
      if (this.modal) return;
      const root = this.game.ui.querySelector('.screen.select .panel') || this.game.ui;
      this.modal = new NameKeyboard(this.game, root, p, (name) => {
        this.modal = null;
        if (!name) return;
        this.names.add(name);
        p.nsel = this.names.options().indexOf(name);
        p.olName = { pick: name }; this.names.remember(p.id, name);
        next();
      });
      return;
    }
    p.olName = { pick: o };
    this.names.remember(p.id, o);
    next();
  }
  // what "Default" would call this player right now
  defaultName(p) {
    const me = this.humans().find((h) => h.me && h.slot === p.id);
    if (me && !me.custom) return me.name;
    return DRIVERS[p.dcur]?.name || 'Racer';
  }
  confirmLeave(stay) {
    this.game.menu({ title: 'Leave the room?', items: [{ label: 'Stay', action: stay }, { label: 'Leave room', action: () => this.toLobby() }], back: stay });
  }

  // ---- host: map choice, setup, loading, start --------------------------------------------------------------
  toTrack() {
    this.view = 'track';
    this.R.ph = 'trk';
    this.publishMine(true);
    const gp = this.R.gp;
    // in a Grand Prix the next race is the cup's next map
    if (gp && gp.round < gp.tracks.length) { this.hostPick(TRACKS.find((t) => t.id === gp.tracks[gp.round]) || TRACKS[0]); return; }
    this.R.gp = null;
    const back = () => { this.R.ph = 'sel'; this.showSelect(true); };
    this.game.menu({
      title: 'Online · Race type',
      items: [
        { label: 'Single race', action: () => this.game.showTracks('online', { pick: (def) => this.hostPick(def), back: () => this.toTrack() }) },
        { label: 'Grand Prix', action: () => this.game.showCups({ pick: (cup) => this.hostStartGP(cup), back: () => this.toTrack() }) },
        { label: 'Back', action: back },
      ],
      back,
    });
  }
  // a Grand Prix: the cup's maps in turn, points after each race (the table lives in the room state)
  hostStartGP(cup) {
    this.R.gp = { cup: cup.id, name: cup.name, round: 0, tracks: [...cup.tracks], pts: [], cpus: null };
    this.hostPick(TRACKS.find((t) => t.id === cup.tracks[0]) || TRACKS[0]);
  }
  gpKey(e) { return e.u ? e.u + ':' + e.slot : 'c:' + (DRIVERS[e.d]?.id || e.d); }
  hostPick(def) {
    const set = this.game.settings;
    // the field: everyone locked in (up to 12), then CPU racers to fill it
    // (everyone locked in: on the select screen, or still on the results of the race before when the
    // host goes straight on with the same racers)
    const humans = this.humans().filter((h) => h.ph === 'r' && (h.me || ['rdy', 'sel', 'res', 'race', 'load'].includes(h.stage))).slice(0, RACERS)
      .map((h) => ({ u: h.uid, slot: h.slot, n: h.name, d: h.d, k: h.k, g: h.g }));
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const used = new Set(humans.map((h) => h.d));
    const freeD = shuffle(DRIVERS.map((_, i) => i).filter((i) => !used.has(i)));
    const gp = this.R.gp;
    let cpus = [];
    for (let n = 0; humans.length + cpus.length < RACERS; n++) {
      const d = freeD.length ? freeD[n % freeD.length] : n % DRIVERS.length, from = DRIVERS[d]?.from;
      const own = KARTS.map((_, i) => i).filter((i) => KARTS[i].domain === from);
      const pool = own.length && Math.random() < 0.5 ? own : KARTS.map((_, i) => i);
      const gown = GLIDERS.map((_, i) => i).filter((i) => GLIDERS[i].group === (from === 'classic' ? 'originals' : from));
      const gpool = gown.length && Math.random() < 0.5 ? gown : GLIDERS.map((_, i) => i);
      cpus.push({ u: '', slot: 0, n: '', d, k: pool[Math.floor(Math.random() * pool.length)], g: gpool[Math.floor(Math.random() * gpool.length)] });
    }
    let gr = [...cpus, ...shuffle(humans)];
    if (gp) {
      // the same CPU racers all cup long (a human's driver they'd clash with is skipped), and the grid
      // in reverse order of points: the leader starts at the back
      gp.cpus ||= cpus.map((c) => ({ d: c.d, k: c.k, g: c.g }));
      const pool = gp.cpus.filter((c) => !used.has(c.d));
      cpus = [...pool, ...cpus.filter((c) => !pool.some((q) => q.d === c.d))].slice(0, RACERS - humans.length).map((c) => ({ u: '', slot: 0, n: '', d: c.d, k: c.k, g: c.g }));
      const ptsOf = (e) => gp.pts.find((p) => p[0] === this.gpKey(e))?.[2] || 0;
      gr = [...cpus, ...shuffle(humans)].map((e, i) => [e, i]).sort((a, b) => ptsOf(a[0]) - ptsOf(b[0]) || a[1] - b[1]).map(([e]) => e);
    }
    const ri = (this.R.ri || 0) + 1;
    const raw = { ri, tr: def.id, laps: set.laps, cc: set.cc, df: set.difficulty, sp: set.simple ? 1 : 0, sd: (Math.random() * 4294967295) >>> 0, gr: gr.map((e) => [e.u, e.slot, e.n, DRIVERS[e.d]?.id || '', KARTS[e.k]?.id || '', GLIDERS[e.g]?.id || '']) };
    this.setups.clear();
    this.addSetup(raw);
    Object.assign(this.R, { ph: 'load', ri, go: null, tk: [], res: null, loadAt: performance.now() });
    this.publishMine(true);
    this.startLoading(this.setups.get(ri));
  }
  // host, every so often: start once everyone has loaded; drive the karts of players who never
  // made it (or left); hand karts back to players who came back
  hostCheck() {
    if (!this.isHost || !this.R) return;
    const R = this.R, s = this.session, su = this.setups.get(R.ri);
    if (R.ph === 'load' && su && this.loadedRi === R.ri) {
      const screens = [...new Set(su.gr.filter((g) => g.u && g.u !== this.uid).map((g) => g.u))];
      const all = screens.every((u) => { const p = s.byUid.get(u)?.p; return !p || p.ld === R.ri; });
      if (all || performance.now() - R.loadAt > LOAD_TIMEOUT) {
        R.ph = 'race';
        R.go = Math.round(s.sharedNow() + (LINGER + INTRO + COUNT) * 1000);
        if (this.netRace) this.netRace.goAt = R.go;
        this.publishMine(true);
      }
    }
    const nr = this.netRace;
    if (R.ph !== 'race' && R.ph !== 'res' || !nr || !R.go) return;
    const live = new Set([...s.peers.values()].map((p) => p.uid).filter(Boolean));
    const counting = s.sharedNow() > R.go - COUNT * 1000;
    nr.grid.forEach((g, i) => {
      if (!g.u || g.u === this.uid) return;
      // (a player who just dropped out is still in byUid for a few seconds: their kart carries on
      // along the track meanwhile, and is only taken over if they don't come back)
      const peer = s.byUid.get(g.u), p = peer?.p || null, here = live.has(g.u);
      // (a screen that has gone quiet for 3 s - hidden, locked, stalled - counts as not racing: its
      // karts carry on as CPUs and it takes them back from there when it wakes up)
      const fresh = peer && performance.now() - (peer.t || 0) < 3000;
      const racing = here && fresh && p && p.ld === R.ri && p.s === 'race';
      if (!nr.taken.has(i) && (!p || (here && counting && !racing && p.s !== 'res'))) nr.takeOver(i);
      else if (nr.taken.has(i) && racing) nr.release(i);
    });
    const tk = [...nr.taken].sort((a, b) => a - b);
    if (tk.join() !== (R.tk || []).join()) { R.tk = tk; this.publishMine(true); }
  }
  hostEndRace(res) {
    if (!this.isHost) return;
    const gp = this.R.gp, su = this.setups.get(this.R.ri);
    if (gp && su) {
      // points: everyone keeps theirs (a player who left still counts, raced by a CPU this time)
      res.forEach(([i], place) => {
        const e = su.gr[i];
        if (!e) return;
        const key = this.gpKey(e), name = e.u ? e.n : DRIVERS[e.d]?.name || 'CPU';
        let row = gp.pts.find((p) => p[0] === key);
        if (!row) gp.pts.push(row = [key, name, 0, DRIVERS[e.d]?.id || '', e.u ? 1 : 0]);
        row[1] = name; row[3] = DRIVERS[e.d]?.id || row[3];
        row[2] += POINTS[place] || 0;
      });
      gp.round++;
    }
    this.R.ph = 'res';
    this.R.res = res;
    this.publishMine(true);
    this.showResults(res);
  }

  // ---- loading and the line-up -------------------------------------------------------------------------------
  startLoading(su) {
    const g = this.game;
    this.disposeRace();
    this.modal = null;
    this.raceRi = su.ri; this.loadedRi = 0;
    this.view = 'lineup';
    const people = su.gr.filter((e) => e.u).map((e) => ({ uid: e.u, name: e.n, d: e.d, k: e.k, g: e.g, tag: this.devTag(e.si, e.slot, e.multi), me: e.u === this.uid }));
    const mine = su.gr.some((e) => e.u === this.uid);
    this.lineup = new Lineup(g, people, su.def.name, mine ? 'Loading the track…' : "You're watching this one — you'll race in the next", () => this.toLobby());
    g.hudRoot.classList.add('hidden');
    g.touchRoot.classList.add('hidden');
    this.publishMine(true);
    g.audio.stopMusic();
    // build the world on the next frame (it blocks for a moment), the same on every screen
    setTimeout(() => {
      if (this.raceRi !== su.ri || !this.session) return;
      try { this.buildRace(su); } catch (e) { console.error('online race build failed', e); this.toLobby('Something went wrong loading that race.'); return; }
      this.lastTick = performance.now();   // (building blocks the page for a moment: that's not being frozen)
      if (this.session && !this.session.isHost) this.session.hostSeenAt = Math.max(this.session.hostSeenAt || 0, this.lastTick);
      this.loadedRi = su.ri;
      this.publishMine(true);
      this.updateLineup();
      if (this.isHost) this.hostCheck();
    }, 80);
  }
  buildRace(su) {
    const g = this.game, s = this.session;
    // (loading late is fine: the host drives our karts meanwhile and hands them over once we're racing)
    const mineIdx = su.gr.map((e, i) => (e.u === this.uid ? i : -1)).filter((i) => i >= 0);
    const spectate = !mineIdx.length;
    const players = new Map();
    if (!spectate) for (const i of mineIdx) {
      const e = su.gr[i], lp = this.local.find((p) => p.slot === e.slot);
      const device = lp?.device || (players.size ? 'pad' + players.size : g.p1Device());
      players.set(i, g.makePlayer({ id: e.slot, device, cursor: 0, driver: e.d, kart: e.k, glider: e.g, color: PCOL[e.slot % PCOL.length] }));
    }
    g.players = [...players.values()];
    const grid = su.gr.map((e, i) => ({
      charIndex: 0, driverIndex: e.d, kartIndex: e.k, gliderIndex: e.g,
      player: players.get(i) || null,
      remote: !players.has(i) && !(s.isHost && !e.u),
      name: e.u ? e.n : null, netHuman: !!e.u,
    }));
    const opts = { def: su.def, mode: 'online', players: g.players, grid, simple: su.sp, cc: CC[su.cc] || 0.92, difficulty: su.df, racers: RACERS, laps: su.laps, seed: su.sd };
    // the world is built from the host's seed, so every screen gets the same one
    const race = withSeed(su.sd, () => g.buildRace(opts, false));
    g.hudRoot.classList.add('hidden');
    this.race = race;
    this.netRace = new NetRace(this, race, su, { me: this.uid, spectate });
    if (this.R?.go) this.netRace.goAt = this.R.go;
    if (this.R?.tk) this.netRace.setTaken(this.R.tk);
    race.onDone = null;
  }
  updateLineup() {
    if (!this.lineup || this.view !== 'lineup') return;
    const su = this.setups.get(this.raceRi);
    if (!su) return;
    const s = this.session;
    const people = su.gr.filter((e) => e.u);
    const ready = people.map((e) => (e.u === this.uid ? this.loadedRi === su.ri : s?.byUid.get(e.u)?.p?.ld === su.ri));
    const nReady = ready.filter(Boolean).length;
    const go = this.R?.go;
    let note = `${nReady} / ${people.length} ready`;
    if (go && s) { const left = (go - s.sharedNow()) / 1000 - INTRO - COUNT; note = left > 0 ? `Starting in ${Math.ceil(left)}…` : 'Go!'; }
    this.lineup.setStatus(ready, note, nReady === people.length ? 'Everyone is here!' : undefined);
  }
  // The page is hidden (or about to be frozen): a host hands the room on - straight away on a phone
  // or when the page is being frozen (it may not run again for a while), after 2 s in a race on a
  // computer (a quick look at another tab costs nothing), after 30 s in the menus.
  onHidden(hidden, now = false) {
    clearTimeout(this.hideT);
    const s = this.session;
    if (!hidden || !s?.isHost || s.status !== 'open') return;
    const racing = this.view === 'race' || this.view === 'lineup';
    const wait = now || isPhoneScreen() ? 0 : racing ? 2000 : 30000;
    const go = () => { if ((document.hidden || now) && this.session === s && s.isHost) this.handOff('hidden'); };
    if (wait) this.hideT = setTimeout(go, wait); else go();
  }
  handOff(why) {
    const s = this.session;
    if (!s?.isHost || !s.handoff()) return;
    console.info('online: handing the room on (' + why + ')');
  }
  // per frame (from the game loop)
  tick(dt) {
    const s = this.session;
    if (!s) return;
    // a long gap between frames: this page was frozen or hidden. A host can't have kept the CPU
    // karts going (the others will have given up on it), so it moves over as a guest; a guest gives
    // the host the benefit of the doubt for a moment (its messages may still be on their way)
    const tNow = performance.now(), gap = tNow - (this.lastTick || tNow);
    this.lastTick = tNow;
    if (gap > 1000 && !s.isHost) s.hostSeenAt = Math.max(s.hostSeenAt || 0, tNow);
    // A host after such a gap checks a moment later whether the others gave up on it (they leave
    // after 4 s of silence in a race): if every other screen has gone, it follows them. (A long
    // frame of our own - loading a track - looks the same, so it's the others leaving that counts.)
    if (s.isHost && s.status === 'open' && gap > (this.view === 'race' ? 3500 : 20000)) this.gapCheck = { at: tNow + 2500, had: s.byUid.size };
    if (this.gapCheck && tNow > this.gapCheck.at) {
      const had = this.gapCheck.had;
      this.gapCheck = null;
      const live = [...s.peers.values()].some((p) => p.uid);
      if (s.isHost && s.status === 'open' && had > 0 && !live) { this.handOff('the others moved on'); return; }
    }
    // a host that has gone silent (a locked phone that never got to hand over): everyone moves on.
    // (Racing it publishes 15 times a second; loading can block it for a while; in the menus it
    // sends at least every 5 s.)
    if (!s.isHost && s.status === 'open' && s.hostSeenAt && this.view !== 'joining') {
      const limit = this.view === 'race' ? 4000 : this.view === 'lineup' ? 20000 : 25000;
      if (tNow - s.hostSeenAt > limit) { this.bubble('The host stopped responding — finding a new host…'); s.abandonHost(); return; }
    }
    s.tick(dt);
    // our own kart driven by the host (we were away): say so until we have it back
    const nr = this.netRace;
    const away = nr && !nr.spectating && [...nr.myIdxs].some((i) => nr.taken.has(i)) && this.view === 'race';
    if (away !== !!this.awayShown) { this.awayShown = away; if (away) this.banner('Catching up — your kart is on autopilot for a moment…'); else if (!['reconnecting', 'migrating'].includes(s.status)) this.banner(null); }
    if (s.isHost && s.status === 'open' && this.R) {
      this.hostT = (this.hostT || 0) - dt;
      if (this.hostT <= 0) { this.hostT = 0.25; this.hostCheck(); }
      if (this.view !== 'race' && this.setups.get(this.R.ri) && performance.now() - (this.suT || 0) > 1000) this.publishMine();
    }
    if (!s.isHost && this.view === 'joining') this.followHost();
    // the line-up gives way to the race when the flyover starts
    if (this.view === 'lineup') {
      this.lineupT = (this.lineupT || 0) - dt;
      if (this.lineupT <= 0) { this.lineupT = 0.2; this.updateLineup(); }
      const go = this.R?.go;
      if (go && this.race && this.loadedRi === this.raceRi && s.sharedNow() >= go - (INTRO + COUNT) * 1000) this.attachRace();
    }
    if (this.view === 'race' && this.netRace?.spectating && !this.game.screen) {
      for (const [, m] of this.game.menuEvents) {
        if (m.left || m.right) this.netRace.cycleSpec(m.left ? -1 : 1);
        if (m.back || m.start) { this.pause(); break; }
      }
    }
    // the host's room state rides on its kart updates during a race
    if (this.view === 'race' && s.isHost && this.R) {
      const m = s.mine, R = this.roomOut(), su = this.setups.get(this.R.ri), t = performance.now();
      if ((su || this.R.gp) && t - (this.suT || 0) > 1000) { if (su) R.su = su.raw; if (this.R.gp) R.gp = this.gpOut(); this.suT = t; }
      m.R = R;
    }
  }
  attachRace() {
    const g = this.game;
    this.view = 'race';
    this.lineup = null;
    g.clearScreen();
    g.race = this.race;
    g.paused = false;
    g.hudRoot.classList.remove('hidden');
    g.touchRoot.classList.toggle('hidden', !g.players.some((p) => p.device === 'touch'));
    if (this.netRace?.spectating) this.specBar(true);
    this.publishMine(true);
  }
  // spectators: buttons to switch whom to follow and to open the menu (touch has no keys)
  specBar(on) {
    document.getElementById('ol-spec')?.remove();
    if (!on) return;
    const el = document.createElement('div');
    el.id = 'ol-spec';
    el.innerHTML = '<button data-s="-1" aria-label="Previous racer">◀︎</button><button data-s="menu" aria-label="Menu">☰</button><button data-s="1" aria-label="Next racer">▶︎</button>';
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-s]');
      if (!b || this.view !== 'race') return;
      if (b.dataset.s === 'menu') this.pause(); else this.netRace?.cycleSpec(+b.dataset.s);
    });
    document.body.appendChild(el);
  }

  // ---- results -----------------------------------------------------------------------------------------------
  showResults(res) {
    const g = this.game, su = this.setups.get(this.raceRi), race = this.race;
    if (!su || !Array.isArray(res)) return;
    this.view = 'results';
    if (race) {
      race.inputBlocked = true;
      for (const c of race.cams) { c.kart.engine?.set(0, false, false); c.kart.finished = true; }
    }
    g.touchRoot.classList.add('hidden');
    const gp = this.isHost ? this.R?.gp : this.gp;
    this.resRound = gp?.round;
    const rows = res.slice(0, RACERS).map((r, n) => {
      const i = int(r?.[0], 0, RACERS - 1), e = su.gr[i] || {}, d = DRIVERS[e.d] || DRIVERS[0];
      const t = num(r?.[1], 0, 1e5), est = !!r?.[2], me = e.u === this.uid;
      return `<div class="rrow${me ? ' me' : ''}${e.u ? ' ol' : ''}" style="${me ? `--pc:${PCOL[e.slot % 8]}` : e.u ? '--pc:#3b8bff' : ''}"><span class="pl">${ORD(n + 1)}</span><img src="${driverPortrait(d)}" alt=""><span class="nm">${e.u ? `${this.devTag(e.si, e.slot, e.multi)}${esc(e.n)}${e.n.startsWith(d.name) ? '' : ` <em>${esc(d.name)}</em>`}` : `${esc(d.name)} <em class="cpu">CPU</em>`}</span><span class="tm">${est ? '--:--.--' : fmt(t)}</span>${gp ? `<span class="pts">+${POINTS[n] || 0}</span>` : ''}</div>`;
    }).join('');
    if (gp) { this.showGPResults(gp, su, rows); return; }
    const items = this.isHost
      ? [{ label: 'Next race ▶︎', action: () => this.hostNext(true) }, { label: 'Change racers', action: () => this.hostNext(false) }, { label: 'Leave room', action: () => this.toLobby() }]
      : [{ label: 'Leave room', action: () => this.toLobby() }];
    g.resultsMenu(`Results · ${su.def.name}`, `<div class="results">${rows}</div>${this.isHost ? '' : '<p class="ol-note">Waiting for the host to start the next race…</p>'}`, items);
    this.publishMine(true);
  }
  // Grand Prix results: this race with its points, and the standings so far (or the final ones)
  showGPResults(gp, su, rows) {
    const g = this.game, last = gp.round >= gp.tracks.length;
    const order = [...gp.pts].sort((a, b) => b[2] - a[2]);
    const medal = ['🥇', '🥈', '🥉'];
    const stand = order.map((p, n) => {
      const d = DRIVERS.find((x) => x.id === p[3]) || DRIVERS[0], me = p[0].startsWith(this.uid + ':');
      return `<div class="rrow${me ? ' me' : ''}${p[4] ? ' ol' : ''}" style="${me ? '--pc:#ff4a3a' : p[4] ? '--pc:#3b8bff' : ''}"><span class="pl">${last && n < 3 ? medal[n] : ORD(n + 1)}</span><img src="${driverPortrait(d)}" alt=""><span class="nm">${esc(p[1])}${p[4] ? '' : ' <em class="cpu">CPU</em>'}</span><span class="pts big">${p[2]}</span></div>`;
    }).join('');
    const next = TRACKS.find((t) => t.id === gp.tracks[gp.round]);
    const head = last ? `🏆 ${esc(order[0]?.[1] || '')} wins the ${esc(gp.name)}!` : `Standings after race ${gp.round} of ${gp.tracks.length}`;
    const items = this.isHost
      ? last ? [{ label: 'New race ▶︎', action: () => { this.R.gp = null; this.hostNext(false); } }, { label: 'Leave room', action: () => this.toLobby() }]
        : [{ label: `Next: ${next?.name || 'race'} ▶︎`, action: () => this.hostNext(true) }, { label: 'Leave room', action: () => this.toLobby() }]
      : [{ label: 'Leave room', action: () => this.toLobby() }];
    g.resultsMenu(`${gp.name} · ${last ? 'Final standings' : `Race ${gp.round}/${gp.tracks.length} · ${su.def.name}`}`,
      `<div class="ol-gp"><div><h3>${esc(su.def.name)}</h3><div class="results">${rows}</div></div><div><h3>${head}</h3><div class="results">${stand}</div></div></div>${this.isHost ? '' : `<p class="ol-note">${last ? 'The cup is over!' : `Next: ${esc(next?.name || '')} — waiting for the host…`}</p>`}`, items);
    if (last) g.audio.sfx('finish');
    this.publishMine(true);
  }
  hostNext(keep) {
    Object.assign(this.R, { n: (this.R.n || 0) + 1, keep: keep ? 1 : 0, res: null, go: null, tk: [], ph: 'sel' });
    this.showSelect(keep);
    // straight on to the map (or the cup's next map) if everyone's still locked in; anyone new picks first
    // (a screen with nobody on it yet - someone who arrived during the race - gets to pick first,
    // unless the room is already full)
    const hs = this.humans(), fresh = hs.length < RACERS && this.session.members().some((m) => !m.me && !(Array.isArray(m.p?.pl) && m.p.pl.length));
    if (keep && this.local.length && this.local.every((p) => p.ph === 'r') && hs.every((h) => h.ph === 'r') && !fresh) this.toTrack();
  }
  showWaiting() {
    this.view = 'wait';
    this.game.setScreen(`<div class="screen menu"><div class="panel ol-panel"><h2>Online</h2><div class="ol-wait"><p>A race just finished — you'll join the next one.</p></div><div class="olroster"></div>
      <div class="list"><button class="mbtn focus" data-i="0"><span>Leave room</span></button></div></div></div>`, {
      update: () => { for (const [, m] of this.game.menuEvents) if (m.back || m.ok) { this.toLobby(); return; } },
      click: () => this.toLobby(),
    });
    this.renderRoster();
  }

  // ---- pausing (an online race never stops) ---------------------------------------------------------------------
  pause() {
    const g = this.game, race = this.race;
    if (!race || this.view !== 'race' || performance.now() - (this.pauseClosed || 0) < 250 || g.screen) return;
    race.inputBlocked = true;
    const resume = () => { g.resumeFullscreen(); race.inputBlocked = false; this.pauseClosed = performance.now(); g.clearScreen(); };
    g.menu({ title: 'Online race', cls: 'pause', sub: g.pauseNote(), items: [{ label: 'Resume', action: resume }, { label: 'Leave room', action: () => this.toLobby() }], back: resume });
  }

  // ---- connection trouble ----------------------------------------------------------------------------------------
  onStatus(s, st, info) {
    if (s !== this.session) return;
    if (st === 'reconnecting') this.banner('Reconnecting…');
    else if (st === 'migrating') this.banner(info?.next ? `The host left — ${info.next} is taking over…` : 'The host left — finding a new host…');
    else if (st === 'open') this.banner(null);
  }
  onMigrated(asHost) {
    const s = this.session;
    this.banner(null);
    this.joinedAt = performance.now();
    this.bubble(asHost ? '👑 You are the host now' : 'Back in the race room');
    if (asHost) {
      this.R = { ph: 'sel', n: 1, ri: 0, tk: [], ...(this.R || {}), g: s.gen, o: s.order };
      this.suT = 0;
      if (this.netRace) {
        // drive the CPU karts, and the karts of anyone not here yet (they get theirs back as they arrive)
        const nr = this.netRace, live = new Set([...s.peers.values()].map((p) => p.uid).filter(Boolean));
        nr.grid.forEach((e, i) => { if (e.u && e.u !== this.uid && !live.has(e.u)) nr.taken.add(i); });
        nr.applyRoles();
        this.R.tk = [...nr.taken].sort((a, b) => a - b);
        if (this.R.ph === 'load' && !this.R.go) this.R.loadAt = performance.now();
        if (this.R.ph === 'res' && this.view !== 'results' && this.R.res) this.showResults(this.R.res);
      } else if (this.R.ph !== 'sel') {
        this.R.ph = 'sel'; this.R.n = (this.R.n || 0) + 1;
        if (this.view !== 'select') this.showSelect(true);
      }
      this.publishMine(true);
    } else {
      this.netRace?.applyRoles();
      this.publishMine(true);
    }
    this.renderRoster();
    if (this.view === 'select') this.selRefreshSoon();
  }
  onFatal(s, reason) {
    if (s !== this.session) return;
    const msg = ERR[reason] || ERR.unreachable;
    this.banner(null);
    if (this.view === 'race' && this.race && this.netRace) {
      // carry on alone: every other kart becomes a local CPU and the race finishes offline
      this.bubble('Connection lost — finishing this race offline');
      this.goOffline();
      return;
    }
    this.toLobby(msg);   // (a note that stays put; the lobby list itself may well be fine)
  }
  goOffline() {
    const race = this.race, nr = this.netRace, g = this.game, s = this.session;
    this.session = null;
    try { s?.leave(); } catch { /* gone */ }
    const offset = s?.offset || 0;
    nr.session = { isHost: true, sharedNow: () => performance.now() + offset, mine: {}, publish() {}, send() {}, hostUid: this.uid };
    nr.me = this.uid;
    for (let i = 0; i < nr.grid.length; i++) if (!nr.myIdxs.has(i)) nr.taken.add(i);
    nr.applyRoles();
    const left = nr.countdownLeft();
    nr.dispose();
    race.net = null;
    race.hazards.clock = null;
    if (!race.started) { race.state = 'countdown'; race.countdown = Math.max(0.5, Math.min(3.6, left)); race.hud?.hideTitle(); }
    this.netRace = null; this.race = null; this.R = null;
    this.view = 'none';
    race.onDone = (res) => {
      g.touchRoot.classList.add('hidden');
      for (const c of race.cams) c.kart.engine?.set(0, false, false);
      const rows = res.map((r) => `<div class="rrow${r.player ? ' me' : ''}" style="${r.player ? `--pc:${r.player.color}` : ''}"><span class="pl">${ORD(r.place)}</span><img src="${driverPortrait(DRIVERS[r.driverIndex] || DRIVERS[0])}" alt=""><span class="nm">${r.kart.netName ? `${esc(r.kart.netName)} <em>${esc(DRIVERS[r.driverIndex]?.name || '')}</em>` : esc(DRIVERS[r.driverIndex]?.name || '')}</span><span class="tm">${r.estimated ? '--:--.--' : fmt(r.time)}</span></div>`).join('');
      g.resultsMenu(`Results · ${race.opts.def.name}`, `<div class="results">${rows}</div>`, [{ label: 'Back to Online', action: () => { g.race?.dispose(); g.race = null; g.startAttract(); this.open(); } }, { label: 'Main menu', action: () => g.quitToMenu() }]);
    };
    if (!race.cams.length) race.onDone(race.results_());
  }
  banner(text) {
    let el = document.getElementById('ol-banner');
    if (!text) { el?.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'ol-banner'; document.body.appendChild(el); }
    el.innerHTML = `<span class="spinner"><i></i><i></i><i></i></span>${esc(text)}`;
  }

  // ---- leaving ---------------------------------------------------------------------------------------------------
  disposeRace() {
    const g = this.game;
    this.specBar(false);
    if (this.race) {
      if (g.race === this.race) g.race = null;
      try { this.race.dispose(); } catch (e) { console.error(e); }
    }
    this.race = null; this.netRace = null; this.lineup = null;
  }
  leaveRoom() {
    const s = this.session;
    this.session = null;
    if (s) { try { s.leave(); } catch { /* gone */ } }
    this.banner(null);
    this.modal = null;
    this.R = null; this.prev.clear(); this.setups.clear();
    this.raceRi = 0; this.loadedRi = 0;
  }
  toLobby(msg = '', error = '') {
    this.leaveRoom();
    this.disposeRace();
    const g = this.game;
    g.paused = false;
    g.touchRoot.classList.add('hidden');
    g.hudRoot.classList.add('hidden');
    if (!g.attract) g.startAttract();
    this.open(msg, error);
  }
  // Game.quitToMenu (from anywhere): just disconnect
  leave() {
    if (!this.session && !this.race) { this.closeLobby(); return; }
    this.leaveRoom();
    this.disposeRace();
    this.closeLobby();
    this.view = 'none';
  }
}

function isPhoneScreen() { return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600; }
