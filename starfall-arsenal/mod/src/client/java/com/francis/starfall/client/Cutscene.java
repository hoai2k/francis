package com.francis.starfall.client;

import com.francis.starfall.entity.StrikeEntity;
import com.francis.starfall.strike.StrikePlan;
import com.francis.starfall.strike.StrikeType;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.Perspective;
import net.minecraft.text.Text;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import org.jetbrains.annotations.Nullable;

import static com.francis.starfall.strike.StrikePlan.progress;
import static com.francis.starfall.strike.StrikePlan.smooth;

/**
 * The film. Each weapon has its own shot list, choreographed around its
 * strike's timeline, then the camera blends smoothly back to the player.
 * For the Comet Dash the film also drives the caster's own movement.
 */
public final class Cutscene {
    public record Shot(Vec3d pos, float yaw, float pitch) {
    }

    private static final float RAD = MathHelper.DEGREES_PER_RADIAN;
    private static final int BLEND_OUT = 20;
    private static final Vec3d UP = new Vec3d(0, 1, 0);

    @Nullable private static Cutscene current;

    private final StrikeType type;
    private final StrikePlan plan;
    private final Vec3d eye;
    private final Perspective savedPerspective;
    private final float lockYaw, lockPitch;
    private int ticks;
    /** Comet Dash: when the caster hit the ground, and where. */
    private int slamTick = -1;
    private Vec3d slamPos = Vec3d.ZERO;

    private Cutscene(MinecraftClient client, StrikeType type, Vec3d origin, Vec3d target) {
        this.type = type;
        this.plan = new StrikePlan(type, origin, target);
        this.eye = origin.add(0, 1.62, 0);
        this.savedPerspective = client.options.getPerspective();
        // Face the action (the dash goes where the player looks).
        this.lockYaw = (float) (MathHelper.atan2(plan.fwd.z, plan.fwd.x) * RAD) - 90f;
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
        var player = client.player;
        if (player == null || !player.isAlive()) {
            stop(client);
            return;
        }
        player.setYaw(lockYaw);
        player.setBodyYaw(lockYaw);
        player.setHeadYaw(lockYaw);
        player.setPitch(type == StrikeType.COMET_DASH ? 10 : lockPitch);
        if (type == StrikeType.COMET_DASH) dash(player);
        if (++ticks >= type.duration) {
            stop(client);
        }
    }

    /** The caster *is* the comet: charge, leap, slam. Movement is client-driven like normal walking. */
    private void dash(net.minecraft.client.network.ClientPlayerEntity player) {
        int t = ticks;
        Vec3d f = plan.fwd;
        Vec3d v = player.getVelocity();
        if (t >= StrikePlan.DASH_START && t < StrikePlan.DASH_LEAP) {
            double y = player.horizontalCollision ? 0.55 : Math.min(v.y, 0.1);
            player.setVelocity(f.x * StrikePlan.DASH_SPEED, y, f.z * StrikePlan.DASH_SPEED);
        } else if (t == StrikePlan.DASH_LEAP) {
            player.setVelocity(f.x * 0.9, 1.15, f.z * 0.9);
        } else if (t > StrikePlan.DASH_LEAP && t < StrikePlan.DASH_SLAM) {
            player.setVelocity(f.x * 0.9, v.y, f.z * 0.9);
        } else if (t == StrikePlan.DASH_SLAM) {
            player.setVelocity(f.x * 0.25, -2.8, f.z * 0.25);
        }
        if (slamTick < 0 && t > StrikePlan.DASH_LEAP + 4 && player.isOnGround()) {
            slamTick = t;
            slamPos = player.getEntityPos();
        }
    }

    private float time(float tickDelta) {
        return ticks + tickDelta;
    }

    // ------------------------------------------------------------ camera ---

    private static double groundY(double x, double z) {
        MinecraftClient client = MinecraftClient.getInstance();
        return client.world == null ? 64 : StrikeEntity.groundY(client.world, x, z);
    }

    private Vec3d around(Vec3d center, double angle, double dist) {
        Vec3d dir = plan.back.multiply(Math.cos(angle)).add(plan.side.multiply(Math.sin(angle)));
        return center.add(dir.multiply(dist));
    }

    /** Opening shot shared by the ranged weapons: a slow arc across the caster's face. */
    private Vec3d[] heroCloseUp(double t, double end) {
        double u = smooth(progress(t, 0, end));
        Vec3d cam = eye.add(plan.fwd.multiply(2.6 - u * 0.6)).add(plan.side.multiply(1.4 - 2.6 * u)).add(0, -0.5 + 0.3 * u, 0);
        return new Vec3d[]{cam, eye.add(0, -0.1 + 0.5 * u, 0)};
    }

    private Vec3d[] script(double t, Vec3d playerPos) {
        Vec3d target = plan.target, side = plan.side, back = plan.back, fwd = plan.fwd;
        switch (type) {
            case ORBITAL_LANCE -> {
                if (t < 25) return heroCloseUp(t, 25);
                if (t < StrikePlan.LANCE_FIRE) {
                    // Lock-on: straight down onto the targeting reticle.
                    double u = smooth(progress(t, 25, StrikePlan.LANCE_FIRE));
                    return new Vec3d[]{target.add(back.multiply(6)).add(0, 30 - u * 8, 0), target};
                }
                if (t < StrikePlan.LANCE_FIRE + 12) {
                    // Looking up the beam as it fires.
                    Vec3d g = target.add(fwd.multiply(-StrikePlan.LANCE_HALF_LENGTH));
                    Vec3d cam = g.add(side.multiply(9)).add(back.multiply(6)).add(0, 1.5, 0);
                    cam = new Vec3d(cam.x, groundY(cam.x, cam.z) + 1.5, cam.z);
                    return new Vec3d[]{cam, plan.lanceSatellite().lerp(g, 0.85)};
                }
                if (t < StrikePlan.LANCE_END) {
                    // Tracking shot alongside the trench as it is burned in.
                    Vec3d p = plan.lancePoint(t);
                    Vec3d g = new Vec3d(p.x, groundY(p.x, p.z), p.z);
                    Vec3d cam = g.add(side.multiply(12)).add(fwd.multiply(-5));
                    cam = new Vec3d(cam.x, Math.max(g.y + 5, groundY(cam.x, cam.z) + 4), cam.z);
                    return new Vec3d[]{cam, g.add(0, 1, 0)};
                }
                double u = smooth(progress(t, StrikePlan.LANCE_END, type.duration));
                return new Vec3d[]{target.add(side.multiply(26)).add(back.multiply(12)).add(0, 14 + u * 12, 0), target};
            }
            case COMET_DASH -> {
                if (t < StrikePlan.DASH_START) {
                    return new Vec3d[]{eye.add(fwd.multiply(2.2)).add(side.multiply(0.9)).add(0, -0.7, 0), eye.add(0, -0.2, 0)};
                }
                if (slamTick >= 0 && t >= slamTick) {
                    double u = smooth(progress(t, slamTick, type.duration));
                    return new Vec3d[]{slamPos.add(side.multiply(11)).add(back.multiply(7)).add(0, 4 + u * 6, 0), slamPos};
                }
                if (t < StrikePlan.DASH_LEAP) {
                    // Side-on tracking shot at full speed.
                    return new Vec3d[]{playerPos.add(side.multiply(5)).add(fwd.multiply(-1.5)).add(0, 1.2, 0),
                            playerPos.add(fwd.multiply(3)).add(0, 1, 0)};
                }
                // Low angle under the leap, riding along with the caster.
                return new Vec3d[]{playerPos.add(side.multiply(7)).add(fwd.multiply(4)).add(0, -2, 0), playerPos.add(0, 1, 0)};
            }
            case CONSTELLATION -> {
                if (t < 30) return heroCloseUp(t, 30);
                Vec3d sky = target.add(0, 14, 0);
                if (t < StrikePlan.CONST_LINES) {
                    // Low angle: the stars come down into their places.
                    double u = progress(t, 30, StrikePlan.CONST_LINES);
                    return new Vec3d[]{target.add(back.multiply(28 - u * 4)).add(side.multiply(-8)).add(0, 2, 0), sky};
                }
                if (t < StrikePlan.CONST_LINES + 45) {
                    // Orbit while the constellation lines light up.
                    double a = (t - StrikePlan.CONST_LINES) * 0.02;
                    return new Vec3d[]{around(target, a, 30).add(0, 10, 0), sky.add(0, -2, 0)};
                }
                if (t < StrikePlan.CONST_IMPLODE) {
                    // Straight down into the vortex.
                    return new Vec3d[]{target.add(back.multiply(4)).add(0, 40, 0), target};
                }
                double u = smooth(progress(t, StrikePlan.CONST_IMPLODE, type.duration));
                return new Vec3d[]{target.add(side.multiply(22)).add(back.multiply(16)).add(0, 10 + u * 10, 0), target};
            }
            case SUPERNOVA -> {
                Vec3d c = plan.novaCenter();
                if (t < 40) return heroCloseUp(t, 40);
                if (t < StrikePlan.NOVA_APPEAR) {
                    // Over the shoulder as the star ignites above the target.
                    return new Vec3d[]{eye.add(back.multiply(3)).add(side.multiply(1)).add(0, 0.4, 0), c};
                }
                if (t < 110) {
                    // Dread shot from the ground while the earth is torn upward.
                    Vec3d cam = target.add(back.multiply(30)).add(side.multiply(10));
                    return new Vec3d[]{new Vec3d(cam.x, groundY(cam.x, cam.z) + 1.5, cam.z), c};
                }
                if (t < StrikePlan.NOVA_COLLAPSE) {
                    // Close orbit around the black hole.
                    double a = (t - 110) * 0.03;
                    return new Vec3d[]{around(c, a, 18).add(0, 4, 0), c};
                }
                if (t < StrikePlan.NOVA) {
                    double u = progress(t, StrikePlan.NOVA_COLLAPSE, StrikePlan.NOVA);
                    return new Vec3d[]{c.add(back.multiply(14 - u * 8)).add(0, 1, 0), c};
                }
                double u = smooth(progress(t, StrikePlan.NOVA, type.duration));
                return new Vec3d[]{target.add(side.multiply(55)).add(back.multiply(40)).add(0, 26 + u * 14, 0), target};
            }
        }
        return new Vec3d[]{eye, target};
    }

    private int impactTick() {
        return type == StrikeType.COMET_DASH ? (slamTick >= 0 ? slamTick : 10_000) : type.impactTick;
    }

    private double shake(double t) {
        double since = t - impactTick();
        double s = since >= 0 && since < 30 ? (1 - since / 30) * (type == StrikeType.SUPERNOVA ? 3 : 1.4) : 0;
        switch (type) {
            case ORBITAL_LANCE -> s += t >= StrikePlan.LANCE_FIRE && t < StrikePlan.LANCE_END ? 0.25 : 0;
            case CONSTELLATION -> s += t > StrikePlan.CONST_LINES + 40 && t < StrikePlan.CONST_IMPLODE ? 0.15 : 0;
            case SUPERNOVA -> s += plan.novaPulling(t) ? 0.05 + 0.4 * progress(t, StrikePlan.NOVA_APPEAR, StrikePlan.NOVA) : 0;
            default -> {
            }
        }
        return s;
    }

    public Shot camera(float tickDelta, Vec3d vanillaPos, float vanillaYaw, float vanillaPitch) {
        double t = time(tickDelta);
        MinecraftClient client = MinecraftClient.getInstance();
        Vec3d playerPos = client.player != null ? client.player.getLerpedPos(tickDelta) : plan.origin;
        Vec3d[] s = script(t, playerPos);
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
        double lens = switch (type) {
            case ORBITAL_LANCE -> t < 25 ? 50 : t < StrikePlan.LANCE_FIRE ? 55 : t < StrikePlan.LANCE_FIRE + 12 ? 45 : 72;
            case COMET_DASH -> t < StrikePlan.DASH_START ? 50 : slamTick >= 0 && t >= slamTick ? 66 : t < StrikePlan.DASH_LEAP ? 95 : 75;
            case CONSTELLATION -> t < 30 ? 50 : 70;
            case SUPERNOVA -> t < 40 ? 50 : t < StrikePlan.NOVA_APPEAR ? 40 : t < StrikePlan.NOVA_COLLAPSE ? 78
                    : t < StrikePlan.NOVA ? MathHelper.lerp(progress(t, StrikePlan.NOVA_COLLAPSE, StrikePlan.NOVA), 45, 28) : 70;
        };
        double since = t - impactTick();
        if (since >= 0 && since < 8) lens -= (1 - since / 8) * 10;
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

        // The black hole drinks the light out of the sky.
        if (type == StrikeType.SUPERNOVA && plan.novaPulling(t)) {
            ctx.fill(0, 0, w, h, argb(0.4 * progress(t, StrikePlan.NOVA_APPEAR, StrikePlan.NOVA_COLLAPSE), 0x05000F));
        }
        double since = t - impactTick();
        double flash = since >= 0 && since < 14 ? 1 - since / 14 : 0;
        if (type == StrikeType.ORBITAL_LANCE) {
            flash = Math.max(flash, 0.35 * (1 - Math.abs(t - StrikePlan.LANCE_FIRE) / 4));
        }
        if (flash > 0) {
            ctx.fill(0, 0, w, h, argb(flash * 0.95, flash > 0.6 ? 0xFFFFFF : type.color));
        }

        int vg = h / 3;
        ctx.fillGradient(0, 0, w, vg, 0x88000000, 0x00000000);
        ctx.fillGradient(0, h - vg, w, h, 0x00000000, 0x88000000);

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

        // Title card: the skill's name types itself out during the wind-up.
        double titleIn = 4, titleOut = Math.max(type.igniteTick + 22, 34);
        if (t > titleIn && t < titleOut) {
            double alpha = Math.min(1, (titleOut - t) / 8);
            String name = Text.translatable("cutscene.starfall." + type.key).getString();
            int shown = Math.min(name.length(), (int) ((t - titleIn) / 1.1));
            int y = h - bar - 46;
            ctx.getMatrices().pushMatrix();
            ctx.getMatrices().translate(w / 2f, y);
            ctx.getMatrices().scale(3f, 3f);
            ctx.drawCenteredTextWithShadow(font, name.substring(0, shown), 0, 0, argb(alpha, 0xFFF6D0));
            ctx.getMatrices().popMatrix();
            String kanji = Text.translatable("cutscene.starfall." + type.key + ".jp").getString();
            ctx.getMatrices().pushMatrix();
            ctx.getMatrices().translate(w / 2f, y - 16);
            ctx.getMatrices().scale(1.5f, 1.5f);
            ctx.drawCenteredTextWithShadow(font, kanji, 0, 0, argb(alpha * smooth(progress(t, titleIn + 6, titleIn + 14)), type.color));
            ctx.getMatrices().popMatrix();
            int lineW = (int) (Math.min(1, (t - titleIn) / 12) * 120);
            ctx.fill(w / 2 - lineW, y + 30, w / 2 + lineW, y + 31, argb(alpha, type.color));
        }

        if (type != StrikeType.COMET_DASH && t > type.igniteTick && t < type.impactTick) {
            String c = String.format("T-%05.2f", (type.impactTick - t) / 20.0);
            ctx.drawCenteredTextWithShadow(font, c, w / 2, bar + 8, argb(0.85, 0xFF5A5A));
        }
    }
}
