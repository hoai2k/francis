// All karts for "Use Characters": the 16 classic karts plus vehicle packs in
// js/vehicles/*.js (see buildVehicle in characters.js for the vehicle contract).
import { CHARACTERS } from './characters.js';

export const KART_GROUPS = [
  { id: 'classic', name: 'Classic Karts', color: '#f2cd37' },
  { id: 'starwars', name: 'Star Wars Rides', color: '#ffe81f' },
  { id: 'heroes', name: 'Marvel & Jurassic Rides', color: '#e23636' },
  { id: 'cursed', name: 'Cursed & Fantasy Rides', color: '#8a5cff' },
  { id: 'wild', name: 'Wild Rides', color: '#3bdc5a' },
];
const PACKS = ['starwars', 'heroes', 'cursed', 'wild'];
// each pack loads on its own so one broken file never stops the game
const loaded = await Promise.allSettled(PACKS.map((id) => import(`./vehicles/${id}.js`)));

for (const ch of CHARACTERS) ch.group = 'classic';
export const KARTS = [...CHARACTERS];
loaded.forEach((r, i) => {
  if (r.status !== 'fulfilled') { console.error(`Vehicles "${PACKS[i]}" failed to load`, r.reason); return; }
  for (const d of r.value.default || []) {
    const colors = d.colors || [0xc91a09, 0x1b2a34];
    KARTS.push({ stats: { speed: 3, accel: 3, handling: 3, weight: 3 }, ...d, group: PACKS[i], vehicle: d.name, kart: colors[0], accent: colors[1] ?? colors[0], colors });
  }
});
