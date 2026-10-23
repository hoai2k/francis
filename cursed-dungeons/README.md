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

- **Play** on the title screen rolls your **cursed technique** at random (35 of
  them, from Common to Special Grade). Extra players drop in with **A** /
  **Start** on a controller and roll their own.
- You start at **Jujutsu High**, in an **open world** of nine regions joined into
  one map with no loading screens: walk anywhere, or fast travel between the
  blue Window stations. **Tab** opens the world map, **J** the quest log.
- **Story chapters** play out in the world: a curtain drops over a district,
  you clear its objective and fight its **Special Grade boss**. Side quests,
  the Culling Game colonies, cursed lairs and roaming curses fill the rest.
- Level up to earn points for the **technique tree** (abilities, passives,
  Reverse Cursed Technique, your Domain Expansion or ultimate) and choose what
  sits in your four slots in the **loadout**. Chests drop gear with enchantments.
- Progress **saves automatically**; **Save Code** moves it to another device.

The full guide is in [docs/guide.md](docs/guide.md), and every technique, its
rarity and its Domain or ultimate are in [docs/techniques.md](docs/techniques.md).

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

Up to **8 players** can share one world over the internet, and every screen can
bring its own local players: **Pause → 🌐 Host this world online**, and the
others join from **Online** on the title screen. The world lives on the host's
screen; nothing pauses online. `?online=0` in the address turns online play off.
Details, limits and how it works: [docs/online.md](docs/online.md).

## Graphics

WebGPU where available (WebGL2 otherwise), with quality tiers from Low / Mobile
up to Ultra · Ray Traced (screen-space GI and reflections, soft shadows, TAA),
dynamic resolution, and a path-traced **Photo Mode**. More in
[docs/tech.md](docs/tech.md), along with notes on the voxel world, the seamless
regions, particles, domains, bosses and sound.

## Development

No build step: serve the repository root (`python3 -m http.server`) and open
`/cursed-dungeons/`. Before committing, run the smoke test:

```sh
node cursed-dungeons/tests/smoke.mjs                # everything, about 1.5 minutes
node cursed-dungeons/tests/smoke.mjs --only gojo,toji
```

It boots the game in headless Chromium (`?norender`, so no GPU is needed) with a
seeded `Math.random` and timers on a virtual clock, then fights every curse
kind (every enemy attack must fire), uses every ability and the Domain /
Ultimate of all 35 techniques, and spawns every boss. It fails on any page
error or `console.error`. It needs Playwright (`npm i -g playwright`) and its
Chromium. `--trace out.json` writes a hash of the game state per section: the
same code always gives the same hashes, so a refactor that should change
nothing can be checked by comparing two traces.

Conventions worth knowing:

- **Techniques** (`js/sorcerers/<id>.js`) extend `Kit` (`js/sorcerers/kit.js`),
  whose header lists the helpers. Pick curses with `living`, `inDomain`,
  `near`, `targetsNear`, `nearest` and `best` rather than looping over
  `game.enemies`, and sequence effects with `this.after(seconds, fn)` (game
  time: it waits through pauses), never `setTimeout`.
- **Curse attacks** are entries in `js/entities/enemyAttacks.js` (spec, start,
  wind-up, release, active phase); `js/entities/enemy.js` runs them and holds
  the archetype AIs.
- **Particles**: `pool.spawn({ x, y, z, vx, vy, vz, life, r, g, b, size, ... })`
  or `particles.burst(pos, { ... })` (`js/gfx/particles.js`).
- **Bosses**: one file per boss in `js/entities/bosses/`, run by
  `js/entities/bosses.js`.

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
- `js/entities/`: characters, player, curses (`enemy.js`, attacks in `enemyAttacks.js`, looks in `curse-looks.js`), bosses, allies
- `js/sorcerers/`: the technique registry (`index.js`, rarities and the unlock tree), the `Kit` base class (`kit.js`) and one file per technique; `all.js` imports them all
- `js/ui/`: menus, HUD, minimap, world map, quest log, tracker, touch controls, settings
- `js/combat.js`, `js/domain.js`, `js/mission.js`, `js/loot.js`, `js/save.js`, `js/audio.js`, `js/photo.js`
- `js/online/`: online play, loaded on first use: `session.js` (relay connection, reconnects, clocks, validation), `net.js` (the game session: presence, events, who owns what, following the host's world), `remote.js` (other screens' players as figures, the host's curses as puppets, name tags), `lobby.js` (the Online screen, joining, names and the on-screen keyboard)
- `js/vendor/mini-rooms.js`: the relay's browser client (verbatim copy)
- `tests/smoke.mjs`: the headless smoke test
- `docs/`: the player guide, techniques, online play, graphics and tech notes
