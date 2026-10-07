// Shared game context. Modules import G and read what they need.
export const G = {
  renderer: null,
  composer: null,
  scene: null,
  camera: null,
  time: 0, // game time (scaled)
  realTime: 0,
  dt: 0,
  timeScale: 1,
  slowmo: 0, // remaining real seconds of slow motion
  mode: 'loading', // loading | menu | play | dialogue | minigame | cutscene
  paused: false,
  settings: null,
  save: null,
  input: null,
  audio: null,
  ui: null,
  world: null,
  zone: null,
  player: null,
  fx: null,
  spells: null,
  enemies: null,
  story: null,
  cam: null,
  lights: null,
  minigame: null,
  net: null, // online co-op session (js/online/coop.js), null when playing alone
  quality: 'medium',
};

export const HOUSES = {
  gryffindor: { name: 'Gryffindor', c1: '#8a1414', c2: '#e3a521', crest: 'lion', trait: 'bravery' },
  slytherin: { name: 'Slytherin', c1: '#1a5c34', c2: '#c4c9cf', crest: 'serpent', trait: 'ambition' },
  ravenclaw: { name: 'Ravenclaw', c1: '#1b3070', c2: '#b0814a', crest: 'eagle', trait: 'wit' },
  hufflepuff: { name: 'Hufflepuff', c1: '#e8b923', c2: '#2b2622', crest: 'badger', trait: 'loyalty' },
};
export const HOUSE_KEYS = Object.keys(HOUSES);
