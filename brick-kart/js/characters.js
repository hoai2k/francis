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

// vehicle names for the original karts (racers are a driver + a kart)
const VEHICLES = { bob: 'Hard Hat Hauler', ava: 'Comet Cruiser', redbeard: 'Plank Plunderer', kara: 'Iron Bastion', rex: 'Turbo Titan', nix: 'Shadow Dart', flo: 'Blaze Runner', wendel: 'Spell Streak', pepper: 'Hot Wok', cassie: 'Dust Devil', bjorn: 'Long Hammer', regina: 'Royal Coach', sam: 'Skate Spark', zorp: 'Saucer Buggy', max: 'Tomb Rover', dina: 'Fossil Flyer' };
for (const ch of CHARACTERS) ch.vehicle = VEHICLES[ch.id] || ch.name;

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

export function buildHat(ch, head) {
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

// Seat point for a movie-character driver (see driver.js): hips sit here.
export const SEAT = new THREE.Vector3(0, 0.62, -0.38);

// Builds the kart + driver. Local forward is +Z. With a driver rig
// the minifig is replaced by the rig, seated in a deeper tub behind a turning wheel.
export function buildKart(ch, rig = null) {
  if (ch.build) return buildVehicle(ch, rig || emptyRig());
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
  if (rig) return finishCharacterKart(ch, rig, root, body, b);
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

  const { wheels, glider } = addWheelsAndGlider(ch, body);
  return { root, body, head, wheels, glider, colors: [k, a, ch.torso, ch.legs, C.black, C.ltgray] };
}

// A kart for a movie-character driver: side tub walls hide the legs, the rig sits on
// the seat and a separate steering wheel turns with the stick.
// Vehicle body styles for character karts: wheel sizes (rear, front), body lift and extras.
const BODIES = {
  classic: { rear: 0.45, front: 0.36, lift: 0 },
  racer: { rear: 0.42, front: 0.32, lift: -0.04, rw: 0.5, fw: 0.3 },
  buggy: { rear: 0.56, front: 0.5, lift: 0.12, rw: 0.5, fw: 0.44 },
  monster: { rear: 0.74, front: 0.74, lift: 0.34, rw: 0.62, fw: 0.62 },
  hotrod: { rear: 0.62, front: 0.34, lift: 0.08, rw: 0.56, fw: 0.28 },
};
const BODY_OF = { bob: 'classic', ava: 'racer', redbeard: 'buggy', kara: 'monster', rex: 'racer', nix: 'racer', flo: 'hotrod', wendel: 'classic', pepper: 'hotrod', cassie: 'buggy', bjorn: 'monster', regina: 'classic', sam: 'buggy', zorp: 'racer', max: 'monster', dina: 'hotrod' };
for (const ch of CHARACTERS) ch.body = BODY_OF[ch.id] || 'classic';
const BODY_NAMES = { classic: 'Classic kart', racer: 'Racer', buggy: 'Buggy', monster: 'Monster kart', hotrod: 'Hot rod' };
export const bodyName = (ch) => BODY_NAMES[ch.body] || 'Kart';

function finishCharacterKart(ch, rig, root, body, b) {
  const k = ch.kart, a = ch.accent, st = BODIES[ch.body] || BODIES.classic;
  const H = rig.height, wide = Math.max(1.2, rig.width || 1.2);
  const chrome = { matOpts: { metal: 0.9, rough: 0.2 } };
  // tub: side walls and a back rest sized to the driver
  const wx = Math.max(0.95, wide * 0.5 + 0.12);
  for (const sd of [-1, 1]) {
    b.box(sd * wx, 0.5, -0.25, 0.2, 0.55, 1.7, k);
    b.box(sd * wx, 1.05, -0.25, 0.26, 0.08, 1.75, a);
  }
  b.box(0, 0.5, -1.05, wx * 2, 0.6 + Math.min(0.5, H * 0.12), 0.18, k);
  b.box(0, 0.5, 0.55, wx * 2, 0.5, 0.18, k);
  b.box(0, 0.42, -0.25, wx * 2, 0.12, 1.7, C.dkgray);
  // dashboard + column up to the wheel
  const ws = wheelSpotFor(rig).add(SEAT);
  b.box(0, 0.62, 0.75, 1.3, 0.42, 0.35, C.dkgray);
  limb(b, new THREE.Vector3(0, 0.8, 0.8), new THREE.Vector3(0, ws.y - 0.05, ws.z + 0.05), 0.045, C.black);
  // body style extras
  if (ch.body === 'racer') {
    // long nose, side pods and a tall wing
    b.box(0, 0.32, 2.35, 1.2, 0.36, 0.9, k); b.box(0, 0.32, 2.85, 0.8, 0.26, 0.4, a);
    b.box(0, 0.22, 3.05, 2.6, 0.08, 0.5, a);
    for (const sd of [-1, 1]) { b.box(sd * 1.15, 0.34, 0.1, 0.5, 0.36, 1.8, k); b.box(sd * 1.15, 0.7, 0.1, 0.52, 0.06, 1.6, a); }
    for (const sd of [-1, 1]) b.box(sd * 0.75, 0.9, -1.85, 0.08, 0.9, 0.5, C.black);
    b.box(0, 1.78, -1.95, 2.6, 0.1, 0.7, a); for (const sd of [-1, 1]) b.box(sd * 1.3, 1.55, -1.95, 0.08, 0.5, 0.7, k);
  } else if (ch.body === 'buggy') {
    // roll cage, bull bar, spare tyre and a light bar
    const cage = (x1, y1, z1, x2, y2, z2) => limb(b, new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2), 0.06, a);
    // a roll hoop behind the seat (open above, so raised arms never clip it)
    const top = SEAT.y + Math.min(1.9, Math.max(1.3, H * 0.75));
    for (const sd of [-1, 1]) { cage(sd * wx, 1.05, -1.05, sd * wx * 0.8, top, -1.15); cage(sd * wx * 0.8, top, -1.15, sd * wx * 0.6, 1.05, -1.9); }
    cage(-wx * 0.8, top, -1.15, wx * 0.8, top, -1.15);
    for (let i = -1; i <= 1; i++) b.cyl(i * 0.35, top - 0.02, -1.18, 0.1, 0.14, C.yellow, { matOpts: { emissive: 0xffe080, emissiveIntensity: 0.6 } });
    b.box(0, 0.3, 2.25, 2.2, 0.12, 0.12, C.dkgray); for (const sd of [-1, 1]) b.box(sd * 0.8, 0.3, 2.2, 0.12, 0.5, 0.12, C.dkgray);
    b.add(new THREE.TorusGeometry(0.38, 0.16, 8, 16), plastic(C.black), 0, 1.15, -2.0);
  } else if (ch.body === 'monster') {
    // chunky fenders over the giant wheels and a front grille
    for (const sd of [-1, 1]) for (const z of [-1.2, 1.35]) { b.box(sd * 1.45, 1.02, z, 0.78, 0.14, 1.5, a); b.box(sd * 1.45, 0.72, z + (z > 0 ? 0.72 : -0.72), 0.78, 0.36, 0.1, a); }
    b.box(0, 0.35, 2.15, 2.0, 0.5, 0.2, C.dkgray); for (let i = -2; i <= 2; i++) b.box(i * 0.32, 0.4, 2.26, 0.08, 0.4, 0.05, C.ltgray, chrome);
    for (const sd of [-1, 1]) b.cyl(sd * 0.75, 0.86, 2.18, 0.14, 0.1, C.yellow, { matOpts: { emissive: 0xffe060, emissiveIntensity: 0.8 } });
  } else if (ch.body === 'hotrod') {
    // big exposed engine with stacks, flame stripes
    b.box(0, 0.62, 1.6, 1.3, 0.5, 1.0, C.ltgray, chrome);
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) b.cyl(sd * 0.32, 1.1, 1.25 + i * 0.25, 0.08, 0.35 + i * 0.04, C.ltgray, chrome);
    b.box(0, 1.12, 1.6, 0.5, 0.22, 0.5, C.dkgray);
    for (const sd of [-1, 1]) { b.box(sd * (wx + 0.11), 0.6, 0.3, 0.02, 0.18, 0.9, C.orange); b.box(sd * (wx + 0.11), 0.68, -0.2, 0.02, 0.12, 0.8, C.yellow); }
    for (const sd of [-1, 1]) limb(b, new THREE.Vector3(sd * 0.6, 0.5, -1.6), new THREE.Vector3(sd * 0.7, 0.45, -2.3), 0.1, C.ltgray);
  }
  const kartMesh = b.build({ name: 'kart' });
  // everything but the wheels rides on a lifted body for tall-wheeled styles
  const up = new THREE.Group(); up.position.y = st.lift; body.add(up);
  up.add(kartMesh);
  const swheel = new THREE.Group();
  swheel.position.copy(ws);
  swheel.rotation.x = -0.55;
  const swb = new BrickBuilder(0.4);
  const rim = Math.max(0.2, Math.min(0.42, Math.abs(rig.shoulder.x) * 0.75));
  swb.addMatrix(new THREE.TorusGeometry(rim, 0.05, 8, 20), plastic(C.black), new THREE.Matrix4().makeRotationX(Math.PI / 2));
  swb.box(0, -0.03, 0, rim * 2, 0.06, 0.08, C.black);
  swb.cyl(0, -0.05, 0, 0.08, 0.1, a);
  swheel.add(swb.build({ name: 'swheel' }));
  up.add(swheel);
  // the driver
  rig.root.position.copy(SEAT);
  up.add(rig.root);
  const head = new THREE.Group();   // the driver animator turns the real head
  const { wheels, glider } = addWheelsAndGlider(ch, body, rig, st);
  glider.position.y += st.lift;
  return { root, body, head, wheels, glider, swheel, steerControl: (v) => { swheel.rotation.z = -v * 0.9; }, driver: rig, shadow: kartMesh, top: SEAT.y + rig.height + st.lift, colors: [k, a, rig.def.color ?? C.white, C.black, C.ltgray, C.dkgray] };
}
// ---- custom vehicles (js/vehicles/*.js) ----------------------------------------------------
// A vehicle definition: { id, name, form, blurb, group, stats, colors: [main, accent, ...],
//   build(kit) -> { mesh, seat?, control?, wheels?, hover?, spin?, steer?, fx?, glider?, parts? } }
// Everything is in the kart frame: +Z forward, ground at y = 0, centred on the kart origin.
//   mesh     static body (usually one BrickBuilder.build()); casts the kart's shadow
//   seat     [x, y, z] where the driver's hips go (default SEAT = [0, 0.62, -0.38])
//   control  'wheel' | 'bars' | 'yoke' | 'none' (placed at the driver's hands automatically)
//   wheels   [{ x, y, z, r, w, front, xs? }] standard brick wheels (y is normally r so they touch
//            the ground; xs = x offsets for a shared axle) or custom { g, spin, front, r }
//   hover    true for vehicles that float (no wheels): the body bobs gently
//   spin     [{ obj, axis: 'x'|'y'|'z', rate }] parts spun by speed (turbines, rotors, legs…)
//   steer    [{ obj, axis, amount }] parts turned by steering (fins, handlebars, front forks)
//   fx(s, dt) per-frame hook; s = { speed01, steer, boosting, gliding, grounded, t }
//   glider   [x, y, z] mount for the glider wing (default: above the driver)
//   parts    extra Object3Ds to add (animated pieces referenced by spin/steer/fx)
//   exhaust  [[x, y, z, rotX?, scale?], …] where the boost flames go ([] = none; default: two behind a kart seat)
// build() also receives kit.rig = { height, width, hip (half-width of hips/thighs), shoulder, armLen } (the driver's size in the
// seat frame; a typical figure is ~2.0 tall and 1.3 wide, big ones up to 2.9 and 2.0) so cockpits,
// domes and roll cages can fit whoever drives, and kit.sprung = the group holding body + driver
// (lean or pitch it in fx for bikes and wheelies; hover bob moves its y).
export function emptyRig() {
  return { root: new THREE.Group(), height: 1.8, width: 1.2, shoulder: new THREE.Vector3(0.56, 1.2, 0), armLen: 0.86, def: {} };
}
const VKIT = { THREE, BrickBuilder, C, plastic, limb, wheelGeo, wheelMat, SEAT };
function buildVehicle(def, rig) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const up = new THREE.Group(); body.add(up);     // the sprung/hovering part: body, driver, controls
  // the vehicle can size itself to the driver: rig = { height, width, shoulder: {x,y,z}, armLen }
  // (seat frame, hips at the origin), and animate the sprung group (body + driver) for leans/wheelies
  const rigInfo = { height: rig.height, width: rig.width || 1.2, hip: 0.46 * (rig.width || 1.2), shoulder: rig.shoulder.clone(), armLen: rig.armLen };
  const v = def.build({ ...VKIT, rig: rigInfo, sprung: up }) || {};
  const a = def.accent ?? C.black;
  up.add(v.mesh);
  for (const o of v.parts || []) up.add(o);
  const seat = v.seat ? new THREE.Vector3(...v.seat) : SEAT.clone();
  rig.root.position.copy(seat);
  up.add(rig.root);
  // steering control at the driver's hands
  const ws = wheelSpotFor(rig).add(seat);
  const ctl = new THREE.Group(); ctl.position.copy(ws);
  const cb = new BrickBuilder(0.4);
  const reach = Math.max(0.22, Math.min(0.45, Math.abs(rig.shoulder.x) * 0.8));
  const kind = v.control || 'wheel';
  if (kind === 'wheel') {
    ctl.rotation.x = -0.55;
    cb.addMatrix(new THREE.TorusGeometry(reach * 0.9, 0.05, 8, 20), plastic(C.black), new THREE.Matrix4().makeRotationX(Math.PI / 2));
    cb.box(0, -0.03, 0, reach * 1.8, 0.06, 0.08, C.black); cb.cyl(0, -0.05, 0, 0.08, 0.1, a);
  } else if (kind === 'bars') {
    limb(cb, new THREE.Vector3(-reach - 0.1, 0, 0), new THREE.Vector3(reach + 0.1, 0, 0), 0.05, C.dkgray);
    for (const sd of [-1, 1]) cb.cyl(sd * (reach + 0.05), 0, 0, 0.07, 0.01, C.black, { seg: 8 }), limb(cb, new THREE.Vector3(sd * reach * 0.7, 0, 0), new THREE.Vector3(sd * (reach + 0.18), 0, 0), 0.075, C.black);
    limb(cb, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.55, 0.25), 0.06, C.dkgray);
  } else if (kind === 'yoke') {
    ctl.rotation.x = -0.3;
    limb(cb, new THREE.Vector3(-reach, 0.18, 0), new THREE.Vector3(-reach, -0.08, 0), 0.06, C.black);
    limb(cb, new THREE.Vector3(reach, 0.18, 0), new THREE.Vector3(reach, -0.08, 0), 0.06, C.black);
    limb(cb, new THREE.Vector3(-reach, -0.08, 0), new THREE.Vector3(reach, -0.08, 0), 0.06, C.dkgray);
    cb.box(0, -0.16, 0, 0.18, 0.16, 0.18, a);
    limb(cb, new THREE.Vector3(0, -0.12, 0), new THREE.Vector3(0, -0.12, 0.5), 0.05, C.dkgray);
  }
  if (kind !== 'none') { ctl.add(cb.build({ name: 'control' })); up.add(ctl); }
  const steerControl = kind === 'bars' ? (s) => { ctl.rotation.y = -s * 0.45; } : kind === 'yoke' ? (s) => { ctl.rotation.z = -s * 0.6; } : kind === 'wheel' ? (s) => { ctl.rotation.z = -s * 0.9; } : () => {};
  // wheels stay on the ground (outside the sprung part)
  const wheels = [];
  for (const w of v.wheels || []) {
    if (w.g) { body.add(w.g); wheels.push(w); continue; }
    const g = new THREE.Group(); g.position.set(w.x || 0, w.y ?? w.r, w.z || 0);
    const spin = new THREE.Mesh(wheelGeo(w.r, w.w || 0.36, w.cap ?? a, w.xs || [0]), wheelMat);
    spin.castShadow = true; g.add(spin); body.add(g);
    wheels.push({ g, spin, front: !!w.front, r: w.r });
  }
  // glider (shared design) above the driver or at the vehicle's mount
  const { glider } = addWheelsAndGlider(def, new THREE.Group(), rig, null, true);
  // glider: [x, y, z] fixes the mount; { x?, z? } just shifts it and keeps the height that suits the driver
  glider.position.y += seat.y - SEAT.y;
  if (Array.isArray(v.glider)) glider.position.set(...v.glider);
  else if (v.glider) { glider.position.x += v.glider.x || 0; glider.position.z = v.glider.z ?? glider.position.z; }
  up.add(glider);
  let t = Math.random() * 10;
  const fs = { speed01: 0, steer: 0, boosting: false, gliding: false, grounded: true, t: 0 };   // reused every frame
  const hoverY = v.hover ? (typeof v.hover === 'number' ? v.hover : 0.35) : 0;
  const update = (dt, s) => {
    t += dt;
    if (hoverY) up.position.y = hoverY + Math.sin(t * 3.1) * 0.06 + (s.boosting ? 0.05 : 0);
    for (const p of v.spin || []) p.obj.rotation[p.axis || 'x'] += (p.rate ?? 10) * (0.15 + s.speed01) * dt;
    for (const p of v.steer || []) p.obj.rotation[p.axis || 'y'] = -s.steer * (p.amount ?? 0.4);
    if (v.fx) { Object.assign(fs, s); fs.t = t; v.fx(fs, dt); }
  };
  const top = new THREE.Box3().setFromObject(v.mesh).max.y;
  const colors = def.colors?.length ? def.colors : [def.kart ?? C.red, a, C.black, C.ltgray];
  return { root, body, sprung: up, exhaust: v.exhaust, head: new THREE.Group(), wheels, glider, swheel: ctl, steerControl, driver: rig, shadow: [v.mesh, ...(v.parts || [])], top: Math.max(top, seat.y + rig.height) + hoverY, colors, update };
}

function wheelSpotFor(rig) {
  const s = rig.shoulder, L = rig.armLen, R = 1.0;
  return new THREE.Vector3(0, s.y - Math.cos(R) * L, s.z + Math.sin(R) * L);
}

function addWheelsAndGlider(ch, body, rig = null, st = null, gliderOnly = false) {
  const k = ch.kart ?? C.red, a = ch.accent ?? C.black;
  // wheels: rear pair share one axle mesh; front wheels steer individually
  const wheels = [];
  if (gliderOnly) return { wheels, glider: makeGlider(k, a, rig) };
  const mkWheel = (x, y, z, r, w, front, xs) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const spin = new THREE.Mesh(wheelGeo(r, w, a, xs), wheelMat);
    spin.castShadow = true;
    g.add(spin);
    body.add(g);
    wheels.push({ g, spin, front, r });
  };
  if (st) {
    // character kart body styles: bigger/smaller wheels pushed out to clear the body
    const rr = st.rear, fr = st.front, rx = 1.45 + Math.max(0, (st.rw || 0.42) - 0.42) * 0.5 + (rr > 0.6 ? 0.12 : 0), fx = 1.38 + Math.max(0, (st.fw || 0.34) - 0.34) * 0.5 + (fr > 0.6 ? 0.18 : 0);
    mkWheel(0, rr, -1.2, rr, st.rw || 0.42, false, [rx, -rx]);
    mkWheel(fx, fr, 1.35, fr, st.fw || 0.34, true, [0]); mkWheel(-fx, fr, 1.35, fr, st.fw || 0.34, true, [0]);
  } else {
    mkWheel(0, 0.45, -1.2, 0.45, 0.42, false, [1.45, -1.45]);
    mkWheel(1.38, 0.36, 1.35, 0.36, 0.34, true, [0]); mkWheel(-1.38, 0.36, 1.35, 0.36, 0.34, true, [0]);
  }

  const glider = makeGlider(k, a, rig);
  body.add(glider);
  return { wheels, glider };
}

// glider: brick wing on a mast, shown while gliding
function makeGlider(k, a, rig) {
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
  // a tall driver holds the glider bar above their head
  if (rig) {
    const top = Math.max(rig.height, new THREE.Box3().setFromObject(rig.root).max.y - rig.root.position.y);
    glider.position.set(0, Math.max(1.2, SEAT.y + top - 0.9), -0.5);
  }
  glider.visible = false;
  return glider;
}
