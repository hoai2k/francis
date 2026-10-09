import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const ASSETS = './mod/src/main/resources/assets/starfall/';

// Mirrors StrikeType.java in the mod.
const TYPES = {
  SHOOTING_STAR: { key: 'shooting_star', color: 0xffd25a, ignite: 40, duration: 150, name: 'SHOOTING STAR', jp: '流 星' },
  COMET_SLASH: { key: 'comet_slash', color: 0x5ef0ff, ignite: 24, duration: 100, name: 'COMET SLASH', jp: '彗 星 斬' },
  SEVEN_STARS: { key: 'seven_stars', color: 0xc08cff, ignite: 40, duration: 230, name: 'SEVEN STARS', jp: '北 斗 七 星' },
  SUPERNOVA: { key: 'supernova', color: 0xff7a3a, ignite: 70, duration: 270, name: 'SUPERNOVA', jp: '超 新 星' },
};

const WEAPONS = [
  {
    id: 'stellar_remote', name: 'Stellar Remote', type: 'SHOOTING_STAR', accent: '#ffd25a',
    desc: 'A satellite detonator with a radar screen, a big red button and a star on the antenna. Point it, press it, and one shooting star lands on that spot.',
    stats: { 'Crater radius': '11 blocks', 'Film length': '7.5 s', 'Cooldown': '10 s', 'Crafted from': 'Iron, gold, redstone, amethyst' },
  },
  {
    id: 'starfall_blade', name: 'Starfall Blade', type: 'COMET_SLASH', accent: '#5ef0ff',
    desc: 'A netherite-tier sword with a galaxy inside the blade and small stars orbiting the edge. Right-click and a comet comes in low from the horizon.',
    stats: { 'Attack damage': '9 (netherite tier)', 'Crater radius': '6.5 blocks', 'Film length': '5 s', 'Cooldown': '5 s' },
  },
  {
    id: 'seven_stars_scepter', name: 'Seven Stars Scepter', type: 'SEVEN_STARS', accent: '#c08cff',
    desc: 'A violet staff with the Big Dipper floating above a gyroscope head. All seven stars fall one by one, in the shape of the constellation.',
    stats: { 'Stars': '7', 'Crater radius': '5.5 blocks each', 'Film length': '11.5 s', 'Cooldown': '20 s' },
  },
  {
    id: 'supernova_core', name: 'Supernova Core', type: 'SUPERNOVA', accent: '#ff7a3a',
    desc: 'A captured star spinning inside three gyroscope rings. It calls down a star the size of a house. Stand well back.',
    stats: { 'Crater radius': '19 blocks', 'Film length': '13.5 s', 'Cooldown': '60 s', 'Crafted from': '8 Star Fragments + Nether Star' },
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
const DIPPER = [[-19, 0], [-11, 3], [-5, 2], [1, 0], [3, -8], [13, -7], [12, 4]];

/** Same layout as StrikeType.plan() in the mod. */
function plan(typeName, origin, target) {
  const T = TYPES[typeName];
  let back = V(origin.x - target.x, 0, origin.z - target.z);
  back = back.lengthSq() < 1e-4 ? V(0, 0, 1) : back.normalize();
  const side = V(-back.z, 0, back.x);
  const at = (base, b, s, u) => base.clone().addScaledVector(back, b).addScaledVector(side, s).add(V(0, u, 0));
  const star = (start, end, ignite, travel, radius, size) => ({ start, end, ignite, travel, radius, size, impact: ignite + travel });
  switch (typeName) {
    case 'SHOOTING_STAR': return [star(at(target, 90, 25, 150), target.clone(), T.ignite, 50, 11, 3.2)];
    case 'COMET_SLASH': return [star(at(target, 110, -30, 55), target.clone(), T.ignite, 30, 6.5, 2.2)];
    case 'SEVEN_STARS': return DIPPER.map(([dx, dy], i) => {
      const land = at(target, dy * 0.8, dx * 0.8, 0);
      return star(at(land, 70 + i * 3, 10 - i * 3, 140), land, T.ignite + i * 14, 44, 5.5, 2.4);
    });
    default: return [star(at(target, 60, -20, 230), target.clone(), T.ignite, 90, 19, 10)];
  }
}

const ease = (p) => Math.pow(clamp(p, 0, 1), 1.7);
const starPosAt = (s, t) => s.start.clone().lerp(s.end, ease((t - s.ignite) / s.travel));

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
  let starVis = [];
  let particles = [];
  const particleGeo = new THREE.PlaneGeometry(1, 1);

  function spawnParticle(pos, vel, color, size, life, opts = {}) {
    const s = new THREE.Sprite(opts.smoke
      ? new THREE.SpriteMaterial({ map: SMOKE_TEX, color, transparent: true, opacity: 0.55, depthWrite: false })
      : additive(color, 1));
    s.position.copy(pos);
    s.scale.setScalar(size);
    fx.add(s);
    particles.push({ s, vel, life, max: life, size, grow: opts.grow || 0, gravity: opts.gravity || 0 });
  }

  function makeStarVisual(spec, color) {
    const g = new THREE.Group();
    const halo = new THREE.Sprite(additive(color, 0.9));
    const core = new THREE.Sprite(additive(0xffffff, 1));
    const sp1 = new THREE.Sprite(additive(0xfff6e0, 1, SPARKLE_TEX));
    const sp2 = new THREE.Sprite(additive(color, 1, SPARKLE_TEX));
    g.add(halo, core, sp1, sp2);
    const tail = [];
    for (let i = 0; i < 26; i++) {
      const t = new THREE.Sprite(additive(i % 3 ? color : 0xffffff, 1));
      tail.push(t);
      g.add(t);
    }
    g.visible = false;
    fx.add(g);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(spec.end).add(V(0, 0.6, 0));
    ring.visible = false;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 160, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    pillar.position.copy(spec.end).add(V(0, 80, 0));
    pillar.visible = false;
    const fire = new THREE.Sprite(additive(color, 1));
    const fireCore = new THREE.Sprite(additive(0xfff4d0, 1));
    fire.position.copy(spec.end).add(V(0, spec.radius * 0.3, 0));
    fireCore.position.copy(fire.position);
    fire.visible = fireCore.visible = false;
    fx.add(ring, pillar, fire, fireCore);
    return { spec, g, halo, core, sp1, sp2, tail, ring, pillar, fire, fireCore, done: false };
  }

  function updateStar(v, t, color) {
    const { spec } = v;
    if (t < spec.ignite - 20) return;
    if (t < spec.impact) {
      const p = starPosAt(spec, t);
      const grow = clamp((t - (spec.ignite - 20)) / 20, 0, 1);
      const tw = t < spec.ignite ? 1 + 0.35 * Math.sin(t * 1.7) : 1;
      const size = spec.size * (0.25 + 0.75 * grow) * tw;
      v.g.visible = true;
      v.halo.position.copy(p); v.halo.scale.setScalar(size * 6);
      v.core.position.copy(p); v.core.scale.setScalar(size * 1.8);
      v.sp1.position.copy(p); v.sp1.scale.setScalar(size * 5); v.sp1.material.rotation = t * 0.09;
      v.sp2.position.copy(p); v.sp2.scale.setScalar(size * 3); v.sp2.material.rotation = 0.78 - t * 0.19;
      const dir = spec.end.clone().sub(spec.start).normalize();
      const flown = p.distanceTo(spec.start);
      const len = Math.min(flown, spec.size * 22);
      v.tail.forEach((s, i) => {
        const f = i / v.tail.length;
        s.visible = t > spec.ignite;
        s.position.copy(p).addScaledVector(dir, -len * f);
        s.scale.setScalar(spec.size * 2.2 * Math.pow(1 - f, 0.8) + 0.2);
        s.material.opacity = Math.pow(1 - f, 1.4) * clamp((s.position.distanceTo(camera.position) - 10) / 20, 0, 1);
      });
      if (t > spec.ignite && Math.random() < 0.9) {
        spawnParticle(p.clone().add(V((Math.random() - 0.5) * spec.size, (Math.random() - 0.5) * spec.size, (Math.random() - 0.5) * spec.size)),
          V((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2), Math.random() < 0.5 ? 0xffffff : color, spec.size * 0.5, 25);
        if (Math.random() < 0.4) spawnParticle(p.clone(), V(0, 0.5, 0), 0x2a2a36, spec.size * 0.9, 40, { smoke: true, grow: spec.size * 0.05 });
      }
      return;
    }
    v.g.visible = false;
    if (!v.done) {
      v.done = true;
      impact(spec, color);
    }
    const a = t - spec.impact;
    const fire = Math.pow(clamp(1 - a / 30, 0, 1), 2);
    v.fire.visible = v.fireCore.visible = fire > 0;
    const fs = spec.radius * (1.6 + a / 8);
    v.fire.scale.setScalar(fs * 2.2); v.fire.material.opacity = fire;
    v.fireCore.scale.setScalar(fs); v.fireCore.material.opacity = fire;
    const ring = clamp(1 - a / 25, 0, 1);
    v.ring.visible = ring > 0;
    v.ring.scale.setScalar(spec.radius * (0.75 + a * 0.28));
    v.ring.material.opacity = ring;
    const pillar = clamp(1 - a / 18, 0, 1);
    v.pillar.visible = pillar > 0;
    v.pillar.scale.set(spec.radius * 0.35 * pillar + 0.01, 1, spec.radius * 0.35 * pillar + 0.01);
    v.pillar.material.opacity = pillar * 0.8;
  }

  function impact(spec, color) {
    carve(spec.end, spec.radius);
    flashLight.position.copy(spec.end).add(V(0, 6, 0));
    flashLight.color.set(color);
    flashLight.intensity = 400 + spec.radius * 60;
    const c = spec.end;
    const n = Math.min(160, 40 + spec.radius * 8);
    for (let i = 0; i < n; i++) {
      const dir = V(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize();
      spawnParticle(c.clone().add(V(0, 1, 0)), dir.multiplyScalar(spec.radius * (0.8 + Math.random() * 1.6)),
        [0xffffff, color, 0xff8a2e, 0xffd25a][i % 4], 0.6 + Math.random() * 1.2, 30 + Math.random() * 30, { gravity: 18 });
    }
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      spawnParticle(c.clone().add(V(0, 0.8, 0)), V(Math.cos(a), 0.05, Math.sin(a)).multiplyScalar(spec.radius * 3),
        0xbbbbcc, 2.5, 26, { smoke: true, grow: 0.25 });
    }
    for (let i = 0; i < spec.radius * 3; i++) {
      spawnParticle(c.clone().add(V((Math.random() - 0.5) * spec.radius * 0.6, Math.random() * spec.radius, (Math.random() - 0.5) * spec.radius * 0.6)),
        V(0, 2 + Math.random() * 3, 0), 0x55555f, spec.radius * 0.6, 80, { smoke: true, grow: 0.12 });
    }
    sound.boom(spec.radius);
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

  function startFilm(typeName) {
    sound.unlock();
    stopFilm();
    resetTerrain();
    const T = TYPES[typeName];
    const origin = V(0.5, height(0, 22) + 1, 22.5);
    const tmp = plan(typeName, origin, V(0.5, 0, 0));
    const maxR = Math.max(...tmp.map((s) => s.radius));
    const dist = maxR * 1.6 + 7 + (typeName === 'SEVEN_STARS' ? 14 : 0);
    const tz = Math.floor(origin.z - dist);
    const target = V(0.5, height(0, tz) + 1, tz + 0.5);
    const stars = plan(typeName, origin, target);
    let back = V(origin.x - target.x, 0, origin.z - target.z).normalize();
    const r = {
      type: typeName, T, origin, target, stars, back, fwd: back.clone().negate(), side: V(-back.z, 0, back.x),
      eye: origin.clone().add(V(0, 1.62, 0)),
      radius: typeName === 'SEVEN_STARS' ? 16 : maxR,
      last: Math.max(...stars.map((s) => s.impact)),
      vis: stars.map((s) => makeStarVisual(s, T.color)),
      start: performance.now(),
      cues: new Set(),
    };
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
    for (const v of run.vis) fx.remove(v.g, v.ring, v.pillar, v.fire, v.fireCore);
    for (const p of particles) fx.remove(p.s);
    particles = [];
    run = null;
    flashLight.intensity = 0;
    box.classList.remove('rolling');
    document.getElementById('film-title').style.opacity = 0;
    document.getElementById('film-flash').style.opacity = 0;
    document.getElementById('film-count').textContent = '';
  }

  function script(r, t) {
    const lead = r.stars[0];
    const ig = r.T.ignite;
    const closeEnd = ig * 0.45;
    const { eye, fwd, side, back, origin, target, radius } = r;
    if (t < closeEnd) {
      const u = smooth(progress(t, 0, closeEnd));
      return [eye.clone().addScaledVector(fwd, 2.6 - u * 0.6).addScaledVector(side, 1.4 - 2.6 * u).add(V(0, -0.5 + 0.3 * u, 0)), eye.clone().add(V(0, -0.1, 0))];
    }
    if (t < ig) {
      const u = smooth(progress(t, closeEnd, ig));
      return [origin.clone().addScaledVector(fwd, 3.4).addScaledVector(side, -1.2).add(V(0, 0.35, 0)), eye.clone().add(V(0, 0.6, 0)).lerp(lead.start, u * 0.9)];
    }
    if (t < ig + 18) {
      return [eye.clone().addScaledVector(fwd, 2.8).addScaledVector(side, 0.6).add(V(0, -0.4, 0)), starPosAt(lead, t)];
    }
    const wideStart = r.last - 8;
    if (t < wideStart) {
      if (r.type === 'SEVEN_STARS') {
        const a = (t - ig) * 0.008;
        const dir = back.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
        return [target.clone().addScaledVector(dir, 54).add(V(0, 22, 0)), target.clone().add(V(0, 14, 0))];
      }
      if (r.type === 'SUPERNOVA' && t > ig + 50) {
        const u = progress(t, ig + 50, wideStart);
        return [target.clone().addScaledVector(back, radius * 2.8 - u * 6).addScaledVector(side, radius).add(V(0, 3, 0)), starPosAt(lead, t).lerp(target, 0.1)];
      }
      const p = starPosAt(lead, t);
      const dir = lead.end.clone().sub(lead.start).normalize();
      const cam = p.clone().addScaledVector(dir, -(14 + lead.size * 3)).addScaledVector(side, 8 + lead.size).add(V(0, 4, 0));
      cam.y = Math.max(cam.y, target.y + 6);
      return [cam, p.clone().lerp(target, 0.15)];
    }
    const wide = target.clone().addScaledVector(side, radius * 2.6 + 14).addScaledVector(back, radius * 1.8 + 10).add(V(0, radius * 0.9 + 8, 0));
    if (t < r.last + 30) {
      const u = smooth(progress(t, wideStart, r.last + 30));
      const look = target.clone().add(V(0, radius * 0.25, 0));
      if (t < r.last && r.type !== 'SEVEN_STARS') look.lerp(starPosAt(lead, t), 0.3 * (1 - progress(t, wideStart, r.last)));
      return [wide.clone().lerp(target, 0.12 * u), look];
    }
    const u = smooth(progress(t, r.last + 30, r.T.duration));
    return [wide.clone().lerp(target, 0.12).addScaledVector(back, u * radius).add(V(0, u * (radius + 10), 0)), target.clone().add(V(0, -radius * 0.2, 0))];
  }

  function shake(r, t) {
    let s = 0;
    for (const st of r.stars) {
      const since = t - st.impact;
      if (since >= 0 && since < 30) s += (1 - since / 30) * (0.4 + st.radius / 8);
    }
    if (r.type === 'SUPERNOVA') s += progress(t, r.T.ignite, r.last) * 0.25;
    return reducedMotion ? s * 0.2 : s;
  }

  function lens(r, t) {
    const ig = r.T.ignite;
    let f;
    if (t < ig * 0.45) f = 50;
    else if (t < ig) f = 72;
    else if (t < ig + 18) f = lerp(22, 34, progress(t, ig, ig + 18));
    else if (t < r.last - 8) f = r.type === 'SEVEN_STARS' ? 62 : 80;
    else f = 64;
    for (const st of r.stars) {
      const since = t - st.impact;
      if (since >= 0 && since < 8) f -= (1 - since / 8) * 8;
    }
    return f;
  }

  function overlay(r, t) {
    const T = r.T;
    let flash = 0;
    for (const st of r.stars) {
      const since = t - st.impact;
      if (since >= 0 && since < 14) flash = Math.max(flash, (1 - since / 14) * Math.min(1, st.radius / 12));
    }
    const ign = Math.max(0, 1 - Math.abs(t - T.ignite) / 6) * 0.35;
    const fl = document.getElementById('film-flash');
    fl.style.opacity = Math.max(flash * 0.95, ign) * (reducedMotion ? 0.3 : 1);
    fl.style.background = flash > 0.6 || ign > flash ? '#fff6d0' : '#' + T.color.toString(16).padStart(6, '0');

    const title = document.getElementById('film-title');
    const tin = 6, tout = T.ignite + 22;
    if (t > tin && t < tout) {
      title.style.opacity = Math.min(1, (tout - t) / 8);
      document.getElementById('film-name').textContent = T.name.slice(0, Math.floor((t - tin) / 1.3));
      document.getElementById('film-jp').style.opacity = smooth(progress(t, tin + 8, tin + 16));
      document.getElementById('film-rule').style.width = Math.min(1, (t - tin) / 12) * 40 + '%';
    } else {
      title.style.opacity = 0;
    }
    document.getElementById('film-count').textContent = t > T.ignite && t < r.last ? 'T-' + ((r.last - t) / 20).toFixed(2).padStart(5, '0') : '';
  }

  function cue(r, name, cond, fn) {
    if (cond && !r.cues.has(name)) { r.cues.add(name); fn(); }
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
      cue(r, 'chime', t >= r.T.ignite - 20, () => sound.chime());
      cue(r, 'whoosh', t >= r.T.ignite, () => sound.whoosh((r.last - r.T.ignite) / 20));
      // Caster raises the weapon to the sky during the wind-up.
      armPivot.rotation.x = -Math.PI * 0.9 * smooth(progress(t, 4, r.T.ignite * 0.6)) * (1 - smooth(progress(t, r.last, r.last + 20)));
      if (t < r.T.ignite && Math.random() < 0.8) {
        const a = t * 0.45;
        const rad = 2.2 - (t % 20) * 0.08;
        spawnParticle(r.origin.clone().add(V(Math.cos(a) * rad, (t % 20) * 0.11, Math.sin(a) * rad)), V(0, 0.4, 0), r.T.color, 0.35, 20);
      }
      r.vis.forEach((v) => updateStar(v, t, r.T.color));
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
    b.className = 'btn' + (w.type === 'SHOOTING_STAR' ? ' primary' : '');
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
