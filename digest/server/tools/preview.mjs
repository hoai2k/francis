// Builds a digest on this machine from the live sources, without Workers AI,
// and writes it as JSON. Open the page with ?data=<that file> to see it.
//   node tools/preview.mjs [out.json] [hours to look back, default 36]

import { writeFileSync } from "node:fs";
import { buildSection } from "../src/digest.js";
import { INTERESTS } from "../src/interests.js";

const out = process.argv[2] || "preview.json";
const hours = Number(process.argv[3] || 36);
const until = Date.now();
const memory = {};
const state = { get: async (k) => memory[k], put: async (k, v) => { memory[k] = v; } };
const cpu0 = process.cpuUsage();
const since = until - hours * 3_600_000;
const interests = await Promise.all(INTERESTS.map((i) => buildSection(i, { since, until }, { fetch, env: process.env, state })));
const digest = { day: new Date(until).toISOString().slice(0, 10), since: new Date(since).toISOString(), until: new Date(until).toISOString(), built: new Date().toISOString(), interests };
const cpu = process.cpuUsage(cpu0);
writeFileSync(out, JSON.stringify(digest, null, 2));
for (const s of digest.interests) {
  console.log(`${s.icon} ${s.name}: ${s.items.length} items`);
  for (const p of s.problems) console.log(`   ! ${p.source}: ${p.error}`);
}
console.log(`CPU ${((cpu.user + cpu.system) / 1000).toFixed(0)} ms; wrote ${out}`);
