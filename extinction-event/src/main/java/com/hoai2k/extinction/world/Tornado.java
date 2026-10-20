package com.hoai2k.extinction.world;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.BlockParticleOption;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.FallingBlockEntity;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/**
 * An EF5 tornado. It wanders across the land towards the players, ripping up trees, houses and
 * topsoil and flinging them around its funnel, and sucks up anything that gets too close.
 */
public final class Tornado {
    public double x, z;
    private double vx, vz;
    public final float radius;
    private int life;
    public final Markers.Marker marker;

    public Tornado(Scene sc, double x, double z, float radius, int life) {
        this.x = x;
        this.z = z;
        this.radius = radius;
        this.life = life;
        double a = sc.level.random.nextDouble() * Math.PI * 2;
        vx = Math.cos(a) * 0.25;
        vz = Math.sin(a) * 0.25;
        marker = sc.markers.add(Markers.TORNADO, new Vec3(x, sc.level.getSeaLevel(), z), radius, 160 + radius * 2, 0, 0, 0);
    }

    public boolean dead() {
        return life <= 0;
    }

    public void tick(ServerLevel level) {
        life--;
        RandomSource rnd = level.random;
        // Drift towards the nearest player, with a lot of wobble.
        ServerPlayer near = level.getNearestPlayer(x, 64, z, 600, false) instanceof ServerPlayer sp ? sp : null;
        if (near != null) {
            double dx = near.getX() - x, dz = near.getZ() - z, d = Math.sqrt(dx * dx + dz * dz) + 1;
            vx += dx / d * 0.004;
            vz += dz / d * 0.004;
        }
        vx += (rnd.nextDouble() - 0.5) * 0.04;
        vz += (rnd.nextDouble() - 0.5) * 0.04;
        double sp = Math.sqrt(vx * vx + vz * vz), max = 0.35;
        if (sp > max) {
            vx *= max / sp;
            vz *= max / sp;
        }
        x += vx;
        z += vz;
        int gx = Mth.floor(x), gz = Mth.floor(z);
        if (!Terrain.loaded(level, gx, gz)) return;
        int ground = Terrain.groundY(level, gx, gz);
        marker.x = x;
        marker.z = z;
        marker.y = ground;
        if (ExtinctionConfig.DESTROY_TERRAIN.get()) rip(level, gx, gz, rnd);
        pull(level, ground);
        if (level.getGameTime() % 3 == 0) {
            for (ServerPlayer p : Terrain.players(level)) {
                if (p.distanceToSqr(x, ground, z) > 400 * 400) continue;
                level.sendParticles(p, ParticleTypes.CLOUD, true, x, ground + 4, z, 12, radius * 0.4, 3, radius * 0.4, 0.1);
                level.sendParticles(p, ParticleTypes.LARGE_SMOKE, true, x, ground + 20, z, 10, radius * 0.6, 12, radius * 0.6, 0.05);
            }
        }
    }

    private void rip(ServerLevel level, int gx, int gz, RandomSource rnd) {
        int r = (int) radius;
        int lifts = 10;
        for (int i = 0; i < 30; i++) {
            int x = gx + rnd.nextInt(r * 2 + 1) - r, z = gz + rnd.nextInt(r * 2 + 1) - r;
            double d2 = (x - this.x) * (x - this.x) + (z - this.z) * (z - this.z);
            if (d2 > radius * radius || !Terrain.loaded(level, x, z)) continue;
            BlockPos top = new BlockPos(x, Terrain.topY(level, x, z), z);
            BlockState s = level.getBlockState(top);
            if (s.isAir() || Terrain.isProtected(level, top, s) || !s.getFluidState().isEmpty()) continue;
            boolean core = d2 < radius * radius * 0.25;
            if (Terrain.isPlant(s) || s.is(BlockTags.LEAVES)) {
                level.setBlock(top, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
            } else if (lifts-- > 0 && (core || rnd.nextFloat() < 0.5F)) {
                FallingBlockEntity fb = FallingBlockEntity.fall(level, top, s);
                fb.dropItem = false;
                double a = Math.atan2(z - this.z, x - this.x) + Math.PI / 2;
                fb.setDeltaMovement(Math.cos(a) * 1.2 + vx, 1.2 + rnd.nextDouble() * 1.4, Math.sin(a) * 1.2 + vz);
            } else if (Terrain.isGrassy(s)) {
                level.setBlock(top, Blocks.DIRT.defaultBlockState(), Block.UPDATE_CLIENTS);
            }
            if (rnd.nextFloat() < 0.1F) level.sendParticles(new BlockParticleOption(ParticleTypes.BLOCK, s), x + 0.5, top.getY() + 1, z + 0.5, 10, 1, 2, 1, 0.3);
        }
    }

    private void pull(ServerLevel level, int ground) {
        double reach = radius * 2.5;
        AABB box = new AABB(x - reach, ground - 10, z - reach, x + reach, ground + 120, z + reach);
        boolean hazards = ExtinctionConfig.PLAYER_HAZARDS.get();
        for (Entity e : level.getEntities((Entity) null, box, e -> e.isAlive() && !e.isSpectator())) {
            if (e instanceof ServerPlayer sp && (!hazards || sp.isCreative())) continue;
            double dx = e.getX() - x, dz = e.getZ() - z, d = Math.sqrt(dx * dx + dz * dz) + 0.5;
            if (d > reach) continue;
            double k = 1 - d / reach;
            // Spin around the funnel, get dragged in, and lifted.
            double tx = -dz / d, tz = dx / d;
            e.setDeltaMovement(e.getDeltaMovement().scale(0.8).add(tx * 0.9 * k - dx / d * 0.3 * k, 0.25 + 0.5 * k, tz * 0.9 * k - dz / d * 0.3 * k));
            e.hurtMarked = true;
            e.fallDistance = 0;
            if (e instanceof LivingEntity le && d < radius && level.getGameTime() % 10 == 0) {
                le.hurt(DamageTypes.source(level, DamageTypes.TORNADO), 3F);
            }
        }
    }
}
