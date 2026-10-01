// Helpers for the Marvel drivers (see ./marvel.js and ../driver.js for the rig contract).
// Faces and torso prints are borrowed from the "Avengers Brick Assemble" map figures so the
// drivers match the heroes standing around the track; the rigs themselves are new, compact,
// seated minifigs with effect parts (webs, repulsor beams, mandalas…) toggled by rig.fx.
import { THREE, BrickBuilder, plastic, seatedFig, mat4, cached } from './kit.js';
import * as P from '../maps/marvel-props.js';

export const M = P.M;
export const S = Math.sin, PI = Math.PI, UP = -2.75;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const bump = (x) => (x <= 0 || x >= 1 ? 0 : S(x * PI));        // 0 → 1 → 0 over 0..1
export const seg = (f, a, b) => clamp01((f - a) / (b - a));
export const vis = (o, on) => { if (o.visible !== on) o.visible = on; };
// a quick "shot": shoots out fast, holds, then retracts (0 outside the window)
export const shot = (f, a, b) => {
  const p = (f - a) / (b - a);
  if (p <= 0 || p >= 1) return 0;
  return Math.min(1, p * 5) * (p > 0.7 ? (1 - p) / 0.3 : 1);
};

// ---- materials ---------------------------------------------------------------------------
// The map figures create their face/torso materials when first built; building one primes
// the shared material cache, then faceMat/decalMat(key) hand back the same material.
const SRC = {
  spidey: P.spiderman, iron: P.ironman, cap: P.captain, thor: P.thor, hulk: P.hulk, widow: P.widow,
  hawk: P.hawkeye, panther: P.panther, strange: P.strange, starlord: P.starlord, gamora: P.gamora,
  drax: P.drax, thanos: P.thanos, loki: P.loki, ultron: P.ultron, groot: P.groot,
};
const primed = new Set();
const noop = () => {};
export function mapMats(key) {
  if (!primed.has(key)) { SRC[key](); primed.add(key); }
  return { face: P.faceMat(key, noop), decal: key === 'groot' ? null : P.decalMat(key, noop) };
}
export const faceMat = P.faceMat, decalMat = P.decalMat, shieldMesh = P.shieldMesh, mandalaMat = P.mandalaMat;

// additive, unlit glow for effects (beams, sparks, magic)
const fxCache = new Map();
export function fxMat(color, opacity = 0.9) {
  let m = fxCache.get(color + '|' + opacity);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    fxCache.set(color + '|' + opacity, m);
  }
  return m;
}
export const glow = (c, k = 2.5) => plastic(c, { emissive: c, emissiveIntensity: k });

const openCyl = () => cached('mvOpenCyl', () => new THREE.CylinderGeometry(1, 1, 1, 22, 1, true).translate(0, 0.5, 0));
const plane = () => cached('mvPlane', () => new THREE.PlaneGeometry(1, 1));
const sphere = () => cached('mvSphere', () => new THREE.SphereGeometry(1, 12, 8));

// ---- the seated hero ---------------------------------------------------------------------
// seatedFig with a printed head (face material + coloured top) and a torso print.
// o: seatedFig options + { face, decal, top, hair(hb, d, k, v), extra(b, d) }
//   k scales map head pieces (head radius 0.4), v scales map head heights (0.72)
export function hero(o) {
  return seatedFig({
    noStud: true, ...o,
    head: (hb, d) => {
      hb.add(openCyl(), o.face, 0, 0, 0, Math.PI, d.headR, d.headH, d.headR);
      hb.cyl(0, 0, 0, d.headR * 0.98, d.headH, o.top ?? o.skin, { seg: 20 });
      o.hair?.(hb, d, d.headR / 0.4, d.headH / 0.72);
    },
    torsoExtra: (b, d) => {
      if (o.decal) b.addMatrix(plane(), o.decal, mat4(0, d.chestY + 0.41 * d.s, 0.22 * d.s * d.D + 0.012, -0.024, 0, 0, 0.92 * d.s * d.W, 0.82 * d.s, 1));
      o.extra?.(b, d);
    },
  });
}

// a separately built part hung on a pivot (so it can be shown, hidden or spun)
export function prop(parent, x, y, z, fn, name = 'driver-prop') {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const b = new BrickBuilder(1); fn(b); g.add(b.build({ name }));
  parent.add(g);
  return g;
}

// A line shooting out of the hand along the arm (-Y): webs, repulsor and laser beams.
// Returns { g, set(len, pulse) }.
export function beam(parent, y, color, { r0 = 0.05, r1 = 0.12, flash = 0.2, web = false } = {}) {
  const g = new THREE.Group(); g.position.set(0, y, 0); g.visible = false;
  const mat = web ? plastic(0xf4f4f4) : fxMat(color);
  const line = new THREE.Mesh(cached(`mvbeam${r0},${r1}`, () => new THREE.CylinderGeometry(r0, r1, 1, 8, 1, !web).translate(0, -0.5, 0)), mat);
  g.add(line);
  let end = null;
  if (web) {
    end = new THREE.Mesh(cached('mvwebsplat', () => new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10)), mat);
    g.add(end);
  } else {
    end = new THREE.Mesh(sphere(), mat);
    end.scale.setScalar(flash);
    g.add(end);
  }
  parent.add(g);
  return {
    g,
    set(len, pulse = 1) {
      vis(g, len > 0.04);
      if (len <= 0.04) return;
      line.scale.y = len;
      if (web) end.position.y = -len;
      else end.scale.setScalar(flash * pulse);
    },
  };
}

// one mesh of small unlit gems in their own colours (Infinity Stones…)
export function gems(list) {
  const geos = list.map(([x, y, z, r, c]) => {
    const g = new THREE.SphereGeometry(r, 8, 6).translate(x, y, z);
    g.deleteAttribute('uv');
    const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  });
  const geo = geos.length > 1 ? mergeAll(geos) : geos[0];
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
}
function mergeAll(geos) {
  // tiny merge (same attributes, indexed)
  let vc = 0, ic = 0;
  for (const g of geos) { vc += g.attributes.position.count; ic += g.index.count; }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), col = new Float32Array(vc * 3), idx = new Uint16Array(ic);
  let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); col.set(g.attributes.color.array, vo * 3);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count; io += gi.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
// a flat spinning spell disc facing out of the hand (along -Y of the arm)
export function spellDisc(parent, y, size, mat) {
  const g = new THREE.Group(); g.position.set(0, y, 0); g.visible = false;
  const m = new THREE.Mesh(plane(), mat);
  m.rotation.x = Math.PI / 2; m.scale.set(size, size, 1);
  g.add(m);
  parent.add(g);
  return { g, m };
}
export { THREE, BrickBuilder, plastic, mat4, cached, openCyl, plane, sphere };
