package com.hoai2k.extinction.client;

import com.hoai2k.extinction.Phase;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleOptions;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.player.Player;

/** Falling ash, embers and snow around the camera, and the background sounds of a dying world. */
final class ClientAmbience {
    private ClientAmbience() {}

    static void tick(Minecraft mc) {
        if (!ClientState.active() || mc.isPaused() || mc.player == null || mc.level == null) return;
        ClientLevel level = mc.level;
        Player me = mc.player;
        RandomSource r = level.random;
        float p = ClientState.progress();
        if (ClientState.catastrophe()) {
            eventAmbience(level, me, r);
            return;
        }
        int t = (int) ClientState.phaseTick;
        switch (ClientState.phase) {
            case WARNING -> {
                int left = ClientState.phaseLength - t;
                if (left < 300 && left > 0 && t % (left < 100 ? 12 : 20) == 0) {
                    ClientState.play(SoundEvents.WARDEN_HEARTBEAT, 0.8F, 0.4F + 0.6F * (1 - left / 300F));
                }
                if (p > 0.5F && t % 240 == 0) ClientState.play(SoundEvents.LIGHTNING_BOLT_THUNDER, 0.3F, 0.25F);
            }
            case IMPACT -> {
                if (!ClientState.detonated) {
                    if (t == 2) ClientState.play(SoundEvents.ENDER_DRAGON_GROWL, 0.4F, 0.6F);
                    float closing = t / (float) Phase.DESCENT_TICKS;
                    if (t % 16 == 0) ClientState.play(SoundEvents.FIRECHARGE_USE, 0.4F + 0.3F * closing, 0.2F + 0.8F * closing);
                    if (t % 40 == 0) ClientState.play(SoundEvents.LIGHTNING_BOLT_THUNDER, 0.3F, 0.2F + 0.5F * closing);
                } else {
                    particles(level, me, r, ParticleTypes.ASH, 6);
                }
            }
            case FIRESTORM -> {
                particles(level, me, r, ParticleTypes.ASH, 8);
                for (int i = 0; i < 2; i++) {
                    double x = me.getX() + (r.nextDouble() - 0.5) * 32, z = me.getZ() + (r.nextDouble() - 0.5) * 32;
                    double y = me.getY() + 6 + r.nextDouble() * 10;
                    if (level.canSeeSky(BlockPos.containing(x, y, z))) level.addParticle(ParticleTypes.SMALL_FLAME, x, y, z, 0, -0.06, 0);
                }
                if (t % 90 == 0) ClientState.play(SoundEvents.FIRE_AMBIENT, 0.6F, 1.0F);
                if (t % 200 == 100) ClientState.play(SoundEvents.LIGHTNING_BOLT_THUNDER, 0.4F, 0.3F);
            }
            case VOLCANISM -> {
                particles(level, me, r, ParticleTypes.ASH, 14);
                particles(level, me, r, ParticleTypes.WHITE_ASH, 4);
                if (t % 160 == 0) ClientState.play(SoundEvents.LAVA_AMBIENT, 0.5F, 0.6F);
            }
            case WINTER -> {
                particles(level, me, r, ParticleTypes.WHITE_ASH, 10);
                particles(level, me, r, ParticleTypes.SNOWFLAKE, 5);
                particles(level, me, r, ParticleTypes.ASH, 3);
            }
            case RECOVERY -> particles(level, me, r, ParticleTypes.WHITE_ASH, (int) (4 * (1 - p)));
            default -> {}
        }
    }

    private static void eventAmbience(ClientLevel level, Player me, RandomSource r) {
        int t = (int) ClientState.actTick;
        switch (ClientState.evAmbient) {
            case 1 -> particles(level, me, r, ParticleTypes.ASH, 14);
            case 2 -> {
                // Blizzard: snow driven sideways.
                for (int i = 0; i < 26; i++) {
                    double x = me.getX() + (r.nextDouble() - 0.5) * 30, z = me.getZ() + (r.nextDouble() - 0.5) * 30, y = me.getY() + r.nextDouble() * 10 - 2;
                    if (level.canSeeSky(BlockPos.containing(x, y, z))) level.addParticle(ParticleTypes.SNOWFLAKE, x, y, z, 0.5 + r.nextDouble() * 0.3, -0.1, 0.15);
                }
                particles(level, me, r, ParticleTypes.WHITE_ASH, 10);
                if (t % 60 == 0) ClientState.play(SoundEvents.ELYTRA_FLYING, 0.5F, 0.5F);
            }
            case 3 -> {
                particles(level, me, r, ParticleTypes.ASH, 8);
                for (int i = 0; i < 3; i++) {
                    double x = me.getX() + (r.nextDouble() - 0.5) * 30, z = me.getZ() + (r.nextDouble() - 0.5) * 30, y = me.getY() + 5 + r.nextDouble() * 10;
                    if (level.canSeeSky(BlockPos.containing(x, y, z))) level.addParticle(ParticleTypes.SMALL_FLAME, x, y, z, 0, -0.06, 0);
                }
                if (t % 90 == 0) ClientState.play(SoundEvents.FIRE_AMBIENT, 0.6F, 1F);
            }
            case 4 -> {
                particles(level, me, r, ParticleTypes.MYCELIUM, 16);
                particles(level, me, r, ParticleTypes.SPORE_BLOSSOM_AIR, 3);
            }
            case 5 -> {
                particles(level, me, r, ParticleTypes.ELECTRIC_SPARK, 6);
                particles(level, me, r, ParticleTypes.END_ROD, 1);
            }
            case 6 -> particles(level, me, r, ParticleTypes.WHITE_ASH, 12);
            case 7 -> particles(level, me, r, ParticleTypes.ASH, 6);
            default -> {}
        }
    }

    private static void particles(ClientLevel level, Player me, RandomSource r, ParticleOptions type, int count) {
        for (int i = 0; i < count; i++) {
            double x = me.getX() + (r.nextDouble() - 0.5) * 32, z = me.getZ() + (r.nextDouble() - 0.5) * 32;
            double y = me.getY() + r.nextDouble() * 14 - 2;
            if (!level.canSeeSky(BlockPos.containing(x, y, z))) continue;
            level.addParticle(type, x, y, z, (r.nextDouble() - 0.5) * 0.02, -0.03 - r.nextDouble() * 0.03, (r.nextDouble() - 0.5) * 0.02);
        }
    }
}
