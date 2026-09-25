// Voxel world: block storage, collision queries, and chunked meshing.
// Chunks are 16³ and meshed into a single merged BufferGeometry each
// (only faces touching non-opaque neighbours are emitted) with per-vertex
// ambient occlusion, baked coloured light and per-block material params.
import * as THREE from 'three/webgpu';
import { BLOCKS, B } from './blocks.js';
import { tileUV } from '../gfx/textures.js';

export const CS = 16;
const AO_CURVE = [0.42, 0.62, 0.8, 1.0];

// face: normal, u axis, v axis, origin corner
const FACES = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], o: [1, 0, 1], tile: 'side' },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], o: [0, 0, 0], tile: 'side' },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], o: [0, 1, 1], tile: 'top' },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], o: [0, 0, 0], tile: 'bottom' },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], o: [0, 0, 1], tile: 'side' },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], o: [1, 0, 0], tile: 'side' },
];
const CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]];

export class World {
  constructor(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.data = new Uint8Array(sx * sy * sz);
    this.damage = new Map();
    this.cx = Math.ceil(sx / CS); this.cy = Math.ceil(sy / CS); this.cz = Math.ceil(sz / CS);
    this.chunks = new Map();          // key -> { mesh, liquid, glow, dirty }
    this.dirty = new Set();
    this.roofs = [];                  // { min, max, interior, mesh, material }
    this.staticLights = [];           // { x,y,z,color:THREE.Color,intensity,distance }
    this.group = new THREE.Group(); this.group.name = 'world';
    this.bake = 1;
    this.surfaceCache = null;
  }
  inBounds(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  idx(x, y, z) { return (y * this.sz + z) * this.sx + x; }
  get(x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz) return 0;
    return this.data[(y * this.sz + z) * this.sx + x];
  }
  set(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return;
    const i = this.idx(x, y, z);
    if (this.data[i] === id) return;
    this.data[i] = id;
    const kx = Math.floor(x / CS), ky = Math.floor(y / CS), kz = Math.floor(z / CS);
    this.markDirty(kx, ky, kz);
    // neighbours share faces / AO
    const lx = x - kx * CS, ly = y - ky * CS, lz = z - kz * CS;
    if (lx === 0) this.markDirty(kx - 1, ky, kz); if (lx === CS - 1) this.markDirty(kx + 1, ky, kz);
    if (ly === 0) this.markDirty(kx, ky - 1, kz); if (ly === CS - 1) this.markDirty(kx, ky + 1, kz);
    if (lz === 0) this.markDirty(kx, ky, kz - 1); if (lz === CS - 1) this.markDirty(kx, ky, kz + 1);
  }
  markDirty(kx, ky, kz) { if (kx >= 0 && ky >= 0 && kz >= 0 && kx < this.cx && ky < this.cy && kz < this.cz) this.dirty.add(kx + ',' + ky + ',' + kz); }
  fill(x0, y0, z0, x1, y1, z1, id) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, id);
  }
  // hollow box walls
  walls(x0, y0, z0, x1, y1, z1, id) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) { this.set(x, y, z0, id); this.set(x, y, z1, id); }
      for (let z = z0; z <= z1; z++) { this.set(x0, y, z, id); this.set(x1, y, z, id); }
    }
  }
  solidAt(x, y, z) { const id = this.get(Math.floor(x), Math.floor(y), Math.floor(z)); return id !== 0 && BLOCKS[id].solid; }
  blockAt(x, y, z) { return this.get(Math.floor(x), Math.floor(y), Math.floor(z)); }
  // top surface (y of the first free cell) below fromY, or -Infinity for pits
  groundBelow(x, z, fromY) {
    const bx = Math.floor(x), bz = Math.floor(z);
    for (let y = Math.min(this.sy - 1, Math.floor(fromY)); y >= 0; y--) {
      const id = this.get(bx, y, bz);
      if (id && BLOCKS[id].solid) return y + 1;
    }
    return -Infinity;
  }
  liquidAt(x, y, z) { const id = this.blockAt(x, y, z); return id ? BLOCKS[id].liquid : null; }
  addLight(x, y, z, color, intensity, distance) {
    this.staticLights.push({ x, y, z, color: new THREE.Color(color), intensity, distance });
  }
  addRoof(min, max, interior) { this.roofs.push({ min, max, interior, mesh: null, fade: 0 }); }
  inRoof(x, y, z) {
    for (const r of this.roofs) if (x >= r.min[0] && x <= r.max[0] && y >= r.min[1] && y <= r.max[1] && z >= r.min[2] && z <= r.max[2]) return r;
    return null;
  }
  // Collect static lights from emissive blocks (lanterns, pools) — sparse.
  collectBlockLights() {
    const seen = new Set();
    for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx; x++) {
      const id = this.data[this.idx(x, y, z)]; if (!id) continue;
      const L = BLOCKS[id].light; if (!L) continue;
      // cluster pools / neon so we get one light per ~4x4 area
      const key = id + ':' + (x >> 2) + ',' + (y >> 2) + ',' + (z >> 2);
      if (seen.has(key)) continue; seen.add(key);
      this.staticLights.push({ x: x + 0.5, y: y + (BLOCKS[id].liquid ? 1.2 : 0.5), z: z + 0.5, color: new THREE.Color(L[0]), intensity: L[1], distance: L[2], block: true });
    }
  }
  bakedLightAt(x, y, z, out) {
    out[0] = out[1] = out[2] = 0;
    const grid = this.lightGrid;
    if (!grid) return out;
    const key = (Math.floor(x / 8)) + ',' + (Math.floor(z / 8));
    const list = grid.get(key); if (!list) return out;
    for (const L of list) {
      const dx = x - L.x, dy = y - L.y, dz = z - L.z;
      const d2 = dx * dx + dy * dy + dz * dz; const r = L.distance * 1.1;
      if (d2 > r * r) continue;
      const f = 1 - Math.sqrt(d2) / r; const k = f * f * L.intensity * 0.12;
      out[0] += L.color.r * k; out[1] += L.color.g * k; out[2] += L.color.b * k;
    }
    return out;
  }
  buildLightGrid() {
    const grid = new Map();
    for (const L of this.staticLights) {
      const r = Math.ceil(L.distance * 1.1 / 8);
      const cx = Math.floor(L.x / 8), cz = Math.floor(L.z / 8);
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        const k = (cx + i) + ',' + (cz + j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(L);
      }
    }
    this.lightGrid = grid;
  }

  // ---------------------------------------------------------------- meshing
  init(materials) {
    this.materials = materials;
    this.buildLightGrid();
    for (let ky = 0; ky < this.cy; ky++) for (let kz = 0; kz < this.cz; kz++) for (let kx = 0; kx < this.cx; kx++) this.dirty.add(kx + ',' + ky + ',' + kz);
    this.flush(Infinity);
    for (const r of this.roofs) this.buildRoof(r);
  }
  // Rebuild up to `budget` dirty chunks (streaming / destruction).
  flush(budget = 4) {
    let n = 0;
    for (const key of this.dirty) {
      if (n++ >= budget) break;
      this.dirty.delete(key);
      const [kx, ky, kz] = key.split(',').map(Number);
      this.buildChunk(kx, ky, kz);
    }
  }
  remeshAll() {
    this.buildLightGrid();
    for (const key of this.chunks.keys()) this.dirty.add(key);
    this.flush(Infinity);
    for (const r of this.roofs) this.buildRoof(r);
  }
  buildChunk(kx, ky, kz) {
    const key = kx + ',' + ky + ',' + kz;
    let ch = this.chunks.get(key);
    if (!ch) { ch = { mesh: null, water: null, glow: [] }; this.chunks.set(key, ch); }
    const x0 = kx * CS, y0 = ky * CS, z0 = kz * CS;
    const solid = new MeshBuilder(), water = new MeshBuilder(), glow = new Map();
    for (let y = y0; y < y0 + CS && y < this.sy; y++) for (let z = z0; z < z0 + CS && z < this.sz; z++) for (let x = x0; x < x0 + CS && x < this.sx; x++) {
      const id = this.data[this.idx(x, y, z)];
      if (!id || id === B.barrier) continue;
      const def = BLOCKS[id];
      if (def.liquid) {
        const mb = def.liquid === 'water' ? water : (glow.get(id) || glow.set(id, new MeshBuilder()).get(id));
        this.emitLiquid(mb, x, y, z, id);
        continue;
      }
      if (this.roofs.length && this.inRoof(x, y, z)) continue;
      this.emitBlock(solid, x, y, z, def);
    }
    const g = this.group;
    const swap = (old, mb, mat) => {
      if (old) { g.remove(old); old.geometry.dispose(); }
      if (!mb.count) return null;
      const mesh = new THREE.Mesh(mb.build(), mat);
      mesh.castShadow = mat === this.materials.block; mesh.receiveShadow = true;
      mesh.userData.chunk = key;
      g.add(mesh); return mesh;
    };
    ch.mesh = swap(ch.mesh, solid, this.materials.block);
    ch.water = swap(ch.water, water, this.materials.water);
    for (const m of ch.glow) { g.remove(m); m.geometry.dispose(); }
    ch.glow = [];
    for (const [id, mb] of glow) { const m = swap(null, mb, this.materials.glow[BLOCKS[id].liquid]); if (m) ch.glow.push(m); }
  }
  buildRoof(r) {
    if (r.mesh) { this.group.remove(r.mesh); r.mesh.geometry.dispose(); }
    const mb = new MeshBuilder();
    for (let y = r.min[1]; y <= r.max[1]; y++) for (let z = r.min[2]; z <= r.max[2]; z++) for (let x = r.min[0]; x <= r.max[0]; x++) {
      const id = this.get(x, y, z); if (!id || BLOCKS[id].liquid) continue;
      this.emitBlock(mb, x, y, z, BLOCKS[id]);
    }
    if (!mb.count) return;
    if (!r.material) r.material = this.materials.makeRoof();
    r.mesh = new THREE.Mesh(mb.build(), r.material);
    r.mesh.castShadow = true; r.mesh.receiveShadow = true;
    this.group.add(r.mesh);
  }
  occ(x, y, z) { const id = this.get(x, y, z); return id !== 0 && BLOCKS[id].opaque && !BLOCKS[id].liquid ? 1 : 0; }
  emitBlock(mb, x, y, z, def) {
    const light = [0, 0, 0];
    for (let f = 0; f < 6; f++) {
      const F = FACES[f];
      const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
      const nid = this.get(nx, ny, nz);
      if (nid && BLOCKS[nid].opaque && nid !== B.barrier && !(this.roofs.length && this.inRoof(nx, ny, nz) && !this.inRoof(x, y, z))) continue;
      const tile = def[F.tile];
      const [u0, v0, u1, v1] = tileUV(tile);
      const ao = [0, 0, 0, 0];
      for (let c = 0; c < 4; c++) {
        const su = CORNERS[c][0] ? 1 : -1, sv = CORNERS[c][1] ? 1 : -1;
        const s1 = this.occ(nx + F.u[0] * su, ny + F.u[1] * su, nz + F.u[2] * su);
        const s2 = this.occ(nx + F.v[0] * sv, ny + F.v[1] * sv, nz + F.v[2] * sv);
        const cc = this.occ(nx + F.u[0] * su + F.v[0] * sv, ny + F.u[1] * su + F.v[1] * sv, nz + F.u[2] * su + F.v[2] * sv);
        ao[c] = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
      }
      const base = mb.count;
      for (let c = 0; c < 4; c++) {
        const cu = CORNERS[c][0], cv = CORNERS[c][1];
        const px = x + F.o[0] + F.u[0] * cu + F.v[0] * cv;
        const py = y + F.o[1] + F.u[1] * cu + F.v[1] * cv;
        const pz = z + F.o[2] + F.u[2] * cu + F.v[2] * cv;
        const a = AO_CURVE[ao[c]];
        this.bakedLightAt(px + F.n[0] * 0.5, py + F.n[1] * 0.5, pz + F.n[2] * 0.5, light);
        mb.vertex(px, py, pz, F.n, cu ? u1 : u0, cv ? v1 : v0, a, light, def.rough, def.metal, def.emit);
      }
      if (ao[0] + ao[2] < ao[1] + ao[3]) mb.quad(base + 1, base + 2, base + 3, base + 0);
      else mb.quad(base, base + 1, base + 2, base + 3);
    }
  }
  emitLiquid(mb, x, y, z, id) {
    const def = BLOCKS[id];
    const above = this.get(x, y + 1, z);
    const top = above === id ? 1 : 0.86;
    const [u0, v0, u1, v1] = tileUV(def.top);
    const light = [0, 0, 0];
    for (let f = 0; f < 6; f++) {
      const F = FACES[f];
      const nid = this.get(x + F.n[0], y + F.n[1], z + F.n[2]);
      if (nid === id) continue;
      if (f !== 2 && nid && BLOCKS[nid].opaque) continue;
      if (f === 3) continue;
      if (f === 2 && above === id) continue;
      const base = mb.count;
      for (let c = 0; c < 4; c++) {
        const cu = CORNERS[c][0], cv = CORNERS[c][1];
        let px = x + F.o[0] + F.u[0] * cu + F.v[0] * cv;
        let py = y + F.o[1] + F.u[1] * cu + F.v[1] * cv;
        let pz = z + F.o[2] + F.u[2] * cu + F.v[2] * cv;
        if (py > y) py = y + top;
        mb.vertex(px, py, pz, F.n, cu ? u1 : u0, cv ? v1 : v0, 1, light, def.rough, def.metal, def.emit);
      }
      mb.quad(base, base + 1, base + 2, base + 3);
    }
  }
  updateRoofs(players, dt) {
    for (const r of this.roofs) {
      if (!r.mesh) continue;
      let inside = false;
      for (const p of players) {
        const q = p.pos, I = r.interior;
        if (q.x >= I[0][0] && q.x <= I[1][0] + 1 && q.y >= I[0][1] - 0.5 && q.y <= I[1][1] && q.z >= I[0][2] && q.z <= I[1][2] + 1) inside = true;
      }
      r.fade += ((inside ? 1 : 0) - r.fade) * Math.min(1, dt * 6);
      r.material.userData.fade.value = r.fade;
      r.mesh.visible = r.fade < 0.99;
      r.mesh.castShadow = r.fade < 0.5;
    }
  }
  // Damage a destructible block; returns true if it broke.
  hitBlock(x, y, z, dmg) {
    const id = this.get(x, y, z); if (!id) return false;
    const def = BLOCKS[id]; if (!def.hp) return false;
    const k = this.idx(x, y, z);
    const hp = (this.damage.get(k) ?? def.hp) - dmg;
    if (hp > 0) { this.damage.set(k, hp); return false; }
    this.damage.delete(k);
    this.set(x, y, z, 0);
    return true;
  }
}

class MeshBuilder {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.bake = []; this.mat = []; this.idx = []; this.count = 0; }
  vertex(x, y, z, n, u, v, ao, light, rough, metal, emit) {
    this.pos.push(x, y, z); this.nrm.push(n[0], n[1], n[2]); this.uv.push(u, v);
    this.col.push(ao, ao, ao); this.bake.push(light[0], light[1], light[2]); this.mat.push(rough, metal, emit);
    this.count++;
  }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('bake', new THREE.Float32BufferAttribute(this.bake, 3));
    g.setAttribute('mat', new THREE.Float32BufferAttribute(this.mat, 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
