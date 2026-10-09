package com.francis.starfall.item;

import com.francis.starfall.strike.StrikeType;
import java.util.function.Consumer;
import net.minecraft.component.type.TooltipDisplayComponent;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.tooltip.TooltipType;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Hand;
import net.minecraft.world.World;

/** A real netherite-tier sword (see Item.Settings#sword) that can also call down a comet. */
public class StarfallBladeItem extends Item {
    public StarfallBladeItem(Settings settings) {
        super(settings);
    }

    @Override
    public ActionResult use(World world, PlayerEntity user, Hand hand) {
        return StarCaster.cast(world, user, hand, StrikeType.COMET_DASH);
    }

    @Override
    public void appendTooltip(ItemStack stack, TooltipContext context, TooltipDisplayComponent display, Consumer<Text> tooltip, TooltipType type) {
        StarCaster.tooltip(StrikeType.COMET_DASH, tooltip);
    }
}
