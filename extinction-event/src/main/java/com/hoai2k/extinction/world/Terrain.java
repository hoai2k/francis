package com.hoai2k.extinction.world;

import net.minecraft.core.BlockPos;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.BaseFireBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.BushBlock;
import net.minecraft.world.level.block.CampfireBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraftforge.registries.ForgeRegistries;

import java.util.List;

/** Block helpers shared by the disasters. */
public final class Terrain {
    private Terrain() {}

    /** A block from another mod (e.g. Fossils and Archeology) if it is installed, else the fallback. */
    public static Block optional(String id, Block fallback) {
        ResourceLocation rl = ResourceLocation.tryParse(id);
        if (rl != null && ForgeRegistries.BLOCKS.containsKey(rl)) return ForgeRegistries.BLOCKS.getValue(rl);
        return fallback;
    }

    public static Block volcanicRock() {
        return optional("fossil:volcanic_rock", Blocks.BASALT);
    }

    public static boolean loaded(ServerLevel level, int x, int z) {
        return level.hasChunk(x >> 4, z >> 4);
    }

    /** Y of the highest non-air block (leaves and plants included). */
    public static int topY(ServerLevel level, int x, int z) {
        return level.getHeight(Heightmap.Types.WORLD_SURFACE, x, z) - 1;
    }

    /** Y of the highest solid or liquid block, ignoring leaves. */
    public static int groundY(ServerLevel level, int x, int z) {
        return level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z) - 1;
    }

    public static boolean isPlant(BlockState s) {
        if (s.isAir() || !s.getFluidState().isEmpty()) return false;
        return s.getBlock() instanceof BushBlock || s.is(BlockTags.FLOWERS) || s.is(BlockTags.SAPLINGS)
                || s.is(BlockTags.CROPS) || s.is(Blocks.VINE) || s.is(Blocks.SNOW) || s.canBeReplaced();
    }

    public static boolean isTree(BlockState s) {
        return s.is(BlockTags.LOGS) || s.is(BlockTags.LEAVES);
    }

    public static boolean isGrassy(BlockState s) {
        return s.is(Blocks.GRASS_BLOCK) || s.is(Blocks.PODZOL) || s.is(Blocks.MYCELIUM) || s.is(Blocks.MOSS_BLOCK);
    }

    /** Never touch these: player storage, machines, unbreakable blocks. */
    public static boolean isProtected(ServerLevel level, BlockPos pos, BlockState s) {
        return s.hasBlockEntity() || s.getDestroySpeed(level, pos) < 0 || s.is(Blocks.OBSIDIAN) || s.is(Blocks.CRYING_OBSIDIAN);
    }

    /** Something warm a player can huddle next to during the impact winter. */
    public static boolean nearHeat(ServerLevel level, BlockPos center, int r) {
        for (BlockPos p : BlockPos.betweenClosed(center.offset(-r, -2, -r), center.offset(r, 2, r))) {
            BlockState s = level.getBlockState(p);
            if (s.getBlock() instanceof BaseFireBlock || s.is(Blocks.LAVA) || s.is(Blocks.MAGMA_BLOCK)) return true;
            if (s.getBlock() instanceof CampfireBlock && s.getValue(CampfireBlock.LIT)) return true;
            if (s.hasProperty(net.minecraft.world.level.block.state.properties.BlockStateProperties.LIT)
                    && s.getValue(net.minecraft.world.level.block.state.properties.BlockStateProperties.LIT)
                    && !s.is(Blocks.REDSTONE_TORCH) && !s.is(Blocks.REDSTONE_ORE)) return true;
        }
        return false;
    }

    /** A random column within r blocks of the player, or null if its chunk is not loaded. */
    public static BlockPos randomColumn(ServerLevel level, ServerPlayer p, int r, RandomSource rnd) {
        int x = p.getBlockX() + rnd.nextInt(r * 2 + 1) - r;
        int z = p.getBlockZ() + rnd.nextInt(r * 2 + 1) - r;
        if (!loaded(level, x, z)) return null;
        return new BlockPos(x, topY(level, x, z), z);
    }

    /** Everyone the world changes happen around (spectators too, so the event can be filmed). Hazards check each player. */
    public static List<ServerPlayer> players(ServerLevel level) {
        return level.players();
    }

    public static double distXZ(BlockPos a, double x, double z) {
        double dx = a.getX() + 0.5 - x, dz = a.getZ() + 0.5 - z;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
