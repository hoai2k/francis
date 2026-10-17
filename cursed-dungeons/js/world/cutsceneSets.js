// Small worlds built only for cutscenes (story/cutscenes.js):
//   school   a Japanese high school in Sendai at night: the three-storey
//            building with its lit and dark windows, the sandy schoolyard,
//            the fence and gate, the street outside. Where the opening
//            happens (the finger, the curse, the awakening, Gojo).
// Each returns the shape game.loadWorld() takes plus the spots the shots use.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildSchoolSet() {
  const SX = 80, SY = 36, SZ = 72, FY = 4;
  const world = new World(SX, SY, SZ), deco = new Decorations(), shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, 4417), W = world;
  // ---- ground: sandy schoolyard, a concrete walk to the doors, the street outside
  k.floor(0, 0, SX - 1, SZ - 1, FY, B.sand, 4, B.dirt, 0.12);
  for (let z = 18; z < 61; z++) for (let x = 36; x <= 44; x++) W.set(x, FY - 1, z, x === 36 || x === 44 ? B.cobble : B.concrete);
  for (let z = 61; z < 64; z++) for (let x = 0; x < SX; x++) W.set(x, FY - 1, z, B.concrete);
  for (let z = 64; z < SZ; z++) for (let x = 0; x < SX; x++) W.set(x, FY - 1, z, (z === 67 || z === 68) && x % 6 < 3 ? B.asphalt_line : B.asphalt);
  // a running track painted around the sports ground (east)
  for (let z = 26; z <= 54; z++) for (let x = 52; x <= 74; x++) { const e = x === 52 || x === 74 || z === 26 || z === 54; if (e) W.set(x, FY - 1, z, B.plaster); }
  // ---- the fence and the gate
  for (let x = 0; x < SX; x++) {
    if (x >= 35 && x <= 45) continue;
    W.set(x, FY, 60, B.metal_grate); if (x % 5 === 0) { W.set(x, FY + 1, 60, B.concrete); W.set(x, FY, 60, B.concrete); } else W.set(x, FY + 1, 60, B.metal_grate);
  }
  for (const x of [34, 46]) for (let y = FY; y < FY + 3; y++) { W.set(x, y, 60, B.concrete); W.set(x, y, 61, B.concrete); }
  W.set(34, FY + 3, 60, B.lantern); W.set(46, FY + 3, 60, B.lantern);
  for (let z = 20; z < 60; z++) { W.set(0, FY, z, B.metal_grate); W.set(SX - 1, FY, z, B.metal_grate); }
  // ---- the school: three storeys of white plaster, concrete floor bands, rows of windows
  const X0 = 8, X1 = 72, Z0 = 6, Z1 = 18, H = 12;
  W.fill(X0, FY, Z0, X1, FY + H - 1, Z1, B.plaster);
  for (let x = X0; x <= X1; x++) for (const y of [FY + 4, FY + 8]) { W.set(x, y, Z1, B.concrete); W.set(x, y, Z0, B.concrete); }
  for (let z = Z0; z <= Z1; z++) for (const y of [FY + 4, FY + 8]) { W.set(X0, y, z, B.concrete); W.set(X1, y, z, B.concrete); }
  const lit = (x, f) => ((x * 7 + f * 13) % 11) < 3;   // a few classrooms still lit
  for (let f = 0; f < 3; f++) {
    const y = FY + 1 + f * 4;
    for (let x = X0 + 2; x < X1 - 1; x++) {
      if ((x - X0) % 4 === 1) continue;   // pillars between the windows
      if (f === 0 && x >= 37 && x <= 43) continue;   // the entrance
      const id = lit(Math.floor((x - X0) / 4), f) ? B.window : B.window_dark;
      W.set(x, y, Z1, id); W.set(x, y + 1, Z1, id);
    }
  }
  // entrance: glass doors under a little concrete canopy
  for (let x = 37; x <= 43; x++) { W.set(x, FY, Z1, B.window_dark); W.set(x, FY + 1, Z1, B.window_dark); W.set(x, FY + 2, Z1, B.concrete); }
  for (let x = 36; x <= 44; x++) for (let z = Z1 + 1; z <= Z1 + 3; z++) W.set(x, FY + 3, z, B.concrete);
  for (const x of [36, 44]) for (let y = FY; y < FY + 3; y++) W.set(x, y, Z1 + 3, B.concrete);
  W.addLight(40.5, FY + 2.6, Z1 + 2, 0xd8e8ff, 3, 8);
  // the clock above the doors and the parapet fence on the roof
  W.fill(39, FY + 9, Z1, 41, FY + 11, Z1, B.concrete); W.set(40, FY + 10, Z1, B.sign);
  for (let x = X0; x <= X1; x++) { W.set(x, FY + H, Z1, B.metal_grate); W.set(x, FY + H, Z0, B.metal_grate); }
  for (let z = Z0; z <= Z1; z++) { W.set(X0, FY + H, z, B.metal_grate); W.set(X1, FY + H, z, B.metal_grate); }
  // stair tower and water tank on the roof
  W.fill(58, FY + H, 8, 63, FY + H + 3, 12, B.plaster); W.fill(58, FY + H + 4, 8, 63, FY + H + 4, 12, B.concrete);
  W.set(60, FY + H + 1, 12, B.window_dark); W.set(60, FY + H, 12, B.window_dark);
  W.fill(18, FY + H, 9, 21, FY + H + 3, 12, B.metal_grate);
  // gym (west, low and wide) with a curved-looking stepped roof
  W.fill(0, FY, 24, 14, FY + 7, 44, B.concrete);
  for (let s = 0; s < 3; s++) W.fill(0, FY + 8 + s, 26 + s * 2, 14, FY + 8 + s, 42 - s * 2, B.roof);
  for (let z = 26; z <= 42; z += 3) { W.set(14, FY + 4, z, B.window_dark); W.set(14, FY + 5, z, B.window_dark); }
  // ---- trees along the fence (cherry trees, bare green at night), shrubs, the lights
  for (let z = 22; z < 58; z += 7) { k.tree(20, z, FY, { h: 5 }); }
  for (let x = 50; x < 78; x += 8) k.tree(x, 58, FY, { h: 5 });
  k.tree(4, 52, FY, { h: 6 }); k.tree(28, 56, FY, { h: 5 });
  for (const [x, z] of [[46.5, 32.5], [33.5, 44.5], [46.5, 52.5]]) { deco.prop('streetlight', x, FY, z); W.addLight(x + 1, FY + 4.8, z, 0xfff0d0, 6, 11); }
  for (let x = 6; x < SX; x += 14) { deco.prop('streetlight', x + 0.5, FY, 62.5); W.addLight(x + 1.5, FY + 4.8, 62.5, 0xffe0b0, 5, 10); }
  deco.prop('bench', 34.5, FY, 30.5); deco.prop('bench', 46, FY, 40.5);
  deco.prop('car', 22, FY, 66, { color: 0x2a3a5a }); deco.prop('car', 60, FY, 69.5, { color: 0x6a6a70 });
  // a vending machine by the gate (every Japanese school has one)
  W.set(48, FY, 59, B.vending); W.set(48, FY + 1, 59, B.vending);
  k.scatter(0, 18, SX - 1, 59, { density: 0.05, types: ['grass', 'grass', 'tall_grass'] });
  world.collectBlockLights();
  const you = V(40.5, FY, 34.5);
  return {
    world, deco, shafts, kit: k, FY, spawn: you.clone(), stage: you.clone(),
    you,                                   // the player stands here, facing the school (north, -z)
    roof: V(40.5, FY + H + 1, Z1 + 0.5),       // where the curse crawls over the parapet
    curseLand: V(40.5, FY, 28.5),
    gojoRoof: V(29.5, FY + H + 1, Z1 + 0.5),   // on the parapet
    gojoLand: V(42.6, FY, 35.4),
    gate: V(40.5, FY, 60.5),
    school: V(40, FY + 6, 12),
  };
}
