# Daily Digest

Every morning, one page with what's new for the games I follow: game updates,
videos, news, Reddit posts and wiki activity, grouped by interest. Each
interest gets a short recap written by AI.

**Live:** https://hoai2k.github.io/francis/digest/

## Using it

- **◀ ▶** in the top bar step through earlier days (about four months are kept).
- The chips under the ticker show one interest at a time; the page remembers
  the choice.
- **NEW** marks anything published since your last visit.
- Each interest notes any source it couldn't read that day.

## How it works

The page is static. A Cloudflare Worker, `francis-digest` in `server/`, does
the work:

1. A cron trigger runs every day at **10:07 UTC** (6:07 in New York during
   summer time). Change it under `triggers` in `server/wrangler.jsonc`.
2. Each interest is built in its own invocation, through the Worker's `SELF`
   binding. That keeps every run within the free plan's CPU limit as more
   interests are added. The interest's sources are read in parallel, and
   only what was published since the previous digest is kept.
3. Workers AI (`@cf/meta/llama-3.2-3b-instruct`, ported from Ai-Ching's
   oracle in `hoai2k/mini`) writes one or two sentences from that day's
   headlines. If the model fails, the interest has no recap and everything
   else still shows.
4. The digest is stored in the `francis-digest` KV namespace. The page reads it
   from `https://francis-digest.hoai2k.workers.dev`:
   - `GET /days`
   - `GET /digest/latest` (builds a digest when there is none, or when the newest is over 26 hours old)
   - `GET /digest/YYYY-MM-DD`
   - `POST /refresh` (rebuilds today's digest; needs the `REFRESH_TOKEN` secret)

## Adding an interest

Edit `server/src/interests.js`. Copy a block and give it an `id`, `name`,
`icon` (one emoji), `accent` colour and a list of sources. The comment at the
top lists the source types:

| Type | Reads | Needs |
| --- | --- | --- |
| `steam` | official Steam announcements | the app ID from the store URL |
| `youtube` | a channel's uploads | the channel ID (`UC…`, shown as `externalId` in the page source of youtube.com/@handle) |
| `youtube-search` | YouTube search, most viewed first | the `YOUTUBE_API_KEY` secret; skipped without it |
| `news` | Google News | a query; headlines must contain its quoted part |
| `reddit` | a subreddit's top posts of the day | the subreddit name |
| `roblox` | a Roblox game's updates | the **universe** ID (not the place ID in the game's URL) |
| `fandom` | a Fandom wiki's new pages and busiest pages | the wiki's subdomain |
| `minecraft`, `minecraft-news` | Mojang patch notes and launcher news | — |

Push to `main`. The workflow redeploys the Worker, and the new interest
appears in the next digest. To see it straight away, call `POST /refresh`.

## Setup

The Worker is deployed by `.github/workflows/digest-worker.yml`, which runs
whenever `digest/server/` changes on `main`, or from the Actions tab. It
needs two repository secrets: copy the ones the `hoai2k/mini` repository uses
for its Workers.

- `CLOUDFLARE_API_TOKEN`, with Workers Scripts: Edit and Workers KV Storage: Edit
- `CLOUDFLARE_ACCOUNT_ID`

Optional:

- `YOUTUBE_API_KEY` turns on the `youtube-search` sources. Each search uses
  100 of the key's 10,000 free daily units.
- `REFRESH_TOKEN` enables `POST /refresh`.

On its first run, the workflow creates the KV namespace and builds the first
digest.

## Checks

In `server/`:

```sh
npm ci
npm test                       # unit tests for the readers, the builder and the routes
npm run dev                    # the Worker on http://localhost:8787 (no AI recaps locally)
node tools/preview.mjs out.json 48   # build a digest from the live sources, no Worker needed
```

Open the page against them with `index.html?api=http://localhost:8787`, or
with `index.html?data=<path to out.json>`.

## Known limits

- Reddit refuses some servers (it answered 403 from the build machine). If
  it blocks Cloudflare too, those sources show as unreadable and the rest of
  the digest is unaffected.
- Discord and X/Twitter are not read. That's where some Roblox game news
  appears first; the Roblox update check and the wiki usually catch up within
  the day.
- Google News links go through news.google.com before reaching the article.
