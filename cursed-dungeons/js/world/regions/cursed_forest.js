// Region 2 — cursed_forest: the wild woods north of Jujutsu High.
// Procedural: rolling hills under dense cedar, oak and dead trees, a river
// running north to south (Yasohachi Bridge carries the eastern trail over
// it), a waterfall into a pool, ruined shrines and stone circles, patches
// of cursed ground with cursed pools, and Kitsune Camp in the middle (a
// ranger hut, the Window station, a campfire and the quest givers). Curses
// roam everywhere except the camp. Gates: south to Jujutsu High, west to the
// Okinawa coast, east to the Sendai colony.
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B } from './common.js';
import { BIOMES } from '../biomes.js';

export const FOREST_BIOME = {
  ...BIOMES.cursed_forest,
  name: 'Cursed Forest', sub: 'Where the Curses Nest',
  skyTop: 0x3a5a78, skyHorizon: 0xb8c8a0, fog: 0x7a9478, fogDensity: 0.012,
  hemiSky: 0xc8dcc8, hemiGround: 0x3a3424, hemiI: 1.0, sun: 0xffe2b0, sunI: 2.0,
  grade: { tint: [1.0, 1.03, 0.97], lift: [0.0, 0.008, 0.004], sat: 1.04, contrast: 1.08, vignette: 0.3 },
  ambience: 'forest', music: 'forest', particles: 'spores', wind: 1.2,
};

function* build(ctx) {
  const R = new RegionBuilder(ctx, { size: [320, 64, 320], base: 12 });
  yield 'cursed:24';
  const N = R.noise;
  yield 'cursed:25';
  const CAMP = { x0: 136, z0: 160, x1: 170, z1: 186 };
  yield 'cursed:27';
  // ------------------------------------------------------------ plan
  R.gate('s', 'jujutsu_high', { at: 160, road: false });
  yield 'cursed:29';
  R.gate('w', 'okinawa_coast', { at: 160, road: false });
  yield 'cursed:30';
  R.gate('e', 'colony_sendai', { at: 160, road: false });
  yield 'cursed:31';
  const trail = { width: 5, block: B.dirt_path, alt: B.dirt, altP: 0.3, y: 'follow' };
  yield 'cursed:32';
  R.road([[160.5, 318.5], [170, 280], [166, 236], [158, 200], [153, 186]], trail);
  yield 'cursed:33';
  R.road([[138, 172], [110, 152], [70, 162], [30, 158], [1, 160.5]], trail);
  yield 'cursed:34';
  R.road([[170, 168], [200, 152], [240, 156], [280, 166], [318.5, 160.5]], trail);
  yield 'cursed:35';
  R.road([[153, 160], [146, 120], [120, 80], [96, 40]], { ...trail, width: 4 });     // north to the stone circle
  R.flat(CAMP.x0, CAMP.z0, CAMP.x1, CAMP.z1, { y: 'auto', block: null });
  yield 'cursed:37';
  R.river([[52, 1], [80, 50], [116, 104], [176, 128], [226, 164], [246, 230], [266, 318]], { width: 5, depth: 2 });
  yield 'cursed:38';
  R.station('camp', 'Kitsune Camp', 158, 164, { facing: 's' });
  yield 'cursed:39';
  R.station('falls', 'Shiraito Falls', 70, 238, { facing: 'e' });
  yield 'cursed:40';
  R.lair('m8', 238, 146, {});                       // Yasohachi Bridge, east bank
  R.lair('sq_forest_nest', 252, 62, { kind: 'cave' });   // the Nest (a side-quest dungeon)
  R.flat(56, 246, 86, 270, { y: 'auto' });          // the falls pool basin
  R.flat(88, 30, 104, 46, { y: 'auto' });           // stone circle
  yield 'cursed:45';
  // ------------------------------------------------------------ terrain: hills, a ridge in the north-east
  yield* R.terrainG({
    falloff: 9,
    fn: (x, z) => R.base + 9 * (N.fbm(x * 0.022, z * 0.022, 4) * 0.5 + 0.5) + 14 * Math.max(0, N.ridge(x * 0.01 + 3, z * 0.01, 3) - 0.55) * 3 - 3,
  });
  yield 'cursed:50';
  const cursed = (x, z) => N.fbm(x * 0.03 + 40, z * 0.03, 3) > 0.32;
  yield* R.carveG({ top: B.grass, sub: B.dirt, rock: B.stone, rock2: B.mossy_brick, rockSlope: 3, topFn: (x, z) => (cursed(x, z) ? (R.chance(0.7) ? B.cursed_grass : B.moss_floor) : R.chance(0.08) ? B.moss_floor : B.grass) });
  R.paveRoads();
  yield 'cursed:53';
  const W = R.world;

  yield 'cursed:56';
  // ------------------------------------------------------------ Kitsune Camp
  {
    const y = R.hAt(153, 173);
    yield 'cursed:b74';
    for (let z = CAMP.z0; z <= CAMP.z1; z++) for (let x = CAMP.x0; x <= CAMP.x1; x++) if (!R.roadId[R.i(x, z)] && R.chance(0.3)) W.setRaw(x, R.hAt(x, z) - 1, z, B.dirt);
    yield 'cursed:b75';
    const hut = R.house(140, 174, 8, 7, { door: 'e', wall: B.planks, post: B.log, roof: B.dead_leaves });
    yield 'cursed:b76';
    R.house(161, 176, 7, 6, { door: 'w', wall: B.planks, post: B.log, roof: B.dead_leaves, windows: false });
    yield 'cursed:b77';
    // campfire with logs and a lantern ring
    W.set(153, y - 1, 173, B.lava); W.set(152, y, 173, B.log); W.set(154, y, 173, B.log);
    yield 'cursed:b79';
    W.addLight(153.5, y + 1, 173.5, 0xff8a3a, 4.5, 10);
    yield 'cursed:b80';
    for (const [x, z] of [[137, 162], [169, 162], [137, 185], [169, 185]]) R.lantern(x + 0.5, z + 0.5, { s: 0.9 });
    yield 'cursed:b81';
    R.fence(CAMP.x0, CAMP.z1 + 1, CAMP.x1, CAMP.z1 + 1);
    yield 'cursed:b82';
    R.torii(153.5, y, 187.5, 5, 4.6);
    yield 'cursed:b83';
    R.poi('camp', 'Kitsune Camp', '🏕', 153, 173, 'camp');
    yield 'cursed:b84';
    R.anchor('camp', 153, 176);
    yield 'cursed:b85';
    R.anchor('camp_fire', 155, 171);
    yield 'cursed:b86';
    void hut;
  }
  yield 'cursed:74';
  // ------------------------------------------------------------ Yasohachi Bridge: big red rails over the river
  {
    R.poi('bridge', 'Yasohachi Bridge', '🌉', 228, 158, 'landmark');
    yield 'cursed:b92';
    for (const [x, z] of [[220, 150], [234, 160]]) { const y = R.groundY(x, z); if (isFinite(y)) R.lantern(x + 0.5, z + 0.5, { y }); }
    R.anchor('bridge', 226, 156);
  }
  yield 'cursed:81';
  // ------------------------------------------------------------ Shiraito Falls: a cliff with water down its face into a pool
  {
    const px = 71, pz = 258, y = R.hAt(px, pz);
    yield 'cursed:b99';
    R.kit.pond(px - 5, pz - 2, px + 5, pz + 5, y, B.water, 2, B.mossy_brick);
    yield 'cursed:b100';
    for (let x = px - 7; x <= px + 7; x++) for (let z = pz - 6; z <= pz - 3; z++) for (let yy = y - 1; yy < y + 10 - Math.abs(x - px) * 0.4; yy++) W.set(x, yy, z, R.chance(0.3) ? B.mossy_brick : B.stone);
    yield 'cursed:b101';
    for (let x = px - 1; x <= px + 1; x++) for (let yy = y; yy < y + 9; yy++) W.set(x, yy, pz - 3, B.water);
    yield 'cursed:b102';
    W.addLight(px + 0.5, y + 2, pz + 1, 0x9ad8ff, 2.5, 9);
    yield 'cursed:b103';
    R.poi('falls', 'Shiraito Falls', '💧', px, pz, 'landmark');
    yield 'cursed:b104';
    R.anchor('falls', px + 7, pz + 6);
  }
  yield 'cursed:92';
  // ------------------------------------------------------------ ruins, shrines and the stone circle
  const ruins = [[96, 38, 'circle', 'Stone Circle', '🗿'], [210, 236, 'shrine', 'Fallen Shrine', '⛩'], [62, 110, 'ruin', 'Moss Gate', '🏚'], [270, 96, 'ruin', 'Hollow Shrine', '🏚'], [118, 270, 'ruin', 'Crow Ruins', '🏚']];
  yield 'cursed:94';
  ruins.forEach(([x, z, kind, name, icon], ri) => {
    if (kind === 'circle') {
      const y = R.hAt(x, z);
      for (let a = 0; a < 12; a++) { const xx = Math.round(x + Math.cos(a / 12 * Math.PI * 2) * 6), zz = Math.round(z + Math.sin(a / 12 * Math.PI * 2) * 6); const h = 2 + (a % 3); for (let k = 0; k < h; k++) W.set(xx, y + k, zz, k === h - 1 ? B.mossy_brick : B.stone); }
      W.set(x, y, z, B.cursed_pool); W.addLight(x + 0.5, y + 1, z + 0.5, 0xc070ff, 3, 8);
    } else if (kind === 'shrine') {
      const y = R.groundY(x, z);
      R.kit.shrine(x - 4, z - 3, x + 4, z + 3, y, { door: 's', lanterns: false });
      for (let k = 0; k < 18; k++) { const xx = x - 5 + Math.floor(R.r() * 11), zz = z - 4 + Math.floor(R.r() * 9); const yy = R.groundY(xx, zz); if (isFinite(yy) && R.chance(0.6)) W.set(xx, yy - 1, zz, B.cracked_brick); }
      R.reserve(x - 6, z - 5, x + 6, z + 5);
    } else R.ruin(x, z, 6);
    R.poi(kind + x, name, icon, x, z, 'ruin');
    R.anchor('ruin_' + ri, x + 2, z + 2);
  });
  yield 'cursed:108';
  // cursed pools in the cursed patches
  for (let k = 0; k < 28; k++) {
    const x = 10 + Math.floor(R.r() * 300), z = 10 + Math.floor(R.r() * 300);
    if (!cursed(x, z) || !R.freeCell(x, z, 2)) continue;
    const y = R.groundY(x, z);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (R.chance(0.8)) W.set(x + dx, y - 1, z + dz, B.cursed_pool);
    R.reserve(x - 2, z - 2, x + 2, z + 2);
    yield 'loop';
  }
  yield 'cursed:116';
  // the Nest: a dark cave mouth in the north-east ridge
  {
    const x = 252, z = 62, y = R.hAt(x, z);
    yield 'cursed:b138';
    for (let dx = -4; dx <= 4; dx++) for (let yy = y; yy < y + 6; yy++) for (let dz = -6; dz <= -2; dz++) if (Math.abs(dx) > 1 || yy > y + 3 || dz < -5) W.set(x + dx, yy, z + dz, R.chance(0.3) ? B.mossy_brick : B.stone);
    yield 'cursed:b139';
    for (let dx = -1; dx <= 1; dx++) for (let yy = y; yy < y + 4; yy++) for (let dz = -5; dz <= -2; dz++) W.set(x + dx, yy, z + dz, 0);
    yield 'cursed:b140';
    for (let dx = -1; dx <= 1; dx++) W.set(x + dx, y - 1, z - 5, B.cursed_pool);
    yield 'cursed:b141';
    W.addLight(x + 0.5, y + 1, z - 4, 0xc070ff, 3, 8);
    yield 'cursed:b142';
    R.poi('nest', 'The Nest', '🕳', x, z, 'lair');
  }
  yield 'cursed:126';
  // ------------------------------------------------------------ the woods
  yield* R.forestG({ kinds: ['cedar', 'cedar', 'oak', 'oak', 'dead'], density: (x, z) => (cursed(x, z) ? 0.5 : 0.62), step: 3 });
  yield* R.forestG({ kinds: ['dead', 'dead', 'oak'], density: 0.3, step: 4, where: (x, z) => cursed(x, z) });
  yield* R.scatterG({ density: 0.14, types: ['grass', 'tall_grass', 'fern', 'fern', 'grass', 'flower_blue', 'cursed_weed'] });
  yield 'cursed:131';
  // ------------------------------------------------------------ campers
  R.person({ id: 'forest_ranger', name: 'Ranger Sato', look: 'npc_civ_3', x: 146, z: 182, yaw: 0.8, color: '#8ad06a',
    lines: [['These woods were cursed long before the school was built. We just keep the trails open.', 'If you hear crows going quiet, run.']] });
  R.person({ id: 'forest_window', name: 'Window Agent Mika', look: 'npc_nitta', x: 160, z: 170, yaw: -0.4, color: '#7ab8ff',
    lines: [['I\'m a Window: I can see curses, but I can\'t fight them. So I count them.', 'There are a lot of them. Please make the number smaller.']] });
  R.person({ id: 'forest_hiker', name: 'Lost Hiker', look: 'npc_civ_1', x: 148, z: 166, yaw: 2.2, pose: 'idle', color: '#ffd27a',
    lines: [['I followed a fox off the trail and ended up here. Is it always this... humid?'], ['The station back there takes you home in a blink. I\'m never walking again.']] });
  yield 'cursed:139';
  // ------------------------------------------------------------ curses
  R.roamZone(4, 4, 316, 316, { kinds: ['swarmer', 'swarmer', 'spitter', 'flyhead', 'flyhead', 'grasshopper', 'burrower', 'transfigured'], level: 2, dense: true });
  yield 'cursed:141';
  R.safeZone(CAMP.x0 - 4, CAMP.z0 - 4, CAMP.x1 + 4, CAMP.z1 + 6);
  return yield* R.finishG({ spawn: [153, 182], biome: FOREST_BIOME, sunOffset: new THREE.Vector3(-26, 30, 12), backdrop: { c0: 0x24342a, c1: 0x6a7a6a, ground: 0x142018 } });
}

registerRegion('cursed_forest', {
  name: 'Cursed Forest', sub: 'Wild woods · rivers, ruins and nests', kind: 'wild', grid: [1, 0],
  color: '#2e5a32', accent: '#8aff7a', icon: '🌲',
  blurb: 'Dense woods north of the school. Curses roam free here.',
  biome: FOREST_BIOME, build,
});
