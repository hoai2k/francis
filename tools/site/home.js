// Root gallery page effects: animated pixel background, poster reels, card tilt.
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const accents = [...document.querySelectorAll('[data-accent]')].map(e => e.dataset.accent);
  const COLS = accents.length ? accents.concat(['#ffffff', '#4fc8ff']) : ['#ff3a5a', '#4fc8ff', '#ffd24a', '#ffffff'];

  // ---------- background: rising cursed-energy pixels over a neon grid ----------
  const cv = document.getElementById('bg'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, mx = 0, my = 0, scrollY = 0;
  const bits = [];
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bits.length = 0;
    const n = Math.round((W * H) / 9000);
    for (let i = 0; i < n; i++) bits.push({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 3.5, v: 8 + Math.random() * 40, z: 0.3 + Math.random(), c: COLS[i % COLS.length], p: Math.random() * 6 });
  }
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', e => { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; }, { passive: true });
  addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  let last = performance.now(), slashT = 2;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.fillStyle = '#07060d'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.5 + mx * 80, H * 0.25, 0, W * 0.5, H * 0.25, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(90,30,120,0.35)'); g.addColorStop(1, 'rgba(7,6,13,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // perspective grid floor
    const hy = H * 0.62 - scrollY * 0.15, t = now / 1000;
    ctx.strokeStyle = 'rgba(255,58,90,0.22)'; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const k = ((i + (t * 0.6) % 1) / 18), y = hy + Math.pow(k, 2.2) * (H - hy + 40);
      ctx.globalAlpha = k; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = -16; i <= 16; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 14 + mx * 40, hy); ctx.lineTo(W / 2 + i * (W / 10) + mx * 120, H + 40); ctx.stroke(); }
    const hz = ctx.createLinearGradient(0, hy - 40, 0, hy + 4);
    hz.addColorStop(0, 'rgba(255,58,90,0)'); hz.addColorStop(1, 'rgba(255,58,90,0.35)');
    ctx.fillStyle = hz; ctx.fillRect(0, hy - 40, W, 44);
    // pixels
    for (const b of bits) {
      if (!reduce) { b.y -= b.v * b.z * dt; b.p += dt * 2; if (b.y < -10) { b.y = H + 10; b.x = Math.random() * W; } }
      const x = b.x + Math.sin(b.p) * 6 + mx * 30 * b.z, y = b.y + my * 20 * b.z;
      ctx.globalAlpha = 0.25 + 0.55 * b.z * (0.6 + 0.4 * Math.sin(b.p * 1.7));
      ctx.fillStyle = b.c; ctx.fillRect(x | 0, y | 0, b.s * b.z + 0.5, b.s * b.z + 0.5);
    }
    ctx.globalAlpha = 1;
    // an occasional sword slash across the sky
    slashT -= dt;
    if (slashT < 0) {
      const k = -slashT / 0.35;
      if (k < 1) {
        ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2 * (1 - k); ctx.beginPath();
        ctx.moveTo(W * (0.1 + k * 0.1), H * 0.15); ctx.quadraticCurveTo(W * 0.5, H * 0.05 + k * 20, W * (0.9 - k * 0.05), H * 0.3); ctx.stroke();
      } else slashT = 4 + Math.random() * 5;
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- poster reels ----------
  function reel(root, bars, interval) {
    const imgs = [...root.querySelectorAll('img')], dots = bars ? [...bars.children] : [];
    if (imgs.length < 2) return { start() {}, stop() {} };
    let i = 0, timer = null;
    const show = n => {
      imgs[i].classList.remove('on'); if (dots[i]) dots[i].classList.remove('on');
      i = n % imgs.length; imgs[i].classList.add('on'); if (dots[i]) dots[i].classList.add('on');
      root.classList.remove('glitch-in'); void root.offsetWidth; root.classList.add('glitch-in');
    };
    return {
      start() { if (!timer && !reduce) timer = setInterval(() => show(i + 1), interval); },
      stop(reset) { clearInterval(timer); timer = null; if (reset) show(0); },
    };
  }
  const feat = document.querySelector('.featured .reel');
  if (feat) reel(feat, null, 3200).start();

  const touch = matchMedia('(hover: none)').matches;
  const io = touch && 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? e.target._reel.start() : e.target._reel.stop())), { threshold: 0.7 }) : null;
  document.querySelectorAll('.card').forEach(card => {
    const r = reel(card.querySelector('.thumb'), card.querySelector('.bars'), 850);
    card._reel = r;
    if (io) { io.observe(card); return; }
    card.addEventListener('pointerenter', () => r.start());
    card.addEventListener('pointerleave', () => { r.stop(true); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    card.addEventListener('focus', () => r.start());
    card.addEventListener('blur', () => r.stop(true));
    if (!reduce) card.addEventListener('pointermove', e => {
      const b = card.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      card.style.setProperty('--ry', `${x * 10}deg`); card.style.setProperty('--rx', `${-y * 10}deg`);
    });
  });
})();
