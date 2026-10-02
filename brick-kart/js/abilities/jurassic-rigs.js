// Brick dinosaurs and water/sound effect pieces for the Jurassic abilities.
// Rigs are built once and pooled: an ability takes one, poses it every frame and gives
// it back when it ends, so using a power-up never rebuilds (or leaks) geometry.
import * as THREE from 'three';
import { theropod, raptor, raptorRun, mosasaurus, RAPTORS, part } from '../maps/jurassic-props.js';

export { raptorRun };

const REX = { body: 0x7a5a3c, dark: 0x4a3222, belly: 0xb09a74, eye: 0xffa020 };

function disposeTree(obj) {
  obj.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
}

const MAKERS = {
  // a raptor (blue, charlie, delta, echo) standing in a holder group
  raptor(name) {
    const r = raptor(RAPTORS[name] || RAPTORS.blue);
    r.holder = new THREE.Group();
    r.holder.add(r.root);
    return r;
  },
  // a giant T. rex head on a brick neck that grows out of the ground
  rex() {
    const t = theropod(REX);
    const head = t.head;
    head.removeFromParent();
    disposeTree(t.root);
    const r = { holder: new THREE.Group(), head, jaw: t.jaw };
    r.neck = new THREE.Group();
    r.holder.add(r.neck);
    r.neck.add(part((L) => {
      // thick neck rising from the road and curving forward into the skull
      L.box(0, 1.5, -1.4, 4.6, 5, 4.6, REX.body, { rx: 0.18 });
      L.box(0, 5.2, -0.6, 4.0, 3.6, 4.0, REX.body, { rx: 0.3 });
      L.box(0, 7.4, 0.4, 3.5, 2.6, 3.4, REX.body, { rx: 0.45 });
      L.box(0, 3.0, 0.9, 3.4, 6.4, 1.0, REX.belly, { rx: 0.22 });
      for (const sd of [-1, 1]) for (const y of [2.4, 4.0, 5.6, 7.0]) L.box(sd * (y < 3.5 ? 2.36 : y < 6.5 ? 2.06 : 1.8), y, -0.9 + y * 0.12, 0.14, 0.28, 2.4, REX.dark, { rx: 0.2 });
      for (const y of [1.6, 4.4, 6.8]) L.brick(0, y + 1.2, -3.2 + y * 0.25, 2, 2, 1, REX.body);
    }, 'rex-neck'));
    head.position.set(0, 8.2, 1.4);
    r.neck.add(head);
    return r;
  },
  mosa() {
    const r = mosasaurus();
    r.holder = new THREE.Group();
    r.holder.add(r.root);
    return r;
  },
};

const pools = new Map();
export function take(key) {
  const p = pools.get(key);
  if (p && p.length) return p.pop();
  const [kind, arg] = key.split(':');
  return MAKERS[kind](arg);
}
export function give(key, rig) {
  rig.holder.removeFromParent();
  let p = pools.get(key);
  if (!p) { p = []; pools.set(key, p); }
  if (p.length < 6) p.push(rig); else disposeTree(rig.holder);
}

// shared effect geometry (never disposed; materials are per use)
export const GEO = {
  torus: new THREE.TorusGeometry(1, 0.11, 6, 40),
  // a cone shell opening along +z from the origin (length 1, end radius 1)
  cone: new THREE.CylinderGeometry(1, 0.12, 1, 28, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
  disc: new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
  ring: new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2),
  // a short wall of water around a circle (radius 1, height 1)
  wall: new THREE.CylinderGeometry(1, 1.12, 1, 36, 1, true).translate(0, 0.5, 0),
  stud: new THREE.CylinderGeometry(0.42, 0.42, 0.22, 12),
  tile: new THREE.CylinderGeometry(1, 1, 0.2, 16),
};
export const glow = (color, opacity = 0.8, additive = true) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
});
export const water = (opacity = 0.78) => new THREE.MeshStandardMaterial({
  color: 0x2f8fd8, transparent: true, opacity, roughness: 0.06, metalness: 0.25, emissive: 0x0b3c70, emissiveIntensity: 0.55, depthWrite: false, side: THREE.DoubleSide,
});

// lay an object flat on the road surface at track sample i, lateral offset lat
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Vector3();
const _m = new THREE.Matrix4();
export function layOnTrack(obj, track, i, lat, lift = 0.1) {
  i = track.wrap(Math.round(i));
  track.at(i, lat + 1, 0, _p); track.at(i, lat - 1, 0, _q); _x.subVectors(_p, _q).normalize();
  track.at(i + 1, lat, 0, _p); track.at(i - 1, lat, 0, _q); _z.subVectors(_p, _q).normalize();
  _y.crossVectors(_z, _x);
  if (_y.y < 0) { _x.negate(); _y.negate(); }
  _y.normalize(); _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  obj.quaternion.setFromRotationMatrix(_m);
  track.at(i, lat, lift, obj.position);
  return obj;
}
