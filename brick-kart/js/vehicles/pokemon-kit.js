// Helpers for the Pokémon Rides vehicle pack (js/vehicles/pokemon.js): the shape kit and Poké
// Ball from the Pokémon drivers, the rider fit, running legs for the ride Pokémon and a few
// small animation helpers (all allocation-free at run time).
import { THREE, BrickBuilder, C, plastic, shape, part, pv, fxg, pokeBall, flame, sparks, addGlow, fxMat, spriteMat, neon, S, CO, PI, abs } from '../drivers/pokemon-kit.js';

export { THREE, BrickBuilder, C, plastic, shape, part, pv, fxg, pokeBall, flame, sparks, addGlow, fxMat, spriteMat, neon, S, CO, PI, abs };
export const BACK = -PI / 2;   // boost flames pointing straight back
export const ease = (dt, k) => Math.min(1, dt * k);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// The driver's size (kit.rig, seat frame, hips at the origin) boiled down to the numbers the
// rides need. A typical figure is ~2.0 tall and 1.3 wide; huge ones reach 2.9 x 2.0.
export function fitOf(rig) {
  const H = clamp(rig?.height ?? 1.8, 1.1, 3.0), W = clamp(rig?.width ?? 1.2, 0.8, 2.1);
  return { H, W, hip: clamp(W * 0.46, 0.35, 0.95), big: clamp((H - 2.05) / 0.85, 0, 1), wide: clamp((W - 1.3) / 0.65, 0, 1) };
}
// wraps a ride's body and moving parts in one group scaled about the ground origin
export function grow(objs, sx, sy, sz) {
  const g = new THREE.Group();
  for (const o of objs) g.add(o);
  g.scale.set(sx, sy, sz);
  return g;
}
// pitch a sprung group about a pivot (y, z) in the kart frame, keeping that point fixed
export function pitchAbout(g, p, py, pz, lift = 0) {
  const c = CO(p), s = S(p);
  g.rotation.x = p;
  g.position.y = py - (py * c - pz * s) + lift;
  g.position.z = pz - (py * s + pz * c);
}
// a double-sided plastic (open shells you can look into)
const dbl = new Map();
export function shellMat(col) {
  let m = dbl.get(col);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.34, side: THREE.DoubleSide }); dbl.set(col, m); }
  return m;
}

// Four running legs for a ride Pokémon. spec: [{ x, y, z, front, build(L) }] (pivots at the hips /
// shoulders, legs hang down -Y). Returns { legs, update(ph, pace, air, dt) } — a bounding gallop:
// front and hind pairs swing in turn, tucked up in the air.
export function runningLegs(spec) {
  const legs = spec.map((o, i) => {
    const g = new THREE.Group(); g.position.set(o.x, o.y, o.z);
    g.add(part(o.build, 'leg'));
    return { g, off: (o.front ? 0 : PI) + (i % 2) * 0.45, tuck: o.front ? 0.8 : -0.6, amp: o.amp ?? 0.7 };
  });
  return {
    legs, objs: legs.map((l) => l.g),
    update(ph, pace, air, dt) {
      for (const l of legs) l.g.rotation.x += ((air ? l.tuck : S(ph + l.off) * l.amp * pace) - l.g.rotation.x) * ease(dt, 14);
    },
  };
}
