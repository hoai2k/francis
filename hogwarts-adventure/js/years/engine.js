// Runs a school year (Year 2 onward): a main line of quests, each a short list of
// steps, plus optional side quests. Steps:
//   talk     { npc, lines, choices?, place?: [zone, pos, yaw] }      talk to someone
//   go       { zone, pos, r, lines?, cine? }                          reach a place
//   fight    { zone, at?, r?, spawn: (Y) => enemies, intro? }         clear an encounter
//   minigame { npc?, id, opts, pass: (r) => bool, lines?, retry? }    play a minigame
//   puzzle   { ids: [...] }                                           solve puzzles
//   collect  { zone, items: [pos...], label }                         pick things up
//   script   { run: async (Y) => {} }                                 anything else
// Every step has obj (objective text) and optional enter(Y) / done(Y) hooks.
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from '../state.js';
import { writeSave, autoSave } from '../save.js';
import { addXP, sendOwl, YEARS } from '../progress.js';
import { addCoins } from '../items.js';
import { runMinigame } from '../minigames/index.js';
import { glyph } from '../input.js';
import { makeCard } from '../models.js';
import { postFlash } from '../engine.js';
import { rand, sleep } from '../util.js';

export class YearEngine {
  constructor(def) {
    this.def = def;
    this.n = def.n;
    this.spawned = false;
    this.items = [];
    this.encounter = null;
    this.stepStarted = -1;
    if (!G.save.flags[`y${def.n}`]) G.save.flags[`y${def.n}`] = {};
    this.F = G.save.flags[`y${def.n}`];
    this.F.side ||= {};
  }
  get qi() { return G.save.yq || 0; }
  get quest() { return this.def.quests[this.qi]; }
  get si() { return this.F.step || 0; }
  get step() { return this.quest?.steps[this.si]; }
  fraction() { return Math.min(1, (this.qi + this.si / Math.max(1, this.quest?.steps.length || 1)) / this.def.quests.length); }

  // ------------------------------------------------------------ lifecycle
  start(fresh) {
    if (fresh) { G.save.yq = 0; this.F.step = 0; this.letter(); }
    this.def.setup?.(this);
    this.enterStep();
  }
  letter() {
    const q = this.quest;
    if (!q) return;
    sendOwl(`y${this.n}-q${this.qi}`, q.from || 'Headmistress Aldmoor', q.title, q.letter || q.steps[0]?.obj || q.title, { quest: true });
  }
  objective() {
    const q = this.quest;
    if (!q) return { title: `Year ${this.n}`, objective: '' };
    const st = this.step;
    return { title: q.title, objective: (typeof st?.obj === 'function' ? st.obj(this) : st?.obj) || q.title };
  }
  enterStep() {
    const st = this.step;
    this.clearItems();
    this.encounter = null;
    G.story.placeNPCs();
    this.def.placeNPCs?.(this);
    if (!st) return;
    this.stepStarted = performance.now();
    if (st.place) G.story.placeNPC(st.npc, st.place[0], typeof st.place[1] === 'function' ? st.place[1]() : st.place[1], st.place[2] || 0, st.place[3] || 'idle');
    st.enter?.(this);
    if (st.type === 'collect') this.spawnItems(st);
    if (st.type === 'script' && !st._running) this.runScript(st);
    if (st.type === 'fight' && G.zone?.name === st.zone && !st.at) this.startFight(st);
    G.ui.setQuest(this.objective());
  }
  async runScript(st) {
    st._running = true;
    await G.story.run(async () => { await st.run(this); });
    st._running = false;
    if (this.step === st) this.next();
  }
  next() {
    const st = this.step;
    st?.done?.(this);
    this.F.step = this.si + 1;
    if (this.F.step >= this.quest.steps.length) return this.completeQuest();
    writeSave();
    this.enterStep();
  }
  completeQuest() {
    const q = this.quest;
    G.ui.banner('Quest complete', q.title, 'quest');
    G.audio.sfx('quest');
    addXP(140 + this.n * 40, q.title);
    addCoins(15 + this.n * 3);
    if (q.points && G.save.house) G.story.addPoints(G.save.house, q.points, q.title);
    q.reward?.(this);
    G.save.yq = this.qi + 1;
    this.F.step = 0;
    writeSave();
    if (this.qi >= this.def.quests.length) { this.finale(); return; }
    setTimeout(() => G.ui.toast(`<b>New quest:</b> ${this.quest.title}`, 'quest', 4000), 700);
    this.letter();
    if (this.quest.autosave) autoSave(false);
    this.enterStep();
  }
  async finale() {
    await G.story.run(() => this.houseCup());
  }

  // ------------------------------------------------------------ house cup & leaving feast
  async houseCup() {
    const story = G.story;
    const gh = G.world.zones.greatHall;
    await G.ui.fade(1, 0.5);
    G.world.setZone('greatHall', { pos: gh.W(0, 0, -16), yaw: Math.PI });
    G.skyObj.tod = 0.85;
    G.mode = 'cutscene';
    G.ui.showHUD(false);
    story.placeNPC('headmistress', 'greatHall', gh.W(0, 0.8, -32.5), 0);
    G.cam.setCinematic(gh.W(0, 6, 10), gh.W(0, 5, -30), 100);
    G.audio.music('hall');
    await G.ui.fade(0, 0.8);
    const pts = G.save.points;
    const order = HOUSE_KEYS.slice().sort((a, b) => pts[b] - pts[a]);
    const winner = order[0];
    const hm = story.speaker('headmistress');
    await G.ui.say([
      ...(this.def.cupLines || []).map((t) => ({ ...hm, text: t })),
      { ...hm, text: `And so to the House Cup. In fourth place, ${HOUSES[order[3]].name}, with ${pts[order[3]]} points. Third, ${HOUSES[order[2]].name}, with ${pts[order[2]]}. Second, ${HOUSES[order[1]].name}, with ${pts[order[1]]}.` },
      { ...hm, text: `And in first place, with ${pts[winner]} points… the House Cup goes to ${HOUSES[winner].name}!` },
    ]);
    G.audio.sfx('victory');
    postFlash(0.3);
    for (const s of story.students) s.anim.trigger('cheer', 3);
    for (let i = 0; i < 6; i++) setTimeout(() => {
      const at = gh.W(rand(-10, 10), rand(8, 14), rand(-30, 30));
      G.fx.emit({ pos: at, color: HOUSES[winner].c1, count: 120, speed: 8, size: 0.3, life: 1.8, intensity: 3, gravity: 3, noScale: true });
      G.fx.emit({ pos: at, color: HOUSES[winner].c2, count: 80, speed: 6, size: 0.25, life: 1.8, intensity: 3, gravity: 3, noScale: true });
      G.audio.sfx('explode');
    }, i * 450);
    await sleep(2800);
    if (this.def.leavingFeast) await this.def.leavingFeast(this);
    G.cam.setCinematic(null);
    story.finishYear(winner);
    const { openCredits } = await import('../menus.js');
    G.mode = 'play';
    openCredits(winner === G.save.house, false, this.n);
  }

  // ------------------------------------------------------------ hooks called by Story
  // returns true when the year handled the conversation
  async talk(npcId) {
    const st = this.step;
    if (st && st.type === 'talk' && st.npc === npcId && (!st.cond || st.cond(this))) {
      const r = await this.say(npcId, st.lines, st);
      if (st.after) { const ok = await st.after(this, r); if (ok === false) return true; }
      if (this.step === st) this.next();
      return true;
    }
    if (st && st.type === 'minigame' && st.npc === npcId) {
      if (st.lines) await this.say(npcId, typeof st.lines === 'function' ? st.lines(this) : st.lines);
      const res = await runMinigame(st.id, typeof st.opts === 'function' ? st.opts(this) : st.opts || {});
      if (res.aborted) return true;
      if (!st.pass || st.pass(res)) { if (st.win) await this.say(npcId, st.win); if (this.step === st) this.next(); }
      else if (st.lose) await this.say(npcId, st.lose);
      return true;
    }
    // side quests
    for (const sq of this.def.side || []) {
      const s = this.F.side[sq.id] || 0;
      if (s >= sq.steps.length) continue;
      const sst = sq.steps[s];
      if (sq.available && !sq.available(this) && s === 0) continue;
      if (sst.type === 'talk' && sst.npc === npcId) {
        const r = await this.say(npcId, sst.lines, sst);
        if (sst.after && (await sst.after(this, r)) === false) return true;
        this.sideNext(sq);
        return true;
      }
    }
    const extra = this.def.talk?.[npcId];
    if (extra) { await extra(this); return true; }
    return false;
  }
  async say(id, lines, st) {
    if (!lines) return null;
    const L = typeof lines === 'function' ? lines(this) : lines;
    const sp = G.story.speaker(id);
    return G.story.talk(id, L.map((l) => (typeof l === 'string' ? l : l.who ? l : { ...sp, ...l })));
  }
  onArrive(zone) {
    const st = this.step;
    if (st?.type === 'fight' && st.zone === zone && !st.at) this.startFight(st);
    this.def.onArrive?.(this, zone);
    for (const sq of this.def.side || []) sq.onArrive?.(this, zone);
  }
  onEvent(type, data) {
    const st = this.step;
    if (type === 'kill' && this.encounter && this.encounter.step === st && !G.enemies.list.some((e) => e.alive && !e.ally) && !st.manual) {
      // multi-wave fights: spawn the next wave instead of finishing
      if (st.waves && (this.encounter.wave || 0) < st.waves.length - 1) {
        const w = ++this.encounter.wave;
        G.story.run(async () => { if (st.waveIntro) await st.waveIntro(this, w); if (this.step === st) st.waves[w](this); });
        return;
      }
      this.encounter = null;
      if (st.win) G.story.run(async () => { await st.win(this); if (this.step === st) this.next(); });
      else this.next();
    }
    if (type === 'puzzle' && st?.type === 'puzzle' && st.ids.every((id) => G.puzzles.isSolved(id))) this.next();
    st?.onEvent?.(this, type, data);
    this.def.onEvent?.(this, type, data);
    for (const sq of this.def.side || []) {
      const s = this.F.side[sq.id] || 0;
      const sst = sq.steps[s];
      if (!sst || !this.F.side[sq.id + '_on']) continue;
      if (sst.type === 'puzzle' && type === 'puzzle' && sst.ids.every((id) => G.puzzles.isSolved(id))) this.sideNext(sq);
      sst.onEvent?.(this, type, data);
    }
  }
  onRespawn() {
    const st = this.step;
    if (st?.type === 'fight' && this.encounter) {
      G.enemies.clearZone();
      this.encounter = null;
      const cp = st.respawn ? st.respawn(this) : null;
      if (cp) G.player.teleport(cp.pos, cp.yaw);
      else G.player.teleport(G.zone.checkpoint?.pos || G.zone.spawn.pos, G.zone.checkpoint?.yaw ?? G.zone.spawn.yaw);
      G.cam.snap();
      if (G.zone.name === st.zone) this.startFight(st);
      return true;
    }
    return false;
  }
  startFight(st) {
    if (this.encounter) return;
    this.encounter = { step: st };
    G.enemies.hpScale = 1 + (this.n - 1) * 0.25;
    G.enemies.dmgScale = 1 + (this.n - 1) * 0.12;
    const run = async () => {
      if (st.intro) await G.story.run(() => st.intro(this));
      if (this.step !== st || !this.encounter) return;
      this.encounter.wave = 0;
      if (st.waves) st.waves[0](this); else st.spawn(this);
    };
    run();
  }
  update(dt) {
    const st = this.step;
    if (!st || G.mode !== 'play') return;
    const p = G.player;
    if (st.type === 'go' && G.zone.name === st.zone && !G.story.busy) {
      const pos = typeof st.pos === 'function' ? st.pos(this) : st.pos;
      if (Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < (st.r || 3) && Math.abs(p.pos.y - pos.y) < 4) {
        if (st.lines || st.run) G.story.run(async () => { if (st.run) await st.run(this); else await G.story.talk(null, st.lines); if (this.step === st) this.next(); });
        else this.next();
      }
    }
    if (st.type === 'fight' && st.at && G.zone.name === st.zone && !this.encounter) {
      const pos = typeof st.at === 'function' ? st.at(this) : st.at;
      if (Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < (st.r || 20)) this.startFight(st);
    }
    if (st.type === 'collect') this.updateItems(dt);
    st.update?.(this, dt);
    this.def.update?.(this, dt);
  }
  marker() {
    const st = this.step;
    if (!st) return null;
    if (st.marker) return st.marker(this);
    const npcT = (id) => { const n = G.story.npcs[id]; return n && n.zone ? { zone: n.zone, pos: n.pos.clone().setY(n.pos.y + 2.4) } : null; };
    if (st.type === 'talk' || (st.type === 'minigame' && st.npc)) return npcT(st.npc);
    if (st.type === 'go') { const pos = typeof st.pos === 'function' ? st.pos(this) : st.pos; return { zone: st.zone, pos: pos.clone().setY(pos.y + 2.5) }; }
    if (st.type === 'fight') { const pos = st.at ? (typeof st.at === 'function' ? st.at(this) : st.at) : null; if (pos) return { zone: st.zone, pos: pos.clone().setY(pos.y + 2.5) }; if (G.zone.name !== st.zone) return { zone: st.zone, pos: G.world.zones[st.zone].spawn.pos.clone().setY(G.world.zones[st.zone].spawn.pos.y + 2) }; return null; }
    if (st.type === 'puzzle') { const o = st.ids.map((id) => G.puzzles.byId[id]).find((o) => o && !o.solved); return o ? { zone: o.zone, pos: o.pos.clone().setY(o.pos.y + 1.5) } : null; }
    if (st.type === 'collect') { const it = this.items.find((i) => !i.got); return it ? { zone: st.zone, pos: it.pos.clone().setY(it.pos.y + 1) } : null; }
    return null;
  }

  // ------------------------------------------------------------ collect steps
  spawnItems(st) {
    const z = G.world.zones[st.zone];
    const list = typeof st.items === 'function' ? st.items(this) : st.items;
    this.items = list.map((pos, i) => {
      const m = st.model ? st.model() : makeCard();
      m.position.copy(pos);
      z.world.add(m);
      return { m, pos: pos.clone(), got: !!this.F[`c${this.qi}_${i}`], i, z };
    });
    this.items.forEach((it) => { if (it.got) it.m.visible = false; });
  }
  updateItems(dt) {
    const st = this.step;
    const p = G.player;
    for (const it of this.items) {
      if (it.got || G.zone !== it.z) continue;
      it.m.rotation.y += dt * 2;
      it.m.position.y = it.pos.y + Math.sin(G.time * 2 + it.i) * 0.15;
      if (Math.random() < 0.05) G.fx.emit({ pos: it.m.position, color: 0xffe0a0, count: 1, speed: 0.4, size: 0.12, life: 0.8, intensity: 3, spread: 0.6, noScale: true });
      if (it.m.position.distanceTo(p.pos.clone().setY(p.pos.y + 1)) < 1.4) {
        it.got = true; this.F[`c${this.qi}_${it.i}`] = true; it.m.visible = false;
        G.audio.sfx('card');
        G.fx.burst(it.pos, 0xffe0a0, 30, 4);
        const left = this.items.filter((x) => !x.got).length;
        G.ui.toast(`${st.label || 'Found'} (${this.items.length - left}/${this.items.length})`, 'info');
        if (!left) this.next();
      }
    }
  }
  clearItems() { for (const it of this.items) it.m.parent?.remove(it.m); this.items = []; }

  // ------------------------------------------------------------ side quests
  sideState(id) { return this.F.side[id] || 0; }
  sideNext(sq) {
    const s = (this.F.side[sq.id] || 0);
    if (s === 0) { this.F.side[sq.id + '_on'] = true; sendOwl(`y${this.n}-side-${sq.id}`, sq.from || 'A friend', `Side quest: ${sq.title}`, sq.letter || sq.steps[1]?.obj || sq.title, { quest: true }); }
    this.F.side[sq.id] = s + 1;
    if (s + 1 >= sq.steps.length) {
      G.ui.banner('Side quest complete', sq.title, 'quest');
      G.audio.sfx('quest');
      addXP(90 + this.n * 25, sq.title);
      addCoins(10 + this.n * 2);
      if (sq.points && G.save.house) G.story.addPoints(G.save.house, sq.points, sq.title);
      sq.reward?.(this);
    } else sq.steps[s + 1].enter?.(this);
    writeSave();
  }
  sideList() {
    return (this.def.side || []).map((sq) => {
      const s = this.F.side[sq.id] || 0;
      const done = s >= sq.steps.length;
      const on = this.F.side[sq.id + '_on'];
      return { title: sq.title, done, on, obj: done ? 'Done' : on ? (sq.steps[s].obj || '') : (sq.hint || 'Not started') };
    });
  }
  sideMarkers() {
    const out = [];
    for (const sq of this.def.side || []) {
      const s = this.F.side[sq.id] || 0;
      if (!this.F.side[sq.id + '_on'] || s >= sq.steps.length) continue;
      const m = sq.steps[s].marker?.(this);
      if (m) out.push(m);
    }
    return out;
  }
}
