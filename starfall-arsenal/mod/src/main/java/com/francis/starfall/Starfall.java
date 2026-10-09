package com.francis.starfall;

import com.francis.starfall.entity.FallingStarEntity;
import com.francis.starfall.item.StarCasterItem;
import com.francis.starfall.item.StarfallBladeItem;
import com.francis.starfall.net.CutscenePayload;
import com.francis.starfall.strike.Crater;
import com.francis.starfall.strike.StrikeType;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.gamerule.v1.GameRuleFactory;
import net.fabricmc.fabric.api.gamerule.v1.GameRuleRegistry;
import net.fabricmc.fabric.api.itemgroup.v1.FabricItemGroup;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnGroup;
import net.minecraft.item.Item;
import net.minecraft.item.ItemGroup;
import net.minecraft.item.ItemStack;
import net.minecraft.item.SwordItem;
import net.minecraft.item.ToolMaterials;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Rarity;
import net.minecraft.world.GameRules;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Starfall implements ModInitializer {
    public static final String MOD_ID = "starfall";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    public static final Item STELLAR_REMOTE = item("stellar_remote",
            new StarCasterItem(StrikeType.SHOOTING_STAR, new Item.Settings().maxCount(1).rarity(Rarity.EPIC)));
    public static final Item STARFALL_BLADE = item("starfall_blade",
            new StarfallBladeItem(ToolMaterials.NETHERITE, new Item.Settings().rarity(Rarity.EPIC).fireproof()
                    .attributeModifiers(SwordItem.createAttributeModifiers(ToolMaterials.NETHERITE, 4, -2.4f))));
    public static final Item SEVEN_STARS_SCEPTER = item("seven_stars_scepter",
            new StarCasterItem(StrikeType.SEVEN_STARS, new Item.Settings().maxCount(1).rarity(Rarity.EPIC)));
    public static final Item SUPERNOVA_CORE = item("supernova_core",
            new StarCasterItem(StrikeType.SUPERNOVA, new Item.Settings().maxCount(1).rarity(Rarity.EPIC).fireproof()));
    public static final Item STAR_FRAGMENT = item("star_fragment",
            new Item(new Item.Settings().rarity(Rarity.RARE).fireproof()));

    public static final EntityType<FallingStarEntity> FALLING_STAR = Registry.register(Registries.ENTITY_TYPE, id("falling_star"),
            EntityType.Builder.<FallingStarEntity>create(FallingStarEntity::new, SpawnGroup.MISC)
                    .dimensions(1f, 1f)
                    .makeFireImmune()
                    .disableSummon()
                    .disableSaving()
                    .maxTrackingRange(16)
                    .trackingTickInterval(20)
                    .build("falling_star"));

    /** Set to false to keep the cinematic and the blast but leave terrain untouched. */
    public static final GameRules.Key<GameRules.BooleanRule> TERRAIN_DAMAGE = GameRuleRegistry.register(
            "starfallTerrainDamage", GameRules.Category.MISC, GameRuleFactory.createBooleanRule(true));

    public static Identifier id(String path) {
        return Identifier.of(MOD_ID, path);
    }

    private static Item item(String name, Item item) {
        return Registry.register(Registries.ITEM, id(name), item);
    }

    @Override
    public void onInitialize() {
        PayloadTypeRegistry.playS2C().register(CutscenePayload.ID, CutscenePayload.CODEC);
        Crater.register();
        Registry.register(Registries.ITEM_GROUP, id("arsenal"), FabricItemGroup.builder()
                .icon(() -> new ItemStack(STELLAR_REMOTE))
                .displayName(Text.translatable("itemGroup.starfall.arsenal"))
                .entries((ctx, entries) -> {
                    entries.add(STELLAR_REMOTE);
                    entries.add(STARFALL_BLADE);
                    entries.add(SEVEN_STARS_SCEPTER);
                    entries.add(SUPERNOVA_CORE);
                    entries.add(STAR_FRAGMENT);
                })
                .build());
        LOGGER.info("Starfall Arsenal armed. Look up.");
    }
}
