// Region 3 — okinawa_coast: the Hidden Inventory coast at midday.
//   · Emerald Beach (west): white sand, a turquoise lagoon over coral, palms,
//     parasols and deck chairs, a beach house, a lifeguard tower, a pier, the
//     resort hotel where the Star Plasma Vessel stays. Young Gojo, Geto and Riko
//     are on holiday here (talk to them).
//   · Kaigan Town (centre-east): white houses under red tile roofs with shisa
//     at the doors, a market street with striped stalls, the old banyan.
//   · Churaumi Aquarium (north of town): the great tank with a whale shark.
//   · The northern cliffs: a limestone plateau over the sea, Cape Hedo lookout,
//     and the Sea Cave in the cliff foot (a side-quest dungeon).
//   · Yanbaru jungle (north-east) and the Nakijin Gusuku castle ruins.
//   · Cape Manzamo (south-west): a high headland with the Elephant Trunk rock in
//     the sea, and the Gama Cave in its flank (curses).
//   · The sugar-cane fields and Route 58 south to Naha Airport (runway, terminal,
//     a parked jet) and the gate to Kyoto.
// Gates: east to the Cursed Forest, south to Kyoto. Window stations: Kaigan
// Town, Emerald Beach, Churaumi Aquarium, Naha Airport. Curses roam the cliffs,
// the jungle, the cape, the cave mouths and the cane; the town, the beach, the
// aquarium and the airport are safe. Side quests: quests/kyoto_okinawa.js.
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B, signMesh } from './common.js';
import { BIOMES } from '../biomes.js';
import { grove, groveG, banyan, coral, parasol, deckChair, shisa, stall, bench } from './west_kit.js';
import { addChest } from '../regionRuntime.js';
import './west_looks.js';

const S = 336, BASE = 12, SEA = 9;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (x, z, cx, cz, r, h) => { const d = Math.hypot(x - cx, z - cz) / r; if (d >= 1) return 0; const t = 1 - d; return h * t * t * (3 - 2 * t); };

export const OKINAWA_BIOME = {
  ...BIOMES.jujutsu_high,
  name: 'Okinawa Coast', sub: 'Hidden Inventory · summer 2006',
  skyTop: 0x1e72e0, skyHorizon: 0xc0e8ff, fog: 0xa8d8f0, fogDensity: 0.005,
  hemiSky: 0xd8f0ff, hemiGround: 0x9a8a62, hemiI: 1.15, sun: 0xfff4dc, sunI: 3.0,
  grade: { tint: [0.99, 1.02, 1.04], lift: [0.0, 0.006, 0.01], sat: 1.16, contrast: 1.06, vignette: 0.16 },
  look: {
    timeOfDay: 12.6, sunAzimuth: -20,
    palette: { skyTop: 0x1670f0, skyHorizon: 0xc4ecff, fog: 0xb4e2f6, sun: 0xfff6e4, hemiSky: 0xa8d0f8, hemiGround: 0x8a7a52 },
    fog: { density: 0.0042, sun: 0.6 },
    clouds: { coverage: 0.34, tint: 0xffffff },
    grade: { tint: [0.98, 1.02, 1.05], sat: 1.2, contrast: 1.06, vignette: 0.15 },
    foliage: {
      palette: { grass: 0x58c03a, moss: 0x7ab43a, flowers: [0xff2a4a, 0xff7ad0, 0xffd23a, 0xffffff, 0xff6a2a, 0xc06aff] },
      blocks: {
        [B.sand]: { density: 0.18, kinds: { grass: 3, tall: 2.5, fern: 0, flower: 0.1 }, palette: 'grass' },
        [B.moss_floor]: { density: 4.2, kinds: { grass: 1, tall: 9, fern: 0.4, flower: 0 }, palette: 'moss' },   // sugar cane
      },
      flowerPatches: 0.45,
    },
    wind: 1.3,
  },
  ambience: 'forest', music: 'hub', particles: 'fireflies', wind: 1.3,
};

function* build(ctx) {
  const R = new RegionBuilder(ctx, { size: [S, 64, S], base: BASE });
  yield 'okinaw:59';
  const N = R.noise, W = R.world, P = R.props;
  yield 'okinaw:60';
  const lastFlat = () => R.plan.flats[R.plan.flats.length - 1];

  yield 'okinaw:63';
  // ------------------------------------------------------------ the coastline
  const coastX = (z) => 92 + 16 * Math.sin(z * 0.019 + 0.8) + 7 * Math.sin(z * 0.061) - 52 * sm(236, 292, z);
  yield 'okinaw:65';
  const coastZ = (x) => 26 + 8 * Math.sin(x * 0.03 + 1);
  yield 'okinaw:66';
  const distC = (x, z) => Math.min(x - coastX(z), z - coastZ(x));
  yield 'okinaw:67';
  const plateauN = (x, z) => sm(116, 122, x) * (1 - sm(56, 88, z));
  yield 'okinaw:68';
  const plateauS = (x, z) => sm(256, 266, z) * (1 - sm(140, 152, x));
  yield 'okinaw:69';
  const beachX = (z) => Math.round(coastX(z));

  yield 'okinaw:72';
  // ------------------------------------------------------------ plan
  R.gate('e', 'cursed_forest', { at: 160, road: false });
  yield 'okinaw:74';
  R.gate('s', 'kyoto', { at: 176, road: false });
  yield 'okinaw:75';
  const route = { width: 6, block: B.asphalt, alt: null, line: B.asphalt_line };
  yield 'okinaw:76';
  R.road([[335.5, 160.5], [304, 160.5], [296, 172.5]], { ...route, y: 'follow' });
  yield 'okinaw:77';
  R.road([[298, 172.5], [beachX(172) + 10, 172.5]], { ...route, y: BASE });                                                   // Kaigan main street to the beach
  R.road([[240.5, 174], [240.5, 210], [232, 240], [204, 264], [184, 300], [176.5, 335.5]], { ...route, y: 'follow' });   // Route 58 south
  R.road([[232, 240], [262, 250], [264.5, 257]], { width: 5, block: B.asphalt, y: 'follow' });                    // airport approach
  R.road([[218.5, 172], [218.5, 140]], { width: 5, block: B.cobble, alt: B.stone_brick, y: BASE });
  yield 'okinaw:81';
  R.road([[218.5, 141], [218.5, 119]], { width: 5, block: B.cobble, alt: B.stone_brick, y: 'follow' });           // to the aquarium
  R.road([[252, 104], [262, 80], [240, 58], [200, 52], [150, 46]], { width: 4, block: B.dirt_path, alt: B.sand, altP: 0.3, y: 'follow' });   // up onto the cliffs
  R.road([[204, 196.5], [296, 196.5]], { width: 4, block: B.cobble, alt: B.stone_brick, y: BASE });               // market street
  R.road([[120.5, 172], [120.5, 127]], { width: 4, block: B.sand, alt: B.cobble, y: 'follow' });                  // to the hotel
  R.flat(198, 138, 302, 212, { y: BASE });                                     // Kaigan Town
  R.flat(186, 88, 250, 118, { y: 'auto' }); const AQ = lastFlat();             // the aquarium
  R.flat(108, 108, 130, 126, { y: 'auto' });                                   // the resort hotel
  R.flat(236, 248, 332, 312, { y: 'auto' }); const AP = lastFlat();            // Naha Airport
  R.flat(142, 38, 160, 54, { y: 'auto' });                                     // Cape Hedo lookout
  R.flat(288, 98, 312, 122, { y: 'auto' });                                    // Nakijin Gusuku
  R.station('town', 'Kaigan Town', 276, 186, { y: BASE, facing: 'n' });
  yield 'okinaw:92';
  R.station('beach', 'Emerald Beach', beachX(181) + 17, 181, { facing: 'w' });
  yield 'okinaw:93';
  R.station('aquarium', 'Churaumi Aquarium', 204, 123, { facing: 'n' });
  yield 'okinaw:94';
  R.station('airport', 'Naha Airport', 240, 254, { facing: 'e' });

  yield 'okinaw:97';
  // ------------------------------------------------------------ terrain: lagoon, beach, rolling inland, limestone plateaus
  yield* R.terrainG({
    falloff: 8,
    fn: (x, z) => {
      const d = distC(x, z);
      if (d < 0) return Math.max(2, 8 + d * 0.16 + N.fbm(x * 0.05, z * 0.05, 2) * 1.2);
      let h = 10 + Math.min(d, 16) * 0.14 + sm(16, 40, d) * (1.5 + 5 * (N.fbm(x * 0.018, z * 0.018, 4) * 0.5 + 0.5));
      const cliff = sm(1, 5, d);
      const pn = plateauN(x, z) * cliff, ps = plateauS(x, z) * cliff;
      h += (26 + 3 * N.fbm(x * 0.04, z * 0.04, 2) - h) * pn;
      h += (22 + 3 * N.fbm(x * 0.04 + 7, z * 0.04, 2) - h) * ps;
      return h + bump(x, z, 336, 96, 74, 10);
    },
  });
  yield 'okinaw:111';
  const cane = (x, z) => x >= 148 && x <= 226 && z >= 214 && z <= 262;
  yield* R.carveG({
    top: B.grass, sub: B.dirt, rock: B.stone, rock2: B.marble, rockSlope: 3, sea: SEA, shore: B.sand,
    topFn: (x, z, y) => { const d = distC(x, z); return d < 12 + 3 * N.n2(x * 0.1, z * 0.1) && y <= 13 ? B.sand : cane(x, z) ? B.moss_floor : B.grass; },
  });
  yield 'okinaw:116';
  R.paveRoads();

  yield 'okinaw:119';
  // ------------------------------------------------------------ Emerald Beach
  {
    // the beach house (umi-no-ie)
    const hx = beachX(149) + 12;
    yield 'okinaw:b140';
    R.house(hx, 146, 9, 7, { door: 'w', wall: B.planks, post: B.log, roof: B.dead_leaves, win: B.shoji });
    yield 'okinaw:b141';
    for (const z of [148, 152]) bench(R, hx - 1.6, z + 0.5, { ry: Math.PI / 2 });
    yield 'okinaw:b142';
    P.box(hx - 1.5, R.groundY(hx - 2, 150), 150.5, 0.1, 2.4, 0.1, 0xf0f0f0); P.box(hx - 1.5, R.groundY(hx - 2, 150) + 2.3, 150.5, 3, 0.1, 3, 0xff5a5a);
    yield 'okinaw:b143';
    // parasols, deck chairs, towels along the sand
    for (let z = 124; z <= 236; z += 8) {
      const bx = beachX(z) + 4 + Math.floor(R.r() * 4); if (R.lock[R.i(bx, z)] === 1) continue;
      parasol(R, bx + 0.5, z + 0.5); deckChair(R, bx + 1.6, z + 0.6, { ry: -Math.PI / 2 - 0.3 });
      if (R.chance(0.5)) P.box(bx - 1.2, R.groundY(bx - 1, z + 1), z + 1.5, 0.9, 0.03, 1.8, [0xff5a5a, 0x4ab0ff, 0xffd24a][Math.floor(R.r() * 3)], { ry: 0.3 });
      yield 'loop4';
    }
    // volleyball net and the lifeguard tower
    { const z = 200, x = beachX(z) + 9, y = R.groundY(x, z); P.box(x + 0.5, y, z - 3, 0.12, 2.4, 0.12, 0xf0f0f0); P.box(x + 0.5, y, z + 4, 0.12, 2.4, 0.12, 0xf0f0f0); P.box(x + 0.5, y + 1.6, z + 0.5, 0.04, 0.8, 7, 0xf8f8f8); }
    { const z = 212, x = beachX(z) + 8, y = R.groundY(x, z); for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) P.box(x + 0.5 + a, y, z + 0.5 + b, 0.14, 3, 0.14, 0xf0f0f0); P.box(x + 0.5, y + 3, z + 0.5, 2.2, 0.2, 2.2, 0xd8d0c0); P.box(x + 0.5, y + 3.2, z + 0.5, 1.6, 1, 0.1, 0xff3a3a); P.box(x + 0.5, y + 4.2, z + 0.5, 2.6, 0.1, 2.6, 0xff3a3a); R.anchor('lifeguard', x + 2, z); }
    // the pier into the lagoon
    { const z = 189, x1 = beachX(z) + 2, x0 = x1 - 20; for (let x = x0; x <= x1; x++) for (let dz = 0; dz <= 2; dz++) { W.set(x, SEA, z + dz, B.planks); if ((x - x0) % 4 === 0 && dz !== 1) for (let yy = 2; yy < SEA; yy++) if (W.get(x, yy, z + dz) === B.water) W.set(x, yy, z + dz, B.log); }
      for (let x = x0; x <= x1; x += 2) for (const dz of [-0.4, 3.4]) P.box(x + 0.5, SEA + 1, z + dz, 0.12, 0.9, 0.12, 0x8a6a42);
      R.anchor('pier_end', x0 + 2, z + 1, SEA + 1); addChest(R, 'pier_end', x1 + 4, z + 4, { rarity: 'common', poi: 'Pier Chest' }); R.poi('pier', 'Emerald Pier', '⚓', x0 + 6, z + 1, 'landmark'); }
    R.poi('beach', 'Emerald Beach', '🏖', beachX(170) + 5, 170, 'landmark');
    yield 'okinaw:b157';
    R.anchor('beach', beachX(176) + 8, 176);
    yield 'okinaw:b158';
    R.anchor('beach_house', hx - 3, 155);
    yield 'okinaw:b159';
    // the resort hotel (Riko's)
    R.tower(112, 110, 14, 12, 4, { wall: B.plaster, win: B.window, trim: B.marble, door: 's', floor: B.polished });
    yield 'okinaw:b161';
    R.poi('hotel', 'Resort Hotel', '🏨', 118, 116, 'landmark');
    yield 'okinaw:b162';
    R.anchor('hotel', 119, 125);
    yield 'okinaw:b163';
    for (const [x, z] of [[108, 128], [130, 128], [108, 108]]) banyan(R, x, z, { h: 4, r: 3 });
  }
  yield 'okinaw:148';
  // the lagoon: coral heads over white sand
  for (let q = 0; q < 4; q++) { coral(R, 8, 60, 100, 330, 55); yield 'coral'; }

  yield 'okinaw:152';
  // ------------------------------------------------------------ Kaigan Town
  const houses = [];
  yield 'okinaw:154';
  const okiHouse = (x0, z0, w, d, door) => {
    const hs = R.house(x0, z0, w, d, { door, floors: R.chance(0.25) ? 2 : 1, wall: B.plaster, post: B.marble, roof: B.red_brick, win: R.chance(0.6) ? B.shoji : B.window });
    houses.push(hs);
    const ry = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[door], dx = door === 'n' || door === 's' ? 1.7 : 0, dz = door === 'e' || door === 'w' ? 1.7 : 0;
    shisa(R, hs.door.x - dx, hs.door.z - dz, { ry, y: hs.y }); shisa(R, hs.door.x + dx, hs.door.z + dz, { ry, y: hs.y });
    return hs;
  };
  yield 'okinaw:161';
  const skip = (x) => Math.abs(x + 4 - 240.5) < 8 || Math.abs(x + 4 - 218.5) < 7;
  yield 'okinaw:162';
  for (let x = 200; x + 8 <= 300; x += 11) {
    if (!skip(x)) okiHouse(x, 161, 8 + Math.floor(R.r() * 2), 7, 's');
    if (!skip(x) && !(x > 264 && x < 286)) okiHouse(x, 178, 8 + Math.floor(R.r() * 2), 7, 'n');
    if (!skip(x) && !(x > 242 && x < 260)) okiHouse(x, 201, 8 + Math.floor(R.r() * 2), 7, 'n');
    yield 'loop';
  }
  yield 'okinaw:167';
  for (let z = 142; z + 8 <= 158; z += 10) { okiHouse(204, z, 9, 8, 'e'); okiHouse(226, z, 9, 8, 'w'); okiHouse(260, z, 9, 8, 's'); okiHouse(278, z, 9, 8, 's'); }
  // two shop buildings with signs on the main street (Kokusai-dōri flavour)
  R.tower(286, 185, 10, 8, 2, { wall: B.plaster, win: B.window, trim: B.marble, door: 'n', sign: true });
  yield 'okinaw:170';
  // market stalls along the market street
  for (let x = 206; x <= 236; x += 5) { stall(R, x + 0.5, 193.2, { ry: 0 }); }
  for (let x = 262; x <= 280; x += 6) { stall(R, x + 0.5, 193.2, { ry: 0 }); }
  // the square with the old banyan
  { banyan(R, 249, 189, { h: 5, r: 5 }); for (const [x, z] of [[244, 186], [256, 194]]) bench(R, x + 0.5, z + 0.5, { ry: 0.3 }); R.poi('banyan', 'The Old Banyan', '🌳', 250, 190, 'town'); R.anchor('banyan', 252, 195); }
  // street lights, hibiscus hedges
  for (let x = 204; x <= 296; x += 16) { R.streetLight(x + 0.5, 168.5, { y: BASE }); }
  const hibiscus = (x, z) => { const y = R.groundY(x, z); if (!isFinite(y)) return; P.box(x + 0.5, y, z + 0.5, 1.1, 0.9, 1.1, 0x3a8a32, { sway: 0.15 }); for (let i = 0; i < 4; i++) P.box(x + 0.5 + R.rnd(-0.5, 0.5), y + 0.6 + R.rnd(0, 0.35), z + 0.5 + R.rnd(-0.5, 0.5), 0.26, 0.2, 0.26, R.chance(0.7) ? 0xff2a4a : 0xffd23a, { emit: 0.15 }); };
  yield 'okinaw:178';
  for (let k = 0; k < 90; k++) { const x = 198 + Math.floor(R.r() * 104), z = 138 + Math.floor(R.r() * 74); if (R.freeCell(x, z, 0)) hibiscus(x, z); }
  R.poi('town', 'Kaigan Town', '🏘', 250, 175, 'town');
  yield 'okinaw:180';
  R.poi('market', 'Makishi Market Street', '🐟', 220, 194, 'town');
  yield 'okinaw:181';
  R.anchor('market', 214, 191);

  yield 'okinaw:184';
  // ------------------------------------------------------------ Churaumi Aquarium
  {
    const y = AQ.y;
    yield 'okinaw:b214';
    const t = R.tower(192, 92, 52, 18, 2, { wall: B.marble, win: B.window, trim: B.concrete_pillar, door: 's', floor: B.polished, lightColor: 0x9ad8ff });
    yield 'okinaw:b215';
    // the Kuroshio Sea tank: a deep pool behind a glass rim
    for (let z = 95; z <= 105; z++) for (let x = 198; x <= 238; x++) {
      const rim = x === 198 || x === 238 || z === 95 || z === 105;
      if (rim) { W.set(x, y, z, B.window); W.set(x, y + 1, z, B.window); }
      else { for (let yy = y - 4; yy <= y + 1; yy++) W.set(x, yy, z, B.water); W.set(x, y - 5, z, B.sand); }
      yield 'loop4';
    }
    // the whale shark, mantas and fish (props in the water)
    P.box(218, y - 3, 100, 7, 1.5, 1.8, 0x3a5a7a, { ry: 0.15 }); P.box(214.2, y - 2.8, 99.4, 1.4, 1.2, 1.6, 0x3a5a7a, { ry: 0.15 }); P.box(222, y - 2.6, 100.6, 1.2, 1.8, 0.3, 0x3a5a7a, { ry: 0.15 });
    yield 'okinaw:b223';
    for (let i = 0; i < 10; i++) P.box(215 + R.rnd(0, 6), y - 2.5 + R.rnd(0, 0.9), 99.2 + R.rnd(0, 1.6), 0.2, 0.2, 0.2, 0xf0f0f0);
    yield 'okinaw:b224';
    for (const [x, z] of [[206, 98], [230, 102]]) { P.box(x, y - 2, z, 2.6, 0.2, 1.6, 0x2a3a4a, { ry: R.r() * 3 }); }
    for (let i = 0; i < 30; i++) P.box(200 + R.rnd(0, 36), y - 3.5 + R.rnd(0, 3), 96.5 + R.rnd(0, 8), 0.3, 0.2, 0.12, [0xffd23a, 0x4ad8ff, 0xff8a3a, 0xf0f0f0][i % 4], { emit: 0.3, ry: R.r() * 3 });
    yield 'okinaw:b226';
    for (const [x, z] of [[200, 107], [236, 107], [218, 107]]) W.addLight(x + 0.5, y + 2, z + 0.5, 0x7ad8ff, 3, 10);
    yield 'okinaw:b227';
    R.deco.extra(() => { const m = signMesh(['美ら海水族館', 'CHURAUMI AQUARIUM'], { w: 6, h: 1.4, color: '#7ae0ff', font: 'bold 40px "Pixelify Sans", sans-serif' }); m.position.set(217.5, y + 5.2, 110.2); return m; });
    yield 'okinaw:b228';
    // the outdoor dolphin pool
    R.kit.pond(226, 112, 242, 117, y, B.water, 2, B.marble);
    yield 'okinaw:b230';
    for (const x of [230, 237]) P.box(x + 0.5, y - 1.2, 114.5, 1.6, 0.5, 0.5, 0x6a8aa8, { rz: 0.4 });
    yield 'okinaw:b231';
    for (let z = t.z0 + 2; z < t.z1 - 1; z++) for (let x = t.x0 + 2; x < t.x1 - 1; x++) if ((x - t.x0) % 5 < 2) W.set(x, t.top, z, B.window);   // skylights
    R.poi('aquarium', 'Churaumi Aquarium', '🐋', 218, 100, 'landmark');
    yield 'okinaw:b233';
    R.anchor('aquarium', 214, 113);
    yield 'okinaw:b234';
    R.anchor('aquarium_tank', 218, 108);
  }

  yield 'okinaw:211';
  // ------------------------------------------------------------ the northern cliffs: Cape Hedo and the Sea Cave
  {
    const ly = R.hAt(150, 45);
    yield 'okinaw:b241';
    for (let k = 0; k < 5; k++) W.set(150, ly + k, 44, k === 4 ? B.gold_trim : B.marble);
    yield 'okinaw:b242';
    for (const [x, z] of [[146, 40], [156, 40]]) R.lantern(x + 0.5, z + 0.5, { y: ly });
    yield 'okinaw:b243';
    R.poi('cape_hedo', 'Cape Hedo Lookout', '🗼', 150, 44, 'landmark');
    yield 'okinaw:b244';
    R.anchor('cape_lookout', 152, 48);
    yield 'okinaw:b245';
    addChest(R, 'lookout', 157, 51, { rarity: 'common', poi: 'Lookout Chest' });
    yield 'okinaw:b246';
    // the Sea Cave: a tunnel into the cliff foot from the north beach
    const yb = R.hAt(113, 52);
    yield 'okinaw:b248';
    for (let x = 117; x <= 134; x++) for (let z = 49; z <= 55; z++) {
      const inner = z > 49 && z < 55 && x > 117;
      for (let yy = yb - 1; yy <= yb + 5; yy++) {
        if (yy === yb - 1) W.set(x, yy, z, x > 128 ? B.cursed_pool : B.stone);
        else if (inner && yy <= yb + 3) W.set(x, yy, z, 0);
        else if (!W.get(x, yy, z)) W.set(x, yy, z, R.chance(0.4) ? B.mossy_brick : B.stone);
      }
      yield 'loop4';
    }
    for (let z = 50; z <= 54; z++) for (let yy = yb; yy <= yb + 3; yy++) W.set(117, yy, z, 0);
    yield 'okinaw:b257';
    W.addLight(126.5, yb + 1.5, 52.5, 0x7a5aff, 3.5, 9);
    yield 'okinaw:b258';
    R.lair('sq_oki_cave', 113, 52, { kind: 'cave', y: yb });
    yield 'okinaw:b259';
    R.poi('sea_cave', 'The Sea Cave', '🕳', 120, 52, 'lair');
    yield 'okinaw:b260';
    R.anchor('north_beach', 110, 62);
  }

  yield 'okinaw:237';
  // ------------------------------------------------------------ Yanbaru jungle and Nakijin Gusuku
  {
    const gx = 300, gz = 110, y = R.hAt(gx, gz);
    yield 'okinaw:b267';
    for (let a = 0; a < Math.PI * 2; a += 0.045) {
      if (Math.abs(a - Math.PI / 2) < 0.22) continue;   // the gate (south)
      const r = 10.5 + 1.8 * Math.sin(a * 3), x = Math.round(gx + Math.cos(a) * r), z = Math.round(gz + Math.sin(a) * r);
      const gy = R.groundY(x, z); if (!isFinite(gy) || Math.abs(gy - y) > 3) continue;
      const h = 3 + (R.chance(0.3) ? -1 : 0) + (R.chance(0.2) ? 1 : 0);
      for (let k = 0; k < h; k++) W.set(x, gy + k, z, k === h - 1 ? B.sand : R.chance(0.2) ? B.mossy_brick : B.stone_brick);
      yield 'loop4';
    }
    for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) W.set(gx + sx * 2, y + k, gz + 11, B.stone_brick);
    yield 'okinaw:b275';
    for (let x = gx - 2; x <= gx + 2; x++) W.set(x, y + 5, gz + 11, B.stone_brick);
    yield 'okinaw:b276';
    R.poi('gusuku', 'Nakijin Gusuku Ruins', '🏯', gx, gz, 'ruin');
    yield 'okinaw:b277';
    R.anchor('gusuku', gx, gz + 14);
    yield 'okinaw:b278';
    addChest(R, 'gusuku', gx, gz - 2, { rarity: 'rare' });
    yield 'okinaw:b279';
    R.reserve(gx - 13, gz - 13, gx + 13, gz + 13);
  }

  yield 'okinaw:256';
  // ------------------------------------------------------------ Cape Manzamo, the Elephant Trunk rock, the Gama Cave
  {
    // the rock: two legs from the sea floor and a bridge (the trunk)
    for (let z = 297; z <= 302; z++) {
      for (let x = 14; x <= 30; x++) {
        const leg = x <= 17 || x >= 26;
        let top = leg ? 20 : 0; if (!leg) continue;
        for (let yy = 1; yy <= top; yy++) W.set(x, yy, z, R.chance(0.25) ? B.marble : B.stone);
      }
      for (let x = 14; x <= 30; x++) for (let yy = 16; yy <= 21; yy++) if (!(yy === 21 && (x < 16 || x > 28))) W.set(x, yy, z, R.chance(0.2) ? B.marble : B.stone);
      for (let x = 15; x <= 29; x++) if (R.chance(0.6)) W.set(x, 22, z, B.grass);
      yield 'loop4';
    }
    R.poi('manzamo', 'Cape Manzamo', '🐘', 60, 300, 'landmark');
    yield 'okinaw:b296';
    R.anchor('manzamo', 62, 300);
    yield 'okinaw:b297';
    addChest(R, 'cape_manzamo', 66, 314, { rarity: 'rare' });
    yield 'okinaw:b298';
    // the Gama Cave: a natural cave in the cape's east flank
    const cy = R.hAt(150, 290);
    yield 'okinaw:b300';
    for (let x = 130; x <= 150; x++) for (let z = 287; z <= 293; z++) for (let yy = cy - 1; yy <= cy + 5; yy++) {
      const inner = z > 287 && z < 293;
      if (yy === cy - 1) W.set(x, yy, z, x < 136 ? B.cursed_pool : B.stone);
      else if (inner && yy <= cy + 3) W.set(x, yy, z, 0);
      else if (!W.get(x, yy, z)) W.set(x, yy, z, R.chance(0.35) ? B.mossy_brick : B.stone);
      yield 'loop4';
    }
    W.addLight(134.5, cy + 1.5, 290.5, 0xb05aff, 3.5, 9);
    yield 'okinaw:b307';
    R.reserve(126, 283, 154, 297);
    yield 'okinaw:b308';
    R.poi('gama', 'Gama Cave', '🦇', 148, 290, 'ruin');
    yield 'okinaw:b309';
    R.anchor('gama', 154, 290);
    yield 'okinaw:b310';
    addChest(R, 'gama', 145, 290, { rarity: 'rare' });
  }

  yield 'okinaw:287';
  // ------------------------------------------------------------ the cane fields
  { R.poi('cane', 'Sugar-Cane Fields', '🌾', 188, 238, 'landmark'); R.anchor('cane_field', 186, 240); R.anchor('cane_edge', 224, 226);
    const y = R.hAt(223, 230); P.box(223.5, y, 230.5, 2.4, 1.8, 2.0, 0x8a6a42); P.box(223.5, y + 1.8, 230.5, 3, 0.2, 2.6, 0xd8301c); }

  yield 'okinaw:292';
  // ------------------------------------------------------------ Naha Airport
  {
    const y = AP.y;
    yield 'okinaw:b322';
    for (let z = 296; z <= 306; z++) for (let x = 238; x <= 331; x++) W.setRaw(x, R.hAt(x, z) - 1, z, z === 301 && x % 6 < 3 ? B.asphalt_line : (z === 296 || z === 306) && x % 2 ? B.asphalt_line : B.asphalt);
    yield 'okinaw:b323';
    for (let z = 274; z <= 295; z++) for (let x = 250; x <= 331; x++) W.setRaw(x, R.hAt(x, z) - 1, z, B.concrete);
    yield 'okinaw:b324';
    const term = R.tower(250, 258, 30, 14, 2, { wall: B.concrete, win: B.window, trim: B.concrete_pillar, door: 'n', floor: B.polished });
    yield 'okinaw:b325';
    for (let z = term.z0 + 2; z < term.z1 - 1; z++) for (let x = term.x0 + 2; x < term.x1 - 1; x++) if ((z - term.z0) % 4 < 2) W.set(x, term.top, z, B.window);
    yield 'okinaw:b326';
    for (let k = 0; k < 4; k++) P.box(term.x0 + 4 + k * 7, term.top + 1, term.z0 + 2.5, 2, 1.2, 1.6, 0xc8ccd4);
    yield 'okinaw:b327';
    R.tower(284, 262, 6, 6, 6, { wall: B.concrete, win: B.window, trim: B.concrete_pillar, door: 'w' });
    yield 'okinaw:b328';
    // a parked jet on the apron
    { const px = 304, pz = 285, py = R.hAt(px, pz);
      P.box(px, py + 1.0, pz, 16, 2.2, 2.2, 0xf4f4f4, { vary: 0 }); P.box(px + 8.6, py + 1.2, pz, 1.6, 1.6, 1.8, 0xf4f4f4, { vary: 0 });
      P.box(px + 0.5, py + 1.3, pz, 3, 0.3, 15, 0xe8e8ee, { vary: 0 }); P.box(px - 7, py + 2.6, pz, 2.4, 3.2, 0.3, 0x2a6ad8, { vary: 0 }); P.box(px - 7.2, py + 2.4, pz, 1.4, 0.2, 5, 0xe8e8ee, { vary: 0 });
      P.box(px, py + 1.6, pz + 1.12, 13, 0.3, 0.06, 0x2a6ad8, { vary: 0 }); P.box(px, py + 1.6, pz - 1.12, 13, 0.3, 0.06, 0x2a6ad8, { vary: 0 });
      for (const s of [-1, 1]) P.box(px + 1, py, pz + s * 4, 1.8, 0.9, 0.9, 0xb8bcc4, { vary: 0 });
      for (let x = px - 7; x <= px + 7; x++) for (let z = pz - 1; z <= pz + 1; z++) W.set(Math.floor(x), py, Math.floor(z), B.barrier); }
    R.deco.extra(() => { const m = signMesh(['那覇空港', 'NAHA AIRPORT'], { w: 5, h: 1.3, color: '#ffffff', font: 'bold 40px "Pixelify Sans", sans-serif' }); m.position.set(264.5, y + 6.2, 257.6); return m; });
    yield 'okinaw:b336';
    R.poi('airport', 'Naha Airport', '✈', 264, 264, 'landmark');
    yield 'okinaw:b337';
    R.anchor('airport', 258, 252);
    yield 'okinaw:b338';
    R.anchor('airport_road', 212, 258);
    yield 'okinaw:b339';
    addChest(R, 'airport_hangar', 326, 276, { rarity: 'common', poi: 'Cargo Crate' });
  }

  yield 'okinaw:316';
  // ------------------------------------------------------------ palms, banyans, the jungle
  const town = (x, z) => x >= 196 && x <= 304 && z >= 136 && z <= 214;
  yield 'okinaw:318';
  yield* groveG(R, { rect: [250, 60, 332, 150], step: 4, density: 0.7, where: (x, z) => !(Math.hypot(x - 300, z - 110) < 15) && !town(x, z), pick: () => { const r = R.r(); return r < 0.3 ? 'banyan' : r < 0.6 ? 'palm' : 'oak'; } });
  yield 'okinaw:319';
  yield* groveG(R, { rect: [4, 4, S - 5, S - 5], step: 6, density: (x, z) => { const d = distC(x, z); return d < 12 ? 0 : d < 26 ? 0.55 : town(x, z) ? 0.08 : 0.22; }, where: (x, z) => !cane(x, z) && !(x > 236 && z > 246), pick: (x, z) => (distC(x, z) < 30 || R.chance(0.5) ? 'palm' : R.chance(0.3) ? 'banyan' : 'oak') });
  yield 'okinaw:320';
  yield* R.scatterG({ density: 0.04, types: ['flower_red', 'flower_red', 'grass', 'tall_grass', 'fern', 'flower_blue'] });

  yield 'okinaw:323';
  // ------------------------------------------------------------ people
  const at = (x, z, y) => ({ x, z, ...(y != null ? { pos: V(x + 0.5, y, z + 0.5) } : {}) });
  yield 'okinaw:325';
  R.person({ id: 'oki_kuroi', name: 'Misato Kuroi', look: 'npc_kuroi', ...at(214, 114), yaw: Math.PI, color: '#c8c8d8',
    lines: [['I\'m Kuroi, Lady Riko\'s attendant. Thank you for keeping her safe.', 'She has wanted to see this aquarium since she was little.'], ['In two days she merges with Master Tengen. Until then, let her be a normal girl. Please.']] });
  R.person({ id: 'oki_riko', name: 'Riko Amanai', look: 'npc_riko', ...at(beachX(166) + 5, 166), yaw: -Math.PI / 2, pose: 'wander', wander: 3, color: '#a0b8ff',
    lines: [['I am the Star Plasma Vessel! I am perfectly calm about the sea. PERFECTLY.', '...It\'s so blue. Is it always this blue?'], ['Gojo said a sea cucumber is a vegetable. Geto says that\'s a lie. Who do I believe?!']] });
  R.person({ id: 'oki_gojo', name: 'Satoru Gojo (17)', look: 'gojo', ...at(beachX(177) + 7, 177), yaw: -Math.PI / 2, color: '#9ad8ff',
    lines: [['Yo. We\'re the strongest, so we can afford a beach day. Obviously.'], ['Haven\'t slept in two days. Infinity\'s been on the whole time. Totally fine. Hand me that drink.']] });
  R.person({ id: 'oki_geto', name: 'Suguru Geto (17)', look: 'geto', ...at(beachX(183) + 8, 183), yaw: -Math.PI / 2 + 0.4, color: '#c8a0ff',
    lines: [['Satoru wants to stay until the last flight. I don\'t mind. The kid is having fun.'], ['Sorcerers protect non-sorcerers. That\'s what strength is for... right?']] });
  R.person({ id: 'oki_keeper', name: 'Aquarium Keeper Higa', look: 'npc_islander', ...at(230, 107), yaw: Math.PI, color: '#7ae0ff',
    lines: [['That\'s Jinbei, our whale shark. Eight metres and gentle as a cloud.'], ['Lately the fish hide in the corners. Something swims in there that I can\'t see.']] });
  R.person({ id: 'oki_window', name: 'Window Agent Nakama', look: 'npc_ijichi', ...at(246, 256), yaw: Math.PI / 2, color: '#9ab0d8',
    lines: [['Naha branch of the Window. The 15:00 flight to Haneda is the one Gojo-san booked.', 'Route 58 is the only way from the coast to the airport. Keep it clear.']] });
  R.person({ id: 'oki_fisher', name: 'Fisherman Tokashiki', look: 'npc_civ_3', ...at(110, 64), yaw: 1.2, color: '#8ad06a',
    lines: [['Forty years I\'ve fished under these cliffs. The Sea Cave hums at low tide now.'], ['Nets came back torn. Not by sharks. Sharks don\'t leave handprints.']] });
  R.person({ id: 'oki_farmer', name: 'Cane Farmer Uehara', look: 'npc_civ_1', ...at(226, 228), yaw: -Math.PI / 2, color: '#d8c86a',
    lines: [['Sugar cane, sweetest in the islands. Mind the habu in the rows.'], ['Habu are snakes. Normally. This one is not normal.']] });
  R.person({ id: 'oki_market', name: 'Market Auntie Kina', look: 'npc_civ_4', ...at(221, 191), yaw: Math.PI, color: '#ff9a7a',
    lines: [['Sea grapes! Goya! Beni-imo tarts! You look thin, eat something.'], ['Those two tall boys from Tokyo bought every tart I had. Every single one.']] });
  R.person({ id: 'oki_beachhouse', name: 'Beach House Owner Yonamine', look: 'npc_islander', ...at(beachX(151) + 9, 151), yaw: -Math.PI / 2, color: '#ffd27a',
    lines: [['Shaved ice, cold tea, taco rice! Sit under the parasol, sorcerer.'], ['The silver-haired one ordered blue Hawaii shaved ice six times. Six.']] });
  R.person({ id: 'oki_elder', name: 'Elder Shimabukuro', look: 'npc_civ_5', ...at(252, 192), yaw: Math.PI, color: '#d8a86a',
    lines: [['This banyan is older than the town. The kijimuna live in it — little red-haired tree spirits.', 'Curses are different. Kijimuna play tricks. Curses eat.']] });
  R.person({ id: 'oki_kid', name: 'Kaito', look: 'npc_civ_0', ...at(232, 184), yaw: 0.4, pose: 'wander', wander: 6, color: '#ffa050',
    lines: [['There\'s a castle in the jungle! A real one! With walls that wiggle like a snake!'], ['My big sister says don\'t go in the Gama Cave. So obviously I want to.']] });
  R.person({ id: 'oki_tourist', name: 'Tourist Mia', look: 'npc_tourist', ...at(beachX(196) + 6, 196), yaw: -Math.PI / 2, pose: 'wander', wander: 4, color: '#ffd27a',
    lines: [['I flew in this morning. Is it normal for the sea to be this colour? It looks photoshopped.'], ['Someone told me the rock at Cape Manzamo looks like an elephant. I\'ve been staring for an hour.']] });
  R.person({ id: 'oki_lifeguard', name: 'Lifeguard Arakaki', look: 'npc_civ_2', ...at(beachX(214) + 10, 216), yaw: -Math.PI / 2, color: '#ff6a6a',
    lines: [['Swim between the flags! And stay away from the pier at dusk.'], ['Something keeps stealing the beach balls. I see them floating out past the coral, popped.']] });
  R.person({ id: 'oki_station', name: 'Town Station Master', look: 'npc_civ_3', ...at(272, 190), yaw: 0, color: '#ffd27a',
    lines: [['Kaigan Town Window. Touch the blue shrine: the beach, the aquarium, the airport and every station you\'ve found.']] });

  yield 'okinaw:357';
  // ------------------------------------------------------------ curses
  R.roamZone(118, 4, 332, 58, { kinds: ['flyhead', 'spitter', 'swarmer', 'longneck'], level: 2 });
  yield 'okinaw:359';
  R.roamZone(250, 60, 332, 150, { kinds: ['swarmer', 'grasshopper', 'spitter', 'burrower'], level: 2, dense: true });
  yield 'okinaw:360';
  R.roamZone(8, 256, 160, 332, { kinds: ['blob', 'swarmer', 'spitter', 'shadow'], level: 2 });
  yield 'okinaw:361';
  R.roamZone(140, 212, 232, 292, { kinds: ['burrower', 'swarmer', 'grasshopper'], level: 2 });
  yield 'okinaw:362';
  R.roamZone(96, 30, 132, 100, { kinds: ['blob', 'swarmer', 'flyhead'], level: 2 });
  yield 'okinaw:363';
  R.safeZone(196, 136, 304, 214);
  yield 'okinaw:364';
  R.safeZone(182, 84, 254, 126);
  yield 'okinaw:365';
  R.safeZone(60, 106, 134, 240);
  yield 'okinaw:366';
  R.safeZone(234, 244, 334, 312);

  return yield* R.finishG({
    spawn: [beachX(181) + 17, 187], biome: OKINAWA_BIOME,
    titleCam: { center: V(beachX(176) + 4, BASE + 2, 176), dist: 46, pitch: 26 * Math.PI / 180 },
    backdrop: { c0: 0x2a6a8a, c1: 0xa8e0f0, ground: 0x2a90b8, y: 6.4 },
  });
}

registerRegion('okinawa_coast', {
  name: 'Okinawa Coast', sub: 'Hidden Inventory · beaches, cliffs and the sea', kind: 'wild', grid: [0, 0],
  color: '#2a8ab0', accent: '#7ae0ff', icon: '🏖',
  blurb: 'Midday sun on a turquoise lagoon: the beach, the aquarium, the cliffs and caves of the Hidden Inventory arc.',
  biome: OKINAWA_BIOME, build,
});
