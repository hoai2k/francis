// The character select screen: every player on this screen (and, online, the room's other
// players) picks a driver, then a kart, then a glider. Game.showSelect (main.js) opens it.
//
// Each player: { id, device, dcur, kcur, gcur (DRIVERS / KARTS / GLIDERS indices), color,
//   phase: 'name' (online only) -> 'driver' (choosing) -> 'kart' (driver locked: choosing a kart,
//   sub = 'kart', then once that's locked in with a spin, the glider, sub = 'glider') -> 'done' }
// Offline, the last player locking in their glider starts the race.
import { KB2_JOIN, isTouchDevice } from './input.js';
import { bodyName } from './characters.js';
import { DRIVERS, UNIVERSES, combinedStats } from './driver.js';
import { KARTS } from './vehicles.js';
import { simpleDriver, simpleKart, simpleGlider } from './simplified.js';
import { GLIDERS, GLIDER_GROUPS } from './gliders.js';
import { Showcase, driverPortrait } from './showcase.js';
import { PKEY, save } from './settings.js';
import { CHEV_L, CHEV_R, PCOL, MAX_PLAYERS, esc, hex, isPhone } from './menu-kit.js';

const GLIDER_GROUP_NAMES = Object.fromEntries(GLIDER_GROUPS.map((g) => [g.id, g]));
const TITLES = { gp: 'Grand Prix', race: 'Quick Race', tt: 'Time Trial', online: 'Online' };
// the preview cells' text and buttons: the camera keeps the kart or driver clear of them
const OVERLAYS = '.pvstep, .pvinfo, .karr, .kok, .ksw, .pvfollow, .olnames';

const uni = (id) => UNIVERSES.find((u) => u.id === id) || { name: id, color: '#fff' };
const gGroup = (gl) => GLIDER_GROUP_NAMES[gl.group] || { name: 'Glider', color: '#fff' };
// a driver is locked in once its player is choosing a kart (or done); the online name step comes first
const locked = (p) => p.phase === 'kart' || p.phase === 'done';
const statBars = (st) => ['speed', 'accel', 'handling', 'weight'].map((k) => `<div class="st"><span>${k.slice(0, 5).toUpperCase()}</span><i style="width:${st[k] * 20}%"></i></div>`).join('');

// The drivers, karts and gliders on offer (DRIVERS / KARTS / GLIDERS indices, in order):
// Simplified mode offers a smaller roster
function roster(simple) {
  const all = (list) => list.map((_, i) => i);
  const pick = (list, ok) => { const r = all(list).filter((i) => !simple || ok(list[i].id)); return r.length ? r : all(list); };
  return { allowedD: pick(DRIVERS, simpleDriver), allowedK: pick(KARTS, simpleKart), allowedG: pick(GLIDERS, simpleGlider) };
}

// the driver cards, grouped by movie (one ungrouped grid in Simplified mode)
function driverGrid(allowedD, simple) {
  let html = '';
  const groupSizes = [];
  for (const u of UNIVERSES) {
    const list = allowedD.map((i) => [DRIVERS[i], i]).filter(([d]) => d.from === u.id);
    if (!list.length) continue;
    groupSizes.push(list.length);
    html += (simple ? '' : `<div class="uhead" style="--uc:${u.color}">${esc(u.name)}</div>`) + list.map(([d, i]) => `
        <div class="dcard" data-i="${i}" style="--dc:${hex(d.color ?? 0xffffff)}"><img alt="" data-d="${i}"><span>${esc(d.name)}</span><div class="tags"></div></div>`).join('');
  }
  return { html, groupSizes };
}

// Sizes the driver grid (call every frame; it only works when the panel's size changed).
// Simplified mode: every card on screen at once, as big as they fit (the panel is full width).
// Full roster: as many columns as fit, but avoiding movie groups that end in a row with a single card.
function gridLayout(picksEl, gridEl, simple, groupSizes, n) {
  let picksKey = '';
  return () => {
    const W = picksEl.clientWidth, H = picksEl.clientHeight;
    const key = W + 'x' + H;
    if (!W || !H || key === picksKey) return;
    picksKey = key;
    const gap = 6;
    if (simple) {
      let w = 120;
      const fits = (w) => { const cols = Math.max(1, Math.floor((W - 8 + gap) / (w + gap))), rows = Math.ceil(n / cols); return rows * (w + Math.max(14, w * 0.17) + 8) + (rows - 1) * gap <= H - 10; };
      while (w > 30 && !fits(w)) w--;
      const apply = () => {
        const cols = Math.max(1, Math.floor((W - 8 + gap) / (w + gap)));
        gridEl.style.gridTemplateColumns = `repeat(${cols}, ${w}px)`;
        gridEl.style.setProperty('--cw', w + 'px');
        gridEl.classList.toggle('tiny', w < 52);   // too small for names: pictures only (the preview names them)
      };
      apply();
      // the estimate is rough: grow while everything still fits, then shrink until nothing scrolls
      const over = () => picksEl.scrollHeight > picksEl.clientHeight + 1;
      for (let n2 = 0; n2 < 60 && w < 140 && !over(); n2++) { w += 2; apply(); }
      for (let n2 = 0; n2 < 60 && over() && w > 30; n2++) { w -= 1; apply(); }
      return;
    }
    const minW = matchMedia('(max-width: 820px)').matches ? 64 : 86;
    const maxCols = Math.max(3, Math.floor((W - 8 + gap) / (minW + gap)));
    let cols = maxCols, best = Infinity;
    for (let c = maxCols; c >= Math.max(3, Math.ceil(maxCols * 0.6)); c--) {
      const singles = groupSizes.filter((g) => g > 1 && g % c === 1).length;
      if (singles < best) { best = singles; cols = c; }
    }
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  };
}

// lays the preview cells out in the grid that keeps them closest to square (only when that changes)
function cellLayout(stageEl, cellsEl) {
  let gridKey = '';
  return () => {
    const n = Math.max(1, cellsEl.children.length), W = stageEl.clientWidth || 1, H = stageEl.clientHeight || 1;
    let cols = 1, best = -Infinity;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), score = Math.min(W / c, (H / r) * 1.2) - (c * r - n) * 8;
      if (score > best) { best = score; cols = c; }
    }
    const key = cols + 'x' + Math.ceil(n / cols);
    if (key === gridKey) return;
    gridKey = key;
    cellsEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    cellsEl.style.gridTemplateRows = `repeat(${Math.ceil(n / cols)}, 1fr)`;
  };
}

// each cell's rect on the canvas, and the rects of its text and buttons (layout boxes, so their
// animations don't count)
function cellRects(canvas, cellsEl) {
  const b = canvas.getBoundingClientRect();
  return [...cellsEl.children].map((c) => {
    const r = c.getBoundingClientRect(), avoid = [];
    for (const e of c.querySelectorAll(OVERLAYS)) {
      if (!e.offsetWidth || e.offsetParent !== c) continue;
      avoid.push([e.offsetLeft - 4, e.offsetTop - 4, e.offsetLeft + e.offsetWidth + 4, e.offsetTop + e.offsetHeight + 4]);
    }
    return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height, avoid };
  });
}

// keep the focused card in view; in a group's first row also show its heading (the very top for the first group)
function scrollIntoPicks(picksEl, el) {
  if (!el) return;
  const box = picksEl.getBoundingClientRect(), r = el.getBoundingClientRect();
  let top = r.top - box.top + picksEl.scrollTop, bottom = top + r.height;
  let h = el.previousElementSibling;
  while (h && !h.classList.contains('uhead')) { if (h.getBoundingClientRect().top < r.top - 4) { h = null; break; } h = h.previousElementSibling; }
  if (h) top = h === el.parentElement.firstElementChild ? 0 : h.getBoundingClientRect().top - box.top + picksEl.scrollTop;
  const first = el.parentElement.firstElementChild;
  if (first && Math.abs(first.getBoundingClientRect().top - r.top) < 4) top = 0;
  if (top - 6 < picksEl.scrollTop) picksEl.scrollTop = Math.max(0, top - 6);
  else if (bottom + 8 > picksEl.scrollTop + picksEl.clientHeight) picksEl.scrollTop = bottom + 8 - picksEl.clientHeight;
}

// moves a cursor through a grid of cards by on-screen position
function navGrid(cards, cur, dx, dy) {
  const r0 = cards[cur].getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = -1, bd = Infinity;
  cards.forEach((c, i) => {
    if (i === cur) return;
    const r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ddx = x - cx, ddy = y - cy;
    if (dx && (Math.sign(ddx) !== dx || Math.abs(ddy) > r0.height * 0.5)) return;
    if (dy && (Math.sign(ddy) !== dy || Math.abs(ddy) < r0.height * 0.5)) return;
    const dd = dx ? Math.abs(ddx) : Math.abs(ddy) * 4 + Math.abs(ddx);
    if (dd < bd) { bd = dd; best = i; }
  });
  if (best < 0 && dx) best = (cur + dx + cards.length) % cards.length;   // wrap rows
  return best < 0 ? cur : best;
}
const moveIn = (cards, cur, dx, dy, idOf) => idOf(cards[navGrid(cards, Math.max(0, cards.findIndex((c) => idOf(c) === cur)), dx, dy)]);

// A preview cell's text and buttons for player p (null: nobody has joined yet) showing driver d
// and kart ch. v = { online, phone, allowedD, allowedK, allowedG }.
function cellHtml(p, d, ch, following, standing, v) {
  if (p?.remote) return remoteHtml(p, d, ch, standing);
  // online: each player first picks the name they race under (see js/online/names.js)
  if (v.online && p?.phase === 'name') return v.online.nameCell(p);
  const kartStep = p && locked(p), glideStep = kartStep && p.sub === 'glider';
  const gl = GLIDERS[p?.gcur ?? 0];
  const who = p && !v.phone ? `<i style="background:${p.color}">P${p.id + 1}</i> ` : '';
  const kn = v.allowedK.indexOf(p?.kcur) + 1, dn = v.allowedD.indexOf(p?.dcur) + 1, gn = v.allowedG.indexOf(p?.gcur) + 1;
  const tag = !p ? 'Press <b>A</b> / <b>Enter</b> or tap a driver'
    : p.phase === 'driver' ? `${who}pick a <b>driver</b><em class="dnum">${dn} / ${v.allowedD.length}</em>`
    : p.phase === 'kart' ? (glideStep ? `${who}pick a <b>glider</b> <em>${gn} / ${v.allowedG.length}</em>` : p.kartLock ? `${who}<b>kart</b> locked in ✓` : `${who}pick a <b>kart</b> <em>${kn} / ${v.allowedK.length}</em>`) : `${who}is ready!`;
  const u = glideStep ? gGroup(gl) : uni(d.from);
  // choosing a kart, then a glider: arrows either side of it (◀︎ ▶︎ on the pad too) and a lock-in
  // button for touch; on phones (no grid) drivers are picked the same way
  const what = glideStep ? 'glider' : 'kart';
  const arrows = p?.phase === 'kart' && !p.kartLock ? `<button class="karr l" data-act="kprev:${p.id}" aria-label="Previous ${what}">${CHEV_L}</button><button class="karr r" data-act="knext:${p.id}" aria-label="Next ${what}">${CHEV_R}</button><button class="kok" data-act="kok:${p.id}">Lock in ✓</button>`
    : p?.phase === 'driver' ? `<button class="karr l drv" data-act="dprev:${p.id}" aria-label="Previous driver">${CHEV_L}</button><button class="karr r drv" data-act="dnext:${p.id}" aria-label="Next driver">${CHEV_R}</button><button class="kok drv" data-act="dok:${p.id}">Lock in ✓</button>` : '';
  const sw = p?.swDir && performance.now() - p.swAt < 700 ? ` sw${p.swDir > 0 ? 'd' : 'u'}` : '';
  return `<div class="pvstep">${tag}</div>${arrows}
        <div class="pvinfo${sw}"><div class="pvfrom" style="color:${u.color}">${esc(u.name)}</div>
        <div class="pvname">${esc(glideStep ? gl.name : kartStep ? ch.vehicle : d.name)}</div>
        <div class="pvblurb">${esc(glideStep ? gl.blurb || 'Glider' : kartStep ? `${ch.form || bodyName(ch)}${ch.blurb ? ' · ' + ch.blurb : ''}` : `${d.blurb}${d.blurb ? ' · ' : ''}${d.weight[0].toUpperCase() + d.weight.slice(1)}`)}</div>
        ${standing ? '' : `<div class="pvkart">${glideStep ? `on the <b>${esc(ch.vehicle)}</b> with <b>${esc(d.name)}</b>` : kartStep ? `driven by <b>${esc(d.name)}</b>${p.phase === 'done' ? ` · <b>${esc(gl.name)}</b>` : ''}` : `in the <b>${esc(ch.vehicle)}</b>`}</div>`}
        ${glideStep ? '' : `<div class="stats big">${statBars(combinedStats(ch.stats, d))}</div>`}</div>${following ? '<div class="pvfollow">▶︎ picking now</div>' : ''}`;
}

// another screen's player: the same preview, marked as theirs (🌐 and their name), with no controls
function remoteHtml(p, d, ch, standing) {
  const kartStep = locked(p), glideStep = kartStep && p.sub === 'glider', gl = GLIDERS[p.gcur ?? 0];
  const who = `<i class="rwho" style="background:${p.color}">${p.host ? '👑 ' : '🌐 '}${esc(p.name)}</i> `;
  const tag = p.status ? `${who}<span class="rst">${esc(p.status)}</span>`
    : p.phase === 'name' ? `${who}choosing a name…` : p.phase === 'driver' ? `${who}picking a <b>driver</b>`
    : p.phase === 'kart' ? `${who}picking a <b>${glideStep ? 'glider' : 'kart'}</b>` : `${who}is ready!`;
  const u = glideStep ? gGroup(gl) : uni(d.from);
  const sw = p.swDir && performance.now() - p.swAt < 700 ? ` sw${p.swDir > 0 ? 'd' : 'u'}` : '';
  return `<div class="pvstep">${tag}</div>
        <div class="pvinfo${sw}"><div class="pvfrom" style="color:${u.color}">${esc(u.name)}</div>
        <div class="pvname">${esc(glideStep ? gl.name : kartStep ? ch.vehicle : d.name)}</div>
        ${standing ? '' : `<div class="pvkart">${glideStep ? `on the <b>${esc(ch.vehicle)}</b> with <b>${esc(d.name)}</b>` : `driven by <b>${esc(d.name)}</b>${p.phase === 'done' ? ` · <b>${esc(gl.name)}</b>` : ''}`}</div>`}
        ${glideStep ? '' : `<div class="stats big">${statBars(combinedStats(ch.stats, d))}</div>`}</div>`;
}

// Opens the select screen on game for mode ('gp' | 'race' | 'tt' | 'online'). resume: back from
// the cup / map screen with the same players still locked in. online: the room's select hooks
// (js/online/online.js).
export function showSelect(game, mode, resume = false, online = null) {
  game.mode = mode;
  // phones are single-player (extra controllers can't join); tablets and up take up to 8
  const phone = isPhone();
  const max = mode === 'tt' || phone ? 1 : MAX_PLAYERS;
  const players = [];
  const simple = !!game.settings.simple;
  const { allowedD, allowedK, allowedG } = roster(simple);
  const grid = driverGrid(allowedD, simple);
  game.setScreen(`<div class="screen select chars${simple ? ' simple' : ''}${phone ? ' phone' : ''}${online ? ' online' : ''}"><div class="panel wide xl"><h2>${TITLES[mode]} · Choose your racer</h2>
      ${online ? '<div class="olroster"></div>' : '<div class="joinbar"></div>'}
      <div class="csel">
        <div class="stage"><canvas class="pv"></canvas><div class="pvcells"></div></div>
        <div class="picks"><div class="dgrid">${grid.html}</div></div>
      </div>
      <div class="selfoot"><button class="bbtn" data-act="back">◀︎ Back</button><div class="hint2"></div><button class="bbtn go" data-act="go">Race! ▶︎</button></div></div></div>`);
  const ui = game.ui, audio = game.audio, input = game.input;
  const dcards = [...ui.querySelectorAll('.dcard')];
  const dEl = new Map(dcards.map((c) => [+c.dataset.i, c]));
  const picksEl = ui.querySelector('.picks'), gridEl = ui.querySelector('.dgrid');
  // one preview per player, each drawn into its own cell of the stage
  const stageEl = ui.querySelector('.stage'), cellsEl = ui.querySelector('.pvcells'), canvas = ui.querySelector('canvas.pv');
  const rects = () => cellRects(canvas, cellsEl);
  const show = new Showcase(canvas, { cam: [5.6, 3.6, 8.4], look: [0, 1.25, 0], spin: 0.4, cells: rects });
  game.cleanup = () => show.dispose();
  const layoutPicks = gridLayout(picksEl, gridEl, simple, grid.groupSizes, dcards.length);
  const layoutCells = cellLayout(stageEl, cellsEl);
  const view = { online, phone, allowedD, allowedK, allowedG };
  const slotKeys = [], slotHtml = [];   // what each preview cell currently shows
  // online, with 4 people or fewer in the room (desktops and tablets): the other screens' players get preview cells too,
  // after ours, live from their presence ({ remote: true, key, name, color, phase, sub, dcur, kcur,
  // gcur, stale, status }). rstate remembers each one's step, to mirror their lock-in moves.
  const remotes = () => (online ? online.previewRemotes() : []);
  const rstate = new Map();
  // phones hide the grid: drivers are stepped through with arrows instead
  const compact = () => !picksEl.offsetWidth;
  const deviceLabel = (d) => d === 'kb' ? (input.split ? 'Keys WASD' : 'Keyboard') : d === 'kb2' ? 'Keys Arrows' : d === 'touch' ? 'Touch' : input.padName(d);
  const taken = (me) => new Set([...players.filter((p) => p !== me && locked(p)).map((p) => p.dcur), ...(online ? online.taken() : [])]);
  // portraits fill in a few per frame
  const pendingD = [...ui.querySelectorAll('img[data-d]')];
  const fillImgs = (n) => { while (n-- > 0 && pendingD.length) { const img = pendingD.shift(); img.src = driverPortrait(DRIVERS[+img.dataset.d]); } };
  // a remote player's step changed: play what their own screen shows (driver lock-in jump, the
  // kart's lock-in spin and slide to the glider, the win pose)
  const remoteMoves = (p) => {
    const st = rstate.get(p.key) || {}, now = performance.now();
    const was = st.phase, wasSub = st.sub;
    let move = null;
    if (was && (was !== p.phase || wasSub !== p.sub)) {
      if ((was === 'name' || was === 'driver') && p.phase === 'kart') { st.kartAt = now + 1000; move = 'commit'; }
      else if (was === 'kart' && wasSub !== 'glider' && p.phase === 'kart' && p.sub === 'glider') { move = 'slide'; st.swAt = now; }
      else if (p.phase === 'done' && was !== 'done') move = 'win';
    } else if (!was && p.phase === 'kart') st.kartAt = 0;
    st.phase = p.phase; st.sub = p.sub;
    rstate.set(p.key, st);
    p.kartAt = st.kartAt; p.swDir = st.swAt ? 1 : 0; p.swAt = st.swAt || 0;
    return move;
  };
  const refreshStage = (cheerP) => {
    const rem = remotes();
    const list = [...(players.length ? players : [null]), ...rem];
    for (const k of [...rstate.keys()]) if (!rem.some((r) => r.key === k)) rstate.delete(k);
    const fp = followed();
    while (cellsEl.children.length > list.length) cellsEl.lastElementChild.remove();
    while (cellsEl.children.length < list.length) cellsEl.appendChild(document.createElement('div'));
    show.trim(list.length); slotKeys.length = slotHtml.length = list.length;
    ui.querySelector('.csel').classList.toggle('multi', list.length > 1);
    layoutCells();
    list.forEach((p, i) => {
      const move = p?.remote ? remoteMoves(p) : null;
      const d = DRIVERS[p ? p.dcur : 0], ch = KARTS[p ? p.kcur : 0];
      // while choosing a driver they stand on their own; the kart joins once they lock in (after
      // their lock-in jump-spin)
      const standing = !p || p.phase === 'driver' || p.phase === 'name' || (p.phase === 'kart' && performance.now() < (p.kartAt || 0));
      const key = (p ? (p.remote ? p.key : p.id) : '-') + '|' + d.id + '|' + (standing ? 'stand' : ch.id), phase = p?.phase === 'done' ? 'win' : 'pre';
      const gl = GLIDERS[p?.gcur ?? 0], glide = !standing && p?.phase === 'kart' && p.sub === 'glider';
      if (key !== slotKeys[i]) {
        const ry = show.items[i]?.m.root.rotation.y ?? 0.6;
        const sameDriver = slotKeys[i] && slotKeys[i].split('|').slice(0, 2).join('|') === key.split('|').slice(0, 2).join('|');
        show.setItem(i, { ch, driver: d, ry, phase, stand: standing, glider: gl, glide });
        slotKeys[i] = key;
        if (!sameDriver) show.play(i, 'yay');
      } else if (!standing) {
        // a new glider or the kart / glider view: changed in place (no rebuild)
        const it = show.items[i];
        if (it && it.glider !== gl) show.setGlider(i, gl);
        if (move === 'slide' && it && !it.slideFx) { show.spinCommit(i); show.play(i, 'cheer'); show.slide(i, 1, () => show.setGlide(i, true)); }
        else if (it && it.glide !== glide && !it.slideFx) show.setGlide(i, glide);
      }
      show.setPhase(i, phase);
      if (p && p === cheerP) { if (standing) show.standMove(i, 'commit'); else show.play(i, 'cheer'); audio.voice(d.voice, 'cheer', 0.9); }
      if (move === 'commit' && standing) show.standMove(i, 'commit');
      if (move === 'win') show.play(i, 'win');
      const cell = cellsEl.children[i];
      cell.className = 'pvcell' + (p && p === fp && players.length > 1 ? ' follow' : '') + (p?.remote ? ' remote' + (p.stale ? ' away' : '') : '');
      cell.style.setProperty('--pc', p ? p.color : 'rgba(255,255,255,.25)');
      const html = cellHtml(p, d, ch, p && p === fp && players.length > 1, standing, view);
      if (html !== slotHtml[i]) { cell.innerHTML = html; slotHtml[i] = html; }
    });
  };
  // the picker scrolls with the first player (in join order) still choosing a driver; once they
  // lock in, it moves on to the next one. Everyone else still sees their own preview update.
  let followEl = null;
  const followed = () => players.find((p) => p.phase === 'driver') || null;
  const follow = () => {
    const f = followed();
    const el = f ? dEl.get(f.dcur) : null;
    if (el && el !== followEl) scrollIntoPicks(picksEl, el);
    followEl = el;
  };
  const refresh = (cheerP = null) => {
    // remember what each player slot is looking at, so coming back to this screen restores it
    game.picks.chars ||= {};
    for (const p of players) game.picks.chars[p.id] = { driver: DRIVERS[p.dcur].id, kart: KARTS[p.kcur].id, glider: GLIDERS[p.gcur]?.id };
    save(PKEY, game.picks);
    for (const c of dcards) {
      const i = +c.dataset.i, here = players.filter((p) => p.dcur === i);
      c.querySelector('.tags').innerHTML = here.map((p) => `<span class="ptag${locked(p) ? ' lock' : ''}" style="background:${p.color}">P${p.id + 1}${locked(p) ? ' ✓' : ''}</span>`).join('') + (online ? online.tags(i) : '');
      c.style.outline = here.length ? `4px solid ${here[here.length - 1].color}` : '';
      c.classList.toggle('taken', players.length > 1 && players.some((p) => locked(p) && p.dcur === i) && !here.some((p) => !locked(p)));
    }
    let html = '';
    for (let s2 = 0; s2 < Math.min(max, players.length + 1); s2++) {
      const p = players[s2];
      const st = !p ? '' : p.phase === 'driver' ? 'choosing a driver…'
        : p.phase === 'kart' ? esc(DRIVERS[p.dcur].name) + (p.sub === 'glider' ? ' · choosing a glider…' : ' · choosing a kart…') : esc(DRIVERS[p.dcur].name) + ' · ' + esc(KARTS[p.kcur].vehicle) + ' · ' + esc(GLIDERS[p.gcur].name) + ' ✓';
      html += p ? `<div class="slot on" style="--pc:${p.color}"><b>P${p.id + 1}</b> ${esc(deviceLabel(p.device))}<em>${st}</em></div>`
        : `<div class="slot"><b>P${s2 + 1}</b> ${s2 === 0 ? 'Press A / Enter / tap a driver' : 'Press A to join'}</div>`;
    }
    if (!online) ui.querySelector('.joinbar').innerHTML = html;
    const ready = players.length && players.every((p) => p.phase === 'done');
    ui.querySelector('.go').classList.toggle('ready', !!ready);
    const swipe = players.length === 1 && players[0].device === 'touch';
    if (online) { online.changed(players); ui.querySelector('.hint2').innerHTML = online.hint(players); ui.querySelector('.go').innerHTML = online.goLabel(players); }
    else ui.querySelector('.hint2').innerHTML = swipe ? (ready ? 'All set! Tap <b>Race!</b>'
      : players[0].phase === 'kart' ? `Swipe <b>◀︎ ▶︎</b> to change ${players[0].sub === 'glider' ? 'glider' : 'kart'}` : 'Swipe <b>◀︎ ▶︎</b> to change driver')
      : ready ? 'All set! Press <b>A</b> / <b>Start</b> / <b>Enter</b> to race'
      : players.some((p) => p.phase === 'kart') ? '<b>◀︎ ▶︎</b> change · <b>A</b> lock it in · <b>B</b> back'
      : mode === 'tt' ? 'Time Trial is solo: beat your best time'
      : phone ? '<b>◀︎ ▶︎</b> change driver · <b>A</b> lock it in'
      : 'More players: press <b>A</b> on another controller · 2nd keyboard: <b>Right Shift</b>';
    refreshStage(cheerP);
    follow();
  };
  const join = (device) => {
    if (players.length >= max || players.some((p) => p.device === device)) return null;
    if (online && !online.canJoin(players.length)) { audio.sfx('wrong'); return null; }   // 12 people per room
    const id = [...Array(MAX_PLAYERS).keys()].find((n) => !players.some((p) => p.id === n));
    // start on this slot's picks from last time (a fresh slot starts on its own driver)
    const prev = game.picks.chars?.[id] || {};
    const di = allowedD.findIndex((i) => DRIVERS[i].id === prev.driver), ki = allowedK.findIndex((i) => KARTS[i].id === prev.kart), gi = allowedG.findIndex((i) => GLIDERS[i].id === prev.glider);
    const tk = taken(null), nD = allowedD.length;
    let pos = di >= 0 ? di : id % nD;
    for (let n = 0; n < nD && tk.has(allowedD[pos]); n++) pos = (pos + 1) % nD;
    const p = { id, device, dcur: allowedD[pos], kcur: allowedK[ki >= 0 ? ki : 0], gcur: allowedG[gi >= 0 ? gi : 0], sub: 'kart', phase: online ? 'name' : 'driver', color: PCOL[id] };
    online?.nameStart(p);
    players.push(p);
    players.sort((a, b) => a.id - b.id);
    audio.sfx('join');
    refresh();
    return p;
  };
  const go = () => {
    if (online) { online.go(players); return; }
    if (!players.length || !players.every((p) => p.phase === 'done')) return;
    audio.sfx('select');
    game.players = players.map((p) => game.makePlayer({ id: p.id, device: p.device, cursor: 0, driver: p.dcur, kart: p.kcur, glider: p.gcur, color: p.color }));
    if (mode === 'gp') game.showCups();
    else game.showTracks(mode);
  };
  const leave = (p) => {
    players.splice(players.indexOf(p), 1);
    if (p.device === 'kb2') input.split = false;
    audio.sfx('back');
    refresh();
  };
  const back = () => { input.split = false; if (online) online.back(); else game.showMain(); };
  const lockDriver = (p) => {
    if (taken(p).has(p.dcur)) { audio.sfx('wrong'); return; }
    p.phase = 'kart'; p.sub = 'kart'; p.kartLock = 0;
    p.kartAt = performance.now() + 1000;   // the kart rolls in after the lock-in jump-spin
    audio.sfx('select');
    refresh(p);
  };
  const stepDriver = (p, dir) => {
    const n = allowedD.length, tk = taken(p);
    let k = Math.max(0, allowedD.indexOf(p.dcur));
    for (let t = 0; t < n; t++) { k = (k + dir + n) % n; if (!tk.has(allowedD[k])) break; }
    p.dcur = allowedD[k];
    audio.sfx('click');
    refresh();
  };
  const stepKart = (p, dir) => {
    if (p.sub === 'glider') {
      const n = allowedG.length, k = allowedG.indexOf(p.gcur);
      p.gcur = allowedG[((k < 0 ? 0 : k) + dir + n) % n];
    } else {
      const n = allowedK.length, k = allowedK.indexOf(p.kcur);
      p.kcur = allowedK[((k < 0 ? 0 : k) + dir + n) % n];
    }
    audio.sfx('click');
    refresh();
  };
  // flip between choosing the kart and the glider: the preview slides up (dir 1, pressing down)
  // or down (dir -1) out of its cell and back in as the other view, pulled back for the glider
  const switchSub = (p, dir, to = p.sub === 'glider' ? 'kart' : 'glider') => {
    if (to === p.sub) return;
    const i = players.indexOf(p);
    audio.sfx('click');
    show.slide(i, dir, () => { p.sub = to; p.swDir = dir; p.swAt = performance.now(); refresh(); show.setGlide(i, to === 'glider'); });
  };
  // a touch player who has tapped or swiped keeps player 1 (a controller can't take it over)
  const touched = () => { for (const q of players) if (q.device === 'touch') q.acted = true; };
  // locking in the kart: a celebration spin, then the glider step slides in; locking in the
  // glider: done (offline, the last one to lock in starts the race after their win pose)
  let goAt = 0;
  const lockKart = (p) => {
    const i = players.indexOf(p);
    if (show.items[i]?.slideFx) return;   // mid-slide to the glider step
    if (p.sub !== 'glider') {
      if (p.kartLock) return;
      p.kartLock = performance.now() + 950;
      audio.sfx('select');
      show.spinCommit(i); show.play(i, 'cheer'); audio.voice(DRIVERS[p.dcur].voice, 'cheer', 0.9);
      refresh();
      return;
    }
    p.phase = 'done'; audio.sfx('select'); refresh(); show.play(i, 'win'); audio.voice(DRIVERS[p.dcur].voice, 'win', 0.9);
    if (!online && players.every((q) => q.phase === 'done')) goAt = performance.now() + 1100;
  };
  // B / Back steps back one choice: glider ready -> glider -> kart -> driver
  const stepBack = (p) => {
    goAt = 0;
    if (p.phase === 'done') { p.phase = 'kart'; p.sub = 'glider'; audio.sfx('back'); refresh(); return; }
    if (p.kartLock) { p.kartLock = 0; audio.sfx('back'); refresh(); return; }
    if (p.sub === 'glider') { audio.sfx('back'); switchSub(p, -1, 'kart'); return; }
    p.phase = 'driver'; audio.sfx('back'); refresh();
  };
  // touch: swipe a preview sideways for the previous / next driver, kart or glider (like ◀︎ ▶︎), and
  // up or down to flip between choosing the kart and the glider (like ▲ ▼). Swipes don't start on
  // its buttons, so taps on them still work.
  let swipe0 = null;
  stageEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('button')) return;
    const b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    const i = rects().findIndex((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
    swipe0 = players[i] ? { id: e.pointerId, x: e.clientX, y: e.clientY, p: players[i] } : null;
  });
  stageEl.addEventListener('pointermove', (e) => {
    const s = swipe0;
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y, ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 40) return;
    swipe0 = null;   // one step per swipe
    const p = s.p;
    if (!players.includes(p)) return;
    touched();
    if (ax > ay * 1.2) {
      const dir = dx < 0 ? 1 : -1;   // swipe left: the next one
      if (p.phase === 'driver') stepDriver(p, dir); else if (p.phase === 'kart' && !p.kartLock) stepKart(p, dir);
    }
  });
  const endSwipe = (e) => { if (swipe0?.id === e.pointerId) swipe0 = null; };
  stageEl.addEventListener('pointerup', endSwipe);
  stageEl.addEventListener('pointercancel', endSwipe);
  game.screen = {
    update: (dt) => {
      fillImgs(3);
      if (players.some((p) => p.kartAt && performance.now() >= p.kartAt)) { for (const p of players) if (p.kartAt && performance.now() >= p.kartAt) p.kartAt = 0; refresh(); }
      for (const st of rstate.values()) if (st.kartAt && performance.now() >= st.kartAt) { st.kartAt = 0; refreshStage(); }
      // after the kart's lock-in spin, on to the glider
      for (const p of players) if (p.kartLock && performance.now() >= p.kartLock && p.phase === 'kart') { p.kartLock = 0; switchSub(p, 1, 'glider'); }
      if (goAt && performance.now() >= goAt) { goAt = 0; if (players.length && players.every((p) => p.phase === 'done')) { go(); return; } }
      layoutPicks();
      layoutCells();
      show.update(dt);
      // online: the name keyboard has the controls while it's open
      if (online?.modal) { online.modalUpdate(); return; }
      if (players.length < max && players.some((p) => p.device === 'kb') && !players.some((p) => p.device === 'kb2') && input.edge && KB2_JOIN.some((k) => input.edge.has(k))) {
        input.split = true; join('kb2');
      }
      for (const [dev, m] of game.menuEvents) {
        let p = players.find((q) => q.device === dev);
        if (p && (m.ok || m.start || m.back || m.up || m.down || m.left || m.right)) p.acted = true;
        if (!p) {
          // a controller that only just showed up takes over an untouched keyboard player 1
          if ((m.ok || m.start) && dev.startsWith('pad') && players.length === 1 && !players[0].acted && !players[0].device.startsWith('pad')) {
            players[0].device = dev; players[0].acted = true; audio.sfx('join'); refresh(); continue;
          }
          if (m.ok || m.start) {
            if (players.length === 0 && dev === 'kb2') continue;
            p = join(dev);
          } else if (m.back && players.length === 0) { back(); return; }
          continue;
        }
        const dx = m.left ? -1 : m.right ? 1 : 0, dy = m.up ? -1 : m.down ? 1 : 0;
        if (p.phase === 'name') {
          if (dy) { online.nameMove(p, dy); audio.sfx('click'); refresh(); }
          if (m.x) { online.nameDelete(p); refresh(); }
          if (m.ok || m.start) { audio.sfx('select'); online.nameAccept(p, () => { p.phase = 'driver'; refresh(); }); continue; }
          if (m.back) { if (p === players[0]) { back(); return; } leave(p); }
          continue;
        }
        if (p.phase === 'driver') {
          if (compact()) { if (dx) stepDriver(p, dx); }
          else if (dx || dy) { p.dcur = moveIn(dcards, p.dcur, dx, dy, (c) => +c.dataset.i); audio.sfx('click'); refresh(); }
          if (m.ok) { lockDriver(p); continue; }
          if (m.back) { if (online) { p.phase = 'name'; audio.sfx('back'); refresh(); continue; } if (p === players[0]) { back(); return; } leave(p); continue; }
        } else if (p.phase === 'kart') {
          if (m.back) { stepBack(p); continue; }
          if (p.kartLock) continue;
          if (dx) stepKart(p, dx);
          if (m.ok) { lockKart(p); continue; }
        } else {
          if (m.back) { stepBack(p); continue; }
          if (m.ok || m.start) { go(); return; }
        }
        if (m.start) go();
      }
    },
    // mouse / touch: tapping a driver locks it in (or swaps it for one already choosing a kart)
    click: (i) => {
      let p = players.find((q) => q.device === 'touch' || q.device === 'kb') || players[0];
      if (!p) p = join(isTouchDevice() ? 'touch' : 'kb');
      touched();
      if (!p || taken(p).has(i)) return;
      if (online && p.phase === 'name') online.nameQuick(p);   // tapping a driver keeps the highlighted name
      p.dcur = i; p.phase = 'driver';
      lockDriver(p);
    },
    act: (a) => {
      touched();
      // the Back button steps back one stage for the mouse / touch player: ready -> kart -> driver -> menu
      if (a.startsWith('ol')) { online?.act(a, players, refresh); return; }
      if (a === 'back') {
        const p = players.find((q) => q.device === 'touch' || q.device === 'kb') || players[0];
        if (p && online && p.phase === 'driver') { p.phase = 'name'; audio.sfx('back'); refresh(); return; }
        if (p && p.phase !== 'driver' && p.phase !== 'name') stepBack(p); else back();
        return;
      }
      if (a === 'go') go();
      const [cmd, id] = a.split(':'), p = players.find((q) => q.id === +id);
      if (p?.phase === 'driver') {
        if (cmd === 'dprev') stepDriver(p, -1);
        if (cmd === 'dnext') stepDriver(p, 1);
        if (cmd === 'dok') lockDriver(p);
      }
      if (!p || p.phase !== 'kart' || p.kartLock) return;
      if (cmd === 'kprev') stepKart(p, -1);
      if (cmd === 'knext') stepKart(p, 1);
      if (cmd === 'kok') lockKart(p);
    },
  };
  if (online) online.mount(ui, refresh);
  if (resume && game.players?.length) {
    // back from the cup / map screen: the same players, still locked in
    for (const q of game.players) {
      if (players.length >= max) break;
      players.push({ id: q.id, device: q.device, dcur: q.driverIndex ?? allowedD[0], kcur: q.kartIndex ?? allowedK[0], gcur: q.gliderIndex ?? allowedG[0], sub: 'glider', phase: 'done', color: q.color, acted: true, olName: q.olName });
    }
    refresh();
  } else join(game.p1Device());
  refresh();
}
