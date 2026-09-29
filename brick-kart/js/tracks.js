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
const MOVIE_IDS = ['jurassic', 'starwars', 'marvel', 'jjk'];
const movie = (await Promise.allSettled(MOVIE_IDS.map((id) => import(`./maps/${id}.js`))))
  .map((r, i) => {
    // placeholders for maps still being built stay hidden
    if (r.status === 'fulfilled' && r.value.default?.points) return r.value.default.subtitle === 'Coming soon' ? null : r.value.default;
    console.error(`Movie map "${MOVIE_IDS[i]}" failed to load`, r.reason);
    return null;
  })
  .filter(Boolean);

export const TRACKS = [city, meadow, pirate, candy, jungle, frost, factory, lava, space, ...movie];

export const CUPS = [
  { id: 'stud', name: 'Stud Cup', color: '#f2cd37', tracks: ['city', 'meadow', 'pirate'] },
  { id: 'brick', name: 'Brick Cup', color: '#c91a09', tracks: ['candy', 'jungle', 'frost'] },
  { id: 'galaxy', name: 'Galaxy Cup', color: '#9a5aff', tracks: ['factory', 'lava', 'space'] },
  { id: 'movie', name: 'Movie Cup', color: '#ff4a3a', tracks: movie.map((t) => t.id) },
  { id: 'all', name: 'All-Star Cup', color: '#36aebf', tracks: TRACKS.map((t) => t.id) },
].filter((c) => c.tracks.length);

export function trackById(id) { return TRACKS.find((t) => t.id === id) || TRACKS[0]; }
