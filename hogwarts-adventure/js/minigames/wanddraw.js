// Wand-drawing challenge: trace glowing spell shapes quickly and accurately.
// Mouse, touch (swipe) and right-stick controls. Success grants a Wand Mastery boost.
import * as THREE from 'three';
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { glyph } from '../input.js';
import { clamp, sleep } from '../util.js';
import { SPELL_BY_ID } from '../spelldata.js';

const bez = (pts, n = 24) => {
  // quadratic/cubic bezier through control points (single segment)
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let p = pts.map((q) => q.slice());
    while (p.length > 1) p = p.slice(1).map((q, k) => [p[k][0] + (q[0] - p[k][0]) * t, p[k][1] + (q[1] - p[k][1]) * t]);
    out.push(p[0]);
  }
  return out;
};
const SHAPES = {
  leviosa: { name: 'Wingardium Leviosa', hint: 'Swish… and flick!', spell: 'leviosa', pts: () => [...bez([[-0.85, 0.35], [-0.2, -1.1], [0.7, 0.5]]), [0.86, -0.25]] },
  incendio: { name: 'Incendio', hint: 'Zig-zag like a flame', spell: 'incendio', pts: () => [[-0.8, -0.55], [-0.5, 0.45], [-0.15, -0.3], [0.15, 0.75], [0.5, -0.3], [0.8, 0.45]] },
  stupefy: { name: 'Stupefy', hint: 'A bolt of lightning', spell: 'stupefy', pts: () => [[0.3, 0.85], [-0.35, 0.05], [0.25, 0.05], [-0.3, -0.85]] },
  protego: { name: 'Protego', hint: 'Draw a shield', spell: 'protego', pts: () => [[-0.7, 0.6], [0.7, 0.6], [0.7, 0.0], ...bez([[0.7, 0], [0.6, -0.55], [0, -0.85]], 10).slice(1), ...bez([[0, -0.85], [-0.6, -0.55], [-0.7, 0]], 10).slice(1), [-0.7, 0.6]] },
  lumos: { name: 'Lumos', hint: 'A full circle of light', spell: 'lumos', pts: () => Array.from({ length: 33 }, (_, i) => { const a = Math.PI / 2 - (i / 32) * Math.PI * 2; return [Math.cos(a) * 0.75, Math.sin(a) * 0.75]; }) },
  petrificus: { name: 'Petrificus Totalus', hint: 'A rigid triangle', spell: 'petrificus', pts: () => [[0, 0.8], [0.75, -0.6], [-0.75, -0.6], [0, 0.8]] },
  expelliarmus: { name: 'Expelliarmus', hint: 'Spiral inward', spell: 'expelliarmus', pts: () => Array.from({ length: 40 }, (_, i) => { const t = i / 39, a = Math.PI - t * Math.PI * 3, r = 0.85 - t * 0.7; return [Math.cos(a) * r, Math.sin(a) * r]; }) },
  patronus: { name: 'Expecto Patronum', hint: 'Hold your happiest memory… trace the star', spell: 'patronum', pts: () => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 2 + (i * 4 * Math.PI) / 5; return [Math.cos(a) * 0.85, Math.sin(a) * 0.85]; }) },
};

function resample(pts, n) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
  const out = [pts[0]];
  let si = 0, acc = 0;
  for (let k = 1; k < n; k++) {
    const target = (k / (n - 1)) * total;
    while (si < segs.length - 1 && acc + segs[si] < target) { acc += segs[si]; si++; }
    const t = segs[si] ? (target - acc) / segs[si] : 0;
    const a = pts[si], b = pts[si + 1];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return { pts: out, length: total };
}
function distToPath(p, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1), 0, 1);
    best = Math.min(best, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t));
  }
  return best;
}

export async function play(opts) {
  const p = G.player;
  const list = opts.patronus ? ['patronus'] : shuffle(['leviosa', 'incendio', 'stupefy', 'protego', 'lumos', 'petrificus', 'expelliarmus']).slice(0, 5);
  // frame the player from behind, wand raised
  const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
  const camPos = p.pos.clone().addScaledVector(fwd, -2.6).add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(new THREE.Vector3(fwd.z, 0, -fwd.x), -0.8);
  G.cam.setCinematic(camPos, p.pos.clone().addScaledVector(fwd, 6).setY(p.pos.y + 1.7), 3);
  p.status.override = 'aim';
  const cv = document.getElementById('draw-layer');
  cv.classList.remove('hidden');
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  resize();
  addEventListener('resize', resize);
  const S = { retried: {}, idx: 0, shape: null, path: null, next: 0, trace: [], drawing: false, cursor: [0, 0], t: 0, limit: 7, acc: [], results: [], sparks: [], done: false, cooldown: 0, off: 0 };
  // pointer handling
  const toNorm = (cx, cy) => {
    const R = Math.min(innerWidth, innerHeight) * 0.36;
    return [(cx - innerWidth / 2) / R, -(cy - innerHeight * 0.5) / R];
  };
  const down = (e) => { S.drawing = true; S.cursor = toNorm(e.clientX, e.clientY); e.preventDefault?.(); };
  const move = (e) => { S.cursor = toNorm(e.clientX, e.clientY); if (G.input.device === 'kbm' || e.pointerType === 'mouse') G.input.setDevice('kbm'); };
  const up = () => { S.drawing = false; };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  const startShape = () => {
    const key = list[S.idx];
    const def = SHAPES[key];
    const r = resample(def.pts(), 40);
    S.shape = def; S.key = key; S.path = r.pts; S.next = 0; S.trace = []; S.t = 0; S.acc = []; S.limit = 25; S.off = 0; S.onPath = true;
    G.audio.sfx('wheel');
  };
  startShape();

  return new Promise((resolve) => {
    const finish = async (aborted) => {
      if (S.done) return;
      S.done = true;
      cv.classList.add('hidden');
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move);
      removeEventListener('pointerup', up); removeEventListener('resize', resize);
      p.status.override = null;
      mgExit();
      const ok = S.results.filter((r) => r.ok);
      const acc = ok.length ? ok.reduce((a, r) => a + r.acc, 0) / ok.length : 0;
      const time = ok.reduce((a, r) => a + r.time, 0);
      const grade = (a) => (a >= 0.88 ? 'Outstanding' : a >= 0.78 ? 'Exceeds Expectations' : a >= 0.65 ? 'Acceptable' : 'Poor');
      // accuracy is what matters: every shape traced, cleanly
      const success = opts.patronus ? ok.length === 1 && acc >= 0.65 : ok.length >= list.length - 1 && acc >= 0.65;
      const score = Math.round(ok.reduce((a, r) => a + r.acc * 100, 0));
      const buffSecs = Math.round(60 + acc * 90);
      if (success && !opts.patronus) { p.buffs.mastery = buffSecs; G.ui.updateBuffs(); }
      resolve(aborted ? { aborted: true } : {
        title: opts.patronus ? (success ? 'Expecto Patronum!' : 'Only a silver wisp…') : success ? 'Charms mastered!' : 'Keep practising',
        sub: success && !opts.patronus ? `Wand Mastery: spells deal +25% damage for ${buffSecs} seconds.` : success ? '' : 'Slow down and stay on the glowing line.',
        success, score, points: success ? 5 + Math.round(acc * 25) : 2,
        lines: [['Shapes traced', `${ok.length} / ${list.length}`], ['Accuracy', Math.round(acc * 100) + '%'], ['Grade', grade(acc)], ['Score', score]],
        restore: false, noRetry: !!opts.patronus && success,
      });
    };
    mgEnter({
      music: 'castle',
      abort: () => finish(true),
      update(dt) {
        if (S.done) return;
        const I = G.input;
        // controller: right stick positions the wand tip absolutely
        if (I.device === 'pad') {
          // either stick positions the wand tip; hold RT (or LT / A) to draw
          const st = Math.hypot(I.rstick.x, I.rstick.y) >= Math.hypot(I.lstick.x, I.lstick.y) ? I.rstick : I.lstick;
          if (Math.hypot(st.x, st.y) > 0.15) {
            const k = 1 - Math.exp(-dt * 16);
            S.cursor = [S.cursor[0] + (st.x * 1.05 - S.cursor[0]) * k, S.cursor[1] + (st.y * 1.05 - S.cursor[1]) * k];
          }
          S.drawing = I.rt > 0.35 || I.lt > 0.35 || I.isHeld('jump');
        } else if (I.device === 'kbm' && (I.move.x || I.move.y)) {
          S.cursor = [clamp(S.cursor[0] + I.move.x * dt * 1.6, -1.2, 1.2), clamp(S.cursor[1] + I.move.y * dt * 1.6, -1.2, 1.2)];
          S.drawing = I.isHeld('jump') || S.drawing;
        }
        if (I.isPressed('pause') || I.isPressed('back')) { finish(false); return; }
        if (S.cooldown > 0) { S.cooldown -= dt; if (S.cooldown <= 0) { S.idx++; if (S.idx >= list.length) { finish(false); return; } startShape(); } }
        else {
          S.t += dt;
          if (S.drawing) {
            const c = S.cursor;
            const last = S.trace[S.trace.length - 1];
            if (!last || Math.hypot(c[0] - last[0], c[1] - last[1]) > 0.012) {
              S.trace.push([c[0], c[1]]);
              const d = distToPath(c, S.path);
              S.acc.push(clamp(1 - (d - 0.05) / 0.15, 0, 1));
              S.onPath = d < 0.12;
              if (d > 0.2) S.off += dt;
              S.sparks.push({ x: c[0], y: c[1], vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, l: 0.6 });
            }
            // advance checkpoints in order
            while (S.next < S.path.length) {
              const q = S.path[S.next];
              if (Math.hypot(c[0] - q[0], c[1] - q[1]) < 0.13) { S.next++; if (S.next % 4 === 0) G.audio._tone && G.audio.sfx('uimove'); }
              else break;
            }
          }
          if (S.next >= S.path.length) {
            const acc = S.acc.length ? S.acc.reduce((a, b) => a + b, 0) / S.acc.length : 0;
            if (acc < 0.6 && !S.retried[S.idx]) {
              // too wobbly: one more go at the same shape (the better attempt counts)
              S.retried[S.idx] = acc;
              G.audio.sfx('fail');
              G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.4), `Too wobbly (${Math.round(acc * 100)}%) — try again, slowly`, 'warn');
              S.idx--; S.cooldown = 1.0; return;
            }
            const best = Math.max(acc, S.retried[S.idx] || 0);
            S.results.push({ ok: true, acc: best, time: S.t, limit: S.limit });
            G.audio.sfx(SHAPES[S.key].spell);
            G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.4), `${S.shape.name}! ${Math.round(best * 100)}% ${best >= 0.88 ? '— perfect!' : ''}`, 'combo');
            p.anim.trigger('cast');
            // the spell flies from the wand
            const s = SPELL_BY_ID[SHAPES[S.key].spell];
            const at = p.wandPos();
            G.fx.burst(at, s.color, 60, 7, { size: 0.3 });
            G.fx.shock(at, s.color, 3, 0.5, { sphere: true });
            if (opts.patronus) G.spells.castPatronus(at, new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)));
            for (let i = 0; i < 40; i++) S.sparks.push({ x: S.cursor[0], y: S.cursor[1], vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, l: 1 });
            S.cooldown = 1.1;
          } else if (S.t > S.limit) {
            S.results.push({ ok: false, acc: 0, time: S.limit, limit: S.limit });
            G.audio.sfx('fail');
            G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.4), 'Out of time', 'warn');
            S.cooldown = 1.0;
          }
        }
        if (opts.patronus && G.spells.stags.length) G.spells.updateStags(dt);
        draw(ctx, cv, S, dpr, list);
        const iconHint = I.device === 'pad' ? `Aim with a stick, hold ${glyph('cast')} to draw` : I.device === 'touch' ? 'Trace the shape with your finger' : 'Hold the mouse button and trace';
        const liveAcc = S.acc.length ? Math.round((S.acc.reduce((a, b) => a + b, 0) / S.acc.length) * 100) : 100;
        G.ui.minigameHUD(`<div class="mg-row"><span>Shape <b>${Math.min(S.idx + 1, list.length)}</b>/${list.length}</span><span>Accuracy <b>${liveAcc}%</b></span></div><small>${S.shape.name} — ${S.shape.hint}<br>Accuracy matters, not speed — take your time · ${iconHint} · ${glyph('back')} to stop</small>`);
      },
    });
  });
}

function draw(ctx, cv, S, dpr, list) {
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const R = Math.min(innerWidth, innerHeight) * 0.36 * dpr;
  const cx = W / 2, cy = H * 0.5;
  const P = (q) => [cx + q[0] * R, cy - q[1] * R];
  // parchment vignette
  const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
  g.addColorStop(0, 'rgba(10,6,20,0.25)'); g.addColorStop(1, 'rgba(10,6,20,0.65)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // guide path
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,230,170,0.22)';
  ctx.lineWidth = 26 * dpr;
  ctx.beginPath();
  S.path.forEach((q, i) => { const [x, y] = P(q); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
  ctx.setLineDash([2 * dpr, 12 * dpr]);
  ctx.strokeStyle = 'rgba(255,240,200,0.6)'; ctx.lineWidth = 3 * dpr;
  ctx.stroke();
  ctx.setLineDash([]);
  // completed part glows
  ctx.shadowColor = '#ffcf6a'; ctx.shadowBlur = 24 * dpr;
  ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 9 * dpr;
  ctx.beginPath();
  for (let i = 0; i < S.next; i++) { const [x, y] = P(S.path[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.shadowBlur = 0;
  // next checkpoint & start marker
  if (S.next < S.path.length) {
    const [x, y] = P(S.path[S.next]);
    const pulse = 1 + Math.sin(performance.now() / 150) * 0.25;
    ctx.fillStyle = 'rgba(255,220,120,0.9)';
    ctx.beginPath(); ctx.arc(x, y, 10 * dpr * pulse, 0, 7); ctx.fill();
    if (S.next + 3 < S.path.length) {
      const [x2, y2] = P(S.path[Math.min(S.path.length - 1, S.next + 3)]);
      const a = Math.atan2(y2 - y, x2 - x);
      ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 3 * dpr;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 18 * dpr, y + Math.sin(a) * 18 * dpr); ctx.lineTo(x + Math.cos(a) * 34 * dpr, y + Math.sin(a) * 34 * dpr);
      ctx.lineTo(x + Math.cos(a - 0.5) * 26 * dpr, y + Math.sin(a - 0.5) * 26 * dpr); ctx.stroke();
    }
  }
  // the player's trace
  ctx.strokeStyle = S.onPath === false ? 'rgba(255,120,110,0.95)' : 'rgba(160,220,255,0.9)'; ctx.lineWidth = 4 * dpr; ctx.shadowColor = S.onPath === false ? '#ff6050' : '#8fd0ff'; ctx.shadowBlur = 14 * dpr;
  ctx.beginPath();
  S.trace.forEach((q, i) => { const [x, y] = P(q); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
  ctx.shadowBlur = 0;
  // sparks
  for (const s of S.sparks) {
    s.l -= 0.016; s.x += s.vx * 0.016; s.y += s.vy * 0.016;
    const [x, y] = P([s.x, s.y]);
    ctx.fillStyle = `rgba(255,${200 + Math.random() * 55},150,${Math.max(0, s.l)})`;
    ctx.beginPath(); ctx.arc(x, y, 2.5 * dpr, 0, 7); ctx.fill();
  }
  S.sparks = S.sparks.filter((s) => s.l > 0);
  // wand cursor
  const [mx, my] = P(S.cursor);
  ctx.fillStyle = S.drawing ? '#fff6d0' : 'rgba(255,255,255,0.5)';
  ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 20 * dpr;
  ctx.beginPath(); ctx.arc(mx, my, (S.drawing ? 7 : 5) * dpr, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  // title
  ctx.font = `${Math.round(30 * dpr)}px 'Cinzel Decorative', serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f6dc9a';
  ctx.fillText(S.shape.name, cx, cy + R * 1.18);
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
