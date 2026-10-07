// Online co-op: one player hosts their world, friends join it.
//
// Who owns what:
// - The HOST owns the world: story progress, house points, collectibles, time of day and every
//   enemy. The host is the main character; guests are supporting characters who share the story.
// - Each player owns their own student: movement, spells, health, minigames. Positions go out ten
//   times a second as presence and are drawn on the other screens with interpolation.
// - Guests see the host's enemies as puppets. A guest's spell that hits one is sent to the host,
//   who applies it (combos included). Enemies chase whichever student is nearer; a hit on a guest
//   is sent to that guest, whose own screen decides if it lands (dodge rolls and Protego work as
//   usual). Enemy spells are re-created on each screen and only hurt that screen's student.
// - Rooms are on the mini-rooms relay (session.js). If the relay can't be reached, nothing in the
//   rest of the game changes; if a connection drops, everyone keeps playing while it reconnects.
//
// The game calls into here through G.net (null when not online); every hook is optional-chained.
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from '../state.js';
import { SPELL_BY_ID } from '../spelldata.js';
import { ENEMY_SPELLS } from '../spells.js';
import { loadSave, newSave } from '../save.js';
import { Session, loadMiniRooms, listWorlds, newUid, PROTO, num, int, str, esc, vec, r2, r3, clamp } from './session.js';
import { RemotePlayer, Proxy, PF, packLook, cleanHouse, readEnemy, writeEnemy, makePuppet, pushPuppet, updatePuppet } from './remote.js';

export { listWorlds };

const UID = newUid(); // this tab: stays the same across reconnects
const UID_RE = /^[a-z0-9]{10}$/;
const ZONES = ['grounds', 'greatHall', 'staircase', 'corridor', 'dungeon', 'tower'];
const ENEMY_DEF_BY_ID = Object.fromEntries(Object.values(ENEMY_SPELLS).map((d) => [d.id, d]));
const canonSpell = (id) => SPELL_BY_ID[id] || ENEMY_DEF_BY_ID[id] || null;
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const arr = (v) => [r2(v.x), r2(v.y), r2(v.z)];
const SPELL_WORD = /^[a-z]{1,16}$/;
const REASONS = {
  host_left: 'The host closed their world.',
  not_found: 'That world has closed.',
  full: 'That world is full.',
  lost: 'The connection to the world was lost.',
  offline: 'Your world went offline: the connection was lost.',
  timeout: 'The world did not answer in time.',
  disconnected: 'Could not reach the online service.',
  unreachable: 'Could not reach the online service.',
  nohost: 'The host did not answer. Their world may have just closed.',
};
const reasonText = (r) => REASONS[r] || 'The online service is not answering.';

let errT = 0;
function logError(where, e) {
  const t = performance.now();
  if (t - errT > 2000) { errT = t; console.error('online:', where, e); }
}

export class Coop {
  constructor(session, role, ident = null) {
    this.s = session;
    this.role = role; // 'host' | 'guest'
    this.ident = ident;
    this.avatars = new Map(); // uid -> RemotePlayer
    this.proxies_ = new Map(); // uid -> Proxy (host)
    this.missing = new Map(); // uid -> when they dropped out of the presence list
    this.handled = new WeakSet(); // presence objects already read
    this.puppets = new Map(); // host enemy id -> puppet Enemy (guests)
    this.hostUid = role === 'host' ? UID : null;
    this.hostName = role === 'host' ? G.save.name : 'your friend';
    this.hostData = null; // the host's latest presence
    this.hostAt = 0;
    this.W = null; this.Wkey = '';
    this.E = null; this.Et = 0;
    this.pubT = 0;
    this.trigs = []; this.trigSeq = 0;
    this.projQ = [];
    this.floatT = 0; this.floatN = 0;
    this.lastPub = { pos: new THREE.Vector3(), t: 0 };
    this.safe = null;
    this.entered = role === 'host';
    this.credit = null; // house to credit while applying a guest's hit
    this.pill = null;
    this.stats = { out: {}, in: {} }; // event counts by kind (for debugging: G.net.stats)
    session.on('presence', () => this.onPresence());
    session.on('events', (d) => this.onEvents(d));
    session.on('status', (st, info) => this.onStatus(st, info));
    session.on('ended', (reason) => this.onEnded(reason));
  }

  get isHost() { return this.role === 'host'; }
  get isGuest() { return this.role === 'guest'; }
  get live() { return !this.s.ended; }
  get hasCompany() { return this.avatars.size > 0; }
  get hostAvatar() { return this.hostUid ? this.avatars.get(this.hostUid) : null; }
  get myName() { return G.save.name; }

  // ------------------------------------------------------------ presence in
  onPresence() {
    if (this.disposed) return;
    const now = performance.now();
    const seen = new Set();
    for (const pid in this.s.recv) {
      const { data: d, at } = this.s.recv[pid];
      if (!d || typeof d !== 'object' || d.v !== PROTO || !UID_RE.test(d.u) || d.u === UID) continue;
      seen.add(d.u);
      if (this.handled.has(d)) continue;
      this.handled.add(d);
      try { this.readPresence(d, at); } catch (e) { logError('presence', e); }
    }
    // people who dropped out get a few seconds to come back (a reconnect is the same uid)
    for (const uid of this.avatars.keys()) {
      if (seen.has(uid)) this.missing.delete(uid);
      else if (!this.missing.has(uid)) this.missing.set(uid, now);
    }
    // someone new: publish right away so they see us at once
    if (seen.size > this.lastSeen) this.pubT = 0;
    this.lastSeen = seen.size;
  }

  readPresence(d, at) {
    const isHostMsg = d.r === 'h';
    if (this.isGuest && isHostMsg) {
      if (this.hostUid && this.hostUid !== d.u) return; // one host per world
      this.hostUid = d.u;
      this.hostName = str(d.n, 16) || 'your friend';
      this.hostData = d;
      this.hostAt = at;
    }
    if (this.isHost && isHostMsg) return; // a second host in our room: ignore it
    let a = this.avatars.get(d.u);
    if (!a) {
      if (this.avatars.size >= 6) return;
      a = new RemotePlayer(d.u);
      this.avatars.set(d.u, a);
      a.setInfo(d);
      if (this.entered) {
        G.ui.toast(`<b>${esc(a.name)}</b> ${this.isHost ? 'joined your world!' : 'is here.'}`, 'info', 3500);
        G.audio?.sfx('ui');
      }
      if (this.isHost) this.proxies_.set(d.u, new Proxy(this, a));
    } else a.setInfo(d);
    a.push(d, at);
    if (this.isGuest && isHostMsg) {
      if (d.W && typeof d.W === 'object') {
        const key = JSON.stringify(d.W);
        if (key !== this.Wkey) {
          this.Wkey = key;
          this.W = d.W;
          if (this.entered) this.applyWorld(d.W, false);
        }
      }
      if (d.E && typeof d.E === 'object' && Array.isArray(d.E.l)) { this.E = d.E; this.Et = num(d.t, 0, 1e12) / 1000; }
      else this.E = null;
    }
  }

  removeAvatar(uid) {
    const a = this.avatars.get(uid);
    if (!a) return;
    a.dispose();
    this.avatars.delete(uid);
    this.proxies_.delete(uid);
    this.missing.delete(uid);
    if (this.entered && uid !== this.hostUid) G.ui.toast(`<b>${esc(a.name)}</b> left ${this.isHost ? 'your' : 'the'} world.`, 'info', 3500);
  }

  // ------------------------------------------------------------ per frame
  update(dt) {
    try {
      const now = performance.now();
      for (const [uid, t] of this.missing) if (now - t > 4000) this.removeAvatar(uid);
      for (const a of this.avatars.values()) a.update(dt, now);
      if (this.isHost) {
        for (const p of this.proxies_.values()) {
          p.refresh();
          if (p.drainAcc > 0.5 || (p.drainAcc > 0 && (this.drainT = (this.drainT || 0) - dt) <= 0)) {
            this.drainT = 0.25;
            this.send({ k: 'hurt', to: p.uid, dr: r2(p.drainAcc) });
            p.drainAcc = 0;
          }
        }
        if (G.player.grounded && G.player.alive && G.mode === 'play' && !G.minigame && G.zone) {
          this.safe = [G.zone.name, r2(G.player.pos.x), r2(G.player.pos.y), r2(G.player.pos.z), r2(G.player.yaw)];
        }
        this.flushEnemyProjectiles();
      } else if (this.entered) {
        this.syncPuppets(dt, now);
      }
      this.pubT -= dt;
      if (this.pubT <= 0) {
        this.pubT = this.hasCompany ? 0.1 : 1;
        this.publish(now);
      }
      this.floatT -= dt;
      if (this.floatT <= 0) { this.floatT = 1; this.floatN = 0; }
      this.s.flush(dt);
      this.updatePill();
    } catch (e) { logError('update', e); }
  }

  // ------------------------------------------------------------ presence out
  publish(now) {
    if (!this.entered || !G.zone) return;
    const p = G.player;
    const H = G.story?.hippogriff;
    let obj = p.root, m = 0;
    if (H && p.root.parent === H.saddle) { obj = H.root; m = 2; }
    else if (p.status.override === 'fly') m = 1;
    obj.updateMatrixWorld(true);
    const wp = obj.getWorldPosition(new THREE.Vector3());
    const wq = obj.getWorldQuaternion(new THREE.Quaternion());
    const lp = this.lastPub;
    const el = (now - lp.t) / 1000;
    const speed = el > 0 && el < 1 ? Math.min(60, Math.hypot(wp.x - lp.pos.x, wp.z - lp.pos.z) / el) : 0;
    lp.pos.copy(wp); lp.t = now;
    let f = 0;
    if (G.spells.shieldUp) f |= PF.SHIELD;
    if (G.spells.lumosOn) f |= PF.LUMOS;
    if (p.alive) f |= PF.ALIVE;
    if (G.mode === 'play' && !G.minigame && p.control && !G.paused) f |= PF.TARGET;
    if (p.root.visible && G.mode !== 'menu' && G.mode !== 'menu-custom') f |= PF.VISIBLE;
    if (G.minigame || G.mode === 'results' || G.mode === 'minigame') f |= PF.BUSY;
    const d = {
      v: PROTO, u: UID, r: this.isHost ? 'h' : 'g', t: Math.round(now),
      n: G.save.name, h: G.save.house, k: packLook(G.save.look),
      z: G.zone.name, p: arr(wp), q: [r3(wq.x), r3(wq.y), r3(wq.z), r3(wq.w)],
      a: p.anim?.state || 'idle', s: r2(speed), f, m, hp: Math.round(clamp(p.hp / p.maxHp, 0, 1) * 100),
    };
    if (this.trigs.length) { d.tr = [++this.trigSeq, ...this.trigs.splice(0, 5)]; this.trigs.length = 0; }
    if (this.isHost) {
      d.W = this.worldState();
      if (this.safe) d.gp = this.safe;
      if (this.hasCompany && G.enemies.list.length) d.E = { z: G.zone.name, l: G.enemies.list.slice(0, 24).map(writeEnemy) };
    }
    this.s.publish(d);
  }

  worldState() {
    const s = G.save;
    return {
      st: s.stage, f: s.flags, pts: s.points, c: s.cards, b: s.beans, sp: [...G.spells.unlocked],
      tod: r3(G.skyObj.tod), lk: G.skyObj.lock != null ? 1 : 0, done: s.completed ? 1 : 0,
    };
  }

  // ------------------------------------------------------------ guest: the shared world
  applyWorld(W, first) {
    const s = G.save;
    if (W.pts && typeof W.pts === 'object') {
      for (const k of HOUSE_KEYS) s.points[k] = int(W.pts[k], 0, 1e7, s.points[k]);
      G.ui.updatePoints();
    }
    if (W.f && typeof W.f === 'object') {
      const flags = {};
      for (const k of Object.keys(W.f).slice(0, 40)) if (/^[A-Za-z]{1,24}$/.test(k) && (typeof W.f[k] === 'boolean' || typeof W.f[k] === 'number')) flags[k] = W.f[k];
      s.flags = flags;
    }
    if (Array.isArray(W.sp)) for (const id of W.sp.slice(0, 8)) if (SPELL_BY_ID[id] && !G.spells.unlocked.has(id)) G.spells.unlock(id, first);
    if (Array.isArray(W.c)) s.cards = [...new Set(W.c.filter((i) => Number.isInteger(i) && i >= 0 && i < 12))];
    if (Array.isArray(W.b)) s.beans = [...new Set(W.b.filter((i) => Number.isInteger(i) && i >= 0 && i < 30))];
    G.story.applyCollected();
    s.completed = !!W.done;
    const st = int(W.st, 0, 11, s.stage);
    if (st !== s.stage) {
      const old = s.stage;
      G.story.syncStage(st);
      if (!first && st > old) G.story.announceStage(old, st, this.hostName);
    }
    const tod = num(W.tod, 0, 1, -1);
    if (tod >= 0 && !W.lk && G.skyObj.lock == null) {
      let diff = Math.abs(tod - G.skyObj.tod);
      diff = Math.min(diff, 1 - diff);
      if (first || diff > 0.01) G.skyObj.tod = tod;
    }
  }

  // the host's enemies in our zone, drawn as puppets
  syncPuppets(dt, now) {
    const host = this.hostAvatar;
    const E = this.E;
    // (a host who goes quiet for a moment leaves their enemies frozen in place rather than gone)
    const on = !!(host && E && E.z === G.zone?.name && host.zone === G.zone.name && !G.minigame && G.mode !== 'results' && now - this.hostAt < 10000);
    // forget puppets that something else removed (zone changes clear the enemy list)
    for (const [id, e] of this.puppets) if (!G.enemies.list.includes(e)) this.puppets.delete(id);
    if (!on) { if (this.puppets.size) this.clearPuppets(); return; }
    const t = this.Et;
    const ids = new Set();
    for (const raw of E.l.slice(0, 24)) {
      const s = readEnemy(raw);
      if (!s) continue;
      ids.add(s.id);
      let e = this.puppets.get(s.id);
      if (!e) {
        if (!(s.f & 1) && !this.puppetsSeen?.has(s.id)) continue; // don't spawn corpses we never saw alive
        e = makePuppet(this, s);
        this.puppets.set(s.id, e);
        G.enemies.list.push(e);
        if (e.def.boss && e.alive) G.ui.boss(e);
      }
      (this.puppetsSeen ||= new Set()).add(s.id);
      pushPuppet(e, s, t);
    }
    for (const [id, e] of this.puppets) if (!ids.has(id)) this.dropPuppet(id, e);
    const rt = host.clock.renderTime(now);
    for (const e of this.puppets.values()) updatePuppet(e, dt, rt);
  }
  dropPuppet(id, e) {
    this.puppets.delete(id);
    G.enemies.list = G.enemies.list.filter((x) => x !== e);
    if (G.ui.bossTarget === e) G.ui.boss(null);
    if (G.cam.lockTarget === e) G.cam.lockTarget = null;
    if (G.spells.held?.target === e) G.spells.held = null;
    e.dispose();
  }
  clearPuppets() { for (const [id, e] of this.puppets) this.dropPuppet(id, e); }
  puppet(id) { return this.isGuest ? this.puppets.get(id) : G.enemies.list.find((e) => e.id === id); }

  // ------------------------------------------------------------ events out
  send(ev) {
    if (!this.entered) return;
    this.stats.out[ev.k] = (this.stats.out[ev.k] || 0) + 1;
    this.s.send(ev);
  }
  // anyone else in my zone?
  companyHere() {
    const z = G.zone?.name;
    for (const a of this.avatars.values()) if (a.zone === z && !a.away) return true;
    return false;
  }

  trig(name) { if (this.trigs.length < 8) this.trigs.push(name); }

  // my spell: everyone in the zone sees it fly
  cast(id, origin, dir, target, mult = 1) {
    if (!this.companyHere()) return;
    this.send({ k: 'c', z: G.zone.name, s: id, o: arr(origin), d: [r3(dir.x), r3(dir.y), r3(dir.z)], h: target ? (target.netId ?? target.id) : 0 });
  }
  patronus(origin, dir) {
    if (!this.companyHere()) return;
    this.send({ k: 'pt', z: G.zone.name, o: arr(origin), d: [r3(dir.x), r3(dir.y), r3(dir.z)], p: arr(G.player.pos) });
  }

  // host: enemy spells, telegraphs, shockwaves, floating text and banners
  enemyProj(pr) { if (this.isHost && this.companyHere()) this.projQ.push(pr); }
  flushEnemyProjectiles() {
    if (!this.projQ.length) return;
    for (const pr of this.projQ.splice(0)) {
      if (pr.dead) continue;
      const d = pr.def;
      this.send({
        k: 'ep', z: G.zone.name, p: arr(pr.pos), v: arr(pr.vel), l: r2(pr.life), o: pr.owner?.id || 0,
        d: { id: d.id, color: d.color, color2: d.color2, dmg: d.dmg, speed: d.speed, radius: d.radius, kind: d.kind, gravity: d.gravity || 0, knock: d.knock || 0, burn: d.burn || 0, stun: d.stun || 0, smoke: !!d.smoke },
      });
    }
  }
  telegraph(pos, r, delay, opts = {}) {
    if (!this.isHost || !this.companyHere()) return;
    this.send({ k: 'tg', z: G.zone.name, p: arr(pos), r: r2(r), dl: r2(delay), o: { line: !!opts.line, width: opts.width || 0, length: opts.length || 0, yaw: r3(opts.yaw || 0), color: opts.color ?? 0xff3020 } });
  }
  wave(center) { if (this.isHost && this.companyHere()) this.send({ k: 'wv', z: G.zone.name, p: arr(center) }); }
  float(pos, text, cls) {
    if (!this.isHost || !this.companyHere() || ++this.floatN > 20) return;
    this.send({ k: 'fl', z: G.zone.name, p: arr(pos), x: String(text).slice(0, 40), c: String(cls || '').slice(0, 30) });
  }
  share(kind, a, b, c) {
    if (!this.isHost || !this.companyHere()) return;
    if (kind === 'banner') this.send({ k: 'bn', z: G.zone.name, t: String(a).slice(0, 80), s: String(b || '').slice(0, 160), c: String(c || '').slice(0, 30) });
    if (kind === 'toast') this.send({ k: 'ts', z: G.zone.name, x: String(a).slice(0, 200) });
  }
  // host: a line of dialogue, shown as a subtitle to friends in the same room
  line(line) {
    if (!this.isHost || !this.companyHere() || !line?.text) return;
    this.send({ k: 'say', z: G.zone.name, w: String(line.who || '').slice(0, 40), x: String(line.text).slice(0, 400), c: String(line.color || '').slice(0, 9) });
  }
  // host: an enemy hurts a guest
  hurt(uid, amount, info) {
    this.send({ k: 'hurt', to: uid, a: r2(amount), kn: info.knock ? arr(info.knock) : 0, db: info.dodgeable === false ? 0 : 1, bl: info.blockable === false ? 0 : 1 });
  }
  proxies() {
    if (!this.isHost) return null;
    const out = [];
    for (const p of this.proxies_.values()) if (p.targetable) out.push(p);
    return out;
  }

  // guest: my spells on the host's enemies
  hit(e, def, dir) {
    const canon = canonSpell(def.id);
    if (!canon) return;
    this.send({ k: 'hit', e: e.netId, s: def.id, m: r2(canon.dmg ? def.dmg / canon.dmg : 1), dir: arr(dir) });
    if (def.id === 'leviosa' && !e.def.boss && e.alive) {
      G.spells.holdEnemy(e);
      e.status.lifted = 3.5;
      e.liftGrace = 0.8;
    }
  }
  forward(k, e, d) { this.send({ k, e: e.netId, ...d }); }
  points(house, n, reason) { this.send({ k: 'pts', h: house, n, r: reason ? String(reason).slice(0, 60) : '' }); }
  collect(kind, i) { this.send({ k: 'col', kind, i }); }

  // ------------------------------------------------------------ events in
  onEvents(d) {
    if (!d || d.v !== PROTO || !UID_RE.test(d.u) || d.u === UID || !Array.isArray(d.e)) return;
    const from = this.avatars.get(d.u);
    if (!from || !this.entered) return;
    const fromHost = d.u === this.hostUid;
    for (const ev of d.e.slice(0, 80)) {
      if (this.disposed) return;
      if (!ev || typeof ev !== 'object') continue;
      try { this.onEvent(ev, from, fromHost); } catch (e) { logError('event ' + ev.k, e); }
    }
  }

  onEvent(ev, from, fromHost) {
    const here = G.zone && ev.z === G.zone.name;
    this.stats.in[ev.k] = (this.stats.in[ev.k] || 0) + 1;
    switch (ev.k) {
      // ---- anyone
      case 'c': {
        if (!here || !SPELL_WORD.test(ev.s)) return;
        const def = canonSpell(ev.s), o = vec(ev.o), dv = vec(ev.d, 2);
        if (!def || !o || !dv) return;
        const dir = v3(dv).normalize();
        if (!Number.isFinite(dir.x)) return;
        const origin = v3(o);
        const homing = ev.h ? this.puppet(int(ev.h, 0, 1e9)) : null;
        G.spells.spawnProjectile(def, origin, dir, 'remote', from, homing || null);
        G.fx.emit({ pos: origin, color: def.color, count: 14, speed: 3, size: 0.2, life: 0.3, intensity: 3 });
        if (origin.distanceTo(G.player.pos) < 30) G.audio.sfx(def.id);
        return;
      }
      case 'pt': {
        const o = vec(ev.o), dv = vec(ev.d, 2), p = vec(ev.p);
        if (!here || !o || !dv || !p) return;
        G.spells.castPatronus(v3(o), v3(dv).normalize(), { pos: v3(p) }, true);
        G.audio.sfx('patronum');
        return;
      }
      // ---- host -> guests
      case 'ep': {
        if (!fromHost || !here || !this.puppetsOn()) return;
        const p = vec(ev.p), v = vec(ev.v, 200), dd = ev.d;
        if (!p || !v || !dd || typeof dd !== 'object') return;
        const def = {
          id: SPELL_WORD.test(dd.id) ? dd.id : 'curse', color: int(dd.color, 0, 0xffffff, 0x40ff70), color2: int(dd.color2, 0, 0xffffff, 0xffffff),
          dmg: num(dd.dmg, 0, 80, 10), speed: num(dd.speed, 1, 80, 25), radius: num(dd.radius, 0.1, 2, 0.4), kind: dd.kind === 'boulder' ? 'boulder' : 'bolt',
          gravity: num(dd.gravity, 0, 40), knock: num(dd.knock, 0, 20), burn: num(dd.burn, 0, 5), stun: num(dd.stun, 0, 3), smoke: !!dd.smoke, enemy: true,
        };
        const vel = v3(v);
        const owner = ev.o ? this.puppet(int(ev.o, 0, 1e9)) : null;
        const pr = G.spells.spawnProjectile(def, v3(p), vel.clone().normalize(), 'enemy', owner || null);
        pr.vel.copy(vel);
        pr.life = num(ev.l, 0.1, 4, 2.6);
        if (def.kind !== 'boulder') G.fx.emit({ pos: pr.pos, color: def.color, count: 10, speed: 3, size: 0.2, life: 0.3, intensity: 3 });
        if (pr.pos.distanceTo(G.player.pos) < 30) G.audio.sfx(def.id === 'curse' || def.id === 'killing' ? 'curse' : def.kind === 'boulder' ? 'whoosh' : def.id);
        return;
      }
      case 'tg': {
        if (!fromHost || !here || !this.puppetsOn()) return;
        const p = vec(ev.p), o = ev.o && typeof ev.o === 'object' ? ev.o : {};
        if (!p) return;
        const at = v3(p), r = num(ev.r, 0.2, 12, 2), color = int(o.color, 0, 0xffffff, 0xff3020);
        G.enemies.telegraph(at, r, num(ev.dl, 0.1, 4, 1), () => {
          if (o.line) return;
          G.fx.shock(at.clone().setY(at.y + 0.1), color, r * 1.4, 0.45);
          G.fx.smokePuff(at, 0x6a5a4a, 8, { speed: 3 });
          if (at.distanceTo(G.player.pos) < 25) G.audio.sfx('slam');
        }, { line: !!o.line, width: num(o.width, 0, 10, 2) || 2, length: num(o.length, 0, 60, 12) || 12, yaw: num(o.yaw, -10, 10), color });
        return;
      }
      case 'wv': {
        const p = vec(ev.p);
        if (fromHost && here && p && this.puppetsOn()) G.enemies.addWave(v3(p));
        return;
      }
      case 'hurt': {
        if (!fromHost || ev.to !== UID) return;
        const pl = G.player;
        if (ev.dr) {
          const a = num(ev.dr, 0, 40);
          if (!pl.alive || (G.mode !== 'play' && G.mode !== 'minigame')) return;
          pl.hp -= a; pl.lastHurt = 0; pl.mana = Math.max(0, pl.mana - a);
          if (pl.hp <= 0 && pl.alive) pl.faint();
          return;
        }
        const kn = vec(ev.kn, 40);
        pl.damage(num(ev.a, 0, 120), { knock: kn ? v3(kn) : null, dodgeable: ev.db !== 0, blockable: ev.bl !== 0 });
        return;
      }
      case 'fl': {
        const p = vec(ev.p);
        if (fromHost && here && p) G.ui.floatText(v3(p), str(ev.x, 40), str(ev.c, 30).replace(/[^a-z ]/g, ''));
        return;
      }
      case 'bn':
        if (fromHost && here) G.ui.banner(esc(str(ev.t, 80)), esc(str(ev.s, 160)), str(ev.c, 30).replace(/[^a-z -]/g, ''));
        return;
      case 'ts':
        if (fromHost && here) G.ui.toast(esc(str(ev.x, 200)), 'info', 3500);
        return;
      case 'say':
        if (fromHost && here) G.ui.subtitle(str(ev.w, 40), str(ev.x, 400), /^#[0-9a-fA-F]{3,6}$/.test(ev.c) ? ev.c : '#e8c070');
        return;
      case 'bye': // leaving on purpose (not a dropped connection)
        if (fromHost) this.s.end('host_left');
        else this.removeAvatar(from.uid);
        return;
      case 'cmb':
        if (fromHost && ev.to === UID && typeof ev.n === 'string') { G.ui.combo(esc(str(ev.n, 30))); G.audio.sfx('combo'); }
        return;
      // ---- guests -> host
      default:
        if (this.isHost && !fromHost) this.onGuestEvent(ev, from);
    }
  }

  puppetsOn() { return this.puppets.size > 0 || (this.E && this.E.z === G.zone?.name && !G.minigame); }

  onGuestEvent(ev, from) {
    const house = from.house;
    if (ev.k === 'pts') {
      const h = cleanHouse(ev.h), n = int(ev.n, -50, 300);
      if (!h || !n) return;
      G.story.addPoints(h, n, null, true);
      const reason = str(ev.r, 60);
      if (reason && n > 0) G.ui.toast(`<b>${esc(from.name)}</b>: +${n} to ${HOUSES[h].name} <i>· ${esc(reason)}</i>`, 'points', 3200);
      return;
    }
    if (ev.k === 'col') {
      const kind = ev.kind === 'card' ? 'card' : ev.kind === 'bean' ? 'bean' : null;
      const i = int(ev.i, -1, 29, -1);
      if (kind && i >= 0) G.story.collectRemote(kind, i, house, from.name);
      return;
    }
    // everything else touches an enemy in my zone
    if (from.zone !== G.zone?.name) return;
    const e = G.enemies.list.find((x) => x.id === ev.e && x.alive && !x.remote);
    if (!e) return;
    this.credit = house;
    try {
      if (ev.k === 'hit') {
        if (!SPELL_WORD.test(ev.s)) return;
        const canon = canonSpell(ev.s), dv = vec(ev.dir, 2);
        if (!canon) return;
        const def = { ...canon, dmg: canon.dmg * num(ev.m, 0.3, 4.5, 1), enemy: false };
        const combo = G.spells.remoteHit(def, e, dv ? v3(dv).setY(0).normalize() : new THREE.Vector3(), house);
        if (combo) this.send({ k: 'cmb', to: from.uid, n: combo });
      } else if (ev.k === 'th') {
        const spell = SPELL_WORD.test(ev.spell) ? ev.spell : 'thrown';
        const dv = vec(ev.dir, 2);
        e.takeHit({ dmg: num(ev.dmg, 0, 600), spell, splash: !!ev.splash, combo: !!ev.combo, dir: dv ? v3(dv) : null, remote: true });
        const stun = num(ev.stun, 0, 5);
        if (stun && e.alive) e.status.stun = Math.max(e.status.stun || 0, stun);
      } else if (ev.k === 'end') {
        if (e.status.lifted > 0) e.endLift(!!ev.slam);
      } else if (ev.k === 'thr') {
        const v = vec(ev.v, 60);
        if (v && e.status.lifted > 0) e.throwTo(v3(v));
      } else if (ev.k === 'lum') {
        const fp = vec(ev.from);
        e.onLumos(num(ev.d, 0, 20), fp ? v3(fp) : null);
      } else if (ev.k === 'pat') {
        e.onPatronus();
      }
    } finally { this.credit = null; }
  }

  // ------------------------------------------------------------ connection state
  onStatus(st, info) {
    if (st === 'reconnecting') {
      if (!this.reconnecting) G.ui.toast('Connection lost. Reconnecting…', 'info', 3000);
      this.reconnecting = true;
      if (this.isGuest) this.clearPuppets();
    } else if (st === 'open' && this.reconnecting) {
      this.reconnecting = false;
      this.pubT = 0;
      G.ui.toast('Reconnected!', 'info', 2200);
    }
  }
  onEnded(reason) {
    if (G.net !== this) { this.dispose(); return; }
    if (reason === 'left') return;
    if (this.isGuest) { leaveWorld(reasonText(reason)); return; }
    G.net = null;
    this.dispose();
    G.ui.toast(`${reasonText(reason)} You can host again from the pause menu.`, 'info', 6000);
  }

  // HUD pill: who's here and the connection state
  updatePill() {
    if (!this.pill) {
      this.pill = document.createElement('div');
      this.pill.className = 'net-pill';
      (document.querySelector('#hud .hud-tr') || document.getElementById('hud'))?.appendChild(this.pill);
      this.pillKey = '';
    }
    const names = [...this.avatars.values()].filter((a) => a.uid !== this.hostUid).map((a) => a.name);
    let txt;
    if (this.reconnecting) txt = 'Reconnecting…';
    else if (this.isHost) txt = names.length ? `Hosting · ${names.join(', ')}` : 'Hosting · waiting for friends';
    else txt = `${this.hostName}’s world${names.length ? ' · ' + names.join(', ') : ''}${this.hostAvatar?.away ? ' · host away' : ''}`;
    if (txt !== this.pillKey) { this.pillKey = txt; this.pill.innerHTML = `<i class="dot${this.reconnecting ? ' warn' : ''}"></i>${esc(txt)}`; }
  }

  // leave the room, saying goodbye first so the others don't wait for a reconnect
  close() {
    if (this.entered && !this.s.ended) { this.s.send({ k: 'bye' }); this.s.flush(0, true); }
    this.dispose();
    this.s.leave();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const a of this.avatars.values()) a.dispose();
    this.avatars.clear();
    this.proxies_.clear();
    if (this.isGuest) this.clearPuppets();
    this.pill?.remove();
    this.pill = null;
  }

  // ------------------------------------------------------------ guest: wait for the host, then step in
  waitForHost(ms = 10000) {
    return new Promise((resolve, reject) => {
      const t0 = performance.now();
      const iv = setInterval(() => {
        if (this.s.ended) { clearInterval(iv); reject(new Error(this.s.status === 'ended' ? 'lost' : 'disconnected')); return; }
        if (this.hostData && this.W) { clearInterval(iv); resolve(); return; }
        if (performance.now() - t0 > ms) { clearInterval(iv); reject(new Error('nohost')); }
      }, 100);
    });
  }

  // a spot next to the host (where they last stood on solid ground)
  spotNearHost() {
    const d = this.hostData;
    const gp = Array.isArray(d?.gp) && ZONES.includes(d.gp[0]) ? d.gp : null;
    const zone = gp ? gp[0] : ZONES.includes(d?.z) ? d.z : 'greatHall';
    const Z = G.world.zones[zone];
    let pos = null, yaw = 0;
    if (gp && [gp[1], gp[2], gp[3]].every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 5000)) {
      yaw = num(gp[4], -10, 10);
      const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(1.6);
      pos = new THREE.Vector3(gp[1], gp[2], gp[3]).add(side);
      const g = Z.colliders.ground(pos.x, pos.z, pos.y + 1.5);
      if (Math.abs(g.y - gp[2]) > 1.2) pos.set(gp[1], gp[2], gp[3]);
      else pos.y = g.y;
    }
    return { zone, entry: pos ? { pos, yaw } : null };
  }

  async enterAsGuest() {
    const W = this.W;
    G.quitting = false;
    G.ui.closeAll();
    await G.ui.fade(1, 0.4);
    G.minigame = null;
    G.enemies.clearZone();
    const own = this.ident;
    const s = { ...newSave(), started: true, name: own.name, look: { ...own.look }, house: own.house, best: { ...(own.best || {}) }, potions: { ...(own.potions || {}) } };
    s.spells = [...new Set([...(own.spells || []), 'stupefy', 'protego', 'lumos'])].filter((id) => SPELL_BY_ID[id]);
    G.save = s;
    G.spells.unlocked = new Set(s.spells);
    this.entered = true;
    this.applyWorld(W, true);
    G.story.syncStage(G.save.stage);
    G.story.rebuildCollectibles();
    const P = G.player;
    P.flying = false; P.control = true; P.status.override = null; P.alive = true; P.hp = P.maxHp; P.mana = P.maxMana;
    P.rebuild();
    P.root.visible = true;
    if (P.root.parent !== G.scene) { P.root.parent?.remove(P.root); G.scene.add(P.root); }
    const spot = this.spotNearHost();
    G.world.setZone(spot.zone, spot.entry);
    G.cam.setCinematic(null);
    G.cam.snap();
    G.mode = 'play';
    G.paused = false;
    G.ui.refreshHUD();
    G.ui.showHUD(true);
    this.pubT = 0;
    await G.ui.fade(0, 0.6);
    G.ui.toast(`Welcome to <b>${esc(this.hostName)}</b>’s world!`, 'quest', 4000);
    setTimeout(() => G.net === this && G.ui.toast(`${esc(this.hostName)} leads the story. Fight beside them, explore on your own, and earn points for your house.`, 'tip', 6000), 2500);
  }

  // guest: jump to wherever the host is
  async travelToHost() {
    if (!this.isGuest || G.world.transitioning || G.minigame) return;
    const spot = this.spotNearHost();
    G.world.transitioning = true;
    await G.ui.fade(1, 0.35);
    G.enemies.clearZone();
    G.world.setZone(spot.zone, spot.entry);
    G.cam.snap();
    await G.ui.fade(0, 0.45);
    G.world.transitioning = false;
    G.ui.toast(G.world.zones[spot.zone].label, 'zone');
  }
}

// ================================================================== flows (called from the menus)
let busy = false;

export async function hostWorld() {
  if (G.net || busy) return;
  busy = true;
  G.ui.toast('Opening your world to friends…', 'info', 2500);
  let s = null;
  try {
    const lib = await loadMiniRooms();
    s = new Session(lib, { uid: UID, name: G.save.name });
    const coop = new Coop(s, 'host');
    await s.host(`${G.save.name}’s world`);
    if (G.mode === 'menu' || G.quitting) { s.leave(); return; } // quit to the title meanwhile
    G.net = coop;
    G.ui.toast('<b>Your world is open!</b> Friends can now choose <b>Join Online World</b> on the title screen.', 'quest', 6500);
  } catch (e) {
    s?.leave();
    G.ui.toast(`Couldn’t open your world. ${reasonText(e?.message)} Please try again in a moment.`, 'info', 5500);
  } finally { busy = false; }
}

export function stopHosting(quiet) {
  const c = G.net;
  if (!c || !c.isHost) return;
  G.net = null;
  c.close();
  if (!quiet) G.ui.toast('Your world is closed to visitors.', 'info', 3000);
}

// the whole join flow from the title screen
export async function joinWorld(room, { openCustomize, pickHouse, backToTitle, connecting }) {
  if (G.net || busy) return;
  busy = true;
  let s = null, cancelled = false, panel = null;
  try {
    const own = loadSave();
    let ident = own?.started && own.house ? { name: own.name, look: own.look, house: own.house, spells: own.spells, best: own.best, potions: own.potions } : null;
    if (!ident) {
      // a new player: make a student first
      G.save = newSave();
      G.player.rebuild();
      const look = await openCustomize();
      if (!look) { backToTitle(); return; }
      const house = await pickHouse();
      if (!house) { backToTitle(); return; }
      ident = { name: G.save.name, look: G.save.look, house, spells: [] };
    }
    panel = connecting(`Joining ${esc(room.title)}…`, () => { cancelled = true; s?.leave(); });
    const lib = await loadMiniRooms();
    if (cancelled) return;
    s = new Session(lib, { uid: UID, name: ident.name });
    const coop = new Coop(s, 'guest', ident);
    await s.join(room.id);
    if (cancelled) { s.leave(); return; }
    await coop.waitForHost(10000);
    if (cancelled) { s.leave(); return; }
    panel.close();
    panel = null;
    G.net = coop;
    await coop.enterAsGuest();
  } catch (e) {
    s?.leave();
    if (G.net && G.net.s === s) { G.net.dispose(); G.net = null; }
    panel?.close();
    if (!cancelled) backToTitle(`Couldn’t join that world. ${reasonText(e?.message)}`);
  } finally { busy = false; }
}

// guest: back to the title (by choice, or because the world closed)
let leaveHooks = null;
export function setLeaveHooks(h) { leaveHooks = h; }
export function leaveWorld(message) {
  const c = G.net;
  if (!c || !c.isGuest) return;
  G.net = null;
  c.close();
  leaveHooks?.(message);
}

// title screen: watch for open worlds. cb(rooms | null on error). Returns stop().
export function watchWorlds(cb) {
  let stopped = false, timer = null;
  const t0 = performance.now();
  const tick = async () => {
    if (stopped) return;
    if (!document.hidden) {
      let rooms = null;
      try { rooms = await listWorlds(); } catch { rooms = null; }
      if (stopped) return;
      try { cb(rooms); } catch (e) { console.error(e); }
    }
    // every 5 s for the first few minutes, then every 20 s (each check costs a relay request)
    timer = setTimeout(tick, performance.now() - t0 < 180000 ? 5000 : 20000);
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}
