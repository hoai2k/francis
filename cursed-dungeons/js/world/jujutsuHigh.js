// Jujutsu High (Tokyo Prefectural Jujutsu High School): the hub. A hilltop
// campus in the mountains west of Tokyo at dusk. Long stone stairs climb from
// the road to a great vermilion torii; behind it a paved courtyard leads to
// the main hall with its huge tiled roof. West: the dormitory with the
// vending machines. East: the training ground (dummy, talisman, sparring
// students) and the koi pond with Gojo's bench. North-west: the shrine (the
// technique tree) and Principal Yaga's office full of cursed dolls. Cedar
// forest on the ridges all round, sakura and stone lanterns everywhere.
//
// Returns the same shape as buildTestRoom() plus named spots (L.spots),
// NPC posts (L.npcs), the roaming-curse zones (L.roam / L.core), the title
// camera (L.titleCam) and the dusk sun (L.sunOffset).
//
// Axes: +x east, +z south. The camera looks from the south-east, so the far
// (top of screen) side is the north-west: ridges and the big roofs.
//
// Static props (lanterns, torii, sakura canopies, fences, benches…) are built
// from boxes merged into ONE vertex-coloured mesh (one draw call) with
// per-vertex glow and wind sway, instead of one mesh per box.
import * as THREE from 'three/webgpu';
import { attribute, vec3, sin, positionLocal, max } from 'three/tsl';
import { World } from './voxel.js';
import { B } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { BIOMES } from './biomes.js';
import { U, ditherMask, occlusionAmount } from '../gfx/materials.js';
import { mulberry32 } from '../util.js';

export const FY = 14;                      // campus ground height
const SX = 128, SY = 50, SZ = 136;

// Dusk at Jujutsu High: violet sky, a warm orange horizon, long golden light.
export const HUB_BIOME = {
  ...BIOMES.jujutsu_high,
  name: 'Jujutsu High', sub: 'Tokyo Prefectural · Dusk',
  skyTop: 0x34407e, skyHorizon: 0xf4a46c, fog: 0xc6a088, fogDensity: 0.0074,
  hemiSky: 0xc4cae8, hemiGround: 0x5a4430, hemiI: 1.0, sun: 0xffc080, sunI: 2.4,
  grade: { tint: [1.04, 1.0, 0.95], lift: [0.004, 0.006, 0.02], sat: 1.06, contrast: 1.07, vignette: 0.26 },
  ambience: 'forest', music: 'hub', particles: 'fireflies', wind: 0.8,
};

// ---------------------------------------------------------------- merged props
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const FACES = [
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

let PROP_MAT = null;
// One material for every hub prop: vertex colour, per-vertex glow and sway,
// and the camera-occlusion dither so props never hide a player.
export function hubPropMaterial() {
  if (PROP_MAT) return PROP_MAT;
  const m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.78 });
  const col = attribute('color', 'vec3'), emit = attribute('emit', 'float'), sway = attribute('sway', 'float');
  m.colorNode = col;
  m.emissiveNode = col.mul(emit);
  const ph = positionLocal.x.mul(0.45).add(positionLocal.z.mul(0.35));
  const s = sin(U.time.mul(1.4).add(ph)).mul(0.07).add(sin(U.time.mul(3.3).add(ph.mul(1.7))).mul(0.025));
  m.positionNode = positionLocal.add(vec3(s, s.mul(0.25), s.mul(0.6)).mul(sway).mul(U.wind));
  m.maskNode = ditherMask(occlusionAmount());
  PROP_MAT = m;
  return m;
}

export class Props {
  constructor(seed = 7) { this.P = []; this.N = []; this.C = []; this.E = []; this.S = []; this.I = []; this.n = 0; this.r = mulberry32(seed); }
  // Box standing on (x, y, z): base at y, centred on x/z. o: { ry, rx, rz, emit, sway, vary, center }
  box(x, y, z, w, h, d, color, o = {}) {
    _c.set(color);
    const vary = o.vary ?? 0.05, k = 1 + (this.r() - 0.5) * 2 * vary;
    const cr = _c.r * k, cg = _c.g * k, cb = _c.b * k;
    _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'YXZ'); _q.setFromEuler(_e);
    _m.compose(_p.set(x, o.center ? y : y + h / 2, z), _q, _s.set(w, h, d));
    const em = o.emit ?? 0, sw = o.sway ?? 0;
    for (const [n, u, v] of FACES) {
      const base = this.n;
      _v.set(n[0], n[1], n[2]).applyQuaternion(_q);
      for (const [su, sv] of CORNERS) {
        const lx = n[0] * 0.5 + u[0] * su * 0.5 + v[0] * sv * 0.5, ly = n[1] * 0.5 + u[1] * su * 0.5 + v[1] * sv * 0.5, lz = n[2] * 0.5 + u[2] * su * 0.5 + v[2] * sv * 0.5;
        _p.set(lx, ly, lz).applyMatrix4(_m);
        this.P.push(_p.x, _p.y, _p.z); this.N.push(_v.x, _v.y, _v.z); this.C.push(cr, cg, cb); this.E.push(em);
        this.S.push(sw * Math.max(0, ly + 0.5));
        this.n++;
      }
      this.I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  build() {
    if (!this.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('emit', new THREE.Float32BufferAttribute(this.E, 1));
    g.setAttribute('sway', new THREE.Float32BufferAttribute(this.S, 1));
    g.setIndex(new THREE.Uint32BufferAttribute(this.I, 1));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, hubPropMaterial());
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'hub-props';
    return mesh;
  }
}

// Decorations that also add the merged hub props and the distant mountains.
class HubDeco extends Decorations {
  constructor() { super(); this.hub = new Props(99); this.backdrop = null; }
  build(world, materials, density) {
    super.build(world, materials, density);
    // the big roofs also dither away where they hide a player (not only when someone walks inside)
    for (const r of world.roofs) {
      const m = r.material; if (!m || m.userData.hubDither || !m.userData.fade) continue;
      m.maskNode = ditherMask(max(m.userData.fade.div(0.88), occlusionAmount()));
      m.userData.hubDither = true; m.needsUpdate = true;
    }
    const m = this.hub.build(); if (m) world.group.add(m);
    if (this.backdrop) world.group.add(this.backdrop());
  }
}

// ---------------------------------------------------------------- palette
const C = {
  stone: 0x8e8c88, stoneD: 0x6e6c6a, red: 0xd0391e, redD: 0x9e2414, black: 0x1a1412, wood: 0x7a5434, woodD: 0x4a3020, woodL: 0xa47a4a,
  paper: 0xf2e8d0, glow: 0xffd89a, lanternRed: 0xe0441e, gold: 0xe8b84a, rope: 0xcdb27a, white: 0xf4f0e6,
  sakura: [0xf7bccb, 0xf2a3ba, 0xfbcfda, 0xec93ad, 0xf9b2c4], leaf: 0x3e6a34, water: 0x2a4a6a,
};

const noise = (x, z) => Math.sin(x * 0.31 + z * 0.17) * 0.6 + Math.sin(x * 0.13 - z * 0.29 + 1.7) * 0.9 + Math.sin(x * 0.57 + z * 0.41 + 3.1) * 0.35;
const STX0 = 60, STX1 = 68;               // the long stairs (balustrades on x = 60 and 68)
const stairTop = (z) => FY - Math.min(11, Math.floor((z - 96) / 2));

// Ground height (first free cell) of the natural terrain.
function terrainHeight(x, z) {
  let h = FY;
  if (z < 16) h = Math.max(h, FY + Math.max(0, Math.round((16 - z) * 0.72 + noise(x, z) * 1.1)));
  if (x < 12) h = Math.max(h, FY + Math.max(0, Math.round((12 - x) * 0.62 + noise(z, x) * 1.1)));
  if (x > 118) h = Math.max(h, FY + Math.max(0, Math.round((x - 118) * 0.55 + noise(x + 9, z) * 0.8)));
  if (z > 97) {
    const d = z - 97;
    const near = Math.abs(x - 64) < 13;   // banks beside the stairs fall slower: the stairs cut into the hill
    const drop = Math.min(11, Math.round(d * (near ? 0.4 : 0.47) + Math.max(0, noise(x, z)) * 0.7));
    h = Math.min(h, FY - drop);
    if (z >= 119 && Math.abs(x - 64) <= 11) h = FY - 11;
  }
  return h;
}

// ---------------------------------------------------------------- builder
export function buildJujutsuHigh() {
  const world = new World(SX, SY, SZ);
  const deco = new HubDeco();
  const shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, 2018);
  const W = world, P = deco.hub;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rnd = (a, b) => k.rnd(a, b);
  const top = (x, z) => W.groundBelow(x + 0.5, z + 0.5, SY - 1);
  const isGround = (id) => id === B.grass || id === B.dirt || id === B.moss_floor;

  // ------------------------------------------------------------ terrain
  const H = new Int16Array(SX * SZ);
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) H[z * SX + x] = terrainHeight(x, z);
  // the stairs and their balustrades
  for (let z = 97; z < 119; z++) for (let x = STX0; x <= STX1; x++) H[z * SX + x] = stairTop(z) + (x === STX0 || x === STX1 ? 1 : 0);
  const hAt = (x, z) => H[Math.max(0, Math.min(SZ - 1, z)) * SX + Math.max(0, Math.min(SX - 1, x))];
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const h = hAt(x, z);
    const slope = Math.max(Math.abs(h - hAt(x + 1, z)), Math.abs(h - hAt(x - 1, z)), Math.abs(h - hAt(x, z + 1)), Math.abs(h - hAt(x, z - 1)));
    const stair = z >= 97 && z < 119 && x >= STX0 && x <= STX1;
    const rocky = slope >= 2 && !stair;
    const edge = x < 3 || z < 3 || x > SX - 4 || z > SZ - 4;
    for (let y = edge ? 0 : Math.max(0, h - 7); y < h; y++) {
      let id = y === h - 1 ? (rocky ? (k.chance(0.5) ? B.stone : B.mossy_brick) : B.grass) : y >= h - 3 ? (rocky ? B.stone : B.dirt) : B.stone;
      if (stair) id = (x === STX0 || x === STX1) ? (y === h - 1 ? B.stone_brick : B.stone) : (y === h - 1 ? ((z & 1) ? B.stone_brick : B.cobble) : B.stone);
      W.set(x, y, z, id);
    }
  }
  // outer edges: invisible walls
  for (let i = 0; i < SX; i++) for (const z of [0, SZ - 1]) { const h = hAt(i, z); W.fill(i, h, z, i, Math.min(SY - 1, h + 8), z, B.barrier); }
  for (let i = 0; i < SZ; i++) for (const x of [0, SX - 1]) { const h = hAt(x, i); W.fill(x, h, i, x, Math.min(SY - 1, h + 8), i, B.barrier); }

  // ------------------------------------------------------------ paving helpers
  const setTop = (x, z, id, only = true) => { const y = top(x, z); if (!isFinite(y)) return; if (!only || isGround(W.get(x, y - 1, z))) W.set(x, y - 1, z, id); };
  const rect = (x0, z0, x1, z1, id, alt = null, altP = 0) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, FY - 1, z, alt && k.chance(altP) ? alt : id); };
  const pathLine = (pts, w = 3, id = B.cobble, alt = B.stone_brick) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
      for (let s = 0; s <= n; s++) {
        const px = ax + (bx - ax) * s / n, pz = az + (bz - az) * s / n;
        for (let dz = -w; dz <= w; dz++) for (let dx = -w; dx <= w; dx++) {
          if (Math.hypot(dx, dz) > w / 2) continue;
          setTop(Math.floor(px + dx), Math.floor(pz + dz), k.chance(0.2) ? alt : id);
        }
      }
    }
  };

  // ------------------------------------------------------------ prop helpers
  const toro = (x, y, z, s = 1, light = true) => {   // stone lantern (tōrō)
    P.box(x, y, z, 0.72 * s, 0.22 * s, 0.72 * s, C.stoneD); P.box(x, y + 0.22 * s, z, 0.3 * s, 0.7 * s, 0.3 * s, C.stone);
    P.box(x, y + 0.92 * s, z, 0.64 * s, 0.14 * s, 0.64 * s, C.stone);
    P.box(x, y + 1.06 * s, z, 0.44 * s, 0.4 * s, 0.44 * s, C.glow, { emit: 2.6, vary: 0 });
    P.box(x, y + 1.46 * s, z, 0.86 * s, 0.14 * s, 0.86 * s, C.stoneD); P.box(x, y + 1.6 * s, z, 0.46 * s, 0.16 * s, 0.46 * s, C.stone);
    P.box(x, y + 1.76 * s, z, 0.16 * s, 0.16 * s, 0.16 * s, C.stone);
    if (light) W.addLight(x, y + 1.3 * s, z, 0xffb060, 3.4, 8);
    if (s >= 0.9) W.set(Math.floor(x), y, Math.floor(z), B.barrier);
  };
  const chochin = (x, y, z, col = C.lanternRed, light = true) => {   // hanging paper lantern; y = hook height
    P.box(x, y - 0.35, z, 0.04, 0.35, 0.04, C.black);
    P.box(x, y - 0.42, z, 0.5, 0.08, 0.5, C.black); P.box(x, y - 1.02, z, 0.5, 0.08, 0.5, C.black);
    P.box(x, y - 0.95, z, 0.56, 0.54, 0.56, col, { emit: 1.8, vary: 0, sway: 0.15 });
    if (light) W.addLight(x, y - 0.8, z, 0xff7a3a, 3, 7);
  };
  // torii: posts along x (gate faces ±z) unless along === 'z'
  const torii = (x, y, z, w, h, { along = 'x', thick = 0.55, collide = true } = {}) => {
    const at = (a, yy, b, sx, sy, sz, col, o) => along === 'x' ? P.box(x + a, yy, z + b, sx, sy, sz, col, o) : P.box(x + b, yy, z + a, sz, sy, sx, col, o);
    for (const s of [-1, 1]) {
      at(s * w / 2, y, 0, thick, h, thick, C.red, { vary: 0.02 });
      at(s * w / 2, y, 0, thick + 0.18, 0.45, thick + 0.18, C.black);
      if (collide) for (let yy = y; yy < y + 3; yy++) W.set(Math.floor(along === 'x' ? x + s * w / 2 : x), yy, Math.floor(along === 'x' ? z : z + s * w / 2), B.barrier);
    }
    at(0, y + h - 1.15, 0, w + 1.0, thick * 0.6, thick * 0.75, C.red);                      // nuki
    at(0, y + h - 0.32, 0, w + 1.5, 0.34, thick * 1.05, C.red);                              // shimaki
    at(0, y + h, 0, w + 2.0, 0.34, thick * 1.35, C.black);                                   // kasagi
    for (const s of [-1, 1]) at(s * (w / 2 + 0.95), y + h + 0.12, 0, 0.7, 0.32, thick * 1.4, C.black, { rz: along === 'x' ? -s * 0.18 : 0, rx: along === 'z' ? s * 0.18 : 0 });
    at(0, y + h - 0.85, 0, thick * 0.5, 0.55, thick * 0.5, C.red);                           // gakuzuka
    at(0, y + h - 1.0, 0.0, Math.min(1.1, w * 0.22), 0.9, thick * 0.7, C.black);             // plaque
  };
  const candles = (x, y, z) => { for (let i = 0; i < 3; i++) { const a = i * 2.1, r = 0.16, hh = 0.2 + i * 0.08; P.box(x + Math.cos(a) * r, y, z + Math.sin(a) * r, 0.08, hh, 0.08, 0xefe6cc); P.box(x + Math.cos(a) * r, y + hh, z + Math.sin(a) * r, 0.05, 0.09, 0.05, 0xffb040, { emit: 4, vary: 0 }); } };
  const bench = (x, y, z, ry = 0, len = 1.8) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    P.box(x, y + 0.42, z, len, 0.1, 0.5, C.woodL, { ry });
    P.box(x - s * 0.22, y + 0.52, z - c * 0.22, len, 0.42, 0.08, C.wood, { ry });
    for (const t of [-1, 1]) P.box(x + c * t * (len / 2 - 0.15), y, z - s * t * (len / 2 - 0.15), 0.1, 0.42, 0.44, C.woodD, { ry });
  };
  const fenceLine = (x0, z0, x1, z1, y = FY, col = C.woodD) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2));
    const ry = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) { const t = i / n; P.box(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, 0.16, 1.05, 0.16, col); }
    for (const hh of [0.42, 0.85]) P.box((x0 + x1) / 2, y + hh, (z0 + z1) / 2, 0.08, 0.1, len, C.wood, { ry });
  };
  const flatPetals = (cx, z0c, y, r, n) => { for (let i = 0; i < n; i++) { const a = k.r() * Math.PI * 2, d = Math.sqrt(k.r()) * r; P.box(cx + Math.cos(a) * d, y + 0.01, z0c + Math.sin(a) * d, 0.22, 0.02, 0.22, C.sakura[i % 5], { ry: a, vary: 0.1 }); } };
  // sakura: voxel trunk with branches, pink canopy of swaying boxes
  const sakura = (x, z, y = null, sc = 1) => {
    y = y ?? top(x, z); if (!isFinite(y)) return;
    const h = Math.round(3 + sc * 1.5);
    for (let i = 0; i < h; i++) W.set(x, y + i, z, B.bark_dark);
    const brs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of brs) if (k.chance(0.75)) { W.set(x + dx, y + h - 1, z + dz, B.bark_dark); if (k.chance(0.5)) W.set(x + dx * 2, y + h, z + dz * 2, B.bark_dark); }
    const cx = x + 0.5, cz = z + 0.5, cy = y + h + 0.4;
    const R = 2.7 * sc;
    // a dome of blossom clusters: big soft core, smaller tufts round the rim, a few pale highlights
    P.box(cx, cy + 0.5 * sc, cz, 2.6 * sc, 1.5 * sc, 2.6 * sc, C.sakura[1], { emit: 0.05, sway: 0.3 });
    for (let i = 0; i < Math.round(30 * sc); i++) {
      const a = k.r() * Math.PI * 2, d = (0.35 + 0.65 * Math.sqrt(k.r())) * R, s = rnd(0.6, 1.25) * sc;
      const up = Math.cos((d / R) * 1.3) * 1.5 * sc;
      P.box(cx + Math.cos(a) * d, cy + up + rnd(-0.4, 0.5) * sc - 0.4, cz + Math.sin(a) * d, s, s * 0.8, s, C.sakura[Math.floor(k.r() * 5)], { emit: 0.06, sway: 0.55, ry: k.r() * 1.5, rx: rnd(-0.2, 0.2), vary: 0.07 });
    }
    for (let i = 0; i < Math.round(8 * sc); i++) { const a = k.r() * Math.PI * 2, d = k.r() * R * 0.8; P.box(cx + Math.cos(a) * d, cy + 1.3 * sc + rnd(0, 0.6), cz + Math.sin(a) * d, 0.5 * sc, 0.4 * sc, 0.5 * sc, 0xffe4ec, { emit: 0.12, sway: 0.6, ry: a }); }
    flatPetals(cx, cz, y, R + 1, Math.round(22 * sc));
  };
  // cedar (sugi): tall conical voxel tree for the ridges
  const cedar = (x, z, y, h = 9 + Math.floor(k.r() * 5)) => {
    for (let i = 0; i < h; i++) W.set(x, y + i, z, B.bark_dark);
    const t = y + h;
    for (let dy = -Math.floor(h * 0.7); dy <= 1; dy++) {
      const r = dy >= 0 ? 0 : dy > -3 ? 1 : (dy & 1) ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        if (r === 2 && (Math.abs(dx) === 2 || Math.abs(dz) === 2) && k.chance(0.25)) continue;
        if (!W.get(x + dx, t + dy, z + dz)) W.set(x + dx, t + dy, z + dz, B.leaves);
      }
    }
  };
  const clearAround = (x, z, r = 1) => { const y = top(x, z); for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const yy = top(x + dx, z + dz); if (!isFinite(yy) || Math.abs(yy - y) > 1 || W.get(x + dx, yy, z + dz) || !isGround(W.get(x + dx, yy - 1, z + dz))) return false; } return true; };

  // ------------------------------------------------------------ building helpers
  // A Japanese hall: posts every `bay`, a dark sill and head beam, shoji or
  // plaster between, optional window rows; clears the inside.
  const hall = (x0, z0, x1, z1, y, h, o = {}) => {
    const wall = o.wall ?? B.shoji, post = o.post ?? B.pillar_red, beam = o.beam ?? B.dark_planks, bay = o.bay ?? 3;
    W.fill(x0 + 1, y, z0 + 1, x1 - 1, y + h - 1, z1 - 1, 0);
    if (o.floor !== false) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, y - 1, z, o.floor ?? B.tatami);
    for (let yy = y; yy < y + h; yy++) {
      const lvl = yy - y;
      const pick = (t, len) => {
        if (t % bay === 0 || t === len) return post;
        if (lvl === h - 1 || (o.band && o.band.includes(lvl))) return beam;
        if (lvl === 0) return o.sill ?? beam;
        if (o.win && o.win.includes(lvl) && (t % bay) === Math.floor(bay / 2)) return o.winId ?? B.lantern;
        return wall;
      };
      for (let x = x0; x <= x1; x++) { W.set(x, yy, z0, pick(x - x0, x1 - x0)); W.set(x, yy, z1, pick(x - x0, x1 - x0)); }
      for (let z = z0; z <= z1; z++) { W.set(x0, yy, z, pick(z - z0, z1 - z0)); W.set(x1, yy, z, pick(z - z0, z1 - z0)); }
    }
    for (const d of o.doors ?? []) {
      const half = Math.floor((d.w ?? 3) / 2);
      for (let t = -half; t <= half; t++) for (let yy = y; yy < y + (d.h ?? 3); yy++) {
        if (d.side === 'n') W.set(d.at + t, yy, z0, 0); if (d.side === 's') W.set(d.at + t, yy, z1, 0);
        if (d.side === 'w') W.set(x0, yy, d.at + t, 0); if (d.side === 'e') W.set(x1, yy, d.at + t, 0);
      }
    }
  };
  // Hipped roof: rings stepping in `run` blocks per level, dark eave ring,
  // upturned corners and a gold ridge. Registered as a fading roof.
  const hipRoof = (x0, z0, x1, z1, y, o = {}) => {
    const id = o.id ?? B.roof, edge = o.edge ?? B.dark_planks, run = o.run ?? 1;
    let ax0 = x0, az0 = z0, ax1 = x1, az1 = z1, yy = y, lvl = 0, topY = y;
    while (ax0 <= ax1 && az0 <= az1) {
      const last = ax1 - ax0 < 2 * run || az1 - az0 < 2 * run;
      for (let z = az0; z <= az1; z++) for (let x = ax0; x <= ax1; x++) {
        const ring = Math.min(x - ax0, ax1 - x, z - az0, az1 - z) < run;
        if (ring || last) W.set(x, yy, z, lvl === 0 && Math.min(x - ax0, ax1 - x, z - az0, az1 - z) === 0 ? edge : id);
      }
      if (lvl === 0 && o.upturn !== false) for (const [x, z] of [[ax0, az0], [ax1, az0], [ax0, az1], [ax1, az1]]) W.set(x, yy + 1, z, edge);
      topY = yy;
      if (last) {
        const alongX = ax1 - ax0 >= az1 - az0, mz = (az0 + az1) >> 1, mx = (ax0 + ax1) >> 1;
        const long = Math.max(ax1 - ax0, az1 - az0) >= 4;
        if (long && alongX) for (let x = ax0; x <= ax1; x++) W.set(x, yy + 1, mz, x === ax0 || x === ax1 ? B.gold_trim : B.dark_brick);
        else if (long) for (let z = az0; z <= az1; z++) W.set(mx, yy + 1, z, z === az0 || z === az1 ? B.gold_trim : B.dark_brick);
        topY = yy + (long ? 1 : 0);
        break;
      }
      ax0 += run; az0 += run; ax1 -= run; az1 -= run; yy++; lvl++;
    }
    if (o.interior) W.addRoof([x0, y, z0], [x1, topY + 1, z1], o.interior);
    return topY;
  };
  // Gable roof with the ridge along z; gable ends filled with `end` on the wall planes.
  const gableRoof = (x0, z0, x1, z1, y, o = {}) => {
    const id = o.id ?? B.roof, run = o.run ?? 2, end = o.end ?? B.plaster;
    let xa = x0, xb = x1, yy = y;
    while (xa <= xb) {
      for (let z = z0; z <= z1; z++) for (let t = 0; t < run; t++) { if (xa + t <= xb) W.set(xa + t, yy, z, id); if (xb - t >= xa) W.set(xb - t, yy, z, id); }
      for (const z of [z0, z1]) for (let t = 0; t < run; t++) { W.set(xa + t, yy, z, B.dark_planks); W.set(xb - t, yy, z, B.dark_planks); }
      for (const wz of o.ends ?? []) for (let x = xa + run; x <= xb - run; x++) W.set(x, yy, wz, end);
      if (xb - xa < 2 * run) { for (let z = z0; z <= z1; z++) W.set((xa + xb) >> 1, yy + 1, z, z === z0 || z === z1 ? B.gold_trim : B.dark_brick); yy++; break; }
      xa += run; xb -= run; yy++;
    }
    if (o.interior) W.addRoof([x0, y, z0], [x1, yy + 1, z1], o.interior);
    return yy;
  };

  // ------------------------------------------------------------ courtyard and paths
  rect(46, 48, 82, 90, B.cobble, B.stone_brick, 0.12);
  for (let z = 45; z <= 96; z++) for (let x = 61; x <= 67; x++) W.set(x, FY - 1, z, x === 61 || x === 67 ? B.dark_brick : B.stone_brick);
  for (let z = 66; z <= 68; z++) for (let x = 35; x <= 92; x++) if (x < 61 || x > 67) W.set(x, FY - 1, z, z === 67 ? B.stone_brick : B.cobble);
  pathLine([[47, 50], [36, 46], [24, 44], [21, 40]], 3);       // to the shrine
  pathLine([[34, 45], [34, 35]], 2);                          // to the principal's office
  pathLine([[81, 49], [92, 44], [100, 42]], 3);               // to the pond
  pathLine([[90, 86], [96, 92], [104, 94]], 2, B.dirt_path);  // round the back of the training ground

  // ------------------------------------------------------------ the main hall (honden)
  {
    W.fill(44, FY, 20, 84, FY + 1, 44, B.stone_brick);
    for (let x = 44; x <= 84; x++) for (const z of [20, 44]) if (k.chance(0.3)) W.set(x, FY, z, B.mossy_brick);
    for (let z = 21; z <= 43; z++) for (let x = 45; x <= 83; x++) W.set(x, FY + 1, z, B.floor_boards);
    for (let x = 56; x <= 72; x++) W.set(x, FY, 45, B.stone_brick);   // front steps
    hall(47, 23, 81, 39, FY + 2, 7, { wall: B.shoji, post: B.pillar_red, bay: 3, sill: B.dark_planks, band: [5], floor: B.tatami, doors: [{ side: 's', at: 64, w: 11, h: 5 }, { side: 'w', at: 31, w: 3, h: 3 }, { side: 'e', at: 31, w: 3, h: 3 }] });
    for (let x = 47; x <= 81; x += 4) for (let yy = FY + 2; yy <= FY + 7; yy++) W.set(x, yy, 43, B.pillar_red);   // veranda posts
    for (let x = 47; x <= 81; x++) W.set(x, FY + 8, 43, B.dark_planks);
    for (let z = 23; z <= 43; z++) for (const x of [45, 83]) if ((z - 23) % 4 === 0) for (let yy = FY + 2; yy <= FY + 8; yy++) W.set(x, yy, z, yy === FY + 8 ? B.dark_planks : B.pillar_red);
    hipRoof(43, 19, 85, 44, FY + 9, { run: 1, interior: [[47, FY + 2, 23], [81, FY + 8, 39]] });
    // the altar at the back: gold, candles and a great talisman
    W.fill(60, FY + 2, 24, 68, FY + 2, 25, B.dark_planks); W.fill(61, FY + 3, 24, 67, FY + 3, 24, B.gold_trim);
    W.fill(63, FY + 4, 24, 65, FY + 5, 24, B.talisman_wall);
    candles(61.5, FY + 3, 25.5); candles(67.5, FY + 3, 25.5);
    W.addLight(64.5, FY + 4, 26.5, 0xffb050, 4, 10);
    for (const x of [52, 58, 70, 76]) deco.add('banner', x + 0.5, FY + 5, 23.98 + 0.05, { mode: 'wall', facing: [0, 1], scale: 2, sway: 0.2 });
    for (const x of [50, 78]) for (const z of [27, 34]) toro(x + 0.5, FY + 2, z + 0.5, 0.8, true);
    // shimenawa: a thick rope with paper shide over the entrance
    for (let i = 0; i < 12; i++) { const t = i / 11, x = 58.6 + t * 11.8, sag = Math.sin(t * Math.PI) * 0.45; P.box(x, FY + 6.4 - sag, 40.2, 1.15, 0.42, 0.42, C.rope, { rz: (t - 0.5) * 0.5, vary: 0.04 }); }
    for (const x of [61, 64.5, 68]) { const sag = Math.sin(((x - 58.6) / 11.8) * Math.PI) * 0.45; P.box(x, FY + 5.5 - sag, 40.25, 0.3, 0.8, 0.04, C.white, { sway: 0.4, vary: 0 }); }
    chochin(58.5, FY + 8.6, 41.5); chochin(70.5, FY + 8.6, 41.5);
    for (const x of [49, 53, 75, 79]) chochin(x + 0.5, FY + 8.6, 43.5, C.lanternRed, x === 49 || x === 79);
    // saisen box and bell rope in front of the door
    P.box(64.5, FY + 2, 41.2, 2.4, 0.9, 1.0, C.woodD); P.box(64.5, FY + 2.9, 41.2, 2.5, 0.12, 1.1, C.wood);
    W.set(63, FY + 2, 41, B.barrier); W.set(64, FY + 2, 41, B.barrier); W.set(65, FY + 2, 41, B.barrier);
    P.box(64.5, FY + 3.2, 41.0, 0.12, 3.6, 0.12, C.red, { sway: 0.2 }); P.box(64.5, FY + 6.6, 41.0, 0.5, 0.5, 0.5, C.gold, { emit: 0.3 });
  }

  // ------------------------------------------------------------ the gate, the wall and the long stairs
  torii(64.5, FY, 95.5, 7, 7.2, { thick: 0.65 });
  for (const x of [57, 72]) { toro(x + 0.5, FY, 93.5, 1.2); }
  // komainu guardians on pedestals
  for (const s of [-1, 1]) {
    const x = 64.5 + s * 5.6, z = 91.5;
    W.set(Math.floor(x), FY, Math.floor(z), B.stone_brick);
    P.box(x, FY + 1, z, 0.7, 0.55, 1.0, C.stone); P.box(x, FY + 1.5, z + 0.25, 0.62, 0.7, 0.55, C.stone);
    P.box(x, FY + 2.0, z + 0.35, 0.56, 0.5, 0.56, C.stone); P.box(x, FY + 2.15, z + 0.66, 0.36, 0.22, 0.12, C.stoneD);
    P.box(x - s * 0.1, FY + 2.45, z + 0.1, 0.62, 0.34, 0.4, C.stoneD);
  }
  // tsuiji wall along the plateau's south edge
  for (const [x0, x1] of [[38, 59], [69, 90]]) for (let x = x0; x <= x1; x++) {
    const h = top(x, 97); if (!isFinite(h)) continue;
    for (let yy = FY; yy < FY + 2; yy++) W.set(x, yy, 97, yy === FY ? B.stone_brick : B.plaster);
    W.set(x, FY + 2, 97, B.roof); W.set(x, FY + 2, 96, B.dark_planks); W.set(x, FY + 2, 98, B.dark_planks);
  }
  for (const x of [59, 69]) for (let yy = FY; yy <= FY + 3; yy++) W.set(x, yy, 97, B.stone_brick);
  // stone lanterns down the stairs, and a second torii at the bottom
  for (let z = 100; z < 119; z += 5) for (const x of [STX0, STX1]) toro(x + 0.5, stairTop(z) + 1, z + 0.5, 0.75, z % 10 === 0);
  for (let z = 119; z <= 131; z++) for (let x = 54; x <= 74; x++) { W.fill(x, FY - 11, z, x, FY - 1, z, 0); W.set(x, FY - 12, z, x >= 61 && x <= 67 ? B.stone_brick : k.chance(0.2) ? B.stone_brick : B.cobble); }
  torii(64.5, FY - 11, 121.5, 5, 5.2);
  for (let x = 0; x < SX; x++) for (let z = 126; z <= 129; z++) { const y = top(x, z); if (isFinite(y) && Math.abs(y - (FY - 11)) <= 2) { W.fill(x, FY - 11, z, x, y, z, 0); W.set(x, FY - 12, z, (z === 127 && x % 4 < 2) ? B.asphalt_line : B.asphalt); } }
  // a black sedan waiting at the foot of the stairs
  {
    const cx = 56, cz = 127.5;
    P.box(cx, FY - 11 + 0.25, cz, 4.2, 0.75, 1.8, 0x111216, { vary: 0 }); P.box(cx - 0.2, FY - 11 + 1.0, cz, 2.3, 0.62, 1.62, 0x1a2230, { vary: 0 });
    for (const [dx, dz] of [[-1.4, -0.85], [1.4, -0.85], [-1.4, 0.85], [1.4, 0.85]]) P.box(cx + dx, FY - 11, cz + dz, 0.7, 0.55, 0.25, 0x0a0a0a);
    P.box(cx + 2.1, FY - 11 + 0.5, cz - 0.6, 0.04, 0.16, 0.34, 0xfff2c0, { emit: 3 }); P.box(cx + 2.1, FY - 11 + 0.5, cz + 0.6, 0.04, 0.16, 0.34, 0xfff2c0, { emit: 3 });
    for (let x = cx - 2; x <= cx + 2; x++) W.set(x, FY - 11, Math.floor(cz), B.barrier);
    W.addLight(cx + 3, FY - 10.5, cz, 0xfff0c0, 3, 7);
  }

  // ------------------------------------------------------------ the dormitory (west)
  {
    const x0 = 12, z0 = 53, x1 = 34, z1 = 77, y = FY;
    rect(x0 - 1, z0 - 1, x1 + 1, z1 + 1, B.stone_brick);
    hall(x0, z0, x1, z1, y, 9, { wall: B.plaster, post: B.dark_planks, beam: B.dark_planks, bay: 4, band: [4], win: [2, 6], winId: B.lantern, floor: B.floor_boards, doors: [{ side: 'e', at: 65, w: 3, h: 3 }] });
    // a second-floor balcony along the courtyard side
    for (let z = z0; z <= z1; z++) { W.set(x1 + 1, y + 4, z, B.dark_planks); if (z % 2 === 0) P.box(x1 + 1.85, y + 5, z + 0.5, 0.1, 0.8, 0.1, C.woodD); }
    P.box(x1 + 1.85, y + 5.75, (z0 + z1) / 2 + 0.5, 0.08, 0.08, z1 - z0 + 1, C.wood);
    gableRoof(x0 - 2, z0 - 2, x1 + 2, z1 + 2, y + 9, { run: 2, end: B.plaster, ends: [z0, z1], interior: [[x0, y, z0], [x1, y + 8, z1]] });
    // inside: futons, low tables, a shelf
    for (let z = z0 + 2; z < z1 - 1; z += 4) for (const x of [x0 + 2, x1 - 4]) { P.box(x + 1, y, z + 0.5, 2.0, 0.22, 1.1, 0xe8e0d0); P.box(x + 0.35, y + 0.22, z + 0.5, 0.5, 0.16, 0.9, 0xffffff); P.box(x + 1.3, y + 0.22, z + 0.5, 1.2, 0.08, 1.1, [0x3a5a8a, 0x8a3a4a, 0x4a7a4a][z % 3]); }
    for (let z = z0 + 4; z < z1 - 2; z += 8) { P.box(x0 + 11, y, z, 1.4, 0.45, 0.9, C.woodD); W.addLight(x0 + 11, y + 2.5, z, 0xffc080, 2.5, 7); }
    // the stash chest (your locker) and the vending machines outside
    for (let z = 57; z <= 59; z++) { W.set(35, FY, z, B.vending); W.set(35, FY + 1, z, B.vending); W.set(35, FY + 2, z, B.concrete); }
    bench(39, FY, 57.2, -Math.PI / 2, 2);
    P.box(38.6, FY, 59.9, 0.5, 0.75, 0.5, 0x2a5a8a); P.box(38.6, FY + 0.75, 59.9, 0.52, 0.06, 0.52, 0x1a3a5a);   // recycling bin
    chochin(35.6, FY + 3.6, 62.5, C.paper); chochin(35.6, FY + 3.6, 67.5, C.paper);
    for (const z of [55, 75]) toro(37.5, FY, z + 0.5, 0.9);
    sakura(40, 79, FY, 1.05); sakura(40, 51, FY, 0.9);
  }
  const stash = V(36.8, FY, 69.6);
  {   // the chest
    const x = stash.x, z = stash.z;
    P.box(x, FY, z, 1.2, 0.62, 0.78, 0x5a3a8a, { vary: 0 }); P.box(x, FY + 0.62, z, 1.24, 0.24, 0.82, 0x6a4a9a, { vary: 0 });
    for (const dx of [-0.42, 0.42]) P.box(x + dx, FY, z, 0.1, 0.88, 0.84, C.gold, { emit: 0.25 });
    P.box(x, FY + 0.42, z + 0.4, 0.18, 0.2, 0.06, C.gold, { emit: 0.6 });
    W.set(Math.floor(x), FY, Math.floor(z), B.barrier);
  }

  // ------------------------------------------------------------ the training ground (east)
  {
    const x0 = 90, z0 = 47, x1 = 116, z1 = 86;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, FY - 1, z, k.chance(0.07) ? B.sand : k.chance(0.08) ? B.grass : B.dirt);
    for (let z = 52; z <= 58; z++) for (let x = 96; x <= 105; x++) W.set(x, FY - 1, z, x === 96 || x === 105 || z === 52 || z === 58 ? B.planks : B.sand);   // the sparring square
    fenceLine(x0, z0, x1 + 1, z0); fenceLine(x1 + 1, z0, x1 + 1, z1 + 1); fenceLine(x0, z1 + 1, x1 + 1, z1 + 1);
    fenceLine(x0, z0, x0, 63); fenceLine(x0, 72, x0, z1 + 1);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [x0, 63], [x0, 71]]) toro(x + 0.5, FY, z + 0.5, 0.85, true);
    // weapon racks: polearms, staves and practice swords
    for (const zc of [56, 62]) {
      P.box(114.6, FY, zc, 0.2, 1.7, 0.2, C.woodD); P.box(114.6, FY, zc + 3, 0.2, 1.7, 0.2, C.woodD);
      P.box(114.6, FY + 1.5, zc + 1.5, 0.22, 0.14, 3.2, C.wood); P.box(114.6, FY + 0.6, zc + 1.5, 0.22, 0.14, 3.2, C.wood);
      for (let i = 0; i < 5; i++) P.box(114.35, FY, zc + 0.4 + i * 0.55, 0.08, 2.3 - (i % 2) * 0.6, 0.08, i % 2 ? 0x2a2a2a : C.woodL, { rz: 0.12 });
      W.fill(114, FY, zc, 114, FY + 1, zc + 3, B.barrier);
    }
    // a storage shed and stacked crates
    hall(107, 77, 115, 84, FY, 4, { wall: B.planks, post: B.log, beam: B.dark_planks, bay: 4, floor: B.floor_boards, doors: [{ side: 'w', at: 80, w: 3, h: 3 }] });
    hipRoof(106, 76, 116, 85, FY + 4, { run: 1, interior: [[107, FY, 77], [115, FY + 3, 84]] });
    for (const [x, z] of [[104, 82], [105, 82], [104, 83]]) W.set(x, FY, z, B.crate);
    W.set(104, FY + 1, 82, B.crate); W.set(93, FY, 49, B.barrel); W.set(94, FY, 49, B.barrel);
    // benches for spectators, a drum and banners
    bench(93, FY, 76, Math.PI / 2, 2.4); bench(93, FY, 80, Math.PI / 2, 2.4);
    P.box(110.5, FY, 51.5, 1.1, 1.0, 1.1, 0x8a2a1a); P.box(110.5, FY + 1, 51.5, 1.15, 0.08, 1.15, 0xe8dcc0);
    for (const x of [96, 103, 110]) { P.box(x + 0.5, FY, z0 + 0.15, 0.12, 3.4, 0.12, C.woodD); P.box(x + 0.5, FY + 1.8, z0 + 0.25, 0.9, 1.6, 0.04, x === 103 ? 0x2a2a6a : 0x6a1a1a, { sway: 0.3 }); }
    // the summoning talisman post next to the dummy
    P.box(105.1, FY, 70.5, 0.22, 1.5, 0.22, C.woodD);
    P.box(105.1, FY + 1.1, 70.62, 0.36, 0.62, 0.04, 0xfff2c8, { emit: 1.2, vary: 0 }); P.box(105.1, FY + 1.25, 70.65, 0.12, 0.3, 0.02, 0xc0202a, { emit: 0.8, vary: 0 });
    W.addLight(105.1, FY + 1.6, 70.9, 0xffe0a0, 2, 4);
    deco.add('paper', 103.5, FY, 70.5, { mode: 'flat', scale: 1.4 });
    // spectators' sakura outside the fence
    sakura(88, 80, FY, 0.95); sakura(118, 52, FY, 0.8);
  }

  // ------------------------------------------------------------ the koi pond (north-east) and Gojo's bench
  const PC = [99, 27];
  {
    for (let z = 15; z <= 40; z++) for (let x = 86; x <= 113; x++) {
      const nx = (x - PC[0]) / 10.5, nz = (z - PC[1]) / 9;
      const d = Math.hypot(nx, nz) + Math.sin(x * 0.7 + z * 0.4) * 0.05;
      if (d > 1.12) continue;
      if (d > 0.98) { W.set(x, FY - 1, z, k.chance(0.5) ? B.stone : B.mossy_brick); continue; }
      const depth = d > 0.82 ? 1 : 2;
      W.fill(x, FY, z, x, FY + 8, z, 0);
      for (let y = FY - depth; y < FY; y++) W.set(x, y, z, B.water);
      W.set(x, FY - depth - 1, z, B.sand);
    }
    // a waterfall off the north ridge
    for (const x of [101, 102]) { const t = top(x, 15); for (let y = FY - 1; y < t; y++) W.set(x, y, 16, B.water); for (let zz = 13; zz <= 15; zz++) { const tt = top(x, zz); if (isFinite(tt)) W.set(x, tt - 1, zz, B.water); } }
    // boulders round the shore
    for (const [x, z] of [[88, 23], [90, 33], [109, 21], [110, 31], [97, 37], [104, 17]]) { W.set(x, FY, z, B.stone); if (k.chance(0.6)) W.set(x + 1, FY, z, B.mossy_brick); if (k.chance(0.4)) W.set(x, FY + 1, z, B.stone); }
    // the vermilion arched bridge (walkable) across the middle
    const bz0 = 26, bz1 = 28;
    for (let x = 88; x <= 110; x++) for (let z = bz0; z <= bz1; z++) {
      const lift = x <= 89 || x >= 109 ? 0 : x <= 91 || x >= 107 ? 1 : x <= 94 || x >= 104 ? 2 : 3;
      if (!lift) continue;
      W.fill(x, FY, z, x, FY + 3, z, 0);
      W.set(x, FY - 1 + lift, z, B.red_lacquer);
      if (z !== bz0 + 1) P.box(x + 0.5, FY + lift, z + (z === bz0 ? 0.15 : 0.85), 1.02, 0.1, 0.1, C.red, { vary: 0 });
      if (z !== bz0 + 1) { if (x % 2 === 0) P.box(x + 0.5, FY + lift - 0.0, z + (z === bz0 ? 0.15 : 0.85), 0.14, 0.95, 0.14, C.red); P.box(x + 0.5, FY + lift + 0.85, z + (z === bz0 ? 0.15 : 0.85), 1.02, 0.12, 0.16, C.red); }
    }
    for (const x of [89, 109]) for (const z of [bz0, bz1]) P.box(x + 0.5, FY + 1, z + 0.5, 0.22, 0.25, 0.22, C.gold, { emit: 0.4 });
    // lily pads, an island lantern, reeds and sakura
    for (let i = 0; i < 18; i++) { const a = k.r() * Math.PI * 2, r = 3 + k.r() * 5.5; const x = PC[0] + Math.cos(a) * r * 1.1, z = PC[1] + Math.sin(a) * r; if (Math.abs(z - 27.5) < 2.4) continue; if (W.get(Math.floor(x), FY - 1, Math.floor(z)) === B.water) { P.box(x, FY - 0.1, z, 0.7, 0.04, 0.7, 0x5a9a44, { ry: a, emit: 0.08 }); if (k.chance(0.25)) P.box(x + 0.15, FY - 0.06, z, 0.18, 0.14, 0.18, 0xf8c8e0, { emit: 0.15 }); } }
    W.fill(94, FY - 2, 21, 95, FY - 1, 22, B.stone); toro(95, FY, 22, 0.8);
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; const x = Math.floor(PC[0] + Math.cos(a) * 11.6), z = Math.floor(PC[1] + Math.sin(a) * 10); if (k.chance(0.5) && W.get(x, FY - 1, z) === B.grass && !W.get(x, FY, z)) deco.add(k.chance(0.5) ? 'tall_grass' : 'fern', x + 0.5, FY, z + 0.5, { scale: 1.1 }); }
    for (const [x, z, s] of [[86, 18, 1.1], [112, 36, 1], [90, 41, 0.85], [113, 19, 0.9], [84, 30, 0.9]]) sakura(x, z, FY, s);
    // Gojo's bench, looking over the training ground
    bench(100.5, FY, 43.5, 0, 2.2); W.set(100, FY, 43, B.barrier); W.set(101, FY, 43, B.barrier); W.set(99, FY, 43, B.barrier);
    toro(97.5, FY, 43.5, 0.8); toro(104.5, FY, 43.5, 0.8);
    P.box(102.2, FY + 0.52, 43.4, 0.3, 0.12, 0.22, 0xfff0f0); P.box(102.2, FY + 0.64, 43.4, 0.24, 0.1, 0.18, 0xf4b8c8);   // a box of sweets
  }

  // ------------------------------------------------------------ the shrine (technique tree) and the principal's office
  {
    // the mound with stairs
    W.fill(13, FY, 17, 27, FY + 2, 31, B.stone_brick);
    for (let z = 17; z <= 31; z++) for (let x = 13; x <= 27; x++) W.set(x, FY + 2, z, (x === 13 || x === 27 || z === 17 || z === 31) ? B.mossy_brick : B.cobble);
    for (let x = 18; x <= 22; x++) { W.fill(x, FY, 32, x, FY + 1, 32, B.stone_brick); W.fill(x, FY + 2, 32, x, FY + 4, 32, 0); W.set(x, FY, 33, B.stone_brick); }
    hall(15, 19, 25, 27, FY + 3, 4, { wall: B.shoji, post: B.pillar_red, bay: 2, floor: B.shrine_floor, doors: [{ side: 's', at: 20, w: 3, h: 3 }] });
    hipRoof(14, 18, 26, 28, FY + 7, { run: 1, interior: [[15, FY + 3, 19], [25, FY + 6, 27]] });
    W.fill(18, FY + 3, 20, 22, FY + 3, 20, B.gold_trim); W.set(20, FY + 4, 20, B.blue_energy);
    deco.add('talisman', 20.5, FY + 5.5, 20.03, { mode: 'wall', facing: [0, 1], scale: 1.1, emit: 0.8 });
    candles(17.5, FY + 3, 21.5); candles(23.5, FY + 3, 21.5);
    W.addLight(20.5, FY + 4.5, 22, 0x8ad8ff, 3, 8);
    chochin(17.5, FY + 6.7, 28.6); chochin(23.5, FY + 6.7, 28.6);
    toro(14.5, FY + 3, 30.5, 0.8); toro(26.5, FY + 3, 30.5, 0.8);
    // offering bell and the "omikuji" fortune rack
    P.box(15.2, FY + 3, 29.2, 0.14, 1.4, 0.14, C.woodD); P.box(16.8, FY + 3, 29.2, 0.14, 1.4, 0.14, C.woodD); P.box(16, FY + 4.2, 29.2, 1.8, 0.1, 0.12, C.wood);
    for (let i = 0; i < 6; i++) P.box(15.3 + i * 0.28, FY + 3.75, 29.2, 0.12, 0.4, 0.04, C.white, { sway: 0.5, vary: 0 });
    // senbon torii up to the shrine steps
    for (const z of [38, 40.5, 43, 45.5]) torii(20.5, FY, z, 4, 3.8, { thick: 0.36 });
    for (let z = 36; z <= 47; z++) for (let x = 19; x <= 22; x++) W.set(x, FY - 1, z, B.stone_brick);
    sakura(27, 45, null, 0.95); sakura(9, 38, null, 0.85);
  }
  {
    // the principal's office: plaster and dark timber, porch full of cursed dolls
    const x0 = 29, z0 = 19, x1 = 40, z1 = 30, y = FY;
    rect(x0, z0, x1, z1 + 3, B.stone_brick);
    hall(x0, z0, x1, z1, y, 5, { wall: B.plaster, post: B.dark_planks, bay: 3, win: [2], winId: B.lantern, floor: B.floor_boards, doors: [{ side: 's', at: 34, w: 3, h: 3 }] });
    hipRoof(x0 - 1, z0 - 1, x1 + 1, z1 + 3, y + 5, { run: 1, interior: [[x0, y, z0], [x1, y + 4, z1]] });
    for (let x = x0; x <= x1; x++) { W.set(x, y - 1, z1 + 1, B.floor_boards); W.set(x, y - 1, z1 + 2, B.floor_boards); }
    for (const x of [x0, x1]) for (let yy = y; yy < y + 5; yy++) W.set(x, yy, z1 + 3, B.dark_planks);
    // a sign board by the door
    P.box(27.6, FY, 33.6, 0.14, 1.3, 0.14, C.woodD); P.box(27.6, FY + 1.0, 33.65, 0.9, 1.1, 0.08, 0xe8dcc0);
    for (let i = 0; i < 4; i++) P.box(27.6, FY + 1.85 - i * 0.24, 33.7, 0.14, 0.14, 0.02, 0x1a1412, { vary: 0 });
    // shelves of cursed corpses (Yaga's dolls)
    const doll = (x, yy, z, col, kind, ry = 0) => {
      const c2 = new THREE.Color(col).multiplyScalar(0.75).getHex();
      P.box(x, yy, z, 0.34, 0.3, 0.26, col, { ry });
      P.box(x, yy + 0.3, z, 0.36, 0.32, 0.32, col, { ry });
      if (kind === 'bear') { P.box(x - 0.13, yy + 0.6, z, 0.1, 0.1, 0.06, c2, { ry }); P.box(x + 0.13, yy + 0.6, z, 0.1, 0.1, 0.06, c2, { ry }); }
      if (kind === 'cat') { P.box(x - 0.12, yy + 0.62, z, 0.08, 0.14, 0.06, c2, { ry, rz: 0.3 }); P.box(x + 0.12, yy + 0.62, z, 0.08, 0.14, 0.06, c2, { ry, rz: -0.3 }); }
      if (kind === 'frog') P.box(x, yy + 0.6, z + 0.05, 0.3, 0.08, 0.1, 0xffffff, { ry });
      P.box(x - 0.07 * Math.cos(ry) + Math.sin(ry) * 0.17, yy + 0.43, z + Math.cos(ry) * 0.17 + 0.07 * Math.sin(ry), 0.05, 0.05, 0.02, 0x101010, { ry, vary: 0 });
      P.box(x + 0.07 * Math.cos(ry) + Math.sin(ry) * 0.17, yy + 0.43, z + Math.cos(ry) * 0.17 - 0.07 * Math.sin(ry), 0.05, 0.05, 0.02, 0x101010, { ry, vary: 0 });
    };
    const kinds = ['bear', 'cat', 'frog', 'bear', 'cat'], cols = [0xc8a070, 0xf0e0d0, 0x6ab06a, 0x8a6a5a, 0xe8b0c0, 0x9a9ab8];
    for (const zc of [31.2]) for (const xs of [[30.2, 32.6], [36.2, 39.2]]) {
      P.box((xs[0] + xs[1]) / 2, FY, zc + 0.05, xs[1] - xs[0] + 0.4, 0.06, 0.5, C.woodD);
      P.box((xs[0] + xs[1]) / 2, FY + 0.8, zc + 0.05, xs[1] - xs[0] + 0.4, 0.06, 0.5, C.woodD);
      for (let i = 0, x = xs[0]; x <= xs[1]; x += 0.62, i++) { doll(x, FY + 0.06, zc, cols[i % cols.length], kinds[i % kinds.length], 0.15 * (i % 3 - 1)); doll(x + 0.2, FY + 0.86, zc, cols[(i + 2) % cols.length], kinds[(i + 1) % kinds.length], 0.1 * (i % 2)); }
      for (let x = Math.floor(xs[0]); x <= Math.floor(xs[1]); x++) W.set(x, FY, 31, B.barrier);
    }
    // inside: a desk, the sewing table and a giant doll
    P.box(34.5, FY, 22.5, 3, 0.8, 1.2, C.woodD); P.box(34.5, FY + 0.8, 22.5, 3.1, 0.08, 1.3, C.wood);
    doll(33.6, FY + 0.88, 22.4, 0xd8b088, 'bear', 0.4); doll(35.4, FY + 0.88, 22.6, 0xf0f0f0, 'cat', -0.3);
    P.box(38.5, FY, 21.5, 1.3, 1.2, 1.1, 0xc89a6a); P.box(38.5, FY + 1.2, 21.5, 1.4, 1.2, 1.3, 0xc89a6a); P.box(38.1, FY + 2.4, 21.5, 0.35, 0.35, 0.2, 0xa87a4a); P.box(38.9, FY + 2.4, 21.5, 0.35, 0.35, 0.2, 0xa87a4a);
    W.addLight(34.5, FY + 3, 24.5, 0xffc080, 3, 8);
    chochin(31.5, FY + 4.6, 32.2, C.paper); chochin(37.5, FY + 4.6, 32.2, C.paper);
  }

  // ------------------------------------------------------------ the briefing pavilion (map table)
  const mapTable = V(77, FY, 77);
  {
    const x0 = 73, z0 = 73, x1 = 81, z1 = 81;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, FY - 1, z, B.floor_boards);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) for (let yy = FY; yy < FY + 4; yy++) W.set(x, yy, z, B.pillar_red);
    for (let x = x0; x <= x1; x++) { W.set(x, FY + 4, z0, B.dark_planks); W.set(x, FY + 4, z1, B.dark_planks); }
    for (let z = z0; z <= z1; z++) { W.set(x0, FY + 4, z, B.dark_planks); W.set(x1, FY + 4, z, B.dark_planks); }
    hipRoof(x0 - 1, z0 - 1, x1 + 1, z1 + 1, FY + 5, { run: 1, interior: [[x0, FY, z0], [x1, FY + 4, z1]] });
    W.fill(76, FY, 76, 77, FY, 77, B.dark_planks);
    deco.add('paper', 77.0, FY + 1.02, 77.0, { mode: 'flat', scale: 1.9, emit: 0.35 });
    for (const [dx, dz, c] of [[-0.5, -0.4, 0xff3a4a], [0.4, 0.2, 0xffcf4a], [0.1, -0.6, 0x6ad8ff], [-0.3, 0.5, 0xb05aff]]) P.box(77 + dx, FY + 1.02, 77 + dz, 0.12, 0.22, 0.12, c, { emit: 1.4, vary: 0 });
    P.box(76.2, FY + 1, 77.7, 0.5, 0.06, 0.36, 0xf2f2f2); P.box(77.9, FY + 1, 76.3, 0.14, 0.32, 0.14, C.black);
    candles(76.3, FY + 1, 76.2);
    W.addLight(77, FY + 2.6, 77, 0xffc070, 3.5, 8);
    chochin(x0 + 0.5, FY + 4.4, z1 + 0.5); chochin(x1 + 0.5, FY + 4.4, z1 + 0.5, C.lanternRed, false);
  }

  // ------------------------------------------------------------ courtyard dressing
  for (const z of [50, 58, 74, 82, 90]) for (const x of [59, 69]) toro(x + 0.5, FY, z + 0.5, 1, true);
  for (const [x, z, s] of [[50, 52, 1.1], [79, 52, 1.05], [50, 85, 1.0], [85, 88, 0.9], [55, 72, 0.85], [73, 70, 0.8], [52, 92, 0.9], [76, 92, 0.95], [44, 60, 0.85], [84, 62, 0.85]]) sakura(x, z, FY, s);
  // a purification fountain (temizuya) by the path
  {
    const x0 = 53, z0 = 78;
    W.fill(x0, FY, z0, x0 + 3, FY, z0 + 1, B.stone); W.set(x0 + 1, FY, z0, B.water); W.set(x0 + 2, FY, z0, B.water); W.set(x0 + 1, FY, z0 + 1, B.water); W.set(x0 + 2, FY, z0 + 1, B.water);
    W.fill(x0 + 1, FY - 1, z0, x0 + 2, FY - 1, z0 + 1, B.stone);
    for (const [x, z] of [[x0 - 0.3, z0 - 0.3], [x0 + 4.3, z0 - 0.3], [x0 - 0.3, z0 + 2.3], [x0 + 4.3, z0 + 2.3]]) P.box(x, FY, z, 0.24, 3, 0.24, C.woodD);
    P.box(x0 + 2, FY + 3, z0 + 1, 5.6, 0.18, 3.4, C.woodD); P.box(x0 + 2, FY + 3.18, z0 + 1, 4.6, 0.3, 2.6, 0x3a3a40);
    for (let i = 0; i < 3; i++) P.box(x0 + 1.2 + i * 0.8, FY + 1.05, z0 - 0.15, 0.12, 0.05, 0.6, C.woodL);
  }
  // benches and lawn flowers
  bench(57, FY, 60, Math.PI / 2); bench(71.5, FY, 60, -Math.PI / 2); bench(48, FY, 70.5, 0); bench(80, FY, 64.5, 0);
  for (const [x, z] of [[47, 76], [82, 82], [86, 70], [43, 86]]) for (let i = 0; i < 5; i++) deco.add(['flower_red', 'flower_blue', 'flower_red', 'fern', 'grass'][i], x + rnd(-1.5, 1.5), FY, z + rnd(-1.5, 1.5), { scale: 0.8 });

  // ------------------------------------------------------------ forests on the ridges and the slopes
  const inCore = (x, z) => x >= 10 && x <= 120 && z >= 15 && z <= 98;
  for (let z = 2; z < SZ - 2; z += 3) for (let x = 2; x < SX - 2; x += 3) {
    const px = x + Math.floor(rnd(0, 3)), pz = z + Math.floor(rnd(0, 3));
    if (inCore(px, pz)) continue;
    if (px >= STX0 - 2 && px <= STX1 + 2 && pz > 94 && pz < 133) continue;          // keep the stairs clear
    if (px > STX1 && px <= STX1 + 14 && pz > 94 && pz < 126) continue;              // and the camera's view of them (it looks from the south-east)
    if (pz >= 117 && Math.abs(px - 64) < 13) continue;                               // the plaza
    if (pz >= 124 && pz <= 131) continue;                                            // the road
    const y = top(px, pz); if (!isFinite(y)) continue;
    const east = px > 118, chance = east ? 0.45 : 0.72;
    if (!k.chance(chance) || !clearAround(px, pz)) continue;
    if (east || k.chance(0.88)) cedar(px, pz, y, east ? 7 + Math.floor(k.r() * 3) : undefined);
    else k.tree(px, pz, y, { h: 4 + Math.floor(k.r() * 2) });
  }
  // a few cedars inside the edges of the campus
  for (const [x, z] of [[16, 50], [14, 82], [16, 92], [44, 18], [86, 14], [116, 44], [116, 90], [42, 94], [88, 94]]) { const y = top(x, z); if (clearAround(x, z)) cedar(x, z, y, 8 + Math.floor(k.r() * 4)); }
  for (const [x, z, s] of [[24, 88, 1], [30, 94, 0.9], [100, 94, 0.9], [110, 92, 1]]) if (clearAround(x, z)) sakura(x, z, top(x, z), s);
  for (const [x, z] of [[46, 98], [82, 100], [52, 104], [77, 106], [56, 112], [72, 114]]) { const y = hAt(x, z); if (!W.get(x, y, z) && !W.get(x + 1, y, z)) for (let i = 0; i < 2; i++) W.set(x + i, y, z, k.chance(0.5) ? B.stone : B.mossy_brick); }

  // ------------------------------------------------------------ ground cover
  k.scatter(1, 1, SX - 2, SZ - 2, { density: 0.16, types: ['grass', 'grass', 'tall_grass', 'flower_red', 'flower_blue', 'fern', 'grass'] });

  // ------------------------------------------------------------ distant mountains and valley floor
  deco.backdrop = () => {
    const g = new THREE.Group(); g.name = 'hub-backdrop';
    const pos = [], col = [];
    const ring = (n, r0, r1, h0, h1, c0, c1, seed) => {
      const R = mulberry32(seed);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + R() * 0.3, r = r0 + R() * (r1 - r0), hgt = h0 + R() * (h1 - h0), w = 26 + R() * 30;
        const cx = 64 + Math.cos(a) * r, cz = 68 + Math.sin(a) * r, by = FY - 24;
        const peak = [cx + (R() - 0.5) * 8, by + hgt, cz + (R() - 0.5) * 8];
        const base = []; const sides = 5;
        for (let s = 0; s < sides; s++) { const b = a + (s / sides) * Math.PI * 2 + R() * 0.4; base.push([cx + Math.cos(b) * w, by, cz + Math.sin(b) * w]); }
        const ca = new THREE.Color(c0), cb = new THREE.Color(c1);
        for (let s = 0; s < sides; s++) {
          const p0 = base[s], p1 = base[(s + 1) % sides];
          pos.push(...p0, ...peak, ...p1);
          const shade = 0.8 + 0.2 * Math.cos(a + s);
          col.push(ca.r * shade, ca.g * shade, ca.b * shade, cb.r, cb.g, cb.b, ca.r * shade, ca.g * shade, ca.b * shade);
        }
      }
    };
    ring(16, 108, 128, 30, 56, 0x1e2a36, 0x56607a, 11);
    ring(12, 132, 150, 44, 74, 0x2a3446, 0x7a7a98, 23);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mtn = new THREE.Mesh(geo, new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mtn.frustumCulled = false; g.add(mtn);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x1c2a22, roughness: 1 }));
    floor.position.set(64, FY - 13, 68); g.add(floor);
    return g;
  };

  world.collectBlockLights();

  // ------------------------------------------------------------ named places
  const spots = {
    gate: V(64.5, FY, 91.5), stairsTop: V(64.5, FY, 95.0), stairsBottom: V(64.5, FY - 11, 119.5), plaza: V(64.5, FY - 11, 124.5),
    courtyard: V(64.5, FY, 68.5), mainHall: V(64.5, FY, 48.5), dormitory: V(40.5, FY, 74.5), vending: V(37.5, FY, 58.5),
    trainingGround: V(98.5, FY, 66.5), sparring: V(100.5, FY, 55.5), shrine: V(20.5, FY, 35.5), office: V(34.5, FY, 34.5),
    pond: V(91.5, FY, 40.5), gojoBench: V(100.5, FY, 44.5), mapTable: mapTable.clone(), forestEdge: V(56.5, FY, 17.5), forestWest: V(14.5, FY, 70.5),
  };
  // NPC posts: position, facing (radians, 0 = +z) and what they do
  const npcs = {
    gojo: { pos: V(100.5, FY, 43.7), yaw: 0, pose: 'lounge' },
    yaga: { pos: V(24.6, FY + 3, 30.3), yaw: -0.25, pose: 'doll' },
    ijichi: { pos: V(79.4, FY, 75.6), yaw: -2.3, pose: 'clipboard' },
    nitta: { pos: V(69.5, FY, 89.5), yaw: -0.9, pose: 'wave' },
    merchant: { pos: V(38.4, FY, 60.6), yaw: -1.3, pose: 'lean' },
    panda: { pos: V(99.2, FY, 55.5), yaw: Math.PI / 2, pose: 'spar' },
    maki: { pos: V(101.8, FY, 55.5), yaw: -Math.PI / 2, pose: 'spar' },
    inumaki: { pos: V(107.5, FY, 52.5), yaw: -2.2, pose: 'watch' },
  };
  return {
    world, deco, shafts, kit: k,
    spawn: V(64.5, FY, 87.5), stage: V(64.5, FY, 53.5),
    dummy: V(103.5, FY, 70.5), mapTable, shop: V(37.4, FY, 58.6), stash, skills: V(20.5, FY + 3, 29.6),
    spots, npcs, pond: { cx: PC[0] + 0.5, cz: PC[1] + 0.5, rx: 8.5, rz: 7, y: FY - 0.25 },
    // roaming curses: forest edges only; the campus core is behind Tengen's barrier
    roam: [{ x0: 14, z0: 3, x1: 116, z1: 15 }, { x0: 2, z0: 18, x1: 11, z1: 94 }],
    core: { x0: 12, z0: 17, x1: 120, z1: 97 },
    groundAt: (x, z) => hAt(Math.floor(x), Math.floor(z)),
    titleCam: { center: V(66, FY + 5, 50), dist: 44, pitch: 22 * Math.PI / 180 },
    sunOffset: new THREE.Vector3(-30, 22, 14),
    biome: HUB_BIOME,
  };
}
