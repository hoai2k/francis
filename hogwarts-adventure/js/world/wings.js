// Optional castle wings: the Library (with the Restricted Section), the Greenhouses, the
// Astronomy Tower with the Owlery across a little bridge, and the Divination room. Each has
// a teacher and a class minigame. Doors are added to the Grand Staircase and the grounds.
import * as THREE from 'three';
import { G } from '../state.js';
import { OFFSETS, makeZone, room, torch, animateFlames, doorFrame } from './interiors.js';
import { Builder, mat4, instanced } from './builder.js';
import { materials } from './materials.js';
import { makeOwl } from './journey.js';
import { groundHeight } from './terrain.js';
import { mulberry32 } from '../util.js';

OFFSETS.library = new THREE.Vector3(15000, 0, 0);
OFFSETS.greenhouse = new THREE.Vector3(16000, 0, 0);
OFFSETS.astronomy = new THREE.Vector3(17000, 0, 0);
OFFSETS.divination = new THREE.Vector3(18000, 0, 0);

const bookColors = [0x7a2a1a, 0x1a3a6a, 0x2a5a2a, 0x6a5a1a, 0x4a1a4a, 0x2a2a2a];
function shelf(B, M, x, z, ry, len, h, books, rnd) {
  B.box(M.woodDark, x, h / 2, z, len, h, 0.8, ry);
  const c = Math.cos(ry), s = Math.sin(ry);
  for (let r = 0; r < Math.floor(h / 0.9); r++) for (let k = 0; k < len / 0.5 - 1; k++) {
    if (rnd() < 0.15) continue;
    const off = -len / 2 + 0.4 + k * 0.5;
    for (const side of [-1, 1]) books.push({ m: mat4(x + c * off + s * side * 0.42, 0.45 + r * 0.9, z - s * off + c * side * 0.42, ry, 0.42, 0.7 + rnd() * 0.15, 0.08), c: bookColors[Math.floor(rnd() * bookColors.length)] });
  }
}
function bookMeshes(zone, books) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  const m = new THREE.InstancedMesh(geo, mat, books.length);
  const col = new THREE.Color();
  books.forEach((b, i) => { m.setMatrixAt(i, b.m); m.setColorAt(i, col.set(b.c)); });
  zone.group.add(m);
}

// ================================================================== LIBRARY
export function buildLibrary(Q) {
  const M = materials();
  const zone = makeZone('library', 'The Library', { fog: { color: 0x18120c, density: 0.012 } });
  const { C, W } = zone;
  const B = new Builder();
  const rnd = mulberry32(31);
  const w = 12, d = 44, h = 10;
  room(B, C, M, -w, -d, w, 0, h, { doors: [{ side: 's', at: 0, w: 3, h: 4.5, cam: true }], wall: M.stoneWarm, floor: M.wood, ceilMat: M.woodDark });
  const books = [];
  for (const sx of [-1, 1]) for (let z = -6; z > -30; z -= 6) { shelf(B, M, sx * 7, z, Math.PI / 2, 4.5, 5, books, rnd); C.box(sx * 7, 2.5, z, 0.4, 2.5, 2.25); }
  for (const sx of [-1, 1]) for (let z = -3; z > -32; z -= 4) { shelf(B, M, sx * (w - 0.5), z, Math.PI / 2, 3.6, 7, books, rnd); }
  // reading tables down the middle
  for (let z = -8; z > -30; z -= 8) { B.box(M.wood, 0, 0.8, z, 2.2, 0.12, 4); C.box(0, 0.45, z, 1.1, 0.45, 2); zone.anchors.push({ pos: W(0, 2, z), color: 0xffc070, intensity: 10, distance: 8, flicker: true }); }
  // the Restricted Section behind an iron fence at the far end (z -34 .. -44)
  for (let x = -w + 0.5; x <= w - 0.5; x += 0.5) if (Math.abs(x) > 1.6) B.add(new THREE.CylinderGeometry(0.04, 0.04, 3, 5), M.iron, mat4(x, 1.5, -34));
  B.box(M.iron, 0, 3, -34, 2 * w, 0.1, 0.1);
  for (const sx of [-1, 1]) C.box(sx * (w + 1.6) / 2, 1.5, -34, (w - 1.6) / 2, 1.5, 0.15);
  for (const sx of [-1, 1]) for (let z = -37; z > -43; z -= 3) { shelf(B, M, sx * 6, z, Math.PI / 2, 2.4, 5, books, rnd); C.box(sx * 6, 2.5, z, 0.4, 2.5, 1.2); }
  const chains = new THREE.MeshStandardMaterial({ color: 0x5a5a60, metalness: 0.8, roughness: 0.4 });
  for (let i = 0; i < 6; i++) B.box(chains, -2 + i * 0.8, 3.5, -43.3, 0.05, 3, 0.05);
  bookMeshes(zone, books);
  for (const [x, z] of [[-w + 0.6, -10], [w - 0.6, -10], [-w + 0.6, -24], [w - 0.6, -24]]) torch(zone, B, M, x - Math.sign(x) * 0.5, 3.4, z, 0);
  zone.anchors.push({ pos: W(0, 3, -40), color: 0x7080ff, intensity: 10, distance: 10, flicker: true });
  B.build(zone.group);
  zone.spots = { librarian: W(-2.5, 0, -4), desk: W(-2.5, 0, -3), gate: W(0, 0, -34), restricted: W(0, 0, -39), tome: W(0, 1.4, -43) };
  zone.spawn = { pos: W(0, 0, -2), yaw: Math.PI };
  zone.portals.push({ pos: W(0, 0, -0.6), r: 1.6, to: 'staircase', at: 'fromLibrary', label: 'Grand Staircase' });
  zone.entries = { fromStairs: { pos: W(0, 0, -2), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(0.3, 1, 0.2), color: 0xffd8a8, intensity: 0.5 };
  zone.hemi = { sky: 0x6a5040, ground: 0x1a120a, intensity: 0.75 };
  zone.exposure = 1.25; zone.env = 0.2;
  zone.update = (dt, t) => animateFlames(zone, t);
  return zone;
}

// ================================================================== GREENHOUSE
export function buildGreenhouse(Q) {
  const M = materials();
  const zone = makeZone('greenhouse', 'Greenhouse Three', { fog: { color: 0x3a4a30, density: 0.01 } });
  const { C, W } = zone;
  const B = new Builder();
  const rnd = mulberry32(13);
  const w = 8, d = 24, h = 6;
  B.box(new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 1 }), 0, -0.25, -d / 2, 2 * w + 2, 0.5, d + 2);
  const glass = new THREE.MeshStandardMaterial({ color: 0xb8e0d0, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false });
  const frame = new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.5 });
  for (const sx of [-1, 1]) { B.box(glass, sx * w, h / 2, -d / 2, 0.05, h, d); C.box(sx * w, h / 2, -d / 2, 0.1, h / 2, d / 2); for (let z = 0; z >= -d; z -= 3) B.box(frame, sx * w, h / 2, z, 0.12, h, 0.12); }
  B.box(glass, 0, h / 2, -d, 2 * w, h, 0.05); C.box(0, h / 2, -d, w, h / 2, 0.1);
  for (const sx of [-1, 1]) { B.box(glass, sx * w / 2, h / 2, 0, w - 1.5, h, 0.05); C.box(sx * (w + 1.5) / 2, h / 2, 0, (w - 1.5) / 2, h / 2, 0.1); }
  for (const sx of [-1, 1]) B.add(new THREE.BoxGeometry(w + 0.6, 0.05, d), glass, mat4(sx * w / 2, h + 1.2, -d / 2, 0, 1, 1, 1, 0, sx * 0.45));
  for (let z = 0; z >= -d; z -= 3) for (const sx of [-1, 1]) B.box(frame, sx * w / 2, h + 1.2, z, w + 0.6, 0.1, 0.1, 0, 0, sx * 0.45);
  // benches with pots and plants
  const pot = new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.8 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.8, flatShading: true });
  for (const sx of [-1, 1]) {
    B.box(M.wood, sx * 5.5, 0.85, -12, 2, 0.1, 18); C.box(sx * 5.5, 0.45, -12, 1, 0.45, 9);
    for (let z = -4; z > -21; z -= 2) { B.add(new THREE.CylinderGeometry(0.3, 0.22, 0.45, 8), pot, mat4(sx * 5.5, 1.13, z)); B.add(new THREE.IcosahedronGeometry(0.35 + rnd() * 0.3, 0), leaf, mat4(sx * 5.5, 1.6, z, rnd() * 6, 1, 1.2, 1)); }
  }
  // the mandrake bench for the lesson
  B.box(M.wood, 0, 0.85, -18, 4, 0.1, 1.6); C.box(0, 0.45, -18, 2, 0.45, 0.8);
  zone.mandrakePots = [];
  for (let i = 0; i < 6; i++) { const x = -1.5 + (i % 3) * 1.5, z = -17.6 - Math.floor(i / 3) * 0.8; B.add(new THREE.CylinderGeometry(0.3, 0.22, 0.45, 8), pot, mat4(x, 1.13, z)); zone.mandrakePots.push(W(x, 1.35, z)); }
  // hanging plants and a Venomous Tentacula
  for (let i = 0; i < 10; i++) B.add(new THREE.IcosahedronGeometry(0.4, 0), leaf, mat4(-6 + rnd() * 12, 4.5, -2 - rnd() * 20));
  B.build(zone.group, { cast: false });
  zone.anchors.push({ pos: W(0, 5, -8), color: 0xfff0c0, intensity: 30, distance: 20 });
  zone.anchors.push({ pos: W(0, 5, -18), color: 0xfff0c0, intensity: 30, distance: 20 });
  zone.spots = { teacher: W(0, 0, -20.2), bench: W(0, 0, -16) };
  zone.spawn = { pos: W(0, 0, -2), yaw: Math.PI };
  zone.portals.push({ pos: W(0, 0, -0.4), r: 1.5, to: 'grounds', at: 'fromGreenhouse', label: 'Out to the grounds' });
  zone.entries = { fromGrounds: { pos: W(0, 0, -2), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(0.3, 1, 0.4), color: 0xfff4d8, intensity: 1.2 };
  zone.hemi = { sky: 0xd8f0d0, ground: 0x3a3020, intensity: 1.0 };
  zone.exposure = 1.1; zone.env = 0.4;
  return zone;
}

// the greenhouse building on the grounds, west of the castle road
export function addGreenhouseExterior() {
  const g = G.world.zones.grounds;
  if (g.greenhouse) return;
  const x = -70, z = 78, y = groundHeight(x, z);
  const B = new Builder();
  const glass = new THREE.MeshStandardMaterial({ color: 0xc8f0e0, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 });
  const frame = new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.5 });
  B.box(glass, x, y + 2.5, z, 16, 5, 9);
  for (const sx of [-1, 1]) B.add(new THREE.BoxGeometry(8.4, 0.08, 16), glass, mat4(x + 0, y + 5.9, z + sx * 2.3, Math.PI / 2, 1, 1, 1, 0, sx * 0.5));
  for (let i = -8; i <= 8; i += 2) B.box(frame, x + i, y + 2.5, z + 4.5, 0.12, 5, 0.12);
  B.box(new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.6 }), x, y + 1.3, z + 4.55, 1.6, 2.6, 0.1);
  const group = new THREE.Group();
  B.build(group);
  g.world.add(group);
  g.colliders.box(x, y + 2.5, z, 8, 2.5, 4.5);
  g.greenhouse = group;
  g.portals.push({ pos: new THREE.Vector3(x, y, z + 5.4), r: 1.6, to: 'greenhouse', at: 'fromGrounds', label: 'Enter Greenhouse Three' });
  g.entries.fromGreenhouse = { pos: new THREE.Vector3(x, groundHeight(x, z + 7), z + 7), yaw: 0 };
}

// ================================================================== ASTRONOMY TOWER + OWLERY
export function buildAstronomy(Q) {
  const M = materials();
  const zone = makeZone('astronomy', 'The Astronomy Tower', { fog: { color: 0x0a1020, density: 0.004 } });
  const { C, W } = zone;
  const B = new Builder();
  const R = 9, top = 0;
  B.add(new THREE.CylinderGeometry(R, R, 0.6, 32), M.stone, mat4(0, top - 0.3, -10));
  C.cyl(0, -10, R, top - 0.6, top);
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; if (Math.abs(a - Math.PI) < 0.25) continue; const x = Math.sin(a) * R, z = -10 + Math.cos(a) * R; B.box(M.stoneWarm, x, top + 0.6, z, 1.8, 1.2, 0.5, a); C.box(x, top + 0.6, z, 0.9, 0.6, 0.3, a); }
  // stairwell hatch back down, telescopes on tripods
  B.box(M.dark, 0, top + 0.02, -3.5, 2, 0.04, 2);
  for (const [x, z] of [[-4, -10], [3, -13], [4, -7]]) { B.add(new THREE.CylinderGeometry(0.2, 0.28, 2.2, 10), M.gold, mat4(x, top + 1.8, z, 0, 1, 1, 1, 0.9)); for (let k = 0; k < 3; k++) B.add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5), M.wood, mat4(x + Math.cos(k * 2.1) * 0.4, top + 0.7, z + Math.sin(k * 2.1) * 0.4, 0, 1, 1, 1, Math.cos(k * 2.1) * 0.35, Math.sin(k * 2.1) * 0.35)); }
  // the rope bridge to the Owlery
  const bz0 = -10 - R, bz1 = bz0 - 14;
  B.box(M.wood, 0, top - 0.1, (bz0 + bz1) / 2, 2.2, 0.2, 14); C.box(0, top - 0.1, (bz0 + bz1) / 2, 1.1, 0.1, 7);
  for (const sx of [-1, 1]) { B.box(M.wood, sx * 1.1, top + 0.9, (bz0 + bz1) / 2, 0.08, 0.08, 14); C.box(sx * 1.2, top + 0.6, (bz0 + bz1) / 2, 0.1, 0.6, 7); }
  // the Owlery: a round stone room full of owls
  const oz = bz1 - 6, OR = 6;
  B.add(new THREE.CylinderGeometry(OR, OR, 0.5, 24), M.stone, mat4(0, top - 0.25, oz)); C.cyl(0, oz, OR, top - 0.5, top);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; if (Math.abs(a) < 0.3) continue; const x = Math.sin(a) * OR, z = oz + Math.cos(a) * OR; B.box(M.stoneWarm, x, top + 3, z, 2, 6, 0.6, a); C.box(x, top + 3, z, 1, 3, 0.35, a); }
  B.add(new THREE.ConeGeometry(OR + 1, 4, 24), M.roof, mat4(0, top + 8, oz));
  const owls = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + 0.3; if (Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.4) continue; const r = OR - 0.6; const x = Math.sin(a) * r, z = oz + Math.cos(a) * r, y = top + 1.2 + (i % 3) * 1.4; B.box(M.wood, x, y - 0.1, z, 0.9, 0.1, 0.5, a); owls.push([x, y, z, a + Math.PI]); }
  B.build(zone.group);
  for (const [x, y, z, a] of owls) { const o = makeOwl(['#c8a878', '#e8e0d0', '#6a5a4a', '#a88858'][Math.floor(Math.random() * 4)]); o.position.set(x, y, z); o.rotation.y = a; zone.group.add(o); }
  // a starry sky
  const sg = new THREE.BufferGeometry();
  const sp = [];
  const rnd = mulberry32(5);
  for (let i = 0; i < 900; i++) { const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2; const r = Math.sqrt(1 - u * u); const v = new THREE.Vector3(r * Math.cos(t), Math.abs(u) * 0.9 + 0.05, r * Math.sin(t)).normalize().multiplyScalar(300); sp.push(v.x, v.y, v.z - 10); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }));
  zone.group.add(stars);
  zone.anchors.push({ pos: W(0, 3, -10), color: 0x8090ff, intensity: 12, distance: 18 });
  zone.anchors.push({ pos: W(0, 3, oz), color: 0xffc080, intensity: 16, distance: 12, flicker: true });
  zone.spots = { teacher: W(-2, top, -6), telescope: W(3, top, -12), owlery: W(0, top, oz), post: W(0, top, oz + 2) };
  zone.spawn = { pos: W(0, top, -4.5), yaw: Math.PI };
  zone.portals.push({ pos: W(0, top, -3.5), r: 1.2, to: 'staircase', at: 'fromAstronomy', label: 'Down the tower stairs' });
  zone.entries = { fromStairs: { pos: W(0, top, -5), yaw: Math.PI } };
  zone.killY = top - 20;
  zone.checkpoint = zone.spawn;
  zone.dirLight = { dir: new THREE.Vector3(0.3, 1, 0.2), color: 0x8090c0, intensity: 0.5 };
  zone.hemi = { sky: 0x3a4a7a, ground: 0x0a0a14, intensity: 0.8 };
  zone.exposure = 1.3; zone.env = 0.15;
  zone.colliders.terrain = () => -100;
  return zone;
}

// ================================================================== DIVINATION
export function buildDivination(Q) {
  const M = materials();
  const zone = makeZone('divination', 'The Divination Room', { fog: { color: 0x2a1418, density: 0.02 } });
  const { C, W } = zone;
  const B = new Builder();
  const rnd = mulberry32(77);
  const R = 9;
  B.add(new THREE.CylinderGeometry(R, R, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x5a2a3a, roughness: 0.95 }), mat4(0, -0.25, -9));
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; if (Math.abs(a - Math.PI) < 0.2) continue; const x = Math.sin(a) * R, z = -9 + Math.cos(a) * R; B.box(M.plaster || M.stoneWarm, x, 3, z, 2.5, 6, 0.6, a); C.box(x, 3, z, 1.25, 3, 0.35, a); }
  B.add(new THREE.ConeGeometry(R + 0.6, 4, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a1a24, roughness: 0.9, side: THREE.DoubleSide }), mat4(0, 8, -9));
  const silk = [0xc04060, 0x8040a0, 0xd08030];
  for (let i = 0; i < 6; i++) B.add(new THREE.PlaneGeometry(1.2, 5), new THREE.MeshStandardMaterial({ color: silk[i % 3], side: THREE.DoubleSide, roughness: 0.9 }), mat4(Math.sin(i) * 5, 6, -9 + Math.cos(i) * 5, i, 1, 1, 1, 0.4));
  // little round tables with crystal balls and poufs
  const ball = new THREE.MeshStandardMaterial({ color: 0xd0e0ff, transparent: true, opacity: 0.6, roughness: 0.02, metalness: 0.3, emissive: 0x304080, emissiveIntensity: 0.6 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, x = Math.sin(a) * 4.5, z = -9 + Math.cos(a) * 4.5;
    B.add(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), M.woodDark, mat4(x, 0.7, z)); B.add(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 6), M.woodDark, mat4(x, 0.35, z));
    C.cyl(x, z, 0.7, 0, 0.75);
    B.add(new THREE.SphereGeometry(0.22, 14, 10), ball, mat4(x, 0.96, z));
    for (const s of [-1, 1]) B.add(new THREE.SphereGeometry(0.45, 10, 6), new THREE.MeshStandardMaterial({ color: silk[(i + (s > 0 ? 1 : 2)) % 3], roughness: 1 }), mat4(x + Math.cos(a) * s * 1.1, 0.25, z - Math.sin(a) * s * 1.1, 0, 1, 0.5, 1));
  }
  B.build(zone.group);
  for (let i = 0; i < 6; i++) zone.anchors.push({ pos: W(Math.sin(i) * 6, 2.5, -9 + Math.cos(i) * 6), color: 0xff8070, intensity: 8, distance: 9, flicker: true });
  zone.spots = { teacher: W(0, 0, -15), centre: W(0, 0, -9) };
  zone.spawn = { pos: W(0, 0, -1.5), yaw: Math.PI };
  zone.portals.push({ pos: W(0, 0, -0.4), r: 1.3, to: 'staircase', at: 'fromDivination', label: 'Down the ladder' });
  zone.entries = { fromStairs: { pos: W(0, 0, -1.8), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(0.3, 1, 0.2), color: 0xffa080, intensity: 0.4 };
  zone.hemi = { sky: 0x8a4a5a, ground: 0x1a0a0c, intensity: 0.8 };
  zone.exposure = 1.3; zone.env = 0.2;
  return zone;
}

// doors on the Grand Staircase walls to the Library, the Astronomy Tower and Divination
export function addWingDoors() {
  const st = G.world.zones.staircase;
  if (st.wingDoors) return;
  st.wingDoors = true;
  const M = materials();
  const B = new Builder();
  const S = 14, landA = 8, landB = 16;
  const W = (x, y, z) => st.W(x, y, z);
  // frames drawn on the walls (local coordinates; the builder group sits at the zone offset)
  doorFrame(B, M, 6, S - 0.55, Math.PI, 3, 4, 0);
  doorFrame(B, M, 8, -S + 0.55, 0, 3, 4, landA);
  doorFrame(B, M, 6, S - 0.55, Math.PI, 3, 4, landB);
  const g = new THREE.Group();
  B.build(g);
  st.group.add(g);
  const sign = (text, x, y, z, ry) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 48;
    const x2 = c.getContext('2d'); x2.fillStyle = '#2a1e10'; x2.fillRect(0, 0, 256, 48); x2.fillStyle = '#f0d890'; x2.font = '600 26px Cinzel, serif'; x2.textAlign = 'center'; x2.fillText(text, 128, 33);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
    m.position.set(x, y, z); m.rotation.y = ry; st.group.add(m);
  };
  sign('Library', 6, 4.6, S - 0.62, Math.PI);
  sign('Astronomy', 8, landA + 4.6, -S + 0.62, 0);
  sign('Divination', 6, landB + 4.6, S - 0.62, Math.PI);
  st.portals.push({ pos: W(6, 0, S - 1.2), r: 1.5, to: 'library', at: 'fromStairs', label: 'The Library' });
  st.portals.push({ pos: W(8, landA, -S + 1.2), r: 1.4, to: 'astronomy', at: 'fromStairs', label: 'Up to the Astronomy Tower' });
  st.portals.push({ pos: W(6, landB, S - 1.2), r: 1.4, to: 'divination', at: 'fromStairs', label: 'Up to the Divination Room' });
  st.entries.fromLibrary = { pos: W(6, 0, S - 3), yaw: Math.PI };
  st.entries.fromAstronomy = { pos: W(8, landA, -S + 3), yaw: 0 };
  st.entries.fromDivination = { pos: W(6, landB, S - 3), yaw: Math.PI };
}
