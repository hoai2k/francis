package com.hoai2k.extinction.event;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.world.Atmosphere;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.Hazards;
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Terrain;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.Vec3;

/**
 * A gamma-ray burst from a dying star a few thousand light years away (one idea for the
 * Ordovician extinction). Ten seconds of radiation strips away the ozone layer; then the sun
 * itself becomes the killer, and nitrogen dioxide turns the sky brown and cold.
 */
public final class GammaRayBurst extends Catastrophe {
    public GammaRayBurst() {
        super("gamma_ray_burst");
        act("burst", 40).sky(0.55F, 0.75F, 0.55F, 1F).fog(0.25F).biome(BiomeShifter.IRRADIATED).music(Act.MUSIC_END).ambient(Act.AMB_SPARKS);
        act("ozone", 180).sky(0.5F, 0.85F, 0.75F, 1F).fog(0.3F).biome(BiomeShifter.IRRADIATED).music(Act.MUSIC_END)
                .ambient(Act.AMB_SPARKS).weather(Act.WEATHER_CLEAR).dieOff(0.6F);
        act("brown_sky", 120).sky(0.8F, 0.42F, 0.3F, 0.16F).fog(0.55F).biome(BiomeShifter.FROZEN).music(Act.MUSIC_DEEP_DARK)
                .ambient(Act.AMB_ASH).weather(Act.WEATHER_RAIN).dieOff(1F);
        act("after", 45).sky(0.3F, 0.6F, 0.55F, 0.6F).fog(0.3F).music(Act.MUSIC_FOREST);
    }

    @Override
    public void tick(Scene sc, int act, int t, float p) {
        long time = sc.level.getGameTime();
        switch (act) {
            case 0 -> {
                if (t == 40) {
                    Vec3 sky = sc.level.players().isEmpty() ? Vec3.ZERO : sc.level.players().get(0).position().add(400, 600, -200);
                    Hazards.flash(sc.level, sky, 1F);
                    sc.markers.add(Markers.AURORA, sky, 1F, 0, 0, 0, 0);
                    sc.markers.add(Markers.SUN, sky, 3F, 1F, 0, 0, 260);
                    for (ServerPlayer pl : Terrain.players(sc.level)) {
                        for (LivingEntity e : sc.level.getEntitiesOfClass(LivingEntity.class, pl.getBoundingBox().inflate(96))) {
                            if (e instanceof ServerPlayer sp && (sp.isCreative() || sp.isSpectator() || !ExtinctionConfig.PLAYER_HAZARDS.get())) continue;
                            if (!sc.level.canSeeSky(e.blockPosition().above())) continue;
                            e.hurt(DamageTypes.source(sc.level, DamageTypes.RADIATION), 10F);
                            e.addEffect(new MobEffectInstance(MobEffects.WITHER, 200, 1));
                            e.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 120, 0));
                        }
                    }
                }
                if (t > 40) Hazards.uvBurn(sc.level, time, 0.6F);
            }
            case 1 -> Hazards.uvBurn(sc.level, time, 0.7F + 0.3F * p);
            case 2 -> {
                Hazards.uvBurn(sc.level, time, 0.3F);
                Atmosphere.winter(sc.level, time, 0.5F + 0.4F * p);
                Atmosphere.acidRain(sc.level, time);
            }
            default -> sc.markers.removeType(Markers.AURORA);
        }
    }
}
