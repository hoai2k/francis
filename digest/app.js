// Daily Digest page: reads the day's digest from the francis-digest Worker
// (digest/server) and lays it out per interest.
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

async function load(day) {
  $("status").innerHTML = '<span class="loading">LOADING TODAY’S DROP…</span>';
  try {
    if (DATA) {
      digest = await getJson(DATA);
      days = [digest.day];
    } else {
      const [list, d] = await Promise.all([
        days.length ? days : getJson(`${API}/days`).catch(() => []),
        getJson(`${API}/digest/${day || "latest"}`),
      ]);
      days = list.length ? list : [d.day];
      digest = d;
    }
    $("status").innerHTML = "";
    render();
  } catch (e) {
    digest = null;
    $("sections").innerHTML = "";
    $("ticker").hidden = true;
    $("status").innerHTML = e.status === 503
      ? '<span class="big">🛠️</span><p><strong>Today’s digest is being put together.</strong></p><p>Give it a few seconds and reload.</p>'
      : e.status === 404
        ? `<span class="big">📭</span><p><strong>No digest for ${esc(dayLabel(day))}.</strong></p><p><a href="#">Back to the newest</a></p>`
        : '<span class="big">📡</span><p><strong>Can’t reach the digest server.</strong></p><p>It may not be deployed yet, or the connection dropped. Try again in a minute.</p>';
  }
  updateNav();
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

  const headlines = all.flatMap((s) => s.items
    .filter((it) => it.kind === "update" || it.kind === "news")
    .slice(0, 4)
    .map((it) => `${s.icon} ${it.title}`));
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
  $("sections").innerHTML = shown.map(section).join("");
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
