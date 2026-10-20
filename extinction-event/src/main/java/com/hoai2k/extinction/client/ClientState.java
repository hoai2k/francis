package com.hoai2k.extinction.client;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.Phase;
import com.hoai2k.extinction.net.FxMsg;
import com.hoai2k.extinction.net.StateMsg;
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Shockwave;
import net.minecraft.client.Minecraft;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.core.Holder;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.Music;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/** What the client knows about the event, plus all the short-lived cinematic effects. */
public final class ClientState {
    private ClientState() {}

    public static Phase phase = Phase.DORMANT;
    public static float phaseTick;
    public static int phaseLength = 1;
    public static Vec3 impact = Vec3.ZERO;
    public static float approachYaw;
    public static boolean detonated;
    public static float sinceImpact;
    public static int craterRadius = 48;
    public static int shockRadius = 640;
    public static List<Vec3> vents = List.of();
    /** Ticks since each vent last erupted (for the eruption burst). */
    public static float[] ventBlast = new float[0];

    // The other catastrophes: which one, which act, and how that act looks.
    public static String event = "";
    public static int act = -1, actLength = 1;
    public static float actTick;
    public static float evTint, evR = 1, evG = 1, evB = 1, evFog = 0.35F, evQuake;
    public static int evMusic, evAmbient;
    public static List<Markers.Marker> markers = new ArrayList<>();
    private static String musicKey = "";

    // Transient effects, all 0..1 unless noted.
    public static float flash, flashPrev;
    public static float dust, dustPrev;
    public static float shake;
    /** Ticks the impact flash stays fully white before it starts to fade. */
    public static int flashHold;
    /** Field-of-view kick when the blast wave hits, and the orange afterimage burned into your eyes. */
    public static float fovPunch, burn, burnPrev;
    /** Lightning flicker in the burning or volcanic sky. */
    public static float lightning, lightningPrev;
    public static float letterbox, letterboxPrev;
    /** Smoothed sky/fog darkening and its colour. */
    public static float tint, tintPrev;
    public static float tintR = 1, tintG = 1, tintB = 1;

    public static Component title, subtitle;
    public static int titleAge, titleLength;
    private static final List<Delayed> delayed = new ArrayList<>();
    private static Phase musicPhase = Phase.DORMANT;

    private record Delayed(int[] ticks, Runnable action) {}

    /** True when the event's effects should show for the local player (overworld only). */
    public static boolean active() {
        Minecraft mc = Minecraft.getInstance();
        return mc.level != null && mc.level.dimension() == Level.OVERWORLD
                && (phase.running() || catastrophe() || flash > 0 || tint > 0.01F || !markers.isEmpty());
    }

    public static boolean catastrophe() {
        return !event.isEmpty() && act >= 0;
    }

    public static float progress() {
        if (catastrophe()) return Mth.clamp(actTick / Math.max(1, actLength), 0, 1);
        return Mth.clamp(phaseTick / Math.max(1, phaseLength), 0, 1);
    }

    public static void onState(StateMsg m) {
        Phase old = phase;
        phase = Phase.values()[Mth.clamp(m.phase(), 0, Phase.values().length - 1)];
        phaseTick = m.phaseTick();
        phaseLength = Math.max(1, m.phaseLength());
        impact = new Vec3(m.impact().getX() + 0.5, m.groundY(), m.impact().getZ() + 0.5);
        approachYaw = m.approachYaw();
        detonated = m.detonated();
        sinceImpact = m.detonatedAgo();
        craterRadius = m.craterRadius();
        shockRadius = m.shockRadius();
        vents = m.vents().stream().map(v -> new Vec3(v.getX() + 0.5, v.getY(), v.getZ() + 0.5)).toList();
        if (ventBlast.length != vents.size()) {
            ventBlast = new float[vents.size()];
            java.util.Arrays.fill(ventBlast, 9999);
        }
        event = m.event();
        act = m.act();
        actTick = m.actTick();
        actLength = Math.max(1, m.actLength());
        evTint = m.tint();
        evR = m.r();
        evG = m.g();
        evB = m.b();
        evFog = m.fog();
        evMusic = m.music();
        evAmbient = m.ambient();
        evQuake = m.quake();
        markers = new ArrayList<>(m.markers());
        if (catastrophe()) eventMusic();
        if (old != phase) onPhaseChange(old);
    }

    public static void onFx(FxMsg m) {
        Minecraft mc = Minecraft.getInstance();
        Player me = mc.player;
        if (me == null) return;
        double dist = Math.sqrt(me.distanceToSqr(m.x(), me.getY(), m.z()));
        switch (m.type()) {
            case FxMsg.FLASH -> {
                flash = (float) Mth.clamp(1.3 - dist / 2500.0, 0.35, 1.0) * Math.max(0.2F, Math.min(1F, m.strength()));
                flashHold = (int) (30 * flash);
                burn = flash;
                // The ground shakes before the air blast arrives; at the flash itself, only a ringing silence.
                play(SoundEvents.AMETHYST_BLOCK_CHIME, 0.5F, 0.6F);
                play(SoundEvents.BEACON_DEACTIVATE, 0.5F, 0.8F);
                later(15, () -> shake = Math.max(shake, 0.6F));
                play(SoundEvents.WARDEN_SONIC_BOOM, 0.5F, 0.3F);
            }
            case FxMsg.SHOCK_HIT -> {
                float i = m.strength();
                shake = Math.max(shake, 0.9F + 3.4F * i);
                dust = Math.max(dust, 0.35F + 0.6F * i);
                fovPunch = Math.max(fovPunch, 0.4F + 0.6F * i);
                play(SoundEvents.GENERIC_EXPLODE, 0.3F, 1.0F);
                play(SoundEvents.GENERIC_EXPLODE, 0.45F, 1.0F);
                play(SoundEvents.LIGHTNING_BOLT_THUNDER, 0.4F, 1.0F);
                play(SoundEvents.WARDEN_SONIC_BOOM, 0.5F, 1.0F);
                play(SoundEvents.ENDER_DRAGON_DEATH, 0.5F, 0.35F);
                // Then the thunder of the blast rolls on and on.
                for (int k = 1; k <= 16; k++) {
                    float fade = 1 - k / 17F;
                    SoundEvent roll = (k & 1) == 1 ? SoundEvents.LIGHTNING_BOLT_THUNDER : SoundEvents.GENERIC_EXPLODE;
                    later(k * 14, () -> play(roll, 0.3F + 0.1F * fade, fade));
                }
            }
            case FxMsg.PYRO_HIT -> {
                float i = m.strength();
                shake = Math.max(shake, 0.8F + 1.5F * i);
                dust = Math.max(dust, 0.6F + 0.3F * i);
                burn = Math.max(burn, 0.7F);
                play(SoundEvents.FIRE_AMBIENT, 0.5F, 1F);
                play(SoundEvents.GENERIC_EXPLODE, 0.3F, 0.8F);
                play(SoundEvents.LAVA_AMBIENT, 0.4F, 1F);
            }
            case FxMsg.TITLE -> {
                title = Component.translatable(m.title());
                subtitle = m.subtitle().isEmpty() ? null : Component.translatable(m.subtitle());
                titleAge = 0;
                titleLength = (int) (m.strength() * 20);
                if (m.title().endsWith(".warning")) play(SoundEvents.ELDER_GUARDIAN_CURSE, 0.5F, 0.6F);
                else if (!m.title().endsWith(".impact")) play(SoundEvents.RAID_HORN.value(), 0.5F, 0.7F);
            }
            case FxMsg.ERUPTION -> {
                float near = (float) Mth.clamp(1 - dist / 700.0, 0, 1);
                shake = Math.max(shake, 0.3F + 2.2F * near);
                for (int k = 0; k < vents.size(); k++) {
                    if (vents.get(k).distanceToSqr(m.x(), m.y(), m.z()) < 400) ventBlast[k] = 0;
                }
                if (near > 0.3F) play(SoundEvents.WARDEN_SONIC_BOOM, 0.4F, 0.6F * near);
                me.level().playLocalSound(m.x(), m.y(), m.z(), SoundEvents.GENERIC_EXPLODE, SoundSource.BLOCKS, 12F, 0.35F, false);
                me.level().playLocalSound(m.x(), m.y(), m.z(), SoundEvents.LIGHTNING_BOLT_THUNDER, SoundSource.WEATHER, 12F, 0.5F, false);
                me.level().playLocalSound(m.x(), m.y(), m.z(), SoundEvents.LAVA_POP, SoundSource.BLOCKS, 8F, 0.5F, false);
            }
            case FxMsg.QUAKE -> {
                float near = (float) Mth.clamp(1 - dist / 400.0, 0, 1);
                shake = Math.max(shake, m.strength() * near);
                if (near > 0.2F) play(SoundEvents.LIGHTNING_BOLT_THUNDER, 0.3F, 0.25F * near);
            }
            case FxMsg.TSUNAMI -> {
                title = Component.translatable("extinction.title.tsunami");
                subtitle = Component.translatable("extinction.subtitle.tsunami");
                titleAge = 0;
                titleLength = 100;
                play(SoundEvents.ELDER_GUARDIAN_CURSE, 0.4F, 0.8F);
                play(SoundEvents.AMBIENT_UNDERWATER_ENTER, 0.5F, 1.0F);
                later(20, () -> play(SoundEvents.GENERIC_SPLASH, 0.3F, 1.0F));
            }
            default -> {}
        }
    }

    public static void tick() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null) {
            phase = Phase.DORMANT;
            tint = tintPrev = flash = dust = 0;
            return;
        }
        if (!mc.isPaused()) {
            if (phase.running()) phaseTick++;
            if (detonated) sinceImpact++;
            if (catastrophe()) actTick++;
            for (Markers.Marker mk : markers) mk.age++;
            for (int k = 0; k < ventBlast.length; k++) ventBlast[k]++;
        }
        flashPrev = flash;
        dustPrev = dust;
        lightningPrev = lightning;
        lightning = Math.max(0, lightning - 0.18F);
        float storm = phase == Phase.FIRESTORM ? 0.012F : phase == Phase.VOLCANISM ? 0.02F : 0;
        if (!mc.isPaused() && storm > 0 && mc.level.random.nextFloat() < storm) {
            lightning = 0.5F + 0.5F * mc.level.random.nextFloat();
            later(10 + mc.level.random.nextInt(30), () -> play(SoundEvents.LIGHTNING_BOLT_THUNDER, 0.5F + mc.level.random.nextFloat() * 0.3F, 0.5F));
        }
        letterboxPrev = letterbox;
        tintPrev = tint;
        if (flashHold > 0) flashHold--;
        else flash = Math.max(0, flash - (flash > 0.6F ? 0.012F : 0.025F));
        burnPrev = burn;
        burn = Math.max(0, burn - 0.0025F);
        fovPunch = Math.max(0, fovPunch * 0.9F - 0.005F);
        dust = Math.max(0, dust - 0.01F);
        shake = Math.max(0, shake * 0.96F - 0.004F);
        if (title != null && ++titleAge > titleLength) title = null;
        // The sky brightens as the asteroid comes in, until the flash swallows everything.
        if (phase == Phase.IMPACT && !detonated && phaseTick > Phase.DESCENT_TICKS - 70) {
            float k = (phaseTick - (Phase.DESCENT_TICKS - 70)) / 70F;
            flash = Math.max(flash, k * k * k * 0.55F);
            shake = Math.max(shake, k * 0.8F);
        }

        boolean cinematic = title != null || (phase == Phase.IMPACT && (phaseTick > Phase.DESCENT_TICKS - 120 && sinceImpact < 260));
        letterbox += ((cinematic ? 1 : 0) - letterbox) * 0.06F;

        float[] target = skyTarget();
        float rate = phase == Phase.IMPACT && detonated && sinceImpact < 400 ? 0.04F : 0.012F;
        tint += (target[0] - tint) * rate;
        tintR += (target[1] - tintR) * rate;
        tintG += (target[2] - tintG) * rate;
        tintB += (target[3] - tintB) * rate;

        Iterator<Delayed> it = delayed.iterator();
        List<Runnable> run = new ArrayList<>();
        while (it.hasNext()) {
            Delayed d = it.next();
            if (--d.ticks()[0] <= 0) {
                run.add(d.action());
                it.remove();
            }
        }
        run.forEach(Runnable::run);
        ClientAmbience.tick(mc);
    }

    /** [strength, r, g, b] of the sky/fog darkening for the current moment. */
    private static float[] skyTarget() {
        float p = progress();
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null || mc.level.dimension() != Level.OVERWORLD) return new float[]{0, tintR, tintG, tintB};
        if (catastrophe()) return new float[]{evTint, evR, evG, evB};
        return switch (phase) {
            case WARNING -> new float[]{p > 0.7F ? (p - 0.7F) * 0.5F : 0, 0.9F, 0.55F, 0.35F};
            case IMPACT -> detonated ? new float[]{Math.min(0.7F, 0.2F + sinceImpact / 200F), 0.95F, 0.32F, 0.08F} : new float[]{0.12F, 0.9F, 0.5F, 0.3F};
            case FIRESTORM -> new float[]{0.72F - 0.1F * p, 0.8F, 0.16F, 0.04F};
            case VOLCANISM -> new float[]{0.6F + 0.2F * p, 0.33F, 0.28F, 0.25F};
            case WINTER -> new float[]{0.9F - 0.1F * Math.max(0, p - 0.7F) * 3, 0.07F, 0.07F, 0.08F};
            case RECOVERY -> new float[]{0.75F * (1 - p), 0.45F, 0.48F, 0.5F};
            default -> new float[]{0, tintR, tintG, tintB};
        };
    }

    /** Base rumble from the phase, plus any recent quake or blast. */
    public static float shakeNow() {
        if (catastrophe()) return evQuake * 0.5F + shake;
        float p = progress();
        float base = switch (phase) {
            case WARNING -> p > 0.6F ? (p - 0.6F) * 0.3F : 0;
            case IMPACT -> detonated ? Math.max(0.25F, 1.1F - sinceImpact / 300F) : 0.05F + 0.25F * phaseTick / Phase.DESCENT_TICKS;
            case FIRESTORM -> 0.12F;
            case VOLCANISM -> 0.15F + 0.2F * (float) Math.max(0, Math.sin(phaseTick / 90.0));
            default -> 0;
        };
        return base + shake;
    }

    public static double shockRadiusNow() {
        return craterRadius + sinceImpact * Shockwave.SPEED;
    }

    private static void eventMusic() {
        String key = event + act;
        if (key.equals(musicKey) || !ExtinctionConfig.CHANGE_MUSIC.get()) return;
        musicKey = key;
        Holder<SoundEvent> track = switch (evMusic) {
            case 1 -> SoundEvents.MUSIC_DRAGON;
            case 2 -> SoundEvents.MUSIC_BIOME_BASALT_DELTAS;
            case 3 -> SoundEvents.MUSIC_BIOME_DEEP_DARK;
            case 4 -> SoundEvents.MUSIC_BIOME_FOREST;
            case 5 -> SoundEvents.MUSIC_UNDER_WATER;
            case 6 -> SoundEvents.MUSIC_END;
            default -> null;
        };
        if (track == null) return;
        Minecraft mc = Minecraft.getInstance();
        mc.getMusicManager().stopPlaying();
        mc.getMusicManager().startPlaying(new Music(track, 0, 0, true));
    }

    private static void onPhaseChange(Phase old) {
        if (!ExtinctionConfig.CHANGE_MUSIC.get()) return;
        Holder<SoundEvent> track = switch (phase) {
            case IMPACT -> SoundEvents.MUSIC_DRAGON;
            case FIRESTORM, VOLCANISM -> SoundEvents.MUSIC_BIOME_BASALT_DELTAS;
            case WINTER -> SoundEvents.MUSIC_BIOME_DEEP_DARK;
            case RECOVERY, OVER -> SoundEvents.MUSIC_BIOME_FOREST;
            default -> null;
        };
        if (track == null || musicPhase == phase) return;
        musicPhase = phase;
        Minecraft mc = Minecraft.getInstance();
        mc.getMusicManager().stopPlaying();
        mc.getMusicManager().startPlaying(new Music(track, 0, 0, true));
    }

    /** Seconds until the asteroid hits, or -1 when it is not on its way. */
    public static float secondsToImpact() {
        if (phase == Phase.WARNING) return (phaseLength - phaseTick + Phase.DESCENT_TICKS) / 20F;
        if (phase == Phase.IMPACT && !detonated) return (Phase.DESCENT_TICKS - phaseTick) / 20F;
        return -1;
    }

    public static void play(SoundEvent sound, float pitch, float volume) {
        Minecraft.getInstance().getSoundManager().play(SimpleSoundInstance.forUI(sound, pitch, volume));
    }

    public static void later(int ticks, Runnable r) {
        delayed.add(new Delayed(new int[]{ticks}, r));
    }
}
