// Star Wars drivers. Helmets, faces and colours match the brick
// characters on the Tatooine Podrace map (../maps/starwars-props.js); props such as
// lightsabers and blasters live in starwars-parts.js and only appear (ignite, twirl,
// fire) while a gesture plays.
import { seatedFig, taperGeo } from './kit.js';
import { FACES } from '../maps/starwars-props.js';
import {
  THREE, BrickBuilder, C, plastic, mat4, rbox, rod, glowMat, S, A, PI,
  metalMat, CONE, HEMI, BOWL, HOOD, FLARE, HEADCYL, HALFCYL, FACE, hair, handAt, saber, blaster, gaffi, flames,
  strength, showSaber, shoot,
} from './starwars-parts.js';

const GOLD = 0xd9a520, BESKAR = 0xc6cad2;

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

function c3po() {
  const r = seatedFig({
    name: 'c3po', torso: GOLD, arms: GOLD, legs: GOLD, hips: GOLD, hands: GOLD, skin: GOLD, neck: 0x5a4418,
    face: FACES.c3po(), headR: 0.31, headH: 0.48, noStud: true, extraHeight: 0.1,
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, d.chestY + 0.05 * s, 0, 0.84 * s, 0.16 * s, 0.4 * s, 0x3a3a3a);
      for (const [x, c] of [[-0.14, C.red], [0.0, C.blue], [0.13, 0x2a2a2a]]) rod(b, [x * s, d.chestY + 0.05 * s, 0.215 * s], [x * s + 0.04 * s, d.chestY + 0.22 * s, 0.215 * s], 0.025 * s, c, 6);
      rbox(b, 0, 0.72 * s, 0.215 * s, 0.4 * s, 0.24 * s, 0.03 * s, -0.08, 0, 0, 0xb8861a);
      b.cyl(0, 0.72 * s, 0.2 * s, 0.05 * s, 0.05 * s, 0x6a5020, { seg: 8 });
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H, 0, R, GOLD, { sy: 0.42 });
      for (const sd of [-1, 1]) rod(hb, [sd * R * 0.9, H * 0.5, 0], [sd * R * 1.16, H * 0.5, 0], R * 0.34, 0xb8861a, 10);
    },
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

function trooper() {
  const r = seatedFig({
    name: 'trooper', torso: C.white, arms: C.white, legs: C.white, hips: 0x222222, hands: 0x222222, skin: C.white, neck: 0x222222,
    face: FACES.trooper(), headR: 0.32, headH: 0.5, noStud: true, extraHeight: 0.12,
    torsoExtra: (b, d) => {
      const s = d.s;
      b.box(0, d.chestY + 0.11 * s, 0.03 * s, 0.82 * s, 0.22 * s, 0.42 * s, 0x2a2a2a);
      for (let k = 0; k < 3; k++) b.box(0, d.chestY + (0.13 + k * 0.07) * s, 0.22 * s, 0.5 * s, 0.035 * s, 0.03 * s, 0xd8d8d8);
      b.box(0, d.chestY, 0, 0.96 * s, 0.1 * s, 0.5 * s, C.white);
      b.box(-0.2 * s, d.chestY - 0.01 * s, 0.25 * s, 0.14 * s, 0.12 * s, 0.03 * s, 0x8a8e92);
      rbox(b, 0, 0.72 * s, 0.215 * s, 0.56 * s, 0.26 * s, 0.03 * s, -0.08, 0, 0, 0xe8e8e8);
      for (const sd of [-1, 1]) b.box(sd * 0.2 * s, 0.74 * s, 0.235 * s, 0.1 * s, 0.05 * s, 0.02 * s, 0x2a5aaa);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H * 0.94, 0, R * 1.06, C.white, { sy: 0.62 });
      hb.add(FLARE(), plastic(C.white), 0, 0, 0, 0, R * 1.0, H * 0.45, R * 1.0);
      rbox(hb, 0, H * 0.85, R * 0.9, R * 1.4, H * 0.08, R * 0.25, 0.2, 0, 0, C.white);
    },
  });
  const gun = handAt(r, -1, blaster('rifle', 1));
  r.fx = (name, f, t) => {
    const k = strength(name, f, ['cheer', 'win', 'throwF']);
    gun.visible = k > 0;
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

function tusken() {
  const wrap = 0xc8b090, robe = 0xb09a7a;
  const r = seatedFig({
    name: 'tusken', torso: wrap, arms: wrap, legs: robe, hips: 0x8a6a4a, hands: 0xa08a6a, skin: wrap, neck: wrap,
    face: FACES.tusken(), headR: 0.31, headH: 0.52, noStud: true, extraHeight: 0.1,
    torsoExtra: (b, d) => {
      const s = d.s;
      rbox(b, 0, 0.58 * s, 0.24 * s, 0.13 * s, 1.05 * s, 0.03 * s, 0, 0, 0.62, 0x6a4a2a);
      rbox(b, 0, 0.58 * s, -0.24 * s, 0.13 * s, 1.05 * s, 0.03 * s, 0, 0, -0.62, 0x6a4a2a);
      b.box(0, 0.8 * s, -0.02 * s, 0.98 * s, 0.22 * s, 0.5 * s, robe);   // poncho
      b.box(0, d.chestY, 0, 0.96 * s, 0.1 * s, 0.5 * s, 0x6a4a2a);
    },
    headExtra: (hb, d) => {
      const R = d.headR, H = d.headH;
      hb.sphere(0, H * 0.95, 0, R * 1.08, wrap, { sy: 0.6 });
      for (const y of [0.25, 0.85]) hb.cyl(0, H * y, 0, R * 1.04, H * 0.07, 0xa08a6a, { seg: 16 });
      for (const sd of [-1, 1]) {
        const a = sd * 0.44;
        rod(hb, [Math.sin(a) * R * 0.9, H * 0.56, Math.cos(a) * R * 0.9], [Math.sin(a) * R * 1.22, H * 0.56, Math.cos(a) * R * 1.22], R * 0.2, 0x6a6a6a, 10);
        rod(hb, [Math.sin(a) * R * 1.2, H * 0.56, Math.cos(a) * R * 1.2], [Math.sin(a) * R * 1.24, H * 0.56, Math.cos(a) * R * 1.24], R * 0.14, 0x111111, 10);
      }
      rod(hb, [0, H * 0.25, R * 0.9], [0, H * 0.25, R * 1.12], R * 0.17, 0x6a6a6a, 8);
    },
  });
  const stick = handAt(r, -1, gaffi(1));
  r.fx = (name, f) => { stick.visible = strength(name, f, ['cheer', 'win', 'taunt', 'trick']) > 0; };
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
