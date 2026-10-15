// Stan Lee, the Marvel map's rescue helper: a seated LEGO-style minifig (in his classic
// cameo look: dark blazer over a white open-collar shirt, grey slacks) with swept-back
// silver hair, a grey moustache, big dark-tinted aviator glasses and a broad smile. He sits
// in a cloud; his right hand (+X side) is raised in a C-grip and the game adds the fishing
// rod through it (root.userData.grip / gripDir). His other hand gives a friendly wave.
// Built in the drivers' seat frame: hips at the origin, +Y up, facing +Z.
import * as THREE from 'three';
import { plastic, seatedFig, mat4, cached } from '../drivers/kit.js';
import { face } from '../drivers/classic-kit.js';

const PI = Math.PI;
const SKIN = 0xf2c9a0, SKIN_S = '#f2c9a0';               // flesh, like the Marvel map heroes
const JACKET = 0x2c3140;                                // charcoal-navy blazer
const SHIRT = 0xf4f4f2, LEGS = 0x45484f, SHOE = 0x1e1a18;
const HAIR = 0xa3a8ae;

const sph = () => cached('stanSph', () => new THREE.SphereGeometry(1, 14, 9));
const dome = () => cached('stanDome', () => new THREE.SphereGeometry(1, 18, 8, 0, PI * 2, 0, PI / 2));
const plane = () => cached('stanPlane', () => new THREE.PlaneGeometry(1, 1));
const cGrip = () => cached('stanCGrip', () => new THREE.TorusGeometry(1, 0.42, 8, 16, PI * 1.6).rotateZ(PI * 0.7));
const blob = (b, x, y, z, sx, sy, sz, c, rx = 0, ry = 0, rz = 0) => b.addMatrix(sph(), plastic(c), mat4(x, y, z, rx, ry, rz, sx, sy, sz));

// ---- prints ------------------------------------------------------------------------------
function faceMat() {
  return face('stanlee', SKIN_S, (P) => {
    const g = P.g;
    g.translate(0, -64);               // the shapes below are laid out with y = 0 at the top of the head
    // bushy grey brows peeking over the frames
    for (const sd of [-1, 1]) P.curve(sd * 12, 34, sd * 32, 26, sd * 56, 32, '#7d8288', 8);
    // aviator glasses: big dark teardrop lenses, thin metal frame, double bridge
    const lens = (sd) => {
      g.beginPath();
      g.moveTo(sd * 8, 40);
      g.bezierCurveTo(sd * 20, 34, sd * 50, 33, sd * 62, 38);
      g.bezierCurveTo(sd * 68, 52, sd * 62, 74, sd * 44, 77);
      g.bezierCurveTo(sd * 26, 79, sd * 10, 66, sd * 8, 40);
      g.closePath();
    };
    for (const sd of [-1, 1]) {
      lens(sd);
      const gr = g.createLinearGradient(0, 34, 0, 78);
      gr.addColorStop(0, '#1c1a1e'); gr.addColorStop(0.6, '#3a3238'); gr.addColorStop(1, '#5d4c4c');
      g.fillStyle = gr; g.fill();
      g.strokeStyle = '#4a4d52'; g.lineWidth = 3.5; g.stroke();
      P.curve(sd * 22, 46, sd * 30, 41, sd * 40, 41, 'rgba(255,255,255,0.75)', 4);   // glint
      P.ell(sd * 50, 66, 3, 2.4, 'rgba(255,255,255,0.35)');
    }
    P.line([[-9, 40], [9, 40]], '#4a4d52', 3.5);
    P.curve(-10, 36, 0, 32, 10, 36, '#4a4d52', 2.5);
    for (const sd of [-1, 1]) P.line([[sd * 62, 39], [sd * 92, 42]], '#4a4d52', 3.5);    // temples
    // nose
    P.curve(-4, 72, -9, 82, 2, 84, '#c48e64', 3);
    // big open smile with teeth, smile lines
    g.fillStyle = '#3a1f1a'; g.beginPath(); g.moveTo(-34, 95); g.quadraticCurveTo(0, 130, 34, 95); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-31, 96); g.lineTo(31, 96); g.quadraticCurveTo(0, 110, -31, 96); g.closePath(); g.fill();
    P.ell(0, 108, 12, 4, '#d94a5a');
    for (const sd of [-1, 1]) P.curve(sd * 40, 80, sd * 50, 96, sd * 40, 112, '#c48e64', 3);
    // grey moustache over the smile
    g.fillStyle = '#8f949a';
    g.beginPath(); g.moveTo(0, 86);
    g.bezierCurveTo(-10, 81, -28, 82, -38, 95); g.bezierCurveTo(-26, 97, -10, 96, 0, 93);
    g.bezierCurveTo(10, 96, 26, 97, 38, 95); g.bezierCurveTo(28, 82, 10, 81, 0, 86);
    g.fill();
    g.strokeStyle = '#5f646a'; g.lineWidth = 2; g.stroke();
  });
}
// torso print: open dark blazer with lapels, white shirt with an open collar and buttons
let torsoMatCache = null;
function torsoMat() {
  if (torsoMatCache) return torsoMatCache;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const i = 128 * (1 - 0.754) / 2;
  g.beginPath(); g.moveTo(i, 0); g.lineTo(128 - i, 0); g.lineTo(128, 128); g.lineTo(0, 128); g.closePath(); g.clip();
  g.fillStyle = '#2c3140'; g.fillRect(0, 0, 128, 128);
  // shirt V
  g.fillStyle = '#f4f4f2';
  g.beginPath(); g.moveTo(40, 0); g.lineTo(88, 0); g.lineTo(76, 70); g.lineTo(68, 128); g.lineTo(60, 128); g.lineTo(52, 70); g.closePath(); g.fill();
  // open neck (skin) and collar points
  g.fillStyle = SKIN_S; g.beginPath(); g.moveTo(52, 0); g.lineTo(76, 0); g.lineTo(64, 22); g.closePath(); g.fill();
  g.strokeStyle = '#b9b9b6'; g.lineWidth = 2;
  for (const sd of [-1, 1]) {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(64 + sd * 12, 0); g.lineTo(64 + sd * 24, 4); g.lineTo(64 + sd * 14, 28); g.lineTo(64 + sd * 1, 22); g.closePath(); g.fill(); g.stroke();
  }
  g.fillStyle = '#9a9a96'; for (const y of [40, 62, 84, 106]) { g.beginPath(); g.arc(64, y, 2.6, 0, 7); g.fill(); }
  // lapels (darker tan with a stitched edge)
  for (const sd of [-1, 1]) {
    g.fillStyle = '#232734';
    g.beginPath(); g.moveTo(64 + sd * 24, 0); g.lineTo(64 + sd * 40, 0); g.lineTo(64 + sd * 34, 34); g.lineTo(64 + sd * 26, 38); g.lineTo(64 + sd * 12, 74); g.closePath(); g.fill();
    g.strokeStyle = '#4c5366'; g.lineWidth = 2.2; g.stroke();
  }
  // jacket front edges, pockets, button
  g.strokeStyle = '#151820'; g.lineWidth = 2.5;
  for (const sd of [-1, 1]) {
    g.beginPath(); g.moveTo(64 + sd * 12, 74); g.lineTo(64 + sd * 4, 128); g.stroke();
    g.beginPath(); g.moveTo(64 + sd * 26, 96); g.lineTo(64 + sd * 46, 94); g.stroke();
    g.beginPath(); g.moveTo(64 + sd * 30, 30); g.lineTo(64 + sd * 44, 28); g.stroke();
  }
  g.fillStyle = '#11131a'; g.beginPath(); g.arc(70, 92, 3.2, 0, 7); g.fill();
  g.fillStyle = '#c4141c'; g.fillRect(64 + 30, 24, 12, 4);   // a little red pocket square
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  torsoMatCache = new THREE.MeshStandardMaterial({ map: t, roughness: 0.38, alphaTest: 0.5 });
  return torsoMatCache;
}

// ---- the figure ----------------------------------------------------------------------------
// right (rod) arm pose: forward and out to +X; left arm raised in a wave out to -X
const ROD_ARM = { x: -1.3, z: 0.45 };
const WAVE_ARM = { x: -0.25, z: -2.35 };
const GRIP_DIR = new THREE.Vector3(0.6, 0.75, 0.25).normalize();

export function build() {
  const s = 1.3, handY = -0.75 * s;
  const rodQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(ROD_ARM.x, 0, ROD_ARM.z));
  const localDir = GRIP_DIR.clone().applyQuaternion(rodQ.clone().invert());
  const ringQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), localDir);
  const waveQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(WAVE_ARM.x, 0, WAVE_ARM.z));
  const handUp = new THREE.Vector3(0, 0, 1).applyQuaternion(waveQ.clone().invert());   // palm faces forward

  const rig = seatedFig({
    name: 'stanlee', s, face: faceMat(), noStud: true,
    skin: SKIN, torso: JACKET, arms: JACKET, hands: SKIN, legs: LEGS, hips: LEGS, neck: SKIN,
    torsoExtra: (b, d) => {
      b.addMatrix(plane(), torsoMat(), mat4(0, d.chestY + 0.41 * s, 0.22 * s * d.D + 0.012, -0.024, 0, 0, 0.92 * s * d.W, 0.82 * s, 1));
      // belt with a grey buckle
      b.box(0, 0.0, 0, 0.92 * s, 0.07 * s, 0.48 * s, 0x1a1b1f);
      b.box(0, 0.0, 0.245 * s, 0.12 * s, 0.06 * s, 0.02 * s, 0xa8adb2);
      // shins hanging from the knees, and shoes
      for (const sd of [-1, 1]) {
        b.box(sd * 0.22 * s, -0.56 * s, 0.56 * s, 0.38 * s, 0.56 * s, 0.24 * s, LEGS);
        b.box(sd * 0.22 * s, -0.66 * s, 0.6 * s, 0.38 * s, 0.1 * s, 0.36 * s, SHOE);
      }
    },
    headExtra: (hb, d) => {
      const r = d.headR, H = d.headH;
      // swept-back silver hair: a cap over the crown, fuller at the back, a raised wave in front
      hb.addMatrix(dome(), plastic(HAIR), mat4(0, 0.78 * H, -0.04 * r, 0, 0, 0, 1.09 * r, 0.5 * H, 1.12 * r));
      blob(hb, 0, 0.62 * H, -0.42 * r, 0.98 * r, 0.42 * H, 0.72 * r, HAIR);                  // back
      for (const sd of [-1, 1]) blob(hb, sd * 0.8 * r, 0.66 * H, -0.12 * r, 0.32 * r, 0.26 * H, 0.66 * r, HAIR, 0, 0, 0); // over the ears
      blob(hb, 0, 0.98 * H, 0.42 * r, 0.82 * r, 0.24 * H, 0.6 * r, HAIR, -0.35);             // the front wave
      // ears
      for (const sd of [-1, 1]) blob(hb, sd * 0.98 * r, 0.5 * H, 0, 0.08 * r, 0.16 * H, 0.12 * r, SKIN);
    },
    arm: (ab, sd) => {
      if (sd > 0) {   // the rod hand: a C-grip ring round the rod's axis
        const m = new THREE.Matrix4().compose(new THREE.Vector3(0, handY, 0), ringQ, new THREE.Vector3(0.085 * s, 0.085 * s, 0.085 * s));
        ab.addMatrix(cGrip(), plastic(SKIN), m);
      } else {        // the waving hand: an open C facing forward
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), handUp);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(0, handY, 0), q, new THREE.Vector3(0.085 * s, 0.085 * s, 0.085 * s));
        ab.addMatrix(cGrip(), plastic(SKIN), m);
      }
      // white shirt cuff
      ab.cyl(0, -0.66 * s, 0, 0.115 * s, 0.04 * s, SHIRT, { seg: 10 });
    },
  });
  // seatedFig returns armL = the +X arm, armR = the -X arm
  const rodArm = rig.armL, waveArm = rig.armR;
  rodArm.rotation.set(ROD_ARM.x, 0, ROD_ARM.z);
  waveArm.rotation.set(WAVE_ARM.x, 0, WAVE_ARM.z);
  rig.head.rotation.set(-0.05, 0.12, 0);   // a slight look towards the rod

  const root = rig.root;
  root.updateMatrixWorld(true);
  const grip = rodArm.localToWorld(new THREE.Vector3(0, handY, 0));
  root.worldToLocal(grip);
  root.userData.grip = grip;
  root.userData.gripDir = GRIP_DIR.clone();
  return root;
}
