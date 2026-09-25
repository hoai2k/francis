// Stage-1 showcase: a detailed Jujutsu High shrine courtyard at night with a
// shrine hall, pond + waterfall, glowing cursed pool, a raised ledge with
// stairs, a bridge over a deep pit, a grassy grove, destructibles and lots of
// small decoration.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';

export const FY = 6;   // floor surface height

export function buildTestRoom() {
  const world = new World(72, 30, 60);
  const deco = new Decorations();
  const shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, 1234);
  const W = world;

  // ---- ground: courtyard + grove, then carve the pit
  k.floor(0, 0, 71, 59, FY, B.stone_brick, 4, B.cobble, 0.25);
  k.floor(46, 0, 71, 59, FY, B.grass, 4, B.dirt, 0.04);
  k.floor(15, 20, 25, 34, FY, B.dirt_path, 1, B.cobble, 0.3);
  k.pit(39, 0, 45, 59, FY, 30);

  // ---- courtyard walls with windows (north) and doors
  k.room(2, 2, 38, 50, FY, 7, B.stone_brick, { alt: B.mossy_brick, altP: 0.25, trim: B.dark_planks, doors: [{ side: 'e', at: 24, width: 3 }] });
  for (const wx of [8, 16, 30]) { W.fill(wx, FY + 3, 2, wx + 1, FY + 5, 2, 0); shafts.add(new THREE.Vector3(wx + 1, FY + 5, 2.5), new THREE.Vector3(0.25, -1, 0.9), 11, 1.8, 0xaab8ff); }
  k.cobwebCorners(2, 2, 38, 50, FY + 6);
  // cracked (breakable) wall section leading to a secret nook
  W.fill(2, FY, 28, 2, FY + 2, 30, B.cracked_brick);
  k.room(-4, 26, 2, 32, FY, 4, B.dark_brick);
  W.fill(0, FY + 3, 26, 1, FY + 3, 32, B.dark_brick);
  deco.add('bone', 0.5, FY, 29.5, { mode: 'flat', scale: 0.8 });
  deco.add('candle', 1.2, FY, 28.5, { scale: 0.6, emit: 2.5, sway: 0 }); W.addLight(1.2, FY + 0.6, 28.5, 0xffa040, 2.5, 5);

  // ---- red lacquered pillars (destructible)
  for (let z = 8; z <= 44; z += 6) for (const x of [6, 34]) { k.pillar(x, z, FY, 6, B.pillar_red, B.dark_planks); deco.add('talisman', x + 0.5, FY + 2.2, z + 1.03, { mode: 'wall', facing: [0, 1], scale: 0.9 }); }
  // wall torches
  for (let z = 6; z <= 46; z += 8) { k.torch(3, FY + 2, z, [1, 0]); k.torch(37, FY + 2, z, [-1, 0]); }
  for (let x = 10; x <= 34; x += 10) k.torch(x, FY + 2, 3, [0, 1]);

  // ---- shrine hall
  k.shrine(12, 7, 24, 16, FY, { door: 's' });
  k.lanternPost(14, 19, FY); k.lanternPost(22, 19, FY);
  deco.prop('torii', 18.5, FY, 36.5, { w: 5, h: 5 });

  // ---- pond with stepping stones
  k.pond(5, 30, 11, 40, FY, B.water, 2);
  W.set(8, FY - 1, 34, B.stone); W.set(8, FY - 1, 36, B.stone);
  for (let i = 0; i < 6; i++) deco.add('fern', 5 + i * 1.2, FY, 29.4, { scale: 0.9 });

  // ---- cursed pool in the floor
  k.pond(15, 25, 18, 28, FY, B.cursed_pool, 1, B.obsidian);
  deco.add('bone', 14.2, FY, 29.5, { mode: 'flat', scale: 0.9 });
  deco.add('bone', 19.4, FY, 24.2, { mode: 'flat', scale: 0.7 });

  // ---- raised ledge with stairs + waterfall
  W.fill(26, FY, 37, 37, FY + 3, 49, B.stone_brick);
  for (let x = 26; x <= 37; x++) W.set(x, FY + 3, 37, B.mossy_brick);
  k.stairs(29, 33, FY, 4, [0, 1], 3, B.cobble);
  W.fill(29, FY, 33, 31, FY + 3, 36, 0);
  k.stairs(29, 33, FY, 4, [0, 1], 3, B.cobble);
  k.pond(31, 42, 35, 46, FY + 4, B.cursed_pool, 1, B.obsidian);
  // waterfall pouring off the ledge into a basin
  W.fill(27, FY + 3, 45, 28, FY + 3, 46, B.water); W.fill(25, FY, 45, 25, FY + 3, 46, B.water);
  W.set(26, FY + 3, 45, B.water); W.set(26, FY + 3, 46, B.water);
  k.pond(22, 44, 24, 47, FY, B.water, 1);
  W.fill(22, FY - 1, 44, 25, FY - 1, 47, B.water);
  deco.prop('stone_lantern', 36.5, FY + 4, 38.5); W.addLight(36.5, FY + 5.3, 38.5, 0xffb050, 4, 9); W.set(36, FY + 4, 38, B.barrier);
  deco.prop('candle_cluster', 27.5, FY + 4, 48.5); W.addLight(27.5, FY + 4.6, 48.5, 0xffa040, 2.5, 6);

  // ---- destructibles
  for (const [x, z] of [[9, 8], [10, 8], [9, 9], [28, 8], [29, 8]]) k.destructible(x, FY, z, B.crate);
  W.set(9, FY + 1, 8, B.crate);
  for (const [x, z] of [[31, 20], [32, 20], [32, 21], [8, 22]]) k.destructible(x, FY, z, B.barrel);
  // training dummy spot
  deco.add('paper', 20.5, FY, 22.5, { mode: 'flat', scale: 1.2 });

  // ---- banners on the courtyard walls
  for (const x of [12, 20, 28]) deco.add('banner', x + 0.5, FY + 4.5, 49.97, { mode: 'wall', facing: [0, -1], scale: 2, sway: 0.4 });
  for (const z of [14, 36]) deco.add('banner', 37.97, FY + 4.5, z + 0.5, { mode: 'wall', facing: [-1, 0], scale: 2, sway: 0.4 });

  // ---- bridge over the pit
  k.bridge(38, 23, 46, 25, FY, B.planks, B.dark_planks);
  W.set(38, FY, 23, 0); W.set(38, FY, 25, 0);
  // chains hanging into the pit
  for (let z = 6; z < 56; z += 7) deco.add('chain', 39.5 + (z % 3), FY + 1, z + 0.5, { mode: 'hang', scale: 3, sway: 0.3 });

  // ---- grove across the pit
  for (const [x, z] of [[50, 8], [58, 14], [66, 6], [52, 40], [63, 44], [68, 30], [49, 52]]) k.tree(x, z, FY);
  // cliff terrace with natural steps
  W.fill(60, FY, 20, 71, FY + 2, 38, B.dirt); for (let z = 20; z <= 38; z++) for (let x = 60; x <= 71; x++) W.set(x, FY + 2, z, B.grass);
  W.fill(58, FY, 26, 59, FY, 30, B.grass); W.fill(59, FY + 1, 26, 59, FY + 1, 30, B.grass); W.set(58, FY, 26, B.grass);
  deco.prop('torii', 52.5, FY, 24.5, { w: 4, h: 4 });
  k.lanternPost(49, 21, FY); k.lanternPost(49, 27, FY);
  k.lanternPost(66, 28, FY + 3);
  W.fill(64, FY + 3, 32, 68, FY + 3, 36, 0);
  k.scatter(46, 0, 71, 59, { density: 0.35 });
  deco.add('talisman', 60.02, FY + 1.5, 32.5, { mode: 'wall', facing: [-1, 0], scale: 1 });

  // tall grass along the courtyard edges
  k.scatter(3, 3, 37, 49, { density: 0.0 });

  world.collectBlockLights();
  const spawn = new THREE.Vector3(20.5, FY, 30.5);
  const dummy = new THREE.Vector3(20.5, FY, 22.5);
  return { world, deco, shafts, spawn, dummy, kit: k };
}
