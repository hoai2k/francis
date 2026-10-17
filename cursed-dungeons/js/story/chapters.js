// The story: Jujutsu Kaisen arcs, each a run of chapters. Every chapter is a
// mission (a generated level in one of the biomes, an objective and a Special
// Grade boss) with a short briefing and an ending line. Chapter ids are the
// mission ids the save already uses (save.data.completed[id] = best threat
// cleared), so old saves keep their progress.
//   biome      world/biomes.js key
//   objective  exorcise | rescue | seal (mission.js)
//   boss       entities/bosses.js BOSS_IDS (jogo, hanami, mahito)
//   difficulty base grade (1 = Grade 3 … 4 = Special Grade)
//   start      where its quest marker stands at Jujutsu High: a hub spot
//              (L.spots key) and a short description of the place
//   intro      the briefing lines; outro: one line when it is cleared
export const ARCS = [
  { id: 'womb', num: 1, title: 'Cursed Womb', sub: 'Fearsome Womb', color: '#7a5cff', icon: '☠',
    blurb: 'A finger of Ryomen Sukuna. A new first-year. A school full of curses.' },
  { id: 'kyoto', num: 2, title: 'Kyoto Goodwill Event', sub: 'Exchange Event', color: '#3ab8ff', icon: '⛩',
    blurb: 'Tokyo against Kyoto. Somebody brought uninvited guests.' },
  { id: 'shibuya', num: 3, title: 'Shibuya Incident', sub: 'October 31st', color: '#ff5a3a', icon: '🎃',
    blurb: 'Halloween. A curtain falls over Shibuya, and Gojo walks in alone.' },
];

export const BOSS_NAMES = {
  hanami: { name: 'Hanami', title: 'Grove Curse', color: '#7aff5a', icon: '🌿' },
  jogo: { name: 'Jogo', title: 'Volcano Curse', color: '#ff7a2a', icon: '🌋' },
  mahito: { name: 'Mahito', title: 'Patchwork Curse', color: '#7ad8ff', icon: '🧵' },
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
    biome: 'jujutsu_high', objective: 'seal', objText: 'Seal the cursed relics', boss: 'hanami', difficulty: 1, icon: '☝',
    start: { at: 'gate', dx: 3, dz: -2, place: 'the school gate' },
    intro: [
      'A rotting finger in a school storeroom. Someone broke the seal.',
      'Every curse in the city can smell it. They are coming for it tonight.',
      'Seal the cursed relics before the grade curses feast on them.',
    ],
    outro: 'The relics are sealed. Gojo waves from the rooftop: "Welcome to Jujutsu High."',
  },
  {
    id: 'm2', arc: 'womb', num: 2, title: 'Fearsome Womb', place: 'Eishu Detention Centre',
    biome: 'tokyo_night', objective: 'rescue', objText: 'Free the trapped inmates', boss: 'mahito', difficulty: 1, icon: '🥚',
    start: { at: 'gate', dx: -3, dz: -2, place: 'the school gate' },
    intro: [
      'A cursed womb has hatched inside a detention centre. Five inmates are still inside.',
      'The Window says a Special Grade is forming. First-years should not be here.',
      'Get them out. Do not die.',
    ],
    outro: 'The survivors are out. Something stitched and smiling watched you leave.',
  },
  {
    id: 'm3', arc: 'womb', num: 3, title: 'Transfigured', place: 'The sewers under Kawasaki',
    biome: 'flooded_subway', objective: 'exorcise', objText: 'Cut down the transfigured', boss: 'mahito', difficulty: 2, icon: '🧵',
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
    biome: 'tokyo_night', objective: 'seal', objText: 'Seal the Death Paintings', boss: 'mahito', difficulty: 3, icon: '🖼',
    start: { at: 'shrine', dx: 2, dz: 2, place: 'the shrine steps' },
    intro: [
      'During the Goodwill Event the storehouse was robbed: Sukuna\'s fingers and the Death Paintings.',
      'Three of the cursed wombs have woken. They walk, and they bleed poison.',
      'Seal the paintings before they all hatch.',
    ],
    outro: 'The paintings are sealed. Their eldest brother, Choso, swears revenge.',
  },
  // ------------------------------------------------------------ Arc 3
  {
    id: 'm5', arc: 'shibuya', num: 1, title: 'The Curtain Falls', place: 'Shibuya, 31 October',
    biome: 'shibuya', objective: 'rescue', objText: 'Save the trapped civilians', boss: 'mahito', difficulty: 3, icon: '🎃',
    start: { at: 'gate', dx: 0, dz: -4, place: 'the school gate' },
    intro: [
      '20:31. A curtain seals Shibuya Station with thousands of people inside.',
      'The message is shouted at the barrier: "Bring us Satoru Gojo."',
      'Get the civilians out before the curses close in.',
    ],
    outro: 'Gojo goes underground alone. The civilians are free. For now.',
  },
  {
    id: 'm9', arc: 'shibuya', num: 2, title: 'Fukutoshin Line', place: 'Shibuya Station, B5F',
    biome: 'flooded_subway', objective: 'exorcise', objText: 'Clear the platform', boss: 'hanami', difficulty: 3, icon: '🚇',
    start: { at: 'mainHall', dx: -3, dz: 3, place: 'the main hall' },
    intro: [
      'The platform is packed with transfigured humans, and Gojo is down there.',
      'Hanami, Jogo and Choso are waiting with him, and a sealed box sits in the dark.',
      'Clear the platform. Every second counts.',
    ],
    outro: 'The Prison Realm opens. Gojo Satoru is sealed. The world changes tonight.',
  },
  {
    id: 'm6', arc: 'shibuya', num: 3, title: 'Disaster Flames', place: 'Shibuya Crossing',
    biome: 'shibuya', objective: 'seal', objText: 'Seal the cursed seals', boss: 'jogo', difficulty: 4, icon: '🌋',
    start: { at: 'shrine', dx: -2, dz: 2, place: 'the shrine steps' },
    intro: [
      'With Gojo gone, Jogo burns his way through the sorcerers on the surface.',
      'He wants Sukuna on his side. He will burn Shibuya to the ground to ask.',
      'Seal the cursed seals and face the Volcano Curse. Special Grade. Bring friends.',
    ],
    outro: '"You were strong, Jogo." The flames die down over the crossing.',
  },
  {
    id: 'm10', arc: 'shibuya', num: 4, title: 'Idle Transfiguration', place: 'Shibuya, before dawn',
    biome: 'shibuya', objective: 'exorcise', objText: 'Survive the night', boss: 'mahito', difficulty: 4, icon: '🖐',
    start: { at: 'dormitory', dx: 0, dz: 3, place: 'the dormitory' },
    intro: [
      'Nanami is gone. Nobara is down. Mahito has evolved.',
      'Todo has come back to fight beside you. "Brother. Stand up."',
      'End the curse born from humanity\'s hatred, here and now.',
    ],
    outro: 'The sun comes up over a broken Shibuya. You are still a sorcerer. That has to be enough.',
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
