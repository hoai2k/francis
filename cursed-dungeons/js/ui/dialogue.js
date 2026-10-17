// Dialogue box: a portrait, a name plate and typewriter text at the bottom of
// the screen. Used by the hub NPCs, and by cutscenes / story through
//   game.dialogue.say(speaker, lines, { onEnd, pause, onTick })
// speaker: a registered speaker id ('gojo'), a { name, color, kanji, rig }
// object, or null for narration. lines: strings, or { who, text } entries to
// switch speaker mid-conversation (who = speaker id, or null for narration).
// A line can also be a function (game) => string.
// Advance with E / Space / Enter, A or X on a controller, or a click / tap
// anywhere; Esc or B skips the rest. While a dialogue is open the game is
// paused (pass pause: false to keep it running, e.g. inside a cutscene).
import { h } from './ui.js';

const CPS = 52;                            // typewriter speed (characters per second)

export class Dialogue {
  constructor(game) {
    this.game = game;
    this.speakers = new Map();
    this.portraits = new Map();
    this.cur = null;
    this.queue = [];
    this.raf = 0;
  }
  get active() { return !!this.cur || !!this.releasing; }
  get open() { return this.active; }
  // name: display name; color: accent (css); kanji: crest glyph when there is no rig; voice: blip pitch
  speaker(id, info) { this.speakers.set(id, info); this.portraits.delete(id); }

  say(speaker, lines, opts = {}) {
    if (!lines || (Array.isArray(lines) && !lines.length)) { opts.onEnd?.(); return false; }
    if (this.cur || this.releasing) { this.queue.push([speaker, lines, opts]); return true; }
    const list = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'object' && l && 'text' in l ? l : { who: speaker, text: l }));
    const g = this.game;
    const pause = opts.pause ?? true;
    this.cur = { list, i: -1, opts, wasPaused: g.paused, pause, typed: 0, text: '', done: true, t: 0, blipT: 0 };
    if (pause) g.paused = true;
    this.build();
    this.prevHeld = this.heldNow();
    this.next();
    const loop = (now) => {
      if (!this.cur) return;
      const dt = Math.min(0.12, (now - (this.lastT ?? now)) / 1000); this.lastT = now;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(loop);
    return true;
  }
  // Close without finishing (no onEnd).
  cancel() { this.finish(false); this.queue = []; }

  build() {
    this.el?.remove();
    const layer = h('div', { class: 'dlg-layer' });
    const portrait = h('div', { class: 'dlg-portrait' });
    const name = h('div', { class: 'dlg-name' });
    const text = h('div', { class: 'dlg-text' });
    const next = h('div', { class: 'dlg-next' }, '▼');
    const hint = h('div', { class: 'dlg-hint' });
    const box = h('div', { class: 'dlg' }, portrait, h('div', { class: 'dlg-body' }, name, text), next, hint);
    layer.appendChild(box);
    layer.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.advance(); });
    // keys are handled as events (never missed on a slow frame); pads are polled in tick()
    this.onKey = (e) => {
      if (!this.cur || e.repeat) return;
      if (e.code === 'Escape') { e.preventDefault(); this.finish(true, true); }
      else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); this.advance(); }
    };
    window.addEventListener('keydown', this.onKey);
    document.body.appendChild(layer);
    this.el = layer; this.ui = { portrait, name, text, next, hint, box };
    const dev = this.game.input?.lastDevice ?? 'kbm';
    hint.textContent = dev.startsWith('pad') ? 'A next · B skip' : dev === 'touch' ? 'Tap to continue' : 'E / Space / click: next · Esc: skip';
    requestAnimationFrame(() => layer.classList.add('in'));
  }
  info(who) {
    if (who == null) return null;
    if (typeof who === 'object') return who;
    return this.speakers.get(who) ?? { name: String(who), color: '#b8a8ff' };
  }
  portrait(who, info) {
    const key = typeof who === 'string' ? who : info?.name;
    if (key && this.portraits.has(key)) return this.portraits.get(key);
    let el;
    const src = info?.rig?.material?.map?.image;
    if (src && src.width) {
      // the face (front of the head) and the hair/hat layer from the skin, pixel-sharp
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
      const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
      const s = src.width / 64;
      c.drawImage(src, 8 * s, 8 * s, 8 * s, 8 * s, 0, 0, 64, 64);
      c.drawImage(src, 40 * s, 8 * s, 8 * s, 8 * s, 0, 0, 64, 64);
      el = cv;
    } else el = h('div', { class: 'dlg-kanji' }, info?.kanji ?? (info?.name ?? '?').slice(0, 1));
    if (key) this.portraits.set(key, el);
    return el;
  }
  next() {
    const c = this.cur; if (!c) return;
    c.i++;
    if (c.i >= c.list.length) { this.finish(true); return; }
    const line = c.list[c.i];
    const who = line.who === undefined ? null : line.who;
    const info = this.info(who);
    c.text = typeof line.text === 'function' ? String(line.text(this.game)) : String(line.text ?? '');
    c.typed = 0; c.done = false; c.voice = info?.voice ?? 1;
    const U = this.ui;
    U.box.classList.toggle('narration', !info);
    U.box.style.setProperty('--accent', info?.color ?? '#9a8ac8');
    U.name.textContent = info?.name ?? '';
    U.portrait.innerHTML = '';
    if (info) U.portrait.appendChild(this.portrait(who, info));
    U.text.textContent = '';
    U.next.classList.remove('show');
    c.opts.onLine?.(c.i, line);
  }
  advance() {
    const c = this.cur; if (!c) return;
    if (!c.done) { c.typed = c.text.length; this.render(); return; }
    this.game.audio?.ui?.('move');
    this.next();
  }
  render() {
    const c = this.cur;
    this.ui.text.textContent = c.text.slice(0, Math.floor(c.typed));
    if (c.typed >= c.text.length) { c.done = true; this.ui.next.classList.add('show'); }
  }
  // Read the keyboard and pads directly, so advancing never waits on a game frame.
  heldNow() {
    const inp = this.game.input; const out = {};
    if (!inp) return out;
    const k = inp.keys;
    out.kbm = k.has('KeyE') || k.has('Space') || k.has('Enter') || k.has('NumpadEnter');
    out['kbm:back'] = k.has('Escape');
    for (const p of inp.pads?.() ?? []) {
      out['pad' + p.index] = !!(p.buttons[0]?.pressed || p.buttons[2]?.pressed);
      out['pad' + p.index + ':back'] = !!p.buttons[1]?.pressed;
    }
    return out;
  }
  tick(dt) {
    const c = this.cur; if (!c) return;
    // keep the game paused even if a menu toggled it
    if (c.pause && !this.game.paused) this.game.paused = true;
    const held = this.heldNow(), prev = this.prevHeld ?? {};
    this.prevHeld = held;
    let adv = false, back = false;
    for (const k in held) { if (!k.startsWith('pad')) continue; if (held[k] && !prev[k]) { if (k.endsWith(':back')) back = true; else adv = true; } }
    if (back) { this.finish(true, true); return; }
    if (adv) this.advance();
    if (!this.cur) return;
    if (!c.done) {
      const before = Math.floor(c.typed);
      c.typed = Math.min(c.text.length, c.typed + dt * CPS);
      const after = Math.floor(c.typed);
      if (after > before) {
        c.blipT -= after - before;
        if (c.blipT <= 0 && /\S/.test(c.text[after - 1] ?? '')) { c.blipT = 3; this.blip(c.voice); }
        this.render();
      }
    }
    c.opts.onTick?.(dt);
  }
  blip(voice) {
    const a = this.game.audio; if (!a?.started || !a.tone) return;
    a.tone({ freq: (420 + Math.random() * 60) * voice, dur: 0.035, gain: 0.025, type: 'square', filter: 1800 });
  }
  finish(callEnd, skipped = false) {
    const c = this.cur; if (!c) return;
    this.cur = null;
    cancelAnimationFrame(this.raf);
    if (this.onKey) { window.removeEventListener('keydown', this.onKey); this.onKey = null; }
    const el = this.el; this.el = null;
    if (el) { el.classList.remove('in'); el.classList.add('out'); setTimeout(() => el.remove(), 180); }
    // Wait for the advance / skip key to be let go before handing control back,
    // so the same press can't re-open a prompt or click a menu button.
    this.releasing = true;
    const t0 = performance.now();
    const done = () => {
      if (this.cur) return;
      const held = this.heldNow();
      if (Object.values(held).some(Boolean) && performance.now() - t0 < 1500) { requestAnimationFrame(done); return; }
      this.releasing = false;
      if (c.pause && !c.wasPaused && !this.game.ui?.stack.length) { this.game.paused = false; this.game.last = performance.now(); }
      if (callEnd) c.opts.onEnd?.({ skipped });
      if (!this.cur && this.queue.length) { const [s, l, o] = this.queue.shift(); this.say(s, l, o); }
    };
    done();
  }
}
