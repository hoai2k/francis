// Playback: timeline, audio scheduling, controls.
'use strict';
let acc = 0;
SHOTS.forEach(s => { s.t0 = acc; acc += s.d; });
const EVENTS = [];
SHOTS.forEach(s => s.sfx.forEach(([lt, name, ...args]) => EVENTS.push([s.t0 + lt, name, args])));
EVENTS.sort((a, b) => a[0] - b[0]);
function shotAt(T) { let i = SHOTS.length - 1; while (i > 0 && SHOTS[i].t0 > T) i--; return SHOTS[i]; }

function render(T) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  setCam(0, -30, 1, 0);
  const s = shotAt(T), lt = T - s.t0;
  ctx.save(); s.draw(lt, T); ctx.restore();
  screen(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  chat(s.chat, lt);
  grain(T, 0.05);
}

const scrub = document.getElementById('scrub'), playBtn = document.getElementById('play');
const muteBtn = document.getElementById('mute'), timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay'), bigPlay = document.getElementById('bigPlay');
const stage = document.getElementById('stage');
scrub.max = DUR;
const startAt = parseFloat(new URLSearchParams(location.search).get('t'));
let T = Number.isFinite(startAt) ? clamp(startAt, 0, DUR) : 0, playing = false, last = 0, dragging = false, sched = T;
const LOOKAHEAD = 0.15;

function schedule() {
  const ahead = T + LOOKAHEAD;
  if (AU.ctx && !AU.muted) {
    const now = AU.ctx.currentTime;
    for (const [et, name, args] of EVENTS) {
      if (et < sched) continue; if (et >= ahead) break;
      try { SFX[name](now + Math.max(0, et - T), ...args); } catch (e) { /* ignore a bad node */ }
    }
    for (let s = Math.ceil(sched * 10 - 1e-6); s / 10 < ahead; s++) {
      try { musicStep(s, now + Math.max(0, s / 10 - T)); } catch (e) { /* ignore */ }
    }
  }
  sched = ahead;
}
function setPlaying(p) {
  playing = p;
  if (p) { auInit(); if (T >= DUR) seek(0); overlay.classList.add('hidden'); last = performance.now(); sched = T; }
  playBtn.textContent = p ? '❚❚' : '▶';
}
function seek(v) { T = clamp(v, 0, DUR); sched = T; }
const fmt = v => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
function frame(now) {
  if (playing) {
    T = Math.min(DUR, T + Math.min(0.1, (now - last) / 1000)); last = now;
    schedule();
    if (T >= DUR) {
      setPlaying(false);
      bigPlay.textContent = '↻ REPLAY';
      document.getElementById('hint').textContent = 'thanks for watching!';
      overlay.classList.remove('hidden');
    }
  }
  render(T);
  if (!dragging) scrub.value = T;
  timeEl.textContent = fmt(T);
  requestAnimationFrame(frame);
}

bigPlay.addEventListener('click', () => setPlaying(true));
playBtn.addEventListener('click', () => setPlaying(!playing));
cv.addEventListener('click', () => setPlaying(!playing));
scrub.addEventListener('input', () => { dragging = true; seek(parseFloat(scrub.value)); overlay.classList.add('hidden'); });
scrub.addEventListener('change', () => { dragging = false; });
function setMuted(m) { auMute(m); muteBtn.textContent = m ? '🔇' : '🔊'; }
muteBtn.addEventListener('click', () => setMuted(!AU.muted));
function toggleFs() {
  const el = document.fullscreenElement || document.webkitFullscreenElement;
  if (el) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else if (stage.requestFullscreen) stage.requestFullscreen();
  else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
}
document.getElementById('fs').addEventListener('click', toggleFs);
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.code !== 'Space') return;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  else if (e.code === 'ArrowRight') seek(T + 2);
  else if (e.code === 'ArrowLeft') seek(T - 2);
  else if (e.code === 'KeyR') { seek(0); setPlaying(true); }
  else if (e.code === 'KeyM') setMuted(!AU.muted);
  else if (e.code === 'KeyF') toggleFs();
});
if (T > 0) overlay.classList.add('hidden');
window.__gvs = { render, shots: SHOTS, seek: v => { seek(v); render(v); } };
const fontsReady = document.fonts ? Promise.all([document.fonts.load(`10px ${FONT}`), document.fonts.load(`900 10px "Noto Sans JP"`, '五')]).catch(() => {}) : Promise.resolve();
fontsReady.then(() => requestAnimationFrame(frame));
