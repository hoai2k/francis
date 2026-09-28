// Builds a complete map: sky, fog, lights, ground/water/lava, the track and
// its themed scenery (from the track definition's decor function) plus
// ambient particles (snow, embers, stars).
import * as THREE from 'three';
import { Track } from './track.js';
import { BrickBuilder, baseplateMat } from './lego.js';
import { rng } from './decor.js';

function skyDome(top, horizon, bottom) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, bot: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(hor, bot, pow(clamp(-h,0.0,1.0), 0.4));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}

function stars(count, r, rand, size = 2.2) {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = Math.sin(a) * s * r;
    c.setHSL(rand(), 0.6, 0.75 + rand() * 0.25);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  p.frustumCulled = false;
  return p;
}

// Particles that drift around the viewer (snow, embers, sparkles).
class Ambient {
  constructor(kind, scene) {
    this.kind = kind;
    const n = kind === 'snow' ? 1800 : 700;
    this.n = n;
    this.box = 120;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.reset(i, true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const color = kind === 'snow' ? 0xffffff : kind === 'embers' ? 0xff7a20 : 0xfff2a0;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g2 = c.getContext('2d'); const gr = g2.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32);
    this.mat = new THREE.PointsMaterial({ color, map: new THREE.CanvasTexture(c), size: kind === 'snow' ? 0.7 : 0.6, transparent: true, opacity: 0.9, depthWrite: false, blending: kind === 'snow' ? THREE.NormalBlending : THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.center = new THREE.Vector3();
  }
  reset(i, init) {
    const B = this.box;
    this.pos[i * 3] = (Math.random() - 0.5) * B;
    this.pos[i * 3 + 1] = init ? Math.random() * 50 - 5 : (this.kind === 'embers' ? -5 : 45);
    this.pos[i * 3 + 2] = (Math.random() - 0.5) * B;
    if (this.kind === 'snow') { this.vel[i * 3] = (Math.random() - 0.5) * 2; this.vel[i * 3 + 1] = -3 - Math.random() * 3; this.vel[i * 3 + 2] = (Math.random() - 0.5) * 2; }
    else { this.vel[i * 3] = (Math.random() - 0.5) * 1.5; this.vel[i * 3 + 1] = 2 + Math.random() * 4; this.vel[i * 3 + 2] = (Math.random() - 0.5) * 1.5; }
  }
  update(dt, focus) {
    // particles live in a box that follows the focus point (wrapping)
    const B = this.box, h = B / 2;
    this.points.position.set(Math.floor(focus.x / B) * B, focus.y, Math.floor(focus.z / B) * B);
    const ox = focus.x - this.points.position.x, oz = focus.z - this.points.position.z;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      if (this.kind === 'snow') this.pos[k] += Math.sin(this.pos[k + 1] * 0.3 + i) * dt;
      // wrap horizontally relative to focus
      while (this.pos[k] - ox > h) this.pos[k] -= B;
      while (this.pos[k] - ox < -h) this.pos[k] += B;
      while (this.pos[k + 2] - oz > h) this.pos[k + 2] -= B;
      while (this.pos[k + 2] - oz < -h) this.pos[k + 2] += B;
      if (this.pos[k + 1] < -8 || this.pos[k + 1] > 50) this.reset(i, false);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

// Plane textured as a studded baseplate, optionally cut out by a mask canvas.
export function groundPlane(color, y, size, pitch, opts = {}) {
  const mat = baseplateMat(color, pitch, opts.rough ?? 0.6);
  const g = new THREE.PlaneGeometry(size, size, 1, 1);
  g.rotateX(-Math.PI / 2);
  mat.map.repeat.set(size / (2 * pitch), size / (2 * pitch));
  mat.bumpMap.repeat.copy(mat.map.repeat);
  if (opts.mask) {
    const t = new THREE.CanvasTexture(opts.mask);
    mat.alphaMap = t;
    mat.alphaTest = 0.5;
  }
  if (opts.emissive) { mat.emissive = new THREE.Color(opts.emissive); mat.emissiveIntensity = opts.emissiveIntensity ?? 1; mat.emissiveMap = mat.map; }
  if (opts.transparent) { mat.transparent = true; mat.opacity = opts.opacity ?? 0.8; mat.roughness = opts.rough ?? 0.1; }
  const m = new THREE.Mesh(g, mat);
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

export class World {
  constructor(def, scene) {
    this.def = def;
    this.scene = scene;
    const th = def.theme;
    this.theme = th;
    this.anims = [];
    this.hazards = [];
    scene.background = new THREE.Color(th.sky[1]);
    this.sky = skyDome(th.sky[0], th.sky[1], th.sky[2] ?? th.sky[1]);
    scene.add(this.sky);
    scene.fog = new THREE.Fog(th.fog?.[0] ?? th.sky[1], th.fog?.[1] ?? 120, th.fog?.[2] ?? 900);
    scene.environmentIntensity = th.envIntensity ?? 0.7;

    this.hemi = new THREE.HemisphereLight(th.hemi?.[0] ?? 0xcfe6ff, th.hemi?.[1] ?? 0x445544, th.hemi?.[2] ?? 1.1);
    scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(th.sun?.color ?? 0xffffff, th.sun?.intensity ?? 2.4);
    this.sunDir = new THREE.Vector3(...(th.sun?.dir ?? [0.5, 1, 0.35])).normalize();
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 500;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    this.sun = sun;

    this.track = new Track(def, scene);
    const tr = this.track;
    // bounds
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < tr.N; i++) { minX = Math.min(minX, tr.px(i)); maxX = Math.max(maxX, tr.px(i)); minZ = Math.min(minZ, tr.pz(i)); maxZ = Math.max(maxZ, tr.pz(i)); }
    this.bounds = { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };

    if (!th.noGround) {
      this.ground = groundPlane(th.ground, tr.groundY - 0.08, 3000, th.groundPitch ?? 1.6, th.groundOpts || {});
      scene.add(this.ground);
    }
    if (th.stars) {
      this.stars = stars(th.stars, 1300, rng(7), 2.0);
      scene.add(this.stars);
    }
    // scenery
    const group = new THREE.Group();
    scene.add(group);
    this.group = group;
    const ctx = this.decorContext(group);
    def.decor?.(ctx);
    group.add(ctx.b.build({ name: 'decor' }));
    group.add(ctx.bNoShadow.build({ name: 'decor-ns', shadows: false }));
    this.ambient = th.particles ? new Ambient(th.particles, scene) : null;
    this.time = 0;
  }

  decorContext(group) {
    const tr = this.track, bounds = this.bounds;
    const rand = rng(this.def.seed || 1234);
    const claims = [];
    const ctx = {
      track: tr, group, scene: this.scene, rand, bounds, world: this,
      b: new BrickBuilder(1, 160),
      bNoShadow: new BrickBuilder(1, 400),
      anim: (fn) => this.anims.push(fn),
      hazard: (h) => { this.hazards.push(h); return h; },
      obstacle: (x, z, r, y0, y1) => tr.addObstacle(x, z, r, y0, y1),
      // cut holes (black in the mask) into the base ground, e.g. for rivers; mask must span 3000 units
      cutGround: (mask) => {
        const m = this.ground?.material;
        if (!m) return;
        m.alphaMap = new THREE.CanvasTexture(mask); m.alphaTest = 0.5; m.needsUpdate = true;
      },
      free(x, z, r) { for (const c of claims) if (Math.hypot(c[0] - x, c[1] - z) < c[2] + r) return false; return true; },
      claim(x, z, r) { claims.push([x, z, r]); },
      // mask canvas helpers: world <-> canvas coordinates over a square area
      makeMask(size, res, draw) {
        const c = document.createElement('canvas');
        c.width = c.height = res;
        const g = c.getContext('2d');
        const toPx = (x, z) => [(x / size + 0.5) * res, (z / size + 0.5) * res];
        g.fillStyle = '#000'; g.fillRect(0, 0, res, res);
        draw(g, toPx, res / size);
        const data = g.getImageData(0, 0, res, res).data;
        c.test = (x, z) => {
          const [px, py] = toPx(x, z);
          if (px < 0 || py < 0 || px >= res || py >= res) return false;
          return data[(Math.floor(py) * res + Math.floor(px)) * 4] > 127;
        };
        return c;
      },
      // try to place n things with clearance in [minC, maxC] from the track edge
      scatter(n, { minC = 4, maxC = 60, r = 3, pad = 120, tries = 30, test = null } = {}, fn) {
        let placed = 0;
        for (let k = 0; k < n * tries && placed < n; k++) {
          const x = bounds.minX - pad + rand() * (bounds.maxX - bounds.minX + pad * 2);
          const z = bounds.minZ - pad + rand() * (bounds.maxZ - bounds.minZ + pad * 2);
          const c = tr.clearance(x, z, maxC + 1);
          if (c < minC + r || c > maxC) continue;
          if (!ctx.free(x, z, r)) continue;
          if (test && !test(x, z)) continue;
          ctx.claim(x, z, r);
          fn(x, z, c);
          placed++;
        }
        return placed;
      },
      // positions along the track edge every `step` samples
      alongside(step, lat, fn, from = 0) {
        for (let i = from; i < tr.N; i += step) {
          if (tr.GAP[i]) continue;
          for (const side of [-1, 1]) {
            const off = tr.HW[i] + tr.SH[i] + lat;
            const p = tr.at(i, off * side, 0);
            fn(p, i, side);
          }
        }
      },
    };
    // keep scenery off the road
    for (let i = 0; i < tr.N; i += 3) claims.push([tr.px(i), tr.pz(i), tr.HW[i] + tr.SH[i] + 1]);
    return ctx;
  }

  update(dt, focus) {
    this.time += dt;
    this.track.update(dt);
    for (const f of this.anims) f(dt, this.time);
    if (this.ambient && focus) this.ambient.update(dt, focus);
  }

  // centre the shadow frustum on the viewer
  aimSun(focus) {
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 200);
    this.sun.target.updateMatrixWorld();
  }

  dispose() {
    // geometry is per-map; materials/textures are shared caches and kept
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.scene.clear();
  }
}
