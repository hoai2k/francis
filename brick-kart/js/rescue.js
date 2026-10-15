// The rescue helper: Brick Kart's answer to Mario Kart's Lakitu. A little character from the
// map's own universe rides down on a cloud and fishes karts out of trouble:
//   - stuck: no real progress along the track for a while (wedged in a fence, lost far off the
//     road, beached somewhere) - driving on anywhere that still gains ground is fine, on the road
//     or not, and nobody is fished for just sitting still or for being spun out by an item;
//   - going backwards: well behind the furthest point reached, or driving the wrong way for long.
// The kart is hooked and reeled up (Kart.startRescue), then put back down on the road at the
// furthest point it had reached. The helper also carries in every kart the crane puts back after a
// fall, and shows on other screens online (the kart state's HELP flag).
import * as THREE from 'three';
import { BrickBuilder, plastic } from './lego.js';
import { DRIVERS, buildDriver } from './driver.js';


// Who comes to the rescue on each map's universe (race.movieFrom). Each is a character model
// (a driver rig, a map prop or one of js/helpers/*.js) placed by a small contract:
//   seat   'rig': a driver rig (seat frame, hips at the origin): sits in the cloud, holds the rod
//          in its +X hand (armL, raised); 'fig': a model built the same way whose userData.grip /
//          gripDir say where the rod goes; 'perch': sits on the cloud by its lowest point
//   line   'rod' (fishing line), 'beam' (Grogu's Force beam from userData.beamFrom),
//          'tail' (Kogane's own tail, from userData.tailFrom)
//   cloud  false: it floats on its own (Grogu's hover-pram, Kogane)
// (maps: for the workbench)
export const HELPERS = {
  starwars: { name: 'Grogu', maps: 'Star Wars', load: () => import('./maps/starwars-props.js').then((m) => groguHelper(m.grogu(1))), seat: 'float', line: 'beam', cloud: false, how: 'floats in his hover-pram; lifts karts with a beam of the Force from his hands' },
  jjk: { name: 'Kogane', maps: 'all four JJK maps', load: () => import('./helpers/kogane.js').then((m) => m.build()), seat: 'float', line: 'tail', cloud: false, how: 'flies on its own; its grey tail is the line' },
  potter: { name: 'Hedwig', maps: 'Hogwarts', load: () => import('./maps/hogwarts-props.js').then((m) => hedwigHelper(m.hedwig(1))), seat: 'fig', line: 'rod', how: 'perches on a cloud, rod under her wing' },
  marvel: { name: 'Stan Lee', maps: 'Marvel', load: () => import('./helpers/stanlee.js').then((m) => m.build()), seat: 'fig', line: 'rod', how: 'sits in a cloud' },
  jurassic: { name: 'Pteranodon', maps: 'Jurassic', driver: 'pteranodon', seat: 'rig', line: 'rod', how: 'sits in a cloud' },
  minecraft: { name: 'Pig', maps: 'Minecraft', driver: 'pig', seat: 'rig', line: 'rod', how: 'sits in a cloud' },
  pokemon: { name: 'Pikachu', maps: 'Pokémon', driver: 'pikachu', seat: 'rig', line: 'rod', how: 'sits in a cloud' },
  sonic: { name: 'Tails', maps: 'Sonic', driver: 'tails', seat: 'rig', line: 'rod', how: 'sits in a cloud' },
  classic: { name: 'Cloud', maps: 'the 9 original maps', seat: 'none', line: 'rod', how: 'the cloud itself: a tall, smiling cloud with a rod' },
};

// when to come (seconds / metres of track)
const STALL_TIME = 6, STALL_GAIN = 10;          // trying to drive for 6 s without gaining 10 m
const BACK_DIST = 30, BACK_TIME = 1;            // 30 m behind the furthest point reached
const WRONG_TIME = 3, WRONG_DIST = 12;          // "WRONG WAY!" for 3 s, and lost ground doing it
// how it looks: the helper hangs off to one side of the kart and above it, where the chase camera
// can see it, its line (rod tip / beam / tail) starting HOVER over the kart
const HOVER = 7, DROP = 14;
export const LINE_DROP = HOVER - 1.7;           // from the line's start to the kart's roof
const CS = 1.45;                                // cloud size
const CLOUD_TOP = 0.95 * CS;                    // its top
const SIT_H = 1.9;                             // a seated character's height above its hips
const FLOAT_H = 2.4;                            // the floating helpers' height
const ROD_LEN = 2.6;
const GRIP_DIR = new THREE.Vector3(0.6, 0.75, 0.3).normalize();

export class Rescue {
  constructor(race) {
    this.race = race;
    this.vis = new Map();      // kart -> its helper { g, line, hook, prop, state, t, drop }
    this.template = null;
    const def = HELPERS[race.movieFrom] || HELPERS.classic;
    this.def = def;
    loadHelper(def).then((t) => { this.template = t; });
  }

  update(dt) {
    const race = this.race;
    if (race.started) for (const k of race.karts) if (!k.remote) this.watch(k, dt);
    for (const k of race.karts) this.show(k, dt);
  }

  // is this kart (one this screen drives) in trouble?
  watch(k, dt) {
    const d = k.raceDist;
    const m = (k.rescueWatch ||= { best: d, mark: d, stall: 0, back: 0 });
    if (k.finished || k.respawn > 0) { m.best = Math.max(m.best, d); m.mark = d; m.stall = m.back = 0; return; }
    m.best = Math.max(m.best, d);
    if (d >= m.mark + STALL_GAIN) { m.mark = d; m.stall = 0; }
    else {
      const c = k.ctl || {};
      const trying = !k.human || c.throttle > 0.1 || c.brake > 0.1 || Math.abs(k.speed) > 2;
      const dazed = k.spinTime > 0 || k.wreckTime > 0 || k.frozenTime > 0;
      if (trying && !dazed) m.stall += dt;
    }
    const behind = m.best - d;
    m.back = behind > BACK_DIST ? m.back + dt : 0;
    if (m.stall > STALL_TIME || m.back > BACK_TIME || (k.wrongWay > WRONG_TIME && behind > WRONG_DIST)) {
      m.stall = m.back = 0;
      k.startRescue(Math.floor(m.best) - 2);
    }
  }

  // the helper over a kart that's on its line (any kart: remote ones say so in their state)
  show(k, dt) {
    const on = k.remote ? !!k.netHelp : k.respawn > 0 && (k.fishing || k.respawnPlaced);
    let v = this.vis.get(k);
    if (on && !v && this.template) { v = this.make(); this.vis.set(k, v); }
    if (!v) return;
    const g = v.g, F = this.template.userData.from;
    if (on) {
      if (v.state !== 'on') {
        v.state = 'on'; v.t = 0; v.drop = DROP;
        g.visible = true;
        this.race.audio.sfx('rescue', k.pos);
      }
      v.t += dt;
      v.drop = Math.max(0, v.drop - dt * DROP * 2.2);
      // face back along the kart (towards its camera), the line's start right over it
      const yaw = k.yaw + Math.PI, s = Math.sin(yaw), c = Math.cos(yaw);
      g.rotation.set(0, yaw, Math.sin(v.t * 2.3) * 0.06);
      g.position.set(k.pos.x - (F.x * c + F.z * s), k.pos.y + HOVER - F.y + v.drop + Math.sin(v.t * 3) * 0.12, k.pos.z - (-F.x * s + F.z * c));
      g.updateMatrixWorld(true);
      const from = g.localToWorld(v.tmp.copy(F));
      v.line.set(from, v.to.set(k.pos.x, k.pos.y + 1.7, k.pos.z), v.t);
      v.line.group.visible = v.drop < 4;
      this.template.userData.animate?.(g, v.t);
    } else if (v.state === 'on') { v.state = 'out'; v.t = 0; v.line.group.visible = false; }
    else if (v.state === 'out') {
      // off it goes, up and away
      v.t += dt;
      g.position.y += dt * (3 + v.t * 14);
      g.rotation.y += dt * 1.5;
      this.template.userData.animate?.(g, v.t);
      if (v.t > 1.6) { v.state = 'off'; g.visible = false; }
    }
  }

  make() {
    const race = this.race, g = this.template.clone(true);
    g.visible = false;
    race.scene.add(g);
    const line = helperLine(this.def, this.template);
    line.group.visible = false;
    race.scene.add(line.group);
    return { g, line, state: 'off', t: 0, drop: 0, tmp: new THREE.Vector3(), to: new THREE.Vector3() };
  }
}

// ---- the helpers' models ----------------------------------------------------------------------
// The helper ready to clone: the character in its cloud (or floating), with its rod; userData.from
// is where its line starts (rod tip, Grogu's hands, Kogane's tail), and animate(obj, t) any motion.
export function loadHelper(def) {
  const d = def.driver && DRIVERS.find((x) => x.id === def.driver);
  const load = def.load ? def.load() : d ? Promise.resolve(rigHelper(buildDriver(d))) : Promise.resolve(null);
  return load.then((char) => helperModel(char, def))
    .catch((e) => { console.error('rescue helper', def.name, e); return helperModel(null, HELPERS.classic); });
}

// a driver rig holding the rod up and out in its +X hand (armL), the other arm resting
function rigHelper(rig) {
  const root = rig.root;
  if (rig.armL) { rig.armL.rotation.set(-1.35, 0, 0.45); }
  if (rig.armR) { rig.armR.rotation.set(-0.5, 0, -0.15); }
  root.updateMatrixWorld(true);
  let grip = new THREE.Vector3(0.6, 0.9, 0.4);
  if (rig.armL) grip = root.worldToLocal(rig.armL.localToWorld(new THREE.Vector3(0, -(rig.armLen || 1) * 0.92, 0.04)));
  root.userData.grip = grip;
  root.userData.gripDir = GRIP_DIR.clone();
  root.userData.height = rig.height;
  return root;
}
// Grogu in his pram: the beam comes from his hands, reaching forward over the blanket
function groguHelper(g) {
  g.userData.anim = null;
  g.userData.beamFrom = new THREE.Vector3(0, 0.26, 0.4);
  return g;
}
// Hedwig: wings half folded, the rod held under the +X wing's tip; her lowest point sits on the cloud
function hedwigHelper(g) {
  const [wL, wR] = (g.userData.wings || []);
  // (wings are built along +-X from their pivot: tip them down a little, the rod wing forward)
  if (wR) wR.rotation.set(-0.3, -0.45, -0.55);
  if (wL) wL.rotation.set(0, -0.5, 0.75);
  g.updateMatrixWorld(true);
  g.userData.grip = wR ? g.worldToLocal(wR.localToWorld(new THREE.Vector3(1.75, -0.05, 0))) : new THREE.Vector3(1.4, 0.2, 0.3);
  g.userData.gripDir = GRIP_DIR.clone();
  g.userData.seatBottom = true;
  delete g.userData.wings;   // (userData is copied on clone: keep it to plain values)
  return g;
}

// mark a point of `obj` so it can be read back after scaling (an empty child)
function marker(obj, p, name) { const m = new THREE.Object3D(); m.name = name; m.position.copy(p); obj.add(m); return m; }

function helperModel(char, def) {
  const root = new THREE.Group();
  root.name = 'rescue-helper';
  const ud = char?.userData || {};
  if (def.cloud !== false) root.add(def.seat === 'none' ? tallCloud() : cloud());
  let grip = null, gdir = (ud.gripDir || GRIP_DIR).clone().normalize();
  if (char) {
    // marks before scaling, read after
    const mk = {};
    for (const k of ['grip', 'beamFrom', 'tailFrom']) if (ud[k]) mk[k] = marker(char, ud[k], 'mk-' + k);
    const holder = new THREE.Group();
    holder.add(char); root.add(holder);
    const box = new THREE.Box3().setFromObject(char);
    if (def.seat === 'float') {
      // floats on its own: centred, scaled to its height, bottom at 0
      const sc = FLOAT_H / Math.max(0.01, box.max.y - box.min.y);
      holder.scale.setScalar(sc);
      holder.position.set(-(box.min.x + box.max.x) / 2 * sc, -box.min.y * sc, -(box.min.z + box.max.z) / 2 * sc);
    } else if (ud.seatBottom) {
      // perches: its lowest point just sunk into the cloud's top
      const sc = SIT_H * 1.15 / Math.max(0.01, box.max.y - box.min.y);
      holder.scale.setScalar(sc);
      holder.position.set(-(box.min.x + box.max.x) / 2 * sc, CLOUD_TOP - 0.3 - box.min.y * sc, 0);
    } else {
      // seated (hips at the origin): hips just inside the cloud, scaled so it sits in proportion
      const h = ud.height || box.max.y;
      const sc = SIT_H / Math.max(0.01, h);
      holder.scale.setScalar(sc);
      holder.position.set(0, CLOUD_TOP - 0.62, -0.1);
    }
    root.updateMatrixWorld(true);
    const at = (k) => mk[k] && root.worldToLocal(mk[k].getWorldPosition(new THREE.Vector3()));
    grip = at('grip');
    if (def.line === 'beam') root.userData.from = at('beamFrom') || new THREE.Vector3(0, 0.5, 0.5);
    if (def.line === 'tail') { root.userData.from = at('tailFrom') || new THREE.Vector3(0, 0, -0.3); root.userData.tailRadius = (ud.tailRadius || 0.08) * holder.scale.x; root.userData.tailColor = ud.tailColor ?? 0x8a8a90; }
    if (typeof ud.animate === 'function') root.userData.animate = (obj, t) => ud.animate(obj, t);
    // (clones copy userData as JSON: the character's own bookkeeping, rig links and all, isn't needed now)
    char.traverse((o) => { o.userData = {}; });
  }
  if (def.line === 'rod') {
    // the cloud on its own holds the rod in a puff on its side
    grip ||= new THREE.Vector3(1.25 * CS, 1.15 * CS, 0.35 * CS);
    const tip = grip.clone().addScaledVector(gdir, ROD_LEN);
    root.add(fishingRod(grip, gdir));
    root.userData.from = tip;
  }
  root.userData.from ||= new THREE.Vector3(0, 1, 0);
  return root;
}

// the rod: cork handle through the hand, reel just above it, a tapering pole and a tip ring
function fishingRod(grip, dir) {
  const rod = new THREE.Group();
  rod.name = 'rod';
  const L = ROD_LEN + 0.35;
  rod.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.6, 8).translate(0, 0, 0), plastic(0xc89a62)));          // cork handle, centred in the hand
  rod.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, L, 8).translate(0, L / 2 - 0.35, 0), plastic(0x6b4a2a)));  // the pole
  rod.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12).rotateZ(Math.PI / 2).translate(0.12, 0.42, 0), plastic(0x333333)));   // the reel
  rod.add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 10).translate(0, ROD_LEN, 0), plastic(0x9aa0a8)));          // tip ring
  rod.position.copy(grip);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return rod;
}

// ---- the line: fishing line + hook, Grogu's Force beam, or Kogane's tail ------------------------
// set(from, to, t) stretches it between two world points each frame
const Y_DOWN = new THREE.Vector3(0, -1, 0), _d = new THREE.Vector3();
function span(mesh, a, b) {
  _d.subVectors(b, a);
  const len = Math.max(0.01, _d.length());
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(Y_DOWN, _d.divideScalar(len));
  mesh.scale.set(1, len, 1);
}
export function helperLine(def, template) {
  const group = new THREE.Group();
  group.name = 'rescue-line';
  if (def.line === 'beam') {
    const add = (rt, rb, color, op) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, 1, 24, 1, true).translate(0, -0.5, 0),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.frustumCulled = false; group.add(m); return m;
    };
    const outer = add(0.3, 1.7, 0x3a90ff, 0.3), inner = add(0.1, 0.6, 0x8fd0ff, 0.35);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(glow);
    return { group, set(a, b, t = 0) { span(outer, a, b); span(inner, a, b); glow.position.copy(a); const p = 1 + Math.sin(t * 9) * 0.12; glow.scale.setScalar(p); outer.material.opacity = 0.26 + Math.sin(t * 7) * 0.06; } };
  }
  if (def.line === 'tail') {
    const r = template?.userData.tailRadius || 0.08;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.35, 1, 10, 1, true).translate(0, -0.5, 0), plastic(template?.userData.tailColor ?? 0x8a8a90));
    const tip = new THREE.Mesh(new THREE.TorusGeometry(0.22, r * 0.35, 6, 12, Math.PI * 1.4), plastic(template?.userData.tailColor ?? 0x8a8a90));
    tail.frustumCulled = false;
    group.add(tail, tip);
    return { group, set(a, b) { span(tail, a, b); tip.position.copy(b); } };
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(6, 3)), new THREE.LineBasicMaterial({ color: 0x222222 }));
  line.frustumCulled = false;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 6, 12, Math.PI * 1.5), plastic(0x9aa0a8));
  group.add(line, hook);
  return { group, set(a, b) { const p = line.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; line.geometry.computeBoundingSphere(); hook.position.copy(b); } };
}

// ---- clouds -------------------------------------------------------------------------------------
const PUFFS = [[-0.85, 0, 0.05, 0.62], [0.85, 0, -0.05, 0.62], [0, 0.05, 0.7, 0.58], [0, 0.05, -0.7, 0.58], [-0.55, 0.2, -0.45, 0.5], [0.55, 0.2, 0.45, 0.5], [0.5, -0.15, -0.5, 0.45], [-0.5, -0.15, 0.5, 0.45]];
function cloudFace(b, y, z) {
  for (const sd of [-1, 1]) b.sphere(sd * 0.3 * CS, y, z, 0.1 * CS, 0x222222, { sy: 1.4 });
  b.box(0, y - 0.24 * CS, z - 0.02, 0.36 * CS, 0.06 * CS, 0.05, 0xff7a9a);
}
// the seat: a wide puffy cloud with a happy face on the front
function cloud() {
  const b = new BrickBuilder(1), W = 0xffffff;
  b.sphere(0, 0.1 * CS, 0, 0.95 * CS, W, { sy: 0.6 });
  for (const [x, y, z, r] of PUFFS) b.sphere(x * CS, y * CS, z * CS, r * CS, W, { sy: 0.8 });
  // a rim of puffs round the seat, so the rider sits in the cloud, not on it
  for (const [x, y, z, r] of [[0, 0.5, 0.72, 0.5], [-0.62, 0.45, 0.5, 0.45], [0.62, 0.45, 0.5, 0.45], [-0.8, 0.45, -0.15, 0.42], [0.8, 0.45, -0.15, 0.42]]) b.sphere(x * CS, y * CS, z * CS, r * CS, W, { sy: 0.75 });
  cloudFace(b, 0.15 * CS, 1.22 * CS);
  return b.build({ name: 'cloud', shadows: false });
}
// the original maps' helper: the cloud itself, tall, with a face and a puff "hand" for the rod
function tallCloud() {
  const b = new BrickBuilder(1), W = 0xffffff;
  b.sphere(0, 0.1 * CS, 0, 0.95 * CS, W, { sy: 0.6 });
  for (const [x, y, z, r] of PUFFS) b.sphere(x * CS, y * CS, z * CS, r * CS, W, { sy: 0.8 });
  b.sphere(0, 0.85 * CS, 0, 0.8 * CS, W, { sy: 0.85 });
  for (const [x, y, z, r] of [[-0.5, 0.75, 0.3, 0.5], [0.5, 0.8, -0.25, 0.5], [0.1, 1.4, 0.05, 0.55], [-0.35, 1.25, -0.3, 0.42], [0.4, 1.3, 0.3, 0.4]]) b.sphere(x * CS, y * CS, z * CS, r * CS, W, { sy: 0.9 });
  b.sphere(1.15 * CS, 1.1 * CS, 0.3 * CS, 0.3 * CS, W);   // the puff holding the rod
  cloudFace(b, 0.95 * CS, 0.78 * CS);
  for (const sd of [-1, 1]) b.sphere(sd * 0.55 * CS, 0.72 * CS, 0.62 * CS, 0.12 * CS, 0xffb3c4, { sy: 0.6 });   // rosy cheeks
  return b.build({ name: 'cloud', shadows: false });
}
