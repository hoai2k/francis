# Jujutsu Battlegrounds

A procedural 3D arena fighter with a large roster of Jujutsu Kaisen sorcerers
and curses, CPU battles, local multiplayer and online hosting.

The game is not in this repository. It has its own,
[`hoai2k/jujutsubattlegrounds`](https://github.com/hoai2k/jujutsubattlegrounds),
and is published at <https://games.hoai.net/jujutsubattlegrounds/>. This folder
only gives it a card in the Francis Studio gallery:

- `project.json` sets `url`, so the gallery card links straight to the game
  rather than to this folder.
- `index.html` redirects anyone who lands on `/francis/jujutsu-battlegrounds/`
  to the game.
- `poster-*.jpg` are 1280x720 captures of the title screen, the character
  select and a Gojo vs Sukuna fight in Shinjuku. Retake them if the game's
  look changes.

The game sits behind the invite door shared by the games on games.hoai.net, so
a visitor without an invite sees the door when they follow the card.
