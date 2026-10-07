// Optional classes in the castle wings: Herbology (Greenhouse Three), Astronomy (the tower),
// Transfiguration (revision in the Library) and Divination (third year on). Each teacher runs
// a repeatable class minigame for house points. Also: the librarian and the Restricted
// Section, and sending letters to friends from the Owlery.
import { G } from './state.js';
import { SKIN_TONES } from './models.js';
import { gate, ledgeItem } from './puzzles.js';
import { runMinigame } from './minigames/index.js';
import { FRIENDS, addFriendship } from './friends.js';

const TEACHERS = {
  bramblewood: { name: 'Professor Bramblewood', voice: 'mid', color: '#a8d878', look: { robeColor: '#3a5a2a', liningColor: '#a07a40', hat: true, hatColor: '#4a6a30', hairStyle: 'curly', hairColor: '#8a6a4a', skin: SKIN_TONES[2], scale: 0.95 } },
  starling: { name: 'Professor Starling', voice: 'high', color: '#a8c8ff', look: { robeColor: '#1a2050', liningColor: '#c0c8ff', hairStyle: 'long', hairColor: '#e8e0d0', skin: SKIN_TONES[4], scale: 1.0 } },
  marlowe: { name: 'Professor Marlowe', voice: 'mid', color: '#d8b0e0', look: { robeColor: '#3a2a4a', liningColor: '#2a6a4a', hat: true, hatColor: '#3a2a4a', hairStyle: 'bun', hairColor: '#5a5a5a', glasses: true, skin: SKIN_TONES[1], scale: 1.04 } },
  vey: { name: 'Madam Vey', voice: 'high', color: '#ffb0c0', look: { robeColor: '#7a3a5a', liningColor: '#e0a040', hairStyle: 'curly', hairColor: '#c8a070', glasses: true, skin: SKIN_TONES[0], scale: 0.94 } },
  quillon: { name: 'Madam Quillon', voice: 'low', color: '#d8c8a0', look: { robeColor: '#2a2a2a', liningColor: '#8a7a50', hairStyle: 'bun', hairColor: '#9a9a9a', skin: SKIN_TONES[1], scale: 1.08, noWand: true } },
};
const LESSONS = {
  bramblewood: { id: 'herbology', title: 'Herbology', intro: 'Mandrakes! Earmuffs on when they scream — and repot them while they’re calm.', about: 'Herbology is the study of magical plants. Respect the plant and the plant respects you. Mostly.' },
  starling: { id: 'astronomy', title: 'Astronomy', intro: 'Tonight we chart three constellations. Steady hands on the telescope.', about: 'Astronomy: the stars do not tell the future — that is Madam Vey’s department — but they tell you where you are.' },
  marlowe: { id: 'transfig', title: 'Transfiguration', intro: 'Watch my wand. Repeat the pattern exactly. Precision, not power.', about: 'Transfiguration is the most complex magic you will learn here. Be precise, or end up with a teapot that squeaks.' },
  vey: { id: 'divination', title: 'Divination', intro: 'Gaze into the mist, my dear… match the omens, and the Inner Eye will open.', about: 'Divination: the noble art of seeing the future. Some have the Sight. The rest of you have homework.' },
};

let made = false;
export function setupClasses(story) {
  for (const [id, d] of Object.entries(TEACHERS)) story.registerNPC(id, d);
  for (const [id, L] of Object.entries(LESSONS)) story.addTalker(id, `Talk to ${TEACHERS[id].name}`, () => teach(story, id, L));
  story.addTalker('quillon', 'Talk to Madam Quillon', () => librarian(story));
  const W = G.world.zones;
  story.interactables.push({ zone: 'astronomy', pos: W.astronomy.spots.post, r: 2.2, label: () => 'Send a letter by owl', act: () => sendLetter(story) });
}
export function placeClassNPCs(story) {
  const W = G.world.zones;
  if (!W.library) return;
  for (const [id, d] of Object.entries(TEACHERS)) story.registerNPC(id, d);
  story.placeNPC('quillon', 'library', W.library.spots.librarian, Math.PI);
  story.placeNPC('marlowe', 'library', W.library.W(3, 0, -12), -Math.PI / 2);
  story.placeNPC('bramblewood', 'greenhouse', W.greenhouse.spots.teacher, 0);
  story.placeNPC('starling', 'astronomy', W.astronomy.spots.teacher, Math.PI);
  story.placeNPC('vey', 'divination', W.divination.spots.teacher, 0);
  if (!made && G.puzzles) {
    made = true;
    // the Restricted Section: a locked gate, and a forbidden book on a high chained shelf
    gate(G.puzzles, 'lib-gate', 'library', W.library.spots.gate, 0, 3.2, 3);
    ledgeItem(G.puzzles, 'lib-tome', 'library', W.library.spots.tome, { coins: 30, item: 'book' });
  }
}

async function teach(story, id, L) {
  if (id === 'vey' && (G.save.year || 1) < 3) { await story.talk(id, ['Divination is for third-years and above, my dear. I foresaw that you would ask. Come back in your third year.']); return; }
  if (!G.save.house) { await story.talk(id, ['Get yourself sorted first, dear, and then come to class.']); return; }
  const c = await story.talk(id, [{ ...story.speaker(id), text: `Welcome to ${L.title}! Shall we have a lesson? (Earns house points.)`, choices: ['Take the lesson', `What is ${L.title}?`, 'Not now'] }]);
  if (c === 1) { await story.talk(id, [L.about]); return; }
  if (c !== 0) return;
  await story.talk(id, [L.intro]);
  const r = await runMinigame(L.id, {});
  if (r && !r.aborted) await story.talk(id, [r.success ? 'Excellent work! Points to your house.' : 'A fair attempt. Come back and try again any time.']);
}

async function librarian(story) {
  const y = G.save.year || 1;
  const lines = y < 2
    ? ['Silence in the Library! …Oh, a first-year. The Restricted Section is out of bounds without a teacher’s note. Don’t even think about Alohomora. You don’t know it yet anyway.']
    : ['Books are to be returned in the condition in which they were borrowed. That includes not being on fire.', 'The Restricted Section? With a note from a teacher. …Or if nobody happens to see you open that gate. I’m going to tea.'];
  await story.talk('quillon', lines);
}

async function sendLetter(story) {
  const today = Math.floor(G.time / 60);
  const met = Object.keys(FRIENDS).filter((id) => G.save.friends?.[id]?.met);
  if (!met.length) { await G.ui.say([{ who: 'An owl', color: '#e0c890', voice: 'mid', text: 'The owl blinks at you. You don’t know anyone to write to yet.' }]); return; }
  if (G.save.lastLetter === today) { await G.ui.say([{ who: 'An owl', color: '#e0c890', voice: 'mid', text: 'Your owl is still out delivering your last letter. Try again later.' }]); return; }
  const pick = met.slice(0, 6);
  const c = await G.ui.say([{ who: 'The Owlery', color: '#e0c890', voice: 'mid', text: 'Who will you write to?', choices: [...pick.map((id) => FRIENDS[id].short), 'Nobody'] }]);
  if (c == null || c >= pick.length) return;
  const id = pick[c];
  G.save.lastLetter = today;
  addFriendship(id, 3);
  G.audio.sfx('whoosh');
  G.ui.toast(`Your owl flies off to ${FRIENDS[id].short} with your letter.`, 'info');
}
