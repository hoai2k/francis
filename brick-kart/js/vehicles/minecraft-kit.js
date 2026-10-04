// Building helpers for the Minecraft Rides vehicle pack (js/vehicles/minecraft.js): pixel-skinned
// cubes (the same 6-tile atlas skins as the Minecraft drivers), the block textures the rides are
// made of (oak planks, iron, TNT, pig, horse, strider) and limb pivots that walk or gallop.
import * as THREE from 'three';
import { BrickBuilder, C, plastic } from '../lego.js';
import { skin, cube, rep, rows, pixItem, ITEMS, particles } from '../drivers/minecraft-kit.js';

export { THREE, BrickBuilder, C, plastic, skin, cube, rep, rows, pixItem, ITEMS, particles };
export const PI = Math.PI, S = Math.sin, CO = Math.cos;
export const BACK = -PI / 2;   // boost flames pointing straight back
export const ease = (dt, k) => Math.min(1, dt * k);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const face = (g, p, n = 0.08) => ({ g, p, n });

// ---- block skins ---------------------------------------------------------------------------------
export const SK = {
  planks: () => skin('mcv-planks', { all: face(rows(['aaaaaaaa'], ['bbbbbbbb'], ['aaaaaaab'], ['aaaaaaaa'], ['bbbbbbbb'], ['abaaaaaa'], ['aaaaaaaa'], ['bbbbbbbb']), { a: 0xb08a52, b: 0x7a5a32 }, 0.1) }),
  log: () => skin('mcv-log', { all: face(rep('abaaba', 6), { a: 0x6b4e2e, b: 0x4a3420 }, 0.12) }),
  iron: () => skin('mcv-iron', { all: face(rows(['bbbbbbbb'], ['baaaaaab', 6], ['bbbbbbbb']), { a: 0x9a9a9a, b: 0x5e5e5e }, 0.08) }),
  tnt: () => skin('mcv-tnt', {
    side: face(rows(['rRrRrRrR', 3], ['wwwwwwww'], ['wkwkkwkw'], ['wwwwwwww'], ['rRrRrRrR', 2]), { r: 0xd8381e, R: 0xb02a14, w: 0xf0f0f0, k: 0x1a1a1a }, 0.05),
    top: face(rows(['rrrrrrrr', 3], ['rrrkkrrr', 2], ['rrrrrrrr', 3]), { r: 0xc8301a, k: 0x2a2a2a }, 0.06), bottom: 0xc8301a,
  }, { unique: true }),
  pig: () => skin('mcv-pig', { all: face(rows(['pppppppp', 2], ['ppPppppp'], ['pppppPpp'], ['pppppppp', 4]), { p: 0xf0a4a0, P: 0xe08c8a }, 0.06) }),
  pigHead: () => skin('mcv-pig-head', { front: face(rows(['pppppppp', 3], ['ewppppwe'], ['pppppppp', 4]), { p: 0xf0a4a0, w: 0xf4f4f4, e: 0x1a1a1a }, 0.05), all: face(rep('pppp', 4), { p: 0xf0a4a0 }, 0.06) }),
  snout: () => skin('mcv-snout', { front: face(['nnnn', 'knnk', 'nnnn'], { n: 0xf8bcb8, k: 0x8a4a4a }, 0.03), all: 0xf8bcb8 }),
  horse: () => skin('mcv-horse', { all: face(rows(['aaaaaaaa', 2], ['aabaaaaa'], ['aaaaaaba'], ['aaaaaaaa', 2], ['abaaaaaa'], ['aaaaaaaa']), { a: 0x8a5a32, b: 0x6e4424 }, 0.08) }),
  horseHead: () => skin('mcv-horse-head', {
    front: face(rows(['aaaaaaaa', 6], ['abaaaaba'], ['aaaaaaaa']), { a: 0x7a4c2a, b: 0x2a1a10 }, 0.06),
    side: face(rows(['aaaaaaaa', 2], ['kaaaaaaa'], ['aaaaaaaa', 5]), { a: 0x8a5a32, k: 0x1a1a1a }, 0.08), top: 0x8a5a32, bottom: 0x7a4c2a, back: 0x8a5a32,
  }),
  hoof: () => skin('mcv-hoof', { all: face(rows(['aaaa', 9], ['bbbb', 3]), { a: 0x8a5a32, b: 0xe8e0d0 }, 0.06), top: 0x8a5a32, bottom: 0x3a2a1a }),
  strider: () => skin('mcv-strider', {
    side: face(rows(['abaababa', 2], ['aaaaaaaa', 6]), { a: 0x9a3a3a, b: 0x6a2020 }, 0.1),
    front: face(rows(['abaababa', 2], ['aaaaaaaa'], ['awkaakwa'], ['aaaaaaaa'], ['aMMMMMMa'], ['aaaaaaaa', 2]), { a: 0x9a3a3a, b: 0x6a2020, w: 0xf4f4f4, k: 0x1a1a1a, M: 0x3a1010 }, 0.08),
    top: face(rep('abab', 4), { a: 0x9a3a3a, b: 0x6a2020 }, 0.1), bottom: 0x8a3030,
  }),
  striderLeg: () => skin('mcv-strider-leg', { all: face(rows(['aaaa', 10], ['bbbb', 2]), { a: 0x7a2a2a, b: 0x4a1a1a }, 0.08) }),
  saddle: () => skin('mcv-saddle', { all: face(rows(['bbbbbbbb'], ['aaaaaaaa', 6], ['bbbbbbbb']), { a: 0x7a4a26, b: 0x4a2a14 }, 0.06) }),
};
// a limb on a pivot at (x, y, z): a skinned box hanging straight down (len) that swings about X
export function limb(parent, mat, x, y, z, w, len, d) {
  const p = new THREE.Group(); p.position.set(x, y, z);
  cube(p, mat, w, len, d, 0, -len / 2, 0);
  parent.add(p);
  return p;
}
// pitch a sprung group about a pivot (y, z) in the kart frame, keeping that point fixed
export function pitchAbout(g, p, py, pz, lift = 0) {
  const c = Math.cos(p), s = Math.sin(p);
  g.rotation.x = p;
  g.position.y = py - (py * c - pz * s) + lift;
  g.position.z = pz - (py * s + pz * c);
}
// where the driver's hands meet (kit.rig is in the seat frame), in the kart frame
export function handsAt(rig, seat) {
  const s = rig.shoulder, L = rig.armLen;
  return [seat[0], seat[1] + s.y - Math.cos(1) * L, seat[2] + s.z + Math.sin(1) * L];
}
// a fishing-rod style stick from the hands with something dangling from a string; returns the
// swinging bait group (rotate it in fx)
export function baitStick(b, hands, bait, { len = 1.5, rise = 0.55, drop = 0.5 } = {}) {
  const [x, y, z] = hands, tip = [x, y + rise, z + len];
  const A = new THREE.Vector3(x, y, z), D = new THREE.Vector3(...tip).sub(A), l = D.length();
  const g = new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0);
  b.addMatrix(g, plastic(0x6b4a26), new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), D.normalize()), new THREE.Vector3(0.045, l, 0.045)));
  const swing = new THREE.Group(); swing.position.set(...tip);
  const sb = new BrickBuilder(1);
  sb.box(0, -drop, 0, 0.02, drop, 0.02, 0xd8d8d8);
  swing.add(sb.build({ name: 'bait-string', shadows: false }));
  bait.position.y = -drop; swing.add(bait);
  return swing;
}
