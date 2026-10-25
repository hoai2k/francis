# Terra Realis

An ultra-realistic **256× PBR texture pack** and a **shader pack** for Minecraft
Java Edition, plus a web page with a live WebGL2 preview of both and download buttons.

Live: https://hoai2k.github.io/francis/terra-realis/

## What's in it

- `pack/`: the resource pack (50 blocks). Every texture has LabPBR 1.3 maps:
  `_n` (normal, AO, height, with relief depth scaled per material) and `_s` (smoothness, F0/metal id, porosity/SSS, emission).
  Animated water and lava, a soft sun sprite, and a pack icon.
- `shaderpack/`: the shader pack for Iris or OptiFine. It has soft PCF shadows, an
  analytic sky with sunsets, parallax occlusion mapping with self-shadowing (surfaces have
  real depth: sunken mortar, gaps between cobbles, bark furrows), PBR lighting from the pack's maps (GGX specular, real metals,
  subsurface scattering on foliage, emissive blocks), waving plants and leaves, wavy water
  with depth absorption, screen-space reflections, god rays, wet surfaces in rain, fog,
  bloom and ACES tonemapping. It covers the Overworld, Nether and End, with LOW to ULTRA
  profiles and sliders in the shader options.
- `index.html` / `app.js`: the preview page. It renders a small diorama with the pack's
  textures and a port of the shader's lighting, and it zips `pack/` or `shaderpack/` in the
  browser when you click download (`manifest.json` lists the files).

## Install

1. Texture pack: put `Terra-Realis-256x.zip` in `.minecraft/resourcepacks` and enable it.
2. Shaders: install Iris or OptiFine, put `Terra-Realis-Shaders.zip` in
   `.minecraft/shaderpacks` and select it.

## Preview controls

Drag to orbit, scroll or pinch to zoom. Use the time slider to change the time of day.
The toggles switch the shaders, PBR maps, rain and auto-orbit. Turning **Shaders** off
shows a vanilla-style look for comparison.

## Rebuilding

The textures are procedural; nothing is copied from Mojang or taken from photos.

```sh
python3 tools/make_pack.py             # regenerate pack/ (needs numpy + Pillow; --res 512 for 512x)
python3 tools/make_shader_wrappers.py  # regenerate per-program wrapper files
python3 tools/check_shaders.py         # compile every shader program (needs glslangValidator)
python3 tools/make_manifest.py         # refresh manifest.json after either change
```
