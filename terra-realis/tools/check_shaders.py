#!/usr/bin/env python3
"""Compile-check every shader program with glslangValidator.

Inlines the OptiFine/Iris-style absolute #include directives, then compiles
each wrapper as GLSL 1.20 (compatibility profile, like the game does).
Usage: python3 tools/check_shaders.py   (needs glslangValidator on PATH)
"""

import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "shaderpack" / "shaders"
INC = re.compile(r'^\s*#include\s+"([^"]+)"', re.M)


def expand(text, seen=()):
    def repl(m):
        path = ROOT / m.group(1).lstrip("/")
        if path in seen:
            return ""
        return expand(path.read_text(), seen + (path,))
    return INC.sub(repl, text)


def main():
    failed = 0
    files = sorted(p for p in ROOT.rglob("*.[vf]sh") if p.parent.name != "program")
    with tempfile.TemporaryDirectory() as tmp:
        for f in files:
            stage = "vert" if f.suffix == ".vsh" else "frag"
            src = Path(tmp) / f"x.{stage}"
            src.write_text(expand(f.read_text()))
            r = subprocess.run(["glslangValidator", "-S", stage, str(src)], capture_output=True, text=True)
            if r.returncode != 0:
                failed += 1
                print(f"FAIL {f.relative_to(ROOT)}\n{r.stdout}{r.stderr}")
    print(f"{len(files) - failed}/{len(files)} programs compile")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
