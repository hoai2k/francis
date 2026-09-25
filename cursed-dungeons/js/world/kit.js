// Building kit: reusable helpers that stamp architecture into a World —
// floors, walls with doorways, pillars, stairs, bridges, ponds, shrines,
// trees and decoration scatter. Used by the test room and level generator.
import * as THREE from 'three/webgpu';
import { B, BLOCKS } from './blocks.js';
import { mulberry32 } from '../util.js';

export class Kit {
  constructor(world, deco, shafts, seed = 1) {
    this.w = world; this.d = deco; this.s = shafts; this.r = mulberry32(seed);
    this.spawns = []; this.interactables = []; this.destructibles = [];
  }
  rnd(a = 0, b = 1) { return a + (b - a) * this.r(); }
  chance(p) { return this.r() < p; }
  floor(x0, z0, x1, z1, y, id, depth = 3, alt = null, altP = 0.15) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      for (let k = 1; k <= depth; k++) this.w.set(x, y - k, z, k === 1 ? (alt && this.chance(altP) ? alt : id) : B.stone);
    }
  }
  clear(x0, y0, z0, x1, y1, z1) { this.w.fill(x0, y0, z0, x1, y1, z1, 0); }
  // Wall ring around a rectangle (inclusive), with optional doorway gaps.
  // doors: [{side:'n'|'s'|'e'|'w', at, width}]
  room(x0, z0, x1, z1, y, h, id, { doors = [], alt = null, altP = 0.2, trim = null } = {}) {
    const W = this.w;
    for (let yy = y; yy < y + h; yy++) {
      for (let x = x0; x <= x1; x++) { W.set(x, yy, z0, this.pickWall(id, alt, altP, yy - y, trim, h)); W.set(x, yy, z1, this.pickWall(id, alt, altP, yy - y, trim, h)); }
      for (let z = z0; z <= z1; z++) { W.set(x0, yy, z, this.pickWall(id, alt, altP, yy - y, trim, h)); W.set(x1, yy, z, this.pickWall(id, alt, altP, yy - y, trim, h)); }
    }
    for (const d of doors) {
      const half = Math.floor((d.width ?? 3) / 2);
      const hh = d.height ?? Math.min(h, 4);
      for (let k = -half; k <= half; k++) for (let yy = y; yy < y + hh; yy++) {
        if (d.side === 'n') W.set(d.at + k, yy, z0, 0); if (d.side === 's') W.set(d.at + k, yy, z1, 0);
        if (d.side === 'w') W.set(x0, yy, d.at + k, 0); if (d.side === 'e') W.set(x1, yy, d.at + k, 0);
      }
    }
  }
  pickWall(id, alt, altP, level, trim, h) {
    if (trim && level === h - 1) return trim;
    if (alt && this.chance(altP)) return alt;
    return id;
  }
  pillar(x, z, y, h, id, cap = null) { for (let k = 0; k < h; k++) this.w.set(x, y + k, z, id); if (cap) this.w.set(x, y + h, z, cap); }
  // Stairs rising along +dir from (x,z) at base y, `steps` blocks high, width w.
  stairs(x, z, y, steps, dir, w, id) {
    const [dx, dz] = dir; const px = -dz, pz = dx;
    for (let s = 0; s < steps; s++) for (let k = 0; k < w; k++) {
      const bx = x + dx * s + px * k, bz = z + dz * s + pz * k;
      for (let yy = y - 1; yy < y + s; yy++) this.w.set(bx, yy, bz, id);
      this.w.set(bx, y + s, bz, id);
      for (let yy = y + s + 1; yy < y + s + 4; yy++) this.w.set(bx, yy, bz, 0);
    }
  }
  bridge(x0, z0, x1, z1, y, id = B.planks, rail = B.dark_planks) {
    const along = x1 - x0 > z1 - z0 ? 'x' : 'z';
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      this.w.set(x, y - 1, z, id);
      const edge = along === 'x' ? (z === z0 || z === z1) : (x === x0 || x === x1);
      if (edge && ((along === 'x' ? x : z) % 3 === 0)) { this.w.set(x, y, z, rail); this.d.add('chain', x + 0.5, y - 1, z + 0.5, { mode: 'hang', scale: 1.4, sway: 0.4 }); }
    }
  }
  pit(x0, z0, x1, z1, yTop, depth = 30) { this.w.fill(x0, Math.max(0, yTop - depth), z0, x1, yTop + 6, z1, 0); }
  pond(x0, z0, x1, z1, y, liquid = B.water, depth = 2, rim = B.stone_brick) {
    for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      const inside = x >= x0 && x <= x1 && z >= z0 && z <= z1;
      if (inside) { for (let k = 1; k <= depth; k++) this.w.set(x, y - k, z, liquid); this.w.set(x, y - depth - 1, z, B.sand); }
      else this.w.set(x, y - 1, z, rim);
    }
  }
  // Japanese shrine hall with tatami interior, shoji walls and tiered roof.
  shrine(x0, z0, x1, z1, y, { door = 's', lanterns = true } = {}) {
    const W = this.w; const h = 4;
    this.floor(x0, z0, x1, z1, y, B.tatami, 1);
    for (let yy = y; yy < y + h; yy++) {
      for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) W.set(x, yy, z, (x - x0) % 3 === 0 ? B.pillar_red : B.shoji);
      for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) W.set(x, yy, z, (z - z0) % 3 === 0 ? B.pillar_red : B.shoji);
    }
    const cx = Math.floor((x0 + x1) / 2), cz = Math.floor((z0 + z1) / 2);
    for (let k = -1; k <= 1; k++) for (let yy = y; yy < y + 3; yy++) {
      if (door === 's') W.set(cx + k, yy, z1, 0); if (door === 'n') W.set(cx + k, yy, z0, 0);
      if (door === 'e') W.set(x1, yy, cz + k, 0); if (door === 'w') W.set(x0, yy, cz + k, 0);
    }
    // beam
    for (let x = x0; x <= x1; x++) { W.set(x, y + h, z0, B.dark_planks); W.set(x, y + h, z1, B.dark_planks); }
    for (let z = z0; z <= z1; z++) { W.set(x0, y + h, z, B.dark_planks); W.set(x1, y + h, z, B.dark_planks); }
    // tiered roof (hidden when a player is inside)
    const r0 = y + h + 1; let lvl = 0;
    let ax0 = x0 - 1, az0 = z0 - 1, ax1 = x1 + 1, az1 = z1 + 1;
    while (ax0 <= ax1 && az0 <= az1 && lvl < 4) {
      for (let z = az0; z <= az1; z++) for (let x = ax0; x <= ax1; x++) {
        const edge = x === ax0 || x === ax1 || z === az0 || z === az1;
        if (edge || lvl === 3 || ax1 - ax0 < 2 || az1 - az0 < 2) W.set(x, r0 + lvl, z, lvl === 0 && edge ? B.dark_planks : B.roof);
      }
      ax0++; az0++; ax1--; az1--; lvl++;
    }
    W.set(cx, r0 + lvl, cz, B.gold_trim);
    W.addRoof([x0 - 1, r0, z0 - 1], [x1 + 1, r0 + lvl, z1 + 1], [[x0, y, z0], [x1, y + h, z1]]);
    if (lanterns) {
      this.d.prop('paper_lantern', cx - 2 + 0.5, y + h - 0.2, z1 + 1.5); this.d.prop('paper_lantern', cx + 2 + 0.5, y + h - 0.2, z1 + 1.5);
      W.addLight(cx - 1.5, y + h - 0.6, z1 + 1.5, 0xff5a2a, 4, 8); W.addLight(cx + 2.5, y + h - 0.6, z1 + 1.5, 0xff5a2a, 4, 8);
      this.d.prop('candle_cluster', x0 + 1.5, y, z0 + 1.5); this.d.prop('candle_cluster', x1 - 0.5, y, z0 + 1.5);
      W.addLight(x0 + 1.5, y + 0.6, z0 + 1.5, 0xffa040, 3, 6); W.addLight(x1 - 0.5, y + 0.6, z0 + 1.5, 0xffa040, 3, 6);
      this.d.add('talisman', cx + 0.5, y + 2, z0 + 1.02, { mode: 'wall', facing: [0, 1], scale: 1.2 });
    }
    return { cx, cz };
  }
  tree(x, z, y, { trunk = B.log, leaves = B.leaves, h = 5 + Math.floor(this.r() * 3) } = {}) {
    for (let k = 0; k < h; k++) this.w.set(x, y + k, z, trunk);
    const top = y + h;
    for (let dy = -2; dy <= 1; dy++) {
      const rad = dy < 0 ? 2 : dy === 0 ? 2 : 1;
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && this.chance(0.6)) continue;
        if (!this.w.get(x + dx, top + dy, z + dz)) this.w.set(x + dx, top + dy, z + dz, leaves);
      }
    }
  }
  lanternPost(x, z, y) { this.d.prop('stone_lantern', x + 0.5, y, z + 0.5); this.w.addLight(x + 0.5, y + 1.3, z + 0.5, 0xffb050, 4, 9); this.w.set(x, y, z, B.barrier); }
  torch(x, y, z, facing) { // wall torch: facing = [nx, nz] outward from wall
    this.d.prop('torch', x + 0.5 + facing[0] * 0.35, y, z + 0.5 + facing[1] * 0.35);
    this.w.addLight(x + 0.5 + facing[0] * 0.6, y + 0.9, z + 0.5 + facing[1] * 0.6, 0xff9a40, 4.5, 9);
  }
  // Scatter grass tufts / flowers on grass-topped blocks in an area.
  scatter(x0, z0, x1, z1, { density = 0.35, types = ['grass', 'grass', 'tall_grass', 'flower_red', 'flower_blue', 'fern'] } = {}) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!this.chance(density)) continue;
      const y = this.w.groundBelow(x + 0.5, z + 0.5, 60);
      if (!isFinite(y)) continue;
      const id = this.w.get(x, y - 1, z);
      if (![B.grass, B.cursed_grass, B.moss_floor, B.dirt].includes(id)) continue;
      if (this.w.get(x, y, z)) continue;
      const t = types[Math.floor(this.r() * types.length)];
      this.d.add(t, x + 0.5 + this.rnd(-0.3, 0.3), y, z + 0.5 + this.rnd(-0.3, 0.3), { scale: t === 'tall_grass' ? 1.1 : 0.8, sway: 1 });
    }
  }
  cobwebCorners(x0, z0, x1, z1, y) {
    for (const [x, z] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) if (this.chance(0.7)) this.d.add('cobweb', x + 0.5, y, z + 0.5, { mode: 'hang', scale: 1.1, sway: 0.1 });
  }
  destructible(x, y, z, id) { this.w.set(x, y, z, id); }
}
