// Fake volumetric light shafts ("god rays") through windows and cracks:
// additive, depth-tested quads with soft edges and drifting dust noise.
// Cheap enough for High; Ultra adds more of them.
import * as THREE from 'three/webgpu';
import { uv, vec3, vec4, float, smoothstep, sin, mix, positionWorld, uniform, abs } from 'three/tsl';
import { U } from '../gfx/materials.js';

export class LightShafts {
  constructor() { this.group = new THREE.Group(); this.mats = new Map(); }
  material(hex) {
    if (this.mats.has(hex)) return this.mats.get(hex);
    const c = new THREE.Color(hex);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    const u = uv();
    const edge = smoothstep(0.0, 0.35, u.x).mul(smoothstep(1.0, 0.65, u.x));
    const along = smoothstep(0.0, 0.7, u.y).mul(smoothstep(1.0, 0.94, u.y));
    const dust = sin(positionWorld.y.mul(3.1).add(U.time.mul(0.7)).add(positionWorld.x.mul(2.3))).mul(0.2).add(0.8);
    const a = edge.mul(along).mul(dust).mul(0.16);
    m.colorNode = vec4(vec3(c.r, c.g, c.b).mul(a), 1);
    this.mats.set(hex, m);
    return m;
  }
  // A shaft from `from` along `dir` with length and width.
  add(from, dir, length, width, color = 0xb8c8ff) {
    const d = dir.clone().normalize();
    const mat = this.material(color);
    for (let i = 0; i < 2; i++) {
      const g = new THREE.PlaneGeometry(width, length).translate(0, -length / 2, 0);
      // plane's +Y is the start; rotate so that -Y follows dir
      const m = new THREE.Mesh(g, mat);
      m.position.copy(from);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
      m.rotateY(i * Math.PI / 2);
      m.renderOrder = 5;
      this.group.add(m);
    }
  }
  clear() { for (const c of [...this.group.children]) { this.group.remove(c); c.geometry.dispose(); } }
}
