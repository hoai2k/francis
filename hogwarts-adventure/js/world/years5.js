// Year 5 locations: the Room of Requirement (behind a door that appears in the Charms
// Corridor) and the Department of Arcana deep under the Ministry — the Hall of Doors, the
// Hall of Prophecies and the Veil Chamber.
import * as THREE from 'three';
import { G } from '../state.js';
import { OFFSETS, makeZone, room, torch, animateFlames } from './interiors.js';
import { Builder, mat4, instanced } from './builder.js';
import { materials } from './materials.js';
import { mulberry32 } from '../util.js';

OFFSETS.requirement = new THREE.Vector3(12000, 0, 0);
OFFSETS.arcana = new THREE.Vector3(13000, 0, 0);

// ================================================================== THE ROOM OF REQUIREMENT
export function buildRequirement(Q) {
  const M = materials();
  const zone = makeZone('requirement', 'The Room of Requirement', { fog: { color: 0x1a1218, density: 0.012 } });
  const { C, W } = zone;
  const B = new Builder();
  const w = 14, d = 36, h = 10;
  room(B, C, M, -w, -d, w, 0, h, { doors: [{ side: 's', at: 0, w: 3, h: 4.5, cam: true }], wall: M.stoneWarm, floor: M.wood, ceilMat: M.woodDark });
  // bookshelves along the walls
  const wood = M.woodDark;
  for (const sx of [-1, 1]) for (let z = -4; z > -d + 3; z -= 5) {
    B.box(wood, sx * (w - 0.6), 2.2, z, 1, 4.4, 4.2);
    for (let r = 0; r < 4; r++) B.box(M.books || M.wood, sx * (w - 1.05), 0.6 + r * 1, z, 0.2, 0.7, 3.8);
    C.box(sx * (w - 0.6), 2.2, z, 0.5, 2.2, 2.1);
  }
  // cushions and a duelling strip
  const cushion = new THREE.MeshStandardMaterial({ color: 0x8a2a3a, roughness: 0.9 });
  for (let i = 0; i < 10; i++) B.box(cushion, -9 + (i % 5) * 4.5, 0.2, -30 - Math.floor(i / 5) * 2.4, 1.6, 0.4, 1.6);
  B.box(new THREE.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.8 }), 0, 0.02, -16, 6, 0.04, 18);
  // a great mirror on the far wall
  B.box(M.gold || M.stoneWarm, 0, 4.5, -d + 0.6, 6, 7, 0.4);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 6.2), new THREE.MeshStandardMaterial({ color: 0xc8d0e0, metalness: 1, roughness: 0.05 }));
  mirror.position.set(0, 4.5, -d + 0.85);
  zone.group.add(mirror);
  // hanging lanterns
  for (const [x, z] of [[-7, -8], [7, -8], [-7, -22], [7, -22], [0, -30]]) zone.anchors.push({ pos: W(x, 6, z), color: 0xffc080, intensity: 26, distance: 18, flicker: true });
  for (const [x, z] of [[-w + 0.6, -10], [w - 0.6, -10], [-w + 0.6, -26], [w - 0.6, -26]]) torch(zone, B, M, x - Math.sign(x) * 0.5, 3.4, z, 0);
  B.build(zone.group);
  zone.spots = { centre: W(0, 0, -16), mirror: W(0, 0, -31), dummies: [W(-4, 0, -22), W(0, 0, -24), W(4, 0, -22)], door: W(0, 0, -2) };
  zone.spawn = { pos: W(0, 0, -3), yaw: Math.PI };
  zone.portals.push({ pos: W(0, 0, -0.6), r: 1.6, to: 'corridor', at: 'fromRequirement', label: 'Back to the Charms Corridor' });
  zone.entries = { fromCorridor: { pos: W(0, 0, -3), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(0.3, 1, 0.2), color: 0xffd0a0, intensity: 0.6 };
  zone.hemi = { sky: 0x6a4a3a, ground: 0x1a1010, intensity: 0.8 };
  zone.exposure = 1.25;
  zone.env = 0.25;
  zone.update = (dt, t) => animateFlames(zone, t);
  return zone;
}

// the door that appears on the corridor's west wall (from Year 5)
export function addRequirementDoor() {
  const co = G.world.zones.corridor;
  if (co.requirementDoor) return;
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.6 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 2), wood); door.position.y = 1.7; g.add(door);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.18, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a7a60, roughness: 0.7 }));
  arch.rotation.y = Math.PI / 2; arch.position.y = 2.6; g.add(arch);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd8b040, metalness: 1, roughness: 0.3 }));
  knob.position.set(0.15, 1.6, 0.6); g.add(knob);
  g.position.copy(co.W(-3.95, 0, -25));
  co.world.add(g);
  co.requirementDoor = g;
  g.visible = false;
  co.portals.push({ pos: co.W(-3.3, 0, -25), r: 1.5, to: 'requirement', at: 'fromCorridor', label: 'Enter the Room of Requirement', locked: () => !G.story.requirementOpen?.() });
  co.entries.fromRequirement = { pos: co.W(-2.6, 0, -25), yaw: Math.PI / 2 };
}

// ================================================================== THE DEPARTMENT OF ARCANA
export function buildArcana(Q) {
  const M = materials();
  const zone = makeZone('arcana', 'The Department of Arcana', { fog: { color: 0x04060c, density: 0.03 }, noSave: true });
  const { C, W } = zone;
  const B = new Builder();
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.15, metalness: 0.6 });
  const tile = new THREE.MeshStandardMaterial({ color: 0x14161e, roughness: 0.2, metalness: 0.5 });
  // A: lift lobby (z 0 .. -12)
  room(B, C, M, -4, -12, 4, 0, 6, { doors: [{ side: 'n', at: 0, w: 3, h: 4 }], wall: black, floor: tile, ceilMat: black });
  // B: the round Hall of Doors (z -12 .. -32), twelve black doors
  const R = 10, cz = -22;
  B.add(new THREE.CylinderGeometry(R + 1, R + 1, 0.5, 32), tile, mat4(0, -0.25, cz));
  C.box(0, -0.25, cz, R + 1, 0.25, R + 1);
  B.add(new THREE.CylinderGeometry(R + 1, R + 1, 0.5, 32), black, mat4(0, 8.25, cz));
  zone.doors = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.sin(a) * R, z = cz + Math.cos(a) * R;
    const isEntry = i === 0, isExit = i === 6;
    // wall segment
    if (!isEntry && !isExit) B.add(new THREE.BoxGeometry(5.3, 8, 0.8), black, mat4(x * 1.08, 4, cz + (z - cz) * 1.08, a));
    else for (const s2 of [-1, 1]) B.add(new THREE.BoxGeometry(1.2, 8, 0.8), black, mat4(x * 1.08 + Math.cos(a) * s2 * 2.1, 4, cz + (z - cz) * 1.08 - Math.sin(a) * s2 * 2.1, a));
    if (!isEntry && !isExit) { C.box(x * 1.05, 4, cz + (z - cz) * 1.05, 2.6, 4, 0.6, a); B.add(new THREE.BoxGeometry(2.2, 3.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.3, metalness: 0.7 }), mat4(x * 0.99, 1.8, cz + (z - cz) * 0.99, a)); }
    zone.doors.push(W(x * 0.9, 0, cz + (z - cz) * 0.9));
  }
  // C: the Hall of Prophecies (z -32 .. -92), rows of towering shelves of glowing orbs
  const hw = 14;
  B.box(tile, 0, -0.25, -62, hw * 2 + 2, 0.5, 62); C.box(0, -0.25, -62, hw + 1, 0.25, 31);
  B.box(black, 0, 12.25, -62, hw * 2 + 2, 0.5, 62);
  for (const sx of [-1, 1]) { B.box(black, sx * (hw + 0.5), 6, -62, 1, 12, 62); C.box(sx * (hw + 0.5), 6, -62, 0.5, 6, 31); }
  for (const sx of [-1, 1]) { B.box(black, sx * 8.2, 6, -32.5, 10.4, 12, 1); C.box(sx * 8.2, 6, -32.5, 5.2, 6, 0.5); }
  const shelfX = [-11, -6.5, 6.5, 11];
  const orbM = [];
  const rnd = mulberry32(97);
  for (const x of shelfX) {
    for (let z = -38; z > -88; z -= 12) {
      B.box(M.iron, x, 5, z - 4, 1.4, 10, 9);
      C.box(x, 5, z - 4, 0.7, 5, 4.5);
      for (let r = 0; r < 6; r++) for (let k = 0; k < 7; k++) if (rnd() < 0.8 * Q.trees + 0.15) for (const s of [-1, 1]) orbM.push(mat4(x + s * 0.8, 0.9 + r * 1.6, z - 0.4 - k * 1.2, 0, 0.32, 0.32, 0.32));
    }
  }
  const orbMat = new THREE.MeshStandardMaterial({ color: 0x90b8ff, emissive: 0x4070c0, emissiveIntensity: 1.4, roughness: 0.1, transparent: true, opacity: 0.85 });
  zone.group.add(instanced(new THREE.SphereGeometry(1, 8, 6), orbMat, orbM, { cast: false }));
  zone.anchors.push({ pos: W(0, 9, -48), color: 0x6090ff, intensity: 40, distance: 30 });
  zone.anchors.push({ pos: W(0, 9, -76), color: 0x6090ff, intensity: 40, distance: 30 });
  // D: the Veil Chamber (z -92 .. -134): a sunken stone amphitheatre with an arch at its heart
  const vy = -4, vcz = -114;
  for (const sx of [-1, 1]) { B.box(black, sx * 8.2, 6, -92.5, 10.4, 12, 1); C.box(sx * 8.2, 6, -92.5, 5.2, 6, 0.5); }
  B.box(M.stoneDark, 0, -0.25, -95, hw * 2 + 2, 0.5, 6); C.box(0, -0.25, -95, hw + 1, 0.25, 3);
  for (let s = 0; s < 8; s++) {
    const top = -0.5 * (s + 1), z0 = -98 - s * 1.25;
    B.box(M.stoneDark, 0, top - 0.25, z0 - 0.625, 30, 0.5, 1.25); C.box(0, top - 0.25, z0 - 0.625, 15, 0.25, 0.625);
  }
  B.box(M.stoneDark, 0, vy - 0.25, vcz, 34, 0.5, 30); C.box(0, vy - 0.25, vcz, 17, 0.25, 15);
  for (const sx of [-1, 1]) { B.box(black, sx * 17.5, 4, vcz - 2, 1, 16, 44); C.box(sx * 17.5, 4, vcz - 2, 0.5, 8, 22); }
  B.box(black, 0, 4, -134.5, 36, 16, 1); C.box(0, 4, -134.5, 18, 8, 0.5);
  B.box(black, 0, 12.25, -114, 36, 0.5, 44);
  // the arch and its veil
  B.box(M.stone, 0, vy + 0.4, vcz - 6, 6, 0.8, 2); C.box(0, vy + 0.4, vcz - 6, 3, 0.4, 1);
  for (const sx of [-1, 1]) { B.box(M.stone, sx * 2.2, vy + 3.8, vcz - 6, 0.7, 6, 0.7); C.box(sx * 2.2, vy + 3.8, vcz - 6, 0.35, 3, 0.35); }
  B.add(new THREE.TorusGeometry(2.2, 0.35, 6, 16, Math.PI), M.stone, mat4(0, vy + 6.8, vcz - 6));
  const veilMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: 'uniform float time; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.y * 2.0 + time * 1.3) * 0.15 * (1.0 - uv.y) + sin(p.x * 3.0 + time) * 0.08; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform float time; varying vec2 vUv; void main(){ float n = sin(vUv.x * 40.0 + time) * 0.5 + 0.5; gl_FragColor = vec4(0.02, 0.03, 0.05, 0.75 + n * 0.15); }',
  });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 6.2, 8, 12), veilMat);
  veil.position.set(0, vy + 3.9, vcz - 6);
  zone.group.add(veil);
  zone.anchors.push({ pos: W(0, vy + 7, vcz), color: 0x8090c0, intensity: 40, distance: 30 });
  zone.anchors.push({ pos: W(0, vy + 3, vcz - 8), color: 0x40ff70, intensity: 10, distance: 10, flicker: true });
  // eerie torches
  for (const [x, z] of [[-3.2, -4], [3.2, -8], [-13.4, -44], [13.4, -60], [-13.4, -76], [-16.8, -104], [16.8, -104], [-16.8, -124], [16.8, -124]]) torch(zone, B, M, x, z < -95 ? vy + 3.4 : 3.4, z, 0, 0x6080ff, new THREE.Color(1.2, 1.8, 3.4));
  B.build(zone.group);
  zone.spots = {
    lobby: W(0, 0, -6), doors: W(0, 0, cz), exitDoor: zone.doors[6], prophecies: W(0, 0, -40), orb: W(-8.75, 1.4, -79), shelfEnd: W(0, 0, -88),
    veil: W(0, vy, vcz), arch: W(0, vy, vcz - 4), arena: W(0, vy, vcz + 2),
  };
  zone.spawn = { pos: W(0, 0, -3), yaw: Math.PI };
  zone.checkpoints = [
    { z: -14, pos: W(0, 0, -15), yaw: Math.PI },
    { z: -34, pos: W(0, 0, -36), yaw: Math.PI },
    { z: -96, pos: W(0, 0, -95), yaw: Math.PI },
  ];
  zone.killY = vy - 6;
  zone.dirLight = { dir: new THREE.Vector3(0.2, 1, 0.3), color: 0x7090ff, intensity: 0.35 };
  zone.hemi = { sky: 0x2a3a6a, ground: 0x05060a, intensity: 0.7 };
  zone.exposure = 1.35;
  zone.env = 0.3;
  zone.update = (dt, t) => {
    animateFlames(zone, t);
    veilMat.uniforms.time.value = t;
    const pz = G.player.pos.z - zone.offset.z;
    for (const c of zone.checkpoints) if (pz < c.z) zone.checkpoint = c;
    if (Math.random() < 0.15) G.fx.emit({ pos: W((Math.random() - 0.5) * 24, 1 + Math.random() * 9, -36 - Math.random() * 52), color: 0x90b8ff, count: 1, speed: 0.1, size: 0.1, life: 1.6, intensity: 2, noScale: true });
  };
  return zone;
}
