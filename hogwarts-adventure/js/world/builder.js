// Geometry batching: collects transformed geometries per material and merges them
// into one mesh per material. Optional world-space box-mapped UVs keep texel density even.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function mat4(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

export class Builder {
  constructor() {
    this.buckets = new Map();
  }
  // geo is cloned; mat may carry userData.worldUV (texture world size in metres)
  add(geo, mat, matrix) {
    const g = geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.index) {
      const n = g.attributes.position.count;
      const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      g.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    if (mat.userData.worldUV) worldUV(g, mat.userData.worldUV);
    let b = this.buckets.get(mat);
    if (!b) this.buckets.set(mat, (b = []));
    b.push(g);
    return g;
  }
  box(mat, x, y, z, w, h, d, ry = 0, rx = 0, rz = 0) {
    return this.add(BOX, mat, mat4(x, y, z, ry, w, h, d, rx, rz));
  }
  build(parent, { cast = true, receive = true } = {}) {
    const meshes = [];
    for (const [mat, list] of this.buckets) {
      // keep index types consistent
      const all32 = list.some((g) => g.index.array instanceof Uint32Array);
      if (all32) for (const g of list) if (!(g.index.array instanceof Uint32Array)) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(g.index.array), 1));
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = cast && !mat.userData.noShadow;
      mesh.receiveShadow = receive;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.buckets.clear();
    return meshes;
  }
}

export const BOX = new THREE.BoxGeometry(1, 1, 1);

function worldUV(g, size) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  const s = 1 / size;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) uv.setXY(i, x * s, z * s);
    else if (ax >= az) uv.setXY(i, z * s, y * s);
    else uv.setXY(i, x * s, y * s);
  }
  uv.needsUpdate = true;
}

// Instanced helper: one geometry/material, many transforms.
export function instanced(geo, mat, matrices, { cast = true, receive = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
  m.instanceMatrix.needsUpdate = true;
  m.castShadow = cast;
  m.receiveShadow = receive;
  m.computeBoundingSphere();
  return m;
}
