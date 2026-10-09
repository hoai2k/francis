package com.francis.starfall.client.mixin;

import com.francis.starfall.client.Cutscene;
import net.minecraft.client.render.Camera;
import net.minecraft.entity.Entity;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.BlockView;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Hands the camera to the cutscene director while a film is rolling. */
@Mixin(Camera.class)
public abstract class CameraMixin {
    @Shadow
    protected abstract void setPos(double x, double y, double z);

    @Shadow
    protected abstract void setRotation(float yaw, float pitch);

    @Shadow
    public abstract Vec3d getPos();

    @Shadow
    public abstract float getYaw();

    @Shadow
    public abstract float getPitch();

    @Inject(method = "update", at = @At("TAIL"))
    private void starfall$direct(BlockView area, Entity focusedEntity, boolean thirdPerson, boolean inverseView, float tickDelta, CallbackInfo ci) {
        Cutscene cut = Cutscene.current();
        if (cut == null) return;
        Cutscene.Shot shot = cut.camera(tickDelta, getPos(), getYaw(), getPitch());
        setPos(shot.pos().x, shot.pos().y, shot.pos().z);
        setRotation(shot.yaw(), shot.pitch());
    }
}
