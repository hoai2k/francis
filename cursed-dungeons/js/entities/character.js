// Blocky Minecraft-style characters: a 64x64 procedurally painted skin,
// a jointed rig, procedural animation (idle breathing, run, combo attacks,
// dodge roll, casting, hit reactions, death) and spring physics for capes
// and hair strands.
import * as THREE from 'three/webgpu';
import { uniform, texture, uv, vec2, vec3, vec4, float, mix, positionLocal, hash, floor, step, screenCoordinate, interleavedGradientNoise, sin } from 'three/tsl';
import { damp, clamp, lerp, easeOutCubic, easeInCubic, easeOutBack, mulberry32 } from '../util.js';
import { U } from '../gfx/materials.js';

export const PX = 0.058;          // world units per skin pixel
const ROLL_PIVOT = 4;             // skin pixels above the hip joint: the tucked body's centre of mass
const SKIN = 64;                  // logical skin layout (Minecraft 64x64): painting API + UVs
const HD = 2;                     // uploaded texels per logical pixel (128x128 "HD skin")
const HW = SKIN * HD;

// Surface kinds a painted pixel can carry; they drive the HD pass (fabric
// weave, hair strands, skin smoothness, metal glints) and the roughness map.
export const SKIN_MAT = { cloth: 0, skin: 1, hair: 2, eye: 3, metal: 4, leather: 5, flesh: 6, glow: 7 };
const ROUGH = [0.9, 0.55, 0.42, 0.12, 0.28, 0.5, 0.62, 0.5];

// Face table of the standard 64x64 layout: which box face each logical pixel
// belongs to, so the HD pass can shade every face like a little lit cube.
const FACE_ID = new Int16Array(SKIN * SKIN).fill(-1);
const FACES_TBL = [];
{
  const boxes = [[0, 0, 8, 8, 8, 'head'], [32, 0, 8, 8, 8, 'hat'], [16, 16, 8, 12, 4, 'body'], [16, 32, 8, 12, 4, 'body'],
    [40, 16, 4, 12, 4, 'arm'], [40, 32, 4, 12, 4, 'arm'], [32, 48, 4, 12, 4, 'arm'], [48, 48, 4, 12, 4, 'arm'],
    [0, 16, 4, 12, 4, 'leg'], [0, 32, 4, 12, 4, 'leg'], [16, 48, 4, 12, 4, 'leg'], [0, 48, 4, 12, 4, 'leg']];
  for (const [u, v, w, h, d, part] of boxes) {
    const faces = [[u + d, v, w, d, 'top'], [u + d + w, v, w, d, 'bottom'], [u, v + d, d, h, 'side'], [u + d, v + d, w, h, 'front'],
      [u + d + w, v + d, d, h, 'side'], [u + d + w + d, v + d, w, h, 'back']];
    for (const [x0, y0, fw, fh, kind] of faces) {
      const id = FACES_TBL.length; FACES_TBL.push({ x0, y0, w: fw, h: fh, kind, part });
      for (let y = y0; y < y0 + fh; y++) for (let x = x0; x < x0 + fw; x++) FACE_ID[y * SKIN + x] = id;
    }
  }
}
const NB = [0, -1, 0.8, 0, 1, 0.9, -1, 0, 0.9, 1, 0, 0.9];   // neighbour dx, dy, seam shade
const GRAD = { head: 0.08, hat: 0.08, body: 0.17, arm: 0.15, leg: 0.17 };
const hash2 = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1274126177) ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- skin painter
// Painted in 64x64 logical pixels (the Minecraft layout every model uses);
// texture() turns it into a 128x128 HD skin: each pixel becomes 2x2 texels
// with per-face lighting, seams/outlines, fabric weave and folds, hair
// strands and metal glints, plus a normal map and a roughness/emissive mask.
export class Skin {
  constructor(seed = 1) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SKIN; this.canvas.height = SKIN;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.r = mulberry32(seed);
    this.seed = seed;
    this.tags = new Uint8Array(SKIN * SKIN);
    this.mat = 'cloth';                 // surface kind for subsequent px/rect/box calls
    this.fineOps = [];
    this.stamp = new Uint32Array(SKIN * SKIN);   // last write per pixel, so later
    this.seq = 0;                                // paint covers earlier fine detail
  }
  px(x, y, c) {
    this.ctx.fillStyle = typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c; this.ctx.fillRect(x, y, 1, 1);
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix >= 0 && iy >= 0 && ix < SKIN && iy < SKIN) { this.tags[iy * SKIN + ix] = SKIN_MAT[this.mat] ?? 0; this.stamp[iy * SKIN + ix] = ++this.seq; }
  }
  rect(x, y, w, h, c, noise = 0.08) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const col = new THREE.Color(c); const f = 1 + (this.r() - 0.5) * noise;
      col.r = clamp(col.r * f, 0, 1); col.g = clamp(col.g * f, 0, 1); col.b = clamp(col.b * f, 0, 1);
      this.px(x + i, y + j, '#' + col.getHexString());
    }
  }
  // Paint all six faces of a box laid out MC-style at (u,v) with size w,h,d.
  box(u, v, w, h, d, c, noise) {
    this.rect(u + d, v, w, d, c, noise); this.rect(u + d + w, v, w, d, c, noise);
    this.rect(u, v + d, d, h, c, noise); this.rect(u + d, v + d, w, h, c, noise);
    this.rect(u + d + w, v + d, d, h, c, noise); this.rect(u + d + w + d, v + d, w, h, c, noise);
  }
  // Sub-pixel detail in logical coordinates (multiples of 0.5 address single
  // HD texels), applied after the upscale: eye highlights, lashes, thin mouths.
  fine(x, y, c, mat = 'eye') { this.fineOps.push([Math.round(x * HD), Math.round(y * HD), 1, 1, c, mat, this.seq]); }
  fineRect(x, y, w, h, c, mat = 'eye') { this.fineOps.push([Math.round(x * HD), Math.round(y * HD), Math.round(w * HD), Math.round(h * HD), c, mat, this.seq]); }
  // Face regions helpers: front face origin for a box at (u,v,w,h,d)
  front(u, v, d) { return [u + d, v + d]; }
  back(u, v, w, d) { return [u + d + w + d, v + d]; }

  // Build the HD canvases (colour, normal, mask) from the logical painting.
  buildHD() {
    const src = this.ctx.getImageData(0, 0, SKIN, SKIN).data;
    const N = HW * HW;
    const col = new Float32Array(N * 3), al = new Uint8Array(N), tag = new Uint8Array(N), emit = new Uint8Array(N);
    for (let Y = 0; Y < HW; Y++) for (let X = 0; X < HW; X++) {
      const li = (Y >> 1) * SKIN + (X >> 1), i = Y * HW + X;
      col[i * 3] = src[li * 4]; col[i * 3 + 1] = src[li * 4 + 1]; col[i * 3 + 2] = src[li * 4 + 2];
      al[i] = src[li * 4 + 3] >= 128 ? 255 : 0; tag[i] = this.tags[li];
      // same pixels that glowed on the 64px skin (bright texels) keep glowing
      emit[i] = Math.max(src[li * 4], src[li * 4 + 1], src[li * 4 + 2]) >= 246 ? 255 : 0;
    }
    const tmp = new THREE.Color();
    for (const [X0, Y0, w, h, c, mat, seq] of this.fineOps) {
      const hex = tmp.set(c).getHex();          // back to sRGB bytes, like the 2D canvas
      const rgb = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
      for (let Y = Y0; Y < Y0 + h; Y++) for (let X = X0; X < X0 + w; X++) {
        if (X < 0 || Y < 0 || X >= HW || Y >= HW || this.stamp[(Y >> 1) * SKIN + (X >> 1)] > seq) continue;
        const i = Y * HW + X; col[i * 3] = rgb[0]; col[i * 3 + 1] = rgb[1]; col[i * 3 + 2] = rgb[2]; al[i] = 255; tag[i] = SKIN_MAT[mat] ?? 3;
        emit[i] = Math.max(...rgb) >= 246 ? 255 : 0;
      }
    }
    const out = new Uint8ClampedArray(N * 4), mask = new Uint8ClampedArray(N * 4), hgt = new Float32Array(N).fill(0.5);
    const faceAt = (X, Y) => FACE_ID[(Y >> 1) * SKIN + (X >> 1)];
    const diff = (a, b) => Math.abs(col[a * 3] - col[b * 3]) + Math.abs(col[a * 3 + 1] - col[b * 3 + 1]) + Math.abs(col[a * 3 + 2] - col[b * 3 + 2]);
    const seed = this.seed * 7 + 3;
    for (let Y = 0; Y < HW; Y++) for (let X = 0; X < HW; X++) {
      const i = Y * HW + X;
      if (!al[i]) continue;
      const t = tag[i], fid = faceAt(X, Y), F = fid >= 0 ? FACES_TBL[fid] : null;
      let f = 1, local = 1;
      const rnd = hash2(X + seed, Y);
      const cx = F ? X - F.x0 * HD : X, cy = F ? Y - F.y0 * HD : Y;   // texel inside the face
      if (F) {
        const fh = F.h * HD, fw = F.w * HD;
        const fy = (cy + 0.5) / fh;
        if (F.kind === 'top') f *= 1.06;
        else if (F.kind === 'bottom') f *= 0.78;
        else {
          let amp = GRAD[F.part] ?? 0.12; if (t === 1) amp *= 0.55;
          f *= 1 + amp * (0.45 - fy);                         // lit from above, AO toward the bottom
          if (cy === 0) f *= 1.06;                            // top rim catches light
          if (cx === 0 || cx === fw - 1) f *= 0.93;           // rounded vertical edges
        }
        // folds and creases on clothing
        if (t === 0 && F.kind !== 'top' && F.kind !== 'bottom') {
          if (F.part === 'leg' && fh >= 20) { const k = Math.round(fh * 0.52); if (cy === k) local *= 0.86; else if (cy === k - 1) local *= 1.05; }
          if (F.part === 'arm' && fh >= 20) { const k = Math.round(fh * 0.42); if (cy === k) local *= 0.9; else if (cy === k - 1) local *= 1.04; }
          if (F.part === 'body' && fh >= 20 && cy > fh * 0.55 && cy < fh * 0.85 && ((cx + Math.floor(cy * 0.5) + fid) % 7 === 0)) local *= 0.93;
        }
      }
      // seams / outlines where the colour changes (clothing edges, hairline…)
      if (t !== 3 && t !== 7) {
        let s = 1;
        const sumI = col[i * 3] + col[i * 3 + 1] + col[i * 3 + 2];
        for (let d = 0; d < 4; d++) {
          const nx = X + NB[d * 3], ny = Y + NB[d * 3 + 1];
          if (nx < 0 || ny < 0 || nx >= HW || ny >= HW || faceAt(nx, ny) !== fid) continue;
          const j = ny * HW + nx;
          if (!al[j]) { s = Math.min(s, 0.82); continue; }      // edge of an overlay piece
          if (tag[j] === 3) continue;
          // a real edge: another surface kind, or a colour jump well above the paint noise
          const dj = diff(i, j), avg = (sumI + col[j * 3] + col[j * 3 + 1] + col[j * 3 + 2]) * 0.5;
          if ((tag[j] !== t && dj > 30) || dj > Math.max(90, avg * 0.3)) s = Math.min(s, NB[d * 3 + 2]);
        }
        local *= s;
      }
      // surface kinds
      switch (t) {
        case 0: local *= 1 + (rnd - 0.5) * 0.06; if (((X + Y) & 3) === 0) local *= 0.97; break;     // weave + twill
        case 1: local *= 1 + (rnd - 0.5) * 0.025; break;
        case 2: {                                                                                  // hair strands
          const strand = hash2(X * 3 + seed, F ? fid : 0), brk = hash2(X + seed * 5, Y >> 2);
          local *= 0.93 + strand * 0.12 + (brk > 0.88 ? -0.06 : 0);
          if (F && F.kind !== 'top' && F.kind !== 'bottom' && (F.part === 'head' || F.part === 'hat')) { const fy = cy / (F.h * HD); if (fy > 0.1 && fy < 0.22) local *= 1.1; }
          break;
        }
        case 4: local *= (X & 1) === 0 && (Y & 1) === 0 ? 1.35 : (X & 1) && (Y & 1) ? 0.7 : 1; break;  // round glint
        case 5: local *= 1 + (rnd - 0.5) * 0.05; if (F && cy === 0) local *= 1.12; break;
        case 6: local *= 1 + (rnd - 0.5) * 0.14; break;
      }
      f *= local;
      out[i * 4] = col[i * 3] * f; out[i * 4 + 1] = col[i * 3 + 1] * f; out[i * 4 + 2] = col[i * 3 + 2] * f; out[i * 4 + 3] = 255;
      hgt[i] = clamp(0.5 + (local - 1) * 1.6 + (t === 4 ? 0.3 : 0), 0, 1);
      mask[i * 4] = emit[i]; mask[i * 4 + 1] = ROUGH[t] * 255 * (0.92 + rnd * 0.16); mask[i * 4 + 2] = 0; mask[i * 4 + 3] = 255;
    }
    // normal map from the detail height (seams sink, glints and ridges rise)
    const nrm = new Uint8ClampedArray(N * 4);
    const H = (X, Y) => { X = clamp(X, 0, HW - 1); Y = clamp(Y, 0, HW - 1); return hgt[Y * HW + X]; };
    for (let Y = 0; Y < HW; Y++) for (let X = 0; X < HW; X++) {
      const i = Y * HW + X, fid = faceAt(X, Y);
      const same = (x2, y2) => faceAt(clamp(x2, 0, HW - 1), clamp(y2, 0, HW - 1)) === fid;
      const hx1 = same(X + 1, Y) ? H(X + 1, Y) : H(X, Y), hx0 = same(X - 1, Y) ? H(X - 1, Y) : H(X, Y);
      const hy1 = same(X, Y + 1) ? H(X, Y + 1) : H(X, Y), hy0 = same(X, Y - 1) ? H(X, Y - 1) : H(X, Y);
      let nx = -(hx1 - hx0) * 1.4, ny = (hy1 - hy0) * 1.4, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      nrm[i * 4] = (nx * 0.5 + 0.5) * 255; nrm[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; nrm[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; nrm[i * 4 + 3] = 255;
    }
    const mk = (data) => { const cv = document.createElement('canvas'); cv.width = cv.height = HW; cv.getContext('2d').putImageData(new ImageData(data, HW, HW), 0, 0); return cv; };
    return { color: mk(out), normal: mk(nrm), mask: mk(mask) };
  }
  texture() {
    const hd = this.buildHD();
    this.hdCanvas = hd.color;
    const tex = (cv, srgb) => {
      const t = new THREE.CanvasTexture(cv);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const t = tex(hd.color, true);
    t.userData.skinMaps = { normalMap: tex(hd.normal, false), maskMap: tex(hd.mask, false) };
    return t;
  }
  // Hair strand boxes: streaky, slightly glossy material (sheen along strands).
  static hairMaterial(color, emissive = 0) {
    const m = new THREE.MeshStandardNodeMaterial({ color, roughness: 0.46, emissive: emissive ? color : 0x000000, emissiveIntensity: emissive });
    const c = new THREE.Color(color);
    const u = uv();
    const strand = hash(floor(u.x.mul(6)).add(floor(u.y.mul(3)).mul(17.0)));
    const streak = strand.mul(0.2).add(0.88).mul(u.y.mul(0.16).add(0.92));
    m.colorNode = vec3(c.r, c.g, c.b).mul(streak);
    m.roughnessNode = float(0.38).add(strand.mul(0.16));
    return m;
  }
}

// Box geometry with MC-style UV unwrap. Pivot offset lets limbs hang from a joint.
export function skinBox(w, h, d, u, v, { inflate = 0, pivot = [0, 0, 0] } = {}) {
  const g = new THREE.BoxGeometry((w + inflate) * PX, (h + inflate) * PX, (d + inflate) * PX);
  const uvA = g.attributes.uv;
  const S = SKIN;
  // faces in BoxGeometry order: +x, -x, +y, -y, +z, -z (4 verts each)
  // +z is the character's front.
  const rects = [
    [u + d + w, v + d, d, h],      // +x : character's left side
    [u, v + d, d, h],              // -x : right side
    [u + d, v, w, d],              // +y : top
    [u + d + w, v, w, d],          // -y : bottom
    [u + d, v + d, w, h],          // +z : front
    [u + d + w + d, v + d, w, h],  // -z : back
  ];
  for (let f = 0; f < 6; f++) {
    const [x, y, rw, rh] = rects[f];
    const u0 = x / S, u1 = (x + rw) / S, v0 = 1 - (y + rh) / S, v1 = 1 - y / S;
    // BoxGeometry vertex order per face: (0,1) (1,1) (0,0) (1,0)
    const quad = [[u0, v1], [u1, v1], [u0, v0], [u1, v0]];
    if (f === 3) { quad[0] = [u0, v0]; quad[1] = [u1, v0]; quad[2] = [u0, v1]; quad[3] = [u1, v1]; }
    for (let k = 0; k < 4; k++) uvA.setXY(f * 4 + k, quad[k][0], quad[k][1]);
  }
  g.translate(pivot[0] * PX, pivot[1] * PX, pivot[2] * PX);
  return g;
}

export const FLASH_MATERIAL = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
FLASH_MATERIAL.colorNode = vec3(2.2, 2.2, 2.2);

// Character material with hit-flash, emissive tint, elite glow and dissolve.
export function makeCharMaterial(map, opts = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ map, roughness: opts.roughness ?? 0.8, metalness: 0 });
  const flash = uniform(0), glow = uniform(new THREE.Color(0, 0, 0)), dissolve = uniform(0), emitMask = uniform(opts.emitStrength ?? 0);
  const tex = texture(map, uv());
  const maps = map?.userData?.skinMaps;
  let bright;
  if (maps) {
    // HD skin: per-texel roughness (G) and glow mask (R) + fabric/seam normals
    m.roughnessMap = maps.maskMap; m.roughness = clamp((opts.roughness ?? 0.8) / 0.8, 0.5, 1.25);
    m.normalMap = maps.normalMap; m.normalScale = new THREE.Vector2(0.9, 0.9);
    bright = texture(maps.maskMap, uv()).r;
  } else {
    // bright pixels (eyes, markings) glow a little when emitStrength > 0
    bright = step(0.92, tex.r.max(tex.g).max(tex.b));
  }
  const fill = uniform(opts.fill ?? 0.06);
  m.emissiveNode = mix(tex.rgb.mul(bright).mul(emitMask).add(glow).add(tex.rgb.mul(fill)), vec3(1, 1, 1).mul(2.2), flash);
  const n = interleavedGradientNoise(screenCoordinate.xy);
  m.maskNode = n.greaterThan(dissolve);
  m.userData = { flash, glow, dissolve, emitMask };
  return m;
}

// ---------------------------------------------------------------- rig
// A spec describes the body. Defaults give a MCD-proportioned humanoid.
export class Rig {
  constructor(spec) {
    this.spec = spec;
    this.root = new THREE.Group();
    this.material = spec.material;
    const M = this.material;
    const s = spec.scale ?? 1;
    this.root.scale.setScalar(s);
    this.meshes = [];
    const mesh = (g, mat = M) => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.userData.baseMat = mat; this.meshes.push(m); return m; };
    this.mesh = mesh;
    const legH = spec.legH ?? 12, bodyH = spec.bodyH ?? 12, bodyW = spec.bodyW ?? 8, bodyD = spec.bodyD ?? 4, armW = spec.armW ?? 4, headS = spec.headS ?? 8;
    this.dims = { legH, bodyH, bodyW, bodyD, armW, headS };
    // hips
    this.hips = new THREE.Group(); this.hips.position.y = legH * PX; this.root.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    this.torso.add(mesh(skinBox(bodyW, bodyH, bodyD, 16, 16, { pivot: [0, bodyH / 2, 0] })));
    if (spec.jacket !== false) this.torso.add(mesh(skinBox(bodyW, bodyH, bodyD, 16, 32, { inflate: 0.5, pivot: [0, bodyH / 2, 0] })));
    // head
    this.neck = new THREE.Group(); this.neck.position.y = bodyH * PX; this.torso.add(this.neck);
    this.head = new THREE.Group(); this.neck.add(this.head);
    const hs = headS / 8;
    const headMesh = mesh(skinBox(8, 8, 8, 0, 0, { pivot: [0, 4, 0] })); headMesh.scale.setScalar(hs * 1.12); this.head.add(headMesh);
    const hat = mesh(skinBox(8, 8, 8, 32, 0, { inflate: 1, pivot: [0, 4, 0] })); hat.scale.setScalar(hs * 1.12); this.head.add(hat);
    this.headMesh = headMesh;
    // arms
    const armY = (bodyH - 2) * PX, armX = (bodyW / 2 + armW / 2) * PX;
    this.armR = new THREE.Group(); this.armR.position.set(-armX, armY, 0); this.torso.add(this.armR);
    this.armL = new THREE.Group(); this.armL.position.set(armX, armY, 0); this.torso.add(this.armL);
    this.armR.add(mesh(skinBox(armW, 12, 4, 40, 16, { pivot: [0, -4, 0] })));
    this.armR.add(mesh(skinBox(armW, 12, 4, 40, 32, { inflate: 0.5, pivot: [0, -4, 0] })));
    this.armL.add(mesh(skinBox(armW, 12, 4, 32, 48, { pivot: [0, -4, 0] })));
    this.armL.add(mesh(skinBox(armW, 12, 4, 48, 48, { inflate: 0.5, pivot: [0, -4, 0] })));
    this.handR = new THREE.Group(); this.handR.position.y = -10 * PX; this.armR.add(this.handR);
    this.handL = new THREE.Group(); this.handL.position.y = -10 * PX; this.armL.add(this.handL);
    // legs
    this.legR = new THREE.Group(); this.legR.position.set(-2 * PX, 0, 0); this.hips.add(this.legR);
    this.legL = new THREE.Group(); this.legL.position.set(2 * PX, 0, 0); this.hips.add(this.legL);
    this.legR.add(mesh(skinBox(4, legH, 4, 0, 16, { pivot: [0, -legH / 2, 0] })));
    this.legL.add(mesh(skinBox(4, legH, 4, 16, 48, { pivot: [0, -legH / 2, 0] })));
    // hair strands (spring physics)
    this.strands = [];
    for (const h of spec.hair || []) {
      const piv = new THREE.Group(); piv.position.set(h.x * PX * hs * 1.12, h.y * PX * hs * 1.12, h.z * PX * hs * 1.12);
      const hm = new THREE.Mesh(new THREE.BoxGeometry(h.w * PX, h.h * PX, h.d * PX).translate(0, h.h * PX / 2 * (h.hang ? -1 : 1), 0), h.material || spec.hairMaterial);
      hm.castShadow = true; hm.rotation.set(h.rx || 0, h.ry || 0, h.rz || 0); hm.userData.baseMat = hm.material; this.meshes.push(hm);
      piv.add(hm); this.head.add(piv);
      this.strands.push({ g: piv, ax: 0, az: 0, vx: 0, vz: 0, stiff: h.stiff ?? 60, base: [0, 0] });
    }
    // cape: chain of segments
    this.cape = [];
    if (spec.cape) {
      const cm = spec.cape.material;
      // plain cape colour → woven cloth with soft vertical folds
      if (cm && cm.isNodeMaterial && !cm.colorNode && !cm.map && !cm.userData.cloth) {
        cm.userData.cloth = true;
        const u = uv();
        const fold = sin(u.x.mul(Math.PI * 6)).mul(0.07).add(0.95);
        const weave = hash(floor(u.mul(vec2(48, 16)))).mul(0.07).add(0.965);
        cm.colorNode = vec3(cm.color.r, cm.color.g, cm.color.b).mul(fold).mul(weave);
        cm.roughness = Math.max(cm.roughness, 0.9);
      }
      let parent = new THREE.Group(); parent.position.set(0, (bodyH - 0.5) * PX, -(bodyD / 2 + 0.6) * PX); this.torso.add(parent);
      const segs = spec.cape.segments ?? 4, segH = (spec.cape.length ?? 20) / segs;
      for (let i = 0; i < segs; i++) {
        const seg = new THREE.Group(); if (i > 0) seg.position.y = -segH * PX;
        const w = (spec.cape.width ?? bodyW + 2) * (1 + i * 0.06);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, segH * PX, 0.6 * PX).translate(0, -segH * PX / 2, 0), cm);
        m.castShadow = true; m.userData.baseMat = cm; this.meshes.push(m); seg.add(m); parent.add(seg);
        this.cape.push({ g: seg, a: 0.1, v: 0 });
        parent = seg;
      }
    }
    // extras (weapons/props)
    this.extras = {};
    // animation state
    this.pose = {};
    this.t = Math.random() * 10;
    this.lastPos = new THREE.Vector3();
    this.lastVel = new THREE.Vector3();
  }

  // params: { speed (0..1), vel(Vector3), dt, action: {type, t(0..1), step, dir}, facing, ground }
  animate(p) {
    const dt = p.dt; this.t += dt;
    const t = this.t;
    const run = clamp(p.speed ?? 0, 0, 1);
    const cyc = t * (7 + run * 5);
    const sw = Math.sin(cyc) * run;
    // base targets
    const T = {
      hipsY: this.dims.legH * PX + Math.abs(Math.cos(cyc)) * 0.06 * run + Math.sin(t * 2.2) * 0.01 * (1 - run),
      torsoX: 0.08 * run, torsoY: 0, torsoZ: 0,
      headX: -0.05 * run + Math.sin(t * 2.2) * 0.02, headY: 0,
      armRX: -sw * 1.0, armRZ: 0.06 + Math.sin(t * 2.2) * 0.02 * (1 - run), armRY: 0,
      armLX: sw * 1.0, armLZ: -0.06 - Math.sin(t * 2.2) * 0.02 * (1 - run), armLY: 0,
      legRX: sw * 1.0, legLX: -sw * 1.0, legRZ: 0, legLZ: 0,
      rootX: 0, rootZ: 0, lift: 0,
    };
    // airborne (jumping / falling): arms up and out, knees tucked on the way up
    if (p.air != null && !p.action) {
      const up = clamp(p.air / 9, -1, 1);
      T.armRX = -0.9 - up * 0.5; T.armLX = -0.9 - up * 0.5; T.armRZ = 0.45; T.armLZ = -0.45;
      T.legRX = -0.6 * Math.max(0, up) + 0.15; T.legLX = 0.35 * Math.max(0, up) - 0.25; T.torsoX = -0.08 * up;
    }
    // breathing
    const breath = 1 + Math.sin(t * 2.2) * 0.012 * (1 - run);
    this.torso.scale.set(breath, 1 + (breath - 1) * 0.5, breath);
    const a = p.action;
    let snap = 18;
    if (a) {
      const k = a.t;
      switch (a.type) {
        case 'attack': this.attackPose(T, a, k); snap = 40; break;
        case 'dodge': {
          // forward roll: whole body tucks and rotates about X
          const rk = easeOutCubic(clamp(k, 0, 1));
          T.rootX = rk * Math.PI * 2; T.lift = Math.sin(k * Math.PI) * 0.35;
          T.legRX = -1.4; T.legLX = -1.2; T.armRX = -1.8; T.armLX = -1.8; T.headX = 0.4; T.torsoX = 0.6;
          snap = 50; break;
        }
        case 'cast': {
          // one or both hands forward, fingers "sign"
          const both = a.both;
          const e = k < 0.25 ? easeOutCubic(k / 0.25) : 1;
          T.armRX = lerp(T.armRX, -1.55, e); T.armRY = lerp(0, -0.2, e); T.armRZ = 0;
          if (both) { T.armLX = lerp(T.armLX, -1.55, e); T.armLY = 0.2; T.armLZ = 0; }
          T.torsoY = lerp(0, 0.35, e) * (both ? 0 : 1);
          T.headX = 0.05; snap = 30; break;
        }
        case 'raise': { // overhead / domain hand sign
          T.armRX = -2.6; T.armLX = -0.9; T.armLY = 0.6; T.armRZ = 0.3; T.headX = -0.25; T.torsoX = -0.12; snap = 20; break;
        }
        case 'sign': { // hands together in front of chest (domain expansion)
          T.armRX = -1.25; T.armRY = 0.6; T.armRZ = 0.2; T.armLX = -1.25; T.armLY = -0.6; T.armLZ = -0.2; T.headX = 0.1; T.torsoX = 0.02; snap = 16; break;
        }
        case 'hit': {
          const e = Math.sin(clamp(k, 0, 1) * Math.PI);
          T.torsoX = -0.45 * e; T.headX = -0.4 * e; T.armRX = -0.6 * e; T.armLX = -0.6 * e; T.armRZ = 0.5 * e; T.armLZ = -0.5 * e; snap = 30; break;
        }
        case 'death': {
          const e = easeInCubic(clamp(k * 1.4, 0, 1));
          T.rootX = -Math.PI / 2 * e; T.lift = 0.1 * Math.sin(e * Math.PI); T.armRZ = 0.8 * e; T.armLZ = -0.8 * e; T.headX = -0.3 * e; snap = 25; break;
        }
        case 'stagger': { T.torsoX = 0.4; T.headX = 0.5; T.armRX = 0.2; T.armLX = 0.2; T.armRZ = 0.4; T.armLZ = -0.4; break; }
        case 'down': { T.rootX = -Math.PI / 2; T.lift = 0.05; T.armRZ = 0.8; T.armLZ = -0.8; snap = 12; break; }
      }
    }
    const L = (obj, key, target, ax) => { obj.rotation[ax] = damp(obj.rotation[ax], target, snap, dt); };
    this.hips.position.y = damp(this.hips.position.y, T.hipsY + T.lift, snap, dt);
    L(this.torso, 'torsoX', T.torsoX, 'x'); L(this.torso, 'torsoY', T.torsoY, 'y'); L(this.torso, 'torsoZ', T.torsoZ, 'z');
    L(this.head, 'headX', T.headX, 'x'); L(this.head, 'headY', T.headY, 'y');
    L(this.armR, 'armRX', T.armRX, 'x'); L(this.armR, 'armRY', T.armRY, 'y'); L(this.armR, 'armRZ', T.armRZ, 'z');
    L(this.armL, 'armLX', T.armLX, 'x'); L(this.armL, 'armLY', T.armLY, 'y'); L(this.armL, 'armLZ', T.armLZ, 'z');
    L(this.legR, 'legRX', T.legRX, 'x'); L(this.legL, 'legLX', T.legLX, 'x');
    L(this.legR, 'legRZ', T.legRZ, 'z'); L(this.legL, 'legLZ', T.legLZ, 'z');
    // The dodge roll spins the tucked body about its centre of mass (a few
    // pixels above the hip joint), not the joint itself: the hips orbit that
    // point, so the character tumbles in place instead of cartwheeling round
    // its waist. The death fall still pivots at the hips.
    if (a && (a.type === 'dodge')) {
      const th = T.rootX, d = ROLL_PIVOT * PX;
      this.hips.rotation.x = th;
      this.hips.position.y = T.hipsY + T.lift + d * (1 - Math.cos(th));
      this.hips.position.z = -d * Math.sin(th);
    } else {
      // wrap to (-π, π] first, so finishing a full roll (2π) settles forward
      // instead of unwinding a whole turn backwards
      const rx = this.hips.rotation.x, wrapped = rx - Math.PI * 2 * Math.round(rx / (Math.PI * 2));
      this.hips.rotation.x = damp(wrapped, T.rootX, snap, dt);
      this.hips.position.z = damp(this.hips.position.z, 0, snap, dt);
    }
    this.physics(p);
  }
  attackPose(T, a, k) {
    // wind-up (0..w), strike (w..s), recover (s..1)
    const w = a.windup ?? 0.25, s = a.strike ?? 0.5;
    const phase = k < w ? 0 : k < s ? 1 : 2;
    const e = phase === 0 ? easeOutCubic(k / w) : phase === 1 ? easeOutBack((k - w) / (s - w)) : 1 - easeInCubic((k - s) / (1 - s)) * 0.7;
    const style = a.style || ['swingR', 'swingL', 'slam'][a.step % 3];
    T.legRX = 0.35; T.legLX = -0.35;
    switch (style) {
      case 'swingR': // right hand horizontal swing / hook
        if (phase === 0) { T.armRX = -1.3 * e; T.armRY = 0.9 * e; T.armRZ = 0.8 * e; T.torsoY = 0.6 * e; }
        else { T.armRX = -1.5; T.armRY = lerp(0.9, -0.9, Math.min(1, e)); T.armRZ = lerp(0.8, -0.1, Math.min(1, e)); T.torsoY = lerp(0.6, -0.7, Math.min(1, e)); }
        T.armLX = -0.4; break;
      case 'swingL':
        if (phase === 0) { T.armLX = -1.3 * e; T.armLY = -0.9 * e; T.armLZ = -0.8 * e; T.torsoY = -0.6 * e; }
        else { T.armLX = -1.5; T.armLY = lerp(-0.9, 0.9, Math.min(1, e)); T.armLZ = lerp(-0.8, 0.1, Math.min(1, e)); T.torsoY = lerp(-0.6, 0.7, Math.min(1, e)); }
        T.armRX = -0.4; break;
      case 'punch': // straight jab with right
        if (phase === 0) { T.armRX = -1.0 * e; T.armRZ = 0.3; T.torsoY = 0.5 * e; }
        else { T.armRX = -1.57; T.armRZ = 0; T.torsoY = lerp(0.5, -0.4, Math.min(1, e)); T.torsoX = 0.2; }
        T.armLX = -1.1; T.armLY = -0.4; break;
      case 'slam': // overhead two-handed slam
        if (phase === 0) { T.armRX = -2.9 * e; T.armLX = -2.9 * e; T.torsoX = -0.25 * e; T.headX = -0.2 * e; }
        else { T.armRX = lerp(-2.9, -0.9, Math.min(1, e)); T.armLX = lerp(-2.9, -0.9, Math.min(1, e)); T.torsoX = lerp(-0.25, 0.45, Math.min(1, e)); T.headX = 0.2; }
        T.lift = phase === 0 ? 0.12 * e : 0; break;
      case 'uppercut':
        if (phase === 0) { T.armRX = 0.4 * e; T.torsoX = 0.3 * e; T.lift = -0.08 * e; }
        else { T.armRX = lerp(0.4, -2.8, Math.min(1, e)); T.torsoX = lerp(0.3, -0.3, Math.min(1, e)); T.lift = 0.15 * e; }
        break;
      case 'spin':
        T.torsoY = (phase === 0 ? 0.4 * e : lerp(0.4, -Math.PI * 1.8, Math.min(1, e))); T.armRX = -1.5; T.armLX = -1.5; T.armRZ = 1.2; T.armLZ = -1.2; break;
      case 'throw':
        if (phase === 0) { T.armRX = -2.6 * e; T.armRZ = 0.2; T.torsoY = 0.4 * e; }
        else { T.armRX = lerp(-2.6, -1.2, Math.min(1, e)); T.torsoY = lerp(0.4, -0.3, Math.min(1, e)); }
        T.armLX = -0.8; break;
    }
  }
  physics(p) {
    const dt = Math.min(p.dt, 1 / 30);
    const v = p.vel || this.lastVel;
    // local velocity (in character space) to swing capes/hair backwards
    const yaw = this.root.rotation.y;
    const fwd = v.x * Math.sin(yaw) + v.z * Math.cos(yaw);
    const side = v.x * Math.cos(yaw) - v.z * Math.sin(yaw);
    const acc = (fwd - (this._lastFwd ?? 0)) / Math.max(dt, 1e-3); this._lastFwd = fwd;
    const wind = Math.sin(this.t * 1.7) * 0.05 + Math.sin(this.t * 4.3) * 0.03;
    let parentAngle = 0;
    for (let i = 0; i < this.cape.length; i++) {
      const c = this.cape[i];
      const target = clamp(0.08 + Math.max(0, fwd) * 0.09 * (1 + i * 0.25) + wind * (i + 1) - Math.min(0, fwd) * 0.02, -0.2, 1.2) - parentAngle * 0.15;
      const a = (target - c.a) * 90 - c.v * 11 - acc * 0.004 * (i + 1);
      c.v += a * dt; c.a += c.v * dt;
      c.a = clamp(c.a, -0.6, 1.5);
      c.g.rotation.x = c.a - (i ? this.cape[i - 1].a * 0.6 : 0);
      c.g.rotation.z = clamp(-side * 0.03, -0.3, 0.3);
      parentAngle = c.a;
    }
    for (const s of this.strands) {
      const tx = clamp(fwd * 0.05, -0.2, 0.5) + wind, tz = clamp(-side * 0.04, -0.4, 0.4);
      s.vx += ((tx - s.ax) * s.stiff - s.vx * 8 - acc * 0.003) * dt; s.ax += s.vx * dt;
      s.vz += ((tz - s.az) * s.stiff - s.vz * 8) * dt; s.az += s.vz * dt;
      s.g.rotation.x = s.ax; s.g.rotation.z = s.az;
    }
  }
  setFlash(v) { this.material.userData.flash.value = v; }
  // Swap every part to a shared material (hit flash / elite glow) without
  // creating per-instance materials, so spawning never recompiles shaders.
  swap(mat) { if (this._swapped === mat) return; this._swapped = mat; for (const m of this.meshes) m.material = mat || m.userData.baseMat; }
  setGlow(color) { this.material.userData.glow.value.set(color); }
  setDissolve(v) { this.material.userData.dissolve.value = v; }
}
