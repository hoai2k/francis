// The interests the digest follows, and where it looks for each one.
//
// To add an interest, copy a block and change it. Source types:
//   { type: "steam", appid }                 official Steam announcements for a game
//   { type: "youtube", channel, name }       a YouTube channel's uploads (channel ID starting UC)
//   { type: "youtube-search", query }        YouTube search (only when YOUTUBE_API_KEY is set)
//   { type: "news", query, match? }          Google News; headlines must contain the quoted
//                                            part of the query (or match, or the whole query)
//   { type: "reddit", sub }                  the subreddit's top posts since the last digest
//   { type: "roblox", universe }             a Roblox game's updates (universe ID, not place ID)
//   { type: "fandom", wiki }                 a Fandom wiki's new pages and busiest pages
//   { type: "minecraft", edition }           Mojang's patch notes ("java" or "bedrock")
//   { type: "minecraft-news" }               official Minecraft news (as in the launcher)
//
// A channel ID is in the page source of youtube.com/@handle ("externalId").
// accent is the interest's colour on the page; icon is one emoji; loading is
// what the page says while this interest is being gathered.

export const INTERESTS = [
  {
    id: "prehistoric-kingdom",
    name: "Prehistoric Kingdom",
    loading: "Digging up fossils…",
    icon: "🦖",
    accent: "#7bd88f",
    sources: [
      { type: "steam", appid: 666150 },
      { type: "youtube", channel: "UC1VvpL5vNhYRFIQ0AXZWGTA", name: "Prehistoric Kingdom" },
      { type: "youtube-search", query: "Prehistoric Kingdom" },
      { type: "reddit", sub: "PrehistoricKingdom" },
      { type: "news", query: "\"Prehistoric Kingdom\" game" },
    ],
  },
  {
    id: "minecraft",
    name: "Minecraft",
    loading: "Mining for snapshots…",
    icon: "⛏️",
    accent: "#5fd35f",
    sources: [
      { type: "minecraft", edition: "java" },
      { type: "minecraft", edition: "bedrock" },
      { type: "minecraft-news" },
      { type: "youtube", channel: "UC1sELGmy5jp5fQUugmuYlXQ", name: "Minecraft" },
      { type: "youtube", channel: "UCU9pX8hKcrx06XfOB-VQLdw", name: "xisumavoid" },
      { type: "reddit", sub: "Minecraft" },
      { type: "news", query: "Minecraft" },
    ],
  },
  {
    id: "planet-zoo-2",
    name: "Planet Zoo 2",
    loading: "Feeding the giraffes…",
    icon: "🦒",
    accent: "#ffb547",
    sources: [
      { type: "steam", appid: 3219030 },
      { type: "youtube", channel: "UCNa3WpVCF3NmvdmeboaYQGQ", name: "Planet Zoo" },
      { type: "youtube-search", query: "Planet Zoo 2" },
      { type: "reddit", sub: "PlanetZoo" },
      { type: "fandom", wiki: "planetzoo" },
      { type: "news", query: "\"Planet Zoo 2\"" },
    ],
  },
  {
    id: "jujutsu-shenanigans",
    name: "Jujutsu Shenanigans",
    loading: "Expanding the domain…",
    icon: "👊",
    accent: "#ff4f7b",
    sources: [
      { type: "roblox", universe: 3508322461 },
      { type: "youtube", channel: "UC5axoV7c-Eiyr0LX5Z84dag", name: "Jujutsu Shenanigans" },
      { type: "youtube-search", query: "Jujutsu Shenanigans" },
      { type: "fandom", wiki: "jujutsu-shenanigans" },
      { type: "reddit", sub: "JujutsuShenanigans" },
      { type: "news", query: "\"Jujutsu Shenanigans\"" },
    ],
  },
];
