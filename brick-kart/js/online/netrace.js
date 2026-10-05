// Online race sync. One NetRace per online race (race.net), created by online.js.
//
// Who simulates what:
// - every screen simulates its own player's kart and publishes its state ~15 times a second
// - the host also simulates the CPU karts (and the karts of players who left) and publishes them
//   in the same presence message
// - every other kart is a puppet (kart.remote = true): drawn from those updates with snapshot
//   interpolation on the shared race clock (an adaptive ~100-150 ms behind), dead reckoning when
//   updates are late (straight on for 0.3 s, then along the track for up to 3 s) and smoothed
//   corrections (a snap only for big jumps such as respawns)
// - item uses go to everyone as events with the user's pose, a random seed and the standings at
//   that moment, so each screen spawns the same shots; each screen decides hits only for the karts
//   it simulates and says so (a 'h' event), so the shot disappears everywhere
// - the host ends the race (everyone finished, or 45 s after the first player finished) and sends
//   the final order
import * as THREE from 'three';
import { AIDriver } from '../ai.js';
import { ITEMS, MULTI } from '../items.js';
import { angleDiff, wrapAngle } from '../kart.js';
import { ChaseCam } from '../race.js';
import { RACE_HZ, F, encodeKart, decodeKart, blankSnap, withSeed, num, int, str, r2, r3, esc } from './proto.js';

const GESTURES = new Set(['cheer', 'taunt', 'ouch', 'bonk', 'trick', 'throwF', 'throwB', 'use', 'yay', 'ready']);
const BUF = 24;            // snapshots kept per remote kart
const SNAP = 9;            // a correction bigger than this (metres) snaps instead of easing in
const EXTRAP = 0.3;        // straight-line dead reckoning, then along the track...
const EXTRAP_MAX = 3;      // ...for at most this long
const SMOOTH = 11;         // correction easing rate (1/s)
const V1 = new THREE.Vector3();

// A remote kart: its snapshot buffer, the adaptive render delay and the smoothed pose.
class Puppet {
  constructor(k) {
    this.k = k;
    this.buf = Array.from({ length: BUF }, blankSnap);
    this.n = 0; this.head = -1;
    this.tmp = blankSnap();
    this.cur = blankSnap();               // the interpolated state this frame
    this.disp = new THREE.Vector3().copy(k.pos); this.dispYaw = k.yaw;
    this.init = false;
    this.delay = 0.13; this.late = 0.06; this.dev = 0.02; this.space = 1 / RACE_HZ;
    this.gestN = -1;
    this.ctl = { throttle: 0, brake: 0, steer: 0, drift: false, driftPressed: false, itemPressed: false, back: false, aimFwd: false };
    this.renderT = -1e9;
  }
  newest() { return this.n ? this.buf[this.head] : null; }
  push(s, nowT) {
    const last = this.newest();
    if (last && s.t <= last.t) { if (s.t < last.t - 5) { this.n = 0; this.head = -1; } else return false; }
    // how late updates arrive (one-way delay plus clock error) and how much that wobbles: the
    // render delay sits just behind the newest data, with room for the next update and jitter
    const late = nowT - s.t;
    if (Number.isFinite(late) && Math.abs(late) < 5) {
      if (!this.lateInit) { this.late = late; this.lateInit = true; }
      this.dev += (Math.abs(late - this.late) - this.dev) * 0.1;
      this.late += (late - this.late) * 0.1;
    }
    if (last) this.space += (Math.min(0.5, s.t - last.t) - this.space) * 0.1;
    this.head = (this.head + 1) % BUF;
    const dst = this.buf[this.head];
    Object.assign(dst, s);
    this.n = Math.min(BUF, this.n + 1);
    return true;
  }
  targetDelay() { return Math.max(0.09, Math.min(0.35, this.late + this.space + 2 * this.dev + 0.015)); }
}

export class NetRace {
  // setup: the host's race setup; me: my uid; spectate: watching, no kart of my own
  constructor(online, race, setup, { me, spectate = false }) {
    this.online = online; this.session = online.session;
    this.race = race; this.setup = setup; this.raceId = setup.ri;
    this.me = me;
    this.goAt = null;                     // shared-clock ms of GO (null until the host says)
    this.introLen = 3;
    this.grid = setup.gr;                 // [{ u, n, d, k, g }]
    // this screen's players' karts (several with split screen)
    this.myIdxs = new Set(spectate ? [] : this.grid.map((g, i) => (g.u === me ? i : -1)).filter((i) => i >= 0));
    this.taken = new Set();               // grid indices the host drives for someone else
    this.puppets = new Map();             // kart idx -> Puppet
    this.pending = [];                    // remote events waiting for their moment
    this.out = []; this.evT = 0; this.seq = 0;
    this.ks = []; this.kbuf = [];
    this.pubT = 0;
    this.ended = false; this.endAt = 0;
    this.stats = { jumps: 0, snaps: 0, recv: 0, sent: 0 };
    this.items = new Set(Object.keys(ITEMS));
    race.net = this;
    race.hazards.clock = () => (this.goAt === null ? 0 : (this.session.sharedNow() - this.goAt) / 1000 + 100);
    for (const k of race.karts) if (k.remote) this.puppets.set(k.idx, new Puppet(k));
    this.plates = [];
    for (const k of race.karts) if (k.netName) this.addPlate(k);
    this.buildStandings();
    if (spectate || !this.myIdxs.size) this.spectate();
  }

  // ---- clock ------------------------------------------------------------------------------------
  countdownLeft() { return this.goAt === null ? 99 : (this.goAt - this.session.sharedNow()) / 1000; }
  raceTime() { return this.goAt === null ? 0 : Math.max(0, (this.session.sharedNow() - this.goAt) / 1000); }
  clockNow() { return this.goAt === null ? -99 : (this.session.sharedNow() - this.goAt) / 1000; }

  // ---- ownership --------------------------------------------------------------------------------
  hostUid() { return this.session.isHost ? this.me : this.session.hostUid; }
  ownerOf(i) { const g = this.grid[i]; return g && g.u && !this.taken.has(i) ? g.u : this.hostUid(); }
  // does this screen simulate kart i?
  owns(i) {
    if (this.myIdxs.has(i)) return true;
    return this.session.isHost && this.ownerOf(i) === this.me;
  }
  // Re-check who simulates each kart (after a takeover, a release or a host change) and switch
  // karts between puppet and simulated without a jump.
  applyRoles() {
    const race = this.race;
    for (const k of race.karts) {
      const mine = this.owns(k.idx);
      if (mine && k.remote) {
        // a puppet becomes a CPU here: carry on from where it is drawn
        // (from where it is NOW, projected on from its newest update, not from the delayed view:
        // the other screens are projecting it the same way, so nobody sees it jump)
        const p = this.puppets.get(k.idx);
        k.remote = false;
        const s = p?.cur;
        if (p?.n) {
          this.sample(p, this.clockNow());
          k.pos.set(s.x, s.y, s.z); k.yaw = s.yaw;
          k.speed = Math.max(0, s.spd); k.vy = s.vy; k.moveYaw = k.yaw;
          k.grounded = !!(s.flags & F.GROUND);
          if (k.respawn > 0) { k.respawn = 0; k.respawnPlaced = true; }
        }
        k.kvx = k.kvz = 0;
        race.track.locate(k.pos.x, k.pos.y, k.pos.z, -1, k.loc);
        k._prevI = k.loc.i; k.lastSafe = k.loc.i; k.safePos = null;
        if (s) k.lap = Math.round((s.rd - (k.loc.i + k.loc.t)) / race.track.N);
        k.lapSeen = Math.max(k.lapSeen || 0, k.lap);
        if (!k.human) race.drivers.set(k, new AIDriver(k, race, this.setup.df || 'normal'));
        this.puppets.delete(k.idx);
      } else if (!mine && !k.remote && !k.human) {
        // a CPU we drove goes back to its owner's updates
        k.remote = true;
        race.drivers.delete(k);
        const p = new Puppet(k);
        this.puppets.set(k.idx, p);
      }
    }
  }
  takeOver(i) { if (!this.taken.has(i)) { this.taken.add(i); this.applyRoles(); } }
  release(i) { if (this.taken.delete(i)) this.applyRoles(); }
  setTaken(list) {
    const next = new Set(list), same = next.size === this.taken.size && [...next].every((i) => this.taken.has(i));
    if (same) return;
    this.taken = next; this.applyRoles();
  }

  // ---- spectating -----------------------------------------------------------------------------------
  spectate() {
    this.spectating = true;
    // follow someone who's still here (a person's kart, else anyone's)
    const here = (k) => this.grid[k.idx]?.u && (this.grid[k.idx].u === this.me || this.session.byUid?.has(this.grid[k.idx].u));
    const list = [...this.race.karts.filter((k) => k.netHuman && here(k)), ...this.race.karts.filter((k) => k.netHuman)];
    const k = list[0] || this.race.karts[0];
    this.race.spec = { chase: new ChaseCam(), kart: k };
  }
  cycleSpec(dir) {
    if (!this.race.spec) return;
    const list = this.race.karts.filter((k) => k.netHuman);
    const pool = list.length ? list : this.race.karts;
    const i = pool.indexOf(this.race.spec.kart);
    this.race.spec.kart = pool[(i + dir + pool.length) % pool.length];
    this.race.spec.chase.init = false;
    return this.race.spec.kart;
  }

  // ---- incoming ---------------------------------------------------------------------------------------
  // kart states from one player's presence
  ingest(uid, ks) {
    if (!Array.isArray(ks) || ks.length > 13) return;
    const nowT = this.clockNow();
    for (const a of ks) {
      if (!Array.isArray(a)) continue;
      const i = a[0];
      if (!Number.isInteger(i) || i < 0 || i >= this.race.karts.length) continue;
      const p = this.puppets.get(i);
      if (!p || this.ownerOf(i) !== uid) continue;
      if (!decodeKart(a, p.tmp, this.items, GESTURES)) continue;
      // where on the track (for dead reckoning along it)
      const L = this.race.track.locate(p.tmp.x, p.tmp.y, p.tmp.z, p.newest()?.li ?? -1, this._loc ||= {});
      p.tmp.li = L.i + L.t; p.tmp.lat = L.lat;
      if (p.push(p.tmp, nowT)) this.stats.recv++;
    }
  }
  // a batch of events from one player
  events(uid, d) {
    if (d.r !== this.raceId || !Array.isArray(d.e)) return;
    for (const e of d.e.slice(0, 60)) {
      if (!Array.isArray(e)) continue;
      const i = e[1];
      if (!Number.isInteger(i) || i < 0 || i >= this.race.karts.length) continue;
      if (this.ownerOf(i) !== uid) continue;
      const t = num(e[2], -10, 1e5, NaN);
      if (!Number.isFinite(t)) continue;
      if (e[0] === 'u' || e[0] === 'h') this.pending.push({ i, t, e });
    }
    if (this.pending.length > 200) this.pending.splice(0, this.pending.length - 200);
  }

  // ---- per frame (called from Race.update) --------------------------------------------------------
  update(dt) {
    try { this.updatePuppets(dt); this.runEvents(); } catch (e) { console.error('netrace update', e); }
  }
  updatePuppets(dt) {
    const now = this.clockNow();
    for (const p of this.puppets.values()) {
      if (!p.n) { p.k.syncModel(dt); continue; }
      // ease the render delay towards its target (time runs at most 5% fast or slow)
      const want = p.targetDelay();
      p.delay += Math.max(-dt * 0.05, Math.min(dt * 0.05, want - p.delay));
      p.renderT = now - p.delay;
      this.sample(p, p.renderT);
      this.pose(p, dt);
    }
  }

  // the state at render time rt: interpolated between the two snapshots around it, or projected
  // on from the newest one
  sample(p, rt) {
    const out = p.cur, buf = p.buf;
    let b = p.head, a = -1;
    const newest = buf[p.head];
    if (rt >= newest.t || p.n === 1) {
      Object.assign(out, newest);
      const gap = Math.max(0, rt - newest.t);
      out.extra = gap;
      if (gap <= 0 || newest.flags & F.FIN && newest.spd < 1) return;
      if (gap <= EXTRAP) {
        // straight on with its velocity and turn rate
        const prev = p.n > 1 ? buf[(p.head - 1 + BUF) % BUF] : null;
        let yr = prev && newest.t > prev.t ? angleDiff(prev.yaw, newest.yaw) / (newest.t - prev.t) : 0;
        yr = Math.max(-3, Math.min(3, yr));
        out.x += newest.vx * gap; out.z += newest.vz * gap;
        if (!(newest.flags & F.GROUND)) out.y += newest.flags & F.GLIDE ? newest.vy * gap : newest.vy * gap - 21 * gap * gap;
        out.yaw = wrapAngle(newest.yaw + yr * gap);
      } else {
        // a long gap (a lost connection, a host change): keep it going along the track
        const g = Math.min(gap, EXTRAP_MAX), tr = this.race.track;
        const along = Math.max(0, newest.spd) * g * (newest.flags & F.FIN ? 0.5 : 1);
        const li = newest.li + along, i0 = Math.floor(li), f = li - i0;
        const A = tr.at(i0, newest.lat, 0, V1), ax = A.x, ay = A.y, az = A.z;
        const B = tr.at(i0 + 1, newest.lat, 0, V1);
        out.x = ax + (B.x - ax) * f; out.y = ay + (B.y - ay) * f; out.z = az + (B.z - az) * f;
        if (newest.flags & F.GLIDE || !(newest.flags & F.GROUND)) out.y = Math.max(out.y, newest.y - 4 * g);
        out.yaw = tr.yawAt(Math.round(li));
        out.rd = newest.rd + along;
        out.vx = Math.sin(out.yaw) * newest.spd; out.vz = Math.cos(out.yaw) * newest.spd;
      }
      return;
    }
    // walk back to the newest snapshot at or before rt
    for (let n = 1; n < p.n; n++) {
      const j = (p.head - n + BUF) % BUF;
      if (buf[j].t <= rt) { a = j; break; }
      b = j;
    }
    if (a < 0) { Object.assign(out, buf[b]); out.extra = 0; return; }   // older than anything we have
    const A = buf[a], B = buf[b], f = (rt - A.t) / Math.max(1e-4, B.t - A.t);
    Object.assign(out, f < 0.5 ? A : B);
    out.extra = 0;
    out.x = A.x + (B.x - A.x) * f; out.y = A.y + (B.y - A.y) * f; out.z = A.z + (B.z - A.z) * f;
    out.yaw = wrapAngle(A.yaw + angleDiff(A.yaw, B.yaw) * f);
    out.vx = A.vx + (B.vx - A.vx) * f; out.vz = A.vz + (B.vz - A.vz) * f; out.vy = A.vy + (B.vy - A.vy) * f;
    out.spd = A.spd + (B.spd - A.spd) * f; out.steer = A.steer + (B.steer - A.steer) * f;
    out.rd = A.rd + (B.rd - A.rd) * f;
    out.spin = Math.max(0, A.spin - (rt - A.t)); out.hid = Math.max(0, A.hid - (rt - A.t)); out.inv = Math.max(0, A.inv - (rt - A.t));
    out.trick = Math.max(0, A.trick - (rt - A.t));
    // (gestures and finishing are events: never skip one that happened between frames)
    out.gest = B.gest; out.gvoice = B.gvoice; out.gestN = B.gestN;
    if (A.fin || B.fin) out.fin = A.fin || B.fin;
  }

  // put the kart where the sample says, easing corrections in
  pose(p, dt) {
    const k = p.k, s = p.cur, tr = this.race.track;
    const gone = !!(s.flags & F.GONE);
    // predict with the sample's velocity, then pull towards the sample (critically damped-ish)
    const px = p.disp.x + s.vx * dt, pz = p.disp.z + s.vz * dt;
    const ex = px - s.x, ez = pz - s.z, ey = p.disp.y - s.y;
    let snapped = false;
    if (!p.init || gone || ex * ex + ez * ez + ey * ey > SNAP * SNAP) {
      if (p.init && !gone) this.stats.snaps++;
      p.disp.set(s.x, s.y, s.z); p.dispYaw = s.yaw; p.init = true; snapped = true;
    } else {
      const d = Math.exp(-SMOOTH * dt);
      p.disp.set(s.x + ex * d, s.y + ey * Math.exp(-SMOOTH * 1.6 * dt), s.z + ez * d);
      const ey2 = angleDiff(s.yaw, p.dispYaw);
      p.dispYaw = Math.abs(ey2) > 1.4 ? s.yaw : wrapAngle(s.yaw + ey2 * d);
    }
    k.pos.copy(p.disp);
    k.yaw = p.dispYaw;
    const sg = s.spd < 0 ? -1 : 1, vh = Math.hypot(s.vx, s.vz);
    k.moveYaw = vh > 0.5 ? Math.atan2(s.vx * sg, s.vz * sg) : k.yaw;
    k.speed = s.spd; k.vy = s.vy; k.kvx = k.kvz = 0;
    k.grounded = !!(s.flags & F.GROUND);
    const glide = !!(s.flags & F.GLIDE);
    if (glide !== !!k.gliding) k.setGliding(glide);
    const d = k.drift;
    d.active = !!(s.flags & F.DRIFT); d.dir = Math.sign(s.dl); d.level = Math.abs(s.dl);
    k.boostTime = s.flags & F.BOOST ? 0.2 : 0;
    k.goldenTime = s.flags & F.GOLD ? 1 : 0;
    k.shieldTime = s.flags & F.SHIELD ? 1 : 0;
    k.megaTime = s.flags & F.MEGA ? 1 : 0;
    k.bulletTime = s.flags & F.BULLET ? 1 : 0;
    k.ghostTime = s.flags & F.GHOST ? 1 : 0;
    k.frozenTime = s.flags & F.FROZEN ? 1 : 0;
    k.spinTime = s.spin; k.hidden = s.hid; k.invuln = s.inv; k.wreckTime = s.hid > 0 ? s.hid : 0;
    k.trickSpin = s.trick;
    k.lookBack = !!(s.flags & F.LOOK);
    k.respawn = gone ? 1 : 0; k.respawnPlaced = !gone;
    p.ctl.steer = s.steer; k.ctl = p.ctl;
    k.studs = s.studs;
    k.item = s.item; k.itemCount = s.item ? MULTI[s.item] || 1 : 0;
    k.nextItem = null; k.roulette = 0; k.roulette2 = 0;
    tr.locate(k.pos.x, k.pos.y, k.pos.z, snapped ? -1 : k.loc.i ?? -1, k.loc);
    k.lap = Math.round((s.rd - (k.loc.i + k.loc.t)) / tr.N);
    if (s.fin > 0 && !k.finished) {
      k.finished = true; k.finishTime = s.fin;
      this.race.results.push(k);
      this.race.voice(k, k.rank <= 3 ? 'win' : 'lose');
    }
    if (s.gestN !== p.gestN) {
      if (p.gestN >= 0 && s.gest) k.playNetGesture(s.gest, s.gvoice);
      p.gestN = s.gestN;
    }
    k.syncModel(dt);
  }

  // carry out remote item uses and hits when their kart's render time reaches them (so a shot
  // leaves the kart as you see it), or straight away if they're running very late
  runEvents() {
    if (!this.pending.length) return;
    const now = this.clockNow();
    for (let n = 0; n < this.pending.length; n++) {
      const ev = this.pending[n];
      const p = this.puppets.get(ev.i);
      const due = !p || p.renderT >= ev.t || now - ev.t > 1;
      if (!due) continue;
      this.pending.splice(n--, 1);
      try {
        if (ev.e[0] === 'u') { if (p) this.execUse(p, ev.e); }
        else this.race.items.removeByNetId(str(ev.e[3], 24));
      } catch (e) { console.error('online event', e); }
    }
  }
  // ['u', i, t, item, x, y, z, yaw, speed, trackIndex, back, aimFwd, seed, id, order]
  execUse(p, e) {
    const k = p.k, race = this.race, it = e[3];
    if (!k.remote || typeof it !== 'string' || !ITEMS[it]) return;
    const x = num(e[4], -1e5, 1e5, NaN), y = num(e[5], -1e4, 1e4, NaN), z = num(e[6], -1e5, 1e5, NaN);
    if (![x, y, z].every(Number.isFinite)) return;
    k.pos.set(x, y, z);
    k.yaw = k.moveYaw = num(e[7], -10, 10); k.speed = num(e[8], -400, 400);
    race.track.locate(x, y, z, int(e[9], 0, race.track.N - 1), k.loc);
    k.item = it; k.itemCount = MULTI[it] || 1; k._stolen = null;
    k.ctl = { ...p.ctl, back: !!e[10], aimFwd: !!e[11] };
    // the standings as the user saw them (homing shots and "the racer ahead" powers pick the same target)
    let order = null;
    if (Array.isArray(e[14]) && e[14].length === race.karts.length) {
      const seen = new Set(), list = [];
      for (const j of e[14]) { if (!Number.isInteger(j) || j < 0 || j >= race.karts.length || seen.has(j)) { order = null; break; } seen.add(j); list.push(race.karts[j]); }
      if (list.length === race.karts.length) order = list;
    }
    const prev = race.order;
    if (order) race.order = order;
    race.items.netId = str(e[13], 24) || null;
    try { withSeed(int(e[12], 0, 4294967295), () => race.items.use(k)); } catch (err) { console.error('remote item use failed', it, err); } finally {
      race.order = prev; race.items.netId = null;
      k.pos.copy(p.disp); k.yaw = p.dispYaw; k.ctl = p.ctl;
    }
  }

  // ---- local events (called by Race / Items) --------------------------------------------------------
  // One of our karts uses its item: do it with a seed and tell everyone.
  use(k, fn) {
    if (k.remote) return;
    const race = this.race, it = k.item;
    const seed = (Math.random() * 4294967295) >>> 0, id = `${k.idx}.${++this.seq}`;
    const ev = ['u', k.idx, r3(race.time), it, r2(k.pos.x), r2(k.pos.y), r2(k.pos.z), r3(k.yaw), r2(k.speed), k.loc.i | 0, k.ctl.back ? 1 : 0, k.ctl.aimFwd ? 1 : 0, seed, id, race.order.map((o) => o.idx)];
    race.items.netId = id;
    try { withSeed(seed, fn); } finally { race.items.netId = null; }
    this.out.push(ev);
  }
  // one of our karts was hit by a shot or trap: everyone else removes it
  onHit(k, src) {
    if (k.remote || !src?.nid) return;
    this.out.push(['h', k.idx, r3(this.race.time), src.nid]);
  }

  // ---- after the frame: publish our karts, flush events, host duties --------------------------------
  post() {
    try { this.publishKarts(); this.flush(); if (this.session.isHost) this.hostDuties(); this.updateStandings(); } catch (e) { console.error('netrace post', e); }
  }
  publishKarts() {
    const t = performance.now(), race = this.race;
    const rate = race.state === 'race' ? RACE_HZ : 3;
    if (t - this.pubT < 1000 / rate - 4) return;
    this.pubT = t;
    const ks = this.ks;
    ks.length = 0;
    let n = 0;
    for (const k of race.karts) {
      if (k.remote || !this.owns(k.idx)) continue;
      const a = this.kbuf[n] ||= [];
      ks.push(encodeKart(k, this.clockNow(), a));
      n++;
    }
    const m = this.session.mine;
    m.ks = ks;
    m.ri = this.raceId;
    this.stats.sent++;
    this.session.publish(true);
  }
  flush() {
    if (!this.out.length) return;
    const t = performance.now();
    if (t - this.evT < 50) return;
    this.evT = t;
    const e = this.out.splice(0, 40);
    this.session.send('ev', { r: this.raceId, e });
  }
  hostDuties() {
    if (this.ended || !this.race.started) return;
    const race = this.race, t = race.time;
    // the race is over when every player still racing has finished (a few seconds later), or 45 s
    // after the first player finished
    const humans = race.karts.filter((k) => this.grid[k.idx]?.u && !this.taken.has(k.idx));
    const fins = humans.filter((k) => k.finished);
    let firstFin = Infinity;
    for (const k of race.karts) if (k.netHuman && k.finished) firstFin = Math.min(firstFin, k.finishTime);
    if (humans.length && fins.length === humans.length) { if (!this.endAt) this.endAt = t + 3; }
    else if (!humans.length && t > 5) { if (!this.endAt) this.endAt = t + 1; }
    if (firstFin < Infinity && t - firstFin > 45 && !this.endAt) this.endAt = t;
    if (this.endAt && t >= this.endAt) {
      this.ended = true;
      const res = race.results_().map((r) => [r.kart.idx, r3(r.time), r.estimated ? 1 : 0]);
      this.online.hostEndRace(res);
    }
  }

  // ---- names over karts and the standings list ----------------------------------------------------------
  addPlate(k) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 34px Nunito, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const name = k.netName.slice(0, 16), w = Math.min(250, g.measureText(name).width + 28);
    g.fillStyle = 'rgba(10,16,30,0.72)';
    g.beginPath(); g.roundRect?.(128 - w / 2, 8, w, 48, 22); if (!g.roundRect) g.rect(128 - w / 2, 8, w, 48); g.fill();
    g.fillStyle = '#fff'; g.fillText(name, 128, 33);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
    sp.scale.set(4.4, 1.1, 1);
    sp.position.y = (k.model.top || 2.6) + 1.1;
    sp.renderOrder = 5;
    // split screen: each player's own name shows on the other players' views, never their own
    const cam = this.race.cams.find((c) => c.kart === k);
    if (cam) {
      const layer = 2 + this.race.cams.indexOf(cam);
      sp.layers.set(layer);
      for (const c of this.race.cams) if (c !== cam) c.chase.cam.layers.enable(layer);
    }
    k.model.root.add(sp);
    this.plates.push(sp);
  }
  buildStandings() {
    const root = this.race.game.hudRoot;
    const el = this.stEl = document.createElement('div');
    el.className = 'ol-standings';
    root.appendChild(el);
    this.stT = 0; this.stKey = '';
  }
  updateStandings() {
    const t = performance.now();
    if (t - this.stT < 250 || !this.stEl) return;
    this.stT = t;
    const rows = [];
    let key = '';
    this.race.order.forEach((k, n) => {
      const g = this.grid[k.idx] || {}, me = this.myIdxs.has(k.idx);
      const name = g.u ? g.n : k.driver?.name || 'CPU';
      key += k.idx + ',';
      rows.push(`<div class="${me ? 'me' : g.u ? 'pl' : ''}${this.taken.has(k.idx) && g.u ? ' cpu' : ''}"><b>${n + 1}</b><span>${esc(name)}</span>${k.finished ? '<i>🏁</i>' : ''}</div>`);
    });
    const fin = this.race.karts.filter((k) => k.finished).length;
    key += fin + (this.spectating ? 's' + this.race.spec?.kart.idx : '');
    if (key === this.stKey) return;
    this.stKey = key;
    this.stEl.innerHTML = rows.join('') + (this.spectating ? `<div class="spec">👀 Spectating ${esc(this.grid[this.race.spec?.kart.idx]?.n || this.race.spec?.kart.driver?.name || '')} · ◀︎ ▶︎ switch</div>` : '');
  }

  dispose() {
    this.stEl?.remove();
    for (const sp of this.plates) { sp.material.map?.dispose(); sp.material.dispose(); }
    this.plates = [];
    this.pending = []; this.out = [];
    const m = this.session.mine;
    delete m.ks;
  }
}
