package com.hoai2k.extinction;

import com.hoai2k.extinction.block.AshLayerBlock;
import com.hoai2k.extinction.entity.MeteorEntity;
import com.hoai2k.extinction.item.CelestialLureItem;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SandBlock;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.properties.NoteBlockInstrument;
import net.minecraft.world.level.material.MapColor;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

import java.util.function.Supplier;

public final class ModRegistry {
    public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(ForgeRegistries.BLOCKS, ExtinctionMod.MODID);
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, ExtinctionMod.MODID);
    public static final DeferredRegister<EntityType<?>> ENTITIES = DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, ExtinctionMod.MODID);
    public static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, ExtinctionMod.MODID);

    public static final RegistryObject<Block> ASH_LAYER = block("ash_layer", () -> new AshLayerBlock(BlockBehaviour.Properties.of()
            .mapColor(MapColor.COLOR_GRAY).replaceable().forceSolidOff().strength(0.1F).sound(SoundType.SAND)
            .isViewBlocking((state, level, pos) -> state.getValue(AshLayerBlock.LAYERS) >= 8)));
    public static final RegistryObject<Block> ASH_BLOCK = block("ash_block", () -> new SandBlock(0x55524f, BlockBehaviour.Properties.of()
            .mapColor(MapColor.COLOR_GRAY).strength(0.5F).sound(SoundType.SAND)));
    public static final RegistryObject<Block> SCORCHED_EARTH = block("scorched_earth", () -> new Block(BlockBehaviour.Properties.of()
            .mapColor(MapColor.TERRACOTTA_BLACK).strength(0.6F).sound(SoundType.GRAVEL)));
    public static final RegistryObject<Block> IMPACT_BRECCIA = block("impact_breccia", () -> new Block(BlockBehaviour.Properties.of()
            .mapColor(MapColor.TERRACOTTA_GRAY).instrument(NoteBlockInstrument.BASEDRUM).requiresCorrectToolForDrops()
            .strength(2.0F, 8.0F).sound(SoundType.TUFF)));
    public static final RegistryObject<Block> KPG_CLAY = block("kpg_boundary_clay", () -> new Block(BlockBehaviour.Properties.of()
            .mapColor(MapColor.TERRACOTTA_BROWN).strength(0.7F).sound(SoundType.GRAVEL)));

    public static final RegistryObject<Item> IRIDIUM_NUGGET = ITEMS.register("iridium_nugget", () -> new Item(new Item.Properties().rarity(Rarity.UNCOMMON)));
    public static final RegistryObject<Item> TEKTITE = ITEMS.register("tektite", () -> new Item(new Item.Properties()));
    public static final RegistryObject<Item> SHOCKED_QUARTZ = ITEMS.register("shocked_quartz", () -> new Item(new Item.Properties()));
    public static final RegistryObject<Item> CELESTIAL_LURE = ITEMS.register("celestial_lure",
            () -> new CelestialLureItem(new Item.Properties().stacksTo(1).rarity(Rarity.EPIC)));

    public static final RegistryObject<EntityType<MeteorEntity>> METEOR = ENTITIES.register("meteor",
            () -> EntityType.Builder.<MeteorEntity>of(MeteorEntity::new, MobCategory.MISC)
                    .sized(1.0F, 1.0F).clientTrackingRange(16).updateInterval(1).setShouldReceiveVelocityUpdates(true)
                    .fireImmune().build("meteor"));

    public static final RegistryObject<CreativeModeTab> TAB = TABS.register("extinction", () -> CreativeModeTab.builder()
            .title(Component.translatable("itemGroup.extinction"))
            .icon(() -> new ItemStack(CELESTIAL_LURE.get()))
            .displayItems((params, out) -> {
                out.accept(CELESTIAL_LURE.get());
                out.accept(IRIDIUM_NUGGET.get());
                out.accept(TEKTITE.get());
                out.accept(SHOCKED_QUARTZ.get());
                out.accept(ASH_LAYER.get());
                out.accept(ASH_BLOCK.get());
                out.accept(SCORCHED_EARTH.get());
                out.accept(IMPACT_BRECCIA.get());
                out.accept(KPG_CLAY.get());
            })
            .build());

    private static RegistryObject<Block> block(String name, Supplier<Block> sup) {
        RegistryObject<Block> b = BLOCKS.register(name, sup);
        ITEMS.register(name, () -> new BlockItem(b.get(), new Item.Properties()));
        return b;
    }

    public static void register(IEventBus bus) {
        BLOCKS.register(bus);
        ITEMS.register(bus);
        ENTITIES.register(bus);
        TABS.register(bus);
    }

    private ModRegistry() {}
}
