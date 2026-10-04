// Small 3D stages for the menus: the live kart + driver
// preview on the select screen, the podium, and cached portrait images of drivers
// and empty karts.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildKart } from './characters.js';
import { buildGlider } from './gliders.js';
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

// a glider on its own, open, seen from the front and a little above
export function gliderPortrait(def) {
  if (cache.has('g' + def.id)) return cache.get('g' + def.id);
  const { r, scene } = portraitRig();
  let url = '';
  try {
    const g = new THREE.Group();
    buildGlider(def, g, def.colors?.[0], def.colors?.[1]);
    g.rotation.y = 0.5;
    scene.add(g);
    g.updateMatrixWorld(true);
    const sph = new THREE.Box3().setFromObject(g).getBoundingSphere(new THREE.Sphere());
    const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
    // gliders are wide and flat: frame them tighter than their bounding sphere, from a little above
    const d = sph.radius / Math.sin(15 * Math.PI / 180) * 0.68;
    cam.position.set(sph.center.x + d * 0.3, sph.center.y + d * 0.55, sph.center.z + d * 0.78);
    cam.lookAt(sph.center);
    r.render(scene, cam);
    url = r.domElement.toDataURL('image/png');
    scene.remove(g);
  } catch (e) { console.error('portrait failed for glider', def.id, e); }
  cache.set('g' + def.id, url);
  return url;
}

// Delete the triangles of a mesh that lie entirely below y = cut, measured in `frame`'s space
// (works on a copy of the geometry; keeps material groups).
function trimBelow(mesh, frame, cut) {
  const toFrame = new THREE.Matrix4().copy(frame.matrixWorld).invert().multiply(mesh.matrixWorld);
  const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const pos = src.attributes.position, tris = pos.count / 3, keep = [], v = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    let top = -Infinity;
    for (let k = 0; k < 3; k++) top = Math.max(top, v.fromBufferAttribute(pos, t * 3 + k).applyMatrix4(toFrame).y);
    if (top > cut) keep.push(t);
  }
  if (keep.length === tris) return;
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(src.attributes)) {
    const n = attr.itemSize, arr = new attr.array.constructor(keep.length * 3 * n);
    keep.forEach((t, j) => arr.set(attr.array.subarray(t * 3 * n, t * 3 * n + 3 * n), j * 3 * n));
    out.setAttribute(name, new THREE.BufferAttribute(arr, n, attr.normalized));
  }
  // material groups: re-count the kept triangles of each one
  for (const g of src.groups) {
    const first = keep.findIndex((t) => t * 3 >= g.start), from = first < 0 ? keep.length : first;
    let n = 0; while (from + n < keep.length && keep[from + n] * 3 < g.start + g.count) n++;
    if (n) out.addGroup(from * 3, n * 3, g.materialIndex);
  }
  mesh.geometry = out;
}

// A driver on their own feet (the select screen's driver step). Rigs are built seated: a minifig's
// hips and thighs are part of its torso model, sticking forward. Those triangles are deleted from
// the torso (so nothing can poke out however the torso leans in a gesture) and standing hips, legs
// and feet are added in its leg colour. Creatures that aren't minifigs (dinosaurs, droids…) sit on
// a brick pedestal instead.
function standDriver(rig) {
  const root = new THREE.Group(), mats = [];
  const d = rig.dims;
  if (d) {
    const s = d.s, W = d.W ?? 1, L = 0.86 * s, chest = d.chestY ?? 0.18 * s, cutY = L + chest;
    rig.root.updateMatrixWorld(true);
    // the torso's own parts (not the head or arms, which hang below the waist)
    const skip = new Set([rig.head, rig.armL, rig.armR].filter(Boolean));
    const torsoMeshes = [];
    rig.torso.traverse((o) => { if (!o.isMesh) return; for (let p = o; p && p !== rig.torso; p = p.parent) if (skip.has(p)) return; torsoMeshes.push(o); });
    for (const m of torsoMeshes) trimBelow(m, rig.torso, chest + 0.002 * s);
    const legM = plastic(d.legColor ?? 0x0055bf);
    const add = (w, h, dd, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), legM); m.position.set(x, y, z); root.add(m); };
    add(0.9 * s * W, 0.16 * s, 0.46 * s * (d.D ?? 1), 0, cutY - 0.08 * s, 0);          // hips, up to the torso
    for (const sd of [-1, 1]) {
      add(0.4 * s * W, cutY - 0.3 * s, 0.42 * s, sd * 0.22 * s * W, (cutY - 0.02 * s) / 2, 0);         // legs, feet to hips
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
  return { root, mats, rig, standing: true };
}

// Standing drivers introduce themselves: they breathe, shift their weight and look around, and every
// few seconds show off with a move. 'commit' is the jump-spin when a player locks them in.
// Arm rotations follow the rig contract: x < 0 swings an arm forward/up (-PI straight up), z moves
// it out sideways (+ for armL on +X, - for armR).
const smooth = (x) => x * x * (3 - 2 * x);
const STAND_MOVES = { wave: 1.7, hop: 0.95, spin: 1.05, cheer: 1.5, dance: 2.2, point: 1.3, sig: 0 };
function standPose(it, n, t, dt, face) {
  const m = it.m, rig = m.rig, st = it.standSt ||= { next: 0.8 + Math.random() * 1.2, mv: null, last: '' };
  let ry = face + Math.sin(t * 0.6 + n) * 0.1, rz = Math.sin(t * 1.3 + n) * 0.025, y = 0, arms = null;
  if (!st.mv && it.phase !== 'win') {
    st.next -= dt;
    if (st.next <= 0) {
      const names = Object.keys(STAND_MOVES).filter((k) => k !== st.last);
      const name = names[Math.floor(Math.random() * names.length)];
      st.last = name;
      if (name === 'sig') { it.anim?.play(['cheer', 'taunt', 'yay'][Math.floor(Math.random() * 3)]); st.next = 3 + Math.random() * 2; }
      else st.mv = { name, t: 0, dur: STAND_MOVES[name] };
    }
  }
  if (st.mv) {
    const mv = st.mv;
    mv.t += dt;
    const f = Math.min(1, mv.t / mv.dur), w = smooth(Math.min(1, f / 0.15, (1 - f) / 0.2)), tt = mv.t;
    switch (mv.name) {
      case 'wave': arms = { lx: -0.15, lz: 0.25, rx: -2.75, rz: -0.25 + Math.sin(tt * 14) * 0.45 }; ry += Math.sin(tt * 3) * 0.08; break;
      case 'point': arms = { rx: -1.55, rz: 0.12, lx: -0.1, lz: 0.5 }; rz += Math.sin(tt * 9) * 0.03; break;
      case 'hop': y = Math.abs(Math.sin(f * Math.PI * 2)) * 0.45; arms = { lx: -2.5, lz: 0.55, rx: -2.5, rz: -0.55 }; break;
      case 'spin': ry += smooth(f) * Math.PI * 2; arms = { lx: -0.25, lz: 1.35, rx: -0.25, rz: -1.35 }; y = Math.sin(f * Math.PI) * 0.12; break;
      case 'cheer': y = Math.max(0, Math.sin(f * Math.PI * 3)) * 0.18; arms = { lx: -2.85, lz: 0.35 + Math.sin(tt * 10) * 0.18, rx: -2.85, rz: -0.35 - Math.sin(tt * 10) * 0.18 }; break;
      case 'dance': {
        const b = Math.sin(tt * 8);
        rz += b * 0.12 * w; ry += Math.sin(tt * 4) * 0.4 * w; y = Math.abs(b) * 0.09 * w;
        arms = { lx: -1.3 - b * 0.9, lz: 0.45, rx: -1.3 + b * 0.9, rz: -0.45 };
        break;
      }
      case 'commit': y = Math.sin(f * Math.PI) * 0.75; ry += smooth(f) * Math.PI * 2; arms = { lx: -2.85, lz: 0.45, rx: -2.85, rz: -0.45 }; break;
    }
    if (arms) {
      const aw = mv.name === 'commit' ? Math.min(1, f / 0.1) : w;
      const blend = (o, x, z) => { if (o && x !== undefined) { o.rotation.x += (x - o.rotation.x) * aw; o.rotation.z += (z - o.rotation.z) * aw; } };
      blend(rig?.armL, arms.lx, arms.lz); blend(rig?.armR, arms.rx, arms.rz);
    }
    if (f >= 1) { st.mv = null; st.next = 1.8 + Math.random() * 2.2; }
  }
  m.root.rotation.set(0, ry, rz);
  m.root.position.y = (it.y || 0) + y;
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
    const m = o.stand && rig ? standDriver(rig) : buildKart(o.ch, rig || emptyRig(), o.glider || null);
    const ox = this.cells ? i * CELL_GAP : 0;
    m.root.position.set((o.x || 0) + ox, o.y || 0, o.z || 0);
    m.root.rotation.y = o.ry ?? 0.6;
    this.scene.add(m.root);
    const it = { ...o, m, ox, anim: rig ? new DriverAnim(rig) : null, nextIdle: 2 + Math.random() * 2 };
    if (this.cells) { it.plate = this.newPlate(); it.plate.position.x = ox; this.scene.add(it.plate); }
    it.glide = false;
    if (o.glide) this.setGlide(i, true, it); else this.measure(it);
    return it;
  }
  drop(it) {
    this.scene.remove(it.m.root);
    if (it.plate) this.scene.remove(it.plate);
    for (const m of it.m.mats || []) m.dispose();
  }
  // swap the glider on the kart in slot i (keeps the driver and kart as they are)
  setGlider(i, def) {
    const it = this.items[i], g = it?.m.glider;
    if (!g || it.m.standing) return;
    buildGlider(def, g, it.ch.kart, it.ch.accent);
    it.glider = def; it.gfxS = null;
    this.measure(it);
  }
  // show the kart flying under its open glider (the camera pulls back to fit the wing in)
  setGlide(i, on, it = this.items[i]) {
    if (!it || it.m.standing || !it.m.glider) return;
    it.glide = on;
    it.gfxS = null;   // fx clock starts again
    it.m.glider.visible = on;
    it.m.glider.scale.set(1, 1, 1); it.m.glider.rotation.z = 0;
    if (!on) it.m.root.position.y = it.y || 0;
    this.measure(it);
  }
  // slide the view in cell i up (dir 1) or down (dir -1) out of its cell, call mid() (swap what's
  // shown) and slide the new view in from the other side
  slide(i, dir, mid) {
    const it = this.items[i];
    if (!it) { mid(); return; }
    if (it.slideFx?.mid) it.slideFx.mid();
    it.slideFx = { t: 0, dir, mid };
  }
  // frame a lone kart by its real size (big vehicles pull the camera back)
  measure(it) {
    // measure visible parts only (the folded glider and hidden effects don't count)
    const root = it.m.root, box = new THREE.Box3(), tmp = new THREE.Box3();
    root.updateMatrixWorld(true);
    root.traverseVisible((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox?.(); tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp); } });
    const sph = box.getBoundingSphere(new THREE.Sphere());
    // the open glider view stands further back so the whole wing shows
    if (it.glide) {
      // aim higher too: the frame normally sits the kart above the name overlay
      it.fit = Math.max(1.35, Math.min(2.4, sph.radius / 3.3 * 1.4));
      it.fitY = Math.min(4.9, sph.center.y + 0.7 + 0.45 * it.fit);   // +0.7: it floats above the plate
    } else {
      it.fit = Math.max(0.9, Math.min(1.7, sph.radius / 3.3));
      it.fitY = Math.max(0.9, Math.min(2.2, sph.center.y));
    }
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
  // a standing driver's move right now (e.g. 'commit' when locked in)
  standMove(i, name, dur = 0.95) { const it = this.items[i]; if (it?.m.standing) { it.standSt ||= { next: 2, last: '' }; it.standSt.mv = { name, t: 0, dur }; } }
  setPhase(i, phase) { const it = this.items[i]; if (it) it.phase = phase; }
  animate(dt) {
    const face = Math.atan2(this.camBase.x - this.lookAt.x, this.camBase.z - this.lookAt.z);
    this.items.forEach((it, n) => {
      // standing drivers face the camera and show off (standPose); karts turn on the turntable
      if (!it.m.standing && this.spin) it.m.root.rotation.y += dt * this.spin;
      if (!it.anim) { if (it.m.standing) standPose(it, n, this.t, dt, face); return; }
      // idle personality: now and then show off a gesture
      it.nextIdle -= dt;
      if (it.idle !== false && it.nextIdle <= 0 && it.phase === 'pre' && !it.m.standing) {
        it.nextIdle = 3 + Math.random() * 3;
        it.anim.play(['taunt', 'trick', 'yay', 'cheer'][Math.floor(Math.random() * 4)]);
      }
      const glide = !!it.glide;
      it.anim.update(dt, { steer: it.m.standing ? 0 : Math.sin(this.t * 0.9) * (it.phase === 'pre' ? 0.5 : 0), stand: !!it.m.standing, drift: 0, speed01: it.m.standing ? 0 : 0.3, grounded: !glide, gliding: glide, boosting: false, look: false, phase: it.phase || 'pre', rank: 1 });
      it.m.steerControl?.(it.anim.steer);
      it.m.update?.(dt, { speed01: 0.35, steer: it.anim.steer, boosting: false, gliding: glide, grounded: !glide });
      if (glide) {
        // floating above the turntable, swaying under the wing
        it.m.root.position.y = (it.y || 0) + 0.7 + Math.sin(this.t * 1.7) * 0.15;
        it.m.glider.rotation.z = Math.sin(this.t * 1.3) * 0.06;
        const gfx = it.m.glider.userData.fx;
        if (gfx) { const s = it.gfxS ||= { t: 0, open: 1, steer: 0, speed01: 0.6 }; s.t += dt; s.steer = it.anim.steer; gfx(s, dt); }
      }
      if (it.m.standing) standPose(it, n, this.t, dt, face);
    });
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
      // switching kart <-> glider: the view slides out of its cell and the new one slides in
      let off = 0;
      const sf = it.slideFx;
      if (sf) {
        sf.t += dt;
        const D = 0.2;
        if (sf.t < D) { const u = sf.t / D; off = sf.dir * u * u; }
        else {
          if (sf.mid) { const m = sf.mid; sf.mid = null; m(); }
          const u = Math.min(1, (sf.t - D) / D); off = -sf.dir * (1 - u) * (1 - u);
          if (u >= 1) it.slideFx = null;
        }
      }
      this.r.setViewport(c.x, y + off * c.h, c.w, c.h);
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
