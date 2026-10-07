// Quests, NPCs, interactions, collectibles, house points, the Sorting ceremony
// and the final House Cup.
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from './state.js';
import { makeWizard, makeSortingHat, makeCard, makeBean, makeHippogriff, HAIR_COLORS, SKIN_TONES } from './models.js';
import { SPELL_BY_ID } from './spelldata.js';
import { glyph } from './input.js';
import { writeSave, autoSave } from './save.js';
import { addXP, sendOwl, YEARS } from './progress.js';
import { runMinigame } from './minigames/index.js';
import { PLATEAU, SPOTS, groundHeight, WATER_Y } from './world/terrain.js';
import { rand, pick, dampAngle, sleep, clamp } from './util.js';
import { postFlash } from './engine.js';
import { openResults, openCredits } from './menus.js';

const NPC_LOOKS = {
  headmistress: { name: 'Headmistress Aldmoor', voice: 'mid', color: '#c9a0ff', look: { robeColor: '#3a1f5a', liningColor: '#c8a040', hat: true, hatColor: '#3a1f5a', hatBand: '#c8a040', hairStyle: 'long', hairColor: '#d8d4cc', glasses: true, skin: SKIN_TONES[0], scale: 1.05 } },
  thornwick: { name: 'Professor Thornwick', voice: 'high', color: '#9fe08a', look: { robeColor: '#2a4a2a', liningColor: '#88aa44', hat: true, hatColor: '#2a4a2a', hairStyle: 'messy', hairColor: '#8a8a8a', beard: 'short', beardColor: '#9a9a9a', skin: SKIN_TONES[2], scale: 0.82 } },
  vexley: { name: 'Professor Vexley', voice: 'low', color: '#7fd0a0', look: { robeColor: '#0e0e10', liningColor: '#1a4a2a', hairStyle: 'long', hairColor: '#111', skin: SKIN_TONES[0], scale: 1.04 } },
  hale: { name: 'Madam Hale', voice: 'mid', color: '#ffd27a', look: { robeColor: '#5a5a60', liningColor: '#d8b030', hairStyle: 'short', hairColor: '#cfcfcf', skin: SKIN_TONES[3] } },
  brannoc: { name: 'Brannoc the Groundskeeper', voice: 'low', color: '#e0b080', look: { robeColor: '#4a3220', liningColor: '#6a4a2a', hairStyle: 'curly', hairColor: '#2a1a10', beard: 'long', beardColor: '#2a1a10', skin: SKIN_TONES[2], scale: 1.45, noWand: true } },
  duskwood: { name: 'Professor Duskwood', voice: 'mid', color: '#8ab8ff', look: { robeColor: '#1a2a5a', liningColor: '#c0c8d8', hairStyle: 'ponytail', hairColor: '#7a4520', skin: SKIN_TONES[4] } },
  pip: { name: 'Pip Fenwick', voice: 'high', color: '#ffb0d0', look: { house: 'hufflepuff', hairStyle: 'bun', hairColor: '#b5682a', skin: SKIN_TONES[1], scale: 0.92 } },
};

const CARDS = ['Merlin', 'Morgana', 'Circe', 'Paracelsus', 'Cliodna', 'Agrippa', 'Ptolemy', 'Nicolas Flamel', 'Medea', 'Taliesin', 'Baba Yaga', 'Hengist'];
const CARD_LORE = {
  Merlin: 'Legendary enchanter of Arthurian lore.', Morgana: 'Sorceress and shapeshifter of Avalon.', Circe: 'Turned sailors into swine on Aeaea.',
  Paracelsus: 'Alchemist and physician of the Renaissance.', Cliodna: 'Irish goddess of the sea and of birds.', Agrippa: 'Scholar of the occult philosophy.',
  Ptolemy: 'Astronomer who charted the heavens.', 'Nicolas Flamel': 'Alchemist rumoured to have made the Philosopher’s Stone.', Medea: 'Enchantress of Colchis.',
  Taliesin: 'Bard and seer of Welsh legend.', 'Baba Yaga': 'Witch of the forest, in a hut on chicken legs.', Hengist: 'Founder of a village of wizards, they say.',
};
const BEAN_FLAVOURS = ['earwax', 'toffee', 'grass', 'cherry', 'soap', 'black pepper', 'marmalade', 'sprouts', 'sardine', 'bogey', 'strawberry', 'dirt', 'buttered toast', 'vomit', 'lemon sherbet', 'spinach'];

// zone adjacency for the objective marker (route through portals)
const ADJ = { grounds: ['greatHall'], greatHall: ['grounds', 'staircase'], staircase: ['greatHall', 'corridor', 'dungeon', 'tower'], corridor: ['staircase'], dungeon: ['staircase'], tower: ['staircase'] };
function route(from, to) {
  if (from === to) return null;
  const prev = { [from]: null };
  const q = [from];
  while (q.length) {
    const z = q.shift();
    for (const n of ADJ[z] || []) if (!(n in prev)) { prev[n] = z; q.push(n); }
  }
  let cur = to;
  while (prev[cur] !== from && prev[cur] != null) cur = prev[cur];
  return cur;
}

export const BUILT_YEARS = 1;
const Y1_FROM = ['Headmistress Aldmoor', 'Headmistress Aldmoor', 'Professor Thornwick', 'Professor Duskwood', 'Professor Vexley', 'Professor Vexley', 'Madam Hale', 'Brannoc the Groundskeeper', 'Headmistress Aldmoor', 'Headmistress Aldmoor', 'Brannoc the Groundskeeper'];

export const QUESTS = [
  { title: 'The Sorting', objective: 'Take your seat for the Sorting ceremony.' },
  { title: 'Charms Class', objective: 'Climb the Grand Staircase to the Charms Corridor and find Professor Thornwick.' },
  { title: 'Duelling Club', objective: 'Talk to Professor Duskwood in the Great Hall and win your first duel.' },
  { title: 'Potions', objective: 'Head down to the Dungeons and brew a potion for Professor Vexley.' },
  { title: 'Troll in the Dungeon!', objective: 'Defeat the mountain troll in the dungeon hall. (Hint: Leviosa its club!)' },
  { title: 'Flying Lessons', objective: 'Meet Madam Hale at the Quidditch pitch.' },
  { title: 'Care of Magical Creatures', objective: 'Find Brannoc by the paddock near the Forbidden Forest.' },
  { title: 'The Patronus Charm', objective: "Visit the Headmistress's Tower at the top of the Grand Staircase." },
  { title: 'Shadows on the Lake', objective: 'Drive the Dementors away from the Black Lake pier.' },
  { title: 'Into the Forbidden Forest', objective: 'Follow the forest path to the stone circle and face Malachar.' },
  { title: 'The House Cup', objective: 'Return to the Great Hall for the end-of-term feast.' },
  { title: 'Free Roam', objective: 'Explore, find collectibles and play minigames to win more house points.' },
];

export class Story {
  constructor() {
    this.npcs = {};
    this.interactables = [];
    this.collectibles = [];
    this.rivalT = 60;
    this.musicT = 0;
    this.busy = false;
    this.encounter = null;
    this.buildNPCs();
    this.buildCollectibles();
    this.buildStations();
    G.ui.updatePoints();
    G.events.on('arrive', (z) => this.onArrive(z));
    G.events.on('respawn', () => this.onRespawn());
  }

  get stage() { return G.save.stage; }
  set stage(v) {
    G.save.stage = v;
    this.placeNPCs();
    G.ui.setQuest(this.currentQuest());
    writeSave();
  }
  advance(to) {
    const q = QUESTS[this.stage];
    if (q && this.stage > 0) { G.ui.banner('Quest complete', q.title, 'quest'); G.audio.sfx('quest'); addXP(120 + G.save.year * 30, q.title); }
    setTimeout(() => {
      this.stage = to;
      const nq = QUESTS[to];
      if (nq) G.ui.toast(`<b>New quest:</b> ${nq.title}`, 'quest', 4000);
    }, 600);
    this.stage = to;
    this.questLetter();
  }
  // every new quest arrives as an owl post letter, which doubles as the quest log
  questLetter() {
    if (G.save.year !== 1) return;
    const q = QUESTS[this.stage];
    if (!q || this.stage >= 11) return;
    const from = Y1_FROM[this.stage] || 'Headmistress Aldmoor';
    sendOwl(`y1-q${this.stage}`, from, q.title, q.objective, { quest: true, silent: this.stage === 0 });
  }
  // ------------------------------------------------------------ year / quest log API
  resume() {
    this.placeNPCs();
    G.ui.setQuest(this.currentQuest());
  }
  currentQuest() {
    if (G.save.yearDone) return { title: `Year ${G.save.year} complete`, objective: this.yearAvailable(G.save.year + 1) ? `Begin Year ${G.save.year + 1}: open the pause menu → School Years, or talk to the Headmistress.` : 'Explore, find collectibles and play minigames. More years arrive in a later update.' };
    return QUESTS[Math.min(this.stage, QUESTS.length - 1)];
  }
  completedQuests() { return QUESTS.slice(0, Math.min(this.stage, 11)).map((q) => q.title); }
  yearFraction() { return G.save.yearDone ? 1 : Math.min(1, this.stage / 11); }
  yearAvailable(n) { return n >= 1 && n <= BUILT_YEARS; }
  offerNextYear() {
    const n = G.save.year + 1;
    if (!G.save.yearDone) return;
    if (!this.yearAvailable(n)) { if (n <= 7) G.ui.toast(`Year ${n} — ${YEARS[n - 1].title} — arrives in a later update. Keep exploring!`, 'info', 5000); return; }
    G.ui.toast(`Year ${n} awaits! Talk to the Headmistress, or open School Years from the pause menu.`, 'quest', 5000);
  }

  // ------------------------------------------------------------ house points
  addPoints(house, n, reason, quiet) {
    if (!house || !n) return;
    const p = G.save.points;
    p[house] = Math.max(0, p[house] + n);
    if (!quiet) { G.ui.points(house, n, reason); G.audio.sfx('points'); }
    G.ui.updatePoints();
  }

  // ------------------------------------------------------------ NPCs
  npc(id) {
    if (this.npcs[id]) return this.npcs[id];
    const d = NPC_LOOKS[id];
    const m = makeWizard({ ...d.look, house: d.look.house || null, scarf: !!d.look.house });
    const n = { id, d, model: m, root: m.root, zone: null, pos: new THREE.Vector3(), yaw: 0, talk: false };
    this.npcs[id] = n;
    return n;
  }
  placeNPC(id, zoneName, pos, yaw = 0, state = 'idle') {
    const n = this.npc(id);
    const z = G.world.zones[zoneName];
    n.root.parent?.remove(n.root);
    z.world.add(n.root);
    n.zone = zoneName;
    n.pos.copy(pos);
    n.yaw = yaw;
    n.root.position.copy(pos);
    n.root.rotation.y = yaw;
    n.state = state;
    n.model.anim.set(state);
  }
  placeNPCs() {
    const W = G.world.zones;
    const s = this.stage;
    const gh = W.greatHall, co = W.corridor, du = W.dungeon, to = W.tower;
    this.placeNPC('headmistress', s >= 7 && s < 10 ? 'tower' : 'greatHall', s >= 7 && s < 10 ? to.spots.headmistress : gh.W(0, 0.8, -32.5), 0);
    this.placeNPC('thornwick', 'corridor', co.spots.professor, 0);
    this.placeNPC('vexley', 'dungeon', du.spots.professor, 0.4);
    this.placeNPC('duskwood', 'greatHall', gh.W(5, 0.8, -31), -0.3);
    const P = SPOTS.pitch;
    this.placeNPC('hale', 'grounds', new THREE.Vector3(P.x + 6, groundHeight(P.x + 6, P.z + 30), P.z + 30), Math.PI);
    const pad = SPOTS.paddock;
    this.placeNPC('brannoc', 'grounds', new THREE.Vector3(pad.x - 18, groundHeight(pad.x - 18, pad.z - 6), pad.z - 6), Math.PI / 2);
    this.placeNPC('pip', 'grounds', new THREE.Vector3(6, PLATEAU, 6), -2.4);
  }
  buildNPCs() {
    this.placeNPCs();
    // the hippogriff in its paddock
    const h = makeHippogriff();
    const pad = SPOTS.paddock;
    h.root.position.set(pad.x, groundHeight(pad.x, pad.z), pad.z);
    G.world.zones.grounds.world.add(h.root);
    this.hippogriff = h;
    this.hippoWander = { a: 0, t: 0 };
    // sorting hat on its stool
    const hat = makeSortingHat();
    hat.position.copy(G.world.zones.greatHall.stoolPos);
    hat.scale.setScalar(0.9);
    G.world.zones.greatHall.world.add(hat);
    this.hat = hat;
    // a few seated students for atmosphere
    const gh = G.world.zones.greatHall;
    const students = [];
    HOUSE_KEYS.forEach((house, i) => {
      for (let k = 0; k < 2; k++) {
        const s = makeWizard({ house, skin: pick(SKIN_TONES), hairColor: pick(HAIR_COLORS), hairStyle: pick(['short', 'long', 'curly', 'bun', 'messy', 'ponytail']), noWand: true, scale: 0.9, noShadow: true });
        const side = k % 2 ? 1 : -1;
        s.root.position.copy(gh.W(-9 + i * 6 + side * 1.75, 0, -8 + k * 17 + i * 3));
        s.root.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        s.anim.set('sit');
        s.anim.update(1, 0);
        gh.world.add(s.root);
        students.push(s);
      }
    });
    this.students = students;
  }

  // ------------------------------------------------------------ collectibles
  buildCollectibles() {
    const gz = G.world.zones;
    const g = (x, z, dy = 1.1) => ({ zone: 'grounds', pos: new THREE.Vector3(x, groundHeight(x, z) + dy, z) });
    const cardSpots = [
      g(-26, -20 + 40, 1.2), g(84, 96), g(-150, 120), g(178, 60), g(-96, 40), g(30, 70),
      { zone: 'greatHall', pos: gz.greatHall.W(-11, 1.4, 36) }, { zone: 'staircase', pos: gz.staircase.W(12, 9.2, -12.5), hidden: true },
      { zone: 'corridor', pos: gz.corridor.W(-3.5, 1.3, -70), hidden: true }, { zone: 'dungeon', pos: gz.dungeon.W(17, 1.3, -80), hidden: true },
      { zone: 'tower', pos: gz.tower.W(6, 1.4, 4), hidden: true }, g(222, 20),
    ];
    cardSpots[0].pos.set(-26, PLATEAU + 1.2, 20);
    cardSpots[5].hidden = true; cardSpots[11].hidden = true;
    cardSpots.forEach((s, i) => this.addCollectible('card', i, s));
    const beanCols = [0xff5050, 0x50c0ff, 0xffe040, 0x70ff70, 0xff80e0, 0xffffff, 0xff9030];
    const beanSpots = [];
    const rnd = (a) => Math.sin(a * 91.7) * 0.5 + 0.5;
    for (let i = 0; i < 18; i++) {
      // around the grounds, along paths and the lake shore
      const a = i * 2.39, r = 35 + rnd(i) * 140;
      let x = Math.cos(a) * r, z = Math.sin(a) * r + 60;
      if (Math.abs(x) < 95 && z < 30 && z > -150) { x += 110 * Math.sign(x || 1); }
      if (groundHeight(x, z) < WATER_Y + 0.5) { x = -x * 0.5; }
      beanSpots.push(g(x, z, 0.6));
    }
    beanSpots.push({ zone: 'greatHall', pos: gz.greatHall.W(-3, 1.3, 20) }, { zone: 'greatHall', pos: gz.greatHall.W(9, 1.3, -10) });
    beanSpots.push({ zone: 'corridor', pos: gz.corridor.W(3, 0.6, -30) }, { zone: 'corridor', pos: gz.corridor.W(-9, 1.3, -96) });
    beanSpots.push({ zone: 'staircase', pos: gz.staircase.W(-12, 8.6, -12) }, { zone: 'staircase', pos: gz.staircase.W(12, 16.6, 12) });
    beanSpots.push({ zone: 'dungeon', pos: gz.dungeon.W(-10, 0.6, -20) }, { zone: 'dungeon', pos: gz.dungeon.W(10, 0.6, -60) });
    beanSpots.push({ zone: 'tower', pos: gz.tower.W(-4, 0.6, 5) }, { zone: 'grounds', pos: new THREE.Vector3(14, PLATEAU + 0.6, -12) });
    beanSpots.forEach((s, i) => { s.color = beanCols[i % beanCols.length]; this.addCollectible('bean', i, s); });
  }
  addCollectible(kind, i, s) {
    const have = kind === 'card' ? G.save.cards.includes(i) : G.save.beans.includes(i);
    if (have) return;
    const m = kind === 'card' ? makeCard() : makeBean(s.color);
    m.position.copy(s.pos);
    G.world.zones[s.zone].world.add(m);
    this.collectibles.push({ kind, i, zone: s.zone, pos: s.pos.clone(), mesh: m, hidden: !!s.hidden, revealed: !s.hidden, t: rand(0, 6) });
    if (s.hidden) m.visible = false;
  }
  updateCollectibles(dt) {
    const p = G.player;
    for (const c of this.collectibles) {
      if (c.zone !== G.zone.name || c.got) continue;
      c.t += dt;
      const d = c.pos.distanceTo(p.pos.clone().setY(p.pos.y + 1));
      if (c.hidden && !c.revealed) {
        if (G.spells.lumosOn && d < 10) {
          c.revealed = true;
          c.mesh.visible = true;
          G.fx.burst(c.pos, 0xfff2c0, 40, 4);
          G.audio.sfx('lumos');
          G.ui.toast('Lumos revealed something hidden!', 'info');
        } else continue;
      }
      c.mesh.position.y = c.pos.y + Math.sin(c.t * 2) * 0.15;
      c.mesh.rotation.y += dt * 2;
      if (Math.random() < 0.06) G.fx.emit({ pos: c.mesh.position, color: c.kind === 'card' ? 0xffd070 : 0xffffff, count: 1, speed: 0.4, size: 0.12, life: 0.8, intensity: 3, spread: 0.6, noScale: true });
      if (d < 1.3 && G.mode === 'play') this.collect(c);
    }
  }
  collect(c) {
    c.got = true;
    c.mesh.parent?.remove(c.mesh);
    const house = G.save.house;
    if (c.kind === 'card') {
      G.save.cards.push(c.i);
      const name = CARDS[c.i];
      G.audio.sfx('card');
      G.ui.banner(`Chocolate Frog Card: ${name}`, `${CARD_LORE[name]} (${G.save.cards.length}/12)`, 'card');
      this.addPoints(house, 5, 'Rare card', true);
    } else {
      G.save.beans.push(c.i);
      G.audio.sfx('pickup');
      G.ui.toast(`Bertie Bott's bean: <i>${pick(BEAN_FLAVOURS)}</i> flavour! (${G.save.beans.length}/${this.totalBeans})`, 'info');
      this.addPoints(house, 1, null, true);
    }
    G.fx.burst(c.pos, c.kind === 'card' ? 0xffd070 : 0xffffff, 40, 5);
    writeSave();
  }
  get totalBeans() { return 30; }

  // ------------------------------------------------------------ interaction stations
  buildStations() {
    const I = this.interactables;
    const W = G.world.zones;
    const npcAct = (id, label, fn) => I.push({ npc: id, label: () => label(), act: fn, r: 2.6 });
    npcAct('headmistress', () => 'Talk to Headmistress Aldmoor', () => this.talkHeadmistress());
    npcAct('thornwick', () => 'Talk to Professor Thornwick', () => this.talkThornwick());
    npcAct('vexley', () => 'Talk to Professor Vexley', () => this.talkVexley());
    npcAct('duskwood', () => 'Talk to Professor Duskwood', () => this.talkDuskwood());
    npcAct('hale', () => 'Talk to Madam Hale', () => this.talkHale());
    npcAct('brannoc', () => 'Talk to Brannoc', () => this.talkBrannoc());
    npcAct('pip', () => 'Talk to Pip', () => this.talkPip());
    I.push({ zone: 'dungeon', pos: W.dungeon.cauldron.pos, r: 2.4, label: () => 'Brew a potion', cond: () => this.stage > 3, act: () => this.playPotions() });
    I.push({ zone: 'corridor', pos: W.corridor.spots.lectern, r: 2.4, label: () => 'Wand practice', cond: () => this.stage > 1, act: () => this.playWand() });
    I.push({ zone: 'greatHall', pos: W.greatHall.W(0, 0, -21), r: 3, label: () => 'House points board', act: () => this.showBoard() });
  }

  nearestInteract() {
    const p = G.player;
    let best = null, bd = Infinity;
    for (const it of this.interactables) {
      let pos, zone;
      if (it.npc) { const n = this.npcs[it.npc]; pos = n.pos; zone = n.zone; }
      else { pos = it.pos; zone = it.zone; }
      if (zone !== G.zone.name) continue;
      if (it.cond && !it.cond()) continue;
      const d = Math.hypot(pos.x - p.pos.x, pos.z - p.pos.z);
      if (d < it.r && Math.abs(pos.y - p.pos.y) < 2.5 && d < bd) { bd = d; best = it; }
    }
    return best;
  }

  updatePrompt() {
    if (this.busy || G.mode !== 'play' || G.minigame) { G.ui.prompt(null); return; }
    const it = this.nearestInteract();
    const portal = G.world.nearPortal;
    if (it) G.ui.prompt(`${glyph('interact')} ${it.label()}`);
    else if (portal) G.ui.prompt(`${glyph('interact')} ${portal.lockedMsg && portal.locked?.() ? portal.lockedMsg : portal.label}`);
    else G.ui.prompt(null);
    if (G.input.isPressed('interact')) {
      if (it) this.run(it.act);
      else if (portal) G.world.travel(portal.to, portal.at);
    }
  }

  async run(fn) {
    if (this.busy) return;
    this.busy = true;
    try { await fn(); } catch (e) { console.error(e); }
    this.busy = false;
    G.player.control = true;
    G.cam.setCinematic(null);
    if (G.mode === 'dialogue' || G.mode === 'cutscene') G.mode = 'play';
    if (G.mode === 'play') G.ui.showHUD(true);
  }

  // talk helper: frame the NPC and player, then show lines
  async talk(id, lines) {
    if (G.quitting) return null;
    const n = this.npcs[id];
    const p = G.player;
    if (n) {
      const toP = Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z);
      n.root.rotation.y = toP;
      p.yaw = Math.atan2(n.pos.x - p.pos.x, n.pos.z - p.pos.z);
      p.root.rotation.y = p.yaw;
      const mid = n.pos.clone().lerp(p.pos, 0.5);
      const side = new THREE.Vector3(Math.cos(toP), 0, -Math.sin(toP));
      const h = n.model.height;
      G.cam.setCinematic(mid.clone().addScaledVector(side, 3.2).add(new THREE.Vector3(0, h * 0.9, 0)).addScaledVector(new THREE.Vector3(Math.sin(toP), 0, Math.cos(toP)), 1.5), n.pos.clone().setY(n.pos.y + h * 0.85), 4);
    }
    const d = n ? n.d : null;
    const out = await G.ui.say(lines.map((l) => (typeof l === 'string'
      ? { who: d?.name, text: l, color: d?.color, voice: d?.voice, speaker: (on) => n && n.model.anim.set(on ? 'talk' : 'idle') }
      : l.who === 'you' ? { ...l, who: G.save.name, color: HOUSES[G.save.house]?.c2 || '#fff', voice: 'mid' } : l)));
    G.cam.setCinematic(null);
    return out;
  }

  // ------------------------------------------------------------ the Sorting
  async beginNewGame() {
    G.save.started = true;
    this.stage = 0;
    this.questLetter();
    autoSave(true);
    G.world.setZone('greatHall', { pos: G.world.zones.greatHall.W(0, 0, -24), yaw: Math.PI });
    G.mode = 'cutscene';
    G.ui.showHUD(false);
    G.audio.music('hall');
    G.skyObj.tod = 0.85;
    await G.ui.fade(0, 1.2);
    await this.run(() => this.sorting());
    G.mode = 'play';
    G.ui.showHUD(true);
    G.ui.refreshHUD();
  }

  async sorting() {
    const gh = G.world.zones.greatHall;
    const p = G.player;
    const hat = this.hat;
    p.teleport(gh.W(0, 0.8, -28.6), 0);
    p.status.override = 'sit';
    G.cam.setCinematic(gh.W(0, 3.2, -19), gh.W(0, 2.2, -29), 2);
    const hm = { who: NPC_LOOKS.headmistress.name, color: NPC_LOOKS.headmistress.color, voice: 'mid', speaker: (on) => this.npcs.headmistress.model.anim.set(on ? 'talk' : 'idle') };
    await G.ui.say([
      { ...hm, text: `Welcome, welcome, to a new year at Hogwarts! Before the feast begins, our newest student must be Sorted.` },
      { ...hm, text: `${G.save.name}, please take your seat upon the stool. The Sorting Hat will see what you cannot.` },
    ]);
    // the hat lifts onto the player's head
    const head = p.model.parts.head;
    const start = hat.position.clone();
    for (let t = 0; t <= 1; t += 0.04) {
      hat.position.lerpVectors(start, head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0)), t);
      hat.position.y += Math.sin(t * Math.PI) * 0.8;
      await sleep(16);
    }
    hat.parent.remove(hat);
    head.add(hat);
    hat.position.set(0, 0.09, 0);
    hat.scale.setScalar(0.9 / p.model.root.scale.x);
    G.cam.setCinematic(gh.W(0.6, 2.6, -26.4), gh.W(0, 2.1, -28.6), 2.5);
    const H = { who: 'The Sorting Hat', color: '#d8b070', voice: 'hat', speaker: (on) => (hat.userData.talk = on) };
    const score = { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
    const qs = [
      ['Hmm… difficult. Very difficult. Tell me — a troll blocks the corridor and a friend is behind it. What do you do?', ['Charge in, wand blazing', 'Think up a clever trick', 'Stand by my friend, whatever happens', 'Find a way that leaves me in charge'], ['gryffindor', 'ravenclaw', 'hufflepuff', 'slytherin']],
      ['And what would you most like to be remembered for?', ['My courage', 'My discoveries', 'My kindness', 'My achievements'], ['gryffindor', 'ravenclaw', 'hufflepuff', 'slytherin']],
      ['You find a locked door in the dungeons. Behind it, something hums…', ['Open it. Obviously.', 'Study the lock first', 'Fetch the others so we go together', 'Note it down — knowledge is power'], ['gryffindor', 'ravenclaw', 'hufflepuff', 'slytherin']],
    ];
    for (const [q, ch, map] of qs) {
      const i = await G.ui.say([{ ...H, text: q, choices: ch }]);
      score[map[i ?? 0]] += 2;
    }
    const pref = await G.ui.say([{ ...H, text: 'Plenty of talent, I see. Is there a house you would rather I chose?', choices: ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff', 'Let the Hat decide'] }]);
    let house;
    if (pref != null && pref < 4) house = HOUSE_KEYS[pref];
    else house = HOUSE_KEYS.slice().sort((a, b) => score[b] - score[a] + (Math.random() - 0.5) * 0.1)[0];
    await G.ui.say([{ ...H, text: 'Then it had better be…' }]);
    G.audio.sfx('gong');
    postFlash(0.35);
    G.ui.banner(HOUSES[house].name.toUpperCase() + '!', `Brave, wise, loyal or cunning — welcome to ${HOUSES[house].name}.`, 'house house-' + house);
    G.save.house = house;
    p.rebuild();
    G.ui.refreshHUD();
    hat.parent.remove(hat);
    hat.position.copy(gh.stoolPos);
    hat.scale.setScalar(0.9);
    gh.world.add(hat);
    G.fx.emit({ pos: gh.W(0, 6, -28), color: HOUSES[house].c1, count: 220, speed: 9, size: 0.3, life: 2.5, intensity: 3, gravity: 3, noScale: true });
    G.fx.emit({ pos: gh.W(0, 6, -28), color: HOUSES[house].c2, count: 160, speed: 7, size: 0.25, life: 2.5, intensity: 3, gravity: 3, noScale: true });
    for (const s of this.students) s.anim.trigger('cheer', 1.6);
    G.cam.setCinematic(gh.W(0, 3, -21), gh.W(0, 2.2, -28.6), 2);
    await sleep(1200);
    p.status.override = null;
    this.addPoints(house, 10, 'A warm welcome');
    for (const id of ['stupefy', 'protego', 'lumos']) G.spells.unlock(id, true);
    G.ui.buildSpellBar();
    await G.ui.say([
      { ...hm, text: `Splendid! ${HOUSES[house].name} gains a fine student. Every lesson you pass, every duel you win, every brave deed — they all earn points toward the House Cup.` },
      { ...hm, text: 'You already know three spells: Stupefy, Protego and Lumos. Your first class is Charms with Professor Thornwick — up the Grand Staircase, through the door beside the dais.' },
      { ...hm, text: 'And do watch the staircases. They like to change.' },
    ]);
    G.ui.banner('Spells learned', 'Stupefy · Protego · Lumos', 'unlock');
    G.audio.sfx('unlock');
    p.teleport(gh.W(0, 0.8, -26), Math.PI);
    G.cam.setCinematic(null);
    G.cam.snap();
    this.advance(1);
    this.tutorial();
  }

  tutorial() {
    const kb = G.input.device;
    setTimeout(() => G.ui.toast(kb === 'touch' ? 'Drag the left side to move, the right side to look.' : kb === 'pad' ? 'Left stick to move, right stick to look.' : 'WASD to move, mouse to look. Click to capture the mouse.', 'tip', 5000), 1500);
    setTimeout(() => G.ui.toast(`Cast spells with ${glyph('cast')}, pick spells with ${kb === 'pad' ? glyph('prev') + '/' + glyph('next') : kb === 'touch' ? 'the spell buttons' : '1–8'}. Hold ${glyph('wheel')} for the spell wheel.`, 'tip', 6000), 7000);
    setTimeout(() => G.ui.toast(`Interact with ${glyph('interact')}. Dodge with ${glyph('dodge')}, block with ${glyph('block')}.`, 'tip', 6000), 13500);
  }

  // ------------------------------------------------------------ dialogues
  async talkHeadmistress() {
    const s = this.stage;
    if (s === 7) {
      await this.talk('headmistress', [
        'Ah, there you are. Brannoc tells me the Dementors have drifted from their posts. They are drawn to fear… and to something darker in the forest.',
        'You will need the Patronus Charm. Think of your happiest memory — hold it — and trace the shape with your wand. Let us try.',
      ]);
      const r = await runMinigame('wanddraw', { patronus: true });
      if (r.success) {
        G.spells.unlock('patronum');
        this.addPoints(G.save.house, 30, 'Mastered the Patronus Charm');
        await this.talk('headmistress', ['A stag! A fine Patronus. Now go — the Dementors are gathering at the Black Lake pier. Drive them off.']);
        this.advance(8);
      } else await this.talk('headmistress', ['Only a wisp. That is how it begins for everyone. Try again when you are ready.']);
      return;
    }
    if (s === 10) return this.houseCup();
    if (G.save.yearDone && this.yearAvailable(G.save.year + 1)) {
      const c = await this.talk('headmistress', [{ who: NPC_LOOKS.headmistress.name, color: NPC_LOOKS.headmistress.color, text: `Summer is nearly over, ${G.save.name}. Are you ready for your ${['', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][G.save.year]} year?`, choices: [`Begin Year ${G.save.year + 1}`, 'Not yet'], speaker: (on) => this.npcs.headmistress.model.anim.set(on ? 'talk' : 'idle') }]);
      if (c === 0) await this.beginYear?.(G.save.year + 1);
      return;
    }
    const lines = {
      0: ['Take your seat, the Hat is waiting.'],
      1: ['Charms is up the Grand Staircase. Professor Thornwick will be delighted to meet you.'],
      2: ['Professor Duskwood runs the Duelling Club right here in the Hall. Do try not to stun the furniture.'],
      3: ['Professor Vexley teaches Potions in the dungeons. Mind the steps — and his temper.'],
      4: ['A troll in the dungeons?! Do be careful… and remember your Charms.'],
      5: ['Madam Hale is waiting at the Quidditch pitch, down the road past the gate.'],
      6: ['Brannoc keeps the creatures by the edge of the Forbidden Forest. Do as he says.'],
      8: ['The pier is down on the western shore of the Black Lake. Courage.'],
      9: ['The forest path begins past Brannoc’s hut. Whatever Malachar wants, it must not reach the castle.'],
      11: ['The House Cup is decided, but there is always more to learn. And more points to win next year!'],
    }[s] || ['Hello again.'];
    await this.talk('headmistress', lines);
  }

  async talkThornwick() {
    const s = this.stage;
    if (s === 1) {
      if (!G.save.flags.pixiesDone) {
        await this.talk('thornwick', ['Oh! Did you see pixies on your way in? Someone opened my cage again. Do clear them out of the corridor first — Stupefy works, and Lumos dazzles them!']);
        return;
      }
      await this.talk('thornwick', [
        'Welcome, welcome! Charms, my dear student, is all in the wrist. Every spell has a shape.',
        'Trace each shape with your wand as fast and as neatly as you can. Ready? Wands out!',
      ]);
      const r = await runMinigame('wanddraw', {});
      if (r.success) {
        G.spells.unlock('leviosa');
        await this.talk('thornwick', [
          'Splendid! Now: Wingardium Leviosa. Swish and flick! It lifts objects — and foes. Cast it again to throw what you hold.',
          'Lift something, then hit it with another spell for a combo. Try the barrels in the corridor. Then pop down to the Great Hall — Professor Duskwood’s Duelling Club meets today!',
        ]);
        this.advance(2);
      } else await this.talk('thornwick', ['Not bad, not bad! A little more practice and you’ll have it. Try again whenever you like.']);
      return;
    }
    const again = await this.talk('thornwick', [{ who: NPC_LOOKS.thornwick.name, color: NPC_LOOKS.thornwick.color, text: 'Back for more wand practice? A speedy trace earns you a Wand Mastery boost!', choices: ['Practise wand shapes', 'Not now'], speaker: (on) => this.npcs.thornwick.model.anim.set(on ? 'talk' : 'idle') }]);
    if (again === 0) await this.playWand();
  }

  async talkDuskwood() {
    const s = this.stage;
    if (s < 2) { await this.talk('duskwood', ['The Duelling Club is for students who know at least a Charm or two. Come back after your first lesson.']); return; }
    const first = !G.save.flags.duelWon;
    const pick2 = await this.talk('duskwood', [
      ...(first ? ['Welcome to the Duelling Club! Bow, step back, and may the better witch or wizard win.', 'In a proper duel, Expelliarmus is the gentle spell of choice. Disarm your opponent, then Stupefy them for a knockout. I’ll teach it to you now.'] : []),
      { who: NPC_LOOKS.duskwood.name, color: NPC_LOOKS.duskwood.color, text: 'Ready for the tournament? Each round your opponent gets tougher.', choices: ['Start the tournament', 'Not yet'], speaker: (on) => this.npcs.duskwood.model.anim.set(on ? 'talk' : 'idle') },
    ]);
    if (first) G.spells.unlock('expelliarmus');
    if (pick2 !== 0) return;
    const r = await runMinigame('duel', {});
    if (r.wins > 0 && !G.save.flags.duelWon) {
      G.save.flags.duelWon = true;
      await this.talk('duskwood', ['Well duelled! You’re a natural. Now, Professor Vexley is expecting you in the dungeons for Potions.']);
      if (this.stage === 2) this.advance(3);
    }
  }

  async talkVexley() {
    const s = this.stage;
    if (s < 3) { await this.talk('vexley', ['First-years are not expected in my dungeon until their timetable says so.']); return; }
    if (s === 3) {
      await this.talk('vexley', [
        'So. The new student. Let us see if you can follow instructions better than the last one.',
        'A potion is nothing without fire. Incendio — the Fire-Making Spell. You will use it to light your cauldron. Try not to set your robes alight.',
      ]);
      G.spells.unlock('incendio');
      await this.talk('vexley', ['Now: ingredients, in order, on the beat. Stir when the brew asks for it. Keep the heat steady. Begin.']);
      const r = await this.playPotions(true);
      if (r && r.success) {
        await this.talk('vexley', ['…Acceptable. Barely. Keep that phial — it will serve you.']);
        await sleep(400);
        // the alarm
        G.audio.sfx('roar');
        G.cam.shake(0.5);
        await this.talk('vexley', ['What was that? …A troll. In MY dungeon hall. Someone let it in.', 'You. You have Incendio, and Professor Thornwick tells me you can levitate things. A troll’s club is heavy… but not too heavy for Leviosa. Go!']);
        this.advance(4);
        this.startTroll();
      } else await this.talk('vexley', ['A disaster. Clean the cauldron and try again.']);
      return;
    }
    const c = await this.talk('vexley', [{ who: NPC_LOOKS.vexley.name, color: NPC_LOOKS.vexley.color, text: 'Back to brew? A good potion grants a useful boon.', choices: ['Brew a potion', 'Leave'], speaker: (on) => this.npcs.vexley.model.anim.set(on ? 'talk' : 'idle') }]);
    if (c === 0) await this.playPotions();
  }

  async talkHale() {
    if (this.stage < 5) { await this.talk('hale', ['Flying lessons come after your castle classes. Off you go — and no brooms in the corridors!']); return; }
    const first = this.stage === 5;
    const c = await this.talk('hale', [
      ...(first ? ['Right! Mount your broom, kick off hard, and keep your eyes up.', 'Fly through the golden rings, dodge the Bludgers, and when the Golden Snitch appears — catch it!'] : []),
      { who: NPC_LOOKS.hale.name, color: NPC_LOOKS.hale.color, text: first ? 'Ready?' : 'Fancy another practice match?', choices: ['Fly!', 'Not now'], speaker: (on) => this.npcs.hale.model.anim.set(on ? 'talk' : 'idle') },
    ]);
    if (c !== 0) return;
    const r = await runMinigame('quidditch', {});
    if (first && r.score > 0) {
      await this.talk('hale', [r.snitch ? 'You caught the Snitch on your first flight! Remarkable!' : 'Not bad for a first flight! Now, Brannoc wants a word — he’s by the paddock near the forest.']);
      this.advance(6);
    }
  }

  async talkBrannoc() {
    if (this.stage < 6) { await this.talk('brannoc', ['Mornin’! Don’t go near the forest on yer own, now. An’ don’t stare at the Hippogriff.']); return; }
    const first = this.stage === 6;
    if (first) {
      await this.talk('brannoc', [
        'There y’are! This here’s Silvermane. Hippogriffs are proud. Approach slow, keep eye contact, an’ bow. If she bows back, yeh can ride her.',
        'Mind yer timin’. Rush it an’ she’ll have yer arm off.',
      ]);
    }
    const c = first ? 0 : await this.talk('brannoc', [{ who: NPC_LOOKS.brannoc.name, color: NPC_LOOKS.brannoc.color, text: 'Silvermane’s itchin’ for a flight. Want to take her up?', choices: ['Fly Silvermane', 'Maybe later'], speaker: (on) => this.npcs.brannoc.model.anim.set(on ? 'talk' : 'idle') }]);
    if (c !== 0) return;
    const r = await runMinigame('creatures', {});
    if (first && r.success) {
      await this.talk('brannoc', [
        'Brilliant! Yeh flew like yeh were born to it.',
        'Listen… I saw Dementors over the lake last night, an’ green lights in the forest. Somethin’s stirrin’. The Headmistress’ll want to see yeh — up in her tower.',
      ]);
      this.advance(7);
    }
  }

  async talkPip() {
    if (this.stage < 2) {
      await this.talk('pip', ['Hi! I’m Pip, Hufflepuff, second year. If you’re lost: the big doors lead to the Great Hall, and the Grand Staircase is through the side door by the dais.', 'Oh — and there are Chocolate Frog cards hidden all over the castle. Some only show up in Lumos light!']);
      return;
    }
    const c = await this.talk('pip', [
      'Oh no, oh no — my Chocolate Frogs escaped again! They hop SO fast. Could you help me catch them?',
      { who: NPC_LOOKS.pip.name, color: NPC_LOOKS.pip.color, text: 'Each frog comes with a card. You can keep a few!', choices: ['Catch the frogs!', 'Sorry, busy'], speaker: (on) => this.npcs.pip.model.anim.set(on ? 'talk' : 'idle') },
    ]);
    if (c === 0) await runMinigame('frogs', {});
  }

  async playPotions(quest) {
    const r = await runMinigame('potions', { quest });
    return r;
  }
  async playWand() { return runMinigame('wanddraw', { practice: true }); }

  async showBoard() {
    const { openHouseBoard } = await import('./menus.js');
    openHouseBoard();
  }

  // ------------------------------------------------------------ encounters
  onArrive(zone) {
    const s = this.stage;
    if (zone === 'corridor' && s === 1 && !G.save.flags.pixiesDone) this.startPixies();
    if (zone === 'dungeon' && s === 4) this.startTroll();
    if (zone === 'greatHall' && s === 10) setTimeout(() => this.run(() => this.houseCup()), 800);
  }
  onRespawn() {
    const s = this.stage;
    G.enemies.clearZone();
    if (this.encounter === 'troll') { G.world.setZone('dungeon', { pos: G.world.zones.dungeon.W(0, 0, -36), yaw: Math.PI }); this.startTroll(); }
    else if (this.encounter === 'lake') { this.startLake(); }
    else if (this.encounter === 'boss') { const C = SPOTS.clearing; G.player.teleport(new THREE.Vector3(C.x - 20, groundHeight(C.x - 20, C.z + 6), C.z + 6), Math.PI / 2); this.startBoss(); }
    else if (this.encounter === 'pixies') { this.startPixies(); }
    else G.player.teleport(G.zone.spawn.pos, G.zone.spawn.yaw);
    G.cam.snap();
  }

  startPixies() {
    this.encounter = 'pixies';
    const co = G.world.zones.corridor;
    setTimeout(() => G.ui.toast('Cornish pixies! Someone let them loose. <b>Stupefy</b> them — or dazzle them with <b>Lumos</b>!', 'tip', 5000), 600);
    for (let i = 0; i < 6; i++) G.enemies.spawn('pixie', co.W(rand(-3, 3), 2, -26 - i * 3), { aggro: false });
  }
  startTroll() {
    if (this.encounter === 'trollDone' || (this.encounter === 'troll' && G.enemies.list.some((e) => e.type === 'troll' && e.alive))) return;
    if (G.zone.name !== 'dungeon') return;
    this.encounter = 'troll';
    const du = G.world.zones.dungeon;
    G.enemies.hpScale = 1;
    const t = G.enemies.spawn('troll', du.spots.trollSpawn, { aggro: false, yaw: 0 });
    t.yaw = 0;
  }
  startLake() {
    this.encounter = 'lake';
    G.skyObj.lock = 0.92;
    const g = G.world.zones.grounds;
    const pe = g.pierEnd;
    for (let i = 0; i < 4; i++) {
      const a = i * 1.4;
      G.enemies.spawn('dementor', new THREE.Vector3(pe.x - 6 + Math.cos(a) * 8, WATER_Y, pe.z - 6 + Math.sin(a) * 8), { aggro: false });
    }
    for (let i = 0; i < 2; i++) {
      const x = -96 + i * 6, z = 56 + i * 4;
      G.enemies.spawn('wizard', new THREE.Vector3(x, groundHeight(x, z), z), { level: 2, spells: ['curse', 'stupefyE'], aggro: false });
    }
  }
  startBoss() {
    if (G.save.flags.malacharDefeated) return;
    this.encounter = 'boss';
    G.skyObj.lock = 0.97;
    const C = SPOTS.clearing;
    const c = new THREE.Vector3(C.x, groundHeight(C.x, C.z), C.z);
    const b = G.enemies.spawn('malachar', c.clone().add(new THREE.Vector3(8, 0, 0)), { center: c, aggro: true });
    b.phase = 1;
    b.phaseLabel = 'Phase I';
    this.boss = b;
  }

  onEvent(type, data) {
    const s = this.stage;
    if (type === 'kill') {
      const alive = G.enemies.list.filter((e) => e.alive).length;
      if (this.encounter === 'pixies' && alive === 0) {
        this.encounter = null;
        G.save.flags.pixiesDone = true;
        this.addPoints(G.save.house, 15, 'Cleared the pixies');
        G.ui.toast('Corridor cleared! Find Professor Thornwick in the classroom at the end.', 'quest');
        writeSave();
      }
      if (data.type === 'troll' && s === 4) {
        this.encounter = 'trollDone';
        setTimeout(() => this.run(async () => {
          await this.talk('vexley', ['Well. Well, well. A first-year, felling a mountain troll.', 'For conspicuous bravery — and a certain ruthlessness I rather admire — take this. Petrificus Totalus. The Full Body-Bind.']);
          G.spells.unlock('petrificus');
          this.addPoints(G.save.house, 50, 'Defeated the troll');
          this.advance(5);
          await this.talk('vexley', ['Now get out of my dungeon. Madam Hale is expecting you at the Quidditch pitch.']);
        }), 2500);
      }
      if (this.encounter === 'lake' && alive === 0) {
        this.encounter = null;
        G.skyObj.lock = null;
        this.addPoints(G.save.house, 40, 'Saved the Black Lake');
        G.ui.banner('The Dementors are gone', 'But green light flickers deep in the Forbidden Forest…', 'quest');
        this.advance(9);
      }
      if (data.type === 'malachar') {
        this.encounter = 'bossDone';
        G.save.flags.malacharDefeated = true;
        writeSave();
        setTimeout(() => this.run(() => this.bossDefeated()), 2600);
      }
    }
  }

  async bossDefeated() {
    G.enemies.list.forEach((e) => e.alive && e.die({}));
    G.audio.music('hall');
    G.skyObj.lock = 0.3;
    G.ui.banner('Malachar is defeated!', 'The darkness lifts from the Forbidden Forest.', 'quest');
    G.audio.sfx('victory');
    await sleep(2500);
    this.addPoints(G.save.house, 150, 'Defeated Malachar');
    this.advance(10);
    G.ui.toast('Return to the Great Hall for the House Cup feast!', 'quest', 5000);
  }

  async houseCup() {
    const gh = G.world.zones.greatHall;
    G.player.teleport(gh.W(0, 0, -16), Math.PI);
    G.cam.setCinematic(gh.W(0, 6, 10), gh.W(0, 5, -30), 1.5);
    const hm = { who: NPC_LOOKS.headmistress.name, color: NPC_LOOKS.headmistress.color, voice: 'mid', speaker: (on) => this.npcs.headmistress.model.anim.set(on ? 'talk' : 'idle') };
    const pts = G.save.points;
    // a little rivalry, but the hero’s house is hard to beat
    const order = HOUSE_KEYS.slice().sort((a, b) => pts[b] - pts[a]);
    const winner = order[0];
    await G.ui.say([
      { ...hm, text: 'Another year gone! And what a year. A troll in the dungeons, Dementors on the lake, and a dark wizard driven from our forest by one of our newest students.' },
      { ...hm, text: `The points stand thus: in fourth place, ${HOUSES[order[3]].name}, with ${pts[order[3]]}. Third, ${HOUSES[order[2]].name}, with ${pts[order[2]]}. Second, ${HOUSES[order[1]].name}, with ${pts[order[1]]}.` },
      { ...hm, text: `And in first place, with ${pts[winner]} points… the House Cup goes to ${HOUSES[winner].name}!` },
    ]);
    G.audio.sfx('victory');
    postFlash(0.3);
    for (const s of this.students) s.anim.trigger('cheer', 3);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const at = gh.W(rand(-10, 10), rand(8, 14), rand(-30, 30));
        G.fx.emit({ pos: at, color: HOUSES[winner].c1, count: 120, speed: 8, size: 0.3, life: 1.8, intensity: 3, gravity: 3, noScale: true });
        G.fx.emit({ pos: at, color: HOUSES[winner].c2, count: 80, speed: 6, size: 0.25, life: 1.8, intensity: 3, gravity: 3, noScale: true });
        G.audio.sfx('explode');
      }, i * 450);
    }
    await sleep(2800);
    G.save.completed = true;
    this.advance(11);
    this.finishYear(winner);
    G.cam.setCinematic(null);
    openCredits(winner === G.save.house);
  }

  finishYear(winner) {
    const s = G.save;
    s.yearDone = true;
    if (!s.yearsDone.some((y) => y.year === s.year)) s.yearsDone.push({ year: s.year, cup: winner });
    addXP(500 + s.year * 100, `Year ${s.year} complete`);
    sendOwl(`y${s.year}-end`, 'Headmistress Aldmoor', `End of Year ${s.year}`, `Congratulations on completing your ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][s.year - 1]} year. ${HOUSES[winner].name} won the House Cup. Enjoy the summer — and keep your wand out of sight of Muggles!`, { silent: true });
    autoSave(false);
  }

  // ------------------------------------------------------------ per-frame
  markerTarget() {
    if (G.minigame) return null;
    const s = this.stage;
    const W = G.world.zones;
    let t = null;
    const npcT = (id) => { const n = this.npcs[id]; return n ? { zone: n.zone, pos: n.pos.clone().setY(n.pos.y + 2.4) } : null; };
    if (s === 1) t = G.save.flags.pixiesDone || G.zone.name !== 'corridor' ? npcT('thornwick') : null;
    else if (s === 2) t = npcT('duskwood');
    else if (s === 3) t = npcT('vexley');
    else if (s === 4) t = { zone: 'dungeon', pos: W.dungeon.spots.hallCenter.clone().setY(2) };
    else if (s === 5) t = npcT('hale');
    else if (s === 6) t = npcT('brannoc');
    else if (s === 7) t = npcT('headmistress');
    else if (s === 8) t = { zone: 'grounds', pos: W.grounds.pierEnd.clone().setY(W.grounds.pierEnd.y + 2) };
    else if (s === 9) { const C = SPOTS.clearing; t = { zone: 'grounds', pos: new THREE.Vector3(C.x, groundHeight(C.x, C.z) + 3, C.z) }; }
    else if (s === 10) t = { zone: 'greatHall', pos: W.greatHall.W(0, 3, -30) };
    if (!t) return null;
    if (t.zone === G.zone.name) return t;
    const next = route(G.zone.name, t.zone);
    const portal = G.zone.portals.find((p) => p.to === next);
    return portal ? { pos: portal.pos.clone().setY(portal.pos.y + 2.5), hint: G.world.zones[next].label } : null;
  }

  update(dt) {
    const p = G.player;
    // NPCs face the player when close
    for (const n of Object.values(this.npcs)) {
      if (n.zone !== G.zone?.name) continue;
      const d = n.pos.distanceTo(p.pos);
      if (d < 7 && G.mode === 'play') n.root.rotation.y = dampAngle(n.root.rotation.y, Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z), 4, dt);
      n.model.anim.update(dt, 0);
      if (!n.waveT || n.waveT < 0) { if (d < 6 && d > 3 && Math.random() < 0.002) { n.model.anim.trigger('wave'); n.waveT = 20; } }
      else n.waveT -= dt;
    }
    if (G.zone?.name === 'greatHall') {
      this.hat.userData.update?.(G.time);
      for (const s of this.students) s.anim.update(dt, 0);
    }
    // hippogriff idles around the paddock
    if (G.zone?.name === 'grounds' && !this.hippogriff.busy) {
      const h = this.hippogriff, w = this.hippoWander, pad = SPOTS.paddock;
      w.t -= dt;
      if (w.t <= 0) { w.t = rand(4, 8); w.a = rand(0, Math.PI * 2); w.r = rand(0, 9); w.walk = Math.random() < 0.6; }
      const tx = pad.x + Math.cos(w.a) * w.r, tz = pad.z + Math.sin(w.a) * w.r;
      const dx = tx - h.root.position.x, dz = tz - h.root.position.z, dd = Math.hypot(dx, dz);
      let sp = 0;
      if (w.walk && dd > 0.5) {
        sp = 1.6;
        h.root.position.x += (dx / dd) * sp * dt; h.root.position.z += (dz / dd) * sp * dt;
        h.root.rotation.y = dampAngle(h.root.rotation.y, Math.atan2(dx, dz), 3, dt);
      }
      h.root.position.y = groundHeight(h.root.position.x, h.root.position.z);
      h.anim.set(sp > 0 ? 'walk' : 'idle');
      h.anim.update(dt, sp);
    }
    this.updateCollectibles(dt);
    // triggered encounters by position
    const s = this.stage;
    if (G.zone?.name === 'grounds' && G.mode === 'play') {
      if (s === 8 && this.encounter !== 'lake' && p.pos.distanceTo(G.world.zones.grounds.pierEnd) < 45) this.startLake();
      const C = SPOTS.clearing;
      if (s === 9 && G.save.flags.malacharDefeated && !this.encounter && !this.busy) { this.encounter = 'bossDone'; this.advance(10); }
      if (s === 9 && !this.encounter && !G.save.flags.malacharDefeated && Math.hypot(p.pos.x - C.x, p.pos.z - C.z) < 34 && !this.busy) {
        this.encounter = 'boss';
        this.run(async () => {
          G.skyObj.lock = 0.97;
          G.cam.setCinematic(new THREE.Vector3(C.x - 14, groundHeight(C.x, C.z) + 4, C.z + 10), new THREE.Vector3(C.x, groundHeight(C.x, C.z) + 2, C.z), 1.5);
          await G.ui.say([{ who: 'Malachar the Hollow', color: '#7aff9a', voice: 'low', text: 'A child. They send a CHILD into my forest. The castle’s wards will fall, little student, and its magic will be mine.' }, { who: 'Malachar the Hollow', color: '#7aff9a', voice: 'low', text: 'Come then. Show me what Hogwarts has taught you.' }]);
          this.startBoss();
        });
      }
      if (s >= 8 && s <= 9 && (p.pos.x > 110 || p.pos.distanceTo(G.world.zones.grounds.pierEnd) < 60)) G.skyObj.lock = 0.93;
      else if (this.encounter !== 'lake' && this.encounter !== 'boss' && this.encounter !== 'bossDone') G.skyObj.lock = null;
    }
    // rival houses earn points over time
    this.rivalT -= dt;
    if (this.rivalT <= 0 && G.mode === 'play') {
      this.rivalT = rand(60, 120);
      const others = HOUSE_KEYS.filter((k) => k !== G.save.house);
      const h = pick(others);
      this.addPoints(h, Math.floor(rand(3, 12)), null, true);
    }
    // music director
    this.musicT -= dt;
    if (this.musicT <= 0) {
      this.musicT = 0.5;
      if (G.mode === 'play' || G.mode === 'dialogue' || G.mode === 'cutscene') G.audio.music(this.pickMusic());
    }
  }

  pickMusic() {
    if (G.minigame) return G.minigame.music;
    const boss = G.enemies.list.find((e) => e.alive && e.def.boss && e.aggro);
    if (boss) return boss.type === 'troll' ? 'combat' : 'boss';
    if (G.enemies.list.some((e) => e.alive && e.aggro)) return 'combat';
    const z = G.zone?.name;
    if (z === 'greatHall') return 'hall';
    if (z === 'dungeon') return 'forest';
    if (z === 'grounds' && (G.player.pos.x > 120 || G.night > 0.7)) return 'forest';
    return 'castle';
  }
}
