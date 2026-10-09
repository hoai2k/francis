package com.francis.starfall;

import com.francis.starfall.entity.StrikeEntity;
import com.francis.starfall.item.StarCasterItem;
import com.francis.starfall.item.StarfallBladeItem;
import com.francis.starfall.net.CutscenePayload;
import com.francis.starfall.strike.Crater;
import com.francis.starfall.strike.StrikeType;
import net.fabricmc.api.ModInitializer;
import java.util.function.Function;
import net.fabricmc.fabric.api.gamerule.v1.GameRuleBuilder;
import net.fabricmc.fabric.api.itemgroup.v1.FabricItemGroup;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnGroup;
import net.minecraft.item.Item;
import net.minecraft.item.ItemGroup;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ToolMaterial;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Rarity;
import net.minecraft.world.rule.GameRule;
import net.minecraft.world.rule.GameRuleCategory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Starfall implements ModInitializer {
    public static final String MOD_ID = "starfall";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    public static final Item STELLAR_REMOTE = item("stellar_remote",
            s -> new StarCasterItem(StrikeType.ORBITAL_LANCE, s), new Item.Settings().maxCount(1).rarity(Rarity.EPIC));
    public static final Item STARFALL_BLADE = item("starfall_blade",
            StarfallBladeItem::new, new Item.Settings().rarity(Rarity.EPIC).fireproof().sword(ToolMaterial.NETHERITE, 4f, -2.4f));
    public static final Item SEVEN_STARS_SCEPTER = item("seven_stars_scepter",
            s -> new StarCasterItem(StrikeType.CONSTELLATION, s), new Item.Settings().maxCount(1).rarity(Rarity.EPIC));
    public static final Item SUPERNOVA_CORE = item("supernova_core",
            s -> new StarCasterItem(StrikeType.SUPERNOVA, s), new Item.Settings().maxCount(1).rarity(Rarity.EPIC).fireproof());
    public static final Item STAR_FRAGMENT = item("star_fragment",
            Item::new, new Item.Settings().rarity(Rarity.RARE).fireproof());

    private static final RegistryKey<EntityType<?>> STRIKE_KEY = RegistryKey.of(RegistryKeys.ENTITY_TYPE, id("strike"));
    public static final EntityType<StrikeEntity> STRIKE = Registry.register(Registries.ENTITY_TYPE, STRIKE_KEY,
            EntityType.Builder.<StrikeEntity>create(StrikeEntity::new, SpawnGroup.MISC)
                    .dimensions(1f, 1f)
                    .makeFireImmune()
                    .disableSummon()
                    .disableSaving()
                    .maxTrackingRange(16)
                    .trackingTickInterval(20)
                    .build(STRIKE_KEY));

    /** Set to false (/gamerule starfall:terrain_damage false) to keep the blast but leave terrain untouched. */
    public static final GameRule<Boolean> TERRAIN_DAMAGE = GameRuleBuilder.forBoolean(true)
            .category(GameRuleCategory.MISC)
            .buildAndRegister(id("terrain_damage"));

    public static Identifier id(String path) {
        return Identifier.of(MOD_ID, path);
    }

    private static Item item(String name, Function<Item.Settings, Item> factory, Item.Settings settings) {
        RegistryKey<Item> key = RegistryKey.of(RegistryKeys.ITEM, id(name));
        return Registry.register(Registries.ITEM, key, factory.apply(settings.registryKey(key)));
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
