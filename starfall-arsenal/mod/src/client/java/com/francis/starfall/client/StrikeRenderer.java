package com.francis.starfall.client;

import com.francis.starfall.Starfall;
import com.francis.starfall.entity.StrikeEntity;
import com.francis.starfall.strike.StrikePlan;
import com.francis.starfall.strike.StrikeType;
import net.minecraft.client.render.Frustum;
import net.minecraft.client.render.LightmapTextureManager;
import net.minecraft.client.render.OverlayTexture;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.RenderLayers;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.command.OrderedRenderCommandQueue;
import net.minecraft.client.render.entity.EntityRenderer;
import net.minecraft.client.render.entity.EntityRendererFactory;
import net.minecraft.client.render.entity.state.EntityRenderState;
import net.minecraft.client.render.state.CameraRenderState;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.entity.Entity;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RotationAxis;
import net.minecraft.util.math.Vec3d;
import org.joml.Quaternionf;

/**
 * Draws every strike with additive, full-bright quads: stars (halo, core and
 * spinning sparkles), camera-facing beams and tails, flat rings on the ground
 * and expanding shells. Each weapon gets its own look.
 */
public class StrikeRenderer extends EntityRenderer<StrikeEntity, StrikeRenderer.State> {
    private static final Identifier GLOW = Starfall.id("textures/entity/glow.png");
    private static final Identifier SPARKLE = Starfall.id("textures/entity/sparkle.png");
    private static final Identifier RING = Starfall.id("textures/entity/ring.png");
    private static final int LIGHT = LightmapTextureManager.MAX_LIGHT_COORDINATE;
    /** Far objects are drawn at this distance and scaled down to match, so fog can't swallow them. */
    private static final double MAX_DRAW_DISTANCE = 48;

    public static class State extends EntityRenderState {
        StrikeType type = StrikeType.ORBITAL_LANCE;
        StrikePlan plan;
        float t;
        Vec3d base = Vec3d.ZERO;
        Vec3d owner;
        Vec3d ownerVelocity = Vec3d.ZERO;
        int slamTick = -1;
        Vec3d slamPos = Vec3d.ZERO;
        double lanceGround;
        double lanceEndGround;
    }

    /** Everything a draw call needs, gathered once per frame. */
    private record Ctx(MatrixStack matrices, OrderedRenderCommandQueue queue, Vec3d base, Vec3d cam, Quaternionf facing) {
    }

    public StrikeRenderer(EntityRendererFactory.Context ctx) {
        super(ctx);
    }

    @Override
    public State createRenderState() {
        return new State();
    }

    @Override
    public boolean shouldRender(StrikeEntity entity, Frustum frustum, double x, double y, double z) {
        return true;
    }

    @Override
    public void updateRenderState(StrikeEntity entity, State state, float tickDelta) {
        super.updateRenderState(entity, state, tickDelta);
        state.type = entity.strikeType();
        state.plan = entity.plan();
        state.t = entity.strikeTime(tickDelta);
        state.base = entity.getLerpedPos(tickDelta);
        Entity owner = entity.owner();
        state.owner = owner != null ? owner.getLerpedPos(tickDelta) : null;
        state.ownerVelocity = owner != null ? owner.getVelocity() : Vec3d.ZERO;
        state.slamTick = entity.slamTick();
        state.slamPos = entity.slamPos();
        if (state.type == StrikeType.ORBITAL_LANCE) {
            Vec3d p = state.plan.lancePoint(state.t);
            state.lanceGround = StrikeEntity.groundY(entity.getEntityWorld(), p.x, p.z);
            Vec3d e = state.plan.lancePoint(StrikePlan.LANCE_END);
            state.lanceEndGround = StrikeEntity.groundY(entity.getEntityWorld(), e.x, e.z);
        }
    }

    @Override
    public void render(State s, MatrixStack matrices, OrderedRenderCommandQueue queue, CameraRenderState camera) {
        if (s.plan == null) return;
        Ctx c = new Ctx(matrices, queue, s.base, camera.pos, camera.orientation);
        float r = ((s.type.color >> 16) & 255) / 255f, g = ((s.type.color >> 8) & 255) / 255f, b = (s.type.color & 255) / 255f;
        float t = s.t;
        StrikePlan plan = s.plan;
        switch (s.type) {
            case ORBITAL_LANCE -> {
                Vec3d target = plan.target;
                if (t < StrikePlan.LANCE_FIRE + 6) {
                    // Targeting reticle locking on.
                    float lock = (float) StrikePlan.progress(t, 0, StrikePlan.LANCE_FIRE);
                    float pulse = 0.6f + 0.4f * MathHelper.sin(t * 0.8f);
                    Vec3d ground = target.add(0, 0.15, 0);
                    flat(c, RING, ground, 18 - 12 * lock, t * 4, r * pulse, g * pulse, b * pulse);
                    flat(c, SPARKLE, ground, 6 - 2 * lock, -t * 6, r, g, b);
                }
                Vec3d sat = plan.lanceSatellite();
                if (t > 15) {
                    float on = (float) StrikePlan.progress(t, 15, 35);
                    star(c, sat, 6 * on, t, r, g, b);
                }
                if (plan.lanceFiring(t)) {
                    Vec3d p = plan.lancePoint(t);
                    Vec3d ground = new Vec3d(p.x, s.lanceGround, p.z);
                    float warm = (float) StrikePlan.progress(t, StrikePlan.LANCE_FIRE, StrikePlan.LANCE_FIRE + 4);
                    beam(c, sat, ground, 4.5 * warm, r, g, b, r, g, b);
                    beam(c, sat, ground, 1.6 * warm, 1, 1, 1, 1, 1, 1);
                    billboard(c, GLOW, ground.add(0, 0.8, 0), 12, 0, r, g, b);
                    billboard(c, GLOW, ground.add(0, 0.8, 0), 5, 0, 1, 1, 1);
                    float ripple = (t * 0.25f) % 1f;
                    float k = 1 - ripple;
                    flat(c, RING, ground.add(0, 0.3, 0), 4 + ripple * 14, 0, r * k, g * k, b * k);
                }
                Vec3d e = plan.lancePoint(StrikePlan.LANCE_END);
                aftermath(c, new Vec3d(e.x, s.lanceEndGround, e.z), 6.5, t - StrikePlan.LANCE_END, r, g, b);
            }
            case COMET_DASH -> {
                if (s.owner != null && t >= StrikePlan.DASH_START - 6 && s.slamTick < 0) {
                    float on = (float) StrikePlan.progress(t, StrikePlan.DASH_START - 6, StrikePlan.DASH_START);
                    Vec3d core = s.owner.add(0, 1, 0);
                    Vec3d dir = s.ownerVelocity.lengthSquared() > 0.04 ? s.ownerVelocity.normalize() : plan.fwd;
                    if (t >= StrikePlan.DASH_START) tail(c, core, dir, 1.6, 14, r, g, b);
                    billboard(c, GLOW, core, 5 * on, 0, r, g, b);
                    billboard(c, GLOW, core, 2 * on, 0, 1, 1, 1);
                    billboard(c, SPARKLE, core, 4 * on, t * 9, 1, 1, 1);
                }
                if (s.slamTick >= 0) {
                    aftermath(c, s.slamPos, 5.5, t - s.slamTick, r, g, b);
                }
            }
            case CONSTELLATION -> {
                int n = StrikePlan.constStars();
                for (int i = 0; i < n; i++) {
                    if (!plan.constStarVisible(i, t)) continue;
                    Vec3d p = plan.constPos(i, t);
                    float grow = (float) StrikePlan.progress(t, plan.constArrive(i) - 34, plan.constArrive(i) - 24);
                    float pr = i % 2 == 0 ? 1f : r, pg = i % 2 == 0 ? 0.55f : g, pb = i % 2 == 0 ? 0.9f : b;
                    star(c, p, 2.2f * grow, t + i * 7, pr, pg, pb);
                    if (t < plan.constArrive(i)) {
                        tail(c, p, plan.constPos(i, t + 1).subtract(p).normalize(), 0.9, 16, pr, pg, pb);
                    } else if (t >= StrikePlan.CONST_CONVERGE) {
                        tail(c, p, plan.target.subtract(p).normalize(), 1.0, 10, 1, 1, 1);
                    }
                }
                for (int i = 0; i < n - 1; i++) {
                    float lit = (float) plan.constLine(i, t);
                    if (lit <= 0 || t >= StrikePlan.CONST_CONVERGE + 6) continue;
                    float k = lit * (t >= StrikePlan.CONST_CONVERGE ? 1 - (t - StrikePlan.CONST_CONVERGE) / 6f : 1);
                    beam(c, plan.constPos(i, t), plan.constPos(i + 1, t), 0.7, r * k, g * k, b * k, r * k, g * k, b * k);
                    beam(c, plan.constPos(i, t), plan.constPos(i + 1, t), 0.25, k, k, k, k, k, k);
                }
                if (t >= StrikePlan.CONST_LINES + 40 && t < StrikePlan.CONST_IMPLODE) {
                    float on = (float) StrikePlan.progress(t, StrikePlan.CONST_LINES + 40, StrikePlan.CONST_LINES + 55);
                    Vec3d ground = plan.target.add(0, 0.2, 0);
                    flat(c, RING, ground, (float) StrikePlan.CONST_PULL_RADIUS * 2, t * 3, r * on * 0.6f, g * on * 0.6f, b * on * 0.6f);
                    flat(c, RING, ground, 22, -t * 5, r * on, g * on, b * on);
                    flat(c, SPARKLE, ground, 14, t * 8, on, on, on);
                }
                aftermath(c, plan.target, StrikePlan.CONST_BLAST, t - StrikePlan.CONST_IMPLODE, r, g, b);
            }
            case SUPERNOVA -> {
                Vec3d center = plan.novaCenter();
                double size = plan.novaSize(t);
                if (size > 0) {
                    boolean collapsing = t >= StrikePlan.NOVA_COLLAPSE;
                    float hot = collapsing ? 1 : 0.85f;
                    billboard(c, GLOW, center, (float) size * 5, 0, r * hot, g * hot * 0.7f, b * hot * 0.5f);
                    billboard(c, GLOW, center, (float) size * 1.8f, 0, 1, collapsing ? 1 : 0.85f, collapsing ? 1 : 0.6f);
                    billboard(c, SPARKLE, center, (float) size * 4, t * 3, 1, 0.9f, 0.7f);
                    if (t >= StrikePlan.NOVA_APPEAR && !collapsing) {
                        // Tilted accretion disc.
                        disc(c, center, (float) size * 6, 70, t * 7, r, g * 0.8f, b * 0.6f);
                        disc(c, center, (float) size * 8.5f, 70, -t * 4, r * 0.5f, g * 0.3f, b * 0.6f);
                    }
                }
                float a = t - StrikePlan.NOVA;
                if (a >= 0 && a < 40) {
                    // The nova: an expanding shell of light.
                    float k = 1 - a / 40f;
                    float shell = (float) (StrikePlan.NOVA_RADIUS * (0.3 + a / 7.0));
                    billboard(c, GLOW, center, shell * 2.6f, 0, k, k * 0.8f, k * 0.6f);
                    for (int i = 0; i < 3; i++) {
                        sphereRing(c, center, shell * 2, i, k * r, k * g, k * b);
                    }
                }
                aftermath(c, plan.target, 12, a, r, g, b);
            }
        }
    }

    // ------------------------------------------------------------ pieces ---

    /** Fireball, ground shockwave and a pillar of light that fade after an impact. */
    private void aftermath(Ctx c, Vec3d at, double radius, float a, float r, float g, float b) {
        if (a < 0 || a > 40) return;
        float rad = (float) radius;
        float fire = MathHelper.clamp(1 - a / 30f, 0, 1);
        fire *= fire;
        if (fire > 0) {
            float size = rad * (1.6f + a / 8f);
            billboard(c, GLOW, at.add(0, rad * 0.3, 0), size * 2.2f, 0, fire * r, fire * g * 0.8f, fire * b * 0.5f);
            billboard(c, GLOW, at.add(0, rad * 0.3, 0), size, 0, fire, fire, fire * 0.9f);
        }
        float ring = MathHelper.clamp(1 - a / 25f, 0, 1);
        if (ring > 0) flat(c, RING, at.add(0, 0.6, 0), rad * (1.5f + a * 0.55f), 0, ring, ring, ring);
        float pillar = MathHelper.clamp(1 - a / 18f, 0, 1);
        if (pillar > 0) beam(c, at, at.add(0, 160, 0), rad * 0.5 * pillar, pillar * r, pillar * g, pillar * b, 0, 0, 0);
    }

    /** A star: halo, white core and two counter-spinning sparkles. */
    private void star(Ctx c, Vec3d p, float size, float t, float r, float g, float b) {
        if (size <= 0) return;
        billboard(c, GLOW, p, size * 6, 0, r * 0.7f, g * 0.7f, b * 0.7f);
        billboard(c, GLOW, p, size * 1.8f, 0, 1, 1, 1);
        billboard(c, SPARKLE, p, size * 5, t * 5, 1, 1, 0.9f);
        billboard(c, SPARKLE, p, size * 3, 45 - t * 11, r, g, b);
    }

    /** Pushes the matrices to world point p, pulling far points in (and shrinking them) so fog can't hide them. */
    private static void moveTo(Ctx c, Vec3d p) {
        Vec3d rel = p.subtract(c.cam);
        double dist = rel.length();
        if (dist > MAX_DRAW_DISTANCE) {
            float k = (float) (MAX_DRAW_DISTANCE / dist);
            Vec3d near = c.cam.add(rel.multiply(k));
            c.matrices.translate(near.x - c.base.x, near.y - c.base.y, near.z - c.base.z);
            c.matrices.scale(k, k, k);
        } else {
            c.matrices.translate(p.x - c.base.x, p.y - c.base.y, p.z - c.base.z);
        }
    }

    private void billboard(Ctx c, Identifier tex, Vec3d p, float size, float spin, float r, float g, float b) {
        if (size <= 0) return;
        c.matrices.push();
        moveTo(c, p);
        c.matrices.multiply(c.facing);
        if (spin != 0) c.matrices.multiply(RotationAxis.POSITIVE_Z.rotationDegrees(spin));
        quad(c, tex, size, r, g, b);
        c.matrices.pop();
    }

    /** A horizontal quad lying on the ground (visible from above and below). */
    private void flat(Ctx c, Identifier tex, Vec3d p, float size, float spin, float r, float g, float b) {
        c.matrices.push();
        c.matrices.translate(p.x - c.base.x, p.y - c.base.y, p.z - c.base.z);
        c.matrices.multiply(RotationAxis.POSITIVE_Y.rotationDegrees(spin));
        c.matrices.multiply(RotationAxis.POSITIVE_X.rotationDegrees(90));
        quad(c, tex, size, r, g, b);
        c.matrices.multiply(RotationAxis.POSITIVE_X.rotationDegrees(180));
        quad(c, tex, size, r, g, b);
        c.matrices.pop();
    }

    /** A spinning ring tilted around the star, like an accretion disc. */
    private void disc(Ctx c, Vec3d p, float size, float tilt, float spin, float r, float g, float b) {
        c.matrices.push();
        moveTo(c, p);
        c.matrices.multiply(RotationAxis.POSITIVE_X.rotationDegrees(tilt));
        c.matrices.multiply(RotationAxis.POSITIVE_Z.rotationDegrees(spin));
        quad(c, RING, size, r, g, b);
        c.matrices.multiply(RotationAxis.POSITIVE_X.rotationDegrees(180));
        quad(c, RING, size, r, g, b);
        c.matrices.pop();
    }

    private void sphereRing(Ctx c, Vec3d p, float size, int axis, float r, float g, float b) {
        c.matrices.push();
        c.matrices.translate(p.x - c.base.x, p.y - c.base.y, p.z - c.base.z);
        if (axis == 1) c.matrices.multiply(RotationAxis.POSITIVE_X.rotationDegrees(90));
        if (axis == 2) c.matrices.multiply(RotationAxis.POSITIVE_Y.rotationDegrees(90));
        quad(c, RING, size, r, g, b);
        c.matrices.multiply(RotationAxis.POSITIVE_Y.rotationDegrees(180));
        quad(c, RING, size, r, g, b);
        c.matrices.pop();
    }

    /** A camera-facing strip from a to b, fading from one colour to the other. */
    private void beam(Ctx c, Vec3d a, Vec3d b, double width, float r0, float g0, float b0, float r1, float g1, float b1) {
        if (width <= 0) return;
        Vec3d dir = b.subtract(a);
        Vec3d sa = sideways(dir, c.cam.subtract(a)).multiply(width / 2);
        Vec3d sb = sideways(dir, c.cam.subtract(b)).multiply(width / 2);
        Vec3d ra = a.subtract(c.base), rb = b.subtract(c.base);
        float[] ca = {r0, g0, b0}, cb = {r1, g1, b1};
        c.queue.submitCustom(c.matrices, layer(GLOW), (entry, vc) -> strip(vc, entry, ra.add(sa), ra.subtract(sa), rb.subtract(sb), rb.add(sb), ca, cb));
    }

    /** A tapering, fading comet tail behind a moving head. */
    private void tail(Ctx c, Vec3d head, Vec3d dir, double width, double length, float r, float g, float b) {
        int n = 12;
        for (int i = 0; i < n; i++) {
            double f0 = i / (double) n, f1 = (i + 1) / (double) n;
            Vec3d p0 = head.subtract(dir.multiply(length * f0)), p1 = head.subtract(dir.multiply(length * f1));
            float k0 = (float) (Math.pow(1 - f0, 1.5) * nearFade(p0, c.cam)), k1 = (float) (Math.pow(1 - f1, 1.5) * nearFade(p1, c.cam));
            double w0 = width * Math.pow(1 - f0, 0.7) * 2, w1 = width * Math.pow(1 - f1, 0.7) * 2;
            Vec3d s0 = sideways(dir, c.cam.subtract(p0)).multiply(w0 / 2), s1 = sideways(dir, c.cam.subtract(p1)).multiply(w1 / 2);
            Vec3d q0 = p0.subtract(c.base), q1 = p1.subtract(c.base);
            float[] c0 = {r * k0, g * k0, b * k0}, c1 = {r * k1, g * k1, b * k1};
            c.queue.submitCustom(c.matrices, layer(GLOW), (entry, vc) -> strip(vc, entry, q0.add(s0), q0.subtract(s0), q1.subtract(s1), q1.add(s1), c0, c1));
        }
    }

    /** A two-sided quad strip segment, so it shows whichever way it faces. */
    private static void strip(VertexConsumer vc, MatrixStack.Entry entry, Vec3d a0, Vec3d a1, Vec3d b1, Vec3d b0, float[] ca, float[] cb) {
        vertex(vc, entry, a0, ca, 0, 0.5f);
        vertex(vc, entry, a1, ca, 1, 0.5f);
        vertex(vc, entry, b1, cb, 1, 0.5f);
        vertex(vc, entry, b0, cb, 0, 0.5f);
        vertex(vc, entry, b0, cb, 0, 0.5f);
        vertex(vc, entry, b1, cb, 1, 0.5f);
        vertex(vc, entry, a1, ca, 1, 0.5f);
        vertex(vc, entry, a0, ca, 0, 0.5f);
    }

    private static double nearFade(Vec3d p, Vec3d cam) {
        return MathHelper.clamp((p.distanceTo(cam) - 6) / 14, 0, 1);
    }

    private static Vec3d sideways(Vec3d dir, Vec3d toCam) {
        Vec3d s = dir.crossProduct(toCam);
        return s.lengthSquared() < 1e-6 ? new Vec3d(1, 0, 0) : s.normalize();
    }

    /** A square in the current XY plane, centred on the origin. */
    private static void quad(Ctx c, Identifier tex, float size, float r, float g, float b) {
        float h = size / 2;
        float[] col = {r, g, b};
        c.queue.submitCustom(c.matrices, layer(tex), (entry, vc) -> {
            vertex(vc, entry, new Vec3d(-h, -h, 0), col, 0, 1);
            vertex(vc, entry, new Vec3d(h, -h, 0), col, 1, 1);
            vertex(vc, entry, new Vec3d(h, h, 0), col, 1, 0);
            vertex(vc, entry, new Vec3d(-h, h, 0), col, 0, 0);
        });
    }

    /** Translucent, full-bright and without depth writes, so overlapping glows never cut into each other. */
    private static RenderLayer layer(Identifier tex) {
        return RenderLayers.beaconBeam(tex, true);
    }

    /**
     * Colours arrive "premultiplied" (dimmer = fading out). The layer blends by
     * alpha, so split them into a full-strength hue and an alpha.
     */
    private static void vertex(VertexConsumer vc, MatrixStack.Entry entry, Vec3d p, float[] c, float u, float v) {
        float r = MathHelper.clamp(c[0], 0, 1), g = MathHelper.clamp(c[1], 0, 1), b = MathHelper.clamp(c[2], 0, 1);
        float a = Math.max(r, Math.max(g, b));
        float k = a > 1e-3f ? 1 / a : 0;
        vc.vertex(entry, (float) p.x, (float) p.y, (float) p.z)
                .color(r * k, g * k, b * k, a)
                .texture(u, v)
                .overlay(OverlayTexture.DEFAULT_UV)
                .light(LIGHT)
                .normal(entry, 0, 1, 0);
    }
}
