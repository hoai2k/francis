// Long-term progression across the seven school years: XP and levels, talent
// points, spell mastery, spell loadouts, the school calendar and owl post letters.
import { G } from './state.js';
import { SPELL_BY_ID } from './spelldata.js';

export const MAX_LEVEL = 40;
export const TALENTS = {
  offence: { name: 'Offence', icon: '⚔', desc: '+4% spell damage per rank.' },
  defence: { name: 'Defence', icon: '🛡', desc: '+6 max health and 3% less damage taken per rank.' },
  control: { name: 'Control', icon: '🌀', desc: 'Stuns, freezes and lifts last 6% longer; combos hit 4% harder per rank.' },
  utility: { name: 'Utility', icon: '✦', desc: '+5% magic regeneration, +3 max magic and 3% shorter cooldowns per rank.' },
};
export const TALENT_MAX = 10;
export const MASTERY_STEPS = [0, 20, 60, 140, 280];

export const YEARS = [
  { n: 1, title: 'The First Year', sub: 'A troll, Dementors and Malachar the Hollow' },
  { n: 2, title: 'The Hidden Chamber', sub: 'Something hisses inside the walls' },
  { n: 3, title: 'The Grey Tide', sub: 'Dementors guard the school' },
  { n: 4, title: 'The Tri-School Trials', sub: 'Three tasks and a graveyard' },
  { n: 5, title: 'The Inquisitor', sub: 'The Ministry takes Hogwarts' },
  { n: 6, title: 'Poisoned Waters', sub: 'A cave of the drowned' },
  { n: 7, title: 'The Last Stand', sub: 'The battle of the castle' },
];

// how many equipped spell slots each year allows (Protego is always on the block button)
export const slotsFor = (year) => Math.min(8, 3 + (year || 1));

export function xpForLevel(L) { return Math.round(60 * L * L + 140 * L); } // total xp needed to reach L+1

export function ensureProgress(s) {
  s.year ||= 1;
  s.xp ??= 0;
  s.level ||= 1;
  s.talentPts ??= 0;
  s.talents ||= { offence: 0, defence: 0, control: 0, utility: 0 };
  s.mastery ||= {};
  s.letters ||= [];
  s.yearsDone ||= [];
  s.coins ??= 40;
  s.items ||= {};
  s.friends ||= {};
  s.loadout ??= 0;
  if (!Array.isArray(s.loadouts) || s.loadouts.length !== 3) s.loadouts = [[], [], []];
  s.loadouts = s.loadouts.map((l) => Array.from({ length: 8 }, (_, i) => (l && l[i] && SPELL_BY_ID[l[i]] ? l[i] : null)));
  return s;
}

// ------------------------------------------------------------------ XP & levels
export function addXP(n, reason) {
  const s = G.save;
  if (!s || !n || !s.started) return;
  n = Math.round(n);
  s.xp += n;
  if (reason) G.ui?.floatXP?.(n, reason);
  let up = 0;
  while (s.level < MAX_LEVEL && s.xp >= xpForLevel(s.level)) { s.level++; s.talentPts++; up++; }
  if (up) {
    G.ui?.banner(`Level ${s.level}!`, `+${up} talent point${up > 1 ? 's' : ''} · spend ${up > 1 ? 'them' : 'it'} in the Spellbook → Talents`, 'unlock');
    G.audio?.sfx('unlock');
    applyStats();
  }
  G.ui?.updateXP?.();
}
export function levelProgress() {
  const s = G.save;
  const lo = s.level > 1 ? xpForLevel(s.level - 1) : 0, hi = xpForLevel(s.level);
  return s.level >= MAX_LEVEL ? 1 : (s.xp - lo) / (hi - lo);
}
export function talent(k) { return G.save?.talents?.[k] || 0; }
export function spendTalent(k) {
  const s = G.save;
  if (s.talentPts <= 0 || s.talents[k] >= TALENT_MAX) return false;
  s.talents[k]++;
  s.talentPts--;
  applyStats();
  return true;
}
export function resetTalents() {
  const s = G.save;
  for (const k in s.talents) { s.talentPts += s.talents[k]; s.talents[k] = 0; }
  applyStats();
}
// gear bonuses are added by gear.js when present
export function applyStats() {
  const p = G.player, s = G.save;
  if (!p || !s) return;
  const g = G.gearStats ? G.gearStats() : {};
  const hpF = p.maxHp ? p.hp / p.maxHp : 1;
  p.maxHp = 100 + (s.level - 1) * 2 + talent('defence') * 6 + (g.hp || 0);
  p.maxMana = 100 + talent('utility') * 3 + (g.mana || 0);
  p.hp = Math.min(p.maxHp, Math.max(1, hpF * p.maxHp));
  p.mana = Math.min(p.mana, p.maxMana);
}
export const dmgMult = () => (1 + talent('offence') * 0.04 + (G.gearStats?.().power || 0)) * (G.save?.level ? 1 + (G.save.level - 1) * 0.012 : 1);
export const defMult = () => (1 - talent('defence') * 0.03) * (1 - (G.gearStats?.().armour || 0));
export const controlMult = () => 1 + talent('control') * 0.06;
export const comboMult = () => 1 + talent('control') * 0.04;
export const regenMult = () => 1 + talent('utility') * 0.05 + (G.gearStats?.().regen || 0);
export const cdMult = () => 1 - talent('utility') * 0.03 - (G.gearStats?.().haste || 0);

// ------------------------------------------------------------------ spell mastery
export function masteryLevel(id) {
  const u = G.save?.mastery?.[id] || 0;
  let L = 0;
  for (let i = 0; i < MASTERY_STEPS.length; i++) if (u >= MASTERY_STEPS[i]) L = i;
  return L; // 0..4
}
export function addMastery(id) {
  const s = G.save;
  if (!s || !SPELL_BY_ID[id]) return;
  const before = masteryLevel(id);
  s.mastery[id] = (s.mastery[id] || 0) + 1;
  const after = masteryLevel(id);
  if (after > before) {
    G.ui?.banner(`${SPELL_BY_ID[id].name} mastery ${'★'.repeat(after)}`, 'More power, a wider area and a shorter cooldown.', 'unlock');
    G.audio?.sfx('unlock');
    addXP(40 * after);
  }
}
export const masteryDmg = (id) => 1 + masteryLevel(id) * 0.07;
export const masteryCd = (id) => 1 - masteryLevel(id) * 0.06;
export const masteryArea = (id) => 1 + masteryLevel(id) * 0.1;

// ------------------------------------------------------------------ loadouts
const PREFS = [
  ['stupefy', 'expelliarmus', 'incendio', 'petrificus', 'confringo', 'bombarda', 'diffindo', 'glacius'],
  ['lumos', 'leviosa', 'accio', 'patronum', 'depulso', 'arresto', 'reparo', 'alohomora'],
  ['stupefy', 'lumos', 'leviosa', 'expelliarmus', 'patronum', 'incendio', 'petrificus', 'episkey'],
];
export function equippable(id) { return id !== 'protego' && !!SPELL_BY_ID[id]; }
export function currentLoadout() { const s = G.save; return s.loadouts[s.loadout] || s.loadouts[0]; }
export function slotCount() { return slotsFor(G.save?.year); }
// put a newly learned spell into the first free slot of every loadout that has room
export function autoEquip(id) {
  if (!equippable(id)) return false;
  const s = G.save, n = slotCount();
  let placed = false;
  s.loadouts.forEach((l, li) => {
    if (l.includes(id)) { if (li === s.loadout) placed = true; return; }
    const i = l.findIndex((x, k) => k < n && !x);
    if (i >= 0) { l[i] = id; if (li === s.loadout) placed = true; }
  });
  return placed;
}
// fill empty loadouts sensibly from the learned spells
export function seedLoadouts(unlocked) {
  const s = G.save, n = slotCount();
  s.loadouts.forEach((l, li) => {
    if (l.some(Boolean)) return;
    const order = [...PREFS[li], ...[...unlocked]];
    let k = 0;
    for (const id of order) {
      if (k >= n) break;
      if (!unlocked.has(id) || !equippable(id) || l.includes(id)) continue;
      l[k++] = id;
    }
  });
}
export function setSlot(li, i, id) {
  const l = G.save.loadouts[li];
  const prev = l.indexOf(id);
  if (prev >= 0) l[prev] = l[i]; // swap if already equipped elsewhere
  l[i] = id;
}

// ------------------------------------------------------------------ calendar
const MONTHS = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June'];
const MONTH_DAYS = [30, 31, 30, 31, 31, 28, 31, 30, 31, 30];
// frac: 0 = 1 September, 1 = end of June
export function dateFor(frac) {
  let d = Math.round(Math.max(0, Math.min(1, frac)) * 297);
  let m = 0;
  while (m < 9 && d >= MONTH_DAYS[m]) { d -= MONTH_DAYS[m]; m++; }
  const day = Math.min(d + 1, MONTH_DAYS[m]);
  const month = MONTHS[m];
  let term = 'Autumn term';
  if (m === 3 && day >= 20 || m === 4 && day <= 5) term = 'Christmas holidays';
  else if (m >= 4 && m <= 6) term = m === 6 && day > 28 ? 'Easter holidays' : 'Spring term';
  else if (m >= 7) term = 'Summer term';
  const winter = m === 3 || m === 4 || (m === 5 && day < 20);
  const christmas = term === 'Christmas holidays';
  return { month, day, m, term, winter, christmas, label: `${day} ${month}` };
}
export function today() {
  const f = G.story?.yearFraction ? G.story.yearFraction() : 0;
  return dateFor(f);
}

// ------------------------------------------------------------------ owl post
export function sendOwl(id, from, title, body, opts = {}) {
  const s = G.save;
  if (!s || s.letters.some((l) => l.id === id)) return;
  s.letters.unshift({ id, from, title, body, year: s.year, read: false, quest: !!opts.quest });
  if (s.letters.length > 80) s.letters.length = 80;
  if (!opts.silent) {
    G.audio?.sfx('hoot');
    G.ui?.toast(`🦉 <b>Owl post</b> from ${from}: <i>${title}</i>`, 'quest', 4200);
  }
}
export const unreadLetters = () => (G.save?.letters || []).filter((l) => !l.read).length;
