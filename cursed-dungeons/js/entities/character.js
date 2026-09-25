// Blocky Minecraft-style characters: a 64x64 procedurally painted skin,
// a jointed rig, procedural animation (idle breathing, run, combo attacks,
// dodge roll, casting, hit reactions, death) and spring physics for capes
// and hair strands.
import * as THREE from 'three/webgpu';
import { uniform, texture, uv, vec3, vec4, float, mix, positionLocal, hash, floor, step, screenCoordinate, interleavedGradientNoise, sin } from 'three/tsl';
import { damp, clamp, lerp, easeOutCubic, easeInCubic, easeOutBack, mulberry32 } from '../util.js';
import { U } from '../gfx/materials.js';

export const PX = 0.058;          // world units per skin pixel
const SKIN = 64;

// ---------------------------------------------------------------- skin painter
export class Skin {
  constructor(seed = 1) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SKIN; this.canvas.height = SKIN;
    this.ctx = this.canvas.getContext('2d');
    this.r = mulberry32(seed);
  }
  px(x, y, c) { this.ctx.fillStyle = typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c; this.ctx.fillRect(x, y, 1, 1); }
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
  // Face regions helpers: front face origin for a box at (u,v,w,h,d)
  front(u, v, d) { return [u + d, v + d]; }
  back(u, v, w, d) { return [u + d + w + d, v + d]; }
  texture() {
    const t = new THREE.CanvasTexture(this.canvas);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
    return t;
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
  // bright pixels (eyes, markings) glow a little when emitStrength > 0
  const bright = step(0.92, tex.r.max(tex.g).max(tex.b));
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
    // body roll (dodge) and death fall rotate the hips around their pivot
    if (a && (a.type === 'dodge')) this.hips.rotation.x = T.rootX;
    else this.hips.rotation.x = damp(this.hips.rotation.x % (Math.PI * 2), T.rootX, snap, dt);
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
