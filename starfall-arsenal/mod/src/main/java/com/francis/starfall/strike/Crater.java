package com.francis.starfall.strike;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.block.AmethystClusterBlock;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Direction;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.random.Random;
import net.minecraft.world.Heightmap;

/**
 * Carves an impact crater a few hundred columns per tick, from the centre
 * outward. Spreading the work keeps even the Supernova's blast from stalling
 * the server, and the hole visibly blasts open behind the flash.
 */
public final class Crater {
    public enum Shape {
        /** A shallow bowl sunk into the ground below the centre, lined with magma and blackstone. */
        BOWL,
        /** Everything inside a sphere around the centre is erased; the lining is fused to glass. */
        SPHERE
    }

    private static final int COLUMNS_PER_TICK = 160;
    private static final List<Crater> ACTIVE = new ArrayList<>();
    private static final BlockState[] SCORCH = {
            Blocks.MAGMA_BLOCK.getDefaultState(), Blocks.MAGMA_BLOCK.getDefaultState(),
            Blocks.BLACKSTONE.getDefaultState(), Blocks.BLACKSTONE.getDefaultState(),
            Blocks.BASALT.getDefaultState(), Blocks.OBSIDIAN.getDefaultState(),
            Blocks.CRYING_OBSIDIAN.getDefaultState(), Blocks.COBBLED_DEEPSLATE.getDefaultState(),
    };
    private static final BlockState[] GLASS = {
            Blocks.TINTED_GLASS.getDefaultState(), Blocks.BLACK_STAINED_GLASS.getDefaultState(),
            Blocks.ORANGE_STAINED_GLASS.getDefaultState(), Blocks.OBSIDIAN.getDefaultState(),
            Blocks.MAGMA_BLOCK.getDefaultState(), Blocks.CRYING_OBSIDIAN.getDefaultState(),
    };

    private final ServerWorld world;
    private final Shape shape;
    private final BlockPos center;
    private final float radius;
    private final Random random;
    private final double p1, p2, p3;
    private final List<int[]> columns = new ArrayList<>();
    private boolean core = true;
    private int next;

    private Crater(ServerWorld world, Shape shape, BlockPos center, float radius, Random random) {
        this.world = world;
        this.shape = shape;
        this.center = center;
        this.radius = radius;
        this.random = random;
        this.p1 = random.nextDouble() * MathHelper.TAU;
        this.p2 = random.nextDouble() * MathHelper.TAU;
        this.p3 = random.nextDouble() * MathHelper.TAU;
        int r = MathHelper.ceil(radius) + 3;
        for (int dx = -r; dx <= r; dx++) {
            for (int dz = -r; dz <= r; dz++) {
                if (dx * dx + dz * dz <= (radius + 3) * (radius + 3)) columns.add(new int[]{dx, dz});
            }
        }
        columns.sort(Comparator.comparingInt(c -> c[0] * c[0] + c[1] * c[1]));
    }

    public static void register() {
        ServerTickEvents.END_WORLD_TICK.register(world -> ACTIVE.removeIf(c -> c.world == world && c.step()));
        ServerLifecycleEvents.SERVER_STOPPING.register(server -> ACTIVE.clear());
    }

    public static void start(ServerWorld world, BlockPos center, float radius, Random random) {
        start(world, Shape.BOWL, center, radius, random);
    }

    public static void start(ServerWorld world, Shape shape, BlockPos center, float radius, Random random) {
        start(world, shape, center, radius, random, true);
    }

    /** @param core whether to leave the glowing fallen-star core in the middle */
    public static void start(ServerWorld world, Shape shape, BlockPos center, float radius, Random random, boolean core) {
        Crater crater = new Crater(world, shape, center, radius, random);
        crater.core = core;
        crater.step();
        ACTIVE.add(crater);
    }

    /** Smooth noise around the rim so craters aren't perfect circles. */
    private double rim(double angle) {
        return 0.88 + 0.07 * Math.sin(angle * 3 + p1) + 0.05 * Math.sin(angle * 5 + p2) + 0.03 * Math.sin(angle * 11 + p3);
    }

    /** Carves the next batch of columns; returns true once the crater is finished. */
    private boolean step() {
        int end = Math.min(columns.size(), next + COLUMNS_PER_TICK);
        for (; next < end; next++) {
            carveColumn(columns.get(next)[0], columns.get(next)[1]);
        }
        if (next >= columns.size()) {
            if (core) placeCore();
            return true;
        }
        return false;
    }

    private void carveColumn(int dx, int dz) {
        int bottom = world.getBottomY() + 1;
        int top = world.getTopYInclusive();
        double d = Math.sqrt(dx * dx + dz * dz);
        double rr = radius * rim(Math.atan2(dz, dx));
        if (d > rr + 2.5) return;
        int x = center.getX() + dx, z = center.getZ() + dz;
        BlockPos.Mutable pos = new BlockPos.Mutable();
        if (d <= rr) {
            double half = Math.sqrt(1 - (d / rr) * (d / rr));
            double depth = shape == Shape.SPHERE ? rr * half : rr * 0.6 * half;
            int floor = Math.max(bottom, (int) Math.round(center.getY() - depth));
            int ceiling = Math.min(top, shape == Shape.SPHERE
                    ? (int) Math.round(center.getY() + rr * half)
                    : center.getY() + (int) (rr * 0.5 + (rr - d) * 0.4) + 2);
            for (int y = floor + 1; y <= ceiling; y++) {
                pos.set(x, y, z);
                BlockState state = world.getBlockState(pos);
                if (state.isAir() || unbreakable(pos, state)) continue;
                world.setBlockState(pos, Blocks.AIR.getDefaultState(), Block.NOTIFY_LISTENERS | Block.FORCE_STATE);
            }
            // Scorched, glassy lining - two blocks thick.
            for (int y = Math.max(bottom, floor - 1); y <= floor; y++) {
                scorch(pos.set(x, y, z), 0.9f);
            }
            if (d < rr * 0.75 && random.nextFloat() < 0.04) {
                pos.set(x, floor + 1, z);
                if (world.getBlockState(pos.down()).isOpaqueFullCube()) {
                    world.setBlockState(pos, Blocks.FIRE.getDefaultState(), Block.NOTIFY_ALL);
                }
            }
        } else {
            // Blasted rim: scorch the surface just outside the bowl.
            int surface = world.getTopY(Heightmap.Type.MOTION_BLOCKING_NO_LEAVES, x, z) - 1;
            if (surface >= bottom && Math.abs(surface - center.getY()) < radius * 1.5) {
                scorch(pos.set(x, surface, z), 0.55f);
            }
        }
    }

    /** The fallen star itself: a glowing core studded with amethyst. */
    private void placeCore() {
        double depth = shape == Shape.SPHERE ? radius * rim(0) : radius * 0.6 * rim(0);
        int floorY = Math.max(world.getBottomY() + 1, (int) Math.round(center.getY() - depth));
        BlockPos core = new BlockPos(center.getX(), floorY, center.getZ());
        if (unbreakable(core, world.getBlockState(core))) return;
        world.setBlockState(core, Blocks.GLOWSTONE.getDefaultState(), Block.NOTIFY_ALL);
        for (Direction dir : Direction.Type.HORIZONTAL) {
            BlockPos side = core.offset(dir);
            if (unbreakable(side, world.getBlockState(side))) continue;
            world.setBlockState(side, Blocks.CRYING_OBSIDIAN.getDefaultState(), Block.NOTIFY_ALL);
            if (world.getBlockState(side.up()).isAir()) {
                world.setBlockState(side.up(), Blocks.AMETHYST_CLUSTER.getDefaultState().with(AmethystClusterBlock.FACING, Direction.UP), Block.NOTIFY_ALL);
            }
        }
        if (world.getBlockState(core.up()).isAir()) {
            world.setBlockState(core.up(), Blocks.LARGE_AMETHYST_BUD.getDefaultState().with(AmethystClusterBlock.FACING, Direction.UP), Block.NOTIFY_ALL);
        }
    }

    private boolean unbreakable(BlockPos pos, BlockState state) {
        return state.getHardness(world, pos) < 0;
    }

    private void scorch(BlockPos pos, float chance) {
        BlockState state = world.getBlockState(pos);
        if (state.isAir() || !state.getFluidState().isEmpty() || unbreakable(pos, state)) return;
        if (random.nextFloat() > chance) return;
        BlockState[] palette = shape == Shape.SPHERE ? GLASS : SCORCH;
        world.setBlockState(pos, palette[random.nextInt(palette.length)], Block.NOTIFY_LISTENERS | Block.FORCE_STATE);
    }
}
