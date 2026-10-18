// The story: Jujutsu Kaisen arcs, each a run of chapters. Every chapter is a
// mission (a generated level in one of the biomes, an objective and a Special
// Grade boss) with a short briefing and an ending line. Chapter ids are the
// mission ids the save already uses (save.data.completed[id] = best threat
// cleared), so old saves keep their progress.
//   biome      world/biomes.js key
//   objective  exorcise | rescue | seal (mission.js)
//   boss       entities/bosses.js BOSS_IDS (entities/bosses/<id>.js)
//   difficulty base grade (1 = Grade 3 … 4 = Special Grade)
//   start      where its quest marker stood in the old hub (kept for text)
//   region     the open-world region its curtain (lair) is in; the lair is
//              the region's 'lair_<id>' anchor (world/regions/)
//   giver      who briefs it there: { npc, name, look, color, lines } — a
//              Jujutsu High resident ('gojo', 'nitta'…) or a quest NPC the
//              quest system stands at the region's 'giver_<id>' anchor
//   intro      the briefing lines; outro: one line when it is cleared
//   world      the chapter in the open world (world/worldMission.js): a curtain falls over a
//              district of its region and the objective + boss play out there.
//              { r: curtain radius (34), center: [x, z] (default: the 'lair_<id>' anchor),
//                spots: [[x, z, 'landmark name'], …] where the curses gather / cages / altars
//                stand (snapped to reachable floor; filled with far-apart floor when short),
//                count (spots used: 4 for exorcise, else 3), need (curses to exorcise),
//                arena: [x, z] boss arena hint (the flattest open floor near it), arenaR,
//                arenaName, captives: [looks] for cages, captiveLabel / freedText, sealLabel }
export const ARCS = [
  { id: 'womb', num: 1, title: 'Cursed Womb', sub: 'Fearsome Womb', color: '#7a5cff', icon: '☠',
    blurb: 'A finger of Ryomen Sukuna. A new first-year. A school full of curses.' },
  { id: 'kyoto', num: 2, title: 'Kyoto Goodwill Event', sub: 'Exchange Event', color: '#3ab8ff', icon: '⛩',
    blurb: 'Tokyo against Kyoto. Somebody brought uninvited guests.' },
  { id: 'shibuya', num: 3, title: 'Shibuya Incident', sub: 'October 31st', color: '#ff5a3a', icon: '🎃',
    blurb: 'Halloween. A curtain falls over Shibuya, and Gojo walks in alone.' },
];

// boss id -> how the chapter map labels it (keep in step with entities/bosses/)
export const BOSS_NAMES = {
  sugisawa_curse: { name: 'The Sugisawa Curse', title: 'Grade 1 Cursed Spirit', color: '#9a6aff', icon: '👁' },
  finger_bearer: { name: 'The Finger Bearer', title: 'Special Grade Cursed Womb', color: '#b04aff', icon: '🥚' },
  mahito: { name: 'Mahito', title: 'Special Grade · Idle Transfiguration', color: '#7ad8ff', icon: '🧵' },
  hanami: { name: 'Hanami', title: 'Special Grade · Disaster Plants', color: '#7aff5a', icon: '🌿' },
  eso_kechizu: { name: 'Eso & Kechizu', title: 'Death Painting Wombs · Rot Technique', color: '#d0304a', icon: '🖼' },
  dagon: { name: 'Dagon', title: 'Special Grade · Disaster Tides', color: '#3ab8ff', icon: '🐙' },
  choso: { name: 'Choso', title: 'Death Painting Womb · Blood Manipulation', color: '#d0102a', icon: '🩸' },
  jogo: { name: 'Jogo', title: 'Special Grade · Disaster Flames', color: '#ff7a2a', icon: '🌋' },
  mahoraga: { name: 'Mahoraga', title: 'Divine General · Ten Shadows', color: '#fff0b0', icon: '☸' },
  sukuna: { name: 'Ryomen Sukuna', title: 'King of Curses · Shrine', color: '#ff2a3a', icon: '👑' },
};

export const OBJECTIVES = {
  exorcise: { title: 'Exorcise the curses', icon: '⚔' },
  rescue: { title: 'Rescue the trapped', icon: '⛓' },
  seal: { title: 'Seal the cursed objects', icon: '☯' },
};

export const GRADES = ['', 'Grade 3', 'Grade 2', 'Grade 1', 'Special Grade', 'Special+', 'Special++'];
export const gradeName = (n) => GRADES[Math.max(1, Math.min(6, n))];

export const CHAPTERS = [
  // ------------------------------------------------------------ Arc 1
  {
    id: 'm1', arc: 'womb', num: 1, title: 'The Finger', place: 'Sugisawa Third High, at night',
    biome: 'jujutsu_high', objective: 'seal', objText: 'Seal the cursed relics', boss: 'sugisawa_curse', difficulty: 1, icon: '☝',
    world: { r: 34, arena: [200, 246], arenaName: 'the old wing\'s forecourt', spots: [[188, 236, 'the shopping street'], [214, 244, 'Takao-machi Station'], [216, 264, 'the old wing\'s yard']], sealLabel: 'Seal the cursed relic' },
    region: 'jujutsu_high', giver: { npc: 'gojo', lines: ['Yo, first-year. Ready for your first real job?', 'A finger of Sukuna turned up at Sugisawa Third High. They keep the old wing down in Takao-machi.', 'Every curse for miles can smell it. Go seal the relics before something eats them. I\'ll be... nearby. Probably.'] },
    start: { at: 'gate', dx: 3, dz: -2, place: 'the school gate' },
    intro: [
      'A rotting finger in a school storeroom. Someone broke the seal.',
      'Every curse in the city can smell it. They are coming for it tonight.',
      'Seal the cursed relics before the curses feast on them. Something with a hundred eyes is already inside.',
    ],
    outro: 'The relics are sealed. Gojo waves from the rooftop: "Welcome to Jujutsu High."',
  },
  {
    id: 'm2', arc: 'womb', num: 2, title: 'Fearsome Womb', place: 'Eishu Detention Centre',
    biome: 'tokyo_night', objective: 'rescue', objText: 'Free the trapped inmates', boss: 'finger_bearer', difficulty: 1, icon: '🥚',
    world: { r: 34, center: [197, 62], arena: [197, 68], arenaName: 'the detention centre gate', count: 4, spots: [[174, 48, 'the west yard'], [220, 48, 'the east yard'], [197, 30, 'between the cell blocks'], [180, 28, 'the north block']], captives: ['npc_civ_1', 'npc_civ_3', 'npc_civ_4', 'npc_civ_0'], captiveLabel: 'Free the inmate', freedText: 'Inmate freed! He runs for the gate.' },
    region: 'shinjuku', giver: { npc: 'ijichi_shinjuku', name: 'Kiyotaka Ijichi', look: 'npc_ijichi', color: '#9ab0d8', lines: ['The Eishu Detention Centre is just past here. A cursed womb is forming inside.', 'Five inmates are still in there. The Window says it\'s Special Grade.', 'I\'ll drop the curtain. Please... come back.'] },
    start: { at: 'gate', dx: -3, dz: -2, place: 'the school gate' },
    intro: [
      'A cursed womb has hatched inside a detention centre. Five inmates are still inside.',
      'The Window says a Special Grade is forming. First-years should not be here.',
      'Get them out. Do not die.',
    ],
    outro: 'The womb falls, and a rotting finger rolls out of its chest. Something stitched and smiling watched you leave.',
  },
  {
    id: 'm3', arc: 'womb', num: 3, title: 'Transfigured', place: 'The sewers under Kawasaki',
    biome: 'flooded_subway', objective: 'exorcise', objText: 'Cut down the transfigured', boss: 'mahito', difficulty: 2, icon: '🧵',
    world: { r: 34, center: [58, 250], arena: [60, 258], arenaName: 'the culvert ruins', need: 16, spots: [[36, 232, 'the storm drain'], [70, 244, 'the scorched cut'], [44, 268, 'the ruined blocks'], [80, 262, 'the levelled street']] },
    region: 'shinjuku', giver: { npc: 'nanami_shinjuku', name: 'Kento Nanami', look: 'nanami', color: '#e8d27a', lines: ['Bodies twisted into shapes no person should have. The trail leads into the sewers.', 'This is overtime. Let us be quick.'] },
    start: { at: 'mainHall', dx: 0, dz: 3, place: 'the main hall' },
    intro: [
      'Bodies keep turning up in the city, twisted into shapes no person should have.',
      'Nanami tracked them to the sewers. "This is overtime. Let us be quick."',
      'At the end of the tunnels waits the curse born from human hatred of each other.',
    ],
    outro: 'Mahito slips away, laughing. "Let\'s play again, sorcerer."',
  },
  // ------------------------------------------------------------ Arc 2
  {
    id: 'm4', arc: 'kyoto', num: 1, title: 'Curse Hunt', place: 'The Kyoto school woods',
    biome: 'cursed_forest', objective: 'exorcise', objText: 'Out-exorcise Kyoto', boss: 'hanami', difficulty: 2, icon: '🏹',
    world: { r: 34, arenaName: 'the Goodwill Event grounds', need: 18, spots: [[50, 214, 'the north woods'], [30, 236, 'the western thicket'], [48, 268, 'the southern trail'], [78, 222, 'the eastern clearing']] },
    region: 'kyoto', giver: { npc: 'todo_kyoto', name: 'Aoi Todo', look: 'todo', color: '#c89a6a', lines: ['So you\'re Tokyo\'s new blood. Tell me, what type of woman do you like?', '...Hah! Good answer. Day one of the Goodwill Event: whoever exorcises the most curses wins.', 'The woods are past the curtain. Try to keep up, brother.'] },
    start: { at: 'trainingGround', dx: 2, dz: 0, place: 'the training ground' },
    intro: [
      'Day one of the Goodwill Event: the team battle. Whoever exorcises the most curses wins.',
      'Principal Gakuganji wants Sukuna\'s vessel gone. Kyoto has its orders.',
      'Then a curtain falls over the woods that nobody here put up.',
    ],
    outro: 'The woods go quiet. Todo grins: "Brother. Again."',
  },
  {
    id: 'm7', arc: 'kyoto', num: 2, title: 'Black Flash', place: 'Jujutsu High grounds, under a curtain',
    biome: 'jujutsu_high', objective: 'rescue', objText: 'Free the students in the curtain', boss: 'hanami', difficulty: 2, icon: '⚡',
    world: { r: 34, arenaName: 'the training ground', spots: [[184, 86, 'Gojo\'s bench'], [170, 104, 'the courtyard'], [206, 134, 'the cedar edge']], captives: ['miwa', 'mai', 'panda'], captiveLabel: 'Free the student', freedText: 'Student freed! The curtain still holds.' },
    region: 'jujutsu_high', giver: { npc: 'nitta', lines: ['A curtain just dropped over the training ground! Gojo-san can\'t get through it.', 'Students from both schools are trapped in there. Please hurry!'] },
    start: { at: 'trainingGround', dx: -2, dz: 2, place: 'the training ground' },
    intro: [
      'The curtain keeps Gojo out. Students from both schools are trapped inside.',
      'Hanami walks among the trees as if she owns them.',
      'Free the students, then hit her so hard the space between blows turns black.',
    ],
    outro: 'Black Flash. Hanami flees into her flowers. The curtain lifts at last.',
  },
  {
    id: 'm8', arc: 'kyoto', num: 3, title: 'Stolen Fingers', place: 'Yasohachi Bridge, Saitama',
    biome: 'tokyo_night', objective: 'seal', objText: 'Seal the Death Paintings', boss: 'eso_kechizu', difficulty: 3, icon: '🖼',
    world: { r: 34, center: [230, 152], arena: [238, 146], arenaName: 'the east bank clearing', spots: [[216, 166, 'the west bank'], [232, 160, 'Yasohachi Bridge'], [248, 136, 'the east woods']], sealLabel: 'Seal the Death Painting' },
    region: 'cursed_forest', giver: { npc: 'nobara_forest', name: 'Nobara Kugisaki', look: 'nobara', color: '#ffa050', lines: ['The fingers and the Death Paintings were stolen during the Goodwill Event.', 'Two of the wombs walked out to Yasohachi Bridge. They bleed poison, apparently. Gross.', 'Let\'s go seal them. I\'ll bring the hammer.'] },
    start: { at: 'shrine', dx: 2, dz: 2, place: 'the shrine steps' },
    intro: [
      'During the Goodwill Event the storehouse was robbed: Sukuna\'s fingers and the Death Paintings.',
      'Three of the cursed wombs have woken. They walk, and they bleed poison.',
      'Seal the paintings before they all hatch.',
    ],
    outro: 'Eso and Kechizu rot away together. Their eldest brother, Choso, feels it, and swears revenge.',
  },
  // ------------------------------------------------------------ Arc 3
  {
    id: 'm5', arc: 'shibuya', num: 1, title: 'The Curtain Falls', place: 'Shibuya, 31 October',
    biome: 'shibuya', objective: 'rescue', objText: 'Save the trapped civilians', boss: 'dagon', difficulty: 3, icon: '🎃',
    world: { r: 34, arenaName: 'the flooded junction', count: 4, spots: [[143, 86, 'Inokashira-dori'], [176, 118, 'the curtain wall by Miyashita'], [143, 139, 'the mouth of Center Gai'], [126, 104, 'the back streets']], captives: ['npc_civ_0', 'npc_tourist', 'npc_civ_2', 'npc_civ_5'], captiveLabel: 'Free the civilian', freedText: 'Civilian freed! They run for the evacuation point.' },
    region: 'shibuya', giver: { npc: 'nitta_shibuya', name: 'Akari Nitta', look: 'npc_nitta', color: '#f0b070', lines: ['20:31. A curtain sealed the station with thousands of people inside.', 'They want Gojo-san. Every sorcerer in Tokyo is heading in.', 'Get the civilians out. I\'ll keep the car running!'] },
    start: { at: 'gate', dx: 0, dz: -4, place: 'the school gate' },
    intro: [
      '20:31. A curtain seals Shibuya Station with thousands of people inside.',
      'The message is shouted at the barrier: "Bring us Satoru Gojo."',
      'Get the civilians out. Something that smells of the sea is waiting below.',
    ],
    outro: 'Dagon dissolves back into the sea it was born from. Gojo goes underground alone.',
  },
  {
    id: 'm9', arc: 'shibuya', num: 2, title: 'Fukutoshin Line', place: 'Shibuya Station, B5F',
    biome: 'flooded_subway', objective: 'exorcise', objText: 'Clear the platform', boss: 'choso', difficulty: 3, icon: '🚇',
    world: { r: 34, arena: [264, 212], arenaName: 'the Fukutoshin Line entrance', need: 18, spots: [[263, 199, 'the Fukutoshin Line entrance'], [237, 203, 'the Tokyu side'], [291, 203, 'Meiji-dori'], [268, 236, 'the south exits']] },
    region: 'shibuya', giver: { npc: 'nanami_shibuya', name: 'Kento Nanami', look: 'nanami', color: '#e8d27a', lines: ['Gojo went down to B5F alone. The platform is packed with transfigured people.', 'Someone is waiting at the foot of the stairs. Be careful.'] },
    start: { at: 'mainHall', dx: -3, dz: 3, place: 'the main hall' },
    intro: [
      'The platform is packed with transfigured humans. Below them, the Prison Realm waits for Gojo.',
      'Choso stands at the foot of the stairs. "You killed my little brothers." His blood is already moving.',
      'Clear the platform, then get past the eldest Death Painting.',
    ],
    outro: 'Choso staggers away, haunted by a brother he never had. Below, the Prison Realm closes on Gojo Satoru.',
  },
  {
    id: 'm6', arc: 'shibuya', num: 3, title: 'Disaster Flames', place: 'Shibuya Crossing',
    biome: 'shibuya', objective: 'seal', objText: 'Seal the cursed seals', boss: 'jogo', difficulty: 4, icon: '🌋',
    world: { r: 34, center: [150, 186], arena: [150, 180], arenaName: 'the Scramble Crossing', spots: [[132, 170, 'Q-Front'], [172, 170, 'Hachiko Square'], [128, 202, 'Shibuya 109']], sealLabel: 'Seal the cursed seal' },
    region: 'shibuya', giver: { npc: 'maki_shibuya', name: 'Maki Zen\'in', look: 'npc_maki', color: '#6ac08a', lines: ['Jogo is burning his way through everyone on the surface.', 'Seal those cursed seals at the crossing. I\'ll cover you. Don\'t get roasted.'] },
    start: { at: 'shrine', dx: -2, dz: 2, place: 'the shrine steps' },
    intro: [
      'With Gojo gone, Jogo burns his way through the sorcerers on the surface.',
      'He wants Sukuna on his side. He will burn Shibuya to the ground to ask.',
      'Seal the cursed seals and face Jogo. Special Grade. Bring friends.',
    ],
    outro: '"You were strong, Jogo." The flames die down over the crossing.',
  },
  {
    id: 'm11', arc: 'shibuya', num: 4, title: 'Eight-Handled Sword', place: 'Shibuya, Dogenzaka',
    biome: 'shibuya', objective: 'rescue', objText: 'Shield the wounded sorcerers', boss: 'mahoraga', difficulty: 4, icon: '☸',
    world: { r: 34, arenaR: 12, arenaName: 'Dogenzaka', spots: [[34, 232, 'the love-hotel alley'], [14, 216, 'the top of the hill'], [66, 212, 'the foot of Dogenzaka']], captives: ['megumi', 'npc_maki', 'inumaki'], captiveLabel: 'Shield the wounded sorcerer', freedText: 'Wounded sorcerer pulled to safety!' },
    region: 'shibuya', giver: { npc: 'yuji_shibuya', name: 'Yuji Itadori', look: 'yuji', color: '#ff8a6a', lines: ['Megumi\'s cornered on Dogenzaka. He\'s making a hand sign I\'ve never seen...', 'Whatever comes out of that shadow, we have to help the wounded first!'] },
    start: { at: 'trainingGround', dx: 0, dz: -3, place: 'the training ground' },
    intro: [
      'Megumi is cornered and bleeding out. He makes the one hand sign no Ten Shadows user has survived.',
      '"With this treasure, I summon... Eight-Handled Sword Divergent Sila Divine General Mahoraga."',
      'It adapts to everything that hurts it. Watch the wheel, and never hit it the same way for long.',
    ],
    outro: 'The wheel stops turning, and the Divine General sinks into the shadows. Somewhere, the King of Curses laughs.',
  },
  {
    id: 'm10', arc: 'shibuya', num: 5, title: 'Idle Transfiguration', place: 'Shibuya, before dawn',
    biome: 'shibuya', objective: 'exorcise', objText: 'Survive the night', boss: 'mahito', difficulty: 4, icon: '🖐',
    world: { r: 34, center: [176, 196], arena: [170, 186], arenaName: 'Hachiko Square', need: 22, spots: [[172, 172, 'Hachiko Square'], [188, 198, 'the Aogaeru car'], [150, 212, 'the foot of Dogenzaka'], [200, 214, 'Mark City']] },
    region: 'shibuya', giver: { npc: 'todo_shibuya', name: 'Aoi Todo', look: 'todo', color: '#c89a6a', lines: ['Brother. Stand up.', 'Mahito has evolved. We end him here, before dawn.'] },
    start: { at: 'dormitory', dx: 0, dz: 3, place: 'the dormitory' },
    intro: [
      'Nanami is gone. Nobara is down. Mahito has evolved.',
      'Todo has come back to fight beside you. "Brother. Stand up."',
      'End the curse born from humanity\'s hatred, here and now.',
    ],
    outro: 'Mahito crawls away, broken, and "Geto" steps out of the dark and swallows him whole.',
  },
  {
    id: 'm12', arc: 'shibuya', num: 6, title: 'King of Curses', place: 'Shibuya, the ruined crossing',
    biome: 'shibuya', objective: 'seal', objText: 'Seal the scattered fingers', boss: 'sukuna', difficulty: 4, icon: '👑',
    world: { r: 34, arena: [250, 298], arenaR: 12, arenaName: 'the levelled crossing', spots: [[240, 270, 'the sliced towers'], [222, 290, 'the scorched cut'], [268, 276, 'the rubble field']], sealLabel: 'Seal the finger' },
    region: 'shibuya', giver: { npc: 'yuta_shibuya', name: 'Yuta Okkotsu', look: 'yuta', color: '#c8c8ff', lines: ['Fifteen fingers. Sukuna walks Shibuya freely.', 'He scattered the rest. Seal them, and make him take you seriously.'] },
    start: { at: 'shrine', dx: 0, dz: -3, place: 'the shrine steps' },
    intro: [
      'Fifteen fingers. The vessel is drowning, and Ryomen Sukuna walks Shibuya freely.',
      'He is not here to fight you. He is here to amuse himself.',
      'Seal the fingers he scattered, then make the King of Curses take you seriously.',
    ],
    outro: 'Sukuna laughs and sinks back beneath Yuji\'s skin. "Enjoy your little victory, brat." The sun comes up over a broken Shibuya.',
  },
];

export const chapter = (id) => CHAPTERS.find((c) => c.id === id) ?? null;
export const arc = (id) => ARCS.find((a) => a.id === id) ?? null;
export const chaptersOf = (arcId) => CHAPTERS.filter((c) => c.arc === arcId);
export const chapterIndex = (ch) => CHAPTERS.indexOf(ch);

// The story runs in CHAPTERS order. A chapter is open when the one before it
// is cleared, when it was cleared itself (replays), or with the code unlock.
export function chapterUnlocked(d, ch) {
  if (!ch) return false;
  if (d.unlockAll || d.completed?.[ch.id]) return true;
  const i = CHAPTERS.indexOf(ch);
  return i <= 0 || !!d.completed?.[CHAPTERS[i - 1].id];
}
export const chapterDone = (d, ch) => !!d.completed?.[ch.id];
// The next chapter to play: the first open one not cleared yet (null when the story is done).
export function nextChapter(d) { return CHAPTERS.find((c) => chapterUnlocked(d, c) && !chapterDone(d, c)) ?? null; }
// What to finish first to open a chapter.
export function chapterPrev(ch) { const i = CHAPTERS.indexOf(ch); return i > 0 ? CHAPTERS[i - 1] : null; }

// Mission definition for Game.startMission (the old MISSIONS shape, plus the story).
export function missionDef(ch, threat = 0) {
  const a = arc(ch.arc);
  return {
    id: ch.id, name: ch.title, biome: ch.biome, objective: ch.objective, boss: ch.boss,
    difficulty: ch.difficulty + threat, baseDifficulty: ch.difficulty, threat, icon: ch.icon, desc: ch.intro[0],
    chapter: ch.id, arc: ch.arc, arcTitle: a?.title, chapterNum: ch.num, place: ch.place, objText: ch.objText, outro: ch.outro,
    seed: (Math.random() * 1e9) | 0,
  };
}
