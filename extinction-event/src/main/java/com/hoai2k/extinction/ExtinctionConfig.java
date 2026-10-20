package com.hoai2k.extinction;

import net.minecraftforge.common.ForgeConfigSpec;

/** Common config (config/extinction-common.toml). Spawns and fossils live in config/extinction/spawns.json. */
public final class ExtinctionConfig {
    public static final ForgeConfigSpec SPEC;

    public static final ForgeConfigSpec.IntValue AUTO_START_DAY;
    public static final ForgeConfigSpec.IntValue WARNING_SECONDS;
    public static final ForgeConfigSpec.IntValue IMPACT_SECONDS;
    public static final ForgeConfigSpec.IntValue FIRESTORM_SECONDS;
    public static final ForgeConfigSpec.IntValue VOLCANISM_SECONDS;
    public static final ForgeConfigSpec.IntValue WINTER_SECONDS;
    public static final ForgeConfigSpec.IntValue RECOVERY_SECONDS;

    public static final ForgeConfigSpec.IntValue IMPACT_DISTANCE;
    public static final ForgeConfigSpec.IntValue CRATER_RADIUS;
    public static final ForgeConfigSpec.IntValue CRATER_DEPTH;
    public static final ForgeConfigSpec.IntValue SHOCKWAVE_RADIUS;
    public static final ForgeConfigSpec.DoubleValue SHOCKWAVE_DAMAGE;
    public static final ForgeConfigSpec.IntValue TSUNAMI_HEIGHT;
    public static final ForgeConfigSpec.IntValue EJECTA_PER_MINUTE;
    public static final ForgeConfigSpec.IntValue VOLCANO_COUNT;

    public static final ForgeConfigSpec.BooleanValue DESTROY_TERRAIN;
    public static final ForgeConfigSpec.BooleanValue TRANSFORM_BIOMES;
    public static final ForgeConfigSpec.BooleanValue PLAYER_HAZARDS;
    public static final ForgeConfigSpec.BooleanValue MASS_EXTINCTION;
    public static final ForgeConfigSpec.BooleanValue CHANGE_MUSIC;
    public static final ForgeConfigSpec.IntValue BLOCK_BUDGET;
    public static final ForgeConfigSpec.IntValue EFFECT_RADIUS;

    static {
        ForgeConfigSpec.Builder b = new ForgeConfigSpec.Builder();

        b.comment("When the extinction happens and how long each phase lasts").push("timeline");
        AUTO_START_DAY = b.comment("Start the event on its own on this in-game day (-1 = only by command or Celestial Lure)")
                .defineInRange("autoStartDay", -1, -1, 100000);
        WARNING_SECONDS = b.comment("A new star grows in the sky, animals panic, the ground trembles")
                .defineInRange("warningSeconds", 240, 10, 36000);
        IMPACT_SECONDS = b.comment("Asteroid descent, impact flash, crater and shockwave (at least 40)")
                .defineInRange("impactSeconds", 75, 40, 36000);
        FIRESTORM_SECONDS = b.comment("Burning ejecta rains down, global wildfires, the megatsunami")
                .defineInRange("firestormSeconds", 240, 10, 36000);
        VOLCANISM_SECONDS = b.comment("Deccan Traps eruptions, fissures, ash fall and acid rain")
                .defineInRange("volcanismSeconds", 240, 10, 36000);
        WINTER_SECONDS = b.comment("Impact winter: darkness, snow, freezing, plants and dinosaurs die off")
                .defineInRange("winterSeconds", 360, 10, 36000);
        RECOVERY_SECONDS = b.comment("The ash clears, the fern spike, fossils form, survivors emerge")
                .defineInRange("recoverySeconds", 240, 10, 36000);
        b.pop();

        b.comment("Scale of the disasters (in blocks)").push("scale");
        IMPACT_DISTANCE = b.comment("How far from the player the asteroid lands when started without a position")
                .defineInRange("impactDistance", 220, 0, 5000);
        CRATER_RADIUS = b.defineInRange("craterRadius", 48, 8, 160);
        CRATER_DEPTH = b.defineInRange("craterDepth", 30, 4, 100);
        SHOCKWAVE_RADIUS = b.comment("How far the shockwave travels before it fades out")
                .defineInRange("shockwaveRadius", 640, 32, 4000);
        SHOCKWAVE_DAMAGE = b.comment("Damage dealt by the shockwave right at the crater rim (it fades with distance)")
                .defineInRange("shockwaveDamage", 18.0, 0.0, 1000.0);
        TSUNAMI_HEIGHT = b.comment("Height of the megatsunami above sea level near the crater (0 = no tsunami)")
                .defineInRange("tsunamiHeight", 26, 0, 120);
        EJECTA_PER_MINUTE = b.comment("Burning ejecta meteors per player per minute during the firestorm")
                .defineInRange("ejectaPerMinute", 60, 0, 1200);
        VOLCANO_COUNT = b.comment("Deccan Traps volcanoes raised during the volcanism phase")
                .defineInRange("volcanoCount", 2, 0, 8);
        b.pop();

        b.comment("What the event is allowed to do").push("rules");
        DESTROY_TERRAIN = b.comment("Craters, flattened forests, floods, fissures, volcanoes, ash and dead plants. Off = visual-only world")
                .define("destroyTerrain", true);
        TRANSFORM_BIOMES = b.comment("Turn the land into scorched, ash, frozen and fern-spike biomes as the event goes on")
                .define("transformBiomes", true);
        PLAYER_HAZARDS = b.comment("Shockwave, heat, acid rain and freezing can hurt players")
                .define("playerHazards", true);
        MASS_EXTINCTION = b.comment("Creatures listed as extinct in spawns.json starve and die during the impact winter")
                .define("massExtinction", true);
        CHANGE_MUSIC = b.comment("Play dramatic music during the event (client side)")
                .define("changeMusic", true);
        b.pop();

        b.comment("Performance").push("performance");
        BLOCK_BUDGET = b.comment("Most blocks the crater, volcanoes and fissures may change per tick")
                .defineInRange("blockBudgetPerTick", 1500, 50, 50000);
        EFFECT_RADIUS = b.comment("Radius around each player where weather, ash, fire and plant changes happen")
                .defineInRange("effectRadius", 80, 16, 256);
        b.pop();

        SPEC = b.build();
    }

    private ExtinctionConfig() {}
}
