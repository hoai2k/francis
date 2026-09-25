// Biome look & feel: palette of blocks, sky gradient, fog, light colours,
// colour grade, ambient sound and music keys.
import * as THREE from 'three/webgpu';
import { screenUV, color, mix, smoothstep, vec3, uniform, positionWorldDirection, normalize, pow, max, float } from 'three/tsl';
import { B } from './blocks.js';
import { Grade } from '../gfx/renderer.js';

export const BIOMES = {
  jujutsu_high: {
    name: 'Jujutsu High', sub: 'School Grounds · Night',
    skyTop: 0x0a1030, skyHorizon: 0x2a2a52, fog: 0x1c2040, fogDensity: 0.018,
    hemiSky: 0x6a78b8, hemiGround: 0x2a2018, hemiI: 0.5, sun: 0xa8b8ff, sunI: 1.0,
    grade: { tint: [1.0, 0.98, 1.04], lift: [0.0, 0.0, 0.015], sat: 1.08, contrast: 1.06, vignette: 0.32 },
    floor: B.stone_brick, floor2: B.cobble, path: B.dirt_path, wall: B.stone_brick, wall2: B.mossy_brick, trim: B.dark_planks, pillar: B.pillar_red, roof: B.roof, ground: B.grass, accent: B.lantern, pit: B.stone,
    ambience: 'night', music: 'shrine', particles: 'fireflies', wind: 1,
  },
  tokyo_night: {
    name: 'Ruined Tokyo', sub: 'Streets at Night',
    skyTop: 0x05060e, skyHorizon: 0x2e1a2c, fog: 0x20141e, fogDensity: 0.022,
    hemiSky: 0x6070a0, hemiGround: 0x201418, hemiI: 0.7, sun: 0x8898d8, sunI: 0.8,
    grade: { tint: [1.02, 0.96, 1.06], lift: [0.01, 0.0, 0.02], sat: 1.15, contrast: 1.1, vignette: 0.38 },
    floor: B.asphalt, floor2: B.asphalt_line, path: B.concrete, wall: B.concrete, wall2: B.red_brick, trim: B.window_dark, pillar: B.concrete_pillar, roof: B.concrete, ground: B.asphalt, accent: B.neon_pink, pit: B.concrete,
    ambience: 'city', music: 'city', particles: 'embers', wind: 0.6,
  },
  cursed_forest: {
    name: 'Cursed Forest', sub: 'Where the Curses Nest',
    skyTop: 0x06080a, skyHorizon: 0x14201a, fog: 0x14201c, fogDensity: 0.03,
    hemiSky: 0x6a8a7a, hemiGround: 0x1a1420, hemiI: 0.75, sun: 0x9ab8a8, sunI: 0.7,
    grade: { tint: [0.96, 1.02, 0.98], lift: [0.0, 0.01, 0.005], sat: 0.95, contrast: 1.12, vignette: 0.45 },
    floor: B.moss_floor, floor2: B.cursed_grass, path: B.dirt, wall: B.bark_dark, wall2: B.mossy_brick, trim: B.log, pillar: B.log, roof: B.dead_leaves, ground: B.cursed_grass, accent: B.cursed_pool, pit: B.dirt,
    ambience: 'forest', music: 'forest', particles: 'spores', wind: 1.4,
  },
  flooded_subway: {
    name: 'Flooded Subway', sub: 'Toei Line · Abandoned',
    skyTop: 0x040608, skyHorizon: 0x0a1418, fog: 0x0c1a1e, fogDensity: 0.028,
    hemiSky: 0x5a7a88, hemiGround: 0x101418, hemiI: 0.55, sun: 0x6a8a9a, sunI: 0.35,
    grade: { tint: [0.94, 1.02, 1.06], lift: [0.0, 0.01, 0.02], sat: 0.9, contrast: 1.1, vignette: 0.45 },
    floor: B.subway_floor, floor2: B.metal_grate, path: B.subway_floor, wall: B.subway_tile, wall2: B.concrete, trim: B.sign, pillar: B.concrete_pillar, roof: B.concrete, ground: B.subway_floor, accent: B.lantern, pit: B.concrete,
    ambience: 'drips', music: 'subway', particles: 'drips', wind: 0.2, flooded: true,
  },
  shibuya: {
    name: 'Shibuya Station', sub: 'Halloween · The Incident',
    skyTop: 0x0c0408, skyHorizon: 0x3a1214, fog: 0x2a1014, fogDensity: 0.02,
    hemiSky: 0xa06a6a, hemiGround: 0x201010, hemiI: 0.75, sun: 0xff8a6a, sunI: 0.9,
    grade: { tint: [1.06, 0.96, 0.94], lift: [0.02, 0.0, 0.0], sat: 1.12, contrast: 1.12, vignette: 0.4 },
    floor: B.polished, floor2: B.subway_floor, path: B.concrete, wall: B.concrete, wall2: B.window, trim: B.sign, pillar: B.concrete_pillar, roof: B.concrete, ground: B.asphalt, accent: B.lava, pit: B.concrete,
    ambience: 'city', music: 'shibuya', particles: 'embers', wind: 0.8,
  },
};

// Domain Expansion overrides use the same structure.
export const DOMAINS = {
  unlimited_void: { skyTop: 0x000000, skyHorizon: 0x1a2a6a, fog: 0x050818, fogDensity: 0.008, hemiSky: 0x9ab0ff, hemiGround: 0x101020, hemiI: 1.4, sun: 0xc0d8ff, sunI: 0.6, grade: { tint: [0.95, 1.0, 1.12], lift: [0.0, 0.01, 0.04], sat: 1.2, contrast: 1.15, vignette: 0.5 }, floor: B.void_floor },
  malevolent_shrine: { skyTop: 0x100000, skyHorizon: 0x4a0606, fog: 0x200404, fogDensity: 0.018, hemiSky: 0xc84a3a, hemiGround: 0x100000, hemiI: 0.55, sun: 0xff5a4a, sunI: 0.9, grade: { tint: [1.08, 0.92, 0.9], lift: [0.015, 0.0, 0.0], sat: 1.1, contrast: 1.18, vignette: 0.55 }, floor: B.shrine_floor },
  chimera_garden: { skyTop: 0x000000, skyHorizon: 0x10101a, fog: 0x06060c, fogDensity: 0.025, hemiSky: 0x6a6aa0, hemiGround: 0x000000, hemiI: 0.9, sun: 0x8a8ac8, sunI: 0.5, grade: { tint: [0.92, 0.95, 1.1], lift: [0.0, 0.0, 0.02], sat: 0.75, contrast: 1.25, vignette: 0.55 }, floor: B.shadow_floor },
  coffin_iron_mountain: { skyTop: 0x200800, skyHorizon: 0xff5a1a, fog: 0x401008, fogDensity: 0.02, hemiSky: 0xff9a5a, hemiGround: 0x300800, hemiI: 1.1, sun: 0xffa060, sunI: 1.3, grade: { tint: [1.12, 0.96, 0.85], lift: [0.03, 0.01, 0.0], sat: 1.2, contrast: 1.1, vignette: 0.45 }, floor: B.obsidian },
  resonance: { skyTop: 0x100808, skyHorizon: 0x6a3a1a, fog: 0x2a140a, fogDensity: 0.02, hemiSky: 0xffb07a, hemiGround: 0x200a00, hemiI: 1.0, sun: 0xffc080, sunI: 1.0, grade: { tint: [1.08, 1.0, 0.9], lift: [0.02, 0.01, 0.0], sat: 1.15, contrast: 1.12, vignette: 0.45 }, floor: B.floor_boards },
};

// Environment controller: sky background node, fog, lights & grade, with
// smooth transitions (used for domain expansions).
export class Environment {
  constructor(scene, lights) {
    this.scene = scene; this.lights = lights;
    this.skyTop = uniform(new THREE.Color()); this.skyHor = uniform(new THREE.Color());
    const dir = normalize(positionWorldDirection);
    const h = max(dir.y, float(0));
    // sky above the horizon, a dark fogged abyss below it (levels float over the void)
    const abyss = mix(this.skyHor.mul(0.35), vec3(0.004, 0.004, 0.008), smoothstep(-0.05, -0.75, dir.y));
    scene.backgroundNode = mix(abyss, mix(this.skyHor, this.skyTop, pow(h, 0.6)), smoothstep(-0.04, 0.02, dir.y));
    this.fog = new THREE.FogExp2(0x000000, 0.02);
    scene.fog = this.fog;
    this.cur = null; this.from = null; this.to = null; this.k = 1;
  }
  set(b, instant = true) {
    const snap = this.snapshot(b);
    if (instant || !this.cur) { this.cur = snap; this.apply(snap); this.k = 1; return; }
    this.from = this.cur; this.to = snap; this.k = 0;
  }
  snapshot(b) {
    const g = b.grade;
    return {
      skyTop: new THREE.Color(b.skyTop), skyHor: new THREE.Color(b.skyHorizon), fog: new THREE.Color(b.fog), fogD: b.fogDensity,
      hemiSky: new THREE.Color(b.hemiSky), hemiGround: new THREE.Color(b.hemiGround), hemiI: b.hemiI, sun: new THREE.Color(b.sun), sunI: b.sunI,
      tint: new THREE.Color(...g.tint), lift: new THREE.Color(...g.lift), sat: g.sat, contrast: g.contrast, vignette: g.vignette,
    };
  }
  apply(s) {
    this.skyTop.value.copy(s.skyTop); this.skyHor.value.copy(s.skyHor);
    this.fog.color.copy(s.fog); this.fog.density = s.fogD;
    const L = this.lights;
    L.hemi.color.copy(s.hemiSky); L.hemi.groundColor.copy(s.hemiGround); L.hemi.intensity = s.hemiI;
    L.sun.color.copy(s.sun); L.sun.intensity = s.sunI;
    Grade.tint.value.copy(s.tint); Grade.lift.value.copy(s.lift);
    Grade.saturation.value = s.sat; Grade.contrast.value = s.contrast; Grade.vignette.value = s.vignette;
  }
  update(dt) {
    if (this.k >= 1 || !this.to) return;
    this.k = Math.min(1, this.k + dt * 1.6);
    const a = this.from, b = this.to, t = this.k;
    const lerpC = (x, y) => x.clone().lerp(y, t), L = (x, y) => x + (y - x) * t;
    const s = {
      skyTop: lerpC(a.skyTop, b.skyTop), skyHor: lerpC(a.skyHor, b.skyHor), fog: lerpC(a.fog, b.fog), fogD: L(a.fogD, b.fogD),
      hemiSky: lerpC(a.hemiSky, b.hemiSky), hemiGround: lerpC(a.hemiGround, b.hemiGround), hemiI: L(a.hemiI, b.hemiI), sun: lerpC(a.sun, b.sun), sunI: L(a.sunI, b.sunI),
      tint: lerpC(a.tint, b.tint), lift: lerpC(a.lift, b.lift), sat: L(a.sat, b.sat), contrast: L(a.contrast, b.contrast), vignette: L(a.vignette, b.vignette),
    };
    this.apply(s);
    if (this.k >= 1) this.cur = b;
  }
  // Reflection probe: a PMREM of the sky gradient, used for water/metal on every tier.
  buildProbe(renderer, b) {
    const env = new THREE.Scene();
    const top = new THREE.Color(b.skyTop), hor = new THREE.Color(b.skyHorizon);
    const geo = new THREE.SphereGeometry(10, 32, 16);
    const cols = [];
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const c = hor.clone().lerp(top, Math.pow(Math.max(0, y), 0.6)); if (y < 0) c.multiplyScalar(0.4); cols.push(c.r * 2, c.g * 2, c.b * 2); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    env.add(new THREE.Mesh(geo, new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.BackSide })));
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromScene(env, 0.02);
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.35;
    pm.dispose();
  }
}
