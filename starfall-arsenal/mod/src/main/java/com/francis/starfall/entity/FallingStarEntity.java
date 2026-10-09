package com.francis.starfall.entity;

import com.francis.starfall.strike.Impact;
import com.francis.starfall.strike.StarSpec;
import com.francis.starfall.strike.StrikeType;
import java.util.UUID;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.damage.DamageSource;
import net.minecraft.entity.data.DataTracker;
import net.minecraft.entity.data.TrackedData;
import net.minecraft.entity.data.TrackedDataHandlerRegistry;
import net.minecraft.nbt.NbtCompound;
import net.minecraft.particle.DustParticleEffect;
import net.minecraft.particle.ParticleTypes;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import org.jetbrains.annotations.Nullable;
import org.joml.Vector3f;

/**
 * A star called down by a Starfall weapon.
 *
 * The entity itself waits at the landing point (so it always sits in loaded,
 * ticking chunks near the caster); its visible path from the sky is computed
 * from the synced {@link StarSpec} and drawn by the client renderer, which
 * keeps the flight perfectly smooth for every viewer.
 */
public class FallingStarEntity extends Entity {
    /** How long the fireball and shockwave linger after impact. */
    public static final int AFTERMATH_TICKS = 40;

    private static final TrackedData<Vector3f> START = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.VECTOR3F);
    private static final TrackedData<Long> SPAWN_TIME = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.LONG);
    private static final TrackedData<Integer> IGNITE = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.INTEGER);
    private static final TrackedData<Integer> TRAVEL = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.INTEGER);
    private static final TrackedData<Float> SIZE = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.FLOAT);
    private static final TrackedData<Float> RADIUS = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.FLOAT);
    private static final TrackedData<Integer> TYPE = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.INTEGER);
    private static final TrackedData<Integer> OWNER = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.INTEGER);
    private static final TrackedData<Boolean> LEADER = DataTracker.registerData(FallingStarEntity.class, TrackedDataHandlerRegistry.BOOLEAN);

    @Nullable private UUID ownerUuid;
    private boolean detonated;
    @Nullable private StarSpec cachedSpec;

    public FallingStarEntity(EntityType<?> type, World world) {
        super(type, world);
        this.noClip = true;
    }

    public void setup(StarSpec spec, StrikeType type, Entity owner, boolean leader) {
        setPosition(spec.end());
        dataTracker.set(START, spec.start().toVector3f());
        dataTracker.set(SPAWN_TIME, getWorld().getTime());
        dataTracker.set(IGNITE, spec.igniteTick());
        dataTracker.set(TRAVEL, spec.travelTicks());
        dataTracker.set(SIZE, spec.size());
        dataTracker.set(RADIUS, spec.radius());
        dataTracker.set(TYPE, type.ordinal());
        dataTracker.set(OWNER, owner.getId());
        dataTracker.set(LEADER, leader);
        ownerUuid = owner.getUuid();
    }

    @Override
    protected void initDataTracker(DataTracker.Builder builder) {
        builder.add(START, new Vector3f());
        builder.add(SPAWN_TIME, 0L);
        builder.add(IGNITE, 0);
        builder.add(TRAVEL, 1);
        builder.add(SIZE, 1f);
        builder.add(RADIUS, 1f);
        builder.add(TYPE, 0);
        builder.add(OWNER, -1);
        builder.add(LEADER, false);
    }

    @Override
    public void onTrackedDataSet(TrackedData<?> data) {
        super.onTrackedDataSet(data);
        cachedSpec = null;
    }

    public StarSpec spec() {
        if (cachedSpec == null) {
            cachedSpec = new StarSpec(new Vec3d(dataTracker.get(START)), getPos(), dataTracker.get(IGNITE),
                    Math.max(1, dataTracker.get(TRAVEL)), dataTracker.get(RADIUS), dataTracker.get(SIZE));
        }
        return cachedSpec;
    }

    public StrikeType strikeType() {
        return StrikeType.byId(dataTracker.get(TYPE));
    }

    public boolean isLeader() {
        return dataTracker.get(LEADER);
    }

    @Nullable
    public Entity owner() {
        return getWorld().getEntityById(dataTracker.get(OWNER));
    }

    /** Ticks since the weapon was used, interpolated for rendering. */
    public float strikeTime(float tickDelta) {
        return (float) (getWorld().getTime() - dataTracker.get(SPAWN_TIME)) + tickDelta;
    }

    @Override
    public void tick() {
        super.tick();
        StarSpec spec = spec();
        int t = (int) (getWorld().getTime() - dataTracker.get(SPAWN_TIME));
        if (getWorld().isClient()) {
            clientEffects(spec, t);
            return;
        }
        ServerWorld world = (ServerWorld) getWorld();
        if (t == spec.igniteTick() - 20) {
            Entity owner = owner();
            Vec3d at = owner != null ? owner.getPos() : spec.end();
            world.playSound(null, at.x, at.y, at.z, SoundEvents.BLOCK_AMETHYST_BLOCK_RESONATE, SoundCategory.PLAYERS, 3f, 0.5f);
            world.playSound(null, at.x, at.y, at.z, SoundEvents.BLOCK_BEACON_POWER_SELECT, SoundCategory.PLAYERS, 3f, 0.6f);
        }
        if (t == spec.igniteTick()) {
            Vec3d at = spec.end();
            world.playSound(null, at.x, at.y + 20, at.z, SoundEvents.ITEM_ELYTRA_FLYING, SoundCategory.PLAYERS, 6f, 0.6f);
            world.playSound(null, at.x, at.y + 20, at.z, SoundEvents.ENTITY_FIREWORK_ROCKET_TWINKLE_FAR, SoundCategory.PLAYERS, 8f, 0.5f);
        }
        if (!detonated && t >= spec.impactTick()) {
            detonated = true;
            Entity owner = ownerUuid != null ? world.getEntity(ownerUuid) : null;
            Impact.detonate(world, this, owner, spec.end(), spec.radius(), strikeType());
        }
        if (t >= spec.impactTick() + AFTERMATH_TICKS || t < -5) {
            discard();
        }
    }

    private void clientEffects(StarSpec spec, int t) {
        World world = getWorld();
        var random = world.getRandom();
        int color = strikeType().color;
        Vector3f rgb = new Vector3f(((color >> 16) & 255) / 255f, ((color >> 8) & 255) / 255f, (color & 255) / 255f);
        // Wind-up: energy spirals into the caster.
        Entity owner = owner();
        if (isLeader() && owner != null && t < strikeType().igniteTick) {
            for (int i = 0; i < 3; i++) {
                double a = t * 0.45 + i * MathHelper.TAU / 3;
                double r = 2.2 - (t % 20) * 0.08;
                double y = owner.getY() + (t % 20) * 0.11;
                world.addImportantParticle(ParticleTypes.END_ROD, true,
                        owner.getX() + Math.cos(a) * r, y, owner.getZ() + Math.sin(a) * r, 0, 0.02, 0);
            }
            world.addImportantParticle(new DustParticleEffect(rgb, 1.6f), true,
                    owner.getX() + random.nextGaussian() * 2.5, owner.getY() + random.nextDouble() * 3,
                    owner.getZ() + random.nextGaussian() * 2.5, 0, 0, 0);
        }
        // Flight: a burning trail of sparks and smoke.
        if (t >= spec.igniteTick() && t < spec.impactTick()) {
            Vec3d prev = spec.positionAt(t - 1);
            Vec3d now = spec.positionAt(t);
            int steps = 10;
            for (int i = 0; i < steps; i++) {
                Vec3d p = prev.lerp(now, i / (double) steps);
                double s = spec.size() * 0.5;
                world.addImportantParticle(ParticleTypes.FIREWORK, true,
                        p.x + random.nextGaussian() * s, p.y + random.nextGaussian() * s, p.z + random.nextGaussian() * s,
                        random.nextGaussian() * 0.05, random.nextGaussian() * 0.05, random.nextGaussian() * 0.05);
                if (i % 2 == 0) {
                    world.addImportantParticle(ParticleTypes.LARGE_SMOKE, true,
                            p.x + random.nextGaussian() * s, p.y + random.nextGaussian() * s, p.z + random.nextGaussian() * s, 0, 0.02, 0);
                    world.addImportantParticle(new DustParticleEffect(rgb, 3f), true,
                            p.x + random.nextGaussian() * s, p.y + random.nextGaussian() * s, p.z + random.nextGaussian() * s, 0, 0, 0);
                }
            }
            world.addImportantParticle(ParticleTypes.FLAME, true, now.x, now.y, now.z,
                    random.nextGaussian() * 0.2, random.nextGaussian() * 0.2, random.nextGaussian() * 0.2);
        }
        // Aftermath: embers raining down into the crater.
        int after = t - spec.impactTick();
        if (after >= 0 && after < AFTERMATH_TICKS) {
            Vec3d c = spec.end();
            double r = spec.radius();
            for (int i = 0; i < 6; i++) {
                world.addImportantParticle(ParticleTypes.LAVA, true,
                        c.x + random.nextGaussian() * r * 0.5, c.y + random.nextDouble() * 2, c.z + random.nextGaussian() * r * 0.5, 0, 0, 0);
                world.addImportantParticle(ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true,
                        c.x + random.nextGaussian() * r * 0.4, c.y + random.nextDouble() * 4, c.z + random.nextGaussian() * r * 0.4,
                        0, 0.08 + random.nextDouble() * 0.05, 0);
            }
        }
    }

    // The flight is scripted, so ignore server position packets entirely.
    @Override
    public void updateTrackedPositionAndAngles(double x, double y, double z, float yaw, float pitch, int steps) {
    }

    @Override
    public boolean shouldRender(double distance) {
        return true;
    }

    @Override
    public boolean damage(DamageSource source, float amount) {
        return false;
    }

    @Override
    public boolean isAttackable() {
        return false;
    }

    @Override
    protected void readCustomDataFromNbt(NbtCompound nbt) {
    }

    @Override
    protected void writeCustomDataToNbt(NbtCompound nbt) {
    }
}
