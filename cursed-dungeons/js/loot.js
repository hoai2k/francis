// Loot in the Minecraft Dungeons mould: weapons, armour and cursed-tool
// artifacts in common / rare / unique tiers, each with enchantment-style
// perks that are upgraded with enchantment points. Item power scales with
// mission threat.
import { mulberry32 } from './util.js';

export const RARITY = { common: { label: 'Common', color: '#c8c8c8', slots: 1, mult: 1 }, rare: { label: 'Rare', color: '#4ad0ff', slots: 2, mult: 1.15 }, unique: { label: 'Unique', color: '#ff9a2a', slots: 3, mult: 1.3 } };

// Enchantments: stat hooks read by applyStats / combat.
export const ENCHANTS = {
  sharpness: { name: 'Sharpness', desc: (l) => `+${l * 10}% melee damage`, for: ['weapon'], stat: (s, l) => { s.meleeMult += 0.1 * l; } },
  swirling: { name: 'Swirling', desc: (l) => `Every third hit spins, dealing ${40 + l * 20}% damage around you`, for: ['weapon'], proc: 'swirl' },
  committed: { name: 'Committed', desc: (l) => `+${l * 15}% damage to wounded curses`, for: ['weapon'], stat: (s, l) => { s.committed += 0.15 * l; } },
  rampaging: { name: 'Rampaging', desc: (l) => `Kills grant +${l * 10}% attack speed for 5s`, for: ['weapon'], proc: 'rampage' },
  leeching: { name: 'Leeching', desc: (l) => `Heal ${l * 2}% max HP on kill`, for: ['weapon'], proc: 'leech' },
  exploding: { name: 'Exploding', desc: (l) => `Curses you kill explode for ${l * 20}% of their HP`, for: ['weapon'], proc: 'explode' },
  freezing: { name: 'Freezing', desc: (l) => `Hits slow curses (${l * 10}%)`, for: ['weapon'], proc: 'freeze' },
  critical: { name: 'Critical Hit', desc: (l) => `+${l * 5}% critical chance`, for: ['weapon', 'artifact'], stat: (s, l) => { s.crit += 0.05 * l; } },
  health: { name: 'Health Boost', desc: (l) => `+${l * 15} max HP`, for: ['armor'], stat: (s, l) => { s.maxHp += 15 * l; } },
  protection: { name: 'Protection', desc: (l) => `+${l * 6}% damage reduction`, for: ['armor'], stat: (s, l) => { s.armor += 0.06 * l; } },
  swiftness: { name: 'Swiftness', desc: (l) => `+${l * 6}% move speed`, for: ['armor'], stat: (s, l) => { s.speed += 0.06 * l; } },
  cooldown: { name: 'Cooldown', desc: (l) => `-${l * 8}% technique cooldowns`, for: ['armor', 'artifact'], stat: (s, l) => { s.cdr += 0.08 * l; } },
  surge: { name: 'Energy Surge', desc: (l) => `+${l * 15}% Cursed Energy gain`, for: ['armor', 'artifact'], stat: (s, l) => { s.ceGain += 0.15 * l; } },
  potency: { name: 'Potency', desc: (l) => `+${l * 10}% technique damage`, for: ['armor', 'artifact'], stat: (s, l) => { s.techMult += 0.1 * l; } },
  vitality: { name: 'Reverse Flow', desc: (l) => `Reverse Cursed Technique heals ${l * 10}% more`, for: ['armor'], stat: (s, l) => { s.healBonus += 0.1 * l; } },
};

// Base items. Artifacts are cursed tools with an active ability (R / T keys, gamepad D-pad ← / →).
export const ITEMS = [
  // weapons
  { id: 'wraps', kind: 'weapon', name: 'Cursed Knuckle Wraps', icon: '🥊', rarity: 'common', desc: 'Wrapped fists that channel cursed energy.', dmg: 1.0, speed: 1.1 },
  { id: 'katana', kind: 'weapon', name: 'Cursed Katana', icon: '🗡️', rarity: 'common', desc: 'A standard-issue Jujutsu High blade.', dmg: 1.1, speed: 1.0, reach: 1.1 },
  { id: 'pipe', kind: 'weapon', name: 'Iron Pipe', icon: '🔧', rarity: 'common', desc: 'Heavy and unrefined. Hits hard.', dmg: 1.25, speed: 0.85 },
  { id: 'slaughter_demon', kind: 'weapon', name: 'Slaughter Demon', icon: '🔪', rarity: 'rare', desc: 'A cursed knife that bites deeper into curses.', dmg: 1.2, speed: 1.2 },
  { id: 'dragon_bone', kind: 'weapon', name: 'Dragon-Bone', icon: '🦴', rarity: 'rare', desc: 'Stores impact and releases it on the next swing.', dmg: 1.3, speed: 0.95, reach: 1.15 },
  { id: 'playful_cloud', kind: 'weapon', name: 'Playful Cloud', icon: '🎋', rarity: 'unique', desc: 'A three-section staff — pure physical force. Every hit strikes twice.', dmg: 1.35, speed: 1.1, reach: 1.25, twin: true, fixed: ['swirling'] },
  { id: 'split_soul', kind: 'weapon', name: 'Split Soul Katana', icon: '⚔️', rarity: 'unique', desc: 'Cuts the soul directly, ignoring armour and shields.', dmg: 1.4, speed: 1.05, reach: 1.15, pierce: true, fixed: ['committed'] },
  // armour
  { id: 'uniform', kind: 'armor', name: 'Jujutsu High Uniform', icon: '🧥', rarity: 'common', desc: 'Reinforced school uniform.', hp: 20, armor: 0.06 },
  { id: 'robes', kind: 'armor', name: 'Zenin Clan Robes', icon: '👘', rarity: 'common', desc: 'Traditional robes of a great clan.', hp: 10, cdr: 0.08 },
  { id: 'vestments', kind: 'armor', name: 'Shrine Vestments', icon: '⛩️', rarity: 'rare', desc: 'Blessed garments that swell cursed energy.', hp: 25, ce: 0.25 },
  { id: 'heavenly', kind: 'armor', name: 'Heavenly Restriction Gear', icon: '🥋', rarity: 'unique', desc: 'Worn by one born without cursed energy. Raw speed and power.', hp: 40, speed: 0.15, meleeMult: 0.2, fixed: ['swiftness'] },
  { id: 'kimono', kind: 'armor', name: 'Heian Kimono', icon: '🎎', rarity: 'unique', desc: 'Garb of a thousand-year-old sorcerer.', hp: 30, techMult: 0.2, cdr: 0.1, fixed: ['potency'] },
  // artifacts / cursed tools
  { id: 'inverted_spear', kind: 'artifact', name: 'Inverted Spear of Heaven', icon: '🔱', rarity: 'unique', desc: 'Thrown spear that nullifies techniques: pierces every curse, ignores shields.', cd: 9, act: 'spear' },
  { id: 'chain', kind: 'artifact', name: 'Chain of a Thousand Miles', icon: '⛓️', rarity: 'rare', desc: 'Lash a chain forward and drag every curse it hits to you.', cd: 8, act: 'chain' },
  { id: 'prison_realm', kind: 'artifact', name: 'Prison Realm Fragment', icon: '🧊', rarity: 'unique', desc: 'Seals nearby curses in place for 4 seconds.', cd: 20, act: 'prison' },
  { id: 'straw_doll', kind: 'artifact', name: 'Cursed Straw Doll', icon: '🪆', rarity: 'rare', desc: 'Damages every curse you have hit in the last 5 seconds.', cd: 10, act: 'doll' },
  { id: 'talisman', kind: 'artifact', name: 'Barrier Talisman', icon: '📜', rarity: 'common', desc: 'A curtain that halves damage taken for 5 seconds.', cd: 16, act: 'barrier' },
  { id: 'panda', kind: 'artifact', name: 'Cursed Corpse Doll', icon: '🐼', rarity: 'rare', desc: 'Summons a cursed corpse ally for 12 seconds.', cd: 22, act: 'corpse' },
  { id: 'charm', kind: 'artifact', name: 'Healing Charm', icon: '💮', rarity: 'common', desc: 'Heals you and nearby allies over 4 seconds.', cd: 18, act: 'charm' },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

let uid = Date.now() % 100000;
// Roll a concrete item instance.
export function rollItem(power = 1, { rarity = null, kind = null, rng = Math.random, id = null } = {}) {
  let pool = ITEMS.filter((i) => (!kind || i.kind === kind) && (!id || i.id === id));
  if (!rarity && !id) { const x = rng(); rarity = x < 0.06 + power * 0.015 ? 'unique' : x < 0.3 + power * 0.04 ? 'rare' : 'common'; }
  if (rarity) { const r2 = pool.filter((i) => i.rarity === rarity); if (r2.length) pool = r2; }
  const base = pool[Math.floor(rng() * pool.length)];
  const R = RARITY[base.rarity];
  const opts = Object.keys(ENCHANTS).filter((k) => ENCHANTS[k].for.includes(base.kind) && !(base.fixed ?? []).includes(k));
  const ench = [];
  for (const f of base.fixed ?? []) ench.push({ id: f, level: 1 });
  while (ench.length < R.slots && opts.length) { const k = opts.splice(Math.floor(rng() * opts.length), 1)[0]; ench.push({ id: k, level: 0 }); }
  return { uid: 'i' + (uid++), id: base.id, power: Math.max(1, Math.round((power * 10 + rng() * 6 - 2))), ench };
}
export function itemInfo(it) { return ITEM_BY_ID[it.id]; }
export function powerMult(it) { return 1 + (it.power - 10) * 0.02; }
export function salvageValue(it) { const b = itemInfo(it); return Math.round((b.rarity === 'unique' ? 60 : b.rarity === 'rare' ? 25 : 8) * powerMult(it)); }
export function itemPrice(it) { return Math.round(salvageValue(it) * 3.2 + 10); }

// Fold equipped gear into a player's stats.
export function applyGear(player, gear) {
  const s = player.stats;
  Object.assign(s, { damage: 1, armor: 0, speed: 1, cdr: 0, ceGain: 1, crit: 0.08, lifesteal: 0, meleeMult: 1, committed: 0, techMult: 1, healBonus: 0, attackSpeed: 1, reach: 1, maxHp: 100 });
  player.procs = {};
  player.weapon = null; player.artifacts = [];
  for (const it of gear) {
    if (!it) continue;
    const b = itemInfo(it); if (!b) continue;
    const pm = powerMult(it) * RARITY[b.rarity].mult;
    if (b.kind === 'weapon') { player.weapon = it; s.meleeMult *= (b.dmg ?? 1) * pm; s.attackSpeed *= b.speed ?? 1; s.reach *= b.reach ?? 1; player.weaponTwin = !!b.twin; player.weaponPierce = !!b.pierce; }
    if (b.kind === 'armor') { s.maxHp += (b.hp ?? 0) * pm; s.armor += (b.armor ?? 0); s.cdr += b.cdr ?? 0; s.ceGain += b.ce ?? 0; s.speed += b.speed ?? 0; s.meleeMult += b.meleeMult ?? 0; s.techMult += (b.techMult ?? 0); s.armor += 0.04 * pm; }
    if (b.kind === 'artifact') { player.artifacts.push({ it, base: b, cdLeft: 0, cd: b.cd }); s.techMult += 0.04 * pm; }
    for (const e of it.ench) {
      if (!e.level) continue;
      const E = ENCHANTS[e.id];
      E.stat?.(s, e.level);
      if (E.proc) player.procs[E.proc] = Math.max(player.procs[E.proc] ?? 0, e.level);
    }
  }
  s.armor = Math.min(0.7, s.armor); s.cdr = Math.min(0.6, s.cdr);
  const frac = player.hp / player.maxHp;
  player.maxHp = s.maxHp; player.hp = Math.min(player.maxHp, Math.max(1, frac * player.maxHp));
  s.damage = 1;
}

// Chest / boss loot table.
export function rollChest(power, rarity = 'common', rng = Math.random) {
  const out = [];
  const n = rarity === 'boss' ? 3 : rarity === 'rare' ? 2 : 1;
  for (let i = 0; i < n; i++) out.push(rollItem(power, { rng, rarity: rarity === 'boss' && i === 0 ? (rng() < 0.45 ? 'unique' : 'rare') : null }));
  return out;
}
export { mulberry32 };
