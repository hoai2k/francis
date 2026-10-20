package com.hoai2k.extinction.client;

import com.hoai2k.extinction.ExtinctionMod;
import com.hoai2k.extinction.ModRegistry;
import com.hoai2k.extinction.Phase;
import net.minecraft.client.Minecraft;
import net.minecraft.util.Mth;
import net.minecraft.world.level.material.FogType;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ClientPlayerNetworkEvent;
import net.minecraftforge.client.event.EntityRenderersEvent;
import net.minecraftforge.client.event.RegisterGuiOverlaysEvent;
import net.minecraftforge.client.event.RenderLevelStageEvent;
import net.minecraftforge.client.event.ViewportEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

public final class ClientEvents {
    private ClientEvents() {}

    @Mod.EventBusSubscriber(modid = ExtinctionMod.MODID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.MOD)
    public static final class ModBus {
        @SubscribeEvent
        public static void renderers(EntityRenderersEvent.RegisterRenderers e) {
            e.registerEntityRenderer(ModRegistry.METEOR.get(), MeteorRenderer::new);
        }

        @SubscribeEvent
        public static void overlays(RegisterGuiOverlaysEvent e) {
            e.registerAboveAll("cinematic", CinematicOverlay::render);
        }
    }

    @Mod.EventBusSubscriber(modid = ExtinctionMod.MODID, value = Dist.CLIENT)
    public static final class ForgeBus {
        @SubscribeEvent
        public static void tick(TickEvent.ClientTickEvent e) {
            if (e.phase == TickEvent.Phase.END) ClientState.tick();
        }

        @SubscribeEvent
        public static void logout(ClientPlayerNetworkEvent.LoggingOut e) {
            ClientState.phase = Phase.DORMANT;
            ClientState.detonated = false;
            ClientState.title = null;
        }

        @SubscribeEvent
        public static void renderLevel(RenderLevelStageEvent e) {
            SkyFx.render(e);
        }

        @SubscribeEvent
        public static void fogColor(ViewportEvent.ComputeFogColor e) {
            if (!ClientState.active()) return;
            float s = Mth.lerp((float) e.getPartialTick(), ClientState.tintPrev, ClientState.tint);
            float f = Math.max(ClientState.flash, ClientState.lightning * 0.4F);
            e.setRed(Mth.lerp(f, Mth.lerp(s, e.getRed(), ClientState.tintR), 1F));
            e.setGreen(Mth.lerp(f, Mth.lerp(s, e.getGreen(), ClientState.tintG), 0.85F));
            e.setBlue(Mth.lerp(f, Mth.lerp(s, e.getBlue(), ClientState.tintB), 0.6F));
        }

        @SubscribeEvent
        public static void fog(ViewportEvent.RenderFog e) {
            if (!ClientState.active() || e.getType() != FogType.NONE) return;
            float s = Mth.lerp((float) e.getPartialTick(), ClientState.tintPrev, ClientState.tint);
            if (s < 0.01F) return;
            // Thick but not blinding: the crater and the plume should stay visible through it.
            float thick = ClientState.phase == Phase.WINTER ? 0.6F : 0.35F;
            float far = Mth.lerp(s * thick, e.getFarPlaneDistance(), 56F);
            e.setFarPlaneDistance(far);
            e.setNearPlaneDistance(Math.min(e.getNearPlaneDistance(), far * 0.05F));
            e.setCanceled(true);
        }

        @SubscribeEvent
        public static void camera(ViewportEvent.ComputeCameraAngles e) {
            if (!ClientState.active()) return;
            Minecraft mc = Minecraft.getInstance();
            float amount = Math.min(5F, ClientState.shakeNow() * 2.2F) * mc.options.screenEffectScale().get().floatValue();
            if (amount < 0.01F || mc.level == null) return;
            float t = (float) (mc.level.getGameTime() + e.getPartialTick());
            e.setYaw(e.getYaw() + amount * (Mth.sin(t * 1.9F) + 0.5F * Mth.sin(t * 4.3F)) * 0.5F);
            e.setPitch(e.getPitch() + amount * Mth.sin(t * 2.7F + 1F) * 0.5F);
            e.setRoll(e.getRoll() + amount * Mth.sin(t * 3.1F) * 0.6F);
        }
    }
}
