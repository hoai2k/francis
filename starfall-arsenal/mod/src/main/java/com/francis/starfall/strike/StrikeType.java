package com.francis.starfall.strike;

/**
 * The four skills. Each is a completely different mechanic; all timings are
 * ticks from the moment the weapon is used, and the cutscene is choreographed
 * around them.
 */
public enum StrikeType {
    /** Stellar Remote: a satellite's beam sweeps across the ground and burns a trench. */
    ORBITAL_LANCE("orbital_lance", 0xFFD25A, 40, StrikePlan.LANCE_END, 150, 200),
    /** Starfall Blade: you become the comet - dash, leap and slam down. */
    COMET_DASH("comet_dash", 0x5EF0FF, 12, 44, 80, 100),
    /** Seven Stars Scepter: the Big Dipper descends, pulls everything in, then implodes. */
    CONSTELLATION("constellation", 0xC08CFF, 30, StrikePlan.CONST_IMPLODE, 225, 400),
    /** Supernova Core: a star swells into a black hole, swallows the ground, then goes nova. */
    SUPERNOVA("supernova", 0xFF7A3A, 60, StrikePlan.NOVA, 270, 1200);

    public final String key;
    public final int color;
    /** End of the wind-up; the title card clears shortly after. */
    public final int igniteTick;
    /** The big moment the film builds to (flash, shake, countdown target). */
    public final int impactTick;
    public final int duration;
    public final int cooldown;

    StrikeType(String key, int color, int igniteTick, int impactTick, int duration, int cooldown) {
        this.key = key;
        this.color = color;
        this.igniteTick = igniteTick;
        this.impactTick = impactTick;
        this.duration = duration;
        this.cooldown = cooldown;
    }

    public static StrikeType byId(int id) {
        StrikeType[] values = values();
        return values[Math.floorMod(id, values.length)];
    }
}
