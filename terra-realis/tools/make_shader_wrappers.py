#!/usr/bin/env python3
"""Write the per-program wrapper files of the shader pack.

OptiFine and Iris look up each program (gbuffers_terrain.vsh, ...) by name in
shaders/ and, per dimension, in shaders/world-1 (Nether) and shaders/world1
(End). Each wrapper only sets #defines and includes the shared source from
shaders/program/, so the real code lives in one place.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "shaderpack" / "shaders"

# program name -> (source base name or (vsh, fsh) pair, defines)
PROGRAMS = {
    "shadow": ("shadow", []),
    "gbuffers_basic": ("basic", []),
    "gbuffers_textured": ("textured", []),
    "gbuffers_textured_lit": ("textured", []),
    "gbuffers_weather": ("textured", ["WEATHER"]),
    "gbuffers_spidereyes": ("textured", ["UNLIT"]),
    "gbuffers_beaconbeam": ("textured", ["UNLIT"]),
    "gbuffers_armor_glint": ("textured", ["UNLIT"]),
    "gbuffers_skybasic": ("sky", []),
    "gbuffers_skytextured": ("skytextured", []),
    "gbuffers_clouds": ("clouds", []),
    "gbuffers_terrain": ("lit", ["TERRAIN"]),
    "gbuffers_block": ("lit", ["BLOCK"]),
    "gbuffers_entities": ("lit", ["ENTITIES"]),
    "gbuffers_hand": ("lit", ["HAND"]),
    "gbuffers_water": ("water", []),
    "gbuffers_hand_water": ("water", []),
    "composite": (("fullscreen", "composite"), []),
    "final": (("fullscreen", "final"), []),
}

WORLDS = {"": [], "world-1": ["NETHER"], "world1": ["END"]}


def main():
    for folder, world_defs in WORLDS.items():
        out = ROOT / folder if folder else ROOT
        out.mkdir(parents=True, exist_ok=True)
        for prog, (src, defs) in PROGRAMS.items():
            vsrc, fsrc = (src, src) if isinstance(src, str) else src
            for ext, s in (("vsh", vsrc), ("fsh", fsrc)):
                lines = ["#version 120"]
                lines += [f"#define {d}" for d in world_defs + defs]
                lines.append(f'#include "/program/{s}.{ext}"')
                (out / f"{prog}.{ext}").write_text("\n".join(lines) + "\n")
    print(f"wrote {len(PROGRAMS) * 2 * len(WORLDS)} wrapper files")


if __name__ == "__main__":
    main()
