// Small decoration details: grass tufts, flowers, cobwebs, chains, paper
// talismans, bones, candles, banners and hanging lanterns. All sprite quads
// are merged into one mesh (wind sway via a vertex attribute); a few 3D
// props (shrine lanterns, stone lanterns) are merged into a second mesh.
import * as THREE from 'three/webgpu';
import { spriteUV, SPRITE_INDEX as SI } from '../gfx/textures.js';
import { ditherMask, occlusionAmount } from '../gfx/materials.js';

export class Decorations {
  constructor() { this.items = []; this.props = []; this.mesh = null; this.propMesh = null; }
  add(type, x, y, z, o = {}) { this.items.push({ type, x, y, z, ...o }); }
  // 3D prop: { kind, x, y, z, rot }
  prop(kind, x, y, z, o = {}) { this.props.push({ kind, x, y, z, ...o }); }

  build(world, materials, density = 1) {
    const pos = [], nrm = [], uv = [], col = [], sway = [], emit = [], idx = [];
    let n = 0;
    const quad = (p0, p1, p2, p3, uvr, normal, sw, em, c = 1) => {
      const [u0, v0, u1, v1] = uvr;
      pos.push(...p0, ...p1, ...p2, ...p3);
      for (let i = 0; i < 4; i++) nrm.push(...normal);
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      if (sw < 0) sway.push(-sw, -sw, 0, 0); else sway.push(0, 0, sw, sw); emit.push(em, em, em, em);
      for (let i = 0; i < 4; i++) col.push(c, c, c);
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    };
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (const it of this.items) {
      if (it.optional !== false && rnd() > density && (it.type === 'grass' || it.type === 'tall_grass' || it.type === 'fern')) continue;
      const s = it.scale ?? 1;
      const sprite = SI[it.type] ?? SI.grass;
      const uvr = spriteUV(sprite);
      const { x, y, z } = it;
      if (it.mode === 'wall') {
        // flat on a wall; facing = normal direction [nx, nz]
        const [nx, nz] = it.facing; const tx = -nz, tz = nx; const h = s * 0.5;
        const ox = x + nx * 0.02, oz = z + nz * 0.02;
        quad([ox - tx * h, y - h, oz - tz * h], [ox + tx * h, y - h, oz + tz * h], [ox + tx * h, y + h, oz + tz * h], [ox - tx * h, y + h, oz - tz * h], uvr, [nx, 0, nz], it.sway ?? 0.2, it.emit ?? 0);
      } else if (it.mode === 'hang') {
        // cross quad hanging down from y
        const h = s;
        for (const a of [0.785, 2.356]) {
          const cx = Math.cos(a) * s * 0.5, cz = Math.sin(a) * s * 0.5;
          quad([x - cx, y - h, z - cz], [x + cx, y - h, z + cz], [x + cx, y, z + cz], [x - cx, y, z - cz], uvr, [0, 1, 0], -(it.sway ?? 0.5), it.emit ?? 0);
        }
      } else if (it.mode === 'flat') {
        const h = s * 0.5; const yy = y + 0.02;
        quad([x - h, yy, z + h], [x + h, yy, z + h], [x + h, yy, z - h], [x - h, yy, z - h], uvr, [0, 1, 0], 0, it.emit ?? 0);
      } else {
        // crossed billboard standing on the ground
        const h = s; const ang = (it.rot ?? rnd() * Math.PI);
        for (const a of [ang, ang + Math.PI / 2]) {
          const cx = Math.cos(a) * s * 0.5, cz = Math.sin(a) * s * 0.5;
          quad([x - cx, y, z - cz], [x + cx, y, z + cz], [x + cx, y + h, z + cz], [x - cx, y + h, z - cz], uvr, [0, 1, 0], it.sway ?? 1, it.emit ?? 0, it.tint ?? 1);
        }
      }
    }
    if (this.mesh) { world.group.remove(this.mesh); this.mesh.geometry.dispose(); }
    if (n) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
      g.setAttribute('emit', new THREE.Float32BufferAttribute(emit, 1));
      g.setIndex(idx);
      this.mesh = new THREE.Mesh(g, materials.deco);
      this.mesh.receiveShadow = true; this.mesh.castShadow = false;
      world.group.add(this.mesh);
    }
    this.buildProps(world, materials);
  }
  buildProps(world, materials) {
    if (this.propMesh) { world.group.remove(this.propMesh); }
    const group = new THREE.Group();
    const M = materials.props;
    const box = (w, h, d, x, y, z, mat, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
    for (const p of this.props) {
      const { x, y, z } = p;
      switch (p.kind) {
        case 'stone_lantern': // tōrō
          box(0.7, 0.2, 0.7, x, y + 0.1, z, M.stone); box(0.3, 0.7, 0.3, x, y + 0.55, z, M.stone);
          box(0.6, 0.15, 0.6, x, y + 0.95, z, M.stone); box(0.42, 0.4, 0.42, x, y + 1.22, z, M.lanternGlow);
          box(0.8, 0.14, 0.8, x, y + 1.49, z, M.stone); box(0.4, 0.14, 0.4, x, y + 1.62, z, M.stone);
          break;
        case 'paper_lantern': // hanging red lantern
          box(0.04, 0.5, 0.04, x, y + 0.25, z, M.dark);
          box(0.5, 0.6, 0.5, x, y - 0.3, z, M.redLantern); box(0.56, 0.08, 0.56, x, y, z, M.dark); box(0.56, 0.08, 0.56, x, y - 0.6, z, M.dark);
          break;
        case 'torch':
          box(0.12, 0.6, 0.12, x, y + 0.3, z, M.wood); box(0.18, 0.18, 0.18, x, y + 0.66, z, M.flame);
          break;
        case 'candle_cluster':
          for (let i = 0; i < 3; i++) { const a = i * 2.1, r = 0.15; const hh = 0.2 + i * 0.08; box(0.08, hh, 0.08, x + Math.cos(a) * r, y + hh / 2, z + Math.sin(a) * r, M.wax); box(0.05, 0.08, 0.05, x + Math.cos(a) * r, y + hh + 0.05, z + Math.sin(a) * r, M.flame); }
          break;
        case 'torii': {
          const w = p.w ?? 5, h = p.h ?? 5;
          box(0.45, h, 0.45, x - w / 2, y + h / 2, z, M.red, p.rot); box(0.45, h, 0.45, x + w / 2, y + h / 2, z, M.red, p.rot);
          box(w + 1.6, 0.4, 0.6, x, y + h + 0.2, z, M.dark); box(w + 0.8, 0.3, 0.45, x, y + h - 0.8, z, M.red);
          break;
        }
        case 'bench': box(1.6, 0.12, 0.5, x, y + 0.5, z, M.wood); box(0.1, 0.5, 0.4, x - 0.7, y + 0.25, z, M.dark); box(0.1, 0.5, 0.4, x + 0.7, y + 0.25, z, M.dark); break;
        case 'streetlight': box(0.15, 5, 0.15, x, y + 2.5, z, M.metal); box(1.2, 0.12, 0.2, x + 0.5, y + 5, z, M.metal); box(0.4, 0.12, 0.3, x + 1, y + 4.9, z, M.lampGlow); break;
        case 'car': {
          const c = p.color ?? 0x7a1a1a; const cm = M.car(c);
          box(3.8, 0.9, 1.8, x, y + 0.65, z, cm, p.rot); box(2.2, 0.7, 1.6, x - 0.2, y + 1.4, z, M.glass, p.rot);
          break;
        }
        case 'vending_sign': box(0.1, 1.2, 2, x, y + 0.6, z, M.lampGlow); break;
        case 'dummy_post': box(0.2, 1.2, 0.2, x, y + 0.6, z, M.wood); break;
        case 'rubble': for (let i = 0; i < 5; i++) box(0.3 + Math.random() * 0.3, 0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.3, x + (Math.random() - 0.5) * 1.5, y + 0.12, z + (Math.random() - 0.5) * 1.5, M.stone, Math.random() * 3); break;
      }
    }
    this.propMesh = group; world.group.add(group);
  }
}

export function makePropMaterials() {
  const S = (c, o = {}) => { const m = new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.8, ...o }); m.maskNode = ditherMask(occlusionAmount()); return m; };
  return {
    stone: S(0x8a8a88), dark: S(0x1c1814), wood: S(0x6a4a2a), red: S(0xb5281f, { roughness: 0.4 }), metal: S(0x4a4e55, { metalness: 0.8, roughness: 0.35 }),
    wax: S(0xefe6cc), glass: S(0x223344, { roughness: 0.05, metalness: 0.6 }),
    flame: S(0xffb040, { emissive: 0xff9020, emissiveIntensity: 4 }),
    lanternGlow: S(0xffe0a0, { emissive: 0xffb050, emissiveIntensity: 2.5 }),
    redLantern: S(0xd02a1a, { emissive: 0xff3a1a, emissiveIntensity: 1.6 }),
    lampGlow: S(0xfff0d0, { emissive: 0xffe0b0, emissiveIntensity: 3 }),
    car: (() => { const cache = new Map(); return (c) => { if (!cache.has(c)) cache.set(c, S(c, { roughness: 0.25, metalness: 0.5 })); return cache.get(c); }; })(),
  };
}
