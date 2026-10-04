// All karts: the 16 original karts plus vehicle packs in
// js/vehicles/*.js (see buildVehicle in characters.js for the vehicle contract).
import { CHARACTERS } from './characters.js';

// pack ids -> labels (used by the garage view)
export const KART_GROUPS = [
  { id: 'originals', name: 'Original Karts' },
  { id: 'wild', name: 'Wild Rides' },
  { id: 'starwars', name: 'Star Wars Rides' },
  { id: 'heroes', name: 'Marvel & Jurassic Rides' },
  { id: 'potter', name: 'Wizarding Rides' },
  { id: 'cursed', name: 'Cursed & Fantasy Rides' },
  { id: 'minecraft', name: 'Minecraft Rides' },
  { id: 'pokemon', name: 'Pokémon Rides' },
  { id: 'sonic', name: 'Sonic Rides' },
];
// Packs are listed in FINISHED once reviewed; unfinished ones only load in the workbench and the
// developer views (?garage=…, ?kart=…, ?packs=all) so half-built vehicles never reach players.
const FINISHED = ['originals', 'starwars', 'heroes', 'potter', 'cursed', 'wild', 'minecraft', 'pokemon', 'sonic'];
const q = new URLSearchParams(location.search);
const dev = location.pathname.includes('/workbench/') || q.has('garage') || q.has('kart') || q.has('packs');
const PACKS = ['originals', 'wild', 'starwars', 'heroes', 'potter', 'cursed', 'minecraft', 'pokemon', 'sonic'].filter((id) => dev || FINISHED.includes(id));
// each pack loads on its own so one broken file never stops the game
const loaded = await Promise.allSettled(PACKS.map((id) => import(`./vehicles/${id}.js`)));
const packs = {};
loaded.forEach((r, i) => {
  if (r.status !== 'fulfilled') { console.error(`Vehicles "${PACKS[i]}" failed to load`, r.reason); return; }
  packs[PACKS[i]] = (r.value.default || []).map((d) => {
    const colors = d.colors || [0xc91a09, 0x1b2a34];
    return { stats: { speed: 3, accel: 3, handling: 3, weight: 3 }, ...d, group: PACKS[i], vehicle: d.name, kart: colors[0], accent: colors[1] ?? colors[0], colors };
  });
});
// Which movie (driver universe) each kart belongs to, so CPU drivers can favour their own rides.
// 'classic' = the original karts; vehicles that fit no movie get their pack id ('wild', 'fantasy').
const DOMAIN = {
  jpjeep: 'jurassic', gyrosphere: 'jurassic', tourcar: 'jurassic',
  talon: 'marvel', starkcar: 'marvel', goatchariot: 'marvel',
  ijichi: 'jjk', dharma: 'jjk', nue: 'jjk',
  carpet: 'fantasy', dragon: 'fantasy', teacup: 'fantasy',
};
for (const [pack, list] of Object.entries(packs)) {
  for (const k of list) k.domain ??= pack === 'originals' ? 'classic' : DOMAIN[k.id] || pack;
}

// the original karts: rebuilt vehicles when that pack is finished, else the classic body styles
for (const ch of CHARACTERS) { ch.group = 'originals'; ch.domain = 'classic'; }
const originals = packs.originals?.length ? packs.originals : CHARACTERS;
const half = Math.ceil(originals.length / 2);
// one list in display order: half the originals, the wild rides, the movie rides (Harry Potter
// before Jujutsu Kaisen), the video game rides, the other half
export const KARTS = [
  ...originals.slice(0, half),
  ...(packs.wild || []), ...(packs.starwars || []), ...(packs.heroes || []), ...(packs.potter || []), ...(packs.cursed || []),
  ...(packs.minecraft || []), ...(packs.pokemon || []), ...(packs.sonic || []),
  ...originals.slice(half),
];
