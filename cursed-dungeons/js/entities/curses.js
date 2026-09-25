// Curse bestiary: blocky models (procedurally painted skins, shared per
// type so spawning never compiles shaders) and stat blocks for every grade.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';

// Paint a grotesque curse skin: mottled base, glowing eyes, toothy mouth.
function paintCurse(S, o) {
  const base = o.base, dark = o.dark, eye = o.eye ?? 0xfff27a;
  S.box(0, 0, 8, 8, 8, base, 0.25);
  S.box(16, 16, 8, 12, 4, base, 0.25); S.box(16, 32, 8, 12, 4, dark, 0.3);
  S.box(40, 16, 4, 12, 4, base, 0.25); S.box(32, 48, 4, 12, 4, base, 0.25);
  S.box(40, 32, 4, 12, 4, dark, 0.3); S.box(48, 48, 4, 12, 4, dark, 0.3);
  S.box(0, 16, 4, 12, 4, dark, 0.25); S.box(16, 48, 4, 12, 4, dark, 0.25);
  // blotches everywhere
  for (let i = 0; i < 60; i++) S.px(Math.floor(S.r() * 64), Math.floor(S.r() * 64), dark);
  // face (front 8..15, 8..15)
  const eyes = o.eyes ?? [[9, 10], [13, 10]];
  for (const [x, y] of eyes) { S.px(x, y, eye); S.px(x + 1, y, eye); S.px(x, y + 1, 0xffffff); S.px(x + 1, y + 1, eye); }
  if (o.mouth !== false) {
    const my = o.mouthY ?? 13, mw = o.mouthW ?? 6, mx = 8 + Math.floor((8 - mw) / 2);
    S.rect(mx, my, mw, 2, 0x1a0508, 0.05);
    for (let x = mx; x < mx + mw; x += 2) { S.px(x, my, 0xf4f0e0); S.px(x + 1, my + 1, 0xf4f0e0); }
  }
  if (o.mask) { S.rect(8, 8, 8, 8, 0xf0ece0, 0.05); S.px(10, 11, 0x111111); S.px(13, 11, 0x111111); S.rect(10, 14, 4, 1, 0xc02020, 0); S.rect(8, 8, 8, 1, 0xc02020, 0); }
  if (o.chest) { S.rect(20, 22, 8, 6, o.chest, 0.2); }
  if (o.eyesBody) for (const [x, y] of o.eyesBody) { S.px(x, y, eye); S.px(x + 1, y, 0xffffff); }
}

const cache = new Map();
function curseMaterial(id, paintOpts) {
  if (cache.has(id)) return cache.get(id);
  const S = new Skin(id.length * 131 + 7);
  paintCurse(S, paintOpts);
  const m = makeCharMaterial(S.texture(), { emitStrength: 3.2, roughness: 0.7, fill: 0.22 });
  m.alphaTest = 0.5;
  cache.set(id, m);
  return m;
}
const solid = (() => { const c = new Map(); return (hex, emissive = 0) => { const k = hex + ':' + emissive; if (!c.has(k)) c.set(k, new THREE.MeshStandardNodeMaterial({ color: hex, roughness: 0.6, emissive: emissive ? hex : 0, emissiveIntensity: emissive })); return c.get(k); }; })();

// ---- Model builders ---------------------------------------------------------
const MODELS = {
  swarmer: () => {
    const rig = new Rig({ material: curseMaterial('swarmer', { base: 0x7a6490, dark: 0x3a2a4a, eye: 0xfff06a, eyes: [[10, 10]], mouthW: 8, mouthY: 12 }), headS: 11, bodyH: 7, legH: 6, bodyW: 7, bodyD: 5, armW: 3, scale: 0.95, jacket: true });
    rig.torso.rotation.x = 0.4; rig.hunch = 0.45;
    return rig;
  },
  spitter: () => {
    const rig = new Rig({ material: curseMaterial('spitter', { base: 0x5e8a58, dark: 0x2a3e28, eye: 0xd8ff5a, eyes: [[9, 9], [13, 9], [11, 11]], mouthW: 6, mouthY: 13, chest: 0x6a8a3a }), headS: 7, bodyH: 15, legH: 12, bodyW: 6, bodyD: 4, armW: 3, scale: 1.05 });
    // glowing sac on the back
    const sac = rig.mesh(new THREE.BoxGeometry(7 * PX, 8 * PX, 5 * PX), solid(0x8aff4a, 1.5));
    sac.position.set(0, 9 * PX, -4.5 * PX); rig.torso.add(sac);
    rig.hunch = 0.2;
    return rig;
  },
  tank: () => {
    const rig = new Rig({ material: curseMaterial('tank', { base: 0x8a7458, dark: 0x40322a, eye: 0xff8a3a, eyes: [[9, 11], [13, 11]], mouthW: 8, mouthY: 14 }), headS: 7, bodyH: 13, legH: 10, bodyW: 14, bodyD: 8, armW: 6, scale: 1.45 });
    // stone shield slab on the left arm
    const shield = new THREE.Group();
    const slab = rig.mesh(new THREE.BoxGeometry(12 * PX, 16 * PX, 2.5 * PX), solid(0x5a5a62));
    const rune = rig.mesh(new THREE.BoxGeometry(4 * PX, 6 * PX, 0.5 * PX), solid(0xff5a2a, 2));
    rune.position.z = 1.5 * PX;
    shield.add(slab, rune); shield.position.set(1 * PX, -6 * PX, 5 * PX);
    rig.handL.add(shield); rig.extras.shield = shield;
    rig.hunch = 0.15;
    return rig;
  },
  teleporter: () => {
    const rig = new Rig({ material: curseMaterial('teleporter', { base: 0x4a2e62, dark: 0x22142e, eye: 0xff5aff, mask: true, mouth: false }), headS: 8, bodyH: 14, legH: 4, bodyW: 8, bodyD: 5, armW: 3, scale: 1.15 });
    rig.legL.visible = rig.legR.visible = false;
    // robe tail
    const robe = rig.mesh(new THREE.BoxGeometry(9 * PX, 10 * PX, 6 * PX), solid(0x1a0f26));
    robe.position.y = -3 * PX; rig.hips.add(robe);
    rig.float = 0.6;
    return rig;
  },
  summoner: () => {
    const rig = new Rig({ material: curseMaterial('summoner', { base: 0x9a4a74, dark: 0x4a2238, eye: 0xffe0ff, eyes: [[8, 9], [10, 11], [13, 9], [14, 11], [11, 13]], mouth: false, eyesBody: [[21, 22], [25, 24], [22, 27]] }), headS: 12, bodyH: 12, legH: 6, bodyW: 9, bodyD: 6, armW: 3, scale: 1.2 });
    const orbs = new THREE.Group();
    for (let i = 0; i < 3; i++) { const o = rig.mesh(new THREE.BoxGeometry(4 * PX, 4 * PX, 4 * PX), solid(0xff6ad8, 2.5)); o.position.set(Math.cos(i * 2.1) * 14 * PX, 26 * PX, Math.sin(i * 2.1) * 14 * PX); orbs.add(o); }
    rig.root.add(orbs); rig.extras.orbs = orbs;
    rig.float = 0.25;
    return rig;
  },
  blob: () => {
    const rig = new Rig({ material: curseMaterial('blob', { base: 0xb03a4a, dark: 0x5a1422, eye: 0xfff0a0, eyes: [[9, 10], [13, 10]], mouthW: 6, mouthY: 13 }), headS: 16, bodyH: 2, legH: 2, bodyW: 4, bodyD: 4, armW: 2, scale: 0.9, jacket: false });
    rig.armL.visible = rig.armR.visible = false; rig.legL.visible = rig.legR.visible = false;
    const glow = rig.mesh(new THREE.BoxGeometry(10 * PX, 3 * PX, 10 * PX), solid(0xff3a2a, 2)); glow.position.y = 1 * PX; rig.hips.add(glow);
    rig.blob = true;
    return rig;
  },
  // summoned minion (small, fast)
  imp: () => {
    const rig = new Rig({ material: curseMaterial('imp', { base: 0x8a3a74, dark: 0x3a1434, eye: 0xff9aff, eyes: [[10, 10], [13, 10]], mouthW: 4 }), headS: 9, bodyH: 6, legH: 5, bodyW: 6, bodyD: 4, armW: 2, scale: 0.75 });
    rig.hunch = 0.3;
    return rig;
  },
};

// ---- Stat blocks ----------------------------------------------------------
// ai: melee | ranged | tank | teleport | summon | blob
export const CURSES = {
  swarmer: { name: 'Grade 4 Curse', grade: '4', hp: 34, speed: 4.8, dmg: 7, radius: 0.4, height: 1.2, ai: 'melee', range: 1.5, windup: 0.42, cd: 1.1, xp: 3, coins: [1, 3], model: 'swarmer', pitch: 1.4 },
  imp: { name: 'Summoned Imp', grade: '4', hp: 18, speed: 5.8, dmg: 5, radius: 0.35, height: 1, ai: 'melee', range: 1.3, windup: 0.35, cd: 1, xp: 1, coins: [0, 1], model: 'imp', pitch: 1.7 },
  spitter: { name: 'Grade 3 Spitter', grade: '3', hp: 44, speed: 3.4, dmg: 9, radius: 0.4, height: 2.1, ai: 'ranged', range: 11, keep: 7, windup: 0.6, cd: 2.2, xp: 5, coins: [2, 4], model: 'spitter', pitch: 1.1 },
  blob: { name: 'Grade 3 Bloater', grade: '3', hp: 30, speed: 3.9, dmg: 26, radius: 0.55, height: 1.2, ai: 'blob', range: 1.8, windup: 0.9, cd: 0, xp: 4, coins: [1, 4], model: 'blob', pitch: 0.9 },
  tank: { name: 'Grade 2 Bulwark', grade: '2', hp: 190, speed: 2.5, dmg: 18, radius: 0.8, height: 2.9, ai: 'tank', range: 2.4, windup: 0.85, cd: 2.2, xp: 12, coins: [5, 9], model: 'tank', armor: 0.25, shield: true, knockResist: 0.75, pitch: 0.6 },
  teleporter: { name: 'Grade 2 Phantom', grade: '2', hp: 90, speed: 3.6, dmg: 13, radius: 0.45, height: 2.2, ai: 'teleport', range: 1.8, windup: 0.4, cd: 1.6, xp: 10, coins: [4, 7], model: 'teleporter', pitch: 1.2 },
  summoner: { name: 'Grade 1 Brood Mother', grade: '1', hp: 170, speed: 2.2, dmg: 10, radius: 0.6, height: 2.6, ai: 'summon', range: 9, keep: 9, windup: 1.0, cd: 5, xp: 18, coins: [8, 14], model: 'summoner', knockResist: 0.4, pitch: 0.8 },
};

export function buildCurseModel(kind) { return MODELS[kind](); }

// Elite outline: an inverted-hull shell per mesh with a shared glow material.
const eliteMats = new Map();
export function eliteMaterial(color) {
  if (!eliteMats.has(color)) {
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.8, depthWrite: false });
    m.color = new THREE.Color(color).multiplyScalar(3);
    eliteMats.set(color, m);
  }
  return eliteMats.get(color);
}
export function addEliteShell(rig, color) {
  const mat = eliteMaterial(color);
  for (const m of [...rig.meshes]) {
    const shell = new THREE.Mesh(m.geometry, mat);
    shell.scale.setScalar(1.14);
    shell.castShadow = false; shell.userData.shell = true;
    shell.position.copy(m.position); shell.rotation.copy(m.rotation);
    m.parent.add(shell);
  }
}
