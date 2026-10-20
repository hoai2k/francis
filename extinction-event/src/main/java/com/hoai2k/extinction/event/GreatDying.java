package com.hoai2k.extinction.event;

import com.hoai2k.extinction.world.Atmosphere;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Earthquake;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Volcanoes;

/**
 * The end-Permian extinction, 252 million years ago, the worst there has ever been. The Siberian
 * Traps flood a continent with lava, the air fills with ash and acid, the planet overheats and the
 * oceans suffocate and turn to poison. About 90% of species die.
 */
public final class GreatDying extends Catastrophe {
    public GreatDying() {
        super("great_dying");
        act("traps", 150).sky(0.6F, 0.45F, 0.12F, 0.06F).fog(0.4F).biome(BiomeShifter.ASH).music(Act.MUSIC_NETHER)
                .ambient(Act.AMB_EMBERS).quake(0.45F).weather(Act.WEATHER_THUNDER);
        act("winter", 90).sky(0.85F, 0.12F, 0.1F, 0.1F).fog(0.6F).biome(BiomeShifter.FROZEN).music(Act.MUSIC_DEEP_DARK)
                .ambient(Act.AMB_ASH).quake(0.15F).weather(Act.WEATHER_RAIN).dieOff(0.5F);
        act("hothouse", 150).sky(0.6F, 0.95F, 0.78F, 0.45F).fog(0.45F).biome(BiomeShifter.HOTHOUSE).music(Act.MUSIC_NETHER)
                .ambient(Act.AMB_DUST).weather(Act.WEATHER_CLEAR).dieOff(0.8F);
        act("anoxia", 150).sky(0.65F, 0.35F, 0.55F, 0.3F).fog(0.5F).biome(BiomeShifter.ANOXIC).music(Act.MUSIC_WATER)
                .ambient(Act.AMB_TOXIC).weather(Act.WEATHER_CLEAR).dieOff(1.2F);
        act("dying", 60).sky(0.4F, 0.6F, 0.55F, 0.45F).fog(0.3F).biome(BiomeShifter.HOTHOUSE).music(Act.MUSIC_DEEP_DARK).dieOff(1.6F);
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        long time = sc.level.getGameTime();
        switch (act) {
            case 0 -> {
                // Flood basalts: fissures that brim over and pour lava across the land, and volcanoes rising along them.
                if (t == 100) Volcanoes.create(sc, 3, 90, 170, 40, 60);
                if (every(t, 70)) {
                    int[] at = near(sc, 25, 90);
                    if (at != null) Earthquake.fissureAt(sc.level, sc.queue, at[0], at[1], sc.level.random.nextDouble() * Math.PI,
                            30 + sc.level.random.nextInt(40), 6 + sc.level.random.nextInt(6), true);
                }
                Volcanoes.tick(sc, t, 1.4F);
                Atmosphere.ashFall(sc.level, 0.5F + p * 0.5F);
                if (p > 0.3F) Atmosphere.acidRain(sc.level, time);
            }
            case 1 -> {
                Volcanoes.tick(sc, t, 0.8F);
                Atmosphere.winter(sc.level, time, 0.7F + 0.3F * p);
                Atmosphere.acidRain(sc.level, time);
                Atmosphere.ashFall(sc.level, 0.3F);
            }
            case 2 -> Hazards.heat(sc.level, time, 0.5F + 0.5F * p);
            case 3 -> {
                Hazards.heat(sc.level, time, 0.6F);
                Hazards.toxicWater(sc.level, time, 0.5F + 0.5F * p);
            }
            default -> Hazards.toxicWater(sc.level, time, 0.4F);
        }
    }
}
