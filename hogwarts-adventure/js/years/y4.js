// Year 4 — The Ember Cup. Two visiting schools, a goblet of fire that names a fourth
// champion it never should have, a dragon, the bed of the Black Lake, a hedge maze — and a
// graveyard where the Hollow King rises again.
import * as THREE from 'three';
import { G } from '../state.js';
import { TRAIN_EVENTS } from '../journey.js';
import { SKIN_TONES } from '../models.js';
import { web, chest, crackedWall, ledgeItem } from '../puzzles.js';
import { groundHeight, PLATEAU, SPOTS } from '../world/terrain.js';
import { FRIENDS, meet, friendLevel } from '../friends.js';
import { addItem, itemCount } from '../items.js';
import { sleep, rand } from '../util.js';
import { postFlash, setFrost } from '../engine.js';

const Z = () => G.world.zones;
const gh = (x, y, z) => Z().greatHall.W(x, y, z);
const gr = (x, z, dy = 0) => new THREE.Vector3(x, groundHeight(x, z) + dy, z);
const pitch = (dx = 0, dz = 0) => new THREE.Vector3(SPOTS.pitch.x + dx, Z().grounds.pitchY, SPOTS.pitch.z + dz);
const F = () => G.save.flags.y4;
const until = (fn, max = 1e9) => new Promise((res) => { const t0 = performance.now(); const t = () => (G.quitting ? res(false) : fn() ? res(true) : performance.now() - t0 > max ? res(false) : setTimeout(t, 100)); t(); });
const partner = () => F().partner || 'pip';
const fname = (id) => FRIENDS[id]?.short || FRIENDS[id]?.name || id;

const NPCS = {
  calloway: { name: 'Professor Calloway', voice: 'low', color: '#e0a070', look: { robeColor: '#3a2a1a', liningColor: '#a04a20', hairStyle: 'short', hairColor: '#5a5a5a', beard: 'short', beardColor: '#6a6a6a', skin: SKIN_TONES[3], scale: 1.08 } },
  roth: { name: 'Anneliese Roth', voice: 'mid', color: '#d06060', look: { robeColor: '#5a1a1a', liningColor: '#2a2a2a', hairStyle: 'ponytail', hairColor: '#e0d0a0', skin: SKIN_TONES[0], scale: 1.0 } },
  laurent: { name: 'Thibault Laurent', voice: 'mid', color: '#80b0ff', look: { robeColor: '#7a9ad8', liningColor: '#e0e8ff', hairStyle: 'curly', hairColor: '#2a1a10', skin: SKIN_TONES[2], scale: 1.02 } },
  hartwell: { name: 'Aurelia Hartwell', voice: 'high', color: '#ffd080', look: { house: 'hufflepuff', hairStyle: 'long', hairColor: '#3a2010', skin: SKIN_TONES[4], scale: 1.0 } },
  hollowking: { name: 'The Hollow King', voice: 'low', color: '#40ff70', look: { robeColor: '#0a0a0c', liningColor: '#0a3a1a', mask: true, eyeGlow: '#40ff70', skin: '#e8e4dc', bald: true, scale: 1.4 } },
  grimshaw: { name: 'Undersecretary Grimshaw', voice: 'high', color: '#b8a8d8', look: { robeColor: '#5a4a6a', liningColor: '#b8a8d8', hairStyle: 'bun', hairColor: '#4a3a2a', skin: SKIN_TONES[0], hat: true, hatColor: '#5a4a6a', scale: 0.92 } },
};

// ------------------------------------------------------------------ props
let egg = null;
function goldenEgg(on) {
  if (on && !egg) {
    egg = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffc040, metalness: 1, roughness: 0.25, emissive: 0x402000 }));
    m.scale.set(1, 1.3, 1);
    egg.add(m);
    const nest = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.35, 6, 12), new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 1 }));
    nest.rotation.x = Math.PI / 2; nest.position.y = -0.4;
    egg.add(nest);
    egg.position.copy(pitch(0, 0)).setY(Z().grounds.pitchY + 0.6);
    Z().grounds.world.add(egg);
  }
  if (egg) egg.visible = !!on;
}
let goblet = null;
function emberGoblet(on) {
  if (on && !goblet) {
    goblet = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.7 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.25, 0.9, 12, 1, true), wood); cup.position.y = 1.6; goblet.add(cup);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.2, 8), wood); stem.position.y = 0.6; goblet.add(stem);
    const fire = new THREE.PointLight(0x60a0ff, 6, 8); fire.position.y = 2.3; goblet.add(fire);
    goblet.userData.fire = fire;
    goblet.position.copy(gh(0, 0, -14));
    Z().greatHall.world.add(goblet);
  }
  if (goblet) goblet.visible = !!on;
}
let websMade = false;
function forestWebs() {
  if (websMade) return;
  websMade = true;
  const P = G.puzzles;
  [[178, 40], [198, 44], [216, 38]].forEach(([x, z], i) => web(P, `y4-web-${i}`, 'grounds', gr(x, z), Math.PI / 2, 5, 4));
}
let sideBuilt = false;
function sidePuzzles() {
  if (sideBuilt) return;
  sideBuilt = true;
  const P = G.puzzles;
  // Tamsin's Confringo challenge: three cracked walls in the dungeon and on the grounds
  crackedWall(P, 'y4-wall-0', 'grounds', gr(-60, 40), 0.4, 3, 3);
  crackedWall(P, 'y4-wall-1', 'grounds', gr(40, 120), -0.6, 3, 3);
  crackedWall(P, 'y4-wall-2', 'grounds', gr(-30, 175), 0.1, 3, 3);
  // Mei's lost camera is in a locked chest by the lake; Durmvald ship's lantern on a high ledge
  chest(P, 'y4-mei-chest', 'grounds', gr(SPOTS.lakeShore.x + 8, SPOTS.lakeShore.z - 6), 0.6, { coins: 30 });
  ledgeItem(P, 'y4-lantern', 'grounds', gr(SPOTS.lakeShore.x - 14, SPOTS.lakeShore.z + 10, 7), { coins: 25 });
}

// ------------------------------------------------------------------ the train: the Hollow Mark over the moors
TRAIN_EVENTS[4] = async () => {
  const st = G.story;
  const tr = Z().train;
  G.ui.toast('A green glow spreads across the sky outside…', 'info', 2500);
  G.trainNight = 1;
  await sleep(800);
  await new Promise((res) => st.run(async () => {
    await st.talk('oren', ['Everyone — look out of the window. Above the moor. That’s… that’s the Hollow Mark. A skull with a crown of thorns.', 'Malachar’s people put it up over the Quidditch World Final last month. The papers said it was a prank.']);
    await st.talk('kofi', ['My Wildfire Whizzbangs are NOT a prank. They are an ART. Speaking of which — I may have packed a box of pixies by mistake. And it may be open.']);
    res();
  }));
  const p = G.player;
  G.enemies.hpScale = 0.8; G.enemies.dmgScale = 0.7;
  for (let i = 0; i < 4; i++) G.enemies.spawn('pixie', tr.W(1.1, 1.6, p.pos.z - tr.offset.z - 3 - i * 1.5), { aggro: true });
  G.ui.toast('Pixies in the carriage! Stupefy, Glacius or Flipendo them.', 'tip', 3500);
  await until(() => !G.enemies.list.some((e) => e.alive), 60000);
  for (const e of G.enemies.list) if (e.alive) e.die({});
  G.trainNight = 0;
  await new Promise((res) => st.run(async () => { await st.talk('kofi', ['…Right. Never speak of this. Who wants a Chocolate Frog?']); res(); }));
};

export default {
  n: 4,
  title: 'The Ember Cup',
  feast: [
    'Welcome! This year Hogwarts has the honour of hosting a legendary event: the Ember Cup.',
    'Three schools — Hogwarts, the Durmvald Institute and the Beaumanoir Academy — will each send one champion to face three tasks.',
    'The Ember Goblet will choose the champions on Hallowe’en. Only students of age may enter.',
    'Please welcome Professor Ignatius Calloway, retired Auror, who will teach Defence Against the Dark Arts — and the Ministry’s tournament judge, Undersecretary Grimshaw.',
  ],
  cupLines: [
    'This year the Ember Cup came to Hogwarts. It ended in a graveyard.',
    'The Hollow King has returned. I will not hide that from you. But one of our own looked him in the face and came home. Remember that.',
  ],
  setup() {
    const s = G.story;
    for (const [id, d] of Object.entries(NPCS)) s.registerNPC(id, d);
    s.addTalker('calloway', 'Talk to Professor Calloway', () => s.talk('calloway', ['Constant vigilance? No. Constant PRACTICE. Vigilance comes free with the scars.']));
    s.addTalker('roth', 'Talk to Anneliese Roth', () => s.talk('roth', [F().task1 ? 'You faced the dragon well. At Durmvald we would have given you a medal. And extra homework.' : 'Fourth champion. Interesting. Do not get in my way in the arena, little one.']));
    s.addTalker('laurent', 'Talk to Thibault Laurent', () => s.talk('laurent', ['Bonjour! Your castle is… draughty. But the puddings! Magnifique.']));
    s.addTalker('hartwell', 'Talk to Aurelia Hartwell', () => s.talk('hartwell', [F().graveyard ? 'You pulled me through that portkey. I won’t forget it. Ever.' : 'Two Hogwarts champions! Let’s show them what a little school spirit can do.']));
    s.addTalker('grimshaw', 'Talk to Undersecretary Grimshaw', () => s.talk('grimshaw', ['Hem, hem. Champions should be resting, dear. Not wandering.']));
    sidePuzzles();
  },
  placeNPCs(Y) {
    const s = G.story;
    const q = G.save.yq;
    s.placeNPC('calloway', 'greatHall', gh(5, 0.8, -31), -0.3);
    s.placeNPC('grimshaw', 'greatHall', gh(-5, 0.8, -31), 0.3);
    s.placeNPC('duskwood', 'greatHall', gh(8, 0, -26), -0.5);
    s.placeNPC('roth', 'greatHall', gh(-9, 0, -6), 0.8);
    s.placeNPC('laurent', 'greatHall', gh(9, 0, -6), -0.8);
    s.placeNPC('hartwell', 'greatHall', gh(-3, 0, -8), 0.4);
    if (q === 8) s.placeNPC('headmistress', 'grounds', gr(SPOTS.lakeShore.x + 4, SPOTS.lakeShore.z + 6), Math.PI * 0.75);
    if (q === 3) s.placeNPC('hale', 'grounds', pitch(0, 30), Math.PI);
    emberGoblet(q <= 1);
    if (q === 4) forestWebs();
    goldenEgg(q === 3 && (Y.si || 0) >= 2);
  },
  quests: [
    // 1 — the goblet chooses
    { title: 'The Ember Goblet', from: 'Headmistress Aldmoor', letter: 'Hallowe’en feast tonight. The Ember Goblet will name the champions. Attendance is not optional. — M. Aldmoor', steps: [
      { type: 'talk', npc: 'headmistress', obj: 'Join the Hallowe’en feast — talk to the Headmistress by the Ember Goblet.', lines: [
        'The Goblet is ready. Its flames will turn red when it names a champion. Stand back, please.',
      ] },
      { type: 'script', obj: 'The Ember Goblet chooses…', run: async () => {
        const s = G.story;
        const c = gh(0, 0, -14);
        G.cam.setCinematic(c.clone().add(new THREE.Vector3(5, 3, 7)), c.clone().setY(c.y + 2), 1.4);
        const flare = async (name) => { goblet.userData.fire.color.set(0xff3020); goblet.userData.fire.intensity = 30; G.fx.burst(c.clone().setY(c.y + 2.4), 0xff5020, 50, 5); G.audio.sfx('confringo'); await sleep(500); goblet.userData.fire.color.set(0x60a0ff); goblet.userData.fire.intensity = 6; };
        await flare(); await s.talk('headmistress', ['The champion for the Durmvald Institute: Anneliese Roth!']);
        await flare(); await s.talk('headmistress', ['For the Beaumanoir Academy: Thibault Laurent!']);
        await flare(); await s.talk('headmistress', ['And for Hogwarts: Aurelia Hartwell!']);
        await sleep(600);
        await flare(); G.cam.shake(0.3);
        await s.talk('headmistress', [`…${G.save.name}.`, `${G.save.name}?! You are fourteen. You cannot have—`]);
        await s.talk('grimshaw', ['Hem, hem. The Goblet’s choice is a binding magical contract, Headmistress. The Ministry insists the child competes.']);
        await s.talk('pip', ['You didn’t put your name in. I KNOW you didn’t. Someone wants you in this tournament. That’s worse.']);
        G.cam.setCinematic(null);
        F().chosen = true;
      } },
    ], points: 20 },
    // 2 — Confringo
    { title: 'A Retired Auror', from: 'Professor Calloway', letter: 'Champion. My classroom — that is, the Great Hall — after breakfast. You’ll need more than Stupefy. — I. Calloway', steps: [
      { type: 'talk', npc: 'calloway', obj: 'Find Professor Calloway at the staff table.', lines: [
        'Fourteen and fed to a tournament. Someone in this castle wants you dead, and they’ve dressed it up as an honour.',
        'So: Confringo. A blasting curse. It explodes on impact and hurts everything near it. Use it on groups, on walls, on anything that needs to stop being in your way.',
      ], after: () => G.spells.unlock('confringo') },
      { type: 'fight', zone: 'greatHall', obj: 'Blast the practice dummies and the doxies Calloway released (Confringo hits groups).',
        spawn: () => { for (const [x, z] of [[-5, -24], [0, -26], [5, -24]]) G.enemies.spawn('dummy', gh(x, 0, z), { yaw: 0 }); for (let i = 0; i < 5; i++) G.enemies.spawn('pixie', gh(rand(-6, 6), 2, -20 - rand(0, 4)), { aggro: true, name: 'Doxy' }); } },
      { type: 'talk', npc: 'calloway', obj: 'Report to Professor Calloway.', lines: ['Not bad. Now — a word you didn’t hear from me. The first task involves something big, with wings, that breathes. Go and see Brannoc after dark.'] },
    ], points: 25 },
    // 3 — Descendo + dragons
    { title: 'Here Be Dragons', from: 'Brannoc the Groundskeeper', letter: 'Come down ter the paddock after dark. Bring yer cloak. Don’t tell no one. — B.', steps: [
      { type: 'minigame', npc: 'thornwick', id: 'wanddraw', obj: 'First, Professor Thornwick wants to teach you Descendo.', lines: ['Descendo! It drags things DOWN — ledges, bridges, and anything flying that ought not to be. A sharp downward stroke!'], pass: (r) => r.success, win: ['Splendid. Anything that flies had better watch out.'], done: () => G.spells.unlock('descendo') },
      { type: 'go', zone: 'grounds', pos: () => gr(SPOTS.paddock.x - 4, SPOTS.paddock.z - 8), r: 6, obj: 'Meet Brannoc by the paddock after dark.', enter: () => { G.skyObj.lock = 0.9; }, run: async () => {
        const s = G.story;
        s.placeNPC('brannoc', 'grounds', gr(SPOTS.paddock.x - 6, SPOTS.paddock.z - 10), 0.5);
        await s.talk('brannoc', [
          'Dragons. Four of ’em, brought in on carts from Romania. One for each champion — yeh have ter get past it an’ grab a golden egg.',
          'Yours is a Ridgeback. Mean as a cornered boggart. Yeh can’t stun a dragon with one spell — it’d take a dozen wizards.',
          'Watch its tail an’ its breath. When it flies — that new Descendo’ll drag it down. An’ ice an’ water hurt it worse than anything.',
        ]);
        G.skyObj.lock = null;
      } },
    ], points: 25 },
    // 4 — the first task
    { title: 'The First Task', from: 'Undersecretary Grimshaw', autosave: true, letter: 'The first task begins at noon at the Quidditch pitch. Champions will be issued no assistance. — P. Grimshaw, Tournament Judge', steps: [
      { type: 'talk', npc: 'hale', obj: 'Go down to the arena at the Quidditch pitch. Madam Hale is marshalling the champions.', lines: [
        'The others have gone already — every one of them got their egg. You’re last, love. The crowd’s on its feet.',
        'Get past the dragon, take the golden egg. Good luck. And DUCK.',
      ] },
      { type: 'fight', zone: 'grounds', obj: 'Subdue the Ridgeback! Glacius and Aguamenti hurt it most; Descendo drags it out of the sky.', at: () => pitch(0, 0), r: 70,
        intro: async () => {
          const C = pitch(0, 0);
          G.cam.setCinematic(C.clone().add(new THREE.Vector3(-14, 6, 14)), C.clone().setY(C.y + 3), 1.4);
          G.audio.sfx('roar'); G.cam.shake(0.5);
          await G.ui.say([{ who: 'Commentator', color: '#ffd27a', voice: 'mid', text: 'And here comes our fourth champion — the youngest in the history of the Cup — to face the Hungarian— no, sorry, the Highland Ridgeback!' }]);
          G.cam.setCinematic(null);
        },
        spawn: () => { const C = pitch(0, 0); const d = G.enemies.spawn('dragon', pitch(0, -12), { center: C, aggro: true, color: '#3a2a1a' }); d.yaw = 0; },
        respawn: () => ({ pos: pitch(0, 22), yaw: Math.PI }) },
      { type: 'go', zone: 'grounds', pos: () => pitch(0, 0), r: 2.5, obj: 'Grab the golden egg from the nest!', enter: () => goldenEgg(true), run: async () => {
        goldenEgg(false);
        G.audio.sfx('victory'); postFlash(0.2);
        G.ui.banner('You got the golden egg!', 'The crowd goes wild', 'unlock');
        addItem('egg', 1);
        F().task1 = true;
        await sleep(1200);
        await G.story.talk('hale', ['THAT is how it’s done! Joint first place with Roth! The judges are… well, Grimshaw gave you a four. The rest gave tens.']);
      } },
    ], points: 60 },
    // 5 — into the forest
    { title: 'The Spiders’ Hollow', from: 'Ruairí Doyle', letter: 'Brannoc’s gone into the forest after something that’s been taking the Thestral foals. He’s been gone a day. Please — meet me at his hut. — Ruairí', steps: [
      { type: 'talk', npc: 'isolde', obj: 'Isolde says she knows a spell for webs. Find her in the Potions classroom first.', lines: [
        'Spiders. Acromantulas, if Ruairí is right — they’re the size of carriage horses. Their webs are stronger than rope.',
        'Diffindo: a severing charm. It cuts webs, ropes, curtains… and it bites into anything that isn’t armoured. Draw it like a slash.',
      ], after: () => { G.spells.unlock('diffindo'); meet('isolde'); forestWebs(); } },
      { type: 'puzzle', ids: ['y4-web-0', 'y4-web-1', 'y4-web-2'], obj: 'Follow the spider trail east into the Forbidden Forest. Cut through the webs with Diffindo (or burn them).', enter: () => forestWebs() },
      { type: 'fight', zone: 'grounds', obj: 'The acromantulas’ hollow! Drive the spiders back and find Brannoc.', at: () => gr(236, 52), r: 26,
        waves: [
          () => { for (let i = 0; i < 4; i++) G.enemies.spawn('spider', gr(236 + rand(-10, 10), 64 + rand(-4, 6)), { aggro: true }); },
          () => { G.enemies.spawn('spider', gr(240, 70), { aggro: true, scale: 2, hp: 600, name: 'Old Mokkra' }); for (let i = 0; i < 2; i++) G.enemies.spawn('spider', gr(230 + i * 12, 66), { aggro: true }); },
        ],
        waveIntro: async (Y, w) => { if (w === 1) G.ui.banner('Old Mokkra', 'The matriarch of the hollow — fire and Diffindo hurt her', ''); },
        win: async () => {
          const s = G.story;
          s.placeNPC('brannoc', 'grounds', gr(240, 60), Math.PI);
          await s.talk('brannoc', ['Yeh came fer me! Got meself stuck in a web like a daft fly. The spiders’ve been herded out o’ the deep forest — somethin’ drove ’em. Somethin’ dark, in the old graveyard country north o’ here.', 'Thank yeh. Now let’s get out before the rest wake up.']);
          G.story.hideNPC('brannoc');
        } },
    ], points: 40 },
    // 6 — the egg
    { title: 'The Golden Egg', from: 'Aurelia Hartwell', letter: 'Psst — your egg screams when you open it, right? Mine too. Try opening it under water. Trust me. — Aurelia', steps: [
      { type: 'go', zone: 'grounds', pos: () => gr(SPOTS.lakeShore.x, SPOTS.lakeShore.z), r: 6, obj: 'Take the golden egg to the lake shore and open it under the water.', run: async () => {
        G.audio.sfx('splash');
        await G.ui.say([
          { who: 'The golden egg', color: '#ffd040', voice: 'high', text: '♪ Come seek us where our voices sound, we cannot sing above the ground… ♪' },
          { who: 'The golden egg', color: '#ffd040', voice: 'high', text: '♪ An hour long you’ll have to look, to recover what we took… ♪' },
        ]);
        await G.story.talk('hartwell', ['Merfolk. In the lake. They’re going to take something from each of us — someone — and we’ll have an hour to get them back.']);
      } },
    ], points: 25 },
    // 7 — the Yule Ball (mid-year twist)
    { title: 'The Yule Ball', from: 'Professor Thornwick', autosave: true, letter: 'Champions open the Yule Ball with the first dance! Dress robes, partners, and PLEASE practise. — F. Thornwick', steps: [
      { type: 'talk', npc: 'pip', obj: 'Find a partner for the Yule Ball. Ask a friend.', lines: (Y) => {
        const opts = ['pip', 'oren', 'tamsin', 'isolde', 'mei', 'kofi'].filter((id) => FRIENDS[id]);
        Y._partners = opts;
        return [{ text: 'The Yule Ball! Champions have to dance first — in front of EVERYONE. Who are you going to ask?', choices: opts.map((id) => (id === 'pip' ? 'You, Pip!' : fname(id))) }];
      }, after: async (Y, r) => {
        const id = Y._partners?.[r] || 'pip';
        F().partner = id;
        meet(id);
        G.save.friends[id].f = (G.save.friends[id].f || 0) + 15;
        await G.story.talk(id, [id === 'pip' ? 'ME? Oh, YES. I’ll wear the gold robes. Mum will cry.' : 'Me? …Yes. Yes, I’d like that very much. Don’t step on my feet.']);
      } },
      { type: 'minigame', npc: 'thornwick', id: 'dance', opts: () => ({ partner: partner() }), obj: 'Open the Yule Ball in the Great Hall — talk to Professor Thornwick when you are ready to dance.', enter: () => { G.save.flags.xmas = 4; },
        lines: ['The band is ready! Champions — to the floor! Follow the beat, and smile!'], pass: (r) => r.success, win: ['Bravo! Bravissimo! Now everyone — DANCE!'], lose: ['A little stiff, but the night is young. Shall we try again?'] },
      { type: 'script', obj: 'Get some air outside the Great Hall.', run: async () => {
        const s = G.story;
        await G.ui.fade(1, 0.4);
        G.world.setZone('grounds', { pos: new THREE.Vector3(2, PLATEAU, -14), yaw: Math.PI });
        G.skyObj.lock = 0.92;
        s.placeNPC('grimshaw', 'grounds', new THREE.Vector3(-6, PLATEAU, 2), 0.5);
        s.placeNPC('calloway', 'grounds', new THREE.Vector3(-3, PLATEAU, 4), -2.4);
        await G.ui.fade(0, 0.5);
        G.ui.toast('Voices behind the rose bushes…', 'info', 2500);
        await G.ui.say([
          { ...s.speaker('calloway'), text: 'I’ve seen the Goblet’s ledger, Prudence. Somebody confunded it to name a fourth school — a school of one. And the judge’s seal is on it.' },
          { ...s.speaker('grimshaw'), text: 'Careful, old man. Accusations are so very… unhealthy.' },
          { ...s.speaker('grimshaw'), text: 'The child competes. The child wins — or the child does not come back. Either way, my master is satisfied.' },
          { ...s.speaker('calloway'), text: 'Your master? …Grimshaw. Your sleeve. Is that the Hollow Mark?' },
        ]);
        G.audio.sfx('dementor'); postFlash(0.3);
        s.hideNPC('grimshaw');
        await s.talk('calloway', [`${G.save.name}! You heard? She’s Disapparated — no, you can’t do that at Hogwarts — she’s simply GONE. She put your name in that Goblet. She’s Hollowed.`, 'Tell the Headmistress. And trust no one with a Ministry badge.']);
        s.hideNPC('calloway');
        G.skyObj.lock = null;
        G.save.flags.xmas = 0;
        F().grimshawRevealed = true;
      } },
      { type: 'talk', npc: 'headmistress', obj: 'Tell the Headmistress what you overheard.', lines: [
        'Grimshaw. I let her into my school. The Ministry will deny everything, of course; she has friends there still.',
        'If she entered you, then the tournament is a trap, and the trap is at the end of it. Win the tasks — but never let go of your wand.',
      ] },
    ], points: 40 },
    // 8 — gillyweed
    { title: 'Gillyweed', from: 'Bram Okafor', letter: 'Heard you need to breathe underwater for an hour. I grow Gillyweed in Greenhouse Three. Come and see me. — Bram', steps: [
      { type: 'talk', npc: 'bram', obj: 'Find Bram — he’s been growing Gillyweed for you.', lines: [
        'Gillyweed! Chew it and you grow gills for about an hour. Tastes like slugs. Sorry.',
        'And take Aguamenti — a jet of water. Puts out fires, fills basins, and the grindylows in the lake HATE being blasted with it.',
      ], after: () => { G.spells.unlock('aguamenti'); addItem('plant', 1); meet('bram'); } },
    ], points: 20 },
    // 9 — the second task
    { title: 'The Second Task', from: 'Undersecretary Grimshaw', autosave: true, letter: 'By order of the Tournament: the second task begins at the Black Lake at nine. — the Tournament Office', steps: [
      { type: 'minigame', npc: 'headmistress', id: 'swim', opts: () => ({ friend: partner() }), obj: 'Go to the lake shore. The Headmistress will start the second task.',
        lines: () => [`Champions — the merfolk have taken something precious from each of you. In your case: ${fname(partner())}. You have one hour.`, 'Chew the Gillyweed. Go!'],
        pass: (r) => r.success, win: () => [`You brought ${fname(partner())} back — and stayed to help Thibault’s sister to the surface. The merfolk chieftain insists you be awarded full marks. Well done.`], lose: ['The merfolk have released them safely — but you must try again.'] },
    ], points: 60 },
    // 10 — the third task
    { title: 'The Third Task', from: 'Professor Calloway', autosave: true, letter: 'The maze tonight. Hedges that move, things that bite. Get to the Cup, take it, and don’t stop for anyone. — I.C.', steps: [
      { type: 'go', zone: 'grounds', pos: () => pitch(0, 30), r: 5, obj: 'Go to the Quidditch pitch — it has become a hedge maze.', run: async () => {
        G.skyObj.lock = 0.9;
        await G.story.talk('calloway', ['Hartwell and you are joint leaders, so you go in first. Red sparks if you need help — not that anyone will see them in there. Go.']);
        await G.world.travel('maze');
      } },
      { type: 'fight', zone: 'maze', manual: true, obj: 'Find the Ember Cup at the centre of the maze. Acromantulas and worse lurk in the hedges.',
        spawn: () => { const z = Z().maze; const cells = [[2, 2], [2, 10], [10, 2], [10, 10], [4, 6], [8, 6], [6, 3], [6, 9], [11, 6]]; cells.forEach(([r, c], i) => G.enemies.spawn('spider', z.cells(r, c), { scale: i % 3 === 0 ? 1.4 : 1 })); G.enemies.spawn('wizard', z.cells(3, 6), { level: 4, spells: ['curse', 'stupefyE'], name: 'Bewitched Thibault', aggro: false }); },
        marker: () => (G.zone.name === 'maze' ? { zone: 'maze', pos: Z().maze.spots.trophy.clone().setY(Z().maze.spots.trophy.y + 2) } : { zone: 'grounds', pos: pitch(0, 30).setY(Z().grounds.pitchY + 2.5) }),
        update: (Y) => {
          if (G.zone.name !== 'maze' || G.story.busy || !Y.encounter) return;
          if (G.player.pos.distanceTo(Z().maze.spots.centre) < 3) {
            Y.encounter = null;
            G.story.run(async () => {
              const s = G.story;
              s.placeNPC('hartwell', 'maze', Z().maze.spots.centre.clone().add(new THREE.Vector3(2.5, 0, 1)), -1.2);
              await s.talk('hartwell', ['We’re both here. Two Hogwarts champions. You know what? Let’s take it together. A Hogwarts victory either way.']);
              G.audio.sfx('portkey'); postFlash(0.6); G.cam.shake(0.5);
              G.ui.banner('The Cup is a portkey!', 'You are wrenched away…', '');
              s.hideNPC('hartwell');
              for (const e of G.enemies.list) if (e.alive) e.die({});
              await G.world.travel('graveyard');
              Y.next();
            });
          }
        },
        respawn: () => ({ pos: Z().maze.spots.entrance, yaw: Math.PI }) },
    ], points: 60 },
    // 11 — the graveyard (final boss)
    { title: 'The Graveyard', from: 'Headmistress Aldmoor', autosave: true, steps: [
      { type: 'fight', zone: 'graveyard', obj: 'Survive the graveyard! Defeat the Hollowed — and Malachar.', at: () => Z().graveyard.spots.circle, r: 50,
        intro: async () => {
          const s = G.story;
          const z = Z().graveyard;
          G.skyObj.lock = 0.95;
          s.placeNPC('hartwell', 'graveyard', z.W(3, 16), Math.PI);
          await s.talk('hartwell', ['Where… where are we? This is a graveyard. Someone’s coming. Wands out!']);
          G.cam.setCinematic(z.cauldronPos.clone().add(new THREE.Vector3(-8, 4, 10)), z.cauldronPos, 1.6);
          await G.ui.say([
            { who: 'Malachar the Hollow', color: '#7aff9a', voice: 'low', text: 'Bone of the father, unknowingly given. Flesh of the servant, willingly given. And the shard of the Grey Horn — taken.' },
            { who: 'Malachar the Hollow', color: '#7aff9a', voice: 'low', text: 'Rise, my king. RISE.' },
          ]);
          G.audio.sfx('dementor'); postFlash(0.6); G.cam.shake(0.8);
          G.fx.emit({ pos: z.cauldronPos, color: 0x40ff70, count: 200, speed: 9, size: 0.5, life: 1.4, intensity: 3, up: 6 });
          s.placeNPC('hollowking', 'graveyard', z.W(0, -8), 0);
          await sleep(1200);
          await G.ui.say([
            { who: 'The Hollow King', color: '#40ff70', voice: 'low', text: 'Thirteen years a whisper in the dark. Thirteen years. And now — a body.' },
            { who: 'The Hollow King', color: '#40ff70', voice: 'low', text: 'Is this the child who broke my Horn and freed my Wyrm? So small. Kill the other one. Bring me the champion.' },
          ]);
          G.cam.setCinematic(null);
          s.hideNPC('hollowking');
          s.hideNPC('hartwell');
          G.ui.toast('Aurelia is down! Protect her — defeat Malachar’s Hollowed.', 'tip', 3500);
        },
        waves: [
          () => { const z = Z().graveyard; for (let i = 0; i < 4; i++) G.enemies.spawn('wizard', z.W(-10 + i * 6, -12 + rand(-2, 2)), { level: 4, spells: ['curse', 'stupefyE', 'incendioE'], aggro: true, name: 'Hollowed acolyte' }); },
          () => { const z = Z().graveyard; const m = G.enemies.spawn('malachar', z.W(0, -10), { center: z.W(0, 0), aggro: true, fleeAt: 0.4, fleeLine: 'He crawls behind his master’s robes.' }); m.phase = 1; m.phaseLabel = 'Phase I'; },
        ],
        waveIntro: async (Y, w) => { if (w === 1) G.ui.banner('Malachar!', 'Newly given a silver hand — and fury', ''); },
        respawn: () => ({ pos: Z().graveyard.W(0, 14), yaw: Math.PI }) },
      { type: 'fight', zone: 'graveyard', manual: true, obj: 'The Hollow King himself! You cannot beat him — grab Aurelia and run for the Cup (the portkey)!',
        spawn: () => {
          const z = Z().graveyard;
          G.enemies.spawn('hollowking', z.W(0, -14), { aggro: true, volley: 2 });
          G.story.placeNPC('hartwell', 'graveyard', z.spots.portkey.clone().add(new THREE.Vector3(1.5, 0, 0)), Math.PI, 'down');
          G.ui.banner('The Hollow King', 'Dodge, shield, and RUN for the portkey', '');
        },
        marker: () => ({ zone: 'graveyard', pos: Z().graveyard.spots.portkey.clone().setY(Z().graveyard.spots.portkey.y + 2) }),
        update: (Y) => {
          if (G.zone.name !== 'graveyard' || G.story.busy || !Y.encounter) return;
          if (G.player.pos.distanceTo(Z().graveyard.spots.portkey) < 3) {
            Y.encounter = null;
            G.story.run(async () => {
              G.audio.sfx('portkey'); postFlash(0.7);
              G.ui.banner('You grab Aurelia and the Cup!', 'The portkey tears you away', 'unlock');
              G.story.hideNPC('hartwell');
              for (const e of G.enemies.list) if (e.alive) { e.root.visible = false; e.die({ fled: true }); }
              await G.ui.fade(1, 0.5);
              G.enemies.clearZone();
              G.world.setZone('grounds', { pos: pitch(0, 6), yaw: Math.PI });
              G.skyObj.lock = null;
              await G.ui.fade(0, 0.6);
              F().graveyard = true;
              Y.next();
            });
          }
        },
        respawn: () => ({ pos: Z().graveyard.W(0, 8), yaw: Math.PI }) },
    ], points: 150 },
    // 12 — aftermath
    { title: 'He Is Back', from: 'Headmistress Aldmoor', steps: [
      { type: 'talk', npc: 'headmistress', place: ['grounds', () => pitch(3, 4), Math.PI], obj: 'Tell the Headmistress what happened in the graveyard.', lines: [
        'You are alive. Aurelia is alive — the healers say she will wake by morning. That is all that matters tonight.',
        'The Hollow King has a body again. The Ministry will call it hysteria; Grimshaw’s friends will see to that.',
        'But we will prepare. All of us. You have already been braver than most grown witches and wizards I have known.',
        'The Ember Cup is yours — and Aurelia’s. Share the glory. You have earned it twice over.',
      ], after: () => { addItem('book', 1); } },
    ], points: 40 },
  ],
  // ---------------------------------------------------------------- side quests
  side: [
    { id: 'blast', title: 'Tamsin’s Blasting Challenge', from: 'Tamsin MacLeod', hint: 'Tamsin is itching to show off near the Great Hall.', available: (Y) => Y.qi >= 2, steps: [
      { type: 'talk', npc: 'tamsin', lines: ['Confringo, eh? Bet you can’t blast the three cracked old walls on the grounds before I do. Loser buys pasties!'] },
      { type: 'puzzle', ids: ['y4-wall-0', 'y4-wall-1', 'y4-wall-2'], obj: 'Blast the three cracked walls on the grounds (Confringo).', marker: () => { const o = [0, 1, 2].map((i) => G.puzzles.byId[`y4-wall-${i}`]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone().setY(o.pos.y + 2) }; } },
      { type: 'talk', npc: 'tamsin', obj: 'Tell Tamsin you won.', lines: ['ALL three?! Fine. FINE. Pasties are on me. And you can call me when you need a Beater in a fight.'], after: () => { addItem('pasty', 2); meet('tamsin'); G.save.friends.tamsin.f += 12; } },
    ] },
    { id: 'camera', title: 'Mei’s Camera', from: 'Mei Takahashi', hint: 'Mei looks upset in the Great Hall.', steps: [
      { type: 'talk', npc: 'mei', lines: ['My camera! Somebody locked it in a chest down by the lake as a joke. It has every photo of the first task on it!'] },
      { type: 'puzzle', ids: ['y4-mei-chest'], obj: 'Open the locked chest by the lake shore (Alohomora).' },
      { type: 'talk', npc: 'mei', obj: 'Return Mei’s camera.', lines: ['You found it! Look — here’s you, upside down, being chased by a dragon. I’m framing that one.'], after: () => { meet('mei'); G.save.friends.mei.f += 12; } },
    ] },
    { id: 'lantern', title: 'The Durmvald Lantern', from: 'Anneliese Roth', hint: 'Anneliese Roth paces in the Great Hall.', available: (Y) => Y.qi >= 4, steps: [
      { type: 'talk', npc: 'roth', lines: ['Our ship’s lantern blew off the mast in the storm. It is caught on the cliffs by the lake shore, too high to climb. You have the Summoning Charm, ja?'] },
      { type: 'puzzle', ids: ['y4-lantern'], obj: 'Fetch the Durmvald lantern from the cliffs by the lake (Accio or Descendo).' },
      { type: 'talk', npc: 'roth', obj: 'Return the lantern to Anneliese.', lines: ['Danke. You are a strange little champion. I think I like you.'] },
    ] },
    { id: 'joke', title: 'Kofi’s Order', from: 'Kofi Asante', hint: 'Kofi is whispering by the Great Hall doors.', available: (Y) => Y.qi >= 3, steps: [
      { type: 'talk', npc: 'kofi', lines: ['I need a Dungbomb from Grinwick’s in Hogsmeade. For SCIENCE. Get me one and I’ll teach you a trick.'] },
      { type: 'event', obj: 'Buy a Dungbomb at Grinwick’s Jokes in Hogsmeade.', marker: () => { const d = Z().hogsmeade.doors.find((d) => d.kind === 'jokeshop'); return { zone: 'hogsmeade', pos: d.pos.clone().setY(d.pos.y + 2) }; } },
      { type: 'talk', npc: 'kofi', obj: 'Give Kofi the Dungbomb.', lines: ['Perfect. Grimshaw’s office, tonight. You saw nothing.'], after: () => { addItem('joke', -1); meet('kofi'); G.save.friends.kofi.f += 12; } },
    ] },
    { id: 'cassius', title: 'A Rival’s Challenge', from: 'Cassius Vane', hint: 'Cassius wants a duel.', available: (Y) => Y.qi >= 5, steps: [
      { type: 'minigame', npc: 'cassius', id: 'duel', opts: () => ({ opponents: [{ name: 'Cassius Vane', house: 'slytherin', level: 5, hp: 220, spells: ['stupefyE', 'expelliarmusE', 'incendioE', 'curse'], rate: 1.4, block: 0.35, dodge: 0.3, volley: 2, line: 'Champion. Let’s see it.', look: { house: 'slytherin', hairStyle: 'short', hairColor: '#e8dcc0', skin: SKIN_TONES[0] } }], winTitle: 'Cassius is beaten!' }), lines: ['Champion. Ha. The Goblet must have been drunk. Prove you deserve it — duel me.'], pass: (r) => r.success, win: ['…Fine. You’re good. Don’t let it go to your head.'], lose: ['As I thought. Come back when you’re worthy.'] },
    ] },
  ],
  update(Y) {
    const sq = Y.def.side.find((s) => s.id === 'joke');
    if (Y.F.side.joke_on && Y.sideState('joke') === 1 && itemCount('joke') > 0) Y.sideNext(sq);
    // resumed mid-task: the pitch leads back into the maze / the Cup back to the graveyard
    const st = Y.step;
    if (st && (st.zone === 'maze' || st.zone === 'graveyard') && G.zone.name === 'grounds' && !G.story.busy && !G.world.transitioning && G.player.pos.distanceTo(pitch(0, 30)) < 4) G.world.travel(st.zone);
  },
};
