// Online menus: the Online screen (open games, Host a game, Retry), joining (choose your
// character first, then your name, then step into the host's world), and the names every player
// shows over their head.
//
// Names: each local player (P1, P2…) picks the name they play under: Default (their sorcerer:
// "Gojo", "Gojo 2" when someone in the game is already Gojo), one of the names saved on this
// device, or "+ New name…" (an on-screen keyboard that works with a controller, or type with a
// real keyboard / the phone's own keyboard; up to 16 characters; saved for next time). The
// highlight starts on what that player slot used last time, so pressing A straight through keeps
// it. X (or Delete) on a saved name forgets it.
import { h, toast } from '../ui/ui.js';
import { openSelect, openTitle } from '../ui/screens.js';
import { SORCERERS } from '../sorcerers/index.js';
import { PLAYER_COLORS } from '../entities/player.js';
import { isMobile } from '../util.js';
import { listGames, cleanName, MAX_PLAYERS, CAPACITY } from './session.js';
import { hostGame, connectAsGuest, reasonText } from './net.js';

const KEY = 'cd.online.names.v1';
const MAX_SAVED = 12;

export class Names {
  constructor() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* storage unavailable */ }
    this.saved = Array.isArray(d.saved) ? d.saved.filter((n) => typeof n === 'string').map((n) => cleanName(n)).slice(0, MAX_SAVED) : [];
    this.last = d.last && typeof d.last === 'object' ? d.last : {};
  }
  store() { try { localStorage.setItem(KEY, JSON.stringify({ saved: this.saved, last: this.last })); } catch { /* storage unavailable */ } }
  options() { return ['default', ...this.saved, 'new']; }
  startIndex(slot) {
    const l = this.last[slot], opts = this.options();
    const i = typeof l === 'string' ? opts.indexOf(l) : -1;
    return i > 0 && i < opts.length - 1 ? i : 0;
  }
  remember(slot, choice) { this.last[slot] = choice; this.store(); }
  add(name) {
    name = cleanName(name);
    this.saved = [name, ...this.saved.filter((n) => n !== name)].slice(0, MAX_SAVED);
    this.store();
    return name;
  }
  remove(name) {
    this.saved = this.saved.filter((n) => n !== name);
    for (const k of Object.keys(this.last)) if (this.last[k] === name) this.last[k] = 'default';
    this.store();
  }
}

// controller buttons this frame (edges are worked out by the caller)
const readPad = (pad) => ({
  a: !!pad.buttons[0]?.pressed, b: !!pad.buttons[1]?.pressed, x: !!pad.buttons[2]?.pressed, s: !!pad.buttons[9]?.pressed,
  u: !!pad.buttons[12]?.pressed || pad.axes[1] < -0.6, d: !!pad.buttons[13]?.pressed || pad.axes[1] > 0.6,
  l: !!pad.buttons[14]?.pressed || pad.axes[0] < -0.6, r: !!pad.buttons[15]?.pressed || pad.axes[0] > 0.6,
});
function padEdges(game, prev) {
  const out = [];
  for (const pad of game.input.pads()) {
    const id = 'pad' + pad.index, b = readPad(pad), p = prev[id] ?? b;
    prev[id] = b;
    const e = { device: id, ok: b.a && !p.a, back: b.b && !p.b, x: b.x && !p.x, start: b.s && !p.s, up: b.u && !p.u, down: b.d && !p.d, left: b.l && !p.l, right: b.r && !p.r };
    if (Object.values(e).some((v) => v === true)) out.push(e);
  }
  return out;
}
const silence = (m) => Object.assign(m, { up: false, down: false, left: false, right: false, confirm: false, back: false, start: false });

// ------------------------------------------------------------------ the Online screen
export function openOnline(game, o = {}) {
  if (o.host) { hostFromGame(game); return; }
  openLobby(game);
}
function lastRoom() { try { return sessionStorage.getItem('cd.online.last'); } catch { return null; } }

function openLobby(game, msg = null) {
  const ui = game.ui;
  let rooms = null, err = null, stop = false, timer = null, polling = false;
  const poll = async () => {
    if (stop || polling) return;
    polling = true; clearTimeout(timer);
    const key = () => JSON.stringify([rooms?.map((r) => [r.id, r.title, r.count, r.capacity]), !!err]);
    const before = key();
    try { rooms = await listGames(); err = null; } catch (e) { err = e; rooms = null; }
    polling = false;
    if (stop) return;
    if (ui.isOpen('online') && key() !== before) ui.refresh('online');   // (only when the list changed)
    timer = setTimeout(poll, document.hidden ? 15000 : 4000);   // (each check costs the relay a request)
  };
  const back = () => { ui.close('online'); openTitle(game); };
  ui.open('online', (el) => {
    const list = h('div', { class: 'ol-list' });
    if (err) list.append(h('div', { class: 'ol-msg warn' }, 'Can’t reach the online service right now.'), h('button', { class: 'btn small', 'data-autofocus': true, onclick: () => { err = null; rooms = null; ui.refresh('online'); poll(); } }, '↻ Retry'));
    else if (rooms === null) list.append(h('div', { class: 'ol-msg' }, 'Looking for games…'));
    else if (!rooms.length) list.append(h('div', { class: 'ol-msg' }, 'No open games right now. Host one, or wait here — the list updates by itself.'));
    else for (const r of rooms) {
      const full = r.count >= Math.min(CAPACITY, r.capacity);
      list.append(h('button', { class: 'mission ol-room' + (full ? ' locked' : ''), onclick: () => { if (full) { toast('That game is full'); return; } ui.close('online'); joinFlow(game, r); } },
        h('div', { class: 'mi' }, r.id === lastRoom() ? '↩' : '🌐'),
        h('div', {}, h('div', { class: 'mt' }, r.title), h('div', { class: 'md' }, `${r.count} screen${r.count === 1 ? '' : 's'} connected · up to ${MAX_PLAYERS} players${r.id === lastRoom() ? ' · you were here' : ''}`)),
        h('div', { class: 'diff' }, full ? 'Full' : 'Join ▶')));
    }
    el.appendChild(h('div', { class: 'panel', style: 'width:min(620px,96vw)' },
      h('h2', {}, '🌐 Online'),
      h('div', { class: 'hint', style: 'margin:0 0 10px' }, `Play in a friend's world, or host yours. Up to ${MAX_PLAYERS} players: every screen can bring its own players (keyboard + controllers), and people can join and leave at any time.`),
      msg ? h('div', { class: 'ol-msg warn' }, msg) : null,
      h('button', { class: 'btn primary', 'data-autofocus': !err, onclick: () => { ui.close('online'); hostFromTitle(game); } }, '＋ Host a game'),
      h('h3', {}, 'Open games'), list,
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' }, h('button', { class: 'btn', onclick: back }, 'Back'))));
  }, { dim: true, onBack: back, onClose: () => { stop = true; clearTimeout(timer); } });
  poll();
}

// ------------------------------------------------------------------ hosting
function hostFromTitle(game) {
  openSelect(game, {
    startLabel: 'Host & enter ▶', autoStartWhenReady: false,
    onBack: () => openLobby(game),
    onStart: (list) => openNames(game, list.map((l, i) => ({ ...l, slot: i })), {
      title: 'Your online names', confirmLabel: 'Open my game ▶',
      onBack: () => hostFromTitle(game),
      onDone: async (names) => {
        game.beginSession(list, { online: true });
        game.players.forEach((p, i) => { p.netName = names[i]; });
        await hostGame(game, names);
      },
    }),
  });
}
function hostFromGame(game) {
  if (game.net) return;
  const entries = game.players.map((p, i) => ({ device: p.device, sorcerer: p.sorcerer, slot: i }));
  if (!entries.length) return;
  openNames(game, entries, {
    title: 'Host online: your names', confirmLabel: 'Open my game ▶',
    onBack: () => { game.paused = false; game.last = performance.now(); },
    onDone: (names) => { game.paused = false; game.last = performance.now(); hostGame(game, names); },
  });
}

// ------------------------------------------------------------------ joining
function joinFlow(game, room) {
  const ui = game.ui;
  let cancelled = false, net = null;
  const toLobby = (msg) => {
    for (const id of ['connecting', 'select', 'names']) ui.close(id);
    game.exitSelectView?.();
    if (net) { try { net.close(); } catch { /* gone */ } if (game.net === net) game.net = null; net = null; }
    openLobby(game, msg);
  };
  ui.open('connecting', (el) => {
    el.appendChild(h('div', { class: 'panel', style: 'text-align:center;min-width:300px' },
      h('h2', {}, 'Joining…'), h('div', { class: 'hint' }, room.title),
      h('button', { class: 'btn', 'data-autofocus': true, onclick: () => { cancelled = true; toLobby(); } }, 'Cancel')));
  }, { dim: true, onBack: () => { cancelled = true; toLobby(); } });
  connectAsGuest(game, room, (msg) => { if (!net?.entered) toLobby(msg); }).then((n) => {
    net = n;
    if (cancelled) { toLobby(); return; }
    ui.close('connecting');
    if (net.roomPlayers() >= MAX_PLAYERS) { toLobby(`${net.hostName}'s game is full (${MAX_PLAYERS} players)`); return; }
    try { sessionStorage.setItem('cd.online.last', room.id); } catch { /* storage unavailable */ }
    chooseCharacter();
  }).catch((e) => { if (!cancelled) toLobby(`Couldn't join: ${reasonText(e?.message)}`); });

  const header = () => `🌐 Joining ${net.hostName}'s game · ${net.hostRegionName()} · ${net.roomPlayers()}/${MAX_PLAYERS} players`;
  let headerTimer = null;
  const chooseCharacter = () => {
    openSelect(game, {
      header, startLabel: 'Next: your name ▶', autoStartWhenReady: true,
      maxSlots: () => MAX_PLAYERS - (net?.roomPlayers() ?? 0),
      onBack: () => toLobby(),
      onStart: (list) => chooseNames(list),
    });
    clearInterval(headerTimer);
    headerTimer = setInterval(() => {
      if (!net || net.entered || !ui.isOpen('select')) { clearInterval(headerTimer); return; }
      const el = document.querySelector('#scr-select .select-online'); if (el) el.textContent = header();
    }, 1000);
  };
  const chooseNames = (list) => {
    if (!net || net.s.ended) { toLobby('The game closed.'); return; }
    if (net.roomPlayers() + list.length > MAX_PLAYERS) { toast(`Only ${MAX_PLAYERS - net.roomPlayers()} more can join ${net.hostName}'s game`, 'big'); chooseCharacter(); return; }
    openNames(game, list.map((l, i) => ({ ...l, slot: i })), {
      title: `Your names in ${net.hostName}'s game`, confirmLabel: `Join ${net.hostName}'s game ▶`,
      taken: () => net?.takenNames() ?? new Set(),
      onBack: () => chooseCharacter(),
      onDone: async (names) => {
        if (!net || net.s.ended) { toLobby('The game closed.'); return; }
        try { await net.enterAsGuest(list, names); }
        catch (e) { console.warn('online: join', e); toLobby(e?.message === 'full' ? `${net?.hostName ?? 'The'}'s game is full (${MAX_PLAYERS} players)` : `Couldn't join: ${reasonText(e?.message)}`); }
      },
    });
  };
}

// ------------------------------------------------------------------ the name step
// entries: [{ device, sorcerer, slot }]; o: { title, confirmLabel, taken: Set | () => Set, onDone(names), onBack() }
export function openNames(game, entries, o = {}) {
  const ui = game.ui, N = new Names();
  game.paused = true;
  const rows = entries.map((e) => ({ ...e, idx: N.startIndex(e.slot), ready: false }));
  let kb = null, done = false;
  const taken = () => { const t = typeof o.taken === 'function' ? o.taken() : o.taken; return t instanceof Set ? t : new Set(); };
  const opt = (r) => N.options()[Math.min(r.idx, N.options().length - 1)];
  // what each row is called right now (defaults numbered past the names already taken)
  const resolve = () => {
    const used = new Set(taken()), out = [];
    for (const r of rows) {
      const c = opt(r);
      let n;
      if (c === 'default' || c === 'new') {
        const base = SORCERERS[r.sorcerer]?.name ?? 'Sorcerer';
        n = base;
        for (let i = 2; used.has(n) && i < 30; i++) n = `${base} ${i}`;
      } else n = c;
      used.add(n); out.push(n);
    }
    return out;
  };
  const finish = () => {
    if (done) return;
    if (kb) return;
    done = true;
    const names = resolve();
    rows.forEach((r) => { const c = opt(r); N.remember(r.slot, c === 'new' ? 'default' : c); });
    ui.close('names');
    o.onDone?.(names);
  };
  const back = () => { if (kb) { kb.finish(false); return; } done = true; ui.close('names'); o.onBack?.(); };
  const step = (r, d) => { if (r.ready) return; const n = N.options().length; r.idx = (r.idx + d + n) % n; game.audio?.ui('move'); ui.refresh('names'); };
  const confirm = (r) => {
    if (opt(r) === 'new') { openKeyboard(r); return; }
    r.ready = !r.ready;
    game.audio?.ui(r.ready ? 'buy' : 'back');
    if (rows.every((x) => x.ready)) { finish(); return; }
    ui.refresh('names');
  };
  const forget = (r) => {
    const c = opt(r);
    if (c === 'default' || c === 'new' || r.ready) return;
    N.remove(c); r.idx = 0;
    toast(`Forgot "${c}"`); ui.refresh('names');
  };
  const openKeyboard = (r) => {
    const el = document.getElementById('scr-names'); if (!el) return;
    kb = new NameKeyboard(game, el, r, PLAYER_COLORS[rows.indexOf(r)], (name) => {
      kb = null;
      if (name) { N.add(name); r.idx = N.options().indexOf(name); r.ready = true; if (rows.every((x) => x.ready)) { finish(); return; } }
      ui.refresh('names');
    });
  };
  const prev = {};
  for (const pad of game.input.pads()) prev['pad' + pad.index] = readPad(pad);
  if (/[?&]debug\b/.test(location.search)) window.__names = { rows, resolve, get kb() { return kb; }, get done() { return done; } };   // (buttons still held from the last screen don't count)
  ui.open('names', (el) => {
    const names = resolve();
    const list = h('div', { class: 'ol-names' });
    rows.forEach((r, i) => {
      const c = opt(r), pc = PLAYER_COLORS[i];
      const dev = r.device === 'kbm' ? 'KEYBOARD' : r.device === 'touch' ? 'TOUCH' : 'CONTROLLER';
      const label = c === 'default' ? `${names[i]}` : c === 'new' ? '+ New name…' : c;
      list.append(h('div', { class: 'ol-name' + (r.ready ? ' ready' : ''), style: `--pc:${pc}` },
        h('div', { class: 'pn' }, `P${i + 1} · ${dev} · ${SORCERERS[r.sorcerer]?.name ?? ''}`),
        h('div', { class: 'ol-pick' },
          h('button', { class: 'btn small', 'data-nonav': true, onclick: () => step(r, -1) }, '◀'),
          h('button', { class: 'ol-label', 'data-nonav': true, onclick: () => confirm(r) }, h('small', {}, c === 'default' ? 'Default' : c === 'new' ? '' : 'Saved'), label),
          h('button', { class: 'btn small', 'data-nonav': true, onclick: () => step(r, 1) }, '▶')),
        h('div', { class: 'hint', style: 'margin:2px 0 0' }, r.ready ? '✔ Ready' : c === 'new' ? 'A: type a name' : `A: OK · ◀ ▶ other names${c !== 'default' ? ' · X forget' : ''}`)));
    });
    el.appendChild(h('div', { class: 'panel', style: 'width:min(560px,96vw)' },
      h('h2', {}, o.title ?? 'Your online name'),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, 'Everyone sees this name over your head. Keep the default or choose another — press A (Enter) to go on.'),
      list,
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' },
        h('button', { class: 'btn', onclick: back }, 'Back'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: finish }, o.confirmLabel ?? 'OK ▶'))));
  }, {
    dim: true, onBack: back,
    onNav: (m) => {
      // each controller drives its own row; the keyboard drives the keyboard player's row (or P1's)
      const kbRow = rows.find((r) => r.device === 'kbm') ?? rows.find((r) => r.device === 'touch') ?? rows[0];
      const events = padEdges(game, prev);
      const k = m.keyboard ?? {};
      if (k.up || k.down || k.left || k.right || k.confirm || k.back || m.keyboard?.x) events.push({ device: 'kbm', ok: k.confirm, back: k.back, left: k.left, right: k.right, up: k.up, down: k.down, start: false, x: false });
      if (game.input.keys.has('Delete') && !prev.del) events.push({ device: 'kbm', x: true });
      prev.del = game.input.keys.has('Delete');
      silence(m);
      for (const e of events) {
        if (kb) { if (e.device === kb.r.device || (e.device === 'kbm' && kb.r === kbRow)) kb.nav(e); continue; }
        const r = e.device === 'kbm' ? kbRow : rows.find((x) => x.device === e.device);
        if (!r) continue;
        if (e.left) step(r, -1);
        if (e.right) step(r, 1);
        if (e.x) forget(r);
        if (e.ok) { confirm(r); if (done) return; }
        if (e.start && r === rows[0]) { finish(); return; }
        if (e.back) { if (r.ready) { r.ready = false; ui.refresh('names'); } else if (r === rows[0]) { back(); return; } }
      }
    },
    onClose: () => { if (kb) { kb.el.remove(); kb = null; } },
  });
}

// ------------------------------------------------------------------ on-screen keyboard
const KROWS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ-.!?', '0123456789', ['␣', '⌫', 'OK']];
class NameKeyboard {
  constructor(game, root, r, color, done) {
    this.game = game; this.r = r; this.done = done;
    this.row = 0; this.col = 0;
    const el = this.el = h('div', { class: 'olkbd-back' });
    const box = h('div', { class: 'olkbd', style: `--pc:${color}` });
    box.append(h('h3', {}, 'Type your name'));
    this.input = h('input', { class: 'olkbd-in', maxlength: 16, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'words', placeholder: 'Your name' });
    box.append(this.input);
    this.btns = [];
    KROWS.forEach((row, ri) => {
      const rowEl = h('div', { class: 'olkrow' });
      [...row].forEach((key, ci) => {
        const b = h('button', { class: 'olkey' + (key.length > 1 || key === '␣' || key === '⌫' ? ' wide' : ''), 'data-nonav': true, onclick: () => { this.row = ri; this.col = ci; this.mark(); this.press(ri, ci); } }, key);
        rowEl.append(b); this.btns.push(b);
      });
      box.append(rowEl);
    });
    box.append(h('div', { class: 'olkhint' }, h('span', {}, h('b', {}, 'A'), ' type'), h('span', {}, h('b', {}, 'X'), ' delete'), h('span', {}, h('b', {}, 'Start'), ' done'), h('span', {}, h('b', {}, 'B'), ' back')));
    el.append(box);
    root.appendChild(el);
    // a real keyboard (or the phone's) types straight into the field
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this.finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); this.finish(false); }
    });
    if (!r.device.startsWith('pad')) setTimeout(() => this.input.focus(), 30);
    this.mark();
  }
  rowLen(r) { return KROWS[r].length; }
  key(r, c) { return KROWS[r][c]; }
  mark() {
    const n = KROWS.slice(0, this.row).reduce((a, row) => a + row.length, 0) + this.col;
    this.btns.forEach((b, i) => b.classList.toggle('focus', i === n));
  }
  press(r, c) {
    const k = this.key(r, c), v = this.input.value;
    if (k === 'OK') { this.finish(true); return; }
    if (k === '⌫') this.input.value = v.slice(0, -1);
    else if (v.length < 16) { const ch = k === '␣' ? ' ' : k; this.input.value = v + (!v || v.endsWith(' ') ? ch : ch.toLowerCase()); }
    this.game.audio?.ui('move');
  }
  nav(e) {
    if (document.activeElement === this.input && e.device === 'kbm') return;   // typing
    if (e.up) this.row = (this.row + KROWS.length - 1) % KROWS.length;
    if (e.down) this.row = (this.row + 1) % KROWS.length;
    this.col = Math.min(this.col, this.rowLen(this.row) - 1);
    if (e.left) this.col = (this.col + this.rowLen(this.row) - 1) % this.rowLen(this.row);
    if (e.right) this.col = (this.col + 1) % this.rowLen(this.row);
    if (e.up || e.down || e.left || e.right) this.mark();
    if (e.ok) this.press(this.row, this.col);
    if (e.x) this.press(4, 1);
    if (e.start) { this.finish(true); return; }
    if (e.back) { if (this.input.value) this.press(4, 1); else this.finish(false); }
  }
  finish(ok) {
    if (this.closed) return;
    const name = this.input.value.trim();
    if (ok && !name) { this.game.audio?.ui('back'); return; }
    this.closed = true;
    this.el.remove();
    this.game.audio?.ui(ok ? 'buy' : 'back');
    this.done(ok ? cleanName(name) : null);
  }
}
void isMobile;
