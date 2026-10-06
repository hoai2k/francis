// CPU particle pools rendered as soft point sprites, shockwave rings and ambient motes.
import * as THREE from 'three';
import { G } from './state.js';
import { glowSprite } from './textures.js';
import { rand } from './util.js';

const VERT = /* glsl */ `
  attribute float size; attribute float alpha; attribute vec3 color;
  varying vec3 vC; varying float vA;
  uniform float scale;
  void main(){
    vC = color; vA = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * scale / max(0.1, -mv.z);
  }`;
const FRAG = /* glsl */ `
  uniform sampler2D map; varying vec3 vC; varying float vA;
  void main(){
    float a = texture2D(map, gl_PointCoord).a * vA;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vC * a, a);
  }`;
const FRAG_SMOKE = /* glsl */ `
  uniform sampler2D map; varying vec3 vC; varying float vA;
  void main(){
    float a = texture2D(map, gl_PointCoord).a * vA;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vC, a);
  }`;

class Pool {
  constructor(cap, additive) {
    this.cap = cap;
    this.n = 0;
    const f = (k) => new Float32Array(cap * k);
    this.p = f(3); this.v = f(3); this.c0 = f(3); this.c1 = f(3);
    this.life = f(1); this.max = f(1); this.s0 = f(1); this.s1 = f(1); this.drag = f(1); this.grav = f(1); this.a0 = f(1);
    this.geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(f(3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(f(3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(f(1), 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(f(1), 1).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.aPos);
    this.geo.setAttribute('color', this.aCol);
    this.geo.setAttribute('size', this.aSize);
    this.geo.setAttribute('alpha', this.aAlpha);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowSprite() }, scale: { value: 300 } },
      vertexShader: VERT,
      fragmentShader: additive ? FRAG : FRAG_SMOKE,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
  }
  add(px, py, pz, vx, vy, vz, c0, c1, s0, s1, life, drag, grav, alpha) {
    let i;
    if (this.n < this.cap) i = this.n++;
    else i = Math.floor(Math.random() * this.cap);
    const i3 = i * 3;
    this.p[i3] = px; this.p[i3 + 1] = py; this.p[i3 + 2] = pz;
    this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz;
    this.c0[i3] = c0.r; this.c0[i3 + 1] = c0.g; this.c0[i3 + 2] = c0.b;
    this.c1[i3] = c1.r; this.c1[i3 + 1] = c1.g; this.c1[i3 + 2] = c1.b;
    this.s0[i] = s0; this.s1[i] = s1; this.life[i] = life; this.max[i] = life; this.drag[i] = drag; this.grav[i] = grav; this.a0[i] = alpha;
  }
  update(dt) {
    const P = this.aPos.array, C = this.aCol.array, S = this.aSize.array, A = this.aAlpha.array;
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap-remove
        const j = --this.n;
        if (i !== j) {
          for (const arr of [this.p, this.v, this.c0, this.c1]) { arr[i * 3] = arr[j * 3]; arr[i * 3 + 1] = arr[j * 3 + 1]; arr[i * 3 + 2] = arr[j * 3 + 2]; }
          for (const arr of [this.life, this.max, this.s0, this.s1, this.drag, this.grav, this.a0]) arr[i] = arr[j];
        }
        continue;
      }
      const i3 = i * 3;
      const d = Math.exp(-this.drag[i] * dt);
      this.v[i3] *= d; this.v[i3 + 1] = this.v[i3 + 1] * d - this.grav[i] * dt; this.v[i3 + 2] *= d;
      this.p[i3] += this.v[i3] * dt; this.p[i3 + 1] += this.v[i3 + 1] * dt; this.p[i3 + 2] += this.v[i3 + 2] * dt;
      const k = 1 - this.life[i] / this.max[i];
      P[i3] = this.p[i3]; P[i3 + 1] = this.p[i3 + 1]; P[i3 + 2] = this.p[i3 + 2];
      C[i3] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * k;
      C[i3 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * k;
      C[i3 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * k;
      S[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      A[i] = this.a0[i] * Math.min(1, (1 - k) * 3) * Math.min(1, k * 12 + 0.2);
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = true;
  }
}

const _c0 = new THREE.Color(), _c1 = new THREE.Color();
const _v = new THREE.Vector3();

export class FX {
  constructor(scene, q) {
    this.q = q;
    this.add = new Pool(Math.floor(9000 * q), true);
    this.smoke = new Pool(Math.floor(2500 * q), false);
    scene.add(this.add.points, this.smoke.points);
    this.rings = [];
    this.ringGeo = new THREE.RingGeometry(0.85, 1, 48);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.sphereGeo = new THREE.SphereGeometry(1, 24, 16);
    this.scene = scene;
    this.ambient = new Ambient(scene, q);
  }
  // generic emitter
  emit(o) {
    const n = Math.max(1, Math.round((o.count ?? 10) * (o.noScale ? 1 : this.q)));
    const pool = o.smoke ? this.smoke : this.add;
    _c0.set(o.color ?? 0xffffff);
    if (o.intensity) _c0.multiplyScalar(o.intensity);
    _c1.copy(o.color2 != null ? _c1.set(o.color2) : _c0);
    if (o.color2 != null && o.intensity2) _c1.multiplyScalar(o.intensity2);
    const p = o.pos;
    const sp = o.speed ?? 2;
    for (let i = 0; i < n; i++) {
      let vx = (Math.random() - 0.5) * 2, vy = (Math.random() - 0.5) * 2, vz = (Math.random() - 0.5) * 2;
      const l = Math.hypot(vx, vy, vz) || 1;
      const s = sp * (0.4 + Math.random() * 0.6);
      vx = (vx / l) * s; vy = (vy / l) * s; vz = (vz / l) * s;
      if (o.vel) { vx += o.vel.x; vy += o.vel.y; vz += o.vel.z; }
      if (o.up) vy += o.up * Math.random();
      const r = o.spread ?? 0;
      pool.add(
        p.x + (Math.random() - 0.5) * r, p.y + (Math.random() - 0.5) * r, p.z + (Math.random() - 0.5) * r,
        vx, vy, vz, _c0, _c1,
        (o.size ?? 0.3) * (0.7 + Math.random() * 0.6), o.size1 ?? (o.size ?? 0.3) * 0.2,
        (o.life ?? 0.6) * (0.6 + Math.random() * 0.8), o.drag ?? 2, o.gravity ?? 0, o.alpha ?? 1,
      );
    }
  }
  burst(pos, color, n = 30, speed = 5, extra = {}) {
    this.emit({ pos, color, count: n, speed, size: 0.25, life: 0.6, drag: 3, intensity: 3, ...extra });
  }
  smokePuff(pos, color = 0x444444, n = 8, extra = {}) {
    this.emit({ pos, color, count: n, speed: 1, size: 1.2, size1: 2.6, life: 1.4, drag: 1.5, smoke: true, alpha: 0.35, up: 1.2, ...extra });
  }
  // expanding ground/air shockwave ring
  shock(pos, color, radius = 4, dur = 0.5, opts = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(opts.intensity ?? 3), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(opts.sphere ? this.sphereGeo : this.ringGeo, mat);
    m.position.copy(pos);
    if (opts.vertical) { m.rotation.x = Math.PI / 2; m.lookAt(G.camera.position); m.rotateX(Math.PI / 2); }
    m.scale.setScalar(0.1);
    this.scene.add(m);
    this.rings.push({ m, t: 0, dur, radius });
  }
  update(dt) {
    this.add.update(dt);
    this.smoke.update(dt);
    for (const r of this.rings) {
      r.t += dt;
      const k = r.t / r.dur;
      r.m.scale.setScalar(0.1 + (1 - Math.pow(1 - Math.min(k, 1), 3)) * r.radius);
      r.m.material.opacity = Math.max(0, 1 - k);
    }
    this.rings = this.rings.filter((r) => {
      if (r.t >= r.dur) {
        this.scene.remove(r.m);
        r.m.material.dispose();
        return false;
      }
      return true;
    });
    const h = G.renderer.domElement.height;
    this.add.mat.uniforms.scale.value = this.smoke.mat.uniforms.scale.value = h * 0.9;
    this.ambient.update(dt);
  }
  clear() {
    this.add.n = 0;
    this.smoke.n = 0;
  }
}

// Dust motes and magical sparkles drifting around the camera.
class Ambient {
  constructor(scene, q) {
    const n = Math.floor(500 * q);
    this.n = n;
    this.box = 26;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-1, 1) * this.box; pos[i * 3 + 1] = rand(-1, 1) * this.box * 0.5; pos[i * 3 + 2] = rand(-1, 1) * this.box;
      seed[i] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.u = { time: { value: 0 }, center: { value: new THREE.Vector3() }, box: { value: this.box }, map: { value: glowSprite() }, tint: { value: new THREE.Color(1, 0.85, 0.6) }, amount: { value: 1 }, scale: { value: 600 } };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float seed; uniform float time, box, scale; uniform vec3 center; varying float vA; varying float vS;
        void main(){
          vec3 p = position + vec3(sin(time*0.13+seed)*2.0, time*0.15*(0.5+fract(seed)), cos(time*0.11+seed*1.7)*2.0);
          p = mod(p - center + box, 2.0*box) - box + center;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float sparkle = step(0.9, fract(seed*7.31));
          vS = sparkle;
          float tw = sparkle > 0.5 ? pow(0.5+0.5*sin(time*2.5+seed*30.0), 6.0) : 0.6+0.4*sin(time*1.5+seed);
          vA = tw * smoothstep(box, box*0.4, length(p-center)) * smoothstep(0.5, 3.0, -mv.z);
          gl_PointSize = (sparkle > 0.5 ? 0.22 : 0.07) * scale / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map; uniform vec3 tint; uniform float amount; varying float vA; varying float vS;
        void main(){ float a = texture2D(map, gl_PointCoord).a * vA * amount; vec3 c = mix(tint, vec3(0.8,0.9,1.6), vS) * (1.0 + vS*2.0); gl_FragColor = vec4(c*a*0.8, a); }`,
    });
    this.pts = new THREE.Points(g, this.mat);
    this.pts.frustumCulled = false;
    scene.add(this.pts);
  }
  update(dt) {
    this.u.time.value += dt;
    this.u.center.value.copy(G.camera.position);
    this.u.scale.value = G.renderer.domElement.height * 0.9;
    const outdoor = G.zone?.outdoor;
    this.u.tint.value.set(outdoor ? 0xfff0c0 : 0xffc890);
    this.u.amount.value = outdoor ? 0.5 + (G.night ?? 0) * 0.4 : 1;
  }
}
