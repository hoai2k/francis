package com.francis.starfall.strike;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.util.math.Vec3d;

/**
 * Every weapon calls down a different strike. All timings are in ticks from
 * the moment the weapon is used; the cutscene is choreographed around them.
 */
public enum StrikeType {
    /** Stellar Remote: one shooting star, a classic orbital strike. */
    SHOOTING_STAR("shooting_star", 0xFFD25A, 40, 150, 200),
    /** Starfall Blade: a quick, low comet that ploughs in from the horizon. */
    COMET_SLASH("comet_slash", 0x5EF0FF, 24, 100, 100),
    /** Seven Stars Scepter: the Big Dipper falls, one star at a time. */
    SEVEN_STARS("seven_stars", 0xC08CFF, 40, 230, 400),
    /** Supernova Core: a star the size of a house. Run. */
    SUPERNOVA("supernova", 0xFF7A3A, 70, 270, 1200);

    public final String key;
    public final int color;
    /** Tick the (first) star ignites in the sky; before that is the wind-up. */
    public final int igniteTick;
    /** Total cutscene length. */
    public final int duration;
    public final int cooldown;

    StrikeType(String key, int color, int igniteTick, int duration, int cooldown) {
        this.key = key;
        this.color = color;
        this.igniteTick = igniteTick;
        this.duration = duration;
        this.cooldown = cooldown;
    }

    public static StrikeType byId(int id) {
        StrikeType[] values = values();
        return values[Math.floorMod(id, values.length)];
    }

    /** Big Dipper star offsets (x along the handle, y across), in blocks. */
    private static final double[][] DIPPER = {
            {-19, 0}, {-11, 3}, {-5, 2}, {1, 0}, {3, -8}, {13, -7}, {12, 4}
    };

    /**
     * Lays out the stars. Deterministic: given the same origin and target the
     * server and the client compute identical paths.
     */
    public List<StarSpec> plan(Vec3d origin, Vec3d target) {
        Vec3d back = new Vec3d(origin.x - target.x, 0, origin.z - target.z);
        back = back.lengthSquared() < 1e-4 ? new Vec3d(0, 0, 1) : back.normalize();
        Vec3d side = new Vec3d(-back.z, 0, back.x);
        Vec3d up = new Vec3d(0, 1, 0);
        List<StarSpec> stars = new ArrayList<>();
        switch (this) {
            case SHOOTING_STAR -> stars.add(new StarSpec(
                    target.add(back.multiply(90)).add(side.multiply(25)).add(up.multiply(150)),
                    target, igniteTick, 50, 11f, 3.2f));
            case COMET_SLASH -> stars.add(new StarSpec(
                    target.add(back.multiply(110)).add(side.multiply(-30)).add(up.multiply(55)),
                    target, igniteTick, 30, 6.5f, 2.2f));
            case SEVEN_STARS -> {
                for (int i = 0; i < DIPPER.length; i++) {
                    Vec3d land = target.add(side.multiply(DIPPER[i][0] * 0.8)).add(back.multiply(DIPPER[i][1] * 0.8));
                    Vec3d from = land.add(back.multiply(70 + i * 3)).add(side.multiply(10 - i * 3)).add(up.multiply(140));
                    stars.add(new StarSpec(from, land, igniteTick + i * 14, 44, 5.5f, 2.4f));
                }
            }
            case SUPERNOVA -> stars.add(new StarSpec(
                    target.add(back.multiply(60)).add(side.multiply(-20)).add(up.multiply(230)),
                    target, igniteTick, 90, 19f, 10f));
        }
        return stars;
    }

    public int lastImpactTick(List<StarSpec> stars) {
        int t = 0;
        for (StarSpec s : stars) t = Math.max(t, s.impactTick());
        return t;
    }
}
