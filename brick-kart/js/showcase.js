// Small 3D stages for the menus when "Use Characters" is on: the live kart + driver
// preview on the select screen, the podium, and cached portrait images of drivers
// and empty karts.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildKart } from './characters.js';
import { buildDriver, DriverAnim } from './driver.js';

function stage(renderer) {
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.3));
  const d = new THREE.DirectionalLight(0xffffff, 2.3); d.position.set(3, 6, 5); scene.add(d);
  const rim = new THREE.DirectionalLight(0x9fd0ff, 1.2); rim.position.set(-4, 3, -5); scene.add(rim);
  return scene;
}
function newRenderer(w, h, canvas = undefined) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, canvas });
  r.setPixelRatio(1); r.setSize(w, h, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  r.setClearColor(0x000000, 0);
  return r;
}
// a kart with nobody in it (for kart thumbnails)
function emptyRig() {
  return { root: new THREE.Group(), height: 1.8, width: 1.2, shoulder: new THREE.Vector3(0.56, 1.2, 0), armLen: 0.86, def: {} };
}

// ---- cached portraits ----------------------------------------------------------------------
let PR = null, PS = null;
const cache = new Map();
function portraitRig() {
  if (!PR) { PR = newRenderer(192, 192); PS = stage(PR); }
  return { r: PR, scene: PS };
}
export function driverPortrait(def) {
  if (cache.has('d' + def.id)) return cache.get('d' + def.id);
  const { r, scene } = portraitRig();
  let url = '';
  try {
    const rig = buildDriver(def);
    const anim = new DriverAnim(rig);
    anim.update(0.016, { steer: 0, phase: 'race', grounded: true, speed01: 0 });
    rig.armL && (rig.armL.rotation.x = -0.35); rig.armR && (rig.armR.rotation.x = -0.35);
    rig.root.rotation.y = 0.45;
    scene.add(rig.root);
    const h = rig.height;
    const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
    const look = new THREE.Vector3(0, h * 0.62, 0);
    const dist = Math.max(2.6, h * 1.55);
    cam.position.set(dist * 0.18, look.y + h * 0.12, dist);
    cam.lookAt(look);
    r.render(scene, cam);
    url = r.domElement.toDataURL('image/png');
    scene.remove(rig.root);
  } catch (e) { console.error('portrait failed for', def.id, e); }
  cache.set('d' + def.id, url);
  return url;
}
export function kartPortrait(ch) {
  if (cache.has('k' + ch.id)) return cache.get('k' + ch.id);
  const { r, scene } = portraitRig();
  const k = buildKart(ch, emptyRig());
  k.root.rotation.y = 0.6;
  scene.add(k.root);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(4.6, 3.4, 6.4); cam.lookAt(0, 0.7, 0.1);
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');
  scene.remove(k.root);
  cache.set('k' + ch.id, url);
  return url;
}

// ---- live stage ------------------------------------------------------------------------------
// items: [{ ch, driver, x, z, ry, phase }]
export class Showcase {
  constructor(canvas, { cam = [5.2, 3.2, 7.2], look = [0, 1.15, 0], fov = 30, spin = 0.35 } = {}) {
    this.canvas = canvas;
    this.r = newRenderer(canvas.clientWidth || 400, canvas.clientHeight || 300, canvas);
    this.scene = stage(this.r);
    this.cam = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    this.camBase = new THREE.Vector3(...cam); this.lookAt = new THREE.Vector3(...look);
    this.cam.position.copy(this.camBase); this.cam.lookAt(this.lookAt);
    this.spin = spin;
    this.items = [];
    this.t = 0;
    // a round turntable plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.3, 0.3, 40), new THREE.MeshStandardMaterial({ color: 0x2a3a52, roughness: 0.5, metalness: 0.2 }));
    plate.position.y = -0.15;
    this.plate = plate;
  }
  set(items, { plate = true } = {}) {
    for (const it of this.items) this.scene.remove(it.m.root);
    if (plate && !this.plate.parent) this.scene.add(this.plate);
    if (!plate && this.plate.parent) this.scene.remove(this.plate);
    this.items = items.map((o) => {
      const rig = o.driver ? buildDriver(o.driver) : null;
      const m = buildKart(o.ch, rig || emptyRig());
      m.root.position.set(o.x || 0, o.y || 0, o.z || 0);
      m.root.rotation.y = o.ry ?? 0.6;
      this.scene.add(m.root);
      return { ...o, m, anim: rig ? new DriverAnim(rig) : null, nextIdle: 2 + Math.random() * 2 };
    });
    // a single kart on the stage: frame it by its real size (big vehicles pull the camera back)
    this.fit = 1; this.fitY = null;
    if (this.items.length === 1) {
      // measure visible parts only (the folded glider and hidden effects don't count)
      const root = this.items[0].m.root, box = new THREE.Box3(), tmp = new THREE.Box3();
      root.updateMatrixWorld(true);
      root.traverseVisible((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox?.(); tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp); } });
      const sph = box.getBoundingSphere(new THREE.Sphere());
      this.fit = Math.max(0.9, Math.min(1.7, sph.radius / 3.3));
      this.fitY = Math.max(0.9, Math.min(2.2, sph.center.y));
    }
  }
  play(i, name) { const it = this.items[i]; return it?.anim?.play(name); }
  setPhase(i, phase) { const it = this.items[i]; if (it) it.phase = phase; }
  update(dt) {
    this.t += dt;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (this.canvas.width !== w || this.canvas.height !== h) this.r.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    // narrow (portrait) stages pull the camera back so the whole kart fits
    const back = Math.max(1, 1.15 / this.cam.aspect) * (this.fit || 1);
    const look = this._look ||= new THREE.Vector3();
    // single kart: aim a little below its middle so it sits above the name/stats overlay
    look.copy(this.lookAt); if (this.fitY !== null && this.fitY !== undefined) look.y = this.fitY - 0.85 * this.fit;
    this._d ||= new THREE.Vector3();
    this._d.copy(this.camBase).sub(this.lookAt);
    this.cam.position.copy(look).addScaledVector(this._d, back);
    this.cam.lookAt(look);
    for (const it of this.items) {
      if (this.spin) it.m.root.rotation.y += dt * this.spin;
      if (!it.anim) continue;
      // idle personality: now and then show off a gesture
      it.nextIdle -= dt;
      if (it.idle !== false && it.nextIdle <= 0 && it.phase === 'pre') {
        it.nextIdle = 3 + Math.random() * 3;
        it.anim.play(['taunt', 'trick', 'yay', 'cheer'][Math.floor(Math.random() * 4)]);
      }
      it.anim.update(dt, { steer: Math.sin(this.t * 0.9) * (it.phase === 'pre' ? 0.5 : 0), drift: 0, speed01: 0.3, grounded: true, gliding: false, boosting: false, look: false, phase: it.phase || 'pre', rank: 1 });
      it.m.steerControl?.(it.anim.steer);
      it.m.update?.(dt, { speed01: 0.35, steer: it.anim.steer, boosting: false, gliding: false, grounded: true });
    }
    this.r.render(this.scene, this.cam);
  }
  dispose() {
    for (const it of this.items) this.scene.remove(it.m.root);
    this.items = [];
    this.r.dispose(); this.r.forceContextLoss?.();
  }
}
