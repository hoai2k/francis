// Phase 1 placeholder regions: walkable terrain in each region's palette,
// roads from every gate to a central plaza with a Window station, a few
// buildings, trees and roaming curses (buildBasicRegion in ./common.js).
// Each Phase 2 region file calls registerRegion(id, { …, build }) again to
// replace its placeholder; keep the grid/colours or pass new ones.
// Main-quest lairs: the 'lair_<chapter>' / 'giver_<chapter>' anchors here
// are where those quests point until a real build places them.
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { buildBasicRegion, B } from './common.js';
import { BIOMES } from '../biomes.js';

const sky = (o) => ({ ...BIOMES.jujutsu_high, ...o, grade: { ...BIOMES.jujutsu_high.grade, ...(o.grade ?? {}) } });
const lairs = (list) => (R) => { const cx = R.sx >> 1, cz = R.sz >> 1; list.forEach(([id, dx, dz], i) => { R.anchor('lair_' + id, cx + dx, cz + dz); R.anchor('giver_' + id, cx + dx + 3, cz + dz + 3); R.lairs.push({ id, x: cx + dx, z: cz + dz, kind: 'curtain' }); }); };

export const PLACEHOLDER_BIOMES = {
  okinawa_coast: sky({ look: { timeOfDay: 'cycle', start: 11.5, palette: { skyTop: 0x2a7ae8, skyHorizon: 0xc8ecff, fog: 0xb8dcf0 }, fog: { density: 0.0055, sun: 0.8 }, clouds: { coverage: 0.38 }, grade: { sat: 1.14, contrast: 1.05, vignette: 0.18 } },  name: 'Okinawa Coast', sub: 'Hidden Inventory', skyTop: 0x2a78c8, skyHorizon: 0xbfe6ff, fog: 0x9ccbe0, fogDensity: 0.006, hemiSky: 0xd8f0ff, hemiGround: 0x8a7a5a, hemiI: 1.1, sun: 0xfff2d0, sunI: 2.6, grade: { tint: [1.0, 1.02, 1.04], sat: 1.12, contrast: 1.05, vignette: 0.2 }, ambience: 'forest', music: 'hub', particles: 'none', wind: 1.4 }),
  kyoto: sky({ look: { timeOfDay: 'cycle', start: 16.8, palette: { skyTop: 0x3a6ee0, skyHorizon: 0xf0d0b0 }, fog: { density: 0.007, sun: 0.8 }, clouds: { coverage: 0.42 }, grade: { sat: 1.1, contrast: 1.07, vignette: 0.22 } },  name: 'Kyoto', sub: 'Temples and the Goodwill grounds', skyTop: 0x3a4a8a, skyHorizon: 0xffb88a, fog: 0xd8a890, fogDensity: 0.008, hemiSky: 0xe8d0c8, hemiGround: 0x5a4430, hemiI: 1.0, sun: 0xffc890, sunI: 2.3, ambience: 'forest', music: 'shrine', particles: 'fireflies', wind: 0.9 }),
  shibuya: sky({ ...BIOMES.shibuya, name: 'Shibuya', sub: 'October 31st · the curtain', fogDensity: 0.012 }),
  shinjuku: sky({ ...BIOMES.tokyo_night, name: 'Shinjuku', sub: 'Skyscrapers and the levelled district', skyTop: 0x1a2440, skyHorizon: 0x8a6a7a, fog: 0x5a4a5a, fogDensity: 0.01, hemiI: 0.9, sunI: 1.4 }),
  colony_tokyo1: sky({ look: { timeOfDay: 19.4, palette: { skyTop: 0x2a2050, skyHorizon: 0xc08ab0, fog: 0x7a5a7a }, fog: { density: 0.011, sun: 0.5 }, clouds: { coverage: 0.6, tint: 0xb090c0 }, grade: { tint: [1.04, 0.97, 1.06], sat: 1.06, contrast: 1.1, vignette: 0.28 }, torch: 0.7 },  name: 'Tokyo Colony No. 1', sub: 'Culling Game', skyTop: 0x2a1a3a, skyHorizon: 0x9a6a8a, fog: 0x5a3a5a, fogDensity: 0.012, hemiSky: 0xc8a8d8, hemiGround: 0x2a1a20, hemiI: 0.9, sun: 0xffb0d0, sunI: 1.6, grade: { tint: [1.04, 0.96, 1.06], sat: 1.05, contrast: 1.12, vignette: 0.38 }, ambience: 'city', music: 'city', particles: 'embers', wind: 0.7 }),
  colony_sendai: sky({ look: { timeOfDay: 'cycle', start: 9.5, palette: { skyTop: 0x4a6a8a, skyHorizon: 0xb0c0c8, fog: 0x8a9aa0 }, fog: { density: 0.01, sun: 0.5 }, clouds: { coverage: 0.7, tint: 0xa0a8b0 }, grade: { sat: 0.96, contrast: 1.08, vignette: 0.26 } },  name: 'Sendai Colony', sub: 'Culling Game', skyTop: 0x22303e, skyHorizon: 0x8aa0a8, fog: 0x6a7a80, fogDensity: 0.012, hemiSky: 0xb8c8d0, hemiGround: 0x2a2a28, hemiI: 0.9, sun: 0xe8f0ff, sunI: 1.5, grade: { tint: [0.98, 1.0, 1.04], sat: 0.95, contrast: 1.1, vignette: 0.36 }, ambience: 'city', music: 'city', particles: 'embers', wind: 0.8 }),
  colony_sakurajima: sky({ look: { timeOfDay: 17.8, palette: { skyTop: 0x5a3a3a, skyHorizon: 0xf0a070, fog: 0xa07a6a }, fog: { density: 0.012, height: 14, heightDensity: 0.04, sun: 0.8 }, clouds: { coverage: 0.65, tint: 0x8a6a6a }, grade: { tint: [1.08, 0.98, 0.9], sat: 1.06, contrast: 1.1, vignette: 0.28 } },  name: 'Sakurajima Colony', sub: 'Culling Game · the volcano', skyTop: 0x3a2018, skyHorizon: 0xd87a4a, fog: 0x7a5a4a, fogDensity: 0.014, hemiSky: 0xe8b090, hemiGround: 0x2a1410, hemiI: 0.95, sun: 0xffa060, sunI: 2.0, grade: { tint: [1.08, 0.98, 0.9], sat: 1.05, contrast: 1.1, vignette: 0.34 }, ambience: 'forest', music: 'forest', particles: 'embers', wind: 1.0 }),
};

registerRegion('okinawa_coast', {
  name: 'Okinawa Coast', sub: 'Beaches, cliffs and the sea', kind: 'wild', grid: [0, 0],
  color: '#2a8ab0', accent: '#7ae0ff', icon: '🏖', blurb: 'Sun, sand and the Hidden Inventory coast.',
  biome: PLACEHOLDER_BIOMES.okinawa_coast,
  build: (ctx) => buildBasicRegion(ctx, { base: 12, amp: 18, sea: 9, top: B.grass, rock: B.stone, road: B.sand, roadAlt: B.dirt_path, plaza: B.planks, plazaAlt: B.sand,
    fn: (x, z) => 12 + 10 * Math.sin(x * 0.012) * 0.5 + (x < 70 ? (x - 70) * 0.12 : 0) + 6 * Math.sin(z * 0.03 + x * 0.01), trees: ['palm', 'palm', 'oak'], treeDensity: 0.12, buildings: 'houses', roam: ['swarmer', 'spitter', 'blob'], level: 2,
    backdrop: { c0: 0x2a5a7a, c1: 0x9ac8e0, ground: 0x1a4a6a } }),
});
registerRegion('kyoto', {
  name: 'Kyoto', sub: 'Kyoto Jujutsu High · temples and bamboo', kind: 'city', grid: [0, 1],
  color: '#a04a3a', accent: '#ffb07a', icon: '🏯', blurb: 'Old capital: pagodas, bamboo groves and the Goodwill Event grounds.',
  biome: PLACEHOLDER_BIOMES.kyoto,
  build: (ctx) => buildBasicRegion(ctx, { amp: 12, buildings: 'temples', trees: ['bamboo', 'sakura', 'oak'], treeDensity: 0.25, roam: ['swarmer', 'flyhead', 'spitter'], level: 2, extra: lairs([['m4', 40, -30]]) }),
});
registerRegion('colony_sendai', {
  name: 'Sendai Colony', sub: 'Culling Game · Yuta, Uro, Kurourushi', kind: 'colony', grid: [2, 0],
  color: '#4a5a6a', accent: '#9ae0ff', icon: '🧱', blurb: 'A Culling Game colony under a barrier: points, players and swarms.',
  biome: PLACEHOLDER_BIOMES.colony_sendai,
  build: (ctx) => buildBasicRegion(ctx, { amp: 6, top: B.asphalt, sub: B.concrete, rock: B.concrete, rock2: B.cracked_brick, road: B.asphalt, roadAlt: B.asphalt, line: B.asphalt_line, plaza: B.concrete, buildings: 'towers', maxFloors: 4, trees: ['dead'], treeDensity: 0.04, grass: 0.01, roam: ['swarmer', 'flyhead', 'flyhead', 'tank'], level: 3, dome: 0x9ae0ff, backdrop: { c0: 0x2a3440, c1: 0x6a7a88, ground: 0x1a2028 } }),
});
registerRegion('shinjuku', {
  name: 'Shinjuku', sub: 'Skyscrapers · the levelled district', kind: 'city', grid: [2, 1],
  color: '#3a4a7a', accent: '#a0b8ff', icon: '🏙', blurb: 'Towers on one side, a crater where Gojo and Sukuna fought on the other.',
  biome: PLACEHOLDER_BIOMES.shinjuku,
  build: (ctx) => buildBasicRegion(ctx, { amp: 4, top: B.asphalt, sub: B.concrete, rock: B.concrete, rock2: B.cracked_brick, road: B.asphalt, roadAlt: B.asphalt, line: B.asphalt_line, plaza: B.polished, buildings: 'towers', maxFloors: 9, trees: null, grass: 0, roam: ['transfigured', 'swarmer', 'longneck'], level: 2, extra: lairs([['m2', -40, 30], ['m3', 36, 40]]), backdrop: { c0: 0x1a2030, c1: 0x5a607a, ground: 0x10141c } }),
});
registerRegion('colony_sakurajima', {
  name: 'Sakurajima Colony', sub: 'Culling Game · Maki and the Zen\'in', kind: 'colony', grid: [0, 2],
  color: '#7a3a22', accent: '#ff9a5a', icon: '🌋', blurb: 'A volcanic island under a barrier, grey with ash.',
  biome: PLACEHOLDER_BIOMES.colony_sakurajima,
  build: (ctx) => buildBasicRegion(ctx, { amp: 22, top: B.obsidian, sub: B.stone, rock: B.obsidian, rock2: B.cracked_brick, road: B.cobble, plaza: B.stone_brick, buildings: 'ruins', trees: ['dead'], treeDensity: 0.08, grass: 0, roam: ['ashspirit', 'swarmer', 'grasshopper'], level: 3, dome: 0xff9a5a,
    fn: (x, z) => 10 + 30 * Math.max(0, 1 - Math.hypot(x - 200, z - 60) / 90) + 4 * Math.sin(x * 0.05) * Math.cos(z * 0.04), backdrop: { c0: 0x3a2018, c1: 0x8a5a4a, ground: 0x201010 } }),
});
registerRegion('shibuya', {
  name: 'Shibuya', sub: 'Halloween · the scramble crossing', kind: 'city', grid: [1, 2],
  color: '#8a2a2a', accent: '#ff8a4a', icon: '🎃', blurb: 'The crossing, the station, Shibuya 109 — and a curtain over all of it.',
  biome: PLACEHOLDER_BIOMES.shibuya,
  build: (ctx) => buildBasicRegion(ctx, { amp: 3, top: B.asphalt, sub: B.concrete, rock: B.concrete, rock2: B.red_brick, road: B.asphalt, roadAlt: B.asphalt, line: B.asphalt_line, plaza: B.polished, buildings: 'towers', maxFloors: 7, trees: null, grass: 0, roam: ['transfigured', 'swarmer', 'flyhead'], level: 3,
    extra: lairs([['m5', -36, -30], ['m9', 36, -30], ['m6', -36, 34], ['m11', 36, 34], ['m10', 0, 44], ['m12', 0, -44]]), backdrop: { c0: 0x2a1418, c1: 0x6a4a50, ground: 0x140a0c } }),
});
registerRegion('colony_tokyo1', {
  name: 'Tokyo Colony No. 1', sub: 'Culling Game · Hakari, Kashimo', kind: 'colony', grid: [2, 2],
  color: '#5a2a6a', accent: '#e08aff', icon: '🎰', blurb: 'Ruined Tokyo under a barrier dome: Hakari\'s fight club, Kashimo.',
  biome: PLACEHOLDER_BIOMES.colony_tokyo1,
  build: (ctx) => buildBasicRegion(ctx, { amp: 5, top: B.asphalt, sub: B.concrete, rock: B.concrete, rock2: B.cracked_brick, road: B.asphalt, roadAlt: B.cracked_brick, line: B.asphalt_line, plaza: B.concrete, buildings: 'towers', maxFloors: 5, trees: ['dead'], treeDensity: 0.03, grass: 0.01, roam: ['swarmer', 'teleporter', 'doll'], level: 3, dome: 0xe08aff, backdrop: { c0: 0x2a1a30, c1: 0x6a4a78, ground: 0x160c1a } }),
});

void THREE;
