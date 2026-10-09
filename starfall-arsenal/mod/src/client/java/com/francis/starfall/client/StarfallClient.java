package com.francis.starfall.client;

import com.francis.starfall.Starfall;
import com.francis.starfall.net.CutscenePayload;
import com.francis.starfall.strike.StrikeType;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

public class StarfallClient implements ClientModInitializer {
    private static KeyBinding skipKey;
    /** Players can switch films off entirely with the skip key. */
    private static boolean filmsEnabled = true;

    public static Text skipKeyName() {
        return skipKey.getBoundKeyLocalizedText();
    }

    @Override
    public void onInitializeClient() {
        EntityRendererRegistry.register(Starfall.STRIKE, StrikeRenderer::new);
        skipKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.starfall.skip", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_J, KeyBinding.Category.create(Starfall.id("main"))));

        ClientPlayNetworking.registerGlobalReceiver(CutscenePayload.ID, (payload, context) -> {
            if (filmsEnabled) {
                Cutscene.start(context.client(), StrikeType.byId(payload.type()), payload.origin(), payload.target());
            }
        });

        ClientTickEvents.START_CLIENT_TICK.register(client -> {
            Cutscene cut = Cutscene.current();
            if (cut == null) {
                while (skipKey.wasPressed()) {
                    filmsEnabled = !filmsEnabled;
                    if (client.player != null) {
                        client.player.sendMessage(Text.translatable(filmsEnabled ? "message.starfall.films_on" : "message.starfall.films_off"), true);
                    }
                }
                return;
            }
            if (skipKey.wasPressed()) {
                Cutscene.stop(client);
                return;
            }
            // Swallow movement/attack input while the film plays.
            KeyBinding.unpressAll();
        });
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            Cutscene cut = Cutscene.current();
            if (cut != null && !client.isPaused()) cut.tick(client);
        });
        ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> Cutscene.stop(client));
    }
}
