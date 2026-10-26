// francis-digest: serves the Daily Digest (digest/ in hoai2k/francis) and
// builds each day's digest on demand: the first visit of a day builds it,
// driven by the page so it can show progress. Nothing runs on days nobody
// visits.
//
//   GET  /days                the days that have a digest, newest first
//   GET  /digest/latest       the newest digest
//   GET  /digest/YYYY-MM-DD   one day's digest
//   POST /build {day}         start (or look up) the digest for the visitor's day:
//                             { status: "done", digest } or
//                             { status: "building", interests: [...] }
//   POST /build/section {day, id}   gather one interest; saved, so each runs once a day
//   POST /build/finish {day}  put the sections together and store the digest
//   POST /recap               write the AI recaps for the newest digest, once
//   POST /refresh             forget the newest digest so the next visit rebuilds it;
//                             needs "Authorization: Bearer <REFRESH_TOKEN>"
//
// Each interest is gathered in its own request, so that no single
// invocation parses every feed: the free plan allows 10 ms of CPU per
// invocation. KV (DIGEST) holds "days", "digest:<day>", a day's build plan
// and finished sections while it is being built ("plan:<day>",
// "section:<day>:<id>", kept a day), and what readers remember between
// runs ("state:<key>", such as a Roblox game's name).

import { buildSection, windowStart } from "./digest.js";
import { INTERESTS } from "./interests.js";
import { summarize } from "./summary.js";

const KEEP_DAYS = 120;
const DAY_MS = 86_400_000;
const TEMP = { expirationTtl: 2 * 86_400 }; // plans and sections outlive their day, then go

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const json = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { ...HEADERS, ...extra } });

async function readJson(kv, key, fallback) {
  const v = await kv.get(key, "json");
  return v ?? fallback;
}

/**
 * The visitor's day ("YYYY-MM-DD" in their time zone) if it is plausible:
 * within a day and a half of now, so nobody can build far-off days.
 */
export function validDay(day, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day))) return null;
  const noon = Date.parse(`${day}T12:00:00Z`);
  return Number.isFinite(noon) && Math.abs(noon - now) <= 1.5 * DAY_MS ? day : null;
}

const SOURCE_LABEL = {
  steam: "Steam", youtube: "YouTube", "youtube-search": "YouTube", news: "Google News", reddit: "Reddit",
  roblox: "Roblox", fandom: "Fandom wiki", minecraft: "Mojang", "minecraft-news": "Minecraft.net",
};

/** What the progress screen shows for an interest while it is gathered. */
const describeInterest = (i) => ({
  id: i.id, name: i.name, icon: i.icon, accent: i.accent, loading: i.loading,
  sources: [...new Set(i.sources.map((s) => SOURCE_LABEL[s.type] || s.type))],
});

/** POST /build: the digest if it exists, else the plan for building it. */
export async function startBuild(env, day, now = Date.now()) {
  const kv = env.DIGEST;
  const done = await readJson(kv, `digest:${day}`, null);
  if (done) return { status: 200, body: { status: "done", digest: done } };
  const days = await readJson(kv, "days", []);
  if (days[0] && days[0] > day) return { status: 409, body: { error: "newer_digest_exists", day: days[0] } };
  let plan = await readJson(kv, `plan:${day}`, null);
  if (plan && !plan.until) { // left by /refresh: the same window, up to now
    plan.until = now;
    await kv.put(`plan:${day}`, JSON.stringify(plan), TEMP);
  }
  if (!plan) {
    const prevDay = days.find((d) => d < day);
    const since = windowStart(prevDay ? await readJson(kv, `digest:${prevDay}`, null) : null, now);
    plan = { day, since, until: now, interests: INTERESTS.map((i) => i.id) };
    await kv.put(`plan:${day}`, JSON.stringify(plan), TEMP);
  }
  const interests = await Promise.all(INTERESTS.filter((i) => plan.interests.includes(i.id)).map(async (i) => ({
    ...describeInterest(i),
    done: Boolean(await kv.get(`section:${day}:${i.id}`)),
  })));
  return { status: 200, body: { status: "building", day, since: new Date(plan.since).toISOString(), interests } };
}

/** POST /build/section: one interest's section, gathered once and saved. */
export async function buildOne(env, day, id, fetchImpl = globalThis.fetch) {
  const kv = env.DIGEST;
  const plan = await readJson(kv, `plan:${day}`, null);
  const interest = INTERESTS.find((i) => i.id === id);
  if (!plan || !interest || !plan.interests.includes(id)) return { status: 404, body: { error: "not_found" } };
  const saved = await readJson(kv, `section:${day}:${id}`, null);
  if (saved) return { status: 200, body: saved };
  const state = {
    get: (k) => kv.get(`state:${k}`, "json"),
    put: (k, v) => kv.put(`state:${k}`, JSON.stringify(v)),
  };
  const section = await buildSection(interest, plan, { fetch: fetchImpl, env, state });
  await kv.put(`section:${day}:${id}`, JSON.stringify(section), TEMP);
  return { status: 200, body: section };
}

/** POST /build/finish: the stored digest, once every section is in. */
export async function finishBuild(env, day) {
  const kv = env.DIGEST;
  const done = await readJson(kv, `digest:${day}`, null);
  if (done) return { status: 200, body: done };
  const plan = await readJson(kv, `plan:${day}`, null);
  if (!plan) return { status: 404, body: { error: "not_found" } };
  const ids = plan.interests.filter((id) => INTERESTS.some((i) => i.id === id));
  const sections = await Promise.all(ids.map((id) => readJson(kv, `section:${day}:${id}`, null)));
  const missing = ids.filter((_, n) => !sections[n]);
  if (missing.length) return { status: 409, body: { error: "missing_sections", missing } };
  const digest = {
    day,
    since: new Date(plan.since).toISOString(),
    until: new Date(plan.until).toISOString(),
    built: new Date().toISOString(),
    interests: sections,
  };
  const days = await readJson(kv, "days", []);
  const list = [day, ...days.filter((d) => d !== day)].sort().reverse();
  await kv.put(`digest:${day}`, JSON.stringify(digest));
  await kv.put("days", JSON.stringify(list.slice(0, KEEP_DAYS)));
  await Promise.all([
    kv.delete(`plan:${day}`),
    ...ids.map((id) => kv.delete(`section:${day}:${id}`)),
    ...list.slice(KEEP_DAYS).map((d) => kv.delete(`digest:${d}`)),
  ]);
  return { status: 200, body: digest };
}

/** POST /refresh: forget the newest digest so the next visit builds it again. */
export async function forgetNewest(env) {
  const kv = env.DIGEST;
  const days = await readJson(kv, "days", []);
  if (!days[0]) return { cleared: null };
  const old = await readJson(kv, `digest:${days[0]}`, null);
  // Keep its window's start, so the rebuild covers the same stretch of time.
  if (old) await kv.put(`plan:${days[0]}`, JSON.stringify({ day: days[0], since: Date.parse(old.since), until: null, interests: INTERESTS.map((i) => i.id) }), TEMP);
  await kv.delete(`digest:${days[0]}`);
  await kv.put("days", JSON.stringify(days.slice(1)));
  return { cleared: days[0] };
}

/**
 * Recaps for the newest digest, written once. Only the newest day can get
 * them and a digest is recapped only once, so the model runs at most once
 * per daily digest however often the button is pressed.
 */
export async function recap(env) {
  const days = await readJson(env.DIGEST, "days", []);
  const digest = days[0] ? await readJson(env.DIGEST, `digest:${days[0]}`, null) : null;
  if (!digest) return { status: 404, body: { error: "no_digest" } };
  if (digest.recapped) return { status: 200, body: digest };
  if (!env.AI) return { status: 503, body: { error: "unavailable" } };
  if (await env.DIGEST.get("recapping")) return { status: 409, body: { error: "busy" } };
  await env.DIGEST.put("recapping", "1", { expirationTtl: 120 });
  try {
    await Promise.all(digest.interests.map(async (s) => {
      const interest = INTERESTS.find((i) => i.id === s.id) || s;
      s.summary = await summarize(env, interest, s.items);
    }));
    // If the model answered for none of them, leave the day open to try again.
    if (digest.interests.some((s) => s.items.length) && !digest.interests.some((s) => s.summary)) {
      return { status: 502, body: { error: "model_failed" } };
    }
    digest.recapped = new Date().toISOString();
    await env.DIGEST.put(`digest:${digest.day}`, JSON.stringify(digest));
    return { status: 200, body: digest };
  } finally {
    await env.DIGEST.delete("recapping");
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
    const NO_STORE = { "Cache-Control": "no-store" };

    if (path === "/") return json({ name: "francis-digest", routes: ["/days", "/digest/latest", "/digest/YYYY-MM-DD", "/build"] });

    if (request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch { /* no body */ }
      const answer = ({ status, body: out }) => json(out, status, NO_STORE);

      if (path === "/build" || path === "/build/section" || path === "/build/finish") {
        const day = validDay(body.day);
        if (!day) return json({ error: "bad_day" }, 400);
        if (path === "/build") return answer(await startBuild(env, day));
        if (path === "/build/finish") return answer(await finishBuild(env, day));
        return answer(await buildOne(env, day, String(body.id || "")));
      }
      if (path === "/recap") return answer(await recap(env));
      if (path === "/refresh") {
        const token = env.REFRESH_TOKEN;
        if (!token || request.headers.get("Authorization") !== `Bearer ${token}`) return json({ error: "unauthorized" }, 401);
        return json(await forgetNewest(env));
      }
      return json({ error: "not_found" }, 404);
    }

    if (request.method !== "GET" || /^\/(build|recap|refresh)/.test(path)) return json({ error: "method_not_allowed" }, 405);

    if (path === "/days") return json(await readJson(env.DIGEST, "days", []), 200, NO_STORE);

    if (path === "/digest/latest") {
      const days = await readJson(env.DIGEST, "days", []);
      const d = days[0] ? await readJson(env.DIGEST, `digest:${days[0]}`, null) : null;
      return d ? json(d, 200, NO_STORE) : json({ error: "not_found" }, 404);
    }

    const m = path.match(/^\/digest\/(\d{4}-\d{2}-\d{2})$/);
    if (m) {
      const d = await readJson(env.DIGEST, `digest:${m[1]}`, null);
      return d ? json(d, 200, NO_STORE) : json({ error: "not_found" }, 404);
    }
    return json({ error: "not_found" }, 404);
  },
};
