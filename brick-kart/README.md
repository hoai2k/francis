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
| Steer | Left stick / D-pad | A D / ← → | tilt the phone, or drag left / right anywhere |
| Accelerate | A or RT | W / ↑ | automatic |
| Brake / reverse | B or LT | S / ↓ | BRAKE |
| Hop & drift | RB | Space | DRIFT |
| Use item | LB, X or Y | E or Shift | ITEM |
| Look behind | click a stick | Q | |
| Pause | Start | Esc / P | II |

- **Drift**: hold drift while you turn. The sparks go blue, then orange, then
  purple. Let go for a mini-turbo.
- **Tricks**: tap drift in mid-air after a ramp to land with a boost.
- **Rocket start**: hold accelerate just after the second start light comes on.
- **Gliding**: steer while you fly. You land wherever the road is below you, and once you're past the gap you come down twice as fast. Ground obstacles like hay bales and cupcakes only stop you if you fly low enough to hit them.
- **Off the road**: the grass, sand or snow beside the track is drivable but slow
  (you can't wander far from the track). Only water, lava, holes and the void of
  space drop you into a respawn.
- **Falling off**: the crane puts you back on a safe stretch of road. If you fall again right away, it puts you further ahead next time.
- Sound mutes when you switch to another tab or window.
- **Touch steering**: drag a finger left / right anywhere on the screen (it steers
  from where you touched down), and/or tilt the phone. Options on touch devices:
  - **Touch steering**: Tilt + drag (while a finger is down, dragging steers and tilt
    is ignored; when it lifts, the phone's current angle becomes straight ahead),
    Drag only (motion sensors off) or Tilt only.
  - **Tilt style**: **Wheel** rotates the phone like a steering wheel, the way most
    mobile racers do it (Asphalt, F1 Mobile, Mario Kart Tour's gyro handling); it
    works with the phone upright or flat. **Turn (gyro)** turns the phone left /
    right as if pointing it, read from the gyroscope and slowly re-centring.
  - **Tilt sensitivity** (how far you tilt for full lock: about 45° / 32° / 22°) and
    **Invert tilt**. A small dead zone, a gentle curve near the centre and a little
    smoothing keep it steady; tipping the phone towards or away from you doesn't steer.
  However you hold the phone when the race says GO is straight ahead (portrait or
  either landscape, on iPhone and Android alike). iPhones ask for motion access on
  the first tap.
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

For development, `?quick=<map id>` (city, meadow, pirate, candy, jungle, frost, factory, lava, space, jurassic, starwars, marvel, hogwarts, jjk-goodwill, jjk-inventory, jjk, jjk-culling, minecraft, pokemon, sonic) goes
straight into a race. Add `&players=2` to test split-screen, and `&driver=<driver id>`
/ `&kart=<kart id>` / `&glider=<glider id>` to pick player 1's driver, kart and glider. `?gallery=<movie id
| driver id | all>` lines drivers up in their karts; add `&pose=cheer` (taunt,
ouch, trick, win, lose, glide, look…) to hold a gesture. `?garage=<pack | kart id |
all>&driver=<id>` does the same for vehicles (`&pose=boost` shows boost effects).
`?glider=<pack | glider id | all>` lines the gliders up open over `&kart=<kart id>` with `&driver=<id>` holding on.
