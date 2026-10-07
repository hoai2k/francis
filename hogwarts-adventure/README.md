# Hogwarts Adventure

A Harry Potter–inspired 3D adventure in the browser. You arrive as a new
student, get sorted into a house, explore a candlelit castle, learn eight
spells, fight dark wizards, a mountain troll and Dementors, and earn house
points in six minigames. The House Cup is decided at the end-of-term feast.

Play: <https://hoai2k.github.io/francis/hogwarts-adventure/>

It runs on [three.js](https://threejs.org) (r186, loaded from a CDN) with no
build step. Everything is generated in code: the castle, characters,
textures, particles, the music and the sound effects.

## The trip to school

Every year begins at **King's Cross**. Find the barrier between platforms 9
and 10 and *run* at it (hold sprint) to reach **Platform 9¾**, with its crowds,
caged owls, trolleys and the steaming scarlet engine. Walk into a carriage door
to board the **Hogwarts Express**: walk the carriages, find your friends'
compartment, buy sweets from the trolley (Chocolate Frogs can contain a card
you are missing) and live through each year's event on board. Take your seat to
watch the train cross the Highlands as the sun goes down, then cross the Black
Lake by boat as a first-year, or ride the carriages up to the castle in later
years. Sweets and gifts go in your **Satchel** (pause menu).

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

Thirty spells, learned year by year in classes, quests and from friends. Each
has its own particles, sound and effects, levels up with use, and many solve
puzzles. Protego is always on the block button; the rest go in your loadouts.

| Year | Spells |
|------|--------|
| 1 | Expelliarmus, Stupefy, Incendio, Protego, Lumos, Wingardium Leviosa, Petrificus Totalus, Expecto Patronum |
| 2 | Flipendo (knockback), Alohomora (unlock), Reparo (mend), Accio (summon / fetch), Rictusempra (tickle), Episkey (heal) |
| 3 | Glacius (chill, then freeze), Depulso (banish), Arresto Momentum (slowing dome), Finite Incantatem (dispel) |
| 4 | Confringo (blasting curse), Diffindo (piercing blade), Descendo (slam down), Aguamenti (water jet) |
| 5 | Bombarda (delayed bomb), Silencio, Obscuro (blind), Incarcerous (bind) |
| 6 | Levicorpus (hoist), Ventus (gust cone), Reducto (shatter) |
| 7 | Oppugno (a flock of golden birds) |

**Combos:** Leviosa → Incendio = *Fire Comet* · Leviosa → Stupefy = *Meteor
Slam* · Petrificus → Stupefy/Expelliarmus = *Shatter* · Incendio →
Petrificus = *Steam Blast* · Expelliarmus → Stupefy = *Knockout* · Aguamenti →
Glacius = *Deep Freeze* · Glacius → Incendio/Confringo = *Thermal Shock* ·
Leviosa/Levicorpus → Descendo = *Ground Pound* · Accio → Depulso = *Slingshot*
· Arresto Momentum → Bombarda = *Time Bomb* · Incendio → Ventus = *Firestorm* ·
Obscuro → any damaging spell = *Sneak Attack* · Rictusempra → Stupefy =
*Giggle Knockout* · Incarcerous → Incendio/Confringo = *Firebrand*.

**Puzzles:** Alohomora opens locked chests and gates, Reparo mends statues,
bridges and brooms, Incendio lights braziers (Aguamenti and Ventus douse them),
Confringo / Bombarda / Reducto blast cracked walls, Diffindo or fire clears webs,
Finite dissolves magical barriers, Accio fetches things from ledges, Depulso and
Flipendo push blocks onto pressure plates, Ventus turns windmills and Glacius
freezes water into ice.

**Weaknesses:** pixies take double damage from fire and ice. Trolls shrug
off Stupefy, but their club can be levitated. Dementors only fear the
Patronus and Lumos. Bosses resist crowd control.

## Friends and companions

Nine classmates across the four houses, each with a personality, a home town,
favourite gifts and a friendship meter: Pip Fenwick, Oren Achterberg, Tamsin
Hollowell, Kofi Mensah-Lowe, Isolde Varga, Ruairí Doyle, Mei Lin Chau, Bram
Okonkwo-Hale and your rival, Cassius Vane. Meet them on the Hogwarts Express
and around the castle. Raise friendship by chatting, giving gifts (sweets and
found items, liked gifts count most), studying together, their side quests,
and choosing them as your duelling or study partner (Pip's frog chase, a
practice duel with Mei, flying with Tamsin, Silvermane with Ruairí).

- **Friend (♥♥):** they can join you as a companion with their own AI and
  spells. One at a time; they follow you, fight, step out of telegraphed
  attacks and use a special (Pip heals, Bram shields, Tamsin blasts…).
- **Orders:** hold **G** / **D-pad ←** (touch: 👥) for the command wheel:
  follow, attack my target, hold position, special.
- **Good friend (♥♥♥):** they teach you their spell.
- **Rival:** Cassius starts cold. Win him over and, from your sixth year, he
  will fight beside you.
- The **Friends** screen in the pause menu shows everyone's meter and lets you
  pick a companion.

## Quidditch career (optional)

Talk to Madam Hale at the pitch: tryouts open in your second year (or your
first, if your practice score is high enough). Three drills — rings,
catching Quaffles and surviving Bludgers — then pick a position: **Seeker**
(catch the Snitch), **Chaser** (carry, pass and shoot the Quaffle; tackle the
carrier), **Keeper** (block shots at your hoops) or **Beater** (bat Bludgers at
the other team). Matches are seven-a-side with AI teammates and opponents, two
Bludgers, the Snitch, live commentary and cheering stands. Each year has three
fixtures against the other houses, a league table and the Quidditch Cup; wins
earn house points, Sickles and experience. Better brooms (Swiftwind 5,
Thunderhawk, Starfall X) come from Spintwitch's in Hogsmeade or as Cup rewards.
The **Quidditch** screen in the pause menu has your fixtures, the table and
your brooms.

## Year 2 — The Hidden Chamber

A snake loose on the Hogwarts Express is only the start. Learn Flipendo from
the new Defence teacher, Professor Crane; Alohomora and Reparo in Charms; and
Accio at the Duelling Club, where your rival Cassius Vane challenges you.
Serpents slither out of the walls, a message appears in blood-red letters, and
at Christmas two students are found turned to stone. Brew the Mandrake
Draught, follow Oren's clue to the old troll hall, and descend into the
**Undercroft**: a locked gate, a broken bridge over a chasm, a hall of braziers
(with an optional block puzzle, a ledge to Accio from and a chest), a duel with
the possessed professor and finally **the Wyrm of the Undercroft** — a giant
serpent that lunges, spits venom, sweeps its tail, hides in the pools and
petrifies anyone who looks into its eyes (look away, block, or dazzle it with
Lumos). Side quests: Kofi's secret stash (teaches Rictusempra), Pip's treasure
hunt, Madam Hale's broken brooms and Cassius's stolen wand.

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
| Companion orders (hold) | G | D-pad ← |
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
