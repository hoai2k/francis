// Minecraft brick props for "Blocky Biome Run": voxel mobs (creepers, villagers,
// golems, ghasts…), blocks, trees and minecarts. Faces and printed tiles (TNT,
// furnaces, bookshelves) come from one pixel-art atlas. Mobs are specs of parts
// hung on pivots, so the same model can be stamped into a static BrickBuilder or
// built as an animated rig. Every model faces +Z with its feet on y = 0.
import { THREE, BrickBuilder, C, plastic, brickGeometry } from './kit.js';

const _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const M2 = new THREE.Matrix4();
function compose(x, y, z, rx, ry, rz, sx, sy, sz) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); }
const GEO = {};
const geo = (k, f) => GEO[k] || (GEO[k] = f());
const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));

// ---- colours ---------------------------------------------------------------------------
export const MC = {
  grass: 0x5d9b3a, grass2: 0x4f8a30, dirt: 0x8a5e3c, dirt2: 0x76502f, path: 0x9a8048, stone: 0x8a8a8a, stone2: 0x7a7a7a, cobble: 0x6e6e6e, cobble2: 0x5a5a5a,
  log: 0x6b5233, log2: 0x4e3a22, plank: 0xb8945f, plank2: 0x9c7a48, dkplank: 0x4a3420, spruce: 0x6a4e30, leaves: 0x2f7a22, leaves2: 0x266a1c, birch: 0xe6e2d6, birchLeaf: 0x4f8a2c,
  sand: 0xdbcf8e, sand2: 0xc9bc7a, sandstone: 0xd8ca8a, water: 0x3a6ad8, lava: 0xff6a10, obsidian: 0x1e1430, obsidian2: 0x2e2048,
  netherrack: 0x7a2e2e, netherrack2: 0x5e2222, nbrick: 0x3a1c22, nbrick2: 0x2a1418, glow: 0xffd870, soul: 0x4a3a2c, quartz: 0xe8e0d6,
  wool: 0xeeeeee, pig: 0xf0a0a0, cowB: 0x4a3424, gold: 0xf2cd37, iron: 0xd8d8d8, diamond: 0x4ae0e0, redstone: 0xd02020, emerald: 0x20c050, coal: 0x222222, lapis: 0x2850c0,
  snow: 0xf4f8ff, cactus: 0x2f7a2a, cactus2: 0x225e20, wheat: 0xd8c050, wheat2: 0x9ab040, tnt: 0xd03a2a,
};

// ---- pixel-art atlas: 8 x 4 cells of 16 x 16 px ------------------------------------------------
// faces are 8 x 8 drawn at 2x; tiles are full 16 x 16
const PAL = {
  creeper: { g: '#5da84a', l: '#82d066', d: '#3f7a2e', k: '#101010' },
  pig: { p: '#f0a0a0', s: '#e07878', n: '#7a3a3a', w: '#ffffff', k: '#101010' },
  cow: { b: '#4a3424', w: '#e8e8e8', k: '#101010', m: '#b8a898', n: '#3a2a20' },
  sheep: { w: '#f2f2f2', s: '#d8c0a8', k: '#101010', p: '#e89a9a' },
  villager: { s: '#b8805a', b: '#3a2a1a', w: '#ffffff', g: '#2a9a3a', n: '#9a6a48', m: '#6a3a28' },
  zombie: { z: '#4a8a5a', y: '#5aa06a', k: '#101010', d: '#2a5a3a' },
  husk: { z: '#b8a070', y: '#c8b080', k: '#101010', d: '#7a6a48' },
  skeleton: { l: '#cfcfcf', g: '#a8a8a8', k: '#101010' },
  wither: { l: '#3a3a3a', g: '#2a2a2a', k: '#050505' },
  steve: { h: '#3a2814', s: '#c69c78', w: '#ffffff', u: '#4a5ab0', n: '#9a6a4a', m: '#6a4030' },
  alex: { h: '#d8781a', s: '#f0c8a0', w: '#ffffff', u: '#2a9a3a', n: '#d8a888', m: '#c06060' },
  golem: { g: '#c8c0b0', d: '#8a8478', k: '#101010', r: '#c03030', n: '#b0a898', v: '#4a8a2a' },
  enderman: { k: '#141414', p: '#cc55ff', P: '#f0b0ff' },
  ghast: { w: '#f0f0f0', g: '#d0d0d0', k: '#202020' },
  ghastA: { w: '#f0f0f0', g: '#d0d0d0', k: '#202020', r: '#c03030' },
  blaze: { y: '#f0c020', o: '#e07010', k: '#3a2000' },
  chicken: { w: '#f8f8f8', k: '#101010', y: '#f0b020', r: '#d02020' },
  piglin: { p: '#e8a0a0', s: '#d07878', n: '#5a2a2a', w: '#ffffff', k: '#101010', t: '#f0f0e0' },
  golemN: {},
};
const FACE_ART = {
  creeper: ['glgdlgdl', 'gdlgglgd', 'gkkgdkkg', 'lkkglkkl', 'gdlkkgdg', 'glkkkkgl', 'dgkkkkdg', 'glkdgkgl'],
  pig: ['pppppppp', 'pppppppp', 'pppppppp', 'wkppppkw', 'ppsssspp', 'ppnssnpp', 'ppsssspp', 'pppppppp'],
  cow: ['bbbbbbbb', 'bwwbbbbb', 'bbbbbbwb', 'wkbbbbkw', 'bbbbbbbb', 'bbmmmmbb', 'bbmnnmbb', 'bbmmmmbb'],
  sheep: ['wwwwwwww', 'wwwwwwww', 'wssssssw', 'swksskws', 'ssssssss', 'sssppsss', 'ssssssss', 'wssssssw'],
  villager: ['ssssssss', 'ssssssss', 'sbbbbbbs', 'swgnngws', 'sssnnsss', 'sssnnsss', 'ssssssss', 'ssmmmmss'],
  zombie: ['zzzzzzzz', 'zyzzzzyz', 'zzzzzzzz', 'zkkzzkkz', 'zzzddzzz', 'zzddddzz', 'zzzzzzzz', 'zzzzyzzz'],
  husk: ['zzzzzzzz', 'zyzzzzyz', 'zzzzzzzz', 'zkkzzkkz', 'zzzddzzz', 'zzddddzz', 'zzzzzzzz', 'zzzzyzzz'],
  skeleton: ['llllllll', 'lgllllgl', 'lkkllkkl', 'lkkllkkl', 'lllkklll', 'llllllll', 'lkkkkkkl', 'llgllgll'],
  wither: ['llllllll', 'lgllllgl', 'lkkllkkl', 'lkkllkkl', 'lllkklll', 'llllllll', 'lkkkkkkl', 'llgllgll'],
  steve: ['hhhhhhhh', 'hhhhhhhh', 'hssssssh', 'swussuws', 'sssnnsss', 'ssmmmmss', 'ssssssss', 'ssssssss'],
  alex: ['hhhhhhhh', 'hhhhhhhh', 'hsssssss', 'swussuws', 'ssssssss', 'sssmmsss', 'ssssssss', 'ssssssss'],
  golem: ['gggggggg', 'gddddddg', 'gkrggrkg', 'gggnnggg', 'gggnnggg', 'gvgnnggg', 'gggggggg', 'gvggggvg'],
  enderman: ['kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk', 'pPpkkpPp', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk'],
  ghast: ['wwwwwwww', 'wgwwwwgw', 'wkkwwkkw', 'wwwwwwww', 'wwwwwwww', 'wwwkkwww', 'wwwwwwww', 'wwgwwgww'],
  ghastA: ['wwwwwwww', 'wkkwwkkw', 'wkkwwkkw', 'wrwwwwrw', 'wrkkkkrw', 'wwkkkkww', 'wwkkkkww', 'wwwwwwww'],
  blaze: ['yyyyyyyy', 'yoyyyyoy', 'yyyyyyyy', 'ykkyykky', 'yyyyyyyy', 'yyookoyy', 'yyyyyyyy', 'oyyyyyyo'],
  chicken: ['wwwwwwww', 'wkwwwwkw', 'wwwwwwww', 'wwyyyyww', 'wwyyyyww', 'wwwrrwww', 'wwwrrwww', 'wwwwwwww'],
  piglin: ['pppppppp', 'pppppppp', 'pwkppkwp', 'pppppppp', 'pssssssp', 'psnssnsp', 'tpsssspt', 'pppppppp'],
};
const CELLS = [...Object.keys(FACE_ART), 'tnt', 'tntTop', 'craft', 'furnace', 'books', 'chest', 'pumpkin', 'door', 'glass', 'bell', 'ore', 'spawner'];
function drawTile(g, name) {
  const px = (x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const noise = (cols, seed) => { let s = seed; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { s = (s * 1103515245 + 12345) & 0x7fffffff; px(x, y, cols[s % cols.length]); } };
  switch (name) {
    case 'tnt': {
      for (let x = 0; x < 16; x++) px(x, 0, x % 4 < 2 ? '#d03a2a' : '#a82a1e', 1, 16);
      px(0, 5, '#f4f4f4', 16, 6);
      const L = { T: ['111', '010', '010', '010'], N: ['101', '111', '111', '101'] };
      ['T', 'N', 'T'].forEach((ch, n) => L[ch].forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') px(2 + n * 4 + x, 6 + y, '#1a1a1a'); })));
      break;
    }
    case 'tntTop': noise(['#d03a2a', '#b8301f'], 7); px(6, 6, '#3a3a3a', 4, 4); px(7, 7, '#e8e8e8', 2, 2); break;
    case 'craft': noise(['#9c7a48', '#b8945f'], 3); px(0, 0, '#6b5233', 16, 3); px(2, 5, '#7a7a7a', 4, 4); px(10, 5, '#8a5e3c', 4, 6); px(11, 4, '#6e6e6e', 2, 2); break;
    case 'furnace': noise(['#6e6e6e', '#7a7a7a', '#5a5a5a'], 5); px(3, 3, '#2a2a2a', 10, 4); px(3, 9, '#2a2a2a', 10, 5); px(4, 10, '#ff9a20', 8, 3); px(6, 11, '#ffe060', 4, 2); break;
    case 'books': noise(['#9c7a48', '#b8945f'], 9); for (const y of [1, 9]) for (let x = 1; x < 15; x += 2) px(x, y, ['#a02a2a', '#2a4aa0', '#2a8a3a', '#d8b040', '#6a2a8a'][(x + y) % 5], 2, 6); break;
    case 'chest': px(0, 0, '#9a6a2a', 16, 16); px(0, 6, '#5a3a14', 16, 1); px(0, 0, '#5a3a14', 16, 1); px(7, 5, '#c8c8c8', 2, 4); px(1, 1, '#b8803a', 14, 4); break;
    case 'pumpkin': px(0, 0, '#e0861a', 16, 16); for (let x = 0; x < 16; x += 4) px(x, 0, '#c87010', 1, 16); for (const [x, y, w, h] of [[3, 4, 3, 3], [10, 4, 3, 3], [3, 10, 10, 2], [5, 12, 6, 1]]) px(x, y, '#ffd040', w, h); break;
    case 'door': px(0, 0, '#9c7a48', 16, 16); for (const y of [2, 9]) px(2, y, '#6b5233', 12, 5); px(3, 3, '#b8945f', 4, 3); px(9, 3, '#b8945f', 4, 3); px(12, 8, '#3a3a3a', 2, 1); break;
    case 'glass': px(0, 0, '#bfe8f8', 16, 16); px(0, 0, '#f4ffff', 16, 1); px(0, 0, '#f4ffff', 1, 16); px(15, 0, '#8ab8c8', 1, 16); px(0, 15, '#8ab8c8', 16, 1); px(3, 3, '#ffffff', 2, 1); px(4, 4, '#ffffff', 2, 1); break;
    case 'bell': px(0, 0, '#f2cd37', 16, 16); px(0, 12, '#c89a20', 16, 4); px(5, 2, '#fff09a', 2, 8); break;
    case 'ore': noise(['#8a8a8a', '#7a7a7a', '#9a9a9a'], 11); break;
    case 'spawner': px(0, 0, '#1a1a2a', 16, 16); for (let x = 0; x < 16; x += 5) px(x, 0, '#3a3a5a', 1, 16); for (let y = 0; y < 16; y += 5) px(0, y, '#3a3a5a', 16, 1); px(5, 5, '#ff7a20', 6, 6); break;
    default: {
      const art = FACE_ART[name], pal = PAL[name];
      art.forEach((row, y) => [...row].forEach((ch, x) => px(x * 2, y * 2, pal[ch] || '#ff00ff', 2, 2)));
    }
  }
}
let atlasMatC = null;
export function atlasMat() {
  if (atlasMatC) return atlasMatC;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  CELLS.forEach((n, k) => { g.save(); g.translate((k % 8) * 16, Math.floor(k / 8) * 16); drawTile(g, n); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  atlasMatC = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22 });
  return atlasMatC;
}
// unit plane facing +Z showing one atlas cell
export function tileGeo(name) {
  return geo('tile' + name, () => {
    const k = CELLS.indexOf(name), g = new THREE.PlaneGeometry(1, 1);
    const u0 = (k % 8) / 8, v0 = 1 - (Math.floor(k / 8) + 1) / 4, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (0.004 + uv.getX(i) * 0.992) / 8, v0 + (0.004 + uv.getY(i) * 0.992) / 4);
    return g;
  });
}

// ---- local frame over a BrickBuilder -------------------------------------------------------------
export class Loc {
  constructor(b, m = new THREE.Matrix4()) { this.b = b; this.m = m.clone(); }
  static at(b, x, y, z, yaw = 0, s = 1) { return new Loc(b, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, s, s))); }
  put(g, mat, x, y, z, rx, ry, rz, sx, sy, sz) { M2.multiplyMatrices(this.m, compose(x, y, z, rx, ry, rz, sx, sy, sz)); this.b.addMatrix(g, mat, M2); }
  // box standing on y, centred in x/z
  box(x, y, z, sx, sy, sz, col, o = {}) { this.put(BOX(), o.mat || plastic(col, o.matOpts), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, sx, sy, sz); return y + sy; }
  // printed tile (centre x, y, z), facing +Z turned by ry
  tile(name, x, y, z, w, h, ry = 0) { this.put(tileGeo(name), atlasMat(), x, y, z, 0, ry, 0, w, h, 1); }
  // a block with a printed tile on every side face
  printed(name, x, y, z, s, col, top = null) {
    this.box(x, y, z, s, s, s, col);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; this.tile(name, x + Math.sin(a) * (s / 2 + 0.02), y + s / 2, z + Math.cos(a) * (s / 2 + 0.02), s, s, a); }
    if (top) this.put(tileGeo(top), atlasMat(), x, y + s + 0.02, z, -Math.PI / 2, 0, 0, s, s, 1);
  }
  // studs on top of a block face (n x n)
  studs(x, y, z, w, d, n, col) {
    const p = w / n;
    this.put(brickGeometry(n, Math.max(1, Math.round(d / p)), 1, p, true, 8), plastic(col), x, y - 0.4 * p, z, 0, 0, 0, 1, 1, 1);
  }
}

// ---- mob specs: parts { n, p: pivot, d(L) } (u = one Minecraft pixel) ------------------------------
function biped(u, o) {
  const skin = o.skin, shirt = o.shirt, pants = o.pants, arm = o.arm ?? skin, sleeve = o.sleeve ?? shirt, limb = o.limb ?? 4;
  const parts = [
    ...[-1, 1].map((sd) => ({ n: sd < 0 ? 'legL' : 'legR', p: [sd * 2 * u, 12 * u, 0], d: (L) => { L.box(0, -12 * u, 0, limb * u, 12 * u, limb * u, pants); if (o.shoes) L.box(0, -12 * u, 0, limb * u + 0.04, 2 * u, limb * u + 0.04, o.shoes); } })),
    { n: 'body', p: [0, 12 * u, 0], d: (L) => { L.box(0, 0, 0, 8 * u, 12 * u, (o.thin ? 2 : 4) * u, shirt); if (o.belt) L.box(0, 0, 0, 8 * u + 0.04, 2 * u, 4 * u + 0.04, o.belt); if (o.ribs) for (let k = 0; k < 3; k++) L.box(0, (4 + k * 3) * u, 0, 8 * u + 0.04, 1 * u, 2 * u + 0.04, o.ribs); } },
    ...[-1, 1].map((sd) => ({ n: sd < 0 ? 'armL' : 'armR', p: [sd * (4 + limb / 2) * u, 22 * u, 0], d: (L) => { L.box(0, -10 * u, 0, limb * u, 12 * u, limb * u, arm); if (sleeve !== arm) L.box(0, -2 * u, 0, limb * u + 0.04, 4 * u, limb * u + 0.04, sleeve); o.hand?.(L, sd); } })),
    { n: 'head', p: [0, 24 * u, 0], d: (L) => { L.box(0, 0, 0, 8 * u, 8 * u, 8 * u, o.headCol ?? skin); L.tile(o.face, 0, 4 * u, 4 * u + 0.02, 8 * u, 8 * u); if (o.hair) { L.box(0, 6.5 * u, -0.5 * u, 8 * u + 0.06, 1.6 * u, 7.2 * u, o.hair); L.box(0, 1 * u, -4 * u + 0.4 * u, 8 * u + 0.06, 6 * u, 0.9 * u, o.hair); } o.hat?.(L); } },
  ];
  return parts;
}
const SPECS = {
  steve: (u) => biped(u, { face: 'steve', skin: 0xc69c78, shirt: 0x00a8a8, pants: 0x3a3a9a, shoes: 0x5a5a5a, hair: 0x3a2814 }),
  alex: (u) => biped(u, { face: 'alex', skin: 0xf0c8a0, shirt: 0x6aa04a, pants: 0x6a4a2a, shoes: 0x4a3a2a, hair: 0xd8781a, limb: 3 }),
  zombie: (u) => biped(u, { face: 'zombie', skin: 0x4a8a5a, shirt: 0x00a8a8, pants: 0x3a3a9a, shoes: 0x4a4a4a }),
  husk: (u) => biped(u, { face: 'husk', skin: 0xb8a070, shirt: 0x7a6a48, pants: 0x5a4a38 }),
  skeleton: (u) => biped(u, { face: 'skeleton', skin: 0xcfcfcf, shirt: 0x9a9a9a, ribs: 0xe0e0e0, pants: 0xcfcfcf, limb: 2, thin: true, hand: (L, sd) => { if (sd > 0) { L.box(0, -11 * u, 1.5 * u, 0.6 * u, 14 * u, 1 * u, 0x6b5233); L.box(0, -11 * u, 0.4 * u, 0.2 * u, 14 * u, 0.2 * u, 0xe8e8e8); } } }),
  wither: (u) => biped(u, { face: 'wither', skin: 0x3a3a3a, shirt: 0x2a2a2a, ribs: 0x4a4a4a, pants: 0x3a3a3a, limb: 2, thin: true, hand: (L, sd) => { if (sd > 0) { L.box(0, -13 * u, 2.5 * u, 1 * u, 12 * u, 1 * u, 0x8a8a8a); L.box(0, -12 * u, 2.5 * u, 4 * u, 1 * u, 1 * u, 0x6b5233); } } }),
  piglin: (u) => biped(u, { face: 'piglin', skin: 0xe8a0a0, shirt: 0x8a6a3a, pants: 0x6a4a2a, belt: 0xf2cd37, hat: (L) => { L.box(0, 3 * u, 4.5 * u, 4 * u, 3 * u, 1.5 * u, 0xd07878); for (const sd of [-1, 1]) L.box(sd * 4.6 * u, 5 * u, 0, 1 * u, 3 * u, 2 * u, 0xe8a0a0); }, hand: (L, sd) => { if (sd > 0) L.box(0, -16 * u, 2 * u, 1 * u, 10 * u, 1.4 * u, 0xf2cd37, { matOpts: { metal: 0.6, rough: 0.3 } }); } }),
  villager: (u, robe = 0x7a4a2a, trim = null) => [
    { n: 'body', p: [0, 0, 0], d: (L) => { L.box(0, 0, 0, 8 * u, 24 * u, 6 * u, robe); if (trim) L.box(0, 4 * u, 3 * u, 6 * u, 16 * u, 0.4 * u, trim); L.box(0, 15 * u, 3 * u + 2 * u, 8 * u, 4 * u, 4 * u, robe); for (const sd of [-1, 1]) L.box(sd * 5 * u, 14 * u, 2 * u, 2 * u, 8 * u, 6 * u, robe); L.box(0, 15 * u, 5.3 * u, 4.2 * u, 3.6 * u, 3.6 * u, 0xb8805a); } },
    { n: 'head', p: [0, 24 * u, 0], d: (L) => { L.box(0, 0, 0, 8 * u, 10 * u, 8 * u, 0xb8805a); L.tile('villager', 0, 4 * u, 4 * u + 0.02, 8 * u, 8 * u); L.box(0, 1.5 * u, 4 * u, 2 * u, 4 * u, 2 * u, 0x9a6a48); } },
  ],
  golem: (u) => [
    ...[-1, 1].map((sd) => ({ n: sd < 0 ? 'legL' : 'legR', p: [sd * 4 * u, 14 * u, 0], d: (L) => L.box(0, -14 * u, 0, 6 * u, 14 * u, 5 * u, 0xc8c0b0) })),
    { n: 'body', p: [0, 14 * u, 0], d: (L) => { L.box(0, 0, 0, 10 * u, 6 * u, 6 * u, 0xb8b0a0); L.box(0, 6 * u, 0, 18 * u, 12 * u, 11 * u, 0xc8c0b0); for (const [x, y] of [[-6, 10], [3, 15], [7, 8]]) L.box(x * u, y * u, 5.6 * u, 2 * u, 5 * u, 0.4 * u, 0x4a8a2a); } },
    ...[-1, 1].map((sd) => ({ n: sd < 0 ? 'armL' : 'armR', p: [sd * 11 * u, 30 * u, 0], d: (L) => { L.box(0, -28 * u, 0, 4 * u, 30 * u, 6 * u, 0xc8c0b0); if (sd < 0) L.box(0, -28 * u, 3.4 * u, 2 * u, 2 * u, 2 * u, 0xd02020); } })),
    { n: 'head', p: [0, 31 * u, 2 * u], d: (L) => { L.box(0, 0, 0, 8 * u, 10 * u, 8 * u, 0xc8c0b0); L.tile('golem', 0, 5 * u, 4 * u + 0.02, 8 * u, 8 * u); L.box(0, 1.5 * u, 4 * u, 2 * u, 4 * u, 2 * u, 0xb0a898); } },
  ],
  enderman: (u, carry = null) => [
    ...[-1, 1].map((sd) => ({ n: sd < 0 ? 'legL' : 'legR', p: [sd * 2 * u, 30 * u, 0], d: (L) => L.box(0, -30 * u, 0, 2 * u, 30 * u, 2 * u, 0x141414) })),
    { n: 'body', p: [0, 30 * u, 0], d: (L) => L.box(0, 0, 0, 8 * u, 12 * u, 4 * u, 0x141414) },
    ...[-1, 1].map((sd) => ({ n: sd < 0 ? 'armL' : 'armR', p: [sd * 5 * u, 41 * u, 0], d: (L) => L.box(0, -28 * u, 0, 2 * u, 29 * u, 2 * u, 0x141414) })),
    { n: 'head', p: [0, 42 * u, 0], d: (L) => { L.box(0, 0, 0, 8 * u, 8 * u, 8 * u, 0x141414); L.tile('enderman', 0, 4 * u, 4 * u + 0.02, 8 * u, 8 * u); } },
    ...(carry ? [{ n: 'block', p: [0, 22 * u, 14 * u], d: (L) => { L.box(0, -4 * u, 0, 9 * u, 6 * u, 9 * u, carry[0]); L.box(0, 2 * u, 0, 9.2 * u, 3 * u, 9.2 * u, carry[1]); } }] : []),
  ],
  creeper: (u) => [
    ...[-1, 1].map((sd) => ({ n: sd < 0 ? 'feetF' : 'feetB', p: [0, 6 * u, sd * -2 * u], d: (L) => { for (const x of [-2, 2]) L.box(x * u, -6 * u, sd * -2 * u, 4 * u, 6 * u, 4 * u, 0x4a9a3a); } })),
    { n: 'body', p: [0, 6 * u, 0], d: (L) => { L.box(0, 0, 0, 8 * u, 12 * u, 4 * u, 0x5da84a); for (const [x, y] of [[-2, 3], [2, 8], [-1, 10], [3, 2]]) L.box(x * u, y * u, 2 * u, 2 * u, 2 * u, 0.3 * u, 0x82d066); } },
    { n: 'head', p: [0, 18 * u, 0], d: (L) => { L.box(0, 0, 0, 8 * u, 8 * u, 8 * u, 0x5da84a); L.tile('creeper', 0, 4 * u, 4 * u + 0.02, 8 * u, 8 * u); for (const [x, z] of [[-2, -1], [1, 2]]) L.box(x * u, 8 * u, z * u, 2 * u, 0.3 * u, 2 * u, 0x82d066); } },
  ],
  pig: (u) => [
    ...[[-3, 5], [3, 5], [-3, -5], [3, -5]].map(([x, z], k) => ({ n: 'leg' + k, p: [x * u, 6 * u, z * u], d: (L) => L.box(0, -6 * u, 0, 4 * u, 6 * u, 4 * u, 0xe89090) })),
    { n: 'body', p: [0, 6 * u, 0], d: (L) => L.box(0, 0, -1 * u, 10 * u, 8 * u, 16 * u, 0xf0a0a0) },
    { n: 'head', p: [0, 9 * u, 7 * u], d: (L) => { L.box(0, -3 * u, 4 * u, 8 * u, 8 * u, 8 * u, 0xf0a0a0); L.tile('pig', 0, 1 * u, 8 * u + 0.02, 8 * u, 8 * u); L.box(0, -2 * u, 8 * u, 4 * u, 3 * u, 1 * u, 0xe07878); } },
  ],
  cow: (u) => [
    ...[[-4, 6], [4, 6], [-4, -6], [4, -6]].map(([x, z], k) => ({ n: 'leg' + k, p: [x * u, 12 * u, z * u], d: (L) => { L.box(0, -12 * u, 0, 4 * u, 12 * u, 4 * u, 0x4a3424); L.box(0, -12 * u, 0, 4.1 * u, 3 * u, 4.1 * u, 0xd8d8d8); } })),
    { n: 'body', p: [0, 12 * u, 0], d: (L) => { L.box(0, 0, 0, 12 * u, 10 * u, 18 * u, 0x4a3424); for (const [x, y, z] of [[6, 3, 2], [-6, 5, -4], [6, 6, -6]]) L.box(x * u, y * u, z * u, 0.4 * u, 4 * u, 5 * u, 0xe8e8e8); L.box(0, 8 * u, -3 * u, 4 * u, 2.2 * u, 6 * u, 0xe8e8e8); L.box(0, -1 * u, -5 * u, 4 * u, 1.4 * u, 4 * u, 0xf0a0a0); } },
    { n: 'head', p: [0, 18 * u, 9 * u], d: (L) => { L.box(0, -4 * u, 3 * u, 8 * u, 8 * u, 6 * u, 0x4a3424); L.tile('cow', 0, 0, 6 * u + 0.02, 8 * u, 8 * u); for (const sd of [-1, 1]) L.box(sd * 5 * u, 2 * u, 3 * u, 2 * u, 3 * u, 1 * u, 0xd8d0b8); } },
  ],
  sheep: (u, wool = 0xeeeeee) => [
    ...[[-3, 5], [3, 5], [-3, -5], [3, -5]].map(([x, z], k) => ({ n: 'leg' + k, p: [x * u, 12 * u, z * u], d: (L) => { L.box(0, -12 * u, 0, 4 * u, 12 * u, 4 * u, 0xd8c0a8); L.box(0, -6 * u, 0, 4.6 * u, 6 * u, 4.6 * u, wool); } })),
    { n: 'body', p: [0, 11 * u, 0], d: (L) => { L.box(0, 0, 0, 12 * u, 11 * u, 18 * u, wool); L.studs(0, 11 * u, 0, 12 * u, 18 * u, 3, wool); } },
    { n: 'head', p: [0, 17 * u, 9 * u], d: (L) => { L.box(0, -3 * u, 3 * u, 6 * u, 6 * u, 7 * u, 0xd8c0a8); L.box(0, 1 * u, 2 * u, 7 * u, 3 * u, 6 * u, wool); L.tile('sheep', 0, 0, 6.5 * u + 0.02, 6 * u, 6 * u); } },
  ],
  chicken: (u) => [
    ...[-1, 1].map((sd) => ({ n: sd < 0 ? 'legL' : 'legR', p: [sd * 1.5 * u, 5 * u, 0], d: (L) => { L.box(0, -5 * u, 0, 1 * u, 5 * u, 1 * u, 0xf0b020); L.box(0, -5 * u, 1 * u, 3 * u, 0.6 * u, 3 * u, 0xf0b020); } })),
    { n: 'body', p: [0, 5 * u, 0], d: (L) => { L.box(0, 0, 0, 6 * u, 6 * u, 8 * u, 0xf8f8f8); for (const sd of [-1, 1]) L.box(sd * 3.5 * u, 1 * u, 0, 1 * u, 4 * u, 6 * u, 0xe8e8e8); } },
    { n: 'head', p: [0, 9 * u, 4 * u], d: (L) => { L.box(0, 0, 0, 4 * u, 6 * u, 3 * u, 0xf8f8f8); L.tile('chicken', 0, 3 * u, 1.5 * u + 0.02, 4 * u, 6 * u); L.box(0, 2.5 * u, 2.5 * u, 4 * u, 2 * u, 2 * u, 0xf0b020); L.box(0, 1 * u, 2 * u, 2 * u, 2 * u, 1 * u, 0xd02020); } },
  ],
  ghast: (u) => [
    { n: 'body', p: [0, 0, 0], d: (L) => { L.box(0, 0, 0, 16 * u, 16 * u, 16 * u, 0xf0f0f0); L.studs(0, 16 * u, 0, 16 * u, 16 * u, 4, 0xf0f0f0); for (const [x, y, z] of [[-8, 9, 3], [8, 4, -2], [3, 12, -8]]) L.box(x * u, y * u, z * u, 0.4 * u, 2 * u, 3 * u, 0xd0d0d0); } },
    { n: 'face', p: [0, 0, 0], d: (L) => L.tile('ghast', 0, 8 * u, 8 * u + 0.03, 16 * u, 16 * u) },
    { n: 'angry', p: [0, 0, 0], d: (L) => L.tile('ghastA', 0, 8 * u, 8 * u + 0.03, 16 * u, 16 * u) },
    ...[...Array(9)].map((_, k) => ({ n: 'tent' + k, p: [((k % 3) - 1) * 5 * u, 0, (Math.floor(k / 3) - 1) * 5 * u], d: (L) => L.box(0, -(9 + (k * 7) % 5) * u, 0, 2 * u, (9 + (k * 7) % 5) * u, 2 * u, 0xe8e8e8) })),
  ],
  blaze: (u) => [
    { n: 'head', p: [0, 0, 0], d: (L) => { L.box(0, 0, 0, 8 * u, 8 * u, 8 * u, 0xf0c020, { matOpts: { emissive: 0xc07000, emissiveIntensity: 0.5 } }); L.tile('blaze', 0, 4 * u, 4 * u + 0.02, 8 * u, 8 * u); } },
    { n: 'rods', p: [0, 0, 0], d: (L) => { for (let k = 0; k < 12; k++) { const a = k / 4 * Math.PI * 2 + Math.floor(k / 4) * 0.5, r = (10 - Math.floor(k / 4) * 2) * u; L.box(Math.cos(a) * r, (-4 - Math.floor(k / 4) * 9) * u, Math.sin(a) * r, 2 * u, 8 * u, 2 * u, 0xf0a020, { matOpts: { emissive: 0xe07010, emissiveIntensity: 1.2 } }); } } },
  ],
};

// stamp a mob into a static builder at (x, y, z) facing yaw; pose: { part: [rx, ry, rz] }
export function mobStatic(b, kind, s, x, y, z, yaw = 0, pose = {}, ...args) {
  const u = s / 8, base = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
  for (const pt of SPECS[kind](u, ...args)) {
    const r = pose[pt.n] || [0, 0, 0];
    const m = new THREE.Matrix4().multiplyMatrices(base, compose(pt.p[0], pt.p[1], pt.p[2], r[0], r[1], r[2], 1, 1, 1));
    pt.d(new Loc(b, m));
  }
}
// animated rig: { root, <part>: Group, ... }
export function mob(kind, s, ...args) {
  const u = s / 8, root = new THREE.Group(), rig = { root };
  for (const pt of SPECS[kind](u, ...args)) {
    const b = new BrickBuilder(1); pt.d(new Loc(b));
    const g = b.build({ name: kind + '-' + pt.n }); const pv = new THREE.Group(); pv.position.set(...pt.p); pv.add(g); root.add(pv); rig[pt.n] = pv;
  }
  return rig;
}
// simple walk cycle for any rig
export function walk(rig, t, amp = 0.6) {
  const a = Math.sin(t) * amp;
  if (rig.legL) { rig.legL.rotation.x = a; rig.legR.rotation.x = -a; }
  if (rig.armL && !rig.armsFixed) { rig.armL.rotation.x = -a * 0.8; rig.armR.rotation.x = a * 0.8; }
  if (rig.leg0) { rig.leg0.rotation.x = a; rig.leg3.rotation.x = a; rig.leg1.rotation.x = -a; rig.leg2.rotation.x = -a; }
  if (rig.feetF) { rig.feetF.rotation.x = a; rig.feetB.rotation.x = -a; }
}

// ---- blocks & trees (into a static builder) ----------------------------------------------------------
// grass block: dirt with a studded grass cap
export function grassBlock(b, x, y, z, s, top = MC.grass, side = MC.dirt, studs = false) {
  b.box(x, y, z, s, s * 0.78, s, side);
  b.box(x, y + s * 0.78, z, s + 0.04, s * 0.22, s + 0.04, top);
  if (studs) Loc.at(b, x, y + s, z).studs(0, 0, 0, s, s, 2, top);
  return y + s;
}
// ore block: stone with coloured flecks on its sides
export function oreBlock(b, x, y, z, s, ore, rot = 0) {
  b.box(x, y, z, s, s, s, MC.stone, { rot });
  const L = Loc.at(b, x, y, z, rot);
  for (const [fx, fy, a] of [[-0.22, 0.25, 0], [0.2, 0.62, 0], [0.05, 0.4, Math.PI / 2], [-0.25, 0.7, Math.PI], [0.25, 0.3, -Math.PI / 2]]) {
    L.box(Math.sin(a) * s / 2 + Math.cos(a) * fx * s, fy * s, Math.cos(a) * s / 2 - Math.sin(a) * fx * s, s * 0.2, s * 0.16, s * 0.2, ore, { matOpts: ore === MC.diamond || ore === MC.redstone || ore === MC.emerald ? { emissive: ore, emissiveIntensity: 0.6 } : undefined });
  }
}
export function oak(b, x, y, z, B, r, leaf = MC.leaves) {
  const h = 4 + Math.floor(r() * 3);
  b.box(x, y, z, B, h * B, B, MC.log);
  b.box(x, y + h * B - 2 * B, z, 5 * B, 2 * B, 5 * B, leaf);
  b.box(x, y + h * B, z, 3 * B, B, 3 * B, leaf);
  b.box(x, y + (h + 1) * B, z, B, B, 3 * B, leaf); b.box(x, y + (h + 1) * B, z, 3 * B, B, B, leaf);
  for (let k = 0; k < 3; k++) { const a = Math.floor(r() * 4) * Math.PI / 2; b.box(x + Math.round(Math.cos(a)) * 2 * B, y + h * B - 3 * B, z + Math.round(Math.sin(a)) * 2 * B, B, B, B, MC.leaves2); }
  Loc.at(b, x, y + (h + 2) * B, z).studs(0, 0, 0, B, B, 2, leaf);
}
export function birch(b, x, y, z, B, r) {
  const h = 5 + Math.floor(r() * 3);
  b.box(x, y, z, B, h * B, B, MC.birch);
  for (let k = 0; k < h; k++) { const a = Math.floor(r() * 4) * Math.PI / 2; b.box(x + Math.cos(a) * B * 0.5, y + (k + 0.3) * B, z + Math.sin(a) * B * 0.5, B * 0.4 + Math.abs(Math.sin(a)) * 0.1, B * 0.18, B * 0.4 + Math.abs(Math.cos(a)) * 0.1, 0x2a2a2a); }
  b.box(x, y + h * B - 2 * B, z, 5 * B, 2 * B, 5 * B, MC.birchLeaf);
  b.box(x, y + h * B, z, 3 * B, B, 3 * B, MC.birchLeaf);
  b.box(x, y + (h + 1) * B, z, B, B, 3 * B, MC.birchLeaf); b.box(x, y + (h + 1) * B, z, 3 * B, B, B, MC.birchLeaf);
}
export function spruce(b, x, y, z, B, r, snow = false) {
  const h = 6 + Math.floor(r() * 4);
  b.box(x, y, z, B, h * B, B, MC.log2);
  for (let k = 2; k < h; k++) {
    const w = (k % 2 === 0 ? Math.max(3, 7 - Math.floor(k / 2) * 2 + 2) : Math.max(1, 5 - Math.floor(k / 2) * 2 + 2)) - (k > h - 3 ? 2 : 0);
    b.box(x, y + k * B, z, Math.min(5, Math.max(1, w)) * B, B, Math.min(5, Math.max(1, w)) * B, 0x2e5a34);
    if (snow && k % 2 === 0) b.box(x, y + (k + 1) * B - 0.2, z, Math.max(1, w) * B * 0.8, 0.3, Math.max(1, w) * B * 0.8, MC.snow);
  }
  b.box(x, y + h * B, z, B, B, B, 0x2e5a34);
  if (snow) b.box(x, y + (h + 1) * B, z, B + 0.1, 0.4, B + 0.1, MC.snow);
}
export function cactus(b, x, y, z, B, r) {
  const h = 2 + Math.floor(r() * 2);
  b.box(x, y, z, B * 0.9, h * B, B * 0.9, MC.cactus);
  for (const a of [0, Math.PI / 2]) for (let k = 0; k < h * 2; k++) b.box(x, y + k * B / 2 + 0.3, z, a ? B * 0.94 : 0.2, 0.2, a ? 0.2 : B * 0.94, MC.cactus2);
  Loc.at(b, x, y + h * B, z).studs(0, 0, 0, B * 0.9, B * 0.9, 2, MC.cactus);
}
export function flower(b, x, z, col, s = 1) {
  b.box(x, 0, z, 0.2 * s, 1.0 * s, 0.2 * s, 0x3a7a2a);
  b.box(x, 1.0 * s, z, 0.6 * s, 0.6 * s, 0.6 * s, col);
}
export function tallGrass(b, x, z, s = 1) { for (let k = 0; k < 3; k++) b.box(x + (k - 1) * 0.4 * s, 0, z + ((k * 7) % 3 - 1) * 0.3 * s, 0.25 * s, (0.8 + (k % 2) * 0.6) * s, 0.25 * s, k % 2 ? MC.grass : MC.grass2); }
export function torch(b, x, y, z, s = 1, mat = null) {
  b.box(x, y, z, 0.3 * s, 1.2 * s, 0.3 * s, MC.log);
  b.box(x, y + 1.2 * s, z, 0.42 * s, 0.42 * s, 0.42 * s, 0, { mat: mat || plastic(0xffd040, { emissive: 0xffa020, emissiveIntensity: 2.4 }) });
}
// TNT block (static)
export function tntBlock(b, x, y, z, s, rot = 0) { Loc.at(b, x, y, z, rot).printed('tnt', 0, 0, 0, s, MC.tnt, 'tntTop'); }

// ---- vehicles / animated props -----------------------------------------------------------------------
export function minecart(s = 1, cargo = null) {
  const b = new BrickBuilder(1), L = new Loc(b), iron = plastic(0x8a8e94, { metal: 0.6, rough: 0.35 });
  L.box(0, 0.5 * s, 0, 2.6 * s, 0.3 * s, 3.4 * s, 0, { mat: iron });
  for (const sd of [-1, 1]) { L.box(sd * 1.2 * s, 0.5 * s, 0, 0.25 * s, 1.5 * s, 3.4 * s, 0, { mat: iron }); L.box(0, 0.5 * s, sd * 1.6 * s, 2.6 * s, 1.5 * s, 0.25 * s, 0, { mat: iron }); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.box(sx * 1.0 * s, 0, sz * 1.0 * s, 0.4 * s, 0.6 * s, 0.6 * s, 0x2a2a2a);
  if (cargo === 'chest') L.printed('chest', 0, 0.8 * s, 0, 2 * s, 0x9a6a2a);
  if (cargo === 'tnt') L.printed('tnt', 0, 0.8 * s, 0, 2 * s, MC.tnt, 'tntTop');
  if (cargo === 'furnace') L.printed('furnace', 0, 0.8 * s, 0, 2 * s, MC.cobble);
  return b.build({ name: 'minecart' });
}
// nether / end portal sheet: animated swirl texture
let portalMatC = null;
export function portalMat() {
  if (portalMatC) return portalMatC;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const v = Math.sin(x * 0.6 + Math.sin(y * 0.4) * 2) + Math.cos(y * 0.5 - x * 0.2); g.fillStyle = v > 0.8 ? '#e0a0ff' : v > 0 ? '#a040f0' : v > -0.8 ? '#7a20d0' : '#5010a0'; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  portalMatC = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
  return portalMatC;
}
// glow sprite
let glowT = null;
export function glow(color, size, opacity = 0.8) {
  if (!glowT) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowT = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); return s;
}
export const neon = (c, k = 2) => plastic(c, { emissive: c, emissiveIntensity: k });
void C;
