import { test } from "node:test";
import assert from "node:assert/strict";
import { blocks, field, plain, news, youtube, steam, roblox, fandom, minecraftNews, reddit } from "../src/sources.js";
import { tidyItems, windowStart, buildSection, FIRST_WINDOW, MAX_WINDOW } from "../src/digest.js";
import { tidy, summaryMessages } from "../src/summary.js";
import { agoMs, viewCount, searchResults, choose, pickVideo } from "../src/feature.js";
import worker, { startBuild, buildOne, finishBuild, forgetNewest, recap, validDay } from "../src/index.js";

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
  const interest = { id: "x", name: "X", icon: "x", accent: "#fff", sources: [{ type: "reddit", sub: "x" }, { type: "steam", appid: 1 }] };
  const data = { appnews: { newsitems: [{ title: "Hi", url: "https://s/1", date: (NOW - HOUR) / 1000, contents: "" }] } };
  const sec = await buildSection(interest, win, { fetch: fakeFetch({ "https://api.steampowered.com/": data }), env: {}, state: memState() });
  assert.equal(sec.items.length, 1);
  assert.deepEqual(sec.problems, [{ source: "r/x", error: "www.reddit.com answered 404" }]);
  assert.equal(sec.summary, null); // recaps are written only on request
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

test("the window starts at the previous digest, never more than a week back", () => {
  assert.equal(windowStart(null, NOW), NOW - FIRST_WINDOW);
  assert.equal(windowStart({ until: new Date(NOW - 24 * HOUR).toISOString() }, NOW), NOW - 24 * HOUR);
  assert.equal(windowStart({ until: new Date(NOW - 300 * HOUR).toISOString() }, NOW), NOW - MAX_WINDOW);
  assert.equal(MAX_WINDOW, 7 * 24 * HOUR);
});

test("recap: the model sees the items, and its answer is tidied", () => {
  const msgs = summaryMessages({ name: "Minecraft" }, [{ kind: "update", title: "Snapshot 5", text: "Ice balls", source: "Mojang" }]);
  assert.match(msgs[1].content, /Topic: Minecraft\n[^]*\[update\] Snapshot 5 \(Ice balls\), from Mojang/);
  assert.equal(tidy("Here's a recap: \"Snapshot 5 adds ice balls.\""), "Snapshot 5 adds ice balls.");
});

const IDS = ["prehistoric-kingdom", "minecraft", "planet-zoo-2", "jujutsu-shenanigans"];
const JOBS = [...IDS, "video:jujutsu-shenanigans"];

/** What the page does on the first visit of a day: start, every section, finish. */
async function visit(env, day, now, fetchImpl) {
  const start = await startBuild(env, day, now);
  if (start.body.status === "done") return start.body.digest;
  for (const i of start.body.interests) await buildOne(env, day, i.id, fetchImpl);
  return (await finishBuild(env, day)).body;
}

function steamWorld(at) {
  const data = { appnews: { newsitems: [{ title: "Update 2", url: "https://s/1", date: at / 1000, contents: "" }] } };
  const calls = [];
  return { data, calls, fetchImpl: fakeFetch({ "https://api.steampowered.com/": data }, calls) };
}

test("the first visit of a day builds it section by section; later visits get the stored digest", async () => {
  const kv = fakeKV();
  const env = { DIGEST: kv, AI: { run: async () => { throw new Error("building must not call the model"); } } };
  const { calls, fetchImpl } = steamWorld(NOW - HOUR);

  const start = await startBuild(env, "2026-10-26", NOW);
  assert.equal(start.body.status, "building");
  assert.deepEqual(start.body.interests.map((i) => [i.id, i.done]), JOBS.map((id) => [id, false]));
  assert.equal(start.body.interests[4].name, "JJS video of the day");
  assert.ok(start.body.interests[0].sources.includes("Steam"));
  assert.equal(start.body.interests[0].loading, "Digging up fossils…");
  assert.equal(start.body.since, new Date(NOW - FIRST_WINDOW).toISOString());

  assert.deepEqual((await finishBuild(env, "2026-10-26")).body.missing, JOBS); // nothing gathered yet

  const pk = await buildOne(env, "2026-10-26", "prehistoric-kingdom", fetchImpl);
  assert.equal(pk.body.items[0].title, "Update 2");
  const fetched = calls.length;
  assert.deepEqual((await buildOne(env, "2026-10-26", "prehistoric-kingdom", fetchImpl)).body, JSON.parse(JSON.stringify(pk.body)));
  assert.equal(calls.length, fetched); // a section is gathered once; repeats are served from KV
  assert.equal((await startBuild(env, "2026-10-26", NOW + HOUR)).body.interests[0].done, true);
  assert.equal((await buildOne(env, "2026-10-26", "nope", fetchImpl)).status, 404);

  for (const id of JOBS.slice(1)) await buildOne(env, "2026-10-26", id, fetchImpl);
  const d1 = (await finishBuild(env, "2026-10-26")).body;
  assert.equal(d1.day, "2026-10-26");
  assert.equal(d1.until, new Date(NOW).toISOString()); // the window closed when the build started
  assert.deepEqual(d1.interests.map((s) => s.id), IDS);
  assert.deepEqual(d1.featured, []); // no YouTube in this world: no video of the day
  assert.deepEqual(JSON.parse(kv.m.get("days")), ["2026-10-26"]);
  assert.ok(![...kv.m.keys()].some((k) => k.startsWith("plan:") || k.startsWith("section:")));

  const again = await startBuild(env, "2026-10-26", NOW + 5 * HOUR);
  assert.equal(again.body.status, "done");
  assert.equal(again.body.digest.built, d1.built);

  // Three quiet days later the next visit picks up where the last digest stopped.
  const d2 = await visit(env, "2026-10-29", NOW + 72 * HOUR, fetchImpl);
  assert.equal(d2.since, d1.until);
  assert.deepEqual(JSON.parse(kv.m.get("days")), ["2026-10-29", "2026-10-26"]);
  assert.equal((await startBuild(env, "2026-10-28", NOW + 72 * HOUR)).status, 409); // never behind the newest
});

test("recaps are written only on request, once per digest", async () => {
  const kv = fakeKV();
  let calls = 0;
  let failing = true;
  const env = {
    DIGEST: kv,
    AI: { run: async (model, { messages }) => {
      calls++;
      if (failing) throw new Error("model down");
      return { response: `"Recap of ${messages[1].content.split("\n")[0]}"` };
    } },
  };
  const post = () => worker.fetch(new Request("https://francis-digest.hoai2k.workers.dev/recap", { method: "POST" }), env);
  const world = steamWorld(NOW - HOUR);

  assert.equal((await post()).status, 404); // nothing to recap yet
  await visit(env, "2026-10-26", NOW, world.fetchImpl);
  assert.equal(calls, 0);

  // Steam answers for the two interests with a Steam source: two model calls.
  assert.equal((await post()).status, 502); // every recap failed: the day stays open
  assert.equal(calls, 2);
  failing = false;
  const d = await (await post()).json();
  assert.equal(calls, 4);
  assert.ok(d.recapped);
  assert.equal(d.interests.find((s) => s.id === "prehistoric-kingdom").summary, "Recap of Topic: Prehistoric Kingdom");
  assert.equal(d.interests.find((s) => s.id === "minecraft").summary, null); // nothing new, no call
  assert.equal((await (await post()).json()).recapped, d.recapped);
  assert.equal(calls, 4); // asking again reuses the saved recaps

  // The next day's digest starts without recaps and can have its own, once.
  world.data.appnews.newsitems[0].date = (NOW + 23 * HOUR) / 1000;
  const next = await visit(env, "2026-10-27", NOW + 24 * HOUR, world.fetchImpl);
  assert.equal(next.recapped, undefined);
  await recap(env);
  await recap(env);
  assert.equal(calls, 6);
  assert.equal(JSON.parse(kv.m.get("digest:2026-10-26")).recapped, d.recapped); // the old day is untouched
});

test("refresh forgets the newest digest, so the next visit gathers it again", async () => {
  const kv = fakeKV();
  const env = { DIGEST: kv };
  const { calls, fetchImpl } = steamWorld(NOW - HOUR);
  const d1 = await visit(env, "2026-10-26", NOW, fetchImpl);
  const fetched = calls.length;
  assert.deepEqual(await forgetNewest(env), { cleared: "2026-10-26" });
  assert.equal((await startBuild(env, "2026-10-26", NOW + HOUR)).body.status, "building");
  const d2 = await visit(env, "2026-10-26", NOW + HOUR, fetchImpl);
  assert.ok(calls.length > fetched);
  assert.equal(d2.since, d1.since);
  assert.equal(d2.until, new Date(NOW + HOUR).toISOString());
});

test("routes: reads, build requests for plausible days only, and a guarded refresh", async () => {
  const kv = fakeKV();
  kv.m.set("days", JSON.stringify(["2026-10-26"]));
  kv.m.set("digest:2026-10-26", JSON.stringify({ day: "2026-10-26", interests: [] }));
  const env = { DIGEST: kv, REFRESH_TOKEN: "s3cret" };
  const call = (path, init) => worker.fetch(new Request(`https://francis-digest.hoai2k.workers.dev${path}`, init), env);
  const post = (path, body) => call(path, { method: "POST", body: JSON.stringify(body) });

  assert.deepEqual(await (await call("/days")).json(), ["2026-10-26"]);
  const latest = await call("/digest/latest");
  assert.equal((await latest.json()).day, "2026-10-26");
  assert.equal(latest.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(latest.headers.get("Cache-Control"), "no-store");
  assert.equal((await call("/digest/2026-10-25")).status, 404);

  assert.equal(validDay("2026-10-27", NOW), "2026-10-27");
  assert.equal(validDay("2026-10-25", NOW), "2026-10-25");
  assert.equal(validDay("2026-10-29", NOW), null);
  assert.equal(validDay("26-10-2026", NOW), null);
  assert.equal((await post("/build", { day: "2001-01-01" })).status, 400);
  const today = new Date().toISOString().slice(0, 10);
  const started = await (await post("/build", { day: today })).json();
  assert.ok(["building", "done"].includes(started.status) || started.error === "newer_digest_exists");

  assert.equal((await call("/recap")).status, 405);
  assert.equal((await post("/refresh", {})).status, 401);
  const ok = await call("/refresh", { method: "POST", headers: { Authorization: "Bearer s3cret" } });
  assert.deepEqual(await ok.json(), { cleared: "2026-10-26" });
});

/** A YouTube search page with the given videos, shaped like the real one. */
function searchPage(videos) {
  const r = (v) => `{"videoRenderer":{"videoId":"${v.id}","thumbnail":{},"title":{"runs":[{"text":${JSON.stringify(v.title)}}]},`
    + `"longBylineText":{},"publishedTimeText":{"simpleText":"${v.ago}"},"lengthText":{"accessibility":{"accessibilityData":{"label":"8 minutes"}},"simpleText":"8:52"},`
    + `"viewCountText":{"simpleText":"${v.views}"},"ownerText":{"runs":[{"text":${JSON.stringify(v.by)}}]}}}`;
  return `<html><script>var ytInitialData = {"contents":[${videos.map(r).join(",")}]};</script></html>`;
}

test("video of the day: YouTube search pages are read without parsing them whole", () => {
  assert.equal(agoMs("12h ago"), 12 * HOUR);
  assert.equal(agoMs("19 min ago"), 19 * 60_000);
  assert.equal(agoMs("2 days ago"), 48 * HOUR);
  assert.equal(agoMs("Streamed 3 hours ago"), 3 * HOUR);
  assert.equal(agoMs("1 month ago"), 30 * 24 * HOUR);
  assert.ok(Number.isNaN(agoMs("")));
  assert.equal(viewCount("88,404 views"), 88404);
  assert.equal(viewCount("1.2M views"), 1_200_000);
  assert.equal(viewCount("No views"), 0);
  const vids = searchResults(searchPage([
    { id: "aaaaaaaaaaa", title: "Toji \"guide\" in JJS", ago: "5h ago", views: "1,000 views", by: "A" },
    { id: "bbbbbbbbbbb", title: "Live", ago: "", views: "", by: "B" }, // a live stream: no upload time
  ]), NOW);
  assert.deepEqual(vids, [{ id: "aaaaaaaaaaa", title: "Toji \"guide\" in JJS", by: "A", views: 1000, length: "8:52", date: new Date(NOW - 5 * HOUR).toISOString() }]);
});

test("video of the day: newest window first, most views, on topic, never repeated", () => {
  const v = (id, title, hoursAgo, views) => ({ id, title, views, date: new Date(NOW - hoursAgo * HOUR).toISOString() });
  const cands = [
    v("old-hit", "JJS montage", 60, 900_000),
    v("new-top", "Jujutsu Shenanigans Toji", 5, 50_000),
    v("new-low", "jjs tips", 3, 2_000),
    v("off-top", "Minecraft speedrun", 2, 5_000_000),
    v("ancient", "JJS 2024", 24 * 30, 9_000_000),
  ];
  const opts = { since: NOW - 24 * HOUR, until: NOW, match: ["jujutsu shenanigans", "jjs"] };
  assert.equal(choose(cands, opts).id, "new-top");
  assert.equal(choose(cands, { ...opts, skip: ["new-top"] }).id, "new-low");
  assert.equal(choose(cands, { ...opts, skip: ["new-top", "new-low"] }).id, "old-hit"); // nothing new: the past week
  assert.equal(choose([cands[3], cands[4]], opts), null);
});

test("video of the day: the same pick for a rebuilt day, a different one the next day", async () => {
  const page = searchPage([
    { id: "aaaaaaaaaaa", title: "JJS Toji", ago: "5h ago", views: "50,000 views", by: "A" },
    { id: "bbbbbbbbbbb", title: "Jujutsu Shenanigans tips", ago: "3h ago", views: "2,000 views", by: "B" },
  ]);
  const calls = [];
  const fetchImpl = fakeFetch({ "https://www.youtube.com/results": page }, calls);
  const interest = { id: "jjs", name: "JJS", icon: "👊", accent: "#f00", feature: { title: "JJS video of the day", query: "jujutsu shenanigans", match: ["jjs", "jujutsu shenanigans"] } };
  const state = memState();
  const ctx = { since: NOW - 24 * HOUR, until: NOW, fetch: fetchImpl, env: {}, state };
  const a = await pickVideo(interest, ctx, "2026-10-26");
  assert.equal(a.video.id, "aaaaaaaaaaa");
  assert.equal(a.video.url, "https://www.youtube.com/watch?v=aaaaaaaaaaa");
  assert.equal(a.video.views, 50000);
  assert.equal(calls.length, 2); // today's uploads and this week's
  assert.equal((await pickVideo(interest, ctx, "2026-10-26")).video.id, "aaaaaaaaaaa");
  assert.equal((await pickVideo(interest, ctx, "2026-10-27")).video.id, "bbbbbbbbbbb");
  const blocked = await pickVideo(interest, { ...ctx, fetch: fakeFetch({}) }, "2026-10-28");
  assert.equal(blocked.video, null);
  assert.equal(blocked.problems[0].error, "YouTube search answered 404");
});

test("the day's build carries the video of the day into the digest", async () => {
  const kv = fakeKV();
  const env = { DIGEST: kv };
  const page = searchPage([{ id: "ccccccccccc", title: "JJS Halloween update", ago: "2h ago", views: "7,000 views", by: "C" }]);
  const fetchImpl = fakeFetch({ "https://www.youtube.com/results": page });
  const d = await visit(env, "2026-10-26", NOW, fetchImpl);
  assert.equal(d.featured.length, 1);
  assert.equal(d.featured[0].interest, "jujutsu-shenanigans");
  assert.equal(d.featured[0].title, "JJS video of the day");
  assert.equal(d.featured[0].video.id, "ccccccccccc");
  assert.ok(!d.interests.some((s) => s.kind === "feature"));
});
