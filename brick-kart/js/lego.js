// LEGO-style building blocks: the brick colour palette, shared plastic
// materials, procedural stud/tile textures and a BrickBuilder that merges
// thousands of bricks into a handful of meshes (one per colour).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const C = {
  red: 0xc91a09, dkred: 0x720e0f, blue: 0x0055bf, dkblue: 0x0a3463, azure: 0x36aebf, mdblue: 0x5a93db,
  yellow: 0xf2cd37, orange: 0xfe8a18, green: 0x237841, dkgreen: 0x184632, lime: 0xbbe90b,
  white: 0xf4f4f4, black: 0x1b2a34, dkgray: 0x6c6e68, ltgray: 0xa0a5a9, dkstone: 0x595d60,
  tan: 0xe4cd9e, dktan: 0x958a73, brown: 0x583927, rbrown: 0x7c503a, purple: 0x81007b, lavender: 0xcda4de,
  pink: 0xfc97ac, magenta: 0x923978, sand: 0xa0bcac, teal: 0x069d9f, gold: 0xdcbc81, pearl: 0xe6c05a,
  skin: 0xf6d7b3, fig: 0xffc917,
};

const PLATE = 0.4;   // plate height relative to one stud pitch (a brick is 3 plates = 1.2)

// ---- materials -----------------------------------------------------------
const matCache = new Map();
export function plastic(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    const { trans = false, emissive = 0, emissiveIntensity = 1, rough = 0.34, metal = 0, opacity = 0.55 } = opts;
    m = new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: metal, emissive, emissiveIntensity,
      transparent: trans, opacity: trans ? opacity : 1, depthWrite: !trans,
    });
    // plain opaque plastic can be merged into one vertex-coloured material
    if (!trans && !emissive && rough === 0.34 && !metal) m.userData.plain = color;
    matCache.set(key, m);
  }
  return m;
}

// ---- textures -----------------------------------------------------------
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// A 2x2 stud tile (white-ish, multiplied by the material colour). Used as
// both colour map and bump map on baseplates.
let studTex = null, studBump = null;
export function studTextures() {
  if (studTex) return { map: studTex, bump: studBump };
  const draw = (bump) => (g, w) => {
    g.fillStyle = bump ? '#000' : '#e4e4e4';
    g.fillRect(0, 0, w, w);
    const s = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const cx = s * (i + 0.5), cy = s * (j + 0.5), r = s * 0.3;
      if (bump) {
        const gr = g.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.05);
        gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 1.05, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.arc(cx + r * 0.18, cy + r * 0.22, r * 1.02, 0, Math.PI * 2); g.fill();
        const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#cfcfcf');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = s * 0.03;
        g.beginPath(); g.arc(cx, cy, r * 0.8, Math.PI * 0.9, Math.PI * 1.6); g.stroke();
      }
    }
  };
  studTex = canvasTex(128, 128, draw(false));
  studTex.colorSpace = THREE.SRGBColorSpace;
  studBump = canvasTex(128, 128, draw(true));
  return { map: studTex, bump: studBump };
}

// Studded baseplate material for ground/shoulders. `pitch` = world units per stud.
export function baseplateMat(color, pitch, rough = 0.55) {
  const { map, bump } = studTextures();
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, map: map.clone(), bumpMap: bump.clone(), bumpScale: 1.2 });
  m.map.repeat.set(1 / (2 * pitch), 1 / (2 * pitch));
  m.bumpMap.repeat.copy(m.map.repeat);
  m.map.needsUpdate = m.bumpMap.needsUpdate = true;
  return m;
}

// Road tiles: smooth LEGO tiles with seams and a dashed centre line.
// u runs across the road (0..1), v along it (repeats every `len` units).
export function roadTexture(base = '#6b6e70', line = '#f4f4f4', seams = 'rgba(0,0,0,0.22)', dashed = true) {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // subtle noise
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},0.035)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.strokeStyle = seams; g.lineWidth = 2;
    const cols = 8;
    for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo(i * w / cols, 0); g.lineTo(i * w / cols, h); g.stroke(); }
    for (let j = 0; j < 4; j++) for (let i = 0; i < cols; i++) {
      const y = (j * h / 4 + (i % 2) * h / 8) % h;
      g.beginPath(); g.moveTo(i * w / cols, y); g.lineTo((i + 1) * w / cols, y); g.stroke();
    }
    if (line) {
      g.fillStyle = line;
      if (dashed) { g.fillRect(w / 2 - 5, 0, 10, h * 0.5); }
      g.fillRect(4, 0, 8, h); g.fillRect(w - 12, 0, 8, h);
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function checkerTexture() {
  const t = canvasTex(128, 128, (g, w, h) => {
    const n = 8;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4';
      g.fillRect(i * w / n, j * h / n, w / n, h / n);
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Minifig face printed on the head cylinder (face centred at u = 0.5).
const faceCache = new Map();
export function faceTexture(style = 'smile', skin = '#ffc917') {
  const key = style + skin;
  if (faceCache.has(key)) return faceCache.get(key);
  const t = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#1b1b1b'; g.strokeStyle = '#1b1b1b'; g.lineCap = 'round';
    if (style === 'alien') {
      g.fillStyle = '#111';
      g.beginPath(); g.ellipse(cx - 18, cy - 8, 12, 16, -0.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx + 18, cy - 8, 12, 16, 0.4, 0, Math.PI * 2); g.fill();
      g.lineWidth = 4; g.strokeStyle = '#111'; g.beginPath(); g.arc(cx, cy + 10, 10, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    } else if (style === 'visor') {
      g.fillStyle = '#222'; g.fillRect(cx - 44, cy - 18, 88, 20);
      g.fillStyle = '#ff3030'; g.fillRect(cx - 34, cy - 12, 68, 7);
    } else {
      const ey = style === 'angry' ? cy - 10 : cy - 12;
      g.beginPath(); g.ellipse(cx - 16, ey, 6, 8, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx + 16, ey, 6, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(cx - 14, ey - 3, 2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 18, ey - 3, 2, 0, Math.PI * 2); g.fill();
      g.lineWidth = 5;
      if (style === 'angry') {
        g.beginPath(); g.moveTo(cx - 26, ey - 16); g.lineTo(cx - 8, ey - 10); g.stroke();
        g.beginPath(); g.moveTo(cx + 26, ey - 16); g.lineTo(cx + 8, ey - 10); g.stroke();
      }
      if (style === 'beard') {
        g.fillStyle = '#5a2a12';
        g.beginPath(); g.moveTo(cx - 34, cy + 2); g.quadraticCurveTo(cx, cy + 70, cx + 34, cy + 2);
        g.quadraticCurveTo(cx, cy + 20, cx - 34, cy + 2); g.fill();
      }
      g.beginPath();
      if (style === 'grin' || style === 'beard') { g.fillStyle = '#fff'; g.arc(cx, cy + 6, 18, 0.1 * Math.PI, 0.9 * Math.PI); g.closePath(); g.fillStyle = '#1b1b1b'; g.fill(); }
      else { g.arc(cx, cy + 2, 18, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
    }
  }, false);
  t.colorSpace = THREE.SRGBColorSpace;
  faceCache.set(key, t);
  return t;
}

// ---- geometry --------------------------------------------------------------
const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

// Unit stud (pitch 1): radius 0.3, height 0.17, sitting on y = 0.
export function studGeo(seg = 12) {
  return cached('stud' + seg, () => {
    const g = new THREE.CylinderGeometry(0.3, 0.3, 0.18, seg, 1, false);
    g.translate(0, 0.09, 0);
    return g;
  });
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

// A single brick geometry in stud units (w x d studs, h plates), centred on
// x/z with its bottom at y = 0, scaled by pitch. Cached per shape.
export function brickGeometry(w, d, h, pitch = 1, studs = true, seg = 12) {
  return cached(`b${w},${d},${h},${pitch},${studs},${seg}`, () => {
    const gap = 0.03;
    const parts = [];
    const box = new THREE.BoxGeometry(w - gap, h * PLATE - gap * 0.5, d - gap);
    box.translate(0, (h * PLATE) / 2, 0);
    parts.push(box);
    if (studs) {
      for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
        const s = studGeo(seg).clone();
        s.translate(i - (w - 1) / 2, h * PLATE, j - (d - 1) / 2);
        parts.push(s);
      }
    }
    const g = mergeGeometries(parts);
    g.scale(pitch, pitch, pitch);
    return g;
  });
}

// Merges many bricks/shapes into one mesh per material.
let vcMat = null;
export function vertexColorPlastic() {
  vcMat ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0 });
  return vcMat;
}
const tmpC = new THREE.Color();
function paint(g, hex) {
  tmpC.setHex(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = tmpC.r; a[i * 3 + 1] = tmpC.g; a[i * 3 + 2] = tmpC.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// ---- LEGO surfaces for scenery boxes -------------------------------------------------------
// Plain boxes are the building block of most scenery (walls, roofs, houses, temples, rocks...).
// Smooth they read as generic 3D; with `lego` on, a builder gives them brick courses on the sides
// (staggered seams, 1.2 units per course like a real brick) and studs on top, mapped in world
// space so neighbouring boxes line up like a real build.
let courseTex = null, legoSide = null, legoTop = null;
function legoMats() {
  if (legoSide) return { side: legoSide, top: legoTop };
  // one tile = 4 studs wide x 2 courses high, running bond
  courseTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h);
    const row = h / 2;
    for (let r = 0; r < 2; r++) {
      const y = r * row;
      g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(0, y, w, 3);                  // seam between courses
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, y + 3, w, 2);         // lit top edge of the brick
      g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, y + row - 6, w, 6);         // shade at its bottom
      // 1x4 bricks: one seam per course, staggered by half a brick
      const x = r ? w / 2 : 0;
      g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(x - 1, y, 3, row); if (!x) g.fillRect(w - 2, y, 2, row);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 2, y, 2, row);
    }
  });
  courseTex.colorSpace = THREE.SRGBColorSpace;
  legoSide = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, map: courseTex });
  const { map, bump } = studTextures();
  legoTop = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, map, bumpMap: bump, bumpScale: 1.2 });
  return { side: legoSide, top: legoTop };
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3();
// Split a transformed box into studded tops and coursed sides with world-space UVs.
function legoSplit(g) {
  const pos = g.attributes.position, idx = g.index ? g.index.array : null;
  const tris = idx ? idx.length / 3 : pos.count / 3;
  const side = [], top = [];
  for (let t = 0; t < tris; t++) {
    const ia = idx ? idx[t * 3] : t * 3, ib = idx ? idx[t * 3 + 1] : t * 3 + 1, ic = idx ? idx[t * 3 + 2] : t * 3 + 2;
    _a.fromBufferAttribute(pos, ia); _b.fromBufferAttribute(pos, ib); _c.fromBufferAttribute(pos, ic);
    _n.subVectors(_c, _b).cross(_t.subVectors(_a, _b)).normalize();
    const isTop = _n.y > 0.7;
    const out = isTop ? top : side;
    // sides: u along the face horizontally, v up (1 tile = 4 studs x 2 courses); tops: studs (2x2 per tile)
    let tx = -_n.z, tz = _n.x; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    for (const v of [_a, _b, _c]) {
      const u = isTop ? v.x / 2 : (v.x * tx + v.z * tz) / 4, w = isTop ? v.z / 2 : v.y / 2.4;
      out.push(v.x, v.y, v.z, _n.x, _n.y, _n.z, u, w);
    }
  }
  const make = (arr) => {
    if (!arr.length) return null;
    const n = arr.length / 8, P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { P.set(arr.slice(i * 8, i * 8 + 3), i * 3); N.set(arr.slice(i * 8 + 3, i * 8 + 6), i * 3); U.set(arr.slice(i * 8 + 6, i * 8 + 8), i * 2); }
    const o = new THREE.BufferGeometry();
    o.setAttribute('position', new THREE.BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.BufferAttribute(N, 3)); o.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    return o;
  };
  return { side: make(side), top: make(top) };
}

export class BrickBuilder {
  // chunk > 0 splits output meshes spatially so they can be frustum-culled.
  // opts.lego: give plain scenery boxes brick courses and studded tops (see legoMats)
  constructor(pitch = 1, chunk = 0, opts = {}) {
    this.pitch = pitch;
    this.chunk = chunk;
    this.lego = !!opts.lego;
    this.chunks = new Map();   // chunkKey -> Map(material -> geometry[])
  }
  bucket(mat, x, z) {
    const key = this.chunk ? Math.floor(x / this.chunk) + ',' + Math.floor(z / this.chunk) : '0';
    let c = this.chunks.get(key);
    if (!c) { c = new Map(); this.chunks.set(key, c); }
    let b = c.get(mat);
    if (!b) { b = []; c.set(mat, b); }
    return b;
  }
  add(geo, mat, x, y, z, rotY = 0, sx = 1, sy = 1, sz = 1) {
    tmpQ.setFromAxisAngle(up, rotY);
    tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz));
    return this.addMatrix(geo, mat, tmpM);
  }
  addMatrix(geo, mat, matrix) {
    let g = geo.clone().applyMatrix4(matrix);
    if (g.attributes.color) g.deleteAttribute('color');
    if (mat.userData.plain !== undefined) { paint(g, mat.userData.plain); mat = vertexColorPlastic(); }
    this.bucket(mat, matrix.elements[12], matrix.elements[14]).push(g);
    return g;
  }
  // w,d in studs, h in plates; (x, y, z) = centre bottom in world units.
  brick(x, y, z, w, d, h, color, opts = {}) {
    const p = opts.pitch || this.pitch;
    const geo = brickGeometry(w, d, h, p, opts.studs !== false, opts.seg || (p > 1.5 ? 8 : 12));
    const mat = opts.mat || plastic(color, opts.matOpts);
    this.add(geo, mat, x, y, z, opts.rot || 0);
    return y + h * PLATE * p;
  }
  // Plain box (no studs), centre bottom.
  box(x, y, z, sx, sy, sz, color, opts = {}) {
    const geo = cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    const mat = opts.mat || plastic(color, opts.matOpts);
    if (this.legoOk(mat, sx, sy, sz, opts)) {
      tmpQ.setFromAxisAngle(up, opts.rot || 0);
      this.legoBox(geo, mat, tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz)));
    } else this.add(geo, mat, x, y, z, opts.rot || 0, sx, sy, sz);
    return y + sy;
  }
  // Box with an arbitrary transform (unit box centred at origin).
  boxM(matrix, color, opts = {}) {
    const geo = cached('unitboxc', () => new THREE.BoxGeometry(1, 1, 1));
    const mat = opts.mat || plastic(color, opts.matOpts);
    if (this.lego) {
      matrix.decompose(tmpP, tmpQ, tmpS);
      if (this.legoOk(mat, tmpS.x, tmpS.y, tmpS.z, opts)) { this.legoBox(geo, mat, matrix); return; }
    }
    this.addMatrix(geo, mat, matrix);
  }
  // big enough plain-plastic boxes in a lego builder get LEGO surfaces (thin trims and small
  // details stay smooth; opts.smooth opts out)
  legoOk(mat, sx, sy, sz, opts) {
    if (!this.lego || opts.smooth || mat.userData.plain === undefined) return false;
    const d = [Math.abs(sx), Math.abs(sy), Math.abs(sz)].sort((a, b) => a - b);
    return d[0] >= 0.45 && d[1] >= 1.1;
  }
  legoBox(geo, mat, matrix) {
    const g = geo.clone().applyMatrix4(matrix);
    const { side, top } = legoSplit(g);
    g.dispose();
    const { side: sm, top: tm } = legoMats(), col = mat.userData.plain;
    const x = matrix.elements[12], z = matrix.elements[14];
    if (side) this.bucket(sm, x, z).push(paint(side, col));
    if (top) this.bucket(tm, x, z).push(paint(top, col));
  }
  // Round brick / cylinder, centre bottom.
  cyl(x, y, z, r, h, color, opts = {}) {
    const seg = opts.seg || 16;
    const geo = cached('ucyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0));
    const mat = opts.mat || plastic(color, opts.matOpts);
    this.add(geo, mat, x, y, z, opts.rot || 0, r, h, opts.rz || r);
    if (opts.stud) this.add(studGeo(), mat, x, y + h, z, 0, opts.stud, opts.stud, opts.stud);
    return y + h;
  }
  cone(x, y, z, r, h, color, opts = {}) {
    const seg = opts.seg || 12;
    const geo = cached('ucone' + seg, () => new THREE.ConeGeometry(1, 1, seg).translate(0, 0.5, 0));
    this.add(geo, opts.mat || plastic(color, opts.matOpts), x, y, z, opts.rot || 0, r, h, r);
    return y + h;
  }
  sphere(x, y, z, r, color, opts = {}) {
    const geo = cached('usph', () => new THREE.SphereGeometry(1, 14, 9));
    this.add(geo, opts.mat || plastic(color, opts.matOpts), x, y, z, 0, r, r * (opts.sy || 1), r);
  }
  build({ shadows = true, receive = true, name = 'bricks' } = {}) {
    const group = new THREE.Group();
    group.name = name;
    for (const c of this.chunks.values()) {
      for (const [mat, geos] of c) {
        const CH = 2500;
        for (let i = 0; i < geos.length; i += CH) {
          const g = mergeGeometries(geos.slice(i, i + CH));
          if (!g) continue;
          g.computeBoundingSphere();
          const mesh = new THREE.Mesh(g, mat);
          mesh.castShadow = shadows && !mat.transparent;
          mesh.receiveShadow = receive;
          group.add(mesh);
        }
        for (const g of geos) g.dispose();
      }
    }
    this.chunks.clear();
    return group;
  }
}

export const PLATE_H = PLATE;
