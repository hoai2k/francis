// Helpers for the Pokémon Rides vehicle pack (js/vehicles/pokemon.js): the shape kit and Poké
// Ball from the Pokémon drivers, the rider fit, running legs for the ride Pokémon and a few
// small animation helpers (all allocation-free at run time).
import { THREE, BrickBuilder, C, plastic, shape, part, pv, fxg, pokeBall, flame, sparks, addGlow, fxMat, spriteMat, neon, S, CO, PI, abs } from '../drivers/pokemon-kit.js';
import { clamp, ease, fitOf, pitchAbout, grow } from './common.js';
export { clamp, ease, fitOf, pitchAbout, grow };

export { THREE, BrickBuilder, C, plastic, shape, part, pv, fxg, pokeBall, flame, sparks, addGlow, fxMat, spriteMat, neon, S, CO, PI, abs };
export const BACK = -PI / 2;   // boost flames pointing straight back

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
