// Brick Kart workbench: choose the drivers, karts and gliders for Simplified mode and export them as
// JSON. The selection starts from the set in js/simplified.js (everything when that's null).
// Each card also has a bin button that marks it for removal from the game entirely; the marks
// go in the export as "remove" and are kept in this browser until Reset.
import { DRIVERS, UNIVERSES } from '../js/driver.js';
import { KARTS, KART_GROUPS } from '../js/vehicles.js';
import { GLIDERS, GLIDER_GROUPS } from '../js/gliders.js';
import { SIMPLIFIED } from '../js/simplified.js';
import { driverPortrait, kartPortrait, gliderPortrait } from '../js/showcase.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = (c) => '#' + (c ?? 0xffffff).toString(16).padStart(6, '0');

// what the game uses now
const base = {
  drivers: new Set(SIMPLIFIED.drivers ?? DRIVERS.map((d) => d.id)),
  karts: new Set(SIMPLIFIED.karts ?? KARTS.map((k) => k.id)),
  gliders: new Set(SIMPLIFIED.gliders ?? GLIDERS.map((g) => g.id)),
};
const KINDS = ['drivers', 'karts', 'gliders'];
const LIST = { drivers: DRIVERS, karts: KARTS, gliders: GLIDERS };
const nameOf = (kind, it) => (kind === 'karts' ? it.vehicle : it.name);
const sel = { drivers: new Set(base.drivers), karts: new Set(base.karts), gliders: new Set(base.gliders) };
// suggested removals from the game (never also selected)
const del = { drivers: new Set(), karts: new Set(), gliders: new Set() };
const KEY = 'brick-kart-workbench-remove';
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  for (const kind of KINDS) for (const id of saved?.[kind] || []) {
    if (!LIST[kind].some((x) => x.id === id)) continue; // gone since
    del[kind].add(id); sel[kind].delete(id);
  }
} catch { /* storage unavailable: start clean */ }
const saveDel = () => { try { localStorage.setItem(KEY, JSON.stringify({ drivers: [...del.drivers], karts: [...del.karts], gliders: [...del.gliders] })); } catch { /* ignore */ } };
const BIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';

const groups = {
  drivers: UNIVERSES.map((u) => ({ id: u.id, name: u.name, color: u.color, items: DRIVERS.filter((d) => d.from === u.id) })),
  // karts by pack, in the order the game lists them
  karts: KART_GROUPS.map((g) => ({ id: g.id, name: g.name, color: '#f2cd37', items: KARTS.filter((k) => k.group === g.id) })),
  gliders: GLIDER_GROUPS.map((g) => ({ id: g.id, name: g.name, color: g.color, items: GLIDERS.filter((x) => x.group === g.id) })),
};

const cardHtml = (kind, it) => `<div class="card${kind !== 'drivers' ? ' kart' : ''}" tabindex="0" role="checkbox" data-kind="${kind}" data-id="${esc(it.id)}"
  style="--c:${hex(kind === 'karts' ? it.kart : kind === 'gliders' ? it.colors?.[0] : it.color)}"><img alt="" data-src="${kind}:${esc(it.id)}"><span>${esc(nameOf(kind, it))}</span><div class="chk">✓</div>
  <button class="bin" type="button" tabindex="-1" title="Mark for removal from the game" aria-label="Mark ${esc(nameOf(kind, it))} for removal">${BIN}</button></div>`;

function build(kind) {
  $('#' + kind).innerHTML = groups[kind].filter((g) => g.items.length).map((g) => `
    <section data-group="${g.id}"><div class="ghead" style="--gc:${g.color}"><h2>${esc(g.name)}</h2><span></span>
      <button data-gall="${kind}:${g.id}">All</button><button data-gnone="${kind}:${g.id}">None</button></div>
    <div class="grid">${g.items.map((it) => cardHtml(kind, it)).join('')}</div></section>`).join('');
}
for (const kind of KINDS) build(kind);

function refresh() {
  for (const c of document.querySelectorAll('.card')) {
    const on = sel[c.dataset.kind].has(c.dataset.id), gone = del[c.dataset.kind].has(c.dataset.id);
    c.classList.toggle('off', !on && !gone);
    c.classList.toggle('del', gone);
    c.setAttribute('aria-checked', on);
    const bin = c.querySelector('.bin');
    bin.title = gone ? 'Keep it in the game (undo removal)' : 'Mark for removal from the game';
    bin.setAttribute('aria-pressed', gone);
  }
  for (const kind of KINDS) {
    for (const g of groups[kind]) {
      const sp = document.querySelector(`#${kind} [data-group="${g.id}"] .ghead span`);
      const n = g.items.filter((it) => del[kind].has(it.id)).length;
      if (sp) sp.textContent = `${g.items.filter((it) => sel[kind].has(it.id)).length} / ${g.items.length}${n ? ` · 🗑 ${n}` : ''}`;
    }
  }
  const nDel = del.drivers.size + del.karts.size + del.gliders.size;
  $('#count').innerHTML = `<b>${sel.drivers.size}</b> / ${DRIVERS.length} characters · <b>${sel.karts.size}</b> / ${KARTS.length} karts · <b>${sel.gliders.size}</b> / ${GLIDERS.length} gliders`
    + (nDel ? ` · <i title="${del.drivers.size} characters, ${del.karts.size} karts, ${del.gliders.size} gliders marked for removal">🗑 ${nDel} to remove</i>` : '');
}
refresh();

// tapping a card marked for removal takes the mark off (it comes back unselected)
const toggle = (card) => {
  const kind = card.dataset.kind, set = sel[kind], id = card.dataset.id;
  if (del[kind].delete(id)) saveDel();
  else if (set.has(id)) set.delete(id); else set.add(id);
  refresh();
};
const trash = (card) => {
  const kind = card.dataset.kind, id = card.dataset.id;
  const name = card.querySelector('span').textContent;
  if (del[kind].delete(id)) toast(`${name} stays in the game`);
  else { del[kind].add(id); sel[kind].delete(id); toast(`${name} marked for removal`); }
  saveDel(); refresh();
};
document.addEventListener('click', (e) => {
  const bin = e.target.closest('.bin');
  if (bin) { trash(bin.closest('.card')); return; }
  const card = e.target.closest('.card');
  if (card) { toggle(card); return; }
  const t = e.target.closest('[data-tab]');
  if (t) {
    for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b === t);
    for (const kind of KINDS) $('#' + kind).classList.toggle('hidden', t.dataset.tab !== kind);
    return;
  }
  const g = e.target.closest('[data-gall], [data-gnone]');
  if (g) {
    const [kind, gid] = (g.dataset.gall || g.dataset.gnone).split(':');
    for (const it of groups[kind].find((x) => x.id === gid).items) { if (g.dataset.gall) { if (!del[kind].has(it.id)) sel[kind].add(it.id); } else sel[kind].delete(it.id); }
    refresh();
  }
});
document.addEventListener('keydown', (e) => {
  const card = e.target.closest?.('.card');
  if (card && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); toggle(card); }
  if (card && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); trash(card); }
});

// the visible tab's buttons act on that tab
const activeKind = () => KINDS.find((k) => !$('#' + k).classList.contains('hidden')) || 'drivers';
$('#all').onclick = () => { const k = activeKind(); for (const it of LIST[k]) if (!del[k].has(it.id)) sel[k].add(it.id); refresh(); };
$('#none').onclick = () => { sel[activeKind()].clear(); refresh(); };
$('#reset').onclick = () => {
  for (const kind of KINDS) { sel[kind] = new Set(base[kind]); del[kind].clear(); }
  saveDel();
  refresh(); toast('Back to the set in the game, no removals');
};

// export in game order
const payload = () => ({
  game: 'brick-kart',
  kind: 'simplified-roster',
  exported: new Date().toISOString(),
  drivers: DRIVERS.filter((d) => sel.drivers.has(d.id)).map((d) => d.id),
  karts: KARTS.filter((k) => sel.karts.has(k.id)).map((k) => k.id),
  gliders: GLIDERS.filter((g) => sel.gliders.has(g.id)).map((g) => g.id),
  // suggested removals from the game entirely (with names, so the list reads on its own)
  remove: {
    drivers: DRIVERS.filter((d) => del.drivers.has(d.id)).map((d) => ({ id: d.id, name: d.name })),
    karts: KARTS.filter((k) => del.karts.has(k.id)).map((k) => ({ id: k.id, name: k.vehicle })),
    gliders: GLIDERS.filter((g) => del.gliders.has(g.id)).map((g) => ({ id: g.id, name: g.name })),
  },
});
$('#export').onclick = () => {
  const p = payload();
  if (!p.drivers.length || !p.karts.length || !p.gliders.length) { toast('Pick at least one character, kart and glider'); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'brick-kart-simplified.json' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  const n = p.remove.drivers.length + p.remove.karts.length + p.remove.gliders.length;
  toast(`Exported ${p.drivers.length} characters, ${p.karts.length} karts and ${p.gliders.length} gliders${n ? `, ${n} to remove` : ''}`);
};
$('#copy').onclick = async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(payload(), null, 2)); toast('JSON copied'); } catch { toast('Copy failed: use Export instead'); }
};

let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

// portraits render a few per frame (the visible tab first)
const imgs = [...document.querySelectorAll('img[data-src]')];
function fill() {
  const kind = activeKind();
  for (let n = 0; n < 3; n++) {
    const i = imgs.findIndex((im) => im.closest('#' + kind));
    const img = imgs.splice(i >= 0 ? i : 0, 1)[0];
    if (!img) return;
    const [k, id] = img.dataset.src.split(':');
    img.src = k === 'drivers' ? driverPortrait(DRIVERS.find((d) => d.id === id)) : k === 'gliders' ? gliderPortrait(GLIDERS.find((x) => x.id === id)) : kartPortrait(KARTS.find((x) => x.id === id));
  }
  requestAnimationFrame(fill);
}
requestAnimationFrame(fill);
