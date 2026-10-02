// The original Brick Kart racers as seated drivers (Use Characters), listed after the
// movie casts. Built with the shared seated figure plus the classic minifig hats.
import { THREE, seatedFig, C } from './kit.js';
import { CHARACTERS, buildHat } from '../characters.js';

const CHEERS = ['fist', 'both', 'wave', 'flex', 'clap', 'point', 'salute', 'spin'];
const VOICE = { rex: { kind: 'robot', pitch: 1 }, zorp: { kind: 'squeak', pitch: 1.2 }, max: { kind: 'deep', pitch: 0.8 }, dina: { kind: 'beast', pitch: 1.3 }, bjorn: { kind: 'deep', pitch: 0.9 }, redbeard: { kind: 'deep', pitch: 1 } };
const HIGH = { ava: 1.35, flo: 1.3, regina: 1.4, cassie: 1.3, pepper: 1.2, nix: 1.15, sam: 1.1 };

export default CHARACTERS.map((ch, i) => {
  const skin = ch.hat === 'robot' ? C.ltgray : ch.hat === 'alien' ? C.lime : C.fig;
  const w = ch.stats.weight;
  return {
    id: 'classic-' + ch.id, name: ch.name, blurb: ch.blurb, color: ch.kart,
    weight: w <= 2 ? 'light' : w >= 4 ? 'heavy' : 'medium',
    voice: VOICE[ch.id] || { kind: 'human', pitch: HIGH[ch.id] || 1 },
    style: { cheer: CHEERS[i % CHEERS.length], trick: ['arms', 'superman', 'twist'][i % 3] },
    build() {
      const rig = seatedFig({ name: ch.id, torso: ch.torso, legs: ch.legs, arms: ch.torso, skin, face: ch.face });
      // the classic minifig hat, scaled up from the 0.22-radius kart minifig head
      const hat = new THREE.Group();
      hat.scale.setScalar(rig.dims.headR / 0.22);
      buildHat(ch, hat);
      rig.head.add(hat);
      rig.height += ['wizard', 'chef', 'viking', 'robot', 'astro'].includes(ch.hat) ? 0.45 : 0.2;
      return rig;
    },
  };
});
