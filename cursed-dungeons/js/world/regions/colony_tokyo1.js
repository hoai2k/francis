// Region 7 — colony_tokyo1: Culling Game Tokyo Colony No. 1.
// A ruined Tokyo street grid under the colony barrier (curtains on every
// edge, a lattice dome overhead), pinned at a violet dusk. Districts:
//   Kogane Square (north gate) — the Window's field post, the Rule Board, Yuji and Megumi
//   Hakari's fight club (east) — a warehouse ring, bet fights, Kirara at the door
//   Kashimo's scar (south-east) — scorched ground, fulgurite crystals, live lightning
//   Angel's Chapel (north-west) — Hana Kurusu under Jacob's Ladder
//   Tokyo District Court ruins (west) — Higuruma
//   Star Heights (south-west) — the danchi Reggie Star's gang holds
// Hostile players roam everywhere outside the safe zones; curses too.
// Gates: north to Shinjuku, west to Shibuya. Window stations: Kogane Square, the fight club.
import * as THREE from 'three/webgpu';
import { registerRegion } from './index.js';
import { RegionBuilder, B, signMesh } from './common.js';
import { PLACEHOLDER_BIOMES } from './placeholders.js';
import { colonyBarrier, setupColony, ruinedTower, rubble, wreck, crater, scorch, debrisField, ruleBoard } from '../cullingGame.js';
import { addChest } from '../regionRuntime.js';

const P0 = PLACEHOLDER_BIOMES.colony_tokyo1;
export const TOKYO1_BIOME = {
  ...P0,
  name: 'Tokyo Colony No. 1', sub: 'Culling Game · the barrier closes',
  look: {
    ...P0.look, timeOfDay: 19.0,
    palette: { skyTop: 0x2a2458, skyHorizon: 0xd88ab8, fog: 0x86688e, sun: 0xffb8d8 },
    fog: { density: 0.0105, height: 12, heightDensity: 0.03, sun: 0.6 },
    clouds: { coverage: 0.66, tint: 0xc09ad0, shadows: 0.4 },
    grade: { tint: [1.05, 0.96, 1.07], sat: 1.06, contrast: 1.12, vignette: 0.3 },
    torch: 0.85, foliage: { density: 0.35 },
  },
  particles: 'embers',
};

const STREETS = [40, 100, 160, 220, 280];

function build(ctx) {
  const R = new RegionBuilder(ctx, { size: [320, 64, 320], base: 10 });
  const N = R.noise, base = R.base;
  // ------------------------------------------------------------ plan
  R.gate('n', 'shinjuku', { at: 160, road: false, y: base });
  R.gate('w', 'shibuya', { at: 160, road: false, y: base });
  for (const s of STREETS) {
    const wide = s === 160, o = { width: wide ? 8 : 6, block: B.asphalt, alt: B.cracked_brick, altP: 0.06, y: base, line: wide ? B.asphalt_line : null };
    R.road([[s + 0.5, wide ? 0.5 : 6], [s + 0.5, 313]], o);
    R.road([[wide ? 0.5 : 6, s + 0.5], [313, s + 0.5]], o);
  }
  R.flat(124, 4, 196, 36, { y: base, block: B.concrete, alt: B.cracked_brick, altP: 0.12 });   // Kogane Square
  R.flat(222, 102, 278, 158, { y: base, block: B.concrete });                                    // fight club lot
  R.flat(42, 222, 98, 278, { y: base, block: B.concrete, alt: B.cracked_brick, altP: 0.2 });    // Star Heights
  R.flat(42, 102, 98, 158, { y: base, block: B.concrete });                                      // court
  R.station('square', 'Kogane Square', 142, 22, { y: base, facing: 'e' });
  R.station('club', 'Fight Club Lot', 240, 166, { y: base, facing: 'n' });
  // ------------------------------------------------------------ terrain: flat city, a little heave in the ruins
  R.terrain({ falloff: 6, fn: (x, z) => base + 1.4 * (N.fbm(x * 0.05, z * 0.05, 2) * 0.5 + 0.5) + (Math.hypot(x - 268, z - 268) < 50 ? -1 : 0) });
  const overgrown = (x, z) => N.fbm(x * 0.04 + 9, z * 0.04, 3) > 0.28;
  R.carve({ top: B.concrete, sub: B.stone, rock: B.cracked_brick, rock2: B.concrete, rockSlope: 3, topFn: (x, z) => (overgrown(x, z) ? (R.chance(0.6) ? B.grass : B.dirt) : R.chance(0.1) ? B.cracked_brick : R.chance(0.08) ? B.stone : B.concrete) });
  R.paveRoads();
  const W = R.world;
  colonyBarrier(R, { color: 0xe08aff, height: 72 });

  // ------------------------------------------------------------ Kogane Square: the Window field post
  {
    const y = base;
    R.tower(126, 6, 14, 10, 1, { wall: B.plaster, trim: B.concrete_pillar, win: B.window, door: 's', sign: true });   // the konbini
    R.tower(182, 6, 12, 9, 2, { wall: B.concrete, door: 's' });
    ruleBoard(R, 176, 16, { ry: 0 });
    for (let x = 126; x <= 194; x += 4) if (Math.abs(x - 160) > 6) { R.props.box(x + 0.5, y, 37.5, 1.6, 1.1, 0.7, 0x8a6a3a, { ry: R.rnd(-0.2, 0.2), vary: 0.2 }); W.set(x, y, 37, B.barrier); }   // barricade of crates
    for (const [x, z] of [[130, 30], [190, 30], [150, 12], [170, 12]]) R.streetLight(x + 0.5, z + 0.5);
    W.set(160, y - 1, 28, B.lava); W.addLight(160.5, y + 1, 28.5, 0xff8a3a, 4, 10);   // a fire in an oil drum
    R.props.box(160.5, y, 28.5, 0.9, 1.0, 0.9, 0x3a3a40, { vary: 0 }); W.set(160, y, 28, B.barrier);
    R.poi('square', 'Kogane Square', '🟡', 160, 24, 'town');
    R.anchor('kogane_square', 160, 26);
    R.deco.extra(() => { const m = signMesh(['東京第1結界', 'TOKYO COLONY No.1'], { w: 5, h: 1.4, color: '#e8a8ff' }); m.position.set(160.5, y + 6.2, 6.5); return m; });
    R.torii(160.5, y, 6.5, 9, 6, { color: 0x3a2a4a, collide: false });
    addChest(R, 'konbini', 133, 10, { rarity: 'common' });
  }
  // ------------------------------------------------------------ Hakari's fight club
  const ring = { x: 252, z: 130 };
  {
    const x0 = 226, z0 = 108, x1 = 274, z1 = 152, y = base, top = y + 9;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { W.setRaw(x, y - 1, z, B.polished); for (let yy = y; yy < top + 2; yy++) W.setRaw(x, yy, z, 0); }
    for (let yy = y; yy < top; yy++) {
      const id = (k) => (k % 6 === 0 ? B.concrete_pillar : yy >= y + 6 ? B.metal_grate : yy === y + 5 ? B.dark_brick : B.concrete);
      for (let x = x0; x <= x1; x++) { W.set(x, yy, z0, id(x - x0)); W.set(x, yy, z1, id(x - x0)); }
      for (let z = z0; z <= z1; z++) { W.set(x0, yy, z, id(z - z0)); W.set(x1, yy, z, id(z - z0)); }
    }
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, top, z, (x + z) % 7 === 0 ? B.window_dark : B.concrete);
    for (let yy = y; yy < y + 5; yy++) for (let z = 124; z <= 136; z++) W.set(x0, yy, z, 0);     // roll-up door onto the street
    for (let yy = y; yy < y + 4; yy++) for (let x = 248; x <= 256; x++) W.set(x, yy, z1, 0);     // the back door to the station lot
    W.addRoof([x0, top - 1, z0], [x1, top + 1, z1], [[x0 + 1, y, z0 + 1], [x1 - 1, top - 2, z1 - 1]]);
    // the ring
    for (let z = ring.z - 6; z <= ring.z + 6; z++) for (let x = ring.x - 6; x <= ring.x + 6; x++) W.set(x, y, z, Math.abs(x - ring.x) === 6 || Math.abs(z - ring.z) === 6 ? B.red_lacquer : B.floor_boards);
    for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { R.props.box(ring.x + 0.5 + dx, y + 1, ring.z + 0.5 + dz, 0.4, 2.2, 0.4, 0xc83a2a); }
    for (const hh of [1.9, 2.6]) for (const [ax, az, bx, bz] of [[-6, -6, 6, -6], [-6, 6, 6, 6], [-6, -6, -6, 6], [6, -6, 6, 6]]) {
      const cx = ring.x + 0.5 + (ax + bx) / 2, cz = ring.z + 0.5 + (az + bz) / 2, len = Math.hypot(bx - ax, bz - az);
      R.props.box(cx, y + hh, cz, ax === bx ? 0.08 : len, 0.08, ax === bx ? len : 0.08, 0xf0f0f0, { vary: 0 });
    }
    // stands, crates, the bookie's desk, pachinko lights
    for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2, rr = 10 + (k % 2) * 2.5; const x = Math.round(ring.x + Math.cos(a) * rr * 1.3), z = Math.round(ring.z + Math.sin(a) * rr); if (x <= x0 + 1 || x >= x1 - 1 || z <= z0 + 1 || z >= z1 - 1 || (x < x0 + 6 && z > 122 && z < 138)) continue; W.set(x, y, z, k % 3 ? B.crate : B.barrel); }
    for (let x = x0 + 2; x < x1 - 1; x += 3) { W.set(x, y + 7, z0 + 1, (x / 3) % 2 ? B.neon_pink : B.lantern); W.set(x, y + 7, z1 - 1, (x / 3) % 2 ? B.lantern : B.neon_pink); }
    for (const [x, z] of [[238, 120], [266, 120], [238, 140], [266, 140], [252, 114], [252, 146]]) W.addLight(x + 0.5, y + 6, z + 0.5, 0xff70c0, 3.4, 12);
    W.addLight(ring.x + 0.5, y + 7, ring.z + 0.5, 0xffe8c0, 5, 14);
    for (let z = 120; z <= 140; z += 4) { W.set(x0 - 1, y + 6, z, B.neon_pink); W.set(x0 - 1, y + 7, z + 1, B.lantern); }
    R.deco.extra(() => {
      const s1 = signMesh(['秤 HAKARI', 'FIGHT CLUB'], { w: 7, h: 2.2, color: '#ff8ad8', border: '#ffd84a' }); s1.position.set(x0 - 0.7, y + 7, 130.5); s1.rotation.y = -Math.PI / 2;
      const s2 = signMesh(['JACKPOT', '★ 777 ★'], { w: 4, h: 1.4, color: '#ffd84a' }); s2.position.set(ring.x + 0.5, y + 6.5, z0 + 1.6);
      return [s1, s2];
    });
    R.poi('fight_club', 'Hakari\'s Fight Club', '🎰', 250, 130, 'landmark');
    R.anchor('fight_ring', ring.x, ring.z);
    R.anchor('club_door', 222, 130);
    addChest(R, 'club_vault', 270, 148, { rarity: 'rare', power: 1 });
    R.reserve(x0 - 2, z0 - 2, x1 + 2, z1 + 2, 2);
  }
  // ------------------------------------------------------------ Kashimo's lightning scar
  {
    scorch(R, 268, 268, 50, { ragged: 0.5 });
    for (const [x, z, r] of [[248, 246, 6], [284, 258, 8], [262, 292, 5], [296, 296, 6], [236, 286, 4]]) crater(R, x, z, r, { floor: B.obsidian, rim: B.dark_brick });
    // fulgurites: glassy blue spikes where the lightning went into the ground
    for (let k = 0; k < 9; k++) {
      const x = 232 + Math.floor(R.r() * 80), z = 232 + Math.floor(R.r() * 80); if (!R.freeCell(x, z, 1)) continue;
      const y = R.groundY(x, z), hh = 2 + Math.floor(R.r() * 3);
      for (let i = 0; i < hh; i++) W.set(x, y + i, z, i === hh - 1 ? B.blue_energy : B.obsidian);
      R.reserve(x - 1, z - 1, x + 1, z + 1);
    }
    for (let k = 0; k < 22; k++) { const x = 228 + Math.floor(R.r() * 86), z = 228 + Math.floor(R.r() * 86); if (R.freeCell(x, z, 1)) R.tree(x, z, 'dead'); }
    ruinedTower(R, 232, 300, 14, 12, 4, { bites: 5, bite: 5, door: 'n' });
    ruinedTower(R, 296, 230, 12, 14, 5, { bites: 5, bite: 5, door: 'w' });
    rubble(R, 262, 266, 3.5, { h: 3 });
    R.poi('scar', 'Kashimo\'s Scar', '⚡', 262, 270, 'landmark');
    R.anchor('scar_center', 266, 272);
    addChest(R, 'scar', 300, 306, { rarity: 'rare', poi: 'Charred Strongbox' });
  }
  // ------------------------------------------------------------ Angel's Chapel and Jacob's Ladder
  {
    const y = base;
    R.house(60, 58, 18, 14, { wall: B.marble, post: B.plaster, beam: B.gold_trim, roof: B.concrete, floors: 2, door: 's', win: B.window });
    for (let yy = y + 5; yy < y + 12; yy++) for (let x = 70; x <= 77; x++) if (R.chance(0.7)) W.setRaw(x, yy, 58 + Math.floor(R.r() * 3), 0);   // the shattered north wall
    R.props.box(69.5, y, 80.5, 1.6, 0.2, 1.6, 0xffe8a0, { emit: 2.2, vary: 0 });
    R.props.box(69.5, y + 0.2, 80.5, 0.7, 46, 0.7, 0xfff4c8, { emit: 2.8, vary: 0 });     // the beam
    W.addLight(69.5, y + 3, 80.5, 0xfff0c0, 6, 14);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; R.lantern(69.5 + Math.cos(a) * 6, 84.5 + Math.sin(a) * 4, { glow: 0xfff4d8, lightColor: 0xfff0d0, light: k % 2 === 0 }); }
    R.forest({ kinds: ['sakura', 'dead'], density: 0.12, step: 5, rect: [44, 44, 96, 96] });
    R.poi('chapel', 'Angel\'s Chapel', '😇', 69, 74, 'landmark');
    R.anchor('chapel', 70, 86);
    addChest(R, 'chapel', 74, 66, { rarity: 'rare' });
  }
  // ------------------------------------------------------------ Tokyo District Court ruins
  {
    const t = ruinedTower(R, 46, 108, 30, 18, 3, { wall: B.marble, trim: B.stone_brick, win: B.window_dark, door: 's', bites: 2 });
    for (const x of [50, 56, 62, 68]) R.props.box(x + 0.5, base, 128.5, 0.9, 6, 0.9, 0xe8e4dc);
    R.deco.extra(() => { const m = signMesh(['東京地方裁判所', 'DISTRICT COURT'], { w: 6, h: 1.3, color: '#f0e8d0', bg: 'rgba(40,36,30,0.92)' }); m.position.set(61, base + 4.5, 126.2); return m; });
    R.poi('court', 'District Court Ruins', '⚖', 60, 130, 'landmark');
    R.anchor('court', 60, 134);
    addChest(R, 'court', t.center.x - 8, t.center.z, { rarity: 'common' });
  }
  // ------------------------------------------------------------ Star Heights: Reggie's danchi
  {
    const a = ruinedTower(R, 46, 226, 46, 12, 6, { wall: B.plaster, trim: B.concrete_pillar, win: B.window_dark, door: 's', bites: 4, rubble: false });
    const b = ruinedTower(R, 46, 262, 46, 12, 5, { wall: B.plaster, trim: B.concrete_pillar, win: B.window, door: 'n', bites: 3, rubble: false });
    for (const t of [a, b]) for (let f = 1; f < (t === a ? 6 : 5); f++) for (let x = 48; x < 92; x += 4) R.props.box(x + 1, base + f * 4, t === a ? 238.6 : 261.4, 3.4, 0.9, 0.7, 0xb8b4a8, { vary: 0.05 });   // balconies
    for (let k = 0; k < 6; k++) R.props.box(52 + k * 7, base + 2.2, 250, 0.06, 0.06, 5, 0x3a3a3a);   // laundry lines
    for (let k = 0; k < 14; k++) R.props.box(52 + Math.floor(k / 2) * 7 + 0.3, base + 1.5, 248.5 + (k % 2) * 2.5, 0.05, 0.9, 0.7, [0xe85a5a, 0x5a8ae8, 0xf0f0f0, 0xe8c85a][k % 4]);
    for (let k = 0; k < 40; k++) R.deco.add('paper', 46 + R.r() * 48, base, 240 + R.r() * 20, { mode: 'flat', scale: 0.7 });   // receipts everywhere
    wreck(R, 60, 244, { fire: true }); wreck(R, 84, 252, { flip: true });
    R.deco.extra(() => { const m = signMesh(['スターハイツ', 'STAR HEIGHTS'], { w: 6, h: 1.4, color: '#ffe08a' }); m.position.set(69, base + 6, 239.2); return m; });
    R.poi('star_heights', 'Star Heights', '🧾', 70, 250, 'landmark');
    R.anchor('reggie_block', 70, 250);
      addChest(R, 'reggie_room', a.center.x + 12, a.center.z, { rarity: 'rare', power: 1, poi: 'Reggie\'s Stash' });
  }
  // ------------------------------------------------------------ the ruined blocks
  const special = (x0, z0) => (x0 >= 100 && x0 < 200 && z0 < 40) || (x0 === 165 && z0 === 165) || (x0 === 225 && z0 === 165) || (x0 > 220 && z0 > 100 && z0 < 160) || (x0 > 220 && z0 > 220) || (x0 < 100 && z0 < 160 && z0 > 40) || (x0 < 100 && z0 > 220 && z0 < 280);
  const edges = [6, ...STREETS, 313];
  let chestN = 0;
  for (let i = 0; i < edges.length - 1; i++) for (let j = 0; j < edges.length - 1; j++) {
    const gx0 = edges[i] + 5, gx1 = edges[i + 1] - 5, gz0 = edges[j] + 5, gz1 = edges[j + 1] - 5;
    if (gx1 - gx0 < 12 || gz1 - gz0 < 12 || special(gx0, gz0)) continue;
    const mx = (gx0 + gx1) >> 1, mz = (gz0 + gz1) >> 1;
    const lots = gx1 - gx0 > 30 && gz1 - gz0 > 30 ? [[gx0, gz0, mx - 2, mz - 2], [mx + 2, gz0, gx1, mz - 2], [gx0, mz + 2, mx - 2, gz1], [mx + 2, mz + 2, gx1, gz1]] : [[gx0, gz0, gx1, gz1]];
    for (const [a0, b0, a1, b1] of lots) {
      const w = a1 - a0 + 1, d = b1 - b0 + 1, roll = R.r();
      if (w < 10 || d < 10) continue;
      if (roll < 0.14) { rubble(R, (a0 + a1) / 2, (b0 + b1) / 2, Math.min(w, d) / 2 - 1, { h: 4 }); continue; }
      if (roll < 0.2) { wreck(R, a0 + w / 2, b0 + d / 2, { fire: R.chance(0.5) }); debrisField(R, a0, b0, a1, b1, 14); continue; }
      const bw = Math.min(w, 10 + Math.floor(R.r() * Math.max(1, w - 9))), bd = Math.min(d, 10 + Math.floor(R.r() * Math.max(1, d - 9)));
      const x = a0 + Math.floor(R.r() * (w - bw + 1)), z = b0 + Math.floor(R.r() * (d - bd + 1));
      const t = ruinedTower(R, x, z, bw, bd, 2 + Math.floor(R.r() * 6), { door: b0 < mz ? 'n' : 's', sign: R.chance(0.35) });
      if (chestN < 4 && R.chance(0.12)) addChest(R, 'ruin' + chestN++, t.center.x, t.center.z, { rarity: R.chance(0.3) ? 'rare' : 'common' });
    }
  }
  // the club's station lot: a car park full of wrecks
  for (let k = 0; k < 7; k++) wreck(R, 250 + (k % 4) * 6, 180 + Math.floor(k / 4) * 9, { ry: Math.PI / 2 + R.rnd(-0.2, 0.2), fire: k === 5 });
  // the big crater where two players fought it out, and the centre tower
  crater(R, 192, 192, 13, { floor: B.cracked_brick, rim: B.concrete, depth: 5 });
  R.poi('crater', 'Impact Crater', '💥', 192, 192, 'landmark');
  R.anchor('crater', 192, 182);
  // street dressing: wrecks, rubble spilling onto the roads, broken lights, fires
  for (let k = 0; k < 46; k++) {
    const s = STREETS[Math.floor(R.r() * STREETS.length)], along = 10 + R.r() * 300, alongX = R.chance(0.5);
    const x = alongX ? along : s + R.rnd(-2.5, 2.5), z = alongX ? s + R.rnd(-2.5, 2.5) : along;
    if (Math.abs(x - 160) < 5 && z < 40) continue;
    if (R.chance(0.6)) wreck(R, x, z, { ry: alongX ? Math.PI / 2 + R.rnd(-0.4, 0.4) : R.rnd(-0.4, 0.4), fire: R.chance(0.15) });
    else rubble(R, x, z, 1.5 + R.r(), { roads: true, lock: false, h: 1.5 });
  }
  for (const s of STREETS) for (let a = 20; a < 300; a += 24) { if (R.chance(0.45)) R.streetLight(s + 4.5, a + 0.5, { light: R.chance(0.5) }); }
  debrisField(R, 6, 6, 314, 314, 260);
  R.forest({ kinds: ['dead', 'oak'], density: (x, z) => (overgrown(x, z) ? 0.25 : 0.03), step: 4 });
  R.scatter({ density: 0.05, types: ['grass', 'tall_grass', 'cursed_weed', 'grass'] });
  // quest anchors spread through the ruins
  [[130, 120], [196, 86], [118, 204], [206, 252]].forEach(([x, z], i) => R.anchor('cursed_obj_' + i, x, z));
  R.anchor('captive_t1', 132, 186);

  // ------------------------------------------------------------ people
  R.person({ id: 't1_yuji', name: 'Yuji Itadori', look: 'yuji', x: 152, z: 28, yaw: 0.4, color: '#ff8a6a',
    lines: [['This colony is a mess. Everyone\'s hunting everyone for points.', 'Megumi\'s sister is tangled up in all this. We need 100 points to add a rule. A point-transfer rule.'], ['Kogane keeps shouting "Ding ding ding!" at me. I hate it.']] });
  R.person({ id: 't1_megumi', name: 'Megumi Fushiguro', look: 'megumi', x: 148, z: 30, yaw: 0.9, color: '#7aa0ff',
    lines: [['Don\'t trust anyone here. Half these players came back from the Heian era wearing someone else\'s body.'], ['Points stay with you even if you leave the colony. Use that.']] });
  R.person({ id: 't1_window', name: 'Window Agent Oda', look: 'npc_ijichi', x: 168, z: 24, yaw: -0.6, color: '#9ab0d8',
    lines: [['The Window set up here before the barrier closed. We can see in, but the colony won\'t let us take civilians out.', 'If you find anyone trapped, bring them to the square. Kogane can\'t score off them here.']] });
  R.person({ id: 't1_survivor', name: 'Office Worker Mori', look: 'npc_civ_2', x: 134, z: 20, yaw: 1.2, pose: 'sit', color: '#c8c8a8',
    lines: [['I came home from work and the sky turned into a wall. Then a golden thing told me I was "a player".'], ['I haven\'t scored a single point. I don\'t want to.']] });
  R.person({ id: 't1_hakari', name: 'Kinji Hakari', look: 'hakari', x: 246, z: 120, yaw: 0.6, color: '#7ad8a8',
    lines: [['Welcome to the club! In here, the only rule is: feel the fever!', 'Win a bout, win the pot. Lose a bout... well. Don\'t.'], ['Gambling\'s about the thrill, see? Probability\'s for cowards.']] });
  R.person({ id: 't1_kirara', name: 'Kirara Hoshi', look: 'npc_kirara', x: 232, z: 130, yaw: Math.PI / 2, color: '#ff9ad8',
    lines: [['Members only! ...Fine, you can come in. Hakari likes a crowd.'], ['Stay out of the ring unless you mean it.']] });
  R.person({ id: 't1_bookie', name: 'Bookie Tsuda', look: 'npc_civ_1', x: 240, z: 140, yaw: 0.8, color: '#ffd27a',
    lines: [['Odds on the next bout: 7 to 1 against the new kid. That\'s you, by the way.'], ['The house always wins. Except when Hakari\'s on a fever. Then nobody knows anything.']] });
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3; R.person({ id: 't1_fan' + k, name: 'Spectator', look: 'npc_civ_' + [0, 2, 3, 4, 5][k], x: Math.round(ring.x + Math.cos(a) * 9), z: Math.round(ring.z + Math.sin(a) * 8), yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), pose: 'wave', color: '#d8c8b8', lines: [['FIGHT! FIGHT! FIGHT!'], ['I put my whole salary on red. Wait, this isn\'t roulette.']] }); }
  R.person({ id: 't1_kashimo', name: 'Hajime Kashimo', look: 'kashimo', x: 258, z: 262, yaw: -2.4, color: '#8ad8ff',
    lines: [['Four hundred years I waited for a strong opponent. Four hundred years.', 'You? Hm. Show me something first.'], ['Lightning doesn\'t strike twice? Mine does.']] });
  R.person({ id: 't1_hana', name: 'Hana Kurusu', look: 'npc_hana', x: 72, z: 82, yaw: 0.2, color: '#fff0b8',
    lines: [['I am Angel. My technique extinguishes all others.', 'Jacob\'s Ladder will burn away what should not be.'], ['Megumi-kun... is he well?']] });
  R.person({ id: 't1_higuruma', name: 'Hiromi Higuruma', look: 'higuruma', x: 62, z: 136, yaw: 0, color: '#d8c8a0',
    lines: [['I was a lawyer. I believed in the system. Then I watched it convict an innocent man.', 'Here, at least, my court is honest.'], ['Deadly Sentencing. Guilty or not guilty. There is no appeal.']] });
  R.person({ id: 't1_fumiko', name: 'Fumiko (hiding)', look: 'npc_civ_4', x: 38, z: 212, yaw: 2.6, color: '#e8b0c0',
    lines: [['Shh! Reggie\'s gang took Star Heights. They make people sign receipts and then... the receipts become weapons.'], ['My grandson\'s apartment is in there.']] });

  // ------------------------------------------------------------ curses and players
  R.roamZone(4, 40, 316, 316, { kinds: ['swarmer', 'swarmer', 'teleporter', 'doll', 'transfigured', 'flyhead', 'shadow'], level: 3, dense: true });
  R.safeZone(122, 2, 198, 40);       // Kogane Square
  R.safeZone(224, 104, 276, 156);    // the fight club (fights happen in the ring only)
  R.safeZone(232, 158, 250, 174);    // the club's station lot
  setupColony(R, {
    name: 'Tokyo Colony No. 1', color: '#e08aff',
    intro: ['Tokyo Colony No. 1! Players here: plenty! Points in play: lots! Ding ding ding!', 'The fight club in the east pays in coins. Kashimo in the south-east pays in pain. Star Heights belongs to Reggie Star — he has a LOT of points.'],
    cap: 3,
    playerZones: [
      { x0: 4, z0: 40, x1: 316, z1: 316, roster: ['brawler', 'brawler', 'caster', 'blinker', 'heavy', 'lancer'], level: 3, max: 3 },
      { x0: 30, z0: 210, x1: 110, z1: 300, roster: ['gang', 'gang', 'heavy', 'caster'], level: 3, max: 4, elite: 0.15 },
    ],
    events: [
      { kind: 'lightning', rect: { x0: 226, z0: 226, x1: 316, z1: 316 }, dmg: 12, enter: 'Kashimo\'s scar! The ground still crackles. Lightning strikes where you stand!' },
    ],
  });
  return R.finish({ spawn: [160, 30], biome: TOKYO1_BIOME, sunOffset: new THREE.Vector3(-30, 26, 18), backdrop: { c0: 0x24182e, c1: 0x6a4a7a, ground: 0x140c18 } });
}

registerRegion('colony_tokyo1', {
  name: 'Tokyo Colony No. 1', sub: 'Culling Game · Hakari, Kashimo, Reggie', kind: 'colony', grid: [2, 2],
  color: '#5a2a6a', accent: '#e08aff', icon: '🎰',
  blurb: 'Ruined Tokyo under a barrier: a fight club, a lightning scar, Angel, and Reggie Star\'s gang.',
  biome: TOKYO1_BIOME, build,
});
