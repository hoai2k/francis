// Appearance of the Special Grade bosses (Jogo, Hanami, Mahito; the others
// live with their moves in entities/bosses/<id>.js and share these helpers): HD painted skins, merged box detail
// (volcano crater, branches, robes, extra arms), animated lava / rim-glow node
// materials, a boss-sized ground shadow + aura, and per-frame idle VFX.
// Each build returns a Rig with two optional hooks the Boss calls:
//   rig.idle(dt, boss)    every frame while alive (sway, pulses, particles)
//   rig.onPhase(n, boss)  when the boss enters a new phase
import * as THREE from 'three/webgpu';
import { positionLocal, floor, hash, vec3, float, uniform, mix, sin, normalView, normalWorld, positionViewDirection, pow, abs, dot, uv, length, smoothstep, mx_noise_float } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Skin, Rig, makeCharMaterial, skinBox, PX } from './character.js';
import { U } from '../gfx/materials.js';

export const HS = 1.12;                         // head mesh scale (headS 8)
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
export const rate = (perSec, dt, budget = 1) => Math.floor(perSec * dt * budget + Math.random());
export const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;

// ---------------------------------------------------------------- materials
// Solid colour with skin-pixel-sized value noise so plain boxes read like the HD skins.
export function pixMat(hex, o = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: o.rough ?? 0.85, metalness: o.metal ?? 0 });
  const c = new THREE.Color(hex);
  const cell = floor(positionLocal.div(PX * (o.cell ?? 1)));
  const n = hash(cell.x.add(cell.y.mul(57.0)).add(cell.z.mul(131.0)));
  let col = vec3(c.r, c.g, c.b).mul(n.sub(0.5).mul(o.noise ?? 0.16).add(1));
  if (o.streak) {   // vertical grain (bark, hair)
    const s = hash(cell.x.mul(3.0).add(cell.z.mul(31.0)));
    col = col.mul(s.sub(0.5).mul(o.streak).add(1));
  }
  m.colorNode = col;
  m.emissiveNode = col.mul((o.emissive ?? 0) + (o.fill ?? 0.12));   // same ambient fill as the skins
  if (o.rim) addRim(m, o.rim, o.rimStrength ?? 0.8);
  return m;
}
// Fresnel rim light added to a material's emissive (boss aura silhouette).
export function addRim(m, color, strength = 1, power = 2.6) {
  const c = new THREE.Color(color);
  // silhouette only: tops and bottoms of the boxes stay unlit so heads don't flare
  const f = pow(float(1).sub(abs(dot(normalView, positionViewDirection))), power).mul(float(1).sub(abs(normalWorld.y)));
  const u = uniform(strength);
  const rim = vec3(c.r, c.g, c.b).mul(f).mul(u);
  m.emissiveNode = m.emissiveNode ? m.emissiveNode.add(rim) : rim;
  m.userData.rim = u;
  return u;
}
// Molten lava: blocky animated noise between crust, red and yellow-white.
export function lavaMat(strength = 4) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.55 });
  const amp = uniform(strength);
  const p = floor(positionLocal.div(PX * 0.5)).mul(0.5);
  const t = U.time;
  const n = mx_noise_float(vec3(p.x.mul(0.45), p.y.mul(0.45).sub(t.mul(0.9)), p.z.mul(0.45).add(t.mul(0.35)))).mul(0.5).add(0.5);
  const hot = mix(vec3(1.0, 0.16, 0.02), vec3(1.0, 0.78, 0.25), smoothstep(0.45, 0.85, n));
  const col = mix(vec3(0.12, 0.03, 0.01), hot, smoothstep(0.18, 0.4, n));
  m.colorNode = col.mul(0.6);
  m.emissiveNode = col.mul(amp).mul(sin(t.mul(2.7).add(p.y.mul(0.8))).mul(0.15).add(1));
  m.userData.amp = amp;
  return m;
}
// Soft round ground decal: dark contact shadow, or an additive pulsing aura ring.
export function groundFX(rig, color, radius) {
  const s = rig.spec.scale;
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const d = length(uv().sub(0.5));
  const sh = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  sh.colorNode = vec3(0, 0, 0); sh.opacityNode = smoothstep(0.5, 0.08, d).mul(0.55);
  sh.polygonOffset = true; sh.polygonOffsetFactor = -2; sh.polygonOffsetUnits = -2;
  const shadow = new THREE.Mesh(geo, sh); shadow.scale.set(radius * 2.2 / s, 1, radius * 2.2 / s); shadow.position.y = 0.035 / s; shadow.renderOrder = 2;
  const c = new THREE.Color(color);
  const au = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const amp = uniform(1);
  const pulse = sin(U.time.mul(2.2)).mul(0.25).add(0.75);
  const ring = smoothstep(0.5, 0.44, d).mul(smoothstep(0.3, 0.44, d));
  const inner = smoothstep(0.42, 0.0, d).mul(0.22);
  const a = ring.mul(pulse).add(inner).mul(amp);
  au.colorNode = vec3(c.r, c.g, c.b).mul(a); au.opacityNode = a;
  au.polygonOffset = true; au.polygonOffsetFactor = -3; au.polygonOffsetUnits = -3;
  const aura = new THREE.Mesh(geo, au); aura.scale.set(radius * 3 / s, 1, radius * 3 / s); aura.position.y = 0.045 / s; aura.renderOrder = 3;
  rig.root.add(shadow, aura);
  return { shadow, aura, amp };
}

// ---------------------------------------------------------------- merged parts
// Collects boxes per (group, material) and merges them into one mesh each, so
// a detailed boss stays at a few dozen draw calls.
export const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(_p.set(x * PX, y * PX, z * PX), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(s, s, s));
export class Parts {
  constructor(rig) { this.rig = rig; this.bins = new Map(); }
  add(group, geo, mat, M) {
    if (M) geo.applyMatrix4(M);
    if (!this.bins.has(group)) this.bins.set(group, new Map());
    const b = this.bins.get(group); if (!b.has(mat)) b.set(mat, []); b.get(mat).push(geo);
  }
  // box in skin pixels; base: true anchors the bottom face at the origin (grows +y)
  box(group, w, h, d, mat, M = null, base = false) {
    const g = new THREE.BoxGeometry(w * PX, h * PX, d * PX); if (base) g.translate(0, h * PX / 2, 0);
    this.add(group, g, mat, M); return g;
  }
  flush() {
    for (const [group, b] of this.bins) for (const [mat, list] of b) {
      const geo = list.length === 1 ? list[0] : mergeGeometries(list, false);
      group.add(this.rig.mesh(geo, mat));
    }
    this.bins.clear();
  }
}
// group with a transform in skin pixels
export function grp(parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const g = new THREE.Group(); g.position.set(x * PX, y * PX, z * PX); g.rotation.set(rx, ry, rz); parent.add(g); return g; }

// ---------------------------------------------------------------- skin helpers
export const BOX = { head: [0, 0, 8, 8, 8], hat: [32, 0, 8, 8, 8], body: [16, 16, 8, 12, 4], jacket: [16, 32, 8, 12, 4],
  armR: [40, 16, 4, 12, 4], armRo: [40, 32, 4, 12, 4], armL: [32, 48, 4, 12, 4], armLo: [48, 48, 4, 12, 4],
  legR: [0, 16, 4, 12, 4], legRo: [0, 32, 4, 12, 4], legL: [16, 48, 4, 12, 4], legLo: [0, 48, 4, 12, 4] };
export const face = (k) => { const [u, v, w, h, d] = BOX[k]; return { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d + w + d, v + d, w, h], ring: [u, v + d, 2 * (w + d), h] }; };
// horizontal band around a box's four sides, rows r..r+h counted from the top
export function ring(S, k, r, h, c, noise = 0.08) { const [x, y, w] = face(k).ring; S.rect(x, y + r, w, h, c, noise); }
export function paintBox(S, k, c, noise) { const [u, v, w, h, d] = BOX[k]; S.box(u, v, w, h, d, c, noise); }
export function clear(S, x, y, w = 1, h = 1) { S.ctx.clearRect(x, y, w, h); }
// a glowing crack: random walk downward inside [x0,x1]
export function crack(S, x, y, len, x0, x1, c1, c2) {
  const m = S.mat; S.mat = 'glow';
  for (let i = 0; i < len; i++) {
    S.px(x, y, i % 3 === 1 ? c2 : c1);
    const r = S.r(); if (r < 0.3 && x > x0) x--; else if (r > 0.7 && x < x1) x++;
    y++;
  }
  S.mat = m;
}
// a stitched seam (sub-pixel line with cross ticks)
export function stitchH(S, x, y, w, c, tick) { S.fineRect(x, y, w, 0.5, c, 'skin'); for (let i = 0.5; i < w; i += 1) S.fineRect(x + i, y - 0.5, 0.5, 0.5, tick ?? c, 'skin'); }
export function stitchV(S, x, y, h, c, tick) { S.fineRect(x, y, 0.5, h, c, 'skin'); for (let i = 0.5; i < h; i += 1) S.fineRect(x + 0.5, y + i, 0.5, 0.5, tick ?? c, 'skin'); }

export function finishMaterial(S, o) {
  const m = makeCharMaterial(S.texture(), { emitStrength: o.emit, fill: o.fill ?? 0.12, roughness: o.rough ?? 0.8 });
  m.alphaTest = 0.5;
  if (o.rim) addRim(m, o.rim, o.rimStrength ?? 0.6, o.rimPower ?? 2.6);
  return m;
}

// =====================================================================
// JOGO — Disaster Flames
// =====================================================================
export function buildJogo() {
  const S = new Skin(501);
  const SK = 0xdad3c5, SK2 = 0xbdb4a4, SK3 = 0x8e8576, ROBE = 0x2e2a28, ROBE2 = 0x1e1b1a, TRIM = 0x6a625a, SASH = 0x8a2a18, SASH2 = 0x541a10;
  const L1 = 0xffb84a, L2 = 0xff7a1e;      // r = 255 → emissive on the HD skin
  // head: pale skin, scorched toward the volcano top, cracks of lava
  S.mat = 'skin'; paintBox(S, 'head', SK, 0.05);
  S.rect(8, 0, 8, 8, 0x4a3c34, 0.1);
  for (const [x, y, n, a, b] of [[2, 8, 2, 0, 7], [21, 8, 2, 16, 23], [26, 8, 4, 24, 31], [29, 8, 2, 24, 31]]) crack(S, x, y, n, a, b, L1, L2);
  // the single big eye: black socket, glowing amber iris, slit pupil
  S.mat = 'skin'; S.rect(9, 9, 6, 1, SK2, 0.04);
  S.fineRect(9, 9.5, 6, 0.5, 0x6a6052, 'skin');
  S.mat = 'eye'; S.rect(9, 10, 6, 3, 0x17110e, 0.03);
  S.rect(10, 10, 4, 3, 0xffc23a, 0.03);
  for (const [x, y] of [[10, 10], [13.5, 10], [10, 12.5], [13.5, 12.5]]) S.fine(x, y, 0x17110e);
  S.fineRect(10.5, 10.5, 3, 2, 0xff9a24); S.fineRect(11, 10.5, 2, 2, 0xffd860);
  S.fineRect(11.5, 11, 1, 1, 0x120a06);
  S.fine(11, 10.5, 0xfff8e8);
  // soot under the eye and the stitched mouth
  S.mat = 'skin'; S.fineRect(9, 13, 6, 0.5, 0xa89e8e, 'skin');
  S.rect(9, 14, 6, 1, 0x2a1c16, 0.04);
  for (let x = 9; x < 15; x++) { S.fineRect(x + 0.5, 13.5, 0.5, 2, 0x0e0806, 'skin'); S.fine(x, 14, 0x6a5a4a, 'skin'); }
  S.fineRect(8, 15.5, 8, 0.5, SK2, 'skin');
  // body under the robe: skin with lava veins (shows in the V of the collar)
  S.mat = 'skin'; paintBox(S, 'body', SK, 0.05);
  for (const [x, y, n] of [[24, 21, 3], [35, 20, 8], [37, 22, 6]]) crack(S, x, y, n, 20, 39, L1, L2);
  // robe on the jacket layer: kimono with crossed collar and a red sash
  S.mat = 'cloth'; paintBox(S, 'jacket', ROBE, 0.06);
  const [jfx, jfy] = face('jacket').front;   // 20,36
  for (const [r, x, w] of [[0, 21, 6], [1, 22, 4], [2, 22, 4], [3, 23, 3], [4, 23, 2], [5, 24, 1]]) { clear(S, x, jfy + r, w); S.px(x - 1, jfy + r, TRIM); if (x + w < 28) S.px(x + w, jfy + r, TRIM); }
  for (let r = 5; r < 8; r++) S.px(24, jfy + r, TRIM);
  S.fineRect(20, 32, 8, 0.5, TRIM, 'cloth');
  for (const [x, y] of [[21, 40], [26, 42], [33, 39], [38, 41], [17, 41], [29, 40]]) S.fineRect(x, y, 0.5, 3, ROBE2, 'cloth');
  ring(S, 'jacket', 8, 3, SASH, 0.06);
  { const [x, y, w] = face('jacket').ring; S.fineRect(x, y + 8, w, 0.5, 0xb8442a, 'cloth'); S.fineRect(x, y + 10.5, w, 0.5, SASH2, 'cloth'); for (let i = 0; i < w; i += 3) S.fineRect(x + i, y + 9, 0.5, 1, SASH2, 'cloth'); }
  // arms: skin with veins, charred fists; sleeves on the overlay
  for (const [k, ko] of [['armR', 'armRo'], ['armL', 'armLo']]) {
    S.mat = 'skin'; paintBox(S, k, SK, 0.05);
    const [x, y, w] = face(k).ring;
    S.rect(x, y + 8, w, 4, SK2, 0.08); const [bx, by] = face(k).bottom; S.rect(bx, by, 4, 4, SK3, 0.08);
    for (let i = 0; i < 4; i++) crack(S, x + 1 + i * 4, y + 5 + (i % 2), 6, x + i * 4, x + i * 4 + 3, L1, L2);
    S.mat = 'cloth'; const fo = face(ko);
    S.rect(fo.top[0], fo.top[1], 4, 4, ROBE, 0.06);
    S.rect(fo.ring[0], fo.ring[1], fo.ring[2], 6, ROBE, 0.06);
    S.rect(fo.ring[0], fo.ring[1] + 6, fo.ring[2], 1, TRIM, 0.05);
  }
  // legs: dark wraps, pale shins, black tabi; knee-length robe on the overlays
  for (const [k, ko] of [['legR', 'legRo'], ['legL', 'legLo']]) {
    S.mat = 'cloth'; paintBox(S, k, 0x2a2420, 0.06);
    const [x, y, w] = face(k).ring;
    S.mat = 'skin'; S.rect(x, y + 7, w, 3, SK2, 0.05); crack(S, x + 5, y + 7, 3, x + 4, x + 7, L1, L2);
    S.mat = 'leather'; S.rect(x, y + 10, w, 2, 0x1a1512, 0.05); const [bx, by] = face(k).bottom; S.rect(bx, by, 4, 4, 0x1a1512, 0.05);
    S.mat = 'cloth'; const fo = face(ko);
    S.rect(fo.top[0], fo.top[1], 4, 4, ROBE, 0.06);
    S.rect(fo.ring[0], fo.ring[1], fo.ring[2], 6, ROBE, 0.06);
    S.rect(fo.ring[0], fo.ring[1] + 6, fo.ring[2], 1, TRIM, 0.05);
    for (let i = 1; i < 16; i += 4) S.fineRect(fo.ring[0] + i, fo.ring[1] + 1, 0.5, 5, ROBE2, 'cloth');
  }
  const m = finishMaterial(S, { emit: 2.8, fill: 0.14, rim: 0xff7a2a, rimStrength: 0.55 });
  const rig = new Rig({ material: m, scale: 2.1 });
  const P = new Parts(rig);
  // wide kimono sleeves and robe skirt (overlay regions, inflated)
  rig.armR.add(rig.mesh(skinBox(4, 12, 4, 40, 32, { inflate: 1.5, pivot: [0, -4, 0] })));
  rig.armL.add(rig.mesh(skinBox(4, 12, 4, 48, 48, { inflate: 1.5, pivot: [0, -4, 0] })));
  rig.legR.add(rig.mesh(skinBox(4, 12, 4, 0, 32, { inflate: 1.6, pivot: [0, -5.6, 0] })));
  rig.legL.add(rig.mesh(skinBox(4, 12, 4, 0, 48, { inflate: 1.6, pivot: [0, -5.6, 0] })));
  // ---- the volcano head
  const rockA = pixMat(0xdcd5c7, { noise: 0.08, rim: 0xff6a1a, rimStrength: 0.3 }), rockB = pixMat(0xcdc5b5, { noise: 0.1, rim: 0xff6a1a, rimStrength: 0.3 }), rockC = pixMat(0xa49888, { noise: 0.2, rough: 0.95 }), rockD = pixMat(0x2a221e, { noise: 0.25, rough: 0.95 });
  const lava = lavaMat(4.5), coreMat = new THREE.MeshBasicNodeMaterial();
  coreMat.colorNode = vec3(4.0, 2.2, 0.7).mul(sin(U.time.mul(5.0)).mul(0.2).add(1));
  const top = 8 * HS, H = rig.head;
  P.box(H, 8.0, 2.2, 8.0, rockA, M4(0, top + 1.1, 0));
  P.box(H, 6.6, 2.0, 6.6, rockB, M4(0, top + 3.2, 0));
  // crater rim: a hollow ring with jagged teeth
  const ry = top + 5.1;
  P.box(H, 5.4, 1.8, 1.2, rockC, M4(0, ry, 2.1)); P.box(H, 5.4, 1.8, 1.2, rockC, M4(0, ry, -2.1));
  P.box(H, 1.2, 1.8, 3.0, rockC, M4(2.1, ry, 0)); P.box(H, 1.2, 1.8, 3.0, rockC, M4(-2.1, ry, 0));
  P.box(H, 3.2, 1.0, 3.2, rockD, M4(0, ry - 0.6, 0));
  for (const [x, z, h] of [[2.3, 2.3, 1.1], [-2.0, 2.4, 0.7], [-2.4, -1.6, 1.2], [1.2, -2.4, 0.8], [2.5, -0.6, 0.6], [-0.4, 2.5, 0.5]]) P.box(H, 1.0, h, 1.0, rockD, M4(x, ry + 0.9 + h / 2, z));
  // lava drips running down the cone and the sides of the head
  for (const [x, y, z, len, ry2] of [[4.05, top + 1.6, 1.2, 2.6, Math.PI / 2], [-4.05, top + 1.2, -1.6, 2.2, Math.PI / 2], [-1.8, top + 1.4, -4.05, 2.4, 0], [1.6, top + 1.8, -4.05, 2.0, 0], [2.2, top + 3.8, 3.35, 1.6, 0], [-3.35, top + 3.6, 1.4, 1.4, Math.PI / 2], [3.35, top + 3.8, -1.0, 1.8, Math.PI / 2], [4.55, top - 0.4, -2.4, 3.4, Math.PI / 2], [-1.6, top - 0.2, -4.55, 2.8, 0], [-2.6, top + 1.5, 4.05, 1.6, 0]]) {
    P.box(H, 0.7, len, 0.35, lava, M4(x, y - len / 2 + 0.6, z, 0, ry2, 0));
    P.box(H, 1.0, 0.6, 0.45, lava, M4(x, y - len + 0.6, z, 0, ry2, 0));
  }
  for (const [x, y, z, w, h, d] of [[3.7, top + 0.6, -2.6, 1.6, 1.6, 2.2], [-3.6, top + 0.8, 2.4, 1.8, 1.4, 2.0], [-2.6, top + 2.6, -2.9, 2.2, 1.4, 1.4], [2.9, top + 2.8, 1.8, 1.4, 1.2, 2.0], [0.6, top + 0.5, -4.0, 2.4, 1.2, 1.2]]) P.box(H, w, h, d, rockB, M4(x, y, z));
  const pool = rig.mesh(new THREE.BoxGeometry(3.1 * PX, 0.8 * PX, 3.1 * PX), lava); pool.position.y = (ry + 0.1) * PX; H.add(pool);
  const core = rig.mesh(new THREE.BoxGeometry(1.5 * PX, 1.2 * PX, 1.5 * PX).translate(0, 0.6 * PX, 0), coreMat); core.position.y = (ry + 0.3) * PX; H.add(core);
  core.castShadow = false;
  // ---- sash knot with hanging ends, and ember-hot fists
  const sashM = pixMat(SASH, { noise: 0.12 }), sashD = pixMat(SASH2, { noise: 0.12 });
  P.box(rig.torso, 2.6, 2.4, 1.4, sashM, M4(1.6, 3.1, 2.7));
  P.box(rig.torso, 1.2, 1.2, 1.6, sashD, M4(1.6, 3.1, 2.8));
  const tails = grp(rig.torso, 1.6, 2.2, 2.9);
  P.box(tails, 1.1, 5.2, 0.45, sashM, M4(-0.5, -2.6, 0, 0, 0, 0.08)); P.box(tails, 1.1, 4.2, 0.45, sashD, M4(0.6, -2.1, 0.1, 0, 0, -0.12));
  const hot = pixMat(0x2a1a14, { emissive: 0, noise: 0.2 });
  for (const hand of [rig.handR, rig.handL]) { P.box(hand, 4.4, 0.8, 4.4, lava, M4(0, 1.0, 0)); P.box(hand, 4.3, 1.0, 4.3, hot, M4(0, 2.2, 0)); }
  P.flush();
  const fx = groundFX(rig, 0xff5a12, 1.5);
  rig.extras.crater = core;
  let erupt = 2 + Math.random() * 2;
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    lava.userData.amp.value = 4.2 + Math.sin(t * 2.3) * 1.2 + Math.sin(t * 7.1) * 0.4;
    m.userData.emitMask.value = 2.6 + Math.sin(t * 2.3) * 0.9;
    core.scale.set(1, 1 + Math.sin(t * 4.2) * 0.35, 1);
    tails.rotation.x = 0.1 + Math.sin(t * 2.1) * 0.08 + Math.min(1, b.vel.length() / 4) * 0.4;
    tails.rotation.z = Math.sin(t * 1.6) * 0.06;
    if (b.lightH) b.lightH.intensity = 4.2 + Math.sin(t * 11) * 0.5 + Math.sin(t * 3.7) * 0.6;
    const c = core.getWorldPosition(v1);
    // smoke column and embers out of the crater
    for (let i = rate(7, dt, bud); i > 0; i--) Pt.smoke.spawn({ x: c.x + rnd(0.25), y: c.y + 0.35, z: c.z + rnd(0.25), vx: rnd(0.3), vy: 1.0 + Math.random() * 0.8, vz: rnd(0.3), life: 2.4, r: 0.12, g: 0.1, b: 0.09, size: 0.6, gravity: -0.35, drag: 0.7, sizeEnd: 3.4 });
    for (let i = rate(16, dt, bud); i > 0; i--) { const h = Math.random(); Pt.glow.spawn({ x: c.x + rnd(0.2), y: c.y + 0.3, z: c.z + rnd(0.2), vx: rnd(1.4), vy: 3 + Math.random() * 3.5, vz: rnd(1.4), life: 1 + Math.random() * 0.6, r: 3.2, g: 1.1 + h * 0.8, b: 0.25, size: 0.09 + h * 0.06, gravity: 7, drag: 0.4, sizeEnd: 0.4, shape: 'square' }); }
    erupt -= dt;
    if (erupt <= 0) {   // small eruption: a burst of embers, a puff and a flash
      erupt = 2.5 + Math.random() * 3;
      for (let i = 0; i < 24 * bud; i++) Pt.glow.spawn({ x: c.x, y: c.y + 0.3, z: c.z, vx: rnd(3), vy: 5 + Math.random() * 5, vz: rnd(3), life: 1.3, r: 3.5, g: 1.4, b: 0.3, size: 0.14, gravity: 9, drag: 0.3, sizeEnd: 0.3, shape: 'square' });
      for (let i = 0; i < 6 * bud; i++) Pt.smoke.spawn({ x: c.x + rnd(0.3), y: c.y + 0.4, z: c.z + rnd(0.3), vx: rnd(0.8), vy: 2 + Math.random(), vz: rnd(0.8), life: 2.0, r: 0.1, g: 0.08, b: 0.07, size: 0.8, gravity: -0.2, drag: 1.2, sizeEnd: 3.2 });
      g.lights.flash(c, 0xff7a2a, 6, 7, 0.35);
    }
    // heat shimmer embers rising off the body and fists
    for (let i = rate(5, dt, bud); i > 0; i--) { const hnd = Math.random() < 0.5 ? rig.handR : rig.handL; hnd.getWorldPosition(v2); Pt.glow.spawn({ x: v2.x + rnd(0.3), y: v2.y + rnd(0.2), z: v2.z + rnd(0.3), vx: rnd(0.3), vy: 0.8 + Math.random(), vz: rnd(0.3), life: 0.9, r: 3, g: 0.9, b: 0.2, size: 0.08, gravity: -0.5, drag: 1, sizeEnd: 0.3, shape: 'square' }); }
    if (Math.random() < 3 * dt) Pt.smoke.spawn({ x: b.pos.x + rnd(0.9), y: b.pos.y + 0.2, z: b.pos.z + rnd(0.9), vy: 0.5, life: 1.6, r: 0.06, g: 0.05, b: 0.05, size: 0.5, gravity: -0.2, drag: 1, sizeEnd: 2.5 });
  };
  rig.fx = fx;
  return rig;
}

// =====================================================================
// HANAMI — Disaster Plants
// =====================================================================
export function buildHanami() {
  const S = new Skin(777);
  const BARK = 0x82705a, BARK2 = 0x6a5a48, BARKD = 0x382c22, MOSS = 0x5f8a3a, MASK = 0xf1eee6, MASK2 = 0xd9d4c8, CLOTH = 0xe9e5dc, CLOTH2 = 0xd2cbbc, LINE = 0x24221f;
  const bark = (k, c = BARK) => {
    S.mat = 'flesh'; paintBox(S, k, c, 0.05);
    const f = face(k);
    for (const key of ['ring']) {
      const [x, y, w, h] = f[key];
      for (let i = 0; i < w; i += 1) if (S.r() < 0.45) { const y0 = y + Math.floor(S.r() * h * 0.5), l = 2 + Math.floor(S.r() * (h - 2)); S.fineRect(x + i + (S.r() < 0.5 ? 0 : 0.5), y0, 0.5, Math.min(l, y + h - y0), BARKD, 'flesh'); }
      for (let i = 0; i < 2; i++) if (S.r() < 0.4) { S.mat = 'cloth'; S.rect(x + Math.floor(S.r() * (w - 2)), y + Math.floor(S.r() * (h - 1)), 2, 1, MOSS, 0.1); S.mat = 'flesh'; }
    }
  };
  // head: bark crown, white mask face with eye holes and black lines
  bark('head', BARK2);
  S.mat = 'skin'; S.rect(8, 8, 8, 8, MASK, 0.03);
  S.rect(4, 8, 4, 8, MASK, 0.03); S.rect(16, 8, 4, 8, MASK, 0.03);
  S.rect(3, 10, 1, 6, MASK2, 0.03); S.rect(20, 10, 1, 6, MASK2, 0.03);
  S.rect(8, 15, 8, 1, MASK2, 0.03);
  S.fineRect(8, 8, 8, 0.5, 0xbab4a6, 'skin');
  S.mat = 'eye';
  for (const x of [9, 13]) {
    S.rect(x, 11, 2, 2, 0x0b0907, 0.02);
    S.fine(x + 0.5, 12, 0x9aff6a); S.fine(x + 1, 12, 0x5acf4a);
    S.fineRect(x + 0.75 - 0.25, 8, 0.5, 3, LINE); S.fineRect(x + 0.5, 13, 0.5, 3, LINE);
  }
  S.fineRect(8, 8, 0.5, 8, LINE); S.fineRect(15.5, 8, 0.5, 8, LINE);
  S.fineRect(11, 14.5, 2, 0.5, 0xb8b2a4, 'skin');
  // bark body with moss; the white cloth slung over the left shoulder
  bark('body'); bark('armR'); bark('armL'); bark('legR', BARK2); bark('legL', BARK2);
  for (const k of ['armR', 'armL']) { const [x, y, w] = face(k).ring; S.mat = 'flesh'; S.rect(x, y + 9, w, 3, BARKD, 0.15); for (let i = 0; i < w; i += 2) S.fineRect(x + i + 0.5, y + 9, 0.5, 3, 0x1e1812, 'flesh'); }
  for (const k of ['legR', 'legL']) { const [x, y, w] = face(k).ring; S.mat = 'flesh'; S.rect(x, y + 8, w, 4, BARKD, 0.15); for (let i = 0; i < w; i += 3) S.fineRect(x + i, y + 6, 0.5, 6, 0x1e1812, 'flesh'); }
  S.mat = 'cloth';
  { // diagonal band on the jacket layer, front: from the left shoulder (texture right) down to the right hip
    const [fx, fy] = face('jacket').front, [bx, by] = face('jacket').back;
    for (let r = 0; r < 12; r++) { const x = Math.round(fx + 6 - r * 0.6); S.rect(x, fy + r, 3, 1, r % 4 === 3 ? CLOTH2 : CLOTH, 0.04); const xb = Math.round(bx - 1 + r * 0.6); S.rect(Math.max(bx, xb), by + r, 3, 1, r % 4 === 1 ? CLOTH2 : CLOTH, 0.04); }
    const [tx, ty] = face('jacket').top; S.rect(tx + 4, ty, 4, 4, CLOTH, 0.04);
    const [lx, ly] = face('jacket').left; S.rect(lx, ly, 4, 5, CLOTH, 0.04);
  }
  { // the left arm wrapped in cloth
    const f = face('armLo'); S.rect(f.top[0], f.top[1], 4, 4, CLOTH, 0.04);
    S.rect(f.ring[0], f.ring[1], f.ring[2], 9, CLOTH, 0.05);
    for (let r = 1; r < 9; r += 2) S.fineRect(f.ring[0], f.ring[1] + r + 0.5, f.ring[2], 0.5, CLOTH2, 'cloth');
    for (let i = 0; i < 16; i++) if (S.r() < 0.6) S.px(f.ring[0] + i, f.ring[1] + 9, CLOTH2);
  }
  const m = finishMaterial(S, { emit: 2.2, fill: 0.12, rim: 0x8aff6a, rimStrength: 0.22, rimPower: 3.2 });
  const rig = new Rig({ material: m, scale: 2.35 });
  const P = new Parts(rig);
  const wood = pixMat(0x6a5038, { streak: 0.35, noise: 0.18, rough: 0.95 }), woodD = pixMat(0x4a3826, { streak: 0.3, noise: 0.18, rough: 0.95 });
  const leafA = pixMat(0x3f8a2e, { noise: 0.22, emissive: 0.08 }), leafB = pixMat(0x6ab83e, { noise: 0.2, emissive: 0.12 }), leafC = pixMat(0x24602a, { noise: 0.2 });
  const bloom = pixMat(0xffa6d0, { noise: 0.12, emissive: 0.5 }), bloomW = pixMat(0xfff0f4, { noise: 0.08, emissive: 0.35 }), pollen = pixMat(0xffe04a, { emissive: 1.4, noise: 0.05 });
  const cloth = pixMat(CLOTH, { noise: 0.06, rough: 0.95, rim: 0xb8ffa0, rimStrength: 0.3 }), cloth2 = pixMat(CLOTH2, { noise: 0.06, rough: 0.95 });
  const blossom = (group, M, s = 1) => {
    P.box(group, 1.6 * s, 0.6 * s, 0.6 * s, bloom, M); P.box(group, 0.6 * s, 0.6 * s, 1.6 * s, bloom, M);
    P.box(group, 0.6 * s, 0.8 * s, 0.6 * s, pollen, M.clone().multiply(M4(0, 0.2 * s)));
  };
  const leafCluster = (group, M, s = 1, flowers = 1) => {
    const L = [leafA, leafB, leafC];
    for (let i = 0; i < 6; i++) { const a = i * 2.4, r = i ? 1.1 * s : 0; P.box(group, (1.3 + (i % 3) * 0.4) * s, (1.0 + (i % 2) * 0.4) * s, (1.3 + ((i + 1) % 3) * 0.4) * s, L[i % 3], M.clone().multiply(M4(Math.cos(a) * r, (i % 3) * 0.5 * s, Math.sin(a) * r, 0, a, 0))); }
    for (let i = 0; i < flowers; i++) { const a = i * 2.1 + 0.6; blossom(group, M.clone().multiply(M4(Math.cos(a) * 1.3 * s, 1.0 * s, Math.sin(a) * 1.3 * s, 0.3, a, 0.2)), s * 0.9); }
  };
  // ---- branches growing out of the eye holes (each is a swaying group)
  const branches = [];
  for (const sx of [-1, 1]) {
    const br = grp(rig.head, sx * 2 * HS, 4 * HS, 4.3 * HS, 0, 0, 0);
    let M = M4(0, 0, 0, 1.25, 0, -sx * 0.25);                       // out of the socket, forward
    P.box(br, 1.5, 3.2, 1.5, woodD, M, true);
    M = M.clone().multiply(M4(0, 3.0, 0, -0.7, 0, -sx * 0.2));      // curving up
    P.box(br, 1.3, 3.6, 1.3, wood, M, true);
    const mid = M.clone().multiply(M4(0, 2.0, 0));
    P.box(br, 0.8, 2.6, 0.8, wood, mid.clone().multiply(M4(0, 0, 0, 0.2, 0, sx * 1.0)), true);    // side twig
    leafCluster(br, mid.clone().multiply(M4(0, 0, 0, 0.2, 0, sx * 1.0)).multiply(M4(0, 2.8, 0)), 0.8, 1);
    M = M.clone().multiply(M4(0, 3.4, 0, -0.5, 0, -sx * 0.35));
    P.box(br, 1.0, 3.6, 1.0, wood, M, true);
    const top = M.clone().multiply(M4(0, 3.4, 0));
    P.box(br, 0.7, 2.4, 0.7, wood, top.clone().multiply(M4(0, 0, 0, 0.5, 0, sx * 0.6)), true);
    leafCluster(br, top.clone().multiply(M4(0, 0.6, 0)), 1.25, 2);
    leafCluster(br, top.clone().multiply(M4(0, 0, 0, 0.5, 0, sx * 0.6)).multiply(M4(0, 2.4, 0)), 0.8, 1);
    branches.push({ g: br, sx, tip: top });
  }
  // ---- cloth: pad over the left shoulder and a drape hanging off it
  P.box(rig.torso, 4.4, 1.6, 5.0, cloth, M4(3.6, 12.0, 0, 0, 0, -0.3));
  P.box(rig.torso, 1.6, 1.6, 1.4, cloth2, M4(1.2, 10.6, 2.5, 0, 0, 0.6));
  const drape = [];
  let parent = grp(rig.armL, 2.6, 1.2, 0, 0, 0, -0.05);
  for (let i = 0; i < 3; i++) {
    const seg = i === 0 ? parent : grp(parent, 0, -4.2, 0);
    P.box(seg, 0.8, 4.4, 5.2 - i * 0.6, i % 2 ? cloth2 : cloth, M4(0.2, -2.1, 0));
    drape.push(seg); parent = seg;
  }
  P.box(drape[2], 1.0, 0.8, 3.6, cloth2, M4(0.3, -4.4, 0.4));
  // ---- moss, sprouts and blossoms on the bark
  P.box(rig.torso, 3, 1.2, 2, leafC, M4(-3.2, 12.2, 1.2)); P.box(rig.torso, 2, 1.4, 1.6, leafA, M4(-4.2, 12.4, -0.8));
  blossom(rig.torso, M4(-3.6, 13.1, 0.6, 0.3, 0.4, 0), 1.1);
  blossom(rig.torso, M4(-1.2, 7.5, -2.6, -1.3, 0, 0.3), 0.9);
  blossom(rig.torso, M4(1.8, 4.0, -2.6, -1.4, 0, -0.2), 0.8);
  P.box(rig.torso, 1.6, 2.2, 0.8, leafB, M4(-2.4, 9.6, -2.5, -0.3, 0, 0.4)); P.box(rig.torso, 1.2, 1.6, 0.8, leafA, M4(2.2, 6.5, -2.5, -0.3, 0, -0.5));
  P.box(rig.head, 2.6, 1.2, 2.4, leafC, M4(2.6, 8 * HS + 0.4, -2.2)); blossom(rig.head, M4(2.4, 8 * HS + 1.1, -2.0), 1.0);
  P.box(rig.head, 2.0, 1.0, 3.0, leafA, M4(-2.8, 8 * HS + 0.3, -1.2));
  const barkM = pixMat(0x8a765e, { streak: 0.3, noise: 0.14, rough: 0.95 }), moss = pixMat(0x4e7a32, { noise: 0.25 });
  for (const [x, z, y, h, w, d] of [[-2.6, 2.2, 6.5, 8, 1.0, 0.8], [1.4, 2.2, 3.5, 6, 0.9, 0.7], [-0.8, -2.2, 6, 9, 1.0, 0.8], [2.6, -2.2, 4.5, 6, 0.9, 0.7], [4.2, 0.6, 5, 7, 0.7, 1.0], [-4.2, -0.8, 6, 8, 0.7, 1.0]]) P.box(rig.torso, w, h, d, barkM, M4(x, y, z));
  P.box(rig.torso, 9.0, 1.2, 5.0, moss, M4(0, 12.2, 0)); P.box(rig.torso, 3.0, 1.0, 1.2, leafC, M4(-1.8, 11.4, 2.4)); P.box(rig.torso, 2.0, 1.4, 1.0, leafA, M4(1.2, 11.6, -2.5));
  P.box(rig.torso, 5.2, 2.0, 5.4, barkM, M4(-4.0, 11.6, 0, 0, 0, 0.22)); P.box(rig.torso, 4.4, 1.2, 4.6, woodD, M4(-4.4, 13.0, 0, 0, 0.3, 0.22));
  for (const [y, r] of [[-1, 0.12], [-5, -0.1]]) P.box(rig.armR, 4.5, 0.8, 4.5, woodD, M4(0, y, 0, 0, 0, r));
  P.box(rig.armL, 4.5, 0.8, 4.5, woodD, M4(0, -7.8, 0, 0, 0, -0.1));
  // root-wrapped forearm on the right
  P.box(rig.handR, 4.6, 1.2, 4.6, woodD, M4(0, 2.4, 0, 0, 0.3, 0)); P.box(rig.handR, 4.4, 1.0, 4.4, wood, M4(0, 0.4, 0, 0, -0.25, 0));
  for (const [x, z, l] of [[-1.4, 1.6, 2.4], [0.6, 1.8, 3.0], [1.6, 0.4, 2.0]]) P.box(rig.handR, 0.8, l, 0.8, woodD, M4(x, -1.6 - l / 2, z, 0.25, 0, x * 0.1));
  // ---- roots: claws on the feet and long roots trailing on the ground
  for (const leg of [rig.legR, rig.legL]) {
    for (const [a, l] of [[0.2, 4.4], [1.4, 3.2], [-1.1, 3.4], [2.8, 3.6]]) {
      const M = M4(Math.sin(a) * 1.6, -11.2, Math.cos(a) * 1.6, 0, a, 0);
      P.box(leg, 1.1, 1.0, l, woodD, M.clone().multiply(M4(0, 0, l / 2, 0.12, 0, 0)));
      P.box(leg, 0.7, 0.7, l * 0.7, wood, M.clone().multiply(M4(0, -0.4, l + l * 0.3, 0.18, 0.3, 0)));
    }
  }
  const trail = grp(rig.root, 0, 0, 0);
  for (const [a, l, w] of [[2.6, 9, 1.3], [3.3, 11, 1.5], [3.9, 8, 1.1], [2.1, 6, 1.0], [4.5, 6.5, 0.9], [0.9, 5, 0.9], [-0.6, 5.5, 0.9]]) {
    const M = M4(Math.sin(a) * 2.2, 0.35, Math.cos(a) * 2.2, 0, a, 0);
    P.box(trail, w, 0.8, l, woodD, M.clone().multiply(M4(0, 0, l / 2)));
    const M2 = M.clone().multiply(M4(0, -0.1, l, 0, 0.5 * Math.sign(Math.sin(a * 3)), 0));
    P.box(trail, w * 0.7, 0.6, l * 0.6, wood, M2.clone().multiply(M4(0, 0, l * 0.3)));
    if (l > 7) blossom(trail, M.clone().multiply(M4(0.8, 0.6, l * 0.6, 0, a, 0)), 0.9);
  }
  for (const [a, r] of [[0.6, 3.6], [1.9, 4.2], [-1.0, 4.0], [3.0, 5.2], [4.0, 4.6]]) { const M = M4(Math.sin(a) * r, 0.5, Math.cos(a) * r, 0, a, 0); blossom(trail, M, 1.1); P.box(trail, 1.4, 0.6, 1.4, leafA, M.clone().multiply(M4(0.8, -0.2, 0.4, 0, 0.7, 0))); }
  // ---- the left arm unveiled (phase 3): the cloth falls away, a great flower opens on the shoulder
  const unveil = grp(rig.armL, 0.6, 1.4, 0); unveil.visible = false; unveil.scale.setScalar(0.01);
  const core = glowMat(0xd8ffb0, 3.2, { pulse: 9 });
  P.box(unveil, 3.4, 3.4, 3.4, woodD, M4(1.6, 0.6, 0));
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.box(unveil, 1.6, 0.6, 3.8, i % 2 ? bloom : bloomW, M4(1.8 + Math.cos(a) * 2.2, 0.8, Math.sin(a) * 2.2, 0, -a + Math.PI / 2, 0.35)); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; P.box(unveil, 1.0, 0.5, 2.2, leafB, M4(1.8 + Math.cos(a) * 3.4, 0.2, Math.sin(a) * 3.4, 0, -a + Math.PI / 2, 0.2)); }
  P.box(unveil, 1.8, 1.8, 1.8, core, M4(2.9, 0.9, 0));
  for (const [y, z] of [[-3, 1.2], [-6, -1.0], [-9, 0.6]]) P.box(unveil, 1.0, 1.0, 1.0, bloom, M4(2.3, y, z));
  P.flush();
  const fx = groundFX(rig, 0x7aff5a, 1.6);
  const tips = branches.map((b) => b.g);
  let unveilK = 0, unveilOn = false;
  rig.extras.unveil = (on) => { unveilOn = on; if (on) unveil.visible = true; };
  rig.extras.shoulder = unveil;
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    const run = Math.min(1, b.vel.length() / 3);
    for (const br of branches) { br.g.rotation.z = Math.sin(t * 1.3 + br.sx) * 0.07; br.g.rotation.x = Math.sin(t * 1.7 + br.sx * 2) * 0.05 - run * 0.12; }
    for (let i = 0; i < drape.length; i++) { drape[i].rotation.x = (i === 0 ? 0.05 : 0.12) + Math.sin(t * 1.9 - i * 0.7) * 0.07 + run * 0.25; drape[i].rotation.z = (i === 0 ? -0.08 : 0.04) + Math.sin(t * 1.3 - i) * 0.04; }
    m.userData.emitMask.value = 2.0 + Math.sin(t * 1.5) * 0.7;
    // leaves and petals drifting down from the canopy, pollen rising around the body
    for (let i = rate(4, dt, bud); i > 0; i--) {
      const tp = tips[Math.random() < 0.5 ? 0 : 1]; tp.localToWorld(v1.set(rnd(0.15), 0.6 + Math.random() * 0.25, rnd(0.15)));
      const pink = Math.random() < 0.35, k = 0.8 + Math.random() * 0.4;
      Pt.smoke.spawn({ pos: v1, vx: rnd(0.8), vy: 0.2 + Math.random() * 0.3, vz: rnd(0.8), life: 3.4, r: pink ? 1.0 * k : 0.32 * k, g: pink ? 0.62 * k : 0.7 * k, b: pink ? 0.8 * k : 0.22 * k, size: 0.13, gravity: 0.5, drag: 0.9, sizeEnd: 0.8, shape: 'square' });
    }
    for (let i = rate(7, dt, bud); i > 0; i--) Pt.glow.spawn({ x: b.pos.x + rnd(1.6), y: b.pos.y + Math.random() * 4.5, z: b.pos.z + rnd(1.6), vx: rnd(0.2), vy: 0.3 + Math.random() * 0.4, vz: rnd(0.2), life: 1.8, r: 0.35, g: 1.0, b: 0.25, size: 0.09, gravity: -0.1, drag: 1, sizeEnd: 0.4 });
    if (b.lightH) { b.lightH.intensity = 3.6 + Math.sin(t * 1.5) * 0.6; b.lightH.offsetY = 6.8; }   // above the canopy, not on the head
    unveilK = Math.max(0, Math.min(1, unveilK + (unveilOn ? dt * 2 : -dt * 2)));
    unveil.scale.setScalar(0.01 + unveilK * 0.99); if (unveilK <= 0) unveil.visible = false;
    for (const d of drape) d.visible = unveilK < 0.5;
    if (unveilK > 0.5) for (let i = rate(10, dt, bud); i > 0; i--) { unveil.localToWorld(v1.set(2.9 * PX, 0.9 * PX, 0)); Pt.glow.spawn({ x: v1.x + rnd(0.4), y: v1.y + rnd(0.4), z: v1.z + rnd(0.4), vx: rnd(1), vy: rnd(1), vz: rnd(1), life: 0.6, r: 1.2, g: 2.6, b: 0.8, size: 0.14, drag: 2, sizeEnd: 0.1 }); }
  };
  rig.fx = fx;
  return rig;
}

// =====================================================================
// MAHITO — Idle Transfiguration
// =====================================================================
export function buildMahito() {
  const S = new Skin(313);
  const SK = 0xe2d8d0, PATCH = [0xd2c2b8, 0xeae2da, 0xc6c8cc, 0xdac8b8], ST = 0x2c1f26, STL = 0x5a4048;
  const HAIR = 0x7d92aa, HAIRD = 0x56688a, HAIRL = 0xa2b6cc;
  const CL = [0x2a2f3e, 0x3a4357, 0x4b5467, 0x23252f, 0x5a5f6e], SEAM = 0x9ea4b2;
  // patchwork skin: tone patches separated by stitches
  const patches = (k, n) => {
    const f = face(k); const [x, y, w, h] = f.ring;
    for (let i = 0; i < n; i++) {
      const pw = 2 + Math.floor(S.r() * 3), ph = 2 + Math.floor(S.r() * 4), px = x + Math.floor(S.r() * (w - pw)), py = y + Math.floor(S.r() * (h - ph));
      S.mat = 'skin'; S.rect(px, py, pw, ph, PATCH[i % PATCH.length], 0.03);
      if (S.r() < 0.5) stitchH(S, px, py, pw, ST, STL); else stitchV(S, px, py, ph, ST, STL);
    }
  };
  S.mat = 'skin'; for (const k of ['head', 'body', 'armR', 'armL']) paintBox(S, k, SK, 0.03);
  patches('body', 6); patches('armR', 3); patches('armL', 3);
  // face
  S.mat = 'skin'; S.rect(14, 12, 2, 4, PATCH[2], 0.03); S.rect(8, 8, 3, 2, PATCH[0], 0.03); S.rect(2, 9, 4, 5, PATCH[3], 0.03); S.rect(26, 9, 4, 6, PATCH[1], 0.03);
  stitchV(S, 13.75, 12.5, 3, ST, STL);
  stitchH(S, 8, 9.75, 3, ST, STL);
  stitchV(S, 1.75, 9, 6, ST, STL); stitchV(S, 25.75, 9, 6, ST, STL);
  S.mat = 'eye';
  S.px(9, 11, 0xeef0f0); S.px(10, 11, 0x9cc8e8);      // pale grey-blue eye
  S.px(13, 11, 0x2a5a9c); S.px(14, 11, 0xf0f0ee);     // dark blue eye
  S.fine(10.5, 11.5, 0x5a8ab0); S.fine(10, 11, 0xffffff); S.fine(13.5, 11.5, 0x10203a); S.fine(13, 11, 0x9ac0ff);
  S.fineRect(9, 10.5, 2, 0.5, 0x2a2a34); S.fineRect(13, 10.5, 2, 0.5, 0x2a2a34);
  // the grin: wide, curling up, teeth showing
  S.fineRect(10, 14, 4, 0.5, 0x3a1a20, 'skin'); S.fineRect(10, 14.5, 4, 0.5, 0xe8e2da, 'eye');
  S.fineRect(9.5, 13.5, 0.5, 0.5, 0x3a1a20, 'skin'); S.fineRect(14, 13.5, 0.5, 0.5, 0x3a1a20, 'skin');
  S.fine(9, 13, 0x5a3a40, 'skin'); S.fine(14.5, 13, 0x5a3a40, 'skin');
  S.fineRect(10.5, 15, 3, 0.5, 0xc8b4ac, 'skin');
  // hair: base head + the hat layer, long and ragged
  S.mat = 'hair';
  S.rect(8, 0, 8, 8, HAIR, 0.12); S.rect(24, 8, 8, 8, HAIR, 0.12); S.rect(0, 8, 4, 8, HAIR, 0.12); S.rect(20, 8, 4, 8, HAIR, 0.12);
  S.rect(4, 8, 4, 2, HAIR, 0.1); S.rect(16, 8, 4, 2, HAIR, 0.1); S.rect(8, 8, 8, 2, HAIR, 0.1);
  S.rect(40, 0, 8, 8, HAIR, 0.14); S.rect(56, 8, 8, 8, HAIR, 0.14);
  S.rect(32, 8, 6, 8, HAIR, 0.14); S.rect(38, 8, 2, 3, HAIR, 0.14);
  S.rect(50, 8, 6, 8, HAIR, 0.14); S.rect(48, 8, 2, 3, HAIR, 0.14);
  S.rect(40, 8, 8, 1, HAIR, 0.14); for (const [x, l] of [[40, 5], [41, 2], [42, 1], [44, 1], [45, 1], [46, 2], [47, 5]]) S.rect(x, 9, 1, l, x % 2 ? HAIRD : HAIR, 0.1);
  for (let x = 32; x < 64; x += 2) { if (x >= 38 && x < 50) continue; S.fineRect(x + 0.5, 8, 0.5, 8, HAIRD, 'hair'); S.fineRect(x + 1, 9, 0.5, 5, HAIRL, 'hair'); }
  S.fineRect(41.5, 9, 0.5, 2, HAIRL, 'hair'); S.fineRect(46.5, 9, 0.5, 2, HAIRD, 'hair');
  // patchwork shirt on the jacket layer, open at the collar
  S.mat = 'cloth';
  { const [x, y, w, h] = face('jacket').ring; for (let yy = 0; yy < h; yy += 4) for (let xx = 0; xx < w; xx += 3) S.rect(x + xx, y + yy, 3, 4, CL[(xx * 7 + yy * 3 + (xx >> 1)) % CL.length], 0.05);
    for (let yy = 4; yy < h; yy += 4) S.fineRect(x, y + yy, w, 0.5, SEAM, 'cloth');
    for (let xx = 3; xx < w; xx += 3) for (let yy = 0; yy < h; yy += 2) S.fineRect(x + xx, y + yy + 0.25, 0.5, 1, SEAM, 'cloth');
    const [tx, ty] = face('jacket').top; S.rect(tx, ty, 8, 4, CL[0], 0.05);
    const [fx, fy] = face('jacket').front; for (const [r, xx, ww] of [[0, 22, 4], [1, 23, 2], [2, 23, 2], [3, 24, 1]]) clear(S, xx, fy + r, ww);
    S.fineRect(fx, fy + 11.5, 8, 0.5, 0x15161c, 'cloth'); }
  for (const ko of ['armRo', 'armLo']) {
    const f = face(ko); S.rect(f.top[0], f.top[1], 4, 4, CL[1], 0.05);
    for (let r = 0; r < 9; r += 3) for (let i = 0; i < 16; i += 4) S.rect(f.ring[0] + i, f.ring[1] + r, 4, 3, CL[(i + r * 2) % CL.length], 0.05);
    S.rect(f.ring[0], f.ring[1] + 9, 16, 1, CL[3], 0.05); stitchH(S, f.ring[0], f.ring[1] + 9.5, 16, SEAM);
  }
  for (const [k, n] of [['armR', 0], ['armL', 1]]) { const f = face(k); stitchH(S, f.ring[0], f.ring[1] + 10, 16, ST, STL); }
  for (const k of ['legR', 'legL']) {
    paintBox(S, k, CL[3], 0.06); const f = face(k);
    S.rect(f.ring[0] + 1, f.ring[1] + 2, 3, 3, CL[2], 0.05); S.rect(f.ring[0] + 9, f.ring[1] + 4, 3, 4, CL[1], 0.05);
    stitchH(S, f.ring[0] + 1, f.ring[1] + 2, 3, SEAM); stitchV(S, f.ring[0] + 9, f.ring[1] + 4, 4, SEAM);
    S.mat = 'leather'; S.rect(f.ring[0], f.ring[1] + 10, 16, 2, 0x1b1b21, 0.05); S.rect(f.bottom[0], f.bottom[1], 4, 4, 0x1b1b21, 0.05); S.mat = 'cloth';
  }
  const m = finishMaterial(S, { emit: 1.8, fill: 0.13, rim: 0x9ad8ff, rimStrength: 0.5 });
  const hair = Skin.hairMaterial(HAIR), hairD = Skin.hairMaterial(HAIRD);
  const rig = new Rig({ material: m, scale: 1.9, hair: [
    { x: 0, y: 6.5, z: -3.8, w: 8.2, h: 11, d: 1.6, hang: true, material: hair, stiff: 26 },
    { x: -1.5, y: 5, z: -4.4, w: 3, h: 13, d: 1.2, hang: true, material: hairD, stiff: 22 },
    { x: 2, y: 5, z: -4.4, w: 2.5, h: 12, d: 1.2, hang: true, material: hair, stiff: 24 },
    { x: -3.9, y: 6.5, z: -0.6, w: 1.4, h: 10, d: 6.4, hang: true, material: hair, stiff: 28 },
    { x: 3.9, y: 6.5, z: -0.6, w: 1.4, h: 10, d: 6.4, hang: true, material: hair, stiff: 28 },
    { x: -4.3, y: 6, z: 3.0, w: 1.4, h: 10, d: 1.4, hang: true, material: hairD, stiff: 30 },
    { x: 4.3, y: 6, z: 3.0, w: 1.4, h: 9, d: 1.4, hang: true, material: hair, stiff: 30 },
  ] });
  const P = new Parts(rig);
  const flesh = pixMat(0xd4b4ac, { noise: 0.1, rim: 0x9ad8ff, rimStrength: 0.6 }), fleshD = pixMat(0xae8e88, { noise: 0.12 }), stitch = pixMat(ST, { noise: 0.1 });
  const bone = pixMat(0xece6da, { noise: 0.08, rough: 0.4, rim: 0xbfe6ff, rimStrength: 0.9 }), edge = pixMat(0xd8f0ff, { emissive: 0.8, noise: 0.04, rough: 0.25 });
  // transfigured blade arms (shown during Blade attacks)
  for (const [hand, s] of [[rig.handR, 1], [rig.handL, -1]]) {
    const b = grp(hand, 0, 0, 0); b.visible = false;
    P.box(b, 4.6, 2.4, 4.6, flesh, M4(0, 0.4, 0)); P.box(b, 4.8, 0.5, 4.8, stitch, M4(0, 1.2, 0));
    P.box(b, 3.4, 3, 3.4, fleshD, M4(0, -1.8, 0));
    P.box(b, 1.4, 9, 4.2, bone, M4(0, -7.4, 0.3, 0.06, 0, 0)); P.box(b, 1.1, 6, 3.0, bone, M4(0, -14.2, 0.9, 0.18, 0, 0));
    P.box(b, 0.5, 9.2, 0.7, edge, M4(0, -7.4, 2.5, 0.06, 0, 0)); P.box(b, 0.45, 6, 0.6, edge, M4(0, -14.2, 2.5, 0.18, 0, 0));
    P.box(b, 0.8, 3, 2, bone, M4(0, -17.6, 1.7, 0.45, 0, 0));
    rig.extras[s > 0 ? 'bladeR' : 'bladeL'] = b;
  }
  // stitched seams on the forearms and neck
  P.box(rig.torso, 4.6, 0.5, 4.6, stitch, M4(0, 12.1, 0));
  // ---- distorted form (phase 3): extra arms, spine spikes, bone growths
  const dist = grp(rig.torso, 0, 0, 0); dist.visible = false; dist.scale.setScalar(0.01);
  const extra = [];
  for (const [sx, y, z, ay, base] of [[1, 11, -3.2, -0.4, 2.3], [-1, 11, -3.2, 0.4, 2.3], [1, 6.5, -3.0, -0.8, 1.15], [-1, 6.5, -3.0, 0.8, 1.15]]) {
    const sh = grp(dist, sx * 3.0, y, z, 0, ay, 0);
    P.box(sh, 2.8, 2.8, 2.8, fleshD, M4(0, 0, 0));
    P.box(sh, 2.0, 6, 2.0, flesh, M4(0, -3, 0)); P.box(sh, 2.2, 0.5, 2.2, stitch, M4(0, -2.2, 0));
    const el = grp(sh, 0, -6, 0, -0.9, 0, 0);
    P.box(el, 1.7, 4.5, 1.7, flesh, M4(0, -2.2, 0)); P.box(el, 1.9, 0.5, 1.9, stitch, M4(0, -3.6, 0));
    P.box(el, 0.9, 5, 2.8, bone, M4(0, -6.5, 0.3)); P.box(el, 0.8, 4, 2.0, bone, M4(0, -10.8, 0.7, 0.12, 0, 0)); P.box(el, 0.6, 3, 1.0, bone, M4(0, -13.8, 1.2, 0.3, 0, 0));
    P.box(el, 0.35, 5, 0.5, edge, M4(0, -6.5, 1.8)); P.box(el, 0.35, 4, 0.5, edge, M4(0, -10.8, 1.8, 0.12, 0, 0));
    P.box(el, 1.2, 1.2, 1.2, bone, M4(0, -0.2, -1.1, 0.6, 0, 0));
    extra.push({ sh, el, sx, base, ph: y * 0.3 + sx });
  }
  for (let i = 0; i < 6; i++) { const y = 2 + i * 2; P.box(dist, 1.2, 1.2, 2.6 + i * 0.35, bone, M4(0, y, -2.6 - (1.3 + i * 0.18), -0.7 - i * 0.05, 0, 0)); P.box(dist, 2.2, 0.8, 0.8, fleshD, M4(0, y, -2.4)); }
  for (const sx of [-1, 1]) { P.box(dist, 1.4, 4.2, 1.4, bone, M4(sx * 4.6, 13.4, 0, 0, 0, sx * -0.5)); P.box(dist, 1.0, 3, 1.0, bone, M4(sx * 3.4, 13.6, -1.6, -0.4, 0, sx * -0.3)); }
  P.box(dist, 7.4, 5, 2.6, fleshD, M4(0, 9.0, -3.2)); P.box(dist, 7.6, 0.5, 2.8, stitch, M4(0, 7.4, -3.2));
  P.flush();
  const fx = groundFX(rig, 0x8ad0ff, 1.3);
  let distorted = 0;
  rig.onPhase = (n, b) => {
    if (n >= 2 && !dist.visible) { dist.visible = true; distorted = 0.001; rig.spec.scale = 1.9 * 1.35; rig.root.scale.setScalar(rig.spec.scale); fx.amp.value = 1.6; m.userData.rim.value = 0.8; if (b.lightH) b.lightH.offsetY = 8; }
  };
  rig.idle = (dt, b) => {
    const g = b.game, t = rig.t, Pt = g.particles, bud = Pt.budget ?? 1;
    if (distorted > 0 && distorted < 1) { distorted = Math.min(1, distorted + dt * 1.2); const e = 1 - Math.pow(1 - distorted, 3); dist.scale.setScalar(0.01 + e * 0.99 * (1 + Math.sin(distorted * Math.PI) * 0.2)); }
    for (const a of extra) {
      a.sh.rotation.x = 0.5 + Math.sin(t * 2.4 + a.ph) * 0.35;
      a.sh.rotation.z = a.sx * (a.base + Math.sin(t * 1.7 + a.ph) * 0.22);
      a.el.rotation.x = -0.7 + Math.sin(t * 3.1 + a.ph * 2) * 0.4;
    }
    m.userData.emitMask.value = 1.6 + Math.sin(t * 3.3) * 0.5;
    if (b.lightH && !dist.visible) b.lightH.offsetY = 6.2;   // keep the boss light off the top of the hair
    // drifting soul wisps around the hands and body
    const k = dist.visible ? 2 : 1;
    for (let i = rate(5 * k, dt, bud); i > 0; i--) {
      if (Math.random() < 0.5) (Math.random() < 0.5 ? rig.handR : rig.handL).getWorldPosition(v1);
      else v1.set(b.pos.x + rnd(1), b.pos.y + Math.random() * 3.5 * k, b.pos.z + rnd(1));
      Pt.glow.spawn({ x: v1.x + rnd(0.2), y: v1.y, z: v1.z + rnd(0.2), vx: rnd(0.25), vy: 0.5 + Math.random() * 0.6, vz: rnd(0.25), life: 1.3, r: 0.35, g: 0.75, b: 1.3, size: 0.12, gravity: -0.3, drag: 1.2, sizeEnd: 0.3 });
    }
    if (Math.random() < 2.5 * dt * k) Pt.smoke.spawn({ x: b.pos.x + rnd(0.8), y: b.pos.y + 0.1, z: b.pos.z + rnd(0.8), vy: 0.4, life: 1.6, r: 0.05, g: 0.06, b: 0.09, size: 0.6, gravity: -0.15, drag: 1, sizeEnd: 2.6 });
  };
  rig.fx = fx;
  return rig;
}

// =====================================================================
// shared extras for the boss models in entities/bosses/*.js
// =====================================================================
// Unlit glow (eyes, cores, energy blades); amp is a uniform for pulses.
export function glowMat(hex, strength = 2.5, o = {}) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: !!o.transparent, depthWrite: !o.transparent, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const c = new THREE.Color(hex), amp = uniform(strength);
  m.colorNode = vec3(c.r, c.g, c.b).mul(amp).mul(o.pulse ? sin(U.time.mul(o.pulse)).mul(0.18).add(1) : float(1));
  if (o.opacity != null) m.opacity = o.opacity;
  m.userData.amp = amp;
  return m;
}
// Wet, slowly crawling blood / rot: blocky noise between near-black and red.
export function bloodMat(hex = 0x9a0a12, o = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: o.rough ?? 0.28, metalness: 0.05 });
  const c = new THREE.Color(hex), dark = new THREE.Color(o.dark ?? 0x1a0204);
  const p = floor(positionLocal.div(PX * (o.cell ?? 0.75)));
  const t = U.time;
  const n = mx_noise_float(vec3(p.x.mul(0.35), p.y.mul(0.35).sub(t.mul(o.flow ?? 0.6)), p.z.mul(0.35))).mul(0.5).add(0.5);
  const col = mix(vec3(dark.r, dark.g, dark.b), vec3(c.r, c.g, c.b), smoothstep(0.25, 0.7, n));
  const amp = uniform(o.emissive ?? 0.35);
  m.colorNode = col;
  m.emissiveNode = col.mul(amp).mul(smoothstep(0.55, 0.9, n).add(0.25));
  m.userData.amp = amp;
  return m;
}
// Sea water: blocky waves between deep and foam, slightly glowing.
export function waterMat(deep = 0x0a3a6a, light = 0x5ad8ff, o = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.15, metalness: 0.1, transparent: !!o.opacity, opacity: o.opacity ?? 1 });
  const a = new THREE.Color(deep), b = new THREE.Color(light);
  const p = floor(positionLocal.div(PX * 0.6));
  const t = U.time;
  const n = mx_noise_float(vec3(p.x.mul(0.25).add(t.mul(0.8)), p.y.mul(0.25), p.z.mul(0.25).sub(t.mul(0.5)))).mul(0.5).add(0.5);
  const col = mix(vec3(a.r, a.g, a.b), vec3(b.r, b.g, b.b), smoothstep(0.45, 0.85, n));
  m.colorNode = col;
  m.emissiveNode = col.mul(o.emissive ?? 0.4).add(vec3(0.9, 1, 1).mul(smoothstep(0.82, 0.9, n)).mul(0.8));
  return m;
}
