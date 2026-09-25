#!/usr/bin/env python3
"""Assemble the GitHub Pages site into _site/.

Every top-level subdirectory that is not hidden or ignored below is treated
as a project (game or app) and published at /<repo>/<subdirectory>/.

- Static projects: the directory is copied as-is and must contain index.html.
- Projects with a package.json that defines a "build" script: dependencies are
  installed, `npm run build` runs, and the build output (dist/, build/ or out/)
  is published instead.

A root index.html (the "Francis Studio" gallery, templated from tools/site/)
linking to every project is generated automatically. A project can describe
itself in an optional project.json:
    {"title": "Snake", "description": "Classic snake game.",
     "date": "2026-09-24", "tag": "GAME", "duration": "2:00",
     "accent": "#4fc8ff", "episode": 1, "posters": ["poster-1.jpg"]}
Only title/description are commonly needed; without a title the <title> from
its index.html (or the directory name) is used. "posters" are 16:9 images
inside the project folder, cycled on the gallery cards; the newest project
(by date) is featured at the top.
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


def _on(i):
    return ' class="on"' if i == 0 else ""


def _posters(name, meta):
    return [f"./{name}/{p}" for p in meta.get("posters", [])]


def _minutes(projects):
    total = 0
    for _, m in projects:
        mm, _, ss = str(m.get("duration", "")).partition(":")
        if mm.isdigit() and ss.isdigit():
            total += int(mm) * 60 + int(ss)
    return f"{total // 60}:{total % 60:02d}" if total else ""


def _card(name, m, number):
    e = html.escape
    accent = e(m.get("accent", "#4fc8ff"))
    posters = _posters(name, m)
    thumbs = "".join(f'<img src="{e(p)}" alt=""{_on(i)}>' for i, p in enumerate(posters))
    if not posters:
        thumbs = f'<div class="noposter">{e(m["title"][:1].upper())}</div>'
    bars = "".join(f'<i{_on(i)}></i>' for i in range(len(posters))) if len(posters) > 1 else ""
    ep = m.get("episode", number)
    return (
        f'<a class="card" href="./{e(name)}/" style="--accent:{accent}" data-accent="{accent}">'
        f'<div class="thumb">{thumbs}<span class="ep">EP.{int(ep):02d}</span>'
        + (f'<span class="dur">{e(m["duration"])}</span>' if m.get("duration") else "")
        + f'<span class="play" aria-hidden="true">▶</span><div class="bars">{bars}</div></div>'
        f'<div class="info">'
        + (f'<span class="tag">{e(m["tag"])}</span>' if m.get("tag") else "")
        + f'<h3>{e(m["title"])}</h3>'
        + (f'<p>{e(m["description"])}</p>' if m["description"] else "")
        + "</div></a>"
    )


def render_index(projects):
    """Render the root gallery page from tools/site/index.html."""
    e = html.escape
    ordered = sorted(projects, key=lambda p: (p[1].get("date", ""), p[1].get("episode", 0)), reverse=True)
    featured = ""
    if ordered:
        name, m = ordered[0]
        posters = _posters(name, m)
        imgs = "".join(f'<img src="{e(p)}" alt=""{_on(i)}>' for i, p in enumerate(posters))
        chips = "".join(f"<span>{e(str(v))}</span>" for v in (m.get("tag"), m.get("duration"), f"EP.{int(m['episode']):02d}" if m.get("episode") else None) if v)
        featured = (
            f'<h2 class="section-title"><span>NOW SHOWING</span><span class="jp">上映中</span></h2>'
            f'<a class="featured" href="./{e(name)}/" style="--accent:{e(m.get("accent", "#ff3a5a"))}" data-accent="{e(m.get("accent", "#ff3a5a"))}">'
            f'<div class="reel">{imgs}</div><div class="shade"></div><div class="copy">'
            f'<span class="badge">NEW EPISODE</span><h2>{e(m["title"])}</h2>'
            + (f'<p>{e(m["description"])}</p>' if m["description"] else "")
            + f'<div class="meta">{chips}</div><span class="cta">▶ WATCH NOW</span></div></a>'
        )
    cards = "\n".join(_card(n, m, i + 1) for i, (n, m) in enumerate(ordered)) or "<p>No projects yet.</p>"
    ticker_items = [m["title"].upper() for _, m in ordered] or ["COMING SOON"]
    ticker = "".join(f"<span>{e(t)}</span>" for t in ticker_items * max(2, 8 // len(ticker_items)) * 2)
    minutes = _minutes(projects)
    stats = f'<li><b>{len(projects)}</b> EPISODES</li>' + (f"<li><b>{minutes}</b> OF ANIMATION</li>" if minutes else "") + "<li><b>100%</b> CODE-DRAWN</li>"
    template = (Path(__file__).parent / "site" / "index.html").read_text()
    return (template.replace("{{FEATURED}}", featured).replace("{{CARDS}}", cards)
            .replace("{{TICKER}}", ticker).replace("{{STATS}}", stats))


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

    shutil.copytree(Path(__file__).parent / "site", SITE / "_home", ignore=shutil.ignore_patterns("index.html"))
    (SITE / "index.html").write_text(render_index(projects))
    print(f"wrote index with {len(projects)} project(s)")


if __name__ == "__main__":
    main()
