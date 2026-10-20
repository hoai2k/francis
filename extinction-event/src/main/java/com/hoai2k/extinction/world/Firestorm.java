package com.hoai2k.extinction.world;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.entity.MeteorEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;

/**
 * Hours after the impact, ejecta thrown into space fell back burning through the atmosphere.
 * The sky glowed like an oven, and forests across the world caught fire.
 */
public final class Firestorm {
    private Firestorm() {}

    public static void tick(ServerLevel level, BlockPos impact, float heat, int phaseTick) {
        RandomSource rnd = level.random;
        double perTick = ExtinctionConfig.EJECTA_PER_MINUTE.get() / 1200.0 * heat;
        boolean destroy = ExtinctionConfig.DESTROY_TERRAIN.get();
        for (ServerPlayer p : Terrain.players(level)) {
            double n = perTick;
            while (n > 0) {
                if (rnd.nextDouble() < n) ejecta(level, p, impact, rnd);
                n -= 1;
            }
            if (destroy && phaseTick % 4 == 0) {
                for (int i = 0; i < 3; i++) ignite(level, Terrain.randomColumn(level, p, ExtinctionConfig.EFFECT_RADIUS.get(), rnd), heat, rnd);
            }
            if (phaseTick % 40 == 0) thermalPulse(level, p, heat, rnd);
        }
    }

    public static void ejecta(ServerLevel level, ServerPlayer p, BlockPos impact, RandomSource rnd) {
        double tx = p.getX() + (rnd.nextDouble() - 0.5) * 140, tz = p.getZ() + (rnd.nextDouble() - 0.5) * 140;
        Vec3 away = new Vec3(tx - impact.getX(), 0, tz - impact.getZ());
        away = away.lengthSqr() < 1 ? new Vec3(1, 0, 0) : away.normalize();
        double fall = 140 + rnd.nextDouble() * 60;
        Vec3 from = new Vec3(tx - away.x * fall * 0.6, Math.min(level.getMaxBuildHeight() + 40, p.getY() + fall), tz - away.z * fall * 0.6);
        Vec3 to = new Vec3(tx, p.getY() - 10, tz);
        Vec3 vel = to.subtract(from).normalize().scale(2.2 + rnd.nextDouble() * 1.2);
        float size = 0.5F + rnd.nextFloat() * (rnd.nextFloat() < 0.15F ? 2.2F : 1.0F);
        MeteorEntity.launch(level, from, vel, size, 0.01, MeteorEntity.randomLook(rnd));
    }

    private static void ignite(ServerLevel level, BlockPos top, float heat, RandomSource rnd) {
        if (top == null || rnd.nextFloat() > heat) return;
        BlockState s = level.getBlockState(top);
        boolean flammable = s.is(BlockTags.LEAVES) || s.is(BlockTags.LOGS) || s.is(Blocks.GRASS_BLOCK) || Terrain.isPlant(s)
                || s.isFlammable(level, top, net.minecraft.core.Direction.UP);
        if (!flammable) return;
        BlockPos fire = Terrain.isPlant(s) ? top : top.above();
        if (level.getBlockState(fire).isAir() || Terrain.isPlant(level.getBlockState(fire))) {
            if (!level.getBlockState(fire.below()).isAir()) level.setBlock(fire, Blocks.FIRE.defaultBlockState(), Block.UPDATE_ALL);
        }
    }

    /** The infrared glow from re-entering debris: anything under open sky starts to smoulder. */
    private static void thermalPulse(ServerLevel level, ServerPlayer p, float heat, RandomSource rnd) {
        if (heat < 0.5F) return;
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, p.getBoundingBox().inflate(48), e -> !e.isInWaterRainOrBubble())) {
            if (!level.canSeeSky(e.blockPosition().above())) continue;
            if (e instanceof ServerPlayer sp) {
                if (!ExtinctionConfig.PLAYER_HAZARDS.get() || (sp.isCreative() || sp.isSpectator()) || rnd.nextFloat() > 0.35F * heat) continue;
                sp.setSecondsOnFire(2);
                sp.hurt(DamageTypes.source(level, DamageTypes.HEAT), 1.0F);
            } else if (e instanceof Animal && rnd.nextFloat() < 0.3F * heat) {
                e.setSecondsOnFire(3);
            }
        }
    }
}
