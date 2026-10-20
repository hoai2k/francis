package com.hoai2k.extinction.event;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Every world-ending event besides the asteroid, by id. */
public final class Catastrophes {
    private static final Map<String, Catastrophe> ALL = new LinkedHashMap<>();

    static {
        for (Catastrophe c : List.of(new GreatDying(), new SnowballEarth(), new Supervolcano(), new GammaRayBurst(),
                new SolarSuperflare(), new GreatDeluge(), new TornadoOutbreak(), new CometSwarm(), new GreatRift(),
                new ShatteredMoon())) {
            ALL.put(c.id, c);
        }
    }

    public static Catastrophe get(String id) {
        return ALL.get(id);
    }

    public static Iterable<String> ids() {
        return ALL.keySet();
    }

    public static List<Catastrophe> all() {
        return List.copyOf(ALL.values());
    }

    private Catastrophes() {}
}
