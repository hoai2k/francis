// Track: a closed spline sampled every ~1 unit. Builds the road (tiles),
// shoulders (baseplates), skirts/banks, brick walls, curbs, supports, start
// gate, item boxes, boost pads, ramps and collectible studs, and answers
// spatial queries for karts ("where am I on the track?").
import * as THREE from 'three';
import { BrickBuilder, C, plastic, baseplateMat, roadTexture, checkerTexture, brickGeometry } from './lego.js';

const SPACING = 1.0;
const THICK = 0.9;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function brickWallTexture(base, dark) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = dark;
    const rows = 4, bw = w / 2;
    for (let r = 0; r < rows; r++) {
      const y = r * h / rows;
      g.fillRect(0, y, w, 3);
      const off = (r % 2) * bw / 2;
      for (let x = off; x < w + bw; x += bw) g.fillRect(x % w, y, 3, h / rows);
    }
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let r = 0; r < rows; r++) g.fillRect(0, r * h / rows + 3, w, 4);
  });
}

let arrowTex = null;
function boostTexture() {
  if (arrowTex) return arrowTex;
  arrowTex = canvasTex(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#ff7a00'); gr.addColorStop(1, '#ffd000');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6c0';
    for (let i = 0; i < 2; i++) {
      const y = i * h / 2 + 20;
      g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w - 14, y + 60); g.lineTo(w - 38, y + 60); g.lineTo(w / 2, y + 26);
      g.lineTo(38, y + 60); g.lineTo(14, y + 60); g.closePath(); g.fill();
    }
    g.strokeStyle = '#b34700'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  });
  return arrowTex;
}

let chevTex = null;
function chevronTexture() {
  if (chevTex) return chevTex;
  chevTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#c91a09'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f4f4';
    for (let k = 0; k < 3; k++) {
      const x = 40 + k * 70;
      g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + 40, 14); g.lineTo(x + 62, 14); g.lineTo(x + 22, h / 2); g.lineTo(x + 62, h - 14); g.lineTo(x + 40, h - 14); g.closePath(); g.fill();
    }
    g.strokeStyle = '#f4f4f4'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  });
  chevTex.wrapS = chevTex.wrapT = THREE.ClampToEdgeWrapping;
  return chevTex;
}
let glideTex = null;
function gliderTexture() {
  if (glideTex) return glideTex;
  glideTex = canvasTex(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1a8cff'); gr.addColorStop(1, '#6ad8ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 2; i++) {
      const y = i * h / 2 + 30;
      g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w - 8, y + 40); g.lineTo(w / 2, y + 26); g.lineTo(8, y + 40); g.closePath(); g.fill();
      g.fillRect(w / 2 - 4, y + 20, 8, 50);
    }
    g.strokeStyle = '#0a3a8a'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  });
  return glideTex;
}

let qTex = null;
function questionTexture() {
  if (qTex) return qTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = 'bold 104px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 12; g.strokeStyle = '#1b2a34'; g.strokeText('?', 64, 70);
  g.fillStyle = '#fff'; g.fillText('?', 64, 70);
  qTex = new THREE.CanvasTexture(c);
  qTex.colorSpace = THREE.SRGBColorSpace;
  return qTex;
}

export class Track {
  constructor(def, scene) {
    this.def = def;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.theme = def.theme;
    this.groundY = def.theme.groundY ?? 0;
    this.obstacles = [];
    this.sample();
    this.buildGrid();
    this.buildRoad();
    this.buildWalls();
    this.buildSupports();
    this.buildStart();
    this.buildItemBoxes();
    this.buildBoosts();
    this.buildRamps();
    this.buildStuds();
    this.buildSigns();
    this.time = 0;
  }

  // ---- sampling ---------------------------------------------------------------
  sample() {
    const def = this.def;
    const pts = def.points.map(([x, z, y = 0]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
    const len = curve.getLength();
    const N = Math.max(200, Math.round(len / SPACING));
    const raw = curve.getSpacedPoints(N).slice(0, N);
    // control point index -> nearest sample (for authoring in "k" units)
    const cpIdx = pts.map((p) => {
      let best = 0, bd = Infinity;
      raw.forEach((q, i) => { const d = q.distanceToSquared(p); if (d < bd) { bd = d; best = i; } });
      return best;
    });
    const kToRaw = (k) => {
      const n = pts.length;
      k = ((k % n) + n) % n;
      const a = Math.floor(k), b = (a + 1) % n, f = k - a;
      let ia = cpIdx[a], ib = cpIdx[b];
      if (ib < ia) ib += N;
      return Math.round(ia + (ib - ia) * f) % N;
    };
    const start = kToRaw(def.start ?? 0);
    this.N = N;
    this.length = len;
    this.P = new Float32Array(N * 3);
    this.T = new Float32Array(N * 3);
    this.R = new Float32Array(N * 2);
    this.HW = new Float32Array(N);
    this.SH = new Float32Array(N);
    this.EDGE = new Uint8Array(N);   // 0 wall, 1 void, 2 open (grass, invisible boundary), 3 fence
    this.BK = new Float32Array(N);   // banking: surface rises by BK per unit of lateral offset
    this.CURV = new Float32Array(N);
    this.GAP = new Uint8Array(N);
    this.SURF = [];
    this.SUP = [];
    this.DIST = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const p = raw[(i + start) % N];
      this.P[i * 3] = p.x; this.P[i * 3 + 1] = Math.max(0, p.y); this.P[i * 3 + 2] = p.z;
    }
    for (let i = 0; i < N; i++) {
      const a = (i - 1 + N) % N, b = (i + 1) % N;
      let tx = this.P[b * 3] - this.P[a * 3], ty = this.P[b * 3 + 1] - this.P[a * 3 + 1], tz = this.P[b * 3 + 2] - this.P[a * 3 + 2];
      const l = Math.hypot(tx, ty, tz);
      tx /= l; ty /= l; tz /= l;
      this.T[i * 3] = tx; this.T[i * 3 + 1] = ty; this.T[i * 3 + 2] = tz;
      const h = Math.hypot(tx, tz);
      // right = tangent x up (horizontal)
      this.R[i * 2] = -tz / h; this.R[i * 2 + 1] = tx / h;
      this.DIST[i] = i * (len / N);
    }
    this.kToIndex = (k) => (kToRaw(k) - start + N) % N;
    // default per-sample attributes, then sections
    const th = def.theme;
    const EDGES = { wall: 0, void: 1, open: 2, fence: 3 };
    const bankMul = new Float32Array(N).fill(def.bank ?? 1);
    for (let i = 0; i < N; i++) {
      this.HW[i] = (def.width ?? 26) / 2;
      this.SH[i] = def.shoulder ?? 8;
      this.EDGE[i] = EDGES[def.edge || 'fence'];
      this.SURF[i] = def.surface || 'road';
      this.SUP[i] = th.support || 'pillar';
    }
    for (const s of def.sections || []) {
      const a = this.kToIndex(s.from), b = this.kToIndex(s.to);
      const cnt = (b - a + N) % N;
      for (let o = 0; o <= cnt; o++) {
        const i = (a + o) % N;
        if (s.width) this.HW[i] = s.width / 2;
        if (s.shoulder !== undefined) this.SH[i] = s.shoulder;
        if (s.edge) this.EDGE[i] = EDGES[s.edge];
        if (s.bank !== undefined) bankMul[i] = s.bank;
        if (s.gap) this.GAP[i] = 1;
        if (s.surface) this.SURF[i] = s.surface;
        if (s.support) this.SUP[i] = s.support;
      }
    }
    // smooth width changes
    const hw = Float32Array.from(this.HW);
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let o = -8; o <= 8; o++) s += hw[(i + o + N) % N];
      this.HW[i] = s / 17;
    }
    for (let i = 0; i < N; i++) if (this.EDGE[i] === 1) this.SH[i] = 0;
    // curvature (rad per unit, >0 = left turn) and banking
    const yaw = new Float32Array(N);
    for (let i = 0; i < N; i++) yaw[i] = Math.atan2(this.T[i * 3], this.T[i * 3 + 2]);
    const step = len / N;
    const raw2 = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let d = yaw[(i + 6) % N] - yaw[(i - 6 + N) % N];
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.CURV[i] = d / (12 * step);
      raw2[i] = Math.max(-0.26, Math.min(0.26, this.CURV[i] * 6.5)) * bankMul[i];
    }
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let o = -16; o <= 16; o++) s += raw2[(i + o + N) % N];
      this.BK[i] = Math.tan(s / 33);
      if (this.GAP[i]) this.BK[i] = 0;
    }
    // lift banked road so its low edge never dips under the ground
    if (!th.noGround) {
      const lift = new Float32Array(N);
      for (let i = 0; i < N; i++) lift[i] = Math.max(0, this.groundY + 0.06 + this.HW[i] * Math.abs(this.BK[i]) - this.P[i * 3 + 1]);
      const l2 = new Float32Array(N);
      for (let i = 0; i < N; i++) { let m = 0; for (let o = -14; o <= 14; o++) m = Math.max(m, lift[(i + o + N) % N]); l2[i] = m; }
      for (let i = 0; i < N; i++) { let s = 0; for (let o = -10; o <= 10; o++) s += l2[(i + o + N) % N]; this.P[i * 3 + 1] += s / 21; }
      for (let i = 0; i < N; i++) {
        const a = (i - 1 + N) % N, b = (i + 1) % N;
        const tx = this.P[b * 3] - this.P[a * 3], ty = this.P[b * 3 + 1] - this.P[a * 3 + 1], tz = this.P[b * 3 + 2] - this.P[a * 3 + 2];
        const l = Math.hypot(tx, ty, tz);
        this.T[i * 3] = tx / l; this.T[i * 3 + 1] = ty / l; this.T[i * 3 + 2] = tz / l;
      }
    }
  }

  // road surface height at sample i and lateral offset (banked, flat beyond the road edge)
  surfaceY(i, lat) {
    const hw = this.HW[i];
    return this.P[i * 3 + 1] + Math.max(-hw, Math.min(hw, lat)) * this.BK[i];
  }

  px(i) { return this.P[i * 3]; }
  py(i) { return this.P[i * 3 + 1]; }
  pz(i) { return this.P[i * 3 + 2]; }
  wrap(i) { return ((i % this.N) + this.N) % this.N; }

  // world point at sample i, lateral offset, height above road
  at(i, lat = 0, h = 0, out = new THREE.Vector3()) {
    i = this.wrap(Math.round(i));
    return out.set(this.P[i * 3] + this.R[i * 2] * lat, this.surfaceY(i, lat) + h, this.P[i * 3 + 2] + this.R[i * 2 + 1] * lat);
  }
  yawAt(i) { i = this.wrap(Math.round(i)); return Math.atan2(this.T[i * 3], this.T[i * 3 + 2]); }

  buildGrid() {
    this.cell = 16;
    this.grid = new Map();
    for (let i = 0; i < this.N; i++) {
      const k = Math.floor(this.px(i) / this.cell) + ',' + Math.floor(this.pz(i) / this.cell);
      let a = this.grid.get(k);
      if (!a) { a = []; this.grid.set(k, a); }
      a.push(i);
    }
  }
  // Minimum horizontal distance from (x, z) to the outer edge of the track
  // (negative if on the track). Used to place scenery.
  clearance(x, z, maxR = 60) {
    const c = this.cell, r = Math.ceil(maxR / c);
    const cx = Math.floor(x / c), cz = Math.floor(z / c);
    let best = maxR;
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const arr = this.grid.get((cx + a) + ',' + (cz + b));
      if (!arr) continue;
      for (const i of arr) {
        const d = Math.hypot(x - this.px(i), z - this.pz(i)) - this.HW[i] - this.SH[i] - 1.5;
        if (d < best) best = d;
      }
    }
    return best;
  }
  // Highest road surface under (x,z) (for placing things), or null.
  roadHeightNear(x, z, below = Infinity) {
    const c = this.cell;
    const cx = Math.floor(x / c), cz = Math.floor(z / c);
    let best = null;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const arr = this.grid.get((cx + a) + ',' + (cz + b));
      if (!arr) continue;
      for (const i of arr) {
        const d = Math.hypot(x - this.px(i), z - this.pz(i));
        if (d < this.HW[i] + this.SH[i] + 2.5 && this.py(i) < below && (best === null || this.py(i) > best)) best = this.py(i);
      }
    }
    return best;
  }

  // Locate a world position relative to the track, searching near `hint`.
  locate(x, y, z, hint, out = {}, window = 26) {
    const N = this.N, P = this.P;
    if (hint >= 0) hint = Math.round(hint) % N;
    let best = -1, bd = Infinity;
    const lo = hint < 0 ? 0 : -window, hi = hint < 0 ? N - 1 : window;
    for (let o = lo; o <= hi; o++) {
      const i = hint < 0 ? o : (hint + o + N) % N;
      const dx = x - P[i * 3], dz = z - P[i * 3 + 2], dy = Math.abs(y - P[i * 3 + 1]);
      let d = dx * dx + dz * dz;
      if (dy > 4) d += (dy - 4) * (dy - 4) * 6;
      if (d < bd) { bd = d; best = i; }
    }
    let i = best;
    const tx = this.T[i * 3], tz = this.T[i * 3 + 2];
    const along = (x - P[i * 3]) * tx + (z - P[i * 3 + 2]) * tz;
    if (along < 0) i = (i - 1 + N) % N;
    const j = (i + 1) % N;
    const segx = P[j * 3] - P[i * 3], segz = P[j * 3 + 2] - P[i * 3 + 2];
    const sl2 = segx * segx + segz * segz || 1;
    let t = ((x - P[i * 3]) * segx + (z - P[i * 3 + 2]) * segz) / sl2;
    t = Math.max(0, Math.min(1, t));
    const cx = P[i * 3] + segx * t, cz = P[i * 3 + 2] + segz * t;
    const rx = this.R[i * 2] * (1 - t) + this.R[j * 2] * t, rz = this.R[i * 2 + 1] * (1 - t) + this.R[j * 2 + 1] * t;
    out.i = i; out.t = t;
    out.lat = (x - cx) * rx + (z - cz) * rz;
    out.hw = this.HW[i] * (1 - t) + this.HW[j] * t;
    out.bank = this.BK[i] * (1 - t) + this.BK[j] * t;
    out.y = P[i * 3 + 1] * (1 - t) + P[j * 3 + 1] * t + Math.max(-out.hw, Math.min(out.hw, out.lat)) * out.bank;
    out.curv = this.CURV[i];
    out.sh = this.SH[i];
    out.edge = this.EDGE[i];
    out.gap = this.GAP[i] || this.GAP[j];
    out.surf = this.SURF[i];
    out.rx = rx; out.rz = rz;
    out.tx = this.T[i * 3]; out.ty = this.T[i * 3 + 1]; out.tz = this.T[i * 3 + 2];
    return out;
  }

  // ---- road ---------------------------------------------------------------------
  surfaceMaterial(surf) {
    this.surfMats ||= {};
    if (this.surfMats[surf]) return this.surfMats[surf];
    const th = this.theme;
    let m;
    if (surf === 'rainbow') {
      m = new THREE.MeshStandardMaterial({ vertexColors: true, map: roadTexture('#ffffff', null, 'rgba(0,0,0,0.3)'), roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.35 });
      m.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb;');
      };
    } else if (surf === 'ice') {
      m = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, map: roadTexture('#d8f2ff', '#ffffff', 'rgba(80,140,200,0.35)', false), roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.88 });
    } else if (surf === 'wood') {
      m = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#7c503a'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = i % 2 ? '#6b4430' : '#855740';
          g.fillRect(i * w / 8 + 2, 0, w / 8 - 4, h);
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(i * w / 8, ((i * 37) % 8) * h / 8, w / 8, 3);
        }
      }), roughness: 0.7 });
    } else if (surf === 'conveyor') {
      m = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#3a3e44'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#50565e'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 8);
        g.fillStyle = '#f2cd37'; g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w - 24, 64); g.lineTo(24, 64); g.closePath(); g.fill();
      }), roughness: 0.4, metalness: 0.4 });
      this.conveyorMat = m;
    } else if (surf === 'water') {
      m = new THREE.MeshStandardMaterial({ color: 0x6ac8ff, map: roadTexture('#9ad8ff', null, 'rgba(255,255,255,0.35)', false), roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.8 });
      this.waterMat = m;
    } else if (th.surfaces?.[surf]) {
      const o = th.surfaces[surf];
      m = new THREE.MeshStandardMaterial({ map: roadTexture(o.base, o.line ?? null, o.seams ?? 'rgba(0,0,0,0.22)', o.dashed ?? false), roughness: o.rough ?? 0.55, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.emissiveIntensity ?? 1 });
    } else {
      m = new THREE.MeshStandardMaterial({ map: roadTexture(th.road?.base || '#6b6e70', th.road?.line || '#f4f4f4'), roughness: 0.55, color: 0xffffff });
    }
    m.map.anisotropy = 8;
    this.surfMats[surf] = m;
    return m;
  }

  buildRoad() {
    const N = this.N, L = 8;
    const th = this.theme;
    // runs of consecutive non-gap samples with the same surface
    const runs = [];
    let startI = -1;
    for (let i = 0; i < N; i++) if (this.GAP[i] && !this.GAP[(i + 1) % N]) { startI = (i + 1) % N; break; }
    if (startI < 0) {
      // no gaps: split at surface changes
      startI = 0;
      for (let i = 0; i < N; i++) if (this.SURF[i] !== this.SURF[(i - 1 + N) % N]) { startI = i; break; }
    }
    let cur = null;
    for (let o = 0; o < N; o++) {
      const i = (startI + o) % N;
      if (this.GAP[i]) { if (cur) { runs.push(cur); cur = null; } continue; }
      if (cur && this.SURF[i] !== cur.surf) { cur.idx.push(i); runs.push(cur); cur = null; }
      if (!cur) cur = { surf: this.SURF[i], idx: [] };
      cur.idx.push(i);
    }
    if (cur) { cur.idx.push(startI); runs.push(cur); }

    const pitch = th.plateStud || 1.2;
    const shoulderMat = baseplateMat(th.shoulder || C.green, pitch, 0.6);
    shoulderMat.map.repeat.set(1, 1); shoulderMat.bumpMap.repeat.set(1, 1);
    const skirtMat = new THREE.MeshStandardMaterial({ map: brickWallTexture(th.skirt?.[0] || '#6c6e68', th.skirt?.[1] || '#4a4c48'), roughness: 0.6 });
    const bottomMat = plastic(th.skirtColor || C.dkgray);
    const color = new THREE.Color();

    for (const run of runs) {
      const idx = run.idx;
      const n = idx.length;
      if (n < 2) continue;
      // road top
      const pos = [], uv = [], col = [], ind = [];
      let dist = 0;
      for (let a = 0; a < n; a++) {
        const i = idx[a];
        if (a > 0) { const p = idx[a - 1]; dist += Math.hypot(this.px(i) - this.px(p), this.py(i) - this.py(p), this.pz(i) - this.pz(p)); }
        const hw = this.HW[i];
        for (let j = 0; j <= L; j++) {
          const lat = -hw + (2 * hw * j) / L;
          pos.push(this.px(i) + this.R[i * 2] * lat, this.py(i) + lat * this.BK[i] + 0.02, this.pz(i) + this.R[i * 2 + 1] * lat);
          uv.push(j / L, dist / (2 * hw));
          if (run.surf === 'rainbow') {
            const band = Math.min(L - 1, j - (j === L ? 1 : 0));
            color.setHSL(((band / L) + dist / 600) % 1, 1.0, 0.45);
            col.push(color.r, color.g, color.b);
          } else col.push(1, 1, 1);
        }
        if (a > 0) {
          const b0 = (a - 1) * (L + 1), b1 = a * (L + 1);
          for (let j = 0; j < L; j++) ind.push(b0 + j, b0 + j + 1, b1 + j, b0 + j + 1, b1 + j + 1, b1 + j);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(ind);
      g.computeVertexNormals();
      const road = new THREE.Mesh(g, this.surfaceMaterial(run.surf));
      road.receiveShadow = true;
      this.group.add(road);

      // shoulders (both sides) + skirt + bottom
      const sp = [], su = [], si = [];
      const kp = [], ku = [], ki = [];
      const bp = [], bi = [];
      let d2 = 0;
      for (let a = 0; a < n; a++) {
        const i = idx[a];
        if (a > 0) { const p = idx[a - 1]; d2 += Math.hypot(this.px(i) - this.px(p), this.pz(i) - this.pz(p)); }
        const hw = this.HW[i], sh = this.SH[i];
        const bank = this.SUP[i] === 'bank';
        for (const side of [-1, 1]) {
          const y = this.py(i) + side * hw * this.BK[i];
          const bottom = bank ? Math.min(this.groundY - 0.5, y - THICK) : this.py(i) - hw * Math.abs(this.BK[i]) - THICK;
          // shoulder quad strip from hw to hw+sh
          for (const lat of [hw, hw + sh]) {
            sp.push(this.px(i) + this.R[i * 2] * lat * side, y, this.pz(i) + this.R[i * 2 + 1] * lat * side);
            su.push((lat * side) / (2 * pitch), d2 / (2 * pitch));
          }
          const outer = hw + sh;
          for (const yy of [y, bottom]) {
            kp.push(this.px(i) + this.R[i * 2] * outer * side, yy, this.pz(i) + this.R[i * 2 + 1] * outer * side);
            ku.push(d2 / 4, yy / 2.4);
          }
          bp.push(this.px(i) + this.R[i * 2] * outer * side, bottom, this.pz(i) + this.R[i * 2 + 1] * outer * side);
        }
        if (a > 0) {
          // shoulders: 4 verts per sample (L0,L1,R0,R1)
          const b0 = (a - 1) * 4, b1 = a * 4;
          if (sh > 0.01) {
            si.push(b0, b0 + 1, b1, b1, b0 + 1, b1 + 1);          // left side (winding flipped below)
            si.push(b0 + 2, b1 + 2, b0 + 3, b0 + 3, b1 + 2, b1 + 3);
          }
          ki.push(b0, b1, b0 + 1, b0 + 1, b1, b1 + 1);
          ki.push(b0 + 2, b0 + 3, b1 + 2, b1 + 2, b0 + 3, b1 + 3);
          const c0 = (a - 1) * 2, c1 = a * 2;
          bi.push(c0, c0 + 1, c1, c1, c0 + 1, c1 + 1);
        }
      }
      if (si.length) {
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
        sg.setAttribute('uv', new THREE.Float32BufferAttribute(su, 2));
        sg.setIndex(si);
        sg.computeVertexNormals();
        // make normals point up regardless of winding
        const nrm = sg.attributes.normal;
        for (let v = 0; v < nrm.count; v++) nrm.setXYZ(v, 0, 1, 0);
        const sm = new THREE.Mesh(sg, shoulderMat);
        sm.material.side = THREE.DoubleSide;
        sm.receiveShadow = true;
        this.group.add(sm);
      }
      const kg = new THREE.BufferGeometry();
      kg.setAttribute('position', new THREE.Float32BufferAttribute(kp, 3));
      kg.setAttribute('uv', new THREE.Float32BufferAttribute(ku, 2));
      kg.setIndex(ki);
      kg.computeVertexNormals();
      const km = new THREE.Mesh(kg, skirtMat);
      skirtMat.side = THREE.DoubleSide;
      km.receiveShadow = true; km.castShadow = true;
      this.group.add(km);
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
      bg.setIndex(bi);
      bg.computeVertexNormals();
      const bm = new THREE.Mesh(bg, bottomMat);
      bottomMat.side = THREE.DoubleSide;
      this.group.add(bm);
    }
  }

  // ---- walls & curbs -----------------------------------------------------------
  buildWalls() {
    const th = this.theme;
    const N = this.N;
    const wallGeo = brickGeometry(2, 1, 3, 1, true, 8);
    const curbGeo = new THREE.BoxGeometry(1.6, 0.2, 1.2).translate(0, 0.1, 0);
    const placements = [], curbs = [];
    const colors = (th.wall || [C.red, C.white]).map((c) => new THREE.Color(c));
    const curbCols = (th.curb || [C.red, C.white]).map((c) => new THREE.Color(c));
    const railsL = [], fences = [];
    for (const side of [-1, 1]) {
      let acc = 0, n = 0, cacc = 0, cn = 0;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        const step = Math.hypot(this.px(j) - this.px(i), this.pz(j) - this.pz(i));
        acc += step; cacc += step;
        if (this.GAP[i]) continue;
        const e = this.EDGE[i];
        if (e === 3 && acc >= 4) {
          acc = 0; n++;
          fences.push({ i, lat: (this.HW[i] + this.SH[i] + 0.4) * side, n });
        } else if (e === 0 && acc >= 2) {
          acc = 0; n++;
          const lat = (this.HW[i] + this.SH[i] + 0.5) * side;
          for (let row = 0; row < (th.wallRows ?? 1); row++) {
            const off = (row % 2) ? 1 : 0;
            placements.push({ i, lat, y: row * 1.2, off, c: colors[(n + row) % colors.length] });
          }
        }
        if (e !== 1 && cacc >= 1.6 && this.SURF[i] === 'road' && th.curb !== null) {
          cacc = 0; cn++;
          curbs.push({ i, lat: (this.HW[i] + 0.6) * side, c: curbCols[cn % curbCols.length] });
        }
        if (e === 1 && th.rail) railsL.push({ i, side });
      }
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const Y = new THREE.Vector3(0, 1, 0);
    if (placements.length) {
      // top row gets studs; hidden lower rows are plain boxes
      const rows = th.wallRows ?? 1;
      const plainGeo = brickGeometry(2, 1, 3, 1, false);
      for (const top of [true, false]) {
        const list = placements.filter((pl) => (pl.y >= (rows - 1) * 1.2 - 0.01) === top);
        if (!list.length) continue;
        const im = new THREE.InstancedMesh(top ? wallGeo : plainGeo, plastic(0xffffff), list.length);
        list.forEach((pl, k) => {
          const i = pl.i;
          const tx = this.T[i * 3], tz = this.T[i * 3 + 2];
          q.setFromAxisAngle(Y, Math.atan2(-tz, tx));
          p.set(this.px(i) + this.R[i * 2] * pl.lat + tx * pl.off, this.surfaceY(i, pl.lat) + pl.y, this.pz(i) + this.R[i * 2 + 1] * pl.lat + tz * pl.off);
          m.compose(p, q, s);
          im.setMatrixAt(k, m);
          im.setColorAt(k, pl.c);
        });
        im.castShadow = true; im.receiveShadow = true;
        this.group.add(im);
      }
    }
    if (curbs.length) {
      const im = new THREE.InstancedMesh(curbGeo, plastic(0xffffff), curbs.length);
      curbs.forEach((c, k) => {
        const i = c.i;
        const tx = this.T[i * 3], tz = this.T[i * 3 + 2];
        q.setFromAxisAngle(Y, Math.atan2(-tz, tx));
        p.set(this.px(i) + this.R[i * 2] * c.lat, this.surfaceY(i, c.lat), this.pz(i) + this.R[i * 2 + 1] * c.lat);
        m.compose(p, q, s);
        im.setMatrixAt(k, m); im.setColorAt(k, c.c);
      });
      im.receiveShadow = true;
      this.group.add(im);
    }
    if (fences.length) {
      // posts with two rails between consecutive posts on the same side
      const fc = (th.fence || [C.white, C.red]).map((c) => new THREE.Color(c));
      const postGeo = brickGeometry(1, 1, 6, 0.8, true, 8);
      const posts = new THREE.InstancedMesh(postGeo, plastic(0xffffff), fences.length);
      const railGeo = new THREE.BoxGeometry(1, 1, 1);
      const rails = [];
      fences.forEach((f, k) => {
        p.set(this.px(f.i) + this.R[f.i * 2] * f.lat, this.surfaceY(f.i, f.lat), this.pz(f.i) + this.R[f.i * 2 + 1] * f.lat);
        m.compose(p, q.identity(), s.set(1, 1, 1));
        posts.setMatrixAt(k, m); posts.setColorAt(k, fc[0]);
        f.p = p.clone();
      });
      for (let k = 1; k < fences.length; k++) {
        const a = fences[k - 1], b = fences[k];
        if (Math.sign(a.lat) !== Math.sign(b.lat) || a.p.distanceTo(b.p) > 7) continue;
        for (const hgt of [0.8, 1.7]) rails.push([a.p, b.p, hgt, (k % 2) ? fc[1] : fc[fc.length > 2 ? 2 : 1]]);
      }
      const rm = new THREE.InstancedMesh(railGeo, plastic(0xffffff), Math.max(1, rails.length));
      const dir = new THREE.Vector3(), mid = new THREE.Vector3();
      rails.forEach(([a, b, hgt, c], k) => {
        dir.subVectors(b, a); const L = dir.length();
        mid.addVectors(a, b).multiplyScalar(0.5); mid.y += hgt;
        q.setFromAxisAngle(Y, Math.atan2(dir.x, dir.z));
        m.compose(mid, q, s.set(0.35, 0.45, L));
        rm.setMatrixAt(k, m); rm.setColorAt(k, c);
      });
      rm.count = rails.length;
      posts.castShadow = rm.castShadow = true;
      this.group.add(posts, rm);
      s.set(1, 1, 1);
    }
    if (railsL.length && th.rail) {
      // glowing edge rails for void edges
      for (const side of [-1, 1]) {
        const segs = [];
        let cur = [];
        for (let i = 0; i <= N; i++) {
          const ii = i % N;
          if (this.EDGE[ii] === 1 && !this.GAP[ii]) {
            const lat = (this.HW[ii] + 0.15) * side;
            cur.push(new THREE.Vector3(this.px(ii) + this.R[ii * 2] * lat, this.py(ii) + 0.25, this.pz(ii) + this.R[ii * 2 + 1] * lat));
          } else if (cur.length) { segs.push(cur); cur = []; }
        }
        if (cur.length) segs.push(cur);
        for (const sg of segs) {
          if (sg.length < 4) continue;
          const curve = new THREE.CatmullRomCurve3(sg);
          const g = new THREE.TubeGeometry(curve, sg.length, 0.18, 6, false);
          const mesh = new THREE.Mesh(g, plastic(th.rail, { emissive: th.rail, emissiveIntensity: 1.6 }));
          this.group.add(mesh);
        }
      }
    }
  }

  // ---- supports -----------------------------------------------------------------
  buildSupports() {
    const th = this.theme;
    if (th.noGround) return;
    const b = new BrickBuilder(1.6);
    const N = this.N;
    for (let i = 0; i < N; i += 14) {
      if (this.GAP[i] || this.SUP[i] !== 'pillar') continue;
      const y = this.py(i) - THICK;
      if (y - this.groundY < 1.5) continue;
      const hw = this.HW[i];
      const lats = hw > 7 ? [-(hw - 2.5), hw - 2.5] : [0];
      for (const lat of lats) {
        const x = this.px(i) + this.R[i * 2] * lat, z = this.pz(i) + this.R[i * 2 + 1] * lat;
        // don't drop a pillar onto a lower road
        const lower = this.roadHeightNear(x, z, y - 2);
        if (lower !== null && lower > this.groundY - 5) continue;
        let yy = this.groundY;
        const col = th.pillar || C.ltgray;
        let k = 0;
        while (yy < y - 0.1) {
          const h = Math.min(3, Math.ceil((y - yy) / (0.4 * 1.6)));
          yy = b.brick(x, yy, z, 2, 2, h, k % 2 ? col : (th.pillar2 || col), { studs: false });
          k++;
        }
      }
    }
    this.group.add(b.build({ name: 'supports' }));
  }

  // ---- start gate ------------------------------------------------------------
  buildStart() {
    const th = this.theme;
    const i = 0;
    const hw = this.HW[i], sh = this.SH[i];
    const yaw = this.yawAt(i);
    // checker line
    const tex = checkerTexture();
    tex.repeat.set(hw / 1.5, 1);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 2.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    line.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.copy(this.at(i, 0, 0.05));
    holder.rotation.y = yaw;
    line.rotation.z = 0;
    holder.add(line);
    this.group.add(holder);
    // gate
    const b = new BrickBuilder(1);
    const gate = new THREE.Group();
    gate.position.copy(this.at(i, 0, 0));
    gate.rotation.y = yaw;
    const span = hw + Math.max(sh, 1) + 2;
    const H = 11;
    const cols = th.gate || [C.red, C.white];
    for (const s of [-1, 1]) {
      let y = 0, k = 0;
      while (y < H) { y = b.brick(s * span, y, 0, 2, 2, 3, cols[k++ % cols.length], { studs: y + 1.2 >= H }); }
    }
    b.box(0, H, 0, span * 2 + 2.4, 2.4, 1.6, C.black);
    b.box(0, H + 2.4, 0, span * 2 + 2.4, 0.4, 2.0, cols[0]);
    gate.add(b.build({ name: 'gate' }));
    // banner with checker + title
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(span * 2, 2.1), new THREE.MeshStandardMaterial({ map: this.bannerTexture(), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.15, emissiveMap: this.bannerTexture() }));
    banner.position.set(0, H + 1.2, -0.82); banner.rotation.y = Math.PI;
    gate.add(banner);
    const banner2 = banner.clone(); banner2.position.z = 0.82; banner2.rotation.y = 0; gate.add(banner2);
    // start lights (5 red + green), facing -Z (towards the grid behind the line)
    this.startLights = [];
    for (let k = 0; k < 4; k++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0x000000, roughness: 0.3 });
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat);
      l.position.set((k - 1.5) * 1.6, H - 1.1, -0.9);
      gate.add(l);
      this.startLights.push(mat);
    }
    this.group.add(gate);
  }
  bannerTexture() {
    if (this._banner) return this._banner;
    this._banner = canvasTex(512, 64, (g, w, h) => {
      const n = 32;
      for (let a = 0; a < n; a++) for (let b = 0; b < 4; b++) { g.fillStyle = (a + b) % 2 ? '#111' : '#eee'; g.fillRect(a * w / n, b * h / 4, w / n, h / 4); }
      g.fillStyle = '#c91a09'; g.fillRect(w * 0.26, 4, w * 0.48, h - 8);
      g.font = 'bold 40px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#f2cd37'; g.fillText('BRICK KART', w / 2, h / 2 + 2);
    });
    this._banner.wrapS = THREE.ClampToEdgeWrapping;
    return this._banner;
  }
  setStartLights(n, go) {
    this.startLights.forEach((m, k) => {
      if (go) { m.color.setHex(0x003300); m.emissive.setHex(0x22ff44); m.emissiveIntensity = 2.5; }
      else if (k < n) { m.color.setHex(0x550000); m.emissive.setHex(0xff2010); m.emissiveIntensity = 2.5; }
      else { m.color.setHex(0x330000); m.emissive.setHex(0x000000); }
    });
  }

  // ---- item boxes -----------------------------------------------------------------
  buildItemBoxes() {
    this.itemBoxes = [];
    this.boxMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.1, emissive: 0x4444ff, emissiveIntensity: 0.5, depthWrite: false });
    const geo = brickGeometry(2, 2, 3, 1.05, true, 12).clone().translate(0, -0.63, 0);
    const qmat = new THREE.SpriteMaterial({ map: questionTexture(), depthTest: true });
    for (const k of this.def.items || []) {
      const i = this.kToIndex(k);
      const hw = this.HW[i];
      const fs = hw > 11 ? [-0.7, -0.35, 0, 0.35, 0.7] : [-0.6, -0.2, 0.2, 0.6];
      for (const f of fs) {
        const g = new THREE.Group();
        const mesh = new THREE.Mesh(geo, this.boxMat);
        g.add(mesh);
        const q = new THREE.Sprite(qmat);
        q.scale.setScalar(1.3);
        g.add(q);
        const pos = this.at(i, hw * f, 1.6);
        g.position.copy(pos);
        this.group.add(g);
        this.itemBoxes.push({ g, mesh, pos, i, active: true, timer: 0, phase: Math.random() * 6 });
      }
    }
  }

  buildBoosts() {
    this.boosts = [];
    const tex = boostTexture();
    for (const [k, f] of this.def.boosts || []) {
      const i = this.kToIndex(k);
      const hw = this.HW[i];
      const lat = f * hw;
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xff8800, emissiveIntensity: 0.9, emissiveMap: tex, roughness: 0.3 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 7), mat);
      m.rotation.x = -Math.PI / 2;
      const h = new THREE.Group();
      h.position.copy(this.at(i, lat, 0.06));
      h.rotation.y = this.yawAt(i);
      // align with slope
      h.rotation.x = -Math.asin(this.T[i * 3 + 1]);
      h.rotation.order = 'YXZ';
      h.add(m);
      this.group.add(h);
      this.boosts.push({ i, lat, mat });
    }
  }

  buildRamps() {
    this.ramps = [];
    const list = [...(this.def.ramps || []).map((k) => [k, false]), ...(this.def.gliders || []).map((k) => [k, true])];
    for (const [k, glide] of list) {
      const i = this.kToIndex(k);
      const hw = this.HW[i];
      const len = glide ? 12 : 7, h = glide ? 2.6 : 1.6;
      // wedge (triangular prism) along -Z..0, rising to +h at the lip
      const shape = new THREE.Shape();
      shape.moveTo(-len, 0); shape.lineTo(0, 0); shape.lineTo(0, h); shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: hw * 2, bevelEnabled: false });
      g.rotateY(-Math.PI / 2);
      g.translate(hw, 0, 0);
      const tex = (glide ? gliderTexture() : boostTexture()).clone();
      tex.needsUpdate = true;
      tex.repeat.set(0.1, 0.1);
      const top = glide ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, map: tex, emissive: 0x1a6aff, emissiveIntensity: 0.35 }) : new THREE.MeshStandardMaterial({ color: this.theme.ramp || C.orange, roughness: 0.4, map: tex });
      const mesh = new THREE.Mesh(g, [plastic(glide ? C.dkblue : (this.theme.rampSide || C.dkgray)), top]);
      mesh.castShadow = true; mesh.receiveShadow = true;
      const hold = new THREE.Group();
      hold.position.copy(this.at(i, 0, 0));
      hold.rotation.order = 'YXZ';
      hold.rotation.y = this.yawAt(i);
      hold.rotation.x = -Math.asin(this.T[i * 3 + 1]);
      hold.add(mesh);
      this.group.add(hold);
      this.ramps.push({ i, len, h, glide });
      if (glide) {
        // glider arch over the ramp lip
        const b = new BrickBuilder(1);
        const span = hw + 2;
        for (const sd of [-1, 1]) { let y = 0; for (let n = 0; n < 5; n++) y = b.brick(sd * span, y, 0, 2, 2, 3, n % 2 ? C.white : C.azure); }
        b.box(0, 6, 0, span * 2 + 2, 1.2, 1.6, C.blue);
        const arch = b.build({ name: 'glider-arch' });
        hold.add(arch);
      }
    }
  }

  // Chevron signs on the outside of sharp turns (skipped on void edges).
  buildSigns() {
    const N = this.N;
    const tex = chevronTexture();
    const matL = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(4.2, 2.1);
    const b = new BrickBuilder(1, 120);
    let last = -99;
    for (let i = 0; i < N; i++) {
      const c = this.CURV[i];
      if (Math.abs(c) < 0.022 || this.GAP[i] || this.EDGE[i] === 1 || i - last < 16 || this.theme.noSigns) continue;
      last = i;
      const side = c > 0 ? 1 : -1;               // outside of the turn
      const lat = (this.HW[i] + this.SH[i] + 2.2) * side;
      const p = this.at(i, lat, 0);
      const yaw = this.yawAt(i);
      b.box(p.x, p.y, p.z, 0.4, 3.2, 0.4, C.dkgray);
      const sign = new THREE.Mesh(geo, matL);
      sign.position.set(p.x, p.y + 3.4, p.z);
      // face the oncoming karts; arrows point into the turn
      sign.rotation.y = yaw + Math.PI;
      if (side < 0) sign.scale.x = -1;
      this.group.add(sign);
    }
    this.group.add(b.build({ name: 'sign-posts' }));
  }

  // static round obstacles (trees, statues, pillars on the road...)
  // height h: karts flying higher than the obstacle's top pass over it
  addObstacle(x, z, r, h = 5, y0 = null) {
    if (y0 === null) y0 = this.roadHeightNear(x, z) ?? this.groundY;
    this.obstacles.push({ x, z, r, y0, y1: y0 + h });
  }
  obstacleAt(x, y, z, r) {
    for (const o of this.obstacles) {
      const dx = x - o.x, dz = z - o.z;
      if (dx * dx + dz * dz < (o.r + r) * (o.r + r) && y > o.y0 - 2 && y < o.y1) return o;
    }
    return null;
  }

  buildStuds() {
    const list = [];
    for (const [k, f, n] of this.def.studs || []) {
      const i0 = this.kToIndex(k);
      for (let a = 0; a < n; a++) {
        const i = this.wrap(i0 + a * 4);
        list.push({ i, lat: f * this.HW[i], pos: this.at(i, f * this.HW[i], 1.0), active: true, timer: 0 });
      }
    }
    this.studs = list;
    if (!list.length) return;
    const g = new THREE.CylinderGeometry(0.55, 0.55, 0.28, 18);
    g.rotateX(Math.PI / 2);
    const top = new THREE.CylinderGeometry(0.34, 0.34, 0.2, 14).rotateX(Math.PI / 2).translate(0, 0, 0.2);
    const top2 = top.clone().translate(0, 0, -0.4);
    const merged = mergeSimple([g, top, top2]);
    this.studMesh = new THREE.InstancedMesh(merged, new THREE.MeshStandardMaterial({ color: 0xdcbc81, metalness: 0.9, roughness: 0.2, emissive: 0x6a4a00, emissiveIntensity: 0.4 }), list.length);
    this.studMesh.castShadow = true;
    this.group.add(this.studMesh);
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    this.boxMat.emissive.setHSL((t * 0.25) % 1, 1, 0.5);
    this.boxMat.color.setHSL((t * 0.25 + 0.5) % 1, 0.8, 0.7);
    for (const b of this.itemBoxes) {
      if (!b.active) {
        b.timer -= dt;
        const s = Math.max(0, 1 - Math.max(0, b.timer) / 0.5);
        if (b.timer <= 0) { b.active = true; }
        b.g.scale.setScalar(b.timer < 0.5 ? s : 0.001);
      } else b.g.scale.setScalar(1);
      b.mesh.rotation.y = t * 1.3 + b.phase;
      b.mesh.rotation.x = Math.sin(t * 0.9 + b.phase) * 0.35;
      b.g.position.y = b.pos.y + Math.sin(t * 2 + b.phase) * 0.25;
    }
    for (const bp of this.boosts) bp.mat.map.offset.y = -t * 1.5;
    if (this.conveyorMat) this.conveyorMat.map.offset.y = -t * 1.2;
    if (this.waterMat) this.waterMat.map.offset.y = -t * 0.15;
    if (this.studMesh) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
      this.studs.forEach((st, k) => {
        if (!st.active) { st.timer -= dt; if (st.timer <= 0) st.active = true; }
        q.setFromAxisAngle(Y, t * 3 + k * 0.4);
        s.setScalar(st.active ? 1 : 0.0001);
        m.compose(st.pos, q, s);
        this.studMesh.setMatrixAt(k, m);
      });
      this.studMesh.instanceMatrix.needsUpdate = true;
    }
  }

  // polyline for the minimap: normalised [0..1] coords
  minimap() {
    if (this._mini) return this._mini;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < this.N; i++) { minX = Math.min(minX, this.px(i)); maxX = Math.max(maxX, this.px(i)); minZ = Math.min(minZ, this.pz(i)); maxZ = Math.max(maxZ, this.pz(i)); }
    const size = Math.max(maxX - minX, maxZ - minZ) * 1.08;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const map = (x, z) => [0.5 + (x - cx) / size, 0.5 + (z - cz) / size];
    const pts = [];
    for (let i = 0; i < this.N; i += 4) pts.push([...map(this.px(i), this.pz(i)), this.py(i), this.GAP[i]]);
    this._mini = { pts, map };
    return this._mini;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.scene.remove(this.group);
  }
}

function mergeSimple(geos) {
  // tiny merge for indexed geometries with position/normal/uv
  let vCount = 0;
  const pos = [], nor = [], uv = [], idx = [];
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); }
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + vCount);
    vCount += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}
