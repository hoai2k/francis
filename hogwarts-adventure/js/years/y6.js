// Year 6 — Poisoned Waters. The Headmistress shows you the Hollow King's past and the secret
// of his survival: vessels holding pieces of his soul. Someone in the castle is trying to kill
// her, Cassius has a task he cannot refuse, and a sea cave full of Inferi guards a locket.
import * as THREE from 'three';
import { G } from '../state.js';
import { TRAIN_EVENTS } from '../journey.js';
import { SKIN_TONES } from '../models.js';
import { windmill, ledgeItem, chest, crackedWall } from '../puzzles.js';
import { groundHeight, PLATEAU, SPOTS } from '../world/terrain.js';
import { FRIENDS, meet } from '../friends.js';
import { addItem, itemCount } from '../items.js';
import { sleep, rand } from '../util.js';
import { postFlash, setFrost } from '../engine.js';

const Z = () => G.world.zones;
const gh = (x, y, z) => Z().greatHall.W(x, y, z);
const du = (x, y, z) => Z().dungeon.W(x, y, z);
const rr = (x, y, z) => Z().requirement.W(x, y, z);
const hg = (x, y, z) => Z().hogsmeade.W(x, y, z);
const gr = (x, z, dy = 0) => new THREE.Vector3(x, groundHeight(x, z) + dy, z);
const F = () => G.save.flags.y6;
const until = (fn, max = 1e9) => new Promise((res) => { const t0 = performance.now(); const t = () => (G.quitting ? res(false) : fn() ? res(true) : performance.now() - t0 > max ? res(false) : setTimeout(t, 100)); t(); });
const cave = () => Z().cave;

const NPCS = {
  pell: { name: 'Professor Pell', voice: 'mid', color: '#e0c070', look: { robeColor: '#5a3a5a', liningColor: '#e0c070', hairStyle: 'short', hairColor: '#d8d0c0', beard: 'short', beardColor: '#d8d0c0', skin: SKIN_TONES[1], scale: 1.12 } },
  varric: { name: 'Young Varric Mordaunt', voice: 'mid', color: '#a0c0a0', look: { robeColor: '#1a1a1e', liningColor: '#1a4a2a', house: 'slytherin', hairStyle: 'short', hairColor: '#1a1210', skin: SKIN_TONES[0], scale: 0.95 } },
  vesper: { name: 'Vesper Mordaunt', voice: 'high', color: '#ff80a8', look: { robeColor: '#14101a', liningColor: '#5a1030', hairStyle: 'long', hairColor: '#0a0808', skin: SKIN_TONES[0], eyeGlow: '#ff4080', scale: 1.02 } },
};

// ------------------------------------------------------------------ puzzles
let millsMade = false;
function mills() {
  if (millsMade) return;
  millsMade = true;
  const P = G.puzzles;
  [[60, 150], [80, 160], [100, 150]].forEach(([x, z], i) => windmill(P, `y6-mill-${i}`, 'grounds', gr(x, z), 0.3 * i));
}
let sideBuilt = false;
function sidePuzzles() {
  if (sideBuilt) return;
  sideBuilt = true;
  const P = G.puzzles;
  // Isolde's rare ingredients behind cracked dungeon walls (Reducto / Bombarda)
  crackedWall(P, 'y6-wall-0', 'dungeon', du(-6, 0, -30), Math.PI / 2, 3, 3);
  crackedWall(P, 'y6-wall-1', 'dungeon', du(6, 0, -55), -Math.PI / 2, 3, 3);
  // Bram's runaway Venomous Tentacula seeds on the greenhouse roofs
  [[-70, 70, 5], [-60, 80, 5], [-80, 85, 5]].forEach(([x, z, dy], i) => ledgeItem(P, `y6-seed-${i}`, 'grounds', gr(x, z, dy), { item: 'plant' }));
  chest(P, 'y6-hogs-chest', 'hogsmeade', hg(22, 0, -40), -0.6, { coins: 60, item: 'potion', n: 2 });
}

// ------------------------------------------------------------------ the train: Cassius acting strangely
TRAIN_EVENTS[6] = async () => {
  const st = G.story;
  const tr = Z().train;
  const p = G.player;
  st.placeNPC('cassius', 'train', tr.W(1.0, 0, p.pos.z - tr.offset.z - 5), Math.PI, 'idle');
  await new Promise((res) => st.run(async () => {
    await st.talk('isolde', ['Cassius Vane has been pacing the corridor for an hour. He looks like he hasn’t slept all summer.']);
    await st.talk('cassius', ['What are you staring at? Mind your own business, champion. This year… just stay out of my way. For your own good.']);
    res();
  }));
  st.hideNPC('cassius');
  G.ui.toast('Cassius stalks off down the train…', 'info', 2500);
};

export default {
  n: 6,
  title: 'Poisoned Waters',
  feast: [
    'Welcome. These are dark times, and I will not pretend otherwise. The Hollow King has returned and his followers grow bolder.',
    'Our castle is protected by every enchantment we know. But the greatest protection is each other.',
    'Please welcome back an old friend: Professor Augustin Pell, who returns from retirement to teach Potions.',
    'Professor Vexley will at last take up the post he has always wanted: Defence Against the Dark Arts.',
  ],
  cupLines: [
    'This year poison found its way into our castle, and darkness came up our own tower stairs.',
    'My hand will not heal; I have made my peace with that. What matters is that we have learned what he fears. Next year, we use it.',
  ],
  setup() {
    const s = G.story;
    for (const [id, d] of Object.entries(NPCS)) s.registerNPC(id, d);
    s.addTalker('pell', 'Talk to Professor Pell', () => s.talk('pell', ['My Lantern Club meets on Thursdays! The best and brightest. You, naturally, are invited.']));
    sidePuzzles();
  },
  placeNPCs(Y) {
    const s = G.story;
    const q = G.save.yq;
    s.placeNPC('pell', q === 5 ? 'dungeon' : 'greatHall', q === 5 ? du(0, 0, -64) : gh(5, 0.8, -31), q === 5 ? Math.PI : -0.3);
    s.placeNPC('duskwood', 'greatHall', gh(8, 0, -26), -0.5);
    if (q === 1) s.placeNPC('headmistress', 'tower', Z().tower.spots.headmistress, 0);
    if (q === 7) s.placeNPC('cassius', 'requirement', rr(0, 0, -22), 0);
    if (q === 2) mills();
  },
  quests: [
    // 1
    { title: 'A New Potions Master', from: 'Professor Pell', letter: 'My boy — or girl! — come and see me in the Great Hall. I have a spare textbook, a little battered. — A. Pell', steps: [
      { type: 'talk', npc: 'pell', obj: 'Meet Professor Pell at the staff table.', lines: [
        'The champion! The survivor of the graveyard! Delighted, delighted. Here — a second-hand copy of Advanced Potion-Making. Some previous owner scribbled all over it.',
      ], after: async () => {
        addItem('book', 1);
        await G.ui.say([{ who: 'A note in the margin', color: '#e0c890', voice: 'mid', text: '“Levicorpus (nvbl) — hoists a foe by the ankle. Lifted foes cannot cast, and Descendo slams them down.” — signed only “the Lamplighter”.' }]);
        G.spells.unlock('levicorpus');
      } },
      { type: 'minigame', npc: 'pell', id: 'potions', opts: { quest: true }, obj: 'Brew a Draught of Living Death for Professor Pell’s first lesson.', lines: ['The best brew wins a phial of Liquid Luck! Follow the instructions — or follow your instincts.'], pass: (r) => r.success, win: ['Extraordinary! The Lamplighter’s notes? Never heard of them. Here — Felix Felicis. Use it wisely.'], done: () => addItem('potion', 1) },
    ], points: 25 },
    // 2
    { title: 'The Mirrorbasin', from: 'Headmistress Aldmoor', letter: 'Come to my tower tonight. I wish to show you some memories. Bring your patience. — M.A.', steps: [
      { type: 'talk', npc: 'headmistress', obj: 'Visit the Headmistress in her tower.', lines: [
        'This is a Mirrorbasin. Memories, poured out and looked at again. Tonight: a boy named Varric Mordaunt, the year he came to Hogwarts.',
      ] },
      { type: 'script', obj: 'Watch the memories in the Mirrorbasin…', run: async () => {
        const s = G.story;
        await G.ui.fade(1, 0.6);
        setFrost(0.25);
        G.world.setZone('greatHall', { pos: gh(0, 0, -10), yaw: Math.PI });
        s.placeNPC('varric', 'greatHall', gh(0, 0, -14), 0);
        await G.ui.fade(0, 0.6);
        await G.ui.say([
          { who: 'Memory', color: '#c0d8ff', voice: 'mid', text: 'Fifty years ago. A pale, handsome boy at the Slytherin table, smiling at everyone and trusting no one.' },
          { ...s.speaker('varric'), text: 'Professor, is it true that a wizard could split his soul? Hypothetically. Keep a piece somewhere safe, so that he could never truly die?' },
          { who: 'Memory', color: '#c0d8ff', voice: 'mid', text: 'Every few years, a precious object vanished — a founder’s cup, a family ring, a silver locket. And every time, someone died.' },
        ]);
        await G.ui.fade(1, 0.6);
        s.hideNPC('varric');
        setFrost(0);
        G.world.setZone('tower', { pos: Z().tower.spots.headmistress.clone().add(new THREE.Vector3(0, 0, 2.5)), yaw: Math.PI });
        await G.ui.fade(0, 0.6);
        await s.talk('headmistress', ['Vessels. He hid pieces of his soul in seven treasures. While they exist, he cannot die.', 'The Wyrm’s fang destroyed the first — the diary-amulet Crane wore, in your second year. There are others. One, I believe, is in a sea cave on the coast.', 'But first, I need a memory from Professor Pell. He taught Varric. He knows more than he says.']);
      } },
    ], points: 30 },
    // 3
    { title: 'Ventus', from: 'Professor Thornwick', letter: 'Wind charms this week! Brannoc’s windmills by the pumpkin patch are jammed — perfect practice! — F. Thornwick', steps: [
      { type: 'minigame', npc: 'thornwick', id: 'wanddraw', obj: 'Learn Ventus in Professor Thornwick’s lesson.', lines: ['Ventus! A gust that bowls foes over, spins windmills and blows out flames. Big sweeping circle!'], pass: (r) => r.success, win: ['Whoosh! Now go and unjam Brannoc’s windmills.'], done: () => { G.spells.unlock('ventus'); mills(); } },
      { type: 'puzzle', ids: ['y6-mill-0', 'y6-mill-1', 'y6-mill-2'], obj: 'Spin Brannoc’s three windmills by the pumpkin patch with Ventus.', enter: () => mills() },
      { type: 'talk', npc: 'brannoc', obj: 'Tell Brannoc his windmills are turning.', lines: ['Lovely! The pumpkins’ll be big as carriages fer Hallowe’en. An’ — be careful this year. Folk’re sayin’ things about the Vane boy.'] },
    ], points: 25 },
    // 4
    { title: 'Shadowing Cassius', from: 'Oren Achterberg', letter: 'I’ve seen Cassius sneaking up to the Charms Corridor every night. He goes into the Room of Requirement. What is he DOING? — Oren', steps: [
      { type: 'go', zone: 'corridor', pos: () => Z().corridor.W(-1.5, 0, -28), r: 3, obj: 'Hide in the Charms Corridor and watch for Cassius.', run: async () => {
        const s = G.story;
        s.placeNPC('cassius', 'corridor', Z().corridor.W(-2.6, 0, -25), -Math.PI / 2);
        await G.ui.say([
          { ...s.speaker('cassius'), text: '(whispering) …I need a place to fix it. I need a place to fix it. Please. He’ll kill them if I don’t.' },
          { who: 'The Room', color: '#e0c890', voice: 'mid', text: 'The door appears for him — and inside, you glimpse a tall black cabinet.' },
          { ...s.speaker('cassius'), text: '…You. How long have you been there? Forget what you saw. I MEAN it.' },
        ]);
        s.hideNPC('cassius');
        F().cabinet = true;
      } },
    ], points: 25 },
    // 5
    { title: 'The Opal Necklace', from: 'Tamsin MacLeod', letter: 'Hogsmeade weekend! Butterbeer, joke shop, and NOTHING dramatic happening for once. — Tamsin', steps: [
      { type: 'go', zone: 'hogsmeade', pos: () => hg(0, 0, -2), r: 6, obj: 'Meet Tamsin in the Hogsmeade square.', run: async () => {
        const s = G.story;
        await G.ui.say([
          { ...s.speaker('tamsin'), text: 'Someone left a parcel by the pub for the Headmistress. Ooh — a necklace. Opals. Pretty—' },
          { who: '', color: '#fff', voice: 'mid', text: 'Tamsin rises into the air, rigid, eyes rolling back — and screams.' },
        ]);
        G.audio.sfx('curse'); postFlash(0.5); G.cam.shake(0.5);
        G.ui.banner('A cursed necklace!', 'Hollowed couriers are watching — stop them', '');
      } },
      { type: 'fight', zone: 'hogsmeade', obj: 'Hollowed couriers are fleeing the square. Stop them!', at: () => hg(0, 0, -2), r: 30,
        spawn: () => { for (let i = 0; i < 4; i++) G.enemies.spawn('wizard', hg(-10 + i * 6, 0, -18), { level: 5, spells: ['curse', 'stupefyE', 'incendioE'], aggro: true, name: 'Hollowed courier' }); },
        win: async () => { await G.story.talk('brannoc', ['I’ll get her up ter the hospital wing. She’ll live — she only touched it through her glove. That thing was meant fer the Headmistress.']); } },
      { type: 'talk', npc: 'duskwood', obj: 'Tell Professor Duskwood what happened.', lines: [
        'Cursed objects sent to the Headmistress. Someone inside these walls is helping. Until we know who — learn this.',
        'Reducto: the Reductor Curse. It shatters solid things — walls, shields, barricades — into dust.',
      ], after: () => G.spells.unlock('reducto') },
    ], points: 35 },
    // 6 — twist
    { title: 'Poisoned Mead', from: 'Professor Pell', autosave: true, letter: 'A little Christmas drinks party in my office — the Lantern Club and friends! Dungeons, eight o’clock. — A.P.', steps: [
      { type: 'go', zone: 'dungeon', pos: () => du(0, 0, -60), r: 5, obj: 'Go to Professor Pell’s Christmas party in the dungeons.', enter: () => { G.save.flags.xmas = 6; }, run: async () => {
        const s = G.story;
        await G.ui.say([
          { ...s.speaker('pell'), text: 'Come in, come in! Oak-matured mead — a gift for the Headmistress, but she won’t mind if we try a drop.' },
          { ...s.speaker('oren'), text: 'Cheers, Professor. Merry Christ—' },
        ]);
        G.audio.sfx('fail'); G.cam.shake(0.3);
        await G.ui.say([{ who: '', color: '#fff', voice: 'mid', text: 'Oren’s glass shatters on the flagstones. He clutches his throat and falls.' }]);
      } },
      { type: 'minigame', npc: 'pell', id: 'poison', opts: { friend: 'oren' }, obj: 'Oren has been poisoned! Help Professor Pell find the antidote on his shelf (talk to him).', pass: () => true,
        win: ['That mead was meant for the Headmistress. Somebody tried to murder her in my office. In MY office!'] },
      { type: 'talk', npc: 'headmistress', obj: 'Tell the Headmistress about the poisoned mead.', lines: [
        'The necklace, then the mead. Clumsy attempts, by someone who doesn’t want to do it. That tells me a great deal.',
        'I know who it is, and I know why. Leave him to me — and keep him safe, if you can. He is more frightened than you know.',
      ], after: () => { meet('oren'); G.save.friends.oren.f += 10; G.save.flags.xmas = 0; } },
    ], points: 40 },
    // 7
    { title: 'Pell’s Memory', from: 'Headmistress Aldmoor', letter: 'Professor Pell has given me a memory — but it has been tampered with. He is ashamed. Find a way to make him give you the real one. — M.A.', steps: [
      { type: 'talk', npc: 'pell', obj: 'Persuade Professor Pell to give you his true memory.', lines: [
        { text: 'The memory? I’ve given the Headmistress everything I remember. What more could you possibly want, dear?', choices: ['Bribe him with Liquid Luck', 'Threaten to tell the Ministry', 'Remind him of the students who died', 'Flatter his Potions genius'] },
      ], after: async (Y, r) => {
        if (r !== 2) { await G.story.talk('pell', [r === 0 ? 'Luck? Luck won’t make me proud of what I did.' : r === 1 ? 'The Ministry? Ha! They can’t make me remember what I’ve chosen to forget.' : 'Flattery! Lovely. Still no.', 'Perhaps… think about why I might be ashamed.']); return false; }
        await G.story.talk('pell', [
          '…Tomas Whitlow. One of my best. Varric killed him, in his seventh year, and I knew. I KNEW what that boy was, because I had answered his question.',
          'He asked how many pieces a soul could be split into. I said “seven, the most magical number”. Here. Take the true memory. Take it, before I lose my nerve.',
        ]);
        addItem('book', 1);
      } },
    ], points: 30 },
    // 8
    { title: 'Cassius Cornered', from: 'Oren Achterberg', letter: 'Cassius went into the Room again. He looked like he’d been crying. If you’re going to confront him, do it now. — Oren', steps: [
      { type: 'minigame', npc: 'cassius', id: 'duel', obj: 'Confront Cassius in the Room of Requirement.', lines: ['You couldn’t leave it alone, could you? FINE. Wands out.'],
        opts: () => ({ opponents: [{ name: 'Cassius Vane', house: 'slytherin', level: 6, hp: 280, spells: ['stupefyE', 'expelliarmusE', 'incendioE', 'curse'], rate: 1.2, block: 0.4, dodge: 0.35, volley: 2, line: 'I’m sorry.', look: { house: 'slytherin', hairStyle: 'short', hairColor: '#e8dcc0', skin: SKIN_TONES[0] } }], winTitle: 'Cassius yields' }),
        pass: (r) => r.success, win: ['…Go on, then. Turn me in.', 'He’s got my mother. If I don’t fix the cabinet and… and do the other thing… he kills her. I can’t do it. I CAN’T.'], lose: ['Leave me alone. Please.'] },
      { type: 'talk', npc: 'headmistress', obj: 'Tell the Headmistress what Cassius said.', lines: [
        'I know. I have known since the necklace. His mother is under our protection as of an hour ago — he does not know that yet.',
        'Tomorrow night, you and I are going to a cave. Bring your fire spells. You will need them.',
      ] },
    ], points: 35 },
    // 9 — the cave (boss)
    { title: 'The Sea Cave', from: 'Headmistress Aldmoor', autosave: true, steps: [
      { type: 'go', zone: 'grounds', pos: () => new THREE.Vector3(0, groundHeight(0, 96), 96), r: 5, obj: 'Meet the Headmistress at the castle gates. You will Apparate from beyond the boundary.', run: async () => {
        const s = G.story;
        s.placeNPC('headmistress', 'grounds', new THREE.Vector3(2, groundHeight(2, 98), 98), Math.PI);
        await s.talk('headmistress', ['Take my arm. This will feel like being squeezed through a very small tube. Hold on.']);
        await G.ui.fade(1, 0.5);
        G.audio.sfx('portkey');
        G.world.setZone('cave', { pos: cave().spots.tunnel, yaw: Math.PI });
        s.placeNPC('headmistress', 'cave', cave().spots.tunnel.clone().add(new THREE.Vector3(1.4, 0, -1.5)), Math.PI);
        await G.ui.fade(0, 0.6);
      } },
      { type: 'go', zone: 'cave', pos: () => cave().spots.door, r: 3, obj: 'Follow the tunnel to the stone door.', run: async () => {
        const s = G.story;
        s.placeNPC('headmistress', 'cave', cave().spots.door.clone().add(new THREE.Vector3(1.2, 0, 0.5)), Math.PI);
        await s.talk('headmistress', ['A door that asks for payment. Blood, of course. Crude, but he always was.']);
        G.audio.sfx('slam'); G.cam.shake(0.3);
        cave().caveDoor.visible = false; cave().caveDoorCol.disabled = true;
        await G.ui.say([{ who: '', color: '#fff', voice: 'mid', text: 'Beyond the door, a cavern opens around a black lake. Something pale drifts beneath the surface. Many somethings.' }]);
      } },
      { type: 'go', zone: 'cave', pos: () => cave().spots.shore, r: 4, obj: 'Go down to the shore. There is a boat.', run: async () => {
        const s = G.story;
        await G.ui.fade(1, 0.5);
        cave().boat.position.copy(cave().spots.island).setY(cave().spots.lakeY + 0.25).add(new THREE.Vector3(0, 0, 9));
        G.player.teleport(cave().spots.island, Math.PI);
        cave().checkpoint = { pos: cave().spots.island.clone(), yaw: Math.PI };
        s.placeNPC('headmistress', 'cave', cave().spots.basin.clone().add(new THREE.Vector3(1.2, 0, 1)), Math.PI);
        await G.ui.fade(0, 0.5);
        await s.talk('headmistress', ['The locket is in the basin, under the potion. The potion must be drunk; it cannot be emptied any other way.', 'I will drink it. Whatever I say, whatever I beg — make me keep drinking. Promise me.']);
        await G.ui.say([
          { ...s.speaker('headmistress'), text: '…No. No, please, not again. I’m sorry, I’m so sorry—' },
          { ...s.speaker('headmistress'), text: 'Water… please… water…' },
        ]);
        G.ui.banner('The Headmistress has drunk the poison', 'You scoop water from the lake — and the lake stirs', '');
        G.cam.shake(0.4); G.audio.sfx('splash');
        addItem('locket', 1);
      } },
      { type: 'fight', zone: 'cave', obj: 'The Inferi are rising! Protect the Headmistress — fire drives them back (Incendio, Confringo).', at: () => cave().spots.centre, r: 30,
        waves: [
          () => { const C = cave().spots.centre; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; G.enemies.spawn('inferius', C.clone().add(new THREE.Vector3(Math.cos(a) * 7.5, 0, Math.sin(a) * 7.5)), { aggro: true, rise: true }); } },
          () => { const C = cave().spots.centre; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3; G.enemies.spawn('inferius', C.clone().add(new THREE.Vector3(Math.cos(a) * 8, 0, Math.sin(a) * 8)), { aggro: true, rise: true }); } },
          () => { const C = cave().spots.centre; const b = G.enemies.spawn('drownedhost', C.clone().add(new THREE.Vector3(0, 0, -7)), { aggro: true, rise: true, center: C }); b.phase = 1; b.phaseLabel = 'It rises from the deep'; },
        ],
        waveIntro: async (Y, w) => { if (w === 1) G.ui.banner('More of them!', 'They keep coming out of the water', ''); if (w === 2) { G.ui.banner('The Drowned Host', 'A giant of the drowned rises — burn it!', ''); G.cam.shake(0.6); } },
        respawn: () => ({ pos: cave().spots.island, yaw: Math.PI }),
        win: async () => {
          const s = G.story;
          G.audio.sfx('incendio'); postFlash(0.5);
          await G.ui.say([{ ...s.speaker('headmistress'), text: 'ENOUGH. (A ring of roaring fire bursts from her wand and sweeps across the lake.)' }]);
          G.fx.emit({ pos: cave().spots.centre.clone().setY(cave().spots.centre.y + 1), color: 0xffa020, color2: 0xff2000, count: 200, speed: 14, size: 0.8, life: 1.2, intensity: 3 });
          await s.talk('headmistress', ['Home. Quickly. Hold my arm — I am… not quite myself.']);
          s.hideNPC('headmistress');
          await G.ui.fade(1, 0.5);
          G.enemies.clearZone();
          G.world.setZone('tower', { pos: Z().tower.spots.headmistress.clone().add(new THREE.Vector3(0, 0, 3)), yaw: Math.PI });
          await G.ui.fade(0, 0.5);
          F().cave = true;
        } },
    ], points: 120 },
    // 10 — the tower (boss)
    { title: 'The Tower', from: 'Headmistress Aldmoor', autosave: true, steps: [
      { type: 'fight', zone: 'tower', obj: 'The Hollowed have come through Cassius’s cabinet! Defend the Headmistress in her tower.', at: () => Z().tower.spots.headmistress, r: 30,
        intro: async () => {
          const s = G.story;
          s.placeNPC('headmistress', 'tower', Z().tower.spots.headmistress, 0);
          s.placeNPC('cassius', 'tower', Z().tower.spots.headmistress.clone().add(new THREE.Vector3(-3, 0, 3)), 0.6);
          await G.ui.say([
            { ...s.speaker('cassius'), text: 'I— I let them in. The cabinet. They’re coming up the stairs. I’m supposed to… I’m supposed to kill you, Headmistress.' },
            { ...s.speaker('headmistress'), text: 'You are not a killer, Cassius. Your mother is safe. She has been safe since Thursday. Stand with us.' },
            { ...s.speaker('cassius'), text: '…She’s safe? Then — then I’m not doing it. I’m NOT.' },
          ]);
          s.hideNPC('cassius');
        },
        waves: [
          () => { const c = Z().tower.spots.headmistress; for (let i = 0; i < 4; i++) G.enemies.spawn('wizard', c.clone().add(new THREE.Vector3(-6 + i * 4, 0, 6)), { level: 6, spells: ['curse', 'stupefyE', 'incendioE'], aggro: true, name: 'Hollowed' }); },
          () => { const c = Z().tower.spots.headmistress; const m = G.enemies.spawn('malachar', c.clone().add(new THREE.Vector3(0, 0, 6)), { center: c, aggro: true, fleeAt: 0.45, fleeLine: 'He hurls a curse at the Headmistress as he vanishes.' }); m.phase = 1; m.phaseLabel = 'Phase I'; },
        ],
        waveIntro: async () => { G.ui.banner('Malachar!', 'He has come for the Headmistress', ''); },
        respawn: () => ({ pos: Z().tower.spots.headmistress.clone().add(new THREE.Vector3(0, 0, 3)), yaw: Math.PI }),
        win: async () => {
          const s = G.story;
          G.audio.sfx('curse'); postFlash(0.6);
          await s.talk('headmistress', ['…His parting gift. The curse in my hand is spreading. No — don’t fuss. I have a year, perhaps. That is enough.', 'The locket. Give it to me… This is not the vessel. It is a fake.']);
          addItem('locket', -1);
          await G.ui.say([{ who: 'A note inside the locket', color: '#e0c890', voice: 'mid', text: '“To the Hollow King — I know I will be dead long before you read this. I have stolen the real vessel and I mean to destroy it. — M.V.”' }]);
          F().tower = true;
        } },
    ], points: 150 },
    // 11
    { title: 'M.V.', from: 'Cassius Vane', steps: [
      { type: 'talk', npc: 'cassius', place: ['greatHall', () => gh(-6, 0, -10), 0.5], obj: 'Show Cassius the note from the locket.', lines: [
        '“M.V.”… Marius Vane. My uncle. The family never talks about him — he vanished when I was a baby. They said he ran away.',
        'He didn’t run. He went after the Hollow King. He was… brave.',
        'Next year I’m not coming back to school. Neither are you, I’d bet. If you hunt the rest of the vessels — I want in. For my uncle. And for my mother.',
      ], after: () => { G.save.flags.cassiusAlly = true; meet('cassius'); } },
    ], points: 40 },
  ],
  // ---------------------------------------------------------------- side quests
  side: [
    { id: 'walls', title: 'Isolde’s Ingredients', from: 'Isolde Varga', hint: 'Isolde wants something from behind the dungeon walls.', available: (Y) => Y.qi >= 5, steps: [
      { type: 'talk', npc: 'isolde', lines: ['Two old storerooms in the dungeons were bricked up a century ago. One holds powdered moonstone. Reducto should do it.'] },
      { type: 'puzzle', ids: ['y6-wall-0', 'y6-wall-1'], obj: 'Blast open the two bricked-up storerooms in the dungeons (Reducto or Bombarda).' },
      { type: 'talk', npc: 'isolde', obj: 'Bring Isolde the moonstone.', lines: ['A century of dust and THREE jars of moonstone. You are officially my favourite person.'], after: () => { meet('isolde'); G.save.friends.isolde.f += 12; } },
    ] },
    { id: 'seeds', title: 'Runaway Seeds', from: 'Bram Okafor', hint: 'Bram is staring up at the greenhouse roofs.', steps: [
      { type: 'talk', npc: 'bram', lines: ['My Tentacula seed pods burst and flung seeds onto the greenhouse roofs. If they sprout up there… Accio them down?'] },
      { type: 'puzzle', ids: ['y6-seed-0', 'y6-seed-1', 'y6-seed-2'], obj: 'Accio Bram’s three seed pods off the greenhouse roofs.', marker: () => { const o = [0, 1, 2].map((i) => G.puzzles.byId[`y6-seed-${i}`]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone() }; } },
      { type: 'talk', npc: 'bram', obj: 'Return the seed pods to Bram.', lines: ['Crisis averted! Professor Thornwick never needs to know.'], after: () => { meet('bram'); G.save.friends.bram.f += 12; } },
    ] },
    { id: 'lantern', title: 'The Lantern Club', from: 'Professor Pell', hint: 'Professor Pell wants you at his club.', available: (Y) => Y.qi >= 1, steps: [
      { type: 'minigame', npc: 'pell', id: 'potions', opts: { quest: true }, lines: ['A little brewing contest for the Lantern Club! The winner gets my eternal admiration — and a pair of tickets to the Hogsmeade sweet shop.'], pass: (r) => r.success, win: ['Superb! Here — your prize.'], lose: ['Next time, my dear!'] },
    ] },
  ],
};
