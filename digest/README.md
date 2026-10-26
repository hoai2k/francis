# Daily Digest

Once a day, one page with what's new for the games I follow: game updates,
videos, news, Reddit posts and wiki activity, grouped by interest. On request,
AI writes a short recap of each interest.

**Live:** https://hoai2k.github.io/francis/digest/

## Using it

- The first visit of a day (by your clock) gathers that day's digest while
  you watch: a progress screen ticks off each game as its sources are read,
  which takes a few seconds. Every later visit that day opens straight away.
- **◀ ▶** in the top bar step through earlier days (about four months are kept).
- The chips under the ticker show one interest at a time; the page remembers
  the choice.
- **NEW** marks anything published since your last visit.
- **✨ Write today's AI recaps** asks for a one- or two-sentence summary of each
  interest. It appears only on the newest day, until someone presses it.
- Each interest notes any source it couldn't read that day.

## How it works

The page is static. A Cloudflare Worker, `francis-digest` in `server/`, does
the work:

1. Nothing runs on a schedule, so days nobody visits cost nothing. The page
   asks for today's digest (`POST /build` with the visitor's date). If it
   exists, it opens; if not, the Worker plans it: everything published since
   the previous digest, or at most a week back after a long gap.
2. The page then asks for each interest in turn (`POST /build/section`), and
   each is gathered in its own Worker request, its sources read in parallel.
   That keeps every request within the free plan's CPU limit as more
   interests are added, and gives the progress screen something to show.
   Finished interests are saved straight away, so a reload, a second visitor
   or a retry after an error never gathers one twice. `POST /build/finish`
   then stores the day's digest.
3. Building a digest uses no AI. Recaps are written only when someone presses
   the button: `POST /recap` runs Workers AI (`@cf/meta/llama-3.2-3b-instruct`,
   ported from Ai-Ching's oracle in `hoai2k/mini`) once for the newest digest,
   for each interest that has something new, and saves the result. Pressing
   it again, or for an older day, never calls the model again, so it costs at
   most one run per day, and nothing on days nobody asks. A rebuild of the
   same day keeps its recaps. If the model fails for every interest, the day
   stays open so a later press can try again.
4. The digest is stored in the `francis-digest` KV namespace. The page reads it
   from `https://francis-digest.hoai2k.workers.dev`:
   - `GET /days`
   - `GET /digest/latest`
   - `GET /digest/YYYY-MM-DD`
   - `POST /build`, `/build/section`, `/build/finish` (used by the page, as above)
   - `POST /recap` (writes the newest digest's recaps once, then returns the saved ones)
   - `POST /refresh` (forgets the newest digest, so the next visit gathers it
     again over the same stretch of time; needs the `REFRESH_TOKEN` secret)

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
| `reddit` | a subreddit's top posts since the last digest | the subreddit name |
| `roblox` | a Roblox game's updates | the **universe** ID (not the place ID in the game's URL) |
| `fandom` | a Fandom wiki's new pages and busiest pages | the wiki's subdomain |
| `minecraft`, `minecraft-news` | Mojang patch notes and launcher news | — |

Push to `main` and deploy (`git push origin main:deploy`). The workflow
redeploys the Worker, and the new interest
appears in the next day's digest. To see it straight away, call `POST /refresh`
and reload the page.

## Setup

The Worker is deployed by `.github/workflows/digest-worker.yml`, which runs
whenever a deploy (a push to the `deploy` branch) changes `digest/server/`, or
from the Actions tab. It
needs two repository secrets: copy the ones the `hoai2k/mini` repository uses
for its Workers.

- `CLOUDFLARE_API_TOKEN`, with Workers Scripts: Edit and Workers KV Storage: Edit
- `CLOUDFLARE_ACCOUNT_ID`

Optional:

- `YOUTUBE_API_KEY` turns on the `youtube-search` sources. Each search uses
  100 of the key's 10,000 free daily units.
- `REFRESH_TOKEN` enables `POST /refresh`.

On its first run, the workflow creates the KV namespace. The first visit
after that builds the first digest.

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
