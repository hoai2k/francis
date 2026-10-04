// Models and effects for the Minecraft powers (./minecraft.js): a pixel-skinned Creeper, the
// Totem of Undying, a Trident, an Ender Pearl, Elytra wings, a Channeling lightning bolt and the
// pixel-art item icons. Skins and pixel sprites come from ../drivers/minecraft-kit.js.
import * as THREE from 'three';
import { BrickBuilder } from '../lego.js';
import { skin, cube, rep, pixItem } from '../drivers/minecraft-kit.js';

const own = (m) => { m.userData.own = true; return m; };
// removes a model and disposes the materials it owns (shared skins and geometries stay cached)
export function disposeOwned(root) {
  if (!root) return;
  root.parent?.remove(root);
  root.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) if (m.userData.own) m.dispose(); });
}
export const addGlow = (c, op = 0.85) => own(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
let sph = null;
export const sphereGeo = () => (sph ||= new THREE.SphereGeometry(1, 16, 10));
let unitBox = null;
const boxGeo = () => (unitBox ||= new THREE.BoxGeometry(1, 1, 1));
let glowTex = null;
function glowSprite(color, size, op = 0.8) {
  if (!glowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  s.scale.setScalar(size);
  return s;
}

// ---- Creeper (~3 tall, faces +Z, feet at y 0); userData.mats flash white, userData.feet shuffle ----
const CP = { a: 0x5aa83a, g: 0x4a9a2e, L: 0x8ad06a, k: 0x141414, K: 0x203a14 };
export function creeperModel() {
  const head = skin('mcab-creeper-head', {
    front: { g: ['aaaaaaaa', 'aLaagaaa', 'akkaakka', 'akkaakka', 'aaakkaaa', 'aakKKkaa', 'aakkkkaa', 'aakaakaa'], p: CP, n: 0.22 },
    all: { g: rep('aaaaaaaa', 8), p: CP, n: 0.22 },
  }, { unique: true });
  const body = skin('mcab-creeper-body', { all: { g: rep('aaaa', 12), p: CP, n: 0.22 } }, { unique: true });
  for (const m of [head, body]) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 0; own(m); }
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  cube(inner, body, 1.0, 1.5, 0.5, 0, 1.4, 0);
  const feet = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(sx * 0.25, 0.65, sz * 0.5); inner.add(p);
    cube(p, body, 0.5, 0.65, 0.5, 0, -0.325, 0);
    feet.push(p);
  }
  const hd = new THREE.Group(); hd.position.y = 2.15; inner.add(hd);
  cube(hd, head, 1.0, 1.0, 1.0, 0, 0.5, 0);
  g.userData = { mats: [head, body], feet, head: hd, inner };
  return g;
}

// ---- Totem of Undying: a little golden idol with emerald eyes and belly --------------------------------
const TOTEM = [
  '.....kkkk.....', '....kyyyyk....', '....kGyyGk....', '....kyYYyk....', '.....kyyk.....', '.kk.kyyyyk.kk.', 'kyykyYyyYykyyk',
  '.kyyyYeeYyyyk.', '..kkkYeeYkkk..', '....kYyyYk....', '....kyYYyk....', '.....kyyk.....', '.....kkkk.....',
];
const TPAL = { k: 0x7a5410, y: 0xffe060, Y: 0xd8a020, G: 0x20a040, e: 0x30e080 };
export function totemModel() {
  const g = new THREE.Group();
  const m = pixItem('totem', TOTEM, TPAL, 0.11, 7, 6.5, { emissive: 0xffc030, emissiveIntensity: 0.25 });
  g.add(m);
  g.add(glowSprite(0xffd040, 2.4, 0.55));
  g.userData.spr = g.children[1];
  return g;
}

// ---- Trident: teal shaft and three prongs, pointing +Z --------------------------------------------------
export function tridentModel() {
  const b = new BrickBuilder(1), dark = 0x1f6a6a, mid = 0x3aa8a0, lite = 0x8af0e0;
  b.box(0, -0.06, -0.6, 0.12, 0.12, 2.6, dark);
  for (let i = 0; i < 6; i++) b.box(0, 0.0, -1.7 + i * 0.45, 0.13, 0.04, 0.12, mid);
  b.box(0, -0.08, 0.72, 0.9, 0.16, 0.16, mid);
  for (const x of [-0.37, 0, 0.37]) { b.box(x, -0.06, 1.12, 0.12, 0.12, x ? 0.65 : 0.85, lite); b.box(x, -0.07, x ? 1.48 : 1.58, 0.07, 0.07, 0.12, 0xffffff); }
  const g = new THREE.Group(); g.add(b.build({ name: 'trident', shadows: false }));
  g.add(glowSprite(0x60e8ff, 3.2, 0.5));
  return g;
}

// ---- Ender Pearl: a small pixel-skinned teal orb with a purple glow ----------------------------------------
export function pearlModel() {
  const sk = skin('mcab-pearl', { all: { g: ['abba', 'bccb', 'bcdb', 'abba'], p: { a: 0x0a3a30, b: 0x1a7a66, c: 0x3ac0a0, d: 0xb0ffe8 }, n: 0.05 } });
  const g = new THREE.Group();
  cube(g, sk, 0.7, 0.7, 0.7);
  g.add(glowSprite(0xb050ff, 2.2, 0.6));
  return g;
}

// ---- Elytra: two grey membrane wings; returns { g, wings: [{ p, sd }] } to open / flap ----------------------
export function elytraModel() {
  const g = new THREE.Group(), wings = [];
  const pal = [0x9a9aaa, 0x7a7a90, 0x5a5a70];
  for (const sd of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(sd * 0.2, 0, 0);
    const b = new BrickBuilder(1);
    // tapered wing: feather slats from the shoulder out and down, each a pixel step shorter
    for (let i = 0; i < 6; i++) {
      const len = 1.5 - i * 0.18, w = 0.24;
      b.box(sd * (0.1 + len / 2), -0.14 - i * w, 0, len, w, 0.07, pal[i % 2]);
      b.box(sd * (0.1 + len - 0.05), -0.14 - i * w, 0.01, 0.1, w, 0.08, pal[2]);
    }
    b.box(sd * 0.85, -0.02, 0, 1.6, 0.12, 0.1, pal[2]);
    p.add(b.build({ name: 'elytra-wing', shadows: false }));
    g.add(p); wings.push({ p, sd });
  }
  return { g, wings };
}

// ---- Channeling lightning: a jagged bolt of n boxes from the sky (rejag() re-randomises it) ----------------
export function boltModel(n = 10) {
  const g = new THREE.Group(), mat = addGlow(0xcfe8ff, 1), core = addGlow(0xffffff, 1), segs = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(boxGeo(), i % 3 ? mat : core); g.add(m); segs.push(m); }
  const A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  // from (0, h, 0) down to the origin
  g.userData = {
    mat, core,
    rejag(h, w = 0.35) {
      A.set(0, h, 0);
      for (let i = 0; i < n; i++) {
        const f = (i + 1) / n, j = i === n - 1 ? 0 : 1.8 * (1 - f * 0.6);
        B.set((Math.random() - 0.5) * 2 * j, h * (1 - f), (Math.random() - 0.5) * 2 * j);
        D.subVectors(B, A); const L = D.length();
        const m = segs[i];
        m.position.addVectors(A, B).multiplyScalar(0.5);
        m.quaternion.copy(Q.setFromUnitVectors(Y, D.normalize()));
        m.scale.set(w, L + w, w);
        A.copy(B);
      }
    },
  };
  g.add(glowSprite(0xbfe0ff, 6, 0.8));
  return g;
}
// a white additive ball that swells and fades (explosion / teleport flashes); update with f 0..1
export function flashModel(color) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(sphereGeo(), addGlow(0xffffff, 1)), halo = new THREE.Mesh(sphereGeo(), addGlow(color, 0.7));
  g.add(halo, core);
  g.userData.set = (f, size) => {
    const e = 1 - (1 - f) * (1 - f);
    core.scale.setScalar(size * 0.45 * (0.3 + e) * (1 - f * 0.6)); halo.scale.setScalar(size * (0.25 + e));
    core.material.opacity = 1 - f; halo.material.opacity = 0.7 * (1 - f);
  };
  return g;
}
export function prewarmAll() {
  return [creeperModel(), totemModel(), tridentModel(), pearlModel(), elytraModel().g, boltModel(), flashModel(0xffffff)];
}

// ---- icons: pixel-art SVGs (viewBox 0 0 64 64) from grids, merged into horizontal runs ----------------------
export function pixIcon(grid, pal) {
  const n = grid.length, w = grid[0].length, s = 64 / Math.max(n, w), ox = (64 - w * s) / 2, oy = (64 - n * s) / 2;
  let out = `<svg viewBox="0 0 64 64" shape-rendering="crispEdges">`;
  grid.forEach((r, j) => {
    for (let i = 0; i < r.length;) {
      const c = r[i]; let k = i + 1;
      while (k < r.length && r[k] === c) k++;
      if (pal[c]) out += `<rect x="${ox + i * s}" y="${oy + j * s}" width="${(k - i) * s}" height="${s}" fill="${pal[c]}"/>`;
      i = k;
    }
  });
  return out + '</svg>';
}
// Creeper face: mottled greens with the black face
const mottle = (rowsIn, seed) => { let sd = seed; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); return rowsIn.map((row) => [...row].map((c) => (c === 'a' ? 'agLa'[Math.floor(r() * 4)] : c)).join('')); };
export const ICON_CREEPER = pixIcon(mottle(['aaaaaaaa', 'aaaaaaaa', 'akkaakka', 'akkaakka', 'aaakkaaa', 'aakkkkaa', 'aakkkkaa', 'aakaakaa'], 7),
  { a: '#5aa83a', g: '#4a9a2e', L: '#8ad06a', k: '#141414' });
export const ICON_TOTEM = pixIcon(['..............', ...TOTEM, '..............'],
  { k: '#7a5410', y: '#ffe060', Y: '#d8a020', G: '#20a040', e: '#30e080' });
export const ICON_TRIDENT = (() => {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const put = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = c; };
  for (let i = 0; i < 10; i++) { put(1 + i, 14 - i, 'd'); put(2 + i, 14 - i, i % 3 ? 'm' : 'd'); }
  for (const [x, y] of [[9, 2], [10, 3], [11, 4], [12, 5], [13, 6]]) put(x, y, 'm');
  for (const [x, y] of [[10, 1], [11, 0], [14, 5], [15, 4], [12, 3], [13, 2], [14, 1]]) put(x, y, 'l');
  for (const [x, y] of [[11, 0], [15, 4], [14, 1]]) put(x, y, 'w');
  return pixIcon(g.map((r) => r.join('')), { d: '#1f6a6a', m: '#3aa8a0', l: '#8af0e0', w: '#ffffff' });
})();
export const ICON_ELYTRA = (() => {
  const L = ['........', '.kkkk...', 'kgggGk..', 'kggGggk.', 'kgGgggk.', 'kggGgggk', 'kgGggggk', '.kgGgggk', '.kggGggk', '.kgGggk.', '..kgGgk.', '..kggGk.', '...kgk..', '...kgk..', '....k...', '........'];
  return pixIcon(L.map((r) => r + [...r].reverse().join('')),
    { k: '#3a3a4a', g: '#a8a8b8', G: '#6a6a80' });
})();
export const ICON_PEARL = (() => {
  const g = [];
  for (let y = 0; y < 16; y++) {
    let r = '';
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      r += d < 2.6 ? 'l' : d < 4.6 ? 'm' : d < 6.1 ? 'd' : d < 7.3 ? 'k' : '.';
    }
    g.push(r);
  }
  g[5] = g[5].slice(0, 5) + 'ww' + g[5].slice(7);
  return pixIcon(g, { k: '#0a2a24', d: '#0e5a4a', m: '#2a9a80', l: '#7ae8c8', w: '#ffffff' });
})();
