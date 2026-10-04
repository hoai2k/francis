// Star Wars drivers. Helmets, faces and colours match the brick
// characters on the Tatooine Podrace map (../maps/starwars-props.js); props such as
// lightsabers and blasters live in starwars-parts.js and only appear (ignite, twirl,
// fire) while a gesture plays.
import { seatedFig, taperGeo } from './kit.js';
import { FACES } from '../maps/starwars-props.js';
import {
  THREE, BrickBuilder, C, plastic, mat4, rbox, rod, glowMat, S, A, PI,
  metalMat, CONE, HEMI, BOWL, HOOD, FLARE, HEADCYL, HALFCYL, FACE, hair, handAt, saber, blaster, gaffi, flames,
  strength, showSaber, shoot, cached, faceMat,
} from './starwars-parts.js';

const GOLD = 0xd9a520, BESKAR = 0xc6cad2;

// ---- local shapes and prints (trooper, Tusken, C-3PO) ----------------------------------
// a band round the front of a head (brow ridges), a cylinder that narrows to the chin
const FRONTARC = () => cached('swdFrontArc', () => new THREE.CylinderGeometry(1, 1, 1, 20, 1, false, -PI * 0.4, PI * 0.8).translate(0, 0.5, 0));
const CHINCYL = (k) => cached('swdChinCyl' + k, () => new THREE.CylinderGeometry(1, k, 1, 22).translate(0, 0.5, 0));
// a point on a head of radius r, `a` radians round from the front
const onHead = (a, y, r) => [Math.sin(a) * r, y, Math.cos(a) * r];
// A face print drawn in world units on a head cylinder of radius R and height Hc:
// u = distance round the surface from the front centre, v = height above the bottom.
function printFace(key, R, Hc, skin, draw) {
  return faceMat(key, (g) => {
    g.setTransform(256 / (2 * PI * R), 0, 0, -128 / Hc, 128, 128);
    draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }, skin);
}
const ellipse = (g, x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, PI * 2); g.fill(); };
const poly = (g, col, pts) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };

// ---- heroes ---------------------------------------------------------------------------
function luke() {
  const r = seatedFig({
    name: 'luke', torso: 0xf2efe6, arms: 0xf2efe6, legs: 0xcbb98f, hips: 0x6b4a2e, face: FACE.luke(),
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, d.chestY, 0, 0.95 * s, 0.11 * s, 0.5 * s, 0x6b4a2e);
      b.box(0.18 * s, d.chestY + 0.01 * s, 0.24 * s, 0.12 * s, 0.09 * s, 0.03 * s, 0xb4b8bc);
      for (const sd of [-1, 1]) rbox(b, sd * 0.1 * s, 0.78 * s, 0.215 * s, 0.035 * s, 0.38 * s, 0.03 * s, -0.08, 0, sd * 0.5, 0xd2cdbd);
    },
    headExtra: (hb, d) => hair(hb, d, 0xd9a85a, { fringe: 1 }),
  });
  const sab = handAt(r, -1, saber(0x3d8bff, 1.1));
  sab.rotation.x = PI / 2;
  r.fx = (name, f) => showSaber(sab, strength(name, f, ['cheer', 'win', 'trick']));
  return r;
}

function leia() {
  const r = seatedFig({
    name: 'leia', torso: 0xf4f4f4, arms: 0xf4f4f4, legs: 0xf4f4f4, hips: 0xf4f4f4, face: FACE.leia(),
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, d.chestY + 0.02 * s, 0, 0.95 * s, 0.1 * s, 0.5 * s, 0xb4b8bc);
      for (let k = 0; k < 5; k++) b.box((-0.32 + k * 0.16) * s, d.chestY + 0.035 * s, 0.25 * s, 0.07 * s, 0.07 * s, 0.02 * s, 0x8a8e92);
      b.box(0, 0.86 * s, -0.02 * s, 0.6 * s, 0.14 * s, 0.4 * s, 0xf4f4f4);   // hood collar
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH, col = 0x4a2a16;
      hair(hb, d, col, { low: 0.3 });
      for (const sd of [-1, 1]) {
        rod(hb, [sd * R * 0.9, H * 0.48, -R * 0.05], [sd * R * 1.38, H * 0.48, -R * 0.05], R * 0.62, col, 16);
        rod(hb, [sd * R * 1.38, H * 0.48, -R * 0.05], [sd * R * 1.44, H * 0.48, -R * 0.05], R * 0.38, 0x3a1e0e, 12);
      }
    },
  });
  const gun = handAt(r, -1, blaster('pistol', 1));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'throwF']);
    gun.visible = k > 0;
    shoot(gun, k > 0.5 && name !== 'throwF', t, 4);
  };
  return r;
}

function han() {
  const r = seatedFig({
    name: 'han', torso: 0xf0ece0, arms: 0xf0ece0, legs: 0x23304a, hips: 0x3a2a1a, face: FACE.han(),
    torsoExtra: (b, d) => {
      const s = d.s;
      for (const sd of [-1, 1]) b.add(taperGeo(0.3, 0.2, 0.8, 0.48, 0.44), plastic(0x16181c), sd * 0.31 * s, d.chestY + 0.01 * s, 0, 0, s, s, s);
      b.box(0, d.chestY - 0.01 * s, 0, 0.95 * s, 0.11 * s, 0.5 * s, 0x3a2a1a);
      b.box(-0.36 * s, -0.2 * s, 0.1 * s, 0.14 * s, 0.32 * s, 0.22 * s, 0x3a2a1a);  // holster
      for (const sd of [-1, 1]) b.box(sd * 0.3 * s, -0.2 * s, 0.32 * s, 0.05 * s, 0.27 * s, 0.72 * s, C.red);
    },
    headExtra: (hb, d) => hair(hb, d, 0x5a3820, { fringe: -1, sides: true }),
  });
  const gun = handAt(r, -1, blaster('dl44', 1));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer']);
    gun.visible = k > 0;
    const spin = name === 'cheer' && f < 0.55;
    gun.rotation.x = spin ? f / 0.55 * PI * 4 : 0;
    shoot(gun, name === 'cheer' && f > 0.6, t, 4);
  };
  return r;
}

function chewie() {
  const fur = 0x6a4a2c, fur2 = 0x4e341c, fur3 = 0x8a6440;
  const r = seatedFig({
    name: 'chewie', s: 1.6, wide: 1.05, torso: fur, arms: fur, legs: fur, hips: fur2, hands: fur2, skin: fur, neck: fur,
    face: FACES.chewie(), headR: 0.33, headH: 0.56, noStud: true, extraHeight: 0.12,
    torsoExtra: (b, d) => {
      const s = d.s;
      for (let k = 0; k < 12; k++) b.box(((k * 0.37) % 1 - 0.5) * 0.7 * s, (0.25 + ((k * 0.23) % 1) * 0.6) * s, 0.215 * s, 0.08 * s, 0.24 * s, 0.03 * s, k % 2 ? fur2 : fur3);
      rbox(b, 0, 0.6 * s, 0.24 * s, 0.13 * s, 1.15 * s, 0.03 * s, 0, 0, 0.72, 0x3a2614);
      rbox(b, 0, 0.6 * s, -0.24 * s, 0.13 * s, 1.15 * s, 0.03 * s, 0, 0, -0.72, 0x3a2614);
      for (let k = 0; k < 5; k++) rbox(b, (-0.26 + k * 0.13) * s, (0.38 + k * 0.105) * s, 0.26 * s, 0.07 * s, 0.09 * s, 0.04 * s, 0, 0, 0.72, 0xb0b4b8);
      b.box(0, 0.86 * s, 0, 0.78 * s, 0.14 * s, 0.44 * s, fur);   // shaggy shoulders
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H * 0.94, -R * 0.04, R * 1.14, fur, { sy: 0.5 });
      hb.add(HALFCYL(), plastic(fur), 0, H * 0.02, -R * 0.08, 0, R * 1.14, H * 0.94, R * 1.1);
      for (const sd of [-1, 1]) {
        rbox(hb, sd * R * 0.86, H * 0.42, R * 0.38, R * 0.3, H * 0.8, R * 0.5, 0, sd * 0.35, -sd * 0.1, fur2);
        rbox(hb, sd * R * 0.42, H * 0.86, R * 0.8, R * 0.62, H * 0.13, R * 0.3, 0.4, 0, sd * 0.12, fur3);
      }
      rbox(hb, 0, H * 0.27, R * 0.84, R * 0.8, H * 0.14, R * 0.3, 0, 0, 0, 0x2a0e0a);    // mouth (shows when the jaw drops)
    },
  });
  // lower jaw (roars)
  const d = r.dims, R = d.headR, H = d.headH;
  const jaw = new THREE.Group(); jaw.position.set(0, H * 0.3, R * 0.25);
  const jb = new BrickBuilder(1);
  rbox(jb, 0, -H * 0.1, R * 0.52, R * 0.95, H * 0.2, R * 0.6, 0, 0, 0, 0x8a6a4a);
  rbox(jb, 0, -H * 0.03, R * 0.78, R * 0.7, H * 0.05, R * 0.12, 0, 0, 0, 0xf0ead8);   // teeth
  jaw.add(jb.build({ name: 'chewie-jaw' }));
  r.head.add(jaw);
  r.jaw = jaw; r.jawOpen = 0.55;
  return r;
}

// R2-D2: a custom rig. The body is the torso, the dome is the head (it spins), the two
// little utility arms steer.
function r2d2() {
  const W = 0xf2f2f2, BL = 0x1f55b8, SV = 0xb8bcc4;
  const root = new THREE.Group(); root.name = 'r2d2';
  const torso = new THREE.Group(); root.add(torso);
  const b = new BrickBuilder(1);
  b.cyl(0, -0.45, 0, 0.5, 1.45, W, { seg: 20 });
  b.cyl(0, 0.93, 0, 0.515, 0.07, SV, { seg: 20 });
  rbox(b, 0, 0.73, 0.48, 0.24, 0.16, 0.06, 0, 0, 0, BL);
  for (const sd of [-1, 1]) rbox(b, sd * 0.2, 0.43, 0.45, 0.1, 0.36, 0.06, 0, sd * 0.42, 0, BL);
  rbox(b, 0, 0.49, 0.49, 0.18, 0.05, 0.04, 0, 0, 0, SV);
  rbox(b, 0, 0.35, 0.49, 0.18, 0.05, 0.04, 0, 0, 0, SV);
  rbox(b, 0, 0.59, -0.48, 0.3, 0.3, 0.06, 0, 0, 0, BL);
  for (const sd of [-1, 1]) {
    rod(b, [sd * 0.46, 0.77, 0], [sd * 0.66, 0.77, 0], 0.15, SV, 12);
    rbox(b, sd * 0.6, 0.2, 0, 0.12, 1.14, 0.3, 0, 0, 0, W);
    rbox(b, sd * 0.665, 0.4, 0, 0.02, 0.5, 0.13, 0, 0, 0, BL);
    rod(b, [sd * 0.69, 0.68, -0.05], [sd * 0.69, 0.68, -0.3], 0.09, 0x6a6e72, 8);   // boosters (Attack of the Clones)
  }
  torso.add(b.build({ name: 'r2-body' }));
  const fire = flames([[0.69, 0, 0], [-0.69, 0, 0]], 0.9, 0.12, 'back');
  fire.position.set(0, 0.68, -0.3);
  torso.add(fire);
  const head = new THREE.Group(); head.position.set(0, 1.0, 0); torso.add(head);
  const hb = new BrickBuilder(1);
  hb.addMatrix(HEMI(), metalMat(0xc8ccd2, 0.25), mat4(0, 0, 0, 0, 0, 0, 0.5, 0.46, 0.5));
  for (let k = 1; k < 8; k++) { const a = k * PI / 4; rbox(hb, Math.sin(a) * 0.46, 0.1, Math.cos(a) * 0.46, 0.2, 0.13, 0.06, 0, a, 0, BL); }
  rbox(hb, 0, 0.36, 0.22, 0.22, 0.1, 0.16, -0.75, 0, 0, BL);
  rod(hb, [0, 0.2, 0.36], [0, 0.22, 0.5], 0.08, 0x111111, 10);
  hb.sphere(0.2, 0.1, 0.44, 0.045, 0, { mat: glowMat(0xff2a2a, 3) });
  hb.sphere(-0.2, 0.27, 0.4, 0.04, 0, { mat: glowMat(0x3ab0ff, 3) });
  head.add(hb.build({ name: 'r2-dome' }));
  const peri = new THREE.Group(); peri.position.set(0.14, 0.0, -0.12); head.add(peri);
  const pb = new BrickBuilder(1);
  rod(pb, [0, 0, 0], [0, 0.32, 0], 0.035, 0x8a8e92, 6);
  rbox(pb, 0, 0.36, 0.02, 0.1, 0.09, 0.14, 0, 0, 0, 0x2a2c30);
  peri.add(pb.build({ name: 'r2-periscope' }));
  const arms = [1, -1].map((sd) => {
    const pv = new THREE.Group(); pv.position.set(sd * 0.2, 0.95, 0.44);
    const ab = new BrickBuilder(1);
    rod(ab, [0, 0.02, 0], [0, -0.36, 0], 0.035, SV, 6);
    rbox(ab, 0, -0.38, 0, 0.1, 0.06, 0.08, 0, 0, 0, 0x6a6e72);
    for (const s2 of [-1, 1]) rbox(ab, s2 * 0.035, -0.44, 0, 0.025, 0.08, 0.05, 0, 0, 0, 0x6a6e72);
    pv.add(ab.build({ name: 'r2-arm' }));
    torso.add(pv);
    return pv;
  });
  const rig = { root, torso, head, armL: arms[0], armR: arms[1], armLen: 0.42, height: 1.5, width: 1.45 };
  rig.fx = (name, f, t) => {
    const cheer = name === 'cheer', win = name === 'win';
    if (cheer) head.rotation.y = f * PI * 4;
    else if (win) head.rotation.y = t * 5;
    peri.position.y = cheer || win ? 0.2 + S(t * 9) * 0.05 : 0;
    fire.visible = name === 'trick' || name === 'use' || win;
    if (fire.visible) fire.scale.z = 0.75 + S(t * 37) * 0.25;
  };
  return rig;
}

// C-3PO: polished gold plating (every plain part is swapped to a metallic version of the
// shared vertex-colour plastic), round glowing eyes in dark rims, a small mouth slot,
// slanted ear discs, a stiff segmented body with the wiring showing at the waist.
const P3_GOLD = 0xcc9a22, P3_HI = 0xd4a22a, P3_DARK = 0x3a3022, P3_SILVER = 0xb8bcc4;
const c3poFace = (R, Hc) => {
  const m = printFace('swd-c3po', R, Hc, '#dcaa2a', (g) => {
    for (const sd of [-1, 1]) {
      ellipse(g, sd * 0.14, Hc * 0.6, 0.095, 0.085, '#9a7012');                 // eye sockets
      poly(g, '#a87c14', [[sd * 0.085, Hc * 0.45], [sd * 0.105, Hc * 0.45], [sd * 0.12, Hc * 0.08], [sd * 0.1, Hc * 0.08]]);   // cheek lines
      poly(g, '#a87c14', [[sd * 0.3, Hc * 0.9], [sd * 0.32, Hc * 0.9], [sd * 0.32, Hc * 0.1], [sd * 0.3, Hc * 0.1]]);         // jaw seams
    }
    poly(g, '#f6d470', [[-0.016, Hc * 0.62], [0.016, Hc * 0.62], [0.02, Hc * 0.36], [-0.02, Hc * 0.36]]);   // nose
    poly(g, '#a87c14', [[-1.3, Hc * 0.93], [1.3, Hc * 0.93], [1.3, Hc * 0.95], [-1.3, Hc * 0.95]]);         // brow seam
  });
  m.metalness = 0.75; m.roughness = 0.3;
  return m;
};
function c3poHead(hb, R, H) {
  const Hf = H * 0.78, k = 0.84, rAt = (y) => R * (k + (1 - k) * y / Hf);
  const rim = plastic(0x2a2214, { rough: 0.45 }), glow = glowMat(0xffd23a, 1.8);
  hb.add(CHINCYL(k), c3poFace(R * 0.92, Hf), 0, 0, 0, PI, R, Hf, R);
  hb.addMatrix(HEMI(), plastic(P3_GOLD), mat4(0, Hf - 0.01, 0, 0, 0, 0, R * 1.02, R * 0.74, R * 1.02));
  hb.addMatrix(FRONTARC(), plastic(P3_HI), mat4(0, H * 0.58, 0, -0.08, 0, 0, rAt(H * 0.58) * 1.07, H * 0.05, rAt(H * 0.58) * 1.07));   // brow ridge
  const ey = H * 0.47, er = rAt(ey);
  for (const sd of [-1, 1]) {
    const a = sd * 0.37;
    rod(hb, onHead(a, ey, er * 0.85), onHead(a, ey, er * 1.06), R * 0.165, rim, 14);
    rod(hb, onHead(a, ey, er * 1.0), onHead(a, ey, er * 1.075), R * 0.11, glow, 14);
    // slanted ear discs
    rod(hb, [sd * R * 0.85, ey, -R * 0.02], [sd * R * 1.1, ey + R * 0.04, -R * 0.1], R * 0.26, P3_GOLD, 16);
    rod(hb, [sd * R * 1.08, ey + R * 0.035, -R * 0.095], [sd * R * 1.14, ey + R * 0.045, -R * 0.11], R * 0.17, P3_HI, 14);
    rod(hb, [sd * R * 1.13, ey + R * 0.043, -R * 0.108], [sd * R * 1.16, ey + R * 0.048, -R * 0.115], R * 0.06, P3_DARK, 8);
  }
  rbox(hb, 0, H * 0.36, rAt(H * 0.36) * 1.0, R * 0.1, H * 0.17, R * 0.12, -0.12, 0, 0, P3_HI);         // nose
  rbox(hb, 0, H * 0.17, rAt(H * 0.17) * 1.0, R * 0.28, H * 0.045, R * 0.07, 0, 0, 0, 0, { mat: rim });  // mouth slot
}
let goldVC = null;
function c3po() {
  const W = 0.96;
  const r = seatedFig({
    name: 'c3po', wide: W, torso: P3_GOLD, arms: P3_GOLD, legs: P3_GOLD, hips: P3_GOLD, hands: P3_GOLD, skin: P3_GOLD, neck: P3_DARK,
    headR: 0.31, headH: 0.48, noStud: true, extraHeight: 0.16,
    head: (hb, d) => c3poHead(hb, d.headR, d.headH),
    torsoExtra: (b, d) => {
      const s = d.s, silver = metalMat(P3_SILVER, 0.25);
      // chest plate, collar and power socket
      b.add(taperGeo(0.87 * W, 0.74 * W, 0.37, 0.5, 0.47), plastic(P3_HI), 0, 0.64 * s, 0, 0, s, s, s);
      b.cyl(0, 0.98 * s, 0, 0.21 * s, 0.05 * s, P3_GOLD, { seg: 16 });
      for (const sd of [-1, 1]) rbox(b, sd * 0.17 * s, 0.8 * s, 0.248 * s, 0.26 * s, 0.22 * s, 0.03 * s, -0.04, 0, 0, P3_GOLD);
      rod(b, [0, 0.72 * s, 0.24 * s], [0, 0.72 * s, 0.27 * s], 0.06 * s, P3_DARK, 12);
      rod(b, [0, 0.72 * s, 0.26 * s], [0, 0.72 * s, 0.275 * s], 0.03 * s, silver, 10);
      rbox(b, 0, 0.66 * s, 0.25 * s, 0.6 * s * W, 0.025 * s, 0.02 * s, 0, 0, 0, P3_DARK);
      // the open waist: dark frame, coloured wiring and a silver piston
      b.box(0, 0.3 * s, 0, 0.9 * s * W, 0.34 * s, 0.47 * s, P3_DARK);
      for (const [x, c, bend] of [[-0.26, 0xc82a20, 0.04], [-0.17, 0x2a5ac8, -0.03], [-0.08, 0x1a1a1a, 0.03], [0.09, 0xc82a20, -0.04], [0.18, 0x2a2a2a, 0.03], [0.27, 0x2a5ac8, -0.03]]) {
        const m = plastic(c, { rough: 0.5 });
        rod(b, [x * s, 0.31 * s, 0.24 * s], [(x + bend) * s, 0.47 * s, 0.255 * s], 0.022 * s, m, 6);
        rod(b, [(x + bend) * s, 0.47 * s, 0.255 * s], [x * s, 0.63 * s, 0.24 * s], 0.022 * s, m, 6);
      }
      rod(b, [0, 0.3 * s, 0.245 * s], [0, 0.64 * s, 0.245 * s], 0.035 * s, silver, 8);
      // pelvis band and plate
      b.box(0, d.chestY - 0.04 * s, 0, 0.95 * s * W, 0.16 * s, 0.5 * s, P3_GOLD);
      rbox(b, 0, d.chestY - 0.06 * s, 0.258 * s, 0.32 * s, 0.2 * s, 0.03 * s, 0, 0, 0, P3_HI);
      // back plate
      rbox(b, 0, 0.8 * s, -0.25 * s, 0.56 * s, 0.32 * s, 0.03 * s, 0.04, 0, 0, P3_GOLD);
      rod(b, [0, 0.82 * s, -0.25 * s], [0, 0.82 * s, -0.285 * s], 0.06 * s, P3_DARK, 10);
      for (const [x, c] of [[-0.12, 0xc82a20], [0.0, 0x2a5ac8], [0.12, 0x1a1a1a]]) rod(b, [x * s, 0.31 * s, -0.24 * s], [(x + 0.05) * s, 0.63 * s, -0.24 * s], 0.022 * s, plastic(c, { rough: 0.5 }), 6);
    },
    arm: (ab, sd, d) => {
      const s = d.s;
      ab.sphere(sd * 0.01 * s, -0.01 * s, 0, 0.15 * s, P3_HI, { sy: 0.9 });
      ab.box(0, -0.16 * s, 0, 0.27 * s, 0.04 * s, 0.28 * s, P3_DARK);
      ab.box(0, -0.43 * s, 0, 0.255 * s, 0.07 * s, 0.275 * s, P3_DARK);
      rod(ab, [sd * 0.135 * s, -0.3 * s, 0], [sd * 0.135 * s, -0.55 * s, 0], 0.02 * s, metalMat(P3_SILVER, 0.25), 6);
      ab.box(0, -0.63 * s, 0, 0.235 * s, 0.035 * s, 0.25 * s, P3_DARK);
    },
  });
  // polish: swap the shared vertex-colour plastic for a metallic copy on this droid only
  r.root.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m || Array.isArray(m) || !m.vertexColors || m.metalness || m.map) return;
    goldVC ||= Object.assign(m.clone(), { metalness: 0.85, roughness: 0.25 });
    o.material = goldVC;
  });
  return r;
}

function yoda() {
  const robe = 0xb39a72, robe2 = 0x7a5a3a, skin = 0x8fa65a;
  const r = seatedFig({
    name: 'yoda', s: 0.85, torso: robe, arms: robe, legs: 0x8a7556, hips: robe2, hands: skin, skin, neck: robe2,
    face: FACE.yoda(), headR: 0.44, headH: 0.5, noStud: true, extraHeight: 0.1,
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, d.chestY, 0, 0.95 * s, 0.1 * s, 0.5 * s, robe2);
      b.box(0, 0.84 * s, -0.02 * s, 0.82 * s, 0.18 * s, 0.48 * s, robe2);   // cloak collar
      for (const sd of [-1, 1]) rbox(b, sd * 0.14 * s, 0.62 * s, 0.215 * s, 0.04 * s, 0.7 * s, 0.03 * s, 0, 0, sd * 0.35, robe2);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H * 0.98, 0, R, skin, { sy: 0.36 });
      for (const sd of [-1, 1]) {
        hb.addMatrix(CONE(), plastic(skin), mat4(sd * R * 1.55, H * 0.66, -R * 0.1, 0, 0, -sd * (PI / 2 - 0.3), R * 0.3, R * 1.5, R * 0.09));
        hb.addMatrix(CONE(), plastic(0xc89a8a), mat4(sd * R * 1.5, H * 0.64, -R * 0.05, 0, 0, -sd * (PI / 2 - 0.3), R * 0.18, R * 1.1, R * 0.06));
      }
      for (let k = 0; k < 5; k++) { const a = PI * 0.65 + k * 0.17; rbox(hb, Math.sin(a) * R, H * 0.5, Math.cos(a) * R, R * 0.12, H * 0.5, R * 0.05, 0.2, a, 0, 0xe8e8e8); }
    },
  });
  const sab = handAt(r, -1, saber(0x3aff4a, 0.8, { len: 0.95 }));
  sab.rotation.x = PI / 2;
  r.fx = (name, f, t) => {
    showSaber(sab, strength(name, f, ['cheer', 'win', 'trick']));
    sab.rotation.y = name === 'win' ? t * 9 : 0;
  };
  return r;
}

function mando() {
  const flight = 0x6a6258, cape = 0x5a3a24, bes = metalMat(BESKAR, 0.22);
  const r = seatedFig({
    name: 'mando', torso: 0x6a6258, arms: flight, legs: flight, hips: 0x4a3a2a, hands: 0x3a2a1a, neck: 0x3a3a3a, headR: 0.32, headH: 0.5,
    head: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.add(HEADCYL(), bes, 0, 0, 0, 0, R, H * 0.96, R);
      hb.addMatrix(HEMI(), bes, mat4(0, H * 0.94, 0, 0, 0, 0, R, R * 0.6, R));
      rbox(hb, 0, H * 0.6, R * 0.94, R * 1.3, H * 0.14, R * 0.18, 0, 0, 0, 0x0c0c0c);
      rbox(hb, 0, H * 0.34, R * 0.94, R * 0.3, H * 0.42, R * 0.18, 0, 0, 0, 0x0c0c0c);
      rod(hb, [R * 0.95, H * 0.5, 0], [R * 1.12, H * 0.5, 0.0], R * 0.18, 0x8a8e92, 8);
      rod(hb, [R * 1.08, H * 0.5, 0.0], [R * 1.08, H * 0.9, R * 0.3], R * 0.06, 0x8a8e92, 6);
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      for (const sd of [-1, 1]) rbox(b, sd * 0.17 * s, 0.7 * s, 0.22 * s, 0.3 * s, 0.32 * s, 0.05 * s, -0.08, 0, 0, 0, { mat: bes });
      rbox(b, 0, 0.42 * s, 0.235 * s, 0.4 * s, 0.18 * s, 0.03 * s, 0, 0, 0, 0, { mat: bes });
      b.box(0, d.chestY, 0, 0.95 * s, 0.11 * s, 0.5 * s, 0x4a3a2a);
      rbox(b, 0, 0.6 * s, 0.25 * s, 0.1 * s, 1.0 * s, 0.03 * s, 0, 0, -0.65, 0x4a3a2a);
      b.box(0, 0.05 * s, -0.27 * s, 1.0 * s, 0.95 * s, 0.06 * s, cape);
      b.box(0, 0.88 * s, -0.08 * s, 0.98 * s, 0.14 * s, 0.42 * s, cape);
    },
    arm: (ab, sd, d) => { const s = d.s; rbox(ab, sd * 0.03 * s, -0.04 * s, 0, 0.32 * s, 0.12 * s, 0.36 * s, 0, 0, -sd * 0.3, 0xa8acb2); rbox(ab, 0, -0.45 * s, 0, 0.28 * s, 0.14 * s, 0.3 * s, 0, 0, 0, 0xa8acb2); },
    extraHeight: 0.15,
  });
  const gun = handAt(r, -1, blaster('mando', 1));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'throwF']);
    gun.visible = k > 0;
    gun.rotation.x = name === 'cheer' ? (f < 0.7 ? f / 0.7 * PI * 6 : 0) : name === 'win' ? (t * 10) % (PI * 2) : 0;
    shoot(gun, name === 'cheer' && f > 0.72, t, 5);
  };
  return r;
}

// Grogu in his hover-pram: the pram bobs, the knob from the Razor Crest floats up when he
// uses the Force.
function grogu() {
  const skin = 0x8ab070, robe = 0xc8b08a;
  const root = new THREE.Group(); root.name = 'grogu';
  const pram = new THREE.Group(); root.add(pram);
  const pb = new BrickBuilder(1);
  const pm = metalMat(0xd8dadc, 0.3);
  pb.addMatrix(BOWL(), pm, mat4(0, 0.56, 0.02, 0, 0, 0, 0.66, 0.62, 0.66));
  pb.cyl(0, 0.52, 0.02, 0.68, 0.07, 0xa0a4a8, { seg: 20 });
  pb.addMatrix(HOOD(), pm, mat4(0, 0.56, -0.02, -0.38, 0, 0, 0.66, 0.6, 0.66));
  pb.cyl(0, 0.48, 0.02, 0.6, 0.05, 0xc8b08a, { seg: 16 });
  pb.sphere(0, 0.03, 0.02, 0.2, 0, { mat: glowMat(0x9ad8ff, 1.6) });
  pram.add(pb.build({ name: 'pram' }));
  // torso pivot at the hips (origin) so rig.shoulder = armL.position is in the seat frame
  const torso = new THREE.Group(); root.add(torso);
  const b = new BrickBuilder(1);
  b.cyl(0, 0.42, 0.06, 0.26, 0.42, robe, { seg: 14 });
  b.cyl(0, 0.78, 0.06, 0.27, 0.1, 0xa08a66, { seg: 14 });
  torso.add(b.build({ name: 'grogu-body' }));
  const head = new THREE.Group(); head.position.set(0, 0.89, 0.06); torso.add(head);
  const hb = new BrickBuilder(1);
  hb.add(HEADCYL(), FACES.grogu(), 0, 0, 0, PI, 0.27, 0.36, 0.27);
  hb.addMatrix(HEMI(), plastic(skin), mat4(0, 0.36, 0, 0, 0, 0, 0.27, 0.15, 0.27));
  for (const sd of [-1, 1]) {
    rbox(hb, sd * 0.5, 0.26, -0.03, 0.56, 0.2, 0.05, 0, 0, sd * 0.22, skin);
    rbox(hb, sd * 0.5, 0.26, 0.0, 0.46, 0.11, 0.03, 0, 0, sd * 0.22, 0xd89a9a);
  }
  head.add(hb.build({ name: 'grogu-head' }));
  const arms = [1, -1].map((sd) => {
    const pv = new THREE.Group(); pv.position.set(sd * 0.22, 0.77, 0.11);
    const ab = new BrickBuilder(1);
    ab.sphere(0, 0, 0, 0.08, robe);
    ab.add(taperGeo(0.12, 0.15, 0.26, 0.14), plastic(robe), 0, -0.28, 0, 0);
    ab.sphere(0, -0.31, 0, 0.065, skin);
    pv.add(ab.build({ name: 'grogu-arm' }));
    torso.add(pv);
    return pv;
  });
  // the Force: the shifter knob floats above the dash
  const knob = new THREE.Group();
  const kb = new BrickBuilder(1);
  kb.sphere(0, 0, 0, 0.13, 0, { mat: metalMat(0xd8dadc, 0.15) });
  kb.cyl(0, -0.2, 0, 0.035, 0.14, 0x5a5e62, { seg: 6 });
  knob.add(kb.build({ name: 'knob' }));
  knob.visible = false;
  root.add(knob);
  const rig = { root, torso, head, armL: arms[0], armR: arms[1], armLen: 0.31, height: 1.35, width: 1.36 };
  rig.idle = (t) => {
    const bob = S(t * 2.2) * 0.04;
    pram.position.y = bob;
    torso.position.y += bob;
  };
  rig.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'use']);
    knob.visible = k > 0;
    if (k > 0) {
      knob.position.set(-0.3 + S(t * 1.7) * 0.06, 0.9 + k * 0.75 + S(t * 3) * 0.06, 1.0);
      knob.rotation.y = t * 2;
    }
  };
  return rig;
}

// ---- villains -------------------------------------------------------------------------
function vader() {
  const blk = 0x141414;
  const r = seatedFig({
    name: 'vader', s: 1.42, wide: 1.06, torso: 0x1a1a1a, arms: 0x161616, legs: blk, hips: blk, hands: 0x101010, skin: blk, neck: blk,
    face: FACES.vader(), headR: 0.31, headH: 0.5, noStud: true, extraHeight: 0.2,
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, 0.5 * s, 0.205 * s, 0.32 * s, 0.24 * s, 0.05 * s, 0x2e2e32);
      b.box(-0.08 * s, 0.6 * s, 0.23 * s, 0.06 * s, 0.06 * s, 0.02 * s, 0, { mat: glowMat(0xff2a2a, 2.5) });
      b.box(0.02 * s, 0.6 * s, 0.23 * s, 0.06 * s, 0.06 * s, 0.02 * s, 0x2a8a3a);
      b.box(0.1 * s, 0.6 * s, 0.23 * s, 0.06 * s, 0.06 * s, 0.02 * s, 0x2a5aaa);
      b.box(0, d.chestY - 0.01 * s, 0, 0.96 * s * d.W, 0.13 * s, 0.5 * s, 0x2a2a2a);
      for (const x of [-0.24, -0.08, 0.08, 0.24]) b.box(x * s, d.chestY, 0.245 * s, 0.1 * s, 0.11 * s, 0.03 * s, 0x9aa0a8);
      b.box(0, -0.05 * s, -0.28 * s, 1.08 * s * d.W, 1.08 * s, 0.07 * s, 0x0c0c0c);      // cape
      b.box(0, 0.86 * s, -0.04 * s, 0.98 * s * d.W, 0.14 * s, 0.5 * s, 0x0c0c0c);
      for (const sd of [-1, 1]) rbox(b, sd * 0.13 * s, 0.86 * s, 0.17 * s, 0.24 * s, 0.1 * s, 0.14 * s, 0.3, 0, sd * 0.4, 0x0c0c0c);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H * 0.92, 0, R * 1.2, 0x101010, { sy: 0.62 });
      hb.add(FLARE(), plastic(0x101010), 0, -H * 0.04, 0, 0, R * 1.2, H * 0.98, R * 1.2);
      rbox(hb, 0, H * 0.9, R * 0.85, R * 1.6, H * 0.1, R * 0.4, 0.3, 0, 0, 0x101010);
    },
  });
  const sab = handAt(r, -1, saber(0xff2010, 1.15));
  sab.rotation.x = PI / 2;
  r.fx = (name, f) => showSaber(sab, strength(name, f, ['win', 'trick']));
  return r;
}

function maul() {
  const blk = 0x161616;
  const r = seatedFig({
    name: 'maul', torso: 0x1b1b1b, arms: blk, legs: blk, hips: blk, hands: 0x101010, skin: 0xb3141c, neck: 0xb3141c,
    face: FACES.maul(), noStud: true, extraHeight: 0.15,
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, d.chestY, 0, 0.95 * s, 0.12 * s, 0.5 * s, 0x3a2a1a);
      for (const sd of [-1, 1]) rbox(b, sd * 0.12 * s, 0.62 * s, 0.22 * s, 0.16 * s, 0.82 * s, 0.03 * s, -0.06, 0, sd * 0.32, 0x0a0a0a);
      b.box(0, 0.86 * s, -0.04 * s, 0.9 * s, 0.14 * s, 0.48 * s, 0x0a0a0a);
      b.box(0, 0.0, -0.27 * s, 0.98 * s, 1.0 * s, 0.06 * s, 0x0a0a0a);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH, horn = 0xe8dcc0;
      for (let k = 0; k < 9; k++) {
        const a = k / 9 * PI * 2, rr = k % 3 === 0 ? 0.25 : 0.62;
        hb.cone(Math.sin(a) * R * rr, H - 0.01, Math.cos(a) * R * rr, 0.045, k % 2 ? 0.14 : 0.2, horn, { seg: 6 });
      }
    },
  });
  // double-bladed saber on a spinner (spins about the arm axis)
  const spin = handAt(r, -1, new THREE.Group());
  const sab = saber(0xff2010, 1.0, { double: true, len: 0.95 });
  sab.rotation.z = -PI / 2;
  spin.add(sab);
  sab.visible = true;
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win']);
    spin.visible = k > 0;
    showSaber(sab, k);
    spin.rotation.y = name === 'cheer' ? f * PI * 8 : name === 'win' ? t * 14 : 0;
  };
  return r;
}

function boba() {
  const g1 = 0x5a6b3a, g2 = 0x6e7f48;
  const r = seatedFig({
    name: 'boba', torso: 0x8a7a54, arms: 0x8a7a54, legs: 0x6a6448, hips: 0x3a2a1a, hands: 0x3a3a3a, skin: g1, neck: 0x3a3a3a,
    face: FACES.boba(), headR: 0.32, headH: 0.5, noStud: true, extraHeight: 0.15,
    torsoExtra: (b, d) => {
      const s = d.s;
      for (const sd of [-1, 1]) rbox(b, sd * 0.17 * s, 0.7 * s, 0.22 * s, 0.3 * s, 0.32 * s, 0.05 * s, -0.08, 0, 0, g1);
      rbox(b, 0, 0.42 * s, 0.235 * s, 0.4 * s, 0.18 * s, 0.03 * s, 0, 0, 0, g2);
      b.box(0, d.chestY, 0, 0.95 * s, 0.11 * s, 0.5 * s, 0x3a2a1a);
      b.box(0, 0.86 * s, -0.03 * s, 0.66 * s, 0.12 * s, 0.46 * s, 0x6a5a3a);
      rbox(b, 0, 0.6 * s, 0.25 * s, 0.1 * s, 1.0 * s, 0.03 * s, 0, 0, 0.6, 0x4a2a1a);
      // jetpack (high on the back so its flames clear the seat back)
      b.box(0, 0.45 * s, -0.42 * s, 0.6 * s, 0.55 * s, 0.26 * s, 0xc0c4c8);
      for (const sd of [-1, 1]) b.cyl(sd * 0.25 * s, 0.38 * s, -0.48 * s, 0.1 * s, 0.68 * s, 0xa0a4a8, { seg: 8 });
      b.cone(0, 1.02 * s, -0.46 * s, 0.11 * s, 0.3 * s, C.red, { seg: 8 });
      b.cyl(0, 0.82 * s, -0.46 * s, 0.1 * s, 0.2 * s, 0xa0a4a8, { seg: 8 });
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H * 0.96, 0, R * 1.02, g1, { sy: 0.55 });
      hb.add(FLARE(), plastic(g1), 0, 0, -R * 0.05, 0, R * 1.0, H * 0.4, R * 1.0);
      rod(hb, [R * 0.95, H * 0.6, 0], [R * 1.15, H * 0.6, 0], R * 0.16, 0x3a3a3a, 8);
      rod(hb, [R * 1.12, H * 0.62, 0], [R * 1.12, H * 1.35, R * 0.18], R * 0.07, 0x3a3a3a, 6);
    },
  });
  const s = r.dims.s;
  // jet flames splay out past the seat back
  const fire = flames([[0.3 * s, 0, 0, 0.5, -0.12, -1], [-0.3 * s, 0, 0, -0.5, -0.12, -1]], 1.4, 0.18);
  fire.position.set(0, 0.5 * s, -0.5 * s);
  r.torso.add(fire);
  const gun = handAt(r, -1, blaster('rifle', 1));
  r.fx = (name, f, t) => {
    fire.visible = name === 'cheer' || name === 'trick' || name === 'use' || name === 'win';
    if (fire.visible) fire.scale.setScalar(0.85 + S(t * 31) * 0.1 + S(t * 17) * 0.07);
    gun.visible = strength(name, f, ['cheer', 'win']) > 0;
    shoot(gun, gun.visible, t, 4);
  };
  return r;
}

function cadBane() {
  const coat = 0x7a5a3a, hat = 0x4a3020, blue = 0x3a68aa;
  const r = seatedFig({
    name: 'cadbane', torso: 0x6b2e22, arms: coat, legs: 0x4a4038, hips: 0x4a4038, hands: blue, skin: blue, neck: blue,
    face: FACES.bane(), headR: 0.3, headH: 0.48, noStud: true, extraHeight: 0.3,
    torsoExtra: (b, d) => {
      const s = d.s;
      for (const sd of [-1, 1]) b.add(taperGeo(0.34, 0.24, 0.82, 0.48, 0.44), plastic(coat), sd * 0.3 * s, d.chestY + 0.005 * s, 0, 0, s, s, s);
      b.box(0, d.chestY, 0, 0.6 * s, 0.1 * s, 0.5 * s, 0x2a1a10);
      b.box(0, 0.82 * s, -0.17 * s, 0.86 * s, 0.4 * s, 0.14 * s, coat);   // high collar
      b.box(0, -0.05 * s, -0.27 * s, 1.0 * s, 1.0 * s, 0.06 * s, coat);
      for (const sd of [-1, 1]) b.box(sd * 0.4 * s, -0.25 * s, 0.1 * s, 0.13 * s, 0.32 * s, 0.22 * s, 0x2a1a10);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.cyl(0, H * 0.95, 0, R * 2.3, 0.05, hat, { seg: 22 });
      hb.cyl(0, H * 0.95, 0, R * 1.08, H * 0.62, hat, { seg: 16 });
      hb.cyl(0, H * 1.0, 0, R * 1.1, H * 0.12, 0x2a1a10, { seg: 16 });
      for (const sd of [-1, 1]) rod(hb, [sd * R * 0.95, H * 0.45, R * 0.2], [sd * R * 0.45, H * 0.2, R * 0.9], R * 0.09, 0x9a9a9a, 6);
    },
  });
  const guns = [1, -1].map((sd) => handAt(r, sd, blaster('bane', 1, { flash: false })));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win']);
    const spin = name === 'cheer' ? (f < 0.6 ? f / 0.6 * PI * 6 : 0) : name === 'win' ? (t * 9) % (PI * 2) : 0;
    for (let i = 0; i < 2; i++) {
      const g = guns[i];
      g.visible = k > 0;
      g.rotation.x = i ? spin : -spin;
      shoot(g, name === 'cheer' && f > 0.62, t, 5, i * 0.5);
    }
  };
  return r;
}

// Stormtrooper: domed helmet with a brow ridge, black lenses and the frowning grille,
// white armour plates over a black undersuit, utility belt and an E-11 slung on the back.
const TW = 0xf4f4f4, TB = 0x18181a, TG = 0x8c9198, TBL = 0x5a7896;
const trooperFace = (R, Hc) => printFace('swd-trooper', R, Hc, '#f4f4f4', (g) => {
  for (const sd of [-1, 1]) {
    // teardrop lenses, sloping down and out
    g.fillStyle = '#0b0b0d'; g.beginPath();
    g.moveTo(sd * 0.025, Hc * 0.93);
    g.lineTo(sd * 0.19, Hc * 0.9);
    g.quadraticCurveTo(sd * 0.24, Hc * 0.86, sd * 0.22, Hc * 0.72);
    g.quadraticCurveTo(sd * 0.19, Hc * 0.55, sd * 0.11, Hc * 0.57);
    g.quadraticCurveTo(sd * 0.03, Hc * 0.62, sd * 0.025, Hc * 0.93);
    g.fill();
    poly(g, '#3c4a5a', [[sd * 0.07, Hc * 0.86], [sd * 0.15, Hc * 0.85], [sd * 0.14, Hc * 0.81], [sd * 0.07, Hc * 0.82]]);
    // "tear" vents under the lenses and the blue side tubes
    poly(g, '#3a3c40', [[sd * 0.17, Hc * 0.6], [sd * 0.19, Hc * 0.6], [sd * 0.225, Hc * 0.3], [sd * 0.205, Hc * 0.3]]);
    poly(g, '#6a8ab0', [[sd * 0.26, Hc * 0.48], [sd * 0.3, Hc * 0.48], [sd * 0.31, Hc * 0.06], [sd * 0.27, Hc * 0.06]]);
  }
  // nose ridge and the frown round the grille
  poly(g, '#d6d8dc', [[-0.012, Hc * 0.8], [0.012, Hc * 0.8], [0.02, Hc * 0.5], [-0.02, Hc * 0.5]]);
  g.fillStyle = '#26282c'; g.beginPath();
  g.moveTo(-0.23, Hc * 0.02); g.quadraticCurveTo(-0.17, Hc * 0.5, 0, Hc * 0.5); g.quadraticCurveTo(0.17, Hc * 0.5, 0.23, Hc * 0.02);
  g.lineTo(0.18, Hc * 0.02); g.quadraticCurveTo(0.13, Hc * 0.4, 0, Hc * 0.41); g.quadraticCurveTo(-0.13, Hc * 0.4, -0.18, Hc * 0.02);
  g.closePath(); g.fill();
});
function trooperHelmet(hb, R, H) {
  const Hc = H * 0.62, w = plastic(TW);
  hb.add(HEADCYL(), trooperFace(R, Hc), 0, 0, 0, PI, R, Hc, R);
  hb.addMatrix(HEMI(), w, mat4(0, Hc - 0.01, -R * 0.02, 0, 0, 0, R * 1.05, R * 1.0, R * 1.07));
  hb.addMatrix(FRONTARC(), w, mat4(0, Hc - H * 0.06, 0, 0, 0, 0, R * 1.1, H * 0.08, R * 1.1));   // brow ridge
  hb.add(FLARE(), w, 0, -H * 0.05, 0, 0, R * 1.02, Hc * 0.82, R * 1.02);                          // flared jaw / neck guard
  // the grille: a raised box with black slots, and two little breather tubes under it
  rbox(hb, 0, Hc * 0.26, R * 0.98, R * 0.36, Hc * 0.2, R * 0.1, 0, 0, 0, 0x6a6e74);
  for (let k = -2; k <= 2; k++) rbox(hb, k * R * 0.065, Hc * 0.26, R * 1.03, R * 0.03, Hc * 0.16, R * 0.03, 0, 0, 0, TB);
  for (const sd of [-1, 1]) {
    rod(hb, onHead(sd * 0.2, Hc * 0.1, R * 0.9), onHead(sd * 0.24, -Hc * 0.02, R * 1.08), R * 0.055, TG, 8);
    // ear caps with a grey centre
    rod(hb, [sd * R * 1.0, Hc * 0.5, -R * 0.06], [sd * R * 1.27, Hc * 0.5, -R * 0.06], R * 0.25, TW, 14);
    rod(hb, [sd * R * 1.26, Hc * 0.5, -R * 0.06], [sd * R * 1.3, Hc * 0.5, -R * 0.06], R * 0.15, TG, 12);
    for (const dz of [-0.12, 0, 0.12]) rbox(hb, sd * R * 1.31, Hc * 0.5, (dz - 0.06) * R, R * 0.02, R * 0.2, R * 0.04, 0, 0, 0, TB);
  }
}
function trooper() {
  const r = seatedFig({
    name: 'trooper', torso: TB, arms: TW, legs: TW, hips: TB, hands: TB, skin: TW, neck: TB,
    headR: 0.31, headH: 0.5, noStud: true, extraHeight: 0.2,
    head: (hb, d) => trooperHelmet(hb, d.headR, d.headH),
    torsoExtra: (b, d) => {
      const s = d.s, w = plastic(TW);
      // chest + back armour shell over the black undersuit
      b.add(taperGeo(0.9, 0.76, 0.44, 0.52, 0.48), w, 0, 0.57 * s, 0, 0, s, s, s);
      rbox(b, 0, 0.79 * s, 0.252 * s, 0.46 * s, 0.3 * s, 0.03 * s, -0.05, 0, 0, 0xe4e6ea);   // raised chest plate
      rbox(b, 0, 0.79 * s, 0.27 * s, 0.015 * s, 0.28 * s, 0.01 * s, -0.05, 0, 0, TB);
      for (const sd of [-1, 1]) {
        rbox(b, sd * 0.15 * s, 0.66 * s, 0.264 * s, 0.14 * s, 0.025 * s, 0.01 * s, 0, 0, sd * 0.2, TB);
        rbox(b, sd * 0.33 * s, 0.79 * s, 0.248 * s, 0.03 * s, 0.38 * s, 0.02 * s, -0.04, 0, sd * 0.12, TB);   // chest-plate edges
        rbox(b, sd * 0.16 * s, 0.955 * s, 0.215 * s, 0.22 * s, 0.025 * s, 0.03 * s, 0, 0, -sd * 0.12, TB);    // collar line
      }
      // ab plate with its little control buttons, black ribs either side
      rbox(b, 0, 0.42 * s, 0.232 * s, 0.38 * s, 0.22 * s, 0.03 * s, 0, 0, 0, TW);
      rbox(b, 0, 0.44 * s, 0.25 * s, 0.2 * s, 0.11 * s, 0.01 * s, 0, 0, 0, TG);
      for (let k = 0; k < 4; k++) rbox(b, (-0.075 + k * 0.05) * s, 0.44 * s, 0.257 * s, 0.035 * s, 0.07 * s, 0.01 * s, 0, 0, 0, k % 2 ? TBL : TB);
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) rbox(b, sd * 0.3 * s, (0.33 + k * 0.07) * s, 0.228 * s, 0.14 * s, 0.03 * s, 0.02 * s, 0, 0, 0, 0x3a3c40);
      b.box(0, 0.25 * s, -0.25 * s, 0.7 * s, 0.26 * s, 0.05 * s, TW);   // kidney plate
      // utility belt: pouches, buckle, thermal detonator on the back
      b.box(0, d.chestY - 0.03 * s, 0, 0.97 * s, 0.14 * s, 0.5 * s, TW);
      b.box(0, d.chestY + 0.04 * s, 0, 0.975 * s, 0.025 * s, 0.505 * s, 0xc4c8cc);
      rbox(b, 0, d.chestY + 0.04 * s, 0.255 * s, 0.16 * s, 0.12 * s, 0.03 * s, 0, 0, 0, TG);
      rbox(b, 0, d.chestY + 0.04 * s, 0.272 * s, 0.1 * s, 0.03 * s, 0.01 * s, 0, 0, 0, TB);
      for (const x of [-0.38, -0.24, 0.24, 0.38]) {
        rbox(b, x * s, d.chestY + 0.03 * s, 0.26 * s, 0.11 * s, 0.13 * s, 0.06 * s, 0, 0, 0, TW);
        rbox(b, x * s, d.chestY + 0.09 * s, 0.29 * s, 0.11 * s, 0.015 * s, 0.01 * s, 0, 0, 0, TG);
      }
      rod(b, [-0.12 * s, d.chestY + 0.05 * s, -0.28 * s], [-0.4 * s, d.chestY + 0.05 * s, -0.28 * s], 0.07 * s, 0xb8bcc2, 10);
      for (const x of [-0.18, -0.34]) rod(b, [x * s, d.chestY + 0.05 * s, -0.28 * s], [(x - 0.03) * s, d.chestY + 0.05 * s, -0.28 * s], 0.075 * s, TB, 10);
    },
    arm: (ab, sd, d) => {
      const s = d.s;
      ab.sphere(sd * 0.015 * s, -0.01 * s, 0, 0.16 * s, TW, { sy: 0.85 });   // shoulder bell
      ab.box(0, -0.16 * s, 0, 0.275 * s, 0.05 * s, 0.285 * s, TB);    // undersuit gaps at the bell and elbow
      ab.box(0, -0.42 * s, 0, 0.255 * s, 0.07 * s, 0.275 * s, TB);
    },
  });
  const gun = handAt(r, -1, blaster('rifle', 1));
  // the E-11 rides slung across the back until it's drawn
  const s = r.dims.s, slung = blaster('rifle', 1, { bolts: false, flash: false });
  slung.position.set(0.05 * s, 0.6 * s, -0.25 * s); slung.rotation.set(0, PI, -0.95);
  r.torso.add(slung);
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'throwF']);
    gun.visible = k > 0;
    slung.visible = !gun.visible;
    shoot(gun, (name === 'cheer' && f > 0.15) || name === 'win', t, 6);
  };
  return r;
}

function jawaHead(hb, R, H, robe, y = 0) {
  hb.sphere(0, y + H * 0.55, -R * 0.05, R * 1.05, robe, { sy: 1.0 });
  hb.addMatrix(CONE(), plastic(robe), mat4(0, y + H * 1.2, -R * 0.45, -0.55, 0, 0, R * 0.6, R * 1.3, R * 0.6));
  hb.cyl(0, y - H * 0.05, 0, R * 1.05, H * 0.4, robe, { seg: 14 });
  rod(hb, [0, y + H * 0.5, R * 0.55], [0, y + H * 0.5, R * 1.0], R * 0.7, 0x0c0806, 14);
  for (const sd of [-1, 1]) hb.sphere(sd * R * 0.3, y + H * 0.54, R * 0.98, R * 0.16, 0, { mat: glowMat(0xffd21a, 3.2) });
}
function jawa() {
  const robe = 0x6b4a2e, dk = 0x2a1a10;
  const r = seatedFig({
    name: 'jawa', s: 0.9, torso: robe, arms: robe, legs: robe, hips: robe, hands: dk, skin: robe, neck: robe, headR: 0.34, headH: 0.5,
    head: (hb, d) => jawaHead(hb, d.headR, d.headH, robe),
    extraHeight: 0.25,
    torsoExtra: (b, d) => {
      const s = d.s;
      rbox(b, 0, 0.55 * s, 0.24 * s, 0.12 * s, 0.95 * s, 0.03 * s, 0, 0, 0.6, dk);
      for (let k = 0; k < 4; k++) rbox(b, (-0.2 + k * 0.13) * s, (0.4 + k * 0.1) * s, 0.26 * s, 0.07 * s, 0.08 * s, 0.03 * s, 0, 0, 0.6, 0x8a8e92);
      b.box(0, d.chestY, 0, 0.95 * s, 0.09 * s, 0.5 * s, dk);
    },
  });
  // a second Jawa hitching a ride on the back
  const hiker = new THREE.Group(); hiker.position.set(0.45, 0.3, -0.8); hiker.rotation.y = -0.35;
  const hb = new BrickBuilder(1);
  hb.addMatrix(CONE(), plastic(robe), mat4(0, 0.3, 0, 0, 0, 0, 0.3, 0.75, 0.3));
  for (const sd of [-1, 1]) rod(hb, [sd * 0.16, 0.5, 0.0], [sd * 0.3, 0.75, 0.12], 0.07, robe, 6);
  jawaHead(hb, 0.21, 0.3, robe, 0.6);
  hiker.add(hb.build({ name: 'jawa2' }));
  r.root.add(hiker);
  const rest = hiker.position.y;
  r.fx = (name, f, t) => {
    const party = name === 'cheer' || name === 'win' || name === 'trick';
    hiker.position.y = rest + (party ? A(S(t * 11)) * 0.22 : 0);
    hiker.rotation.z = party ? S(t * 11) * 0.15 : 0;
  };
  return r;
}

// Tusken Raider: a bandage-wrapped head under a hooded cloak, round goggle eyes on metal
// tubes, the spiked breath mask, layered robes with crossed bandoliers and a gaffi stick.
const TK_WRAP = 0xc9b38e, TK_WRAP2 = 0xa88f68, TK_WRAP3 = 0xdcc9a4, TK_CLOAK = 0x6e5236, TK_ROBE = 0x9a7c56, TK_LEATHER = 0x5a3e24;
const tuskenFace = (R, Hc) => printFace('swd-tusken', R, Hc, '#c9b38e', (g) => {
  const cols = ['#bca47c', '#d6c49f', '#ad936c', '#c9b38e', '#cbb690'];
  for (let k = 0; k < 18; k++) {
    const v = -0.12 + k * 0.042, sl = (k % 2 ? 1 : -1) * (0.05 + (k % 3) * 0.02);
    poly(g, cols[k % 5], [[-1.3, v - sl], [1.3, v + sl], [1.3, v + sl + 0.05], [-1.3, v - sl + 0.05]]);
    poly(g, '#8a7350', [[-1.3, v - sl], [1.3, v + sl], [1.3, v + sl + 0.007], [-1.3, v - sl + 0.007]]);
  }
  // soot round the goggles and the mouth
  for (const sd of [-1, 1]) ellipse(g, sd * 0.17, Hc * 0.62, 0.11, 0.085, 'rgba(70,52,34,0.55)');
  ellipse(g, 0, Hc * 0.27, 0.12, 0.09, 'rgba(70,52,34,0.5)');
});
function tuskenHead(hb, R, H) {
  const Hc = H * 0.9, mt = metalMat(0xa4a8ae, 0.32), dm = metalMat(0x50545a, 0.4), lens = plastic(0x0c0c0e, { rough: 0.12 });
  hb.add(HEADCYL(), tuskenFace(R, Hc), 0, 0, 0, PI, R, Hc, R);
  hb.sphere(0, Hc - 0.02, 0, R * 1.03, TK_WRAP, { sy: 0.62 });            // wrapped crown
  hb.sphere(0, Hc + R * 0.42, -R * 0.08, R * 0.5, TK_WRAP2, { sy: 0.55 });  // knot of cloth on top
  // loose bandage bands, each a little skewed
  for (const [y, rx, rz, c] of [[0.9, -0.14, 0.1, TK_WRAP2], [1.0, 0.12, -0.08, TK_WRAP3], [0.06, -0.1, -0.1, TK_WRAP2], [0.4, 0.2, 0.05, TK_WRAP3]]) {
    hb.addMatrix(HEADCYL(), plastic(c), mat4(0, H * y * 0.9, 0, rx, 0, rz, R * 1.05, H * 0.065, R * 1.05));
  }
  hb.add(FLARE(), plastic(TK_CLOAK), 0, -H * 0.12, -R * 0.04, 0, R * 1.1, H * 1.0, R * 1.1);       // hood down the back
  hb.addMatrix(HOOD(), plastic(TK_CLOAK), mat4(0, Hc * 0.95, -R * 0.08, -0.1, 0, 0, R * 1.12, R * 0.74, R * 1.1));
  // round goggle eyes on metal tubes
  const gy = Hc * 0.62;
  for (const sd of [-1, 1]) {
    const a = sd * 0.42;
    rod(hb, onHead(a, gy, R * 0.8), onHead(a * 0.85, gy, R * 1.22), R * 0.2, mt, 12);
    rod(hb, onHead(a * 0.85, gy, R * 1.2), onHead(a * 0.83, gy, R * 1.32), R * 0.245, dm, 12);
    rod(hb, onHead(a * 0.83, gy, R * 1.3), onHead(a * 0.83, gy, R * 1.335), R * 0.17, lens, 12);
  }
  rbox(hb, 0, gy, R * 1.04, R * 0.3, Hc * 0.07, R * 0.12, 0, 0, 0, 0, { mat: mt });    // nose bridge
  rbox(hb, 0, Hc * 0.45, R * 1.02, R * 0.14, Hc * 0.28, R * 0.12, 0, 0, 0, 0, { mat: dm });
  // breath mask with its "teeth"
  const my = Hc * 0.27;
  rod(hb, onHead(0, my + 0.01, R * 0.85), onHead(0, my, R * 1.18), R * 0.23, mt, 12);
  rod(hb, onHead(0, my, R * 1.17), onHead(0, my, R * 1.2), R * 0.17, dm, 12);
  for (const ph of [-1.3, -0.65, 0, 0.65, 1.3]) {
    const x = Math.sin(ph) * R * 0.17, y = my - Math.cos(ph) * R * 0.17;
    hb.addMatrix(CONE(), mt, mat4(x, y - R * 0.04, R * 1.3, PI / 2 + 0.45, 0, -ph * 0.3, R * 0.05, R * 0.3, R * 0.05));
  }
}
function tusken() {
  const tunic = 0xb79b72, pouch = 0x6a4a2a;
  const r = seatedFig({
    name: 'tusken', torso: tunic, arms: TK_WRAP, legs: TK_ROBE, hips: TK_CLOAK, hands: 0x6e5438, skin: TK_WRAP, neck: TK_WRAP2,
    headR: 0.31, headH: 0.52, noStud: true, extraHeight: 0.21,
    head: (hb, d) => tuskenHead(hb, d.headR, d.headH),
    torsoExtra: (b, d) => {
      const s = d.s, ck = plastic(TK_CLOAK);
      // over-robe panels down the front edges, cloak mantle with a ragged hem, cape behind
      for (const sd of [-1, 1]) rbox(b, sd * 0.34 * s, 0.5 * s, 0.24 * s, 0.24 * s, 0.66 * s, 0.03 * s, -0.03, 0, 0, TK_ROBE);
      b.add(taperGeo(1.0, 0.8, 0.22, 0.54, 0.5), ck, 0, 0.82 * s, 0, 0, s, s, s);
      for (let k = 0; k < 9; k++) rbox(b, (-0.42 + k * 0.105) * s, (0.8 - (k % 2) * 0.035) * s, 0.25 * s, 0.1 * s, 0.1 * s, 0.03 * s, 0, 0, ((k % 3) - 1) * 0.25, TK_CLOAK);
      b.box(0, -0.05 * s, -0.27 * s, 1.0 * s, 1.05 * s, 0.07 * s, TK_CLOAK);
      for (let k = 0; k < 6; k++) rbox(b, (-0.42 + k * 0.17) * s, -0.06 * s, -0.27 * s, 0.12 * s, 0.1 * s, 0.07 * s, 0, 0, ((k % 3) - 1) * 0.3, TK_CLOAK);
      // crossed bandoliers with pouches and a canteen
      for (const sd of [-1, 1]) rbox(b, 0, 0.56 * s, 0.252 * s, 0.11 * s, 0.98 * s, 0.03 * s, -0.03, 0, sd * 0.62, TK_LEATHER);
      for (let k = 0; k < 4; k++) {
        const t = -0.3 + k * 0.2;
        rbox(b, -Math.sin(0.62) * t * s, (0.56 + Math.cos(0.62) * t) * s, 0.27 * s, 0.08 * s, 0.09 * s, 0.04 * s, 0, 0, 0.62, k === 1 ? 0x8a8e92 : pouch);
      }
      rod(b, [0.24 * s, 0.4 * s, 0.25 * s], [0.24 * s, 0.4 * s, 0.31 * s], 0.08 * s, 0x8a8e92, 10);
      // cloth sash, leather belt, a flap of cloth hanging over the lap
      b.box(0, d.chestY - 0.03 * s, 0, 0.97 * s, 0.16 * s, 0.51 * s, TK_WRAP2);
      b.box(0, d.chestY + 0.02 * s, 0, 0.975 * s, 0.05 * s, 0.515 * s, TK_LEATHER);
      rbox(b, 0, d.chestY + 0.045 * s, 0.262 * s, 0.09 * s, 0.08 * s, 0.02 * s, 0, 0, 0, 0x8a8e92);
      for (const sd of [-1, 1]) rbox(b, sd * 0.36 * s, d.chestY - 0.01 * s, 0.24 * s, 0.13 * s, 0.14 * s, 0.08 * s, 0, 0, 0, pouch);
      rbox(b, 0.08 * s, d.chestY - 0.12 * s, 0.27 * s, 0.22 * s, 0.26 * s, 0.03 * s, 0.25, 0, 0.08, TK_ROBE);
    },
    arm: (ab, sd, d) => {
      const s = d.s;
      ab.sphere(sd * 0.015 * s, -0.01 * s, 0, 0.15 * s, TK_CLOAK, { sy: 0.8 });   // the cloak over the shoulder
      ab.add(taperGeo(0.28, 0.3, 0.3, 0.3), plastic(TK_ROBE), 0, -0.38 * s, 0, 0, s, s, s);   // loose robe sleeve
      for (let k = 0; k < 3; k++) rbox(ab, 0, (-0.42 - k * 0.075) * s, 0, 0.255 * s, 0.028 * s, 0.275 * s, 0, 0, (k % 2 ? 0.22 : -0.22), TK_WRAP2);
      ab.box(0, -0.62 * s, 0, 0.25 * s, 0.06 * s, 0.27 * s, TK_LEATHER);
    },
  });
  const stick = handAt(r, -1, gaffi(1));
  // the gaffi stick rides on his back, blade up over the shoulder, until he brandishes it
  const s = r.dims.s, slung = gaffi(1);
  slung.position.set(0.02 * s, 0.78 * s, -0.36 * s); slung.rotation.z = -1.2;
  r.torso.add(slung);
  r.fx = (name, f) => {
    stick.visible = strength(name, f, ['cheer', 'win', 'taunt', 'trick']) > 0;
    slung.visible = !stick.visible;
  };
  return r;
}

// ---- gestures -------------------------------------------------------------------------
const tauntArm = (a, x, z) => (a.tauntSide > 0 ? { lx: x, lz: z } : { rx: x, rz: -z });

export default [
  {
    id: 'luke', name: 'Luke Skywalker', blurb: 'Farm boy turned Jedi', weight: 'medium', color: 0x3d8bff,
    voice: { kind: 'human', pitch: 1.08 }, style: { cheer: 'fist', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.3 + S(t * 9) * 0.12, rz: -0.45, lx: -2.6 + S(t * 14) * 0.25, lz: 0.25, ty: -0.12, hx: -0.25, by: A(S(t * 9)) * 0.06 }),
      win: (f, t) => ({ rx: -1.2 + S(t * 4) * 0.15, rz: -0.4 + S(t * 4) * 0.1, lx: -2.7, lz: 0.35 + S(t * 8) * 0.25, hx: -0.25, by: A(S(t * 8)) * 0.07 }),
    },
    build: luke,
  },
  {
    id: 'leia', name: 'Princess Leia', blurb: 'Rebel leader, sharp shot', weight: 'light', color: 0xf4f4f4,
    voice: { kind: 'human', pitch: 1.38 }, style: { cheer: 'point', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.75 + (S(t * 25) > 0.5 ? -0.12 : 0), rz: -0.05, ty: -0.2, hx: -0.1, hy: -0.15, lx: -0.9 }),
      win: (f, t) => ({ rx: -2.7 + S(t * 25) * 0.05, rz: -0.2, lx: -2.5, lz: 0.3 + S(t * 9) * 0.45, hx: -0.25, by: A(S(t * 6)) * 0.05 }),
    },
    build: leia,
  },
  {
    id: 'han', name: 'Han Solo', blurb: 'Scoundrel. Shoots first', weight: 'medium', color: 0x23304a,
    voice: { kind: 'human', pitch: 0.92 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => (f < 0.58 ? { rx: -1.45, rz: -0.25, hz: 0.18, hx: -0.05, ty: -0.1 } : { rx: -1.7, rz: -0.05, ty: -0.25, hz: 0.12, hx: -0.05 }),
      taunt: (f, t, rig, a) => ({ ...tauntArm(a, -2.55, 0.8), hy: a.tauntSide * 0.9, hz: 0.18, ty: a.tauntSide * 0.2 }),
      win: (f, t) => ({ lx: -3.4, lz: -0.5, rx: -3.4, rz: 0.5, tx: -0.22, hx: -0.12, hz: S(t * 2) * 0.1, by: 0.02 }),
    },
    build: han,
  },
  {
    id: 'chewie', name: 'Chewbacca', blurb: 'Mighty Wookiee co-pilot', weight: 'heavy', color: 0x8a6440,
    voice: { kind: 'beast', pitch: 0.78 }, style: { cheer: 'roar', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ hx: -0.7, jaw: 0.85 + S(t * 30) * 0.15, lz: 0.8, rz: -0.8, lx: -2.2 + S(t * 12) * 0.3, rx: -2.2 - S(t * 12) * 0.3, tx: -0.22, tz: S(t * 40) * 0.05 }),
      win: (f, t) => ({ lx: -2.8, rx: -2.8, lz: 0.5 + S(t * 9) * 0.2, rz: -0.5 - S(t * 9) * 0.2, jaw: 0.6 + S(t * 12) * 0.35, hx: -0.5, by: A(S(t * 9)) * 0.08 }),
    },
    build: chewie,
  },
  {
    id: 'r2d2', name: 'R2-D2', blurb: 'Plucky astromech droid', weight: 'light', color: 0x1f55b8,
    voice: { kind: 'droid', pitch: 1.0 }, style: { cheer: 'beep', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.6 + S(t * 16) * 0.6, rx: -1.6 - S(t * 16) * 0.6, by: A(S(t * 12)) * 0.12, tz: S(t * 12) * 0.12 }),
      win: (f, t) => ({ lx: -1.7 + S(t * 14) * 0.5, rx: -1.7 - S(t * 14) * 0.5, by: A(S(t * 7)) * 0.1, tz: S(t * 7) * 0.14 }),
      taunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.5, tz: a.tauntSide * 0.16, by: A(S(t * 18)) * 0.05 }),
      trick: (f) => ({ by: S(f * PI) * 0.3, lx: -0.2, rx: -0.2, tx: 0.12 }),
    },
    build: r2d2,
  },
  {
    id: 'c3po', name: 'C-3PO', blurb: 'Fluent in six million...', weight: 'medium', color: GOLD,
    voice: { kind: 'robot', pitch: 1.22 }, style: { cheer: 'clap', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.5 + S(t * 22) * 0.75, rx: -1.5 + S(t * 22 + 3) * 0.75, lz: 0.45, rz: -0.45, hy: S(t * 11) * 0.35, tz: S(t * 22) * 0.04, hx: -0.15 }),
      ouch: (f, t) => ({ lx: -2.9 + S(t * 30) * 0.1, rx: -2.9 - S(t * 30) * 0.1, lz: 0.35, rz: -0.35, tx: -0.25, hx: -0.35, tz: S(t * 30) * 0.05, hy: S(t * 15) * 0.3 }),
      taunt: (f) => ({ tx: 0.4 * S(f * PI), hx: 0.3 * S(f * PI), lx: -0.5, rx: -0.5, lz: 0.2, rz: -0.2 }),
      win: (f, t) => ({ lx: -1.6 + S(t * 18) * 0.7, rx: -1.6 + S(t * 18 + 3) * 0.7, lz: 0.4, rz: -0.4, hy: S(t * 9) * 0.3, by: A(S(t * 9)) * 0.05 }),
    },
    build: c3po,
  },
  {
    id: 'yoda', name: 'Yoda', blurb: 'Judge me by size, do you?', weight: 'light', color: 0x3aff4a,
    voice: { kind: 'squeak', pitch: 1.05 }, style: { cheer: 'spin', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ ty: f * PI * 2, by: S(f * PI) * 0.35, rx: -1.25, rz: -0.6, lx: -0.5, lz: 1.1, hx: -0.2 }),
      win: (f, t) => ({ rx: -1.5, rz: -0.25, lx: -1.7, lz: 0.45, by: A(S(t * 6)) * 0.12, hx: -0.2, hz: S(t * 3) * 0.12 }),
      taunt: (f, t, rig, a) => ({ ...tauntArm(a, -2.0, 0.25 + S(t * 16) * 0.3), hy: a.tauntSide * 0.6, hz: S(t * 8) * 0.15 }),
    },
    build: yoda,
  },
  {
    id: 'mando', name: 'The Mandalorian', blurb: 'This is the way', weight: 'medium', color: BESKAR,
    voice: { kind: 'human', pitch: 0.85 }, style: { cheer: 'point', trick: 'superman' },
    gestures: {
      cheer: (f, t) => (f < 0.7 ? { rx: -1.55, rz: -0.25, hx: -0.05, hz: S(t * 5) * 0.06 } : { rx: -1.75, rz: -0.05, ty: -0.22, hx: -0.05 }),
      taunt: (f, t, rig, a) => ({ hy: a.tauntSide * 1.1, ty: a.tauntSide * 0.25, hx: 0.3 * A(S(f * PI * 2)) }),
      win: (f, t) => ({ rx: -1.6, rz: -0.3, lx: -0.8, hx: -0.1, hz: S(t * 2) * 0.06 }),
    },
    build: mando,
  },
  {
    id: 'grogu', name: 'Grogu', blurb: 'Small, green, Force-strong', weight: 'light', color: 0x8ab070,
    voice: { kind: 'squeak', pitch: 1.55 }, style: { cheer: 'wave', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ rx: -2.1 + S(t * 3) * 0.08, rz: -0.25, hz: 0.25, hx: -0.15, hy: -0.2, lx: -0.6 }),
      win: (f, t) => ({ rx: -2.2, rz: -0.3, lx: -2.2 + S(t * 10) * 0.3, lz: 0.3, hz: S(t * 5) * 0.2, by: A(S(t * 5)) * 0.06 }),
      use: (f, t) => ({ rx: -2.1, rz: -0.25, hz: 0.25, hx: -0.15 }),
    },
    build: grogu,
  },
  {
    id: 'vader', name: 'Darth Vader', blurb: 'Dark Lord of the Sith', weight: 'heavy', color: 0xff2010,
    voice: { kind: 'deep', pitch: 0.6 }, style: { cheer: 'point', trick: 'arms' },
    gestures: {
      // the Force choke: right hand out, pinching, trembling
      cheer: (f, t) => ({ rx: -1.5 + S(t * 45) * 0.025, rz: 0.08, ty: -0.22, hx: -0.06, hz: 0.1, lx: -0.85, tx: 0.05 }),
      taunt: (f, t, rig, a) => ({ ...tauntArm(a, -1.55, 0.7), hy: a.tauntSide * 0.9, ty: a.tauntSide * 0.25 }),
      win: (f, t) => ({ rx: -1.35, rz: -0.3, lx: -0.9, lz: 0.1, hx: -0.08, by: S(t * 2.4) * 0.02 }),
    },
    build: vader,
  },
  {
    id: 'maul', name: 'Darth Maul', blurb: 'Double-bladed menace', weight: 'medium', color: 0xb3141c,
    voice: { kind: 'deep', pitch: 0.95 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.55, rz: -0.2, ty: -0.15, hx: -0.12, by: A(S(t * 12)) * 0.04 }),
      win: (f, t) => ({ rx: -2.95, rz: 0.1, lx: -1.1, lz: 0.2, hx: -0.3, by: A(S(t * 8)) * 0.05 }),
    },
    build: maul,
  },
  {
    id: 'boba', name: 'Boba Fett', blurb: 'Jetpack bounty hunter', weight: 'medium', color: 0x5a6b3a,
    voice: { kind: 'human', pitch: 0.8 }, style: { cheer: 'fist', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ by: S(f * PI) * 0.3, rx: -2.6 + S(t * 14) * 0.3, rz: -0.2, hx: -0.25, tz: S(t * 7) * 0.05 }),
      win: (f, t) => ({ by: 0.12 + S(t * 4) * 0.06, rx: -2.6, rz: -0.25, lx: -1.7, lz: 0.3, hx: -0.2 }),
    },
    build: boba,
  },
  {
    id: 'cadbane', name: 'Cad Bane', blurb: 'Fastest draw in the galaxy', weight: 'medium', color: 0x3a68aa,
    voice: { kind: 'human', pitch: 0.72 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.55, rx: -1.55, lz: 0.05, rz: -0.05, hx: -0.06, hz: S(t * 4) * 0.1, tx: 0.06 }),
      taunt: (f, t, rig, a) => ({ rx: -2.75, rz: 0.55, hx: 0.25 * S(f * PI), hy: -a.tauntSide * 0.3 }),
      win: (f, t) => ({ lx: -2.3, rx: -2.3, lz: 0.4, rz: -0.4, hx: -0.15, tx: -0.08 }),
    },
    build: cadBane,
  },
  {
    id: 'trooper', name: 'Stormtrooper', blurb: 'Rarely hits the target', weight: 'medium', color: 0xe8e8e8,
    voice: { kind: 'robot', pitch: 0.95 }, style: { cheer: 'point', trick: 'arms' },
    gestures: {
      // sprays blaster fire in every direction except the target
      cheer: (f, t) => ({ rx: -1.65 + S(t * 6) * 0.35, rz: -0.1, lx: -1.5, lz: -0.55, ty: S(t * 4) * 0.45, hy: S(t * 4) * 0.35 }),
      win: (f, t) => ({ rx: -2.6, rz: -0.2, lx: -2.4, lz: 0.4 + S(t * 9) * 0.3, hx: -0.2, by: A(S(t * 6)) * 0.05 }),
    },
    build: trooper,
  },
  {
    id: 'jawas', name: 'Jawas', blurb: 'Utinni! Scrap traders', weight: 'light', color: 0xffd21a,
    voice: { kind: 'squeak', pitch: 1.65 }, style: { cheer: 'both', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ lx: -2.9, rx: -2.9, lz: 0.4 + S(t * 16) * 0.25, rz: -0.4 - S(t * 16) * 0.25, by: A(S(t * 9)) * 0.16, hx: -0.3, tz: S(t * 9) * 0.08 }),
      win: (f, t) => ({ lx: -2.9, rx: -2.9, lz: 0.4 + S(t * 14) * 0.25, rz: -0.4 - S(t * 14) * 0.25, by: A(S(t * 7)) * 0.14, hx: -0.3 }),
    },
    build: jawa,
  },
  {
    id: 'tusken', name: 'Tusken Raider', blurb: 'Sand People warrior', weight: 'medium', color: 0xc8b090,
    voice: { kind: 'beast', pitch: 1.15 }, style: { cheer: 'both', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: -2.55 + S(t * 18) * 0.22, rx: -2.55 + S(t * 18) * 0.22, lz: -0.32, rz: 0.32, tx: -0.12, hx: -0.35, by: A(S(t * 9)) * 0.08, tz: S(t * 9) * 0.08 }),
      win: (f, t) => ({ lx: -2.6 + S(t * 10) * 0.2, rx: -2.6 + S(t * 10) * 0.2, lz: -0.32, rz: 0.32, hx: -0.35, by: A(S(t * 5)) * 0.08 }),
      taunt: (f, t, rig, a) => ({ rx: -2.4 + S(t * 16) * 0.25, rz: -0.3, hy: a.tauntSide * 1.0, ty: a.tauntSide * 0.3 }),
    },
    build: tusken,
  },
];
