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

const LOOKS = { swarmer, imp, spitter, tank, blob, teleporter, summoner };
const SEEDS = { swarmer: 411, imp: 523, spitter: 617, tank: 733, blob: 859, teleporter: 947, summoner: 1031 };
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
