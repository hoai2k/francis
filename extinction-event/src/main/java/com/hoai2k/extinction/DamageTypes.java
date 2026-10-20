package com.hoai2k.extinction;

import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.damagesource.DamageType;

/** Damage types defined in data/extinction/damage_type (they give the event its own death messages). */
public final class DamageTypes {
    public static final ResourceKey<DamageType> IMPACT = key("impact");
    public static final ResourceKey<DamageType> SHOCKWAVE = key("shockwave");
    public static final ResourceKey<DamageType> TSUNAMI = key("tsunami");
    public static final ResourceKey<DamageType> EJECTA = key("ejecta");
    public static final ResourceKey<DamageType> HEAT = key("heat");
    public static final ResourceKey<DamageType> ACID_RAIN = key("acid_rain");
    public static final ResourceKey<DamageType> STARVATION = key("extinction");

    private static ResourceKey<DamageType> key(String name) {
        return ResourceKey.create(Registries.DAMAGE_TYPE, new ResourceLocation(ExtinctionMod.MODID, name));
    }

    public static DamageSource source(ServerLevel level, ResourceKey<DamageType> key) {
        return new DamageSource(level.registryAccess().registryOrThrow(Registries.DAMAGE_TYPE).getHolderOrThrow(key));
    }

    private DamageTypes() {}
}
