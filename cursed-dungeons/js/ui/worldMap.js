// World Map: the nine regions on a stylised 3×3 map (the region grid from
// world/regions/index.js), the roads between them, the Window stations you
// have found (click one to fast travel), quest givers (!) and quest targets
// (◆, gold = tracked), points of interest and where you are. A second tab
// shows the current region in full (the minimap's big view).
//   openWorldMap(game, { tab: 'world'|'region', station })   (Tab / View, pause menu, a Window station)
// Fast travel works anywhere in the open world (not inside a dungeon).
import { h, toast } from './ui.js';
import { REGIONS, REGION_IDS, neighbours, regionMeta } from '../world/regions/index.js';
import { QUESTS } from '../quests/index.js';

const hashN = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; };

export function openWorldMap(game, opts = {}) {
  const ui = game.ui, d = game.save.data, W = d.world ?? {};
  let tab = opts.tab ?? 'world';
  const here = game.mode === 'world' ? game.level?.regionId : null;
  const canTravel = game.mode === 'world';
  game.paused = true;
  const close = () => { ui.close('worldmap'); game.paused = false; game.last = performance.now(); };
  const travel = (st) => {
    if (!canTravel) { toast('Finish or leave the dungeon first'); game.audio?.ui?.('back'); return; }
    ui.close('worldmap'); game.paused = false;
    game.fastTravel(st);
  };
  ui.open('worldmap', (el) => {
    const disc = W.discovered ?? {}, stations = W.stations ?? {};
    const tabs = h('div', { class: 'tabs wm-tabs', role: 'tablist' },
      h('button', { class: 'tab' + (tab === 'world' ? ' on' : ''), role: 'tab', onclick: () => { tab = 'world'; ui.refresh('worldmap'); } }, '🗾 World'),
      here ? h('button', { class: 'tab' + (tab === 'region' ? ' on' : ''), role: 'tab', onclick: () => { tab = 'region'; ui.refresh('worldmap'); } }, `📍 ${REGIONS[here]?.name ?? 'Region'}`) : null);
    let body;
    if (tab === 'world') {
      const board = h('div', { class: 'wm-board', 'data-nonav': false });
      const svg = [];
      // roads between neighbouring regions
      const centre = (id) => { const g = REGIONS[id]?.grid ?? [1, 1]; return [(g[0] + 0.5) / 3 * 100, (g[1] + 0.5) / 3 * 100]; };
      const seen = new Set();
      for (const id of REGION_IDS) for (const n of Object.values(neighbours(id))) {
        const k = [id, n].sort().join('|'); if (seen.has(k)) continue; seen.add(k);
        const [x1, y1] = centre(id), [x2, y2] = centre(n), known = disc[id] && disc[n];
        svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="wm-road${known ? ' known' : ''}"/>`);
      }
      board.appendChild(h('div', { class: 'wm-roads', html: `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${svg.join('')}</svg>` }));
      for (const id of REGION_IDS) {
        const R = REGIONS[id]; if (!R) continue;
        const [gx, gz] = R.grid ?? [1, 1];
        const known = !!disc[id], meta = regionMeta(game.save, id);
        const tile = h('div', { class: 'wm-tile' + (known ? '' : ' unknown') + (id === here ? ' here' : '') + ` k-${R.kind}`, style: `left:${gx / 3 * 100}%;top:${gz / 3 * 100}%;--rc:${R.color};--ra:${R.accent}` },
          h('div', { class: 'wm-name' }, h('span', { class: 'wm-icon' }, known ? R.icon : '?'), known ? R.name : '???'),
          h('div', { class: 'wm-sub' }, known ? R.sub : 'Undiscovered'));
        if (known && meta) {
          // stations: buttons
          for (const [sid, name, nx, nz] of meta.stations ?? []) {
            const found = !!stations[sid];
            const b = h('button', { class: 'wm-station' + (found ? ' found' : ''), style: `left:${nx * 100}%;top:${nz * 100}%`, title: found ? `Fast travel: ${name}` : `${name} (not found yet)`, 'aria-label': found ? `Fast travel to ${name}, ${R.name}` : `${name}, not found yet`, disabled: !found,
              onclick: () => travel(sid) }, '窓');
            tile.appendChild(b);
          }
          for (const [, name, icon, nx, nz] of meta.pois ?? []) tile.appendChild(h('span', { class: 'wm-poi', style: `left:${nx * 100}%;top:${nz * 100}%`, title: name }, icon));
        }
        // quest marks (even in undiscovered regions for the tracked/main quests)
        for (const m of game.quests?.mapMarks(id, meta) ?? []) {
          const pos = m.pos ?? [0.5 + ((hashN(m.quest) % 30) - 15) / 100, 0.62];
          if (!known && !m.main && !m.tracked) continue;
          tile.appendChild(h('span', { class: `wm-mark ${m.kind}${m.tracked ? ' tracked' : ''}${m.main ? ' main' : ''}`, style: `left:${pos[0] * 100}%;top:${pos[1] * 100}%`, title: m.label }, m.kind === 'giver' ? '!' : '◆'));
        }
        if (id === here) {
          const lead = game.players.find((p) => !p.dead) ?? game.players[0], w = game.world;
          if (lead && w) tile.appendChild(h('span', { class: 'wm-you', style: `left:${lead.pos.x / w.sx * 100}%;top:${lead.pos.z / w.sz * 100}%`, title: 'You are here' }, '▲'));
        }
        board.appendChild(tile);
      }
      const info = h('div', { class: 'wm-info', 'aria-live': 'polite' }, canTravel ? (opts.station ? 'Window station: choose where to ride.' : 'Choose a Window station (窓) to fast travel.') : 'Fast travel is unavailable inside a dungeon.');
      const tracked = game.quests?.tracked(), tq = tracked && QUESTS[tracked];
      body = h('div', { class: 'wm-wrap' }, board,
        h('div', { class: 'wm-side' },
          info,
          tq ? h('div', { class: 'wm-track' }, h('b', {}, '◆ Tracked: '), tq.title, h('div', { class: 'hint', style: 'margin:2px 0 0' }, game.quests.stepText(tracked))) : null,
          h('div', { class: 'wm-legend' },
            h('span', {}, h('i', { class: 'lg st' }, '窓'), ' Window station'), h('span', {}, h('i', { class: 'lg gv' }, '!'), ' New quest'),
            h('span', {}, h('i', { class: 'lg tg' }, '◆'), ' Quest target'), h('span', {}, h('i', { class: 'lg you' }, '▲'), ' You'))));
    } else {
      const cv = h('canvas', { class: 'mapview wm-region', width: 640, height: 640 });
      const L = game.level;
      body = h('div', { class: 'wm-wrap' }, cv,
        h('div', { class: 'wm-side' },
          h('div', { class: 'wm-info' }, REGIONS[here]?.blurb ?? ''),
          h('div', { class: 'wm-list' }, h('b', {}, 'Window stations'),
            ...(L?.stations ?? []).map((s) => { const found = !!(W.stations ?? {})[s.id]; return h('button', { class: 'btn small', disabled: !found || !canTravel, onclick: () => travel(s.id) }, `${found ? '窓' : '·'} ${s.name}${found ? '' : ' (not found)'}`); })),
          h('div', { class: 'wm-list' }, h('b', {}, 'Places'), ...(L?.pois ?? []).map((p) => h('div', { class: 'hint', style: 'margin:0' }, `${p.icon} ${p.name}`)))));
      requestAnimationFrame(() => game.minimap?.region && game.minimap.draw(cv, { full: true }));
    }
    el.appendChild(h('div', { class: 'panel wm-panel', role: 'dialog', 'aria-label': 'World map' },
      h('div', { class: 'cmap-head' }, h('h2', {}, 'World Map'), h('span', { class: 'cprog' }, `${Object.keys(W.discovered ?? {}).length} / ${REGION_IDS.length} regions · ${Object.keys(W.stations ?? {}).length} stations`)),
      tabs, body,
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:8px;align-items:center' },
        h('span', { class: 'hint', style: 'margin:0' }, 'Tab / View: close · J: quest log'),
        h('div', { class: 'row', style: 'gap:8px' },
          h('button', { class: 'btn', onclick: () => { ui.close('worldmap'); game.openQuestLog?.(); } }, '📜 Quest Log'),
          h('button', { class: 'btn primary', 'data-autofocus': true, onclick: close }, 'Close')))));
    // station focus text
    const infoEl = el.querySelector('.wm-info');
    el.querySelectorAll('.wm-station').forEach((b) => b.addEventListener('navfocus', () => { if (infoEl) infoEl.textContent = b.getAttribute('aria-label') + (b.disabled ? '' : ' — A / Enter'); }));
  }, { dim: true, onBack: close });
}
