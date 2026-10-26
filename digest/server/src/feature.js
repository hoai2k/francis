// The video of the day for an interest with a `feature` (see interests.js):
// the most-viewed video about it uploaded since the previous digest (or in
// the past week, if nothing new), never one that was featured on an earlier
// day. It reads YouTube's search page, which needs no key; with the
// YOUTUBE_API_KEY secret it asks the YouTube Data API instead.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const WEEK = 7 * 86_400_000;
const REMEMBER = 30; // past picks kept, so none comes back

// Search filters: uploaded today, uploaded this week (relevance order).
const TODAY = "EgIIAg%3D%3D";
const THIS_WEEK = "EgIIAw%3D%3D";

const UNIT_MS = { second: 1e3, minute: 6e4, hour: 3.6e6, day: 8.64e7, week: 6.048e8, month: 2.592e9, year: 3.1536e10 };

/** "12h ago", "19 min ago", "2 days ago", "Streamed 3 hours ago" -> milliseconds, or NaN. */
export function agoMs(text) {
  const m = String(text || "").toLowerCase().match(/(\d+)\s*(seconds?|secs?|s|minutes?|mins?|months?|mo|m|hours?|hrs?|h|days?|d|weeks?|wks?|w|years?|yrs?|y)\b/);
  if (!m) return NaN;
  const u = m[2];
  const unit = u.startsWith("mo") ? "month" : u.startsWith("s") ? "second" : u.startsWith("m") ? "minute"
    : u.startsWith("h") ? "hour" : u.startsWith("d") ? "day" : u.startsWith("w") ? "week" : "year";
  return Number(m[1]) * UNIT_MS[unit];
}

/** "88,404 views", "1.2M views", "No views" -> a number. */
export function viewCount(text) {
  const m = String(text || "").replace(/,/g, "").match(/([\d.]+)\s*([kmb])?/i);
  if (!m) return 0;
  return Math.round(Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]?.toLowerCase()] || 1));
}

/** The JSON string that starts at html[at] (just after its opening quote). */
function readString(html, at) {
  let end = at;
  while (end < html.length && html[end] !== '"') end += html[end] === "\\" ? 2 : 1;
  const raw = html.slice(at, end);
  if (!raw.includes("\\")) return raw;
  try { return JSON.parse(`"${raw}"`); } catch { return raw; }
}

const FIELDS = {
  title: ['"title":{"runs":[{"text":"'],
  by: ['"ownerText":{"runs":[{"text":"'],
  views: ['"viewCountText":{"simpleText":"'],
  ago: ['"publishedTimeText":{"simpleText":"'],
  length: ['"lengthText":', '"simpleText":"'],
};

/**
 * The videos on a YouTube search page. Finds each "videoRenderer" and reads
 * a few fields after it with plain string search: parsing the whole
 * (megabyte) page would cost more CPU than a Worker request may use.
 */
export function searchResults(html, now) {
  const out = [];
  const mark = '"videoRenderer":{"videoId":"';
  let i = html.indexOf(mark);
  while (i !== -1 && out.length < 30) {
    const next = html.indexOf(mark, i + mark.length);
    const stop = next === -1 ? i + 20000 : Math.min(next, i + 20000);
    const id = html.slice(i + mark.length, i + mark.length + 11);
    const get = (f) => {
      let at = i;
      for (const key of FIELDS[f]) {
        at = html.indexOf(key, at);
        if (at === -1 || at > stop) return "";
        at += key.length;
      }
      return readString(html, at);
    };
    const age = agoMs(get("ago"));
    if (/^[\w-]{11}$/.test(id) && Number.isFinite(age)) {
      out.push({
        id, title: get("title"), by: get("by"), views: viewCount(get("views")), length: get("length"),
        date: new Date(now - age).toISOString(),
      });
    }
    i = next;
  }
  return out;
}

async function scrape(feature, ctx) {
  const pages = await Promise.all([TODAY, THIS_WEEK].map(async (sp) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(feature.query)}&sp=${sp}&hl=en&gl=US`;
    const fetchImpl = ctx.fetch;
    const res = await fetchImpl(url, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" } });
    if (!res.ok) throw new Error(`YouTube search answered ${res.status}`);
    return searchResults(await res.text(), ctx.until);
  }));
  return pages.flat();
}

async function api(feature, ctx, key) {
  const q = new URLSearchParams({
    part: "snippet", type: "video", order: "viewCount", maxResults: "15", q: feature.query,
    publishedAfter: new Date(ctx.until - WEEK).toISOString(), relevanceLanguage: "en", key,
  });
  const fetchImpl = ctx.fetch;
  const res = await fetchImpl(`https://www.googleapis.com/youtube/v3/search?${q}`);
  if (!res.ok) throw new Error(`YouTube API answered ${res.status}`);
  const data = await res.json();
  // Already in view order; rank stands in for views.
  return (data.items || []).map((v, n) => ({
    id: v.id.videoId, title: v.snippet.title, by: v.snippet.channelTitle, views: 1e9 - n, length: "",
    date: v.snippet.publishedAt, ranked: true,
  }));
}

/** Pick from candidates: new since the last digest first, then the past week; most views wins. */
export function choose(candidates, { since, until, match = [], skip = [] }) {
  const seen = new Set();
  const ok = candidates.filter((v) => {
    if (seen.has(v.id) || skip.includes(v.id)) return false;
    seen.add(v.id);
    const t = v.title.toLowerCase();
    return (!match.length || match.some((w) => t.includes(w.toLowerCase()))) && Date.parse(v.date) >= until - WEEK;
  });
  const fresh = ok.filter((v) => Date.parse(v.date) >= since - 3_600_000); // "ago" is rounded
  const pool = fresh.length ? fresh : ok;
  return pool.sort((a, b) => b.views - a.views)[0] || null;
}

/** The section saved for a feature job: { kind: "feature", interest, video, problems }. */
export async function pickVideo(interest, ctx, day) {
  const feature = interest.feature;
  const key = `featured:${interest.id}`;
  const past = (await ctx.state.get(key)) || {}; // video id -> the day it was featured
  const skip = Object.keys(past).filter((id) => past[id] !== day);
  const out = { kind: "feature", interest: interest.id, name: interest.name, icon: interest.icon, accent: interest.accent, title: feature.title, video: null, problems: [] };
  try {
    const candidates = ctx.env?.YOUTUBE_API_KEY ? await api(feature, ctx, ctx.env.YOUTUBE_API_KEY) : await scrape(feature, ctx);
    const v = choose(candidates, { since: ctx.since, until: ctx.until, match: feature.match, skip });
    if (v) {
      out.video = {
        id: v.id, title: v.title, by: v.by, views: v.ranked ? null : v.views, length: v.length, date: v.date,
        url: `https://www.youtube.com/watch?v=${v.id}`, thumb: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      };
      const kept = Object.entries({ ...past, [v.id]: day }).sort((a, b) => (a[1] < b[1] ? 1 : -1)).slice(0, REMEMBER);
      await ctx.state.put(key, Object.fromEntries(kept));
    }
  } catch (e) {
    out.problems.push({ source: "YouTube search", error: String(e?.message || e).slice(0, 160) });
  }
  return out;
}
