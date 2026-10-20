package com.hoai2k.extinction.world;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ExtinctionData;
import com.hoai2k.extinction.entity.MeteorEntity;
import com.hoai2k.extinction.net.FxMsg;
import com.hoai2k.extinction.net.Net;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LightningBolt;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;

import java.util.List;

/**
 * The Deccan Traps: volcanoes rise out of the ground near the players, then erupt again and again,
 * pouring lava down their flanks, hurling volcanic bombs and throwing up ash plumes full of lightning.
 */
public final class Volcanoes {
    private static final int TICKS_PER_LAYER = 14;

    private Volcanoes() {}

    public static void create(ServerLevel level, ExtinctionData d) {
        List<ServerPlayer> players = Terrain.players(level);
        if (players.isEmpty()) return;
        RandomSource rnd = level.random;
        for (int i = 0; i < ExtinctionConfig.VOLCANO_COUNT.get(); i++) {
            ServerPlayer p = players.get(i % players.size());
            double a = rnd.nextDouble() * Math.PI * 2;
            int dist = 75 + rnd.nextInt(60);
            int x = p.getBlockX() + (int) (Math.cos(a) * dist), z = p.getBlockZ() + (int) (Math.sin(a) * dist);
            level.getChunk(x >> 4, z >> 4);
            int y = Terrain.groundY(level, x, z);
            int h = 30 + rnd.nextInt(16);
            d.volcanoes.add(new ExtinctionData.Volcano(new BlockPos(x, y, z), h, (int) (h * 1.25)));
        }
        d.setDirty();
    }

    public static void tick(ServerLevel level, ExtinctionData d, BlockQueue queue, int phaseTick) {
        boolean destroy = ExtinctionConfig.DESTROY_TERRAIN.get();
        RandomSource rnd = level.random;
        for (ExtinctionData.Volcano v : d.volcanoes) {
            if (!v.finished() && phaseTick % TICKS_PER_LAYER == 0) {
                int layer = v.built;
                if (destroy) queueLayer(queue, v, layer);
                v.built++;
                d.setDirty();
                if (rnd.nextFloat() < 0.3F) rumble(level, v, 0.4F);
            }
            BlockPos vent = destroy ? v.vent() : v.base.above(v.height);
            if (phaseTick % 8 == 0) plume(level, vent, v.finished() ? 1F : 0.4F);
            if (v.finished() && rnd.nextInt(160) == 0) erupt(level, v, vent, destroy, rnd);
        }
    }

    private static void queueLayer(BlockQueue queue, ExtinctionData.Volcano v, int layer) {
        int H = v.height, R = v.radius;
        double t = layer / (double) H;
        double r = R * Math.pow(1 - t, 1.25) + 3;
        int ri = (int) Math.ceil(r);
        boolean top = layer >= H - 4;
        Block rock = Terrain.volcanicRock();
        for (int dx = -ri; dx <= ri; dx++) {
            int fdx = dx;
            queue.add(level -> {
                int cost = 0;
                BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
                RandomSource rnd = level.random;
                for (int dz = -ri; dz <= ri; dz++) {
                    double dd = Math.sqrt(fdx * fdx + dz * dz);
                    if (dd > r || (top && dd < 3.2)) continue;
                    int x = v.base.getX() + fdx, z = v.base.getZ() + dz;
                    if (!level.hasChunk(x >> 4, z >> 4)) {
                        level.getChunk(x >> 4, z >> 4);
                        cost += BlockQueue.CHUNK_LOAD / 4;
                    }
                    int y = v.base.getY() + layer;
                    pos.set(x, y, z);
                    BlockState s = level.getBlockState(pos);
                    if (Terrain.isProtected(level, pos, s)) continue;
                    if (!s.isAir() && !Terrain.isPlant(s) && !Terrain.isTree(s) && s.getFluidState().isEmpty()) continue;
                    float f = rnd.nextFloat();
                    BlockState put = f < 0.45F ? rock.defaultBlockState() : f < 0.75F ? Blocks.BLACKSTONE.defaultBlockState()
                            : f < 0.88F ? Blocks.BASALT.defaultBlockState() : f < 0.95F ? Blocks.MAGMA_BLOCK.defaultBlockState()
                            : Blocks.TUFF.defaultBlockState();
                    level.setBlock(pos, put, Block.UPDATE_CLIENTS);
                    cost++;
                }
                return cost;
            });
        }
        if (layer == H - 1) {
            queue.add(level -> {
                BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
                int cost = 0;
                for (int dx = -3; dx <= 3; dx++)
                    for (int dz = -3; dz <= 3; dz++)
                        for (int y = v.base.getY() + H - 6; y <= v.base.getY() + H - 2; y++) {
                            if (dx * dx + dz * dz > 10) continue;
                            pos.set(v.base.getX() + dx, y, v.base.getZ() + dz);
                            level.setBlock(pos, Blocks.LAVA.defaultBlockState(), Block.UPDATE_ALL);
                            cost++;
                        }
                return cost;
            });
        }
    }

    private static void plume(ServerLevel level, BlockPos vent, float strength) {
        for (ServerPlayer p : Terrain.players(level)) {
            if (p.distanceToSqr(Vec3.atCenterOf(vent)) > 512 * 512) continue;
            level.sendParticles(p, ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true, vent.getX() + 0.5, vent.getY() + 2, vent.getZ() + 0.5,
                    (int) (10 * strength) + 2, 2.5, 3, 2.5, 0.06);
            level.sendParticles(p, ParticleTypes.LARGE_SMOKE, true, vent.getX() + 0.5, vent.getY() + 4, vent.getZ() + 0.5,
                    (int) (8 * strength), 3, 4, 3, 0.1);
            if (strength > 0.9F) level.sendParticles(p, ParticleTypes.LAVA, true, vent.getX() + 0.5, vent.getY() + 1, vent.getZ() + 0.5, 4, 1.5, 0.5, 1.5, 0);
        }
    }

    private static void rumble(ServerLevel level, ExtinctionData.Volcano v, float strength) {
        BlockPos vent = v.vent();
        for (ServerPlayer p : Terrain.players(level)) {
            if (p.distanceToSqr(Vec3.atCenterOf(vent)) < 400 * 400) Net.to(p, FxMsg.at(FxMsg.QUAKE, vent.getX(), vent.getY(), vent.getZ(), strength));
        }
    }

    private static void erupt(ServerLevel level, ExtinctionData.Volcano v, BlockPos vent, boolean destroy, RandomSource rnd) {
        for (ServerPlayer p : Terrain.players(level)) {
            if (p.distanceToSqr(Vec3.atCenterOf(vent)) < 600 * 600) Net.to(p, FxMsg.at(FxMsg.ERUPTION, vent.getX(), vent.getY(), vent.getZ(), 1));
            if (p.distanceToSqr(Vec3.atCenterOf(vent)) < 512 * 512) {
                level.sendParticles(p, ParticleTypes.EXPLOSION_EMITTER, true, vent.getX() + 0.5, vent.getY() + 3, vent.getZ() + 0.5, 2, 2, 2, 2, 0);
                level.sendParticles(p, ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true, vent.getX() + 0.5, vent.getY() + 6, vent.getZ() + 0.5, 80, 5, 10, 5, 0.12);
                level.sendParticles(p, ParticleTypes.FLAME, true, vent.getX() + 0.5, vent.getY() + 3, vent.getZ() + 0.5, 60, 2, 4, 2, 0.25);
            }
        }
        int bombs = 4 + rnd.nextInt(7);
        for (int i = 0; i < bombs; i++) {
            double a = rnd.nextDouble() * Math.PI * 2, sp = 0.4 + rnd.nextDouble() * 0.9;
            Vec3 vel = new Vec3(Math.cos(a) * sp, 1.3 + rnd.nextDouble() * 0.8, Math.sin(a) * sp);
            MeteorEntity.launch(level, Vec3.atCenterOf(vent).add(0, 2, 0), vel, 0.4F + rnd.nextFloat() * 0.7F, 0.05,
                    rnd.nextBoolean() ? Blocks.MAGMA_BLOCK.defaultBlockState() : Terrain.volcanicRock().defaultBlockState());
        }
        if (destroy) {
            for (int i = 0; i < 3; i++) {
                BlockPos lava = vent.offset(rnd.nextInt(7) - 3, 0, rnd.nextInt(7) - 3);
                if (level.getBlockState(lava).isAir() || level.getBlockState(lava).is(Blocks.LAVA)) {
                    level.setBlock(lava, Blocks.LAVA.defaultBlockState(), Block.UPDATE_ALL);
                }
            }
        }
        if (rnd.nextFloat() < 0.6F) {
            LightningBolt bolt = EntityType.LIGHTNING_BOLT.create(level);
            if (bolt != null) {
                int x = vent.getX() + rnd.nextInt(41) - 20, z = vent.getZ() + rnd.nextInt(41) - 20;
                bolt.moveTo(x + 0.5, Terrain.groundY(level, x, z) + 1, z + 0.5);
                bolt.setVisualOnly(!destroy);
                level.addFreshEntity(bolt);
            }
        }
    }
}
