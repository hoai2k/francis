package com.hoai2k.extinction.event;

import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Scene;
import net.minecraft.world.phys.Vec3;

/**
 * The Sun throws a superflare thousands of times bigger than the Carrington Event. The sky lights
 * up with aurora, the magnetic storm fills the air with lightning, and then the heat arrives:
 * the day side of the world catches fire and the water boils.
 */
public final class SolarSuperflare extends Catastrophe {
    private Markers.Marker sun;

    public SolarSuperflare() {
        super("solar_superflare");
        act("sunspots", 60).sky(0.25F, 1F, 0.85F, 0.55F).fog(0.2F).music(Act.MUSIC_END).ambient(Act.AMB_SPARKS).weather(Act.WEATHER_CLEAR);
        act("flare", 45).sky(0.65F, 1F, 0.95F, 0.85F).fog(0.25F).biome(BiomeShifter.SCORCHED).music(Act.MUSIC_BOSS)
                .ambient(Act.AMB_SPARKS).quake(0.2F).weather(Act.WEATHER_THUNDER);
        act("inferno", 150).sky(0.75F, 1F, 0.45F, 0.12F).fog(0.45F).biome(BiomeShifter.SCORCHED).music(Act.MUSIC_NETHER)
                .ambient(Act.AMB_EMBERS).weather(Act.WEATHER_CLEAR).dieOff(0.9F);
        act("aurora", 60).sky(0.45F, 0.3F, 0.5F, 0.45F).fog(0.35F).biome(BiomeShifter.ASH).music(Act.MUSIC_DEEP_DARK).ambient(Act.AMB_ASH);
    }

    @Override
    public void reset() {
        sun = null;
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        long time = sc.level.getGameTime();
        if (sun == null || !sc.markers.all().contains(sun)) sun = sc.markers.add(Markers.SUN, Vec3.ZERO, 1, 0, 0, 0, 0);
        switch (act) {
            case 0 -> {
                sun.a = 1 + 1.5F * p;
                sun.b = 0.2F;
                if (t == 20) sc.markers.add(Markers.AURORA, Vec3.ZERO, 0.6F, 0, 0, 0, 0);
                Hazards.lightning(sc.level, 0.05F);
            }
            case 1 -> {
                sun.a = 4F;
                sun.b = 1F;
                if (t == 20) Hazards.flash(sc.level, sc.level.players().isEmpty() ? Vec3.ZERO : sc.level.players().get(0).position(), 1F);
                Hazards.lightning(sc.level, 1.6F);
                Hazards.uvBurn(sc.level, time, 0.7F);
            }
            case 2 -> {
                sun.a = 3.2F;
                sun.b = 0.6F;
                Hazards.uvBurn(sc.level, time, 1F);
                Hazards.heat(sc.level, time, 0.8F + 0.2F * p);
                Hazards.lightning(sc.level, 0.3F);
            }
            default -> {
                sun.a = 1.2F;
                sun.b = 0;
            }
        }
    }
}
