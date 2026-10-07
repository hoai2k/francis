// Classmates: eight friends across the four houses plus a Slytherin rival. Each has a
// personality, a home town, a friendship meter, favourite gifts, a spell they can teach
// and the spells they use as a combat companion.
import { G } from './state.js';
import { SKIN_TONES } from './models.js';

export const FRIENDS = {
  pip: { name: 'Pip Fenwick', short: 'Pip', house: 'hufflepuff', home: 'Little Sowerby, Somerset', voice: 'high', color: '#ffb0d0',
    personality: 'Cheerful, chatty and obsessed with Chocolate Frog cards.', likes: ['frog', 'cake'], teaches: 'episkey', spells: ['stupefy', 'episkey'],
    look: { house: 'hufflepuff', hairStyle: 'bun', hairColor: '#b5682a', skin: SKIN_TONES[1], scale: 0.92 } },
  oren: { name: 'Oren Achterberg', short: 'Oren', house: 'ravenclaw', home: 'Whitby, Yorkshire', voice: 'mid', color: '#8ab8ff',
    personality: 'Bookish and dry-witted; knows every star by name.', likes: ['book', 'liquorice'], teaches: 'glacius', spells: ['glacius', 'stupefy'],
    look: { house: 'ravenclaw', hairStyle: 'messy', hairColor: '#1b1210', glasses: true, skin: SKIN_TONES[0], scale: 0.95 } },
  tamsin: { name: 'Tamsin Hollowell', short: 'Tamsin', house: 'gryffindor', home: 'Cardiff', voice: 'mid', color: '#ff9a6a',
    personality: 'Bold and loud; a born Beater who never backs down.', likes: ['pasty', 'broom'], teaches: 'confringo', spells: ['incendio', 'confringo'],
    look: { house: 'gryffindor', hairStyle: 'ponytail', hairColor: '#a8322a', skin: SKIN_TONES[1], scale: 0.97 } },
  kofi: { name: 'Kofi Mensah-Lowe', short: 'Kofi', house: 'gryffindor', home: 'Brixton, London', voice: 'mid', color: '#ffd27a',
    personality: 'The class joker; dreams of opening a joke shop.', likes: ['joke', 'beans'], teaches: 'rictusempra', spells: ['rictusempra', 'flipendo'],
    look: { house: 'gryffindor', hairStyle: 'curly', hairColor: '#1b1210', skin: SKIN_TONES[4], scale: 1.0 } },
  isolde: { name: 'Isolde Varga', short: 'Isolde', house: 'slytherin', home: 'Bath (by way of Budapest)', voice: 'mid', color: '#7fd0a0',
    personality: 'Ambitious, precise, a gifted potioneer with a kind streak she hides.', likes: ['potion', 'cake'], teaches: 'diffindo', spells: ['diffindo', 'expelliarmus'],
    look: { house: 'slytherin', hairStyle: 'long', hairColor: '#1b1210', skin: SKIN_TONES[2], scale: 0.95 } },
  ruairi: { name: 'Ruairí Doyle', short: 'Ruairí', house: 'hufflepuff', home: 'Galway', voice: 'low', color: '#e0b080',
    personality: 'A gentle giant who would rather be with the creatures.', likes: ['pasty', 'creature'], teaches: 'depulso', spells: ['depulso', 'ventus'],
    look: { house: 'hufflepuff', hairStyle: 'short', hairColor: '#d9b26a', skin: SKIN_TONES[0], scale: 1.12 } },
  mei: { name: 'Mei Lin Chau', short: 'Mei', house: 'ravenclaw', home: 'Manchester', voice: 'high', color: '#c9a0ff',
    personality: 'A competitive duelling prodigy who hates to lose.', likes: ['book', 'frog'], teaches: 'arresto', spells: ['stupefy', 'expelliarmus'],
    look: { house: 'ravenclaw', hairStyle: 'bun', hairColor: '#1b1210', skin: SKIN_TONES[1], scale: 0.9 } },
  bram: { name: 'Bram Okonkwo-Hale', short: 'Bram', house: 'slytherin', home: 'Edinburgh', voice: 'low', color: '#9fe08a',
    personality: 'Quiet, loyal and a brilliant Herbology student.', likes: ['plant', 'liquorice'], teaches: 'aguamenti', spells: ['aguamenti', 'petrificus'],
    look: { house: 'slytherin', hairStyle: 'short', hairColor: '#1b1210', skin: SKIN_TONES[5], scale: 1.05 } },
  cassius: { name: 'Cassius Vane', short: 'Cassius', house: 'slytherin', home: 'Vane Hall, Wiltshire', voice: 'mid', color: '#c4c9cf', rival: true,
    personality: 'Your rival: proud, sharp-tongued and desperate to live up to his father.', likes: ['broom', 'book'], teaches: 'levicorpus', spells: ['stupefy', 'levicorpus'],
    look: { house: 'slytherin', hairStyle: 'short', hairColor: '#e8dcc0', skin: SKIN_TONES[0], scale: 1.0 } },
};
export const FRIEND_IDS = Object.keys(FRIENDS);

export function friendship(id) { return G.save?.friends?.[id]?.f || 0; }
export function friendLevel(id) { const f = friendship(id); return f >= 80 ? 4 : f >= 55 ? 3 : f >= 30 ? 2 : f >= 10 ? 1 : 0; }
export const FRIEND_LEVELS = ['Stranger', 'Acquaintance', 'Friend', 'Good friend', 'Best friend'];
export function meet(id) {
  const s = G.save;
  s.friends ||= {};
  if (!s.friends[id]) s.friends[id] = { f: FRIENDS[id].rival ? 0 : 5, met: true, talkDay: -1, gifts: 0 };
  return s.friends[id];
}
