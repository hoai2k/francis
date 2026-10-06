// Shared material library for the castle and grounds.
import * as THREE from 'three';
import * as T from '../textures.js';

let M = null;

function pbr(tex, opts = {}, worldUV) {
  const { normalScale, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, roughness: 0.9, metalness: 0, ...rest });
  if (normalScale != null) m.normalScale.set(normalScale, normalScale);
  if (worldUV) m.userData.worldUV = worldUV;
  return m;
}

export function materials() {
  if (M) return M;
  const stone = T.stoneTex([136, 128, 116], 'stoneA');
  const stoneDark = T.stoneTex([96, 92, 90], 'stoneB');
  const win = T.windowTex();
  M = {
    stone: pbr(stone, { normalScale: 1.2 }, 4),
    stoneDark: pbr(stoneDark, { normalScale: 1.2 }, 4),
    stoneWarm: pbr(T.stoneTex([150, 130, 104], 'stoneC'), { normalScale: 1.1 }, 3.5),
    floor: pbr(T.floorTex(), { roughness: 0.75 }, 5),
    wood: pbr(T.woodTex(), { roughness: 0.75 }, 2.5),
    woodDark: pbr(T.woodTex([70, 44, 28], 'woodDark'), { roughness: 0.7 }, 2.5),
    roof: pbr(T.roofTex(), { roughness: 0.8 }, 4),
    rock: pbr(T.rockTex(), { roughness: 0.95 }, 9),
    plaster: pbr(T.plasterTex(), { roughness: 0.95 }, 4),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 1, roughness: 0.32 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.85, roughness: 0.45 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 1, roughness: 0.25 }),
    window: new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 0.15, metalness: 0.6, emissive: 0xffb466, emissiveMap: win, emissiveIntensity: 1, alphaMap: null, map: win, alphaTest: 0.5, side: THREE.DoubleSide }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x5a1010, roughness: 0.95, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 1 }),
    candle: new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.6, emissive: 0x442a10, emissiveIntensity: 0.4 }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.2, 0.8), map: T.flameSprite(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1), map: T.glowSprite(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x2c4a26, roughness: 0.9, flatShading: true }),
    pine: new THREE.MeshStandardMaterial({ color: 0x1b3424, roughness: 0.92, flatShading: true }),
    bark: new THREE.MeshStandardMaterial({ color: 0x3e2c20, roughness: 1 }),
  };
  M.window.map = null; // emissive pattern only; dark glass colour
  M.window.alphaMap = T.windowMaskTex();
  M.window.alphaTest = 0.4;
  M.window.transparent = false;
  M.window.userData.noShadow = true;
  M.flame.userData.noShadow = true;
  M.glow.userData.noShadow = true;
  return M;
}
