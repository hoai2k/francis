package com.hoai2k.extinction.world;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.net.FxMsg;
import com.hoai2k.extinction.net.Net;
import it.unimi.dsi.fastutil.ints.IntOpenHashSet;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.FallingBlockEntity;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.LiquidBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.common.Tags;

import java.util.ArrayDeque;

/**
 * One wave of a megatsunami. A wall of real water rolls out from the source over every low-lying
 * column near a player, smashing trees and houses into floating wreckage and sweeping creatures
 * inland, then runs off and drains away behind the front. Tsunamis come in trains of waves.
 */
public final class Tsunami {
    /** Blocks per tick (9 blocks a second). */
    public static final double SPEED = 0.45;
    private static final int REACH = 120;
    private static final int LINGER_TICKS = 90;
    private static final int BUDGET = 4500;

    /** Falling water: it has no source, so it runs off and dries up by itself once the wave has passed. */
    private static final BlockState WAVE = Blocks.WATER.defaultBlockState().setValue(LiquidBlock.LEVEL, 8);

    private record Column(int x, int z, int fromY, int toY, int placedAt) {}

    public final BlockPos center;
    public final double inner, max, speed;
    /** Crest height above sea level at the start; it falls to 35% by max. */
    public final int height;
    private int age;
    /** Whether this wave puts the MEGATSUNAMI card on screen (only the first of a train does). */
    public boolean announce = true;
    private final ArrayDeque<Column> wet = new ArrayDeque<>();
    private final IntOpenHashSet hit = new IntOpenHashSet();
    private final IntOpenHashSet warned = new IntOpenHashSet();

    /** age < 0 delays the wave (the second and third waves of a train). */
    public Tsunami(BlockPos center, double inner, double max, int height, double speed, int age) {
        this.center = center;
        this.inner = inner;
        this.max = max;
        this.height = height;
        this.speed = speed;
        this.age = age;
    }

    /** The asteroid's wave train: three waves, each smaller than the last. */
    public static Tsunami[] impactTrain(BlockPos center) {
        int h = ExtinctionConfig.TSUNAMI_HEIGHT.get();
        double inner = ExtinctionConfig.CRATER_RADIUS.get() * 1.4, max = ExtinctionConfig.SHOCKWAVE_RADIUS.get() * 0.9;
        Tsunami[] train = {
                new Tsunami(center, inner, max, h, SPEED, 0),
                new Tsunami(center, inner, max, (int) (h * 0.75), SPEED, -360),
                new Tsunami(center, inner, max, (int) (h * 0.55), SPEED, -720)};
        train[1].announce = false;
        train[2].announce = false;
        return train;
    }

    public double front() {
        return inner + age * speed;
    }

    public int age() {
        return age;
    }

    public int crest(ServerLevel level) {
        float fall = (float) Mth.clamp((front() - inner) / (max - inner), 0, 1);
        return level.getSeaLevel() + (int) Math.round(height * (1 - 0.65 * fall));
    }

    public boolean finished() {
        return front() > max && wet.isEmpty();
    }

    /** Removes the water the wave left behind, oldest first. */
    public void drain(ServerLevel level, boolean all) {
        int spent = 0;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        while (!wet.isEmpty() && spent < BUDGET && (all || age - wet.peek().placedAt() > LINGER_TICKS)) {
            Column c = wet.poll();
            if (!Terrain.loaded(level, c.x(), c.z())) continue;
            for (int y = c.toY() + 1; y >= c.fromY(); y--) {
                pos.set(c.x(), y, c.z());
                if (level.getBlockState(pos).is(Blocks.WATER) && !level.getFluidState(pos).isSource()) {
                    // Full updates, so any water that spread sideways recedes too instead of hanging in the air.
                    level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                    spent++;
                }
            }
        }
    }

    public void tick(ServerLevel level) {
        age++;
        drain(level, false);
        if (height <= 0 || age <= 0) return;
        double r0 = inner + (age - 1) * speed - 1.5, r1 = front();
        if (r0 > max) return;
        BlockPos c = center;
        int top = crest(level);
        boolean destroy = ExtinctionConfig.DESTROY_TERRAIN.get();
        LongOpenHashSet done = new LongOpenHashSet();
        int spent = 0, wreck = 30;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (ServerPlayer p : Terrain.players(level)) {
            double pd = Terrain.distXZ(c, p.getX(), p.getZ());
            if (pd > r1 + REACH || pd < r0 - REACH) continue;
            if (announce && pd < r1 + 200 && warned.add(p.getId())) Net.to(p, FxMsg.at(FxMsg.TSUNAMI, c.getX(), top, c.getZ(), 1));
            if (destroy) {
                int px = p.getBlockX(), pz = p.getBlockZ();
                for (int x = px - REACH; x <= px + REACH && spent < BUDGET; x++) {
                    double dx = x + 0.5 - c.getX();
                    for (int z = pz - REACH; z <= pz + REACH && spent < BUDGET; z++) {
                        double dz = z + 0.5 - c.getZ();
                        double r = Math.sqrt(dx * dx + dz * dz);
                        if (r < r0 || r >= r1) continue;
                        // A circle around the player, so the edge of the wave hides in the fog instead of showing as a box.
                        int ox = x - px, oz = z - pz;
                        if (ox * ox + oz * oz > REACH * REACH) continue;
                        if (!done.add(BlockPos.asLong(x, 0, z)) || !Terrain.loaded(level, x, z)) continue;
                        int floor = level.getHeight(Heightmap.Types.OCEAN_FLOOR, x, z);
                        int from = Integer.MAX_VALUE;
                        for (int y = floor; y <= top; y++) {
                            pos.set(x, y, z);
                            BlockState s = level.getBlockState(pos);
                            if (s.is(Blocks.WATER) && s.getFluidState().isSource()) continue;
                            if (Terrain.isProtected(level, pos, s)) continue;
                            boolean wood = s.is(BlockTags.LOGS) || s.is(BlockTags.PLANKS) || s.is(BlockTags.WOODEN_FENCES) || s.is(BlockTags.WOOL);
                            if (wood && wreck > 0 && level.random.nextFloat() < 0.35F) {
                                // Smashed into wreckage riding the wave.
                                FallingBlockEntity fb = FallingBlockEntity.fall(level, pos.immutable(), s);
                                fb.dropItem = false;
                                fb.setDeltaMovement(dx / r * 1.2, 0.6 + level.random.nextDouble() * 0.5, dz / r * 1.2);
                                wreck--;
                                continue;
                            }
                            boolean weak = s.isAir() || Terrain.isPlant(s) || s.is(Blocks.WATER) || s.is(BlockTags.LEAVES)
                                    || s.is(Tags.Blocks.GLASS_PANES) || s.is(Tags.Blocks.GLASS) || (wood && level.random.nextFloat() < 0.5F)
                                    || s.is(BlockTags.SAND) && y > floor - 1 && level.random.nextFloat() < 0.3F;
                            if (!weak) continue;
                            level.setBlock(pos, WAVE, Block.UPDATE_CLIENTS);
                            from = Math.min(from, y);
                            spent++;
                        }
                        if (from != Integer.MAX_VALUE) {
                            wet.add(new Column(x, z, from, top, age));
                            if (level.random.nextFloat() < 0.05F) {
                                level.sendParticles(p, ParticleTypes.SPLASH, true, x + 0.5, top + 1, z + 0.5, 20, 0.8, 0.6, 0.8, 0.2);
                                level.sendParticles(p, ParticleTypes.CLOUD, true, x + 0.5, top + 1.5, z + 0.5, 4, 0.8, 0.8, 0.8, 0.08);
                            }
                        }
                    }
                }
            }
            sweep(level, p, c, r0, r1, top);
        }
    }

    private void sweep(ServerLevel level, ServerPlayer near, BlockPos c, double r0, double r1, int top) {
        AABB box = near.getBoundingBox().inflate(REACH, 48, REACH);
        boolean hazards = ExtinctionConfig.PLAYER_HAZARDS.get();
        for (Entity e : level.getEntities((Entity) null, box, e -> e.isAlive() && !e.isSpectator() && e.getY() < top + 3)) {
            double r = Terrain.distXZ(c, e.getX(), e.getZ());
            if (r < r0 - 10 || r >= r1 + 1) continue;
            if (e instanceof ServerPlayer sp && (!hazards || (sp.isCreative() || sp.isSpectator()))) continue;
            Vec3 dir = new Vec3(e.getX() - c.getX(), 0, e.getZ() - c.getZ()).normalize();
            e.push(dir.x * 1.6, 0.3, dir.z * 1.6);
            e.hurtMarked = true;
            if (e instanceof LivingEntity le && hit.add(e.getId())) {
                le.hurt(DamageTypes.source(level, DamageTypes.TSUNAMI), 10.0F);
                le.setAirSupply(Math.min(le.getAirSupply(), 20));
            }
        }
    }
}
