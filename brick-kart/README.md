# Brick Kart

A Mario Kart-style kart racer where the karts, drivers and maps are all built
from LEGO-style bricks. It runs in the browser with Three.js (r186) loaded from
a CDN and has no build step. Music and sound effects are made in code with
WebAudio.

Play: <https://hoai2k.github.io/francis/brick-kart/>

## Modes

- **Grand Prix**: pick a cup of 3 maps (or the All-Star Cup with all 9).
  Points go 15-12-10-9-8-7-6-5-4-3-2-1, and each cup ends with an award
  ceremony.
- **Quick Race**: one race on any map. By default there are **13 racers**
  (you plus CPU racers). You can change the number in Options.
- **Time Trial**: race alone with 3 Turbo Studs. Your best time on each map is
  saved in your browser.
- **Options**: engine class (50/100/150/200cc), CPU difficulty, racers per race
  (4/8/10/13/16), laps, auto-accelerate, music and sound volume, and graphics
  quality.

## Maps (9, in 3 cups)

Tracks are wide and banked, with open grass, fences, scenery right next to
the road, and hazards to dodge. Four of them have **glider ramps**: drive onto
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

## Racers

16 minifig drivers, each with different speed, acceleration, handling and
weight: Brick Bob, Astro Ava, Cap'n Redbeard, Sir Kara, Robo-Rex, Ninja Nix,
Chief Flo, Wizard Wendel, Chef Pepper, Cowgirl Cassie, Viking Bjorn, Queen
Regina, Skater Sam, Zorp the Alien, Mummy Max and Dino Dina.

## Power-ups

Drive through the rainbow **?** bricks to get an item.

- **Turbo Stud** / **Triple Turbo**: a speed boost (or three).
- **Homing Rocket**: chases the racer in front of you.
- **Bouncer Brick**: fires straight and bounces off walls. Hold back to fire it behind you.
- **Stray Bricks**: drops a pile of loose bricks. Anyone who drives over it spins out.
- **Brick Shield**: blocks the next hit.
- **Golden Brick**: makes you invincible and faster for a few seconds.
- **Brick Storm**: bricks rain down on the racers ahead of you.

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
- **Gliding**: steer while you fly. You land wherever the road is below you.

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
- `js/characters.js`: minifig drivers and karts
- `js/effects.js`, `js/audio.js`, `js/hud.js`, `js/input.js`: particles, sound, HUD and input devices

For development, `?quick=<map id>` (city, meadow, pirate, candy, jungle, frost, factory, lava, space) goes
straight into a race. Add `&players=2` to test split-screen.
