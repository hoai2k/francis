package com.hoai2k.extinction.event;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Terrain;
import com.hoai2k.extinction.world.Tornado;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerPlayer;

import java.util.ArrayList;
import java.util.List;

/**
 * A super outbreak. The sky turns green, hail the size of fists hammers down, and then the
 * tornadoes come, dozens of them, until one mile-wide monster heads straight for you.
 */
public final class TornadoOutbreak extends Catastrophe {
    private final List<Tornado> tornadoes = new ArrayList<>();

    public TornadoOutbreak() {
        super("tornado_outbreak");
        act("supercells", 70).sky(0.7F, 0.32F, 0.45F, 0.3F).fog(0.45F).biome(BiomeShifter.STORM).music(Act.MUSIC_DEEP_DARK)
                .ambient(Act.AMB_DUST).weather(Act.WEATHER_THUNDER);
        act("outbreak", 180).sky(0.78F, 0.26F, 0.36F, 0.26F).fog(0.5F).biome(BiomeShifter.STORM).music(Act.MUSIC_BOSS)
                .ambient(Act.AMB_DUST).weather(Act.WEATHER_THUNDER).quake(0.1F).dieOff(0.2F);
        act("monster", 120).sky(0.88F, 0.18F, 0.24F, 0.2F).fog(0.55F).biome(BiomeShifter.STORM).music(Act.MUSIC_BOSS)
                .ambient(Act.AMB_DUST).weather(Act.WEATHER_THUNDER).quake(0.3F).dieOff(0.3F);
        act("calm", 40).sky(0.3F, 0.55F, 0.6F, 0.55F).fog(0.3F).music(Act.MUSIC_FOREST).weather(Act.WEATHER_RAIN);
    }

    @Override
    public void reset() {
        tornadoes.clear();
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        switch (act) {
            case 0 -> {
                Hazards.lightning(sc.level, 0.6F);
                hail(sc);
            }
            case 1 -> {
                Hazards.lightning(sc.level, 0.8F);
                if (every(t, 260) && tornadoes.size() < 6) spawn(sc, 12 + sc.level.random.nextInt(10), 90, 200, 1800);
                if (every(t, 3)) hail(sc);
            }
            case 2 -> {
                if (t == 20) {
                    spawn(sc, 48, 160, 200, 2400);
                    title(sc, "monster_warn", 5);
                }
                Hazards.lightning(sc.level, 1F);
            }
            default -> tornadoes.forEach(tn -> sc.markers.remove(tn.marker));
        }
        if (act == 3) tornadoes.clear();
        tornadoes.forEach(tn -> tn.tick(sc.level));
        tornadoes.removeIf(tn -> {
            if (tn.dead()) sc.markers.remove(tn.marker);
            return tn.dead();
        });
    }

    private void spawn(Scene sc, float radius, int min, int max, int life) {
        int[] at = near(sc, min, max);
        if (at != null) tornadoes.add(new Tornado(sc, at[0], at[1], radius, life));
    }

    /** Giant hailstones: they hurt anyone outside and shatter glass. */
    private static void hail(Scene sc) {
        for (ServerPlayer p : Terrain.players(sc.level)) {
            sc.level.sendParticles(p, ParticleTypes.ITEM_SNOWBALL, true, p.getX(), p.getY() + 12, p.getZ(), 30, 14, 2, 14, 0.5);
            if (p.isCreative() || p.isSpectator() || !ExtinctionConfig.PLAYER_HAZARDS.get()) continue;
            if (sc.level.canSeeSky(p.blockPosition().above()) && sc.level.random.nextFloat() < 0.08F) {
                p.hurt(DamageTypes.source(sc.level, DamageTypes.TORNADO), 1.5F);
            }
        }
    }
}
