// Appearance of every playable sorcerer: procedurally painted skins, hair
// strands, capes and signature props, built on the shared Rig.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';
import { hashStr } from '../util.js';

function paintHumanoid(S, o) {
  const skin = o.skinTone ?? 0xf0c8a8;
  const tone = (hex, f) => { const c = new THREE.Color(hex); return c.setRGB(Math.min(1, c.r * f), Math.min(1, c.g * f), Math.min(1, c.b * f)); };
  // Surface kinds steer the HD skin pass (character.js): skin stays smooth,
  // hair gets strands, cloth gets weave/folds, buttons glint, shoes are leather.
  S.mat = 'skin';
  // head
  S.box(0, 0, 8, 8, 8, skin, 0.05);
  // hair base on head top/back/sides
  S.mat = 'hair';
  S.rect(8, 0, 8, 8, o.hair, 0.12);
  S.rect(24, 8, 8, o.hairBack ?? 6, o.hair, 0.12);        // back
  S.rect(0, 8, 8, o.hairSide ?? 3, o.hair, 0.12);         // right side
  S.rect(16, 8, 8, o.hairSide ?? 3, o.hair, 0.12);        // left side
  S.rect(8, 8, 8, o.fringe ?? 2, o.hair, 0.12);           // fringe
  if (o.undercut) { S.rect(0, 11, 8, 3, o.undercut, 0.1); S.rect(16, 11, 8, 3, o.undercut, 0.1); S.rect(24, 13, 8, 2, o.undercut, 0.1); }
  // fringe tips: a jagged lower edge instead of a straight line
  const fr = 8 + (o.fringe ?? 2);
  if (!o.blindfold) for (const x of [9, 12, 14]) S.fineRect(x, fr, 0.5, 0.5, tone(o.hair, 0.9), 'hair');
  // face (front of head at 8,8)
  S.mat = 'eye';
  const ey = 8 + (o.eyeRow ?? 4);
  const eye = o.eye ?? 0x3a2a1a, white = o.eyeWhite ?? 0xffffff, brow = o.brow ?? o.hair;
  S.px(9, ey, white); S.px(10, ey, eye);
  S.px(13, ey, eye); S.px(14, ey, white);
  S.px(9, ey - 1, brow); S.px(10, ey - 1, brow); S.px(13, ey - 1, brow); S.px(14, ey - 1, brow);
  S.mat = 'skin';
  S.px(11, ey + 2, 0xc89a88); S.px(12, ey + 2, 0xc89a88);
  // HD face detail: shaped brows, upper lashes, catch-light + shaded iris,
  // and a thin mouth line (all sub-pixel, 64px layout intact)
  if (!o.blindfold) {
    const lash = new THREE.Color(brow).lerp(new THREE.Color(0x1a1210), 0.88), skinC = new THREE.Color(skin);
    for (const [wx, ix, outer] of [[9, 10, 9], [14, 13, 14.5]]) {
      S.fineRect(Math.min(wx, ix), ey - 1, 2, 0.5, brow);                // brow (upper half)
      S.fineRect(Math.min(wx, ix), ey - 0.5, 2, 0.5, lash);              // lash line
      S.fine(outer, ey - 0.5, skinC, 'skin');                            // open the outer corner
      S.fine(ix, ey, tone(eye, 1.4).lerp(new THREE.Color(1, 1, 1), 0.7)); // catch-light
      S.fine(ix + 0.5, ey + 0.5, tone(eye, 0.55));                       // pupil
      S.fine(wx === 9 ? 9 : 14.5, ey + 0.5, tone(white, 0.86));          // white falls into shadow at the corner
    }
    S.fineRect(11, ey + 2, 2, 0.5, skinC, 'skin');                        // mouth: a thin line
    S.fineRect(11.5, ey + 2.5, 1, 0.5, 0xa8706a);
    S.fine(11, ey + 2.5, 0xc08a80); S.fine(12.5, ey + 2.5, 0xc08a80);
  }
  if (o.tattoo) {  // Sukuna's markings + second eyes
    S.mat = 'eye';
    S.px(9, ey + 1, 0x111111); S.px(10, ey + 1, 0x111111); S.px(13, ey + 1, 0x111111); S.px(14, ey + 1, 0x111111);
    S.px(10, ey + 2, 0xb01010); S.px(13, ey + 2, 0xb01010);
    S.fine(10, ey + 2, 0xff7a6a); S.fine(13, ey + 2, 0xff7a6a);
    S.px(8, ey + 3, 0x111111); S.px(15, ey + 3, 0x111111); S.px(11, 8 + 7, 0x111111); S.px(12, 8 + 7, 0x111111);
    S.px(11, 8 + 2, 0x111111); S.px(12, 8 + 2, 0x111111);
  }
  if (o.blindfold) {
    S.mat = 'cloth';
    S.rect(0, ey - 1, 32, 2, 0x111216, 0.05);
    S.fineRect(0, ey - 1, 32, 0.5, 0x23252c, 'cloth');                    // folded top edge of the wrap
  }
  if (o.blush) { S.mat = 'skin'; S.px(9, ey + 1, 0xe8a0a0); S.px(14, ey + 1, 0xe8a0a0); S.fine(9, ey + 1, 0xf0b4b0, 'skin'); S.fine(14.5, ey + 1, 0xf0b4b0, 'skin'); }
  // hat layer (hair volume) — transparent except painted cells
  if (o.hairVolume) {
    S.mat = 'hair';
    S.rect(40, 0, 8, 8, o.hair, 0.15);            // top
    S.rect(40, 8, 8, o.fringe ?? 2, o.hair, 0.15); // front fringe
    S.rect(32, 8, 8, o.hairSide ?? 4, o.hair, 0.15); S.rect(48, 8, 8, o.hairSide ?? 4, o.hair, 0.15);
    S.rect(56, 8, 8, o.hairBack ?? 6, o.hair, 0.15);
    if (o.bob) { S.rect(32, 8, 8, 7, o.hair, 0.15); S.rect(48, 8, 8, 7, o.hair, 0.15); S.rect(56, 8, 8, 7, o.hair, 0.15); }
    // ragged tips on the volume layer's fringe and sides
    const vf = 8 + (o.fringe ?? 2);
    for (const x of [40.5, 43, 46]) S.fineRect(x, vf, 0.5, 0.5, tone(o.hair, 0.92), 'hair');
    const vs = 8 + (o.bob ? 7 : (o.hairSide ?? 4));
    for (const x of [32, 34.5, 37, 48.5, 51, 53.5]) S.fineRect(x, vs, 0.5, 0.5, tone(o.hair, 0.88), 'hair');
  }
  // torso
  S.mat = 'cloth';
  S.box(16, 16, 8, 12, 4, o.top, 0.08);
  if (o.kimono) {
    for (let y = 0; y < 12; y++) { S.px(20 + 3 + (y < 6 ? -Math.floor(y / 2) : 0), 20 + y, 0x9a9488); }
    S.rect(20, 28, 8, 2, o.sash ?? 0x1a1a1a, 0.05);
    S.fineRect(20, 28, 8, 0.5, tone(o.sash ?? 0x1a1a1a, 1.6), 'cloth');   // sash top edge
  } else {
    S.rect(23, 20, 2, 12, o.topTrim ?? 0x1a1d2a, 0.05);
    S.mat = 'metal';
    for (let y = 22; y < 32; y += 3) S.px(24, y, o.buttons ?? 0xd8b440);
    S.mat = 'cloth';
    S.rect(20, 20, 8, 2, o.collar ?? o.top, 0.05);
    S.fineRect(20, 21.5, 8, 0.5, tone(o.collar ?? o.top, 0.7), 'cloth');  // collar shadow line
  }
  if (o.hood) { S.rect(32, 20, 8, 4, o.hood, 0.08); S.rect(20, 20, 8, 2, o.hood, 0.06); S.rect(16, 20, 4, 3, o.hood, 0.06); S.rect(28, 20, 4, 3, o.hood, 0.06); }
  if (o.scarf) { S.rect(16, 20, 24, 3, o.scarf, 0.1); }
  // arms (sleeves + hands)
  S.box(40, 16, 4, 12, 4, o.sleeve ?? o.top, 0.08);
  S.box(32, 48, 4, 12, 4, o.sleeve ?? o.top, 0.08);
  for (const [u, v] of [[40, 16], [32, 48]]) {
    S.mat = 'skin';
    S.rect(u, v + 4 + 9, 16, 3, skin, 0.04); S.rect(u + 8, v, 4, 4, skin, 0.04);
    // cuff shadow falling on the wrist
    S.fineRect(u, v + 4 + 9, 16, 0.5, tone(skin, 0.86), 'skin');
    S.mat = 'cloth';
    if (o.wrap) S.rect(u, v + 4 + 7, 16, 2, o.wrap, 0.05);
  }
  // legs
  S.box(0, 16, 4, 12, 4, o.pants, 0.08);
  S.box(16, 48, 4, 12, 4, o.pants, 0.08);
  for (const [u, v] of [[0, 16], [16, 48]]) {
    S.mat = 'cloth';
    if (o.skirt) S.rect(u, v + 4, 16, 4, o.skirt, 0.06);
    if (o.skirt) for (let x = 0; x < 16; x += 2) S.fineRect(u + x + 0.5, v + 4, 0.5, 4, tone(o.skirt, 0.8), 'cloth');   // pleats
    if (o.tights) S.rect(u, v + 8, 16, 6, o.tights, 0.05);
    S.mat = 'leather';
    const shoe = o.shoes ?? 0x1a1a1a;
    S.rect(u, v + 4 + 10, 16, 2, shoe, 0.05); S.rect(u + 8, v, 4, 4, shoe, 0.05);
    S.fineRect(u, v + 4 + 11.5, 16, 0.5, tone(shoe, 0.6), 'leather');      // sole
    S.fineRect(u + 4, v + 4 + 10, 4, 0.5, tone(shoe, 1.5), 'leather');     // toe-cap shine
  }
  S.mat = 'cloth';   // paintExtra() hooks paint cloth unless they say otherwise
}

// Streaky, slightly glossy strand material (see Skin.hairMaterial).
const hairMat = (c, emissive = 0) => Skin.hairMaterial(c, emissive);

export const SORCERER_LOOKS = {
  gojo: {
    paint: { skinTone: 0xf4d8c4, hair: 0xf4f6ff, hairVolume: true, blindfold: true, top: 0x1b2030, collar: 0x151822, pants: 0x1b2030, fringe: 2, hairSide: 3, hairBack: 5, brow: 0xf4f6ff, eye: 0x6ad8ff },
    hair: (m) => [
      { x: -2.5, y: 8, z: 1, w: 3, h: 4, d: 3, rx: -0.3, rz: 0.4, material: m },
      { x: 0, y: 8.5, z: 0, w: 3, h: 5, d: 3, rx: -0.1, material: m },
      { x: 2.5, y: 8, z: 1, w: 3, h: 4, d: 3, rx: -0.3, rz: -0.4, material: m },
      { x: -1, y: 8, z: -2.5, w: 3, h: 4, d: 3, rx: -0.7, rz: 0.2, material: m },
      { x: 1.5, y: 8, z: -2.5, w: 3, h: 3.5, d: 3, rx: -0.8, rz: -0.25, material: m },
      { x: 0, y: 7.5, z: 3.5, w: 5, h: 2.5, d: 2, rx: 0.9, material: m },
    ],
    hairColor: 0xf4f6ff, accent: 0x6ad8ff,
  },
  yuji: {
    paint: { skinTone: 0xf0c8a8, hair: 0xf28aa2, undercut: 0x3a2418, hairVolume: true, top: 0x1d2335, hood: 0xb8232f, pants: 0x1d2335, eye: 0x5a3018, fringe: 2 },
    hair: (m) => [
      { x: -2, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.5, rz: 0.2, material: m },
      { x: 1.5, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.6, rz: -0.2, material: m },
      { x: 0, y: 8, z: -1, w: 4, h: 2.5, d: 4, rx: -0.3, material: m },
    ],
    hairColor: 0xf28aa2, accent: 0xff4a3a,
  },
  megumi: {
    paint: { skinTone: 0xecc8ae, hair: 0x15171f, hairVolume: true, top: 0x1b2030, pants: 0x1b2030, eye: 0x2a6a6a, fringe: 3, hairSide: 4, hairBack: 6 },
    hair: (m) => [
      { x: -3, y: 7.5, z: 0, w: 3, h: 4, d: 3, rz: 0.9, material: m },
      { x: 3, y: 7.5, z: 0, w: 3, h: 4, d: 3, rz: -0.9, material: m },
      { x: -1.5, y: 8, z: -2, w: 3, h: 5, d: 3, rx: -0.6, rz: 0.4, material: m },
      { x: 1.5, y: 8, z: -2, w: 3, h: 5, d: 3, rx: -0.6, rz: -0.4, material: m },
      { x: 0, y: 8.5, z: 1, w: 3, h: 4, d: 3, rx: 0.2, material: m },
      { x: 0, y: 6, z: -4, w: 5, h: 4, d: 2, rx: -1.2, material: m },
    ],
    hairColor: 0x15171f, accent: 0x6a7bff,
  },
  nobara: {
    paint: { skinTone: 0xf2cfb4, hair: 0xb8672a, hairVolume: true, bob: true, top: 0x1b2030, pants: 0x1b2030, skirt: 0x1b2030, tights: 0x121212, eye: 0x7a4a1a, fringe: 3, hairSide: 7, hairBack: 7, blush: true },
    hair: (m) => [
      { x: -3.5, y: 2, z: 0, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 40 },
      { x: 3.5, y: 2, z: 0, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 40 },
      { x: 0, y: 2, z: -3.5, w: 8, h: 3, d: 2, hang: true, material: m, stiff: 40 },
    ],
    hairColor: 0xb8672a, accent: 0xffa050,
  },
  sukuna: {
    paint: { skinTone: 0xf0c8a8, hair: 0xe87a92, undercut: 0x2a1812, hairVolume: true, top: 0xece6d8, kimono: true, sash: 0x151515, scarf: 0x161616, pants: 0x2a2a2e, sleeve: 0xece6d8, eye: 0xd01818, tattoo: true, fringe: 2, shoes: 0x3a2a1a },
    hair: (m) => [
      { x: -2, y: 8, z: 1.5, w: 3, h: 3, d: 3, rx: -0.5, rz: 0.4, material: m },
      { x: 1.5, y: 8, z: 1.5, w: 3, h: 3, d: 3, rx: -0.5, rz: -0.4, material: m },
      { x: 0, y: 8.5, z: -1, w: 4, h: 3.5, d: 4, rx: -0.7, material: m },
    ],
    hairColor: 0xe87a92, accent: 0xff2a3a,
  },
};

// Other modules (one per technique) add their sorcerer's appearance here.
// look: { paint, hair(m), hairColor, accent, emit, cape: { color, length, width, segments }, props(rig, kit) }
export function registerLook(id, look) { SORCERER_LOOKS[id] = look; SKINS.delete(id); }
// Painted skins are deterministic per look id: painted once, shared by every rig with that look
// (region people, crowds of NPCs, re-entering a region over a border).
const SKINS = new Map();
export function skinTexture(id) {
  let m = SKINS.get(id);
  if (!m) {
    const look = SORCERER_LOOKS[id] ?? SORCERER_LOOKS.yuji;
    const S = new Skin(hashStr(id));
    paintHumanoid(S, look.paint);
    look.paintExtra?.(S);
    m = S.texture();
    SKINS.set(id, m);
  }
  return m;
}

// Helpers handed to look.props() for building signature props from boxes.
export const PROP_KIT = {
  PX,
  mat: (color, o = {}) => new THREE.MeshStandardNodeMaterial({ color, roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0, emissive: o.emissive ? (o.emissiveColor ?? color) : 0x000000, emissiveIntensity: o.emissive ?? 0 }),
  box(parent, w, h, d, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), material);
    m.position.set(x * PX, y * PX, z * PX); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
  },
};

const CAPES = {
  sukuna: { color: 0xece6d8, roughness: 0.9, segments: 3, length: 9, width: 9 },
  gojo: { color: 0x1b2030, segments: 3, length: 8, width: 8 },
  megumi: { color: 0x151822, segments: 3, length: 9, width: 8 },
  yuji: { color: 0xb8232f, segments: 2, length: 5, width: 7 },
  nobara: { color: 0x1b2030, segments: 2, length: 5, width: 9 },
};
const EMIT = { gojo: 0.6, sukuna: 0.8 };

export function buildSorcererModel(id) {
  const look = SORCERER_LOOKS[id] ?? SORCERER_LOOKS.yuji;
  const map = skinTexture(SORCERER_LOOKS[id] ? id : 'yuji');
  const material = makeCharMaterial(map, { emitStrength: look.emit ?? EMIT[id] ?? 0 });
  material.alphaTest = 0.5;
  const hm = hairMat(look.hairColor, look.hairEmissive ?? 0);
  const spec = { material, hair: look.hair ? look.hair(hm) : [], hairMaterial: hm, scale: look.scale ?? 1.18 };
  const cape = look.cape === undefined ? CAPES[id] : look.cape;
  if (cape) spec.cape = { material: new THREE.MeshStandardNodeMaterial({ color: cape.color, roughness: cape.roughness ?? 0.85 }), segments: cape.segments ?? 3, length: cape.length ?? 8, width: cape.width ?? 8 };
  const rig = new Rig(spec);
  // signature props
  if (id === 'nobara') {
    const hammer = new THREE.Group();
    const wood = new THREE.MeshStandardNodeMaterial({ color: 0x6a4a2a, roughness: 0.8 });
    const metal = new THREE.MeshStandardNodeMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.9 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(1.2 * PX, 12 * PX, 1.2 * PX), wood); handle.position.y = -2 * PX;
    const head = new THREE.Mesh(new THREE.BoxGeometry(5 * PX, 2.5 * PX, 2.5 * PX), metal); head.position.y = -8 * PX;
    hammer.add(handle, head); hammer.rotation.x = Math.PI / 2; hammer.position.z = 3 * PX;
    handle.castShadow = head.castShadow = true;
    rig.handR.add(hammer); rig.extras.weapon = hammer;
  }
  look.props?.(rig, PROP_KIT);
  rig.look = look;
  return rig;
}

// Straw training dummy for the hub / test room.
export function buildDummy() {
  const S = new Skin(77);
  S.box(0, 0, 8, 8, 8, 0xd8c078, 0.2); S.rect(9, 12, 2, 2, 0x222222); S.rect(13, 12, 2, 2, 0x222222); S.rect(10, 14, 4, 1, 0x7a2a1a);
  S.box(16, 16, 8, 12, 4, 0xc9b070, 0.2); S.rect(20, 22, 8, 2, 0x9a3a2a);
  S.box(40, 16, 4, 12, 4, 0xc9b070, 0.2); S.box(32, 48, 4, 12, 4, 0xc9b070, 0.2);
  S.box(0, 16, 4, 12, 4, 0x6a4a2a, 0.1); S.box(16, 48, 4, 12, 4, 0x6a4a2a, 0.1);
  const material = makeCharMaterial(S.texture());
  material.alphaTest = 0.5;
  const rig = new Rig({ material, jacket: false });
  rig.armR.rotation.z = 1.4; rig.armL.rotation.z = -1.4;
  return rig;
}
