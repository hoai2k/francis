// Helpers shared by every vehicle pack's kit (./*-kit.js re-export them for their packs).
import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// frame-rate independent easing factor towards a target (k per second)
export const ease = (dt, k) => Math.min(1, dt * k);

// The driver's size (kit.rig, seat frame, hips at the origin) boiled down to the numbers the
// rides need. A typical figure is ~2.0 tall and 1.3 wide; huge ones reach 2.9 x 2.0.
//   H height (top of head), W overall width, hip = hip/thigh half-width,
//   sx/sy = shoulder half-width / height, big/wide = 0..1 beyond a typical figure
export function fitOf(rig) {
  const H = clamp(rig?.height ?? 1.8, 1.1, 3.0), W = clamp(rig?.width ?? 1.2, 0.8, 2.1);
  const sx = clamp(Math.abs(rig?.shoulder?.x ?? 0.56), 0.2, 1.0), sy = clamp(rig?.shoulder?.y ?? 1.2, 0.6, 1.6);
  return { H, W, sx, sy, hip: clamp(W * 0.46, 0.35, 0.95), big: clamp((H - 2.05) / 0.85, 0, 1), wide: clamp((W - 1.3) / 0.65, 0, 1) };
}

// pitch a sprung group about a pivot (y, z) in the kart frame, keeping that point fixed
export function pitchAbout(g, p, py, pz, lift = 0) {
  const c = Math.cos(p), s = Math.sin(p);
  g.rotation.x = p;
  g.position.y = py - (py * c - pz * s) + lift;
  g.position.z = pz - (py * s + pz * c);
}

// Wraps a ride's body and moving parts in one group scaled about the ground origin (for rides
// that grow a little under big riders). Returns the group (use it as the mesh). Keep sy === sz
// when it holds round wheels.
export function grow(objs, sx, sy, sz) {
  const g = new THREE.Group();
  for (const o of objs) g.add(o);
  g.scale.set(sx, sy, sz);
  return g;
}
