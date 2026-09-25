# Cursed Dungeons

A 3D action dungeon crawler in the style of Minecraft Dungeons, with a
Jujutsu Kaisen theme: blocky sorcerers, cursed techniques, graded curses and
Domain Expansions. It runs in the browser with Three.js (r186) loaded from a
CDN and has no build step. The **WebGPU** renderer is used where available,
with an automatic **WebGL2** fallback.

Play: <https://hoai2k.github.io/francis/cursed-dungeons/>

**Status:** in development, built in stages. Stage 1 (renderer, quality
auto-detection, camera and a detailed test shrine) is live; combat,
sorcerers, enemies, levels and loot come next.

## Controls

| Action | Keyboard + mouse | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | Left stick | Left virtual joystick |
| Aim | Mouse | Right stick | Auto-aim at the nearest curse |
| Melee combo | Left click | A | Attack button |
| Ranged / technique | Right click | RT | ✦ button |
| Dodge roll (i-frames) | Space / Shift | B | Dodge button |
| Techniques 1 / 2 / 3 | 1 / 2 / 3 | LB / RB / Y | Technique buttons |
| Domain Expansion | F | LT | Domain button (when the CE bar is full) |
| Reverse Cursed Technique (heal) | Q | D-pad ↑ | ✚ button |
| Interact | E | X | Tap the prompt |
| Map | Tab | View | — |
| Pause | Esc | Menu | ❚❚ |
| Zoom | Mouse wheel | — | Pinch |
| Rotate camera 90° (enable in settings) | Z / C | — | — |

Press **F3** to toggle the corner readout (quality mode, backend, FPS, render scale).

## Graphics

At start-up the game detects your GPU (WebGPU adapter info and the WebGL
renderer string), picks a quality tier, and lets you change it under
**Settings → Graphics**.

- **Ultra · Ray Traced** (WebGPU and a strong GPU): screen-space global
  illumination, so coloured light from cursed energy, lava and torches
  bounces onto nearby surfaces. It also has screen-space reflections on
  water, wet streets and polished stone (a reflection probe is the
  fallback), VSM soft shadows, 48 pooled dynamic lights, temporal AA with
  sharpening, depth of field in cutscenes, and optional motion blur.
- **High**: soft PCF shadows, GTAO, bloom, SSR on water, fake volumetric
  light shafts and 16 dynamic lights.
- **Medium**: simple shadows, bloom, fog and fewer particles.
- **Low / Mobile**: baked vertex lighting, light bloom only, lower render
  resolution and fewer enemies.

Every tier uses AgX tone mapping, a colour grade per biome and a vignette.
With **dynamic resolution** on, the render scale drops to hold 60 FPS on
desktop (30 on mobile) before any effect is cut.

## Tech notes

- Block textures are 16×16 pixel art painted procedurally at start-up, each
  with a matching bevelled normal map. The voxel world is meshed in 16³
  chunks with per-vertex ambient occlusion and baked coloured light.
- Walls between the camera and any player dissolve with a dithered
  cut-away, and roofs fade out when you step inside.
- The GPU particle pool integrates each particle's motion in the vertex
  shader, so the CPU only writes a particle once, when it spawns.
- Characters use Minecraft-style 64×64 skins painted in code, with a
  procedural animation rig and spring physics for capes and hair.

## Files

- `index.html`: entry point and import map
- `style.css`: UI styling
- `js/main.js`: boot, game states and the main loop
- `js/gfx/`: renderer and quality tiers, materials, textures, particles, effects, lights
- `js/world/`: voxel world, blocks, biomes, building kit, level generation
- `js/entities/`: characters, player, enemies, bosses
- `js/sorcerers/`: the playable techniques
- `js/ui/`: menus, HUD and settings
