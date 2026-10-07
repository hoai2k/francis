// The Marauder-style map of the grounds, with fast travel to places you have already been.
// Open from the pause menu or with N. Fast travel is disabled mid-fight, in cutscenes,
// during the train journey and in story-only places.
import * as THREE from 'three';
import { G } from './state.js';
import { groundHeight, WATER_Y, SPOTS, PLATEAU } from './world/terrain.js';

const RANGE = { x0: -320, x1: 320, z0: -360, z1: 280 };
let baseCanvas = null;

function paintBase() {
  if (baseCanvas) return baseCanvas;
  const N = 160;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = RANGE.x0 + (i / N) * (RANGE.x1 - RANGE.x0), z = RANGE.z0 + (j / N) * (RANGE.z1 - RANGE.z0);
    const h = groundHeight(x, z);
    let r, gg, b;
    if (h < WATER_Y) { const d = Math.min(1, (WATER_Y - h) / 8); r = 60 - d * 30; gg = 90 - d * 40; b = 110 - d * 30; }
    else if (x > 150) { r = 70; gg = 82; b = 48; }
    else { const t = Math.min(1, Math.max(0, h / 30)); r = 168 - t * 40; gg = 150 - t * 30; b = 104 - t * 30; }
    const k = (j * N + i) * 4;
    img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  baseCanvas = c;
  return c;
}

// fast-travel points
function points() {
  const W = G.world.zones;
  const y = G.save.year || 1;
  const gp = (x, z) => new THREE.Vector3(x, groundHeight(x, z), z);
  return [
    { id: 'hall', label: 'Great Hall', zone: 'greatHall', pos: W.greatHall.W(0, 0, -6), yaw: Math.PI },
    { id: 'gate', label: 'Castle courtyard', zone: 'grounds', pos: new THREE.Vector3(0, PLATEAU, 12), yaw: 0, map: [0, 12] },
    { id: 'stairs', label: 'Grand Staircase', zone: 'staircase', pos: W.staircase.spawn.pos, yaw: W.staircase.spawn.yaw },
    { id: 'charms', label: 'Charms Corridor', zone: 'corridor', pos: W.corridor.W(0, 0, -5), yaw: Math.PI },
    { id: 'dungeon', label: 'Dungeons', zone: 'dungeon', pos: W.dungeon.spawn.pos, yaw: W.dungeon.spawn.yaw },
    { id: 'pitch', label: 'Quidditch pitch', zone: 'grounds', pos: new THREE.Vector3(SPOTS.pitch.x, W.grounds.pitchY, SPOTS.pitch.z + 30), yaw: Math.PI, map: [SPOTS.pitch.x, SPOTS.pitch.z] },
    { id: 'hut', label: 'Brannoc’s hut', zone: 'grounds', pos: gp(SPOTS.hut.x - 6, SPOTS.hut.z - 4), yaw: 0, map: [SPOTS.hut.x, SPOTS.hut.z] },
    { id: 'paddock', label: 'Hippogriff paddock', zone: 'grounds', pos: gp(SPOTS.paddock.x - 8, SPOTS.paddock.z), yaw: 0, map: [SPOTS.paddock.x, SPOTS.paddock.z] },
    { id: 'lake', label: 'Lake shore', zone: 'grounds', pos: gp(SPOTS.lakeShore.x + 4, SPOTS.lakeShore.z), yaw: -Math.PI / 2, map: [SPOTS.lakeShore.x, SPOTS.lakeShore.z] },
    { id: 'forest', label: 'Forbidden Forest edge', zone: 'grounds', pos: gp(140, 60), yaw: Math.PI / 2, map: [140, 60], cond: () => y >= 2 || G.story.stage >= 5 },
    { id: 'hogsmeade', label: 'Hogsmeade', zone: 'hogsmeade', pos: W.hogsmeade.W(0, 0, -2), yaw: Math.PI, map: [0, 99], cond: () => y >= 3 },
    { id: 'room', label: 'Room of Requirement', zone: 'requirement', pos: W.requirement.spawn.pos, yaw: Math.PI, cond: () => G.story.requirementOpen?.() },
  ].filter((p) => !p.cond || p.cond());
}

export function canFastTravel() {
  if (G.net?.isGuest) return 'Follow your host — they lead the story.';
  if (G.save.journey || G.story.journeyQuest) return 'Not during the journey to school.';
  if (G.story.busy || G.mode !== 'play' || G.minigame) return 'Not right now.';
  if (G.enemies.list.some((e) => e.alive && !e.ally && e.def.points !== 0)) return 'You can’t fast travel during a fight.';
  if (G.zone.noSave) return 'You can’t leave this place by magic map.';
  return null;
}

export function openMap(fromPlay) {
  const base = paintBase();
  const pts = points();
  const blocked = canFastTravel();
  G.paused = true;
  if (fromPlay) { document.exitPointerLock?.(); G.ui.showHUD(false); }
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel wide map-panel"><h2 class="m-title">The Map</h2><p class="m-sub">${blocked ? blocked : 'Choose a place to travel there instantly.'}</p>
      <div class="map-wrap"><canvas class="map-cv" width="480" height="480"></canvas><div class="map-list"></div></div><div class="row"></div></div>`;
    const cv = w.querySelector('.map-cv');
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(base, 0, 0, cv.width, cv.height);
    const toC = (x, z) => [((x - RANGE.x0) / (RANGE.x1 - RANGE.x0)) * cv.width, ((z - RANGE.z0) / (RANGE.z1 - RANGE.z0)) * cv.height];
    // the castle and landmarks
    g.fillStyle = '#5a5048'; g.strokeStyle = '#2a2420'; g.lineWidth = 2;
    const [cx0, cz0] = toC(-70, -130), [cx1, cz1] = toC(70, -10);
    g.fillRect(cx0, cz0, cx1 - cx0, cz1 - cz0); g.strokeRect(cx0, cz0, cx1 - cx0, cz1 - cz0);
    g.font = '600 14px Cinzel, serif'; g.textAlign = 'center'; g.fillStyle = '#f4e6c0';
    g.fillText('Hogwarts', (cx0 + cx1) / 2, (cz0 + cz1) / 2);
    const [px, pz] = toC(SPOTS.pitch.x, SPOTS.pitch.z);
    g.strokeStyle = '#f4e6c0'; g.beginPath(); g.ellipse(px, pz, 58 / (RANGE.x1 - RANGE.x0) * cv.width, 26 / (RANGE.z1 - RANGE.z0) * cv.height, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(244,230,192,0.85)'; g.font = '12px "EB Garamond", serif';
    g.fillText('Forbidden Forest', toC(230, 0)[0], toC(230, 0)[1]);
    g.fillText('Black Lake', toC(-200, -60)[0], toC(-200, -60)[1]);
    // fast-travel pins
    for (const p of pts) if (p.map) { const [x, y] = toC(p.map[0], p.map[1]); g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
    // quest marker
    const t = G.story.markerTarget?.();
    if (t && G.zone.name === 'grounds' && t.pos) { const [x, y] = toC(t.pos.x, t.pos.z); g.fillStyle = '#7ad0ff'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 6, y); g.lineTo(x, y + 9); g.lineTo(x - 6, y); g.fill(); }
    // you are here
    if (G.zone.name === 'grounds') {
      const p = G.player.pos;
      const [x, y] = toC(p.x, p.z);
      g.fillStyle = '#ff5050'; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    const list = w.querySelector('.map-list');
    list.appendChild(Object.assign(document.createElement('p'), { className: 'map-here', textContent: `You are in: ${G.zone.label}` }));
    for (const p of pts) {
      const b = G.ui.button(list, p.label, () => {
        if (blocked) { G.ui.toast(blocked, 'info'); return; }
        G.ui.closeAll();
        G.paused = false;
        G.ui.showHUD(true);
        G.enemies.clearZone?.();
        G.world.travel(p.zone, { pos: p.pos.clone(), yaw: p.yaw });
      });
      if (blocked) b.classList.add('disabled');
    }
    G.ui.button(w.querySelector('.row'), 'Close', () => { G.ui.close(); }, 'primary');
  }, { cls: 'mapscr', onClose: () => { if (!G.ui.stack.length) { G.paused = false; if (G.mode === 'play') G.ui.showHUD(true); } }, pauseCloses: true });
}
