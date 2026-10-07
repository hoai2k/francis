// Year 6 location: the sea cave where the Hollow King hid one of his vessels — a tunnel in
// the cliffs, a vast cavern around a black lake, and a small island with a stone basin of
// poison. The water is full of Inferi.
import * as THREE from 'three';
import { G } from '../state.js';
import { OFFSETS, makeZone, torch, animateFlames } from './interiors.js';
import { Builder, mat4 } from './builder.js';
import { materials } from './materials.js';
import { mulberry32 } from '../util.js';

OFFSETS.cave = new THREE.Vector3(14000, 0, 0);

export function buildCave(Q) {
  const M = materials();
  const zone = makeZone('cave', 'The Sea Cave', { fog: { color: 0x061014, density: 0.022 }, noSave: true, noCompanion: true });
  const { C, W } = zone;
  zone.colliders.terrain = () => -100; // fall in the lake and the Inferi have you
  const B = new Builder();
  const rock = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.85, flatShading: true });
  const wet = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.3, metalness: 0.2, flatShading: true });
  const rnd = mulberry32(61);
  // A: the tunnel (z 0 .. -24), sloping gently down to the cavern shore at y -2
  for (let i = 0; i < 6; i++) {
    const z = -2 - i * 4, y = -i * 0.35;
    B.box(wet, 0, y - 0.25, z, 6, 0.5, 4.2); C.box(0, y - 0.25, z, 3, 0.25, 2.1);
  }
  for (const sx of [-1, 1]) { B.box(rock, sx * 3.6, 2, -12, 1.2, 8, 26); C.box(sx * 3.6, 2, -12, 0.6, 4, 13); }
  B.box(rock, 0, 5, -12, 8, 1, 26);
  B.box(rock, 0, 2, 0.6, 8, 8, 1); // sealed sea entrance behind you
  C.box(0, 2, 0.6, 4, 4, 0.5);
  // the sacrificial door at the tunnel's end (the Headmistress opens it with blood)
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.7 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 0.6), doorMat);
  door.position.set(0, 0.5, -24.2);
  zone.group.add(door);
  zone.caveDoor = door;
  zone.caveDoorCol = C.box(0, 0.5, -24.2, 2.5, 2.5, 0.3);
  // B: the cavern (z -24 .. -110): a ledge path round a black lake
  const lakeY = -3.4;
  const cz = -70, R = 34;
  // shore ledge at the near end
  B.box(wet, 0, -2.25, -30, 18, 0.5, 10); C.box(0, -2.25, -30, 9, 0.25, 5);
  // the lake
  const water = new THREE.Mesh(new THREE.CircleGeometry(R + 4, 48), new THREE.MeshStandardMaterial({ color: 0x02080a, roughness: 0.04, metalness: 0.7, emissive: 0x001410, emissiveIntensity: 0.4 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, lakeY, cz);
  zone.group.add(water);
  zone.water = water;
  // the cavern walls: a ring of jagged rock
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = R + 4 + rnd() * 3;
    const x = Math.sin(a) * r, z = cz + Math.cos(a) * r;
    if (Math.abs(x) < 6 && z > cz + R) continue; // the shore opening
    B.add(new THREE.DodecahedronGeometry(5 + rnd() * 3, 0), rock, mat4(x, 2 + rnd() * 4, z, rnd() * 6, 1, 2.2, 1));
  }
  B.add(new THREE.SphereGeometry(R + 10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 1, side: THREE.BackSide }), mat4(0, -3, cz));
  // the island
  const iy = -2.8;
  B.add(new THREE.CylinderGeometry(9, 11, 3, 16), rock, mat4(0, iy - 1.5, cz));
  C.cyl(0, cz, 9, iy - 3, iy);
  B.box(wet, 0, iy - 0.05, cz, 1, 0.01, 1);
  // the basin on its plinth, glowing poison-green
  B.add(new THREE.CylinderGeometry(0.5, 0.8, 1, 10), M.stoneDark, mat4(0, iy + 0.5, cz - 1));
  B.add(new THREE.CylinderGeometry(1.1, 0.6, 0.45, 16), M.stoneDark, mat4(0, iy + 1.2, cz - 1));
  C.cyl(0, cz - 1, 1, iy, iy + 1.4);
  const poison = new THREE.Mesh(new THREE.CircleGeometry(0.95, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.4, 0.9) }));
  poison.rotation.x = -Math.PI / 2; poison.position.set(0, iy + 1.42, cz - 1);
  zone.group.add(poison);
  zone.poison = poison;
  zone.anchors.push({ pos: W(0, iy + 3, cz - 1), color: 0x40ff70, intensity: 30, distance: 22 });
  zone.anchors.push({ pos: W(0, 1, -30), color: 0x6080a0, intensity: 12, distance: 16 });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; zone.anchors.push({ pos: W(Math.cos(a) * 8, iy + 1.5, cz + Math.sin(a) * 8), color: 0x50ffa0, intensity: 10, distance: 12, flicker: true }); }
  // the little boat, chained at the shore
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 3.2), new THREE.MeshStandardMaterial({ color: 0x2a3a30, roughness: 0.6, side: THREE.DoubleSide }));
  boat.add(hull);
  boat.position.copy(W(0, lakeY + 0.25, -37));
  zone.world.add(boat);
  zone.boat = boat;
  for (const [x, z] of [[-2.8, -6], [2.8, -14], [-2.8, -20], [-8, -28], [8, -28]]) torch(zone, B, M, x, z < -24 ? 0.6 : 2.4 - (-z) * 0.06, z, 0, 0x50ff90, new THREE.Color(0.6, 3, 1.2));
  B.build(zone.group);
  zone.spots = { tunnel: W(0, 0, -4), door: W(0, -1.8, -22), shore: W(0, -2, -32), boat: W(0, -2, -35), island: W(0, iy, cz + 5), basin: W(0, iy, cz + 1.2), lakeY, centre: W(0, iy, cz) };
  zone.spawn = { pos: W(0, 0, -3), yaw: Math.PI };
  zone.checkpoint = zone.spawn;
  zone.killY = lakeY - 1.5;
  zone.dirLight = { dir: new THREE.Vector3(0.2, 1, 0.3), color: 0x60a080, intensity: 0.3 };
  zone.hemi = { sky: 0x3a6a70, ground: 0x0a1414, intensity: 1.1 };
  zone.exposure = 1.6;
  zone.env = 0.1;
  zone.update = (dt, t) => {
    animateFlames(zone, t);
    poison.material.color.setRGB(0.6, 2.2 + Math.sin(t * 2) * 0.3, 0.9);
    if (Math.random() < 0.1) G.fx.emit({ pos: W((Math.random() - 0.5) * 50, lakeY + 0.2, cz + (Math.random() - 0.5) * 50), color: 0x60ffa0, count: 1, speed: 0.1, size: 0.12, life: 2, intensity: 1.5, gravity: -0.3, noScale: true });
  };
  return zone;
}
