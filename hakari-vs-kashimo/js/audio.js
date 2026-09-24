// Audio: synthesized SFX + procedural soundtrack, scheduled ahead on the audio clock.
'use strict';
const AU = { ctx: null, master: null, dry: null, rev: null, noise: null, muted: false };
function auInit() {
  if (AU.ctx) { AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const a = AU.ctx = new AC();
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
  AU.master = a.createGain(); AU.master.gain.value = AU.muted ? 0 : 0.8;
  AU.master.connect(comp); comp.connect(a.destination);
  AU.dry = a.createGain(); AU.dry.connect(AU.master);
  const conv = a.createConvolver(), len = a.sampleRate * 2.6, ir = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  conv.buffer = ir; AU.rev = a.createGain(); AU.rev.gain.value = 0.45; AU.rev.connect(conv); conv.connect(AU.master);
  AU.noise = a.createBuffer(1, a.sampleRate * 3, a.sampleRate);
  const d = AU.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function auMute(m) { AU.muted = m; if (AU.master) AU.master.gain.value = m ? 0 : 0.8; }
function out(node, rev) {
  node.connect(AU.dry);
  if (rev) { const g = AU.ctx.createGain(); g.gain.value = rev; node.connect(g); g.connect(AU.rev); }
}
function envGain(when, vol, atk, dur) {
  const g = AU.ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, when + atk + dur);
  return g;
}
function osc(when, type, f0, f1, dur, vol, o = {}) {
  const a = AU.ctx, s = a.createOscillator(); s.type = type;
  s.frequency.setValueAtTime(f0, when); if (f1 && f1 !== f0) s.frequency.exponentialRampToValueAtTime(f1, when + dur);
  if (o.detune) s.detune.value = o.detune;
  const g = envGain(when, vol, o.atk || 0.004, dur);
  let node = s;
  if (o.lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; s.connect(f); node = f; }
  node.connect(g); out(g, o.rev ?? 0.15);
  s.start(when); s.stop(when + dur + (o.atk || 0.004) + 0.05);
}
function nz(when, dur, vol, o = {}) {
  const a = AU.ctx, s = a.createBufferSource(), f = a.createBiquadFilter();
  s.buffer = AU.noise; f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
  f.frequency.setValueAtTime(o.f0 || 2000, when);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, when + dur);
  const g = envGain(when, vol, o.atk || 0.003, dur);
  s.connect(f); f.connect(g); out(g, o.rev ?? 0.15);
  s.start(when, Math.random() * 1.5); s.stop(when + dur + (o.atk || 0.003) + 0.05);
}
const mf = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------- SFX library ----------
const SFX = {
  hit(w, big = 1) {
    nz(w, 0.02, 0.9 * big, { type: 'highpass', f0: 3000 });
    nz(w, 0.25 * big, 1.0 * big, { f0: 3500, f1: 150, rev: 0.25 });
    osc(w, 'sine', 170, 38, 0.3 * big, 1.0 * big);
    osc(w, 'square', 90, 30, 0.1, 0.25 * big, { lp: 600 });
  },
  bigHit(w) {
    SFX.hit(w, 1.4);
    nz(w, 1.8, 0.8, { f0: 1500, f1: 40, rev: 0.6 });
    osc(w, 'sine', 70, 22, 1.4, 1.0);
  },
  thud(w) { nz(w, 0.12, 0.6, { f0: 1200, f1: 100 }); osc(w, 'sine', 120, 45, 0.15, 0.6); },
  whoosh(w, d = 0.35, v = 0.5) { nz(w, d, v, { type: 'bandpass', f0: 300, f1: 3000, q: 1.5, atk: d * 0.6, rev: 0.1 }); },
  whooshDown(w, d = 0.4, v = 0.5) { nz(w, d, v, { type: 'bandpass', f0: 3000, f1: 250, q: 1.5, atk: d * 0.3 }); },
  slash(w, v = 0.5) {
    nz(w, 0.14, v, { type: 'highpass', f0: 2500, f1: 7000, atk: 0.01 });
    osc(w, 'sawtooth', 3200, 700, 0.08, v * 0.25);
    osc(w + 0.02, 'triangle', 3800 + Math.random() * 800, 0, 0.35, v * 0.12, { rev: 0.5 });
  },
  zip(w) { osc(w, 'square', 300, 2400, 0.1, 0.18, { lp: 4000 }); nz(w, 0.08, 0.3, { type: 'highpass', f0: 5000 }); },
  boom(w, d = 2, v = 1) { nz(w, d, v, { f0: 1400, f1: 40, rev: 0.5, atk: 0.01 }); osc(w, 'sine', 80, 25, d * 0.8, v); },
  crumble(w, d = 1.5) { for (let i = 0; i < 14; i++) nz(w + Math.random() * d, 0.15 + Math.random() * 0.3, 0.35, { f0: 300 + Math.random() * 900, f1: 80 }); nz(w, d, 0.3, { f0: 250, f1: 60, atk: 0.2 }); },
  glass(w, v = 0.5) {
    nz(w, 0.4, v, { type: 'highpass', f0: 3000, rev: 0.4 });
    for (let i = 0; i < 16; i++) osc(w + Math.random() * 0.4, 'triangle', 2500 + Math.random() * 5000, 0, 0.12 + Math.random() * 0.2, v * 0.12, { rev: 0.5 });
  },
  charge(w, d, f0, f1, v = 0.2, type = 'sawtooth') { osc(w, type, f0, f1, d, v, { atk: d * 0.85, lp: 2500, rev: 0.3 }); osc(w, type, f0 * 1.01, f1 * 1.01, d, v * 0.7, { atk: d * 0.85, lp: 2500 }); },
  hum(w, d, f, v = 0.3) { osc(w, 'sine', f, f, d, v, { atk: d * 0.3, rev: 0.3 }); osc(w, 'triangle', f * 2.01, f * 2.01, d, v * 0.3, { atk: d * 0.3 }); },
  fire(w, d, v = 0.5) { nz(w, d, v, { type: 'bandpass', f0: 600, f1: 250, q: 0.5, atk: d * 0.4, rev: 0.2 }); for (let i = 0; i < 20; i++) nz(w + Math.random() * d, 0.03, 0.25, { type: 'highpass', f0: 3000 }); },
  heart(w) { osc(w, 'sine', 65, 40, 0.18, 0.9); osc(w + 0.22, 'sine', 60, 38, 0.16, 0.7); },
  riser(w, d, v = 0.4) { nz(w, d, v, { type: 'highpass', f0: 200, f1: 7000, atk: d * 0.95, rev: 0.3 }); },
  ting(w, v = 0.3) { osc(w, 'sine', 2093, 2093, 1.2, v, { rev: 0.7 }); osc(w, 'sine', 3136, 3136, 0.9, v * 0.6, { rev: 0.7 }); },
  glitch(w, d = 0.5) { for (let i = 0; i < 12; i++) osc(w + (i / 12) * d, 'square', 200 + Math.random() * 2000, 0, 0.03, 0.08); },
  wind(w, d, v = 0.25) { nz(w, d, v, { type: 'bandpass', f0: 500, f1: 300, q: 0.4, atk: d * 0.4, rev: 0.2 }); },
  crackle(w, d, v = 0.3) { for (let i = 0; i < d * 30; i++) nz(w + Math.random() * d, 0.02, v * Math.random(), { type: 'highpass', f0: 4000 }); },
  stop(w) { osc(w, 'sine', 400, 60, 0.4, 0.5); nz(w, 0.3, 0.3, { f0: 800, f1: 100 }); },
  shatter(w) { SFX.glass(w, 0.9); SFX.boom(w, 1.5, 0.7); },
  gong(w) { [1, 2.76, 5.4].forEach((m, i) => osc(w, 'sine', 110 * m, 110 * m * 0.99, 3, 0.4 / (i + 1), { rev: 0.8 })); },
  laugh(w) { for (let i = 0; i < 5; i++) { osc(w + i * 0.13, 'sawtooth', 190 - i * 12, 150 - i * 10, 0.09, 0.2, { lp: 900, rev: 0.4 }); nz(w + i * 0.13, 0.06, 0.15, { type: 'bandpass', f0: 1200, q: 2 }); } },
  ping(w) { osc(w, 'sine', 1600 + Math.random() * 600, 900, 0.18, 0.18, { rev: 0.4 }); nz(w, 0.04, 0.2, { type: 'highpass', f0: 5000 }); },
  thunder(w) { nz(w, 0.05, 0.6, { type: 'highpass', f0: 2000 }); nz(w + 0.05, 2.2, 0.6, { f0: 600, f1: 60, rev: 0.6, atk: 0.1 }); },
  blackflash(w) { SFX.bigHit(w); SFX.crackle(w, 0.8, 0.6); osc(w, 'sawtooth', 60, 30, 0.8, 0.5, { lp: 400 }); },
};

// ---------- extra SFX for this film ----------
Object.assign(SFX, {
  zap(w, v = 0.4) { osc(w, 'sawtooth', 1800, 200, 0.12, v * 0.5, { lp: 5000 }); nz(w, 0.15, v, { type: 'highpass', f0: 3000, rev: 0.2 }); SFX.crackle(w, 0.25, v * 0.7); },
  thunderZap(w) { SFX.zap(w, 0.8); nz(w, 1.2, 0.7, { f0: 3000, f1: 80, rev: 0.6 }); osc(w, 'square', 80, 30, 0.5, 0.4, { lp: 500 }); },
  reel(w, d = 1.5) { for (let i = 0; i < d * 18; i++) osc(w + i / 18, 'square', 1200 + (i % 3) * 200, 0, 0.02, 0.05); },
  stopReel(w) { osc(w, 'square', 880, 440, 0.12, 0.15); nz(w, 0.05, 0.3, { type: 'highpass', f0: 4000 }); },
  riichi(w) { [0, 4, 7, 12].forEach((m, i) => osc(w + i * 0.08, 'square', mf(72 + m), 0, 0.2, 0.12, { rev: 0.3 })); SFX.riser(w, 1.2, 0.3); },
  jackpot(w) {
    [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => osc(w + i * 0.07, 'square', mf(72 + m), 0, 0.25, 0.14, { rev: 0.4 }));
    [0, 4, 7].forEach(m => osc(w + 0.5, 'sawtooth', mf(60 + m), 0, 1.4, 0.08, { lp: 3000, rev: 0.5 }));
    for (let i = 0; i < 30; i++) osc(w + 0.4 + Math.random() * 1.2, 'triangle', 3000 + Math.random() * 3000, 0, 0.06, 0.05);
    SFX.boom(w, 1.2, 0.5);
  },
  balls(w, d = 1) { for (let i = 0; i < d * 25; i++) osc(w + Math.random() * d, 'triangle', 2500 + Math.random() * 2500, 0, 0.04, 0.04); },
  rewind(w, d = 1.2) { osc(w, 'sawtooth', 200, 1600, d, 0.12, { lp: 2500 }); nz(w, d, 0.2, { type: 'bandpass', f0: 3000, f1: 500, q: 2 }); SFX.glitch(w, d); },
  splash(w, v = 0.8) { nz(w, 0.9, v, { f0: 3000, f1: 300, rev: 0.3 }); osc(w, 'sine', 200, 60, 0.3, v * 0.6); },
  bubbles(w, d = 2) { for (let i = 0; i < d * 10; i++) osc(w + Math.random() * d, 'sine', 300 + Math.random() * 500, 900, 0.07, 0.07); },
  muffled(w, d = 3) { nz(w, d, 0.3, { f0: 300, f1: 150, atk: 0.5 }); },
  steam(w) { SFX.boom(w, 3, 1.2); nz(w + 0.1, 2.8, 0.7, { type: 'highpass', f0: 1500, f1: 400, rev: 0.5, atk: 0.2 }); },
  sever(w) { SFX.slash(w, 0.9); nz(w + 0.03, 0.2, 0.6, { f0: 800, f1: 150 }); },
  heal(w) { [0, 7, 12, 19].forEach((m, i) => osc(w + i * 0.05, 'sine', mf(84 + m), 0, 0.5, 0.06, { rev: 0.6 })); },
});

// ---------- soundtrack ----------
const MUSIC_MUTE = [[67.9, 68.6], [94.6, 97]];
const SEC = [ // [start, style]
  [0, 'intro'], [8.1, 'fight'], [34, 'build'], [37, 'domain'], [49, 'fever'], [57.5, 'domain'], [60.5, 'fight'], [65.5, 'build'],
  [69.5, 'intro'], [74.8, 'fever'], [79.5, 'water'], [97, 'dawn'],
];
function musicStep(s, w) {
  const t = s * 0.1, n = s % 16, bar = Math.floor(s / 16);
  if (MUSIC_MUTE.some(([a, b]) => t >= a && t < b)) return;
  let style = 'intro'; for (const [a, st] of SEC) if (t >= a) style = st;
  const kick = (v = 0.9) => { osc(w, 'sine', 150, 42, 0.22, v); nz(w, 0.02, 0.3, { type: 'highpass', f0: 3000 }); };
  const snare = (v = 0.5) => { nz(w, 0.16, v, { type: 'highpass', f0: 1200, rev: 0.25 }); osc(w, 'triangle', 220, 160, 0.08, v * 0.5); };
  const hat = (v = 0.1) => nz(w, 0.03, v, { type: 'highpass', f0: 7000 });
  const bass = (m, d = 0.09, v = 0.22) => osc(w, 'sawtooth', mf(m), mf(m), d, v, { lp: 900 });
  const lead = (m, d = 0.12, v = 0.06) => osc(w, 'square', mf(m), mf(m), d, v, { lp: 3500, rev: 0.25 });
  const pad = (ms, d, v = 0.04) => ms.forEach(m => { osc(w, 'sawtooth', mf(m), mf(m), d, v, { atk: 0.3, lp: 1200, rev: 0.5, detune: 8 }); osc(w, 'sawtooth', mf(m), mf(m), d, v, { atk: 0.3, lp: 1200, detune: -8 }); });
  if (style === 'intro') { if (n === 0 && bar % 2 === 0) pad([45, 52, 57], 3, 0.035); if (n % 8 === 4) osc(w, 'sine', mf(81 + (bar % 3) * 2), 0, 0.6, 0.04, { rev: 0.7 }); return; }
  if (style === 'fight') { // electric breakbeat in E minor
    if (n === 0 || n === 6 || n === 10) kick(); if (n === 4 || n === 12) snare(); hat(n % 4 === 2 ? 0.14 : 0.07);
    const root = [40, 40, 43, 38][bar % 4]; bass(n % 4 === 3 ? root + 12 : root);
    if (n % 8 === 7) osc(w, 'sawtooth', mf(76), mf(64), 0.1, 0.05, { lp: 4000 });
    return;
  }
  if (style === 'build') { const r = t % 2 < 1 ? 2 : 1; if (n % r === 0) snare(0.3); bass(40, 0.09, 0.15); return; }
  if (style === 'domain' || style === 'fever') { // bright pachinko-parlor jingle in C major
    const prog = [[48, 60, 64, 67], [53, 65, 69, 72], [55, 67, 71, 74], [48, 60, 64, 67]][bar % 4];
    if (n % 4 === 0) kick(style === 'fever' ? 0.9 : 0.6); if (n === 4 || n === 12) snare(0.4); hat(style === 'fever' ? 0.12 : 0.06);
    bass(n % 2 ? prog[0] + 12 : prog[0], 0.08, 0.18);
    const mel = [0, 2, 3, 1, 2, 3, 0, 3][(n >> 1) % 8];
    if (n % 2 === 0) lead(prog[1 + (mel % 3)] + 12, 0.1, style === 'fever' ? 0.07 : 0.05);
    if (style === 'fever' && n % 4 === 2) osc(w, 'triangle', mf(prog[3] + 24), 0, 0.08, 0.04);
    return;
  }
  if (style === 'water') { if (n === 0 && bar % 2 === 0) pad([40, 47, 52, 55], 3.2, 0.035); if (n === 0) osc(w, 'sine', mf(28), mf(28), 1.4, 0.3); if (n % 8 === 4) osc(w, 'sine', mf(76 + (bar % 4)), 0, 0.5, 0.03, { rev: 0.8 }); return; }
  if (style === 'dawn') { if (n === 0) pad([[48, 55, 64], [53, 57, 64], [55, 59, 62], [48, 55, 60]][bar % 4], 1.6, 0.035); if (n % 4 === 0) osc(w, 'triangle', mf([72, 76, 79, 76][(n >> 2) % 4]), 0, 0.4, 0.05, { rev: 0.6 }); }
}
