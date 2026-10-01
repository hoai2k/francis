// Developer view for movie-character drivers: ?gallery=<universe | driver id | all>
// lines the drivers up in karts and cycles their gestures. &pose=<gesture> holds one
// gesture (cheer, taunt, ouch, trick, throwF, throwB, use, win, lose, glide, look, steerL,
// steerR, drift, pre), &kart=<n> picks the kart, &cols=<n> sets the row length.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CHARACTERS, buildKart } from './characters.js';
import { DRIVERS, buildDriver, DriverAnim } from './driver.js';
import { baseplateMat } from './lego.js';

const CYCLE = ['steerL', 'steerR', 'cheer', 'taunt', 'trick', 'throwF', 'ouch', 'glide', 'look', 'win', 'lose', 'pre'];

export class Gallery {
  constructor(game, q) {
    const sel = q.get('gallery');
    this.pose = q.get('pose');
    const list = DRIVERS.filter((d) => sel === 'all' || d.from === sel || d.id === sel || sel.split(',').includes(d.id));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fd3ff);
    const pm = new THREE.PMREMGenerator(game.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(6, 12, 9); this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), baseplateMat(0x58ab41, 1.6));
    ground.rotation.x = -Math.PI / 2; this.scene.add(ground);
    const cols = +(q.get('cols') || Math.min(6, Math.ceil(Math.sqrt(list.length * 1.6)) || 1));
    this.items = list.map((d, i) => {
      const rig = buildDriver(d);
      const ch = CHARACTERS[q.get('kart') ? +q.get('kart') : i % CHARACTERS.length];
      const m = buildKart(ch, rig);
      const r = Math.floor(i / cols), c = i % cols;
      m.root.position.set((c - (cols - 1) / 2) * 4.2, 0, -r * 5.5);
      m.root.rotation.y = 0.5;
      this.scene.add(m.root);
      if (m.glider) m.glider.visible = false;
      return { d, m, anim: new DriverAnim(rig), t: i * 0.37 };
    });
    const rows = Math.ceil(list.length / cols);
    const span = Math.max(cols * 4.2, rows * 4.5);
    this.cam = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
    const dist = +(q.get('dist') || span * 1.25 + 4);
    this.cam.position.set(dist * 0.35, dist * 0.42, dist * 0.85);
    this.cam.lookAt(0, 1.3, -(rows - 1) * 2.75);
    this.labels = list.map((d) => d.name);
    this.t = 0;
    window.galleryPose = (p) => { this.pose = p; for (const it of this.items) it.anim.g = null; };
  }
  update(dt) {
    this.t += dt;
    for (const it of this.items) {
      it.t += dt;
      const name = this.pose || CYCLE[Math.floor(it.t / 1.8) % CYCLE.length];
      const s = { steer: 0, drift: 0, speed01: 0.5, grounded: true, gliding: false, boosting: false, look: false, phase: 'race', rank: 1 };
      if (name === 'steerL') s.steer = -1;
      else if (name === 'steerR') s.steer = 1;
      else if (name === 'drift') { s.steer = 1; s.drift = 1; }
      else if (name === 'glide') s.gliding = true;
      else if (name === 'look') s.look = true;
      else if (name === 'win' || name === 'lose' || name === 'pre') s.phase = name;
      else if (!it.anim.g || it.anim.g.name !== name) it.anim.play(name);
      it.m.glider.visible = s.gliding;
      if (s.gliding) it.m.glider.scale.set(1, 1, 1);
      it.anim.update(dt, s);
      if (it.m.swheel) it.m.swheel.rotation.z = -it.anim.steer * 0.9;
    }
  }
  render(r) {
    const W = r.domElement.width / r.getPixelRatio(), H = r.domElement.height / r.getPixelRatio();
    this.cam.aspect = W / H; this.cam.updateProjectionMatrix();
    r.setViewport(0, 0, W, H); r.setScissorTest(false);
    r.render(this.scene, this.cam);
  }
  dispose() {}
}
