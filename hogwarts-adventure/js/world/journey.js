// The trip to school: King's Cross (Muggle concourse, the barrier, Platform 9¾),
// the walkable Hogwarts Express, and an outdoor countryside strip for the train
// cutscene. Shared procedural models: the steam train, owls, trolleys and crowds.
import * as THREE from 'three';
import { G } from '../state.js';
import { OFFSETS, makeZone } from './interiors.js';
import { Builder, mat4, instanced } from './builder.js';
import { materials } from './materials.js';
import { textTexture, stoneTex, glowSprite } from '../textures.js';
import { Colliders } from '../collision.js';
import { mulberry32, fbm, noise2, smoothstep } from '../util.js';

OFFSETS.station = new THREE.Vector3(7000, 0, 0);
OFFSETS.train = new THREE.Vector3(8000, 0, 0);

let JM = null;
function jmats() {
  if (JM) return JM;
  const brick = stoneTex([150, 78, 58], 'brick');
  JM = {
    brick: new THREE.MeshStandardMaterial({ map: brick.map, normalMap: brick.normalMap, roughness: 0.9 }),
    red: new THREE.MeshStandardMaterial({ color: 0x9a1418, roughness: 0.45, metalness: 0.3 }),
    redDark: new THREE.MeshStandardMaterial({ color: 0x5a0a0e, roughness: 0.5, metalness: 0.3 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.5, metalness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd8a640, roughness: 0.3, metalness: 1 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xa8c0d0, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }),
    winLit: new THREE.MeshStandardMaterial({ color: 0x302010, emissive: 0xffc070, emissiveIntensity: 1.2, roughness: 0.3 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x6a1a22, roughness: 0.95 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.35, metalness: 0.9 }),
    sleeper: new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 }),
    ballast: new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.7 }),
  };
  JM.glass.userData.noShadow = true;
  JM.winLit.userData.noShadow = true;
  return JM;
}

// ------------------------------------------------------------------ the engine + carriages
// Built along local -z (engine front at z = 0, carriages trailing toward +z).
export function makeTrain(nCars = 4, lit = true) {
  const M = materials(), J = jmats();
  const g = new THREE.Group();
  const B = new Builder();
  // engine
  B.add(new THREE.CylinderGeometry(1.05, 1.05, 7, 20), J.red, mat4(0, 2.35, 4.2, 0, 1, 1, 1, Math.PI / 2));
  B.add(new THREE.CylinderGeometry(1.08, 1.08, 0.18, 20), J.brass, mat4(0, 2.35, 1.0, 0, 1, 1, 1, Math.PI / 2));
  B.add(new THREE.CylinderGeometry(1.08, 1.08, 0.12, 20), J.brass, mat4(0, 2.35, 4.2, 0, 1, 1, 1, Math.PI / 2));
  B.add(new THREE.CircleGeometry(1.0, 20), J.black, mat4(0, 2.35, 0.68, Math.PI));
  B.add(new THREE.CylinderGeometry(0.28, 0.36, 1.3, 12), J.black, mat4(0, 3.8, 1.6));
  B.add(new THREE.CylinderGeometry(0.42, 0.3, 0.25, 12), J.black, mat4(0, 4.5, 1.6));
  B.add(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), J.brass, mat4(0, 3.35, 3.6));
  B.box(J.redDark, 0, 2.6, 8.9, 2.6, 2.8, 2.6);
  B.box(J.black, 0, 4.1, 8.9, 2.9, 0.2, 3.0);
  B.box(J.winLit, 1.31, 3.1, 8.6, 0.02, 0.8, 1.0); B.box(J.winLit, -1.31, 3.1, 8.6, 0.02, 0.8, 1.0);
  B.box(J.black, 0, 0.95, 5.2, 2.2, 0.5, 10.6);
  B.box(J.red, 0, 0.6, 0.3, 2.4, 0.5, 0.4);
  B.add(new THREE.ConeGeometry(0.9, 0.9, 4), J.black, mat4(0, 0.5, -0.1, Math.PI / 4, 1.3, 1, 0.6, -Math.PI / 2 + 0.3));
  B.add(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.6) }), mat4(0, 2.35, 0.62, 0, 1, 1, 1, Math.PI / 2));
  const wheel = new THREE.CylinderGeometry(0.62, 0.62, 0.14, 16);
  for (const z of [2.2, 4.0, 5.8]) for (const sx of [-1, 1]) B.add(wheel, J.red, mat4(sx * 1.05, 0.62, z, 0, 1, 1, 1, 0, Math.PI / 2));
  for (const z of [8.2, 9.6]) for (const sx of [-1, 1]) B.add(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12), J.black, mat4(sx * 1.05, 0.42, z, 0, 1, 1, 1, 0, Math.PI / 2));
  for (const sx of [-1, 1]) B.box(J.brass, sx * 1.07, 0.62, 4.0, 0.06, 0.1, 3.8);
  // tender
  B.box(J.redDark, 0, 1.9, 12.4, 2.6, 2.2, 3.6);
  B.box(J.black, 0, 3.05, 12.4, 2.3, 0.2, 3.3);
  for (const z of [11.3, 13.5]) for (const sx of [-1, 1]) B.add(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12), J.black, mat4(sx * 1.05, 0.42, z, 0, 1, 1, 1, 0, Math.PI / 2));
  // name plate
  const plate = textTexture([{ text: 'HOGWARTS EXPRESS', font: 'bold 54px Cinzel, serif', color: '#f6dc9a' }], { w: 512, h: 96, bg: '#5a0a0e' });
  const pm = new THREE.MeshStandardMaterial({ map: plate.tex, roughness: 0.4, metalness: 0.3 });
  for (const sx of [-1, 1]) B.add(new THREE.PlaneGeometry(3.4, 0.62), pm, mat4(sx * 1.08, 2.0, 4.2, sx * Math.PI / 2));
  // carriages
  const winMat = lit ? J.winLit : J.glass;
  for (let c = 0; c < nCars; c++) {
    const z0 = 15 + c * 17.5;
    B.box(J.red, 0, 2.0, z0 + 8, 2.8, 2.6, 16.6);
    B.add(new THREE.CylinderGeometry(1.5, 1.5, 16.6, 16, 1, false, -Math.PI / 2, Math.PI), J.black, mat4(0, 3.0, z0 + 8, 0, 0.95, 0.35, 1, Math.PI / 2));
    B.box(J.black, 0, 0.55, z0 + 8, 2.4, 0.4, 16.0);
    B.box(J.brass, 1.41, 1.1, z0 + 8, 0.02, 0.08, 16.4); B.box(J.brass, -1.41, 1.1, z0 + 8, 0.02, 0.08, 16.4);
    for (let k = 0; k < 7; k++) for (const sx of [-1, 1]) B.box(winMat, sx * 1.41, 2.3, z0 + 1.8 + k * 2.2, 0.03, 0.9, 1.4);
    for (const sx of [-1, 1]) for (const dz of [0.6, 15.4]) B.box(J.redDark, sx * 1.42, 1.9, z0 + dz, 0.03, 2.0, 0.8);
    for (const z of [z0 + 2.5, z0 + 13.5]) for (const sx of [-1, 1]) B.add(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12), J.black, mat4(sx * 1.05, 0.42, z, 0, 1, 1, 1, 0, Math.PI / 2));
  }
  B.build(g);
  g.userData.chimney = new THREE.Vector3(0, 4.7, 1.6);
  g.userData.length = 15 + nCars * 17.5;
  return g;
}

// a simple barn owl, merged into one mesh per material
export function makeOwl(color = '#c8a878') {
  const g = new THREE.Group();
  const B = new Builder();
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const face = new THREE.MeshStandardMaterial({ color: '#f2ead8', roughness: 0.9 });
  const eye = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.2, emissive: '#201000', emissiveIntensity: 0.3 });
  B.add(new THREE.SphereGeometry(0.14, 10, 8), body, mat4(0, 0.16, 0, 0, 1, 1.25, 0.9));
  B.add(new THREE.SphereGeometry(0.11, 10, 8), body, mat4(0, 0.36, 0.01));
  B.add(new THREE.CircleGeometry(0.08, 12), face, mat4(0, 0.36, 0.105));
  for (const sx of [-1, 1]) {
    B.add(new THREE.SphereGeometry(0.022, 6, 4), eye, mat4(sx * 0.035, 0.375, 0.11));
    B.add(new THREE.SphereGeometry(0.07, 8, 6), body, mat4(sx * 0.12, 0.16, -0.01, 0, 0.4, 1.1, 0.9));
  }
  B.add(new THREE.ConeGeometry(0.015, 0.04, 4), new THREE.MeshStandardMaterial({ color: '#c09040' }), mat4(0, 0.345, 0.12, 0, 1, 1, 1, Math.PI / 2));
  const head = new THREE.Group();
  B.build(head);
  head.children.forEach((m) => (m.castShadow = true));
  g.add(head);
  g.userData.head = head;
  return g;
}

// instanced crowd of simple figures that stroll along paths; one draw call per material
function crowd(zone, n, bounds, seed, palette) {
  const rnd = mulberry32(seed);
  const body = new THREE.CylinderGeometry(0.16, 0.3, 1.25, 8);
  body.translate(0, 0.62, 0);
  const head = new THREE.SphereGeometry(0.15, 8, 6);
  head.translate(0, 1.45, 0);
  const geo = (() => { const a = body.clone(), b = head.clone(); return mergeTwo(a, b); })();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, vertexColors: false });
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.castShadow = true;
  im.receiveShadow = true;
  const people = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const p = { x: bounds.x0 + rnd() * (bounds.x1 - bounds.x0), z: bounds.z0 + rnd() * (bounds.z1 - bounds.z0), tx: 0, tz: 0, sp: 0.8 + rnd() * 0.9, wait: rnd() * 3, s: 0.85 + rnd() * 0.3, ph: rnd() * 6 };
    p.tx = p.x; p.tz = p.z;
    people.push(p);
    im.setColorAt(i, c.set(palette[Math.floor(rnd() * palette.length)]));
  }
  im.instanceColor.needsUpdate = true;
  zone.world.add(im);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const o = zone.offset;
  return (dt, t) => {
    for (let i = 0; i < n; i++) {
      const p = people[i];
      const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.3) {
        p.wait -= dt;
        if (p.wait <= 0) { p.tx = bounds.x0 + rnd() * (bounds.x1 - bounds.x0); p.tz = bounds.z0 + rnd() * (bounds.z1 - bounds.z0); p.wait = 1 + rnd() * 4; }
      } else {
        p.x += (dx / d) * p.sp * dt; p.z += (dz / d) * p.sp * dt;
        p.yaw = Math.atan2(dx, dz);
      }
      // keep clear of the player
      const pl = G.player.pos;
      const px = p.x + o.x - pl.x, pz = p.z + o.z - pl.z, pd = Math.hypot(px, pz);
      if (pd < 0.8 && pd > 0.01) { p.x += (px / pd) * (0.8 - pd); p.z += (pz / pd) * (0.8 - pd); }
      const bob = d >= 0.3 ? Math.abs(Math.sin(t * 6 * p.sp + p.ph)) * 0.05 : 0;
      e.set(0, p.yaw || 0, d >= 0.3 ? Math.sin(t * 6 * p.sp + p.ph) * 0.04 : 0);
      q.setFromEuler(e);
      m.compose(v.set(p.x + o.x, o.y + bob, p.z + o.z), q, sc.set(p.s, p.s, p.s));
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
  };
}
function mergeTwo(a, b) {
  const pa = a.toNonIndexed(), pb = b.toNonIndexed();
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal']) {
    const arr = new Float32Array(pa.attributes[k].array.length + pb.attributes[k].array.length);
    arr.set(pa.attributes[k].array); arr.set(pb.attributes[k].array, pa.attributes[k].array.length);
    g.setAttribute(k, new THREE.BufferAttribute(arr, 3));
  }
  return g;
}

function trolley(B, M, J, x, z, ry, cage) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const at = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  let [a, b] = at(0, 0);
  B.box(J.black, a, 0.5, b, 0.7, 0.06, 1.2, ry);
  for (const [dx, dz] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) { const [p, q] = at(dx, dz); B.add(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10), J.black, mat4(p, 0.1, q, ry, 1, 1, 1, 0, Math.PI / 2)); B.box(J.black, p, 0.3, q, 0.03, 0.4, 0.03, ry); }
  [a, b] = at(0, 0.6); B.box(J.black, a, 1.0, b, 0.7, 0.04, 0.04, ry);
  [a, b] = at(0, 0.1); B.box(J.trunk, a, 0.78, b, 0.6, 0.48, 0.9, ry);
  B.box(J.brass, a, 0.78, b, 0.62, 0.06, 0.92, ry);
  [a, b] = at(0, -0.1); B.box(J.cloth, a, 1.13, b, 0.5, 0.22, 0.7, ry);
  if (cage) {
    [a, b] = at(0, -0.15);
    B.add(new THREE.CylinderGeometry(0.22, 0.24, 0.5, 10, 1, true), J.brass, mat4(a, 1.5, b));
    B.add(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), J.brass, mat4(a, 1.75, b));
    return new THREE.Vector3(a, 1.27, b);
  }
  return null;
}

// ================================================================== KING'S CROSS
export function buildStation(Q) {
  const M = materials(), J = jmats();
  const zone = makeZone('station', "King's Cross", { fog: { color: 0x8a8070, density: 0.008 }, noSave: true });
  const { C, W } = zone;
  const B = new Builder();
  const H = 13;
  // floor & platform: platform x -12..4, track pit x 4..14
  B.box(M.floor, -4, -0.25, -75, 16, 0.5, 152);
  B.box(J.ballast, 9, -1.35, -75, 10, 0.3, 152);
  C.box(-4, -0.25, -75, 8, 0.25, 76);
  C.box(4.1, 0.6, -75, 0.1, 0.6, 76); // platform edge (do not fall onto the track)
  for (let z = -1; z > -150; z -= 0.9) B.box(J.sleeper, 9, -1.15, z, 3.2, 0.12, 0.3);
  for (const sx of [8.25, 9.75]) B.box(J.rail, sx, -1.0, -75, 0.08, 0.14, 150);
  // walls
  B.box(J.brick, -12.5, H / 2, -75, 1, H, 152); C.box(-12.5, H / 2, -75, 0.5, H / 2, 76);
  B.box(J.brick, 14.5, H / 2, -75, 1, H, 152); C.box(14.5, H / 2, -75, 0.5, H / 2, 76);
  B.box(J.brick, 1, H / 2, 0.5, 28, H, 1); C.box(1, H / 2, 0.5, 14, H / 2, 0.5);
  B.box(J.brick, 1, H / 2, -150.5, 28, H, 1); C.box(1, H / 2, -150.5, 14, H / 2, 0.5);
  // arched glass roof: iron ribs and glazing
  for (let z = -3; z > -150; z -= 6) B.add(new THREE.TorusGeometry(13.5, 0.15, 6, 24, Math.PI), M.iron, mat4(1, H - 1, z, 0, 1, 0.55, 1));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 13.5, 151, 24, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0xc8d8e0, emissive: 0x8a98a8, emissiveIntensity: 0.55, roughness: 0.6, side: THREE.BackSide }));
  roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.55); roof.position.set(1, H - 1, -75);
  zone.group.add(roof);
  // the dividing wall between the Muggle platforms and Platform 9¾, with the magic barrier in it
  B.box(J.brick, -7.5, H / 2, -50, 9, H, 1.2); C.box(-7.5, H / 2, -50, 4.5, H / 2, 0.6);
  B.box(J.brick, 7, H / 2, -50, 14, H, 1.2); C.box(7, H / 2, -50, 7, H / 2, 0.6);
  B.box(J.brick, -1.5, 8.4, -50, 3, H - 3.8, 1.2);
  const barrierMat = J.brick.clone();
  barrierMat.emissive = new THREE.Color(0x401808);
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(3, 3.4, 1.2), barrierMat);
  barrier.position.set(-1.5, 1.7, -50);
  barrier.receiveShadow = true;
  zone.group.add(barrier);
  zone.barrierCol = C.box(-1.5, 1.7, -50, 1.5, 1.7, 0.6);
  zone.barrierMat = barrierMat;
  // platform signs
  const sign = (txt, x, z, w = 1.6, ry = 0) => {
    const t = textTexture([{ text: txt, font: 'bold 120px Cinzel, serif', color: '#f4f0e8' }], { w: 256, h: 192, bg: '#1a2a5a' });
    B.add(new THREE.PlaneGeometry(w, w * 0.75), new THREE.MeshStandardMaterial({ map: t.tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: t.tex, emissiveIntensity: 0.25 }), mat4(x, 4.2, z, ry));
  };
  sign('9', -4.2, -49.35); sign('10', 1.2, -49.35);
  const big = textTexture([{ text: 'Platform Nine and Three-Quarters', font: 'bold 34px Cinzel, serif', color: '#f6dc9a', y: 50 }, { text: '9¾', font: 'bold 80px Cinzel, serif', color: '#fff', y: 130 }], { w: 512, h: 192, bg: '#5a0a0e' });
  B.add(new THREE.PlaneGeometry(4.2, 1.6), new THREE.MeshStandardMaterial({ map: big.tex, emissive: 0xffffff, emissiveMap: big.tex, emissiveIntensity: 0.35 }), mat4(-1.5, 5.6, -50.65, Math.PI));
  const ks = textTexture([{ text: "King's Cross", font: 'bold 64px Cinzel, serif', color: '#f4f0e8' }], { w: 512, h: 128, bg: '#1a2a5a' });
  B.add(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshStandardMaterial({ map: ks.tex, emissive: 0xffffff, emissiveMap: ks.tex, emissiveIntensity: 0.25 }), mat4(1, 7, -0.05, Math.PI));
  // iron pillars, benches, a station clock
  for (let z = -8; z > -148; z -= 12) {
    if (Math.abs(z + 50) < 3) continue;
    B.add(new THREE.CylinderGeometry(0.22, 0.28, H - 1, 10), M.iron, mat4(3.2, (H - 1) / 2, z));
    C.cyl(3.2, z, 0.3, 0, H);
    B.box(M.woodDark, -11.2, 0.45, z + 3, 0.6, 0.1, 2.4); B.box(M.woodDark, -11.5, 0.8, z + 3, 0.1, 0.6, 2.4);
    C.box(-11.2, 0.4, z + 3, 0.35, 0.4, 1.2);
  }
  const clock = textTexture([{ text: '10:45', font: 'bold 90px Cinzel, serif', color: '#111' }], { w: 256, h: 256, bg: '#f2ead8' });
  B.add(new THREE.CircleGeometry(0.8, 24), new THREE.MeshStandardMaterial({ map: clock.tex, emissive: 0xffffff, emissiveMap: clock.tex, emissiveIntensity: 0.2 }), mat4(-11.9, 6, -25, Math.PI / 2));
  // the scarlet engine waiting at Platform 9¾ (front toward -z)
  const train = makeTrain(4, false);
  train.position.set(9, -1.0, -146);
  zone.group.add(train);
  zone.train = train;
  zone.doors = [];
  for (let c = 0; c < 4; c++) {
    const z = -146 + 15 + c * 17.5 + 0.6;
    zone.doors.push(W(4.2, 0, z));
    C.box(9, 1.6, -146 + 15 + c * 17.5 + 8, 1.4, 2.6, 8.3);
  }
  C.box(9, 1.6, -146 + 7, 1.4, 3, 7.5);
  // trolleys, trunks and caged owls
  zone.owls = [];
  const rnd = mulberry32(9);
  const trolleySpots = [[-8, -12, 0.3, false], [-9, -30, -0.4, true], [1, -20, 1.2, false], [-6, -62, 0.2, true], [-9, -78, -0.6, true], [0, -88, 2.1, false], [-7, -102, 0.9, true], [-3, -118, -0.3, false], [-9, -130, 0.1, true]];
  for (const [x, z, ry, cage] of trolleySpots) {
    const op = trolley(B, M, J, x, z, ry, cage);
    C.box(x, 0.6, z, 0.5, 0.6, 0.7, ry);
    if (op) {
      const owl = makeOwl(['#c8a878', '#f2eee6', '#6a5040', '#9a8a70'][Math.floor(rnd() * 4)]);
      owl.position.copy(W(op.x, op.y, op.z));
      owl.scale.setScalar(0.8);
      zone.world.add(owl);
      zone.owls.push({ owl, t: rnd() * 5, hoot: 3 + rnd() * 8 });
    }
  }
  // lights
  for (let z = -10; z > -150; z -= 20) zone.anchors.push({ pos: W(-4, 9, z), color: 0xfff0d8, intensity: 50, distance: 26 });
  zone.anchors.push({ pos: W(-1.5, 5.6, -52), color: 0xffc080, intensity: 30, distance: 10, flicker: true });
  B.build(zone.group);
  // crowds: Muggle commuters on this side, witches and wizards beyond the barrier
  const muggles = crowd(zone, Q.particles < 0.6 ? 10 : 18, { x0: -10, x1: 2.5, z0: -46, z1: -3 }, 3, ['#2a3a5a', '#5a5a60', '#7a3a2a', '#2a4a3a', '#8a7a60', '#3a2a40']);
  const wizards = crowd(zone, Q.particles < 0.6 ? 14 : 26, { x0: -10.5, x1: 2.5, z0: -146, z1: -54 }, 5, ['#17161c', '#2a1f4a', '#4a1a1a', '#1a3a2a', '#3a2a1a', '#5a2a5a', '#1b3070']);
  zone.spawn = { pos: W(-3, 0, -6), yaw: Math.PI };
  zone.entries = { muggle: { pos: W(-3, 0, -6), yaw: Math.PI }, magic: { pos: W(-1.5, 0, -54), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(0.3, 1, 0.4), color: 0xfff0d8, intensity: 1.2 };
  zone.hemi = { sky: 0xd0d8e0, ground: 0x5a4a3a, intensity: 1.0 };
  zone.exposure = 1.05;
  zone.env = 0.35;
  zone.label = "King's Cross";
  const chim = new THREE.Vector3();
  zone.update = (dt, t) => {
    muggles(dt, t);
    wizards(dt, t);
    for (const o of zone.owls) {
      o.t += dt;
      o.owl.userData.head.rotation.y = Math.sin(o.t * 0.7) * 1.2 * smoothstep(0.3, 0.7, Math.sin(o.t * 0.31) * 0.5 + 0.5);
      o.hoot -= dt;
      if (o.hoot <= 0) { o.hoot = 6 + Math.random() * 10; if (o.owl.position.distanceTo(G.player.pos) < 14) G.audio.sfx('hoot'); }
    }
    // steam from the engine and along the platform edge
    chim.copy(train.userData.chimney).add(train.position).add(zone.offset);
    if (Math.random() < 0.5) G.fx.smokePuff(chim, 0xe8e8e8, 1, { size: 1.2, size1: 4, speed: 2, life: 2.5, alpha: 0.35, vel: new THREE.Vector3(0, 3, 0) });
    if (Math.random() < 0.15) G.fx.smokePuff(W(4.8, 0.2, -146 + Math.random() * 90), 0xf0f0f0, 1, { size: 1.5, size1: 3.5, speed: 0.6, life: 3, alpha: 0.18 });
  };
  return zone;
}

// ================================================================== THE TRAIN (interior)
// Three corridor carriages along -z: corridor on the +x side, compartments on -x.
export const CAR_LEN = 20, COMP_LEN = 2.4, N_COMP = 7;
export function compCenter(car, k) { return new THREE.Vector3(-0.65, 0, -(car * CAR_LEN + 1.6 + k * COMP_LEN + COMP_LEN / 2)); }
export function buildTrain(Q) {
  const M = materials(), J = jmats();
  const zone = makeZone('train', 'The Hogwarts Express', { fog: { color: 0x1a1210, density: 0.01 }, noSave: true });
  const { C, W } = zone;
  const B = new Builder();
  const X0 = -1.7, X1 = 1.7, HT = 2.7, PART = 0.45, NCAR = 3;
  const L = NCAR * CAR_LEN;
  const panel = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.6 });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x4a1418, roughness: 1 });
  const ceil = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 });
  B.box(carpet, 0, -0.1, -L / 2, 3.6, 0.2, L);
  B.box(ceil, 0, HT + 0.1, -L / 2, 3.6, 0.2, L);
  // landscape windows (scrolling shader, shared)
  const winMat = landscapeMaterial();
  zone.winMat = winMat;
  const wall = (x, z0, z1) => { B.box(panel, x, HT / 2, (z0 + z1) / 2, 0.1, HT, Math.abs(z1 - z0)); C.box(x, HT / 2, (z0 + z1) / 2, 0.08, HT / 2, Math.abs(z1 - z0) / 2); };
  wall(X0, 0, -L); wall(X1, 0, -L);
  B.box(panel, 0, HT / 2, 0.05, 3.6, HT, 0.1); C.box(0, HT / 2, 0.05, 1.8, HT / 2, 0.08);
  B.box(panel, 0, HT / 2, -L - 0.05, 3.6, HT, 0.1); C.box(0, HT / 2, -L - 0.05, 1.8, HT / 2, 0.08);
  zone.comps = [];
  for (let car = 0; car < NCAR; car++) {
    const zc = -car * CAR_LEN;
    // vestibule partitions between carriages (door gap in the middle)
    if (car > 0) {
      for (const sx of [-1, 1]) { B.box(J.redDark, sx * 1.15, HT / 2, zc, 1.1, HT, 0.15); C.box(sx * 1.15, HT / 2, zc, 0.55, HT / 2, 0.08); }
      B.box(J.redDark, 0, HT - 0.3, zc, 1.2, 0.6, 0.15);
    }
    for (let k = 0; k < N_COMP; k++) {
      const z0 = zc - 1.6 - k * COMP_LEN, z1 = z0 - COMP_LEN, zm = (z0 + z1) / 2;
      // walls between compartments
      B.box(panel, (X0 + PART) / 2, HT / 2, z0, PART - X0, HT, 0.08); C.box((X0 + PART) / 2, HT / 2, z0, (PART - X0) / 2, HT / 2, 0.05);
      if (k === N_COMP - 1) { B.box(panel, (X0 + PART) / 2, HT / 2, z1, PART - X0, HT, 0.08); C.box((X0 + PART) / 2, HT / 2, z1, (PART - X0) / 2, HT / 2, 0.05); }
      // corridor partition with a sliding door gap
      B.box(panel, PART, HT / 2, z0 - 0.35, 0.08, HT, 0.7); C.box(PART, HT / 2, z0 - 0.35, 0.05, HT / 2, 0.35);
      B.box(panel, PART, HT / 2, z1 + 0.6, 0.08, HT, 1.2); C.box(PART, HT / 2, z1 + 0.6, 0.05, HT / 2, 0.6);
      B.box(J.glass, PART, 1.7, zm + 0.1, 0.03, 1.2, 0.5);
      B.box(panel, PART, HT - 0.25, zm + 0.1, 0.08, 0.5, 0.6);
      // facing benches
      for (const [bz, back] of [[z0 - 0.3, z0 - 0.06], [z1 + 0.3, z1 + 0.06]]) {
        B.box(J.seat, -0.65, 0.45, bz, 2.0, 0.18, 0.55);
        B.box(J.seat, -0.65, 1.0, back, 2.0, 1.0, 0.12);
        B.box(panel, -0.65, 0.2, bz, 2.0, 0.4, 0.5);
        C.box(-0.65, 0.3, bz, 1.0, 0.3, 0.28);
      }
      B.box(panel, X0 + 0.25, 0.75, zm, 0.4, 0.05, 0.6);
      // luggage rack
      B.box(M.iron, -0.65, 2.2, z0 - 0.25, 2.0, 0.04, 0.4); B.box(J.trunk, -0.9, 2.37, z0 - 0.25, 0.7, 0.3, 0.38);
      // window
      B.add(new THREE.PlaneGeometry(1.5, 0.9), winMat, mat4(X0 + 0.06, 1.55, zm, Math.PI / 2));
      B.box(J.brass, X0 + 0.07, 1.55, zm, 0.02, 1.0, 1.6);
      zone.comps.push({ car, k, center: W(-0.65, 0, zm), seat: W(-0.65, 0.45, z0 - 0.3) });
      // corridor window opposite
      B.add(new THREE.PlaneGeometry(1.3, 0.8), winMat, mat4(X1 - 0.06, 1.55, zm, -Math.PI / 2));
      // lamp
      zone.anchors.push({ pos: W(-0.65, HT - 0.2, zm), color: 0xffc888, intensity: 6, distance: 4, flicker: false });
      B.add(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.4) }), mat4(-0.65, HT - 0.12, zm));
    }
  }
  for (let z = -2; z > -L; z -= 4) zone.anchors.push({ pos: W(1.1, HT - 0.2, z), color: 0xffd8a0, intensity: 8, distance: 6 });
  B.build(zone.group);
  zone.spawn = { pos: W(1.1, 0, -1.2), yaw: Math.PI };
  zone.entries = { board: { pos: W(1.1, 0, -1.2), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(-1, 0.6, 0.2), color: 0xfff0d0, intensity: 0.6 };
  zone.hemi = { sky: 0x8a7a68, ground: 0x2a1a14, intensity: 0.8 };
  zone.exposure = 1.15;
  zone.env = 0.25;
  zone.sway = 1;
  zone.tight = true;
  zone.update = (dt, t) => {
    winMat.uniforms.time.value = t;
    winMat.uniforms.night.value = G.trainNight ?? 0;
    winMat.uniforms.snow.value = G.trainSnow ?? 0;
    // the carriage rocks gently on the rails
    if (zone.sway && Math.random() < dt * 0.6) G.cam.shake(0.04);
  };
  return zone;
}

// passing scenery for the train windows: hills, trees and telegraph poles scrolling by
export function landscapeMaterial() {
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, night: { value: 0 }, snow: { value: 0 }, speed: { value: 0.12 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float time, night, snow, speed; varying vec2 vUv;
      float h(float x){ return fract(sin(x*127.1)*43758.5453); }
      float n(float x){ float i=floor(x), f=fract(x); return mix(h(i), h(i+1.0), f*f*(3.0-2.0*f)); }
      void main(){
        vec2 uv = vUv;
        vec3 sky = mix(vec3(0.55,0.72,0.95), vec3(0.95,0.75,0.55), smoothstep(0.3,0.0,uv.y-0.4));
        sky = mix(sky, vec3(0.02,0.03,0.08), night);
        vec3 c = sky;
        if (night > 0.5) { float st = step(0.995, h(floor(uv.x*90.0+time*0.3)*7.0+floor(uv.y*40.0))); c += st*vec3(0.9)*smoothstep(0.5,0.9,uv.y); }
        float far = 0.42 + n(uv.x*3.0 + time*speed*0.4)*0.2;
        if (uv.y < far) c = mix(vec3(0.35,0.45,0.55), vec3(0.04,0.05,0.09), night);
        float mid = 0.3 + n(uv.x*5.0 + time*speed*1.2 + 10.0)*0.16;
        vec3 grass = mix(vec3(0.25,0.45,0.2), vec3(0.9,0.92,0.96), snow);
        if (uv.y < mid) c = mix(grass*0.8, vec3(0.02,0.04,0.03), night);
        float tx = uv.x*14.0 + time*speed*4.0; float tr = step(0.6, h(floor(tx))) * (0.32 + h(floor(tx)+3.0)*0.15);
        if (uv.y < tr && abs(fract(tx)-0.5) < 0.18 + (tr-uv.y)*0.8) c = mix(vec3(0.1,0.25,0.12), vec3(0.01,0.02,0.01), night);
        float near = 0.16 + n(uv.x*9.0 + time*speed*8.0 + 30.0)*0.06;
        if (uv.y < near) c = mix(grass*0.6, vec3(0.01,0.02,0.01), night);
        float px = fract(uv.x*1.5 + time*speed*14.0);
        if (px < 0.012 && uv.y < 0.75) c = mix(vec3(0.2,0.15,0.1), vec3(0.0), night);
        if (snow > 0.0) { float fl = step(0.985, h(floor(uv.x*60.0 + time*speed*20.0)*13.0 + floor(uv.y*50.0 + time*2.0))); c = mix(c, vec3(1.0), fl*snow); }
        // glass reflection + vignette
        c += vec3(0.04) * (1.0 - uv.y);
        c *= 0.85 + 0.15*smoothstep(0.0,0.15,min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y)));
        gl_FragColor = vec4(c*1.25, 1.0);
      }`,
  });
  m.userData.noShadow = true;
  return m;
}

// ================================================================== COUNTRYSIDE (train cutscene)
const CS = new THREE.Vector3(0, 0, -7000);
export function countryHeight(x, z) {
  const lz = z - CS.z;
  let h = (fbm(x * 0.004, lz * 0.004, 4) - 0.4) * 60;
  h += (noise2(x * 0.02, lz * 0.02) - 0.5) * 4;
  const d = Math.abs(lz);
  h = h * smoothstep(10, 60, d);
  // a lake on one side, mountains far off
  h -= smoothstep(160, 60, Math.hypot(x - 300, lz + 180)) * 14;
  h += smoothstep(200, 420, d) * 120 * fbm(x * 0.006, lz * 0.006, 3);
  return h;
}
const FIELDS = [[0.06, 0.14, 0.03], [0.09, 0.17, 0.04], [0.05, 0.11, 0.03], [0.16, 0.15, 0.05], [0.11, 0.16, 0.05], [0.07, 0.12, 0.05]].map((a) => new THREE.Color(...a));
const MOOR = new THREE.Color(0.75, 0.55, 0.45), ROCK = new THREE.Color(0.9, 0.9, 0.95), SHORE = new THREE.Color(0.8, 0.7, 0.5);
// patchwork of fields and hedgerows painted onto one canvas spanning the whole strip
function fieldsTexture() {
  const W = 2048, H = 768;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const rnd = mulberry32(44);
  x.fillStyle = '#3a5a26';
  x.fillRect(0, 0, W, H);
  const cols = ['#3d6a28', '#4a7a2e', '#33561f', '#6a7a32', '#7a8a3a', '#2f5a2a', '#5a6a2a', '#8a8240'];
  for (let gx = 0; gx < W; gx += 34 + rnd() * 20) {
    const w = 34 + rnd() * 30;
    for (let gy = 0; gy < H; gy += 0) {
      const h = 22 + rnd() * 30;
      x.fillStyle = cols[Math.floor(rnd() * cols.length)];
      x.beginPath();
      x.moveTo(gx + rnd() * 4, gy + rnd() * 4); x.lineTo(gx + w + rnd() * 4, gy + rnd() * 4); x.lineTo(gx + w + rnd() * 4, gy + h + rnd() * 4); x.lineTo(gx + rnd() * 4, gy + h + rnd() * 4);
      x.closePath(); x.fill();
      // furrows
      x.strokeStyle = 'rgba(0,0,0,.06)'; x.lineWidth = 1;
      for (let k = 0; k < w; k += 3) { x.beginPath(); x.moveTo(gx + k, gy); x.lineTo(gx + k, gy + h); x.stroke(); }
      // hedgerow with the odd tree
      x.strokeStyle = '#1e3214'; x.lineWidth = 2.2;
      x.strokeRect(gx, gy, w, h);
      if (rnd() < 0.5) { x.fillStyle = '#1a2c12'; x.beginPath(); x.arc(gx + rnd() * w, gy, 2.5, 0, 7); x.fill(); }
      gy += h;
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function buildCountryside(Q) {
  const M = materials(), J = jmats();
  const group = new THREE.Group();
  group.name = 'countryside';
  const col = new Colliders();
  col.terrain = countryHeight;
  const zone = { name: 'countryside', label: 'The Highlands', outdoor: true, group, world: new THREE.Group(), colliders: col, anchors: [], portals: [], props: [], noSave: true,
    fog: { color: 0xa8b8c8, density: 0.0011 }, spawn: { pos: CS.clone(), yaw: 0 } };
  // terrain
  const seg = Q.terrainSeg < 150 ? 90 : 140;
  const geo = new THREE.PlaneGeometry(2400, 900, seg, Math.round(seg * 0.4));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) + CS.z;
    const h = countryHeight(x, z);
    pos.setY(i, h);
    const rock = smoothstep(30, 60, h), low = smoothstep(-6, -12, h);
    c.setRGB(1, 1, 1).lerp(MOOR, smoothstep(14, 28, h)).lerp(ROCK, rock).lerp(SHORE, low);
    c.multiplyScalar(0.8 + noise2(x * 0.08, z * 0.08) * 0.35);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: fieldsTexture() }));
  terrain.position.z = CS.z;
  terrain.receiveShadow = true;
  group.add(terrain);
  zone.snowMat = terrain.material;
  // water
  const water = new THREE.Mesh(new THREE.CircleGeometry(150, 32), new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.15, metalness: 0.3 }));
  water.rotation.x = -Math.PI / 2; water.position.set(300, -6, CS.z - 180);
  group.add(water);
  // track
  const B = new Builder();
  B.box(J.ballast, 0, 0.15, CS.z, 2400, 0.3, 4);
  for (const dz of [-0.75, 0.75]) B.box(J.rail, 0, 0.45, CS.z + dz, 2400, 0.12, 0.08);
  for (let x = -1200; x < 1200; x += 3) B.box(J.sleeper, x, 0.33, CS.z, 0.35, 0.1, 2.6);
  // a stone viaduct over a glen
  for (let x = 80; x < 240; x += 16) B.box(M.stone, x, -14, CS.z, 4, 30, 5);
  B.build(group, { cast: false });
  // trees (instanced cones)
  const rnd = mulberry32(21);
  const mats = [];
  for (let i = 0; i < Math.floor(700 * Q.trees); i++) {
    const x = -1150 + rnd() * 2300, z = CS.z + (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 300);
    const h = countryHeight(x, z);
    if (h < -5 || h > 45) continue;
    const s = 0.7 + rnd() * 0.9;
    mats.push(mat4(x, h, z, rnd() * 6, s, s * (0.9 + rnd() * 0.5), s));
  }
  const tree = new THREE.ConeGeometry(2.2, 7, 7);
  tree.translate(0, 4, 0);
  group.add(instanced(tree, M.pine, mats, { cast: false }));
  // the train
  const train = makeTrain(5, true);
  train.rotation.y = -Math.PI / 2; // front toward +x
  train.position.set(0, 0.45, CS.z);
  group.add(train);
  zone.train = train;
  zone.trainX = -900;
  zone.update = (dt, t) => {
    zone.trainX += dt * 30;
    train.position.x = zone.trainX;
    if (Math.random() < 0.7) {
      const p = new THREE.Vector3(zone.trainX + 1.6, 5.1, CS.z);
      G.fx.smokePuff(p, G.night > 0.6 ? 0x8a8a8a : 0xf0f0f0, 1, { size: 1.4, size1: 6, speed: 1.5, life: 3.5, alpha: 0.4, vel: new THREE.Vector3(-14, 2.5, 0) });
    }
  };
  zone.reset = () => { zone.trainX = -900; train.position.x = zone.trainX; };
  zone.trainPos = () => new THREE.Vector3(zone.trainX, 2, CS.z);
  return zone;
}

// small boat for the first-years' crossing of the Black Lake
export function makeBoat() {
  const M = materials();
  const g = new THREE.Group();
  const B = new Builder();
  const hull = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const hullMat = M.woodDark.clone();
  hullMat.side = THREE.DoubleSide;
  B.add(hull, hullMat, mat4(0, 0.55, 0, 0, 0.95, 0.5, 2.0));
  B.box(M.wood, 0, 0.5, 0.9, 1.5, 0.08, 0.35); B.box(M.wood, 0, 0.5, -0.7, 1.5, 0.08, 0.35);
  B.add(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), M.iron, mat4(0, 1.2, 1.8, 0, 1, 1, 1, -0.4));
  B.build(g);
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(3, 2.2, 1.0), blending: THREE.AdditiveBlending, depthWrite: false }));
  lamp.position.set(0, 1.75, 2.15);
  lamp.scale.setScalar(0.9);
  g.add(lamp);
  g.userData.lamp = lamp;
  return g;
}
// horseless carriage for the later years' ride up to the castle
export function makeCarriage() {
  const M = materials(), J = jmats();
  const g = new THREE.Group();
  const B = new Builder();
  B.box(M.woodDark, 0, 1.6, 0, 1.6, 1.4, 2.4);
  B.add(new THREE.CylinderGeometry(0.9, 0.9, 2.4, 12, 1, false, -Math.PI / 2, Math.PI), J.black, mat4(0, 2.3, 0, 0, 0.9, 0.35, 1, Math.PI / 2));
  for (const sx of [-1, 1]) {
    B.box(J.winLit, sx * 0.81, 1.8, 0, 0.02, 0.5, 0.9);
    for (const z of [-0.8, 0.8]) B.add(new THREE.TorusGeometry(0.5, 0.06, 6, 16), J.black, mat4(sx * 0.9, 0.55, z, Math.PI / 2));
  }
  B.box(M.wood, 0, 1.0, 1.8, 0.1, 0.1, 1.6);
  for (const sx of [-0.5, 0.5]) B.box(M.wood, sx, 0.9, 2.6, 0.06, 0.06, 1.6);
  B.build(g);
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(3, 2.2, 1.0), blending: THREE.AdditiveBlending, depthWrite: false }));
  lamp.position.set(0.95, 2.4, 1.1);
  lamp.scale.setScalar(0.8);
  g.add(lamp);
  return g;
}
