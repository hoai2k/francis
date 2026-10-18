// Side quests for the three Culling Game colonies (world/regions/colony_*.js).
// Colony quests also pay Culling Game points (onComplete -> addPoints), and
// 'cgpoints' steps wait for your point total (world/cullingGame.js checks them).
import { registerQuest } from './index.js';
import { addPoints, openAddRule } from '../world/cullingGame.js';

const pts = (n, why) => (g) => addPoints(g, n, why);

// ------------------------------------------------------------------ Tokyo Colony No. 1
registerQuest({
  id: 'sq_t1_fight1', title: 'Fight Club: Opening Bout', region: 'colony_tokyo1',
  summary: 'Bookie Tsuda has you down at 7 to 1 against Kenta the Undefeated. Prove the odds wrong in Hakari\'s ring.',
  giver: { region: 'colony_tokyo1', npc: 't1_bookie' },
  offer: ['New blood! Perfect. Kenta the Undefeated needs an opponent tonight.', 'Odds are seven to one against you. I\'ve put a little on you anyway. For the drama.', 'Step into the ring when you\'re ready.'],
  steps: [
    { type: 'goto', anchor: 'fight_ring', radius: 5, text: 'Step into Hakari\'s ring' },
    { type: 'defeat', anchor: 'fight_ring', curse: { kind: 'teleporter', name: 'Kenta the Undefeated', level: 3, elite: 'swift', hp: 3 }, text: 'Beat Kenta the Undefeated' },
    { type: 'talk', npc: 't1_bookie', text: 'Collect your winnings from Tsuda', lines: ['Seven to one! SEVEN TO ONE! Do you know how much I just made?', 'Here\'s your cut. Don\'t tell Hakari I take a commission.'] },
  ],
  rewards: { coins: 180, xp: 140 }, onComplete: pts(10, 'Bout won'),
});

registerQuest({
  id: 'sq_t1_fight2', title: 'Fight Club: Jackpot Round', region: 'colony_tokyo1',
  requires: { quests: ['sq_t1_fight1'] },
  summary: 'Hakari wants a fever: a cage full of curses, then Big Okabe. Survive both and hit the jackpot.',
  giver: { region: 'colony_tokyo1', npc: 't1_hakari' },
  offer: ['You\'ve got a nose for a fight! I like that. Wanna feel the fever?', 'Jackpot round: we let the curses out of the cages, and then Big Okabe climbs in.', 'Win, and the pot\'s yours. Lose... eh, you won\'t lose. I can feel it!'],
  steps: [
    { type: 'exorcise', count: 8, anchor: 'fight_ring', radius: 16, spawn: { kinds: ['swarmer', 'doll', 'transfigured', 'swarmer'], level: 3, max: 4 }, text: 'Survive the cage round in the ring' },
    { type: 'defeat', anchor: 'fight_ring', curse: { kind: 'tank', name: 'Big Okabe', level: 3, elite: 'armored', hp: 3 }, text: 'Knock out Big Okabe' },
    { type: 'talk', npc: 't1_hakari', text: 'Hit the jackpot with Hakari', lines: [{ who: 't1_hakari', text: 'JAAACKPOT! Did you feel it? Tell me you felt it!' }, { who: 't1_kirara', text: 'He\'s going to be insufferable for a week now.' }, { who: 't1_hakari', text: 'Take the pot. And a spin. Luck should be shared!' }] },
  ],
  rewards: { coins: 300, xp: 220, spins: 1, items: 1, rarity: 'rare' }, onComplete: pts(15, 'Jackpot'),
});

registerQuest({
  id: 'sq_t1_kashimo', title: 'A Strong Opponent', region: 'colony_tokyo1',
  summary: 'Hajime Kashimo has waited four hundred years for a worthy fight. Show him what you can do in his scar.',
  giver: { region: 'colony_tokyo1', npc: 't1_kashimo' },
  offer: ['You walk like someone who has fought. Good.', 'The strong curses come to my scar for the lightning. Exorcise them while it strikes around you.', 'If you can do that, maybe I\'ll remember your name.'],
  steps: [
    { type: 'goto', anchor: 'scar_center', radius: 9, text: 'Walk into Kashimo\'s lightning scar' },
    { type: 'exorcise', count: 6, anchor: 'scar_center', radius: 30, spawn: { kinds: ['lantern', 'teleporter', 'shadow'], level: 3, max: 3 }, text: 'Exorcise strong curses under the lightning' },
    { type: 'talk', npc: 't1_kashimo', text: 'Report to Kashimo', lines: ['Hm. Not bad. Not bad at all.', 'You aren\'t the one I\'m waiting for. But you\'re close. Take this, and get stronger.'] },
  ],
  rewards: { coins: 200, xp: 220, items: 1, rarity: 'rare' }, onComplete: pts(10, 'Kashimo impressed'),
});

registerQuest({
  id: 'sq_t1_angel', title: 'Jacob\'s Ladder', region: 'colony_tokyo1',
  summary: 'Hana Kurusu, the Angel, wants four cursed objects brought to her chapel so her light can extinguish them.',
  giver: { region: 'colony_tokyo1', npc: 't1_hana' },
  offer: ['Cursed objects lie in the ruins. Players fight over them, and curses grow fat on them.', 'Bring them to me. Four of them. Jacob\'s Ladder will burn them away.'],
  steps: [
    { type: 'collect', item: { name: 'Cursed Object', icon: '🧿', color: '#c070ff' }, spots: ['cursed_obj_0', 'cursed_obj_1', 'cursed_obj_2', 'cursed_obj_3'], text: 'Gather the cursed objects in the ruins' },
    { type: 'talk', npc: 't1_hana', text: 'Bring them to the Angel', lines: [{ who: null, text: 'Hana lifts her hand. A pillar of light falls from the sky and the objects crumble to ash.' }, { who: 't1_hana', text: 'It is done. Thank you. May your path stay lit.' }] },
  ],
  rewards: { coins: 160, xp: 180, spins: 1 }, onComplete: pts(8, 'Cursed objects sealed'),
});

registerQuest({
  id: 'sq_t1_reggie', title: 'Receipts Paid in Full', region: 'colony_tokyo1',
  summary: 'Reggie Star\'s gang holds Star Heights. Break the gang, then face Reggie and his receipts. (Colony mini-boss)',
  giver: { region: 'colony_tokyo1', npc: 't1_fumiko' },
  offer: ['Please. My grandson lives in Star Heights. Reggie Star\'s gang moved in and nobody\'s come out.', 'Reggie has hundreds of points. He makes people sign receipts, and then he turns them into whatever was bought. Knives. Cars.', 'Break his gang. Then break him.'],
  steps: [
    { type: 'goto', anchor: 'reggie_block', radius: 10, text: 'Go to Star Heights' },
    { type: 'exorcise', count: 6, anchor: 'reggie_block', radius: 32, spawn: { kinds: ['swarmer', 'transfigured', 'spitter'], level: 3, max: 2 }, text: 'Break Reggie\'s gang (players and curses)' },
    { type: 'defeat', anchor: 'reggie_block', curse: { kind: 'spitter', name: 'Reggie Star', level: 4, elite: 'armored', hp: 5 }, text: 'Defeat Reggie Star' },
    { type: 'talk', npc: 't1_fumiko', text: 'Tell Fumiko Star Heights is free', lines: ['They\'re coming out! I can see him on the balcony! He\'s waving!', 'I have nothing to give you but this. It was my husband\'s. Please take it.'] },
  ],
  rewards: { coins: 280, xp: 320, spins: 1, items: 1, rarity: 'rare' }, onComplete: pts(10, 'Star Heights liberated'),
});

registerQuest({
  id: 'sq_t1_rescue', title: 'No Points for Civilians', region: 'colony_tokyo1',
  summary: 'A civilian is trapped by curses in the ruins west of the crater. Get them to Kogane Square, where the Window can shelter them.',
  giver: { region: 'colony_tokyo1', npc: 't1_window' },
  offer: ['A civilian radioed from the ruins west of the impact crater. Curses have them pinned.', 'Players would kill them for a single point. Bring them here, to the square.'],
  steps: [
    { type: 'rescue', anchor: 'captive_t1', npc: { name: 'Student Riko', look: 'npc_civ_2' }, escort: { anchor: 'kogane_square', radius: 8 }, text: 'Free the trapped civilian', escortText: 'Escort Riko to Kogane Square' },
    { type: 'talk', npc: 't1_window', text: 'Report to Agent Oda', lines: ['Got her. She\'s safe with us. Thank you.', 'Every civilian alive is one point nobody else gets.'] },
  ],
  rewards: { coins: 140, xp: 160, items: 1 }, onComplete: pts(5, 'Civilian saved'),
});

registerQuest({
  id: 'sq_t1_transfer', title: 'Point Transfer', region: 'colony_tokyo1',
  summary: 'Yuji and Megumi need a rule that lets players transfer points. Reach 100 Culling Game points, then come back: the rule is yours to add.',
  giver: { region: 'colony_tokyo1', npc: 't1_yuji' },
  offer: ['Hey. We need 100 points to make Kogane add a rule. A rule that lets points be transferred.', 'Points come from players and curses, in ANY colony. Fight club, Reggie, Sendai, wherever.', 'Hit 100, come back, and you can add a rule. Your choice of rule, even. I trust you.'],
  steps: [
    { type: 'cgpoints', need: 100, text: 'Reach 100 Culling Game points (players 5, curses 1, quests and bosses more)' },
    { type: 'talk', npc: 't1_yuji', text: 'Tell Yuji you have 100 points', lines: [{ who: 't1_yuji', text: 'A hundred! You actually did it!' }, { who: 'kogane', text: 'Ding ding ding! A player has 100 points! Propose your rule, player!' }, { who: 't1_megumi', text: 'Choose carefully. Rules bind everyone.' }] },
  ],
  rewards: { coins: 250, xp: 300, spins: 2 },
  onComplete: (g) => setTimeout(() => openAddRule(g, { free: true }), 900),
});

// ------------------------------------------------------------------ Sendai Colony
registerQuest({
  id: 'sq_sd_stalemate', title: 'The Four-Way Stalemate', region: 'colony_sendai',
  summary: 'Yuta wants to see the stalemate for himself: scout from the castle, then thin the players and curses in the city between the four camps.',
  giver: { region: 'colony_sendai', npc: 'sd_yuta' },
  offer: ['Sendai has been frozen for days. Four players, each too strong to attack the others first.', 'Scout from the castle wall. Then go into the city and make some noise. Let\'s see who flinches.'],
  steps: [
    { type: 'goto', anchor: 'castle_lookout', radius: 5, text: 'Scout the city from the castle wall' },
    { type: 'exorcise', count: 10, anchor: 'station_plaza', radius: 40, spawn: { kinds: ['flyhead', 'swarmer', 'longneck'], level: 3, max: 4 }, text: 'Make some noise round Sendai Station' },
    { type: 'talk', npc: 'sd_yuta', text: 'Report to Yuta at the castle', lines: ['Uro moved. Ishigori is restless. And the nest is waking up.', 'Good. Now they\'re watching us instead of each other.'] },
  ],
  rewards: { coins: 200, xp: 220, items: 1 }, onComplete: pts(10, 'Stalemate shaken'),
});

registerQuest({
  id: 'sq_sd_kurourushi', title: 'The Swarm', region: 'colony_sendai',
  summary: 'Kurourushi, a cursed spirit that breeds cockroaches in human-sized numbers, nests in the old department store. Survive the swarm and kill the queen. (Colony mini-boss)',
  giver: { region: 'colony_sendai', npc: 'sd_survivor' },
  offer: ['She\'s in my old store. Kurourushi. She lays eggs in people.', 'When you get close, the swarm comes. Thousands of them. Then she comes.', 'Please. End it.'],
  steps: [
    { type: 'goto', anchor: 'nest', radius: 9, text: 'Approach Kurourushi\'s nest' },
    { type: 'exorcise', count: 12, anchor: 'nest', radius: 34, spawn: { kinds: ['flyhead', 'swarmer', 'imp'], level: 3, max: 5 }, text: 'Survive the swarm' },
    { type: 'defeat', anchor: 'nest_core', curse: { kind: 'summoner', name: 'Kurourushi', level: 4, elite: 'vampiric', hp: 4 }, text: 'Kill Kurourushi' },
    { type: 'talk', npc: 'sd_survivor', text: 'Tell Aoki the nest is dead', lines: ['It\'s quiet. It\'s actually quiet.', 'I don\'t have much. Take my store\'s emergency fund. The store won\'t need it.'] },
  ],
  rewards: { coins: 300, xp: 340, spins: 1, items: 1, rarity: 'rare' }, onComplete: pts(10, 'Nest destroyed'),
});

registerQuest({
  id: 'sq_sd_granite', title: 'Granite Blast', region: 'colony_sendai',
  summary: 'Ryu Ishigori, the colony\'s biggest cursed-energy output, wants a fight worth having. His fan Goro will set it up.',
  giver: { region: 'colony_sendai', npc: 'sd_fan' },
  offer: ['You want to fight RYU ISHIGORI? You\'re crazy. I love it.', 'He hangs out at the craters. Go stand in the middle and he\'ll come. He always comes.', 'Don\'t stand in front of his hands.'],
  steps: [
    { type: 'goto', anchor: 'ishigori_arena', radius: 8, text: 'Stand in the middle of the craters' },
    { type: 'defeat', anchor: 'ishigori_arena', curse: { kind: 'lantern', name: 'Ryu Ishigori', level: 4, elite: 'armored', hp: 4 }, text: 'Survive Granite Blast and beat Ishigori' },
    { type: 'talk', npc: 'sd_fan', text: 'Tell Goro what happened', lines: ['You BEAT him? He\'s gonna want a rematch. He\'s gonna be so happy.', 'Here. My whole collection of Ishigori trading cards. ...Fine, just the coins.'] },
  ],
  rewards: { coins: 240, xp: 280, items: 1, rarity: 'rare' }, onComplete: pts(5, 'Granite fight'),
});

registerQuest({
  id: 'sq_sd_trails', title: 'Off the Trail', region: 'colony_sendai',
  summary: 'Dhruv Lakdawalla\'s shikigami still run his trails. Pull the four anchor talismans out of the trails and they stop.',
  giver: { region: 'colony_sendai', npc: 'sd_window' },
  offer: ['Dhruv\'s technique anchors his trails with talismans. His shikigami run along them, and anything on a trail burns.', 'Pull the four anchors and the trails go dark. The city will be a lot safer.'],
  steps: [
    { type: 'collect', item: { name: 'Trail Anchor', icon: '🪧', color: '#5a9aff' }, spots: ['trail_tal_0', 'trail_tal_1', 'trail_tal_2', 'trail_tal_3'], text: 'Pull the trail anchors (mind the shikigami)' },
    { type: 'talk', npc: 'sd_window', text: 'Bring the anchors to Agent Sato', lines: ['The trails went dark all at once. I saw it from here!', 'The Window owes you. Here.'] },
  ],
  rewards: { coins: 180, xp: 200, spins: 1 }, onComplete: pts(8, 'Trails cut'),
});

registerQuest({
  id: 'sq_sd_uro', title: 'Sky Over Sendai', region: 'colony_sendai',
  requires: { quests: ['sq_sd_stalemate'] },
  summary: 'Uro Takako, a Heian-era sorcerer who folds the sky like cloth, is the last of the four. Yuta asks you to end the stalemate.',
  giver: { region: 'colony_sendai', npc: 'sd_yuta' },
  offer: ['Uro Takako. She was the captain of Fujiwara\'s Sun, Moon and Stars squad a thousand years ago.', 'She manipulates the sky: she can turn space itself into a surface and shove it at you.', 'She\'s yours. I\'ll take whoever comes running when she falls.'],
  steps: [
    { type: 'goto', anchor: 'uro_plaza', radius: 10, text: 'Walk under the folded sky' },
    { type: 'defeat', anchor: 'uro_plaza', curse: { kind: 'teleporter', name: 'Uro Takako', level: 4, elite: 'shadow', hp: 5 }, text: 'Defeat Uro Takako' },
    { type: 'talk', npc: 'sd_yuta', text: 'Report to Yuta', lines: ['The sky\'s straight again. I can see it from here.', 'Sendai\'s stalemate is over. Thank you. Really.'] },
  ],
  rewards: { coins: 320, xp: 360, spins: 1, items: 1, rarity: 'rare' }, onComplete: pts(10, 'Stalemate broken'),
});

registerQuest({
  id: 'sq_sd_subway', title: 'The Breathing Tunnel', region: 'colony_sendai',
  requires: { level: 3 },
  summary: 'Something moved into the Namboku line tunnels when the barrier closed. Driver Kudo says the entrance breathes.',
  giver: { region: 'colony_sendai', npc: 'sd_driver' },
  offer: ['The subway entrance by the station. Purple smoke comes out of it, in, out, in, out.', 'Twenty years I drove those tunnels. I want them back.'],
  steps: [
    { type: 'goto', anchor: 'lair_sq_sd_subway', radius: 8, text: 'Find the subway entrance east of the station' },
    { type: 'lair', anchor: 'lair_sq_sd_subway', kind: 'cave', label: 'Namboku Line Tunnels', mission: { biome: 'flooded_subway', objective: 'exorcise', boss: 'sugisawa_curse', difficulty: 3, objText: 'Clear the flooded tunnels' }, text: 'Go down into the tunnels and clear them' },
    { type: 'talk', npc: 'sd_driver', text: 'Tell Kudo the tunnels are clear', lines: ['It stopped breathing! I mean, the tunnel. You know what I mean.', 'Take this. First class ticket. Lifetime pass. Also some coins.'] },
  ],
  rewards: { coins: 260, xp: 300, items: 1, rarity: 'rare' }, onComplete: pts(5, 'Tunnels cleared'),
});

// ------------------------------------------------------------------ Sakurajima Colony
registerQuest({
  id: 'sq_sk_survivors', title: 'Buried in Ash', region: 'colony_sakurajima',
  summary: 'A villager is trapped in the ash-buried harbour village. Free them and bring them to the observatory camp.',
  giver: { region: 'colony_sakurajima', npc: 'sk_medic' },
  offer: ['There\'s still someone in the harbour village. We heard knocking under the ash.', 'Curses are circling. Get them out and bring them here.'],
  steps: [
    { type: 'rescue', anchor: 'captive_harbour', npc: { name: 'Fisherman Taro', look: 'npc_civ_3' }, escort: { anchor: 'observatory', radius: 9 }, text: 'Dig out the trapped villager in the harbour', escortText: 'Lead Taro to the observatory camp' },
    { type: 'talk', npc: 'sk_medic', text: 'Hand Taro over to the medic', lines: ['He\'s breathing. Burned, but breathing. You did good.', 'The Window pays hazard rates out here. Take them.'] },
  ],
  rewards: { coins: 160, xp: 180, items: 1 }, onComplete: pts(5, 'Villager saved'),
});

registerQuest({
  id: 'sq_sk_hei', title: 'The Hei', region: 'colony_sakurajima',
  summary: 'The Zen\'in clan sent the Hei, its elite killers, after Maki. Break their camp on the north-east slope and defeat their captain.',
  giver: { region: 'colony_sakurajima', npc: 'sk_maki' },
  offer: ['The Hei. The clan\'s attack dogs. They came all this way just to finish me.', 'Their camp is on the north-east slope. Hit it hard. Their captain is a man called Ogami.', 'I\'ll handle the stragglers.'],
  steps: [
    { type: 'goto', anchor: 'zenin_camp', radius: 12, text: 'Climb to the Zen\'in Hei camp' },
    { type: 'exorcise', count: 6, anchor: 'zenin_camp', radius: 30, spawn: { kinds: ['ashspirit', 'swarmer'], level: 3, max: 2 }, text: 'Break the camp (Hei players and curses)' },
    { type: 'defeat', anchor: 'zenin_camp', curse: { kind: 'tank', name: 'Hei Captain Ogami Zen\'in', level: 4, elite: 'armored', hp: 4 }, text: 'Defeat the Hei captain' },
    { type: 'talk', npc: 'sk_maki', text: 'Report to Maki', lines: ['Ogami\'s down? Good.', 'The clan won\'t stop. But it\'ll think twice.'] },
  ],
  rewards: { coins: 280, xp: 320, items: 1, rarity: 'rare' }, onComplete: pts(10, 'Hei camp broken'),
});

registerQuest({
  id: 'sq_sk_naoya', title: 'What Naoya Became', region: 'colony_sakurajima',
  requires: { quests: ['sq_sk_hei'] },
  summary: 'Naoya Zen\'in died cursing Maki, and came back as a cursed spirit. It waits on the crater rim, faster than ever. (Colony mini-boss)',
  giver: { region: 'colony_sakurajima', npc: 'sk_maki' },
  offer: ['My cousin Naoya died hating me. Hating women. Hating everything.', 'He came back as a cursed spirit. Projection Sorcery, but worse: twenty-four frames a second and no body to hold him back.', 'He\'s on the crater rim. Take the trail up. And don\'t blink.'],
  steps: [
    { type: 'goto', anchor: 'crater_rim', radius: 8, text: 'Climb the volcano trail to the crater rim' },
    { type: 'defeat', anchor: 'crater_rim', curse: { kind: 'teleporter', name: 'Naoya Zen\'in (Cursed Spirit)', level: 4, elite: 'swift', hp: 6 }, text: 'Exorcise Naoya\'s cursed spirit' },
    { type: 'talk', npc: 'sk_maki', text: 'Tell Maki it is over', lines: [{ who: 'sk_maki', text: '...He\'s gone? Properly gone?' }, { who: null, text: 'Maki looks up at the smoking crater for a long moment.' }, { who: 'sk_maki', text: 'Good. Thanks. I mean it.' }] },
  ],
  rewards: { coins: 360, xp: 420, spins: 1, items: 1, rarity: 'rare' }, onComplete: pts(10, 'Naoya exorcised'),
});

registerQuest({
  id: 'sq_sk_obsidian', title: 'Volcanic Glass', region: 'colony_sakurajima',
  summary: 'Noritoshi Kamo wants cursed obsidian from beside the lava rivers to make blood catalysts.',
  giver: { region: 'colony_sakurajima', npc: 'sk_kamo' },
  offer: ['Obsidian that formed beside cursed lava holds cursed energy like a battery.', 'Four shards would do. They lie beside the lava rivers. Do not fall in.'],
  steps: [
    { type: 'collect', item: { name: 'Cursed Obsidian', icon: '🔻', color: '#ff5a3a' }, spots: ['obsidian_0', 'obsidian_1', 'obsidian_2', 'obsidian_3'], text: 'Collect cursed obsidian beside the lava rivers' },
    { type: 'talk', npc: 'sk_kamo', text: 'Bring the shards to Kamo', lines: ['Excellent. They hum, can you feel it?', 'The Kamo clan repays its debts. Here.'] },
  ],
  rewards: { coins: 200, xp: 220, spins: 1 }, onComplete: pts(5, 'Obsidian gathered'),
});

registerQuest({
  id: 'sq_sk_ferry', title: 'The Last Ferry', region: 'colony_sakurajima',
  summary: 'Ash spirits crawl down to the pier every evening. Ferryman Gen wants the pier clear, even if no ferry will ever come.',
  giver: { region: 'colony_sakurajima', npc: 'sk_ferryman' },
  offer: ['Every evening the ash spirits come down to my pier. Little volcanoes with legs.', 'Clear them out. An old man likes to sit on his pier in peace.'],
  steps: [
    { type: 'exorcise', count: 8, kinds: ['ashspirit', 'swarmer'], anchor: 'north_pier', radius: 36, spawn: { kinds: ['ashspirit', 'ashspirit', 'swarmer'], level: 3, max: 4 }, text: 'Exorcise the ash spirits round the pier' },
    { type: 'talk', npc: 'sk_ferryman', text: 'Tell Gen the pier is clear', lines: ['Peace and quiet. And a sea that ends at a wall. Still, peace and quiet.', 'Here, a fare refund. Forty years of them.'] },
  ],
  rewards: { coins: 170, xp: 180, items: 1 }, onComplete: pts(5, 'Pier cleared'),
});
