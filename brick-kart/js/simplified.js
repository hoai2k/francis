// The roster for "Simplified mode" (Options → Simplified mode): the drivers and karts the select
// screen offers and CPU racers use when it's on. Lists of ids (DRIVERS[].id / KARTS[].id);
// null means "all of them". Pick the set in brick-kart/workbench/ and export it, then paste the
// ids here. The classic racers (Use Characters off) follow the drivers list: classic racer
// "bob" is driver "classic-bob".
export const SIMPLIFIED = {
  drivers: null,
  karts: null,
};

// is this driver / kart id in the simplified set?
export const simpleDriver = (id) => !SIMPLIFIED.drivers || SIMPLIFIED.drivers.includes(id);
export const simpleKart = (id) => !SIMPLIFIED.karts || SIMPLIFIED.karts.includes(id);
