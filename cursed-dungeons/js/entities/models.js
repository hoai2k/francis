// Appearance of every playable sorcerer: procedurally painted skins, hair
// strands, capes and signature props, built on the shared Rig.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';
import { hashStr } from '../util.js';

function paintHumanoid(S, o) {
  const skin = o.skinTone ?? 0xf0c8a8;
  // head
  S.box(0, 0, 8, 8, 8, skin, 0.05);
  // hair base on head top/back/sides
  S.rect(8, 0, 8, 8, o.hair, 0.12);
  S.rect(24, 8, 8, o.hairBack ?? 6, o.hair, 0.12);        // back
  S.rect(0, 8, 8, o.hairSide ?? 3, o.hair, 0.12);         // right side
  S.rect(16, 8, 8, o.hairSide ?? 3, o.hair, 0.12);        // left side
  S.rect(8, 8, 8, o.fringe ?? 2, o.hair, 0.12);           // fringe
  if (o.undercut) { S.rect(0, 11, 8, 3, o.undercut, 0.1); S.rect(16, 11, 8, 3, o.undercut, 0.1); S.rect(24, 13, 8, 2, o.undercut, 0.1); }
  // face (front of head at 8,8)
  const ey = 8 + (o.eyeRow ?? 4);
  S.px(9, ey, o.eyeWhite ?? 0xffffff); S.px(10, ey, o.eye ?? 0x3a2a1a);
  S.px(13, ey, o.eye ?? 0x3a2a1a); S.px(14, ey, o.eyeWhite ?? 0xffffff);
  S.px(9, ey - 1, o.brow ?? o.hair); S.px(10, ey - 1, o.brow ?? o.hair); S.px(13, ey - 1, o.brow ?? o.hair); S.px(14, ey - 1, o.brow ?? o.hair);
  S.px(11, ey + 2, 0xc89a88); S.px(12, ey + 2, 0xc89a88);
  if (o.tattoo) {  // Sukuna's markings + second eyes
    S.px(9, ey + 1, 0x111111); S.px(10, ey + 1, 0x111111); S.px(13, ey + 1, 0x111111); S.px(14, ey + 1, 0x111111);
    S.px(10, ey + 2, 0xb01010); S.px(13, ey + 2, 0xb01010);
    S.px(8, ey + 3, 0x111111); S.px(15, ey + 3, 0x111111); S.px(11, 8 + 7, 0x111111); S.px(12, 8 + 7, 0x111111);
    S.px(11, 8 + 2, 0x111111); S.px(12, 8 + 2, 0x111111);
  }
  if (o.blindfold) { S.rect(0, ey - 1, 32, 2, 0x111216, 0.05); }
  if (o.blush) { S.px(9, ey + 1, 0xe8a0a0); S.px(14, ey + 1, 0xe8a0a0); }
  // hat layer (hair volume) — transparent except painted cells
  if (o.hairVolume) {
    S.rect(40, 0, 8, 8, o.hair, 0.15);            // top
    S.rect(40, 8, 8, o.fringe ?? 2, o.hair, 0.15); // front fringe
    S.rect(32, 8, 8, o.hairSide ?? 4, o.hair, 0.15); S.rect(48, 8, 8, o.hairSide ?? 4, o.hair, 0.15);
    S.rect(56, 8, 8, o.hairBack ?? 6, o.hair, 0.15);
    if (o.bob) { S.rect(32, 8, 8, 7, o.hair, 0.15); S.rect(48, 8, 8, 7, o.hair, 0.15); S.rect(56, 8, 8, 7, o.hair, 0.15); }
  }
  // torso
  S.box(16, 16, 8, 12, 4, o.top, 0.08);
  if (o.kimono) {
    for (let y = 0; y < 12; y++) { S.px(20 + 3 + (y < 6 ? -Math.floor(y / 2) : 0), 20 + y, 0x9a9488); }
    S.rect(20, 28, 8, 2, o.sash ?? 0x1a1a1a, 0.05);
  } else {
    S.rect(23, 20, 2, 12, o.topTrim ?? 0x1a1d2a, 0.05);
    for (let y = 22; y < 32; y += 3) S.px(24, y, o.buttons ?? 0xd8b440);
    S.rect(20, 20, 8, 2, o.collar ?? o.top, 0.05);
  }
  if (o.hood) { S.rect(32, 20, 8, 4, o.hood, 0.08); S.rect(20, 20, 8, 2, o.hood, 0.06); S.rect(16, 20, 4, 3, o.hood, 0.06); S.rect(28, 20, 4, 3, o.hood, 0.06); }
  if (o.scarf) { S.rect(16, 20, 24, 3, o.scarf, 0.1); }
  // arms (sleeves + hands)
  S.box(40, 16, 4, 12, 4, o.sleeve ?? o.top, 0.08);
  S.box(32, 48, 4, 12, 4, o.sleeve ?? o.top, 0.08);
  for (const [u, v] of [[40, 16], [32, 48]]) {
    S.rect(u, v + 4 + 9, 16, 3, skin, 0.04); S.rect(u + 8, v, 4, 4, skin, 0.04);
    if (o.wrap) S.rect(u, v + 4 + 7, 16, 2, o.wrap, 0.05);
  }
  // legs
  S.box(0, 16, 4, 12, 4, o.pants, 0.08);
  S.box(16, 48, 4, 12, 4, o.pants, 0.08);
  for (const [u, v] of [[0, 16], [16, 48]]) {
    S.rect(u, v + 4 + 10, 16, 2, o.shoes ?? 0x1a1a1a, 0.05); S.rect(u + 8, v, 4, 4, o.shoes ?? 0x1a1a1a, 0.05);
    if (o.skirt) S.rect(u, v + 4, 16, 4, o.skirt, 0.06);
    if (o.tights) S.rect(u, v + 8, 16, 6, o.tights, 0.05);
  }
}

const hairMat = (c, emissive = 0) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.7, emissive: emissive ? c : 0x000000, emissiveIntensity: emissive });

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

export function buildSorcererModel(id) {
  const look = SORCERER_LOOKS[id];
  const S = new Skin(hashStr(id));
  paintHumanoid(S, look.paint);
  const map = S.texture();
  const material = makeCharMaterial(map, { emitStrength: id === 'gojo' ? 0.6 : id === 'sukuna' ? 0.8 : 0 });
  material.alphaTest = 0.5;
  const hm = hairMat(look.hairColor);
  const spec = { material, hair: look.hair(hm), hairMaterial: hm, scale: 1.18 };
  if (id === 'sukuna') spec.cape = { material: new THREE.MeshStandardNodeMaterial({ color: 0xece6d8, roughness: 0.9 }), segments: 3, length: 9, width: 9 };
  if (id === 'gojo') spec.cape = { material: new THREE.MeshStandardNodeMaterial({ color: 0x1b2030, roughness: 0.85 }), segments: 3, length: 8, width: 8 };
  if (id === 'megumi') spec.cape = { material: new THREE.MeshStandardNodeMaterial({ color: 0x151822, roughness: 0.85 }), segments: 3, length: 9, width: 8 };
  if (id === 'yuji') spec.cape = { material: new THREE.MeshStandardNodeMaterial({ color: 0xb8232f, roughness: 0.85 }), segments: 2, length: 5, width: 7 };
  if (id === 'nobara') spec.cape = { material: new THREE.MeshStandardNodeMaterial({ color: 0x1b2030, roughness: 0.85 }), segments: 2, length: 5, width: 9 };
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
