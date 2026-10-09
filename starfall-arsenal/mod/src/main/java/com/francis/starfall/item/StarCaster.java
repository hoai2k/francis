package com.francis.starfall.item;

import com.francis.starfall.Starfall;
import com.francis.starfall.entity.FallingStarEntity;
import com.francis.starfall.net.CutscenePayload;
import com.francis.starfall.strike.StarSpec;
import com.francis.starfall.strike.StrikeType;
import java.util.List;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.entity.effect.StatusEffects;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.stat.Stats;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.util.Hand;
import net.minecraft.util.TypedActionResult;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.Heightmap;
import net.minecraft.world.World;

/** Shared "call down a star" behaviour for every Starfall weapon. */
public final class StarCaster {
    /**
     * Strikes land within this many blocks (horizontally), so the star always
     * falls into chunks that are loaded and ticking, even at a low simulation distance.
     */
    private static final double MAX_RANGE = 64;

    private StarCaster() {
    }

    public static TypedActionResult<ItemStack> cast(World world, PlayerEntity player, Hand hand, StrikeType type) {
        ItemStack stack = player.getStackInHand(hand);
        if (world.isClient()) {
            return TypedActionResult.success(stack);
        }
        ServerWorld server = (ServerWorld) world;
        Vec3d origin = player.getPos();
        Vec3d target = pickTarget(server, player, type);
        List<StarSpec> stars = type.plan(origin, target);
        for (int i = 0; i < stars.size(); i++) {
            FallingStarEntity star = new FallingStarEntity(Starfall.FALLING_STAR, world);
            star.setup(stars.get(i), type, player, i == 0);
            world.spawnEntity(star);
        }
        if (player instanceof ServerPlayerEntity sp) {
            ServerPlayNetworking.send(sp, new CutscenePayload(type.ordinal(), origin, target));
        }
        // The caster is the director, not a casualty.
        player.addStatusEffect(new StatusEffectInstance(StatusEffects.RESISTANCE, type.duration + 60, 4, false, false));
        player.addStatusEffect(new StatusEffectInstance(StatusEffects.FIRE_RESISTANCE, type.duration + 100, 0, false, false));
        world.playSound(null, origin.x, origin.y, origin.z, SoundEvents.BLOCK_BEACON_ACTIVATE, SoundCategory.PLAYERS, 2f, 0.7f);
        world.playSound(null, origin.x, origin.y, origin.z, SoundEvents.BLOCK_CONDUIT_ACTIVATE, SoundCategory.PLAYERS, 2f, 1.2f);
        if (type == StrikeType.SUPERNOVA) {
            world.playSound(null, origin.x, origin.y, origin.z, SoundEvents.ENTITY_WARDEN_SONIC_CHARGE, SoundCategory.PLAYERS, 3f, 0.5f);
        }
        player.getItemCooldownManager().set(stack.getItem(), type.cooldown);
        player.incrementStat(Stats.USED.getOrCreateStat(stack.getItem()));
        return TypedActionResult.success(stack);
    }

    /** Where the player is looking - pushed out far enough that they aren't standing in the crater. */
    private static Vec3d pickTarget(ServerWorld world, PlayerEntity player, StrikeType type) {
        HitResult hit = player.raycast(MAX_RANGE, 1f, false);
        Vec3d eye = player.getEyePos();
        Vec3d look = player.getRotationVector();
        Vec3d target;
        if (hit.getType() == HitResult.Type.BLOCK) {
            target = ((BlockHitResult) hit).getPos();
        } else {
            target = eye.add(look.multiply(MAX_RANGE * 0.75));
            target = new Vec3d(target.x, groundY(world, target), target.z);
        }
        float maxRadius = 0;
        for (StarSpec s : type.plan(player.getPos(), target)) maxRadius = Math.max(maxRadius, s.radius());
        double minDist = maxRadius * 1.6 + 7 + (type == StrikeType.SEVEN_STARS ? 14 : 0);
        Vec3d flat = new Vec3d(target.x - player.getX(), 0, target.z - player.getZ());
        double dist = flat.length();
        if (dist < minDist || dist > MAX_RANGE) {
            Vec3d dir = dist > 1e-3 ? flat.multiply(1 / dist) : new Vec3d(look.x, 0, look.z);
            dir = dir.lengthSquared() < 1e-4 ? new Vec3d(0, 0, 1) : dir.normalize();
            Vec3d p = player.getPos().add(dir.multiply(MathHelper.clamp(dist, minDist, MAX_RANGE)));
            target = new Vec3d(p.x, groundY(world, p), p.z);
        }
        return target;
    }

    private static double groundY(ServerWorld world, Vec3d p) {
        return world.getTopY(Heightmap.Type.MOTION_BLOCKING_NO_LEAVES, (int) Math.floor(p.x), (int) Math.floor(p.z));
    }

    public static void tooltip(StrikeType type, List<Text> tooltip) {
        tooltip.add(Text.translatable("tooltip.starfall." + type.key).formatted(Formatting.GOLD));
        tooltip.add(Text.translatable("tooltip.starfall." + type.key + ".desc").formatted(Formatting.GRAY));
        tooltip.add(Text.translatable("tooltip.starfall.use").formatted(Formatting.DARK_AQUA));
    }

}
