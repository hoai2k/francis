// Region 6 — shinjuku: the skyscraper district and the city around it, with
// a scar through the middle. West Shinjuku's towers and the Tokyo
// Metropolitan Government Building (the twin towers over Citizens' Plaza),
// Shinjuku Station and its west exit, Omoide Yokocho's lantern alley, the
// Eishu Detention Centre (chapter 2's curtain), Kabukicho under its neon
// (the Ichibangai gate, the Godzilla head over the Toho building, host clubs
// and karaoke boxes), the department stores of Shinjuku-sanchome and the
// gardens of Shinjuku Gyoen. South of Koshu-kaido the blocks where Gojo and
// Sukuna fought are gone: craters (the biggest from a Hollow Purple), sliced
// tower stumps, rubble, and the long scorched cuts of Dismantle, Cleave and
// the Malevolent Shrine — fenced off by a Window checkpoint. The intact city
// is full of people (crowd.js); the levelled zone is full of curses.
// Enterable buildings and curse-infested ones: interiors.js.
// Gates: west (Jujutsu High), north (Sendai colony), south (Tokyo No. 1).
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B } from './common.js';
import { BIOMES } from '../biomes.js';
import { CrowdPlan, Crowd, LOOK_SETS } from '../../entities/crowd.js';
import { building, worldChest, interiorsData, Interiors, cityView } from '../interiors.js';
import { fastBlockLights, street, paintStreets, band, rect, zebra, tower, crater, slash, rubble, car, taxi, bench, planter, sign, neonBar, screen } from './city_kit.js';

export const SHINJUKU_BIOME = {
  ...BIOMES.tokyo_night,
  name: 'Shinjuku', sub: 'Skyscrapers · the levelled district',
  skyTop: 0x2a4a8a, skyHorizon: 0xe8b890, fog: 0x8a7a80, fogDensity: 0.006,
  hemiSky: 0xc8d0e8, hemiGround: 0x4a4038, hemiI: 1.0, sun: 0xffd8a8, sunI: 2.4,
  grade: { tint: [1.02, 1.0, 0.98], lift: [0, 0, 0.01], sat: 1.08, contrast: 1.08, vignette: 0.24 },
  look: {
    timeOfDay: 'cycle', start: 17.0, sunAzimuth: 20,
    palette: { skyTop: 0x2a62d8, skyHorizon: 0xc8dcf0, fog: 0xb8c4d4, hemiSky: 0xa8c0e8, hemiGround: 0x6a5a48 },
    fog: { density: 0.0055, sun: 0.75, height: 6, heightDensity: 0.015 },
    clouds: { coverage: 0.4 },
    grade: { tint: [1.02, 1.0, 0.98], sat: 1.12, contrast: 1.07, vignette: 0.22 },
  },
  ambience: 'city', music: 'city', particles: 'none', wind: 0.9,
};

const SIGNS = ['ホスト', 'カラオケ', 'BAR', '居酒屋', 'ラーメン', 'CLUB', '無料案内所', 'HOTEL', 'GAME', '焼肉', 'パチンコ', '寿司', 'SNACK', 'LIVE'];
const NEON = ['#ff6ac0', '#7ae0ff', '#ffd84a', '#9aff7a', '#ff5a5a', '#c08aff'];

function build(ctx) {
  const R = new RegionBuilder(ctx, { size: [352, 112, 352], base: 10 });
  const C = new CrowdPlan(R, { looks: LOOK_SETS.city, density: 1.1 });
  const BASE = R.base;
  const N = R.noise;
  // ------------------------------------------------------------ plan
  R.gate('w', 'jujutsu_high', { at: 128, road: false });
  R.gate('n', 'colony_sendai', { at: 246, road: false });
  R.gate('s', 'colony_tokyo1', { at: 246, road: false });
  const ST = {};
  ST.yas = street(R, [[1, 128], [351, 128]], { width: 10, crowd: C, trim0: 3, trim1: 3 });
  ST.kos = street(R, [[1, 212], [351, 212]], { width: 10, crowd: C, trim0: 3, trim1: 3 });
  ST.meiji = street(R, [[246, 1], [246, 351]], { width: 8, crowd: C, trim0: 3, trim1: 3 });
  ST.x40 = street(R, [[40, 1], [40, 205]], { width: 8, crowd: C, trim0: 3 });
  ST.x100 = street(R, [[100, 1], [100, 205]], { width: 8, crowd: C, trim0: 3 });
  ST.x154 = street(R, [[154, 1], [154, 205]], { width: 8, crowd: C, trim0: 3 });
  ST.z60 = street(R, [[8, 60], [150, 60]], { width: 8, crowd: C });
  ST.shin = street(R, [[250, 176], [351, 176]], { width: 8, crowd: C, trim1: 3 });
  ST.z64 = street(R, [[250, 64], [351, 64]], { width: 6, crowd: C, trim1: 3 });
  ST.ichi = street(R, [[296, 1], [296, 123]], { width: 6, walk: 0, block: B.red_brick, alt: B.polished, altP: 0.1, line: false });
  C.path([[294.4, 4], [294.4, 121]], { width: 1.4, step: 7, weight: 1.5 }); C.path([[297.6, 4], [297.6, 121]], { width: 1.4, step: 7, weight: 1.5 });
  ST.yoko = street(R, [[158, 100], [242, 100]], { width: 4, walk: 0, block: B.cobble, alt: B.dark_planks, altP: 0.1, line: false });
  C.path([[159, 100], [241, 100]], { width: 2.4, step: 6, weight: 1.2 });
  // the ruined streets in the levelled zone (wrecked after)
  ST.r100 = street(R, [[100, 217], [100, 351]], { width: 8, walk: 3 });
  ST.r280 = street(R, [[8, 280], [240, 280]], { width: 8, walk: 3 });
  // plazas and lots
  R.flat(161, 135, 239, 205, { y: BASE });                          // the station block
  R.flat(47, 186, 93, 205, { y: BASE });                            // Citizens' Plaza
  R.flat(253, 220, 344, 344, { y: BASE });                          // Shinjuku Gyoen
  R.station('station', 'Shinjuku Station · West Exit', 166, 170, { y: BASE, facing: 'e' });
  R.station('gyoen', 'Shinjuku Gyoen', 300, 226, { y: BASE, facing: 's' });
  R.station('checkpoint', 'Koshu-kaido Checkpoint', 128, 224, { y: BASE, facing: 'n' });
  R.lair('m2', 197, 66, { y: BASE }); R.anchor('giver_m2', 205, 70);
  R.lair('m3', 34, 238, {}); R.anchor('giver_m3', 44, 226);
  const lots = [];
  const lotRow = (x0, z0, x1, z1, side, o = {}) => {
    const alongX = side === 'n' || side === 's';
    const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1;
    let a = a0;
    while (a1 - a + 1 >= 12) {
      let len = Math.min(a1 - a + 1, (o.min ?? 12) + Math.floor(R.r() * ((o.max ?? 20) - (o.min ?? 12) + 1)));
      if (a1 - (a + len) + 1 < 12) len = a1 - a + 1;
      const L = alongX ? { x0: a, z0, x1: a + len - 1, z1, side } : { x0, z0: a, x1, z1: a + len - 1, side };
      Object.assign(L, o.tag ?? {});
      lots.push(L); R.flat(L.x0, L.z0, L.x1, L.z1, { y: BASE });
      a += len + (o.gap ?? (R.chance(0.35) ? 2 : 1));
    }
  };
  // West Shinjuku: superblocks of skyscrapers
  lotRow(8, 8, 33, 121, 'e', { tag: { d: 'sky' }, min: 24, max: 36, gap: 4 });
  lotRow(47, 8, 93, 53, 's', { tag: { d: 'sky' }, min: 20, max: 26, gap: 4 });
  lotRow(107, 8, 147, 53, 's', { tag: { d: 'sky' }, min: 18, max: 22, gap: 4 });
  lotRow(47, 67, 93, 121, 'n', { tag: { d: 'sky' }, min: 20, max: 26, gap: 4 });
  lotRow(8, 135, 33, 205, 'e', { tag: { d: 'sky' }, min: 22, max: 34, gap: 4 });
  lotRow(107, 135, 147, 205, 'w', { tag: { d: 'sky' }, min: 20, max: 30, gap: 4 });
  // north of the station: Omoide Yokocho's little shops, the blocks by the detention centre
  lotRow(161, 104, 239, 120, 'n', { tag: { d: 'yoko' }, min: 12, max: 14, gap: 0 });
  lotRow(161, 74, 239, 96, 's', { tag: { d: 'yoko' }, min: 12, max: 14, gap: 0 });
  // Kabukicho
  lotRow(253, 8, 292, 57, 'e', { tag: { d: 'kabuki' }, min: 12, max: 16 });
  lotRow(300, 8, 344, 57, 'w', { tag: { d: 'kabuki' }, min: 12, max: 16 });
  lotRow(253, 71, 292, 119, 'e', { tag: { d: 'kabuki' }, min: 12, max: 16 });
  lotRow(300, 71, 344, 119, 'w', { tag: { d: 'kabuki' }, min: 12, max: 16 });
  // Shinjuku-sanchome
  lotRow(253, 135, 344, 169, 'n', { tag: { d: 'shop' }, min: 16, max: 24 });
  lotRow(253, 183, 344, 204, 's', { tag: { d: 'shop' }, min: 14, max: 22 });
  // explicit landmarks
  const TOHO = { x0: 262, z0: 20, x1: 284, z1: 44 };
  for (const b of [TOHO]) R.flat(b.x0, b.z0, b.x1, b.z1, { y: BASE });
  R.flat(168, 12, 226, 58, { y: BASE });   // the detention centre
  // ------------------------------------------------------------ terrain: flat city, the ruins sunk a little
  R.terrain({ falloff: 6, fn: (x, z) => BASE + 0.4 * N.fbm(x * 0.03, z * 0.03, 2) - (z > 220 && x < 240 ? 1 + 1.2 * (N.fbm(x * 0.05, z * 0.05, 2) * 0.5 + 0.5) : 0) });
  R.carve({ top: B.concrete, sub: B.stone, rock: B.concrete, rock2: B.cracked_brick, rockSlope: 3, topFn: (x, z) => (z > 220 && x < 240 ? (R.chance(0.3) ? B.cracked_brick : R.chance(0.2) ? B.dirt : B.concrete) : R.chance(0.08) ? B.stone_brick : B.concrete) });
  R.paveRoads();
  paintStreets(R);
  const W = R.world;
  // station plaza paving
  rect(R, 161, 135, 239, 205, (x, z) => ((x - 161) % 7 === 0 || (z - 135) % 7 === 0 ? B.stone_brick : B.polished));
  rect(R, 47, 186, 93, 205, (x, z) => (Math.hypot(x - 70, z - 186) % 5 < 1 ? B.stone_brick : B.marble));

  // ------------------------------------------------------------ the Tokyo Metropolitan Government Building
  {
    const y = BASE, z0 = 138, z1 = 182;
    tower(R, 68, z0 + 4, 5, z1 - z0 - 7, 34, { wall: B.marble, glass: B.window, glass2: B.window_dark, col: 2, crown: 'none', lit: 0.5, base: 2 });   // the link block
    for (const x0 of [48, 73]) tower(R, x0, z0, 20, z1 - z0 + 1, 96, { wall: B.marble, trim: B.stone_brick, glass: B.window, glass2: B.window_dark, col: 2, lit: 0.42, base: 2, setbacks: [[38, 2], [74, 4]], crown: x0 === 48 ? 'antenna' : 'spire', mast: 6 });
    sign(R, 70.5, y + 4, z1 + 1.1, ['東京都庁', 'TOKYO METROPOLITAN GOVERNMENT'], { w: 9, h: 1.6, color: '#e8f0ff', bg: 'rgba(20,30,50,0.95)', glow: 1.6 });
    R.poi('tmg', 'Tokyo Metropolitan Government Building', '🏛', 70, 160, 'landmark');
    R.anchor('tmg', 70, 194);
    for (const [x, z] of [[54, 196], [86, 196], [62, 202], [78, 202]]) planter(R, x, z, 'tree');
    for (let x = 50; x <= 90; x += 10) R.streetLight(x + 0.5, 190.5);
    void y;
  }
  // Mode Gakuen Cocoon Tower (an elliptical tower with chamfered corners) and the hotel
  const cocoon = lots.find((l) => l.d === 'sky' && l.x0 >= 47 && l.z0 >= 67 && l.x0 < 60); if (cocoon) cocoon.used = true;
  if (cocoon) { tower(R, cocoon.x0 + 1, cocoon.z0 + 2, 20, 22, 84, { round: 6, wall: B.window_dark, glass: B.window, glass2: B.window_dark, col: 3, lit: 0.35, base: 1, crown: 'spire', setbacks: [[50, 1], [70, 2]] }); R.poi('cocoon', 'Cocoon Tower', '🥚', cocoon.x0 + 11, cocoon.z0 + 13, 'landmark'); }
  // ------------------------------------------------------------ Shinjuku Station
  building(R, { id: 'sjk_station', name: 'Shinjuku Station', x0: 176, z0: 142, w: 52, d: 52, floors: 3, door: 'w', doorAt: 0.5, kinds: ['concourse', 'shop', 'cafe'], labels: ['JR Concourse', 'Lumine', 'Restaurant Floor'], wall: B.concrete, awning: 0x2a6a3a, poi: { icon: '🚉' } });
  sign(R, 175.9, BASE + 6.5, 168, ['新宿駅', 'SHINJUKU STATION'], { w: 11, h: 3, color: '#ffffff', bg: 'rgba(20,90,40,0.95)', yaw: -Math.PI / 2 });
  tower(R, 230, 140, 10, 26, 46, { wall: B.polished, crown: 'antenna', lit: 0.5 });
  // bus terminal canopy and taxis by the west exit
  for (let z = 140; z <= 200; z += 12) { R.props.box(169, BASE, z, 0.2, 2.8, 0.2, 0x8a8e98); R.props.box(169, BASE + 2.8, z, 1.6, 0.12, 3, 0x9aa0a8); }
  taxi(R, 164, 150, Math.PI / 2); taxi(R, 164, 158, Math.PI / 2); taxi(R, 164, 186, Math.PI / 2);
  R.anchor('station_plaza', 168, 176);
  C.path([[163, 137], [163, 203]], { width: 3, weight: 1.5 }); C.path([[172, 137], [172, 203]], { width: 3, weight: 1.5 });
  C.path([[163, 168], [175, 168]], { width: 3, weight: 2 }); C.path([[163, 137], [172, 137]], { width: 2 }); C.path([[163, 203], [172, 203]], { width: 2 });
  C.path([[178, 137], [236, 137]], { width: 3 }); C.path([[178, 203], [236, 203]], { width: 3 }); C.path([[172, 137], [178, 137]], { width: 2 }); C.path([[172, 203], [178, 203]], { width: 2 });
  C.spot(166, 180, { n: 5, r: 2.4, pose: 'phone' }); C.spot(168, 160, { n: 4, r: 2, pose: 'chat' });
  // ------------------------------------------------------------ the Eishu Detention Centre (chapter 2)
  {
    const y = BASE, x0 = 168, z0 = 12, x1 = 226, z1 = 58;
    for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) for (let yy = y; yy < y + 4; yy++) if (!(z === z1 && Math.abs(x - 197) <= 2 && yy < y + 3)) W.set(x, yy, z, yy === y + 3 ? B.concrete_pillar : B.concrete);
    for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) for (let yy = y; yy < y + 4; yy++) W.set(x, yy, z, yy === y + 3 ? B.concrete_pillar : B.concrete);
    for (let x = x0; x <= x1; x += 2) R.props.box(x + 0.5, y + 4, z1 + 0.5, 0.05, 0.6, 0.05, 0x5a5a5a);
    tower(R, 176, 18, 18, 16, 12, { wall: B.plaster, glass: B.window_dark, glass2: B.window_dark, lit: 0.1, crown: 'tank' });
    tower(R, 200, 18, 20, 14, 12, { wall: B.plaster, glass: B.window_dark, glass2: B.window_dark, lit: 0.1, crown: 'tank' });
    tower(R, 186, 38, 22, 12, 8, { wall: B.plaster, glass: B.window_dark, glass2: B.window_dark, lit: 0.05, crown: 'none' });
    rect(R, x0 + 1, z0 + 1, x1 - 1, z1 - 1, (x, z) => (R.chance(0.15) ? B.cracked_brick : B.concrete));
    sign(R, 197.5, y + 3.6, z1 + 1.1, ['英集少年院', 'EISHU DETENTION CENTRE'], { w: 7, h: 1.4, color: '#c8c8c8', bg: 'rgba(30,30,34,0.95)' });
    R.poi('eishu', 'Eishu Detention Centre', '🏚', 197, 36, 'lair');
    R.reserve(x0, z0, x1, z1, 2);
  }
  // ------------------------------------------------------------ Kabukicho
  {
    const y = BASE;
    // the Ichibangai gate
    for (const x of [292, 300]) for (let yy = y; yy < y + 7; yy++) W.set(x, yy, 122, B.red_lacquer);
    R.props.box(296.5, y + 7, 122.5, 10, 1.6, 0.5, 0x1a0a0a);
    sign(R, 296.5, y + 7.8, 123.0, ['歌舞伎町一番街'], { w: 9, h: 1.5, color: '#ff4a4a', bg: 'rgba(20,6,6,0.95)', glow: 2.6 });
    R.poi('kabukicho', 'Kabukicho Ichibangai', '🏮', 296, 110, 'landmark');
    // the Toho building and its Godzilla
    const t = tower(R, TOHO.x0, TOHO.z0, TOHO.x1 - TOHO.x0 + 1, TOHO.z1 - TOHO.z0 + 1, 40, { wall: B.polished, glass: B.window, glass2: B.window_dark, lit: 0.6, crown: 'none', base: 2 });
    const gx = t.cx, gz = TOHO.z1 - 6, gy = t.top + 1;
    const G = (x0, y0, z0, x1, y1, z1, id) => { for (let yy = y0; yy <= y1; yy++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(gx + x, gy + yy, gz + z, id); };
    G(-2, 0, -2, 2, 5, 2, B.dark_brick);                // neck
    G(-3, 5, -3, 3, 9, 4, B.dark_brick);                // head
    G(-2, 6, 5, 2, 8, 8, B.dark_brick);                 // snout
    G(-2, 5, 5, 2, 5, 8, B.mossy_brick);                // jaw
    for (const x of [-2, 0, 2]) G(x, 5, 8, x, 5, 8, B.marble);   // teeth
    G(-3, 8, 3, -3, 8, 3, B.lantern); G(3, 8, 3, 3, 8, 3, B.lantern);   // eyes
    for (let k = 0; k < 5; k++) G(0, 9 + (k % 2), -3 + k * 1, 0, 10 + (k % 2), -3 + k, B.cracked_brick);   // dorsal plates
    for (const s of [-1, 1]) G(s * 4, 6, -2, s * 4, 9, 1, B.dark_brick);
    W.addLight(gx + 0.5, gy + 9, gz + 4, 0xffe08a, 3, 8);
    R.poi('godzilla', 'Toho Building (Godzilla)', '🦖', gx, gz, 'landmark');
    R.anchor('kabuki_alley', 296, 86);
    R.anchor('kabuki_plaza', 296, 40);
  }
  // ------------------------------------------------------------ Shinjuku Gyoen
  {
    rect(R, 253, 220, 344, 344, (x, z) => (N.fbm(x * 0.08, z * 0.08, 2) > 0.35 ? B.moss_floor : B.grass));
    R.kit.pond(270, 250, 296, 266, BASE, B.water, 2, B.stone_brick);
    R.kit.pond(306, 300, 334, 318, BASE, B.water, 2, B.stone_brick);
    const paths = [[[300, 221], [300, 240], [282, 244], [262, 270], [262, 300], [290, 336], [320, 336], [340, 300], [340, 260], [320, 240], [300, 240]], [[262, 300], [300, 290], [340, 300]]];
    for (const p of paths) { band(R, p, -0.1, 1.4, B.dirt_path, { over: true }); C.path(p, { width: 2.2, step: 8, weight: 0.8 }); }
    C.path([[300, 221], [300, 218]], { width: 2 });
    R.house(312, 268, 9, 7, { door: 's', wall: B.plaster, roof: B.roof });          // the tea house
    R.poi('teahouse', 'Rakuu-tei Tea House', '🍵', 316, 272, 'landmark');
    building(R, { id: 'sjk_greenhouse', name: 'Gyoen Greenhouse', x0: 318, z0: 226, w: 22, d: 14, floors: 1, door: 'w', kinds: ['cafe'], labels: ['Tropical Greenhouse'], wall: B.window, trim: B.metal_grate, win: B.window, win2: B.window, roof: false, shopGlass: B.window, awning: false, poi: { icon: '🌴' } });
    R.forest({ kinds: ['sakura', 'oak', 'sakura', 'pine'], density: 0.42, step: 5, rect: [255, 222, 343, 343], where: (x, z) => !R.lock[R.i(x, z)] });
    R.scatter({ x0: 254, z0: 221, x1: 343, z1: 343, density: 0.2, types: ['grass', 'flower_red', 'flower_blue', 'tall_grass', 'grass'] });
    R.poi('gyoen', 'Shinjuku Gyoen', '🌸', 300, 280, 'landmark');
    R.anchor('gyoen', 300, 246);
    C.zone(253, 220, 344, 344, { looks: LOOK_SETS.park, density: 0.8 });
    C.spot(286, 274, { n: 4, r: 2, pose: 'chat', looks: LOOK_SETS.park }); C.spot(330, 330, { n: 3, r: 1.6, pose: 'phone', looks: LOOK_SETS.park });
    for (let x = 260; x <= 340; x += 16) R.streetLight(x + 0.5, 219.5);
  }
  // ------------------------------------------------------------ the levelled zone (Gojo vs Sukuna)
  {
    const stumps = [[16, 230, 22, 20, 70], [60, 232, 20, 18, 60], [150, 230, 24, 20, 80], [196, 236, 22, 22, 64], [20, 300, 20, 22, 50], [176, 300, 24, 22, 70], [206, 320, 20, 18, 44], [60, 320, 18, 18, 40]];
    for (const [x0, z0, w, d, h] of stumps) {
      const cut = BASE + 5 + Math.floor(R.r() * 22), a = R.r() * Math.PI * 2;
      tower(R, x0, z0, w, d, h, { hollow: true, lit: 0.03, glass: B.window_dark, glass2: B.cracked_brick, wall: R.chance(0.5) ? B.concrete : B.cracked_brick, crown: 'none', base: 1, slice: { p: [x0 + w / 2, cut, z0 + d / 2], n: [Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6] } });
    }
    // Hollow Purple: the great crater
    crater(R, 112, 292, 36, 10, { lining: [B.obsidian, B.void_floor, B.cracked_brick, B.stone] });
    crater(R, 46, 268, 10, 4); crater(R, 214, 270, 12, 4); crater(R, 160, 336, 9, 3); crater(R, 230, 226, 6, 2);
    // Dismantle / Cleave / World-cutting slashes
    slash(R, [8, 222], [236, 300], { width: 1.2, depth: 2 });
    slash(R, [236, 230], [40, 344], { width: 1.0, depth: 2 });
    slash(R, [20, 330], [230, 250], { width: 1.1, depth: 2 });
    slash(R, [120, 222], [150, 344], { width: 2.2, depth: 4, height: 90 });   // the world-cutting slash
    for (let k = 0; k < 22; k++) rubble(R, 12 + R.r() * 224, 222 + R.r() * 120, 6, 14);
    // Malevolent Shrine scorch: blood-red patches
    for (let k = 0; k < 40; k++) { const x = 12 + Math.floor(R.r() * 224), z = 222 + Math.floor(R.r() * 120); for (let q = 0; q < 6; q++) { const xx = x + Math.floor(R.rnd(-2, 3)), zz = z + Math.floor(R.rnd(-2, 3)); if (R.in(xx, zz)) W.setRaw(xx, Math.round(R.H[R.i(xx, zz)]) - 1, zz, B.blood_brick); } }
    // the barricade along Koshu-kaido's south side, with the checkpoint
    for (let x = 4; x <= 240; x += 2) { if (Math.abs(x - 128) < 5) continue; R.props.box(x + 0.5, BASE, 219.5, 2, 1.1, 0.25, (x / 2) % 2 ? 0xffd84a : 0x1a1a1a, { emit: 0.15 }); W.set(x, BASE, 219, B.barrier); W.set(x + 1, BASE, 219, B.barrier); }
    sign(R, 128.5, BASE + 3.2, 218.6, ['立入禁止 · KEEP OUT', 'WINDOW CHECKPOINT'], { w: 6, h: 1.4, color: '#ffd84a', bg: 'rgba(30,24,6,0.95)' });
    car(R, 120, 216, 0, 0xf4f4f4); car(R, 136, 216, 0, 0x1a1a1a);
    R.poi('levelled', 'The Levelled District', '💥', 112, 280, 'ruin');
    R.poi('crater', 'Hollow Purple Crater', '🟣', 112, 292, 'ruin');
    R.anchor('ruins_center', 112, 262); R.anchor('great_crater', 112, 292);
    R.anchor('stake_0', 14, 226); R.anchor('stake_1', 232, 228); R.anchor('stake_2', 14, 340); R.anchor('stake_3', 232, 340);
    R.anchor('checkpoint_ijichi', 140, 223);
    R.anchor('scar_0', 70, 244); R.anchor('scar_1', 186, 266); R.anchor('scar_2', 132, 330);
    // the sewer culvert (chapter 3: down into the sewers)
    const sx = 34, sz = 238, sy = R.hAt(sx, sz);
    for (let dx = -3; dx <= 3; dx++) for (let yy = sy; yy < sy + 4; yy++) W.set(sx + dx, yy, sz - 3, Math.abs(dx) <= 1 && yy < sy + 2 ? 0 : B.concrete);
    for (let dx = -1; dx <= 1; dx++) { W.set(sx + dx, sy - 1, sz - 2, B.metal_grate); W.set(sx + dx, sy - 1, sz - 4, B.water); }
    R.poi('sewer', 'Storm Drain', '🕳', sx, sz, 'lair');
  }
  // ------------------------------------------------------------ enterable / infested buildings
  const W_ = (L) => L.x1 - L.x0 + 1, D_ = (L) => L.z1 - L.z0 + 1;
  const pick = (pred) => { const L = lots.find((l) => !l.used && pred(l)); if (L) L.used = true; return L; };
  const special = {};
  { const L = pick((l) => l.d === 'sky' && l.x0 >= 107 && l.z0 >= 67 && l.z1 <= 121); if (L) special.office = building(R, { id: 'sjk_office', name: 'Nishi-Shinjuku Mitsui Annex', x0: L.x0 + 2, z0: L.z0 + 2, w: Math.min(22, W_(L) - 4), d: Math.min(18, D_(L) - 4), floors: 4, door: L.side, kinds: ['lobby', 'office', 'office', 'office'], wall: B.polished, quest: 'sq_shinjuku_office', infested: { level: 3, floors: [{ n: 4, kinds: ['swarmer', 'spitter'] }, { n: 4, kinds: ['doll', 'swarmer', 'flyhead'] }, { n: 4, kinds: ['lantern', 'swarmer', 'transfigured'] }, { n: 3, kinds: ['summoner', 'tank'], elite: 'armored' }], reward: { coins: 170, xp: 240, items: 1, rarity: 'rare' } }, poi: { icon: '🏢' } }); }
  { const L = pick((l) => l.d === 'sky' && l.x0 >= 107 && l.z0 >= 135); if (L) building(R, { id: 'sjk_hotel', name: 'Washington Hotel', x0: L.x0 + 2, z0: L.z0 + 2, w: Math.min(24, W_(L) - 4), d: Math.min(20, D_(L) - 4), floors: 4, door: L.side, kinds: ['lobby', 'cafe', 'apartment', 'apartment'], wall: B.marble, sign: { text: ['WASHINGTON HOTEL'], color: '#e8f0ff' } }); }
  { const L = pick((l) => l.d === 'kabuki' && l.side === 'e' && l.z0 > 60); if (L) building(R, { id: 'kbk_karaoke', name: 'Big Echo Kabukicho', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 3, door: 'e', kinds: ['karaoke', 'karaoke', 'karaoke'], sign: { text: ['カラオケ'], color: '#ff6ac0' } }); }
  { const L = pick((l) => l.d === 'kabuki' && l.side === 'w' && l.z0 > 60); if (L) building(R, { id: 'kbk_host', name: 'Host Club "Eternal"', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 3, door: 'w', kinds: ['lobby', 'karaoke', 'apartment'], wall: B.dark_brick, sign: { text: ['HOST ETERNAL'], color: '#ffd84a' }, infested: { level: 3, floors: [{ n: 4, kinds: ['shadow', 'swarmer'] }, { n: 4, kinds: ['longneck', 'flyhead'] }, { n: 3, kinds: ['teleporter', 'doll'] }] }, poi: { icon: '☠' } }); }
  { const L = pick((l) => l.d === 'kabuki' && l.side === 'w' && l.z0 < 60); if (L) building(R, { id: 'kbk_konbini', name: 'Kabukicho Konbini', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 2, door: 'w', kinds: ['store', 'storage'], sign: { text: ['24H'], color: '#7ae0ff' } }); }
  { const L = pick((l) => l.d === 'shop' && l.side === 'n'); if (L) building(R, { id: 'sjk_isetan', name: 'Isetan Shinjuku', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 4, door: 'n', kinds: ['lobby', 'shop', 'shop', 'cafe'], wall: B.red_brick, sign: { text: ['ISETAN'], color: '#ffd84a' }, poi: { icon: '🛍' } }); }
  { const L = pick((l) => l.d === 'shop' && l.side === 's'); if (L) building(R, { id: 'sjk_gym', name: 'Sanchome Fitness', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 3, door: 's', kinds: ['gym', 'gym', 'derelict'], infested: { level: 3, floors: [{ n: 3, kinds: ['swarmer', 'grasshopper'] }, { n: 4, kinds: ['burrower', 'swarmer'] }, { n: 3, kinds: ['tank', 'flyhead'] }] }, poi: { icon: '☠' } }); }
  { const L = pick((l) => l.d === 'yoko' && l.side === 'n'); if (L) building(R, { id: 'yoko_izakaya', name: 'Omoide Izakaya', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 2, door: 'n', kinds: ['cafe', 'apartment'], wall: B.dark_planks, trim: B.dark_planks, sign: { text: ['居酒屋'], color: '#ff9a4a' }, awning: 0x8a1a1a }); }
  // ruins: one sunken office is still standing — and full of curses
  building(R, { id: 'ruin_office', name: 'Collapsed Office Block', x0: 196, z0: 290, w: 16, d: 14, floors: 3, door: 'n', kinds: ['derelict', 'derelict', 'storage'], wall: B.cracked_brick, win: B.window_dark, infested: { level: 3, floors: [{ n: 4, kinds: ['transfigured', 'swarmer'] }, { n: 4, kinds: ['gravekeeper', 'swarmer'] }, { n: 3, kinds: ['serpent'], elite: 'shadow' }], reward: { coins: 150, xp: 220, items: 1, rarity: 'rare' } }, poi: { icon: '☠' } });
  // the rest of the lots: towers (West Shinjuku), small neon buildings (Kabukicho), lantern shops (Yokocho)
  const walls = { sky: [B.window_dark, B.polished, B.marble, B.concrete, B.stone_brick], kabuki: [B.concrete, B.dark_brick, B.red_brick, B.plaster, B.polished], yoko: [B.dark_planks, B.planks, B.plaster], shop: [B.concrete, B.marble, B.red_brick, B.polished] };
  let signs = 0;
  for (const L of lots) {
    if (L.used) continue;
    const w = W_(L), d = D_(L), dd = L.d;
    if (dd === 'sky') {
      const h = 50 + Math.floor(R.r() * 46), inset = 2;
      tower(R, L.x0 + inset, L.z0 + inset, w - inset * 2, d - inset * 2, h, { wall: walls.sky[Math.floor(R.r() * walls.sky.length)], glass: B.window, glass2: B.window_dark, col: 2 + Math.floor(R.r() * 2), lit: 0.35 + R.r() * 0.2, base: 2, setbacks: R.chance(0.6) ? [[Math.floor(h * 0.6), 2], [Math.floor(h * 0.85), 4]] : [], crown: ['helipad', 'antenna', 'helipad', 'pyramid', 'tank'][Math.floor(R.r() * 5)] });
      // forecourt planters
      planter(R, L.x0 + 1, L.z0 + 1, 'tree');
      continue;
    }
    const hR = { kabuki: [10, 28], yoko: [6, 9], shop: [14, 32] }[dd] ?? [10, 24];
    const h = Math.round(hR[0] + R.r() * (hR[1] - hR[0]));
    const list = walls[dd] ?? walls.shop;
    const t = tower(R, L.x0, L.z0, w, d, h, { wall: list[Math.floor(R.r() * list.length)], lit: dd === 'yoko' ? 0.8 : 0.5, col: 2 + Math.floor(R.r() * 3), base: 1, crown: h > 24 ? 'antenna' : 'tank', band: dd === 'yoko' ? 3 : 4 });
    const face = L.side, out = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[face];
    const fx = face === 'n' || face === 's' ? (L.x0 + L.x1) / 2 + 0.5 : (face === 'e' ? L.x1 + 1.06 : L.x0 - 0.06), fz = face === 'n' || face === 's' ? (face === 's' ? L.z1 + 1.06 : L.z0 - 0.06) : (L.z0 + L.z1) / 2 + 0.5;
    if ((dd === 'kabuki' || dd === 'yoko') && signs < 24 && R.chance(0.8)) { signs++; sign(R, fx, t.y + (dd === 'yoko' ? 3.2 : 5 + Math.floor(R.r() * 5)), fz, [SIGNS[Math.floor(R.r() * SIGNS.length)]], { w: dd === 'yoko' ? 3 : 3.6, h: 1.1, color: NEON[Math.floor(R.r() * NEON.length)], yaw: Math.atan2(out[0], out[1]), glow: 2.3 }); }
    if (dd === 'kabuki') { const ex = face === 'n' || face === 's' ? L.x0 + 1 : Math.floor(fx - out[0] * 1.06), ez = face === 'n' || face === 's' ? Math.floor(fz - out[1] * 1.06) : L.z0 + 1; neonBar(R, ex, t.y + 3, ez, Math.min(14, h - 4), [B.neon_pink, B.lantern, B.blue_energy, B.neon_pink][Math.floor(R.r() * 4)]); }
    if (dd === 'yoko') { R.deco.prop('paper_lantern', fx + out[0] * 0.4, t.y + 2.9, fz + out[1] * 0.4); W.addLight(fx + out[0], t.y + 2.5, fz + out[1], 0xff8a4a, 2.6, 7); }
  }
  // street lights, parked cars, crosswalks
  for (const s of [ST.yas, ST.kos, ST.meiji, ST.x40, ST.x100, ST.x154, ST.z60, ST.shin, ST.z64]) {
    const pts = s.pts, off = s.width / 2 + 0.6;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let t = 10; t < L - 8; t += 20) { const x = ax + ux * t, z = az + uz * t, side = (Math.round(t / 20) % 2) ? 1 : -1; const lx = x - uz * off * side, lz = z + ux * off * side; if (R.lock[R.i(Math.floor(lx), Math.floor(lz))] !== 2 && !(lz > 218 && lx < 240)) R.streetLight(lx, lz); }
      for (let t = 16; t < L - 10; t += 28) if (R.chance(0.45)) { const x = ax + ux * t, z = az + uz * t, side = R.chance(0.5) ? 1 : -1; const cx = x - uz * (s.width / 2 - 1.2) * side, cz = z + ux * (s.width / 2 - 1.2) * side; if (!(cz > 218 && cx < 240)) (R.chance(0.3) ? taxi : car)(R, cx, cz, Math.atan2(uz, ux) * -1 + (side > 0 ? 0 : Math.PI)); }
    }
  }
  C.zone(8, 8, 150, 210, { looks: LOOK_SETS.office, density: 0.9 });
  C.zone(250, 4, 348, 126, { looks: LOOK_SETS.kabukicho, density: 1.4 });
  C.zone(158, 92, 242, 108, { looks: LOOK_SETS.kabukicho, density: 1.6 });
  C.zone(4, 214, 242, 351, { density: 0 });
  C.spot(70, 196, { n: 5, r: 2.5, pose: 'chat', looks: LOOK_SETS.office }); C.spot(296, 112, { n: 4, r: 1.8, pose: 'chat', looks: LOOK_SETS.kabukicho }); C.spot(296, 64, { n: 4, r: 2, pose: 'phone', looks: LOOK_SETS.kabukicho });
  C.spot(200, 100, { n: 3, r: 1.2, pose: 'chat', looks: LOOK_SETS.kabukicho });
  C.huddle(128, 214, { n: 4, r: 2, pose: 'phone', face: Math.PI, to: [128, 200] });   // onlookers at the checkpoint (they stay put)
  for (const cw of C.autoLink({ radius: 13 })) zebra(R, cw[0], cw[1], 3);
  // world chests
  worldChest(R, 'crater', 112, 292, { rarity: 'rare' });
  worldChest(R, 'godzilla', 273, 26, { y: BASE + 41, rarity: 'rare' });
  worldChest(R, 'yokocho', 240, 98, { rarity: 'common' });
  worldChest(R, 'gyoen_isle', 320, 326, { rarity: 'common' });
  worldChest(R, 'eishu_yard', 172, 52, { rarity: 'common' });
  worldChest(R, 'slash_end', 228, 296, { rarity: 'common' });
  // ------------------------------------------------------------ people
  R.person({ id: 'sjk_tanabe', name: 'Mr. Tanabe (salaryman)', look: 'npc_civ_1', x: special.office ? Math.floor(special.office.door.x) + 2 : 120, z: special.office ? Math.floor(special.office.door.z) + 1 : 64, yaw: Math.PI, color: '#9ab0d8',
    lines: [['I left my laptop on the third floor. The presentation is tomorrow. There are MONSTERS on the third floor.']] });
  R.person({ id: 'sjk_ren', name: 'Ren (host)', look: 'npc_civ_2', x: 299, z: 114, yaw: -1.4, color: '#ffd84a',
    lines: [['Welcome to Kabukicho, darling. ...Okay, not tonight. Tonight something is eating my customers.']] });
  R.person({ id: 'sjk_gardener', name: 'Gardener Mori', look: 'npc_civ_3', x: 304, z: 232, yaw: Math.PI, color: '#8ad06a',
    lines: [['Gyoen closes at dusk. Not that the curses read the sign.']] });
  R.person({ id: 'sjk_aoki', name: 'Dr. Aoki (Window researcher)', look: 'npc_civ_5', x: 134, z: 222, yaw: Math.PI, color: '#c8a0ff',
    lines: [['The residue in those cuts is still warm. Weeks later. What kind of technique does that?']] });
  R.person({ id: 'sjk_police', name: 'Checkpoint Officer', look: 'npc_civ_3', x: 122, z: 222, yaw: Math.PI, color: '#7ab8ff',
    lines: [['Nobody past the tape without a Window pass. You have one? ...You\'re a KID. Fine. Go.']] });
  R.person({ id: 'sjk_busker', name: 'Street Busker', look: 'npc_civ_2', x: 168, z: 196, yaw: 2.6, pose: 'wave', color: '#ff9a5a',
    lines: [['This one\'s called "Gojo-sensei Is Fine, Probably." Requests are 100 yen.']] });
  R.person({ id: 'sjk_salary', name: 'Tired Salaryman', look: 'npc_civ_1', x: 72, z: 198, yaw: 0, color: '#c8c8c8',
    lines: [['The government building has an observation deck. I have never once had time to go up.']] });
  // ------------------------------------------------------------ curses: the levelled zone (and a few in Kabukicho's back alleys at night)
  R.roamZone(8, 222, 240, 344, { kinds: ['transfigured', 'swarmer', 'flyhead', 'gravekeeper', 'lantern', 'longneck', 'serpent', 'burrower'], level: 3, dense: true });
  R.roamZone(300, 71, 344, 119, { kinds: ['swarmer', 'shadow', 'flyhead'], level: 2 });
  R.safeZone(161, 135, 239, 205);
  R.safeZone(47, 186, 93, 205);
  R.safeZone(253, 220, 344, 344);
  W.collectBlockLights = () => fastBlockLights(W);
  const L = R.finish({
    spawn: [166, 176], biome: SHINJUKU_BIOME, sunOffset: new THREE.Vector3(-30, 40, 18),
    backdrop: { c0: 0x2a3446, c1: 0x7a8098, ground: 0x1a1e24, y: BASE - 14 },
    extra: { crowd: C.finish(), ...interiorsData(R), onLoad: (g, LL) => { cityView(g, LL, { radius: 5.5 }); Crowd.attach(g, LL); Interiors.attach(g, LL); } },
  });
  return L;
}

registerRegion('shinjuku', {
  name: 'Shinjuku', sub: 'Skyscrapers · the levelled district', kind: 'city', grid: [2, 1],
  color: '#3a4a7a', accent: '#a0b8ff', icon: '🏙',
  blurb: 'The towers of West Shinjuku, Kabukicho\'s neon, Gyoen\'s gardens — and the blocks Gojo and Sukuna levelled.',
  biome: SHINJUKU_BIOME, build,
});

void screen; void bench;
