// Online session: one player's connection to a mini-rooms room, on top of the relay client in
// js/vendor/mini-rooms.js (loaded lazily by loadMiniRooms below).
//
// What it adds to the plain relay:
// - stable identities: the relay gives a new peer id on every connection, so every presence carries
//   our own uid (and name); the roster is keyed by uid, so a reconnect is the same player
// - presence publishing with a heartbeat and a re-send whenever someone joins (the relay keeps
//   presence in memory only; a room that hibernated hands newcomers empty presence)
// - a shared clock: guests estimate the host's clock with ping/pong topics (min-RTT sample)
// - reconnecting: a guest whose socket drops re-joins the same room id with backoff
// - host migration: the relay closes the room when the host leaves. Everyone picks the next host
//   from the join order the host published (first remaining player), who hosts the successor room
//   "<base>-g<gen>"; the others join it (with retries; the next in line hosts it if the first never
//   shows up). The shared clock carries over: the new host keeps serving the old host's timeline.
//
// It never throws into the game: every failure ends in a 'status' / 'fatal' event.
import { PROTO, GAME, CAPACITY, ID_RE, MENU_HEARTBEAT, str, num, cleanName } from './proto.js';

const TOPICS = ['ping', 'pong', 'ev'];
const LEAVE_GRACE = 3000;   // ms a vanished player has to come back before they count as gone
const now = () => performance.now();

// The relay client: a verbatim copy of multiplayer/client/mini-rooms.js from the "mini"
// repository (https://github.com/hoai2k/mini), loaded with a <script> tag only when Online opens.
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

export class Session {
  constructor(lib, { uid, name }) {
    this.net = lib.connect(GAME);
    this.me = { uid, name: cleanName(name) };
    this.room = null; this.roomId = null; this.base = null; this.gen = 0;
    this.isHost = false;
    this.status = 'idle';          // idle | connecting | open | reconnecting | migrating | closed
    this.peers = new Map();        // peer id -> { pid, uid, name, p }
    this.byUid = new Map();        // uid -> peer (players we know, me excluded)
    this.order = [];               // host only: uids in join order (published in the room state)
    this.mine = {};                // my presence fields (set by the app)
    this.hostUid = null; this.hostP = null; this.lastRoom = null;
    this.handlers = {};
    this.offset = 0;               // shared clock = performance.now() + offset (host: fixed)
    this.synced = false; this.samples = []; this.pingT = 0; this.pingN = 0; this.pings = new Map();
    this.pubT = 0; this.dirty = false; this.gap = 0; this.republishAt = 0;
    this.graceUntil = 0;
    this.missing = new Map();      // uid -> when they dropped out of the room
    this.closing = false;
  }

  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); }
  emit(evt, ...a) { for (const fn of this.handlers[evt] || []) { try { fn(...a); } catch (e) { console.error('online:', evt, e); } } }
  setStatus(s, info) { this.status = s; this.emit('status', s, info); }

  // ---- lobby ------------------------------------------------------------------------------------
  watchRooms(cb) {
    try { return this.net.watchRooms(cb, 4000); } catch (e) { cb({ rooms: [], error: e }); return () => {}; }
  }

  // ---- hosting and joining ------------------------------------------------------------------------
  host(title) {
    this.title = str(title, 40) || 'Brick Kart race';
    this.base = this.net.newRoomId().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    this.gen = 0; this.order = [this.me.uid];
    this.offset = 0; this.synced = true;
    this.hostUid = this.me.uid;
    this.setStatus('connecting');
    this.open(this.base, true, (err) => {
      if (err) { this.fatal(err === 'taken' ? 'taken' : 'unreachable'); return; }
      this.setStatus('open');
      this.emit('joined', { asHost: true });
    });
  }
  join(id) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) { this.fatal('not_found'); return; }
    const m = /^(.*)-g(\d+)$/.exec(id);
    this.base = m ? m[1] : id; this.gen = m ? +m[2] : 0;
    this.setStatus('connecting');
    this.open(id, false, (err) => {
      if (err) { this.fatal(err === 'disconnected' || err === 'timeout' ? 'unreachable' : err); return; }
      this.setStatus('open');
      this.hostSeenAt = now();
      this.emit('joined', { asHost: false });
      this.startSync();
    });
  }

  // Open a room connection; cb(null) once welcomed, cb(reason) if it never gets there.
  open(id, asHost, cb) {
    this.drop();
    let room;
    try {
      room = asHost ? this.net.host(id, { title: this.title || 'Brick Kart race', name: this.me.name, capacity: CAPACITY }) : this.net.join(id, { name: this.me.name });
    } catch (e) { console.error(e); setTimeout(() => cb('disconnected'), 0); return; }
    this.room = room; this.roomId = id; this.isHost = asHost;
    this.peers.clear();
    let done = false;
    const finish = (err) => { if (done) return; done = true; clearTimeout(timer); cb(err); };
    const timer = setTimeout(() => { if (!done) { try { room.leave(); } catch { /* gone */ } if (this.room === room) this.room = null; finish('timeout'); } }, 9000);
    room.onClose((reason) => {
      if (!done) { if (this.room === room) this.room = null; finish(reason || 'disconnected'); return; }
      if (this.room === room) { this.room = null; this.lost(reason || 'disconnected'); }
    });
    room.subscribePresence(({ peers }) => {
      if (this.room !== room || !room.ready) return;
      this.onPeers(peers);
      if (!done) { this.publish(true); finish(null); }
    });
    for (const t of TOPICS) room.subscribeTopic(t, (d, from) => { if (this.room === room) { try { this.onTopic(t, d, from); } catch (e) { console.error('online topic', t, e); } } });
  }
  drop() {
    const r = this.room;
    this.room = null;
    if (r) { try { r.leave(); } catch { /* already closed */ } }
  }
  // The host steps down on purpose (its tab is going into the background, where it can't keep
  // the CPU karts going): leave, which closes the room, and follow everyone to the successor room
  // as a guest.
  handoff() {
    if (!this.isHost || !this.room?.ready || this.closing) return false;
    this.drop();
    this.migrate(true);
    return true;
  }
  // A guest gives up on a host that has gone silent (its page frozen without leaving): leave and do
  // what everyone does when the host leaves. The others notice the same silence and come too.
  abandonHost() {
    if (this.isHost || !this.room?.ready || this.closing) return false;
    this.drop();
    this.migrate(false);
    return true;
  }
  leave() {
    this.closing = true;
    clearTimeout(this.retryT);
    this.drop();
    this.setStatus('closed');
  }
  fatal(reason) {
    clearTimeout(this.retryT);
    this.drop();
    this.setStatus('closed', reason);
    this.emit('fatal', reason);
  }

  // The open room closed under us.
  lost(reason) {
    if (this.closing || reason === 'left') return;
    if (reason === 'host_left') { this.migrate(false); return; }
    if (this.isHost) { this.migrate(true); return; }   // our room is gone with our socket
    if (reason === 'full' || reason === 'not_found' || reason === 'taken') { this.migrate(false); return; }
    this.reconnect();
  }

  // A guest lost its socket: re-join the same room with backoff (we keep racing meanwhile).
  reconnect() {
    this.graceUntil = now() + 30000;   // nobody "leaves" while we're away
    this.setStatus('reconnecting');
    const t0 = now(), waits = [300, 800, 1500, 2500, 4000];
    let n = 0, refused = 0;
    const attempt = () => {
      if (this.closing) return;
      this.open(this.roomId, false, (err) => {
        if (this.closing) return;
        if (!err) { this.setStatus('open'); this.graceUntil = now() + 6000; this.hostSeenAt = now(); this.emit('reconnected'); this.startSync(); return; }
        if (err === 'not_found') { this.migrate(false); return; }   // the host left meanwhile
        if (err === 'full') { this.fatal('full'); return; }
        if (err === 'disconnected') refused++;
        // the relay itself is down (every attempt refused outright): stop trying sooner
        if (now() - t0 > 15000 || (refused >= 5 && now() - t0 > 7000)) { this.fatal('unreachable'); return; }
        this.retryT = setTimeout(attempt, waits[Math.min(n++, waits.length - 1)]);
      });
    };
    attempt();
  }

  // The host is gone: the first remaining player in the host's join order hosts the successor room.
  migrate(wasHost) {
    const R = (wasHost ? this.mine.R : this.lastRoom) || {};
    const order = Array.isArray(R.o) ? R.o.filter((u) => typeof u === 'string') : [];
    const oldHost = wasHost ? this.me.uid : this.hostUid;
    const known = (u) => u === this.me.uid || this.byUid.has(u);
    let cands = order.filter((u) => u !== oldHost && known(u));
    if (!wasHost && !cands.includes(this.me.uid)) cands.push(this.me.uid);
    if (!cands.length) cands = [this.me.uid];   // (an old host on its own re-hosts)
    const rank = cands.indexOf(this.me.uid);
    const gen = Math.max(this.gen, num(R.g, 0, 999, 0)) + 1;
    const id = `${this.base}-g${gen}`.slice(0, 64);
    this.gen = gen;
    this.graceUntil = now() + 30000;   // nobody "leaves" while everyone moves to the new room
    this.setStatus('migrating', { next: this.byUid.get(cands[0])?.name || (cands[0] === this.me.uid ? this.me.name : '') });
    const t0 = now();
    this.refused = 0;
    const attempt = () => {
      if (this.closing) return;
      const el = now() - t0;
      if (el > 20000 || (this.refused >= 8 && el > 8000)) { this.fatal(this.refused > 4 ? 'unreachable' : 'host_lost'); return; }
      const myTurn = rank >= 0 && el >= rank * 4000;
      const done = (asHost) => {
        this.setStatus('open');
        this.graceUntil = now() + 6000;
        if (asHost) {
          this.hostUid = this.me.uid; this.synced = true;
          this.order = [this.me.uid, ...order.filter((u) => u !== this.me.uid && u !== oldHost)];
        } else { this.startSync(); this.hostSeenAt = now(); }
        this.emit('migrated', { asHost });
      };
      if (myTurn) {
        this.title = `${this.me.name}'s race`;
        this.open(id, true, (err) => {
          if (this.closing) return;
          if (!err) { done(true); return; }
          if (err === 'taken') this.open(id, false, (e2) => { if (!e2) done(false); else this.retryT = setTimeout(attempt, 700); });
          else { if (err === 'disconnected') this.refused = (this.refused || 0) + 1; this.retryT = setTimeout(attempt, 900); }
        });
      } else {
        this.open(id, false, (err) => {
          if (this.closing) return;
          if (!err) { done(false); return; }
          if (err === 'full') { this.fatal('full'); return; }
          if (err === 'disconnected') this.refused = (this.refused || 0) + 1;
          this.retryT = setTimeout(attempt, 700);
        });
      }
    };
    // give the next host a moment to open the room before knocking
    this.retryT = setTimeout(attempt, rank === 0 ? 0 : 400);
  }

  // ---- presence --------------------------------------------------------------------------------------
  // The app keeps its fields in this.mine and calls publish() when they change (races: every frame;
  // the sending rate is limited here).
  publish(force = false, minGap = 0) {
    const t = now();
    if (!force && t - this.pubT < minGap) { this.dirty = true; this.gap = minGap; return; }
    if (!this.room?.ready) { this.dirty = true; return; }
    this.pubT = t; this.dirty = false;
    const p = { v: PROTO, u: this.me.uid, n: this.me.name, ...this.mine };
    if (this.isHost) p.h = 1;
    try { this.room.publishPresence(p); } catch (e) { console.error(e); }
  }

  onPeers(peers) {
    const seen = new Set(), before = new Set(this.byUid.keys()), changed = [];
    let host = null, newPeer = false;
    for (const [pid, raw] of Object.entries(peers || {})) {
      let peer = this.peers.get(pid);
      if (!peer) { peer = { pid, uid: null, name: '', p: null, t: now() }; this.peers.set(pid, peer); newPeer = true; }
      const d = raw && typeof raw === 'object' && raw.v === PROTO ? raw : null;
      if (d && typeof d.u === 'string' && ID_RE.test(d.u) && d.u !== this.me.uid) {
        if (peer.p !== d) { changed.push(peer); peer.t = now(); }   // (each update arrives as a new object)
        peer.uid = d.u; peer.name = cleanName(str(d.n, 24)); peer.p = d; peer.host = d.h === 1;
        seen.add(d.u);
        // after a reconnect the old connection can linger in the room for a while with the same
        // uid: the one that updated most recently is the player
        const old = this.byUid.get(d.u);
        if (!old || old === peer || peer.t >= old.t || !this.peers.has(old.pid)) this.byUid.set(d.u, peer);
        if (peer.host && this.byUid.get(d.u) === peer) host = peer;
      }
    }
    for (const pid of [...this.peers.keys()]) if (!(pid in (peers || {}))) this.peers.delete(pid);
    // (players who vanish are only reported gone by sweep(), a few seconds later: a quick reconnect
    // isn't a leave)
    for (const u of seen) this.missing.delete(u);
    for (const u of seen) if (!before.has(u)) this.emit('arrived', this.byUid.get(u));
    if (this.isHost) {
      for (const u of seen) if (!this.order.includes(u)) this.order.push(u);
      this.order = this.order.filter((u) => u === this.me.uid || this.byUid.has(u));
    } else if (host) {
      if (host.p !== this.hostP) this.hostSeenAt = now();
      this.hostUid = host.uid; this.hostP = host.p;
      if (host.p.R && typeof host.p.R === 'object') { this.lastRoom = host.p.R; this.gen = Math.max(this.gen, num(host.p.R.g, 0, 999, 0)); }
    }
    // someone new (their presence starts empty): send ours again so they see us straight away
    if (newPeer) this.republishAt = now() + 150 + Math.random() * 250;
    for (const peer of changed) this.emit('presence', peer);
    this.emit('peers', changed);
  }
  // Players no longer in the room: missing at first ("reconnecting…"), reported as left after
  // LEAVE_GRACE (longer while someone new is still saying hello: it may be them). Nothing is
  // decided while we ourselves are reconnecting or moving to a new host.
  sweep() {
    if (now() < this.graceUntil || !this.room?.ready) return;
    const t = now(), live = new Set();
    let hello = false;
    for (const p of this.peers.values()) { if (p.uid) live.add(p.uid); else hello = true; }
    for (const [u, peer] of [...this.byUid]) {
      if (live.has(u)) { this.missing.delete(u); continue; }
      if (!this.missing.has(u)) { this.missing.set(u, t); this.emit('peers', []); continue; }
      const gone = t - this.missing.get(u);
      if (gone > (hello ? 10000 : LEAVE_GRACE)) { this.missing.delete(u); this.byUid.delete(u); this.emit('left', peer); }
    }
  }

  // ---- topics ------------------------------------------------------------------------------------------
  send(topic, data) {
    if (!this.room?.ready) return false;
    try { this.room.publishTopic(topic, { v: PROTO, u: this.me.uid, ...data }); return true; } catch (e) { console.error(e); return false; }
  }
  onTopic(topic, d, from) {
    if (!d || typeof d !== 'object' || d.v !== PROTO || typeof d.u !== 'string') return;
    if (topic === 'ping') {
      // the host answers with its clock (everyone else ignores pings)
      if (this.isHost && typeof d.a === 'number') this.send('pong', { a: d.a, h: this.sharedNow(), to: d.u });
      return;
    }
    if (topic === 'pong') {
      if (d.to !== this.me.uid || this.isHost) return;
      const sent = this.pings.get(d.a);
      if (sent === undefined || typeof d.h !== 'number' || !Number.isFinite(d.h)) return;
      this.pings.delete(d.a);
      const t = now(), rtt = t - sent;
      if (rtt < 0 || rtt > 5000) return;
      this.samples.push({ rtt, off: d.h + rtt / 2 - t, at: t });
      if (this.samples.length > 12) this.samples.shift();
      // the sample with the smallest round trip has the least room for error
      let best = this.samples[0];
      for (const s of this.samples) if (s.rtt < best.rtt) best = s;
      if (!this.synced) { this.offset = best.off; this.synced = true; this.emit('synced'); }
      else this.targetOffset = best.off;
      this.rtt = best.rtt;
      return;
    }
    const peer = this.byUid.get(d.u);
    this.emit('topic', topic, d, peer || null, from);
  }

  // ---- shared clock -------------------------------------------------------------------------------------
  sharedNow() { return now() + this.offset; }
  startSync() {
    this.samples = []; this.pings.clear();
    this.synced = false; this.pingN = 6; this.pingT = 0;   // a burst of pings, then one every few seconds
  }
  ping() {
    const a = Math.round(now() * 1000) / 1000;
    this.pings.set(a, now());
    if (this.pings.size > 20) this.pings.delete(this.pings.keys().next().value);
    this.send('ping', { a });
  }

  // called every frame by the app
  tick(dt) {
    const t = now();
    if (this.room?.ready) {
      if (!this.isHost) {
        this.pingT -= dt;
        if (this.pingT <= 0) {
          if (this.pingN > 0) { this.pingN--; this.pingT = 0.25; } else this.pingT = 6;
          this.ping();
        }
        // ease clock corrections in (a few ms per second) so race time never jumps
        if (this.targetOffset !== undefined) {
          const d = this.targetOffset - this.offset;
          if (Math.abs(d) > 250) this.offset = this.targetOffset;
          else this.offset += Math.max(-dt * 8, Math.min(dt * 8, d));
        }
      }
      if (this.republishAt && t >= this.republishAt) { this.republishAt = 0; this.publish(true); }
      else if (this.dirty && t - this.pubT >= (this.gap || 0)) this.publish(true);
      // (the host beats faster so a host that has gone quiet - a locked phone - is noticed)
      else if (t - this.pubT > (this.isHost ? 5 : MENU_HEARTBEAT) * 1000) this.publish(true);
      this.sweep();
    }
  }

  // the room's members (me included) for the room panel, in join order
  members() {
    const list = [{ uid: this.me.uid, name: this.me.name, me: true, host: this.isHost, p: this.mine }];
    for (const peer of this.byUid.values()) list.push({ uid: peer.uid, name: peer.name, me: false, host: peer.uid === this.hostUid, p: peer.p || {} });
    const order = this.isHost ? this.order : (this.lastRoom?.o || []);
    const pos = (u) => { const i = order.indexOf(u); return i < 0 ? 999 : i; };
    return list.sort((a, b) => pos(a.uid) - pos(b.uid));
  }
  // peers whose presence hasn't arrived yet (shown as "connecting")
  pendingCount() { let n = 0; for (const p of this.peers.values()) if (!p.uid) n++; return n; }
}
