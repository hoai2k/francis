// Side quests for Jujutsu High (Takao-machi) and the Cursed Forest — the
// examples that exercise every step type. Phase 2 region authors add their
// own files like this one and import them from quests/all.js.
import { registerQuest } from './index.js';

// ------------------------------------------------------------------ Jujutsu High
registerQuest({
  id: 'sq_jh_cat', title: 'Where Did Mochi Go?', region: 'jujutsu_high',
  summary: 'Haru\'s cat ran off up the mountain road. Curses have it cornered at the Mountain Shrine.',
  giver: { region: 'jujutsu_high', npc: 'jh_kid' },
  offer: ['Hey! You\'re a sorcerer, right? My cat Mochi ran up the mountain road!', 'Grandma says the Mountain Shrine is full of nasty things. Mochi\'s scared of EVERYTHING.', 'Please bring her back?'],
  steps: [
    { type: 'goto', anchor: 'mountain_shrine', radius: 7, text: 'Go up to the Mountain Shrine' },
    { type: 'exorcise', count: 5, anchor: 'mountain_shrine', radius: 26, spawn: { kinds: ['swarmer', 'flyhead', 'swarmer'], level: 1, max: 4 }, text: 'Drive off the curses round the shrine' },
    { type: 'talk', npc: 'jh_kid', text: 'Tell Haru that Mochi is safe', lines: [{ who: null, text: 'Mochi strolls back down the road behind you as if nothing happened.' }, { who: 'jh_kid', text: 'MOCHI! You came back! Thank you thank you thank you!' }, { who: 'jh_kid', text: 'Here, take my savings. Don\'t tell Mum.' }] },
  ],
  rewards: { coins: 60, xp: 90 },
});

registerQuest({
  id: 'sq_jh_bell', title: 'The Bell That Rings Itself', region: 'jujutsu_high',
  requires: { quests: ['sq_jh_cat'] },
  summary: 'The Hachiman Shrine\'s bell rings at night with nobody there. Monk Ryoun suspects a curse on the lookout ridge.',
  giver: { region: 'jujutsu_high', npc: 'jh_monk' },
  offer: ['The bell rang again last night. Three times, and no one was there.', 'I followed the sound to the Cedar Lookout ruins in the west. Something waits there. Something that laughs.', 'Will you look, sorcerer?'],
  steps: [
    { type: 'goto', anchor: 'lookout', radius: 8, text: 'Search the Cedar Lookout ruins' },
    { type: 'defeat', anchor: 'lookout', curse: { kind: 'teleporter', name: 'The Bell-Ringer', level: 2, elite: 'shadow', hp: 3 }, text: 'Exorcise the Bell-Ringer' },
    { type: 'talk', npc: 'jh_monk', text: 'Report to Monk Ryoun', lines: ['Silence, at last. The shrine thanks you.', 'Take this charm. It belonged to a sorcerer who stayed here long ago.'] },
  ],
  rewards: { coins: 120, xp: 160, spins: 1, items: 1, rarity: 'rare' },
});

registerQuest({
  id: 'sq_jh_pass', title: 'Pass Patrol', region: 'jujutsu_high',
  summary: 'Curses come down Takao Pass at night and scare the grocer\'s customers away.',
  giver: { region: 'jujutsu_high', npc: 'jh_kenji' },
  offer: ['Every night, things crawl down Takao Pass. My delivery van won\'t go up there any more.', 'Clear the pass road, and I\'ll pay you in coins. Not daikon. Coins.'],
  steps: [
    { type: 'exorcise', count: 6, anchor: 'pass', radius: 30, spawn: { kinds: ['swarmer', 'spitter', 'swarmer', 'grasshopper'], level: 1, max: 4 }, text: 'Exorcise curses on Takao Pass' },
    { type: 'talk', npc: 'jh_kenji', text: 'Tell Kenji the pass is clear', lines: ['The van made it! First delivery in a week!', 'As promised: coins. And one daikon. You earned it.'] },
  ],
  rewards: { coins: 90, xp: 110 },
});

// ------------------------------------------------------------------ Cursed Forest
registerQuest({
  id: 'sq_forest_talismans', title: 'Scattered Talismans', region: 'cursed_forest',
  summary: 'Window Agent Mika\'s sealing talismans blew away into the ruins. Without them the camp\'s barrier fails.',
  giver: { region: 'cursed_forest', npc: 'forest_window' },
  offer: ['Oh no, oh no. The wind took my sealing talismans. They\'re scattered all over the old ruins.', 'Without them the camp barrier comes down tonight. Could you collect them? There are four.'],
  steps: [
    { type: 'collect', item: { name: 'Sealing Talisman', icon: '📜', color: '#ffe08a' }, spots: ['ruin_1', 'ruin_2', 'ruin_3', 'ruin_4'], text: 'Collect the sealing talismans in the ruins' },
    { type: 'talk', npc: 'forest_window', text: 'Bring the talismans back to Mika', lines: ['All four! You\'re a lifesaver. Literally.', 'There. The barrier holds. Here, the Window pays well for overtime.'] },
  ],
  rewards: { coins: 100, xp: 140, items: 1 },
});

registerQuest({
  id: 'sq_forest_rescue', title: 'Lost in the Woods', region: 'cursed_forest',
  summary: 'A Kyoto student went into the woods after a curse and never came back. Ranger Sato saw a barrier glowing by the falls.',
  giver: { region: 'cursed_forest', npc: 'forest_ranger' },
  offer: ['A Kyoto student went after a curse two days ago. Kasumi Miwa, she said. Never came back.', 'Last night I saw a purple glow by Shiraito Falls. Curses like to keep their catches alive.', 'Find her, and bring her back to camp.'],
  steps: [
    { type: 'rescue', anchor: 'falls', npc: { name: 'Kasumi Miwa', look: 'miwa' }, escort: { anchor: 'camp', radius: 8 }, text: 'Free the trapped student at Shiraito Falls', escortText: 'Lead Miwa back to Kitsune Camp' },
    { type: 'talk', npc: 'forest_ranger', text: 'Report to Ranger Sato', lines: [{ who: null, text: 'Miwa bows so low her sword clatters.' }, { who: 'forest_ranger', text: 'She\'s safe. Good work. Kyoto will owe Tokyo one, and they hate that.' }] },
  ],
  rewards: { coins: 110, xp: 150, spins: 1 },
});

registerQuest({
  id: 'sq_forest_nest', title: 'The Nest', region: 'cursed_forest',
  requires: { level: 2 },
  summary: 'Something big breeds curses in a cave on the north-eastern ridge. Clear the Nest.',
  giver: { region: 'cursed_forest', npc: 'forest_hiker' },
  offer: ['I saw it from the ridge: a cave breathing purple smoke, and curses crawling out of it like ants.', 'Somebody should go in there. Somebody who isn\'t me.'],
  steps: [
    { type: 'goto', anchor: 'lair_sq_forest_nest', radius: 10, text: 'Find the cave on the north-eastern ridge' },
    { type: 'lair', anchor: 'lair_sq_forest_nest', kind: 'cave', label: 'The Nest', mission: { biome: 'cursed_forest', objective: 'exorcise', boss: 'sugisawa_curse', difficulty: 2, objText: 'Clear the Nest' }, text: 'Enter the Nest and destroy what breeds there' },
    { type: 'talk', npc: 'forest_hiker', text: 'Tell the hiker the Nest is gone', lines: ['You went IN there? And came back?', 'I\'m buying you dinner. Well. I\'m giving you my dinner money.'] },
  ],
  rewards: { coins: 150, xp: 220, items: 1, rarity: 'rare' },
});
