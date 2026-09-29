// All sound is synthesised with WebAudio: kart engines, plastic brick
// clatter, item sounds and a small step sequencer for per-track music.
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.5; this.sfxVol = 0.8;
    this.listener = null;   // {x,z} of main viewer for distance attenuation
    this.engines = [];
  }
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.pendingMusic) { const m = this.pendingMusic; this.pendingMusic = null; this.music(m); }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = this.sfxVol; this.sfxGain.connect(this.master);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = this.musicVol * 0.5; this.musicGain.connect(this.master);
    // noise buffer
    const len = ctx.sampleRate * 1.5;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.pendingMusic) { this.music(this.pendingMusic); this.pendingMusic = null; }
  }
  // silence everything while the tab is hidden or unfocused
  setMuted(m) {
    if (this.muted === m) return;
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03);
    if (this.track) { if (m) this.track.pause(); else this.track.play().catch(() => {}); }
  }
  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (this.track) this.track.volume = Math.min(1, music);
    if (this.ctx) { this.musicGain.gain.value = music * 0.5; this.sfxGain.gain.value = sfx; }
  }

  // ---- primitives ------------------------------------------------------------------
  tone(freq, dur, { type = 'square', vol = 0.2, at = 0, slide = 0, attack = 0.005, dest = null, filter = 0 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    let node = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
    node.connect(g).connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noiseHit(dur, { vol = 0.3, at = 0, freq = 2000, q = 1, type = 'bandpass', dest = null, sweep = 0 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f).connect(g).connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  // plastic bricks scattering: many tiny resonant clicks
  clatter(n = 12, spread = 0.45, vol = 0.25) {
    for (let i = 0; i < n; i++) {
      const at = Math.pow(Math.random(), 1.6) * spread;
      this.noiseHit(0.03 + Math.random() * 0.03, { vol: vol * (1 - at / spread * 0.6), at, freq: 1800 + Math.random() * 4200, q: 8 + Math.random() * 10 });
    }
  }

  // positional-ish volume
  att(pos) {
    if (!pos || !this.listener) return 1;
    const d = Math.hypot(pos.x - this.listener.x, pos.z - this.listener.z);
    return Math.max(0, 1 - d / 90);
  }

  sfx(name, pos = null) {
    if (!this.ctx) return;
    const a = this.att(pos);
    if (a <= 0.02) return;
    switch (name) {
      case 'click': this.tone(880, 0.05, { vol: 0.12, type: 'triangle' }); break;
      case 'select': this.tone(660, 0.08, { vol: 0.15, type: 'square' }); this.tone(990, 0.12, { vol: 0.15, at: 0.07, type: 'square' }); this.clatter(3, 0.05, 0.2); break;
      case 'back': this.tone(500, 0.1, { vol: 0.12, type: 'triangle', slide: 0.6 }); break;
      case 'join': this.clatter(5, 0.12, 0.3); this.tone(523, 0.1, { vol: 0.15 }); this.tone(784, 0.18, { vol: 0.15, at: 0.08 }); break;
      case 'count': this.tone(440, 0.35, { vol: 0.25, type: 'square', filter: 3000 }); break;
      case 'go': this.tone(880, 0.7, { vol: 0.28, type: 'square', filter: 4000 }); this.tone(1320, 0.7, { vol: 0.12, type: 'sawtooth', filter: 3000 }); break;
      case 'roll': this.tone(1200 + Math.random() * 600, 0.03, { vol: 0.06, type: 'square' }); break;
      case 'itemget': this.tone(784, 0.08, { vol: 0.15 }); this.tone(1175, 0.16, { vol: 0.15, at: 0.07 }); break;
      case 'box': this.clatter(6, 0.1, 0.22); this.tone(1500, 0.1, { vol: 0.08, type: 'triangle', slide: 1.5 }); break;
      case 'boost': this.noiseHit(0.6, { vol: 0.35 * a, freq: 400, sweep: 6, q: 2 }); this.tone(200, 0.5, { vol: 0.12 * a, type: 'sawtooth', slide: 3, filter: 2000 }); break;
      case 'hop': this.tone(300, 0.08, { vol: 0.08, type: 'triangle', slide: 1.8 }); break;
      case 'spark1': this.tone(1400, 0.08, { vol: 0.07, type: 'square' }); break;
      case 'spark2': this.tone(1700, 0.1, { vol: 0.08, type: 'square' }); this.tone(2100, 0.1, { vol: 0.06, at: 0.05 }); break;
      case 'spark3': this.tone(2000, 0.1, { vol: 0.08, type: 'square' }); this.tone(2500, 0.12, { vol: 0.07, at: 0.05 }); this.tone(3000, 0.14, { vol: 0.06, at: 0.1 }); break;
      case 'glide': this.noiseHit(0.9, { vol: 0.25, freq: 600, sweep: 3, q: 0.8 }); [0, 4, 7].forEach((n, i) => this.tone(mtof(76 + n), 0.18, { vol: 0.1, at: 0.05 + i * 0.06, type: 'triangle' })); break;
      case 'trick': this.tone(700, 0.15, { vol: 0.12, type: 'triangle', slide: 2 }); break;
      case 'land': this.noiseHit(0.12, { vol: 0.2, freq: 300, type: 'lowpass' }); this.clatter(3, 0.05, 0.12); break;
      case 'stud': this.tone(1568, 0.07, { vol: 0.12, type: 'sine' }); this.tone(2093, 0.14, { vol: 0.12, at: 0.05, type: 'sine' }); break;
      case 'rocket': this.noiseHit(0.8, { vol: 0.25 * a, freq: 800, sweep: 0.3, q: 1 }); this.tone(300, 0.4, { vol: 0.08 * a, type: 'sawtooth', slide: 2 }); break;
      case 'cannon': this.tone(150, 0.25, { vol: 0.3 * a, type: 'square', slide: 0.4, filter: 900 }); this.noiseHit(0.2, { vol: 0.2 * a, freq: 600 }); break;
      case 'bounce': this.tone(400, 0.06, { vol: 0.12 * a, type: 'triangle' }); break;
      case 'trap': this.clatter(8, 0.25, 0.22 * a); break;
      case 'crash': this.noiseHit(0.35, { vol: 0.35 * a, freq: 500, type: 'lowpass' }); this.clatter(18, 0.7, 0.3 * a); break;
      case 'spin': this.clatter(8, 0.3, 0.2 * a); this.tone(900, 0.4, { vol: 0.1 * a, type: 'triangle', slide: 0.4 }); break;
      case 'wall': this.noiseHit(0.1, { vol: 0.25 * a, freq: 250, type: 'lowpass' }); this.clatter(4, 0.08, 0.15 * a); break;
      case 'bump': this.noiseHit(0.08, { vol: 0.25 * a, freq: 350, type: 'lowpass' }); this.tone(180, 0.1, { vol: 0.1 * a, type: 'square', filter: 600 }); break;
      case 'shield': this.tone(600, 0.3, { vol: 0.12 * a, type: 'sine', slide: 2 }); this.tone(900, 0.3, { vol: 0.08 * a, type: 'sine', slide: 2, at: 0.05 }); break;
      case 'golden': for (let i = 0; i < 6; i++) this.tone(mtof(72 + [0, 4, 7, 12, 16, 19][i]), 0.12, { vol: 0.12, at: i * 0.05 }); break;
      case 'storm': this.noiseHit(1.2, { vol: 0.4, freq: 120, type: 'lowpass' }); this.clatter(30, 1.4, 0.2); break;
      case 'splash': this.noiseHit(0.6, { vol: 0.3 * a, freq: 900, sweep: 0.3, q: 0.7 }); break;
      case 'lap': this.tone(784, 0.12, { vol: 0.18 }); this.tone(1047, 0.25, { vol: 0.18, at: 0.1 }); break;
      case 'finallap': [0, 4, 7, 12].forEach((n, i) => this.tone(mtof(67 + n), 0.25, { vol: 0.16, at: i * 0.12 })); break;
      case 'finish': [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => this.tone(mtof(60 + n), 0.3, { vol: 0.18, at: i * 0.1, type: 'square', filter: 3500 })); this.clatter(10, 0.8, 0.15); break;
      case 'wrong': this.tone(200, 0.2, { vol: 0.12, type: 'square' }); break;
      case 'pause': this.tone(700, 0.08, { vol: 0.12 }); this.tone(500, 0.1, { vol: 0.12, at: 0.08 }); break;
    }
  }

  // ---- engines (one per local player) -----------------------------------------------------
  engine() {
    const c = this.ctx;
    if (!c) return { set() {}, stop() {} };
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'square';
    f.type = 'lowpass'; f.frequency.value = 600; f.Q.value = 4;
    g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g).connect(this.sfxGain);
    o1.start(); o2.start();
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 22; lg.gain.value = 6; lfo.connect(lg).connect(o1.frequency); lfo.start();
    let vol = 0.06;
    return {
      set(speed01, boost, on = true, scale = 1) {
        const t = c.currentTime;
        const base = 55 + speed01 * 150 + (boost ? 35 : 0);
        o1.frequency.setTargetAtTime(base, t, 0.06);
        o2.frequency.setTargetAtTime(base * 0.502, t, 0.06);
        f.frequency.setTargetAtTime(500 + speed01 * 1800 + (boost ? 900 : 0), t, 0.08);
        lfo.frequency.setTargetAtTime(14 + speed01 * 30, t, 0.1);
        g.gain.setTargetAtTime(on ? vol * scale * (0.5 + speed01 * 0.6) : 0, t, 0.1);
      },
      stop() { try { g.gain.setTargetAtTime(0, c.currentTime, 0.05); o1.stop(c.currentTime + 0.3); o2.stop(c.currentTime + 0.3); lfo.stop(c.currentTime + 0.3); } catch { /* already stopped */ } },
      setVol(v) { vol = v; },
    };
  }

  // ---- music ------------------------------------------------------------------------------------
  music(spec) {
    if (!this.ctx) { this.pendingMusic = spec; return; }
    this.stopMusic();
    if (!spec) return;
    if (spec.file) {
      // recorded song: looped <audio> element (cached per file)
      this.tracks ||= {};
      let a = this.tracks[spec.file];
      if (!a) { a = new window.Audio(spec.file); a.loop = true; a.preload = 'auto'; this.tracks[spec.file] = a; }
      a.currentTime = 0; a.playbackRate = 1; a.volume = Math.min(1, this.musicVol);
      this.track = a;
      if (!this.muted) a.play().catch(() => { this.pendingMusic = spec; });
      return;
    }
    const c = this.ctx;
    const out = c.createGain(); out.gain.value = 1; out.connect(this.musicGain);
    const scale = SCALES[spec.scale] || SCALES.major;
    const root = spec.root || 60;
    // deterministic pattern from style name
    let seed = [...(spec.style + root)].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const note = (deg, oct = 0) => root + scale[((deg % 7) + 7) % 7] + 12 * (Math.floor(deg / 7) + oct);
    const prog = spec.style === 'rock' ? [0, 5, 3, 4] : spec.style === 'space' ? [0, 3, 5, 4] : spec.style === 'shanty' ? [0, 3, 4, 0] : [0, 4, 5, 3];
    const steps = 16;
    const lead = [];
    let deg = 7;
    for (let bar = 0; bar < 4; bar++) {
      const row = [];
      for (let s = 0; s < steps; s++) {
        if (rnd() < (s % 4 === 0 ? 0.85 : s % 2 === 0 ? 0.5 : 0.22)) {
          deg += Math.round((rnd() - 0.5) * 4);
          deg = Math.max(3, Math.min(12, deg));
          const chordTone = prog[bar] + [0, 2, 4][Math.floor(rnd() * 3)] + 7;
          row.push(s % 4 === 0 ? chordTone : deg);
        } else row.push(null);
      }
      lead.push(row);
    }
    // second half: variation
    for (let bar = 0; bar < 4; bar++) lead.push(lead[bar].map((n, s) => (n !== null && s > 8 && rnd() < 0.5 ? n + (rnd() < 0.5 ? 2 : -1) : n)));
    const state = { step: 0, next: c.currentTime + 0.1, bpm: spec.bpm || 128, out, stopped: false, rate: 1 };
    this.song = state;
    const sched = () => {
      if (state.stopped) return;
      const spb = 60 / (state.bpm * state.rate) / 4;
      while (state.next < c.currentTime + 0.15) {
        const s = state.step % steps, bar = Math.floor(state.step / steps) % 8;
        const t0 = state.next - c.currentTime;
        const ch = prog[bar % 4];
        // drums
        if (s % 4 === 0) this.tone(150, 0.18, { vol: 0.5, type: 'sine', slide: 0.3, at: t0, dest: out });
        if (s % 8 === 4) this.noiseHit(0.12, { vol: 0.22, at: t0, freq: 1800, q: 0.8, dest: out });
        if (spec.style !== 'shanty' && s % 2 === 1) this.noiseHit(0.03, { vol: 0.08, at: t0, freq: 8000, type: 'highpass', dest: out });
        if (spec.style === 'shanty' && s % 4 === 2) this.noiseHit(0.05, { vol: 0.1, at: t0, freq: 5000, q: 3, dest: out });
        // bass
        const bassPat = spec.style === 'rock' ? [0, 0, 7, 0] : [0, null, 7, null];
        const bp = bassPat[s % 4];
        if (bp !== null && (s % 2 === 0 || spec.style === 'rock')) this.tone(mtof(note(ch, -2) + (bp === 7 ? 7 : 0)), spb * 1.6, { vol: 0.2, type: spec.style === 'space' ? 'triangle' : 'square', at: t0, dest: out, filter: 700 });
        // chord stabs / arps
        if (spec.style === 'space' || spec.style === 'jingle') {
          const arp = [0, 2, 4, 7][s % 4];
          this.tone(mtof(note(ch + arp, 0)), spb * 0.9, { vol: 0.06, type: 'triangle', at: t0, dest: out });
        } else if (s % 4 === 2) {
          for (const k of [0, 2, 4]) this.tone(mtof(note(ch + k, 0)), spb * 1.2, { vol: 0.04, type: 'square', at: t0, dest: out, filter: 2500 });
        }
        if (spec.style === 'jingle' && s % 2 === 0) this.noiseHit(0.05, { vol: 0.06, at: t0, freq: 9000, q: 4, dest: out });
        // lead
        const n = lead[bar][s];
        if (n !== null) this.tone(mtof(note(n, 0)), spb * (lead[bar][s + 1] === null ? 1.8 : 0.9), { vol: 0.07, type: spec.style === 'rock' ? 'sawtooth' : spec.style === 'space' ? 'sine' : 'square', at: t0, dest: out, filter: spec.style === 'rock' ? 2200 : 3500 });
        state.next += spb;
        state.step++;
      }
      state.timer = setTimeout(sched, 30);
    };
    sched();
  }
  musicRate(r) { if (this.song) this.song.rate = r; if (this.track) this.track.playbackRate = r; }
  stopMusic() {
    if (this.track) { this.track.pause(); this.track = null; }
    if (this.song) {
      this.song.stopped = true; clearTimeout(this.song.timer);
      const o = this.song.out;
      try { o.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); setTimeout(() => o.disconnect(), 600); } catch { /* ignore */ }
      this.song = null;
    }
  }
}
