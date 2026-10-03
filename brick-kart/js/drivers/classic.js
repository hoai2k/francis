// The original Brick Kart racers as seated drivers, listed first as
// "Brick Kart Originals". Each one is built to the same bar as the movie casts: its own
// silhouette, proportions and props, plus a signature cheer and win (classic-a/b.js).
import { CHARACTERS } from '../characters.js';
import A from './classic-a.js';
import B from './classic-b.js';

const DEFS = { ...A, ...B };
const BLURB = {
  bob: 'Builds it, then floors it', ava: 'Small pilot, big bubble', redbeard: 'Heavy cruiser, loud parrot',
  kara: 'Armoured tank, lance up', rex: 'Top speed, beep boop', nix: 'Drift master, then poof',
  flo: 'Hoses down the pack', wendel: 'Speedy spellcaster', pepper: 'Hot pan, quick hands',
  cassie: 'Tough rider, quick lasso', bjorn: 'Unstoppable. Very loud.', regina: 'Royal speed, royal wave',
  sam: 'Tricky drifter, kickflips', zorp: 'Out of this world', max: 'Wrapped for speed', dina: 'Big bite, tiny arms',
};

export default CHARACTERS.map((ch) => {
  const def = DEFS[ch.id];
  const w = ch.stats.weight;
  return {
    id: 'classic-' + ch.id, name: ch.name, blurb: BLURB[ch.id] || ch.blurb, color: ch.kart,
    weight: w <= 2 ? 'light' : w >= 4 ? 'heavy' : 'medium',
    voice: def.voice, style: def.style, gestures: def.gestures,
    build: def.build,
  };
});
