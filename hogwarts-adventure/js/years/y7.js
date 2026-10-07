// Year 7 — The Last Stand. The Hollow King has seized the Ministry. Hogwarts is the last
// place that will not kneel. Destroy the remaining vessels, defend the castle, and face him.
import * as THREE from 'three';
import { G } from '../state.js';
import { TRAIN_EVENTS } from '../journey.js';
import { SKIN_TONES } from '../models.js';
import { chest, crackedWall, ledgeItem } from '../puzzles.js';
import { groundHeight, PLATEAU, SPOTS } from '../world/terrain.js';
import { FRIENDS, meet } from '../friends.js';
import { addItem, itemCount } from '../items.js';
import { sleep, rand } from '../util.js';
import { postFlash, setFrost } from '../engine.js';

const Z = () => G.world.zones;
const gh = (x, y, z) => Z().greatHall.W(x, y, z);
const rr = (x, y, z) => Z().requirement.W(x, y, z);
const gr = (x, z, dy = 0) => new THREE.Vector3(x, groundHeight(x, z) + dy, z);
const front = (dx = 0, dz = 0) => new THREE.Vector3(dx, PLATEAU, 10 + dz);
const F = () => G.save.flags.y7;
const clearHall = (on) => { const g = Z().greatHall; g.tables.visible = !on; g.tableCols.forEach((c) => (c.disabled = on)); };
const until = (fn, max = 1e9) => new Promise((res) => { const t0 = performance.now(); const t = () => (G.quitting ? res(false) : fn() ? res(true) : performance.now() - t0 > max ? res(false) : setTimeout(t, 100)); t(); });

const NPCS = {
  vesper: { name: 'Vesper Mordaunt', voice: 'high', color: '#ff80a8', look: { robeColor: '#14101a', liningColor: '#5a1030', hairStyle: 'long', hairColor: '#0a0808', skin: SKIN_TONES[0], eyeGlow: '#ff4080', scale: 1.02 } },
  hollowking: { name: 'The Hollow King', voice: 'low', color: '#40ff70', look: { robeColor: '#0a0a0c', liningColor: '#0a3a1a', mask: true, eyeGlow: '#40ff70', skin: '#e8e4dc', bald: true, scale: 1.4 } },
  ashdown: { name: 'Rowan Ashdown', voice: 'mid', color: '#c8b8a0', look: { robeColor: '#4a4038', liningColor: '#7a6a50', hairStyle: 'messy', hairColor: '#8a6a4a', beard: 'short', beardColor: '#8a6a4a', skin: SKIN_TONES[1], scale: 1.02 } },
  calloway: { name: 'Professor Calloway', voice: 'low', color: '#e0a070', look: { robeColor: '#3a2a1a', liningColor: '#a04a20', hairStyle: 'short', hairColor: '#5a5a5a', beard: 'short', beardColor: '#6a6a6a', skin: SKIN_TONES[3], scale: 1.08 } },
};

// a goodbye from each of your closest friends (the ending scenes)
const ENDINGS = {
  pip: ['Seven years. You know I picked you on the train because you looked as scared as me? Best decision I ever made.', 'I’m going to work at the Ministry — the nice bit, with the creatures. Promise you’ll visit. Promise.'],
  oren: ['I named that star after you, remember? Third year. I checked last night. It’s still there. Some things last.', 'I’ve been offered a place at the Observatory in Prague. Write to me. Long letters. With footnotes.'],
  tamsin: ['Best Beater in a hundred years, me. Second-best fighter in this castle, though. Don’t let it go to your head.', 'The Harpies want me for next season. Come to every match, or I’ll hex you.'],
  kofi: ['I’m opening the joke shop. In Hogsmeade. First product: the Hollow King Whoopee Cushion. Too soon? It’s too soon.', 'You get free stuff forever. That’s in writing now. Mostly.'],
  isolde: ['I never said it, did I? Thank you. For the moonstone, and the moonpetals, and for walking into every terrible place first.', 'I’m apprenticing to a Healer at St Mungo’s. If you ever get cursed again, ask for me.'],
  ruairi: ['The Thestral foal still follows me around. I think it’s waiting for you to come back.', 'I’m staying on with Brannoc — Keeper of Keys and Grounds, one day. Someone has to look after the beasts.'],
  mei: ['I took a photo of everything. Every single year. I’m making a book. You’re on the cover — upside down, being chased by a dragon.', 'Thank you for coming into the forest for me. Nobody ever had before.'],
  bram: ['I used to be afraid of everything. Then I followed you into a war. Turns out I’m only afraid of most things now.', 'Professor Thornwick wants me to take over the greenhouses one day. Me! A teacher!'],
  cassius: ['I spent six years hating you because it was easier than hating my father.', 'My uncle would have liked you. My mother does. And I… you know. Don’t make me say it. Friends. There. Happy?'],
};

let sideBuilt = false;
function sidePuzzles() {
  if (sideBuilt) return;
  sideBuilt = true;
  const P = G.puzzles;
  crackedWall(P, 'y7-wall-0', 'grounds', gr(-20, 30), 0.2, 3, 3);
  crackedWall(P, 'y7-wall-1', 'grounds', gr(25, 30), -0.2, 3, 3);
  [[-50, 20, 6], [50, 20, 6], [0, 50, 7]].forEach(([x, z, dy], i) => ledgeItem(P, `y7-supply-${i}`, 'grounds', gr(x, z, dy), { item: 'potion' }));
  chest(P, 'y7-rr-chest', 'requirement', rr(-10, 0, -33), Math.PI, { coins: 100, item: 'potion', n: 2 });
}

// ------------------------------------------------------------------ the train: stopped and searched by the Hollowed
TRAIN_EVENTS[7] = async () => {
  const st = G.story;
  const tr = Z().train;
  G.ui.toast('The train shrieks to a halt. Torchlight in the corridor.', 'info', 2500);
  G.trainNight = 1;
  setFrost(0.4);
  await new Promise((res) => st.run(async () => {
    await st.talk('tamsin', ['Hollowed. Searching every compartment. They’re looking for you. Whatever happens, we stay together.']);
    res();
  }));
  const p = G.player;
  G.enemies.hpScale = 1; G.enemies.dmgScale = 0.8;
  G.enemies.spawn('dementor', tr.W(1.1, 0, p.pos.z - tr.offset.z - 9), { aggro: true });
  for (let i = 0; i < 2; i++) G.enemies.spawn('wizard', tr.W(1.1, 0, p.pos.z - tr.offset.z - 4 - i * 2.5), { level: 5, spells: ['curse', 'stupefyE'], aggro: true, name: 'Hollowed searcher' });
  await until(() => !G.enemies.list.some((e) => e.alive), 90000);
  for (const e of G.enemies.list) if (e.alive) e.die({});
  setFrost(0);
  G.trainNight = 0;
  await new Promise((res) => st.run(async () => { await st.talk('kofi', ['Right. So that’s how this year’s going to be. Brilliant. Love that.']); res(); }));
};

export default {
  n: 7,
  title: 'The Last Stand',
  feast: [
    'Welcome home. I will be brief, because the Ministry is listening and I am tired of whispering.',
    'The Hollow King controls the Ministry, the Prophet and Grimstone Prison. Hogwarts does not answer to him. It never will.',
    'Professor Calloway and Rowan Ashdown have joined our staff. The castle’s defences have been woken. Every student is a defender now.',
    'Eat well. It may be some time before we feast like this again.',
  ],
  cupLines: [
    'This year the darkest wizard of our age came to our gates, and he did not get in.',
    'We lost much. We kept more. Whatever house you are in — tonight, every one of you is Hogwarts.',
  ],
  setup() {
    const s = G.story;
    for (const [id, d] of Object.entries(NPCS)) s.registerNPC(id, d);
    s.addTalker('ashdown', 'Talk to Rowan Ashdown', () => s.talk('ashdown', ['Whatever happens this year — I’m proud of you. I always have been.']));
    s.addTalker('calloway', 'Talk to Professor Calloway', () => s.talk('calloway', ['Wands up, eyes open. That’s the whole lesson now.']));
    sidePuzzles();
  },
  placeNPCs(Y) {
    const s = G.story;
    const q = G.save.yq;
    s.placeNPC('calloway', 'greatHall', gh(5, 0.8, -31), -0.3);
    s.placeNPC('ashdown', 'greatHall', gh(-5, 0.8, -31), 0.3);
    s.placeNPC('duskwood', 'greatHall', gh(8, 0, -26), -0.5);
    if (G.save.flags.cassiusAlly) s.placeNPC('cassius', 'greatHall', gh(-7, 0, -8), 0.6);
  },
  quests: [
    // 1
    { title: 'The Last Year', from: 'Headmistress Aldmoor', letter: 'Come to me as soon as the feast is over. We have very little time and a great deal to do. — M.A.', steps: [
      { type: 'talk', npc: 'headmistress', obj: 'Talk to the Headmistress after the feast.', lines: [
        'Look at my hand. The curse has reached my elbow. By summer it will reach my heart — so we must finish this before summer.',
        'Seven vessels. The amulet, destroyed in your second year. The ring — I destroyed it myself, and it gave me this. Four remain, and then the man himself.',
        'The locket that Marius Vane stole. A golden cup. A circlet hidden somewhere in this castle. And the last… I am not yet sure.',
        'Fangs of the Wyrm you slew can destroy them. Start there.',
      ] },
    ], points: 20 },
    // 2
    { title: 'Oppugno', from: 'Professor Duskwood', letter: 'Defence club tonight in the Great Hall. Everyone. I’m teaching something nasty. — Prof. Duskwood', steps: [
      { type: 'talk', npc: 'duskwood', obj: 'Join Professor Duskwood’s defence club.', lines: [
        'Oppugno: conjure a flock of birds that dive at your enemy and keep diving. It looks silly. It is not silly.',
      ], after: () => G.spells.unlock('oppugno') },
      { type: 'fight', zone: 'greatHall', obj: 'Drill with the castle’s enchanted suits of armour (Oppugno, Bombarda, Reducto).',
        spawn: () => { for (const [x, z] of [[-5, -24], [0, -26], [5, -24]]) G.enemies.spawn('dummy', gh(x, 0, z), { yaw: 0 }); for (let i = 0; i < 3; i++) G.enemies.spawn('duelist', gh(-4 + i * 4, 0, -18), { level: 4, spells: ['stupefyE'], aggro: true, name: 'Enchanted armour', look: { robeColor: '#8a8a90', liningColor: '#c0c0c8', hat: true, hatColor: '#8a8a90', skin: '#a0a0a8', noWand: false } }); } },
    ], points: 25 },
    // 3
    { title: 'Fangs of the Wyrm', from: 'Cassius Vane', letter: 'The Headmistress says Wyrm fangs destroy vessels. You killed one in second year. Show me where. — C. Vane', steps: [
      { type: 'go', zone: 'dungeon', pos: () => Z().dungeon.W(0, 0, -79), r: 3, obj: 'Go down to the Undercroft door in the dungeons with Cassius.', run: async () => {
        await G.story.talk('cassius', ['So this is where you fought a giant snake at twelve. Of course it is.']);
        await G.world.travel('undercroft', 'fromDungeon');
      } },
      { type: 'collect', zone: 'undercroft', obj: 'Collect three fangs from the Wyrm’s bones in the Great Chamber.', model: () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.5 })); m.rotation.z = 0.6; return m; },
        items: () => { const c = Z().undercroft.spots.chamber; return [c.clone().add(new THREE.Vector3(-4, 0.6, -6)), c.clone().add(new THREE.Vector3(3, 0.6, -10)), c.clone().add(new THREE.Vector3(0, 0.6, -18))]; } },
      { type: 'talk', npc: 'cassius', place: ['undercroft', () => Z().undercroft.spots.chamber.clone().add(new THREE.Vector3(2, 0, 2)), Math.PI], obj: 'Show Cassius the fangs.', lines: ['Three fangs. Three vessels. Let’s go and find my uncle’s locket.'], after: () => addItem('fang', 3) },
    ], points: 30 },
    // 4
    { title: 'The Locket', from: 'Cassius Vane', autosave: true, steps: [
      { type: 'talk', npc: 'cassius', obj: 'Cassius has found an old Vane family portkey. Talk to him in the Great Hall.', lines: [
        'My uncle was buried — well, his empty coffin was — in the old family crypt. In the graveyard where you… you know. If he hid the locket anywhere, it’s there.',
        'Take hold. On three. One—',
      ], after: async () => { await G.ui.fade(1, 0.5); G.audio.sfx('portkey'); G.skyObj.lock = 0.9; G.world.setZone('graveyard', { pos: Z().graveyard.W(0, 14), yaw: Math.PI }); await G.ui.fade(0, 0.6); } },
      { type: 'fight', zone: 'graveyard', obj: 'Inferi guard the Vane crypt! Clear the graveyard.', at: () => Z().graveyard.spots.crypt, r: 50,
        spawn: () => { const z = Z().graveyard; for (let i = 0; i < 7; i++) G.enemies.spawn('inferius', z.W(-12 + i * 4, -18 + rand(-3, 3)), { aggro: true, rise: true }); },
        respawn: () => ({ pos: Z().graveyard.W(0, 14), yaw: Math.PI }) },
      { type: 'go', zone: 'graveyard', pos: () => Z().graveyard.spots.crypt, r: 3, obj: 'Search the Vane crypt for the locket.', run: async () => {
        await G.ui.say([{ who: '', color: '#fff', voice: 'mid', text: 'Behind a loose stone: a heavy gold locket, and a scrap of parchment. “For whoever comes after me. Don’t look into it. — M.V.”' }]);
        addItem('locket', 1);
      } },
      { type: 'fight', zone: 'graveyard', obj: 'Stab the locket with a Wyrm fang! It fights back with phantoms of your friends.', at: () => Z().graveyard.spots.crypt, r: 50,
        intro: async () => { await G.ui.say([{ who: 'The locket', color: '#40ff70', voice: 'low', text: 'I have seen your heart. They only follow you because they pity you. They will all die because of you.' }]); setFrost(0.4); },
        spawn: () => { const z = Z().graveyard; const ids = ['pip', 'tamsin', 'oren']; ids.forEach((id, i) => { const f = FRIENDS[id]; G.enemies.spawn('duelist', z.W(-6 + i * 6, -16), { aggro: true, level: 5, hp: 150, spells: ['curse', 'stupefyE'], name: `${f.short}’s phantom`, look: { ...f.look, eyeGlow: '#40ff70' } }); }); },
        win: async () => {
          setFrost(0);
          G.audio.sfx('shatter'); postFlash(0.6);
          addItem('locket', -1); addItem('fang', -1);
          G.ui.banner('The locket is destroyed!', 'Two vessels left — and the man himself', 'unlock');
          await G.story.talk('cassius', ['It’s done. Uncle Marius… it’s done.', 'Let’s go home before something else crawls out of a grave.']);
          await G.ui.fade(1, 0.5);
          G.enemies.clearZone();
          G.skyObj.lock = null;
          G.world.setZone('greatHall', { pos: gh(0, 0, -6), yaw: Math.PI });
          await G.ui.fade(0, 0.5);
          F().locket = true;
        } },
    ], points: 60 },
    // 5
    { title: 'The Golden Cup', from: 'Mei Takahashi', letter: 'My father works at the Ministry. Vesper Mordaunt keeps something in a vault behind the Veil Chamber. He says it’s a golden cup. — Mei', steps: [
      { type: 'talk', npc: 'mei', obj: 'Ask Mei about the cup.', lines: ['The Thestrals can take us to London again. I’m coming. Don’t argue — I know the Ministry better than anyone here.'], after: async () => {
        await G.ui.fade(1, 0.5);
        G.ui.banner('The Ministry of Magic', 'Its halls hang with the Hollow King’s banners now', 'quest');
        await sleep(900);
        const z = Z().arcana;
        G.world.setZone('arcana', { pos: z.W(0, 0, -95), yaw: Math.PI });
        await G.ui.fade(0, 0.6);
      } },
      { type: 'fight', zone: 'arcana', obj: 'Fight through Vesper’s guards in the Veil Chamber.', at: () => Z().arcana.spots.arena, r: 25,
        waves: [
          () => { const z = Z().arcana; for (let i = 0; i < 4; i++) G.enemies.spawn('wizard', z.spots.arena.clone().add(new THREE.Vector3(-6 + i * 4, 0, -4)), { level: 6, spells: ['curse', 'killing', 'stupefyE'], aggro: true, name: 'Hollowed guard' }); },
          () => { const z = Z().arcana; G.enemies.spawn('dementor', z.spots.arena.clone().add(new THREE.Vector3(0, 0, -6)), { aggro: true, lord: true, hp: 1400, name: 'Vault warden' }); },
        ],
        waveIntro: async () => { G.ui.banner('The vault warden', 'A Dementor lord bound to the vault', ''); },
        respawn: () => ({ pos: Z().arcana.W(0, 0, -95), yaw: Math.PI }) },
      { type: 'go', zone: 'arcana', pos: () => Z().arcana.spots.arch, r: 3, obj: 'Take the cup from the vault beneath the arch — and destroy it.', run: async () => {
        await G.ui.say([
          { who: '', color: '#fff', voice: 'mid', text: 'Beneath the arch, a hidden alcove. A small golden cup, engraved with a badger.' },
          { ...G.story.speaker('mei'), text: 'Do it. Now, before it does anything.' },
        ]);
        G.audio.sfx('shatter'); postFlash(0.6);
        addItem('fang', -1);
        G.ui.banner('The cup is destroyed!', 'One vessel left — and the man himself', 'unlock');
        await G.ui.fade(1, 0.5);
        G.enemies.clearZone();
        G.world.setZone('greatHall', { pos: gh(0, 0, -6), yaw: Math.PI });
        await G.ui.fade(0, 0.5);
        F().cup = true;
      } },
    ], points: 60 },
    // 6 — twist
    { title: 'The Last Vessel', from: 'Headmistress Aldmoor', autosave: true, letter: 'Come to my tower. Christmas Eve. I know what the last vessel is. — M.A.', steps: [
      { type: 'talk', npc: 'headmistress', place: ['tower', () => Z().tower.spots.headmistress, 0], obj: 'Visit the Headmistress in her tower on Christmas Eve.', enter: () => { G.save.flags.xmas = 7; }, lines: [
        'Merry Christmas. Sit. This is not a happy story, so I will tell it quickly.',
        'The night in the graveyard, he needed a body, a servant’s flesh, and a shard of the Grey Horn. Malachar gave all three. And the Hollow King gave him something back.',
        'The last vessel is Malachar himself. A piece of the Hollow King’s soul lives inside his most loyal servant. That is why Malachar always escapes. He has been protected.',
        'The circlet first — it is in this castle, somewhere only the desperate find. Then Malachar must fall. And then… then the Hollow King will be mortal.',
      ], after: () => { G.save.flags.xmas = 0; F().malacharVessel = true; } },
    ], points: 30 },
    // 7
    { title: 'The Circlet', from: 'Bram Okafor', letter: 'The Room of Requirement changed when I asked for “a place to hide things”. It’s ENORMOUS. Mountains of junk. There’s a glowing circlet on a bust. — Bram', steps: [
      { type: 'go', zone: 'requirement', pos: () => Z().requirement.spots.mirror, r: 4, obj: 'Search the Room of Requirement — the Room of Hidden Things — for the circlet.', run: async () => {
        await G.ui.say([
          { who: '', color: '#fff', voice: 'mid', text: 'On a bust by the great mirror: a silver circlet set with a blue stone.' },
          { ...G.story.speaker('cassius'), text: 'Wait. Someone else is here. My father’s friends. They followed us.' },
        ]);
        addItem('circlet', 1);
      } },
      { type: 'fight', zone: 'requirement', obj: 'The Hollowed have set cursed fire in the Room! Fight them off and destroy the circlet.', at: () => rr(0, 0, -16), r: 30,
        spawn: () => { for (let i = 0; i < 4; i++) G.enemies.spawn('wizard', rr(-6 + i * 4, 0, -6), { level: 6, spells: ['incendioE', 'curse', 'killing'], aggro: true, name: 'Hollowed' }); for (let i = 0; i < 6; i++) G.enemies.hazard(rr(rand(-10, 10), 0, rand(-30, -8)), 2.2, 30, 10, 0xff5010); },
        win: async () => {
          G.audio.sfx('shatter'); postFlash(0.6);
          addItem('circlet', -1); addItem('fang', -1);
          G.ui.banner('The circlet is destroyed!', 'Only Malachar remains — and then the Hollow King', 'unlock');
          await G.story.talk('cassius', ['That’s three. Now there’s only him. And Malachar.']);
          F().circlet = true;
        } },
    ], points: 50 },
    // 8 — gathering friends
    { title: 'The Calm Before', from: 'Rowan Ashdown', letter: 'The Hollow King has given us until midnight to hand you over. We will not. Gather your friends. — R.A.', steps: [
      { type: 'talk', npc: 'pip', obj: 'Find Pip — the castle is preparing for battle.', lines: ['Hand you over? Over my dead body. Well — over my very-much-alive-and-angry body. I’m staying.'] },
      { type: 'talk', npc: 'tamsin', obj: 'Find Tamsin.', lines: ['A war? Finally. I’ve been warming up for seven years.'] },
      { type: 'talk', npc: 'oren', obj: 'Find Oren.', lines: ['I’ve read about every battle in wizarding history. We win this one. I’ve decided. It’s in my notes.'] },
      { type: 'talk', npc: 'cassius', obj: 'Find Cassius.', lines: ['My father is out there with him. I know. I’m on this side of the wall. That’s my answer.'], after: () => { G.save.flags.cassiusRedeemed = true; } },
    ], points: 30 },
    // 9 — the battle (wave defence)
    { title: 'The Battle of Hogwarts', from: 'Headmistress Aldmoor', autosave: true, steps: [
      { type: 'fight', zone: 'grounds', obj: 'Defend the castle! Hold the courtyard before the Great Hall doors.', at: () => front(), r: 40,
        intro: async () => {
          G.skyObj.lock = 0.93;
          const c = front();
          G.cam.setCinematic(c.clone().add(new THREE.Vector3(0, 8, -16)), c.clone().add(new THREE.Vector3(0, 0, 40)), 1.6);
          await G.ui.say([
            { ...G.story.speaker('headmistress'), text: 'Piertotum Locomotor! Every statue, every suit of armour: DEFEND THE CASTLE!' },
            { ...G.story.speaker('hollowking'), text: 'You have until midnight. Then I come for every last one of you.' },
          ]);
          G.cam.setCinematic(null);
          G.audio.sfx('gong');
        },
        waves: [
          () => { for (let i = 0; i < 5; i++) G.enemies.spawn('wizard', front(-12 + i * 6, 40), { level: 5, spells: ['curse', 'stupefyE', 'incendioE'], aggro: true, name: 'Hollowed' }); },
          () => { for (let i = 0; i < 6; i++) G.enemies.spawn('spider', front(-15 + i * 6, 38), { aggro: true, scale: i % 2 ? 1.4 : 1 }); },
          () => { for (let i = 0; i < 4; i++) G.enemies.spawn('dementor', front(-10 + i * 7, 36), { aggro: true }); G.enemies.spawn('dementor', front(0, 44), { aggro: true, lord: true, hp: 1200, name: 'Dementor lord' }); },
          () => { G.enemies.spawn('troll', front(0, 40), { aggro: true, name: 'War troll', center: front() }); for (let i = 0; i < 3; i++) G.enemies.spawn('wizard', front(-8 + i * 8, 46), { level: 6, spells: ['curse', 'killing'], aggro: true, name: 'Hollowed' }); },
          () => { for (let i = 0; i < 8; i++) G.enemies.spawn('inferius', front(-14 + i * 4, 34), { aggro: true, rise: true }); },
          () => { const c = front(); const v = G.enemies.spawn('vesper', front(0, 30), { center: c, aggro: true }); v.phase = 1; v.phaseLabel = 'Phase I'; },
        ],
        waveIntro: async (Y, w) => {
          const T = [null, ['Acromantulas!', 'The spiders have joined him'], ['Dementors!', 'Expecto Patronum, everyone!'], ['A war troll!', 'Blast it — and mind its club'], ['The drowned march', 'Fire drives back the Inferi'], ['Vesper Mordaunt', 'She has come to finish what she started']][w];
          if (T) G.ui.banner(T[0], T[1], '');
          if (w === 3) G.ui.toast('Professor Calloway: “Hold the line!”', 'info', 2500);
        },
        respawn: () => ({ pos: front(0, -4), yaw: 0 }),
        win: async () => {
          await G.story.talk('ashdown', ['Vesper is down. We’re holding. But look — the gates. Malachar is coming himself.']);
        } },
      { type: 'fight', zone: 'grounds', obj: 'Malachar — the last vessel. End him.', at: () => front(), r: 40,
        intro: async () => { await G.ui.say([{ who: 'Malachar the Hollow', color: '#7aff9a', voice: 'low', text: 'Seven years, child. Seven years you have humiliated me. Tonight my master makes me immortal — and you, a corpse.' }]); },
        spawn: () => { const c = front(); const m = G.enemies.spawn('malachar', front(0, 20), { center: c, aggro: true, hp: 2600 }); m.phase = 1; m.phaseLabel = 'Phase I'; },
        respawn: () => ({ pos: front(0, -4), yaw: 0 }),
        win: async () => {
          G.audio.sfx('dementor'); postFlash(0.7); G.cam.shake(0.8);
          G.ui.banner('Malachar is destroyed', 'And with him, the last vessel', 'unlock');
          await sleep(1200);
          await G.ui.say([{ who: 'The Hollow King', color: '#40ff70', voice: 'low', text: 'NO. NO! …Very well. The Great Hall. Come alone, champion, and let us end this. If you do not, I burn the castle and everyone in it.' }]);
          G.skyObj.lock = null;
          F().malachar = true;
        } },
    ], points: 150 },
    // 10 — the final duel
    { title: 'The Hollow King', from: 'Headmistress Aldmoor', autosave: true, steps: [
      { type: 'talk', npc: 'headmistress', place: ['grounds', () => front(2, -6), Math.PI], obj: 'Talk to the Headmistress before you go in.', lines: [
        'He is mortal now. Truly mortal, for the first time in fifty years. And he is afraid.',
        'I would go in your place if I could. I cannot. But you will not be alone — not ever. Go.',
      ] },
      { type: 'fight', zone: 'greatHall', obj: 'Face the Hollow King in the Great Hall.', at: () => gh(0, 0, -14), r: 30,
        enter: () => clearHall(true), done: () => clearHall(false),
        intro: async () => {
          const c = gh(0, 0, -14);
          G.skyObj.lock = 0.93;
          G.cam.setCinematic(c.clone().add(new THREE.Vector3(-10, 5, 10)), c.clone().setY(c.y + 2), 1.6);
          await G.ui.say([
            { ...G.story.speaker('hollowking'), text: 'The champion. The Horn-breaker. The thief of my vessels. Do you know why I chose you, at the Goblet?' },
            { ...G.story.speaker('hollowking'), text: 'Because children break. And yet here you stand.' },
            { who: G.save.name, color: '#ffffff', voice: 'mid', text: 'You’re not immortal any more, Varric. I made sure of it.' },
          ]);
          G.cam.setCinematic(null);
        },
        spawn: () => { const c = gh(0, 0, -14); const h = G.enemies.spawn('hollowkingFinal', gh(0, 0, -24), { center: c, aggro: true }); h.phase = 1; h.phaseLabel = 'Phase I — the duel'; },
        respawn: () => ({ pos: gh(0, 0, -4), yaw: Math.PI }),
        win: async () => {
          G.slowmo = 3;
          await sleep(1500);
          await G.ui.say([
            { who: '', color: '#fff', voice: 'mid', text: 'His killing curse meets your disarming charm in mid-air. For a heartbeat the two lights strain against each other—' },
            { who: '', color: '#fff', voice: 'mid', text: '—and then his own curse turns back on him. The Hollow King falls, and he is only a man after all.' },
          ]);
          G.audio.sfx('victory'); postFlash(0.8);
          G.skyObj.lock = null;
          F().victory = true;
          G.save.flags.sagaComplete = true;
        } },
    ], points: 300 },
    // 11 — endings
    { title: 'Ever After', from: 'Headmistress Aldmoor', steps: [
      { type: 'script', obj: 'Dawn over Hogwarts.', run: async () => {
        const s = G.story;
        await G.ui.fade(1, 0.8);
        G.world.setZone('grounds', { pos: front(0, -2), yaw: 0 });
        G.skyObj.lock = 0.28;
        await G.ui.fade(0, 1);
        G.ui.banner('Dawn', 'The war is over', 'quest');
        await sleep(1500);
        // your closest friends say goodbye
        const ranked = Object.keys(ENDINGS).filter((id) => G.save.friends?.[id]?.met || id === 'pip' || (id === 'cassius' && G.save.flags.cassiusRedeemed))
          .sort((a, b) => (G.save.friends?.[b]?.f || 0) - (G.save.friends?.[a]?.f || 0));
        const top = [...new Set([...ranked.slice(0, 3), ...(G.save.flags.cassiusRedeemed ? ['cassius'] : [])])];
        for (const [i, id] of top.entries()) {
          s.placeNPC(id, 'grounds', front(i * 1.6 - 2, 3), Math.PI);
          await s.talk(id, ENDINGS[id]);
        }
        await s.talk('headmistress', [
          'My hand is healing. Did you know? When he died, his curses died with him. I may have a few more years of telling students off after all.',
          'Go and find your house. There is one more feast to have.',
        ]);
        G.skyObj.lock = null;
      } },
    ], points: 50 },
  ],
  // ---------------------------------------------------------------- side quests
  side: [
    { id: 'barricades', title: 'Barricades', from: 'Professor Calloway', hint: 'Calloway wants the old walls by the courtyard cleared for defenders.', steps: [
      { type: 'talk', npc: 'calloway', lines: ['Two crumbling walls are blocking our defenders’ sightlines in the courtyard. Bring them down. Bombarda.'] },
      { type: 'puzzle', ids: ['y7-wall-0', 'y7-wall-1'], obj: 'Blast the two crumbling walls by the courtyard (Bombarda or Reducto).' },
      { type: 'talk', npc: 'calloway', obj: 'Report to Calloway.', lines: ['Good. Now nothing comes up that road without us seeing it.'] },
    ] },
    { id: 'supplies', title: 'Healing Supplies', from: 'Isolde Varga', hint: 'Isolde is organising potions for the hospital wing.', steps: [
      { type: 'talk', npc: 'isolde', lines: ['Crates of potions were stacked on the battlements and the wind knocked three onto ledges. We need every phial. Accio?'] },
      { type: 'puzzle', ids: ['y7-supply-0', 'y7-supply-1', 'y7-supply-2'], obj: 'Accio the three crates of healing potions off the castle ledges.', marker: () => { const o = [0, 1, 2].map((i) => G.puzzles.byId[`y7-supply-${i}`]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone() }; } },
      { type: 'talk', npc: 'isolde', obj: 'Bring the potions to Isolde.', lines: ['Every phial. You might have just saved a dozen lives.'], after: () => { meet('isolde'); G.save.friends.isolde.f += 12; } },
    ] },
    { id: 'hidden', title: 'Hidden Things', from: 'Kofi Asante', hint: 'Kofi wants to raid the Room of Hidden Things.', available: (Y) => Y.qi >= 6, steps: [
      { type: 'talk', npc: 'kofi', lines: ['Two centuries of confiscated joke products, hidden in the Room! There’s a locked chest by the far wall. For the war effort. Obviously.'] },
      { type: 'puzzle', ids: ['y7-rr-chest'], obj: 'Open the chest in the Room of Requirement (Alohomora).' },
      { type: 'talk', npc: 'kofi', obj: 'Tell Kofi what you found.', lines: ['Fireworks! Decoy Detonators! The Hollowed won’t know what hit them.'], after: () => { meet('kofi'); G.save.friends.kofi.f += 12; } },
    ] },
    { id: 'ashdown7', title: 'One Last Lesson', from: 'Rowan Ashdown', hint: 'Ashdown wants to see your Patronus.', steps: [
      { type: 'minigame', npc: 'ashdown', id: 'duel', opts: () => ({ opponents: [{ name: 'Rowan Ashdown', level: 6, hp: 300, spells: ['stupefyE', 'expelliarmusE', 'incendioE'], rate: 1.2, block: 0.45, dodge: 0.35, volley: 2, line: 'Show me what you’ve become.', look: NPCS.ashdown.look }], winTitle: 'You beat your old teacher!' }),
        lines: ['A duel, for old times’ sake. Don’t hold back — I certainly won’t.'], pass: (r) => r.success, win: ['…Ha! There it is. I have nothing left to teach you.'], lose: ['Again! Faster this time.'] },
    ] },
  ],
};
