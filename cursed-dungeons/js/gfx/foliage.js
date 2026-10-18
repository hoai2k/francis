// Dense instanced foliage: grass tufts, tall grass, ferns and voxel-headed
// flowers growing on grass-type blocks, with rolling wind gusts, players
// pushing through it, sunlit tips that glow when the sun is behind them, cloud
// shadows, and a soft "grow in" fade at the edge of the loaded radius.
//
// It streams by itself: 16×16 areas within E.foliageFade (+ margin) of the
// camera focus are built (a couple per frame), far ones dropped. All visible
// areas are packed into one instanced draw per kind (4 draws in total).
//
//   game.foliage.populate(world, rules)   grow foliage on `world` (replaces the previous world's)
//   game.foliage.clear()
//   game.foliage.invalidate(x, z)         rebuild the area holding block column x, z (auto on world.set)
//
// rules (all optional):
//   {
//     density: 1,                       multiplier on top of the quality tier
//     blocks: { [blockId]: { density, kinds: { grass, tall, fern, flower }, palette } },
//                                       which blocks grow what (tufts per block, kind weights);
//                                       defaults: grass (lush meadow), cursed_grass, moss_floor
//     palette: { grass: hex, cursed: hex, moss: hex, flowers: [hex…] },
//     area: { x0, z0, x1, z1 },         only grow inside this rectangle
//     exclude: (x, y, z) => bool,       skip a block (roads, plazas…)
//     flowerPatches: 0.55,              0 = flowers everywhere, 1 = only in dense patches
//     seed: 1,
//   }
import * as THREE from 'three/webgpu';
import {
  attribute, positionLocal, normalLocal, uv, vec2, vec3, vec4, float, sin, cos, dot, normalize, length, max, min,
  smoothstep, pow, mix, step, abs, clamp, cameraPosition, transformNormalToView,
} from 'three/tsl';
import { U } from './materials.js';
import { E, withCloudShadow } from './envNodes.js';
import { BLOCKS, B } from '../world/blocks.js';
import { mulberry32 } from '../util.js';

const AREA = 16;
const KINDS = ['grass', 'tall', 'fern', 'flower'];
const STRIDE = 12;     // floats per instance: pos.xyz scale | rot var phase - | blade rgb | head rgb (packed below)

const DEFAULT_PALETTE = { grass: 0x5fa83a, cursed: 0x4a6a3a, moss: 0x4e8a3a, flowers: [0xe8322a, 0xf6d23a, 0x4a7af0, 0xf4f2ec, 0xe86ab8, 0xff8a2a] };

function defaultBlocks() {
  return {
    [B.grass]: { density: 3.0, kinds: { grass: 6, tall: 2.2, fern: 0.5, flower: 0.55 }, palette: 'grass' },
    [B.cursed_grass]: { density: 1.6, kinds: { grass: 5, tall: 2.5, fern: 1.2, flower: 0.15 }, palette: 'cursed', flowers: [0x9a4ad8, 0x6a2a8a, 0xd04a6a] },
    [B.moss_floor]: { density: 0.9, kinds: { grass: 2.5, tall: 0.5, fern: 2.2, flower: 0.2 }, palette: 'moss' },
  };
}

// ---------------------------------------------------------------- base meshes
function bladeGeo(n, hMin, hMax, wBase, lean, seed, segs = 1) {
  const R = mulberry32(seed);
  const P = [], N = [], UV = [], I = [];
  let v = 0;
  for (let b = 0; b < n; b++) {
    const a = (b / n) * Math.PI * 2 + R() * 0.8;
    const r = 0.05 + R() * 0.2;
    const ox = Math.cos(a) * r, oz = Math.sin(a) * r;
    const h = hMin + R() * (hMax - hMin);
    const w = wBase * (0.7 + R() * 0.6);
    const face = a + Math.PI / 2 + (R() - 0.5) * 0.9;
    const tx = Math.cos(face), tz = Math.sin(face);
    const lx = Math.cos(a) * lean * (0.5 + R()), lz = Math.sin(a) * lean * (0.5 + R());
    const nx = -tz, nz = tx;
    for (let s = 0; s <= segs; s++) {
      const f = s / segs;
      const ww = w * (1 - f * 0.85) * 0.5;
      const bend = f * f;
      const cx = ox + lx * bend, cz = oz + lz * bend, cy = h * f;
      for (const side of [-1, 1]) {
        P.push(cx + tx * ww * side, cy, cz + tz * ww * side);
        const nn = new THREE.Vector3(nx * 0.4, 1, nz * 0.4).normalize();
        N.push(nn.x, nn.y, nn.z);
        UV.push(0, f);
      }
    }
    for (let s = 0; s < segs; s++) { const q = v + s * 2; I.push(q, q + 1, q + 3, q, q + 3, q + 2); }
    v += (segs + 1) * 2;
  }
  return { P, N, UV, I };
}
function flowerGeo(seed) {
  const g = bladeGeo(3, 0.42, 0.6, 0.05, 0.06, seed);
  // leaves at the foot
  const lv = bladeGeo(3, 0.18, 0.26, 0.16, 0.25, seed + 3);
  const off = g.P.length / 3;
  g.P.push(...lv.P); g.N.push(...lv.N); g.UV.push(...lv.UV.map((x, i) => (i % 2 ? x * 0.4 : x))); g.I.push(...lv.I.map((i) => i + off));
  // a voxel flower head (part = 1 in uv.x) on top of the middle stem
  const s = 0.055, y0 = 0.52, cx = 0, cz = 0;
  const base = g.P.length / 3;
  const F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  let k = 0;
  for (const n of F) {
    const u = Math.abs(n[1]) ? [1, 0, 0] : [0, 1, 0];
    const w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      g.P.push(cx + (n[0] + u[0] * a + w[0] * b) * s, y0 + s + (n[1] + u[1] * a + w[1] * b) * s, cz + (n[2] + u[2] * a + w[2] * b) * s);
      g.N.push(...n); g.UV.push(1, 1);
    }
    const q = base + k * 4; g.I.push(q, q + 1, q + 2, q, q + 2, q + 3); k++;
  }
  // centre stem straight up under the head
  return g;
}
function toGeometry({ P, N, UV, I }) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setIndex(I);
  return g;
}

// ---------------------------------------------------------------- material
function makeMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.82, metalness: 0 });
  const ip = attribute('iPos', 'vec4'), id = attribute('iData', 'vec4'), ib = attribute('iBlade', 'vec3'), ih = attribute('iHead', 'vec3');
  const h = uv().y, part = uv().x;
  const c = cos(id.x), s = sin(id.x);
  const L = positionLocal;
  const base = ip.xyz;
  // fade in/out with distance from the camera focus, and vanish inside a domain floor
  const dist = length(base.xz.sub(E.focus.xz));
  const grow0 = smoothstep(E.foliageFade, E.foliageFade.mul(0.78), dist);
  const dd = length(base.xz.sub(U.domainCenter.xz));
  const inDomain = smoothstep(U.domainRadius, U.domainRadius.sub(1.5), dd).mul(step(0.5, U.domainType));
  const grow = grow0.mul(float(1).sub(inDomain));
  const sc = ip.w.mul(grow);
  const p = vec3(L.x.mul(c).sub(L.z.mul(s)), L.y, L.x.mul(s).add(L.z.mul(c))).mul(vec3(ip.w.mul(mix(0.35, 1, grow)), sc, ip.w.mul(mix(0.35, 1, grow))));
  // wind: rolling gusts across the field plus a small per-tuft flutter
  const wdir = vec2(0.86, 0.5);
  const t = U.time;
  const gust = sin(dot(base.xz, wdir).mul(0.16).sub(t.mul(1.7))).mul(0.5).add(0.5);
  const flutter = sin(t.mul(2.6).add(id.z).add(base.x.mul(0.9))).mul(0.3).add(sin(t.mul(5.3).add(id.z.mul(2.0))).mul(0.08));
  const bend = h.mul(h);
  const sway = gust.mul(0.85).add(flutter).mul(U.wind).mul(0.2).mul(bend).mul(sc);
  // players brush the grass aside
  let push = vec2(0, 0);
  for (let i = 0; i < 4; i++) {
    const pl = U.players.element(i);
    const d = base.xz.sub(pl.xz);
    const k = smoothstep(1.25, 0.15, length(d)).mul(step(abs(base.y.sub(pl.y)), 1.6)).mul(pl.w);
    push = push.add(normalize(d.add(vec2(0.001, 0.0))).mul(k));
  }
  const pushLen = min(length(push), 1);
  const off = vec3(wdir.x.mul(sway).add(push.x.mul(0.5).mul(bend).mul(sc)), pushLen.mul(-0.3).mul(bend).mul(sc), wdir.y.mul(sway).add(push.y.mul(0.5).mul(bend).mul(sc)));
  m.positionNode = base.add(p).add(off);
  const n = normalLocal;
  m.normalNode = transformNormalToView(normalize(vec3(n.x.mul(c).sub(n.z.mul(s)), n.y, n.x.mul(s).add(n.z.mul(c)))));
  // colour: dark roots (contact AO) to bright sun-bleached tips
  const vary = float(1).add(id.y.mul(0.14));
  const blade = mix(ib.mul(0.38), ib.mul(1.22).add(vec3(0.05, 0.045, 0.0)), pow(h, 0.85)).mul(vary);
  const head = ih.mul(float(0.85).add(h.mul(0.25)));
  const col = mix(blade, head, part);
  m.colorNode = vec4(col, 1);
  // light catching the tips: stronger when looking towards a low sun
  const wp = base.add(p);
  const view = normalize(wp.sub(cameraPosition));
  const back = pow(max(dot(view, E.sunDir), 0), 2);
  const trans = vec3(E.sunColor).mul(E.day).mul(float(0.05).add(back.mul(0.28)).add(E.golden.mul(0.05))).mul(pow(h, 1.6)).mul(float(1).sub(part.mul(0.6)));
  m.emissiveNode = col.mul(trans);
  withCloudShadow(m);
  return m;
}

// ---------------------------------------------------------------- manager
export class Foliage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group(); this.group.name = 'foliage';
    scene.add(this.group);
    this.world = null; this.rules = null;
    this.areas = new Map();       // 'ax,az' -> { data: {kind: Float32Array}, counts }
    this.dirty = new Set();
    this.density = 1;             // tier density (renderer preset.foliage)
    this.userDensity = 1;         // settings multiplier
    this.enabled = true;
    this.replacesDeco = true;     // world/deco.js skips its sprite grass tufts while foliage is on
    this.changed = false;
    this.material = makeMaterial();
    this.base = {
      grass: toGeometry(bladeGeo(8, 0.4, 0.78, 0.085, 0.14, 11)),
      tall: toGeometry(bladeGeo(6, 0.9, 1.4, 0.1, 0.3, 23, 2)),
      fern: toGeometry(bladeGeo(6, 0.45, 0.7, 0.2, 0.55, 37, 2)),
      flower: toGeometry(flowerGeo(51)),
    };
    this.meshes = {};
    for (const k of KINDS) {
      const geo = this.base[k];
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false;
      mesh.name = 'foliage-' + k; mesh.visible = false;
      this.group.add(mesh);
      this.meshes[k] = { mesh, cap: 0, count: 0 };
    }
  }
  get effectiveDensity() { return this.enabled ? this.density * this.userDensity : 0; }

  populate(world, rules = {}) {
    this.clear();
    if (!world) return;
    this.world = world;
    const pal = { ...DEFAULT_PALETTE, ...(rules.palette ?? {}) };
    const blocks = { ...defaultBlocks(), ...(rules.blocks ?? {}) };
    this.rules = { density: 1, flowerPatches: 0.62, seed: 1, ...rules, palette: pal, blocks };
    // keep foliage in sync with block edits (destruction, gates, building)
    if (!world.__foliageWrapped) {
      const orig = world.set;
      world.set = function (x, y, z, id) { orig.call(this, x, y, z, id); this.__foliage?.invalidate(x, z); };
      world.__foliageWrapped = true;
    }
    world.__foliage = this;
  }
  clear() {
    if (this.world && this.world.__foliage === this) this.world.__foliage = null;
    this.world = null; this.rules = null;
    this.areas.clear(); this.dirty.clear();
    for (const k of KINDS) { const M = this.meshes[k]; M.count = 0; M.mesh.visible = false; }
  }
  invalidate(x, z) { const k = Math.floor(x / AREA) + ',' + Math.floor(z / AREA); if (this.areas.has(k)) this.dirty.add(k); }
  setDensity(tier, user = this.userDensity) {
    if (tier === this.density && user === this.userDensity) return;
    this.density = tier; this.userDensity = user;
    this.areas.clear(); this.changed = true;
  }

  // per frame
  update(focus) {
    const W = this.world;
    if (!W || !this.rules || this.effectiveDensity <= 0) {
      if (this.areas.size || this.changed) { this.areas.clear(); this.pack(); this.changed = false; }
      return;
    }
    const R = E.foliageFade.value + 10;
    const ax0 = Math.max(0, Math.floor((focus.x - R) / AREA)), ax1 = Math.min(Math.ceil(W.sx / AREA) - 1, Math.floor((focus.x + R) / AREA));
    const az0 = Math.max(0, Math.floor((focus.z - R) / AREA)), az1 = Math.min(Math.ceil(W.sz / AREA) - 1, Math.floor((focus.z + R) / AREA));
    // drop far areas
    for (const key of this.areas.keys()) {
      const [ax, az] = key.split(',').map(Number);
      const dx = (ax + 0.5) * AREA - focus.x, dz = (az + 0.5) * AREA - focus.z;
      if (dx * dx + dz * dz > (R + AREA * 1.5) ** 2) { this.areas.delete(key); this.changed = true; }
    }
    // rebuild edited areas
    for (const key of this.dirty) { const [ax, az] = key.split(',').map(Number); this.areas.set(key, this.buildArea(ax, az)); this.changed = true; }
    this.dirty.clear();
    // build missing areas nearest first, within a small time budget
    const want = [];
    for (let az = az0; az <= az1; az++) for (let ax = ax0; ax <= ax1; ax++) {
      const key = ax + ',' + az; if (this.areas.has(key)) continue;
      const dx = (ax + 0.5) * AREA - focus.x, dz = (az + 0.5) * AREA - focus.z, d2 = dx * dx + dz * dz;
      if (d2 > (R + AREA * 0.75) ** 2) continue;
      want.push([d2, ax, az, key]);
    }
    if (want.length) {
      want.sort((a, b) => a[0] - b[0]);
      const t0 = performance.now();
      for (const [, ax, az, key] of want) {
        this.areas.set(key, this.buildArea(ax, az)); this.changed = true;
        if (performance.now() - t0 > 2.5) break;
      }
    }
    if (this.changed) { this.pack(); this.changed = false; }
  }
  // build everything around a point right now (level load)
  prime(focus) { const t = performance.now; void t; for (let i = 0; i < 64; i++) { const n = this.areas.size; this.update(focus); if (this.areas.size === n) break; } }

  buildArea(ax, az) {
    const W = this.world, Rl = this.rules, dens = this.effectiveDensity * (Rl.density ?? 1);
    const out = { grass: [], tall: [], fern: [], flower: [] };
    const R = mulberry32(((ax * 73856093) ^ (az * 19349663) ^ (Rl.seed * 83492791)) >>> 0);
    const x0 = ax * AREA, z0 = az * AREA;
    const A = Rl.area;
    const pal = Rl.palette;
    const col = new THREE.Color(), head = new THREE.Color();
    const patch = (x, z) => 0.5 + 0.5 * Math.sin(x * 0.23 + Math.sin(z * 0.17) * 2.1) * Math.sin(z * 0.19 + Math.sin(x * 0.13) * 1.7);
    for (let z = z0; z < z0 + AREA && z < W.sz; z++) for (let x = x0; x < x0 + AREA && x < W.sx; x++) {
      if (A && (x < A.x0 || x > A.x1 || z < A.z0 || z > A.z1)) continue;
      for (let y = W.sy - 2; y >= 0; y--) {
        const id = W.get(x, y, z);
        if (!id) continue;
        const rule = Rl.blocks[id];
        if (!rule) { if (BLOCKS[id]?.opaque && !this.passThrough(id)) break; continue; }
        if (W.get(x, y + 1, z) !== 0) break;
        if (W.roofs?.length && W.inRoof?.(x, y + 1, z)) break;
        if (Rl.exclude && Rl.exclude(x, y, z)) break;
        const n0 = rule.density * dens;
        let n = Math.floor(n0); if (R() < n0 - n) n++;
        const K = rule.kinds; const tot = (K.grass ?? 0) + (K.tall ?? 0) + (K.fern ?? 0) + (K.flower ?? 0);
        const pk = patch(x, z);
        const flowerBoost = Math.max(0, (pk - Rl.flowerPatches) / Math.max(0.05, 1 - Rl.flowerPatches)) * 3;
        for (let i = 0; i < n; i++) {
          let r = R() * (tot + (K.flower ?? 0) * flowerBoost);
          let kind = 'grass';
          if ((r -= K.grass ?? 0) < 0) kind = 'grass';
          else if ((r -= K.tall ?? 0) < 0) kind = 'tall';
          else if ((r -= K.fern ?? 0) < 0) kind = 'fern';
          else kind = 'flower';
          const px = x + 0.12 + R() * 0.76, pz = z + 0.12 + R() * 0.76;
          const scale = kind === 'flower' ? 0.8 + R() * 0.45 : 0.75 + R() * 0.55;
          col.set(pal[rule.palette] ?? rule.color ?? pal.grass);
          const hsl = R();
          col.offsetHSL((hsl - 0.5) * 0.04, (R() - 0.5) * 0.12, (R() - 0.5) * 0.06);
          const fl = rule.flowers ?? pal.flowers;
          head.set(fl[Math.floor(R() * fl.length)]);
          out[kind].push(px, y + 1, pz, scale, R() * Math.PI * 2, R() * 2 - 1, R() * 6.28, 0, col.r, col.g, col.b, 0, head.r, head.g, head.b);
        }
        break;
      }
    }
    const data = {};
    for (const k of KINDS) data[k] = new Float32Array(out[k]);
    return data;
  }
  // blocks the column scan looks through (tree canopies, plants) to find the ground under them
  passThrough(id) { const n = BLOCKS[id]?.name ?? ''; return /leaves|leaf|log|sakura|bamboo/.test(n); }

  pack() {
    for (const k of KINDS) {
      let total = 0;
      for (const a of this.areas.values()) total += a[k].length;
      const count = total / 15;
      const M = this.meshes[k];
      if (count === 0) { M.count = 0; M.mesh.visible = false; if (M.mesh.geometry.attributes.iPos) M.mesh.geometry.instanceCount = 0; continue; }
      if (count > M.cap || !M.mesh.geometry.attributes.iPos) {
        const cap = Math.ceil(count * 1.4) + 64;
        const g = M.mesh.geometry;
        g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
        g.setAttribute('iData', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
        g.setAttribute('iBlade', new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
        g.setAttribute('iHead', new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
        M.cap = cap;
      }
      const g = M.mesh.geometry;
      const P = g.attributes.iPos.array, D = g.attributes.iData.array, Bl = g.attributes.iBlade.array, H = g.attributes.iHead.array;
      let i = 0;
      for (const a of this.areas.values()) {
        const src = a[k];
        for (let o = 0; o < src.length; o += 15, i++) {
          P[i * 4] = src[o]; P[i * 4 + 1] = src[o + 1]; P[i * 4 + 2] = src[o + 2]; P[i * 4 + 3] = src[o + 3];
          D[i * 4] = src[o + 4]; D[i * 4 + 1] = src[o + 5]; D[i * 4 + 2] = src[o + 6]; D[i * 4 + 3] = src[o + 7];
          Bl[i * 3] = src[o + 8]; Bl[i * 3 + 1] = src[o + 9]; Bl[i * 3 + 2] = src[o + 10];
          H[i * 3] = src[o + 12]; H[i * 3 + 1] = src[o + 13]; H[i * 3 + 2] = src[o + 14];
        }
      }
      for (const n of ['iPos', 'iData', 'iBlade', 'iHead']) g.attributes[n].needsUpdate = true;
      g.instanceCount = count;
      M.count = count;
      M.mesh.visible = count > 0;
    }
  }
}
void STRIDE; void clamp;
