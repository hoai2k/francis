# Hogwarts Adventure

A Harry Potter–inspired 3D adventure in the browser. You arrive as a new
student, get sorted into a house, explore a candlelit castle, learn eight
spells, fight dark wizards, a mountain troll and Dementors, and earn house
points in six minigames. The House Cup is decided at the end-of-term feast.

Play: <https://hoai2k.github.io/francis/hogwarts-adventure/>

It runs on [three.js](https://threejs.org) (r186, loaded from a CDN) with no
build step. Everything is generated in code: the castle, characters,
textures, particles, the music and the sound effects.

## Story

1. **The Sorting**: customise your student, then answer the Sorting Hat's
   questions. You can also ask it for a house.
2. **Charms Class**: clear the Cornish pixies out of the Charms Corridor,
   then pass Professor Thornwick's wand-drawing lesson to learn
   *Wingardium Leviosa*.
3. **Duelling Club**: learn *Expelliarmus* and win your first duel in the
   Great Hall.
4. **Potions**: learn *Incendio*, light your cauldron and brew a potion.
5. **Troll in the Dungeon!**: a boss fight. Levitate the troll's club.
   Reward: *Petrificus Totalus*.
6. **Flying Lessons**: Quidditch practice at the pitch.
7. **Care of Magical Creatures**: earn the Hippogriff's trust, then fly her.
8. **The Patronus Charm**: the Headmistress teaches *Expecto Patronum*.
9. **Shadows on the Lake**: drive the Dementors off the Black Lake pier.
10. **Into the Forbidden Forest**: a three-phase final boss fight against
    Malachar the Hollow.
11. **The House Cup**, then free roam.

## Spells

| # | Spell | Effect |
|---|-------|--------|
| 1 | Expelliarmus | Disarms wizards and knocks them back. Breaks Malachar's shield. |
| 2 | Stupefy | Fast stunning bolt. |
| 3 | Incendio | Fireball that bursts and sets foes alight. |
| 4 | Protego | Hold to block. Raise it just in time to reflect a spell. |
| 5 | Lumos | Wand light. The flash dazzles pixies, hurts Dementors and reveals hidden collectibles. |
| 6 | Wingardium Leviosa | Lifts foes or barrels. Cast again to throw. |
| 7 | Petrificus Totalus | Freezes a foe solid. |
| 8 | Expecto Patronum | A silver stag that charges Dementors. |

**Combos:** Leviosa → Incendio = *Fire Comet* · Leviosa → Stupefy = *Meteor
Slam* · Petrificus → Stupefy/Expelliarmus = *Shatter* · Incendio →
Petrificus = *Steam Blast* · Expelliarmus → Stupefy = *Knockout*.

**Weaknesses:** pixies take double damage from fire and ice. Trolls shrug
off Stupefy, but their club can be levitated. Dementors only fear the
Patronus and Lumos.

## Minigames

All six can also be played from **Minigames** on the title screen.

- **Quidditch**: fly through the rings, dodge two Bludgers and catch the
  Golden Snitch.
- **Potions**: drop ingredients in order on the beat, stir in circles and
  keep the heat in the band. A good brew gives a timed buff (Wiggenweld,
  Liquid Luck, Strength Draught, Focus Tonic).
- **Duelling Club**: a five-round tournament against tougher and tougher
  duellists.
- **Wand drawing**: trace glowing spell shapes quickly and accurately. A
  good run gives a Wand Mastery damage boost.
- **Hippogriff**: bow when she is calm, then fly a ring course over the
  grounds.
- **Chocolate Frog chase**: catch the escaped frogs in the courtyard. Stun
  them with spells to make it easier.

Collectibles: 12 Chocolate Frog cards (some only show up in Lumos light)
and 30 Bertie Bott's beans.

## Controls

| Action | Keyboard & mouse | Controller |
|--------|------------------|-----------|
| Move / look | WASD / mouse | Left / right stick |
| Cast selected spell | Left click | RT / R2 |
| Protego | Right click or Q | Y / △ |
| Lock on | Tab or middle click | LT / L2 |
| Previous / next spell | Wheel, Z / R | LB / RB |
| Spell wheel | Hold C | Hold LB or RB, pick with the right stick |
| Pick spell | 1–8 | — |
| Jump | Space | A / ✕ |
| Dodge roll (hold to sprint) | Shift | B / ◯ (L3 sprints) |
| Interact | E | X / ☐ |
| Spellbook / journal | B / J | View |
| Pause | Esc or P | Menu / Options |

- **Touch:** the left half is a floating joystick (push to the edge to
  sprint). Drag on the right half to look, or swipe fast there to cast toward
  the swipe. On-screen buttons cast, block, dodge, jump, interact and lock on,
  and the spell icons pick a spell.
- **Controllers:** Xbox, PlayStation and Switch Pro controllers are
  detected automatically, and the button prompts change to match.
  Controllers rumble on hits, impacts and Bludgers where the browser supports
  it. The D-pad works in every menu, and every minigame works on a
  controller: steer brooms with the sticks, stir potions and trace wand
  shapes with the right stick.
- **Settings:** graphics quality (low / medium / high), ambient occlusion,
  music and effects volume, mute (M), look sensitivity, stick dead zone,
  invert Y, vibration and the prompt style.

Progress and settings are saved in `localStorage`.

Play with friends online: see [Online co-op](#online-co-op).

## Online co-op

Play the story with friends on other devices (up to three friends in one world).

- **Host:** while playing, open the pause menu and choose **Host this world
  online**. (**Settings → Online** has the same switch.) Choose **Stop hosting**
  to close the world. Quitting to the title closes it too.
- **Join:** on the title screen, **Join Online World** appears while a friend
  is hosting. If you have a save, you join as your own student. If not, you
  make a student and pick a house first. Your own save is never changed by a
  visit.
- **Roles:** the host is the main character and leads the story. Guests are
  the supporting cast. They see the host's quest ("Help Rowan: …"), get the
  spells the host has learned, and can fight beside them in every story
  battle. Professors and Pip offer guests the practice version of their
  activity (wand drawing, potions, the duelling tournament, Quidditch, the
  Hippogriff, the frog chase).
- **Shared world:** you can wander between rooms separately or stay together.
  In the same room you see each other move, cast, block with Protego, light
  Lumos, ride brooms and the Hippogriff, and you read the host's
  conversations as subtitles. Enemies chase whoever is closer. House points,
  Chocolate Frog cards and beans belong to the host's world. Whatever a guest
  earns (kills, combos, minigames, collectibles) goes to the guest's house.
- **Pause menu:** online, menus don't stop the world, because your friends
  are still playing in it. Your student just stands still and enemies leave
  you alone. Guests also get **Go to <host>** (jump to wherever the host is)
  and **Leave <host>'s world**.
- **Connection trouble:** a dropped connection reconnects by itself while
  everyone keeps playing. If the host's connection drops, guests wait for
  them to come back. If the host closes the world, guests return to the
  title screen with a message.

### How it works

Online play uses the same **mini-rooms** relay as Brick Kart
(`https://mini-rooms.hoai2k.workers.dev`, from the
[`mini`](https://github.com/hoai2k/mini) repository; `?rooms=<url>` overrides
it, and pages on localhost use `http://localhost:8787`). `js/vendor/mini-rooms.js`
is a verbatim copy of its browser client. None of the online code loads
until the title screen checks for open worlds or someone hosts.

- **Presence** (each player, 10 times a second with company, once a second
  alone): name, house and look, zone, position and rotation (of the
  Hippogriff while riding it), animation, Protego / Lumos / alive flags,
  health and one-shot animations (cast, hit, cheer…). Other screens draw it
  with **snapshot interpolation** on a per-sender clock estimate, between
  0.11 and 0.45 s behind (it follows how irregular that sender's updates
  are), with a short dead reckoning when updates are late.
- **The host owns the world.** The host's presence also carries the world
  state (story stage, flags, house points, collectibles, spells, time of
  day) and the enemies in the host's room. Guests show those enemies as
  **puppets**.
- **Hits are decided by the player who owns the target.** A guest's spell
  that hits a puppet is sent to the host, who applies it, combos included.
  Enemy spells are re-created on each screen and only hurt that screen's
  student. Enemy melee and area attacks (troll slams, Malachar's eruptions
  and beam, Dementor drain) are checked on the host against a stand-in for
  each guest and sent to that guest, whose own screen applies them, so dodge
  rolls and Protego still work. Telegraphs and troll shockwaves are shown
  on every screen.
- **Events** (casts, enemy spells, telegraphs, hits, points, collectibles,
  subtitles…) are batched into at most 20 relay messages a second. All
  incoming data is validated: types, ranges, finite numbers and known ids.
  Names and text are escaped before they reach the page, and anything
  malformed is ignored. Errors in online code are caught and logged, and
  never stop the game loop.
- **Budget:** the relay's free plan allows 100,000 requests a day, and each
  message sent counts 1/20 of a request. A playing pair sends about 4,000
  requests an hour, so the allowance covers roughly a day of two-player
  play. The title screen checks for open worlds every 5 s (every 20 s after
  three minutes, never while the tab is hidden).

For debugging, `G.net` is the live session (`G.net.stats` counts the
events sent and received by kind).

## Graphics

- WebGL renderer with ACES tone mapping and real-time shadows.
- EffectComposer chain: GTAO ambient occlusion (high quality), Unreal
  bloom, and a custom grade / vignette / chromatic-aberration pass with a
  frost effect near Dementors.
- Day/night sky with sun, moon, stars and clouds. Castle windows light up at
  night.
- Splat-mapped terrain, a reflective Black Lake, an instanced forest, mist,
  fireflies, dust motes and magical sparkles.
- Interiors: the Great Hall (enchanted ceiling, 300 floating candles,
  house-point hourglasses), the Grand Staircase with moving flights, the
  Charms Corridor, the Dungeons and the Headmistress's tower.
- A pool of dynamic point lights for torches, candles and spells.
- Particle trails, impact bursts and shockwaves for every spell. The camera
  shakes on hits and the game drops into slow motion for finishing blows.

## Files

- `js/main.js`: boot, loading screen and main loop
- `js/engine.js`: renderer, post-processing and the light pool
- `js/world/`: terrain, castle exterior, interiors and the zone manager
- `js/models.js`: procedural characters and creatures with code-driven
  animation
- `js/spells.js`, `js/enemies.js`, `js/player.js`, `js/camera.js`: combat
  and movement
- `js/story.js`, `js/menus.js`, `js/ui.js`: quests, NPCs, menus and HUD
- `js/audio.js`: procedural orchestral music and sound effects
- `js/minigames/`: the six minigames
- `js/online/`: online co-op, loaded only when used. `session.js` is the
  relay connection, lobby, reconnects and clock estimate. `coop.js` is
  presence, world state, events and the host / join / leave flows.
  `remote.js` draws friends' students, the host-side stand-ins for guests
  and the guests' enemy puppets.
- `js/vendor/mini-rooms.js`: the mini-rooms relay client (verbatim copy)

## Credits

A fan-made game. Not affiliated with or endorsed by J.K. Rowling, Warner
Bros. or Wizarding World.

- three.js (MIT licence).
- Fonts: Cinzel, Cinzel Decorative and EB Garamond (SIL Open Font
  Licence), served by Google Fonts.
- No third-party models, textures or audio files are used.
