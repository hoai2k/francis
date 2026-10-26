// One reader per source type (see interests.js). Each takes the source and a
// context { since, until, fetch, env, state } and returns items:
//   { kind, title, url, date, source, thumb?, by?, text? }
// kind is "video", "news", "update", "post" or "wiki"; date is an ISO string.
// Readers return only items published in [since, until). A reader that
// throws is reported in the digest as a source that could not be read.

const UA = "francis-digest/1.0 (+https://hoai2k.github.io/francis/digest/)";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

export function decode(s) {
  return String(s ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Plain text from HTML or Steam BBCode, one line, at most max characters. */
export function plain(s, max = 220) {
  let t = decode(s).replace(/<[^>]*>/g, " ").replace(/\[[^\]]*\]/g, " ").replace(/\{STEAM_CLAN_IMAGE\}\S*/g, " ");
  t = decode(t).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : t;
}

/** The blocks of an RSS or Atom feed (<item> or <entry>), as raw XML strings. */
export function blocks(xml, tag, max = 40) {
  const out = [];
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const text = String(xml);
  let i = text.indexOf(open);
  while (i !== -1 && out.length < max) {
    const next = text[i + open.length];
    const end = text.indexOf(close, i);
    if (end === -1) break;
    if (next === ">" || next === " " || next === "\n" || next === "\t") out.push(text.slice(i, end + close.length));
    i = text.indexOf(open, end);
  }
  return out;
}

// field() runs a few times per item; compile each pattern once.
const patterns = new Map();
function pattern(tag, attr) {
  const key = `${tag} ${attr || ""}`;
  let re = patterns.get(key);
  if (!re) {
    const esc = tag.replace(":", "\\:");
    re = attr ? new RegExp(`<${esc}\\b[^>]*\\b${attr}="([^"]*)"`) : new RegExp(`<${esc}\\b[^>]*>([\\s\\S]*?)</${esc}>`);
    patterns.set(key, re);
  }
  return re;
}

/** The text of the first <tag> in a block, or an attribute of it. */
export function field(xml, tag, attr) {
  const m = xml.match(pattern(tag, attr));
  if (!m) return "";
  return attr ? decode(m[1]) : decode(m[1]).trim();
}

const inWindow = (date, ctx) => {
  const t = Date.parse(date);
  return Number.isFinite(t) && t >= ctx.since && t < ctx.until;
};

async function get(ctx, url, as = "text") {
  const fetchImpl = ctx.fetch; // called unbound: Workers rejects fetch with another `this`
  const res = await fetchImpl(url, { headers: { "User-Agent": UA, Accept: as === "json" ? "application/json" : "*/*" } });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return as === "json" ? res.json() : res.text();
}

const iso = (t) => new Date(t).toISOString();

// ---------------------------------------------------------------- Steam

export async function steam(src, ctx) {
  const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${src.appid}&count=15&maxlength=600&feeds=steam_community_announcements`;
  const data = await get(ctx, url, "json");
  return (data?.appnews?.newsitems || [])
    .filter((n) => inWindow(new Date(n.date * 1000).toISOString(), ctx))
    .map((n) => {
      const img = String(n.contents || "").match(/\{STEAM_CLAN_IMAGE\}(\/[^\s"\]\[]+)/);
      return {
        kind: /update|patch|hotfix|\d+\.\d+\.\d+/i.test(n.title) ? "update" : "news",
        title: plain(n.title, 160),
        url: n.url,
        date: iso(n.date * 1000),
        source: "Steam",
        thumb: img ? `https://clan.akamai.steamstatic.com/images${img[1]}` : undefined,
        text: plain(n.contents),
      };
    });
}

// ---------------------------------------------------------------- YouTube

export async function youtube(src, ctx) {
  const xml = await get(ctx, `https://www.youtube.com/feeds/videos.xml?channel_id=${src.channel}`);
  return blocks(xml, "entry")
    .map((e) => {
      const id = field(e, "yt:videoId");
      return {
        kind: "video",
        title: field(e, "title"),
        url: `https://www.youtube.com/watch?v=${id}`,
        date: field(e, "published"),
        source: "YouTube",
        by: field(e, "name") || src.name,
        thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        text: plain(field(e, "media:description"), 180),
      };
    })
    .filter((it) => inWindow(it.date, ctx));
}

/** YouTube search across all channels. Costs 100 of the key's 10,000 daily units. */
export async function youtubeSearch(src, ctx) {
  const key = ctx.env?.YOUTUBE_API_KEY;
  if (!key) return [];
  const q = new URLSearchParams({
    part: "snippet", type: "video", order: "viewCount", maxResults: "8", q: src.query,
    publishedAfter: iso(ctx.since), publishedBefore: iso(ctx.until), relevanceLanguage: "en", key,
  });
  const data = await get(ctx, `https://www.googleapis.com/youtube/v3/search?${q}`, "json");
  return (data.items || []).map((v) => ({
    kind: "video",
    title: decode(v.snippet.title),
    url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
    date: v.snippet.publishedAt,
    source: "YouTube",
    by: decode(v.snippet.channelTitle),
    thumb: v.snippet.thumbnails?.medium?.url,
    text: plain(v.snippet.description, 180),
  })).filter((it) => inWindow(it.date, ctx));
}

// ---------------------------------------------------------------- Google News

/** The words a news headline must contain: the quoted phrase, or the whole query. */
export function newsMatch(src) {
  return (src.match || src.query.match(/"([^"]+)"/)?.[1] || src.query).toLowerCase();
}

export async function news(src, ctx) {
  const q = encodeURIComponent(`${src.query} when:2d`);
  const must = newsMatch(src);
  const xml = await get(ctx, `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`);
  return blocks(xml, "item")
    .map((e) => {
      const site = field(e, "source");
      let title = field(e, "title");
      if (site && title.endsWith(` - ${site}`)) title = title.slice(0, -(site.length + 3));
      return { kind: "news", title, url: field(e, "link"), date: iso(Date.parse(field(e, "pubDate")) || 0), source: site || "News" };
    })
    // Google matches words anywhere in an article; keep only headlines about it.
    .filter((it) => inWindow(it.date, ctx) && it.title.toLowerCase().includes(must))
    .slice(0, 8);
}

// ---------------------------------------------------------------- Reddit

export async function reddit(src, ctx) {
  const xml = await get(ctx, `https://www.reddit.com/r/${src.sub}/top/.rss?t=day&limit=10`);
  return blocks(xml, "entry")
    .map((e) => {
      const thumb = field(e, "media:thumbnail", "url");
      return {
        kind: "post",
        title: field(e, "title"),
        url: field(e, "link", "href"),
        date: field(e, "published") || field(e, "updated"),
        source: `r/${src.sub}`,
        by: field(e, "name"),
        thumb: thumb || undefined,
      };
    })
    // Top of the day may include posts from just before the window; keep them.
    .filter((it) => Date.parse(it.date) >= ctx.since - 86_400_000)
    .slice(0, 6);
}

// ---------------------------------------------------------------- Roblox

/** A Roblox game: an item when it was updated (published) in the window. */
export async function roblox(src, ctx) {
  const data = await get(ctx, `https://games.roblox.com/v1/games?universeIds=${src.universe}`, "json");
  const g = data?.data?.[0];
  if (!g) throw new Error("Roblox game not found");
  // Remember the name, so a renamed game (the name carries the update's
  // title, like "[HIRED KILLER] Jujutsu Shenanigans") can say what it was.
  const key = `roblox:${src.universe}`;
  const before = await ctx.state.get(key);
  const now = before && before.name !== g.name
    ? { name: g.name, previous: before.name, renamed: iso(ctx.until) }
    : { name: g.name, previous: before?.previous, renamed: before?.renamed };
  await ctx.state.put(key, now);
  if (!inWindow(g.updated, ctx)) return [];
  let thumb;
  try {
    const t = await get(ctx, `https://thumbnails.roblox.com/v1/games/icons?universeIds=${src.universe}&size=150x150&format=Png`, "json");
    thumb = t?.data?.[0]?.imageUrl;
  } catch { /* no icon */ }
  const tag = g.name.match(/^\s*\[([^\]]+)\]/)?.[1];
  const renamed = now.previous && inWindow(now.renamed, { since: ctx.since, until: ctx.until + 1 });
  return [{
    kind: "update",
    title: tag ? `Game updated: ${tag}` : "Game updated",
    url: `https://www.roblox.com/games/${g.rootPlaceId}`,
    date: g.updated,
    source: "Roblox",
    thumb,
    text: `${renamed ? `Renamed from “${now.previous}” to “${g.name}”. ` : ""}${g.playing.toLocaleString("en-US")} playing right now, ${g.visits.toLocaleString("en-US")} visits.`,
  }];
}

// ---------------------------------------------------------------- Fandom

/** New article pages, and one item summing up the busiest pages. */
export async function fandom(src, ctx) {
  const q = new URLSearchParams({
    action: "query", list: "recentchanges", format: "json", rcnamespace: "0", rclimit: "500",
    rctype: "edit|new", rcprop: "title|timestamp|user", rcstart: iso(ctx.until), rcend: iso(ctx.since),
  });
  const base = `https://${src.wiki}.fandom.com`;
  const data = await get(ctx, `${base}/api.php?${q}`, "json");
  const changes = data?.query?.recentchanges || [];
  const page = (t) => `${base}/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`;
  const items = changes.filter((c) => c.type === "new").slice(0, 5).map((c) => ({
    kind: "wiki", title: `New wiki page: ${c.title}`, url: page(c.title), date: c.timestamp, source: "Fandom wiki", by: c.user,
  }));
  const counts = new Map();
  for (const c of changes) counts.set(c.title, (counts.get(c.title) || 0) + 1);
  if (changes.length) {
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
    items.push({
      kind: "wiki",
      title: `${changes.length} wiki edit${changes.length === 1 ? "" : "s"} on ${counts.size} page${counts.size === 1 ? "" : "s"}`,
      url: `${base}/wiki/Special:RecentChanges`,
      date: changes[0].timestamp,
      source: "Fandom wiki",
      text: `Busiest: ${top.join(", ")}`,
      links: top.map((t) => ({ title: t, url: page(t) })),
    });
  }
  return items;
}

// ---------------------------------------------------------------- Minecraft

export async function minecraft(src, ctx) {
  const edition = src.edition === "bedrock" ? "bedrock" : "java";
  const data = await get(ctx, `https://launchercontent.mojang.com/v2/${edition}PatchNotes.json`, "json");
  const label = edition === "java" ? "Java_Edition" : "Bedrock_Edition";
  return (data.entries || [])
    .filter((e) => inWindow(e.date, ctx))
    .map((e) => ({
      kind: "update",
      title: e.title,
      url: `https://minecraft.wiki/w/${label}_${encodeURIComponent(e.version)}`,
      date: e.date,
      source: edition === "java" ? "Mojang · Java" : "Mojang · Bedrock",
      thumb: e.image?.url ? `https://launchercontent.mojang.com${e.image.url}` : undefined,
      text: plain(e.shortText, 200),
    }));
}

/** The news shown in the Minecraft launcher: official articles. Dated by day only. */
export async function minecraftNews(src, ctx) {
  const data = await get(ctx, "https://launchercontent.mojang.com/v2/news.json", "json");
  // A day-only date means midnight UTC, so look back one more day.
  const after = ctx.since - 86_400_000;
  return (data.entries || [])
    .filter((e) => { const t = Date.parse(e.date); return t >= after && t < ctx.until; })
    .map((e) => {
      const img = e.newsPageImage?.url || e.playPageImage?.url;
      return {
        kind: "news",
        title: e.title,
        url: String(e.readMoreLink || "https://www.minecraft.net/").replace(/[?&]OCID=Launcher/, ""),
        date: new Date(Date.parse(e.date) + 12 * 3_600_000).toISOString(),
        source: "Minecraft.net",
        thumb: img ? `https://launchercontent.mojang.com${img}` : undefined,
        text: plain(e.text, 200),
      };
    });
}

export const READERS = {
  steam, youtube, "youtube-search": youtubeSearch, news, reddit, roblox, fandom, minecraft, "minecraft-news": minecraftNews,
};
