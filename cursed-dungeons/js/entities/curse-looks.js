// Appearance of the regular (non-boss) curses: grotesque JJK cursed spirits
// built in the blocky Minecraft Dungeons style.
//
// Each look is one painted 64x64 HD skin per kind. The limb boxes use the
// standard skin layout, and all extra detail (eyes, teeth, jaws, tumours,
// claws, chains, talismans, hair) is mapped onto small painted swatches in the
// unused parts of that same skin. Then every static box is merged per
// (group, material), so a whole curse is one skin material plus at most one
// animated glow material, at about 7-13 meshes. Merged geometry and materials
// are cached per kind: spawning a curse never compiles a shader and never
// merges geometry twice.
//
// Every build returns a Rig with the fields enemy.js and the Rig animation
// use (limbs, hands, extras.orbs / extras.shield, float, hunch, blob) plus
//   rig.idle(dt, owner)   per-frame flavour: jaws, eyes, sacs, tails, particles
import * as THREE from 'three/webgpu';
import { positionLocal, positionWorld, floor, hash, vec3, sin, uniform, length, uv, smoothstep } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';
import { addRim } from './boss-looks.js';
import { U } from '../gfx/materials.js';
import { mulberry32, damp } from '../util.js';

const SK = 64;
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const v1 = new THREE.Vector3();
// transform in skin pixels
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(_p.set(x * PX, y * PX, z * PX), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
function grp(parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const g = new THREE.Group(); g.position.set(x * PX, y * PX, z * PX); g.rotation.set(rx, ry, rz); parent.add(g); return g; }
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const rate = (perSec, dt, bud = 1) => Math.floor(perSec * dt * bud + Math.random());
const HP = Math.PI / 2;

// ---------------------------------------------------------------- skin layout
const BOX = { head: [0, 0, 8, 8, 8], body: [16, 16, 8, 12, 4], armR: [40, 16, 4, 12, 4], armL: [32, 48, 4, 12, 4], legR: [0, 16, 4, 12, 4], legL: [16, 48, 4, 12, 4] };
const face = (k) => { const [u, v, w, h, d] = BOX[k]; return { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d + w + d, v + d, w, h], ring: [u, v + d, 2 * (w + d), h] }; };
// free 4x4 swatch slots: hat, jacket and overlay regions (curses don't use them) and the unused strip at x 56..63
const SLOTS = (() => { const s = []; const add = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y += 4) for (let x = x0; x < x1; x += 4) s.push([x, y]); }; add(32, 0, 64, 16); add(56, 16, 64, 48); add(16, 32, 40, 48); add(40, 32, 56, 48); add(48, 48, 64, 64); add(0, 32, 16, 64); return s; })();

// set one BoxGeometry face's UV quad to a rect of the skin (logical pixels)
function setFace(uvA, f, x, y, w, h) {
  const u0 = x / SK, u1 = (x + w) / SK, v0 = 1 - (y + h) / SK, v1y = 1 - y / SK;
  const q = f === 3 ? [u0, v0, u1, v0, u0, v1y, u1, v1y] : [u0, v1y, u1, v1y, u0, v0, u1, v0];
  for (let k = 0; k < 4; k++) uvA.setXY(f * 4 + k, q[k * 2], q[k * 2 + 1]);
}
// remap a limb box to the standard layout of part k (stretched to the box size)
function remapStd(geo, k) {
  const f = face(k), uvA = geo.attributes.uv;
  [f.left, f.right, f.top, f.bottom, f.front, f.back].forEach((r, i) => setFace(uvA, i, r[0], r[1], r[2], r[3]));
  uvA.needsUpdate = true;
  return geo;
}

// ---------------------------------------------------------------- painting
function paintBox(S, k, c, noise) { const [u, v, w, h, d] = BOX[k]; S.box(u, v, w, h, d, c, noise); }
function mottle(S, k, dark, n, light) {
  const f = face(k);
  for (const key of ['ring', 'top', 'bottom']) {
    const [x, y, w, h] = f[key]; const cnt = Math.round(n * w * h / 64);
    for (let i = 0; i < cnt; i++) { const px = x + Math.floor(S.r() * w), py = y + Math.floor(S.r() * h); S.px(px, py, light && S.r() < 0.3 ? light : dark); }
  }
}
// a thin wandering vein (sub-pixel) inside rect [x0,y0,x1,y1)
function vein(S, x, y, len, c, mat, x0, y0, x1, y1) {
  for (let i = 0; i < len; i++) {
    S.fineRect(x, y, 0.5, 0.5, c, mat);
    const r = S.r(); if (r < 0.3) x -= 0.5; else if (r < 0.6) x += 0.5; else y += 0.5;
    if (S.r() < 0.35) y += 0.5;
    x = Math.max(x0, Math.min(x1 - 0.5, x)); if (y >= y1 || y < y0) break;
  }
}
function veins(S, k, n, c, mat, len = 10) { const [x, y, w, h] = face(k).ring; for (let i = 0; i < n; i++) vein(S, x + S.r() * w, y + S.r() * h * 0.5, len, c, mat, x, y, x + w, y + h); }
// standard flesh part: base colour, mottling, darker underside, dark veins
function flesh(S, k, base, dark, o = {}) {
  S.mat = o.mat ?? 'flesh'; paintBox(S, k, base, o.noise ?? 0.2);
  const f = face(k);
  if (o.top != null) S.rect(...f.top, o.top, 0.2);
  if (o.shade !== false) { const [x, y, w, h] = f.ring; S.rect(x, y + h - 1, w, 1, dark, 0.2); S.rect(...f.bottom, dark, 0.2); }
  mottle(S, k, dark, o.blotch ?? 7, o.light);
  if (o.veins) veins(S, k, o.veins, o.veinC ?? dark, 'flesh', o.veinLen ?? 9);
}
// glowing crack: random walk downward
function crack(S, x, y, len, x0, x1, c1, c2) {
  const m = S.mat; S.mat = 'glow';
  for (let i = 0; i < len; i++) { S.px(x, y, i % 3 === 1 ? c2 : c1); const r = S.r(); if (r < 0.3 && x > x0) x--; else if (r > 0.7 && x < x1) x++; y++; }
  S.mat = m;
}
// thin glowing vein (sub-pixel random walk) for cracks of cursed energy
function glowVein(S, x, y, len, c1, c2, x0, y0, x1, y1) {
  for (let i = 0; i < len; i++) {
    S.fineRect(x, y, 0.5, 0.5, i % 4 === 2 ? c2 : c1, 'glow');
    const r = S.r(); if (r < 0.28) x -= 0.5; else if (r < 0.56) x += 0.5; else y += 0.5;
    if (S.r() < 0.3) y += 0.5;
    x = Math.max(x0, Math.min(x1 - 0.5, x)); if (y >= y1) break;
  }
}
// eyeball decal: veined sclera, glowing iris, slit or round pupil, glint
const eyeDecal = (iris, sclera, o = {}) => (S, x, y) => {
  S.mat = 'eye'; S.rect(x, y, 4, 4, sclera, 0.06);
  const sd = new THREE.Color(sclera).multiplyScalar(0.72).getHex();
  S.fineRect(x, y, 4, 0.5, sd); S.fineRect(x, y + 3.5, 4, 0.5, sd); S.fineRect(x, y, 0.5, 4, sd); S.fineRect(x + 3.5, y, 0.5, 4, sd);
  const vc = o.veinC ?? 0xb02a2a;
  S.fineRect(x, y + 1, 1, 0.5, vc); S.fineRect(x + 3, y + 2.5, 1, 0.5, vc); S.fineRect(x + 1.5, y + 3.5, 0.5, 0.5, vc); S.fineRect(x + 2.5, y, 0.5, 0.5, vc);
  S.rect(x + 1, y + 1, 2, 2, iris, 0.02);
  S.fineRect(x + 0.5, y + 1.5, 0.5, 1, o.ring ?? iris); S.fineRect(x + 3, y + 1.5, 0.5, 1, o.ring ?? iris);
  if (o.round) S.fineRect(x + 1.5, y + 1.5, 1, 1, o.pupil ?? 0x080204); else S.fineRect(x + 1.75 - 0.25, y + 1, 1 - 0.5, 2, o.pupil ?? 0x080204);
  S.fine(x + 1, y + 1, 0xffffff);
};
// iris-only decal (the moving pupil caps on blob / brood mother eyes)
const irisDecal = (iris, ring) => (S, x, y) => {
  S.mat = 'eye'; S.rect(x, y, 4, 4, iris, 0.03);
  S.fineRect(x, y, 4, 0.5, ring); S.fineRect(x, y + 3.5, 4, 0.5, ring); S.fineRect(x, y, 0.5, 4, ring); S.fineRect(x + 3.5, y, 0.5, 4, ring);
  S.fineRect(x + 1.5, y + 0.5, 1, 3, 0x070204); S.fineRect(x + 1.25, y + 1.25, 1.5, 1.5, 0x070204); S.fine(x + 1, y + 1, 0xffffff);
};
// ofuda talisman: aged paper, red border and a red brush glyph
const ofudaDecal = (paper = 0xe9dcb4, ink = 0xc01818) => (S, x, y) => {
  S.mat = 'cloth'; S.rect(x, y, 4, 4, paper, 0.05);
  S.fineRect(x, y, 4, 0.5, ink, 'cloth'); S.fineRect(x, y + 3.5, 4, 0.5, ink, 'cloth');
  S.fineRect(x + 1.75, y + 0.5, 0.5, 3, ink, 'cloth'); S.fineRect(x + 1, y + 1, 2, 0.5, ink, 'cloth'); S.fineRect(x + 0.75, y + 2, 2.5, 0.5, ink, 'cloth');
  S.fineRect(x + 1, y + 2.5, 0.5, 0.5, ink, 'cloth'); S.fineRect(x + 2.5, y + 2.5, 0.5, 0.5, ink, 'cloth');
};

// ---------------------------------------------------------------- materials
const MATS = new Map(), GEOS = new Map(), GLOWS = new Map();
const PLACEHOLDER = new THREE.MeshBasicNodeMaterial();
const SKIN = { skin: true };   // bin key for the kind's skin material (resolved at flush)
// Animated cursed glow (acid sacs, womb, runes): pixel noise and a pulse that
// is phase-shifted by world position, so a crowd of curses never pulses in sync.
function glowMat(hex, o = {}) {
  const key = [hex, o.base ?? 1.6, o.amp ?? 0.7, o.speed ?? 3, o.dark ?? 0.35].join(':');
  if (GLOWS.has(key)) return GLOWS.get(key);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.3 });
  const c = new THREE.Color(hex);
  const cell = floor(positionLocal.div(PX));
  const n = hash(cell.x.add(cell.y.mul(57.0)).add(cell.z.mul(131.0)));
  const ph = positionWorld.x.mul(1.7).add(positionWorld.z.mul(2.3));
  const col = vec3(c.r, c.g, c.b).mul(n.mul(0.45).add(0.78));
  m.colorNode = col.mul(o.dark ?? 0.35);
  m.emissiveNode = col.mul(sin(U.time.mul(o.speed ?? 3).add(ph).add(n.mul(1.8))).mul(o.amp ?? 0.7).add(o.base ?? 1.6));
  GLOWS.set(key, m);
  return m;
}

// ---------------------------------------------------------------- kit
class Kit {
  constructor(kind, seed) {
    this.kind = kind;
    this.paint = !MATS.has(kind);                 // first build of a kind paints and merges
    this.S = this.paint ? new Skin(seed) : null;
    this.r = mulberry32(seed * 3 + 1);
    this.n = 0; this.sw = new Map(); this.bins = new Map();
  }
  slot() { const s = SLOTS[this.n++]; if (!s) throw new Error('curse skin: out of swatch slots'); return s; }
  // tiling swatch: a noisy solid colour of one surface kind
  solid(name, c, noise = 0.14, mat = 'flesh', fn = null) { const [x, y] = this.slot(); if (this.paint) { this.S.mat = mat; this.S.rect(x, y, 4, 4, c, noise); fn?.(this.S, x, y); } this.sw.set(name, [x + 0.5, y + 0.5, 3, 3, true]); }
  // decal swatch: painted by fn and stretched over the whole face
  decal(name, fn) { const [x, y] = this.slot(); if (this.paint) fn(this.S, x, y); this.sw.set(name, [x, y, 4, 4, false]); }
  add(group, geo, mat) {
    if (!this.bins.has(group)) this.bins.set(group, new Map());
    const b = this.bins.get(group); if (!b.has(mat)) b.set(mat, []); b.get(mat).push(geo);
  }
  // box in skin pixels mapped onto swatches: spec is a swatch name or
  // { a: default, f: front(+z), b: back, s: sides, t: top, u: underside }
  box(group, w, h, d, spec, M = null, base = false) {
    if (!this.paint) { this.add(group, null, SKIN); return; }
    const g = new THREE.BoxGeometry(w * PX, h * PX, d * PX);
    const sp = typeof spec === 'string' ? { a: spec } : spec, uvA = g.attributes.uv;
    const pick = [sp.s ?? sp.a, sp.s ?? sp.a, sp.t ?? sp.a, sp.u ?? sp.a, sp.f ?? sp.a, sp.b ?? sp.a];
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      const r = this.sw.get(pick[f]); if (!r) throw new Error('curse skin: unknown swatch ' + pick[f]);
      const [x, y, sw, sh, tile] = r;
      setFace(uvA, f, x, y, tile ? Math.min(dims[f][0], sw) : sw, tile ? Math.min(dims[f][1], sh) : sh);
    }
    if (base) g.translate(0, h * PX / 2, 0);
    if (M) g.applyMatrix4(M);
    this.add(group, g, SKIN);
  }
  // box with its own (glow) material
  gbox(group, w, h, d, mat, M = null, base = false) {
    if (!this.paint) { this.add(group, null, mat); return; }
    const g = new THREE.BoxGeometry(w * PX, h * PX, d * PX); if (base) g.translate(0, h * PX / 2, 0); if (M) g.applyMatrix4(M);
    this.add(group, g, mat);
  }
  // eyeball: decal front, sclera elsewhere; M places the centre of its back face
  eye(group, s, M, decal = 'eye', depth = 0.6) { this.box(group, s, s, s * depth, { a: 'scl', f: decal }, M.clone().multiply(M4(0, 0, s * depth / 2))); }
  // row of teeth between x0..x1 at height y (down: hanging from y), on plane z
  teeth(group, n, x0, x1, y, z, h, down = true, w = 0.9, sw = 'bone', rz = 0) {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1), hh = h * (0.75 + this.r() * 0.5), s = down ? -1 : 1;
      this.box(group, w, hh, w, sw, M4(x, y + s * hh / 2, z, 0, 0, rz));
      this.box(group, w * 0.5, hh * 0.45, w * 0.5, sw, M4(x, y + s * (hh + hh * 0.2), z, 0, 0, rz));
    }
  }
  // chain of alternating iron links from (x0,y0) to (x1,y1) on plane z
  chain(group, x0, y0, x1, y1, z, n, a = 'iron', b = 'ironD', thick = 1) {
    const ang = Math.atan2(y1 - y0, x1 - x0);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (i % 2) this.box(group, 1.9 * thick, 0.7 * thick, 1.1 * thick, b, M4(x, y, z, 0, 0, ang));
      else this.box(group, 2.0 * thick, 1.2 * thick, 0.5 * thick, a, M4(x, y, z, 0, 0, ang));
    }
  }
  // re-bin the Rig's own limb boxes (remapped to the standard layout) so a limb
  // and its detail become one mesh; parts not listed in keep are dropped
  absorb(rig, keep = ['body', 'head', 'armR', 'armL', 'legR', 'legL']) {
    const ms = rig.meshes;   // jacket off: body, head, hat, armR, armRo, armL, armLo, legR, legL
    const parts = ['body', 'head', null, 'armR', null, 'armL', null, 'legR', 'legL'];
    ms.forEach((m, i) => {
      const parent = m.parent; parent.remove(m);
      const k = parts[i]; if (!k || !keep.includes(k)) return;
      if (!this.paint) { this.add(parent, null, SKIN); return; }
      m.updateMatrix();
      this.add(parent, remapStd(m.geometry.clone(), k).applyMatrix4(m.matrix), SKIN);
    });
    ms.length = 0;
    rig.headMesh = null;
  }
  // create the materials, merge each (group, material) bin into one mesh
  finish(rig, o) {
    let skin = MATS.get(this.kind);
    if (!skin) {
      skin = makeCharMaterial(this.S.texture(), { emitStrength: o.emit ?? 2.6, roughness: o.rough ?? 0.7, fill: o.fill ?? 0.16 });
      skin.alphaTest = 0.5;
      if (o.rim) addRim(skin, o.rim, o.rimStrength ?? 0.5, o.rimPower ?? 2.4);
      MATS.set(this.kind, skin);
    }
    rig.material = skin;
    const cached = GEOS.get(this.kind), out = cached ?? [];
    let i = 0;
    for (const [group, b] of this.bins) for (const [mat, list] of b) {
      const geo = cached ? cached[i] : (list.length === 1 ? list[0] : mergeGeometries(list, false));
      if (!cached) out.push(geo);
      i++;
      const m = rig.mesh(geo, mat === SKIN ? skin : mat);
      if (group.userData.core) m.userData.core = true;
      group.add(m);
    }
    if (!cached) GEOS.set(this.kind, out);
    this.bins.clear();
    return skin;
  }
}

// swatches every curse uses
function baseSwatches(K, P) {
  K.solid('fl', P.base, 0.2); K.solid('fd', P.dark, 0.22); K.solid('fx', P.deep, 0.2);
  K.solid('bone', P.bone ?? 0xe6dcc0, 0.1, 'leather'); K.solid('boneD', P.boneD ?? 0xa89878, 0.14, 'leather');
  K.solid('gum', P.gum ?? 0x8a1a2e, 0.14); K.solid('maw', 0x14040a, 0.1); K.solid('tongue', P.tongue ?? 0xb83450, 0.14, 'skin');
  K.solid('drool', P.drool ?? 0xc8e0a8, 0.06, 'eye');
  K.solid('glow', P.glow, 0.02, 'glow');
  K.solid('scl', P.sclera ?? 0xd8c8a0, 0.06, 'eye', (S, x, y) => { S.fineRect(x + 0.5, y + 1, 1, 0.5, 0xa82a2a); S.fineRect(x + 2.5, y + 2.5, 1, 0.5, 0xa82a2a); S.fine(x + 1.5, y + 3, 0x9a2020); });
  K.decal('eye', eyeDecal(P.eye, P.sclera ?? 0xece0c0, { round: P.round }));
}
function newRig(K, spec) {
  const rig = new Rig({ material: PLACEHOLDER, jacket: false, ...spec });
  rig.torso.userData.core = true; rig.head.userData.core = true;
  return rig;
}
// blink / look-around state for one eye (or a set of eyes moving together)
function eyeState() { return { tx: 0, ty: 0, x: 0, y: 0, next: 0.5 + Math.random() * 2, blink: 2 + Math.random() * 3, closed: 0 }; }
function stepEye(E, dt, range = 1) {
  E.next -= dt; if (E.next <= 0) { E.next = 0.4 + Math.random() * 1.8; E.tx = rnd(range); E.ty = rnd(range * 0.6); }
  E.x = damp(E.x, E.tx, 18, dt); E.y = damp(E.y, E.ty, 18, dt);
  E.blink -= dt; if (E.blink <= 0) { E.blink = 1.8 + Math.random() * 3.5; E.closed = 0.13; }
  E.closed = Math.max(0, E.closed - dt);
  return E.closed > 0;
}
// jaw angle from the owner's attack state: wide on wind-up, snapping shut on the strike
function jawFor(o, rest, wide, t, chatter = 0) {
  if (o.state === 'windup' && o.action) return rest + (wide - rest) * Math.min(1, o.stateT / Math.max(0.15, o.action.windup) * 1.6) + Math.sin(t * 40) * 0.04;
  if (o.state === 'recover') return Math.max(0, rest * 0.3);
  if (o.state === 'stagger') return wide * 0.8;
  return rest + Math.sin(t * 2.1) * rest * 0.35 + (chatter ? Math.max(0, Math.sin(t * 23)) * chatter * (Math.sin(t * 0.9) > 0.6 ? 1 : 0) : 0);
}
const drip = (Pt, x, y, z, r, g, b, s = 0.07) => Pt.glow.emit(x, y, z, rnd(0.1), -0.3, rnd(0.1), 0.7, r, g, b, s, 11, 0.3, 0.04, 0);

// =====================================================================
// GRADE 4 — gaping one-eyed maw (swarmer)
// =====================================================================
function swarmer(K) {
  const P = { base: 0x8c7a9c, dark: 0x4c3a5c, deep: 0x2a1a36, glow: 0xd870ff, eye: 0xffe23a, sclera: 0xc8b47a, gum: 0x8a1a3a };
  const S = K.S;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { top: 0x6a5880, veins: 6, blotch: 9, light: 0xa894b4 });
    for (const [x, y, n, a, b] of [[10, 0, 14, 8, 16], [13.5, 1, 12, 8, 16], [2, 8, 12, 0, 8], [19, 8, 12, 16, 24], [27, 8, 14, 24, 32]]) glowVein(S, x, y, n, 0xe08aff, 0xb050ff, a, y, b, 16);
    // face: deep socket for the big eye, brow wrinkles, slit nostrils, gum line at the bottom
    S.mat = 'flesh'; S.rect(9, 10, 6, 4, P.deep, 0.1); S.rect(10, 9, 4, 1, P.dark, 0.1);
    S.fineRect(9, 9, 6, 0.5, P.deep, 'flesh'); S.fineRect(10, 8.5, 4, 0.5, P.dark, 'flesh');
    S.fineRect(11, 14, 0.5, 1, P.deep, 'flesh'); S.fineRect(12.5, 14, 0.5, 1, P.deep, 'flesh');
    S.rect(8, 15, 8, 1, P.gum, 0.15);
    S.mat = 'eye'; S.px(9, 13, 0xfff05a); S.px(14, 9, 0xfff05a); S.px(2, 11, 0xfff05a);
    S.mat = 'flesh'; S.rect(16, 0, 8, 8, 0x2a0610, 0.1); S.rect(16, 0, 8, 1, P.gum, 0.1); S.rect(16, 7, 8, 1, P.gum, 0.1);
    // body: ribs, belly blotches, spine
    flesh(S, 'body', P.base, P.dark, { blotch: 8, veins: 3 });
    for (let r = 22; r < 28; r += 2) { S.fineRect(20.5, r, 3, 0.5, P.deep, 'flesh'); S.fineRect(24.5, r, 3, 0.5, P.deep, 'flesh'); }
    for (let r = 21; r < 32; r += 2) S.px(36, r, P.dark);
    glowVein(S, 22, 27, 10, 0xe08aff, 0xb050ff, 20, 27, 28, 32);
    for (const k of ['armR', 'armL']) { flesh(S, k, P.base, P.dark, { blotch: 8 }); const [x, y, w] = face(k).ring; S.rect(x, y + 9, w, 3, P.dark, 0.2); }
    for (const k of ['legR', 'legL']) { flesh(S, k, P.dark, P.deep, { blotch: 8, light: P.base }); }
  }
  baseSwatches(K, P);
  K.decal('bigEye', (S2, x, y) => {
    S2.mat = 'eye'; S2.rect(x, y, 4, 4, 0xd8c4b4, 0.05);
    for (const [vx, vy, w, h] of [[0, 0.5, 1, 0.5], [0, 2.5, 1.5, 0.5], [3, 1, 1, 0.5], [2.5, 3.5, 1, 0.5], [3.5, 3, 0.5, 1], [0.5, 3.5, 0.5, 0.5]]) S2.fineRect(x + vx, y + vy, w, h, 0xb02020);
    S2.fineRect(x + 0.5, y + 0.5, 3, 3, 0xffd23a); S2.fineRect(x + 1, y + 0.5, 2, 3, 0xffe86a); S2.fineRect(x + 0.5, y + 1, 3, 2, 0xffe86a);
    S2.fineRect(x + 1.5, y + 0.5, 1, 3, 0x0a0204); S2.fineRect(x + 1.25, y + 1.25, 1.5, 1.5, 0x0a0204);
    S2.fine(x + 1, y + 1, 0xffffff); S2.fine(x + 2.5, y + 2.5, 0x5a3a10);
  });
  const rig = newRig(K, { headS: 11, bodyH: 7, legH: 6, bodyW: 7, bodyD: 5, armW: 3, scale: 0.95 });
  rig.hunch = 0.45;
  rig.neck.rotation.x = -0.5;   // hunched body, but the face still looks ahead
  K.absorb(rig);
  const Hs = 11 * 1.12, h2 = Hs / 2, H = rig.head;
  // big single eye (moves) under a heavy brow
  const eyeG = grp(H, 0, 7.6, h2);
  K.box(eyeG, 5.4, 4.6, 2.4, { a: 'scl', f: 'bigEye' }, M4(0, 0, 0.3));
  K.box(H, 7.4, 1.6, 2.2, 'fd', M4(0, 10.4, h2 + 0.4, -0.15));
  K.box(H, 6.2, 1.0, 1.6, 'fd', M4(0, 4.8, h2 + 0.3));
  // extra little eyes, tumours, spines
  K.eye(H, 1.6, M4(-4.4, 10.4, h2)); K.eye(H, 1.2, M4(4.6, 3.6, h2));
  K.eye(H, 1.6, M4(h2, 8.4, 1.6, 0, HP)); K.eye(H, 1.2, M4(-h2, 6, -1.4, 0, -HP)); K.eye(H, 1.8, M4(1.8, Hs, -1.8, -HP));
  K.box(H, 3.4, 2.6, 3.4, 'fd', M4(-3.4, Hs + 0.8, -1.4, 0.1, 0.3)); K.box(H, 2.2, 1.8, 2.2, 'fx', M4(-1.4, Hs + 1.2, -3.6, 0, 0.5));
  K.box(H, 2.2, 3.4, 2.8, 'fl', M4(h2 + 0.6, 4.6, -2.4)); K.box(H, 0.8, 0.8, 0.8, 'glow', M4(-3.4, Hs + 2.2, -1.4));
  K.box(H, 1.3, 3.4, 1.3, 'boneD', M4(2.8, Hs + 0.6, -4.2, -0.7, 0, -0.35), true); K.box(H, 1.1, 3, 1.1, 'boneD', M4(0.2, Hs - 0.4, -5.6, -1.0), true);
  K.box(H, 1.0, 2.4, 1.0, 'boneD', M4(-4.6, Hs - 0.6, -5.0, -0.9, 0, 0.5), true);
  // upper teeth hanging from the head, gum strip
  K.box(H, 11.8, 0.9, 1.4, 'gum', M4(0, 0.2, h2 - 0.6));
  K.teeth(H, 7, -5.0, 5.0, 0.2, h2 - 0.7, 2.2, true, 1.0);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) K.box(H, 0.8, 1.6 - i * 0.3, 0.8, 'bone', M4(sx * 5.4, -0.6, 3.6 - i * 1.8));
  // lower jaw (moves): tongue, teeth, drool
  const jaw = grp(H, 0, 0.5, -5.2);
  K.box(jaw, 11.4, 3.0, 11.6, { a: 'fl', t: 'maw', u: 'fd' }, M4(0, -1.7, 5.9));
  K.box(jaw, 10.6, 0.7, 1.3, 'gum', M4(0, -0.1, 11.0));
  K.teeth(jaw, 6, -4.6, 4.6, -0.2, 10.9, 1.9, false, 0.9);
  K.box(jaw, 4.2, 1.0, 7.0, 'tongue', M4(0.4, 0.1, 6.4)); K.box(jaw, 3.2, 0.8, 2.6, 'tongue', M4(0.8, -0.5, 11.9, 0.8));
  K.box(jaw, 0.45, 3.6, 0.45, 'drool', M4(-3.4, -2.4, 11.5)); K.box(jaw, 0.4, 2.4, 0.4, 'drool', M4(2.9, -1.8, 11.6)); K.box(jaw, 0.9, 0.9, 0.9, 'drool', M4(-3.4, -4.3, 11.5));
  K.box(jaw, 2.4, 1.2, 1.4, 'fd', M4(2.4, -3.4, 9.6));
  // torso: back spines, belly, neck fold
  const T = rig.torso;
  for (const [x, y, s] of [[0, 6.2, 1], [0, 3.6, 0.85], [1.6, 5, 0.6], [-1.5, 1.6, 0.6]]) K.box(T, 1.1 * s, 3.2 * s, 1.1 * s, 'boneD', M4(x, y, -2.3, -1.0), true);
  K.box(T, 5.2, 3.2, 1.2, 'fd', M4(0, 2.0, 2.8)); K.box(T, 6.4, 1.4, 4.8, 'fd', M4(0, 7.1, 0.4));
  // claws, knuckles, elbow spikes; toe claws
  for (const [arm, sx] of [[rig.armR, -1], [rig.armL, 1]]) {
    K.box(arm, 3.6, 1.2, 4.4, 'fd', M4(0, -9.4, 0));
    for (const x of [-1, 0, 1]) K.box(arm, 0.7, 3.6, 0.7, 'bone', M4(x, -10, 1.4, 0.45, 0, x * 0.15), false);
    for (const x of [-1, 0, 1]) K.box(arm, 0.7, 3.2, 0.7, 'bone', M4(x, -11.6, 2.1, 0.45, 0, x * 0.15));
    K.box(arm, 0.9, 2.2, 0.9, 'boneD', M4(sx * 0.3, -3.2, -2.0, -1.2), true);
  }
  for (const leg of [rig.legR, rig.legL]) { for (const x of [-1.2, 0, 1.2]) K.box(leg, 0.7, 0.7, 1.8, 'bone', M4(x, -5.6, 2.6)); K.box(leg, 4.4, 1.4, 4.4, 'fx', M4(0, -2.2, 0)); }
  const mat = K.finish(rig, { emit: 2.8, rim: 0xb070ff, rimStrength: 0.45 });
  const E = eyeState(); let twitch = 0, tw = 0;
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    jaw.rotation.x = jawFor(o, 0.22, 0.85, t, 0.12);
    const shut = stepEye(E, dt, 0.35);
    eyeG.rotation.y = E.x; eyeG.rotation.x = E.y;
    const es = o.state === 'windup' ? 1.18 : 1; eyeG.scale.set(es, shut ? 0.15 : es, es);
    twitch -= dt; if (twitch <= 0) { twitch = 1 + Math.random() * 3; tw = rnd(0.35); }
    tw = damp(tw, 0, 6, dt); H.rotation.z = tw;
    for (let i = rate(1.4, dt, bud); i > 0; i--) { jaw.localToWorld(v1.set(rnd(3) * PX, -4.5 * PX, 11.5 * PX)); drip(Pt, v1.x, v1.y, v1.z, 0.6, 0.75, 0.45); }
    mat.userData.emitMask.value = 2.6 + Math.sin(o.game.time * 3.1) * 0.6;
  };
  return rig;
}

// =====================================================================
// SUMMONED IMP — split-faced larva with an umbilical tail
// =====================================================================
function imp(K) {
  const P = { base: 0xa64c90, dark: 0x5e1c56, deep: 0x30082c, glow: 0xff62e0, eye: 0xffb8ff, sclera: 0xf4d8ea, gum: 0x9a1a4a, round: true };
  const S = K.S;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { top: 0x8a3a7a, veins: 4, blotch: 8, light: 0xc070b0 });
    // vertical mouth down the middle of the face, gums either side
    S.mat = 'flesh'; S.rect(11, 9, 2, 7, 0x1a0410, 0.05); S.rect(10, 10, 1, 6, P.gum, 0.12); S.rect(13, 10, 1, 6, P.gum, 0.12);
    S.mat = 'eye'; for (const [x, y] of [[9, 12], [14, 12], [9, 14], [14, 14]]) { S.px(x, y, 0xffb0ff); } S.fine(9, 12, 0xffffff); S.fine(14, 12, 0xffffff);
    crack(S, 4, 8, 4, 0, 7, 0xff62e0, 0xd040c0); crack(S, 20, 9, 5, 16, 23, 0xff62e0, 0xd040c0);
    flesh(S, 'body', P.base, P.dark, { blotch: 9, veins: 3 });
    crack(S, 22, 21, 5, 20, 27, 0xff62e0, 0xd040c0); crack(S, 34, 21, 4, 32, 39, 0xff62e0, 0xd040c0);
    for (const k of ['armR', 'armL']) flesh(S, k, P.base, P.dark, { blotch: 8 });
    for (const k of ['legR', 'legL']) flesh(S, k, P.dark, P.deep, { blotch: 8, light: P.base });
  }
  baseSwatches(K, P);
  const rig = newRig(K, { headS: 9, bodyH: 6, legH: 5, bodyW: 6, bodyD: 4, armW: 2, scale: 0.75 });
  rig.hunch = 0.3;
  K.absorb(rig);
  const Hs = 9 * 1.12, h2 = Hs / 2, H = rig.head;
  // teeth along the vertical mouth, pointing in
  for (let i = 0; i < 5; i++) { const y = 1.6 + i * 1.3; K.box(H, 1.1, 0.6, 0.6, 'bone', M4(0.8, y, h2 + 0.2)); K.box(H, 1.1, 0.6, 0.6, 'bone', M4(-0.8, y + 0.65, h2 + 0.2)); }
  K.eye(H, 1.8, M4(-2.7, 7.4, h2)); K.eye(H, 1.8, M4(2.7, 7.4, h2));
  for (const sx of [-1, 1]) { K.box(H, 1.3, 2.8, 1.3, 'bone', M4(sx * 3.2, Hs - 0.6, 0.6, 0.2, 0, -sx * 0.5), true); K.box(H, 0.8, 2.2, 0.8, 'boneD', M4(sx * 4.6, Hs + 1.6, 0.9, 0.3, 0, -sx * 0.95), true); }
  K.box(H, 2.4, 1.6, 2.4, 'fd', M4(-1.6, Hs + 0.5, -2.2)); K.box(H, 0.7, 0.7, 0.7, 'glow', M4(-1.6, Hs + 1.4, -2.2));
  const T = rig.torso;
  for (const sx of [-1, 1]) { K.box(T, 0.5, 4.2, 0.5, 'boneD', M4(sx * 2.4, 4.4, -2.4, -0.4, sx * 0.4, -sx * 0.6), true); K.box(T, 3.6, 3.0, 0.4, 'fx', M4(sx * 3.4, 6.2, -2.8, -0.3, sx * 0.5, -sx * 0.5)); }
  K.box(T, 4.4, 2.6, 1, 'fd', M4(0, 1.6, 2.2));
  for (const arm of [rig.armR, rig.armL]) for (const x of [-0.5, 0.5]) K.box(arm, 0.5, 2.2, 0.5, 'bone', M4(x, -11, 0.9, 0.4));
  for (const leg of [rig.legR, rig.legL]) for (const x of [-1, 1]) K.box(leg, 0.6, 0.6, 1.4, 'bone', M4(x, -4.7, 2.4));
  // umbilical tail (sways)
  const tail = grp(rig.hips, 0, 1.4, -2);
  K.box(tail, 1.6, 1.6, 3, 'fd', M4(0, 0, -1.4)); K.box(tail, 1.3, 1.3, 3, 'gum', M4(0, -0.8, -4.0, 0.35)); K.box(tail, 1.1, 1.1, 2.6, 'fd', M4(0, -2.0, -6.3, 0.6));
  K.box(tail, 1.7, 1.7, 1.7, 'glow', M4(0, -3.0, -7.8));
  K.finish(rig, { emit: 2.8, rim: 0xff70e0, rimStrength: 0.45 });
  let twitch = 0, tw = 0;
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles;
    tail.rotation.y = Math.sin(t * 5) * 0.5; tail.rotation.x = Math.sin(t * 3.3) * 0.2;
    twitch -= dt; if (twitch <= 0) { twitch = 0.6 + Math.random() * 2; tw = rnd(0.45); }
    tw = damp(tw, 0, 7, dt); H.rotation.z = tw;
    if (Math.random() < 1.2 * dt * (Pt.budget ?? 1)) { tail.localToWorld(v1.set(0, -3 * PX, -7.8 * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.2), 0.5, rnd(0.2), 0.6, 1.4, 0.4, 1.2, 0.08, -0.2, 1, 0.2, 0); }
  };
  return rig;
}

// =====================================================================
// GRADE 3 SPITTER — frog-mouthed, goitre of acid, pustules on the back
// =====================================================================
function spitter(K) {
  const P = { base: 0x6c8c5e, dark: 0x36482e, deep: 0x1c2618, glow: 0xa8ff3a, eye: 0xdcff5a, sclera: 0xe0e4a0, gum: 0x6a2a2a, tongue: 0x8a3a3a, drool: 0xb8ff6a };
  const S = K.S, AC = 0xb4ff3a, AC2 = 0x7cdc2a;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { top: 0x5a7a4e, veins: 4, blotch: 8, light: 0x8aa878 });
    // a wide gash of a mouth wrapping round the sides, acid in the corners
    S.mat = 'flesh'; S.rect(8, 12, 8, 2, 0x140a06, 0.05); S.rect(5, 12, 3, 1, 0x140a06, 0.05); S.rect(16, 12, 3, 1, 0x140a06, 0.05);
    S.rect(8, 14, 8, 1, P.dark, 0.1); S.mat = 'glow'; S.px(9, 13, AC); S.px(14, 13, AC2); S.px(6, 12, AC);
    S.mat = 'eye'; S.rect(11, 9, 2, 1, 0xdcff5a, 0.02); S.fine(11.5, 9, 0x0a0a02); S.px(3, 10, 0xdcff5a); S.px(20, 10, 0xdcff5a);
    S.mat = 'flesh'; S.fineRect(9, 10.5, 1.5, 0.5, P.deep, 'flesh'); S.fineRect(13.5, 10.5, 1.5, 0.5, P.deep, 'flesh');
    // gaunt body: ribs, sunken belly, glowing acid veins
    flesh(S, 'body', P.base, P.dark, { blotch: 6 });
    for (let r = 21; r < 28; r += 1.5) { S.fineRect(20.5, r, 3, 0.5, P.deep, 'flesh'); S.fineRect(24.5, r, 3, 0.5, P.deep, 'flesh'); S.fineRect(16, r, 4, 0.5, P.dark, 'flesh'); S.fineRect(28, r, 4, 0.5, P.dark, 'flesh'); }
    S.rect(22, 28, 4, 3, P.dark, 0.15);
    for (const [x, y, n, a, b] of [[17, 22, 7, 16, 19], [30, 21, 8, 28, 31], [34, 22, 7, 32, 39]]) crack(S, x, y, n, a, b, AC, AC2);
    for (const k of ['armR', 'armL']) { flesh(S, k, P.base, P.dark, { blotch: 7 }); const [x, y] = face(k).ring; crack(S, x + 5, y + 2, 6, x + 4, x + 7, AC, AC2); }
    for (const k of ['legR', 'legL']) flesh(S, k, P.base, P.dark, { blotch: 7 });
  }
  baseSwatches(K, P);
  const acid = glowMat(0x9aff3a, { base: 1.5, amp: 0.6, speed: 3.4 });
  const rig = newRig(K, { headS: 7, bodyH: 15, legH: 12, bodyW: 6, bodyD: 4, armW: 3, scale: 1.05 });
  rig.hunch = 0.2;
  K.absorb(rig);
  const Hs = 7 * 1.12, h2 = Hs / 2, H = rig.head;
  // frog eyes on top, needle teeth, lip warts
  for (const sx of [-1, 1]) { K.box(H, 2.8, 1.4, 2.8, 'fd', M4(sx * 2.4, Hs + 0.4, 1.6)); K.eye(H, 2.4, M4(sx * 2.4, Hs + 1.4, 2.0, 0, sx * 0.35)); }
  K.teeth(H, 6, -3.2, 3.2, 3.6, h2 + 0.2, 1.4, true, 0.5);
  K.teeth(H, 5, -2.6, 2.6, 1.6, h2 + 0.2, 1.1, false, 0.5);
  K.box(H, 1.2, 0.8, 0.8, 'fd', M4(-3.4, 1.4, h2 + 0.2)); K.box(H, 0.9, 0.9, 0.7, 'fd', M4(3.0, 4.8, h2 + 0.1));
  K.box(H, 0.4, 2.8, 0.4, 'drool', M4(1.4, 1.0, h2 + 0.4)); K.box(H, 0.7, 0.7, 0.7, 'drool', M4(1.4, -0.6, h2 + 0.4));
  // throat sac (pulses)
  const sac = grp(H, 0, 1.4, 1.2);
  K.gbox(sac, 5.8, 4.8, 4.8, acid, M4(0, -2.2, 0.8)); K.gbox(sac, 3.2, 2.8, 3.2, acid, M4(1.7, -4.0, 1.6));
  // back pustules with fleshy roots, spine knobs, shoulder boils
  const T = rig.torso;
  for (const [x, y, s] of [[-1, 10.5, 4.2], [1.8, 13, 3.2], [1.4, 7, 2.6], [-1.8, 5.6, 2]]) { K.gbox(T, s, s, s * 0.75, acid, M4(x, y, -2.2 - s * 0.3)); K.box(T, s + 1, 0.8, s * 0.8, 'fd', M4(x, y - s / 2, -2.2 - s * 0.2)); }
  for (const y of [2.6, 4.4, 15]) K.box(T, 1.4, 1, 1, 'fd', M4(0, y, -2.3));
  for (const sx of [-1, 1]) K.gbox(T, 1.6, 1.6, 1.6, acid, M4(sx * 3.2, 14.6, 0.4));
  K.box(T, 5, 1.2, 4.6, 'fd', M4(0, 15, 0.2));
  // long fingers, elbow spurs; knobbly knees and toe claws
  for (const [arm, sx] of [[rig.armR, -1], [rig.armL, 1]]) {
    for (const x of [-0.95, 0, 0.95]) K.box(arm, 0.6, 4.6, 0.6, 'boneD', M4(x, -12.2, 0.9, 0.3, 0, x * 0.12));
    K.box(arm, 3.6, 1, 4.4, 'fd', M4(0, -9.6, 0));
    K.box(arm, 0.8, 2.6, 0.8, 'bone', M4(sx * 0.3, -3.6, -2, -1.1), true);
  }
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 4.6, 2.2, 4.6, 'fd', M4(0, -6, 0.3)); for (const x of [-1.2, 0, 1.2]) K.box(leg, 0.6, 0.6, 1.8, 'bone', M4(x, -11.7, 2.6)); }
  K.finish(rig, { emit: 2.6, rim: 0x9aff3a, rimStrength: 0.4 });
  const E = eyeState();
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const charge = o.state === 'windup' ? Math.min(1, o.stateT / Math.max(0.2, o.action?.windup ?? 0.6)) : 0;
    const k = 1 + Math.sin(t * 3.2) * 0.08 + charge * 0.45;
    sac.scale.set(k, k * (1 + Math.sin(t * 3.2 + 1) * 0.04), k);
    stepEye(E, dt, 0.4); H.rotation.z = E.x * 0.25;
    for (let i = rate(2.2 + charge * 10, dt, bud); i > 0; i--) { H.localToWorld(v1.set(rnd(2.5) * PX, 1.6 * PX, (h2 + 0.6) * PX)); drip(Pt, v1.x, v1.y, v1.z, 0.6, 1.4, 0.2, 0.08); }
    if (Math.random() < 1.2 * dt * bud) { T.localToWorld(v1.set(rnd(2) * PX, (9 + rnd(4)) * PX, -4.5 * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.2), 0.6, rnd(0.2), 0.9, 0.5, 1.3, 0.2, 0.12, -0.3, 1, 0.3, 0); }
  };
  return rig;
}

// =====================================================================
// GRADE 2 BULWARK — chained, talisman-sealed brute with a gravestone shield
// =====================================================================
function tank(K) {
  const P = { base: 0x8c7058, dark: 0x4c382a, deep: 0x2a1c14, glow: 0xff8a2a, eye: 0xffa040, sclera: 0xe8d4a0, gum: 0x7a2018 };
  const S = K.S, O1 = 0xff9a3a, O2 = 0xff6a1a;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { top: 0x6a5242, veins: 4, blotch: 7 });
    // six eyes in a cluster
    S.mat = 'flesh'; S.rect(9, 9, 6, 4, P.deep, 0.1);
    S.mat = 'eye'; for (const [x, y] of [[9, 9], [14, 9], [11, 12], [12, 12], [8, 11], [15, 11]]) S.px(x, y, O1); S.fine(9, 9, 0xffffff); S.fine(14, 9, 0xffffff);
    S.mat = 'flesh'; S.rect(8, 14, 8, 2, P.dark, 0.15); for (let x = 8; x < 16; x += 2) S.fineRect(x + 0.5, 14, 0.5, 2, P.deep, 'flesh');
    // massive body: scarred muscle, a glowing seal crack over the heart
    flesh(S, 'body', P.base, P.dark, { blotch: 8, veins: 5 });
    S.fineRect(23.5, 20, 0.5, 9, P.deep, 'flesh'); S.fineRect(20, 24, 8, 0.5, P.deep, 'flesh');
    for (const [x, y, n, a, b] of [[25, 21, 6, 24, 27], [21, 25, 5, 20, 23], [35, 22, 7, 33, 38]]) crack(S, x, y, n, a, b, O1, O2);
    for (const k of ['armR', 'armL']) { flesh(S, k, P.base, P.dark, { blotch: 8, veins: 3 }); const [x, y, w] = face(k).ring; S.rect(x, y + 10, w, 2, P.dark, 0.2); }
    for (const k of ['legR', 'legL']) flesh(S, k, P.dark, P.deep, { blotch: 8, light: P.base });
  }
  baseSwatches(K, P);
  K.solid('st', 0x6c6a72, 0.18, 'leather', (S2, x, y) => { S2.px(x + 1, y + 2, 0x3a3840); S2.px(x + 2, y + 1, 0x4a4850); });
  K.solid('stD', 0x47454e, 0.2, 'leather'); K.solid('iron', 0x5a5a64, 0.12, 'metal'); K.solid('ironD', 0x34343c, 0.12, 'metal');
  K.solid('paper', 0xe0d2a8, 0.06, 'cloth'); K.decal('ofuda', ofudaDecal());
  K.solid('stF', 0x6c6a72, 0.18, 'leather', (S2, x, y) => { S2.mat = 'leather'; S2.fineRect(x + 1, y + 0.5, 0.5, 1.5, 0x2a2830, 'leather'); S2.fineRect(x + 1.5, y + 2, 1, 0.5, 0x2a2830, 'leather'); S2.fineRect(x + 2.5, y + 2.5, 0.5, 1, 0x2a2830, 'leather'); });
  const rune = glowMat(0xff7a22, { base: 2.2, amp: 0.9, speed: 2.6 });
  const rig = newRig(K, { headS: 7, bodyH: 13, legH: 10, bodyW: 14, bodyD: 8, armW: 6, scale: 1.45 });
  rig.hunch = 0.15;
  rig.neck.position.set(0, 11 * PX, 2.2 * PX);   // head sunk forward between the shoulders
  K.absorb(rig);
  const Hs = 7 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  K.eye(H, 1.7, M4(-1.8, 5.0, h2)); K.eye(H, 1.7, M4(1.8, 5.0, h2)); K.eye(H, 1.0, M4(0, 6.8, h2)); K.eye(H, 1.0, M4(-3.0, 3.4, h2));
  K.box(H, 8.8, 1.8, 2.6, 'st', M4(0, 7.2, h2 - 0.4, -0.2));
  // underbite jaw with tusks
  const jaw = grp(H, 0, 1.4, -1.5);
  K.box(jaw, 9.6, 3.4, 7.6, { a: 'fl', t: 'maw', u: 'fd' }, M4(0, -1.6, 3.6));
  for (const sx of [-1, 1]) { K.box(jaw, 1.5, 4.8, 1.5, 'bone', M4(sx * 3.7, -0.4, 6.4, 0, 0, sx * 0.15), true); K.box(jaw, 0.9, 1.8, 0.9, 'boneD', M4(sx * 4.3, 4.2, 6.5, 0, 0, sx * 0.3), true); }
  K.teeth(jaw, 4, -2.2, 2.2, -0.1, 7.0, 1.3, false, 0.8);
  K.box(jaw, 0.4, 3.2, 0.4, 'drool', M4(1.2, -3.6, 7.2));
  // forehead talisman (flutters)
  const tali = grp(H, 3.0, Hs + 0.4, h2 + 0.9);
  tali.rotation.y = 0.5;
  K.box(tali, 2.4, 5.2, 0.25, { a: 'paper', f: 'ofuda' }, M4(0, -2.6, 0.15, 0, 0, -0.25));
  // stone hump with spines and eyes, collar, chest talismans, chains
  K.box(T, 11.4, 4.6, 5.6, 'st', M4(0, 11.4, -3.2, 0.2)); K.box(T, 7.2, 3.2, 4.2, 'stD', M4(-1.6, 13.8, -3.8, 0.3));
  for (const [x, y, z, rx, rz] of [[-3, 14, -4.8, -0.7, 0.3], [1.5, 15, -5.2, -0.8, 0], [4.2, 13.4, -4.6, -0.6, -0.4]]) { K.box(T, 1.5, 4.2, 1.5, 'boneD', M4(x, y, z, rx, 0, rz), true); }
  K.eye(T, 1.8, M4(2.8, 9.6, -6.0, 0, Math.PI)); K.eye(T, 1.3, M4(-3.6, 8.2, -4.2, 0, Math.PI));
  K.box(T, 9.6, 1.6, 9.6, 'iron', M4(0, 12.6, 1.2)); K.box(T, 2, 2.2, 1, 'ironD', M4(0, 11.2, 6.1));
  K.box(T, 2.6, 5.2, 0.3, { a: 'paper', f: 'ofuda' }, M4(-4.2, 8.2, 4.2, 0, 0, 0.15)); K.box(T, 2.6, 5.2, 0.3, { a: 'paper', f: 'ofuda' }, M4(3.8, 4.8, 4.2, 0, 0, -0.2));
  K.chain(T, -6.4, 12.0, 5.8, 1.2, 4.35, 11);
  K.chain(T, -7.2, 2.0, 7.2, 2.0, 4.3, 9); K.chain(T, 7.3, 2.0, 7.3, 2.0, 0, 1); K.chain(T, -7.2, 2.0, 7.2, 2.0, -4.3, 9);
  K.box(T, 10, 3, 1.4, 'fd', M4(0, 3.4, 4.3));
  // shoulders: stone plates and spikes; shackles; dangling chain; knuckle ridges
  for (const [arm, sx] of [[rig.armR, -1], [rig.armL, 1]]) {
    K.box(arm, 7.8, 3.2, 5.6, 'st', M4(sx * 0.4, 2.8, 0, 0, 0, -sx * 0.2)); K.box(arm, 5.2, 1.6, 4.2, 'stD', M4(sx * 0.8, 4.6, 0, 0, 0, -sx * 0.25));
    K.box(arm, 1.3, 3.4, 1.3, 'boneD', M4(sx * 1.6, 5, -0.6, 0, 0, -sx * 0.5), true);
    K.box(arm, 7.2, 1.8, 5.2, 'iron', M4(0, -7.4, 0)); K.box(arm, 6.6, 1.3, 2.4, 'bone', M4(0, -9.6, 1.6));
  }
  K.chain(rig.armR, -2.8, -8.4, -2.8, -14.4, 1.2, 4, 'iron', 'ironD', 0.9);
  // gravestone shield with a burning seal glyph
  const shield = grp(rig.handL, 1, -6, 5);
  K.box(shield, 12, 14, 2.6, { a: 'st', f: 'stF' }, M4(0, -1, 0)); K.box(shield, 9.4, 2.2, 2.6, 'st', M4(0, 7, 0)); K.box(shield, 5.6, 1.4, 2.6, 'stD', M4(0, 8.6, 0));
  K.box(shield, 12.6, 1.3, 3.2, 'iron', M4(0, 3.6, 0)); K.box(shield, 12.6, 1.3, 3.2, 'iron', M4(0, -5.4, 0));
  K.box(shield, 2.6, 5.2, 0.3, { a: 'paper', f: 'ofuda' }, M4(-3.6, -2.4, 1.45, 0, 0, 0.2)); K.box(shield, 2.4, 4.6, 0.3, { a: 'paper', f: 'ofuda' }, M4(3.7, 0.6, 1.45, 0, 0, -0.18));
  K.box(shield, 1.6, 2.2, 3.4, 'stD', M4(-5.6, -7.2, 0)); K.box(shield, 2.2, 1.6, 3.2, 'stD', M4(5.2, -7.6, 0.2));
  K.gbox(shield, 1.2, 7.4, 0.5, rune, M4(0, 0.4, 1.4)); K.gbox(shield, 5.2, 1.0, 0.5, rune, M4(0, 2.4, 1.4)); K.gbox(shield, 4, 1.0, 0.5, rune, M4(0, -1.4, 1.4));
  K.gbox(shield, 1, 2.2, 0.5, rune, M4(-2.2, -0.6, 1.4, 0, 0, 0.4)); K.gbox(shield, 1, 2.2, 0.5, rune, M4(2.2, -0.6, 1.4, 0, 0, -0.4));
  rig.extras.shield = shield;
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 4.8, 2.6, 1.6, 'st', M4(0, -5, 2.2)); for (const x of [-1.3, 0, 1.3]) K.box(leg, 0.8, 0.8, 1.8, 'bone', M4(x, -9.6, 2.6)); }
  const mat = K.finish(rig, { emit: 2.6, rim: 0xff8a3a, rimStrength: 0.35 });
  let gust = 0;
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles;
    jaw.rotation.x = jawFor(o, 0.14, 0.55, t * 0.6);
    const b = Math.sin(t * 1.6); T.scale.set(1 + b * 0.025, 1 + b * 0.012, 1 + b * 0.03);   // heavy breathing
    gust = damp(gust, Math.min(1, Math.hypot(o.vel.x, o.vel.z) / 2), 4, dt);
    tali.rotation.x = -0.15 - gust * 0.6 - Math.abs(Math.sin(t * 7.3)) * 0.12 * (0.4 + gust);
    tali.rotation.z = Math.sin(t * 3.1) * 0.08;
    if (b > 0.97 && Math.random() < 0.5) { H.localToWorld(v1.set(0, 2 * PX, (h2 + 2) * PX)); Pt.smoke.emit(v1.x, v1.y, v1.z, rnd(0.2), 0.2, rnd(0.2), 1, 0.09, 0.07, 0.07, 0.25, -0.2, 1.4, 1.4, 0); }
    mat.userData.emitMask.value = 2.4 + Math.sin(o.game.time * 2) * 0.5;
  };
  return rig;
}

// =====================================================================
// GRADE 3 BLOATER — a swollen sack of eyes and teeth, cracked and glowing
// =====================================================================
function blob(K) {
  const P = { base: 0xbc4c56, dark: 0x6c1c2a, deep: 0x3a0a16, glow: 0xff6a2a, eye: 0xffd040, sclera: 0xd8c8a4, gum: 0x6a0a1a, round: true };
  const S = K.S, G1 = 0xffa040, G2 = 0xff5a1a;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { top: 0xa83a48, veins: 10, blotch: 12, light: 0xd8707a });
    for (const [x, y, n, a, b] of [[10, 0, 16, 8, 16], [14, 1, 14, 8, 16], [11.5, 4, 10, 8, 16], [1, 8, 16, 0, 8], [5, 8.5, 14, 0, 8], [18, 8, 16, 16, 24], [21.5, 8.5, 14, 16, 24], [26, 8, 16, 24, 32], [30, 8.5, 14, 24, 32], [9, 8, 4, 8, 16], [15, 8, 4, 8, 16]]) glowVein(S, x, y, n, G1, G2, a, y, b, 16);
    // the maw across the front
    S.mat = 'flesh'; S.rect(8, 11, 8, 3, 0x1a0406, 0.05); S.rect(8, 10, 8, 1, P.gum, 0.12); S.rect(8, 14, 8, 1, P.gum, 0.12);
    S.mat = 'glow'; S.px(9, 12, 0xff5a1a); S.px(14, 13, 0xff8a2a);
    S.mat = 'flesh'; S.rect(16, 0, 8, 8, P.dark, 0.2); glowVein(S, 18, 0, 14, G1, G2, 16, 0, 24, 8);
    // stitched seams
    for (const [x, y, l] of [[3, 9, 6], [27, 10, 5]]) for (let i = 0; i < l; i++) S.fineRect(x, y + i, 1, 0.5, 0x2a0a10, 'flesh');
  }
  baseSwatches(K, P);
  K.decal('iris', irisDecal(0xffc22a, 0x7a2a0a));
  const core = glowMat(0xff4a1a, { base: 2.0, amp: 0.9, speed: 4.2 });
  const rig = newRig(K, { headS: 16, bodyH: 2, legH: 2, bodyW: 4, bodyD: 4, armW: 2, scale: 0.9 });
  rig.armL.visible = rig.armR.visible = false;
  K.absorb(rig, ['head']);
  rig.blob = true;
  const Hs = 16 * 1.12, h2 = Hs / 2, H = rig.head;
  // upper teeth hanging over the maw
  K.teeth(H, 8, -7, 7, 10.6, h2 + 0.3, 2.6, true, 1.2);
  // eyes everywhere: front ones get moving pupils
  const pupils = grp(H, 0, 0, 0);
  for (const [x, y, s] of [[-4.8, 14.4, 4.2], [3.8, 13.6, 3.2], [0.2, 16.6, 2.2], [7.0, 15.6, 1.8], [-7.6, 10.4, 1.6]]) {
    K.box(H, s, s, s * 0.6, 'scl', M4(x, y, h2 + s * 0.3));
    K.box(pupils, s * 0.68, s * 0.68, 0.3, { a: 'fx', f: 'iris' }, M4(x, y, h2 + s * 0.6 + 0.15));
  }
  K.eye(H, 3.2, M4(h2, 12.6, -2, 0, HP)); K.eye(H, 2.4, M4(-h2, 13, -3.6, 0, -HP)); K.eye(H, 2.8, M4(-3, Hs, -4.4, -HP)); K.eye(H, 2.2, M4(2.4, 8.6, -h2, 0, Math.PI));
  K.eye(H, 1.6, M4(-h2, 6, 3, 0, -HP)); K.eye(H, 1.4, M4(h2, 5.4, 4.6, 0, HP));
  // lower lip / jaw (moves) with teeth and a lolling tongue
  const jaw = grp(H, 0, 4.6, 4);
  K.box(jaw, 16.4, 3.2, 5.8, { a: 'fl', t: 'gum', u: 'fd' }, M4(0, -1.5, 2.8));
  K.teeth(jaw, 7, -6.4, 6.4, 0.1, 5.2, 2.2, false, 1.1);
  K.box(jaw, 5, 1.2, 6, 'tongue', M4(-1.2, 0.4, 3.4)); K.box(jaw, 4.2, 4, 1, 'tongue', M4(-1.2, -1.6, 6.6, 0.15));
  K.box(jaw, 0.5, 3.4, 0.5, 'drool', M4(3.8, -3.2, 6)); K.box(jaw, 0.9, 0.9, 0.9, 'drool', M4(3.8, -5.1, 6));
  // pustules on top (pulse)
  const tum = grp(H, 0, Hs, 0);
  for (const [x, z, w, h, sw] of [[3.8, -2.4, 5, 3.4, 'fd'], [-4.6, -4.4, 3.6, 2.6, 'fl'], [-0.8, 3.0, 3, 2.2, 'fd'], [5.6, 4.2, 2.4, 1.8, 'fl']]) { K.box(tum, w, h, w, sw, M4(x, h / 2 - 0.4, z)); K.box(tum, w * 0.35, 0.8, w * 0.35, 'glow', M4(x, h - 0.1, z)); }
  // stub feet (swing with the rig's leg animation) and the hot core underneath
  for (const [leg, sx] of [[rig.legR, -1], [rig.legL, 1]]) {
    leg.visible = true;
    for (const [x, z] of [[sx * 3, 3.4], [sx * 5.2, -1.2], [sx * 1.6, -4.6]]) { K.box(leg, 2.4, 3.8, 2.4, 'fd', M4(x - sx * 2, -0.2, z)); K.box(leg, 0.6, 0.6, 1.2, 'bone', M4(x - sx * 2, -1.7, z + 1.6)); }
  }
  K.gbox(rig.hips, 13, 1.6, 13, core, M4(0, 1.4, 0));
  K.finish(rig, { emit: 3.0, rim: 0xff5a2a, rimStrength: 0.5 });
  const E = eyeState();
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const w = o.state === 'windup' && o.action ? Math.min(1, o.stateT / o.action.windup) : 0;
    jaw.rotation.x = 0.12 + Math.sin(t * 2.6) * 0.08 + w * 0.5 + Math.sin(t * 31) * 0.05 * w;
    stepEye(E, dt, 1); pupils.position.set(E.x * 0.45 * PX, E.y * 0.45 * PX, 0);
    const k = 1 + Math.sin(t * 4.4) * 0.07 + w * 0.25 * (1 + Math.sin(t * 30) * 0.3); tum.scale.set(k, k * 1.1, k);
    if (Math.random() < (1.5 + w * 12) * dt * bud) { H.localToWorld(v1.set(rnd(7) * PX, (Hs * (0.4 + Math.random() * 0.6)) * PX, rnd(7) * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.3), 0.8 + w, rnd(0.3), 0.5, 2.2, 0.8, 0.2, 0.08, -0.5, 1, 0.1, 1); }
    if (Math.random() < 1.2 * dt * bud) { jaw.localToWorld(v1.set(3.8 * PX, -5.5 * PX, 6 * PX)); drip(Pt, v1.x, v1.y, v1.z, 0.9, 0.5, 0.45); }
  };
  return rig;
}

// =====================================================================
// GRADE 2 PHANTOM — masked, long-haired wraith with blade fingers
// =====================================================================
function teleporter(K) {
  const P = { base: 0x241634, dark: 0x140a20, deep: 0x0a0612, glow: 0xd860ff, eye: 0xff5aff, sclera: 0xe8e2d4 };
  const S = K.S, MASK = 0xeee8dc, MASK2 = 0xc8c0ae, HAIR = 0x0e0a12, RED = 0xb01828, SKN = 0x9a90a8;
  if (K.paint) {
    // head: black hair everywhere, a cracked white mask on the face
    S.mat = 'hair'; paintBox(S, 'head', HAIR, 0.12);
    for (let x = 0; x < 32; x += 2) S.fineRect(x + 0.5, 8, 0.5, 8, 0x1e1824, 'hair');
    S.mat = 'skin'; S.rect(8, 8, 8, 8, MASK, 0.03); S.rect(8, 8, 8, 1, MASK2, 0.03);
    S.mat = 'eye'; S.rect(9, 10, 2, 2, 0x050208, 0.02); S.rect(13, 10, 2, 2, 0x050208, 0.02);
    S.fine(10, 11, 0xff5aff); S.fine(13.5, 11, 0xff5aff);
    S.mat = 'skin';
    S.fineRect(9.5, 12, 0.5, 2.5, RED, 'skin'); S.fineRect(14, 12, 0.5, 2, RED, 'skin'); S.fineRect(11.5, 8.5, 1, 0.5, RED, 'skin');
    // the grin: far too wide, curling up at the ends
    S.fineRect(9, 14, 6, 0.5, 0x120608, 'skin'); S.fineRect(8.5, 13.5, 0.5, 0.5, 0x120608, 'skin'); S.fineRect(15, 13.5, 0.5, 0.5, 0x120608, 'skin');
    S.fineRect(8, 13, 0.5, 0.5, 0x120608, 'skin'); S.fineRect(15.5, 13, 0.5, 0.5, 0x120608, 'skin');
    for (let x = 9.5; x < 15; x += 1) S.fineRect(x, 14.5, 0.5, 0.5, 0xd8d0c0, 'eye');
    S.fineRect(12, 8, 0.5, 1.5, 0x5a5048, 'skin'); S.fineRect(12.5, 9.5, 0.5, 1, 0x5a5048, 'skin'); S.fineRect(13, 10.5, 0.5, 0.5, 0x5a5048, 'skin');
    // robe body with violet trim, a crossed collar and a rope belt
    S.mat = 'cloth'; paintBox(S, 'body', P.base, 0.08);
    const [fx, fy] = face('body').front;
    for (let r = 0; r < 6; r++) { S.px(fx + 3 - Math.floor(r / 2), fy + r, 0x6a2a8a); S.px(fx + 4 + Math.floor(r / 2), fy + r, 0x6a2a8a); }
    S.rect(fx, fy + 3, 3, 3, P.dark, 0.06);
    { const [x, y, w] = face('body').ring; S.rect(x, y + 7, w, 2, 0xc8b890, 0.1); for (let i = 0; i < w; i += 2) S.fineRect(x + i + 0.5, y + 7, 0.5, 2, 0x8a7a58, 'cloth'); S.rect(x, y + 11, w, 1, 0x6a2a8a, 0.05); }
    for (const [x, y] of [[33, 22], [37, 25], [18, 23], [29, 26]]) S.fineRect(x, y, 0.5, 4, P.deep, 'cloth');
    // arms: grey dead skin, dark nails
    for (const k of ['armR', 'armL']) { flesh(S, k, SKN, 0x5a5068, { mat: 'skin', blotch: 4 }); const [x, y, w] = face(k).ring; S.rect(x, y + 10, w, 2, 0x3a3048, 0.1); }
  }
  baseSwatches(K, P);
  K.solid('mask', MASK, 0.03, 'skin'); K.solid('hair', HAIR, 0.12, 'hair', (S2, x, y) => { S2.fineRect(x + 1, y, 0.5, 4, 0x221c2a, 'hair'); S2.fineRect(x + 2.5, y, 0.5, 4, 0x1a1420, 'hair'); });
  K.solid('robe', P.base, 0.08, 'cloth'); K.solid('robeD', P.dark, 0.08, 'cloth'); K.solid('trim', 0x6a2a8a, 0.06, 'cloth');
  K.solid('paper', 0xe0d2a8, 0.06, 'cloth'); K.decal('ofuda', ofudaDecal(0xe4d6b0, 0x8a1aa8));
  K.solid('skn', SKN, 0.1, 'skin');
  const hem = glowMat(0xb040ff, { base: 1.4, amp: 0.8, speed: 2.4 });
  const rig = newRig(K, { headS: 8, bodyH: 14, legH: 4, bodyW: 8, bodyD: 5, armW: 3, scale: 1.15 });
  rig.float = 0.6;
  K.absorb(rig, ['body', 'head', 'armR', 'armL']);
  rig.legL.visible = rig.legR.visible = false;
  const Hs = 8 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // hair: crown, back curtain, sides, two strands over the mask
  K.box(H, 9.4, 1.0, 7.4, 'hair', M4(0, Hs + 0.3, -1.2));
  K.box(H, 9.8, 15, 1.4, 'hair', M4(0, 2.2, -h2 - 0.6));
  for (const [x, l] of [[-4, 6], [-2.2, 9], [-0.4, 5], [1.4, 8], [3.4, 6.5]]) K.box(H, 1.8, l, 1.2, 'hair', M4(x, -5.2 - l / 2, -h2 - 0.6));
  for (const sx of [-1, 1]) {
    K.box(H, 1.0, 12, 6.4, 'hair', M4(sx * (h2 + 0.45), 3.4, -1.4));
    for (const [z, l] of [[1.2, 7], [-0.8, 10], [-2.8, 6], [-4.2, 9]]) K.box(H, 0.9, l, 1.6, 'hair', M4(sx * (h2 + 0.45), -2.4 - l / 2, z));
    K.box(H, 0.8, 9, 0.8, 'hair', M4(sx * 3.9, -0.2, h2 + 0.35, 0, 0, sx * 0.05));
  }
  // Hannya horns, grin teeth, jutting chin
  for (const sx of [-1, 1]) { K.box(H, 1.2, 2.6, 1.2, 'bone', M4(sx * 2.6, Hs - 0.8, 3.4, 0.35, 0, -sx * 0.4), true); K.box(H, 0.8, 2.2, 0.8, 'boneD', M4(sx * 3.4, Hs + 1.4, 4.2, 0.6, 0, -sx * 0.7), true); K.box(H, 0.5, 0.5, 0.5, 'glow', M4(sx * 4.2, Hs + 3.2, 5.3)); }
  K.box(H, 6.4, 1.6, 1.2, 'mask', M4(0, 0.6, h2 + 0.3));
  K.teeth(H, 8, -3.1, 3.1, 1.9, h2 + 0.35, 0.9, true, 0.6);
  // robe collar, sleeves with ragged cuffs, long blade fingers
  K.box(T, 9.6, 2.2, 6.6, 'trim', M4(0, 13.4, 0)); K.box(T, 3, 4, 0.3, { a: 'paper', f: 'ofuda' }, M4(2, 5.6, 2.7, 0, 0, -0.12));
  for (const [arm, sx] of [[rig.armR, -1], [rig.armL, 1]]) {
    K.box(arm, 5.6, 8.4, 6.2, 'robe', M4(0, -2, 0)); K.box(arm, 6.2, 1.2, 6.6, 'trim', M4(0, -6.6, 0));
    for (const [x, z, l] of [[-1.8, 3.1, 3.4], [1.2, 3.1, 2.4], [2.6, -1, 3.8], [-2.6, -2, 2.8]]) K.box(arm, 1.4, l, 0.5, 'robeD', M4(x, -7.2 - l / 2, z));
    for (const x of [-1.1, -0.37, 0.37, 1.1]) { K.box(arm, 0.6, 7.6, 0.6, 'boneD', M4(x, -10.2, 0.8, 0.45, 0, x * 0.1), false); }
    for (const x of [-1.1, -0.37, 0.37, 1.1]) K.box(arm, 0.45, 1.2, 0.45, 'glow', M4(x, -13.4, 4.6, 0.45, 0, x * 0.1));
  }
  // tattered robe skirt: upper part on the hips, the ragged lower part sways
  const robe = grp(rig.hips, 0, 0, 0);
  K.box(robe, 9.8, 9.4, 6.8, 'robe', M4(0, -3.4, 0)); K.box(robe, 10.2, 1.2, 7.2, 'trim', M4(0, 0.6, 0));
  const robe2 = grp(robe, 0, -8, 0);
  for (const [x, z, w, d, l] of [[-3.3, 3.0, 3.2, 0.9, 6.5], [0, 3.1, 3.0, 0.9, 4.6], [3.3, 3.0, 3.2, 0.9, 5.8], [-3.3, -3.0, 3.2, 0.9, 5.2], [0.2, -3.1, 3.2, 0.9, 7.2], [3.3, -3.0, 3.2, 0.9, 4.8], [-4.5, 0, 0.9, 5, 6], [4.5, 0, 0.9, 5, 5]]) {
    K.box(robe2, w, l, d, Math.abs(x) > 4 ? 'robeD' : 'robe', M4(x, -l / 2 + 0.4, z));
    K.gbox(robe2, w + 0.1, 0.4, d + 0.1, hem, M4(x, -l + 0.4, z));
  }
  // talismans circling overhead
  const ring = grp(rig.root, 0, 17, 0);
  for (let i = 0; i < 3; i++) { const a = i * 2.094; K.box(ring, 2.4, 4.8, 0.3, { a: 'paper', f: 'ofuda' }, M4(Math.sin(a) * 13, (i % 2) * 2, Math.cos(a) * 13, 0, a, 0)); }
  K.finish(rig, { emit: 3.2, rim: 0xc060ff, rimStrength: 0.6, fill: 0.2 });
  let jerk = 0, jz = 0;
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const mv = Math.min(1, Math.hypot(o.vel.x, o.vel.z) / 3);
    robe.rotation.x = 0.06 + mv * 0.3 + Math.sin(t * 1.9) * 0.05;
    robe2.rotation.x = 0.08 + mv * 0.35 + Math.sin(t * 2.3 - 0.7) * 0.09; robe2.rotation.z = Math.sin(t * 1.4) * 0.06;
    jerk -= dt; if (jerk <= 0) { jerk = 1.5 + Math.random() * 3; jz = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.35); }
    H.rotation.z = damp(H.rotation.z, o.state === 'windup' ? 0 : jz + Math.sin(t * 0.8) * 0.05, jerk > 1.3 ? 20 : 3, dt);
    ring.rotation.y += dt * 0.9; ring.position.y = (17 + Math.sin(t * 1.3) * 1.2) * PX;
    for (let i = rate(5, dt, bud); i > 0; i--) { robe2.localToWorld(v1.set(rnd(4) * PX, -6 * PX, rnd(3) * PX)); Math.random() < 0.6 ? Pt.smoke.emit(v1.x, v1.y, v1.z, rnd(0.2), -0.1, rnd(0.2), 1.0, 0.06, 0.02, 0.1, 0.3, -0.4, 1.2, 1.6, 0) : Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.2), 0.2, rnd(0.2), 0.8, 1.0, 0.3, 1.6, 0.08, -0.4, 1, 0.1, 0); }
  };
  return rig;
}

// =====================================================================
// GRADE 1 BROOD MOTHER — eyes everywhere, a womb-mouth, extra arms, cocoons
// =====================================================================
function summoner(K) {
  const P = { base: 0xa65c80, dark: 0x5c2a46, deep: 0x301024, glow: 0xff6ad8, eye: 0xff8af0, sclera: 0xd8c4b0, gum: 0x8a1a48, bone: 0xece0d4, round: true };
  const S = K.S, G1 = 0xff6ad8, G2 = 0xd03aa8;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { top: 0x8a4a6a, veins: 8, blotch: 10, light: 0xc87aa0 });
    for (const [x, y, l] of [[8, 10, 8], [8, 13, 6], [0, 11, 8], [16, 12, 8], [24, 10, 8], [26, 13, 6]]) for (let i = 0; i < l; i++) S.fineRect(x + i, y + (i % 3 === 0 ? 0.5 : 0), 1, 0.5, P.deep, 'flesh');
    S.mat = 'eye'; for (const [x, y] of [[2, 9], [5, 14], [19, 9], [21, 14], [27, 12], [30, 9]]) S.px(x, y, 0xff9af4);
    flesh(S, 'body', P.base, P.dark, { blotch: 9, veins: 4 });
    for (const [x, y, n, a, b] of [[17, 22, 6, 16, 19], [29, 21, 7, 28, 31], [35, 21, 8, 32, 39]]) crack(S, x, y, n, a, b, G1, G2);
    for (const k of ['armR', 'armL']) { flesh(S, k, P.base, P.dark, { blotch: 8 }); const [x, y, w] = face(k).ring; S.rect(x, y + 9, w, 3, P.dark, 0.2); }
    for (const k of ['legR', 'legL']) flesh(S, k, P.dark, P.deep, { blotch: 8, light: P.base });
  }
  baseSwatches(K, P);
  K.decal('iris', irisDecal(0xff5ae0, 0x6a1a50));
  const womb = glowMat(0xff5ad0, { base: 2.0, amp: 0.9, speed: 2.2 });
  const rig = newRig(K, { headS: 12, bodyH: 12, legH: 6, bodyW: 9, bodyD: 6, armW: 3, scale: 1.2 });
  rig.float = 0.25;
  K.absorb(rig);
  const Hs = 12 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // a face made of eyes: moving pupils, two sets of lids that blink in turn
  const pupils = grp(H, 0, 0, 0), lidsA = grp(H, 0, 0, 0), lidsB = grp(H, 0, 0, 0);
  lidsA.visible = lidsB.visible = false;
  [[-3.2, 9.6, 3.6], [2.8, 10.4, 3.0], [-0.2, 5.6, 2.6], [4.0, 5.0, 2.0], [-4.4, 4.4, 2.2], [0.6, 12.2, 1.8], [-1.6, 2.0, 1.6], [3.4, 1.8, 1.4]].forEach(([x, y, s], i) => {
    K.box(H, s, s, s * 0.6, 'scl', M4(x, y, h2 + s * 0.3));
    K.box(pupils, s * 0.68, s * 0.68, 0.3, { a: 'fx', f: 'iris' }, M4(x, y, h2 + s * 0.6 + 0.15));
    K.box(i % 2 ? lidsB : lidsA, s + 0.4, s + 0.4, 0.5, 'fd', M4(x, y, h2 + s * 0.6 + 0.45));
  });
  K.eye(H, 2.6, M4(h2, 9, 2, 0, HP)); K.eye(H, 1.8, M4(h2, 4, -2.4, 0, HP)); K.eye(H, 2.8, M4(-h2, 8, 0, 0, -HP)); K.eye(H, 1.6, M4(-h2, 3.4, 3, 0, -HP));
  K.eye(H, 3, M4(0, 8, -h2, 0, Math.PI)); K.eye(H, 2.2, M4(-2.6, 4, -h2, 0, Math.PI)); K.eye(H, 2.2, M4(2, Hs, -2, -HP));
  // crown of bony spires
  for (const [x, z, rx, rz] of [[-4.6, -1.2, -0.25, 0.5], [-2.4, -4.4, -0.55, 0.25], [1.4, -4.8, -0.6, -0.15], [4.4, -1.8, -0.3, -0.5], [0, -1.4, -0.2, 0], [-1.8, 2.4, 0.25, 0.3], [2.8, 2.6, 0.3, -0.35]]) {
    const big = Math.abs(x) > 3 || z < -4;
    const M = M4(x, Hs - 0.5, z, rx, 0, rz);
    K.box(H, big ? 1.8 : 1.3, big ? 4.6 : 3, big ? 1.8 : 1.3, 'bone', M, true);
    const M2 = M.clone().multiply(M4(0, big ? 4.4 : 2.8, 0, rx * 0.9, 0, rz * 0.9));
    K.box(H, big ? 1.1 : 0.8, big ? 3.6 : 2.2, big ? 1.1 : 0.8, 'boneD', M2, true);
    if (big) K.box(H, 0.6, 0.6, 0.6, 'glow', M2.clone().multiply(M4(0, 3.8, 0)));
  }
  // distended belly with a vertical womb-mouth and hanging cords
  K.box(T, 9.6, 7.4, 3.2, 'fl', M4(0, 4.4, 3.4)); K.box(T, 8, 2, 2.8, 'fd', M4(0, 0.6, 3.2));
  K.gbox(T, 2.4, 5.6, 0.6, womb, M4(0, 4.6, 5.0));
  for (const sx of [-1, 1]) { K.box(T, 1.2, 6.4, 1, 'gum', M4(sx * 1.7, 4.6, 5.1)); for (let i = 0; i < 5; i++) K.box(T, 1.1, 0.5, 0.5, 'bone', M4(sx * 0.9, 2.2 + i * 1.1 + (sx > 0 ? 0.5 : 0), 5.35)); }
  for (const [x, a] of [[-2.6, 0.3], [2.2, -0.2], [0.4, 0.1]]) { K.box(T, 0.8, 3.4, 0.8, 'gum', M4(x, -1.2, 4.6, a)); K.box(T, 0.7, 3.0, 0.7, 'fd', M4(x + a * 2, -4.2, 5.2, a * 1.6)); }
  K.box(T, 10, 1.6, 7, 'fd', M4(0, 12.2, 0));
  // two pairs of small extra arms out of the flanks (wriggle)
  const xa = [];
  for (const sx of [-1, 1]) {
    const g = grp(T, sx * 5, 8.4, 1);
    for (const [y, z, a, b] of [[0, 0, 1.9, 0.6], [-3.6, -0.6, 2.25, 0.25]]) {
      const M = M4(0, y, z, b, 0, -sx * a);
      K.box(g, 1.7, 5, 1.7, 'fl', M, true);
      const M2 = M.clone().multiply(M4(0, 4.8, 0, 0.9, 0, 0));
      K.box(g, 1.3, 4.4, 1.3, 'fd', M2, true);
      for (const cx of [-0.4, 0.4]) K.box(g, 0.4, 1.8, 0.4, 'bone', M2.clone().multiply(M4(cx, 4.4, 0, 0.3)), true);
    }
    xa.push({ g, sx });
  }
  for (const arm of [rig.armR, rig.armL]) { K.box(arm, 3.6, 1.2, 4.4, 'fd', M4(0, -9.6, 0)); for (const x of [-1, 0, 1]) K.box(arm, 0.7, 3.6, 0.7, 'bone', M4(x, -12, 1.2, 0.35)); }
  for (const leg of [rig.legR, rig.legL]) for (const x of [-1.2, 0, 1.2]) K.box(leg, 0.7, 0.7, 1.8, 'bone', M4(x, -5.6, 2.6));
  // cocoon orbs (enemy.js spins rig.extras.orbs)
  const orbs = grp(rig.root, 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const x = Math.cos(i * 2.1) * 15, z = Math.sin(i * 2.1) * 15, y = 33;
    K.gbox(orbs, 3, 3.4, 3, womb, M4(x, y, z));
    K.box(orbs, 3.8, 0.9, 3.8, 'fd', M4(x, y + 1.8, z)); K.box(orbs, 3.8, 0.9, 3.8, 'fd', M4(x, y - 1.8, z));
    for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) K.box(orbs, 0.7, 3.4, 0.7, 'fl', M4(x + dx, y, z + dz));
    K.box(orbs, 0.5, 3, 0.5, 'gum', M4(x, y - 3.6, z, 0.2));
  }
  rig.extras.orbs = orbs;
  K.finish(rig, { emit: 3.0, rim: 0xff70d8, rimStrength: 0.5 });
  const E = eyeState(); let blinkA = 2 + Math.random() * 2, blinkB = 3 + Math.random() * 2;
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    stepEye(E, dt, 1); pupils.position.set(E.x * 0.4 * PX, E.y * 0.4 * PX, 0);
    blinkA -= dt; blinkB -= dt;
    lidsA.visible = blinkA < 0.12; if (blinkA < 0) blinkA = 1.5 + Math.random() * 3;
    lidsB.visible = blinkB < 0.12; if (blinkB < 0) blinkB = 1.2 + Math.random() * 3;
    const cast = o.state === 'windup' ? 1 : 0;
    for (const a of xa) { a.g.rotation.z = a.sx * (Math.sin(t * 4.2 + a.sx) * 0.25 + cast * 0.5); a.g.rotation.x = Math.sin(t * 3.1 + a.sx * 2) * 0.3 - cast * 0.6; }
    orbs.position.y = Math.sin(t * 1.8) * 1.5 * PX;
    if (Math.random() < (1.5 + cast * 8) * dt * bud) { T.localToWorld(v1.set(rnd(1) * PX, 4.6 * PX, 5.5 * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.4), 0.4 + cast, rnd(0.4), 0.8, 1.6, 0.4, 1.2, 0.09, -0.2, 1, 0.1, 0); }
  };
  return rig;
}

// =====================================================================
// THE WIDER BESTIARY
// Same pipeline as above: one painted HD skin per kind, merged per
// (group, material), cached per kind, plus rig.idle for the flavour. Kinds
// that are not humanoid (fly heads, the womb, the hand, the serpent, the
// maw, the lantern) build their limbs from their own groups and animate
// them in rig.idle from the owner's velocity and attack state.
// =====================================================================
const mvOf = (o) => Math.min(1, Math.hypot(o.vel?.x ?? 0, o.vel?.z ?? 0) / Math.max(1, o.speed || 3));
const wind = (o) => (o.state === 'windup' && o.action ? Math.min(1, o.stateT / Math.max(0.15, o.action.windup)) : 0);
// faceted insect eye: a checker of glowing facets with a wet glint
const compoundDecal = (c1, c2, base) => (S, x, y) => {
  S.mat = 'eye'; S.rect(x, y, 4, 4, base, 0.05);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if ((i + j) % 2) S.fineRect(x + i * 0.5, y + j * 0.5, 0.5, 0.5, (i * 3 + j) % 5 ? c1 : c2);
  S.fineRect(x + 0.5, y + 0.5, 1, 0.5, 0xffffff); S.fine(x + 0.5, y + 1, 0xffffff);
};
// sewing stitches across a rect (Mahito's patchwork, the doll's seams)
function stitches(S, x, y, len, vertical, c, mat = 'flesh') {
  for (let i = 0; i < len; i++) {
    if (vertical) { S.fineRect(x, y + i, 0.5, 0.5, c, mat); S.fineRect(x - 0.5, y + i + 0.25, 1.5, 0.25, c, mat); }
    else { S.fineRect(x + i, y, 0.5, 0.5, c, mat); S.fineRect(x + i + 0.25, y - 0.5, 0.25, 1.5, c, mat); }
  }
}

// =====================================================================
// GRADE 4 FLY HEAD — a severed head on fly wings, compound eyes, dangling legs
// =====================================================================
function flyhead(K) {
  const P = { base: 0x9a9c80, dark: 0x5a5c44, deep: 0x2c2c1e, glow: 0xff4a3a, eye: 0xff5a3a, sclera: 0xd8d0a8, gum: 0x7a2a2a };
  const S = K.S;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { top: 0x7a7c62, veins: 6, blotch: 10, light: 0xb4b698 });
    // face: a sunken nose, a lipless pucker of a mouth, a stitched brow
    S.mat = 'flesh'; S.rect(11, 12, 2, 1, P.deep, 0.1); S.rect(10, 14, 4, 1, 0x200a0a, 0.05); S.px(9, 14, P.gum); S.px(14, 14, P.gum);
    stitches(S, 9, 9.5, 6, false, 0x3a1a1a);
    // the torn stump underneath: raw meat around a ring of bone
    S.rect(16, 0, 8, 8, 0x8a1a1a, 0.25); S.rect(18, 2, 4, 4, 0xd8c8a8, 0.1); S.rect(19, 3, 2, 2, 0x4a0808, 0.1);
    for (let i = 0; i < 20; i++) S.px(8 + Math.floor(S.r() * 8), Math.floor(S.r() * 8), 0x2a2a1a);   // stubble
  }
  baseSwatches(K, P);
  K.decal('compound', compoundDecal(0xff4a2a, 0xffb04a, 0x6a0c0c));
  K.solid('chit', 0x34342a, 0.12, 'leather');
  K.solid('wing', 0xa8bcc8, 0.06, 'eye', (S2, x, y) => { S2.fineRect(x + 0.5, y, 0.5, 4, 0x3a4a54, 'eye'); S2.fineRect(x, y + 1.5, 4, 0.5, 0x3a4a54, 'eye'); S2.fineRect(x + 2.5, y + 0.5, 0.5, 3, 0x4a5a64, 'eye'); S2.fine(x + 3, y + 3, 0xe8f4ff); });
  K.solid('leg', 0x221c18, 0.15, 'leather');
  const rig = newRig(K, { headS: 10, bodyH: 2, legH: 1, bodyW: 4, bodyD: 4, armW: 2, scale: 0.62 });
  rig.float = 1.55;
  K.absorb(rig, ['head']);
  const Hs = 10 * 1.12, h2 = Hs / 2, H = rig.head;
  // bulging compound eyes wrapping the front corners, heavy brow, torn ears
  for (const sx of [-1, 1]) {
    K.box(H, 4.6, 5.6, 3.4, { a: 'chit', f: 'compound', s: 'compound', t: 'compound' }, M4(sx * 4.1, 6.6, h2 - 0.8, 0, sx * 0.55, 0));
    K.box(H, 1.2, 3.2, 2.4, 'fl', M4(sx * (h2 + 0.4), 5.2, -1.6, 0, 0, sx * 0.3));
  }
  K.box(H, 7.2, 1.3, 1.6, 'fd', M4(0, 9.4, h2 + 0.3, -0.2));
  // mandibles and a dangling proboscis
  K.teeth(H, 4, -1.8, 1.8, 2.6, h2 + 0.2, 1.0, true, 0.55);
  const prob = grp(H, 0, 2.0, h2 + 0.2);
  K.box(prob, 1.5, 1.5, 2.2, 'gum', M4(0, 0, 1.0)); K.box(prob, 1.1, 1.1, 2.4, 'gum', M4(0, -0.8, 2.8, 0.5)); K.box(prob, 1.6, 0.9, 1.0, 'fd', M4(0, -1.8, 3.9, 0.7));
  // ragged neck stump: meat, a vertebra, hanging strands
  K.box(H, 7, 1.6, 7, { a: 'gum', u: 'maw' }, M4(0, -0.6, 0)); K.box(H, 2, 2, 2, 'bone', M4(0.4, -1.8, -0.6));
  for (const [x, z, l] of [[-2.4, 1.6, 3.4], [2.2, -1.8, 2.6], [-0.6, -2.6, 4.2]]) K.box(H, 0.7, l, 0.7, 'gum', M4(x, -1.4 - l / 2, z));
  // two pairs of veined wings (flap)
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = grp(H, sx * 2.2, Hs - 0.6, -1.6);
    K.box(w, 13, 0.35, 5.4, 'wing', M4(sx * 6.6, 0, -0.6, 0, sx * 0.25, 0));
    K.box(w, 9.6, 0.35, 4.2, 'wing', M4(sx * 5.0, -0.4, -5.0, 0, sx * 0.7, 0));
    K.box(w, 2.4, 1.2, 2.4, 'chit', M4(0, 0, 0));
    wings.push({ w, sx });
  }
  // six thin dangling insect legs
  const legs = grp(H, 0, -1.2, 0);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const M = M4(sx * (1.6 + i * 0.5), -0.4, 1.8 - i * 1.8, 0.35 - i * 0.25, 0, sx * 0.45);
    K.box(legs, 0.55, 3.6, 0.55, 'leg', M.clone().multiply(M4(0, -1.8, 0)));
    K.box(legs, 0.45, 3.0, 0.45, 'leg', M.clone().multiply(M4(0, -3.6, 0, 0.9)).multiply(M4(0, -1.5, 0)));
  }
  const mat = K.finish(rig, { emit: 3.0, rim: 0xff6a3a, rimStrength: 0.45 });
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const w = wind(o), dive = o.state === 'active' ? 1 : w;
    const f = Math.sin(t * (62 + dive * 30));
    for (const g of wings) { g.w.rotation.z = g.sx * (0.15 + f * 0.75); g.w.rotation.y = g.sx * f * 0.15; }
    H.rotation.x = damp(H.rotation.x, dive * 0.75 + Math.sin(t * 3.1) * 0.08, 8, dt);
    H.rotation.z = Math.sin(t * 2.3) * 0.12;
    legs.rotation.x = Math.sin(t * 4.2) * 0.25 + mvOf(o) * 0.45 + dive * 0.4;
    prob.rotation.x = Math.sin(t * 5.3) * 0.25 - dive * 0.5;
    if (Math.random() < 1.0 * dt * bud) { H.localToWorld(v1.set(rnd(2) * PX, -2.5 * PX, rnd(2) * PX)); drip(Pt, v1.x, v1.y, v1.z, 0.9, 0.15, 0.1, 0.06); }
    mat.userData.emitMask.value = 2.6 + dive * 2.5 + Math.sin(t * 9) * 0.3;
  };
  return rig;
}

// =====================================================================
// TRANSFIGURED HUMAN — Mahito's victim: lopsided, stitched, in office clothes
// =====================================================================
const TF = { base: 0xb4a4a2, dark: 0x6a5a5e, deep: 0x3a2a30, glow: 0x6affd0, eye: 0xd8f0e8, sclera: 0xe0d8cc, gum: 0x8a2a3a, round: true };
function paintTransfigured(S, P) {
  flesh(S, 'head', P.base, P.dark, { top: 0x948484, veins: 3, blotch: 9, light: 0xc8b8b4 });
  // patchwork face: one sunken socket high, one sliding down the cheek, a diagonal mouth
  S.mat = 'flesh'; S.rect(9, 9, 2, 2, P.deep, 0.05); S.rect(13, 12, 2, 1, P.deep, 0.05);
  for (let i = 0; i < 5; i++) S.px(10 + i, 15 - Math.floor(i / 2), 0x1a0808);
  S.rect(16, 0, 3, 8, 0x1a1410, 0.2); S.rect(8, 0, 4, 3, 0x1a1410, 0.2); S.rect(0, 8, 3, 3, 0x1a1410, 0.2);   // patchy hair
  stitches(S, 12, 8, 8, true, 0x2a1418); stitches(S, 0, 12, 8, false, 0x2a1418); stitches(S, 24, 10, 8, false, 0x2a1418);
  // torn white office shirt, a dark tie, flesh showing through rips
  S.mat = 'cloth'; paintBox(S, 'body', 0xd4d0c6, 0.08);
  const [fx, fy] = face('body').front;
  S.rect(fx + 3, fy, 2, 8, 0x2a2a48, 0.06); S.rect(fx + 3, fy + 8, 2, 1, 0x1a1a30, 0.05);
  S.mat = 'flesh';
  for (const [x, y, w, h] of [[fx + 5, fy + 6, 3, 4], [fx, fy + 2, 2, 3], [30, 24, 3, 5], [37, 22, 3, 3], [16, 25, 3, 4]]) { S.rect(x, y, w, h, P.base, 0.2); S.px(x, y, P.dark); }
  stitches(S, fx + 5, fy + 8, 3, false, 0x2a1418); stitches(S, 31, 24, 5, true, 0x2a1418);
  S.mat = 'cloth'; { const [x, y, w] = face('body').ring; S.rect(x, y + 11, w, 1, 0x3a3a3a, 0.05); }
  for (const k of ['armR', 'armL']) flesh(S, k, P.base, P.dark, { blotch: 9, veins: 2 });
  { const [x, y, w] = face('armL').ring; S.mat = 'cloth'; S.rect(x, y, w, 5, 0xd4d0c6, 0.08); }
  for (const k of ['legR', 'legL']) { S.mat = 'cloth'; paintBox(S, k, 0x2c2c34, 0.08); const [x, y, w, h] = face(k).ring; S.rect(x, y + h - 2, w, 2, 0x141418, 0.05); S.mat = 'flesh'; S.rect(x + 1 + Math.floor(S.r() * 8), y + 4, 2, 3, P.base, 0.2); }
}
function transfigured(K) {
  const P = TF, S = K.S;
  if (K.paint) paintTransfigured(S, P);
  baseSwatches(K, P);
  K.solid('shirt', 0xd4d0c6, 0.08, 'cloth'); K.solid('tie', 0x2a2a48, 0.06, 'cloth'); K.solid('hair', 0x1a1410, 0.15, 'hair');
  const soul = glowMat(0x5affd0, { base: 1.4, amp: 0.8, speed: 2.2 });
  const rig = newRig(K, { headS: 7, bodyH: 12, legH: 11, bodyW: 8, bodyD: 5, armW: 3, scale: 1.05 });
  rig.hunch = 0.25;
  rig.neck.position.x = 1.6 * PX;
  K.absorb(rig);
  const Hs = 7 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // mismatched eyes, a second little face budding out of the side of the head
  K.eye(H, 1.7, M4(-1.8, 5.4, h2)); K.eye(H, 1.0, M4(2.0, 2.8, h2));
  K.teeth(H, 5, -2.2, 1.8, 1.6, h2 + 0.2, 0.9, true, 0.55, 'bone', 0.35);
  K.box(H, 4.6, 5.0, 4.4, 'fl', M4(h2 + 1.4, 3.0, 0.2, 0, 0, -0.35)); K.eye(H, 1.3, M4(h2 + 2.8, 4.0, 2.4, 0, 0.6));
  K.box(H, 2.0, 0.6, 0.6, 'gum', M4(h2 + 2.6, 1.8, 2.5, 0, 0.6));
  K.box(H, 3.8, 1.4, 3.6, 'hair', M4(-1.6, Hs + 0.4, -0.4)); K.box(H, 1.4, 2.4, 3.0, 'hair', M4(-h2 - 0.3, Hs - 1.4, -0.6));
  // collar, a hanging tie (sways), torn shirt flaps, a stitched soul seam glowing through
  K.box(T, 8.6, 1.6, 5.6, 'shirt', M4(0, 11.6, 0));
  const tie = grp(T, 0, 11, 2.7);
  K.box(tie, 1.6, 7, 0.5, 'tie', M4(0, -3.6, 0)); K.box(tie, 2.0, 1.4, 0.6, 'tie', M4(0, -0.2, 0));
  for (const [x, z, l] of [[-3, 2.6, 3.4], [2.6, 2.6, 2.4], [3.4, -2.6, 3.8], [-2.4, -2.6, 2.8]]) K.box(T, 1.8, l, 0.5, 'shirt', M4(x, -l / 2 + 0.6, z, z > 0 ? 0.15 : -0.15));
  K.gbox(T, 0.5, 7, 0.4, soul, M4(1.5, 5, 2.62)); K.gbox(T, 3, 0.4, 0.4, soul, M4(0, 3.4, 2.62));
  // the right arm swollen into a club of flesh; the left withered
  K.box(rig.armR, 5.8, 5.4, 5.8, 'fl', M4(-0.6, 0.4, 0)); K.box(rig.armR, 3.4, 3, 3.6, 'fd', M4(-2.2, -3.4, 1.2));
  K.box(rig.armR, 6.4, 5.6, 6.4, 'fl', M4(-0.4, -9.4, 0.2)); K.box(rig.armR, 3.2, 3.2, 3.2, 'fd', M4(-2.8, -7.6, -1.4));
  for (const x of [-2, -0.4, 1.2]) K.box(rig.armR, 1.2, 2.4, 1.2, 'boneD', M4(x - 0.4, -12.6, 2.4, 0.4));
  K.eye(rig.armR, 1.4, M4(-0.4, -9, 3.3)); K.gbox(rig.armR, 0.4, 5, 0.4, soul, M4(-3.3, -5, 0.6));
  rig.armL.scale.set(0.7, 0.85, 0.7);
  K.box(T, 1.4, 4.2, 1.4, 'fl', M4(-2.4, 8, -3.2, -0.9, 0, 0.6), true); K.box(T, 1.0, 2.2, 1.0, 'boneD', M4(-3.4, 9.6, -5.8, -1.4, 0, 0.6), true);   // vestigial arm out of the back
  for (const leg of [rig.legR, rig.legL]) K.box(leg, 4.6, 1.6, 5.4, 'fx', M4(0, -10.4, 0.6));
  const mat = K.finish(rig, { emit: 2.4, rim: 0x6affd0, rimStrength: 0.35 });
  let jerk = 0, jz = 0;
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const surge = Math.max(0, Math.sin((o.game.time ?? t) * 4 + (o.home?.x ?? 0)));
    T.rotation.z = 0.12 + Math.sin(t * 2.0) * 0.08 + surge * 0.1;
    jerk -= dt; if (jerk <= 0) { jerk = 0.4 + Math.random() * 1.6; jz = 0.35 + rnd(0.3); }
    H.rotation.z = damp(H.rotation.z, jz, 14, dt);
    tie.rotation.x = 0.1 + Math.sin(t * 3.3) * 0.2 + mvOf(o) * 0.3; tie.rotation.z = Math.sin(t * 2.1) * 0.15;
    if (Math.random() < 1.2 * dt * bud) { T.localToWorld(v1.set(1.5 * PX, (3 + Math.random() * 6) * PX, 3 * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.1), 0.4, rnd(0.1), 0.7, 0.4, 1.6, 1.2, 0.07, -0.2, 1, 0.1, 0); }
    mat.userData.emitMask.value = 2.2 + surge * 0.6;
  };
  return rig;
}
// TRANSFIGURED REMNANT — the top half of one, dragging itself along on its arms
function remnant(K) {
  const P = TF, S = K.S;
  if (K.paint) paintTransfigured(S, P);
  baseSwatches(K, P);
  K.solid('shirt', 0xd4d0c6, 0.08, 'cloth');
  const soul = glowMat(0x5affd0, { base: 1.6, amp: 0.9, speed: 3 });
  const rig = newRig(K, { headS: 7, bodyH: 9, legH: 3, bodyW: 8, bodyD: 5, armW: 3, scale: 0.85 });
  rig.hunch = 0.95;
  rig.neck.rotation.x = -0.8;
  K.absorb(rig, ['body', 'head', 'armR', 'armL']);
  const Hs = 7 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  K.eye(H, 1.7, M4(-1.8, 5.4, h2)); K.eye(H, 1.0, M4(2.0, 2.8, h2));
  K.teeth(H, 5, -2.2, 1.8, 1.6, h2 + 0.2, 0.9, true, 0.55, 'bone', 0.35);
  // the torn waist: entrails, a spine stub, soul light leaking
  K.box(T, 8.4, 1.4, 5.4, { a: 'gum', u: 'maw' }, M4(0, -0.2, 0)); K.box(T, 1.8, 3, 1.8, 'bone', M4(0, -1.4, -1.6, 0.6));
  for (const [x, z, l] of [[-2.6, 1, 4], [1.8, 1.6, 3], [0, -0.4, 5]]) K.box(T, 1.1, l, 1.1, 'gum', M4(x, -l / 2, z, 0.9));
  K.gbox(T, 4, 0.5, 3, soul, M4(0, -0.6, 0.4));
  for (const arm of [rig.armR, rig.armL]) for (const x of [-1, 0, 1]) K.box(arm, 0.7, 2.6, 0.7, 'boneD', M4(x, -11, 1.2, 0.5));
  K.finish(rig, { emit: 2.4, rim: 0x6affd0, rimStrength: 0.35 });
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles;
    H.rotation.z = Math.sin(t * 6.2) * 0.2;
    if (Math.random() < 3 * dt * (Pt.budget ?? 1)) { T.localToWorld(v1.set(rnd(3) * PX, -1 * PX, rnd(2) * PX)); drip(Pt, v1.x, v1.y, v1.z, 0.5, 1.6, 1.2, 0.07); }
  };
  return rig;
}

// =====================================================================
// GRADE 3 CURSED WOMB — a crawling embryo with a glowing brood sac on its back
// =====================================================================
function embryo(K) {
  const P = { base: 0xd8968e, dark: 0x9a4a56, deep: 0x5a1a2a, glow: 0xff70b0, eye: 0xffd0e0, sclera: 0xe8d0c8, gum: 0x9a2a4a, round: true };
  const S = K.S;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { top: 0xc88078, veins: 12, blotch: 8, light: 0xecb4a8, veinC: 0x8a3a5a });
    for (const [x, y, n, a, b] of [[10, 0, 12, 8, 16], [13, 1, 10, 8, 16], [18, 0, 12, 16, 24], [2, 8, 8, 0, 8], [26, 8, 8, 24, 32]]) glowVein(S, x, y, n, 0xff8ac0, 0xd050a0, a, y, b, 16);
    // shut, bulging fetal eyelids, slit nostrils, a tiny puckered mouth
    S.mat = 'flesh';
    for (const x0 of [8, 13]) { S.rect(x0, 10, 3, 2, 0xb87478, 0.1); S.fineRect(x0, 11.5, 3, 0.5, P.deep, 'flesh'); S.fineRect(x0 + 0.5, 10, 2, 0.5, 0xecb0a8, 'flesh'); }
    S.fineRect(11.5, 13, 0.5, 0.5, P.deep, 'flesh'); S.fineRect(12.5, 13, 0.5, 0.5, P.deep, 'flesh');
    S.rect(11, 14, 2, 1, 0x4a1020, 0.05);
  }
  baseSwatches(K, P);
  K.solid('skin2', 0xc8807c, 0.18); K.solid('cord', 0xb04a6a, 0.12, 'flesh', (S2, x, y) => { S2.fineRect(x, y + 1, 4, 0.5, 0x6a1a3a, 'flesh'); S2.fineRect(x, y + 2.5, 4, 0.5, 0x8a2a4a, 'flesh'); });
  K.solid('mem', 0xe8a0b8, 0.1, 'eye');
  K.decal('lid', (S2, x, y) => { S2.mat = 'flesh'; S2.rect(x, y, 4, 4, 0xc87c80, 0.12); S2.fineRect(x, y + 2, 4, 0.5, 0x4a0a1a, 'flesh'); S2.fineRect(x + 0.5, y + 2.5, 3, 0.5, 0x8a3a4a, 'flesh'); for (let i = 0; i < 4; i++) S2.fineRect(x + 0.5 + i * 0.9, y + 2.5, 0.25, 0.75, 0x2a0610, 'flesh'); S2.fineRect(x + 0.5, y + 0.5, 1, 0.5, 0x9a3a5a, 'flesh'); S2.fineRect(x + 2.5, y + 1, 1, 0.5, 0x9a3a5a, 'flesh'); });
  const womb = glowMat(0xff5ab0, { base: 1.8, amp: 1.0, speed: 2.6 });
  const rig = newRig(K, { headS: 10, bodyH: 3, legH: 4, bodyW: 6, bodyD: 6, armW: 2, scale: 0.9 });
  K.absorb(rig, ['head']);
  rig.neck.position.set(0, -1.5 * PX, 5.5 * PX);
  const Hs = 10 * 1.12, h2 = Hs / 2, H = rig.head, R = rig.hips;
  // fat curled body lying flat, a belly, the brood sac on the back with ribs over it
  const B = grp(R, 0, 0, 0);
  K.box(B, 11, 7.4, 13, { a: 'fl', u: 'fd' }, M4(0, 3.2, -4.4)); K.box(B, 9, 2.6, 10, 'fd', M4(0, -0.4, -4.4));
  const sac = grp(B, 0, 6.6, -5.4);
  K.gbox(sac, 9.4, 7.6, 10.4, womb, M4(0, 3.2, 0));
  for (const z of [-3.6, -1.2, 1.2, 3.6]) K.box(sac, 9.2, 0.9, 1.0, 'skin2', M4(0, 3.4, z)), K.box(sac, 0.9, 5.4, 1.0, 'skin2', M4(-4.4, 1.6, z)), K.box(sac, 0.9, 5.4, 1.0, 'skin2', M4(4.4, 1.6, z));
  for (const [x, y, z, ry] of [[-4.3, 3.2, -1.8, -HP], [4.3, 2.4, 1.6, HP], [0, 6.3, 0.6, 0]]) K.box(sac, 2.2, 3.0, 0.5, 'fx', M4(x, y, z, ry ? 0 : -HP, ry, 0));   // shapes pressing out
  // umbilical cord trailing back to a knot (sways)
  const cord = grp(B, 0, 2.4, -10);
  for (let i = 0; i < 5; i++) K.box(cord, 1.6 - i * 0.1, 1.6 - i * 0.1, 2.6, 'cord', M4(Math.sin(i) * 0.6, -i * 0.5, -1.3 - i * 2.4, 0.15, i * 0.2, 0));
  K.gbox(cord, 2, 2, 2, womb, M4(0.4, -2.6, -13.2));
  // big veined head: brow ridge, ears like buds, a crown of soft bumps
  K.box(H, 9, 1.8, 1.8, 'fd', M4(0, 8.6, h2 + 0.4, -0.15)); for (const sx of [-1, 1]) K.box(H, 1.2, 2.6, 2.2, 'fl', M4(sx * (h2 + 0.4), 6, 0));
  // bulging shut eyelids that twitch, a tiny toothed mouth, drool
  const lids = grp(H, 0, 6.2, h2);
  for (const sx of [-1, 1]) K.box(lids, 3.8, 3.0, 1.6, { a: 'fl', f: 'lid' }, M4(sx * 2.5, 0, 0.6));
  K.box(H, 2.6, 1.2, 0.6, 'maw', M4(0, 2.2, h2 + 0.1)); K.teeth(H, 3, -0.8, 0.8, 2.8, h2 + 0.3, 0.6, true, 0.4); K.box(H, 0.4, 2.2, 0.4, 'drool', M4(0.7, 1.0, h2 + 0.4));
  for (const [x, z, s] of [[-3, -2, 3], [2.6, -3.6, 2.4], [0, 1.6, 2]]) K.box(H, s, 1.2, s, 'fl', M4(x, Hs + 0.4, z));
  // four stubby limbs (crawl)
  const limbs = [];
  for (const [x, z, front] of [[-5.9, 1.4, 1], [5.9, 1.4, 1], [-5.9, -9.2, 0], [5.9, -9.2, 0]]) {
    const g = grp(R, x, 3.4, z);
    K.box(g, front ? 2.6 : 3.4, 5.4, front ? 2.6 : 3.4, 'fl', M4(0, -2.4, 0)); K.box(g, 3.2, 1.3, 3.8, 'fd', M4(0, -5.2, 0.6));
    for (const fx of [-0.9, 0, 0.9]) K.box(g, 0.6, 0.6, 1.2, 'bone', M4(fx, -5.6, 2.6));
    limbs.push({ g, ph: (x < 0) === (front === 1) ? 0 : Math.PI });
  }
  const mat = K.finish(rig, { emit: 2.8, rim: 0xff6ab0, rimStrength: 0.5 });
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const mv = mvOf(o), w = wind(o), ph = t * 9;
    for (const l of limbs) l.g.rotation.x = Math.sin(ph + l.ph) * 0.75 * mv - 0.15;
    B.rotation.z = Math.sin(ph) * 0.06 * mv + Math.sin(t * 43) * 0.08 * w;
    const k = 1 + Math.sin(t * (3 + w * 14)) * (0.05 + w * 0.12) + w * 0.4;
    sac.scale.set(k, k, k);
    H.rotation.x = Math.sin(t * 1.7) * 0.06 - 0.05; H.rotation.z = 0.22 + Math.sin(t * 1.1) * 0.08 + Math.sin(t * 37) * 0.06 * w;
    const tw = Math.sin(t * 2.3) > 0.85 ? 1 : 0; lids.scale.set(1, 1 + tw * 0.15 + w * 0.2, 1 + tw * 0.4 + w * 0.6);
    cord.rotation.y = Math.sin(t * 2.4) * 0.4; cord.rotation.x = Math.sin(t * 1.9) * 0.15;
    if (Math.random() < (1.4 + w * 14) * dt * bud) { sac.localToWorld(v1.set(rnd(4) * PX, (2 + rnd(3)) * PX, rnd(4) * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.3), 0.6 + w, rnd(0.3), 0.6, 1.8, 0.5, 1.2, 0.08, -0.3, 1, 0.1, 0); }
    mat.userData.emitMask.value = 2.4 + w * 2;
  };
  return rig;
}

// =====================================================================
// GRADE 3 GRASSHOPPER — Shibuya's insect curse: spring legs, sickle arms
// =====================================================================
function grasshopper(K) {
  const P = { base: 0x6a8a3a, dark: 0x3a5220, deep: 0x1c2a10, glow: 0xd8ff4a, eye: 0xffa020, sclera: 0xd8d8a0, gum: 0x6a3a1a, bone: 0xd8d0a0, boneD: 0x8a7a40 };
  const S = K.S;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { mat: 'leather', top: 0x7a9a48, blotch: 6, light: 0x8aaa58 });
    S.mat = 'leather'; for (let y = 9; y < 16; y += 3) S.rect(8, y, 8, 1, P.dark, 0.1);
    S.rect(10, 13, 4, 3, 0x4a2a10, 0.1); S.rect(11, 15, 2, 1, 0x1a0a04, 0.05);
    flesh(S, 'body', P.base, P.dark, { mat: 'leather', blotch: 6 });
    { const [x, y, w, h] = face('body').ring; for (let r = y + 1; r < y + h; r += 2) S.rect(x, r, w, 1, P.dark, 0.1); }
    { const [fx, fy] = face('body').front; S.rect(fx + 1, fy, 6, 12, 0xb0a860, 0.12); for (let r = fy + 1; r < fy + 12; r += 2) S.rect(fx + 1, r, 6, 1, 0x8a8040, 0.1); }
    for (const k of ['armR', 'armL']) flesh(S, k, P.base, P.dark, { mat: 'leather', blotch: 6 });
  }
  baseSwatches(K, P);
  K.decal('compound', compoundDecal(0xffa020, 0xffe060, 0x5a2a04));
  K.solid('chit', P.base, 0.12, 'leather', (S2, x, y) => { S2.fineRect(x, y + 1.5, 4, 0.5, P.dark, 'leather'); });
  K.solid('chitD', P.dark, 0.14, 'leather'); K.solid('belly', 0xb0a860, 0.1, 'leather', (S2, x, y) => { S2.fineRect(x, y + 2, 4, 0.5, 0x8a8040, 'leather'); });
  K.solid('wingG', 0x8a7a48, 0.1, 'leather', (S2, x, y) => { S2.fineRect(x + 1, y, 0.5, 4, 0x4a3a1a, 'leather'); S2.fineRect(x + 2.5, y, 0.5, 4, 0x5a4a24, 'leather'); S2.fine(x + 2, y + 1, 0x3a2a10, 'leather'); });
  const rig = newRig(K, { headS: 7, bodyH: 11, legH: 12, bodyW: 6, bodyD: 5, armW: 2, scale: 1.05 });
  rig.hunch = 0.55; rig.neck.rotation.x = -0.45;
  K.absorb(rig, ['body', 'head', 'armR', 'armL']);
  const Hs = 7 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso, R = rig.hips;
  // compound eyes, a long face plate, antennae (sway), mandibles (open on wind-up)
  for (const sx of [-1, 1]) K.box(H, 3.0, 4.6, 3.4, { a: 'chitD', f: 'compound', s: 'compound' }, M4(sx * 3.6, 4.8, 0.8, 0, sx * 0.4, 0));
  K.box(H, 5.4, 3.2, 2, 'chit', M4(0, 1.2, h2 + 0.6, 0.2));
  const ants = [];
  for (const sx of [-1, 1]) { const a = grp(H, sx * 1.4, Hs - 0.6, h2 - 1); K.box(a, 0.4, 10, 0.4, 'chitD', M4(0, 5, 0)); K.box(a, 0.35, 7, 0.35, 'chitD', M4(0, 11.5, -1.6, -0.5)); a.rotation.set(-0.5, 0, -sx * 0.35); ants.push({ a, sx }); }
  const mands = [];
  for (const sx of [-1, 1]) { const m = grp(H, sx * 1.6, 0.6, h2 + 1.2); K.box(m, 1.0, 1.0, 2.6, 'boneD', M4(-sx * 0.4, 0, 1.0, 0, sx * 0.5, 0)); K.box(m, 0.6, 0.6, 1.4, 'bone', M4(-sx * 1.2, 0, 2.4, 0, sx * 1.1, 0)); mands.push({ m, sx }); }
  // armoured saddle over the shoulders, folded wings along the back, small middle legs
  K.box(T, 7.6, 4.6, 6.4, 'chit', M4(0, 9.4, 0.2)); K.box(T, 8, 1, 6.8, 'chitD', M4(0, 7, 0.2));
  for (const sx of [-1, 1]) K.box(T, 3.2, 0.6, 15, 'wingG', M4(sx * 1.6, 8.2, -7.5, -0.15, sx * 0.06, sx * 0.1));
  for (const sx of [-1, 1]) { K.box(T, 1.0, 6, 1.0, 'chitD', M4(sx * 3.6, 3, 1, 0.5, 0, sx * 0.9)); K.box(T, 0.8, 5, 0.8, 'chitD', M4(sx * 6.4, -0.6, 2.2, 0.2, 0, sx * 0.2)); }
  // long segmented abdomen sloping down behind
  const abd = grp(R, 0, 1, -2);
  for (let i = 0; i < 4; i++) K.box(abd, 5.8 - i * 0.8, 5 - i * 0.6, 3.4, { a: 'chit', u: 'belly' }, M4(0, -i * 0.9, -1.8 - i * 3.1, 0.2));
  K.box(abd, 1.0, 1.0, 3, 'boneD', M4(0, -4, -14.4, 0.4));
  // sickle forelimbs
  for (const arm of [rig.armR, rig.armL]) { K.box(arm, 2.6, 2, 3, 'chitD', M4(0, -9.6, 0)); K.box(arm, 0.9, 6.4, 0.9, 'bone', M4(0, -11.4, 2.2, 1.0)); for (let i = 0; i < 3; i++) K.box(arm, 0.5, 1.2, 0.5, 'boneD', M4(0, -10.8 + i * 0.1, 1.2 + i * 1.3, -0.4)); }
  // spring-loaded hind legs: femur up and back, tibia down to the foot
  const legs = [];
  for (const sx of [-1, 1]) {
    const th = grp(R, sx * 3.8, 0, -1);
    K.box(th, 3.2, 11, 3.8, { a: 'chit', s: 'chitD' }, M4(0, 5.5, 0)); K.box(th, 2.4, 6, 3.0, 'chitD', M4(sx * 0.4, 3.5, 1.2));
    const kn = grp(th, 0, 11, 0);
    K.box(kn, 1.6, 18, 1.6, 'chitD', M4(0, 9, 0));
    for (let i = 0; i < 5; i++) K.box(kn, 0.5, 1.4, 0.5, 'bone', M4(0, 3 + i * 3, -1.0, 0.6));
    K.box(kn, 2.0, 1.0, 3.2, 'chitD', M4(0, 18, 0.8));
    legs.push({ th, kn, sx });
  }
  K.finish(rig, { emit: 2.4, rim: 0xc8ff5a, rimStrength: 0.3 });
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const w = wind(o), air = o.state === 'active' ? 1 : 0, mv = mvOf(o);
    for (const L of legs) {
      const step = Math.sin(t * 10 + (L.sx > 0 ? Math.PI : 0)) * 0.18 * mv;
      L.th.rotation.x = damp(L.th.rotation.x, -0.9 - w * 0.45 + air * 0.65 + step, 14, dt);
      L.kn.rotation.x = damp(L.kn.rotation.x, 3.79 + w * 0.5 - air * 0.6 - step, 14, dt);
    }
    for (const a of ants) a.a.rotation.z = -a.sx * (0.35 + Math.sin(t * 3 + a.sx) * 0.12) - air * a.sx * 0.3;
    for (const m of mands) m.m.rotation.y = m.sx * (0.1 + Math.abs(Math.sin(t * 7)) * 0.15 + w * 0.6);
    abd.rotation.x = Math.sin(t * 2.6) * 0.06 + air * 0.25;
    if (air && Math.random() < 20 * dt * bud) Pt.smoke.emit(o.pos.x + rnd(0.3), o.pos.y + 0.4 + (o.liftOff ?? 0), o.pos.z + rnd(0.3), 0, 0, 0, 0.5, 0.25, 0.3, 0.12, 0.2, 0, 2, 0.9, 0);
  };
  return rig;
}

// =====================================================================
// GRADE 2 GRAVE DEITY — wrapped, pockmarked head, a coffin on its back,
// grave planks fanning out behind and a bell staff
// =====================================================================
function gravekeeper(K) {
  const P = { base: 0x5a5268, dark: 0x343044, deep: 0x1c1826, glow: 0xb05aff, eye: 0xff5aff, sclera: 0xe8dcc8, gum: 0x5a1a2a };
  const S = K.S, WR = 0xd4ccb4, POX = 0x8a3a2a;
  if (K.paint) {
    // head wrapped in burial cloth, eaten by pocks; one eye in a slit
    S.mat = 'cloth'; paintBox(S, 'head', WR, 0.08);
    for (let y = 0; y < 16; y += 2) S.rect(0, y, 32, 1, 0xb8ae94, 0.08);
    for (let i = 0; i < 26; i++) { const x = Math.floor(S.r() * 32), y = Math.floor(S.r() * 16); S.mat = 'flesh'; S.px(x, y, POX); S.fine(x + 0.25, y + 0.25, 0xe0a070, 'flesh'); }
    S.mat = 'flesh'; S.rect(11, 9, 2, 6, 0x140a10, 0.05); S.mat = 'eye'; S.px(11, 11, 0xff6aff); S.fine(11.5, 11, 0xffffff);
    S.mat = 'cloth'; paintBox(S, 'body', P.base, 0.1);
    { const [x, y, w] = face('body').ring; S.rect(x, y + 6, w, 2, 0x8a7a58, 0.1); for (let i = 0; i < w; i += 3) S.fineRect(x + i + 0.5, y + 6, 0.5, 2, 0x5a4a30, 'cloth'); }
    { const [fx, fy] = face('body').front; for (let r = 0; r < 6; r++) { S.px(fx + 3 - (r >> 1), fy + r, 0xc8bca0); S.px(fx + 4 + (r >> 1), fy + r, 0xc8bca0); } }
    for (const [x, y] of [[18, 26], [30, 24], [36, 27], [22, 29]]) S.rect(x, y, 2, 2, 0x3a3226, 0.2);
    for (const k of ['armR', 'armL']) { flesh(S, k, 0x8a8a9a, 0x4a4a5a, { mat: 'skin', blotch: 5 }); const [x, y, w] = face(k).ring; S.mat = 'cloth'; S.rect(x, y, w, 6, P.base, 0.1); S.mat = 'flesh'; for (let i = 0; i < 6; i++) S.px(x + Math.floor(S.r() * w), y + 6 + Math.floor(S.r() * 6), POX); }
  }
  baseSwatches(K, P);
  K.solid('wrap', WR, 0.08, 'cloth', (S2, x, y) => { S2.fineRect(x, y + 1, 4, 0.5, 0xb0a68c, 'cloth'); S2.fineRect(x, y + 3, 4, 0.5, 0xb0a68c, 'cloth'); });
  K.solid('pox', POX, 0.15, 'flesh', (S2, x, y) => { S2.fineRect(x + 1.5, y + 1.5, 1, 1, 0xe8b080, 'flesh'); });
  K.solid('robe', P.base, 0.1, 'cloth'); K.solid('robeD', P.dark, 0.1, 'cloth');
  K.solid('wood', 0x5a4030, 0.16, 'leather', (S2, x, y) => { S2.fineRect(x, y + 1, 4, 0.5, 0x3a2818, 'leather'); S2.fineRect(x, y + 2.5, 2, 0.5, 0x3a2818, 'leather'); });
  K.solid('woodD', 0x3a281c, 0.16, 'leather'); K.solid('rope', 0xa89060, 0.12, 'cloth', (S2, x, y) => { for (let i = 0; i < 4; i++) S2.fineRect(x + i, y + (i % 2) * 2, 0.5, 2, 0x6a5a3a, 'cloth'); });
  K.solid('iron', 0x6a6458, 0.12, 'metal'); K.solid('ironD', 0x3a3630, 0.12, 'metal');
  K.solid('plank', 0xb8a888, 0.12, 'leather'); K.decal('sotoba', (S2, x, y) => { S2.mat = 'leather'; S2.rect(x, y, 4, 4, 0xb8a888, 0.1); for (let i = 0; i < 4; i++) S2.fineRect(x + 1.5, y + 0.25 + i, 1, 0.5, 0x1a1210, 'leather'); S2.fineRect(x + 1, y + 1.5, 2, 0.5, 0x1a1210, 'leather'); });
  K.decal('lid', (S2, x, y) => { S2.mat = 'leather'; S2.rect(x, y, 4, 4, 0x4a3426, 0.12); S2.fineRect(x + 1.75, y + 0.5, 0.5, 3, 0xd8c8a0, 'leather'); S2.fineRect(x + 1, y + 1.25, 2, 0.5, 0xd8c8a0, 'leather'); S2.fineRect(x, y, 4, 0.5, 0x2a1c12, 'leather'); S2.fineRect(x, y + 3.5, 4, 0.5, 0x2a1c12, 'leather'); });
  K.solid('paper', 0xe0d2a8, 0.06, 'cloth'); K.decal('ofuda', ofudaDecal(0xe4d6b0, 0x8a1aa8));
  const ghost = glowMat(0xb05aff, { base: 1.6, amp: 0.9, speed: 2.4 });
  const rig = newRig(K, { headS: 9, bodyH: 13, legH: 6, bodyW: 9, bodyD: 6, armW: 3, scale: 1.2 });
  rig.hunch = 0.3; rig.neck.rotation.x = -0.25;
  K.absorb(rig, ['body', 'head', 'armR', 'armL']);
  rig.legL.visible = rig.legR.visible = false;
  const Hs = 9 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // boils bulging through the wrappings, a forehead talisman, trailing ends of cloth
  for (const [x, y, z, s] of [[-3, 7.6, h2, 1.6], [2.8, 3.4, h2, 1.3], [h2, 6, 1.6, 1.8], [-h2, 4, -1.4, 1.4], [1.2, Hs, -1.6, 2], [-2, Hs, 2, 1.2], [0.4, 8.8, -h2, 1.6]]) K.box(H, s, s, s, 'pox', M4(x, y, z));
  K.box(H, 2.6, 4.6, 0.3, { a: 'paper', f: 'ofuda' }, M4(2.6, Hs - 2.4, h2 + 0.3, 0, 0, -0.2));
  for (const [x, l] of [[-2, 7], [1.4, 9]]) K.box(H, 1.6, l, 0.4, 'wrap', M4(x, -l / 2 + 2, -h2 - 0.3, 0.12));
  // the coffin strapped to its back (lid rattles), grave planks fanning out above it
  const cof = grp(T, 0, 2, -3.4);
  cof.rotation.x = 0.12;
  K.box(cof, 9.6, 17, 3.4, 'wood', M4(0, 8.5, -1.7)); K.box(cof, 10.2, 1.2, 4, 'woodD', M4(0, 15.6, -1.7)); K.box(cof, 10.2, 1.2, 4, 'woodD', M4(0, 1, -1.7));
  const lid = grp(cof, 0, 0, -3.4);
  K.box(lid, 9.2, 16.4, 0.9, { a: 'woodD', b: 'lid' }, M4(0, 8.5, -0.45));
  K.gbox(cof, 8.6, 0.5, 2.2, ghost, M4(0, 15.0, -3.5));
  for (const y of [5, 12]) { K.box(T, 10.4, 1, 7, 'rope', M4(0, y, -1.8)); }
  K.box(T, 1, 13, 1, 'rope', M4(-3, 6.5, 3.1, 0, 0, 0.5)); K.box(T, 1, 13, 1, 'rope', M4(3, 6.5, 3.1, 0, 0, -0.5));
  for (const [x, a, l] of [[-4.6, 0.55, 14], [-1.6, 0.2, 18], [1.6, -0.2, 16], [4.6, -0.5, 13]]) K.box(cof, 2.2, l, 0.5, { a: 'plank', b: 'sotoba', f: 'sotoba' }, M4(x, 14 + l / 2 - 2, -2.6, -0.15, 0, a), false);
  // robe: collar, sleeves, a skirt to the ground with a ghost-lit hem (sways)
  K.box(T, 10, 2, 7, 'robeD', M4(0, 12.6, 0));
  for (const arm of [rig.armR, rig.armL]) { K.box(arm, 4.6, 6.4, 5.2, 'robe', M4(0, -1.4, 0)); for (const x of [-1, 0, 1]) K.box(arm, 0.6, 2.2, 0.6, 'boneD', M4(x, -11.2, 1.2, 0.3)); }
  const skirt = grp(rig.hips, 0, 0, 0);
  K.box(skirt, 10, 6.4, 7.4, 'robe', M4(0, -3.2, 0));
  for (const [x, z, w, d] of [[-3.3, 3.2, 3.2, 1], [0, 3.3, 3, 1], [3.3, 3.2, 3.2, 1], [-3.3, -3.2, 3.2, 1], [0, -3.3, 3.2, 1], [3.3, -3.2, 3.2, 1], [-4.6, 0, 1, 5.4], [4.6, 0, 1, 5.4]]) { K.box(skirt, w, 0.8, d, 'robeD', M4(x, -6.4, z)); K.gbox(skirt, w + 0.1, 0.4, d + 0.1, ghost, M4(x, -6.9, z)); }
  // a bell staff in the right hand
  const staff = grp(rig.handR, 0, 0, 0);
  K.box(staff, 1, 34, 1, 'woodD', M4(0, 5, 1.2)); K.box(staff, 3.6, 1, 3.6, 'iron', M4(0, 22, 1.2));
  const bell = grp(staff, 0, 21.4, 1.2);
  K.box(bell, 2.4, 3, 2.4, 'iron', M4(0, -1.6, 0)); K.box(bell, 3, 0.8, 3, 'ironD', M4(0, -3.2, 0));
  K.box(bell, 0.6, 4, 0.3, { a: 'paper', f: 'ofuda' }, M4(1.4, -3.4, 0));
  rig.extras.staff = staff;
  K.finish(rig, { emit: 2.8, rim: 0xb070ff, rimStrength: 0.45 });
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const w = wind(o), mv = mvOf(o);
    lid.rotation.x = -(Math.max(0, Math.sin(t * 17)) * 0.05 + w * (0.18 + Math.sin(t * 31) * 0.06));
    bell.rotation.z = Math.sin(t * 2.8) * 0.25 + Math.sin(t * 19) * 0.2 * w; bell.rotation.x = Math.sin(t * 2.1) * 0.15;
    skirt.rotation.x = 0.04 + mv * 0.2 + Math.sin(t * 1.7) * 0.04;
    H.rotation.z = Math.sin(t * 0.9) * 0.12;
    if (Math.random() < (2 + w * 14) * dt * bud) { cof.localToWorld(v1.set(rnd(4) * PX, (2 + Math.random() * 13) * PX, -4 * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.2), 0.3 + w * 0.6, rnd(0.2), 1.0, 1.1, 0.4, 1.8, 0.1, -0.3, 1, 0.1, 0); }
    if (Math.random() < 2.5 * dt * bud) { skirt.localToWorld(v1.set(rnd(4) * PX, -6.8 * PX, rnd(3) * PX)); Pt.smoke.emit(v1.x, v1.y, v1.z, rnd(0.2), 0.1, rnd(0.2), 1.0, 0.05, 0.03, 0.08, 0.3, -0.3, 1.2, 1.5, 0); }
  };
  return rig;
}

// =====================================================================
// GRADE 2 LANTERN EYE — a chōchin paper lantern with one huge eye and a
// lolling tongue, hung from a fleshy stalk rooted in the floor
// =====================================================================
function lantern(K) {
  const P = { base: 0x5a2a2a, dark: 0x3a1418, deep: 0x1c080c, glow: 0xffa040, eye: 0xff7a1a, sclera: 0xf4ecd8, gum: 0x8a1a2a, tongue: 0xc83a4a };
  const S = K.S, PAPER = 0xffd890, RIB = 0x6a3a1a;
  if (K.paint) {
    // the lantern body: glowing paper between dark bamboo ribs, a red glyph on each side
    S.mat = 'cloth'; paintBox(S, 'head', PAPER, 0.06);
    for (let y = 8; y < 16; y += 2) S.rect(0, y, 32, 1, RIB, 0.1);
    S.rect(8, 0, 8, 8, RIB, 0.1); S.rect(16, 0, 8, 8, RIB, 0.1);
    for (const x0 of [0, 16, 24]) { S.fineRect(x0 + 3.5, 8.5, 1, 6.5, 0xb01010, 'cloth'); S.fineRect(x0 + 1.5, 10, 5, 0.5, 0xb01010, 'cloth'); S.fineRect(x0 + 2, 12.5, 4, 0.5, 0xb01010, 'cloth'); S.fineRect(x0 + 2, 11, 0.5, 2, 0xb01010, 'cloth'); }
    // a tear in the paper for a mouth
    S.rect(9, 13, 6, 2, 0x1a0606, 0.05); S.rect(10, 15, 4, 1, 0x1a0606, 0.05);
    for (let i = 0; i < 10; i++) S.px(8 + Math.floor(S.r() * 8), 8 + Math.floor(S.r() * 8), 0xe8b060);   // scorch stains
  }
  baseSwatches(K, P);
  K.solid('rib', RIB, 0.1, 'leather'); K.solid('lac', 0x1a1210, 0.08, 'leather', (S2, x, y) => { S2.fineRect(x, y + 1, 4, 0.5, 0x3a2a20, 'leather'); });
  K.solid('paperL', PAPER, 0.05, 'cloth', (S2, x, y) => { S2.fineRect(x, y + 1.75, 4, 0.5, RIB, 'cloth'); });
  K.solid('vine', 0x4a1a24, 0.18, 'flesh', (S2, x, y) => { S2.fineRect(x + 1, y, 0.5, 4, 0x2a0a10, 'flesh'); S2.fine(x + 3, y + 2, 0x7a2a3a, 'flesh'); });
  K.solid('iron', 0x4a4440, 0.12, 'metal');
  K.solid('paper', 0xe0d2a8, 0.06, 'cloth'); K.decal('ofuda', ofudaDecal());
  K.decal('bigEye', (S2, x, y) => {
    S2.mat = 'eye'; S2.rect(x, y, 4, 4, 0xf0e8d4, 0.04);
    for (const [vx, vy, w, h] of [[0, 0.5, 1, 0.5], [0, 3, 1.5, 0.5], [3, 1, 1, 0.5], [3, 3, 1, 0.5], [0.5, 1.5, 0.5, 0.5]]) S2.fineRect(x + vx, y + vy, w, h, 0xc02020);
    S2.fineRect(x + 0.5, y + 0.5, 3, 3, 0xff7a1a); S2.fineRect(x + 1, y + 0.5, 2, 3, 0xffb040); S2.fineRect(x + 0.5, y + 1, 3, 2, 0xffb040);
    S2.fineRect(x + 1.5, y + 1, 1, 2, 0x0a0204); S2.fine(x + 1, y + 1, 0xffffff);
  });
  const rig = newRig(K, { headS: 13, bodyH: 30, legH: 4, bodyW: 4, bodyD: 4, armW: 2, scale: 1.0 });
  K.absorb(rig, ['head']);
  const Hs = 13 * 1.12, h2 = Hs / 2, H = rig.head, R = rig.hips;
  // lacquered caps top and bottom, an iron hanging ring, paper bulging between
  K.box(H, 12.4, 1.8, 12.4, 'lac', M4(0, -0.7, 0)); K.box(H, 12.4, 1.8, 12.4, 'lac', M4(0, Hs + 0.7, 0));
  K.box(H, 15.8, 4.6, 15.8, 'paperL', M4(0, h2 + 1.4, 0)); K.box(H, 16.2, 0.9, 16.2, 'rib', M4(0, h2 + 1.4, 0));
  K.box(H, 1.2, 3.4, 1.2, 'iron', M4(0, Hs + 3, 0)); K.box(H, 4, 1.2, 1.2, 'iron', M4(0, Hs + 4.8, 0));
  // the eye (looks around) and a long tongue out of the tear (swings)
  const eyeG = grp(H, 0, h2 + 1.8, h2 + 0.6);
  K.box(eyeG, 10, 8.4, 2.6, { a: 'scl', f: 'bigEye' }, M4(0, 0, 0.9));
  K.box(H, 11, 1.4, 1.4, 'lac', M4(0, h2 + 6.6, h2 + 1.1, -0.2));
  const tongue = grp(H, 0, 2.6, h2 + 0.8);
  K.box(tongue, 4, 1, 5, 'tongue', M4(0, 0, 2)); K.box(tongue, 3.6, 0.9, 5, 'tongue', M4(0, -2, 5.6, 0.7)); K.box(tongue, 3, 0.9, 4.4, 'tongue', M4(0, -5.6, 7.2, 1.3));
  K.box(H, 0.5, 3.6, 0.5, 'drool', M4(2, 0.4, h2 + 1));
  for (const [x, z] of [[-4.6, -2.6], [4.4, 1.6], [0, -5.2]]) K.box(H, 2.2, 7, 0.3, { a: 'paper', f: 'ofuda' }, M4(x, -4.2, z, 0, x * 0.15, 0));
  // stalk: an S-curve of fleshy vine up to the lantern; a root mass with eyes
  const stalk = grp(R, 0, 0, 0);
  for (let i = 0; i < 10; i++) { const y = i * 3.2 + 1.5, x = Math.sin(i * 0.6) * 2.6 * (1 - i / 10), z = -Math.sin(i * 0.45) * 2 * (1 - i / 10); K.box(stalk, 3.0 - i * 0.08, 3.6, 3.0 - i * 0.08, 'vine', M4(x, y, z, Math.cos(i * 0.45) * 0.2, 0, Math.cos(i * 0.6) * 0.25)); }
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.3; K.box(R, 2.2, 1.6, 7, 'vine', M4(Math.sin(a) * 4, -3.4, Math.cos(a) * 4, 0.25, a, 0)); K.box(R, 1.4, 1.2, 4, 'fd', M4(Math.sin(a) * 8.4, -4, Math.cos(a) * 8.4, 0.2, a, 0)); }
  K.box(R, 6, 3, 6, 'fd', M4(0, -2.6, 0)); K.eye(R, 1.6, M4(2.2, -2.2, 2.9)); K.eye(R, 1.2, M4(-2.6, -2.4, 2.9));
  const mat = K.finish(rig, { emit: 1.4, rim: 0xffa040, rimStrength: 0.4, fill: 0.2 });
  const E = eyeState();
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const w = wind(o), lock = o.action?.locked ? 1 : 0;
    stepEye(E, dt, 0.4 * (1 - w));
    eyeG.rotation.y = E.x; eyeG.rotation.x = E.y;
    const es = 1 + w * 0.25; eyeG.scale.set(es, es, es);
    H.rotation.z = Math.sin(t * 1.3) * 0.12 * (1 - w); H.rotation.x = Math.sin(t * 0.9) * 0.08 * (1 - w);
    stalk.rotation.z = Math.sin(t * 1.3) * 0.04;
    tongue.rotation.x = Math.sin(t * 2.2) * 0.25; tongue.rotation.z = Math.sin(t * 1.6) * 0.2;
    mat.userData.emitMask.value = 1.2 + w * 3 + lock * Math.abs(Math.sin(t * 30)) * 1.5 + Math.sin(t * 7) * 0.1;
    if (Math.random() < (1.5 + w * 20) * dt * bud) { H.localToWorld(v1.set(rnd(6) * PX, (h2 + rnd(5)) * PX, rnd(6) * PX)); const k = w ? -1 : 1; Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.2) * k, 0.4 * k, rnd(0.2) * k, 0.8, 2.2, 1.2, 0.3, 0.07, -0.2, 1, 0.1, 0); }
  };
  return rig;
}

// =====================================================================
// GRADE 3 CRAWLING HAND — a giant corpse hand that walks on its fingers,
// an eye and a mouth on its back, a raw wrist stump trailing a cord
// =====================================================================
function burrower(K) {
  const P = { base: 0xa8a098, dark: 0x5e564e, deep: 0x2a2420, glow: 0xff3a5a, eye: 0xffd040, sclera: 0xe0d4b4, gum: 0x8a1a2a };
  baseSwatches(K, P);
  K.solid('hand', P.base, 0.18, 'skin', (S2, x, y) => { S2.fineRect(x + 1, y + 2, 2, 0.5, 0x7a7068, 'skin'); S2.fine(x + 3, y + 0.5, 0x8a8078, 'skin'); });
  K.solid('handD', 0x7e766c, 0.18, 'skin');
  K.solid('knuck', 0x8a8076, 0.16, 'skin', (S2, x, y) => { S2.fineRect(x + 1, y + 1, 2, 0.5, 0x5a5048, 'skin'); S2.fineRect(x + 1, y + 2.5, 2, 0.5, 0x5a5048, 'skin'); });
  K.solid('nail', 0x1a1414, 0.08, 'metal'); K.solid('raw', 0x8a1a1a, 0.25, 'flesh', (S2, x, y) => { S2.fineRect(x + 1, y + 1, 2, 2, 0xd8c8a8, 'leather'); });
  K.solid('vein', 0x4a5a7a, 0.12, 'skin');
  K.decal('mouthB', (S2, x, y) => { S2.mat = 'flesh'; S2.rect(x, y, 4, 4, P.base, 0.15); S2.fineRect(x + 0.5, y + 1.5, 3, 1, 0x1a0408); S2.fineRect(x + 0.5, y + 1, 3, 0.5, P.gum, 'flesh'); S2.fineRect(x + 0.5, y + 2.5, 3, 0.5, P.gum, 'flesh'); for (let i = 0; i < 6; i++) S2.fineRect(x + 0.75 + i * 0.5, y + (i % 2 ? 1.5 : 2), 0.25, 0.5, 0xe8dcc0); });
  const rig = newRig(K, { headS: 4, bodyH: 2, legH: 7, bodyW: 4, bodyD: 4, armW: 2, scale: 1.0 });
  K.absorb(rig, []);
  const R = rig.hips;
  // the back of the hand faces up: tendons, a lidless eye, a mouth across the knuckles
  const palm = grp(R, 0, 0, 0);
  K.box(palm, 12, 3.4, 12, { a: 'hand', u: 'handD' }, M4(0, 0, 0));
  for (const x of [-4.2, -1.4, 1.4, 4.2]) { K.box(palm, 0.8, 0.6, 9, 'handD', M4(x, 1.9, -0.6)); K.box(palm, 2.6, 1.6, 2.4, 'knuck', M4(x, 1.0, 5.4)); }
  K.box(palm, 3, 0.8, 5, 'vein', M4(-1.6, 1.9, -2.4, 0, 0.5, 0));
  K.eye(palm, 3.6, M4(0.6, 1.6, -1.2, -HP)); K.box(palm, 5.4, 0.8, 1.6, 'handD', M4(0.6, 1.9, -3.8)); K.box(palm, 5.4, 0.8, 1.6, 'handD', M4(0.6, 1.9, 1.4));
  K.box(palm, 7, 0.6, 2.4, { a: 'hand', t: 'mouthB' }, M4(0, 1.9, 3.4));
  K.eye(palm, 1.4, M4(-4.4, 1.7, 1.6, -HP)); K.eye(palm, 1.2, M4(4.6, 1.7, -3.6, -HP));
  // the wrist stump: raw meat, a jutting bone and a trailing cord (sways)
  K.box(palm, 7.6, 4.2, 4, 'hand', M4(0, 0.2, -7.6)); K.box(palm, 7, 3.6, 0.8, 'raw', M4(0, 0.2, -9.9)); K.box(palm, 1.6, 1.6, 3, 'bone', M4(1.2, 0.4, -11));
  const cord = grp(palm, -1.4, 0, -10);
  for (let i = 0; i < 4; i++) K.box(cord, 1.2, 1.2, 2.6, 'raw', M4(Math.sin(i * 1.3) * 0.8, -0.4 - i * 0.3, -1.3 - i * 2.4));
  // four walking fingers and a thumb, two joints each, black nails
  const fingers = [];
  for (const [x, l] of [[-4.2, 5.2], [-1.4, 6], [1.4, 5.8], [4.2, 4.6]]) {
    const f = grp(palm, x, 0, 5.8);
    K.box(f, 2.3, 2.3, l, 'hand', M4(0, 0, l / 2)); K.box(f, 2.5, 1.0, 1.6, 'knuck', M4(0, 1.1, l * 0.6));
    const f2 = grp(f, 0, 0, l);
    K.box(f2, 2.0, 2.0, 4.6, 'hand', M4(0, 0, 2.3)); K.box(f2, 2.1, 0.7, 1.8, 'nail', M4(0, 0.9, 3.8)); K.box(f2, 1.2, 1.2, 1.4, 'nail', M4(0, -0.2, 5.0, 0.6));
    fingers.push({ f, f2, ph: fingers.length * 1.7 });
  }
  const th = grp(palm, 6.2, 0, 0.8);
  K.box(th, 5, 2.6, 2.6, 'hand', M4(2.4, 0, 0)); const th2 = grp(th, 4.8, 0, 0); K.box(th2, 4, 2.2, 2.2, 'hand', M4(2, 0, 0)); K.box(th2, 1.6, 0.7, 2.2, 'nail', M4(3.4, 1, 0));
  K.finish(rig, { emit: 2.6, rim: 0xff4a6a, rimStrength: 0.35 });
  const E = eyeState();
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const mv = mvOf(o), w = wind(o), dig = o.action?.kind === 'dig' ? w : 0;
    for (const F of fingers) {
      const s = Math.sin(t * 13 + F.ph) * mv;
      F.f.rotation.x = 0.5 + s * 0.35 - Math.max(0, -s) * 0.2 + dig * 0.6;
      F.f2.rotation.x = 0.9 - s * 0.25 + dig * 0.5;
      F.f.rotation.y = Math.sin(t * 2 + F.ph) * 0.05;
    }
    th.rotation.y = 0.5 + Math.sin(t * 13) * 0.2 * mv; th.rotation.z = -0.6; th2.rotation.y = 0.4;
    palm.rotation.z = Math.sin(t * 13) * 0.05 * mv; palm.rotation.x = dig * 0.35;
    cord.rotation.y = Math.sin(t * 3) * 0.5;
    stepEye(E, dt, 0.4);
    if (o.state === 'recover' && o.action?.kind === 'emerge' && Math.random() < 20 * dt * bud) Pt.smoke.emit(o.pos.x + rnd(0.6), o.pos.y + 0.2, o.pos.z + rnd(0.6), rnd(1), 1.2, rnd(1), 0.6, 0.25, 0.2, 0.15, 0.3, 4, 2, 1.2, 0);
  };
  return rig;
}

// =====================================================================
// GRADE 1 RAINBOW SERPENT — a long dragon of iridescent scales whose
// segments run through the spectrum, whiskers, horns and a fanged snout
// =====================================================================
const RAINBOW = [0xd8303e, 0xe07424, 0xe0c034, 0x4ec058, 0x30b0c8, 0x4068e0, 0x7c44e0, 0xc842b0, 0xd8306c];
function serpent(K) {
  const P = { base: 0xdcd2c0, dark: 0xa89c88, deep: 0x4a4038, glow: 0xffffff, eye: 0xffe04a, sclera: 0x2a1408, gum: 0x8a1a2a, tongue: 0x6a1a4a, bone: 0xe8e0cc };
  const S = K.S;
  if (K.paint) {
    // pearl head with rainbow markings, deep-set burning eyes
    flesh(S, 'head', P.base, P.dark, { mat: 'leather', top: 0xe4dccc, blotch: 4 });
    for (let x = 0; x < 32; x++) { S.mat = 'leather'; S.px(x, 8 + (x % 3), RAINBOW[x % RAINBOW.length]); }
    S.mat = 'flesh'; S.rect(9, 10, 2, 2, 0x140806, 0.05); S.rect(13, 10, 2, 2, 0x140806, 0.05); S.mat = 'eye'; S.px(9, 11, 0xffe04a); S.px(14, 11, 0xffe04a);
    S.mat = 'leather'; S.rect(8, 13, 8, 3, 0xd8cebc, 0.1);
  }
  baseSwatches(K, P);
  RAINBOW.forEach((c, i) => K.solid('sc' + i, c, 0.1, 'leather', (S2, x, y) => {
    const d = new THREE.Color(c).multiplyScalar(0.55).getHex(), l = new THREE.Color(c).lerp(new THREE.Color(0xd8d8d8), 0.3).getHex();
    for (let j = 0; j < 4; j++) { S2.fineRect(x + (j % 2) * 2, y + j, 2, 0.5, d, 'leather'); S2.fine(x + (j % 2) * 2 + 0.5, y + j + 0.5, l, 'metal'); }
  }));
  K.solid('belly', 0xe8dcb8, 0.08, 'leather', (S2, x, y) => { S2.fineRect(x, y + 1.5, 4, 0.5, 0xb8a888, 'leather'); S2.fineRect(x, y + 3.5, 4, 0.5, 0xb8a888, 'leather'); });
  K.solid('horn', 0xd8c890, 0.1, 'leather', (S2, x, y) => { S2.fineRect(x, y + 1, 4, 0.5, 0xa89860, 'leather'); });
  K.solid('gold', 0xd8a838, 0.06, 'metal'); K.solid('fin', 0xc8c0e0, 0.06, 'eye', (S2, x, y) => { S2.fineRect(x + 1, y, 0.5, 4, 0x8a80b0, 'eye'); S2.fineRect(x + 2.5, y, 0.5, 4, 0x8a80b0, 'eye'); });
  const pearl = glowMat(0xffffff, { base: 1.2, amp: 0.8, speed: 3 });
  const rig = newRig(K, { headS: 9, bodyH: 2, legH: 7, bodyW: 4, bodyD: 4, armW: 2, scale: 1.0 });
  K.absorb(rig, ['head']);
  const Hs = 9 * 1.12, h2 = Hs / 2, H = rig.head;
  // long snout with fangs, a hinged jaw, horns swept back, whiskers, a mane of fins
  K.box(H, 7, 4.6, 7, { a: 'fl', t: 'sc0', u: 'belly' }, M4(0, 4.6, h2 + 3.2)); K.box(H, 5.4, 1.2, 1.4, 'fd', M4(0, 6.6, h2 + 6.6));
  for (const sx of [-1, 1]) K.box(H, 1, 0.6, 0.6, 'maw', M4(sx * 1.6, 6.8, h2 + 6.9));
  K.teeth(H, 5, -2.8, 2.8, 2.4, h2 + 6.2, 1.6, true, 0.7); for (const sx of [-1, 1]) K.box(H, 0.9, 2.6, 0.9, 'bone', M4(sx * 3, 1.4, h2 + 4.4));
  const jaw = grp(H, 0, 2.2, 1);
  K.box(jaw, 6.4, 2, 9, { a: 'fl', u: 'belly', t: 'maw' }, M4(0, -0.8, h2 + 1.4)); K.box(jaw, 3, 0.6, 6, 'tongue', M4(0, 0.4, h2 + 1.4));
  K.teeth(jaw, 4, -2.4, 2.4, 0.2, h2 + 5.6, 1.2, false, 0.6);
  for (const sx of [-1, 1]) {
    K.box(H, 1.4, 1.4, 7, 'horn', M4(sx * 2.6, Hs + 1.4, -2.4, 0.6, sx * 0.25, 0)); K.box(H, 1.0, 1.0, 4.6, 'horn', M4(sx * 3.6, Hs + 4.8, -7.4, 0.25, sx * 0.4, 0));
    K.box(H, 0.35, 0.35, 10, 'gold', M4(sx * 4.6, 4.6, h2 + 2.6, 0.2, sx * 0.9, 0)); K.box(H, 0.3, 0.3, 8, 'gold', M4(sx * 8.6, 3.6, h2 + 6.6, 0.4, sx * 0.3, 0));
    K.box(H, 0.6, 4, 5, 'fin', M4(sx * (h2 + 0.3), 6, -2, 0, 0, sx * 0.4));
  }
  K.gbox(H, 1.6, 1.6, 1.6, pearl, M4(0, Hs + 0.8, h2 - 1));
  // the body: nine scaled segments trailing back through the rainbow (slither)
  const segs = [];
  let prev = rig.root;
  for (let i = 0; i < RAINBOW.length; i++) {
    const g = grp(prev, 0, i ? 0 : 7.2, i ? -5.6 : -3.2);
    const w = 8.2 - i * 0.55, h = 7.2 - i * 0.5;
    K.box(g, w, h, 6.2, { a: 'sc' + i, u: 'belly' }, M4(0, 0, -2.8));
    K.box(g, 0.6, 2.6 - i * 0.12, 3.4, 'fin', M4(0, h / 2 + 1.1, -2.6, -0.3));
    if (i < 7) for (const sx of [-1, 1]) K.box(g, 0.5, 1.6, 2, 'fin', M4(sx * (w / 2 + 0.2), -h / 4, -3, 0, 0, sx * 0.6));
    if (i === RAINBOW.length - 1) { K.box(g, 0.6, 7, 6, 'fin', M4(0, 1, -7.4, 0.2)); K.gbox(g, 1.2, 1.2, 1.2, pearl, M4(0, 0.6, -6)); }
    segs.push(g); prev = g;
  }
  K.finish(rig, { emit: 2.4, rim: 0xc8b0ff, rimStrength: 0.3, rough: 0.55 });
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const mv = mvOf(o), w = wind(o), dash = o.state === 'active' ? 1 : 0;
    const f = 3 + mv * 7 + dash * 10, amp = 0.16 + mv * 0.18 - dash * 0.08 + w * 0.08;
    segs.forEach((g, i) => { g.rotation.y = Math.sin(t * f - i * 0.75) * amp * (i ? 1 : 0.5); g.rotation.x = i ? Math.sin(t * 1.4 - i * 0.6) * 0.04 : 0; });
    jaw.rotation.x = 0.1 + Math.sin(t * 1.8) * 0.06 + w * 0.6 + dash * 0.5;
    H.rotation.y = -Math.sin(t * f) * amp * 0.4; H.rotation.x = -w * 0.25;
    if (Math.random() < (3 + dash * 30) * dt * bud) {
      const i = Math.floor(Math.random() * segs.length), c = new THREE.Color(RAINBOW[i]);
      segs[i].localToWorld(v1.set(rnd(3) * PX, 3 * PX, -2.8 * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.3), 0.5, rnd(0.3), 0.7, c.r * 2, c.g * 2, c.b * 2, 0.08, -0.3, 1, 0.1, 0);
    }
  };
  return rig;
}

// =====================================================================
// GRADE 2 SLIT-MOUTH — a tall woman in a trench coat with a surgical mask,
// giant scissors, and a neck that shoots her head across the room
// =====================================================================
function longneck(K) {
  const P = { base: 0xe4d4c8, dark: 0x9a8478, deep: 0x4a3430, glow: 0xff3a4a, eye: 0xff2a3a, sclera: 0xf0e4dc, gum: 0x8a0a1a };
  const S = K.S, HAIR = 0x0c0a0e, COAT = 0xc4aa82, COATD = 0x8a7454;
  if (K.paint) {
    S.mat = 'hair'; paintBox(S, 'head', HAIR, 0.1);
    for (let x = 0; x < 32; x += 2) S.fineRect(x + 0.5, 8, 0.5, 8, 0x1c1820, 'hair');
    // pale face: dark sunken eyes, and the slit mouth cut ear to ear
    S.mat = 'skin'; S.rect(9, 9, 6, 7, P.base, 0.04); S.rect(9, 9, 6, 1, HAIR, 0.05);
    S.mat = 'eye'; S.rect(9, 11, 2, 1, 0x1a0608, 0.02); S.rect(13, 11, 2, 1, 0x1a0608, 0.02); S.fine(10, 11, 0xff2a3a); S.fine(13.5, 11, 0xff2a3a);
    S.mat = 'skin'; S.fineRect(9, 10.5, 2, 0.5, P.dark, 'skin'); S.fineRect(13, 10.5, 2, 0.5, P.dark, 'skin');
    S.fineRect(8, 14, 8, 0.5, 0x5a0610, 'skin'); S.fineRect(8, 13.5, 0.5, 0.5, 0x8a0a1a, 'skin'); S.fineRect(15.5, 13.5, 0.5, 0.5, 0x8a0a1a, 'skin');
    S.fineRect(9, 14.5, 6, 0.5, 0xb02030, 'skin');
    // trench coat: lapels, belt, double row of buttons
    S.mat = 'cloth'; paintBox(S, 'body', COAT, 0.08);
    const [fx, fy] = face('body').front;
    for (let r = 0; r < 5; r++) { S.px(fx + 2 - (r >> 1), fy + r, COATD); S.px(fx + 5 + (r >> 1), fy + r, COATD); }
    S.rect(fx + 3, fy, 2, 2, P.base, 0.04);
    for (const r of [5, 8, 10]) { S.px(fx + 2, fy + r, 0x3a2a1a); S.px(fx + 5, fy + r, 0x3a2a1a); }
    { const [x, y, w] = face('body').ring; S.rect(x, y + 7, w, 1, 0x5a4428, 0.06); }
    for (const k of ['armR', 'armL']) { S.mat = 'cloth'; paintBox(S, k, COAT, 0.08); const [x, y, w, h] = face(k).ring; S.rect(x, y + h - 3, w, 1, COATD, 0.06); S.mat = 'skin'; S.rect(x, y + h - 2, w, 2, P.base, 0.04); }
    for (const k of ['legR', 'legL']) { S.mat = 'cloth'; paintBox(S, k, 0x241c22, 0.06); const [x, y, w, h] = face(k).ring; S.mat = 'leather'; S.rect(x, y + h - 2, w, 2, 0x8a1020, 0.06); }
  }
  baseSwatches(K, P);
  K.solid('hair', HAIR, 0.1, 'hair', (S2, x, y) => { S2.fineRect(x + 1, y, 0.5, 4, 0x221c26, 'hair'); S2.fineRect(x + 3, y, 0.5, 4, 0x1a1420, 'hair'); });
  K.solid('coat', COAT, 0.08, 'cloth'); K.solid('coatD', COATD, 0.08, 'cloth'); K.solid('skn', P.base, 0.05, 'skin');
  K.solid('mask', 0xf2f2ee, 0.03, 'cloth', (S2, x, y) => { S2.fineRect(x, y + 1, 4, 0.5, 0xd0d0cc, 'cloth'); S2.fineRect(x, y + 2.5, 4, 0.5, 0xd0d0cc, 'cloth'); });
  K.solid('blade', 0xc8ccd4, 0.06, 'metal'); K.solid('bladeD', 0x6a6e78, 0.08, 'metal'); K.solid('red', 0xb01828, 0.08, 'cloth');
  const rig = newRig(K, { headS: 7, bodyH: 15, legH: 14, bodyW: 7, bodyD: 4, armW: 3, scale: 1.05 });
  rig.hunch = 0.12;
  K.absorb(rig);
  const Hs = 7 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // the stretching neck: one box from the shoulders to the head, scaled along z
  const neck = grp(rig.neck, 0, 0, 0);
  K.box(neck, 2.4, 2.4, 1, 'skn', M4(0, 1.4, 0.5));
  K.box(T, 2.6, 2.4, 2.6, 'skn', M4(0, 15.6, 0));
  // long hair: a back curtain, side curtains, strands
  K.box(H, 8.6, 1, 8.6, 'hair', M4(0, Hs + 0.3, -0.2)); K.box(H, 9, 16, 1.4, 'hair', M4(0, 0, -h2 - 0.5));
  for (const sx of [-1, 1]) { K.box(H, 1, 13, 6, 'hair', M4(sx * (h2 + 0.4), 1.6, -1)); K.box(H, 0.8, 8, 1, 'hair', M4(sx * 3.4, 0.2, h2 + 0.3)); }
  for (const [x, l] of [[-3, 6], [-1, 9], [1.2, 7], [3.2, 8]]) K.box(H, 1.8, l, 1, 'hair', M4(x, -8 - l / 2 + 1, -h2 - 0.6));
  // the mask (falls away on the lunge) and a lower jaw that gapes open
  const mask = grp(H, 0, 0, 0);
  K.box(mask, 7.2, 3.8, 0.6, 'mask', M4(0, 2.0, h2 + 0.35)); for (const sx of [-1, 1]) K.box(mask, 0.3, 0.3, 4.4, 'mask', M4(sx * 3.7, 3.2, 1.6));
  const jaw = grp(H, 0, 1.6, 0);
  K.box(jaw, 7.4, 1.6, 7.4, { a: 'skn', t: 'maw' }, M4(0, -0.8, 0)); K.teeth(jaw, 9, -3.4, 3.4, 0, h2 - 0.4, 0.9, false, 0.45);
  K.teeth(H, 9, -3.4, 3.4, 1.6, h2 + 0.05, 0.8, true, 0.45);
  // coat: popped collar, belt, long tails (sway), cuffs
  K.box(T, 8.6, 3.4, 5.4, 'coatD', M4(0, 14.6, -0.4)); K.box(T, 7.6, 1.2, 4.6, 'coatD', M4(0, 7.4, 0));
  const tails = grp(rig.hips, 0, 0, 0);
  K.box(tails, 8, 11, 5, 'coat', M4(0, -5.4, -0.2)); K.box(tails, 1.2, 11, 0.5, 'coatD', M4(0, -5.4, 2.4));
  for (const arm of [rig.armR, rig.armL]) K.box(arm, 3.6, 1.4, 4.6, 'coatD', M4(0, -8.4, 0));
  // giant scissors in the right hand: two blades that snip
  const sc = grp(rig.handR, 0, -1, 1.6);
  sc.rotation.x = -1.3;
  const bladeA = grp(sc, 0, 0, 0), bladeB = grp(sc, 0, 0, 0);
  for (const [b, s] of [[bladeA, 1], [bladeB, -1]]) { K.box(b, 1.2, 16, 0.5, 'blade', M4(s * 0.5, 9, s * 0.3)); K.box(b, 0.4, 16, 0.6, 'bladeD', M4(s * 1.1, 9, s * 0.3)); K.box(b, 3.4, 3.4, 0.6, 'red', M4(-s * 1.4, -2.2, s * 0.3)); }
  K.box(sc, 1.2, 1.2, 1.6, 'bladeD', M4(0, 1, 0));
  K.finish(rig, { emit: 2.6, rim: 0x9a8ab0, rimStrength: 0.22 });
  rig.idle = (dt, o) => {
    const t = rig.t;
    const w = wind(o), ext = Math.max(0, o.neckExt ?? 0), open = o.state === 'active' || w > 0.6 ? 1 : 0;
    const extPx = ext / PX / (rig.spec.scale ?? 1);
    H.position.set(0, 0, extPx * PX); H.position.y = extPx * 0.08 * PX;
    neck.scale.z = Math.max(0.01, extPx);
    mask.position.y = damp(mask.position.y, -open * 9 * PX, 10, dt); mask.rotation.x = damp(mask.rotation.x, open * 0.9, 10, dt);
    jaw.rotation.x = damp(jaw.rotation.x, 0.05 + open * 0.75 + w * 0.2, 16, dt);
    H.rotation.z = Math.sin(t * 0.7) * 0.15 * (1 - w) + (ext > 0.1 ? Math.sin(t * 20) * 0.1 : 0);
    const snip = w > 0 ? Math.abs(Math.sin(t * 14)) * 0.5 : 0.08 + Math.sin(t * 1.3) * 0.04;
    bladeA.rotation.z = snip; bladeB.rotation.z = -snip;
    tails.rotation.x = 0.06 + mvOf(o) * 0.35 + Math.sin(t * 2.1) * 0.04;
  };
  return rig;
}

// =====================================================================
// GRADE 3 MAW PILLAR — a column of flesh burst up through the floor, all
// mouth: the upper half hinges back to bite, eyes and spines on top
// =====================================================================
function maw(K) {
  const P = { base: 0x9a3040, dark: 0x5a1424, deep: 0x2a0610, glow: 0xff5a3a, eye: 0xffd23a, sclera: 0xe8d4b0, gum: 0xc04060, bone: 0xf0e4c8 };
  baseSwatches(K, P);
  K.solid('flm', P.base, 0.2, 'flesh', (S2, x, y) => { S2.fineRect(x + 0.5, y + 1, 1.5, 0.5, P.dark, 'flesh'); S2.fineRect(x + 2, y + 2.5, 1.5, 0.5, P.dark, 'flesh'); S2.fine(x + 3, y + 0.5, 0xc05060, 'flesh'); });
  K.solid('st', 0x5a5650, 0.18, 'leather', (S2, x, y) => { S2.px(x + 1, y + 2, 0x3a3834); S2.px(x + 2, y + 1, 0x6a665e); });
  K.solid('stD', 0x3a3834, 0.2, 'leather'); K.solid('vein', 0x3a0a1a, 0.15, 'flesh');
  K.solid('paper', 0xe0d2a8, 0.06, 'cloth'); K.decal('ofuda', ofudaDecal());
  const throat = glowMat(0xff6a2a, { base: 2.2, amp: 1.0, speed: 4 });
  const rig = newRig(K, { headS: 8, bodyH: 2, legH: 2, bodyW: 4, bodyD: 4, armW: 2, scale: 1.1 });
  K.absorb(rig, []);
  const root = rig.root;
  // rubble collar the column broke through
  const base = grp(root, 0, 0, 0);
  for (let i = 0; i < 9; i++) { const a = i * 0.698 + 0.2, r = 9 + (i % 3); K.box(base, 4 + (i % 2) * 1.5, 2 + (i % 3), 3.4, i % 2 ? 'st' : 'stD', M4(Math.sin(a) * r, 0.8, Math.cos(a) * r, 0.2 * (i % 2), a, 0.25 * ((i % 3) - 1))); }
  // the lower jaw: the column itself, a tongue, a row of teeth along the rim
  K.box(base, 15, 10, 15, { a: 'flm', t: 'gum' }, M4(0, 5, 0)); K.box(base, 16, 3, 16, 'fd', M4(0, 1.4, 0));
  for (const [x, z] of [[-6, 6], [6, 5], [-5.6, -6], [7, -4]]) K.box(base, 0.8, 9, 0.8, 'vein', M4(x, 5, z * 1.27, 0, 0, 0.1));
  K.box(base, 7, 1.2, 9, 'tongue', M4(0, 10.4, 0.6)); K.gbox(base, 6, 0.4, 6, throat, M4(0, 10.1, -1.6));
  K.teeth(base, 7, -6.4, 6.4, 10, 7.0, 2.4, false, 1.2);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) K.box(base, 1.1, 2 + (i % 2) * 0.6, 1.1, 'bone', M4(sx * 6.9, 11, 4.5 - i * 3.2));
  // tendrils splayed over the floor
  for (let i = 0; i < 5; i++) { const a = i * 1.257 + 0.6; K.box(base, 2, 1.4, 8, 'fd', M4(Math.sin(a) * 9, 0.5, Math.cos(a) * 9, 0, a, 0)); K.box(base, 1.2, 1, 5, 'flm', M4(Math.sin(a) * 14, 0.3, Math.cos(a) * 14, 0, a, 0)); }
  // the upper jaw (hinges back): fangs, eyes, a crest of spines, torn seals
  const up = grp(root, 0, 10, -7.5);
  K.box(up, 15.4, 9, 15.4, { a: 'flm', u: 'gum' }, M4(0, 4.5, 7.5));
  K.teeth(up, 7, -6.6, 6.6, 0, 14.6, 2.8, true, 1.3);
  for (const sx of [-1, 1]) { K.box(up, 1.6, 4.4, 1.6, 'bone', M4(sx * 5.6, -1.8, 14.2)); for (let i = 0; i < 4; i++) K.box(up, 1.1, 2.2, 1.1, 'bone', M4(sx * 7.1, -1, 12 - i * 3.2)); }
  K.eye(up, 3.2, M4(-3.6, 6.2, 15.2)); K.eye(up, 2.4, M4(3.4, 5.4, 15.2)); K.eye(up, 1.6, M4(0, 7.8, 15.2)); K.eye(up, 2.2, M4(7.7, 5, 9, 0, HP)); K.eye(up, 2.0, M4(-7.7, 4.4, 5, 0, -HP));
  K.box(up, 12, 1.4, 2, 'fd', M4(0, 8.6, 15.0, -0.2));
  for (const [x, z, s] of [[-4, 4, 1], [0, 2, 1.3], [4, 5, 0.9], [-2, 9, 0.8], [3, 10, 0.7]]) { K.box(up, 1.4 * s, 4.6 * s, 1.4 * s, 'boneD', M4(x, 9, z, -0.5, 0, x * 0.06), true); }
  K.box(up, 2.6, 5.2, 0.3, { a: 'paper', f: 'ofuda' }, M4(-5, 3.6, 15.3, 0, 0, 0.25)); K.box(up, 2.4, 4.8, 0.3, { a: 'paper', f: 'ofuda' }, M4(5.8, 2.8, 15.3, 0, 0, -0.3));
  K.gbox(up, 6, 0.4, 6, throat, M4(0, 0.2, 5.6));
  K.finish(rig, { emit: 2.8, rim: 0xff5a4a, rimStrength: 0.45 });
  const E = eyeState();
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const w = wind(o), k = o.action?.kind;
    let open = 0.08 + Math.sin(t * 1.6) * 0.05;
    if (o.state === 'windup') open = k === 'chomp' ? 0.25 + w * 0.75 + Math.sin(t * 40) * 0.03 : 0.25 + w * 0.35;
    else if (o.state === 'recover') open = k === 'chomp' ? 0 : 0.3;
    up.rotation.x = damp(up.rotation.x, -open, o.state === 'recover' && k === 'chomp' ? 40 : 10, dt);
    const b = 1 + Math.sin(t * 1.6) * 0.02; base.scale.set(b, 1, b);
    stepEye(E, dt);
    if (Math.random() < (1 + w * 10) * dt * bud) { up.localToWorld(v1.set(rnd(4) * PX, 0, 8 * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.3), 0.6, rnd(0.3), 0.6, 2.2, 0.8, 0.3, 0.08, -0.3, 1, 0.1, 0); }
    if (Math.random() < 0.8 * dt * bud) { up.localToWorld(v1.set(rnd(6) * PX, -2 * PX, 14.6 * PX)); drip(Pt, v1.x, v1.y, v1.z, 0.9, 0.5, 0.5); }
  };
  return rig;
}

// =====================================================================
// GRADE 2 CURSED CORPSE — one of Yaga's plush puppets gone wrong: button
// eyes, stuffing, pins, a burning core in a torn seam, a quilted shield
// =====================================================================
function doll(K) {
  const P = { base: 0xc8987e, dark: 0x8a5e4a, deep: 0x4a2a20, glow: 0x5ae8ff, eye: 0x5ae8ff, sclera: 0xe8e0d0, gum: 0x8a2a3a };
  const S = K.S, FUR = 0xc8987e, PATCH = 0x5a7ab0, PAD = 0xe8c8b0, ST = 0x8a1a1a;
  if (K.paint) {
    for (const k of ['head', 'body', 'armR', 'armL', 'legR', 'legL']) { S.mat = 'cloth'; paintBox(S, k, FUR, 0.12); mottle(S, k, 0xb08068, 12, 0xd8aa90); }
    // stitched X mouth, a blue cheek patch, a seam over the crown
    S.mat = 'cloth'; S.rect(13, 12, 3, 3, PATCH, 0.08); stitches(S, 13, 12, 3, false, 0x1a2a4a, 'cloth'); stitches(S, 13, 15, 3, false, 0x1a2a4a, 'cloth');
    for (let i = 0; i < 3; i++) { S.fineRect(10 + i * 0.5, 13.5 + i * 0.5, 0.5, 0.5, ST, 'cloth'); S.fineRect(11 - i * 0.5, 13.5 + i * 0.5, 0.5, 0.5, ST, 'cloth'); }
    stitches(S, 12, 0, 8, true, ST, 'cloth'); stitches(S, 0, 10, 8, false, ST, 'cloth');
    // belly: a torn seam (the core glows inside it), patches, paw pads
    const [fx, fy] = face('body').front;
    S.rect(fx + 1, fy + 3, 6, 6, 0xe8c8b0, 0.1); S.rect(fx + 3, fy + 4, 2, 4, 0x1a0a0a, 0.05);
    stitches(S, fx + 2.5, fy + 3, 6, true, ST, 'cloth'); stitches(S, fx + 5, fy + 3, 6, true, ST, 'cloth');
    S.rect(30, 22, 3, 3, PATCH, 0.08); stitches(S, 30, 22, 3, false, 0x1a2a4a, 'cloth');
    for (const k of ['armR', 'armL', 'legR', 'legL']) { const [x, y, w, h] = face(k).ring; S.rect(x, y + h - 2, w, 2, PAD, 0.08); stitches(S, x, y + h - 2.5, w, false, ST, 'cloth'); }
  }
  baseSwatches(K, P);
  K.solid('fur', FUR, 0.12, 'cloth', (S2, x, y) => { S2.fine(x + 1, y + 1, 0xb08068, 'cloth'); S2.fine(x + 3, y + 2.5, 0xd8aa90, 'cloth'); });
  K.solid('pad', PAD, 0.08, 'cloth'); K.solid('patch', PATCH, 0.08, 'cloth', (S2, x, y) => { S2.fineRect(x, y, 4, 0.5, 0x1a2a4a, 'cloth'); S2.fineRect(x, y + 3.5, 4, 0.5, 0x1a2a4a, 'cloth'); });
  K.solid('stuff', 0xf4f0e8, 0.06, 'cloth'); K.solid('thread', 0x1a0a0a, 0.05, 'cloth');
  K.decal('btn', (S2, x, y) => { S2.mat = 'metal'; S2.rect(x, y, 4, 4, 0x141016, 0.05); S2.fineRect(x, y, 4, 0.5, 0x3a3440, 'metal'); for (const [a, b] of [[1, 1], [2.5, 1], [1, 2.5], [2.5, 2.5]]) S2.fineRect(x + a, y + b, 0.5, 0.5, 0x5ae8ff, 'glow'); });
  K.solid('btnS', 0x141016, 0.05, 'metal');
  K.solid('quilt', 0xa83a4a, 0.08, 'cloth', (S2, x, y) => { S2.fineRect(x + 1.75, y, 0.5, 4, 0x5a1420, 'cloth'); S2.fineRect(x, y + 1.75, 4, 0.5, 0x5a1420, 'cloth'); S2.fine(x + 0.5, y + 0.5, 0xe8c8b0, 'cloth'); });
  K.solid('iron', 0x8a8a94, 0.1, 'metal'); K.solid('pin', 0xffd040, 0.05, 'glow');
  const core = glowMat(0x5ae8ff, { base: 2.2, amp: 1.0, speed: 2.8 });
  const rig = newRig(K, { headS: 11, bodyH: 10, legH: 7, bodyW: 10, bodyD: 7, armW: 4, scale: 1.12 });
  K.absorb(rig);
  const Hs = 11 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // round ears (one torn), a snout with a button nose, button eyes, the right one dangling
  K.box(H, 4.2, 4.2, 1.8, { a: 'fur', f: 'pad' }, M4(-4.6, Hs + 1.4, 0)); K.box(H, 4.2, 2.6, 1.8, { a: 'fur', f: 'pad' }, M4(4.6, Hs + 0.6, 0, 0, 0, -0.3));
  K.box(H, 1.4, 1.4, 1.4, 'stuff', M4(5.6, Hs + 2.2, 0)); K.box(H, 1.0, 1.0, 1.0, 'stuff', M4(6.4, Hs + 2.6, 0.6));
  K.box(H, 5, 3.4, 2.2, 'pad', M4(0, 4, h2 + 1)); K.box(H, 2, 1.4, 1, { a: 'btnS', f: 'btn' }, M4(0, 5.2, h2 + 2.4));
  K.box(H, 3, 3, 0.8, { a: 'btnS', f: 'btn' }, M4(-3, 8, h2 + 0.4));
  const dangle = grp(H, 3, 8, h2 + 0.2);
  K.box(dangle, 0.3, 3.4, 0.3, 'thread', M4(0, -1.7, 0)); K.box(dangle, 3, 3, 0.8, { a: 'btnS', f: 'btn' }, M4(0, -4.4, 0.3));
  K.box(H, 2.2, 0.9, 0.9, 'stuff', M4(3, 8, h2 + 0.3));
  for (const [x, z, rx, rz, c] of [[-2, -2, -0.4, 0.3, 0], [2.4, -3, -0.6, -0.4, 1], [-4, 2, 0.3, 0.6, 0]]) { K.box(H, 0.3, 6, 0.3, 'iron', M4(x, Hs + 1.6, z, rx, 0, rz)); K.box(H, 1, 1, 1, c ? 'pin' : 'gum', M4(x - rz * 3, Hs + 4.4, z + rx * 3)); }
  // the core in the torn belly, stuffing bursting from seams, a stitched collar
  K.gbox(T, 2.6, 3.6, 1.2, core, M4(0, 5.6, 3.3));
  for (const y of [4.4, 6.8]) K.box(T, 4, 0.4, 0.4, 'thread', M4(0, y, 3.9));
  for (const [x, y, z, s] of [[-4, 9, 3.4, 1.4], [5, 3, 1, 1.2], [-5.2, 2, -2, 1.6], [2, 10, -3.6, 1.2]]) K.box(T, s, s, s, 'stuff', M4(x, y, z));
  K.box(T, 11, 1.6, 8, 'patch', M4(0, 10, 0));
  for (const leg of [rig.legR, rig.legL]) K.box(leg, 4.6, 2, 5.6, 'pad', M4(0, -6.2, 0.6));
  // quilted pincushion shield on the left arm, bristling with pins
  const sh = grp(rig.handL, 2.4, -2, 3.2);
  K.box(sh, 13, 9, 2.4, 'quilt', M4(0, 0, 0)); K.box(sh, 9, 13, 2.4, 'quilt', M4(0, 0, 0)); K.box(sh, 11, 11, 2.0, 'quilt', M4(0, 0, 0, 0, 0, 0.785));
  K.box(sh, 3.6, 3.6, 0.8, { a: 'btnS', f: 'btn' }, M4(0, 0, 1.4));
  for (const [x, y] of [[-3.6, 3], [3.4, 3.6], [-4, -2.6], [2.6, -3.8], [0.4, 5], [5, -0.4]]) { K.box(sh, 0.3, 0.3, 3.4, 'iron', M4(x, y, 2.6)); K.box(sh, 1, 1, 1, 'pin', M4(x, y, 4.4)); }
  rig.extras.shield = sh;
  const mat = K.finish(rig, { emit: 2.6, rim: 0x5ae8ff, rimStrength: 0.4, fill: 0.18 });
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    dangle.rotation.z = Math.sin(t * 2.6) * 0.5 + (o.vel?.x ?? 0) * 0.05; dangle.rotation.x = Math.sin(t * 1.9) * 0.3 + mvOf(o) * 0.4;
    H.rotation.z = Math.sin(t * 0.8) * 0.18;
    const guard = o.guarding ? 1 : 0;
    mat.userData.emitMask.value = 2.4 + guard * 1.2 + Math.sin(t * 5) * 0.3 * guard;
    if (Math.random() < (0.8 + guard * 4) * dt * bud) { T.localToWorld(v1.set(rnd(1) * PX, 5.6 * PX, 4 * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(0.3), 0.5, rnd(0.3), 0.6, 0.4, 1.6, 2.0, 0.08, -0.2, 1, 0.1, 0); }
  };
  return rig;
}

// =====================================================================
// GRADE 3 DISASTER ASH — a squat spirit of charred rock with magma
// cracks, a little smoking volcano for a head and one burning eye
// =====================================================================
function ashspirit(K) {
  const P = { base: 0x2c2624, dark: 0x181412, deep: 0x0c0a08, glow: 0xff7a1a, eye: 0xffd04a, sclera: 0xf0d8a0, gum: 0x6a1a0a };
  const S = K.S, L1 = 0xffa030, L2 = 0xff5a10;
  if (K.paint) {
    for (const k of ['head', 'body', 'armR', 'armL', 'legR', 'legL']) { flesh(S, k, P.base, P.dark, { mat: 'leather', blotch: 9, light: 0x4a403a, shade: true }); }
    for (const [x, y, n, a, b] of [[2, 8, 7, 0, 7], [19, 8, 8, 16, 23], [27, 9, 7, 24, 31], [18, 20, 9, 16, 19], [30, 20, 10, 28, 31], [34, 21, 9, 32, 39], [22, 26, 6, 20, 27]]) crack(S, x, y, n, a, b, L1, L2);
    for (const k of ['armR', 'armL', 'legR', 'legL']) { const [x, y] = face(k).ring; crack(S, x + 4, y + 2, 9, x + 4, x + 7, L1, L2); }
    // a burning slit of a mouth
    S.mat = 'glow'; S.rect(10, 14, 4, 1, L2, 0.05); S.px(9, 13, L1); S.px(14, 13, L1);
  }
  baseSwatches(K, P);
  K.solid('rock', P.base, 0.2, 'leather', (S2, x, y) => { S2.px(x + 1, y + 1, 0x403a34); S2.px(x + 3, y + 2, 0x141010); });
  K.solid('rockD', P.dark, 0.2, 'leather'); K.solid('ashG', 0x6a6460, 0.2, 'leather');
  const lava = glowMat(0xff6a1a, { base: 2.4, amp: 1.0, speed: 3.6 });
  const rig = newRig(K, { headS: 9, bodyH: 8, legH: 5, bodyW: 9, bodyD: 7, armW: 3, scale: 1.05 });
  rig.hunch = 0.12;
  K.absorb(rig);
  const Hs = 9 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // one huge eye under a heavy rock brow
  const eyeG = grp(H, 0, 6.4, h2);
  K.box(eyeG, 4.8, 4.2, 1.8, { a: 'scl', f: 'eye' }, M4(0, 0, 0.4));
  K.box(H, 8.4, 1.6, 2.2, 'rockD', M4(0, 9.0, h2 + 0.4, -0.2));
  // the volcano: stepped cone, crater of lava (bubbles), ash rim
  const cone = grp(H, 0, Hs, 0);
  K.box(cone, 8.6, 2.6, 8.6, 'rock', M4(0, 1.3, 0)); K.box(cone, 6.6, 2.4, 6.6, 'rock', M4(0, 3.8, 0)); K.box(cone, 4.6, 2.0, 4.6, 'ashG', M4(0, 6.0, 0));
  K.gbox(cone, 3.0, 0.6, 3.0, lava, M4(0, 7.0, 0));
  for (const [x, z, l] of [[-3.4, 2.6, 4], [3, -3, 5], [3.6, 3.4, 3]]) K.gbox(cone, 0.6, l, 0.6, lava, M4(x * 0.9, 3 - l / 4, z * 0.9));
  // shoulder rocks, molten fists, hunks of crust on the back
  for (const [arm, sx] of [[rig.armR, -1], [rig.armL, 1]]) { K.box(arm, 5.2, 3.6, 5, 'rockD', M4(sx * 0.4, 1.6, 0, 0, 0, -sx * 0.3)); K.gbox(arm, 4, 3.4, 4.6, lava, M4(0, -9.6, 0)); K.box(arm, 4.4, 1.4, 5, 'rock', M4(0, -8, 0)); }
  for (const [x, y, s] of [[-2.6, 6, 3.4], [2.4, 3, 2.6], [0, 8.4, 2.2]]) K.box(T, s, s, s * 0.7, 'rock', M4(x, y, -3.6 - s * 0.3));
  K.gbox(T, 1, 5, 0.6, lava, M4(0.6, 4, 3.6));
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 5, 2.2, 5.8, 'rockD', M4(0, -4.2, 0.6)); K.gbox(leg, 4.4, 0.4, 5.2, lava, M4(0, -5.0, 0.6)); }
  const mat = K.finish(rig, { emit: 3.0, rim: 0xff6a2a, rimStrength: 0.22, fill: 0.08 });
  const E = eyeState();
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const w = wind(o);
    stepEye(E, dt, 0.4); eyeG.rotation.y = E.x; eyeG.rotation.x = E.y;
    cone.rotation.y = Math.sin(t * 40) * 0.02 * (1 + w * 4); cone.scale.y = 1 + w * 0.15 + Math.sin(t * 3) * 0.03;
    H.rotation.z = Math.sin(t * 37) * 0.04 * w;
    if (Math.random() < (3 + w * 8) * dt * bud) { cone.localToWorld(v1.set(rnd(1) * PX, 7.6 * PX, rnd(1) * PX)); Pt.smoke.emit(v1.x, v1.y, v1.z, rnd(0.2), 1.0 + w, rnd(0.2), 1.6, 0.06, 0.05, 0.05, 0.35, -0.3, 0.8, 2.6, 0); }
    if (Math.random() < (4 + w * 30) * dt * bud) { cone.localToWorld(v1.set(rnd(1) * PX, 7.6 * PX, rnd(1) * PX)); Pt.glow.emit(v1.x, v1.y, v1.z, rnd(1.2), 2.5 + Math.random() * 2 + w * 2, rnd(1.2), 0.9, 2.6, 1.0, 0.2, 0.07, 6, 0.5, 0.2, 1); }
    if (Math.random() < 1.5 * dt * bud) { rig.armR.localToWorld(v1.set(0, -11.5 * PX, 0)); drip(Pt, v1.x, v1.y, v1.z, 2.4, 0.8, 0.1, 0.08); }
    mat.userData.emitMask.value = 2.6 + w * 2 + Math.sin(t * 6) * 0.3;
  };
  return rig;
}

// =====================================================================
// GRADE 1 FESTER BODHISATTVA — a rotting bronze idol on a withered lotus:
// six arms in mudras, a halo of spikes, a third eye that opens to bless
// =====================================================================
function healer(K) {
  const P = { base: 0x9a8448, dark: 0x5a4a24, deep: 0x2a2010, glow: 0x7aff8a, eye: 0x7aff8a, sclera: 0xe8e0b0, gum: 0x5a2a3a };
  const S = K.S, VER = 0x4a9a7a, ROT = 0x4a2a3a, ROBE = 0xa8642a;
  if (K.paint) {
    flesh(S, 'head', P.base, P.dark, { mat: 'leather', top: 0x2a1a10, blotch: 5, light: 0xc0a860 });
    S.mat = 'leather'; for (let i = 0; i < 8; i++) S.px(Math.floor(S.r() * 32), Math.floor(S.r() * 16), VER);
    S.mat = 'hair'; S.rect(8, 0, 8, 8, 0x2a1a10, 0.15); S.rect(0, 8, 32, 2, 0x2a1a10, 0.15); for (let x = 0; x < 32; x += 2) S.px(x, 9, 0x4a3420);
    // serene shut eyes, a long nose, a faint smile; rot eating one cheek
    S.mat = 'leather'; S.fineRect(9, 12, 2, 0.5, P.deep, 'leather'); S.fineRect(13, 12, 2, 0.5, P.deep, 'leather'); S.fineRect(11.75, 12, 0.5, 2, P.dark, 'leather');
    S.fineRect(10.5, 14.5, 3, 0.5, 0x3a1a10, 'leather'); S.fineRect(10, 14, 0.5, 0.5, 0x3a1a10, 'leather'); S.fineRect(13.5, 14, 0.5, 0.5, 0x3a1a10, 'leather');
    S.mat = 'flesh'; S.rect(13, 13, 3, 3, ROT, 0.2); S.px(14, 14, 0x1a0a10);
    flesh(S, 'body', P.base, P.dark, { mat: 'leather', blotch: 5, light: 0xc0a860 });
    S.mat = 'cloth'; { const [fx, fy] = face('body').front; for (let r = 0; r < 12; r++) S.rect(fx + Math.max(0, 5 - r), fy + r, 3, 1, ROBE, 0.1); }
    { const [x, y, w] = face('body').ring; S.rect(x, y + 9, w, 3, ROBE, 0.1); }
    S.mat = 'flesh'; S.rect(30, 22, 3, 4, ROT, 0.2); S.rect(19, 25, 2, 3, ROT, 0.2);
    S.mat = 'leather'; for (let i = 0; i < 6; i++) S.px(16 + Math.floor(S.r() * 24), 20 + Math.floor(S.r() * 12), VER);
    for (const k of ['armR', 'armL']) { flesh(S, k, P.base, P.dark, { mat: 'leather', blotch: 5, light: 0xc0a860 }); S.mat = 'leather'; const [x, y, w] = face(k).ring; for (let i = 0; i < 3; i++) S.px(x + Math.floor(S.r() * w), y + Math.floor(S.r() * 12), VER); }
  }
  baseSwatches(K, P);
  K.solid('bronze', P.base, 0.14, 'leather', (S2, x, y) => { S2.fine(x + 1, y + 2, VER, 'leather'); });
  K.solid('bronzeD', P.dark, 0.14, 'leather'); K.solid('ver', VER, 0.16, 'leather'); K.solid('rot', ROT, 0.2, 'flesh');
  K.solid('robe', ROBE, 0.1, 'cloth', (S2, x, y) => { S2.fineRect(x, y + 3, 4, 0.5, 0x6a3a14, 'cloth'); });
  K.solid('petal', 0xc8a0a8, 0.12, 'skin', (S2, x, y) => { S2.fineRect(x + 1.75, y, 0.5, 4, 0x8a5a6a, 'skin'); S2.fine(x + 0.5, y + 3, 0x5a3a2a, 'skin'); });
  K.solid('petalD', 0x7a5a5a, 0.14, 'skin'); K.solid('bead', 0x3a1a10, 0.08, 'metal'); K.solid('hairC', 0x2a1a10, 0.15, 'hair');
  const halo = glowMat(0x6aff8a, { base: 1.8, amp: 0.8, speed: 2 });
  const rig = newRig(K, { headS: 9, bodyH: 12, legH: 5, bodyW: 9, bodyD: 6, armW: 3, scale: 1.18 });
  rig.float = 0.7;
  K.absorb(rig, ['body', 'head', 'armR', 'armL']);
  rig.legL.visible = rig.legR.visible = false;
  const Hs = 9 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // long earlobes, a topknot of curls, the third eye (its lid lifts)
  for (const sx of [-1, 1]) { K.box(H, 1.2, 6, 1.6, 'bronze', M4(sx * (h2 + 0.5), 3, 0.4)); K.box(H, 1.6, 1.6, 1.8, 'bronzeD', M4(sx * (h2 + 0.5), -0.2, 0.4)); }
  K.box(H, 5, 3, 5, 'hairC', M4(0, Hs + 1.4, -0.6)); K.box(H, 3, 2, 3, 'hairC', M4(0, Hs + 3.6, -0.6)); K.gbox(H, 1.2, 1.2, 1.2, halo, M4(0, Hs + 5, -0.6));
  K.eye(H, 1.5, M4(0, 7.8, h2), 'eye', 0.4);
  const lid = grp(H, 0, 7.8, h2 + 0.65);
  K.box(lid, 1.9, 1.9, 0.4, 'bronzeD', M4(0, 0, 0));
  K.box(H, 2.6, 2.2, 0.8, 'rot', M4(2.6, 3.6, h2 + 0.1));
  // the halo: a ring of spikes and glow behind the head (turns)
  const ring = grp(rig.neck, 0, Hs * 0.55, -h2 - 2.4);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; K.box(ring, 1.2, i % 2 ? 3 : 5, 0.8, i % 2 ? 'bronzeD' : 'bronze', M4(Math.sin(a) * 9, Math.cos(a) * 9, 0, 0, 0, -a)); K.gbox(ring, 2.4, 0.6, 0.5, halo, M4(Math.sin(a + 0.26) * 8.4, Math.cos(a + 0.26) * 8.4, 0.2, 0, 0, -a - 0.26 - HP)); }
  // robe sash, a necklace of beads, four extra arms in mudras (gesture)
  K.box(T, 9.6, 2, 6.6, 'robe', M4(0, 11, 0)); for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.32; K.box(T, 1.2, 1.2, 1.2, 'bead', M4(Math.sin(a) * 4, 10.4 - Math.cos(a) * 3.4, 3.4)); }
  const xa = [];
  for (const sx of [-1, 1]) for (const [y, lift] of [[9, 1.1], [5.4, 0.55]]) {
    const g = grp(T, sx * 4.4, y, -1.6);
    const M = M4(0, 0, 0, -0.3, 0, -sx * lift);
    K.box(g, 2.4, 7, 2.4, 'bronze', M.clone().multiply(M4(0, 3.5, 0)));
    const M2 = M.clone().multiply(M4(0, 7, 0, -0.9, 0, sx * 0.4));
    K.box(g, 2.2, 6, 2.2, 'bronze', M2.clone().multiply(M4(0, 3, 0))); K.box(g, 2.6, 2.6, 1.2, 'bronzeD', M2.clone().multiply(M4(0, 6.6, 0)));
    xa.push({ g, sx, y });
  }
  for (const arm of [rig.armR, rig.armL]) K.box(arm, 3.6, 1.2, 4.2, 'bronzeD', M4(0, -9, 0));
  // prayer beads looped over the right hand
  for (let i = 0; i < 6; i++) K.box(rig.handR, 1, 1, 1, 'bead', M4(Math.sin(i) * 1.6, -1.6 - i * 0.9, 1.6 + Math.cos(i) * 0.6));
  // withered lotus seat (petals breathe)
  const lotus = grp(rig.hips, 0, -1, 0);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; K.box(lotus, 4.4, 1, 6.4, i % 2 ? 'petalD' : 'petal', M4(Math.sin(a) * 6.4, 0, Math.cos(a) * 6.4, -0.45, a, 0)); }
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.5; K.box(lotus, 3.4, 1, 4.6, 'petal', M4(Math.sin(a) * 3.6, 1.6, Math.cos(a) * 3.6, -0.9, a, 0)); }
  K.box(lotus, 8, 3, 8, 'robe', M4(0, 1.6, 0)); K.box(lotus, 0.8, 4, 0.8, 'rot', M4(2, -3, 1.4)); K.box(lotus, 0.6, 3, 0.6, 'rot', M4(-1.6, -2.4, -2));
  const mat = K.finish(rig, { emit: 2.6, rim: 0xffd27a, rimStrength: 0.3, rough: 0.45 });
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    const w = wind(o);
    ring.rotation.z += dt * (0.4 + w * 4);
    for (const a of xa) { a.g.rotation.z = a.sx * (Math.sin(t * 1.3 + a.y) * 0.15 - w * 0.6); a.g.rotation.x = Math.sin(t * 1.1 + a.y + a.sx) * 0.2 - w * 0.4; }
    lid.position.y = damp(lid.position.y, (7.8 + w * 1.9) * PX, 10, dt);
    lotus.rotation.y += dt * 0.3; const k = 1 + Math.sin(t * 1.4) * 0.05 + w * 0.15; lotus.scale.set(k, 1, k);
    if (Math.random() < (2 + w * 25) * dt * bud) { const a = Math.random() * 6.283, r = w ? 3 : 0.8; Pt.glow.emit(o.pos.x + Math.cos(a) * r, o.pos.y + 0.6 + Math.random() * 2, o.pos.z + Math.sin(a) * r, -Math.cos(a) * w, 0.5, -Math.sin(a) * w, 1.0, 0.5, 1.8, 0.6, 0.09, -0.3, 1, 0.1, 0); }
    if (Math.random() < 0.8 * dt * bud) { lotus.localToWorld(v1.set(2 * PX, -5 * PX, 1.4 * PX)); drip(Pt, v1.x, v1.y, v1.z, 0.5, 0.9, 0.3, 0.06); }
    mat.userData.emitMask.value = 2.4 + w * 2.2;
  };
  return rig;
}

// =====================================================================
// GRADE 2 SHADOW STALKER — a tall, starved shape of shadow: a white grin,
// a cluster of pin-prick eyes, arms down to its ankles, tendrils of dark
// =====================================================================
function shadow(K) {
  const P = { base: 0x16121c, dark: 0x0a080e, deep: 0x040306, glow: 0xc89aff, eye: 0xf4f0ff, sclera: 0xf4f0ff };
  const S = K.S;
  if (K.paint) {
    for (const k of ['head', 'body', 'armR', 'armL', 'legR', 'legL']) { S.mat = 'hair'; paintBox(S, k, P.base, 0.14); mottle(S, k, P.dark, 10, 0x241c30); }
    // a grin far too wide, crowded with needle teeth; six little white eyes
    S.mat = 'eye'; S.fineRect(8.5, 13, 7, 1.5, 0xf4f0ff, 'eye'); S.fineRect(8, 12.5, 0.5, 0.5, 0xf4f0ff); S.fineRect(15.5, 12.5, 0.5, 0.5, 0xf4f0ff);
    for (let x = 8.75; x < 15.5; x += 0.75) S.fineRect(x, 13.5, 0.25, 0.5, 0x0a080e);
    for (const [x, y] of [[9.5, 9.5], [11, 10.5], [13, 9.5], [14.5, 10.5], [12, 9], [10, 11.5]]) S.fineRect(x, y, 0.5, 0.5, 0xffffff);
  }
  baseSwatches(K, P);
  K.solid('shd', P.base, 0.14, 'hair', (S2, x, y) => { S2.fineRect(x + 1, y, 0.5, 4, 0x2a2236, 'hair'); S2.fineRect(x + 3, y, 0.5, 4, 0x0a080e, 'hair'); });
  K.solid('shdD', P.dark, 0.1, 'hair'); K.solid('claw', 0xe8e0f0, 0.06, 'eye');
  const wisp = glowMat(0x9a5aff, { base: 1.0, amp: 0.9, speed: 3.2, dark: 0.1 });
  const rig = newRig(K, { headS: 7, bodyH: 14, legH: 15, bodyW: 5, bodyD: 3, armW: 2, scale: 1.1 });
  rig.hunch = 0.5; rig.neck.rotation.x = -0.5;
  K.absorb(rig);
  const Hs = 7 * 1.12, h2 = Hs / 2, H = rig.head, T = rig.torso;
  // a long tapering skull; violet pin-light in the eyes
  K.box(H, 6, 4, 6, 'shd', M4(0, Hs + 1.2, -2.2, -0.5)); K.box(H, 4, 3, 4, 'shdD', M4(0, Hs + 2.4, -5.4, -0.9));
  K.gbox(H, 0.6, 0.6, 0.4, wisp, M4(-1.4, 5.6, h2 + 0.1)); K.gbox(H, 0.6, 0.6, 0.4, wisp, M4(1.6, 5.2, h2 + 0.1));
  // arms stretched to the ankles with long white claws
  for (const arm of [rig.armR, rig.armL]) {
    K.box(arm, 1.8, 12, 1.8, 'shd', M4(0, -15, 0));
    for (const x of [-0.7, 0, 0.7]) K.box(arm, 0.4, 5, 0.4, 'claw', M4(x, -23, 0.8, 0.35, 0, x * 0.25));
  }
  // tendrils of shadow off the back and shoulders (sway)
  const tend = [];
  for (const [x, y, rz, l] of [[-2, 13, 0.5, 10], [0, 12, 0, 13], [2, 13, -0.5, 9], [-1, 8, 0.3, 8], [1.4, 9, -0.3, 11]]) {
    const g = grp(T, x, y, -1.6); g.rotation.set(-0.9, 0, rz);
    K.box(g, 1.4, l, 1.0, 'shd', M4(0, l / 2, 0)); K.box(g, 0.8, l * 0.6, 0.6, 'shdD', M4(0, l + l * 0.25, -0.6, -0.3));
    tend.push({ g, rz, ph: x + y });
  }
  for (const leg of [rig.legR, rig.legL]) K.box(leg, 3, 1.6, 5, 'shdD', M4(0, -14.4, 1));
  K.finish(rig, { emit: 3.2, rim: 0x6a3aaa, rimStrength: 0.7, fill: 0.04 });
  let jerk = 0, jz = 0;
  rig.idle = (dt, o) => {
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    for (const q of tend) { q.g.rotation.x = -0.9 + Math.sin(t * 2.6 + q.ph) * 0.25; q.g.rotation.z = q.rz + Math.sin(t * 2 + q.ph) * 0.2; }
    jerk -= dt; if (jerk <= 0) { jerk = 0.6 + Math.random() * 2.4; jz = rnd(0.6); }
    H.rotation.z = damp(H.rotation.z, o.state === 'windup' ? 0 : jz, 22, dt);
    if (!o.cloaked && Math.random() < 4 * dt * bud) Pt.smoke.emit(o.pos.x + rnd(0.4), o.pos.y + 0.1, o.pos.z + rnd(0.4), rnd(0.2), 0.4, rnd(0.2), 1.0, 0.04, 0.02, 0.07, 0.35, -0.2, 1.2, 1.8, 0);
  };
  return rig;
}

const LOOKS = { swarmer, imp, spitter, tank, blob, teleporter, summoner, flyhead, transfigured, remnant, embryo, grasshopper, gravekeeper, lantern, burrower, serpent, longneck, maw, doll, ashspirit, healer, shadow };
const SEEDS = { swarmer: 411, imp: 523, spitter: 617, tank: 733, blob: 859, teleporter: 947, summoner: 1031, flyhead: 1109, transfigured: 1213, remnant: 1213, embryo: 1319, grasshopper: 1427, gravekeeper: 1531, lantern: 1637, burrower: 1741, serpent: 1847, longneck: 1951, maw: 2053, doll: 2161, ashspirit: 2267, healer: 2371, shadow: 2477 };
export const CURSE_LOOKS = Object.keys(LOOKS);
export function buildCurseLook(kind) { return LOOKS[kind](new Kit(kind, SEEDS[kind] ?? 7)); }

// ---------------------------------------------------------------- elites
// An elite gets an inverted-hull glow on its body and head, a pulsing ground
// ring and a floating affix emblem, all in the affix colour (one shared
// material per colour, emblem geometry cached per affix).
const ELITE = { mats: new Map(), aura: new Map(), emblem: new Map(), basic: new Map() };
const AURA_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
function shellMat(color) {
  if (!ELITE.mats.has(color)) {
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.55, depthWrite: false });
    m.color = new THREE.Color(color).multiplyScalar(3);
    ELITE.mats.set(color, m);
  }
  return ELITE.mats.get(color);
}
function auraMat(color) {
  if (!ELITE.aura.has(color)) {
    const c = new THREE.Color(color);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const d = length(uv().sub(0.5));
    const pulse = sin(U.time.mul(3.0)).mul(0.25).add(0.75);
    const ring = smoothstep(0.5, 0.44, d).mul(smoothstep(0.3, 0.43, d));
    const a = ring.mul(pulse).add(smoothstep(0.42, 0.0, d).mul(0.25));
    m.colorNode = vec3(c.r, c.g, c.b).mul(a).mul(1.4); m.opacityNode = a;
    m.polygonOffset = true; m.polygonOffsetFactor = -3; m.polygonOffsetUnits = -3;
    ELITE.aura.set(color, m);
  }
  return ELITE.aura.get(color);
}
function emblemGeo(affix) {
  if (ELITE.emblem.has(affix)) return ELITE.emblem.get(affix);
  const L = [];
  const b = (w, h, d, M) => { const g = new THREE.BoxGeometry(w * PX, h * PX, d * PX); g.applyMatrix4(M); L.push(g); };
  switch (affix) {
    case 'swift':      // twin chevrons
      for (const y of [0, 2.2]) for (const sx of [-1, 1]) b(0.8, 2.8, 0.8, M4(sx * 0.9, y, 0, 0, 0, sx * 0.8));
      break;
    case 'armored':    // a gold crown
      for (let i = 0; i < 4; i++) { const a = i * HP; b(3.6, 0.9, 0.7, M4(Math.sin(a) * 1.8, 0, Math.cos(a) * 1.8, 0, a, 0)); b(0.8, 1.8, 0.8, M4(Math.sin(a + 0.78) * 2.3, 1.2, Math.cos(a + 0.78) * 2.3)); }
      break;
    case 'vampiric':   // blood drop
      b(1.0, 1.0, 1.0, M4(0, 2.6, 0)); b(1.8, 1.4, 1.8, M4(0, 1.4, 0)); b(2.6, 1.6, 2.6, M4(0, 0, 0)); b(1.8, 0.8, 1.8, M4(0, -1.1, 0));
      break;
    case 'explosive':  // spiky burst
      for (let i = 0; i < 4; i++) b(0.7, 4.2, 0.7, M4(0, 0, 0, 0, i * 0.8, i * 0.785)); b(1.6, 1.6, 1.6, M4(0, 0, 0, 0.6, 0.6, 0));
      break;
    default:           // shadow: a halo ring
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; b(1.6, 0.5, 0.6, M4(Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2, 0, a, 0)); }
  }
  const g = mergeGeometries(L, false); ELITE.emblem.set(affix, g); return g;
}
export function decorateElite(rig, color, affix, radius = 0.5) {
  const mat = shellMat(color);
  const core = rig.meshes.filter((m) => m.userData.core);
  for (const m of core.length ? core : [...rig.meshes]) {
    const shell = new THREE.Mesh(m.geometry, mat);
    shell.scale.setScalar(1.07); shell.castShadow = false; shell.userData.shell = true;
    shell.position.copy(m.position); shell.rotation.copy(m.rotation);
    m.parent.add(shell);
  }
  const s = rig.spec.scale ?? 1;
  const aura = new THREE.Mesh(AURA_GEO, auraMat(color)); aura.scale.set(radius * 3.4 / s, 1, radius * 3.4 / s); aura.position.y = 0.05 / s; aura.renderOrder = 3; aura.userData.shell = true;
  rig.root.add(aura);
  if (!ELITE.basic.has(color)) { const m = new THREE.MeshBasicNodeMaterial(); m.color = new THREE.Color(color).multiplyScalar(2.6); ELITE.basic.set(color, m); }
  const em = new THREE.Mesh(emblemGeo(affix), ELITE.basic.get(color));
  em.castShadow = false; em.userData.shell = true;
  const topY = (rig.dims.headS * 1.12 + 7) * PX; em.scale.setScalar(1.3);
  em.position.y = topY; rig.head.add(em);
  const c = new THREE.Color(color);
  const base = rig.idle;
  rig.idle = (dt, o) => {
    base?.(dt, o);
    const t = rig.t, Pt = o.game.particles, bud = Pt.budget ?? 1;
    em.rotation.y += dt * 2.2; em.position.y = topY + Math.sin(t * 2.4) * 0.8 * PX;
    if (Math.random() < 2.5 * dt * bud) { em.getWorldPosition(v1); Pt.glow.emit(v1.x + rnd(0.1), v1.y, v1.z + rnd(0.1), rnd(0.3), 0.5, rnd(0.3), 0.6, c.r * 2, c.g * 2, c.b * 2, 0.08, -0.4, 1, 0.1, 0); }
    if (affix === 'swift' && Math.hypot(o.vel.x, o.vel.z) > 2 && Math.random() < 10 * dt * bud) Pt.glow.emit(o.pos.x + rnd(0.3), o.pos.y + Math.random() * o.height, o.pos.z + rnd(0.3), -o.vel.x * 0.2, 0, -o.vel.z * 0.2, 0.35, c.r * 1.6, c.g * 1.6, c.b * 1.6, 0.12, 0, 2, 0.02, 0);
    if (affix === 'vampiric' && Math.random() < 2 * dt * bud) drip(Pt, o.pos.x + rnd(o.radius), o.pos.y + o.height * (0.5 + Math.random() * 0.4), o.pos.z + rnd(o.radius), 1.6, 0.1, 0.2, 0.08);
    if (affix === 'shadow' && Math.random() < 4 * dt * bud) Pt.smoke.emit(o.pos.x + rnd(o.radius), o.pos.y + 0.1, o.pos.z + rnd(o.radius), 0, 0.5, 0, 1.2, 0.05, 0.02, 0.09, 0.4, -0.3, 1.2, 2, 0);
  };
}
