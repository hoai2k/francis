// Region 9 — colony_sakurajima: Culling Game Sakurajima Colony.
// A volcanic island under a blood-red evening and the colony barrier, ash
// falling all the time. Minamidake smokes in the middle, its crater full of
// lava; three lava rivers run down black slopes into the sea. A coast road
// rings the island. Places:
//   North Ferry Pier (north gate)    — the ferryman, the Rule Board
//   1914 Lava Causeway (east gate)   — the old lava flow that tied the island to Osumi
//   Harbour village (south-east)     — ash-buried houses
//   Arimura Lava Observatory (south) — Maki and Noritoshi Kamo's camp, the trail up the volcano
//   Zen'in Hei camp (north-east)     — the clan's killers, here for Maki
//   Furusato Onsen (south-west)      — hot springs that heal you while you soak
//   the crater rim                    — where Naoya Zen'in's cursed spirit waits
// Gates: north to Kyoto, east to Shibuya. Window stations: the pier, the observatory, the onsen.
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B, signMesh } from './common.js';
import { PLACEHOLDER_BIOMES } from './placeholders.js';
import { colonyBarrier, setupColony, ruinedTower, rubble, wreck, scorch, debrisField, ruleBoard } from '../cullingGame.js';
import { addChest } from '../regionRuntime.js';

const P0 = PLACEHOLDER_BIOMES.colony_sakurajima;
export const SAKURAJIMA_BIOME = {
  ...P0,
  name: 'Sakurajima Colony', sub: 'Culling Game · ash and fire',
  look: {
    ...P0.look, timeOfDay: 18.1,
    palette: { skyTop: 0x6a2a2a, skyHorizon: 0xff7a40, fog: 0xa86a52, sun: 0xff9a5a, hemiSky: 0xe8a080, hemiGround: 0x2a1410 },
    fog: { density: 0.0092, height: 14, heightDensity: 0.022, sun: 0.9, color: 0x9a6050 },
    clouds: { coverage: 0.78, tint: 0x6a3a32, shadows: 0.45, thickness: 7 },
    grade: { tint: [1.1, 0.96, 0.88], sat: 1.08, contrast: 1.12, vignette: 0.3, warmth: 0.2 },
    torch: 0.6, foliage: { density: 0.45, palette: { grass: 0x6a7448 } },
  },
  particles: 'embers', wind: 1.1,
};

const SEA = 7;
const V = { x: 166, z: 118 };     // Minamidake

function build(ctx) {
  const R = new RegionBuilder(ctx, { size: [320, 80, 320], base: 10 });
  const N = R.noise, base = R.base;
  // ------------------------------------------------------------ plan
  R.gate('n', 'kyoto', { at: 160, road: false, y: 9 });
  R.gate('e', 'shibuya', { at: 160, road: false, y: 9 });
  R.road([[160.5, 0.5], [160.5, 30], [158, 44]], { width: 5, block: B.planks, alt: B.dark_planks, altP: 0.3, y: 9 });            // the ferry pier
  R.road([[319.5, 160.5], [290, 160], [262, 166], [250, 176]], { width: 7, block: B.obsidian, alt: B.cobble, altP: 0.35, y: 9 });   // the 1914 lava causeway
  const ring = [[158, 44], [214, 50], [252, 76], [272, 120], [268, 168], [250, 176], [236, 206], [190, 226], [150, 228], [108, 232], [70, 208], [52, 160], [58, 104], [90, 64], [130, 46], [158, 44]];
  R.road(ring, { width: 6, block: B.cobble, alt: B.cracked_brick, altP: 0.25, y: 'follow' });
  R.road([[150, 214], [128, 190], [188, 176], [140, 160], [178, 146], [166, 134]], { width: 4, block: B.dirt_path, alt: B.obsidian, altP: 0.3, y: 'follow' });   // the volcano trail
  R.road([[236, 206], [252, 214], [262, 226]], { width: 5, block: B.cobble, y: 'follow' });         // harbour street
  R.flat(140, 204, 172, 226, { y: 'auto', block: B.concrete, alt: B.cracked_brick, altP: 0.2 });   // observatory camp
  R.flat(222, 58, 264, 96, { y: 'auto', block: null });                                            // Zen'in camp
  R.flat(58, 196, 104, 238, { y: 'auto', block: null });                                           // onsen
  R.flat(240, 196, 274, 232, { y: 'auto', block: null });                                          // harbour village
  R.flat(158, 129, 174, 137, { y: 'auto', block: B.obsidian, alt: B.dark_brick, altP: 0.3 });     // the crater rim ledge
  R.flat(146, 30, 176, 46, { y: 9, block: B.planks, alt: B.stone_brick, altP: 0.3 });              // pier head
  R.station('pier', 'North Ferry Pier', 170, 38, { facing: 'w', y: 9 });
  R.station('observatory', 'Arimura Observatory', 164, 218, { facing: 'n' });
  R.station('onsen', 'Furusato Onsen', 96, 230, { facing: 'n' });
  // ------------------------------------------------------------ terrain: the island and the cone
  const cone = (x, z) => { const d = Math.hypot(x - V.x, z - V.z); return 50 * Math.max(0, 1 - d / 96) ** 1.45; };
  R.terrain({ falloff: 9, fn: (x, z) => {
    const d = Math.hypot(x - 160, z - 150);
    const coast = d > 116 ? -(d - 116) * 0.3 : 0;
    const dv = Math.hypot(x - V.x, z - V.z);
    const crater = dv < 11 ? -9 * (1 - (dv / 11) ** 2) : 0;
    return base + 3.2 * (N.fbm(x * 0.03, z * 0.03, 4) * 0.5 + 0.5) + cone(x, z) + crater + coast + 4 * Math.max(0, N.ridge(x * 0.02, z * 0.02, 3) - 0.6) * 4;
  } });
  R.carve({ top: B.stone, sub: B.stone, rock: B.obsidian, rock2: B.dark_brick, rockSlope: 3, sea: SEA, shore: B.obsidian, topFn: (x, z, y) => {
    const r = R.r();
    if (y < 16) return r < 0.35 ? B.grass : r < 0.55 ? B.dirt : r < 0.8 ? B.stone : B.concrete;
    if (y < 30) return r < 0.45 ? B.stone : r < 0.7 ? B.concrete : r < 0.9 ? B.cracked_brick : B.obsidian;
    return r < 0.5 ? B.obsidian : r < 0.8 ? B.dark_brick : B.stone;
  } });
  R.paveRoads();
  const W = R.world;
  colonyBarrier(R, { color: 0xff9a5a, height: 90, domeH: 120 });

  // ------------------------------------------------------------ the crater and the lava rivers
  const peakY = R.hAt(V.x, V.z);
  {
    const lv = peakY + 2;
    for (let z = V.z - 11; z <= V.z + 11; z++) for (let x = V.x - 11; x <= V.x + 11; x++) {
      if (Math.hypot(x - V.x, z - V.z) > 10.5) continue;
      const h = R.hAt(x, z); if (h - 1 > lv) continue;
      W.setRaw(x, h - 2, z, B.obsidian);
      for (let y = h - 1; y <= lv; y++) W.setRaw(x, y, z, B.lava);
    }
    R.reserve(V.x - 12, V.z - 12, V.x + 12, V.z + 12, 4);
    R.poi('crater', 'Minamidake Crater', '🌋', V.x, V.z, 'landmark');
    R.anchor('crater_rim', 166, 133);
  }
  const lavaRiver = (pts, w) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az));
      for (let s = 0; s <= n; s++) {
        const px = ax + (bx - ax) * s / n, pz = az + (bz - az) * s / n;
        for (let dz = -Math.ceil(w); dz <= Math.ceil(w); dz++) for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
          const x = Math.floor(px + dx), z = Math.floor(pz + dz); if (!R.in(x, z) || x < 2 || z < 2 || x > R.sx - 3 || z > R.sz - 3) continue;
          const d = Math.hypot(px - x - 0.5, pz - z - 0.5), i = R.i(x, z);
          if (R.roadId[i] || R.lock[i] === 2) continue;
          const h = R.hAt(x, z);
          if (h <= SEA) continue;
          if (d <= w / 2) { W.setRaw(x, h - 1, z, B.lava); W.setRaw(x, h - 2, z, B.obsidian); for (let y = h; y < h + 4; y++) W.setRaw(x, y, z, 0); R.lock[i] = 3; }
          else if (d <= w / 2 + 1.4 && W.get(x, h - 1, z) !== B.lava) W.setRaw(x, h - 1, z, R.chance(0.6) ? B.obsidian : B.dark_brick);
        }
      }
    }
  };
  const LAVA = [
    [[164, 126], [158, 150], [146, 176], [132, 198], [118, 222], [102, 258], [92, 292]],
    [[175, 116], [200, 108], [226, 116], [252, 126], [284, 118], [316, 110]],
    [[158, 112], [136, 96], [110, 82], [82, 62], [52, 40]],
  ];
  LAVA.forEach((p, i) => lavaRiver(p, i === 0 ? 4 : 3));
  scorch(R, V.x, V.z, 34, { blocks: [B.obsidian, B.dark_brick, B.stone], ragged: 0.5 });

  // ------------------------------------------------------------ North Ferry Pier
  {
    const y = 9;
    for (let z = 2; z < 30; z += 4) for (const s of [-3, 3]) R.props.box(160.5 + s, y - 3, z + 0.5, 0.5, 3.4, 0.5, 0x4a3420);   // pilings
    R.tower(146, 30, 10, 8, 1, { wall: B.planks, trim: B.dark_planks, win: B.window, door: 's', y });
    ruleBoard(R, 152, 42, { ry: 0 });
    for (const [x, z] of [[156, 32], [166, 32], [156, 44], [174, 44]]) R.lantern(x + 0.5, z + 0.5, { y });
    R.deco.extra(() => { const m = signMesh(['桜島', 'SAKURAJIMA COLONY'], { w: 5, h: 1.4, color: '#ffb07a' }); m.position.set(160.5, y + 5.2, 28); return m; });
    R.torii(160.5, y, 26.5, 7, 5.6, { color: 0x2a1a14, collide: false });
    R.poi('pier', 'North Ferry Pier', '⛴', 160, 36, 'town');
    R.anchor('north_pier', 160, 50);
    addChest(R, 'pier', 147, 44, { rarity: 'common' });
  }
  // ------------------------------------------------------------ Arimura Lava Observatory: Maki and Kamo
  {
    const t = R.tower(140, 204, 12, 10, 2, { wall: B.concrete, trim: B.concrete_pillar, win: B.window, door: 's' });
    R.props.box(146, t.top + 1, 209, 14, 0.3, 12, 0x5a5a60);
    R.deco.extra(() => { const m = signMesh(['有村溶岩展望所', 'ARIMURA OBSERVATORY'], { w: 5.4, h: 1.3, color: '#f0d0b0' }); m.position.set(146, t.y + 3.3, 214.3); return m; });
    const y = R.floor(156, 220);
    W.set(156, y - 1, 220, B.lava); W.addLight(156.5, y + 1, 220.5, 0xff8a3a, 4, 10);
    for (const [dx, dz] of [[-3, 2], [3, 2], [0, -3]]) R.props.box(156.5 + dx, y, 220.5 + dz, 1.1, 0.4, 0.5, 0x5a3a22, { ry: Math.atan2(dx, dz) });
    for (const [x, z] of [[141, 225], [171, 225], [171, 205]]) R.lantern(x + 0.5, z + 0.5);
    R.poi('observatory', 'Arimura Lava Observatory', '🔭', 150, 216, 'town');
    R.anchor('observatory', 156, 216);
    addChest(R, 'observatory_roof', t.center.x, t.center.z, { rarity: 'rare' });
  }
  // ------------------------------------------------------------ Zen'in Hei camp
  {
    const y = R.floor(242, 78), P = R.props;
    const tent = (x, z, ry, col = 0x2a2a30) => {
      for (const s of [-1, 1]) P.box(x + Math.cos(ry) * s * 0.9, y, z - Math.sin(ry) * s * 0.9, 0.12, 2.6, 4, col, { ry, rz: s * 0.62 });
      P.box(x, y, z, 0.2, 2.2, 0.2, 0x4a3a2a);
      W.set(Math.floor(x), y, Math.floor(z), B.barrier);
    };
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; tent(242 + Math.cos(a) * 14, 78 + Math.sin(a) * 11, a + Math.PI / 2, k % 2 ? 0x2a2a30 : 0x3a1a1a); }
    R.house(236, 72, 12, 9, { wall: B.dark_planks, post: B.log, roof: B.dark_brick, door: 's', y });   // the command tent
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; R.deco.add('banner', 242 + Math.cos(a) * 19, y, 78 + Math.sin(a) * 16, { scale: 1.6 }); }
    for (const [x, z] of [[226, 62], [258, 62], [226, 94], [258, 94]]) { P.box(x + 0.5, y, z + 0.5, 0.3, 2.4, 0.3, 0x3a2a1a); P.box(x + 0.5, y + 2.4, z + 0.5, 0.5, 0.5, 0.5, 0xff7a2a, { emit: 2.6 }); W.addLight(x + 0.5, y + 3, z + 0.5, 0xff7a2a, 3, 9); W.set(x, y, z, B.barrier); }
    for (let k = 0; k < 6; k++) P.box(230 + k * 0.6, y, 86.5, 0.08, 2.4, 0.08, 0xc8ccd4, { rx: 0.2 });   // a rack of spears
    R.deco.extra(() => { const m = signMesh(['禪院', 'ZEN\'IN HEI'], { w: 3.4, h: 1.4, color: '#ff8a7a', bg: 'rgba(20,6,6,0.94)' }); m.position.set(242, y + 5.8, 81.2); return m; });
    R.poi('zenin_camp', 'Zen\'in Hei Camp', '⚔', 242, 78, 'lair');
    R.anchor('zenin_camp', 242, 86);
    addChest(R, 'zenin', 240, 75, { rarity: 'rare', power: 1, poi: 'Zen\'in War Chest' });
  }
  // ------------------------------------------------------------ Furusato Onsen
  const pools = [];
  {
    const y = R.floor(80, 216);
    for (const [x0, z0, x1, z1] of [[64, 204, 72, 211], [76, 210, 84, 217], [66, 218, 76, 225]]) { R.kit.pond(x0, z0, x1, z1, y, B.water, 1, B.stone_brick); pools.push([(x0 + x1) / 2 + 0.5, y, (z0 + z1) / 2 + 0.5]); }
    for (let k = 0; k < 18; k++) { const x = 60 + Math.floor(R.r() * 30), z = 200 + Math.floor(R.r() * 30); if (!W.get(x, y - 1, z) || W.get(x, y - 1, z) === B.water || W.get(x, y, z)) continue; if (R.chance(0.5)) W.set(x, y, z, R.chance(0.5) ? B.mossy_brick : B.stone); }
    R.house(88, 200, 12, 9, { wall: B.planks, post: B.log, roof: B.roof, door: 'w', y });
    R.fence(58, 196, 104, 196, y); R.fence(58, 238, 86, 238, y);
    for (const [x, z] of [[62, 200], [86, 202], [62, 230], [84, 228], [100, 222]]) R.lantern(x + 0.5, z + 0.5, { y, s: 0.9 });
    R.deco.extra(() => { const m = signMesh(['♨ 古里温泉', 'FURUSATO ONSEN'], { w: 4.6, h: 1.3, color: '#ffe0c0', bg: 'rgba(60,20,20,0.92)' }); m.position.set(87.3, y + 3.2, 204.5); m.rotation.y = -Math.PI / 2; return m; });
    R.forest({ kinds: ['pine', 'sakura'], density: 0.3, step: 4, rect: [40, 180, 120, 250] });
    R.poi('onsen', 'Furusato Onsen', '♨', 76, 214, 'town');
    R.anchor('onsen', 80, 228);
  }
  // ------------------------------------------------------------ the harbour village, buried in ash
  {
    const y = R.floor(256, 214);
    const houses = [[242, 198, 's'], [254, 198, 's'], [266, 198, 's'], [242, 220, 'n'], [264, 220, 'n']];
    houses.forEach(([x, z, door], i) => {
      const hh = R.house(x, z, 8, 7, { wall: i % 2 ? B.plaster : B.planks, roof: B.roof, door, y });
      for (let k = 0; k < 20; k++) { const xx = hh.x0 - 1 + Math.floor(R.r() * 10), zz = hh.z0 - 1 + Math.floor(R.r() * 9), gy = R.groundY(xx, zz); if (isFinite(gy) && gy > y + 3) W.set(xx, gy - 1, zz, B.concrete); }   // ash on the roofs
    });
    for (let k = 0; k < 40; k++) { const x = 240 + Math.floor(R.r() * 34), z = 194 + Math.floor(R.r() * 38), gy = R.groundY(x, z); if (isFinite(gy) && gy <= y + 1 && R.chance(0.5)) W.set(x, gy, z, B.concrete); }   // drifts
    wreck(R, 250, 210, { color: 0x8a8a8a }); wreck(R, 262, 212, { flip: true });
    for (let z = 232; z < 250; z++) for (let x = 266; x <= 268; x++) { W.setRaw(x, SEA - 1, z, B.planks); W.setRaw(x, SEA, z, 0); }   // the old jetty
    R.torii(256.5, y, 230.5, 5, 4.6);
    R.poi('harbour', 'Harbour Village', '🏘', 256, 210, 'town');
    R.anchor('captive_harbour', 255, 222);
    R.anchor('harbour', 256, 210);
    addChest(R, 'harbour', 268, 226, { rarity: 'common' });
  }
  // obsidian shards along the lava (a side quest)
  [[150, 176], [226, 120], [114, 84], [124, 214]].forEach(([x, z], i) => R.anchor('obsidian_' + i, x + 4, z + 3));
  // ruins on the slopes, scattered rocks, dead and pine trees
  for (const [x, z] of [[96, 120], [214, 168], [118, 150], [228, 92]]) rubble(R, x, z, 3, { blocks: [B.obsidian, B.stone, B.dark_brick], h: 3 });
  ruinedTower(R, 200, 186, 10, 10, 2, { wall: B.concrete, bites: 3, door: 's' });
  ruinedTower(R, 86, 150, 10, 12, 2, { wall: B.plaster, bites: 3, door: 'e' });
  for (let k = 0; k < 60; k++) {
    const x = 20 + Math.floor(R.r() * 280), z = 20 + Math.floor(R.r() * 280); if (!R.freeCell(x, z, 1)) continue;
    const y = R.groundY(x, z); if (y <= SEA + 1) continue;
    const s = 1 + Math.floor(R.r() * 2); for (let dy = 0; dy < s; dy++) W.set(x, y + dy, z, R.chance(0.6) ? B.obsidian : B.stone);
  }
  R.forest({ kinds: ['dead', 'dead', 'pine'], density: (x, z) => (Math.hypot(x - V.x, z - V.z) < 50 ? 0.03 : 0.16), step: 4 });
  R.scatter({ density: 0.06, types: ['grass', 'tall_grass', 'cursed_weed'] });
  debrisField(R, 40, 40, 280, 280, 80);
  addChest(R, 'slope', 196, 152, { rarity: 'rare', power: 1, poi: 'Ashen Cache' });
  addChest(R, 'cove', 52, 116, { rarity: 'common' });

  // ------------------------------------------------------------ people
  R.person({ id: 'sk_maki', name: 'Maki Zen\'in', look: 'npc_maki', x: 150, z: 222, yaw: 0.4, color: '#6ac08a',
    lines: [['The Hei followed me here. The clan wants me dead. Fine. I want the clan dead.', 'And Naoya... Naoya came back as something else.'], ['Don\'t get in my way. Or do, if you\'re useful.']] });
  R.person({ id: 'sk_kamo', name: 'Noritoshi Kamo', look: 'npc_kamo', x: 160, z: 224, yaw: -0.5, color: '#c87a7a',
    lines: [['The Kamo clan once disgraced itself in this very game, a thousand years ago. I intend to restore that honour.'], ['Blood Manipulation needs focus. The heat out here does not help.']] });
  R.person({ id: 'sk_medic', name: 'Window Medic Ishida', look: 'npc_ijichi', x: 146, z: 214, yaw: 0.2, color: '#9ab0d8',
    lines: [['We pulled three people out of the ash this morning. There are more in the harbour village.'], ['Breathe through a cloth. The ash cuts your lungs.']] });
  R.person({ id: 'sk_ferryman', name: 'Ferryman Gen', look: 'npc_civ_3', x: 164, z: 46, yaw: 2.8, color: '#c8b088',
    lines: [['Forty years I ran the Sakurajima ferry. Now the sea stops at a wall of light.'], ['The ash spirits come down the slopes at dusk. It\'s always dusk now.']] });
  R.person({ id: 'sk_keeper', name: 'Onsen Keeper Yae', look: 'npc_civ_4', x: 92, z: 214, yaw: -1.4, color: '#ffc8a8',
    lines: [['Volcano water heals everything. Burns, bruises, broken hearts. Get in, get in!'], ['Players fight anywhere, but nobody fights in my bath.']] });

  // ------------------------------------------------------------ curses, players, safe ground
  R.roamZone(10, 10, 310, 310, { kinds: ['ashspirit', 'ashspirit', 'swarmer', 'grasshopper', 'maw', 'lantern', 'flyhead'], level: 3, dense: true });
  R.safeZone(138, 200, 174, 230);
  R.safeZone(56, 194, 106, 240);
  R.safeZone(142, 26, 180, 48);
  setupColony(R, {
    name: 'Sakurajima Colony', color: '#ff9a5a',
    intro: ['Sakurajima Colony! Hot, hot, HOT! Mind the lava, players!', 'The Zen\'in Hei are camped on the north-east slope, and something wearing Naoya Zen\'in\'s face haunts the crater.', 'The onsen in the south-west heals. Kogane recommends it!'],
    cap: 3,
    playerZones: [
      { x0: 214, z0: 50, x1: 272, z1: 104, roster: ['hei', 'hei', 'hei_archer'], level: 4, max: 4, elite: 0.15 },
      { x0: 20, z0: 20, x1: 300, z1: 300, roster: ['brawler', 'caster', 'lancer', 'hei'], level: 3, max: 2 },
    ],
    events: [
      { kind: 'ash', rate: 22, color: [0.5, 0.47, 0.45] },
      { kind: 'eruption', crater: [V.x, peakY + 2, V.z], radius: 62, dmg: 16 },
      { kind: 'steam', pools, rect: { x0: 58, z0: 196, x1: 104, z1: 238 } },
      { kind: 'lava', dps: 7 },
    ],
  });
  return R.finish({ spawn: [160, 52], biome: SAKURAJIMA_BIOME, sunOffset: new THREE.Vector3(-34, 22, 10), backdrop: { c0: 0x3a1812, c1: 0x8a4a3a, ground: 0x1a2a3a } });
}

registerRegion('colony_sakurajima', {
  name: 'Sakurajima Colony', sub: 'Culling Game · Maki and the Zen\'in', kind: 'colony', grid: [0, 2],
  color: '#7a3a22', accent: '#ff9a5a', icon: '🌋',
  blurb: 'A volcanic island under a red sky: ash, lava rivers, the Zen\'in Hei and hot springs.',
  biome: SAKURAJIMA_BIOME, build,
});
