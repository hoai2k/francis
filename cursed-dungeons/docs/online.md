# Cursed Dungeons: online play

> `?online=0` in the address (or `ONLINE_ENABLED = false` at the top of
> `js/main.js`) switches it off: the Online items disappear and none of the
> online code (`js/online/`, `js/vendor/`) is ever loaded. Even when it's on,
> that code loads only when someone opens **Online** or hosts.

Play the open world together on different devices: **up to 8 players** in one
world, and every screen can bring its own local players (keyboard + mouse and
controllers, exactly like local co-op), so two people at one TV and one at
another computer play together naturally.

- **Host.** While playing, **Pause → 🌐 Host this world online** (or title
  screen → **Online → ＋ Host a game**, which goes through the select screen
  first). Each local player picks a name (below), then the game opens and play
  carries on: nothing stops while people join. **Pause → ⏹ Stop hosting**
  closes it (so does quitting to the title).
- **Join.** Title screen → **🌐 Online** lists the open games ("Hoai's game",
  how many screens are in it) and updates itself; if the online service can't
  be reached it says so, with **↻ Retry**. Pick a game and:
  1. **choose your character** on the usual select screen (your rolled
     technique, rerolls, the `frannguy` code, more controllers joining with
     A / Start), with the host's name, region and player count (n/8) at the
     top. A screen can only bring as many players as there are places left.
  2. **choose your name** (below), then you appear next to the host (behind a
     short loading fade while your screen builds the host's region).
  You play with your own save's progression for your technique (technique
  tree, loadout, gear and inventory). What you earn (XP and level-ups, coins,
  loot from chests) goes to your own save; the world, the story, quests and
  missions are the host's, and your save's own world position is left as it was.
- **Names.** Each local player (P1, P2…) picks the name shown over their head:
  **Default** (their sorcerer: "Gojo", or "Gojo 2" if someone in the game is
  already Gojo), one of the **names saved on this device**, or **+ New name…**
  (an on-screen keyboard you can use with a controller, or type with a real
  keyboard or the phone's keyboard; up to 16 characters, saved for next time).
  ◀ ▶ choose, A (Enter) confirms, X (Delete) forgets a saved name. The
  highlight starts on what that player slot used last time, so pressing A all
  the way through (select screen, then names) keeps it. A player who drops in
  later with a controller gets the default name.
- **Limits.** 8 players in all, across every screen. A screen that would take
  the game past 8 is turned away with a message ("Hoai's game is full (8
  players)"), and a controller pressing Start in a full game is told so. If
  two screens race for the last place, the host decides and the other one goes
  back to the title with the message.
- **Everyone alike.** Local and online players are the same in play: a card
  for everyone in the HUD (online players marked 🌐), their sorcerer model with
  a name tag and health bar over the head, a minimap arrow, their technique's
  visuals, Domain Expansions and ultimates, revives (stand next to a downed
  player, whoever's screen they are on), and curses chase and hit all of them.
  Colours are seats 1-8: the host's players first, then each screen in the
  order it joined. Each screen's camera follows its own players.
- **Nothing pauses online**, for the host or the guests: the pause menu,
  inventory, shop, technique tree, loadout, world map, quest log, settings and
  How to Play open over the running world. The player whose menu it is (for
  the pause menu and other shared menus, everyone on that screen) stands still
  and can still be attacked (the others see ⏸ by their name). Dialogue doesn't
  stop the world either: the host reads it as usual and every guest sees it as
  subtitles. **Cutscenes are skipped online** (they play the next time you play
  alone). Photo mode is not offered online. Offline, menus pause as before.
- **Only the host travels.** Fast travel, Window stations, starting a chapter
  curtain or a lair, and summoning training curses are the host's; guests come
  along by themselves (a short fade). Walking over a region border follows the
  centre of *every* player: the host's screen decides when the party has
  crossed, and each guest's screen makes the same switch in the same frame, with
  no loading. Someone left behind more than a region away is brought back next
  to the host.
- **Leaving.** Anyone can leave at any time: **Pause → Leave Hoai's game** for
  a guest (back to the title), **Drop out** for an extra local player, as
  offline. Everyone else sees a bubble and carries on; nothing stops. A dropped
  connection reconnects by itself (the same player, a few seconds later). If the
  host's connection drops, guests wait while it re-opens the game and then
  rejoin; if the host stops hosting or leaves, guests go back to the title with
  a message ("The host closed their game."). There is no host migration: the
  world lives on the host's screen.

## How it works

Online play uses **mini-rooms**, the small relay from the
[`mini`](https://github.com/hoai2k/mini) repository (`MULTIPLAYER.md` there)
on Cloudflare Workers at `https://mini-rooms.hoai2k.workers.dev` (pages on
localhost use `http://localhost:8787`, i.e. `wrangler dev`; `?rooms=<url>`
overrides it), the same relay as Brick Kart and Hogwarts Adventure. A room is
up to 8 connections (screens), each with a **presence** (its latest state) and
**topic** messages (one-off events). `js/vendor/mini-rooms.js` is a verbatim
copy of its browser client, loaded on first use.

Who owns what:

- **The host owns the world**: the region and the seamless crossings, the time
  of day, every curse, boss, nest and natural spawn (`game.spawns`), world events,
  chapter curtains and lairs, quests, the story and pickups. Guests don't run
  any of that: their spawn director, quests and quest markers are off, and
  `game.spawnEnemy` does nothing on a guest.
- **Every screen owns its own players**: movement, abilities, health and CE,
  Reverse Cursed Technique, dodge rolls, menus, downed / revive. It sends their
  state 10 times a second; the other screens draw them as **figures**
  (`js/online/remote.js`): real `Player` objects with the sorcerer's model and
  kit, played back with **snapshot interpolation** on the sender's clock
  (0.12-0.5 s behind, following how irregular that screen's updates are; the
  playback clock eases toward its estimate, so it never jumps), a little dead
  reckoning when updates are late.
- **Curses on a guest's screen are puppets**: the host sends the curses near
  any guest (up to 48) with each update: kind or boss, elite affix, position,
  facing, health, pose and flags (dying, burrowed, untargetable, shielded,
  hit-flash), Culling Game players dressed as the host sees them. A guest's hit
  on a puppet (melee, techniques, Domain sure-hits, allies) is sent to the host,
  who applies it (stuns and slows too) and drops the coins, which **every screen
  picks up for itself**; the XP of every kill goes to every screen.
- **Curse attacks on a guest**: a curse's melee and area attacks are checked on
  the host against the guest's figure and sent to the guest's screen, which
  applies them (so its i-frames, dodge rolls and technique defences decide).
  Curse **projectiles and puddles** are re-created on every screen and only hurt
  that screen's own players; **telegraphs** (the red ground markers) show on
  every screen.
- **Abilities, Domains and ultimates** are sent as events and replayed on every
  screen by the figure's kit at the figure's own playback time: the visuals,
  sounds, barriers and crowd control (an Unlimited Void freezes the host's
  curses), never the damage, which only ever comes from the caster's own screen
  (`combat.js` ignores a remote source). A boss's Domain shows for the guests too.
- **Positions are sent in the sender's frame**: the region it is in (each
  region keeps its own coordinates in the seamless world) or `M<seed>` in a
  dungeon. A receiver converts with its own tile offsets, so a crossing (the
  seamless rebase) on either side never has to be in step with the others.
- **Dungeons**: lairs are generated from a seed, so a guest builds the same
  level and the host's curses show there as puppets; freeing a captive or
  sealing an altar on a guest is done for the host's mission.
- **Chapter curtains** (world missions) are drawn on the guests' screens too,
  with the host's objective, and hold their players in like the host's.

| Presence (one per screen) | Meaning |
| --- | --- |
| `v`, `u`, `r`, `t`, `n`, `s`, `f` | protocol (1), the tab's id (kept for the tab's life: a reconnect or reload is the same player), host / guest, send time, name, `join` (choosing a character) / `play`, frame |
| `P` | its players: slot, name, sorcerer, position, facing, velocity, flags (alive / down / dead / airborne / domain / i-frames / in a menu / hurt / hidden / invulnerable), health, CE, pose |
| `tr` | loading a region (its positions are stale) |
| `H` (host) | accepted screens in join order, region, travel counter, time of day, the curtain, the objective, the dungeon (seed and layout) |
| `E` (host) | the curses near the guests |

| Event (topic `ev`, batched) | Sent by | Meaning |
| --- | --- | --- |
| `ab` | anyone | an ability (`use` / `rel`), Domain or ultimate, with position, aim and time |
| `hit`, `cc`, `obj` | guest | a hit on a puppet, a stun or slow, a dungeon objective done |
| `hu` | host | a curse hurt a guest's player |
| `kl`, `dr` | host | a kill (XP), a drop (coins, orbs) |
| `es`, `hz`, `mk` | host | a curse projectile, puddle, telegraph |
| `bd`, `say` | host | a boss's Domain, a line of dialogue |
| `no`, `bye` | host / anyone | turned away (full), leaving on purpose |

Everything received is validated (types, finite numbers, ranges, known
techniques, curses, bosses, abilities, regions); anything malformed is ignored,
names are cleaned and only ever put on the page as text. Errors in online code
are caught and logged (throttled) and never stop the game loop. With `?debug`,
`window.__net` is the live session (`__net.stats` counts events by kind).

**Budget.** The relay runs on Cloudflare's free plan: 100,000 requests a day,
where each message a screen *sends* counts 1/20 of a request (receiving is
free). A screen in a game sends 10 presence messages a second (one second
apart when it is alone) plus at most one batch of events every 0.15 s, and only
when something happened: about 11-15 messages a second in a fight, so roughly
2,500 requests an hour per screen, which is **about 40 screen-hours of play a
day** (13 hours of a three-screen game). The Online screen checks the list of
games every 4 s (every 15 s while the tab is hidden), and each check is a
whole request, so don't leave it open for hours. Running out only makes the
relay refuse connections until the next day.

**Limitations.** The world lives on the host's screen: if the host's tab is
hidden the browser stops its game, so the curses stand still for everyone
(guests keep playing and see "host away"); there is no host migration. Hits on
guests are checked against where the host last saw them (about a tenth of a
second plus the trip behind). Remote figures replay abilities without that
player's technique-tree ranks (the base look of each ability). Curse-infested
buildings and region events react to the host's own players. The lobby list
only knows each game's title and how many screens are in it (the host's
region and player count show once you pick it). No protection against cheating
(it's for friends).

**Tested** automated and headless (Chromium), against a local stand-in for
the relay with the same protocol, part of it through 60-110 ms of latency each
way with jitter: the lobby, Retry, joining through the select screen and the
name step (default kept by pressing Enter, an edited name typed on the
keyboard, the saved name next time); a host plus guests with 1, 2 and 3 local
players (7), two screens racing for the 8th place (one turned away), a full
game refusing a 2-player screen and a drop-in; figures and puppets in step and
smooth under latency; a guest killing curses (XP, coins), curses hitting a guest
(melee checked on the host, shots replayed), RCT, guest and boss Domains, all
35 techniques used by a guest and replayed on the host; menus not pausing
online (host in the inventory, guest in the pause menu, both hit) while offline
still pauses; revives both ways; leaving, rejoining, dropped connections on
either side, a closed tab, the host stopping (guests and a still-choosing
screen sent back with the message); crossing a region border together, the
host's fast travel, a dungeon (objective, boss, way out), a chapter curtain,
subtitles; a phone joining by touch; `?online=0`.
**Not tested:** the production relay and real devices over the internet (the
test environment can't reach it), real gamepads (simulated as devices).
