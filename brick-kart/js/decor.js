// Brick-built scenery props. Every function draws into a BrickBuilder so the
// whole map merges into a few meshes per colour.
import * as THREE from 'three';
import { C, plastic } from './lego.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
function mat(x, y, z, rx, ry, rz, sx, sy, sz, order = 'YXZ') {
  E.set(rx, ry, rz, order);
  Q.setFromEuler(E);
  return M.compose(V.set(x, y, z), Q, S.set(sx, sy, sz));
}

export function tree(b, x, y, z, s = 1, leaf = C.green) {
  b.cyl(x, y, z, 0.45 * s, 2.6 * s, C.rbrown, { seg: 8 });
  let yy = y + 2.2 * s;
  const p = 0.8 * s;
  yy = b.brick(x, yy, z, 5, 5, 3, leaf, { pitch: p, studs: false });
  yy = b.brick(x, yy, z, 4, 4, 3, leaf, { pitch: p, studs: false });
  b.brick(x, yy, z, 2, 2, 3, leaf === C.green ? C.lime : leaf, { pitch: p });
}

export function roundTreeSmooth(b, x, y, z, s = 1, leaf = C.green) {
  b.cyl(x, y, z, 0.4 * s, 3 * s, C.rbrown, { seg: 8 });
  b.sphere(x, y + 4.2 * s, z, 2.2 * s, leaf);
  b.sphere(x + 0.9 * s, y + 5.2 * s, z + 0.4 * s, 1.4 * s, leaf === C.green ? C.lime : leaf);
}
// A brick-built leafy tree: a trunk of stacked round bricks and a stepped canopy of studded
// bricks (wide in the middle, narrower above and below, alternate layers turned 45 degrees).
export function roundTree(b, x, y, z, s = 1, leaf = C.green) {
  if (!LEGO.on) return roundTreeSmooth(b, x, y, z, s, leaf);
  let yy = y;
  for (let k = 0; k < 3; k++) yy = b.cyl(x, yy, z, 0.42 * s, 1.0 * s, C.rbrown, { seg: 10 });
  // layers are boxes: in the scenery builder they get studded tops and brick courses as textures
  const p = 0.72 * s, light = leaf === C.green ? C.lime : leaf;
  yy -= 0.4 * s;
  for (const [n, h, rot, col] of [[4, 2, 0, leaf], [6, 3, Math.PI / 4, leaf], [6, 3, 0, leaf], [5, 2, Math.PI / 4, light], [3, 2, 0, light]]) {
    yy = b.box(x, yy, z, n * p, h * 0.4 * p, n * p, col, { rot });
  }
  b.brick(x, yy, z, 1, 1, 2, light, { pitch: p });
}

export function pineSmooth(b, x, y, z, s = 1, snow = false, col = C.dkgreen) {
  b.cyl(x, y, z, 0.4 * s, 2 * s, C.brown, { seg: 8 });
  const tiers = [[3.0, 3.6, 1.2], [2.3, 3.0, 3.4], [1.5, 2.6, 5.4]];
  for (const [r, h, yo] of tiers) {
    b.cone(x, y + yo * s, z, r * s, h * s, col, { seg: 8 });
    if (snow) b.cone(x, y + (yo + h * 0.45) * s, z, r * 0.62 * s, h * 0.58 * s, C.white, { seg: 8 });
  }
}
// A brick-built pine: square studded plates stepping in to a point, alternate ones turned 45
// degrees; snowy ones have white plates on their steps.
export function pine(b, x, y, z, s = 1, snow = false, col = C.dkgreen) {
  if (!LEGO.on) return pineSmooth(b, x, y, z, s, snow, col);
  let yy = b.cyl(x, y, z, 0.4 * s, 1.6 * s, C.brown, { seg: 8 });
  const p = 0.62 * s;
  for (let n = 8, k = 0; n >= 2; n--, k++) {
    const rot = k % 2 ? Math.PI / 4 : 0;
    yy = b.box(x, yy, z, n * p, 0.8 * p, n * p, col, { rot });
    if (snow && k % 2 === 1) b.box(x, yy - 0.2 * p, z, (n - 1) * p, 0.6 * p, (n - 1) * p, C.white, { rot });
  }
  b.brick(x, yy, z, 1, 1, 3, snow ? C.white : col, { pitch: p });
}

export function palm(b, x, y, z, s, r) {
  const lean = (r() - 0.5) * 0.5, dir = r() * Math.PI * 2;
  let px = x, pz = z, py = y;
  for (let k = 0; k < 7; k++) {
    b.cyl(px, py, pz, (0.55 - k * 0.03) * s, 1.25 * s, k % 2 ? C.dktan : C.rbrown, { seg: 8 });
    py += 1.2 * s;
    px += Math.cos(dir) * lean * k * 0.25 * s;
    pz += Math.sin(dir) * lean * k * 0.25 * s;
  }
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + r();
    // leaf: long flat box pivoting at the crown, drooping outward
    const len = (4 + r() * 1.5) * s;
    const cx = px + Math.sin(a) * len * 0.45, cz = pz + Math.cos(a) * len * 0.45;
    b.boxM(mat(cx, py - 0.5 * s, cz, 0.35, a, 0, 1.1 * s, 0.18 * s, len), k % 2 ? C.green : C.lime);
  }
  b.sphere(px, py - 0.3 * s, pz, 0.45 * s, C.brown);
}

export function rock(b, x, y, z, s, r, cols = [C.dkgray, C.ltgray]) {
  const n = 2 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const w = 2 + Math.floor(r() * 3), d = 2 + Math.floor(r() * 3), h = 3 + Math.floor(r() * 6);
    b.brick(x + (r() - 0.5) * 3 * s, y, z + (r() - 0.5) * 3 * s, w, d, h, pick(r, cols), { pitch: s, rot: r() * Math.PI });
  }
}

export function lamp(b, x, y, z, glow = 0xffe28a) {
  b.cyl(x, y, z, 0.5, 0.5, C.black, { seg: 8 });
  b.cyl(x, y, z, 0.16, 6.5, C.black, { seg: 8 });
  b.sphere(x, y + 6.8, z, 0.55, C.yellow, { matOpts: { emissive: glow, emissiveIntensity: 1.6 } });
}

// scenery detail: 'high' or 'low' (the Fast graphics setting), and LEGO.on (the Legoized option:
// brick-built props, studded/coursed surfaces); both set before a map is built. The smooth originals
// of the legoized props are kept below (…Smooth) for comparison.
let DETAIL = 'high';
export const LEGO = { on: true };
export function setDetail(d, lego = true) { DETAIL = d === 'low' ? 'low' : 'high'; LEGO.on = lego; }

export function buildingSmooth(b, x, z, w, d, floors, col, r, opts = {}) {
  const glass = opts.glass ?? 0x2d4d6d;
  const glassMat = plastic(glass, { rough: 0.08, metal: 0.4, emissive: opts.night ? 0xffd070 : 0, emissiveIntensity: opts.night ? 0.25 : 1 });
  const trim = opts.trim ?? C.white;
  let y = opts.y ?? 0;
  b.box(x, y, z, w + 0.6, 0.5, d + 0.6, C.dkgray);
  y += 0.5;
  for (let f = 0; f < floors; f++) {
    b.box(x, y, z, w - 0.6, 3, d - 0.6, col);
    b.box(x, y + 0.8, z, w - 0.35, 1.5, d - 0.35, 0, { mat: glassMat });
    b.box(x, y + 3, z, w, 0.3, d, f % 3 === 2 ? trim : col);
    y += 3.3;
  }
  const sw = Math.max(1, Math.round(w / 4)), sd = Math.max(1, Math.round(d / 4));
  b.brick(x, y, z, sw, sd, 1, col, { pitch: w / sw });
  y += 0.4 * (w / sw);
  return roofTop(b, x, y, z, w, d, r);
}
export function building(b, x, z, w, d, floors, col, r, opts = {}) {
  if (!LEGO.on) return buildingSmooth(b, x, z, w, d, floors, col, r, opts);
  const glass = opts.glass ?? 0x2d4d6d;
  const glassMat = plastic(glass, { rough: 0.08, metal: 0.4, emissive: opts.night ? 0xffd070 : 0, emissiveIntensity: opts.night ? 0.25 : 1 });
  const trim = opts.trim ?? C.white;
  let y = opts.y ?? 0;
  b.box(x, y, z, w + 0.6, 0.5, d + 0.6, C.dkgray);
  y += 0.5;
  // walls are brick courses (the lego builder); each floor gets framed windows on every side
  const frameM = plastic(trim);
  for (let f = 0; f < floors; f++) {
    b.box(x, y, z, w - 0.6, 3.3, d - 0.6, col);
    for (const [len, nx, nz] of [[w - 0.6, 0, 1], [w - 0.6, 0, -1], [d - 0.6, 1, 0], [d - 0.6, -1, 0]]) {
      const n = Math.max(1, Math.floor(len / (DETAIL === 'low' ? 4.4 : 3.6))), off = nz ? (d - 0.6) / 2 : (w - 0.6) / 2;
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n * len - len / 2, px = x + (nz ? t : nx * off), pz = z + (nz ? nz * off : t);
        const rot = nz ? 0 : Math.PI / 2;
        if (DETAIL !== 'low') b.box(px + nx * 0.06, y + 0.7, pz + nz * 0.06, 1.9, 2.0, 0.3, 0, { mat: frameM, rot, smooth: true });   // frame
        b.box(px + nx * 0.14, y + 0.85, pz + nz * 0.14, 1.5, 1.7, 0.3, 0, { mat: glassMat, rot });            // pane
      }
    }
    y += 3.3;
  }
  // flat roof: studded (lego builder) with a ledge round the edge
  b.box(x, y, z, w - 0.2, 0.6, d - 0.2, col);
  y += 0.6;
  for (const [sx, sz, ox, oz] of [[w - 0.2, 0.6, 0, (d - 0.8) / 2], [w - 0.2, 0.6, 0, -(d - 0.8) / 2], [0.6, d - 1.4, (w - 0.8) / 2, 0], [0.6, d - 1.4, -(w - 0.8) / 2, 0]]) {
    b.box(x + ox, y, z + oz, sx, 0.8, sz, trim === C.white ? col : trim);
  }
  return roofTop(b, x, y, z, w, d, r);
}
// rooftop extras: an antenna, a water tank or a helipad
function roofTop(b, x, y, z, w, d, r) {
  const t = r();
  if (t < 0.25) { b.cyl(x, y, z, 0.2, 8, C.ltgray, { seg: 6 }); b.sphere(x, y + 8.2, z, 0.5, C.red, { matOpts: { emissive: 0xff2000, emissiveIntensity: 2 } }); }
  else if (t < 0.45) { b.cyl(x + w * 0.2, y, z + d * 0.2, 1.8, 3.4, C.rbrown, { seg: 12 }); b.cone(x + w * 0.2, y + 3.4, z + d * 0.2, 2, 1.4, C.dkgray, { seg: 12 }); }
  else if (t < 0.6) { b.box(x, y, z, w * 0.5, 2, d * 0.5, C.dkgray); b.cyl(x, y + 2, z, Math.min(w, d) * 0.22, 0.2, C.yellow, { seg: 20 }); }
  return y;
}

export function snowman(b, x, y, z, s = 1) {
  b.sphere(x, y + 1.4 * s, z, 1.5 * s, C.white);
  b.sphere(x, y + 3.5 * s, z, 1.1 * s, C.white);
  b.sphere(x, y + 5.0 * s, z, 0.8 * s, C.white);
  b.cone(x, y + 5.0 * s, z + 0.7 * s, 0.14 * s, 0.9 * s, C.orange, { rot: 0 });
  b.cyl(x, y + 5.6 * s, z, 0.7 * s, 0.12 * s, C.black);
  b.cyl(x, y + 5.7 * s, z, 0.5 * s, 0.9 * s, C.black);
  b.box(x, y + 4.2 * s, z, 1.9 * s, 0.3 * s, 1.9 * s, C.red);
}

export function crystal(b, x, y, z, s, r, col = C.azure) {
  const m = plastic(col, { trans: true, opacity: 0.7, emissive: col, emissiveIntensity: 0.6, rough: 0.05 });
  for (let k = 0; k < 3; k++) {
    const h = (3 + r() * 5) * s;
    b.boxM(mat(x + (r() - 0.5) * 2 * s, y + h * 0.4, z + (r() - 0.5) * 2 * s, (r() - 0.5) * 0.6, r() * 3, (r() - 0.5) * 0.6, 0.9 * s, h, 0.9 * s), col, { mat: m });
  }
}

export function tower(b, x, y, z, r, h, col, roof = C.red, crenel = true) {
  let yy = y, k = 0;
  while (yy < y + h) { b.cyl(x, yy, z, r, 2.4, k++ % 2 ? col : C.dkstone, { seg: 16 }); yy += 2.4; }
  b.cyl(x, yy, z, r + 0.6, 0.8, col, { seg: 16 });
  yy += 0.8;
  if (crenel) {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      b.brick(x + Math.cos(ang) * r, yy, z + Math.sin(ang) * r, 1, 1, 3, col, { pitch: 1.6, rot: -ang });
    }
  }
  if (roof) b.cone(x, yy, z, r * 1.15, r * 1.8, roof, { seg: 16 });
  return yy;
}

export function wallSeg(b, x1, z1, x2, z2, y, h, col, crenel = true) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
  const rot = Math.atan2(-dz, dx);
  b.box((x1 + x2) / 2, y, (z1 + z2) / 2, len, h, 2.4, col, { rot });
  if (crenel) {
    for (let t = 1; t < len; t += 3.2) {
      b.brick(x1 + dx * t / len, y + h, z1 + dz * t / len, 1, 1, 3, col, { pitch: 1.6, rot });
    }
  }
}

export function cloud(b, x, y, z, s, r) {
  const n = 3 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const w = 3 + Math.floor(r() * 4), d = 2 + Math.floor(r() * 3);
    b.brick(x + (k - n / 2) * 2.4 * s, y + (k % 2) * 1.2 * s, z + (r() - 0.5) * 3 * s, w, d, 3, C.white, { pitch: 1.2 * s });
  }
}

// Stepped brick mountain. With `track`, any layer that would poke up through the road (a road
// point inside the layer's footprint lying below its top) is shrunk until it clears the road, so
// roads can climb a mountain's shoulder without driving through its bricks.
export function mountain(b, x, y, z, rad, h, r, cols = [C.ltgray, C.dkgray], cap = C.white, track = null) {
  const layers = Math.max(4, Math.round(h / 4));
  const lh = h / layers;
  // road samples (across the road and shoulders) near enough to matter
  const pts = [];
  if (track) {
    for (let i = 0; i < track.N; i += 2) {
      for (const f of [-1, -0.66, -0.33, 0, 0.33, 0.66, 1]) {
        const p = track.at(i, f * (track.HW[i] + track.SH[i]), 0);
        if (Math.hypot(p.x - x, p.z - z) < rad * 1.6 + 6) pts.push(p);
      }
    }
  }
  for (let k = 0; k < layers; k++) {
    const f = 1 - k / layers;
    let rr = rad * f + 2;
    const top = k > layers * 0.62;
    const cx = x + (r() - 0.5) * rad * 0.1, cz = z + (r() - 0.5) * rad * 0.1, stretch = 0.8 + r() * 0.3, rot = r() * 0.4;
    const y0 = y + k * lh, y1 = y0 + lh, cs = Math.cos(rot), sn = Math.sin(rot);
    const hits = (rr) => pts.some((p) => {
      if (p.y >= y1 - 0.05) return false;              // road runs over this layer: fine
      const dx = p.x - cx, dz = p.z - cz, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      return Math.abs(lx) < rr + 2 && Math.abs(lz) < rr * stretch + 2;
    });
    while (pts.length && rr > 1.5 && hits(rr)) rr *= 0.88;
    if (pts.length && hits(rr)) continue;
    b.box(cx, y0, cz, rr * 2, lh, rr * 2 * stretch, top ? cap : cols[k % cols.length], { rot });
  }
}

export function minifig(b, x, y, z, rot, torso, r) {
  const legs = pick(r, [C.blue, C.black, C.dkgray, C.tan, C.red]);
  const s = 1;
  b.box(x, y, z, 0.9 * s, 1.1 * s, 0.5 * s, legs, { rot });
  b.box(x, y + 1.1 * s, z, 1.1 * s, 1.1 * s, 0.55 * s, torso, { rot });
  b.cyl(x, y + 2.2 * s, z, 0.38 * s, 0.7 * s, C.fig, { seg: 10, stud: 0.25 });
  if (r() < 0.5) b.cyl(x, y + 2.8 * s, z, 0.42 * s, 0.25 * s, pick(r, [C.red, C.blue, C.yellow, C.brown, C.black]), { seg: 10 });
}

// Grandstand of cheering minifigs next to the track at samples [i0, i0+len)
export function grandstand(b, track, i0, len, side, r) {
  const tiers = 4;
  for (let i = i0; i < i0 + len; i += 2) {
    const ii = track.wrap(i);
    const base = track.HW[ii] + track.SH[ii] + 3;
    const yaw = track.yawAt(ii);
    const rot = yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    for (let t = 0; t < tiers; t++) {
      const lat = (base + t * 2.2) * side;
      const p = track.at(ii, lat, 0);
      const gy = track.groundY;
      const h = (t + 1) * 1.1 + (p.y - gy);
      b.box(p.x, gy, p.z, 2.2, h, 2.4, t % 2 ? C.ltgray : C.dkgray, { rot: yaw });
      if (r() < 0.8) minifig(b, p.x, gy + h, p.z, rot + Math.PI, pick(r, [C.red, C.blue, C.yellow, C.green, C.white, C.orange, C.purple, C.azure]), r);
    }
    // roof
    if (i % 4 === 0) {
      const p = track.at(ii, (base + tiers * 2.2) * side, 0);
      b.box(p.x, track.groundY, p.z, 0.5, tiers * 1.1 + 7, 0.5, C.black);
    }
  }
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function billboard(group, b, x, y, z, rot, text, bg = '#c91a09', fg = '#f2cd37', w = 14, h = 5) {
  b.box(x - Math.cos(rot) * w * 0.35, y, z + Math.sin(rot) * w * 0.35, 0.6, h + 5, 0.6, C.dkgray);
  b.box(x + Math.cos(rot) * w * 0.35, y, z - Math.sin(rot) * w * 0.35, 0.6, h + 5, 0.6, C.dkgray);
  const tex = canvasTexture(512, Math.round(512 * h / w), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = fg; g.lineWidth = 12; g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 110;
    g.font = `900 ${fs}px "Arial Black", Arial`;
    while (g.measureText(text).width > W - 60 && fs > 20) { fs -= 6; g.font = `900 ${fs}px "Arial Black", Arial`; }
    g.fillText(text, W / 2, H / 2 + 4);
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), [plastic(C.dkgray), plastic(C.dkgray), plastic(C.dkgray), plastic(C.dkgray),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 })]);
  m.position.set(x, y + 5 + h / 2, z);
  m.rotation.y = rot;
  m.castShadow = true;
  group.add(m);
}
