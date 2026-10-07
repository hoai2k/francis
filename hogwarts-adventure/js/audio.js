// Web Audio: a small orchestral synth (strings, horns, celesta, harp, choir, timpani)
// playing original procedural scores, plus synthesized spell & world sound effects.
import { G } from './state.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const N = (name) => {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  return 12 * (+m[3] + 1) + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const chord = (root, q = 'm') => {
  const r = N(root);
  const iv = { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], dim: [0, 3, 6], sus: [0, 5, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14] }[q];
  return iv.map((i) => r + i);
};
const mel = (s) => s.trim().split(/\s+/).map((tok) => {
  // "E5:2" or "-:1" rest
  const [n, d] = tok.split(':');
  return [n === '-' ? null : N(n), +d];
});

// ------------------------------------------------------------------ scores (original)
const TRACKS = {
  menu: {
    bpm: 66, meter: 3, style: 'pad',
    chords: [chord('E3', 'madd9'), chord('C3', 'M'), chord('A2', 'm'), chord('B2', 'M'), chord('E3', 'madd9'), chord('G2', 'M'), chord('A2', 'm7'), chord('B2', '7')],
    melody: [mel('B5:1 E6:1 D6:1'), mel('C6:2 G5:1'), mel('A5:1.5 B5:0.5 C6:1'), mel('B5:3'), mel('G5:1 B5:1 E6:1'), mel('D6:2 B5:1'), mel('C6:1 E6:1 A5:1'), mel('B5:2 -:1')],
    lead: 'celesta', pad: 'strings', bass: 'none',
  },
  castle: {
    bpm: 98, meter: 3, style: 'waltz',
    chords: [chord('E3'), chord('C3', 'M'), chord('A2'), chord('B2', '7'), chord('E3'), chord('G2', 'M'), chord('A2'), chord('B2', '7'),
      chord('C3', 'M'), chord('D3', 'M'), chord('B2'), chord('E3'), chord('A2'), chord('D3', 'M'), chord('G2', 'M'), chord('B2', '7')],
    melody: [mel('E5:2 G5:1'), mel('C6:1.5 B5:0.5 G5:1'), mel('A5:1 E5:1 C5:1'), mel('D#5:2 F#5:1'), mel('G5:1 F#5:1 E5:1'), mel('D5:1.5 E5:0.5 G5:1'), mel('F#5:1 A5:1 D#5:1'), mel('E5:3'),
      mel('G5:1 C6:1 E6:1'), mel('D6:2 A5:1'), mel('B5:1 D6:1 F#5:1'), mel('G5:2 E5:1'), mel('C6:1 B5:1 A5:1'), mel('F#5:1.5 G5:0.5 A5:1'), mel('B5:1 G5:1 D5:1'), mel('D#5:2 B4:1')],
    lead: 'celesta', pad: 'strings', bass: 'pizz', arp: 'harp',
  },
  hall: {
    bpm: 86, meter: 3, style: 'waltz',
    chords: [chord('D3', 'M'), chord('B2'), chord('G2', 'M'), chord('A2', 'M'), chord('D3', 'M'), chord('F#2'), chord('G2', 'M'), chord('A2', '7')],
    melody: [mel('F#5:2 A5:1'), mel('B5:1.5 A5:0.5 F#5:1'), mel('G5:1 B5:1 D6:1'), mel('C#6:3'), mel('D6:1 C#6:1 A5:1'), mel('F#5:1 A5:1 C#6:1'), mel('B5:1 G5:1 E5:1'), mel('A5:2 -:1')],
    lead: 'horn', pad: 'strings', bass: 'pizz', arp: 'harp',
  },
  combat: {
    bpm: 136, meter: 4, style: 'ostinato',
    chords: [chord('D3'), chord('D3'), chord('A#2', 'M'), chord('C3', 'M'), chord('D3'), chord('F2', 'M'), chord('G2'), chord('A2', 'M')],
    melody: [mel('D5:2 F5:1 A5:1'), mel('G5:3 F5:1'), mel('F5:2 D5:1 A#4:1'), mel('C5:2 E5:2'), mel('D5:1 F5:1 A5:1 D6:1'), mel('C6:2 A5:2'), mel('A#5:1 A5:1 G5:1 F5:1'), mel('E5:2 C#5:2')],
    lead: 'horn', pad: 'strings', bass: 'low', perc: 'timpani',
  },
  boss: {
    bpm: 118, meter: 4, style: 'ostinato',
    chords: [chord('C3'), chord('G#2', 'M'), chord('C3'), chord('G2', 'M'), chord('F2'), chord('G#2', 'M'), chord('D#3', 'M'), chord('G2', '7')],
    melody: [mel('C5:3 D#5:1'), mel('G#4:2 C5:2'), mel('G5:2 F5:1 D#5:1'), mel('D5:4'), mel('F5:2 G#5:2'), mel('G5:2 D#5:2'), mel('D#5:1 F5:1 G5:2'), mel('B4:2 D5:2')],
    lead: 'horn', pad: 'choir', bass: 'low', perc: 'timpani',
  },
  quidditch: {
    bpm: 148, meter: 4, style: 'march',
    chords: [chord('G2', 'M'), chord('C3', 'M'), chord('D3', 'M'), chord('G2', 'M'), chord('E3'), chord('C3', 'M'), chord('A2', '7'), chord('D3', '7')],
    melody: [mel('D5:1 G5:1 B5:1 D6:1'), mel('E6:2 C6:2'), mel('A5:1 B5:1 C6:1 A5:1'), mel('B5:3 -:1'), mel('B5:1 G5:1 E5:1 G5:1'), mel('C6:1 E6:1 G6:2'), mel('F#6:1 E6:1 C#6:1 A5:1'), mel('D6:2 F#5:2')],
    lead: 'horn', pad: 'strings', bass: 'low', perc: 'snare',
  },
  forest: {
    bpm: 72, meter: 4, style: 'pad',
    chords: [chord('A2'), chord('F2', 'M'), chord('A2'), chord('E2', 'M'), chord('D3'), chord('A2'), chord('F2', 'M'), chord('E2', '7')],
    melody: [mel('E5:3 -:1'), mel('F5:2 C5:2'), mel('-:2 A5:2'), mel('G#5:4'), mel('F5:2 A5:1 D6:1'), mel('C6:4'), mel('A5:2 F5:2'), mel('E5:3 -:1')],
    lead: 'celesta', pad: 'choir', bass: 'drone',
  },
  potions: {
    bpm: 108, meter: 4, style: 'pizz',
    chords: [chord('A2'), chord('E2', 'M'), chord('A2'), chord('D3'), chord('F2', 'M'), chord('C3', 'M'), chord('D3'), chord('E2', '7')],
    melody: [mel('A5:0.5 C6:0.5 E6:1 D6:0.5 C6:0.5 B5:1'), mel('G#5:1 B5:1 E5:2'), mel('A5:0.5 B5:0.5 C6:1 E6:1 A6:1'), mel('F6:2 D6:2'), mel('C6:1 A5:1 F5:2'), mel('E5:1 G5:1 C6:2'), mel('D6:1 F6:1 A5:1 D6:1'), mel('B5:2 G#5:2')],
    lead: 'celesta', pad: 'none', bass: 'pizz', arp: 'harp',
  },
};

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.trackName = null;
    this.beat = 0;
    this.nextT = 0;
    this.windNode = null;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    // reverb
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.2, 2.6);
    this.revSend = ctx.createGain();
    this.revSend.gain.value = 0.45;
    this.revSend.connect(this.reverb).connect(this.master);
    // noise
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.applyVolumes();
    this._timer = setInterval(() => this._schedule(), 30);
    if (this.pending) { const p = this.pending; this.pending = null; this.music(p); }
  }

  _impulse(sec, decay) {
    const ctx = this.ctx, len = ctx.sampleRate * sec;
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const S = G.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(S.muted ? 0 : 1, t, 0.05);
    this.musicBus.gain.setTargetAtTime(S.music * 0.55, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(S.sfx * 0.9, t, 0.05);
  }
  toggleMute() {
    G.settings.muted = !G.settings.muted;
    this.applyVolumes();
    G.ui.toast(G.settings.muted ? '🔇 Sound muted' : '🔊 Sound on', 'info', 1400);
  }

  // ------------------------------------------------------------ music
  music(name) {
    if (!this.ctx) { this.pending = name; return; }
    if (name === this.trackName) return;
    const t = this.ctx.currentTime;
    if (this.trackGain) {
      const g = this.trackGain;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 1.6);
      setTimeout(() => g.disconnect(), 2500);
    }
    this.trackName = name;
    this.track = TRACKS[name] || null;
    if (!this.track) { this.trackGain = null; return; }
    this.trackGain = this.ctx.createGain();
    this.trackGain.gain.setValueAtTime(0, t);
    this.trackGain.gain.linearRampToValueAtTime(1, t + 2);
    this.trackGain.connect(this.musicBus);
    const send = this.ctx.createGain();
    send.gain.value = 0.6;
    this.trackGain.connect(send).connect(this.revSend);
    this.beat = 0;
    this.nextT = t + 0.1;
  }

  _schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.track) return;
    const tr = this.track;
    const spb = 60 / tr.bpm;
    const horizon = ctx.currentTime + 0.2;
    const step = tr.style === 'ostinato' || tr.style === 'march' || tr.style === 'pizz' ? 0.5 : 1;
    while (this.nextT < horizon) {
      const t = this.nextT, b = this.beat;
      const bars = tr.chords.length;
      const bar = Math.floor(b / tr.meter) % bars;
      const inBar = b - Math.floor(b / tr.meter) * tr.meter;
      const ch = tr.chords[bar];
      const out = this.trackGain;
      // pad at bar start
      if (inBar === 0) {
        const dur = tr.meter * spb;
        if (tr.pad === 'strings') this.strings(ch.map((m) => m + 12), t, dur, 0.05, out);
        if (tr.pad === 'choir') this.choir(ch.map((m) => m + 12), t, dur, 0.05, out);
        if (tr.bass === 'drone') this.strings([ch[0] - 12], t, dur, 0.06, out);
        // melody for this bar
        let off = 0;
        const lead = tr.melody[bar % tr.melody.length];
        for (const [m, d] of lead) {
          if (m != null) {
            const nt = t + off * spb;
            if (tr.lead === 'celesta') this.celesta(m, nt, d * spb, 0.07, out);
            else this.horn(m - 12, nt, d * spb * 0.95, 0.05, out);
          }
          off += d;
        }
      }
      // rhythm section
      const isInt = Math.abs(inBar - Math.round(inBar)) < 1e-6;
      if (tr.style === 'waltz' && isInt) {
        if (inBar === 0 && tr.bass === 'pizz') this.pluck(ch[0] - 12, t, 0.09, out);
        else if (tr.arp === 'harp') ch.slice(0, 3).forEach((m, i) => this.pluck(m + 12 + (inBar === 2 ? 12 : 0), t + i * 0.04, 0.035, out, true));
      } else if (tr.style === 'ostinato') {
        const pat = [0, 0, 1, 0, 2, 0, 1, 0];
        const k = Math.round(inBar * 2) % 8;
        this.pluck(ch[pat[k] % ch.length] + (k % 2 ? 0 : -12) , t, 0.05, out, false, 'saw');
        if (tr.perc === 'timpani' && (k === 0 || k === 4 || (k === 7 && bar % 2))) this.timpani(ch[0] - 24, t, k === 0 ? 0.35 : 0.22, out);
        if (tr.bass === 'low' && k === 0) this.horn(ch[0] - 24, t, tr.meter * spb * 0.9, 0.04, out);
      } else if (tr.style === 'march') {
        const k = Math.round(inBar * 2) % 8;
        if (k % 2 === 0) this.pluck(ch[(k / 2) % ch.length], t, 0.05, out, true);
        if (k === 0 || k === 4) this.timpani(ch[0] - 24, t, 0.25, out);
        if (k === 2 || k === 6) this.snare(t, 0.12, out);
        if (k === 7) this.snare(t, 0.05, out);
        if (k === 0 && tr.bass === 'low') this.horn(ch[0] - 12, t, 2 * spb, 0.035, out);
      } else if (tr.style === 'pizz') {
        const k = Math.round(inBar * 2) % 8;
        if (k % 2 === 0) this.pluck((k === 0 || k === 4 ? ch[0] - 12 : ch[(k / 2) % ch.length]), t, 0.08, out);
      } else if (tr.style === 'pad' && isInt && tr.lead === 'celesta' && inBar === 1) {
        this.pluck(ch[1] + 24, t, 0.025, out, true);
      }
      this.beat += step;
      this.nextT += step * spb;
    }
  }

  // ------------------------------------------------------------ instruments
  _env(g, t, a, peak, d, sustain, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * sustain, t + a, d);
    g.gain.setTargetAtTime(0.0001, end, rel);
  }
  strings(notes, t, dur, vel, out) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.5;
    const g = ctx.createGain();
    f.connect(g).connect(out);
    this._env(g, t, Math.min(0.6, dur * 0.3), vel, 0.5, 0.85, 0.35, t + dur);
    for (const m of notes) {
      for (const det of [-7, 0, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(m);
        o.detune.value = det;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5 + Math.random();
        const lg = ctx.createGain(); lg.gain.value = 4;
        lfo.connect(lg).connect(o.detune);
        o.connect(f);
        o.start(t); o.stop(t + dur + 1.5);
        lfo.start(t); lfo.stop(t + dur + 1.5);
      }
    }
  }
  choir(notes, t, dur, vel, out) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.connect(out);
    this._env(g, t, 0.5, vel, 0.6, 0.9, 0.4, t + dur);
    for (const fq of [700, 1150, 2600]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 6;
      bp.connect(g);
      for (const m of notes) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = (Math.random() - 0.5) * 14;
        o.connect(bp);
        o.start(t); o.stop(t + dur + 1.5);
      }
    }
  }
  horn(m, t, dur, vel, out) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = 'sawtooth'; o2.type = 'triangle';
    o.frequency.value = o2.frequency.value = mtof(m);
    o2.detune.value = 5;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 1;
    f.frequency.setValueAtTime(400, t);
    f.frequency.linearRampToValueAtTime(1600, t + 0.12);
    f.frequency.setTargetAtTime(900, t + 0.15, 0.3);
    const g = ctx.createGain();
    o.connect(f); o2.connect(f); f.connect(g).connect(out);
    this._env(g, t, 0.07, vel, 0.3, 0.75, 0.12, t + dur);
    o.start(t); o2.start(t); o.stop(t + dur + 0.8); o2.stop(t + dur + 0.8);
  }
  celesta(m, t, dur, vel, out) {
    const ctx = this.ctx;
    const c = ctx.createOscillator(), mod = ctx.createOscillator();
    c.frequency.value = mtof(m);
    mod.frequency.value = mtof(m) * 3.5;
    const mi = ctx.createGain();
    mi.gain.setValueAtTime(mtof(m) * 1.6, t);
    mi.gain.exponentialRampToValueAtTime(1, t + 0.6);
    mod.connect(mi).connect(c.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, t + Math.max(0.8, dur * 1.6));
    c.connect(g).connect(out);
    c.start(t); mod.start(t);
    c.stop(t + dur * 1.6 + 1); mod.stop(t + dur * 1.6 + 1);
  }
  pluck(m, t, vel, out, bright = false, type = 'triangle') {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = mtof(m);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(bright ? 4000 : 1800, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + (bright ? 0.9 : 0.35));
    o.connect(f).connect(g).connect(out);
    o.start(t); o.stop(t + 1);
  }
  timpani(m, t, vel, out) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(mtof(m) * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 1.2);
    this._noise(t, 0.08, vel * 0.4, 'lowpass', 400, out);
  }
  snare(t, vel, out) { this._noise(t, 0.12, vel, 'highpass', 1800, out); }
  _noise(t, dur, vel, type, freq, out, q = 0.7, endFreq) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(out || this.sfxBus);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return g;
  }
  _tone(t, f0, f1, dur, vel, type = 'sine', out, rev = 0.2) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(out || this.sfxBus);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s).connect(this.revSend); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------ sfx
  sfx(name, o = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    const r = (a, b) => a + Math.random() * (b - a);
    switch (name) {
      case 'expelliarmus':
        this._noise(t, 0.35, 0.35, 'bandpass', 2400, null, 2, 600);
        this._tone(t, 900, 300, 0.25, 0.12, 'square');
        this._tone(t + 0.05, 2400, 2600, 0.4, 0.06, 'sine');
        break;
      case 'stupefy':
        this._tone(t, 1500, 160, 0.22, 0.16, 'sawtooth');
        this._noise(t, 0.2, 0.25, 'bandpass', 3000, null, 3, 800);
        break;
      case 'incendio':
        this._noise(t, 0.6, 0.45, 'lowpass', 300, null, 1, 2400);
        this._tone(t, 120, 60, 0.4, 0.2, 'sawtooth');
        break;
      case 'protego':
        [0, 4, 7].forEach((i) => this._tone(t, mtof(76 + i), mtof(76 + i) * 1.01, 0.7, 0.05, 'sine', null, 0.5));
        this._noise(t, 0.3, 0.12, 'highpass', 5000);
        break;
      case 'lumos':
        [0, 7, 12, 19].forEach((i, k) => this._tone(t + k * 0.05, mtof(84 + i), mtof(84 + i), 0.5, 0.05, 'sine', null, 0.6));
        break;
      case 'nox': this._tone(t, mtof(84), mtof(72), 0.3, 0.05, 'sine'); break;
      case 'leviosa':
        this._tone(t, 300, 950, 0.6, 0.1, 'sine', null, 0.5);
        this._tone(t, 450, 1400, 0.6, 0.04, 'triangle', null, 0.5);
        break;
      case 'throw': this._noise(t, 0.35, 0.3, 'bandpass', 600, null, 1, 2000); break;
      case 'petrificus':
        for (let i = 0; i < 6; i++) this._tone(t + i * 0.04, r(2500, 4500), r(1800, 3000), 0.15, 0.05, 'sine', null, 0.6);
        this._noise(t, 0.3, 0.2, 'highpass', 4000);
        break;
      case 'patronum':
        this.choir([N('E4'), N('B4'), N('E5'), N('G#5')], t, 1.6, 0.09, this.sfxBus);
        this._noise(t, 1.2, 0.2, 'highpass', 3000, null, 0.7, 8000);
        for (let i = 0; i < 8; i++) this._tone(t + i * 0.06, mtof(88 + (i % 4) * 3), mtof(88 + (i % 4) * 3), 0.6, 0.03, 'sine', null, 0.8);
        break;
      case 'curse':
        this._tone(t, 220, 90, 0.35, 0.12, 'sawtooth');
        this._noise(t, 0.3, 0.2, 'bandpass', 900, null, 4, 300);
        break;
      case 'impact':
        this._tone(t, 180, 45, 0.25, 0.35);
        this._noise(t, 0.18, 0.35, 'lowpass', 2500, null, 0.7, 300);
        break;
      case 'explode':
        this._tone(t, 140, 30, 0.7, 0.5);
        this._noise(t, 0.9, 0.6, 'lowpass', 1800, null, 0.7, 120);
        break;
      case 'shatter':
        for (let i = 0; i < 12; i++) this._tone(t + i * 0.02, r(2000, 6000), r(1000, 3000), 0.2, 0.06, 'square', null, 0.4);
        this._noise(t, 0.4, 0.4, 'highpass', 2500);
        break;
      case 'block':
        this._tone(t, 1200, 1000, 0.3, 0.12, 'triangle', null, 0.5);
        this._noise(t, 0.2, 0.2, 'bandpass', 3500, null, 3);
        break;
      case 'reflect':
        this._tone(t, 800, 2400, 0.3, 0.12, 'triangle', null, 0.6);
        this._tone(t + 0.05, 1600, 3200, 0.3, 0.08, 'sine', null, 0.6);
        break;
      case 'hurt':
        this._tone(t, 160, 70, 0.2, 0.3);
        this._noise(t, 0.12, 0.2, 'lowpass', 800);
        break;
      case 'enemyHurt': this._tone(t, r(260, 340), 120, 0.15, 0.12, 'triangle'); break;
      case 'faint': this._tone(t, 400, 80, 1.2, 0.2, 'triangle', null, 0.6); break;
      case 'step': this._noise(t, 0.06, o.soft ? 0.05 : 0.08, 'lowpass', o.soft ? 500 : 900); break;
      case 'jump': this._noise(t, 0.12, 0.08, 'bandpass', 900, null, 1, 1800); break;
      case 'land': this._tone(t, 120, 50, 0.15, 0.2); this._noise(t, 0.1, 0.12, 'lowpass', 600); break;
      case 'dodge': this._noise(t, 0.3, 0.2, 'bandpass', 500, null, 1.2, 2200); break;
      case 'ui': this._tone(t, 880, 1320, 0.08, 0.06, 'triangle', null, 0.1); break;
      case 'uimove': this._tone(t, 660, 700, 0.04, 0.035, 'triangle', null, 0); break;
      case 'uiback': this._tone(t, 700, 440, 0.08, 0.05, 'triangle', null, 0.1); break;
      case 'wheel': this._noise(t, 0.2, 0.08, 'bandpass', 1500, null, 2, 3000); break;
      case 'pickup':
        [0, 4, 7, 12].forEach((i, k) => this._tone(t + k * 0.06, mtof(79 + i), mtof(79 + i), 0.4, 0.06, 'sine', null, 0.6));
        break;
      case 'card':
        [0, 4, 7, 11, 14].forEach((i, k) => this._tone(t + k * 0.07, mtof(76 + i), mtof(76 + i), 0.6, 0.07, 'triangle', null, 0.7));
        break;
      case 'points':
        [0, 4, 7].forEach((i) => this._tone(t, mtof(72 + i), mtof(72 + i), 0.5, 0.05, 'sine', null, 0.6));
        [0, 4, 7].forEach((i) => this._tone(t + 0.12, mtof(79 + i), mtof(79 + i), 0.7, 0.05, 'sine', null, 0.6));
        break;
      case 'unlock':
        this.choir([N('C4'), N('G4'), N('C5'), N('E5')], t, 1.8, 0.07, this.sfxBus);
        [0, 4, 7, 12, 16, 19].forEach((i, k) => this._tone(t + k * 0.08, mtof(72 + i), mtof(72 + i), 0.8, 0.05, 'sine', null, 0.7));
        break;
      case 'quest':
        [0, 7, 12].forEach((i, k) => this.horn(N('C4') + i, t + k * 0.15, 0.4, 0.06, this.sfxBus));
        break;
      case 'fail': [0, -3, -7].forEach((i, k) => this._tone(t + k * 0.15, mtof(67 + i), mtof(66 + i), 0.35, 0.07, 'triangle')); break;
      case 'door': this._tone(t, 90, 70, 0.6, 0.12, 'sawtooth'); this._noise(t, 0.5, 0.1, 'lowpass', 400); break;
      case 'stairs': this._noise(t, 1.6, 0.25, 'lowpass', 200, null, 1, 90); this._tone(t, 60, 45, 1.5, 0.1, 'sawtooth'); break;
      case 'roar': {
        const ctx2 = this.ctx; const oo = ctx2.createOscillator(); oo.type = 'sawtooth';
        oo.frequency.setValueAtTime(90, t); oo.frequency.linearRampToValueAtTime(60, t + 1.2);
        const lf = ctx2.createOscillator(); lf.frequency.value = 18; const lg = ctx2.createGain(); lg.gain.value = 18; lf.connect(lg).connect(oo.frequency);
        const fl = ctx2.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 700;
        const gg = ctx2.createGain(); gg.gain.setValueAtTime(0.001, t); gg.gain.linearRampToValueAtTime(0.4, t + 0.15); gg.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
        oo.connect(fl).connect(gg).connect(this.sfxBus); oo.start(t); lf.start(t); oo.stop(t + 1.4); lf.stop(t + 1.4);
        this._noise(t, 1.2, 0.2, 'lowpass', 500);
        break;
      }
      case 'slam': this._tone(t, 90, 25, 0.8, 0.6); this._noise(t, 0.7, 0.5, 'lowpass', 900, null, 0.7, 80); break;
      case 'whoosh': this._noise(t, 0.4, 0.25, 'bandpass', 400, null, 1, 1600); break;
      case 'dementor':
        this._tone(t, 520, 180, 2.2, 0.06, 'sine', null, 0.9);
        this._tone(t, 530, 175, 2.2, 0.05, 'sine', null, 0.9);
        this._noise(t, 1.8, 0.12, 'bandpass', 600, null, 6, 200);
        break;
      case 'pixie': for (let i = 0; i < 4; i++) this._tone(t + i * 0.05, r(1800, 2600), r(2000, 3000), 0.05, 0.04, 'square', null, 0); break;
      case 'snitch': this._tone(t, 3200, 3400, 0.2, 0.03, 'sine', null, 0.2); break;
      case 'bludger': this._noise(t, 0.5, 0.35, 'bandpass', 300, null, 1, 1200); this._tone(t, 200, 80, 0.3, 0.15); break;
      case 'ring': [0, 7].forEach((i, k) => this._tone(t + k * 0.05, mtof(84 + i), mtof(84 + i), 0.35, 0.06, 'sine', null, 0.5)); break;
      case 'bubble': this._tone(t, r(300, 700), r(800, 1400), 0.08, 0.06, 'sine', null, 0.3); break;
      case 'splash': this._noise(t, 0.3, 0.25, 'bandpass', 1200, null, 1); this._tone(t, 500, 1200, 0.15, 0.06); break;
      case 'combo':
        [0, 5, 9, 12].forEach((i, k) => this._tone(t + k * 0.04, mtof(76 + i), mtof(76 + i), 0.4, 0.07, 'square', null, 0.5));
        break;
      case 'slowmo': this._tone(t, 220, 55, 1.4, 0.3, 'sine', null, 0.8); break;
      case 'victory':
        [[0, 4, 7], [5, 9, 12], [7, 11, 14], [12, 16, 19]].forEach((c, k) => c.forEach((i) => this.horn(N('C4') + i, t + k * 0.32, 0.5, 0.05, this.sfxBus)));
        break;
      case 'hoot': this._tone(t, 500, 420, 0.25, 0.06, 'sine'); this._tone(t + 0.3, 480, 400, 0.4, 0.06, 'sine'); break;
      case 'frog': this._tone(t, 180, 260, 0.08, 0.12, 'square', null, 0); this._tone(t + 0.1, 160, 220, 0.08, 0.1, 'square', null, 0); break;
      case 'screech': this._tone(t, 1400, 900, 0.5, 0.08, 'sawtooth', null, 0.5); this._noise(t, 0.5, 0.1, 'bandpass', 2500, null, 3); break;
      case 'accio': this._tone(t, 1400, 500, 0.3, 0.08, 'sine', null, 0.3); this._noise(t, 0.25, 0.08, 'bandpass', 2000, null, 2, 600); break;
      case 'reparo': [0, 4, 7, 12].forEach((i, k) => this._tone(t + k * 0.05, mtof(79 + i), mtof(79 + i), 0.25, 0.04, 'triangle', null, 0.4)); break;
      case 'alohomora': this._tone(t, 600, 900, 0.12, 0.06, 'square', null, 0.1); this._tone(t + 0.12, 1200, 1200, 0.2, 0.05, 'triangle', null, 0.3); this._noise(t + 0.1, 0.06, 0.1, 'highpass', 4000); break;
      case 'flipendo': this._tone(t, 300, 900, 0.18, 0.12, 'triangle', null, 0.2); this._noise(t, 0.2, 0.1, 'bandpass', 900, null, 1, 2500); break;
      case 'rictusempra': for (let i = 0; i < 5; i++) this._tone(t + i * 0.06, r(900, 1300), r(1300, 1700), 0.06, 0.05, 'triangle', null, 0.1); break;
      case 'episkey': [0, 4, 7, 11].forEach((i, k) => this._tone(t + k * 0.08, mtof(76 + i), mtof(76 + i), 0.6, 0.05, 'sine', null, 0.7)); break;
      case 'glacius': this._noise(t, 0.4, 0.15, 'highpass', 3000, null, 1, 7000); this._tone(t, 2400, 1800, 0.35, 0.04, 'sine', null, 0.5); break;
      case 'depulso': this._tone(t, 500, 120, 0.3, 0.15, 'sawtooth', null, 0.2); this._noise(t, 0.3, 0.15, 'bandpass', 600, null, 1, 200); break;
      case 'arresto': this._tone(t, 440, 220, 1.2, 0.08, 'sine', null, 0.8); this._tone(t, 660, 330, 1.2, 0.05, 'sine', null, 0.8); break;
      case 'finite': this._tone(t, 1600, 400, 0.4, 0.06, 'triangle', null, 0.4); this._noise(t, 0.3, 0.06, 'highpass', 5000); break;
      case 'confringo': this._tone(t, 900, 200, 0.25, 0.14, 'sawtooth', null, 0.1); this._noise(t, 0.3, 0.2, 'bandpass', 1400, null, 1, 400); break;
      case 'diffindo': this._noise(t, 0.18, 0.18, 'bandpass', 5000, null, 6, 2000); this._tone(t, 3000, 1500, 0.15, 0.04, 'sawtooth', null, 0); break;
      case 'descendo': this._tone(t, 700, 90, 0.4, 0.15, 'triangle', null, 0.2); break;
      case 'aguamenti': this._noise(t, 0.7, 0.2, 'bandpass', 1100, null, 0.8, 700); break;
      case 'bombarda': this._tone(t, 220, 330, 0.15, 0.1, 'square', null, 0.1); break;
      case 'fuse': this._noise(t, 1.0, 0.06, 'highpass', 6000, null, 1, 4000); break;
      case 'silencio': this._noise(t, 0.4, 0.12, 'lowpass', 600, null, 1, 100); this._tone(t, 300, 150, 0.3, 0.04, 'sine', null, 0); break;
      case 'obscuro': this._tone(t, 200, 100, 0.5, 0.1, 'sawtooth', null, 0.5); this._noise(t, 0.4, 0.1, 'lowpass', 400); break;
      case 'incarcerous': for (let i = 0; i < 3; i++) this._noise(t + i * 0.07, 0.08, 0.15, 'bandpass', 700 + i * 200, null, 3); break;
      case 'levicorpus': this._tone(t, 200, 1200, 0.35, 0.08, 'triangle', null, 0.3); break;
      case 'ventus': this._noise(t, 0.9, 0.3, 'bandpass', 400, null, 0.6, 1400); break;
      case 'reducto': this._tone(t, 1200, 100, 0.3, 0.15, 'square', null, 0.2); this._noise(t + 0.05, 0.3, 0.2, 'lowpass', 1500, null, 1, 200); break;
      case 'oppugno': for (let i = 0; i < 6; i++) this._tone(t + i * 0.05, r(2000, 3000), r(2400, 3600), 0.05, 0.03, 'sine', null, 0.2); break;
      case 'whistle': [0, 0.55].forEach((d) => { this._tone(t + d, 880, 870, 0.45, 0.07, 'sine', null, 0.2); this._tone(t + d, 1108, 1100, 0.45, 0.05, 'sine', null, 0.2); this._noise(t + d, 0.45, 0.05, 'bandpass', 2400, null, 4); }); break;
      case 'steam': this._noise(t, 0.8, 0.15, 'highpass', 1500, null, 1, 3000); break;
      case 'portkey': this._tone(t, 200, 1600, 0.9, 0.18, 'triangle', null, 0.6); this._noise(t, 0.9, 0.12, 'bandpass', 600, null, 1, 4000); break;
      case 'gong': this._tone(t, 110, 105, 2.5, 0.25, 'sine', null, 0.9); this._tone(t, 167, 160, 2.2, 0.12, 'sine', null, 0.9); break;
      default: break;
    }
  }

  // murmured "voice" blips under dialogue text
  voice(kind, len) {
    if (!this.ctx || G.settings.voiceBlips === false) return;
    const base = { low: 110, mid: 170, high: 240, hat: 130, troll: 70 }[kind] || 170;
    const n = Math.min(14, Math.ceil(len / 9));
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.09;
      const f = base * (0.85 + Math.random() * 0.4);
      const ctx = this.ctx;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600 + Math.random() * 900; bp.Q.value = 4;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.08);
      o.connect(bp).connect(g).connect(this.sfxBus);
      o.start(t); o.stop(t + 0.1);
    }
  }

  // looping wind for flying; level 0..1
  wind(level) {
    if (!this.ctx) return;
    if (!this.windNode && level > 0) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noiseBuf; s.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.value = 500;
      const g = this.ctx.createGain(); g.gain.value = 0;
      s.connect(f).connect(g).connect(this.sfxBus);
      s.start();
      this.windNode = { s, f, g };
    }
    if (this.windNode) {
      const t = this.ctx.currentTime;
      this.windNode.g.gain.setTargetAtTime(level * 0.25, t, 0.2);
      this.windNode.f.frequency.setTargetAtTime(300 + level * 900, t, 0.2);
      if (level <= 0) {
        const w = this.windNode; this.windNode = null;
        setTimeout(() => { try { w.s.stop(); } catch { /* ignore */ } }, 800);
      }
    }
  }
}
