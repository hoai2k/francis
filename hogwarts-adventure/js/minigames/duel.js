// Duelling Club: a five-round tournament on the Great Hall stage.
import * as THREE from 'three';
import { G, HOUSES } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { glyph } from '../input.js';
import { sleep } from '../util.js';
import { postFlash } from '../engine.js';

const OPPONENTS = [
  { name: 'Edric Ashworth', house: 'hufflepuff', level: 1, hp: 70, spells: ['stupefyE'], rate: 2.8, block: 0.05, dodge: 0.05, line: 'Go easy on me — it’s my first time too!' },
  { name: 'Posy Vale', house: 'slytherin', level: 2, hp: 90, spells: ['stupefyE', 'expelliarmusE'], rate: 2.2, block: 0.15, dodge: 0.1, line: 'This will be over quickly.' },
  { name: 'Ollie Brandt', house: 'ravenclaw', level: 3, hp: 110, spells: ['stupefyE', 'incendioE', 'expelliarmusE'], rate: 1.8, block: 0.3, dodge: 0.15, line: 'I’ve calculated a 73% chance of winning.' },
  { name: 'Rhea Castellan', house: 'gryffindor', level: 4, hp: 130, spells: ['stupefyE', 'incendioE', 'expelliarmusE'], rate: 1.5, block: 0.3, dodge: 0.3, volley: 2, line: 'Wands up. No holding back!' },
  { name: 'Lucan Mortlake', house: 'slytherin', level: 5, hp: 170, spells: ['stupefyE', 'incendioE', 'curse', 'expelliarmusE'], rate: 1.2, block: 0.4, dodge: 0.3, volley: 2, line: 'The champion does not lose. Least of all to a first-year.', hat: true, robe: '#101418' },
];

export async function play(opts = {}) {
  // the duelling ladder gets tougher every school year
  const yr = Math.min(7, G.save?.year || 1);
  const ladder = (o) => ({ ...o, level: o.level + (yr - 1), hp: Math.round(o.hp * (1 + (yr - 1) * 0.35)), rate: o.rate * (1 - Math.min(0.35, (yr - 1) * 0.05)), spells: [...o.spells, ...(yr >= 3 && !o.spells.includes('incendioE') ? ['incendioE'] : []), ...(yr >= 5 && !o.spells.includes('curse') ? ['curse'] : [])] });
  const OPP = opts.opponents || OPPONENTS.map(ladder);
  const N = OPP.length;
  const gh = G.world.zones.greatHall;
  await G.ui.fade(1, 0.35);
  G.world.setZone('greatHall', { pos: gh.spots.duelA, yaw: Math.PI });
  gh.setDuelMode(true);
  // students gather round the stage
  const students = G.story.students;
  const saved = students.map((s) => ({ p: s.root.position.clone(), r: s.root.rotation.y }));
  students.forEach((s, i) => {
    const side = i % 2 ? 1 : -1;
    s.root.position.copy(gh.W(side * 5.6, 0, -8 + Math.floor(i / 2) * 7));
    s.root.rotation.y = -side * Math.PI / 2;
    s.anim.set('idle');
  });
  const duskwood = G.story.npcs.duskwood;
  const oldDusk = { p: duskwood.pos.clone(), r: duskwood.root.rotation.y };
  duskwood.root.position.copy(gh.W(5.2, 0, 4)); duskwood.root.rotation.y = -Math.PI / 2;
  const bounds = { x0: gh.offset.x - 3.2, x1: gh.offset.x + 3.2, z0: -10, z1: 18.5 };
  G.player.teleport(gh.spots.duelA, Math.PI);
  G.cam.snap();
  G.ui.fade(0, 0.5);
  const p = G.player;
  const S = { round: 0, wins: 0, state: 'intro', opp: null, t: 0, done: false, lost: false };

  return new Promise((resolve) => {
    const cleanup = () => {
      gh.setDuelMode(false);
      students.forEach((s, i) => { s.root.position.copy(saved[i].p); s.root.rotation.y = saved[i].r; s.anim.set('sit'); });
      duskwood.root.position.copy(oldDusk.p); duskwood.root.rotation.y = oldDusk.r;
      G.enemies.clearZone();
      G.cam.lockTarget = null;
      mgExit();
    };
    const finish = (aborted) => {
      if (S.done) return;
      S.done = true;
      cleanup();
      const pts = opts.opponents ? (S.wins === N ? 40 : 0) : [0, 10, 25, 45, 70, 100][S.wins];
      resolve(aborted ? { aborted: true } : {
        title: opts.opponents ? (S.wins === N ? opts.winTitle || 'Victory!' : 'Defeated') : S.wins === 5 ? `Duelling Champion — Year ${yr}!` : S.wins ? `${S.wins} duel${S.wins > 1 ? 's' : ''} won` : 'Defeated',
        sub: opts.opponents ? '' : S.wins === 5 ? 'Nobody has beaten Lucan Mortlake in three years.' : '',
        success: opts.opponents ? S.wins === N : S.wins > 0, wins: S.wins, score: S.wins * 100 + Math.round(p.hp), points: pts,
        lines: [['Rounds won', `${S.wins} / ${N}`], ['Last opponent', OPP[Math.min(S.round, N - 1)].name]],
      });
    };
    const startRound = async () => {
      const o = OPP[S.round];
      S.state = 'intro';
      p.hp = p.maxHp; p.mana = p.maxMana;
      p.teleport(gh.spots.duelA, Math.PI);
      p.control = false;
      G.enemies.clearZone();
      G.spells.clear();
      G.enemies.hpScale = 1;
      const e = G.enemies.spawn('duelist', gh.spots.duelB, {
        name: o.name, house: o.house, level: o.level, hp: o.hp, spells: o.spells, rate: o.rate, block: o.block, dodge: o.dodge, volley: o.volley,
        range: 11, bounds, aggro: false, hold: true, yaw: 0, hat: o.hat, robe: o.robe, look: o.look,
      });
      e.yaw = 0;
      S.opp = e;
      G.ui.boss(e);
      G.cam.setCinematic(gh.W(3.5, 3.2, 4), gh.W(0, 1.8, 4), 2);
      G.ui.banner(`Round ${S.round + 1}`, `${o.name} of ${HOUSES[o.house].name}`, '');
      G.audio.sfx('gong');
      await sleep(1400);
      if (S.done) return;
      await G.ui.say([{ who: o.name, color: HOUSES[o.house].c2 === '#2b2622' ? '#f0d060' : HOUSES[o.house].c2, text: o.line, voice: 'mid' }]);
      if (S.done) return;
      G.mode = 'play';
      p.status.override = 'bow'; e.anim.set('bow');
      await sleep(900);
      p.status.override = null;
      for (const n of ['3', '2', '1']) { G.ui.banner(n, '', ''); G.audio.sfx('uimove'); await sleep(650); if (S.done) return; }
      G.ui.banner('Duel!', '', 'unlock');
      G.audio.sfx('ui');
      G.cam.setCinematic(null);
      G.cam.snap();
      G.cam.lockTarget = e;
      e.aggro = true;
      e.o.hold = false;
      p.control = true;
      S.state = 'fight';
      G.ui.showHUD(true);
    };
    mgEnter({
      music: 'combat',
      combat: true,
      abort: () => finish(true),
      onPlayerDown: async () => {
        if (S.state !== 'fight') return;
        S.state = 'over';
        p.control = false;
        p.anim.set('down');
        p.status.override = 'down';
        G.slowmo = 1;
        G.audio.sfx('faint');
        G.ui.banner('Defeated!', `${OPP[S.round].name} wins the round.`, '');
        await sleep(2200);
        p.status.override = null;
        p.hp = p.maxHp;
        finish(false);
      },
      update(dt) {
        if (S.done) return;
        // keep the player on the stage
        if (S.state === 'fight') {
          p.pos.x = THREE.MathUtils.clamp(p.pos.x, bounds.x0 + 0.3, bounds.x1 - 0.3);
          p.pos.z = THREE.MathUtils.clamp(p.pos.z, bounds.z0, bounds.z1);
          const e = S.opp;
          if (e && !e.alive) {
            S.state = 'won';
            S.wins++;
            G.slowmo = 1.4;
            postFlash(0.15);
            G.audio.sfx('slowmo');
            G.cam.lockTarget = null;
            for (const s of students) s.anim.trigger('cheer', 2);
            G.ui.banner('Victory!', `${OPP[S.round].name} is out!`, 'unlock');
            setTimeout(() => {
              if (S.done) return;
              S.round++;
              if (S.round >= N) finish(false);
              else startRound();
            }, 2600);
          }
        }
        for (const s of students) s.anim.update(dt, 0);
        G.ui.minigameHUD(`<div class="mg-row"><span>Round <b>${Math.min(S.round + 1, N)}</b>/${N}</span><span>Wins <b>${S.wins}</b></span></div><small>Disarm with Expelliarmus, then Stupefy for a Knockout · ${glyph('block')} Protego · ${glyph('dodge')} dodge · ${glyph('pause')} menu</small>`);
      },
    });
    startRound();
  });
}
