package com.hoai2k.extinction.event;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Deluge;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Tornado;
import com.hoai2k.extinction.world.Tsunami;
import net.minecraft.core.BlockPos;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.List;

/**
 * The great deluge. Hypercanes born over boiling oceans bring rain that never stops, the sea
 * rises over the land, storm surges roll in one after another, and then the waters slowly recede.
 */
public final class GreatDeluge extends Catastrophe {
    private Deluge flood;
    private final List<Tornado> spouts = new ArrayList<>();
    private Vec3 wind = new Vec3(1, 0, 0);

    public GreatDeluge() {
        super("great_deluge");
        act("rains", 75).sky(0.6F, 0.3F, 0.34F, 0.38F).fog(0.5F).biome(BiomeShifter.STORM).music(Act.MUSIC_WATER).weather(Act.WEATHER_THUNDER);
        act("hypercane", 150).sky(0.82F, 0.2F, 0.25F, 0.28F).fog(0.65F).biome(BiomeShifter.STORM).music(Act.MUSIC_BOSS)
                .weather(Act.WEATHER_THUNDER).quake(0.15F).dieOff(0.3F);
        act("deluge", 150).sky(0.75F, 0.22F, 0.3F, 0.36F).fog(0.6F).biome(BiomeShifter.STORM).music(Act.MUSIC_WATER)
                .weather(Act.WEATHER_THUNDER).dieOff(0.8F);
        act("recede", 120).sky(0.35F, 0.5F, 0.58F, 0.62F).fog(0.35F).music(Act.MUSIC_FOREST).weather(Act.WEATHER_RAIN);
    }

    @Override
    public void reset() {
        flood = null;
        spouts.clear();
    }

    private Deluge flood(Scene sc) {
        if (flood == null) flood = new Deluge(sc.level);
        return flood;
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        int sea = sc.level.getSeaLevel();
        int rise = ExtinctionConfig.FLOOD_HEIGHT.get();
        Deluge f = flood(sc);
        if (every(t, 300)) {
            double a = sc.level.random.nextDouble() * Math.PI * 2;
            wind = new Vec3(Math.cos(a), 0, Math.sin(a));
        }
        switch (act) {
            case 0 -> {
                f.aim(sea - 1 + rise * 0.15, 0.01);
                Hazards.lightning(sc.level, 0.5F);
            }
            case 1 -> {
                f.aim(sea - 1 + rise * 0.55, 0.02);
                Hazards.lightning(sc.level, 1.2F);
                gale(sc, 1F);
                if (every(t, 600) && spouts.size() < 3) spawnSpout(sc);
                if (every(t, 700)) surge(sc, rise * 0.5F);
            }
            case 2 -> {
                f.aim(sea - 1 + rise, 0.02);
                Hazards.lightning(sc.level, 0.8F);
                gale(sc, 0.7F);
                if (every(t, 500)) surge(sc, rise * 0.8F);
            }
            default -> f.aim(sea - 1, 0.03);
        }
        f.tick(sc.level);
        spouts.forEach(s -> s.tick(sc.level));
        spouts.removeIf(s -> {
            if (s.dead()) sc.markers.remove(s.marker);
            return s.dead();
        });
    }

    /** Hurricane-force wind shoving everyone under open sky. */
    private void gale(Scene sc, float strength) {
        for (var p : sc.level.players()) {
            if (p.isCreative() || p.isSpectator() || !sc.level.canSeeSky(p.blockPosition().above())) continue;
            p.push(wind.x * 0.06 * strength, 0, wind.z * 0.06 * strength);
            p.hurtMarked = true;
        }
    }

    private void spawnSpout(Scene sc) {
        int[] at = near(sc, 80, 160);
        if (at != null) spouts.add(new Tornado(sc, at[0], at[1], 14, 1400));
    }

    /** A storm surge rolling in from far out to sea. */
    private void surge(Scene sc, float height) {
        int[] at = near(sc, 420, 520);
        if (at == null) return;
        BlockPos src = new BlockPos(at[0], sc.level.getSeaLevel(), at[1]);
        Tsunami w = new Tsunami(src, 300, 900, (int) height, 0.6, 0);
        sc.waves.add(w);
        sc.markers.add(Markers.WAVE, Vec3.atCenterOf(src), 300, 0.6F, height, 0, (int) (600 / 0.6));
    }
}
