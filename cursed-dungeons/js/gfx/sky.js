// Sky dome and voxel clouds.
//
// The sky is the scene background node: a gradient (horizon → zenith) with a
// glowing sun disc and halo, warm horizon haze towards the sun, stars and a
// moon at night, and an optional dark void below the horizon for levels that
// float over nothing.
//
// Clouds are Minecraft-style flat-bottomed cuboids in one merged mesh (one
// draw call). Their layout is a periodic field of CLOUD_N × CLOUD_N cells that
// wraps around the camera in the vertex shader, so the sky is endless and the
// CPU never touches it after a (re)build. The same layout sits in a uniform
// array, so the cloud shadows on the ground (envNodes.js cloudShadow) match
// the clouds exactly as they drift.
import * as THREE from 'three/webgpu';
import {
  positionWorldDirection, positionLocal, normalLocal, attribute, normalize, vec3, vec4, float, uniform,
  max, min, pow, dot, mix, smoothstep, floor, fract, sin, step, cameraPosition, length, clamp, exp,
} from 'three/tsl';
import { E, CLOUD_N, CLOUD_CELL, CLOUD_S } from './envNodes.js';
import { mulberry32 } from '../util.js';

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.sunTrue = uniform(new THREE.Vector3(0, 1, 0));   // real sun direction (may be below the horizon)
    this.moonDir = uniform(new THREE.Vector3(0, -1, 0));
    this.sunDisc = uniform(new THREE.Color(1, 0.9, 0.7));
    this.moonAmt = uniform(0);
    this.cloudTint = uniform(new THREE.Color(1, 1, 1));
    this.buildBackground();
    this.mesh = null;
    this.opts = { coverage: 0.45, height: 84, speed: 1.6, seed: 7, shadows: 0.32, thickness: 5 };
    this.wind = new THREE.Vector2(1, 0.35).normalize();
    this.enabled = true;
  }

  buildBackground() {
    const d = normalize(positionWorldDirection);
    const h = max(d.y, 0);
    const base = mix(vec3(E.skyHor), vec3(E.skyTop), float(1).sub(exp(h.mul(-6.5))));
    const sd = dot(d, this.sunTrue);
    const s0 = max(sd, 0);
    // warm haze towards the sun near the horizon, a broad glow and a tight halo
    const horizon = smoothstep(0.45, 0.0, h);
    const haze = vec3(E.sunColor).mul(pow(s0, 5).mul(horizon).mul(0.16).add(pow(s0, 48).mul(0.22)));
    const disc = vec3(this.sunDisc).mul(smoothstep(0.99935, 0.99965, sd)).mul(smoothstep(-0.03, 0.02, d.y));
    // a pale band of haze right on the horizon
    const band = vec3(E.fogColor).mul(smoothstep(0.12, 0.0, h)).mul(0.35);
    // stars and the moon
    const cell = floor(d.mul(170));
    const hs = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
    const tw = sin(hs.mul(80).add(E.focus.x.mul(0.0))).mul(0.3).add(0.7);
    const stars = vec3(1.0, 1.0, 1.15).mul(step(0.9965, hs)).mul(tw).mul(E.stars).mul(smoothstep(0.0, 0.25, d.y)).mul(2.2);
    const md = dot(d, this.moonDir);
    const moon = vec3(1.4, 1.45, 1.6).mul(smoothstep(0.99905, 0.9993, md)).add(vec3(0.15, 0.2, 0.35).mul(pow(max(md, 0), 60))).mul(this.moonAmt);
    const above = base.mul(float(1).add(0)).add(haze).add(disc).add(band.mul(float(1).sub(E.stars.mul(0.6)))).add(stars).add(moon);
    // below the horizon: haze colour, optionally fading into a dark abyss
    const below = mix(vec3(E.fogColor).mul(0.85), vec3(E.fogColor).mul(0.05).add(vec3(0.003, 0.003, 0.008)), smoothstep(-0.02, -0.6, d.y).mul(E.abyss));
    this.scene.backgroundNode = mix(below, above, smoothstep(-0.035, 0.01, d.y));
  }

  // ---------------------------------------------------------------- clouds
  setClouds(o = {}) {
    Object.assign(this.opts, o);
    if (o.enabled != null) this.enabled = !!o.enabled;
    E.cloudY.value = this.opts.height;
    this.build();
  }
  build() {
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
    const O = this.opts, R = mulberry32(O.seed | 0);
    const rects = E.cloudRects.array;
    for (const v of rects) v.set(0, 0, 0, 0);
    const pos = [], nrm = [], ctr = [], idx = [];
    let n = 0;
    const box = (cx, cz, hw, hd, y0, y1) => {
      // 6 faces; positions relative to the box centre on the ground plane of the cloud layer
      const F = [
        [[1, 0, 0], [[hw, y0, hd], [hw, y0, -hd], [hw, y1, -hd], [hw, y1, hd]]],
        [[-1, 0, 0], [[-hw, y0, -hd], [-hw, y0, hd], [-hw, y1, hd], [-hw, y1, -hd]]],
        [[0, 1, 0], [[-hw, y1, hd], [hw, y1, hd], [hw, y1, -hd], [-hw, y1, -hd]]],
        [[0, -1, 0], [[-hw, y0, -hd], [hw, y0, -hd], [hw, y0, hd], [-hw, y0, hd]]],
        [[0, 0, 1], [[-hw, y0, hd], [hw, y0, hd], [hw, y1, hd], [-hw, y1, hd]]],
        [[0, 0, -1], [[hw, y0, -hd], [-hw, y0, -hd], [-hw, y1, -hd], [hw, y1, -hd]]],
      ];
      for (const [nn, quad] of F) {
        for (const p of quad) { pos.push(...p); nrm.push(...nn); ctr.push(cx, 0, cz); }
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
      }
    };
    for (let j = 0; j < CLOUD_N; j++) for (let i = 0; i < CLOUD_N; i++) {
      const k = (j * CLOUD_N + i) * 2;
      if (R() > O.coverage) { R(); R(); R(); continue; }
      const x0 = i * CLOUD_CELL, z0 = j * CLOUD_CELL;
      const hw = 6 + R() * 11, hd = 5 + R() * 10;
      const cx = x0 + hw + 1 + R() * Math.max(0, CLOUD_CELL - 2 * hw - 2), cz = z0 + hd + 1 + R() * Math.max(0, CLOUD_CELL - 2 * hd - 2);
      const th = O.thickness * (0.7 + R() * 0.6);
      box(cx, cz, hw, hd, 0, th);
      rects[k].set(cx, cz, hw, hd);
      if (R() < 0.75) {
        // a second, smaller block overlapping the first: the chunky stepped silhouette
        const bw = hw * (0.35 + R() * 0.4), bd = hd * (0.35 + R() * 0.4);
        const ox = (R() - 0.5) * (hw * 1.4), oz = (R() - 0.5) * (hd * 1.4);
        const bx = Math.min(x0 + CLOUD_CELL - bw - 0.5, Math.max(x0 + bw + 0.5, cx + ox));
        const bz = Math.min(z0 + CLOUD_CELL - bd - 0.5, Math.max(z0 + bd + 0.5, cz + oz));
        box(bx, bz, bw, bd, 0, th + 1 + R() * 2.5);
        rects[k + 1].set(bx, bz, bw, bd);
      }
    }
    if (!n) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('center', new THREE.Float32BufferAttribute(ctr, 3));
    g.setIndex(idx);
    const m = this.material ?? (this.material = this.makeMaterial());
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.renderOrder = -5; mesh.name = 'clouds';
    mesh.visible = this.enabled;
    this.mesh = mesh;
    this.scene.add(mesh);
  }
  makeMaterial() {
    const m = new THREE.MeshBasicNodeMaterial({ fog: false });
    const c = attribute('center', 'vec3');
    const w = c.xz.add(E.cloudOffset);
    const rel = w.sub(cameraPosition.xz).add(CLOUD_S / 2);
    const wrapped = w.sub(floor(rel.div(CLOUD_S)).mul(CLOUD_S));
    m.positionNode = vec3(wrapped.x.add(positionLocal.x), E.cloudY.add(positionLocal.y), wrapped.y.add(positionLocal.z));
    const n = normalLocal;
    const lit = max(dot(n, E.sunDir), 0);
    const sky = mix(vec3(E.skyHor), vec3(E.skyTop), n.y.mul(0.5).add(0.5));
    const bottom = smoothstep(-0.5, -0.9, n.y);
    const top = smoothstep(0.5, 0.9, n.y);
    // bright Minecraft-white by day (warm on the sunny side), slate blue at night
    const white = mix(vec3(0.13, 0.15, 0.24), vec3(1.0, 1.0, 1.03), E.day);
    let col = white.mul(float(0.7).add(top.mul(0.3))).add(vec3(E.sunColor).mul(lit.mul(0.11))).add(sky.mul(0.18));
    col = col.mul(float(1).sub(bottom.mul(0.2))).add(vec3(E.sunColor).mul(E.golden).mul(bottom.add(0.3)).mul(0.07)).mul(vec3(this.cloudTint));
    // fade into the sky behind them with distance (the camera's far plane is ~220)
    const wp = vec3(wrapped.x.add(positionLocal.x), E.cloudY.add(positionLocal.y), wrapped.y.add(positionLocal.z));
    const dist = length(wp.xz.sub(cameraPosition.xz));
    const dir = normalize(wp.sub(cameraPosition));
    const behind = mix(vec3(E.skyHor), vec3(E.skyTop), float(1).sub(exp(max(dir.y, 0).mul(-6.5)))).add(vec3(E.fogColor).mul(smoothstep(0.12, 0.0, max(dir.y, 0))).mul(0.35));
    const f = smoothstep(135, 212, dist);
    m.colorNode = vec4(mix(col, behind, f), 1);
    return m;
  }

  // per frame: drift + uniforms from the time-of-day state
  update(dt, S) {
    const sp = this.opts.speed * dt;
    E.cloudOffset.value.x = (E.cloudOffset.value.x + this.wind.x * sp) % CLOUD_S;
    E.cloudOffset.value.y = (E.cloudOffset.value.y + this.wind.y * sp) % CLOUD_S;
    if (S) {
      this.sunTrue.value.copy(S.sunDir);
      this.moonDir.value.copy(S.moonDir);
      const up = clamp01((S.sunEl * 180 / Math.PI + 2) / 4);
      this.sunDisc.value.copy(S.sun).multiplyScalar(14 * up);
      this.moonAmt.value = S.stars;
    }
    if (this.mesh) this.mesh.visible = this.enabled;
  }
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));
void min; void clamp;
