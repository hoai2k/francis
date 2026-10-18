// Region 4 — kyoto: the old capital in autumn, at golden hour.
//   · Kyoto Jujutsu High (north-west): a walled temple campus — the main hall,
//     a three-storey pagoda, the raked-gravel courtyard, dormitories, the dojo,
//     a pond garden and the training ground. Principal Gakuganji, Todo, Mai,
//     Miwa, Mechamaru, Noritoshi Kamo and Momo live here (talk to them).
//   · Gion and Shijo-dori (centre): machiya rows, Hanamikoji with paper
//     lanterns, a tea house, maiko and tourists; Kyoto Station (Window).
//   · Higashiyama (east): the Yasaka five-storey pagoda, Sannenzaka climbing to
//     Kiyomizu-dera — the main hall and its wooden stage on a lattice of
//     pillars over the ravine, the Niomon and a red three-storey pagoda.
//   · Fushimi Inari (south-east): the vermilion shrine, fox guardians and a
//     tunnel of torii winding up Mt Inari to the summit shrine.
//   · Arashiyama (south): the Togetsukyo bridge over the Katsura and the bamboo
//     grove path (to the Sakurajima gate), Nonomiya's black torii.
//   · The Goodwill Event grounds (west): Kyoto High's maple and cedar forest,
//     the curtain of chapter "Curse Hunt" (lair_m4), an old archery range.
//   · Rashomon (north): the ruined gate in the hills.
// Gates: east to Jujutsu High, north to the Okinawa coast, south to Sakurajima.
// Window stations: Kyoto Station, Kyoto Jujutsu High, Kiyomizu-dera, Fushimi
// Inari, Arashiyama. Curses roam the forest, the bamboo, Mt Inari and the
// northern hills; the campus, Gion, the Kiyomizu terrace and the Inari shrine
// are safe. Side quests: quests/kyoto_okinawa.js.
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B, signMesh } from './common.js';
import { BIOMES } from '../biomes.js';
import { maple, grove, groveG, hall, hipRoof, pagoda, toriiPath, fox, paperLanterns, bench, bambooClump, MAPLE_COLS } from './west_kit.js';
import { addChest, onRegionLoad } from '../regionRuntime.js';
import './west_looks.js';

const S = 336, BASE = 12, CAMPUS_Y = 14;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const KYOTO_BIOME = {
  ...BIOMES.jujutsu_high,
  name: 'Kyoto', sub: 'The old capital · autumn',
  skyTop: 0x3a62b8, skyHorizon: 0xffc890, fog: 0xe0b08a, fogDensity: 0.006,
  hemiSky: 0xf0d8c0, hemiGround: 0x6a4428, hemiI: 1.05, sun: 0xffc88a, sunI: 2.6,
  grade: { tint: [1.06, 1.0, 0.92], lift: [0.012, 0.006, 0.0], sat: 1.18, contrast: 1.07, vignette: 0.22 },
  look: {
    timeOfDay: 17.1, sunAzimuth: 18,
    palette: { skyTop: 0x2f6ad8, skyHorizon: 0xffd2a0, fog: 0xe6c0a0, sun: 0xffd8a8, hemiGround: 0x7a5236 },
    fog: { density: 0.0052, sun: 0.95, height: 13, heightDensity: 0.012 },
    clouds: { coverage: 0.38, tint: 0xffe6cc },
    grade: { tint: [1.05, 1.0, 0.93], sat: 1.2, contrast: 1.08, vignette: 0.2, warmth: 0.1 },
    foliage: {
      palette: { grass: 0x8eaa3c, moss: 0x7a8a34, flowers: [0xd8261a, 0xf0702a, 0xf2c23a, 0xc8201a, 0xfff0d8, 0xe84a8a] },
      flowerPatches: 0.5,
    },
    wind: 0.9,
  },
  ambience: 'forest', music: 'shrine', particles: 'fireflies', wind: 0.9,
};

const bump = (x, z, cx, cz, r, h) => { const d = Math.hypot(x - cx, z - cz) / r; if (d >= 1) return 0; const t = 1 - d; return h * t * t * (3 - 2 * t); };

function* build(ctx) {
  const R = new RegionBuilder(ctx, { size: [S, 64, S], base: BASE });
  yield 'kyoto.:58';
  const N = R.noise, W = R.world, P = R.props;
  yield 'kyoto.:59';
  const lastFlat = () => R.plan.flats[R.plan.flats.length - 1];

  yield 'kyoto.:62';
  // ------------------------------------------------------------ plan
  R.gate('e', 'jujutsu_high', { at: 168, road: false });
  yield 'kyoto.:64';
  R.gate('n', 'okinawa_coast', { at: 120, road: false });
  yield 'kyoto.:65';
  R.gate('s', 'colony_sakurajima', { at: 176, road: false });
  yield 'kyoto.:66';
  R.road([[335.5, 168.5], [96, 168.5]], { width: 7, block: B.stone_brick, alt: B.cobble, altP: 0.25, y: BASE });          // Shijo-dori
  R.road([[120.5, 168], [120.5, 124], [120.5, 0]], { width: 6, block: B.cobble, alt: B.stone_brick, y: 'follow' });       // Karasuma north: the school, Rashomon, Okinawa
  R.road([[121, 80.5], [111, 80.5]], { width: 5, block: B.stone_brick, y: CAMPUS_Y });                                     // to the school gate
  R.road([[220.5, 168], [220.5, 118]], { width: 5, block: B.stone_brick, alt: B.cobble, altP: 0.3, y: BASE });            // Hanamikoji
  R.road([[220.5, 121], [246, 127.5], [272, 118], [288, 101]], { width: 4, block: B.cobble, alt: B.stone_brick, altP: 0.3, y: 'follow' });   // Sannenzaka
  R.road([[176.5, 168], [176.5, 335.5]], { width: 5, block: B.dirt_path, alt: B.cobble, altP: 0.2, y: 'follow' });       // the Arashiyama path south
  R.road([[244, 168], [246, 196], [249, 220.5]], { width: 5, block: B.cobble, alt: B.stone_brick, y: 'follow' });         // to Fushimi Inari
  const INARI_PATH = [[264.5, 233], [270, 248], [266, 262], [280, 274], [294, 268], [304, 282], [299, 292]];
  yield 'kyoto.:74';
  R.road(INARI_PATH, { width: 3, block: B.dirt_path, alt: B.cobble, altP: 0.25, y: 'follow' });
  yield 'kyoto.:75';
  R.road([[97, 168.5], [82, 196], [66, 226], [60, 236]], { width: 4, block: B.dirt_path, alt: B.dirt, altP: 0.3, y: 'follow' });   // the Goodwill trail
  R.road([[120.5, 60], [150, 50], [176, 46]], { width: 4, block: B.dirt_path, y: 'follow' });                              // to Rashomon
  R.river([[146, 0], [140, 80], [136, 140], [138, 200], [156, 236], [192, 254], [214, 292], [224, 335]], { width: 6, depth: 2 });

  R.flat(146, 140, 332, 202, { y: BASE });                 // Gion / Shijo
  R.flat(200, 104, 244, 140, { y: BASE });                 // Hanamikoji
  R.flat(232, 130, 254, 156, { y: BASE });                 // the Yasaka pagoda
  R.flat(34, 34, 114, 126, { y: CAMPUS_Y });               // Kyoto Jujutsu High
  R.flat(272, 64, 312, 100, { y: 'auto' }); const KIYO = lastFlat();   // the Kiyomizu terrace
  R.flat(248, 206, 282, 234, { y: 'auto' }); const INARI = lastFlat(); // the Inari shrine
  R.flat(290, 290, 308, 306, { y: 'auto' }); const SUMMIT = lastFlat();
  yield 'kyoto.:86';
  R.flat(44, 228, 72, 252, { y: 'auto' });                 // the Goodwill clearing
  R.flat(144, 304, 158, 318, { y: 'auto' });               // the heart of the bamboo grove
  R.flat(168, 34, 186, 52, { y: 'auto' });                 // Rashomon
  R.flat(150, 284, 168, 300, { y: 'auto' });               // Nonomiya shrine
  R.flat(22, 292, 40, 310, { y: 'auto' });                 // the old archery range
  R.station('station', 'Kyoto Station', 196, 182, { y: BASE, facing: 'n' });
  yield 'kyoto.:92';
  R.station('school', 'Kyoto Jujutsu High', 100, 70, { y: CAMPUS_Y, facing: 'e' });
  yield 'kyoto.:93';
  R.station('kiyomizu', 'Kiyomizu-dera', 282, 108, { facing: 'n' });
  yield 'kyoto.:94';
  R.station('inari', 'Fushimi Inari', 253, 228, { facing: 'e' });
  yield 'kyoto.:95';
  R.station('arashiyama', 'Arashiyama', 185, 272, { facing: 'w' });
  yield 'kyoto.:96';
  R.lair('m4', 58, 242, {});                               // chapter "Curse Hunt": the curtain over the Goodwill forest

  yield 'kyoto.:99';
  // ------------------------------------------------------------ terrain: a basin ringed by hills
  yield* R.terrainG({
    falloff: 10,
    fn: (x, z) => BASE + 3 * (N.fbm(x * 0.02, z * 0.02, 4) * 0.5 + 0.5) - 1
      + bump(x, z, 304, 82, 86, 22) + bump(x, z, 306, 300, 72, 16) + bump(x, z, -10, 240, 90, 16) + bump(x, z, 150, -30, 100, 14)
      + 4 * Math.max(0, N.ridge(x * 0.025, z * 0.025, 3) - 0.5) * (bump(x, z, 304, 82, 120, 1) + bump(x, z, -10, 240, 120, 1) + bump(x, z, 150, -30, 120, 1)),
  });
  yield 'kyoto.:106';
  // the ravine under the Kiyomizu stage keeps its natural depth
  for (let z = 64; z <= 100; z++) for (let x = 246; x <= 271; x++) { const i = R.i(x, z); if (!R.roadId[i]) R.H[i] = Math.min(R.H[i], R.Hn[i]); }
  yield* R.carveG({ top: B.grass, sub: B.dirt, rock: B.stone, rock2: B.mossy_brick, rockSlope: 3, topFn: (x, z, y) => (y > BASE + 10 && R.chance(0.12) ? B.moss_floor : B.grass) });
  R.paveRoads();
  yield 'kyoto.:110';
  const KY = KIYO.y, IY = INARI.y;

  yield 'kyoto.:113';
  // ------------------------------------------------------------ Kyoto Jujutsu High
  {
    const y = CAMPUS_Y;
    yield 'kyoto.:b131';
    // outer wall: plaster under a tile cap, gate gap on the east
    const wall = (x, z) => { if (z >= 76 && z <= 84 && x >= 111) return; for (let k = 0; k < 3; k++) W.set(x, y + k, z, k === 0 ? B.stone_brick : B.plaster); W.set(x, y + 3, z, B.roof); };
    yield 'kyoto.:b133';
    for (let x = 36; x <= 112; x++) { wall(x, 36); wall(x, 124); }
    for (let z = 36; z <= 124; z++) { wall(36, z); wall(112, z); }
    // the gate house (karamon): lacquered posts, a hipped roof, a sign
    for (const [px, pz] of [[110, 75], [110, 85], [114, 75], [114, 85]]) for (let k = 0; k < 6; k++) W.set(px, y + k, pz, B.pillar_red);
    yield 'kyoto.:b137';
    for (let x = 109; x <= 115; x++) for (const z of [75, 85]) W.set(x, y + 5, z, B.dark_planks);
    yield 'kyoto.:b138';
    hipRoof(R, 107, 73, 117, 87, y + 6, { block: B.roof, ridge: B.gold_trim });
    yield 'kyoto.:b139';
    R.deco.extra(() => { const m = signMesh(['京都府立呪術高専', 'KYOTO JUJUTSU HIGH'], { w: 5, h: 1.4, color: '#ffd8a0', font: 'bold 40px "Pixelify Sans", sans-serif' }); m.position.set(117.6, y + 4.6, 80.5); m.rotation.y = Math.PI / 2; return m; });
    yield 'kyoto.:b140';
    // main hall (hondō)
    hall(R, 52, 42, 26, 14, { y, h: 6, door: 's', post: B.pillar_red, wall: B.shoji, floor: B.tatami, eave: 3 });
    yield 'kyoto.:b142';
    // raked gravel courtyard with stepping stones and stone lanterns
    for (let z = 62; z <= 92; z++) for (let x = 49; x <= 86; x++) if (!R.roadId[R.i(x, z)]) W.setRaw(x, y - 1, z, (z % 2 === 0) ? B.sand : B.marble);
    yield 'kyoto.:b144';
    for (let z = 60; z <= 92; z += 2) W.setRaw(65, y - 1, z, B.stone_brick);
    yield 'kyoto.:b145';
    for (const [x, z] of [[48, 64], [84, 64], [48, 90], [84, 90]]) R.lantern(x + 0.5, z + 0.5, { y });
    yield 'kyoto.:b146';
    for (const [x, z] of [[50, 70], [82, 86]]) maple(R, x, z, { y, h: 4, s: 1.15 });
    yield 'kyoto.:b147';
    // three-storey pagoda in the north-east corner
    pagoda(R, 96, 50, { y: y - 1, tiers: 3, half: 3 });
    yield 'kyoto.:b149';
    // dormitories (west) and the dojo (south)
    R.house(39, 64, 9, 8, { door: 'e', floors: 2, wall: B.plaster, post: B.dark_planks, win: B.shoji, y });
    yield 'kyoto.:b151';
    R.house(39, 78, 9, 8, { door: 'e', floors: 2, wall: B.plaster, post: B.dark_planks, win: B.shoji, y });
    yield 'kyoto.:b152';
    hall(R, 64, 101, 18, 11, { y, h: 5, door: 'n', post: B.dark_planks, wall: B.planks, floor: B.floor_boards, roof: B.roof, ridge: B.dark_planks, eave: 2 });
    yield 'kyoto.:b153';
    // pond garden (south-west) with a red bridge
    R.kit.pond(42, 102, 58, 118, y, B.water, 2, B.mossy_brick);
    yield 'kyoto.:b155';
    for (let x = 41; x <= 59; x++) { W.set(x, y - 1, 110, B.red_lacquer); }
    P.box(41.5, y, 109.4, 0.14, 0.9, 0.14, 0xd0391e); P.box(59.5, y, 109.4, 0.14, 0.9, 0.14, 0xd0391e);
    yield 'kyoto.:b157';
    P.box(50.5, y + 0.8, 109.4, 18.2, 0.1, 0.1, 0xd0391e); P.box(50.5, y + 0.8, 111.6, 18.2, 0.1, 0.1, 0xd0391e);
    yield 'kyoto.:b158';
    for (const [x, z] of [[44, 100], [60, 120], [40, 120]]) maple(R, x, z, { y });
    yield 'kyoto.:b159';
    // training ground: packed dirt, practice posts, a weapons rack
    for (let z = 92; z <= 120; z++) for (let x = 88; x <= 108; x++) W.setRaw(x, y - 1, z, R.chance(0.25) ? B.dirt_path : B.dirt);
    yield 'kyoto.:b161';
    for (const [x, z] of [[92, 96], [104, 96], [92, 116], [104, 116]]) { P.box(x + 0.5, y, z + 0.5, 0.3, 1.6, 0.3, 0xc8a870); P.box(x + 0.5, y + 1.1, z + 0.5, 0.9, 0.12, 0.12, 0xc8a870); }
    P.box(98.5, y, 121.4, 4, 1.6, 0.3, 0x5a3a20);
    yield 'kyoto.:b163';
    // trees along the walls inside
    for (const [x, z] of [[40, 40], [45, 59], [84, 40], [86, 60], [40, 96], [108, 40], [108, 66], [62, 120], [86, 120]]) maple(R, x, z, { y, h: 3 });
    yield 'kyoto.:b165';
    R.poi('kyoto_high', 'Kyoto Jujutsu High', '⛩', 70, 80, 'school');
    yield 'kyoto.:b166';
    R.anchor('kyoto_high', 66, 66);
    yield 'kyoto.:b167';
    R.anchor('training_ground', 98, 106);
    yield 'kyoto.:b168';
    R.anchor('giver_m4', 100, 102);
    yield 'kyoto.:b169';
    addChest(R, 'campus_pond', 46, 121, { rarity: 'common', poi: 'Pond Garden Chest' });
  }

  yield 'kyoto.:158';
  // ------------------------------------------------------------ Gion and Shijo-dori: machiya rows
  const machiya = (x0, z0, w, d, door) => R.house(x0, z0, w, d, { door, floors: R.chance(0.45) ? 2 : 1, wall: R.chance(0.6) ? B.planks : B.plaster, post: B.dark_planks, win: R.chance(0.5) ? B.lantern : B.shoji, roof: B.roof });
  yield 'kyoto.:160';
  const skipShijo = (x) => Math.abs(x + 4 - 176.5) < 8 || Math.abs(x + 4 - 220.5) < 8 || Math.abs(x + 4 - 245) < 9;
  yield 'kyoto.:161';
  for (let x = 150; x + 8 <= 330; x += 11) {
    if (!skipShijo(x)) machiya(x, 156, 8 + Math.floor(R.r() * 2), 7, 's');
    if (!skipShijo(x) && !(x > 184 && x < 208)) machiya(x, 175, 8 + Math.floor(R.r() * 2), 7, 'n');
    yield 'loop';
  }
  yield 'kyoto.:165';
  for (let z = 122; z + 6 <= 152; z += 9) { machiya(209, z, 8, 7, 'e'); if (z < 128 || z > 150) machiya(225, z, 8, 7, 'w'); }
  // stone lanterns down Shijo, paper lanterns over Hanamikoji
  for (let x = 152; x <= 330; x += 14) for (const z of [164, 172]) if (!R.roadId[R.i(x, z)] && !R.roadId[R.i(x + 1, z)] && !R.roadId[R.i(x - 1, z)]) R.lantern(x + 0.5, z + 0.5, { s: 0.9 });
  yield 'kyoto.:168';
  for (let z = 126; z <= 160; z += 8) paperLanterns(R, 217.2, z + 0.5, 223.8, z + 0.5, BASE + 3.6, 5);
  yield 'kyoto.:169';
  for (let x = 150; x <= 330; x += 22) paperLanterns(R, x + 0.5, 164.6, x + 0.5, 172.4, BASE + 4.4, 4, { colors: [0xffe2a0, 0xff6a3a] });
  yield 'kyoto.:170';
  // the tea house: red benches and parasols under the willow
  {
    const y = BASE;
    yield 'kyoto.:b195';
    for (const z of [134, 142]) bench(R, 217.4, z + 0.5, { y, ry: Math.PI / 2, red: true });
    yield 'kyoto.:b196';
    P.box(217.4, y, 138.5, 0.1, 2.4, 0.1, 0x5a3a20); P.box(217.4, y + 2.3, 138.5, 2.6, 0.1, 2.6, 0xd8301c, { ry: 0.3 });
    yield 'kyoto.:b197';
    R.poi('gion', 'Gion · Hanamikoji', '🏮', 220, 140, 'town');
    yield 'kyoto.:b198';
    R.anchor('gion_teahouse', 218, 140);
  }
  yield 'kyoto.:178';
  // Kyoto Station square
  {
    const y = BASE;
    yield 'kyoto.:b204';
    for (let x = 186; x <= 206; x++) for (let z = 177; z <= 190; z++) if (!R.roadId[R.i(x, z)] && !(Math.abs(x - 196) <= 3 && Math.abs(z - 182) <= 3)) W.setRaw(x, y - 1, z, (x + z) % 3 ? B.polished : B.stone_brick);
    yield 'kyoto.:b205';
    for (const x of [187, 205]) R.streetLight(x + 0.5, 177.5, { y });
    yield 'kyoto.:b206';
    R.poi('kyoto_station', 'Kyoto Station', '🚉', 196, 182, 'station');
    yield 'kyoto.:b207';
    addChest(R, 'gion_alley', 236, 188, { rarity: 'common', poi: 'Alley Chest' });
  }
  yield 'kyoto.:186';
  // a few maples and ginkgo-golds through town
  for (const [x, z] of [[160, 150], [186, 152], [262, 150], [300, 150], [318, 186], [276, 190], [160, 192], [232, 196], [206, 112], [238, 110]]) if (R.freeCell(x, z, 1)) maple(R, x, z, { palette: z % 2 ? [0xf2c040, 0xe8b030, 0xf8d050] : MAPLE_COLS });

  yield 'kyoto.:190';
  // ------------------------------------------------------------ the Yasaka pagoda (Hōkan-ji)
  {
    pagoda(R, 242, 143, { y: BASE, tiers: 5, half: 4 });
    yield 'kyoto.:b217';
    R.poi('pagoda', 'Yasaka Pagoda', '🛕', 242, 143, 'landmark');
    yield 'kyoto.:b218';
    R.anchor('pagoda', 242, 154);
    yield 'kyoto.:b219';
    R.anchor('charm_1', 236, 153);
    yield 'kyoto.:b220';
    addChest(R, 'pagoda_back', 249, 133, { rarity: 'rare' });
  }

  yield 'kyoto.:200';
  // ------------------------------------------------------------ Kiyomizu-dera: the hall, the stage over the ravine
  {
    hall(R, 280, 70, 22, 12, { y: KY, h: 6, door: 'w', post: B.pillar_red, wall: B.shoji, floor: B.floor_boards, roof: B.dark_planks, rim: B.log, ridge: B.dark_planks, eave: 3 });
    yield 'kyoto.:b227';
    const deckY = KY;   // stage floor block (you stand at KY + 1, level with the hall)
    const gh = (x, z) => R.hAt(x, z);   // ravine floor (the deck would hide it from groundY)
    for (let z = 64; z <= 88; z++) for (let x = 252; x <= 279; x++) { W.set(x, deckY, z, B.floor_boards); for (let yy = deckY + 1; yy < deckY + 6; yy++) if (x < 277) W.set(x, yy, z, 0); }
    // lattice of keyaki pillars with nuki beams down into the ravine
    for (let x = 252; x <= 272; x += 4) for (let z = 64; z <= 88; z += 4) {
      const gy = gh(x, z); if (gy >= deckY) continue;
      for (let yy = gy; yy < deckY; yy++) W.set(x, yy, z, B.log);
      yield 'loop4';
    }
    for (let yy = deckY - 4; yy > deckY - 14; yy -= 4) {
      for (let z = 64; z <= 88; z += 4) for (let x = 252; x <= 272; x++) if (gh(x, z) <= yy) W.set(x, yy, z, B.dark_planks);
      for (let x = 252; x <= 272; x += 4) for (let z = 64; z <= 88; z++) if (gh(x, z) <= yy) W.set(x, yy, z, B.dark_planks);
      yield 'loop4';
    }
    // railings round the open edges (a waist-high barrier you can lean on)
    for (let x = 252; x <= 279; x++) for (const z of [64, 88]) { W.set(x, deckY + 1, z, B.barrier); }
    for (let z = 64; z <= 88; z++) W.set(252, deckY + 1, z, B.barrier);
    yield 'kyoto.:b242';
    R.fence(252, 64, 278, 64, deckY + 1, 0x6a3a1e); R.fence(252, 88.6, 278, 88.6, deckY + 1, 0x6a3a1e); R.fence(252, 64, 252, 88.6, deckY + 1, 0x6a3a1e);
    yield 'kyoto.:b243';
    // the Niomon gate and a red three-storey pagoda on the terrace
    for (const [px, pz] of [[286, 95], [294, 95], [286, 99], [294, 99]]) for (let k = 0; k < 6; k++) W.set(px, KY + k, pz, B.pillar_red);
    yield 'kyoto.:b245';
    for (let x = 286; x <= 294; x++) for (const z of [95, 99]) W.set(x, KY + 5, z, B.red_lacquer);
    yield 'kyoto.:b246';
    hipRoof(R, 284, 93, 296, 101, KY + 6, { block: B.roof, ridge: B.gold_trim });
    yield 'kyoto.:b247';
    pagoda(R, 306, 90, { y: KY - 1, tiers: 3, half: 2, wall: B.red_lacquer });
    yield 'kyoto.:b248';
    // Otowa waterfall: three streams from the terrace edge into a pool
    {
      const gy = R.hAt(268, 98);
      R.kit.pond(265, 96, 270, 100, gy, B.water, 1, B.mossy_brick);
      for (const z of [96, 98, 100]) for (let yy = gy; yy < KY; yy++) W.set(271, yy, z, B.water);
    }
    for (const [x, z] of [[276, 92], [300, 98], [310, 66]]) R.lantern(x + 0.5, z + 0.5, { y: KY });
    yield 'kyoto.:b255';
    R.poi('kiyomizu', 'Kiyomizu-dera', '🏯', 266, 76, 'landmark');
    yield 'kyoto.:b256';
    R.anchor('kiyomizu_stage', 264, 76, deckY + 1);
    yield 'kyoto.:b257';
    R.anchor('charm_2', 258, 82, deckY + 1);
    yield 'kyoto.:b258';
    R.anchor('kiyomizu', 282, 92);
    yield 'kyoto.:b259';
    R.lair('sq_kyo_stage', 258, 96, { kind: 'curtain' });
    yield 'kyoto.:b260';
    addChest(R, 'stage_under', 262, 70, { rarity: 'rare' });
  }

  yield 'kyoto.:240';
  // ------------------------------------------------------------ Fushimi Inari: the shrine, the fox guardians, the torii tunnel
  {
    hall(R, 258, 208, 14, 8, { y: IY, h: 5, door: 's', post: B.pillar_red, wall: B.red_lacquer, floor: B.tatami, roof: B.roof, ridge: B.gold_trim, eave: 2 });
    yield 'kyoto.:b267';
    // the rōmon (two posts, a lacquered beam, a roof) and the foxes either side
    for (const px of [259, 270]) for (let k = 0; k < 6; k++) W.set(px, IY + k, 226, B.pillar_red);
    yield 'kyoto.:b269';
    for (let x = 259; x <= 270; x++) W.set(x, IY + 5, 226, B.red_lacquer);
    yield 'kyoto.:b270';
    hipRoof(R, 257, 224, 272, 228, IY + 6, { block: B.roof, ridge: B.gold_trim });
    yield 'kyoto.:b271';
    fox(R, 257.5, 229.5, { y: IY, ry: Math.PI * 0.15 }); fox(R, 272.5, 229.5, { y: IY, ry: -Math.PI * 0.15 });
    yield 'kyoto.:b272';
    fox(R, 262.5, 220.5, { y: IY, ry: 0 }); fox(R, 268.5, 220.5, { y: IY, ry: 0 });
    yield 'kyoto.:b273';
    R.torii(247.5, IY, 220.5, 6, 6.2, { along: 'z', thick: 0.6 });
    yield 'kyoto.:b274';
    for (const [x, z] of [[252, 210], [278, 210], [278, 232]]) R.lantern(x + 0.5, z + 0.5, { y: IY });
    yield 'kyoto.:b275';
    // the thousand torii up the mountain
    toriiPath(R, INARI_PATH, { gap: 1.45, w: 3.6, h: 3.9, skip: (x, z) => (x >= INARI.x0 && x <= INARI.x1 && z >= INARI.z0 && z <= INARI.z1 + 1) || (x >= SUMMIT.x0 - 1 && z >= SUMMIT.z0 - 1) });
    yield 'kyoto.:b277';
    // the summit: a small shrine, stone mounds, little torii, more foxes
    const sy = SUMMIT.y;
    yield 'kyoto.:b279';
    R.kit.shrine(295, 294, 303, 300, sy, { door: 's' });
    yield 'kyoto.:b280';
    for (let k = 0; k < 14; k++) {
      const a = k / 14 * Math.PI * 2, x = 299 + Math.cos(a) * 8, z = 298 + Math.sin(a) * 7.5; if (z < 291) continue;
      const gy = R.groundY(Math.floor(x), Math.floor(z)); if (!isFinite(gy)) continue;
      if (k % 2) R.torii(x, gy, z, 1.2, 1.7, { along: 'x', thick: 0.18, collide: false });
      else { P.box(x, gy, z, 0.9, 0.5, 0.9, 0x8a8680); P.box(x, gy + 0.5, z, 0.6, 0.7, 0.4, 0x9a968e); }
      yield 'loop4';
    }
    fox(R, 296.5, 303.5, { y: sy, ry: 0.3 }); fox(R, 302.5, 303.5, { y: sy, ry: -0.3 });
    yield 'kyoto.:b287';
    R.poi('inari', 'Fushimi Inari Taisha', '⛩', 264, 214, 'shrine');
    yield 'kyoto.:b288';
    R.poi('inari_summit', 'Mt Inari Summit', '🦊', 299, 298, 'landmark');
    yield 'kyoto.:b289';
    R.anchor('inari_shrine', 264, 223);
    yield 'kyoto.:b290';
    R.anchor('inari_summit', 299, 304);
    yield 'kyoto.:b291';
    R.anchor('inari_path', 280, 272);
    yield 'kyoto.:b292';
    addChest(R, 'inari_summit', 306, 304, { rarity: 'common', poi: 'Offering Chest' });
  }

  yield 'kyoto.:272';
  // ------------------------------------------------------------ Arashiyama: Togetsukyo, Nonomiya, the bamboo grove
  {
    // bridge railings where the path crosses the Katsura
    let bz0 = 1e9, bz1 = -1e9, by = BASE;
    yield 'kyoto.:b300';
    for (let z = 225; z < 270; z++) if (R.riverCells.has(R.i(176, z))) { bz0 = Math.min(bz0, z); bz1 = Math.max(bz1, z); by = R.hAt(176, z); }
    if (bz1 > 0) { R.fence(173.6, bz0 - 1.5, 173.6, bz1 + 1.5, by, 0x5a3a20); R.fence(179.4, bz0 - 1.5, 179.4, bz1 + 1.5, by, 0x5a3a20); R.poi('togetsukyo', 'Togetsukyo Bridge', '🌉', 176, (bz0 + bz1) >> 1, 'landmark'); R.anchor('charm_3', 177, bz0 - 3); R.anchor('togetsukyo', 178, bz1 + 4); }
    // brushwood fences along the grove path
    R.fence(173.4, 262, 173.4, 330, null, 0x8a6a3a); R.fence(179.6, 262, 179.6, 268, null, 0x8a6a3a); R.fence(179.6, 278, 179.6, 330, null, 0x8a6a3a);
    yield 'kyoto.:b304';
    // Nonomiya shrine and its black torii
    const ny = R.hAt(159, 292);
    yield 'kyoto.:b306';
    R.kit.shrine(154, 286, 164, 294, ny, { door: 's' });
    yield 'kyoto.:b307';
    R.torii(159.5, ny, 298.5, 4, 4.4, { color: 0x2a1e16 });
    yield 'kyoto.:b308';
    R.poi('nonomiya', 'Nonomiya Shrine', '⛩', 159, 290, 'shrine');
    yield 'kyoto.:b309';
    R.poi('bamboo', 'Arashiyama Bamboo Grove', '🎋', 176, 300, 'landmark');
    yield 'kyoto.:b310';
    R.anchor('bamboo_heart', 151, 311);
    yield 'kyoto.:b311';
    R.anchor('bamboo_path', 176, 296);
    yield 'kyoto.:b312';
    addChest(R, 'bamboo_hidden', 130, 326, { rarity: 'rare' });
  }
  yield 'kyoto.:290';
  {   // the bamboo grove: a dense band either side of the path, thinner further out
    const heart = (x, z) => x > 143 && x < 159 && z > 303 && z < 319;
    yield* groveG(R, { rect: [140, 256, 214, 332], step: 2, clear: 0, density: (x) => (Math.abs(x + 0.5 - 176.5) < 4.5 ? 0 : 0.72), where: (x, z) => !heart(x, z), pick: () => bambooClump });
    yield* groveG(R, { rect: [112, 256, 244, 332], step: 3, clear: 0, density: 0.45, where: (x, z) => !heart(x, z) && (x < 140 || x > 214), pick: () => bambooClump });
  }

  yield 'kyoto.:297';
  // ------------------------------------------------------------ the Goodwill Event grounds: Kyoto High's forest
  {
    R.ruin(31, 301, 7);
    yield 'kyoto.:b325';
    for (let k = 0; k < 4; k++) { const x = 26 + k * 3, z = 296; P.box(x + 0.5, R.groundY(x, z), z + 0.5, 1.2, 1.2, 0.2, 0xf0e8d0); P.box(x + 0.5, R.groundY(x, z) + 0.4, z + 0.4, 0.5, 0.5, 0.06, 0xd0301c); }   // archery targets
    R.poi('goodwill', 'Goodwill Event Grounds', '🏹', 58, 238, 'landmark');
    yield 'kyoto.:b327';
    R.poi('archery', 'Old Archery Range', '🎯', 31, 301, 'ruin');
    yield 'kyoto.:b328';
    R.anchor('goodwill', 62, 232);
    yield 'kyoto.:b329';
    R.anchor('archery', 34, 304);
    yield 'kyoto.:b330';
    addChest(R, 'goodwill_ruin', 30, 306, { rarity: 'rare', poi: 'Archery Range Chest' });
    yield 'kyoto.:b331';
    for (const [x, z] of [[46, 230], [70, 230], [46, 250], [70, 250]]) R.lantern(x + 0.5, z + 0.5, { light: true });
  }
  yield 'kyoto.:309';
  // ------------------------------------------------------------ Rashomon: the ruined gate in the northern hills
  {
    const y = R.hAt(177, 43);
    yield 'kyoto.:b337';
    for (const px of [170, 176, 178, 184]) for (const pz of [40, 46]) { const h = 3 + Math.floor(R.r() * 5); for (let k = 0; k < h; k++) W.set(px, y + k, pz, k > h - 2 && R.chance(0.5) ? B.cracked_brick : B.pillar_red); }
    for (let x = 169; x <= 185; x++) for (let z = 39; z <= 47; z++) if (R.chance(0.35)) W.set(x, y + 7 + (R.chance(0.3) ? 1 : 0), z, R.chance(0.5) ? B.roof : B.dark_planks);
    yield 'kyoto.:b339';
    for (let k = 0; k < 8; k++) R.deco.add('bone', 170 + R.r() * 14, y, 38 + R.r() * 10, { mode: 'flat', scale: 0.9 });
    yield 'kyoto.:b340';
    R.reserve(166, 36, 188, 50);
    yield 'kyoto.:b341';
    R.poi('rashomon', 'Rashomon Ruins', '🏚', 177, 43, 'ruin');
    yield 'kyoto.:b342';
    R.anchor('rashomon', 177, 50);
    yield 'kyoto.:b343';
    addChest(R, 'rashomon', 181, 43, { rarity: 'rare' });
  }

  yield 'kyoto.:322';
  // ------------------------------------------------------------ autumn woods everywhere else
  R.reserve(244, 62, 272, 102);   // keep the ravine under the stage clear
  const inCampus = (x, z) => x >= 32 && x <= 116 && z >= 32 && z <= 128;
  yield 'kyoto.:325';
  const inTown = (x, z) => x >= 144 && x <= 334 && z >= 100 && z <= 204;
  yield 'kyoto.:326';
  yield* groveG(R, {
    rect: [4, 4, S - 5, S - 5], step: 5,
    density: (x, z) => (x < 130 && z > 176 ? 0.75 : z < 60 || x > 250 ? 0.55 : 0.4),
    where: (x, z) => !inCampus(x, z) && !inTown(x, z) && !(x > 110 && x < 246 && z > 252),
    pick: (x, z) => { const r = R.r(); return x < 130 && z > 176 ? (r < 0.5 ? 'maple' : r < 0.85 ? 'cedar' : 'oak') : r < 0.62 ? 'maple' : r < 0.82 ? 'cedar' : 'oak'; },
  });
  yield 'kyoto.:332';
  yield* groveG(R, { rect: [146, 100, 334, 204], step: 9, density: 0.22 });
  yield 'kyoto.:333';
  yield* R.scatterG({ density: 0.05, types: ['flower_red', 'flower_red', 'grass', 'tall_grass', 'fern', 'flower_blue'] });

  yield 'kyoto.:336';
  // ------------------------------------------------------------ people
  const at = (x, z, y) => ({ x, z, ...(y != null ? { pos: V(x + 0.5, y, z + 0.5) } : {}) });
  yield 'kyoto.:338';
  R.person({ id: 'kyoto_gakuganji', name: 'Principal Gakuganji', look: 'npc_gakuganji', ...at(65, 61), yaw: 0, color: '#d8c8a0',
    lines: [['So, a Tokyo student wanders onto my campus. Satoru Gojo\'s influence, no doubt.', 'Kyoto keeps the old ways. Respect them while you are here.'], ['In my youth I played the electric guitar. Do not repeat that to anyone.']] });
  R.person({ id: 'todo_kyoto', name: 'Aoi Todo', look: 'todo', ...at(98, 101), yaw: Math.PI, color: '#c89a6a',
    lines: [['Brother! You came all the way to Kyoto!', 'Tell me, what type of woman do you like? ...Never mind. I already know we\'re best friends.'], ['Takada-chan is doing a handshake event in Gion next week. We\'re going. That\'s not a question.']] });
  R.person({ id: 'kyoto_mai', name: 'Mai Zen\'in', look: 'mai', ...at(82, 70), yaw: -0.6, color: '#8ab0d8',
    lines: [['Tokyo trash, in our courtyard? Don\'t track mud on the gravel.'], ['My sister thinks she can make it without cursed energy. She\'ll find out.']] });
  R.person({ id: 'kyoto_miwa', name: 'Kasumi Miwa', look: 'miwa', ...at(77, 74), yaw: 0.6, color: '#7ab8ff',
    lines: [['Oh! H-hello! I\'m Miwa. I\'m... just a normal sword user. Very normal.'], ['If you see Satoru Gojo, could you get me his autograph? For my brothers. Mostly.']] });
  R.person({ id: 'kyoto_mechamaru', name: 'Mechamaru', look: 'mechamaru', ...at(91, 83), yaw: -1.2, color: '#9ad0b0',
    lines: [['GREETINGS. THIS UNIT IS MECHAMARU. MY OPERATOR IS... ELSEWHERE.'], ['THE OBSERVATION NETWORK REPORTS CURSES IN HIGASHIYAMA. UNIT IS NOT DESIGNED FOR STAIRS.']] });
  R.person({ id: 'kyoto_kamo', name: 'Noritoshi Kamo', look: 'npc_kamo', ...at(56, 97), yaw: 0.3, color: '#c8a870',
    lines: [['I am the heir of the Kamo clan. Blood Manipulation is our inheritance.', 'Do not mistake my manners for softness.'], ['The bamboo grove at Arashiyama has grown quiet. Too quiet, for a place that sings in the wind.']] });
  R.person({ id: 'kyoto_momo', name: 'Momo Nishimiya', look: 'npc_momo', ...at(73, 65), yaw: 0.2, color: '#ffd27a',
    lines: [['Hmph. You\'re the one Todo won\'t stop talking about? You don\'t look like much.'], ['Mai and Miwa are my cute juniors. Bully them and I\'ll drop you off my broom. From high up.']] });
  R.person({ id: 'kyoto_maiko1', name: 'Maiko Ichimame', look: 'npc_maiko', ...at(217, 149), yaw: Math.PI / 2, pose: 'wander', wander: 3, color: '#ff9ac0',
    lines: [['Okoshiyasu. Welcome to Gion, sorcerer-han.', 'The lanterns are lit early in autumn. It makes the maples glow.']] });
  R.person({ id: 'kyoto_maiko2', name: 'Maiko Kikuha', look: 'npc_maiko', ...at(224, 132), yaw: -Math.PI / 2, color: '#ff9ac0',
    lines: [['My okiya mother says the old pagoda hums at night. She thinks it\'s the wind.', 'I think it\'s not the wind.']] });
  R.person({ id: 'kyoto_teahouse', name: 'Tea House Owner Fusa', look: 'npc_civ_4', ...at(213, 138), yaw: Math.PI / 2, color: '#e8b0c0',
    lines: [['Matcha and warabi-mochi, dear? The red benches are for customers. And for very tired sorcerers.'], ['The Kyoto students come by after training. The loud one orders for twelve.']] });
  R.person({ id: 'kyoto_tourist', name: 'Tourist Emma', look: 'npc_tourist', ...at(238, 160), yaw: 2.4, pose: 'wander', wander: 6, color: '#ffd27a',
    lines: [['Is that pagoda five storeys? I counted six. Then four. Is it moving?'], ['I came for the maples. Nobody told me about the... wobbly shadow things.']] });
  R.person({ id: 'kyoto_stage_tourist', name: 'Photographer Ren', look: 'npc_civ_2', ...at(262, 80, KY + 1), yaw: -Math.PI / 2, color: '#7ab8ff',
    lines: [['"Jumping off the stage at Kiyomizu" — it means taking a big risk. People actually used to jump.', 'Most of them lived, apparently. The trees broke their fall.']] });
  R.person({ id: 'kyoto_monk', name: 'Monk Jōkai', look: 'npc_civ_5', ...at(277, 88), yaw: -Math.PI / 2, color: '#d8a86a',
    lines: [['The stage stands on one hundred and thirty-nine pillars and not a single nail.', 'What lies beneath it, in the dark between the pillars... we do not speak of.']] });
  R.person({ id: 'kyoto_priest', name: 'Inari Priest Hata', look: 'npc_civ_3', ...at(264, 219), yaw: Math.PI, color: '#ff8a5a',
    lines: [['Every torii on the mountain was given by someone with a wish. Thousands of wishes.', 'Curses love wishes. They gather where people hope hardest.']] });
  R.person({ id: 'kyoto_rickshaw', name: 'Rickshaw Puller Gen', look: 'npc_civ_1', ...at(181, 266), yaw: -Math.PI / 2, color: '#8ad06a',
    lines: [['Ride through the bamboo? ...No? Your legs, your loss.'], ['At dusk the grove whistles. Something moves on top of the stalks — something with a monkey\'s face.']] });
  R.person({ id: 'kyoto_station', name: 'Station Attendant', look: 'npc_civ_3', ...at(201, 179), yaw: Math.PI, color: '#ffd27a',
    lines: [['Kyoto Station. The Window keeps a sorcerer\'s shrine on the platform: touch it to ride.', 'Kiyomizu, Inari, Arashiyama, the Kyoto school — once you\'ve visited, it\'s one ride.']] });
  R.person({ id: 'kyoto_window', name: 'Window Agent Saeki', look: 'npc_ijichi', ...at(190, 180), yaw: Math.PI, color: '#9ab0d8',
    lines: [['Kyoto branch of the Window. The Goodwill grounds are west of the river, past the trail.', 'Curses breed in the forest, the bamboo and on Mt Inari. The town and the temples are warded.']] });
  R.person({ id: 'kyoto_kid', name: 'Sora', look: 'npc_civ_0', ...at(232, 186), yaw: 0, pose: 'wander', wander: 5, color: '#ffa050',
    lines: [['My granddad carved half the foxes on Mt Inari. He says they bite curses.'], ['There\'s a hidden chest behind the pagoda. Everybody knows. Nobody\'s brave enough.']] });
  R.person({ id: 'kyoto_carpenter', name: 'Old Carpenter Tetsu', look: 'npc_civ_1', ...at(252, 160), yaw: -0.8, color: '#c8a870',
    lines: [['The pagoda\'s central pillar hangs free, like a pendulum. Earthquakes can\'t topple it.', 'Curses, on the other hand...']] });

  yield 'kyoto.:378';
  // ------------------------------------------------------------ curses
  R.roamZone(6, 176, 128, 330, { kinds: ['swarmer', 'swarmer', 'flyhead', 'grasshopper', 'spitter', 'lantern'], level: 2, dense: true });
  yield 'kyoto.:380';
  R.roamZone(112, 254, 244, 332, { kinds: ['shadow', 'swarmer', 'longneck', 'flyhead'], level: 2 });
  yield 'kyoto.:381';
  R.roamZone(270, 238, 332, 332, { kinds: ['teleporter', 'flyhead', 'swarmer', 'gravekeeper'], level: 2 });
  yield 'kyoto.:382';
  R.roamZone(126, 4, 332, 62, { kinds: ['swarmer', 'spitter', 'flyhead', 'doll'], level: 2 });
  yield 'kyoto.:383';
  R.roamZone(4, 4, 32, 176, { kinds: ['swarmer', 'flyhead', 'spitter'], level: 2 });
  yield 'kyoto.:384';
  R.safeZone(32, 32, 116, 128);
  yield 'kyoto.:385';
  R.safeZone(144, 100, 334, 204);
  yield 'kyoto.:386';
  R.safeZone(268, 60, 316, 114);
  yield 'kyoto.:387';
  R.safeZone(244, 202, 286, 238);

  yield 'kyoto.:390';
  // ------------------------------------------------------------ autumn leaves on the wind (while you are here)
  onRegionLoad(R, (g) => {
    let acc = 0;
    g.addUpdater((dt) => {
      if (g.level?.regionId !== 'kyoto' || g.mode !== 'world') return false;
      const part = g.particles; if (!part?.smoke || g.state === 'loading') return;
      acc += dt * 5 * (part.budget ?? 1);
      const f = g.rig?.focus; if (!f) return;
      while (acc > 1) {
        acc -= 1;
        const c = MAPLE_COLS[Math.floor(Math.random() * MAPLE_COLS.length)], col = new THREE.Color(c);
        part.smoke.emit(f.x + (Math.random() - 0.5) * 36, f.y + 4 + Math.random() * 6, f.z + (Math.random() - 0.5) * 30, 0.6 + Math.random() * 0.5, -0.6 - Math.random() * 0.3, 0.2 + Math.random() * 0.3, 6 + Math.random() * 3, col.r * 1.1, col.g * 1.1, col.b * 1.1, 0.09, 0, 0.05, 0.9, 1);
      }
    });
  });

  return yield* R.finishG({
    spawn: [196, 189], biome: KYOTO_BIOME,
    titleCam: { center: V(242, BASE + 14, 150), dist: 46, pitch: 24 * Math.PI / 180 },
    backdrop: { c0: 0x5a3a3a, c1: 0xd8987a, ground: 0x2a2018 },
  });
}

registerRegion('kyoto', {
  name: 'Kyoto', sub: 'Kyoto Jujutsu High · temples, torii and bamboo', kind: 'city', grid: [0, 1],
  color: '#a04a3a', accent: '#ffb07a', icon: '🏯',
  blurb: 'The old capital at golden hour: Kiyomizu\'s stage, a thousand torii, the bamboo grove and the Goodwill grounds.',
  biome: KYOTO_BIOME, build,
});
