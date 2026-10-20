package com.hoai2k.extinction;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.MobSpawnType;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.living.MobSpawnEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.server.ServerStartedEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = ExtinctionMod.MODID)
public final class ServerEvents {
    private ServerEvents() {}

    @SubscribeEvent
    public static void onServerStarted(ServerStartedEvent e) {
        ExtinctionManager.open(e.getServer());
    }

    @SubscribeEvent
    public static void onServerStopping(ServerStoppingEvent e) {
        ExtinctionManager.close();
    }

    @SubscribeEvent
    public static void onServerTick(TickEvent.ServerTickEvent e) {
        ExtinctionManager m = ExtinctionManager.get();
        if (e.phase == TickEvent.Phase.END && m != null) m.tick();
    }

    @SubscribeEvent
    public static void onCommands(RegisterCommandsEvent e) {
        ExtinctionCommand.register(e.getDispatcher());
    }

    @SubscribeEvent
    public static void onLogin(PlayerEvent.PlayerLoggedInEvent e) {
        ExtinctionManager m = ExtinctionManager.get();
        if (m != null && e.getEntity() instanceof ServerPlayer p) m.syncTo(p);
    }

    @SubscribeEvent
    public static void onChangeDimension(PlayerEvent.PlayerChangedDimensionEvent e) {
        ExtinctionManager m = ExtinctionManager.get();
        if (m != null && e.getEntity() instanceof ServerPlayer p) m.syncTo(p);
    }

    @SubscribeEvent
    public static void onDeath(LivingDeathEvent e) {
        ExtinctionManager m = ExtinctionManager.get();
        if (m != null && !e.getEntity().level().isClientSide) m.onDeath(e.getEntity());
    }

    @SubscribeEvent
    public static void onFinalizeSpawn(MobSpawnEvent.FinalizeSpawn e) {
        ExtinctionManager m = ExtinctionManager.get();
        if (m == null || e.getEntity().level() != m.level()) return;
        MobSpawnType type = e.getSpawnType();
        if ((type == MobSpawnType.NATURAL || type == MobSpawnType.CHUNK_GENERATION) && m.blocksNaturalSpawn(e.getEntity().getType())) {
            e.setSpawnCancelled(true);
        }
    }
}
