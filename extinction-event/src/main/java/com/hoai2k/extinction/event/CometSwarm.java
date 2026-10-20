package com.hoai2k.extinction.event;

import com.hoai2k.extinction.world.Atmosphere;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Firestorm;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Terrain;
import net.minecraft.server.level.ServerPlayer;

/**
 * The Earth runs into the debris trail of a broken comet (the Younger Dryas impact idea). Shooting
 * stars become fireballs, the fireballs explode in the air like Tunguska and lay forests flat in
 * circles, the biggest pieces hit the ground, and a sudden cold snap follows.
 */
public final class CometSwarm extends Catastrophe {
    public CometSwarm() {
        super("comet_swarm");
        act("shower", 70).sky(0.25F, 0.4F, 0.45F, 0.7F).fog(0.25F).music(Act.MUSIC_END).ambient(Act.AMB_SPARKS);
        act("airbursts", 180).sky(0.6F, 0.95F, 0.5F, 0.2F).fog(0.4F).biome(BiomeShifter.SCORCHED).music(Act.MUSIC_BOSS)
                .ambient(Act.AMB_EMBERS).quake(0.3F).weather(Act.WEATHER_CLEAR).dieOff(0.2F);
        act("impacts", 120).sky(0.75F, 0.7F, 0.3F, 0.12F).fog(0.5F).biome(BiomeShifter.SCORCHED).music(Act.MUSIC_BOSS)
                .ambient(Act.AMB_ASH).quake(0.6F).weather(Act.WEATHER_CLEAR).dieOff(0.5F);
        act("cold_snap", 90).sky(0.7F, 0.45F, 0.5F, 0.55F).fog(0.5F).biome(BiomeShifter.FROZEN).music(Act.MUSIC_DEEP_DARK)
                .ambient(Act.AMB_WHITE_ASH).weather(Act.WEATHER_RAIN).dieOff(0.8F);
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        long time = sc.level.getGameTime();
        switch (act) {
            case 0 -> {
                if (every(t, 30)) for (ServerPlayer pl : Terrain.players(sc.level)) Firestorm.ejecta(sc.level, pl, sc.data.center, sc.level.random);
            }
            case 1 -> {
                if (every(t, 100 - (int) (40 * p))) {
                    int[] at = near(sc, 70, 260);
                    if (at != null) Hazards.airburst(sc, at[0], at[1], 130 + sc.level.random.nextInt(120));
                }
                if (every(t, 8)) for (ServerPlayer pl : Terrain.players(sc.level)) Firestorm.ejecta(sc.level, pl, sc.data.center, sc.level.random);
            }
            case 2 -> {
                if (every(t, 160)) {
                    int[] at = near(sc, 90, 220);
                    if (at != null) Hazards.meteorStrike(sc, at[0], at[1], 10 + sc.level.random.nextInt(14));
                }
                if (every(t, 140)) {
                    int[] at = near(sc, 120, 300);
                    if (at != null) Hazards.airburst(sc, at[0], at[1], 160);
                }
                if (every(t, 6)) for (ServerPlayer pl : Terrain.players(sc.level)) Firestorm.ejecta(sc.level, pl, sc.data.center, sc.level.random);
            }
            default -> Atmosphere.winter(sc.level, time, 0.5F + 0.4F * p);
        }
    }
}
