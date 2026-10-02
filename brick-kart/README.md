# Brick Kart

A Mario Kart-style kart racer where the karts, drivers and maps are all built
from LEGO-style bricks. It runs in the browser with Three.js (r186) loaded from
a CDN and has no build step. Music and sound effects are made in code with
WebAudio.

Play: <https://hoai2k.github.io/francis/brick-kart/>

## Modes

- **Grand Prix**: pick a cup (3 maps each, 4 in the Movie Cup), or the All-Star Cup
  with all 13.
  Points go 15-12-10-9-8-7-6-5-4-3-2-1, and each cup ends with an award
  ceremony.
- **Quick Race**: one race on any map. By default there are **13 racers**
  (you plus CPU racers). You can change the number in Options.
- **Time Trial**: race alone with 3 Turbo Studs. Your best time on each map is
  saved in your browser.
- **Racer select**: player 1 is already in, using whatever controller (or
  keyboard/touch) you used in the menus; more players press A to join.
- **Options**: engine class (50/100/150/200cc), CPU difficulty, racers per race
  (4/8/10/13/16), laps, **Use Characters**, auto-accelerate, music and sound
  volume, and graphics quality. The game also lowers its render resolution
  automatically if frames run slow, and raises it again when there's headroom.

## Maps (13, in 4 cups)

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
| Movie | Cursed Brick Shibuya | Tokyo Jujutsu High, a torii forest, the Shibuya scramble crossing at night, a **glide into Sukuna's Malevolent Shrine**, Jogo's volcano and Gojo's Unlimited Void; dodge Dismantle slashes, meteors, Hollow Purple and Rika's arm slams |

## Racers

16 minifig drivers, each with different speed, acceleration, handling and
weight: Brick Bob, Astro Ava, Cap'n Redbeard, Sir Kara, Robo-Rex, Ninja Nix,
Chief Flo, Wizard Wendel, Chef Pepper, Cowgirl Cassie, Viking Bjorn, Queen
Regina, Skater Sam, Zorp the Alien, Mummy Max and Dino Dina.

### Use Characters (on by default)

You pick a **driver** and then a **kart** separately, like Mario Kart (turn
**Use Characters** off in Options for the classic 16 minifig racers). Every
player locks in a driver first; then the whole picker switches to the kart
step. The original 16 Brick Kart racers are also drivers, listed after the
movie casts, and the classic karts come after the newer vehicles. The drivers are brick-built movie characters from
the Movie Cup: 19 from Marvel, 16 from Star Wars, 16 from Jujutsu Kaisen and 16
from Jurassic World (67 in all). Every kart in
the race (CPU ones too) gets one of them at the wheel.

- The select screen has a live 3D stage: the highlighted driver sits in the
  highlighted kart, shows off, cheers when you lock them in and celebrates when
  you're ready. Stat bars show the kart's stats adjusted by the driver's weight
  class (light drivers accelerate and handle better; heavy ones are faster and
  push harder).
- The 16 karts come in five body styles: classic kart, racer, buggy, monster
  kart and hot rod.
- In the race, drivers steer and lean into turns, look behind, hold the glider
  bar overhead, do trick poses off ramps, wind up and throw items, flail when
  they're hit, taunt racers they overtake and **cheer when they hit a rival**.
  Each has a signature celebration and a little synthesised voice.
- After the finish, the top three celebrate and the rest sulk. In a Grand Prix,
  the podium shows the top three drivers celebrating in 3D.

## Power-ups (23)

Drive through the rainbow **?** bricks to get an item. You can hold two: the one you can use now (big slot) and the next one (small slot), which moves up once you use the first.

The further back you are, the better your items. The leader mostly gets defensive items, and the racers at the back get the big comeback items. Being far behind the leader also improves your odds.

| Item | What it does |
| --- | --- |
| Turbo Stud / Triple Turbo | A speed boost (or three) |
| Gold Turbo | Boost as often as you like for 7 seconds |
| Stud Bag | Five gold studs at once and a small boost |
| **Bullet Brick** | Turn into a giant brick bullet that drives itself at huge speed and blasts karts aside (like Bullet Bill) |
| Golden Brick | Invincible and faster; smash through karts |
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
| Brick Storm | Rains bricks down on the racers ahead |
| Brick Shield | Blocks the next hit |
| Brick Horn | A shockwave that destroys nearby items (even the Leader Seeker) and spins nearby karts |

When you're hit, your kart breaks into bricks and snaps back together.
Gold studs on the track raise your top speed (up to 10). Getting hit makes
you drop some.

## Controls

| Action | Controller | Keyboard | Touch |
| --- | --- | --- | --- |
| Steer | Left stick / D-pad | A D / ← → | ◀ ▶ |
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
- **Gliding**: steer while you fly. You land wherever the road is below you. Ground obstacles like hay bales and cupcakes only stop you if you fly low enough to hit them.
- **Falling off**: the crane puts you back on a safe stretch of road. If you fall again right away, it puts you further ahead next time.
- Sound mutes when you switch to another tab or window.

## Multiplayer (1–4 players, split-screen)

On the character select screen, each player presses **A** on their own
controller to join. Two people can also share one keyboard: once the first
keyboard player has joined, the second presses **Right Shift**. Then player 1
uses WASD + Space (drift) + E (item), and player 2 uses the arrow keys +
Right Shift (drift) + Enter (item). Two players get a top/bottom split, and
three or four get quarters.

## Code layout

- `js/main.js`: game shell, menus, Grand Prix flow, results and podium
- `js/race.js`: one race (grid, countdown, pickups, bumping, laps, split-screen cameras)
- `js/kart.js`: arcade kart physics, drifting, jumps, respawns, hit reactions
- `js/ai.js`: CPU drivers (racing line, drifting, item tactics, rubber-banding)
- `js/items.js`: power-ups, projectiles and traps
- `js/track.js`: spline track: road, walls, supports, item boxes, boost pads, ramps, studs
- `js/tracks.js`: the map list and Grand Prix cups
- `js/maps/*.js`: one file per map (layout, sections, hazards, scenery); `js/maps/kit.js` has shared props
- `js/hazards.js`: moving traffic/boulders, crossings, geysers, crushers, fire bars and cannons
- `js/world.js`, `js/decor.js`, `js/lego.js`: sky, ground, lighting, brick-built props and the brick mesh merger
- `js/characters.js`: minifig drivers and karts (plus the five kart body styles used with Use Characters)
- `js/driver.js`: movie-character drivers: the seated rig contract, weight classes and the gesture animator
- `js/drivers/*.js`: the driver casts per movie (`kit.js` has the seated figure builder); `js/showcase.js`: the 3D select stage, portraits and podium; `js/gallery.js`: a developer line-up view
- `js/effects.js`, `js/audio.js`, `js/hud.js`, `js/input.js`: particles, sound, HUD and input devices

For development, `?quick=<map id>` (city, meadow, pirate, candy, jungle, frost, factory, lava, space, jurassic, starwars, marvel, jjk) goes
straight into a race. Add `&players=2` to test split-screen, and `&chars=1` (or
`&driver=<driver id>`) to race with movie-character drivers. `?gallery=<movie id
| driver id | all>` lines drivers up in their karts; add `&pose=cheer` (taunt,
ouch, trick, win, lose, glide, look…) to hold a gesture.
