// Side quests for Kyoto (world/regions/kyoto.js) and the Okinawa coast
// (world/regions/okinawa_coast.js). Each region: five or six quests over every
// step type, one of them a named-curse mini-boss.
//   Kyoto:   Miwa's charms (collect) · Momo: lost at Inari (rescue + escort) ·
//            Mechamaru: pagoda surveillance (exorcise, goto) · Kamo: Nue of the
//            bamboo grove (MINI-BOSS) · Mai: under the stage (lair dungeon)
//   Okinawa: Kuroi: the Star Plasma Vessel (rescue + escort) · Gojo: beach day
//            (collect) · Higa: whale shark watch (exorcise) · Nakama: Route 58
//            (goto, exorcise) · Tokashiki: the Sea Cave (lair dungeon) ·
//            Uehara: Habu-no-Nushi (MINI-BOSS)
import { registerQuest } from './index.js';

// ------------------------------------------------------------------ Kyoto
registerQuest({
  id: 'sq_kyo_charms', title: 'Miwa\'s Charms', region: 'kyoto',
  summary: 'Kasumi Miwa bought omamori charms for her little brothers and dropped all three on the way back from Higashiyama.',
  giver: { region: 'kyoto', npc: 'kyoto_miwa' },
  offer: ['Um... could I ask a favour? A small one! Tiny!', 'I bought good-luck charms for my brothers at the temples, and... I dropped them. All three.', 'One by the Yasaka pagoda, one on the Kiyomizu stage, one on the Togetsukyo bridge. I think. Probably.'],
  steps: [
    { type: 'collect', item: { name: 'Omamori Charm', icon: '🧧', color: '#ff6a5a' }, spots: ['charm_1', 'charm_2', 'charm_3'], text: 'Find Miwa\'s charms: the pagoda, the Kiyomizu stage, Togetsukyo' },
    { type: 'talk', npc: 'kyoto_miwa', text: 'Bring the charms back to Miwa', lines: ['All three! You\'re amazing! Thank you, thank you!', 'I can\'t pay much... sorcerer pay is terrible... but please take this. And this. And — no, I need that one.'] },
  ],
  rewards: { coins: 110, xp: 150, items: 1 },
});

registerQuest({
  id: 'sq_kyo_inari', title: 'Lost Among the Torii', region: 'kyoto',
  summary: 'A tourist followed the torii tunnel to the top of Mt Inari and never came down. Momo spotted a barrier glowing at the summit from her broom.',
  giver: { region: 'kyoto', npc: 'kyoto_momo' },
  offer: ['You. Tokyo. Make yourself useful.', 'I flew over Mt Inari and there\'s a barrier at the summit — some tourist is stuck in it, crying for help.', 'I\'d go myself but my broom doesn\'t fit through ten thousand torii. Walk up, free them, walk them down to the shrine.'],
  steps: [
    { type: 'goto', anchor: 'inari_path', radius: 9, text: 'Climb the torii tunnel up Mt Inari' },
    { type: 'rescue', anchor: 'inari_summit', npc: { name: 'Lost Tourist', look: 'npc_tourist' }, escort: { anchor: 'inari_shrine', radius: 8 }, text: 'Free the tourist trapped at the summit', escortText: 'Lead the tourist down to the Inari shrine' },
    { type: 'talk', npc: 'kyoto_momo', text: 'Report to Momo at Kyoto Jujutsu High', lines: ['Hmph. You actually did it. Fine.', 'Don\'t get used to praise from me. This is a one-time reward.'] },
  ],
  rewards: { coins: 130, xp: 170, spins: 1 },
});

registerQuest({
  id: 'sq_kyo_mecha', title: 'Remote Surveillance', region: 'kyoto',
  summary: 'Mechamaru\'s observation drones picked up a swarm of curses round the Yasaka pagoda. His body can\'t take the stairs; yours can.',
  giver: { region: 'kyoto', npc: 'kyoto_mechamaru' },
  offer: ['SORCERER. THIS UNIT REQUESTS ASSISTANCE.', 'CURSED ENERGY READINGS AT THE YASAKA PAGODA EXCEED SAFE LEVELS. MULTIPLE GRADE 3 AND 4 SIGNATURES.', 'EXORCISE THEM. THEN PROCEED TO THE KIYOMIZU STAGE: CONFIRM THE AREA IS CLEAR FROM HIGH GROUND.'],
  steps: [
    { type: 'exorcise', count: 7, anchor: 'pagoda', radius: 26, spawn: { kinds: ['flyhead', 'swarmer', 'spitter', 'swarmer'], level: 2, max: 4 }, text: 'Exorcise the curses round the Yasaka pagoda' },
    { type: 'goto', anchor: 'kiyomizu_stage', radius: 6, text: 'Look out from the Kiyomizu stage' },
    { type: 'talk', npc: 'kyoto_mechamaru', text: 'Report to Mechamaru', lines: ['READINGS NOMINAL. THIS UNIT IS... GRATEFUL.', 'TRANSFERRING FUNDS. DO NOT ASK WHERE A PUPPET KEEPS COINS.'] },
  ],
  rewards: { coins: 120, xp: 160, items: 1 },
});

registerQuest({
  id: 'sq_kyo_nue', title: 'Nue of the Bamboo Grove', region: 'kyoto',
  requires: { level: 2 },
  summary: 'A chimera curse — monkey\'s face, tiger\'s legs, a serpent for a tail — stalks the tops of the Arashiyama bamboo. Noritoshi Kamo wants it gone. [Mini-boss]',
  giver: { region: 'kyoto', npc: 'kyoto_kamo' },
  offer: ['In the Heian era, a beast called the nue cried over the palace every night until an archer shot it down.', 'Something has taken that legend\'s shape in the Arashiyama bamboo. It moves on the stalks, out of reach of my arrows.', 'Find its den at the heart of the grove. Draw it down. The Kamo clan will remember the favour.'],
  steps: [
    { type: 'goto', anchor: 'bamboo_path', radius: 10, text: 'Walk the bamboo grove path in Arashiyama' },
    { type: 'goto', anchor: 'bamboo_heart', radius: 8, text: 'Find the clearing at the heart of the grove' },
    { type: 'defeat', anchor: 'bamboo_heart', curse: { kind: 'shadow', name: 'Nue, the Night Chimera', level: 3, elite: 'shadow', hp: 4 }, text: 'Exorcise Nue, the Night Chimera' },
    { type: 'talk', npc: 'kyoto_kamo', text: 'Report to Noritoshi Kamo', lines: ['You brought it down. Even my ancestors needed a bow for that.', 'This talisman belonged to the Kamo house. You have earned it.'] },
  ],
  rewards: { coins: 200, xp: 260, spins: 1, items: 1, rarity: 'rare' },
});

registerQuest({
  id: 'sq_kyo_stage', title: 'Under the Stage', region: 'kyoto',
  requires: { quests: ['sq_kyo_charms'] },
  summary: 'Between the hundred-odd pillars under Kiyomizu\'s stage, a curtain has fallen in broad daylight. Mai Zen\'in says something is collecting cursed relics down there.',
  giver: { region: 'kyoto', npc: 'kyoto_mai' },
  offer: ['You helped Miwa? Ugh. Fine. Then you can help me too.', 'There\'s a curtain under the Kiyomizu stage. In the ravine, between the pillars. Somebody\'s hiding cursed relics in there.', 'Go down, seal them, and kill whatever is guarding them. I\'ll take the credit, you take the coins.'],
  steps: [
    { type: 'goto', anchor: 'lair_sq_kyo_stage', radius: 10, text: 'Climb down into the ravine under the Kiyomizu stage' },
    { type: 'lair', anchor: 'lair_sq_kyo_stage', kind: 'curtain', label: 'Under the Stage', mission: { biome: 'jujutsu_high', objective: 'seal', boss: 'sugisawa_curse', difficulty: 2, objText: 'Seal the hidden relics' }, text: 'Enter the curtain and seal the relics' },
    { type: 'talk', npc: 'kyoto_mai', text: 'Tell Mai the relics are sealed', lines: ['Sealed? All of them? ...Not bad, for Tokyo.', 'Here. Don\'t tell my sister I paid you.'] },
  ],
  rewards: { coins: 170, xp: 240, items: 1, rarity: 'rare' },
});

// ------------------------------------------------------------------ Okinawa
registerQuest({
  id: 'sq_oki_vessel', title: 'The Star Plasma Vessel', region: 'okinawa_coast',
  summary: 'Riko Amanai slipped away to see the view from Cape Hedo — and a curse user\'s barrier closed round her there. Kuroi is beside herself.',
  giver: { region: 'okinawa_coast', npc: 'oki_kuroi' },
  offer: ['Please — it\'s Lady Riko! She ran off to see the sea from Cape Hedo, up on the cliffs.', 'The Q group and the curse users all want her dead before she meets Master Tengen. One of them has trapped her in a barrier!', 'Gojo and Geto are... at the beach. Please bring her back to me at the aquarium!'],
  steps: [
    { type: 'goto', anchor: 'cape_lookout', radius: 10, text: 'Climb the cliff road to Cape Hedo lookout' },
    { type: 'rescue', anchor: 'cape_lookout', npc: { name: 'Riko Amanai', look: 'npc_riko' }, escort: { anchor: 'aquarium', radius: 8 }, text: 'Break the barrier holding Riko', escortText: 'Escort Riko to Kuroi at the Churaumi Aquarium' },
    { type: 'talk', npc: 'oki_kuroi', text: 'Bring Riko to Kuroi', lines: [{ who: null, text: 'Riko runs the last few steps and throws her arms round Kuroi.' }, { who: 'oki_kuroi', text: 'Lady Riko! You\'re safe... thank you, sorcerer. Thank you.' }, { who: 'oki_kuroi', text: 'Now — the whale shark is feeding at three. We will not be late.' }] },
  ],
  rewards: { coins: 140, xp: 180, spins: 1 },
});

registerQuest({
  id: 'sq_oki_beach', title: 'Beach Day', region: 'okinawa_coast',
  summary: 'Young Satoru Gojo has declared a beach day and needs supplies. He is too strong to fetch them himself. Apparently.',
  giver: { region: 'okinawa_coast', npc: 'oki_gojo' },
  offer: ['Yo! You look like someone with nothing to do. Perfect.', 'Beach day for the kid. I need: sunscreen from the beach house, the volleyball the lifeguard confiscated, sea grapes from the market, and the cooler I left on the pier.', 'Suguru says I should get them myself. Suguru is wrong.'],
  steps: [
    { type: 'collect', item: { name: 'Beach Supplies', icon: '🏐', color: '#7ae0ff' }, spots: ['beach_house', 'lifeguard', 'market', 'pier_end'], text: 'Fetch the beach supplies: beach house, lifeguard, market, pier' },
    { type: 'talk', npc: 'oki_gojo', text: 'Bring the supplies to Gojo', lines: ['Sunscreen, ball, sea grapes, cooler. Flawless. You\'re hired.', 'Here, pocket money. Don\'t tell Yaga-sensei we took a beach day on a mission.'] },
  ],
  rewards: { coins: 100, xp: 130, items: 1 },
});

registerQuest({
  id: 'sq_oki_aquarium', title: 'Whale Shark Watch', region: 'okinawa_coast',
  summary: 'Curses only a sorcerer can see have got into the Churaumi Aquarium and the fish are terrified. Keeper Higa needs them cleared before the feeding show.',
  giver: { region: 'okinawa_coast', npc: 'oki_keeper' },
  offer: ['You can see them too, can\'t you? The things in the tank. Floating heads. The fish hide from them.', 'The feeding show starts soon and Jinbei won\'t come out of the corner.', 'Please, clear them out. Gently. Don\'t break the glass.'],
  steps: [
    { type: 'exorcise', count: 6, anchor: 'aquarium_tank', radius: 22, spawn: { kinds: ['flyhead', 'blob', 'flyhead', 'swarmer'], level: 2, max: 3 }, text: 'Exorcise the curses in the aquarium' },
    { type: 'talk', npc: 'oki_keeper', text: 'Tell Keeper Higa the tank is clear', lines: ['Look — Jinbei\'s swimming again! Thank you!', 'Here: a season pass. And something a little more useful.'] },
  ],
  rewards: { coins: 90, xp: 120 },
});

registerQuest({
  id: 'sq_oki_route58', title: 'Route 58', region: 'okinawa_coast',
  requires: { quests: ['sq_oki_vessel'] },
  summary: 'The 15:00 flight to Tokyo cannot be missed. Window Agent Nakama needs Route 58 to the airport cleared of curses before the car carrying Riko comes through.',
  giver: { region: 'okinawa_coast', npc: 'oki_window' },
  offer: ['The 15:00 to Haneda. Gojo-san booked it; we cannot miss it.', 'Curses are crawling out of the cane onto Route 58. The car with the Vessel comes through within the hour.', 'Check the road by the cane fields and clear it. I\'ll hold the gate.'],
  steps: [
    { type: 'goto', anchor: 'airport_road', radius: 9, text: 'Check Route 58 by the cane fields' },
    { type: 'exorcise', count: 6, anchor: 'airport_road', radius: 28, spawn: { kinds: ['burrower', 'swarmer', 'grasshopper', 'spitter'], level: 2, max: 4 }, text: 'Clear the curses off Route 58' },
    { type: 'talk', npc: 'oki_window', text: 'Report to Agent Nakama at Naha Airport', lines: ['The car made it. The flight leaves on time.', 'Whatever happens to that girl in Tokyo... she got her summer. Thank you.'] },
  ],
  rewards: { coins: 120, xp: 160, items: 1 },
});

registerQuest({
  id: 'sq_oki_cave', title: 'The Sea Cave', region: 'okinawa_coast',
  requires: { level: 2 },
  summary: 'Fishermen\'s nets come back torn from under the northern cliffs. Something nests in the Sea Cave and drags swimmers in.',
  giver: { region: 'okinawa_coast', npc: 'oki_fisher' },
  offer: ['My nephew went swimming under the cliffs yesterday. He came back with handprints on his ankles. Big ones.', 'The Sea Cave hums at low tide. There\'s something in there, and people inside with it.', 'You\'re one of those sorcerers. Go in. Bring them out.'],
  steps: [
    { type: 'goto', anchor: 'lair_sq_oki_cave', radius: 10, text: 'Find the Sea Cave at the foot of the northern cliffs' },
    { type: 'lair', anchor: 'lair_sq_oki_cave', kind: 'cave', label: 'The Sea Cave', mission: { biome: 'flooded_subway', objective: 'rescue', boss: 'dagon', difficulty: 2, objText: 'Free the dragged-off swimmers' }, text: 'Enter the Sea Cave and free the swimmers' },
    { type: 'talk', npc: 'oki_fisher', text: 'Tell the fisherman the cave is clear', lines: ['They\'re back — all of them! Soaked and screaming, but back.', 'Take this. My grandfather pulled it from that cave sixty years ago. Never knew what it was.'] },
  ],
  rewards: { coins: 180, xp: 260, items: 1, rarity: 'rare' },
});

registerQuest({
  id: 'sq_oki_habu', title: 'Habu-no-Nushi', region: 'okinawa_coast',
  requires: { level: 2 },
  summary: 'Every islander respects the habu viper. The thing coiled in Uehara\'s cane field is a curse born of that fear, grown to a monstrous size. [Mini-boss]',
  giver: { region: 'okinawa_coast', npc: 'oki_farmer' },
  offer: ['Everybody on this island grows up afraid of the habu. Rightly so.', 'But all that fear had to go somewhere. Now there\'s a serpent in my cane longer than a bus, and it glows.', 'The old folks call it the Nushi — the master of the field. Please. I have a harvest to bring in.'],
  steps: [
    { type: 'goto', anchor: 'cane_field', radius: 10, text: 'Wade into the middle of the cane field' },
    { type: 'defeat', anchor: 'cane_field', curse: { kind: 'serpent', name: 'Habu-no-Nushi, the Cane Serpent', level: 3, elite: 'vampiric', hp: 3 }, text: 'Exorcise Habu-no-Nushi' },
    { type: 'talk', npc: 'oki_farmer', text: 'Tell Uehara the field is safe', lines: ['The cane\'s rustling normal again. Normal wind, normal birds.', 'Here — the first sugar of the harvest. And this charm. It kept my father safe.'] },
  ],
  rewards: { coins: 200, xp: 260, spins: 1, items: 1, rarity: 'rare' },
});
