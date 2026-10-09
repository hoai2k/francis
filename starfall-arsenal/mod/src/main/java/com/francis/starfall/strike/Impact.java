package com.francis.starfall.strike;

import com.francis.starfall.Starfall;
import net.minecraft.entity.Entity;
import net.minecraft.entity.ItemEntity;
import net.minecraft.entity.LivingEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.particle.DustParticleEffect;
import net.minecraft.particle.ParticleEffect;
import net.minecraft.particle.ParticleTypes;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.util.math.random.Random;
import net.minecraft.world.World;
import org.jetbrains.annotations.Nullable;
import org.joml.Vector3f;

/** What happens when a star hits the ground: crater, blast, shockwave, loot. */
public final class Impact {
    private Impact() {
    }

    public static void detonate(ServerWorld world, Entity star, @Nullable Entity owner, Vec3d center, float radius, StrikeType type) {
        Random random = world.getRandom();
        if (world.getGameRules().getBoolean(Starfall.TERRAIN_DAMAGE)) {
            Crater.start(world, BlockPos.ofFloored(center), radius, random);
        }
        // Vanilla blast for the boom, knockback and particles - but terrain is the crater's job.
        world.createExplosion(star, center.x, center.y + 1, center.z, Math.min(radius * 0.55f, 10f), false, World.ExplosionSourceType.NONE);
        hurtEntities(world, star, owner, center, radius);
        effects(world, center, radius, type, random);
        dropFragments(world, center, radius, random);
    }

    private static void hurtEntities(ServerWorld world, Entity star, @Nullable Entity owner, Vec3d center, float radius) {
        double reach = radius * 1.9 + 3;
        Box box = new Box(center, center).expand(reach);
        for (Entity e : world.getOtherEntities(star, box)) {
            if (e == owner || e instanceof ItemEntity || e.isSpectator()) continue;
            double d = e.getPos().distanceTo(center);
            if (d > reach) continue;
            double falloff = 1 - d / reach;
            e.damage(world.getDamageSources().explosion(star, owner), (float) (4 + radius * 2.6 * falloff));
            if (e instanceof LivingEntity living) {
                living.setOnFireFor(6);
            }
            Vec3d push = e.getPos().subtract(center).normalize().multiply(2.2 * falloff).add(0, 0.6 + falloff, 0);
            e.addVelocity(push.x, push.y, push.z);
            e.velocityModified = true;
        }
    }

    private static <T extends ParticleEffect> void burst(ServerWorld world, T effect, Vec3d p, int count, double spread, double speed) {
        for (ServerPlayerEntity player : world.getPlayers()) {
            if (player.squaredDistanceTo(p) < 512 * 512) {
                world.spawnParticles(player, effect, true, p.x, p.y, p.z, count, spread, spread, spread, speed);
            }
        }
    }

    /** A particle with an exact velocity (count 0 makes delta the motion vector). */
    private static <T extends ParticleEffect> void shoot(ServerWorld world, T effect, Vec3d p, Vec3d v, double speed) {
        for (ServerPlayerEntity player : world.getPlayers()) {
            if (player.squaredDistanceTo(p) < 512 * 512) {
                world.spawnParticles(player, effect, true, p.x, p.y, p.z, 0, v.x, v.y, v.z, speed);
            }
        }
    }

    private static void effects(ServerWorld world, Vec3d c, float radius, StrikeType type, Random random) {
        Vec3d up = c.add(0, 1.5, 0);
        int color = type.color;
        Vector3f rgb = new Vector3f(((color >> 16) & 255) / 255f, ((color >> 8) & 255) / 255f, (color & 255) / 255f);
        burst(world, ParticleTypes.FLASH, up, 6, radius * 0.3, 0);
        burst(world, ParticleTypes.EXPLOSION_EMITTER, up, Math.max(2, (int) (radius / 2.5f)), radius * 0.45, 0);
        burst(world, ParticleTypes.LAVA, up, (int) (radius * 6), radius * 0.4, 0);
        burst(world, new DustParticleEffect(rgb, 4f), up, (int) (radius * 20), radius * 0.6, 0);
        burst(world, ParticleTypes.END_ROD, up, (int) (radius * 12), radius * 0.3, 0.9);
        // Shockwave rings racing outward along the ground.
        int spokes = 72;
        for (int i = 0; i < spokes; i++) {
            double a = i * MathHelper.TAU / spokes;
            Vec3d dir = new Vec3d(Math.cos(a), 0.02, Math.sin(a));
            shoot(world, ParticleTypes.CLOUD, c.add(dir.multiply(2)).add(0, 0.6, 0), dir, 1.4 + radius * 0.06);
            shoot(world, ParticleTypes.END_ROD, c.add(dir.multiply(2)).add(0, 1.2, 0), dir, 1.0 + radius * 0.05);
            shoot(world, ParticleTypes.FLAME, c.add(0, 1, 0), dir.add(0, 0.25, 0), 0.6 + radius * 0.03);
        }
        // Mushroom column of smoke.
        for (int i = 0; i < radius * 3; i++) {
            Vec3d p = c.add(random.nextGaussian() * radius * 0.25, random.nextDouble() * radius * 1.2, random.nextGaussian() * radius * 0.25);
            shoot(world, ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, p, new Vec3d(0, 1, 0), 0.12 + random.nextDouble() * 0.15);
        }
        world.playSound(null, c.x, c.y, c.z, SoundEvents.ENTITY_GENERIC_EXPLODE, SoundCategory.PLAYERS, 12f, 0.45f);
        world.playSound(null, c.x, c.y, c.z, SoundEvents.ENTITY_LIGHTNING_BOLT_THUNDER, SoundCategory.PLAYERS, 14f, 0.6f);
        world.playSound(null, c.x, c.y, c.z, SoundEvents.ENTITY_DRAGON_FIREBALL_EXPLODE, SoundCategory.PLAYERS, 10f, 0.5f);
        world.playSound(null, c.x, c.y, c.z, SoundEvents.ENTITY_WARDEN_SONIC_BOOM, SoundCategory.PLAYERS, 8f, 0.7f);
    }

    private static void dropFragments(ServerWorld world, Vec3d c, float radius, Random random) {
        int count = 1 + random.nextInt(2) + (int) (radius / 8);
        for (int i = 0; i < count; i++) {
            // Spawned above the surface; they drop into the bowl as it is carved.
            ItemEntity item = new ItemEntity(world, c.x, c.y + 1.5, c.z, new ItemStack(Starfall.STAR_FRAGMENT));
            item.setVelocity(random.nextGaussian() * 0.15, 0.5, random.nextGaussian() * 0.15);
            item.setNeverDespawn();
            world.spawnEntity(item);
        }
    }
}
