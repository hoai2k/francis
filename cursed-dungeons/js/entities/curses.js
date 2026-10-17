// Curse bestiary: stat blocks for every grade, and the models. The looks
// (painted HD skins, merged detail, idle animation) live in curse-looks.js;
// materials and geometry are shared per kind so spawning never compiles shaders.
import * as THREE from 'three/webgpu';
import { buildCurseLook, decorateElite } from './curse-looks.js';

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

export function buildCurseModel(kind) { return buildCurseLook(kind); }

// Elite look: affix-coloured glow shell on the body and head, a pulsing ground
// ring and a floating affix emblem (shared materials per colour).
const eliteMats = new Map();
export function eliteMaterial(color) {
  if (!eliteMats.has(color)) {
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.8, depthWrite: false });
    m.color = new THREE.Color(color).multiplyScalar(3);
    eliteMats.set(color, m);
  }
  return eliteMats.get(color);
}
export function addEliteShell(rig, color, affix = 'shadow', radius = 0.5) { decorateElite(rig, color, affix, radius); }
