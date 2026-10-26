// The short recap above each interest, from Workers AI (ported from the
// Ai-Ching oracle in hoai2k/mini, multiplayer/server/src/oracle.js). The model
// sees only the day's titles, so it can only retell them. If the model is
// unavailable the digest simply has no recap.

export const SUMMARY_MODEL = "@cf/meta/llama-3.2-3b-instruct";
const MAX_ITEMS = 12;

const SYSTEM = "You write the recap at the top of one topic in a fan's daily digest. "
  + "Write 1 or 2 short, lively sentences in plain English saying what happened, using only the items you are given. "
  + "Lead with the biggest thing: a game update or official news before videos and posts. "
  + "Do not invent details, numbers or dates, no lists, no headings, no hashtags, no emoji, no quotation marks, under 50 words.";

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function summaryMessages(interest, items) {
  const lines = items.slice(0, MAX_ITEMS).map((it) => {
    const extra = it.text ? ` (${clean(it.text, 140)})` : "";
    return `- [${it.kind}] ${clean(it.title, 160)}${extra}, from ${it.by || it.source}`;
  });
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Topic: ${interest.name}\nToday's items:\n${lines.join("\n")}` },
  ];
}

/** Tidy a model's answer: one paragraph, no wrapping quotes, a sane length. */
export function tidy(s) {
  let t = clean(s, 600).replace(/^(here is|here's)[^:]*:\s*/i, "").replace(/^["'“]+|["'”]+$/g, "");
  if (t.length > 400) t = t.slice(0, 400).replace(/[^.!?]*$/, "").trim() || t.slice(0, 400);
  return t;
}

export async function summarize(env, interest, items) {
  if (!items.length || !env.AI) return null;
  try {
    const out = await env.AI.run(SUMMARY_MODEL, { messages: summaryMessages(interest, items), max_tokens: 120, temperature: 0.4 });
    return tidy(out?.response) || null;
  } catch (e) {
    console.error(`summary for ${interest.id} failed`, e);
    return null;
  }
}
