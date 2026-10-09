package com.francis.starfall.client.mixin;

import com.francis.starfall.client.Cutscene;
import net.minecraft.client.render.Camera;
import net.minecraft.client.render.GameRenderer;
import net.minecraft.client.util.math.MatrixStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Cinematic lenses (zoom) and a steady camera during cutscenes. */
@Mixin(GameRenderer.class)
public abstract class GameRendererMixin {
    @Inject(method = "getFov", at = @At("RETURN"), cancellable = true)
    private void starfall$lens(Camera camera, float tickDelta, boolean changingFov, CallbackInfoReturnable<Double> cir) {
        Cutscene cut = Cutscene.current();
        if (cut != null && changingFov) {
            cir.setReturnValue(cut.fov(tickDelta, cir.getReturnValueD()));
        }
    }

    @Inject(method = "bobView", at = @At("HEAD"), cancellable = true)
    private void starfall$steadicam(MatrixStack matrices, float tickDelta, CallbackInfo ci) {
        if (Cutscene.current() != null) ci.cancel();
    }
}
