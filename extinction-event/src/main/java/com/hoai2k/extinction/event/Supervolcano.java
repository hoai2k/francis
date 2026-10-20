package com.hoai2k.extinction.event;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.entity.MeteorEntity;
import com.hoai2k.extinction.world.Atmosphere;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Crater;
import com.hoai2k.extinction.world.Earthquake;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Shockwave;
import com.hoai2k.extinction.world.Terrain;
import com.hoai2k.extinction.world.Volcanoes;
import com.hoai2k.extinction.ExtinctionConfig;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.phys.Vec3;

/**
 * A Yellowstone supereruption. The ground swells and cracks, then the whole magma chamber blows at
 * once: a blast that flattens everything for hundreds of blocks, a caldera, an eruption column
 * into space, pyroclastic flows that burn everything in their path, and ash burying the land.
 */
public final class Supervolcano extends Catastrophe {
    private boolean blown;
    private int blownAt;

    public Supervolcano() {
        super("supervolcano");
        act("unrest", 75).sky(0.2F, 0.7F, 0.6F, 0.5F).fog(0.25F).music(Act.MUSIC_DEEP_DARK).ambient(Act.AMB_DUST).quake(0.5F);
        act("eruption", 90).sky(0.75F, 0.5F, 0.2F, 0.08F).fog(0.45F).biome(BiomeShifter.SCORCHED).music(Act.MUSIC_BOSS)
                .ambient(Act.AMB_EMBERS).quake(0.9F).weather(Act.WEATHER_THUNDER);
        act("flows", 120).sky(0.8F, 0.32F, 0.28F, 0.25F).fog(0.55F).biome(BiomeShifter.ASH).music(Act.MUSIC_NETHER)
                .ambient(Act.AMB_ASH).quake(0.5F).weather(Act.WEATHER_THUNDER).dieOff(0.4F);
        act("winter", 120).sky(0.88F, 0.13F, 0.12F, 0.12F).fog(0.65F).biome(BiomeShifter.FROZEN).music(Act.MUSIC_DEEP_DARK)
                .ambient(Act.AMB_ASH).weather(Act.WEATHER_RAIN).dieOff(0.9F);
    }

    @Override
    public void reset() {
        blown = false;
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        long time = sc.level.getGameTime();
        BlockPos c = center(sc);
        RandomSource rnd = sc.level.random;
        switch (act) {
            case 0 -> {
                if (every(t, 50)) {
                    double a = rnd.nextDouble() * Math.PI * 2, r = 20 + rnd.nextDouble() * 120;
                    Earthquake.fissureAt(sc.level, sc.queue, c.getX() + (int) (Math.cos(a) * r), c.getZ() + (int) (Math.sin(a) * r), a, 20 + rnd.nextInt(30), 8, false);
                }
                if (every(t, 4)) steam(sc, c, rnd);
            }
            case 1 -> {
                if (!blown && p >= 0.25F) {
                    blown = true;
                    blownAt = t;
                    blow(sc, c, rnd);
                }
                if (blown) {
                    Volcanoes.tick(sc, t, 2.5F);
                    if (t < blownAt + 400 && every(t, 2)) ejecta(sc, c, rnd);
                    Atmosphere.ashFall(sc.level, 0.8F);
                } else if (every(t, 3)) steam(sc, c, rnd);
            }
            case 2 -> {
                if (!blown) {
                    blown = true;
                    blow(sc, c, rnd);
                }
                if (every(t, 300)) pyro(sc, c, 360 + rnd.nextInt(200));
                Volcanoes.tick(sc, t, 1.8F);
                Atmosphere.ashFall(sc.level, 1.2F);
                Atmosphere.acidRain(sc.level, time);
            }
            default -> {
                Volcanoes.tick(sc, t, 0.6F);
                Atmosphere.winter(sc.level, time, 0.6F + 0.4F * p);
                Atmosphere.ashFall(sc.level, 0.3F);
            }
        }
    }

    private static void steam(Scene sc, BlockPos c, RandomSource rnd) {
        for (ServerPlayer pl : Terrain.players(sc.level)) {
            double a = rnd.nextDouble() * Math.PI * 2, r = rnd.nextDouble() * 120;
            int x = c.getX() + (int) (Math.cos(a) * r), z = c.getZ() + (int) (Math.sin(a) * r);
            if (!Terrain.loaded(sc.level, x, z)) continue;
            sc.level.sendParticles(pl, ParticleTypes.CLOUD, true, x, Terrain.groundY(sc.level, x, z) + 1, z, 10, 0.5, 2, 0.5, 0.15);
        }
    }

    private void blow(Scene sc, BlockPos c, RandomSource rnd) {
        sc.level.getChunk(c.getX() >> 4, c.getZ() >> 4);
        int ground = Terrain.groundY(sc.level, c.getX(), c.getZ());
        BlockPos at = new BlockPos(c.getX(), ground, c.getZ());
        Vec3 v = Vec3.atCenterOf(at);
        title(sc, "blow", 6);
        Hazards.flash(sc.level, v.add(0, 60, 0), 1F);
        sc.markers.add(Markers.FIREBALL, v.add(0, 80, 0), 320, 1, 900);
        sc.markers.add(Markers.PLUME, v, 1400, 140, 0, 0, 0);
        sc.blasts.add(new Shockwave(at, 90, 760, 40, 1.6, Shockwave.Kind.BLAST, 0));
        sc.markers.add(Markers.RING, v, 90, 1.6F, 760, 0, (int) (670 / 1.6));
        pyro(sc, at, 420);
        if (ExtinctionConfig.DESTROY_TERRAIN.get()) Crater.enqueue(sc.queue, at, ground, 95, 28, () -> {});
        for (int i = 0; i < 4; i++) {
            double a = i * Math.PI / 2 + rnd.nextDouble() * 0.6;
            Volcanoes.add(sc, c.getX() + (int) (Math.cos(a) * 150), c.getZ() + (int) (Math.sin(a) * 150), 30 + rnd.nextInt(15));
        }
        for (ServerPlayer pl : Terrain.players(sc.level)) {
            if (Terrain.distXZ(at, pl.getX(), pl.getZ()) < 200 && !pl.isCreative() && !pl.isSpectator()) {
                pl.hurt(DamageTypes.source(sc.level, DamageTypes.PYRO), 1000F);
            }
        }
    }

    private static void pyro(Scene sc, BlockPos c, double reach) {
        sc.blasts.add(new Shockwave(c, 60, reach, 36, 1.1, Shockwave.Kind.PYRO, 0));
        sc.markers.add(Markers.PYRO, Vec3.atCenterOf(c), 60, 1.1F, (float) reach, 0, (int) ((reach - 60) / 1.1));
        for (ServerPlayer pl : Terrain.players(sc.level)) {
            com.hoai2k.extinction.net.Net.to(pl, com.hoai2k.extinction.net.FxMsg.title("extinction.title.pyroclastic", "extinction.subtitle.pyroclastic", 4));
        }
    }

    private static void ejecta(Scene sc, BlockPos c, RandomSource rnd) {
        double a = rnd.nextDouble() * Math.PI * 2, dist = 100 + rnd.nextDouble() * 350;
        double hv = 1.8 + rnd.nextDouble() * 1.6, g = 0.05, tt = dist / hv;
        MeteorEntity m = MeteorEntity.launch(sc.level, Vec3.atCenterOf(c).add(Math.cos(a) * 40, 20, Math.sin(a) * 40),
                new Vec3(Math.cos(a) * hv, 0.5 * g * tt, Math.sin(a) * hv), 0.8F + rnd.nextFloat() * 2F, g, MeteorEntity.randomLook(rnd));
        m.setLava(rnd.nextFloat() < 0.3F);
    }
}
