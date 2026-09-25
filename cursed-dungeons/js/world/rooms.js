// Hand-designed room pieces. Each template stamps a room into the world
// using the building kit and the biome palette, and reports spawn points,
// prop slots and features. Rooms float over the abyss like Minecraft
// Dungeons islands, so open edges are real drops.
import { B } from './blocks.js';

// Room context: { k: Kit, x0, z0, x1, z1, y (floor surface), b: biome, r: rng, spawns: [], slots: [] }
function base(c, opts = {}) {
  const { k, x0, z0, x1, z1, y, b } = c;
  k.floor(x0, z0, x1, z1, y, opts.floor ?? b.floor, 6, opts.alt ?? b.floor2, opts.altP ?? 0.2);
}
function edgeWalls(c, h = 4, gaps = true) {
  const { k, x0, z0, x1, z1, y, b, doors } = c;
  k.room(x0, z0, x1, z1, y, h, b.wall, { alt: b.wall2, altP: 0.15, trim: b.trim, doors: doors.map((d) => ({ ...d, width: 5, height: h })) });
  if (gaps) {
    // crumbled gaps so the room doesn't feel boxed in (and edges you can fall from)
    const n = 2 + Math.floor(c.r() * 3);
    for (let i = 0; i < n; i++) {
      const side = Math.floor(c.r() * 4); const len = 2 + Math.floor(c.r() * 3);
      const at = side < 2 ? x0 + 3 + Math.floor(c.r() * (x1 - x0 - 6)) : z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6));
      for (let t = 0; t < len; t++) for (let yy = y + 1 + Math.floor(c.r() * 2); yy < y + h; yy++) {
        if (side === 0) k.w.set(at + t, yy, z0, 0); else if (side === 1) k.w.set(at + t, yy, z1, 0);
        else if (side === 2) k.w.set(x0, yy, at + t, 0); else k.w.set(x1, yy, at + t, 0);
      }
    }
  }
  // torches on the inside of the walls
  for (let x = x0 + 4; x < x1 - 2; x += 7) { k.torch(x, y + 2, z0, [0, 1]); k.torch(x, y + 2, z1, [0, -1]); }
  for (let z = z0 + 4; z < z1 - 2; z += 7) { k.torch(x0, y + 2, z, [1, 0]); k.torch(x1, y + 2, z, [-1, 0]); }
}
function spawnGrid(c, n = 10, margin = 3) {
  const { x0, z0, x1, z1, y } = c;
  for (let i = 0; i < n * 3 && c.spawns.length < n; i++) {
    const x = x0 + margin + Math.floor(c.r() * (x1 - x0 - margin * 2)), z = z0 + margin + Math.floor(c.r() * (z1 - z0 - margin * 2));
    const gy = c.k.w.groundBelow(x + 0.5, z + 0.5, y + 8);
    if (!isFinite(gy) || c.k.w.solidAt(x + 0.5, gy + 0.5, z + 0.5) || c.k.w.solidAt(x + 0.5, gy + 1.5, z + 0.5)) continue;
    c.spawns.push([x + 0.5, gy, z + 0.5]);
  }
}
function scatterBreakables(c, n) {
  const { k, x0, z0, x1, z1, y } = c;
  for (let i = 0; i < n; i++) {
    const x = x0 + 2 + Math.floor(c.r() * (x1 - x0 - 4)), z = z0 + 2 + Math.floor(c.r() * (z1 - z0 - 4));
    if (k.w.get(x, y, z) || !k.w.get(x, y - 1, z)) continue;
    const id = c.r() < 0.5 ? B.crate : B.barrel;
    k.w.set(x, y, z, id);
    if (c.r() < 0.4 && !k.w.get(x + 1, y, z)) k.w.set(x + 1, y, z, id);
    if (c.r() < 0.25) k.w.set(x, y + 1, z, B.crate);
  }
}
function decorate(c, amount = 1) {
  const { k, x0, z0, x1, z1, y, b } = c;
  k.cobwebCorners(x0, z0, x1, z1, y + 3);
  const n = Math.floor((x1 - x0) * (z1 - z0) * 0.02 * amount);
  for (let i = 0; i < n; i++) {
    const x = x0 + 1 + c.r() * (x1 - x0 - 2), z = z0 + 1 + c.r() * (z1 - z0 - 2);
    const bx = Math.floor(x), bz = Math.floor(z);
    if (k.w.get(bx, y, bz) || !k.w.get(bx, y - 1, bz)) continue;
    const t = c.r();
    if (t < 0.25) k.d.add('bone', x, y, z, { mode: 'flat', scale: 0.7 + c.r() * 0.4 });
    else if (t < 0.4) k.d.add('paper', x, y, z, { mode: 'flat', scale: 0.8 });
    else if (t < 0.5) { k.d.prop('candle_cluster', x, y, z); if (c.r() < 0.5) k.w.addLight(x, y + 0.6, z, 0xffa040, 2.2, 5); }
    else if (t < 0.7 && (b.ground === B.grass || b.ground === B.cursed_grass)) k.d.add(c.r() < 0.5 ? 'grass' : 'fern', x, y, z, { scale: 0.8 });
    else if (t < 0.8) k.d.add('cursed_weed', x, y, z, { scale: 0.9 });
  }
}

export const TEMPLATES = {
  // Open plaza with a ring of pillars and lanterns.
  plaza(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    const rx = Math.floor((x1 - x0) / 2) - 3, rz = Math.floor((z1 - z0) / 2) - 3;
    for (let a = 0; a < 8; a++) {
      const px = Math.round(cx + Math.cos(a * Math.PI / 4) * rx * 0.75), pz = Math.round(cz + Math.sin(a * Math.PI / 4) * rz * 0.75);
      if (a % 2 === 0) k.pillar(px, pz, y, 5, b.pillar, b.trim); else k.lanternPost(px, pz, y);
    }
    k.floor(cx - 2, cz - 2, cx + 2, cz + 2, y, b.path, 1);
    scatterBreakables(c, 4); decorate(c);
    edgeWalls(c, 3, true);
    spawnGrid(c, 12);
  },
  // Deep pit crossed by bridges, chains hanging into the dark.
  pit_bridge(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const px0 = x0 + 4, px1 = x1 - 4, pz0 = z0 + 5, pz1 = z1 - 5;
    k.pit(px0, pz0, px1, pz1, y, 40);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    k.bridge(cx - 1, pz0 - 1, cx + 1, pz1 + 1, y, B.planks, B.dark_planks);
    if (c.r() < 0.6) k.bridge(px0 - 1, cz - 1, px1 + 1, cz + 1, y, B.planks, B.dark_planks);
    for (let i = 0; i < 6; i++) k.d.add('chain', px0 + 1 + c.r() * (px1 - px0 - 2), y + 1, pz0 + 1 + c.r() * (pz1 - pz0 - 2), { mode: 'hang', scale: 3 + c.r() * 2, sway: 0.3 });
    edgeWalls(c, 3, true);
    decorate(c, 0.5);
    spawnGrid(c, 10, 2);
    c.features.push('pit');
  },
  // Multi-level: raised ledges with stairs, a pool and a waterfall.
  ledges(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const h = 3;
    const lx1 = x0 + Math.floor((x1 - x0) * 0.45);
    k.w.fill(x0 + 1, y, z0 + 1, lx1, y + h - 1, z1 - 1, b.wall);
    for (let z = z0 + 1; z <= z1 - 1; z++) for (let x = x0 + 1; x <= lx1; x++) k.w.set(x, y + h - 1, z, b.floor);
    const sz = (z0 + z1) >> 1;
    k.stairs(lx1 + h, sz - 1, y, h, [-1, 0], 3, b.floor2);
    k.w.fill(lx1 + 1, y, sz - 1, lx1 + h, y + h, sz + 1, 0);
    k.stairs(lx1 + h, sz - 1, y, h, [-1, 0], 3, b.floor2);
    // pool below the ledge with a waterfall
    const liquid = b.flooded ? B.water : c.r() < 0.5 ? B.water : b.accent === B.lava ? B.lava : B.cursed_pool;
    const pz = z0 + 3;
    k.pond(lx1 + 2, pz, lx1 + 6, pz + 3, y, liquid, 2);
    k.w.fill(lx1, y + h - 1, pz + 1, lx1, y + h - 1, pz + 2, liquid);
    k.w.fill(lx1 + 1, y, pz + 1, lx1 + 1, y + h - 1, pz + 2, liquid);
    // second, higher ledge in the corner
    k.w.fill(x0 + 1, y + h, z1 - 5, x0 + 5, y + h * 2 - 1, z1 - 1, b.wall);
    k.stairs(x0 + 6, z1 - 3, y + h, h, [-1, 0], 2, b.floor2);
    k.lanternPost(x0 + 2, z1 - 3, y + h * 2);
    edgeWalls(c, 4, true);
    scatterBreakables(c, 3); decorate(c);
    spawnGrid(c, 12);
    c.features.push('ledges');
  },
  // Indoor pillared hall with a roof that fades when you enter.
  hall(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c, { floor: b.floor2 === B.grass ? b.floor : b.floor, alt: b.floor2 });
    const h = 6;
    k.room(x0, z0, x1, z1, y, h, b.wall, { alt: b.wall2, altP: 0.2, trim: b.trim, doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
    for (let x = x0 + 3; x <= x1 - 3; x += 4) for (const z of [z0 + 3, z1 - 3]) k.pillar(x, z, y, h - 1, b.pillar, b.trim);
    // roof slab
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + h, z, b.roof);
    k.w.addRoof([x0, y + h, z0], [x1, y + h, z1], [[x0, y, z0], [x1, y + h - 1, z1]]);
    for (let x = x0 + 4; x < x1 - 2; x += 6) { k.torch(x, y + 2, z0, [0, 1]); k.torch(x, y + 2, z1, [0, -1]); }
    // windows with light shafts
    for (let x = x0 + 5; x < x1 - 3; x += 8) { k.w.fill(x, y + 3, z0, x + 1, y + 4, z0, 0); k.s.add({ x: x + 1, y: y + 5, z: z0 + 0.5 }, { x: 0.3, y: -1, z: 0.8 }, 9, 1.6); }
    for (let i = 0; i < 3; i++) { const x = x0 + 3 + Math.floor(c.r() * (x1 - x0 - 6)); k.w.fill(x, y, z0 + 5 + Math.floor(c.r() * 4), x, y + 2, z0 + 5 + Math.floor(c.r() * 4), B.cracked_brick); }
    k.cobwebCorners(x0, z0, x1, z1, y + h - 1);
    for (const x of [x0 + 2, x1 - 2]) k.d.add('banner', x + 0.5, y + 4, z0 + 1.03, { mode: 'wall', facing: [0, 1], scale: 2 });
    scatterBreakables(c, 5); decorate(c);
    spawnGrid(c, 12);
  },
  // Glowing pool (cursed energy or lava) with stepping stones.
  pool(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    const liquid = b.accent === B.lava ? B.lava : b.flooded ? B.water : B.cursed_pool;
    const rx = Math.floor((x1 - x0) * 0.22), rz = Math.floor((z1 - z0) * 0.22);
    k.pond(cx - rx, cz - rz, cx + rx, cz + rz, y, liquid, 2, B.obsidian);
    for (let i = -rx + 1; i < rx; i += 2) k.w.set(cx + i, y - 1, cz + ((i & 2) ? 1 : -1), B.obsidian);
    for (const [dx, dz] of [[-rx - 3, -rz - 3], [rx + 3, -rz - 3], [-rx - 3, rz + 3], [rx + 3, rz + 3]]) k.pillar(cx + dx, cz + dz, y, 4, b.pillar, B.lantern);
    edgeWalls(c, 3, true);
    decorate(c);
    spawnGrid(c, 10);
  },
  // Tree grove with grass, ferns and a small pond.
  grove(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c, { floor: b.ground === B.asphalt ? B.grass : b.ground === B.subway_floor ? B.moss_floor : b.ground, alt: B.dirt, altP: 0.08 });
    const cursed = b === undefined ? false : b.ground === B.cursed_grass;
    for (let i = 0; i < 6; i++) {
      const x = x0 + 3 + Math.floor(c.r() * (x1 - x0 - 6)), z = z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6));
      if (!k.w.get(x, y, z)) k.tree(x, z, y, cursed ? { trunk: B.bark_dark, leaves: B.dead_leaves } : {});
    }
    if (c.r() < 0.6) k.pond(x0 + 4, z1 - 7, x0 + 8, z1 - 4, y, cursed ? B.cursed_pool : B.water, 1);
    k.scatter(x0, z0, x1, z1, { density: 0.3, types: cursed ? ['cursed_weed', 'tall_grass', 'fern', 'grass'] : undefined });
    k.lanternPost(x0 + 2, z0 + 2, y); k.lanternPost(x1 - 2, z1 - 2, y);
    decorate(c, 0.4);
    spawnGrid(c, 12);
  },
  // Jujutsu High: shrine building in a courtyard.
  shrine(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    k.shrine(cx - 5, cz - 5, cx + 5, cz + 2, y, { door: 's' });
    k.lanternPost(cx - 3, cz + 5, y); k.lanternPost(cx + 3, cz + 5, y);
    k.d.prop('torii', cx + 0.5, y, z1 - 2.5, { w: 5, h: 5 });
    edgeWalls(c, 3, true);
    scatterBreakables(c, 3); decorate(c);
    spawnGrid(c, 10);
  },
  // Tokyo street: asphalt, lane markings, wrecked cars, streetlights, neon.
  street(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.asphalt, 6, B.asphalt, 0);
    const cx = (x0 + x1) >> 1;
    for (let z = z0; z <= z1; z++) { if (z % 4 < 2) k.w.set(cx, y - 1, z, B.asphalt_line); }
    k.floor(x0, z0, x0 + 3, z1, y + 1, B.concrete, 1); k.floor(x1 - 3, z0, x1, z1, y + 1, B.concrete, 1);
    // building facades with lit/dark windows and neon
    for (const x of [x0, x1]) for (let z = z0; z <= z1; z++) for (let yy = y + 1; yy < y + 8; yy++) {
      const win = (z % 3 !== 0) && (yy % 3 !== 0);
      k.w.set(x, yy, z, win ? (c.r() < 0.35 ? B.window : B.window_dark) : B.concrete);
    }
    for (let z = z0 + 3; z < z1; z += 9) { k.w.set(x0 + 1, y + 4, z, B.neon_pink); k.w.set(x1 - 1, y + 5, z + 3, B.sign); k.w.set(x1 - 1, y + 1, z + 2, B.vending); }
    for (let z = z0 + 4; z < z1 - 2; z += 8) { k.d.prop('streetlight', x0 + 2.5, y + 1, z + 0.5); k.w.addLight(x0 + 3.5, y + 5.5, z + 0.5, 0xffe0b0, 5, 11); }
    for (let i = 0; i < 3; i++) { const z = z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6)); k.d.prop('car', cx + (c.r() < 0.5 ? -3 : 3), y, z, { color: [0x7a1a1a, 0x1a3a6a, 0xd8d8d8, 0x2a2a2a][i % 4], rot: Math.PI / 2 + (c.r() - 0.5) * 0.6 }); k.w.fill(cx - 4, y, z - 1, cx - 2, y, z + 1, B.barrier); }
    for (let i = 0; i < 4; i++) k.d.prop('rubble', x0 + 5 + c.r() * (x1 - x0 - 10), y, z0 + 3 + c.r() * (z1 - z0 - 6));
    for (const d of c.doors) { if (d.side === 'w' || d.side === 'e') { const x = d.side === 'w' ? x0 : x1; for (let t = -2; t <= 2; t++) for (let yy = y + 1; yy < y + 6; yy++) k.w.set(x, yy, d.at + t, 0); } }
    scatterBreakables(c, 3); decorate(c, 0.6);
    spawnGrid(c, 12, 5);
  },
  // Flooded subway platform: tiled walls, tracks sunk under water.
  platform(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.subway_floor, 6, B.metal_grate, 0.08);
    const tz0 = z0 + Math.floor((z1 - z0) * 0.35), tz1 = tz0 + 4;
    for (let z = tz0; z <= tz1; z++) for (let x = x0 + 1; x < x1; x++) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.water); k.w.set(x, y - 3, z, B.rail); }
    for (let x = x0 + 4; x < x1 - 2; x += 6) k.bridge(x, tz0 - 1, x + 1, tz1 + 1, y, B.metal_grate, B.metal_grate);
    k.room(x0, z0, x1, z1, y, 6, B.subway_tile, { alt: B.concrete, altP: 0.1, trim: B.sign, doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
    for (let x = x0 + 3; x < x1 - 2; x += 5) for (const z of [tz0 - 2, tz1 + 2]) k.pillar(x, z, y, 5, B.concrete_pillar, B.concrete);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + 6, z, B.concrete);
    k.w.addRoof([x0, y + 6, z0], [x1, y + 6, z1], [[x0, y, z0], [x1, y + 5, z1]]);
    for (let x = x0 + 3; x < x1; x += 7) { k.w.set(x, y + 5, z0 + 1, B.lantern); k.w.set(x + 3, y + 5, z1 - 1, B.lantern); }
    scatterBreakables(c, 4); decorate(c, 0.8);
    spawnGrid(c, 12, 2);
    c.features.push('flooded');
  },
  // Shibuya concourse: polished floor, glowing signs, ticket gates.
  concourse(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.polished, 6, B.subway_floor, 0.15);
    k.room(x0, z0, x1, z1, y, 6, B.concrete, { alt: B.window, altP: 0.15, trim: B.sign, doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
    const cz = (z0 + z1) >> 1;
    for (let x = x0 + 3; x < x1 - 2; x += 3) if ((x - x0) % 9 !== 0) { k.w.set(x, y, cz, B.metal_grate); }
    for (let x = x0 + 4; x < x1 - 2; x += 6) for (const z of [z0 + 4, z1 - 4]) k.pillar(x, z, y, 5, B.concrete_pillar, B.concrete);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + 6, z, B.concrete);
    k.w.addRoof([x0, y + 6, z0], [x1, y + 6, z1], [[x0, y, z0], [x1, y + 5, z1]]);
    for (let x = x0 + 2; x < x1; x += 5) k.w.set(x, y + 4, z0 + 1, B.sign);
    if (c.r() < 0.6) k.pond(x0 + 3, z1 - 7, x0 + 7, z1 - 4, y, B.lava, 1, B.obsidian);
    scatterBreakables(c, 3); decorate(c, 0.6);
    spawnGrid(c, 12, 2);
  },
  // Classroom block (Jujutsu High): wooden floor, desks, windows.
  classroom(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.floor_boards, 6);
    k.room(x0, z0, x1, z1, y, 5, B.plaster, { alt: B.window, altP: 0.2, trim: B.dark_planks, doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
    for (let x = x0 + 3; x < x1 - 2; x += 3) for (let z = z0 + 3; z < z1 - 2; z += 3) if (c.r() < 0.55) k.w.set(x, y, z, B.planks);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + 5, z, B.roof);
    k.w.addRoof([x0, y + 5, z0], [x1, y + 5, z1], [[x0, y, z0], [x1, y + 4, z1]]);
    k.w.fill(x0 + 3, y + 1, z0, x1 - 3, y + 2, z0, B.dark_planks);
    for (let x = x0 + 3; x < x1; x += 6) k.w.set(x, y + 4, z1 - 1, B.lantern);
    for (let x = x0 + 5; x < x1 - 3; x += 7) { k.w.fill(x, y + 2, z1, x + 1, y + 3, z1, 0); k.s.add({ x: x + 1, y: y + 4, z: z1 - 0.5 }, { x: -0.2, y: -1, z: -0.7 }, 8, 1.5, 0xffe8c0); }
    decorate(c, 0.5);
    spawnGrid(c, 10, 2);
  },
};

// Biome → preferred templates (weights)
export const BIOME_ROOMS = {
  jujutsu_high: ['plaza', 'shrine', 'classroom', 'hall', 'ledges', 'grove', 'pit_bridge', 'pool'],
  tokyo_night: ['street', 'street', 'plaza', 'pit_bridge', 'ledges', 'hall', 'pool'],
  cursed_forest: ['grove', 'grove', 'pool', 'ledges', 'pit_bridge', 'plaza'],
  flooded_subway: ['platform', 'platform', 'hall', 'pit_bridge', 'pool', 'ledges'],
  shibuya: ['concourse', 'concourse', 'street', 'hall', 'pit_bridge', 'pool'],
};
