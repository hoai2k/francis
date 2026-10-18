// Region runtime hooks: code that runs while a region is loaded (not just at
// build time), without touching main.js. Shared by the Culling Game colonies;
// any region can use it.
//
//   import { onRegionLoad, addChest } from '../regionRuntime.js';
//   // in a region build, before R.finish():
//   onRegionLoad(R, (game, L) => { …set up…; return () => { …tear down… }; });
//       fn runs every time the region becomes the current one (arriving by
//       fast travel, coming back from a dungeon, or walking in over a border:
//       world/seamless.js) once the game is playing in it. Use
//       game.addUpdater(fn) for per-frame work (dropped when the region is
//       left); the returned dispose() runs when the region is left.
//   startRegionRuntime(game, L) -> stop()   (main.js) runs L's hooks
//   addChest(R, 'sq_id', x, z, { rarity: 'rare', power: 2 })
//       a world loot chest (opens once per save: save.data.worldChests[region:id]),
//       drawn and made interactable automatically; returns the chest record.
//       Also listed as a 'chest' point of interest when o.poi is a name.
import * as THREE from 'three/webgpu';
import { rollChest, itemInfo, RARITY } from '../loot.js';
import { toast } from '../ui/ui.js';

export function onRegionLoad(R, fn) {
  (R.runtimeHooks ??= []).push(fn);
}

// Run a region's hooks now (or as soon as the game is playing in it); returns stop().
export function startRegionRuntime(game, L) {
  const list = L.runtimeHooks ?? [];
  let stopped = false, timer = null;
  const disposers = [];
  const start = (tries = 0) => {
    timer = null;
    if (stopped || game.level !== L) return;
    if (game.state !== 'playing' || game.mode !== 'world') { if (tries < 600) timer = setTimeout(() => start(tries + 1), 100); return; }
    const prev = game.regionTag; game.regionTag = L;   // updaters added now belong to the region
    try { for (const f of list) { try { const d = f(game, L); if (typeof d === 'function') disposers.push(d); } catch (e) { console.error('region runtime', e); } } }
    finally { game.regionTag = prev; }
  };
  if (list.length) start();
  return () => {
    stopped = true; if (timer) clearTimeout(timer);
    for (const d of disposers.splice(0)) { try { d(); } catch (e) { console.warn('region runtime dispose', e); } }
  };
}

// ------------------------------------------------------------------ world chests
let CHEST = null;
function chestParts() {
  if (CHEST) return CHEST;
  CHEST = {
    body: new THREE.BoxGeometry(1.1, 0.7, 0.8).translate(0, 0.35, 0),
    lid: new THREE.BoxGeometry(1.15, 0.3, 0.85).translate(0, 0.15, 0.4),
    lock: new THREE.BoxGeometry(0.2, 0.25, 0.1),
    band: new THREE.BoxGeometry(1.16, 0.12, 0.84),
    mats: {
      common: new THREE.MeshStandardNodeMaterial({ color: 0x7a5230, roughness: 0.7 }),
      rare: new THREE.MeshStandardNodeMaterial({ color: 0x2a4a8a, roughness: 0.6 }),
      unique: new THREE.MeshStandardNodeMaterial({ color: 0x6a1a2a, roughness: 0.5 }),
      trim: new THREE.MeshStandardNodeMaterial({ color: 0xd8b040, roughness: 0.3, metalness: 0.8 }),
    },
  };
  return CHEST;
}

export function addChest(R, id, x, z, o = {}) {
  R.worldChests ??= [];
  const c = { id: `${R.id}:${id}`, x: Math.floor(x), z: Math.floor(z), rarity: o.rarity ?? 'common', power: o.power ?? 0, coins: o.coins ?? null, ry: o.ry ?? R.rnd(0, Math.PI * 2) };
  R.worldChests.push(c);
  R.reserve(c.x - 1, c.z - 1, c.x + 1, c.z + 1, 4);
  if (o.poi) R.poi('chest_' + id, o.poi, '🎁', c.x, c.z, 'chest');
  if (R.worldChests.length === 1) onRegionLoad(R, (game, L) => installChests(game, L, R.worldChests));
  return c;
}

function installChests(game, L, list) {
  const sd = game.save.data; sd.worldChests ??= {};
  const P = chestParts();
  for (const c of list) {
    const y = L.world.standY(c.x + 0.5, c.z + 0.5, L.groundAt ? L.groundAt(c.x, c.z) : L.world.sy - 1, 8);
    const pos = new THREE.Vector3(c.x + 0.5, isFinite(y) ? y : (L.groundAt?.(c.x, c.z) ?? 10), c.z + 0.5);
    const grp = new THREE.Group(); grp.position.copy(pos); grp.rotation.y = c.ry;
    const mat = P.mats[c.rarity] ?? P.mats.common;
    const body = new THREE.Mesh(P.body, mat); body.castShadow = true;
    const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.4);
    const lm = new THREE.Mesh(P.lid, mat); lm.castShadow = true; lid.add(lm);
    const band = new THREE.Mesh(P.band, P.mats.trim); band.position.y = 0.36;
    const lock = new THREE.Mesh(P.lock, P.mats.trim); lock.position.set(0, 0.62, 0.42);
    grp.add(body, lid, band, lock);
    const opened = !!sd.worldChests[c.id];
    if (opened) lid.rotation.x = -1.9;
    game.scene.add(grp); (game.hubProps ??= []).push(grp);
    const rec = { c, pos, lid, opened };
    let light = null;
    if (!opened) light = game.lights.attach(grp, c.rarity === 'common' ? 0xffd27a : c.rarity === 'rare' ? 0x5ab8ff : 0xff7a3a, 1.6, 4, { offsetY: 1 });
    game.interactables.push({ id: 'wchest-' + c.id, pos, radius: 2, label: 'Open chest', enabled: () => !rec.opened, action: (p) => {
      if (rec.opened) return; rec.opened = true; sd.worldChests[c.id] = true;
      if (light) game.lights.remove(light);
      let t = 0; game.addUpdater((dt) => { t += dt; lid.rotation.x = -Math.min(1.9, t * 6); return t < 0.4; });
      game.audio?.loot?.(c.rarity === 'common' ? 'common' : 'rare');
      game.particles?.burst(pos.clone().setY(pos.y + 0.8), { count: 24, color: c.rarity === 'rare' ? 0x4ad0ff : 0xffd23a, speed: 4, up: 2, life: 0.8, size: 0.14, shape: 1 });
      game.pickups?.drop('coin', pos, c.coins ?? (8 + Math.floor(Math.random() * 6) + (c.rarity !== 'common' ? 12 : 0)), 1);
      const power = Math.max(1, Math.round((sd.level ?? 1) / 3) + 1 + c.power);
      const items = rollChest(power, c.rarity === 'unique' ? 'boss' : c.rarity);
      items.forEach((it, i) => {
        sd.inventory.push(it);
        const b = itemInfo(it), Rr = RARITY[b.rarity];
        setTimeout(() => { toast(`${b.icon} ${Rr.label}: ${b.name}`); game.audio?.loot?.(b.rarity); }, 350 + i * 450);
      });
      game.save.write();
      void p;
    } });
  }
}
