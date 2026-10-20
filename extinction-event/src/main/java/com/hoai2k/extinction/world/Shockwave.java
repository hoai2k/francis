package com.hoai2k.extinction.world;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ModRegistry;
import com.hoai2k.extinction.net.FxMsg;
import com.hoai2k.extinction.net.Net;
import it.unimi.dsi.fastutil.ints.IntOpenHashSet;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.FallingBlockEntity;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.common.Tags;

import java.util.List;

/**
 * A blast front racing outward from a point. BLAST is an air blast (the impact shockwave, airbursts):
 * it flattens forests and buildings, throws debris and creatures. PYRO is a pyroclastic flow: a
 * searing avalanche of ash and gas that burns everything it rolls over and buries it in ash.
 */
public final class Shockwave {
    /** Speed of the impact shockwave, in blocks per tick (about 32 blocks a second). */
    public static final double SPEED = 1.6;
    private static final int REACH = 112;

    public enum Kind { BLAST, PYRO }

    public final BlockPos center;
    public final double inner, max, damage, speed;
    public final Kind kind;
    private int age;
    private final IntOpenHashSet hit = new IntOpenHashSet();

    public Shockwave(BlockPos center, double inner, double max, double damage, double speed, Kind kind, int age) {
        this.center = center;
        this.inner = inner;
        this.max = max;
        this.damage = damage;
        this.speed = speed;
        this.kind = kind;
        this.age = age;
    }

    /** The asteroid's shockwave, using the config's crater and shockwave sizes. */
    public static Shockwave impact(BlockPos center, int age) {
        return new Shockwave(center, ExtinctionConfig.CRATER_RADIUS.get(), ExtinctionConfig.SHOCKWAVE_RADIUS.get(),
                ExtinctionConfig.SHOCKWAVE_DAMAGE.get(), SPEED, Kind.BLAST, age);
    }

    public static boolean impactFinished(int sinceImpact) {
        return ExtinctionConfig.CRATER_RADIUS.get() + sinceImpact * SPEED > ExtinctionConfig.SHOCKWAVE_RADIUS.get();
    }

    public double radius(int a) {
        return inner + a * speed;
    }

    public int age() {
        return age;
    }

    public boolean finished() {
        return radius(age) > max;
    }

    public void tick(ServerLevel level) {
        age++;
        if (finished()) return;
        BlockPos c = center;
        double r0 = radius(age - 1), r1 = radius(age);
        boolean destroy = ExtinctionConfig.DESTROY_TERRAIN.get();
        RandomSource rnd = level.random;
        LongOpenHashSet done = new LongOpenHashSet();
        int[] fly = {100};
        for (ServerPlayer p : Terrain.players(level)) {
            double pd = Terrain.distXZ(c, p.getX(), p.getZ());
            if (pd > r1 + REACH || pd < r0 - REACH) continue;
            if (destroy) {
                int px = p.getBlockX(), pz = p.getBlockZ();
                for (int x = px - REACH; x <= px + REACH; x++) {
                    double dx = x + 0.5 - c.getX();
                    for (int z = pz - REACH; z <= pz + REACH; z++) {
                        double dz = z + 0.5 - c.getZ();
                        double r = Math.sqrt(dx * dx + dz * dz);
                        if (r < r0 || r >= r1) continue;
                        if (!done.add(BlockPos.asLong(x, 0, z)) || !Terrain.loaded(level, x, z)) continue;
                        float I = intensity(r, inner, max);
                        if (kind == Kind.PYRO) pyroColumn(level, x, z, I, rnd);
                        else column(level, x, z, r < 1 ? 1 : dx / r, r < 1 ? 0 : dz / r, I, rnd, fly);
                    }
                }
            }
            hitEntities(level, p, c, r0, r1);
        }
    }

    private static float intensity(double r, double R, double max) {
        double i = Mth.clamp(1 - (r - R) / (max - R), 0, 1);
        return (float) Math.pow(i, 1.3);
    }

    private static void column(ServerLevel level, int x, int z, double nx, double nz, float I, RandomSource rnd, int[] fly) {
        int top = Terrain.topY(level, x, z);
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (int y = top; y > top - 16 && y > level.getMinBuildHeight(); y--) {
            pos.set(x, y, z);
            BlockState s = level.getBlockState(pos);
            if (s.isAir()) continue;
            if (!s.getFluidState().isEmpty()) break;
            if (Terrain.isProtected(level, pos, s)) break;
            if (s.is(BlockTags.LEAVES)) {
                if (rnd.nextFloat() < I * 1.2F) {
                    if (rnd.nextFloat() < 0.02F * I && fly[0]-- > 0) throwBlock(level, pos, s, nx, nz, I, rnd);
                    else level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                }
            } else if (s.is(BlockTags.LOGS)) {
                if (rnd.nextFloat() < I * I * 1.3F) {
                    if (rnd.nextFloat() < 0.12F && fly[0]-- > 0) throwBlock(level, pos, s, nx, nz, I, rnd);
                    else level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                }
            } else if (s.is(Tags.Blocks.GLASS) || s.is(Tags.Blocks.GLASS_PANES)) {
                if (rnd.nextFloat() < I * 1.6F) level.destroyBlock(pos, false);
            } else if (Terrain.isPlant(s)) {
                if (rnd.nextFloat() < I * 1.5F) level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
            } else if (s.is(BlockTags.PLANKS) || s.is(BlockTags.WOODEN_FENCES) || s.is(BlockTags.WOOL) || s.is(BlockTags.WOODEN_SLABS)
                    || s.is(BlockTags.WOODEN_STAIRS) || s.is(BlockTags.WOODEN_DOORS) || s.is(BlockTags.WOODEN_TRAPDOORS)) {
                if (I > 0.45F && rnd.nextFloat() < (I - 0.45F) * 2.5F) {
                    if (rnd.nextFloat() < 0.25F && fly[0]-- > 0) throwBlock(level, pos, s, nx, nz, I, rnd);
                    else level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                } else break;
            } else if (!isNaturalGround(s)) {
                // Stone buildings: near the crater even these are blown apart.
                if (I > 0.65F && rnd.nextFloat() < (I - 0.65F) * 2.6F) {
                    if (rnd.nextFloat() < 0.3F && fly[0]-- > 0) throwBlock(level, pos, s, nx, nz, I, rnd);
                    else level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                } else break;
            } else if (I > 0.8F && y > top - 3 && rnd.nextFloat() < (I - 0.8F) * 2.5F) {
                // The blast scours the topsoil off the land.
                if (fly[0]-- > 0 && rnd.nextFloat() < 0.4F) throwBlock(level, pos, s, nx, nz, I, rnd);
                else level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
            } else {
                // First solid ground: scorch it, and near the crater rip some of it loose.
                if (I > 0.5F && Terrain.isGrassy(s) && rnd.nextFloat() < I) {
                    level.setBlock(pos, (rnd.nextBoolean() ? ModRegistry.SCORCHED_EARTH.get() : Blocks.COARSE_DIRT).defaultBlockState(), Block.UPDATE_CLIENTS);
                } else if (I > 0.35F && rnd.nextFloat() < I * 0.06F && fly[0]-- > 0
                        && (s.is(BlockTags.DIRT) || s.is(BlockTags.SAND) || s.is(Blocks.GRAVEL) || s.is(BlockTags.BASE_STONE_OVERWORLD))) {
                    throwBlock(level, pos, s, nx, nz, I, rnd);
                }
                if (I > 0.45F && rnd.nextFloat() < (I - 0.45F) * 0.6F) {
                    BlockPos above = pos.above();
                    if (level.getBlockState(above).isAir()) level.setBlock(above, Blocks.FIRE.defaultBlockState(), Block.UPDATE_ALL);
                }
                if (rnd.nextFloat() < 0.006F) {
                    level.sendParticles(ParticleTypes.EXPLOSION, x + 0.5, y + 1.5, z + 0.5, 1, 0, 0, 0, 0);
                }
                break;
            }
        }
    }

    /** Everything the flow touches burns; what is left is buried in hot ash. */
    private static void pyroColumn(ServerLevel level, int x, int z, float I, RandomSource rnd) {
        int top = Terrain.topY(level, x, z);
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (int y = top; y > top - 14 && y > level.getMinBuildHeight(); y--) {
            pos.set(x, y, z);
            BlockState s = level.getBlockState(pos);
            if (s.isAir()) continue;
            if (Terrain.isProtected(level, pos, s)) break;
            if (s.is(Blocks.WATER) && s.getFluidState().isSource() && rnd.nextFloat() < 0.5F * I) {
                // Shallow water flashes to steam.
                level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
                continue;
            }
            if (!s.getFluidState().isEmpty()) break;
            if (s.is(BlockTags.LEAVES) || Terrain.isPlant(s)) {
                level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS);
            } else if (s.is(BlockTags.LOGS) || s.is(BlockTags.PLANKS) || s.is(BlockTags.WOOL)) {
                level.setBlock(pos, rnd.nextFloat() < 0.5F ? Blocks.AIR.defaultBlockState()
                        : (rnd.nextBoolean() ? Blocks.BASALT : Blocks.BLACKSTONE).defaultBlockState(), Block.UPDATE_CLIENTS);
            } else if (s.is(Tags.Blocks.GLASS) || s.is(Tags.Blocks.GLASS_PANES)) {
                level.destroyBlock(pos, false);
            } else {
                if (Terrain.isGrassy(s) || s.is(Blocks.DIRT)) level.setBlock(pos, ModRegistry.SCORCHED_EARTH.get().defaultBlockState(), Block.UPDATE_CLIENTS);
                BlockPos above = pos.above();
                if (level.getBlockState(above).isAir()) {
                    int layers = 1 + (int) (I * 5 * rnd.nextFloat());
                    BlockState ash = ModRegistry.ASH_LAYER.get().defaultBlockState().setValue(net.minecraft.world.level.block.SnowLayerBlock.LAYERS, Math.min(8, layers));
                    level.setBlock(above, rnd.nextFloat() < 0.15F ? Blocks.FIRE.defaultBlockState() : ash, Block.UPDATE_CLIENTS);
                }
                if (rnd.nextFloat() < 0.01F) level.sendParticles(ParticleTypes.LARGE_SMOKE, x + 0.5, y + 2, z + 0.5, 4, 1, 1, 1, 0.05);
                break;
            }
        }
    }

    private static boolean isNaturalGround(BlockState s) {
        return s.is(BlockTags.DIRT) || s.is(BlockTags.SAND) || s.is(Blocks.GRAVEL) || s.is(BlockTags.BASE_STONE_OVERWORLD)
                || s.is(Blocks.CLAY) || s.is(BlockTags.TERRACOTTA) || s.is(Tags.Blocks.SANDSTONE) || s.is(Blocks.SNOW_BLOCK)
                || s.is(Blocks.ICE) || s.is(Blocks.PACKED_ICE) || s.is(BlockTags.SNOW) || s.is(ModRegistry.SCORCHED_EARTH.get())
                || s.is(Blocks.FARMLAND) || s.is(Blocks.DIRT_PATH) || s.is(Blocks.MUD);
    }

    private static void throwBlock(ServerLevel level, BlockPos pos, BlockState s, double nx, double nz, float I, RandomSource rnd) {
        FallingBlockEntity fb = FallingBlockEntity.fall(level, pos.immutable(), s);
        fb.dropItem = false;
        double sp = 0.6 + I * 1.4 + rnd.nextDouble() * 0.4;
        fb.setDeltaMovement(nx * sp, 0.4 + I * 0.9 + rnd.nextDouble() * 0.3, nz * sp);
    }

    private void hitEntities(ServerLevel level, ServerPlayer near, BlockPos c, double r0, double r1) {
        AABB box = near.getBoundingBox().inflate(REACH, 64, REACH);
        List<LivingEntity> list = level.getEntitiesOfClass(LivingEntity.class, box, e -> e.isAlive() && (!e.isSpectator() || e instanceof ServerPlayer));
        boolean hazards = ExtinctionConfig.PLAYER_HAZARDS.get();
        for (LivingEntity e : list) {
            double r = Terrain.distXZ(c, e.getX(), e.getZ());
            if (r < r0 - 2 || r >= r1 + 2 || !hit.add(e.getId())) continue;
            float I = intensity(r, inner, max);
            boolean sheltered = !level.canSeeSky(e.blockPosition().above());
            float shield = sheltered ? 0.35F : 1F;
            Vec3 dir = new Vec3(e.getX() - c.getX(), 0, e.getZ() - c.getZ()).normalize();
            if (e instanceof ServerPlayer sp) {
                Net.to(sp, FxMsg.at(kind == Kind.PYRO ? FxMsg.PYRO_HIT : FxMsg.SHOCK_HIT, c.getX(), c.getY(), c.getZ(), I));
                if (!hazards || (sp.isCreative() || sp.isSpectator())) continue;
            }
            if (kind == Kind.PYRO) {
                // Hundreds of degrees: cover barely helps.
                float burn = (float) (damage * (0.4F + 0.6F * I) * (sheltered ? 0.6F : 1F));
                e.hurt(DamageTypes.source(level, DamageTypes.PYRO), burn);
                e.setSecondsOnFire(10);
                e.push(dir.x * 0.8, 0.2, dir.z * 0.8);
                e.hurtMarked = true;
                continue;
            }
            e.push(dir.x * (0.6 + 5.0 * I) * shield, (0.4 + 1.8 * I) * shield, dir.z * (0.6 + 5.0 * I) * shield);
            e.hurtMarked = true;
            float dmg = (float) (damage * I * shield);
            if (dmg > 0.5F) e.hurt(DamageTypes.source(level, DamageTypes.SHOCKWAVE), dmg);
            if (I > 0.5F) e.setSecondsOnFire((int) (8 * I * shield));
            if (I > 0.25F) {
                // Concussed: the world spins and the ears ring.
                e.addEffect(new MobEffectInstance(MobEffects.CONFUSION, (int) (260 * I), 0, false, false));
                e.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, (int) (160 * I), 2, false, false));
            }
        }
    }
}
