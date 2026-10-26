// Daily Digest page: reads the day's digest from the francis-digest Worker
// (digest/server) and lays it out per interest. The first visit of a day
// builds that day's digest, one interest at a time, with a progress screen.
//   ?api=<url>    read from another copy of the Worker (e.g. http://localhost:8787)
//   ?data=<file>  show a digest JSON file instead (from server/tools/preview.mjs)
//   #YYYY-MM-DD   open that day

const params = new URLSearchParams(location.search);
const API = (params.get("api") || "https://francis-digest.hoai2k.workers.dev").replace(/\/+$/, "");
const DATA = params.get("data");

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

const KIND_ICON = { update: "⚡", news: "📰", post: "💬", wiki: "📚", video: "▶" };
const QUIET = [
  "Nothing new today. The fossils are resting.",
  "All quiet. Even the creepers took a day off.",
  "No news today: the animals are asleep.",
  "Nothing dropped today. Cursed energy is recharging.",
  "A quiet day. Check back tomorrow!",
];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "#");

let days = [];
let digest = null;
let filter = store.get("digest:filter") || "all";
// Items newer than the previous visit get a NEW badge (only on the newest day).
const lastVisit = Number(store.get("digest:lastVisit")) || 0;
store.set("digest:lastVisit", String(Date.now()));

function dayLabel(day) {
  const d = new Date(`${day}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).toUpperCase();
}

function ago(iso, until) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const h = Math.max(0, (Date.parse(until) - t) / 3_600_000);
  if (h < 1) return "just before the digest";
  if (h < 24) return `${Math.round(h)}h earlier`;
  return new Date(t).toLocaleDateString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(out.error || `HTTP ${res.status}`), { status: res.status, body: out });
  return out;
}

/** Today in the visitor's time zone: a new digest starts at their midnight. */
function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(day) {
  $("status").innerHTML = '<span class="loading">LOADING TODAY’S DROP…</span>';
  try {
    if (DATA) {
      digest = await getJson(DATA);
      days = [digest.day];
    } else if (day) {
      digest = await getJson(`${API}/digest/${day}`);
    } else {
      let start = null;
      try {
        start = await postJson("/build", { day: localDay() });
      } catch (e) {
        if (e.body?.error !== "newer_digest_exists") throw e; // a clock ahead of this one built it
      }
      if (start?.status === "building") digest = await gather(start);
      else digest = start?.digest || await getJson(`${API}/digest/latest`);
    }
    if (!DATA) days = await getJson(`${API}/days`).catch(() => [digest.day]);
    if (!days.includes(digest.day)) days = [digest.day, ...days];
    $("status").innerHTML = "";
    render();
  } catch (e) {
    digest = null;
    $("sections").innerHTML = "";
    $("chips").innerHTML = "";
    $("ticker").hidden = true;
    $("recapbar").hidden = true;
    $("status").innerHTML = e.gather
      ? '<span class="big">🧩</span><p><strong>Some games couldn’t be gathered.</strong></p><p>The ones that worked are saved, so trying again only fetches the rest.</p><p><button class="retry" type="button" id="retry">TRY AGAIN</button></p>'
      : e.status === 404
        ? `<span class="big">📭</span><p><strong>No digest for ${esc(dayLabel(day))}.</strong></p><p><a href="#">Back to the newest</a></p>`
        : '<span class="big">📡</span><p><strong>Can’t reach the digest server.</strong></p><p>It may not be deployed yet, or the connection dropped. Try again in a minute.</p>';
    $("retry")?.addEventListener("click", () => load(day));
  }
  updateNav();
}

/**
 * The first visit of the day: gather each interest (saved on the server as
 * it finishes, so a reload or another visitor never repeats one), showing
 * progress, then put the digest together.
 */
async function gather(start) {
  $("sections").innerHTML = "";
  $("chips").innerHTML = "";
  $("ticker").hidden = true;
  $("recapbar").hidden = true;
  $("stats").innerHTML = '<li><b>…</b> GATHERING</li>';
  $("date").textContent = dayLabel(start.day);
  const since = new Date(start.since).toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" });
  $("status").innerHTML = `<div class="build">
    <h2>GATHERING TODAY’S DROP</h2>
    <p>First visit of the day, so the digest is being put together now: everything since <strong>${esc(since)}</strong>.</p>
    <div class="bar" aria-hidden="true"><i id="barfill"></i></div>
    <div class="pct" id="pct" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">0%</div>
    <ul class="steps">${start.interests.map((i) => `<li id="step-${esc(i.id)}" style="--accent:${esc(i.accent)}">
      <span class="ic" aria-hidden="true">${esc(i.icon)}</span>
      <div><b>${esc(i.name)}</b><span class="what">${esc(i.loading || "Looking around…")} <em>${esc(i.sources.join(" · "))}</em></span></div>
      <span class="st">WAITING</span></li>`).join("")}</ul>
  </div>`;

  let finished = 0;
  const total = start.interests.length;
  const progress = () => {
    const pct = Math.round((finished / total) * 100);
    $("barfill").style.width = `${Math.max(pct, 4)}%`;
    $("pct").textContent = `${pct}%`;
    $("pct").setAttribute("aria-valuenow", String(pct));
  };
  progress();

  const failed = [];
  await Promise.all(start.interests.map(async (i, n) => {
    const step = $(`step-${i.id}`);
    const mark = (cls, text) => { step.className = cls; step.querySelector(".st").textContent = text; };
    await wait(n * 350); // spread out, so sites like Reddit don't see a burst
    mark("busy", "LOOKING…");
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const section = await postJson("/build/section", { day: start.day, id: i.id });
        const warn = section.problems?.length ? " ⚠" : " ✓";
        if (section.kind === "feature") {
          mark(section.video ? "done" : "done warn", section.video ? "PICKED ✓" : "NONE TODAY");
        } else {
          const n = section.items.length;
          mark(section.problems?.length ? "done warn" : "done", `${n ? `${n} NEW` : "QUIET"}${warn}`);
        }
        finished++;
        progress();
        return;
      } catch {
        if (attempt === 0) await wait(1500);
      }
    }
    mark("fail", "FAILED ✕");
    failed.push(i.id);
  }));
  if (failed.length) throw Object.assign(new Error("gather failed"), { gather: true });
  $("pct").textContent = "PUTTING IT TOGETHER…";
  return postJson("/build/finish", { day: start.day });
}

function updateNav() {
  const day = digest?.day;
  const i = day ? days.indexOf(day) : -1;
  $("date").textContent = day ? dayLabel(day) : "—";
  $("prev").disabled = i < 0 || i >= days.length - 1;
  $("next").disabled = i <= 0;
}

function isNew(it) {
  return lastVisit && digest.day === days[0] && Date.parse(it.date) > lastVisit;
}

function newBadge(it) {
  return isNew(it) ? '<span class="new">NEW</span>' : "";
}

function render() {
  const all = digest.interests || [];
  const items = all.flatMap((s) => s.items);
  const count = (k) => items.filter((it) => it.kind === k).length;
  const stat = (n, one, many = `${one}S`) => `<li><b>${n}</b> ${n === 1 ? one : many}</li>`;
  $("stats").innerHTML = [
    stat(items.length, "DROP"),
    stat(count("update"), "UPDATE"),
    stat(count("video"), "VIDEO"),
    stat(count("news") + count("post"), "NEWS", "NEWS"),
  ].join("");

  const featured = digest.featured || [];
  const headlines = [
    ...featured.map((f) => `🎬 ${f.title}: ${f.video.title}`),
    ...all.flatMap((s) => s.items
    .filter((it) => it.kind === "update" || it.kind === "news")
    .slice(0, 4)
    .map((it) => `${s.icon} ${it.title}`)),
  ];
  $("ticker").hidden = !headlines.length;
  if (headlines.length) {
    const spans = headlines.map((h) => `<span>${esc(h.toUpperCase())}</span>`).join("");
    $("ticker").firstElementChild.innerHTML = spans + spans; // twice, for a seamless loop
  }

  if (filter !== "all" && !all.some((s) => s.id === filter)) filter = "all";
  $("chips").innerHTML = [
    `<button class="chip" type="button" data-id="all" aria-pressed="${filter === "all"}" style="--accent:var(--gold)"><span class="ic">✨</span>ALL <span class="n">${items.length}</span></button>`,
    ...all.map((s) => `<button class="chip" type="button" data-id="${esc(s.id)}" aria-pressed="${filter === s.id}" style="--accent:${esc(s.accent)}"><span class="ic">${esc(s.icon)}</span>${esc(s.name.toUpperCase())} <span class="n">${s.items.length}</span></button>`),
  ].join("");

  // Recaps cost AI credits, so they are written only when asked, once, for the newest day.
  $("recapbar").hidden = Boolean(DATA || digest.recapped || digest.day !== days[0] || !items.length);

  const shown = filter === "all" ? all : all.filter((s) => s.id === filter);
  const spotlight = featured.filter((f) => filter === "all" || f.interest === filter);
  $("sections").innerHTML = spotlight.map(nowShowing).join("") + shown.map(section).join("");
}

function section(s, index) {
  const updates = s.items.filter((it) => it.kind === "update");
  const videos = s.items.filter((it) => it.kind === "video");
  const rows = s.items.filter((it) => !["update", "video"].includes(it.kind));
  const parts = [];
  const counts = [
    updates.length && `${updates.length} update${updates.length > 1 ? "s" : ""}`,
    videos.length && `${videos.length} video${videos.length > 1 ? "s" : ""}`,
    rows.length && `${rows.length} news, post${rows.length > 1 ? "s" : ""} &amp; wiki`,
  ].filter(Boolean).join(" · ");

  if (s.summary) {
    parts.push(`<div class="recap"><span class="lbl">◆ AI RECAP</span><br>${esc(s.summary)}</div>`);
  } else if (!s.items.length) {
    parts.push(`<div class="recap quiet">${esc(QUIET[index % QUIET.length])}</div>`);
  }
  if (updates.length) {
    parts.push(`<div class="group"><h3>⚡ GAME UPDATES<span class="jp">更新</span></h3><div class="updates">${updates.map(updateCard).join("")}</div></div>`);
  }
  if (videos.length) {
    parts.push(`<div class="group"><h3>▶ VIDEOS<span class="jp">動画</span></h3><div class="videos">${videos.map(videoCard).join("")}</div></div>`);
  }
  if (rows.length) {
    parts.push(`<div class="group"><h3>📰 NEWS, POSTS &amp; WIKI<span class="jp">ニュース</span></h3><ul class="rows">${rows.map(row).join("")}</ul></div>`);
  }
  if (s.problems?.length) {
    parts.push(`<details class="problems"><summary>${s.problems.length} source${s.problems.length > 1 ? "s" : ""} couldn’t be read today</summary><ul>${s.problems.map((p) => `<li>${esc(p.source)}: ${esc(p.error)}</li>`).join("")}</ul></details>`);
  }
  return `<section class="interest" id="${esc(s.id)}" style="--accent:${esc(s.accent)}">
    <div class="ihead"><div class="badge-ic" aria-hidden="true">${esc(s.icon)}</div><div><h2>${esc(s.name.toUpperCase())}</h2><p class="counts">${counts || "nothing new"}</p></div></div>
    ${parts.join("")}
  </section>`;
}

/** The video of the day: a big thumbnail that becomes the player when pressed. */
function nowShowing(f) {
  const v = f.video;
  const id = /^[\w-]{11}$/.test(v.id) ? v.id : "";
  const meta = [
    v.by,
    v.views != null && `${Number(v.views).toLocaleString()} views`,
    v.length,
    ago(v.date, digest.until),
  ].filter(Boolean).map(esc).join(" · ");
  return `<section class="spotlight" style="--accent:${esc(f.accent)}">
    <h2 class="section-title"><span>NOW SHOWING</span><span class="jp">今日の動画</span></h2>
    <div class="feature">
      <button class="screen" type="button" data-video="${esc(id)}" aria-label="Play ${esc(v.title)}">
        ${img(v.thumb)}<span class="playbtn" aria-hidden="true">▶</span>
      </button>
      <div class="copy">
        <span class="badge">${esc(f.icon)} ${esc(f.title.toUpperCase())}</span>
        <h3><a href="${esc(safeUrl(v.url))}" target="_blank" rel="noopener">${esc(v.title)}</a></h3>
        <p class="meta">${meta}</p>
        <p class="why">The most-watched new ${esc(f.name)} video since the last digest.</p>
      </div>
    </div>
  </section>`;
}

// Pressing the thumbnail swaps in YouTube's player (privacy-enhanced mode), so
// nothing from YouTube loads until someone wants to watch.
$("sections").addEventListener("click", (e) => {
  const b = e.target.closest(".screen[data-video]");
  if (!b || !b.dataset.video) return;
  const frame = document.createElement("iframe");
  frame.src = `https://www.youtube-nocookie.com/embed/${b.dataset.video}?autoplay=1&rel=0`;
  frame.title = b.getAttribute("aria-label").replace(/^Play /, "");
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  const screen = Object.assign(document.createElement("div"), { className: "screen playing" });
  screen.append(frame);
  b.replaceWith(screen);
});

const img = (src, cls = "") => (src ? `<img${cls ? ` class="${cls}"` : ""} src="${esc(safeUrl(src))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "");

function updateCard(it) {
  return `<a class="update" href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener">
    ${img(it.thumb)}
    <div><span class="tag">${esc(it.source.toUpperCase())}</span>${newBadge(it)}
      <div class="t">${esc(it.title)}</div>
      ${it.text ? `<p>${esc(it.text)}</p>` : ""}
      <div class="meta">${esc(ago(it.date, digest.until))}</div></div>
  </a>`;
}

function videoCard(it) {
  return `<a class="video" href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener">
    <div class="th">${img(it.thumb)}</div>
    <div class="body"><div class="t">${esc(it.title)}</div>
      <div class="meta">${esc(it.by || it.source)} · ${esc(ago(it.date, digest.until))}${newBadge(it)}</div></div>
  </a>`;
}

function row(it) {
  // Links inside an item (the wiki's busiest pages) can't sit in its <a>, so they follow it.
  const links = it.links?.length
    ? `<p class="links">${it.links.map((l) => `<a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.title)}</a>`).join(" · ")}</p>`
    : "";
  return `<li><a class="row" href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener">
    <span class="k" aria-hidden="true">${KIND_ICON[it.kind] || "•"}</span>
    <div><div class="t">${esc(it.title)}${newBadge(it)}</div>
      ${it.text && !links ? `<p class="sub">${esc(it.text)}</p>` : ""}
      <p class="sub">${esc(it.source)}${it.by && it.by !== it.source ? ` · ${esc(it.by)}` : ""} · ${esc(ago(it.date, digest.until))}</p></div>
    ${img(it.thumb, "mini")}
  </a>${links}</li>`;
}

$("recapbtn").addEventListener("click", async () => {
  const btn = $("recapbtn");
  const note = $("recapnote");
  btn.disabled = true;
  btn.textContent = "✍️ WRITING…";
  note.textContent = "This takes a few seconds.";
  try {
    const res = await fetch(`${API}/recap`, { method: "POST" });
    if (res.status === 409) { // someone else pressed it just now
      await new Promise((r) => setTimeout(r, 6000));
      digest = await getJson(`${API}/digest/${digest.day}`);
    } else if (res.ok) {
      digest = await res.json();
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
    render();
  } catch {
    note.textContent = "The AI didn’t answer. Try again in a minute.";
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ WRITE TODAY’S AI RECAPS";
  }
});

$("chips").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  filter = b.dataset.id;
  store.set("digest:filter", filter);
  render();
});

function go(offset) {
  const i = days.indexOf(digest?.day);
  const day = days[i + offset];
  if (day) location.hash = day === days[0] ? "" : day;
}
$("prev").addEventListener("click", () => go(1));
$("next").addEventListener("click", () => go(-1));

const hashDay = () => (/^#\d{4}-\d{2}-\d{2}$/.test(location.hash) ? location.hash.slice(1) : null);
addEventListener("hashchange", () => load(hashDay()));
load(hashDay());
