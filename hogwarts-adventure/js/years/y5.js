// Year 5 — The Inquisitor. The Ministry refuses to believe the Hollow King is back and sends
// Grimshaw — cleared of every charge — to take over the school. Students train in secret in
// the Room of Requirement, and a false vision lures them deep under the Ministry.
import * as THREE from 'three';
import { G } from '../state.js';
import { TRAIN_EVENTS } from '../journey.js';
import { SKIN_TONES } from '../models.js';
import { barrier, brazierGroup, ledgeItem, chest } from '../puzzles.js';
import { groundHeight, PLATEAU, SPOTS } from '../world/terrain.js';
import { FRIENDS, meet } from '../friends.js';
import { addItem, itemCount } from '../items.js';
import { sleep, rand } from '../util.js';
import { postFlash, setFrost } from '../engine.js';

const Z = () => G.world.zones;
const gh = (x, y, z) => Z().greatHall.W(x, y, z);
const co = (x, y, z) => Z().corridor.W(x, y, z);
const rr = (x, y, z) => Z().requirement.W(x, y, z);
const ar = (x, y, z) => Z().arcana.W(x, y, z);
const gr = (x, z, dy = 0) => new THREE.Vector3(x, groundHeight(x, z) + dy, z);
const F = () => G.save.flags.y5;
const until = (fn, max = 1e9) => new Promise((res) => { const t0 = performance.now(); const t = () => (G.quitting ? res(false) : fn() ? res(true) : performance.now() - t0 > max ? res(false) : setTimeout(t, 100)); t(); });

const NPCS = {
  grimshaw: { name: 'High Inquisitor Grimshaw', voice: 'high', color: '#ffb0d8', look: { robeColor: '#d890b8', liningColor: '#ffe0f0', hairStyle: 'bun', hairColor: '#4a3a2a', skin: SKIN_TONES[0], hat: true, hatColor: '#d890b8', scale: 0.92 } },
  ashdown: { name: 'Rowan Ashdown', voice: 'mid', color: '#c8b8a0', look: { robeColor: '#4a4038', liningColor: '#7a6a50', hairStyle: 'messy', hairColor: '#8a6a4a', beard: 'short', beardColor: '#8a6a4a', skin: SKIN_TONES[1], scale: 1.02 } },
  vesper: { name: 'Vesper Mordaunt', voice: 'high', color: '#ff80a8', look: { robeColor: '#14101a', liningColor: '#5a1030', hairStyle: 'long', hairColor: '#0a0808', skin: SKIN_TONES[0], eyeGlow: '#ff4080', scale: 1.02 } },
  hollowking: { name: 'The Hollow King', voice: 'low', color: '#40ff70', look: { robeColor: '#0a0a0c', liningColor: '#0a3a1a', mask: true, eyeGlow: '#40ff70', skin: '#e8e4dc', bald: true, scale: 1.4 } },
};

// ------------------------------------------------------------------ puzzles
let decreesMade = false;
function decrees() {
  if (decreesMade) return;
  decreesMade = true;
  const P = G.puzzles;
  // Grimshaw's warded doorways — Finite them for the side quest
  barrier(P, 'y5-ward-0', 'corridor', co(0, 0, -40), 0, 8, 4);
  barrier(P, 'y5-ward-1', 'staircase', Z().staircase.W(0, 0, 10), 0, 6, 4);
  barrier(P, 'y5-ward-2', 'dungeon', Z().dungeon.W(0, 0, -40), 0, 8, 4);
}
let arcanaMade = false;
function arcanaPuzzles() {
  if (arcanaMade) return;
  arcanaMade = true;
  const P = G.puzzles;
  const z = Z().arcana;
  // the Hall of Doors spins until three sconces burn by the true door
  brazierGroup(P, 'y5-sconces', 'arcana', [ar(-3.5, 0, -27.5), ar(3.5, 0, -27.5), ar(0, 0, -17)]);
  barrier(P, 'y5-seal', 'arcana', ar(0, 0, -32.4), 0, 6, 5);
}
let sideBuilt = false;
function sidePuzzles() {
  if (sideBuilt) return;
  sideBuilt = true;
  const P = G.puzzles;
  // Kofi's niffler has stashed shiny things on high ledges round the grounds
  [[-30, 60, 6], [70, 40, 5], [-80, 120, 6]].forEach(([x, z, dy], i) => ledgeItem(P, `y5-niffler-${i}`, 'grounds', gr(x, z, dy), { coins: 15 }));
  chest(P, 'y5-rr-chest', 'requirement', rr(10, 0, -33), Math.PI, { coins: 50, item: 'book', n: 1 });
}

// ------------------------------------------------------------------ the train: a Ministry inspection
TRAIN_EVENTS[5] = async () => {
  const st = G.story;
  const tr = Z().train;
  await new Promise((res) => st.run(async () => {
    await st.talk('ruairi', ['Ministry wizards are going through the carriages. Checking wands. Looking for “Hollow King propaganda”.', 'My dad says the Prophet called you a liar on the front page. Three times.']);
    res();
  }));
  const p = G.player;
  G.enemies.hpScale = 0.8; G.enemies.dmgScale = 0.6;
  // Hollowed acolytes slipped aboard with the inspectors
  for (let i = 0; i < 2; i++) G.enemies.spawn('wizard', tr.W(1.1, 0, p.pos.z - tr.offset.z - 4 - i * 2.5), { level: 2, spells: ['stupefyE'], aggro: true, name: 'False inspector' });
  G.ui.toast('Those aren’t Ministry wizards! Disarm them.', 'tip', 3500);
  await until(() => !G.enemies.list.some((e) => e.alive), 60000);
  for (const e of G.enemies.list) if (e.alive) e.die({});
  await new Promise((res) => st.run(async () => { await st.talk('oren', ['Hollowed, wearing Ministry badges. And the Ministry says he isn’t back.']); res(); }));
};

const room = async () => { if (G.zone.name !== 'requirement') await G.world.travel('requirement', 'fromCorridor'); };

export default {
  n: 5,
  title: 'The Inquisitor',
  feast: [
    'Welcome back. You will have read many things over the summer. Some of them were even true.',
    'The Ministry has decided that what happened in the graveyard did not happen. I do not agree.',
    'The Ministry has also appointed a new Defence teacher — and High Inquisitor of Hogwarts — whose name you may know.',
    'Prudence Grimshaw has been cleared of all charges. I am told that is the end of the matter. Eat up.',
  ],
  cupLines: [
    'This year the Ministry tried to tell you what to believe. You learned to think for yourselves instead.',
    'Undersecretary Grimshaw has been removed from the school. The Ministry now admits the Hollow King has returned. Better late than never.',
  ],
  setup() {
    const s = G.story;
    for (const [id, d] of Object.entries(NPCS)) s.registerNPC(id, d);
    s.addTalker('grimshaw', 'Talk to High Inquisitor Grimshaw', () => s.talk('grimshaw', ['Hem, hem. Educational Decree Number Twenty-Four: no student organisations without my approval. Run along.']));
    s.addTalker('ashdown', 'Talk to Rowan Ashdown', () => s.talk('ashdown', ['The Room was always kind to people who needed it. I’m glad it found you.']));
    sidePuzzles();
  },
  placeNPCs(Y) {
    const s = G.story;
    const q = G.save.yq;
    const ousted = q >= 6 && q < 10;
    s.placeNPC('grimshaw', 'greatHall', ousted ? gh(0, 0.8, -32.5) : gh(-5, 0.8, -31), ousted ? 0 : 0.3);
    if (ousted) s.hideNPC('headmistress');
    s.placeNPC('duskwood', 'greatHall', gh(8, 0, -26), -0.5);
    if (q >= 6 && q < 10) s.placeNPC('ashdown', 'requirement', rr(-5, 0, -26), 0.8);
    if (q >= 2) decrees();
    if (q >= 9) arcanaPuzzles();
  },
  quests: [
    // 1
    { title: 'The High Inquisitor', from: 'Headmistress Aldmoor', letter: 'Come to the Great Hall after the feast. I need to warn you about our new Defence teacher. — M. Aldmoor', steps: [
      { type: 'talk', npc: 'headmistress', obj: 'Talk to the Headmistress after the feast.', lines: [
        'Grimshaw has the Minister’s ear, and the Minister has the Prophet. She will teach Defence from a book — no wands — and she will be watching you.',
        'Do not give her a reason. And do not stop practising.',
      ] },
      { type: 'talk', npc: 'grimshaw', obj: 'Attend High Inquisitor Grimshaw’s first lesson.', lines: [
        'Hem, hem. Good morning, children. Wands AWAY. This year you will learn Defence the Ministry-approved way: theoretically.',
        'And you. The champion. The one telling stories about graveyards. Detention. Every evening. For a month.',
      ] },
    ], points: 20 },
    // 2
    { title: 'The Room of Requirement', from: 'Pip Fenwick', letter: 'We can’t learn Defence from a BOOK, not with him back. Meet me in the Charms Corridor — I think I know a place. — Pip', steps: [
      { type: 'talk', npc: 'pip', obj: 'Find Pip — she knows a secret place to practise.', lines: [
        'Brannoc told me about it. A room on the Charms Corridor that only appears when you really, REALLY need it.',
        'Walk past the bare wall halfway down, thinking: “We need somewhere to learn to fight.”',
      ] },
      { type: 'go', zone: 'corridor', pos: () => co(-3, 0, -25), r: 2.5, obj: 'Walk past the bare wall halfway down the Charms Corridor, thinking hard about what you need.', run: async () => {
        F().room = true;
        G.world.zones.corridor.requirementDoor.visible = true;
        G.audio.sfx('door'); G.cam.shake(0.15);
        G.ui.banner('A door appears', 'The Room of Requirement', 'unlock');
        await sleep(800);
        await room();
      } },
      { type: 'script', obj: 'Explore the Room of Requirement.', run: async () => {
        await room();
        await G.ui.say([
          { ...G.story.speaker('pip'), text: 'Cushions! Dummies! A whole wall of Defence books! It’s PERFECT.' },
          { who: 'An old spellbook', color: '#e0c890', voice: 'mid', text: 'Bombarda: the Exploding Charm. Stronger than Confringo against walls and wards; it blasts doors from their hinges and foes off their feet.' },
        ]);
        G.spells.unlock('bombarda');
      } },
      { type: 'fight', zone: 'requirement', obj: 'Practise Bombarda on the dummies the Room provides.',
        spawn: () => { for (const p of Z().requirement.spots.dummies) G.enemies.spawn('dummy', p, { yaw: 0 }); } },
    ], points: 25 },
    // 3
    { title: 'Silencio', from: 'Professor Thornwick', letter: 'Grimshaw hasn’t banned CHARMS yet. This week: the Silencing Charm. Bring earmuffs. — F. Thornwick', steps: [
      { type: 'minigame', npc: 'thornwick', id: 'wanddraw', obj: 'Learn Silencio in Professor Thornwick’s lesson.', lines: ['Silencio stops a witch or wizard casting for a few precious seconds. Wonderful against someone who talks too much. No names.'], pass: (r) => r.success, win: ['Lovely! Silence is golden.'], done: () => G.spells.unlock('silencio') },
      { type: 'fight', zone: 'corridor', obj: 'Grimshaw’s new Inquisitorial Squad is “inspecting” first-years in the Charms Corridor. Silence them.', at: () => co(0, 0, -30), r: 18,
        spawn: () => { for (let i = 0; i < 3; i++) G.enemies.spawn('duelist', co(-2 + i * 2, 0, -40), { aggro: true, level: 3, spells: ['stupefyE', 'curse'], name: 'Inquisitorial Squad', house: 'slytherin' }); },
        win: async () => { await G.story.talk('cassius', ['…They’re not my friends, you know. The Squad. My father made me join. Don’t look at me like that.']); } },
    ], points: 30 },
    // 4
    { title: 'The Thestrals', from: 'Ruairí Doyle', letter: 'Brannoc’s back, and he’s brought Thestrals to class. Most people can’t see them. I can. Can you? — Ruairí', steps: [
      { type: 'talk', npc: 'brannoc', obj: 'Join Brannoc’s class by his hut.', lines: [
        'Thestrals. Only folk who’ve seen death can see ’em. I reckon after the graveyard… yeh can.',
        'The herd’s scattered in the forest edge. Take ’em some meat — five chunks, laid out where they graze.',
      ] },
      { type: 'collect', zone: 'grounds', obj: 'Lay out meat for the Thestrals at the forest edge (5).', model: () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.7 })); return m; },
        items: () => [gr(130, 40, 0.6), gr(140, 70, 0.6), gr(128, 100, 0.6), gr(150, 20, 0.6), gr(145, 120, 0.6)] },
      { type: 'talk', npc: 'ruairi', obj: 'Tell Ruairí the herd has eaten.', lines: ['They like you. That one — the foal — keeps following you. They can fly anywhere, you know. Anywhere at all.'], after: () => { meet('ruairi'); G.save.friends.ruairi.f += 10; } },
    ], points: 25 },
    // 5
    { title: 'The Wand Circle', from: 'Mei Takahashi', letter: 'Twenty-eight people signed up for your secret Defence club! We’re calling it the Wand Circle. First meeting tonight. — Mei', steps: [
      { type: 'talk', npc: 'mei', obj: 'Meet Mei — the Wand Circle wants you to teach them.', lines: [
        'Everyone wants YOU to teach. You’ve fought a dragon. And the Hollow King. Nobody else has.',
        'I found a spell for you first: Obscuro — a blindfold out of nowhere. Blind foes stumble and can’t aim.',
      ], after: () => { G.spells.unlock('obscuro'); meet('mei'); } },
      { type: 'fight', zone: 'requirement', obj: 'Run the Wand Circle’s first session: a boggart-cupboard of pixies and duelling dummies.', enter: () => { F().circle = true; },
        spawn: () => { for (const p of Z().requirement.spots.dummies) G.enemies.spawn('dummy', p, { yaw: 0 }); for (let i = 0; i < 5; i++) G.enemies.spawn('pixie', rr(rand(-6, 6), 2, -20 - rand(0, 6)), { aggro: true }); } },
      { type: 'talk', npc: 'mei', obj: 'Debrief with Mei.', lines: ['Bram disarmed someone for the first time! He cried a bit. We all did.'] },
    ], points: 30 },
    // 6 — twist
    { title: 'Caught!', from: 'Kofi Asante', autosave: true, letter: 'Wand Circle Christmas party in the Room! Bring snacks. Definitely do NOT bring the Inquisitor. — Kofi', steps: [
      { type: 'go', zone: 'requirement', pos: () => rr(0, 0, -16), r: 6, obj: 'Go to the Wand Circle Christmas party in the Room of Requirement.', enter: () => { G.save.flags.xmas = 5; }, run: async () => {
        G.ui.banner('A Wand Circle Christmas', 'Tinsel on the training dummies', 'quest');
        await sleep(800);
        G.audio.sfx('slam'); G.cam.shake(0.5);
        await G.ui.say([{ ...G.story.speaker('kofi'), text: 'Er. Did anyone else hear the door explode? Because the door just exploded.' }, { ...G.story.speaker('grimshaw'), text: 'Hem, HEM. An illegal organisation. Squad — take their names. And their wands.' }]);
      } },
      { type: 'fight', zone: 'requirement', obj: 'The Inquisitorial Squad has stormed the Room! Hold them off so the others can escape.', at: () => rr(0, 0, -16), r: 30,
        waves: [
          () => { for (let i = 0; i < 4; i++) G.enemies.spawn('duelist', rr(-6 + i * 4, 0, -4), { aggro: true, level: 4, spells: ['stupefyE', 'curse', 'incendioE'], name: 'Inquisitorial Squad', house: 'slytherin' }); },
          () => { for (let i = 0; i < 2; i++) G.enemies.spawn('wizard', rr(-3 + i * 6, 0, -5), { aggro: true, level: 4, spells: ['curse', 'stupefyE'], name: 'Ministry enforcer' }); },
        ],
        waveIntro: async () => { G.ui.banner('Ministry enforcers!', 'Grimshaw has brought grown wizards', ''); },
        win: async () => {
          const s = G.story;
          s.placeNPC('headmistress', 'requirement', rr(2, 0, -6), Math.PI);
          await G.ui.say([
            { ...s.speaker('grimshaw'), text: 'Headmistress! Your precious champion runs an ARMY in your castle.' },
            { ...s.speaker('headmistress'), text: 'Indeed. It is called the Aldmoor Army. The students did as I told them. If you must arrest someone, arrest me.' },
            { ...s.speaker('grimshaw'), text: 'Oh, I shall. By order of the Minister, Prudence Grimshaw is now Headmistress of Hogwarts.' },
          ]);
          G.audio.sfx('dementor'); postFlash(0.3);
          s.hideNPC('headmistress');
          G.ui.banner('The Headmistress is gone', 'Grimshaw rules Hogwarts', '');
          F().ousted = true;
          G.save.flags.xmas = 0;
        } },
    ], points: 45 },
    // 7
    { title: 'Old Friends', from: 'Rowan Ashdown', letter: 'The Room let me in. It seems it thinks the Wand Circle needs a teacher. I agree. Come tonight. — R.A.', steps: [
      { type: 'talk', npc: 'ashdown', obj: 'Meet Rowan Ashdown in the Room of Requirement.', lines: [
        'Hello, old friend. I can’t stay long — Grimshaw would love to find a werewolf in the castle.',
        'Incarcerous: ropes from thin air. Bound foes can’t move or cast. Combine it with Silencio and even a duellist is helpless.',
        'And — you’ve been having dreams, haven’t you? A long hall. Shelves of glowing glass. Be careful. Some dreams are sent.',
      ], after: () => G.spells.unlock('incarcerous') },
    ], points: 25 },
    // 8 — exams + the vision
    { title: 'O.W.L.s', from: 'High Inquisitor Grimshaw', letter: 'Ordinary Wizarding Level examinations begin Monday. Cheating will be punished. Breathing loudly will be punished. — P. Grimshaw', steps: [
      { type: 'minigame', npc: 'vexley', id: 'potions', opts: { quest: true }, obj: 'Sit your Potions O.W.L. in the dungeons (talk to Professor Vexley).', lines: ['Your examination. One draught. Do not disappoint me more than usual.'], pass: (r) => r.success, win: ['…An “Outstanding”. Do not tell anyone I said so.'] },
      { type: 'minigame', npc: 'thornwick', id: 'wanddraw', obj: 'Sit your Charms O.W.L. (talk to Professor Thornwick).', lines: ['Charms practical! Show the examiner your best wandwork — and breathe!'], pass: (r) => r.success, win: ['Exceeds Expectations at the very least! Well done!'] },
      { type: 'script', obj: 'The History of Magic exam…', run: async () => {
        await G.ui.fade(1, 0.6);
        G.world.setZone('arcana', { pos: ar(0, 0, -60), yaw: Math.PI });
        await G.ui.fade(0, 0.6);
        setFrost(0.3);
        await G.ui.say([
          { who: 'A vision', color: '#40ff70', voice: 'low', text: 'You doze over your exam paper… and you are walking. A hall of shelves. Glass orbs, glowing blue.' },
          { ...G.story.speaker('pip'), text: 'Help! Please! They’ve got me — row ninety-seven — HELP!' },
          { who: 'The Hollow King', color: '#40ff70', voice: 'low', text: 'Come and fetch your friend, little champion. The Department of Arcana. Come alone.' },
        ]);
        setFrost(0);
        await G.ui.fade(1, 0.5);
        G.world.setZone('greatHall', { pos: gh(0, 0, -4), yaw: Math.PI });
        await G.ui.fade(0, 0.5);
        await G.story.talk('oren', ['You fell asleep and SCREAMED. What did you see? …Pip? Pip went home sick this morning. Didn’t she?', 'We can’t tell Grimshaw. The Headmistress is gone. We’ll have to go ourselves.']);
      } },
    ], points: 40 },
    // 9 — boss: the Inquisitor
    { title: 'The High Inquisitor', from: 'Oren Achterberg', autosave: true, letter: 'Grimshaw caught Mei trying to use her fireplace to call the Ministry. She’s dragging her into the forest to “find the Headmistress’s weapon”. Hurry! — Oren', steps: [
      { type: 'fight', zone: 'grounds', obj: 'Grimshaw has dragged Mei into the Forbidden Forest. Stop the High Inquisitor at the clearing.', at: () => gr(SPOTS.clearing.x, SPOTS.clearing.z), r: 34,
        intro: async () => {
          const C = gr(SPOTS.clearing.x, SPOTS.clearing.z);
          G.cam.setCinematic(C.clone().add(new THREE.Vector3(-12, 4, 10)), C.clone().setY(C.y + 1.6), 1.4);
          await G.ui.say([
            { ...G.story.speaker('grimshaw'), text: 'You. Of course. Do you know what the Ministry does to children who lie? Neither do I — yet.' },
            { ...G.story.speaker('grimshaw'), text: 'My master will reward me handsomely for you. Let us see how brave you are without your Headmistress.' },
          ]);
          G.cam.setCinematic(null);
        },
        spawn: () => { const C = gr(SPOTS.clearing.x, SPOTS.clearing.z); const b = G.enemies.spawn('inquisitor', C.clone().add(new THREE.Vector3(0, 0, -8)), { center: C, aggro: true }); b.phase = 1; b.phaseLabel = 'Phase I'; },
        win: async () => {
          await sleep(1200);
          await G.ui.say([
            { who: 'Centaur herd', color: '#d8c890', voice: 'low', text: 'Hoofbeats thunder out of the trees. A herd of centaurs closes around the fallen Inquisitor.' },
            { who: 'Firenath, a centaur', color: '#d8c890', voice: 'low', text: 'She called us “half-breeds” and brought Dementors into our forest. She is ours to judge now, foal. Go home.' },
          ]);
          await G.story.talk('mei', ['You came for me. Everyone else just… stares at me. Thank you. Now — Pip. The Thestrals can fly us to London.']);
        } },
    ], points: 80 },
    // 10 — the Department of Arcana
    { title: 'The Department of Arcana', from: 'Mei Takahashi', autosave: true, steps: [
      { type: 'go', zone: 'grounds', pos: () => gr(132, 70), r: 6, obj: 'Meet your friends at the forest edge and ride the Thestrals to the Ministry.', run: async () => {
        await G.story.talk('ruairi', ['Hold on to its mane. Don’t look down. Actually — DO look down. It’s London!']);
        await G.ui.fade(1, 0.6);
        G.ui.banner('The Ministry of Magic', 'Under London, the lift sinks and sinks…', 'quest');
        await sleep(1200);
        arcanaPuzzles();
        G.world.setZone('arcana', { pos: ar(0, 0, -3), yaw: Math.PI });
        await G.ui.fade(0, 0.6);
      } },
      { type: 'puzzle', ids: ['y5-sconces'], obj: 'The Hall of Doors spins whenever the door shuts. Light the three sconces to mark the true way (Incendio or Confringo).', enter: () => arcanaPuzzles(),
        marker: () => { const g = G.puzzles.byId['y5-sconces']; const b = g?.list?.find((x) => !x.lit); return b ? { zone: 'arcana', pos: b.pos.clone().setY(b.pos.y + 1.2) } : null; } },
      { type: 'puzzle', ids: ['y5-seal'], obj: 'A ward seals the true door. Dispel it with Finite Incantatem.', enter: () => arcanaPuzzles() },
      { type: 'go', zone: 'arcana', pos: () => Z().arcana.spots.orb, r: 2.5, obj: 'Find row ninety-seven in the Hall of Prophecies.', run: async () => {
        const s = G.story;
        await G.ui.say([
          { ...s.speaker('oren'), text: 'There’s no one here. No Pip. Just… this orb. It has your name on it.' },
          { ...s.speaker('vesper'), text: 'Of course there’s no Pip, darling. Little Pip is safe at home with her mother. You came for a DREAM.' },
          { ...s.speaker('vesper'), text: 'Give me the prophecy, and perhaps I’ll let your friends crawl home.' },
        ]);
        addItem('orb', 1);
      } },
      { type: 'fight', zone: 'arcana', obj: 'Hollowed ambush in the Hall of Prophecies! Fight your way to the far end.', at: () => Z().arcana.spots.orb, r: 30,
        waves: [
          () => { for (let i = 0; i < 4; i++) G.enemies.spawn('wizard', ar(-4 + (i % 2) * 8, 0, -66 - i * 4), { level: 5, spells: ['curse', 'stupefyE', 'incendioE'], aggro: true, name: 'Hollowed' }); },
          () => { for (let i = 0; i < 3; i++) G.enemies.spawn('wizard', ar(-6 + i * 6, 0, -86), { level: 5, spells: ['curse', 'killing'], aggro: true, name: 'Hollowed' }); },
        ],
        waveIntro: async () => { G.ui.banner('More Hollowed!', 'The shelves topple — prophecies shatter everywhere', ''); G.cam.shake(0.4); } },
    ], points: 60 },
    // 11 — boss: Vesper in the Veil Chamber
    { title: 'Beyond the Veil', from: 'Headmistress Aldmoor', autosave: true, steps: [
      { type: 'fight', zone: 'arcana', obj: 'Duel Vesper Mordaunt in the Veil Chamber.', at: () => Z().arcana.spots.arena, r: 22,
        intro: async () => {
          const z = Z().arcana;
          G.cam.setCinematic(z.spots.arch.clone().add(new THREE.Vector3(-8, 5, 12)), z.spots.arch.clone().setY(z.spots.arch.y + 3), 1.4);
          await G.ui.say([
            { ...G.story.speaker('vesper'), text: 'The famous champion. You’re smaller in person. Let’s see what the Wand Circle taught you.' },
          ]);
          G.cam.setCinematic(null);
        },
        spawn: () => { const z = Z().arcana; const v = G.enemies.spawn('vesper', z.spots.arch.clone().add(new THREE.Vector3(0, 0, 2)), { center: z.spots.arena, aggro: true, fleeAt: 0.2, fleeLine: 'She shrieks with laughter and runs for the arch.' }); v.phase = 1; v.phaseLabel = 'Phase I'; },
        respawn: () => ({ pos: Z().arcana.W(0, 0, -95), yaw: Math.PI }),
        win: async () => {
          const s = G.story;
          const z = Z().arcana;
          await sleep(800);
          s.placeNPC('hollowking', 'arcana', z.spots.arch.clone().add(new THREE.Vector3(0, 0, 1)), 0);
          G.audio.sfx('dementor'); postFlash(0.5); G.cam.shake(0.6);
          G.cam.setCinematic(z.spots.arena.clone().add(new THREE.Vector3(-10, 4, 8)), z.spots.arch.clone().setY(z.spots.arch.y + 2), 1.4);
          await G.ui.say([{ ...s.speaker('hollowking'), text: 'Enough. If you want something done properly… Give me the prophecy, child.' }]);
          s.placeNPC('headmistress', 'arcana', z.spots.arena.clone().add(new THREE.Vector3(3, 0, 4)), Math.PI);
          G.audio.sfx('patronum'); postFlash(0.6);
          await G.ui.say([
            { ...s.speaker('headmistress'), text: 'You will not touch my student, Varric.' },
            { ...s.speaker('hollowking'), text: 'Margery. You are old, and slow, and you know you cannot beat me.' },
            { ...s.speaker('headmistress'), text: 'I do not need to beat you. I only need to keep you here until they arrive.' },
          ]);
          for (let i = 0; i < 6; i++) { G.lights.flash(z.spots.arena.clone().setY(z.spots.arena.y + 2), i % 2 ? 0x40ff70 : 0xffd060, 140, 20, 0.3); G.audio.sfx(i % 2 ? 'curse' : 'patronum'); G.cam.shake(0.3); await sleep(380); }
          await G.ui.say([{ ...s.speaker('hollowking'), text: 'The Minister himself. How… inconvenient. Another time, little champion.' }]);
          s.hideNPC('hollowking');
          G.ui.banner('The Minister saw him', 'No one can deny the Hollow King’s return now', '');
          addItem('orb', -1);
          G.cam.setCinematic(null);
          await s.talk('headmistress', ['The prophecy shattered in the fight. Good. It was never yours to carry.', 'Let us go home. All of us.']);
          s.hideNPC('headmistress');
          await G.ui.fade(1, 0.5);
          G.enemies.clearZone();
          G.world.setZone('greatHall', { pos: gh(0, 0, -6), yaw: Math.PI });
          await G.ui.fade(0, 0.6);
          F().ousted = false;
          F().veil = true;
        } },
    ], points: 150 },
    // 12 — aftermath
    { title: 'Reinstated', from: 'Headmistress Aldmoor', steps: [
      { type: 'talk', npc: 'headmistress', obj: 'Talk to the Headmistress — back in her rightful place.', lines: [
        'Grimshaw is in Ministry custody — what the centaurs left of her dignity, at least. The Minister has apologised. Publicly. I may frame the newspaper.',
        'You walked into a trap for a friend you thought was in danger. That is foolish. It is also the reason I would trust you with my life.',
        'Rest this summer. Next year, we must learn how the Hollow King cannot die — and how to make sure that he does.',
      ] },
    ], points: 40 },
  ],
  // ---------------------------------------------------------------- side quests
  side: [
    { id: 'wards', title: 'Decree Breakers', from: 'Tamsin MacLeod', hint: 'Tamsin is fuming about Grimshaw’s wards.', available: (Y) => Y.qi >= 2, steps: [
      { type: 'talk', npc: 'tamsin', lines: ['Grimshaw has warded off the dungeon, the stairs and the Charms Corridor “for our safety”. Let’s take them down. Finite, if you please.'] },
      { type: 'puzzle', ids: ['y5-ward-0', 'y5-ward-1', 'y5-ward-2'], obj: 'Dispel Grimshaw’s three wards (Charms Corridor, Grand Staircase, Dungeons) with Finite.' },
      { type: 'talk', npc: 'tamsin', obj: 'Tell Tamsin the wards are down.', lines: ['HA! Her face! I wish I could bottle it.'], after: () => { meet('tamsin'); G.save.friends.tamsin.f += 12; } },
    ] },
    { id: 'niffler', title: 'Kofi’s Niffler', from: 'Kofi Asante', hint: 'Kofi is searching the grounds for something small and fluffy.', steps: [
      { type: 'talk', npc: 'kofi', lines: ['My niffler escaped. It’s hidden its treasure on high ledges round the grounds. Summon it back down? Please? I need that stuff. Some of it is Grimshaw’s.'] },
      { type: 'puzzle', ids: ['y5-niffler-0', 'y5-niffler-1', 'y5-niffler-2'], obj: 'Accio the niffler’s three hidden stashes off the ledges around the grounds.', marker: () => { const o = [0, 1, 2].map((i) => G.puzzles.byId[`y5-niffler-${i}`]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone() }; } },
      { type: 'talk', npc: 'kofi', obj: 'Bring the treasure back to Kofi.', lines: ['Grimshaw’s pink brooch! The niffler has TASTE. Here — your cut.'], after: () => { meet('kofi'); G.save.friends.kofi.f += 12; } },
    ] },
    { id: 'roomchest', title: 'What the Room Hides', from: 'Bram Okafor', hint: 'Bram thinks the Room of Requirement has a secret.', available: (Y) => Y.qi >= 3, steps: [
      { type: 'talk', npc: 'bram', lines: ['When I wished for “a place to hide my Herbology notes”, the Room gave me a locked chest by the mirror. I can’t open it. You can.'] },
      { type: 'puzzle', ids: ['y5-rr-chest'], obj: 'Open the locked chest in the Room of Requirement (Alohomora).' },
      { type: 'talk', npc: 'bram', obj: 'Tell Bram what was inside.', lines: ['An old book on Mimbulus mimbletonia?! You’re a hero. A plant hero.'], after: () => { meet('bram'); G.save.friends.bram.f += 12; } },
    ] },
    { id: 'cassius5', title: 'Cassius’s Choice', from: 'Cassius Vane', hint: 'Cassius wants a quiet word, away from the Squad.', available: (Y) => Y.qi >= 3, steps: [
      { type: 'talk', npc: 'cassius', lines: ['Don’t tell anyone I spoke to you. My father says the Hollow King is the future. I saw what the Squad did to those first-years. That’s not a future.', 'If you ever need someone inside the Squad… I’m not saying yes. I’m saying I’m not saying no.'], after: () => { G.save.flags.cassiusDoubt = true; meet('cassius'); } },
    ] },
  ],
};
