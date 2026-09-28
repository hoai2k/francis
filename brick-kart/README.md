# Brick Kart

A Mario Kart-style kart racer where the karts, drivers and maps are all built
from LEGO-style bricks. It runs in the browser with Three.js (r186) loaded from
a CDN and has no build step. Music and sound effects are made in code with
WebAudio.

Play: <https://hoai2k.github.io/francis/brick-kart/>

## Modes

- **Grand Prix**: the Brick Cup, all 5 maps in a row. Points go 15-12-10-8-6-4-2-1,
  and the cup ends with an award ceremony.
- **Quick Race**: one race on any map, against 7 CPU racers.
- **Time Trial**: race alone with 3 Turbo Studs. Your best time on each map is
  saved in your browser.
- **Options**: engine class (50/100/150/200cc), CPU difficulty, laps,
  auto-accelerate, music and sound volume, and graphics quality.

## Maps

| Map | What's there |
| --- | --- |
| Brick City Circuit | Figure-8 with an overpass, skyscrapers, grandstands, a blimp and a crane |
| Pirate Cove | Sunset island, wooden docks over the water, a cliff jump, a galleon and a lighthouse |
| Lava Castle | Hairpins up a volcano, through a castle, then across a lava bridge with no rails |
| Frosty Peaks | Mountain pass with a summit ramp, a frozen lake (slippery!), a ski lift and snowmen |
| Rainbow Bricks | A glowing road in space with studded planets, a minifig-head moon and edges you can fall off |

## Racers

8 minifig drivers. Each has different speed, acceleration, handling and
weight: Brick Bob, Astro Ava, Cap'n Redbeard, Sir Kara, Robo-Rex, Ninja Nix,
Chief Flo and Wizard Wendel.

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
- `js/tracks.js`: the five map definitions and their scenery
- `js/world.js`, `js/decor.js`, `js/lego.js`: sky, ground, lighting, brick-built props and the brick mesh merger
- `js/characters.js`: minifig drivers and karts
- `js/effects.js`, `js/audio.js`, `js/hud.js`, `js/input.js`: particles, sound, HUD and input devices

For development, `?quick=<map id>` (city, pirate, lava, frost, space) goes
straight into a race. Add `&players=2` to test split-screen.
