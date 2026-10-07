// The wider spell library learned over the seven years: definitions, icons, particle
// trails, on-hit effects (statuses, knockback, pulls), cone / field / summon spells
// and the extra combos they open up. Extends SPELLS / SPELL_BY_ID at load time.
import * as THREE from 'three';
import { G } from './state.js';
import { SPELLS, SPELL_BY_ID, COMBOS } from './spelldata.js';
import { controlMult, masteryArea, masteryLevel } from './progress.js';
import { glowSprite } from './textures.js';
import { rand } from './util.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const cc = (e, d) => d * controlMult() * (e.def.boss ? 0.3 : 1); // crowd-control duration
const knock = (e, dir, f, up = 2) => { if (e.def.boss) f *= 0.15; e.vel.addScaledVector(dir, f); if (!e.def.flying) e.vel.y = Math.max(e.vel.y, up * (e.def.boss ? 0.2 : 1)); };
const status = (e, k, d) => { e.status[k] = Math.max(e.status[k] || 0, cc(e, d)); };
const top = (e) => e.pos.clone().setY(e.pos.y + e.height + 0.3);
const say = (e, txt, cls = 'combo') => G.ui.floatText(top(e), txt, cls);

const NEW = [
  // ---------------------------------------------------------------- Year 2
  { id: 'accio', name: 'Accio', short: 'Summon', color: 0x9ad8ff, color2: 0xffffff, css: '#9ad8ff', mana: 12, cd: 1.2, dmg: 6, speed: 44, radius: 0.35, kind: 'bolt', trail: 'ring', year: 2,
    desc: 'The Summoning Charm. Pulls a foe off its feet toward you, or fetches objects and collectibles from afar.', puzzle: 'fetch items from ledges and across gaps',
    icon: '<path d="M10 32 H44" stroke-width="5"/><path d="M22 20 L10 32 L22 44" stroke-width="5"/><circle cx="50" cy="32" r="7" fill="currentColor" stroke="none"/>',
    pre: (sp, p) => accioFetch(sp),
    onHit(e, pr, dir) { if (e.def.boss) { say(e, 'Too heavy', 'warn'); return; } const to = _v.subVectors(G.player.pos, e.pos).setY(0).normalize(); knock(e, to, Math.min(16, e.pos.distanceTo(G.player.pos) * 1.4), 4); status(e, 'stun', 1.2); e.pulledT = 1.6; say(e, 'Accio!'); } },
  { id: 'reparo', name: 'Reparo', short: 'Repair', color: 0xffe9a8, color2: 0xffffff, css: '#ffe9a8', mana: 6, cd: 0.8, dmg: 0, speed: 38, radius: 0.4, kind: 'bolt', trail: 'sparkle', year: 2, utility: true,
    desc: 'The Mending Charm. Repairs broken things: statues, bridges, windows, cauldrons.', puzzle: 'mend broken bridges and statues',
    icon: '<path d="M14 50 L30 34" stroke-width="5"/><path d="M34 30 L50 14" stroke-width="5" stroke-dasharray="4 4"/><path d="M40 40 l8 8 M48 40 l-8 8" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="currentColor" stroke="none"/>' },
  { id: 'alohomora', name: 'Alohomora', short: 'Unlock', color: 0xd8b8ff, color2: 0xffffff, css: '#d8b8ff', mana: 5, cd: 0.8, dmg: 0, speed: 38, radius: 0.4, kind: 'bolt', trail: 'sparkle', year: 2, utility: true,
    desc: 'The Unlocking Charm. Opens locked doors, gates and chests.', puzzle: 'open locked doors and chests',
    icon: '<circle cx="24" cy="24" r="10" stroke-width="5"/><path d="M31 31 L52 52 M44 44 L50 38 M48 48 L54 42" stroke-width="5"/>' },
  { id: 'flipendo', name: 'Flipendo', short: 'Knockback', color: 0x6ad0ff, color2: 0xd0f4ff, css: '#6ad0ff', mana: 10, cd: 0.9, dmg: 10, speed: 36, radius: 0.45, kind: 'bolt', trail: 'swirl', year: 2,
    desc: 'The Knockback Jinx. Flips foes head over heels; small creatures are knocked senseless. Shoves heavy blocks.', puzzle: 'flip switches and push blocks',
    icon: '<path d="M14 44 C14 20 50 20 50 36" stroke-width="5"/><path d="M42 30 L50 38 L56 28" stroke-width="5"/>',
    onHit(e, pr, dir) { knock(e, dir, 9, 6); status(e, 'stun', e.def.flying ? 3 : 1.2); if (!e.def.boss) e.tumble = 0.7; } },
  { id: 'rictusempra', name: 'Rictusempra', short: 'Tickle', color: 0xffd040, color2: 0xfff4c0, css: '#ffd040', mana: 9, cd: 1.0, dmg: 6, speed: 40, radius: 0.35, kind: 'bolt', trail: 'sparkle', year: 2,
    desc: 'The Tickling Charm. Foes collapse giggling and drop their guard; wizards lose their grip on their wands.', puzzle: 'make portraits laugh and open passages',
    icon: '<circle cx="32" cy="32" r="22" stroke-width="4"/><path d="M20 36 Q32 50 44 36" stroke-width="4"/><path d="M22 24 l4 4 M42 24 l-4 4" stroke-width="4"/>',
    onHit(e) { status(e, 'laugh', 2.6); if (e.type === 'wizard' || e.type === 'duelist') e.disarm?.(); say(e, 'Ha ha!'); } },
  { id: 'episkey', name: 'Episkey', short: 'Heal', color: 0x80ff9a, color2: 0xe0ffe8, css: '#80ff9a', mana: 26, cd: 9, dmg: 0, kind: 'self', year: 2,
    desc: 'The Healing Spell. Mends your wounds (and your companion’s) over a few seconds.',
    icon: '<path d="M26 10 H38 V26 H54 V38 H38 V54 H26 V38 H10 V26 H26 Z" fill="currentColor" stroke="none"/>',
    cast(sp, p) {
      const amt = 28 + masteryLevel('episkey') * 6;
      p.heal(amt * 0.5);
      p.regen = { t: 3, rate: amt * 0.5 / 3 };
      G.companion?.heal?.(amt);
      G.audio.sfx('episkey');
      G.fx.emit({ pos: p.pos.clone().setY(p.pos.y + 1), color: 0x80ff9a, count: 50, speed: 3, size: 0.25, life: 1, intensity: 2.5, up: 2, spread: 1 });
      G.fx.shock(p.pos.clone().setY(p.pos.y + 0.1), 0x80ff9a, 3, 0.5, { intensity: 1 });
      G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.2), `+${Math.round(amt)}`, 'heal');
    } },
  // ---------------------------------------------------------------- Year 3
  { id: 'glacius', name: 'Glacius', short: 'Frost', color: 0xa8f0ff, color2: 0xffffff, css: '#a8f0ff', mana: 14, cd: 1.1, dmg: 14, speed: 34, radius: 0.45, kind: 'bolt', trail: 'ice', year: 3,
    desc: 'The Freezing Charm. Chills a foe to a crawl; a second hit (or a soaked foe) freezes them solid. Freezes water into ice.', puzzle: 'freeze water into ice platforms',
    icon: '<path d="M32 6 V58 M10 19 L54 45 M54 19 L10 45" stroke-width="3"/><circle cx="32" cy="32" r="8" fill="currentColor" stroke="none"/><path d="M26 8 L32 14 L38 8" stroke-width="3"/>',
    onHit(e) {
      if (e.type === 'dementor') { say(e, 'No effect', 'warn'); return; }
      if (e.status.chill > 0) { e.status.chill = 0; status(e, 'frozen', 2.6); G.audio.sfx('petrificus'); say(e, 'Frozen!'); }
      else { status(e, 'chill', 4); say(e, 'Chilled'); }
    } },
  { id: 'depulso', name: 'Depulso', short: 'Banish', color: 0xff9ad0, color2: 0xffe0f0, css: '#ff9ad0', mana: 12, cd: 1.1, dmg: 12, speed: 42, radius: 0.4, kind: 'bolt', trail: 'swirl', year: 3,
    desc: 'The Banishing Charm. Hurls a foe (or a heavy object) far away from you. Foes slammed into walls are stunned.', puzzle: 'push heavy blocks onto pressure plates',
    icon: '<path d="M10 32 H46" stroke-width="5"/><path d="M38 20 L50 32 L38 44" stroke-width="5"/><circle cx="12" cy="32" r="6" fill="currentColor" stroke="none"/>',
    onHit(e, pr, dir) { knock(e, dir, 18, 4); status(e, 'stun', 1.4); e.banished = 0.8; } },
  { id: 'arresto', name: 'Arresto Momentum', short: 'Slow', color: 0x8ab0ff, color2: 0xe0e8ff, css: '#8ab0ff', mana: 24, cd: 8, dmg: 0, kind: 'field', year: 3,
    desc: 'Slows everything inside a dome: foes, their spells, swinging traps and falling objects.', puzzle: 'slow pendulums and moving platforms',
    icon: '<circle cx="32" cy="34" r="20" stroke-width="4"/><path d="M32 34 V20 M32 34 L42 40" stroke-width="4"/><path d="M26 8 H38" stroke-width="4"/>',
    cast(sp, p) {
      const aim = G.spells.aimPoint(p.wandPos());
      const at = aim.target ? aim.target.pos.clone() : aim.point.clone();
      at.y = G.zone.colliders.ground(at.x, at.z, at.y + 2).y;
      G.spells.addField(at, 6.5 * masteryArea('arresto'), 5 + masteryLevel('arresto'), 'slow', 0x8ab0ff);
      G.audio.sfx('arresto');
      G.puzzles?.spellArea?.('arresto', at, 7);
    } },
  { id: 'finite', name: 'Finite Incantatem', short: 'Dispel', color: 0xf0f0ff, color2: 0xd0d8ff, css: '#e8ecff', mana: 14, cd: 2.5, dmg: 4, speed: 46, radius: 0.4, kind: 'bolt', trail: 'sparkle', year: 3,
    desc: 'Ends spells and curses: shatters enemy shields, lifts curses from you and dissolves magical barriers.', puzzle: 'dissolve magical barriers',
    icon: '<circle cx="32" cy="32" r="20" stroke-width="4"/><path d="M18 46 L46 18" stroke-width="5"/>',
    pre(sp, p) { // cleanse yourself as you cast
      if (p.status.burn) { p.status.burn = 0; G.ui.floatText(p.pos.clone().setY(p.pos.y + 2), 'Cleansed', 'heal'); }
      p.cursed = 0;
    },
    onHit(e) {
      if (e.shield > 0 || e.shieldHits) { e.shield = 0; e.shieldHits = 0; e.blockT = 0; if (e.shieldMesh) e.shieldMesh.visible = false; G.audio.sfx('shatter'); say(e, 'Dispelled!'); status(e, 'stun', 1); }
      for (const k of ['hasted', 'enraged_']) e[k] = 0;
    } },
  // ---------------------------------------------------------------- Year 4
  { id: 'confringo', name: 'Confringo', short: 'Blast', color: 0xff5a20, color2: 0xffd080, css: '#ff6a30', mana: 18, cd: 1.3, dmg: 26, speed: 52, radius: 0.4, kind: 'bolt', splash: 3.4, trail: 'fire', year: 4,
    desc: 'The Blasting Curse. A fast streak of fire that explodes on impact. Blows apart cracked walls.', puzzle: 'blast open cracked walls',
    icon: '<path d="M32 6 L38 24 L56 26 L42 38 L48 56 L32 46 L16 56 L22 38 L8 26 L26 24 Z" fill="currentColor" stroke="none"/>',
    onHit(e) { e.status.burn = Math.max(e.status.burn, 2); } },
  { id: 'diffindo', name: 'Diffindo', short: 'Sever', color: 0xe0ff70, color2: 0xffffff, css: '#e0ff70', mana: 14, cd: 1.0, dmg: 20, speed: 48, radius: 0.55, kind: 'bolt', pierce: 3, trail: 'blade', year: 4,
    desc: 'The Severing Charm. A spinning blade of light that cuts through up to three foes in a line. Cuts ropes, vines and webs.', puzzle: 'cut ropes, vines and webs',
    icon: '<path d="M10 50 C24 40 40 24 50 10" stroke-width="5"/><path d="M14 54 C30 46 46 30 54 14" stroke-width="2"/>' },
  { id: 'descendo', name: 'Descendo', short: 'Slam down', color: 0xb080ff, color2: 0xe8d8ff, css: '#b080ff', mana: 14, cd: 1.4, dmg: 14, speed: 40, radius: 0.45, kind: 'bolt', trail: 'swirl', year: 4,
    desc: 'Drives a foe hard into the ground. Lifted, flying or airborne foes take huge damage. Brings down things that are out of reach.', puzzle: 'bring down high ledges and bridges',
    icon: '<path d="M32 8 V46" stroke-width="5"/><path d="M20 34 L32 48 L44 34" stroke-width="5"/><path d="M12 56 H52" stroke-width="4"/>',
    onHit(e, pr) {
      const air = e.status.lifted > 0 || e.def.flying || e.pos.y > G.zone.colliders.ground(e.pos.x, e.pos.z, e.pos.y + 1).y + 0.6;
      if (air) {
        if (e.status.lifted > 0) e.endLift?.(true);
        if (e.def.flying && e.type !== 'dementor') { e.grounded = 4; e.hoverY = 0; }
        pr.def = { ...pr.def, dmg: pr.def.dmg * 3 };
        status(e, 'stun', 2);
        G.spells.explodeAt(e.pos.clone(), 3, 14, 0xb080ff, 'slam', { stun: 1 });
        say(e, 'Slammed!');
      }
    } },
  { id: 'aguamenti', name: 'Aguamenti', short: 'Water', color: 0x4aa8ff, color2: 0xd0eaff, css: '#4aa8ff', mana: 12, cd: 1.6, dmg: 5, kind: 'cone', range: 8, angle: 0.4, year: 4,
    desc: 'A jet of water. Soaks foes (soaked foes freeze solid at a touch of Glacius) and puts out fires.', puzzle: 'douse fires and fill basins',
    icon: '<path d="M32 8 C22 24 16 32 16 40 A16 16 0 0 0 48 40 C48 32 42 24 32 8 Z" fill="currentColor" stroke="none"/>',
    cast(sp, p) { G.spells.cone(sp, p, { color: 0x4aa8ff, color2: 0xd0eaff, style: 'water', apply(e, dir) { status(e, 'wet', 8); e.status.burn = 0; knock(e, dir, 4, 1); } }); } },
  // ---------------------------------------------------------------- Year 5
  { id: 'bombarda', name: 'Bombarda', short: 'Bomb', color: 0xffa040, color2: 0xfff0a0, css: '#ffa040', mana: 24, cd: 3.2, dmg: 8, speed: 34, radius: 0.5, kind: 'bolt', trail: 'smoke', year: 5,
    desc: 'The Exploding Charm. Plants a charge that detonates a moment later in a huge blast.', puzzle: 'demolish rubble and sealed doors',
    icon: '<circle cx="28" cy="38" r="18" fill="currentColor" stroke="none"/><path d="M40 24 L48 14" stroke-width="4"/><path d="M48 8 l4 4 M54 14 l-4 2 M46 6 l0 4" stroke-width="3"/>',
    onHit(e, pr) { G.spells.plantBomb(e, pr.pos.clone()); },
    onWorld(pos) { G.spells.plantBomb(null, pos); } },
  { id: 'silencio', name: 'Silencio', short: 'Silence', color: 0xc0c8d8, color2: 0xffffff, css: '#c0c8d8', mana: 10, cd: 1.5, dmg: 0, speed: 44, radius: 0.4, kind: 'bolt', trail: 'smoke', year: 5,
    desc: 'The Silencing Charm. A silenced foe cannot cast spells for a while.', puzzle: 'quiet shrieking portraits and alarms',
    icon: '<path d="M14 28 Q14 16 32 16 Q50 16 50 28 Q50 40 32 40 Q24 40 20 46 L22 38 Q14 34 14 28 Z" stroke-width="4"/><path d="M10 54 L54 10" stroke-width="4"/>',
    onHit(e) { status(e, 'silence', 7); e.castWind = 0; say(e, 'Silenced'); } },
  { id: 'obscuro', name: 'Obscuro', short: 'Blind', color: 0x4a3a6a, color2: 0x8a7ab0, css: '#9a8ad0', mana: 10, cd: 1.6, dmg: 0, speed: 44, radius: 0.4, kind: 'bolt', trail: 'smoke', year: 5,
    desc: 'Conjures a blindfold. Blinded foes wander and miss. The next hit on a blinded foe is a critical sneak attack.',
    icon: '<path d="M8 30 Q32 14 56 30 Q32 46 8 30 Z" stroke-width="4"/><path d="M8 26 H56 V34 H8 Z" fill="currentColor" stroke="none"/>',
    onHit(e) { status(e, 'blind', 7); say(e, 'Blinded'); } },
  { id: 'incarcerous', name: 'Incarcerous', short: 'Bind', color: 0xc8a060, color2: 0xf0e0b0, css: '#d8b070', mana: 16, cd: 2.2, dmg: 6, speed: 38, radius: 0.45, kind: 'bolt', trail: 'rope', year: 5,
    desc: 'Ropes spring from the wand and bind a foe where they stand.',
    icon: '<path d="M16 16 C48 20 16 32 48 36 C16 40 48 52 16 52" stroke-width="5"/>',
    onHit(e) { status(e, 'bound', 4); say(e, 'Bound!'); } },
  // ---------------------------------------------------------------- Year 6
  { id: 'levicorpus', name: 'Levicorpus', short: 'Hoist', color: 0xe080ff, color2: 0xf8e0ff, css: '#e080ff', mana: 16, cd: 2.4, dmg: 6, speed: 40, radius: 0.45, kind: 'bolt', trail: 'swirl', year: 6,
    desc: 'Hoists a foe into the air by the ankle, helpless and upside down. Counts as lifted for combos.',
    icon: '<path d="M32 8 V30" stroke-width="4"/><circle cx="32" cy="40" r="8" stroke-width="4"/><path d="M24 54 L32 48 L40 54" stroke-width="4"/>',
    onHit(e) { if (e.def.boss) { say(e, 'Too strong', 'warn'); return; } e.lift(); e.status.lifted = cc(e, 4.5); e.hoisted = true; say(e, 'Levicorpus!'); } },
  { id: 'ventus', name: 'Ventus', short: 'Gust', color: 0xd8f0e8, color2: 0xffffff, css: '#d8f0e8', mana: 14, cd: 1.6, dmg: 6, kind: 'cone', range: 10, angle: 0.65, year: 6,
    desc: 'A roaring gust that blows back every foe in front of you, spreads their flames and turns windmills.', puzzle: 'turn windmills and blow out flames',
    icon: '<path d="M8 22 H40 A8 8 0 1 0 32 14" stroke-width="4"/><path d="M8 32 H50 A8 8 0 1 1 42 40" stroke-width="4"/><path d="M8 42 H30" stroke-width="4"/>',
    cast(sp, p) { G.spells.cone(sp, p, { color: 0xe8fff8, color2: 0xffffff, style: 'wind', apply(e, dir) { knock(e, dir, 14, 3); if (e.status.burn > 0) G.spells.firestorm(e); } }); } },
  { id: 'reducto', name: 'Reducto', short: 'Shatter', color: 0xff3a6a, color2: 0xffb0c8, css: '#ff4a7a', mana: 22, cd: 2.2, dmg: 42, speed: 50, radius: 0.45, kind: 'bolt', trail: 'fire', year: 6,
    desc: 'The Reductor Curse. Blasts solid objects to dust. Shatters shields and hits trolls and constructs hard.', puzzle: 'blast boulders and statues to dust',
    icon: '<path d="M32 10 L40 26 L56 22 L44 36 L54 52 L34 44 L26 58 L22 42 L8 40 L20 28 L12 14 L28 20 Z" stroke-width="3"/><circle cx="32" cy="34" r="6" fill="currentColor" stroke="none"/>',
    onHit(e) { if (e.shield > 0 || e.shieldHits) { e.shield = 0; e.shieldHits = 0; if (e.shieldMesh) e.shieldMesh.visible = false; G.audio.sfx('shatter'); say(e, 'Shield shattered!'); } } },
  // ---------------------------------------------------------------- Year 7
  { id: 'oppugno', name: 'Oppugno', short: 'Birds', color: 0xffe080, color2: 0xffffff, css: '#ffe080', mana: 28, cd: 7, dmg: 7, kind: 'summon', year: 7,
    desc: 'Conjures a flock of golden birds that dive at your target again and again.',
    icon: '<path d="M8 30 Q18 20 28 30 Q38 20 48 30" stroke-width="4"/><path d="M20 44 Q26 38 32 44 Q38 38 44 44" stroke-width="4"/><circle cx="50" cy="16" r="5" fill="currentColor" stroke="none"/>',
    cast(sp, p) { G.spells.birds(sp, p); } },
];

for (const s of NEW) { if (!SPELL_BY_ID[s.id]) { SPELLS.push(s); SPELL_BY_ID[s.id] = s; } }

// self / cone / field / summon spells are cast through Spells.castPlayer's custom path
for (const s of NEW) if (['self', 'cone', 'field', 'summon'].includes(s.kind) && !s.cast) s.cast = () => {};

COMBOS.push(
  { name: 'Deep Freeze', how: 'Aguamenti → Glacius', need: ['aguamenti', 'glacius'] },
  { name: 'Thermal Shock', how: 'Glacius → Incendio / Confringo', need: ['glacius', 'confringo'] },
  { name: 'Ground Pound', how: 'Leviosa / Levicorpus → Descendo', need: ['leviosa', 'descendo'] },
  { name: 'Slingshot', how: 'Accio → Depulso', need: ['accio', 'depulso'] },
  { name: 'Time Bomb', how: 'Arresto Momentum → Bombarda', need: ['arresto', 'bombarda'] },
  { name: 'Firestorm', how: 'Incendio → Ventus', need: ['incendio', 'ventus'] },
  { name: 'Sneak Attack', how: 'Obscuro → any damaging spell', need: ['obscuro'] },
  { name: 'Giggle Knockout', how: 'Rictusempra → Stupefy', need: ['rictusempra', 'stupefy'] },
  { name: 'Firebrand', how: 'Incarcerous → Confringo / Incendio', need: ['incarcerous', 'incendio'] },
);

// combos that involve the new spells; returns a combo name or null (called from Spells.tryCombo)
export function tryCombo2(def, e, dir) {
  const s = e.status, id = def.id;
  const sp = G.spells;
  if (s.wet > 0 && id === 'glacius') {
    s.wet = 0; s.chill = 0; s.frozen = Math.max(s.frozen, cc(e, 5));
    e.takeHit({ dmg: 24, spell: 'combo', dir, combo: true });
    G.fx.emit({ pos: e.pos.clone().setY(e.pos.y + 1), color: 0xcff8ff, count: 60, speed: 6, size: 0.25, life: 0.9, intensity: 3 });
    G.audio.sfx('petrificus');
    return 'Deep Freeze';
  }
  if ((s.chill > 0 || s.frozen > 0) && (id === 'incendio' || id === 'confringo')) {
    s.chill = 0; s.frozen = 0;
    e.takeHit({ dmg: def.dmg * 2.6, spell: 'combo', dir, combo: true });
    G.fx.smokePuff(e.pos.clone().setY(e.pos.y + 1), 0xe8eef2, 20, { size: 1.6, size1: 3.5, speed: 4, alpha: 0.5 });
    return 'Thermal Shock';
  }
  if (s.lifted > 0 && id === 'descendo') {
    e.endLift?.(true);
    e.takeHit({ dmg: 46, spell: 'combo', dir, combo: true });
    setTimeout(() => sp.explodeAt(e.pos.clone(), 5, 30, 0xb080ff, 'slam', { stun: 2.5 }), 200);
    return 'Ground Pound';
  }
  if (e.pulledT > 0 && id === 'depulso') {
    knock(e, dir, 30, 6);
    e.takeHit({ dmg: 40, spell: 'combo', dir, combo: true });
    s.stun = Math.max(s.stun, cc(e, 2.5));
    return 'Slingshot';
  }
  if (e.inSlow && id === 'bombarda') { e.timeBomb = true; return 'Time Bomb'; }
  if (s.blind > 0 && def.dmg > 0 && id !== 'obscuro') {
    s.blind = 0;
    e.takeHit({ dmg: def.dmg * 2.2, spell: id, dir, combo: true });
    return 'Sneak Attack';
  }
  if (s.laugh > 0 && id === 'stupefy') {
    s.laugh = 0;
    e.takeHit({ dmg: def.dmg * 2, spell: 'stupefy', dir, combo: true });
    s.stun = Math.max(s.stun, cc(e, 4));
    return 'Giggle Knockout';
  }
  if (s.bound > 0 && (id === 'incendio' || id === 'confringo')) {
    s.burn = 7;
    e.takeHit({ dmg: def.dmg * 1.8, spell: 'combo', dir, combo: true });
    return 'Firebrand';
  }
  return null;
}

// Accio first looks for something to fetch along the aim (collectibles, puzzle items)
function accioFetch() {
  const cam = G.camera, dir = cam.getWorldDirection(new THREE.Vector3());
  const from = cam.position;
  let best = null, bd = 0.14;
  const consider = (pos, obj) => {
    const to = _v.subVectors(pos, from);
    const d = to.length();
    if (d > 34) return;
    const a = Math.acos(Math.min(1, to.dot(dir) / d));
    if (a < bd) { bd = a; best = obj; }
  };
  for (const c of G.story.collectibles) if (!c.got && c.zone === G.zone.name && (!c.hidden || c.revealed)) consider(c.mesh.position, { c });
  for (const t of G.puzzles?.accioTargets?.() || []) consider(t.pos, { t });
  if (!best) return false;
  if (best.c) {
    const c = best.c;
    G.fx.burst(c.mesh.position, 0x9ad8ff, 20, 3);
    G.story.collect(c);
    G.ui.floatText(G.player.pos.clone().setY(G.player.pos.y + 2), 'Accio!', 'combo');
  } else best.t.onAccio();
  G.audio.sfx('accio');
  return true;
}

// ---------------------------------------------------------------- particle trails per spell
export function trail2(pr, d) {
  const p = pr.pos, back = _w.copy(pr.vel).multiplyScalar(-0.05);
  const t = pr.age;
  switch (d.trail) {
    case 'ring':
      G.fx.emit({ pos: _v.set(p.x + Math.cos(t * 30) * 0.3, p.y + Math.sin(t * 30) * 0.3, p.z), color: d.color, count: 2, speed: 0.2, size: 0.16, life: 0.45, intensity: 3 });
      break;
    case 'sparkle':
      G.fx.emit({ pos: p, color: d.color, color2: d.color2, count: 3, speed: 1.2, size: 0.12, size1: 0.02, life: 0.6, intensity: 3, spread: 0.4 });
      break;
    case 'swirl': {
      const r = 0.35;
      for (const k of [0, Math.PI]) G.fx.emit({ pos: _v.set(p.x + Math.cos(t * 22 + k) * r, p.y + Math.sin(t * 22 + k) * r, p.z + Math.sin(t * 11 + k) * r), color: d.color, count: 1, speed: 0.1, size: 0.22, life: 0.4, intensity: 3 });
      break;
    }
    case 'ice':
      G.fx.emit({ pos: p, color: 0xe0faff, count: 3, speed: 0.8, size: 0.18, life: 0.8, intensity: 2.5, gravity: 3, spread: 0.4 });
      G.fx.smokePuff(p, 0xd8f4ff, 1, { size: 0.4, size1: 1, life: 0.5, alpha: 0.25 });
      break;
    case 'fire':
      G.fx.emit({ pos: p, color: d.color2, color2: d.color, count: 4, speed: 0.8, size: 0.5, size1: 0.08, life: 0.3, intensity: 3, vel: back });
      break;
    case 'blade':
      for (let i = 0; i < 4; i++) { const a = t * 40 + i * Math.PI / 2; G.fx.emit({ pos: _v.set(p.x + Math.cos(a) * 0.55, p.y, p.z + Math.sin(a) * 0.55), color: d.color, count: 1, speed: 0.05, size: 0.14, life: 0.18, intensity: 3.5, noScale: true }); }
      break;
    case 'smoke':
      G.fx.smokePuff(p, d.id === 'obscuro' ? 0x14101c : 0x605850, 1, { size: 0.5, size1: 1.2, life: 0.6, alpha: 0.45 });
      G.fx.emit({ pos: p, color: d.color, count: 1, speed: 0.4, size: 0.2, life: 0.3, intensity: 2.5 });
      break;
    case 'rope':
      G.fx.emit({ pos: _v.set(p.x + Math.sin(t * 25) * 0.2, p.y + Math.cos(t * 25) * 0.2, p.z), color: 0xd8b070, count: 2, speed: 0.1, size: 0.14, life: 0.5, intensity: 1.8 });
      break;
    default:
      return false;
  }
  return true;
}

// ---------------------------------------------------------------- extra Spells behaviours (mixed into the Spells class)
export const spellsMixin = {
  // instant cone in front of the player
  cone(sp, p, o) {
    const fwd = G.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    const range = (sp.range || 8) * masteryArea(sp.id), ang = sp.angle || 0.5;
    const origin = p.wandPos();
    p.anim.trigger('cast');
    G.audio.sfx(sp.id);
    G.cam.shake(0.12);
    // stream of particles
    for (let i = 0; i < 70; i++) {
      const a = (Math.random() - 0.5) * 2 * ang;
      const dir = fwd.clone().applyAxisAngle(UP, a);
      dir.y = rand(-0.05, 0.15);
      const v = dir.multiplyScalar(range * rand(1.2, 2.2));
      if (o.style === 'wind') G.fx.smokePuff(origin, 0xe8f4f0, 1, { size: 0.3, size1: 1.6, life: 0.5, alpha: 0.18, vel: v });
      else G.fx.emit({ pos: origin, color: o.color, color2: o.color2, count: 1, speed: 0.2, size: 0.18, size1: 0.3, life: 0.5, intensity: 2.2, vel: v, gravity: o.style === 'water' ? 8 : 0, noScale: true });
    }
    const dmg = G.spells.power(sp);
    for (const e of G.enemies.list) {
      if (!e.alive) continue;
      const to = _v.subVectors(e.pos, p.pos).setY(0);
      const d = to.length();
      if (d > range + e.radius) continue;
      to.normalize();
      if (Math.acos(Math.min(1, to.dot(fwd))) > ang + e.radius / Math.max(1, d)) continue;
      const dir = to.clone();
      if (G.spells.tryCombo({ ...sp, dmg }, e, dir)) continue;
      o.apply(e, dir);
      if (dmg) e.takeHit({ dmg, spell: sp.id, dir, splash: true });
    }
    if (o.style === 'wind' && p.status.burn) p.status.burn = 0;
    G.puzzles?.spellCone?.(sp.id, p.pos, fwd, range, ang);
  },
  // Arresto Momentum style dome
  addField(pos, r, dur, kind, color) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.6), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(pos);
    m.scale.setScalar(0.1);
    G.scene.add(m);
    G.fx.shock(pos.clone().setY(pos.y + 0.1), color, r, 0.6, { intensity: 1.2 });
    (this.fields ||= []).push({ pos: pos.clone(), r, t: dur, max: dur, kind, mesh: m });
  },
  updateFields(dt) {
    if (!this.fields) return;
    for (const f of this.fields) {
      f.t -= dt;
      const k = Math.min(1, (f.max - f.t) * 4) * Math.min(1, f.t * 2);
      f.mesh.scale.setScalar(f.r * Math.max(0.05, k));
      f.mesh.material.opacity = 0.14 + Math.sin(G.time * 4) * 0.03;
      if (Math.random() < 0.3) G.fx.emit({ pos: f.pos.clone().add(new THREE.Vector3(rand(-f.r, f.r), rand(0, f.r * 0.7), rand(-f.r, f.r))), color: 0xb0c8ff, count: 1, speed: 0.1, size: 0.12, life: 1.2, intensity: 2, noScale: true });
      if (f.t <= 0) { G.scene.remove(f.mesh); f.done = true; }
    }
    this.fields = this.fields.filter((f) => !f.done);
  },
  inSlowField(pos) { return (this.fields || []).some((f) => f.kind === 'slow' && f.pos.distanceTo(pos) < f.r); },
  // Bombarda: a charge stuck to a foe or the ground, exploding after a moment
  plantBomb(e, pos) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.4) }));
    m.position.copy(pos);
    G.scene.add(m);
    (this.bombs ||= []).push({ e, m, off: e ? pos.clone().sub(e.pos) : null, t: e?.timeBomb ? 0.5 : 1.1, big: !!e?.timeBomb });
    G.audio.sfx('fuse');
  },
  updateBombs(dt) {
    if (!this.bombs) return;
    for (const b of this.bombs) {
      b.t -= dt;
      if (b.e && b.e.alive) b.m.position.copy(b.e.pos).add(b.off);
      b.m.scale.setScalar(1 + Math.sin(G.time * (30 - b.t * 15)) * 0.3);
      if (Math.random() < 0.6) G.fx.emit({ pos: b.m.position, color: 0xffc040, count: 1, speed: 2, size: 0.1, life: 0.3, intensity: 3, noScale: true });
      if (b.t <= 0) {
        G.scene.remove(b.m);
        b.done = true;
        const sp = SPELL_BY_ID.bombarda;
        const r = 5 * masteryArea('bombarda') * (b.big ? 1.5 : 1);
        this.explodeAt(b.m.position.clone(), r, this.power({ ...sp, dmg: b.big ? 110 : 64 }), 0xffa040, 'explode');
        G.fx.smokePuff(b.m.position, 0x3a3028, 20, { speed: 5, size: 1.5, size1: 4 });
        G.puzzles?.spellArea?.('bombarda', b.m.position, r);
        if (b.big) G.ui.combo('Time Bomb');
      }
    }
    this.bombs = this.bombs.filter((b) => !b.done);
  },
  // Ventus on a burning foe spreads the fire
  firestorm(e) {
    for (const o of G.enemies.list) if (o.alive && o !== e && o.pos.distanceTo(e.pos) < 6) { o.status.burn = 4; G.fx.emit({ pos: o.pos.clone().setY(o.pos.y + 1), color: 0xffb030, color2: 0xff2000, count: 20, speed: 3, size: 0.5, life: 0.6, intensity: 3 }); }
    G.ui.combo('Firestorm');
    G.audio.sfx('combo');
  },
  // Oppugno: golden birds harrying the target
  birds(sp, p) {
    const aim = this.aimPoint(p.wandPos());
    const target = aim.target || G.enemies.list.filter((e) => e.alive).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
    p.anim.trigger('cast');
    G.audio.sfx('oppugno');
    const n = 4 + masteryLevel('oppugno');
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(3, 2.4, 0.8), blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.5);
      s.position.copy(p.wandPos());
      G.scene.add(s);
      (this.flock ||= []).push({ s, target, t: 6, ph: i * 1.3, vel: new THREE.Vector3(rand(-4, 4), rand(2, 5), rand(-4, 4)), cd: 0.4 + i * 0.15, dmg: this.power(sp) });
    }
  },
  updateBirds(dt) {
    if (!this.flock) return;
    for (const b of this.flock) {
      b.t -= dt; b.cd -= dt;
      if (!b.target || !b.target.alive) b.target = G.enemies.list.find((e) => e.alive && e.pos.distanceTo(b.s.position) < 25) || null;
      const goal = b.target ? b.target.pos.clone().setY(b.target.pos.y + b.target.height * 0.7) : G.player.pos.clone().setY(G.player.pos.y + 3);
      const orbit = new THREE.Vector3(Math.cos(G.time * 4 + b.ph) * 2, 1 + Math.sin(G.time * 3 + b.ph), Math.sin(G.time * 4 + b.ph) * 2);
      const want = b.cd <= 0 ? goal : goal.clone().add(orbit);
      b.vel.lerp(want.sub(b.s.position).multiplyScalar(4), dt * 5);
      b.s.position.addScaledVector(b.vel, dt);
      if (Math.random() < 0.5) G.fx.emit({ pos: b.s.position, color: 0xffe080, count: 1, speed: 0.3, size: 0.12, life: 0.4, intensity: 3, noScale: true });
      if (b.target && b.cd <= 0 && b.s.position.distanceTo(goal) < 1) {
        b.cd = 0.9;
        b.target.takeHit({ dmg: b.dmg, spell: 'oppugno', splash: true });
        b.target.status.stun = Math.max(b.target.status.stun, 0.25);
      }
      if (b.t <= 0) { G.scene.remove(b.s); b.done = true; }
    }
    this.flock = this.flock.filter((b) => !b.done);
  },
  clear2() {
    for (const f of this.fields || []) G.scene.remove(f.mesh);
    for (const b of this.bombs || []) G.scene.remove(b.m);
    for (const b of this.flock || []) G.scene.remove(b.s);
    this.fields = []; this.bombs = []; this.flock = [];
  },
};
