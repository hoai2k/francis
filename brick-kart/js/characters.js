// Racers: minifig drivers in brick-built karts.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BrickBuilder, C, plastic, faceTexture, studGeo } from './lego.js';

export const CHARACTERS = [
  { id: 'bob', name: 'Brick Bob', blurb: 'All-round builder', kart: C.yellow, accent: C.black, torso: C.orange, legs: C.blue, hat: 'hardhat', hatColor: C.yellow, face: 'grin', stats: { speed: 3, accel: 3, handling: 3, weight: 3 } },
  { id: 'ava', name: 'Astro Ava', blurb: 'Zippy & nimble', kart: C.white, accent: C.blue, torso: C.white, legs: C.white, hat: 'astro', hatColor: C.white, face: 'smile', stats: { speed: 2, accel: 4, handling: 4, weight: 2 } },
  { id: 'redbeard', name: 'Cap\'n Redbeard', blurb: 'Heavy cruiser', kart: C.rbrown, accent: C.dkred, torso: C.white, legs: C.black, hat: 'pirate', hatColor: C.black, face: 'beard', stats: { speed: 4, accel: 2, handling: 2, weight: 4 } },
  { id: 'kara', name: 'Sir Kara', blurb: 'Armoured tank', kart: C.ltgray, accent: C.blue, torso: C.ltgray, legs: C.dkgray, hat: 'knight', hatColor: C.ltgray, face: 'angry', stats: { speed: 4, accel: 1, handling: 2, weight: 5 } },
  { id: 'rex', name: 'Robo-Rex', blurb: 'Top speed', kart: C.dkgray, accent: C.lime, torso: C.dkgray, legs: C.ltgray, hat: 'robot', hatColor: C.ltgray, face: 'visor', stats: { speed: 5, accel: 2, handling: 1, weight: 4 } },
  { id: 'nix', name: 'Ninja Nix', blurb: 'Drift master', kart: C.green, accent: C.black, torso: C.green, legs: C.green, hat: 'ninja', hatColor: C.green, face: 'angry', stats: { speed: 2, accel: 5, handling: 5, weight: 1 } },
  { id: 'flo', name: 'Chief Flo', blurb: 'Quick handler', kart: C.red, accent: C.white, torso: C.red, legs: C.black, hat: 'fire', hatColor: C.red, face: 'smile', stats: { speed: 3, accel: 3, handling: 4, weight: 2 } },
  { id: 'wendel', name: 'Wizard Wendel', blurb: 'Speedy spellcaster', kart: C.purple, accent: C.pearl, torso: C.purple, legs: C.dkblue, hat: 'wizard', hatColor: C.dkblue, face: 'beard', stats: { speed: 3, accel: 4, handling: 3, weight: 2 } },
  { id: 'pepper', name: 'Chef Pepper', blurb: 'Hot & quick', kart: C.orange, accent: C.white, torso: C.white, legs: C.black, hat: 'chef', hatColor: C.white, face: 'grin', stats: { speed: 2, accel: 5, handling: 4, weight: 1 } },
  { id: 'cassie', name: 'Cowgirl Cassie', blurb: 'Tough rider', kart: C.tan, accent: C.rbrown, torso: C.red, legs: C.blue, hat: 'cowboy', hatColor: C.rbrown, face: 'smile', stats: { speed: 4, accel: 3, handling: 3, weight: 3 } },
  { id: 'bjorn', name: 'Viking Bjorn', blurb: 'Unstoppable', kart: C.dkred, accent: C.ltgray, torso: C.rbrown, legs: C.dkgray, hat: 'viking', hatColor: C.ltgray, face: 'beard', stats: { speed: 5, accel: 1, handling: 1, weight: 5 } },
  { id: 'regina', name: 'Queen Regina', blurb: 'Royal speed', kart: C.pink, accent: C.pearl, torso: C.magenta, legs: C.pink, hat: 'crown', hatColor: C.pearl, face: 'smile', stats: { speed: 4, accel: 3, handling: 4, weight: 2 } },
  { id: 'sam', name: 'Skater Sam', blurb: 'Tricky drifter', kart: C.azure, accent: C.lime, torso: C.lime, legs: C.dkblue, hat: 'cap', hatColor: C.azure, face: 'grin', stats: { speed: 3, accel: 4, handling: 5, weight: 1 } },
  { id: 'zorp', name: 'Zorp the Alien', blurb: 'Out of this world', kart: C.lime, accent: C.purple, torso: C.lavender, legs: C.purple, hat: 'alien', hatColor: C.lime, face: 'alien', stats: { speed: 4, accel: 4, handling: 2, weight: 3 } },
  { id: 'max', name: 'Mummy Max', blurb: 'Wrapped for speed', kart: C.dktan, accent: C.gold, torso: C.tan, legs: C.tan, hat: 'mummy', hatColor: C.tan, face: 'angry', stats: { speed: 3, accel: 2, handling: 3, weight: 4 } },
  { id: 'dina', name: 'Dino Dina', blurb: 'Big bite', kart: C.green, accent: C.orange, torso: C.lime, legs: C.green, hat: 'dino', hatColor: C.lime, face: 'grin', stats: { speed: 4, accel: 2, handling: 3, weight: 4 } },
];

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function limb(b, a, c, r, color) {
  const dir = new THREE.Vector3().subVectors(c, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r, r, 1, 10).translate(0, 0.5, 0);
  const m = new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize()), new THREE.Vector3(1, len, 1));
  b.addMatrix(geo, plastic(color), m);
}

function taperedBox(bw, tw, h, d) {
  const g = new THREE.BoxGeometry(bw, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * (tw / bw));
  g.computeVertexNormals();
  g.translate(0, h / 2, 0);
  return g;
}

function buildHat(ch, head) {
  const b = new BrickBuilder(0.4);
  const hc = ch.hatColor;
  const top = 0.36;
  switch (ch.hat) {
    case 'hardhat':
      b.sphere(0, top - 0.02, 0, 0.27, hc, { sy: 0.8 });
      b.cyl(0, top - 0.04, 0, 0.3, 0.04, hc, { seg: 20 });
      b.box(0, top + 0.12, 0, 0.06, 0.14, 0.5, hc);
      break;
    case 'astro': {
      b.cyl(0, -0.04, 0, 0.3, 0.1, C.white, { seg: 20 });
      const dome = new THREE.SphereGeometry(0.34, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
      b.add(dome, plastic(C.azure, { trans: true, opacity: 0.35 }), 0, 0.12, 0);
      b.box(0, 0.36, -0.26, 0.2, 0.18, 0.14, C.blue);
      break;
    }
    case 'pirate':
      b.cyl(0, top - 0.06, 0, 0.26, 0.14, hc, { seg: 18 });
      b.cyl(0, top - 0.06, 0, 0.42, 0.04, hc, { seg: 3 });
      b.box(0, top + 0.02, 0.2, 0.12, 0.1, 0.02, C.white);
      break;
    case 'knight':
      b.cyl(0, -0.04, 0, 0.3, 0.48, hc, { seg: 18, matOpts: { metal: 0.7, rough: 0.25 } });
      b.box(0, 0.12, 0.25, 0.4, 0.07, 0.1, C.black);
      b.box(0, 0.44, 0, 0.06, 0.25, 0.4, C.red);
      break;
    case 'robot':
      b.box(0, -0.04, 0, 0.56, 0.44, 0.5, hc, { matOpts: { metal: 0.5, rough: 0.3 } });
      b.box(0, 0.12, 0.23, 0.44, 0.12, 0.06, C.black);
      b.box(0, 0.15, 0.25, 0.36, 0.05, 0.03, C.red, { matOpts: { emissive: 0xff2020, emissiveIntensity: 1.5 } });
      b.cyl(0, 0.4, 0, 0.03, 0.22, C.black);
      b.sphere(0, 0.64, 0, 0.06, C.lime, { matOpts: { emissive: 0x88ff00, emissiveIntensity: 1 } });
      break;
    case 'ninja':
      b.cyl(0, 0.2, 0, 0.245, 0.2, hc, { seg: 20 });
      b.cyl(0, -0.02, 0, 0.245, 0.1, hc, { seg: 20 });
      b.box(0, 0.3, -0.28, 0.08, 0.06, 0.16, hc);
      break;
    case 'fire':
      b.sphere(0, top - 0.04, 0, 0.28, hc, { sy: 0.8 });
      b.cyl(0, top - 0.06, -0.04, 0.34, 0.04, hc, { seg: 20 });
      b.box(0, top + 0.02, 0.22, 0.14, 0.18, 0.04, C.yellow);
      break;
    case 'chef':
      b.cyl(0, top - 0.04, 0, 0.26, 0.2, hc, { seg: 18 });
      b.sphere(0, top + 0.28, 0, 0.3, hc, { sy: 0.7 });
      break;
    case 'cowboy':
      b.cyl(0, top - 0.06, 0, 0.46, 0.05, hc, { seg: 20 });
      b.cyl(0, top - 0.04, 0, 0.25, 0.28, hc, { seg: 18 });
      b.cyl(0, top, 0, 0.26, 0.05, C.black, { seg: 18 });
      break;
    case 'viking':
      b.sphere(0, top - 0.04, 0, 0.27, hc, { sy: 0.85, matOpts: { metal: 0.6, rough: 0.3 } });
      for (const sd of [-1, 1]) {
        b.cone(sd * 0.32, top + 0.02, 0, 0.07, 0.34, C.white, { seg: 8 });
      }
      b.box(0, top + 0.18, 0, 0.06, 0.08, 0.56, C.pearl);
      break;
    case 'crown':
      b.cyl(0, top - 0.04, 0, 0.25, 0.14, hc, { seg: 18, matOpts: { metal: 0.9, rough: 0.2 } });
      for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; b.cone(Math.cos(ang) * 0.2, top + 0.1, Math.sin(ang) * 0.2, 0.06, 0.16, hc, { seg: 6, matOpts: { metal: 0.9, rough: 0.2 } }); }
      b.sphere(0, top + 0.06, 0.25, 0.05, C.red, { matOpts: { emissive: 0xff2040, emissiveIntensity: 0.6 } });
      break;
    case 'cap':
      b.sphere(0, top - 0.04, 0, 0.26, hc, { sy: 0.6 });
      b.box(0, top - 0.02, -0.34, 0.34, 0.04, 0.26, hc);
      break;
    case 'alien':
      for (const sd of [-1, 1]) { b.cyl(sd * 0.12, top - 0.02, 0, 0.025, 0.3, C.black, { seg: 6 }); b.sphere(sd * 0.12, top + 0.3, 0, 0.07, C.purple, { matOpts: { emissive: 0xaa40ff, emissiveIntensity: 1 } }); }
      break;
    case 'mummy':
      for (let k = 0; k < 4; k++) b.cyl(0, 0.02 + k * 0.09, 0, 0.235, 0.06, k % 2 ? C.white : C.tan, { seg: 18 });
      break;
    case 'dino':
      b.sphere(0, top - 0.1, -0.02, 0.29, hc, { sy: 0.9 });
      b.box(0, top - 0.02, 0.2, 0.46, 0.14, 0.26, hc);
      for (let k = 0; k < 4; k++) b.cone(0, top + 0.12 - k * 0.12, -0.18 - k * 0.06, 0.07, 0.18, C.orange, { seg: 6 });
      for (const sd of [-1, 1]) b.sphere(sd * 0.13, top + 0.12, 0.26, 0.05, C.white);
      break;
    case 'wizard':
      b.cyl(0, top - 0.04, 0, 0.42, 0.04, hc, { seg: 20 });
      b.cone(0, top - 0.02, 0, 0.26, 0.62, hc, { seg: 16 });
      b.sphere(0.08, top + 0.3, 0.2, 0.04, C.yellow, { matOpts: { emissive: 0xffd000 } });
      b.sphere(-0.1, top + 0.14, 0.23, 0.04, C.yellow, { matOpts: { emissive: 0xffd000 } });
      break;
  }
  const g = b.build({ name: 'hat' });
  head.add(g);
}

// One wheel (tire + treads + hub + cap) as a single vertex-coloured geometry.
const wheelCache = new Map();
const wheelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
function paintGeo(g, hex) {
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function wheelGeo(r, w, capCol, xs) {
  const key = [r, w, capCol, xs.join(',')].join('|');
  if (wheelCache.has(key)) return wheelCache.get(key);
  const parts = [];
  for (const x of xs) {
    parts.push(paintGeo(new THREE.CylinderGeometry(r, r, w, 20).rotateZ(Math.PI / 2).translate(x, 0, 0), 0x151515));
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      parts.push(paintGeo(new THREE.BoxGeometry(w * 0.9, 0.06, r * 0.35).rotateX(-ang).translate(x, Math.cos(ang) * r, Math.sin(ang) * r), 0x151515));
    }
    parts.push(paintGeo(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.04, 6).rotateZ(Math.PI / 2).translate(x, 0, 0), C.ltgray));
    parts.push(paintGeo(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.1, 8).rotateZ(Math.PI / 2).translate(x, 0, 0), capCol));
  }
  const g = mergeGeometries(parts);
  wheelCache.set(key, g);
  return g;
}

// Builds the kart + driver. Local forward is +Z.
export function buildKart(ch) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const b = new BrickBuilder(0.4);
  const k = ch.kart, a = ch.accent;
  // chassis
  b.brick(0, 0.3, 0, 6, 10, 1, C.black, { studs: false });
  b.brick(1.0, 0.46, 0.2, 1, 6, 3, k); b.brick(-1.0, 0.46, 0.2, 1, 6, 3, k);
  b.brick(0, 0.46, 1.6, 4, 2, 2, k);
  b.brick(0, 0.78, 1.8, 4, 1, 1, a);
  b.box(0, 0.26, 2.08, 2.5, 0.26, 0.2, a);
  b.cyl(0.62, 0.52, 2.02, 0.1, 0.12, C.yellow, { matOpts: { trans: true, opacity: 0.8, emissive: 0xffe060, emissiveIntensity: 0.8 } });
  b.cyl(-0.62, 0.52, 2.02, 0.1, 0.12, C.yellow, { matOpts: { trans: true, opacity: 0.8, emissive: 0xffe060, emissiveIntensity: 0.8 } });
  b.brick(0, 0.46, 0.8, 4, 1, 1, C.dkgray);
  // windscreen
  b.box(0, 0.78, 1.25, 1.5, 0.42, 0.05, C.azure, { matOpts: { trans: true, opacity: 0.45 } });
  // seat
  b.brick(0, 0.46, -0.4, 2, 2, 1, C.dkgray, { studs: false });
  b.box(0, 0.62, -0.78, 0.76, 0.75, 0.1, C.dkgray);
  // engine + exhausts
  b.brick(0, 0.46, -1.4, 4, 2, 3, C.ltgray);
  b.brick(0, 0.94, -1.35, 2, 1, 2, C.dkgray);
  const chrome = { matOpts: { metal: 0.9, rough: 0.2 } };
  b.cyl(0.62, 0.94, -1.25, 0.09, 0.3, C.ltgray, chrome);
  b.cyl(-0.62, 0.94, -1.25, 0.09, 0.3, C.ltgray, chrome);
  // spoiler
  b.brick(0.6, 0.94, -1.8, 1, 1, 3, C.black); b.brick(-0.6, 0.94, -1.8, 1, 1, 3, C.black);
  b.brick(0, 1.42, -1.8, 6, 2, 1, a);
  // number plate stickers
  b.box(1.21, 0.55, 0.2, 0.02, 0.3, 0.9, C.white); b.box(-1.21, 0.55, 0.2, 0.02, 0.3, 0.9, C.white);
  // steering wheel
  const sw = new THREE.TorusGeometry(0.2, 0.04, 8, 18);
  const swm = new THREE.Matrix4().compose(new THREE.Vector3(0, 1.08, 0.42), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0)), new THREE.Vector3(1, 1, 1));
  b.addMatrix(sw, plastic(C.black), swm);
  limb(b, new THREE.Vector3(0, 0.78, 0.8), new THREE.Vector3(0, 1.06, 0.46), 0.04, C.black);
  // minifig (seated)
  const legs = ch.legs, torso = ch.torso;
  b.box(0, 0.62, -0.42, 0.5, 0.26, 0.34, legs);                   // hips
  b.box(0.12, 0.64, 0.02, 0.22, 0.24, 0.6, legs); b.box(-0.12, 0.64, 0.02, 0.22, 0.24, 0.6, legs);
  b.box(0.12, 0.38, 0.28, 0.22, 0.28, 0.2, legs); b.box(-0.12, 0.38, 0.28, 0.22, 0.28, 0.2, legs);
  b.add(taperedBox(0.62, 0.46, 0.52, 0.3), plastic(torso), 0, 0.88, -0.45);
  if (ch.id === 'bob') { b.box(0, 1.1, -0.29, 0.5, 0.06, 0.02, C.yellow); b.box(0, 1.0, -0.29, 0.5, 0.06, 0.02, C.yellow); }
  if (ch.id === 'redbeard') { b.box(0, 0.9, -0.29, 0.5, 0.08, 0.02, C.red); b.box(0, 0.88, -0.61, 0.5, 0.08, 0.02, C.red); }
  if (ch.id === 'wendel') { b.box(0, 0.9, -0.29, 0.3, 0.45, 0.02, C.pearl); }
  if (ch.id === 'ava') { b.box(0, 1.04, -0.29, 0.3, 0.22, 0.02, C.blue); }
  const skin = ch.hat === 'robot' ? C.ltgray : ch.hat === 'alien' ? C.lime : C.fig;
  limb(b, new THREE.Vector3(0.3, 1.3, -0.45), new THREE.Vector3(0.2, 1.02, 0.28), 0.075, torso);
  limb(b, new THREE.Vector3(-0.3, 1.3, -0.45), new THREE.Vector3(-0.2, 1.02, 0.28), 0.075, torso);
  b.sphere(0.2, 1.04, 0.34, 0.07, skin); b.sphere(-0.2, 1.04, 0.34, 0.07, skin);
  b.cyl(0, 1.4, -0.45, 0.1, 0.06, skin);
  body.add(b.build({ name: 'kart' }));

  // head (separate so it can turn and carry a face texture)
  const head = new THREE.Group();
  head.position.set(0, 1.46, -0.45);
  const headMat = [
    new THREE.MeshStandardMaterial({ map: faceTexture(ch.face, ch.hat === 'robot' ? '#a0a5a9' : ch.hat === 'alien' ? '#bbe90b' : '#ffc917'), roughness: 0.35 }),
    plastic(skin), plastic(skin),
  ];
  const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.36, 20), headMat);
  headMesh.position.y = 0.18; headMesh.rotation.y = Math.PI; headMesh.castShadow = true;
  head.add(headMesh);
  const stud = new THREE.Mesh(studGeo(), plastic(skin));
  stud.scale.setScalar(0.4); stud.position.y = 0.36; head.add(stud);
  buildHat(ch, head);
  body.add(head);

  // wheels: rear pair share one axle mesh; front wheels steer individually
  const wheels = [];
  const mkWheel = (x, y, z, r, w, front, xs) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const spin = new THREE.Mesh(wheelGeo(r, w, a, xs), wheelMat);
    spin.castShadow = true;
    g.add(spin);
    body.add(g);
    wheels.push({ g, spin, front, r });
  };
  mkWheel(0, 0.45, -1.2, 0.45, 0.42, false, [1.45, -1.45]);
  mkWheel(1.38, 0.36, 1.35, 0.36, 0.34, true, [0]); mkWheel(-1.38, 0.36, 1.35, 0.36, 0.34, true, [0]);

  // glider: brick wing on a mast, shown while gliding
  const gb = new BrickBuilder(0.4);
  gb.cyl(0, 0, 0, 0.06, 1.7, C.black, { seg: 6 });
  gb.boxM(new THREE.Matrix4().compose(new THREE.Vector3(0, 1.75, 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, 0)), new THREE.Vector3(1.6, 0.1, 1.5)), k);
  for (const sd of [-1, 1]) {
    gb.boxM(new THREE.Matrix4().compose(new THREE.Vector3(sd * 1.75, 1.62, 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, sd * -0.18)), new THREE.Vector3(2.0, 0.1, 1.3)), a);
    gb.boxM(new THREE.Matrix4().compose(new THREE.Vector3(sd * 3.1, 1.45, -0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, sd * -0.3)), new THREE.Vector3(1.0, 0.1, 0.9)), k);
    gb.cyl(sd * 0.1, 0.4, 0, 0.03, 1.4, C.ltgray, { seg: 4 });
  }
  const glider = gb.build({ name: 'glider' });
  glider.position.set(0, 1.2, -0.7);
  glider.visible = false;
  body.add(glider);

  return { root, body, head, wheels, glider, colors: [k, a, ch.torso, ch.legs, C.black, C.ltgray] };
}
