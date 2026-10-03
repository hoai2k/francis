// Map registry and Grand Prix cups. Each map lives in js/maps/<id>.js.
import city from './maps/city.js';
import meadow from './maps/meadow.js';
import pirate from './maps/pirate.js';
import candy from './maps/candy.js';
import jungle from './maps/jungle.js';
import frost from './maps/frost.js';
import factory from './maps/factory.js';
import lava from './maps/lava.js';
import space from './maps/space.js';

// Movie Cup maps are loaded independently so a problem in one never stops
// the rest of the game from starting.
// Finished movie maps (others are still being built).
const MOVIE_IDS = ['jurassic', 'starwars', 'marvel', 'hogwarts'];
// JJK Run: one map per Jujutsu Kaisen season, in story order
const JJK_IDS = ['jjk-goodwill', 'jjk-inventory', 'jjk', 'jjk-culling'];
async function loadMaps(ids) {
  return (await Promise.allSettled(ids.map((id) => import(`./maps/${id}.js`))))
    .map((r, i) => {
      // placeholders for maps still being built stay hidden
      if (r.status === 'fulfilled' && r.value.default?.points) return r.value.default.subtitle === 'Coming soon' ? null : r.value.default;
      console.error(`Map "${ids[i]}" failed to load`, r.reason);
      return null;
    })
    .filter(Boolean);
}
const [movie, jjk] = await Promise.all([loadMaps(MOVIE_IDS), loadMaps(JJK_IDS)]);

export const TRACKS = [city, meadow, pirate, candy, jungle, frost, factory, lava, space, ...movie, ...jjk];
// which movie's abilities (js/abilities/<from>.js) a map favours in its item boxes
export const MAP_FROM = { jurassic: 'jurassic', starwars: 'starwars', marvel: 'marvel', hogwarts: 'potter', ...Object.fromEntries(JJK_IDS.map((id) => [id, 'jjk'])) };

export const CUPS = [
  { id: 'stud', name: 'Stud Cup', color: '#f2cd37', tracks: ['city', 'meadow', 'pirate'] },
  { id: 'brick', name: 'Brick Cup', color: '#c91a09', tracks: ['candy', 'jungle', 'frost'] },
  { id: 'galaxy', name: 'Galaxy Cup', color: '#9a5aff', tracks: ['factory', 'lava', 'space'] },
  { id: 'movie', name: 'Movie Cup', color: '#ff4a3a', tracks: movie.map((t) => t.id) },
  { id: 'jjk', name: 'JJK Run', color: '#8a5cff', tracks: jjk.map((t) => t.id) },
].filter((c) => c.tracks.length);

export function trackById(id) { return TRACKS.find((t) => t.id === id) || TRACKS[0]; }
