package com.francis.starfall.item;

import com.francis.starfall.strike.StrikeType;
import java.util.List;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.item.SwordItem;
import net.minecraft.item.ToolMaterial;
import net.minecraft.item.tooltip.TooltipType;
import net.minecraft.text.Text;
import net.minecraft.util.Hand;
import net.minecraft.util.TypedActionResult;
import net.minecraft.world.World;

/** A real netherite-tier sword that can also call down a comet. */
public class StarfallBladeItem extends SwordItem {
    public StarfallBladeItem(ToolMaterial material, Settings settings) {
        super(material, settings);
    }

    @Override
    public TypedActionResult<ItemStack> use(World world, PlayerEntity user, Hand hand) {
        return StarCaster.cast(world, user, hand, StrikeType.COMET_SLASH);
    }

    @Override
    public void appendTooltip(ItemStack stack, TooltipContext context, List<Text> tooltip, TooltipType type) {
        StarCaster.tooltip(StrikeType.COMET_SLASH, tooltip);
    }
}
