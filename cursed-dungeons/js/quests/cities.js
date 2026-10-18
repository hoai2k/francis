// Side quests for the city regions: Shibuya (under the curtain, 31 October)
// and Shinjuku (the skyscrapers, Kabukicho, Gyoen and the levelled district).
// Anchors come from world/regions/shibuya.js and shinjuku.js; the infested
// buildings ('bld_<id>') are interiors.js buildings whose packs match the
// 'exorcise' steps floor by floor.
import { registerQuest } from './index.js';

// ------------------------------------------------------------------ Shibuya
registerQuest({
  id: 'sq_shibuya_evac', title: 'Nobody Gets Left Behind', region: 'shibuya',
  summary: 'The curtain lets people in but not out. Officer Kaneda needs the crossing cleared and the people pinned at the curtain wall brought out.',
  giver: { region: 'shibuya', npc: 'sby_kaneda' },
  offer: ['You\'re one of the sorcerers? Then listen. That black dome lets people walk IN. Nobody walks out.', 'There are folks pinned against the curtain by 109, and things crawling all over the Scramble Crossing.', 'Clear the crossing, get those people out to me. Please.'],
  steps: [
    { type: 'goto', anchor: 'crossing', radius: 12, text: 'Go through the curtain to the Scramble Crossing' },
    { type: 'exorcise', count: 6, anchor: 'crossing', radius: 30, spawn: { kinds: ['transfigured', 'flyhead', 'swarmer', 'transfigured'], level: 3, max: 4 }, text: 'Exorcise the curses on the crossing' },
    { type: 'rescue', anchor: 'huddle_109', npc: { name: 'Trapped Salaryman', look: 'npc_civ_1' }, escort: { anchor: 'evac', radius: 9 }, text: 'Free the civilians caught at the curtain wall by 109', escortText: 'Lead him out to the evacuation point' },
    { type: 'talk', npc: 'sby_kaneda', text: 'Report to Officer Kaneda', lines: [{ who: null, text: 'The salaryman collapses onto the ambulance step, laughing and crying at once.' }, { who: 'sby_kaneda', text: 'You walked in and out of that thing like it was a convenience store. Thank you.' }, { who: 'sby_kaneda', text: 'Take this. The force has a fund for... well. For this.' }] },
  ],
  rewards: { coins: 140, xp: 200, spins: 1 },
});

registerQuest({
  id: 'sq_shibuya_floors', title: 'Floor by Floor', region: 'shibuya',
  requires: { level: 2 },
  summary: 'Dogenzaka Tower is infested from the lobby to the storage floor. Clear it one floor at a time.',
  giver: { region: 'shibuya', npc: 'sby_oda' },
  offer: ['I manage Dogenzaka Tower. Managed. Something moved into every floor at once.', 'My tenants got out down the fire stairs. The curses didn\'t follow — they\'re waiting. On every floor.', 'Start at the lobby and work your way up. The stairs are in the back corner.'],
  steps: [
    { type: 'goto', anchor: 'bld_dgz_tower_door', radius: 6, text: 'Go to Dogenzaka Tower' },
    { type: 'exorcise', count: 4, anchor: 'bld_dgz_tower', radius: 16, text: 'Clear the lobby (1F)' },
    { type: 'exorcise', count: 4, anchor: 'bld_dgz_tower', radius: 16, text: 'Take the stairs up: clear the 2F offices' },
    { type: 'exorcise', count: 4, anchor: 'bld_dgz_tower', radius: 16, text: 'Clear the 3F offices' },
    { type: 'exorcise', count: 3, anchor: 'bld_dgz_tower', radius: 16, text: 'Clear the storage floor (4F)' },
    { type: 'talk', npc: 'sby_oda', text: 'Tell Mr. Oda his building is clear', lines: ['Every floor? Even storage? Storage was haunted BEFORE tonight.', 'There\'s a cache on the top floor, by the way. The curses were sitting on it. It\'s yours.'] },
  ],
  rewards: { coins: 160, xp: 240, items: 1, rarity: 'rare' },
});

registerQuest({
  id: 'sq_shibuya_child', title: 'Lost at Hachiko', region: 'shibuya',
  summary: 'Mrs. Hoshino lost her son Yuuki (in a pumpkin costume) when the curtain fell. He ran down Center Gai.',
  giver: { region: 'shibuya', npc: 'sby_hoshino' },
  offer: ['My son, Yuuki — he\'s six, he\'s dressed as a pumpkin — he let go of my hand when everyone started screaming.', 'Someone saw a little pumpkin run down Center Gai. Into a konbini, they said.', 'Please. Please find him.'],
  steps: [
    { type: 'goto', anchor: 'centergai', radius: 12, text: 'Search Center Gai for a boy in a pumpkin costume' },
    { type: 'exorcise', count: 3, anchor: 'bld_cg_konbini', radius: 20, spawn: { kinds: ['swarmer', 'flyhead'], level: 2, max: 3 }, text: 'Something is circling the konbini: drive it off' },
    { type: 'rescue', anchor: 'bld_cg_konbini', npc: { name: 'Yuuki', look: 'npc_civ_0' }, escort: { anchor: 'hachiko', radius: 6 }, text: 'Free Yuuki from the curse seal in the konbini', escortText: 'Take Yuuki back to his mother at Hachiko' },
    { type: 'talk', npc: 'sby_hoshino', text: 'Return to Mrs. Hoshino', lines: [{ who: null, text: 'Yuuki runs the last few steps and disappears into his mother\'s coat.' }, { who: 'sby_hoshino', text: 'Thank you. Thank you. I don\'t have much — take this, please.' }] },
  ],
  rewards: { coins: 110, xp: 170, items: 1 },
});

registerQuest({
  id: 'sq_shibuya_pumpkins', title: 'Trick or Treat, Cursed Edition', region: 'shibuya',
  summary: 'Halloween decorations are soaking up the crowd\'s fear. Window Agent Rina wants four cursed jack-o\'-lanterns collected before something hatches from them.',
  giver: { region: 'shibuya', npc: 'sby_rina' },
  offer: ['Fear has to go somewhere, and tonight it\'s going into the decorations.', 'Four jack-o\'-lanterns are glowing purple: by 109, at the end of Center Gai, in Miyashita Park and outside Mark City.', 'Bring them to me before they hatch. I would rather not find out what hatches.'],
  steps: [
    { type: 'collect', item: { name: 'Cursed Jack-o\'-Lantern', icon: '🎃', color: '#ff8a2a' }, spots: ['pumpkin_0', 'pumpkin_1', 'pumpkin_2', 'pumpkin_3'], text: 'Collect the cursed jack-o\'-lanterns' },
    { type: 'defeat', anchor: 'miyashita', curse: { kind: 'summoner', name: 'The Jack-o\'-Brood', level: 3, elite: 'explosive', hp: 3 }, text: 'One of them hatched: exorcise the Jack-o\'-Brood in Miyashita Park' },
    { type: 'talk', npc: 'sby_rina', text: 'Bring the lanterns to Rina', lines: ['...You fought the thing that hatched. Of course one hatched.', 'I\'ll seal the rest. You earned the overtime pay. Don\'t tell Ijichi I said "overtime".'] },
  ],
  rewards: { coins: 130, xp: 190, spins: 1 },
});

registerQuest({
  id: 'sq_shibuya_grasshopper', title: 'The Grasshopper of Shibuya', region: 'shibuya',
  requires: { level: 3 },
  summary: 'A Grade 1 grasshopper curse is leaping between rooftops on Dogenzaka, picking off anyone in the open. Nobara wants it gone.',
  giver: { region: 'shibuya', npc: 'sby_nobara' },
  offer: ['There\'s a grasshopper. A HUGE one. It jumps from roof to roof on Dogenzaka and grabs people.', 'I already nailed it twice and it keeps coming back. It\'s fast.', 'You flush it out, I\'ll... cheer. Loudly. Go.'],
  steps: [
    { type: 'goto', anchor: 'dogenzaka_mid', radius: 10, text: 'Go up Dogenzaka' },
    { type: 'defeat', anchor: 'dogenzaka_mid', curse: { kind: 'grasshopper', name: 'Shibuya Grasshopper Curse', level: 4, elite: 'swift', hp: 5 }, text: 'Exorcise the Shibuya Grasshopper Curse' },
    { type: 'talk', npc: 'sby_nobara', text: 'Tell Nobara it\'s done', lines: ['Did you see that? It POPPED. Disgusting. Amazing.', 'Here. Found this on it. Or in it. Don\'t ask.'] },
  ],
  rewards: { coins: 220, xp: 320, items: 1, rarity: 'rare', spins: 1 },
});

// ------------------------------------------------------------------ Shinjuku
registerQuest({
  id: 'sq_shinjuku_curtain', title: 'A Curtain for the Ruins', region: 'shinjuku',
  requires: { quests: ['m2'] },
  summary: 'Curses keep drifting out of the levelled district into the city. Ijichi wants a curtain over the ruins: plant his four stakes, then push the curses inside before it closes.',
  giver: { region: 'shinjuku', npc: 'sjk_ijichi', npcDef: { name: 'Kiyotaka Ijichi', look: 'npc_ijichi', color: '#9ab0d8', anchor: 'checkpoint_ijichi' } },
  offer: ['Ah — you came. Good. I, um, need help with a curtain.', 'The levelled district leaks curses into Shinjuku every night. A curtain will hold them, but it needs four anchor stakes at the corners.', 'Plant them, then drive the curses back in before the curtain closes. I\'ll chant. Chanting is... most of my job.'],
  steps: [
    { type: 'collect', item: { name: 'Curtain Stake', icon: '📍', color: '#9ab0ff' }, spots: ['stake_0', 'stake_1', 'stake_2', 'stake_3'], text: 'Plant the curtain stakes at the four corners of the levelled district' },
    { type: 'exorcise', count: 8, anchor: 'ruins_center', radius: 50, spawn: { kinds: ['transfigured', 'swarmer', 'flyhead', 'longneck'], level: 3, max: 4 }, text: 'Exorcise curses inside before the curtain closes' },
    { type: 'talk', npc: 'sjk_ijichi', text: 'Report to Ijichi at the checkpoint', lines: ['"Emerging from darkness, darker than darkness..." — there. It\'s up.', 'Th-thank you. Gojo-san would have done it in a second. But Gojo-san isn\'t... thank you.'] },
  ],
  rewards: { coins: 160, xp: 230, spins: 1 },
});

registerQuest({
  id: 'sq_shinjuku_kabukicho', title: 'Kuchisake of Kabukicho', region: 'shinjuku',
  requires: { level: 2 },
  summary: 'A slit-mouthed curse stalks Kabukicho\'s Ichibangai after dark, asking passers-by if she is beautiful. Ren the host wants her gone.',
  giver: { region: 'shinjuku', npc: 'sjk_ren' },
  offer: ['There\'s a woman in a mask on Ichibangai. She asks if she\'s pretty. Nobody gets the answer right.', 'Three of my regulars stopped coming. One sent me a text that just said "her neck".', 'You look like you can answer a question with your fists. Go ask her.'],
  steps: [
    { type: 'goto', anchor: 'kabuki_alley', radius: 9, text: 'Walk down Kabukicho Ichibangai' },
    { type: 'defeat', anchor: 'kabuki_alley', curse: { kind: 'longneck', name: 'Kuchisake of Kabukicho', level: 4, elite: 'shadow', hp: 5 }, text: 'Exorcise the Kuchisake of Kabukicho' },
    { type: 'talk', npc: 'sjk_ren', text: 'Tell Ren the street is safe', lines: ['She\'s gone? Really gone? Champagne\'s on the house. ...You\'re a minor. Juice is on the house.', 'And take this. A customer left it. It hums.'] },
  ],
  rewards: { coins: 210, xp: 300, items: 1, rarity: 'rare' },
});

registerQuest({
  id: 'sq_shinjuku_office', title: 'Overtime', region: 'shinjuku',
  summary: 'Curses have taken an office tower in West Shinjuku, floor by floor. Mr. Tanabe\'s presentation is on the top floor.',
  giver: { region: 'shinjuku', npc: 'sjk_tanabe' },
  offer: ['My presentation is on the fourth floor. Tomorrow at nine. My laptop is up there. So are... THINGS.', 'Security says every floor is crawling with them. I say I will be fired.', 'Please. The stairs are by the back wall. I\'ll wait. Out here. Far out here.'],
  steps: [
    { type: 'goto', anchor: 'bld_sjk_office_door', radius: 6, text: 'Go to the Mitsui Annex in West Shinjuku' },
    { type: 'exorcise', count: 4, anchor: 'bld_sjk_office', radius: 18, text: 'Clear the lobby (1F)' },
    { type: 'exorcise', count: 4, anchor: 'bld_sjk_office', radius: 18, text: 'Clear the 2F offices' },
    { type: 'exorcise', count: 4, anchor: 'bld_sjk_office', radius: 18, text: 'Clear the 3F offices' },
    { type: 'exorcise', count: 3, anchor: 'bld_sjk_office', radius: 18, text: 'Clear the 4F offices' },
    { type: 'talk', npc: 'sjk_tanabe', text: 'Tell Mr. Tanabe the building is clear', lines: ['My laptop! It\'s... it has a bite out of it. Whatever. The slides are in the cloud.', 'Here, a bonus. From me. My company will never know.'] },
  ],
  rewards: { coins: 170, xp: 250, items: 1, rarity: 'rare' },
});

registerQuest({
  id: 'sq_shinjuku_gyoen', title: 'Greenhouse Rescue', region: 'shinjuku',
  summary: 'A Window agent went into the Gyoen greenhouse after a curse report and sealed herself in. Something is circling it.',
  giver: { region: 'shinjuku', npc: 'sjk_gardener' },
  offer: ['A Window agent went into the greenhouse an hour ago. Now there\'s a purple light and things scratching at the glass.', 'I trim hedges. I do not fight whatever that is.', 'Get her out, and walk her to the station. She\'ll want to report.'],
  steps: [
    { type: 'goto', anchor: 'bld_sjk_greenhouse_door', radius: 8, text: 'Go to the Gyoen greenhouse' },
    { type: 'exorcise', count: 5, anchor: 'bld_sjk_greenhouse', radius: 24, spawn: { kinds: ['spitter', 'swarmer', 'burrower'], level: 3, max: 3 }, text: 'Exorcise the curses round the greenhouse' },
    { type: 'rescue', anchor: 'bld_sjk_greenhouse', npc: { name: 'Window Agent Hara', look: 'npc_nitta' }, escort: { anchor: 'station_plaza', radius: 9 }, text: 'Break the seal and free the Window agent', escortText: 'Walk Agent Hara to Shinjuku Station' },
    { type: 'talk', npc: 'sjk_gardener', text: 'Let the gardener know', lines: ['She made it? Good. The orchids made it too, mostly.', 'Here — the Window left this for whoever helped. And a cutting. Plant it somewhere nice.'] },
  ],
  rewards: { coins: 130, xp: 190, items: 1 },
});

registerQuest({
  id: 'sq_shinjuku_scars', title: 'Scars of the Shrine', region: 'shinjuku',
  requires: { level: 3 },
  summary: 'Dr. Aoki needs residue samples from the cuts Sukuna left across the levelled district. Something has made a nest in the Hollow Purple crater.',
  giver: { region: 'shinjuku', npc: 'sjk_aoki' },
  offer: ['Those long cuts in the ground — Dismantle, Cleave, the shrine itself. The residue is still active. Weeks later.', 'I need three samples. And something big has moved into the great crater. It feeds on what\'s left of him.', 'Samples first. Then, if you are very brave or very stupid, the crater.'],
  steps: [
    { type: 'goto', anchor: 'scar_0', radius: 8, text: 'Go past the checkpoint to the first cut' },
    { type: 'collect', item: { name: 'Cursed Residue', icon: '🧪', color: '#ff4a6a' }, spots: ['scar_0', 'scar_1', 'scar_2'], text: 'Take residue samples from the shrine\'s cuts' },
    { type: 'defeat', anchor: 'great_crater', curse: { kind: 'gravekeeper', name: 'Remnant of the Shrine', level: 4, elite: 'vampiric', hp: 5 }, text: 'Exorcise the Remnant of the Shrine in the Hollow Purple crater' },
    { type: 'talk', npc: 'sjk_aoki', text: 'Bring the samples to Dr. Aoki', lines: ['Still warm. Fascinating. Horrifying. Mostly fascinating.', 'You went into the crater? I said "very stupid" as a joke. Here — hazard pay.'] },
  ],
  rewards: { coins: 200, xp: 300, items: 1, rarity: 'rare', spins: 1 },
});
