package com.hoai2k.extinction.event;

import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Scene;
import net.minecraft.world.phys.Vec3;

/**
 * Snowball Earth, 700 million years ago: ice runs all the way to the equator. The seas freeze
 * over, blizzards rage for years, and an ice sheet buries the land.
 */
public final class SnowballEarth extends Catastrophe {
    private Vec3 wind = new Vec3(1, 0, 0.3);

    public SnowballEarth() {
        super("snowball_earth");
        act("freeze", 100).sky(0.55F, 0.8F, 0.86F, 0.92F).fog(0.45F).biome(BiomeShifter.GLACIAL).music(Act.MUSIC_DEEP_DARK)
                .ambient(Act.AMB_BLIZZARD).weather(Act.WEATHER_RAIN).dieOff(0.3F);
        act("blizzard", 150).sky(0.85F, 0.88F, 0.9F, 0.95F).fog(0.85F).biome(BiomeShifter.GLACIAL).music(Act.MUSIC_DEEP_DARK)
                .ambient(Act.AMB_BLIZZARD).weather(Act.WEATHER_THUNDER).dieOff(0.8F);
        act("snowball", 150).sky(0.7F, 0.75F, 0.85F, 0.95F).fog(0.6F).biome(BiomeShifter.GLACIAL).music(Act.MUSIC_END)
                .ambient(Act.AMB_BLIZZARD).weather(Act.WEATHER_RAIN).dieOff(1.4F);
        act("thaw", 60).sky(0.35F, 0.6F, 0.65F, 0.7F).fog(0.3F).music(Act.MUSIC_FOREST).weather(Act.WEATHER_RAIN);
    }

    @Override
    public void reset() {
        wind = new Vec3(1, 0, 0.3);
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        long time = sc.level.getGameTime();
        if (every(t, 400)) {
            double a = sc.level.random.nextDouble() * Math.PI * 2;
            wind = new Vec3(Math.cos(a), 0, Math.sin(a));
        }
        switch (act) {
            case 0 -> Hazards.freeze(sc.level, time, 0.35F + 0.35F * p, 2, null);
            case 1 -> {
                Hazards.freeze(sc.level, time, 0.8F + 0.2F * p, 5, wind);
                Hazards.lightning(sc.level, 0.1F);
            }
            case 2 -> Hazards.freeze(sc.level, time, 1F, 9, wind.scale(0.6));
            default -> Hazards.freeze(sc.level, time, 0.2F * (1 - p), 0, null);
        }
    }
}
