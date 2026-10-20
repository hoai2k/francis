package com.hoai2k.extinction.world;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ModRegistry;
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
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.FallingBlockEntity;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.common.Tags;

import java.util.List;

/** The air blast racing out from the crater: flattens forests, shatters glass, throws debris and creatures. */
public final class Shockwave {
    /** Blocks per tick (about 32 blocks a second). */
    public static final double SPEED = 1.6;
    private static final int REACH = 112;

    private final IntOpenHashSet hit = new IntOpenHashSet();

    public static double radiusAt(int sinceImpact) {
        return ExtinctionConfig.CRATER_RADIUS.get() + sinceImpact * SPEED;
    }

    public boolean finished(int sinceImpact) {
        return radiusAt(sinceImpact) > ExtinctionConfig.SHOCKWAVE_RADIUS.get();
    }

    public void reset() {
        hit.clear();
    }

    public void tick(ServerLevel level, BlockPos c, int sinceImpact) {
        if (finished(sinceImpact)) return;
        double r0 = radiusAt(sinceImpact - 1), r1 = radiusAt(sinceImpact);
        int R = ExtinctionConfig.CRATER_RADIUS.get();
        double max = ExtinctionConfig.SHOCKWAVE_RADIUS.get();
        boolean destroy = ExtinctionConfig.DESTROY_TERRAIN.get();
        RandomSource rnd = level.random;
        LongOpenHashSet done = new LongOpenHashSet();
        int[] fly = {48};
        for (ServerPlayer p : Terrain.players(level)) {
            double pd = Terrain.distXZ(c, p.getX(), p.getZ());
            if (pd > r1 + REACH || pd < r0 - REACH) continue;
            if (destroy) {
                int px = p.getBlockX(), pz = p.getBlockZ();
                for (int x = px - REACH; x <= px + REACH; x++) {
                    double dx = x + 0.5 - c.getX();
                    for (int z = pz - REACH; z <= pz + REACH; z++) {
                        double dz = z + 0.5 - c.getZ();
                        double r = Math.sqrt(dx * dx + dz * dz);
                        if (r < r0 || r >= r1) continue;
                        if (!done.add(BlockPos.asLong(x, 0, z)) || !Terrain.loaded(level, x, z)) continue;
                        column(level, x, z, dx / r, dz / r, intensity(r, R, max), rnd, fly);
                    }
                }
            }
            hitEntities(level, p, c, r0, r1, R, max);
        }
    }

    private static float intensity(double r, int R, double max) {
        double i = Mth.clamp(1 - (r - R) / (max - R), 0, 1);
        return (float) Math.pow(i, 1.3);
    }

    private static void column(ServerLevel level, int x, int z, double nx, double nz, float I, RandomSource rnd, int[] fly) {
        int top = Terrain.topY(level, x, z);
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (int y = top; y > top - 16 && y > level.getMinBuildHeight(); y--) {
            pos.set(x, y, z);
            BlockState s = level.getBlockState(pos);
            if (s.isAir()) continue;
            if (!s.getFluidState().isEmpty()) break;
            if (Terrain.isProtected(level, pos, s)) break;
            if (s.is(BlockTags.LEAVES)) {
                if (rnd.nextFloat() < I * 1.2F) {
                    if (rnd.nextFloat() < 0.02F * I && fly[0]-- > 0) throwBlock(level, pos, s, nx, nz, I, rnd);
                    else level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                }
            } else if (s.is(BlockTags.LOGS)) {
                if (rnd.nextFloat() < I * I * 1.3F) {
                    if (rnd.nextFloat() < 0.12F && fly[0]-- > 0) throwBlock(level, pos, s, nx, nz, I, rnd);
                    else level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                }
            } else if (s.is(Tags.Blocks.GLASS) || s.is(Tags.Blocks.GLASS_PANES)) {
                if (rnd.nextFloat() < I * 1.6F) level.destroyBlock(pos, false);
            } else if (Terrain.isPlant(s)) {
                if (rnd.nextFloat() < I * 1.5F) level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
            } else if (s.is(BlockTags.PLANKS) || s.is(BlockTags.WOODEN_FENCES) || s.is(BlockTags.WOOL) || s.is(BlockTags.WOODEN_SLABS)
                    || s.is(BlockTags.WOODEN_STAIRS) || s.is(BlockTags.WOODEN_DOORS) || s.is(BlockTags.WOODEN_TRAPDOORS)) {
                if (I > 0.6F && rnd.nextFloat() < (I - 0.6F) * 1.8F) {
                    if (rnd.nextFloat() < 0.15F && fly[0]-- > 0) throwBlock(level, pos, s, nx, nz, I, rnd);
                    else level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                } else break;
            } else {
                // First solid ground: scorch it, and near the crater rip some of it loose.
                if (I > 0.5F && Terrain.isGrassy(s) && rnd.nextFloat() < I) {
                    level.setBlock(pos, (rnd.nextBoolean() ? ModRegistry.SCORCHED_EARTH.get() : Blocks.COARSE_DIRT).defaultBlockState(), Block.UPDATE_CLIENTS);
                } else if (I > 0.45F && rnd.nextFloat() < I * 0.03F && fly[0]-- > 0
                        && (s.is(BlockTags.DIRT) || s.is(BlockTags.SAND) || s.is(Blocks.GRAVEL) || s.is(BlockTags.BASE_STONE_OVERWORLD))) {
                    throwBlock(level, pos, s, nx, nz, I, rnd);
                }
                if (I > 0.6F && rnd.nextFloat() < (I - 0.6F) * 0.2F) {
                    BlockPos above = pos.above();
                    if (level.getBlockState(above).isAir()) level.setBlock(above, Blocks.FIRE.defaultBlockState(), Block.UPDATE_ALL);
                }
                if (rnd.nextFloat() < 0.006F) {
                    level.sendParticles(ParticleTypes.EXPLOSION, x + 0.5, y + 1.5, z + 0.5, 1, 0, 0, 0, 0);
                }
                break;
            }
        }
    }

    private static void throwBlock(ServerLevel level, BlockPos pos, BlockState s, double nx, double nz, float I, RandomSource rnd) {
        FallingBlockEntity fb = FallingBlockEntity.fall(level, pos.immutable(), s);
        fb.dropItem = false;
        double sp = 0.6 + I * 1.4 + rnd.nextDouble() * 0.4;
        fb.setDeltaMovement(nx * sp, 0.4 + I * 0.9 + rnd.nextDouble() * 0.3, nz * sp);
    }

    private void hitEntities(ServerLevel level, ServerPlayer near, BlockPos c, double r0, double r1, int R, double max) {
        AABB box = near.getBoundingBox().inflate(REACH, 64, REACH);
        List<LivingEntity> list = level.getEntitiesOfClass(LivingEntity.class, box, e -> e.isAlive() && (!e.isSpectator() || e instanceof ServerPlayer));
        boolean hazards = ExtinctionConfig.PLAYER_HAZARDS.get();
        for (LivingEntity e : list) {
            double r = Terrain.distXZ(c, e.getX(), e.getZ());
            if (r < r0 - 2 || r >= r1 + 2 || !hit.add(e.getId())) continue;
            float I = intensity(r, R, max);
            boolean sheltered = !level.canSeeSky(e.blockPosition().above());
            float shield = sheltered ? 0.35F : 1F;
            Vec3 dir = new Vec3(e.getX() - c.getX(), 0, e.getZ() - c.getZ()).normalize();
            if (e instanceof ServerPlayer sp) {
                Net.to(sp, FxMsg.at(FxMsg.SHOCK_HIT, c.getX(), c.getY(), c.getZ(), I));
                if (!hazards || (sp.isCreative() || sp.isSpectator())) continue;
            }
            e.push(dir.x * (0.5 + 3.0 * I) * shield, (0.3 + 1.0 * I) * shield, dir.z * (0.5 + 3.0 * I) * shield);
            e.hurtMarked = true;
            float dmg = (float) (ExtinctionConfig.SHOCKWAVE_DAMAGE.get() * I * shield);
            if (dmg > 0.5F) e.hurt(DamageTypes.source(level, DamageTypes.SHOCKWAVE), dmg);
        }
    }
}
