package com.francis.starfall.client.mixin;

import com.francis.starfall.client.Cutscene;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.InGameHud;
import net.minecraft.client.render.RenderTickCounter;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Swaps the HUD for letterbox bars, titles and impact flashes. */
@Mixin(InGameHud.class)
public abstract class InGameHudMixin {
    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void starfall$letterbox(DrawContext context, RenderTickCounter tickCounter, CallbackInfo ci) {
        Cutscene cut = Cutscene.current();
        if (cut == null) return;
        cut.renderOverlay(context, tickCounter.getTickDelta(false));
        ci.cancel();
    }
}
