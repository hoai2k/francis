# CLAUDE.md

Guidance for Claude (and other contributors) working in this repository.

## What this repo is

A monorepo of independent games and apps. **Each project lives in its own
top-level subdirectory.** The repository root is only a base: it holds shared
docs (`README.md`, `CLAUDE.md`), deploy tooling (`tools/`, `.github/`) and
nothing project-specific.

The whole repo is deployed to GitHub Pages at
`https://hoai2k.github.io/francis/`, with each project at
`https://hoai2k.github.io/francis/<project>/`.

## Starting a new game or app

When asked to create a new game or app:

1. Create a new top-level directory with a short, lowercase, hyphenated name
   (e.g. `snake`, `memory-match`). Never put project files in the root.
2. It must contain an `index.html` entry point.
3. Use **relative asset paths only** (`./app.js`, `assets/img.png`) — the site
   is served under `/francis/`, so absolute paths like `/app.js` break.
4. Add a `project.json` with `title` and `description` so it shows nicely on the
   root index page.
5. Add a short `README.md` in the project directory describing it and its controls.
6. Prefer plain HTML/CSS/JS with no build step. If a build step is genuinely
   needed, add a `package.json` with a `build` script that outputs to `dist/`
   (or `build/`/`out/`) with relative paths (e.g. Vite `base: './'`), and
   commit the lockfile.
7. Make it work on both desktop and mobile (touch controls, responsive layout)
   unless told otherwise.

Keep projects self-contained: don't import files from other project
directories. Shared code, if ever needed, should be discussed first.

## Verifying

Before committing, build and check the site locally:

```sh
python3 tools/build_site.py          # must succeed
python3 -m http.server -d _site 8000 # optional manual check
```

Do not commit `_site/`, `node_modules/` or build output.

## Default git workflow: ship to `main`

Changes should be live on GitHub Pages so they can be tested online. Unless
the user says otherwise, when a piece of work is done:

1. Commit on the working branch with a clear message.
2. Push the working branch.
3. Merge it into `main` (fast-forward when possible) and push `main`, which
   triggers the Pages deploy.
4. Tell the user the URL where the change can be tested:
   `https://hoai2k.github.io/francis/<project>/`.

This standing instruction is the user's explicit permission to push to `main`.
Don't open a pull request unless the user asks for one. Never force-push `main`.
