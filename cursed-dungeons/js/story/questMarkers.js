// Quest markers at Jujutsu High: each open chapter has a column of light at
// its start spot (the school gate, the main hall, the training ground…) with
// the chapter's card floating in it. Walk up and interact to open that
// chapter's start panel. The next chapter to play is gold and lit, and the
// tracker points the way to it; cleared chapters glow blue for replays.
// The map table still lists every chapter (ui/chapterMap.js).
//   installQuestMarkers(game, L) -> { markers, next, refresh() }
// L.spots = { gate, mainHall, dormitory, trainingGround, shrine, … } (floor
// positions) when the hub has them; otherwise spots around the map table.
import * as THREE from 'three/webgpu';
import { CHAPTERS, arc, chapterUnlocked, chapterDone, nextChapter } from './chapters.js';
import { openChapterStart } from '../ui/chapterMap.js';


// spots around the map table / spawn when the hub has no named spots
function fallbackSpots(L) {
  const base = (L.mapTable ?? L.spawn ?? new THREE.Vector3(20, 10, 24)).clone();
  const off = (x, z) => base.clone().add(new THREE.Vector3(x, 0, z));
  return { gate: off(-2, 5), mainHall: off(3, -2), trainingGround: off(-9, 3), shrine: off(-7, -5), dormitory: off(2, 7) };
}

// nearest floor with 3 blocks of clear air over a 3x3 footprint
function findSpot(world, want) {
  const y0 = Math.round(want.y);
  const ok = (x, z) => {
    const y = world.standY(x + 0.5, z + 0.5, y0, 3); if (!isFinite(y)) return null;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const g = world.standY(x + dx + 0.5, z + dz + 0.5, y, 1); if (!isFinite(g) || Math.abs(g - y) > 0.5) return null;
      for (let k = 0; k < 3; k++) if (world.solidAt(x + dx + 0.5, y + 0.5 + k, z + dz + 0.5)) return null;
    }
    return y;
  };
  const bx = Math.floor(want.x), bz = Math.floor(want.z);
  for (let r = 0; r <= 8; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const y = ok(bx + dx, bz + dz);
    if (y != null) return new THREE.Vector3(bx + dx + 0.5, y, bz + dz + 0.5);
  }
  return null;
}

// the floating chapter card, painted on a canvas
function cardTexture(ch, state) {
  const A = arc(ch.arc);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 150;
  const c = cv.getContext('2d');
  const col = state === 'next' ? '#ffd84a' : state === 'done' ? '#7ad8ff' : A.color;
  c.fillStyle = 'rgba(10,6,22,0.88)'; c.fillRect(4, 4, 248, 142);
  c.strokeStyle = col; c.lineWidth = 6; c.strokeRect(5, 5, 246, 140);
  c.fillStyle = A.color; c.fillRect(8, 8, 240, 30);
  c.fillStyle = '#fff'; c.font = 'bold 18px Silkscreen, monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText(`ARC ${A.num} · CH ${ch.num}`, 16, 24);
  c.font = '44px serif'; c.textAlign = 'center'; c.fillText(ch.icon, 46, 84);
  c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = 'bold 22px "Pixelify Sans", sans-serif';
  const words = ch.title.split(' '); let line = '', y = 70; const lines = [];
  for (const w of words) { if (c.measureText(line + w).width > 160 && line) { lines.push(line.trim()); line = ''; } line += w + ' '; }
  lines.push(line.trim());
  for (const l of lines.slice(0, 2)) { c.fillText(l, 84, y); y += 26; }
  c.fillStyle = col; c.font = 'bold 15px "Pixelify Sans", sans-serif';
  c.fillText(state === 'done' ? '✔ CLEARED · REPLAY' : state === 'next' ? '▶ NEXT CHAPTER' : 'OPEN', 16, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function installQuestMarkers(game, L) {
  if (!game?.world || !L) return null;
  const d = game.save.data, world = game.world;
  const spots = { ...fallbackSpots(L), ...(L.spots ?? {}) };
  const parent = world.group ?? game.scene;
  const next = nextChapter(d);
  const markers = [];
  const used = [];
  for (const ch of CHAPTERS) {
    if (!chapterUnlocked(d, ch)) continue;
    const anchor = spots[ch.start?.at] ?? spots.gate;
    if (!anchor?.isVector3) continue;
    let want = anchor.clone().add(new THREE.Vector3(ch.start?.dx ?? 0, 0, ch.start?.dz ?? 0));
    // keep markers apart
    for (let k = 0; k < 6 && used.some((u) => Math.hypot(u.x - want.x, u.z - want.z) < 3.2); k++) want = want.clone().add(new THREE.Vector3(Math.cos(k * 2.1) * 3, 0, Math.sin(k * 2.1) * 3));
    const pos = findSpot(world, want) ?? (() => { const y = world.standY(want.x, want.z, want.y, 4); return isFinite(y) ? want.clone().setY(y) : null; })();
    if (!pos) continue;
    used.push(pos);
    const done = chapterDone(d, ch), isNext = ch === next;
    const state = isNext ? 'next' : done ? 'done' : 'open';
    const col = new THREE.Color(isNext ? 0xffd84a : done ? 0x7ad8ff : new THREE.Color(arc(ch.arc).color).getHex());
    const grp = new THREE.Group(); grp.position.copy(pos);
    const H = isNext ? 9 : 6;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(isNext ? 0.7 : 0.5, isNext ? 1.0 : 0.8, H, 14, 1, true).translate(0, H / 2, 0),
      new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.6), transparent: true, opacity: isNext ? 0.3 : 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, H, 6, 1, true).translate(0, H / 2, 0),
      new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(2.5), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.08, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(2) }));
    ring.position.y = 0.07;
    // a talisman circle on the ground
    const sigil = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.15, 6).rotateX(-Math.PI / 2),
      new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.4), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    sigil.position.y = 0.05;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.52), new THREE.MeshBasicNodeMaterial({ map: cardTexture(ch, state), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    card.position.y = 3.2; card.renderOrder = 5;
    for (const m of [beam, core, ring, sigil, card]) { m.castShadow = false; m.receiveShadow = false; }
    grp.add(beam, core, ring, sigil, card);
    parent.add(grp);
    if (isNext) game.lights?.attach(grp, col.getHex(), 3, 8, { offsetY: 2 });
    let t = Math.random() * 6;
    game.addUpdater?.((dt) => {
      t += dt;
      card.position.y = 3.2 + Math.sin(t * 1.6) * 0.15;
      card.quaternion.copy(game.rig.camera.quaternion);
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
      sigil.rotation.y += dt * 0.6;
      return grp.parent != null && game.world === world;
    });
    const label = `Chapter ${ch.num}: ${ch.title}${done ? ' ✔' : ''}`;
    game.interactables.push({ id: 'quest-' + ch.id, pos: pos.clone(), radius: 2.6, label, action: () => openChapterStart(game, ch.id) });
    markers.push({ ch, pos, group: grp, state });
  }
  const api = {
    markers, next,
    nextMarker: markers.find((m) => m.ch === next) ?? null,
    // point the tracker at the next chapter's marker (or nowhere when the story is done)
    guide() {
      const m = api.nextMarker;
      if (!game.tracker) return;
      if (!m) { game.tracker.clear?.(); return; }
      const A = arc(m.ch.arc);
      game.tracker.setGoal?.({ pos: m.pos.clone(), title: `Chapter ${m.ch.num}: ${m.ch.title}`, where: `Go to ${m.ch.start?.place ?? 'the marker'} · ${A.title}`, radius: 2, beam: false, pinY: 5.2 });
    },
  };
  api.guide();
  return api;
}
