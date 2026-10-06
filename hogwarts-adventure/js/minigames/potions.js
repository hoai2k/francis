// Potions class: drop ingredients in the right order on the beat, stir in circles,
// and keep the heat steady. Good brews grant timed buffs.
import * as THREE from 'three';
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { glyph } from '../input.js';
import { clamp, el, rand, sleep } from '../util.js';

const INGREDIENTS = [
  { id: 'moonstone', name: 'Moonstone dust', icon: '🌙', color: 0xd8e0ff },
  { id: 'horklump', name: 'Horklump juice', icon: '🍄', color: 0xc070ff },
  { id: 'dittany', name: 'Essence of Dittany', icon: '🌿', color: 0x60ff90 },
  { id: 'fang', name: 'Snake fang', icon: '🦷', color: 0xfff0d0 },
  { id: 'feather', name: 'Phoenix-down feather', icon: '🪶', color: 0xffa040 },
  { id: 'bezoar', name: 'Crushed bezoar', icon: '🪨', color: 0x8a7a6a },
];
const RECIPES = [
  {
    id: 'wiggenweld', name: 'Wiggenweld Potion', buff: 'wiggenweld', effect: 'Take 30% less damage', color: 0x40ff90,
    steps: [{ t: 'add', i: 'moonstone' }, { t: 'heat', level: 0.55, secs: 3 }, { t: 'add', i: 'horklump' }, { t: 'stir', n: 3, dir: 1 }, { t: 'add', i: 'dittany' }, { t: 'stir', n: 2, dir: -1 }],
  },
  {
    id: 'luck', name: 'Liquid Luck', buff: 'luck', effect: 'Lucky double-damage hits', color: 0xffd040,
    steps: [{ t: 'add', i: 'feather' }, { t: 'stir', n: 2, dir: 1 }, { t: 'add', i: 'moonstone' }, { t: 'heat', level: 0.75, secs: 3 }, { t: 'add', i: 'bezoar' }, { t: 'stir', n: 3, dir: 1 }],
  },
  {
    id: 'strength', name: 'Strength Draught', buff: 'strength', effect: 'Spells deal +35% damage', color: 0xff5030,
    steps: [{ t: 'add', i: 'fang' }, { t: 'heat', level: 0.85, secs: 2.5 }, { t: 'add', i: 'horklump' }, { t: 'stir', n: 2, dir: -1 }, { t: 'add', i: 'feather' }, { t: 'add', i: 'fang' }],
  },
  {
    id: 'focus', name: 'Focus Tonic', buff: 'focus', effect: 'Faster magic regeneration, cheaper spells', color: 0x50b0ff,
    steps: [{ t: 'add', i: 'dittany' }, { t: 'add', i: 'moonstone' }, { t: 'stir', n: 3, dir: -1 }, { t: 'heat', level: 0.4, secs: 3 }, { t: 'add', i: 'bezoar' }, { t: 'stir', n: 1, dir: 1 }],
  },
];

export async function play(opts) {
  const du = G.world.zones.dungeon;
  const recipe = opts.quest ? RECIPES[0] : RECIPES[Math.floor(Math.random() * RECIPES.length)];
  await G.ui.fade(1, 0.35);
  G.world.setZone('dungeon', { pos: du.spots.cauldron, yaw: Math.PI });
  const p = G.player;
  p.teleport(du.spots.cauldron, Math.PI);
  const cpos = du.cauldron.pos;
  G.cam.setCinematic(cpos.clone().add(new THREE.Vector3(1.6, 2.4, 3.2)), cpos.clone().add(new THREE.Vector3(0, -0.3, 0)), 100);
  G.ui.fade(0, 0.5);
  const fireAnchor = du.anchors.find((a) => a.cauldronFire);
  const brew = du.cauldron.brew;
  const brewCol = new THREE.Color(0x3a6a3a);
  const targetCol = new THREE.Color(0x3a6a3a);
  // flames under the cauldron, lit with Incendio
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: (await import('../textures.js')).flameSprite(), color: new THREE.Color(3, 1.6, 0.6), blending: THREE.AdditiveBlending, depthWrite: false }));
    const a = (i / 5) * Math.PI * 2;
    f.position.copy(cpos).add(new THREE.Vector3(Math.cos(a) * 0.4, -1.55, Math.sin(a) * 0.4));
    f.scale.set(0.01, 0.01, 1);
    G.scene.add(f);
    flames.push(f);
  }
  // overlay UI
  const ui = el('div', 'potion-ui');
  ui.innerHTML = `
    <div class="pt-card"><h3>${recipe.name}</h3><ol class="pt-steps">${recipe.steps.map((s) => `<li>${stepText(s)}</li>`).join('')}</ol><small>${recipe.effect}</small></div>
    <div class="pt-beat hidden"><div class="pt-zone"></div><div class="pt-marker"></div><span>Drop on the beat!</span></div>
    <div class="pt-stir hidden"><div class="pt-ring"><div class="pt-dot"></div></div><span class="pt-stir-t"></span></div>
    <div class="pt-heat hidden"><div class="pt-gauge"><div class="pt-band"></div><div class="pt-needle"></div></div><div class="pt-heat-btns"><button class="pt-hb" data-d="1">＋</button><button class="pt-hb" data-d="-1">－</button></div><span class="pt-heat-t"></span></div>
    <div class="pt-shelf">${INGREDIENTS.map((g, i) => `<button class="pt-ing" data-i="${i}"><span class="pt-ico">${g.icon}</span><small>${g.name}</small><kbd>${i + 1}</kbd></button>`).join('')}</div>
    <div class="pt-msg"></div>`;
  document.body.appendChild(ui);
  const $ = (q) => ui.querySelector(q);
  const S = { step: 0, q: [], sel: 0, beat: 0, beatSpeed: 0.7, temp: 0.2, inBand: 0, stirAng: 0, stirLast: null, done: false, msgT: 0, heatHeld: 0, t: 0, wrong: 0 };
  const msg = (t, good) => { const m = $('.pt-msg'); m.textContent = t; m.className = 'pt-msg show ' + (good ? 'good' : 'bad'); S.msgT = 1.3; };
  const ingButtons = [...ui.querySelectorAll('.pt-ing')];
  ingButtons.forEach((b, i) => b.addEventListener('click', () => drop(i)));
  ui.querySelectorAll('.pt-hb').forEach((b) => {
    const d = +b.dataset.d;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); S.heatHeld = d; });
    b.addEventListener('pointerup', () => { S.heatHeld = 0; });
    b.addEventListener('pointerleave', () => { S.heatHeld = 0; });
  });
  // pointer stirring
  let ptr = null;
  const onMove = (e) => { ptr = [e.clientX, e.clientY]; };
  addEventListener('pointermove', onMove);
  // light the fire first: the cast of Incendio
  p.status.override = 'aim';
  p.anim.trigger('cast');
  G.audio.sfx('incendio');
  G.fx.emit({ pos: cpos.clone().setY(cpos.y - 1.5), color: 0xffc040, color2: 0xff3000, count: 60, speed: 3, size: 0.4, life: 0.8, intensity: 3, up: 2 });
  if (fireAnchor) fireAnchor.intensity = 25;

  const cur = () => recipe.steps[S.step];
  const drop = (i) => {
    const st = cur();
    if (!st || st.t !== 'add' || S.done) return;
    const g = INGREDIENTS[i];
    // ingredient tumbles in
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshStandardMaterial({ color: g.color, emissive: g.color, emissiveIntensity: 0.4 }));
    m.position.copy(cpos).add(new THREE.Vector3(rand(-0.2, 0.2), 1.2, rand(-0.2, 0.2)));
    G.scene.add(m);
    S.falling = S.falling || [];
    S.falling.push({ m, v: 0 });
    G.audio.sfx('throw');
    if (g.id !== st.i) {
      S.q.push(0.1);
      S.wrong++;
      msg(`Wrong ingredient! The recipe wants ${INGREDIENTS.find((x) => x.id === st.i).name}.`, false);
      setTimeout(() => { G.fx.smokePuff(cpos, 0x4a3a2a, 20, { size: 1.2, size1: 3 }); G.audio.sfx('explode'); G.cam.shake(0.2); }, 350);
      targetCol.lerp(new THREE.Color(0x4a3a20), 0.5);
    } else {
      // timing on the beat bar: zone is the middle 22%
      const d = Math.abs(S.beat - 0.5);
      const q = d < 0.11 ? 1 : d < 0.2 ? 0.7 : 0.4;
      S.q.push(q);
      msg(q === 1 ? 'Perfect timing!' : q > 0.5 ? 'Good.' : 'A little off the beat…', q > 0.5);
      setTimeout(() => { G.fx.burst(cpos, g.color, 30, 3, { up: 3 }); G.audio.sfx('splash'); }, 350);
      targetCol.lerp(new THREE.Color(g.color), 0.45).lerp(new THREE.Color(recipe.color), (S.step + 1) / recipe.steps.length * 0.6);
    }
    next();
  };
  const next = () => {
    S.step++;
    S.beat = 0;
    S.inBand = 0;
    S.stirAng = 0;
    S.stirLast = null;
    S.t = 0;
    ui.querySelectorAll('.pt-steps li').forEach((li, k) => { li.classList.toggle('done', k < S.step); li.classList.toggle('cur', k === S.step); });
    p.status.override = cur()?.t === 'stir' ? 'stir' : 'aim';
    if (S.step >= recipe.steps.length) finish();
  };
  ui.querySelectorAll('.pt-steps li')[0].classList.add('cur');

  return new Promise((resolve) => {
    let finishing = false;
    function finish(aborted) {
      if (finishing) return;
      finishing = true;
      const avg = S.q.length ? S.q.reduce((a, b) => a + b, 0) / recipe.steps.length : 0;
      const quality = aborted ? 0 : avg;
      const ok = quality >= 0.45;
      const done = async () => {
        S.done = true;
        removeEventListener('pointermove', onMove);
        ui.remove();
        flames.forEach((f) => G.scene.remove(f));
        if (fireAnchor) fireAnchor.intensity = 0;
        p.status.override = null;
        mgExit();
        if (aborted) { resolve({ aborted: true }); return; }
        const grade = quality > 0.85 ? 'Outstanding' : quality > 0.7 ? 'Exceeds Expectations' : quality > 0.45 ? 'Acceptable' : 'Troll';
        if (ok) { p.buffs[recipe.buff] = Math.round(60 + quality * 120); G.ui.updateBuffs(); }
        resolve({
          title: ok ? `${recipe.name} brewed!` : 'The potion is ruined',
          sub: ok ? `${recipe.effect} for ${p.buffs[recipe.buff]}s.` : 'It smells of old socks.',
          success: ok, score: Math.round(quality * 1000), points: ok ? Math.round(8 + quality * 22) : 0,
          lines: [['Grade', grade], ['Quality', Math.round(quality * 100) + '%'], ['Wrong ingredients', S.wrong]],
        });
      };
      if (aborted) { done(); return; }
      // the brew bubbles up in its final colour
      G.audio.sfx(ok ? 'unlock' : 'fail');
      G.fx.emit({ pos: cpos.clone().setY(cpos.y - 0.2), color: ok ? recipe.color : 0x5a4a30, count: 120, speed: 4, size: 0.3, life: 1.4, intensity: ok ? 3 : 1, up: 4, gravity: 2, noScale: true });
      if (!ok) G.fx.smokePuff(cpos, 0x3a3020, 30, { size: 1.6, size1: 4, speed: 2 });
      setTimeout(done, 1600);
    }
    mgEnter({
      music: 'potions',
      abort: () => finish(true),
      update(dt) {
        if (S.done || finishing) return;
        const I = G.input;
        const st = cur();
        // shared visuals
        brewCol.lerp(targetCol, 1 - Math.exp(-dt * 2));
        brew.material.color.copy(brewCol).multiplyScalar(0.6);
        brew.material.emissive.copy(brewCol).multiplyScalar(0.6);
        if (Math.random() < 0.35) { G.fx.emit({ pos: cpos.clone().add(new THREE.Vector3(rand(-0.6, 0.6), -0.25, rand(-0.6, 0.6))), color: brewCol.getHex(), count: 1, speed: 0.3, size: 0.12, life: 0.6, intensity: 2, up: 1, noScale: true }); if (Math.random() < 0.15) G.audio.sfx('bubble'); }
        if (Math.random() < 0.08) G.fx.smokePuff(cpos.clone().setY(cpos.y + 0.2), 0xd8d8d0, 1, { size: 0.6, size1: 1.8, alpha: 0.15, life: 2 });
        flames.forEach((f, i) => { const k = 0.35 + S.temp * 0.6 + Math.sin(G.time * 14 + i) * 0.05; f.scale.set(k * 0.6, k, 1); });
        if (fireAnchor) fireAnchor.intensity = 10 + S.temp * 30;
        S.msgT -= dt;
        if (S.msgT <= 0) $('.pt-msg').classList.remove('show');
        S.t += dt;
        // passive cooling / heating drift
        const heatIn = (I.isHeld('up') || I.isHeld('upMenu') || I.keys.has('KeyW') ? 1 : 0) - (I.isHeld('down') || I.isHeld('downMenu') || I.keys.has('KeyS') ? 1 : 0) + (I.rt - I.lt) + S.heatHeld;
        S.temp = clamp(S.temp + (clamp(heatIn, -1, 1) * 0.45 - 0.06 + Math.sin(G.time * 1.7) * 0.05) * dt, 0, 1);
        $('.pt-beat').classList.toggle('hidden', st?.t !== 'add');
        $('.pt-stir').classList.toggle('hidden', st?.t !== 'stir');
        $('.pt-heat').classList.toggle('hidden', st?.t !== 'heat');
        if (!st) return;
        if (st.t === 'add') {
          S.beat = (S.beat + dt * S.beatSpeed * (1 + S.step * 0.08)) % 1;
          $('.pt-marker').style.left = S.beat * 100 + '%';
          // choose with number keys / d-pad
          for (let i = 0; i < 6; i++) if (I.isPressed('spell' + (i + 1))) { S.sel = i; drop(i); return; }
          if (I.isPressed('left') || I.isPressed('leftMenu')) S.sel = (S.sel + 5) % 6;
          if (I.isPressed('right') || I.isPressed('rightMenu')) S.sel = (S.sel + 1) % 6;
          if (I.isPressed('confirm') || I.isPressed('cast') || I.isPressed('interact')) { drop(S.sel); return; }
          ingButtons.forEach((b, i) => b.classList.toggle('sel', i === S.sel && I.device !== 'touch'));
        } else if (st.t === 'stir') {
          // angle around the cauldron: right stick, or the pointer around screen centre
          let a = null;
          if (I.device === 'pad' && Math.hypot(I.rstick.x, I.rstick.y) > 0.5) a = Math.atan2(I.rstick.y, I.rstick.x);
          else if (I.device === 'pad' && Math.hypot(I.lstick.x, I.lstick.y) > 0.5) a = Math.atan2(I.lstick.y, I.lstick.x);
          else if (ptr) { const dx = ptr[0] - innerWidth / 2, dy = innerHeight / 2 - ptr[1]; if (Math.hypot(dx, dy) > 30) a = Math.atan2(dy, dx); }
          if (a != null) {
            if (S.stirLast != null) {
              let d = a - S.stirLast;
              if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
              S.stirAng += -d; // clockwise positive
            }
            S.stirLast = a;
          }
          const turns = (S.stirAng / (Math.PI * 2)) * st.dir;
          $('.pt-dot').style.transform = `rotate(${-(S.stirLast ?? 0)}rad) translateX(52px)`;
          $('.pt-stir-t').innerHTML = `Stir <b>${st.dir > 0 ? 'clockwise ↻' : 'anticlockwise ↺'}</b> · ${Math.max(0, turns).toFixed(1)} / ${st.n}<br><small>${I.device === 'pad' ? 'Rotate the right stick' : I.device === 'touch' ? 'Circle your finger' : 'Circle the mouse around the cauldron'}</small>`;
          if (turns < -0.6) { S.q.push(0.3); msg('Wrong way! The brew curdles.', false); targetCol.lerp(new THREE.Color(0x6a6a40), 0.4); next(); return; }
          if (turns >= st.n) {
            const q = clamp(1.25 - S.t / (st.n * 3.5), 0.5, 1);
            S.q.push(q); msg(q > 0.8 ? 'Beautifully stirred!' : 'Stirred.', true);
            G.fx.emit({ pos: cpos, color: recipe.color, count: 30, speed: 2, size: 0.2, life: 0.8, intensity: 3, up: 2 });
            G.audio.sfx('ring');
            targetCol.lerp(new THREE.Color(recipe.color), 0.25);
            next();
            return;
          }
          if (S.t > 14) { S.q.push(0.3); msg('Too slow — it’s gone lumpy.', false); next(); }
        } else if (st.t === 'heat') {
          const band = 0.12;
          const inBand = Math.abs(S.temp - st.level) < band;
          if (inBand) S.inBand += dt;
          $('.pt-band').style.bottom = (st.level - band) * 100 + '%';
          $('.pt-band').style.height = band * 200 + '%';
          $('.pt-needle').style.bottom = S.temp * 100 + '%';
          $('.pt-needle').classList.toggle('ok', inBand);
          $('.pt-heat-t').innerHTML = `Keep the heat in the band · ${S.inBand.toFixed(1)} / ${st.secs}s<br><small>${I.device === 'pad' ? 'RT hotter · LT cooler' : I.device === 'touch' ? 'Hold ＋ / －' : 'W hotter · S cooler'}</small>`;
          if (S.inBand >= st.secs) {
            const q = clamp(1.2 - S.t / (st.secs * 4), 0.5, 1);
            S.q.push(q); msg('Perfect simmer.', true); G.audio.sfx('ring'); next(); return;
          }
          if (S.temp > 0.97) { S.q.push(0.2); msg('It boiled over!', false); G.fx.smokePuff(cpos, 0x8a8a80, 16, { size: 1, size1: 3 }); G.audio.sfx('explode'); S.temp = 0.6; next(); return; }
          if (S.t > 15) { S.q.push(0.3); msg('Too long on the flame.', false); next(); }
        }
        G.ui.minigameHUD(`<div class="mg-row"><span>Step <b>${Math.min(S.step + 1, recipe.steps.length)}</b>/${recipe.steps.length}</span><span>${recipe.name}</span></div><small>${stepText(st)} · ${glyph('pause')} menu</small>`);
      },
    });
  });
}

function stepText(s) {
  if (!s) return '';
  if (s.t === 'add') return `Add <b>${INGREDIENTS.find((g) => g.id === s.i).name}</b>`;
  if (s.t === 'stir') return `Stir ${s.n}× ${s.dir > 0 ? 'clockwise' : 'anticlockwise'}`;
  return `Hold the heat at ${s.level < 0.5 ? 'low' : s.level < 0.7 ? 'medium' : 'high'}`;
}
