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

export const TRACKS = [city, meadow, pirate, candy, jungle, frost, factory, lava, space];

export const CUPS = [
  { id: 'stud', name: 'Stud Cup', color: '#f2cd37', tracks: ['city', 'meadow', 'pirate'] },
  { id: 'brick', name: 'Brick Cup', color: '#c91a09', tracks: ['candy', 'jungle', 'frost'] },
  { id: 'galaxy', name: 'Galaxy Cup', color: '#9a5aff', tracks: ['factory', 'lava', 'space'] },
  { id: 'all', name: 'All-Star Cup', color: '#36aebf', tracks: TRACKS.map((t) => t.id) },
];

export function trackById(id) { return TRACKS.find((t) => t.id === id) || TRACKS[0]; }
