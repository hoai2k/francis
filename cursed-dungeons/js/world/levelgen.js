// Procedural mission generator. Rooms are laid out on a coarse grid: a main
// path from the start to the boss arena, side rooms branching off it and a
// secret room hidden behind a cracked wall. Rooms are stamped from the
// hand-designed templates in rooms.js and joined by corridors, bridges and
// stairs across height changes, floating over the abyss.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { TEMPLATES, BIOME_ROOMS } from './rooms.js';
import { BIOMES } from './biomes.js';
import { mulberry32 } from '../util.js';

const CELL = 26;
const DIRS = [[1, 0, 'e', 'w'], [-1, 0, 'w', 'e'], [0, 1, 's', 'n'], [0, -1, 'n', 's']];

export const ENEMY_TABLES = {
  jujutsu_high: [['swarmer', 5], ['spitter', 2], ['blob', 1.5], ['tank', 1], ['teleporter', 0.8], ['summoner', 0.4]],
  tokyo_night: [['swarmer', 4], ['spitter', 2.5], ['blob', 2], ['tank', 1.2], ['teleporter', 1], ['summoner', 0.6]],
  cursed_forest: [['swarmer', 4], ['spitter', 3], ['blob', 1], ['tank', 0.8], ['teleporter', 0.6], ['summoner', 1]],
  flooded_subway: [['swarmer', 4], ['spitter', 1.5], ['blob', 2.5], ['tank', 1.5], ['teleporter', 1.2], ['summoner', 0.5]],
  shibuya: [['swarmer', 4], ['spitter', 2], ['blob', 2], ['tank', 1.5], ['teleporter', 1.5], ['summoner', 1]],
};

export function generateLevel(mission) {
  const seed = mission.seed ?? (Math.random() * 1e9) | 0;
  const r = mulberry32(seed);
  const biome = BIOMES[mission.biome];
  const GW = 5, GH = 5;
  // ---------------------------------------------------------------- layout
  let path = null;
  const mainLen = 5 + Math.min(2, Math.floor((mission.difficulty ?? 1) / 2));
  for (let attempt = 0; attempt < 200 && !path; attempt++) {
    const start = [Math.floor(r() * GW), GH - 1];
    const p = [start]; const seen = new Set([start.join()]);
    while (p.length < mainLen) {
      const [cx, cz] = p[p.length - 1];
      const opts = DIRS.map(([dx, dz]) => [cx + dx, cz + dz]).filter(([x, z]) => x >= 0 && z >= 0 && x < GW && z < GH && !seen.has(x + ',' + z));
      if (!opts.length) break;
      // bias toward the far (north) side
      opts.sort((a, b) => (a[1] - b[1]) + (r() - 0.5) * 2.2);
      const n = opts[0]; p.push(n); seen.add(n.join());
    }
    if (p.length === mainLen) path = p;
  }
  const cells = new Map();
  const addRoom = (cx, cz, type, parent) => { const room = { cx, cz, type, parent, links: [] }; cells.set(cx + ',' + cz, room); return room; };
  const rooms = [];
  path.forEach(([cx, cz], i) => rooms.push(addRoom(cx, cz, i === 0 ? 'start' : i === path.length - 1 ? 'boss' : 'combat', i ? rooms[i - 1] : null)));
  for (let i = 1; i < rooms.length; i++) link(rooms[i - 1], rooms[i], 'open');
  // side rooms + a secret room
  const mids = rooms.slice(1, -1);
  let sideCount = 2 + Math.floor(r() * 2), secretDone = false;
  for (let t = 0; t < 40 && sideCount > 0; t++) {
    const host = mids[Math.floor(r() * mids.length)];
    const [dx, dz] = DIRS[Math.floor(r() * 4)];
    const x = host.cx + dx, z = host.cz + dz;
    if (x < 0 || z < 0 || x >= GW || z >= GH || cells.has(x + ',' + z)) continue;
    const secret = !secretDone;
    const room = addRoom(x, z, secret ? 'secret' : 'side', host);
    link(host, room, secret ? 'secret' : 'open');
    rooms.push(room); sideCount--; if (secret) secretDone = true;
  }
  function link(a, b, kind) { const l = { a, b, kind }; a.links.push(l); b.links.push(l); }

  // ---------------------------------------------------------------- rects + heights
  const SX = GW * CELL, SZ = GH * CELL, SY = 44;
  const world = new World(SX, SY, SZ);
  const deco = new Decorations(); const shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, seed);
  for (const room of rooms) {
    const big = room.type === 'boss';
    const w = big ? 22 : 14 + Math.floor(r() * 6), d = big ? 22 : 14 + Math.floor(r() * 6);
    const ox = room.cx * CELL + 2 + Math.floor(r() * (CELL - 4 - w)), oz = room.cz * CELL + 2 + Math.floor(r() * (CELL - 4 - d));
    room.x0 = ox; room.z0 = oz; room.x1 = ox + w - 1; room.z1 = oz + d - 1;
    const parentY = room.parent ? room.parent.y : 12;
    room.y = room.type === 'start' ? 12 : Math.max(9, Math.min(18, parentY + [0, 0, 3, -3][Math.floor(r() * 4)]));
    if (room.type === 'secret') room.y = room.parent.y;
    room.center = new THREE.Vector3((room.x0 + room.x1) / 2 + 0.5, room.y, (room.z0 + room.z1) / 2 + 0.5);
  }
  // door positions along shared sides
  for (const room of rooms) room.doors = [];
  const corridors = [];
  for (const room of rooms) for (const l of room.links) {
    if (l.a !== room) continue;
    const a = l.a, b = l.b;
    const dx = b.cx - a.cx, dz = b.cz - a.cz;
    if (dx) {
      const zlo = Math.max(a.z0, b.z0) + 3, zhi = Math.min(a.z1, b.z1) - 3;
      const at = zlo <= zhi ? Math.floor((zlo + zhi) / 2) : Math.floor((a.center.z + b.center.z) / 2);
      a.doors.push({ side: dx > 0 ? 'e' : 'w', at, link: l }); b.doors.push({ side: dx > 0 ? 'w' : 'e', at, link: l });
      corridors.push({ l, axis: 'x', at, from: dx > 0 ? a.x1 : b.x1, to: dx > 0 ? b.x0 : a.x0, ya: dx > 0 ? a.y : b.y, yb: dx > 0 ? b.y : a.y, aRoom: dx > 0 ? a : b, bRoom: dx > 0 ? b : a });
    } else {
      const xlo = Math.max(a.x0, b.x0) + 3, xhi = Math.min(a.x1, b.x1) - 3;
      const at = xlo <= xhi ? Math.floor((xlo + xhi) / 2) : Math.floor((a.center.x + b.center.x) / 2);
      a.doors.push({ side: dz > 0 ? 's' : 'n', at, link: l }); b.doors.push({ side: dz > 0 ? 'n' : 's', at, link: l });
      corridors.push({ l, axis: 'z', at, from: dz > 0 ? a.z1 : b.z1, to: dz > 0 ? b.z0 : a.z0, ya: dz > 0 ? a.y : b.y, yb: dz > 0 ? b.y : a.y, aRoom: dz > 0 ? a : b, bRoom: dz > 0 ? b : a });
    }
  }
  // ---------------------------------------------------------------- stamp rooms
  const pool = BIOME_ROOMS[mission.biome];
  for (const room of rooms) {
    const c = { k, x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1, y: room.y, b: biome, r, spawns: [], slots: [], features: [], doors: room.doors };
    if (room.type === 'boss') bossArena(c);
    else if (room.type === 'start') startRoom(c);
    else {
      let t = pool[Math.floor(r() * pool.length)];
      if (room.type === 'secret') t = 'hall';
      TEMPLATES[t](c);
      room.template = t;
    }
    room.spawns = c.spawns; room.features = c.features;
    // make sure every door opening is clear and has floor under it
    for (const d of room.doors) clearDoor(k, room, d);
  }
  // ---------------------------------------------------------------- corridors
  for (const cor of corridors) buildCorridor(k, cor, biome, r);
  // secret wall + boss gate
  const gates = [];
  for (const cor of corridors) {
    if (cor.l.kind === 'secret') sealDoor(k, cor, B.cracked_brick, true);
    const bossSide = cor.aRoom.type === 'boss' ? 'a' : cor.bRoom.type === 'boss' ? 'b' : null;
    if (bossSide) gates.push(sealDoor(k, cor, B.blue_energy, false, bossSide));
  }
  // ---------------------------------------------------------------- objectives & props
  const objRooms = rooms.filter((q) => q.type === 'combat' || q.type === 'side');
  const objective = { type: mission.objective, items: [], need: 0, done: 0 };
  const pickSpot = (room) => { const s = room.spawns.splice(Math.floor(r() * room.spawns.length), 1)[0]; return s ? new THREE.Vector3(s[0], s[1], s[2]) : room.center.clone(); };
  if (mission.objective === 'rescue' || mission.objective === 'seal') {
    const shuffled = objRooms.slice().sort(() => r() - 0.5);
    for (let i = 0; i < 3; i++) { const room = shuffled[i % shuffled.length]; objective.items.push({ pos: pickSpot(room), room, done: false }); }
    objective.need = 3;
  }
  const chests = [];
  for (const room of rooms) {
    if (room.type === 'start' || room.type === 'boss') continue;
    if (room.type === 'secret' || r() < 0.45) chests.push({ pos: pickSpot(room), room, rarity: room.type === 'secret' ? 'rare' : 'common', opened: false });
  }
  // encounters
  const table = ENEMY_TABLES[mission.biome];
  const tw = table.reduce((a, b) => a + b[1], 0);
  const pickEnemy = () => { let x = r() * tw; for (const [kind, w] of table) { x -= w; if (x <= 0) return kind; } return 'swarmer'; };
  const diff = mission.difficulty ?? 1;
  let totalEnemies = 0;
  for (const room of rooms) {
    room.waves = [];
    if (room.type === 'start' || room.type === 'boss') continue;
    const area = (room.x1 - room.x0) * (room.z1 - room.z0);
    const budget = Math.round((4 + diff * 1.5 + area / 70) * (room.type === 'secret' ? 0.7 : 1));
    const nWaves = room.type === 'combat' && diff > 1 ? 2 : 1;
    for (let w = 0; w < nWaves; w++) {
      const list = [];
      for (let i = 0; i < Math.round(budget / nWaves); i++) list.push({ kind: pickEnemy(), elite: r() < 0.08 + diff * 0.03 ? ['swift', 'armored', 'vampiric', 'explosive', 'shadow'][Math.floor(r() * 5)] : null });
      room.waves.push(list); totalEnemies += list.length;
    }
  }
  if (mission.objective === 'exorcise') objective.need = Math.max(12, Math.round(totalEnemies * 0.75));
  world.collectBlockLights();
  const start = rooms[0], boss = rooms.find((q) => q.type === 'boss');
  const spawn = start.center.clone().add(new THREE.Vector3(0, 0, 2));
  const exit = boss.center.clone();
  return { world, deco, shafts, rooms, spawn, bossRoom: boss, gates, objective, chests, exit, biome, seed, kit: k, grid: { GW, GH, CELL } };
}

function clearDoor(k, room, d) {
  const w = k.w;
  for (let t = -2; t <= 2; t++) {
    for (let yy = room.y; yy < room.y + 4; yy++) {
      if (d.side === 'n') w.set(d.at + t, yy, room.z0, 0); if (d.side === 's') w.set(d.at + t, yy, room.z1, 0);
      if (d.side === 'w') w.set(room.x0, yy, d.at + t, 0); if (d.side === 'e') w.set(room.x1, yy, d.at + t, 0);
    }
  }
}
function buildCorridor(k, cor, biome, r) {
  const w = k.w;
  const len = cor.to - cor.from - 1;
  const dy = cor.yb - cor.ya;
  const bridge = len >= 5 && r() < 0.45;
  const stepAt = Math.max(0, Math.floor((len - Math.abs(dy)) / 2));
  for (let i = 0; i <= len + 1; i++) {
    const p = cor.from + i;
    // height along the corridor: stairs in the middle
    let y = cor.ya;
    const s = i - stepAt;
    if (dy > 0) y = cor.ya + Math.max(0, Math.min(dy, s));
    else if (dy < 0) y = cor.ya - Math.max(0, Math.min(-dy, s));
    for (let t = -2; t <= 2; t++) {
      const x = cor.axis === 'x' ? p : cor.at + t, z = cor.axis === 'x' ? cor.at + t : p;
      const isRail = Math.abs(t) === 2;
      const top = bridge ? B.planks : (Math.abs(t) < 2 ? biome.path : biome.floor);
      const depth = bridge ? 1 : 4;
      for (let dd = 1; dd <= depth; dd++) w.set(x, y - dd, z, dd === 1 ? top : B.stone);
      for (let yy = y; yy < y + 5; yy++) w.set(x, yy, z, 0);
      if (bridge && isRail && i % 3 === 0) { w.set(x, y, z, B.dark_planks); k.d.add('chain', x + 0.5, y - 1, z + 0.5, { mode: 'hang', scale: 1.6, sway: 0.4 }); }
      else if (!bridge && isRail && i % 5 === 2 && r() < 0.5) { w.set(x, y, z, biome.wall); w.set(x, y + 1, z, biome.wall); }
    }
    // step fill under stairs so there are no holes
    if (dy !== 0) for (let t = -2; t <= 2; t++) { const x = cor.axis === 'x' ? p : cor.at + t, z = cor.axis === 'x' ? cor.at + t : p; for (let yy = Math.min(cor.ya, cor.yb) - 3; yy < y - 1; yy++) if (!w.get(x, yy, z)) w.set(x, yy, z, B.stone); }
  }
  // lanterns at the corridor mouths
  if (len > 2) {
    const a = cor.from + 1, b = cor.to - 1;
    const place = (p, y) => { const x = cor.axis === 'x' ? p : cor.at - 3, z = cor.axis === 'x' ? cor.at - 3 : p; if (!w.get(x, y - 1, z)) return; k.d.prop('paper_lantern', x + 0.5, y + 3.2, z + 0.5); w.addLight(x + 0.5, y + 2.6, z + 0.5, 0xff6a2a, 3, 7); };
    if (r() < 0.5) place(a, cor.ya); if (r() < 0.5) place(b, cor.yb);
  }
}
// Fill a door opening with blocks (secret cracked wall / boss gate).
function sealDoor(k, cor, id, secretSide, side) {
  const room = cor.aRoom.type === 'secret' ? cor.aRoom : cor.bRoom.type === 'secret' ? cor.bRoom : side === 'a' ? cor.aRoom : cor.bRoom;
  const edge = room === cor.aRoom ? cor.from : cor.to;
  const y = room.y;
  const blocks = [];
  for (let t = -2; t <= 2; t++) for (let yy = y; yy < y + 4; yy++) {
    const x = cor.axis === 'x' ? edge : cor.at + t, z = cor.axis === 'x' ? cor.at + t : edge;
    k.w.set(x, yy, z, id); blocks.push([x, yy, z]);
  }
  const pos = new THREE.Vector3(cor.axis === 'x' ? edge + 0.5 : cor.at + 0.5, y, cor.axis === 'x' ? cor.at + 0.5 : edge + 0.5);
  return { blocks, pos, room, open: false };
}
function startRoom(c) {
  const { k, x0, z0, x1, z1, y, b } = c;
  k.floor(x0, z0, x1, z1, y, b.floor, 6, b.floor2, 0.2);
  const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
  k.d.prop('torii', cx + 0.5, y, cz - 3.5, { w: 5, h: 5 });
  k.lanternPost(cx - 4, cz, y); k.lanternPost(cx + 4, cz, y);
  k.w.set(cx, y - 1, cz + 2, B.gold_trim);
  k.cobwebCorners(x0, z0, x1, z1, y + 2);
  k.scatter(x0, z0, x1, z1, { density: 0.25 });
  for (let x = x0 + 3; x < x1 - 1; x += 6) k.d.add('talisman', x + 0.5, y + 0.02, z1 - 1.5, { mode: 'flat', scale: 1 });
}
function bossArena(c) {
  const { k, x0, z0, x1, z1, y, b } = c;
  k.floor(x0, z0, x1, z1, y, b.floor, 8, b.floor2, 0.3);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = (x1 - x0) / 2;
  // round-off the corners into the abyss
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) > R + 0.6) for (let yy = y - 8; yy < y + 6; yy++) k.w.set(x, yy, z, 0);
  // destructible pillar ring and glowing pools
  for (let a = 0; a < 8; a++) {
    const px = Math.round(cx + Math.cos(a * Math.PI / 4 + 0.39) * R * 0.62), pz = Math.round(cz + Math.sin(a * Math.PI / 4 + 0.39) * R * 0.62);
    k.pillar(px, pz, y, 5, a % 2 ? b.pillar : B.pillar_red, B.lantern);
  }
  const liquid = b.accent === B.lava ? B.lava : B.cursed_pool;
  k.pond(Math.round(cx) - 1, Math.round(z0 + 3), Math.round(cx) + 1, Math.round(z0 + 4), y, liquid, 1, B.obsidian);
  for (let a = 0; a < 16; a++) k.d.add('talisman', cx + Math.cos(a / 16 * Math.PI * 2) * (R - 1), y + 0.02, cz + Math.sin(a / 16 * Math.PI * 2) * (R - 1), { mode: 'flat', scale: 1 });
  for (let a = 0; a < 6; a++) k.torch(Math.round(cx + Math.cos(a) * (R - 1)), y, Math.round(cz + Math.sin(a) * (R - 1)), [0, 0]);
  c.spawns.push([cx, y, cz - R * 0.4]);
}
