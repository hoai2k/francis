package com.hoai2k.extinction.event;

import com.hoai2k.extinction.ExtinctionConfig;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.level.biome.Biome;

/** One act of a catastrophe, with its own sky, fog, biome, music, ambience, tremors, weather and die-off. */
public final class Act {
    public static final int MUSIC_KEEP = 0, MUSIC_BOSS = 1, MUSIC_NETHER = 2, MUSIC_DEEP_DARK = 3, MUSIC_FOREST = 4, MUSIC_WATER = 5, MUSIC_END = 6;
    public static final int AMB_NONE = 0, AMB_ASH = 1, AMB_BLIZZARD = 2, AMB_EMBERS = 3, AMB_TOXIC = 4, AMB_SPARKS = 5, AMB_WHITE_ASH = 6, AMB_DUST = 7;
    public static final int WEATHER_KEEP = 0, WEATHER_CLEAR = 1, WEATHER_RAIN = 2, WEATHER_THUNDER = 3;

    public final String event, key;
    private final int seconds;
    public float tint, r = 1, g = 1, b = 1, fog = 0.35F;
    public ResourceKey<Biome> biome;
    public int music = MUSIC_KEEP, ambient = AMB_NONE, weather = WEATHER_KEEP;
    public float quake, dieOff;

    Act(String event, String key, int seconds) {
        this.event = event;
        this.key = key;
        this.seconds = seconds;
    }

    public int lengthTicks() {
        return Math.max(200, (int) (seconds * 20 * ExtinctionConfig.EVENT_LENGTH_SCALE.get()));
    }

    /** strength 0..1 of the sky and fog colour (r, g, b). */
    public Act sky(float strength, float r, float g, float b) {
        tint = strength;
        this.r = r;
        this.g = g;
        this.b = b;
        return this;
    }

    public Act fog(float thickness) {
        fog = thickness;
        return this;
    }

    public Act biome(ResourceKey<Biome> biome) {
        this.biome = biome;
        return this;
    }

    public Act music(int music) {
        this.music = music;
        return this;
    }

    public Act ambient(int ambient) {
        this.ambient = ambient;
        return this;
    }

    public Act quake(float quake) {
        this.quake = quake;
        return this;
    }

    public Act weather(int weather) {
        this.weather = weather;
        return this;
    }

    /** How hard creatures on the extinct list starve during this act (0 = not at all). */
    public Act dieOff(float severity) {
        dieOff = severity;
        return this;
    }

    public String titleKey() {
        return "extinction.event." + event + "." + key;
    }
}
