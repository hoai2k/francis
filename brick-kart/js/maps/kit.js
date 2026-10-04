// Shared helpers and brick-built props for the maps.
import * as THREE from 'three';
import { BrickBuilder, C, plastic, baseplateMat, brickGeometry, faceTexture } from '../lego.js';
import { groundPlane } from '../world.js';
export { tree, roundTree, pine, palm, rock, lamp, building, snowman, crystal, tower, wallSeg, cloud, mountain, grandstand, billboard, minifig, canvasTexture, pick, rng } from '../decor.js';
export { mover, trackMover, crossing, geyser, crusher, spinner, cannon } from '../hazards.js';
export { THREE, BrickBuilder, C, plastic, baseplateMat, brickGeometry, faceTexture, groundPlane };

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
export function mat4(x, y, z, rx, ry, rz, sx, sy, sz) {
  E.set(rx, ry, rz, 'YXZ'); Q.setFromEuler(E);
  return M.compose(V.set(x, y, z), Q, S.set(sx, sy, sz));
}

// ---- track helpers -----------------------------------------------------------------
export function inRange(tr, i, a, b) {
  const ia = tr.kToIndex(a), ib = tr.kToIndex(b);
  return ia <= ib ? i >= ia && i <= ib : i >= ia || i <= ib;
}
export function trackPolygon(g, tr, toPx) {
  g.beginPath();
  for (let i = 0; i < tr.N; i += 4) { const [x, y] = toPx(tr.px(i), tr.pz(i)); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.closePath();
}
export function strokeTrack(g, tr, toPx, scale, pad, filter = () => true) {
  for (let i = 0; i < tr.N; i += 3) {
    if (!filter(i)) continue;
    const [x, y] = toPx(tr.px(i), tr.pz(i));
    g.beginPath(); g.arc(x, y, (tr.HW[i] + tr.SH[i] + pad) * scale, 0, Math.PI * 2); g.fill();
  }
}
export function disc(g, toPx, sc, x, z, r) { const [px, py] = toPx(x, z); g.beginPath(); g.arc(px, py, r * sc, 0, Math.PI * 2); g.fill(); }
export function each(tr, a, b, step, fn) {
  const ia = tr.kToIndex(a), ib = tr.kToIndex(b);
  const n = (ib - ia + tr.N) % tr.N;
  for (let o = 0; o <= n; o += step) fn(tr.wrap(ia + o));
}
// Things placed along both edges just beyond the barrier line
export function edges(ctx, a, b, step, extra, fn, sides = [-1, 1]) {
  const tr = ctx.track;
  each(tr, a, b, step, (i) => {
    if (tr.GAP[i]) return;
    for (const side of sides) {
      const lat = (tr.HW[i] + tr.SH[i] + extra) * side;
      fn(tr.at(i, lat, 0), i, side);
    }
  });
}

// animated water / liquid plane cut out by a mask
export function liquid(ctx, mask, color, y, { opacity = 0.85, emissive = 0, speed = 0.05, size = 1600, rough = 0.12 } = {}) {
  const m = groundPlane(color, y, size, 1.6, { mask, transparent: opacity < 1, opacity, rough, emissive: emissive || undefined, emissiveIntensity: emissive ? 1.1 : undefined });
  if (opacity >= 1) { m.material.transparent = false; }
  ctx.scene.add(m);
  ctx.anim((dt, t) => { m.material.map.offset.set(Math.sin(t * 0.3) * 0.3, t * speed); m.material.bumpMap.offset.copy(m.material.map.offset); });
  return m;
}

// Tunnel / cave: side walls and a roof following the track between two k values.
export function tunnel(ctx, a, b, { wall = C.dkgray, roof = C.dkstone, height = 10, lights = 0xffd070, stud = true } = {}) {
  const tr = ctx.track, bb = ctx.b;
  const light = plastic(lights, { emissive: lights, emissiveIntensity: 1.8 });
  let n = 0;
  each(tr, a, b, 3, (i) => {
    const w = tr.HW[i] + tr.SH[i] + 1.4;
    const yaw = tr.yawAt(i);
    for (const sd of [-1, 1]) {
      const p = tr.at(i, w * sd, 0);
      bb.box(p.x, p.y - 1, p.z, 2.4, height + 1, 3.8, (n % 4 < 2) ? wall : roof, { rot: yaw });
    }
    const c = tr.at(i, 0, 0);
    const top = Math.max(tr.surfaceY(i, -w), tr.surfaceY(i, w)) + height;
    bb.box(c.x, top, c.z, w * 2 + 2.4, 1.6, 3.8, roof, { rot: yaw });
    if (stud && n % 2 === 0) bb.brick(c.x, top + 1.6, c.z, 2, 2, 1, roof, { pitch: 1.6 });
    if (n % 4 === 0) bb.box(c.x, top - 0.3, c.z, w * 1.2, 0.3, 0.8, 0, { rot: yaw, mat: light });
    n++;
  });
}

// Decorative arch/banner over the road at k
export function arch(ctx, k, { cols = [C.red, C.white], text = null, bg = '#0055bf', fg = '#fff', height = 11 } = {}) {
  const tr = ctx.track, i = tr.kToIndex(k);
  const span = tr.HW[i] + tr.SH[i] + 2;
  const b = new BrickBuilder(1);
  for (const s of [-1, 1]) { let y = 0, n = 0; while (y < height) y = b.brick(s * span, y, 0, 2, 2, 3, cols[n++ % cols.length]); }
  b.box(0, height, 0, span * 2 + 2, 2.2, 1.6, cols[0]);
  const g = b.build({ name: 'arch' });
  g.position.copy(tr.at(i, 0, 0)); g.position.y = Math.min(tr.surfaceY(i, -span), tr.surfaceY(i, span));
  g.rotation.y = tr.yawAt(i);
  if (text) {
    const tex = canvasTex(512, 64, (x, W, H) => { x.fillStyle = bg; x.fillRect(0, 0, W, H); x.fillStyle = fg; x.font = '900 42px "Arial Black", Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 2); });
    for (const z of [-0.85, 0.85]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(span * 2, 2), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
      m.position.set(0, height + 1.1, z); m.rotation.y = z < 0 ? Math.PI : 0;
      g.add(m);
    }
  }
  ctx.group.add(g);
  return g;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function built(fn, name = 'prop') { const b = new BrickBuilder(1); fn(b); return b.build({ name }); }

// ---- countryside ------------------------------------------------------------------------
export function windmill(ctx, x, z, s = 1, yaw = 0, body = C.white, roof = C.red) {
  const b = ctx.b, y0 = ctx.groundAt ? ctx.groundAt(x, z) : 0;
  let y = y0;
  for (let k = 0; k < 7; k++) y = b.cyl(x, y, z, (4.2 - k * 0.3) * s, 2.4 * s, k % 2 ? body : C.ltgray, { seg: 8 });
  b.cone(x, y, z, 3.4 * s, 4 * s, roof, { seg: 8 });
  b.box(x + Math.sin(yaw) * 3.4 * s, y0, z + Math.cos(yaw) * 3.4 * s, 2 * s, 3.4 * s, 0.4 * s, C.rbrown, { rot: yaw });
  const blades = new THREE.Group();
  const bl = new BrickBuilder(1);
  bl.cyl(0, -0.5, 0, 0.9 * s, 1, C.rbrown);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    bl.boxM(mat4(Math.cos(a) * 5.5 * s, 0, Math.sin(a) * 5.5 * s, 0, -a, 0, 10 * s, 0.25 * s, 1.8 * s), k % 2 ? C.white : C.tan);
    bl.boxM(mat4(Math.cos(a) * 5.5 * s, 0.1, Math.sin(a) * 5.5 * s, 0, -a, 0, 10 * s, 0.25 * s, 0.25 * s), C.rbrown);
  }
  const bg = bl.build({ name: 'blades' });
  bg.rotation.x = Math.PI / 2;
  blades.add(bg);
  blades.position.set(x + Math.sin(yaw) * 3.9 * s, y - 1.2 * s, z + Math.cos(yaw) * 3.9 * s);
  blades.rotation.y = yaw;
  ctx.group.add(blades);
  const sp = 0.6 + Math.random() * 0.4;
  ctx.anim((dt) => { bg.rotation.y += dt * sp; });
  ctx.claim(x, z, 6 * s);
}
export function balloon(ctx, x, y, z, s = 1, cols = [C.red, C.white]) {
  const g = new THREE.Group();
  const n = 8;
  for (let k = 0; k < n; k++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(6 * s, 16, 12, (k / n) * Math.PI * 2, Math.PI * 2 / n, 0, Math.PI * 0.72), plastic(cols[k % cols.length]));
    g.add(seg);
  }
  const bb = new BrickBuilder(1);
  bb.box(0, -10 * s, 0, 2.4 * s, 1.8 * s, 2.4 * s, C.rbrown);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) bb.boxM(mat4(sx * 1.6 * s, -6 * s, sz * 1.6 * s, sz * 0.25, 0, -sx * 0.25, 0.08, 7.5 * s, 0.08), C.black);
  g.add(bb.build());
  g.position.set(x, y, z);
  ctx.group.add(g);
  const ph = Math.random() * 6, dx = (Math.random() - 0.5) * 2;
  ctx.anim((dt, t) => { g.position.y = y + Math.sin(t * 0.4 + ph) * 3; g.position.x = x + Math.sin(t * 0.05 + ph) * 20 * dx; g.rotation.y = t * 0.1; });
  return g;
}
export function cowMesh(color = C.white, spots = C.black) {
  return built((b) => {
    b.box(0, 1.2, 0, 1.8, 1.5, 3.2, color);
    b.box(0.5, 1.9, 0.4, 0.82, 0.8, 1.1, spots); b.box(-0.6, 1.5, -0.8, 0.62, 0.9, 1, spots);
    b.box(0, 1.9, 1.9, 1.2, 1.1, 1, color); b.box(0, 1.9, 2.45, 1.0, 0.6, 0.3, C.pink);
    for (const sd of [-1, 1]) b.box(sd * 0.55, 3.0, 1.9, 0.2, 0.3, 0.2, C.tan);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.box(sx * 0.55, 0, sz * 1.1, 0.45, 1.2, 0.45, color);
  }, 'cow');
}
export function sheepMesh() {
  return built((b) => {
    b.sphere(0, 1.6, 0, 1.3, C.white, { sy: 0.85 }); b.sphere(0.6, 1.9, 0.5, 0.8, C.white); b.sphere(-0.6, 1.8, -0.5, 0.8, C.white);
    b.box(0, 1.5, 1.35, 0.7, 0.8, 0.8, C.black);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.box(sx * 0.5, 0, sz * 0.6, 0.3, 0.9, 0.3, C.black);
  }, 'sheep');
}
export function flowerBed(b, x, z, len, color, rot = 0) {
  b.brick(x, 0, z, len, 2, 1, C.green, { pitch: 1, rot, studs: false });
  const ca = Math.cos(rot), sa = Math.sin(rot);
  for (let k = 0; k < len; k += 1) {
    const o = k - (len - 1) / 2;
    for (const w of [-0.5, 0.5]) b.cyl(x + ca * o - sa * w * 0 + sa * w, 0.4, z - sa * o + ca * w, 0.34, 0.5, color, { seg: 6 });
  }
}
export function house(b, x, z, w, d, h, col, roof = C.red, rot = 0) {
  b.box(x, 0, z, w, h, d, col, { rot });
  const ca = Math.cos(rot), sa = Math.sin(rot);
  for (const sd of [-1, 1]) {
    const ox = -sa * sd * d * 0.26, oz = -ca * sd * d * 0.26;
    b.boxM(mat4(x + ox, h + d * 0.2, z + oz, sd * 0.7, rot, 0, w + 0.6, 0.5, d * 0.62), roof);
  }
  b.box(x + sa * (d / 2 + 0.05), 0, z + ca * (d / 2 + 0.05), 1.6, 2.6, 0.2, C.rbrown, { rot });
  for (const sd of [-1, 1]) {
    const wx = x + sa * (d / 2 + 0.05) + ca * sd * w * 0.28, wz = z + ca * (d / 2 + 0.05) - sa * sd * w * 0.28;
    b.box(wx, h * 0.45 - 0.2, wz, 1.6, 1.6, 0.2, C.white, { rot, smooth: true });   // window frame
    b.box(wx + sa * 0.06, h * 0.45, wz + ca * 0.06, 1.2, 1.2, 0.15, C.azure, { rot, matOpts: { trans: true, opacity: 0.7 } });
  }
}
export function hayBale(b, x, z, rot = 0) {
  b.boxM(mat4(x, 1.1, z, 0, rot, Math.PI / 2, 1, 1, 1).multiply(new THREE.Matrix4().makeScale(2.2, 2.4, 2.2)), C.tan);
}

// ---- candy -----------------------------------------------------------------------------
export function lollipop(b, x, z, s = 1, col = C.pink) {
  b.cyl(x, 0, z, 0.3 * s, 7 * s, C.white, { seg: 8 });
  b.cyl(x, 7 * s, z, 2.6 * s, 0.8 * s, col, { seg: 20 });
  b.cyl(x, 7.1 * s, z, 1.6 * s, 0.9 * s, C.white, { seg: 20 });
  b.cyl(x, 7.2 * s, z, 0.8 * s, 1.0 * s, col, { seg: 16 });
}
export function candyCane(b, x, z, s = 1, rot = 0) {
  for (let k = 0; k < 8; k++) b.cyl(x, k * 1.2 * s, z, 0.5 * s, 1.2 * s, k % 2 ? C.red : C.white, { seg: 10 });
  for (let k = 0; k < 5; k++) {
    const a = (k / 4) * Math.PI;
    const cx = x + Math.cos(rot) * (1.4 * s - Math.cos(a) * 1.4 * s), cz = z - Math.sin(rot) * (1.4 * s - Math.cos(a) * 1.4 * s);
    b.sphere(cx, 9.6 * s + Math.sin(a) * 1.4 * s, cz, 0.55 * s, k % 2 ? C.red : C.white);
  }
}
export function cupcake(b, x, z, s = 1, frost = C.pink) {
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; b.box(x + Math.cos(a) * 3 * s, 0, z + Math.sin(a) * 3 * s, 1.6 * s, 4 * s, 0.6 * s, k % 2 ? C.tan : C.dktan, { rot: -a + Math.PI / 2 }); }
  b.cyl(x, 0, z, 3 * s, 4 * s, C.rbrown, { seg: 16 });
  b.sphere(x, 4.4 * s, z, 3.6 * s, frost, { sy: 0.55 });
  b.sphere(x, 6.2 * s, z, 2.2 * s, frost, { sy: 0.6 });
  b.sphere(x, 7.6 * s, z, 0.8 * s, C.red);
  b.cyl(x + 0.2 * s, 8.2 * s, z, 0.08 * s, 1 * s, C.green, { seg: 4 });
}
export function donut(ctx, x, y, z, s = 1, icing = C.pink, rotX = Math.PI / 2) {
  const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.TorusGeometry(3 * s, 1.5 * s, 12, 24), plastic(C.dktan));
  const ic = new THREE.Mesh(new THREE.TorusGeometry(3 * s, 1.55 * s, 12, 24, Math.PI), plastic(icing));
  ic.rotation.z = 0; g.add(d, ic);
  g.rotation.x = rotX;
  g.position.set(x, y, z);
  g.traverse((o) => { o.castShadow = true; });
  ctx.group.add(g);
  return g;
}
export function gumdrop(b, x, z, s = 1, col = C.green) {
  b.cone(x, 0, z, 2 * s, 3 * s, col, { seg: 12, matOpts: { trans: true, opacity: 0.85, rough: 0.15 } });
}
export function iceCream(b, x, z, s = 1, cols = [C.pink, C.white, C.rbrown]) {
  const g = new THREE.ConeGeometry(2.4 * s, 7 * s, 12).rotateX(Math.PI).translate(0, 3.5 * s, 0);
  b.add(g, plastic(C.dktan), x, 0, z);
  cols.forEach((c, k) => b.sphere(x, 7.6 * s + k * 2.2 * s, z, (2.8 - k * 0.4) * s, c));
}

// ---- jungle -----------------------------------------------------------------------------
export function jungleTree(b, x, z, s, r) {
  const h = (9 + r() * 6) * s;
  b.cyl(x, 0, z, 0.8 * s, h, C.rbrown, { seg: 8 });
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2 + r();
    b.boxM(mat4(x + Math.sin(a) * 3 * s, h - 0.4 * s, z + Math.cos(a) * 3 * s, 0.35, a, 0, 2.2 * s, 0.3 * s, 7 * s), k % 2 ? C.green : C.dkgreen);
  }
  b.brick(x, h - 0.6 * s, z, 3, 3, 3, C.dkgreen, { pitch: 1.1 * s });
  if (r() < 0.5) for (let k = 0; k < 3; k++) b.cyl(x + (r() - 0.5) * 3 * s, h * 0.35, z + (r() - 0.5) * 3 * s, 0.12, h * 0.6, C.green, { seg: 4 });
}
export function fern(b, x, z, s, r) {
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + r(); b.boxM(mat4(x + Math.sin(a) * 1.2 * s, 0.6 * s, z + Math.cos(a) * 1.2 * s, 0.7, a, 0, 0.9 * s, 0.15, 3 * s), C.lime); }
}
export function temple(b, x, z, size, levels, col = C.sand, trim = C.dkgreen) {
  let y = 0;
  for (let k = 0; k < levels; k++) {
    const w = size * (1 - k / (levels + 1));
    b.box(x, y, z, w, 3, w, k % 2 ? col : C.dktan);
    b.box(x, y + 2.7, z, w + 0.4, 0.4, w + 0.4, trim);
    y += 3;
  }
  b.box(x, y, z, size * 0.25, 5, size * 0.25, col);
  b.box(x, y + 1, z + size * 0.13, size * 0.12, 3, 0.4, C.black);
  return y + 5;
}
export function stoneHead(b, x, z, s = 1, rot = 0) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  b.box(x, 0, z, 6 * s, 9 * s, 5 * s, C.dkstone, { rot });
  b.box(x, 9 * s, z, 6.6 * s, 1.2 * s, 5.6 * s, C.dkgreen, { rot });
  const fx = x + sa * 2.6 * s, fz = z + ca * 2.6 * s;
  for (const sd of [-1, 1]) b.box(fx + ca * sd * 1.4 * s, 5.6 * s, fz - sa * sd * 1.4 * s, 1.4 * s, 1 * s, 0.4 * s, C.black, { rot });
  b.box(fx, 3.4 * s, fz, 1 * s, 2 * s, 1 * s, C.dkgray, { rot });
  b.box(fx, 1.4 * s, fz, 3 * s, 0.6 * s, 0.4 * s, C.black, { rot });
}

// ---- factory ---------------------------------------------------------------------------
export function gear(ctx, x, y, z, r, col = C.ltgray, speed = 0.5, axis = 'z', yaw = 0) {
  const b = new BrickBuilder(1);
  b.cyl(0, -0.8, 0, r, 1.6, col, { seg: 24, matOpts: { metal: 0.6, rough: 0.35 } });
  const teeth = Math.round(r * 2.4);
  for (let k = 0; k < teeth; k++) { const a = k / teeth * Math.PI * 2; b.box(Math.cos(a) * (r + 0.6), -0.7, Math.sin(a) * (r + 0.6), 1.4, 1.4, 1.2, col, { rot: -a, matOpts: { metal: 0.6, rough: 0.35 } }); }
  b.cyl(0, -0.9, 0, r * 0.3, 1.8, C.dkgray, { seg: 12 });
  const g = b.build({ name: 'gear' });
  const hold = new THREE.Group();
  if (axis === 'z') g.rotation.x = Math.PI / 2;
  hold.add(g);
  hold.position.set(x, y, z);
  hold.rotation.y = yaw;
  ctx.group.add(hold);
  ctx.anim((dt) => { g.rotation.y += dt * speed; });
  return hold;
}
export function smokestack(ctx, x, z, h, col = C.red) {
  const b = ctx.b;
  let y = 0;
  for (let k = 0; y < h; k++) y = b.cyl(x, y, z, 3, 3, k % 2 ? col : C.white, { seg: 14 });
  const puffs = [];
  const m = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.6, roughness: 1 });
  for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 8), m); ctx.group.add(s); puffs.push(s); }
  ctx.anim((dt, t) => puffs.forEach((p, k) => { const f = ((t * 0.25 + k / 6) % 1); p.position.set(x + f * 10, y + f * 30, z + Math.sin(f * 6 + k) * 3); p.scale.setScalar(0.6 + f * 2.5); }));
}
export function crate(b, x, z, s = 1, col = C.rbrown, y = 0) {
  b.box(x, y, z, 3 * s, 3 * s, 3 * s, col);
  b.box(x, y + 0.2 * s, z, 3.1 * s, 0.4 * s, 3.1 * s, C.dktan);
  b.box(x, y + 2.4 * s, z, 3.1 * s, 0.4 * s, 3.1 * s, C.dktan);
}
export function robotArm(ctx, x, z, s = 1, col = C.orange) {
  const base = built((b) => { b.cyl(0, 0, 0, 2 * s, 1.5 * s, C.dkgray, { seg: 12 }); }, 'arm-base');
  base.position.set(x, 0, z); ctx.group.add(base);
  const pivot = new THREE.Group(); pivot.position.set(x, 1.5 * s, z); ctx.group.add(pivot);
  const lower = built((b) => { b.box(0, 0, 0, 1.4 * s, 8 * s, 1.4 * s, col); b.sphere(0, 8 * s, 0, 1.1 * s, C.dkgray); }, 'arm1');
  pivot.add(lower);
  const elbow = new THREE.Group(); elbow.position.y = 8 * s; lower.add(elbow);
  const upper = built((b) => { b.box(0, 0, 0, 1.1 * s, 6 * s, 1.1 * s, col); b.box(0, 6 * s, 0, 2.2 * s, 0.6 * s, 1.2 * s, C.dkgray); }, 'arm2');
  elbow.add(upper);
  const ph = Math.random() * 6;
  ctx.anim((dt, t) => { pivot.rotation.y = Math.sin(t * 0.5 + ph) * 1.4; lower.rotation.z = 0.35 + Math.sin(t * 0.9 + ph) * 0.25; elbow.rotation.z = -1.1 + Math.sin(t * 1.3 + ph) * 0.4; });
}
