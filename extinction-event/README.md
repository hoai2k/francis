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

- `/extinction start` drops the asteroid `impactDistance` blocks (default 220) from you, in a random direction.
- `/extinction start <x> <z>` aims it at a column.
- Or craft a **Celestial Lure** (diamond in the middle, fire charges on the sides, crying obsidian in the corners) and
  use it: the asteroid lands where you are looking. Single use, no going back.
- Or set `autoStartDay` in the config so it happens on its own on that in-game day.

Other commands (operators): `/extinction stop`, `/extinction skip`, `/extinction phase <warning|impact|firestorm|volcanism|winter|recovery>`,
`/extinction status`, `/extinction reload` (reloads `spawns.json`).

## The timeline

| Phase | Default | What happens |
|---|---|---|
| **Warning** | 4 min | A new star grows in the sky and gets a tail. Chat narration, a countdown, animals stampede away, tremors start, heartbeats in the last seconds. |
| **Impact** | 75 s | The asteroid streaks in trailing fire and smoke, the sky brightens, then a white flash. A fireball and a 600-block mushroom plume rise, a curtain of molten ejecta arcs out, a peak-ring crater with an impact-melt lava pool and a breccia rim is dug, and a dust-wall shockwave races out at 32 blocks a second, flattening trees, shattering glass, hurling blocks and creatures. Ground shaking reaches you before the sonic boom. |
| **Firestorm** | 4 min | Burning ejecta meteors rain down and explode, wildfires start everywhere, the sky glows red and sets exposed creatures alight. The **megatsunami**, a moving wall of real water, rolls over low ground and then drains away. |
| **Deccan Traps** | 4 min | Volcanoes rise out of the ground near players and erupt again and again: lava down their flanks, volcanic bombs, ash columns with lightning. Fissures tear open with lava below, ash piles up in layers, and acid rain kills leaves and grass, rusts copper and burns anyone without a helmet. |
| **Impact winter** | 6 min | The sun is gone. Darkness, snow in the tropics, frozen lakes, plants die. Players freeze outside unless they are near fire or wear leather. Creatures listed as extinct starve and die off. |
| **Recovery** | 4 min | The ash clears, rain washes it away, and the **fern spike** covers the ground. Survivors (birds, mammals, crocodilians, turtles, nautiluses, coelacanths...) appear. Fossils form: the iridium-rich **K-Pg boundary clay** layer a few blocks down, fossil veins, and a fossil wherever an extinct creature died. |
| **66 Million Years Later** | | The Age of Mammals. Extinct creatures no longer spawn naturally, but science can still bring them back. |

The land changes biome as it goes (Scorched Lands → Ash Wastes → Frozen Ashlands → Fern Spike, with an Impact Crater
biome in the crater), with their own sky, fog, water and grass colours. Music changes with each phase (boss music for
the impact).

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

`config/extinction-common.toml`: phase lengths, impact distance, crater size, shockwave reach and damage, tsunami
height, ejecta rate, number of volcanoes, and switches for terrain destruction (off = a visual-only apocalypse),
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
`spawn/` reads `spawns.json` and drives the creatures; `client/` draws the sky, asteroid, plume, flash, letterbox, title
cards and handles fog, camera shake, ambience and music.

Independent fan project. Not affiliated with Mojang, Microsoft or the Fossils and Archeology team.
