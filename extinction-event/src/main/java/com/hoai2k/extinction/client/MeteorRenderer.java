package com.hoai2k.extinction.client;

import com.hoai2k.extinction.entity.MeteorEntity;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
import net.minecraft.client.renderer.LightTexture;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.block.BlockRenderDispatcher;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.client.renderer.texture.TextureAtlas;
import net.minecraft.resources.ResourceLocation;

/** A tumbling, glowing block of rock. */
public class MeteorRenderer extends EntityRenderer<MeteorEntity> {
    private final BlockRenderDispatcher blocks;

    public MeteorRenderer(EntityRendererProvider.Context ctx) {
        super(ctx);
        blocks = ctx.getBlockRenderDispatcher();
        shadowRadius = 0;
    }

    @Override
    public void render(MeteorEntity e, float yaw, float pt, PoseStack ps, MultiBufferSource buffers, int light) {
        ps.pushPose();
        float s = e.size();
        float spin = (e.tickCount + pt) * 14F;
        ps.scale(s, s, s);
        ps.mulPose(Axis.YP.rotationDegrees(spin));
        ps.mulPose(Axis.XP.rotationDegrees(spin * 0.7F));
        ps.translate(-0.5, -0.5, -0.5);
        blocks.renderSingleBlock(e.look(), ps, buffers, LightTexture.FULL_BRIGHT, OverlayTexture.NO_OVERLAY);
        ps.popPose();
        super.render(e, yaw, pt, ps, buffers, light);
    }

    @Override
    public ResourceLocation getTextureLocation(MeteorEntity e) {
        return TextureAtlas.LOCATION_BLOCKS;
    }
}
