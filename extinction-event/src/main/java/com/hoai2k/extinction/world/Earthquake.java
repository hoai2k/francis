package com.hoai2k.extinction.world;

import com.hoai2k.extinction.ExtinctionConfig;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.BlockParticleOption;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.item.FallingBlockEntity;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.FallingBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraftforge.common.Tags;

/** Tremors: loose blocks tumble, stone cracks, and in the strongest quakes fissures tear open with lava below. */
public final class Earthquake {
    private Earthquake() {}

    public static void tick(ServerLevel level, BlockQueue queue, float intensity, long time) {
        if (intensity <= 0.05F || time % 5 != 0 || !ExtinctionConfig.DESTROY_TERRAIN.get()) return;
        RandomSource rnd = level.random;
        for (ServerPlayer p : Terrain.players(level)) {
            int tries = (int) (intensity * 14);
            for (int i = 0; i < tries; i++) {
                BlockPos top = Terrain.randomColumn(level, p, 40, rnd);
                if (top == null) continue;
                BlockPos pos = top.below(rnd.nextInt(3));
                BlockState s = level.getBlockState(pos);
                if (Terrain.isProtected(level, pos, s)) continue;
                if (s.getBlock() instanceof FallingBlock && level.getBlockState(pos.below()).isAir()) {
                    FallingBlockEntity.fall(level, pos, s);
                } else if (s.is(Tags.Blocks.GLASS) || s.is(Tags.Blocks.GLASS_PANES)) {
                    if (rnd.nextFloat() < intensity) level.destroyBlock(pos, false);
                } else if (s.is(Blocks.STONE) || s.is(Blocks.STONE_BRICKS)) {
                    level.setBlock(pos, (s.is(Blocks.STONE) ? Blocks.COBBLESTONE : Blocks.CRACKED_STONE_BRICKS).defaultBlockState(), Block.UPDATE_ALL);
                } else if (s.is(Blocks.COBBLESTONE) && rnd.nextFloat() < 0.3F) {
                    level.setBlock(pos, Blocks.GRAVEL.defaultBlockState(), Block.UPDATE_ALL);
                } else if (s.is(BlockTags.LEAVES) && rnd.nextFloat() < 0.15F * intensity) {
                    level.sendParticles(new BlockParticleOption(ParticleTypes.BLOCK, s), pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5, 6, 0.4, 0.2, 0.4, 0);
                }
            }
            if (intensity > 0.55F && rnd.nextFloat() < intensity * 0.03F) fissure(level, queue, p, rnd, intensity);
        }
    }

    /** A crack in the ground, 12-30 blocks long, with a lava seam at the bottom. */
    public static void fissure(ServerLevel level, BlockQueue queue, ServerPlayer p, RandomSource rnd, float intensity) {
        double a = rnd.nextDouble() * Math.PI * 2;
        int dist = 18 + rnd.nextInt(30);
        int sx = p.getBlockX() + (int) (Math.cos(a) * dist), sz = p.getBlockZ() + (int) (Math.sin(a) * dist);
        if (!Terrain.loaded(level, sx, sz)) return;
        fissureAt(level, queue, sx, sz, rnd.nextDouble() * Math.PI, 12 + rnd.nextInt(19), 8 + rnd.nextInt((int) (intensity * 10) + 1), false);
    }

    /** A crack centred on (sx, sz) running along dir (radians), len blocks long and up to depth deep. */
    public static void fissureAt(ServerLevel level, BlockQueue queue, int sx, int sz, double dir, int len, int depth) {
        fissureAt(level, queue, sx, sz, dir, len, depth, false);
    }

    /** spill: the crack is brimming, and lava wells up and pours over the land. */
    public static void fissureAt(ServerLevel level, BlockQueue queue, int sx, int sz, double dir, int len, int depth, boolean spill) {
        for (int i = -len / 2; i <= len / 2; i++) {
            int x = sx + (int) Math.round(Math.cos(dir) * i), z = sz + (int) Math.round(Math.sin(dir) * i);
            double taper = 1 - Math.abs(i) / (len / 2.0 + 1);
            int d = Math.max(2, (int) (depth * taper));
            int w = taper > 0.5 ? 1 : 0;
            queue.add(lvl -> crack(lvl, x, z, d, w, spill && Math.abs(fi(x, z)) % 3 == 0));
        }
    }

    /**
     * A continental rift: a chasm hundreds of blocks long, up to width wide and depth deep, with a
     * river of lava at the bottom. Built a slice at a time.
     */
    public static void rift(ServerLevel level, BlockQueue queue, int sx, int sz, double dir, int len, int width, int depth) {
        double px = -Math.sin(dir), pz = Math.cos(dir);
        for (int i = -len / 2; i <= len / 2; i++) {
            double taper = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(i) / (len / 2.0 + 1), 2)));
            double wobble = Math.sin(i * 0.07) * width * 0.6 + Math.sin(i * 0.23) * 2;
            int cx = sx + (int) Math.round(Math.cos(dir) * i + px * wobble), cz = sz + (int) Math.round(Math.sin(dir) * i + pz * wobble);
            int half = Math.max(1, (int) (width * taper / 2));
            int d = Math.max(4, (int) (depth * taper));
            queue.add(lvl -> {
                int cost = 0;
                for (int k = -half; k <= half; k++) {
                    int x = cx + (int) Math.round(px * k), z = cz + (int) Math.round(pz * k);
                    if (!lvl.hasChunk(x >> 4, z >> 4)) {
                        lvl.getChunk(x >> 4, z >> 4);
                        cost += BlockQueue.CHUNK_LOAD / 8;
                    }
                    int edge = Math.abs(k) == half ? 2 : 0;
                    cost += crack(lvl, x, z, d - edge * 3, 0, false);
                }
                return cost;
            });
        }
    }

    private static int fi(int x, int z) {
        return x * 31 + z * 17;
    }

    private static int crack(ServerLevel level, int x, int z, int depth, int w, boolean spill) {
        if (!Terrain.loaded(level, x, z)) return 1;
        int cost = 0;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (int ox = -w; ox <= w; ox++) {
            int top = Terrain.topY(level, x + ox, z);
            for (int y = top; y > top - depth && y > level.getMinBuildHeight() + 1; y--) {
                pos.set(x + ox, y, z);
                BlockState s = level.getBlockState(pos);
                if (Terrain.isProtected(level, pos, s) || !s.getFluidState().isEmpty()) break;
                boolean bottom = y <= top - depth + 2;
                level.setBlock(pos, bottom ? Blocks.LAVA.defaultBlockState() : Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                cost++;
            }
            if (spill) {
                pos.set(x + ox, top, z);
                level.setBlock(pos, Blocks.LAVA.defaultBlockState(), Block.UPDATE_ALL);
            }
            if (level.random.nextFloat() < 0.3F) {
                level.sendParticles(ParticleTypes.LARGE_SMOKE, x + ox + 0.5, top + 1, z + 0.5, 6, 0.3, 0.5, 0.3, 0.02);
            }
        }
        // Collapse the walls a little so the crack looks torn rather than cut.
        for (Direction d : Direction.Plane.HORIZONTAL) {
            BlockPos edge = new BlockPos(x, Terrain.topY(level, x, z), z).relative(d, w + 1);
            BlockState s = level.getBlockState(edge);
            if (level.random.nextFloat() < 0.25F && !Terrain.isProtected(level, edge, s) && s.getFluidState().isEmpty()) {
                FallingBlockEntity.fall(level, edge, s);
            }
        }
        return cost;
    }
}
