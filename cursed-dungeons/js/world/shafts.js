// Fake volumetric light shafts ("god rays"): additive, depth-tested quads with
// soft edges and drifting dust. Two kinds:
//   add(from, dir, length, width, color)  a fixed shaft (windows, cracks); tinted by
//                                         the current sun colour and daylight
//   addAuto(world, { count })             sun shafts slanting down from the underside of
//                                         tree canopies; they follow the sun's direction as
//                                         the time of day changes, are strongest in the golden
//                                         hour, vanish at night and under cloud shadows
// Shown on Medium+ (preset.shafts).
import * as THREE from 'three/webgpu';
import {
  uv, vec3, vec4, float, smoothstep, sin, positionWorld, attribute, normalize, cross, cameraPosition, max, abs, mix, length,
} from 'three/tsl';
import { U } from '../gfx/materials.js';
import { E, cloudShadow } from '../gfx/envNodes.js';
import { BLOCKS } from './blocks.js';

export class LightShafts {
  constructor() { this.group = new THREE.Group(); this.group.name = 'shafts'; this.mats = new Map(); this.auto = null; }
  material(hex) {
    if (this.mats.has(hex)) return this.mats.get(hex);
    const c = new THREE.Color(hex);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    const u = uv();
    const edge = smoothstep(0.0, 0.35, u.x).mul(smoothstep(1.0, 0.65, u.x));
    const along = smoothstep(0.0, 0.7, u.y).mul(smoothstep(1.0, 0.94, u.y));
    const dust = sin(positionWorld.y.mul(3.1).add(U.time.mul(0.7)).add(positionWorld.x.mul(2.3))).mul(0.2).add(0.8);
    // warm in the golden hour, dimmer (but still there: interiors) at night
    const sunTint = mix(vec3(1, 1, 1), normalize(vec3(E.sunColor).add(0.05)).mul(1.5), E.day.mul(0.6));
    const a = edge.mul(along).mul(dust).mul(0.16).mul(E.day.mul(0.55).add(0.45));
    m.colorNode = vec4(vec3(c.r, c.g, c.b).mul(sunTint).mul(a), 1);
    this.mats.set(hex, m);
    return m;
  }
  // A shaft from `from` along `dir` with length and width.
  add(from, dir, length, width, color = 0xb8c8ff) {
    const d = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
    const mat = this.material(color);
    for (let i = 0; i < 2; i++) {
      const g = new THREE.PlaneGeometry(width, length).translate(0, -length / 2, 0);
      // plane's +Y is the start; rotate so that -Y follows dir
      const m = new THREE.Mesh(g, mat);
      m.position.set(from.x, from.y, from.z);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
      m.rotateY(i * Math.PI / 2);
      m.renderOrder = 5;
      this.group.add(m);
    }
  }

  // ---------------------------------------------------------------- sun shafts under canopies
  addAuto(world, { count = 1, maxShafts = 160, cell = 6 } = {}) {
    if (this.auto) { this.group.remove(this.auto); this.auto.geometry.dispose(); this.auto = null; }
    const isLeaf = (id) => id && /leaves/.test(BLOCKS[id]?.name ?? '');
    const picks = [];
    const R = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
    const chance = Math.min(1, 0.55 * count);
    for (let cz = 0; cz < world.sz; cz += cell) for (let cx = 0; cx < world.sx; cx += cell) {
      if (R(cx, cz) > chance) continue;
      // try a couple of columns in this cell for a canopy underside above open ground
      for (let k = 0; k < 3; k++) {
        const x = cx + Math.floor(R(cx + k * 7, cz) * cell), z = cz + Math.floor(R(cx, cz + k * 13) * cell);
        if (x >= world.sx || z >= world.sz) continue;
        let y = world.sy - 1;
        while (y > 0 && !world.get(x, y, z)) y--;
        if (!isLeaf(world.get(x, y, z))) continue;
        while (y > 0 && isLeaf(world.get(x, y - 1, z))) y--;      // canopy bottom
        let gy = y - 1;
        while (gy > 0 && !world.get(x, gy, z)) gy--;
        const drop = y - (gy + 1);
        if (drop < 2.5 || drop > 14) continue;
        picks.push([x + 0.5, y, z + 0.5, drop]);
        break;
      }
      if (picks.length >= maxShafts * count) break;
    }
    if (!picks.length) return 0;
    const anchor = [], corner = [], param = [], idx = [];
    let n = 0;
    picks.forEach(([x, y, z, drop], i) => {
      const w = 0.7 + R(x, z + 3) * 1.1;
      for (const [sx, al] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { anchor.push(x, y, z); corner.push(sx, al); param.push(w, drop + 0.3, i * 1.7); }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(anchor, 3));
    g.setAttribute('corner', new THREE.Float32BufferAttribute(corner, 2));
    g.setAttribute('param', new THREE.Float32BufferAttribute(param, 3));
    g.setIndex(idx);
    const mesh = new THREE.Mesh(g, this.autoMaterial());
    mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.name = 'sun-shafts';
    this.auto = mesh; this.group.add(mesh);
    return picks.length;
  }
  autoMaterial() {
    if (this.autoMat) return this.autoMat;
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    const a = attribute('position', 'vec3'), c = attribute('corner', 'vec2'), p = attribute('param', 'vec3');
    const dir = E.sunDir.negate();
    const len = p.y.div(max(dir.y.negate(), 0.3));
    const view = normalize(cameraPosition.sub(a));
    const side = normalize(cross(dir, view).add(vec3(0.0001, 0, 0)));
    const wide = p.x.mul(float(0.55).add(c.y.mul(0.45)));
    m.positionNode = a.add(dir.mul(len).mul(c.y)).add(side.mul(wide).mul(c.x));
    const edge = smoothstep(1.0, 0.15, abs(c.x));
    const along = smoothstep(0.0, 0.18, c.y).mul(smoothstep(1.0, 0.55, c.y));
    const dust = sin(U.time.mul(0.9).add(p.z)).mul(0.25).add(0.75);
    const sun = E.day.mul(float(0.3).add(E.golden.mul(0.9))).mul(cloudShadow(a).sub(0.5).mul(2).max(0));
    // fade out shafts right next to the camera focus line so they never veil the players
    const near = smoothstep(1.2, 3.5, length(a.xz.sub(E.focus.xz)));
    m.colorNode = vec4(vec3(E.sunColor).mul(edge.mul(along).mul(dust).mul(sun).mul(near).mul(0.055)), 1);
    this.autoMat = m;
    return m;
  }
  clear() { for (const c of [...this.group.children]) { this.group.remove(c); c.geometry.dispose(); } this.auto = null; }
}
