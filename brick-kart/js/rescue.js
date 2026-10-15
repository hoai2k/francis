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

// who comes to the rescue on each map's universe (race.movieFrom; the original maps get Captain Cloud)
const HELPERS = {
  starwars: { name: 'Grogu', load: () => import('./maps/starwars-props.js').then((m) => m.grogu(1)), pram: true },
  jjk: { name: 'Kogane', load: () => import('./maps/jjk-culling-props.js').then((m) => m.kogane(1)) },
  potter: { name: 'Dobby', driver: 'dobby' },
  marvel: { name: 'Rocket', driver: 'rocket' },
  jurassic: { name: 'Pteranodon', driver: 'pteranodon' },
  minecraft: { name: 'Pig', driver: 'pig' },
  pokemon: { name: 'Pikachu', driver: 'pikachu' },
  sonic: { name: 'Tails', driver: 'tails' },
  classic: { name: 'Captain Cloud', load: () => Promise.resolve(captainCloud()) },
};

// when to come (seconds / metres of track)
const STALL_TIME = 6, STALL_GAIN = 10;          // trying to drive for 6 s without gaining 10 m
const BACK_DIST = 30, BACK_TIME = 1;            // 30 m behind the furthest point reached
const WRONG_TIME = 3, WRONG_DIST = 12;          // "WRONG WAY!" for 3 s, and lost ground doing it
// how it looks
// (the helper hangs off to one side of the kart and above it, where the chase camera can see it,
// with the rod reaching across so its tip is right over the kart)
const CHAR_H = 2.3, HOVER = 7, DROP = 14;   // HOVER: the rod tip over the kart
const HAND = new THREE.Vector3(0.55, 1.0, 0.35), TIP = new THREE.Vector3(2.4, 3.2, 0.9);   // in the helper's frame (it faces back along the kart, towards the camera)

export class Rescue {
  constructor(race) {
    this.race = race;
    this.vis = new Map();      // kart -> its helper { g, line, hook, prop, state, t, drop }
    this.template = null;
    const def = HELPERS[race.movieFrom] || HELPERS.classic;
    this.def = def;
    const d = def.driver && DRIVERS.find((x) => x.id === def.driver);
    const load = def.load ? def.load() : d ? Promise.resolve(buildDriver(d).root) : Promise.resolve(captainCloud());
    load.then((char) => { this.template = helperModel(char, def); })
      .catch((e) => { console.error('rescue helper', e); this.template = helperModel(captainCloud(), HELPERS.classic); });
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
    const g = v.g;
    if (on) {
      if (v.state !== 'on') {
        v.state = 'on'; v.t = 0; v.drop = DROP;
        g.visible = true;
        this.race.audio.sfx('rescue', k.pos);
      }
      v.t += dt;
      v.drop = Math.max(0, v.drop - dt * DROP * 2.2);
      // face back along the kart (towards its camera), the rod tip right over it
      const yaw = k.yaw + Math.PI, s = Math.sin(yaw), c = Math.cos(yaw);
      g.rotation.set(0, yaw, Math.sin(v.t * 2.3) * 0.06);
      g.position.set(k.pos.x - (TIP.x * c + TIP.z * s), k.pos.y + HOVER - TIP.y + v.drop + Math.sin(v.t * 3) * 0.12, k.pos.z - (-TIP.x * s + TIP.z * c));
      g.updateMatrixWorld(true);
      const tip = g.localToWorld(v.tipL.copy(TIP));
      const hy = k.pos.y + 1.7;
      const a = v.line.geometry.attributes.position;
      a.setXYZ(0, tip.x, tip.y, tip.z); a.setXYZ(1, k.pos.x, hy, k.pos.z); a.needsUpdate = true;
      v.line.geometry.computeBoundingSphere();
      v.line.visible = v.hook.visible = v.drop < 4;
      v.hook.position.set(k.pos.x, hy, k.pos.z);
    } else if (v.state === 'on') { v.state = 'out'; v.t = 0; v.line.visible = v.hook.visible = false; }
    else if (v.state === 'out') {
      // off it goes, up and away
      v.t += dt;
      g.position.y += dt * (3 + v.t * 14);
      g.rotation.y += dt * 1.5;
      if (v.t > 1.6) { v.state = 'off'; g.visible = false; }
    }
    if (v.prop && g.visible) v.prop.rotation.y += dt * 18;
  }

  make() {
    const race = this.race, g = this.template.clone(true);
    g.visible = false;
    race.scene.add(g);
    const pram = this.def.pram;   // Grogu needs no rod: the Force does it
    const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(6, 3)),
      new THREE.LineBasicMaterial(pram ? { color: 0x9ad8ff, transparent: true, opacity: 0.8 } : { color: 0x222222 }));
    line.frustumCulled = false; line.visible = false;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 6, 12, Math.PI * 1.5), pram ? new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.6 }) : plastic(0x9aa0a8));
    hook.visible = false;
    race.scene.add(line, hook);
    return { g, line, hook, prop: g.getObjectByName('propeller'), state: 'off', t: 0, drop: 0, tipL: new THREE.Vector3() };
  }
}

// the character, scaled to size, sitting in its cloud, holding a fishing rod
function helperModel(char, def) {
  const root = new THREE.Group();
  root.name = 'rescue-helper';
  const box = new THREE.Box3().setFromObject(char), size = box.getSize(new THREE.Vector3());
  const sc = CHAR_H / Math.max(0.01, size.y);
  const holder = new THREE.Group();
  holder.add(char);
  char.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  holder.scale.setScalar(sc);
  root.add(holder);
  if (def.pram) {
    // Grogu floats in his own hover-pram
    holder.position.y = 0.4;
    return root;
  }
  // sunk into the cloud to about the waist
  holder.position.y = -0.15;
  root.add(cloud());
  // the fishing rod, from the hand up and out to the tip
  const dir = TIP.clone().sub(HAND), len = dir.length();
  const rod = new THREE.Group();
  rod.name = 'rod';
  rod.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, len, 6).translate(0, len / 2, 0), plastic(0x6b4a2a)));
  rod.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 8).rotateX(Math.PI / 2).translate(0, 0.35, 0.08), plastic(0x333333)));   // the reel
  rod.position.copy(HAND);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  root.add(rod);
  return root;
}

function cloud() {
  const b = new BrickBuilder(1), W = 0xffffff;
  b.sphere(0, 0.1, 0, 0.95, W, { sy: 0.6 });
  for (const [x, y, z, r] of [[-0.85, 0, 0.05, 0.62], [0.85, 0, -0.05, 0.62], [0, 0.05, 0.7, 0.58], [0, 0.05, -0.7, 0.58], [-0.55, 0.2, -0.45, 0.5], [0.55, 0.2, 0.45, 0.5], [0.5, -0.15, -0.5, 0.45], [-0.5, -0.15, 0.5, 0.45]]) b.sphere(x, y, z, r, W, { sy: 0.8 });
  // a happy face on the front
  for (const sd of [-1, 1]) b.sphere(sd * 0.25, 0.1, 1.2, 0.08, 0x222222, { sy: 1.4 });
  b.box(0, -0.12, 1.18, 0.3, 0.05, 0.04, 0xff7a9a);
  return b.build({ name: 'cloud', shadows: false });
}

// Captain Cloud: a brick pilot in goggles and a propeller cap, for the original maps
function captainCloud() {
  const root = new THREE.Group();
  const b = new BrickBuilder(1), Y = 0xf6cf2a, J = 0x2a6fd6, R = 0xd62d2d, K = 0x111111;
  b.box(0, 0, 0, 0.9, 0.78, 0.5, J);                                     // torso (flight jacket)
  b.box(0, 0.55, 0.255, 0.22, 0.2, 0.02, 0xffffff);                       // scarf
  for (const sd of [-1, 1]) {
    b.box(sd * 0.56, 0.18, 0.05, 0.22, 0.56, 0.24, J);                     // arms
    b.sphere(sd * 0.56, 0.14, 0.1, 0.12, Y);                               // hands
  }
  b.cyl(0, 0.78, 0, 0.12, 0.08, Y);                                      // neck
  b.cyl(0, 0.84, 0, 0.32, 0.48, Y);                                      // head
  for (const sd of [-1, 1]) b.sphere(sd * 0.11, 1.0, 0.3, 0.045, K);    // eyes
  b.box(0, 0.92, 0.31, 0.14, 0.03, 0.02, K);                              // smile
  b.cyl(0, 1.12, 0, 0.335, 0.09, 0x6b4a2a);                               // goggle strap
  for (const sd of [-1, 1]) b.sphere(sd * 0.13, 1.17, 0.31, 0.085, 0x8fd8ff);   // goggles
  b.sphere(0, 1.3, 0, 0.34, R, { sy: 0.55 });                            // cap
  b.box(0, 1.27, 0.32, 0.4, 0.04, 0.2, R);                                // peak
  b.cyl(0, 1.44, 0, 0.03, 0.14, 0x333333);                               // propeller stalk
  root.add(b.build({ name: 'captain-cloud' }));
  const p = new BrickBuilder(1);
  p.box(0, 0, 0, 0.9, 0.03, 0.12, 0xffd21a);
  p.box(0, 0, 0, 0.12, 0.03, 0.9, 0x2a6fd6);
  const prop = p.build({ name: 'propeller', shadows: false });
  prop.position.y = 1.57;
  root.add(prop);
  return root;
}
