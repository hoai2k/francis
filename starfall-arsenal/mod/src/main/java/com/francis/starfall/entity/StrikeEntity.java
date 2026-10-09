package com.francis.starfall.entity;

import com.francis.starfall.strike.Crater;
import com.francis.starfall.strike.Impact;
import com.francis.starfall.strike.StrikePlan;
import com.francis.starfall.strike.StrikeType;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import net.minecraft.block.BlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.FallingBlockEntity;
import net.minecraft.entity.ItemEntity;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.damage.DamageSource;
import net.minecraft.entity.data.DataTracker;
import net.minecraft.entity.data.TrackedData;
import net.minecraft.entity.data.TrackedDataHandlerRegistry;
import net.minecraft.particle.DustParticleEffect;
import net.minecraft.particle.ParticleTypes;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvent;
import net.minecraft.sound.SoundEvents;
import net.minecraft.storage.ReadView;
import net.minecraft.storage.WriteView;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.util.math.random.Random;
import net.minecraft.world.Heightmap;
import net.minecraft.world.World;
import org.jetbrains.annotations.Nullable;
import org.joml.Vector3f;
import org.joml.Vector3fc;

/**
 * One strike in progress. It sits at the target (always in loaded, ticking
 * chunks) and runs that weapon's program: the server side does the damage and
 * terrain, the client side spawns particles, and the renderer draws the stars
 * and beams from the shared {@link StrikePlan}.
 */
public class StrikeEntity extends Entity {
    private static final TrackedData<Integer> TYPE = DataTracker.registerData(StrikeEntity.class, TrackedDataHandlerRegistry.INTEGER);
    private static final TrackedData<Vector3fc> ORIGIN = DataTracker.registerData(StrikeEntity.class, TrackedDataHandlerRegistry.VECTOR_3F);
    private static final TrackedData<Long> SPAWN_TIME = DataTracker.registerData(StrikeEntity.class, TrackedDataHandlerRegistry.LONG);
    private static final TrackedData<Integer> OWNER = DataTracker.registerData(StrikeEntity.class, TrackedDataHandlerRegistry.INTEGER);
    /** Comet Dash: tick the caster hit the ground (-1 until then) and where. */
    private static final TrackedData<Integer> SLAM_TICK = DataTracker.registerData(StrikeEntity.class, TrackedDataHandlerRegistry.INTEGER);
    private static final TrackedData<Vector3fc> SLAM_POS = DataTracker.registerData(StrikeEntity.class, TrackedDataHandlerRegistry.VECTOR_3F);

    @Nullable private UUID ownerUuid;
    @Nullable private StrikePlan cachedPlan;
    private final Set<UUID> dashHits = new HashSet<>();
    private final List<FallingBlockEntity> debris = new ArrayList<>();

    public StrikeEntity(EntityType<?> type, World world) {
        super(type, world);
        this.noClip = true;
    }

    public void setup(StrikeType type, Vec3d origin, Vec3d target, Entity owner) {
        setPosition(target);
        dataTracker.set(TYPE, type.ordinal());
        dataTracker.set(ORIGIN, origin.toVector3f());
        dataTracker.set(SPAWN_TIME, getEntityWorld().getTime());
        dataTracker.set(OWNER, owner.getId());
        ownerUuid = owner.getUuid();
    }

    @Override
    protected void initDataTracker(DataTracker.Builder builder) {
        builder.add(TYPE, 0);
        builder.add(ORIGIN, new Vector3f());
        builder.add(SPAWN_TIME, 0L);
        builder.add(OWNER, -1);
        builder.add(SLAM_TICK, -1);
        builder.add(SLAM_POS, new Vector3f());
    }

    @Override
    public void onTrackedDataSet(TrackedData<?> data) {
        super.onTrackedDataSet(data);
        cachedPlan = null;
    }

    public StrikeType strikeType() {
        return StrikeType.byId(dataTracker.get(TYPE));
    }

    public StrikePlan plan() {
        if (cachedPlan == null) {
            cachedPlan = new StrikePlan(strikeType(), new Vec3d(dataTracker.get(ORIGIN)), getEntityPos());
        }
        return cachedPlan;
    }

    @Nullable
    public Entity owner() {
        return getEntityWorld().getEntityById(dataTracker.get(OWNER));
    }

    public int slamTick() {
        return dataTracker.get(SLAM_TICK);
    }

    public Vec3d slamPos() {
        return new Vec3d(dataTracker.get(SLAM_POS));
    }

    /** Ticks since the weapon was used, interpolated for rendering. */
    public float strikeTime(float tickDelta) {
        return (float) (getEntityWorld().getTime() - dataTracker.get(SPAWN_TIME)) + tickDelta;
    }

    public static double groundY(World world, double x, double z) {
        return world.getTopY(Heightmap.Type.MOTION_BLOCKING_NO_LEAVES, MathHelper.floor(x), MathHelper.floor(z));
    }

    @Override
    public void tick() {
        super.tick();
        int t = (int) (getEntityWorld().getTime() - dataTracker.get(SPAWN_TIME));
        if (getEntityWorld().isClient()) {
            clientEffects(t);
            return;
        }
        ServerWorld world = (ServerWorld) getEntityWorld();
        Entity owner = ownerUuid != null ? world.getEntity(ownerUuid) : null;
        switch (strikeType()) {
            case ORBITAL_LANCE -> tickLance(world, owner, t);
            case COMET_DASH -> tickDash(world, owner, t);
            case CONSTELLATION -> tickConstellation(world, owner, t);
            case SUPERNOVA -> tickSupernova(world, owner, t);
        }
        if (t >= strikeType().duration || t < -5) {
            debris.forEach(Entity::discard);
            discard();
        }
    }

    private void sound(ServerWorld world, Vec3d at, SoundEvent sound, float volume, float pitch) {
        world.playSound(null, at.x, at.y, at.z, sound, SoundCategory.PLAYERS, volume, pitch);
    }

    // ----------------------------------------------------- Orbital Lance ---

    private void tickLance(ServerWorld world, @Nullable Entity owner, int t) {
        StrikePlan plan = plan();
        if (t == StrikePlan.LANCE_FIRE - 25) {
            sound(world, plan.target, SoundEvents.BLOCK_BEACON_POWER_SELECT, 4f, 0.5f);
        }
        if (t == StrikePlan.LANCE_FIRE) {
            sound(world, plan.target, SoundEvents.ENTITY_WARDEN_SONIC_BOOM, 8f, 0.6f);
            sound(world, plan.target, SoundEvents.ENTITY_LIGHTNING_BOLT_THUNDER, 8f, 1.4f);
        }
        if (plan.lanceFiring(t)) {
            Vec3d p = plan.lancePoint(t);
            Vec3d ground = new Vec3d(p.x, groundY(world, p.x, p.z), p.z);
            if (t % 2 == 0 && Impact.terrainDamage(world)) {
                Crater.start(world, Crater.Shape.BOWL, BlockPos.ofFloored(ground), (float) StrikePlan.LANCE_WIDTH, world.getRandom(), false);
            }
            if (t % 4 == 0) {
                for (Entity e : world.getOtherEntities(this, new Box(ground, ground).expand(4.5, 6, 4.5))) {
                    if (e == owner || e instanceof ItemEntity) continue;
                    e.damage(world, world.getDamageSources().explosion(this, owner), 7f);
                    e.setOnFireForTicks(100);
                    e.addVelocity(0, 0.5, 0);
                    e.velocityDirty = true;
                }
                sound(world, ground, SoundEvents.ENTITY_GENERIC_EXPLODE.value(), 3f, 1.6f);
            }
            Impact.burst(world, ParticleTypes.LAVA, ground, 4, 1.2, 0);
            Impact.burst(world, ParticleTypes.FLAME, ground.add(0, 0.5, 0), 10, 1.0, 0.15);
            Impact.burst(world, ParticleTypes.LARGE_SMOKE, ground.add(0, 1, 0), 3, 1.5, 0.05);
        }
        if (t == StrikePlan.LANCE_END) {
            Vec3d p = plan.lancePoint(t);
            Vec3d ground = new Vec3d(p.x, groundY(world, p.x, p.z), p.z);
            Impact.detonate(world, this, owner, ground, 6.5f, strikeType());
        }
    }

    // ---------------------------------------------------------- Comet Dash ---

    private void tickDash(ServerWorld world, @Nullable Entity owner, int t) {
        if (owner == null) return;
        if (t == StrikePlan.DASH_START) {
            sound(world, owner.getEntityPos(), SoundEvents.ITEM_TRIDENT_RIPTIDE_3.value(), 3f, 1.0f);
            sound(world, owner.getEntityPos(), SoundEvents.ENTITY_BREEZE_WIND_BURST.value(), 3f, 0.8f);
        }
        boolean slammed = slamTick() >= 0;
        if (!slammed && t >= StrikePlan.DASH_START) {
            // Everything the comet passes through takes a hit and is thrown aside.
            for (Entity e : world.getOtherEntities(owner, owner.getBoundingBox().expand(2.5))) {
                if (!(e instanceof LivingEntity) || e == this || !dashHits.add(e.getUuid())) continue;
                e.damage(world, world.getDamageSources().indirectMagic(this, owner), 14f);
                Vec3d away = e.getEntityPos().subtract(owner.getEntityPos()).multiply(1, 0, 1);
                away = away.lengthSquared() < 1e-4 ? plan().side : away.normalize();
                e.addVelocity(away.x * 1.4, 0.8, away.z * 1.4);
                e.velocityDirty = true;
                sound(world, e.getEntityPos(), SoundEvents.ENTITY_PLAYER_ATTACK_CRIT, 2f, 0.8f);
            }
            boolean landed = t > StrikePlan.DASH_LEAP + 4 && owner.isOnGround();
            if (landed || t >= StrikePlan.DASH_SLAM + 30) {
                Vec3d at = owner.getEntityPos();
                dataTracker.set(SLAM_POS, at.toVector3f());
                dataTracker.set(SLAM_TICK, t);
                Impact.detonate(world, this, owner, at, 5.5f, strikeType());
            }
        }
    }

    // ------------------------------------------------------- Constellation ---

    private void tickConstellation(ServerWorld world, @Nullable Entity owner, int t) {
        StrikePlan plan = plan();
        for (int i = 0; i < StrikePlan.constStars(); i++) {
            if (t == plan.constArrive(i)) {
                sound(world, plan.constHome(i), SoundEvents.BLOCK_AMETHYST_BLOCK_CHIME, 6f, 0.6f + i * 0.12f);
            }
            if (t == StrikePlan.CONST_LINES + i * StrikePlan.CONST_LINE_STEP && i < StrikePlan.constStars() - 1) {
                sound(world, plan.constHome(i), SoundEvents.BLOCK_BEACON_POWER_SELECT, 4f, 1.0f + i * 0.1f);
            }
        }
        if (t == StrikePlan.CONST_LINES + 40) {
            sound(world, plan.target, SoundEvents.BLOCK_PORTAL_TRIGGER, 4f, 1.4f);
        }
        if (t >= StrikePlan.CONST_LINES + 40 && t < StrikePlan.CONST_CONVERGE) {
            // Gravity well: everything near the constellation is dragged in and lifted.
            Vec3d eye = plan.target.add(0, 4, 0);
            pull(world, owner, eye, StrikePlan.CONST_PULL_RADIUS, 0.09, t % 10 == 0 ? 2f : 0f);
        }
        if (t == StrikePlan.CONST_CONVERGE) {
            sound(world, plan.target, SoundEvents.ENTITY_ILLUSIONER_CAST_SPELL, 6f, 0.5f);
        }
        if (t == StrikePlan.CONST_IMPLODE) {
            Impact.detonate(world, this, owner, plan.target, (float) StrikePlan.CONST_BLAST, strikeType());
        }
    }

    // ----------------------------------------------------------- Supernova ---

    private void tickSupernova(ServerWorld world, @Nullable Entity owner, int t) {
        StrikePlan plan = plan();
        Vec3d center = plan.novaCenter();
        if (t == StrikePlan.NOVA_APPEAR - 20) {
            sound(world, center, SoundEvents.ENTITY_WARDEN_SONIC_CHARGE, 6f, 0.5f);
        }
        if (t == StrikePlan.NOVA_APPEAR) {
            sound(world, center, SoundEvents.BLOCK_END_PORTAL_SPAWN, 6f, 0.6f);
        }
        if (plan.novaPulling(t)) {
            double strength = 0.03 + 0.09 * StrikePlan.progress(t, StrikePlan.NOVA_APPEAR, StrikePlan.NOVA_COLLAPSE);
            pull(world, owner, center, StrikePlan.NOVA_PULL_RADIUS, strength, t % 10 == 0 ? 2f : 0f);
            if (t % 20 == 0) sound(world, center, SoundEvents.BLOCK_BEACON_AMBIENT, 6f, 0.5f);
        }
        // The black hole tears the ground apart and swallows it.
        if (t >= StrikePlan.NOVA_APPEAR + 10 && t < StrikePlan.NOVA_COLLAPSE && Impact.terrainDamage(world) && debris.size() < 120) {
            Random random = world.getRandom();
            for (int i = 0; i < 3; i++) {
                double a = random.nextDouble() * MathHelper.TAU;
                double r = Math.sqrt(random.nextDouble()) * 14;
                double x = plan.target.x + Math.cos(a) * r, z = plan.target.z + Math.sin(a) * r;
                BlockPos pos = BlockPos.ofFloored(x, groundY(world, x, z) - 1, z);
                BlockState state = world.getBlockState(pos);
                if (state.isAir() || !state.getFluidState().isEmpty() || world.getBlockEntity(pos) != null) continue;
                float hardness = state.getHardness(world, pos);
                if (hardness < 0 || hardness > 50) continue;
                FallingBlockEntity block = FallingBlockEntity.spawnFromBlock(world, pos, state);
                block.dropItem = false;
                block.setDestroyedOnLanding();
                block.setNoGravity(true);
                debris.add(block);
            }
        }
        debris.removeIf(block -> {
            if (block.isRemoved()) return true;
            Vec3d to = center.subtract(block.getEntityPos());
            double dist = to.length();
            if (dist < 2.2 || t >= StrikePlan.NOVA) {
                block.discard();
                return true;
            }
            // Spiral inwards like an accretion disc.
            Vec3d dir = to.multiply(1 / dist);
            Vec3d swirl = dir.crossProduct(new Vec3d(0, 1, 0)).multiply(0.35);
            Vec3d v = dir.multiply(Math.min(1.1, 0.2 + 6 / dist)).add(swirl).add(0, 0.05, 0);
            block.setVelocity(v.x, v.y, v.z);
            block.velocityDirty = true;
            return false;
        });
        if (t == StrikePlan.NOVA_COLLAPSE) {
            sound(world, center, SoundEvents.BLOCK_RESPAWN_ANCHOR_DEPLETE.value(), 8f, 0.5f);
        }
        if (t == StrikePlan.NOVA) {
            if (Impact.terrainDamage(world)) {
                Crater.start(world, Crater.Shape.SPHERE, BlockPos.ofFloored(center), (float) StrikePlan.NOVA_RADIUS, world.getRandom());
            }
            Impact.detonate(world, this, owner, center, 17f, strikeType(), false);
        }
    }

    private void pull(ServerWorld world, @Nullable Entity owner, Vec3d to, double radius, double strength, float damage) {
        for (Entity e : world.getOtherEntities(this, new Box(to, to).expand(radius))) {
            if (e == owner || e instanceof FallingBlockEntity || e.isSpectator()) continue;
            if (!(e instanceof LivingEntity) && !(e instanceof ItemEntity)) continue;
            Vec3d d = to.subtract(e.getEntityPos());
            double dist = d.length();
            if (dist > radius || dist < 0.5) continue;
            Vec3d v = d.multiply(strength / dist).add(0, 0.02, 0);
            e.addVelocity(v.x, v.y, v.z);
            e.velocityDirty = true;
            if (damage > 0 && e instanceof LivingEntity) {
                e.damage(world, world.getDamageSources().indirectMagic(this, owner), damage);
            }
        }
    }

    // ----------------------------------------------------- client particles ---

    private void clientEffects(int t) {
        World world = getEntityWorld();
        Random random = world.getRandom();
        StrikePlan plan = plan();
        int color = strikeType().color;
        Entity owner = owner();
        switch (strikeType()) {
            case ORBITAL_LANCE -> {
                if (plan.lanceFiring(t)) {
                    Vec3d p = plan.lancePoint(t);
                    double gy = groundY(world, p.x, p.z);
                    for (int i = 0; i < 6; i++) {
                        world.addImportantParticleClient(ParticleTypes.END_ROD, true, p.x, gy + 0.5, p.z,
                                random.nextGaussian() * 0.4, 0.3 + random.nextDouble() * 0.6, random.nextGaussian() * 0.4);
                    }
                    world.addImportantParticleClient(ParticleTypes.CAMPFIRE_COSY_SMOKE, true, p.x, gy + 1, p.z, 0, 0.12, 0);
                }
            }
            case COMET_DASH -> {
                if (owner != null && t >= StrikePlan.DASH_START && slamTick() < 0) {
                    for (int i = 0; i < 5; i++) {
                        world.addImportantParticleClient(i % 2 == 0 ? ParticleTypes.FIREWORK : new DustParticleEffect(color, 2f), true,
                                owner.getX() + random.nextGaussian() * 0.4, owner.getY() + 0.3 + random.nextDouble() * 1.4,
                                owner.getZ() + random.nextGaussian() * 0.4, 0, 0.02, 0);
                    }
                }
            }
            case CONSTELLATION -> {
                if (t >= StrikePlan.CONST_LINES + 40 && t < StrikePlan.CONST_CONVERGE) {
                    for (int i = 0; i < 6; i++) {
                        double a = random.nextDouble() * MathHelper.TAU;
                        double r = 6 + random.nextDouble() * StrikePlan.CONST_PULL_RADIUS;
                        Vec3d p = plan.target.add(Math.cos(a) * r, 0.5 + random.nextDouble() * 4, Math.sin(a) * r);
                        Vec3d v = plan.target.add(0, 4, 0).subtract(p).multiply(0.06);
                        world.addImportantParticleClient(ParticleTypes.END_ROD, true, p.x, p.y, p.z, v.x, v.y, v.z);
                    }
                }
            }
            case SUPERNOVA -> {
                if (plan.novaPulling(t)) {
                    Vec3d c = plan.novaCenter();
                    for (int i = 0; i < 10; i++) {
                        double a = random.nextDouble() * MathHelper.TAU;
                        double r = 8 + random.nextDouble() * 18;
                        Vec3d p = c.add(Math.cos(a) * r, (random.nextDouble() - 0.5) * 6, Math.sin(a) * r);
                        Vec3d v = c.subtract(p).multiply(0.08);
                        world.addImportantParticleClient(i % 3 == 0 ? ParticleTypes.FLAME : ParticleTypes.REVERSE_PORTAL, true,
                                p.x, p.y, p.z, v.x, v.y, v.z);
                    }
                }
            }
        }
    }

    @Override
    public boolean shouldRender(double distance) {
        return true;
    }

    @Override
    public boolean damage(ServerWorld world, DamageSource source, float amount) {
        return false;
    }

    @Override
    public boolean isAttackable() {
        return false;
    }

    @Override
    protected void readCustomData(ReadView view) {
    }

    @Override
    protected void writeCustomData(WriteView view) {
    }
}
