// Energy visuals shared by techniques: fresnel orbs (Blue, Red, Purple),
// the Infinity shell, and the Hollow Purple beam.
import * as THREE from 'three/webgpu';
import { uniform, normalView, positionViewDirection, dot, abs, pow, vec3, vec4, float, sin, mix, uv, smoothstep, positionLocal, positionWorld, fract, floor, length } from 'three/tsl';
import { U } from './materials.js';

const fresnel = (p = 2) => pow(float(1).sub(abs(dot(normalView, positionViewDirection))), p);

export function orbMaterial(color, { core = false, power = 2, intensity = 3 } = {}) {
  const c = new THREE.Color(color);
  const tint = uniform(c), inten = uniform(intensity), alpha = uniform(1);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const f = fresnel(power);
  const flick = sin(U.time.mul(30).add(positionWorld.y.mul(6))).mul(0.1).add(0.95);
  m.colorNode = vec4(vec3(tint).mul(f.mul(inten).add(core ? 0.0 : 0.35)).mul(flick).mul(alpha), 1);
  m.userData = { tint, inten, alpha };
  return m;
}

// Orb = dark (or bright) core + additive fresnel shell + light.
const orbCache = new Map();
const geoCache = { shell: new THREE.IcosahedronGeometry(1, 3), core: new THREE.IcosahedronGeometry(0.72, 2), halo: new THREE.IcosahedronGeometry(1.8, 2) };
function orbMats(color, darkCore, coreColor) {
  const k = color + ':' + darkCore + ':' + coreColor;
  if (!orbCache.has(k)) orbCache.set(k, {
    shell: orbMaterial(color, { power: 1.6, intensity: 4, core: darkCore }), halo: orbMaterial(color, { power: 3, intensity: darkCore ? 1.2 : 2, core: darkCore }),
    core: darkCore ? new THREE.MeshBasicNodeMaterial({ color: 0x000000 }) : new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(coreColor).multiplyScalar(4) }),
  });
  return orbCache.get(k);
}
export function makeOrb(color, { radius = 0.5, darkCore = false, coreColor = 0xffffff } = {}) {
  const g = new THREE.Group();
  const M = orbMats(color, darkCore, coreColor);
  const shell = new THREE.Mesh(geoCache.shell, M.shell), core = new THREE.Mesh(geoCache.core, M.core), halo = new THREE.Mesh(geoCache.halo, M.halo);
  g.scale.setScalar(radius);
  g.add(core, shell, halo);
  g.userData = { shell, core, halo };
  shell.renderOrder = 22; halo.renderOrder = 22;
  return g;
}

// Infinity shell: faint hex shimmer that ripples when struck.
export function infinityMaterial() {
  const hit = uniform(0), alpha = uniform(0);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const p = positionLocal.mul(6);
  const hex = smoothstep(0.42, 0.5, abs(fract(p.x.add(p.y.mul(0.5))).sub(0.5))).add(smoothstep(0.42, 0.5, abs(fract(p.y.sub(p.z.mul(0.5))).sub(0.5)))).mul(0.5);
  const f = fresnel(2.5);
  const wave = sin(positionLocal.y.mul(10).sub(U.time.mul(8))).mul(0.5).add(0.5);
  const a = f.mul(0.6).add(hex.mul(0.25).mul(wave)).add(hit.mul(0.8).mul(hex.add(f)));
  m.colorNode = vec4(vec3(0.55, 0.85, 1.3).mul(a).mul(alpha), 1);
  m.userData = { hit, alpha };
  return m;
}

// Hollow Purple beam: layered cylinders with a scrolling energy pattern.
export function beamMaterial(color, inner = false) {
  const alpha = uniform(1);
  const c = new THREE.Color(color);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const v = uv();
  const flow = sin(v.y.mul(60).sub(U.time.mul(40)).add(sin(v.x.mul(25.13)).mul(2))).mul(0.5).add(0.5);
  const f = fresnel(inner ? 0.6 : 1.4);
  const k = inner ? float(1).mul(0.9).add(flow.mul(0.3)) : f.mul(flow.mul(0.6).add(0.5));
  m.colorNode = vec4(vec3(c.r, c.g, c.b).mul(k).mul(inner ? 5 : 3).mul(alpha), 1);
  m.userData = { alpha };
  return m;
}
