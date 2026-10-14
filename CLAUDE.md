# CLAUDE.md

## Deploy state: **ENABLED**

This switch overrides every other instruction in this file about pushing,
merging or fast-forwarding `main`, opening or merging pull requests into it,
and deploying.

- **DISABLED** means `main` is frozen to save GitHub Actions minutes:
  - Commit your work and push **only your working branch** (name it
    `claude/<topic>`; pushes to a working branch run no workflows). Never push,
    merge or fast-forward `main`, and don't merge pull requests into it.
  - Run tests and builds locally as usual (they cost no Actions minutes).
  - End every change with this warning to the owner:
    > ⚠️ Deploys are disabled for this repo: the change is on branch
    > `<branch>`, NOT on `main`, and NOT deployed.
- **ENABLED** means follow the normal push and deploy rules in this file.
- **Turning deploys on** happens only when the owner explicitly asks for a push
  to `main` (or to enable deploys). Then:
  1. Change the heading above to `**ENABLED**` (this is what lets the push
     guard below allow the push).
  2. Merge the pending work: `git fetch origin && git branch -r --no-merged
     origin/main` lists it. Merge oldest first, resolve conflicts, and run the
     tests.
  3. Push `main` once; that push deploys. If the owner disabled the deploy
     workflow in the Actions tab, remind them to re-enable it.
- **Turning deploys off**, when the owner asks: change the heading to
  `**DISABLED**`, commit only that change with `[skip ci]` in the message (so
  the push runs no workflow), and push `main`.
- `.claude/hooks/deploy-guard.sh` enforces this for Claude sessions: while the
  heading says DISABLED it refuses a `git push` to `main` and pull-request
  merges into it, except a `[skip ci]` push that changes only this file and
  `.claude/` (config, no workflow runs). It
  reads the heading at the moment of the push, so flipping it to ENABLED is all
  it takes to let the push through.

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

## Tests and deploys

Pushes to `main` build and deploy only; they run no tests. Tests are your job
before you commit:

- There are no automated tests; check the change in a browser (local server)
  before committing. `python3 tools/build_site.py` must also succeed (see
  Verifying above).
- Say in the commit message what you ran and that it passed.

Every deploy is paid for in GitHub Actions minutes while the repository is
private, so batch a task's work into one push to `main` at the end rather than
pushing after every small step. Pushes to a working branch run nothing. A newer
push cancels a deploy still in progress, so a burst of pushes publishes only the
last one.

## Models

- Only a session already running on Fable may start Fable subagents, workers or helper agents. Opus,
  Sonnet and every other model never pass model "fable"; they leave the model unset so it inherits, or
  pick Opus or Sonnet.
- Don't switch a session to Fable on your own. If a task seems to need Fable, ask me first and say why.
- This is enforced in `.claude/settings.json`: sessions in this repository default to Opus, and a
  PreToolUse hook (`.claude/hooks/block-fable.sh`) reads the calling model from the transcript and
  refuses a subagent or workflow call that asks for Fable unless the caller is itself Fable. When I ask
  for Fable, switch the main session with `/model`; don't edit the hook to get round it.
