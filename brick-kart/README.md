# Brick Kart

A Mario Kart-style kart racer where the karts, drivers and maps are all built
from LEGO-style bricks. It runs in the browser with Three.js (r186) loaded from
a CDN and has no build step. Music and sound effects are made in code with
WebAudio.

Play: <https://hoai2k.github.io/francis/brick-kart/>

## Modes

- **Grand Prix**: pick a cup (3 maps each, 4 in the Movie Cup and JJK Run; the
  Video Game Cup has Minecraft, Pokémon and Sonic the Hedgehog). The
  focused cup shows a preview of its races in order, with a picture of each map.
  Points go 15-12-10-9-8-7-6-5-4-3-2-1, and each cup ends with an award
  ceremony.
- **Quick Race**: one race on any map, always with **12 racers** (you plus CPU racers).
- **Time Trial**: race alone with 3 Turbo Studs. Your best time on each map is
  saved in your browser.
- **Online** (in progress, enable with `?online=1`): race friends on other
  screens, up to 12 people in a race, with everyone on each screen able to join
  in (see [Online](#online) below).
- **Racer select**: player 1 is already in, using whatever controller (or
  keyboard/touch) you used in the menus; more players press A to join.
- **Options**: engine class (50/100/150/200cc), CPU difficulty, laps, **Legoized** (brick-built props, on by default; off shows the original smooth props for comparison), **Simplified mode**, auto-accelerate, music and sound
  volume, and graphics quality. The game also lowers its render resolution
  automatically if frames run slow, and raises it again when there's headroom.

### Simplified mode

**Simplified mode** (Options, off by default, remembered once you turn it on)
offers a smaller set (81 drivers, 41 karts and 25 gliders) on the select screen, as one
big grid without movie headings. CPU racers still pick from the whole roster, so you
race against characters and karts that aren't in the set too. The set lives in
`js/simplified.js` (`null` means all). Choose the set in the **workbench** at
<https://hoai2k.github.io/francis/brick-kart/workbench/> (Characters, Karts and
Gliders tabs): every character, kart and glider is a card you tap to include or leave out (it starts from the current
set), then **Export** downloads `brick-kart-simplified.json` with the chosen
ids. Each card also has a **🗑 bin** button (or press Delete on a focused card)
that marks it to be removed from the game entirely; marked cards turn red with
a REMOVE stamp, stay marked in that browser until **Reset**, and are listed in
the export under `remove` (ids and names).

## Maps (20, in 6 cups)

Tracks are wide and banked, with open grass, fences, scenery right next to
the road, and hazards to dodge. Most of them have **glider ramps**: drive onto
the blue ramp and a brick glider pops out so you can fly across a lake, a bay
or the sky.

| Cup | Map | Highlights |
| --- | --- | --- |
| Stud | Brick City Circuit | Figure-8 overpass, traffic cars and a bus, a canal jump, a fountain splitting the road, a tunnel through a skyscraper |
| Stud | Windmill Meadows | Windmills, hot-air balloons, tulip fields, sheep and cows crossing, a covered bridge, and a long **glide across the lake** |
| Stud | Pirate Cove | A galleon firing cannonballs at the beach, crabs, a sea cave, a broken-dock jump, and a **cliff glide over the bay** |
| Brick | Sweet Treat Valley | Candy roads, gumballs rolling down Cake Mountain, cupcakes and donut arches, a **glide over the chocolate lake** |
| Brick | Jungle Ruins | Boulders rolling down the temple, crushers inside it, a rope bridge, a **waterfall glide** and a river ford |
| Brick | Frosty Peaks | An ice cave, giant snowballs, a **summit glide** onto a frozen lake, penguins and a ski jump |
| Galaxy | Toy Factory | Conveyor belts that push you, stampers, spinning wrecking arms, forklifts and a pit jump |
| Galaxy | Lava Castle | Lava bombs from the volcano, geysers, castle crushers and fire bars, a **glide over the lava lake** and a bridge with no rails |
| Galaxy | Rainbow Bricks | Steep banked rainbow turns, a jump, a **glide through rings between planets** and drifting asteroids |
| Movie | Jurassic Brick Park | Main Street and the park gate, a Gallimimus stampede, a T. rex that stomps across the road, the raptor pack with Owen, Dilophosaurus spit, swooping Pteranodons, a Spinosaurus river ford, Mount Sibo's lava bombs and a **glide over the Mosasaurus lagoon** |
| Movie | Tatooine Podrace | A Tatooine canyon with Jawas and a sandcrawler, a **glide** onto the Hoth snowfield with AT-ATs, then the Death Star trench with TIE fighters; C-3PO, R2-D2, Darth Maul, Cad Bane, Din Djarin and Grogu, Vader and more |
| Movie | Avengers Brick Assemble | The Battle of New York, the Bifrost, Wakanda and the Guardians of the Galaxy, with brick-built Spider-Man, Iron Man and the rest of the Avengers |
| Movie | Hogwarts Brick Express | Snowy Hogsmeade Station with the Hogwarts Express steaming in, Hogsmeade village where the Knight Bus barrels across, a viaduct where Dementors swoop and freeze you, the Great Hall under floating candles and house banners, Bludgers on the Quidditch pitch, Hagrid's hut and the Whomping Willow, Aragog's spiders in the Forbidden Forest, and a **glide over the Black Lake** where the giant squid slams its tentacles on the shore road |
| JJK Run | Kyoto Goodwill Clash (Season 1) | A sunset run from Kyoto Jujutsu High through Arashiyama bamboo into the Goodwill Event forest: released curses, Hanami's roots bursting through the road and Todo's Boogie Woogie pads that swap you across the road; a **glide over the lake** to the detention centre where Sukuna wakes, Mahito's sewer, the Yasohachi Bridge, Mechamaru's Ultra Cannon and the baseball finale with fly balls and a home-run jump |
| JJK Run | Hidden Inventory Okinawa (Season 2) | Summer at Jujutsu High, an Okinawa coast road past an aquarium, a **cliff glide over the turquoise sea**, the Star Religious Group temple, then Tengen's Tomb with its corridor of doors and the barrier tree; dodge Geto's rainbow dragon, Toji's Inverted Spear of Heaven and his storage worm |
| JJK Run | Cursed Brick Shibuya (Season 2) | Tokyo Jujutsu High, a torii forest, the Shibuya scramble crossing at night, a **glide into Sukuna's Malevolent Shrine**, Jogo's volcano and Gojo's Unlimited Void; dodge Dismantle slashes, meteors, Hollow Purple and Rika's arm slams |
| JJK Run | Culling Games Colony (Season 3) | The barrier-sealed Tokyo colony with Kogane's scoreboards, Hakari's pachinko **JACKPOT** gate (drive through on 7-7-7 for a huge boost), Higuruma's courtroom with slamming gavels, Kashimo's lightning, a **glide over a flooded crater** under Uro's flipped sky, Ryu's Granite Blast and Kurourushi's cockroaches in Sendai, and Sakurajima |
| Video Game | Blocky Biome Run (Minecraft) | A plains village with villagers, the bell and an iron golem, creepers that wander onto the road and explode, skeleton archers in the birch forest, gravel and anvils falling in a ravine, minecarts crossing the mineshaft, a Nether portal into netherrack and glowstone where ghasts spit fireballs, a lava jump, the Nether fortress bridge, a **glide over the lava sea** through the return portal, and lit TNT in the desert |
| Video Game | Kanto Brick Route (Pokémon) | Pallet Town and Professor Oak's lab, Route 1's tall grass where Diglett pop out of the road, Viridian City's Pokémon Center and Gym with a sleeping Snorlax that rolls across the road, Caterpie and Weedle in Viridian Forest, Zubat and rolling Geodude in Mt. Moon, a **glide over the sea** past Lapras with Gyarados leaping across your path, a Hyper Beam on the Cerulean shore, and a Pokémon Stadium finale with a big screen, cheering crowds and exploding Voltorb |
| Video Game | Green Brick Zone (Sonic) | Green Hill's checkered cliffs, palms and spinning sunflowers beside a giant loop-de-loop, Motobugs and Crabmeats, a corkscrew climb over the start straight, spring jumps under Buzz Bombers, a **glide over the ocean**, Casino Night's pinball bumpers and slot machine, then Dr. Eggman's base under the Death Egg with his swinging wrecking ball and pop-up spike strips; studs are gold rings |

## Racers

The original Brick Kart racers come as 14 drivers like the movie casts below
(Brick Bob, Astro Ava, Cap'n Redbeard, Sir Kara, Robo-Rex, Ninja Nix, Chief Flo,
Wizard Wendel, Chef Pepper, Cowgirl Cassie, Viking Bjorn, Queen Regina, Zorp the
Alien and Mummy Max) and 13 original karts (Skater Sam and Dino Dina are karts
only; Sir Kara, Wizard Wendel and Chef Pepper are drivers only).

### Drivers and karts

You pick a **driver** and then a **kart** separately, like Mario Kart. Pick a
driver from the grid (they stand on their own in your preview, introducing
themselves with waves, hops, twirls, dances and their signature moves) and press
**A** (they jump-spin with a cheer, then hop into their kart); then flip through karts with **◀ ▶** in your
own preview and press **A** again to lock it in (**B** steps back). While you're on
the kart, press **▲ / ▼** (or tap **Kart** / **Glider**) to switch to choosing your
**glider**: the preview slides up or down out of its panel and back in as the
kart flying under its open glider, seen from further back so the whole wing shows;
◀ ▶ then flips through gliders, and ▲ / ▼ again switches back to the kart. Every player
does this at their own pace, so nobody waits for anyone else. On phones there's
no grid: the preview fills the screen and you flip through drivers with ◀ ▶ too,
tapping **Lock in**. On a touch screen you can also swipe the preview left / right
to flip through drivers, karts and gliders, and swipe up / down to switch between the
kart and the glider. Wherever the figures stand, the camera frames them in the part of
the preview no text or button covers. Phones are single-player (the whole screen
is one big preview and fits without scrolling); tablets and computers take up to 8. The **Back**
button steps back one stage (ready → kart → driver → menu), coming back from the
cup or map screen keeps everyone locked in, and each player slot remembers the
driver, kart and glider it last looked at. The 14 original Brick Kart drivers are listed after the
movie casts, and the classic karts come after the newer vehicles. The drivers are brick-built movie characters from
the Movie Cup: 16 from Marvel, 15 from Star Wars, 14 from Harry Potter, 13 from
Jujutsu Kaisen and 14 from Jurassic World (72 in all). The Harry Potter cast
(Harry, Hermione, Ron, Dumbledore, Hagrid, Snape, Voldemort, Draco,
Neville, Ginny, Sirius, Dobby, Bellatrix and Fred) is listed just above
the Jujutsu Kaisen one, and each of them casts a signature spell when they
cheer or win (Patronuses, Fawkes, the Dark Mark, fireworks…). Every kart in
the race (CPU ones too) gets one of them at the wheel.

The **Video Game Cup** casts follow the movie casts (33 more):

- **Minecraft** (12): Steve, Alex, Creeper, Zombie, Skeleton, Enderman, Villager,
  Iron Golem, Piglin, Witch, Snow Golem and Pig, blocky pixel-skinned mobs with a
  signature move when they cheer or win (Steve mines with his diamond pickaxe, the
  Creeper flashes and puffs, the Enderman teleports in purple sparks, the Witch
  throws a splash potion…).
- **Pokémon** (12): Pikachu, Ash Ketchum, Charmander, Squirtle, Bulbasaur, Eevee,
  Jigglypuff, Gengar, Lucario, Mewtwo, Charizard and Snorlax, each with a signature
  move: Pikachu's sparks, Charmander's and Charizard's fire breath, Squirtle's Water
  Gun and shades, Bulbasaur's Vine Whip, Jigglypuff's song, Gengar fading into the
  shadows, Lucario's Aura Sphere, Mewtwo's Shadow Ball and Snorlax's Zzz.
- **Sonic the Hedgehog** (9): Sonic, Tails, Knuckles, Amy Rose, Shadow, Blaze,
  Metal Sonic, Big the Cat and Dr. Eggman: Sonic's finger-wag and thumbs up, Tails'
  spinning twin tails, Knuckles' spiked punches, Amy's Piko Piko Hammer, Shadow's
  Chaos Control flash, Blaze's fire, Metal Sonic's overdrive, Big's fishing rod
  with Froggy and Eggman shaking his fist.

- The select screen has a live 3D stage with **a preview for each player**: your
  highlighted driver sits in your highlighted kart, shows off, cheers when you
  lock them in and celebrates when you're ready. The picker list scrolls with
  player 1 until they lock in, then with the next player still choosing, and so
  on (marked "picking now"); everyone else can still move their cursor and watch
  their own preview.
- Simplified mode fits every driver on one screen (cards shrink if they must); the
  full roster picks a column count that avoids rows with a single card.
- Each player slot remembers its last driver and kart, saved
  in your browser, and starts on them next time. Stat bars show the kart's stats adjusted by the driver's weight
  class (light drivers accelerate and handle better; heavy ones are faster and
  push harder).
- 61 karts in one grid: the first 7 originals, the Wild Rides, the movie rides,
  the video game rides, then the other 6 originals. The **originals** are themed on their racers: Hard
  Hat Hauler (loader-dumper), Comet Cruiser (moon rover), Plank Plunderer
  (paddle-wheel pirate ship), Turbo Titan
  (robot-head jet dragster), Shadow Dart (shuriken trike), Blaze Runner (fire
  engine), Dust Devil
  (covered wagon), Long Hammer (Viking longship on runners), Royal Coach
  (pumpkin coach), Skate Spark (giant skateboard), Saucer Buggy (flying saucer
  with a beamed-up cow), Tomb Rover (scarab walker), Fossil Flyer (T. rex
  skeleton on shell wheels). The rest:
  - **Star Wars Rides**: Dune Skimmer (landspeeder), Endor Zipper (speeder
    bike), Boonta Bolt (podracer), Red Five (X-wing, wings open into an X when
    gliding or boosting), Chicken Walker (AT-ST that walks), TIE Howler.
  - **Marvel & Jurassic Rides**: Park Jeep 12, Gyrosphere (rolling glass ball),
    Tour Explorer, Royal Talon (Wakandan hover-car), Stark Roadster, Goat Chariot.
  - **Wizarding Rides** (listed just above the Cursed rides): Flying Anglia
    (wheels tip flat like rotors when gliding), Hogwarts Express (steam
    locomotive with moving rods), Knight Bus (leaning triple-decker), Hagrid's
    Motorbike (with Hedwig in the sidecar), Firebolt (racing broom chasing a
    Snitch), Buckbeak (gallops, then spreads his wings to fly).
  - **Cursed & Fantasy Rides**: Ijichi's Sedan, Dharma Wheel (giant monowheel),
    Nue (flapping thunderbird), Magic Carpet, Brick Dragon (walks, breathes fire),
    Mad Teacup.
  - **Minecraft Rides**: Minecart, Saddled Pig (chasing a carrot on a stick), Oak
    Boat (paddles row, and flap when gliding), Horse (gallops), Strider (walks on two
    long legs, steered with a warped fungus), TNT Minecart (the TNT flashes when you
    boost).
  - **Pokémon Rides**: Poké Ball Kart (the red top half tips back on boost), Rotom
    Bike (leans and crackles with sparks), Lapras (swims on its own patch of sea,
    flippers spread to glide), Rapidash (gallops with a flaming mane, tail and
    hooves), Arcanine (bounds along), Koraidon (sprints, then spreads its feathered
    head-wings to glide).
  - **Sonic Rides**: Speed Star (Sonic's blue racer), Tornado (Tails' red biplane:
    the propeller spins and it flies on its own wings off glider ramps), Egg Mobile
    (Eggman's hover pod), Extreme Gear (hoverboard), Land Breaker (Knuckles' red
    4x4), Dark Rider (Shadow's motorbike).
  - **Wild Rides**: Thunder Hog (leaning chopper), Big Stomp (monster truck),
    Tread Head (tank), Tub Thumper (bathtub), Hot Diggity (hot dog), Blast Sled
    (rocket sled on skis).
- In the race, drivers steer and lean into turns, look behind, hold the glider
  bar overhead, do trick poses off ramps, wind up and throw items, flail when
  they're hit, taunt racers they overtake and **cheer when they hit a rival**.
  Each has a signature celebration and a little synthesised voice.
- After the finish, the top three celebrate and the rest sulk. In a Grand Prix,
  the podium shows the top three drivers celebrating in 3D.

### Gliders (25)

The wing that pops out on glider ramps is your pick too. CPU racers get one from
their own movie or game half the time. Most of them move: they flap, spin, flutter
or crackle while you fly.

- **Originals**: Brick Wing (the classic, in your kart's colours, and the default),
  Parasol (spins), Paper Plane, Butterfly (flaps), Hot-Air Balloon (burner flickers),
  Dragon Wings (ripple), Gyrocopter (rotor spins), Delta Kite (bow tail waves) and
  Big Plate (a giant studded 2x8 plate).
- **Marvel**: Repulsor Wing (Iron Man, with flickering repulsor blasts), Web Glider.
- **Star Wars**: S-Foil Wing (an X-wing whose wings open into an X), TIE Panels.
- **Harry Potter**: Fawkes (hang on to the phoenix's tail feathers), Marauder's Map
  (footprints walk across it).
- **Jujutsu Kaisen**: Nue (Megumi's thunderbird, crackling with lightning),
  Malevolent Shrine (Sukuna's shrine roof with cursed flames).
- **Jurassic World**: Ptera Ride (a Pteranodon gripping the bar), Park Para-sail.
- **Minecraft**: Elytra, Ghast (it screeches every now and then).
- **Pokémon**: Charizard Wings (tail flame flickers), Poké Chute.
- **Sonic the Hedgehog**: Tornado Wings (propeller spins), Tails Rotor.

## Movie and game powers (34)

Extra power-ups themed on the Movie Cup films and the Video Game Cup games come out
of item boxes on **every track** (twice as often on their own tracks, so JJK powers
on every JJK Run map); racers further back get the big comeback ones.

In **Simplified mode** each pack's powers only turn up on its own tracks (Hyperspace
Jump on Tatooine Podrace, Ender Pearl on Blocky Biome Run…), and there they make up
about three quarters of what the item boxes give, topped up with a few plain items
for balance: Turbo Studs, Triple Turbos, and a trap, shield or Homing Rocket where
the pack has none of its own (the list is `SIMPLE_EXTRAS` in `js/items.js`). Tracks
without a pack (the Stud, Brick and Galaxy Cups) give plain items only.

- **Star Wars**: Force Push (a Force wave that spins out karts ahead and blows
  away traps), Lightsaber Spin (a spinning double saber that spins out anyone
  you touch and bats items back), Hyperspace Jump (stretch, streak and warp far
  up the track).
- **Marvel**: Mjolnir (homing hammer, then lightning that chains to 3 more
  karts), Cap's Shield (ricochets between 3 karts and comes back), Web Shot (web
  a kart ahead, or drop a web trap behind), Infinity Snap (half the racers ahead
  crumble to brick dust for a moment).
- **Harry Potter**: Expelliarmus (a red jet homes in on the kart ahead, spins
  them out and steals their item for you), Wingardium Leviosa (the two or three
  karts ahead float helplessly in the air, then drop), Expecto Patronum (a silver
  stag gallops up the track bowling karts aside while a shield destroys shots at
  you), Invisibility Cloak (fade to a shimmer for 6 s: items, hazards and karts
  pass through you and you go a bit faster), Golden Snitch (the Snitch tows you
  far up the track at huge speed, knocking karts aside).
- **Jujutsu Kaisen**: Hollow Purple (an unstoppable purple sphere that wrecks
  everything down the track), Domain Expansion: Infinite Void (freezes every
  rival around you), Black Flash (your next bump wrecks a kart), Divine Dogs
  (shadow dogs hunt the two karts ahead).
- **Jurassic World**: T. rex Roar (a roaring head spins out karts ahead and eats
  incoming items), Raptor Pack (three raptors chase and pounce on karts ahead),
  Mosasaurus Breach (it leaps out of the road ahead and crashes down in a
  splash).
- **Minecraft**: Creeper (drop it behind or toss it ahead; it hisses, flashes and
  explodes when karts come near, spinning them out and blasting items away), Totem
  of Undying (cancels the next hit, or catches you if you fall off the track, with a
  green-and-gold burst and a boost), Trident (homes in on the kart ahead, Channeling
  calls down lightning and leaves a crackling patch that spins out karts driving
  through it), Elytra (a firework launches you into the air and you glide on the
  wings, gaining speed), Ender Pearl (thrown at the kart just ahead: you swap places
  and they spin out; in the lead it flies up the track and you teleport where it
  lands).
- **Pokémon**: Snorlax (a sleeping Snorlax dropped behind you, or tossed ahead,
  blocks the road; karts bounce off its belly and spin out), Mirror Coat (for 6 s a
  green coat sends any attack from another racer straight back at them and bounces
  shots away; track hazards still hit), Poké Ball (homes in on the kart
  ahead and catches it: it wobbles three times, then they burst out), Quick Attack
  (three dashes with white speed lines that bump aside karts you touch), Thunderbolt
  (lightning strikes every racer ahead: they spin out and shrink for a few seconds).
- **Sonic the Hedgehog**: Motobug (drop a Badnik that patrols the road and spins out
  whoever hits it), Lightning Shield (blocks the next hit and pulls nearby gold studs
  to you), Homing Attack (curl into a ball, leap onto the kart ahead and bounce off
  with a boost), Spin Dash (rev up, then blast off, spinning out anyone you ram),
  Chaos Control (the seven Chaos Emeralds stop time: every other racer crawls along
  for 4 seconds while you race on with a boost).

## Power-ups (22)

Drive through the rainbow **?** bricks to get an item. You can hold two: the one you can use now (big slot) and the next one (small slot), which moves up once you use the first.

The further back you are, the better your items. The leader mostly gets defensive items, and the racers at the back get the big comeback items. Whoever is in **last place** always gets a catch-up item that speeds them up: Bullet Brick, Golden Brick, Gold Turbo, Triple Turbo, Mega Brick, a Stud Bag, or a movie or game power that carries them up the track (Hyperspace Jump, the Golden Snitch, the Invisibility Cloak, Ender Pearl, Elytra, Quick Attack, Spin Dash, Chaos Control). Never one that only hits other racers. Being far behind the leader also improves your odds.

| Item | What it does |
| --- | --- |
| Turbo Stud / Triple Turbo | A speed boost (or three) |
| Gold Turbo | Boost as often as you like for 7 seconds |
| Stud Bag | Five gold studs at once and a small boost |
| **Bullet Brick** | Turn into a giant brick bullet that drives itself at huge speed and blasts karts aside, spinning them out (like Bullet Bill) |
| Golden Brick | Invincible and faster; bowl karts over (they spin out) |
| Mega Brick | Grow huge for 8 seconds and flatten anyone you touch; a hit shrinks you |
| Ghost Brick | Items pass through you for 5 seconds, and you steal an item from a rival |
| Homing Rocket / Triple Rockets | Chases the racer in front of you |
| Leader Seeker | Flies over the track to 1st place and explodes |
| Bouncer Brick / Triple Bouncers | Fires straight and bounces off walls (hold back to fire behind) |
| Freeze Brick | A bouncer that freezes whoever it hits |
| Boomerang | Flies out, spins racers it hits, and comes back |
| Boom Brick | Thrown forward (or dropped back); explodes with a big blast |
| Stray Bricks | A pile of loose bricks that spins karts out |
| Paint Puddle | A slippery puddle that spins everyone who drives through it |
| Fake Box | Looks like an item box, but blows up whoever touches it |
| Ink Splat | Splats ink over the screens of everyone ahead |
| Brick Shield | Blocks the next hit |
| Brick Horn | A shockwave that destroys nearby items (even the Leader Seeker) and spins nearby karts |

When you're hit, your kart breaks into bricks and snaps back together.

## Bumping and fairness

Karts bump like Mario Kart: there's real momentum, and **weight** decides who
gets pushed. Hitting someone from behind hands them some of your speed; a side
swipe knocks both karts sideways (the lighter one further) instead of stopping
anyone, and the knock slides off over a moment (longer on ice). Traffic, cows,
forklifts and other "bump" hazards shove you aside rather than spinning you.
Rolling boulders, snowballs, gumballs and asteroids: hit one square in the middle
and it stops you; clip it towards a side and you're thrown off the other way and
slowed, and the nearer the very edge, the less speed you lose. Every other hazard
is graded the same way by where in it you are hit: crushers, geysers, cannonball
and meteor impacts, stomping feet and fire bars wreck you only in their middle,
spin you out further out, and at the edge just shove you out and cost a little
speed. Steering away at the last moment pays off. Only power-ups turn contact
into a hit: a Golden, Mega or Bullet Brick bowls you over into a spin-out and
flings you aside, and only Black Flash wrecks you on contact.

- Getting hit twice in quick succession gives you a longer grace period, so you
  can't be chain-wrecked.
- CPUs hold aimed items (rockets, bouncers, bombs, boomerangs, movie powers) at a
  human who was just hit. On Easy and Normal they also hold their fire at
  humans more often, the way Mario Kart's CPUs are gentler at lower speeds.
Gold studs on the track raise your top speed (up to 10). Getting hit makes
you drop some.

## Controls

| Action | Controller | Keyboard | Touch |
| --- | --- | --- | --- |
| Steer | Left stick / D-pad | A D / ← → | drag left / right anywhere |
| Accelerate | A or RT | W / ↑ | automatic |
| Brake / reverse | B or LT | S / ↓ | drag the steering finger down |
| Hop & drift | RB | Space | touch with a second finger |
| Use item | LB, X or Y | E or Shift | ITEM |
| Look behind | click a stick | Q | |
| Pause | Start | Esc / P | II |

- **Drift**: hold drift while you turn. The sparks go blue, then orange, then
  purple. Let go for a mini-turbo.
- **Tricks**: tap drift in mid-air after a ramp to land with a boost.
- **Rocket start**: hold accelerate just after the second start light comes on.
- **Gliding**: steer while you fly; the glider banks into the turn like a plane. Let go and it
  eases back towards the middle of the track. You land wherever the road is below you, and once you're past the gap you come down twice as fast. Ground obstacles like hay bales and cupcakes only stop you if you fly low enough to hit them.
- **Off the road**: the grass, sand or snow beside the track is drivable but slow
  (you can't wander far from the track). Only water, lava, holes and the void of
  space drop you into a respawn.
- **Falling off**: the crane puts you back on a safe stretch of road. If you fall again right away, it puts you further ahead next time.
- Sound mutes when you switch to another tab or window.
- **Full screen on phones** (the same approach as Widow's Bay): on Android and iPad
  the first tap in landscape goes full screen (so does tapping the title). Turning
  the device mid-race pauses it, and tapping **Resume** in landscape goes full
  screen (the pause menu says so while you're upright). iPhone
  Safari can't go full screen, so in the menus a swipe up tucks Safari's bars away
  (a hint says so while they're showing); during a race nothing scrolls. **Add to
  Home Screen** opens Brick Kart full screen in landscape, with its own icon.
- **Touch controls**: drag a finger left / right anywhere on the screen to steer
  (it steers from where you touched down, and the anchor follows past full lock so
  turning back is instant). Drag that finger well down to brake (and reverse); slide
  it back up to let go. While steering, touch anywhere with a second finger to hop
  and drift (or do a trick in the air). The one button is **ITEM**: it shows the item
  you're holding (and the next one beside it) and is greyed out while you have none.
  Gas is automatic.
- **Tilt steering** is switched off for now (`TILT_ENABLED` in `js/main.js`), along
  with its options, until it feels right. The code is still there: Wheel or Turn
  (gyro) style, three sensitivities and invert, with a dead zone, a gentle curve and
  smoothing, re-centred at GO and whenever the steering finger lifts.
- Tapping outside a popup menu (Options, How to Play, Pause) closes it.

## Multiplayer (1–8 players, split-screen)

Player 1 is already in on the select screen (on a phone it stays single-player:
other controllers can't join and races have no split screen). Each other player presses **A** on
their own controller to join (one empty "Press A to join" slot is shown at a
time, up to 8 players). Two people can also share one keyboard: once the first
keyboard player has joined, the second presses **Right Shift**. Then player 1
uses WASD + Space (drift) + E (item), and player 2 uses the arrow keys +
Right Shift (drift) + Enter (item). Two players get a top/bottom split,
three or four get quarters, five or six a 3×2 grid and seven or eight a 4×2
grid. Browsers expose a limited number of controllers (Chrome lists up to
four), so eight players may need a mix of controllers and the two keyboard
setups.

## Online

> **In progress — off by default.** Online play is switched on with **`?online=1`** in the
> address (or `ONLINE_ENABLED` at the top of `js/main.js`). Without it the Online menu item isn't
> shown and none of the online code (`js/online/`, `js/vendor/`) is loaded; the hooks it adds to
> the race, karts, items and hazards are idle. **What exists:** everything described below.
> **Tested** (automated, headless, against a local relay): lobby listing / host / join, the room
> panel and bubbles, names (remembered, default, duplicates told apart, the on-screen keyboard),
> two local players on one screen plus another screen, the line-up, a synchronized start (all
> screens within one frame), remote kart smoothness, item uses and victim-decided hits, a guest
> leaving (kart becomes a CPU), joining mid-race (watching, then racing the next one), host
> migration mid-race, a guest's reconnect, the relay dying mid-race (finishes offline), an
> unreachable relay, malformed messages, and the production relay's lobby. **Left:** a real
> multi-device session over the production relay (this environment can't open WebSockets to it),
> testing on real phones and gamepads, and tuning with real network latency.

Main menu → **Online**. Race friends anywhere: up to **12 people** in a race, and
each screen can bring its own local players (split screen, extra controllers, a
2nd keyboard, exactly like local multiplayer), so 3 people round one TV and 2 at
another screen race together naturally. Races are always 12 karts: CPU racers
fill the rest. Rooms are open to anyone who sees them (it's a game for friends).

- **Host a race** opens a room ("<your name>'s race") that appears in everyone's
  list of **open races** (with how many screens are in it). Pick one to **join**.
  Everything works with a controller, the keyboard, a mouse or touch.
- **Select screen**: as offline, plus a **room panel** listing every person in
  the room: their driver portrait, name, a little colour tag per screen (with
  P1/P2… when a screen has several players), a 👑 on the host, and what they're
  doing (choosing a name / driver / kart / glider, ready ✓, loading, racing,
  watching, reconnecting…). Bubbles pop up as people join, leave and lock in.
  Drivers someone else has locked in are taken.
- **Names**: each player first picks the name they race under: **Default**
  (made from their driver: "Thor"; "Thor (Red Five)" if someone else in the room
  is also Thor; "… 2" if they also share the kart), one of the **names saved on
  this device**, or **+ New name…** (an on-screen keyboard you can use with a
  controller, or type with a real keyboard / the phone's keyboard; up to 16
  characters; it's saved for next time). X (Tab) on a saved name forgets it. The
  highlight starts on what that player slot (P1, P2…) used last time, so just
  pressing A all the way through keeps it.
- **Starting**: when everyone is ready the host picks a map (guests see "Host is
  picking a map…"). The host can press **Race!** twice to start without
  someone who's still choosing (they watch that race). Then everyone sees the
  **line-up**: every player's driver in their kart with their name over it and a
  spinner that turns into a tick as each screen finishes loading the track.
  When all have loaded (or after 30 s) the host sets the start time and every
  screen runs the flyover and countdown on the shared clock, so GO is at the
  same moment everywhere.
- **During the race**: names float over other people's karts (on split screen
  your own name shows on the other players' views only), and a standings list
  with names sits at the right. Esc / Start opens a menu with Resume and
  **Leave room**; the race doesn't stop for anyone. Item boxes, studs and
  boost pads are your own screen's.
- **After the race**: results with everyone's names; the host picks **Next
  race** (same racers, straight to the map choice) or **Change racers** (back to
  the select screen). Grand Prix cups are offline only.
- **Joining late**: joining while a race is running lets you **watch** it (◀︎ ▶︎
  switches whom you follow); you're in the next one.
- **Leaving and trouble**: if someone leaves, a bubble says so and their kart
  carries on as a CPU, so the field stays at 12. A player whose connection drops
  briefly is shown as "reconnecting…" and their kart keeps going; they re-join
  the same room automatically within a few seconds without anyone noticing. If
  the **host** leaves, the relay closes the room, so the game moves everyone to a
  new one by itself: the next player in join order becomes host, the race (or
  select screen) carries on, and that player's screen takes over the CPU karts.
  If the online server can't be reached, the Online screen says so with
  **Retry**; if it goes away mid-race, the race finishes offline with every
  other kart as a CPU. Local play never depends on any of this: the online
  code and the relay client are only loaded when you open Online.

### How it works

Online play uses **mini-rooms**, the small relay from the
[`mini`](https://github.com/hoai2k/mini) repository (`MULTIPLAYER.md` there)
running on Cloudflare Workers at `https://mini-rooms.hoai2k.workers.dev`
(pages on localhost use `http://localhost:8787`, i.e. `wrangler dev`, and
`?rooms=<url>` overrides). The relay only passes messages around: a room is a
group of up to 16 connections ("screens" here; the game allows 12 and caps
people at 12), each with a **presence** (its latest state, which replaces the
last) and **topics** (one-off broadcasts). `js/vendor/mini-rooms.js` is a
verbatim copy of its browser client; `js/online/session.js` loads it on demand.

Who owns what:

- **Each screen** simulates its own players' karts (physics, item rolls, hits
  on them) and publishes their state 15 times a second.
- **The host** also simulates the CPU karts (and the karts of anyone who left)
  and publishes them in the same message, and owns the room state: phase, join
  order, race setup and seed, start time, results.
- **Everything else is a puppet**: other screens' karts are drawn from those
  updates with **snapshot interpolation** on a shared race clock, about 100-150
  ms behind real time (adaptive: it follows how late and how irregular updates
  arrive), **dead reckoning** if updates are late (straight on for 0.3 s, then
  along the track for up to 3 s), and **smoothed corrections** (a snap only for
  respawns and big jumps). Wheels, drift sparks, gliders, boost flames, shields,
  spins and the driver's cheers and taunts all come from the update.
- **Shared clock**: guests ping the host a few times when they join and every
  few seconds after (topics `ping` / `pong`) and keep the sample with the
  shortest round trip; corrections are eased in. The countdown, race time,
  kart update times and **hazards** (moving traffic, crushers, cannons… their
  positions are functions of this clock) all use it. The track and its scenery
  are built from the host's seed, so they match everywhere.
- **Items**: a use goes to everyone (event `u`) with the user's position and
  heading, a random seed and the standings at that moment; every screen spawns
  the same shot from the puppet as it's drawn (the event is held until the
  puppet's own time reaches it), so homing shots and "the racer ahead" powers
  pick the same target. **Only a kart's own screen decides that it was hit**,
  and says so (event `h`) so the shot or trap disappears everywhere; the spin
  or wreck shows through that kart's updates.
- **Host migration**: the relay closes a room when its host leaves. The host's
  presence always carries the join order, so every screen agrees on the next
  host, who opens the successor room `<room id>-g<n>`; the others join it
  (retrying, and the next in line takes over if the first never shows up).
  The new host keeps the old host's clock running and takes over the CPU karts
  from where they are.

| Presence (one message per screen) | Meaning |
| --- | --- |
| `v`, `u`, `n`, `h` | protocol version (1), the screen's id (stable across reconnects), player 1's name, host flag |
| `s` | stage: `sel` / `rdy` / `load` / `race` / `spec` / `res` |
| `pl` | the screen's players: `[slot, name, custom name?, driver id, kart id, glider id, step]` |
| `ld`, `ri` | the race id it has loaded / is publishing karts for |
| `ks` | racing: each owned kart's state (23 numbers: time, position, heading, velocity, steer, drift, flags for glide / boost / shield / golden / mega / bullet / ghost / frozen / finished / respawning, spin and wreck timers, race distance, item, gesture, finish time, studs) |
| `R` (host) | room state: generation, phase, join order, select round, race setup (every second), start time, karts the host drives, results |

| Topic | Sent by | Meaning |
| --- | --- | --- |
| `ping` / `pong` | guests / host | clock sync (`pong` names the guest it answers) |
| `ev` | anyone | a batch of race events for one race id: `u` item use (kart, time, item, pose, track position, back/forward, seed, shot id, standings, whom a Ghost Brick robbed) and `h` hit (victim kart, time, shot id) |

Everything received is validated (types, ranges, finite numbers, known ids) and
anything unknown is ignored; names and titles are escaped before they reach the
page.

**Budget.** The relay runs on Cloudflare's free plan: 100,000 requests a day,
where each message a screen *sends* counts 1/20 of a request (receiving is
free). A racing screen sends 15 messages a second (whatever its number of local
players, plus a ping every 6 s), about 2,700 requests an hour, so the allowance
is roughly **37 screen-hours of racing a day**: about 60 three-minute races with
12 screens, or 200 with 4. Menus cost almost nothing (messages only on changes,
plus one every 15 s). The **lobby list** is fetched every 4 s while the Online
screen is open, and each fetch is a whole request (900 an hour per screen), so
don't leave it open for hours. Running out only makes the relay refuse
connections until the next day; it never costs money.

**Limitations.** The relay can't be changed from here, so: a host leaving costs
everyone about half a second to a second without updates (other karts carry on
along the track, then ease back); a screen in a background tab stops sending
(browsers pause hidden tabs), and if that's the host its CPU karts freeze for
the others until it's back; there's no protection against cheating (it's for
friends); and a few effects are only approximately the same on every screen:
Star Wars map hazards that pick random lanes, and particles. Ability powers that affect "karts nearby" use positions as each
screen sees them.

For development and tests, `?debug` exposes the online state as `window.__net`,
and `?norender` skips drawing the 3D views (headless software rendering is too
slow to drive several players).

## Code layout

- `js/main.js`: game shell, menus, Grand Prix flow, results and podium
- `js/race.js`: one race (grid, countdown, pickups, bumping, laps, split-screen cameras)
- `js/kart.js`: arcade kart physics, drifting, jumps, respawns, hit reactions
- `js/ai.js`: CPU drivers (racing line, drifting, item tactics, rubber-banding)
- `js/items.js`: power-ups, projectiles and traps
- `js/abilities.js`, `js/abilities/*.js`: the movie powers (plug-in packs; the contract is in abilities.js)
- `js/track.js`: spline track: road, walls, supports, item boxes, boost pads, ramps, studs
- `js/tracks.js`: the map list and Grand Prix cups
- `js/maps/*.js`: one file per map (layout, sections, hazards, scenery); `js/maps/kit.js` has shared props
- `js/hazards.js`: moving traffic/boulders, crossings, geysers, crushers, fire bars and cannons
- `js/world.js`, `js/decor.js`, `js/lego.js`: sky, ground, lighting, brick-built props and the brick mesh merger
- `js/characters.js`: minifig drivers and karts (plus the five kart body styles)
- `js/driver.js`: movie-character drivers: the seated rig contract, weight classes and the gesture animator
- `js/gliders.js`, `js/gliders/*.js`: the glider list and the glider packs (the glider contract is at the top of `js/gliders.js`)
- `js/vehicles.js`, `js/vehicles/*.js`: the kart list and the vehicle packs (the vehicle contract is documented above `buildVehicle` in `js/characters.js`)
  - Sizing: big characters should read as big in a small vehicle and small ones as small in a big
    one. Vehicles only fit what must fit (seat width, head clearance under a canopy or roll hoop),
    within clamps; drivers are never scaled, and Rocket only gets his booster crate where he
    couldn't see out without it.
- `js/drivers/*.js`: the driver casts per movie (`kit.js` has the seated figure builder); `js/showcase.js`: the 3D select stage, portraits and podium; `js/gallery.js`: a developer line-up view
- `js/effects.js`, `js/audio.js`, `js/hud.js`, `js/input.js`: particles, sound, HUD and input devices
- `js/online/`: online play, loaded only from the Online menu: `online.js` (lobby, room flow, select hooks, results, host duties), `session.js` (the relay connection: identities, presence, clock sync, reconnecting, host migration), `netrace.js` (race sync: puppets, interpolation, item events, CPU takeover), `names.js` (names, saved names, the on-screen keyboard), `lineup.js` (the line-up while loading), `proto.js` (protocol constants, validation, kart-state encoding, seeded random)
- `js/vendor/mini-rooms.js`: the mini-rooms relay client, copied verbatim from the `mini` repository's `multiplayer/client/mini-rooms.js`
- `js/chrome.js`: getting the browser's bars out of the way on phones (fullscreen, iPhone Safari's swipe-up, home-screen app)

For development, `?quick=<map id>` (city, meadow, pirate, candy, jungle, frost, factory, lava, space, jurassic, starwars, marvel, hogwarts, jjk-goodwill, jjk-inventory, jjk, jjk-culling, minecraft, pokemon, sonic) goes
straight into a race. Add `&players=2` to test split-screen, and `&driver=<driver id>`
/ `&kart=<kart id>` / `&glider=<glider id>` to pick player 1's driver, kart and glider. `?gallery=<movie id
| driver id | all>` lines drivers up in their karts; add `&pose=cheer` (taunt,
ouch, trick, win, lose, glide, look…) to hold a gesture. `?garage=<pack | kart id |
all>&driver=<id>` does the same for vehicles (`&pose=boost` shows boost effects).
`?glider=<pack | glider id | all>` lines the gliders up open over `&kart=<kart id>` with `&driver=<id>` holding on.
