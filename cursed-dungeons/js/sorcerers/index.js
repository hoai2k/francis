// Sorcerer registry: display info and technique kits.
import { Kit } from './kit.js';

export const SORCERERS = {
  gojo: { name: 'Gojo', title: 'The Strongest', desc: 'Limitless: Blue pulls, Red repels, Hollow Purple erases. Infinity makes you untouchable.', domain: 'Unlimited Void', color: '#6ad8ff' },
  yuji: { name: 'Yuji', title: 'Vessel', desc: 'Brutal combos, Divergent Fist\'s delayed second impact, and Black Flash on perfect timing.', domain: 'Resonant Fists', color: '#ff5a4a' },
  megumi: { name: 'Megumi', title: 'Ten Shadows', desc: 'Summon Divine Dogs, Nue and Toad as allies. Shadow-step through your own shadow.', domain: 'Chimera Shadow Garden', color: '#8a8aff' },
  nobara: { name: 'Nobara', title: 'Straw Doll', desc: 'Hammer and nails: Hairpin detonates nails, Resonance strikes everything you have nailed.', domain: 'Resonance Field', color: '#ffa050' },
  sukuna: { name: 'Sukuna', title: 'King of Curses', desc: 'Dismantle and Cleave carve the battlefield. Fuga looses a flaming arrow.', domain: 'Malevolent Shrine', color: '#ff3a4a' },
};
export const SORCERER_IDS = Object.keys(SORCERERS);

const KITS = {};
export function registerKit(id, cls) { KITS[id] = cls; }
export function createKit(player) {
  const K = KITS[player.sorcerer] || Kit;
  return new K(player);
}
