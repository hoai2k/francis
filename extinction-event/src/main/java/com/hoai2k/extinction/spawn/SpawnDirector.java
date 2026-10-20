package com.hoai2k.extinction.spawn;

import com.hoai2k.extinction.ExtinctionConfig;
import com.hoai2k.extinction.ExtinctionMod;
import com.hoai2k.extinction.Phase;
import com.hoai2k.extinction.world.Atmosphere;
import com.hoai2k.extinction.world.Terrain;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.FluidTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MobSpawnType;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Spawns the creatures from spawns.json, makes animals stampede away from the impact, and starves the doomed. */
public final class SpawnDirector {
    public static final String TAG = "extinction_spawned";

    private SpawnRules rules = SpawnRules.load();
    private final Set<String> warned = new HashSet<>();

    public SpawnRules rules() {
        return rules;
    }

    public SpawnRules reload() {
        rules = SpawnRules.load();
        warned.clear();
        return rules;
    }

    public void tick(ServerLevel level, Phase phase, float progress, BlockPos impact, boolean detonated, long time) {
        if (time % rules.intervalTicks == 0) {
            for (ServerPlayer p : Terrain.players(level)) spawnNear(level, p, phase, rules.maxPerPlayer);
        }
        boolean stampede = (phase == Phase.WARNING && progress > 0.55F) || (phase == Phase.IMPACT && detonated) || phase == Phase.FIRESTORM;
        if (stampede && time % 40 == 0) stampede(level, impact, phase == Phase.WARNING ? 1.25 : 1.7);
        if (ExtinctionConfig.MASS_EXTINCTION.get() && time % 100 == 0) {
            float severity = switch (phase) {
                case WINTER -> 0.6F + progress;
                case RECOVERY -> 1.6F;
                case VOLCANISM -> progress > 0.5F ? 0.3F : 0;
                default -> 0;
            };
            if (severity > 0) dieOff(level, severity);
        }
    }

    /** Natural spawning while no event runs: "before" entries until the impact, "after" entries once it is over. */
    public void natural(ServerLevel level, Phase phase, long time) {
        if (time % rules.naturalIntervalTicks != 0) return;
        for (ServerPlayer p : Terrain.players(level)) {
            if (!p.isSpectator()) spawnNear(level, p, phase, rules.naturalMaxPerPlayer);
        }
    }

    private void spawnNear(ServerLevel level, ServerPlayer p, Phase phase, int cap) {
        RandomSource rnd = level.random;
        List<SpawnRules.Entry> pool = new ArrayList<>();
        int total = 0;
        for (SpawnRules.Entry e : rules.spawns) {
            if (!e.phases.contains(phase)) continue;
            if (e.type() == null) {
                if (warned.add(e.entity.toString())) {
                    ExtinctionMod.LOG.debug("spawns.json: {} is not installed, skipping", e.entity);
                }
                continue;
            }
            pool.add(e);
            total += e.weight;
        }
        if (pool.isEmpty()) return;
        AABB area = p.getBoundingBox().inflate(64);
        if (level.getEntitiesOfClass(LivingEntity.class, area, x -> x.getPersistentData().getBoolean(TAG)).size() >= cap) return;
        int roll = rnd.nextInt(total);
        SpawnRules.Entry pick = pool.get(0);
        for (SpawnRules.Entry e : pool) {
            roll -= e.weight;
            if (roll < 0) {
                pick = e;
                break;
            }
        }
        if (rnd.nextFloat() > pick.chance) return;
        EntityType<?> type = pick.type();
        if (level.getEntities(type, area, Entity::isAlive).size() >= pick.maxNearby) return;
        BlockPos at = findSpot(level, p, pick, rnd);
        if (at == null || !rules.biomeAllowed(pick, level.getBiome(at))) return;
        int n = pick.minGroup + rnd.nextInt(pick.maxGroup - pick.minGroup + 1);
        for (int i = 0; i < n; i++) {
            BlockPos q = i == 0 ? at : at.offset(rnd.nextInt(7) - 3, 0, rnd.nextInt(7) - 3);
            if (pick.env == SpawnRules.Env.LAND) q = new BlockPos(q.getX(), level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, q.getX(), q.getZ()), q.getZ());
            spawn(level, type, pick, q, rnd);
        }
    }

    private BlockPos findSpot(ServerLevel level, ServerPlayer p, SpawnRules.Entry e, RandomSource rnd) {
        for (int attempt = 0; attempt < 6; attempt++) {
            double a = rnd.nextDouble() * Math.PI * 2;
            int d = rules.minDistance + rnd.nextInt(rules.maxDistance - rules.minDistance);
            int x = p.getBlockX() + (int) (Math.cos(a) * d), z = p.getBlockZ() + (int) (Math.sin(a) * d);
            if (!Terrain.loaded(level, x, z)) continue;
            int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
            BlockPos ground = new BlockPos(x, y - 1, z);
            boolean wet = level.getFluidState(ground).is(FluidTags.WATER);
            switch (e.env) {
                case LAND -> {
                    if (!wet && !level.getFluidState(ground).is(FluidTags.LAVA)) return new BlockPos(x, y, z);
                }
                case WATER -> {
                    if (wet && level.getFluidState(ground.below(3)).is(FluidTags.WATER)) return ground.below(2);
                }
                case AIR -> {
                    return new BlockPos(x, Math.min(level.getMaxBuildHeight() - 4, y + 18 + rnd.nextInt(12)), z);
                }
            }
        }
        return null;
    }

    private static void spawn(ServerLevel level, EntityType<?> type, SpawnRules.Entry e, BlockPos at, RandomSource rnd) {
        Entity ent = type.create(level);
        if (ent == null) return;
        ent.moveTo(at.getX() + 0.5, at.getY(), at.getZ() + 0.5, rnd.nextFloat() * 360, 0);
        if (!level.noCollision(ent)) {
            ent.discard();
            return;
        }
        if (ent instanceof Mob mob) {
            mob.finalizeSpawn(level, level.getCurrentDifficultyAt(at), MobSpawnType.EVENT, null, null);
        }
        if (e.nbt != null) {
            UUID id = ent.getUUID();
            CompoundTag tag = ent.saveWithoutId(new CompoundTag());
            tag.merge(e.nbt);
            ent.load(tag);
            ent.setUUID(id);
        }
        ent.getPersistentData().putBoolean(TAG, true);
        if (!e.flee) ent.getPersistentData().putBoolean("extinction_calm", true);
        level.addFreshEntityWithPassengers(ent);
    }

    /** Animals flee from a point (the other catastrophes' centre). */
    public void stampedeFrom(ServerLevel level, BlockPos from, double speed) {
        stampede(level, from, speed);
    }

    public void dieOffNow(ServerLevel level, float severity) {
        dieOff(level, severity);
    }

    /** Animals sense it coming and run for their lives, away from the impact. */
    private static void stampede(ServerLevel level, BlockPos impact, double speed) {
        for (ServerPlayer p : Terrain.players(level)) {
            for (PathfinderMob m : level.getEntitiesOfClass(PathfinderMob.class, p.getBoundingBox().inflate(96),
                    m -> m instanceof Animal && !(m instanceof Enemy) && !m.getPersistentData().getBoolean("extinction_calm") && !m.isLeashed())) {
                if (!m.getNavigation().isDone() && level.random.nextFloat() < 0.7F) continue;
                Vec3 away = new Vec3(m.getX() - impact.getX(), 0, m.getZ() - impact.getZ());
                away = away.lengthSqr() < 1 ? new Vec3(1, 0, 0) : away.normalize();
                double side = (level.random.nextDouble() - 0.5) * 0.6;
                Vec3 dir = new Vec3(away.x - away.z * side, 0, away.z + away.x * side).normalize().scale(24);
                m.getNavigation().moveTo(m.getX() + dir.x, m.getY(), m.getZ() + dir.z, speed);
            }
        }
    }

    private void dieOff(ServerLevel level, float severity) {
        Set<Integer> seen = new HashSet<>();
        for (ServerPlayer p : Terrain.players(level)) {
            for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, p.getBoundingBox().inflate(128), e -> !(e instanceof ServerPlayer))) {
                if (!seen.add(e.getId()) || !rules.isExtinct(e.getType())) continue;
                // Named pets hold out a little longer, but not forever.
                Atmosphere.starve(level, e, e.hasCustomName() ? severity * 0.5F : severity);
            }
        }
    }
}
