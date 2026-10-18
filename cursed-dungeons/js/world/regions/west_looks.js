// NPC looks for the Kyoto and Okinawa regions (models.js registerLook; ids
// start with 'npc_' so RegionNpcs.makeRig accepts them):
//   npc_gakuganji  Principal Yoshinobu Gakuganji (Kyoto Jujutsu High)
//   npc_kamo       Noritoshi Kamo          npc_momo   Momo Nishimiya (with her broom)
//   npc_maiko      a Gion maiko            npc_riko   Riko Amanai, the Star Plasma Vessel
//   npc_kuroi      Misato Kuroi, Riko's attendant
//   npc_tourist    a tourist in a sun hat  npc_islander  an Okinawan local in a kariyushi shirt
import * as THREE from 'three/webgpu';
import { registerLook } from '../../entities/models.js';

const KYOTO_UNI = 0x1b2030;

registerLook('npc_gakuganji', {
  paint: { skinTone: 0xe0b898, hair: 0xe8e4dc, fringe: 0, hairSide: 3, hairBack: 5, top: 0x3a3226, collar: 0x2a2418, topTrim: 0x2a2418, buttons: 0x3a3226, pants: 0x2a2418, shoes: 0x1a1410, eye: 0x2a2a2a, brow: 0xf0ece4 },
  hair: (m) => [{ x: 0, y: 5.5, z: -4.4, w: 2.2, h: 6, d: 1.6, hang: true, material: m, stiff: 30 }],
  hairColor: 0xe8e4dc, cape: null, scale: 1.08, emit: 0,
  paintExtra(S) {
    S.mat = 'hair';
    S.rect(9, 14, 6, 2, 0xf0ece4, 0.05);   // white moustache and beard
    S.rect(8, 13, 1, 3, 0xf0ece4, 0.05); S.rect(15, 13, 1, 3, 0xf0ece4, 0.05);
    S.mat = 'cloth';
    S.rect(20, 20, 8, 2, 0xc8a050, 0.05);   // an obi sash
  },
  props(rig, K) {   // his cane
    const c = new THREE.Group(); c.position.set(0, -2 * K.PX, 1 * K.PX); rig.handR.add(c);
    K.box(c, 1, 22, 1, K.mat(0x5a3a1e), 0, -8, 1.5);
  },
});
registerLook('npc_kamo', {
  paint: { skinTone: 0xf0d2b8, hair: 0x14110e, hairVolume: true, fringe: 2, hairSide: 6, hairBack: 7, top: 0xa88a5a, collar: 0x7a6038, topTrim: 0x7a6038, buttons: 0xa88a5a, pants: 0x3a3020, shoes: 0x14110e, eye: 0x1a1410 },
  hair: (m) => [
    { x: 0, y: 8.6, z: -1.5, w: 2.4, h: 2.4, d: 2.4, material: m },   // topknot
    { x: 0, y: 4, z: -4.2, w: 6.5, h: 6, d: 1.4, hang: true, material: m, stiff: 40 },
  ],
  hairColor: 0x14110e, cape: null, scale: 1.16, emit: 0,
  paintExtra(S) { S.mat = 'cloth'; S.rect(16, 28, 16, 3, 0x6a5030, 0.04); },
  props(rig, K) {   // his bow
    const b = new THREE.Group(); b.position.set(0, -2 * K.PX, 0); rig.handL.add(b);
    K.box(b, 0.8, 26, 0.8, K.mat(0x3a2414), 0, 0, 2);
    K.box(b, 0.2, 24, 0.2, K.mat(0xe8e0d0), 0, 0, 4);
  },
});
registerLook('npc_momo', {
  paint: { skinTone: 0xf6dcc8, hair: 0xf2d27a, hairVolume: true, bob: true, fringe: 3, hairSide: 7, hairBack: 7, top: KYOTO_UNI, collar: 0xf2f2f2, topTrim: 0xf2f2f2, buttons: KYOTO_UNI, pants: KYOTO_UNI, skirt: KYOTO_UNI, shoes: 0x2a1a10, eye: 0x5a7ab8, blush: true },
  hair: (m) => [
    { x: -3.6, y: 2, z: 0, w: 1.6, h: 6, d: 5, hang: true, material: m, stiff: 35 },
    { x: 3.6, y: 2, z: 0, w: 1.6, h: 6, d: 5, hang: true, material: m, stiff: 35 },
    { x: 0, y: 2, z: -3.8, w: 7, h: 7, d: 1.6, hang: true, material: m, stiff: 35 },
  ],
  hairColor: 0xf2d27a, cape: null, scale: 1.04, emit: 0,
  props(rig, K) {   // her broom
    const s = new THREE.Group(); s.rotation.x = Math.PI / 2; s.position.z = 2 * K.PX; rig.handR.add(s);
    K.box(s, 1, 30, 1, K.mat(0x8a5a2a), 0, 4, 0);
    K.box(s, 3.4, 7, 3.4, K.mat(0xd8b860), 0, -13, 0);
    K.box(s, 2, 0.8, 2, K.mat(0xd83a3a), 0, -9, 0);
  },
});
registerLook('npc_maiko', {
  paint: { skinTone: 0xfaf4ee, hair: 0x101014, hairVolume: true, fringe: 3, hairSide: 4, hairBack: 5, top: 0xd83a5a, collar: 0xf8e8f0, topTrim: 0xf0b030, buttons: 0xd83a5a, pants: 0xd83a5a, skirt: 0xd83a5a, shoes: 0xf0e8e0, eye: 0x101010, blush: true },
  hair: (m) => [{ x: 0, y: 8.8, z: -0.8, w: 6.4, h: 3, d: 5.6, material: m }, { x: 0, y: 6.5, z: -3.6, w: 4, h: 3, d: 2, material: m }],
  hairColor: 0x101014, cape: null, scale: 1.04, emit: 0,
  paintExtra(S) { S.mat = 'cloth'; S.rect(16, 24, 16, 3, 0xf0b030, 0.05); S.rect(20, 20, 8, 4, 0xf8d8e8, 0.05); },
  props(rig, K) {   // kanzashi hair pin (flowers)
    K.box(rig.head ?? rig.root, 1.6, 1.6, 1.6, K.mat(0xff8ab0, { emissive: 0.2 }), 3.2, 8.8, 1);
  },
});
registerLook('npc_riko', {
  paint: { skinTone: 0xf6dcc8, hair: 0x101016, hairVolume: true, fringe: 3, hairSide: 7, hairBack: 8, top: 0x1a2038, collar: 0xf2f2f2, topTrim: 0xf2f2f2, buttons: 0x1a2038, pants: 0x1a2038, skirt: 0x1a2038, shoes: 0x2a1a10, eye: 0x3a2a4a, blush: true },
  hair: (m) => [
    { x: 0, y: 2, z: -3.8, w: 7.4, h: 9, d: 1.6, hang: true, material: m, stiff: 30 },
    { x: -3.6, y: 2.5, z: 0.5, w: 1.6, h: 7, d: 5, hang: true, material: m, stiff: 35 },
    { x: 3.6, y: 2.5, z: 0.5, w: 1.6, h: 7, d: 5, hang: true, material: m, stiff: 35 },
  ],
  hairColor: 0x101016, cape: null, scale: 1.0, emit: 0,
  paintExtra(S) { S.mat = 'cloth'; S.rect(22, 20, 4, 3, 0xd83a3a, 0.04); },   // red sailor ribbon
});
registerLook('npc_kuroi', {
  paint: { skinTone: 0xf0d2b8, hair: 0x2a2018, hairVolume: true, bob: true, fringe: 2, hairSide: 5, hairBack: 5, top: 0x16161c, collar: 0xf4f4f4, topTrim: 0xf4f4f4, buttons: 0x16161c, pants: 0x16161c, skirt: 0x16161c, shoes: 0x0c0c0c, eye: 0x2a2018 },
  hair: () => [], hairColor: 0x2a2018, cape: null, scale: 1.1, emit: 0,
  paintExtra(S) { S.mat = 'cloth'; S.rect(20, 20, 8, 12, 0xf4f4f4, 0.04); },   // white apron
});
registerLook('npc_tourist', {
  paint: { skinTone: 0xf4d6c0, hair: 0x8a5a2a, fringe: 2, hairSide: 4, hairBack: 5, hairVolume: true, top: 0xf8f0d0, collar: 0xf8f0d0, topTrim: 0xf8f0d0, buttons: 0xf8f0d0, pants: 0x4a7ab8, shoes: 0xf0f0f0, eye: 0x3a5a7a },
  hair: () => [], hairColor: 0x8a5a2a, cape: null, scale: 1.12, emit: 0,
  props(rig, K) {   // a straw sun hat and a camera
    const h = rig.head ?? rig.root;
    K.box(h, 11, 0.6, 11, K.mat(0xe8d08a), 0, 8.6, 0); K.box(h, 7, 2, 7, K.mat(0xe8d08a), 0, 9.6, 0); K.box(h, 7.2, 0.6, 7.2, K.mat(0xd83a3a), 0, 9.0, 0);
    K.box(rig.handR, 3, 2, 1.4, K.mat(0x1a1a1a), 0, -2, 2);
  },
});
registerLook('npc_islander', {
  paint: { skinTone: 0xc89068, hair: 0x14110e, fringe: 1, hairSide: 2, hairBack: 3, top: 0x2a9ad8, collar: 0x2a9ad8, topTrim: 0xf8f0d0, buttons: 0xf8f0d0, pants: 0xe8dcc0, shoes: 0x6a4a2a, eye: 0x2a2018 },
  hair: () => [], hairColor: 0x14110e, cape: null, scale: 1.14, emit: 0,
  paintExtra(S) {   // hibiscus print on the kariyushi shirt
    S.mat = 'cloth';
    for (const [u, v] of [[18, 21], [24, 24], [20, 28], [27, 30], [42, 22], [34, 26]]) S.rect(u, v, 2, 2, 0xff5a7a, 0.05);
  },
});
