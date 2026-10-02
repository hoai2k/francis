// Shared cursed-energy visuals for the Jujutsu Kaisen abilities (see jjk.js).
// Everything heavy (geometries, brick shells, textures, dog models) is built once and
// shared; per-use objects only own the materials whose opacity they animate, and
// release them through disposeOwned().
import * as THREE from 'three';
import { BrickBuilder, C, plastic, brickGeometry } from '../lego.js';
import { glowTex, divineDog } from '../maps/jjk-props.js';

const cache = new Map();
export const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
export const UP = new THREE.Vector3(0, 1, 0);

// ---- owned resources ---------------------------------------------------------------
// materials/geometries made for one effect are tagged so dispose can free exactly those
export function own(x) { x.userData.own = true; return x; }
export function disposeOwned(root) {
  if (!root) return;
  root.parent?.remove(root);
  root.traverse((o) => {
    if (o.isInstancedMesh && o.userData.own) o.dispose();
    if (o.geometry?.userData.own) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) if (m.userData.own) m.dispose();
  });
}

// additive glow sprite with its own (fadeable) material
export function glowSprite(color, size, opacity = 1) {
  const s = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  s.scale.setScalar(size);
  return s;
}
export const basic = (color, opts = {}) => own(new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, fog: false, ...opts }));
export const additive = (color, opacity = 1, opts = {}) => basic(color, { opacity, blending: THREE.AdditiveBlending, ...opts });

// Fresnel rim glow: bright at grazing angles, clear in the middle (bubble / aura shells)
export function rimMaterial(color, power = 2.5, opacity = 1) {
  return own(new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opacity }, power: { value: power } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 color; uniform float opacity; uniform float power; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), power); gl_FragColor = vec4(color * (0.08 + f) * opacity, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
}

export const sphereGeo = () => once('sph', () => new THREE.SphereGeometry(1, 28, 18));
export const lowSphereGeo = () => once('sph-lo', () => new THREE.SphereGeometry(1, 16, 10));
export const discGeo = () => once('disc', () => new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2));
export const planeGeo = () => once('plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));

// ---- canvas textures ------------------------------------------------------------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Infinite Void sky: deep blue-black space, nebula smears and thousands of stars
export const starTex = () => once('stars', () => canvasTex(1024, 512, (g, W, H) => {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#02020a'); bg.addColorStop(0.5, '#070726'); bg.addColorStop(1, '#0c0530');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 14; k++) {
    const x = rnd() * W, y = rnd() * H, r = 50 + rnd() * 140;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const c = ['80,60,255', '40,140,255', '200,80,255', '20,200,255'][k % 4];
    gr.addColorStop(0, `rgba(${c},0.32)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    if (x < r) { g.save(); g.translate(W, 0); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  }
  for (let k = 0; k < 1800; k++) {
    const x = rnd() * W, y = rnd() * H, b = rnd();
    g.fillStyle = b > 0.96 ? '#bff4ff' : b > 0.88 ? '#d8c8ff' : `rgba(255,255,255,${0.45 + b * 0.55})`;
    const sz = b > 0.97 ? 4 : b > 0.75 ? 3 : 2;
    g.fillRect(x, y, sz, sz);
    if (b > 0.985) {
      const gr = g.createRadialGradient(x + 2, y + 2, 0, x + 2, y + 2, 12);
      gr.addColorStop(0, 'rgba(200,240,255,0.8)'); gr.addColorStop(1, 'rgba(200,240,255,0)');
      g.fillStyle = gr; g.fillRect(x - 10, y - 10, 24, 24);
      g.fillStyle = '#fff'; g.fillRect(x - 9, y + 1, 22, 2); g.fillRect(x + 1, y - 9, 2, 22);
    }
  }
  // a bright spiral galaxy on each side
  for (const [gx, gy] of [[260, 200], [780, 300]]) {
    g.save(); g.translate(gx, gy); g.scale(1, 0.45);
    for (let k = 0; k < 500; k++) {
      const arm = k % 2, r = rnd() * 90, an = r * 0.06 + arm * Math.PI + rnd() * 0.6;
      g.fillStyle = `rgba(${200 + rnd() * 55},${200 + rnd() * 55},255,${0.3 + rnd() * 0.5})`;
      g.fillRect(Math.cos(an) * r, Math.sin(an) * r, 2, 2);
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 40);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(160,140,255,0)');
    g.fillStyle = gr; g.fillRect(-40, -40, 80, 80);
    g.restore();
  }
}));
// radial texture: a glowing ring (the "eye" of the void) or a soft shadow pool
export const ringTex = () => once('ring', () => canvasTex(256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.08, 'rgba(200,240,255,0.9)'); gr.addColorStop(0.16, 'rgba(40,80,200,0.05)');
  gr.addColorStop(0.5, 'rgba(60,120,255,0.0)'); gr.addColorStop(0.62, 'rgba(160,230,255,0.95)'); gr.addColorStop(0.68, 'rgba(255,255,255,1)');
  gr.addColorStop(0.76, 'rgba(120,90,255,0.35)'); gr.addColorStop(1, 'rgba(40,20,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  // light streams pouring out of the ring
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 48; k++) {
    const a = k / 48 * Math.PI * 2 + (k % 3) * 0.03, r0 = 84, r1 = 100 + (k * 37 % 28);
    g.strokeStyle = `rgba(190,235,255,${0.12 + (k % 4) * 0.06})`; g.lineWidth = 2;
    g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); g.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); g.stroke();
  }
}));
export const poolTex = () => once('pool', () => canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(8,0,18,0.97)'); gr.addColorStop(0.78, 'rgba(70,10,120,0.8)'); gr.addColorStop(0.9, 'rgba(150,60,255,0.45)'); gr.addColorStop(1, 'rgba(60,0,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}));

// ---- brick shells / models --------------------------------------------------------------
// a ball of 1x1 bricks pointing outwards (radius 1) -- cursed energy, LEGO style
export function brickShell(key, colors, n = 110, pitch = 0.24) {
  const tpl = once('shell-' + key, () => {
    const b = new BrickBuilder(pitch);
    const geo = brickGeometry(1, 1, 2, pitch, true, 8);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), n3 = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    const mats = colors.map(([c, e, k]) => plastic(c, { emissive: e, emissiveIntensity: k }));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996;
      n3.set(Math.cos(a) * r, y, Math.sin(a) * r);
      q.setFromUnitVectors(UP, n3);
      p.copy(n3).multiplyScalar(0.86 + (i % 3) * 0.05);
      b.addMatrix(geo, mats[i % mats.length], m.compose(p, q, sc));
    }
    return b.build({ shadows: false, receive: false, name: 'cursed-shell' });
  });
  return tpl.clone();
}

// a brick fist (punching along +Z), black with glowing red knuckle seams
export function fistModel() {
  return once('fist', () => {
    const b = new BrickBuilder(1);
    const dark = 0x141418, seam = { matOpts: { emissive: 0xff1a0a, emissiveIntensity: 2.4 } };
    b.box(0, -0.45, -0.1, 0.95, 0.9, 0.8, dark);                  // palm block
    for (let f = 0; f < 4; f++) {
      const x = -0.36 + f * 0.24;
      b.box(x, -0.3, 0.32, 0.22, 0.62, 0.34, dark);                // curled fingers
      b.box(x, 0.33, 0.33, 0.2, 0.04, 0.3, 0xff2a1a, seam);        // glowing knuckle seams
    }
    b.box(-0.55, -0.42, 0.1, 0.24, 0.32, 0.6, dark);               // thumb
    b.box(0, -0.5, -0.65, 0.7, 0.75, 0.45, 0x2a2a30);              // wrist cuff
    b.box(0, -0.13, -0.88, 0.72, 0.06, 0.06, 0xff2a1a, seam);
    return b.build({ shadows: false, receive: false, name: 'black-flash-fist' });
  }).clone();
}

// shadow dogs: shared models, cloned per summon
export function dogModel(white) {
  return once(white ? 'dogW' : 'dogB', () => divineDog(white ? C.white : 0x17171e, 1.15)).clone();
}

// ---- lightning --------------------------------------------------------------------------
// N jagged bolts of `segs` segments each, drawn with two instanced box meshes:
// a dark core and a wider additive glow around it.
const segGeo = () => once('seg', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5));
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _p0 = new THREE.Vector3(), _p1 = new THREE.Vector3(), _d = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3();
const _m = new THREE.Matrix4(), _s = new THREE.Vector3();
export class Bolts {
  constructor(n, segs, { core = 0x050005, glow = 0xff1a1a, glowOpacity = 0.9, glowScale = 3.2 } = {}) {
    this.n = n; this.segs = segs; this.gs = glowScale;
    this.group = new THREE.Group();
    // the dark core draws after (on top of) its glow, so the bolts read as black lightning
    this.core = own(new THREE.InstancedMesh(segGeo(), own(new THREE.MeshBasicMaterial({ color: core, fog: false, transparent: true, opacity: 1 })), n * segs));
    this.core.renderOrder = 3;
    this.glowMat = own(new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: glowOpacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.glow = own(new THREE.InstancedMesh(segGeo(), this.glowMat, n * segs));
    for (const m of [this.core, this.glow]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; this.group.add(m); }
    this.pts = new Float32Array((segs + 1) * 3);
  }
  // bolt j from a to b (jitter = sideways wobble, w = core thickness)
  set(j, ax, ay, az, bx, by, bz, jitter, w) {
    const S = this.segs, P = this.pts;
    _a.set(ax, ay, az); _b.set(bx, by, bz);
    _d.subVectors(_b, _a);
    _u.set(-_d.z, 0, _d.x); if (_u.lengthSq() < 1e-6) _u.set(1, 0, 0); _u.normalize();
    _v.crossVectors(_d, _u).normalize();
    for (let s = 0; s <= S; s++) {
      const f = s / S, e = s === 0 || s === S ? 0.15 : 1;
      const o1 = (Math.random() - 0.5) * 2 * jitter * e, o2 = (Math.random() - 0.5) * 2 * jitter * e;
      P[s * 3] = ax + _d.x * f + _u.x * o1 + _v.x * o2;
      P[s * 3 + 1] = ay + _d.y * f + _u.y * o1 + _v.y * o2;
      P[s * 3 + 2] = az + _d.z * f + _u.z * o1 + _v.z * o2;
    }
    for (let s = 0; s < S; s++) {
      _p0.fromArray(P, s * 3); _p1.fromArray(P, s * 3 + 3);
      const len = _p0.distanceTo(_p1) + w * 0.6;
      const taper = 1 - s / S * 0.55;
      _m.lookAt(_p1, _p0, Math.abs(_d.y) > 0.95 * _d.length() ? _u : UP);
      _m.scale(_s.set(w * taper, w * taper, len)); _m.setPosition(_p0);
      this.core.setMatrixAt(j * S + s, _m);
      _m.lookAt(_p1, _p0, Math.abs(_d.y) > 0.95 * _d.length() ? _u : UP);
      _m.scale(_s.set(w * this.gs * taper, w * this.gs * taper, len)); _m.setPosition(_p0);
      this.glow.setMatrixAt(j * S + s, _m);
    }
  }
  show(nBolts) {
    this.core.count = this.glow.count = nBolts * this.segs;
    this.core.instanceMatrix.needsUpdate = this.glow.instanceMatrix.needsUpdate = true;
  }
}

// sound helpers (non-positional tones scaled by distance to the listener)
export function vol(ctx, pos) { return ctx.audio.att ? ctx.audio.att(pos) : 1; }
export function humanNear(ctx, pos, r) { return ctx.race.cams?.some((c) => c.kart.pos.distanceTo(pos) < r); }
export function shake(ctx, k, amt) { const c = ctx.race.cams?.find((c) => c.kart === k); if (c && c.chase) c.chase.shake = Math.max(c.chase.shake || 0, amt); }
