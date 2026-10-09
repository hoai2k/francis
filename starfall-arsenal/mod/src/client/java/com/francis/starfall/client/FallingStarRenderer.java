package com.francis.starfall.client;

import com.francis.starfall.Starfall;
import com.francis.starfall.entity.FallingStarEntity;
import com.francis.starfall.strike.StarSpec;
import net.minecraft.client.render.Frustum;
import net.minecraft.client.render.LightmapTextureManager;
import net.minecraft.client.render.OverlayTexture;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.entity.EntityRenderer;
import net.minecraft.client.render.entity.EntityRendererFactory;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RotationAxis;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;

/**
 * Draws the star with additive, full-bright billboards: a soft halo, a white
 * core, two spinning four-point sparkles and a camera-facing comet tail.
 * After impact it becomes a fading fireball, a ground shockwave ring and a
 * pillar of light.
 */
public class FallingStarRenderer extends EntityRenderer<FallingStarEntity> {
    private static final Identifier GLOW = Starfall.id("textures/entity/glow.png");
    private static final Identifier SPARKLE = Starfall.id("textures/entity/sparkle.png");
    private static final Identifier RING = Starfall.id("textures/entity/ring.png");
    private static final int LIGHT = LightmapTextureManager.MAX_LIGHT_COORDINATE;
    /**
     * Stars high in the sky would be swallowed by distance fog, so anything
     * farther than this is drawn at this distance, scaled down to match:
     * it covers the same part of the screen but stays bright.
     */
    private static final double MAX_DRAW_DISTANCE = 48;

    public FallingStarRenderer(EntityRendererFactory.Context ctx) {
        super(ctx);
    }

    @Override
    public boolean shouldRender(FallingStarEntity entity, Frustum frustum, double x, double y, double z) {
        return true;
    }

    @Override
    public Identifier getTexture(FallingStarEntity entity) {
        return GLOW;
    }

    @Override
    public void render(FallingStarEntity star, float yaw, float tickDelta, MatrixStack matrices, VertexConsumerProvider buffers, int light) {
        StarSpec spec = star.spec();
        float t = star.strikeTime(tickDelta);
        int color = star.strikeType().color;
        float r = ((color >> 16) & 255) / 255f, g = ((color >> 8) & 255) / 255f, b = (color & 255) / 255f;
        Vec3d base = star.getLerpedPos(tickDelta);
        Vec3d cam = dispatcher.camera.getPos();

        if (t < spec.igniteTick() - 20) return;
        if (t < spec.impactTick()) {
            Vec3d p = spec.positionAt(t);
            float grow = MathHelper.clamp((t - (spec.igniteTick() - 20)) / 20f, 0f, 1f);
            float twinkle = t < spec.igniteTick() ? 1 + 0.35f * MathHelper.sin(t * 1.7f) : 1f;
            float size = spec.size() * (0.25f + 0.75f * grow) * twinkle;
            matrices.push();
            Vec3d rel = p.subtract(cam);
            double dist = rel.length();
            if (dist > MAX_DRAW_DISTANCE) {
                float k = (float) (MAX_DRAW_DISTANCE / dist);
                Vec3d near = cam.add(rel.multiply(k));
                matrices.translate(near.x - base.x, near.y - base.y, near.z - base.z);
                matrices.scale(k, k, k);
            } else {
                matrices.translate(p.x - base.x, p.y - base.y, p.z - base.z);
            }
            if (t > spec.igniteTick()) {
                tail(matrices, buffers, spec, t, p, cam, r, g, b);
            }
            matrices.multiply(dispatcher.getRotation());
            quad(matrices, buffers.getBuffer(RenderLayer.getEyes(GLOW)), size * 6, r * 0.7f, g * 0.7f, b * 0.7f);
            quad(matrices, buffers.getBuffer(RenderLayer.getEyes(GLOW)), size * 1.8f, 1, 1, 1);
            matrices.multiply(RotationAxis.POSITIVE_Z.rotationDegrees(t * 5));
            quad(matrices, buffers.getBuffer(RenderLayer.getEyes(SPARKLE)), size * 5, 1, 1, 0.9f);
            matrices.multiply(RotationAxis.POSITIVE_Z.rotationDegrees(45 - t * 11));
            quad(matrices, buffers.getBuffer(RenderLayer.getEyes(SPARKLE)), size * 3, r, g, b);
            matrices.pop();
            return;
        }

        // Aftermath.
        float a = t - spec.impactTick();
        float rad = spec.radius();
        Vec3d c = spec.end();
        matrices.push();
        matrices.translate(c.x - base.x, c.y - base.y, c.z - base.z);
        float fire = MathHelper.clamp(1 - a / 30f, 0f, 1f);
        fire *= fire;
        if (fire > 0) {
            matrices.push();
            matrices.translate(0, rad * 0.3, 0);
            matrices.multiply(dispatcher.getRotation());
            float s = rad * (1.6f + a / 8f);
            quad(matrices, buffers.getBuffer(RenderLayer.getEyes(GLOW)), s * 2.2f, fire * r, fire * g * 0.8f, fire * b * 0.5f);
            quad(matrices, buffers.getBuffer(RenderLayer.getEyes(GLOW)), s, fire, fire, fire * 0.9f);
            matrices.pop();
        }
        float ring = MathHelper.clamp(1 - a / 25f, 0f, 1f);
        if (ring > 0) {
            matrices.push();
            matrices.translate(0, 0.6, 0);
            matrices.multiply(RotationAxis.POSITIVE_X.rotationDegrees(90));
            float s = rad * (1.5f + a * 0.55f);
            VertexConsumer vc = buffers.getBuffer(RenderLayer.getEyes(RING));
            quad(matrices, vc, s, ring, ring, ring);
            matrices.multiply(RotationAxis.POSITIVE_X.rotationDegrees(180));
            quad(matrices, vc, s, ring, ring, ring);
            matrices.pop();
        }
        float pillar = MathHelper.clamp(1 - a / 18f, 0f, 1f);
        if (pillar > 0) {
            VertexConsumer vc = buffers.getBuffer(RenderLayer.getEyes(GLOW));
            float hw = rad * 0.5f * pillar;
            for (int i = 0; i < 4; i++) {
                matrices.push();
                matrices.multiply(RotationAxis.POSITIVE_Y.rotationDegrees(i * 45));
                beam(matrices, vc, hw, 160, pillar * r, pillar * g, pillar * b);
                matrices.pop();
            }
        }
        matrices.pop();
    }

    /** Camera-facing ribbon trailing behind the star. */
    private void tail(MatrixStack matrices, VertexConsumerProvider buffers, StarSpec spec, float t, Vec3d head, Vec3d cam,
                      float r, float g, float b) {
        Vec3d dir = spec.direction();
        double flown = head.distanceTo(spec.start());
        double length = Math.min(flown, spec.size() * 22);
        int n = 20;
        VertexConsumer vc = buffers.getBuffer(RenderLayer.getEyes(GLOW));
        MatrixStack.Entry entry = matrices.peek();
        Matrix4f m = entry.getPositionMatrix();
        for (int pass = 0; pass < 2; pass++) {
            float widthScale = pass == 0 ? 1.4f : 0.5f;
            for (int i = 0; i < n; i++) {
                double f0 = i / (double) n, f1 = (i + 1) / (double) n;
                Vec3d p0 = dir.multiply(-length * f0), p1 = dir.multiply(-length * f1);
                Vec3d s0 = sideways(dir, cam.subtract(head.add(p0))), s1 = sideways(dir, cam.subtract(head.add(p1)));
                float w0 = (float) (spec.size() * widthScale * Math.pow(1 - f0, 0.7));
                float w1 = (float) (spec.size() * widthScale * Math.pow(1 - f1, 0.7));
                // Fade out wherever the tail passes close to the camera.
                float k0 = (float) (Math.pow(1 - f0, 1.5) * nearFade(head.add(p0), cam));
                float k1 = (float) (Math.pow(1 - f1, 1.5) * nearFade(head.add(p1), cam));
                float[] c0 = pass == 0 ? new float[]{r * k0, g * k0, b * k0} : new float[]{k0, k0, k0 * 0.9f};
                float[] c1 = pass == 0 ? new float[]{r * k1, g * k1, b * k1} : new float[]{k1, k1, k1 * 0.9f};
                vertex(vc, m, entry, p0.add(s0.multiply(w0)), c0, 0, 0.5f);
                vertex(vc, m, entry, p0.subtract(s0.multiply(w0)), c0, 1, 0.5f);
                vertex(vc, m, entry, p1.subtract(s1.multiply(w1)), c1, 1, 0.5f);
                vertex(vc, m, entry, p1.add(s1.multiply(w1)), c1, 0, 0.5f);
            }
        }
    }

    private static double nearFade(Vec3d p, Vec3d cam) {
        return MathHelper.clamp((p.distanceTo(cam) - 10) / 20, 0, 1);
    }

    private static Vec3d sideways(Vec3d dir, Vec3d toCam) {
        Vec3d s = dir.crossProduct(toCam);
        return s.lengthSquared() < 1e-6 ? new Vec3d(1, 0, 0) : s.normalize();
    }

    private static void vertex(VertexConsumer vc, Matrix4f m, MatrixStack.Entry entry, Vec3d p, float[] c, float u, float v) {
        vc.vertex(m, (float) p.x, (float) p.y, (float) p.z)
                .color(c[0], c[1], c[2], 1f)
                .texture(u, v)
                .overlay(OverlayTexture.DEFAULT_UV)
                .light(LIGHT)
                .normal(entry, 0, 1, 0);
    }

    /** A square in the current XY plane, centred on the origin. */
    private static void quad(MatrixStack matrices, VertexConsumer vc, float size, float r, float g, float b) {
        MatrixStack.Entry entry = matrices.peek();
        Matrix4f m = entry.getPositionMatrix();
        float h = size / 2;
        float[] c = {r, g, b};
        vertex(vc, m, entry, new Vec3d(-h, -h, 0), c, 0, 1);
        vertex(vc, m, entry, new Vec3d(h, -h, 0), c, 1, 1);
        vertex(vc, m, entry, new Vec3d(h, h, 0), c, 1, 0);
        vertex(vc, m, entry, new Vec3d(-h, h, 0), c, 0, 0);
    }

    /** A vertical strip from the ground up, used for the light pillar. */
    private static void beam(MatrixStack matrices, VertexConsumer vc, float halfWidth, float height, float r, float g, float b) {
        MatrixStack.Entry entry = matrices.peek();
        Matrix4f m = entry.getPositionMatrix();
        float[] bottom = {r, g, b};
        float[] top = {0, 0, 0};
        for (int side = 0; side < 2; side++) {
            float s = side == 0 ? halfWidth : -halfWidth;
            vertex(vc, m, entry, new Vec3d(-s, 0, 0), bottom, 0, 0.5f);
            vertex(vc, m, entry, new Vec3d(s, 0, 0), bottom, 1, 0.5f);
            vertex(vc, m, entry, new Vec3d(s, height, 0), top, 1, 0.5f);
            vertex(vc, m, entry, new Vec3d(-s, height, 0), top, 0, 0.5f);
        }
    }
}
