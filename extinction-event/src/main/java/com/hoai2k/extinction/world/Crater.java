package com.hoai2k.extinction.world;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ExtinctionData;
import com.hoai2k.extinction.ModRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

import java.util.ArrayList;
import java.util.List;

/**
 * Digs a complex impact crater like Chicxulub: a bowl with a raised peak ring, a pool of impact melt
 * in the deepest part, a floor of breccia and glassy rock, and an ejecta rim around the edge.
 */
public final class Crater {
    private Crater() {}

    public static void enqueue(BlockQueue queue, ExtinctionData d, Runnable onDone) {
        int R = ExtinctionConfig.CRATER_RADIUS.get();
        int D = ExtinctionConfig.CRATER_DEPTH.get();
        int outer = (int) Math.ceil(R * 1.45);
        BlockPos c = d.impact;
        int baseY = d.impactGroundY;
        List<int[]> cols = new ArrayList<>();
        for (int dx = -outer; dx <= outer; dx++)
            for (int dz = -outer; dz <= outer; dz++)
                if (dx * dx + dz * dz <= outer * outer) cols.add(new int[]{dx, dz});
        // Centre first so the crater opens outward.
        cols.sort((a, b) -> Integer.compare(a[0] * a[0] + a[1] * a[1], b[0] * b[0] + b[1] * b[1]));
        for (int[] col : cols) {
            int x = c.getX() + col[0], z = c.getZ() + col[1];
            double r = Math.sqrt(col[0] * col[0] + col[1] * col[1]);
            queue.add(level -> carve(level, x, z, r, baseY, R, D));
        }
        queue.add(level -> {
            onDone.run();
            return 1;
        });
    }

    private static int carve(ServerLevel level, int x, int z, double r, int baseY, int R, int D) {
        int cost = 0;
        if (!level.hasChunk(x >> 4, z >> 4)) {
            level.getChunk(x >> 4, z >> 4);
            cost += BlockQueue.CHUNK_LOAD;
        }
        RandomSource rnd = level.random;
        int top = Terrain.topY(level, x, z);
        int minY = level.getMinBuildHeight() + 2;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        Block rock = Terrain.volcanicRock();
        if (r <= R) {
            double t = r / R;
            double depth = D * (1 - t * t);
            depth -= D * 0.4 * Math.exp(-Math.pow((t - 0.38) / 0.09, 2)); // peak ring
            int floor = Math.max(minY + 4, baseY - (int) Math.round(depth));
            int lavaLevel = baseY - (int) (D * 0.72);
            int clearTop = Math.max(top, baseY) + 3;
            for (int y = clearTop; y > floor; y--) {
                pos.set(x, y, z);
                BlockState s = level.getBlockState(pos);
                if (Terrain.isProtected(level, pos, s)) continue;
                BlockState want = y <= lavaLevel ? Blocks.LAVA.defaultBlockState() : Blocks.AIR.defaultBlockState();
                if (s != want) {
                    level.setBlock(pos, want, Block.UPDATE_CLIENTS);
                    cost++;
                }
            }
            for (int y = floor; y > floor - 4 && y > minY; y--) {
                pos.set(x, y, z);
                if (Terrain.isProtected(level, pos, level.getBlockState(pos))) continue;
                level.setBlock(pos, meltSheet(rnd, t, rock), Block.UPDATE_CLIENTS);
                cost++;
            }
        } else {
            double t = (r - R) / (R * 0.45);
            int h = (int) Math.round(D * 0.3 * Math.pow(1 - t, 1.6));
            int ground = Terrain.groundY(level, x, z);
            for (int y = top; y > ground; y--) {
                pos.set(x, y, z);
                BlockState s = level.getBlockState(pos);
                if (Terrain.isTree(s) || Terrain.isPlant(s)) {
                    level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                    cost++;
                }
            }
            for (int y = ground + 1; y <= ground + h; y++) {
                pos.set(x, y, z);
                BlockState s = level.getBlockState(pos);
                if (!s.isAir() && !s.canBeReplaced()) continue;
                level.setBlock(pos, ejecta(rnd, y == ground + h), Block.UPDATE_CLIENTS);
                cost++;
            }
            if (h == 0 && rnd.nextFloat() < 0.6F) {
                pos.set(x, ground, z);
                BlockState s = level.getBlockState(pos);
                if (Terrain.isGrassy(s) || s.is(Blocks.DIRT)) {
                    level.setBlock(pos, ModRegistry.SCORCHED_EARTH.get().defaultBlockState(), Block.UPDATE_CLIENTS);
                    cost++;
                }
            }
        }
        return cost;
    }

    private static BlockState meltSheet(RandomSource rnd, double t, Block rock) {
        float f = rnd.nextFloat();
        if (t < 0.65) {
            if (f < 0.12) return Blocks.MAGMA_BLOCK.defaultBlockState();
            if (f < 0.20) return Blocks.OBSIDIAN.defaultBlockState();
            if (f < 0.55) return ModRegistry.IMPACT_BRECCIA.get().defaultBlockState();
            if (f < 0.80) return Blocks.BLACKSTONE.defaultBlockState();
            return rock.defaultBlockState();
        }
        if (f < 0.55) return ModRegistry.IMPACT_BRECCIA.get().defaultBlockState();
        if (f < 0.75) return Blocks.TUFF.defaultBlockState();
        if (f < 0.9) return Blocks.COBBLED_DEEPSLATE.defaultBlockState();
        return Blocks.GRAVEL.defaultBlockState();
    }

    private static BlockState ejecta(RandomSource rnd, boolean surface) {
        float f = rnd.nextFloat();
        if (surface && f < 0.4F) return ModRegistry.SCORCHED_EARTH.get().defaultBlockState();
        if (f < 0.35F) return ModRegistry.IMPACT_BRECCIA.get().defaultBlockState();
        if (f < 0.55F) return Blocks.GRAVEL.defaultBlockState();
        if (f < 0.75F) return Blocks.COBBLESTONE.defaultBlockState();
        if (f < 0.9F) return Blocks.TUFF.defaultBlockState();
        return Blocks.COARSE_DIRT.defaultBlockState();
    }
}
