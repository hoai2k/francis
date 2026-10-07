// DOM UI: HUD, menus with gamepad/keyboard navigation, dialogue, toasts,
// floating combat text, spell wheel, objective marker.
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from './state.js';
import { SPELLS, SPELL_BY_ID, spellIcon } from './spelldata.js';
import { glyph } from './input.js';
import { el, clamp, sleep } from './util.js';
import { currentLoadout, slotCount, levelProgress, masteryLevel, today, unreadLetters } from './progress.js';

const _v = new THREE.Vector3();

export function crestSVG(house, size = 40) {
  const h = HOUSES[house];
  if (!h) return '';
  const inner = {
    lion: '<circle cx="32" cy="30" r="11" fill="C2"/><path d="M20 30a12 12 0 0 1 24 0" stroke="C2" stroke-width="5" fill="none"/>',
    serpent: '<path d="M22 46c22-4-6-16 14-26 6-3 6-8 0-8" stroke="C2" stroke-width="5" fill="none" stroke-linecap="round"/>',
    eagle: '<path d="M32 14l4 8 12-4-6 12 6 2-10 4-6 12-6-12-10-4 6-2-6-12 12 4z" fill="C2"/>',
    badger: '<ellipse cx="32" cy="34" rx="12" ry="9" fill="C2"/><ellipse cx="22" cy="28" rx="6" ry="4" fill="C2"/>',
  }[h.crest].replaceAll('C2', h.c2);
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}"><path d="M10 8h44v24c0 14-10 22-22 26C20 54 10 46 10 32z" fill="${h.c1}" stroke="${h.c2}" stroke-width="3"/>${inner}</svg>`;
}

export class UI {
  constructor() {
    this.hudEl = document.getElementById('hud');
    this.screens = document.getElementById('screens');
    this.toastsEl = document.getElementById('toasts');
    this.fadeEl = document.getElementById('fade');
    this.stack = [];
    this.floats = [];
    this.dialogueState = null;
    this.wheel = null;
    this.fpsT = 0; this.fpsN = 0;
    this._buildHUD();
  }

  // ------------------------------------------------------------ basics
  fade(to, dur = 0.4) {
    return new Promise((res) => {
      this.fadeEl.style.transition = `opacity ${dur}s ease`;
      this.fadeEl.style.opacity = to;
      this.fadeEl.style.pointerEvents = to > 0.5 ? 'all' : 'none';
      setTimeout(res, dur * 1000 + 20);
    });
  }
  toast(text, kind = 'info', ms = 2800) {
    if (kind === 'zone') {
      const b = el('div', 'zone-banner', `<span>${text}</span>`);
      document.body.appendChild(b);
      setTimeout(() => b.classList.add('out'), 2200);
      setTimeout(() => b.remove(), 3200);
      return;
    }
    const t = el('div', 'toast ' + kind, text);
    this.toastsEl.appendChild(t);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstChild.remove();
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 600);
  }
  banner(title, sub = '', cls = '') {
    const b = el('div', 'banner ' + cls, `<div class="b-title">${title}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`);
    document.body.appendChild(b);
    setTimeout(() => b.classList.add('out'), 1900);
    setTimeout(() => b.remove(), 2600);
  }
  points(house, n, reason = '') {
    if (!n) return;
    const h = HOUSES[house];
    this.toast(`<b style="color:${h.c2 === '#2b2622' ? '#f0d060' : h.c2}">${n > 0 ? '+' : ''}${n}</b> points to ${h.name}${reason ? ` <i>· ${reason}</i>` : ''}`, 'points');
  }
  floatText(pos, text, cls = '') {
    const e = el('div', 'float ' + cls, text);
    this.hudLayer.appendChild(e);
    this.floats.push({ e, pos: pos.clone(), t: 0, vx: (Math.random() - 0.5) * 30 });
  }

  // ------------------------------------------------------------ HUD
  _buildHUD() {
    const h = this.hudEl;
    h.innerHTML = `
      <div class="hud-tl">
        <div class="crest" id="hud-crest"></div>
        <div class="bars">
          <div class="bar hp"><div class="fill" id="hp-fill"></div><div class="ghost" id="hp-ghost"></div></div>
          <div class="bar mana"><div class="fill" id="mana-fill"></div></div>
          <div class="xpline"><span class="lvl" id="hud-lvl">1</span><div class="bar xp"><div class="fill" id="xp-fill"></div></div><span class="ldo" id="hud-ldo"></span></div>
          <div class="buffs" id="buffs"></div>
        </div>
      </div>
      <div class="hud-quest" id="quest"></div>
      <div class="hud-tr"><div class="housepts" id="housepts"></div><div class="fps" id="fps"></div></div>
      <div class="boss hidden" id="boss"><div class="boss-name" id="boss-name"></div><div class="boss-bar"><div class="fill" id="boss-fill"></div><div class="ghost" id="boss-ghost"></div></div><div class="boss-phase" id="boss-phase"></div></div>
      <div class="crosshair" id="crosshair"><i></i><i></i><i></i><i></i></div>
      <div class="lock hidden" id="lock"></div>
      <div class="marker hidden" id="marker"><div class="m-arrow">▼</div><div class="m-dist" id="m-dist"></div></div>
      <div class="prompt hidden" id="prompt"></div>
      <div class="spellbar" id="spellbar"></div>
      <div class="combo hidden" id="combo"></div>
      <div class="mg-hud hidden" id="mg-hud"></div>
      <div class="hud-layer" id="hud-layer"></div>
    `;
    this.hudLayer = h.querySelector('#hud-layer');
    this.$ = (id) => h.querySelector('#' + id);
    this.wheelEl = el('div', 'wheel hidden');
    document.body.appendChild(this.wheelEl);
    this.dlg = el('div', 'dialogue hidden');
    document.body.appendChild(this.dlg);
  }

  showHUD(on) {
    this.hudEl.classList.toggle('hidden', !on);
    document.getElementById('touch').classList.toggle('hidden', !on || G.input.device !== 'touch');
  }

  refreshHUD() {
    const s = G.save;
    this.$('hud-crest').innerHTML = s.house ? crestSVG(s.house, 46) : '';
    this.buildSpellBar();
    this.updatePoints();
    this.updateBuffs();
  }

  buildSpellBar() {
    const bar = this.$('spellbar');
    const sp = G.spells;
    if (!sp || !G.save) return;
    bar.innerHTML = '';
    const n = slotCount();
    for (let i = 0; i < n; i++) {
      const s = sp.slotSpell(i);
      const stars = s ? masteryLevel(s.id) : 0;
      const d = el('div', 'slot' + (s ? '' : ' locked'), `${s ? spellIcon(s, 34) : '<span class="lock-ico">·</span>'}<div class="cd"></div><span class="key">${i + 1}</span>${stars ? `<span class="mst">${'★'.repeat(stars)}</span>` : ''}`);
      d.dataset.slot = i;
      d.title = s ? s.name : 'Empty slot';
      d.addEventListener('click', () => sp.select(i));
      bar.appendChild(d);
    }
    this.$('hud-ldo') && (this.$('hud-ldo').textContent = `Loadout ${G.save.loadout + 1}`);
    // touch spell picker
    const tb = G.input.tSpellBar;
    if (tb) {
      tb.innerHTML = '';
      for (let i = 0; i < n; i++) {
        const s = sp.slotSpell(i);
        if (!s) continue;
        const b = el('button', 't-sp', spellIcon(s, 26));
        b.dataset.slot = i;
        b.addEventListener('touchstart', (e) => { e.preventDefault(); sp.select(i); }, { passive: false });
        tb.appendChild(b);
      }
      const lb = el('button', 't-sp t-ldo', `<b>${G.save.loadout + 1}</b>`);
      lb.addEventListener('touchstart', (e) => { e.preventDefault(); sp.swapLoadout(1); }, { passive: false });
      tb.appendChild(lb);
    }
    this.updateXP();
  }
  updateXP() {
    if (!G.save) return;
    this.$('hud-lvl').textContent = G.save.level;
    this.$('xp-fill').style.width = levelProgress() * 100 + '%';
    this.$('hud-lvl').classList.toggle('pts', G.save.talentPts > 0);
  }
  floatXP(n) {
    const p = G.player;
    if (p && G.mode === 'play') this.floatText(p.pos.clone().setY(p.pos.y + 2.4), `+${n} XP`, 'xp');
  }

  updatePoints() {
    const pts = G.save.points;
    const sorted = HOUSE_KEYS.slice().sort((a, b) => pts[b] - pts[a]);
    this.$('housepts').innerHTML = sorted.map((k) => `<div class="hp-row ${k === G.save.house ? 'mine' : ''}" style="--c:${HOUSES[k].c1};--c2:${HOUSES[k].c2}">${crestSVG(k, 18)}<span>${HOUSES[k].name}</span><b>${pts[k]}</b></div>`).join('');
    G.world?.zones.greatHall?.setHousePoints(pts);
  }

  updateBuffs() {
    const b = G.player?.buffs || {};
    const names = { luck: '🍀 Liquid Luck', strength: '💪 Strength', wiggenweld: '❤ Wiggenweld', focus: '✨ Focus', swift: '🪶 Swiftness', mastery: '🪄 Wand Mastery' };
    this.$('buffs').innerHTML = Object.keys(b).map((k) => `<span class="buff">${names[k] || k}</span>`).join('');
  }

  setQuest(q) {
    const e = this.$('quest');
    if (!q) { e.innerHTML = ''; return; }
    e.innerHTML = `<div class="q-title">${q.title}</div><div class="q-obj">${q.objective}</div>`;
    e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse');
  }

  boss(enemy) {
    this.bossTarget = enemy;
    this.$('boss').classList.toggle('hidden', !enemy);
    if (enemy) { this.$('boss-name').textContent = enemy.name; this.bossGhost = 1; }
  }

  combo(text) {
    const c = this.$('combo');
    c.innerHTML = `<small>COMBO</small>${text}`;
    c.classList.remove('hidden', 'pop'); void c.offsetWidth; c.classList.add('pop');
    clearTimeout(this._comboT);
    this._comboT = setTimeout(() => c.classList.add('hidden'), 1600);
  }

  minigameHUD(html) {
    const m = this.$('mg-hud');
    if (html == null) { m.classList.add('hidden'); return; }
    m.classList.remove('hidden');
    m.innerHTML = html;
  }

  prompt(html) {
    const p = this.$('prompt');
    if (!html) { p.classList.add('hidden'); this._prompt = null; return; }
    if (this._prompt !== html) { p.innerHTML = html; this._prompt = html; }
    p.classList.remove('hidden');
  }

  project(pos) {
    _v.copy(pos).project(G.camera);
    return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, behind: _v.z > 1 };
  }

  updateHUD(dt) {
    const p = G.player, sp = G.spells;
    if (!p) return;
    this.$('hp-fill').style.width = (p.hp / p.maxHp) * 100 + '%';
    this._hpGhost = Math.max(p.hp / p.maxHp, (this._hpGhost ?? 1) - dt * 0.4);
    this.$('hp-ghost').style.width = this._hpGhost * 100 + '%';
    this.$('mana-fill').style.width = (p.mana / p.maxMana) * 100 + '%';
    this.$('hp-fill').parentElement.classList.toggle('low', p.hp < 30);
    // spell slots
    const slots = this.$('spellbar').children;
    for (let i = 0; i < slots.length; i++) {
      const s = sp.slotSpell(i);
      const sl = slots[i];
      if (!s) { sl.classList.remove('sel', 'active'); continue; }
      const cd = sp.cooldowns[s.id] || 0;
      sl.classList.toggle('sel', sp.selected === i);
      sl.classList.toggle('active', (s.id === 'lumos' && sp.lumosOn) || (s.id === 'protego' && sp.shieldUp));
      sl.classList.toggle('nomana', p.mana < s.mana);
      const f = cd > 0 ? cd / (s.cd || 1) : 0;
      sl.querySelector('.cd').style.background = f > 0 ? `conic-gradient(rgba(0,0,0,.72) ${f * 360}deg, transparent 0)` : 'none';
    }
    const tb = G.input.tSpellBar;
    if (tb) for (const b of tb.children) b.classList.toggle('sel', +b.dataset.slot === sp.selected);
    // boss
    if (this.bossTarget) {
      const b = this.bossTarget;
      const f = Math.max(0, b.hp / b.maxHp);
      this.$('boss-fill').style.width = f * 100 + '%';
      this.bossGhost = Math.max(f, this.bossGhost - dt * 0.3);
      this.$('boss-ghost').style.width = this.bossGhost * 100 + '%';
      this.$('boss-phase').textContent = b.phaseLabel || '';
      if (!b.alive) setTimeout(() => this.boss(null), 1500), (this.bossTarget = null);
    }
    // lock-on reticle
    const lock = this.$('lock');
    const lt = G.cam.lockTarget;
    if (lt && lt.alive) {
      const s = this.project(_v.copy(lt.pos).setY(lt.pos.y + lt.height * 0.6));
      lock.classList.remove('hidden');
      lock.style.transform = `translate(${s.x}px,${s.y}px)`;
    } else lock.classList.add('hidden');
    this.$('crosshair').classList.toggle('hidden', !!lt || G.input.device === 'touch' && !p.aiming);
    // objective marker
    this.updateMarker();
    // float texts
    for (const f of this.floats) {
      f.t += dt;
      const s = this.project(_v.copy(f.pos).setY(f.pos.y + f.t * 1.2));
      f.e.style.transform = `translate(${s.x + f.vx * f.t}px,${s.y}px) translate(-50%,-50%) scale(${1 + Math.max(0, 0.25 - f.t) * 2})`;
      f.e.style.opacity = s.behind ? 0 : Math.max(0, 1 - f.t / 1.1);
    }
    this.floats = this.floats.filter((f) => { if (f.t > 1.1) { f.e.remove(); return false; } return true; });
    // fps
    if (G.settings.fps) {
      this.fpsT += G.realDt; this.fpsN++;
      if (this.fpsT > 0.5) { this.$('fps').textContent = Math.round(this.fpsN / this.fpsT) + ' fps'; this.fpsT = 0; this.fpsN = 0; }
    } else this.$('fps').textContent = '';
  }

  updateMarker() {
    const m = this.$('marker');
    const obj = G.story?.markerTarget();
    if (!obj || G.mode !== 'play') { m.classList.add('hidden'); return; }
    m.classList.remove('hidden');
    const s = this.project(obj.pos);
    const d = obj.pos.distanceTo(G.player.pos);
    this.$('m-dist').textContent = `${obj.hint ? obj.hint + ' · ' : ''}${Math.round(d)}m`;
    let x = s.x, y = s.y;
    const pad = 50;
    let off = s.behind || x < pad || x > innerWidth - pad || y < pad || y > innerHeight - pad;
    if (s.behind) { x = innerWidth - x; y = innerHeight - pad; }
    x = clamp(x, pad, innerWidth - pad); y = clamp(y, pad + 40, innerHeight - pad - 60);
    m.style.transform = `translate(${x}px,${y}px)`;
    m.classList.toggle('off', off);
  }

  // ------------------------------------------------------------ dialogue
  async say(lines) {
    if (G.quitting) return null;
    const prevMode = G.mode;
    G.mode = 'dialogue';
    this.showHUD(false);
    let result = null;
    this.sayToken = (this.sayToken || 0) + 1;
    const token = this.sayToken;
    for (const line of lines) {
      if (this.sayToken !== token) break;
      if (line.do) { await line.do(); continue; }
      result = await this._line(line);
      if (this.sayToken !== token) { result = null; break; }
      if (line.choices && line.onChoice) await line.onChoice(result);
    }
    if (this.sayToken !== token) return null;
    this.dlg.classList.add('hidden');
    G.mode = prevMode === 'dialogue' ? 'play' : prevMode;
    if (G.mode === 'play') this.showHUD(true);
    return result;
  }
  // drop any open conversation (used when a minigame or the game is quit)
  cancelDialogue() {
    this.sayToken = (this.sayToken || 0) + 1;
    const st = this.dialogueState;
    if (st) { st.done = true; st.cancel?.(); }
    this.dialogueState = null;
    this.dlg.classList.add('hidden');
  }
  _line(line) {
    return new Promise((res) => {
      const d = this.dlg;
      d.classList.remove('hidden');
      const color = line.color || '#e8c070';
      d.innerHTML = `<div class="d-name" style="color:${color}">${line.who || ''}</div><div class="d-text"></div><div class="d-choices"></div><div class="d-next">${glyph('confirm')}</div>`;
      const textEl = d.querySelector('.d-text'), choicesEl = d.querySelector('.d-choices'), next = d.querySelector('.d-next');
      const full = line.text;
      let shown = 0;
      next.style.visibility = 'hidden';
      if (line.speaker) line.speaker(true);
      G.audio?.voice(line.voice || 'mid', full.length);
      const st = { line, done: false, choiceIdx: 0, finish: null };
      this.dialogueState = st;
      const showChoices = () => {
        if (!line.choices) { next.style.visibility = 'visible'; return; }
        choicesEl.innerHTML = '';
        line.choices.forEach((c, i) => {
          const b = el('button', 'd-choice nav', c);
          b.addEventListener('click', () => end(i));
          b.addEventListener('mouseenter', () => { st.choiceIdx = i; mark(); });
          choicesEl.appendChild(b);
        });
        mark();
      };
      const mark = () => [...choicesEl.children].forEach((c, i) => c.classList.toggle('focus', i === st.choiceIdx));
      const end = (i) => {
        if (line.speaker) line.speaker(false);
        this.dialogueState = null;
        G.audio?.sfx('ui');
        res(i);
      };
      const tick = setInterval(() => {
        shown = Math.min(full.length, shown + 2);
        textEl.textContent = full.slice(0, shown);
        if (shown >= full.length) { clearInterval(tick); st.done = true; if (line.speaker) line.speaker(false); showChoices(); }
      }, 28);
      st.cancel = () => { clearInterval(tick); res(null); };
      st.advance = () => {
        if (!st.done) { shown = full.length; textEl.textContent = full; clearInterval(tick); st.done = true; if (line.speaker) line.speaker(false); showChoices(); return; }
        if (line.choices) end(st.choiceIdx);
        else end(null);
      };
      st.move = (dir) => {
        if (!line.choices || !st.done) return;
        st.choiceIdx = (st.choiceIdx + dir + line.choices.length) % line.choices.length;
        mark();
        G.audio?.sfx('uimove');
      };
      d.onclick = (e) => { if (!e.target.classList.contains('d-choice')) st.advance(); };
      if (line.auto) setTimeout(() => this.dialogueState === st && st.done && end(null), line.auto);
    });
  }

  // ------------------------------------------------------------ menus
  open(build, opts = {}) {
    const wrap = el('div', 'screen ' + (opts.cls || ''));
    build(wrap);
    this.screens.appendChild(wrap);
    const entry = { el: wrap, opts, focus: 0 };
    this.stack.push(entry);
    this._focus(entry, opts.focus ?? 0);
    wrap.addEventListener('mouseover', (e) => {
      const t = e.target.closest('.nav');
      if (!t) return;
      const items = this._items(entry);
      const i = items.indexOf(t);
      if (i >= 0 && i !== entry.focus) this._focus(entry, i, false);
    });
    return entry;
  }
  close(entry) {
    const e = entry || this.stack[this.stack.length - 1];
    if (!e) return;
    e.el.remove();
    this.stack = this.stack.filter((x) => x !== e);
    e.opts.onClose?.();
  }
  closeAll() { while (this.stack.length) this.close(); }
  get menuOpen() { return this.stack.length > 0; }
  _items(entry) { return [...entry.el.querySelectorAll('.nav')].filter((x) => x.offsetParent !== null && !x.disabled); }
  _focus(entry, i, scroll = true) {
    const items = this._items(entry);
    if (!items.length) return;
    entry.focus = (i + items.length) % items.length;
    items.forEach((x, k) => x.classList.toggle('focus', k === entry.focus));
    if (scroll) items[entry.focus].scrollIntoView({ block: 'nearest' });
  }

  handleInput() {
    const I = G.input;
    const n = I.nav();
    // dialogue
    if (this.dialogueState) {
      const st = this.dialogueState;
      if (n.up || n.left) st.move(-1);
      if (n.down || n.right) st.move(1);
      if (n.confirm || I.isPressed('interact') || I.isPressed('cast')) st.advance();
      I.pressed.clear(); // a button used by the dialogue must not also jump / dodge
      return true;
    }
    const top = this.stack[this.stack.length - 1];
    if (!top) return false;
    const items = this._items(top);
    const cur = items[top.focus];
    if (n.up) { this._focus(top, top.focus - 1); G.audio?.sfx('uimove'); }
    if (n.down) { this._focus(top, top.focus + 1); G.audio?.sfx('uimove'); }
    // scrollable panels (controls, journal): up/down scroll until the end, then move focus
    if ((n.up || n.down) && cur && cur.dataset.kind === 'scroll') {
      const dir = n.up ? -1 : 1;
      const atEnd = dir < 0 ? cur.scrollTop <= 0 : cur.scrollTop + cur.clientHeight >= cur.scrollHeight - 2;
      if (!atEnd) { cur.scrollTop += dir * 90; this._focus(top, top.focus - (n.up ? -1 : 1), false); }
    }
    // the right stick scrolls whatever panel is open
    if (I.device === 'pad' && Math.abs(I.rstick.y) > 0.25) {
      const sc = top.el.querySelector('.ctl-scroll, .jr, .opts, .spellgrid, .mg-grid');
      if (sc) sc.scrollTop -= I.rstick.y * 900 * (G.realDt || 0.016);
    }
    if ((n.left || n.right) && cur) {
      const dir = n.left ? -1 : 1;
      if (cur.dataset.kind === 'grid') { this._focus(top, top.focus + dir); G.audio?.sfx('uimove'); }
      else cur.dispatchEvent(new CustomEvent('adjust', { detail: dir }));
    }
    if (n.confirm && cur) { cur.click(); }
    if (n.back || (I.isPressed('pause') && top.opts.pauseCloses) || (I.isPressed('book') && top.opts.bookCloses)) {
      if (top.opts.onBack) top.opts.onBack();
      else if (!top.opts.modal) { this.close(top); G.audio?.sfx('uiback'); }
    }
    I.pressed.clear(); // buttons used in a menu must not leak into gameplay (A = jump, B = dodge)
    return true;
  }

  // helpers to build menu widgets
  button(parent, label, fn, cls = '') {
    const b = el('button', 'btn nav ' + cls, label);
    b.addEventListener('click', () => { G.audio?.sfx('ui'); fn(); });
    parent.appendChild(b);
    return b;
  }
  option(parent, label, values, get, set, fmt = (v) => v) {
    const row = el('div', 'opt nav', `<span class="o-label">${label}</span><span class="o-ctl"><i class="o-l">‹</i><b class="o-val"></b><i class="o-r">›</i></span>`);
    const val = row.querySelector('.o-val');
    const render = () => { val.innerHTML = fmt(get()); };
    const step = (d) => {
      const i = values.indexOf(get());
      const nv = values[(i + d + values.length) % values.length];
      set(nv); render(); G.audio?.sfx('uimove');
    };
    row.querySelector('.o-l').addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
    row.querySelector('.o-r').addEventListener('click', (e) => { e.stopPropagation(); step(1); });
    row.addEventListener('click', () => step(1));
    row.addEventListener('adjust', (e) => step(e.detail));
    render();
    parent.appendChild(row);
    return row;
  }
  slider(parent, label, min, max, stepV, get, set, fmt = (v) => v.toFixed(2)) {
    const row = el('div', 'opt nav slider', `<span class="o-label">${label}</span><span class="o-ctl"><span class="track"><span class="knob"></span></span><b class="o-val"></b></span>`);
    const track = row.querySelector('.track'), knob = row.querySelector('.knob'), val = row.querySelector('.o-val');
    const render = () => { const v = get(); knob.style.left = ((v - min) / (max - min)) * 100 + '%'; val.textContent = fmt(v); };
    const setV = (v) => { set(clamp(Math.round(v / stepV) * stepV, min, max)); render(); };
    row.addEventListener('adjust', (e) => { setV(get() + e.detail * stepV); G.audio?.sfx('uimove'); });
    const drag = (e) => {
      const r = track.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      setV(min + clamp((cx - r.left) / r.width, 0, 1) * (max - min));
    };
    track.addEventListener('mousedown', (e) => { drag(e); const mv = (ev) => drag(ev); const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); }; addEventListener('mousemove', mv); addEventListener('mouseup', up); });
    track.addEventListener('touchstart', drag, { passive: true });
    track.addEventListener('touchmove', drag, { passive: true });
    render();
    parent.appendChild(row);
    return row;
  }

  // ------------------------------------------------------------ spell wheel
  openWheel() {
    if (this.wheel) return;
    const w = this.wheelEl;
    w.classList.remove('hidden');
    w.innerHTML = '<div class="w-center"></div>';
    const n = slotCount();
    let any = false;
    for (let i = 0; i < n; i++) {
      const s = G.spells.slotSpell(i);
      any ||= !!s;
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const d = el('div', 'w-item' + (s ? '' : ' locked'), s ? spellIcon(s, 40) : '·');
      d.style.left = 50 + Math.cos(a) * 36 + '%';
      d.style.top = 50 + Math.sin(a) * 36 + '%';
      d.addEventListener('click', () => { this.wheel.pick = i; this.closeWheel(); });
      w.appendChild(d);
    }
    this.wheel = { pick: G.spells.selected, mx: 0, my: 0, n };
    if (!any) this.closeWheel();
    G.audio?.sfx('wheel');
  }
  updateWheel() {
    if (!this.wheel) return;
    const I = G.input;
    const n = this.wheel.n;
    let x = I.rstick.x, y = -I.rstick.y;
    if (I.device !== 'pad') {
      this.wheel.mx += G.input.look.x * 90; this.wheel.my += G.input.look.y * 90;
      const l = Math.hypot(this.wheel.mx, this.wheel.my);
      if (l > 1) { this.wheel.mx /= l; this.wheel.my /= l; }
      x = this.wheel.mx; y = this.wheel.my;
    }
    if (Math.hypot(x, y) > 0.5) {
      let a = Math.atan2(y, x) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      const i = Math.round(a / (Math.PI * 2 / n)) % n;
      if (G.spells.slotSpell(i)) {
        if (i !== this.wheel.pick) G.audio?.sfx('uimove');
        this.wheel.pick = i;
      }
    }
    const items = this.wheelEl.querySelectorAll('.w-item');
    items.forEach((it, i) => it.classList.toggle('sel', i === this.wheel.pick));
    const s = G.spells.slotSpell(this.wheel.pick);
    this.wheelEl.querySelector('.w-center').innerHTML = s ? `<b style="color:${s.css}">${s.name}</b><small>${s.short}</small>` : '';
    if (!I.isHeld('wheel')) this.closeWheel();
  }
  closeWheel() {
    if (!this.wheel) return;
    G.spells.select(this.wheel.pick);
    this.wheel = null;
    this.wheelEl.classList.add('hidden');
  }

  setLoading(text, f) {
    const t = document.getElementById('load-text'), fill = document.getElementById('load-fill');
    if (t) t.textContent = text;
    if (fill) fill.style.width = Math.round(f * 100) + '%';
  }
}
