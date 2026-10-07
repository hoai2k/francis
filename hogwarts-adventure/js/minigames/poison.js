// The poison puzzle: a friend has been poisoned, and the antidote is one of six phials on
// Professor Pell's shelf. Read the clues, reason it out, and choose — two guesses at most,
// and every wrong one makes things worse.
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { FRIENDS } from '../friends.js';

const PUZZLES = [
  {
    phials: ['Amber', 'Violet', 'Green', 'Clear', 'Black', 'Silver'], answer: 2,
    clues: ['The antidote stands at neither end of the row.', 'Violet and Black are both deadly poisons.', 'Clear is only water.', 'The antidote stands just to the right of a poison.'],
  },
  {
    phials: ['Blue', 'Red', 'Gold', 'Grey', 'White', 'Pink'], answer: 0,
    clues: ['Two phials hold poison, and they stand side by side.', 'Gold is one of the poisons.', 'The antidote is the colour of neither fire nor snow.', 'Pink is only a sleeping draught.', 'The antidote stands further from Gold than Grey does.'],
  },
  {
    phials: ['Copper', 'Jade', 'Ink', 'Rose', 'Pearl', 'Smoke'], answer: 3,
    clues: ['Copper and Ink are deadly.', 'Jade is nothing but pumpkin juice.', 'The antidote stands beside Pearl.', 'Smoke burns the throat — it is poison too.'],
  },
];

export async function play(opts = {}) {
  const fid = opts.friend && FRIENDS[opts.friend] ? opts.friend : 'oren';
  const name = FRIENDS[fid].short;
  const P = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  const S = { tries: 0, done: false, lit: 0 };
  let aborted = false;
  mgEnter({ music: 'potions', abort: () => { aborted = true; G.ui.sayToken = (G.ui.sayToken || 0) + 1; }, update() {
    G.ui.minigameHUD(`<div class="mg-row"><span>${name}’s pulse</span><span><b>${['Steady', 'Weak', 'Fading'][S.tries]}</b></span><span>Guesses left <b>${2 - S.tries}</b></span></div><small>Read the clues, then choose a phial</small>`);
  } });
  const pell = { who: 'Professor Pell', color: '#e0c070', voice: 'mid' };
  const clueLines = () => P.clues.map((c, i) => ({ ...pell, text: `Clue ${i + 1}: ${c}` }));
  await G.ui.say([
    { ...pell, text: `${name} is turning grey — poison! The antidote is on my shelf, but the labels have been switched. Some joker’s idea of a riddle is pinned beside them.` },
    { ...pell, text: `Six phials, left to right: ${P.phials.join(', ')}.` },
    ...clueLines(),
  ]);
  let won = false;
  while (!aborted && S.tries < 2) {
    const c = await G.ui.say([{ ...pell, text: 'Which phial is the antidote?', choices: [...P.phials, 'Read the clues again'] }]);
    if (aborted || c == null) break;
    if (c === P.phials.length) { await G.ui.say(clueLines()); continue; }
    if (c === P.answer) { won = true; break; }
    S.tries++;
    G.audio.sfx('fail');
    G.input.rumble(0.6, 0.4, 200);
    if (S.tries < 2) await G.ui.say([{ ...pell, text: `Not that one! ${name} is getting worse — think again, carefully.` }]);
  }
  mgExit();
  if (aborted) return { aborted: true };
  if (won) {
    G.audio.sfx('victory');
    await G.ui.say([{ ...pell, text: `${P.phials[P.answer]} — yes! Pour it in, quickly… There. Colour’s coming back. ${name} will live. Remarkable reasoning.` }]);
  } else {
    await G.ui.say([{ ...pell, text: `I— wait. A bezoar! In my desk drawer! …There. That was far too close. The answer was ${P.phials[P.answer]}.` }]);
  }
  return {
    title: won ? 'Antidote found!' : 'Saved by a bezoar', success: won, score: won ? (2 - S.tries) * 100 : 0, points: won ? 30 - S.tries * 10 : 5,
    sub: won ? `${name} is going to be all right.` : 'Read the clues again and try once more.',
    lines: [['Wrong guesses', S.tries]],
  };
}
