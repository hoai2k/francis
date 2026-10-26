// francis-digest: builds the Daily Digest (digest/ in hoai2k/francis) once a
// day on a cron trigger and serves it to the page.
//
//   GET  /days              the days that have a digest, newest first
//   GET  /digest/latest     the newest digest (built on the spot if there is none yet,
//                           or if the newest is more than a day and a bit old)
//   GET  /digest/YYYY-MM-DD one day's digest
//   POST /refresh           rebuild today's digest; needs "Authorization: Bearer <REFRESH_TOKEN>"
//
// Digests live in the DIGEST KV namespace: "days" (a list), "digest:<day>"
// and "state" (what the readers remember between runs, such as a Roblox
// game's last update time).
//
// Each interest is built in its own invocation of this Worker, through the
// SELF service binding (POST https://internal/section), so that one run never
// parses every feed: the free plan allows 10 ms of CPU per invocation.

import { buildDigest, buildSection, dayOf, windowStart } from "./digest.js";
import { INTERESTS } from "./interests.js";

const KEEP_DAYS = 120;
const STALE = 26 * 3_600_000;

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

/** Build (or rebuild) the digest for the day of `now` and store it. */
export async function runDigest(env, now = Date.now(), fetchImpl = globalThis.fetch) {
  const kv = env.DIGEST;
  const today = dayOf(now);
  const days = await readJson(kv, "days", []);
  const existing = days.includes(today) ? await readJson(kv, `digest:${today}`, null) : null;
  let since;
  if (existing) {
    since = Date.parse(existing.since); // a rebuild covers the same window, up to now
  } else {
    const prevDay = days.find((d) => d < today);
    since = windowStart(prevDay ? await readJson(kv, `digest:${prevDay}`, null) : null, now);
  }

  const memory = await readJson(kv, "state", {});
  const state = { get: async (k) => memory[k], put: async (k, v) => { memory[k] = v; } };
  const section = env.SELF ? async (interest) => {
    const res = await env.SELF.fetch("https://internal/section", {
      method: "POST",
      body: JSON.stringify({ id: interest.id, since, until: now, state: memory }),
    });
    if (!res.ok) throw new Error(`section build answered ${res.status}`);
    const out = await res.json();
    Object.assign(memory, out.state);
    return out.section;
  } : undefined;
  const digest = await buildDigest({ since, until: now }, { fetch: fetchImpl, env, state, section });

  const list = [today, ...days.filter((d) => d !== today)].sort().reverse();
  await kv.put(`digest:${today}`, JSON.stringify(digest));
  await kv.put("days", JSON.stringify(list.slice(0, KEEP_DAYS)));
  await kv.put("state", JSON.stringify(memory));
  await Promise.all(list.slice(KEEP_DAYS).map((d) => kv.delete(`digest:${d}`)));
  return digest;
}

/** The newest digest, building one first when there is none or it is stale. */
async function latest(env, ctx) {
  const days = await readJson(env.DIGEST, "days", []);
  const newest = days[0] ? await readJson(env.DIGEST, `digest:${days[0]}`, null) : null;
  if (newest && Date.now() - Date.parse(newest.until) < STALE) return newest;
  // Only one build at a time; others get the stale digest (or a "building" answer).
  if (await env.DIGEST.get("building")) return newest;
  await env.DIGEST.put("building", "1", { expirationTtl: 120 });
  try {
    return await runDigest(env);
  } finally {
    ctx.waitUntil(env.DIGEST.delete("building"));
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });

    if (path === "/") return json({ name: "francis-digest", routes: ["/days", "/digest/latest", "/digest/YYYY-MM-DD"] });

    // Only reachable through the SELF binding: the public host is workers.dev.
    if (path === "/section" && url.hostname === "internal" && request.method === "POST") {
      const { id, since, until, state: memory = {} } = await request.json();
      const interest = INTERESTS.find((i) => i.id === id);
      if (!interest) return json({ error: "not_found" }, 404);
      const changed = {};
      const state = { get: async (k) => memory[k], put: async (k, v) => { changed[k] = v; } };
      const section = await buildSection(interest, { since, until }, { fetch: globalThis.fetch, env, state });
      return json({ section, state: changed });
    }

    if (path === "/refresh") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      const token = env.REFRESH_TOKEN;
      if (!token || request.headers.get("Authorization") !== `Bearer ${token}`) return json({ error: "unauthorized" }, 401);
      return json(await runDigest(env));
    }

    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);

    if (path === "/days") return json(await readJson(env.DIGEST, "days", []), 200, { "Cache-Control": "max-age=300" });

    if (path === "/digest/latest") {
      const d = await latest(env, ctx);
      return d ? json(d, 200, { "Cache-Control": "max-age=300" }) : json({ error: "building" }, 503, { "Retry-After": "30" });
    }

    const m = path.match(/^\/digest\/(\d{4}-\d{2}-\d{2})$/);
    if (m) {
      const d = await readJson(env.DIGEST, `digest:${m[1]}`, null);
      return d ? json(d, 200, { "Cache-Control": "max-age=3600" }) : json({ error: "not_found" }, 404);
    }
    return json({ error: "not_found" }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDigest(env, event.scheduledTime));
  },
};
