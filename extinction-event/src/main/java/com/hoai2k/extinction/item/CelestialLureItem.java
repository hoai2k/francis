package com.hoai2k.extinction.item;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ExtinctionManager;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

import javax.annotation.Nullable;
import java.util.List;

/** Calls the asteroid down in the direction the player is looking. Single use. */
public class CelestialLureItem extends Item {
    public CelestialLureItem(Properties props) {
        super(props);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!(level instanceof ServerLevel server)) return InteractionResultHolder.success(stack);
        ExtinctionManager mgr = ExtinctionManager.get();
        if (mgr == null || level.dimension() != Level.OVERWORLD) {
            player.displayClientMessage(Component.translatable("extinction.lure.wrong_dimension").withStyle(ChatFormatting.RED), true);
            return InteractionResultHolder.fail(stack);
        }
        if (mgr.data().phase.running()) {
            player.displayClientMessage(Component.translatable("extinction.lure.already").withStyle(ChatFormatting.RED), true);
            return InteractionResultHolder.fail(stack);
        }
        Vec3 look = player.getLookAngle().multiply(1, 0, 1);
        if (look.lengthSqr() < 1.0E-4) look = new Vec3(1, 0, 0);
        look = look.normalize().scale(ExtinctionConfig.IMPACT_DISTANCE.get());
        BlockPos target = BlockPos.containing(player.getX() + look.x, player.getY(), player.getZ() + look.z);
        mgr.start(server.getServer(), target);
        level.playSound(null, player.blockPosition(), SoundEvents.END_PORTAL_SPAWN, SoundSource.PLAYERS, 1.0F, 0.6F);
        if (!player.getAbilities().instabuild) stack.shrink(1);
        return InteractionResultHolder.consume(stack);
    }

    @Override
    public boolean isFoil(ItemStack stack) {
        return true;
    }

    @Override
    public void appendHoverText(ItemStack stack, @Nullable Level level, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("item.extinction.celestial_lure.desc").withStyle(ChatFormatting.DARK_RED));
    }
}
