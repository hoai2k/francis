// Shared build helpers for the movie glider packs (marvel.js, starwars.js, jurassic.js).
// Re-exports the Star Wars vehicle kit's shape helpers and adds a tapered wing plate.
import { THREE, BrickBuilder, C, plastic, mat, box, cyl, cone, frustum, sphere, geo, rod, studs, glow, morphPair } from '../vehicles/starwars-kit.js';

export { THREE, BrickBuilder, C, plastic, mat, box, cyl, cone, frustum, sphere, geo, rod, studs, glow, morphPair };

// A tapered wing plate spanning x0 -> x1 (thickness th). At each end it runs from zb (trailing
// edge) to zf (leading edge) at height y: plate(b, base, [x0, y0, zb0, zf0], [x1, y1, zb1, zf1], th, color)
const unit = new THREE.BoxGeometry(1, 1, 1);
export function plate(b, base, A, B, th, color, o = {}) {
  const g = unit.clone(), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) + 0.5, E = t < 0.5 ? A : B;
    p.setXYZ(i, E[0], E[1] + p.getY(i) * th, p.getZ(i) > 0 ? E[3] : E[2]);
  }
  g.computeVertexNormals();
  geo(b, base, g, color, new THREE.Matrix4(), o);
  g.dispose();
}

// Remembers whether the glider has just popped out: returns 0 -> 1 over `dur` seconds after
// each deploy (the game unfolds the glider group by scaling it in x from 0).
export function deployClock(part, dur = 0.7) {
  let k = 0;
  return (dt) => {
    let root = part.parent;
    while (root && root.name !== 'glider') root = root.parent;
    if (root && root.scale.x < 0.35) k = 0;
    else k = Math.min(1, k + dt / dur);
    return k;
  };
}
