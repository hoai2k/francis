// Builds one day's digest: every source of every interest, read in parallel,
// keeping what was published since the previous digest.

import { INTERESTS } from "./interests.js";
import { READERS } from "./sources.js";

const HOUR = 3_600_000;
export const FIRST_WINDOW = 36 * HOUR; // the very first digest looks back this far
export const MAX_WINDOW = 72 * HOUR; // after a gap, never look back further than this
const MAX_ITEMS = 40; // per interest

export const dayOf = (t) => new Date(t).toISOString().slice(0, 10);

const ORDER = { update: 0, news: 1, video: 2, post: 3, wiki: 4 };

/** Drop repeats (the same link from two sources) and sort newest first. */
export function tidyItems(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = String(it.url).replace(/[?&](utm_[^&]*|oc=\d+)/g, "");
    // News sites run the same headline ("... codes (October 2026)"): keep the first.
    const headline = it.kind === "news" ? `news:${it.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}` : null;
    if (!it.title || !it.url || seen.has(key) || (headline && seen.has(headline))) continue;
    seen.add(key);
    if (headline) seen.add(headline);
    out.push(it);
  }
  return out.sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || ORDER[a.kind] - ORDER[b.kind]).slice(0, MAX_ITEMS);
}

/**
 * One interest's section for the window [since, until).
 * deps: { fetch, env, state: { get(key), put(key, value) } }
 */
export async function buildSection(interest, { since, until }, { fetch, env, state }) {
  const ctx = { since, until, fetch, env, state };
  const results = await Promise.allSettled(interest.sources.map((src) => {
    const read = READERS[src.type];
    return read ? read(src, ctx) : Promise.reject(new Error(`unknown source type ${src.type}`));
  }));
  const items = [];
  const problems = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") items.push(...r.value);
    else problems.push({ source: describe(interest.sources[i]), error: String(r.reason?.message || r.reason).slice(0, 160) });
  });
  const tidy = tidyItems(items);
  return {
    id: interest.id,
    name: interest.name,
    icon: interest.icon,
    accent: interest.accent,
    summary: null, // written on request: POST /recap
    items: tidy,
    problems,
  };
}

/**
 * The digest for the window [since, until). section(interest) builds one
 * interest; by default in this invocation, but the Worker hands each one to
 * a fresh invocation so that no single run uses much CPU.
 */
export async function buildDigest({ since, until }, deps) {
  const { interests = INTERESTS } = deps;
  const section = deps.section || ((interest) => buildSection(interest, { since, until }, deps));
  const sections = await Promise.all(interests.map(async (interest) => {
    try {
      return await section(interest);
    } catch (e) {
      return {
        id: interest.id, name: interest.name, icon: interest.icon, accent: interest.accent,
        summary: null, items: [], problems: [{ source: "digest", error: String(e?.message || e).slice(0, 160) }],
      };
    }
  }));
  return {
    day: dayOf(until),
    since: new Date(since).toISOString(),
    until: new Date(until).toISOString(),
    built: new Date().toISOString(),
    interests: sections,
  };
}

export function describe(src) {
  switch (src.type) {
    case "steam": return `Steam app ${src.appid}`;
    case "youtube": return `YouTube: ${src.name || src.channel}`;
    case "youtube-search": return `YouTube search: ${src.query}`;
    case "news": return `Google News: ${src.query}`;
    case "reddit": return `r/${src.sub}`;
    case "roblox": return `Roblox game ${src.universe}`;
    case "fandom": return `${src.wiki}.fandom.com`;
    case "minecraft": return `Minecraft ${src.edition} patch notes`;
    case "minecraft-news": return "Minecraft.net news";
    default: return src.type;
  }
}

/** Where the next digest's window starts, given the previous digest (or none). */
export function windowStart(previous, until) {
  const prev = previous ? Date.parse(previous.until) : NaN;
  if (!Number.isFinite(prev)) return until - FIRST_WINDOW;
  return Math.max(prev, until - MAX_WINDOW);
}
