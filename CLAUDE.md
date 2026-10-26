# CLAUDE.md

## Deploy state: **ENABLED**

Deploy branch: `deploy`

This repository deploys from the `deploy` branch, not from `main`. Pushing to
`main` runs no workflow and costs nothing; the site is published only when
`deploy` is moved forward to `main`. This switch overrides every other
instruction in this file about deploying.

- **ENABLED** means deploy after every change, exactly as before the deploy
  branch existed: commit, push `main` as the rest of this file says, then
  publish it with `git push origin main:deploy`. That push deploys. A deploy
  that is already running always finishes, and pushes waiting behind it
  collapse into the newest one.
- **DISABLED** means deploys are off to save GitHub Actions minutes. Commit and
  push `main` as usual, so finished work still lands on `main`, but never push,
  merge or fast-forward `deploy`. End every change with this warning to the
  owner:
  > ⚠️ Deploys are disabled for this repo: the change is on `main` but NOT
  > deployed. The live site is still whatever `deploy` holds.
- **Turning deploys on** happens only when the owner explicitly asks to deploy,
  to enable deploys, or for a push to `main` that should go live. Change the
  heading above to `**ENABLED**`, commit and push `main`, then
  `git push origin main:deploy`. If the owner disabled the deploy workflow in
  the Actions tab, remind them to re-enable it.
- **Turning deploys off**, when the owner asks: change the heading to
  `**DISABLED**`, commit and push `main`. It costs nothing.
- `git push origin main:deploy` is always a fast-forward. Never force-push
  `deploy`. If the push is refused, `deploy` has commits `main` lacks: merge
  `origin/deploy` into `main` first, then push both.
- `.claude/hooks/deploy-guard.sh` enforces this for Claude sessions: while the
  heading says DISABLED it refuses any push to `deploy`. It reads the heading
  at the moment of the push, so flipping it to ENABLED is all it takes to let
  the push through.

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
3. Merge it into `main` (fast-forward when possible) and push `main`, then
   `git push origin main:deploy`, which triggers the Pages deploy (while deploys
   are ENABLED; see "Deploy state" above).
4. Tell the user the URL where the change can be tested:
   `https://hoai2k.github.io/francis/<project>/`.

This standing instruction is the user's explicit permission to push to `main`.
Don't open a pull request unless the user asks for one. Never force-push `main`.

## Tests and deploys

Deploys (pushes to `deploy`) build and publish only; they run no tests. Tests
are your job before you commit:

- There are no automated tests; check the change in a browser (local server)
  before committing. `python3 tools/build_site.py` must also succeed (see
  Verifying above).
- Say in the commit message what you ran and that it passed.

Every deploy is paid for in GitHub Actions minutes while the repository is
private, so batch a task's work into one deploy at the end rather than
deploying after every small step. Pushes to `main` and to working branches run
nothing. A deploy
that is already running always finishes — never cancel one unless the owner asks
— and pushes waiting behind it collapse into the newest one. Pushes that only
change Markdown or `.claude/` don't deploy at all (`paths-ignore` in the deploy
workflow), and every workflow job carries a `timeout-minutes`, so a hung run
cannot bill for hours. Keep all three when editing a workflow.

## Models

- Only a session already running on Fable may start Fable subagents, workers or helper agents. Opus,
  Sonnet and every other model never pass model "fable"; they leave the model unset so it inherits, or
  pick Opus or Sonnet.
- Don't switch a session to Fable on your own. If a task seems to need Fable, ask me first and say why.
- This is enforced in `.claude/settings.json`: sessions in this repository default to Opus, and a
  PreToolUse hook (`.claude/hooks/block-fable.sh`) reads the calling model from the transcript and
  refuses a subagent or workflow call that asks for Fable unless the caller is itself Fable. When I ask
  for Fable, switch the main session with `/model`; don't edit the hook to get round it.
