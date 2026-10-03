// Shared visuals for the Harry Potter abilities (see potter.js): the brick Patronus stag, the
// Golden Snitch, the Expelliarmus bolt, the Leviosa feather, the stolen-item token, the
// invisibility shimmer and the Patronus shield. Models are built once (BrickBuilder) and cloned;
// per-use materials (the ones whose opacity animates) are tagged with own() and freed by
// disposeOwned().
import * as THREE from 'three';
import { BrickBuilder, plastic } from '../lego.js';

const cache = new Map();
export const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

export function own(x) { x.userData.own = true; return x; }
export function disposeOwned(root) {
  if (!root) return;
  root.parent?.remove(root);
  root.traverse((o) => {
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) if (m.userData.own) m.dispose();
  });
}

// ---- textures / materials -------------------------------------------------------------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return new THREE.CanvasTexture(c);
}
export const glowTex = () => once('glow', () => canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.65)'); r.addColorStop(0.6, 'rgba(255,255,255,0.14)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
}));
// a sparkly magic circle (Leviosa ring under a floating kart)
export const runeTex = () => once('rune', () => canvasTex(128, 128, (g) => {
  g.translate(64, 64);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 5;
  g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(Math.cos(a) * 52 - 3, Math.sin(a) * 52 - 3, 6, 6); }
  // little four-point sparkles and a swirl ("swish and flick")
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.26, x = Math.cos(a) * 30, y = Math.sin(a) * 30, r = 7;
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  }
  g.lineWidth = 3; g.beginPath();
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 3, r = 4 + i * 0.45; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  g.stroke();
}));
export const glowSprite = (color, size, opacity = 1) => {
  const s = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  s.scale.setScalar(size);
  return s;
};
export const additive = (color, opacity = 1, extra = {}) => own(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...extra }));
export const sphereGeo = () => once('sph', () => new THREE.SphereGeometry(1, 20, 14));
export const boxZGeo = () => once('boxz', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5));   // a beam from z 0 to 1
export const discGeo = () => once('disc', () => new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2));

// Fresnel rim (bubble shells, the Patronus shield)
export function rimMaterial(color, power = 2.2, opacity = 1) {
  return own(new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opacity }, power: { value: power } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 color; uniform float opacity; uniform float power; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), power); gl_FragColor = vec4(color * (0.1 + f) * opacity, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
}
// Invisibility Cloak: a faint, rippling heat-haze outline (additive fresnel with moving bands)
export function shimmerMaterial() {
  return own(new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, amt: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float time; uniform float amt; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4); float band = 0.55 + 0.45 * sin(vW.y * 7.0 - time * 6.0 + sin(vW.x * 1.7 + vW.z * 1.3 + time * 2.0) * 2.0); float sp = step(0.985, fract(sin(dot(floor(vW * 6.0), vec3(12.9898, 78.233, 37.719)) + floor(time * 8.0)) * 43758.5453)); vec3 c = mix(vec3(0.55, 0.7, 0.95), vec3(1.0), band) * (f * (0.35 + 0.65 * band) + 0.03) + sp * vec3(0.6, 0.7, 0.9); gl_FragColor = vec4(c * amt, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
}

// a box between two points (for antlers, legs, quills)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1);
function seg(b, ax, ay, az, bx, by, bz, w, h, color, opts) {
  _a.set(ax, ay, az); _b.set(bx, by, bz);
  const d = _b.clone().sub(_a), L = d.length();
  _q.setFromUnitVectors(_z, d.normalize());
  _m.compose(_a.add(_b).multiplyScalar(0.5), _q, _s.set(w, h, L + w * 0.6));
  b.boxM(_m, color, opts);
}
// point the +z beam (boxZGeo) from a to b
export function stretch(mesh, a, b, w) {
  const L = a.distanceTo(b);
  mesh.position.copy(a);
  mesh.scale.set(w, w, Math.max(0.01, L));
  mesh.lookAt(b);
}

// ---- the Patronus stag ------------------------------------------------------------------------
// one shared silhouette, glowing silver-blue; each use clones it with its own fadeable material
const STAG_LEGS = [[0.48, 1.25], [-0.48, 1.25], [0.45, -1.15], [-0.45, -1.15]];
const stagTemplate = () => once('stag', () => {
  const M = plastic(0xffffff);   // placeholder; every clone gets its own glow material
  const g = new THREE.Group();
  const b = new BrickBuilder(0.7);
  // body: two stacked 2x5 bricks, a deep chest, a rump and a little tail
  b.brick(0, 1.95, 0, 2, 5, 3, 0, { mat: M });
  b.brick(0, 2.79, 0.05, 2, 4, 2, 0, { mat: M });
  b.box(0, 1.85, 1.35, 1.5, 1.55, 1.2, 0, { mat: M });
  b.box(0, 2.1, -1.55, 1.35, 1.3, 0.8, 0, { mat: M });
  seg(b, 0, 3.2, -1.95, 0, 3.55, -2.25, 0.35, 0.35, 0, { mat: M });
  // neck up to the head, head and snout, ears
  seg(b, 0, 3.0, 1.6, 0, 4.35, 2.35, 0.75, 0.75, 0, { mat: M });
  b.brick(0, 4.05, 2.55, 1, 2, 2, 0, { mat: M });
  b.box(0, 4.0, 3.35, 0.55, 0.5, 0.65, 0, { mat: M });
  for (const s of [-1, 1]) {
    seg(b, s * 0.3, 4.65, 2.3, s * 0.85, 4.95, 2.05, 0.18, 0.4, 0, { mat: M });
    // antlers: a main beam sweeping up and back with three tines each
    seg(b, s * 0.25, 4.6, 2.55, s * 0.75, 5.6, 2.35, 0.2, 0.2, 0, { mat: M });
    seg(b, s * 0.75, 5.6, 2.35, s * 1.35, 6.45, 1.75, 0.2, 0.2, 0, { mat: M });
    seg(b, s * 1.35, 6.45, 1.75, s * 1.6, 7.15, 1.1, 0.17, 0.17, 0, { mat: M });
    seg(b, s * 0.7, 5.5, 2.38, s * 0.9, 5.95, 3.1, 0.15, 0.15, 0, { mat: M });
    seg(b, s * 1.1, 6.1, 2.05, s * 1.0, 6.85, 2.45, 0.15, 0.15, 0, { mat: M });
    seg(b, s * 1.45, 6.7, 1.5, s * 2.05, 7.0, 1.6, 0.15, 0.15, 0, { mat: M });
  }
  const body = b.build({ shadows: false, name: 'stagBody' });
  g.add(body);
  // legs pivot at the hip so they can gallop
  STAG_LEGS.forEach(([x, z]) => {
    const lb = new BrickBuilder(0.7);
    seg(lb, 0, 0, 0, 0, -1.0, z > 0 ? 0.15 : -0.2, 0.42, 0.45, 0, { mat: M });
    seg(lb, 0, -1.0, z > 0 ? 0.15 : -0.2, 0, -2.0, 0, 0.3, 0.32, 0, { mat: M });
    lb.box(0, -2.15, 0.05, 0.4, 0.25, 0.5, 0, { mat: M });
    const leg = lb.build({ shadows: false, name: 'stagLeg' });
    leg.position.set(x, 2.15, z);
    g.add(leg);
  });
  return g;
});
export function stagModel() {
  const t = stagTemplate();
  const g = t.clone(true);
  const mat = own(new THREE.MeshBasicMaterial({ color: 0xa6d2ff, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  const glow = own(new THREE.MeshBasicMaterial({ color: 0x3a7aff, transparent: true, opacity: 0.45, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.BackSide }));
  const legs = [];
  g.traverse((o) => { if (o.isMesh) o.material = mat; });
  g.children.forEach((c, i) => { if (i > 0) legs.push(c); });
  // a slightly bigger back-faced additive copy of the body gives it a glowing silver rim
  const halo = new THREE.Mesh(g.children[0].children[0].geometry, glow);
  halo.scale.setScalar(1.08); halo.position.set(0, -0.2, 0);
  g.add(halo);
  const spr = glowSprite(0x9ac8ff, 11, 0.55); spr.position.set(0, 3.2, 0.4);
  g.add(spr);
  g.userData = { legs, mat, glow, spr };
  return g;
}

// ---- the Golden Snitch ------------------------------------------------------------------------
const snitchTemplate = () => once('snitch', () => {
  const g = new THREE.Group();
  const gold = plastic(0xf5c518, { metal: 0.65, rough: 0.22, emissive: 0x8a6400, emissiveIntensity: 0.55 });
  const b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 0.62, 0, { mat: gold });
  b.cyl(0, -0.05, 0, 0.66, 0.1, 0, { mat: plastic(0xdcbc81, { metal: 0.5, rough: 0.3, emissive: 0x5a4000, emissiveIntensity: 0.4 }), seg: 20 });
  for (const s of [-1, 1]) b.cyl(s * 0.6, -0.12, 0, 0.16, 0.24, 0, { mat: gold, seg: 10 });
  b.cyl(0, 0.58, 0, 0.2, 0.14, 0, { mat: gold, seg: 12 });   // a stud on top
  g.add(b.build({ shadows: false, name: 'snitchBall' }));
  // wings: a fan of thin silver-white plates, pivoting at the ball's sides
  const wmat = plastic(0xf4f4f4, { trans: true, opacity: 0.85, emissive: 0xcfd8e0, emissiveIntensity: 0.5 });
  [-1, 1].forEach((s) => {
    const wb = new BrickBuilder(1);
    for (let j = 0; j < 4; j++) wb.boxM(new THREE.Matrix4().compose(new THREE.Vector3(s * (0.6 + j * 0.12), 0.1 + j * 0.05, -0.15 - j * 0.24), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s * (0.35 + j * 0.18), 0)), new THREE.Vector3(1.4 - j * 0.22, 0.05, 0.3)), 0, { mat: wmat });
    const w = new THREE.Group(); w.add(wb.build({ shadows: false, name: 'snitchWing' }));
    w.position.set(s * 0.55, 0.05, 0);
    g.add(w);
  });
  return g;
});
export function snitchModel() {
  const g = snitchTemplate().clone(true);
  g.userData = { wings: g.children.slice(1, 3) };
  const spr = glowSprite(0xffd040, 4.2, 0.85);
  g.add(spr);
  g.userData.spr = spr;
  return g;
}

// ---- Expelliarmus bolt: a red trans brick inside a hot glow, and the jet from the wand ----------
const boltTemplate = () => once('bolt', () => {
  const b = new BrickBuilder(0.85);
  b.brick(0, -0.5, 0, 1, 1, 3, 0, { mat: plastic(0xff3020, { trans: true, opacity: 0.9, emissive: 0xff2010, emissiveIntensity: 1.8 }) });
  const crystal = b.build({ shadows: false, name: 'boltBrick' });
  return crystal;
});
export function boltModel() {
  const g = new THREE.Group();
  const spin = boltTemplate().clone(true);
  const core = new THREE.Mesh(sphereGeo(), once('boltCore', () => new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })));
  core.scale.setScalar(0.3);
  const shell = new THREE.Mesh(sphereGeo(), once('boltShell', () => new THREE.MeshBasicMaterial({ color: 0xff2a10, transparent: true, opacity: 0.55, depthWrite: false, fog: false })));
  shell.scale.setScalar(0.95);
  const halo = glowSprite(0xff2a1a, 5.5, 1);
  const hot = glowSprite(0xffb0a0, 1.8, 1);
  g.add(spin, core, shell, halo, hot);
  g.userData = { spin, halo };
  return g;
}
export function beamMesh(color = 0xff3a2a, solid = false) { const m = new THREE.Mesh(boxZGeo(), solid ? own(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, fog: false })) : additive(color, 0.9)); return m; }

// ---- Wingardium Leviosa feather ---------------------------------------------------------------
const featherTemplate = () => once('feather', () => {
  const b = new BrickBuilder(1);
  const W = plastic(0xf4f4f4), T = plastic(0xe4cd9e);
  seg(b, 0, -1.3, 0, 0, 1.4, 0, 0.09, 0.09, 0, { mat: T });   // quill
  // vane: thin plates widening then tapering, a little curled
  const rows = [0.18, 0.32, 0.42, 0.46, 0.44, 0.38, 0.28, 0.16];
  rows.forEach((w, j) => {
    const y = -0.9 + j * 0.3;
    for (const s of [-1, 1]) b.boxM(new THREE.Matrix4().compose(new THREE.Vector3(s * w * 0.5, y, Math.abs(s * w) * 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s * 0.2, s * 0.35)), new THREE.Vector3(w, 0.28, 0.05)), 0, { mat: W });
  });
  return b.build({ shadows: false, name: 'feather' });
});
export function featherModel() { return featherTemplate().clone(true); }

// ---- the stolen-item token: a little rainbow-edged item brick ----------------------------------
const tokenTemplate = () => once('token', () => {
  const b = new BrickBuilder(0.55);
  b.brick(0, -0.3, 0, 2, 2, 3, 0, { mat: plastic(0xffd040, { trans: true, opacity: 0.8, emissive: 0xffa000, emissiveIntensity: 0.9 }) });
  b.box(0, -0.05, 0, 0.5, 0.5, 0.5, 0, { mat: plastic(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }) });
  return b.build({ shadows: false, name: 'token' });
});
export function tokenModel() {
  const g = new THREE.Group();
  g.add(tokenTemplate().clone(true), glowSprite(0xffd060, 3.2, 0.8));
  return g;
}

// ---- Patronus shield bubble ------------------------------------------------------------------
export function shieldBubble() {
  const m = new THREE.Mesh(sphereGeo(), rimMaterial(0xa8d0ff, 2.0, 0.9));
  m.scale.set(2.7, 2.2, 3.1); m.position.y = 1.1;
  return m;
}
export function runeDisc() {
  return new THREE.Mesh(discGeo(), additive(0xfff0b0, 0.8, { map: runeTex() }));
}

// prewarm samples (one of each special material)
export function prewarmAll() {
  const out = [stagModel(), snitchModel(), boltModel(), beamMesh(), featherModel(), tokenModel(), shieldBubble(), runeDisc()];
  const sh = new THREE.Mesh(sphereGeo(), shimmerMaterial());
  out.push(sh);
  return out;
}
