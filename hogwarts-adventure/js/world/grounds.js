// The Hogwarts grounds zone: terrain, castle exterior, Black Lake, Forbidden Forest,
// Quidditch pitch, groundskeeper's hut and the Hippogriff paddock.
import * as THREE from 'three';
import { G } from '../state.js';
import { Colliders } from '../collision.js';
import { Builder, mat4, BOX } from './builder.js';
import { materials } from './materials.js';
import { buildTerrain, buildWater, buildGrass, groundHeight, PLATEAU, WATER_Y, SPOTS } from './terrain.js';
import { buildCastle } from './castle.js';
import { mulberry32, smoothstep, noise2 } from '../util.js';
import { glowSprite, bannerTex, flameSprite } from '../textures.js';
import { HOUSE_KEYS, HOUSES } from '../state.js';

function pineGeometry() {
  const parts = [];
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const r = 2.6 - i * 0.55, h = 3.4 - i * 0.4;
    const g = new THREE.ConeGeometry(r, h, 8, 1);
    g.translate(0, 2.4 + i * 1.9 + h / 2, 0);
    parts.push(g);
  }
  return mergeAll(parts);
}
function leafyGeometry() {
  const parts = [];
  const rnd = mulberry32(5);
  for (let i = 0; i < 5; i++) {
    const g = new THREE.IcosahedronGeometry(1.6 + rnd() * 0.9, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const s = 1 + (noise2(p.getX(k) * 2 + i, p.getY(k) * 2) - 0.5) * 0.35;
      p.setXYZ(k, p.getX(k) * s, p.getY(k) * s, p.getZ(k) * s);
    }
    g.translate((rnd() - 0.5) * 2.6, 5.5 + rnd() * 2.2, (rnd() - 0.5) * 2.6);
    parts.push(g);
  }
  return mergeAll(parts);
}
function mergeAll(list) {
  const b = new Builder();
  const m = new THREE.MeshBasicMaterial();
  list.forEach((g) => b.add(g, m));
  const grp = new THREE.Group();
  b.build(grp);
  const geo = grp.children[0].geometry;
  geo.computeVertexNormals();
  return geo;
}

export function buildGrounds(Q) {
  const M = materials();
  const group = new THREE.Group();
  group.name = 'grounds';
  const col = new Colliders();
  col.terrain = groundHeight;
  const anchors = [];
  const zone = {
    name: 'grounds', label: 'Hogwarts Grounds', outdoor: true, group, world: new THREE.Group(), colliders: col, anchors, portals: [], props: [],
    fog: { color: 0x9fb4cc, density: 0.0026 },
    spawn: { pos: SPOTS.spawn.clone(), yaw: Math.PI },
    groundY: groundHeight,
  };

  const sky = G.skyObj;
  const terrain = buildTerrain(Q);
  group.add(terrain);
  const water = buildWater(sky);
  group.add(water);
  col.water = WATER_Y;

  const castle = buildCastle(group, col, anchors);

  // ------------------------------------------------------------ road lamps
  const B = new Builder();
  for (let z = 32; z <= 92; z += 12) {
    for (const sx of [-1, 1]) {
      const x = sx * 7.5;
      const y = groundHeight(x, z);
      B.add(new THREE.CylinderGeometry(0.1, 0.14, 3.6, 8), M.iron, mat4(x, y + 1.8, z));
      B.add(new THREE.CylinderGeometry(0.32, 0.22, 0.6, 6), M.iron, mat4(x, y + 3.8, z));
      col.cyl(x, z, 0.2, y, y + 4);
      anchors.push({ pos: new THREE.Vector3(x, y + 3.8, z), color: 0xffb060, intensity: 18, distance: 12, flicker: true, night: true, flame: true, small: true });
    }
  }

  // ------------------------------------------------------------ Quidditch pitch
  const P = SPOTS.pitch;
  const pitchY = groundHeight(P.x, P.z);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4f1e6, transparent: true, opacity: 0.55, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), lineMat);
  ring.rotation.x = -Math.PI / 2; ring.scale.set(58, 26, 1); ring.position.set(P.x, pitchY + 0.06, P.z);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(5.6, 6, 48), lineMat);
  ring2.rotation.x = -Math.PI / 2; ring2.position.set(P.x, pitchY + 0.06, P.z);
  group.add(ring, ring2);
  const hoops = [];
  for (const end of [-1, 1]) {
    [[-7, 13], [0, 17], [7, 13]].forEach(([dz, h]) => {
      const x = P.x + end * 50, z = P.z + dz;
      B.add(new THREE.CylinderGeometry(0.18, 0.25, h, 10), M.gold, mat4(x, pitchY + h / 2, z));
      B.add(new THREE.TorusGeometry(2, 0.18, 10, 32), M.gold, mat4(x, pitchY + h + 2, z, Math.PI / 2));
      col.cyl(x, z, 0.3, pitchY, pitchY + h);
      hoops.push(new THREE.Vector3(x, pitchY + h + 2, z));
    });
  }
  zone.hoops = hoops;
  zone.pitchY = pitchY;
  // stands
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.31;
    const x = P.x + Math.cos(a) * 66, z = P.z + Math.sin(a) * 34;
    const h = 14 + (i % 2) * 4;
    const house = HOUSE_KEYS[i % 4];
    B.box(M.woodDark, x, pitchY + h / 2, z, 5, h, 5, -a);
    B.box(M.wood, x, pitchY + h + 0.3, z, 6.4, 0.6, 6.4, -a);
    const cone = new THREE.ConeGeometry(4.6, 6, 4, 1, true);
    cone.rotateY(Math.PI / 4 - a);
    const clothMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(HOUSES[house].c1), roughness: 0.85, side: THREE.DoubleSide });
    B.add(cone, clothMat, mat4(x, pitchY + h + 5.6, z));
    // banner hanging on the tower
    const bm = new THREE.MeshStandardMaterial({ map: bannerTex(house), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 7.2), bm);
    banner.position.set(x - Math.cos(a) * 2.56, pitchY + h - 4.5, z - Math.sin(a) * 2.56);
    banner.lookAt(P.x, banner.position.y, P.z);
    group.add(banner);
    col.box(x, pitchY + h / 2, z, 2.6, h / 2, 2.6, -a);
  }

  // ------------------------------------------------------------ hut & paddock
  const H = SPOTS.hut;
  const hy = groundHeight(H.x, H.z);
  B.add(new THREE.CylinderGeometry(4.2, 4.4, 4, 16), M.stoneWarm, mat4(H.x, hy + 2, H.z));
  const thatch = new THREE.MeshStandardMaterial({ color: 0x6b5232, roughness: 1, flatShading: true });
  B.add(new THREE.ConeGeometry(5.6, 4.8, 16, 2), thatch, mat4(H.x, hy + 6.2, H.z));
  B.box(M.stoneDark, H.x + 2.6, hy + 6.5, H.z - 1.5, 1, 4, 1);
  B.box(M.woodDark, H.x - 1.2, hy + 1.4, H.z + 4.25, 1.4, 2.8, 0.2, 0.25);
  col.cyl(H.x, H.z, 4.5, hy - 1, hy + 8);
  anchors.push({ pos: new THREE.Vector3(H.x, hy + 2, H.z + 5.2), color: 0xffa050, intensity: 18, distance: 10, flicker: true, night: true });
  const pumpkin = new THREE.MeshStandardMaterial({ color: 0xd8701c, roughness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const x = H.x - 8 + (i % 3) * 2.2, z = H.z + 7 + Math.floor(i / 3) * 2.2;
    const s = 0.5 + (i * 0.37) % 0.6;
    B.add(new THREE.SphereGeometry(1, 12, 8), pumpkin, mat4(x, groundHeight(x, z) + s * 0.7, z, i, s * 1.2, s * 0.85, s * 1.2));
  }
  const pad = SPOTS.paddock;
  const py = groundHeight(pad.x, pad.z);
  const posts = 28;
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    if (i === 20) continue; // gate gap facing the hut
    const x = pad.x + Math.cos(a) * 16, z = pad.z + Math.sin(a) * 16;
    const y = groundHeight(x, z);
    B.add(new THREE.CylinderGeometry(0.14, 0.16, 1.8, 6), M.wood, mat4(x, y + 0.9, z));
    const a2 = ((i + 1) / posts) * Math.PI * 2;
    const x2 = pad.x + Math.cos(a2) * 16, z2 = pad.z + Math.sin(a2) * 16;
    const mx = (x + x2) / 2, mz = (z + z2) / 2, len = Math.hypot(x2 - x, z2 - z);
    const ry = Math.atan2(x2 - x, z2 - z);
    B.box(M.wood, mx, y + 1.3, mz, 0.12, 0.16, len, ry);
    B.box(M.wood, mx, y + 0.7, mz, 0.12, 0.16, len, ry);
    col.box(mx, y + 0.9, mz, 0.15, 1, len / 2, ry);
  }

  // ------------------------------------------------------------ lake pier
  const pierA = new THREE.Vector3(-108, 0, 66), pierDir = new THREE.Vector3(-0.8, 0, -0.6).normalize();
  for (let i = 0; i < 9; i++) {
    const x = pierA.x + pierDir.x * i * 2.4, z = pierA.z + pierDir.z * i * 2.4;
    B.box(M.wood, x, WATER_Y + 1.25, z, 2.8, 0.2, 2.5, Math.atan2(pierDir.x, pierDir.z));
    col.box(x, WATER_Y + 0.75, z, 1.4, 0.6, 1.25, Math.atan2(pierDir.x, pierDir.z), { noWall: true });
    for (const s of [-1, 1]) B.add(new THREE.CylinderGeometry(0.15, 0.15, 3, 6), M.woodDark, mat4(x + pierDir.z * s * 1.3, WATER_Y, z - pierDir.x * s * 1.3));
  }
  zone.pierEnd = new THREE.Vector3(pierA.x + pierDir.x * 20, WATER_Y + 1.35, pierA.z + pierDir.z * 20);

  // ------------------------------------------------------------ forest clearing (final boss)
  const C = SPOTS.clearing;
  const cy = groundHeight(C.x, C.z);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const x = C.x + Math.cos(a) * 24, z = C.z + Math.sin(a) * 24;
    const h = 4 + (i % 3) * 1.4;
    B.box(M.rock, x, cy + h / 2 - 0.3, z, 1.6, h, 1.1, -a + 0.2, 0.05, 0.08);
    col.box(x, cy + h / 2, z, 0.8, h / 2, 0.55, -a + 0.2);
  }
  const runeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 0.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const runes = new THREE.Mesh(new THREE.RingGeometry(14, 14.6, 64), runeMat);
  runes.rotation.x = -Math.PI / 2; runes.position.set(C.x, cy + 0.08, C.z);
  group.add(runes);
  zone.runes = runes;

  // ------------------------------------------------------------ trees
  const rnd = mulberry32(42);
  const pines = [], leafy = [];
  const okTree = (x, z) => {
    const y = groundHeight(x, z);
    if (y < WATER_Y + 0.8 || y > 40) return null;
    if (Math.abs(x) < 100 && z > -160 && z < 36) return null; // plateau
    if (Math.abs(x) < 16 && z < 105) return null; // road
    if (Math.hypot(x - P.x, (z - P.z) * 1.4) < 95) return null;
    if (Math.hypot(x - 110, z - 96) < 36) return null;
    if (Math.hypot(x - C.x, z - C.z) < 30) return null;
    // forest path
    const segs = [[100, 92, 175, 70], [175, 70, 250, 40]];
    for (const [ax, az, bx, bz] of segs) {
      const vx = bx - ax, vz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
      if (Math.hypot(x - ax - vx * t, z - az - vz * t) < 5) return null;
    }
    return y;
  };
  const cell = 6.5;
  for (let gx = -420; gx < 420; gx += cell) {
    for (let gz = -420; gz < 420; gz += cell) {
      const x = gx + rnd() * cell, z = gz + rnd() * cell;
      const forest = smoothstep(105, 150, x);
      const far = smoothstep(250, 330, Math.hypot(x, z + 40));
      const dens = Math.max(forest * 0.9, far * 0.7, 0.03 + noise2(x * 0.02, z * 0.02) * 0.06);
      if (rnd() > dens * Q.trees) continue;
      const y = okTree(x, z);
      if (y == null) continue;
      const s = 0.8 + rnd() * 0.9 + forest * 0.4;
      const m = mat4(x, y - 0.2, z, rnd() * 6.28, s, s * (0.9 + rnd() * 0.4), s);
      (rnd() < 0.68 + forest * 0.2 ? pines : leafy).push(m);
      if (Math.hypot(x - SPOTS.spawn.x, z - SPOTS.spawn.z) < 380) col.cyl(x, z, 0.45 * s, y - 1, y + 6);
    }
  }
  const trunkG = new THREE.CylinderGeometry(0.22, 0.42, 6, 7);
  trunkG.translate(0, 3, 0);
  const add = (geo, mat, list) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => im.setMatrixAt(i, m));
    const c = new THREE.Color();
    for (let i = 0; i < list.length; i++) im.setColorAt(i, c.setHSL(0.27 + rnd() * 0.08, 0.35 + rnd() * 0.2, 0.55 + rnd() * 0.35));
    im.castShadow = true; im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
  };
  add(pineGeometry(), M.pine, pines);
  add(leafyGeometry(), M.leaves, leafy);
  const trunkIM = new THREE.InstancedMesh(trunkG, M.bark, pines.length + leafy.length);
  [...pines, ...leafy].forEach((m, i) => trunkIM.setMatrixAt(i, m));
  trunkIM.castShadow = true;
  trunkIM.computeBoundingSphere();
  group.add(trunkIM);

  // rocks
  const rockG = new THREE.DodecahedronGeometry(1, 1);
  {
    const p = rockG.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const s = 1 + (noise2(p.getX(k) * 3, p.getZ(k) * 3 + p.getY(k)) - 0.5) * 0.5;
      p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.7, p.getZ(k) * s);
    }
    rockG.computeVertexNormals();
  }
  const rocks = [];
  for (let i = 0; i < 160; i++) {
    const x = (rnd() - 0.5) * 640, z = (rnd() - 0.5) * 640;
    const y = okTree(x, z);
    if (y == null) continue;
    const s = 0.6 + rnd() * 1.8;
    rocks.push(mat4(x, y, z, rnd() * 6, s, s, s));
    if (s > 1) col.cyl(x, z, s * 0.8, y - 1, y + s * 0.6);
  }
  const rockIM = new THREE.InstancedMesh(rockG, M.rock, rocks.length);
  rocks.forEach((m, i) => rockIM.setMatrixAt(i, m));
  rockIM.castShadow = rockIM.receiveShadow = true;
  rockIM.computeBoundingSphere();
  group.add(rockIM);

  B.build(group);

  // grass
  const grass = buildGrass(Math.floor(9000 * Q.grass), (x, z) => {
    const y = groundHeight(x, z);
    if (y < WATER_Y + 0.6) return null;
    if (Math.abs(x) < 40 && z > -30 && z < 26) return null;
    if (Math.abs(x) < 9 && z > 20 && z < 100) return null;
    if (Math.abs(x) < 95 && z < -26 && z > -150) return null;
    return y;
  });
  if (grass) group.add(grass);

  // mist over the lake and in the forest
  const mist = buildMist();
  group.add(mist);

  // fireflies / wisps near the forest
  const flies = buildFireflies();
  group.add(flies);

  zone.update = (dt, t) => {
    water.update(t);
    castle.update(t);
    if (grass) grass.update(t);
    mist.update(t);
    flies.update(t);
    const n = G.night ?? 0;
    M.window.emissiveIntensity = 0.15 + n * 2.6;
    for (const a of anchors) if (a.night) a.scale = 0.08 + n * 0.92;
    runeMat.opacity = 0.25 + Math.sin(t * 2) * 0.1;
    for (const f of flameSprites) {
      const k = f.userData.base * (0.3 + n * 0.7) * (0.9 + Math.sin(t * 15 + f.userData.i * 3) * 0.1);
      f.scale.set(k * 0.6, k, 1);
    }
    // denser fog in the Forbidden Forest
    const px = G.player ? G.player.pos.x : 0;
    const f = smoothstep(110, 170, px);
    if (G.scene.fog) G.scene.fog.density = 0.0024 + f * 0.012 + n * 0.0015;
  };
  zone.onEnter = () => {
    G.scene.fog = new THREE.FogExp2(0x9fb4cc, 0.0026);
  };
  // flames for braziers and road lamps (brighter at night)
  const flameSprites = anchors.filter((a) => a.flame).map((a, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameSprite(), color: new THREE.Color(3.2, 1.8, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sp.position.copy(a.pos).setY(a.pos.y - (a.small ? 0.05 : 0.2));
    sp.userData.base = a.small ? 0.5 : 1.2;
    sp.userData.i = i;
    group.add(sp);
    return sp;
  });
  zone.flameAnchors = anchors.filter((a) => a.flame);
  return zone;
}

function buildMist() {
  const n = 140;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  const rnd = mulberry32(9);
  for (let i = 0; i < n; i++) {
    let x, z;
    if (i < 70) { x = -200 + (rnd() - 0.5) * 200; z = -60 + (rnd() - 0.5) * 220; }
    else { x = 140 + rnd() * 160; z = -60 + rnd() * 220; }
    pos[i * 3] = x; pos[i * 3 + 1] = Math.max(WATER_Y, groundHeight(x, z)) + 1.5 + rnd() * 2; pos[i * 3 + 2] = z;
    seed[i] = rnd() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, map: { value: glowSprite() }, color: { value: new THREE.Color(0.8, 0.85, 0.95) }, opacity: { value: 0.07 } },
    vertexShader: `attribute float seed; uniform float time; varying float vA;
      void main(){ vec3 p = position; p.x += sin(time*0.05+seed)*6.0; p.z += cos(time*0.04+seed*1.3)*6.0;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = 5200.0/ -mv.z; vA = smoothstep(4.0, 30.0, -mv.z); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float opacity; varying float vA;
      void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(color, a*opacity*vA); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.update = (t) => {
    mat.uniforms.time.value = t;
    const n = G.night ?? 0;
    mat.uniforms.color.value.setRGB(0.85 - n * 0.6, 0.88 - n * 0.6, 0.95 - n * 0.5);
  };
  return pts;
}

function buildFireflies() {
  const n = 220;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  const rnd = mulberry32(19);
  for (let i = 0; i < n; i++) {
    const x = 110 + rnd() * 200, z = -80 + rnd() * 240;
    pos[i * 3] = x; pos[i * 3 + 1] = groundHeight(x, z) + 0.6 + rnd() * 3; pos[i * 3 + 2] = z;
    seed[i] = rnd() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, map: { value: glowSprite() }, night: { value: 0 } },
    vertexShader: `attribute float seed; uniform float time; varying float vA;
      void main(){ vec3 p = position; p.x += sin(time*0.4+seed)*2.0; p.y += sin(time*0.7+seed*2.0)*0.6; p.z += cos(time*0.3+seed*1.3)*2.0;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = 60.0/ -mv.z; vA = 0.5+0.5*sin(time*3.0+seed*7.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float night; varying float vA;
      void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(0.7,1.6,0.6)*2.0, a*vA*(0.15+night)); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.update = (t) => { mat.uniforms.time.value = t; mat.uniforms.night.value = G.night ?? 0; };
  return pts;
}
