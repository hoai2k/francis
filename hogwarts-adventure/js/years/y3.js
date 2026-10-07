// Year 3 — The Grey Tide. Malachar escapes Grimstone Prison, the Ministry rings the school
// with Dementors, and a kind new teacher hides a terrible secret. Hogsmeade opens.
import * as THREE from 'three';
import { G } from '../state.js';
import { TRAIN_EVENTS } from '../journey.js';
import { SKIN_TONES } from '../models.js';
import { barrier, pendulum, ledgeItem, chest } from '../puzzles.js';
import { groundHeight, PLATEAU, SPOTS } from '../world/terrain.js';
import { meet } from '../friends.js';
import { addItem, itemCount } from '../items.js';
import { sleep, rand } from '../util.js';
import { postFlash, setFrost } from '../engine.js';

const Z = () => G.world.zones;
const gh = (x, y, z) => Z().greatHall.W(x, y, z);
const co = (x, y, z) => Z().corridor.W(x, y, z);
const sc = (x, y, z) => Z().staircase.W(x, y, z);
const hg = (x, y, z) => Z().hogsmeade.W(x, y, z);
const gr = (x, z, dy = 0) => new THREE.Vector3(x, groundHeight(x, z) + dy, z);
const F = () => G.save.flags.y3;
const until = (fn, max = 1e9) => new Promise((res) => { const t0 = performance.now(); const t = () => (G.quitting ? res(false) : fn() ? res(true) : performance.now() - t0 > max ? res(false) : setTimeout(t, 100)); t(); });

let pend = null;
function pendulums(on) {
  if (on && !pend) {
    pend = [-62, -67, -72].map((z, i) => pendulum(G.puzzles, `y3-pend-${i}`, 'corridor', co(0, 0, z), 0, 5, i * 1.3));
  }
  for (const o of pend || []) { o.hidden = !on; o.mesh.visible = on; }
}
let barriersMade = false;
function barriers() {
  if (barriersMade) return;
  barriersMade = true;
  const P = G.puzzles;
  barrier(P, 'y3-bar-1', 'staircase', sc(0, 8, -12.4), 0, 3, 4);
  barrier(P, 'y3-bar-2', 'staircase', sc(12.4, 0, 6), Math.PI / 2, 3, 4);
  barrier(P, 'y3-bar-3', 'staircase', sc(-6, 16, 12.4), 0, 3, 4);
}
let sideBuilt = false;
function sidePuzzles() {
  if (sideBuilt) return;
  sideBuilt = true;
  const P = G.puzzles;
  // Oren's star charts blew off the Astronomy rail — up in the trees and on the walls
  [[-40, 30, 6], [60, 60, 5], [-60, 110, 6], [150, 20, 7]].forEach(([x, z, dy], i) => ledgeItem(P, `y3-chart-${i}`, 'grounds', gr(x, z, dy), { coins: 8 }));
  // moonpetal flowers at the forest edge (for Isolde)
  [[128, 70], [140, 30], [132, 110]].forEach(([x, z], i) => ledgeItem(P, `y3-petal-${i}`, 'grounds', gr(x, z, 0.8), { item: 'plant' }));
  chest(P, 'y3-hogs-chest', 'hogsmeade', hg(-20, 0, 70), 1.2, { coins: 40, item: 'mead', n: 2 });
}

// ------------------------------------------------------------------ the train: Dementors board
TRAIN_EVENTS[3] = async () => {
  const st = G.story;
  const tr = Z().train;
  G.ui.toast('The train shudders… and stops.', 'info', 2500);
  tr.sway = 0;
  G.audio.wind(0);
  await sleep(1200);
  G.trainNight = 1;
  setFrost(0.6);
  G.audio.sfx('dementor');
  await new Promise((res) => st.run(async () => { await st.talk('oren', ['The windows are freezing over. It’s June-cold — no, it’s WINTER-cold. Something is coming down the corridor.']); res(); }));
  const p = G.player;
  G.enemies.hpScale = 0.5;
  const d = G.enemies.spawn('dementor', tr.W(1.1, 0, p.pos.z - tr.offset.z - 7), { aggro: true });
  G.ui.toast('A Dementor! <b>Expecto Patronum</b> — or a flash of <b>Lumos</b> — will drive it back.', 'tip', 4500);
  await until(() => !d.alive, 25000);
  if (d.alive) {
    st.registerNPC('ashdown', ASHDOWN);
    st.placeNPC('ashdown', 'train', tr.W(1.1, 0, p.pos.z - tr.offset.z - 2.5), Math.PI);
    G.fx.burst(d.pos.clone().setY(d.pos.y + 1.5), 0xcfeaff, 80, 9);
    d.takeHit({ dmg: 9999, spell: 'patronum' });
  }
  await sleep(1500);
  setFrost(0);
  G.trainNight = 0;
  tr.sway = 1;
  st.registerNPC('ashdown', ASHDOWN);
  st.placeNPC('ashdown', 'train', tr.W(1.1, 0, p.pos.z - tr.offset.z - 2.5), Math.PI);
  await new Promise((res) => st.run(async () => {
    await st.talk('ashdown', ['Well. That was unpleasant. Rowan Ashdown — I’m your new Defence teacher, as it happens.', 'Here. Eat this. Chocolate helps, after a Dementor. Truly.']);
    addItem('frog', 1);
    G.ui.toast('Received a Chocolate Frog', 'info');
    res();
  }));
  st.hideNPC('ashdown');
};

const ASHDOWN = { name: 'Professor Ashdown', voice: 'mid', color: '#c8b8a0', look: { robeColor: '#4a4038', liningColor: '#7a6a50', hairStyle: 'messy', hairColor: '#8a6a4a', beard: 'short', beardColor: '#8a6a4a', skin: SKIN_TONES[1], scale: 1.02 } };
const GRIMSHAW = { name: 'Undersecretary Grimshaw', voice: 'high', color: '#b8a8d8', look: { robeColor: '#5a4a6a', liningColor: '#b8a8d8', hairStyle: 'bun', hairColor: '#4a3a2a', skin: SKIN_TONES[0], hat: true, hatColor: '#5a4a6a', scale: 0.92, noWand: false } };

export default {
  n: 3,
  title: 'The Grey Tide',
  feast: [
    'Welcome back. I will be plain with you: Malachar the Hollow has escaped from Grimstone Prison.',
    'At the Ministry’s insistence, Dementors are stationed at every entrance to the grounds. Do not give them reason to notice you.',
    'Undersecretary Prudence Grimshaw joins us from the Ministry to… oversee our security.',
    'On happier notes: Professor Rowan Ashdown will teach Defence Against the Dark Arts, and third-years may now visit Hogsmeade village.',
  ],
  cupLines: [
    'This year the Dementors came to our door, and our students turned them away.',
    'Professor Ashdown has resigned his post. He asked me to tell you that he has never been prouder of a class.',
  ],
  setup() {
    const s = G.story;
    s.registerNPC('ashdown', ASHDOWN);
    s.registerNPC('grimshaw', GRIMSHAW);
    s.addTalker('ashdown', 'Talk to Professor Ashdown', () => s.talk('ashdown', [F().wolf ? 'I’m sorry you had to see that. I’m sorrier you had to run from it.' : 'Remember: a Patronus is a memory with a spine. Hold on to the good ones.']));
    s.addTalker('grimshaw', 'Talk to Undersecretary Grimshaw', () => s.talk('grimshaw', ['Run along, dear. The Ministry has things well in hand.']));
    sidePuzzles();
  },
  placeNPCs(Y) {
    const s = G.story;
    const q = G.save.yq;
    if (q < 9) s.placeNPC('ashdown', 'greatHall', gh(5, 0.8, -31), -0.3); else s.placeNPC('ashdown', 'grounds', new THREE.Vector3(3, PLATEAU, 18), Math.PI);
    s.placeNPC('grimshaw', 'greatHall', gh(-5, 0.8, -31), 0.3);
    s.placeNPC('duskwood', 'greatHall', gh(8, 0, -26), -0.5);
    pendulums(q === 2 && (Y.si || 0) >= 1);
    if (q >= 4) barriers();
  },
  quests: [
    // 1
    { title: 'Professor Ashdown', from: 'Professor Ashdown', letter: 'First Defence lesson of the year, in the Great Hall. No textbooks needed — just your wand. — R. Ashdown', steps: [
      { type: 'talk', npc: 'ashdown', obj: 'Find Professor Ashdown by the staff table.', lines: [
        'Ah — the student from the train. Today: Depulso, the Banishing Charm. It hurls a foe far away from you; slam them into a wall and they’ll see stars.',
        'I’ve brought a crate of Cornish pixies to practise on. Try not to let them steal your wand.',
      ], after: () => G.spells.unlock('depulso') },
      { type: 'fight', zone: 'greatHall', obj: 'Deal with the pixies and dummies (Depulso and Glacius work well on pixies).',
        spawn: () => { for (const [x, z] of [[-4, -26], [4, -26]]) G.enemies.spawn('dummy', gh(x, 0, z), { yaw: 0 }); for (let i = 0; i < 5; i++) G.enemies.spawn('pixie', gh(rand(-6, 6), 2, -22 - rand(0, 4)), { aggro: true }); } },
      { type: 'talk', npc: 'ashdown', obj: 'Report to Professor Ashdown.', lines: ['Excellent. You don’t panic — that is most of Defence, really.', 'You look tired, Professor? Oh — it’s nothing. The moon keeps me up.'] },
    ], points: 20 },
    // 2
    { title: 'Hogsmeade Weekend', from: 'Headmistress Aldmoor', letter: 'Third-years may visit Hogsmeade this weekend. Take the path at the bottom of the castle road. — M. Aldmoor', steps: [
      { type: 'go', zone: 'hogsmeade', pos: () => hg(0, 0, -2), r: 6, obj: 'Walk down the castle road and take the path to Hogsmeade. Meet your friends in the village square.' },
      { type: 'go', zone: 'hogsmeade', pos: () => Z().hogsmeade.doors.find((d) => d.kind === 'sweetshop').pos, r: 3, obj: 'Visit Honeydew’s Sweet Shop (and buy something if you like).', run: async () => { const { openShop } = await import('../menus.js'); await openShop('sweetshop'); } },
      { type: 'go', zone: 'hogsmeade', pos: () => Z().hogsmeade.spots.pub, r: 3, obj: 'Meet your friends in the Three Lanterns pub.', run: async () => {
        const s = G.story;
        await G.ui.fade(1, 0.4);
        G.ui.toast('The Three Lanterns', 'zone');
        await G.ui.fade(0, 0.4);
        await G.ui.say([
          { ...s.speaker('tamsin'), text: 'Honeymead all round! Kofi’s paying.' },
          { ...s.speaker('kofi'), text: 'Kofi is NOT paying. Kofi spent his Sickles on Fizzing Whizzbees.' },
          { ...s.speaker('pip'), text: 'Shh — listen. Behind us. It’s the Ministry woman.' },
          { ...s.speaker('grimshaw'), text: '…seen near the village, yes. Malachar is hunting the Grey Horn. If he finds it, the Dementors answer to him, not to us.' },
          { ...s.speaker('grimshaw'), text: 'And keep an eye on Ashdown. I have read his file. The man is not what he seems.' },
          { ...s.speaker('oren'), text: '…The Grey Horn. I’ve read about that. A horn that commands Dementors. We need to tell someone.' },
        ]);
        addItem('mead', 1);
      } },
    ], points: 20 },
    // 3
    { title: 'Arresto Momentum', from: 'Professor Thornwick', letter: 'This term: Arresto Momentum! Come prepared to slow down. Literally. — F. Thornwick', steps: [
      { type: 'minigame', npc: 'thornwick', id: 'wanddraw', obj: 'Pass Professor Thornwick’s Arresto Momentum lesson.', lines: ['Arresto Momentum slows anything inside its dome — foes, falling things, even spells. A long, steady shape!'], pass: (r) => r.success, win: ['Wonderful! Now, a practical test…'], done: () => { G.spells.unlock('arresto'); pendulums(true); } },
      { type: 'go', zone: 'corridor', pos: () => co(0, 0, -76.5), r: 2.5, obj: 'Get past the three swinging blades at the end of the Charms Corridor. Arresto Momentum slows them down.', enter: () => pendulums(true),
        run: async () => { pendulums(false); await G.story.talk('thornwick', ['Not a scratch! Five points for keeping your head — and, more importantly, keeping it attached.']); } },
    ], points: 25 },
    // 4
    { title: 'The Grey Tide', from: 'Madam Hale', letter: 'Exhibition match at the pitch this Saturday. Come and watch — or fly! — Madam Hale', steps: [
      { type: 'go', zone: 'grounds', pos: () => new THREE.Vector3(SPOTS.pitch.x + 6, Z().grounds.pitchY, SPOTS.pitch.z + 26), r: 6, obj: 'Go down to the Quidditch pitch for the exhibition match.', run: async () => {
        G.skyObj.lock = 0.62;
        await G.ui.say([{ who: 'Madam Hale', color: '#ffd27a', voice: 'mid', text: 'Lovely weather for it — wait. Why is it so cold?' }]);
        G.audio.sfx('dementor');
        postFlash(0.2);
        G.ui.banner('Dementors!', 'They have broken their posts and are pouring onto the pitch', '');
      } },
      { type: 'fight', zone: 'grounds', obj: 'Drive the Dementors off the pitch. Expecto Patronum!', at: () => new THREE.Vector3(SPOTS.pitch.x, Z().grounds.pitchY, SPOTS.pitch.z), r: 60,
        spawn: () => { const P = SPOTS.pitch; for (let i = 0; i < 5; i++) { const a = i * 1.25; G.enemies.spawn('dementor', new THREE.Vector3(P.x + Math.cos(a) * 18, Z().grounds.pitchY, P.z + Math.sin(a) * 14), { aggro: true }); } },
        win: async () => { G.skyObj.lock = null; await G.story.talk('hale', ['Twelve Dementors, and you held them off with a few spells. The Ministry calls THIS security?']); } },
    ], points: 35 },
    // 5
    { title: 'Finite Incantatem', from: 'Professor Duskwood', letter: 'Someone has sealed half the castle with protective barriers. Come and learn how to end a spell. — Prof. Duskwood', steps: [
      { type: 'talk', npc: 'duskwood', obj: 'Find Professor Duskwood in the Great Hall.', lines: [
        'Undersecretary Grimshaw has put up “security barriers” on every doorway off the Grand Staircase. Students are trapped in the Charms Corridor!',
        'Finite Incantatem ends a spell. Aim at the barrier — and mind the Undersecretary doesn’t see you.',
      ], after: () => { G.spells.unlock('finite'); barriers(); } },
      { type: 'puzzle', ids: ['y3-bar-1', 'y3-bar-2', 'y3-bar-3'], obj: 'Dispel the three barriers in the Grand Staircase with Finite Incantatem.', enter: () => barriers() },
      { type: 'talk', npc: 'headmistress', obj: 'Tell the Headmistress what Grimshaw said in the pub.', lines: [
        'The Grey Horn. I prayed it was a story. It was carved from the bones of the first Dementor and hidden in the Forbidden Forest centuries ago.',
        'Malachar wants the Dementors for his master. The Hollow King needs an army to return.',
        'Say nothing to the Undersecretary. I do not trust where her loyalties lie.',
      ] },
    ], points: 30 },
    // 6 — mid-year twist
    { title: 'Christmas in Hogsmeade', from: 'Pip Fenwick', autosave: true, letter: 'Christmas shopping in Hogsmeade! Snow! Honeymead! Meet in the square. — Pip xx', steps: [
      { type: 'go', zone: 'hogsmeade', pos: () => hg(0, 0, -2), r: 7, obj: 'Meet Pip in the snowy Hogsmeade square for Christmas shopping.', enter: () => { G.save.flags.xmas = 3; }, run: async () => {
        G.ui.banner('Christmas in Hogsmeade', 'Snow on every roof', 'quest');
        await sleep(1200);
        G.audio.sfx('dementor');
        setFrost(0.5);
        G.skyObj.lock = 0.85;
        await G.ui.say([{ ...G.story.speaker('pip'), text: 'Why have the lamps gone blue? Oh — oh no. Look at the sky.' }]);
      } },
      { type: 'fight', zone: 'hogsmeade', obj: 'Dementors and Malachar’s Hollowed are attacking the village! Defend Hogsmeade.', at: () => hg(0, 0, -2), r: 30,
        waves: [
          () => { for (let i = 0; i < 4; i++) G.enemies.spawn('dementor', hg(rand(-10, 10), 0, -20 - rand(0, 10)), { aggro: true }); },
          () => { for (let i = 0; i < 3; i++) G.enemies.spawn('wizard', hg(rand(-8, 8), 0, 20 + i * 4), { level: 3, spells: ['curse', 'stupefyE'], aggro: true, name: 'Hollowed acolyte' }); },
        ],
        waveIntro: async () => { G.ui.banner('Hollowed acolytes!', 'Malachar’s masked followers', ''); },
        win: async () => {
          setFrost(0);
          const s = G.story;
          s.placeNPC('grimshaw', 'hogsmeade', hg(4, 0, 4), Math.PI);
          s.placeNPC('ashdown', 'hogsmeade', hg(-4, 0, 4), Math.PI);
          await G.ui.say([
            { ...s.speaker('grimshaw'), text: 'Professor Ashdown. Where were you when the Dementors broke ranks? Shall I tell them? Shall I tell the children what you are?' },
            { ...s.speaker('grimshaw'), text: 'A WEREWOLF. Teaching children. Dismissed at the end of term — by order of the Ministry.' },
            { ...s.speaker('ashdown'), text: '…It’s true. I should have told you myself. I take a potion every month that keeps me safe. I am so sorry.' },
          ]);
          F().reveal = true;
        } },
    ], points: 40 },
    // 7
    { title: 'Moonbane', from: 'Professor Ashdown', letter: 'Professor Vexley has refused to brew my Moonbane Draught. I hate to ask… — R.A.', steps: [
      { type: 'talk', npc: 'ashdown', obj: 'Talk to Professor Ashdown.', lines: ['Without the draught, the next full moon will be… dangerous. Professor Vexley won’t brew it — but he might let a student. You have the steadiest hands in your year.'] },
      { type: 'minigame', npc: 'vexley', id: 'potions', opts: { quest: true }, obj: 'Brew the Moonbane Draught in the Dungeons (talk to Professor Vexley).', lines: ['Moonbane. For Ashdown. …Very well. Do not ruin my best cauldron.'], pass: (r) => r.success, win: ['Adequate. Take it to him before moonrise. Before, I said.'] },
    ], points: 30 },
    // 8
    { title: 'Full Moon', from: 'Brannoc the Groundskeeper', autosave: true, letter: 'Ashdown’s waitin’ for yeh at my hut. Hurry — the moon’s nearly up. — B.', steps: [
      { type: 'go', zone: 'grounds', pos: () => gr(SPOTS.hut.x - 6, SPOTS.hut.z), r: 5, obj: 'Hurry to Brannoc’s hut with the Moonbane Draught before moonrise.', run: async () => {
        const s = G.story;
        G.skyObj.lock = 0.95;
        s.placeNPC('ashdown', 'grounds', gr(SPOTS.hut.x - 9, SPOTS.hut.z + 2), 0);
        await s.talk('ashdown', ['You came. The draught — quickly—', 'No. No, it’s too late. The moon. RUN. Run to the castle and DON’T look back!']);
        s.hideNPC('ashdown');
        G.audio.sfx('roar'); G.cam.shake(0.6); postFlash(0.3);
      } },
      { type: 'fight', zone: 'grounds', manual: true, obj: 'RUN! Get back to the castle road before the werewolf catches you. (Depulso, Glacius and Arresto slow it down.)',
        spawn: () => { G.enemies.spawn('werewolf', gr(SPOTS.hut.x - 10, SPOTS.hut.z + 3), { aggro: true }); },
        marker: () => ({ zone: 'grounds', pos: gr(0, 60, 2.5) }),
        update: (Y) => {
          if (!Y.encounter || G.story.busy) return;
          const p = G.player.pos;
          if (Math.abs(p.x) < 10 && p.z < 64 && p.z > 20) {
            Y.encounter = null;
            for (const e of G.enemies.list) if (e.alive) { G.fx.smokePuff(e.pos, 0x403830, 20, { speed: 3 }); e.die({}); }
            G.story.run(async () => {
              G.ui.banner('You made it!', 'The werewolf turns back toward the forest', 'unlock');
              await sleep(1500);
              await G.story.talk('brannoc', ['Yeh’re all right! Thank the stars. He’ll be himself by mornin’. Poor man.']);
              F().wolf = true;
              G.skyObj.lock = null;
              Y.next();
            });
          }
        },
        respawn: () => ({ pos: gr(SPOTS.hut.x - 4, SPOTS.hut.z - 4), yaw: Math.PI }) },
    ], points: 45 },
    // 9
    { title: 'The Grey Horn', from: 'Headmistress Aldmoor', autosave: true, letter: 'Malachar has found the Horn. He is at the stone circle in the forest. I am coming, but you are closer. — M.A.', steps: [
      { type: 'fight', zone: 'grounds', obj: 'Stop Malachar at the stone circle in the Forbidden Forest.', at: () => gr(SPOTS.clearing.x, SPOTS.clearing.z), r: 34,
        intro: async () => {
          const C = gr(SPOTS.clearing.x, SPOTS.clearing.z);
          G.skyObj.lock = 0.97;
          G.cam.setCinematic(C.clone().add(new THREE.Vector3(-16, 5, 10)), C.clone().setY(C.y + 2), 1.5);
          await G.ui.say([{ who: 'Malachar the Hollow', color: '#7aff9a', voice: 'low', text: 'You again. Good. Let my new servants feed on the little hero.' }, { who: 'Malachar the Hollow', color: '#7aff9a', voice: 'low', text: 'The Grey Horn calls them — ALL of them.' }]);
          G.audio.sfx('dementor'); setFrost(0.6);
          G.cam.setCinematic(null);
        },
        waves: [
          () => { const C = gr(SPOTS.clearing.x, SPOTS.clearing.z); for (let i = 0; i < 6; i++) { const a = i * 1.05; G.enemies.spawn('dementor', C.clone().add(new THREE.Vector3(Math.cos(a) * 14, 0, Math.sin(a) * 14)), { aggro: true }); } },
          () => { const C = gr(SPOTS.clearing.x, SPOTS.clearing.z); G.enemies.spawn('dementor', C.clone().add(new THREE.Vector3(0, 0, -12)), { aggro: true, lord: true, hp: 1500, name: 'Dementor lord' }); },
          () => { const C = gr(SPOTS.clearing.x, SPOTS.clearing.z); const m = G.enemies.spawn('malachar', C.clone().add(new THREE.Vector3(8, 0, 0)), { center: C, aggro: true, fleeAt: 0.5, fleeLine: 'He seizes a shard of the broken Horn and vanishes into the dark.' }); m.phase = 1; m.phaseLabel = 'Phase I'; },
        ],
        waveIntro: async (Y, w) => {
          if (w === 1) G.ui.banner('A Dementor lord rises', 'Patronus and Lumos — and watch for more of its kind', '');
          if (w === 2) { setFrost(0); G.ui.banner('Malachar!', 'The Horn is broken. Now break him.', ''); }
        },
        win: async () => {
          setFrost(0);
          G.skyObj.lock = null;
          await sleep(1500);
          await G.story.talk('headmistress', ['You broke the Grey Horn. The Dementors will return to the Ministry — and the Ministry will have questions for Undersecretary Grimshaw.', 'But Malachar took a shard of it, and he spoke of a graveyard. I fear we will hear his master’s name again before long.']);
        } },
    ], points: 150 },
    // 10
    { title: 'Moonset', from: 'Professor Ashdown', steps: [
      { type: 'talk', npc: 'ashdown', obj: 'Say goodbye to Professor Ashdown at the castle gate.', lines: [
        'I’m leaving before the parents’ letters arrive. It’s kinder that way.',
        'You ran from me that night, and you were right to. And then you went and faced Malachar anyway. Never let anyone tell you that you are anything less than brave.',
        'Here — my old Defence notes. And Glacius, while I think of it: a charm that has saved my life more than once.',
      ], after: () => { G.spells.unlock('glacius'); addItem('book', 1); } },
    ], points: 20 },
  ],
  // ---------------------------------------------------------------- side quests
  side: [
    { id: 'charts', title: 'Oren’s Star Charts', from: 'Oren Achterberg', hint: 'Oren looks frantic in the Charms classroom.', steps: [
      { type: 'talk', npc: 'oren', lines: ['A gust took my star charts off the Astronomy rail. Four pages, all over the grounds, stuck in trees and on walls. You can Accio things, can’t you? Please?'] },
      { type: 'puzzle', ids: ['y3-chart-0', 'y3-chart-1', 'y3-chart-2', 'y3-chart-3'], obj: 'Find Oren’s four star-chart pages around the grounds and Accio them down.', marker: () => { const o = [0, 1, 2, 3].map((i) => G.puzzles.byId[`y3-chart-${i}`]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone() }; } },
      { type: 'talk', npc: 'oren', obj: 'Bring the pages back to Oren.', lines: ['All four! You’re a marvel. I’ll name a star after you. A small one. A nice one.'], after: () => { meet('oren'); G.save.friends.oren.f += 12; } },
    ] },
    { id: 'treats', title: 'Something for Silvermane', from: 'Ruairí Doyle', hint: 'Ruairí is by the paddock, worrying about the Hippogriff.', steps: [
      { type: 'talk', npc: 'ruairi', lines: ['Silvermane’s off her food since the Dementors came. Scrivenshaw’s in Hogsmeade sells owl treats — she loves those. Could you bring some to Brannoc?'] },
      { type: 'event', obj: 'Buy a bag of owl treats at Scrivenshaw’s in Hogsmeade.', marker: () => ({ zone: 'hogsmeade', pos: Z().hogsmeade.doors.find((d) => d.kind === 'general').pos.clone().setY(Z().hogsmeade.doors.find((d) => d.kind === 'general').pos.y + 2) }) },
      { type: 'talk', npc: 'brannoc', obj: 'Take the owl treats to Brannoc.', lines: ['Owl treats! Look at her — ears straight up. Yeh’ve a kind heart. Ruairí’ll be made up.'], after: () => { addItem('creature', -1); meet('ruairi'); G.save.friends.ruairi.f += 12; } },
    ] },
    { id: 'petals', title: 'Moonpetals for Isolde', from: 'Isolde Varga', hint: 'Isolde is in the Potions classroom.', available: (Y) => Y.qi >= 2, steps: [
      { type: 'talk', npc: 'isolde', lines: ['I need three moonpetals for an extra-credit draught. They grow at the edge of the Forbidden Forest — on stalks too tall to reach. Accio them for me? I’ll owe you.'] },
      { type: 'puzzle', ids: ['y3-petal-0', 'y3-petal-1', 'y3-petal-2'], obj: 'Gather three moonpetals at the edge of the Forbidden Forest (Accio).', marker: () => { const o = [0, 1, 2].map((i) => G.puzzles.byId[`y3-petal-${i}`]).find((o) => !o.solved); return o && { zone: o.zone, pos: o.pos.clone() }; } },
      { type: 'talk', npc: 'isolde', obj: 'Bring the moonpetals to Isolde.', lines: ['Perfect specimens. Vexley will be livid that a third-year managed this. Here — a phial of Pepperup. For emergencies.'], after: () => { addItem('potion', 1); meet('isolde'); G.save.friends.isolde.f += 12; } },
    ] },
  ],
  update(Y) {
    // owl treats bought for Ruairí's side quest
    const sq = Y.def.side[1];
    if (Y.F.side.treats_on && Y.sideState('treats') === 1 && itemCount('creature') > 0) Y.sideNext(sq);
  },
};
