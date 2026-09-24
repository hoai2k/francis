#!/usr/bin/env python3
"""Assemble the GitHub Pages site into _site/.

Every top-level subdirectory that is not hidden or ignored below is treated
as a project (game or app) and published at /<repo>/<subdirectory>/.

- Static projects: the directory is copied as-is and must contain index.html.
- Projects with a package.json that defines a "build" script: dependencies are
  installed, `npm run build` runs, and the build output (dist/, build/ or out/)
  is published instead.

A root index.html linking to every project is generated automatically. A
project can set its display name and blurb in an optional project.json:
    {"title": "Snake", "description": "Classic snake game."}
otherwise the <title> from its index.html (or the directory name) is used.
"""

import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "_site"
IGNORED = {"tools", "node_modules", "_site"}
BUILD_OUTPUT_DIRS = ("dist", "build", "out")


def project_dirs():
    for path in sorted(ROOT.iterdir()):
        if path.is_dir() and not path.name.startswith((".", "_")) and path.name not in IGNORED:
            yield path


def build_project(src: Path) -> Path:
    """Return the directory whose contents should be published for src."""
    pkg_file = src / "package.json"
    if not pkg_file.exists():
        return src
    scripts = json.loads(pkg_file.read_text()).get("scripts", {})
    if "build" not in scripts:
        return src
    install = ["npm", "ci"] if (src / "package-lock.json").exists() else ["npm", "install"]
    subprocess.run(install, cwd=src, check=True)
    subprocess.run(["npm", "run", "build"], cwd=src, check=True)
    for name in BUILD_OUTPUT_DIRS:
        if (src / name / "index.html").exists():
            return src / name
    sys.exit(f"{src.name}: build finished but no {'/'.join(BUILD_OUTPUT_DIRS)}/index.html found")


def project_meta(src: Path, published: Path):
    meta = {}
    meta_file = src / "project.json"
    if meta_file.exists():
        meta = json.loads(meta_file.read_text())
    if "title" not in meta:
        match = re.search(r"<title>(.*?)</title>", (published / "index.html").read_text(errors="ignore"), re.I | re.S)
        meta["title"] = match.group(1).strip() if match else src.name
    meta.setdefault("description", "")
    return meta


def render_index(projects):
    if projects:
        items = "\n".join(
            f'      <li><a href="./{html.escape(name)}/"><strong>{html.escape(m["title"])}</strong></a>'
            + (f'<span>{html.escape(m["description"])}</span>' if m["description"] else "")
            + "</li>"
            for name, m in projects
        )
        body = f"    <ul>\n{items}\n    </ul>"
    else:
        body = "    <p>No projects yet.</p>"
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Francis — Games &amp; Apps</title>
  <style>
    :root {{ color-scheme: light dark; --bg: #fafafa; --fg: #1a1a1a; --muted: #666; --card: #fff; --line: #ddd; --accent: #2563eb; }}
    @media (prefers-color-scheme: dark) {{ :root {{ --bg: #111; --fg: #eee; --muted: #999; --card: #1b1b1b; --line: #333; --accent: #60a5fa; }} }}
    body {{ margin: 0; font: 16px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--fg); }}
    main {{ max-width: 720px; margin: 0 auto; padding: 32px 16px; }}
    h1 {{ margin: 0 0 24px; }}
    ul {{ list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }}
    li a {{ display: block; padding: 16px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; color: var(--accent); text-decoration: none; }}
    li a:hover {{ border-color: var(--accent); }}
    li span {{ display: block; margin: 4px 16px 0; color: var(--muted); font-size: 14px; }}
  </style>
</head>
<body>
  <main>
    <h1>Games &amp; Apps</h1>
{body}
  </main>
</body>
</html>
"""


def main():
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()
    (SITE / ".nojekyll").touch()

    projects = []
    for src in project_dirs():
        published = build_project(src)
        if not (published / "index.html").exists():
            print(f"skipping {src.name}: no index.html", file=sys.stderr)
            continue
        shutil.copytree(
            published,
            SITE / src.name,
            ignore=shutil.ignore_patterns("node_modules", ".*"),
        )
        projects.append((src.name, project_meta(src, published)))
        print(f"published {src.name}/")

    (SITE / "index.html").write_text(render_index(projects))
    print(f"wrote index with {len(projects)} project(s)")


if __name__ == "__main__":
    main()
