// Story locations for the later years, built like the other interiors at far offsets.
// Year 2: the Undercroft, a hidden chamber beneath the dungeons.
import * as THREE from 'three';
import { G } from '../state.js';
import { OFFSETS, makeZone, doorFrame, torch, animateFlames } from './interiors.js';
import { Builder, mat4 } from './builder.js';
import { materials } from './materials.js';
import { glowSprite } from '../textures.js';
import { mulberry32 } from '../util.js';

OFFSETS.undercroft = new THREE.Vector3(9000, 0, 0);

const GREEN = new THREE.Color(0.6, 3, 1.2);
function wallRun(B, C, mat, x, z0, z1, h, y0 = 0) {
  B.box(mat, x, y0 + h / 2, (z0 + z1) / 2, 1, h, Math.abs(z1 - z0));
  C.box(x, y0 + h / 2, (z0 + z1) / 2, 0.5, h / 2, Math.abs(z1 - z0) / 2);
}
function crossWall(B, C, mat, z, x0, x1, h, gap = 0, gapW = 3, gapH = 4, y0 = 0) {
  const segs = gap ? [[x0, -gapW / 2], [gapW / 2, x1]] : [[x0, x1]];
  for (const [a, b] of segs) { B.box(mat, (a + b) / 2, y0 + h / 2, z, b - a, h, 1); C.box((a + b) / 2, y0 + h / 2, z, (b - a) / 2, h / 2, 0.5); }
  if (gap) B.box(mat, 0, y0 + gapH + (h - gapH) / 2, z, gapW, h - gapH, 1);
}

export function buildUndercroft(Q) {
  const M = materials();
  const zone = makeZone('undercroft', 'The Undercroft', { fog: { color: 0x07120c, density: 0.03 } });
  const { C, W } = zone;
  const B = new Builder();
  const wet = new THREE.MeshStandardMaterial({ color: 0x2a3a30, roughness: 0.35, metalness: 0.1 });
  const S = M.stoneDark;
  // A: descent tunnel (z 0 .. -30), a long slope down to y = -4
  B.box(wet, 0, -0.25, -4, 6, 0.5, 8); C.box(0, -0.25, -4, 3, 0.25, 4);
  const ramp = new THREE.BoxGeometry(6, 0.5, 20.4);
  B.add(ramp, wet, mat4(0, -2.25, -18, 0, 1, 1, 1, -Math.atan2(4, 20)));
  C.ramp(0, -18, 3, 10, 0, -4, 0);
  B.box(wet, 0, -4.25, -29, 6, 0.5, 2); C.box(0, -4.25, -29, 3, 0.25, 1);
  wallRun(B, C, S, -3.5, 0, -30, 9, -4.5); wallRun(B, C, S, 3.5, 0, -30, 9, -4.5);
  B.box(S, 0, 5, -15, 8, 1, 30);
  crossWall(B, C, S, 0.5, -4, 4, 6);
  // B: the chasm (z -30 .. -56): floor broken between z -38 and -48 over a drop to dark water
  const y = -4;
  B.box(wet, 0, y - 0.25, -34, 14, 0.5, 8); C.box(0, y - 0.25, -34, 7, 0.25, 4);
  B.box(wet, 0, y - 0.25, -52, 14, 0.5, 8); C.box(0, y - 0.25, -52, 7, 0.25, 4);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: 0x0a1a18, roughness: 0.05, metalness: 0.5 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, y - 6, -43);
  zone.group.add(water);
  wallRun(B, C, S, -7.5, -30, -56, 14, y - 7); wallRun(B, C, S, 7.5, -30, -56, 14, y - 7);
  crossWall(B, C, S, -30, -8, 8, 14, 1, 6, 9, y); // opening from the tunnel
  for (const sx of [-1, 1]) { B.box(S, sx * 5, y + 4, -30.2, 4, 10, 1); }
  // C: brazier hall (z -56 .. -80)
  B.box(wet, 0, y - 0.25, -68, 18, 0.5, 24); C.box(0, y - 0.25, -68, 9, 0.25, 12);
  wallRun(B, C, S, -9.5, -56, -80, 10, y); wallRun(B, C, S, 9.5, -56, -80, 10, y);
  crossWall(B, C, S, -56, -9, 9, 10, 1, 6, 5, y);
  // a raised ledge high on the west wall (Accio target)
  B.box(S, -8.4, y + 5, -66, 1.6, 0.4, 3);
  // serpent door at the far end (opened by the braziers)
  crossWall(B, C, S, -80, -10, 10, 10, 1, 4, 5, y);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.4, metalness: 0.6, emissive: 0x0a2a10, emissiveIntensity: 0.6 });
  const door = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.4, 24), doorMat);
  door.rotation.x = Math.PI / 2; door.position.set(0, y + 2.4, -80);
  zone.group.add(door);
  zone.serpentDoor = door;
  zone.serpentDoorCol = C.box(0, y + 2.5, -80, 2, 2.5, 0.6);
  // carved serpents on the door
  for (let i = 0; i < 2; i++) {
    const s = new THREE.Mesh(new THREE.TorusGeometry(1.4 - i * 0.5, 0.1, 6, 24, Math.PI * 1.6), new THREE.MeshStandardMaterial({ color: 0x6a8a4a, metalness: 0.8, roughness: 0.3, emissive: 0x204010 }));
    s.position.set(0, 0.25, 0); s.rotation.set(0, 0, i * 2);
    door.add(s); s.rotation.x = Math.PI / 2;
  }
  // D: antechamber (z -80 .. -98): round-ish room for the Crane duel
  B.box(wet, 0, y - 0.25, -89, 22, 0.5, 18); C.box(0, y - 0.25, -89, 11, 0.25, 9);
  wallRun(B, C, S, -11.5, -80, -98, 12, y); wallRun(B, C, S, 11.5, -80, -98, 12, y);
  crossWall(B, C, S, -98, -12, 12, 12, 1, 6, 6, y);
  // E: the Great Chamber (z -98 .. -160): serpent pillars, side pools and a colossal face
  B.box(wet, 0, y - 0.25, -129, 44, 0.5, 62); C.box(0, y - 0.25, -129, 22, 0.25, 31);
  wallRun(B, C, S, -22.5, -98, -160, 20, y); wallRun(B, C, S, 22.5, -98, -160, 20, y);
  crossWall(B, C, S, -160.5, -23, 23, 20, 0, 3, 4, y);
  zone.pools = [];
  for (const sx of [-1, 1]) for (const zz of [-112, -140]) {
    const pw = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshStandardMaterial({ color: 0x0c2a24, roughness: 0.05, metalness: 0.6, emissive: 0x041a10 }));
    pw.rotation.x = -Math.PI / 2; pw.position.set(sx * 14, y + 0.02, zz);
    zone.group.add(pw);
    B.add(new THREE.TorusGeometry(3.5, 0.25, 6, 24), M.stone, mat4(sx * 14, y + 0.1, zz, 0, 1, 1, 1, Math.PI / 2));
    zone.pools.push(W(sx * 14, y, zz));
  }
  for (const zz of [-104, -120, -136, -152]) for (const sx of [-1, 1]) {
    B.add(new THREE.CylinderGeometry(1.1, 1.3, 18, 12), S, mat4(sx * 8, y + 9, zz));
    C.cyl(sx * 8, zz, 1.3, y, y + 18);
    // a stone serpent coiling up each pillar
    B.add(new THREE.TorusGeometry(1.45, 0.25, 6, 18), new THREE.MeshStandardMaterial({ color: 0x3a4a30, roughness: 0.5 }), mat4(sx * 8, y + 4, zz, 0, 1, 1, 1, Math.PI / 2, 0.2));
    B.add(new THREE.TorusGeometry(1.45, 0.25, 6, 18), new THREE.MeshStandardMaterial({ color: 0x3a4a30, roughness: 0.5 }), mat4(sx * 8, y + 9, zz, 0, 1, 1, 1, Math.PI / 2, -0.2));
  }
  // the colossal face at the far wall
  B.add(new THREE.SphereGeometry(7, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), M.stoneWarm, mat4(0, y + 10, -159, 0, 1, 1.2, 0.5));
  B.add(new THREE.ConeGeometry(2.2, 6, 4), M.stoneWarm, mat4(0, y + 9, -156, Math.PI / 4, 1, 1, 0.6, -Math.PI / 2 + 0.4));
  for (const sx of [-1, 1]) B.add(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.6, 0.4) }), mat4(sx * 2.6, y + 12, -155.6));
  B.box(M.dark, 0, y + 3, -158.6, 5, 6, 0.3);
  // green torches throughout
  const torches = [[-2.8, -6], [2.8, -14], [-2.8, -24], [-6.8, -33], [6.8, -51], [-8.8, -60], [8.8, -60], [-8.8, -76], [8.8, -76], [-10.8, -86], [10.8, -94], [-21.8, -105], [21.8, -105], [-21.8, -125], [21.8, -125], [-21.8, -145], [21.8, -145]];
  for (const [x, z] of torches) torch(zone, B, M, x, (z < -28 ? y : z < -8 ? -2 : 0) + 3.4 + (z < -28 ? 0 : 0), z, 0, 0x50ff90, GREEN);
  zone.anchors.push({ pos: W(0, y + 12, -130), color: 0x60ffa0, intensity: 80, distance: 40 });
  zone.anchors.push({ pos: W(0, y + 6, -68), color: 0x60ffa0, intensity: 30, distance: 20 });
  // dripping water, bones
  const rnd = mulberry32(7);
  const bone = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.8 });
  for (let i = 0; i < 40; i++) B.add(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), bone, mat4(-18 + rnd() * 36, y + 0.05, -100 - rnd() * 56, rnd() * 6, 1, 1, 1, Math.PI / 2));
  B.build(zone.group);
  zone.drips = [];
  zone.spots = {
    gate: W(0, 0, -6), chasm: W(0, y, -43), bridgeStart: W(0, y, -38), hall: W(0, y, -68), ledge: W(-8.4, y + 5.6, -66),
    braziers: [W(-6, y, -62), W(6, y, -62), W(0, y, -74)], block: W(4, y, -66), plate: W(4, y, -76), chest: W(-6, y, -77),
    ante: W(0, y, -89), chamber: W(0, y, -128), cranePos: W(0, y, -93),
  };
  zone.killY = y - 3;
  zone.spawn = { pos: W(0, 0, -2.5), yaw: Math.PI };
  zone.checkpoints = [
    { z: -29, pos: W(0, y, -31), yaw: Math.PI },
    { z: -55, pos: W(0, y, -54), yaw: Math.PI },
    { z: -81, pos: W(0, y, -83), yaw: Math.PI },
    { z: -99, pos: W(0, y, -102), yaw: Math.PI },
  ];
  zone.portals.push({ pos: W(0, 0, 0), r: 1.8, to: 'dungeon', at: 'fromUndercroft', label: 'Back up to the Dungeons' });
  zone.entries = { fromDungeon: { pos: W(0, 0, -2.5), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(0.2, 1, 0.3), color: 0x70ffb0, intensity: 0.3 };
  zone.hemi = { sky: 0x2c4a3a, ground: 0x0a0e0a, intensity: 0.7 };
  zone.exposure = 1.3;
  zone.env = 0.15;
  zone.update = (dt, t) => {
    animateFlames(zone, t);
    // checkpoints follow the player's progress
    const pz = G.player.pos.z - zone.offset.z;
    for (const c of zone.checkpoints) if (pz < c.z && G.player.pos.y > zone.offset.y + y - 1) zone.checkpoint = c;
    if (Math.random() < 0.08) G.fx.emit({ pos: W((Math.random() - 0.5) * 10, y + 7, -40 - Math.random() * 100), color: 0x8ad8b0, count: 1, speed: 0.2, size: 0.08, life: 1.4, intensity: 2, gravity: 9, noScale: true });
  };
  return zone;
}

// hidden door in the dungeon troll hall leading down to the Undercroft (shown from Year 2)
export function addUndercroftDoor() {
  const du = G.world.zones.dungeon;
  if (du.undercroftDoor) return;
  const M = materials();
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.25, 8, 28), new THREE.MeshStandardMaterial({ color: 0x3a5a3a, metalness: 0.7, roughness: 0.35, emissive: 0x103010, emissiveIntensity: 0.8 }));
  ring.position.y = 2.1;
  const dark = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), new THREE.MeshBasicMaterial({ color: 0x020604 }));
  dark.position.set(0, 2.1, 0.05);
  const serp = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 6, 20, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0x80a060, metalness: 0.8, roughness: 0.3, emissive: 0x204010 }));
  serp.position.set(0, 2.1, 0.12);
  g.add(ring, dark, serp);
  g.position.copy(du.W(0, 0, -81.4));
  du.world.add(g);
  du.undercroftDoor = g;
  g.visible = false;
  du.portals.push({ pos: du.W(0, 0, -80.6), r: 1.6, to: 'undercroft', at: 'fromDungeon', label: 'Enter the Undercroft', locked: () => !G.story.undercroftOpen?.() });
  du.entries.fromUndercroft = { pos: du.W(0, 0, -78), yaw: 0 };
}
