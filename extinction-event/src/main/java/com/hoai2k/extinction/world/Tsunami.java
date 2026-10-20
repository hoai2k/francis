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
 * The megatsunami. A wall of real water rolls out from the impact over every low-lying column near
 * a player, sweeps creatures inland, then runs off and drains away behind the front.
 */
public final class Tsunami {
    /** Blocks per tick (9 blocks a second). */
    public static final double SPEED = 0.45;
    private static final int REACH = 120;
    private static final int LINGER_TICKS = 90;
    private static final int BUDGET = 4000;

    /** Falling water: it has no source, so it runs off and dries up by itself once the wave has passed. */
    private static final BlockState WAVE = Blocks.WATER.defaultBlockState().setValue(LiquidBlock.LEVEL, 8);

    private record Column(int x, int z, int fromY, int toY, int placedAt) {}

    private final ArrayDeque<Column> wet = new ArrayDeque<>();
    private final IntOpenHashSet hit = new IntOpenHashSet();
    private final IntOpenHashSet warned = new IntOpenHashSet();
    private int clock;

    public static double frontAt(int tick) {
        return ExtinctionConfig.CRATER_RADIUS.get() * 1.4 + tick * SPEED;
    }

    public static double maxRadius() {
        return ExtinctionConfig.SHOCKWAVE_RADIUS.get() * 0.85;
    }

    public void reset() {
        wet.clear();
        hit.clear();
        warned.clear();
    }

    /** Removes the water the wave left behind, oldest first. */
    public void drain(ServerLevel level, boolean all) {
        clock++;
        int spent = 0;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        while (!wet.isEmpty() && spent < BUDGET && (all || clock - wet.peek().placedAt() > LINGER_TICKS)) {
            Column c = wet.poll();
            if (!Terrain.loaded(level, c.x(), c.z())) continue;
            for (int y = c.toY() + 1; y >= c.fromY(); y--) {
                pos.set(c.x(), y, c.z());
                if (level.getBlockState(pos).is(Blocks.WATER)) {
                    // Full updates, so any water that spread sideways recedes too instead of hanging in the air.
                    level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                    spent++;
                }
            }
        }
    }

    public void tick(ServerLevel level, BlockPos c, int tick) {
        int height = ExtinctionConfig.TSUNAMI_HEIGHT.get();
        if (height <= 0) return;
        double r0 = frontAt(tick - 1), r1 = frontAt(tick), max = maxRadius();
        if (r0 > max) return;
        int R = ExtinctionConfig.CRATER_RADIUS.get();
        int sea = level.getSeaLevel();
        boolean destroy = ExtinctionConfig.DESTROY_TERRAIN.get();
        LongOpenHashSet done = new LongOpenHashSet();
        int spent = 0;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (ServerPlayer p : Terrain.players(level)) {
            double pd = Terrain.distXZ(c, p.getX(), p.getZ());
            if (pd > r1 + REACH || pd < r0 - REACH) continue;
            if (pd < r1 + 160 && warned.add(p.getId())) {
                Net.to(p, FxMsg.at(FxMsg.TSUNAMI, c.getX(), sea, c.getZ(), 1));
            }
            float fall = (float) Mth.clamp((r1 - R) / (max - R), 0, 1);
            int top = sea + (int) Math.round(height * (1 - 0.65 * fall));
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
                            boolean weak = s.isAir() || Terrain.isPlant(s) || s.is(Blocks.WATER) || s.is(BlockTags.LEAVES)
                                    || s.is(Tags.Blocks.GLASS_PANES) || (s.is(BlockTags.LOGS) && level.random.nextFloat() < 0.2F);
                            if (!weak) continue;
                            level.setBlock(pos, WAVE, Block.UPDATE_CLIENTS);
                            from = Math.min(from, y);
                            spent++;
                        }
                        if (from != Integer.MAX_VALUE) {
                            wet.add(new Column(x, z, from, top, clock));
                            if (level.random.nextFloat() < 0.03F) {
                                level.sendParticles(ParticleTypes.SPLASH, x + 0.5, top + 1, z + 0.5, 12, 0.6, 0.4, 0.6, 0.1);
                                level.sendParticles(ParticleTypes.CLOUD, x + 0.5, top + 1, z + 0.5, 2, 0.5, 0.5, 0.5, 0.05);
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
        for (Entity e : level.getEntities((Entity) null, box, e -> e.isAlive() && !e.isSpectator() && e.getY() < top + 2)) {
            double r = Terrain.distXZ(c, e.getX(), e.getZ());
            if (r < r0 - 8 || r >= r1 + 1) continue;
            if (e instanceof ServerPlayer sp && (!hazards || (sp.isCreative() || sp.isSpectator()))) continue;
            Vec3 dir = new Vec3(e.getX() - c.getX(), 0, e.getZ() - c.getZ()).normalize();
            e.push(dir.x * 0.9, 0.15, dir.z * 0.9);
            e.hurtMarked = true;
            if (e instanceof LivingEntity le && hit.add(e.getId())) {
                le.hurt(DamageTypes.source(level, DamageTypes.TSUNAMI), 6.0F);
            }
        }
    }
}
