import { test } from "node:test";
import assert from "node:assert/strict";
import { blocks, field, plain, news, youtube, steam, roblox, fandom, minecraftNews, reddit } from "../src/sources.js";
import { tidyItems, windowStart, buildDigest, FIRST_WINDOW, MAX_WINDOW } from "../src/digest.js";
import { tidy, summaryMessages } from "../src/summary.js";
import worker, { runDigest } from "../src/index.js";

const NOW = Date.parse("2026-10-26T10:07:00Z");
const HOUR = 3_600_000;
const win = { since: NOW - 24 * HOUR, until: NOW };
const memState = (m = {}) => ({ m, get: async (k) => m[k], put: async (k, v) => { m[k] = v; } });

/** A fetch that answers from a map of URL prefix -> body (string or object). */
function fakeFetch(routes, calls = []) {
  return async (url) => {
    calls.push(url);
    const hit = Object.keys(routes).find((p) => url.startsWith(p));
    if (!hit) return new Response("nope", { status: 404 });
    const body = routes[hit];
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200 });
  };
}

function fakeKV() {
  const m = new Map();
  return {
    m,
    get: async (k, type) => (m.has(k) ? (type === "json" ? JSON.parse(m.get(k)) : m.get(k)) : null),
    put: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
  };
}

test("feed helpers read RSS and Atom blocks, fields and attributes", () => {
  const xml = `<feed><entry><title>A &amp; B</title><link rel="alternate" href="https://x/1"/></entry>
    <entry><title><![CDATA[C <i>D</i>]]></title></entry><entryish>no</entryish></feed>`;
  const bs = blocks(xml, "entry");
  assert.equal(bs.length, 2);
  assert.equal(field(bs[0], "title"), "A & B");
  assert.equal(field(bs[0], "link", "href"), "https://x/1");
  assert.equal(plain(field(bs[1], "title")), "C D");
  assert.equal(plain("[h1]Patch[/h1] notes &amp; fixes"), "Patch notes & fixes");
  assert.ok(plain("word ".repeat(100), 30).length <= 30);
});

test("Google News keeps only headlines that name the topic, inside the window", async () => {
  const item = (t, date, site) => `<item><title>${t} - ${site}</title><link>https://n/${encodeURIComponent(t)}</link><pubDate>${new Date(date).toUTCString()}</pubDate><source url="https://s">${site}</source></item>`;
  const rss = `<rss><channel>${[
    item("Planet Zoo 2 update adds penguins", NOW - HOUR, "GameRant"),
    item("UK charts: Call of Duty", NOW - HOUR, "VGC"),
    item("Planet Zoo 2 review", NOW - 50 * HOUR, "IGN"),
  ].join("")}</channel></rss>`;
  const items = await news({ query: "\"Planet Zoo 2\"" }, { ...win, fetch: fakeFetch({ "https://news.google.com/": rss }) });
  assert.deepEqual(items.map((i) => [i.title, i.source]), [["Planet Zoo 2 update adds penguins", "GameRant"]]);
});

test("YouTube channel feed becomes video items with thumbnails", async () => {
  const atom = `<feed><entry><yt:videoId>abc</yt:videoId><title>New dino!</title><published>${new Date(NOW - 2 * HOUR).toISOString()}</published><author><name>PK</name></author><media:group><media:description>Hello</media:description></media:group></entry>
    <entry><yt:videoId>old</yt:videoId><title>Old</title><published>2020-01-01T00:00:00Z</published></entry></feed>`;
  const items = await youtube({ channel: "UC1" }, { ...win, fetch: fakeFetch({ "https://www.youtube.com/": atom }) });
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://www.youtube.com/watch?v=abc");
  assert.equal(items[0].thumb, "https://i.ytimg.com/vi/abc/mqdefault.jpg");
  assert.equal(items[0].by, "PK");
});

test("Steam announcements: updates are marked, images found, old news dropped", async () => {
  const data = { appnews: { newsitems: [
    { title: "Update 1.0.7", url: "https://s/1", date: (NOW - HOUR) / 1000, contents: "[img]{STEAM_CLAN_IMAGE}/123/abc.png[/img] Fixes" },
    { title: "Dev Diary", url: "https://s/2", date: (NOW - 2 * HOUR) / 1000, contents: "Hi" },
    { title: "Ancient", url: "https://s/3", date: (NOW - 99 * HOUR) / 1000, contents: "" },
  ] } };
  const items = await steam({ appid: 1 }, { ...win, fetch: fakeFetch({ "https://api.steampowered.com/": data }) });
  assert.deepEqual(items.map((i) => i.kind), ["update", "news"]);
  assert.equal(items[0].thumb, "https://clan.akamai.steamstatic.com/images/123/abc.png");
  assert.equal(items[0].text, "Fixes");
});

test("Roblox: an update in the window is reported on every rebuild, and a rename is told", async () => {
  const game = (name, updated) => ({ data: [{ name, updated: new Date(updated).toISOString(), rootPlaceId: 9, playing: 1000, visits: 5 }] });
  const state = memState();
  const icons = { "https://thumbnails.roblox.com/": { data: [{ imageUrl: "https://icon" }] } };
  const f1 = fakeFetch({ "https://games.roblox.com/": game("[OLD] JJS", NOW - 90 * HOUR), ...icons });
  assert.deepEqual(await roblox({ universe: 1 }, { ...win, fetch: f1, state }), []);
  const f2 = fakeFetch({ "https://games.roblox.com/": game("[HIRED KILLER] JJS", NOW - HOUR), ...icons });
  const day = { since: NOW, until: NOW + 24 * HOUR };
  // The update happened before this window opened, so a day later it is old news.
  assert.deepEqual(await roblox({ universe: 1 }, { ...day, fetch: f2, state }), []);
  const f3 = fakeFetch({ "https://games.roblox.com/": game("[HIRED KILLER] JJS", NOW + HOUR), ...icons });
  const [a] = await roblox({ universe: 1 }, { ...day, fetch: f3, state });
  const [b] = await roblox({ universe: 1 }, { ...day, fetch: f3, state }); // a rebuild the same day
  assert.equal(a.title, "Game updated: HIRED KILLER");
  assert.equal(a.thumb, "https://icon");
  assert.match(a.text, /Renamed from “\[OLD\] JJS”/);
  assert.deepEqual(b, a);
});

test("Fandom: new pages, plus one item for the busiest pages", async () => {
  const rc = { query: { recentchanges: [
    { type: "edit", title: "Skins", timestamp: "2026-10-26T09:00:00Z", user: "a" },
    { type: "edit", title: "Skins", timestamp: "2026-10-26T08:00:00Z", user: "b" },
    { type: "new", title: "Hired Killer", timestamp: "2026-10-26T07:00:00Z", user: "c" },
  ] } };
  const items = await fandom({ wiki: "jjs" }, { ...win, fetch: fakeFetch({ "https://jjs.fandom.com/": rc }) });
  assert.equal(items[0].title, "New wiki page: Hired Killer");
  assert.equal(items[0].url, "https://jjs.fandom.com/wiki/Hired_Killer");
  assert.equal(items[1].title, "3 wiki edits on 2 pages");
  assert.equal(items[1].text, "Busiest: Skins, Hired Killer");
});

test("Minecraft launcher news: day-dated articles, launcher tracking removed", async () => {
  const data = { entries: [
    { title: "Spooky Spotlight", date: "2026-10-26", text: "Winners", readMoreLink: "https://www.minecraft.net/article/spooky?OCID=Launcher", newsPageImage: { url: "/v2/images/s.jpg" } },
    { title: "Old", date: "2026-10-01", text: "", readMoreLink: "https://www.minecraft.net/article/old" },
  ] };
  const items = await minecraftNews({}, { ...win, fetch: fakeFetch({ "https://launchercontent.mojang.com/": data }) });
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://www.minecraft.net/article/spooky");
  assert.equal(items[0].thumb, "https://launchercontent.mojang.com/v2/images/s.jpg");
});

test("a source that fails is listed as a problem; the rest still arrive", async () => {
  const interests = [{ id: "x", name: "X", icon: "x", accent: "#fff", sources: [{ type: "reddit", sub: "x" }, { type: "steam", appid: 1 }] }];
  const data = { appnews: { newsitems: [{ title: "Hi", url: "https://s/1", date: (NOW - HOUR) / 1000, contents: "" }] } };
  const d = await buildDigest(win, { fetch: fakeFetch({ "https://api.steampowered.com/": data }), env: {}, state: memState(), interests });
  assert.equal(d.day, "2026-10-26");
  assert.equal(d.interests[0].items.length, 1);
  assert.deepEqual(d.interests[0].problems, [{ source: "r/x", error: "www.reddit.com answered 404" }]);
  assert.equal(d.interests[0].summary, null); // no AI binding: no recap
  await assert.rejects(reddit({ sub: "x" }, { ...win, fetch: fakeFetch({}) }));
});

test("items: repeated links and repeated headlines are dropped, newest first", () => {
  const items = tidyItems([
    { kind: "news", title: "JJS codes (October 2026)", url: "https://a/1", date: "2026-10-26T01:00:00Z" },
    { kind: "news", title: "JJS Codes — October 2026", url: "https://b/1", date: "2026-10-26T02:00:00Z" },
    { kind: "video", title: "Vid", url: "https://y/1?utm_source=x", date: "2026-10-26T03:00:00Z" },
    { kind: "video", title: "Vid", url: "https://y/1", date: "2026-10-26T03:00:00Z" },
  ]);
  assert.deepEqual(items.map((i) => i.url), ["https://y/1?utm_source=x", "https://a/1"]);
});

test("the window starts at the previous digest, never more than three days back", () => {
  assert.equal(windowStart(null, NOW), NOW - FIRST_WINDOW);
  assert.equal(windowStart({ until: new Date(NOW - 24 * HOUR).toISOString() }, NOW), NOW - 24 * HOUR);
  assert.equal(windowStart({ until: new Date(NOW - 200 * HOUR).toISOString() }, NOW), NOW - MAX_WINDOW);
});

test("recap: the model sees the items, and its answer is tidied", () => {
  const msgs = summaryMessages({ name: "Minecraft" }, [{ kind: "update", title: "Snapshot 5", text: "Ice balls", source: "Mojang" }]);
  assert.match(msgs[1].content, /Topic: Minecraft\n[^]*\[update\] Snapshot 5 \(Ice balls\), from Mojang/);
  assert.equal(tidy("Here's a recap: \"Snapshot 5 adds ice balls.\""), "Snapshot 5 adds ice balls.");
});

test("runDigest stores the day, keeps a rebuild's window, and builds sections through SELF", async () => {
  const kv = fakeKV();
  const steamData = { appnews: { newsitems: [{ title: "Update 2", url: "https://s/1", date: (NOW - HOUR) / 1000, contents: "" }] } };
  const fetchImpl = fakeFetch({ "https://api.steampowered.com/": steamData });
  const sections = [];
  const env = {
    DIGEST: kv,
    AI: { run: async (model, { messages }) => ({ response: `"Recap of ${messages[1].content.split("\n")[0]}"` }) },
  };
  // SELF hands the section request back to the Worker, as the binding does.
  env.SELF = { fetch: async (url, init) => { sections.push(url); return worker.fetch(new Request(url, init), env, { waitUntil() {} }); } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl; // the section route reads with the global fetch
  try {
    const d1 = await runDigest(env, NOW, fetchImpl);
    assert.equal(sections.length, 4);
    assert.ok(sections.every((u) => u === "https://internal/section"));
    assert.deepEqual(JSON.parse(kv.m.get("days")), ["2026-10-26"]);
    const pk = d1.interests.find((s) => s.id === "prehistoric-kingdom");
    assert.equal(pk.items[0].title, "Update 2");
    assert.equal(pk.summary, "Recap of Topic: Prehistoric Kingdom");
    const d2 = await runDigest(env, NOW + 2 * HOUR, fetchImpl);
    assert.equal(d2.since, d1.since);
    const d3 = await runDigest(env, NOW + 24 * HOUR, fetchImpl);
    assert.equal(d3.since, d2.until);
    assert.deepEqual(JSON.parse(kv.m.get("days")), ["2026-10-27", "2026-10-26"]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("routes: public reads, a guarded refresh, and no public section builds", async () => {
  const kv = fakeKV();
  kv.m.set("days", JSON.stringify(["2026-10-26"]));
  kv.m.set("digest:2026-10-26", JSON.stringify({ day: "2026-10-26", until: new Date().toISOString(), interests: [] }));
  const env = { DIGEST: kv, REFRESH_TOKEN: "s3cret" };
  const call = (path, init) => worker.fetch(new Request(`https://francis-digest.hoai2k.workers.dev${path}`, init), env, { waitUntil() {} });
  assert.deepEqual(await (await call("/days")).json(), ["2026-10-26"]);
  const latest = await call("/digest/latest");
  assert.equal((await latest.json()).day, "2026-10-26");
  assert.equal(latest.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal((await call("/digest/2026-10-25")).status, 404);
  assert.equal((await call("/refresh", { method: "POST" })).status, 401);
  assert.equal((await call("/section", { method: "POST", body: "{}" })).status, 405);
});
