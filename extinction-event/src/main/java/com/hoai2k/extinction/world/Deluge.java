package com.hoai2k.extinction.world;

import com.hoai2k.extinction.ExtinctionConfig;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * The sea rises over the land. The flood level climbs towards a target, and every column near a
 * player below it fills with water, layer by layer; when the waters recede the flood level falls
 * and the water above it is taken away again. Only water above the original sea level is touched.
 */
public final class Deluge {
    private static final int REACH = 96;
    private static final int BUDGET = 2500;

    private double level;
    private double target;
    private double rate;
    private int row;

    public Deluge(ServerLevel world) {
        this.level = world.getSeaLevel() - 1;
        this.target = level;
    }

    public int floodY() {
        return (int) level;
    }

    /** Rise (or fall) towards y at blocks per tick. */
    public void aim(double y, double blocksPerTick) {
        target = y;
        rate = blocksPerTick;
    }

    public void tick(ServerLevel world) {
        if (level < target) level = Math.min(target, level + rate);
        else if (level > target) level = Math.max(target, level - rate);
        if (!ExtinctionConfig.DESTROY_TERRAIN.get()) return;
        int sea = world.getSeaLevel() - 1, fy = (int) level;
        int spent = 0;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        // A few rows of the square around each player per tick, sweeping back and forth.
        for (ServerPlayer p : Terrain.players(world)) {
            for (int k = 0; k < 10 && spent < BUDGET; k++) {
                row = (row + 1) % (REACH * 2 + 1);
                int x = p.getBlockX() - REACH + row;
                for (int z = p.getBlockZ() - REACH; z <= p.getBlockZ() + REACH && spent < BUDGET; z++) {
                    if (!Terrain.loaded(world, x, z)) continue;
                    int floor = world.getHeight(Heightmap.Types.OCEAN_FLOOR, x, z);
                    if (fy > sea) {
                        for (int y = Math.max(floor, sea + 1); y <= fy; y++) {
                            pos.set(x, y, z);
                            BlockState s = world.getBlockState(pos);
                            if (s.isAir() || Terrain.isPlant(s) || s.is(Blocks.WATER) && !s.getFluidState().isSource()) {
                                world.setBlock(pos, Blocks.WATER.defaultBlockState(), Block.UPDATE_CLIENTS);
                                spent++;
                            }
                        }
                    }
                    // Take away water above the flood level (only above the real sea, never the ocean itself).
                    for (int y = Math.max(fy + 1, sea + 1); y <= Math.max(fy + 2, sea + 1) + 2; y++) {
                        pos.set(x, y, z);
                        if (world.getBlockState(pos).is(Blocks.WATER)) {
                            world.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                            spent++;
                        }
                    }
                }
            }
        }
    }
}
