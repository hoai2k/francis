// The optional Quidditch career: house-team tryouts (Year 2, or Year 1 for strong fliers),
// a position, three fixtures a year against the other houses, a league table, the
// Quidditch Cup, and better brooms from Spintwitch's or as rewards.
import { G, HOUSES, HOUSE_KEYS } from './state.js';
import { runMinigame } from './minigames/index.js';
import { addCoins, coins } from './items.js';
import { addXP } from './progress.js';
import { writeSave } from './save.js';
import { pick, rand, el } from './util.js';

export const BROOMS = {
  larkspur: { name: 'Larkspur 2', price: 0, speed: 17, boost: 31, turn: 1.5, desc: 'The school broom. Reliable, if a little slow.' },
  swiftwind: { name: 'Swiftwind 5', price: 60, speed: 18.5, boost: 34, turn: 1.6, desc: 'Nippy and forgiving. A favourite of Chasers.' },
  thunderhawk: { name: 'Thunderhawk', price: 140, speed: 20, boost: 37, turn: 1.7, desc: 'Fast, sharp turns, a real racing broom.' },
  starfall: { name: 'Starfall X', price: 300, speed: 21.5, boost: 40, turn: 1.85, desc: 'The fastest broom money can buy. Or the Cup can win.' },
};
export const POSITIONS = ['seeker', 'chaser', 'keeper', 'beater'];

export function qc() {
  const s = G.save;
  s.qc ||= { team: false, position: null, broom: 'larkspur', owned: ['larkspur'], seasons: {}, cups: [] };
  return s.qc;
}
export function broomStats() { const b = BROOMS[qc().broom] || BROOMS.larkspur; return b; }

// ------------------------------------------------------------------ season
function season() {
  const c = qc();
  const y = G.save.year;
  if (!c.seasons[y]) {
    const mine = G.save.house;
    const opps = HOUSE_KEYS.filter((h) => h !== mine);
    const table = Object.fromEntries(HOUSE_KEYS.map((h) => [h, { p: 0, w: 0, l: 0, pts: 0, gf: 0, ga: 0 }]));
    c.seasons[y] = { fixtures: opps.map((o, i) => ({ opp: o, played: false, at: 0.22 + i * 0.25 })), table, done: false };
  }
  return c.seasons[y];
}
export function nextFixture() {
  const s = season();
  return s.fixtures.find((f) => !f.played) || null;
}
export function fixtureReady() {
  const f = nextFixture();
  if (!f) return false;
  return (G.story.yearFraction?.() ?? 0) >= f.at;
}
function record(table, a, b, ga, gb) {
  const A = table[a], B = table[b];
  A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
  if (ga > gb) { A.w++; B.l++; A.pts += 2; } else if (gb > ga) { B.w++; A.l++; B.pts += 2; } else { A.pts++; B.pts++; }
}
// the other houses play their own matches as the season goes on
function simulateRound(s) {
  const mine = G.save.house;
  const others = HOUSE_KEYS.filter((h) => h !== mine);
  const [a, b] = [pick(others), null];
  const opp = pick(others.filter((h) => h !== a));
  const ga = Math.round(rand(3, 22)) * 10, gb = Math.round(rand(3, 22)) * 10 + (Math.random() < 0.5 ? 150 : 0);
  record(s.table, a, opp, Math.random() < 0.5 ? ga + 150 : ga, gb);
}
export function standings() {
  const s = season();
  return HOUSE_KEYS.map((h) => ({ h, ...s.table[h] })).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga));
}

export async function playFixture() {
  const f = nextFixture();
  if (!f) return;
  const c = qc();
  const y = G.save.year;
  const skill = 0.3 + y * 0.07 + (f.opp === 'slytherin' ? 0.08 : 0);
  const r = await runMinigame('match', { opponent: f.opp, position: c.position, skill, fixture: true });
  if (!r || r.aborted) return;
  const s = season();
  f.played = true;
  f.us = r.us; f.them = r.them;
  record(s.table, G.save.house, f.opp, r.us, r.them);
  simulateRound(s);
  addXP(r.won ? 220 : 90, 'Quidditch match');
  addCoins(r.won ? 25 : 8);
  if (s.fixtures.every((x) => x.played) && !s.done) {
    s.done = true;
    const top = standings()[0].h;
    if (top === G.save.house) {
      c.cups.push(y);
      G.ui.banner('The Quidditch Cup!', `${HOUSES[top].name} win the Quidditch Cup!`, 'unlock');
      G.story.addPoints(G.save.house, 100, 'Won the Quidditch Cup');
      if (!c.owned.includes('starfall') && c.cups.length >= 2) { c.owned.push('starfall'); G.ui.toast('Madam Hale presents the team with a Starfall X!', 'quest', 5000); }
      else if (!c.owned.includes('thunderhawk')) { c.owned.push('thunderhawk'); G.ui.toast('The house gives you a Thunderhawk broom!', 'quest', 5000); }
    } else G.ui.toast(`${HOUSES[top].name} take the Quidditch Cup this year.`, 'info', 4000);
  }
  writeSave();
}

// ------------------------------------------------------------------ tryouts
export async function tryout() {
  const c = qc();
  const r = await runMinigame('tryout', {});
  if (!r || r.aborted) return false;
  if (!r.success) return false;
  c.team = true;
  c.tryoutYear = G.save.year;
  addXP(200, 'Made the house team');
  return true;
}

// Madam Hale's conversation: tryouts, position, next match
export async function haleTalk() {
  const st = G.story;
  const c = qc();
  const y = G.save.year;
  const sp = st.speaker('hale');
  const goodFlier = (G.save.best?.quidditch || 0) >= 220;
  if (!c.team) {
    if (y < 2 && !goodFlier) return false; // the regular flying-lesson conversation
    const ch = await st.talk('hale', [{ ...sp, text: y < 2 ? 'You fly like you were born on a broom. First-years never make the team — but I’ll make an exception. Fancy trying out?' : `House team tryouts for ${HOUSES[G.save.house].name}! Three drills: rings, catching and Bludgers. Want a go?`, choices: ['Try out for the team', 'Practise flying', 'Not now'] }]);
    if (ch === 1) { await runMinigame('quidditch', {}); return true; }
    if (ch !== 0) return true;
    if (await tryout()) {
      const pc = await st.talk('hale', [{ ...sp, text: 'Welcome to the team! Which position do you want?', choices: ['Seeker — catch the Snitch', 'Chaser — score goals', 'Keeper — guard the hoops', 'Beater — hit Bludgers'] }]);
      c.position = POSITIONS[pc ?? 0];
      await st.talk('hale', [`${c.position[0].toUpperCase() + c.position.slice(1)} it is. Your first match is later this term — I’ll send an owl.`]);
      writeSave();
    } else await st.talk('hale', ['Not quite there yet. Come back and try again whenever you like.']);
    return true;
  }
  const f = nextFixture();
  const ready = fixtureReady();
  const choices = [ready ? `Play the next match (v ${HOUSES[f.opp].name})` : f ? 'Next match: not yet' : 'Season finished', 'Change position', 'Practise flying', 'Season table', 'Not now'];
  const ch = await st.talk('hale', [{ ...sp, text: f ? (ready ? `Big match today against ${HOUSES[f.opp].name}. Ready?` : 'Train hard — your next match is later in the term.') : 'Season’s over. Rest those arms!', choices }]);
  if (ch === 0 && ready) await playFixture();
  else if (ch === 1) { const pc = await st.talk('hale', [{ ...sp, text: 'Which position?', choices: ['Seeker', 'Chaser', 'Keeper', 'Beater'] }]); if (pc != null && pc < 4) { c.position = POSITIONS[pc]; writeSave(); } }
  else if (ch === 2) await runMinigame('quidditch', {});
  else if (ch === 3) openQuidditch();
  return true;
}

// ------------------------------------------------------------------ career screen + broom shop
export function openQuidditch() {
  const c = qc();
  G.ui.open((w) => {
    const s = season();
    const rows = standings().map((r, i) => `<tr class="${r.h === G.save.house ? 'mine' : ''}"><td>${i + 1}</td><td>${HOUSES[r.h].name}</td><td>${r.p}</td><td>${r.w}</td><td>${r.l}</td><td>${r.gf}–${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('');
    const fx = s.fixtures.map((f) => `<li>v ${HOUSES[f.opp].name}: ${f.played ? `<b>${f.us} – ${f.them}</b> ${f.us > f.them ? '✔' : '✘'}` : (G.story.yearFraction() >= f.at ? '<i>ready — talk to Madam Hale</i>' : '<i>later this term</i>')}</li>`).join('');
    w.innerHTML = `<div class="panel wide"><h2 class="m-title">Quidditch</h2><p class="m-sub">${c.team ? `${HOUSES[G.save.house].name} house team · ${c.position} · broom: ${BROOMS[c.broom].name}` : 'Not on the house team yet. Talk to Madam Hale at the pitch (tryouts from your second year).'}${c.cups.length ? ` · Cups won: ${c.cups.length}` : ''}</p>
      <div class="nav jr" data-kind="scroll"><div class="j-cols"><div><h3>Fixtures — Year ${G.save.year}</h3><ul>${fx}</ul></div>
      <div><h3>League table</h3><table class="ctl qtable"><thead><tr><th>#</th><th>House</th><th>P</th><th>W</th><th>L</th><th>Goals</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table></div></div></div><div class="row brooms"></div><div class="row"></div></div>`;
    const br = w.querySelector('.brooms');
    for (const [id, b] of Object.entries(BROOMS)) {
      if (!c.owned.includes(id)) continue;
      G.ui.button(br, `${c.broom === id ? '✔ ' : ''}${b.name}`, () => { c.broom = id; writeSave(); G.ui.close(); openQuidditch(); }, c.broom === id ? 'primary' : '');
    }
    G.ui.button(w.querySelectorAll('.row')[1], 'Close', () => G.ui.close(), 'primary');
  }, { cls: 'quidscr' });
}
export function openBroomShop() {
  const c = qc();
  let entry;
  const build = (focus = 0) => {
    entry = G.ui.open((w) => {
      w.innerHTML = `<div class="panel"><h2 class="m-title">Spintwitch’s Brooms</h2><p class="m-sub">You have <b class="gold">${coins()} Sickles</b></p><div class="menu-col shop"></div><div class="row"></div></div>`;
      const col = w.querySelector('.shop');
      for (const [id, b] of Object.entries(BROOMS)) {
        if (!b.price) continue;
        const own = c.owned.includes(id);
        G.ui.button(col, `<span class="t-ico">🧹</span><span class="t-txt"><b>${b.name}</b><small>${b.desc} Speed ${b.speed} · boost ${b.boost} · turning ${b.turn}</small></span><span class="price">${own ? 'owned' : b.price + 's'}</span>`, () => {
          if (own) { c.broom = id; G.ui.toast(`Riding the ${b.name}.`, 'info'); }
          else if (coins() >= b.price) { addCoins(-b.price); c.owned.push(id); c.broom = id; G.audio.sfx('unlock'); G.ui.toast(`Bought a ${b.name}!`, 'quest'); }
          else { G.audio.sfx('fail'); G.ui.toast('Not enough Sickles.', 'info'); }
          writeSave();
          const f = entry.focus; G.ui.close(entry); build(f);
        }, 'talent-btn');
      }
      G.ui.button(w.querySelector('.row'), 'Done', () => G.ui.close(entry), 'primary');
    }, { cls: 'shopscr', focus });
  };
  build();
}
