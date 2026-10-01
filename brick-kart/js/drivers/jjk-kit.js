// Helpers for the Jujutsu Kaisen drivers: a seated figure with a face from the
// Cursed Brick Shibuya atlas, driver-scale hair styles, and small cursed-energy
// effect parts (emissive meshes + glow sprites) that the drivers' fx() toggle.
import { THREE, BrickBuilder, C, plastic, seatedFig, rbox, rod, mat4, cached, taperGeo, faceMat } from './kit.js';
import { head as atlasHead, glow, neon, spike } from '../maps/jjk-props.js';

export { THREE, BrickBuilder, C, plastic, rbox, rod, mat4, cached, taperGeo, faceMat, glow, neon, spike, atlasHead };

export const NAVY = 0x1d2233, GOLD = 0xdcbc81, INK = 0x15161c;

// ---- maths for gestures / fx ---------------------------------------------------------
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (f, a, b) => clamp01((f - a) / (b - a));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
// 0 -> 1 -> 0 bump over [a, b]
export const bump = (f, a, b) => Math.sin(Math.PI * seg(f, a, b));
// is name one of the (up to 4) given names
export const any = (n, a, b, c, d) => n === a || n === b || n === c || n === d;
// loop progress of the looped 'win' pose (driver.js loops it every 1.6 s)
export const winF = (t) => (t % 1.6) / 1.6;

// ---- figure ---------------------------------------------------------------------------
// jfig(o): seatedFig with an atlas face (o.face) and a driver-scale hair function
// o.hair(b, r, h, d) drawn into the head builder (head base at y 0, radius r, height h).
export function jfig(o) {
  const s = o.s ?? 1.3;
  return seatedFig({
    noStud: true, headR: 0.31, headH: 0.5, extraHeight: 0.15, ...o, s,
    head: o.head ?? ((hb, d) => { atlasHead(hb, o.face, 0, 0, 0, d.headR, d.headH); o.hair?.(hb, d.headR, d.headH, d); }),
  });
}
// hand centre in an arm pivot's local frame
export const handY = (rig) => -0.62 * rig.dims.s;

// ---- hair (driver scale: r = head radius, h = head height, base of head at y 0) ------
// cap over the top of the head, starting at lo * h at the front (above the eyes)
export function cap(b, r, h, col, lo = 0.8, k = 1.08) {
  b.cyl(0, h * lo, 0, r * k, h * (1 - lo) + 0.03, col, { seg: 16 });
  b.sphere(0, h + 0.02, 0, r * k, col, { sy: 0.3 });
}
// hair covering the back and sides of the head from y = lo * h
export function back(b, r, h, col, lo = 0.25, hi = 0.9) {
  b.cyl(0, h * lo, -r * 0.3, r * 1.07, h * (hi - lo), col, { seg: 16 });
}
// ring of spikes around the crown; tilt = outward lean, len = spike length
export function spikes(b, r, h, col, n, len, tilt, { y = 0.95, ring = 0.75, rad = 0.22, seed = 3, top = true, rnd = 0.35, back: bk = 0 } = {}) {
  let sd = seed;
  const rand = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.2;
    const sa = Math.sin(a), ca = Math.cos(a);
    const rr = k % 2 ? ring : ring * 0.6;
    spike(b, sa * rr * r, h * y, ca * rr * r - bk * r, rad * r * 2, len * (1 + (rand() - 0.5) * rnd), ca * tilt - bk * 0.6, -sa * tilt, col);
  }
  if (top) spike(b, 0, h * y, -bk * r, rad * r * 2.4, len * 1.15, -bk * 0.6, 0, col);
}
// fringe spikes over the forehead pointing forward/down (ang ~ 1.6 - 2.3)
export function fringe(b, r, h, col, n, len, ang = 1.9, { y = 0.92, spread = 0.5, rad = 0.17 } = {}) {
  for (let k = 0; k < n; k++) {
    const u = n === 1 ? 0 : (k / (n - 1) - 0.5) * 2;
    spike(b, u * spread * r, h * y, r * 0.55, rad * r * 2, len, ang, -u * 0.25, col);
  }
}

// ---- effect parts ----------------------------------------------------------------------
// a hidden group for an effect (toggled in fx)
export function fxg(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.visible = false; parent.add(g); return g;
}
export function addGlow(parent, color, size, x = 0, y = 0, z = 0, op = 0.9) {
  const s = glow(color, size, op); s.position.set(x, y, z); parent.add(s); return s;
}
const sphGeo = () => cached('jjkSph', () => new THREE.SphereGeometry(1, 12, 8));
// a single glowing ball mesh (unit radius scaled by r)
export function ball(parent, color, r, x = 0, y = 0, z = 0, k = 2.2) {
  const m = new THREE.Mesh(sphGeo(), neon(color, k)); m.scale.setScalar(r); m.position.set(x, y, z); parent.add(m); return m;
}
// a ring (torus) lying in the XY plane (face +Z); rotate the result as needed
export function ringMesh(parent, color, R, tube, k = 2.4) {
  const g = cached(`jjkRing${tube}`, () => new THREE.TorusGeometry(1, tube, 6, 28));
  const m = new THREE.Mesh(g, neon(color, k)); m.scale.setScalar(R); parent.add(m); return m;
}
// crackling lightning: n thin shards radiating from the origin (one neon + one dark mesh)
export function sparks(parent, color, dark, n, len, seed = 5) {
  const b = new BrickBuilder(1);
  let sd = seed;
  const rand = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const ry = rand() * 6.28, rz = rand() * 6.28, l = len * (0.5 + rand() * 0.7);
    const dx = Math.cos(rz) * Math.cos(ry), dy = Math.sin(rz), dz = Math.cos(rz) * Math.sin(ry);
    // two segments per shard: a zig-zag bolt
    const mx = dx * l * 0.5 + (rand() - 0.5) * l * 0.4, my = dy * l * 0.5 + (rand() - 0.5) * l * 0.4, mz = dz * l * 0.5;
    const col = k % 3 === 2 ? dark : color;
    rod(b, [0, 0, 0], [mx, my, mz], 0.025, col === dark ? plastic(dark) : neon(color, 2.6), 4);
    rod(b, [mx, my, mz], [dx * l, dy * l, dz * l], 0.02, col === dark ? plastic(dark) : neon(color, 2.6), 4);
  }
  const m = b.build({ name: 'sparks' });
  parent.add(m); return m;
}
// show/hide helper that avoids touching unchanged objects
export function vis(o, on) { if (o.visible !== on) o.visible = on; }
