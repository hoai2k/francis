// Builds a complete map: sky, fog, lights, ground/water/lava, the track and
// its themed scenery (from the track definition's decor function) plus
// ambient particles (snow, embers, stars).
import * as THREE from 'three';
import { Track } from './track.js';
import { BrickBuilder, baseplateMat } from './lego.js';
import { rng, LEGO } from './decor.js';

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
  // Is there solid ground plane at (x, z) to drive on off the road? Not on maps without ground or
  // with a lava floor, and not where the ground is cut away for water / holes.
  groundAt(x, z) {
    if (!this.ground || this.theme.noGround || this.theme.groundOpts?.emissive) return false;
    const m = this.groundMask;
    return !m?.test || m.test(x, z);
  }
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
    this.buildRoofs();
    this.ambient = th.particles ? new Ambient(th.particles, scene) : null;
    this.time = 0;
  }

  decorContext(group) {
    const tr = this.track, bounds = this.bounds;
    const rand = rng(this.def.seed || 1234);
    // claimed circles, bucketed in a coarse grid so free() only checks nearby ones
    const CELL = 32, cells = new Map();
    const claims = {
      push([x, z, r]) {
        const c = [x, z, r];
        for (let a = Math.floor((x - r) / CELL); a <= Math.floor((x + r) / CELL); a++) {
          for (let b = Math.floor((z - r) / CELL); b <= Math.floor((z + r) / CELL); b++) {
            const k = a * 65536 + b;
            let list = cells.get(k); if (!list) cells.set(k, list = []);
            list.push(c);
          }
        }
      },
      free(x, z, r) {
        for (let a = Math.floor((x - r) / CELL); a <= Math.floor((x + r) / CELL); a++) {
          for (let b = Math.floor((z - r) / CELL); b <= Math.floor((z + r) / CELL); b++) {
            const list = cells.get(a * 65536 + b);
            if (list) for (const c of list) if (Math.hypot(c[0] - x, c[1] - z) < c[2] + r) return false;
          }
        }
        return true;
      },
    };
    const ctx = {
      track: tr, group, scene: this.scene, rand, bounds, world: this,
      // scenery builders: with Legoized on, plain boxes get brick courses and studded tops
      b: new BrickBuilder(1, 160, { lego: LEGO.on }),
      bNoShadow: new BrickBuilder(1, 400, { lego: LEGO.on }),
      anim: (fn) => this.anims.push(fn),
      hazard: (h) => { this.hazards.push(h); return h; },
      obstacle: (x, z, r, h, y0) => tr.addObstacle(x, z, r, h, y0),
      // cut holes (black in the mask) into the base ground, e.g. for rivers; mask must span 3000 units
      cutGround: (mask) => {
        const m = this.ground?.material;
        if (!m) return;
        m.alphaMap = new THREE.CanvasTexture(mask); m.alphaTest = 0.5; m.needsUpdate = true;
        this.groundMask = mask;   // where the ground still is (drivable off-road, see groundAt)
      },
      free(x, z, r) { return claims.free(x, z, r); },
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
          // cheapest checks first (same result: every check must pass and rand() is already drawn)
          if (!ctx.free(x, z, r)) continue;
          if (test && !test(x, z)) continue;
          const c = tr.clearance(x, z, maxC + 1, minC + r);
          if (c < minC + r || c > maxC) continue;
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

  // Rooftops for gliders: a height grid of the tops of the scenery beside the track (buildings,
  // walls, rocks, trees), so a glider rides across them instead of flying through. Only surfaces
  // standing above the ground count, and the road corridor is left out, so arches, gates, tunnels
  // and bridges over the road change nothing. Built once per map from the scenery's up-facing faces.
  buildRoofs() {
    const tr = this.track, b = this.bounds, CELL = 2, pad = 260;
    const x0 = b.minX - pad, z0 = b.minZ - pad;
    const W = Math.ceil((b.maxX - b.minX + pad * 2) / CELL), H = Math.ceil((b.maxZ - b.minZ + pad * 2) / CELL);
    const top = new Float32Array(W * H).fill(-Infinity);
    const floor = tr.groundY + 1.5;
    const M = new THREE.Matrix4(), IM = new THREE.Matrix4(), v = new THREE.Vector3(), sph = new THREE.Sphere();
    let P = new Float32Array(0);
    const raster = (pos, idx) => {
      const tris = idx ? idx.length / 3 : pos.count / 3;
      for (let t = 0; t < tris; t++) {
        const ia = (idx ? idx[t * 3] : t * 3) * 3, ib = (idx ? idx[t * 3 + 1] : t * 3 + 1) * 3, ic = (idx ? idx[t * 3 + 2] : t * 3 + 2) * 3;
        const ax = P[ia], ay = P[ia + 1], az = P[ia + 2], bx = P[ib], by = P[ib + 1], bz = P[ib + 2], cx = P[ic], cy = P[ic + 1], cz = P[ic + 2];
        if (Math.max(ay, by, cy) < floor) continue;
        // facing up (or down: a face's underside is always below its top, so it never wins)
        const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        const nl = Math.hypot(nx, ny, nz);
        if (!nl || Math.abs(ny) < 0.35 * nl) continue;
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / CELL)), i1 = Math.min(W - 1, Math.floor((Math.max(ax, bx, cx) - x0) / CELL));
        const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / CELL)), j1 = Math.min(H - 1, Math.floor((Math.max(az, bz, cz) - z0) / CELL));
        if (i0 > i1 || j0 > j1) continue;
        const det = ux * wz - uz * wx;
        let hit = false;
        if (Math.abs(det) > 1e-9) {
          for (let j = j0; j <= j1; j++) {
            const pz = z0 + (j + 0.5) * CELL - az;
            for (let i = i0; i <= i1; i++) {
              const px = x0 + (i + 0.5) * CELL - ax;
              const s1 = (px * wz - pz * wx) / det, s2 = (ux * pz - uz * px) / det;
              if (s1 < -0.01 || s2 < -0.01 || s1 + s2 > 1.01) continue;
              const y = ay + s1 * uy + s2 * wy, k = j * W + i;
              if (y > top[k]) top[k] = y;
              hit = true;
            }
          }
        }
        // smaller than a cell: it still marks the cell it sits in
        if (!hit) {
          const k = Math.floor(((az + bz + cz) / 3 - z0) / CELL) * W + Math.floor(((ax + bx + cx) / 3 - x0) / CELL), y = (ay + by + cy) / 3;
          if (k >= 0 && k < top.length && y > top[k]) top[k] = y;
        }
      }
    };
    this.group.updateMatrixWorld(true);
    this.group.traverseVisible((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes.position) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      // see-through things (water, glass domes, glows), the insides of sky domes and anything huge
      if (!m || m.transparent || m.side === THREE.BackSide || m.fog === false) return;
      const g = o.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : null;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld).radius > 500) return;
      if (P.length < pos.count * 3) P = new Float32Array(pos.count * 3);
      const n = o.isInstancedMesh ? o.count : 1;
      for (let c = 0; c < n; c++) {
        if (o.isInstancedMesh) { o.getMatrixAt(c, IM); M.multiplyMatrices(o.matrixWorld, IM); } else M.copy(o.matrixWorld);
        for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(M); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; }
        raster(pos, idx);
      }
    });
    // only things a glider could sit on: thin ones (lamp posts, antennas, fences, flagpoles) are taken
    // out by a 3x3 opening (min, then max), which leaves anything about 6 units across or more as it was
    const open = (src, pick) => {
      const out = new Float32Array(W * H);
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          let m = src[j * W + i];
          for (let dj = -1; dj <= 1; dj++) {
            const jj = j + dj;
            if (jj < 0 || jj >= H) { m = pick(m, -Infinity); continue; }
            for (let di = -1; di <= 1; di++) {
              const ii = i + di;
              m = pick(m, ii < 0 || ii >= W ? -Infinity : src[jj * W + ii]);
            }
          }
          out[j * W + i] = m;
        }
      }
      return out;
    };
    top.set(open(open(top, Math.min), Math.max));
    // the road corridor (road, shoulders and a kart's width more) stays clear
    for (let i = 0; i < tr.N; i++) {
      const r = tr.HW[i] + tr.SH[i] + 2.5, px = tr.px(i), pz = tr.pz(i);
      const i0 = Math.max(0, Math.floor((px - r - x0) / CELL)), i1 = Math.min(W - 1, Math.floor((px + r - x0) / CELL));
      const j0 = Math.max(0, Math.floor((pz - r - z0) / CELL)), j1 = Math.min(H - 1, Math.floor((pz + r - z0) / CELL));
      for (let j = j0; j <= j1; j++) {
        const dz = z0 + (j + 0.5) * CELL - pz;
        for (let a = i0; a <= i1; a++) { const dx = x0 + (a + 0.5) * CELL - px; if (dx * dx + dz * dz < r * r) top[j * W + a] = -Infinity; }
      }
    }
    this.roofs = { top, x0, z0, W, H, CELL };
  }

  // the top of the scenery under (x, z), or -Infinity where there is none (see buildRoofs)
  roofAt(x, z) {
    const r = this.roofs;
    if (!r) return -Infinity;
    const i = Math.floor((x - r.x0) / r.CELL), j = Math.floor((z - r.z0) / r.CELL);
    return i < 0 || j < 0 || i >= r.W || j >= r.H ? -Infinity : r.top[j * r.W + i];
  }

  update(dt, focus) {
    this.time += dt;
    this.track.update(dt);
    for (const f of this.anims) f(dt, this.time);
    if (this.ambient && focus) this.ambient.update(dt, focus);
  }

  // centre the shadow frustum on the viewer
  // half = the shadow area's half-width (75 normally; split screen can share one larger area)
  aimSun(focus, half = 75) {
    const sc = this.sun.shadow.camera;
    if (sc.right !== half) { sc.left = sc.bottom = -half; sc.right = sc.top = half; sc.updateProjectionMatrix(); }
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 200);
    this.sun.target.updateMatrixWorld();
  }

  dispose() {
    // geometry and textures are freed (most are per-map: road, signs, banners, masks). Some textures
    // are module caches reused next race; three uploads those again on first use, so freeing them is
    // safe. Materials are kept: they're cheap and mostly shared, and freeing them would recompile
    // shaders every race. Render-target textures (the environment map) can't be re-made by uploading,
    // so they're never freed here.
    const textures = new Set();
    const addTex = (v) => { if (v && v.isTexture && !v.isRenderTargetTexture) textures.add(v); };
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) {
        for (const v of Object.values(m)) addTex(v);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) addTex(u?.value);
      }
    });
    for (const t of textures) t.dispose();
    this.scene.clear();
  }
}
