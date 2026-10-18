// Shared environment uniforms and shader helpers used by the sky, clouds,
// foliage, water and the voxel materials. Kept in its own module (it imports
// nothing from the game) so every gfx file can use it without import cycles.
//
//   E.sunDir      unit vector TOWARDS the sun (or the moon at night)
//   E.sunColor    light colour × intensity of that body (linear)
//   E.day         0 at night … 1 in full daylight
//   E.golden      0 … 1, peaks in the golden hour / dawn (warm low sun)
//   E.torch       0 … 1, how much torches / lanterns / baked light count
//   E.skyTop / E.skyHor / E.fogColor   current sky palette (linear)
//   E.cloud*      the voxel cloud field (see sky.js); cloudShadow(p) reads it
import * as THREE from 'three/webgpu';
import { uniform, uniformArray, vec3, float, max, min, abs, floor, smoothstep, int, clamp, positionWorld } from 'three/tsl';

export const CLOUD_N = 12;          // cells per side of the periodic cloud field
export const CLOUD_CELL = 40;       // world units per cell
export const CLOUD_S = CLOUD_N * CLOUD_CELL;

export const E = {
  sunDir: uniform(new THREE.Vector3(-0.6, 0.45, 0.4).normalize()),
  sunColor: uniform(new THREE.Color(2.4, 1.9, 1.3)),
  moon: uniform(0),                 // 1 when E.sunDir is the moon
  day: uniform(1),
  golden: uniform(0),
  torch: uniform(0.2),
  skyTop: uniform(new THREE.Color(0.1, 0.25, 0.7)),
  skyHor: uniform(new THREE.Color(0.7, 0.8, 0.9)),
  fogColor: uniform(new THREE.Color(0.7, 0.75, 0.8)),
  fogDensity: uniform(0.008),
  fogStart: uniform(36),            // haze starts this far from the camera (gameplay stays crisp)
  fogHeight: uniform(0.0),          // world y where the low ground haze sits
  fogHeightDensity: uniform(0.0),   // extra haze below fogHeight
  fogSun: uniform(0.6),             // how much the fog glows towards the sun
  stars: uniform(0),
  abyss: uniform(1),                // 1: the sky below the horizon fades to a dark void (floating levels)
  focus: uniform(new THREE.Vector3()),
  foliageFade: uniform(48),         // foliage shrinks away beyond this distance from the focus
  cloudY: uniform(96),
  cloudOffset: uniform(new THREE.Vector2(0, 0)),
  cloudShadow: uniform(0.0),        // strength of cloud shadows (0 = off)
  cloudRects: uniformArray(new Array(CLOUD_N * CLOUD_N * 2).fill(0).map(() => new THREE.Vector4(0, 0, 0, 0)), 'vec4'),
};

// 1 in open sun, down to 1 - E.cloudShadow under a cloud. p: world position node.
export function cloudShadow(p) {
  const sd = E.sunDir;
  const k = E.cloudY.sub(p.y).div(max(sd.y, 0.22));
  const q = p.xz.add(sd.xz.mul(k)).sub(E.cloudOffset);
  const fq = q.sub(floor(q.div(CLOUD_S)).mul(CLOUD_S));
  const cell = clamp(floor(fq.div(CLOUD_CELL)), 0, CLOUD_N - 1);
  const idx = int(cell.y.mul(CLOUD_N).add(cell.x)).mul(2);
  const a = E.cloudRects.element(idx), b = E.cloudRects.element(idx.add(1));
  const da = abs(fq.sub(a.xy)).sub(a.zw), db = abs(fq.sub(b.xy)).sub(b.zw);
  const ina = smoothstep(2.5, -2.5, max(da.x, da.y)).mul(min(a.z, 1));
  const inb = smoothstep(2.5, -2.5, max(db.x, db.y)).mul(min(b.z, 1));
  return float(1).sub(max(ina, inb).mul(E.cloudShadow));
}

// Receives-shadow hook for node materials: sun shadow × cloud shadow.
export function withCloudShadow(material) {
  material.receivedShadowNode = (shadow) => shadow.mul(cloudShadowNodeFor());
  return material;
}
let _cs = null;
function cloudShadowNodeFor() { return (_cs ??= cloudShadow(positionWorld)); }

// Sky colour for a unit direction node d (no sun disc): used by water reflections.
export function skyGradient(d) {
  const h = max(d.y, 0);
  return vec3(E.skyHor).mix(vec3(E.skyTop), float(1).sub(h.mul(-6.5).exp()));
}
