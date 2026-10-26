# Wobbly Battles

A wobbly physics battle game in the style of *Totally Accurate Battle
Simulator*: two players build their armies at the same time in split screen
with Xbox controllers, then watch the active-ragdoll battle together.

The game is not in this repository. It lives in the `battles/` folder of
[`hoai2k/swingers`](https://github.com/hoai2k/swingers) and is published at
<https://games.hoai.net/swingers/battles/>. This folder only gives it a card in
the Francis Studio gallery:

- `project.json` sets `url`, so the gallery card links straight to the game
  rather than to this folder.
- `index.html` redirects anyone who lands on `/francis/wobbly-battles/` to the
  game.
- `poster-*.jpg` are the game's loading screen (scaled to 1280x720) and its
  Castle and Volcano map backdrops. Refresh them if the game's art changes.
