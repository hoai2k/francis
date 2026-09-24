# Gojo vs Sukuna: Shinjuku Showdown

A 2-minute, fully procedural fan animation: Jujutsu Kaisen's strongest
sorcerer vs the King of Curses, drawn in blocky Minecraft style. Every frame
is drawn live with the Canvas API, and every sound (hits, slashes, explosions
and the soundtrack) is synthesized with the Web Audio API. It uses no images,
no audio files and no libraries.

It borrows anime action tricks: hard cuts between ~30 shots, impact frames
(inverted monochrome flashes), afterimage smears, focus lines, whip pans,
slow-mo, chromatic aberration, animating "on twos" during fights and
screen-splitting effects.

**Story beats:** standoff → fist clash → rapid exchange (Infinity) →
Dismantle slices a skyscraper → **Black Flash** → Cleave → Blue → Red →
Divine Flame: Open → **Domain clash** (Infinite Void vs Malevolent Shrine) →
the Void shatters and re-expands → 9-hit combo → **Hollow Purple 200%** vs
**World-Cutting Slash** → aftermath.

## Controls

- **Play / Pause**: play button, tap the picture, or `Space`
- **Scrub**: drag the timeline, or `←` / `→` to jump 2 seconds
- **Restart**: `R` · **Sound**: speaker button or `M` · **Fullscreen**: ⛶ or `F`

Add `?t=34` to the URL to open paused at a given second (for example, the Black Flash).

## Code layout

- `js/core.js`: canvas, camera, particles, post effects (impact frames, chroma, focus lines), text
- `js/models.js`: blocky characters, faces, hands, destructible city, domains
- `js/audio.js`: synth sound effects and the sectioned soundtrack
- `js/shots1.js`, `js/shots2.js`: the storyboard, one `shot(duration, draw, sfx, chat)` per cut
- `js/main.js`: timeline, look-ahead audio scheduling and the player controls
