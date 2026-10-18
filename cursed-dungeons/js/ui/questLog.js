// Quest Log (J, a long press on View, or Pause → Quest Log): main and side
// quests — active, available (from people in regions you have found) and
// completed — with the steps so far, the rewards and a Track button that
// points the tracker (gold arrow, beam and footprints) at the quest.
import { h, toast } from './ui.js';
import { QUESTS, QUEST_ORDER } from '../quests/index.js';
import { REGIONS } from '../world/regions/index.js';
import { openChapterStart } from './chapterMap.js';

const STATE_LABEL = { active: 'Active', available: 'Available', complete: 'Completed', locked: 'Locked' };

export function openQuestLog(game, opts = {}) {
  const ui = game.ui, Q = game.quests;
  if (!Q) return;
  const disc = game.save.data.world?.discovered ?? {};
  let filter = opts.filter ?? 'active';
  let sel = opts.quest ?? Q.tracked() ?? null;
  game.paused = true;
  const close = () => { ui.close('questlog'); game.paused = false; game.last = performance.now(); };
  const visible = (id) => {
    const q = QUESTS[id], st = Q.state(id);
    if (filter === 'active') return st === 'active';
    if (filter === 'available') return st === 'available' && (disc[q.giver?.region ?? q.region] || q.kind === 'main');
    if (filter === 'complete') return st === 'complete';
    return false;
  };
  ui.open('questlog', (el) => {
    const ids = QUEST_ORDER.filter(visible);
    if (!ids.includes(sel)) sel = ids[0] ?? null;
    const count = (f) => QUEST_ORDER.filter((id) => { const o = filter; filter = f; const v = visible(id); filter = o; return v; }).length;
    const tabs = h('div', { class: 'tabs', role: 'tablist' }, ...[['active', 'Active'], ['available', 'Available'], ['complete', 'Completed']].map(([k, t]) =>
      h('button', { class: 'tab' + (filter === k ? ' on' : ''), role: 'tab', 'aria-selected': String(filter === k), onclick: () => { filter = k; sel = null; ui.refresh('questlog'); } }, `${t} (${count(k)})`)));
    const list = h('div', { class: 'ql-list' });
    const detail = h('aside', { class: 'ql-detail', 'aria-live': 'polite' });
    const tracked = Q.tracked();
    const render = () => {
      detail.replaceChildren();
      const q = QUESTS[sel];
      if (!q) { detail.append(h('p', { class: 'hint' }, filter === 'active' ? 'No active quests. Talk to people with a gold ! over their heads.' : 'Nothing here yet.')); return; }
      const st = Q.state(sel), idx = Q.stepIndex(sel), R = REGIONS[q.region];
      const steps = q.steps.map((s, i) => {
        const done = st === 'complete' || i < idx, cur = st === 'active' && i === idx;
        if (!done && !cur && st !== 'complete') return null;
        return h('li', { class: done ? 'done' : cur ? 'cur' : '' }, `${done ? '✔' : '▶'} ${cur ? Q.stepText(sel) : s.text}${s.region && s.region !== q.region ? ` · ${REGIONS[s.region]?.name ?? s.region}` : ''}`);
      }).filter(Boolean);
      const rw = q.rewards ?? {};
      const rewards = [rw.coins ? `◆ ${rw.coins}` : null, rw.xp ? `${rw.xp} XP` : null, rw.spins ? `🎲 +${rw.spins}` : null, rw.items ? `${rw.items} × ${rw.rarity ?? 'rare'} gear` : null].filter(Boolean);
      detail.append(...[
        h('div', { class: 'cnum' }, `${q.kind === 'main' ? '◆ Main quest' : '◇ Side quest'} · ${R?.name ?? q.region}${q.subtitle ? ' · ' + q.subtitle : ''}`),
        h('h3', { class: 'ctitle' }, q.title),
        h('p', { class: 'cintro' }, q.summary ?? ''),
        st === 'available' && q.giver ? h('p', { class: 'hint' }, `Talk to them in ${REGIONS[q.giver.region]?.name ?? q.giver.region} (look for the gold !).`) : null,
        steps.length ? h('ol', { class: 'ql-steps' }, ...steps) : null,
        q.kind === 'main' ? h('p', { class: 'hint' }, 'A curtain falls over the chapter\'s district when you get there: clear it in the open world to complete this quest. Rewards: coins, XP, 🎲 +2 and loot. Cleared chapters can be replayed at a higher threat.') : rewards.length ? h('div', { class: 'ql-rewards' }, h('b', {}, 'Rewards: '), rewards.join(' · ')) : null,
        h('div', { class: 'row', style: 'gap:8px;margin-top:8px' },
          st === 'active' ? h('button', { class: 'btn primary', 'data-track': true, disabled: tracked === sel, onclick: () => { Q.track(sel); toast(`Tracking: ${q.title}`); ui.refresh('questlog'); } }, tracked === sel ? '◆ Tracked' : '📍 Track') : null,
          q.kind === 'main' && q.chapter && (st === 'complete' || st === 'active') && game.mode === 'world' && !game.worldMission ? h('button', { class: 'btn', onclick: () => { ui.close('questlog'); openChapterStart(game, q.chapter); } }, st === 'complete' ? '↻ Replay chapter' : '▶ Go now') : null,
          h('button', { class: 'btn', onclick: () => { ui.close('questlog'); game.openWorldMap?.(); } }, '🗾 World Map'))].filter(Boolean));
    };
    for (const id of ids) {
      const q = QUESTS[id];
      const b = h('button', { class: 'ql-item' + (id === sel ? ' sel' : '') + (q.kind === 'main' ? ' main' : '') + (id === tracked ? ' tracked' : ''), 'data-q': id,
        onclick: () => { if (sel === id) { const t = detail.querySelector('[data-track]'); if (t && !t.disabled) { ui.setFocus(t); return; } } sel = id; list.querySelectorAll('.ql-item').forEach((x) => x.classList.toggle('sel', x === b)); render(); } },
        h('span', { class: 'qi' }, q.kind === 'main' ? '◆' : '◇'),
        h('span', { class: 'qt' }, q.title, h('small', {}, `${REGIONS[q.region]?.name ?? ''} · ${STATE_LABEL[Q.state(id)]}`)),
        id === tracked ? h('span', { class: 'qtr' }, 'TRACKED') : null);
      b.addEventListener('navfocus', () => { if (sel !== id) { sel = id; list.querySelectorAll('.ql-item').forEach((x) => x.classList.toggle('sel', x === b)); render(); } });
      list.append(b);
    }
    render();
    el.appendChild(h('div', { class: 'panel ql-panel', role: 'dialog', 'aria-label': 'Quest log' },
      h('div', { class: 'cmap-head' }, h('h2', {}, 'Quest Log'), h('span', { class: 'cprog' }, `${QUEST_ORDER.filter((id) => Q.state(id) === 'complete').length} / ${QUEST_ORDER.length} complete`)),
      tabs,
      h('div', { class: 'ql-body' }, list, detail),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:8px;align-items:center' },
        h('span', { class: 'hint', style: 'margin:0' }, 'J / B / Esc: close'),
        h('button', { class: 'btn', onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
  const s = ui.top(); const it = s?.el.querySelector('.ql-item.sel'); if (it) ui.setFocus(it);
}
