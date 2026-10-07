# Hogwarts Adventure

A Harry Potter–inspired 3D adventure in the browser. You arrive as a new
student, get sorted into a house, explore a candlelit castle, learn eight
spells, fight dark wizards, a mountain troll and Dementors, and earn house
points in six minigames. The House Cup is decided at the end-of-term feast.

Play: <https://hoai2k.github.io/francis/hogwarts-adventure/>

It runs on [three.js](https://threejs.org) (r186, loaded from a CDN) with no
build step. Everything is generated in code: the castle, characters,
textures, particles, the music and the sound effects.

## Story

1. **The Sorting**: customise your student, then answer the Sorting Hat's
   questions. You can also ask it for a house.
2. **Charms Class**: clear the Cornish pixies out of the Charms Corridor,
   then pass Professor Thornwick's wand-drawing lesson to learn
   *Wingardium Leviosa*.
3. **Duelling Club**: learn *Expelliarmus* and win your first duel in the
   Great Hall.
4. **Potions**: learn *Incendio*, light your cauldron and brew a potion.
5. **Troll in the Dungeon!**: a boss fight. Levitate the troll's club.
   Reward: *Petrificus Totalus*.
6. **Flying Lessons**: Quidditch practice at the pitch.
7. **Care of Magical Creatures**: earn the Hippogriff's trust, then fly her.
8. **The Patronus Charm**: the Headmistress teaches *Expecto Patronum*.
9. **Shadows on the Lake**: drive the Dementors off the Black Lake pier.
10. **Into the Forbidden Forest**: a three-phase final boss fight against
    Malachar the Hollow.
11. **The House Cup**, then free roam.

## Progression (the seven-year update)

- **School years:** the game is growing into a seven-year saga. Each year has
  its own story, a mid-year twist and a final boss, and ends with the House Cup.
  Saves from before the update continue as *Year 1 complete*. **School Years**
  in the pause menu lists every year and can replay one from the autosave made
  when it began.
- **Levels and talents:** spells, quests, minigames and defeated foes give
  experience. Every level gives a talent point for **Offence** (damage),
  **Defence** (health, damage taken), **Control** (stun/freeze/lift time, combo
  damage) or **Utility** (magic regeneration, cooldowns). Respec for free.
- **Spell mastery:** every spell levels up with use (up to ★★★★): more damage,
  a wider area and a shorter cooldown.
- **Loadouts:** you equip 4 spells in Year 1, one more each year up to 8.
  Protego is always on the block button. Keep three loadouts and swap them with
  **T** or the **D-pad ↑ ↓** (touch: the number button next to your spells).
- **Owl post:** every new quest arrives as a letter. The Owl Post & Journal
  screen is the quest log, with the school calendar date.
- **Save slots:** three save slots plus an autosave at the start and end of
  every year.

## Spells

| # | Spell | Effect |
|---|-------|--------|
| 1 | Expelliarmus | Disarms wizards and knocks them back. Breaks Malachar's shield. |
| 2 | Stupefy | Fast stunning bolt. |
| 3 | Incendio | Fireball that bursts and sets foes alight. |
| 4 | Protego | Hold to block. Raise it just in time to reflect a spell. |
| 5 | Lumos | Wand light. The flash dazzles pixies, hurts Dementors and reveals hidden collectibles. |
| 6 | Wingardium Leviosa | Lifts foes or barrels. Cast again to throw. |
| 7 | Petrificus Totalus | Freezes a foe solid. |
| 8 | Expecto Patronum | A silver stag that charges Dementors. |

**Combos:** Leviosa → Incendio = *Fire Comet* · Leviosa → Stupefy = *Meteor
Slam* · Petrificus → Stupefy/Expelliarmus = *Shatter* · Incendio →
Petrificus = *Steam Blast* · Expelliarmus → Stupefy = *Knockout*.

**Weaknesses:** pixies take double damage from fire and ice. Trolls shrug
off Stupefy, but their club can be levitated. Dementors only fear the
Patronus and Lumos.

## Minigames

All six can also be played from **Minigames** on the title screen.

- **Quidditch**: fly through the rings, dodge two Bludgers and catch the
  Golden Snitch.
- **Potions**: drop ingredients in order on the beat, stir in circles and
  keep the heat in the band. A good brew gives a timed buff (Wiggenweld,
  Liquid Luck, Strength Draught, Focus Tonic).
- **Duelling Club**: a five-round tournament against tougher and tougher
  duellists.
- **Wand drawing**: trace glowing spell shapes quickly and accurately. A
  good run gives a Wand Mastery damage boost.
- **Hippogriff**: bow when she is calm, then fly a ring course over the
  grounds.
- **Chocolate Frog chase**: catch the escaped frogs in the courtyard. Stun
  them with spells to make it easier.

Collectibles: 12 Chocolate Frog cards (some only show up in Lumos light)
and 30 Bertie Bott's beans.

## Controls

| Action | Keyboard & mouse | Controller |
|--------|------------------|-----------|
| Move / look | WASD / mouse | Left / right stick |
| Cast selected spell | Left click | RT / R2 |
| Protego | Right click or Q | Y / △ |
| Lock on | Tab or middle click | LT / L2 |
| Previous / next spell | Wheel, Z / R | LB / RB |
| Spell wheel | Hold C | Hold LB or RB, pick with the right stick |
| Pick spell slot | 1–8 | — |
| Swap loadout | T | D-pad ↑ / ↓ |
| Jump | Space | A / ✕ |
| Dodge roll (hold to sprint) | Shift | B / ◯ (L3 sprints) |
| Interact | E | X / ☐ |
| Spellbook (loadouts, talents) / owl post | B / J | View / pause menu |
| Pause | Esc or P | Menu / Options |

- **Touch:** the left half is a floating joystick (push to the edge to
  sprint). Drag on the right half to look, or swipe fast there to cast toward
  the swipe. On-screen buttons cast, block, dodge, jump, interact and lock on,
  and the spell icons pick a spell.
- **Controllers:** Xbox, PlayStation and Switch Pro controllers are
  detected automatically, and the button prompts change to match.
  Controllers rumble on hits, impacts and Bludgers where the browser supports
  it. The D-pad works in every menu, and every minigame works on a
  controller: steer brooms with the sticks, stir potions and trace wand
  shapes with the right stick.
- **Settings:** graphics quality (low / medium / high), ambient occlusion,
  music and effects volume, mute (M), look sensitivity, stick dead zone,
  invert Y, vibration and the prompt style.

Progress and settings are saved in `localStorage`.

## Graphics

- WebGL renderer with ACES tone mapping and real-time shadows.
- EffectComposer chain: GTAO ambient occlusion (high quality), Unreal
  bloom, and a custom grade / vignette / chromatic-aberration pass with a
  frost effect near Dementors.
- Day/night sky with sun, moon, stars and clouds. Castle windows light up at
  night.
- Splat-mapped terrain, a reflective Black Lake, an instanced forest, mist,
  fireflies, dust motes and magical sparkles.
- Interiors: the Great Hall (enchanted ceiling, 300 floating candles,
  house-point hourglasses), the Grand Staircase with moving flights, the
  Charms Corridor, the Dungeons and the Headmistress's tower.
- A pool of dynamic point lights for torches, candles and spells.
- Particle trails, impact bursts and shockwaves for every spell. The camera
  shakes on hits and the game drops into slow motion for finishing blows.

## Files

- `js/main.js`: boot, loading screen and main loop
- `js/engine.js`: renderer, post-processing and the light pool
- `js/world/`: terrain, castle exterior, interiors and the zone manager
- `js/models.js`: procedural characters and creatures with code-driven
  animation
- `js/spells.js`, `js/enemies.js`, `js/player.js`, `js/camera.js`: combat
  and movement
- `js/story.js`, `js/menus.js`, `js/ui.js`: quests, NPCs, menus and HUD
- `js/audio.js`: procedural orchestral music and sound effects
- `js/minigames/`: the six minigames

## Credits

A fan-made game. Not affiliated with or endorsed by J.K. Rowling, Warner
Bros. or Wizarding World.

- three.js (MIT licence).
- Fonts: Cinzel, Cinzel Decorative and EB Garamond (SIL Open Font
  Licence), served by Google Fonts.
- No third-party models, textures or audio files are used.
