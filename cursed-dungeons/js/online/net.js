// Online play: one screen hosts its world, other screens join it (up to 8 players in all, each
// screen bringing its own local players).
//
// Who owns what
// - The HOST owns the world: the region (and the seamless crossing, decided on the centre of every
//   player), the time of day, every curse, boss, nest and spawn, world missions (curtains),
//   dungeons, quests and the story. It publishes the curses near the guests 10 times a second.
// - Every screen owns its own players: movement, abilities, health, Reverse Cursed Technique,
//   dodge i-frames, menus. It publishes their state 10 times a second (presence), and the other
//   screens draw them as figures (remote.js) with snapshot interpolation.
// - Guests see the host's curses as puppets. A guest's hit on one is sent to the host, who applies
//   it (and drops the coins, which every screen picks up for itself, and shares the XP).
// - Curses chase everybody. A curse's melee or area attack on a guest is checked on the host
//   against the guest's figure and sent to that guest, whose own screen applies it (so dodge rolls,
//   i-frames and technique defences still work). Curse projectiles and puddles are re-created on
//   every screen and only hurt that screen's own players.
// - Abilities, Domain Expansions and ultimates are replayed on every screen by the figure's kit
//   (the picture and the crowd control); damage only ever comes from the caster's own screen.
// - Nothing pauses online: menus open over the running world and their player stands still.
//
// Positions on the wire are in the sender's frame: the region it is in (the seamless world gives
// every region its own coordinates), or 'M<seed>' inside a dungeon. A receiver converts with its
// own tile offsets, so a crossing (rebase) on either side never needs to be in sync.
//
// The game calls in through game.net (null when offline); every hook is optional-chained there.
import * as THREE from 'three/webgpu';
import { Session, Clock, loadMiniRooms, tabUid, PROTO, MAX_PLAYERS, num, int, str, esc, vec, fin, r2, r3, UID_RE, ID_WORD, cleanName } from './session.js';
import { makeFigure, disposeFigure, readPlayer, writePlayer, updateFigure, updateTag, enemyType, writeEnemy, readEnemy, Puppet, EF } from './remote.js';
import { PLAYER_COLORS } from '../entities/player.js';
import { SORCERERS } from '../sorcerers/index.js';
import { REGIONS } from '../world/regions/all.js';
import { toast, h } from '../ui/ui.js';
import { skyUniforms, makeBarrier } from '../gfx/barrier.js';
import { CURTAIN_ENV } from '../world/worldMission.js';
export { openOnline } from './lobby.js';

const UID = tabUid();
const FRAME_RE = /^(M\d{1,10}|[a-z0-9_]{1,32})$/;
const SHAPES = ['orb', 'nail', 'arrow', 'cube', 'slash'];
const MK_SHAPES = ['circle', 'rect', 'cone'];
const DROPS = new Set(['coin', 'heal', 'ce']);
const NEAR = 80;          // curses / shots / telegraphs this close to a guest are shared with them
const MAX_ENEMIES = 48;   // per update
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const arr = (v) => [r2(v.x), r2(v.y), r2(v.z)];
const REASONS = {
  host_left: 'The host closed their game.',
  not_found: 'That game has closed.',
  full: 'That game is full.',
  taken: 'That game has closed.',
  lost: 'The connection to the game was lost.',
  offline: 'Your game went offline: the connection was lost.',
  timeout: 'The game did not answer in time.',
  disconnected: 'Could not reach the online service.',
  unreachable: 'Could not reach the online service.',
  nohost: 'The host did not answer. Their game may have just closed.',
  rate_limited: 'The online service is busy. Try again in a moment.',
};
export const reasonText = (r) => REASONS[r] || 'The online service is not answering.';

export class Net {
  constructor(game, session, role) {
    const g = this.g = game;
    this.s = session; this.role = role; this.uid = UID;
    this.maxPlayers = MAX_PLAYERS;
    this.hostUid = role === 'host' ? UID : null;
    this.hostName = 'the host';
    this.screens = new Map();     // uid -> { uid, name, role, clock, players: Map(slot -> figure), stage, accepted, lastT, lastAt }
    this.figures = [];            // every other screen's players (Player objects with isRemote)
    this.puppets = new Map();     // guests: host enemy id -> Puppet
    this.handled = new WeakSet();
    this.entered = role === 'host';
    this.order = [];              // host: accepted guest screens, in join order
    this.refused = new Map();     // host: uid -> when refused
    this.H = null; this.E = null; this.Et = 0; this.Eseq = 0; this.EseqDone = -1;
    this.hostFrame = '';
    this.pubT = 0; this.tagT = 0;
    this.ids = new WeakMap(); this.byId = new Map(); this.nextId = 1;
    this.tv = 0; this.lastTv = null;
    this.stats = { out: {}, in: {} };
    this.blankInput = { move: { x: 0, y: 0 }, aimStick: null, mouse: false, held: {}, pressed: {}, released: {} };
    this.guestWorld = null;
    this.errT = 0;
    // hooks into the game
    this.origToast = g.toast;
    g.toast = (...a) => { if (!this.muteToast) this.origToast(...a); };
    g.markers.onSpawn = (o) => { try { this.onMarker(o); } catch (e) { this.logError('marker', e); } };
    if (role === 'host') {
      const P = g.pickups, drop = this.origDrop = P.drop;
      P.drop = (kind, pos, n = 1, value = 1) => { drop.call(P, kind, pos, n, value); try { this.onDrop(kind, pos, n, value); } catch (e) { this.logError('drop', e); } };
      const D = g.domainSys, start = this.origDomStart = D.start;
      D.start = (caster, def) => { const ok = start.call(D, caster, def); try { if (ok !== false && caster?.isEnemy) this.onEnemyDomain(caster, def); } catch (e) { this.logError('domain', e); } return ok; };
    }
    session.on('presence', () => { try { this.onPresence(); } catch (e) { this.logError('presence', e); } });
    session.on('events', (d) => this.onEvents(d));
    session.on('status', (st, info) => this.onStatus(st, info));
    session.on('ended', (reason) => this.onEnded(reason));
    // a hidden tab gets no frames: keep saying we're here (the world itself waits)
    this.keepAlive = setInterval(() => { if (document.hidden && this.live) { try { this.publish(performance.now()); this.s.flush(1, true); } catch (e) { this.logError('keepalive', e); } } }, 1000);
  }

  get isHost() { return this.role === 'host'; }
  get isGuest() { return this.role === 'guest'; }
  get live() { return !this.s.ended && !this.disposed; }
  logError(where, e) { const t = performance.now(); if (t - this.errT > 2000) { this.errT = t; console.error('online:', where, e); } }
  localName(p) { return p?.netName || this.defaultLocalName(p); }
  get myName() { return this.g.players[0]?.netName || this.pendingName || 'Sorcerer'; }

  // ------------------------------------------------------------ counts and names
  acceptedScreens() { return [...this.screens.values()].filter((s) => s.accepted && s.stage === 'play'); }
  remoteCount() { let n = 0; for (const s of this.acceptedScreens()) n += s.count ?? s.players.size; return n; }
  playerCount() { return this.roomPlayers(); }
  // people already in the game, as the host counts them (for joining screens)
  roomPlayers() { return this.remoteCount() + (this.entered ? this.g.players.length : 0); }
  canAddLocal() { return this.roomPlayers() < MAX_PLAYERS; }
  // a name for a local player who has not chosen one: their sorcerer, numbered when taken
  defaultLocalName(p, taken = null) {
    const base = SORCERERS[p?.sorcerer]?.name ?? 'Sorcerer';
    const used = taken ?? new Set([...this.takenNames(), ...this.g.players.filter((q) => q !== p).map((q) => q.netName)]);
    if (!used.has(base)) return base;
    for (let i = 2; i < 20; i++) if (!used.has(`${base} ${i}`)) return `${base} ${i}`;
    return base;
  }
  takenNames() { return new Set([...this.figures.map((f) => f.netName), ...[...this.screens.values()].flatMap((s) => s.names ?? [])]); }
  frameId() {
    const g = this.g;
    if (g.mode === 'mission' && g.mission && !g.mission.isWorld) return 'M' + ((g.mission.def?.seed ?? 0) >>> 0);
    return g.level?.regionId ?? '';
  }
  // a point in frame f -> this screen's frame (false when that region is not drawn here)
  toLocal(f, x, y, z, out) {
    const g = this.g;
    if (!f) return false;
    if (f === this.frameId()) { out.set(x, y, z); return true; }
    if (g.mode !== 'world' || f[0] === 'M' || !g.seam) return false;
    const t = g.seam.tileFor(f);
    if (!t || !t.off || t === g.seam.cur || t.state !== 'live') return false;
    out.set(x + t.off.x, y + t.off.y, z + t.off.z);
    return true;
  }
  // hosting: what curses may target (the party plus the guests' figures)
  hostTargets(base) {
    if (!this.figures.length) return base;
    const out = this._tg ??= [];
    out.length = 0;
    for (const p of base) out.push(p);
    for (const f of this.figures) if (f.inWorld && !f.away) out.push(f);
    return out;
  }
  // hosting: the guests' figures that count for the seamless crossing (the party centre): settled
  // ones near this screen's own players (not loading, not left behind somewhere else)
  crossingFigures() {
    const g = this.g, c = this._cc ??= new THREE.Vector3();
    const ps = g.players.filter((p) => !p.dead);
    if (!ps.length) return [];
    c.set(0, 0, 0); for (const p of ps) c.add(p.pos); c.divideScalar(ps.length);
    return this.figures.filter((f) => f.inWorld && !f.transit && !f.away && !f.dead && f.pos.distanceToSquared(c) < 110 * 110);
  }
  guestNear(pos, R = NEAR) {
    for (const f of this.figures) if (f.inWorld && f.pos.distanceToSquared(pos) < R * R) return true;
    return false;
  }
  hasCompany() { return this.acceptedScreens().length > 0 || (this.isGuest && !!this.hostUid); }

  // ------------------------------------------------------------ presence in
  onPresence() {
    if (this.disposed) return;
    const now = performance.now(), seen = new Set();
    for (const pid in this.s.recv) {
      const { data: d, at } = this.s.recv[pid];
      if (!d || typeof d !== 'object' || d.v !== PROTO || !UID_RE.test(d.u) || d.u === UID) continue;
      seen.add(d.u);
      if (this.handled.has(d)) continue;
      this.handled.add(d);
      try { this.readScreen(d, at); } catch (e) { this.logError('presence ' + d.u, e); }
    }
    // a screen that dropped out of the room gets a few seconds to come back (a reconnect is the same uid)
    for (const scr of this.screens.values()) {
      if (seen.has(scr.uid)) scr.goneAt = 0;
      else if (!scr.goneAt) scr.goneAt = now;
    }
    if (seen.size > (this.lastSeen ?? 0)) this.pubT = 0;   // someone new: tell them about us now
    this.lastSeen = seen.size;
  }

  readScreen(d, at) {
    const g = this.g, isHostMsg = d.r === 'h';
    if (this.isHost && isHostMsg) return;   // a second host in our room
    if (this.isGuest && isHostMsg) {
      if (this.hostUid && this.hostUid !== d.u) return;
      this.hostUid = d.u;
      this.hostName = cleanName(d.n, 'Host');
    }
    let scr = this.screens.get(d.u);
    if (!scr) {
      scr = { uid: d.u, role: isHostMsg ? 'h' : 'g', name: 'Sorcerer', clock: new Clock(), players: new Map(), stage: 'join', accepted: false, lastT: -1, lastAt: at, names: [], count: 0 };
      this.screens.set(d.u, scr);
    }
    const t = num(d.t, 0, 1e13, -1) / 1000;
    if (t <= scr.lastT) return;   // duplicate or reordered
    scr.lastT = t; scr.lastAt = at; scr.goneAt = 0;
    scr.clock.sample(t * 1000, at);
    scr.name = cleanName(d.n, 'Sorcerer');
    const wasStage = scr.stage;
    scr.stage = d.s === 'play' ? 'play' : 'join';
    const f = typeof d.f === 'string' && FRAME_RE.test(d.f) ? d.f : '';
    scr.frame = f;
    scr.transit = d.tr === 1;
    scr.hidden = d.hd === 1;
    const list = Array.isArray(d.P) && scr.stage === 'play' ? d.P.slice(0, 4).map(readPlayer).filter(Boolean) : [];
    scr.count = list.length;
    scr.names = list.map((s) => cleanName(s.name));
    if (this.isGuest && isHostMsg) this.readHost(d, f, t, at);
    // who is in the game: the host accepts screens (and counts the 8 places); guests follow its list
    if (this.isHost) {
      if (scr.stage === 'play' && !scr.accepted) this.tryAccept(scr);
      if (scr.stage === 'join' && wasStage === 'play' && scr.accepted) { scr.accepted = false; this.order = this.order.filter((u) => u !== scr.uid); this.leftBubble(scr); }
    } else {
      const was = scr.accepted;
      scr.accepted = scr.uid === this.hostUid || (Array.isArray(this.H?.o) && this.H.o.includes(scr.uid));
      if (was && !scr.accepted) this.leftBubble(scr);
    }
    if (!scr.accepted || scr.stage !== 'play' || !this.entered) { this.clearScreen(scr); return; }
    // its players
    const slots = new Set();
    for (const s of list) {
      slots.add(s.slot);
      let fig = scr.players.get(s.slot);
      if (fig && s.sorcerer && fig.sorcerer !== s.sorcerer) { this.dropFigure(scr, s.slot); fig = null; }
      if (!fig) {
        if (this.figures.length >= MAX_PLAYERS - 1) continue;
        fig = makeFigure(this, scr, s.slot, s.sorcerer ?? 'yuji');
        scr.players.set(s.slot, fig);
        this.figures.push(fig);
        fig.netName = cleanName(s.name);
        if (scr.welcomed && performance.now() > (this.quietUntil ?? 0)) { toast(`🌐 ${fig.netName} joined the game`); g.audio?.ui?.('buy'); }
        this.rosterDirty = true;
      }
      fig.netName = cleanName(s.name, fig.netName);
      s.t = t; s.f = f;
      fig.buf.push(s);
      if (fig.buf.length > 40) fig.buf.shift();
    }
    for (const slot of [...scr.players.keys()]) if (!slots.has(slot)) { const fig = scr.players.get(slot); toast(`${fig.netName} dropped out`); this.dropFigure(scr, slot); }
    if (!scr.welcomed) {
      scr.welcomed = true;
      if ((scr.uid !== this.hostUid || this.isHost) && performance.now() > (this.quietUntil ?? 0)) { toast(`🌐 ${list.map((s) => cleanName(s.name)).join(' & ') || scr.name} joined the game`, 'big'); g.audio?.ui?.('buy'); }
    }
  }
  // the host's world state, its curses
  readHost(d, f, t) {
    this.hostFrame = f;
    const H = d.H && typeof d.H === 'object' ? d.H : null;
    if (H) {
      this.H = {
        o: Array.isArray(H.o) ? H.o.filter((u) => typeof u === 'string' && UID_RE.test(u)).slice(0, 8) : [],
        rg: typeof H.rg === 'string' && FRAME_RE.test(H.rg) ? H.rg : f,
        tv: int(H.tv, 0, 1e9), hr: num(H.hr, 0, 24, -1), pn: H.pn === 1,
        wm: Array.isArray(H.wm) && H.wm.length >= 6 && H.wm.slice(0, 5).every((v) => fin(v)) ? H.wm : null,
        ob: Array.isArray(H.ob) ? [str(H.ob[0], 80), str(H.ob[1], 120)] : null,
        md: H.md && typeof H.md === 'object' ? cleanMission(H.md) : null,
        np: int(H.np, 0, 8),
      };
    }
    if (Array.isArray(d.E)) { this.E = d.E.slice(0, MAX_ENEMIES + 8); this.Et = t; this.Eseq++; }
    else { this.E = null; this.Eseq++; }
  }
  tryAccept(scr) {
    const r = this.refused.get(scr.uid);
    if (r && performance.now() - r < 4000) return;
    const room = MAX_PLAYERS - (this.g.players.length + this.remoteCount());
    if (scr.count > room) {
      this.refused.set(scr.uid, performance.now());
      this.send({ k: 'no', to: scr.uid, why: 'full', room: Math.max(0, room) }, true);
      return;
    }
    scr.accepted = true;
    if (!this.order.includes(scr.uid)) this.order.push(scr.uid);
    this.rosterDirty = true;
    this.pubT = 0;
  }
  leftBubble(scr) {
    const names = [...scr.players.values()].map((f) => f.netName);
    if (names.length) { toast(`🌐 ${names.join(' & ')} left the game`); this.g.audio?.ui?.('back'); }
    this.clearScreen(scr);
  }
  clearScreen(scr) { for (const slot of [...scr.players.keys()]) this.dropFigure(scr, slot); }
  dropFigure(scr, slot) {
    const fig = scr.players.get(slot); if (!fig) return;
    scr.players.delete(slot);
    const i = this.figures.indexOf(fig); if (i >= 0) this.figures.splice(i, 1);
    disposeFigure(this, fig);
    this.rosterDirty = true;
  }
  removeScreen(uid, quiet = false) {
    const scr = this.screens.get(uid); if (!scr) return;
    if (!quiet && scr.accepted && scr.players.size) this.leftBubble(scr); else this.clearScreen(scr);
    this.screens.delete(uid);
    this.order = this.order.filter((u) => u !== uid);
    this.rosterDirty = true;
  }

  // seats 1-8 (colours): the host's players, then each screen in the order it joined
  assignSeats() {
    const g = this.g;
    const order = this.isHost ? [UID, ...this.order] : [this.hostUid, ...(this.H?.o ?? [])];
    let seat = 0;
    for (const uid of order) {
      if (uid === UID) { for (const p of g.players) { p.seat = seat; p.color = PLAYER_COLORS[seat % 8]; seat++; } continue; }
      const scr = this.screens.get(uid); if (!scr) continue;
      for (const slot of [...scr.players.keys()].sort()) { const f = scr.players.get(slot); f.seat = seat; f.color = PLAYER_COLORS[seat % 8]; f.index = seat; seat++; }
    }
    if (!order.includes(UID)) for (const p of g.players) { p.seat = seat; p.color = PLAYER_COLORS[seat % 8]; seat++; }
  }

  // ------------------------------------------------------------ per frame
  update(realDt, dt) {
    if (this.disposed) return;
    const g = this.g, now = performance.now();
    for (const scr of [...this.screens.values()]) if (scr.goneAt && now - scr.goneAt > 6000) this.removeScreen(scr.uid);
    if (this.rosterDirty) { this.rosterDirty = false; this.assignSeats(); }
    // the other screens' players
    const tagsOn = g.state === 'playing' && !g.cutscenes?.active;
    for (const scr of this.screens.values()) {
      if (!scr.players.size) continue;
      const rt = scr.clock.renderTime(now);
      const away = now - scr.lastAt > 4000 || !!scr.hidden;
      for (const fig of scr.players.values()) {
        fig.away = away; fig.transit = scr.transit;
        if (fig.transit) { fig.inWorld = false; fig.object.visible = false; updateTag(g, fig, false); continue; }   // loading a region: back when it's there
        try {
          updateFigure(this, fig, scr, dt, rt);
          // abilities, played back at the figure's own time
          while (fig.evq.length && (rt == null || fig.evq[0].t <= rt + 0.03 || now - fig.evq[0].at > 900)) this.applyAbility(fig, fig.evq.shift().ev);
        } catch (e) { this.logError('figure', e); }
        updateTag(g, fig, tagsOn && fig.inWorld && fig.object.visible);
      }
    }
    if (this.isGuest && this.entered) {
      try { this.syncPuppets(); } catch (e) { this.logError('puppets', e); }
      try { this.syncWorld(realDt); } catch (e) { this.logError('world', e); }
    }
    if (this.isHost) this.gcIds();
    this.pubT -= realDt;
    if (this.pubT <= 0) {
      const company = this.acceptedScreens().length > 0 || (this.isGuest && this.hostUid);
      this.pubT = company ? (this.entered ? 0.1 : 0.5) : 1;
      this.publish(now);
    }
    this.s.flush(realDt);
    this.updatePill();
  }

  // ------------------------------------------------------------ presence out
  publish(now) {
    const g = this.g;
    const d = { v: PROTO, u: UID, r: this.isHost ? 'h' : 'g', t: Math.round(now), n: this.myName, s: this.entered ? 'play' : 'join', f: this.frameId() };
    if (this.entered && g.state === 'playing') d.P = g.players.slice(0, 4).map((p, i) => writePlayer(p, i, this.localName(p)));
    if (g.traveling || this.travelling) d.tr = 1;   // (loading a region: my players' positions are stale)
    if (document.hidden) d.hd = 1;                    // (a hidden tab's game is stopped: count us as away)
    if (this.isHost) {
      d.H = this.hostState();
      const E = this.enemySnap(); if (E) d.E = E;
    }
    this.s.publish(d);
    this.stats.out.p = (this.stats.out.p ?? 0) + 1;
  }
  hostState() {
    const g = this.g, wm = g.worldMission;
    const H = { o: this.order.filter((u) => this.screens.get(u)?.accepted), rg: this.frameId(), tv: this.tv, np: g.players.length + this.remoteCount() };
    const tod = g.timeOfDay; if (tod) { H.hr = r2(tod.hour); H.pn = tod.pinned != null ? 1 : 0; }
    if (wm && wm.Z) H.wm = [r2(wm.Z.x), r2(wm.Z.y), r2(wm.Z.z), r2(wm.Z.r), wm.stage === 'lift' ? 2 : 1, String(wm.B?.rim?.value?.getHexString?.() ?? '7a5cff'), String(wm.ch?.place ?? '').slice(0, 40)];
    const ob = g.hud?.obj;
    if (ob && !ob.classList.contains('hidden')) H.ob = [ob.children[0].textContent.slice(0, 80), ob.children[1].textContent.slice(0, 120)];
    if (g.mode === 'mission' && g.mission && !g.mission.isWorld) {
      const m = g.mission.def;
      H.md = { id: m.id ?? null, name: String(m.name ?? '').slice(0, 60), biome: m.biome, objective: m.objective, boss: m.boss, difficulty: m.difficulty, seed: m.seed >>> 0, chapter: m.chapter ?? null };
    }
    return H;
  }
  idOf(e) {
    let id = this.ids.get(e);
    if (!id) { id = this.nextId++; this.ids.set(e, id); this.byId.set(id, e); }
    return id;
  }
  gcIds() {
    if ((this.gcT = (this.gcT ?? 0) + 1) % 120) return;
    const live = new Set(this.g.enemies);
    for (const [id, e] of this.byId) if (!live.has(e)) this.byId.delete(id);
  }
  enemySnap() {
    const g = this.g;
    const figs = this.figures.filter((f) => f.inWorld);
    if (!figs.length) return null;
    const out = [];
    for (const e of g.enemies) {
      if (!e.object || !e.pos) continue;
      if (e.dead && (e.deathT ?? 0) > 0.35) continue;
      const type = enemyType(e); if (!type) continue;
      let near = false;
      for (const f of figs) if (f.pos.distanceToSquared(e.pos) < NEAR * NEAR) { near = true; break; }
      if (!near) continue;
      out.push(writeEnemy(e, this.idOf(e), type));
      if (out.length >= MAX_ENEMIES) break;
    }
    return out;
  }

  // ------------------------------------------------------------ guest: the host's curses
  hostRenderTime() { return this.screens.get(this.hostUid)?.clock.renderTime(performance.now()) ?? null; }
  syncPuppets() {
    const g = this.g;
    for (const [id, p] of this.puppets) if (!g.enemies.includes(p)) this.puppets.delete(id);   // (gone: died out, or left behind at a crossing)
    const host = this.screens.get(this.hostUid);
    const on = g.state === 'playing' && host && performance.now() - host.lastAt < 10000;
    if (!on) { if (this.puppets.size && (!host || performance.now() - host.lastAt > 10000)) this.clearPuppets(); return; }
    if (this.Eseq === this.EseqDone) return;
    this.EseqDone = this.Eseq;
    if (!this.E) { this.clearPuppets(true); return; }
    const ids = new Set();
    for (const raw of this.E) {
      const s = readEnemy(raw); if (!s) continue;
      ids.add(s.id);
      let p = this.puppets.get(s.id);
      if (!p) {
        if (s.f & EF.DEAD) continue;   // (never seen alive)
        p = new Puppet(this, s);
        this.puppets.set(s.id, p);
        g.enemies.push(p);
        if (p.isBoss && !p.dead) g.hud.setBoss(p);
      }
      p.push(s, this.Et);
    }
    for (const [id, p] of this.puppets) if (!ids.has(id) && !p.dead) this.dropPuppet(id, p);
  }
  dropPuppet(id, p) {
    const g = this.g;
    this.puppets.delete(id);
    const i = g.enemies.indexOf(p); if (i >= 0) g.enemies.splice(i, 1);
    for (const q of g.players) if (q.autoTarget === p) q.autoTarget = null;
    p.dispose();
  }
  clearPuppets(keepDead = false) { for (const [id, p] of this.puppets) if (!keepDead || !p.dead) this.dropPuppet(id, p); }

  // ------------------------------------------------------------ guest: follow the host's world
  syncWorld(realDt) {
    const g = this.g, H = this.H;
    if (!H || g.state !== 'playing' || g.traveling || this.travelling) return;
    const tod = g.timeOfDay;
    if (tod && H.hr >= 0 && !H.pn && tod.pinned == null && Math.abs(tod.hour - H.hr) > 0.08 && Math.abs(tod.hour - H.hr) < 23.9) tod.set(H.hr);
    // into the host's dungeon / back out
    if (H.md && !(g.mode === 'mission' && g.mission?.def?.seed >>> 0 === H.md.seed)) { this.followHost(true); return; }
    if (!H.md && g.mode === 'mission') { this.followHost(true); return; }
    if (g.mode === 'world') {
      if (H.rg !== g.level?.regionId) {
        const t = g.seam?.tileFor(H.rg);
        if (t && t.state === 'live' && t.off && this.lastTv === H.tv && !H.md) {
          // the host walked over a border: the same crossing here, in the same frame
          if (g.domainSys?.active) g.domainSys.end();
          g.seam.rebase(t);
          this.leash(true);
        } else { this.followHost(true); return; }
      } else if (this.lastTv !== null && this.lastTv !== H.tv) { this.followHost(false); return; }
    }
    this.lastTv = H.tv;
    // a guest wandering off the loaded world is brought back to the host
    if ((this.leashT = (this.leashT ?? 0) - realDt) <= 0) { this.leashT = 1; this.leash(false); }
    this.worldMissionView(H.wm, H.ob, realDt);
  }
  hostLeadPos() {
    const host = this.screens.get(this.hostUid);
    const fig = host && [...host.players.values()].find((f) => !f.dead) || (host && [...host.players.values()][0]);
    const s = fig?.buf[fig.buf.length - 1];
    return s ? { f: s.f, pos: new THREE.Vector3(s.x, s.y, s.z) } : null;
  }
  // travel (with a fade) to wherever the host is
  async followHost(force) {
    const g = this.g, H = this.H;
    if (!H || this.travelling || g.traveling) return;
    this.travelling = true;
    try {
      this.lastTv = H.tv;
      const lead = this.hostLeadPos();
      if (H.md) {
        await g.fade(true, `${H.md.name || 'Into the dungeon'}`);
        this.clearPuppets();
        g.startMission({ ...H.md }, true);
        const at = lead && lead.f === 'M' + H.md.seed ? lead.pos : null;
        if (at) g.placePlayers(this.beside(at), { keepHp: true });
        await g.fade(false);
        return;
      }
      const region = REGIONS[H.rg] ? H.rg : 'jujutsu_high';
      const at = lead && lead.f === region ? this.beside(lead.pos) : null;
      if (!force && g.mode === 'world' && g.level?.regionId === region && at) {
        await g.fade(true);
        g.placePlayers(at, { keepHp: true });
        g.world.stream(g.players.map((p) => p.pos), Infinity);
        await g.fade(false);
        return;
      }
      this.clearPuppets();
      await g.travelTo(region, { net: true, ...(at ? { at } : {}) });
    } catch (e) { this.logError('follow', e); }
    finally { this.travelling = false; }
  }
  beside(pos) { const a = Math.random() * Math.PI * 2; return pos.clone().add(new THREE.Vector3(Math.cos(a) * 1.6, 0.5, Math.sin(a) * 1.6)); }
  // every local player must stand in the current region or a drawn neighbour; else, next to the host
  leash(now) {
    const g = this.g; if (g.mode !== 'world' || !g.level) return;
    const w = g.level.world;
    const ok = (p) => {
      if (p.pos.x >= -2 && p.pos.z >= -2 && p.pos.x < w.sx + 2 && p.pos.z < w.sz + 2) return true;
      for (const t of g.seam?.tiles.values() ?? []) {
        if (t === g.seam.cur || !t.off || t.state !== 'live') continue;
        const lx = p.pos.x - t.off.x, lz = p.pos.z - t.off.z, tw = t.L.world;
        if (lx >= 0 && lz >= 0 && lx < tw.sx && lz < tw.sz) return true;
      }
      return false;
    };
    if (g.players.every(ok)) return;
    const lead = this.hostLeadPos(); if (!lead) return;
    const v = new THREE.Vector3();
    if (!this.toLocal(lead.f, lead.pos.x, lead.pos.y, lead.pos.z, v)) { if (!now) this.followHost(true); return; }
    for (const p of g.players) if (!ok(p)) { p.spawn(this.beside(v)); p.iframes = 1.5; }
    toast(`Pulled back to ${this.hostName}`);
  }
  // the host's curtain (world mission): drawn here too, and it holds us like it holds them
  worldMissionView(wm, ob, dt) {
    const g = this.g;
    if (ob && (ob[0] || ob[1])) { if (this.obKey !== ob.join('|')) { this.obKey = ob.join('|'); g.hud.setObjective(ob[0], ob[1]); } }
    else if (this.obKey) { this.obKey = null; g.hud.setObjective(null); }
    const v = this._wmv ??= new THREE.Vector3();
    const on = wm && this.toLocal(this.hostFrame, wm[0], wm[1], wm[2], v);
    if (!on) {
      if (this.curtain) {
        if (this.curtain.B && !this.curtain.lifting) { this.curtain.lifting = true; this.curtain.t = 0; }
        this.curtainTick(dt);
      }
      return;
    }
    if (!this.curtain) {
      const sky = skyUniforms();
      sky.type.value = 6; sky.cTop.value.set(0x010208); sky.cHor.value.set(0x0c0718); sky.cStars.value = 0.55;
      const mesh = makeBarrier(sky), B = mesh.material.userData;
      B.radius.value = wm[3]; B.rim.value.set('#' + (/^[0-9a-f]{6}$/i.test(wm[5]) ? wm[5] : '7a5cff')); B.form.value = 0; B.crack.value = 0; B.shatter.value = 0;
      mesh.visible = true; g.scene.add(mesh);
      this.curtain = { mesh, B, t: 0, sides: new WeakMap(), lifting: false, inView: null };
      if (wm[6]) this.banner(`帳 · The curtain descends`, str(wm[6], 40));
    }
    const c = this.curtain;
    c.mesh.position.set(v.x, v.y - 0.5, v.z); c.mesh.scale.setScalar(wm[3]);
    c.R = wm[3]; c.center = v;
    if (wm[4] === 2 && !c.lifting) { c.lifting = true; c.t = 0; }
    this.curtainTick(dt);
  }
  curtainTick(dt) {
    const g = this.g, c = this.curtain; if (!c) return;
    c.t += Math.min(0.1, dt);
    const f = g.players.find((p) => !p.dead)?.pos ?? g.rig.focus;
    c.B.focus.value.set(f.x, f.y + 1, f.z);
    const inside = c.center ? Math.hypot(f.x - c.center.x, f.z - c.center.z) < c.R : false;
    c.B.inside.value = inside ? 1 : 0;
    if (c.lifting) {
      c.B.crack.value = Math.min(1, c.t / 0.9);
      c.B.shatter.value = Math.max(0, (c.t - 0.9) / 1.5);
      if (c.t > 2.5) { g.scene.remove(c.mesh); if (c.inView) g.env?.set(g.biome, false); this.curtain = null; }
      return;
    }
    c.B.form.value = Math.min(1, c.t / 1.8);
    if (!g.domainSys?.active && inside !== c.inView) { c.inView = inside; g.env?.set(inside ? CURTAIN_ENV : g.biome, false); }
    // nobody crosses the curtain while it is down
    if (c.center && c.t > 0.5) for (const p of g.players) {
      if (p.dead) continue;
      const dx = p.pos.x - c.center.x, dz = p.pos.z - c.center.z, r = Math.hypot(dx, dz);
      let side = c.sides.get(p); if (side === undefined) { side = r < c.R; c.sides.set(p, side); }
      const lim = side ? c.R - 0.6 : c.R + 0.6;
      if (side ? r > lim : r < lim) { const k = lim / Math.max(1e-3, r); p.pos.x = c.center.x + dx * k; p.pos.z = c.center.z + dz * k; }
    }
  }
  banner(kicker, name) {
    document.querySelector('.wm-banner')?.remove();
    const el = h('div', { class: 'wm-banner', 'aria-live': 'polite' }, h('div', { class: 'wm-kicker' }, kicker), h('div', { class: 'wm-name' }, name));
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 5000);
  }

  // ------------------------------------------------------------ events out
  send(ev, always = false) {
    if (!always && !this.hasCompany()) return;
    this.stats.out[ev.k] = (this.stats.out[ev.k] || 0) + 1;
    this.s.send(ev);
  }
  // a local player used an ability / Domain / ultimate: every screen replays it
  onAbility(p, s, w) {
    if (!p || p.isRemote || !this.entered || !this.live || !this.hasCompany()) return;
    const id = s ? s.id ?? Object.keys(p.kit.library ?? {}).find((k) => p.kit.library[k] === s) : null;
    if (s && !id) return;
    this.send({ k: 'ab', s: p.index, w, id, t: Math.round(performance.now()), f: this.frameId(), p: arr(p.pos), fa: r3(p.facing), ad: [r3(p.aimDir.x), r3(p.aimDir.z)], ap: arr(p.aimPoint) });
  }
  // guests: my hit on a puppet goes to the host
  sendHit(pup, dmg, src, o) {
    const who = src?.isPlayer ? src : src?.owner?.isPlayer ? src.owner : null;
    const kn = o.knock;
    this.send({ k: 'hit', e: pup.netId, d: r2(dmg), s: who && !who.isRemote ? who.index : 0, kn: kn ? [r2(kn.x), r2(kn.y ?? 0), r2(kn.z)] : 0, st: r2(o.stagger ?? 0.2), m: o.melee ? 1 : 0, u: o.unblockable ? 1 : 0, c: o.crit ? 1 : 0 });
  }
  sendCC(pup, w, t) { this.send({ k: 'cc', e: pup.netId, w, t: r2(Math.min(10, t)) }); }
  sendObjective(i) { if (i >= 0) { this.send({ k: 'obj', i, md: (this.g.mission?.def?.seed ?? 0) >>> 0 }); toast(`${this.hostName}'s mission: done`); } }
  // hosting: a curse hurts a guest's figure -> its own screen applies it
  hurt(fig, amount, src, o = {}) {
    if (!(amount > 0)) return;
    this.send({ k: 'hu', to: fig.remote.uid, s: fig.remote.slot, a: r2(amount), kn: o.knock && !o.noKnock ? [r2(o.knock.x), r2(o.knock.y ?? 0), r2(o.knock.z)] : 0, o: (o.dot ? 1 : 0) | (o.pure ? 2 : 0) | (o.noKnock ? 4 : 0), e: src?.isEnemy ? this.idOf(src) : 0 });
  }
  onKill(e, xp = null) {
    if (!this.isHost || e.isDummy && !e.isCursedObject) return;
    const k = e.lastAttacker;
    this.send({ k: 'kl', e: this.idOf(e), xp: xp ?? e.def?.xp ?? 3, by: k?.isRemote ? k.key : 0 });
  }
  onEnemyShot(o) {
    if (!this.isHost || !o.pos || !o.vel || !this.guestNear(o.pos)) return;
    const tg = o.target?.isRemote ? o.target.key : o.target?.isPlayer ? `${UID}:${o.target.index}` : 0;
    this.send({ k: 'es', f: this.frameId(), p: arr(o.pos), v: arr(o.vel), d: r2(o.dmg ?? 0), sh: Math.max(0, SHAPES.indexOf(o.shape ?? 'orb')), c: (o.color ?? 0xffffff) & 0xffffff, em: r2(o.emissive ?? 3), g: r2(o.gravity ?? 0), l: r2(o.life ?? 2.5), sc: r2(o.scale ?? 1), r: r2(o.radius ?? 0.4), hm: r2(o.homing ?? 0), tg, li: o.light ? 1 : 0 });
  }
  onHazard(o) {
    if (!this.isHost || !o.pos || !this.guestNear(o.pos)) return;
    this.send({ k: 'hz', f: this.frameId(), p: arr(o.pos), r: r2(o.radius), dps: r2(o.dps), du: r2(o.dur), c: (o.color ?? 0x9aff3a) & 0xffffff, sl: r2(o.slow ?? 0) });
  }
  onMarker(o) {
    if (!this.isHost || !o.pos || !this.guestNear(o.pos)) return;
    const fo = o.follow?.isEnemy ? this.idOf(o.follow) : o.follow?.isRemote ? o.follow.key : o.follow?.isPlayer ? `${UID}:${o.follow.index}` : 0;
    this.send({ k: 'mk', f: this.frameId(), p: arr(o.pos), du: r2(o.dur), r: r2(o.radius), sh: Math.max(0, MK_SHAPES.indexOf(o.shape)), w: r2(o.width), l: r2(o.length), fa: r3(o.facing), ar: r3(o.arc), c: (o.color ?? 0xff2020) & 0xffffff, fo });
  }
  onDrop(kind, pos, n, value) {
    if (!this.isHost || !DROPS.has(kind) || !this.guestNear(pos)) return;
    this.send({ k: 'dr', f: this.frameId(), p: arr(pos), w: kind, n: Math.min(40, n | 0), val: value });
  }
  onEnemyDomain(caster, def) {
    if (!this.isHost || !this.guestNear(caster.pos, 120)) return;
    const c = def.center ?? caster.pos;
    this.send({ k: 'bd', e: this.idOf(caster), f: this.frameId(), c: arr(c), d: { name: String(def.name ?? 'Domain').slice(0, 60), key: String(def.key ?? '').slice(0, 40), type: int(def.type, 1, 6, 1), color: (def.color ?? 0xffffff) & 0xffffff, sound: String(def.sound ?? '').slice(0, 20), flash: (def.flash ?? 0xffffff) & 0xffffff, duration: num(def.duration, 1, 30, 10), radius: num(def.radius, 4, 80, 24), minRadius: num(def.minRadius, 0, 80, 0), look: def.look && typeof def.look === 'object' ? def.look : null } });
  }
  onSay(speaker, list, info) {
    if (!this.isHost || !this.acceptedScreens().length) return;
    const lines = list.slice(0, 10).map((l) => { const who = info(l.who); return [String(who?.name ?? (typeof l.who === 'string' ? l.who : '')).slice(0, 30), String(l.text ?? '').replace(/<[^>]*>/g, '').slice(0, 300)]; });
    this.send({ k: 'say', l: lines });
  }
  onTravel() { if (this.isHost) { this.tv++; this.pubT = 0; } }
  onMissionStart() { if (this.isHost) { this.tv++; this.pubT = 0; } }
  onLocalPlayersChanged() { this.rosterDirty = true; this.pubT = 0; for (const p of this.g.players) p.netName ??= this.defaultLocalName(p); }

  // ------------------------------------------------------------ events in
  onEvents(d) {
    if (this.disposed || !d || d.v !== PROTO || !UID_RE.test(d.u) || d.u === UID || !Array.isArray(d.e)) return;
    const scr = this.screens.get(d.u);
    if (!scr) return;
    const fromHost = d.u === this.hostUid;
    for (const ev of d.e.slice(0, 100)) {
      if (this.disposed) return;
      if (!ev || typeof ev !== 'object' || typeof ev.k !== 'string') continue;
      this.stats.in[ev.k] = (this.stats.in[ev.k] || 0) + 1;
      try { this.onEvent(ev, scr, fromHost); } catch (e) { this.logError('event ' + ev.k, e); }
    }
  }
  local(f, p, out = new THREE.Vector3()) { const a = vec(p); return a && this.toLocal(typeof f === 'string' ? f : '', a[0], a[1], a[2], out) ? out : null; }
  figureByKey(key) {
    if (typeof key !== 'string') return null;
    const [uid, s] = key.split(':');
    if (uid === UID) return this.g.players[int(+s, 0, 3)] ?? null;
    return this.screens.get(uid)?.players.get(int(+s, 0, 3, -1)) ?? null;
  }
  onEvent(ev, scr, fromHost) {
    const g = this.g;
    switch (ev.k) {
      case 'bye':   // leaving on purpose (not a dropped connection)
        if (fromHost && this.isGuest) this.s.end('host_left');
        else this.removeScreen(scr.uid);
        return;
      case 'ab': {
        if (!scr.accepted || !this.entered) return;
        const fig = scr.players.get(int(ev.s, 0, 3, -1)); if (!fig) return;
        if (!['use', 'rel', 'dom', 'ult'].includes(ev.w)) return;
        if (ev.w === 'use' || ev.w === 'rel') { if (typeof ev.id !== 'string' || !ID_WORD.test(ev.id)) return; }
        fig.evq.push({ t: num(ev.t, 0, 1e13) / 1000, at: performance.now(), ev });
        if (fig.evq.length > 24) fig.evq.shift();
        return;
      }
      // ---- host -> guests
      case 'no':
        if (fromHost && ev.to === UID) this.onRefused(ev.why, int(ev.room, 0, 8));
        return;
      case 'hu': {
        if (!fromHost || ev.to !== UID || !this.entered || g.state !== 'playing') return;
        const p = g.players[int(ev.s, 0, 3, -1)]; if (!p) return;
        const a = num(ev.a, 0, 2000); if (!a) return;
        const kn = vec(ev.kn, 80), fl = int(ev.o, 0, 7);
        const src = this.puppets.get(int(ev.e, 0, 1e9)) ?? null;
        p.takeDamage(a, src, { knock: kn ? V3(kn) : null, dot: !!(fl & 1), pure: !!(fl & 2), noKnock: !!(fl & 4) });
        return;
      }
      case 'kl': {
        if (!fromHost || !this.entered) return;
        const xp = int(ev.xp, 0, 500);
        if (xp && g.save.addXp(xp)) g.levelUp();
        const pup = this.puppets.get(int(ev.e, 0, 1e9));
        if (pup && !pup.dead) pup.kill(false);
        if (typeof ev.by === 'string' && ev.by.startsWith(UID + ':')) { const p = g.players[int(+ev.by.split(':')[1], 0, 3)]; if (p && pup) { try { p.kit?.onKill?.(pup); } catch (e) { this.logError('onKill', e); } } }
        return;
      }
      case 'es': {
        if (!fromHost || !this.entered) return;
        const pos = this.local(ev.f, ev.p), v = vec(ev.v, 200); if (!pos || !v) return;
        const dmg = num(ev.d, 0, 500), color = int(ev.c, 0, 0xffffff, 0xffffff);
        const target = this.figureByKey(ev.tg);
        g.projectiles.fire({ net: true, pos, vel: V3(v), team: 'enemy', dmg, shape: SHAPES[int(ev.sh, 0, SHAPES.length - 1)], color, emissive: num(ev.em, 0, 8, 3), gravity: num(ev.g, -40, 80), life: num(ev.l, 0.05, 8, 2.5), scale: num(ev.sc, 0.1, 6, 1), radius: num(ev.r, 0.05, 4, 0.4), homing: num(ev.hm, 0, 12), target, light: ev.li ? 2 : 0,
          onHit: (t, pr) => { if (dmg > 0) t.takeDamage(dmg, null, { knock: pr.vel.clone().setY(0).normalize().multiplyScalar(4) }); g.fx.splat?.(pr.pos, color); },
          onExpire: (pr, why) => { if (why !== 'hit') g.fx.splat?.(pr.pos, color); } });
        return;
      }
      case 'hz': {
        if (!fromHost || !this.entered) return;
        const pos = this.local(ev.f, ev.p); if (!pos) return;
        g.hazards.add({ net: true, pos, radius: num(ev.r, 0.2, 12, 1.2), dps: num(ev.dps, 0, 200, 6), dur: num(ev.du, 0.1, 30, 4), color: int(ev.c, 0, 0xffffff, 0x9aff3a), slow: num(ev.sl, 0, 1) });
        return;
      }
      case 'mk': {
        if (!fromHost || !this.entered) return;
        const pos = this.local(ev.f, ev.p); if (!pos) return;
        const follow = typeof ev.fo === 'number' ? this.puppets.get(int(ev.fo, 0, 1e9)) ?? null : this.figureByKey(ev.fo);
        g.markers.spawn({ net: true, pos, dur: num(ev.du, 0.05, 20, 1), radius: num(ev.r, 0.1, 60, 2), shape: MK_SHAPES[int(ev.sh, 0, 2)], width: num(ev.w, 0.1, 60, 2), length: num(ev.l, 0.1, 120, 6), facing: num(ev.fa, -100, 100), arc: num(ev.ar, 0, 1, 1), color: int(ev.c, 0, 0xffffff, 0xff2020), follow });
        return;
      }
      case 'dr': {
        if (!fromHost || !this.entered || !DROPS.has(ev.w)) return;
        const pos = this.local(ev.f, ev.p); if (!pos) return;
        g.pickups.drop(ev.w, pos, int(ev.n, 1, 40, 1), int(ev.val, 1, 1000, 1));
        return;
      }
      case 'bd': {
        if (!fromHost || !this.entered) return;
        const pup = this.puppets.get(int(ev.e, 0, 1e9)); if (!pup) return;
        const c = this.local(ev.f, ev.c); const d = ev.d && typeof ev.d === 'object' ? ev.d : null; if (!c || !d) return;
        const look = d.look && typeof d.look === 'object' ? Object.fromEntries(Object.entries(d.look).slice(0, 12).filter(([k, v]) => /^[a-zA-Z]{1,12}$/.test(k) && fin(v, 1e8))) : undefined;
        g.domainSys.start(pup, { name: str(d.name, 60) || 'Domain', key: str(d.key, 40), type: int(d.type, 1, 6, 1), color: int(d.color, 0, 0xffffff, 0xffffff), sound: str(d.sound, 20), flash: int(d.flash, 0, 0xffffff, 0xffffff), duration: num(d.duration, 1, 30, 10), radius: num(d.radius, 4, 80, 24), minRadius: num(d.minRadius, 0, 80, 0), look, center: c, sureHit: false });
        return;
      }
      case 'say':
        if (fromHost && this.entered && Array.isArray(ev.l)) this.subtitles(ev.l.slice(0, 10).filter(Array.isArray).map((l) => [str(l[0], 30), str(l[1], 300)]));
        return;
      // ---- guests -> host
      default:
        if (this.isHost && scr.accepted && !fromHost) this.onGuestEvent(ev, scr);
    }
  }
  onGuestEvent(ev, scr) {
    const g = this.g;
    if (ev.k === 'obj') {
      const m = g.mission, i = int(ev.i, 0, 64, -1);
      if (m && !m.isWorld && (m.def?.seed >>> 0) === int(ev.md, 0, 4294967295) && m.obj?.items?.[i]) m.completeItem(m.obj.items[i], true);
      return;
    }
    const e = this.byId.get(int(ev.e, 0, 1e9));
    if (!e || e.dead || !g.enemies.includes(e)) return;
    const fig = scr.players.get(int(ev.s, 0, 3, -1)) ?? [...scr.players.values()][0] ?? null;
    if (fig && fig.inWorld && fig.pos.distanceTo(e.pos) > 140) return;   // (not plausible)
    if (ev.k === 'hit') {
      const dmg = num(ev.d, 0, 20000); if (!dmg) return;
      const kn = vec(ev.kn, 80);
      const o = { knock: kn ? V3(kn) : null, stagger: num(ev.st, 0, 4, 0.2), melee: !!ev.m, unblockable: !!ev.u, crit: !!ev.c, net: true };
      const dealt = e.takeDamage(dmg, fig, o);
      if (dealt > 0) {
        e.lastAttacker = fig; e.lastHitT = g.time;
        if (fig) (e.hitBy || (e.hitBy = new Map())).set(fig, g.time);
        g.fx.damageNumber(e.pos, dealt, { crit: o.crit, color: '#c8b8ff' });
      }
    } else if (ev.k === 'cc') {
      const t = num(ev.t, 0, 10);
      if (ev.w === 'stun') { if (e.isBoss) { e.cancelAttack?.(); e.stagger = Math.max(e.stagger ?? 0, Math.min(0.8, t * 0.3)); } else { e.sealT = Math.max(e.sealT ?? 0, t); e.cancelAttack?.(); } }
      else if (ev.w === 'slow') e.slowT = Math.max(e.slowT ?? 0, t);
    }
  }
  // replay another screen's ability on its figure
  applyAbility(fig, ev) {
    const g = this.g;
    if (!fig.inWorld || fig.dead) return;
    const v = this.local(ev.f, ev.p);
    if (v && v.distanceTo(fig.pos) < 8) fig.pos.copy(v);
    fig.facing = num(ev.fa, -100, 100, fig.facing);
    const ad = Array.isArray(ev.ad) ? [num(ev.ad[0], -1, 1), num(ev.ad[1], -1, 1)] : null;
    if (ad && (ad[0] || ad[1])) fig.aimDir.set(ad[0], 0, ad[1]).normalize();
    const ap = this.local(ev.f, ev.ap);
    if (ap) fig.aimPoint.copy(ap); else fig.aimPoint.copy(fig.pos).addScaledVector(fig.aimDir, 5);
    fig.autoTarget = g.nearestEnemy(fig.aimPoint, 3.5);
    fig.ce = fig.maxCe;
    const kit = fig.kit;
    this.muteToast = true;
    try {
      if (ev.w === 'use' || ev.w === 'rel') {
        const ab = kit.library && Object.hasOwn(kit.library, ev.id) ? kit.library[ev.id] : null;
        if (!ab) return;
        if (ev.w === 'use') ab.use?.(); else ab.onRelease?.();
      } else if (ev.w === 'dom') { if (kit.domain) g.startDomain(fig, kit.domain); }
      else if (ev.w === 'ult') kit.ultimate?.use?.();
    } catch (e) { this.logError('ability ' + ev.id, e); }
    finally { this.muteToast = false; }
  }
  onRefused(why, room) {
    const msg = why === 'full' ? `${this.hostName}'s game is full (${MAX_PLAYERS} players${room ? `, room for ${room} more` : ''})` : 'The host turned the join down';
    this.refusedMsg = msg;
    this.onRefusedCb?.(msg);
    if (this.entered) this.g.toTitle(msg);
  }

  // ------------------------------------------------------------ subtitles (the host's conversations)
  subtitles(lines) {
    const q = this.subQ ??= [];
    q.push(...lines);
    if (this.subBusy) return;
    const next = () => {
      const l = q.shift();
      let el = document.getElementById('net-sub');
      if (!l) { this.subBusy = false; el?.classList.remove('on'); return; }
      this.subBusy = true;
      if (!el) { el = h('div', { id: 'net-sub', 'aria-live': 'polite' }); document.body.appendChild(el); }
      el.textContent = '';
      if (l[0]) el.appendChild(h('b', {}, l[0] + ': '));
      el.appendChild(document.createTextNode(l[1]));
      el.classList.add('on');
      setTimeout(next, Math.min(6000, 1800 + l[1].length * 45));
    };
    next();
  }

  // ------------------------------------------------------------ connection state
  onStatus(st) {
    if (st === 'reconnecting') {
      if (!this.reconnecting) toast('🌐 Connection lost — reconnecting…');
      this.reconnecting = true;
    } else if (st === 'open' && this.reconnecting) {
      this.reconnecting = false;
      this.pubT = 0;
      toast('🌐 Reconnected');
    }
  }
  onEnded(reason) {
    const g = this.g;
    if (g.net !== this) { this.dispose(); return; }
    if (reason === 'left') return;
    if (this.isGuest) {
      const msg = reasonText(reason);
      if (this.entered) g.toTitle(msg); else { this.dispose(); g.net = null; this.onRefusedCb?.(msg); }
      return;
    }
    g.net = null;
    this.dispose();
    toast(`${reasonText(reason)} You can host again from the menu.`, 'big');
  }
  updatePill() {
    const g = this.g;
    if (!this.pill) {
      this.pill = h('div', { class: 'net-pill' });
      g.hud.root.appendChild(this.pill);
      this.pillKey = '';
    }
    const n = this.roomPlayers();
    let txt;
    if (this.reconnecting) txt = 'Reconnecting…';
    else if (this.isHost) txt = this.acceptedScreens().length ? `Hosting · ${n}/${MAX_PLAYERS} players` : 'Hosting · waiting for players';
    else { const hs = this.screens.get(this.hostUid); txt = `${this.hostName}'s game · ${n}/${MAX_PLAYERS}${hs && (hs.hidden || performance.now() - hs.lastAt > 4000) ? ' · host away' : ''}`; }
    if (txt !== this.pillKey) { this.pillKey = txt; this.pill.textContent = '🌐 ' + txt; this.pill.classList.toggle('warn', !!this.reconnecting); }
  }

  // ------------------------------------------------------------ leaving
  // leave the room, saying goodbye first so the others don't wait for a reconnect
  close() {
    if (!this.s.ended) { this.s.send({ k: 'bye' }); this.s.flush(0, true); }
    this.dispose();
    this.s.leave();
  }
  stopHosting() {
    if (!this.isHost) return;
    this.g.net = null;
    this.close();
    toast('🌐 Your game is closed to other players');
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const g = this.g;
    clearInterval(this.keepAlive);
    for (const scr of this.screens.values()) this.clearScreen(scr);
    this.screens.clear();
    this.figures.length = 0;
    this.clearPuppets();
    if (this.curtain) { g.scene.remove(this.curtain.mesh); if (this.curtain.inView) g.env?.set(g.biome, false); this.curtain = null; }
    if (this.obKey) g.hud?.setObjective(null);
    g.toast = this.origToast;
    if (g.markers.onSpawn) g.markers.onSpawn = null;
    if (this.origDrop) g.pickups.drop = this.origDrop;
    if (this.origDomStart) g.domainSys.start = this.origDomStart;
    this.pill?.remove(); this.pill = null;
    document.getElementById('net-tags')?.remove();
    document.getElementById('net-sub')?.remove();
    for (const p of g.players) { p.color = PLAYER_COLORS[p.index]; p.seat = undefined; }
    g.hud?.rebuildCards?.();
  }

  // ------------------------------------------------------------ guest: wait for the host, then step in
  waitForHost(ms = 12000) {
    return new Promise((resolve, reject) => {
      const t0 = performance.now();
      const iv = setInterval(() => {
        if (this.s.ended) { clearInterval(iv); reject(new Error('lost')); return; }
        if (this.hostUid && this.H) { clearInterval(iv); resolve(); return; }
        if (performance.now() - t0 > ms) { clearInterval(iv); reject(new Error('nohost')); }
      }, 100);
    });
  }
  hostRegionName() { const id = this.H?.rg; return this.H?.md ? (this.H.md.name || 'a dungeon') : REGIONS[id]?.name ?? '…'; }
  // the joining screen's players step into the host's world (list: [{ device, sorcerer }], names)
  async enterAsGuest(list, names) {
    const g = this.g, H = this.H;
    if (!H) throw new Error('nohost');
    if (this.roomPlayers() + list.length > MAX_PLAYERS) throw new Error('full');
    g.ui.closeAll();
    await g.fade(true, `${this.hostName}'s game`);
    await new Promise((r) => requestAnimationFrame(() => r()));
    try {
      g.exitSelectView?.();
      // my save's world stays as it was: the world I visit is the host's
      this.guestWorld = JSON.parse(JSON.stringify(g.save.data.world ?? {}));
      this.guestWorld.discovered ??= {}; this.guestWorld.stations ??= {}; this.guestWorld.meta ??= {};
      for (const p of g.players) g.removePlayer(p);
      g.players = [];
      g.rig.cine = null;
      this.entered = true;
      this.quietUntil = performance.now() + 4000;   // (the people already here didn't just join)
      list.forEach((l, i) => { const p = g.addPlayer(l.device, l.sorcerer); p.netName = names[i] ?? this.defaultLocalName(p); });
      g.state = 'playing';
      g.hud.show(true); g.touch?.show(true);
      const lead = this.hostLeadPos();
      if (H.md) {
        g.startMission({ ...H.md }, true);
        if (lead && lead.f === 'M' + H.md.seed) g.placePlayers(this.beside(lead.pos));
      } else {
        const region = REGIONS[H.rg] ? H.rg : 'jujutsu_high';
        g.loadRegion(region, lead && lead.f === region ? { at: this.beside(lead.pos) } : {});
        g.audio.setMusic(g.level?.biome?.music ?? 'hub');
      }
      this.lastTv = H.tv;
      this.rosterDirty = true;
      this.pubT = 0;
      g.paused = false; g.last = performance.now();
      g.hud.rebuildCards();
    } finally { await g.fade(false); }
    toast(`Welcome to ${this.hostName}'s game!`, 'big');
    setTimeout(() => this.live && toast(`${this.hostName} leads: the world, its curses and missions are theirs. What you earn is yours.`), 2600);
  }
}

// a dungeon description from the host (fields generateLevel and Mission read)
function cleanMission(m) {
  const seed = int(m.seed, 0, 4294967295, -1);
  if (seed < 0 || typeof m.biome !== 'string' || !/^[a-z_]{1,32}$/.test(m.biome)) return null;
  return { id: typeof m.id === 'string' && /^[a-z0-9_]{1,40}$/.test(m.id) ? m.id : undefined, name: str(m.name, 60), biome: m.biome, objective: ['exorcise', 'rescue', 'seal'].includes(m.objective) ? m.objective : 'exorcise', boss: typeof m.boss === 'string' && /^[a-z_]{1,32}$/.test(m.boss) ? m.boss : 'jogo', difficulty: int(m.difficulty, 1, 6, 1), seed, chapter: typeof m.chapter === 'string' && /^[a-z0-9_]{1,40}$/.test(m.chapter) ? m.chapter : undefined };
}

// ================================================================== flows
let busy = false;
// Start hosting the world this screen is playing in (the game carries on meanwhile).
export async function hostGame(game, names = null) {
  if (game.net || busy) return false;
  busy = true;
  toast('🌐 Opening your game to other players…');
  let s = null;
  try {
    const lib = await loadMiniRooms();
    if (names) game.players.forEach((p, i) => { if (names[i]) p.netName = names[i]; });
    const hostName = game.players[0]?.netName || SORCERERS[game.players[0]?.sorcerer]?.name || 'Sorcerer';
    s = new Session(lib, { uid: UID, name: hostName });
    const net = new Net(game, s, 'host');
    net.hostName = hostName;
    for (const p of game.players) p.netName ??= net.defaultLocalName(p);
    await s.host(`${hostName}'s game`);
    if (game.state !== 'playing') { net.close(); return false; }   // quit to the title meanwhile
    game.net = net;
    net.rosterDirty = true;
    game.hud.rebuildCards();
    toast(`🌐 Your game is open! Others choose Online → ${hostName}'s game to join (up to ${MAX_PLAYERS} players).`, 'big');
    return true;
  } catch (e) {
    console.warn('online: could not host', e);
    try { s?.leave(); } catch { /* gone */ }
    toast(`Couldn't open your game. ${reasonText(e?.message)}`, 'big');
    return false;
  } finally { busy = false; }
}

// Connect to a game as a joining screen (not in the world yet): resolves with the Net once the
// host's state has arrived. game.net is set, so the select screen can show who's there.
export async function connectAsGuest(game, room, onRefused) {
  if (game.net) { try { game.net.close(); } catch { /* gone */ } game.net = null; }
  const lib = await loadMiniRooms();
  const s = new Session(lib, { uid: UID, name: 'Joining' });
  const net = new Net(game, s, 'guest');
  net.onRefusedCb = onRefused;
  game.net = net;
  try {
    await s.join(room.id);
    await net.waitForHost(12000);
  } catch (e) {
    if (game.net === net) game.net = null;
    net.dispose(); try { s.leave(); } catch { /* gone */ }
    throw e;
  }
  return net;
}
void esc;
