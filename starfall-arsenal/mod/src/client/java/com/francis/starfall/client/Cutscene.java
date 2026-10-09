package com.francis.starfall.client;

import com.francis.starfall.strike.StarSpec;
import com.francis.starfall.strike.StrikeType;
import java.util.List;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.Perspective;
import net.minecraft.text.Text;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import org.jetbrains.annotations.Nullable;

/**
 * The film. A cutscene is a list of camera "shots" choreographed around the
 * strike's timeline: hero close-up, sky reveal, telephoto ignition, chase cam,
 * wide impact and a crane over the crater - then a smooth hand-back to the
 * player's own camera.
 */
public final class Cutscene {
    public record Shot(Vec3d pos, float yaw, float pitch) {
    }

    private static final float RAD = MathHelper.DEGREES_PER_RADIAN;
    private static final int BLEND_OUT = 20;

    @Nullable private static Cutscene current;

    private final StrikeType type;
    private final Vec3d origin;
    private final Vec3d target;
    private final List<StarSpec> stars;
    private final Vec3d eye, back, fwd, side;
    private final float radius;
    private final int lastImpact;
    private final Perspective savedPerspective;
    private final float lockYaw, lockPitch;
    private int ticks;

    private Cutscene(MinecraftClient client, StrikeType type, Vec3d origin, Vec3d target) {
        this.type = type;
        this.origin = origin;
        this.target = target;
        this.stars = type.plan(origin, target);
        this.eye = origin.add(0, 1.62, 0);
        Vec3d b = new Vec3d(origin.x - target.x, 0, origin.z - target.z);
        this.back = b.lengthSquared() < 1e-4 ? new Vec3d(0, 0, 1) : b.normalize();
        this.fwd = back.multiply(-1);
        this.side = new Vec3d(-back.z, 0, back.x);
        float r = 0;
        for (StarSpec s : stars) r = Math.max(r, s.radius());
        this.radius = type == StrikeType.SEVEN_STARS ? 16 : r;
        this.lastImpact = type.lastImpactTick(stars);
        this.savedPerspective = client.options.getPerspective();
        this.lockYaw = client.player.getYaw();
        this.lockPitch = client.player.getPitch();
    }

    @Nullable
    public static Cutscene current() {
        return current;
    }

    public static void start(MinecraftClient client, StrikeType type, Vec3d origin, Vec3d target) {
        if (client.player == null) return;
        stop(client);
        current = new Cutscene(client, type, origin, target);
        // Third person so the caster is in shot and the first-person hand is hidden.
        client.options.setPerspective(Perspective.THIRD_PERSON_BACK);
        client.gameRenderer.setBlockOutlineEnabled(false);
    }

    public static void stop(MinecraftClient client) {
        if (current == null) return;
        client.options.setPerspective(current.savedPerspective);
        client.gameRenderer.setBlockOutlineEnabled(true);
        current = null;
    }

    /** Called every client tick while a film is rolling. */
    public void tick(MinecraftClient client) {
        if (client.player == null || !client.player.isAlive()) {
            stop(client);
            return;
        }
        // Lock the director's chair: no walking off set mid-take.
        client.player.setYaw(lockYaw);
        client.player.setPitch(lockPitch);
        if (++ticks >= type.duration) {
            stop(client);
        }
    }

    private float time(float tickDelta) {
        return ticks + tickDelta;
    }

    // ------------------------------------------------------------ camera ---

    private static double smooth(double x) {
        x = MathHelper.clamp(x, 0, 1);
        return x * x * (3 - 2 * x);
    }

    private static double progress(double t, double from, double to) {
        return MathHelper.clamp((t - from) / (to - from), 0, 1);
    }

    private Vec3d starPos(double t) {
        return stars.get(0).positionAt(t);
    }

    /** Scripted shot: camera position and the point it looks at. */
    private Vec3d[] script(double t) {
        StarSpec lead = stars.get(0);
        int ignite = type.igniteTick;
        double closeUpEnd = ignite * 0.45;
        Vec3d up = new Vec3d(0, 1, 0);
        if (t < closeUpEnd) {
            // 1. Hero close-up, slow arc across the caster's face.
            double u = smooth(progress(t, 0, closeUpEnd));
            Vec3d cam = eye.add(fwd.multiply(2.6 - u * 0.6)).add(side.multiply(1.4 - 2.6 * u)).add(0, -0.5 + 0.3 * u, 0);
            return new Vec3d[]{cam, eye.add(0, -0.1, 0)};
        }
        if (t < ignite) {
            // 2. Low angle: the camera tilts from the caster up into the sky.
            double u = smooth(progress(t, closeUpEnd, ignite));
            Vec3d cam = origin.add(fwd.multiply(3.4)).add(side.multiply(-1.2)).add(0, 0.35, 0);
            Vec3d look = eye.add(0, 0.6, 0).lerp(lead.start(), u * 0.9);
            return new Vec3d[]{cam, look};
        }
        if (t < ignite + 18) {
            // 3. Telephoto on the igniting star, caster silhouetted in front.
            Vec3d cam = eye.add(fwd.multiply(2.8)).add(side.multiply(0.6)).add(0, -0.4, 0);
            return new Vec3d[]{cam, starPos(t)};
        }
        int wideStart = lastImpact - 8;
        if (t < wideStart) {
            if (type == StrikeType.SEVEN_STARS) {
                // 4b. High orbit over the target as the Big Dipper rains down.
                double a = (t - ignite) * 0.008;
                Vec3d dir = back.multiply(Math.cos(a)).add(side.multiply(Math.sin(a)));
                Vec3d cam = target.add(dir.multiply(54)).add(0, 22, 0);
                return new Vec3d[]{cam, target.add(0, 14, 0)};
            }
            if (type == StrikeType.SUPERNOVA && t > ignite + 50) {
                // 4c. Dread shot from the ground: the sky is falling.
                double u = progress(t, ignite + 50, wideStart);
                Vec3d cam = target.add(back.multiply(radius * 2.8 - u * 6)).add(side.multiply(radius)).add(0, 3, 0);
                return new Vec3d[]{cam, starPos(t).lerp(target, 0.1)};
            }
            // 4. Chase cam riding behind the star.
            Vec3d p = starPos(t);
            Vec3d dir = lead.direction();
            double off = 14 + lead.size() * 3;
            Vec3d cam = p.subtract(dir.multiply(off)).add(side.multiply(8 + lead.size())).add(up.multiply(4));
            cam = new Vec3d(cam.x, Math.max(cam.y, target.y + 6), cam.z);
            return new Vec3d[]{cam, p.lerp(target, 0.15)};
        }
        Vec3d wide = target.add(side.multiply(radius * 2.6 + 14)).add(back.multiply(radius * 1.8 + 10)).add(up.multiply(radius * 0.9 + 8));
        if (t < lastImpact + 30) {
            // 5. Wide shot for the impact, with a slight dolly-in.
            double u = smooth(progress(t, wideStart, lastImpact + 30));
            Vec3d cam = wide.lerp(target, 0.12 * u);
            Vec3d look = target.add(0, radius * 0.25, 0);
            if (t < lastImpact && type != StrikeType.SEVEN_STARS) {
                // Keep the incoming star in frame for the last moments.
                look = look.lerp(starPos(t), 0.3 * (1 - progress(t, wideStart, lastImpact)));
            }
            return new Vec3d[]{cam, look};
        }
        // 6. Crane up and away over the smoking crater.
        double u = smooth(progress(t, lastImpact + 30, type.duration));
        Vec3d cam = wide.lerp(target, 0.12).add(back.multiply(u * radius)).add(0, u * (radius + 10), 0);
        return new Vec3d[]{cam, target.add(0, -radius * 0.2, 0)};
    }

    /** Camera shake from every impact still ringing. */
    private double shake(double t) {
        double s = 0;
        for (StarSpec star : stars) {
            double since = t - star.impactTick();
            if (since >= 0 && since < 30) s += (1 - since / 30) * (0.4 + star.radius() / 8);
        }
        double rumble = type == StrikeType.SUPERNOVA ? progress(t, type.igniteTick, lastImpact) * 0.25 : 0;
        return s + rumble;
    }

    public Shot camera(float tickDelta, Vec3d vanillaPos, float vanillaYaw, float vanillaPitch) {
        double t = time(tickDelta);
        Vec3d[] s = script(t);
        Vec3d cam = s[0];
        Vec3d look = s[1];
        double k = shake(t);
        if (k > 0) {
            Vec3d jitter = new Vec3d(Math.sin(t * 41.3) + Math.sin(t * 17.1), Math.sin(t * 37.7) + Math.cos(t * 23.9), Math.cos(t * 29.3)).multiply(0.35 * k);
            cam = cam.add(jitter);
            look = look.add(jitter.multiply(2.5));
        }
        Vec3d d = look.subtract(cam);
        double horiz = Math.sqrt(d.x * d.x + d.z * d.z);
        float yaw = (float) (MathHelper.atan2(d.z, d.x) * RAD) - 90f;
        float pitch = (float) (-(MathHelper.atan2(d.y, horiz) * RAD));
        // Hand the camera back smoothly at the end.
        double w = smooth(progress(t, type.duration - BLEND_OUT, type.duration));
        if (w > 0) {
            cam = cam.lerp(vanillaPos, w);
            yaw = MathHelper.lerpAngleDegrees((float) w, yaw, vanillaYaw);
            pitch = MathHelper.lerp((float) w, pitch, vanillaPitch);
        }
        return new Shot(cam, yaw, pitch);
    }

    public double fov(float tickDelta, double vanilla) {
        double t = time(tickDelta);
        int ignite = type.igniteTick;
        double lens;
        if (t < ignite * 0.45) lens = 50;
        else if (t < ignite) lens = 72;
        else if (t < ignite + 18) lens = MathHelper.lerp(progress(t, ignite, ignite + 18), 22, 34);
        else if (t < lastImpact - 8) lens = type == StrikeType.SEVEN_STARS ? 62 : 80;
        else lens = 64;
        // Punch-in on impact.
        for (StarSpec star : stars) {
            double since = t - star.impactTick();
            if (since >= 0 && since < 8) lens -= (1 - since / 8) * 8;
        }
        double w = smooth(progress(t, type.duration - BLEND_OUT, type.duration));
        return MathHelper.lerp(w, lens, vanilla);
    }

    // ----------------------------------------------------------- overlay ---

    private static int argb(double alpha, int rgb) {
        int a = (int) (MathHelper.clamp(alpha, 0, 1) * 255);
        return (a << 24) | (rgb & 0xFFFFFF);
    }

    public void renderOverlay(DrawContext ctx, float tickDelta) {
        MinecraftClient client = MinecraftClient.getInstance();
        TextRenderer font = client.textRenderer;
        double t = time(tickDelta);
        int w = ctx.getScaledWindowWidth();
        int h = ctx.getScaledWindowHeight();

        // Impact flash, tinted towards the strike colour as it fades.
        double flash = 0;
        for (StarSpec star : stars) {
            double since = t - star.impactTick();
            // Smaller stars flash less, so a rapid volley doesn't white out the screen.
            if (since >= 0 && since < 14) flash = Math.max(flash, (1 - since / 14) * Math.min(1, star.radius() / 12));
        }
        if (flash > 0) {
            int tint = flash > 0.6 ? 0xFFFFFF : type.color;
            ctx.fill(0, 0, w, h, argb(flash * 0.95, tint));
        }
        double igniteGlow = 1 - Math.abs(t - type.igniteTick) / 6;
        if (igniteGlow > 0) ctx.fill(0, 0, w, h, argb(igniteGlow * 0.35, 0xFFF6D0));

        // Vignette.
        int vg = h / 3;
        ctx.fillGradient(0, 0, w, vg, 0x88000000, 0x00000000);
        ctx.fillGradient(0, h - vg, w, h, 0x00000000, 0x88000000);

        // Letterbox bars slide in and out.
        double in = smooth(progress(t, 0, 10));
        double out = smooth(progress(t, type.duration - 15, type.duration));
        int bar = (int) (h * 0.11 * in * (1 - out));
        ctx.fill(0, 0, w, bar, 0xFF000000);
        ctx.fill(0, h - bar, w, h, 0xFF000000);
        if (bar > 10) {
            ctx.drawTextWithShadow(font, Text.translatable("cutscene.starfall.studio"), 8, bar / 2 - 4, 0xFF8A93A8);
            Text skip = Text.translatable("cutscene.starfall.skip", StarfallClient.skipKeyName());
            ctx.drawTextWithShadow(font, skip, w - font.getWidth(skip) - 8, h - bar / 2 - 4, 0xFF8A93A8);
        }

        // Title card: the attack's name types itself out during the wind-up.
        double titleIn = 6, titleOut = type.igniteTick + 22;
        if (t > titleIn && t < titleOut) {
            double alpha = Math.min(1, (titleOut - t) / 8);
            String name = Text.translatable("cutscene.starfall." + type.key).getString();
            int shown = Math.min(name.length(), (int) ((t - titleIn) / 1.3));
            String typed = name.substring(0, shown);
            int y = h - bar - 46;
            ctx.getMatrices().push();
            ctx.getMatrices().translate(w / 2f, y, 0);
            ctx.getMatrices().scale(3f, 3f, 1f);
            ctx.drawCenteredTextWithShadow(font, typed, 0, 0, argb(alpha, 0xFFF6D0));
            ctx.getMatrices().pop();
            String kanji = Text.translatable("cutscene.starfall." + type.key + ".jp").getString();
            ctx.getMatrices().push();
            ctx.getMatrices().translate(w / 2f, y - 16, 0);
            ctx.getMatrices().scale(1.5f, 1.5f, 1f);
            ctx.drawCenteredTextWithShadow(font, kanji, 0, 0, argb(alpha * smooth(progress(t, titleIn + 8, titleIn + 16)), type.color));
            ctx.getMatrices().pop();
            int lineW = (int) (Math.min(1, (t - titleIn) / 12) * 120);
            ctx.fill(w / 2 - lineW, y + 30, w / 2 + lineW, y + 31, argb(alpha, type.color));
        }

        // Countdown to impact while the star falls.
        if (t > type.igniteTick && t < lastImpact) {
            double secs = (lastImpact - t) / 20.0;
            String c = String.format("T-%05.2f", secs);
            ctx.drawCenteredTextWithShadow(font, c, w / 2, bar + 8, argb(0.85, 0xFF5A5A));
        }
    }
}
