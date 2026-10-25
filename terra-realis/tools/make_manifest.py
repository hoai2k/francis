#!/usr/bin/env python3
"""List the files of pack/ and shaderpack/ in manifest.json.

The web page reads it to zip each pack in the browser for download, and to
find the textures for the live preview. Run after make_pack.py or after
editing the shader pack.
"""

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent


def files(root):
    return sorted(str(p.relative_to(root)).replace("\\", "/") for p in root.rglob("*") if p.is_file())


def main():
    pack = files(HERE / "pack")
    blocks = sorted({Path(f).stem for f in pack
                     if f.startswith("assets/minecraft/textures/block/") and f.endswith(".png")
                     and not f.endswith(("_n.png", "_s.png"))})
    manifest = {"pack": pack, "shaderpack": files(HERE / "shaderpack"), "blocks": blocks}
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"manifest: {len(pack)} pack files, {len(manifest['shaderpack'])} shader files, {len(blocks)} block textures")


if __name__ == "__main__":
    main()
