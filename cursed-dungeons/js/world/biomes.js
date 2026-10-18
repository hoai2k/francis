// Biome look & feel: palette of blocks, ambient sound and music keys, and the
// `look` the environment (gfx/environment.js) builds the lighting from: time of
// day, sky/fog palette, clouds, grading, foliage. The older flat fields (skyTop,
// fog, hemi*, sun*, grade) are still read for Domain Expansion overrides and as
// grading defaults. See the API comment at the top of gfx/environment.js.
import { B } from './blocks.js';
export { Environment } from '../gfx/environment.js';

export const BIOMES = {
  jujutsu_high: {
    name: 'Jujutsu High', sub: 'School Grounds · Night',
    skyTop: 0x0a1030, skyHorizon: 0x2a2a52, fog: 0x1c2040, fogDensity: 0.018,
    hemiSky: 0x6a78b8, hemiGround: 0x2a2018, hemiI: 0.5, sun: 0xa8b8ff, sunI: 1.0,
    grade: { tint: [1.0, 0.98, 1.04], lift: [0.0, 0.0, 0.015], sat: 1.08, contrast: 1.06, vignette: 0.32 },
    floor: B.stone_brick, floor2: B.cobble, path: B.dirt_path, wall: B.stone_brick, wall2: B.mossy_brick, trim: B.dark_planks, pillar: B.pillar_red, roof: B.roof, ground: B.grass, accent: B.lantern, pit: B.stone,
    look: { timeOfDay: 'cycle', start: 17.2, fog: { density: 0.0068, sun: 0.75 }, clouds: { coverage: 0.48 }, grade: { sat: 1.08, contrast: 1.07, vignette: 0.22 }, abyss: true },
    ambience: 'night', music: 'shrine', particles: 'fireflies', wind: 1,
  },
  tokyo_night: {
    name: 'Ruined Tokyo', sub: 'Streets at Night',
    skyTop: 0x05060e, skyHorizon: 0x2e1a2c, fog: 0x20141e, fogDensity: 0.022,
    hemiSky: 0x6070a0, hemiGround: 0x201418, hemiI: 0.7, sun: 0x8898d8, sunI: 0.8,
    grade: { tint: [1.02, 0.96, 1.06], lift: [0.01, 0.0, 0.02], sat: 1.15, contrast: 1.1, vignette: 0.38 },
    floor: B.asphalt, floor2: B.asphalt_line, path: B.concrete, wall: B.concrete, wall2: B.red_brick, trim: B.window_dark, pillar: B.concrete_pillar, roof: B.concrete, ground: B.asphalt, accent: B.neon_pink, pit: B.concrete,
    look: { timeOfDay: 22.5, palette: { skyTop: 0x0a0a1c, skyHorizon: 0x3a2034, fog: 0x2a1a2a, sun: 0x8a9ae0, hemiSky: 0x5a5a90 }, fog: { density: 0.014, sun: 0.3 }, clouds: { coverage: 0.3, tint: 0x8a7a9a }, grade: { tint: [1.02, 0.97, 1.05], sat: 1.12, contrast: 1.1, vignette: 0.3 }, torch: 1 },
    ambience: 'city', music: 'city', particles: 'embers', wind: 0.6,
  },
  cursed_forest: {
    name: 'Cursed Forest', sub: 'Where the Curses Nest',
    skyTop: 0x06080a, skyHorizon: 0x14201a, fog: 0x14201c, fogDensity: 0.03,
    hemiSky: 0x6a8a7a, hemiGround: 0x1a1420, hemiI: 0.75, sun: 0x9ab8a8, sunI: 0.7,
    grade: { tint: [0.96, 1.02, 0.98], lift: [0.0, 0.01, 0.005], sat: 0.95, contrast: 1.12, vignette: 0.45 },
    floor: B.moss_floor, floor2: B.cursed_grass, path: B.dirt, wall: B.bark_dark, wall2: B.mossy_brick, trim: B.log, pillar: B.log, roof: B.dead_leaves, ground: B.cursed_grass, accent: B.cursed_pool, pit: B.dirt,
    look: { timeOfDay: 'cycle', start: 16.6, palette: { skyTop: 0x3a78c8, skyHorizon: 0xc8dcc0, fog: 0x9ab8a0, hemiSky: 0x9cc0a8, hemiGround: 0x4a4a2a }, fog: { density: 0.011, height: 3, heightDensity: 0.05, sun: 0.9 }, clouds: { coverage: 0.55 }, grade: { tint: [0.98, 1.02, 0.97], sat: 1.06, contrast: 1.1, vignette: 0.28 } },
    ambience: 'forest', music: 'forest', particles: 'spores', wind: 1.4,
  },
  flooded_subway: {
    name: 'Flooded Subway', sub: 'Toei Line · Abandoned',
    skyTop: 0x040608, skyHorizon: 0x0a1418, fog: 0x0c1a1e, fogDensity: 0.028,
    hemiSky: 0x5a7a88, hemiGround: 0x101418, hemiI: 0.55, sun: 0x6a8a9a, sunI: 0.35,
    grade: { tint: [0.94, 1.02, 1.06], lift: [0.0, 0.01, 0.02], sat: 0.9, contrast: 1.1, vignette: 0.45 },
    floor: B.subway_floor, floor2: B.metal_grate, path: B.subway_floor, wall: B.subway_tile, wall2: B.concrete, trim: B.sign, pillar: B.concrete_pillar, roof: B.concrete, ground: B.subway_floor, accent: B.lantern, pit: B.concrete,
    look: { timeOfDay: 21.5, palette: { skyTop: 0x050a10, skyHorizon: 0x10222a, fog: 0x0e1e24, sun: 0x6a8a9a, hemiSky: 0x4a6a78 }, fog: { density: 0.022, sun: 0.1 }, clouds: { enabled: false }, sun: 0.5, grade: { tint: [0.95, 1.02, 1.06], sat: 0.95, contrast: 1.1, vignette: 0.32 }, torch: 1, shafts: false },
    ambience: 'drips', music: 'subway', particles: 'drips', wind: 0.2, flooded: true,
  },
  shibuya: {
    name: 'Shibuya Station', sub: 'Halloween · The Incident',
    skyTop: 0x0c0408, skyHorizon: 0x3a1214, fog: 0x2a1014, fogDensity: 0.02,
    hemiSky: 0xa06a6a, hemiGround: 0x201010, hemiI: 0.75, sun: 0xff8a6a, sunI: 0.9,
    grade: { tint: [1.06, 0.96, 0.94], lift: [0.02, 0.0, 0.0], sat: 1.12, contrast: 1.12, vignette: 0.4 },
    floor: B.polished, floor2: B.subway_floor, path: B.concrete, wall: B.concrete, wall2: B.window, trim: B.sign, pillar: B.concrete_pillar, roof: B.concrete, ground: B.asphalt, accent: B.lava, pit: B.concrete,
    look: { timeOfDay: 21.8, palette: { skyTop: 0x140610, skyHorizon: 0x5a1a1c, fog: 0x3a1418, sun: 0xff9a7a, hemiSky: 0x9a6a7a, hemiGround: 0x2a1414 }, fog: { density: 0.013, sun: 0.4 }, clouds: { coverage: 0.35, tint: 0x9a6a6a }, grade: { tint: [1.06, 0.97, 0.95], sat: 1.14, contrast: 1.12, vignette: 0.3 }, torch: 1 },
    ambience: 'city', music: 'shibuya', particles: 'embers', wind: 0.8,
  },
};

// Technique modules can add their own domain environments.
export function registerDomainEnv(key, env) { DOMAINS[key] = { ...DOMAINS.resonance, ...env, grade: { ...DOMAINS.resonance.grade, ...(env.grade ?? {}) }, __domain: true }; }

// Domain Expansion overrides use the same structure.
export const DOMAINS = {
  unlimited_void: { skyTop: 0x000000, skyHorizon: 0x1a2a6a, fog: 0x050818, fogDensity: 0.008, hemiSky: 0x9ab0ff, hemiGround: 0x101020, hemiI: 1.4, sun: 0xc0d8ff, sunI: 0.6, grade: { tint: [0.95, 1.0, 1.12], lift: [0.0, 0.01, 0.04], sat: 1.2, contrast: 1.15, vignette: 0.5 }, floor: B.void_floor, __domain: true },
  malevolent_shrine: { skyTop: 0x100000, skyHorizon: 0x4a0606, fog: 0x200404, fogDensity: 0.018, hemiSky: 0xc84a3a, hemiGround: 0x100000, hemiI: 0.55, sun: 0xff5a4a, sunI: 0.9, grade: { tint: [1.08, 0.92, 0.9], lift: [0.015, 0.0, 0.0], sat: 1.1, contrast: 1.18, vignette: 0.55 }, floor: B.shrine_floor, __domain: true },
  chimera_garden: { skyTop: 0x000000, skyHorizon: 0x10101a, fog: 0x06060c, fogDensity: 0.025, hemiSky: 0x6a6aa0, hemiGround: 0x000000, hemiI: 0.9, sun: 0x8a8ac8, sunI: 0.5, grade: { tint: [0.92, 0.95, 1.1], lift: [0.0, 0.0, 0.02], sat: 0.75, contrast: 1.25, vignette: 0.55 }, floor: B.shadow_floor, __domain: true },
  coffin_iron_mountain: { skyTop: 0x200800, skyHorizon: 0xff5a1a, fog: 0x401008, fogDensity: 0.02, hemiSky: 0xff9a5a, hemiGround: 0x300800, hemiI: 1.1, sun: 0xffa060, sunI: 1.3, grade: { tint: [1.12, 0.96, 0.85], lift: [0.03, 0.01, 0.0], sat: 1.2, contrast: 1.1, vignette: 0.45 }, floor: B.obsidian, __domain: true },
  resonance: { skyTop: 0x100808, skyHorizon: 0x6a3a1a, fog: 0x2a140a, fogDensity: 0.02, hemiSky: 0xffb07a, hemiGround: 0x200a00, hemiI: 1.0, sun: 0xffc080, sunI: 1.0, grade: { tint: [1.08, 1.0, 0.9], lift: [0.02, 0.01, 0.0], sat: 1.15, contrast: 1.12, vignette: 0.45 }, floor: B.floor_boards, __domain: true },
};
