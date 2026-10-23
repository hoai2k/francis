// What Brick Kart keeps in localStorage: the options, the Time Trial records and each player
// slot's last picks, with the clean-ups older saves need. Storage can be unavailable (private
// windows, blocked site data): loads then fall back to the defaults and saves do nothing.
export const SKEY = 'brickkart.settings.v1', TKEY = 'brickkart.tt.v1', PKEY = 'brickkart.picks.v1';

export function load(key, def) { try { return { ...def, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { ...def }; } }
export function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }

// the options (mobile: start on low quality)
export function loadSettings(mobile) {
  const s = load(SKEY, { cc: 100, difficulty: 'normal', laps: 3, music: 0.5, sfx: 0.8, autoGas: false, simple: false, touchSteer: 'both', tiltStyle: 'wheel', tiltSens: 'med', tiltInvert: false, lego: true, quality: mobile ? 'low' : 'high' });
  // races always have 12 karts (players included): drop the old count
  if ('racers' in s) { delete s.racers; save(SKEY, s); }
  // tilt steering was reworked (it read reversed on some phones): drop an old "Invert tilt"
  // workaround once so the new default is right
  if (!s.tiltV2) { s.tiltInvert = false; s.tiltV2 = true; save(SKEY, s); }
  // characters are always on now: drop the old toggle
  if ('useChars' in s || 'charsDefault' in s) { delete s.useChars; delete s.charsDefault; save(SKEY, s); }
  return s;
}

// Time Trial records, kept per map and engine class ("city@150"); older ones were per map only
// and most were set on the default 100cc
export function loadRecords() {
  const best = load(TKEY, {});
  if (Object.keys(best).some((k) => !k.includes('@'))) {
    for (const k of Object.keys(best)) if (!k.includes('@')) { best[`${k}@100`] ??= best[k]; delete best[k]; }
    save(TKEY, best);
  }
  return best;
}

// each player slot's last picks, by id: { chars: { 0: { driver, kart, glider } } }
export const loadPicks = () => load(PKEY, { chars: {} });
