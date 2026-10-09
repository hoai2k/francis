package com.francis.starfall.item;

import com.francis.starfall.strike.StrikeType;
import java.util.List;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.tooltip.TooltipType;
import net.minecraft.text.Text;
import net.minecraft.util.Hand;
import net.minecraft.util.TypedActionResult;
import net.minecraft.world.World;

/** Stellar Remote, Seven Stars Scepter and Supernova Core. */
public class StarCasterItem extends Item {
    private final StrikeType type;

    public StarCasterItem(StrikeType type, Settings settings) {
        super(settings);
        this.type = type;
    }

    @Override
    public TypedActionResult<ItemStack> use(World world, PlayerEntity user, Hand hand) {
        return StarCaster.cast(world, user, hand, type);
    }

    @Override
    public void appendTooltip(ItemStack stack, TooltipContext context, List<Text> tooltip, TooltipType tooltipType) {
        StarCaster.tooltip(type, tooltip);
    }
}
