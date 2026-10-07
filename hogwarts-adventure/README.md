# Hogwarts Adventure

A Harry Potter–inspired 3D adventure in the browser: a full **seven-year
saga**. You arrive as a new student and get sorted into a house. Each year you
ride the Hogwarts Express back to a candlelit castle, learn about thirty
spells, make friends and a rival, and fight dark wizards, trolls, Dementors, a
giant serpent, a dragon, Inferi and, in the end, the Hollow King himself. Earn
house points in quests and minigames; the House Cup is decided at every
end-of-term feast.

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

- **School years:** all seven years are playable. Each year has its own story,
  a mid-year twist and a final boss, and ends with the House Cup.
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
- **Map and fast travel:** press **N** (or Pause → Map & Fast Travel) for a
  map of the grounds with your position and quest marker. Jump to any place
  you can reach: the Great Hall, courtyard, staircase, corridor, dungeons,
  pitch, Brannoc's hut, the paddock, the lake shore, the forest edge,
  Hogsmeade or the Room of Requirement. Fast travel is not available during
  fights, cutscenes or the trip to school.
- **Gear:** Pause → Gear. Wands give spell power, faster cooldowns or more
  magic. Robes reduce the damage you take or add health. Hats are just for
  looks. Order them by owl with Sickles, or earn them in the story: the
  dragonhide coat after the First Task, the Elder Branch at the very end.
- **Difficulty and accessibility:** Settings has **Story / Normal / Hard**
  difficulty, aim assist (off to high), captions for important sounds,
  colour-blind-friendly danger zones (yellow and striped) and larger text.
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

## Year 3 — The Grey Tide

The Hogwarts Express grinds to a halt in the cold and a Dementor drifts down
the corridor until the new Defence teacher, Professor Ashdown, drives it off.
Learn Depulso, Arresto Momentum (swinging pendulums in the corridor) and Finite
Incantatem (barriers sealing the staircases). Visit **Hogsmeade** for the
first time: its sweet shop, joke shop, tea room and the Three Brooms, where you
overhear Ministry Undersecretary Grimshaw. Dementors swarm the Quidditch pitch,
attack Hogsmeade at Christmas, and the twist is that Ashdown is a werewolf.
Fetch his Moonbane Draught, then run from him across the grounds under the
full moon. The finale is at **the Grey Horn**, a stone circle in the Forbidden
Forest: waves of Dementors, a Dementor lord, then Malachar, who escapes at half
health. Ashdown teaches you Glacius before he leaves. Side quests: Oren's star
charts, treats for the Hippogriff and moonpetals for Isolde.

## Year 4 — The Ember Cup

Kofi's escaped pixies and the Hollow Mark in the sky make for a busy train
ride. Hogwarts hosts the **Ember Cup**: the Ember Goblet names champions from
Durmvald (Anneliese Roth), Beaumanoir (Thibault Laurent) and Hogwarts (Aurelia
Hartwell), and then, impossibly, you as a fourth. Learn Confringo from
Professor Calloway, a retired Auror, Descendo from Thornwick, Diffindo from
Isolde and Aguamenti from Bram.

- **First Task:** subdue a Ridgeback dragon at the pitch. Its attacks are a
  sweeping fire breath, a tail whip, a stomp and fireballs. In the second
  phase it flies and strafes the arena with fire until Descendo drags it down,
  and in the third it is enraged. Ice and water hurt it most. Then grab the
  golden egg.
- **Spiders' Hollow:** cut through acromantula webs in the Forbidden Forest
  and fight their matriarch, Old Mokkra.
- **Yule Ball:** pick a partner from your friends and open the ball in a
  rhythm minigame (arrows, D-pad or on-screen pads). Afterwards you overhear
  that Grimshaw entered your name and serves the Hollow King.
- **Second Task:** swim the bed of the Black Lake with Gillyweed to free your
  partner from the merfolk.
- **Third Task:** find the Cup at the centre of a hedge maze full of spiders.
- **The graveyard:** the Cup is a portkey. Malachar raises the Hollow King.
  Fight the Hollowed and Malachar, then run from the Hollow King, carrying
  Aurelia to the portkey.

Side quests: Tamsin's Confringo challenge, Mei's camera, the Durmvald lantern,
Kofi's Dungbomb and a rematch duel with Cassius.

## Year 5 — The Inquisitor

The Ministry denies the Hollow King's return and appoints Prudence Grimshaw,
now cleared of every charge, as High Inquisitor. Her Defence lessons ban
wands, so you train in secret in the **Room of Requirement**: a door appears
on the Charms Corridor's west wall, and from Year 5 on the room stays open for
practice. You learn Bombarda there, Silencio from Thornwick, Obscuro from Mei
and Incarcerous from Rowan Ashdown.

Along the way you feed the Thestrals, found the **Wand Circle**, and fight off
Grimshaw's Inquisitorial Squad when it storms the Christmas party. Grimshaw
ousts the Headmistress. You sit your O.W.L.s (Potions and Charms) until a
false vision lures you to the Ministry.

- **Boss: the High Inquisitor.** Grimshaw fights in the forest clearing. In her
  second phase, Educational Decree totems shield her until you blast them
  apart. In her third, she summons Dementors.
- **The Department of Arcana.** Fly there on Thestrals. Light sconces to stop
  the spinning Hall of Doors, and dispel the seal on the true door. In the
  Hall of Prophecies, take the orb and survive an ambush among the shelves.
- **Boss: Vesper Mordaunt.** Duel her in the Veil Chamber. She fights in three
  phases: duelling volleys, then phantom copies of herself, then lances,
  beams and eruptions. After that the Hollow King and the Headmistress duel,
  and the Minister sees him with his own eyes.

Side quests: break Grimshaw's wards, recover Kofi's niffler stashes, open the
chest the Room hid for Bram, and hear Cassius's doubts.

## Year 6 — Poisoned Waters

Cassius is pacing the train with a task he cannot refuse. Professor Pell
returns to teach Potions and lends you a battered textbook. Its margins,
signed "the Lamplighter", teach you Levicorpus. In the **Mirrorbasin** the
Headmistress shows you the young Varric Mordaunt and the secret of his
survival: seven **vessels**, each holding a piece of his soul. You learn
Ventus by spinning Brannoc's windmills and Reducto after a cursed opal
necklace hurts Tamsin in Hogsmeade.

- **Poisoned Mead** (the mid-year twist): at Pell's Christmas party, Oren
  drinks mead that was meant for the Headmistress. Solve the **poison
  puzzle**: six relabelled phials and a riddle of clues, with two guesses
  before things go badly.
- **Pell's Memory:** find the right way to persuade him, and he gives up the
  memory that matters.
- **Cassius cornered:** duel him in the Room of Requirement and learn why he
  is doing this.
- **Boss: the Sea Cave.** The Headmistress opens a blood-sealed door, and you
  cross a black lake to an island basin. She drinks the poison while Inferi
  rise from the water in waves, then the **Drowned Host** emerges. It slams
  the ground and calls up more of the drowned. Fire drives them all back.
- **Boss: the Tower.** The Hollowed come through Cassius's cabinet. Cassius
  refuses to kill the Headmistress. You defend her tower against the Hollowed
  and Malachar, and the locket turns out to be a fake left by "M.V.", who is
  Cassius's lost uncle.

Side quests: Isolde's bricked-up storerooms, Bram's runaway seed pods and
Pell's Lantern Club brewing contest.

## Year 7 — The Last Stand

The Hollow King has seized the Ministry, and Hollowed searchers stop the
train. The Headmistress's cursed hand gives her until summer, so you hunt the
remaining **vessels**. You learn Oppugno, then take fangs from the Wyrm's
bones in the Undercroft.

- **The locket:** Cassius's uncle hid it in the family crypt. Its guardians
  are Inferi, and it fights back with phantoms of your friends.
- **The cup:** it lies in a vault beneath the Veil, guarded by a Dementor lord.
- **The twist:** the last vessel is Malachar himself.
- **The circlet:** it is in the Room of Hidden Things, surrounded by cursed
  fire.
- **Rallying the castle:** gather your friends, and Cassius chooses his side.
- **The Battle of Hogwarts** is a six-wave defence of the courtyard against
  the Hollowed, acromantulas, Dementors, a war troll, marching Inferi and
  Vesper Mordaunt. Then Malachar comes, and he finally falls for good.
- **The final duel:** face the Hollow King, mortal at last, in the Great Hall.
  Phase I is a duel. In Phase II he is shielded while his Hollowed stand. In
  Phase III he fights with beams, meteor rains and volleys of dark lances.
- **Ever After:** your three closest friends (and Cassius, if redeemed) each
  get their own ending scene, followed by the last House Cup.

Side quests: barricades for Calloway, healing supplies for Isolde, Kofi's
hidden fireworks, and one last duel with Rowan Ashdown.

## Castle wings and classes (optional)

New doors on the Grand Staircase lead to the **Library** (ground floor), the
**Astronomy Tower** (first landing) and the **Divination Room** (second
landing). **Greenhouse Three** stands on the grounds west of the castle road.
All of them are on the fast-travel map.

- **Herbology** with Professor Bramblewood: repot Mandrakes while they're
  calm, and hold your earmuffs (block) when one screams.
- **Astronomy** with Professor Starling: steer the telescope's cross-hair and
  chart three constellations against the clock.
- **Transfiguration** with Professor Marlowe, in the Library: repeat
  ever-longer wand patterns and turn a mouse into, eventually, a dragon.
- **Divination** with Madam Vey, from third year: match omens in the crystal
  mist, then hear your fortune.
- **The Restricted Section** sits behind a locked gate at the back of the
  Library (Alohomora), with a forbidden book chained up high (Accio).
- **The Owlery**, across the bridge from the Astronomy Tower, lets you send a
  letter to a friend once a day for a little friendship.

Every class can be repeated for house points and experience, and works with
keyboard, mouse, touch and controller.

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
| Map & fast travel | N | Pause menu → Map |
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

Play with friends online: see [Online co-op](#online-co-op).

## Online co-op

Play the story with friends on other devices (up to three friends in one world).

- **Host:** while playing, open the pause menu and choose **Host this world
  online**. (**Settings → Online** has the same switch.) Choose **Stop hosting**
  to close the world. Quitting to the title closes it too.
- **Join:** on the title screen, **Join Online World** appears while a friend
  is hosting. If you have a save, you join as the student from your most
  recent save slot, with your level, talents and spell loadouts. If not, you
  make a student and pick a house first. Your own save is never changed by a
  visit, so experience earned in a friend's world isn't kept.
- **Roles:** the host is the main character and leads the story. Guests are
  the supporting cast. They see the host's quest ("Help Rowan: …"), get the
  spells the host has learned, and can fight beside them in every story
  battle. The school year is the host's (School Years is host-only).
  Professors and Pip offer guests the practice version of their
  activity (wand drawing, potions, the duelling tournament, Quidditch, the
  Hippogriff, the frog chase).
- **Shared world:** you can wander between rooms separately or stay together.
  In the same room you see each other move, cast, block with Protego, light
  Lumos, ride brooms and the Hippogriff, and you read the host's
  conversations as subtitles. Enemies chase whoever is closer. House points,
  Chocolate Frog cards and beans belong to the host's world. Whatever a guest
  earns (kills, combos, minigames, collectibles) goes to the guest's house.
- **Pause menu:** online, menus don't stop the world, because your friends
  are still playing in it. Your student just stands still and enemies leave
  you alone. Guests also get **Go to <host>** (jump to wherever the host is)
  and **Leave <host>'s world**.
- **Connection trouble:** a dropped connection reconnects by itself while
  everyone keeps playing. If the host's connection drops, guests wait for
  them to come back. If the host closes the world, guests return to the
  title screen with a message.

### How it works

Online play uses the same **mini-rooms** relay as Brick Kart
(`https://mini-rooms.hoai2k.workers.dev`, from the
[`mini`](https://github.com/hoai2k/mini) repository; `?rooms=<url>` overrides
it, and pages on localhost use `http://localhost:8787`). `js/vendor/mini-rooms.js`
is a verbatim copy of its browser client. None of the online code loads
until the title screen checks for open worlds or someone hosts.

- **Presence** (each player, 10 times a second with company, once a second
  alone): name, house and look, zone, position and rotation (of the
  Hippogriff while riding it), animation, Protego / Lumos / alive flags,
  health and one-shot animations (cast, hit, cheer…). Other screens draw it
  with **snapshot interpolation** on a per-sender clock estimate, between
  0.11 and 0.45 s behind (it follows how irregular that sender's updates
  are), with a short dead reckoning when updates are late.
- **The host owns the world.** The host's presence also carries the world
  state (story stage, flags, house points, collectibles, spells, time of
  day) and the enemies in the host's room. Guests show those enemies as
  **puppets**.
- **Hits are decided by the player who owns the target.** A guest's spell
  that hits a puppet is sent to the host, who applies it, combos included.
  Enemy spells are re-created on each screen and only hurt that screen's
  student. Enemy melee and area attacks (troll slams, Malachar's eruptions
  and beam, Dementor drain) are checked on the host against a stand-in for
  each guest and sent to that guest, whose own screen applies them, so dodge
  rolls and Protego still work. Telegraphs and troll shockwaves are shown
  on every screen.
- **Events** (casts, enemy spells, telegraphs, hits, points, collectibles,
  subtitles…) are batched into at most 20 relay messages a second. All
  incoming data is validated: types, ranges, finite numbers and known ids.
  Names and text are escaped before they reach the page, and anything
  malformed is ignored. Errors in online code are caught and logged, and
  never stop the game loop.
- **Budget:** the relay's free plan allows 100,000 requests a day, and each
  message sent counts 1/20 of a request. A playing pair sends about 4,000
  requests an hour, so the allowance covers roughly a day of two-player
  play. The title screen checks for open worlds every 5 s (every 20 s after
  three minutes, never while the tab is hidden).

For debugging, `G.net` is the live session (`G.net.stats` counts the
events sent and received by kind).

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
- `js/online/`: online co-op, loaded only when used. `session.js` is the
  relay connection, lobby, reconnects and clock estimate. `coop.js` is
  presence, world state, events and the host / join / leave flows.
  `remote.js` draws friends' students, the host-side stand-ins for guests
  and the guests' enemy puppets.
- `js/vendor/mini-rooms.js`: the mini-rooms relay client (verbatim copy)

## Credits

A fan-made game. Not affiliated with or endorsed by J.K. Rowling, Warner
Bros. or Wizarding World.

- three.js (MIT licence).
- Fonts: Cinzel, Cinzel Decorative and EB Garamond (SIL Open Font
  Licence), served by Google Fonts.
- No third-party models, textures or audio files are used.
