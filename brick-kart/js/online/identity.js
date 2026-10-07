// Who this screen is, across page loads: a uid kept in localStorage, so leaving a room (Leave room,
// closing the tab, a reload, a phone killing the page) and coming back is the same player, who gets
// their kart, picks and Grand Prix points back. Plus the last room this screen was in, so the lobby
// (and the main menu, for a while) can offer to rejoin it.
//
// Two tabs of one browser must not share an identity (they'd fight over one player), so each live
// tab holds a numbered slot: slot n has its own uid and its own last room. Slots are held with the
// Web Locks API (released by the browser when the tab closes or crashes), or, where that's missing,
// with heartbeats in localStorage.
import { ID_RE, newUid, str } from './proto.js';

const SLOTS = 8;
const UID_KEY = (n) => `brickkart.online.uid.${n}`;
const ROOM_KEY = (n) => `brickkart.online.room.${n}`;   // (main.js reads these too, for its Rejoin item)
const HB_KEY = (n) => `brickkart.online.hb.${n}`;
const ROOM_ID = /^[A-Za-z0-9_-]{1,64}$/;

function store() {
  try { const s = localStorage; s.getItem(UID_KEY(0)); return s; } catch { return null; }
}

// -> Promise<{ uid, slot }> (slot -1: no lasting identity, e.g. storage is blocked)
export function claimIdentity() {
  const ls = store();
  const fresh = () => ({ uid: newUid(), slot: -1 });
  if (!ls) return Promise.resolve(fresh());
  const uidFor = (n) => {
    try {
      let u = ls.getItem(UID_KEY(n));
      if (!u || !ID_RE.test(u)) { u = newUid(); ls.setItem(UID_KEY(n), u); }
      return { uid: u, slot: n };
    } catch { return fresh(); }
  };
  if (navigator.locks?.request) {
    return (async () => {
      for (let n = 0; n < SLOTS; n++) {
        const got = await new Promise((resolve) => {
          navigator.locks.request('brickkart-online-' + n, { ifAvailable: true }, (lock) => {
            if (!lock) { resolve(false); return undefined; }
            resolve(true);
            return new Promise(() => {});   // held for as long as this page lives
          }).catch(() => resolve(false));
        });
        if (got) return uidFor(n);
      }
      return fresh();
    })().catch(() => fresh());
  }
  // no Web Locks: a heartbeat per slot (a slot whose holder hasn't beaten for 5 s is free)
  const tab = newUid();
  for (let n = 0; n < SLOTS; n++) {
    try {
      const [who, at] = String(ls.getItem(HB_KEY(n)) || '').split(':');
      if (who && who !== tab && Date.now() - +at < 5000) continue;
      ls.setItem(HB_KEY(n), `${tab}:${Date.now()}`);
      const beat = setInterval(() => { try { ls.setItem(HB_KEY(n), `${tab}:${Date.now()}`); } catch { /* full */ } }, 1500);
      addEventListener('pagehide', () => { clearInterval(beat); try { if (String(ls.getItem(HB_KEY(n))).startsWith(tab)) ls.removeItem(HB_KEY(n)); } catch { /* gone */ } });
      return Promise.resolve(uidFor(n));
    } catch { break; }
  }
  return Promise.resolve(fresh());
}

// The last room of slot n: { base, id, title, t (ms since 1970), picks: [{ slot, device, d, k, g, pick }]
// (driver / kart / glider ids, the name choice) } or null
export function loadRoom(n) {
  const ls = store();
  if (!ls || n < 0) return null;
  try {
    const r = JSON.parse(ls.getItem(ROOM_KEY(n)) || 'null');
    if (!r || typeof r !== 'object' || !ROOM_ID.test(r.base) || !ROOM_ID.test(r.id) || !Number.isFinite(r.t)) return null;
    const picks = (Array.isArray(r.picks) ? r.picks : []).slice(0, 8).filter((p) => p && Number.isInteger(p.slot) && p.slot >= 0 && p.slot < 8)
      .map((p) => ({ slot: p.slot, device: str(p.device, 12) || 'kb', d: str(p.d, 40), k: str(p.k, 40), g: str(p.g, 40), pick: str(p.pick, 24) || 'default' }));
    return { base: r.base, id: r.id, title: str(r.title, 40), t: r.t, picks };
  } catch { return null; }
}
export function saveRoom(n, rec) {
  const ls = store();
  if (!ls || n < 0) return;
  try { ls.setItem(ROOM_KEY(n), JSON.stringify(rec)); } catch { /* full or blocked */ }
}
// the room listed in the lobby that is (or took over from) the remembered one: the same id, or a
// successor "<base>-g<n>" after a host change (the newest)
export function findRoom(rec, rooms) {
  if (!rec || !Array.isArray(rooms)) return null;
  let best = null, bestGen = -1;
  for (const r of rooms) {
    if (!r || typeof r.id !== 'string') continue;
    const m = /^(.*)-g(\d+)$/.exec(r.id), base = m ? m[1] : r.id, gen = m ? +m[2] : 0;
    if (base !== rec.base && r.id !== rec.id) continue;
    if (gen > bestGen) { best = r; bestGen = gen; }
  }
  return best;
}
