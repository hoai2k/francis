package com.hoai2k.extinction.client;

import com.hoai2k.extinction.Phase;
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Shockwave;
import net.minecraft.client.Minecraft;
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
    private static final int EJECTA_STREAKS = 180;
    private static final int SKY_STREAKS = 44;

    private static Matrix4f m;
    private static Vec3 eye;
    private static Vector3f left, up;

    static void render(RenderLevelStageEvent e) {
        if (!ClientState.active()) return;
        try {
            draw(e);
        } catch (RuntimeException ex) {
            BufferBuilder b = Tesselator.getInstance().getBuilder();
            if (b.building()) b.end().release();
            end();
            com.hoai2k.extinction.ExtinctionMod.LOG.error("Extinction sky effects failed", ex);
        }
    }

    private static void draw(RenderLevelStageEvent e) {
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
            for (Markers.Marker mk : ClientState.markers) {
                float age = mk.age + pt;
                switch (mk.type) {
                    case Markers.AURORA -> aurora(age, mk.a);
                    case Markers.SUN -> sun(pt, age, mk.a, mk.b);
                    case Markers.MOON -> moon(age, mk.a);
                    default -> {}
                }
            }
        } else if (e.getStage() == RenderLevelStageEvent.Stage.AFTER_PARTICLES) {
            asteroid(pt);
            volcanoes(pt);
            for (Markers.Marker mk : ClientState.markers) {
                float age = mk.age + pt;
                if (age < 0) continue;
                switch (mk.type) {
                    case Markers.FIREBALL -> markerFireball(mk, age);
                    case Markers.PLUME -> markerPlume(mk.pos(), age, mk.a, mk.b);
                    case Markers.TORNADO -> tornado(mk.pos(), age, mk.a, mk.b);
                    case Markers.RING -> dustWall(mk.pos(), mk.a + age * mk.b, mk.c);
                    case Markers.PYRO -> pyroWall(mk.pos(), mk.a + age * mk.b, mk.c, age);
                    case Markers.WAVE -> waveWall(mk.pos(), mk.a + age * mk.b, mk.a + mk.life * mk.b, mk.c, age);
                    case Markers.LAVA_FOUNTAIN -> lavaBurst(mk.pos(), age, mk.a, mk.life);
                    default -> {}
                }
            }
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
    private static float eventSkyFire() {
        int a = ClientState.act;
        return switch (ClientState.event) {
            case "comet_swarm" -> a == 0 ? 0.5F : a <= 2 ? 1F : 0;
            case "shattered_moon" -> a == 2 ? 1F : a == 3 ? 0.4F : 0;
            case "supervolcano" -> a == 1 ? 0.7F : a == 2 ? 0.3F : 0;
            case "great_dying" -> a == 0 ? 0.2F : 0;
            default -> 0;
        };
    }

    private static void skyFire(float pt) {
        float density = ClientState.catastrophe() ? eventSkyFire() : switch (ClientState.phase) {
            case IMPACT -> ClientState.detonated ? Mth.clamp((ClientState.sinceImpact - 300) / 400F, 0, 1) : 0;
            case FIRESTORM -> 1 - 0.5F * ClientState.progress();
            case VOLCANISM -> 0.15F;
            default -> 0;
        };
        if (density <= 0) return;
        float time = ClientState.catastrophe() ? ClientState.actTick + pt + 5000 * ClientState.act
                : ClientState.phaseTick + pt + (ClientState.phase == Phase.IMPACT ? 0 : 10000);
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
        if (s > 800) return;
        Vec3 c = ClientState.impact;
        float R = ClientState.craterRadius;
        float t = s / 800F;
        float radius = R + 420 * (float) Math.sqrt(t);
        godRays(c.add(0, R * 0.6 + radius * 0.3, 0), s);
        fireColumn(c, s);
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

    /** Shafts of light blasting out of the fireball across the whole sky. */
    private static void godRays(Vec3 at, float s) {
        if (s > 260) return;
        float k = (float) Math.pow(1 - s / 260F, 1.5);
        Vec3 rel = at.subtract(eye);
        double d = rel.length();
        if (d > PROJECT) rel = rel.scale(PROJECT / d);
        float len = (float) Math.min(d, PROJECT) * 2.2F;
        float cx = (float) rel.x, cy = (float) rel.y, cz = (float) rel.z;
        begin(true, false);
        BufferBuilder b = triangles();
        int rays = 28;
        for (int i = 0; i < rays; i++) {
            double a = i * Math.PI * 2 / rays + hash(i, 1) * 0.2 + s * 0.0015;
            double half = 0.02 + 0.05 * hash(i, 2);
            float l = len * (0.5F + 0.6F * hash(i, 3));
            float c0 = (float) Math.cos(a - half) * l, s0 = (float) Math.sin(a - half) * l;
            float c1 = (float) Math.cos(a + half) * l, s1 = (float) Math.sin(a + half) * l;
            float alpha = 0.55F * k * (0.5F + 0.5F * hash(i, 4));
            b.vertex(m, cx, cy, cz).color(1F, 0.92F, 0.7F, alpha).endVertex();
            b.vertex(m, cx + left.x() * c0 + up.x() * s0, cy + left.y() * c0 + up.y() * s0, cz + left.z() * c0 + up.z() * s0).color(1F, 0.5F, 0.15F, 0F).endVertex();
            b.vertex(m, cx + left.x() * c1 + up.x() * s1, cy + left.y() * c1 + up.y() * s1, cz + left.z() * c1 + up.z() * s1).color(1F, 0.5F, 0.15F, 0F).endVertex();
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** Vaporised rock blasted straight up out of the atmosphere: a pillar of fire to space. */
    private static void fireColumn(Vec3 c, float s) {
        if (s > 700) return;
        float k = s < 40 ? s / 40F : (float) Math.pow(1 - (s - 40) / 660F, 1.4);
        float top = 200 + 2200 * Math.min(1, s / 160F);
        begin(true, true);
        BufferBuilder b = triangles();
        for (int i = 0; i < 40; i++) {
            float f = i / 39F;
            Vec3 at = c.add(Math.sin(i * 1.3) * 8, 20 + top * f, Math.cos(i * 1.7) * 8);
            float w = ClientState.craterRadius * (0.7F - 0.4F * f) + 30;
            projected(b, at, w, 1F, 0.75F - 0.45F * f, 0.35F - 0.3F * f, 0.7F * k * (1 - f * 0.6F));
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
            float size = 5 + 16 * hash(k, 5);
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
        float a = 0.85F * (float) Math.pow(1 - f, 0.5);
        double h = 30 + 170 * (1 - f);
        Vec3 c = ClientState.impact;
        // Fade the wall as it reaches the camera, so it never reads as a flat cylinder up close.
        double camDist = Math.abs(Math.sqrt((eye.x - c.x) * (eye.x - c.x) + (eye.z - c.z) * (eye.z - c.z)) - r);
        a *= (float) Mth.clamp((camDist - 15) / 90, 0.0, 1.0);
        if (a < 0.01F) return;
        begin(false, true);
        BufferBuilder b = Tesselator.getInstance().getBuilder();
        b.begin(VertexFormat.Mode.QUADS, DefaultVertexFormat.POSITION_COLOR);
        int n = 240;
        for (int i = 0; i < n; i++) {
            double a0 = i * Math.PI * 2 / n, a1 = (i + 1) * Math.PI * 2 / n;
            double h0 = h * (0.6 + 0.6 * hash(i, 31)), h1 = h * (0.6 + 0.6 * hash((i + 1) % n, 31));
            float x0 = (float) (c.x + Math.cos(a0) * r - eye.x), z0 = (float) (c.z + Math.sin(a0) * r - eye.z);
            float x1 = (float) (c.x + Math.cos(a1) * r - eye.x), z1 = (float) (c.z + Math.sin(a1) * r - eye.z);
            float yb = (float) (c.y - 10 - eye.y);
            float ym0 = (float) (c.y + h0 * 0.55 - eye.y), ym1 = (float) (c.y + h1 * 0.55 - eye.y);
            float yt0 = (float) (c.y + h0 - eye.y), yt1 = (float) (c.y + h1 - eye.y);
            // Brown dust at the bottom, a white condensation band near the ragged top.
            b.vertex(m, x0, yb, z0).color(0.62F, 0.5F, 0.38F, a).endVertex();
            b.vertex(m, x1, yb, z1).color(0.62F, 0.5F, 0.38F, a).endVertex();
            b.vertex(m, x1, ym1, z1).color(0.85F, 0.8F, 0.74F, a * 0.8F).endVertex();
            b.vertex(m, x0, ym0, z0).color(0.85F, 0.8F, 0.74F, a * 0.8F).endVertex();
            b.vertex(m, x0, ym0, z0).color(0.95F, 0.95F, 0.95F, a * 0.8F).endVertex();
            b.vertex(m, x1, ym1, z1).color(0.95F, 0.95F, 0.95F, a * 0.8F).endVertex();
            b.vertex(m, x1, yt1, z1).color(1F, 1F, 1F, 0F).endVertex();
            b.vertex(m, x0, yt0, z0).color(1F, 1F, 1F, 0F).endVertex();
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** Volcanic eruptions: a towering ash column over each vent, lightning inside it, lava fountains and eruption blasts. */
    private static void volcanoes(float pt) {
        if (ClientState.vents.isEmpty() || !ClientState.catastrophe() && ClientState.phase.ordinal() < Phase.VOLCANISM.ordinal()) return;
        float time = (ClientState.catastrophe() ? ClientState.actTick : ClientState.phaseTick) + pt;
        float strength = ClientState.catastrophe() ? Math.min(1, 0.3F + time / 400F) : switch (ClientState.phase) {
            case VOLCANISM -> Math.min(1, time / 300F);
            case WINTER -> 0.6F;
            case RECOVERY -> 0.4F * (1 - ClientState.progress());
            default -> 0;
        };
        if (strength <= 0.01F) return;
        int n = ClientState.vents.size();
        begin(false, true);
        BufferBuilder b = triangles();
        for (int v = 0; v < n; v++) {
            Vec3 vent = ClientState.vents.get(v);
            float blast = v < ClientState.ventBlast.length ? ClientState.ventBlast[v] + pt : 9999;
            float surge = blast < 300 ? 1 - blast / 300F : 0;
            float h = 300 + 700 * strength + 300 * surge;
            for (int i = 0; i <= 28; i++) {
                float f = i / 28F;
                double sway = Math.sin(time * 0.01 + i * 0.6 + v) * 14 * f + 80 * f * f;
                Vec3 at = vent.add(sway, 8 + h * f, Math.cos(time * 0.012 + i * 0.8) * 14 * f);
                float shade = 0.05F + 0.08F * f;
                projected(b, at, 20 + 130 * f + 16 * hash(i, v) + 40 * surge, shade, shade * 0.95F, shade * 0.9F, 0.95F * strength);
            }
            // The column spreads out into an umbrella cloud.
            for (int i = 0; i < 10; i++) {
                double a = i / 10.0 * Math.PI * 2 + time * 0.001;
                Vec3 at = vent.add(80 + Math.cos(a) * 160 * strength, h, Math.sin(a) * 160 * strength);
                projected(b, at, 140 * strength, 0.16F, 0.15F, 0.14F, 0.6F * strength);
            }
        }
        BufferUploader.drawWithShader(b.end());
        end();
        begin(true, true);
        b = triangles();
        for (int v = 0; v < n; v++) {
            Vec3 vent = ClientState.vents.get(v);
            float blast = v < ClientState.ventBlast.length ? ClientState.ventBlast[v] + pt : 9999;
            float surge = blast < 300 ? 1 - blast / 300F : 0;
            float pulse = 0.7F + 0.3F * Mth.sin(time * 0.15F + v);
            projected(b, vent.add(0, 6, 0), 70 * strength + 120 * surge, 1F, 0.35F, 0.05F, (0.6F * pulse + surge) * strength);
            projected(b, vent.add(0, 40, 0), 90 * strength, 1F, 0.3F, 0.05F, 0.35F * pulse * strength);
            // Lightning flickering inside the plume.
            int flick = (int) (time / 3);
            if (hash(flick, v + 40) < 0.35F) {
                float f = 0.2F + 0.6F * hash(flick, v + 41);
                projected(b, vent.add((hash(flick, v + 42) - 0.5) * 80, 80 + 500 * strength * f, (hash(flick, v + 43) - 0.5) * 80),
                        30 + 40 * hash(flick, v + 44), 0.85F, 0.85F, 1F, 0.9F);
            }
            int bombs = 50 + (int) (80 * surge);
            for (int k = 0; k < bombs; k++) {
                float period = 30 + 30 * hash(k, v + 20);
                float u = ((time + hash(k, v + 21) * period) % period) / period;
                double a = hash(k, v + 22 + (int) ((time + hash(k, v + 21) * period) / period)) * Math.PI * 2;
                double sp = 10 + 30 * hash(k, v + 23) * (1 + surge);
                double y = (120 + 120 * surge) * strength * (4 * u * (1 - u)) * (0.5 + hash(k, v + 24));
                Vec3 at = vent.add(Math.cos(a) * sp * u, 2 + y, Math.sin(a) * sp * u);
                projected(b, at, 3F + 3 * hash(k, v), 1F, 0.75F - 0.4F * u, 0.25F, 0.95F * (1 - u * 0.5F) * strength);
            }
            if (surge > 0) projected(b, vent.add(0, 30 + 120 * (1 - surge), 0), 60 + 260 * (1 - surge), 1F, 0.55F, 0.2F, 0.8F * surge);
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    // ---------------------------------------------------------------- markers

    private static void markerFireball(Markers.Marker mk, float age) {
        float life = Math.max(1, mk.life);
        float t = Math.min(1, age / life);
        Vec3 c = mk.pos();
        float size = mk.a * (0.4F + 0.6F * (float) Math.sqrt(t));
        if (age < 200 && mk.b > 0) godRays(c, age * 260 / 200F);
        begin(false, true);
        BufferBuilder b = triangles();
        for (int i = 0; i < 10; i++) {
            float f = i / 9F;
            projected(b, c.add(0, -size * 0.5 + size * 2.5 * f * Math.min(1, t * 3), 0), size * (0.4F + 0.5F * f), 0.15F, 0.14F, 0.13F, 0.6F * (1 - t));
        }
        BufferUploader.drawWithShader(b.end());
        end();
        begin(true, age < 30);
        b = triangles();
        projected(b, c, size * 2, 1F, 0.5F - 0.3F * t, 0.15F, 0.8F * (float) Math.pow(1 - t, 1.4));
        projected(b, c, size, 1F, 0.85F - 0.4F * t, 0.5F - 0.4F * t, (float) Math.pow(1 - t, 2));
        projected(b, c, size * 0.45F, 1F, 1F, 0.9F, (float) Math.pow(1 - t, 3));
        BufferUploader.drawWithShader(b.end());
        end();
    }

    private static void markerPlume(Vec3 c, float age, float height, float width) {
        float rise = Math.min(1, (float) Math.sqrt(age / 600F));
        float h = height * rise;
        begin(false, true);
        BufferBuilder b = triangles();
        for (int i = 0; i <= 34; i++) {
            float f = i / 34F;
            double sway = Math.sin(age * 0.008 + i * 0.5) * 20 * f + 120 * f * f;
            projected(b, c.add(sway, h * f, Math.cos(age * 0.01 + i) * 20 * f), width * (0.5F + 1.6F * f), 0.1F + 0.1F * f, 0.095F + 0.1F * f, 0.09F + 0.09F * f, 0.9F);
        }
        for (int i = 0; i < 14; i++) {
            double a = i / 14.0 * Math.PI * 2 + age * 0.0007;
            projected(b, c.add(120 + Math.cos(a) * width * 3 * rise, h, Math.sin(a) * width * 3 * rise), width * 2.2F * rise, 0.18F, 0.17F, 0.16F, 0.7F);
        }
        BufferUploader.drawWithShader(b.end());
        end();
        begin(true, true);
        b = triangles();
        for (int i = 0; i < 6; i++) projected(b, c.add(0, 20 + i * 60, 0), width * 1.5F, 1F, 0.32F, 0.06F, 0.5F * (1 - i / 7F));
        int flick = (int) (age / 2);
        if (hash(flick, 77) < 0.5F) {
            projected(b, c.add((hash(flick, 78) - 0.5) * width * 3, h * (0.2 + 0.7 * hash(flick, 79)), (hash(flick, 80) - 0.5) * width * 3),
                    40 + 60 * hash(flick, 81), 0.85F, 0.85F, 1F, 0.9F);
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** An EF5 funnel: narrow at the ground, widening into the wall cloud, spinning, full of debris. */
    private static void tornado(Vec3 base, float age, float radius, float height) {
        float spin = age * 0.35F;
        begin(false, true);
        BufferBuilder b = triangles();
        for (int i = 0; i < 48; i++) {
            float f = i / 47F;
            float r = radius * (0.5F + 2.2F * f * f);
            double sway = Math.sin(age * 0.03 + f * 3) * radius * 0.8 * f;
            for (int k = 0; k < 6; k++) {
                double a = spin * (1.5 - f) + k * Math.PI * 2 / 6 + i * 0.4;
                Vec3 at = base.add(Math.cos(a) * r * 0.55 + sway, f * height, Math.sin(a) * r * 0.55);
                float shade = 0.09F + 0.08F * hash(i, k) - 0.03F * f;
                projected(b, at, r * 0.8F + 4, shade, shade * 1.03F, shade, 0.85F);
            }
        }
        // The debris cloud boiling around its foot.
        for (int k = 0; k < 14; k++) {
            double a = spin * 0.8 + k * Math.PI * 2 / 14;
            projected(b, base.add(Math.cos(a) * radius * 1.4, 4 + 8 * hash(k, 9), Math.sin(a) * radius * 1.4), radius * 0.9F, 0.17F, 0.15F, 0.13F, 0.6F);
        }
        // The wall cloud overhead.
        for (int k = 0; k < 12; k++) {
            double a = k / 12.0 * Math.PI * 2 + spin * 0.1;
            projected(b, base.add(Math.cos(a) * radius * 3.5, height, Math.sin(a) * radius * 3.5), radius * 3.2F, 0.16F, 0.18F, 0.17F, 0.7F);
        }
        // Debris whirling around the bottom.
        for (int k = 0; k < 36; k++) {
            double a = spin * (2 + hash(k, 1)) + k;
            float f = hash(k, 2) * 0.5F;
            float r = radius * (0.8F + 1.6F * hash(k, 3));
            projected(b, base.add(Math.cos(a) * r, 2 + f * height * 0.4, Math.sin(a) * r), 1.2F + 1.5F * hash(k, 4), 0.1F, 0.08F, 0.06F, 0.95F);
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    private static float cameraFade(Vec3 c, double r) {
        double camDist = Math.abs(Math.sqrt((eye.x - c.x) * (eye.x - c.x) + (eye.z - c.z) * (eye.z - c.z)) - r);
        return (float) Mth.clamp((camDist - 15) / 90, 0.0, 1.0);
    }

    /** A blast front's dust wall at radius r (airbursts, meteor strikes, the supereruption). */
    private static void dustWall(Vec3 c, double r, double max) {
        if (r > max || r <= 0) return;
        float f = (float) (r / max);
        float a = 0.8F * (float) Math.pow(1 - f, 0.5) * cameraFade(c, r);
        if (a < 0.01F) return;
        double h = 20 + 90 * (1 - f);
        ring(c, r, -8, h, 0.62F, 0.5F, 0.38F, a, 0.95F, 0.93F, 0.9F, 0F, 31);
    }

    /** A pyroclastic flow: a boiling black-grey wall glowing orange at its base. */
    private static void pyroWall(Vec3 c, double r, double max, float age) {
        if (r > max) return;
        float f = (float) (r / max);
        float a = 0.92F * (float) Math.pow(1 - f, 0.35) * cameraFade(c, r);
        if (a < 0.01F) return;
        double h = 40 + 60 * (1 - f);
        ring(c, r, -6, h, 0.2F, 0.17F, 0.15F, a, 0.35F, 0.32F, 0.3F, 0.2F * a, 47);
        begin(false, true);
        BufferBuilder b = triangles();
        int n = 60;
        for (int i = 0; i < n; i++) {
            double ang = i * Math.PI * 2 / n + hash(i, 3) * 0.05;
            for (int k = 0; k < 3; k++) {
                double rr = r - 6 - k * 8;
                Vec3 at = c.add(Math.cos(ang) * rr, h * (0.4 + 0.35 * k) + Math.sin(age * 0.05 + i) * 4, Math.sin(ang) * rr);
                projected(b, at, (float) (h * 0.5), 0.22F + 0.05F * k, 0.2F + 0.05F * k, 0.18F + 0.05F * k, a * 0.8F);
            }
        }
        BufferUploader.drawWithShader(b.end());
        end();
        begin(true, true);
        b = triangles();
        for (int i = 0; i < n; i++) {
            double ang = i * Math.PI * 2 / n;
            projected(b, c.add(Math.cos(ang) * (r - 3), 3, Math.sin(ang) * (r - 3)), 14, 1F, 0.35F, 0.05F, 0.5F * a);
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** A tsunami crest: a towering wall of blue-green water capped with white foam. */
    private static void waveWall(Vec3 c, double r, double max, float height, float age) {
        if (r > max || r <= 0) return;
        float f = (float) Mth.clamp(r / Math.max(1, max), 0, 1);
        float top = height * (1 - 0.65F * f);
        float a = 0.9F * cameraFade(c, r);
        if (a < 0.01F) return;
        ring(c, r, -3, top, 0.08F, 0.22F, 0.32F, a, 0.3F, 0.55F, 0.62F, a, 53);
        ring(c, r + 1.5, top - 2, top + 3 + 2 * Math.sin(age * 0.2), 0.85F, 0.92F, 0.95F, a, 1F, 1F, 1F, 0F, 59);
        begin(false, true);
        BufferBuilder b = triangles();
        int n = 72;
        for (int i = 0; i < n; i++) {
            double ang = i * Math.PI * 2 / n + age * 0.0005;
            projected(b, c.add(Math.cos(ang) * (r - 4), top + 4, Math.sin(ang) * (r - 4)), 10 + 6 * hash(i, 5), 0.92F, 0.96F, 1F, 0.5F * a);
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    private static void lavaBurst(Vec3 c, float age, float height, int life) {
        float t = age / Math.max(1, life);
        if (t >= 1) return;
        begin(true, true);
        BufferBuilder b = triangles();
        for (int k = 0; k < 90; k++) {
            double a = hash(k, 1) * Math.PI * 2;
            double sp = 0.4 + 0.9 * hash(k, 2);
            float tt = age - hash(k, 3) * 60;
            if (tt < 0) continue;
            double y = (2.2 + 1.5 * hash(k, 4)) * tt - 0.025 * tt * tt;
            if (y < -20) continue;
            Vec3 at = c.add(Math.cos(a) * sp * tt, y, Math.sin(a) * sp * tt);
            projected(b, at, 3 + 4 * hash(k, 5), 1F, 0.6F, 0.15F, 0.9F * (1 - t));
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** Curtains of green and violet light rippling across the sky. */
    private static void aurora(float age, float strength) {
        begin(true, false);
        BufferBuilder b = Tesselator.getInstance().getBuilder();
        b.begin(VertexFormat.Mode.QUADS, DefaultVertexFormat.POSITION_COLOR);
        for (int c = 0; c < 5; c++) {
            double az0 = c * 1.1 + 0.4;
            for (int i = 0; i < 40; i++) {
                double a0 = az0 + i * 0.03, a1 = az0 + (i + 1) * 0.03;
                double w0 = Math.sin(age * 0.02 + i * 0.3 + c) * 3, w1 = Math.sin(age * 0.02 + (i + 1) * 0.3 + c) * 3;
                float lo = 22, hi = 36 + 6 * hash(c, 3);
                float x0 = (float) (Math.cos(a0) * (40 + w0)), z0 = (float) (Math.sin(a0) * (40 + w0));
                float x1 = (float) (Math.cos(a1) * (40 + w1)), z1 = (float) (Math.sin(a1) * (40 + w1));
                float al = 0.35F * strength * (0.6F + 0.4F * Mth.sin(age * 0.05F + i * 0.4F + c));
                float g = c % 2 == 0 ? 1F : 0.5F, r = c % 2 == 0 ? 0.2F : 0.7F;
                b.vertex(m, x0, lo, z0).color(r, g, 0.6F, al).endVertex();
                b.vertex(m, x1, lo, z1).color(r, g, 0.6F, al).endVertex();
                b.vertex(m, x1, hi, z1).color(0.6F, 0.2F, 1F, 0F).endVertex();
                b.vertex(m, x0, hi, z0).color(0.6F, 0.2F, 1F, 0F).endVertex();
            }
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** The Sun, swollen and flaring. */
    private static void sun(float pt, float age, float size, float flare) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null) return;
        double th = mc.level.getTimeOfDay(pt) * Math.PI * 2;
        Vec3 dir = new Vec3(-Math.sin(th), Math.cos(th), 0).scale(60);
        float pulse = 1 + 0.15F * Mth.sin(age * 0.2F) * flare;
        begin(true, false);
        BufferBuilder b = triangles();
        glow(b, dir, 22 * size * pulse, 1F, 0.8F, 0.4F, 0.5F + 0.3F * flare);
        glow(b, dir, 10 * size, 1F, 0.95F, 0.8F, 0.9F);
        glow(b, dir, 4 * size, 1F, 1F, 1F, 1F);
        for (int k = 0; k < 10; k++) {
            double a = k / 10.0 * Math.PI * 2 + age * 0.01;
            float r = 6 * size * (1 + 0.5F * hash(k, (int) (age / 40)));
            Vec3 at = dir.add(new Vec3(left.x(), left.y(), left.z()).scale(Math.cos(a) * r)).add(new Vec3(up.x(), up.y(), up.z()).scale(Math.sin(a) * r));
            glow(b, at, 2.5F * size * flare, 1F, 0.6F, 0.25F, 0.7F * flare);
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /**
     * The Moon breaking up: stage 0-1 it cracks and glows, 1-2 it comes apart, 2-3 the pieces
     * spread into a ring across the sky.
     */
    private static void moon(float age, float stage) {
        Vec3 dir = new Vec3(0.75, 0.42, -0.5).normalize().scale(60);
        Vec3 l = new Vec3(left.x(), left.y(), left.z()), u = new Vec3(up.x(), up.y(), up.z());
        float spread = Math.max(0, stage - 1);
        begin(false, false);
        BufferBuilder b = triangles();
        if (stage < 1.3F) {
            glow(b, dir, 16, 0.95F, 0.95F, 0.92F, 1F);
            glow(b, dir.add(l.scale(3)).add(u.scale(2)), 6, 0.6F, 0.6F, 0.62F, 0.7F);
            glow(b, dir.add(l.scale(-4)).add(u.scale(-1.5)), 5, 0.55F, 0.56F, 0.58F, 0.7F);
            glow(b, dir.add(l.scale(1)).add(u.scale(-4)), 4, 0.6F, 0.6F, 0.62F, 0.6F);
        }
        for (int k = 0; k < 18 && stage >= 1; k++) {
            double a = hash(k, 1) * Math.PI * 2;
            double r = (2 + hash(k, 2) * 9) * (1 + spread * 5);
            Vec3 at = dir.add(l.scale(Math.cos(a) * r)).add(u.scale(Math.sin(a) * r * (stage > 2 ? 0.3 : 1)));
            glow(b, at, 3 + 6 * hash(k, 3), 0.9F, 0.9F, 0.86F, 1F);
        }
        BufferUploader.drawWithShader(b.end());
        end();
        begin(true, false);
        b = triangles();
        if (stage < 1.3F) glow(b, dir, 34, 0.7F, 0.75F, 0.85F, 0.35F);
        if (stage > 0.3F && stage < 2.4F) {
            float hot = Math.min(1, stage);
            for (int k = 0; k < 14; k++) {
                double a = hash(k, 11) * Math.PI * 2;
                for (int j2 = 0; j2 < 8; j2++) {
                    double r = j2 * 1.9 * (1 + spread * 3);
                    glow(b, dir.add(l.scale(Math.cos(a) * r)).add(u.scale(Math.sin(a) * r)), 1.6F, 1F, 0.45F, 0.1F, 0.9F * hot);
                }
            }
            glow(b, dir, 30 * hot * (1 + spread), 1F, 0.55F, 0.25F, 0.35F * hot);
        }
        if (stage >= 2) {
            // The ring: a bright band of fragments arching right across the sky.
            float k2 = Math.min(1, stage - 2 + 0.4F);
            for (int k = 0; k < 240; k++) {
                double a = k / 240.0 * Math.PI * 2;
                Vec3 at = new Vec3(Math.cos(a) * 52, 14 + Math.sin(a * 1) * 10 + hash(k, 7) * 3, Math.sin(a) * 52);
                glow(b, at, 2F + 2.5F * hash(k, 8), 0.95F, 0.9F, 0.8F, 0.7F * k2);
            }
        }
        BufferUploader.drawWithShader(b.end());
        end();
    }

    /** A wall around c at radius r from yLow to yHigh above c.y, bottom colour fading to top colour. */
    private static void ring(Vec3 c, double r, double yLow, double yHigh, float r0, float g0, float b0, float a0,
                             float r1, float g1, float b1, float a1, int salt) {
        begin(false, true);
        BufferBuilder b = Tesselator.getInstance().getBuilder();
        b.begin(VertexFormat.Mode.QUADS, DefaultVertexFormat.POSITION_COLOR);
        int n = 200;
        for (int i = 0; i < n; i++) {
            double t0 = i * Math.PI * 2 / n, t1 = (i + 1) * Math.PI * 2 / n;
            double h0 = yLow + (yHigh - yLow) * (0.75 + 0.5 * hash(i, salt)), h1 = yLow + (yHigh - yLow) * (0.75 + 0.5 * hash((i + 1) % n, salt));
            float x0 = (float) (c.x + Math.cos(t0) * r - eye.x), z0 = (float) (c.z + Math.sin(t0) * r - eye.z);
            float x1 = (float) (c.x + Math.cos(t1) * r - eye.x), z1 = (float) (c.z + Math.sin(t1) * r - eye.z);
            float yb = (float) (c.y + yLow - eye.y);
            b.vertex(m, x0, yb, z0).color(r0, g0, b0, a0).endVertex();
            b.vertex(m, x1, yb, z1).color(r0, g0, b0, a0).endVertex();
            b.vertex(m, x1, (float) (c.y + h1 - eye.y), z1).color(r1, g1, b1, a1).endVertex();
            b.vertex(m, x0, (float) (c.y + h0 - eye.y), z0).color(r1, g1, b1, a1).endVertex();
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
