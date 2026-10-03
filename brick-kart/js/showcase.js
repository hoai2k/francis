// Small 3D stages for the menus: the live kart + driver
// preview on the select screen, the podium, and cached portrait images of drivers
// and empty karts.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildKart } from './characters.js';
import { buildDriver, DriverAnim } from './driver.js';
import { plastic } from './lego.js';

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

// A driver on their own feet (the select screen's driver step on phones). Rigs are built seated, so
// a minifig's seated hips and thighs are clipped away (cloned materials, so karts elsewhere keep
// theirs) and standing legs are added in its leg colour. Creatures that aren't minifigs (dinosaurs,
// droids…) sit on a brick pedestal instead.
function standDriver(rig) {
  const root = new THREE.Group(), mats = [];
  const d = rig.dims;
  if (d) {
    const s = d.s, W = d.W ?? 1, L = 0.86 * s, cutY = L + 0.06 * s;
    // leg colour: the figure's own (or, failing that, whatever its lowest part is made of)
    let low = null, lowY = Infinity;
    const box = new THREE.Box3();
    rig.root.updateMatrixWorld(true);
    rig.root.traverse((o) => { if (o.isMesh && !Array.isArray(o.material)) { box.setFromObject(o); if (box.min.y < lowY) { lowY = box.min.y; low = o.material; } } });
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -cutY);
    rig.root.traverse((o) => {
      if (!o.isMesh) return;
      const clip = (m) => { const c = m.clone(); c.clippingPlanes = [plane]; mats.push(c); return c; };
      o.material = Array.isArray(o.material) ? o.material.map(clip) : clip(o.material);
    });
    const legM = d.legColor !== undefined ? plastic(d.legColor) : low || plastic(0x0055bf);
    const add = (w, h, dd, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), legM); m.position.set(x, y, z); root.add(m); };
    add(0.9 * s * W, 0.2 * s, 0.46 * s, 0, cutY - 0.08 * s, 0);                       // hips
    for (const sd of [-1, 1]) {
      add(0.4 * s * W, cutY - 0.32 * s, 0.42 * s, sd * 0.22 * s * W, (cutY - 0.04 * s) / 2, 0);        // legs, feet to hips
      add(0.42 * s * W, 0.14 * s, 0.6 * s, sd * 0.22 * s * W, 0.07 * s, 0.07 * s);    // feet
    }
    rig.root.position.y = L;
  } else {
    // a stack of bricks to sit on
    const w = Math.max(1, rig.width || 1.2);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, 0.7, w * 0.9), new THREE.MeshStandardMaterial({ color: 0xc91a09, roughness: 0.34 }));
    ped.position.y = 0.35; root.add(ped); mats.push(ped.material);
    rig.root.position.y = 0.85;
  }
  root.add(rig.root);
  return { root, mats, standing: true };
}

// ---- live stage ------------------------------------------------------------------------------
// items: [{ ch, driver, x, z, ry, phase }]
// With a `cells` option (a function returning one { x, y, w, h } rect per item, in canvas CSS pixels)
// every item gets its own turntable and is drawn into its own rect of the one canvas: the per-player
// previews on the select screen share a single WebGL context however many players there are.
const CELL_GAP = 400;   // items in cell mode stand this far apart (well past the camera's far plane)
export class Showcase {
  constructor(canvas, { cam = [5.2, 3.2, 7.2], look = [0, 1.15, 0], fov = 30, spin = 0.35, cells = null } = {}) {
    this.canvas = canvas;
    this.r = newRenderer(canvas.clientWidth || 400, canvas.clientHeight || 300, canvas);
    this.r.localClippingEnabled = true;   // standing drivers clip their seated legs away
    this.scene = stage(this.r);
    this.cam = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    this.camBase = new THREE.Vector3(...cam); this.lookAt = new THREE.Vector3(...look);
    this.cam.position.copy(this.camBase); this.cam.lookAt(this.lookAt);
    this.spin = spin;
    this.cells = cells;
    this.items = [];
    this.t = 0;
    // a round turntable plate
    this.plateGeo = new THREE.CylinderGeometry(3.1, 3.3, 0.3, 40);
    this.plateMat = new THREE.MeshStandardMaterial({ color: 0x2a3a52, roughness: 0.5, metalness: 0.2 });
    this.plate = this.newPlate();
  }
  newPlate() { const p = new THREE.Mesh(this.plateGeo, this.plateMat); p.position.y = -0.15; return p; }
  build(o, i) {
    const rig = o.driver ? buildDriver(o.driver) : null;
    // o.stand: the driver alone on their feet, no kart
    const m = o.stand && rig ? standDriver(rig) : buildKart(o.ch, rig || emptyRig());
    const ox = this.cells ? i * CELL_GAP : 0;
    m.root.position.set((o.x || 0) + ox, o.y || 0, o.z || 0);
    m.root.rotation.y = o.ry ?? 0.6;
    this.scene.add(m.root);
    const it = { ...o, m, ox, anim: rig ? new DriverAnim(rig) : null, nextIdle: 2 + Math.random() * 2 };
    if (this.cells) { it.plate = this.newPlate(); it.plate.position.x = ox; this.scene.add(it.plate); }
    this.measure(it);
    return it;
  }
  drop(it) {
    this.scene.remove(it.m.root);
    if (it.plate) this.scene.remove(it.plate);
    for (const m of it.m.mats || []) m.dispose();
  }
  // frame a lone kart by its real size (big vehicles pull the camera back)
  measure(it) {
    // measure visible parts only (the folded glider and hidden effects don't count)
    const root = it.m.root, box = new THREE.Box3(), tmp = new THREE.Box3();
    root.updateMatrixWorld(true);
    root.traverseVisible((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox?.(); tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp); } });
    const sph = box.getBoundingSphere(new THREE.Sphere());
    it.fit = Math.max(0.9, Math.min(1.7, sph.radius / 3.3));
    it.fitY = Math.max(0.9, Math.min(2.2, sph.center.y));
  }
  set(items, { plate = true } = {}) {
    for (const it of this.items) this.drop(it);
    const single = plate && !this.cells;
    if (single && !this.plate.parent) this.scene.add(this.plate);
    if (!single && this.plate.parent) this.scene.remove(this.plate);
    this.items = items.map((o, i) => this.build(o, i));
    // a single kart on the stage is framed by its size
    this.fit = 1; this.fitY = null;
    if (this.items.length === 1 && !this.cells) { this.fit = this.items[0].fit; this.fitY = this.items[0].fitY; }
  }
  // cell mode: replace (or add) the item in slot i, keeping the others
  setItem(i, o) {
    if (this.items[i]) this.drop(this.items[i]);
    this.items[i] = this.build(o, i);
  }
  trim(n) { while (this.items.length > n) this.drop(this.items.pop()); }
  play(i, name) { const it = this.items[i]; return it?.anim?.play(name); }
  setPhase(i, phase) { const it = this.items[i]; if (it) it.phase = phase; }
  animate(dt) {
    for (const it of this.items) {
      if (this.spin) it.m.root.rotation.y += dt * this.spin;
      if (!it.anim) continue;
      // idle personality: now and then show off a gesture
      it.nextIdle -= dt;
      if (it.idle !== false && it.nextIdle <= 0 && it.phase === 'pre') {
        it.nextIdle = 3 + Math.random() * 3;
        it.anim.play(['taunt', 'trick', 'yay', 'cheer'][Math.floor(Math.random() * 4)]);
      }
      it.anim.update(dt, { steer: it.m.standing ? 0 : Math.sin(this.t * 0.9) * (it.phase === 'pre' ? 0.5 : 0), stand: !!it.m.standing, drift: 0, speed01: it.m.standing ? 0 : 0.3, grounded: true, gliding: false, boosting: false, look: false, phase: it.phase || 'pre', rank: 1 });
      it.m.steerControl?.(it.anim.steer);
      it.m.update?.(dt, { speed01: 0.35, steer: it.anim.steer, boosting: false, gliding: false, grounded: true });
    }
  }
  // aim the camera at a point for a view of the given aspect; fit/fitY frame a single kart
  frame(aspect, ox, fit, fitY) {
    this.cam.aspect = aspect; this.cam.updateProjectionMatrix();
    // narrow (portrait) stages pull the camera back so the whole kart fits
    const back = Math.max(1, 1.15 / aspect) * (fit || 1);
    const look = this._look ||= new THREE.Vector3();
    // single kart: aim a little below its middle so it sits above the name/stats overlay
    look.copy(this.lookAt); look.x += ox;
    if (fitY !== null && fitY !== undefined) look.y = fitY - 0.85 * fit;
    this._d ||= new THREE.Vector3();
    this._d.copy(this.camBase).sub(this.lookAt);
    this.cam.position.copy(look).addScaledVector(this._d, back);
    this.cam.lookAt(look);
  }
  update(dt) {
    this.t += dt;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (this.canvas.width !== w || this.canvas.height !== h) this.r.setSize(w, h, false);
    this.animate(dt);
    if (!this.cells) {
      this.frame(w / h, 0, this.fit, this.fitY);
      this.r.render(this.scene, this.cam);
      return;
    }
    const rects = this.cells() || [];
    this.r.setScissorTest(false);
    this.r.clear();
    this.r.setScissorTest(true);
    this.items.forEach((it, i) => {
      const c = rects[i];
      if (!c || c.w < 4 || c.h < 4) return;
      const y = h - c.y - c.h;   // WebGL viewports count from the bottom
      this.r.setViewport(c.x, y, c.w, c.h);
      this.r.setScissor(c.x, y, c.w, c.h);
      this.frame(c.w / c.h, it.ox, it.fit, it.fitY);
      this.r.render(this.scene, this.cam);
    });
    this.r.setScissorTest(false);
    this.r.setViewport(0, 0, w, h);
  }
  dispose() {
    for (const it of this.items) this.drop(it);
    this.items = [];
    this.plateGeo.dispose(); this.plateMat.dispose();
    this.r.dispose(); this.r.forceContextLoss?.();
  }
}
