package com.hoai2k.extinction.world;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ExtinctionData;
import com.hoai2k.extinction.ModRegistry;
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
import net.minecraft.world.level.block.SnowLayerBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;

import java.util.List;

/**
 * Volcanoes that rise out of the ground near the players and then tear themselves apart: Plinian
 * blasts, pyroclastic flows racing down the flanks, lava fountains and lava bombs, flank fissures
 * pouring lava, ash columns full of lightning, and ash burying everything for a hundred blocks.
 */
public final class Volcanoes {
    private static final int TICKS_PER_LAYER = 6;
    /** When the last pyroclastic-flow warning card went out, so a string of flows does not spam it. */
    private static long lastWarning = -10000;

    private Volcanoes() {}

    /** Raises count volcanoes around the players (the Deccan Traps). */
    public static void create(Scene sc, int count, int minDist, int maxDist, int minHeight, int maxHeight) {
        ServerLevel level = sc.level;
        List<ServerPlayer> players = Terrain.players(level);
        if (players.isEmpty()) return;
        RandomSource rnd = level.random;
        for (int i = 0; i < count; i++) {
            ServerPlayer p = players.get(i % players.size());
            double a = rnd.nextDouble() * Math.PI * 2;
            int dist = minDist + rnd.nextInt(Math.max(1, maxDist - minDist));
            add(sc, p.getBlockX() + (int) (Math.cos(a) * dist), p.getBlockZ() + (int) (Math.sin(a) * dist),
                    minHeight + rnd.nextInt(Math.max(1, maxHeight - minHeight)));
        }
    }

    public static void add(Scene sc, int x, int z, int height) {
        sc.level.getChunk(x >> 4, z >> 4);
        int y = Terrain.groundY(sc.level, x, z);
        sc.data.volcanoes.add(new ExtinctionData.Volcano(new BlockPos(x, y, z), height, (int) (height * 1.35)));
        sc.data.setDirty();
    }

    public static BlockPos vent(ExtinctionData.Volcano v) {
        return ExtinctionConfig.DESTROY_TERRAIN.get() ? v.vent() : v.base.above(v.height);
    }

    /** violence 1 = Deccan Traps; higher erupts more often and harder. */
    public static void tick(Scene sc, int phaseTick, float violence) {
        ServerLevel level = sc.level;
        ExtinctionData d = sc.data;
        boolean destroy = ExtinctionConfig.DESTROY_TERRAIN.get();
        RandomSource rnd = level.random;
        for (ExtinctionData.Volcano v : d.volcanoes) {
            if (!v.finished() && phaseTick % TICKS_PER_LAYER == 0) {
                if (destroy) queueLayer(sc.queue, v, v.built);
                v.built++;
                d.setDirty();
                if (rnd.nextFloat() < 0.25F) rumble(level, v, 0.5F);
            }
            BlockPos vent = vent(v);
            if (phaseTick % 6 == 0) plume(level, vent, v.finished() ? 1F : 0.5F);
            boolean grown = v.built > v.height / 2;
            if (grown && rnd.nextFloat() < (v.finished() ? 0.007F : 0.003F) * violence) erupt(sc, v, vent, destroy, rnd, violence);
            if (v.finished() && phaseTick % 4 == 0) fountain(level, vent, rnd, destroy);
            if (destroy && phaseTick % 2 == 0) ashAround(level, vent, (int) (110 * Math.min(2, violence)), 6, rnd);
        }
    }

    private static void queueLayer(BlockQueue queue, ExtinctionData.Volcano v, int layer) {
        int H = v.height, R = v.radius;
        double t = layer / (double) H;
        double r = R * Math.pow(1 - t, 1.25) + 4;
        int ri = (int) Math.ceil(r);
        boolean top = layer >= H - 5;
        Block rock = Terrain.volcanicRock();
        for (int dx = -ri; dx <= ri; dx++) {
            int fdx = dx;
            queue.addUrgent(level -> {
                int cost = 0;
                BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
                RandomSource rnd = level.random;
                for (int dz = -ri; dz <= ri; dz++) {
                    double dd = Math.sqrt(fdx * fdx + dz * dz);
                    if (dd > r || (top && dd < 4.2)) continue;
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
                    BlockState put = f < 0.4F ? rock.defaultBlockState() : f < 0.7F ? Blocks.BLACKSTONE.defaultBlockState()
                            : f < 0.84F ? Blocks.BASALT.defaultBlockState() : f < 0.94F ? Blocks.MAGMA_BLOCK.defaultBlockState()
                            : Blocks.TUFF.defaultBlockState();
                    level.setBlock(pos, put, Block.UPDATE_CLIENTS);
                    cost++;
                }
                return cost;
            });
        }
        if (layer == H - 1) {
            queue.addUrgent(level -> {
                BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
                int cost = 0;
                for (int dx = -4; dx <= 4; dx++)
                    for (int dz = -4; dz <= 4; dz++)
                        for (int y = v.base.getY() + H - 8; y <= v.base.getY() + H - 2; y++) {
                            if (dx * dx + dz * dz > 17) continue;
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
            if (p.distanceToSqr(Vec3.atCenterOf(vent)) > 600 * 600) continue;
            level.sendParticles(p, ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true, vent.getX() + 0.5, vent.getY() + 3, vent.getZ() + 0.5,
                    (int) (16 * strength) + 2, 3.5, 4, 3.5, 0.08);
            level.sendParticles(p, ParticleTypes.LARGE_SMOKE, true, vent.getX() + 0.5, vent.getY() + 5, vent.getZ() + 0.5,
                    (int) (12 * strength), 4, 5, 4, 0.14);
            if (strength > 0.9F) level.sendParticles(p, ParticleTypes.LAVA, true, vent.getX() + 0.5, vent.getY() + 1, vent.getZ() + 0.5, 10, 2.5, 0.5, 2.5, 0);
        }
    }

    /** Lava spurting out of the vent all the time, raining glowing blobs on the summit. */
    private static void fountain(ServerLevel level, BlockPos vent, RandomSource rnd, boolean destroy) {
        double a = rnd.nextDouble() * Math.PI * 2, sp = 0.2 + rnd.nextDouble() * 0.5;
        MeteorEntity m = MeteorEntity.launch(level, Vec3.atCenterOf(vent).add(0, 2, 0),
                new Vec3(Math.cos(a) * sp, 1.4 + rnd.nextDouble() * 1.0, Math.sin(a) * sp), 0.35F + rnd.nextFloat() * 0.4F, 0.06,
                Blocks.MAGMA_BLOCK.defaultBlockState());
        m.setLava(destroy && rnd.nextFloat() < 0.35F);
        m.setPower(0.6F);
    }

    /** Ash falling out of the plume onto everything around the volcano. */
    private static void ashAround(ServerLevel level, BlockPos vent, int radius, int n, RandomSource rnd) {
        for (ServerPlayer p : Terrain.players(level)) {
            if (p.distanceToSqr(Vec3.atCenterOf(vent)) > (radius + 64.0) * (radius + 64.0)) continue;
            for (int i = 0; i < n; i++) {
                double a = rnd.nextDouble() * Math.PI * 2, r = Math.sqrt(rnd.nextDouble()) * radius;
                int x = vent.getX() + (int) (Math.cos(a) * r), z = vent.getZ() + (int) (Math.sin(a) * r);
                if (!Terrain.loaded(level, x, z)) continue;
                BlockPos top = new BlockPos(x, Terrain.topY(level, x, z), z);
                BlockState s = level.getBlockState(top);
                if (s.is(ModRegistry.ASH_LAYER.get())) {
                    int layers = s.getValue(SnowLayerBlock.LAYERS);
                    level.setBlock(top, layers < 8 ? s.setValue(SnowLayerBlock.LAYERS, layers + 1) : ModRegistry.ASH_BLOCK.get().defaultBlockState(), Block.UPDATE_CLIENTS);
                } else if (s.isFaceSturdy(level, top, net.minecraft.core.Direction.UP) && level.getBlockState(top.above()).isAir()) {
                    level.setBlock(top.above(), ModRegistry.ASH_LAYER.get().defaultBlockState(), Block.UPDATE_CLIENTS);
                } else if (Terrain.isPlant(s) || s.is(net.minecraft.tags.BlockTags.LEAVES)) {
                    level.setBlock(top, ModRegistry.ASH_LAYER.get().defaultBlockState(), Block.UPDATE_CLIENTS);
                }
            }
        }
    }

    private static void rumble(ServerLevel level, ExtinctionData.Volcano v, float strength) {
        BlockPos vent = v.vent();
        for (ServerPlayer p : Terrain.players(level)) {
            if (p.distanceToSqr(Vec3.atCenterOf(vent)) < 500 * 500) Net.to(p, FxMsg.at(FxMsg.QUAKE, vent.getX(), vent.getY(), vent.getZ(), strength));
        }
    }

    /** A Plinian blast: the vent explodes, bombs fly, lava pours out, and sometimes the column collapses into a pyroclastic flow. */
    public static void erupt(Scene sc, ExtinctionData.Volcano v, BlockPos vent, boolean destroy, RandomSource rnd, float violence) {
        ServerLevel level = sc.level;
        Vec3 top = Vec3.atCenterOf(vent);
        for (ServerPlayer p : Terrain.players(level)) {
            if (p.distanceToSqr(top) < 800 * 800) Net.to(p, FxMsg.at(FxMsg.ERUPTION, vent.getX(), vent.getY(), vent.getZ(), 1));
            if (p.distanceToSqr(top) < 600 * 600) {
                level.sendParticles(p, ParticleTypes.EXPLOSION_EMITTER, true, top.x, top.y + 4, top.z, 6, 4, 4, 4, 0);
                level.sendParticles(p, ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true, top.x, top.y + 8, top.z, 160, 8, 16, 8, 0.2);
                level.sendParticles(p, ParticleTypes.FLAME, true, top.x, top.y + 4, top.z, 120, 3, 6, 3, 0.35);
                level.sendParticles(p, ParticleTypes.LAVA, true, top.x, top.y + 2, top.z, 60, 4, 2, 4, 0);
            }
        }
        sc.markers.add(Markers.FIREBALL, top.add(0, 10, 0), 40 + v.height * 0.5F, 0, 160);
        sc.markers.add(Markers.LAVA_FOUNTAIN, top, v.height, 0, 200);
        int bombs = (int) ((15 + rnd.nextInt(20)) * violence);
        for (int i = 0; i < bombs; i++) {
            double a = rnd.nextDouble() * Math.PI * 2, sp = 0.5 + rnd.nextDouble() * 1.8;
            Vec3 vel = new Vec3(Math.cos(a) * sp, 1.6 + rnd.nextDouble() * 1.6, Math.sin(a) * sp);
            MeteorEntity m = MeteorEntity.launch(level, top.add(0, 3, 0), vel, 0.6F + rnd.nextFloat() * 1.6F, 0.05,
                    rnd.nextBoolean() ? Blocks.MAGMA_BLOCK.defaultBlockState() : Terrain.volcanicRock().defaultBlockState());
            m.setLava(destroy && rnd.nextFloat() < 0.5F);
        }
        if (destroy) {
            for (int i = 0; i < 6; i++) {
                BlockPos lava = vent.offset(rnd.nextInt(9) - 4, rnd.nextInt(2), rnd.nextInt(9) - 4);
                if (level.getBlockState(lava).isAir() || level.getBlockState(lava).is(Blocks.LAVA)) {
                    level.setBlock(lava, Blocks.LAVA.defaultBlockState(), Block.UPDATE_ALL);
                }
            }
            if (rnd.nextFloat() < 0.4F) {
                // A flank fissure splits the side of the mountain and pours lava downhill.
                double a = rnd.nextDouble() * Math.PI * 2;
                int x = v.base.getX() + (int) (Math.cos(a) * v.radius * 0.8), z = v.base.getZ() + (int) (Math.sin(a) * v.radius * 0.8);
                Earthquake.fissureAt(level, sc.queue, x, z, a, 18 + rnd.nextInt(20), 6 + rnd.nextInt(6), true);
            }
        }
        if (rnd.nextFloat() < 0.2F * violence) {
            // The eruption column collapses and avalanches down the mountain as a pyroclastic flow.
            double reach = v.radius * 2.2 + 70 * violence, inner = v.radius * 0.3;
            sc.blasts.add(new Shockwave(v.base, inner, reach, 32, 0.9, Shockwave.Kind.PYRO, 0));
            sc.markers.add(Markers.PYRO, Vec3.atCenterOf(v.base), (float) inner, 0.9F, (float) reach, 0, (int) ((reach - inner) / 0.9));
            long now = level.getGameTime();
            if (now - lastWarning > 600) {
                lastWarning = now;
                for (ServerPlayer p : Terrain.players(level)) {
                    if (p.distanceToSqr(top) < 700 * 700) Net.to(p, FxMsg.title("extinction.title.pyroclastic", "extinction.subtitle.pyroclastic", 4));
                }
            }
        }
        int bolts = 2 + rnd.nextInt(4);
        for (int i = 0; i < bolts; i++) {
            LightningBolt bolt = EntityType.LIGHTNING_BOLT.create(level);
            if (bolt == null) continue;
            int x = vent.getX() + rnd.nextInt(61) - 30, z = vent.getZ() + rnd.nextInt(61) - 30;
            bolt.moveTo(x + 0.5, Terrain.groundY(level, x, z) + 1, z + 0.5);
            bolt.setVisualOnly(!destroy);
            level.addFreshEntity(bolt);
        }
    }
}
