// Online transport: one browser's connection to a mini-rooms room, plus the lobby list.
//
// The relay (https://mini-rooms.hoai2k.workers.dev, see js/vendor/mini-rooms.js) only passes
// messages around. A room has one host and a few guests; each one has a presence (its latest
// state, which replaces the last one) and can broadcast one-off topic messages. On top of that this
// file adds:
// - lazy loading of the relay client (offline play never loads any of it)
// - timeouts on everything, so a relay that never answers ends in an error instead of a hang
// - reconnecting: a dropped socket re-opens the same room id with backoff (the host re-hosts it,
//   guests re-join it) while the game keeps running locally
// - a per-sender clock offset estimate for interpolation (see clock())
//
// It never throws into the game: every failure ends in a 'status' or 'ended' event.

export const GAME = 'hogwarts-adventure';
export const PROTO = 1;
export const CAPACITY = 4; // the host plus three friends

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const num = (v, lo, hi, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : def);
export const int = (v, lo, hi, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : def);
export const str = (v, max, def = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, max) : def);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const vec = (a, lim = 5000) => (Array.isArray(a) && a.length === 3 && a.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < lim) ? a : null);
export const r2 = (v) => Math.round(v * 100) / 100;
export const r3 = (v) => Math.round(v * 1000) / 1000;
const ROOM_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function newUid() {
  let s = '';
  for (let i = 0; i < 10; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)];
  return s;
}

const withTimeout = (p, ms, why) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(why)), ms))]);

// The relay client: a verbatim copy of multiplayer/client/mini-rooms.js from the "mini" repository,
// loaded with a <script> tag the first time anything online is used.
let loading = null;
export function loadMiniRooms(timeoutMs = 10000) {
  if (window.MiniRooms) return Promise.resolve(window.MiniRooms);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const timer = setTimeout(() => { s.remove(); reject(new Error('mini-rooms load timed out')); }, timeoutMs);
    s.src = new URL('../vendor/mini-rooms.js', import.meta.url).href;
    s.onload = () => { clearTimeout(timer); window.MiniRooms ? resolve(window.MiniRooms) : reject(new Error('mini-rooms did not load')); };
    s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('mini-rooms failed to load')); };
    document.head.appendChild(s);
  });
  loading.catch(() => { loading = null; });
  return loading;
}

// Open worlds, newest first: [{ id, title, count, capacity }]. Throws on failure.
export async function listWorlds() {
  const lib = await loadMiniRooms();
  const rooms = await withTimeout(lib.connect(GAME).listRooms(), 6000, 'lobby timed out');
  return (Array.isArray(rooms) ? rooms : [])
    .filter((r) => r && typeof r.id === 'string' && ROOM_RE.test(r.id))
    .map((r) => ({ id: r.id, title: str(r.title, 40) || 'A Hogwarts world', count: int(r.count, 0, 99), capacity: int(r.capacity, 1, 99, CAPACITY), created: num(r.created, 0, 1e15) }))
    .sort((a, b) => b.created - a.created)
    .slice(0, 12);
}

export class Session {
  constructor(lib, me) {
    this.lib = lib;
    this.net = lib.connect(GAME);
    this.me = me; // { uid, name }
    this.room = null;
    this.roomId = null;
    this.isHost = false;
    this.title = '';
    this.status = 'idle'; // idle | open | reconnecting | ended
    this.peers = {}; // relay peer id -> latest presence data
    this.recv = {}; // relay peer id -> { data, at } (local receive time of the latest presence)
    this.handlers = {};
    this.outbox = [];
    this.flushT = 0;
    this.ended = false;
  }

  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); }
  emit(evt, ...a) { for (const fn of this.handlers[evt] || []) { try { fn(...a); } catch (e) { console.error('online:', evt, e); } } }
  setStatus(s, info) { this.status = s; this.emit('status', s, info); }
  get open() { return this.status === 'open' && !!this.room; }

  async host(title) {
    this.title = str(title, 40) || 'A Hogwarts world';
    this.roomId = this.net.newRoomId().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    await this.openRoom(this.roomId, true);
    this.setStatus('open');
  }
  async join(id) {
    if (typeof id !== 'string' || !ROOM_RE.test(id)) throw new Error('not_found');
    this.roomId = id;
    await this.openRoom(id, false);
    this.setStatus('open');
  }

  // Resolves once the relay has welcomed us; rejects with the close reason (or 'timeout').
  openRoom(id, asHost) {
    this.dropRoom();
    return new Promise((resolve, reject) => {
      let room;
      try {
        room = asHost ? this.net.host(id, { title: this.title, name: this.me.name, capacity: CAPACITY }) : this.net.join(id, { name: this.me.name });
      } catch { reject(new Error('disconnected')); return; }
      this.room = room;
      this.isHost = asHost;
      this.peers = {};
      this.recv = {};
      let done = false;
      const finish = (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (err) { if (this.room === room) this.room = null; try { room.leave(); } catch { /* gone */ } reject(new Error(err)); } else resolve();
      };
      const timer = setTimeout(() => finish('timeout'), 9000);
      room.onClose((reason) => {
        if (!done) { finish(reason || 'disconnected'); return; }
        if (this.room === room) { this.room = null; this.lost(reason || 'disconnected'); }
      });
      room.subscribePresence(({ peers }) => {
        if (this.room !== room || !room.ready) return;
        const t = performance.now();
        for (const pid in peers) {
          const d = peers[pid];
          if (this.recv[pid]?.data !== d) this.recv[pid] = { data: d, at: t };
        }
        for (const pid in this.recv) if (!(pid in peers)) delete this.recv[pid];
        this.peers = peers;
        this.emit('presence', peers);
        if (!done) finish(null);
      });
      room.subscribeTopic('ev', (d, from) => {
        if (this.room !== room) return;
        try { this.emit('events', d, from); } catch (e) { console.error('online events', e); }
      });
    });
  }

  dropRoom() {
    const r = this.room;
    this.room = null;
    if (r) { try { r.leave(); } catch { /* already closed */ } }
  }

  // The socket dropped or the room closed under us.
  async lost(reason) {
    if (this.ended) return;
    // the room is gone or full: nothing to come back to. (A host who closes their world on purpose
    // says goodbye first; without that, a host_left is a dropped connection and they'll re-open
    // the same room, so guests keep trying for a while.)
    if (!this.isHost && (reason === 'not_found' || reason === 'full')) { this.end(reason); return; }
    this.setStatus('reconnecting', reason);
    const waits = [600, 1500, 3000, 5000, 8000, 12000];
    const lastReason = reason;
    for (const w of waits) {
      await new Promise((r) => setTimeout(r, w));
      if (this.ended) return;
      try {
        await this.openRoom(this.roomId, this.isHost);
        if (this.ended) { this.dropRoom(); return; }
        this.setStatus('open');
        return;
      } catch (e) {
        if (!this.isHost && e.message === 'full') { this.end('full'); return; }
      }
    }
    this.end(this.isHost ? 'offline' : lastReason === 'host_left' ? 'host_left' : 'lost');
  }

  end(reason) {
    if (this.ended) return;
    this.ended = true;
    this.dropRoom();
    this.setStatus('ended', reason);
    this.emit('ended', reason);
  }
  leave() { this.end('left'); }

  publish(data) {
    if (!this.room || !this.room.ready) return;
    try { this.room.publishPresence(data); } catch { /* the close handler deals with it */ }
  }
  // Events are batched and sent at most 20 times a second as one topic message.
  send(ev) {
    if (this.ended) return;
    this.outbox.push(ev);
    if (this.outbox.length > 200) this.outbox.splice(0, this.outbox.length - 200);
  }
  flush(dt, now = false) {
    this.flushT -= dt;
    if ((this.flushT > 0 && !now) || !this.outbox.length || !this.room || !this.room.ready) return;
    this.flushT = 0.05;
    const batch = this.outbox.splice(0, 60);
    try { this.room.publishTopic('ev', { v: PROTO, u: this.me.uid, e: batch }); } catch { /* dropped */ }
  }
}

// Per-sender clock estimate. Each presence carries the sender's performance.now(); the smallest
// (receive time - send time) seen is the clock offset plus the fastest trip. Rendering a sender at
// (now - offset - delay) in their clock then plays their states back smoothly, with the delay
// following how irregular their updates arrive.
export class Clock {
  constructor() { this.off = null; this.jit = 0.03; }
  sample(sentMs, recvMs) {
    const o = recvMs - sentMs;
    if (this.off == null || o < this.off) this.off = o;
    else this.off += Math.min(o - this.off, 2) * 0.02; // allow slow drift upward
    const late = (o - this.off) / 1000;
    this.jit += (late - this.jit) * 0.1;
  }
  get delay() { return clamp(0.11 + this.jit * 1.6, 0.11, 0.45); }
  // the sender's clock (seconds) we should be showing right now
  renderTime(nowMs) { return this.off == null ? null : (nowMs - this.off) / 1000 - this.delay; }
}
