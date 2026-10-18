// World events: occasional, announced happenings in the open world (run by
// the spawn director, game.spawns.events). One at a time; the first comes a
// minute or two after arriving, then every few minutes (sooner at night).
// Each is announced with a big toast, a red beam and a screen-edge ping with
// the distance, a ⚠ on the minimap and a progress banner. Kinds:
//   civilians  "A curse is attacking civilians!" (cities with a crowd): a pack
//              among the people, who panic (game.crowd.alarm) until it is exorcised
//   curtain    "A curtain has descended": step inside the small curtain and
//              survive three waves without leaving it
//   special    "Special Grade sighting": a rare named elite roams the region
//              (its health bar shows when you close in); it flees after a while
//   womb       "A cursed womb is hatching": break the womb before it hatches,
//              or fight what comes out
//   raid       (Culling Game colonies) rival players raid you: spawned through
//              cullingGame.js's live colony (liveColony().spawnPlayer), points as usual
// Rewards: coins, XP and a loot roll (world/cursedObject.js grantReward).
// Events never start inside the active in-world mission zone (game.worldMission.zone),
// inside a game.spawns.suppress(zone) zone, or while you stand in the mission zone.
//
//   events.start(kind, o?) -> the event (or null)   (tests / quests can force one)
//   events.cur                                      the running event { kind, title, pos, r, phase }
//   events.end(ok, msg)                             finish it now
import * as THREE from 'three/webgpu';
import { CursedObject, grantReward, Ping, Banner } from './cursedObject.js';
import { liveColony } from './cullingGame.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// region flavour: which events happen where (weights) and what they are called
const REGION_EVENTS = {
  jujutsu_high: { civilians: 0, curtain: 0.8, special: 1, womb: 1 },
  cursed_forest: { curtain: 0.8, special: 1.1, womb: 1.4 },
  okinawa_coast: { curtain: 0.9, special: 1, womb: 1.2 },
  kyoto: { curtain: 1.1, special: 1.1, womb: 0.8 },
  shibuya: { civilians: 1.6, curtain: 1.2, special: 0.8, womb: 0.6 },
  shinjuku: { civilians: 1.3, curtain: 1, special: 1, womb: 0.7 },
  colony_tokyo1: { raid: 1.6, curtain: 0.7, special: 1, womb: 0.5 },
  colony_sendai: { raid: 1.4, curtain: 0.7, special: 1.1, womb: 0.6 },
  colony_sakurajima: { raid: 1.5, curtain: 0.7, special: 1, womb: 0.6 },
};
const SPECIAL = {
  jujutsu_high: [{ kind: 'serpent', name: 'The Takao Mountain Serpent' }, { kind: 'gravekeeper', name: 'The Shrine-Path Grave Deity' }],
  cursed_forest: [{ kind: 'serpent', name: 'Old Coil, the Rainbow Serpent' }, { kind: 'summoner', name: 'The Brood Mother of the Deep Woods' }],
  okinawa_coast: [{ kind: 'serpent', name: 'The Reef Serpent' }, { kind: 'healer', name: 'The Drowned Bodhisattva' }],
  kyoto: [{ kind: 'longneck', name: 'The Bamboo Slit-Mouth' }, { kind: 'lantern', name: 'The Thousand-Torii Lantern' }],
  shibuya: [{ kind: 'longneck', name: 'The Slit-Mouth of Dogenzaka' }, { kind: 'shadow', name: 'The Station Stalker' }],
  shinjuku: [{ kind: 'gravekeeper', name: 'The Levelled District\'s Grave Deity' }, { kind: 'tank', name: 'The Skyscraper Bulwark' }],
  colony_tokyo1: [{ kind: 'teleporter', name: 'The Colony Phantom' }, { kind: 'summoner', name: 'The Ruins Brood Mother' }],
  colony_sendai: [{ kind: 'serpent', name: 'The Sendai Sky Serpent' }, { kind: 'tank', name: 'The Castle Bulwark' }],
  colony_sakurajima: [{ kind: 'healer', name: 'The Ash Bodhisattva' }, { kind: 'serpent', name: 'The Volcano Serpent' }],
};
const FLAVOUR = {
  civilians: { title: 'A curse is attacking civilians!', icon: '⚠' },
  curtain: { title: 'A curtain has descended', icon: '⬛' },
  special: { title: 'Special Grade sighting', icon: '☠' },
  womb: { title: 'A cursed womb is hatching', icon: '🥚' },
  raid: { title: 'Rival players are raiding!', icon: '⚔' },
};
const WOMB_TEXT = { okinawa_coast: 'Cursed eggs have washed up on the shore', cursed_forest: 'A cursed womb pulses among the roots', colony_sakurajima: 'A womb festers in the ash', jujutsu_high: 'A cursed womb pulses in the mountain woods' };
const RAIDERS = { colony_sakurajima: ['hei', 'hei', 'hei_archer'], colony_sendai: ['brawler', 'caster', 'revenant', 'lancer'], colony_tokyo1: ['brawler', 'gang', 'caster', 'blinker'] };

export class WorldEvents {
  constructor(dir) {
    this.dir = dir; this.game = dir.game; this.rid = dir.rid;
    this.cur = null;
    this.t = 70 + Math.random() * 60;
    this.done = 0;
  }
  weights() {
    const g = this.game, W = { ...(REGION_EVENTS[this.rid] ?? { curtain: 1, special: 1, womb: 1 }) };
    if (!g.crowd) delete W.civilians;
    if (!liveColony()) delete W.raid;
    return Object.entries(W).filter(([, w]) => w > 0);
  }
  update(dt) {
    if (this.cur) { this.tick(dt); return; }
    this.t -= dt * (1 + this.dir.night * 0.7);
    if (this.t > 0) return;
    this.t = 150 + Math.random() * 120;
    const W = this.weights(); if (!W.length) return;
    const tw = W.reduce((a, b) => a + b[1], 0); let x = Math.random() * tw, kind = W[0][0];
    for (const [k, w] of W) { x -= w; if (x <= 0) { kind = k; break; } }
    if (!this.start(kind)) this.t = 25;
  }
  idle() { this.ping?.update(); }
  leadInMission() {
    const g = this.game, z = g.worldMission?.zone, lead = this.dir.lead();
    return !!(z && lead && Math.hypot(lead.pos.x - z.x, lead.pos.z - z.z) < (z.r ?? 12) + 10);
  }
  spot(rMin = 26, rMax = 48, o = {}) {
    const lead = this.dir.lead(); if (!lead) return null;
    // near first; then further out (a town or a camp can fill the near ring)
    return this.dir.findSpot(lead.pos, rMin, rMax, { offscreen: false, minHero: rMin, tries: 40, dy: 7, ...o })
      ?? this.dir.findSpot(lead.pos, rMax, rMax + 30, { offscreen: false, minHero: rMin, tries: 40, dy: 12, ...o });
  }
  start(kind, o = {}) {
    if (this.cur || !this.dir.lead() || this.leadInMission()) return null;
    const fn = this['start_' + kind]; if (!fn) return null;
    let ev = null;
    try { ev = fn.call(this, o); } catch (e) { console.warn('world event', kind, e); ev = null; }
    if (!ev) return null;
    ev.kind = kind; ev.t = 0; ev.title ??= FLAVOUR[kind].title;
    this.cur = ev;
    if (ev.zone) this.dir.suppress(ev.zone);
    this.ping = new Ping(this.game, { icon: FLAVOUR[kind].icon });
    this.ping.set(ev.pos, ev.short ?? '');
    this.banner = new Banner();
    this.game.toast?.(`${FLAVOUR[kind].icon} ${ev.title}`, 'big');
    if (ev.sub) setTimeout(() => this.cur === ev && this.game.toast?.(ev.sub), 900);
    this.game.audio?.energy?.('summon');
    return ev;
  }
  tick(dt) {
    const ev = this.cur; ev.t += dt;
    ev.enemies = (ev.enemies ?? []).filter((e) => !e.dead && this.game.enemies.includes(e));
    try { ev.tick(dt); } catch (e) { console.warn('world event tick', e); this.end(false); return; }
    if (!this.cur) return;
    if (ev.follow) { const f = ev.follow(); if (f) { ev.pos.copy(f); this.ping.set(ev.pos, ev.short ?? ''); } }
    this.ping?.update();
    this.banner?.set(ev.status?.() ?? ev.title);
  }
  // all event enemies dead (killed or gone)? counts kills via hp <= 0
  track(list) { const ev = this.cur; for (const e of list) { e.worldEvent = ev?.kind ?? true; e.roamer = true; } (ev.enemies ??= []).push(...list); return list; }
  end(ok, msg) {
    const ev = this.cur; if (!ev) return;
    this.cur = null; this.done++;
    try { ev.cleanup?.(ok); } catch (e) { console.warn('event cleanup', e); }
    if (ev.zone) this.dir.release(ev.zone);
    this.ping?.dispose(); this.ping = null;
    this.banner?.dispose(); this.banner = null;
    if (this.game.hud?.bossRef && ev.boss && this.game.hud.bossRef === ev.boss) this.game.hud.setBoss(null);
    if (ok) {
      const pos = ev.rewardAt?.() ?? ev.pos;
      grantReward(this.game, pos, ev.reward ?? { coins: 20, xp: 50 });
      this.game.toast?.(`✔ ${msg ?? ev.win ?? 'Event complete'}`, 'big');
      this.game.audio?.levelUp?.();
    } else {
      // the leftovers slink away
      for (const e of ev.enemies ?? []) if (!e.dead) { this.dir.list.push(e); e.ambient = true; }
      this.game.toast?.(msg ?? ev.lose ?? 'The event is over');
    }
    this.t = 150 + Math.random() * 120;
  }
  dispose() {
    if (this.cur) { const ev = this.cur; this.cur = null; try { ev.cleanup?.(false); } catch (e) { /* level gone */ } if (ev.zone) this.dir.release(ev.zone); }
    this.ping?.dispose(); this.ping = null;
    this.banner?.dispose(); this.banner = null;
  }
  far(pos, r) { return this.dir.heroes().every((p) => Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) > r); }
  anyIn(z) { return this.dir.heroes().some((p) => Math.hypot(p.pos.x - z.x, p.pos.z - z.z) < z.r); }
  pack(at, kinds, o = {}) { return this.track(this.dir.raise(kinds, at, { level: o.level ?? this.dir.level, elite: o.elite ?? null, capBonus: 6, spread: o.spread ?? 3, noBlock: true, tag: o.tag })); }
  local(n) { const K = this.dir.kindsAt(this.cur?.pos?.x ?? 0, this.cur?.pos?.z ?? 0); return this.dir.compose(K.list, n) ?? Array(n).fill('swarmer'); }

  // ---------------------------------------------------------------- civilians
  start_civilians() {
    const g = this.game, crowd = g.crowd; if (!crowd) return null;
    const lead = this.dir.lead();
    let at = null;
    const people = (crowd.agents ?? []).filter((a) => a.on && Math.hypot(a.x - lead.pos.x, a.z - lead.pos.z) > 22 && Math.hypot(a.x - lead.pos.x, a.z - lead.pos.z) < 50);
    for (let i = 0; i < 12 && people.length && !at; i++) { const a = people[Math.floor(Math.random() * people.length)]; at = this.dir.floorAt(a.x, a.z, { margin: 2 }); }
    at ??= this.spot(24, 46);
    if (!at) return null;
    const ev = { pos: at.clone(), short: 'civilians', phase: 'fight', win: 'The civilians are safe', lose: 'The curses slipped away into the streets', reward: { coins: 24 + this.dir.level * 4, xp: 50 + this.dir.level * 10, loot: Math.random() < 0.5 ? 'rare' : 'common', power: this.dir.level - 1 } };
    const K = this.dir.kindsAt(at.x, at.z);
    const kinds = this.dir.compose(K.list, 4 + (this.dir.night > 0.5 ? 1 : 0)) ?? ['transfigured', 'transfigured', 'swarmer', 'swarmer'];
    this.cur = ev; ev.enemies = []; this.pack(at, kinds, { level: K.level, elite: Math.random() < 0.3 }); this.cur = null;
    const total = ev.enemies.length; if (!total) return null;
    let alarmT = 0;
    ev.follow = () => { const live = ev.enemies.filter((e) => !e.dead); if (!live.length) return null; const c = V(0, 0, 0); for (const e of live) c.add(e.pos); return c.divideScalar(live.length); };
    ev.tick = (dt) => {
      if ((alarmT -= dt) <= 0) { alarmT = 1; g.crowd?.alarm?.(ev.pos, 16); }
      if (!ev.enemies.length) { this.end(true); return; }
      if (ev.t > 160 && this.far(ev.pos, 40)) this.end(false);
    };
    ev.status = () => `${FLAVOUR.civilians.icon} Save the civilians · curses left: ${ev.enemies.length} / ${total}`;
    return ev;
  }

  // ---------------------------------------------------------------- curtain defence
  start_curtain() {
    const at = this.spot(24, 44); if (!at) return null;
    const g = this.game, zone = { x: at.x, z: at.z, r: 8 };
    const ev = { pos: at.clone(), zone, short: 'curtain', phase: 'waiting', wave: 0, waves: 3, outT: 0, win: 'The curtain lifts — you held out', lose: 'The curtain lifted', reward: { coins: 30 + this.dir.level * 5, xp: 80 + this.dir.level * 15, loot: Math.random() < 0.6 ? 'rare' : 'common', power: this.dir.level } };
    ev.sub = 'Step inside the curtain and survive the curses within';
    // the curtain: a dark translucent dome with a glowing rim
    const grp = new THREE.Group(); grp.position.copy(at);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(zone.r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: 0x08040c, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
    const rimM = new THREE.MeshBasicNodeMaterial(); rimM.color = new THREE.Color(0x6a2aff).multiplyScalar(2);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(zone.r, 0.09, 6, 64).rotateX(Math.PI / 2), rimM); rim.position.y = 0.1;
    dome.castShadow = false; grp.add(dome, rim);
    g.scene.add(grp); (g.hubProps ??= []).push(grp);
    let waveT = 0;
    const spawnWave = () => {
      ev.wave++;
      const n = 2 + ev.wave + (this.dir.night > 0.5 ? 1 : 0);
      const kinds = this.local(n);
      for (let i = 0; i < kinds.length; i++) {
        const a = Math.random() * Math.PI * 2, r = zone.r * (0.55 + Math.random() * 0.3);
        const v = this.dir.floorAt(zone.x + Math.cos(a) * r, zone.z + Math.sin(a) * r, { noBlock: true, nearY: at.y, reach: 3 }) ?? at.clone();
        this.pack(v, [kinds[i]], { elite: ev.wave === ev.waves && i === 0 ? true : null, spread: 0.6 });
      }
      g.toast?.(`Curtain · wave ${ev.wave} / ${ev.waves}`);
    };
    ev.tick = (dt) => {
      rim.rotation.y += dt * 0.4;
      if (ev.phase === 'waiting') {
        if (this.anyIn(zone)) { ev.phase = 'waves'; dome.material.opacity = 0.45; spawnWave(); }
        else if (ev.t > 180) this.end(false, 'The curtain lifted before anyone entered');
        return;
      }
      // keep the curses in: one that strays outside is pulled back to the middle
      for (const e of ev.enemies) { e.home.set(zone.x, e.pos.y, zone.z); if (Math.hypot(e.pos.x - zone.x, e.pos.z - zone.z) > zone.r + 1.5) { e.aggro = true; } }
      ev.outT = this.anyIn(zone) ? 0 : ev.outT + dt;
      if (ev.outT > 8) { this.end(false, 'You left the curtain — the curses escaped'); return; }
      if (!ev.enemies.length) {
        if (ev.wave >= ev.waves) { this.end(true); return; }
        waveT += dt; if (waveT > 3) { waveT = 0; spawnWave(); }
      }
    };
    ev.status = () => ev.phase === 'waiting' ? `${FLAVOUR.curtain.icon} A curtain has descended · step inside` : `${FLAVOUR.curtain.icon} Curtain defence · wave ${ev.wave} / ${ev.waves} · curses left ${ev.enemies.length}${ev.outT > 0 ? ` · get back inside! ${Math.ceil(8 - ev.outT)}` : ''}`;
    ev.cleanup = () => { g.scene.remove(grp); dome.geometry.dispose(); rim.geometry.dispose(); };
    return ev;
  }

  // ---------------------------------------------------------------- special grade sighting
  start_special(o = {}) {
    const at = this.spot(34, 52, { offscreen: true }) ?? this.spot(26, 46); if (!at) return null;
    const list = SPECIAL[this.rid] ?? [{ kind: 'serpent', name: 'A Wandering Special Grade' }];
    const s = o.spec ?? list[Math.floor(Math.random() * list.length)];
    const g = this.game, lv = this.dir.level + 1;
    const ev = { pos: at.clone(), short: s.name, phase: 'hunt', win: `${s.name} exorcised`, lose: `${s.name} has fled`, reward: { coins: 40 + lv * 6, xp: 120 + lv * 20, loot: Math.random() < 0.25 ? 'unique' : 'rare', power: lv } };
    ev.title = `Special Grade sighting: ${s.name}`;
    this.cur = ev; ev.enemies = [];
    const [boss] = this.pack(at, [s.kind], { level: lv, elite: ['armored', 'vampiric', 'swift'][Math.floor(Math.random() * 3)] });
    if (!boss) { this.cur = null; return null; }
    boss.maxHp *= 3.2; boss.hp = boss.maxHp; boss.displayName = `★ ${s.name}`; boss.specialGrade = true;
    this.pack(at, this.local(2), { level: this.dir.level, spread: 3 });
    this.cur = null;
    // it roams: its home drifts along a loop
    const pts = [at.clone()];
    for (let i = 0; i < 4; i++) { const p = pts[pts.length - 1]; for (let t = 0; t < 8; t++) { const a = Math.random() * Math.PI * 2, d = 14 + Math.random() * 18; const v = this.dir.floorAt(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d); if (v && Math.abs(v.y - p.y) < 3) { pts.push(v); break; } } }
    const home = at.clone(); let wp = 1 % pts.length, farT = 0;
    ev.boss = boss;
    ev.follow = () => (boss.dead ? null : boss.pos);
    ev.tick = (dt) => {
      if (boss.dead || !g.enemies.includes(boss)) {
        if (boss.hp <= 0) this.end(true); else this.end(false);
        return;
      }
      const lead = this.dir.lead();
      const d = lead ? lead.pos.distanceTo(boss.pos) : 99;
      if (!boss.aggro && pts.length > 1) {
        const to = pts[wp], dx = to.x - home.x, dz = to.z - home.z, dd = Math.hypot(dx, dz);
        if (dd < 1.5) wp = (wp + 1) % pts.length; else { home.x += dx / dd * Math.min(dd, dt * 1.2); home.z += dz / dd * Math.min(dd, dt * 1.2); }
        for (const e of ev.enemies) e.home.set(home.x + (e.packOff?.x ?? 0), e.pos.y, home.z + (e.packOff?.z ?? 0));
      }
      if (d < 22 && g.hud?.bossRef !== boss) g.hud?.setBoss(boss);
      else if (d > 34 && g.hud?.bossRef === boss) g.hud.setBoss(null);
      farT = d > 75 ? farT + dt : 0;
      if ((ev.t > 240 && !boss.aggro) || farT > 25) { this.end(false); }
    };
    ev.status = () => `${FLAVOUR.special.icon} Hunt ${s.name}${boss.aggro ? ` · ${Math.max(0, Math.round(boss.hp / boss.maxHp * 100))}%` : ''}`;
    ev.rewardAt = () => boss.pos.clone();
    ev.cleanup = (ok) => {
      if (!ok && !boss.dead) { boss.dead = true; boss.deathT = 0; g.fx?.blinkPuff?.(boss.pos, 0x8a3aff); }
      if (g.hud?.bossRef === boss) g.hud.setBoss(null);
    };
    return ev;
  }

  // ---------------------------------------------------------------- cursed womb
  start_womb() {
    const at = this.spot(24, 44); if (!at) return null;
    const g = this.game, lv = this.dir.level;
    const ev = { pos: at.clone(), short: 'womb', phase: 'womb', hatchIn: 50, win: 'The cursed womb is destroyed', lose: 'The hatchlings scattered', reward: { coins: 26 + lv * 5, xp: 70 + lv * 12, loot: Math.random() < 0.5 ? 'rare' : 'common', power: lv } };
    ev.title = WOMB_TEXT[this.rid] ? `${WOMB_TEXT[this.rid]} — it's hatching!` : FLAVOUR.womb.title;
    ev.sub = 'Break the womb before it hatches';
    this.cur = ev; ev.enemies = [];
    this.pack(at, ['embryo', 'embryo', ...this.local(1)], { level: lv, spread: 3.5 });
    this.cur = null;
    let alive = () => ev.enemies.filter((e) => !e.dead).length;
    const womb = new CursedObject(g, { pos: at, hp: 140 + lv * 70, look: 'womb', name: 'Cursed Womb', shielded: () => false, interact: false, onBreak: () => { ev.broken = true; } });
    (g.hubProps ??= []).push(womb.object);
    ev.tick = (dt) => {
      if (ev.phase === 'womb') {
        if (ev.broken) { if (!alive()) { this.end(true); return; } ev.phase = 'mop'; return; }
        if (ev.t > ev.hatchIn) {
          ev.phase = 'hatched';
          womb.shatter(null);
          ev.reward = { coins: 18 + lv * 4, xp: 50 + lv * 8, loot: 'common', power: lv - 1 };
          ev.win = 'The hatchlings are exorcised';
          this.cur = ev;
          this.pack(at, ['summoner', 'imp', 'imp', 'imp', 'swarmer'], { level: lv, elite: this.dir.night > 0.5 ? true : null, spread: 3 });
          g.toast?.('The womb hatched!', 'big');
          for (const e of ev.enemies) e.aggro = true;
        } else if (ev.t > 160 && this.far(ev.pos, 70)) { this.end(false, 'The womb sank back into the ground'); }
        return;
      }
      if (!alive()) { this.end(true); return; }
      if (ev.t > 260 && this.far(ev.pos, 60)) this.end(false);
    };
    ev.status = () => ev.phase === 'womb' ? `${FLAVOUR.womb.icon} Break the cursed womb · hatches in ${Math.max(0, Math.ceil(ev.hatchIn - ev.t))} s` : `${FLAVOUR.womb.icon} Exorcise the hatchlings · ${alive()} left`;
    ev.cleanup = () => { if (!womb.dead) womb.remove(); };
    return ev;
  }

  // ---------------------------------------------------------------- Culling Game raid
  start_raid() {
    const cg = liveColony(); if (!cg || cg.game !== this.game || cg.disposed) return null;
    const at = this.spot(22, 32, { offscreen: true }) ?? this.spot(20, 30); if (!at) return null;
    const g = this.game, lv = this.dir.level;
    const roster = RAIDERS[this.rid] ?? ['brawler', 'caster', 'blinker'];
    const ev = { pos: at.clone(), short: 'raiders', phase: 'raid', win: 'The raid is beaten back', lose: 'The raiders withdrew', reward: { coins: 30 + lv * 5, xp: 70 + lv * 10, loot: Math.random() < 0.4 ? 'rare' : 'common', power: lv } };
    const n = 3 + (this.dir.night > 0.5 ? 1 : 0);
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, r = 2.5;
      const v = this.dir.floorAt(at.x + Math.cos(a) * r, at.z + Math.sin(a) * r, { noBlock: true, nearY: at.y, reach: 3 }) ?? at.clone();
      const e = cg.spawnPlayer(roster[i % roster.length], v, { level: lv, elite: i === 0 ? 'armored' : null });
      if (e) { e.aggro = true; list.push(e); }
    }
    if (!list.length) return null;
    this.cur = ev; this.track(list); this.cur = null;
    try { cg.say?.(`A raid! ${list.length} players are coming for your points!`, 2.6); } catch (e) { /* kogane busy */ }
    const total = list.length;
    ev.follow = () => { const live = ev.enemies.filter((e) => !e.dead); if (!live.length) return null; return live[0].pos; };
    ev.tick = () => {
      if (!ev.enemies.length) { const killed = list.filter((e) => e.hp <= 0).length; if (killed >= Math.ceil(total / 2)) this.end(true); else this.end(false); return; }
      if (ev.t > 200) this.end(false);
    };
    ev.status = () => `${FLAVOUR.raid.icon} Raid · players left ${ev.enemies.length} / ${total}`;
    return ev;
  }
}
