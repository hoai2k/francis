package com.francis.starfall.strike;

import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;

/**
 * Geometry and timing of one strike. Pure maths from (type, origin, target),
 * so the server (which does the damage) and every client (which draws it and
 * films it) always agree on where everything is.
 */
public final class StrikePlan {
    // Orbital Lance
    public static final int LANCE_FIRE = 50, LANCE_END = 100;
    public static final double LANCE_HALF_LENGTH = 15, LANCE_WIDTH = 3.2;
    // Comet Dash
    public static final int DASH_START = 12, DASH_LEAP = 28, DASH_SLAM = 38;
    public static final double DASH_SPEED = 1.7;
    // Constellation
    public static final int CONST_LINES = 95, CONST_LINE_STEP = 7, CONST_CONVERGE = 152, CONST_IMPLODE = 166;
    public static final double CONST_PULL_RADIUS = 22, CONST_BLAST = 9;
    // Supernova
    public static final int NOVA_APPEAR = 60, NOVA_COLLAPSE = 160, NOVA = 176;
    public static final double NOVA_HEIGHT = 10, NOVA_RADIUS = 22, NOVA_PULL_RADIUS = 32;

    /** Big Dipper, in blocks: x along the handle, y across. */
    private static final double[][] DIPPER = {
            {-15, 0}, {-9, 2.4}, {-4, 1.6}, {1, 0}, {2.5, -6.5}, {10.5, -5.5}, {9.6, 3.2}
    };

    public final StrikeType type;
    public final Vec3d origin, target, fwd, back, side;

    public StrikePlan(StrikeType type, Vec3d origin, Vec3d target) {
        this.type = type;
        this.origin = origin;
        this.target = target;
        Vec3d b = new Vec3d(origin.x - target.x, 0, origin.z - target.z);
        this.back = b.lengthSquared() < 1e-4 ? new Vec3d(0, 0, 1) : b.normalize();
        this.fwd = back.multiply(-1);
        this.side = new Vec3d(-back.z, 0, back.x);
    }

    public static double smooth(double x) {
        x = MathHelper.clamp(x, 0, 1);
        return x * x * (3 - 2 * x);
    }

    public static double progress(double t, double from, double to) {
        return MathHelper.clamp((t - from) / (to - from), 0, 1);
    }

    /** How far the weapon pushes its target away so the caster isn't caught in it. */
    public static double minDistance(StrikeType type) {
        return switch (type) {
            case ORBITAL_LANCE -> LANCE_HALF_LENGTH + 10;
            case COMET_DASH -> 18;
            case CONSTELLATION -> 30;
            case SUPERNOVA -> NOVA_RADIUS + 12;
        };
    }

    // ------------------------------------------------------ orbital lance ---

    /** The satellite: a fixed bright point high in the sky. */
    public Vec3d lanceSatellite() {
        return target.add(back.multiply(30)).add(side.multiply(14)).add(0, 170, 0);
    }

    /** Where the beam touches down (y is the target's; callers snap it to the ground). */
    public Vec3d lancePoint(double t) {
        double p = smooth(progress(t, LANCE_FIRE, LANCE_END));
        return target.add(fwd.multiply(-LANCE_HALF_LENGTH + 2 * LANCE_HALF_LENGTH * p));
    }

    public boolean lanceFiring(double t) {
        return t >= LANCE_FIRE && t < LANCE_END;
    }

    // ------------------------------------------------------ constellation ---

    public Vec3d constHome(int i) {
        return target.add(side.multiply(DIPPER[i][0])).add(back.multiply(DIPPER[i][1])).add(0, 15, 0);
    }

    public int constArrive(int i) {
        return 30 + i * 8 + 30;
    }

    /** Star i: falls from the sky to its place in the Dipper, hovers, then dives to the centre. */
    public Vec3d constPos(int i, double t) {
        Vec3d home = constHome(i);
        int arrive = constArrive(i);
        if (t < arrive) {
            Vec3d sky = home.add(back.multiply(40)).add(0, 120, 0);
            double p = progress(t, arrive - 30, arrive);
            return sky.lerp(home, 1 - Math.pow(1 - p, 2.2));
        }
        if (t < CONST_CONVERGE) {
            return home.add(0, Math.sin(t * 0.15 + i) * 0.4, 0);
        }
        double p = Math.pow(progress(t, CONST_CONVERGE, CONST_IMPLODE), 2);
        return home.lerp(target.add(0, 1, 0), p);
    }

    public boolean constStarVisible(int i, double t) {
        return t >= constArrive(i) - 34 && t < CONST_IMPLODE;
    }

    /** 0..1 how lit the line from star i to i+1 is. */
    public double constLine(int i, double t) {
        return progress(t, CONST_LINES + i * CONST_LINE_STEP, CONST_LINES + i * CONST_LINE_STEP + 5);
    }

    public static int constStars() {
        return DIPPER.length;
    }

    // ----------------------------------------------------------- supernova ---

    public Vec3d novaCenter() {
        return target.add(0, NOVA_HEIGHT, 0);
    }

    /** Visual radius of the star: swells, then collapses to a pinpoint before the blast. */
    public double novaSize(double t) {
        if (t < NOVA_APPEAR - 20) return 0;
        if (t < NOVA_APPEAR) return 1.5 * progress(t, NOVA_APPEAR - 20, NOVA_APPEAR);
        if (t < NOVA_COLLAPSE) return 1.5 + 7.5 * smooth(progress(t, NOVA_APPEAR, NOVA_COLLAPSE));
        if (t < NOVA) return 9 - 8.5 * Math.pow(progress(t, NOVA_COLLAPSE, NOVA), 0.6);
        return 0;
    }

    public boolean novaPulling(double t) {
        return t >= NOVA_APPEAR && t < NOVA;
    }
}
