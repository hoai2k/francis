package com.hoai2k.extinction.world;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ModRegistry;
import com.hoai2k.extinction.block.AshLayerBlock;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.DoublePlantBlock;
import net.minecraft.world.level.block.SnowLayerBlock;
import net.minecraft.world.level.block.WeatheringCopper;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.DoubleBlockHalf;

/** Ash fall, acid rain, the impact winter and the slow recovery: the long tail of the extinction. */
public final class Atmosphere {
    private Atmosphere() {}

    private static int radius() {
        return ExtinctionConfig.EFFECT_RADIUS.get();
    }

    private static boolean destroy() {
        return ExtinctionConfig.DESTROY_TERRAIN.get();
    }

    /** rate 1 = heavy ash fall near an erupting volcano. */
    public static void ashFall(ServerLevel level, float rate) {
        if (!destroy() || rate <= 0) return;
        RandomSource rnd = level.random;
        for (ServerPlayer p : Terrain.players(level)) {
            int n = (int) (rate * 10) + (rnd.nextFloat() < rate * 10 % 1 ? 1 : 0);
            for (int i = 0; i < n; i++) {
                BlockPos top = Terrain.randomColumn(level, p, radius(), rnd);
                if (top != null) layer(level, top, ModRegistry.ASH_LAYER.get(), 6);
            }
        }
    }

    /** Adds one layer of ash (or snow) on top of the column, up to maxLayers. */
    private static void layer(ServerLevel level, BlockPos top, Block layerBlock, int maxLayers) {
        BlockState s = level.getBlockState(top);
        if (s.is(layerBlock)) {
            int layers = s.getValue(SnowLayerBlock.LAYERS);
            if (layers < maxLayers) level.setBlock(top, s.setValue(SnowLayerBlock.LAYERS, layers + 1), Block.UPDATE_CLIENTS);
            return;
        }
        if (s.getBlock() instanceof SnowLayerBlock) return;
        BlockPos at = top.above();
        if (Terrain.isPlant(s) && !(s.getBlock() instanceof DoublePlantBlock)) {
            at = top;
        } else if (!s.isFaceSturdy(level, top, Direction.UP) || !s.getFluidState().isEmpty()) {
            return;
        }
        if (!level.getBlockState(at).isAir() && at != top) return;
        BlockState put = layerBlock.defaultBlockState();
        if (put.canSurvive(level, at)) level.setBlock(at, put, Block.UPDATE_CLIENTS);
    }

    /** Sulfur and nitrogen from the impact and the Deccan Traps came down as acid rain. */
    public static void acidRain(ServerLevel level, long time) {
        RandomSource rnd = level.random;
        boolean hazards = ExtinctionConfig.PLAYER_HAZARDS.get();
        for (ServerPlayer p : Terrain.players(level)) {
            if (time % 30 == 0) {
                for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, p.getBoundingBox().inflate(32))) {
                    if (!level.isRainingAt(e.blockPosition().above())) continue;
                    if (e instanceof ServerPlayer sp) {
                        if (!hazards || (sp.isCreative() || sp.isSpectator())) continue;
                        ItemStack helmet = sp.getItemBySlot(EquipmentSlot.HEAD);
                        if (!helmet.isEmpty()) {
                            helmet.hurtAndBreak(1, sp, x -> x.broadcastBreakEvent(EquipmentSlot.HEAD));
                            continue;
                        }
                        sp.hurt(DamageTypes.source(level, DamageTypes.ACID_RAIN), 1.0F);
                    } else if (rnd.nextFloat() < 0.5F) {
                        e.hurt(DamageTypes.source(level, DamageTypes.ACID_RAIN), 1.0F);
                    }
                }
            }
            if (!destroy() || time % 3 != 0) continue;
            for (int i = 0; i < 4; i++) {
                BlockPos top = Terrain.randomColumn(level, p, radius(), rnd);
                if (top == null || !level.isRainingAt(top.above())) continue;
                BlockState s = level.getBlockState(top);
                if (s.is(BlockTags.LEAVES)) {
                    if (rnd.nextFloat() < 0.5F) level.setBlock(top, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                } else if (s.is(Blocks.GRASS_BLOCK)) {
                    level.setBlock(top, Blocks.DIRT.defaultBlockState(), Block.UPDATE_ALL);
                } else if (Terrain.isPlant(s)) {
                    killPlant(level, top, s);
                } else {
                    WeatheringCopper.getNext(s.getBlock()).ifPresent(b -> level.setBlockAndUpdate(top, b.withPropertiesOf(s)));
                }
            }
        }
    }

    private static void killPlant(ServerLevel level, BlockPos pos, BlockState s) {
        if (s.is(Blocks.SNOW) || s.getBlock() instanceof SnowLayerBlock) return;
        BlockPos base = pos;
        if (s.getBlock() instanceof DoublePlantBlock && s.getValue(DoublePlantBlock.HALF) == DoubleBlockHalf.UPPER) base = pos.below();
        BlockState below = level.getBlockState(base.below());
        boolean dirt = below.is(BlockTags.DIRT) || below.is(BlockTags.SAND) || below.is(BlockTags.TERRACOTTA);
        level.setBlock(base, dirt && level.random.nextFloat() < 0.5F ? Blocks.DEAD_BUSH.defaultBlockState() : Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
    }

    /** Darkness and cold for years: photosynthesis stopped, lakes froze, plants and then herbivores died. */
    public static void winter(ServerLevel level, long time, float cold) {
        RandomSource rnd = level.random;
        boolean hazards = ExtinctionConfig.PLAYER_HAZARDS.get();
        for (ServerPlayer p : Terrain.players(level)) {
            if (hazards && !p.isCreative() && !p.isSpectator() && p.canFreeze()) {
                boolean outside = level.canSeeSky(p.blockPosition().above());
                boolean warm = time % 10 == 0 ? Terrain.nearHeat(level, p.blockPosition(), 4) : p.getPersistentData().getBoolean("extinction_warm");
                if (time % 10 == 0) p.getPersistentData().putBoolean("extinction_warm", warm);
                if (!warm && (outside || cold > 0.8F)) {
                    p.setTicksFrozen(Math.min(p.getTicksRequiredToFreeze() + 20, p.getTicksFrozen() + (outside ? 3 : 2)));
                }
                if (time % 200 == 0) p.causeFoodExhaustion(1.5F * cold);
            }
            if (!destroy() || time % 2 != 0) continue;
            for (int i = 0; i < 6; i++) {
                BlockPos top = Terrain.randomColumn(level, p, radius(), rnd);
                if (top == null) continue;
                BlockState s = level.getBlockState(top);
                if (s.is(Blocks.WATER) && s.getFluidState().isSource()) {
                    if (rnd.nextFloat() < cold) level.setBlock(top, Blocks.ICE.defaultBlockState(), Block.UPDATE_ALL);
                } else if (s.is(BlockTags.LEAVES)) {
                    if (rnd.nextFloat() < 0.6F * cold) level.setBlock(top, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                } else if (s.is(Blocks.GRASS_BLOCK)) {
                    if (rnd.nextFloat() < cold) level.setBlock(top, (rnd.nextBoolean() ? Blocks.COARSE_DIRT : Blocks.DIRT).defaultBlockState(), Block.UPDATE_ALL);
                } else if (Terrain.isPlant(s) && !(s.getBlock() instanceof SnowLayerBlock)) {
                    killPlant(level, top, s);
                } else if (rnd.nextFloat() < 0.7F * cold && level.isRainingAt(top.above())) {
                    layer(level, top, Blocks.SNOW, 4);
                }
            }
        }
    }

    /** Darkness fades, rain washes the ash away, and ferns cover everything first: the "fern spike". */
    public static void recovery(ServerLevel level, long time, float progress) {
        if (!destroy() || time % 2 != 0) return;
        RandomSource rnd = level.random;
        for (ServerPlayer p : Terrain.players(level)) {
            for (int i = 0; i < 8; i++) {
                BlockPos top = Terrain.randomColumn(level, p, radius(), rnd);
                if (top == null) continue;
                BlockState s = level.getBlockState(top);
                if (s.getBlock() instanceof SnowLayerBlock) {
                    int layers = s.getValue(SnowLayerBlock.LAYERS);
                    if (rnd.nextFloat() < 0.5F) {
                        level.setBlock(top, layers > 1 ? s.setValue(SnowLayerBlock.LAYERS, layers - 1) : Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                    }
                } else if (s.is(Blocks.ICE)) {
                    level.setBlock(top, Blocks.WATER.defaultBlockState(), Block.UPDATE_ALL);
                } else if (s.is(Blocks.DIRT) || s.is(Blocks.COARSE_DIRT) || s.is(ModRegistry.SCORCHED_EARTH.get()) || s.is(Blocks.GRASS_BLOCK)) {
                    if (!level.getBlockState(top.above()).isAir()) continue;
                    if (!s.is(Blocks.GRASS_BLOCK) && rnd.nextFloat() < 0.35F + progress * 0.4F) {
                        level.setBlock(top, Blocks.GRASS_BLOCK.defaultBlockState(), Block.UPDATE_ALL);
                    } else if (s.is(Blocks.GRASS_BLOCK) && rnd.nextFloat() < 0.45F) {
                        fern(level, top.above(), rnd);
                    }
                } else if (s.is(Blocks.DEAD_BUSH) && rnd.nextFloat() < 0.5F) {
                    level.setBlock(top, Blocks.FERN.defaultBlockState(), Block.UPDATE_ALL);
                }
            }
        }
    }

    private static void fern(ServerLevel level, BlockPos at, RandomSource rnd) {
        float f = rnd.nextFloat();
        if (f < 0.18F && level.getBlockState(at.above()).isAir()) {
            DoublePlantBlock.placeAt(level, Blocks.LARGE_FERN.defaultBlockState(), at, Block.UPDATE_ALL);
        } else if (f < 0.85F) {
            level.setBlock(at, Blocks.FERN.defaultBlockState(), Block.UPDATE_ALL);
        } else if (f < 0.9F) {
            level.setBlock(at, Blocks.OAK_SAPLING.defaultBlockState(), Block.UPDATE_ALL);
        } else {
            level.setBlock(at, Blocks.GRASS.defaultBlockState(), Block.UPDATE_ALL);
        }
    }

    /** Starving extinct creatures get weak and slow before they die. */
    public static void starve(ServerLevel level, LivingEntity e, float severity) {
        e.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 220, 1, true, false));
        e.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 220, 1, true, false));
        float dmg = Math.max(2.0F, e.getMaxHealth() * 0.08F * severity);
        e.hurt(DamageTypes.source(level, DamageTypes.STARVATION), dmg);
    }

    public static boolean isAsh(BlockState s) {
        return s.getBlock() instanceof AshLayerBlock;
    }
}
