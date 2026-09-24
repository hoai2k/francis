# francis

A collection of small games and apps, each living in its own subdirectory and
all published together on GitHub Pages.

**Live site:** https://hoai2k.github.io/francis/

Each project is available at `https://hoai2k.github.io/francis/<project>/`, and
the site root lists every project automatically.

## Layout

```
francis/
├── README.md, CLAUDE.md      # repo-wide docs and conventions
├── .github/workflows/        # GitHub Pages deployment
├── tools/build_site.py       # assembles the site into _site/
├── <game-or-app>/            # one directory per project
│   ├── index.html            # entry point (required)
│   ├── project.json          # optional: {"title": "...", "description": "..."}
│   └── README.md             # what it is, how to play/use it
└── ...
```

The root directory is only the base: it holds shared docs and deploy tooling,
never game or app code.

## Adding a project

1. Create a new top-level directory with a short, URL-friendly name
   (lowercase, hyphens, e.g. `snake`, `todo-list`).
2. Put an `index.html` in it. Use **relative paths** for all assets
   (`./script.js`, not `/script.js`) because the site is served from `/francis/`.
3. Optionally add `project.json` with a `title` and `description` for the index page.
4. Commit and push to `main` — it deploys automatically.

### Projects with a build step

Plain HTML/CSS/JS needs no build. If a project has a `package.json` with a
`build` script, the deploy runs `npm ci` (or `npm install`) and `npm run build`
in that directory and publishes its `dist/`, `build/` or `out/` folder. Configure
the bundler for relative paths (e.g. Vite `base: './'`).

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site
with `tools/build_site.py` and deploys it to GitHub Pages.

One-time setup: in the repo's **Settings → Pages**, set **Source** to
**GitHub Actions**.

## Local preview

```sh
python3 tools/build_site.py
python3 -m http.server -d _site 8000
# open http://localhost:8000/
```
