// Cursed technique registry: display info, rarity, technique kits and the
// shared unlock tree. Each technique module calls registerSorcerer() and
// registerKit() when it is imported.
import { Kit, abilityCost, rmbOk } from './kit.js';

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

// Shared technique-tree nodes. Every technique starts with its first
// technique (RMB) and melee; abilities from its library, passive talismans,
// Reverse Cursed Technique, Cursed Energy and the Domain / Ultimate are
// unlocked with technique points (see buildTree below and kit.js).
//   reqCount: n — needs n abilities unlocked beyond the first one.
export const UNLOCK_NODES = [
  { id: 'ce_flow', name: 'Cursed Energy Flow', icon: '🌊', desc: 'Passive Cursed Energy regeneration +50% per rank.', max: 3, branch: 'Core', tier: 0 },
  { id: 'unlock_rct', name: 'Reverse Cursed Technique', icon: '✚', desc: 'Unlock RCT healing (Q / D-pad ↑).', max: 1, reqCount: 1, branch: 'Core', tier: 2 },
  { id: 'ce_reserve', name: 'Vast Reserves', icon: '🔋', desc: '+20 max Cursed Energy per rank.', max: 3, req: 'ce_flow', branch: 'Core', tier: 1 },
  { id: 'rct_mastery', name: 'RCT Mastery', icon: '💚', desc: '+1 RCT charge and stronger healing per rank.', max: 2, req: 'unlock_rct', branch: 'Core', tier: 3 },
  { id: 'unlock_domain', name: 'Domain / Ultimate', icon: '領', desc: 'Unlock your Domain Expansion, or your ultimate attack if your sorcerer has no domain (F / LT).', max: 1, reqCount: 3, capstone: true },
];
// The old fixed-slot unlocks: kept as save keys (old saves and the kits not
// yet given a library still use them) but no longer shown as tree nodes.
export const LEGACY_UNLOCKS = ['unlock_t1', 'unlock_t2', 'unlock_t3'];
export const UNLOCK_IDS = new Set([...UNLOCK_NODES.map((n) => n.id), ...LEGACY_UNLOCKS]);

export function registerKit(id, cls, skills = []) { KITS[id] = cls; SKILL_TREES[id] = [...UNLOCK_NODES, ...skills]; }
export function createKit(player) {
  const K = KITS[player.sorcerer] || Kit;
  const kit = new K(player);
  kit.initLoadout();
  return kit;
}

// ---------------------------------------------------------------- technique tree model
// One node per library ability ('ab:<id>'), passive talisman ('pa:<id>'),
// technique upgrade ('up:<id>') and shared node ('core:<id>').
// node: { nid, type, id, key, name, icon, desc, max, cost, reqs:[nid], reqCount, branch, tier, ref, capstone }
export function buildTree(kit, sid = kit.p.sorcerer) {
  const nodes = [], by = {};
  const add = (n) => { nodes.push(n); by[n.nid] = n; return n; };
  const lib = kit.library ?? {}, pas = kit.passives ?? {};
  for (const id in lib) { const a = lib[id]; add({ nid: 'ab:' + id, type: 'ability', id, key: a.key, name: a.name, icon: a.icon, desc: a.desc ?? '', max: 1, cost: abilityCost(a), rawReq: a.req, branch: a.branch ?? 'Techniques', tier: a.tier ?? 1, ref: a, start: !!a.start }); }
  for (const id in pas) { const a = pas[id]; add({ nid: 'pa:' + id, type: 'passive', id, key: a.key, name: a.name, icon: a.icon, desc: a.desc ?? '', max: 1, cost: a.cost ?? 1, rawReq: a.req, branch: a.branch ?? 'Talismans', tier: a.tier ?? 2, ref: a, generic: !!a.generic }); }
  const ups = (SKILL_TREES[sid] ?? []).filter((n) => !UNLOCK_IDS.has(n.id));
  for (const u of ups) add({ nid: 'up:' + u.id, type: 'upgrade', id: u.id, key: u.id, name: u.name, icon: u.icon ?? '⬆️', desc: u.desc ?? '', max: u.max ?? 1, cost: u.cost ?? 1, rawReq: u.req, branch: u.branch ?? null, tier: u.tier ?? null, ref: u });
  for (const c of UNLOCK_NODES) {
    const name = c.id === 'unlock_domain' ? (kit.domain ? 'Domain: ' + kit.domain.name : kit.ultimate ? 'Ultimate: ' + kit.ultimate.name : c.name) : c.name;
    add({ nid: 'core:' + c.id, type: 'core', id: c.id, key: c.id, name, icon: c.id === 'unlock_domain' ? (kit.domain?.icon ?? kit.ultimate?.icon ?? c.icon) : c.icon, desc: c.desc, max: c.max, cost: 1, rawReq: c.req, reqCount: c.reqCount, branch: c.branch ?? 'Core', tier: c.tier ?? 0, ref: c, capstone: !!c.capstone });
  }
  // resolve requirements: prefixed ids, else the node's own namespace first
  const order = { ability: ['ab', 'pa', 'up', 'core'], passive: ['pa', 'ab', 'up', 'core'], upgrade: ['up', 'core', 'ab', 'pa'], core: ['core', 'up', 'ab', 'pa'] };
  for (const n of nodes) {
    const raw = n.rawReq == null ? [] : Array.isArray(n.rawReq) ? n.rawReq : [n.rawReq];
    n.reqs = raw.map((r) => (r.includes(':') ? (by[r] ? r : null) : order[n.type].map((p) => p + ':' + r).find((x) => by[x]))).filter(Boolean);
  }
  // upgrades without a place: put them under the ability they improve, else an Upgrades column
  for (const n of nodes) if (n.type === 'upgrade' && (n.branch == null || n.tier == null)) {
    const parent = n.reqs.map((r) => by[r]).find(Boolean);
    let depth = 0, q = n; while (q && q.reqs?.length && depth < 6) { q = by[q.reqs[0]]; depth++; }
    n.branch ??= parent?.type === 'ability' ? parent.branch : 'Upgrades';
    n.tier ??= parent?.type === 'ability' ? Math.min(5, parent.tier + 1) : 1 + depth;
  }
  return { nodes, by };
}
export function nodeRank(skills, n) {
  if (n.type === 'ability' && n.start) return 1;
  if (n.type === 'ability' && n.ref.legacy && n.ref.legacy !== 'ranged' && skills?.['unlock_' + n.ref.legacy] > 0) return Math.max(1, skills?.[n.key] ?? 0);
  return skills?.[n.key] ?? 0;
}
export function abilitiesUnlocked(tree, skills) { return tree.nodes.filter((n) => n.type === 'ability' && !n.start && nodeRank(skills, n) > 0).length; }
// why a node can't be bought right now (null = it can)
export function lockReason(tree, skills, n, points) {
  const r = nodeRank(skills, n);
  if (r >= n.max) return 'max';
  for (const q of n.reqs) if (!(nodeRank(skills, tree.by[q]) > 0)) return 'Requires ' + tree.by[q].name;
  if (n.reqCount && abilitiesUnlocked(tree, skills) < n.reqCount) return `Requires ${n.reqCount} unlocked abilities (${abilitiesUnlocked(tree, skills)}/${n.reqCount})`;
  if (points < n.cost) return `Needs ${n.cost} technique point${n.cost > 1 ? 's' : ''}`;
  return null;
}
// Spend points on a node; auto-equips a new ability / talisman into a free slot.
export function unlockNode(save, sid, kit, tree, n) {
  const S = save.sorc(sid);
  if (lockReason(tree, S.skills, n, S.skillPoints)) return false;
  S.skills[n.key] = nodeRank(S.skills, n) + 1;
  S.skillPoints -= n.cost;
  const L = S.loadout;
  if (L && n.type === 'ability') {
    const a = n.ref, free = (k) => !L[k] || (kit.library[L[k]] && !kit.has(L[k]) && L[k] !== n.id);
    if (!['ranged', 't1', 't2', 't3'].some((k) => L[k] === n.id)) {
      const k = rmbOk(a) && free('ranged') ? 'ranged' : ['t1', 't2', 't3'].find(free);
      if (k) L[k] = n.id;
    }
  }
  if (L && n.type === 'passive' && !L.talismans.includes(n.id)) { const i = L.talismans.indexOf(null); if (i >= 0) L.talismans[i] = n.id; }
  save.write();
  return true;
}
