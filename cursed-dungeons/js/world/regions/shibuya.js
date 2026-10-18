// Region 5 — shibuya: 31 October, 20:31. A curtain has dropped over the
// station district with the Halloween crowds inside. The Scramble Crossing
// (all four corners walk at once when the signals turn), Hachiko Square and
// the statue, Shibuya Station (an enterable concourse) with Scramble Square
// over it, the JR viaduct, the Fukutoshin Line entrance (chapter 2 of the
// arc: B5F), Shibuya 109 at the fork, Center Gai's pedestrian street of
// shops and karaoke boxes, Dogenzaka climbing the hill to the love hotels,
// Mark City, Miyashita Park, Meiji-dori and Route 246 under the Shuto
// expressway — and, south of 246, the blocks Sukuna's shrine levelled.
// Civilians: Halloween crowds everywhere (crowd.js); inside the curtain they
// are trapped (anxious, huddled, pounding on the curtain wall). Curse-infested
// buildings (interiors.js) with a pack per floor and a chest. Night is pinned.
// Gates: north (Jujutsu High), west (Sakurajima), east on 246 (Tokyo No. 1).
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B } from './common.js';
import { BIOMES } from '../biomes.js';
import { CrowdPlan, Crowd, LOOK_SETS } from '../../entities/crowd.js';
import { building, worldChest, interiorsData, Interiors, cityView } from '../interiors.js';
import { fastBlockLights, street, paintStreets, band, rect, zebra, tower, crater, slash, rubble, car, taxi, bench, planter, sign, neonBar, screen, viaduct } from './city_kit.js';

export const SHIBUYA_BIOME = {
  ...BIOMES.shibuya,
  name: 'Shibuya', sub: '31 October · under the curtain',
  skyTop: 0x0c0610, skyHorizon: 0x3a1620, fog: 0x2a1218, fogDensity: 0.011,
  look: {
    timeOfDay: 21.8,
    palette: { skyTop: 0x1a0a18, skyHorizon: 0x6a2a2a, fog: 0x4a1c22, sun: 0xff9a7a, hemiSky: 0xa07a8a, hemiGround: 0x2a1616 },
    fog: { density: 0.0085, sun: 0.35, height: 8, heightDensity: 0.02 },
    clouds: { coverage: 0.45, tint: 0x8a5a6a },
    grade: { tint: [1.05, 0.97, 0.97], sat: 1.16, contrast: 1.1, vignette: 0.3 },
    torch: 1, shafts: false,
  },
  ambience: 'city', music: 'shibuya', particles: 'embers', wind: 0.6,
};

const CUR = { x: 230, z: 190, r: 118 };   // the curtain over the station
const SIGNS = ['カラオケ', 'ラーメン', 'GAME', '居酒屋', 'BAR', '牛丼', 'CAFE', '寿司', 'ドラッグ', '24H', 'パチンコ', 'HOTEL', '古着', 'PURIKURA'];
const NEON = ['#ff6ac0', '#7ae0ff', '#ffd84a', '#9aff7a', '#ff8a4a', '#c08aff'];

function build(ctx) {
  const R = new RegionBuilder(ctx, { size: [352, 96, 352], base: 12 });
  const C = new CrowdPlan(R, { looks: LOOK_SETS.shibuya, density: 1.25, mood: null });
  const BASE = R.base;
  const N = R.noise;
  // ------------------------------------------------------------ plan: gates, streets, plazas, lots
  R.gate('n', 'jujutsu_high', { at: 150, road: false });
  R.gate('w', 'colony_sakurajima', { at: 176, road: false });
  R.gate('e', 'colony_tokyo1', { at: 240, road: false });
  const ST = {};
  ST.n = street(R, [[150, 1], [150, 163]], { width: 8, crowd: C, trim1: 1 });
  ST.w = street(R, [[1, 176], [137, 176]], { width: 8, crowd: C, trim1: 1 });
  ST.s = street(R, [[150, 189], [150, 351]], { width: 8, crowd: C, trim0: 1, trim1: 104 });
  ST.dg = street(R, [[139, 189], [126, 202], [110, 206], [8, 206]], { width: 8, crowd: C, y: 'follow', trim0: 1, trim1: 3 });
  ST.cg = street(R, [[142, 150], [62, 150]], { width: 6, walk: 0, block: B.red_brick, alt: B.polished, altP: 0.1, line: false });
  C.path([[142, 148.4], [64, 148.4]], { width: 1.4, step: 7, weight: 1.6 }); C.path([[142, 151.6], [64, 151.6]], { width: 1.4, step: 7, weight: 1.6 });
  ST.s11 = street(R, [[60, 100], [150, 100]], { width: 6, crowd: C, trim0: 6, trim1: 6 });
  ST.s12 = street(R, [[60, 1], [60, 176]], { width: 6, crowd: C, trim1: 6 });
  ST.s13 = street(R, [[150, 90], [286, 90]], { width: 6, crowd: C, trim0: 6, trim1: 7 });
  ST.s8 = street(R, [[150, 150], [286, 150]], { width: 6, crowd: C, trim0: 6, trim1: 7 });
  ST.meiji = street(R, [[286, 1], [286, 351]], { width: 8, crowd: C, trim1: 104 });
  ST.r246 = street(R, [[150, 240], [351, 240]], { width: 10, crowd: C, trim0: 6, trim1: 2 });
  ST.s14 = street(R, [[90, 206], [90, 344]], { width: 6, crowd: C, y: 'follow', trim0: 7 });
  ST.s15 = street(R, [[14, 270], [150, 270]], { width: 6, crowd: C, y: 'follow', trim1: 7 });
  ST.s16 = street(R, [[286, 60], [344, 60]], { width: 6, crowd: C, trim0: 7 });
  ST.s17 = street(R, [[286, 200], [344, 200]], { width: 6, crowd: C, trim0: 7 });
  // the Scramble Crossing: an asphalt square, a sidewalk ring
  R.flat(138, 164, 162, 188, { y: BASE, block: B.asphalt });
  R.flat(162, 154, 198, 203, { y: BASE });   // Hachiko Square
  R.flat(157, 96, 244, 144, { y: BASE });       // Miyashita Park
  R.flat(157, 20, 178, 70, { y: BASE });        // the evacuation point
  R.station('hachiko', 'Shibuya · Hachiko Exit', 190, 166, { y: BASE, facing: 'w' });
  R.station('evac', 'Evacuation Point', 168, 30, { y: BASE, facing: 'w' });
  R.station('dogenzaka', 'Dogenzaka-ue', 13, 221, { facing: 'n' });
  // main-quest curtains (chapters 5, 9, 6, 11, 10, 12 of the story)
  R.lair('m5', 150, 112, { y: BASE }); R.anchor('giver_m5', 160, 50);
  R.lair('m9', 264, 210, { y: BASE }); R.anchor('giver_m9', 272, 214);
  R.lair('m6', 150, 198, { y: BASE }); R.anchor('giver_m6', 138, 196);
  R.lair('m11', 40, 206, {}); R.anchor('giver_m11', 46, 214);
  R.lair('m10', 176, 205, { y: BASE }); R.anchor('giver_m10', 184, 204);
  R.anchor('giver_m12', 262, 266);
  // lots: [x0, z0, x1, z1, side the door faces]
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
      lots.push(L); R.flat(L.x0, L.z0, L.x1, L.z1, { y: o.y ?? 'auto' });
      a += len + (R.chance(0.35) ? 2 : 1);
    }
  };
  // north-west (outside the curtain): Center Gai, Inokashira-dori
  const QF = { x0: 118, z0: 154, x1: 135, z1: 168 };
  lotRow(67, 154, 116, 168, 'n', { tag: { d: 'cg' }, y: BASE });
  lotRow(67, 131, 142, 146, 's', { tag: { d: 'cg' }, y: BASE });
  lotRow(67, 107, 142, 122, 'n', { tag: { d: 'nw' }, y: BASE });
  lotRow(67, 70, 142, 93, 's', { tag: { d: 'nw' } });
  lotRow(67, 8, 142, 56, 's', { tag: { d: 'nw' }, min: 16, max: 26 });
  lotRow(8, 8, 53, 169, 'e', { tag: { d: 'res' }, min: 14, max: 22 });
  lotRow(8, 184, 104, 198, 's', { tag: { d: 'dg' } });
  // Dogenzaka hill
  lotRow(20, 214, 83, 230, 'n', { tag: { d: 'dg' } });
  lotRow(97, 214, 142, 230, 'n', { tag: { d: 'dg' } });
  lotRow(8, 238, 83, 263, 's', { tag: { d: 'hotel' } });
  lotRow(97, 238, 142, 263, 's', { tag: { d: 'hotel' } });
  lotRow(8, 277, 83, 344, 'n', { tag: { d: 'res' }, min: 16, max: 24 });
  lotRow(97, 277, 142, 344, 'n', { tag: { d: 'res' }, min: 16, max: 24 });
  // north / east
  lotRow(182, 8, 244, 83, 's', { tag: { d: 'nw' }, min: 16, max: 26 });
  lotRow(254, 8, 279, 83, 's', { tag: { d: 'nw' } });
  lotRow(254, 97, 279, 143, 'w', { tag: { d: 'nw' } });
  lotRow(293, 8, 344, 53, 'w', { tag: { d: 'tall' }, min: 16, max: 24 });
  lotRow(293, 67, 344, 140, 'w', { tag: { d: 'tall' }, min: 16, max: 24 });
  lotRow(293, 207, 344, 232, 'w', { tag: { d: 'tall' } });
  lotRow(326, 146, 344, 192, 'w', { tag: { d: 'tall' } });
  // the station complex and friends (explicit)
  const STN = { x0: 198, z0: 160, x1: 243, z1: 197 };
  const TKY = { x0: 198, z0: 204, x1: 243, z1: 231 };
  const MRK = { x0: 158, z0: 208, x1: 194, z1: 231 };
  const SCR = { x0: 256, z0: 158, x1: 278, z1: 186 };
  const HIK = { x0: 296, z0: 150, x1: 322, z1: 186 };
  for (const b of [STN, TKY, MRK, SCR, HIK, QF]) R.flat(b.x0, b.z0, b.x1, b.z1, { y: BASE });
  R.flat(106, 183, 122, 199, { y: BASE });     // Shibuya 109
  R.flat(254, 188, 279, 232, { y: BASE, block: B.polished, alt: B.stone_brick });   // the Fukutoshin plaza
  // ------------------------------------------------------------ terrain: the valley floor, Dogenzaka hill to the south-west
  R.terrain({
    falloff: 8,
    fn: (x, z) => {
      const hill = 9 * Math.max(0, Math.min(1, ((150 - x) * 0.8 + (z - 196)) / 120));
      const east = 2 * Math.max(0, Math.min(1, (x - 300) / 40));
      return BASE + hill + east + 0.6 * N.fbm(x * 0.03, z * 0.03, 2);
    },
  });
  R.carve({ top: B.concrete, sub: B.stone, rock: B.concrete, rock2: B.stone_brick, rockSlope: 3, topFn: () => (R.chance(0.1) ? B.stone_brick : B.concrete) });
  R.paveRoads();
  paintStreets(R);
  const W = R.world;
  // the crossing: sidewalk ring, scramble zebras (all four sides and both diagonals)
  band(R, [[136.5, 162.5], [163.5, 162.5], [163.5, 189.5], [136.5, 189.5], [136.5, 162.5]], -0.1, 2.2, B.concrete, { over: true });
  const NW = [139, 165], NE = [161, 165], SE = [161, 187], SWc = [139, 187];
  for (const [a, b, wd] of [[NW, NE, 4], [NW, SWc, 4], [SWc, SE, 4], [NW, SE, 3], [NE, SWc, 3]]) { if (wd === 4) zebra(R, a, b, wd); else { band(R, [a, b], 1.2, 1.7, B.marble, { over: true }); } C.cross(a, b, 'all', { width: wd - 0.4, weight: 2 }); }
  C.path([NE, [166, 165], [166, 187], SE], { width: 2, step: 7 });
  for (const [x, z, yaw] of [[137, 163, 0.8], [163, 163, -0.8], [163, 189, -2.3], [137, 189, 2.3]]) C.signal(x + 0.5, z + 0.5, 'all', yaw);
  C.phases([{ walk: ['all', 'ns'], t: 15 }, { walk: [], t: 4 }, { walk: ['ew'], t: 10 }, { walk: [], t: 3 }]);
  rect(R, 162, 154, 198, 203, (x, z) => ((x - 162) % 6 === 0 || (z - 154) % 6 === 0 ? B.stone_brick : B.polished));
  // corners into the ring
  C.path([[144.5, 160], NW], { width: 2 }); C.path([[155.5, 160], NE], { width: 2 });
  C.path([[134, 170.5], NW], { width: 2 }); C.path([[134, 181.5], SWc], { width: 2 });
  C.path([[144.5, 192], SWc], { width: 2 }); C.path([[155.5, 192], SE], { width: 2 });
  // Hachiko Square paths
  C.path([[166, 157], [194, 157]], { width: 3 }); C.path([[166, 176], [196, 176]], { width: 4, weight: 2 }); C.path([[166, 200], [196, 200]], { width: 3 });
  C.path([[180, 157], [180, 200]], { width: 4 }); C.path([[196, 157], [196, 200]], { width: 3 });
  C.path([[166, 157], [155.5, 155.5]], { width: 2 }); C.path([[196, 157], [197, 155.5]], { width: 2 });
  C.path([[166, 200], [160, 205], [157, 205], [155.5, 210]], { width: 2 });
  // Miyashita Park paths
  C.path([[160, 140], [200, 120], [240, 104]], { width: 2.5, step: 7 }); C.path([[160, 104], [200, 120], [240, 140]], { width: 2.5, step: 7 });
  C.path([[160, 140], [160, 104]], { width: 2 }); C.path([[240, 140], [240, 104]], { width: 2 });
  for (const [a, b] of [[[160, 140], [160, 144.5]], [[240, 140], [240, 144.5]], [[160, 104], [160, 95.5]], [[240, 104], [240, 95.5]]]) C.path([a, b], { width: 2 });
  // the Fukutoshin plaza
  C.path([[258, 191], [276, 191], [276, 230], [258, 230], [258, 191]], { width: 3 });
  C.path([[258, 191], [256, 188]], { width: 2 }); C.path([[276, 230], [279.5, 233.5]], { width: 2 }); C.path([[276, 191], [279.5, 191]], { width: 2 });

  // ------------------------------------------------------------ the curtain zone moods
  C.zone(CUR.x - 84, CUR.z - 84, CUR.x + 84, CUR.z + 84, { mood: 'trapped' });
  C.zone(130, 150, 200, 205, { mood: 'trapped', density: 2.2 });
  C.zone(60, 144, 146, 156, { density: 1.8 });
  C.zone(157, 247, 351, 351, { density: 0 });   // the levelled blocks: no one walks there
  // ------------------------------------------------------------ landmarks
  // Shibuya Station (enterable concourse) and its big sign
  const stn = building(R, { id: 'station', name: 'Shibuya Station', x0: STN.x0, z0: STN.z0, w: STN.x1 - STN.x0 + 1, d: STN.z1 - STN.z0 + 1, floors: 3, door: 'w', doorAt: 0.45,
    kinds: ['concourse', 'shop', 'shop'], labels: ['JR Concourse', 'Tokyu Food Show', 'Department Store'], wall: B.concrete, trim: B.concrete_pillar, win: B.window, awning: 0x3a6a2a, poi: { icon: '🚉' } });
  sign(R, STN.x0 - 0.1, BASE + 6.5, (STN.z0 + STN.z1) / 2, ['渋谷駅', 'SHIBUYA STATION'], { w: 10, h: 3, color: '#ffffff', bg: 'rgba(20,90,40,0.95)', yaw: -Math.PI / 2, glow: 2 });
  // Scramble Square tower over it
  tower(R, SCR.x0, SCR.z0, SCR.x1 - SCR.x0 + 1, SCR.z1 - SCR.z0 + 1, 80, { glass: B.window, glass2: B.window_dark, lit: 0.55, col: 2, base: 3, setbacks: [[60, 2], [72, 4]], crown: 'helipad', wall: B.polished, trim: B.concrete_pillar });
  R.poi('scramble_square', 'Shibuya Scramble Square', '🏙', 267, 172, 'landmark');
  // the JR viaduct, north to south between the station and the tower
  viaduct(R, [[250, 1], [250, 351]], { y: BASE + 9, width: 6, rail: true, every: 12, lights: true });
  // Tokyu (food hall, café) and Mark City
  building(R, { id: 'tokyu', name: 'Tokyu Plaza', x0: TKY.x0, z0: TKY.z0, w: TKY.x1 - TKY.x0 + 1, d: TKY.z1 - TKY.z0 + 1, floors: 3, door: 'n', kinds: ['store', 'cafe', 'gym'], sign: { text: ['TOKYU PLAZA'], color: '#ff8a4a' } });
  building(R, { id: 'markcity', name: 'Shibuya Mark City', x0: MRK.x0, z0: MRK.z0, w: MRK.x1 - MRK.x0 + 1, d: MRK.z1 - MRK.z0 + 1, floors: 4, door: 'n', kinds: ['lobby', 'shop', 'cafe', 'office'], sign: { text: ['MARK CITY'], color: '#9ad8ff' }, poi: { icon: '🏬' } });
  // Q-Front: the screens over the crossing (a café on the ground floor looks out on it)
  building(R, { id: 'qfront', name: 'Q-Front', x0: QF.x0, z0: QF.z0, w: QF.x1 - QF.x0 + 1, d: QF.z1 - QF.z0 + 1, floors: 4, door: 's', doorAt: 0.7, kinds: ['cafe', 'shop', 'shop', 'office'], labels: ['Café over the crossing', 'Records', 'Books', 'Offices'], wall: B.polished, win: B.window, sign: { text: ['Q FRONT'], color: '#7ae0ff' }, poi: { icon: '📺' } });
  screen(R, QF.x1 + 1.05, BASE + 12, (QF.z0 + QF.z1) / 2, 12, 7, ['HAPPY', 'HALLOWEEN'], { yaw: Math.PI / 2, color: '#ffb04a' });
  screen(R, (QF.x0 + QF.x1) / 2 + 2, BASE + 13, QF.z1 + 1.05, 10, 6, ['渋谷', '10.31'], { yaw: 0, color: '#ff6ac0' });
  // more screens round the crossing
  screen(R, 143.9, BASE + 14, 128, 9, 5, ['20:31'], { yaw: Math.PI / 2, color: '#ff5a5a' });
  screen(R, 156.1, BASE + 16, 128, 9, 5, ['NEWS', '渋谷 帳'], { yaw: -Math.PI / 2, color: '#9af0ff' });
  // Shibuya 109: the silver cylinder at the fork
  {
    const cx = 114, cz = 191, y = BASE, h = 44;
    for (let z = cz - 8; z <= cz + 8; z++) for (let x = cx - 8; x <= cx + 8; x++) {
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (d > 7.6) continue;
      const ang = Math.atan2(z + 0.5 - cz, x + 0.5 - cx), seg = Math.floor((ang + Math.PI) / (Math.PI * 2) * 28);
      for (let yy = y; yy < y + h; yy++) {
        const lvl = (yy - y) % 4;
        if (d > 6.6) W.set(x, yy, z, seg % 4 === 0 ? B.polished : (yy - y < 4 ? (lvl < 3 ? B.window : B.polished) : (lvl === 0 ? B.polished : (seg % 2 ? B.window : B.window_dark))));
        else W.set(x, yy, z, B.concrete);
      }
      if (d < 5.2) for (let yy = y + h; yy < y + h + 6; yy++) W.set(x, yy, z, d > 4.2 ? (yy === y + h + 2 ? B.neon_pink : B.polished) : B.concrete);
    }
    sign(R, cx + 5.4, y + h + 3, cz - 5.4, ['SHIBUYA109'], { w: 7, h: 1.6, color: '#ffffff', bg: 'rgba(30,30,36,0.95)', yaw: Math.PI * 0.75, glow: 2.4 });
    sign(R, cx + 6.2, y + 22, cz - 6.2, ['1', '0', '9'], { w: 2.4, h: 9, color: '#ff6ac0', yaw: Math.PI * 0.75, glow: 2.6, font: 'bold 150px "Pixelify Sans", sans-serif' });
    R.reserve(cx - 9, cz - 9, cx + 9, cz + 9, 2);
    R.poi('109', 'Shibuya 109', '🛍', cx, cz, 'landmark');
    R.anchor('109', cx + 6, cz - 10);
  }
  // Hikarie
  tower(R, HIK.x0, HIK.z0, HIK.x1 - HIK.x0 + 1, HIK.z1 - HIK.z0 + 1, 66, { glass: B.window, glass2: B.window_dark, col: 2, base: 2, setbacks: [[40, 2]], crown: 'antenna', wall: B.marble, lit: 0.5 });
  R.poi('hikarie', 'Shibuya Hikarie', '🏢', 309, 168, 'landmark');
  // Hachiko Square: the statue, the green train car, trees, benches
  {
    const y = BASE, hx = 172, hz = 168;
    W.fill(hx - 1, y, hz - 1, hx + 1, y + 1, hz + 1, B.stone_brick);
    const P = R.props, br = 0x7a6440;
    P.box(hx + 0.5, y + 2, hz + 0.5, 0.7, 0.75, 1.5, br); P.box(hx + 0.5, y + 2.4, hz + 1.2, 0.55, 0.9, 0.55, br);
    P.box(hx + 0.5, y + 3.15, hz + 1.45, 0.5, 0.45, 0.55, br); P.box(hx + 0.35, y + 3.6, hz + 1.3, 0.12, 0.18, 0.1, br); P.box(hx + 0.65, y + 3.6, hz + 1.3, 0.12, 0.18, 0.1, br);
    for (const [dx, dz] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]]) P.box(hx + 0.5 + dx, y + 2, hz + 0.5 + dz, 0.16, 0.0001 + 0.02, 0.16, br);
    P.box(hx + 0.5, y + 2.55, hz - 0.3, 0.14, 0.14, 0.45, br, { rx: -0.6 });
    sign(R, hx + 0.5, y + 1.0, hz + 1.56, ['忠犬ハチ公'], { w: 1.4, h: 0.4, color: '#e8d8a0', bg: 'rgba(40,30,20,0.95)', glow: 1.2 });
    R.poi('hachiko', 'Hachiko Statue', '🐕', hx, hz, 'landmark');
    R.anchor('hachiko', hx + 3, hz + 4);
    // Aogaeru: the old green train car
    const ax = 186, az = 196;
    P.box(ax, y, az, 9, 0.6, 2.8, 0x2a2a2a); P.box(ax, y + 0.6, az, 9, 2.4, 2.8, 0x4a9a4a); P.box(ax, y + 1.6, az, 9.05, 0.8, 2.85, 0xd8e8c8, { emit: 0.8 });
    P.box(ax, y + 3.0, az, 9.2, 0.25, 3.0, 0x3a7a3a);
    for (let x = ax - 4; x <= ax + 4; x++) for (let z = az - 1; z <= az + 1; z++) { W.set(Math.floor(x), y, Math.floor(z), B.barrier); W.set(Math.floor(x), y + 1, Math.floor(z), B.barrier); }
    R.poi('aogaeru', 'Aogaeru Car', '🚃', ax, az, 'landmark');
    for (const [x, z] of [[168, 186], [176, 158], [194, 186]]) planter(R, x, z, 'tree');
    bench(R, 176, 180, 0); bench(R, 186, 178, 0); bench(R, 170, 192, Math.PI / 2);
    for (let x = 166; x <= 196; x += 10) { R.streetLight(x + 0.5, 160.5); R.streetLight(x + 0.5, 198.5); }
  }
  // the Fukutoshin Line entrance: a glass kiosk with stairs going down
  {
    const y = BASE, kx = 260, kz = 197;
    for (let x = kx; x <= kx + 6; x++) for (let z = kz; z <= kz + 4; z++) { const edge = x === kx || x === kx + 6 || z === kz || z === kz + 4; if (edge && !(z === kz + 4 && x > kx && x < kx + 6)) for (let yy = y; yy < y + 3; yy++) W.set(x, yy, z, yy === y + 2 ? B.concrete : B.window); W.set(x, y + 3, z, B.concrete); }
    for (let k = 0; k < 4; k++) for (let x = kx + 2; x <= kx + 4; x++) { const z = kz + 3 - k; W.set(x, y - 1 - k, z, B.subway_floor); for (let yy = y - k; yy < y + 3; yy++) if (yy < y) W.set(x, yy, z, 0); }
    W.fill(kx + 2, y - 6, kz - 1, kx + 4, y - 5, kz, B.subway_floor);
    W.addLight(kx + 3.5, y + 2, kz + 2.5, 0x9af0ff, 3, 8);
    sign(R, kx + 3.5, y + 4.2, kz + 4.6, ['副都心線 F', 'FUKUTOSHIN LINE'], { w: 5, h: 1.4, color: '#c8a070', bg: 'rgba(30,24,16,0.95)' });
    R.poi('fukutoshin', 'Fukutoshin Line Entrance', 'Ⓕ', kx + 3, kz + 2, 'lair');
    R.reserve(kx - 1, kz - 1, kx + 7, kz + 5, 2);
  }
  // Center Gai arch
  {
    const y = BASE, x = 141;
    for (const z of [146, 154]) for (let yy = y; yy < y + 6; yy++) W.set(x, yy, z, B.metal_grate);
    R.props.box(x + 0.5, y + 6, 150.5, 0.6, 1.4, 9.4, 0x1a1a24);
    sign(R, x + 0.85, y + 6.7, 150.5, ['センター街', 'CENTER GAI'], { w: 7, h: 1.3, color: '#ffe04a', yaw: Math.PI / 2, glow: 2.4 });
    R.poi('centergai', 'Center Gai', '🏮', 100, 150, 'landmark');
    R.anchor('centergai', 104, 150);
    for (let xx = 70; xx <= 138; xx += 6) { R.props.box(xx + 0.5, y + 4.4, 150.5, 0.05, 0.05, 7, 0x1a1a1a); for (const z of [148, 150.5, 153]) R.deco.prop('paper_lantern', xx + 0.5, y + 3.7, z); if (xx % 12 === 4) W.addLight(xx + 0.5, y + 3.4, 150.5, 0xff8a4a, 3, 8); }
  }
  // Miyashita Park: lawn, trees, a skate bowl
  {
    rect(R, 157, 97, 244, 143, (x, z) => ((x + z) % 9 === 0 ? B.moss_floor : B.grass));
    R.forest({ kinds: ['oak', 'sakura', 'oak'], density: 0.5, step: 6, rect: [160, 99, 242, 141] });
    const sx = 222, sz = 132; for (let z = sz - 4; z <= sz + 4; z++) for (let x = sx - 6; x <= sx + 6; x++) { const d = Math.hypot((x - sx) / 6, (z - sz) / 4); if (d < 1) W.setRaw(x, R.hAt(x, z) - 1 - (d < 0.7 ? 1 : 0), z, B.polished); if (d < 0.7) W.setRaw(x, R.hAt(x, z) - 1, z, 0); }
    sign(R, 158.5, BASE + 2.5, 120, ['MIYASHITA PARK'], { w: 6, h: 1.1, color: '#9aff7a', yaw: -Math.PI / 2 });
    R.poi('miyashita', 'Miyashita Park', '🌳', 200, 120, 'landmark');
    R.anchor('miyashita', 200, 124);
    R.scatter({ x0: 158, z0: 98, x1: 243, z1: 142, density: 0.18, types: ['grass', 'flower_red', 'flower_blue', 'grass'] });
  }
  // the evacuation point (outside the curtain): Nitta's car, police tape, an ambulance
  {
    const y = BASE;
    car(R, 158, 46, 0.1, 0x1a1a1a); car(R, 166, 52, -0.3, 0xf4f4f4); taxi(R, 156, 58, 1.4);
    R.props.box(171, y, 40, 4.4, 2.4, 2.2, 0xf4f4f4); R.props.box(171, y + 2.4, 40, 0.8, 0.3, 0.6, 0xff3a3a, { emit: 3 });
    for (let x = 140; x <= 160; x += 2) R.props.box(x, y + 0.9, 70, 2, 0.1, 0.05, 0xffd84a, { emit: 0.4 });
    R.poi('evac', 'Evacuation Point', '🚑', 160, 44, 'camp');
    R.anchor('evac', 160, 48);
  }
  // ------------------------------------------------------------ the levelled blocks south of Route 246 (Malevolent Shrine)
  const ruins = [];
  {
    // stumps of sliced towers
    const stumps = [[164, 254, 18, 16, 40], [196, 256, 22, 18, 52], [230, 252, 16, 16, 34], [296, 254, 20, 20, 46], [318, 290, 20, 18, 30], [166, 300, 16, 18, 28], [200, 318, 18, 18, 36], [298, 322, 22, 18, 40]];
    for (const [x0, z0, w, d, h] of stumps) {
      const cut = BASE + 6 + Math.floor(R.r() * 14), a = R.r() * Math.PI * 2;
      tower(R, x0, z0, w, d, h, { hollow: true, lit: 0.04, glass: B.window_dark, glass2: B.cracked_brick, wall: R.chance(0.5) ? B.concrete : B.cracked_brick, crown: 'none', slice: { p: [x0 + w / 2, cut, z0 + d / 2], n: [Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5] } });
      ruins.push([x0 + w / 2, z0 + d / 2]);
    }
  }
  crater(R, 250, 300, 24, 7, { lining: [B.obsidian, B.cracked_brick, B.blood_brick, B.stone] });
  crater(R, 182, 282, 9, 3); crater(R, 330, 262, 8, 3); crater(R, 220, 336, 10, 4);
  slash(R, [158, 262], [300, 338], { width: 1.3, depth: 2, height: 30 });
  slash(R, [340, 250], [210, 344], { width: 1.1, depth: 2, height: 30 });
  slash(R, [160, 330], [344, 280], { width: 1.0, depth: 2, height: 24 });
  for (let k = 0; k < 14; k++) rubble(R, 160 + R.r() * 180, 250 + R.r() * 95, 6, 14);
  R.anchor('ruins', 250, 278); R.poi('levelled', 'The Levelled Blocks', '💥', 250, 300, 'ruin');
  R.anchor('crater', 250, 300);
  R.anchor('lair_m12', 250, 296); R.lairs.push({ id: 'm12', x: 250, z: 296, kind: 'curtain' });   // King of Curses: the levelled crossing
  // the Shuto expressway over 246 (broken over the levelled blocks)
  viaduct(R, [[100, 240], [262, 240]], { y: BASE + 11, width: 8, lane: true, every: 14, lights: true });
  viaduct(R, [[278, 240], [300, 240]], { y: BASE + 11, width: 8, lane: true, every: 14 });
  viaduct(R, [[316, 240], [351, 240]], { y: BASE + 11, width: 8, lane: true, every: 14, lights: true });
  // ------------------------------------------------------------ buildings in the lots
  const special = {};
  // named / infested interiors, by the district row they're in
  const pickLot = (pred) => { const L = lots.find((l) => !l.used && pred(l)); if (L) L.used = true; return L; };
  const lot = (pred, fn) => { const L = pickLot(pred); if (L) fn(L); return L; };
  const W_ = (L) => L.x1 - L.x0 + 1, D_ = (L) => L.z1 - L.z0 + 1;
  lot((l) => l.d === 'cg' && l.side === 'n' && l.x0 > 80, (L) => { special.konbini = building(R, { id: 'cg_konbini', name: 'Center Gai Konbini', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 2, door: 'n', kinds: ['store', 'apartment'], sign: { text: ['24H KONBINI'], color: '#7ae0ff' }, awning: 0x2a8a5a }); });
  lot((l) => l.d === 'cg' && l.side === 's' && l.x0 > 90, (L) => { special.karaoke = building(R, { id: 'cg_karaoke', name: 'Karaoke Kan', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 3, door: 's', kinds: ['karaoke', 'karaoke', 'karaoke'], sign: { text: ['カラオケ館'], color: '#ff6ac0' }, infested: { level: 3, floors: [{ n: 4, kinds: ['swarmer', 'flyhead', 'swarmer'] }, { n: 4, kinds: ['longneck', 'swarmer', 'flyhead'] }, { n: 3, kinds: ['doll', 'spitter'] }] }, poi: { icon: '☠' } }); });
  lot((l) => l.d === 'cg' && l.side === 's' && l.x0 < 90, (L) => { building(R, { id: 'cg_cafe', name: 'Udagawa Café', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 2, door: 's', kinds: ['cafe', 'apartment'], sign: { text: ['CAFE'], color: '#ffd84a' } }); });
  lot((l) => l.d === 'dg' && l.z0 >= 214 && l.x0 >= 97, (L) => { special.dgz = building(R, { id: 'dgz_tower', name: 'Dogenzaka Tower', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 4, door: 'n', kinds: ['lobby', 'office', 'office', 'storage'], quest: 'sq_shibuya_floors', infested: { level: 3, floors: [{ n: 4, kinds: ['swarmer', 'transfigured'] }, { n: 4, kinds: ['transfigured', 'spitter', 'swarmer'] }, { n: 4, kinds: ['grasshopper', 'swarmer', 'flyhead'] }, { n: 3, kinds: ['tank', 'transfigured'], elite: 'armored' }], reward: { coins: 160, xp: 220, items: 1, rarity: 'rare' } }, poi: { icon: '🏢' } }); });
  lot((l) => l.d === 'hotel' && l.x0 < 60, (L) => { building(R, { id: 'love_hotel', name: 'Hotel Moonlight', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 3, door: 's', kinds: ['lobby', 'apartment', 'apartment'], wall: B.red_brick, sign: { text: ['HOTEL ☾'], color: '#ff6ac0' }, infested: { level: 3, floors: [{ n: 3, kinds: ['shadow', 'swarmer'] }, { n: 4, kinds: ['teleporter', 'swarmer'] }, { n: 3, kinds: ['gravekeeper', 'flyhead'] }] }, poi: { icon: '☠' } }); });
  lot((l) => l.d === 'nw' && l.z0 < 60 && l.x0 > 150, (L) => { building(R, { id: 'jingumae_office', name: 'Jingumae Building', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 3, door: 's', kinds: ['lobby', 'office', 'gym'], infested: { level: 3, floors: [{ n: 4, kinds: ['swarmer', 'spitter'] }, { n: 4, kinds: ['burrower', 'swarmer'] }, { n: 3, kinds: ['lantern', 'swarmer'] }] }, poi: { icon: '☠' } }); });
  lot((l) => l.d === 'nw' && l.side === 'n', (L) => { building(R, { id: 'inokashira_shop', name: 'Inokashira Records', x0: L.x0, z0: L.z0, w: W_(L), d: D_(L), floors: 2, door: 'n', kinds: ['shop', 'cafe'], sign: { text: ['RECORDS'], color: '#c08aff' } }); });
  // the rest: solid buildings, with shopfront glass, signs and neon in the busy districts
  const walls = [B.concrete, B.plaster, B.red_brick, B.dark_brick, B.stone_brick, B.marble, B.polished];
  let signs = 0;
  for (const L of lots) {
    if (L.used) continue;
    const w = W_(L), d = D_(L);
    const hRange = { cg: [10, 26], dg: [12, 30], hotel: [10, 22], nw: [14, 40], res: [8, 20], tall: [30, 60] }[L.d] ?? [12, 30];
    const h = Math.round(hRange[0] + R.r() * (hRange[1] - hRange[0]));
    const t = tower(R, L.x0 + (R.chance(0.3) ? 1 : 0), L.z0, w - (R.chance(0.3) ? 1 : 0), d, h, { wall: walls[Math.floor(R.r() * walls.length)], lit: L.d === 'res' ? 0.6 : 0.42, col: 2 + Math.floor(R.r() * 3), base: 1, crown: h > 34 ? (R.chance(0.5) ? 'helipad' : 'antenna') : 'tank', setbacks: h > 30 && R.chance(0.5) ? [[h - 8, 2]] : [] });
    // shop signs and neon on the street face
    const busy = L.d === 'cg' || L.d === 'dg' || L.d === 'hotel';
    const face = L.side, out = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[face];
    const fx = face === 'n' || face === 's' ? (L.x0 + L.x1) / 2 + 0.5 : (face === 'e' ? L.x1 + 1.06 : L.x0 - 0.06), fz = face === 'n' || face === 's' ? (face === 's' ? L.z1 + 1.06 : L.z0 - 0.06) : (L.z0 + L.z1) / 2 + 0.5;
    if (busy && signs < 22 && R.chance(0.7)) {
      signs++;
      sign(R, fx, t.y + 5 + Math.floor(R.r() * 4), fz, [SIGNS[Math.floor(R.r() * SIGNS.length)]], { w: 3.6, h: 1.1, color: NEON[Math.floor(R.r() * NEON.length)], yaw: Math.atan2(out[0], out[1]), glow: 2.2 });
    }
    if (busy) { const ex = face === 'n' || face === 's' ? L.x0 + 1 : Math.floor(fx - out[0] * 1.06), ez = face === 'n' || face === 's' ? Math.floor(fz - out[1] * 1.06) : L.z0 + 1; neonBar(R, ex, t.y + 4, ez, Math.min(10, h - 6), [B.neon_pink, B.lantern, B.blue_energy][Math.floor(R.r() * 3)]); }
  }
  // street lights and parked cars along the main streets
  for (const s of [ST.n, ST.w, ST.s, ST.meiji, ST.r246, ST.s8, ST.s13]) {
    const pts = s.pts, off = s.width / 2 + 0.6;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let t = 10; t < L - 8; t += 18) { const x = ax + ux * t, z = az + uz * t; const side = (Math.round(t / 18) % 2) ? 1 : -1; const lx = x - uz * off * side, lz = z + ux * off * side; if (R.lock[R.i(Math.floor(lx), Math.floor(lz))] !== 2 && !(lz > 247 && lx > 156)) R.streetLight(lx, lz); }
      for (let t = 14; t < L - 10; t += 26) if (R.chance(0.5)) { const x = ax + ux * t, z = az + uz * t, side = R.chance(0.5) ? 1 : -1; const cx = x - uz * (s.width / 2 - 1.2) * side, cz = z + ux * (s.width / 2 - 1.2) * side; if (!(cz > 247 && cx > 156)) (R.chance(0.3) ? taxi : car)(R, cx, cz, Math.atan2(uz, ux) * -1 + (side > 0 ? 0 : Math.PI)); }
    }
  }
  // abandoned cars in the crossing (the curtain fell at rush hour) and a burnt-out one by 109
  car(R, 146, 172, 0.4, 0xd8d8d8); taxi(R, 156, 182, -0.3); car(R, 158, 168, 1.9, 0x8a1a1a);
  // world chests (secrets)
  worldChest(R, '109_back', 104, 200, { rarity: 'common' });
  worldChest(R, 'crater', 252, 298, { rarity: 'rare' });
  worldChest(R, 'miyashita', 232, 100, { rarity: 'common' });
  worldChest(R, 'dogenzaka_alley', 86, 236, { rarity: 'common' });
  worldChest(R, 'evac_alley', 140, 30, { rarity: 'common' });
  if (special.dgz) worldChest(R, 'dgz_roof', special.dgz.x0 + 9, special.dgz.z0 + 6, { y: special.dgz.top, rarity: 'rare' });

  // ------------------------------------------------------------ civilians: still groups and the trapped
  C.spot(172, 172, { n: 6, r: 2.6, pose: 'chat' });          // meeting at Hachiko
  C.spot(178, 188, { n: 4, r: 2, pose: 'phone' });
  C.spot(110, 150, { n: 5, r: 2, pose: 'cheer' }); C.spot(84, 150, { n: 4, r: 1.8, pose: 'cheer' });
  C.spot(196, 118, { n: 4, r: 2, pose: 'chat' }); C.spot(176, 205, { n: 3, r: 1.5, pose: 'phone' });
  C.spot(164, 40, { n: 6, r: 3, pose: 'phone' });             // evacuees at the cars
  C.huddle(150, 106, { n: 6, r: 3, pose: 'bang', face: Math.PI, to: [158, 48] });
  C.huddle(117, 176, { n: 5, r: 2.5, pose: 'bang', face: -Math.PI / 2, to: [100, 176] });
  C.huddle(286, 92, { n: 5, r: 2.5, pose: 'bang', face: Math.PI, to: [286, 60] });
  C.huddle(186, 162, { n: 5, r: 2, pose: 'cower', to: [158, 48] });
  C.huddle(246, 236, { n: 4, r: 2, pose: 'cower', to: [150, 236] });
  C.huddle(205, 205, { n: 4, r: 2, pose: 'cower', to: [158, 48] });
  // dead ends of sidewalks join their neighbours (and become crosswalks over roads)
  const inSquare = (x, z) => x > 130 && x < 170 && z > 155 && z < 197;
  for (const cw of C.autoLink({ radius: 11, group: (x, z) => (inSquare(x, z) ? 'all' : null) })) if (!inSquare((cw[0][0] + cw[1][0]) / 2, (cw[0][1] + cw[1][1]) / 2)) zebra(R, cw[0], cw[1], 3);
  R.anchor('crossing', 150, 176, BASE);
  R.poi('crossing', 'Scramble Crossing', '🚦', 150, 176, 'landmark');
  R.anchor('huddle_109', 118, 178);
  R.anchor('dogenzaka_mid', 96, 206);
  R.anchor('mark_city', 176, 205);
  // halloween collectibles (side quest)
  R.anchor('pumpkin_0', 108, 202); R.anchor('pumpkin_1', 70, 154); R.anchor('pumpkin_2', 236, 138); R.anchor('pumpkin_3', 196, 204);

  // ------------------------------------------------------------ people (quest givers and residents)
  R.person({ id: 'sby_kaneda', name: 'Officer Kaneda', look: 'npc_civ_3', x: 164, z: 56, yaw: Math.PI, color: '#7ab8ff',
    lines: [['Nobody can get OUT of that thing. People walk in and the curtain just... keeps them.', 'We\'re pulling out whoever reaches the edge. The rest is up to you lot.']] });
  R.person({ id: 'sby_hoshino', name: 'Mrs. Hoshino', look: 'npc_civ_4', x: 168, z: 176, yaw: 2.2, pose: 'idle', color: '#e8b0c0',
    lines: [['Yuuki! Has anyone seen a little boy in a pumpkin costume?']] });
  R.person({ id: 'sby_oda', name: 'Mr. Oda (building manager)', look: 'npc_civ_1', x: 0, z: 0, yaw: 0, color: '#d8c87a',
    lines: [['My building... there are things on every floor. My tenants got out through the fire stairs. Barely.']] });
  R.person({ id: 'sby_rina', name: 'Window Agent Rina', look: 'npc_nitta', x: 198, z: 146, yaw: 0, color: '#9af0ff',
    lines: [['Halloween decorations are soaking up cursed energy tonight. Everybody\'s fear is going somewhere.']] });
  R.person({ id: 'sby_nobara', name: 'Nobara Kugisaki', look: 'nobara', x: 124, z: 182, yaw: -0.8, color: '#ffa050',
    lines: [['Shibuya on Halloween. I wanted to come here for shopping, you know. SHOPPING.'], ['Whatever. Hammer time.']] });
  R.person({ id: 'sby_dj', name: 'DJ Police Officer', look: 'npc_civ_3', x: 146, z: 160, yaw: 2.4, color: '#ffd27a', pose: 'wave',
    lines: [['Please stay calm! Do not run! Do not... okay, run. Run is fine.']] });
  R.person({ id: 'sby_ghost', name: 'Kid in a Ghost Costume', look: 'npc_civ_0', x: 92, z: 154, yaw: 0, pose: 'wander', wander: 4, color: '#f2f2f2',
    lines: [['I\'m a ghost! Boo! ...Why is everyone screaming for real?']] });
  R.person({ id: 'sby_vendor', name: 'Takoyaki Vendor', look: 'npc_civ_1', x: 192, z: 182, yaw: -1.6, color: '#ff9a5a',
    lines: [['Curtain or no curtain, the takoyaki stays hot. Eight for 500 yen. You look like you need it.']] });
  if (special.dgz) { const p = R.people.find((q) => q.id === 'sby_oda'); p.x = Math.floor(special.dgz.door.x) + 2; p.z = Math.floor(special.dgz.door.z) - 1; p.yaw = Math.PI; }
  else R.people.splice(R.people.findIndex((q) => q.id === 'sby_oda'), 1);

  // ------------------------------------------------------------ curses
  R.roamZone(157, 247, 344, 344, { kinds: ['transfigured', 'transfigured', 'swarmer', 'grasshopper', 'longneck', 'doll', 'flyhead'], level: 3, dense: true });
  R.roamZone(8, 214, 142, 344, { kinds: ['transfigured', 'swarmer', 'flyhead', 'shadow', 'spitter'], level: 3 });
  R.roamZone(200, 8, 344, 146, { kinds: ['transfigured', 'swarmer', 'flyhead', 'grasshopper'], level: 3 });
  R.roamZone(254, 150, 344, 240, { kinds: ['transfigured', 'swarmer', 'flyhead', 'lantern'], level: 3 });
  R.roamZone(8, 8, 142, 140, { kinds: ['swarmer', 'flyhead', 'spitter'], level: 2 });
  R.safeZone(140, 16, 180, 72);
  // the curtain itself: a black dome over the station district
  R.deco.extra(() => {
    const g = new THREE.SphereGeometry(CUR.r, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const m = new THREE.MeshBasicNodeMaterial({ color: 0x08040e, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    const dome = new THREE.Mesh(g, m); dome.position.set(CUR.x, BASE - 3, CUR.z); dome.name = 'shibuya-curtain'; dome.renderOrder = 2;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(CUR.r - 0.3, CUR.r - 0.3, 10, 96, 1, true), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0.25, 0.08, 0.35), transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.set(CUR.x, BASE + 2, CUR.z); ring.name = 'shibuya-curtain-edge';
    return [dome, ring];
  });
  R.poi('curtain', 'The Curtain (帳)', '⬛', CUR.x - 60, CUR.z - 100, 'landmark');

  W.collectBlockLights = () => fastBlockLights(W);
  const L = R.finish({
    spawn: [166, 40], biome: SHIBUYA_BIOME, sunOffset: new THREE.Vector3(-18, 34, 16),
    backdrop: { c0: 0x1a1018, c1: 0x4a3040, ground: 0x0e0a0c, y: BASE - 14 },
    extra: { crowd: C.finish(), ...interiorsData(R), onLoad: (g, LL) => { cityView(g, LL, { radius: 5.5 }); Crowd.attach(g, LL); Interiors.attach(g, LL); } },
  });
  return L;
}

registerRegion('shibuya', {
  name: 'Shibuya', sub: '31 October · the curtain falls', kind: 'city', grid: [1, 2],
  color: '#8a2a2a', accent: '#ff8a4a', icon: '🎃',
  blurb: 'The Scramble Crossing, Hachiko, 109 and the station: a curtain over all of it, Halloween crowds trapped inside.',
  biome: SHIBUYA_BIOME, build,
});

void rubble; void slash;
