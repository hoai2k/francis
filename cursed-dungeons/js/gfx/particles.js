// GPU particles. Each particle is written once at spawn into instanced
// attributes (origin, velocity, colour, size, gravity, drag…); the vertex
// stage integrates its motion analytically from the game-time uniform, so
// the CPU never touches live particles. Two pools: additive glow and
// alpha-blended smoke/dust. A ring buffer recycles the oldest slots.
import * as THREE from 'three/webgpu';
import {
  instancedDynamicBufferAttribute, vec3, vec4, float, uv, exp, max, step, mix, smoothstep, length, pow, clamp, select, sin,
} from 'three/tsl';
import { U } from './materials.js';

export const SHAPE = { soft: 0, square: 1, ring: 2, spark: 3 };

export class ParticlePool {
  constructor(scene, cap, additive) {
    this.max = cap; this.head = 0; this.dirtyMin = Infinity; this.dirtyMax = -1;
    const mk = () => new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.a0 = mk(); this.a1 = mk(); this.a2 = mk(); this.a3 = mk();
    // park all particles far in the past so they start dead
    for (let i = 0; i < cap; i++) { this.a0.array[i * 4 + 3] = -1e4; this.a1.array[i * 4 + 3] = 0.001; }
    const A0 = instancedDynamicBufferAttribute(this.a0), A1 = instancedDynamicBufferAttribute(this.a1);
    const A2 = instancedDynamicBufferAttribute(this.a2), A3 = instancedDynamicBufferAttribute(this.a3);
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false });
    m.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    const age = U.time.sub(A0.w);
    const life = A1.w;
    const t = clamp(age.div(life), 0, 1);
    const alive = step(0, age).mul(step(age, life));
    const drag = max(A3.y, 0.001);
    const travel = float(1).sub(exp(drag.negate().mul(age))).div(drag);
    const pos = A0.xyz.add(A1.xyz.mul(travel)).add(vec3(0, A3.x.mul(-0.5).mul(age).mul(age), 0));
    m.positionNode = pos;
    const size = A2.w.mul(mix(float(1), A3.z, t)).mul(alive);
    m.scaleNode = size;
    const d = length(uv().sub(0.5));
    const shape = A3.w;
    const soft = smoothstep(0.5, 0.0, d);
    const ring = smoothstep(0.5, 0.42, d).mul(smoothstep(0.28, 0.4, d));
    const alpha0 = select(shape.lessThan(0.5), soft.mul(soft), select(shape.lessThan(1.5), float(1), ring));
    const fade = smoothstep(0, 0.08, t).mul(pow(float(1).sub(t), 1.3));
    const a = alpha0.mul(fade);
    if (additive) { m.colorNode = vec4(A2.xyz.mul(a), 1); m.opacityNode = a; }
    else { m.colorNode = vec4(A2.xyz, 1); m.opacityNode = a; }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.count = cap; mesh.frustumCulled = false; mesh.renderOrder = additive ? 20 : 10;
    scene.add(mesh);
    this.mesh = mesh;
  }
  emit(x, y, z, vx, vy, vz, life, r, g, b, size, gravity = 0, drag = 0, sizeEnd = 0.2, shape = 0, time = U.time.value) {
    const i = this.head; this.head = (this.head + 1) % this.max;
    const o = i * 4;
    const a0 = this.a0.array, a1 = this.a1.array, a2 = this.a2.array, a3 = this.a3.array;
    a0[o] = x; a0[o + 1] = y; a0[o + 2] = z; a0[o + 3] = time;
    a1[o] = vx; a1[o + 1] = vy; a1[o + 2] = vz; a1[o + 3] = life;
    a2[o] = r; a2[o + 1] = g; a2[o + 2] = b; a2[o + 3] = size;
    a3[o] = gravity; a3[o + 1] = drag; a3[o + 2] = sizeEnd; a3[o + 3] = shape;
    if (i < this.dirtyMin) this.dirtyMin = i;
    if (i > this.dirtyMax) this.dirtyMax = i;
  }
  upload() {
    if (this.dirtyMax < 0) return;
    for (const a of [this.a0, this.a1, this.a2, this.a3]) {
      a.clearUpdateRanges();
      a.addUpdateRange(this.dirtyMin * 4, (this.dirtyMax - this.dirtyMin + 1) * 4);
      a.needsUpdate = true;
    }
    this.dirtyMin = Infinity; this.dirtyMax = -1;
  }
}

export class Particles {
  constructor(scene, cap) {
    this.glow = new ParticlePool(scene, cap, true);
    this.smoke = new ParticlePool(scene, Math.max(512, cap >> 1), false);
    this.budget = 1;   // scaled down on low tiers
  }
  // Generic burst helper. opts: count, color (THREE.Color|hex), speed, spread, up, life, size, gravity, drag, sizeEnd, shape, additive, dir
  burst(pos, o = {}) {
    const n = Math.max(1, Math.round((o.count ?? 10) * this.budget));
    const pool = o.additive === false ? this.smoke : this.glow;
    const col = o.color instanceof THREE.Color ? o.color : new THREE.Color(o.color ?? 0xffffff);
    const speed = o.speed ?? 4, spread = o.spread ?? 1, up = o.up ?? 0.5, life = o.life ?? 0.6;
    const intensity = o.intensity ?? (o.additive === false ? 1 : 2.5);
    const dir = o.dir;
    for (let i = 0; i < n; i++) {
      let vx = (Math.random() * 2 - 1), vy = (Math.random() * 2 - 1) * 0.6 + up, vz = (Math.random() * 2 - 1);
      const l = Math.hypot(vx, vy, vz) || 1; vx /= l; vy /= l; vz /= l;
      if (dir) { vx = dir.x + vx * spread; vy = dir.y + vy * spread; vz = dir.z + vz * spread; }
      const s = speed * (0.4 + Math.random() * 0.8);
      const jitter = o.jitter ?? 0.15;
      const cv = o.colorVar ?? 0.15; const f = 1 + (Math.random() - 0.5) * cv;
      pool.emit(
        pos.x + (Math.random() - 0.5) * jitter, pos.y + (Math.random() - 0.5) * jitter, pos.z + (Math.random() - 0.5) * jitter,
        vx * s, vy * s, vz * s, life * (0.6 + Math.random() * 0.8),
        col.r * f * intensity, col.g * f * intensity, col.b * f * intensity,
        (o.size ?? 0.2) * (0.6 + Math.random() * 0.8), o.gravity ?? 0, o.drag ?? 2, o.sizeEnd ?? 0.2, o.shape ?? 0,
      );
    }
  }
  upload() { this.glow.upload(); this.smoke.upload(); }
}
