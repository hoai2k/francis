# Cursed Dungeons

A 3D action dungeon crawler in the style of Minecraft Dungeons 1 & 2, with a
Jujutsu Kaisen theme. You play blocky sorcerers with cursed techniques and
Domain Expansions, fight graded curses and Special Grade bosses, collect
loot, and play with up to 4 people on one screen, or up to 8 online (several
screens, each with its own local players).

It runs in the browser with Three.js (r186) loaded from a CDN and has no
build step. The **WebGPU** renderer is used where available, with an
automatic **WebGL2** fallback.

Play: <https://hoai2k.github.io/francis/cursed-dungeons/>

## How to play

1. On the title screen, choose **Play**. Your **cursed technique is rolled
   at random**. Extra players join by pressing **A** or **Start** on a
   controller, and each of them rolls a technique too.
2. A new save opens with a **cutscene**: a night at Sugisawa Third High,
   a cursed finger, your technique awakening, and Gojo arriving to recruit
   you. Hold Esc / A / a finger on the screen to skip any cutscene.
3. **The open world.** You start at **Jujutsu High**, the hilltop campus
   in the middle of a mountain valley, with the town of **Takao-machi**
   at the foot of its long stairs. Talk to people (E / A / tap):
   - **Ijichi** (briefing pavilion): the **mission map**, the story's arcs
     and chapters (track one, or let Ijichi drive you to it).
   - **Megumi** (vending machines): the shop.
   - **Your locker** (dormitory): inventory and enchanting.
   - **Principal Yaga** (shrine): the technique tree.
   - **Gojo**, **Nitta**, **Panda**, **Maki** and **Inumaki** chat, give
     tips and brief story chapters. There's a cat to pet.
   - The **talisman post** on the training ground summons training waves.
   - People with a gold **!** over their heads have a **side quest**; a
     blue **?** means a quest wants you to talk to them.
   - The **tracker** (a gold arrow, beam and footprints) always leads to
     the tracked quest, along the roads over the borders when it is
     somewhere else.
   The world is **one continuous map**: follow any road out of the valley
   and just keep walking — the next region is already there ahead of you,
   with no gate and no loading screen (you could walk from Shibuya to the
   Tokyo colony and on to Shinjuku). Or touch a blue **Window station**
   (窓) to fast travel to any station you have found. **Tab / View** opens the **World Map**,
   **J / hold View** the **Quest Log**.
4. Story chapters are **main quests**, and they play out **in the open
   world**: talk to the chapter's briefer in the right region, then walk
   into the district the tracker points at (the chapter's card floats
   over it). A **curtain** (帳, a black barrier dome) pours down over the
   real streets, woods or station around you, and it is night inside.
   Complete the objective on the spot — exorcise the curses that swarm
   the landmarks, free the people caged near them, or seal the cursed
   objects at their altars (each one wakes a pack of curses) — and the
   Special Grade rises at the district's arena. Beat it for its chest,
   the chapter's rewards and a results panel; then the curtain cracks and
   lifts. Nobody crosses the curtain while it is down (the borders and
   Window stations are shut); dying puts you back at its edge with the mission
   kept, and **Pause → Abandon mission** lifts it (walk back in to retry).
   Cleared chapters can be replayed at a higher threat (quest log, the
   World Map's 📖 Chapters, Ijichi's mission map), and each leaves a
   **Cursed Lair** at its spot: the chapter's old generated dungeon,
   optional, for loot.
5. The game **saves automatically** (every 15 seconds, on every purchase,
   level-up and chest, and when you leave the page). **Pause → 💾 Save
   Game** saves right away. **Save Code** (pause menu or title screen)
   gives you a code that backs up your progress or moves it to another
   device. Progress is saved in `localStorage`: coins, level, rerolls, your rolled
   technique, enchantment and technique points, inventory, loadouts,
   technique-tree ranks and finished missions.

### The open world

Nine regions, each a big streamed voxel map, joined seamlessly into one
world (a stylised 3×3 map of Japan) — walk over any border on its road and
you are in the next region, no fade, no loading:

| | West | Centre | East |
| --- | --- | --- | --- |
| North | Okinawa Coast | **Cursed Forest** | Sendai Colony |
| Middle | Kyoto | **Jujutsu High** | Shinjuku |
| South | Sakurajima Colony | Shibuya | Tokyo Colony No. 1 |

- **Jujutsu High**: the campus on its hill, cedar mountains, Takao-machi
  (houses, a shrine, the square, the station, townsfolk), the old school
  wing, a mountain shrine, Takao Pass and the Cedar Lookout ruins.
- **Cursed Forest**: dense woods, a river under Yasohachi Bridge,
  Shiraito Falls, ruined shrines, a stone circle, cursed pools, the Nest
  (a cave lair) and Kitsune Camp. Curses roam everywhere but the camp.
- **Tokyo Colony No. 1** (Culling Game, violet dusk): a ruined Tokyo
  street grid with wrecks and rubble; Kogane Square (Yuji and Megumi, the
  Rule Board), Hakari's fight club warehouse (bet fights in the ring),
  Kashimo's lightning scar (live strikes), Angel's Chapel (Hana Kurusu
  under Jacob's Ladder), the District Court ruins (Higuruma) and Star
  Heights, the danchi Reggie Star's gang holds.
- **Sendai Colony** (Culling Game, overcast): the four-way stalemate. The
  Hirose River, Aoba Castle's ramparts and Date Masamune's statue (Yuta's
  camp), Osaki Hachimangu, Sendai Station, Uro Takako's plaza where the
  sky folds, Kurourushi's nest in a gutted department store (swarm event),
  Ishigori's blast craters and Dhruv's glowing shikigami trails.
- **Sakurajima Colony** (Culling Game, red sky, falling ash): a volcanic
  island in the sea; Minamidake's lava crater (lava bombs near the cone),
  three lava rivers, black-rock slopes, the north ferry pier, the 1914
  lava causeway, an ash-buried harbour village, the Zen'in Hei camp, the
  Arimura observatory (Maki and Noritoshi Kamo) and Furusato Onsen, whose
  hot springs heal you.
- **Shibuya** (31 October, night, under the curtain): the Scramble
  Crossing (all four corners walk at once when the signals change),
  Hachiko Square with the statue and the green Aogaeru car, Shibuya
  Station (an enterable concourse) under Scramble Square, the JR viaduct,
  the Fukutoshin Line entrance, Shibuya 109 at the fork, Center Gai's
  lantern-hung pedestrian street, Dogenzaka up the hill, Mark City,
  Miyashita Park, Route 246 under the Shuto expressway, and south of 246
  the blocks Sukuna's shrine levelled. A black curtain covers the station
  district: Halloween crowds are trapped inside, huddling and pounding on
  the curtain wall. The arc's six chapter curtains are here.
- **Shinjuku** (day/night cycle): West Shinjuku's skyscrapers and the
  Tokyo Metropolitan Government twin towers over Citizens' Plaza,
  Shinjuku Station, Omoide Yokocho's lantern alley, the Eishu Detention
  Centre, Kabukicho (the Ichibangai gate, host clubs, neon and the
  Godzilla head on the Toho building), Shinjuku-sanchome's department
  stores and the gardens of Shinjuku Gyoen. South of Koshu-kaido, behind
  a Window checkpoint, the district where Gojo and Sukuna fought is gone:
  a Hollow Purple crater, sliced tower stumps and long scorched cuts.
  The intact city is full of people; the ruins are full of curses.
- **Kyoto** (autumn, golden hour, maple leaves on the wind): Kyoto Jujutsu
  High's walled temple campus (Principal Gakuganji, Todo, Mai, Miwa,
  Mechamaru, Noritoshi Kamo and Momo to talk to), Gion's machiya and
  lantern-hung Hanamikoji with a tea house and maiko, Kyoto Station, the
  Yasaka five-storey pagoda, Sannenzaka up to Kiyomizu-dera and its stage
  on a lattice of pillars over the ravine, Fushimi Inari's fox guardians
  and the torii tunnel up Mt Inari, the Togetsukyo bridge and the
  Arashiyama bamboo grove, the Goodwill Event forest (the "Curse Hunt"
  curtain) and the Rashomon ruins. Side quests: 5 (Miwa's lost charms,
  a rescue at the Inari summit, Mechamaru's pagoda patrol, a lair under
  the Kiyomizu stage, and Nue, the Night Chimera, as the mini-boss).
- **Okinawa Coast** (Hidden Inventory, midday sun): Emerald Beach with
  parasols, a beach house, a pier over the coral lagoon and young Gojo,
  Geto and Riko on holiday; Kaigan Town's red-roofed houses with shisa,
  the market street and the old banyan; the Churaumi Aquarium's whale
  shark tank; the limestone cliffs with Cape Hedo and the Sea Cave; the
  Yanbaru jungle and the Nakijin Gusuku ruins; Cape Manzamo's Elephant
  Trunk rock and the Gama Cave; the sugar-cane fields and Route 58 to
  Naha Airport. Side quests: 6 (escort the Star Plasma Vessel, Gojo's
  beach day, the aquarium, Route 58, the Sea Cave lair, and Habu-no-Nushi,
  the Cane Serpent, as the mini-boss). Loot chests hide in both regions.
- **Window stations** (the sorcerers' support network) are found by
  walking up to them; then touch any station or use the World Map to fast
  travel.
- **Borders**: the roads run straight on over every border, marked by a
  signpost ("→ Shibuya" / "Entering Jujutsu High"). Either side of the road
  the two regions share a strip of countryside rising into a ridge; city
  to city the streets just carry on; Sakurajima is reached over causeways
  across the strait.
- Towns, camps and the school are behind barriers: roaming curses burn
  away at the line.
- **Curses in the wild**: packs of curses roam every region outside the
  safe zones — patrolling between points, lurking in alleys and woods,
  gathering at landmarks — themed by region, and there are more of them,
  in bigger packs and of higher grades, at night. They rise out of the
  ground out of sight and fade away once you are far off.
- **Curse nests** (☠ on the map): a pack guarding a cursed object. Defeat
  the guardians (the object is shielded while they live), break the object
  for loot; the nest festers again after a while.
- **World events**, announced with a toast, a red beam and a ping:
  *A curse is attacking civilians!* (Shibuya, Shinjuku), *A curtain has
  descended* (step inside and survive three waves), *Special Grade
  sighting* (a named elite roams the region), *A cursed womb is hatching*
  (break it before it hatches) and, in the colonies, *rival players raid*.

### The cities

- **Crowds**: Shibuya and Shinjuku are full of people (salarymen, office
  workers, students, shoppers, tourists, the elderly, hosts in Kabukicho
  and Halloween costumes in Shibuya). They walk the sidewalks, wait at the
  pedestrian signals and cross when they turn green, and stand about in
  groups. When a curse or a Domain comes near they scream and flee.
  Civilians trapped at the Shibuya curtain run to safety when you reach
  them with no curse nearby.
- **Buildings you can enter**: shops, konbini, offices, cafés, karaoke
  boxes, hotels, the station concourses. Stairs in the back corner lead
  to every floor and out onto the roof; the floors above you cut away.
- **Curse-infested buildings** have a purple aura and talisman seals on
  the door (☠ on the map). A pack of curses appears on each floor as you
  reach it; clear them all and a cache appears on the top floor (coins,
  XP, gear). Cleared buildings stay cleared.
- **Side quests**: Shibuya has 5 (evacuate the crossing, clear Dogenzaka
  Tower floor by floor, a lost child at Hachiko, cursed jack-o'-lanterns,
  and the Shibuya Grasshopper Curse as the mini-boss); Shinjuku has 5
  (help Ijichi raise a curtain over the ruins, clear an office tower,
  a greenhouse rescue in Gyoen, residue from the shrine's cuts, and the
  Kuchisake of Kabukicho as the mini-boss). Loot chests hide on rooftops,
  in alleys and in the craters.

### The Culling Game

The three colonies sit under barriers: a shimmering curtain on every
edge and a lattice dome overhead. The curtain stands on the border: you
walk through it where a road crosses it (the barrier gate, between two
glowing pillars) and nowhere else.
Entering one registers you as a player: Kogane, a golden shikigami,
reads out the rules, then floats beside you and announces every score.

- **Points**: another player is worth 5, a curse 1, named players and
  colony champions more, and colony quests pay points too. The points
  panel at the top of the screen shows your total while you are inside.
- **Players**: hostile sorcerers (name plate and point value over their
  heads) roam the colonies alongside the curses; the Zen'in Hei guard
  their camp on Sakurajima and Reggie's gang holds Star Heights.
- **Rules**: at 100 points, add a rule at any Rule Board (or as the
  reward of Yuji's *Point Transfer* quest): point transfer (trade points
  for coins), merciful scoring (scores heal), a raised bounty (players
  worth 10), Kogane's radar (where the nearest player is) or a curse
  bounty.
- **Colony events**: Kashimo's lightning, Kurourushi's swarm, Uro's
  folded sky, Dhruv's trails (they burn; their shikigami bite), lava
  bombs and lava on Sakurajima, and healing hot springs.
- **Side quests**: 7 in Tokyo No. 1 (two bet fights, Kashimo, Angel,
  a rescue, Point Transfer, and Reggie Star as the colony mini-boss),
  6 in Sendai (the stalemate, Ishigori, the trails, Uro Takako, a subway
  lair, and Kurourushi as the mini-boss), 5 on Sakurajima (a rescue, the
  Hei and their captain, obsidian, the pier, and Naoya's cursed spirit
  as the mini-boss). Loot chests are hidden in every colony.

### Quests

- **Main quests** are the story chapters below. Each is briefed by
  someone in the right region (Gojo at Jujutsu High, Nitta in Shibuya,
  Nanami in Shinjuku…) and entered through a curtain there.
- **Side quests** come from people with a gold **!**: exorcise curses
  somewhere, defeat a named curse, collect lost things, rescue someone
  and escort them home, or clear a lair (a short dungeon). Rewards: coins,
  XP, rerolls and gear.
- The **Quest Log** (J, hold View, or Pause → Quest Log) lists active,
  available and completed quests; **Track** one and the tracker follows it.

### Story

Three arcs, twelve chapters, played in order: **Cursed Womb** (The Finger,
Fearsome Womb, Transfigured), **Kyoto Goodwill Event** (Curse Hunt, Black
Flash, Stolen Fingers) and **Shibuya Incident** (The Curtain Falls,
Fukutoshin Line, Disaster Flames, Eight-Handled Sword, Idle
Transfiguration, King of Curses). Each chapter has a
briefing cutscene the first time, a chapter card, a boss reveal cutscene
and an "EXORCISED" cutscene when the Special Grade falls. Threat:
Standard, Hard or Nightmare. **How to Play** (title and pause menu) explains
everything.

### Bosses

Every chapter ends with a canon boss. Each one has its own model, canon
moves (the move name flashes on screen as it starts) and three phases, and
every big hit is telegraphed on the ground first.

| Chapter | Boss | Moves |
| --- | --- | --- |
| The Finger | The Sugisawa Curse (Grade 1) | Crushing Slam, Double Slam, Devour, Bile Spit, Drawn by the Finger, Frenzy |
| Fearsome Womb | The Finger Bearer (Special Grade cursed womb) | Rend, Limb Tear, Womb Blast, Innate Domain: Twisted Corridors, Womb Spawn, Sukuna's finger pulses |
| Transfigured, Idle Transfiguration | Mahito | Idle Transfiguration (warps your body), Blade Arms, Body Repel, Transfigured Humans, Polymorphic Soul Isomer, Instant Spirit Body of Distorted Killing |
| Curse Hunt, Black Flash | Hanami | Root Spikes, Wooden Balls, Cursed Buds (drain Cursed Energy; dodge-roll to tear them off), Flower Field, Wood Ram, Left Arm Unveiled beam, Domain: Ceremonial Sea of Light |
| Stolen Fingers | Eso & Kechizu (two bodies) | Wing King, Rot Spray, Rot Claw, Decay Rain; Kechizu's Blood Spit, Belly Flop, Vomit Stream. Both brothers' blood on you triggers Rot Technique: Decay |
| The Curtain Falls | Dagon | Death Swarm (fish shikigami), Tidal Wave (find the gap), Water Spout, Tentacle Lash, Domain: Horizon of the Captivating Skandha |
| Fukutoshin Line | Choso | Piercing Blood (the line tracks you, then locks), Convergence, Supernova, Slicing Exorcism, Blood Edge, Flowing Red Scale |
| Disaster Flames | Jogo | Ember Insects, Volcano, Disaster Flames, Flame Burst, Maximum: Meteor, Domain: Coffin of the Iron Mountain (then he burns out: hit him hard) |
| Eight-Handled Sword | Mahoraga | The wheel adapts: a source of damage that keeps hitting it turns the wheel and is resisted (see the boss bar), and an adaptation loosens after a while. Sword of Extermination, Extermination Cleave, Divine Leap, Rush, Adaptive Guard (don't hit it while the wheel spins) |
| King of Curses | Ryomen Sukuna | Dismantle, Cleave (scales with your max HP), Black Flash, Fuga "Open", Domain: Malevolent Shrine (no barrier; keep moving) |

### Curses

Every biome has its own mix of curses, and the waves in a level are built
from themed groups (a Fly Head swarm, a corpse doll guarding spitters, a pack
of grasshoppers...), so no two rooms play the same. Every attack is marked
on the ground before it lands. Kill the priority targets first:

| Curse | Grade | What it does |
| --- | --- | --- |
| Swarmer, Summoned Imp | 4 | Rush in and bite |
| Fly Head | 4 | Tiny flying swarm; hovers round you, then dives onto a marked circle |
| Transfigured Human | 4 | Mahito's victims: lurch forward in surges; half of them split into two crawling remnants |
| Spitter | 3 | Lobs acid that leaves a puddle |
| Bloater | 3 | Swells up and explodes |
| Cursed Womb | 3 | Crawls up and bursts into three imps, unless you kill it first |
| Grasshopper Curse | 3 | Keeps its distance, then pounces on a marked circle |
| Crawling Hand | 3 | Burrows (can't be hit), tunnels under you and bursts up through a marked circle |
| Maw Pillar | 3 | Rooted turret: spits volleys of acid, bites anyone who gets close |
| Disaster Ash | 3 | Leaves patches of burning ground; flares up when close |
| Bulwark | 2 | Shield in front, heavy slam |
| Phantom | 2 | Teleports next to you and slashes |
| Grave Deity | 2 | Stand in its purple circle and you're sealed in a coffin for a second |
| Lantern Eye | 2 | Sniper beam: the line tracks you, then locks; step off it |
| Slit-Mouth | 2 | Her neck shoots her head down a marked line |
| Cursed Corpse | 2 | Shield-bearer; curses near it take half damage (a cyan thread links them) |
| Shadow Stalker | 2 | Nearly invisible until it strikes from close; hitting it reveals it |
| Brood Mother | 1 | Summons imps |
| Rainbow Serpent | 1 | Charges down a marked line |
| Fester Bodhisattva | 1 | Heals and empowers the curses around it (they glow red); hides behind them |

### Technique rolls

- Each technique has a rarity. The popular ones are the rarest:
  **Common**, **Uncommon**, **Rare**, **Epic**, **Legendary** and
  **Special Grade**. The select screen shows the odds.
- A **reroll** costs one spin (🎲). You start with 10 and get +1 per level
  and +2 per finished mission. You can also buy one for ◆40.
- **Code:** enter `frannguy` in the code box on the select screen. You can
  then choose any technique with ◀ ▶ (on a gamepad, use the stick or
  D-pad).

### Technique tree

You start with melee and your **first technique** (RMB) only. Everything
else is unlocked with technique points on a branching **technique tree**
(Yaga's shrine, the pause menu, or the Loadout screen). You get 2 points
per level. Select a node, then select it again (or press Unlock) to buy it.

- **Abilities**: Limitless, Shrine, Ten Shadows, Divergent Fist and Straw
  Doll each have 20+ canon abilities in branches (e.g. Gojo: Red, Blue,
  Infinity, Purple, Six Eyes; Megumi: all ten shikigami up to the
  Mahoraga summoning gamble). The other techniques keep their four
  abilities for now.
- **Talismans** (passive nodes): technique passives (Six Eyes, Malevolence,
  Bonded Beasts…) and shared ones (Reinforced Body, Keen Eye, Focused Mind…).
- **Reverse Cursed Technique** (Q) and **RCT Mastery**.
- **Domain Expansion or ultimate attack** (F): the tree's capstone.
- **Cursed Energy Flow** and **Vast Reserves**, plus each technique's
  upgrade nodes.

### Loadout

Only some abilities are equipped at a time: **4 active slots** (RMB, 1, 2,
3; RMB takes a *basic* ability) and **3 talisman slots**, while F stays the
Domain / Ultimate. Open **Loadout** from the pause menu, the technique tree
or Yaga's shrine, pick a slot, then pick an ability. Loadouts are saved per
technique; old saves keep their unlocked techniques equipped as before. The
HUD and touch buttons show what is equipped; locked slots show a 🔒.

### Sorcerers

Only characters with a canon Domain Expansion have one. Everyone else
casts a canon **ultimate attack** with **F** when their Cursed Energy bar
is full.

| Technique | Sorcerer | Rarity | F |
| --- | --- | --- | --- |
| Shrine | Sukuna | Special Grade | Domain: Malevolent Shrine (open, no barrier; Cleave and Dismantle hit everything) |
| Limitless | Gojo | Special Grade | Domain: Unlimited Void (infinite information paralyses everything) |
| Copy / Rika | Yuta | Special Grade | Domain: Authentic Mutual Love (katana field, copied techniques as sure hits) |
| Ten Shadows | Megumi | Legendary | Domain: Chimera Shadow Garden (incomplete; shikigami rise from shadows) |
| Idle Death Gamble | Hakari | Legendary | Domain: Idle Death Gamble (pachinko reels, 1/239 jackpot, riichi events; jackpot = infinite CE + automatic RCT) |
| Judgeman | Higuruma | Legendary | Domain: Deadly Sentencing (violence forbidden; evidence, plea, verdict: Confiscation or the Executioner's Sword) |
| Mythical Beast Amber | Kashimo | Legendary | Ultimate: Mythical Beast Amber (his body breaks down afterwards) |
| Heavenly Restriction | Toji | Legendary | Ultimate: Sorcerer Killer (no Cursed Energy; the bar fills from hits) |
| Cursed Spirit Manipulation | Geto | Legendary | Ultimate: Maximum: Uzumaki |
| Star Rage | Yuki | Legendary | Ultimate: Star Rage: Black Hole |
| Divergent Fist | Yuji | Epic | Ultimate: Consecutive Black Flash |
| Cursed Speech | Inumaki | Epic | Ultimate: "Die" (tears his throat) |
| Blood Manipulation | Choso | Epic | Ultimate: Supernova |
| Idle Transfiguration | Mahito | Epic | Domain: Self-Embodiment of Perfection (sure-hit transfiguration) |
| Disaster Flames | Jogo | Epic | Domain: Coffin of the Iron Mountain (volcano interior, sure-hit heat) |
| Straw Doll | Nobara | Rare | Ultimate: Resonance: Blood Doll |
| Ratio Technique | Nanami | Rare | Ultimate: Collapse |
| Boogie Woogie | Todo | Rare | Ultimate: Boogie Woogie × Black Flash |
| Disaster Plants | Hanami | Rare | Domain: Ceremonial Sea of Light |
| Projection Sorcery | Naoya | Rare | Domain: Time Cell Moon Palace (moving inside breaks your body) |
| Ice Formation | Uraume | Rare | Ultimate: Frost Calm: Full Output |
| Gorilla Core | Panda | Uncommon | Ultimate: Gorilla Core: Drumming Beat |
| Puppet Manipulation | Mechamaru | Uncommon | Ultimate: Ultra Cannon: Maximum Output |
| Construction | Mai | Common | Ultimate: Construction: Special Bullet |
| Simple Domain | Miwa | Common | Ultimate: Batto Sword Drawing: Simple Domain |

Each kit has its own melee combo, a starting technique on RMB, three more
techniques on 1 / 2 / 3 and its own upgrade nodes on the technique tree.
The select screen and the technique tree show each ability's name.

Notes on the kits:

- **Yuji's Black Flash**: press attack again right as a hit lands. The
  next blow does 2.5× damage with a black-and-red flash, black lightning,
  heavy hit-stop and a distorted shockwave.
- **Domain Expansion** (and every ultimate) needs a full Cursed Energy bar. After a short hand
  sign (no camera move), a **barrier** closes around the caster and everyone
  nearby. Nobody can cross it until it falls: curses, bosses, allies and
  you stay inside, and projectiles stop at the wall. Inside, the world
  becomes the domain (floor, sky, lighting, set-pieces); from outside it is
  a black sphere. A domain lasts 10 to 20 seconds (a timer bar sits under
  its name), then the barrier cracks and shatters. Malevolent Shrine is an
  open domain: no barrier, but a huge reach. Boss domains trap you in the
  same way until they end or the boss dies. Only one domain can stand at a
  time; in a clash the more refined domain wins.
- Each sorcerer has a **skill tree**. Points come from levelling up.

### Loot

Gear comes in three kinds and three rarities (**common**, **rare**,
**unique**):

- **Weapons**, for example Playful Cloud, Split Soul Katana and
  Slaughter Demon.
- **Armour**, for example Heavenly Restriction Gear and Heian Kimono.
- **Cursed-tool artifacts** you trigger with **R / T** (gamepad
  D-pad ← / →), for example the Inverted Spear of Heaven, Chain of a
  Thousand Miles, a Prison Realm fragment and the Cursed Corpse doll.

Items carry enchantments such as Sharpness, Swirling, Committed, Leeching,
Exploding, Freezing, Protection, Cooldown and Energy Surge. You upgrade
them with enchantment points and get the points back when you salvage an
item.

## Controls

| Action | Keyboard + mouse | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | Left stick | Left virtual joystick |
| Aim | Mouse | Right stick | Auto-aim at the nearest curse |
| Melee combo | Left click | X | ⚔ |
| Jump (hold for a higher, 2-block jump) | Space | A | ⤒ |
| Jump slam | Attack in the air | X in the air | ⚔ in the air |
| Ranged / technique | Right click | RT | ✦ |
| Dodge roll (i-frames) | Shift | B | ⤳ |
| Techniques 1 / 2 / 3 | 1 / 2 / 3 | LB / RB / Y | 1 / 2 / 3 |
| Domain Expansion / ultimate | F | D-pad ↑ | 領域 |
| Reverse Cursed Technique (heal; always available, a charge comes back every 18 s) | Q | LT | ✚ |
| Artifacts | R / T | D-pad ← / → | — |
| Interact | E | A (while a prompt shows) | Tap the prompt |
| Inventory | I | D-pad ↓ | Pause menu |
| World map (fast travel) / dungeon map | Tab | View | Pause menu |
| Quest log | J | Hold View | Pause menu |
| Pause | Esc | Menu | ❚❚ |
| Fullscreen | Alt+Enter / F11 / ⛶ button | — | ⛶ button |
| Zoom | Mouse wheel | — | Pinch |
| Rotate camera 90° (turn on in settings) | Z / C | — | — |

**Local co-op:** keyboard + mouse plus up to three controllers (or four
controllers) share one camera. Press **Start** on a controller at any time
to drop in. A player who goes down can be revived by a teammate standing
next to them. If the whole party goes down, everyone respawns together at
the current board's starting point after a short delay.

**Menus in co-op:** game menus (pause, world map, quest log, settings) can be
navigated by anyone. Character menus (inventory, shop, technique tree,
loadout) belong to the player who opened them, and only that player's
controller (or the keyboard and mouse, for the keyboard player) can use them.
Picking Inventory, Technique Tree or Loadout from the pause menu opens the
menu of whoever pressed the button. **Drop out** in the pause menu (with two
or more players) takes out whoever pressed it; that controller, or the
keyboard with **Enter**, can join again later.

Press **F3** to show the corner readout (quality mode, backend, FPS and
render scale).

## Online

> `?online=0` in the address (or `ONLINE_ENABLED = false` at the top of
> `js/main.js`) switches it off: the Online items disappear and none of the
> online code (`js/online/`, `js/vendor/`) is ever loaded. Even when it's on,
> that code loads only when someone opens **Online** or hosts.

Play the open world together on different devices: **up to 8 players** in one
world, and every screen can bring its own local players (keyboard + mouse and
controllers, exactly like local co-op), so two people at one TV and one at
another computer play together naturally.

- **Host.** While playing, **Pause → 🌐 Host this world online** (or title
  screen → **Online → ＋ Host a game**, which goes through the select screen
  first). Each local player picks a name (below), then the game opens and play
  carries on: nothing stops while people join. **Pause → ⏹ Stop hosting**
  closes it (so does quitting to the title).
- **Join.** Title screen → **🌐 Online** lists the open games ("Hoai's game",
  how many screens are in it) and updates itself; if the online service can't
  be reached it says so, with **↻ Retry**. Pick a game and:
  1. **choose your character** on the usual select screen (your rolled
     technique, rerolls, the `frannguy` code, more controllers joining with
     A / Start), with the host's name, region and player count (n/8) at the
     top. A screen can only bring as many players as there are places left.
  2. **choose your name** (below), then you appear next to the host (behind a
     short loading fade while your screen builds the host's region).
  You play with your own save's progression for your technique (technique
  tree, loadout, gear and inventory). What you earn (XP and level-ups, coins,
  loot from chests) goes to your own save; the world, the story, quests and
  missions are the host's, and your save's own world position is left as it was.
- **Names.** Each local player (P1, P2…) picks the name shown over their head:
  **Default** (their sorcerer: "Gojo", or "Gojo 2" if someone in the game is
  already Gojo), one of the **names saved on this device**, or **+ New name…**
  (an on-screen keyboard you can use with a controller, or type with a real
  keyboard or the phone's keyboard; up to 16 characters, saved for next time).
  ◀ ▶ choose, A (Enter) confirms, X (Delete) forgets a saved name. The
  highlight starts on what that player slot used last time, so pressing A all
  the way through (select screen, then names) keeps it. A player who drops in
  later with a controller gets the default name.
- **Limits.** 8 players in all, across every screen. A screen that would take
  the game past 8 is turned away with a message ("Hoai's game is full (8
  players)"), and a controller pressing Start in a full game is told so. If
  two screens race for the last place, the host decides and the other one goes
  back to the title with the message.
- **Everyone alike.** Local and online players are the same in play: a card
  for everyone in the HUD (online players marked 🌐), their sorcerer model with
  a name tag and health bar over the head, a minimap arrow, their technique's
  visuals, Domain Expansions and ultimates, revives (stand next to a downed
  player, whoever's screen they are on), and curses chase and hit all of them.
  Colours are seats 1-8: the host's players first, then each screen in the
  order it joined. Each screen's camera follows its own players.
- **Nothing pauses online**, for the host or the guests: the pause menu,
  inventory, shop, technique tree, loadout, world map, quest log, settings and
  How to Play open over the running world. The player whose menu it is (for
  the pause menu and other shared menus, everyone on that screen) stands still
  and can still be attacked (the others see ⏸ by their name). Dialogue doesn't
  stop the world either: the host reads it as usual and every guest sees it as
  subtitles. **Cutscenes are skipped online** (they play the next time you play
  alone). Photo mode is not offered online. Offline, menus pause as before.
- **Only the host travels.** Fast travel, Window stations, starting a chapter
  curtain or a lair, and summoning training curses are the host's; guests come
  along by themselves (a short fade). Walking over a region border follows the
  centre of *every* player: the host's screen decides when the party has
  crossed, and each guest's screen makes the same switch in the same frame, with
  no loading. Someone left behind more than a region away is brought back next
  to the host.
- **Leaving.** Anyone can leave at any time: **Pause → Leave Hoai's game** for
  a guest (back to the title), **Drop out** for an extra local player, as
  offline. Everyone else sees a bubble and carries on; nothing stops. A dropped
  connection reconnects by itself (the same player, a few seconds later). If the
  host's connection drops, guests wait while it re-opens the game and then
  rejoin; if the host stops hosting or leaves, guests go back to the title with
  a message ("The host closed their game."). There is no host migration: the
  world lives on the host's screen.

### How it works

Online play uses **mini-rooms**, the small relay from the
[`mini`](https://github.com/hoai2k/mini) repository (`MULTIPLAYER.md` there)
on Cloudflare Workers at `https://mini-rooms.hoai2k.workers.dev` (pages on
localhost use `http://localhost:8787`, i.e. `wrangler dev`; `?rooms=<url>`
overrides it), the same relay as Brick Kart and Hogwarts Adventure. A room is
up to 8 connections (screens), each with a **presence** (its latest state) and
**topic** messages (one-off events). `js/vendor/mini-rooms.js` is a verbatim
copy of its browser client, loaded on first use.

Who owns what:

- **The host owns the world**: the region and the seamless crossings, the time
  of day, every curse, boss, nest and natural spawn (`game.spawns`), world events,
  chapter curtains and lairs, quests, the story and pickups. Guests don't run
  any of that: their spawn director, quests and quest markers are off, and
  `game.spawnEnemy` does nothing on a guest.
- **Every screen owns its own players**: movement, abilities, health and CE,
  Reverse Cursed Technique, dodge rolls, menus, downed / revive. It sends their
  state 10 times a second; the other screens draw them as **figures**
  (`js/online/remote.js`): real `Player` objects with the sorcerer's model and
  kit, played back with **snapshot interpolation** on the sender's clock
  (0.12-0.5 s behind, following how irregular that screen's updates are; the
  playback clock eases toward its estimate, so it never jumps), a little dead
  reckoning when updates are late.
- **Curses on a guest's screen are puppets**: the host sends the curses near
  any guest (up to 48) with each update: kind or boss, elite affix, position,
  facing, health, pose and flags (dying, burrowed, untargetable, shielded,
  hit-flash), Culling Game players dressed as the host sees them. A guest's hit
  on a puppet (melee, techniques, Domain sure-hits, allies) is sent to the host,
  who applies it (stuns and slows too) and drops the coins, which **every screen
  picks up for itself**; the XP of every kill goes to every screen.
- **Curse attacks on a guest**: a curse's melee and area attacks are checked on
  the host against the guest's figure and sent to the guest's screen, which
  applies them (so its i-frames, dodge rolls and technique defences decide).
  Curse **projectiles and puddles** are re-created on every screen and only hurt
  that screen's own players; **telegraphs** (the red ground markers) show on
  every screen.
- **Abilities, Domains and ultimates** are sent as events and replayed on every
  screen by the figure's kit at the figure's own playback time: the visuals,
  sounds, barriers and crowd control (an Unlimited Void freezes the host's
  curses), never the damage, which only ever comes from the caster's own screen
  (`combat.js` ignores a remote source). A boss's Domain shows for the guests too.
- **Positions are sent in the sender's frame**: the region it is in (each
  region keeps its own coordinates in the seamless world) or `M<seed>` in a
  dungeon. A receiver converts with its own tile offsets, so a crossing (the
  seamless rebase) on either side never has to be in step with the others.
- **Dungeons**: lairs are generated from a seed, so a guest builds the same
  level and the host's curses show there as puppets; freeing a captive or
  sealing an altar on a guest is done for the host's mission.
- **Chapter curtains** (world missions) are drawn on the guests' screens too,
  with the host's objective, and hold their players in like the host's.

| Presence (one per screen) | Meaning |
| --- | --- |
| `v`, `u`, `r`, `t`, `n`, `s`, `f` | protocol (1), the tab's id (kept for the tab's life: a reconnect or reload is the same player), host / guest, send time, name, `join` (choosing a character) / `play`, frame |
| `P` | its players: slot, name, sorcerer, position, facing, velocity, flags (alive / down / dead / airborne / domain / i-frames / in a menu / hurt / hidden / invulnerable), health, CE, pose |
| `tr` | loading a region (its positions are stale) |
| `H` (host) | accepted screens in join order, region, travel counter, time of day, the curtain, the objective, the dungeon (seed and layout) |
| `E` (host) | the curses near the guests |

| Event (topic `ev`, batched) | Sent by | Meaning |
| --- | --- | --- |
| `ab` | anyone | an ability (`use` / `rel`), Domain or ultimate, with position, aim and time |
| `hit`, `cc`, `obj` | guest | a hit on a puppet, a stun or slow, a dungeon objective done |
| `hu` | host | a curse hurt a guest's player |
| `kl`, `dr` | host | a kill (XP), a drop (coins, orbs) |
| `es`, `hz`, `mk` | host | a curse projectile, puddle, telegraph |
| `bd`, `say` | host | a boss's Domain, a line of dialogue |
| `no`, `bye` | host / anyone | turned away (full), leaving on purpose |

Everything received is validated (types, finite numbers, ranges, known
techniques, curses, bosses, abilities, regions); anything malformed is ignored,
names are cleaned and only ever put on the page as text. Errors in online code
are caught and logged (throttled) and never stop the game loop. With `?debug`,
`window.__net` is the live session (`__net.stats` counts events by kind).

**Budget.** The relay runs on Cloudflare's free plan: 100,000 requests a day,
where each message a screen *sends* counts 1/20 of a request (receiving is
free). A screen in a game sends 10 presence messages a second (one second
apart when it is alone) plus at most one batch of events every 0.15 s, and only
when something happened: about 11-15 messages a second in a fight, so roughly
2,500 requests an hour per screen, which is **about 40 screen-hours of play a
day** (13 hours of a three-screen game). The Online screen checks the list of
games every 4 s (every 15 s while the tab is hidden), and each check is a
whole request, so don't leave it open for hours. Running out only makes the
relay refuse connections until the next day.

**Limitations.** The world lives on the host's screen: if the host's tab is
hidden the browser stops its game, so the curses stand still for everyone
(guests keep playing and see "host away"); there is no host migration. Hits on
guests are checked against where the host last saw them (about a tenth of a
second plus the trip behind). Remote figures replay abilities without that
player's technique-tree ranks (the base look of each ability). Curse-infested
buildings and region events react to the host's own players. The lobby list
only knows each game's title and how many screens are in it (the host's
region and player count show once you pick it). No protection against cheating
(it's for friends).

**Tested** automated and headless (Chromium), against a local stand-in for
the relay with the same protocol, part of it through 60-110 ms of latency each
way with jitter: the lobby, Retry, joining through the select screen and the
name step (default kept by pressing Enter, an edited name typed on the
keyboard, the saved name next time); a host plus guests with 1, 2 and 3 local
players (7), two screens racing for the 8th place (one turned away), a full
game refusing a 2-player screen and a drop-in; figures and puppets in step and
smooth under latency; a guest killing curses (XP, coins), curses hitting a guest
(melee checked on the host, shots replayed), RCT, guest and boss Domains, all
25 techniques used by a guest and replayed on the host; menus not pausing
online (host in the inventory, guest in the pause menu, both hit) while offline
still pauses; revives both ways; leaving, rejoining, dropped connections on
either side, a closed tab, the host stopping (guests and a still-choosing
screen sent back with the message); crossing a region border together, the
host's fast travel, a dungeon (objective, boss, way out), a chapter curtain,
subtitles; a phone joining by touch; `?online=0`.
**Not tested:** the production relay and real devices over the internet (the
test environment can't reach it), real gamepads (simulated as devices).

## Graphics

At start-up the game reads WebGPU adapter info and the WebGL renderer
string, picks a quality tier, and lets you change it under
**Settings → Graphics**.

- **Ultra · Ray Traced** (WebGPU and a strong GPU):
  - Screen-space global illumination, so coloured light from cursed
    energy, lava and torches bounces onto nearby surfaces.
  - Screen-space reflections on water, wet streets and polished stone,
    with a reflection-probe fallback.
  - VSM soft shadows (penumbras widen with distance) and 48 pooled
    dynamic lights.
  - Temporal AA with sharpening, depth of field in cinematics, and
    optional motion blur.
- **High**: soft PCF shadows, GTAO, bloom, SSR on water, fake volumetric
  light shafts and 16 dynamic lights.
- **Medium**: simple shadows, bloom, fog and fewer particles.
- **Low / Mobile**: baked vertex lighting, light bloom only, lower render
  resolution and fewer enemies.

Every tier uses AgX tone mapping, a colour grade per biome, a vignette,
and FXAA or TAA.

With **dynamic resolution** on, the render scale drops to hold 60 FPS on
desktop (30 on mobile) before any effect is cut.

**Photo Mode** (pause menu or Settings → Graphics) freezes the frame and
re-renders it with a real path tracer (three-gpu-pathtracer on a WebGL2
canvas), converging to 512 samples. **Save PNG** downloads the result.

## Tech notes

- **Textures**: block textures are 32×32 HD pixel art painted procedurally
  at start-up, each with a matching normal map and per-pixel roughness. Nothing is
  downloaded except the Three.js modules and fonts.
- **Open world**: each region is a voxel map up to 352×352; only the
  chunk columns within the view radius of the players are meshed (nearest
  first, a few milliseconds per frame), far ones are dropped, and
  collision always uses the full voxel data.
- **Seamless world** (`js/world/seamless.js`): the regions are tiles of one
  map. The neighbours of the region you are in are built in the
  background, a few milliseconds per frame (region builders are
  generators that yield between steps), then prepared (decorations, sun
  shafts, minimap, walkable-ground field) the same way. Near a border the
  neighbour is drawn at its offset and its near strip meshed; collision
  queries past the edge are answered by the neighbour, so you (and curses,
  projectiles, co-op partners) cross physically. When the party is a few
  blocks over the line the neighbour becomes the current region in the
  same frame: everything that moves shifts by the tile offset, the old
  region's systems stop and the new one's start. Sky, fog, light and
  grading blend across the border. Both regions stamp a shared border
  profile into their edge band (`js/world/regions/seams.js`), so terrain,
  road and water meet exactly. Only the current region and its neighbours
  stay in memory.
- **Voxel world**: meshed in 16³ chunks with per-vertex ambient
  occlusion, baked coloured light and per-block roughness and emission.
  Destructible crates, barrels, cracked walls and pillars break into
  physics debris.
- **Visibility**: walls between the camera and any player dissolve with a
  dithered cut-away, and roofs fade out when you step inside.
- **Particles**: GPU particles integrate their motion in the vertex
  shader, so the CPU only writes a particle once, when it spawns.
  Hit-sparks, rings, slashes and damage numbers are pooled.
- **Domain Expansion**: a shader-driven radial takeover of the world's
  materials, a sky dome and an environment transition, inside a barrier
  sphere (`js/gfx/barrier.js`). From outside the shell is black; its inner
  face draws the domain's sky, so the outside world disappears. Whatever
  is between the camera and the players is cut away, so the view stays
  clear. Durations, radii and clash strength are in one table in
  `js/domain.js`. Collision stays exact because the blocks never change.
- **Characters**: Minecraft-style HD (128×128) skins painted in code, with normal and roughness maps, a
  procedural animation rig (idle breathing, run, combos, dodge roll, hit
  reactions, death) and spring physics for capes and hair.
- **Spawning**: curses, cages and altars are placed on the room's floor
  (never on roofs or wall tops). Only three melee curses attack the same
  player at once; the rest circle and wait their turn.
- **Levels**: a grid layout with a main path, side rooms and a secret
  room, stamped from hand-designed room templates per biome.
- **Bosses**: one file per boss in `js/entities/bosses/` (stats, model,
  moves); the shared runtime is `js/entities/bosses.js` and the model
  helpers are in `js/entities/boss-looks.js`. Detailed models with idle
  effects (Jogo's smoking volcano head, Mahoraga's ratcheting wheel,
  Dagon's swinging tentacles, Choso's orbiting blood). Moves are generator
  coroutines with telegraphed ground markers; boss domains use the same
  domain system as the players' (only one domain can be open at a time).
- **Cutscenes**: in-engine cinematics with letterbox bars, keyframed
  cameras, subtitles and title cards (`js/story/`).
- **Music**: two recorded tracks in `assets/music/`: `background.mp3`
  (title, Jujutsu High and missions) and `boss.mp3` (boss fights). They
  crossfade, and the background theme resumes where it left off after a
  boss. A small generative soundtrack is the fallback if a track can't
  load. Volume follows Settings → Audio → Music.
- **Sound effects**: synthesised with the Web Audio API. That covers
  impacts, charges, domains, footsteps that change with the surface and
  ambience per biome.

## Files

- `index.html`: entry point and import map
- `style.css`: UI
- `js/main.js`: boot, game states and the main loop
- `js/gfx/`: renderer and quality tiers, materials, textures, particles, effects, lights, debris
- `js/story/`: cutscene engine and cutscenes, story chapters, quest markers
- `js/world/`: Jujutsu High (`jujutsuHigh.js`), voxel world (chunk streaming), blocks, biomes, building kit, room templates, level generator, natural curse spawning (`spawnDirector.js`: packs and nests; `worldEvents.js`; `cursedObject.js`)
- `js/world/regions/`: the open-world regions: the registry (`index.js`), the region builder toolkit (`common.js`), one file per region, `all.js`
- `js/quests/`: the quest system (`index.js`), main quests from the chapters (`main.js`), side quests (`side.js`)
- `js/world/cullingGame.js`: the Culling Game (colony barriers, Kogane, points, hostile players, rules, colony events); `js/world/regionRuntime.js`: region load hooks and world loot chests; `js/quests/colonies.js`: the colonies' side quests
- `js/entities/`: characters, player, curses, bosses, allies
- `js/sorcerers/`: the technique registry (`index.js`, rarities and the unlock tree) and one file per technique; `all.js` imports them all
- `js/ui/`: menus, HUD, minimap, world map, quest log, tracker, touch controls, settings
- `js/combat.js`, `js/domain.js`, `js/mission.js`, `js/loot.js`, `js/save.js`, `js/audio.js`, `js/photo.js`
- `js/online/`: online play, loaded on first use: `session.js` (relay connection, reconnects, clocks, validation), `net.js` (the game session: presence, events, who owns what, following the host's world), `remote.js` (other screens' players as figures, the host's curses as puppets, name tags), `lobby.js` (the Online screen, joining, names and the on-screen keyboard)
- `js/vendor/mini-rooms.js`: the relay's browser client (verbatim copy)
