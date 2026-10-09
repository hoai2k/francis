package com.francis.starfall.strike;

import net.minecraft.util.math.Vec3d;

/**
 * One falling star of a strike: where it ignites, where it lands and when.
 * Shared by the server (which spawns the star entity) and the client (whose
 * cutscene camera follows the very same path), so both always agree.
 */
public record StarSpec(Vec3d start, Vec3d end, int igniteTick, int travelTicks, float radius, float size) {
    public int impactTick() {
        return igniteTick + travelTicks;
    }

    /** Eased flight progress: stars accelerate as they fall. */
    public static double ease(double p) {
        p = Math.max(0, Math.min(1, p));
        return Math.pow(p, 1.7);
    }

    /** Position at strike time t (ticks, may be fractional). */
    public Vec3d positionAt(double t) {
        double p = ease((t - igniteTick) / travelTicks);
        return start.lerp(end, p);
    }

    public Vec3d direction() {
        return end.subtract(start).normalize();
    }
}
