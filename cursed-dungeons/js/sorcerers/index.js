// Cursed technique registry: display info, rarity, technique kits and the
// shared unlock tree. Each technique module calls registerSorcerer() and
// registerKit() when it is imported.
import { Kit } from './kit.js';

// Rarity tiers for technique rolls. Popular techniques sit in the rare tiers.
export const RARITIES = {
  common: { label: 'Common', color: '#b8bcc8', weight: 34 },
  uncommon: { label: 'Uncommon', color: '#6adf6a', weight: 24 },
  rare: { label: 'Rare', color: '#4aa8ff', weight: 18 },
  epic: { label: 'Epic', color: '#c070ff', weight: 11 },
  legendary: { label: 'Legendary', color: '#ffb02a', weight: 5 },
  special: { label: 'Special Grade', color: '#ff3a5a', weight: 1.4 },
};
export const RARITY_ORDER = Object.keys(RARITIES);

export const SORCERERS = {
  gojo: { name: 'Gojo', technique: 'Limitless', rarity: 'special', title: 'The Strongest', desc: 'Limitless: Blue pulls, Red repels, Hollow Purple erases. Infinity makes you untouchable.', domain: 'Unlimited Void', color: '#6ad8ff' },
  sukuna: { name: 'Sukuna', technique: 'Shrine', rarity: 'special', title: 'King of Curses', desc: 'Dismantle and Cleave carve the battlefield. Fuga looses a flaming arrow.', domain: 'Malevolent Shrine', color: '#ff3a4a' },
  megumi: { name: 'Megumi', technique: 'Ten Shadows', rarity: 'legendary', title: 'Ten Shadows', desc: 'Summon Divine Dogs, Nue and Toad as allies. Shadow-step through your own shadow.', domain: 'Chimera Shadow Garden', color: '#8a8aff' },
  yuji: { name: 'Yuji', technique: 'Divergent Fist', rarity: 'epic', title: 'Vessel', desc: 'Brutal combos, Divergent Fist\'s delayed second impact, and Black Flash on perfect timing.', ultimate: 'Consecutive Black Flash', color: '#ff5a4a' },
  nobara: { name: 'Nobara', technique: 'Straw Doll', rarity: 'rare', title: 'Straw Doll', desc: 'Hammer and nails: Hairpin detonates nails, Resonance strikes everything you have nailed.', ultimate: 'Resonance: Blood Doll', color: '#ffa050' },
};
export const SORCERER_IDS = Object.keys(SORCERERS);

export function registerSorcerer(id, info) {
  SORCERERS[id] = info;
  if (!SORCERER_IDS.includes(id)) SORCERER_IDS.push(id);
}

// Weighted random technique. `except` is avoided when possible so a reroll
// always changes something.
export function rollTechnique(except = null, rnd = Math.random) {
  const ids = SORCERER_IDS.filter((id) => id !== except);
  const total = ids.reduce((a, id) => a + RARITIES[SORCERERS[id].rarity ?? 'common'].weight, 0);
  let x = rnd() * total;
  for (const id of ids) { x -= RARITIES[SORCERERS[id].rarity ?? 'common'].weight; if (x <= 0) return id; }
  return ids[ids.length - 1];
}
// Chance (0..1) of rolling a given technique.
export function techniqueOdds(id) {
  const total = SORCERER_IDS.reduce((a, s) => a + RARITIES[SORCERERS[s].rarity ?? 'common'].weight, 0);
  return RARITIES[SORCERERS[id].rarity ?? 'common'].weight / total;
}

const KITS = {};
export const SKILL_TREES = {};

// Every technique starts with only its first technique (RMB) and melee.
// The rest — techniques 1-3, Reverse Cursed Technique and the Domain
// Expansion — are unlocked on the technique tree, alongside passive Cursed
// Energy flow.
export const UNLOCK_NODES = [
  { id: 'unlock_t1', slot: 't1', name: 'Technique I', desc: 'Unlock your second technique (1 / LB).', max: 1 },
  { id: 'ce_flow', name: 'Cursed Energy Flow', desc: 'Passive Cursed Energy regeneration +50% per rank.', max: 3 },
  { id: 'unlock_t2', slot: 't2', name: 'Technique II', desc: 'Unlock your third technique (2 / RB).', max: 1, req: 'unlock_t1' },
  { id: 'unlock_rct', name: 'Reverse Cursed Technique', desc: 'Unlock RCT healing (Q / D-pad ↑).', max: 1, req: 'unlock_t1' },
  { id: 'unlock_t3', slot: 't3', name: 'Technique III', desc: 'Unlock your fourth technique (3 / Y).', max: 1, req: 'unlock_t2' },
  { id: 'rct_mastery', name: 'RCT Mastery', desc: '+1 RCT charge and stronger healing per rank.', max: 2, req: 'unlock_rct' },
  { id: 'ce_reserve', name: 'Vast Reserves', desc: '+20 max Cursed Energy per rank.', max: 3, req: 'ce_flow' },
  { id: 'unlock_domain', name: 'Domain / Ultimate', desc: 'Unlock your Domain Expansion, or your ultimate attack if your sorcerer has no domain (F / LT).', max: 1, req: 'unlock_t3' },
];
export const UNLOCK_IDS = new Set(UNLOCK_NODES.map((n) => n.id));

export function registerKit(id, cls, skills = []) { KITS[id] = cls; SKILL_TREES[id] = [...UNLOCK_NODES, ...skills]; }
export function createKit(player) {
  const K = KITS[player.sorcerer] || Kit;
  return new K(player);
}
