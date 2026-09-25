// Procedural Web Audio: every sound effect and the music are synthesised —
// impacts, whooshes, energy charges, domain expansions, surface-aware
// footsteps, ambience per biome and a small generative soundtrack.
import { settings } from './settings.js';

export class Audio {
  constructor() {
    this.ctx = null; this.started = false;
    this.last = {};
  }
  // Must be called from a user gesture.
  start() {
    if (this.started) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4; this.comp.connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.comp);
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.comp);
    this.ambBus = ctx.createGain(); this.ambBus.connect(this.comp);
    // shared reverb
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(2.4, 2.2);
    this.revSend = ctx.createGain(); this.revSend.gain.value = 0.25; this.revSend.connect(this.reverb); this.reverb.connect(this.comp);
    this.noiseBuf = this.makeNoise(2);
    this.started = true;
    this.applyVolumes();
  }
  applyVolumes() {
    if (!this.started) return;
    this.master.gain.value = settings.master;
    this.sfxBus.gain.value = settings.sfx;
    this.musicBus.gain.value = settings.music * 0.55;
    this.ambBus.gain.value = settings.sfx * 0.5;
  }
  makeNoise(sec) { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  impulse(sec, decay) {
    const c = this.ctx, len = c.sampleRate * sec, b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  throttle(key, ms) { const n = performance.now(); if (this.last[key] && n - this.last[key] < ms) return true; this.last[key] = n; return false; }
  get t() { return this.ctx.currentTime; }

  // ---- primitives
  noise({ dur = 0.2, gain = 0.5, type = 'lowpass', freq = 1200, q = 1, sweep = null, attack = 0.002, rev = 0, bus = this.sfxBus, at = 0 } = {}) {
    if (!this.started) return;
    const c = this.ctx, t = this.t + at;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus); if (rev) { const s = c.createGain(); s.gain.value = rev; g.connect(s); s.connect(this.revSend); }
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  tone({ freq = 440, to = null, dur = 0.2, gain = 0.3, type = 'sine', attack = 0.005, rev = 0, bus = this.sfxBus, at = 0, detune = 0, filter = null } = {}) {
    if (!this.started) return;
    const c = this.ctx, t = this.t + at;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(10, to), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
    node.connect(g); g.connect(bus); if (rev) { const s = c.createGain(); s.gain.value = rev; g.connect(s); s.connect(this.revSend); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ---- game sounds
  ui(kind) {
    if (!this.started) return;
    if (kind === 'move') this.tone({ freq: 660, dur: 0.05, gain: 0.05, type: 'square', filter: 2000 });
    else if (kind === 'back') this.tone({ freq: 330, dur: 0.08, gain: 0.07, type: 'square', filter: 1500 });
    else if (kind === 'buy') { this.tone({ freq: 880, dur: 0.1, gain: 0.1, type: 'square', filter: 3000 }); this.tone({ freq: 1320, dur: 0.14, gain: 0.08, type: 'square', filter: 3000, at: 0.07 }); }
    else this.tone({ freq: 880, dur: 0.08, gain: 0.08, type: 'square', filter: 2500 });
  }
  whoosh(s = 1) { if (this.throttle('whoosh', 40)) return; this.noise({ dur: 0.18 * s + 0.05, gain: 0.25 * s, type: 'bandpass', freq: 600, sweep: 2600, q: 1.2, attack: 0.03 }); }
  swing(step = 0) { this.noise({ dur: 0.16, gain: 0.22, type: 'bandpass', freq: 900 + step * 250, sweep: 3200, q: 2, attack: 0.02 }); }
  impact(power = 1, kind = 'flesh') {
    if (this.throttle('impact', 25)) return;
    const p = Math.min(2.5, power);
    this.noise({ dur: 0.12 + p * 0.08, gain: 0.35 * p, type: 'lowpass', freq: 2400, sweep: 200, rev: 0.1 });
    this.tone({ freq: 140 + Math.random() * 30, to: 45, dur: 0.14 + p * 0.1, gain: 0.45 * Math.min(1.4, p), type: 'sine' });
    if (kind === 'crit') this.tone({ freq: 1800, to: 900, dur: 0.12, gain: 0.08, type: 'square', filter: 4000 });
  }
  blackFlash() {
    this.noise({ dur: 0.5, gain: 0.9, type: 'lowpass', freq: 5000, sweep: 60, rev: 0.4 });
    this.tone({ freq: 90, to: 28, dur: 0.7, gain: 0.9, type: 'sawtooth', filter: 400 });
    for (let i = 0; i < 6; i++) this.noise({ dur: 0.05, gain: 0.35, type: 'highpass', freq: 3000 + Math.random() * 3000, at: 0.03 + i * 0.05 + Math.random() * 0.03 });
  }
  hurt() { if (this.throttle('hurt', 120)) return; this.tone({ freq: 220, to: 110, dur: 0.18, gain: 0.25, type: 'square', filter: 1200 }); this.noise({ dur: 0.1, gain: 0.2, freq: 1500 }); }
  enemyHurt(pitch = 1) { if (this.throttle('ehurt', 50)) return; this.tone({ freq: 180 * pitch, to: 90 * pitch, dur: 0.15, gain: 0.12, type: 'sawtooth', filter: 900 }); }
  enemyDie(big = false) { this.noise({ dur: big ? 0.9 : 0.4, gain: big ? 0.5 : 0.28, type: 'bandpass', freq: 500, sweep: 120, q: 0.8, rev: 0.3 }); this.tone({ freq: big ? 120 : 260, to: 40, dur: big ? 0.9 : 0.35, gain: 0.2, type: 'sawtooth', filter: 700 }); }
  footstep(surface, pos) {
    if (!this.started || this.throttle('step', 90)) return;
    const s = { stone: [1800, 0.07, 'bandpass', 2.5], grass: [700, 0.06, 'lowpass', 0.7], wood: [420, 0.1, 'bandpass', 3], metal: [2600, 0.08, 'bandpass', 8], water: [900, 0.12, 'bandpass', 0.6], sand: [1100, 0.07, 'lowpass', 0.5] }[surface] || [1500, 0.07, 'bandpass', 2];
    this.noise({ dur: s[1], gain: 0.09, type: s[2], freq: s[0] * (0.9 + Math.random() * 0.2), q: s[3] });
    if (surface === 'wood') this.tone({ freq: 160 + Math.random() * 20, to: 120, dur: 0.07, gain: 0.05 });
    if (surface === 'metal') this.tone({ freq: 1200 + Math.random() * 300, dur: 0.12, gain: 0.02, type: 'triangle' });
    if (surface === 'water') this.noise({ dur: 0.18, gain: 0.05, type: 'highpass', freq: 2500, at: 0.03 });
  }
  charge(dur = 0.8, pitch = 1) { this.tone({ freq: 180 * pitch, to: 900 * pitch, dur, gain: 0.12, type: 'sawtooth', filter: 2500, attack: dur * 0.8 }); this.noise({ dur, gain: 0.1, type: 'bandpass', freq: 400, sweep: 4000, q: 4, attack: dur * 0.8 }); }
  energy(kind = 'blue') {
    if (kind === 'blue') { this.tone({ freq: 60, to: 180, dur: 0.9, gain: 0.35, type: 'sine', rev: 0.3 }); this.noise({ dur: 0.9, gain: 0.25, type: 'bandpass', freq: 3000, sweep: 300, q: 3, attack: 0.05 }); }
    else if (kind === 'red') { this.noise({ dur: 0.5, gain: 0.6, type: 'lowpass', freq: 4000, sweep: 100, rev: 0.3 }); this.tone({ freq: 400, to: 60, dur: 0.5, gain: 0.35, type: 'sawtooth', filter: 1500 }); }
    else if (kind === 'purple') { this.tone({ freq: 40, to: 30, dur: 2.2, gain: 0.8, type: 'sawtooth', filter: 300, rev: 0.5 }); this.noise({ dur: 2, gain: 0.7, type: 'lowpass', freq: 6000, sweep: 80, rev: 0.6, attack: 0.02 }); this.tone({ freq: 800, to: 200, dur: 1.4, gain: 0.15, type: 'square', filter: 3000 }); }
    else if (kind === 'infinity') { this.tone({ freq: 880, to: 1760, dur: 0.6, gain: 0.08, type: 'sine', rev: 0.6 }); this.tone({ freq: 1320, to: 2640, dur: 0.6, gain: 0.05, type: 'sine', rev: 0.6, at: 0.05 }); }
    else if (kind === 'slash') { this.noise({ dur: 0.14, gain: 0.35, type: 'highpass', freq: 3000, sweep: 8000, q: 1 }); this.tone({ freq: 2400, to: 1200, dur: 0.1, gain: 0.05, type: 'square', filter: 5000 }); }
    else if (kind === 'fire') { this.noise({ dur: 0.9, gain: 0.5, type: 'lowpass', freq: 800, sweep: 3000, attack: 0.2, rev: 0.3 }); this.tone({ freq: 110, to: 55, dur: 0.9, gain: 0.3, type: 'sawtooth', filter: 600 }); }
    else if (kind === 'nail') { this.tone({ freq: 2200, to: 1400, dur: 0.06, gain: 0.08, type: 'square', filter: 5000 }); this.noise({ dur: 0.05, gain: 0.12, type: 'highpass', freq: 4000 }); }
    else if (kind === 'summon') { this.tone({ freq: 110, to: 220, dur: 0.6, gain: 0.25, type: 'triangle', rev: 0.4 }); this.noise({ dur: 0.6, gain: 0.2, type: 'lowpass', freq: 300, sweep: 1200, attack: 0.3 }); }
    else if (kind === 'heal') { [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.5, gain: 0.08, type: 'sine', rev: 0.5, at: i * 0.07 })); }
    else if (kind === 'explode') { this.noise({ dur: 0.8, gain: 0.8, type: 'lowpass', freq: 3000, sweep: 60, rev: 0.4 }); this.tone({ freq: 90, to: 25, dur: 0.8, gain: 0.6, type: 'sine' }); }
    else if (kind === 'spit') { this.noise({ dur: 0.2, gain: 0.2, type: 'bandpass', freq: 800, sweep: 300, q: 2 }); }
    else if (kind === 'teleport') { this.tone({ freq: 300, to: 1500, dur: 0.25, gain: 0.1, type: 'sine', rev: 0.4 }); }
  }
  domain(kind = 'void') {
    if (!this.started) return;
    const base = { void: 55, shrine: 41, garden: 49, fire: 44, resonance: 52 }[kind] ?? 50;
    this.noise({ dur: 1.5, gain: 0.5, type: 'bandpass', freq: 200, sweep: 6000, q: 1.5, attack: 1.2, rev: 0.6 });
    [1, 1.5, 2, 2.52, 3].forEach((m, i) => this.tone({ freq: base * m * 2, dur: 4.5, gain: 0.12, type: i % 2 ? 'triangle' : 'sawtooth', filter: 1400, attack: 1.4, rev: 0.7, at: 1.1, detune: (Math.random() - 0.5) * 12 }));
    this.tone({ freq: base, to: base * 0.5, dur: 5, gain: 0.5, type: 'sine', attack: 1.2, at: 1.1 });
    this.noise({ dur: 0.6, gain: 0.9, type: 'lowpass', freq: 6000, sweep: 60, rev: 0.8, at: 1.3 });
  }
  gong() { this.tone({ freq: 110, to: 105, dur: 3, gain: 0.35, type: 'sine', rev: 0.8 }); this.tone({ freq: 277, to: 270, dur: 2.5, gain: 0.12, type: 'sine', rev: 0.8 }); this.tone({ freq: 413, dur: 2, gain: 0.06, type: 'sine', rev: 0.8 }); }
  coin() { if (this.throttle('coin', 40)) return; this.tone({ freq: 1568, dur: 0.08, gain: 0.07, type: 'square', filter: 5000 }); this.tone({ freq: 2093, dur: 0.12, gain: 0.06, type: 'square', filter: 5000, at: 0.06 }); }
  loot(rarity) { const f = rarity === 'unique' ? [523, 784, 1046, 1568] : rarity === 'rare' ? [659, 988, 1318] : [784, 1046]; f.forEach((x, i) => this.tone({ freq: x, dur: 0.35, gain: 0.09, type: 'triangle', rev: 0.4, at: i * 0.08 })); }
  breakBlock(kind = 'wood') { if (this.throttle('break', 30)) return; this.noise({ dur: 0.25, gain: 0.35, type: 'bandpass', freq: kind === 'wood' ? 700 : 1400, sweep: 200, q: 1.2 }); this.tone({ freq: kind === 'wood' ? 180 : 120, to: 60, dur: 0.15, gain: 0.2 }); }
  boss() { this.gong(); this.tone({ freq: 55, dur: 2.5, gain: 0.5, type: 'sawtooth', filter: 300, attack: 0.5, rev: 0.5 }); }
  warn() { if (this.throttle('warn', 150)) return; this.tone({ freq: 880, dur: 0.12, gain: 0.06, type: 'square', filter: 3000 }); }
  levelUp() { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.4, gain: 0.1, type: 'square', filter: 3000, at: i * 0.09, rev: 0.3 })); }

  // ---- ambience (looping filtered noise + random events)
  setAmbience(kind) {
    if (!this.started) { this.pendingAmb = kind; return; }
    if (this.amb) { try { this.amb.src.stop(); } catch (e) { /* ignore */ } clearInterval(this.amb.timer); }
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const cfg = { night: ['lowpass', 500, 0.08], city: ['lowpass', 260, 0.14], forest: ['bandpass', 900, 0.06], drips: ['lowpass', 180, 0.12], void: ['lowpass', 120, 0.1] }[kind] || ['lowpass', 400, 0.08];
    f.type = cfg[0]; f.frequency.value = cfg[1]; g.gain.value = cfg[2];
    src.connect(f); f.connect(g); g.connect(this.ambBus); src.start();
    const timer = setInterval(() => {
      if (!this.started || this.ctx.state !== 'running') return;
      if (kind === 'night' || kind === 'forest') { if (Math.random() < 0.5) this.tone({ freq: 3800 + Math.random() * 800, dur: 0.05, gain: 0.015, type: 'sine', bus: this.ambBus, at: 0 }), this.tone({ freq: 3900 + Math.random() * 800, dur: 0.05, gain: 0.015, type: 'sine', bus: this.ambBus, at: 0.08 }); }
      if (kind === 'forest' && Math.random() < 0.15) this.tone({ freq: 400 + Math.random() * 200, to: 300, dur: 0.6, gain: 0.03, type: 'sine', bus: this.ambBus, rev: 0.6 });
      if (kind === 'drips' && Math.random() < 0.7) this.tone({ freq: 1200 + Math.random() * 1500, to: 600, dur: 0.08, gain: 0.04, type: 'sine', bus: this.ambBus, rev: 0.8 });
      if (kind === 'city' && Math.random() < 0.1) this.tone({ freq: 700, to: 690, dur: 1.4, gain: 0.02, type: 'triangle', bus: this.ambBus, rev: 0.7 });
    }, 700);
    this.amb = { src, timer };
  }

  // ---- music: small generative sequencer (taiko + koto-like plucks + pad)
  setMusic(kind) {
    if (!this.started) { this.pendingMusic = kind; return; }
    this.musicKind = kind;
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (!kind) return;
    const scales = {
      shrine: [0, 1, 5, 7, 8], city: [0, 3, 5, 7, 10], forest: [0, 2, 3, 7, 8], subway: [0, 1, 3, 6, 8], shibuya: [0, 1, 4, 5, 7, 8], hub: [0, 2, 4, 7, 9], boss: [0, 1, 3, 6, 7], title: [0, 2, 3, 7, 10],
    };
    const roots = { shrine: 50, city: 45, forest: 47, subway: 43, shibuya: 44, hub: 52, boss: 40, title: 45 };
    const scale = scales[kind] || scales.shrine, root = roots[kind] ?? 48;
    const bpm = kind === 'boss' ? 132 : kind === 'hub' || kind === 'title' ? 84 : 100;
    const stepDur = 60 / bpm / 2;
    let step = 0; let phrase = [];
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const newPhrase = () => { phrase = []; for (let i = 0; i < 16; i++) phrase.push(Math.random() < (kind === 'boss' ? 0.55 : 0.35) ? scale[Math.floor(Math.random() * scale.length)] + 12 * (Math.random() < 0.3 ? 1 : 0) : null); };
    newPhrase();
    this.musicTimer = setInterval(() => {
      if (!this.started || this.ctx.state !== 'running') return;
      const s = step % 16; const bar = Math.floor(step / 16);
      if (s === 0 && bar % 4 === 0) newPhrase();
      const bus = this.musicBus;
      // taiko
      if (s === 0 || s === 8 || (kind === 'boss' && s % 4 === 0) || (s === 11 && Math.random() < 0.5)) {
        this.tone({ freq: 90, to: 45, dur: 0.35, gain: kind === 'hub' ? 0.15 : 0.3, type: 'sine', bus });
        this.noise({ dur: 0.08, gain: 0.08, type: 'lowpass', freq: 800, bus });
      }
      if (s % 4 === 2 && kind !== 'hub' && kind !== 'title') this.noise({ dur: 0.04, gain: 0.03, type: 'highpass', freq: 6000, bus });
      // pluck
      const n = phrase[s];
      if (n !== null && n !== undefined) {
        const f = midi(root + 12 + n);
        this.tone({ freq: f, dur: 0.5, gain: 0.07, type: 'triangle', bus, rev: 0.4 });
        this.tone({ freq: f * 2, dur: 0.15, gain: 0.025, type: 'square', filter: 2500, bus });
      }
      // pad
      if (s === 0 && bar % 2 === 0) {
        const chord = [0, scale[2] ?? 7, scale[3] ?? 7].map((x) => midi(root + x));
        chord.forEach((f) => this.tone({ freq: f, dur: stepDur * 30, gain: 0.03, type: 'sawtooth', filter: 700, attack: 1.2, bus, rev: 0.6 }));
      }
      step++;
    }, stepDur * 1000);
  }
}
