// Year 4 locations: the bed of the Black Lake (second task), the hedge maze on the
// Quidditch pitch (third task) and the graveyard where the Hollow King returns.
import * as THREE from 'three';
import { G } from '../state.js';
import { OFFSETS, makeZone } from './interiors.js';
import { Colliders } from '../collision.js';
import { Builder, mat4, instanced } from './builder.js';
import { materials } from './materials.js';
import { textTexture, glowSprite } from '../textures.js';
import { fbm, noise2, smoothstep, mulberry32 } from '../util.js';

OFFSETS.lakebed = new THREE.Vector3(10000, 0, 0);

// ================================================================== THE LAKE BED
export function lakeFloor(x, z) {
  const lx = x - OFFSETS.lakebed.x, lz = z - OFFSETS.lakebed.z;
  let h = (fbm(lx * 0.02, lz * 0.02, 3) - 0.5) * 8;
  h += smoothstep(70, 110, Math.hypot(lx, lz + 60)) * 30; // basin walls
  return h - 2;
}
export function buildLakebed(Q) {
  const M = materials();
  const zone = makeZone('lakebed', 'The Bed of the Black Lake', { fog: { color: 0x0a3040, density: 0.04 }, noSave: true, noCompanion: true });
  const { W } = zone;
  const col = zone.colliders;
  col.terrain = lakeFloor;
  const seg = Q.terrainSeg < 150 ? 60 : 90;
  const geo = new THREE.PlaneGeometry(240, 240, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, lakeFloor(pos.getX(i) + OFFSETS.lakebed.x, pos.getZ(i) + OFFSETS.lakebed.z - 60) );
  geo.computeVertexNormals();
  const sand = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a6a4a, roughness: 1 }));
  sand.position.set(0, 0, -60);
  sand.receiveShadow = true;
  zone.group.add(sand);
  // the surface far above, rippling light
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.6, 0.7), transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  surf.rotation.x = Math.PI / 2; surf.position.set(0, 30, -60);
  zone.group.add(surf);
  // kelp forest (instanced, swaying in the vertex shader)
  const rnd = mulberry32(17);
  const kelpM = [];
  for (let i = 0; i < Math.floor(500 * Q.trees + 120); i++) {
    const x = (rnd() - 0.5) * 200, z = -60 + (rnd() - 0.5) * 200;
    if (Math.hypot(x, z + 110) < 22) continue; // keep the merfolk village clear
    const h = 6 + rnd() * 12;
    kelpM.push(mat4(x, lakeFloor(x + OFFSETS.lakebed.x, z) + h / 2, z, rnd() * 6, 1, h / 10, 1));
  }
  const kg = new THREE.PlaneGeometry(0.8, 10, 1, 6);
  const kmat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.9, side: THREE.DoubleSide });
  const sway = { value: 0 };
  kmat.onBeforeCompile = (sh) => {
    sh.uniforms.time = sway;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;').replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat k = (position.y + 5.0) / 10.0; transformed.x += sin(time * 1.3 + instanceMatrix[3].x * 0.3) * k * k * 1.2; transformed.z += cos(time + instanceMatrix[3].z * 0.3) * k * k * 0.8;');
  };
  zone.group.add(instanced(kg, kmat, kelpM, { cast: false }));
  // rocks
  const B = new Builder();
  for (let i = 0; i < 60; i++) { const x = (rnd() - 0.5) * 180, z = -60 + (rnd() - 0.5) * 180; B.add(new THREE.DodecahedronGeometry(1 + rnd() * 2.5, 0), M.rock, mat4(x, lakeFloor(x + OFFSETS.lakebed.x, z), z, rnd() * 6, 1, 0.7, 1)); }
  // the merfolk village: stone huts round a statue
  const vc = { x: 0, z: -110 };
  const vy = lakeFloor(OFFSETS.lakebed.x + vc.x, vc.z);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = vc.x + Math.cos(a) * 16, z = vc.z + Math.sin(a) * 16;
    B.add(new THREE.CylinderGeometry(2.6, 3, 4, 10), M.stoneDark, mat4(x, vy + 2, z));
    B.add(new THREE.ConeGeometry(3.2, 2.4, 10), M.stone, mat4(x, vy + 5.2, z));
    zone.anchors.push({ pos: W(x, vy + 3, z), color: 0x60ffc0, intensity: 6, distance: 8 });
  }
  B.add(new THREE.CylinderGeometry(1.4, 1.8, 6, 10), M.stoneWarm, mat4(vc.x, vy + 3, vc.z));
  B.add(new THREE.SphereGeometry(1.4, 12, 10), M.stoneWarm, mat4(vc.x, vy + 7, vc.z));
  B.build(zone.group);
  zone.spots = { start: W(0, 26, 10), village: W(vc.x, vy, vc.z), statue: W(vc.x, vy + 2, vc.z + 2.2), surface: 28 };
  zone.spawn = { pos: zone.spots.start, yaw: Math.PI };
  zone.dirLight = { dir: new THREE.Vector3(0.1, 1, 0.1), color: 0x80d0e0, intensity: 0.9 };
  zone.hemi = { sky: 0x4a8a9a, ground: 0x0a1a1a, intensity: 0.9 };
  zone.exposure = 1.25;
  zone.env = 0.15;
  zone.update = (dt, t) => {
    sway.value = t;
    if (Math.random() < 0.4) G.fx.emit({ pos: G.player.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 20, -2, (Math.random() - 0.5) * 20)), color: 0xbfe8ff, count: 1, speed: 0.2, size: 0.12, life: 3, intensity: 1.2, gravity: -1.2, noScale: true });
  };
  return zone;
}

// ================================================================== THE HEDGE MAZE
OFFSETS.maze = new THREE.Vector3(11000, 0, 0);
export function buildMaze(Q) {
  const M = materials();
  const zone = makeZone('maze', 'The Hedge Maze', { fog: { color: 0x0a0e12, density: 0.03 }, noSave: true });
  const { C, W } = zone;
  const N = 13, S = 6; // cells, cell size
  const half = (N * S) / 2;
  // depth-first maze from a seed
  const rnd = mulberry32(404);
  const walls = { h: [], v: [] }; // h[r][c]: wall on the north side of cell r,c ; v[r][c]: wall on the west
  for (let r = 0; r <= N; r++) { walls.h[r] = []; walls.v[r] = []; for (let c = 0; c <= N; c++) { walls.h[r][c] = true; walls.v[r][c] = true; } }
  const seen = new Set();
  const stack = [[N - 1, Math.floor(N / 2)]];
  seen.add(stack[0].join());
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nb = [[r - 1, c, 'n'], [r + 1, c, 's'], [r, c - 1, 'w'], [r, c + 1, 'e']].filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(`${a},${b}`));
    if (!nb.length) { stack.pop(); continue; }
    const [a, b, d] = nb[Math.floor(rnd() * nb.length)];
    if (d === 'n') walls.h[r][c] = false; if (d === 's') walls.h[r + 1][c] = false;
    if (d === 'w') walls.v[r][c] = false; if (d === 'e') walls.v[r][c + 1] = false;
    seen.add(`${a},${b}`);
    stack.push([a, b]);
  }
  // open the entrance (south middle) and carve a clearing at the centre
  const mid = Math.floor(N / 2);
  walls.h[N][mid] = false;
  for (const [r, c] of [[mid, mid], [mid - 1, mid], [mid, mid - 1], [mid - 1, mid - 1]]) { walls.v[r][c + 1] = false; walls.h[r + 1][c] = false; }
  const B = new Builder();
  const hedge = new THREE.MeshStandardMaterial({ color: 0x1e3a1a, roughness: 1, flatShading: true });
  const H = 4.5;
  const cellX = (c) => -half + c * S, cellZ = (r) => -half + r * S - half - 4;
  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) if (walls.h[r][c]) { const x = cellX(c) + S / 2, z = cellZ(r); B.box(hedge, x, H / 2, z, S + 0.8, H, 0.9); C.box(x, H / 2, z, S / 2 + 0.4, H / 2, 0.45); }
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) if (walls.v[r][c]) { const x = cellX(c), z = cellZ(r) + S / 2; B.box(hedge, x, H / 2, z, 0.9, H, S + 0.8); C.box(x, H / 2, z, 0.45, H / 2, S / 2 + 0.4); }
  B.box(new THREE.MeshStandardMaterial({ color: 0x2a3a20, roughness: 1 }), 0, -0.25, cellZ(0) + half, N * S + 20, 0.5, N * S + 20);
  B.build(zone.group, { cast: false });
  // the trophy plinth at the centre
  const cx = cellX(mid), cz = cellZ(mid);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1.2, 12), M.stoneWarm);
  plinth.position.set(cx, 0.6, cz);
  zone.group.add(plinth);
  zone.anchors.push({ pos: W(cx, 3, cz), color: 0x60c0ff, intensity: 30, distance: 16 });
  for (let i = 0; i < 10; i++) zone.anchors.push({ pos: W(cellX(Math.floor(rnd() * N)) + S / 2, 3.5, cellZ(Math.floor(rnd() * N)) + S / 2), color: 0x90ff90, intensity: 8, distance: 10, flicker: true });
  zone.cells = (r, c) => W(cellX(c) + S / 2, 0, cellZ(r) + S / 2);
  zone.N = N;
  zone.spots = { entrance: W(cellX(mid) + S / 2, 0, cellZ(N) + 3), centre: W(cx, 0, cz), trophy: W(cx, 1.6, cz) };
  zone.spawn = { pos: zone.spots.entrance, yaw: Math.PI };
  zone.checkpoint = zone.spawn;
  zone.dirLight = { dir: new THREE.Vector3(0.3, 1, 0.2), color: 0x8090c0, intensity: 0.5 };
  zone.hemi = { sky: 0x3a4a6a, ground: 0x0a120a, intensity: 0.7 };
  zone.exposure = 1.3;
  zone.env = 0.15;
  return zone;
}

// ================================================================== THE GRAVEYARD
export const GY = new THREE.Vector3(0, 0, -12000);
export function graveHeight(x, z) { return (fbm((x - GY.x) * 0.01, (z - GY.z) * 0.01, 3) - 0.5) * 3 + smoothstep(60, 140, Math.hypot(x - GY.x, z - GY.z)) * 25; }
export function buildGraveyard(Q) {
  const M = materials();
  const group = new THREE.Group();
  const col = new Colliders();
  col.terrain = graveHeight;
  const zone = { name: 'graveyard', label: 'A Forgotten Graveyard', outdoor: true, group, world: new THREE.Group(), colliders: col, anchors: [], portals: [], props: [], noSave: true,
    fog: { color: 0x1a2028, density: 0.02 }, spawn: { pos: new THREE.Vector3(GY.x, graveHeight(GY.x, GY.z + 20), GY.z + 20), yaw: Math.PI } };
  const W = (x, z, dy = 0) => new THREE.Vector3(GY.x + x, graveHeight(GY.x + x, GY.z + z) + dy, GY.z + z);
  zone.W = W;
  const geo = new THREE.PlaneGeometry(300, 300, 60, 60);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, graveHeight(pos.getX(i) + GY.x, pos.getZ(i) + GY.z));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2a3220, roughness: 1 }));
  ground.position.copy(GY);
  ground.receiveShadow = true;
  group.add(ground);
  const B = new Builder();
  const rnd = mulberry32(66);
  const stone = M.stoneDark;
  // headstones in crooked rows
  for (let r = -4; r <= 4; r++) for (let k = -6; k <= 6; k++) {
    if (Math.abs(r) < 2 && Math.abs(k) < 3) continue;
    if (rnd() < 0.25) continue;
    const x = k * 4 + (rnd() - 0.5), z = r * 5 + (rnd() - 0.5);
    const y = graveHeight(GY.x + x, GY.z + z);
    const kind = rnd();
    if (kind < 0.6) B.box(stone, x, y + 0.6, z, 0.9, 1.2 + rnd() * 0.4, 0.2, rnd() * 0.3 - 0.15, 0, rnd() * 0.2 - 0.1);
    else if (kind < 0.85) { B.box(stone, x, y + 0.9, z, 0.18, 1.8, 0.18); B.box(stone, x, y + 1.3, z, 0.9, 0.18, 0.18); }
    else B.add(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8), stone, mat4(x, y + 0.9, z));
    col.box(GY.x + x, y + 0.6, GY.z + z, 0.5, 0.6, 0.2);
  }
  // the crypt behind the circle
  const cy = graveHeight(GY.x, GY.z - 30);
  B.box(M.stone, 0, cy + 3, -32, 10, 6, 8);
  B.add(new THREE.ConeGeometry(7.5, 4, 4), M.roof, mat4(0, cy + 8, -32, Math.PI / 4));
  B.box(M.dark, 0, cy + 1.6, -27.95, 2.4, 3.2, 0.1);
  col.box(GY.x, cy + 3, GY.z - 32, 5, 3, 4);
  // a great dead yew
  B.add(new THREE.CylinderGeometry(0.8, 1.4, 10, 8), M.bark, mat4(-18, graveHeight(GY.x - 18, GY.z - 14) + 5, -14));
  for (let i = 0; i < 6; i++) B.add(new THREE.CylinderGeometry(0.15, 0.35, 6, 6), M.bark, mat4(-18 + Math.cos(i) * 2, graveHeight(GY.x - 18, GY.z - 14) + 9, -14 + Math.sin(i) * 2, i, 1, 1, 1, 0.8, 0.5));
  col.cyl(GY.x - 18, GY.z - 14, 1.4, 0, 30);
  // the reaper statue and the ritual cauldron in the circle
  const ry = graveHeight(GY.x, GY.z - 8);
  B.add(new THREE.ConeGeometry(1.2, 4, 8), stone, mat4(0, ry + 2, -12));
  B.add(new THREE.SphereGeometry(0.6, 10, 8), stone, mat4(0, ry + 4.4, -12));
  col.cyl(GY.x, GY.z - 12, 1.2, 0, 5);
  const caul = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.5 }));
  caul.position.set(0, ry + 1.2, -4);
  group.add(caul);
  col.cyl(GY.x, GY.z - 4, 1.5, 0, 2);
  zone.cauldronPos = new THREE.Vector3(GY.x, ry + 2, GY.z - 4);
  // iron fence
  for (let a = 0; a < Math.PI * 2; a += 0.05) { const x = Math.cos(a) * 34, z = Math.sin(a) * 30; B.add(new THREE.CylinderGeometry(0.04, 0.04, 2, 4), M.iron, mat4(x, graveHeight(GY.x + x, GY.z + z) + 1, z)); }
  B.build(group);
  group.position.set(0, 0, 0);
  // make the builder's local coordinates line up with GY
  for (const m of group.children) if (m !== ground) m.position.add(GY);
  caul.position.add(new THREE.Vector3()); // already world-placed above via add
  zone.anchors.push({ pos: zone.cauldronPos.clone(), color: 0x40ff70, intensity: 40, distance: 20, flicker: true });
  zone.anchors.push({ pos: new THREE.Vector3(GY.x, cy + 4, GY.z - 26), color: 0x40ff70, intensity: 14, distance: 12 });
  zone.spots = { circle: W(0, -4), portkey: W(0, 18), crypt: W(0, -26) };
  zone.update = () => { if (Math.random() < 0.3) G.fx.smokePuff(W((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 50, 0.3), 0x8a9aa8, 1, { size: 2, size1: 5, speed: 0.3, life: 5, alpha: 0.12 }); };
  return zone;
}
