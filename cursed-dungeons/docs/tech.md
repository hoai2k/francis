# Cursed Dungeons: graphics and tech notes

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
