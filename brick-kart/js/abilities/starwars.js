// Star Wars abilities (see ../abilities.js for the contract).
export default [
  {
    id: 'forcepush', name: 'Force Push', color: '#7fb8ff', help: 'A Force wave that spins out everyone just ahead of you.',
    icon: '<svg viewBox="0 0 64 64"><path d="M10 32h20M14 22l18 10-18 10" stroke="#1b2a34" stroke-width="4" fill="none"/><path d="M38 14q14 18 0 36M46 8q20 24 0 48" stroke="#7fb8ff" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
    odds: [0, 3, 4, 4, 2],
    ai: (k, ctx) => ctx.ahead(k, 2).some((o) => o.pos.distanceTo(k.pos) < 28),
    use(k, ctx) {
      const f = k.forward();
      for (const o of ctx.near(k.pos, 30, k)) {
        const d = o.pos.clone().sub(k.pos);
        if (d.dot(f) > 0 && d.length() * 0.6 < d.dot(f) + 4) ctx.hit(o, 'spin', k, 'forcepush');
      }
      ctx.ring(k.pos.clone().addScaledVector(f, 6), 18, 0x7fb8ff);
      ctx.audio.sfx('storm', k.pos);
    },
  },
];
