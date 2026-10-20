package com.hoai2k.extinction;

import java.util.Locale;
import java.util.function.Supplier;

/** The extinction timeline, in order. */
public enum Phase {
    DORMANT(() -> 0),
    WARNING(ExtinctionConfig.WARNING_SECONDS::get),
    IMPACT(ExtinctionConfig.IMPACT_SECONDS::get),
    FIRESTORM(ExtinctionConfig.FIRESTORM_SECONDS::get),
    VOLCANISM(ExtinctionConfig.VOLCANISM_SECONDS::get),
    WINTER(ExtinctionConfig.WINTER_SECONDS::get),
    RECOVERY(ExtinctionConfig.RECOVERY_SECONDS::get),
    OVER(() -> 0);

    /** Ticks from the start of IMPACT until the asteroid hits the ground. */
    public static final int DESCENT_TICKS = 240;

    private final Supplier<Integer> seconds;

    Phase(Supplier<Integer> seconds) {
        this.seconds = seconds;
    }

    public int lengthTicks() {
        return seconds.get() * 20;
    }

    public boolean running() {
        return this != DORMANT && this != OVER;
    }

    public Phase next() {
        return this == OVER ? OVER : values()[ordinal() + 1];
    }

    public String id() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Phase byId(String id) {
        // In spawns.json, "before" and "after" are the natural world before the impact and after the event.
        if (id.equalsIgnoreCase("before")) return DORMANT;
        if (id.equalsIgnoreCase("after")) return OVER;
        for (Phase p : values()) if (p.id().equalsIgnoreCase(id)) return p;
        return null;
    }
}
