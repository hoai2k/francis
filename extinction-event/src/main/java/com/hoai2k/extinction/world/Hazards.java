package com.hoai2k.extinction.world;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ModRegistry;
import com.hoai2k.extinction.entity.MeteorEntity;
import com.hoai2k.extinction.net.FxMsg;
import com.hoai2k.extinction.net.Net;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LightningBolt;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.animal.WaterAnimal;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.SnowLayerBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.registries.ForgeRegistries;

/** Reusable disasters for the catastrophes: radiation, heat, deep freeze, poisoned seas, storms, airbursts, strikes. */
public final class Hazards {
    private Hazards() {}

    private static boolean destroy() {
        return ExtinctionConfig.DESTROY_TERRAIN.get();
    }

    private static int radius() {
        return ExtinctionConfig.EFFECT_RADIUS.get();
    }

    private static boolean vulnerable(LivingEntity e) {
        if (e instanceof ServerPlayer sp) return ExtinctionConfig.PLAYER_HAZARDS.get() && !sp.isCreative() && !sp.isSpectator();
        return true;
    }

    /** Ozone gone (gamma-ray burst) or a superflare: the sun burns anything under open sky. */
    public static void uvBurn(ServerLevel level, long time, float strength) {
        RandomSource rnd = level.random;
        for (ServerPlayer p : Terrain.players(level)) {
            if (time % 20 == 0) {
                for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, p.getBoundingBox().inflate(48))) {
                    if (!vulnerable(e) || !level.canSeeSky(BlockPos.containing(e.getEyePosition())) || !level.isDay()) continue;
                    e.hurt(DamageTypes.source(level, DamageTypes.RADIATION), 1.0F + 2.5F * strength);
                    if (strength > 0.5F) e.setSecondsOnFire(2 + (int) (3 * strength));
                    if (rnd.nextFloat() < 0.3F * strength) e.addEffect(new MobEffectInstance(MobEffects.WITHER, 60, 0));
                }
            }
            if (!destroy() || time % 2 != 0) continue;
            for (int i = 0; i < 5; i++) {
                BlockPos top = Terrain.randomColumn(level, p, radius(), rnd);
                if (top == null || !level.canSeeSky(top.above())) continue;
                withers(level, top, rnd, strength);
                if (strength > 0.8F && rnd.nextFloat() < 0.05F) ignite(level, top);
            }
        }
    }

    /** Hothouse Earth: lethal heat, rivers and lakes boil off, the land dries out and burns. */
    public static void heat(ServerLevel level, long time, float strength) {
        RandomSource rnd = level.random;
        for (ServerPlayer p : Terrain.players(level)) {
            if (time % 30 == 0) {
                for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, p.getBoundingBox().inflate(48))) {
                    if (!vulnerable(e) || e.isInWaterOrRain()) continue;
                    boolean shade = !level.canSeeSky(BlockPos.containing(e.getEyePosition()));
                    if (shade && strength < 0.8F) continue;
                    e.hurt(DamageTypes.source(level, DamageTypes.HEAT), (shade ? 0.5F : 1.5F) * strength);
                    if (e instanceof ServerPlayer sp) sp.causeFoodExhaustion(2F * strength);
                }
            }
            if (!destroy() || time % 2 != 0) continue;
            for (int i = 0; i < 6; i++) {
                BlockPos top = Terrain.randomColumn(level, p, radius(), rnd);
                if (top == null) continue;
                BlockState s = level.getBlockState(top);
                if (s.is(Blocks.WATER) && rnd.nextFloat() < 0.6F * strength && top.getY() > level.getSeaLevel() - 2) {
                    level.setBlock(top, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                    level.sendParticles(ParticleTypes.CLOUD, top.getX() + 0.5, top.getY() + 1, top.getZ() + 0.5, 3, 0.4, 0.2, 0.4, 0.02);
                } else if (s.is(Blocks.ICE) || s.is(Blocks.SNOW_BLOCK) || s.getBlock() instanceof SnowLayerBlock && !s.is(ModRegistry.ASH_LAYER.get())) {
                    level.setBlock(top, s.is(Blocks.ICE) ? Blocks.WATER.defaultBlockState() : Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                } else {
                    withers(level, top, rnd, strength);
                    if (rnd.nextFloat() < 0.04F * strength) ignite(level, top);
                    if (s.is(Blocks.DIRT) || s.is(Blocks.COARSE_DIRT)) {
                        if (rnd.nextFloat() < 0.3F * strength) level.setBlock(top, (rnd.nextBoolean() ? Blocks.SAND : Blocks.RED_SAND).defaultBlockState(), Block.UPDATE_ALL);
                    }
                }
            }
        }
    }

    /** Plants scorched, bleached or frozen to death. */
    private static void withers(ServerLevel level, BlockPos top, RandomSource rnd, float strength) {
        BlockState s = level.getBlockState(top);
        if (s.is(BlockTags.LEAVES)) {
            if (rnd.nextFloat() < 0.6F * strength) level.setBlock(top, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
        } else if (s.is(Blocks.GRASS_BLOCK) || s.is(Blocks.PODZOL) || s.is(Blocks.MYCELIUM)) {
            if (rnd.nextFloat() < strength) level.setBlock(top, (rnd.nextBoolean() ? Blocks.COARSE_DIRT : Blocks.DIRT).defaultBlockState(), Block.UPDATE_ALL);
        } else if (Terrain.isPlant(s) && !(s.getBlock() instanceof SnowLayerBlock)) {
            BlockState below = level.getBlockState(top.below());
            boolean dirt = below.is(BlockTags.DIRT) || below.is(BlockTags.SAND);
            level.setBlock(top, dirt && rnd.nextFloat() < 0.4F ? Blocks.DEAD_BUSH.defaultBlockState() : Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
        }
    }

    private static void ignite(ServerLevel level, BlockPos top) {
        BlockState s = level.getBlockState(top);
        BlockPos fire = Terrain.isPlant(s) ? top : top.above();
        if ((level.getBlockState(fire).isAir() || Terrain.isPlant(level.getBlockState(fire))) && !level.getBlockState(fire.below()).isAir()
                && (s.is(BlockTags.LEAVES) || s.is(BlockTags.LOGS) || s.is(Blocks.GRASS_BLOCK) || Terrain.isPlant(s) || s.isFlammable(level, top, Direction.UP))) {
            level.setBlock(fire, Blocks.FIRE.defaultBlockState(), Block.UPDATE_ALL);
        }
    }

    /**
     * Snowball Earth. Seas freeze over, snow piles into an ice sheet up to burial blocks deep,
     * forests die under it, and anything without a fire freezes.
     */
    public static void freeze(ServerLevel level, long time, float strength, int burial, Vec3 wind) {
        RandomSource rnd = level.random;
        for (ServerPlayer p : Terrain.players(level)) {
            if (vulnerable(p) && p.canFreeze()) {
                boolean warm = time % 10 == 0 ? Terrain.nearHeat(level, p.blockPosition(), 4) : p.getPersistentData().getBoolean("extinction_warm");
                if (time % 10 == 0) p.getPersistentData().putBoolean("extinction_warm", warm);
                if (!warm) p.setTicksFrozen(Math.min(p.getTicksRequiredToFreeze() + 40, p.getTicksFrozen() + 2 + (int) (3 * strength)));
                if (!warm && p.isFullyFrozen() && time % 40 == 0) p.hurt(DamageTypes.source(level, DamageTypes.COLD), 1.5F * strength);
            }
            if (wind != null && level.canSeeSky(p.blockPosition().above()) && vulnerable(p)) {
                p.push(wind.x * strength * 0.05, 0, wind.z * strength * 0.05);
                p.hurtMarked = true;
            }
            if (time % 40 == 0) {
                for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, p.getBoundingBox().inflate(48), e -> !(e instanceof ServerPlayer))) {
                    if (level.canSeeSky(e.blockPosition().above()) && rnd.nextFloat() < strength) {
                        e.setTicksFrozen(e.getTicksRequiredToFreeze() + 10);
                        e.hurt(DamageTypes.source(level, DamageTypes.COLD), 1.0F + 2F * strength);
                    }
                }
            }
            if (!destroy()) continue;
            for (int i = 0; i < 4 + (int) (10 * strength); i++) {
                BlockPos top = Terrain.randomColumn(level, p, radius(), rnd);
                if (top == null) continue;
                BlockState s = level.getBlockState(top);
                if (s.is(Blocks.WATER) || s.is(Blocks.ICE) && strength > 0.7F) {
                    // Freeze down into the sea, a few blocks deeper the colder it gets.
                    int depth = 1 + (int) (strength * 4);
                    for (int d = 0; d < depth; d++) {
                        BlockPos q = top.below(d);
                        BlockState w = level.getBlockState(q);
                        if (!w.is(Blocks.WATER) && !w.is(Blocks.ICE)) break;
                        level.setBlock(q, (d == 0 && strength > 0.7F ? Blocks.PACKED_ICE : Blocks.ICE).defaultBlockState(), Block.UPDATE_CLIENTS);
                    }
                } else if (s.is(BlockTags.LEAVES)) {
                    level.setBlock(top, rnd.nextFloat() < 0.5F ? Blocks.SNOW_BLOCK.defaultBlockState() : Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
                } else if (Terrain.isPlant(s) && !(s.getBlock() instanceof SnowLayerBlock)) {
                    level.setBlock(top, Blocks.SNOW.defaultBlockState(), Block.UPDATE_ALL);
                } else if (s.is(Blocks.SNOW)) {
                    int layers = s.getValue(SnowLayerBlock.LAYERS);
                    level.setBlock(top, layers < 8 ? s.setValue(SnowLayerBlock.LAYERS, layers + 1) : Blocks.SNOW_BLOCK.defaultBlockState(), Block.UPDATE_CLIENTS);
                } else if (s.is(Blocks.SNOW_BLOCK) || s.is(Blocks.PACKED_ICE) || s.is(Blocks.BLUE_ICE)) {
                    // The ice sheet thickens until it reaches its burial depth.
                    int depth = 0;
                    while (depth < burial + 1) {
                        BlockState under = level.getBlockState(top.below(depth));
                        if (!under.is(Blocks.SNOW_BLOCK) && !under.is(Blocks.PACKED_ICE) && !under.is(Blocks.BLUE_ICE)) break;
                        depth++;
                    }
                    if (depth < burial && level.getBlockState(top.above()).isAir()) {
                        level.setBlock(top.above(), (rnd.nextFloat() < 0.2F ? Blocks.PACKED_ICE : Blocks.SNOW).defaultBlockState(), Block.UPDATE_CLIENTS);
                    }
                    if (depth > 3 && s.is(Blocks.SNOW_BLOCK) && rnd.nextFloat() < 0.1F) level.setBlock(top, Blocks.PACKED_ICE.defaultBlockState(), Block.UPDATE_CLIENTS);
                } else if (s.isFaceSturdy(level, top, Direction.UP) && level.getBlockState(top.above()).isAir()) {
                    level.setBlock(top.above(), Blocks.SNOW.defaultBlockState(), Block.UPDATE_CLIENTS);
                }
            }
        }
    }

    /** Ocean anoxia: the seas turn to hydrogen sulfide. Anything in the water is poisoned, sea life dies, reefs bleach. */
    public static void toxicWater(ServerLevel level, long time, float strength) {
        RandomSource rnd = level.random;
        for (ServerPlayer p : Terrain.players(level)) {
            if (time % 20 == 0) {
                for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, p.getBoundingBox().inflate(64))) {
                    if (!vulnerable(e)) continue;
                    if (e.isInWater()) {
                        e.addEffect(new MobEffectInstance(MobEffects.POISON, 100, 1));
                        e.addEffect(new MobEffectInstance(MobEffects.WITHER, 60, strength > 0.7F ? 1 : 0));
                        e.hurt(DamageTypes.source(level, DamageTypes.TOXIC), e instanceof WaterAnimal ? 4F : 1.5F * strength);
                    } else if (strength > 0.6F && e.getY() < level.getSeaLevel() + 6 && rnd.nextFloat() < 0.3F) {
                        // The gas pools in the lowlands.
                        e.addEffect(new MobEffectInstance(MobEffects.CONFUSION, 120, 0));
                        e.addEffect(new MobEffectInstance(MobEffects.POISON, 60, 0));
                    }
                }
            }
            if (!destroy() || time % 3 != 0) continue;
            for (int i = 0; i < 6; i++) {
                BlockPos top = Terrain.randomColumn(level, p, radius(), rnd);
                if (top == null) continue;
                for (int d = 0; d < 12; d++) {
                    BlockPos q = top.below(d);
                    BlockState s = level.getBlockState(q);
                    if (s.is(Blocks.KELP) || s.is(Blocks.KELP_PLANT) || s.is(Blocks.SEAGRASS) || s.is(Blocks.TALL_SEAGRASS) || s.is(Blocks.SEA_PICKLE)) {
                        level.setBlock(q, Blocks.WATER.defaultBlockState(), Block.UPDATE_ALL);
                    } else {
                        ResourceLocation id = ForgeRegistries.BLOCKS.getKey(s.getBlock());
                        if (id != null && id.getNamespace().equals("minecraft") && id.getPath().contains("coral") && !id.getPath().startsWith("dead_")) {
                            ResourceLocation dead = new ResourceLocation("minecraft", "dead_" + id.getPath());
                            if (ForgeRegistries.BLOCKS.containsKey(dead)) level.setBlock(q, ForgeRegistries.BLOCKS.getValue(dead).withPropertiesOf(s), Block.UPDATE_ALL);
                        }
                    }
                    if (!s.getFluidState().isEmpty() || s.isAir()) continue;
                    break;
                }
                if (rnd.nextFloat() < 0.15F && level.getBlockState(top).is(Blocks.WATER)) {
                    level.sendParticles(ParticleTypes.BUBBLE_POP, top.getX() + 0.5, top.getY() + 1, top.getZ() + 0.5, 8, 1, 0.1, 1, 0.01);
                }
            }
        }
    }

    /** Lightning everywhere near the players: rate is bolts per player per second. */
    public static void lightning(ServerLevel level, float rate) {
        RandomSource rnd = level.random;
        for (ServerPlayer p : Terrain.players(level)) {
            if (rnd.nextFloat() > Math.min(rate, 0.8F) / 20F) continue;
            double a = rnd.nextDouble() * Math.PI * 2, d = 8 + rnd.nextDouble() * 70;
            int x = p.getBlockX() + (int) (Math.cos(a) * d), z = p.getBlockZ() + (int) (Math.sin(a) * d);
            if (!Terrain.loaded(level, x, z)) continue;
            LightningBolt bolt = EntityType.LIGHTNING_BOLT.create(level);
            if (bolt == null) continue;
            bolt.moveTo(x + 0.5, Terrain.groundY(level, x, z) + 1, z + 0.5);
            bolt.setVisualOnly(!destroy());
            level.addFreshEntity(bolt);
        }
    }

    /** A comet fragment explodes in the air (Tunguska): a flash, then a blast that lays the forest flat in a circle. */
    public static void airburst(Scene sc, int x, int z, float size) {
        ServerLevel level = sc.level;
        if (!level.hasChunk(x >> 4, z >> 4)) return;
        int ground = Terrain.groundY(level, x, z);
        BlockPos c = new BlockPos(x, ground, z);
        Vec3 burst = new Vec3(x + 0.5, ground + 80 + size * 0.3, z + 0.5);
        sc.markers.add(Markers.FIREBALL, burst, size * 0.35F, 1, 200);
        sc.blasts.add(new Shockwave(c, 0, size, 26, 2.2, Shockwave.Kind.BLAST, 0));
        sc.markers.add(Markers.RING, Vec3.atCenterOf(c), 0, 2.2F, size, 0, (int) (size / 2.2));
        flash(level, burst, 0.8F);
        for (ServerPlayer p : Terrain.players(level)) {
            if (p.distanceToSqr(burst) < 500 * 500) level.sendParticles(p, ParticleTypes.EXPLOSION_EMITTER, true, burst.x, burst.y, burst.z, 8, 10, 6, 10, 0);
        }
    }

    /** A rock from space hits the ground: crater, fireball, blast ring, ejecta. */
    public static void meteorStrike(Scene sc, int x, int z, int craterRadius) {
        ServerLevel level = sc.level;
        level.getChunk(x >> 4, z >> 4);
        int ground = Terrain.groundY(level, x, z);
        BlockPos c = new BlockPos(x, ground, z);
        Vec3 at = Vec3.atCenterOf(c);
        sc.markers.add(Markers.FIREBALL, at.add(0, craterRadius * 0.6, 0), craterRadius * 2.5F, 1, 300);
        double reach = craterRadius * 7.0;
        sc.blasts.add(new Shockwave(c, craterRadius, reach, 34, 1.8, Shockwave.Kind.BLAST, 0));
        sc.markers.add(Markers.RING, at, craterRadius, 1.8F, (float) reach, 0, (int) ((reach - craterRadius) / 1.8));
        if (destroy()) Crater.enqueue(sc.queue, c, ground, craterRadius, Math.max(6, craterRadius * 2 / 3), () -> {});
        flash(level, at, 0.7F);
        RandomSource rnd = level.random;
        for (int i = 0; i < 12 + craterRadius; i++) {
            double a = rnd.nextDouble() * Math.PI * 2, dist = craterRadius * 1.5 + rnd.nextDouble() * craterRadius * 6;
            double hv = 1.2 + rnd.nextDouble(), g = 0.05, t = dist / hv;
            MeteorEntity.launch(level, at.add(0, 4, 0), new Vec3(Math.cos(a) * hv, 0.5 * g * t, Math.sin(a) * hv),
                    0.6F + rnd.nextFloat() * 1.2F, g, MeteorEntity.randomLook(rnd));
        }
        for (ServerPlayer p : Terrain.players(level)) {
            if (p.distanceToSqr(at) < 600 * 600) {
                level.sendParticles(p, ParticleTypes.EXPLOSION_EMITTER, true, at.x, at.y + 4, at.z, 16, craterRadius * 0.5, 6, craterRadius * 0.5, 0);
                level.sendParticles(p, ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true, at.x, at.y + 8, at.z, 80, craterRadius * 0.6, 12, craterRadius * 0.6, 0.15);
            }
        }
    }

    /** A blinding flash for everyone nearby (distance-scaled on the client). */
    public static void flash(ServerLevel level, Vec3 at, float strength) {
        for (ServerPlayer p : level.players()) {
            if (p.distanceToSqr(at) < 1500 * 1500) Net.to(p, FxMsg.at(FxMsg.FLASH, at.x, at.y, at.z, strength));
        }
    }
}
