// Roaming curses (the old name): the open world's natural spawning now lives in
// world/spawnDirector.js (packs, nests, world events). Roaming is kept as an
// alias so old imports keep working:
//   new Roaming(game, L)  ===  new SpawnDirector(game, L)   (update(dt) every frame)
export { SpawnDirector as Roaming } from './spawnDirector.js';
