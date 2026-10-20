package com.hoai2k.extinction.entity;

import com.hoai2k.extinction.DamageTypes;
import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ModRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.NbtUtils;
import net.minecraft.network.protocol.Packet;
import net.minecraft.network.protocol.game.ClientGamePacketListener;
import net.minecraft.network.protocol.game.ClientboundAddEntityPacket;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;

/** A burning chunk of ejecta or a volcanic bomb. Streaks fire and smoke, then explodes where it lands. */
public class MeteorEntity extends Entity {
    private static final EntityDataAccessor<Float> SIZE = SynchedEntityData.defineId(MeteorEntity.class, EntityDataSerializers.FLOAT);
    private static final EntityDataAccessor<BlockState> BLOCK = SynchedEntityData.defineId(MeteorEntity.class, EntityDataSerializers.BLOCK_STATE);

    private double gravity = 0.02;

    public MeteorEntity(EntityType<? extends MeteorEntity> type, Level level) {
        super(type, level);
        noPhysics = true;
    }

    public static MeteorEntity launch(ServerLevel level, Vec3 from, Vec3 velocity, float size, double gravity, BlockState look) {
        MeteorEntity m = new MeteorEntity(ModRegistry.METEOR.get(), level);
        m.setPos(from.x, from.y, from.z);
        m.setDeltaMovement(velocity);
        m.entityData.set(SIZE, size);
        m.entityData.set(BLOCK, look);
        m.gravity = gravity;
        level.addFreshEntity(m);
        return m;
    }

    public static BlockState randomLook(RandomSource rnd) {
        return switch (rnd.nextInt(4)) {
            case 0 -> Blocks.MAGMA_BLOCK.defaultBlockState();
            case 1 -> Blocks.BLACKSTONE.defaultBlockState();
            case 2 -> ModRegistry.IMPACT_BRECCIA.get().defaultBlockState();
            default -> Blocks.MAGMA_BLOCK.defaultBlockState();
        };
    }

    @Override
    protected void defineSynchedData() {
        entityData.define(SIZE, 1.0F);
        entityData.define(BLOCK, Blocks.MAGMA_BLOCK.defaultBlockState());
    }

    public float size() {
        return entityData.get(SIZE);
    }

    public BlockState look() {
        return entityData.get(BLOCK);
    }

    @Override
    public void tick() {
        super.tick();
        Vec3 pos = position();
        Vec3 vel = getDeltaMovement().add(0, -gravity, 0);
        setDeltaMovement(vel);
        Vec3 next = pos.add(vel);
        Level level = level();
        if (level.isClientSide) {
            float s = size();
            for (int i = 0; i < 2 + (int) (s * 3); i++) {
                double t = random.nextDouble();
                double x = pos.x - vel.x * t, y = pos.y - vel.y * t, z = pos.z - vel.z * t;
                level.addParticle(ParticleTypes.FLAME, x + (random.nextDouble() - 0.5) * s, y + (random.nextDouble() - 0.5) * s,
                        z + (random.nextDouble() - 0.5) * s, 0, 0, 0);
                level.addParticle(ParticleTypes.LARGE_SMOKE, x, y, z, 0, 0.02, 0);
            }
            if (random.nextFloat() < 0.4F) level.addParticle(ParticleTypes.LAVA, pos.x, pos.y, pos.z, 0, 0, 0);
            if (s > 1.2F) level.addAlwaysVisibleParticle(ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true, pos.x, pos.y, pos.z, 0, 0.01, 0);
            setPos(next.x, next.y, next.z);
            return;
        }
        HitResult hit = level.clip(new ClipContext(pos, next, ClipContext.Block.COLLIDER, ClipContext.Fluid.ANY, this));
        if (hit.getType() == HitResult.Type.BLOCK) {
            impact((ServerLevel) level, hit.getLocation(), ((BlockHitResult) hit).getBlockPos());
            return;
        }
        setPos(next.x, next.y, next.z);
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, getBoundingBox().inflate(size() * 0.6))) {
            e.hurt(DamageTypes.source((ServerLevel) level, DamageTypes.EJECTA), 6.0F * size());
            e.setSecondsOnFire(5);
            impact((ServerLevel) level, position(), blockPosition());
            return;
        }
        if (tickCount > 600 || getY() < level.getMinBuildHeight()) discard();
    }

    private void impact(ServerLevel level, Vec3 at, BlockPos blockPos) {
        boolean destroy = ExtinctionConfig.DESTROY_TERRAIN.get();
        float power = 1.5F + size() * 1.6F;
        level.explode(this, DamageTypes.source(level, DamageTypes.EJECTA), null, at.x, at.y, at.z, power, destroy,
                destroy ? Level.ExplosionInteraction.TNT : Level.ExplosionInteraction.NONE);
        if (destroy) {
            BlockPos p = BlockPos.containing(at);
            for (int i = 0; i < 1 + (int) size() * 2; i++) {
                BlockPos q = p.offset(random.nextInt(3) - 1, random.nextInt(2) - 1, random.nextInt(3) - 1);
                BlockState s = level.getBlockState(q);
                if (s.isAir() && !level.getBlockState(q.below()).isAir()) {
                    level.setBlock(q, random.nextFloat() < 0.3F ? Blocks.MAGMA_BLOCK.defaultBlockState() : look(), Block.UPDATE_ALL);
                }
            }
        }
        discard();
    }

    @Override
    public boolean shouldRenderAtSqrDistance(double distSq) {
        return distSq < 512 * 512;
    }

    @Override
    public boolean isOnFire() {
        return false;
    }

    @Override
    protected void readAdditionalSaveData(CompoundTag tag) {
        entityData.set(SIZE, tag.getFloat("Size"));
        gravity = tag.getDouble("Gravity");
        entityData.set(BLOCK, NbtUtils.readBlockState(level().holderLookup(net.minecraft.core.registries.Registries.BLOCK), tag.getCompound("Look")));
    }

    @Override
    protected void addAdditionalSaveData(CompoundTag tag) {
        tag.putFloat("Size", size());
        tag.putDouble("Gravity", gravity);
        tag.put("Look", NbtUtils.writeBlockState(look()));
    }

    @Override
    public Packet<ClientGamePacketListener> getAddEntityPacket() {
        return new ClientboundAddEntityPacket(this);
    }
}
