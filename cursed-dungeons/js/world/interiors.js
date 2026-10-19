// Building interiors: enterable city buildings (doors on the street; inside:
// lobbies, offices, convenience stores, cafés, karaoke bars, apartments,
// station concourses; stairs to every floor and out onto the roof) whose
// upper floors and roof cut away while you are inside (each floor slab is
// its own World roof, so the floors above yours fade and the one you stand
// on stays). Some buildings are curse-infested: a purple aura and talisman
// seals on the door, a pack of curses on every floor (they appear when you
// reach that floor), and once all floors are clear a chest with the reward.
// Clearing one is saved, gives coins/XP/loot and counts for quests (every
// kill goes through game.quests.onKill as usual; an 'exorcise' step with the
// building's anchor 'bld_<id>' and a radius that covers it counts its kills).
// Also: loot chests out in the world (secrets), opened once per save.
//
// ------------------------------------------------------------------ build time
//   import { building, worldChest, interiorsData } from '../interiors.js';
//   const b = building(R, {
//     id: 'konbini1', name: 'Center Gai Konbini',
//     x0, z0, w: 14, d: 12, floors: 2,            // footprint (w, d ≥ 12 × 10 with stairs), floors of 5 blocks
//     door: 's', doorAt: 0.5,                      // which side the door is on, where along it (0..1)
//     kinds: ['store', 'apartment'],               // per floor: lobby | office | store | cafe | karaoke |
//                                                  //   apartment | concourse | derelict | storage | gym
//     roof: true,                                  // stairs up onto the roof (default true)
//     wall, trim, win, win2, sign: { text: ['24H'], color: '#7ae0ff', bg },  awning: 0x2a8a4a,
//     infested: { level: 3, floors: [{ n: 4, kinds: ['swarmer'] }, …], reward: { coins, xp, items, rarity } },
//     quest: 'sq_shibuya_floors',                  // infested again while this quest is active
//     poi: { icon: '🏢' },                         // also a world-map point of interest
//   });  // -> { id, x0, z0, x1, z1, y, top, door, center, floorY(f) }
//   worldChest(R, 'roof_chest', x, z, { y, rarity: 'rare' })   a loot chest (secrets, rooftops)
//   return R.finish({ extra: { ...interiorsData(R), onLoad: (g, L) => Interiors.attach(g, L) } });
//   anchors made: 'bld_<id>' (ground floor centre), 'bld_<id>_door' (outside the door),
//                 'bld_<id>_f<n>' (floor n centre, with its height)
//
// ------------------------------------------------------------------ runtime
//   Interiors.attach(game, L)  -> the system (game.interiors); reads L.interiors / L.worldChests
//   cityView(game, L, { radius }) widen the see-through bubble round the players while L is loaded
//   interiors.inside           { b, floor } for the lead player, or null
//   interiors.cleared(id)      saved state of an infested building
//   save.data.world.interiors[region:id] = 1, save.data.world.chests[region:id] = 1
import * as THREE from 'three/webgpu';
import { B } from './blocks.js';
import { signMesh } from './regions/common.js';
import { rollChest, itemInfo } from '../loot.js';
import { U } from '../gfx/materials.js';

// City view: a wider see-through bubble round the players while this region is loaded (the
// streets run between tall buildings), restored when the region unloads.
export function cityView(game, L, o = {}) {
  const u = U?.occlusionRadius; if (!u || !L?.world?.group) return;
  const prev = u.value; u.value = o.radius ?? 5.5;
  const g = L.world.group;
  const f = () => { u.value = prev; g.removeEventListener('removed', f); };
  g.addEventListener('removed', f);
}

const FH = 5;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- floor kinds
const KIND = {
  lobby: { floor: B.marble, light: 0xfff0d8, label: 'Lobby' },
  office: { floor: B.polished, light: 0xe8f0ff, label: 'Offices' },
  store: { floor: B.polished, light: 0xf0faff, label: 'Konbini' },
  cafe: { floor: B.floor_boards, light: 0xffc890, label: 'Café' },
  karaoke: { floor: B.shadow_floor, light: 0xff6ac0, label: 'Karaoke' },
  apartment: { floor: B.tatami, light: 0xffd8a0, label: 'Apartments' },
  concourse: { floor: B.subway_floor, light: 0xf0f4ff, label: 'Concourse' },
  derelict: { floor: B.concrete, light: 0xb080ff, label: 'Abandoned floor' },
  storage: { floor: B.concrete, light: 0xd8d0c0, label: 'Storage' },
  gym: { floor: B.floor_boards, light: 0xf0f0ff, label: 'Gym' },
  shop: { floor: B.polished, light: 0xfff4e0, label: 'Boutiques' },
};

// ---------------------------------------------------------------- building
export function building(R, o) {
  const W = R.world, r = () => R.r();
  const w = Math.max(12, o.w ?? 14), d = Math.max(10, o.d ?? 12);
  const x0 = o.x0, z0 = o.z0, x1 = x0 + w - 1, z1 = z0 + d - 1;
  const F = Math.max(1, o.floors ?? 3);
  const y = o.y ?? R.hAt(x0 + (w >> 1), z0 + (d >> 1));
  const roofAccess = o.roof !== false;
  const top = y + F * FH;
  const wall = o.wall ?? B.concrete, trim = o.trim ?? B.concrete_pillar, glass = o.win ?? B.window, glass2 = o.win2 ?? B.window_dark;
  const kinds = Array.from({ length: F }, (_, f) => (o.kinds?.[f] ?? (f === 0 ? 'lobby' : 'office')));
  const infested = !!o.infested;
  const ix0 = x0 + 1, ix1 = x1 - 1, iz0 = z0 + 1, iz1 = z1 - 1;
  const fy = (f) => y + f * FH;
  // ------------------------------------------------ clear the lot, foundation
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    W.column(x, z, y - 6, y - 2, B.stone);
    W.setRaw(x, y - 1, z, KIND[kinds[0]]?.floor ?? B.polished);
    for (let yy = y; yy <= top + 6 && yy < R.sy; yy++) W.setRaw(x, yy, z, 0);
  }
  // ------------------------------------------------ door
  const door = o.door ?? 's', at = o.doorAt ?? 0.5;
  const along = door === 'n' || door === 's';
  const dc = along ? Math.round(x0 + 2 + (w - 5) * at) : Math.round(z0 + 2 + (d - 5) * at);
  const isDoor = (x, z, yy) => yy < y + 3 && (along ? (z === (door === 's' ? z1 : z0) && Math.abs(x - dc) <= 1) : (x === (door === 'e' ? x1 : x0) && Math.abs(z - dc) <= 1));
  // ------------------------------------------------ shell: walls, windows, slabs, parapet
  const winLit = (a, f) => ((a * 7 + f * 13 + (o.seed ?? x0 * 3 + z0)) % 5) < (infested ? 1 : 3);
  for (let f = 0; f < F; f++) {
    const yf = fy(f);
    for (let yy = yf; yy < yf + FH - 1; yy++) {
      const lvl = yy - yf;
      const put = (x, z, t, len) => {
        if (f === 0 && isDoor(x, z, yy)) return;
        let id;
        if (t === 0 || t === len) id = trim;
        else if (f === 0) id = lvl <= 2 && t % 4 !== 0 && !o.solidBase ? (o.shopGlass ?? B.window) : (lvl === 3 ? (o.band ?? wall) : trim);
        else id = (t % (o.col ?? 4) === 0) ? trim : (lvl === 1 || lvl === 2) ? (winLit(t, f) ? glass : glass2) : wall;
        W.set(x, yy, z, id);
      };
      for (let x = x0; x <= x1; x++) { put(x, z0, x - x0, w - 1); put(x, z1, x - x0, w - 1); }
      for (let z = z0 + 1; z < z1; z++) { put(x0, z, z - z0, d - 1); put(x1, z, z - z0, d - 1); }
    }
    // slab (the floor of the next storey / the roof)
    const ys = yf + FH - 1, fl = f + 1 < F ? (KIND[kinds[f + 1]]?.floor ?? B.polished) : (o.roofBlock ?? B.concrete);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, ys, z, (x === x0 || x === x1 || z === z0 || z === z1) ? trim : fl);
  }
  for (let x = x0; x <= x1; x++) { W.set(x, top, z0, trim); W.set(x, top, z1, trim); }
  for (let z = z0; z <= z1; z++) { W.set(x0, top, z, trim); W.set(x1, top, z, trim); }
  // door frame, awning, sign
  {
    const fr = infested ? B.talisman_wall : (o.frame ?? trim);
    for (let t = -2; t <= 2; t++) for (let yy = y; yy <= y + 3; yy++) {
      if (Math.abs(t) <= 1 && yy < y + 3) continue;
      if (along) W.set(dc + t, yy, door === 's' ? z1 : z0, fr); else W.set(door === 'e' ? x1 : x0, yy, dc + t, fr);
    }
    const out = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[door];
    const fx = along ? dc + 0.5 : (door === 'e' ? x1 + 1 : x0), fz = along ? (door === 's' ? z1 + 1 : z0) : dc + 0.5;
    if (o.awning !== false) R.props.box(fx + out[0] * 0.7, y + 3.05, fz + out[1] * 0.7, along ? 5 : 1.4, 0.18, along ? 1.4 : 5, infested ? 0x2a1030 : (o.awning ?? 0x2a3a4a));
    if (o.sign || infested) {
      const s = infested && !o.sign ? { text: ['立入禁止', 'KEEP OUT'], color: '#ff5a7a' } : o.sign;
      const sx = fx + out[0] * 0.08, sz = fz + out[1] * 0.08, yaw = Math.atan2(out[0], out[1]);
      R.deco.extra(() => { const m = signMesh(s.text, { w: s.w ?? 4.2, h: s.h ?? 1.1, color: s.color ?? '#ffd84a', bg: s.bg, glow: s.glow ?? 1.8, font: s.font }); m.position.set(sx, y + 3.75, sz); m.rotation.y = yaw; return m; });
    }
  }
  // ------------------------------------------------ stairs (mirrored away from the door)
  const mx = door === 'w', mz = door === 'n';
  const SX = (u) => (mx ? ix1 - u : ix0 + u), SZ = (v) => (mz ? iz1 - v : iz0 + v);
  const flights = roofAccess ? F : F - 1;
  for (let f = 0; f < flights; f++) {
    const yf = fy(f), up = fy(f + 1) - 1;
    const even = f % 2 === 0;
    for (let k = 0; k < 4; k++) {
      const u = even ? k : 5 - k, v0 = even ? 0 : 2;
      for (let v = v0; v < v0 + 2; v++) {
        for (let yy = yf; yy <= yf + k; yy++) W.set(SX(u), yy, SZ(v), yy === yf + k ? (o.stairBlock ?? B.stone_brick) : (o.stairFill ?? B.concrete));
        W.set(SX(u), up, SZ(v), 0);   // the hole in the slab above
      }
    }
    if (f + 1 === F) {   // railing round the roof hatch (open towards the landing)
      const rail = (u, v) => W.set(SX(u), top, SZ(v), B.metal_grate);
      if (even) for (let u = 0; u < 4; u++) rail(u, 2);
      else { for (let u = 2; u < 6; u++) { rail(u, 1); rail(u, 4); } rail(6, 2); rail(6, 3); }
    }
  }
  // ------------------------------------------------ floors: furniture
  const IW = ix1 - ix0 + 1, ID = iz1 - iz0 + 1;
  const spots = [], chestAt = [];
  for (let f = 0; f < F; f++) {
    const yf = fy(f), kind = kinds[f];
    const used = new Uint8Array(IW * ID);
    const U = (x, z) => (x < ix0 || x > ix1 || z < iz0 || z > iz1) ? 1 : used[(z - iz0) * IW + (x - ix0)];
    const mark = (x, z) => { if (x >= ix0 && x <= ix1 && z >= iz0 && z <= iz1) used[(z - iz0) * IW + (x - ix0)] = 1; };
    for (let u = 0; u <= 6; u++) for (let v = 0; v <= 4; v++) mark(SX(u), SZ(v));
    if (f === 0) for (let k = 0; k < 4; k++) for (let t = -1; t <= 1; t++) {
      if (along) mark(dc + t, door === 's' ? iz1 - k : iz0 + k); else mark(door === 'e' ? ix1 - k : ix0 + k, dc + t);
    }
    // a walkway ring round the stair landing to the room
    const set = (x, yy, z, id) => { W.set(x, yy, z, id); };
    const block = (x, z, h, id, idTop = id) => { if (U(x, z)) return false; for (let k = 0; k < h; k++) set(x, yf + k, z, k === h - 1 ? idTop : id); mark(x, z); return true; };
    const wallRun = (side, id, h = 3, every = 1) => {   // along an inner wall
      if (side === 'n' || side === 's') { const z = side === 'n' ? iz0 : iz1; for (let x = ix0; x <= ix1; x += every) block(x, z, h, id); }
      else { const x = side === 'w' ? ix0 : ix1; for (let z = iz0; z <= iz1; z += every) block(x, z, h, id); }
    };
    const back = { s: 'n', n: 's', e: 'w', w: 'e' }[door];
    const sideA = along ? (mx ? 'w' : 'e') : (mz ? 'n' : 's');
    switch (kind) {
      case 'lobby': {
        for (let x = ix0 + 3; x <= ix1 - 2; x += 5) for (let z = iz0 + 3; z <= iz1 - 2; z += 5) if (!U(x, z)) for (let k = 0; k < FH - 1; k++) { set(x, yf + k, z, B.concrete_pillar); mark(x, z); }
        // reception desk across the back
        const cx = (ix0 + ix1) >> 1, cz = (iz0 + iz1) >> 1;
        for (let t = -2; t <= 2; t++) { if (along) block(cx + t, door === 's' ? iz0 + 5 : iz1 - 5, 1, B.polished); else block(door === 'e' ? ix0 + 5 : ix1 - 5, cz + t, 1, B.polished); }
        for (const [x, z] of [[ix1, iz1], [ix0, iz1], [ix1, iz0]]) block(x, z, 2, B.planks, B.leaves);
        if (along) block(cx, door === 's' ? iz0 : iz1, 2, B.sign); else block(door === 'e' ? ix0 : ix1, cz, 2, B.sign);
        break;
      }
      case 'office': {
        for (let z = iz0 + 6; z <= iz1 - 2; z += 4) for (let x = ix0 + 2; x + 2 <= ix1 - 1; x += 5) {
          for (let t = 0; t < 3; t++) block(x + t, z, 1, B.dark_planks);
          if (!U(x + 1, z + 1)) { set(x + 1, yf + 1, z, B.window_dark); }
          if (r() < 0.6) block(x + 1, z - 1, 1, B.plaster);
        }
        wallRun(back, B.metal_grate, 2, 3);
        block(ix1, iz1, 2, B.planks, B.leaves); block(ix0, iz1, 2, B.planks, B.leaves);
        break;
      }
      case 'store': case 'shop': {
        wallRun(back, kind === 'store' ? B.window : B.gold_trim, 3);   // fridges / display wall
        for (let z = iz0 + 6; z <= iz1 - 3; z += 3) for (let x = ix0 + 2; x <= ix1 - 2; x++) if ((x - ix0) % 7 !== 0) block(x, z, 2, kind === 'store' ? B.crate : B.planks, kind === 'store' ? B.crate : B.red_lacquer);
        // the counter by the door
        const cz = door === 's' ? iz1 - 2 : iz0 + 2;
        if (along) for (let x = dc + 3; x <= dc + 5; x++) block(x, cz, 1, B.polished); else for (let z = dc + 3; z <= dc + 5; z++) block(door === 'e' ? ix1 - 2 : ix0 + 2, z, 1, B.polished);
        block(ix1, door === 's' ? iz1 : iz0, 2, B.vending);
        break;
      }
      case 'cafe': {
        for (let z = iz0 + 6; z <= iz1 - 2; z += 3) for (let x = ix0 + 2; x <= ix1 - 2; x += 3) { block(x, z, 1, B.planks); }
        wallRun(back, B.dark_planks, 1);
        for (let x = ix0 + 1; x <= ix1; x += 4) if (!U(x, back === 'n' ? iz0 : iz1)) set(x, yf + 1, back === 'n' ? iz0 : iz1, B.lantern);
        break;
      }
      case 'karaoke': {
        for (let z = iz0 + 6; z + 2 <= iz1; z += 4) for (let x = ix0 + 2; x + 3 <= ix1; x += 5) {
          for (let t = 0; t < 4; t++) block(x + t, z, 1, B.red_lacquer);
          block(x, z + 1, 1, B.red_lacquer); block(x + 3, z + 1, 1, B.red_lacquer);
          if (!U(x + 1, z + 2)) set(x + 1, yf + 2, z, B.neon_pink);
        }
        wallRun(sideA, B.neon_pink, 1, 4);
        break;
      }
      case 'apartment': {
        const mid = (ix0 + ix1) >> 1;
        for (let z = iz0 + 5; z <= iz1; z++) if (z % 4 !== 0 && !U(mid, z)) for (let k = 0; k < 3; k++) { set(mid, yf + k, z, B.shoji); }
        for (let z = iz0 + 6; z <= iz1 - 1; z += 4) { block(mid - 3, z, 1, B.planks); block(mid + 3, z, 1, B.planks); }
        block(ix0, iz1, 2, B.dark_planks); block(ix1, iz1, 2, B.dark_planks);
        break;
      }
      case 'concourse': {
        const gz = door === 's' ? iz1 - 6 : iz0 + 6;
        if (along) for (let x = ix0 + 7; x <= ix1 - 1; x += 2) block(x, gz, 1, B.metal_grate);
        for (let x = ix0 + 4; x <= ix1 - 3; x += 6) for (let z = iz0 + 2; z <= iz1 - 2; z += 6) if (!U(x, z)) for (let k = 0; k < FH - 1; k++) { set(x, yf + k, z, B.concrete_pillar); mark(x, z); }
        wallRun(back, B.sign, 1, 5);
        break;
      }
      case 'gym': {
        for (let z = iz0 + 6; z <= iz1 - 2; z += 4) for (let x = ix0 + 2; x <= ix1 - 2; x += 4) block(x, z, 1, B.metal_grate);
        wallRun(back, B.window_dark, 3);
        break;
      }
      case 'storage': case 'derelict': default: {
        for (let n = 0; n < IW * ID * 0.06; n++) { const x = ix0 + Math.floor(r() * IW), z = iz0 + Math.floor(r() * ID); block(x, z, 1 + Math.floor(r() * 2), r() < 0.5 ? B.crate : B.barrel); }
        break;
      }
    }
    // curse-infested floors: seals, cursed puddles, rubble
    if (infested) {
      for (let n = 0; n < 5; n++) { const x = ix0 + Math.floor(r() * IW), z = iz0 + Math.floor(r() * ID); if (!U(x, z)) { W.set(x, yf - 1, z, B.cursed_pool); mark(x, z); } }
      for (let n = 0; n < 6; n++) { const x = ix0 + Math.floor(r() * IW), z = iz0 + Math.floor(r() * ID); if (!U(x, z)) { set(x, yf, z, r() < 0.5 ? B.cracked_brick : B.bone_block); mark(x, z); } }
      for (let x = x0 + 2; x < x1 - 1; x += 3) if (f > 0 || !isDoor(x, z1, yf)) { if (r() < 0.5) W.set(x, yf + 1, z0, B.talisman_wall); if (r() < 0.5 && !(f === 0 && door === 's')) W.set(x, yf + 1, z1, B.talisman_wall); }
    }
    // free spots (curse packs, the chest)
    const free = [];
    for (let z = iz0 + 1; z <= iz1 - 1; z++) for (let x = ix0 + 1; x <= ix1 - 1; x++) {
      if (U(x, z) || U(x + 1, z) || U(x - 1, z) || U(x, z + 1) || U(x, z - 1)) continue;
      if (W.get(x, yf, z) || W.get(x, yf + 1, z) || W.get(x, yf - 1, z) === B.cursed_pool) continue;
      free.push([x + 0.5, yf, z + 0.5]);
    }
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    spots.push(free.slice(0, 16));
    chestAt.push(free[free.length - 1] ?? null);
    // lights
    const L = KIND[kind]?.light ?? 0xfff0d8, col = infested ? 0xb070ff : L;
    for (let x = ix0 + 3; x <= ix1; x += 7) for (let z = iz0 + 3; z <= iz1; z += 7) W.addLight(x + 0.5, yf + 3.2, z + 0.5, col, infested ? 2.0 : 2.6, 9);
    R.anchor(`bld_${o.id}_f${f}`, (ix0 + ix1) >> 1, (iz0 + iz1) >> 1, yf);
  }
  // ------------------------------------------------ roofs: one per slab, each fades while you're below it
  for (let f = 1; f <= F; f++) {
    const ymin = fy(f) - 1, ymax = f < F ? fy(f + 1) - 2 : top + 6;
    const reach = o.cutaway === false ? 0 : Math.min(11, Math.ceil((top - y) / 1.4));   // also fades while you're on the street north-west of it (the camera looks from the south-east)
    W.addRoof([x0, ymin, z0], [x1, ymax, z1], [[ix0 - reach, y, iz0 - reach], [ix1, fy(f) - 2, iz1]]);
  }
  // rooftop: AC units, a water tank
  if (roofAccess) for (let n = 0; n < 3; n++) {
    const x = ix0 + 7 + Math.floor(r() * Math.max(1, IW - 9)), z = iz0 + 6 + Math.floor(r() * Math.max(1, ID - 8));
    if (W.get(x, top, z)) continue;
    W.set(x, top, z, n === 0 ? B.metal_grate : B.concrete); if (n === 0) W.set(x, top + 1, z, B.metal_grate);
  }
  R.reserve(x0 - 1, z0 - 1, x1 + 1, z1 + 1, 2);
  // ------------------------------------------------ record
  const out = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[door];
  const doorOut = along ? V(dc + 0.5, y, (door === 's' ? z1 + 1.5 : z0 - 0.5)) : V(door === 'e' ? x1 + 1.5 : x0 - 0.5, y, dc + 0.5);
  const doorIn = doorOut.clone().addScaledVector(V(out[0], 0, out[1]), -2.5);
  const info = {
    id: o.id, name: o.name ?? 'Building', x0, z0, x1, z1, y, fh: FH, floors: F, top, roof: roofAccess, kinds,
    labels: kinds.map((k, f) => `${f === 0 ? '1F' : (f + 1) + 'F'} · ${o.labels?.[f] ?? KIND[k]?.label ?? k}`),
    door: doorOut, doorIn, out, center: V((x0 + x1) / 2 + 0.5, y, (z0 + z1) / 2 + 0.5),
    spots, chest: o.chest ?? (chestAt[F - 1] ?? chestAt[0]),
    infested: infested ? { level: o.infested.level ?? 2, floors: (o.infested.floors ?? kinds.map(() => ({ n: 4 }))).map((p) => ({ n: p.n ?? 4, kinds: p.kinds ?? o.infested.kinds ?? ['swarmer', 'swarmer', 'flyhead', 'spitter'], elite: p.elite ?? null })), reward: o.infested.reward ?? { coins: 60 + F * 20, xp: 80 + F * 30, items: F >= 3 ? 1 : 0, rarity: F >= 4 ? 'rare' : 'common' }, boss: o.infested.boss ?? null } : null,
    quest: o.quest ?? null,
  };
  (R.interiors ??= []).push(info);
  R.anchor('bld_' + o.id, Math.floor(info.center.x), Math.floor(info.center.z), y);
  R.anchor('bld_' + o.id + '_door', Math.floor(doorOut.x), Math.floor(doorOut.z));
  if (o.poi) R.poi('bld_' + o.id, o.name, o.poi.icon ?? (infested ? '☠' : '🏢'), Math.floor(info.center.x), Math.floor(info.center.z), infested ? 'infested' : 'building');
  return { ...info, floorY: fy };
}

// A loot chest out in the world (a secret, a rooftop, a back alley).
export function worldChest(R, id, x, z, o = {}) {
  (R.worldChests ??= []).push({ id, x: x + 0.5, z: z + 0.5, y: o.y ?? null, rarity: o.rarity ?? 'common', coins: o.coins ?? null });
  return R;
}
// What finish() should carry on L.
export function interiorsData(R) {
  const chests = (R.worldChests ?? []).map((c) => ({ ...c, pos: V(c.x, c.y ?? R.floor(Math.floor(c.x), Math.floor(c.z)), c.z) }));
  return { interiors: R.interiors ?? [], worldChests: chests };
}

// ---------------------------------------------------------------- runtime
let chestGeo = null;
function chestMesh(rarity) {
  chestGeo ??= { body: new THREE.BoxGeometry(1.1, 0.7, 0.8), lid: new THREE.BoxGeometry(1.15, 0.3, 0.85), lock: new THREE.BoxGeometry(0.2, 0.25, 0.1) };
  const grp = new THREE.Group();
  const wood = new THREE.MeshStandardNodeMaterial({ color: rarity === 'rare' ? 0x2a4a8a : rarity === 'cursed' ? 0x4a1a5a : 0x7a5230, roughness: 0.7 });
  const trim = new THREE.MeshStandardNodeMaterial({ color: 0xd8b040, roughness: 0.3, metalness: 0.8, emissive: 0x3a2a00 });
  const body = new THREE.Mesh(chestGeo.body, wood); body.position.y = 0.35; body.castShadow = true;
  const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.4);
  const lidM = new THREE.Mesh(chestGeo.lid, wood); lidM.position.set(0, 0.15, 0.4); lidM.castShadow = true; lid.add(lidM);
  const lock = new THREE.Mesh(chestGeo.lock, trim); lock.position.set(0, 0.6, 0.42);
  grp.add(body, lid, lock);
  return { group: grp, lid };
}
let auraGeo = null;
function auraMesh(color) {
  auraGeo ??= { ring: new THREE.TorusGeometry(1.9, 0.07, 6, 32).rotateX(Math.PI / 2), veil: new THREE.CylinderGeometry(1.7, 1.9, 3.4, 20, 1, true) };
  const grp = new THREE.Group();
  const c = new THREE.Color(color);
  const ringM = new THREE.MeshBasicNodeMaterial({ color: c.clone().multiplyScalar(2.6), transparent: true, opacity: 0.9, depthWrite: false });
  const veilM = new THREE.MeshBasicNodeMaterial({ color: c.clone().multiplyScalar(1.4), transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(auraGeo.ring, ringM); ring.position.y = 0.08;
  const veil = new THREE.Mesh(auraGeo.veil, veilM); veil.position.y = 1.7; veil.scale.set(1, 1, 0.45);
  grp.add(ring, veil);
  grp.userData = { ring, veil, ringM, veilM };
  return grp;
}

export class Interiors {
  static attach(game, L) {
    if (!(L?.interiors?.length || L?.worldChests?.length)) { game.interiors = null; return null; }
    let s = null;
    try { s = new Interiors(game, L); } catch (e) { console.warn('interiors', e); return null; }
    game.interiors = s;
    game.addUpdater((dt) => { if (game.interiors !== s) return false; s.update(dt); });
    const grp = L.world?.group; if (grp) { const f = () => { grp.removeEventListener('removed', f); if (game.interiors === s) game.interiors = null; }; grp.addEventListener('removed', f); }
    return s;
  }
  constructor(game, L) {
    this.game = game; this.L = L; this.rid = L.regionId;
    this.list = (L.interiors ?? []).map((b) => ({ ...b, st: null, aura: null, packs: [], chestObj: null }));
    this.inside = null; this.label = null; this.t = 0;
    const W = this.ws();
    for (const b of this.list) if (b.infested) {
      b.st = { floors: b.infested.floors.map(() => ({ spawned: false, cleared: false, live: [] })), done: false };
      if (!this.isInfested(b)) b.st.done = true;
      if (!b.st.done) this.makeAura(b);
    }
    // world chests
    this.chests = [];
    for (const c of L.worldChests ?? []) {
      if (W.chests[`${this.rid}:${c.id}`]) continue;
      this.spawnChest({ ...c, key: `${this.rid}:${c.id}`, kind: 'world' });
    }
  }
  ws() { const d = this.game.save.data; d.world ??= {}; d.world.interiors ??= {}; d.world.chests ??= {}; return d.world; }
  cleared(id) { return !!this.ws().interiors[`${this.rid}:${id}`]; }
  isInfested(b) {
    if (!b.infested) return false;
    if (b.quest) { const st = this.game.quests?.state?.(b.quest); if (st === 'active') return true; }
    return !this.cleared(b.id);
  }
  makeAura(b) {
    const g = this.game, a = auraMesh(0x9a4aff);
    a.position.copy(b.door).addScaledVector(V(b.out[0], 0, b.out[1]), -0.6);
    const y = g.world.standY(a.position.x, a.position.z, b.y, 2); if (isFinite(y)) a.position.y = y;
    g.scene.add(a); (g.hubProps ??= []).push(a);
    b.aura = a;
    b.light = g.lights?.attach?.(a, 0xa050ff, 3, 8, { offsetY: 1.6 });
  }
  dropAura(b) {
    const g = this.game, a = b.aura; if (!a) return;
    b.aura = null; if (b.light) { g.lights?.remove?.(b.light); b.light = null; }
    let t = 0; const ud = a.userData;
    ud.ringM.color.setRGB(3, 2.4, 0.8); ud.veilM.color.setRGB(2, 1.6, 0.6);
    g.addUpdater((dt) => { t += dt; a.scale.setScalar(1 + t * 1.5); ud.veilM.opacity = Math.max(0, 0.3 * (1 - t)); ud.ringM.opacity = Math.max(0, 1 - t); if (t >= 1) { a.parent?.remove(a); return false; } });
  }
  // which building / floor is (x, y, z) in
  locate(p) {
    for (const b of this.list) {
      if (p.x < b.x0 + 0.6 || p.x > b.x1 + 0.4 || p.z < b.z0 + 0.6 || p.z > b.z1 + 0.4 || p.y < b.y - 0.6 || p.y > b.top + 0.5) continue;
      const f = Math.max(0, Math.min(b.floors, Math.floor((p.y - b.y + 0.6) / b.fh)));
      return { b, floor: f };
    }
    return null;
  }
  spawnChest(c) {
    const g = this.game, m = chestMesh(c.rarity);
    const pos = c.pos.clone(); const y = g.world.standY(pos.x, pos.z, pos.y, 3); if (isFinite(y)) pos.y = y;
    m.group.position.copy(pos); m.group.rotation.y = c.yaw ?? (Math.random() * Math.PI * 2);
    g.scene.add(m.group); (g.hubProps ??= []).push(m.group);
    const rec = { ...c, pos, obj: m.group, lid: m.lid, opened: false };
    rec.light = g.lights?.attach?.(m.group, c.rarity === 'rare' ? 0x4ad0ff : 0xffd27a, 1.6, 4, { offsetY: 1 });
    g.interactables.push({ id: 'chest-' + (c.key ?? ('bld:' + c.building?.id)), pos, radius: 2.1, label: c.label ?? 'Open chest', action: (p) => this.openChest(rec, p), enabled: () => !rec.opened });
    this.chests.push(rec);
    return rec;
  }
  openChest(c, p) {
    if (c.opened) return; c.opened = true;
    const g = this.game, sd = g.save.data;
    g.audio?.loot?.(c.rarity === 'rare' ? 'rare' : 'common');
    let t = 0; g.addUpdater((dt) => { t += dt; c.lid.rotation.x = -Math.min(1.9, t * 6); return t < 0.4; });
    g.particles?.burst(c.pos.clone().setY(c.pos.y + 0.8), { count: 26, color: c.rarity === 'rare' ? 0x4ad0ff : 0xffd23a, speed: 4, up: 2, life: 0.8, size: 0.14, shape: 1 });
    if (c.light) { g.lights?.remove?.(c.light); c.light = null; }
    const rw = c.reward ?? {};
    const coins = rw.coins ?? c.coins ?? (c.rarity === 'rare' ? 40 : 18) + Math.floor(Math.random() * 12);
    try { g.pickups.drop('coin', c.pos, Math.max(4, Math.round(coins / 4)), 4); } catch (e) { sd.coins += coins; }
    if (Math.random() < 0.5) try { g.pickups.drop('heal', c.pos, 1); } catch (e) { /* no pickups */ }
    const got = [];
    const nItems = rw.items ?? (c.rarity === 'rare' ? 1 : Math.random() < 0.35 ? 1 : 0);
    if (nItems) {
      const power = Math.max(1, Math.round((sd.level ?? 1) / 3) + 1);
      for (const it of rollChest(power, rw.rarity ?? c.rarity ?? 'common').slice(0, nItems)) { sd.inventory.push(it); const b = itemInfo(it); got.push(`${b.icon} ${b.name}`); }
    }
    if (rw.xp) { const ups = g.save.addXp(rw.xp); got.push(`${rw.xp} XP`); if (ups) g.levelUp?.(); }
    if (c.key) this.ws().chests[c.key] = 1;
    if (c.building) { this.ws().interiors[`${this.rid}:${c.building.id}`] = 1; g.toast?.(`✔ ${c.building.name} cleansed${got.length ? ' · ' + got.join(' · ') : ''}`, 'big'); }
    else g.toast?.(got.length ? `Chest: ${got.join(' · ')}` : 'Chest opened');
    g.save.write();
  }
  update(dt) {
    const g = this.game; if (g.state !== 'playing' || g.mode !== 'world') return;
    this.t += dt;
    for (const b of this.list) if (b.aura) { const u = b.aura.userData; u.ring.rotation.y += dt * 0.8; u.veilM.opacity = 0.14 + Math.sin(this.t * 3 + b.x0) * 0.06; if (Math.random() < dt * 3) g.particles?.burst(b.aura.position.clone().setY(b.aura.position.y + 0.4 + Math.random() * 2.5), { count: 2, color: 0xa050ff, speed: 0.6, up: 1.4, life: 1.2, size: 0.16 }); }
    const lead = g.players.find((p) => !p.dead && !p.downed); if (!lead) return;
    const loc = this.locate(lead.pos);
    const key = loc ? loc.b.id + ':' + loc.floor : null;
    if (key !== this.label) {
      this.label = key;
      if (loc) { const nm = loc.floor >= loc.b.floors ? `${loc.b.name} · Rooftop` : `${loc.b.name} · ${loc.b.labels[loc.floor]}`; g.hud?.flashArea?.(nm) ?? g.toast?.(nm); }
    }
    this.inside = loc;
    // a quest building whose quest was just accepted becomes infested again
    this.qT = (this.qT ?? 0) - dt;
    if (this.qT <= 0) {
      this.qT = 1;
      for (const b of this.list) if (b.quest && b.st?.done && !b.qReset && g.quests?.state?.(b.quest) === 'active') {
        b.qReset = true; b.st = { floors: b.infested.floors.map(() => ({ spawned: false, cleared: false, live: [] })), done: false };
        this.makeAura(b);
      }
    }
    // infested buildings: a pack per floor, spawned when you reach it
    for (const b of this.list) {
      if (!b.st || b.st.done) continue;
      const here = loc && loc.b === b;
      const far = Math.hypot(lead.pos.x - b.center.x, lead.pos.z - b.center.z) > Math.max(b.x1 - b.x0, b.z1 - b.z0) + 30;
      b.st.floors.forEach((fs, f) => {
        fs.live = fs.live.filter((e) => !e.dead);
        if (here && loc.floor === f && !fs.spawned && !fs.cleared) this.spawnPack(b, f, fs);
        if (fs.spawned && !fs.cleared && !fs.live.length) {
          fs.cleared = true;
          const n = b.st.floors.filter((x) => x.cleared).length;
          g.toast?.(`${b.labels[f]} cleared (${n} / ${b.st.floors.length})`);
          g.audio?.ui?.('buy');
        }
        if (far && fs.spawned && !fs.cleared) { for (const e of fs.live) { e.dead = true; e.deathT = 0.4; } fs.live = []; fs.spawned = false; }
      });
      if (b.st.floors.every((x) => x.cleared)) {
        b.st.done = true; this.dropAura(b);
        g.toast?.(`${b.name}: the curses are gone. The reward waits on ${b.labels[b.floors - 1].split(' ·')[0]}.`, 'big');
        g.audio?.levelUp?.();
        if (b.chest && !this.cleared(b.id)) {
          const c = this.spawnChest({ key: null, pos: V(b.chest[0], b.chest[1], b.chest[2]), rarity: b.infested.reward.rarity === 'rare' ? 'rare' : 'cursed', reward: b.infested.reward, building: b, label: 'Open the cursed cache' });
          g.fx?.summonCircle?.(c.pos, 0xffd23a);
        } else this.ws().interiors[`${this.rid}:${b.id}`] = 1;
      }
    }
    // chest lids / bob
    void dt;
  }
  spawnPack(b, f, fs) {
    const g = this.game, P = b.infested.floors[f], spots = b.spots[f] ?? [];
    if (g.net?.isGuest) return;   // visiting: the curses are the host's
    fs.spawned = true;
    const n = P.n;
    for (let i = 0; i < n; i++) {
      const s = spots[i % Math.max(1, spots.length)]; if (!s) break;
      const pos = V(s[0] + (i >= spots.length ? 0.3 : 0), s[1], s[2]);
      const y = g.world.standY(pos.x, pos.z, pos.y, 1); if (!isFinite(y)) continue; pos.y = y;
      const kind = P.kinds[i % P.kinds.length];
      const e = g.spawnEnemy(kind, pos, { level: b.infested.level, elite: i === 0 && P.elite ? P.elite : null });
      if (!e) continue;
      e.roamer = false; e.interior = b.id; e.spawnT = 0.5;
      fs.live.push(e);
      g.fx?.summonCircle?.(pos, 0xb05aff);
    }
    if (fs.live.length) { g.toast?.(`⚠ Curses on ${b.labels[f]}!`); g.audio?.energy?.('summon'); g.crowd?.alarm?.(b.center, 18); }
    else fs.cleared = true;
  }
}
