package com.hoai2k.extinction.event;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Deluge;
import com.hoai2k.extinction.world.Firestorm;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Terrain;
import com.hoai2k.extinction.world.Tsunami;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.phys.Vec3;

/**
 * Something hits the Moon and it comes apart. The pieces spread into a ring, the ring starts to
 * fall, and for days the sky rains mountains. Without the Moon the tides go wild.
 */
public final class ShatteredMoon extends Catastrophe {
    private Markers.Marker moon;
    private Deluge tide;

    public ShatteredMoon() {
        super("shattered_moon");
        act("cracks", 60).sky(0.3F, 0.5F, 0.5F, 0.65F).fog(0.25F).music(Act.MUSIC_END).ambient(Act.AMB_NONE).quake(0.2F);
        act("breakup", 40).sky(0.45F, 0.65F, 0.6F, 0.7F).fog(0.3F).music(Act.MUSIC_BOSS).quake(0.4F);
        act("lunar_rain", 180).sky(0.75F, 0.75F, 0.38F, 0.15F).fog(0.5F).biome(BiomeShifter.SCORCHED).music(Act.MUSIC_BOSS)
                .ambient(Act.AMB_EMBERS).quake(0.6F).weather(Act.WEATHER_CLEAR).dieOff(0.6F);
        act("tides", 120).sky(0.65F, 0.3F, 0.36F, 0.44F).fog(0.55F).biome(BiomeShifter.STORM).music(Act.MUSIC_WATER)
                .ambient(Act.AMB_ASH).quake(0.3F).weather(Act.WEATHER_THUNDER).dieOff(0.8F);
        act("ring", 45).sky(0.35F, 0.45F, 0.45F, 0.55F).fog(0.3F).music(Act.MUSIC_END);
    }

    @Override
    public void reset() {
        moon = null;
        tide = null;
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        if (moon == null || !sc.markers.all().contains(moon)) moon = sc.markers.add(Markers.MOON, Vec3.ZERO, 0, 0, 0, 0, 0);
        if (tide == null) tide = new Deluge(sc.level);
        int sea = sc.level.getSeaLevel();
        switch (act) {
            case 0 -> {
                moon.a = 0.5F * p;
                tide.aim(sea - 1 + 4, 0.01);
            }
            case 1 -> {
                moon.a = 1 + p;
                if (t == 100) {
                    Hazards.flash(sc.level, sc.level.players().isEmpty() ? Vec3.ZERO : sc.level.players().get(0).position().add(0, 600, 0), 0.7F);
                    title(sc, "shatter", 5);
                }
            }
            case 2 -> {
                moon.a = 2 + p;
                if (every(t, 120 - (int) (50 * p))) {
                    int[] at = near(sc, 80, 240);
                    if (at != null) Hazards.meteorStrike(sc, at[0], at[1], 12 + sc.level.random.nextInt(22));
                }
                if (every(t, 5)) for (ServerPlayer pl : Terrain.players(sc.level)) Firestorm.ejecta(sc.level, pl, sc.data.center, sc.level.random);
                tide.aim(sea - 1 + 8, 0.01);
            }
            case 3 -> {
                moon.a = 3;
                tide.aim(sea - 1 + ExtinctionConfig.FLOOD_HEIGHT.get() * 0.6, 0.02);
                if (every(t, 500)) {
                    int[] at = near(sc, 400, 480);
                    if (at != null) {
                        BlockPos src = new BlockPos(at[0], sea, at[1]);
                        int h = ExtinctionConfig.TSUNAMI_HEIGHT.get();
                        sc.waves.add(new Tsunami(src, 280, 900, h, 0.6, 0));
                        sc.markers.add(Markers.WAVE, Vec3.atCenterOf(src), 280, 0.6F, h, 0, (int) (620 / 0.6));
                    }
                }
                if (every(t, 200)) {
                    int[] at = near(sc, 100, 260);
                    if (at != null) Hazards.meteorStrike(sc, at[0], at[1], 10 + sc.level.random.nextInt(10));
                }
            }
            default -> {
                moon.a = 3;
                tide.aim(sea - 1, 0.03);
            }
        }
        tide.tick(sc.level);
    }
}
