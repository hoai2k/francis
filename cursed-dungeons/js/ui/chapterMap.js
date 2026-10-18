// Chapter map (the map table in the hub): the story arcs as tabs, their
// chapters as cards drawn in CSS (icon, arc colour, place, objective, boss,
// completion / lock state), a detail panel with the briefing, a threat picker
// and Start. Also the chapter start panel opened from a quest marker, and the
// chapter title card shown when a chapter begins.
import { h, toast } from './ui.js';
import { ARCS, CHAPTERS, BOSS_NAMES, OBJECTIVES, chaptersOf, chapter, arc, chapterUnlocked, chapterDone, chapterPrev, nextChapter, missionDef, gradeName } from '../story/chapters.js';
import { BIOMES } from '../world/biomes.js';
import { REGIONS } from '../world/regions/index.js';

export const THREATS = [['Standard', 'The grade the chapter was written for.'], ['Hard', 'One grade tougher: +1 grade.'], ['Nightmare', 'Two grades tougher: +2 grades.']];
// card backdrops per biome: [top, bottom, accent]
const BIOME_ART = {
  jujutsu_high: ['#2a1f4a', '#0d0a1c', '#c8a0ff'],
  tokyo_night: ['#1a2a4a', '#070a16', '#6ab8ff'],
  cursed_forest: ['#173a22', '#060f08', '#8aff7a'],
  flooded_subway: ['#123a42', '#040e12', '#5ae0e8'],
  shibuya: ['#4a1a14', '#120505', '#ff8a4a'],
};
const art = (ch) => BIOME_ART[ch.biome] ?? BIOME_ART.jujutsu_high;
export const bossLabel = (id) => { const b = BOSS_NAMES[id]; return b ? `${b.name} · ${b.title}` : 'Unknown curse'; };
const lastThreat = (d) => Math.max(0, Math.min(2, d.lastThreat ?? 0));

// a chapter card's face: backdrop, emblem, number, title, place
function cardFace(ch, { big = false } = {}) {
  const [top, bot, acc] = art(ch), A = arc(ch.arc);
  return h('div', { class: 'cface' + (big ? ' big' : ''), style: `--c1:${top};--c2:${bot};--acc:${acc};--arc:${A?.color ?? '#7a5cff'}` },
    h('span', { class: 'sky' }), h('span', { class: 'moon' }), h('span', { class: 'skyline' }),
    h('span', { class: 'emblem' }, ch.icon),
    h('span', { class: 'bossmark', title: bossLabel(ch.boss) }, BOSS_NAMES[ch.boss]?.icon ?? '☠'));
}

function startChapter(game, ch, threat) {
  const d = game.save.data;
  if (!chapterUnlocked(d, ch)) { toast(`Finish "${chapterPrev(ch)?.title}" first`); game.audio?.ui('back'); return; }
  d.lastThreat = threat; game.save.write();
  game.ui.closeAll(); game.paused = false;
  game.startMission(missionDef(ch, threat));
}

// facts list for a chapter (goal, boss, place, threat)
function facts(ch, threat) {
  const o = OBJECTIVES[ch.objective];
  return h('dl', { class: 'cfacts' },
    h('dt', {}, 'Goal'), h('dd', {}, `${o?.icon ?? ''} ${ch.objText ?? o?.title}`),
    h('dt', {}, 'Boss'), h('dd', { style: `color:${BOSS_NAMES[ch.boss]?.color ?? '#fff'}` }, bossLabel(ch.boss)),
    h('dt', {}, 'Area'), h('dd', {}, `${BIOMES[ch.biome]?.name ?? ch.biome} · ${ch.place}`),
    h('dt', {}, 'Threat'), h('dd', {}, gradeName(ch.difficulty + threat)),
    h('dt', {}, 'Curtain'), h('dd', {}, `In ${REGIONS[ch.region]?.name ?? 'Jujutsu High'}${ch.giver?.name || ch.giver?.npc ? ` · briefing: ${ch.giver.name ?? ch.giver.npc[0].toUpperCase() + ch.giver.npc.slice(1)}` : ''}`));
}
function threatPicker(cur, onPick) {
  return h('div', { class: 'diffs', role: 'radiogroup', 'aria-label': 'Threat' }, ...THREATS.map(([n, tip], i) =>
    h('button', { class: 'diff' + (cur === i ? ' on' : ''), role: 'radio', 'aria-checked': String(cur === i), title: tip, onclick: () => onPick(i) }, n)));
}

export function openChapterMap(game) {
  const ui = game.ui, d = game.save.data;
  let threat = lastThreat(d);
  const first = nextChapter(d) ?? CHAPTERS[CHAPTERS.length - 1];
  let arcId = first.arc, sel = first.id;
  game.paused = true;
  const close = () => { ui.close('chaptermap'); game.paused = false; game.last = performance.now(); };
  ui.open('chaptermap', (el) => {
    const A = arc(arcId), list = chaptersOf(arcId);
    const arcOpen = (a) => chaptersOf(a.id).some((c) => chapterUnlocked(d, c));
    const tabs = h('div', { class: 'tabs arc-tabs', role: 'tablist' }, ...ARCS.map((a) => {
      const all = chaptersOf(a.id), done = all.filter((c) => chapterDone(d, c)).length;
      return h('button', { class: 'tab arc-tab' + (a.id === arcId ? ' on' : '') + (arcOpen(a) ? '' : ' dim'), style: `--arc:${a.color}`, role: 'tab', 'aria-selected': String(a.id === arcId),
        onclick: () => { arcId = a.id; sel = (all.find((c) => chapterUnlocked(d, c) && !chapterDone(d, c)) ?? all[0]).id; ui.refresh('chaptermap'); } },
        h('span', { class: 'an' }, `${a.icon} Arc ${a.num}`), h('span', { class: 'at' }, a.title), h('span', { class: 'ap' }, `${done}/${all.length}`));
    }));
    const detail = h('aside', { class: 'cdetail', 'aria-live': 'polite' });
    const renderDetail = () => {
      const ch = chapter(sel);
      detail.replaceChildren();
      if (!ch) return;
      const open = chapterUnlocked(d, ch), done = chapterDone(d, ch), prev = chapterPrev(ch);
      detail.append(cardFace(ch, { big: true }),
        h('div', { class: 'cnum' }, `Arc ${A.num} · Chapter ${ch.num}` + (done ? ` · Cleared (${gradeName(d.completed[ch.id])})` : '')),
        h('h3', { class: 'ctitle' }, ch.title),
        open ? h('p', { class: 'cintro' }, ch.intro.join(' ')) : h('p', { class: 'lockmsg' }, `🔒 Finish "${prev?.title}" to unlock this chapter.`),
        facts(ch, threat),
        h('div', { class: 'dlabel' }, 'Threat: ', h('b', {}, `${THREATS[threat][0]} · ${gradeName(ch.difficulty + threat)}`)),
        threatPicker(threat, (i) => { threat = i; d.lastThreat = i; renderDetail(); ui.setFocus(detail.querySelectorAll('.diff')[i]); }),
        h('div', { class: 'row', style: 'gap:8px' },
          open && !done && game.quests ? h('button', { class: 'btn', onclick: () => { game.quests.track(ch.id); close(); toast(`Tracking: ${ch.title} · follow the gold arrow`); } }, '📍 Track') : null,
          h('button', { class: 'btn primary cstart', 'data-start': true, disabled: !open, onclick: () => startChapter(game, ch, threat) }, open ? (done ? '↻ Play again' : '▶ Ijichi drives you') : 'Locked')));
    };
    const cards = h('div', { class: 'ccards' });
    for (const ch of list) {
      const open = chapterUnlocked(d, ch), done = chapterDone(d, ch), isNext = nextChapter(d) === ch;
      const b = h('button', { class: 'ccard' + (ch.id === sel ? ' sel' : '') + (open ? '' : ' locked') + (done ? ' done' : '') + (isNext ? ' next' : ''), 'data-ch': ch.id,
        'aria-label': `Chapter ${ch.num}: ${ch.title}. ${open ? (done ? 'Cleared' : 'Available') : 'Locked'}`,
        onclick: () => { if (sel === ch.id) { const sb = detail.querySelector('[data-start]'); if (sb && !sb.disabled) { ui.setFocus(sb); return; } } sel = ch.id; cards.querySelectorAll('.ccard').forEach((x) => x.classList.toggle('sel', x === b)); renderDetail(); } },
        cardFace(ch),
        h('span', { class: 'badge' }, String(ch.num)),
        done ? h('span', { class: 'tick', 'aria-hidden': 'true' }, '✔') : null,
        isNext ? h('span', { class: 'newtag' }, 'NEXT') : null,
        !open ? h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒') : null,
        h('span', { class: 'cap' }, h('span', { class: 'ct' }, ch.title), h('span', { class: 'cpl' }, `${OBJECTIVES[ch.objective]?.icon ?? ''} ${ch.objText} · ${gradeName(ch.difficulty)}`)));
      b.addEventListener('navfocus', () => { if (sel !== ch.id) { sel = ch.id; cards.querySelectorAll('.ccard').forEach((x) => x.classList.toggle('sel', x === b)); renderDetail(); } });
      cards.append(b);
    }
    renderDetail();
    const total = CHAPTERS.filter((c) => chapterDone(d, c)).length;
    el.appendChild(h('div', { class: 'panel cmap', role: 'dialog', 'aria-label': 'Chapter map' },
      h('div', { class: 'cmap-head' }, h('h2', {}, 'Mission Map'), h('span', { class: 'cprog' }, `Story ${total} / ${CHAPTERS.length}`)),
      tabs,
      h('div', { class: 'arc-blurb', style: `--arc:${A.color}` }, h('b', {}, `${A.title}`), ` · ${A.sub} — ${A.blurb}`),
      h('div', { class: 'cmap-body' }, cards, detail),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:8px;align-items:center' },
        h('span', { class: 'hint', style: 'margin:0' }, 'Choose a chapter · A / Enter select · B / Esc close'),
        h('button', { class: 'btn', onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
  const s = ui.top(); const card = s?.el.querySelector('.ccard.sel'); if (card) ui.setFocus(card);
}

// The start panel from a quest marker: the briefing, threat and Begin.
export function openChapterStart(game, id) {
  const ch = chapter(id), d = game.save.data;
  if (!ch) return;
  const A = arc(ch.arc);
  if (!chapterUnlocked(d, ch)) { toast(`Finish "${chapterPrev(ch)?.title}" first`); return; }
  let threat = lastThreat(d);
  game.paused = true;
  const close = () => { game.ui.close('quest'); game.paused = false; game.last = performance.now(); };
  game.ui.open('quest', (el) => {
    const done = chapterDone(d, ch);
    el.appendChild(h('div', { class: 'panel quest-start', style: `--arc:${A.color}` },
      cardFace(ch, { big: true }),
      h('div', { class: 'cnum' }, `Arc ${A.num}: ${A.title} · Chapter ${ch.num}` + (done ? ' · Cleared' : '')),
      h('h2', {}, ch.title),
      h('div', { class: 'qplace' }, ch.place),
      h('div', { class: 'qbrief' }, ...ch.intro.map((l, i) => h('p', { style: `animation-delay:${0.15 + i * 0.35}s` }, l))),
      facts(ch, threat),
      threatPicker(threat, (i) => { threat = i; game.ui.refresh('quest'); }),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' },
        h('button', { class: 'btn', onclick: close }, 'Not yet'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => startChapter(game, ch, threat) }, done ? '↻ Play again' : '▶ Begin'))));
  }, { dim: true, onBack: close });
}

// The chapter title card at the start of a chapter (waits for a cutscene to finish).
export function showChapterCard(game, def) {
  const ch = chapter(def?.chapter ?? def?.id); if (!ch) return;
  const A = arc(ch.arc);
  const busy = () => game.cutscene || game.cutscenes?.active || game.cutscenes?.playing || game.ui?.active;
  const mission = game.mission;
  let waited = 0;
  const show = () => {
    if (game.mission !== mission) return;
    if (busy() && waited < 60000) { waited += 250; setTimeout(show, 250); return; }
    document.querySelector('.chapter-card')?.remove();
    const el = h('div', { class: 'chapter-card', style: `--arc:${A.color}`, 'aria-live': 'polite' },
      h('div', { class: 'cc-arc' }, `ARC ${A.num} · ${A.title.toUpperCase()}`),
      h('div', { class: 'cc-num' }, `CHAPTER ${ch.num}`),
      h('div', { class: 'cc-title' }, ch.title),
      h('div', { class: 'cc-line' }),
      h('div', { class: 'cc-place' }, ch.place),
      h('div', { class: 'cc-goal' }, `${OBJECTIVES[ch.objective]?.icon ?? ''} ${ch.objText}`));
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5200);
  };
  setTimeout(show, 400);
}
