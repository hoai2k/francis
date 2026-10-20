package com.hoai2k.extinction.event;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Earthquake;
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Terrain;
import com.hoai2k.extinction.world.Tsunami;
import com.hoai2k.extinction.world.Volcanoes;
import com.hoai2k.extinction.net.FxMsg;
import com.hoai2k.extinction.net.Net;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.phys.Vec3;

/**
 * The continent tears itself apart. Foreshocks, then a megaquake that never seems to stop: the
 * ground splits into chasms hundreds of blocks long with lava at the bottom, volcanoes open along
 * the rift, and the sea pours in as a wall of water.
 */
public final class GreatRift extends Catastrophe {
    public GreatRift() {
        super("great_rift");
        act("foreshocks", 60).sky(0.2F, 0.6F, 0.55F, 0.45F).fog(0.25F).music(Act.MUSIC_DEEP_DARK).ambient(Act.AMB_DUST).quake(0.5F);
        act("megaquake", 120).sky(0.5F, 0.55F, 0.45F, 0.32F).fog(0.45F).music(Act.MUSIC_BOSS).ambient(Act.AMB_DUST).quake(1.4F).dieOff(0.2F);
        act("rift", 150).sky(0.7F, 0.6F, 0.25F, 0.1F).fog(0.5F).biome(BiomeShifter.ASH).music(Act.MUSIC_NETHER)
                .ambient(Act.AMB_EMBERS).quake(0.8F).weather(Act.WEATHER_THUNDER).dieOff(0.4F);
        act("sea", 90).sky(0.6F, 0.3F, 0.38F, 0.42F).fog(0.5F).biome(BiomeShifter.STORM).music(Act.MUSIC_WATER).quake(0.4F)
                .weather(Act.WEATHER_RAIN).dieOff(0.5F);
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        RandomSource rnd = sc.level.random;
        switch (act) {
            case 0 -> {
                if (every(t, 120)) quakeAll(sc, 0.8F);
            }
            case 1 -> {
                if (every(t, 25)) quakeAll(sc, 1.5F);
                if (every(t, 300)) rift(sc, rnd, 260, 14, 70);
            }
            case 2 -> {
                if (every(t, 25)) quakeAll(sc, 1F);
                if (every(t, 400)) rift(sc, rnd, 380, 22, 90);
                if (t == 60) Volcanoes.create(sc, 2, 60, 140, 35, 55);
                Volcanoes.tick(sc, t, 1.5F);
            }
            default -> {
                if (t == 20 || t == 600) {
                    int[] at = near(sc, 380, 460);
                    if (at != null) {
                        BlockPos src = new BlockPos(at[0], sc.level.getSeaLevel(), at[1]);
                        int h = (int) (ExtinctionConfig.TSUNAMI_HEIGHT.get() * 0.9);
                        sc.waves.add(new Tsunami(src, 260, 900, h, 0.55, 0));
                        sc.markers.add(Markers.WAVE, Vec3.atCenterOf(src), 260, 0.55F, h, 0, (int) (640 / 0.55));
                    }
                }
                Volcanoes.tick(sc, t, 1F);
            }
        }
    }

    private static void quakeAll(Scene sc, float strength) {
        for (ServerPlayer pl : Terrain.players(sc.level)) Net.to(pl, FxMsg.at(FxMsg.QUAKE, pl.getX(), pl.getY(), pl.getZ(), strength));
    }

    /** A chasm torn right past a player. */
    private static void rift(Scene sc, RandomSource rnd, int len, int width, int depth) {
        int[] at = near(sc, 15, 50);
        if (at == null || !ExtinctionConfig.DESTROY_TERRAIN.get()) return;
        Earthquake.rift(sc.level, sc.queue, at[0], at[1], rnd.nextDouble() * Math.PI, len, width, depth);
        quakeAll(sc, 2F);
    }
}
