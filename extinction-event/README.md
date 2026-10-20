# ☄ Extinction Event

A **Minecraft Forge 1.20.1** mod that simulates the end-Cretaceous (K-Pg) mass extinction, 66 million years ago, in your
own world. It is built to feel like the world is ending: a new star that grows night after night, an asteroid that
streaks down, a white-out flash, a shockwave that flattens forests, a megatsunami, a sky on fire, volcanoes rising out
of the ground, then years of darkness and snow until ferns take over a world without dinosaurs.

It works on its own, and it is designed to go with **[Fossils and Archeology Revival](https://modrinth.com/mod/fossils-and-archeology-revival)**:
real F&A dinosaurs stampede away from the impact, starve in the impact winter, turn into fossils where they die,
and can be brought back afterwards with F&A's analyzer and culture vat.

Page: **https://hoai2k.github.io/francis/extinction-event/** · Jar: [`download/extinction-1.20.1-1.0.0.jar`](download/extinction-1.20.1-1.0.0.jar)

## Install

1. Install Minecraft **1.20.1** with **Forge 47.x** (47.4.0 or newer).
2. Put `extinction-1.20.1-1.0.0.jar` in the `mods/` folder of the game (and of the server, for multiplayer:
   every player needs it too, since it adds blocks and items).
3. Optional: add Fossils and Archeology Revival (Forge 1.20.1) and its dependencies (Architectury API, GeckoLib,
   TerraBlender, More Hitboxes).

## Starting the end of the world

- `/extinction start` drops the asteroid `impactDistance` blocks (default 260) from you, in a random direction.
- `/extinction start <x> <z>` aims it at a column.
- Or craft a **Celestial Lure** (diamond in the middle, fire charges on the sides, crying obsidian in the corners) and
  use it: the asteroid lands where you are looking. Single use, no going back.
- Or set `autoStartDay` in the config so it happens on its own on that in-game day (`autoStartEvent` picks which one:
  `asteroid`, `random`, or any event below).

Other commands (operators): `/extinction event <name> [x z]`, `/extinction events`, `/extinction random`, `/extinction stop`, `/extinction skip`, `/extinction phase <warning|impact|firestorm|volcanism|winter|recovery>`,
`/extinction status`, `/extinction reload` (reloads `spawns.json`).

## The timeline

| Phase | Default | What happens |
|---|---|---|
| **Warning** | 4 min | A new star grows in the sky and gets a tail. Chat narration, a countdown, animals stampede away, tremors start, heartbeats in the last seconds. |
| **Impact** | 75 s | A giant red countdown, then the asteroid streaks in trailing fire and smoke, the sky brightens, and everything goes white. Shafts of light blast across the sky, a pillar of fire punches into space, a fireball and a 600-block mushroom plume rise, and a curtain of molten ejecta arcs out and rains down as real burning meteors. The **thermal flash** sets everything that can see the fireball on fire. A 160-block peak-ring crater with an impact-melt lava pool is torn open, cracks rip outward from its rim, and a dust-wall shockwave races out at 32 blocks a second: it strips the topsoil, flattens forests and stone buildings, sets the land ablaze, hurls blocks and creatures, and concusses survivors. Out in the open near the crater it is lethal. Get underground. |
| **Firestorm** | 4 min | Burning ejecta meteors rain down and explode, wildfires start everywhere, the sky glows red and sets exposed creatures alight. The **megatsunami** comes as a train of three waves (the first 48 blocks high): walls of real water with foaming crests you can see coming from far away, smashing trees and houses into floating wreckage, sweeping creatures inland, then draining away. |
| **Deccan Traps** | 4 min | Volcanoes 50-80 blocks tall rise out of the ground near players and tear themselves apart: Plinian blasts, lava fountains, volcanic bombs that leave lava where they land, flank fissures pouring lava downhill, ash columns a thousand blocks high full of lightning, and **pyroclastic flows** that race down the mountain and burn and bury everything in their path. Ash piles up in layers around them, fissures tear open, and acid rain kills leaves and grass, rusts copper and burns anyone without a helmet. |
| **Impact winter** | 6 min | The sun is gone. Darkness, snow in the tropics, frozen lakes, plants die. Players freeze outside unless they are near fire or wear leather. Creatures listed as extinct starve and die off. |
| **Recovery** | 4 min | The ash clears, rain washes it away, and the **fern spike** covers the ground. Survivors (birds, mammals, crocodilians, turtles, nautiluses, coelacanths...) appear. Fossils form: the iridium-rich **K-Pg boundary clay** layer a few blocks down, fossil veins, and a fossil wherever an extinct creature died. |
| **66 Million Years Later** | | The Age of Mammals. Extinct creatures no longer spawn naturally, but science can still bring them back. |

The land changes biome as it goes (Scorched Lands → Ash Wastes → Frozen Ashlands → Fern Spike, with an Impact Crater
biome in the crater), with their own sky, fog, water and grass colours. Music changes with each phase (boss music for
the impact).

## Ten more ways to end the world

Start any of them with `/extinction event <name> [x z]` (aimed at a column, or `impactDistance` blocks from you), see
the list with `/extinction events`, or roll the dice with `/extinction random`. Each one runs as acts with their own
title cards, sky, fog, biome, music, weather, tremors and die-off; `/extinction skip` moves to the next act.

| Event | What happens |
|---|---|
| **The Great Dying** (`great_dying`) | The end-Permian, the worst extinction ever. The Siberian Traps: fissures that brim over and pour lava across the land and volcanoes rising along them, then a volcanic winter with acid rain, then Hothouse Earth (lethal heat, rivers boil away, the land dries to sand and burns), then the oceans suffocate: poisoned water, dead reefs, toxic gas in the lowlands. |
| **Snowball Earth** (`snowball_earth`) | Ice to the equator. Seas freeze over and then freeze solid, an ice sheet buries the land up to nine blocks deep, forests die under it, endless blizzards with whiteout fog and wind that shoves you around, and you freeze to death without a fire. |
| **Yellowstone Supereruption** (`supervolcano`) | The ground swells and steams and cracks, then the caldera blows: a blast that flattens everything for 750 blocks, a 1400-block eruption column, a caldera with a lava lake, four new vents erupting around it, ejecta raining down, then pyroclastic flows rolling out hundreds of blocks again and again, burying the land in ash, and a volcanic winter. |
| **Gamma-Ray Burst** (`gamma_ray_burst`) | A dying star's flash irradiates everything under the sky, then the ozone is gone: the sun burns any creature in daylight and kills the plants, until nitrogen dioxide turns the sky brown and cold. |
| **Solar Superflare** (`solar_superflare`) | The Sun swells and flares, the aurora fills the sky, a magnetic storm fills it with lightning, then the day side of the world catches fire and its water boils away. |
| **The Great Deluge** (`great_deluge`) | Rain that never stops, a hypercane with gale-force wind, waterspouts and storm surges, then the sea rises over the land (34 blocks by default, `floodHeight`) and finally recedes. |
| **Super Outbreak** (`tornado_outbreak`) | A green sky and giant hail, then a swarm of EF5 tornadoes that rip up trees, houses and topsoil and fling them around their funnels, then one mile-wide monster heading straight for you. |
| **Comet Swarm** (`comet_swarm`) | Shooting stars become fireballs, the fireballs explode in the air like Tunguska and lay the forests flat in circles, the big pieces hit the ground and leave craters, then a sudden ice age. |
| **The Great Rift** (`great_rift`) | Foreshocks, then a megaquake that does not stop: chasms hundreds of blocks long and up to 90 deep tear open right past you with lava at the bottom, volcanoes open along the rift, and then the sea pours in as a tsunami. |
| **The Shattered Moon** (`shattered_moon`) | The Moon cracks, glows and breaks apart, its pieces spread into a ring across the sky and then fall: lunar fragments slam into the ground everywhere with craters and blast rings, and without the Moon the tides go wild with floods and tsunamis. |

Events that kill off life use the same `extinct` list from `spawns.json`, and creatures that die become fossils just
like in the asteroid event. `eventLengthScale` in the config stretches or shortens all their acts.

## Custom spawns (and Fossils and Archeology)

Dinosaurs **spawn naturally** around players before the event (every 30 seconds, up to 8 near each player), so the
world is full of herds until the asteroid comes. After the event, only survivors spawn. Turn it off with
`naturalSpawns = false` in the config.

All spawns live in **`config/extinction/spawns.json`**, written with defaults the first time the game runs. Edit it and
run `/extinction reload`. Entries for mods that aren't installed are skipped, so the same file works with or without F&A.

```json
{ "entity": "fossil:triceratops", "phases": ["before", "warning", "impact"], "weight": 14, "group": [2, 4], "max_nearby": 6 }
```

| Field | Meaning |
|---|---|
| `entity` | Any entity id, from any mod (`fossil:tyrannosaurus`, `minecraft:rabbit`, ...) |
| `phases` | `before` (natural spawning until the event), `warning`, `impact`, `firestorm`, `volcanism`, `winter`, `recovery`, `after` (natural spawning once it is over), or `"all"` (the six event phases) |
| `weight`, `group`, `chance` | How often it is picked, how many come together, chance the group actually spawns |
| `environment` | `land`, `water` or `air` |
| `flee` | Runs away from the impact during the impact and firestorm (default `true`) |
| `max_nearby` | Cap on how many of that creature are within 64 blocks |
| `nbt` | Optional SNBT merged into the entity |
| `biomes` | Optional biome ids or `#tags` it is limited to |

The same file also sets:

- `extinct`: which creatures die off in the impact winter, get fossilised where they die, and stop spawning naturally
  afterwards. Patterns: exact id, `namespace:*`, `#tag` or `*`. Default `fossil:*`.
- `survivors`: exceptions to `extinct`, by default the F&A creatures that are real K-Pg survivors or post-date it.
- `fossils`: which block a dead creature becomes (default `fossil:fossil_stone`, falling back to bone blocks).
- `settings`: `natural_interval_seconds` and `natural_max_per_player` for natural spawning, `spawn_interval_seconds`
  and `max_per_player` during the event.
- `deposits`: fossil veins laid into the rock during recovery, as host block → fossil block maps
  (stone → `fossil:fossil_stone`, deepslate → `fossil:fossil_deepslate`, sandstone → `fossil:fossil_sandstone`, amber ore, permafrost...).

The default F&A line-up uses Late Cretaceous species: Triceratops, Ankylosaurus, Pachycephalosaurus, Parasaurolophus,
Gallimimus, Therizinosaurus, Velociraptor, Tyrannosaurus, Quetzalcoatlus, Pteranodon, Mosasaurus and Plesiosaurus.

## New blocks and items

Volcanic Ash (layers and block), Scorched Earth, Impact Breccia (drops shocked quartz and tektites), K-Pg Boundary
Clay (drops clay and iridium nuggets), and the Celestial Lure. Tektites smelt into tinted glass.

## Config

`config/extinction-common.toml`: phase lengths, `eventLengthScale` for the other events, impact distance, crater
size, shockwave reach and damage, tsunami height, deluge `floodHeight`, ejecta rate, number of volcanoes, and switches for terrain destruction (off = a visual-only apocalypse),
biome changes, player hazards, the mass extinction, natural spawning and music. `blockBudgetPerTick` and `effectRadius` trade spectacle
for performance. Camera shake follows the vanilla *Distortion Effects* accessibility slider.

## Building from source

Java 17+ and the included Gradle wrapper:

```sh
./gradlew build                       # jar in build/libs/
./gradlew runClient                   # test in a dev client
./gradlew runClient -PwithFossils     # same, with Fossils and Archeology and its libraries pulled from Modrinth
./gradlew runClient -PquickPlay=test  # open the singleplayer world "test" straight away
```

Source layout (`src/main/java/com/hoai2k/extinction/`): `ExtinctionManager` runs the timeline; `world/` holds the
disasters (crater, shockwave, tsunami, firestorm, earthquakes, volcanoes, atmosphere, biome shifts, fossil layers);
`event/` holds the ten other catastrophes, each a list of acts built from the same disaster pieces
(plus `Hazards`, `Deluge` and `Tornado`); `spawn/` reads `spawns.json` and drives the creatures; `client/` draws the sky, asteroid, plume, flash, letterbox, title
cards and handles fog, camera shake, ambience and music.

Independent fan project. Not affiliated with Mojang, Microsoft or the Fossils and Archeology team.
