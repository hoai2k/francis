// Spell definitions + SVG icons (data only, no imports).
export const SPELLS = [
  {
    id: 'expelliarmus', name: 'Expelliarmus', short: 'Disarm', color: 0xff6a2a, color2: 0xffd27a, css: '#ff7a3a',
    mana: 12, cd: 0.6, dmg: 14, speed: 40, radius: 0.35, kind: 'bolt',
    desc: 'The Disarming Charm. Knocks the wand out of a wizard’s hand and shoves them back.',
    icon: '<path d="M12 50 L44 18" stroke-width="5"/><path d="M40 10 l12 4 l-4 12" stroke-width="4"/><circle cx="46" cy="16" r="5" fill="currentColor" stroke="none"/><path d="M8 40 q-4 8 4 14 M18 52 q8 4 14 -2" stroke-width="3"/>',
  },
  {
    id: 'stupefy', name: 'Stupefy', short: 'Stun', color: 0xff2348, color2: 0xff9ab0, css: '#ff3a5a',
    mana: 10, cd: 0.42, dmg: 18, speed: 46, radius: 0.32, kind: 'bolt',
    desc: 'The Stunning Spell. A fast red bolt that dazes its target. Hit a lifted foe to slam them down.',
    icon: '<path d="M32 6 L24 30 H36 L28 58 L46 24 H34 L40 6 Z" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'incendio', name: 'Incendio', short: 'Fire', color: 0xff7a10, color2: 0xffe070, css: '#ff9020',
    mana: 18, cd: 1.0, dmg: 22, speed: 30, radius: 0.5, kind: 'bolt', splash: 2.4,
    desc: 'Conjures a ball of fire that bursts and sets foes alight. Cornish pixies hate it.',
    icon: '<path d="M32 58 C14 54 12 36 22 26 C22 34 28 36 28 36 C26 24 34 14 34 6 C44 16 52 28 48 42 C46 52 40 58 32 58 Z" fill="currentColor" stroke="none"/><path d="M32 54 C26 52 24 44 30 38 C32 44 36 44 36 44 C40 48 38 54 32 54Z" fill="#fff6" stroke="none"/>',
  },
  {
    id: 'protego', name: 'Protego', short: 'Shield', color: 0x6cc4ff, color2: 0xd8f0ff, css: '#6cc4ff',
    mana: 8, drain: 13, cd: 0.2, dmg: 0, kind: 'shield',
    desc: 'The Shield Charm. Hold to block. Raise it just before a spell lands to reflect it back.',
    icon: '<path d="M32 6 L54 14 V30 C54 44 44 54 32 58 C20 54 10 44 10 30 V14 Z" stroke-width="4"/><path d="M32 16 V48 M20 28 H44" stroke-width="3"/>',
  },
  {
    id: 'lumos', name: 'Lumos', short: 'Light', color: 0xfff2c0, color2: 0xffffff, css: '#fff2c0',
    mana: 6, drain: 1.2, cd: 0.4, dmg: 0, kind: 'light',
    desc: 'Lights your wand tip. The first flash dazzles pixies and stings Dementors. Reveals hidden collectibles.',
    icon: '<circle cx="32" cy="32" r="10" fill="currentColor" stroke="none"/><path d="M32 6 V16 M32 48 V58 M6 32 H16 M48 32 H58 M14 14 L21 21 M43 43 L50 50 M50 14 L43 21 M21 43 L14 50" stroke-width="4"/>',
  },
  {
    id: 'leviosa', name: 'Wingardium Leviosa', short: 'Levitate', color: 0xc28bff, color2: 0xf0dcff, css: '#c28bff',
    mana: 14, cd: 0.7, dmg: 4, speed: 36, radius: 0.45, kind: 'bolt',
    desc: 'Lifts a foe or object into the air. Cast again to throw it. Combo: lift, then Incendio or Stupefy.',
    icon: '<path d="M16 44 C20 30 30 30 32 20 C34 30 44 30 48 44" stroke-width="4"/><path d="M32 20 L32 6 M26 12 L32 6 L38 12" stroke-width="4"/><ellipse cx="32" cy="50" rx="14" ry="5" stroke-width="3"/>',
  },
  {
    id: 'petrificus', name: 'Petrificus Totalus', short: 'Freeze', color: 0x8ff0ff, color2: 0xffffff, css: '#8ff0ff',
    mana: 20, cd: 2.2, dmg: 10, speed: 34, radius: 0.4, kind: 'bolt',
    desc: 'The Full Body-Bind. Freezes a foe solid. Hit a frozen foe with Stupefy or Expelliarmus to shatter it.',
    icon: '<path d="M32 6 V58 M9 19 L55 45 M55 19 L9 45" stroke-width="4"/><path d="M26 10 L32 16 L38 10 M26 54 L32 48 L38 54" stroke-width="3"/>',
  },
  {
    id: 'patronum', name: 'Expecto Patronum', short: 'Patronus', color: 0xbfe6ff, color2: 0xffffff, css: '#cfeaff',
    mana: 55, cd: 10, dmg: 45, speed: 17, kind: 'patronus',
    desc: 'Summons a silver stag that charges through foes. The only real defence against Dementors.',
    icon: '<path d="M18 52 L22 36 C18 30 20 24 28 24 L40 24 C46 24 48 30 44 36 L48 52" stroke-width="4"/><path d="M28 24 C24 16 18 14 14 8 M24 18 L16 18 M40 24 C44 16 50 14 52 8 M44 18 L52 18" stroke-width="3"/>',
  },
];
export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((s) => [s.id, s]));
// combos listed in the spellbook (spells2.js adds more)
export const COMBOS = [
  { name: 'Fire Comet', how: 'Leviosa → Incendio', need: ['leviosa', 'incendio'] },
  { name: 'Meteor Slam', how: 'Leviosa → Stupefy', need: ['leviosa', 'stupefy'] },
  { name: 'Shatter', how: 'Petrificus → Stupefy/Expelliarmus', need: ['petrificus', 'stupefy'] },
  { name: 'Steam Blast', how: 'Incendio → Petrificus', need: ['incendio', 'petrificus'] },
  { name: 'Knockout', how: 'Expelliarmus → Stupefy', need: ['expelliarmus', 'stupefy'] },
];
export function spellIcon(s, size = 40) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="color:${s.css}">${s.icon}</svg>`;
}
