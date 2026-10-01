// Jujutsu Kaisen drivers (Use Characters). Faces and hair reuse the Cursed Brick
// Shibuya props so the drivers match the characters on the track.
import { seatedFig, C } from './kit.js';
import { head as jhead, hair } from '../maps/jjk-props.js';

const NAVY = 0x1d2233, GOLD = 0xdcbc81;
// a JJK head from the shared face atlas plus a hair style
const jjkHead = (face, hairFn) => (hb, d) => {
  const hs = d.headR / 0.43;
  jhead(hb, face, 0, 0, 0, d.headR, d.headH);
  hairFn?.(hb, hs, d.headH);
};

export default [
  {
    id: 'gojo', name: 'Satoru Gojo', blurb: 'The strongest sorcerer', weight: 'medium', color: 0x9fd8ff,
    voice: { kind: 'human', pitch: 0.85 }, style: { cheer: 'point', trick: 'twist' },
    build: () => seatedFig({ name: 'gojo', torso: NAVY, legs: NAVY, arms: NAVY, skin: 0xf7e2cf, head: jjkHead('gojo', hair.gojo), extraHeight: 0.35 }),
  },
  {
    id: 'yuji', name: 'Yuji Itadori', blurb: 'Black Flash brawler', weight: 'medium', color: 0xf28a9c,
    voice: { kind: 'human', pitch: 1.0 }, style: { cheer: 'fist', trick: 'arms' },
    build: () => seatedFig({ name: 'yuji', torso: NAVY, legs: NAVY, arms: NAVY, skin: 0xf3d2b3, head: jjkHead('yuji', hair.yuji),
      torsoExtra: (b, d) => { const s = d.s; b.box(0, 0.78 * s, -0.18 * s, 0.86 * s, 0.24 * s, 0.24 * s, C.red); b.box(0, 0.86 * s, 0.14 * s, 0.7 * s, 0.14 * s, 0.14 * s, C.red); for (let k = 0; k < 3; k++) b.box(0, (0.66 - k * 0.16) * s, 0.22 * s, 0.07 * s, 0.07 * s, 0.04 * s, GOLD); } }),
  },
];
