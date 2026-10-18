// Main quests: one per story chapter (story/chapters.js), in story order.
// Step 1: talk to the chapter's giver in its region (Gojo at Jujutsu High,
// Nitta at Shibuya…). Step 2: enter the curtain (the region's 'lair_<id>'
// anchor), which starts the chapter's generated dungeon; clearing it
// completes the quest (and the chapter, as before).
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
      { type: 'lair', region, chapter: ch.id, text: `Enter the curtain: ${ch.place}` },
    ],
  });
}
