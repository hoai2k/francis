// Hogsmeade village (from Year 3): a crooked high street of timber-framed cottages with
// a sweet shop, a joke shop, Scrivenshaw's general store, the Three Lanterns pub and the
// little railway station. Outdoor zone with its own valley terrain; snowy in winter.
import * as THREE from 'three';
import { G } from '../state.js';
import { Colliders } from '../collision.js';
import { Builder, mat4, instanced } from './builder.js';
import { materials } from './materials.js';
import { textTexture } from '../textures.js';
import { fbm, noise2, smoothstep, mulberry32 } from '../util.js';

export const HG = new THREE.Vector3(0, 0, 7000); // village origin
export function hogsHeight(x, z) {
  const lx = x - HG.x, lz = z - HG.z;
  let h = (fbm(lx * 0.008, lz * 0.008, 3) - 0.5) * 10;
  // the high street runs along z; flatten it and the square
  const street = Math.abs(lx) < 16 && lz > -90 && lz < 80 ? 1 : 0;
  h *= 1 - street * 0.9;
  h = h * smoothstep(8, 30, Math.abs(lx)) + h * 0.1;
  const r = Math.hypot(lx, lz);
  h += smoothstep(120, 260, r) * (40 + fbm(lx * 0.01, lz * 0.01, 3) * 60);
  return h;
}

const SHOPS = [
  // [side, z, width, label, kind, colour]
  [-1, -60, 10, 'Honeydew’s Sweets', 'sweetshop', '#d86aa0'],
  [-1, -40, 9, 'Grinwick’s Jokes', 'jokeshop', '#e0a030'],
  [-1, -18, 12, 'The Three Lanterns', 'pub', '#c08040'],
  [-1, 6, 9, 'Owl Post Office', 'owls', '#7a8aa0'],
  [-1, 28, 10, null, null, '#9a8a70'],
  [1, -62, 10, 'Scrivenshaw’s', 'general', '#4a8a6a'],
  [1, -40, 10, null, null, '#a09070'],
  [1, -16, 11, 'Madam Puddock’s Tea Shop', 'tea', '#c07090'],
  [1, 8, 9, 'Spintwitch’s Broom Shop', 'brooms', '#a05030'],
  [1, 30, 10, null, null, '#8a7a6a'],
  [-1, 50, 9, null, null, '#988870'],
  [1, 52, 10, null, null, '#a09880'],
];

export function buildHogsmeade(Q) {
  const M = materials();
  const group = new THREE.Group();
  group.name = 'hogsmeade';
  const col = new Colliders();
  col.terrain = hogsHeight;
  const zone = { name: 'hogsmeade', label: 'Hogsmeade', outdoor: true, group, world: new THREE.Group(), colliders: col, anchors: [], portals: [], props: [],
    fog: { color: 0xa8b0c0, density: 0.006 }, spawn: { pos: new THREE.Vector3(HG.x, 0, HG.z + 74), yaw: Math.PI } };
  const W = (x, y, z) => new THREE.Vector3(HG.x + x, (y ?? 0) + hogsHeight(HG.x + x, HG.z + z), HG.z + z);
  zone.W = W;
  // terrain
  const seg = Q.terrainSeg < 150 ? 70 : 110;
  const geo = new THREE.PlaneGeometry(560, 560, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + HG.x, z = pos.getZ(i) + HG.z;
    const h = hogsHeight(x, z);
    pos.setY(i, h);
    const lx = x - HG.x, lz = z - HG.z;
    const road = Math.abs(lx) < 7 && lz > -95 && lz < 95;
    c.setRGB(0.12, 0.2, 0.08).lerp(new THREE.Color(0.25, 0.24, 0.22), smoothstep(25, 60, h));
    if (road) c.setRGB(0.22, 0.2, 0.18);
    c.multiplyScalar(0.85 + noise2(x * 0.1, z * 0.1) * 0.3);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.position.set(HG.x, 0, HG.z);
  terrain.receiveShadow = true;
  group.add(terrain);
  zone.terrainMat = terrainMat;
  // buildings
  const B = new Builder();
  const roofM = M.roof, beam = M.woodDark, plaster = M.plaster;
  const winLit = new THREE.MeshStandardMaterial({ color: 0x302010, emissive: 0xffc070, emissiveIntensity: 1.1, roughness: 0.3 });
  winLit.userData.noShadow = true;
  zone.doors = [];
  for (const [side, z, w, label, kind, colour] of SHOPS) {
    const d = 9, h = 6 + (z % 3 === 0 ? 1.5 : 0);
    const x = side * (12 + d / 2);
    const y = hogsHeight(HG.x + x, HG.z + z) - 0.4;
    const wall = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, map: plaster.map, normalMap: plaster.normalMap });
    B.box(wall, x, y + h / 2, z, d, h, w);
    col.box(HG.x + x, y + h / 2, HG.z + z, d / 2, h / 2, w / 2);
    // timber frame on the street face
    const fx = x - side * (d / 2 + 0.06);
    for (let k = 0; k <= 4; k++) B.box(beam, fx, y + h / 2, z - w / 2 + (k / 4) * w, 0.14, h, 0.22);
    B.box(beam, fx, y + h * 0.55, z, 0.14, 0.22, w);
    // windows and door
    for (const dz of [-w / 3, w / 3]) {
      B.box(winLit, fx - side * 0.02, y + 1.8, z + dz, 0.05, 1.3, 1.5);
      B.box(winLit, fx - side * 0.02, y + h * 0.75, z + dz, 0.05, 1.0, 1.2);
    }
    B.box(beam, fx - side * 0.03, y + 1.25, z, 0.06, 2.5, 1.4);
    // pitched roof (two slabs) + chimney
    const half = d / 2 + 0.6, ang = 0.62, L = half / Math.cos(ang), rise = Math.tan(ang) * half / 2;
    B.box(roofM, x - half / 2, y + h + rise, z, L, 0.35, w + 1.2, 0, 0, ang);
    B.box(roofM, x + half / 2, y + h + rise, z, L, 0.35, w + 1.2, 0, 0, -ang);
    const tri = new THREE.Shape([new THREE.Vector2(-half + 0.5, 0), new THREE.Vector2(half - 0.5, 0), new THREE.Vector2(0, rise * 2 - 0.3)]);
    const triG = new THREE.ShapeGeometry(tri);
    for (const dz of [-1, 1]) B.add(triG, wall, mat4(x, y + h, z + dz * w / 2, dz > 0 ? 0 : Math.PI));
    B.box(M.stoneDark, x + side * 1.5, y + h + 2.6, z + w / 3, 0.8, 2.4, 0.8);
    zone.anchors.push({ pos: new THREE.Vector3(HG.x + fx - side * 1.5, y + 2.4, HG.z + z), color: 0xffb060, intensity: 14, distance: 9, flicker: true });
    if (label) {
      const t = textTexture([{ text: label, font: 'bold 40px Cinzel, serif', color: '#f6dc9a' }], { w: 512, h: 96, bg: '#2a1a10' });
      B.add(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshStandardMaterial({ map: t.tex, emissive: 0xffffff, emissiveMap: t.tex, emissiveIntensity: 0.3 }), mat4(fx - side * 0.1, y + 3.3, z, -side * Math.PI / 2));
      zone.doors.push({ kind, label, pos: new THREE.Vector3(HG.x + fx - side * 1.2, y + 0.4, HG.z + z) });
    }
    zone.chimneys = zone.chimneys || [];
    zone.chimneys.push(new THREE.Vector3(HG.x + x + side * 1.5, y + h + 4, HG.z + z + w / 3));
  }
  // street lamps
  for (let z = -80; z <= 70; z += 15) for (const sx of [-1, 1]) {
    const x = sx * 8.5, y = hogsHeight(HG.x + x, HG.z + z);
    B.add(new THREE.CylinderGeometry(0.08, 0.12, 3.4, 8), M.iron, mat4(x, y + 1.7, z));
    B.add(new THREE.CylinderGeometry(0.28, 0.2, 0.5, 6), winLit, mat4(x, y + 3.6, z));
    col.cyl(HG.x + x, HG.z + z, 0.2, y, y + 4);
    if ((z / 15) % 2 === 0) zone.anchors.push({ pos: new THREE.Vector3(HG.x + x, y + 3.6, HG.z + z), color: 0xffb060, intensity: 16, distance: 12, flicker: true, night: true });
  }
  // the village square with a well, and the little station at the north end
  const sqY = hogsHeight(HG.x, HG.z - 2);
  B.add(new THREE.CylinderGeometry(1.4, 1.5, 1, 14), M.stone, mat4(0, sqY + 0.5, -2));
  B.add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), M.woodDark, mat4(-1.2, sqY + 1.8, -2));
  B.add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), M.woodDark, mat4(1.2, sqY + 1.8, -2));
  B.box(M.roof, 0, sqY + 3.1, -2, 3, 0.2, 2, 0, 0, 0);
  col.cyl(HG.x, HG.z - 2, 1.5, sqY, sqY + 1);
  const stY = hogsHeight(HG.x, HG.z - 92);
  B.box(M.stone, 0, stY + 0.4, -96, 30, 0.8, 6);
  B.box(M.woodDark, 0, stY + 4.2, -97, 30, 0.3, 5);
  for (let x = -14; x <= 14; x += 7) B.add(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 8), M.iron, mat4(x, stY + 2.4, -95));
  const sn = textTexture([{ text: 'HOGSMEADE', font: 'bold 64px Cinzel, serif', color: '#f4f0e8' }], { w: 512, h: 128, bg: '#5a0a0e' });
  B.add(new THREE.PlaneGeometry(5, 1.2), new THREE.MeshStandardMaterial({ map: sn.tex, emissive: 0xffffff, emissiveMap: sn.tex, emissiveIntensity: 0.3 }), mat4(0, stY + 3.4, -94.8));
  col.box(HG.x, stY + 0.4, HG.z - 96, 15, 0.4, 3);
  B.build(group);
  // pine forest around the valley
  const rnd = mulberry32(13);
  const trees = [];
  for (let i = 0; i < Math.floor(500 * Q.trees); i++) {
    const a = rnd() * Math.PI * 2, r = 40 + rnd() * 200;
    const x = HG.x + Math.cos(a) * r, z = HG.z + Math.sin(a) * r;
    if (Math.abs(x - HG.x) < 26 && Math.abs(z - HG.z) < 100) continue;
    const h = hogsHeight(x, z);
    const s = 0.7 + rnd() * 0.9;
    trees.push(mat4(x, h, z, rnd() * 6, s, s * (0.9 + rnd() * 0.6), s));
  }
  const tg = new THREE.ConeGeometry(2.4, 8, 7);
  tg.translate(0, 4.5, 0);
  const treeMesh = instanced(tg, M.pine, trees, { cast: false });
  group.add(treeMesh);
  zone.treeMat = M.pine;
  zone.spots = { square: W(0, 0, -2), station: W(0, 0, -90), pub: zone.doors.find((d) => d.kind === 'pub').pos, gate: W(0, 0, 76) };
  zone.portals.push({ pos: W(0, 0, 84), r: 3, to: 'grounds', at: 'fromHogsmeade', label: 'Path back to Hogwarts' });
  zone.entries = { fromCastle: { pos: W(0, 0, 76), yaw: Math.PI } };
  zone.update = (dt, t) => {
    if (Math.random() < 0.3) { const ch = zone.chimneys[Math.floor(Math.random() * zone.chimneys.length)]; G.fx.smokePuff(ch, 0x8a8a90, 1, { size: 0.8, size1: 3, speed: 0.5, life: 4, alpha: 0.25, vel: new THREE.Vector3(0.6, 1.4, 0) }); }
  };
  return zone;
}
