// Year 2 — The Hidden Chamber. Serpents in the walls, petrified students, a possessed
// professor and the Wyrm of the Undercroft. The Hollow King's voice is heard for the first time.
import * as THREE from 'three';
import { G } from '../state.js';
import { TRAIN_EVENTS } from '../journey.js';
import { SKIN_TONES } from '../models.js';
import { makeSnake } from '../models2.js';
import { chest, broken, gate, brazierGroup, ledgeItem, pushBlock, giveReward } from '../puzzles.js';
import { groundHeight, WATER_Y, PLATEAU, SPOTS } from '../world/terrain.js';
import { textTexture } from '../textures.js';
import { meet } from '../friends.js';
import { addItem } from '../items.js';
import { sleep, rand } from '../util.js';
import { postFlash } from '../engine.js';

const Z = () => G.world.zones;
const gh = (x, y, z) => Z().greatHall.W(x, y, z);
const co = (x, y, z) => Z().corridor.W(x, y, z);
const uc = () => Z().undercroft.spots;
const until = (fn) => new Promise((res) => { const t = () => (G.quitting ? res(false) : fn() ? res(true) : setTimeout(t, 100)); t(); });
const F = () => G.save.flags.y2;
// a dry patch of lake shore near (x, z): walk toward the castle until above the water line
function shore(x, z) { let xx = x; while (groundHeight(xx, z) < WATER_Y + 0.4 && xx < 0) xx += 2; return new THREE.Vector3(xx, groundHeight(xx, z) + 0.6, z); }

// turn an NPC to stone (and back) without touching shared materials
function petrify(id, on) {
  const n = G.story.npc(id);
  n.model.root.traverse((m) => {
    if (!m.isMesh) return;
    if (on) { m.userData.mat ||= m.material; m.material = m.userData.stone ||= new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.9 }); }
    else if (m.userData.mat) m.material = m.userData.mat;
  });
  n.model.anim.set(on ? 'idle' : 'idle');
  n.petrified = on;
}

let built = false;
function buildPuzzles() {
  if (built) return;
  built = true;
  const P = G.puzzles;
  // Charms Corridor practice chests and a toppled statue
  chest(P, 'y2-chest-1', 'corridor', co(-3.3, 0, -28), Math.PI / 2, { coins: 10 });
  chest(P, 'y2-chest-2', 'corridor', co(3.3, 0, -52), -Math.PI / 2, { coins: 10, item: 'beans', n: 2 });
  chest(P, 'y2-chest-3', 'corridor', co(-3.3, 0, -64), Math.PI / 2, { coins: 10, item: 'frog' });
  broken(P, 'y2-armour', 'corridor', co(-2.4, 0, -40), 'statue', { reward: { coins: 15 } });
  // the Undercroft
  const S = uc();
  gate(P, 'y2-gate', 'undercroft', S.gate, 0, 6, 4.6);
  broken(P, 'y2-bridge', 'undercroft', S.chasm, 'bridge', { len: 10.4, w: 3 });
  brazierGroup(P, 'y2-braziers', 'undercroft', S.braziers, () => openSerpentDoor(false));
  ledgeItem(P, 'y2-ledge', 'undercroft', S.ledge, { coins: 30, item: 'book' });
  pushBlock(P, 'y2-block', 'undercroft', S.block, S.plate, () => giveReward({ coins: 40, item: 'potion' }));
  chest(P, 'y2-uc-chest', 'undercroft', S.chest, Math.PI / 2, { coins: 35, item: 'frog', n: 2 });
  if (P.isSolved('y2-braziers')) openSerpentDoor(true);
  // Pip's locked trunks around the grounds (side quest)
  const g = (x, z) => new THREE.Vector3(x, groundHeight(x, z), z);
  chest(P, 'y2-trunk-1', 'grounds', new THREE.Vector3(22, PLATEAU, -4), 0.4, { coins: 20, item: 'cake' });
  chest(P, 'y2-trunk-2', 'grounds', g(SPOTS.hut.x + 6, SPOTS.hut.z + 4), -0.8, { coins: 20, item: 'liquorice', n: 2 });
  chest(P, 'y2-trunk-3', 'grounds', g(SPOTS.pitch.x + 30, SPOTS.pitch.z - 40), 2.1, { coins: 25, item: 'frog' });
  // Kofi's dungbombs stashed high in the Grand Staircase (Accio)
  const st = Z().staircase;
  ledgeItem(P, 'y2-dung-1', 'staircase', st.W(-12.5, 12, 10), { item: 'joke' });
  ledgeItem(P, 'y2-dung-2', 'staircase', st.W(12.5, 5.5, -9), { item: 'joke' });
  ledgeItem(P, 'y2-dung-3', 'staircase', st.W(4, 22, 12.5), { item: 'joke' });
  // Madam Hale's broken brooms at the pitch
  const P0 = SPOTS.pitch;
  for (let i = 0; i < 3; i++) broken(P, `y2-broom-${i}`, 'grounds', g(P0.x + 2 + i * 3, P0.z + 34), 'statue', { yaw: i });
}
function openSerpentDoor(instant) {
  const z = Z().undercroft;
  z.serpentDoorCol.disabled = true;
  if (instant) { z.serpentDoor.position.y -= 5.2; return; }
  G.audio.sfx('stairs'); G.cam.shake(0.3);
  G.ui.banner('The serpent door grinds open', 'Something vast breathes beyond it.', 'quest');
  let t = 0; const a = () => { t += 0.01; z.serpentDoor.position.y -= 0.052; z.serpentDoor.rotation.z += 0.02; if (t < 1) requestAnimationFrame(a); }; a();
}

// writing on the corridor wall
let writing = null;
function showWriting(on) {
  if (!writing) {
    const t = textTexture([{ text: 'THE UNDERCROFT HAS BEEN OPENED', font: 'bold 40px Cinzel, serif', color: '#b02020', y: 70 }, { text: 'HEIRS OF THE HOLLOW KING, BEWARE', font: 'bold 34px Cinzel, serif', color: '#901818', y: 150 }], { w: 1024, h: 220 });
    writing = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.3), new THREE.MeshStandardMaterial({ map: t.tex, transparent: true, emissive: 0x400000, emissiveMap: t.tex, emissiveIntensity: 0.6 }));
    writing.position.copy(co(-4.42, 3.4, -44));
    writing.rotation.y = Math.PI / 2;
    Z().corridor.world.add(writing);
  }
  writing.visible = on;
}

// ------------------------------------------------------------------ the train: a snake loose in the carriage
TRAIN_EVENTS[2] = async () => {
  const st = G.story;
  const tr = Z().train;
  await new Promise((res) => st.run(async () => {
    await st.talk('kofi', ['Er… did anyone else hear a hiss? From the luggage rack?']);
    await st.talk('tamsin', ['That’s not my trunk. That is DEFINITELY not my trunk. Wands out!']);
    res();
  }));
  const p = G.player;
  G.enemies.hpScale = 0.8; G.enemies.dmgScale = 0.8;
  for (let i = 0; i < 2; i++) G.enemies.spawn('snake', tr.W(1.1, 0, p.pos.z - tr.offset.z - 4 - i * 2.5), { aggro: true });
  G.ui.toast('Snakes on the train! Stupefy them before they bite.', 'tip', 3500);
  await until(() => !G.enemies.list.some((e) => e.alive));
  await new Promise((res) => st.run(async () => { await st.talk('tamsin', ['Ha! Who brings snakes to Hogwarts? …Who brings snakes to Hogwarts on PURPOSE?']); res(); }));
};

const crane = (id = 'crane') => id;
export default {
  n: 2,
  title: 'The Hidden Chamber',
  feast: [
    'Welcome back, everyone! A new year, and some new faces at the staff table.',
    'Please welcome Professor Lysander Crane, who joins us to teach Defence Against the Dark Arts.',
    'A reminder: the Forbidden Forest is forbidden — and this year, so are the lower dungeons beyond the old troll hall.',
    'Now. Tuck in!',
  ],
  cupLines: [
    'What a year. Serpents in the walls, students turned to stone — and a chamber no one had opened in a thousand years.',
    'Professor Crane is recovering well. He asks me to thank the student who freed him from the amulet.',
  ],
  setup(Y) {
    G.story.registerNPC('crane', { name: 'Professor Crane', voice: 'mid', color: '#a0d890', look: { robeColor: '#2a2a3a', liningColor: '#3a6a2a', hairStyle: 'short', hairColor: '#7a4520', skin: SKIN_TONES[1], glasses: true, scale: 1.05 } });
    G.story.addTalker('crane', 'Talk to Professor Crane', () => G.story.talk('crane', [F().craneFreed ? 'I owe you more than I can say. The amulet whispered for months… I should have sought help.' : 'Constant practice, that is the secret of Defence. Flipendo, flipendo, flipendo!']));
    buildPuzzles();
  },
  placeNPCs(Y) {
    const s = G.story;
    const q = G.save.yq;
    if (!F().craneFreed && q < 8) s.placeNPC('crane', 'greatHall', gh(-5, 0.8, -31), 0.3); else s.hideNPC('crane');
    s.placeNPC('kofi', 'greatHall', gh(-6, 0, 30), Math.PI);
    s.placeNPC('cassius', 'grounds', new THREE.Vector3(12, PLATEAU, -2), -1.2);
    s.placeNPC('tamsin', 'grounds', new THREE.Vector3(SPOTS.pitch.x + 10, groundHeight(SPOTS.pitch.x + 10, SPOTS.pitch.z + 28), SPOTS.pitch.z + 28), Math.PI);
    const petrified = !!F().petrified && !F().restored;
    s.placeNPC('oren', 'greatHall', petrified ? gh(-10, 0, 37) : gh(6, 0, 30), petrified ? 0.6 : Math.PI);
    petrify('oren', petrified);
    if (petrified) { s.placeNPC('cassius', 'greatHall', gh(-11.5, 0, 34), 1.0); petrify('cassius', true); } else petrify('cassius', false);
    showWriting(!!F().writing && q < 9);
    Z().dungeon.undercroftDoor.visible = !!F().undercroft;
  },
  quests: [
    // 1
    { title: 'Defence Against the Dark Arts', from: 'Professor Crane', letter: 'Your first Defence lesson is in the Great Hall. Bring your wand and a sense of balance. — L. Crane', steps: [
      { type: 'talk', npc: 'crane', obj: 'Find Professor Crane by the staff table in the Great Hall.', lines: [
        'Ah — a second-year with a reputation! Professor Duskwood tells me you felled a troll last year.',
        'Today: the Knockback Jinx. Flipendo. Point, and push with your whole arm. It sends a foe tumbling and knocks small creatures senseless.',
      ], after: () => { G.spells.unlock('flipendo'); } },
      { type: 'fight', zone: 'greatHall', obj: 'Knock over the four duelling dummies in front of the staff table (try Flipendo).',
        spawn: () => { for (const [x, z] of [[-6, -25], [-2, -27], [2, -27], [6, -25]]) G.enemies.spawn('dummy', gh(x, 0, z), { yaw: 0 }); } },
      { type: 'talk', npc: 'crane', obj: 'Report back to Professor Crane.', lines: [
        'Splendid! Ten points. You have a natural feel for it.',
        '…Hm? Oh, this? An old family amulet. It keeps me… focused. Run along now.',
      ] },
    ], points: 20 },
    // 2
    { title: 'Charms of Opening and Mending', from: 'Professor Thornwick', letter: 'Dear student, Charms resumes on the second floor. This term: unlocking and mending! — F. Thornwick', steps: [
      { type: 'minigame', npc: 'thornwick', id: 'wanddraw', obj: 'Pass Professor Thornwick’s Alohomora lesson in the Charms classroom.', lines: ['Welcome back! This year: Alohomora, the Unlocking Charm. Every lock has a shape — trace it neatly!'], pass: (r) => r.success, win: ['Lovely! Alohomora is yours.'], lose: ['Nearly! Try again.'], done: () => G.spells.unlock('alohomora') },
      { type: 'puzzle', ids: ['y2-chest-1', 'y2-chest-2', 'y2-chest-3'], obj: 'Open the three locked practice chests in the Charms Corridor: cast Alohomora at a chest, then open it.' },
      { type: 'talk', npc: 'thornwick', obj: 'Return to Professor Thornwick.', lines: [
        'All three! Now the other half of the lesson: Reparo, the Mending Charm. What is broken, mend; what is scattered, gather.',
        'Someone knocked over the statue in my corridor. Would you?',
      ], after: () => G.spells.unlock('reparo') },
      { type: 'puzzle', ids: ['y2-armour'], obj: 'Mend the toppled statue in the Charms Corridor with Reparo.' },
    ], points: 25 },
    // 3
    { title: 'Writing on the Wall', from: 'Pip Fenwick', letter: 'Did you hear hissing last night? In the WALLS? Meet me in the Charms Corridor. — Pip', steps: [
      { type: 'go', zone: 'corridor', pos: co(0, 0, -40), r: 4, obj: 'Something hisses in the Charms Corridor. Investigate.', run: async () => {
        F().writing = true;
        showWriting(true);
        G.audio.sfx('dementor');
        G.cam.setCinematic(co(2, 2.4, -38), co(-4.4, 3.2, -44), 2);
        await sleep(600);
        await G.ui.say([{ who: '???', color: '#80ff40', voice: 'low', text: 'Ssssso long… sssealed below… Open… open…' }]);
        G.story.placeNPC('pip', 'corridor', co(1.5, 0, -36), Math.PI);
        await G.story.talk('pip', ['Oh no. Oh no no no. “The Undercroft has been opened.” That’s from the old story — the chamber under the castle, where something BIG sleeps.', 'And what’s that hissing — LOOK OUT!']);
        G.cam.setCinematic(null);
      } },
      { type: 'fight', zone: 'corridor', obj: 'Fight off the serpents slithering out of the walls!', spawn: () => { for (let i = 0; i < 4; i++) G.enemies.spawn('snake', co(rand(-3, 3), 0, -48 - i * 2.5), { aggro: true }); } },
      { type: 'talk', npc: 'headmistress', obj: 'Tell the Headmistress what happened.', lines: [
        'Serpents in the walls… and that message. I had hoped the Undercroft was only a legend.',
        'Long ago a dark wizard, the first to call himself the Hollow King, is said to have built a chamber beneath this castle, and left a guardian in it.',
        'Be careful. Keep your friends close. And tell me at once if you see anything else.',
      ] },
    ], points: 25 },
    // 4
    { title: 'Accio!', from: 'Professor Duskwood', letter: 'The Duelling Club reconvenes. New charm, and a new challenger has asked for you by name. — Prof. Duskwood', steps: [
      { type: 'talk', npc: 'duskwood', obj: 'Find Professor Duskwood in the Great Hall.', lines: [
        'This year’s club charm: Accio, the Summoning Charm. Use it to pull a foe off balance — or fetch something you cannot reach.',
        'And a certain Mr Vane has challenged you to a duel. Shall we see what you have learned?',
      ], after: () => G.spells.unlock('accio') },
      { type: 'minigame', npc: 'duskwood', id: 'duel', obj: 'Duel Cassius Vane at the Duelling Club (talk to Professor Duskwood).',
        opts: () => ({ opponents: [{ name: 'Cassius Vane', house: 'slytherin', level: 3, hp: 150, spells: ['stupefyE', 'expelliarmusE', 'incendioE'], rate: 1.7, block: 0.3, dodge: 0.25, volley: 1, line: 'Let’s see if last year was luck.', look: { house: 'slytherin', hairStyle: 'short', hairColor: '#e8dcc0', skin: SKIN_TONES[0] } }], winTitle: 'Cassius is beaten!' }),
        pass: (r) => r.success, win: ['Well fought! Mr Vane will be insufferable about this for weeks — but he lost fair and square.'], lose: ['Not this time. Catch your breath and try again.'],
        done: () => { meet('cassius'); G.save.friends.cassius.f += 4; } },
    ], points: 30 },
    // 5
    { title: 'Scales by the Lake', from: 'Brannoc the Groundskeeper', letter: 'Found somethin’ by the lake yeh should see. Bring yer wand. — Brannoc', steps: [
      { type: 'talk', npc: 'brannoc', obj: 'Find Brannoc by the paddock.', lines: [
        'Look at this. A serpent scale — big as me hand. There’s more of ’em along the shore of the Black Lake.',
        'Gather ’em up for me, would yeh? I want ter know what shed ’em.',
      ] },
      { type: 'collect', zone: 'grounds', label: 'Giant serpent scale', obj: 'Collect five giant serpent scales along the shore of the Black Lake.',
        model: () => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.35, 6), new THREE.MeshStandardMaterial({ color: 0x5a8a3a, metalness: 0.6, roughness: 0.3, emissive: 0x1a3a10, side: THREE.DoubleSide })); return m; },
        items: () => [shore(-110, 30), shore(-115, 50), shore(-110, 70), shore(-104, 92), shore(-96, 112)] },
      { type: 'fight', zone: 'grounds', at: () => shore(-110, 70), r: 30, obj: 'Something stirs in the reeds!', spawn: () => { const c = shore(-104, 70); for (let i = 0; i < 4; i++) G.enemies.spawn('snake', c.clone().add(new THREE.Vector3(rand(-4, 4), 0, rand(-6, 6))), { aggro: true }); } },
      { type: 'talk', npc: 'brannoc', obj: 'Bring the scales back to Brannoc.', lines: [
        'Five! An’ snakes in the reeds, yeh say? These scales came up from below the castle, through the old drains.',
        'Somethin’ that big… I don’t like it. Here, take these — owl treats. Yeh never know when yeh’ll need a friend with wings.',
      ], after: () => addItem('creature', 2) },
    ], points: 30 },
    // 6 — mid-year twist
    { title: 'Petrified!', from: 'Headmistress Aldmoor', autosave: true, letter: 'All students are to remain in the castle over Christmas. — M. Aldmoor', steps: [
      { type: 'script', obj: 'Christmas at Hogwarts…', run: async () => {
        const s = G.story;
        await G.ui.fade(1, 0.5);
        G.world.setZone('greatHall', { pos: gh(0, 0, 30), yaw: Math.PI });
        G.save.flags.xmas = 2;
        F().petrified = true;
        s.placeNPCs(); s.yearEngine.def.placeNPCs(s.yearEngine);
        G.cam.setCinematic(gh(-6, 2.4, 30), gh(-11, 1.2, 35.5), 100);
        await G.ui.fade(0, 0.8);
        G.ui.banner('Christmas Day', 'Snow falls past the windows of the Great Hall', 'quest');
        await sleep(1200);
        await s.talk('headmistress', ['Two students. Oren Achterberg — and Cassius Vane. Found at dawn, turned to stone.']);
        await G.ui.say([{ who: 'Pip', color: '#ffb0d0', voice: 'high', text: 'Everyone said it was Cassius. Everyone. But… he’s been petrified too. So it isn’t him.' }]);
        G.player.teleport(gh(-7, 0, 31), 0.4);
        await s.talk('crane', ['Terrible. Terrible business. Stay in your dormitories, all of you, and… stay away from the dungeons.']);
        G.cam.setCinematic(gh(-4, 2, -26), gh(-5, 2, -31), 3);
        await sleep(500);
        await G.ui.say([{ who: G.save.name, color: '#fff', voice: 'mid', text: '(As Professor Crane turns away, his amulet flares a sickly green — and for a moment, so do his eyes.)' }]);
        G.cam.setCinematic(null);
      } },
      { type: 'talk', npc: 'headmistress', obj: 'Speak with the Headmistress about the petrified students.', lines: [
        'They can be restored. A Mandrake Restorative Draught — difficult, but Professor Vexley believes you have a steady hand.',
        'And… you saw something, didn’t you? Keep it close for now. Bring me proof.',
      ] },
    ], points: 20 },
    // 7
    { title: 'The Mandrake Draught', from: 'Professor Vexley', letter: 'The Headmistress insists I trust a second-year with Mandrake. Do not disappoint me. — V.', steps: [
      { type: 'minigame', npc: 'vexley', id: 'potions', opts: { quest: true }, obj: 'Brew the Mandrake Restorative Draught with Professor Vexley in the Dungeons.', lines: ['Mandrake root, stewed and stirred clockwise, on the beat. Ruin it and two students stay stone. No pressure.'], pass: (r) => r.success, win: ['…Perfect. Do not let it go to your head.'], lose: ['Again. Carefully.'] },
      { type: 'script', obj: 'The draught works…', run: async () => {
        const s = G.story;
        F().restored = true;
        s.placeNPCs(); s.yearEngine.def.placeNPCs(s.yearEngine);
        G.ui.banner('The petrified students wake', 'Oren and Cassius are restored', 'unlock');
        G.audio.sfx('unlock');
      } },
      { type: 'talk', npc: 'oren', obj: 'Talk to Oren in the Great Hall.', lines: [
        'I was going to the library at night — I know, I know — and I saw Professor Crane by the old troll hall. The wall OPENED. Like a great round door.',
        'Then a pair of yellow eyes in the dark, and… nothing. You have to tell someone. Or — knowing you — you’re going down there yourself.',
      ] },
      { type: 'talk', npc: 'pip', obj: 'Tell Pip what Oren saw.', place: ['greatHall', gh(6, 0, 33), Math.PI], lines: [
        'The troll hall?! Then we know where the Undercroft is. Listen, if you’re going down there, take this — I’ve been practising all term.',
        'Episkey! It mends cuts and bruises. Gran taught me. Just… come back, all right?',
      ], after: () => { G.spells.unlock('episkey'); meet('pip'); G.save.friends.pip.f += 8; } },
    ], points: 30 },
    // 8
    { title: 'Into the Undercroft', from: 'Oren Achterberg', letter: 'The troll hall, north wall. Look for the serpent. Be careful. — O.', steps: [
      { type: 'go', zone: 'dungeon', pos: () => Z().dungeon.W(0, 0, -78), r: 3.5, obj: 'Find the hidden door at the far end of the old troll hall in the Dungeons.', run: async () => {
        F().undercroft = true;
        Z().dungeon.undercroftDoor.visible = true;
        G.audio.sfx('stairs'); G.cam.shake(0.3);
        G.ui.banner('A round door opens in the stone', 'The Undercroft lies below', 'quest');
        await sleep(800);
      } },
      { type: 'go', zone: 'undercroft', pos: () => Z().undercroft.W(0, 0, -3), r: 3, obj: 'Go through the serpent door into the Undercroft.' },
      { type: 'puzzle', ids: ['y2-gate'], obj: 'A locked iron gate bars the tunnel. (Alohomora)' },
      { type: 'puzzle', ids: ['y2-bridge'], obj: 'The bridge over the chasm lies in pieces. Mend it. (Reparo)' },
      { type: 'puzzle', ids: ['y2-braziers'], obj: 'Light the three braziers to open the serpent door. (Incendio)' },
    ], points: 40 },
    // 9
    { title: 'The Possessed Professor', from: 'Headmistress Aldmoor', steps: [
      { type: 'fight', zone: 'undercroft', at: () => uc().ante, r: 9, obj: 'Someone waits in the antechamber…',
        intro: async () => {
          const s = G.story;
          s.placeNPC('crane', 'undercroft', uc().cranePos, 0);
          G.cam.setCinematic(uc().ante.clone().add(new THREE.Vector3(5, 3, 4)), uc().cranePos.clone().setY(uc().cranePos.y + 1.6), 2);
          await s.talk('crane', [
            'You. Of course it’s you. Do you know how long it has waited? A thousand years in the dark, whispering through this amulet…',
            { who: 'Professor Crane', color: '#80ff40', voice: 'low', text: 'THE HOLLOW KING RETURNS. NOT TODAY — BUT SOON. AND YOU, CHILD, WILL NOT SEE IT.' },
          ]);
          s.hideNPC('crane');
          G.cam.setCinematic(null);
        },
        spawn: () => { G.enemies.spawn('crane', uc().cranePos, { center: uc().ante, aggro: true, range: 11 }); },
        respawn: () => ({ pos: Z().undercroft.checkpoints[2].pos, yaw: Math.PI }),
        win: async () => {
          F().craneFreed = true;
          G.enemies.list.forEach((e) => e.alive && e.die({}));
          await sleep(1800);
          const s = G.story;
          s.placeNPC('crane', 'undercroft', uc().cranePos, 0, 'idle');
          await s.talk('crane', ['…Where am I? The amulet — it’s gone, it flew — into the chamber. It wants to wake the guardian. You must stop it. I… I can’t stand…']);
        } },
    ], points: 60 },
    // 10
    { title: 'The Wyrm of the Undercroft', from: 'Headmistress Aldmoor', autosave: true, steps: [
      { type: 'fight', zone: 'undercroft', at: () => uc().chamber, r: 22, obj: 'Enter the Great Chamber and stop the amulet.',
        intro: async () => {
          const c = uc().chamber;
          G.cam.setCinematic(c.clone().add(new THREE.Vector3(0, 6, 22)), c.clone().add(new THREE.Vector3(0, 6, -28)), 1.5);
          G.ui.banner('The Great Chamber', '', 'quest');
          await sleep(1200);
          G.audio.sfx('roar'); G.cam.shake(0.6);
          await G.ui.say([{ who: 'The amulet', color: '#80ff40', voice: 'low', text: 'Rise, guardian. Rise, and feed.' }]);
          G.cam.setCinematic(null);
        },
        spawn: () => { const C = uc().chamber; G.enemies.spawn('serpent', C.clone().add(new THREE.Vector3(0, 0, -14)), { center: C, pools: Z().undercroft.pools, aggro: true }); },
        respawn: () => ({ pos: Z().undercroft.checkpoints[3].pos, yaw: Math.PI }),
        win: async () => {
          G.enemies.list.forEach((e) => e.alive && e.die({}));
          await sleep(2000);
          postFlash(0.4);
          G.audio.sfx('shatter');
          G.ui.banner('The amulet shatters!', '', 'unlock');
          await sleep(800);
          await G.ui.say([
            { who: 'A voice from nowhere', color: '#80ff40', voice: 'low', text: 'Patience. I have waited a thousand years, little student. I can wait a few more.' },
            { who: 'A voice from nowhere', color: '#80ff40', voice: 'low', text: 'My servant Malachar failed me. You will find I do not fail.' },
          ]);
          G.audio.music('hall');
        } },
    ], points: 150 },
  ],
  // ---------------------------------------------------------------- side quests
  side: [
    { id: 'kofi', title: 'Kofi’s Secret Stash', from: 'Kofi Mensah-Lowe', hint: 'Kofi is plotting something in the Great Hall.', steps: [
      { type: 'talk', npc: 'kofi', lines: ['Psst. I hid three Dungbombs up in the Grand Staircase before Peeves’ cousin could nick them. Way up high. You know Accio, right? Be a legend?'] },
      { type: 'puzzle', ids: ['y2-dung-1', 'y2-dung-2', 'y2-dung-3'], obj: 'Accio the three Dungbombs hidden high in the Grand Staircase.', marker: () => { const o = ['y2-dung-1', 'y2-dung-2', 'y2-dung-3'].map((id) => G.puzzles.byId[id]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone() }; } },
      { type: 'talk', npc: 'kofi', obj: 'Bring the Dungbombs back to Kofi.', lines: ['YES. You absolute legend. Here — I’ll teach you Rictusempra. Makes anyone fall over laughing. Very useful in a duel. Or an exam.'], after: () => { G.spells.unlock('rictusempra'); meet('kofi'); G.save.friends.kofi.f += 12; } },
    ] },
    { id: 'trunks', title: 'Pip’s Treasure Hunt', from: 'Pip Fenwick', hint: 'Pip has heard a rumour about locked trunks.', available: (Y) => Y.qi >= 2, steps: [
      { type: 'talk', npc: 'pip', lines: ['Rumour says some old students left three locked trunks around the grounds. One by the courtyard, one near Brannoc’s hut, one by the Quidditch pitch. Treasure!'] },
      { type: 'puzzle', ids: ['y2-trunk-1', 'y2-trunk-2', 'y2-trunk-3'], obj: 'Find and open the three locked trunks around the grounds.', marker: () => { const o = ['y2-trunk-1', 'y2-trunk-2', 'y2-trunk-3'].map((id) => G.puzzles.byId[id]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone().setY(o.pos.y + 1) }; } },
      { type: 'talk', npc: 'pip', obj: 'Tell Pip what you found.', lines: ['You found them ALL? You’re the best treasure hunter in Hufflepuff and you’re not even in Hufflepuff. (Probably.)'], after: () => { meet('pip'); G.save.friends.pip.f += 10; } },
    ] },
    { id: 'brooms', title: 'Broken Brooms', from: 'Madam Hale', hint: 'Madam Hale looks cross down at the pitch.', available: (Y) => Y.qi >= 2, steps: [
      { type: 'talk', npc: 'hale', lines: ['Some idiot flew three school brooms into the stands. Snapped clean in half. You know Reparo? Mend them and I’ll owe you one.'] },
      { type: 'puzzle', ids: ['y2-broom-0', 'y2-broom-1', 'y2-broom-2'], obj: 'Mend the three broken brooms by the pitch (Reparo).', marker: () => { const o = ['y2-broom-0', 'y2-broom-1', 'y2-broom-2'].map((id) => G.puzzles.byId[id]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone().setY(o.pos.y + 1) }; } },
      { type: 'talk', npc: 'hale', obj: 'Tell Madam Hale.', lines: ['Good as new! Here — a tin of broomstick polish. And keep practising; house team tryouts are this spring.'], after: () => addItem('polish') },
    ] },
    { id: 'wand', title: 'The Stolen Wand', from: 'Cassius Vane', hint: 'Cassius is sulking in the courtyard.', available: (Y) => Y.qi >= 4, steps: [
      { type: 'talk', npc: 'cassius', lines: ['Don’t. Just — fine. Pixies took my wand. Up in the Headmistress’s tower. If anyone hears about this I will deny everything.'], after: (Y) => { Y.F.side.wandPixies = 0; } },
      { type: 'event', obj: 'Clear the pixies out of the Headmistress’s Tower and find Cassius’s wand.', marker: () => ({ zone: 'tower', pos: Z().tower.W(0, 2, 0) }) },
      { type: 'talk', npc: 'cassius', obj: 'Return Cassius’s wand.', lines: ['…You actually got it back. I— thank you. Don’t make it weird.'], after: () => { meet('cassius'); G.save.friends.cassius.f += 12; } },
    ],
      onArrive(Y, zone) {
        if (zone !== 'tower' || Y.sideState('wand') !== 1) return;
        const t = Z().tower;
        for (let i = 0; i < 6; i++) G.enemies.spawn('pixie', t.W(rand(-6, 6), 2, rand(-6, 4)), { aggro: true });
        G.ui.toast('Pixies! One of them is waving a wand…', 'tip');
      } },
  ],
  onEvent(Y, type, data) {
    if (type === 'kill' && Y.sideState('wand') === 1 && G.zone.name === 'tower' && !G.enemies.list.some((e) => e.alive)) {
      G.ui.toast('You found Cassius’s wand!', 'quest');
      Y.sideNext(Y.def.side.find((s) => s.id === 'wand'));
    }
  },
};
