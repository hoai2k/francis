# Cursed Dungeons

A 3D action dungeon crawler in the style of Minecraft Dungeons 1 & 2, with a
Jujutsu Kaisen theme. You play blocky sorcerers with cursed techniques and
Domain Expansions, fight graded curses and Special Grade bosses, collect
loot, and play with up to 4 people on one screen.

It runs in the browser with Three.js (r186) loaded from a CDN and has no
build step. The **WebGPU** renderer is used where available, with an
automatic **WebGL2** fallback.

Play: <https://hoai2k.github.io/francis/cursed-dungeons/>

## How to play

1. On the title screen, choose **Play**. Your **cursed technique is rolled
   at random**. Extra players join by pressing **A** or **Start** on a
   controller, and each of them rolls a technique too.
2. A new save opens with a **cutscene**: a night at Sugisawa Third High,
   a cursed finger, your technique awakening, and Gojo arriving to recruit
   you. Hold Esc / A / a finger on the screen to skip any cutscene.
3. **Jujutsu High** is the hub: a hilltop campus at dusk with long torii
   stairs, the main hall, dormitories, a koi pond, the training ground and
   Yaga's shrine. Talk to people (E / A / tap):
   - **Ijichi** (briefing pavilion): the **mission map**, the story's arcs
     and chapters.
   - **Megumi** (vending machines): the shop.
   - **Your locker** (dormitory): inventory and enchanting.
   - **Principal Yaga** (shrine): the technique tree.
   - **Gojo**, **Nitta**, **Panda**, **Maki** and **Inumaki** chat, give
     tips and spar. There's a cat to pet.
   - The **talisman post** on the training ground summons training waves.
   - Gold **quest markers** start the next chapter, and the **tracker** (a
     gold arrow, beam and footprints) always shows where to go.
4. In a mission, complete the objective (exorcise the curses, rescue the
   students, or seal the cursed objects). That opens the boss arena. Beat
   the Special Grade boss, loot its chest, and leave through the torii.
5. The game **saves automatically** (every 15 seconds, on every purchase,
   level-up and chest, and when you leave the page). **Pause → 💾 Save
   Game** saves right away. **Save Code** (pause menu or title screen)
   gives you a code that backs up your progress or moves it to another
   device. Progress is saved in `localStorage`: coins, level, rerolls, your rolled
   technique, enchantment and technique points, inventory, loadouts,
   technique-tree ranks and finished missions.

### Story

Three arcs, ten chapters, played in order: **Cursed Womb** (The Finger,
Fearsome Womb, Transfigured), **Kyoto Goodwill Event** (Curse Hunt, Black
Flash, Stolen Fingers) and **Shibuya Incident** (The Curtain Falls,
Fukutoshin Line, Disaster Flames, Idle Transfiguration). Each chapter has a
briefing cutscene the first time, a chapter card, a boss reveal cutscene
and an "EXORCISED" cutscene when the Special Grade falls. Threat:
Standard, Hard or Nightmare. **How to Play** (title and pause menu) explains
everything.

### Technique rolls

- Each technique has a rarity. The popular ones are the rarest:
  **Common**, **Uncommon**, **Rare**, **Epic**, **Legendary** and
  **Special Grade**. The select screen shows the odds.
- A **reroll** costs one spin (🎲). You start with 10 and get +1 per level
  and +2 per finished mission. You can also buy one for ◆40.
- **Code:** enter `frannguy` in the code box on the select screen. You can
  then choose any technique with ◀ ▶ (on a gamepad, use the stick or
  D-pad).

### Technique tree

You start with melee and your **first technique** (RMB) only. Everything
else is unlocked with technique points on the tree (Shrine steps). You get
2 points per level.

- **Technique I, II and III** (keys 1 / 2 / 3).
- **Reverse Cursed Technique** (Q) and **RCT Mastery**.
- **Domain Expansion or ultimate attack** (F).
- **Cursed Energy Flow**: Cursed Energy now regenerates passively, and
  this node makes it faster. **Vast Reserves** raises max Cursed Energy.
- Each technique also has its own upgrade nodes.

Locked abilities show a 🔒 on the HUD.

### Sorcerers

Only characters with a canon Domain Expansion have one. Everyone else
casts a canon **ultimate attack** with **F** when their Cursed Energy bar
is full.

| Technique | Sorcerer | Rarity | F |
| --- | --- | --- | --- |
| Shrine | Sukuna | Special Grade | Domain: Malevolent Shrine (open, no barrier; Cleave and Dismantle hit everything) |
| Limitless | Gojo | Special Grade | Domain: Unlimited Void (infinite information paralyses everything) |
| Copy / Rika | Yuta | Special Grade | Domain: Authentic Mutual Love (katana field, copied techniques as sure hits) |
| Ten Shadows | Megumi | Legendary | Domain: Chimera Shadow Garden (incomplete; shikigami rise from shadows) |
| Idle Death Gamble | Hakari | Legendary | Domain: Idle Death Gamble (pachinko reels, 1/239 jackpot, riichi events; jackpot = infinite CE + automatic RCT) |
| Judgeman | Higuruma | Legendary | Domain: Deadly Sentencing (violence forbidden; evidence, plea, verdict: Confiscation or the Executioner's Sword) |
| Mythical Beast Amber | Kashimo | Legendary | Ultimate: Mythical Beast Amber (his body breaks down afterwards) |
| Heavenly Restriction | Toji | Legendary | Ultimate: Sorcerer Killer (no Cursed Energy; the bar fills from hits) |
| Cursed Spirit Manipulation | Geto | Legendary | Ultimate: Maximum: Uzumaki |
| Star Rage | Yuki | Legendary | Ultimate: Star Rage: Black Hole |
| Divergent Fist | Yuji | Epic | Ultimate: Consecutive Black Flash |
| Cursed Speech | Inumaki | Epic | Ultimate: "Die" (tears his throat) |
| Blood Manipulation | Choso | Epic | Ultimate: Supernova |
| Idle Transfiguration | Mahito | Epic | Domain: Self-Embodiment of Perfection (sure-hit transfiguration) |
| Disaster Flames | Jogo | Epic | Domain: Coffin of the Iron Mountain (volcano interior, sure-hit heat) |
| Straw Doll | Nobara | Rare | Ultimate: Resonance: Blood Doll |
| Ratio Technique | Nanami | Rare | Ultimate: Collapse |
| Boogie Woogie | Todo | Rare | Ultimate: Boogie Woogie × Black Flash |
| Disaster Plants | Hanami | Rare | Domain: Ceremonial Sea of Light |
| Projection Sorcery | Naoya | Rare | Domain: Time Cell Moon Palace (moving inside breaks your body) |
| Ice Formation | Uraume | Rare | Ultimate: Frost Calm: Full Output |
| Gorilla Core | Panda | Uncommon | Ultimate: Gorilla Core: Drumming Beat |
| Puppet Manipulation | Mechamaru | Uncommon | Ultimate: Ultra Cannon: Maximum Output |
| Construction | Mai | Common | Ultimate: Construction: Special Bullet |
| Simple Domain | Miwa | Common | Ultimate: Batto Sword Drawing: Simple Domain |

Each kit has its own melee combo, a starting technique on RMB, three more
techniques on 1 / 2 / 3 and its own upgrade nodes on the technique tree.
The select screen and the technique tree show each ability's name.

Notes on the kits:

- **Yuji's Black Flash**: press attack again right as a hit lands. The
  next blow does 2.5× damage with a black-and-red flash, black lightning,
  heavy hit-stop and a distorted shockwave.
- **Domain Expansion** (and every ultimate) needs a full Cursed Energy bar. The arena changes
  completely (floor, walls, sky, lighting and grade), and for about 8
  seconds every attack hits automatically.
- Each sorcerer has a **skill tree**. Points come from levelling up.

### Loot

Gear comes in three kinds and three rarities (**common**, **rare**,
**unique**):

- **Weapons**, for example Playful Cloud, Split Soul Katana and
  Slaughter Demon.
- **Armour**, for example Heavenly Restriction Gear and Heian Kimono.
- **Cursed-tool artifacts** you trigger with **R / T** (gamepad
  D-pad ← / →), for example the Inverted Spear of Heaven, Chain of a
  Thousand Miles, a Prison Realm fragment and the Cursed Corpse doll.

Items carry enchantments such as Sharpness, Swirling, Committed, Leeching,
Exploding, Freezing, Protection, Cooldown and Energy Surge. You upgrade
them with enchantment points and get the points back when you salvage an
item.

## Controls

| Action | Keyboard + mouse | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | Left stick | Left virtual joystick |
| Aim | Mouse | Right stick | Auto-aim at the nearest curse |
| Melee combo | Left click | X | ⚔ |
| Jump (hold for a higher, 2-block jump) | Space | A | ⤒ |
| Jump slam | Attack in the air | X in the air | ⚔ in the air |
| Ranged / technique | Right click | RT | ✦ |
| Dodge roll (i-frames) | Shift | B | ⤳ |
| Techniques 1 / 2 / 3 | 1 / 2 / 3 | LB / RB / Y | 1 / 2 / 3 |
| Domain Expansion | F | LT | 領域 |
| Reverse Cursed Technique (heal) | Q | D-pad ↑ | ✚ |
| Artifacts | R / T | D-pad ← / → | — |
| Interact | E | A (while a prompt shows) | Tap the prompt |
| Inventory | I | D-pad ↓ | Pause menu |
| Map | Tab | View | — |
| Pause | Esc | Menu | ❚❚ |
| Fullscreen | Alt+Enter / F11 / ⛶ button | — | ⛶ button |
| Zoom | Mouse wheel | — | Pinch |
| Rotate camera 90° (turn on in settings) | Z / C | — | — |

**Local co-op:** keyboard + mouse plus up to three controllers (or four
controllers) share one camera. Press **Start** on a controller at any time
to drop in. A player who goes down can be revived by a teammate standing
next to them. If the whole party goes down, everyone respawns together at
the current board's starting point after a short delay.

Press **F3** to show the corner readout (quality mode, backend, FPS and
render scale).

## Graphics

At start-up the game reads WebGPU adapter info and the WebGL renderer
string, picks a quality tier, and lets you change it under
**Settings → Graphics**.

- **Ultra · Ray Traced** (WebGPU and a strong GPU):
  - Screen-space global illumination, so coloured light from cursed
    energy, lava and torches bounces onto nearby surfaces.
  - Screen-space reflections on water, wet streets and polished stone,
    with a reflection-probe fallback.
  - VSM soft shadows (penumbras widen with distance) and 48 pooled
    dynamic lights.
  - Temporal AA with sharpening, depth of field in cinematics, and
    optional motion blur.
- **High**: soft PCF shadows, GTAO, bloom, SSR on water, fake volumetric
  light shafts and 16 dynamic lights.
- **Medium**: simple shadows, bloom, fog and fewer particles.
- **Low / Mobile**: baked vertex lighting, light bloom only, lower render
  resolution and fewer enemies.

Every tier uses AgX tone mapping, a colour grade per biome, a vignette,
and FXAA or TAA.

With **dynamic resolution** on, the render scale drops to hold 60 FPS on
desktop (30 on mobile) before any effect is cut.

**Photo Mode** (pause menu or Settings → Graphics) freezes the frame and
re-renders it with a real path tracer (three-gpu-pathtracer on a WebGL2
canvas), converging to 512 samples. **Save PNG** downloads the result.

## Tech notes

- **Textures**: block textures are 32×32 HD pixel art painted procedurally
  at start-up, each with a matching normal map and per-pixel roughness. Nothing is
  downloaded except the Three.js modules and fonts.
- **Voxel world**: meshed in 16³ chunks with per-vertex ambient
  occlusion, baked coloured light and per-block roughness and emission.
  Destructible crates, barrels, cracked walls and pillars break into
  physics debris.
- **Visibility**: walls between the camera and any player dissolve with a
  dithered cut-away, and roofs fade out when you step inside.
- **Particles**: GPU particles integrate their motion in the vertex
  shader, so the CPU only writes a particle once, when it spawns.
  Hit-sparks, rings, slashes and damage numbers are pooled.
- **Domain Expansion**: a shader-driven radial takeover of the world's
  materials plus a sky dome and an environment transition. Collision
  stays exact because the blocks never change.
- **Characters**: Minecraft-style HD (128×128) skins painted in code, with normal and roughness maps, a
  procedural animation rig (idle breathing, run, combos, dodge roll, hit
  reactions, death) and spring physics for capes and hair.
- **Spawning**: curses, cages and altars are placed on the room's floor
  (never on roofs or wall tops). Only three melee curses attack the same
  player at once; the rest circle and wait their turn.
- **Levels**: a grid layout with a main path, side rooms and a secret
  room, stamped from hand-designed room templates per biome.
- **Bosses**: detailed models (Jogo's smoking volcano head, Hanami's
  branches and cloth, Mahito's patchwork with a phase-3 distorted form)
  with idle effects. Attack patterns are generator coroutines with
  telegraphed ground markers.
- **Cutscenes**: in-engine cinematics with letterbox bars, keyframed
  cameras, subtitles and title cards (`js/story/`).
- **Music**: two recorded tracks in `assets/music/`: `background.mp3`
  (title, Jujutsu High and missions) and `boss.mp3` (boss fights). They
  crossfade, and the background theme resumes where it left off after a
  boss. A small generative soundtrack is the fallback if a track can't
  load. Volume follows Settings → Audio → Music.
- **Sound effects**: synthesised with the Web Audio API. That covers
  impacts, charges, domains, footsteps that change with the surface and
  ambience per biome.

## Files

- `index.html`: entry point and import map
- `style.css`: UI
- `js/main.js`: boot, game states and the main loop
- `js/gfx/`: renderer and quality tiers, materials, textures, particles, effects, lights, debris
- `js/story/`: cutscene engine and cutscenes, story chapters, quest markers
- `js/world/`: Jujutsu High (`jujutsuHigh.js`), voxel world, blocks, biomes, building kit, room templates, level generator, the hub
- `js/entities/`: characters, player, curses, bosses, allies
- `js/sorcerers/`: the technique registry (`index.js`, rarities and the unlock tree) and one file per technique; `all.js` imports them all
- `js/ui/`: menus, HUD, minimap, touch controls, settings
- `js/combat.js`, `js/domain.js`, `js/mission.js`, `js/loot.js`, `js/save.js`, `js/audio.js`, `js/photo.js`
