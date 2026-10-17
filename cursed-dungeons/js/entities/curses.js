// Curse bestiary: stat blocks for every grade, and the models. The looks
// (painted HD skins, merged detail, idle animation) live in curse-looks.js;
// materials and geometry are shared per kind so spawning never compiles shaders.
import * as THREE from 'three/webgpu';
import { buildCurseLook, decorateElite } from './curse-looks.js';

// ---- Stat blocks ----------------------------------------------------------
// ai: melee | ranged | tank | teleport | summon | blob | fly | crawl | leap | burrow |
//     turret | ember | grave | beam | lunge | guard | ambush | charge | buff
export const CURSES = {
  swarmer: { name: 'Grade 4 Curse', grade: '4', hp: 34, speed: 4.8, dmg: 7, radius: 0.4, height: 1.2, ai: 'melee', range: 1.5, windup: 0.42, cd: 1.1, xp: 3, coins: [1, 3], model: 'swarmer', pitch: 1.4 },
  imp: { name: 'Summoned Imp', grade: '4', hp: 18, speed: 5.8, dmg: 5, radius: 0.35, height: 1, ai: 'melee', range: 1.3, windup: 0.35, cd: 1, xp: 1, coins: [0, 1], model: 'imp', pitch: 1.7 },
  spitter: { name: 'Grade 3 Spitter', grade: '3', hp: 44, speed: 3.4, dmg: 9, radius: 0.4, height: 2.1, ai: 'ranged', range: 11, keep: 7, windup: 0.6, cd: 2.2, xp: 5, coins: [2, 4], model: 'spitter', pitch: 1.1 },
  blob: { name: 'Grade 3 Bloater', grade: '3', hp: 30, speed: 3.9, dmg: 26, radius: 0.55, height: 1.2, ai: 'blob', range: 1.8, windup: 0.9, cd: 0, xp: 4, coins: [1, 4], model: 'blob', pitch: 0.9 },
  tank: { name: 'Grade 2 Bulwark', grade: '2', hp: 190, speed: 2.5, dmg: 18, radius: 0.8, height: 2.9, ai: 'tank', range: 2.4, windup: 0.85, cd: 2.2, xp: 12, coins: [5, 9], model: 'tank', armor: 0.25, shield: true, knockResist: 0.75, pitch: 0.6 },
  teleporter: { name: 'Grade 2 Phantom', grade: '2', hp: 90, speed: 3.6, dmg: 13, radius: 0.45, height: 2.2, ai: 'teleport', range: 1.8, windup: 0.4, cd: 1.6, xp: 10, coins: [4, 7], model: 'teleporter', pitch: 1.2 },
  summoner: { name: 'Grade 1 Brood Mother', grade: '1', hp: 170, speed: 2.2, dmg: 10, radius: 0.6, height: 2.6, ai: 'summon', range: 9, keep: 9, windup: 1.0, cd: 5, xp: 18, coins: [8, 14], model: 'summoner', knockResist: 0.4, pitch: 0.8 },

  // ---- the wider bestiary (behaviours in enemy.js, looks in curse-looks.js)
  // Grade 4: Fly Heads hover in a swarm and dive onto a marked spot.
  flyhead: { name: 'Grade 4 Fly Head', grade: '4', hp: 14, speed: 4.6, dmg: 6, radius: 0.35, height: 1.0, ai: 'fly', range: 6, windup: 0.7, cd: 2.4, xp: 2, coins: [0, 2], model: 'flyhead', pitch: 2.0 },
  // Grade 4: Mahito's victims lurch in surges; half of them split in two on death.
  transfigured: { name: 'Transfigured Human', grade: '4', hp: 40, speed: 3.6, dmg: 8, radius: 0.45, height: 2.0, ai: 'melee', range: 1.7, windup: 0.5, cd: 1.3, xp: 3, coins: [1, 3], model: 'transfigured', lurch: true, split: 'remnant', pitch: 1.0 },
  remnant: { name: 'Transfigured Remnant', grade: '4', hp: 14, speed: 3.4, dmg: 5, radius: 0.35, height: 0.8, ai: 'melee', range: 1.3, windup: 0.45, cd: 1.2, xp: 1, coins: [0, 1], model: 'remnant', lurch: true, pitch: 1.5 },
  // Grade 3: Cursed Womb embryo crawls close and bursts into imps unless killed first.
  embryo: { name: 'Grade 3 Cursed Womb', grade: '3', hp: 52, speed: 2.4, dmg: 12, radius: 0.55, height: 1.1, ai: 'crawl', range: 3.0, windup: 1.3, cd: 0, xp: 5, coins: [2, 4], model: 'embryo', pitch: 1.3 },
  // Grade 3: Shibuya grasshopper: keeps its distance, then pounces on a marked circle.
  grasshopper: { name: 'Grade 3 Grasshopper Curse', grade: '3', hp: 60, speed: 4.2, dmg: 13, radius: 0.5, height: 1.9, ai: 'leap', range: 9, keep: 6, windup: 0.8, cd: 2.8, xp: 6, coins: [2, 5], model: 'grasshopper', pitch: 1.2 },
  // Grade 3: crawling hand: burrows, tunnels under you, bursts up through a marked circle.
  burrower: { name: 'Grade 3 Crawling Hand', grade: '3', hp: 58, speed: 3.8, dmg: 14, radius: 0.55, height: 1.0, ai: 'burrow', range: 1.6, windup: 0.45, cd: 2.6, xp: 6, coins: [2, 5], model: 'burrower', pitch: 1.1 },
  // Grade 3: maw pillar: rooted turret that spits volleys and bites anyone who gets close.
  maw: { name: 'Grade 3 Maw Pillar', grade: '3', hp: 110, speed: 0, dmg: 10, radius: 0.85, height: 2.4, ai: 'turret', range: 12, windup: 0.8, cd: 2.6, xp: 7, coins: [3, 6], model: 'maw', rooted: true, knockResist: 1, pitch: 0.6 },
  // Grade 3: disaster ash: a little volcano that leaves burning ground behind it.
  ashspirit: { name: 'Grade 3 Disaster Ash', grade: '3', hp: 48, speed: 3.9, dmg: 11, radius: 0.45, height: 1.5, ai: 'ember', range: 2.2, windup: 0.8, cd: 2.4, xp: 6, coins: [2, 5], model: 'ashspirit', pitch: 0.9 },
  // Grade 2: grave curse (smallpox-deity style): seals you in a coffin for a moment if you stay in its circle.
  gravekeeper: { name: 'Grade 2 Grave Deity', grade: '2', hp: 120, speed: 2.6, dmg: 14, radius: 0.55, height: 2.5, ai: 'grave', range: 10, keep: 7, windup: 1.4, cd: 5.5, xp: 11, coins: [4, 8], model: 'gravekeeper', knockResist: 0.4, pitch: 0.7 },
  // Grade 2: lantern eye: sniper beam along a long telegraph line that tracks, then locks.
  lantern: { name: 'Grade 2 Lantern Eye', grade: '2', hp: 80, speed: 2.2, dmg: 20, radius: 0.5, height: 3.2, ai: 'beam', range: 15, keep: 11, windup: 1.6, cd: 4.2, xp: 10, coins: [4, 7], model: 'lantern', pitch: 0.8 },
  // Grade 2: slit-mouth woman: long-necked lunge bite from range.
  longneck: { name: 'Grade 2 Slit-Mouth', grade: '2', hp: 95, speed: 3.4, dmg: 16, radius: 0.45, height: 2.6, ai: 'lunge', range: 6.5, keep: 4.5, windup: 0.8, cd: 2.6, xp: 10, coins: [4, 7], model: 'longneck', pitch: 1.3 },
  // Grade 2: cursed corpse doll: shield-bearer that guards the curses around it.
  doll: { name: 'Grade 2 Cursed Corpse', grade: '2', hp: 125, speed: 3.0, dmg: 12, radius: 0.6, height: 2.0, ai: 'guard', range: 2.2, windup: 0.75, cd: 2.2, xp: 11, coins: [4, 8], model: 'doll', shield: true, knockResist: 0.6, pitch: 1.4 },
  // Grade 2: shadow stalker: nearly invisible until it is close, then strikes and slinks off.
  shadow: { name: 'Grade 2 Shadow Stalker', grade: '2', hp: 70, speed: 4.6, dmg: 17, radius: 0.45, height: 2.3, ai: 'ambush', range: 3.2, windup: 0.7, cd: 3.2, xp: 10, coins: [4, 7], model: 'shadow', pitch: 1.6 },
  // Grade 1: rainbow serpent: telegraphed snaking charges.
  serpent: { name: 'Grade 1 Rainbow Serpent', grade: '1', hp: 200, speed: 3.6, dmg: 22, radius: 0.65, height: 1.3, ai: 'charge', range: 13, keep: 7, windup: 1.0, cd: 3.6, xp: 18, coins: [8, 14], model: 'serpent', knockResist: 0.6, pitch: 0.7 },
  // Grade 1: fester bodhisattva: heals and empowers nearby curses; hides behind them.
  healer: { name: 'Grade 1 Fester Bodhisattva', grade: '1', hp: 150, speed: 2.4, dmg: 9, radius: 0.55, height: 2.7, ai: 'buff', range: 10, keep: 9, windup: 1.2, cd: 6, xp: 18, coins: [8, 14], model: 'healer', knockResist: 0.4, pitch: 0.9 },
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
