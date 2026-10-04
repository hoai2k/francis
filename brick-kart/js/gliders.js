// All gliders: the wing that pops out over the driver on glider ramps. Players pick one on the
// select screen (press up / down while choosing a kart); CPU racers get one that suits them.
// Packs live in js/gliders/<pack>.js and export an array of glider definitions:
//
//   { id, name, blurb, colors: [main, accent], scale?, build(kit) -> { mesh, parts?, fx? } }
//
// Glider frame: the origin is where the driver's hands grip the bar (the game puts it just above
// the driver's head), +Z forward, +Y up. The canopy sits about 1.4–2.2 above the origin and may
// span up to ±3.8 in x and ±1.6 in z; the mast/bar from the origin up to it is part of the design
// (kit.mast draws the standard one). The game unfolds the glider by scaling it in x from 0 to 1,
// so keep the design centred on x = 0.
//   mesh   static parts (usually one BrickBuilder.build())
//   parts  extra Object3Ds animated by fx
//   scale  shrinks (or grows) the whole design about the hand grip, e.g. for bulky ones that would
//          hide the road from the chase camera
//   fx(s, dt)  per-frame hook while it's out; s = { t, open, steer, speed01 } (flap wings, spin rotors…):
//              t = seconds since it opened (restarts every glide), open = how far it has unfolded (0..1)
// kit = { THREE, BrickBuilder, C, plastic, limb, k, a, mast(b, top?, color?) } where k / a are the
//   kart's main and accent colours, for designs that match the kart (most use their own colours).
import * as THREE from 'three';
import { BrickBuilder, C, plastic } from './lego.js';

export const GLIDER_GROUPS = [
  { id: 'originals', name: 'Original Gliders', color: '#f2cd37' },
  { id: 'marvel', name: 'Marvel Gliders', color: '#e23636' },
  { id: 'starwars', name: 'Star Wars Gliders', color: '#ffe81f' },
  { id: 'potter', name: 'Wizarding Gliders', color: '#d3a625' },
  { id: 'jjk', name: 'Cursed Gliders', color: '#8a5cff' },
  { id: 'jurassic', name: 'Jurassic Gliders', color: '#e8a33a' },
  { id: 'minecraft', name: 'Minecraft Gliders', color: '#5fa83a' },
  { id: 'pokemon', name: 'Pokémon Gliders', color: '#ffcb05' },
  { id: 'sonic', name: 'Sonic Gliders', color: '#1e6cff' },
];
// Packs are listed in FINISHED once reviewed; unfinished ones only load in the workbench and the
// developer views (?garage=…, ?glider=…, ?packs=all) so half-built gliders never reach players.
const FINISHED = GLIDER_GROUPS.map((g) => g.id);
const q = new URLSearchParams(location.search);
const dev = location.pathname.includes('/workbench/') || ['garage', 'glider', 'packs', 'quick'].some((k) => q.has(k));
const PACKS = GLIDER_GROUPS.map((g) => g.id).filter((id) => dev || FINISHED.includes(id));

// a bar, a mast and two struts up to the canopy (the standard rigging)
function limb(b, p1, p2, r, color) {
  const d = new THREE.Vector3().subVectors(p2, p1), len = d.length();
  const m = new THREE.Matrix4().compose(p1.clone().add(p2).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(r, len, r));
  b.addMatrix(new THREE.CylinderGeometry(1, 1, 1, 6), plastic(color), m);
}
function mast(b, top = 1.7, color = C.black) {
  b.cyl(0, 0, 0, 0.06, top, color, { seg: 6 });
  for (const sd of [-1, 1]) b.cyl(sd * 0.1, 0.4, 0, 0.03, top - 0.3, C.ltgray, { seg: 4 });
}

// the classic brick wing in the kart's own colours (the default)
const KART_WING = {
  id: 'kartwing', name: 'Brick Wing', group: 'originals', blurb: 'The classic glider, in your kart\'s colours', colors: [C.red, C.black],
  build({ k, a }) {
    const gb = new BrickBuilder(0.4);
    mast(gb);
    gb.boxM(new THREE.Matrix4().compose(new THREE.Vector3(0, 1.75, 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, 0)), new THREE.Vector3(1.6, 0.1, 1.5)), k);
    for (const sd of [-1, 1]) {
      gb.boxM(new THREE.Matrix4().compose(new THREE.Vector3(sd * 1.75, 1.62, 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, sd * -0.18)), new THREE.Vector3(2.0, 0.1, 1.3)), a);
      gb.boxM(new THREE.Matrix4().compose(new THREE.Vector3(sd * 3.1, 1.45, -0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, sd * -0.3)), new THREE.Vector3(1.0, 0.1, 0.9)), k);
    }
    return { mesh: gb.build({ name: 'kartwing' }) };
  },
};

// each pack loads on its own so one broken file never stops the game
const loaded = await Promise.allSettled(PACKS.map((id) => import(`./gliders/${id}.js`)));
const packs = {};
loaded.forEach((r, i) => {
  if (r.status !== 'fulfilled') { console.error(`Gliders "${PACKS[i]}" failed to load`, r.reason); return; }
  packs[PACKS[i]] = (r.value.default || []).map((d) => ({ blurb: '', colors: [C.red, C.black], ...d, group: PACKS[i] }));
});
// one list in display order; the Brick Wing always comes first (it's the default)
export const GLIDERS = [KART_WING, ...GLIDER_GROUPS.flatMap((g) => packs[g.id] || []).filter((g) => g.id !== KART_WING.id)];
export const DEFAULT_GLIDER = 0;
export const gliderIndex = (id) => Math.max(0, GLIDERS.findIndex((g) => g.id === id));

const GKIT = { THREE, BrickBuilder, C, plastic, limb, mast };
// Builds a glider into `group` (cleared first); k / a = the kart's colours. Returns the fx hook.
export function buildGlider(def, group, k = C.red, a = C.black) {
  for (const o of [...group.children]) group.remove(o);
  let out;
  try { out = (def || KART_WING).build({ ...GKIT, k, a }) || {}; } catch (e) { console.error('glider failed', def?.id, e); out = KART_WING.build({ ...GKIT, k, a }); }
  // everything hangs off an inner group, so `scale` works without touching the parts fx animates
  const inner = new THREE.Group();
  inner.scale.setScalar(def?.scale || 1);
  inner.add(out.mesh);
  for (const o of out.parts || []) inner.add(o);
  group.add(inner);
  group.userData.fx = out.fx || null;
  group.userData.gliderId = (def || KART_WING).id;
  return out.fx || null;
}
