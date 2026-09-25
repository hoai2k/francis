// Block registry. id 0 is air. Each block names atlas tiles for its top,
// sides and bottom plus material hints used by the mesher and gameplay:
//   rough  – roughness written per-vertex (low = shiny: SSR picks it up)
//   metal  – metalness per-vertex
//   emit   – emissive strength (lanterns, windows, lava)
//   liquid – 'water' | 'cursed' | 'lava' (drawn by the liquid mesher)
//   hp     – destructible blocks break into debris after this much damage
//   step   – footstep surface ('stone' | 'grass' | 'wood' | 'metal' | 'water' | 'sand')
//   light  – [hex, intensity, distance] static light source (lanterns etc.)
import { TILE_INDEX as T } from '../gfx/textures.js';

const defs = [];
export const B = {};
function def(name, tiles, opts = {}) {
  const id = defs.length;
  const t = typeof tiles === 'string' ? { top: tiles, side: tiles, bottom: tiles } : tiles;
  defs.push({
    id, name,
    top: T[t.top], side: T[t.side ?? t.top], bottom: T[t.bottom ?? t.top],
    solid: opts.solid ?? true, opaque: opts.opaque ?? true,
    rough: opts.rough ?? 0.85, metal: opts.metal ?? 0, emit: opts.emit ?? 0,
    liquid: opts.liquid ?? null, hp: opts.hp ?? 0, step: opts.step ?? 'stone',
    light: opts.light ?? null, debris: opts.debris ?? 6,
  });
  B[name] = id;
  return id;
}

def('air', 'stone', { solid: false, opaque: false });
def('stone', 'stone');
def('stone_brick', 'stone_brick');
def('mossy_brick', 'mossy_brick');
def('cracked_brick', 'cracked_brick', { hp: 40, debris: 10 });
def('dark_brick', 'dark_brick');
def('red_brick', 'red_brick');
def('cobble', 'cobble');
def('dirt', 'dirt', { step: 'grass' });
def('grass', { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, { step: 'grass' });
def('cursed_grass', { top: 'cursed_grass_top', side: 'cursed_grass_side', bottom: 'dirt' }, { step: 'grass' });
def('moss_floor', { top: 'moss_floor', side: 'dirt' }, { step: 'grass' });
def('planks', 'planks', { step: 'wood' });
def('dark_planks', 'dark_planks', { step: 'wood' });
def('floor_boards', 'floor_boards', { step: 'wood', rough: 0.45 });
def('log', { top: 'log_top', side: 'log_side' }, { step: 'wood' });
def('roof', 'roof_tile', { rough: 0.5 });
def('red_lacquer', 'red_lacquer', { rough: 0.35, step: 'wood' });
def('pillar_red', 'red_lacquer', { rough: 0.35, step: 'wood', hp: 60, debris: 8 });
def('tatami', { top: 'tatami', side: 'dark_planks' }, { step: 'wood' });
def('asphalt', { top: 'asphalt', side: 'concrete' }, { rough: 0.3 });   // wet night streets
def('asphalt_line', { top: 'asphalt_line', side: 'concrete' }, { rough: 0.3 });
def('concrete', 'concrete');
def('concrete_pillar', 'concrete', { hp: 70, debris: 10 });
def('subway_tile', 'subway_tile', { rough: 0.25 });
def('subway_floor', { top: 'subway_floor', side: 'concrete' }, { rough: 0.2 });
def('metal_grate', 'metal_grate', { metal: 0.8, rough: 0.4, step: 'metal', opaque: true });
def('sand', 'sand', { step: 'sand' });
def('water', 'water', { solid: false, opaque: false, liquid: 'water', step: 'water' });
def('cursed_pool', 'cursed_pool', { solid: false, opaque: false, liquid: 'cursed', emit: 1.6, light: [0xb040ff, 5, 9] });
def('lava', 'lava', { solid: false, opaque: false, liquid: 'lava', emit: 2.2, light: [0xff7a2a, 6, 10] });
def('lantern', 'lantern', { emit: 1.8, light: [0xffa850, 5, 10], hp: 10, debris: 4 });
def('gold_trim', 'gold_trim', { metal: 0.9, rough: 0.3 });
def('plaster', 'plaster');
def('shoji', 'shoji', { step: 'wood', hp: 15, debris: 6 });
def('obsidian', 'obsidian', { rough: 0.25 });
def('leaves', 'leaves', { step: 'grass' });
def('dead_leaves', 'dead_leaves', { step: 'grass' });
def('polished', 'polished', { rough: 0.12, metal: 0.1 });
def('marble', 'marble', { rough: 0.15 });
def('window', { top: 'concrete', side: 'window' }, { emit: 1.1 });
def('window_dark', { top: 'concrete', side: 'window_dark' }, { rough: 0.1 });
def('crate', 'crate', { hp: 12, step: 'wood', debris: 8 });
def('barrel', { top: 'barrel_top', side: 'barrel_side' }, { hp: 12, step: 'wood', debris: 8 });
def('bone_block', 'bone_block');
def('talisman_wall', 'talisman_wall');
def('blood_brick', 'blood_brick');
def('void_floor', 'void_floor', { emit: 0.6, rough: 0.1 });
def('shrine_floor', 'shrine_floor', { rough: 0.3 });
def('shadow_floor', 'shadow_floor', { rough: 0.05, metal: 0.3 });
def('vending', { top: 'concrete', side: 'vending' }, { emit: 0.9, hp: 30, step: 'metal', light: [0xff6a8a, 2.5, 6] });
def('sign', { top: 'concrete', side: 'sign' }, { emit: 1.2 });
def('neon_pink', 'neon_pink', { emit: 2.5, light: [0xff5fb0, 3, 8] });
def('blue_energy', 'blue_energy', { emit: 3.0, light: [0x5ad8ff, 4, 8] });
def('rail', { top: 'rail', side: 'concrete' }, { step: 'metal' });
def('bark_dark', { top: 'log_top', side: 'bark_dark' }, { step: 'wood' });
def('dirt_path', { top: 'cobble', side: 'dirt' });
def('barrier', 'stone', { opaque: false });   // invisible wall

export const BLOCKS = defs;
export const isSolid = (id) => defs[id].solid;
export const isOpaque = (id) => defs[id].opaque;
