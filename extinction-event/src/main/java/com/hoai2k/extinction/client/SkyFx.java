package com.hoai2k.extinction.client;

import com.hoai2k.extinction.Phase;
import com.hoai2k.extinction.world.Shockwave;
import com.mojang.blaze3d.platform.GlStateManager;
import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.BufferBuilder;
import com.mojang.blaze3d.vertex.BufferUploader;
import com.mojang.blaze3d.vertex.DefaultVertexFormat;
import com.mojang.blaze3d.vertex.Tesselator;
import com.mojang.blaze3d.vertex.VertexFormat;
import net.minecraft.client.Camera;
import net.minecraft.client.renderer.GameRenderer;
import net.minecraft.util.Mth;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.client.event.RenderLevelStageEvent;
import org.joml.Matrix4f;
import org.joml.Vector3f;

/**
 * Everything drawn into the world by hand: the darkened sky, the new star, the asteroid and its
 * burning wake, the impact fireball, the ejecta curtain, the mushroom plume, the glowing crater,
 * the dust wall of the shockwave, and the burning debris streaking across the sky afterwards.
 */
final class SkyFx {
    private SkyFx() {}

    /** Far objects are pulled in to this distance (keeping their angular size) so the far plane never clips them. */
    private static final double PROJECT = 400;
    private static final int EJECTA_STREAKS = 110;
    private static final int SKY_STREAKS = 44;

    private static Matrix4f m;
    private static Vec3 eye;
    private static Vector3f left, up;

    static void render(RenderLevelStageEvent e) {
        if (!ClientState.active()) return;
        float pt = e.getPartialTick();
        Camera cam = e.getCamera();
        m = e.getPoseStack().last().pose();
        eye = cam.getPosition();
        left = cam.getLeftVector();
        up = cam.getUpVector();
        if (e.getStage() == RenderLevelStageEvent.Stage.AFTER_SKY) {
            dome(Mth.lerp(pt, ClientState.tintPrev, ClientState.tint));
            star(pt);
            skyFire(pt);
        } else if (e.getStage() == RenderLevelStageEvent.Stage.AFTER_PARTICLES) {
            asteroid(pt);
            volcanoes(pt);
            if (ClientState.detonated) {
                float s = ClientState.sinceImpact + pt;
                descentScar(s);
                plume(s);
                craterGlow(s);
                ejectaCurtain(s);
                fireball(s);
                shockRing(s);
            }
        }
    }

    // ---------------------------------------------------------------- sky

    private static void dome(float s) {
        if (s < 0.01F) return;
        begin(false, false);
        BufferBuilder b = Tesselator.getInstance().getBuilder();
        b.begin(VertexFormat.Mode.QUADS, DefaultVertexFormat.POSITION_COLOR);
        float r = ClientState.tintR, g = ClientState.tintG, bl = ClientState.tintB, a = Math.min(0.92F, s);
        float k = 50;
        float[][] faces = {
                {-k, -k, -k, k, -k, -k, k, k, -k, -k, k, -k}, {-k, -k, k, -k, k, k, k, k, k, k, -k, k},
                {-k, -k, -k, -k, k, -k, -k, k, k, -k, -k, k}, {k, -k, -k, k, -k, k, k, k, k, k, k, -k},
                {-k, k, -k, k, k, -k, k, k, k, -k, k, k}, {-k, -k, -k, -k, -k, k, k, -k, k, k, -k, -k}};
        for (float[] f : faces) {
            for (int i = 0; i < 12; i += 3) b.vertex(m, f[i], f[i + 1], f[i + 2]).color(r, g, bl, a).endVertex();
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    private static Vec3 approachDir() {
        double yaw = Math.toRadians(ClientState.approachYaw);
        return new Vec3(Math.cos(yaw), 0.75, Math.sin(yaw)).normalize();
    }

    private static Vec3 descentStart() {
        return ClientState.impact.add(approachDir().scale(2600));
    }

    private static void star(float pt) {
        if (ClientState.phase != Phase.WARNING) return;
        float p = Mth.clamp((ClientState.phaseTick + pt) / ClientState.phaseLength, 0, 1);
        Vec3 dir = ClientState.impact.add(approachDir().scale(9000)).subtract(eye).normalize().scale(60);
        float pulse = 1 + 0.1F * Mth.sin((ClientState.phaseTick + pt) * 0.3F);
        begin(true, false);
        BufferBuilder b = triangles();
        glow(b, dir, (1.2F + 14F * p * p) * pulse, 0.6F, 0.75F, 1.0F, 0.4F + 0.5F * p);
        glow(b, dir, (0.4F + 4F * p * p) * pulse, 1F, 1F, 1F, 1F);
        // The coma and tail, streaming away from the sun-side.
        Vec3 tail = approachDir().cross(new Vec3(0, 1, 0)).normalize();
        for (int i = 1; i <= 10; i++) {
            Vec3 at = dir.add(tail.scale(i * (0.3 + 3.5 * p * p)));
            glow(b, at, (0.5F + 4.5F * p * p) * (1 - i / 11F), 0.7F, 0.85F, 1F, 0.3F * (1 - i / 11F));
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** Burning ejecta raining back through the atmosphere: dozens of fiery streaks across the whole sky. */
    private static void skyFire(float pt) {
        float density = switch (ClientState.phase) {
            case IMPACT -> ClientState.detonated ? Mth.clamp((ClientState.sinceImpact - 300) / 400F, 0, 1) : 0;
            case FIRESTORM -> 1 - 0.5F * ClientState.progress();
            case VOLCANISM -> 0.15F;
            default -> 0;
        };
        if (density <= 0) return;
        float time = ClientState.phaseTick + pt + (ClientState.phase == Phase.IMPACT ? 0 : 10000);
        begin(true, false);
        BufferBuilder b = triangles();
        for (int i = 0; i < SKY_STREAKS; i++) {
            if (hash(i, 7) > density) continue;
            float period = 70 + 90 * hash(i, 1);
            float cycle = (time + hash(i, 2) * period) / period;
            int round = (int) cycle;
            float u = cycle - round;
            double az = (hash(i, 3 + round) * Math.PI * 2);
            double drift = (hash(i, 4 + round) - 0.5) * 0.9;
            double el0 = Math.toRadians(55 + 30 * hash(i, 5 + round)), el1 = Math.toRadians(-4);
            float size = 1.2F + 2.8F * hash(i, 6 + round);
            for (int j = 12; j >= 0; j--) {
                float uu = u - j * 0.018F;
                if (uu < 0) continue;
                double el = Mth.lerp(uu, el0, el1), a = az + drift * uu;
                Vec3 dir = new Vec3(Math.cos(el) * Math.cos(a), Math.sin(el), Math.cos(el) * Math.sin(a)).scale(55);
                float f = j / 12F;
                glow(b, dir, size * (1 - 0.75F * f), 1F, 0.8F - 0.55F * f, 0.4F - 0.35F * f, (1 - f) * 0.9F);
            }
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    // ---------------------------------------------------------------- the asteroid

    private static void asteroid(float pt) {
        if (ClientState.phase != Phase.IMPACT || ClientState.detonated) return;
        float t = Mth.clamp((ClientState.phaseTick + pt) / Phase.DESCENT_TICKS, 0, 1);
        Vec3 start = descentStart();
        Vec3 pos = start.lerp(ClientState.impact, t);
        Vec3 back = start.subtract(ClientState.impact).normalize();
        float heat = 0.4F + 0.6F * t;

        // Smoke wake, thick and dark, widening behind it.
        begin(false, true);
        BufferBuilder b = triangles();
        for (int i = 60; i >= 6; i--) {
            Vec3 at = pos.add(back.scale(i * 22 + 30));
            float f = i / 60F;
            projected(b, at, 18 + 70 * f, 0.2F, 0.18F, 0.17F, 0.6F * (1 - f));
        }
        BufferUploader.drawWithShader(b.end());
        end();

        // Plasma: a white-hot head inside an orange bow shock, with a long burning tail and sparks.
        begin(true, true);
        b = triangles();
        for (int i = 40; i >= 0; i--) {
            Vec3 at = pos.add(back.scale(i * 10));
            float f = i / 40F;
            projected(b, at, (34 * (1 - f * 0.75F)) * heat, 1F, 0.8F - 0.55F * f, 0.45F - 0.4F * f, 0.95F * (1 - f));
        }
        for (int k = 0; k < 24; k++) {
            float age = hash(k, (int) (ClientState.phaseTick / 3)) * 0.8F + 0.1F;
            Vec3 jitter = new Vec3(hash(k, 11) - 0.5, hash(k, 12) - 0.5, hash(k, 13) - 0.5).scale(60 * age);
            projected(b, pos.add(back.scale(age * 160)).add(jitter), 5 + 6 * (1 - age), 1F, 0.6F, 0.2F, 0.8F * (1 - age));
        }
        projected(b, pos, 220 * heat, 1F, 0.45F, 0.15F, 0.35F * heat);
        projected(b, pos, 90 * heat, 1F, 0.75F, 0.4F, 0.7F);
        projected(b, pos, 34, 1F, 1F, 0.95F, 1F);
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** The smoke trail the asteroid punched through the sky hangs there for minutes. */
    private static void descentScar(float s) {
        if (s > 2400) return;
        float fade = 1 - s / 2400F;
        Vec3 start = descentStart(), back = start.subtract(ClientState.impact).normalize();
        begin(false, true);
        BufferBuilder b = triangles();
        for (int i = 0; i < 70; i++) {
            Vec3 at = ClientState.impact.add(back.scale(80 + i * 34)).add(0, s * 0.02 * hash(i, 9), 0);
            projected(b, at, 30 + 40 * (i / 70F) + s * 0.03F, 0.32F, 0.3F, 0.29F, 0.45F * fade);
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    // ---------------------------------------------------------------- the impact

    private static void fireball(float s) {
        if (s > 600) return;
        Vec3 c = ClientState.impact;
        float R = ClientState.craterRadius;
        float t = s / 600F;
        float radius = R + 260 * (float) Math.sqrt(t);
        Vec3 at = c.add(0, radius * 0.45, 0);
        // For the first seconds the light is so bright it shows over mountains.
        boolean blinding = s < 60;
        begin(true, !blinding);
        BufferBuilder b = triangles();
        projected(b, at, radius * 2.2F, 1F, 0.5F - 0.3F * t, 0.15F - 0.1F * t, 0.8F * (float) Math.pow(1 - t, 1.3));
        projected(b, at, radius * 1.2F, 1F, 0.75F - 0.4F * t, 0.45F - 0.4F * t, (float) Math.pow(1 - t, 1.8));
        projected(b, at, radius * 0.6F, 1F, 1F, 0.9F - 0.6F * t, (float) Math.pow(1 - t, 3));
        // A column of fire climbing up the middle of the plume.
        for (int i = 0; i < 10; i++) {
            Vec3 col = c.add(0, radius * 0.4 + i * 30 * Math.min(1, s / 120F), 0);
            projected(b, col, (radius * 0.5F) * (1 - i / 12F), 1F, 0.55F, 0.15F, 0.55F * (float) Math.pow(1 - t, 2) * (1 - i / 11F));
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    private static void plume(float s) {
        if (s > 4800) return;
        Vec3 c = ClientState.impact;
        float R = ClientState.craterRadius;
        float fade = s < 3000 ? 1 : 1 - (s - 3000) / 1800F;
        float rise = (float) Math.min(1, Math.sqrt(s / 500F));
        float h = 60 + 560 * rise;
        float cap = R * 0.8F + 320 * rise;
        begin(false, true);
        BufferBuilder b = triangles();
        // The stem, billowing.
        for (int i = 0; i <= 26; i++) {
            float f = i / 26F;
            double wob = Math.sin(i * 1.7 + s * 0.01) * 12 * f;
            Vec3 at = c.add(wob, h * f * 0.92, Math.cos(i * 2.3 + s * 0.008) * 12 * f);
            float size = R * 0.6F + 60 * f + 20 * hash(i, 1);
            float shade = 0.09F + 0.1F * f;
            projected(b, at, size, shade, shade * 0.9F, shade * 0.82F, 0.9F * fade);
        }
        // The mushroom cap rolling outward.
        for (int i = 0; i < 18; i++) {
            double a = i / 18.0 * Math.PI * 2 + s * 0.0015;
            double rr = cap * (0.35 + 0.6 * hash(i, 3));
            Vec3 at = c.add(Math.cos(a) * rr, h * (0.9 + 0.12 * hash(i, 4)), Math.sin(a) * rr);
            float shade = 0.14F + 0.1F * hash(i, 5);
            projected(b, at, cap * 0.55F, shade, shade * 0.93F, shade * 0.88F, 0.75F * fade);
        }
        projected(b, c.add(0, h, 0), cap * 0.9F, 0.17F, 0.16F, 0.15F, 0.8F * fade);
        // A dust skirt rolling along the ground.
        for (int i = 0; i < 16; i++) {
            double a = i / 16.0 * Math.PI * 2;
            double rr = R * 1.3 + Math.min(1, s / 600F) * 160;
            projected(b, c.add(Math.cos(a) * rr, 18, Math.sin(a) * rr), 70 + 50 * rise, 0.45F, 0.38F, 0.3F, 0.4F * fade);
        }
        BufferUploader.drawWithShader(b.end());
        end();

        // Lit from below by the burning crater.
        begin(true, true);
        b = triangles();
        float glow = (float) Math.max(0.15, 1 - s / 1500F) * fade;
        for (int i = 0; i < 6; i++) {
            projected(b, c.add(0, 30 + i * 45, 0), R * 1.2F + i * 10, 1F, 0.35F, 0.08F, 0.45F * glow * (1 - i / 7F));
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    private static void craterGlow(float s) {
        Vec3 c = ClientState.impact;
        float R = ClientState.craterRadius;
        float a = 0.25F + 0.15F * Mth.sin(s * 0.05F);
        begin(true, true);
        BufferBuilder b = triangles();
        projected(b, c.add(0, -ClientState.craterRadius * 0.3, 0), R * 1.6F, 1F, 0.3F, 0.05F, a);
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** Thousands of tonnes of molten rock flung out on ballistic arcs: a curtain of fire around the crater. */
    private static void ejectaCurtain(float s) {
        if (s > 520) return;
        Vec3 c = ClientState.impact;
        begin(true, true);
        BufferBuilder b = triangles();
        float g = 0.022F;
        for (int k = 0; k < EJECTA_STREAKS; k++) {
            float delay = hash(k, 1) * 40;
            float local = s - delay;
            if (local <= 0) continue;
            double a = hash(k, 2) * Math.PI * 2;
            float vh = 1.2F + 2.4F * hash(k, 3), vy = 2.5F + 3.5F * hash(k, 4);
            float size = 4 + 10 * hash(k, 5);
            for (int j = 9; j >= 0; j--) {
                float tt = local - j * 5;
                if (tt < 0) continue;
                double y = vy * tt - 0.5 * g * tt * tt;
                if (y < -10) continue;
                double r = ClientState.craterRadius * 0.6 + vh * tt;
                Vec3 at = c.add(Math.cos(a) * r, y, Math.sin(a) * r);
                float f = j / 9F;
                float cool = Mth.clamp(tt / 450F, 0, 1);
                projected(b, at, size * (1 - 0.7F * f), 1F, 0.85F - 0.5F * f - 0.3F * cool, 0.45F - 0.4F * f, (1 - f) * (1 - cool * 0.6F));
            }
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    private static void shockRing(float s) {
        double r = ClientState.craterRadius + s * Shockwave.SPEED;
        double max = ClientState.shockRadius;
        if (r > max) return;
        float f = (float) (r / max);
        float a = 0.7F * (float) Math.pow(1 - f, 0.6);
        double h = 16 + 70 * (1 - f);
        Vec3 c = ClientState.impact;
        begin(false, true);
        BufferBuilder b = Tesselator.getInstance().getBuilder();
        b.begin(VertexFormat.Mode.QUADS, DefaultVertexFormat.POSITION_COLOR);
        int n = 200;
        for (int i = 0; i < n; i++) {
            double a0 = i * Math.PI * 2 / n, a1 = (i + 1) * Math.PI * 2 / n;
            float x0 = (float) (c.x + Math.cos(a0) * r - eye.x), z0 = (float) (c.z + Math.sin(a0) * r - eye.z);
            float x1 = (float) (c.x + Math.cos(a1) * r - eye.x), z1 = (float) (c.z + Math.sin(a1) * r - eye.z);
            float yb = (float) (c.y - 10 - eye.y), ym = (float) (c.y + h * 0.55 - eye.y), yt = (float) (c.y + h - eye.y);
            // Brown dust at the bottom, a white condensation band near the top.
            b.vertex(m, x0, yb, z0).color(0.62F, 0.5F, 0.38F, a).endVertex();
            b.vertex(m, x1, yb, z1).color(0.62F, 0.5F, 0.38F, a).endVertex();
            b.vertex(m, x1, ym, z1).color(0.85F, 0.8F, 0.74F, a * 0.8F).endVertex();
            b.vertex(m, x0, ym, z0).color(0.85F, 0.8F, 0.74F, a * 0.8F).endVertex();
            b.vertex(m, x0, ym, z0).color(0.95F, 0.95F, 0.95F, a * 0.8F).endVertex();
            b.vertex(m, x1, ym, z1).color(0.95F, 0.95F, 0.95F, a * 0.8F).endVertex();
            b.vertex(m, x1, yt, z1).color(1F, 1F, 1F, 0F).endVertex();
            b.vertex(m, x0, yt, z0).color(1F, 1F, 1F, 0F).endVertex();
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** Deccan Traps eruptions: a towering ash column over each vent, lit orange from below, with lava fountains. */
    private static void volcanoes(float pt) {
        if (ClientState.vents.isEmpty() || ClientState.phase.ordinal() < Phase.VOLCANISM.ordinal()) return;
        float time = ClientState.phaseTick + pt;
        float strength = switch (ClientState.phase) {
            case VOLCANISM -> Math.min(1, time / 300F);
            case WINTER -> 0.6F;
            case RECOVERY -> 0.4F * (1 - ClientState.progress());
            default -> 0;
        };
        if (strength <= 0.01F) return;
        begin(false, true);
        BufferBuilder b = triangles();
        for (int v = 0; v < ClientState.vents.size(); v++) {
            Vec3 vent = ClientState.vents.get(v);
            float h = 120 + 260 * strength;
            for (int i = 0; i <= 20; i++) {
                float f = i / 20F;
                double sway = Math.sin(time * 0.01 + i * 0.6 + v) * 10 * f + 40 * f * f;
                Vec3 at = vent.add(sway, 6 + h * f, Math.cos(time * 0.012 + i * 0.8) * 10 * f);
                float shade = 0.1F + 0.12F * f;
                projected(b, at, 14 + 70 * f + 10 * hash(i, v), shade, shade * 0.95F, shade * 0.9F, 0.85F * strength);
            }
        }
        BufferUploader.drawWithShader(b.end());
        end();
        begin(true, true);
        b = triangles();
        for (int v = 0; v < ClientState.vents.size(); v++) {
            Vec3 vent = ClientState.vents.get(v);
            float pulse = 0.7F + 0.3F * Mth.sin(time * 0.15F + v);
            projected(b, vent.add(0, 4, 0), 50 * strength, 1F, 0.35F, 0.05F, 0.6F * pulse * strength);
            projected(b, vent.add(0, 30, 0), 60 * strength, 1F, 0.3F, 0.05F, 0.35F * pulse * strength);
            for (int k = 0; k < 30; k++) {
                float period = 30 + 30 * hash(k, v + 20);
                float u = ((time + hash(k, v + 21) * period) % period) / period;
                double a = hash(k, v + 22 + (int) ((time + hash(k, v + 21) * period) / period)) * Math.PI * 2;
                double sp = 6 + 14 * hash(k, v + 23);
                double y = 70 * strength * (4 * u * (1 - u)) * (0.5 + hash(k, v + 24));
                Vec3 at = vent.add(Math.cos(a) * sp * u, 2 + y, Math.sin(a) * sp * u);
                projected(b, at, 2.5F + 2 * hash(k, v), 1F, 0.75F - 0.4F * u, 0.25F, 0.95F * (1 - u * 0.5F) * strength);
            }
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    // ---------------------------------------------------------------- drawing

    /** Stable pseudo-random value in [0, 1) for streak k, channel salt. */
    private static float hash(int k, int salt) {
        int h = k * 0x9E3779B1 + salt * 0x85EBCA6B;
        h ^= h >>> 15;
        h *= 0x2C1B3C6D;
        h ^= h >>> 12;
        return (h & 0xFFFFFF) / (float) 0x1000000;
    }

    private static BufferBuilder triangles() {
        BufferBuilder b = Tesselator.getInstance().getBuilder();
        b.begin(VertexFormat.Mode.TRIANGLES, DefaultVertexFormat.POSITION_COLOR);
        return b;
    }

    private static void projected(BufferBuilder b, Vec3 at, float size, float r, float g, float bl, float a) {
        Vec3 rel = at.subtract(eye);
        double d = rel.length();
        if (d > PROJECT) {
            double k = PROJECT / d;
            rel = rel.scale(k);
            size *= (float) k;
        }
        glow(b, rel, size, r, g, bl, a);
    }

    /** A soft round billboard: opaque centre fading to nothing at the edge. */
    private static void glow(BufferBuilder b, Vec3 rel, float size, float r, float g, float bl, float a) {
        if (a <= 0.003F || size <= 0) return;
        int n = 16;
        float cx = (float) rel.x, cy = (float) rel.y, cz = (float) rel.z;
        for (int i = 0; i < n; i++) {
            double a0 = i * Math.PI * 2 / n, a1 = (i + 1) * Math.PI * 2 / n;
            float c0 = (float) Math.cos(a0) * size, s0 = (float) Math.sin(a0) * size;
            float c1 = (float) Math.cos(a1) * size, s1 = (float) Math.sin(a1) * size;
            b.vertex(m, cx, cy, cz).color(r, g, bl, a).endVertex();
            b.vertex(m, cx + left.x() * c0 + up.x() * s0, cy + left.y() * c0 + up.y() * s0, cz + left.z() * c0 + up.z() * s0).color(r, g, bl, 0F).endVertex();
            b.vertex(m, cx + left.x() * c1 + up.x() * s1, cy + left.y() * c1 + up.y() * s1, cz + left.z() * c1 + up.z() * s1).color(r, g, bl, 0F).endVertex();
        }
    }

    private static void begin(boolean additive, boolean depth) {
        RenderSystem.enableBlend();
        if (additive) RenderSystem.blendFunc(GlStateManager.SourceFactor.SRC_ALPHA, GlStateManager.DestFactor.ONE);
        else RenderSystem.defaultBlendFunc();
        RenderSystem.disableCull();
        RenderSystem.depthMask(false);
        if (depth) RenderSystem.enableDepthTest();
        else RenderSystem.disableDepthTest();
        RenderSystem.setShader(GameRenderer::getPositionColorShader);
    }

    private static void end() {
        RenderSystem.depthMask(true);
        RenderSystem.enableDepthTest();
        RenderSystem.enableCull();
        RenderSystem.defaultBlendFunc();
        RenderSystem.disableBlend();
    }
}
