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

    private static void particles(ClientLevel level, Player me, RandomSource r, ParticleOptions type, int count) {
        for (int i = 0; i < count; i++) {
            double x = me.getX() + (r.nextDouble() - 0.5) * 32, z = me.getZ() + (r.nextDouble() - 0.5) * 32;
            double y = me.getY() + r.nextDouble() * 14 - 2;
            if (!level.canSeeSky(BlockPos.containing(x, y, z))) continue;
            level.addParticle(type, x, y, z, (r.nextDouble() - 0.5) * 0.02, -0.03 - r.nextDouble() * 0.03, (r.nextDouble() - 0.5) * 0.02);
        }
    }
}
