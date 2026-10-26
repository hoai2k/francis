import { test } from "node:test";
import assert from "node:assert/strict";
import { blocks, field, plain, news, youtube, steam, roblox, fandom, minecraftNews, reddit } from "../src/sources.js";
import { tidyItems, windowStart, buildSection, FIRST_WINDOW, MAX_WINDOW } from "../src/digest.js";
import { tidy, summaryMessages } from "../src/summary.js";
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
  assert.deepEqual(start.body.interests.map((i) => [i.id, i.done]), IDS.map((id) => [id, false]));
  assert.ok(start.body.interests[0].sources.includes("Steam"));
  assert.equal(start.body.interests[0].loading, "Digging up fossils…");
  assert.equal(start.body.since, new Date(NOW - FIRST_WINDOW).toISOString());

  assert.deepEqual((await finishBuild(env, "2026-10-26")).body.missing, IDS); // nothing gathered yet

  const pk = await buildOne(env, "2026-10-26", "prehistoric-kingdom", fetchImpl);
  assert.equal(pk.body.items[0].title, "Update 2");
  const fetched = calls.length;
  assert.deepEqual((await buildOne(env, "2026-10-26", "prehistoric-kingdom", fetchImpl)).body, JSON.parse(JSON.stringify(pk.body)));
  assert.equal(calls.length, fetched); // a section is gathered once; repeats are served from KV
  assert.equal((await startBuild(env, "2026-10-26", NOW + HOUR)).body.interests[0].done, true);
  assert.equal((await buildOne(env, "2026-10-26", "nope", fetchImpl)).status, 404);

  for (const id of IDS.slice(1)) await buildOne(env, "2026-10-26", id, fetchImpl);
  const d1 = (await finishBuild(env, "2026-10-26")).body;
  assert.equal(d1.day, "2026-10-26");
  assert.equal(d1.until, new Date(NOW).toISOString()); // the window closed when the build started
  assert.deepEqual(d1.interests.map((s) => s.id), IDS);
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
