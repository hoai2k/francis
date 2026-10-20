package com.hoai2k.extinction.world;

import com.hoai2k.extinction.ExtinctionData;
import com.hoai2k.extinction.ModRegistry;
import com.hoai2k.extinction.spawn.SpawnRules;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraftforge.common.Tags;

import java.util.Iterator;

/**
 * Leaves the geological record of the extinction: the iridium-rich K-Pg boundary clay a few blocks
 * under the surface, fossil deposits in the rock, and a fossil wherever an extinct creature died.
 */
public final class FossilLayers {
    private FossilLayers() {}

    public static void layChunk(ServerLevel level, ChunkPos cp, ExtinctionData d, SpawnRules rules) {
        RandomSource rnd = level.random;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        BlockState clay = ModRegistry.KPG_CLAY.get().defaultBlockState();
        for (int x = cp.getMinBlockX(); x <= cp.getMaxBlockX(); x++) {
            for (int z = cp.getMinBlockZ(); z <= cp.getMaxBlockZ(); z++) {
                int y = Terrain.groundY(level, x, z) - 3 - ((x * 31 + z * 17) & 1);
                pos.set(x, y, z);
                if (isHost(level.getBlockState(pos))) level.setBlock(pos, clay, Block.UPDATE_CLIENTS);
            }
        }
        for (int i = 0; i < rules.depositsPerChunk; i++) {
            SpawnRules.Deposit dep = rules.pickDeposit(rnd);
            if (dep == null) break;
            int x = cp.getMinBlockX() + rnd.nextInt(16), z = cp.getMinBlockZ() + rnd.nextInt(16);
            int y = Terrain.groundY(level, x, z) - dep.minDepth - rnd.nextInt(Math.max(1, dep.maxDepth - dep.minDepth + 1));
            vein(level, new BlockPos(x, y, z), dep, rnd);
        }
        Iterator<ExtinctionData.Death> it = d.deaths.iterator();
        while (it.hasNext()) {
            ExtinctionData.Death death = it.next();
            if ((death.pos().getX() >> 4) != cp.x || (death.pos().getZ() >> 4) != cp.z) continue;
            bury(level, death, rules, rnd);
            it.remove();
            d.setDirty();
        }
    }

    /** Buries one fossil cluster under where the creature fell. */
    public static void bury(ServerLevel level, ExtinctionData.Death death, SpawnRules rules, RandomSource rnd) {
        Block fossil = rules.fossilFor(death.entity());
        int x = death.pos().getX(), z = death.pos().getZ();
        level.getChunk(x >> 4, z >> 4);
        int y = Terrain.groundY(level, x, z) - 4 - rnd.nextInt(4);
        BlockPos c = new BlockPos(x, y, z);
        int n = 3 + rnd.nextInt(3);
        for (int i = 0; i < n; i++) {
            BlockPos p = c.offset(rnd.nextInt(3) - 1, rnd.nextInt(2) - 1, rnd.nextInt(3) - 1);
            BlockState s = level.getBlockState(p);
            if (isHost(s) || s.is(ModRegistry.KPG_CLAY.get())) level.setBlock(p, fossil.defaultBlockState(), Block.UPDATE_CLIENTS);
        }
    }

    private static void vein(ServerLevel level, BlockPos start, SpawnRules.Deposit dep, RandomSource rnd) {
        int size = dep.minSize + rnd.nextInt(Math.max(1, dep.maxSize - dep.minSize + 1));
        BlockPos p = start;
        for (int i = 0; i < size; i++) {
            BlockState s = level.getBlockState(p);
            Block put = dep.blockFor(s);
            if (put != null) level.setBlock(p, put.defaultBlockState(), Block.UPDATE_CLIENTS);
            p = p.offset(rnd.nextInt(3) - 1, rnd.nextInt(3) - 1, rnd.nextInt(3) - 1);
        }
    }

    private static boolean isHost(BlockState s) {
        return s.is(BlockTags.BASE_STONE_OVERWORLD) || s.is(BlockTags.DIRT) || s.is(BlockTags.SAND) || s.is(Blocks.GRAVEL)
                || s.is(Blocks.CLAY) || s.is(Tags.Blocks.SANDSTONE) || s.is(BlockTags.TERRACOTTA) || s.is(ModRegistry.SCORCHED_EARTH.get())
                || s.is(ModRegistry.IMPACT_BRECCIA.get());
    }
}
