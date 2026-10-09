import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const ASSETS = './mod/src/main/resources/assets/starfall/';

// Mirrors StrikeType.java in the mod.
const TYPES = {
  ORBITAL_LANCE: { key: 'orbital_lance', color: 0xffd25a, ignite: 40, impact: 100, duration: 150, name: 'ORBITAL LANCE', jp: '衛 星 光 槍' },
  COMET_DASH: { key: 'comet_dash', color: 0x5ef0ff, ignite: 12, impact: 44, duration: 80, name: 'COMET DASH', jp: '彗 星 突' },
  CONSTELLATION: { key: 'constellation', color: 0xc08cff, ignite: 30, impact: 166, duration: 225, name: 'SEVEN STARS', jp: '北 斗 七 星' },
  SUPERNOVA: { key: 'supernova', color: 0xff7a3a, ignite: 60, impact: 176, duration: 270, name: 'SUPERNOVA', jp: '超 新 星' },
};

const WEAPONS = [
  {
    id: 'stellar_remote', name: 'Stellar Remote', type: 'ORBITAL_LANCE', accent: '#ffd25a',
    desc: 'A satellite detonator with a radar screen and a big red button. A targeting reticle locks on, then a satellite in orbit fires a beam that sweeps across the ground and burns a 30-block trench.',
    stats: { 'Skill': 'Orbital Lance', 'Damage area': '30-block trench', 'Film length': '7.5 s', 'Cooldown': '10 s' },
  },
  {
    id: 'starfall_blade', name: 'Starfall Blade', type: 'COMET_DASH', accent: '#5ef0ff',
    desc: 'A netherite-tier sword with a galaxy inside the blade. No star falls: you become the comet. You charge forward through every mob in your way, leap into the air and slam down with a shockwave.',
    stats: { 'Skill': 'Comet Dash', 'Attack damage': '9 (netherite tier)', 'Film length': '4 s', 'Cooldown': '5 s' },
  },
  {
    id: 'seven_stars_scepter', name: 'Seven Stars Scepter', type: 'CONSTELLATION', accent: '#c08cff',
    desc: 'Seven stars float down into the shape of the Big Dipper. Glowing lines join them, a gravity well drags every mob inward, then all seven dive into one implosion.',
    stats: { 'Skill': 'Seven Stars', 'Pull radius': '22 blocks', 'Film length': '11 s', 'Cooldown': '20 s' },
  },
  {
    id: 'supernova_core', name: 'Supernova Core', type: 'SUPERNOVA', accent: '#ff7a3a',
    desc: 'A star appears over the target and swells into a black hole that rips blocks out of the ground and swallows them. Then it collapses and explodes in a supernova that erases a 22-block sphere.',
    stats: { 'Skill': 'Supernova', 'Blast': '22-block sphere', 'Film length': '13.5 s', 'Cooldown': '60 s' },
  },
];

// Palette swatches that glow (unlit) - see tools/gen_assets.py.
const GLOW_SWATCHES = new Set([4, 5, 8, 9, 13, 16, 19]);

// ------------------------------------------------------------ helpers ---
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const progress = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function radialTexture(stops, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function sparkleTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const h = size / 2;
  g.globalCompositeOperation = 'lighter';
  for (const [w, len] of [[0.06, 1], [0.03, 0.7]]) {
    for (let k = 0; k < 2; k++) {
      g.save();
      g.translate(h, h);
      g.rotate(k * Math.PI / 2 + (len < 1 ? Math.PI / 4 : 0));
      const grad = g.createLinearGradient(-h * len, 0, h * len, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(0, 0, h * len, size * w, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const GLOW_TEX = radialTexture([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
const SPARKLE_TEX = sparkleTexture();
const SMOKE_TEX = radialTexture([[0, 'rgba(255,255,255,0.8)'], [0.6, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']], 64);

// ------------------------------------------------- Minecraft model loader ---
let paletteTex;
function loadPalette() {
  if (!paletteTex) {
    paletteTex = new Promise((resolve, reject) => new THREE.TextureLoader().load(ASSETS + 'textures/item/palette.png', (t) => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      resolve(t);
    }, undefined, reject));
  }
  return paletteTex;
}

const modelCache = new Map();
async function loadModel(id) {
  if (!modelCache.has(id)) {
    modelCache.set(id, Promise.all([fetch(ASSETS + 'models/item/' + id + '.json').then((r) => r.json()), loadPalette()]));
  }
  const [json, tex] = await modelCache.get(id);
  return buildModel(json, tex);
}

/** Builds a three.js group from a Minecraft block/item model (elements + per-face UVs). */
function buildModel(json, tex) {
  const lit = new THREE.MeshLambertMaterial({ map: tex });
  const glow = new THREE.MeshBasicMaterial({ map: tex });
  glow.color.setScalar(1.6);
  const root = new THREE.Group();
  const faces = ['east', 'west', 'up', 'down', 'south', 'north']; // BoxGeometry group order
  for (const el of json.elements) {
    const size = [0, 1, 2].map((i) => Math.max(el.to[i] - el.from[i], 0.001));
    const geo = new THREE.BoxGeometry(...size);
    const uv = geo.attributes.uv;
    const mats = [];
    faces.forEach((f, fi) => {
      const [u1, v1, u2, v2] = el.faces[f].uv;
      for (let k = 0; k < 4; k++) {
        const i = fi * 4 + k;
        uv.setXY(i, (uv.getX(i) ? u2 : u1) / 16, 1 - (uv.getY(i) ? v1 : v2) / 16);
      }
      const swatch = Math.floor(v1 / 2) * 8 + Math.floor(u1 / 2);
      mats.push(GLOW_SWATCHES.has(swatch) ? glow : lit);
    });
    const mesh = new THREE.Mesh(geo, mats);
    const center = [0, 1, 2].map((i) => (el.from[i] + el.to[i]) / 2);
    if (el.rotation) {
      const o = el.rotation.origin;
      const pivot = new THREE.Group();
      pivot.position.set(o[0] - 8, o[1] - 8, o[2] - 8);
      mesh.position.set(center[0] - o[0], center[1] - o[1], center[2] - o[2]);
      pivot.rotation[el.rotation.axis] = THREE.MathUtils.degToRad(el.rotation.angle);
      pivot.add(mesh);
      root.add(pivot);
    } else {
      mesh.position.set(center[0] - 8, center[1] - 8, center[2] - 8);
      root.add(mesh);
    }
  }
  return root;
}

// ---------------------------------------------------------- star field ---
function starfield() {
  const c = document.getElementById('stars-bg');
  const g = c.getContext('2d');
  let stars = [];
  let shooting = null;
  function resize() {
    c.width = innerWidth * devicePixelRatio;
    c.height = innerHeight * devicePixelRatio;
    stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 4500) }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.4 + 0.3, p: Math.random() * 6.28,
    }));
  }
  resize();
  addEventListener('resize', resize);
  function frame(now) {
    g.fillStyle = '#070614';
    g.fillRect(0, 0, c.width, c.height);
    for (const s of stars) {
      const a = reducedMotion ? 0.7 : 0.45 + 0.55 * Math.sin(now / 900 + s.p);
      g.fillStyle = `rgba(220,215,255,${a})`;
      g.fillRect(s.x, s.y, s.r * devicePixelRatio, s.r * devicePixelRatio);
    }
    if (!reducedMotion) {
      if (!shooting && Math.random() < 0.006) {
        shooting = { x: Math.random() * c.width * 0.7, y: Math.random() * c.height * 0.3, life: 0 };
      }
      if (shooting) {
        shooting.life += 1;
        const len = 140 * devicePixelRatio;
        const x = shooting.x + shooting.life * 14 * devicePixelRatio;
        const y = shooting.y + shooting.life * 7 * devicePixelRatio;
        const grad = g.createLinearGradient(x - len, y - len / 2, x, y);
        grad.addColorStop(0, 'rgba(255,210,90,0)');
        grad.addColorStop(1, 'rgba(255,246,208,0.9)');
        g.strokeStyle = grad;
        g.lineWidth = 2 * devicePixelRatio;
        g.beginPath();
        g.moveTo(x - len, y - len / 2);
        g.lineTo(x, y);
        g.stroke();
        if (shooting.life > 50) shooting = null;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// -------------------------------------------------------------- armory ---
function makeBloomComposer(renderer, scene, camera, strength) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), strength, 0.5, 0.82));
  composer.addPass(new OutputPass());
  return composer;
}

function armory(onPlay) {
  const canvas = document.getElementById('viewer');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.6, -7.5); // models face north (-z) in Minecraft
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 14;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 1.6;
  scene.add(new THREE.AmbientLight(0x8a80ff, 1.4));
  const key = new THREE.DirectionalLight(0xfff0d0, 2.2);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5ef0ff, 1.5);
  rim.position.set(-4, 2, -5);
  scene.add(rim);

  const pedestal = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.55, 64), new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  pedestal.rotation.x = -Math.PI / 2;
  pedestal.position.y = -1.9;
  scene.add(pedestal);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: 0xffd25a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(7, 7, 1);
  halo.position.z = -2;
  scene.add(halo);

  const composer = makeBloomComposer(renderer, scene, camera, 0.55);
  let holder = new THREE.Group();
  scene.add(holder);
  let current = 0;

  const tabs = document.getElementById('tabs');
  WEAPONS.forEach((w, i) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.role = 'tab';
    b.textContent = w.name;
    b.addEventListener('click', () => select(i));
    tabs.appendChild(b);
  });
  document.getElementById('w-play').addEventListener('click', () => onPlay(WEAPONS[current].type));

  async function select(i) {
    current = i;
    const w = WEAPONS[i];
    [...tabs.children].forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    document.querySelector('.armory').style.setProperty('--accent', w.accent);
    document.getElementById('w-name').textContent = w.name;
    document.getElementById('w-skill').textContent = 'SKILL: ' + TYPES[w.type].name + '  ' + TYPES[w.type].jp;
    document.getElementById('w-desc').textContent = w.desc;
    document.getElementById('w-stats').innerHTML = Object.entries(w.stats).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    pedestal.material.color.set(w.accent);
    halo.material.color.set(w.accent);
    const model = await loadModel(w.id);
    if (current !== i) return;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(V());
    const center = box.getCenter(V());
    const s = 3.6 / Math.max(size.x, size.y, size.z);
    model.position.copy(center).multiplyScalar(-s);
    model.scale.setScalar(s);
    scene.remove(holder);
    holder = new THREE.Group();
    holder.add(model);
    if (w.id !== 'stellar_remote' && w.id !== 'supernova_core') holder.rotation.z = -0.35;
    scene.add(holder);
  }

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    composer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime();
    holder.position.y = Math.sin(t * 1.4) * 0.08;
    pedestal.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
    controls.update();
    composer.render();
  })();
  select(0);
}

// ------------------------------------------------------- strike planner ---
// Port of StrikePlan.java: same geometry and timings as the mod.
const LANCE_FIRE = 50, LANCE_END = 100, LANCE_HALF = 15;
const DASH_START = 12, DASH_LEAP = 28, DASH_SLAM = 44;
const CONST_LINES = 95, CONST_STEP = 7, CONST_CONVERGE = 152, CONST_IMPLODE = 166, CONST_PULL = 22;
const NOVA_APPEAR = 60, NOVA_COLLAPSE = 160, NOVA = 176, NOVA_HEIGHT = 10, NOVA_RADIUS = 22;
const DIPPER = [[-15, 0], [-9, 2.4], [-4, 1.6], [1, 0], [2.5, -6.5], [10.5, -5.5], [9.6, 3.2]];
const MIN_DIST = { ORBITAL_LANCE: 25, COMET_DASH: 18, CONSTELLATION: 30, SUPERNOVA: 34 };

class Plan {
  constructor(type, origin, target) {
    this.type = type;
    this.origin = origin;
    this.target = target;
    const b = V(origin.x - target.x, 0, origin.z - target.z);
    this.back = b.lengthSq() < 1e-4 ? V(0, 0, 1) : b.normalize();
    this.fwd = this.back.clone().negate();
    this.side = V(-this.back.z, 0, this.back.x);
  }
  at(base, back, side, up) { return base.clone().addScaledVector(this.back, back).addScaledVector(this.side, side).add(V(0, up, 0)); }
  lanceSat() { return this.at(this.target, 30, 14, 170); }
  lancePoint(t) { return this.target.clone().addScaledVector(this.fwd, -LANCE_HALF + 2 * LANCE_HALF * smooth(progress(t, LANCE_FIRE, LANCE_END))); }
  constHome(i) { return this.at(this.target, DIPPER[i][1], DIPPER[i][0], 15); }
  constArrive(i) { return 60 + i * 8; }
  constPos(i, t) {
    const home = this.constHome(i), arrive = this.constArrive(i);
    if (t < arrive) {
      const sky = this.at(home, 40, 0, 120);
      return sky.lerp(home, 1 - Math.pow(1 - progress(t, arrive - 30, arrive), 2.2));
    }
    if (t < CONST_CONVERGE) return home.add(V(0, Math.sin(t * 0.15 + i) * 0.4, 0));
    return home.lerp(this.target.clone().add(V(0, 1, 0)), Math.pow(progress(t, CONST_CONVERGE, CONST_IMPLODE), 2));
  }
  constLine(i, t) { return progress(t, CONST_LINES + i * CONST_STEP, CONST_LINES + i * CONST_STEP + 5); }
  novaCenter() { return this.target.clone().add(V(0, NOVA_HEIGHT, 0)); }
  novaSize(t) {
    if (t < NOVA_APPEAR - 20) return 0;
    if (t < NOVA_APPEAR) return 1.5 * progress(t, NOVA_APPEAR - 20, NOVA_APPEAR);
    if (t < NOVA_COLLAPSE) return 1.5 + 7.5 * smooth(progress(t, NOVA_APPEAR, NOVA_COLLAPSE));
    if (t < NOVA) return 9 - 8.5 * Math.pow(progress(t, NOVA_COLLAPSE, NOVA), 0.6);
    return 0;
  }
}

// ---------------------------------------------------------------- film ---
function film() {
  const box = document.getElementById('film-box');
  const canvas = document.getElementById('film-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060818);
  scene.fog = new THREE.Fog(0x060818, 70, 190);
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 700);
  const composer = makeBloomComposer(renderer, scene, camera, 0.9);

  scene.add(new THREE.HemisphereLight(0x8090ff, 0x202030, 1.0));
  const moon = new THREE.DirectionalLight(0xbfd0ff, 1.3);
  moon.position.set(-40, 80, 30);
  scene.add(moon);
  const flashLight = new THREE.PointLight(0xffd25a, 0, 120, 1.5);
  scene.add(flashLight);

  // Sky: stars and a blocky moon.
  {
    const n = 1500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = V(Math.random() - 0.5, Math.random() * 0.9 + 0.05, Math.random() - 0.5).normalize().multiplyScalar(500);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdde0ff, size: 1.6, sizeAttenuation: false, fog: false })));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0xf2f0dc, fog: false }));
    m.position.set(-200, 260, -300);
    m.lookAt(0, 0, 0);
    scene.add(m);
  }

  // ---- voxel terrain ----
  const R = 48;
  const height = (x, z) => Math.round(10 + 2.2 * Math.sin(x * 0.09) + 1.8 * Math.cos(z * 0.11) + 1.2 * Math.sin((x + z) * 0.17) + 0.8 * Math.cos(x * 0.31 - z * 0.23));
  const blocks = [];
  const index = new Map();
  const key = (x, y, z) => x + ',' + y + ',' + z;
  const COLORS = { grass: 0x5fae3c, dirt: 0x7a5532, stone: 0x7d7d84, log: 0x6b4f2a, leaf: 0x3f8a2e };
  function addBlock(x, y, z, kind) {
    index.set(key(x, y, z), blocks.length);
    blocks.push({ x, y, z, kind });
  }
  for (let x = -R; x < R; x++) {
    for (let z = -R; z < R; z++) {
      const h = height(x, z);
      for (let y = h - 6; y <= h; y++) addBlock(x, y, z, y === h ? 'grass' : y > h - 3 ? 'dirt' : 'stone');
    }
  }
  const rand = mulberry32(42);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * (R * 2 - 8)) - R + 4, z = Math.floor(rand() * (R * 2 - 8)) - R + 4;
    if (Math.abs(x) < 4 && z > 14) continue;
    const h = height(x, z);
    for (let y = 1; y <= 4; y++) addBlock(x, h + y, z, 'log');
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 3; dy <= 5; dy++) {
      if (Math.abs(dx) + Math.abs(dz) + (dy - 3) > 3 || (dx === 0 && dz === 0 && dy < 5)) continue;
      if (!index.has(key(x + dx, h + dy, z + dz))) addBlock(x + dx, h + dy, z + dz, 'leaf');
    }
  }
  const terrain = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), blocks.length);
  scene.add(terrain);
  const mtx = new THREE.Matrix4();
  const col = new THREE.Color();
  const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
  function resetTerrain() {
    blocks.forEach((b, i) => {
      b.gone = false;
      mtx.makeTranslation(b.x + 0.5, b.y + 0.5, b.z + 0.5);
      terrain.setMatrixAt(i, mtx);
      col.set(COLORS[b.kind]).multiplyScalar(0.85 + ((b.x * 7 + b.z * 13 + b.y * 5) % 7) * 0.035);
      terrain.setColorAt(i, col);
    });
    terrain.instanceMatrix.needsUpdate = true;
    terrain.instanceColor.needsUpdate = true;
  }
  resetTerrain();

  const SCORCH = [0xc0441a, 0xe06020, 0x2a2430, 0x2a2430, 0x3a3a44, 0x1a1028, 0x5a2a8a];
  function carve(center, radius) {
    const c = V(Math.floor(center.x), Math.floor(center.y), Math.floor(center.z));
    const p1 = rand() * 6.28, p2 = rand() * 6.28;
    const r = Math.ceil(radius) + 3;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dz);
      const a = Math.atan2(dz, dx);
      const rr = radius * (0.88 + 0.07 * Math.sin(a * 3 + p1) + 0.05 * Math.sin(a * 5 + p2));
      if (d > rr + 2.5) continue;
      const x = c.x + dx, z = c.z + dz;
      if (d <= rr) {
        const depth = rr * 0.6 * Math.sqrt(1 - (d / rr) ** 2);
        const floor = Math.round(c.y - depth);
        for (let y = floor + 1; y <= c.y + rr * 0.5 + (rr - d) * 0.4 + 6; y++) {
          const i = index.get(key(x, y, z));
          if (i !== undefined && !blocks[i].gone) { blocks[i].gone = true; terrain.setMatrixAt(i, HIDDEN); }
        }
        for (let y = floor - 1; y <= floor; y++) {
          const i = index.get(key(x, y, z));
          if (i !== undefined && !blocks[i].gone) terrain.setColorAt(i, col.set(d < 1.5 ? 0xfff0a0 : SCORCH[Math.floor(rand() * SCORCH.length)]));
        }
      } else {
        for (let y = c.y + 8; y > c.y - radius; y--) {
          const i = index.get(key(x, y, z));
          if (i !== undefined && !blocks[i].gone) {
            if (rand() < 0.55) terrain.setColorAt(i, col.set(SCORCH[Math.floor(rand() * SCORCH.length)]));
            break;
          }
        }
      }
    }
    terrain.instanceMatrix.needsUpdate = true;
    terrain.instanceColor.needsUpdate = true;
  }

  // ---- the caster ----
  const player = new THREE.Group();
  const part = (w, h, d, color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z);
    player.add(m);
    return m;
  };
  part(0.5, 0.5, 0.5, 0xc69c77, 0, 1.6, 0); // head
  part(0.52, 0.18, 0.52, 0x3b2a1a, 0, 1.82, 0.02); // hair
  part(0.5, 0.06, 0.02, 0x2a2a5a, 0, 1.62, -0.26); // eyes band
  part(0.5, 0.75, 0.25, 0x2fa8b8, 0, 0.98, 0); // body
  part(0.24, 0.75, 0.25, 0x3a3a9a, -0.13, 0.37, 0); // legs
  part(0.24, 0.75, 0.25, 0x3a3a9a, 0.13, 0.37, 0);
  part(0.22, 0.75, 0.25, 0xc69c77, -0.37, 0.98, 0); // left arm
  const armPivot = new THREE.Group();
  armPivot.position.set(0.37, 1.32, 0);
  player.add(armPivot);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.25), new THREE.MeshLambertMaterial({ color: 0xc69c77 }));
  arm.position.y = -0.33;
  armPivot.add(arm);
  const handItem = new THREE.Group();
  handItem.position.set(0, -0.68, -0.05);
  armPivot.add(handItem);
  scene.add(player);

  // ---- effects ----
  const additive = (color, opacity = 1, tex = GLOW_TEX) => new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const fx = new THREE.Group();
  scene.add(fx);
  let particles = [];

  function spawnParticle(pos, vel, color, size, life, opts = {}) {
    const s = new THREE.Sprite(opts.smoke
      ? new THREE.SpriteMaterial({ map: SMOKE_TEX, color, transparent: true, opacity: 0.55, depthWrite: false })
      : additive(color, 1));
    s.position.copy(pos);
    s.scale.setScalar(size);
    fx.add(s);
    particles.push({ s, vel, life, max: life, size, grow: opts.grow || 0, gravity: opts.gravity || 0 });
  }

  const addMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  let pieces = [];
  const own = (o) => { fx.add(o); pieces.push(o); return o; };

  /** A star: halo, white core and two counter-spinning sparkles. */
  function makeStar(color) {
    const g = own(new THREE.Group());
    const halo = new THREE.Sprite(additive(color, 0.9));
    const core = new THREE.Sprite(additive(0xffffff, 1));
    const sp1 = new THREE.Sprite(additive(0xfff6e0, 1, SPARKLE_TEX));
    const sp2 = new THREE.Sprite(additive(color, 1, SPARKLE_TEX));
    g.add(halo, core, sp1, sp2);
    g.visible = false;
    return {
      set(p, size, t) {
        g.visible = size > 0.01;
        if (!g.visible) return;
        [halo, core, sp1, sp2].forEach((s) => s.position.copy(p));
        halo.scale.setScalar(size * 6);
        core.scale.setScalar(size * 1.8);
        sp1.scale.setScalar(size * 5);
        sp2.scale.setScalar(size * 3);
        sp1.material.rotation = t * 0.09;
        sp2.material.rotation = 0.78 - t * 0.19;
      },
    };
  }

  /** A glowing cylinder between two points. */
  function makeBeam(color) {
    const m = own(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 14, 1, true), addMat(color)));
    m.visible = false;
    return {
      set(a, b, width, opacity = 1) {
        m.visible = width > 0.01 && opacity > 0.01;
        if (!m.visible) return;
        const d = b.clone().sub(a);
        m.position.copy(a).addScaledVector(d, 0.5);
        m.scale.set(width, d.length(), width);
        m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
        m.material.opacity = opacity;
      },
    };
  }

  /** A flat ring on the ground (or tilted, for the accretion disc). */
  function makeRing(color, inner = 0.82) {
    const m = own(new THREE.Mesh(new THREE.RingGeometry(inner, 1, 72), addMat(color)));
    m.visible = false;
    return {
      m,
      set(p, radius, opacity = 1, spin = 0, tilt = -Math.PI / 2) {
        m.visible = radius > 0.01 && opacity > 0.01;
        if (!m.visible) return;
        m.position.copy(p);
        m.rotation.set(tilt, 0, spin);
        m.scale.setScalar(radius);
        m.material.opacity = opacity;
      },
    };
  }

  /** A tapering comet tail of sprites behind a moving head. */
  function makeTail(color, n = 22) {
    const sprites = Array.from({ length: n }, (_, i) => own(new THREE.Sprite(additive(i % 3 ? color : 0xffffff, 1))));
    sprites.forEach((s) => { s.visible = false; });
    return {
      set(head, dir, length, size, opacity = 1) {
        sprites.forEach((s, i) => {
          const f = i / n;
          s.visible = opacity > 0.01;
          s.position.copy(head).addScaledVector(dir, -length * f);
          s.scale.setScalar(size * 2.2 * Math.pow(1 - f, 0.8) + 0.15);
          s.material.opacity = opacity * Math.pow(1 - f, 1.4) * clamp((s.position.distanceTo(camera.position) - 6) / 14, 0, 1);
        });
      },
    };
  }

  /** Fireball, ground shockwave and a pillar of light after an impact. */
  function makeAftermath(color) {
    const fire = own(new THREE.Sprite(additive(color, 1)));
    const core = own(new THREE.Sprite(additive(0xfff4d0, 1)));
    const ring = makeRing(color);
    const pillar = makeBeam(color);
    fire.visible = core.visible = false;
    return {
      set(at, radius, a) {
        const f = a >= 0 ? Math.pow(clamp(1 - a / 30, 0, 1), 2) : 0;
        fire.visible = core.visible = f > 0;
        const size = radius * (1.6 + Math.max(a, 0) / 8);
        fire.position.copy(at).add(V(0, radius * 0.3, 0));
        core.position.copy(fire.position);
        fire.scale.setScalar(size * 2.2);
        core.scale.setScalar(size);
        fire.material.opacity = core.material.opacity = f;
        ring.set(at.clone().add(V(0, 0.6, 0)), radius * (0.75 + Math.max(a, 0) * 0.28), a >= 0 ? clamp(1 - a / 25, 0, 1) : 0);
        const p = a >= 0 ? clamp(1 - a / 18, 0, 1) : 0;
        pillar.set(at, at.clone().add(V(0, 160, 0)), radius * 0.35 * p, p * 0.8);
      },
    };
  }

  function blast(at, radius, color) {
    flashLight.position.copy(at).add(V(0, 6, 0));
    flashLight.color.set(color);
    flashLight.intensity = 400 + radius * 60;
    const n = Math.min(160, 40 + radius * 8);
    for (let i = 0; i < n; i++) {
      const dir = V(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize();
      spawnParticle(at.clone().add(V(0, 1, 0)), dir.multiplyScalar(radius * (0.8 + Math.random() * 1.6)),
        [0xffffff, color, 0xff8a2e, 0xffd25a][i % 4], 0.6 + Math.random() * 1.2, 30 + Math.random() * 30, { gravity: 18 });
    }
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      spawnParticle(at.clone().add(V(0, 0.8, 0)), V(Math.cos(a), 0.05, Math.sin(a)).multiplyScalar(radius * 3), 0xbbbbcc, 2.5, 26, { smoke: true, grow: 0.25 });
    }
    for (let i = 0; i < radius * 3; i++) {
      spawnParticle(at.clone().add(V((Math.random() - 0.5) * radius * 0.6, Math.random() * radius, (Math.random() - 0.5) * radius * 0.6)),
        V(0, 2 + Math.random() * 3, 0), 0x55555f, radius * 0.6, 80, { smoke: true, grow: 0.12 });
    }
    sound.boom(radius);
  }

  /** Highest block still standing in a column. */
  function topY(x, z) {
    const h = height(x, z);
    for (let y = h + 6; y > h - 8; y--) {
      const i = index.get(key(x, y, z));
      if (i !== undefined && !blocks[i].gone) return y;
    }
    return h - 8;
  }
  const groundAt = (x, z) => topY(Math.floor(x), Math.floor(z)) + 1;

  const GLASS = [0x1a1028, 0x2a2440, 0xff7a3a, 0x3a1f5a, 0xffb060, 0x101018];
  function carveSphere(center, R) {
    blocks.forEach((b, i) => {
      if (b.gone) return;
      const d = Math.hypot(b.x + 0.5 - center.x, b.y + 0.5 - center.y, b.z + 0.5 - center.z);
      if (d < R) { b.gone = true; terrain.setMatrixAt(i, HIDDEN); }
      else if (d < R + 1.6) terrain.setColorAt(i, col.set(GLASS[Math.floor(rand() * GLASS.length)]));
    });
    terrain.instanceMatrix.needsUpdate = true;
    terrain.instanceColor.needsUpdate = true;
  }

  /** Blocks ripped out of the ground by the black hole. */
  let debris = [];
  const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
  function ripBlock(target, center) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 14;
    const x = Math.floor(target.x + Math.cos(a) * r), z = Math.floor(target.z + Math.sin(a) * r);
    const y = topY(x, z);
    const i = index.get(key(x, y, z));
    if (i === undefined) return;
    blocks[i].gone = true;
    terrain.setMatrixAt(i, HIDDEN);
    terrain.instanceMatrix.needsUpdate = true;
    const m = own(new THREE.Mesh(debrisGeo, new THREE.MeshLambertMaterial({ color: COLORS[blocks[i].kind] })));
    m.position.set(x + 0.5, y + 0.5, z + 0.5);
    debris.push({ m, center });
  }
  function updateDebris(dt) {
    debris = debris.filter(({ m, center }) => {
      const to = center.clone().sub(m.position);
      const dist = to.length();
      if (dist < 2) { fx.remove(m); return false; }
      to.normalize();
      const swirl = V(-to.z, 0, to.x).multiplyScalar(7);
      m.position.addScaledVector(to.multiplyScalar(Math.min(22, 4 + 120 / dist)).add(swirl).add(V(0, 1, 0)), dt);
      m.rotation.x += dt * 3;
      m.rotation.y += dt * 2;
      return true;
    });
  }

  /** Builds the visuals for one strike and returns a per-frame update. */
  function buildStrike(r) {
    const { plan, T } = r;
    const color = T.color;
    if (r.type === 'ORBITAL_LANCE') {
      const reticle = makeRing(color), reticle2 = makeRing(0xffffff, 0.9);
      const sat = makeStar(color);
      const outer = makeBeam(color), inner = makeBeam(0xffffff);
      const hit = makeStar(color), ripple = makeRing(color);
      const after = makeAftermath(color);
      let carved = 0;
      return (t) => {
        const ground = plan.target.clone();
        ground.y = groundAt(ground.x, ground.z) + 0.15;
        const lock = progress(t, 0, LANCE_FIRE), pulse = 0.6 + 0.4 * Math.sin(t * 0.8);
        reticle.set(ground, 9 - 6 * lock, t < LANCE_FIRE + 6 ? pulse : 0, t * 0.07);
        reticle2.set(ground, 3.5 - lock, t < LANCE_FIRE + 6 ? 1 : 0, -t * 0.1);
        sat.set(plan.lanceSat(), 6 * progress(t, 15, 35), t);
        const firing = t >= LANCE_FIRE && t < LANCE_END;
        const p = plan.lancePoint(t);
        p.y = groundAt(p.x, p.z);
        const warm = progress(t, LANCE_FIRE, LANCE_FIRE + 4);
        outer.set(plan.lanceSat(), p, firing ? 4.5 * warm : 0, 0.8);
        inner.set(plan.lanceSat(), p, firing ? 1.6 * warm : 0, 1);
        hit.set(p.clone().add(V(0, 0.8, 0)), firing ? 2 : 0, t);
        const rip = (t * 0.25) % 1;
        ripple.set(p.clone().add(V(0, 0.3, 0)), 2 + rip * 7, firing ? 1 - rip : 0);
        // Burn the trench as the beam passes.
        while (firing && carved <= t) {
          const q = plan.lancePoint(carved);
          carve(V(q.x, groundAt(q.x, q.z) - 1, q.z), 3.2);
          if (Math.random() < 0.7) spawnParticle(V(q.x, groundAt(q.x, q.z), q.z), V((Math.random() - 0.5) * 6, 6 + Math.random() * 6, (Math.random() - 0.5) * 6), [0xffd25a, 0xff8a2e][carved % 2], 0.8, 30, { gravity: 18 });
          carved += 2;
        }
        if (firing && Math.random() < 0.5) spawnParticle(p.clone().add(V(0, 1, 0)), V(0, 3, 0), 0x2a2a36, 2, 40, { smoke: true, grow: 0.08 });
        const end = plan.lancePoint(LANCE_END);
        end.y = groundAt(end.x, end.z);
        cue(r, 'end', t >= LANCE_END, () => { carve(V(end.x, end.y - 1, end.z), 6.5); blast(end, 6.5, color); });
        after.set(end, 6.5, t - LANCE_END);
      };
    }
    if (r.type === 'COMET_DASH') {
      const aura = makeStar(color), tail = makeTail(color);
      const after = makeAftermath(color);
      const start = r.origin.clone();
      // The caster's path: charge, leap, slam (kinematic version of the mod's client movement).
      r.playerAt = (t) => {
        const s = t < DASH_START ? 0 : t < DASH_LEAP ? 1.7 * (t - DASH_START) : 1.7 * (DASH_LEAP - DASH_START) + 0.9 * (Math.min(t, DASH_SLAM) - DASH_LEAP);
        const p = start.clone().addScaledVector(plan.fwd, s);
        const g = groundAt(p.x, p.z);
        const jump = t > DASH_LEAP && t < DASH_SLAM ? 7 * (1 - ((t - 36) / 8) ** 2) : 0;
        p.y = g + Math.max(0, jump);
        return p;
      };
      return (t) => {
        const p = r.playerAt(t);
        const dashing = t >= DASH_START - 6 && t < DASH_SLAM;
        const core = p.clone().add(V(0, 1, 0));
        const next = r.playerAt(t + 1).sub(p);
        aura.set(core, dashing ? 0.5 * progress(t, DASH_START - 6, DASH_START) : 0, t * 2);
        tail.set(core, next.lengthSq() > 0.01 ? next.normalize() : plan.fwd, 14, 0.9, dashing && t >= DASH_START ? 1 : 0);
        if (dashing && t >= DASH_START) {
          spawnParticle(core.clone().add(V((Math.random() - 0.5), (Math.random() - 0.5) * 1.5, (Math.random() - 0.5))), V(0, 0.5, 0), Math.random() < 0.5 ? 0xffffff : color, 0.5, 20);
        }
        r.slamPos = r.slamPos || null;
        cue(r, 'slam', t >= DASH_SLAM, () => {
          r.slamPos = r.playerAt(DASH_SLAM);
          carve(V(r.slamPos.x, r.slamPos.y - 1, r.slamPos.z), 5.5);
          blast(r.slamPos, 5.5, color);
        });
        if (r.slamPos) after.set(r.slamPos, 5.5, t - DASH_SLAM);
      };
    }
    if (r.type === 'CONSTELLATION') {
      const stars = DIPPER.map((_, i) => makeStar(i % 2 ? color : 0xff8ce6));
      const tails = DIPPER.map((_, i) => makeTail(i % 2 ? color : 0xff8ce6, 12));
      const lines = DIPPER.slice(1).map(() => [makeBeam(color), makeBeam(0xffffff)]);
      const vortex = [makeRing(color, 0.9), makeRing(color, 0.75), makeRing(0xffffff, 0.95)];
      const after = makeAftermath(color);
      return (t) => {
        DIPPER.forEach((_, i) => {
          const visible = t >= plan.constArrive(i) - 34 && t < CONST_IMPLODE;
          const p = plan.constPos(i, t);
          stars[i].set(p, visible ? 0.8 * progress(t, plan.constArrive(i) - 34, plan.constArrive(i) - 24) : 0, t + i * 7);
          const falling = visible && (t < plan.constArrive(i) || t >= CONST_CONVERGE);
          tails[i].set(p, plan.constPos(i, t + 1).sub(p).normalize(), 16, 0.6, falling ? 1 : 0);
          cue(r, 'chime' + i, t >= plan.constArrive(i), () => sound.chime());
        });
        lines.forEach(([o, n], i) => {
          let k = plan.constLine(i, t);
          if (t >= CONST_CONVERGE) k *= 1 - progress(t, CONST_CONVERGE, CONST_CONVERGE + 6);
          o.set(plan.constPos(i, t), plan.constPos(i + 1, t), 0.7, k * 0.8);
          n.set(plan.constPos(i, t), plan.constPos(i + 1, t), 0.25, k);
        });
        const pulling = t >= CONST_LINES + 40 && t < CONST_IMPLODE;
        const on = pulling ? progress(t, CONST_LINES + 40, CONST_LINES + 55) : 0;
        const g = plan.target.clone();
        g.y = groundAt(g.x, g.z) + 0.2;
        vortex[0].set(g, CONST_PULL, on * 0.6, t * 0.05);
        vortex[1].set(g, 11, on, -t * 0.08);
        vortex[2].set(g, 6 + Math.sin(t * 0.3), on * 0.8, t * 0.1);
        if (pulling) {
          const a = Math.random() * Math.PI * 2, rr = 6 + Math.random() * CONST_PULL;
          const p = g.clone().add(V(Math.cos(a) * rr, 0.5 + Math.random() * 4, Math.sin(a) * rr));
          spawnParticle(p, g.clone().add(V(0, 4, 0)).sub(p).multiplyScalar(1.2), color, 0.4, 25);
        }
        cue(r, 'implode', t >= CONST_IMPLODE, () => { carve(V(g.x, g.y - 1, g.z), 9); blast(g, 9, color); });
        after.set(g, 9, t - CONST_IMPLODE);
      };
    }
    // SUPERNOVA
    const star = makeStar(color);
    const disc1 = makeRing(color, 0.55), disc2 = makeRing(0x8a3aff, 0.7);
    const shell = own(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), addMat(color, 1)));
    const shellRings = [makeRing(0xffffff, 0.92), makeRing(color, 0.9), makeRing(0xffffff, 0.92)];
    shell.visible = false;
    const after = makeAftermath(color);
    let ripped = NOVA_APPEAR + 10;
    return (t) => {
      const c = plan.novaCenter();
      const size = plan.novaSize(t);
      star.set(c, size * 0.45, t);
      const swallowing = t >= NOVA_APPEAR && t < NOVA_COLLAPSE;
      disc1.set(c, size * 2.4, swallowing ? 0.9 : 0, t * 0.12, -1.2);
      disc2.set(c, size * 3.4, swallowing ? 0.5 : 0, -t * 0.07, -1.2);
      while (swallowing && ripped <= t) {
        for (let i = 0; i < 2; i++) ripBlock(plan.target, c);
        ripped += 1;
      }
      if (t >= NOVA_APPEAR && t < NOVA) {
        const a = Math.random() * Math.PI * 2, rr = 8 + Math.random() * 18;
        const p = c.clone().add(V(Math.cos(a) * rr, (Math.random() - 0.5) * 6, Math.sin(a) * rr));
        spawnParticle(p, c.clone().sub(p).multiplyScalar(1.6), Math.random() < 0.5 ? 0x8a3aff : color, 0.5, 14);
      }
      cue(r, 'nova', t >= NOVA, () => {
        debris.forEach(({ m }) => fx.remove(m));
        debris = [];
        carveSphere(c, NOVA_RADIUS);
        blast(plan.target, 17, color);
      });
      const a = t - NOVA;
      const k = a >= 0 ? clamp(1 - a / 40, 0, 1) : 0;
      const R = NOVA_RADIUS * (0.3 + Math.max(a, 0) / 7);
      shell.visible = k > 0;
      shell.position.copy(c);
      shell.scale.setScalar(R);
      shell.material.opacity = k * 0.35;
      shellRings.forEach((ring, i) => {
        ring.set(c, R, k, 0, i === 0 ? -Math.PI / 2 : 0);
        if (i === 2) ring.m.rotation.set(0, Math.PI / 2, 0);
      });
      after.set(plan.target, 12, a);
    };
  }

  // ---- sound (synthesised; no files) ----
  const sound = (() => {
    let ctx;
    const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
    function noise(dur) {
      const c = ac();
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      return src;
    }
    function env(node, peak, attack, decay) {
      const c = ac();
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(peak, c.currentTime + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + attack + decay);
      node.connect(g).connect(c.destination);
      return g;
    }
    return {
      unlock() { try { ac().resume(); } catch { /* no audio */ } },
      charge(secs) {
        try {
          const c = ac();
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(80, c.currentTime);
          o.frequency.exponentialRampToValueAtTime(640, c.currentTime + secs);
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 900;
          o.connect(f);
          env(f, 0.08, secs * 0.8, secs * 0.3);
          o.start();
          o.stop(c.currentTime + secs * 1.2);
        } catch { /* no audio */ }
      },
      chime() {
        try {
          const c = ac();
          [1320, 1980, 2640].forEach((fr, i) => {
            const o = c.createOscillator();
            o.frequency.value = fr;
            env(o, 0.06 / (i + 1), 0.01, 1.6);
            o.start();
            o.stop(c.currentTime + 1.8);
          });
        } catch { /* no audio */ }
      },
      whoosh(secs) {
        try {
          const c = ac();
          const n = noise(secs + 0.5);
          const f = c.createBiquadFilter();
          f.type = 'bandpass';
          f.Q.value = 2;
          f.frequency.setValueAtTime(300, c.currentTime);
          f.frequency.exponentialRampToValueAtTime(2400, c.currentTime + secs);
          n.connect(f);
          env(f, 0.25, secs * 0.9, 0.3);
          n.start();
        } catch { /* no audio */ }
      },
      boom(radius) {
        try {
          const c = ac();
          const n = noise(3);
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(1800, c.currentTime);
          f.frequency.exponentialRampToValueAtTime(120, c.currentTime + 2);
          n.connect(f);
          env(f, Math.min(0.9, 0.35 + radius * 0.03), 0.005, 2.6);
          n.start();
          const o = c.createOscillator();
          o.frequency.setValueAtTime(90, c.currentTime);
          o.frequency.exponentialRampToValueAtTime(28, c.currentTime + 1.5);
          env(o, 0.6, 0.005, 1.8);
          o.start();
          o.stop(c.currentTime + 2);
        } catch { /* no audio */ }
      },
    };
  })();

  // ---- the director (port of Cutscene.java) ----
  let run = null;

  function cue(r, name, cond, fn) {
    if (cond && !r.cues.has(name)) { r.cues.add(name); fn(); }
  }

  function startFilm(typeName) {
    sound.unlock();
    stopFilm();
    resetTerrain();
    const T = TYPES[typeName];
    const origin = V(0.5, height(0, 22) + 1, 22.5);
    const tz = Math.floor(origin.z - MIN_DIST[typeName]);
    const target = V(0.5, height(0, tz) + 1, tz + 0.5);
    const plan = new Plan(typeName, origin, target);
    const r = {
      type: typeName, T, plan, origin, target,
      eye: origin.clone().add(V(0, 1.62, 0)),
      start: performance.now(),
      cues: new Set(),
    };
    r.update = buildStrike(r);
    run = r;
    player.position.copy(origin);
    player.rotation.y = 0;
    handItem.clear();
    const w = WEAPONS.find((x) => x.type === typeName);
    loadModel(w.id).then((m) => {
      if (run !== r) return;
      m.scale.setScalar(1 / 16 * (w.id === 'stellar_remote' || w.id === 'supernova_core' ? 0.8 : 0.55));
      m.rotation.set(-Math.PI / 2 + 0.3, 0, 0);
      m.position.set(0, 0, -0.25);
      handItem.add(m);
    });
    box.classList.add('rolling');
    box.style.setProperty('--accent', '#' + T.color.toString(16).padStart(6, '0'));
    document.getElementById('film-jp').textContent = T.jp;
    document.getElementById('film-name').textContent = '';
    sound.charge(T.ignite / 20);
  }

  function stopFilm() {
    if (!run) return;
    for (const o of pieces) fx.remove(o);
    for (const p of particles) fx.remove(p.s);
    for (const d of debris) fx.remove(d.m);
    pieces = [];
    particles = [];
    debris = [];
    run = null;
    flashLight.intensity = 0;
    player.position.set(0.5, height(0, 22) + 1, 22.5);
    armPivot.rotation.x = 0;
    box.classList.remove('rolling');
    document.getElementById('film-title').style.opacity = 0;
    document.getElementById('film-flash').style.opacity = 0;
    document.getElementById('film-count').textContent = '';
  }

  function heroCloseUp(r, t, end) {
    const u = smooth(progress(t, 0, end));
    const { eye, plan } = r;
    return [eye.clone().addScaledVector(plan.fwd, 2.6 - u * 0.6).addScaledVector(plan.side, 1.4 - 2.6 * u).add(V(0, -0.5 + 0.3 * u, 0)), eye.clone().add(V(0, -0.1 + 0.5 * u, 0))];
  }

  function around(plan, center, angle, dist) {
    return center.clone().addScaledVector(plan.back, Math.cos(angle) * dist).addScaledVector(plan.side, Math.sin(angle) * dist);
  }

  function script(r, t) {
    const { plan, eye, T } = r;
    const { target, side, back, fwd } = plan;
    const at = (base, b, s, u) => base.clone().addScaledVector(back, b).addScaledVector(side, s).add(V(0, u, 0));
    if (r.type === 'ORBITAL_LANCE') {
      if (t < 25) return heroCloseUp(r, t, 25);
      if (t < LANCE_FIRE) return [at(target, 6, 0, 30 - smooth(progress(t, 25, LANCE_FIRE)) * 8), target.clone()];
      if (t < LANCE_FIRE + 12) {
        const g = target.clone().addScaledVector(fwd, -LANCE_HALF);
        const cam = at(g, 6, 9, 0);
        cam.y = groundAt(cam.x, cam.z) + 1.5;
        return [cam, plan.lanceSat().lerp(g, 0.85)];
      }
      if (t < LANCE_END) {
        const p = plan.lancePoint(t);
        p.y = groundAt(p.x, p.z);
        const cam = at(p, 5, 12, 5);
        cam.y = Math.max(cam.y, groundAt(cam.x, cam.z) + 4);
        return [cam, p.clone().add(V(0, 1, 0))];
      }
      return [at(target, 12, 26, 14 + smooth(progress(t, LANCE_END, T.duration)) * 12), target.clone()];
    }
    if (r.type === 'COMET_DASH') {
      const p = r.playerAt(t);
      if (t < DASH_START) return [eye.clone().addScaledVector(fwd, 2.2).addScaledVector(side, 0.9).add(V(0, -0.7, 0)), eye.clone().add(V(0, -0.2, 0))];
      if (r.slamPos && t >= DASH_SLAM) return [at(r.slamPos, 7, 11, 4 + smooth(progress(t, DASH_SLAM, T.duration)) * 6), r.slamPos.clone()];
      if (t < DASH_LEAP) return [at(p, 0, 5, 1.2).addScaledVector(fwd, -1.5), p.clone().addScaledVector(fwd, 3).add(V(0, 1, 0))];
      return [at(p, 0, 7, -2).addScaledVector(fwd, 4), p.clone().add(V(0, 1, 0))];
    }
    if (r.type === 'CONSTELLATION') {
      if (t < 30) return heroCloseUp(r, t, 30);
      const sky = target.clone().add(V(0, 14, 0));
      if (t < CONST_LINES) return [at(target, 28 - progress(t, 30, CONST_LINES) * 4, -8, 2), sky];
      if (t < CONST_LINES + 45) return [around(plan, target, (t - CONST_LINES) * 0.02, 30).add(V(0, 10, 0)), sky.clone().add(V(0, -2, 0))];
      if (t < CONST_IMPLODE) return [at(target, 4, 0, 40), target.clone()];
      return [at(target, 16, 22, 10 + smooth(progress(t, CONST_IMPLODE, T.duration)) * 10), target.clone()];
    }
    const c = plan.novaCenter();
    if (t < 40) return heroCloseUp(r, t, 40);
    if (t < NOVA_APPEAR) return [at(eye, 3, 1, 0.4), c];
    if (t < 110) {
      const cam = at(target, 30, 10, 0);
      cam.y = groundAt(cam.x, cam.z) + 1.5;
      return [cam, c];
    }
    if (t < NOVA_COLLAPSE) return [around(plan, c, (t - 110) * 0.03, 18).add(V(0, 4, 0)), c];
    if (t < NOVA) return [at(c, 14 - progress(t, NOVA_COLLAPSE, NOVA) * 8, 0, 1), c];
    return [at(target, 40, 55, 26 + smooth(progress(t, NOVA, T.duration)) * 14), target.clone()];
  }

  function shake(r, t) {
    const since = t - r.T.impact;
    let s = since >= 0 && since < 30 ? (1 - since / 30) * (r.type === 'SUPERNOVA' ? 3 : 1.4) : 0;
    if (r.type === 'ORBITAL_LANCE' && t >= LANCE_FIRE && t < LANCE_END) s += 0.25;
    if (r.type === 'CONSTELLATION' && t > CONST_LINES + 40 && t < CONST_IMPLODE) s += 0.15;
    if (r.type === 'SUPERNOVA' && t >= NOVA_APPEAR && t < NOVA) s += 0.05 + 0.4 * progress(t, NOVA_APPEAR, NOVA);
    return reducedMotion ? s * 0.2 : s;
  }

  function lens(r, t) {
    let f;
    switch (r.type) {
      case 'ORBITAL_LANCE': f = t < 25 ? 50 : t < LANCE_FIRE ? 55 : t < LANCE_FIRE + 12 ? 45 : 72; break;
      case 'COMET_DASH': f = t < DASH_START ? 50 : t >= DASH_SLAM ? 66 : t < DASH_LEAP ? 95 : 75; break;
      case 'CONSTELLATION': f = t < 30 ? 50 : 70; break;
      default: f = t < 40 ? 50 : t < NOVA_APPEAR ? 40 : t < NOVA_COLLAPSE ? 78 : t < NOVA ? lerp(45, 28, progress(t, NOVA_COLLAPSE, NOVA)) : 70;
    }
    const since = t - r.T.impact;
    if (since >= 0 && since < 8) f -= (1 - since / 8) * 10;
    return f;
  }

  function overlay(r, t) {
    const T = r.T;
    const since = t - T.impact;
    let flash = since >= 0 && since < 14 ? 1 - since / 14 : 0;
    if (r.type === 'ORBITAL_LANCE') flash = Math.max(flash, 0.35 * Math.max(0, 1 - Math.abs(t - LANCE_FIRE) / 4));
    let dark = 0;
    if (r.type === 'SUPERNOVA' && t >= NOVA_APPEAR && t < NOVA) dark = 0.4 * progress(t, NOVA_APPEAR, NOVA_COLLAPSE);
    const fl = document.getElementById('film-flash');
    if (flash > dark) {
      fl.style.opacity = flash * 0.95 * (reducedMotion ? 0.3 : 1);
      fl.style.background = flash > 0.6 ? '#fff6d0' : '#' + T.color.toString(16).padStart(6, '0');
    } else {
      fl.style.opacity = dark;
      fl.style.background = '#05000f';
    }
    const title = document.getElementById('film-title');
    const tin = 4, tout = Math.max(T.ignite + 22, 34);
    if (t > tin && t < tout) {
      title.style.opacity = Math.min(1, (tout - t) / 8);
      document.getElementById('film-name').textContent = T.name.slice(0, Math.floor((t - tin) / 1.1));
      document.getElementById('film-jp').style.opacity = smooth(progress(t, tin + 6, tin + 14));
      document.getElementById('film-rule').style.width = Math.min(1, (t - tin) / 12) * 40 + '%';
    } else {
      title.style.opacity = 0;
    }
    document.getElementById('film-count').textContent = r.type !== 'COMET_DASH' && t > T.ignite && t < T.impact
      ? 'T-' + ((T.impact - t) / 20).toFixed(2).padStart(5, '0') : '';
  }

  function resize() {
    const rc = box.getBoundingClientRect();
    renderer.setSize(rc.width, rc.height, false);
    composer.setSize(rc.width, rc.height);
    camera.aspect = rc.width / rc.height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(box);
  resize();

  // Idle shot when no film is rolling.
  function idle(now) {
    const a = now / 9000;
    camera.position.set(Math.sin(a) * 60, 34, Math.cos(a) * 60);
    camera.lookAt(0, 8, 0);
    camera.fov = 60;
    camera.updateProjectionMatrix();
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(box);
  let lastNow = performance.now();
  (function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    if (!visible) return;
    if (run) {
      const r = run;
      const t = ((now - r.start) / 1000) * 20;
      if (t >= r.T.duration) { stopFilm(); idle(now); composer.render(); return; }
      // Caster raises the weapon during the wind-up (the dash keeps it forward).
      const raise = r.type === 'COMET_DASH' ? 0.5 : 0.9;
      armPivot.rotation.x = -Math.PI * raise * smooth(progress(t, 2, Math.max(8, r.T.ignite * 0.6))) * (1 - smooth(progress(t, r.T.impact, r.T.impact + 20)));
      if (r.type !== 'COMET_DASH' && t < r.T.ignite && Math.random() < 0.8) {
        const a = t * 0.45, rad = 2.2 - (t % 20) * 0.08;
        spawnParticle(r.origin.clone().add(V(Math.cos(a) * rad, (t % 20) * 0.11, Math.sin(a) * rad)), V(0, 0.4, 0), r.T.color, 0.35, 20);
      }
      r.update(t);
      if (r.playerAt) player.position.copy(r.playerAt(t));
      updateDebris(dt);
      const [cam, look] = script(r, t);
      const k = shake(r, t);
      if (k > 0) {
        const j = V(Math.sin(t * 41.3) + Math.sin(t * 17.1), Math.sin(t * 37.7) + Math.cos(t * 23.9), Math.cos(t * 29.3)).multiplyScalar(0.35 * k);
        cam.add(j);
        look.addScaledVector(j, 2.5);
      }
      camera.position.copy(cam);
      camera.lookAt(look);
      camera.fov = lens(r, t);
      camera.updateProjectionMatrix();
      overlay(r, t);
    } else {
      idle(now);
    }
    flashLight.intensity *= Math.pow(0.04, dt);
    particles = particles.filter((p) => {
      p.life -= dt * 20;
      if (p.life <= 0) { fx.remove(p.s); p.s.material.dispose(); return false; }
      p.vel.y -= p.gravity * dt;
      p.s.position.addScaledVector(p.vel, dt);
      p.size += p.grow;
      p.s.scale.setScalar(p.size);
      p.s.material.opacity = (p.life / p.max) * (p.s.material.blending === THREE.AdditiveBlending ? 1 : 0.55);
      return true;
    });
    composer.render();
  })();

  // Start buttons + skip.
  const picks = document.getElementById('film-picks');
  WEAPONS.forEach((w) => {
    const b = document.createElement('button');
    b.className = 'btn' + (w.type === 'ORBITAL_LANCE' ? ' primary' : '');
    b.textContent = '▶ ' + TYPES[w.type].name;
    b.addEventListener('click', () => startFilm(w.type));
    picks.appendChild(b);
  });
  const skip = document.getElementById('film-skip');
  skip.classList.add('film-skip-btn');
  skip.addEventListener('click', stopFilm);
  addEventListener('keydown', (e) => { if (e.key === 'j' || e.key === 'J' || e.key === 'Escape') stopFilm(); });

  return (type) => {
    box.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    startFilm(type);
  };
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

starfield();
const play = film();
armory(play);
