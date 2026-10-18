// Main quests: one per story chapter (story/chapters.js), in story order.
// Step 1: talk to the chapter's giver in its region (Gojo at Jujutsu High,
// Nitta at Shibuya…). Step 2 ('mission'): walk into the district round the
// chapter's anchor (story/chapters.js `world`); a curtain falls over it and
// the chapter plays out there in the open world (world/worldMission.js):
// objective, Special Grade, rewards. Clearing it completes the quest (and the
// chapter, as before). Old saves on the former 'lair' step (index 1) land on
// this step. Once cleared, the chapter's old generated dungeon stays open as
// an optional Cursed Lair at its anchor (story/questMarkers.js).
import { registerQuest } from './index.js';
import { CHAPTERS, arc } from '../story/chapters.js';
import { REGIONS } from '../world/regions/index.js';

for (const ch of CHAPTERS) {
  const A = arc(ch.arc), region = ch.region ?? 'jujutsu_high', g = ch.giver ?? {};
  const npcDef = g.name ? { name: g.name, look: g.look, color: g.color, anchor: 'giver_' + ch.id } : null;
  registerQuest({
    id: ch.id, kind: 'main', chapter: ch.id, arc: ch.arc,
    title: `${ch.title}`, region,
    summary: ch.intro.join(' '),
    subtitle: `Arc ${A?.num}: ${A?.title} · Chapter ${ch.num}`,
    giver: g.npc ? { region, npc: g.npc, npcDef } : null,
    steps: [
      ...(g.npc ? [{ type: 'talk', region, npc: g.npc, npcDef, text: `Talk to ${g.name ?? (g.npc[0].toUpperCase() + g.npc.slice(1))} in ${REGIONS[region]?.name ?? region}`, lines: g.lines ?? ch.intro }] : []),
      { type: 'mission', region, chapter: ch.id, text: `Go to ${ch.place}: the curtain falls when you arrive` },
    ],
  });
}
