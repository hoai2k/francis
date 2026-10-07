// The trip to school, every year: King's Cross and the barrier, the Hogwarts Express
// (friends, the sweets trolley and each year's story event on board), the train
// crossing the Highlands at dusk, then the boats (first-years) or the carriages.
import * as THREE from 'three';
import { G, HOUSES } from './state.js';
import { writeSave, autoSave } from './save.js';
import { glyph } from './input.js';
import { compCenter, makeBoat, makeCarriage } from './world/journey.js';
import { makeWizard, SKIN_TONES, HAIR_COLORS } from './models.js';
import { FRIENDS, meet } from './friends.js';
import { groundHeight, WATER_Y, PLATEAU } from './world/terrain.js';
import { sendOwl, addXP } from './progress.js';
import { rand, pick, sleep, smoothstep, lerp } from './util.js';
import { postFlash } from './engine.js';

const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
// cutscene skip: confirm/back must be pressed after the cutscene started (held state, since
// these loops run outside the main input frame)
function skipper() {
  let armed = false;
  return () => {
    const h = G.input.isHeld('confirm') || G.input.isHeld('back') || G.input.isHeld('jump');
    if (!h) armed = true;
    return armed && h;
  };
}
const until = (fn, step = 80) => new Promise((res) => {
  const tick = () => { if (G.quitting) return res(false); if (fn()) return res(true); setTimeout(tick, step); };
  tick();
});

// per-year train content: who sits with you, and an optional story event on board
export const TRAIN_EVENTS = {}; // year -> async (J) => {}  (registered by the year modules)
const COMPANIONS = { 1: ['pip', 'oren'], 2: ['pip', 'tamsin', 'kofi'], 3: ['oren', 'mei', 'pip'], 4: ['tamsin', 'kofi', 'isolde'], 5: ['ruairi', 'oren', 'mei'], 6: ['isolde', 'bram', 'pip'], 7: ['tamsin', 'oren', 'pip', 'kofi'] };

let registered = false;
function register() {
  if (registered) return;
  registered = true;
  const st = G.story;
  st.registerNPC('trolleyWitch', { name: 'Mrs Pennywhistle', voice: 'high', color: '#ffd0a0', look: { robeColor: '#6a3a5a', liningColor: '#d8a0c0', hairStyle: 'bun', hairColor: '#e8dcc0', skin: SKIN_TONES[1], scale: 0.9, noWand: true } });
  st.registerNPC('platformWitch', { name: 'A kindly witch', voice: 'mid', color: '#c0e0a0', look: { robeColor: '#3a5a3a', liningColor: '#a0c080', hairStyle: 'curly', hairColor: '#a8322a', skin: SKIN_TONES[0], hat: true, hatColor: '#3a5a3a', noWand: true } });
  const I = st.interactables;
  I.push({ npc: 'trolleyWitch', r: 2.4, label: () => 'Buy sweets from the trolley', act: () => trolleyShop() });
  I.push({ npc: 'platformWitch', r: 2.6, label: () => 'Talk to the witch', act: () => st.talk('platformWitch', ['First time at Hogwarts, dear? Nothing to it. Walk straight at the barrier between platforms nine and ten.', `Best do it at a bit of a run if you're nervous. Hold ${glyph('sprint')} and don't stop!`]) });
  I.push({ zone: 'train', get pos() { return J.seat; }, r: 1.6, label: () => 'Take your seat (ride to Hogsmeade)', cond: () => J.active && J.step === 'train' && J.canSit, act: () => { J.sit = true; } });
  // station → train doors
  const stn = G.world.zones.station;
  for (const d of stn.doors) stn.portals.push({ pos: d, r: 1.7, to: 'train', at: 'board', label: 'Board the Hogwarts Express' });
  G.world.zones.train.portals.push({ pos: G.world.zones.train.W(1.1, 0, 0.2), r: 0.9, to: 'station', at: 'magic', label: 'Step back onto the platform', locked: () => J.active && J.step === 'train' && J.departed });
}

// shared journey state (read by the interactables above and by the story marker)
export const J = { active: false, year: 1, step: null, seat: new THREE.Vector3(), canSit: false, sit: false, departed: false, quest: null, target: null, met: new Set() };

export async function runJourney(year, from = 'station') {
  register();
  if (year >= 2) await import(`./years/y${year}.js`); // registers the year's train event
  const s = G.save;
  const st = G.story;
  Object.assign(J, { active: true, year, step: from, canSit: false, sit: false, departed: false, met: new Set() });
  s.journey = { year, step: from };
  writeSave();
  st.journeyQuest = J;
  G.cam.setCinematic(null);
  G.player.root.visible = true;
  G.player.status.override = null;
  G.player.control = true;
  G.ui.showHUD(true);
  G.ui.refreshHUD();
  if (from === 'station') {
    await stationStep(year);
    if (G.quitting) return false;
  }
  if (G.zone.name !== 'train') { await G.ui.fade(1, 0.4); G.world.setZone('train', 'board'); G.cam.snap(); G.ui.fade(0, 0.5); }
  J.step = 'train';
  s.journey.step = 'train';
  writeSave();
  await trainStep(year);
  if (G.quitting) return false;
  await countrysideCutscene(year);
  if (G.quitting) return false;
  if (year === 1) await boatRide(); else await carriageRide(year);
  if (G.quitting) return false;
  J.active = false;
  st.journeyQuest = null;
  delete s.journey;
  for (const id of ['trolleyWitch', 'platformWitch']) st.hideNPC(id);
  return true;
}

// ------------------------------------------------------------------ King's Cross
async function stationStep(year) {
  const st = G.story;
  const stn = G.world.zones.station;
  await G.ui.fade(1, 0.3);
  G.world.setZone('station', 'muggle');
  G.cam.snap();
  G.mode = 'play';
  G.ui.showHUD(true);
  G.audio.music('castle');
  st.placeNPC('platformWitch', 'station', stn.W(-5.2, 0, -44), Math.PI * 0.8);
  J.quest = { title: 'Platform Nine and Three-Quarters', objective: 'Find the barrier between platforms 9 and 10.' };
  G.ui.setQuest(J.quest);
  await G.ui.fade(0, 0.8);
  G.ui.toast("King's Cross", 'zone');
  G.ui.banner(`1 September · Year ${year}`, year === 1 ? 'Your Hogwarts letter said: Platform Nine and Three-Quarters, eleven o’clock.' : 'Back to Hogwarts!', 'quest');
  J.quest = { title: 'Platform Nine and Three-Quarters', objective: `Run straight at the barrier between platforms 9 and 10. Hold ${glyph('sprint')} to run.` };
  J.target = { zone: 'station', pos: stn.W(-1.5, 2.6, -49) };
  G.ui.setQuest(J.quest);
  let passed = false, hintT = 0, through = 0;
  st.tickers.set('barrier', (dt) => {
    if (G.zone !== stn || passed) return;
    const p = G.player;
    hintT -= dt;
    const near = Math.abs(p.pos.x - stn.offset.x + 1.5) < 1.5 && p.pos.z - stn.offset.z < -47.6 && p.pos.z - stn.offset.z > -49.6;
    const speed = Math.hypot(p.vel.x, p.vel.z);
    if (near && p.vel.z < -3 && speed > 6.5) {
      // running at it: the bricks melt away
      if (!stn.barrierCol.disabled) { stn.barrierCol.disabled = true; G.audio.sfx('whoosh'); postFlash(0.25); G.input.rumble(0.3, 0.5, 200); }
      through = 0.8;
    } else if (near && hintT <= 0) {
      hintT = 4;
      G.ui.toast(`The bricks feel solid… Back up and <b>run</b> at the barrier (hold ${glyph('sprint')}).`, 'tip', 3500);
    }
    if (stn.barrierCol.disabled) {
      through -= dt;
      stn.barrierMat.emissiveIntensity = 2 + Math.sin(G.time * 30);
      if (Math.random() < 0.5) G.fx.emit({ pos: p.pos.clone().setY(p.pos.y + 1), color: 0xffd080, count: 4, speed: 2, size: 0.2, life: 0.5, intensity: 3, spread: 1.2 });
      if (p.pos.z - stn.offset.z < -51) {
        passed = true;
        stn.barrierCol.disabled = false;
        stn.barrierMat.emissiveIntensity = 1;
        G.audio.sfx('whistle');
        G.ui.banner('Platform Nine and Three-Quarters', 'The Hogwarts Express gleams scarlet through the steam.', 'unlock');
        st.tickers.delete('barrier');
      } else if (through <= 0) { stn.barrierCol.disabled = false; stn.barrierMat.emissiveIntensity = 1; }
    }
  });
  const ok = await until(() => passed || G.zone.name === 'train');
  st.tickers.delete('barrier');
  if (!ok || G.zone.name === 'train') return;
  addXP(30, 'Platform 9¾');
  J.quest = { title: 'The Hogwarts Express', objective: 'Board the train: walk into one of the carriage doors.' };
  J.target = { zone: 'station', pos: stn.doors[1].clone().setY(2.5) };
  G.ui.setQuest(J.quest);
  await until(() => G.zone.name === 'train');
}

// ------------------------------------------------------------------ on board
async function trainStep(year) {
  const st = G.story;
  const tr = G.world.zones.train;
  G.trainNight = 0;
  G.trainSnow = 0;
  G.audio.wind(0.12);
  G.audio.sfx('whistle');
  J.departed = true;
  G.ui.toast('The whistle blows — the train pulls out of the station!', 'info', 3000);
  // your friends' compartment, the trolley, and this year's companions
  const comp = compCenter(0, 4);
  const cc = tr.W(comp.x, 0, comp.z);
  J.seat.copy(cc).setZ(cc.z - 0.9);
  const friends = COMPANIONS[year] || ['pip'];
  friends.forEach((id, i) => {
    const front = i % 2 === 0;
    st.placeNPC(id, 'train', tr.W(-1.15 + Math.floor(i / 2) * 0.95, 0, comp.z + (front ? 0.9 : -0.9)), front ? Math.PI : 0, 'sit');
  });
  st.placeNPC('trolleyWitch', 'train', tr.W(1.05, 0, -CAR(1) - 8), 0);
  J.trolleyCart?.parent?.remove(J.trolleyCart);
  J.trolleyCart = trolleyCart();
  J.trolleyCart.position.copy(tr.W(1.05, 0, -CAR(1) - 9.1));
  tr.world.add(J.trolleyCart);
  J.quest = { title: 'The Hogwarts Express', objective: year === 1 ? 'Find a compartment. Someone is waving from the first carriage.' : `Find your friends in the first carriage${friends.length ? ` (${friends.map((f) => FRIENDS[f].short).join(', ')})` : ''}.` };
  J.target = { zone: 'train', pos: cc.clone().setY(2.2) };
  G.ui.setQuest(J.quest);
  // say hello to everyone in the compartment
  for (const id of friends) J.met.delete(id);
  // talking to anyone in the compartment greets the whole group
  st.friendTalkOverride = async (id) => {
    if (!J.active || !friends.includes(id) || friends.every((f) => J.met.has(f))) return false;
    for (const f of [id, ...friends.filter((x) => x !== id)]) {
      if (J.met.has(f)) continue;
      await trainHello(f, year);
      J.met.add(f);
      meet(f);
    }
    return true;
  };
  await until(() => friends.every((f) => J.met.has(f)));
  if (G.quitting) return;
  // the year's story event on board
  if (TRAIN_EVENTS[year]) { J.quest = { title: 'The Hogwarts Express', objective: 'Something is happening on the train…' }; G.ui.setQuest(J.quest); await TRAIN_EVENTS[year](J); }
  else if (year === 1) await rivalIntro();
  if (G.quitting) return;
  J.canSit = true;
  J.quest = { title: 'The Hogwarts Express', objective: 'Buy sweets from the trolley in the second carriage if you like, then take your seat in the compartment.' };
  J.target = { zone: 'train', pos: J.seat.clone().setY(2) };
  G.ui.setQuest(J.quest);
  await until(() => J.sit);
  st.friendTalkOverride = null;
  G.audio.wind(0);
}
const CAR = (n) => n * 20;

function trolleyCart() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.6 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 1.3), wood);
  box.position.y = 0.6; box.castShadow = true;
  g.add(box);
  const cols = [0xff5050, 0x50c0ff, 0xffe040, 0x70ff70, 0xc08040, 0xff80e0];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), new THREE.MeshStandardMaterial({ color: cols[i % 6], roughness: 0.5 }));
    m.position.set(-0.25 + (i % 3) * 0.25, 1.1 + Math.floor(i / 6) * 0.11, -0.4 + Math.floor(i / 3) % 2 * 0.3 + (i % 2) * 0.15);
    g.add(m);
  }
  return g;
}

async function trainHello(id, year) {
  const F = FRIENDS[id];
  const st = G.story;
  const first = !G.save.friends?.[id];
  const lines = first ? {
    pip: ['Oh! Is this seat taken? No? Brilliant. I’m Pip — Pip Fenwick. First year, like you, I bet!', 'I’ve got a hundred and four Chocolate Frog cards. Well. A hundred and three. Agrippa escaped.'],
    oren: ['Oren Achterberg. From Whitby. I read all our set books over the summer, which my sister says is tragic.', 'Did you know the castle ceiling is enchanted to look like the real sky? I intend to check it against my star charts.'],
    tamsin: ['Budge up! Tamsin Hollowell, Cardiff, future Beater for the house team — you watch.'],
    kofi: ['Kofi Mensah-Lowe. Want a Ton-Tongue toffee? …No? Smart. Very smart.'],
    isolde: ['Isolde Varga. Yes, a Slytherin in a Gryffindor-ish compartment. Try not to faint.'],
    ruairi: ['Ruairí. From Galway. Mind the box — there’s a hedgehog in it. Long story.'],
    mei: ['Mei Lin Chau. I hear you can duel. We should find out who’s better.'],
    bram: ['…Bram. Edinburgh. I like plants. Sorry, I’m not good at introductions.'],
  }[id] : [pick(['There you are! I saved you a seat.', 'Good summer? Mine was far too long.', `Year ${year}! Can you believe it?`, 'I was starting to think you’d missed the train!'])];
  await st.talk(id, lines || ['Hello!']);
  if (first) G.ui.toast(`<b>${F.name}</b> · ${HOUSES[F.house].name} · from ${F.home}`, 'info', 3500);
}

async function rivalIntro() {
  const st = G.story;
  const tr = G.world.zones.train;
  J.quest = { title: 'The Hogwarts Express', objective: 'Someone is at the compartment door…' };
  G.ui.setQuest(J.quest);
  const p = G.player;
  st.placeNPC('cassius', 'train', tr.W(1.0, 0, p.pos.z - tr.offset.z - 1.6), Math.PI, 'idle');
  st.npcs.cassius.root.rotation.y = Math.atan2(p.pos.x - st.npcs.cassius.pos.x, p.pos.z - st.npcs.cassius.pos.z);
  await sleep(300);
  await new Promise((res) => st.run(async () => {
    const c = await st.talk('cassius', [
      'So this is where the first-years hide. Cassius Vane. You’ll have heard of my family — my father practically runs the Department of Magical Law Enforcement.',
      { who: FRIENDS.cassius.name, color: FRIENDS.cassius.color, text: 'Some company is better than others. I could show you which, if you like.', choices: ['I can choose my own friends, thanks.', 'Maybe. Nice to meet you, Cassius.', 'Your father sounds exhausting.'], speaker: (on) => st.npcs.cassius.model.anim.set(on ? 'talk' : 'idle') },
    ]);
    meet('cassius');
    const f = G.save.friends.cassius;
    if (c === 1) { f.f += 6; await st.talk('cassius', ['…Hm. Manners. That’s something. We’ll see which house the Hat puts you in.']); }
    else if (c === 2) { await st.talk('cassius', ['Careful. People who make jokes about the Vanes don’t tend to enjoy Hogwarts.']); }
    else await st.talk('cassius', ['Suit yourself. Don’t come crying to me when you’re sharing a table with Hufflepuffs.']);
    st.hideNPC('cassius');
    res();
  }));
}

// ------------------------------------------------------------------ sweets trolley
async function trolleyShop() {
  const st = G.story;
  await st.talk('trolleyWitch', [pick(['Anything from the trolley, dears?', 'Sweets! Lovely sweets! Anything from the trolley?', 'Chocolate Frogs fresh today — mind they don’t hop off!'])]);
  const { openShop } = await import('./menus.js');
  await openShop('trolley');
}

// ------------------------------------------------------------------ the train crossing the Highlands
export async function countrysideCutscene(year) {
  const cs = G.world.zones.countryside;
  await G.ui.fade(1, 0.6);
  G.mode = 'cutscene';
  G.ui.showHUD(false);
  cs.reset();
  const winter = false;
  G.world.setZone('countryside', { pos: cs.trainPos(), yaw: 0 });
  G.player.root.visible = false;
  G.skyObj.lock = null;
  G.skyObj.tod = 0.6;
  const startT = G.realTime;
  const DUR = 13;
  G.ui.toast(`Press ${glyph('confirm')} to skip`, 'info', 2500);
  G.audio.music('menu');
  await G.ui.fade(0, 0.8);
  G.ui.banner('The Hogwarts Express', 'North through the Highlands, as the sun goes down', 'quest');
  const skip = skipper();
  await new Promise((res) => {
    const tick = () => {
      if (G.quitting) return res();
      const t = G.realTime - startT;
      const k = t / DUR;
      G.skyObj.tod = lerp(0.6, 0.88, smoothstep(0.05, 0.95, k));
      const tp = cs.trainPos();
      G.player.pos.copy(tp);
      // three shots: wide side, low ahead, high and behind
      let cam, look;
      if (k < 0.36) { cam = tp.clone().add(new THREE.Vector3(-30 + t * 2, 9, 42)); look = tp.clone().add(new THREE.Vector3(20, 0, 0)); }
      else if (k < 0.7) { cam = new THREE.Vector3(tp.x + 70 - (t - DUR * 0.36) * 14, 3, tp.z - 9); look = tp.clone().add(new THREE.Vector3(30, 2, 0)); }
      else { cam = tp.clone().add(new THREE.Vector3(-55, 32, -26)); look = tp.clone().add(new THREE.Vector3(40, 0, 0)); }
      G.cam.setCinematic(cam, look, 100);
      if (t > DUR || skip()) return res();
      requestAnimationFrame(tick);
    };
    tick();
  });
  G.audio.sfx('whistle');
  await G.ui.fade(1, 0.6);
}

// ------------------------------------------------------------------ boats across the Black Lake (first-years)
export async function boatRide() {
  const g = G.world.zones.grounds;
  G.world.setZone('grounds', { pos: new THREE.Vector3(-290, WATER_Y, -40), yaw: Math.PI / 2 });
  G.skyObj.lock = 0.9;
  G.skyObj.tod = 0.9;
  G.mode = 'cutscene';
  G.ui.showHUD(false);
  const p = G.player;
  p.root.visible = true;
  p.status.override = 'sit';
  const boats = [];
  const kids = [];
  const path = (k, lane) => new THREE.Vector3(lerp(-300, -118, k) + lane * 0.5, WATER_Y + 0.32 + Math.sin(G.time * 1.3 + lane) * 0.06, -40 + lane * 7 + Math.sin(k * 3 + lane) * 4);
  for (let i = 0; i < 5; i++) {
    const b = makeBoat();
    g.world.add(b);
    boats.push({ b, lane: i - 2, lag: [-0.05, -0.02, 0, -0.035, 0.01][i] });
    if (i !== 2) for (let k = 0; k < 2; k++) {
      const w = makeWizard({ skin: pick(SKIN_TONES), hairColor: pick(HAIR_COLORS), hairStyle: pick(['short', 'long', 'curly', 'bun', 'messy', 'ponytail']), noWand: true, scale: 0.85, noShadow: true });
      w.anim.set('sit');
      w.root.position.set(0, 0.15, k ? -0.7 : 0.7);
      b.add(w.root);
      kids.push(w);
    }
  }
  const lamp = G.lights.attach(boats[2].b.userData.lamp, 0xffc070, 30, 10);
  await G.ui.fade(0, 0.8);
  G.ui.banner('The Black Lake', 'First-years always arrive by boat', 'quest');
  G.audio.music('hall');
  const DUR = 14, t0 = G.realTime;
  const skip = skipper();
  await new Promise((res) => {
    const tick = () => {
      if (G.quitting) return res();
      const t = G.realTime - t0, k = Math.min(1, t / DUR);
      for (const o of boats) {
        const pos = path(Math.max(0, k - o.lag), o.lane);
        o.b.position.copy(pos);
        o.b.rotation.y = Math.PI / 2 + Math.sin(G.time * 0.8 + o.lane) * 0.04;
        o.b.rotation.z = Math.sin(G.time * 1.4 + o.lane) * 0.03;
      }
      const me = boats[2].b;
      p.pos.copy(me.position).add(new THREE.Vector3(0, 0.15, 0));
      p.root.position.copy(p.pos);
      p.root.rotation.y = Math.PI / 2;
      p.yaw = Math.PI / 2;
      for (const w of kids) w.anim.update(1 / 60, 0);
      p.anim.update(1 / 60, 0);
      if (Math.random() < 0.3) G.fx.emit({ pos: me.position.clone().add(new THREE.Vector3(-1.8, 0.1, rand(-0.6, 0.6))), color: 0xbfd8ff, count: 1, speed: 0.4, size: 0.12, life: 0.8, intensity: 1.5, noScale: true });
      // camera: behind the boats, then rising to reveal the castle on its cliff
      const rise = smoothstep(0.35, 0.8, k);
      const cam = me.position.clone().add(new THREE.Vector3(-6 + rise * 1, 2.2 + rise * 8, 3 - rise * 1.5));
      const look = me.position.clone().lerp(new THREE.Vector3(0, PLATEAU + 25, -60), 0.25 + rise * 0.6);
      G.cam.setCinematic(cam, look, t < 0.1 ? 100 : 3);
      if (k >= 1 || skip()) return res();
      requestAnimationFrame(tick);
    };
    tick();
  });
  await G.ui.fade(1, 0.6);
  lamp.release();
  for (const o of boats) g.world.remove(o.b);
  p.status.override = null;
}

// ------------------------------------------------------------------ carriages up the road (later years)
export async function carriageRide(year) {
  const g = G.world.zones.grounds;
  G.world.setZone('grounds', { pos: new THREE.Vector3(0, groundHeight(0, 92), 92), yaw: Math.PI });
  G.skyObj.lock = 0.9;
  G.skyObj.tod = 0.9;
  G.mode = 'cutscene';
  G.ui.showHUD(false);
  G.player.root.visible = false;
  const cars = [];
  for (let i = 0; i < 4; i++) { const c = makeCarriage(); g.world.add(c); cars.push(c); }
  const thestrals = year >= 5 && G.makeThestral ? cars.map((c) => { const t = G.makeThestral(); c.add(t.root); t.root.position.set(0, 0, 3.4); return t; }) : [];
  const lamp = G.lights.attach(cars[1], 0xffc070, 30, 10);
  await G.ui.fade(0, 0.8);
  G.ui.banner('Up to the castle', year >= 5 ? 'The carriages are pulled by Thestrals. You can see them now.' : 'The carriages pull themselves up the road… or seem to.', 'quest');
  G.audio.music('hall');
  const DUR = 11, t0 = G.realTime;
  const skip = skipper();
  await new Promise((res) => {
    const tick = () => {
      if (G.quitting) return res();
      const t = G.realTime - t0, k = Math.min(1, t / DUR);
      cars.forEach((c, i) => {
        const z = lerp(96, 22, Math.max(0, k - i * 0.05)) + i * 9 - 9;
        c.position.set(Math.sin(z * 0.05) * 1.5, groundHeight(0, z), z);
        c.rotation.y = Math.PI;
        c.rotation.z = Math.sin(G.time * 7 + i) * 0.012;
      });
      thestrals.forEach((t) => t.anim?.update(1 / 60, 3));
      G.player.pos.copy(cars[1].position);
      const cam = cars[1].position.clone().add(new THREE.Vector3(5, 3 + k * 4, 8));
      const look = cars[1].position.clone().lerp(new THREE.Vector3(0, PLATEAU + 18, -30), 0.3 + k * 0.4);
      G.cam.setCinematic(cam, look, t < 0.1 ? 100 : 3);
      if (k >= 1 || skip()) return res();
      requestAnimationFrame(tick);
    };
    tick();
  });
  await G.ui.fade(1, 0.6);
  lamp.release();
  for (const c of cars) g.world.remove(c);
  G.player.root.visible = true;
}

// ------------------------------------------------------------------ start of a new school year (Year 2+)
export async function beginYear(n) {
  const s = G.save;
  if (n < 2 || n > 7 || !G.story.yearAvailable(n)) return;
  s.year = n;
  s.yearDone = false;
  s.yq = 0;
  s.flags[`y${n}`] = {};
  s.coins = (s.coins || 0) + 20;
  G.ui.closeAll();
  G.paused = false;
  sendOwl(`y${n}-letter`, 'Headmistress Aldmoor', `Your ${ORD[n]} year`, `Dear ${s.name}, the Hogwarts Express leaves King’s Cross at eleven o’clock on 1 September. ${n === 3 ? 'Third-years may now visit Hogsmeade at weekends with a signed permission form.' : n === 5 ? 'This is your O.W.L. year. Work hard.' : n === 7 ? 'Your final year. Whatever comes, Hogwarts stands with you.' : 'We look forward to welcoming you back.'}`);
  G.spells.selected = 0;
  autoSave(true);
  G.ui.buildSpellBar();
  G.ui.toast(`A new spell slot unlocked! You can now equip ${Math.min(8, 3 + n)} spells.`, 'tip', 4500);
  const ok = await runJourney(n);
  if (!ok) return;
  await G.story.startYear(n);
}
