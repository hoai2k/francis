// Region seams: how two neighbouring regions meet so you can walk from one
// into the other with no gate and no loading (world/seamless.js).
//
// Every pair of grid neighbours shares one border. Both region builds stamp
// the same border profile into their edge band (RegionBuilder, common.js), so
// terrain, the road and the water line up cell for cell across the seam:
//
//   s   position along the border, in cells, from the road's centre line
//       (the old gate's `at`); both sides measure it the same way
//   d   distance from the border into the region (0 = the outermost column)
//   height at the seam (d < SEAM.HARD) = roadY + P(s), where roadY is the
//   road's height where it meets the edge in *that* region; the two tiles are
//   offset vertically by the difference, so the two edges meet exactly.
//   Further in (HARD..BAND) the region's own terrain blends back in.
//
// Kinds of border:
//   'hills'  a broad, flat opening round the road (|s| < OPEN), rising into
//            a wooded / rocky ridge either side (the natural boundary)
//   'flat'   city to city: the street level carries straight across
//   'water'  a strait: sea either side of a causeway the road runs along
// Colony borders (a Culling Game colony on one side) also get the colony
// barrier: an invisible wall along the colony's outermost column except at
// the road (the "barrier gate", |s| <= COLONY_OPEN), under the shimmering
// curtain the colony already draws.
//
//   seamSpec(a, b)            -> { key, kind, colony, P(s), water }   (order-independent)
//   tileOffset(La, side, Lb)  -> { x, y, z }: Lb's origin in La's frame, Lb across La's `side`
import { REGIONS } from './index.js';

export const SEAM = { HARD: 4, BAND: 22, OPEN: 24, RISE: 16, CAUSEWAY: 5, ROAD: 3, COLONY_OPEN: 8, WATER_TOP: -3, SEABED: -8 };

const KIND = {
  'colony_sendai|shinjuku': 'flat',
  'colony_tokyo1|shinjuku': 'flat',
  'colony_tokyo1|shibuya': 'flat',
  'colony_sakurajima|kyoto': 'water',
  'colony_sakurajima|shibuya': 'water',
};

export const seamKey = (a, b) => [a, b].sort().join('|');
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// 1D value noise in 0..1, seeded
function noise1(seed) {
  const g = (i) => { let h = Math.imul((i | 0) ^ seed, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  return (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return g(i) + (g(i + 1) - g(i)) * u; };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const specs = new Map();
export function seamSpec(a, b) {
  const key = seamKey(a, b);
  if (specs.has(key)) return specs.get(key);
  const kind = KIND[key] ?? 'hills';
  const colony = REGIONS[a]?.kind === 'colony' || REGIONS[b]?.kind === 'colony';
  const seed = hash(key);
  const n1 = noise1(seed), n2 = noise1(seed ^ 0x9e3779b9);
  let P;
  if (kind === 'flat') P = () => 0;
  else if (kind === 'water') P = (s) => (Math.abs(s) <= SEAM.CAUSEWAY ? 0 : SEAM.SEABED);
  else P = (s) => {
    const a = Math.abs(s);
    const ridge = 7 + 8 * n1(s * 0.045) + 3 * n2(s * 0.13);
    // gentle swells in the opening, away from the road itself
    const swell = a > SEAM.ROAD + 4 ? Math.round(1.6 * n2(s * 0.09) * smooth(SEAM.ROAD + 4, SEAM.ROAD + 10, a)) : 0;
    return Math.round(swell + (ridge - swell) * smooth(SEAM.OPEN, SEAM.OPEN + SEAM.RISE, a));
  };
  const spec = { key, kind, colony, seed, P, water: kind === 'water' ? SEAM.WATER_TOP : null };
  specs.set(key, spec);
  return spec;
}

// Where region Lb (across La's `side`) sits in La's frame. Uses the seams both
// builds recorded (L.seams[side] = { to, at, y }): the road centre lines meet,
// and the road heights at the edge match.
export const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
export function tileOffset(La, side, Lb) {
  const A = La.seams?.[side], Bs = Lb.seams?.[OPP[side]];
  if (!A || !Bs) return null;
  const wa = La.world, wb = Lb.world, y = A.y - Bs.y;
  if (side === 'e') return { x: wa.sx, y, z: A.at - Bs.at };
  if (side === 'w') return { x: -wb.sx, y, z: A.at - Bs.at };
  if (side === 's') return { x: A.at - Bs.at, y, z: wa.sz };
  return { x: A.at - Bs.at, y, z: -wb.sz };
}
