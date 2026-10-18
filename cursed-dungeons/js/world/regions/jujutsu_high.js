// Region 1 — jujutsu_high: Tokyo Jujutsu High and its mountain valley.
// The hand-built campus (world/jujutsuHigh.js) is stamped into the middle of
// a 320×320 mountain region: cedar ridges all round, the campus on its
// hilltop, the valley road along the foot of the long stairs, and the little
// town of Takao-machi south of the road (houses, a shrine, the train station,
// townsfolk and side quests). Roads leave through four gates: north over the
// pass to the Cursed Forest, west to Kyoto, east to Shinjuku, south to Shibuya.
// Window stations: the foot of the campus stairs and Takao-machi station.
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B } from './common.js';
import { buildJujutsuHigh, HUB_BIOME, FY } from '../jujutsuHigh.js';

const OX = 96, OY = 6, OZ = 36;           // where the campus sits in the region
const BASE = OY + FY - 11;                 // the valley floor (campus road level) = 9

export const JUJUTSU_HIGH_BIOME = { ...HUB_BIOME, name: 'Jujutsu High', sub: 'Tokyo Prefectural · Mountain Valley' };

function build(ctx) {
  const C = buildJujutsuHigh({ embed: true });
  const [CW, CH, CD] = C.size;
  const R = new RegionBuilder(ctx, { size: [320, 64, 320], base: BASE });
  const inCampus = (x, z) => x >= OX && x < OX + CW && z >= OZ && z < OZ + CD;
  const campusEdgeH = (x, z) => C.groundAt(Math.max(0, Math.min(CW - 1, x - OX)), Math.max(0, Math.min(CD - 1, z - OZ))) + OY;
  const rectDist = (x, z) => Math.hypot(Math.max(OX - x, 0, x - (OX + CW - 1)), Math.max(OZ - z, 0, z - (OZ + CD - 1)));

  // ------------------------------------------------------------ plan
  const ROADZ = OZ + 127.5;                // the campus road (asphalt) continues east and west
  R.gate('w', 'kyoto', { at: Math.floor(ROADZ), y: BASE, road: false });
  R.gate('e', 'shinjuku', { at: Math.floor(ROADZ), y: BASE, road: false });
  R.gate('s', 'shibuya', { at: 160, y: BASE, road: false });
  R.gate('n', 'cursed_forest', { at: 70, y: BASE, road: false });
  const asphalt = { width: 6, block: B.asphalt, alt: null, y: BASE, line: B.asphalt_line };
  R.road([[1, ROADZ], [OX - 1, ROADZ]], asphalt);
  R.road([[OX + CW, ROADZ], [318, ROADZ]], asphalt);
  R.road([[160.5, OZ + CD], [160.5, 252], [160.5, 318]], { width: 6, block: B.cobble, alt: B.stone_brick, y: BASE });   // the town's main street, then south
  R.road([[86, ROADZ], [80, 120], [72, 64], [70.5, 1]], { width: 6, block: B.dirt_path, alt: B.cobble, altP: 0.2, y: 'follow' });   // the mountain pass north
  R.road([[124, 200], [200, 200]], { width: 5, block: B.cobble, alt: B.stone_brick, y: BASE });
  R.road([[124, 228], [200, 228]], { width: 4, block: B.dirt_path, y: BASE });
  R.road([[196, 200], [252, 236], [276, 262]], { width: 4, block: B.dirt_path, y: 'follow' });   // to the mountain shrine
  R.flat(112, OZ + CD, 210, 244, { y: BASE });           // Takao-machi
  R.flat(150, 206, 170, 222, { y: BASE, block: B.stone_brick, alt: B.cobble });   // the town square
  R.station('campus', 'Jujutsu High · Stairs', 175, OZ + 120, { y: BASE, facing: 's' });
  R.station('town', 'Takao-machi Station', 204, 240, { y: BASE, facing: 'n' });
  R.flat(270, 254, 283, 272, { y: 'auto' });               // the mountain shrine's terrace
  R.flat(33, 223, 47, 237, { y: 'auto' });                 // the lookout
  R.river([[300, 40], [262, 120], [244, 150], [240, 175], [252, 250], [232, 318]], { width: 4, depth: 2 });
  R.lair('m1', 200, 246, { y: BASE });                    // the old school wing at the edge of town
  R.flat(186, 242, 214, 270, { y: BASE });

  // ------------------------------------------------------------ terrain: cedar mountains, eased into the campus edges
  const N = R.noise;
  R.terrain({
    falloff: 14,
    fn: (x, z) => {
      const m = BASE + 3 + 28 * Math.pow(N.ridge(x * 0.012, z * 0.012, 4), 1.6) + 6 * N.fbm(x * 0.05, z * 0.05, 2);
      const d = rectDist(x, z);
      if (d < 18) { const t = 1 - d / 18; return m + (campusEdgeH(x, z) - m) * t * t * (3 - 2 * t); }
      return m;
    },
  });
  R.carve({ top: B.grass, sub: B.dirt, rock: B.stone, rock2: B.mossy_brick, rockSlope: 3 });

  // ------------------------------------------------------------ stamp the campus
  const W = R.world;
  for (let z = 0; z < CD; z++) for (let x = 0; x < CW; x++) {
    const rx = x + OX, rz = z + OZ;
    W.column(rx, rz, 0, R.sy - 1, 0);
    let low = -1;
    for (let y = 0; y < CH && y + OY < R.sy; y++) { const id = C.world.data[(y * CD + z) * CW + x]; if (id) { W.setRaw(rx, y + OY, rz, id); if (low < 0) low = y + OY; } }
    W.column(rx, rz, 0, (low < 0 ? OY : low) - 1, B.stone);
    R.H[R.i(rx, rz)] = C.groundAt(x, z) + OY;
    R.lock[R.i(rx, rz)] = 2;
  }
  const off = new THREE.Vector3(OX, OY, OZ);
  const sh = (v) => v.clone().add(off);
  for (const L of C.world.staticLights) W.staticLights.push({ ...L, x: L.x + OX, y: L.y + OY, z: L.z + OZ });
  for (const r of C.world.roofs) W.addRoof([r.min[0] + OX, r.min[1] + OY, r.min[2] + OZ], [r.max[0] + OX, r.max[1] + OY, r.max[2] + OZ],
    [[r.interior[0][0] + OX, r.interior[0][1] + OY, r.interior[0][2] + OZ], [r.interior[1][0] + OX, r.interior[1][1] + OY, r.interior[1][2] + OZ]]);
  for (const { type, x, y, z, ...o } of C.deco.items) R.deco.add(type, x + OX, y + OY, z + OZ, o);
  for (const { kind, x, y, z, ...o } of C.deco.props) R.deco.prop(kind, x + OX, y + OY, z + OZ, o);
  const campusProps = C.hub;
  R.deco.extra(() => { const m = campusProps.build(); if (m) m.position.copy(off); return m; });
  C.shafts.group.position.copy(off);
  R.shafts = C.shafts;
  R.paveRoads();

  // ------------------------------------------------------------ Takao-machi
  const houses = [];
  const street = (zc, side, x0, x1, door) => { for (let x = x0; x + 7 <= x1; x += 11) { if (Math.abs(x + 4 - 160) < 8) continue; houses.push(R.house(x, side < 0 ? zc - 9 : zc + 3, 8 + Math.floor(R.r() * 2), 6, { door, floors: R.chance(0.3) ? 2 : 1, wall: R.chance(0.5) ? B.plaster : B.planks })); } };
  street(200, -1, 116, 206, 's'); street(200, 1, 116, 150, 'n'); street(200, 1, 172, 196, 'n');
  street(228, -1, 116, 150, 's'); street(228, 1, 116, 206, 'n'); street(228, -1, 172, 182, 's');
  // shops along the main street with paper lanterns
  for (let z = OZ + CD + 6; z < 196; z += 10) for (const s of [-1, 1]) { const x = 160.5 + s * 5; R.lantern(x, z + 0.5); }
  for (let x = 128; x <= 196; x += 12) { R.streetLight(x + 0.5, 197.5); R.streetLight(x + 0.5, 225.5); }
  // the square: a fountain, a sakura and benches
  {
    const y = BASE;
    W.fill(158, y, 212, 162, y, 216, B.stone_brick); W.fill(159, y, 213, 161, y, 215, B.water); W.set(160, y + 1, 214, B.stone_brick); W.set(160, y + 2, 214, B.water);
    R.tree(152, 208, 'sakura', { y }); R.tree(168, 220, 'sakura', { y });
    R.poi('square', 'Takao-machi Square', '⛲', 160, 214, 'town');
  }
  // the town shrine (east end)
  {
    const y = BASE;
    R.kit.shrine(200, 204, 208, 212, y, { door: 'w' });
    R.torii(196.5, y, 208.5, 4, 4.4, { along: 'z' });
    R.poi('town_shrine', 'Hachiman Shrine', '⛩', 204, 208, 'shrine');
  }
  // the old school wing (Sugisawa Third High's annex, chapter 1's curtain)
  {
    R.tower(190, 254, 22, 12, 3, { wall: B.plaster, trim: B.dark_planks, win: B.window_dark, door: 'n' });
    R.fence(186, 248, 214, 248, BASE);
    R.poi('old_school', 'Old School Wing', '🏫', 201, 258, 'lair');
  }
  // the mountain shrine and lookout (points of interest in the wild)
  {
    const sx = 276, sz = 262, y = R.floor(sx, sz);
    R.kit.shrine(sx - 4, sz - 4, sx + 4, sz + 4, y, { door: 's' });
    R.torii(sx + 0.5, y, sz + 7.5, 4, 4.2);
    R.poi('mountain_shrine', 'Mountain Shrine', '⛰', sx, sz, 'shrine');
    R.anchor('mountain_shrine', sx, sz + 7);
    R.poi('pass', 'Takao Pass', '🗻', 72, 64, 'landmark');
    R.anchor('pass', 74, 70);
    R.poi('lookout', 'Cedar Lookout', '👁', 40, 230, 'landmark');
    R.ruin(40, 230, 6);
    R.anchor('lookout', 44, 230);
  }

  // ------------------------------------------------------------ cedar forests on every slope, sakura by the town
  R.forest({ kinds: ['cedar', 'cedar', 'cedar', 'oak'], density: (x, z) => (inCampus(x, z) ? 0 : 0.55), step: 3, where: (x, z) => !inCampus(x, z) && !(x > 108 && x < 214 && z > OZ + CD - 2 && z < 274) });
  R.forest({ kinds: ['sakura', 'oak'], density: 0.18, step: 6, rect: [112, OZ + CD + 2, 210, 244] });
  R.scatter({ density: 0.1, types: ['grass', 'grass', 'tall_grass', 'flower_red', 'flower_blue', 'fern', 'grass'] });
  // clear trees off the campus rect (the forest pass skipped it) — the campus brought its own

  // ------------------------------------------------------------ townsfolk
  const sq = (x, z) => ({ x, z });
  R.person({ id: 'jh_grandma', name: 'Grandma Fumi', look: 'npc_civ_4', ...sq(150, 210), yaw: 0.6, pose: 'idle', color: '#e8b0c0',
    lines: [['Oh, a student from up the hill! You lot keep this valley safe, you know.', 'My mother used to say the cedars whisper when curses are near.'], ['Mind the forest past the pass. Even the foxes stay away.']] });
  R.person({ id: 'jh_kenji', name: 'Kenji (grocer)', look: 'npc_civ_1', ...sq(166, 204), yaw: -0.4, pose: 'idle', color: '#8ad06a',
    lines: [['Fresh daikon! ...You\'re one of those sorcerer kids? Then you\'ve got no time for daikon.'], ['Business has been slow since things started crawling out of the mountains at night.']] });
  R.person({ id: 'jh_aoi', name: 'Aoi', look: 'npc_civ_2', ...sq(140, 232), yaw: 2.4, pose: 'wander', wander: 5, color: '#7ab8ff',
    lines: [['Is it true there\'s a school for sorcerers up there? It just looks like a temple to me.'], ['I want to be a Window when I grow up. They can see curses but never fight them.']] });
  R.person({ id: 'jh_station', name: 'Station Master', look: 'npc_civ_3', ...sq(180, 234), yaw: Math.PI, pose: 'idle', color: '#ffd27a',
    lines: [['Takao-machi Station. The Window runs a special line for sorcerers: touch the blue shrine to ride it.', 'Any Window station you have visited is one ride away.']] });
  R.person({ id: 'jh_monk', name: 'Monk Ryoun', look: 'npc_civ_5', ...sq(196, 210), yaw: Math.PI / 2, pose: 'idle', color: '#d8a86a',
    lines: [['The shrine bell rang by itself last night. Three times.', 'Something is unsettled on the mountain.']] });
  R.person({ id: 'jh_kid', name: 'Haru', look: 'npc_civ_0', ...sq(158, 222), yaw: 0, pose: 'wander', wander: 6, color: '#ffa050',
    lines: [['Can you do a cool technique? Do a cool technique!'], ['My cat ran off toward the old school. Mum says I can\'t go there.']] });

  // ------------------------------------------------------------ anchors for quests
  const S = {};
  for (const [k, v] of Object.entries(C.spots)) S[k] = sh(v);
  for (const [k, v] of Object.entries(S)) R.anchor(k, v.x - 0.5, v.z - 0.5, v.y);
  R.anchor('lair_m7', S.trainingGround.x + 3.5, S.trainingGround.z + 6.5, S.trainingGround.y);
  R.anchor('town_square', 160, 218);
  R.anchor('old_school', 201, 250);

  // ------------------------------------------------------------ curses: the wild slopes only (the campus is behind Tengen's barrier)
  R.roamZone(4, 4, 92, 316, { kinds: ['swarmer', 'swarmer', 'spitter', 'flyhead'], level: 1 });
  R.roamZone(228, 4, 316, 316, { kinds: ['swarmer', 'spitter', 'grasshopper'], level: 1 });
  R.roamZone(92, 4, 228, 30, { kinds: ['swarmer', 'flyhead'], level: 1 });
  R.roamZone(100, 276, 228, 316, { kinds: ['swarmer', 'spitter'], level: 1 });
  R.safeZone(OX + 10, OZ + 15, OX + 120, OZ + 97);       // Tengen's barrier over the campus
  R.safeZone(108, OZ + CD - 4, 214, 246);                 // the town

  const L = R.finish({
    spawn: sh(C.spawn), biome: JUJUTSU_HIGH_BIOME, sunOffset: C.sunOffset,
    titleCam: { center: sh(C.titleCam.center), dist: C.titleCam.dist, pitch: C.titleCam.pitch },
    stage: sh(C.stage), backdrop: { c0: 0x1e2a36, c1: 0x56607a, ground: 0x1c2a22 },
    extra: {
      spots: S, npcs: Object.fromEntries(Object.entries(C.npcs).map(([k, n]) => [k, { ...n, pos: sh(n.pos) }])),
      dummy: sh(C.dummy), mapTable: sh(C.mapTable), shop: sh(C.shop), stash: sh(C.stash), skills: sh(C.skills),
      pond: { ...C.pond, cx: C.pond.cx + OX, cz: C.pond.cz + OZ, y: C.pond.y + OY, bridgeZ: 27.5 + OZ },
      core: { x0: C.core.x0 + OX, z0: C.core.z0 + OZ, x1: C.core.x1 + OX, z1: C.core.z1 + OZ },
      hub: true,
    },
  });
  return L;
}

registerRegion('jujutsu_high', {
  name: 'Jujutsu High', sub: 'Tokyo · the mountains and Takao-machi', kind: 'hub', grid: [1, 1],
  color: '#5a4a8a', accent: '#ffd27a', icon: '⛩',
  blurb: 'The school on the hill, the valley town below, cedar ridges all round.',
  biome: JUJUTSU_HIGH_BIOME, build,
});
