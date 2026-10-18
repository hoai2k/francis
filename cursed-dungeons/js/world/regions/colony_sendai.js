// Region 8 — colony_sendai: Culling Game Sendai Colony, the four-way stalemate.
// Ruined Sendai under an overcast morning and the colony barrier. The Hirose
// River splits the map: west of it, Aoba Castle's ramparts and Date
// Masamune's statue (Yuta Okkotsu's camp) and Osaki Hachimangu (the Window's
// shrine); east of it, the broken city round Sendai Station and the four
// powers that have held each other at bay:
//   Uro Takako's plaza (north-east) — the sky folds over it (sky manipulation)
//   Kurourushi's nest (south-east)  — a gutted department store crawling with roaches (swarm event)
//   Ishigori's craters (south)      — Granite Blast blew the blocks flat
//   Dhruv's trails (north)          — shikigami run along glowing trails; stepping on one burns
// Gates: west to the Cursed Forest, south to Shinjuku. Window stations:
// Aoba Castle, Osaki Hachiman, Sendai Station.
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B, signMesh } from './common.js';
import { PLACEHOLDER_BIOMES } from './placeholders.js';
import { colonyBarrier, setupColony, ruinedTower, rubble, wreck, crater, scorch, debrisField, ruleBoard } from '../cullingGame.js';
import { addChest } from '../regionRuntime.js';

const P0 = PLACEHOLDER_BIOMES.colony_sendai;
export const SENDAI_BIOME = {
  ...P0,
  name: 'Sendai Colony', sub: 'Culling Game · the four-way stalemate',
  look: {
    ...P0.look, timeOfDay: 10.2,
    palette: { skyTop: 0x5a6a80, skyHorizon: 0xb8c0c8, fog: 0x929ca4, sun: 0xe8eef8, hemiSky: 0xb8c4d0, hemiGround: 0x3a3a38 },
    fog: { density: 0.0115, height: 14, heightDensity: 0.035, sun: 0.35 },
    clouds: { coverage: 0.86, tint: 0x9aa2ac, shadows: 0.5, thickness: 7 },
    grade: { tint: [0.97, 1.0, 1.05], sat: 0.86, contrast: 1.1, vignette: 0.3 },
    sun: 0.7, foliage: { density: 0.6 },
  },
  particles: 'none',
};
// what the sky looks like inside Uro Takako's plaza
const URO_SKY = {
  palette: { skyTop: 0x4a2a8a, skyHorizon: 0xe0b0ff, fog: 0x9a7ab8, sun: 0xd8c0ff },
  clouds: { coverage: 0.55, tint: 0xc8a0ff },
  grade: { tint: [1.02, 0.94, 1.12], sat: 1.12, contrast: 1.14, vignette: 0.36 },
};

function* build(ctx) {
  const R = new RegionBuilder(ctx, { size: [320, 64, 320], base: 12 });
  yield 'colony:42';
  const N = R.noise, base = R.base;
  yield 'colony:43';
  const CASTLE = { x: 62, z: 238 }, SHRINE = { x: 62, z: 62 };
  yield 'colony:45';
  // ------------------------------------------------------------ plan
  R.gate('w', 'cursed_forest', { at: 160, road: false });
  yield 'colony:47';
  R.gate('s', 'shinjuku', { at: 160, road: false, y: base });
  yield 'colony:48';
  const ave = { width: 8, block: B.asphalt, alt: B.cracked_brick, altP: 0.08, y: base, line: B.asphalt_line };
  yield 'colony:49';
  const st = { width: 6, block: B.asphalt, alt: B.cracked_brick, altP: 0.1, y: base };
  yield 'colony:50';
  R.road([[0.5, 160.5], [100, 160.5], [140, 160.5], [306, 160.5]], { ...ave, y: 'follow' });    // Jozenji-dori, west to the forest gate
  R.road([[160.5, 30], [160.5, 319]], ave);                                                     // Higashi-Nibancho, south to the gate
  R.road([[230.5, 20], [230.5, 306]], st);
  yield 'colony:53';
  R.road([[140, 90.5], [306, 90.5]], st);
  yield 'colony:54';
  R.road([[140, 240.5], [306, 240.5]], st);
  yield 'colony:55';
  R.road([[20, 90.5], [140, 90.5]], { width: 5, block: B.dirt_path, alt: B.cobble, altP: 0.3, y: 'follow' });            // to the shrine
  R.road([[62.5, 90], [62.5, 74]], { width: 5, block: B.stone_brick, alt: B.cobble, y: 'follow' });
  yield 'colony:57';
  R.road([[140, 240.5], [100, 240], [84, 238.5]], { width: 5, block: B.cobble, alt: B.stone_brick, y: 'follow' });         // to the castle gate
  R.river([[118, 1], [108, 56], [126, 118], [116, 190], [96, 252], [120, 318]], { width: 7, depth: 2 });
  yield 'colony:59';
  R.flat(CASTLE.x - 20, CASTLE.z - 18, CASTLE.x + 20, CASTLE.z + 18, { y: base + 10, block: B.stone_brick, alt: B.cobble, altP: 0.3 });   // the castle plateau
  R.flat(SHRINE.x - 16, SHRINE.z - 14, SHRINE.x + 16, SHRINE.z + 12, { y: 'auto', block: B.shrine_floor, alt: B.stone_brick, altP: 0.25 });
  yield 'colony:61';
  R.flat(244, 120, 292, 156, { y: base, block: B.polished, alt: B.concrete, altP: 0.2 });       // Sendai Station + plaza
  R.flat(240, 26, 304, 82, { y: base, block: B.concrete, alt: B.marble, altP: 0.2 });           // Uro's plaza
  R.station('castle', 'Aoba Castle', CASTLE.x + 10, CASTLE.z + 10, { facing: 'n', y: base + 10 });
  yield 'colony:64';
  R.station('shrine', 'Osaki Hachiman', SHRINE.x + 10, SHRINE.z + 8, { facing: 'w' });
  yield 'colony:65';
  R.station('station', 'Sendai Station', 270, 152, { facing: 'n', y: base });
  yield 'colony:66';
  R.lair('sq_sd_subway', 210, 130, { kind: 'cave', y: base });
  yield 'colony:68';
  // ------------------------------------------------------------ terrain: city flats east of the river, hills west
  const hill = (x, z) => 11 * Math.max(0, 1 - Math.hypot(x - CASTLE.x, z - CASTLE.z) / 46) ** 0.8;
  yield* R.terrainG({ falloff: 10, fn: (x, z) => base + 1.6 * (N.fbm(x * 0.04, z * 0.04, 3) * 0.5 + 0.5) + (x < 110 ? (110 - x) * 0.05 + 3 * (N.fbm(x * 0.02 + 5, z * 0.02, 3) * 0.5 + 0.5) : 0) + hill(x, z) });
  const city = (x, z) => x > 132;
  yield* R.carveG({ top: B.grass, sub: B.dirt, rock: B.stone, rock2: B.mossy_brick, rockSlope: 3, topFn: (x, z) => (city(x, z) ? (R.chance(0.08) ? B.cracked_brick : R.chance(0.1) ? B.dirt : B.concrete) : R.chance(0.12) ? B.dirt : R.chance(0.05) ? B.moss_floor : B.grass) });
  R.paveRoads();
  yield 'colony:74';
  const W = R.world;
  yield 'colony:75';
  colonyBarrier(R, { color: 0x9ae0ff, height: 70 });

  yield 'colony:78';
  // ------------------------------------------------------------ Aoba Castle ruins + Yuta's camp
  {
    const cx = CASTLE.x, cz = CASTLE.z, y = base + 10;
    yield 'colony:b98';
    // ramparts round the plateau (a gap on the east for the road)
    for (let z = cz - 19; z <= cz + 19; z++) for (let x = cx - 21; x <= cx + 21; x++) {
      const edge = x === cx - 21 || x === cx + 21 || z === cz - 19 || z === cz + 19; if (!edge) continue;
      if (x === cx + 21 && Math.abs(z - cz) < 4) continue;
      const hh = 2 + (R.chance(0.25) ? -1 : 0) + ((x + z) % 2), gy = Math.min(y, R.groundY(x, z));
      for (let k = gy; k < y + hh; k++) W.set(x, k, z, k === y + hh - 1 && R.chance(0.3) ? B.mossy_brick : B.stone_brick);
      yield 'loop4';
    }
    // the ruined turret (yagura)
    R.house(cx - 15, cz - 14, 11, 9, { wall: B.plaster, post: B.dark_planks, roof: B.roof, floors: 2, door: 's', y });
    yield 'colony:b107';
    for (let yy = y + 5; yy < y + 11; yy++) for (let x = cx - 15; x < cx - 9; x++) if (R.chance(0.65)) W.setRaw(x, yy, cz - 14 + Math.floor(R.r() * 2), 0);
    yield 'colony:b108';
    // Date Masamune on horseback, crescent helmet and all
    {
      const sx = cx + 2.5, sz = cz - 2.5, P = R.props, br = 0x5a6a52, dk = 0x3a4a38;
      P.box(sx, y, sz, 4.2, 2.4, 3, 0x8a8880, { vary: 0 }); P.box(sx, y + 2.4, sz, 4.6, 0.3, 3.4, 0x6a6862, { vary: 0 });
      P.box(sx, y + 4.0, sz, 3.0, 1.2, 1.1, br);               // horse body
      for (const [dx, dz] of [[-1.1, -0.35], [-1.1, 0.35], [1.1, -0.35], [1.1, 0.35]]) P.box(sx + dx, y + 2.7, sz + dz, 0.28, 1.3, 0.28, dk);
      P.box(sx + 1.8, y + 4.6, sz, 0.6, 1.4, 0.6, br, { rz: -0.5 }); P.box(sx + 2.3, y + 5.5, sz, 1.0, 0.5, 0.5, br);   // neck + head
      P.box(sx - 1.7, y + 4.4, sz, 0.3, 1.2, 0.25, dk, { rz: 0.6 });                                                    // tail
      P.box(sx + 0.1, y + 4.9, sz, 0.8, 1.4, 0.7, br); P.box(sx + 0.1, y + 6.3, sz, 0.55, 0.55, 0.55, br);              // rider
      P.box(sx + 0.15, y + 6.9, sz, 0.12, 0.5, 1.6, 0xd8b040, { rz: 0.1, emit: 0.2 });                                  // the crescent
      W.fill(Math.floor(sx - 2), y, Math.floor(sz - 1), Math.floor(sx + 2), y + 2, Math.floor(sz + 1), B.barrier);
      R.poi('masamune', 'Date Masamune Statue', '🐎', Math.floor(sx), Math.floor(sz), 'landmark');
    }
    // Yuta's camp: a fire, bedrolls, lanterns
    W.set(cx + 8, y - 1, cz + 2, B.lava); W.addLight(cx + 8.5, y + 1, cz + 2.5, 0xff8a3a, 4.5, 10);
    yield 'colony:b123';
    for (const [dx, dz] of [[6, 4], [11, 1]]) R.props.box(cx + dx + 0.5, y, cz + dz + 0.5, 0.9, 0.2, 2.0, 0x5a4a6a);
    yield 'colony:b124';
    for (const [dx, dz] of [[-18, -16], [18, -16], [-18, 16], [18, 16]]) R.lantern(cx + dx + 0.5, cz + dz + 0.5, { y });
    yield 'colony:b125';
    R.poi('castle', 'Aoba Castle Ruins', '🏯', cx, cz, 'landmark');
    yield 'colony:b126';
    R.anchor('castle', cx + 6, cz + 6);
    yield 'colony:b127';
    R.anchor('castle_lookout', cx + 18, cz - 14);
    yield 'colony:b128';
    addChest(R, 'yagura', cx - 10, cz - 10, { rarity: 'rare' });
  }
  yield 'colony:114';
  // ------------------------------------------------------------ Osaki Hachimangu (black lacquer and gold)
  {
    const x = SHRINE.x, z = SHRINE.z, y = R.floor(x, z);
    yield 'colony:b134';
    R.kit.shrine(x - 6, z - 8, x + 6, z + 1, y, { door: 's' });
    yield 'colony:b135';
    for (let xx = x - 7; xx <= x + 7; xx++) { W.set(xx, y + 4, z - 9, B.gold_trim); W.set(xx, y + 4, z + 2, B.gold_trim); }
    R.torii(x + 0.5, y, z + 10.5, 5, 5, { color: 0x1a1414 });
    yield 'colony:b137';
    R.torii(x + 0.5, y, z + 20.5, 5, 5, { color: 0x1a1414 });
    yield 'colony:b138';
    for (const dz of [4, 8, 14]) for (const s of [-1, 1]) R.lantern(x + 0.5 + s * 4, z + dz + 0.5, { y: R.groundY(x + s * 4, z + dz) });
    yield 'colony:b139';
    ruleBoard(R, x - 10, z + 6, { ry: Math.PI / 2 });
    yield 'colony:b140';
    R.poi('osaki', 'Osaki Hachimangu', '⛩', x, z, 'shrine');
    yield 'colony:b141';
    R.anchor('shrine', x, z + 6);
    yield* R.forestG({ kinds: ['cedar', 'cedar', 'oak'], density: 0.5, step: 3, rect: [20, 24, 104, 104] });
  }
  yield 'colony:128';
  // ------------------------------------------------------------ Sendai Station (ruined) and its plaza
  {
    const t = ruinedTower(R, 246, 120, 44, 22, 3, { wall: B.concrete, trim: B.concrete_pillar, win: B.window_dark, door: 's', bites: 3, rubble: false });
    yield 'colony:b148';
    for (let x = 248; x <= 288; x += 4) R.props.box(x + 0.5, base + 4, 143.4, 3.6, 0.3, 2.2, 0x6a7078, { vary: 0.05 });   // the canopy
    R.deco.extra(() => { const m = signMesh(['仙台駅', 'SENDAI STATION'], { w: 7, h: 1.6, color: '#9ae0ff' }); m.position.set(268, base + 9.5, 142.3); return m; });
    yield 'colony:b150';
    for (const [x, z] of [[250, 154], [286, 154]]) R.streetLight(x + 0.5, z + 0.5);
    yield 'colony:b151';
    R.poi('station', 'Sendai Station', '🚉', 268, 150, 'town');
    yield 'colony:b152';
    R.anchor('station_plaza', 262, 152);
    yield 'colony:b153';
    // the subway entrance (a side-quest dungeon)
    { const x = 210, z = 130, y = base; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { if (Math.abs(dx) === 2 || dz === -2) for (let k = 0; k < 3; k++) W.set(x + dx, y + k, z + dz, B.subway_tile); } for (let dx = -1; dx <= 1; dx++) W.set(x + dx, y - 1, z - 1, B.cursed_pool); R.props.box(x + 0.5, y + 3, z + 0.5, 5.2, 0.3, 5.2, 0x2a3a5a); R.poi('subway', 'Subway Entrance', '🚇', x, z, 'lair'); }
    addChest(R, 'station', t.center.x + 12, t.center.z, { rarity: 'common' });
  }
  yield 'colony:141';
  // ------------------------------------------------------------ Uro Takako's plaza: the folded sky
  {
    const P = R.props;
    yield 'colony:b161';
    for (let k = 0; k < 16; k++) {
      const x = 246 + R.r() * 54, z = 30 + R.r() * 48, y = base + 12 + R.r() * 16;
      P.box(x, y, z, 6 + R.r() * 8, 0.25, 4 + R.r() * 6, [0xbcd4ff, 0xd8c8ff, 0xa8c8ff][k % 3], { emit: 1.1, rx: R.rnd(-0.6, 0.6), rz: R.rnd(-0.6, 0.6), ry: R.rnd(0, 3), vary: 0.1 });
      yield 'loop4';
    }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ruinedTower(R, Math.round(272 + Math.cos(a) * 26) - 4, Math.round(54 + Math.sin(a) * 22) - 4, 8, 8, 2 + (k % 3), { bites: 3, bite: 3, rubble: false, door: 's' }); }
    for (let x = 262; x <= 282; x += 4) for (let z = 46; z <= 62; z += 4) if (R.chance(0.6)) W.set(x, base, z, B.marble);
    yield 'colony:b167';
    R.poi('uro_plaza', 'The Folded Sky', '🌀', 272, 54, 'landmark');
    yield 'colony:b168';
    R.anchor('uro_plaza', 272, 54);
    yield 'colony:b169';
    addChest(R, 'uro', 300, 30, { rarity: 'rare', power: 1 });
  }
  yield 'colony:155';
  // ------------------------------------------------------------ Kurourushi's nest: the department store
  {
    const t = ruinedTower(R, 250, 252, 34, 28, 5, { wall: B.red_brick, trim: B.dark_brick, win: B.window_dark, door: 'n', bites: 6, bite: 5 });
    yield 'colony:b175';
    scorch(R, 268, 268, 30, { blocks: [B.dark_brick, B.dirt, B.cracked_brick], ragged: 0.6 });
    yield 'colony:b176';
    for (let k = 0; k < 20; k++) {    // egg sacs
      const x = 244 + R.r() * 52, z = 246 + R.r() * 54, y = R.groundY(Math.floor(x), Math.floor(z)); if (!isFinite(y)) continue;
      R.props.box(x, y, z, 0.9 + R.r() * 0.6, 1.1 + R.r() * 0.6, 0.9, [0x5a3a1a, 0x6a4a22, 0x3a2410][k % 3], { emit: 0.05, ry: R.rnd(0, 3), sway: 0.05 });
    }
    for (let k = 0; k < 7; k++) { const x = 246 + Math.floor(R.r() * 50), z = 248 + Math.floor(R.r() * 50); if (R.freeCell(x, z, 1)) { W.set(x, R.groundY(x, z) - 1, z, B.cursed_pool); R.reserve(x - 1, z - 1, x + 1, z + 1); } }
    for (let k = 0; k < 30; k++) R.deco.add('cobweb', 250 + R.r() * 34, base + 1 + R.r() * 3, 252 + R.r() * 28, { scale: 1.2 });
    yield 'colony:b182';
    R.poi('nest', 'Kurourushi\'s Nest', '🪳', 266, 266, 'lair');
    yield 'colony:b183';
    R.anchor('nest', 266, 248);
    yield 'colony:b184';
    R.anchor('nest_core', t.center.x, t.center.z);
    yield 'colony:b185';
    addChest(R, 'nest', t.center.x + 10, t.center.z + 8, { rarity: 'rare', power: 1, poi: 'Nest Hoard' });
  }
  yield 'colony:171';
  // ------------------------------------------------------------ Ishigori's craters
  {
    const spots = [[176, 196, 9], [200, 214, 7], [168, 224, 6], [214, 190, 6], [190, 186, 5], [150, 206, 5]];
    yield 'colony:b191';
    for (const [x, z, r] of spots) crater(R, x, z, r, { floor: B.cracked_brick, alt: B.obsidian, rim: B.concrete });
    yield 'colony:b192';
    scorch(R, 186, 206, 34, { blocks: [B.cracked_brick, B.dark_brick, B.concrete], ragged: 0.7 });
    yield 'colony:b193';
    for (let k = 0; k < 10; k++) rubble(R, 145 + R.r() * 80, 178 + R.r() * 58, 1.5 + R.r() * 1.5, { h: 2 });
    yield 'colony:b194';
    R.props.box(194.5, base, 228.5, 3, 0.9, 1.2, 0x7a2a2a); R.props.box(194.5, base + 0.9, 228.0, 3, 0.9, 0.3, 0x7a2a2a);   // a battered couch
    W.set(190, base - 1, 230, B.lava); W.addLight(190.5, base + 1, 230.5, 0xff8a3a, 4, 9);
    yield 'colony:b196';
    R.poi('craters', 'Granite Craters', '💥', 186, 206, 'landmark');
    yield 'colony:b197';
    R.anchor('ishigori_arena', 186, 206);
  }
  yield 'colony:183';
  // ------------------------------------------------------------ Dhruv's trails
  const trails = [
    [[140, 32], [172, 50], [204, 40], [220, 66], [196, 110], [150, 122], [140, 104]],
    [[166, 130], [200, 150], [216, 176], [250, 182], [270, 210], [300, 200]],
  ];
  yield 'colony:188';
  const trailCells = [];
  yield 'colony:189';
  for (const path of trails) {
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az));
      for (let s = 0; s <= n; s += 1) {
        const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n, cx = Math.floor(x), cz = Math.floor(z);
        const y = R.groundY(cx, cz); if (!isFinite(y)) continue;
        if (s % 1 === 0) R.props.box(x, y, z, 1.1, 0.06, 1.1, 0x4a8aff, { emit: 2.2, vary: 0.15, ry: Math.atan2(bx - ax, bz - az) });
        trailCells.push(cx + ',' + cz);
      }
    }
    yield 'loop';
  }
  yield 'colony:200';
  R.poi('trails', 'Dhruv\'s Trails', '〰', 196, 92, 'landmark');
  yield 'colony:201';
  R.anchor('trail_tal_0', 204, 42); R.anchor('trail_tal_1', 194, 110); R.anchor('trail_tal_2', 216, 176); R.anchor('trail_tal_3', 270, 208);
  yield 'colony:203';
  // ------------------------------------------------------------ the ruined city east of the river
  const busy = (x0, z0, x1, z1) => {
    const hit = (r) => x1 >= r[0] && x0 <= r[2] && z1 >= r[1] && z0 <= r[3];
    return [[240, 22, 306, 86], [242, 116, 294, 160], [242, 244, 306, 306], [140, 176, 228, 236], [204, 124, 216, 136]].some(hit);
  };
  yield 'colony:208';
  const xs = [138, 160, 230, 306], zs = [24, 90, 160, 240, 306];
  yield 'colony:209';
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const bx0 = xs[i] + 6, bx1 = xs[i + 1] - 6, bz0 = zs[j] + 6, bz1 = zs[j + 1] - 6;
    for (let x = bx0; x + 10 <= bx1; x += 18) for (let z = bz0; z + 10 <= bz1; z += 18) {
      const w = Math.min(bx1 - x, 10 + Math.floor(R.r() * 6)), d = Math.min(bz1 - z, 10 + Math.floor(R.r() * 6));
      if (w < 9 || d < 9 || busy(x - 1, z - 1, x + w + 1, z + d + 1)) continue;
      const roll = R.r();
      if (roll < 0.16) { rubble(R, x + w / 2, z + d / 2, Math.min(w, d) / 2, { h: 3 }); continue; }
      if (roll < 0.22) { wreck(R, x + w / 2, z + d / 2, { fire: R.chance(0.4) }); continue; }
      ruinedTower(R, x, z, w, d, 2 + Math.floor(R.r() * 5), { door: R.chance(0.5) ? 'n' : 's', sign: R.chance(0.3), wall: R.chance(0.3) ? B.red_brick : B.concrete });
    }
    yield 'loop';
  }
  yield 'colony:220';
  for (let k = 0; k < 34; k++) {
    const along = 30 + R.r() * 270, which = Math.floor(R.r() * 3);
    const [x, z] = which === 0 ? [160 + R.rnd(-3, 3), along] : which === 1 ? [140 + R.r() * 166, 160 + R.rnd(-3, 3)] : [230 + R.rnd(-2, 2), along];
    if (z > 300 && Math.abs(x - 160) < 6) continue;
    if (R.chance(0.6)) wreck(R, x, z, { ry: which === 1 ? Math.PI / 2 : 0, fire: R.chance(0.12) }); else rubble(R, x, z, 1.4, { roads: true, lock: false, h: 1.4 });
    yield 'loop';
  }
  yield 'colony:226';
  for (const s of [160, 230]) for (let a = 30; a < 300; a += 26) if (R.chance(0.5)) R.streetLight(s + 4.5, a + 0.5, { light: R.chance(0.4) });
  yield 'colony:227';
  debrisField(R, 136, 20, 310, 310, 200);
  yield 'colony:228';
  // riverside trees and the western woods
  yield* R.forestG({ kinds: ['pine', 'dead', 'oak', 'cedar'], density: (x, z) => (x < 132 ? 0.3 : 0.02), step: 3, rect: [4, 4, 134, 316] });
  yield* R.scatterG({ density: 0.12, types: ['grass', 'grass', 'tall_grass', 'fern', 'flower_blue', 'cursed_weed'] });
  yield 'colony:231';
  addChest(R, 'riverbank', 104, 140, { rarity: 'common', poi: 'Riverbank Cache' });
  yield 'colony:232';
  addChest(R, 'tower_roof', 152, 286, { rarity: 'common' });

  yield 'colony:235';
  // ------------------------------------------------------------ people
  const cy = base + 10;
  yield 'colony:237';
  R.person({ id: 'sd_yuta', name: 'Yuta Okkotsu', look: 'yuta', x: CASTLE.x + 6, z: CASTLE.z + 4, yaw: 2.4, color: '#c8c8ff', pos: new THREE.Vector3(CASTLE.x + 6.5, cy, CASTLE.z + 4.5),
    lines: [['Four players have held Sendai between them for days. Nobody moves, because whoever moves first gets eaten.', 'I\'m here to move first.'], ['Rika is... resting. Don\'t worry about her. Worry about them.']] });
  R.person({ id: 'sd_window', name: 'Window Agent Sato', look: 'npc_nitta', x: SHRINE.x + 5, z: SHRINE.z + 4, yaw: -0.4, color: '#9ae0ff',
    lines: [['The shrine\'s barrier holds the players off. Mostly.', 'Those glowing lines in the city are Dhruv Lakdawalla\'s trails. His shikigami run along them. Don\'t stand on them.']] });
  R.person({ id: 'sd_priest', name: 'Priest Kanno', look: 'npc_civ_5', x: SHRINE.x - 3, z: SHRINE.z + 3, yaw: 0.3, color: '#d8a86a',
    lines: [['Date Masamune\'s shrine has stood four hundred years. It will stand through this, too.'], ['Pray, if you like. It won\'t help with points.']] });
  R.person({ id: 'sd_survivor', name: 'Survivor Aoki', look: 'npc_civ_3', x: 258, z: 154, yaw: 3.0, color: '#c8d8a8',
    lines: [['The department store... I worked there. Now it\'s full of roaches the size of dogs. And HER.', 'Kurourushi. A cursed spirit that eats people and lays eggs in the rubble.']] });
  R.person({ id: 'sd_driver', name: 'Driver Kudo', look: 'npc_civ_1', x: 276, z: 156, yaw: -2.8, color: '#ffd27a',
    lines: [['I drove the Namboku line twenty years. Something moved into the tunnels when the barrier closed.'], ['The entrance by the station breathes. Tunnels shouldn\'t breathe.']] });
  R.person({ id: 'sd_fan', name: 'Granite Fan Goro', look: 'npc_cg_4', x: 200, z: 232, yaw: -2.2, pose: 'wave', color: '#ffa050',
    lines: [['Did you SEE that crater? That was Ryu Ishigori! Granite Blast! The biggest output in the colony!'], ['He just wants a good fight. Like, a REALLY good fight.']] });

  yield 'colony:251';
  // ------------------------------------------------------------ curses, players, safe ground
  R.roamZone(136, 20, 306, 306, { kinds: ['flyhead', 'flyhead', 'swarmer', 'tank', 'grasshopper', 'longneck'], level: 3, dense: true });
  yield 'colony:253';
  R.roamZone(4, 100, 132, 300, { kinds: ['swarmer', 'spitter', 'grasshopper'], level: 3 });
  yield 'colony:254';
  R.safeZone(CASTLE.x - 23, CASTLE.z - 21, CASTLE.x + 23, CASTLE.z + 21);
  yield 'colony:255';
  R.safeZone(SHRINE.x - 18, SHRINE.z - 16, SHRINE.x + 18, SHRINE.z + 24);
  yield 'colony:256';
  R.safeZone(244, 146, 294, 160);
  yield 'colony:257';
  setupColony(R, {
    name: 'Sendai Colony', color: '#9ae0ff',
    intro: ['Sendai Colony! A four-way stalemate! Nobody has scored in DAYS. Ding... ding...', 'Uro Takako holds the north-east, Kurourushi the south-east, Ryu Ishigori the craters, and Dhruv Lakdawalla\'s trails run everywhere.', 'Yuta Okkotsu just arrived at the castle. Things are about to get interesting!'],
    cap: 3,
    playerZones: [
      { x0: 136, z0: 20, x1: 306, z1: 240, roster: ['brawler', 'caster', 'revenant', 'gunner', 'lancer'], level: 3, max: 3 },
      { x0: 236, z0: 20, x1: 306, z1: 90, roster: ['revenant', 'revenant', 'heavy'], level: 3, max: 3, elite: 0.2 },
    ],
    events: [
      { kind: 'sky', rect: { x0: 240, z0: 26, x1: 304, z1: 82 }, look: URO_SKY, enter: 'Uro Takako\'s sky! She folds it like cloth. Look up!' },
      { kind: 'swarm', rect: { x0: 246, z0: 250, x1: 302, z1: 302 }, dur: 28, max: 9, kinds: ['flyhead', 'flyhead', 'swarmer', 'imp'], level: 2, enter: 'Kurourushi\'s nest! The swarm wakes! Survive it!' },
      { kind: 'trail', paths: trails, cells: trailCells, dps: 4, bite: 10, offQuest: 'sq_sd_trails', enter: 'Dhruv\'s shikigami trail! It burns to stand on.' },
      { kind: 'ash', rate: 4, color: [0.5, 0.52, 0.55] },
    ],
  });
  return yield* R.finishG({ spawn: [CASTLE.x + 10, CASTLE.z + 14], biome: SENDAI_BIOME, sunOffset: new THREE.Vector3(-20, 34, 16), backdrop: { c0: 0x2a3440, c1: 0x6a7a88, ground: 0x1a2028 } });
}

registerRegion('colony_sendai', {
  name: 'Sendai Colony', sub: 'Culling Game · Yuta, Uro, Kurourushi, Ishigori', kind: 'colony', grid: [2, 0],
  color: '#4a5a6a', accent: '#9ae0ff', icon: '🧱',
  blurb: 'A four-way stalemate under grey skies: Aoba Castle, the folded sky, the nest and the craters.',
  biome: SENDAI_BIOME, build,
});
