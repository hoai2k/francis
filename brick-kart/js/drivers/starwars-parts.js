// Shared parts for the Star Wars drivers (see starwars.js): faces, hair, held props
// (lightsabers, blasters, gaffi stick), effect meshes and the little fx helpers that
// show / ignite / spin them while a gesture plays.
import { THREE, BrickBuilder, C, plastic, cached, mat4, rbox, rod, faceMat, simpleFace, glowMat } from './kit.js';

export { THREE, BrickBuilder, C, plastic, cached, mat4, rbox, rod, faceMat, simpleFace, glowMat };
export const S = Math.sin, A = Math.abs, PI = Math.PI;
const PHASES = new Set(['win', 'lose', 'pre', 'race']);

// ---- materials ------------------------------------------------------------------------
const mats = new Map();
const once = (key, make) => { let m = mats.get(key); if (!m) { m = make(); mats.set(key, m); } return m; };
export const bladeMat = (c) => once('blade' + c, () => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.78, depthWrite: false }));
export const coreMat = () => once('core', () => new THREE.MeshBasicMaterial({ color: 0xfffaf2 }));
export const boltMat = () => once('bolt', () => new THREE.MeshBasicMaterial({ color: 0xff3020 }));
export const flashMat = () => once('flash', () => new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.9, depthWrite: false }));
export const fireMat = () => once('fire', () => new THREE.MeshBasicMaterial({ color: 0xff9326, transparent: true, opacity: 0.85, depthWrite: false }));
export const metalMat = (c, r = 0.28) => plastic(c, { metal: 0.75, rough: r });

// ---- geometry -------------------------------------------------------------------------
export const UCYL = () => cached('swUCyl10', () => new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0));
export const CONE = () => cached('swCone', () => new THREE.ConeGeometry(1, 1, 10));
export const HEMI = () => cached('swHemi', () => new THREE.SphereGeometry(1, 16, 6, 0, PI * 2, 0, PI / 2));
export const BOWL = () => cached('swBowl', () => new THREE.SphereGeometry(1, 18, 6, 0, PI * 2, PI / 2, PI / 2));
// back half of a hemisphere (a pram hood) and the back half of a cylinder (hair)
export const HOOD = () => cached('swHood', () => new THREE.SphereGeometry(1, 14, 6, PI, PI, 0, PI / 2));
export const HALFCYL = () => cached('swHalfCyl', () => new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, PI / 2, PI).translate(0, 0.5, 0));
// a flared helmet skirt round the back and sides (Vader, Boba)
export const FLARE = () => cached('swFlare', () => new THREE.CylinderGeometry(1, 1.3, 1, 16, 1, false, PI * 0.3, PI * 1.4).translate(0, 0.5, 0));
export const HEADCYL = () => cached('swHeadCyl', () => new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0));

// ---- faces ----------------------------------------------------------------------------
const lips = (g, col, y = 70) => { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(128, y, 13, 0.25 * PI, 0.75 * PI); g.stroke(); };
export const FACE = {
  luke: () => faceMat('sw-luke', (g) => { simpleFace(g, { mouth: 'grin', brows: true }); }),
  leia: () => faceMat('sw-leia', (g) => {
    simpleFace(g, { eye: '#2a1608', mouth: 'smile' });
    lips(g, '#b0283a');
    g.strokeStyle = '#2a1608'; g.lineWidth = 3;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 20, 50); g.lineTo(128 + s * 27, 45); g.stroke(); g.beginPath(); g.moveTo(128 + s * 8, 40); g.lineTo(128 + s * 24, 38); g.stroke(); }
  }),
  han: () => faceMat('sw-han', (g) => {
    simpleFace(g, { eye: '#2a1608', mouth: 'smirk', brows: true });
    g.strokeStyle = '#c99a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(122, 96); g.lineTo(126, 104); g.stroke();
  }),
  yoda: () => faceMat('sw-yoda', (g) => {
    g.strokeStyle = '#5f7436'; g.lineWidth = 3;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(98, 22 + k * 8); g.quadraticCurveTo(128, 16 + k * 8, 158, 22 + k * 8); g.stroke(); }
    for (const s of [-1, 1]) {
      g.fillStyle = '#e8e2c0'; g.beginPath(); g.ellipse(128 + s * 22, 60, 15, 12, 0, 0, 7); g.fill();
      g.fillStyle = '#3a2410'; g.beginPath(); g.ellipse(128 + s * 22, 61, 9, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(128 + s * 20, 57, 2.5, 0, 7); g.fill();
      g.fillStyle = '#7d9448'; g.fillRect(128 + s * 22 - 16, 44, 32, 9);   // heavy lids
      g.strokeStyle = '#5f7436'; g.beginPath(); g.moveTo(128 + s * 6, 54); g.lineTo(128 + s * 36, 50); g.stroke();
      g.beginPath(); g.moveTo(128 + s * 10, 78); g.lineTo(128 + s * 30, 70); g.stroke();
    }
    g.strokeStyle = '#4a5a2a'; g.lineWidth = 4; g.beginPath(); g.arc(128, 82, 12, 0.2 * PI, 0.8 * PI); g.stroke();
  }, '#8fa65a'),
};

// classic minifig hair: a cap over the top plus a half-cylinder down the back
export function hair(hb, d, col, o = {}) {
  const R = d.headR, H = d.headH, m = plastic(col);
  hb.cyl(0, H * 0.74, 0, R * 1.08, H * 0.28, col, { seg: 18 });
  hb.sphere(0, H * 1.0, 0, R * 1.08, col, { sy: o.tall ?? 0.42 });
  hb.add(HALFCYL(), m, 0, H * (o.low ?? 0.15), -R * 0.04, 0, R * 1.1, H * (0.87 - (o.low ?? 0.15)), R * 1.1);
  if (o.fringe) rbox(hb, o.fringe * R * 0.3, H * 0.86, R * 0.86, R * 1.25, H * 0.2, R * 0.36, 0.45, 0, o.fringe * 0.3, col);
  if (o.sides) for (const sd of [-1, 1]) hb.box(sd * R * 0.98, H * 0.32, -R * 0.2, R * 0.2, H * 0.55, R * 1.0, col);
}

// ---- held props -----------------------------------------------------------------------
// Props are built in HAND space: the origin is the hand, the arm runs along +Y (back
// to the shoulder) and -Y continues out past the fist. A blade/barrel along -Y points
// wherever the arm points; along +Z it points up when the arm reaches forward.
export function handAt(rig, side, obj) {
  const arm = side > 0 ? rig.armL : rig.armR;
  obj.position.set(0, -0.6 * (rig.dims?.s ?? 1.3), 0.02);
  obj.visible = false;
  arm.add(obj);
  return obj;
}

// A lightsaber, blade along local +Y (rotate the group to aim it). double = Darth Maul.
export function saber(color, k = 1, { len = 1.3, double = false, hilt = 0xb4b8bc } = {}) {
  const g = new THREE.Group(); g.name = 'saber';
  const hb = new BrickBuilder(1);
  const hl = (double ? 0.5 : 0.26) * k, r = 0.055 * k;
  hb.cyl(0, -hl / 2, 0, r, hl, hilt, { seg: 8 });
  for (const y of double ? [-0.12, 0.12] : [-0.06]) hb.cyl(0, y * k - 0.03 * k, 0, r * 1.15, 0.06 * k, C.black, { seg: 8 });
  hb.cyl(0, hl / 2 - 0.03 * k, 0, r * 1.2, 0.04 * k, 0x5a5e62, { seg: 8 });
  if (double) hb.cyl(0, -hl / 2 - 0.01 * k, 0, r * 1.2, 0.04 * k, 0x5a5e62, { seg: 8 });
  g.add(hb.build({ name: 'saber-hilt' }));
  const blade = new THREE.Group();
  const bb = new BrickBuilder(1);
  for (const dir of double ? [1, -1] : [1]) {
    const y0 = dir * hl / 2, flip = dir < 0 ? PI : 0;
    bb.addMatrix(UCYL(), bladeMat(color), mat4(0, y0, 0, flip, 0, 0, 0.11 * k, len * k, 0.11 * k));
    bb.addMatrix(UCYL(), coreMat(), mat4(0, y0, 0, flip, 0, 0, 0.05 * k, len * k * 0.97, 0.05 * k));
  }
  blade.add(bb.build({ name: 'saber-blade' }));
  g.add(blade);
  g.userData.blade = blade;
  return g;
}

// Blasters, barrel along -Y (hand space); the top of the gun is +Z.
// kind: 'pistol' | 'dl44' | 'rifle' | 'mando' | 'bane'
export function blaster(kind, k = 1, { bolts = true, flash = true } = {}) {
  const g = new THREE.Group(); g.name = 'blaster';
  const b = new BrickBuilder(1);
  const dk = 0x2a2c30, gr = 0x6a6e72;
  if (kind === 'rifle') {   // E-11
    rbox(b, 0, -0.18 * k, 0.12 * k, 0.11 * k, 0.62 * k, 0.12 * k, 0, 0, 0, dk);
    rod(b, [0, -0.48 * k, 0.12 * k], [0, -0.72 * k, 0.12 * k], 0.04 * k, dk);
    rbox(b, 0, -0.2 * k, 0.21 * k, 0.05 * k, 0.24 * k, 0.06 * k, 0, 0, 0, gr);
    rbox(b, 0, 0.0, -0.04 * k, 0.08 * k, 0.1 * k, 0.2 * k, 0.2, 0, 0, dk);
    rbox(b, 0, -0.32 * k, 0.0, 0.06 * k, 0.06 * k, 0.18 * k, 0, 0, 0, dk);
    rbox(b, 0, 0.2 * k, 0.12 * k, 0.05 * k, 0.24 * k, 0.04 * k, 0, 0, 0, dk);   // folded stock
  } else {
    const L = kind === 'dl44' ? 0.42 : kind === 'bane' ? 0.5 : 0.36;
    const col = kind === 'mando' ? 0x3a3a3e : kind === 'pistol' ? 0x1c1c1c : dk;
    rbox(b, 0, -0.12 * k, 0.1 * k, 0.1 * k, 0.32 * k, 0.13 * k, 0, 0, 0, col);
    rod(b, [0, -0.25 * k, 0.12 * k], [0, -(0.1 + L) * k, 0.12 * k], 0.035 * k, col);
    rbox(b, 0, 0.0, -0.06 * k, 0.08 * k, 0.1 * k, 0.2 * k, 0.15, 0, 0, kind === 'mando' ? 0x6b4a2e : col);
    if (kind === 'dl44') { rbox(b, 0, -0.16 * k, 0.21 * k, 0.05 * k, 0.24 * k, 0.06 * k, 0, 0, 0, gr); rod(b, [0, -0.36 * k, 0.12 * k], [0, -0.5 * k, 0.12 * k], 0.05 * k, gr); }
    if (kind === 'bane') rod(b, [0, -0.2 * k, 0.04 * k], [0, -0.45 * k, 0.04 * k], 0.03 * k, gr);
    if (kind === 'mando') rbox(b, 0, -0.14 * k, 0.19 * k, 0.04 * k, 0.18 * k, 0.05 * k, 0, 0, 0, 0xa0a4a8);
  }
  g.add(b.build({ name: 'blaster-body' }));
  const tip = kind === 'rifle' ? 0.74 : kind === 'dl44' ? 0.55 : kind === 'bane' ? 0.62 : 0.48;
  if (bolts) {
    const bolt = new THREE.Mesh(UCYL(), boltMat());
    bolt.scale.set(0.045 * k, 0.4 * k, 0.045 * k);
    bolt.rotation.x = PI;
    bolt.position.set(0, -tip * k, 0.12 * k);
    bolt.visible = false;
    g.add(bolt); g.userData.bolt = bolt;
  }
  if (flash) {
    const fl = new THREE.Mesh(cached('swFlashGeo', () => new THREE.SphereGeometry(1, 8, 6)), flashMat());
    fl.scale.set(0.11 * k, 0.16 * k, 0.11 * k);
    fl.position.set(0, -(tip + 0.06) * k, 0.12 * k);
    fl.visible = false;
    g.add(fl); g.userData.flash = fl;
  }
  g.userData.tip = tip * k;
  return g;
}

// Tusken gaffi stick lying along hand-space X (it spans both hands when raised overhead)
export function gaffi(k = 1) {
  const b = new BrickBuilder(1), wood = 0x6b5434, mt = 0x8a8e92;
  rod(b, [-0.35 * k, 0, 0], [1.05 * k, 0, 0], 0.045 * k, wood);
  rod(b, [-0.35 * k, 0, 0], [-0.48 * k, 0, 0], 0.06 * k, mt);
  rbox(b, -0.5 * k, 0, 0, 0.08 * k, 0.1 * k, 0.5 * k, 0, 0, 0, mt);
  for (const sd of [-1, 1]) rbox(b, -0.56 * k, 0, sd * 0.26 * k, 0.16 * k, 0.06 * k, 0.1 * k, 0, 0, 0, mt);
  rbox(b, 1.05 * k, 0, 0, 0.12 * k, 0.09 * k, 0.09 * k, 0, 0, 0, mt);
  for (const x of [0.1, 0.55]) rod(b, [x * k, 0, 0], [(x + 0.06) * k, 0, 0], 0.055 * k, 0x3a2a1a);
  const g = b.build({ name: 'gaffi' });
  return g;
}

// a flame cone pointing along `dir` ('down' or 'back'), its base at the origin
export function flames(points, len = 0.6, r = 0.12, dir = 'down') {
  const b = new BrickBuilder(1);
  for (const [x, y, z] of points) {
    if (dir === 'down') b.addMatrix(CONE(), fireMat(), mat4(x, y - len / 2, z, PI, 0, 0, r, len, r));
    else b.addMatrix(CONE(), fireMat(), mat4(x, y, z - len / 2, -PI / 2, 0, 0, r, len, r));
  }
  for (const [x, y, z] of points) {
    if (dir === 'down') b.addMatrix(CONE(), coreMat(), mat4(x, y - len * 0.3, z, PI, 0, 0, r * 0.5, len * 0.55, r * 0.5));
    else b.addMatrix(CONE(), coreMat(), mat4(x, y, z - len * 0.3, -PI / 2, 0, 0, r * 0.5, len * 0.55, r * 0.5));
  }
  const g = b.build({ name: 'flames' });
  g.visible = false;
  return g;
}

// ---- fx helpers (no allocation; called every frame) ------------------------------------
// 0..1 strength of a prop for gesture/phase `name`: grows in, holds, retracts at the end
export function strength(name, f, names) {
  if (!names.includes(name)) return 0;
  return PHASES.has(name) ? 1 : Math.max(0, Math.min(1, f * 7, (1 - f) * 7));
}
export function showSaber(g, k) {
  g.visible = k > 0;
  const bl = g.userData.blade;
  bl.visible = k > 0.15;
  bl.scale.y = Math.max(0.05, Math.min(1, (k - 0.15) / 0.85));
}
// shooting: bolts fly out along the barrel, the muzzle flashes
export function shoot(g, on, t, rate = 5, phase = 0) {
  const u = (t * rate + phase) % 1, bolt = g.userData.bolt, fl = g.userData.flash;
  if (bolt) { bolt.visible = on; if (on) bolt.position.y = -g.userData.tip - u * 3.2; }
  if (fl) { fl.visible = on && u < 0.18; }
}
export function hideAll(...objs) { for (const o of objs) o.visible = false; }
