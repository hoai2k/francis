// Movie abilities: extra power-ups themed on the Movie Cup films, dropped from item boxes
// on EVERY track (a little more often on their own movie's track). Each pack in
// js/abilities/<movie>.js exports an array of ability definitions:
//
//   { id, name, color, icon (SVG string, viewBox 0 0 64 64), help (one sentence for How to Play),
//     from: 'starwars' | 'marvel' | 'jjk' | 'jurassic',
//     odds: [w0, w1, w2, w3, w4],   weights per position band (leader … last), same scale as the
//                                   base tables (each band sums to ~110): defensive/weak items in
//                                   early bands, big comeback items in the last bands
//     multi?: n,                    uses per pickup (like Triple Rockets)
//     gesture?: 'throwF' | 'throwB' | 'use',   driver animation when used (default 'use')
//     ai?(k, ctx) -> boolean | { back: true },  should a CPU use it now (default: after a short wait)
//     use(k, ctx, { back, aimFwd }),          do it (spawn entities, change karts)
//     prewarm?(ctx) -> Object3D | Object3D[] }  sample meshes using the ability's materials; the race
//                                   adds them hidden-but-compiled at load so first use doesn't stutter
//
// ctx (made by Items) gives: race, track, scene, fx, audio, THREE, BrickBuilder, C, plastic,
//   spawn(entity)      entity = { update(dt) -> keep alive?, dispose(), danger?(pos, r) -> bool,
//                        deflect?(pos, r, byKart) }  deflect: called by blocking powers (Force Push,
//                        Lightsaber Spin) so your projectile can be blown away / cut down near pos
//   hit(target, kind, by, label) -> bool   kind 'spin' | 'wreck' | 'freeze' (respects shields etc.)
//   ahead(k, n) / behind(k, n)   the n karts just ahead of / behind k in the standings
//   near(pos, r, except?)        karts within r of pos
//   ring(pos, radius, color)     expanding shockwave ring;  explode(pos, radius, by)
//   at(i, lat, h, out?)          a point on the track (sample index i, lateral offset, height)
// Karts expose pos, yaw, speed, loc.i, boost(t), place(i, lat), hit(kind, by), invuln, an optional
// onBump(other) hook that the race calls when two karts bump, and an optional aimAt (a kart) that
// makes a CPU driver steer at that rival; abilities set and clear both.
// Packs are listed in FINISHED once reviewed; unfinished ones only load in developer test
// races (?quick=… or ?abilities=all) so half-built abilities never reach item boxes.
const FINISHED = ['starwars', 'jjk'];
const q = new URLSearchParams(location.search);
const dev = q.has('quick') || q.has('abilities');
const PACKS = ['starwars', 'marvel', 'jjk', 'jurassic'].filter((id) => dev || FINISHED.includes(id));
const loaded = await Promise.allSettled(PACKS.map((id) => import(`./abilities/${id}.js`)));
export const ABILITIES = [];
loaded.forEach((r, i) => {
  if (r.status !== 'fulfilled') { console.error(`Abilities "${PACKS[i]}" failed to load`, r.reason); return; }
  for (const a of r.value.default || []) ABILITIES.push({ from: PACKS[i], odds: [1, 1, 1, 1, 1], gesture: 'use', ...a });
});
export const ABILITY = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));
