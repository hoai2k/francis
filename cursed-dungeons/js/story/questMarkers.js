// Quest markers in the open world: every open main-quest chapter in the
// loaded region gets a small curtain dome at the centre of its mission
// district (world/worldMission.js zoneCenter) with the chapter's card over it
// (gold and lit for the next chapter); walking into the district drops the
// real curtain. A cleared chapter leaves a Cursed Lair at its 'lair_<id>'
// anchor instead (a cave mouth with a blue card): its panel replays the
// chapter in the world or enters the old generated dungeon for loot. Side
// quests with an active lair step get a cave mouth / curtain too. Walk up and
// interact: a chapter opens its start panel (ui/chapterMap.js), a side lair
// its own (quests/index.js). Hidden while a world mission's curtain is down. game.quests drives what is shown; the tracker
// is pointed by game.quests.guide().
//   installQuestMarkers(game, L) -> { markers, refresh(), guide() }
import * as THREE from 'three/webgpu';
import { CHAPTERS, chapter, arc, chapterUnlocked, chapterDone, nextChapter } from './chapters.js';
import { openChapterStart } from '../ui/chapterMap.js';
import { anchorPos, QUESTS } from '../quests/index.js';
import { zoneCenter } from '../world/worldMission.js';

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
  if (!ch.arc) return sideCard(ch, state);
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
  c.fillText(state === 'done' ? '✔ CURSED LAIR · REPLAY' : state === 'next' ? '▶ NEXT CHAPTER' : 'OPEN', 16, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function sideCard(q, state) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 150;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(10,6,22,0.88)'; c.fillRect(4, 4, 248, 142);
  c.strokeStyle = '#b05aff'; c.lineWidth = 6; c.strokeRect(5, 5, 246, 140);
  c.fillStyle = '#b05aff'; c.fillRect(8, 8, 240, 30);
  c.fillStyle = '#fff'; c.font = 'bold 18px Silkscreen, monospace'; c.textBaseline = 'middle'; c.fillText('SIDE QUEST', 16, 24);
  c.font = 'bold 26px "Pixelify Sans", sans-serif'; c.fillText(q.title.slice(0, 18), 16, 76);
  c.fillStyle = '#ffd84a'; c.font = 'bold 15px "Pixelify Sans", sans-serif'; c.fillText(state === 'next' ? '▶ ENTER THE LAIR' : 'LAIR', 16, 120);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function installQuestMarkers(game, L) {
  if (!game?.world || !L) return null;
  const world = game.world, parent = world.group ?? game.scene;
  let markers = [];
  const clear = () => {
    for (const m of markers) { m.group.parent?.remove(m.group); if (m.light) game.lights?.remove(m.light); }
    game.interactables = game.interactables.filter((it) => !String(it.id).startsWith('lair-'));
    markers = [];
  };
  const build = () => {
    clear();
    const d = game.save.data;
    const lairs = game.worldMission ? [] : (game.quests?.lairs(L.regionId) ?? []);
    const used = [];
    for (let lair of lairs) {
      const ch = lair.chapter ? chapter(lair.chapter) : null;
      if (ch && !chapterUnlocked(d, ch)) continue;
      const cleared = ch ? chapterDone(d, ch) : false;
      if (ch) lair = { ...lair, kind: cleared ? 'cave' : 'curtain' };
      let want = ch && !cleared ? zoneCenter(L, ch) : anchorPos(L, lair.anchor, lair.salt); if (!want) continue;
      for (let k = 0; k < 6 && used.some((u) => Math.hypot(u.x - want.x, u.z - want.z) < 4); k++) want = want.clone().add(new THREE.Vector3(Math.cos(k * 2.1) * 4, 0, Math.sin(k * 2.1) * 4));
      const pos = findSpot(world, want) ?? want;
      used.push(pos);
      const done = ch ? chapterDone(d, ch) : false;
      const isNext = ch ? ch === nextChapter(d) : lair.state === 'next';
      const state = isNext ? 'next' : done ? 'done' : 'open';
      const col = new THREE.Color(isNext ? 0xffd84a : done ? 0x7ad8ff : ch ? new THREE.Color(arc(ch.arc).color).getHex() : 0xb05aff);
      const grp = new THREE.Group(); grp.position.copy(pos);
      // the curtain: a black dome that drinks the light, a glowing rim, a beam for the next chapter
      const R = lair.kind === 'cave' ? 1.6 : 2.3;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: 0x06030c, transparent: true, opacity: lair.kind === 'cave' ? 0.92 : 0.78, side: THREE.DoubleSide, depthWrite: false }));
      dome.renderOrder = 4;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 6, 48).rotateX(Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(2.4) }));
      rim.position.y = 0.06;
      const swirl = new THREE.Mesh(new THREE.TorusGeometry(R * 0.72, 0.04, 6, 40).rotateX(Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.6), transparent: true, opacity: 0.7, depthWrite: false }));
      swirl.position.y = R * 0.55;
      const H = isNext ? 11 : 6;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(isNext ? 0.6 : 0.4, isNext ? 0.9 : 0.6, H, 14, 1, true).translate(0, H / 2, 0),
        new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.6), transparent: true, opacity: isNext ? 0.28 : 0.14, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      const card = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.52), new THREE.MeshBasicNodeMaterial({ map: cardTexture(ch ?? QUESTS[lair.quest], state), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      card.position.y = R + 2.2; card.renderOrder = 5;
      for (const m of [dome, rim, swirl, beam, card]) { m.castShadow = false; m.receiveShadow = false; }
      grp.add(dome, rim, swirl, beam, card);
      parent.add(grp);
      const light = isNext ? game.lights?.attach(grp, col.getHex(), 3, 9, { offsetY: 2 }) : null;
      let t = Math.random() * 6;
      game.addUpdater?.((dt) => {
        t += dt;
        card.position.y = R + 2.2 + Math.sin(t * 1.6) * 0.15;
        card.quaternion.copy(game.rig.camera.quaternion);
        swirl.rotation.y += dt * 0.9; swirl.scale.setScalar(1 + Math.sin(t * 2.4) * 0.08);
        rim.scale.setScalar(1 + Math.sin(t * 3) * 0.03);
        return grp.parent != null && game.world === world;
      });
      const label = ch ? (done ? `Cursed Lair · ${ch.place} (dungeon / replay chapter ${ch.num})` : `Chapter ${ch.num}: ${ch.title}`) : `Enter: ${lair.label ?? QUESTS[lair.quest]?.title}`;
      game.interactables.push({ id: 'lair-' + (ch?.id ?? lair.quest), pos: pos.clone(), radius: R + 1.2, label,
        action: () => { game.returnPoint = { region: L.regionId, pos: pos.clone().add(new THREE.Vector3(0, 0, R + 1.6)) }; if (ch) openChapterStart(game, ch.id); else game.quests?.openLairPanel(lair); } });
      markers.push({ ch, lair, pos, group: grp, state, light });
    }
  };
  build();
  const api = {
    get markers() { return markers; },
    refresh: build,
    dispose: clear,   // the region is left (main.leaveRegion / clearLevel)
    guide() { game.quests?.guide(true); },
  };
  return api;
}
void CHAPTERS;
