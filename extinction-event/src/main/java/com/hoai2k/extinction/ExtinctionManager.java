package com.hoai2k.extinction;

import com.hoai2k.extinction.net.FxMsg;
import com.hoai2k.extinction.net.Net;
import com.hoai2k.extinction.net.StateMsg;
import com.hoai2k.extinction.spawn.SpawnDirector;
import com.hoai2k.extinction.spawn.SpawnRules;
import com.hoai2k.extinction.world.Atmosphere;
import com.hoai2k.extinction.world.BiomeShifter;
import com.hoai2k.extinction.world.BlockQueue;
import com.hoai2k.extinction.world.ChunkSweep;
import com.hoai2k.extinction.world.Crater;
import com.hoai2k.extinction.world.Earthquake;
import com.hoai2k.extinction.world.Firestorm;
import com.hoai2k.extinction.world.FossilLayers;
import com.hoai2k.extinction.world.Shockwave;
import com.hoai2k.extinction.world.Terrain;
import com.hoai2k.extinction.world.Tsunami;
import com.hoai2k.extinction.world.Volcanoes;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.biome.Biome;
import net.minecraftforge.registries.ForgeRegistries;

import java.util.ArrayList;
import java.util.List;

/** Runs the extinction timeline on the server, one tick at a time. */
public final class ExtinctionManager {
    private static ExtinctionManager instance;

    private final MinecraftServer server;
    private final BlockQueue queue = new BlockQueue();
    private final Shockwave shockwave = new Shockwave();
    private final Tsunami tsunami = new Tsunami();
    private final SpawnDirector spawns = new SpawnDirector();
    private final ChunkSweep biomeSweep = new ChunkSweep();
    private final ChunkSweep fossilSweep = new ChunkSweep();
    private final BiomeShifter biomes = new BiomeShifter();
    private boolean resumed;

    private ExtinctionManager(MinecraftServer server) {
        this.server = server;
    }

    public static ExtinctionManager get() {
        return instance;
    }

    static void open(MinecraftServer server) {
        instance = new ExtinctionManager(server);
    }

    static void close() {
        instance = null;
    }

    public ServerLevel level() {
        return server.overworld();
    }

    public ExtinctionData data() {
        return ExtinctionData.get(level());
    }

    public SpawnRules rules() {
        return spawns.rules();
    }

    public SpawnRules reloadRules() {
        return spawns.reload();
    }

    // ---------------------------------------------------------------- control

    /** Starts the event with the asteroid aimed at target (only x and z are used). */
    public void start(MinecraftServer server, BlockPos target) {
        ExtinctionData d = data();
        d.reset();
        clearRuntime();
        d.impact = new BlockPos(target.getX(), level().getSeaLevel(), target.getZ());
        d.approachYaw = level().random.nextFloat() * 360F;
        enter(d, Phase.WARNING);
        ExtinctionMod.LOG.info("Extinction event started, impact at {} {}", target.getX(), target.getZ());
    }

    /** Starts the event with the asteroid landing impactDistance blocks from the first player. */
    public boolean startNearPlayers() {
        List<ServerPlayer> players = Terrain.players(level());
        if (players.isEmpty()) return false;
        ServerPlayer p = players.get(0);
        double a = level().random.nextDouble() * Math.PI * 2;
        int dist = ExtinctionConfig.IMPACT_DISTANCE.get();
        start(server, BlockPos.containing(p.getX() + Math.cos(a) * dist, p.getY(), p.getZ() + Math.sin(a) * dist));
        return true;
    }

    public void stop() {
        ExtinctionData d = data();
        tsunami.drain(level(), true);
        d.reset();
        clearRuntime();
        level().setWeatherParameters(6000, 0, false, false);
        syncAll(d);
    }

    public void skip() {
        ExtinctionData d = data();
        if (d.phase.running()) advance(d);
    }

    public void jumpTo(Phase phase) {
        ExtinctionData d = data();
        if (!d.phase.running()) {
            if (!startNearPlayers()) start(server, level().getSharedSpawnPos());
        }
        if (phase.ordinal() > Phase.IMPACT.ordinal() && !d.detonated) detonate(d);
        enter(d, phase);
    }

    private void clearRuntime() {
        queue.clear();
        shockwave.reset();
        tsunami.reset();
        biomeSweep.reset();
        fossilSweep.reset();
    }

    public String status() {
        ExtinctionData d = data();
        if (!d.phase.running()) return "Phase: " + d.phase.id() + ". " + spawns.rules().summary();
        int left = Math.max(0, d.phase.lengthTicks() - d.phaseTick) / 20;
        return "Phase: " + d.phase.id() + " (" + left + "s left), impact at " + d.impact.getX() + " " + d.impact.getZ()
                + (d.detonated ? ", crater " + (d.craterDone ? "done" : "forming (" + queue.size() + " jobs)") : "")
                + ", volcanoes " + d.volcanoes.stream().map(v -> v.base.getX() + " " + v.base.getZ()).toList()
                + ", fossils pending " + d.deaths.size() + ". " + spawns.rules().summary();
    }

    // ---------------------------------------------------------------- hooks

    public void onDeath(LivingEntity e) {
        ExtinctionData d = data();
        if (d.phase.ordinal() < Phase.IMPACT.ordinal() || !d.phase.running()) return;
        if (e.level() != level() || d.deaths.size() >= 256 || !spawns.rules().isExtinct(e.getType())) return;
        d.deaths.add(new ExtinctionData.Death(e.blockPosition(), String.valueOf(ForgeRegistries.ENTITY_TYPES.getKey(e.getType()))));
        d.setDirty();
    }

    /** After the winter, extinct creatures no longer spawn on their own (science can still bring them back). */
    public boolean blocksNaturalSpawn(EntityType<?> type) {
        ExtinctionData d = data();
        return ExtinctionConfig.MASS_EXTINCTION.get() && d.phase.ordinal() >= Phase.WINTER.ordinal() && spawns.rules().isExtinct(type);
    }

    public void syncTo(ServerPlayer p) {
        Net.to(p, state(data()));
    }

    // ---------------------------------------------------------------- tick

    void tick() {
        ServerLevel level = level();
        ExtinctionData d = data();
        if (!resumed) {
            resumed = true;
            if (d.detonated && !d.craterDone && ExtinctionConfig.DESTROY_TERRAIN.get()) {
                Crater.enqueue(queue, d, () -> craterDone(d));
            }
        }
        long time = level.getGameTime();
        int autoDay = ExtinctionConfig.AUTO_START_DAY.get();
        if (autoDay >= 0 && d.phase == Phase.DORMANT && !d.autoStarted && level.getDayTime() / 24000L >= autoDay) {
            if (startNearPlayers()) {
                d.autoStarted = true;
                d.setDirty();
            }
        }
        if (!d.phase.running()) return;

        d.phaseTick++;
        d.setDirty();
        Phase phase = d.phase;
        float p = Math.min(1F, d.phaseTick / (float) Math.max(1, phase.lengthTicks()));

        if (phase == Phase.IMPACT && !d.detonated && d.phaseTick >= Phase.DESCENT_TICKS) detonate(d);
        if (d.detonated) {
            d.sinceImpact++;
            shockwave.tick(level, d.impact, d.sinceImpact);
            if (d.sinceImpact == 40) title("impact");
        }

        Earthquake.tick(level, queue, quake(d, p), time);
        if (time % 100 == 0) weather(level, phase, p);

        switch (phase) {
            case WARNING -> narrate(d, p);
            case FIRESTORM -> {
                tsunami.tick(level, d.impact, d.phaseTick);
                tsunami.drain(level, false);
                Firestorm.tick(level, d.impact, 1F - 0.6F * p, d.phaseTick);
            }
            case VOLCANISM -> {
                tsunami.drain(level, true);
                Volcanoes.tick(level, d, queue, d.phaseTick);
                Atmosphere.ashFall(level, 0.3F + 0.5F * p);
                if (p > 0.15F) Atmosphere.acidRain(level, time);
            }
            case WINTER -> {
                Atmosphere.winter(level, time, Math.min(1F, 0.45F + p));
                Atmosphere.ashFall(level, 0.15F * (1 - p));
            }
            case RECOVERY -> {
                Atmosphere.recovery(level, time, p);
                if (ExtinctionConfig.DESTROY_TERRAIN.get()) {
                    fossilSweep.tick(level, "fossils", ExtinctionConfig.EFFECT_RADIUS.get() / 16 + 1, 2,
                            (lvl, cp) -> FossilLayers.layChunk(lvl, cp, d, spawns.rules()));
                }
            }
            default -> {}
        }

        spawns.tick(level, phase, p, d.impact, d.detonated, time);
        shiftBiomes(level, d, p);
        queue.tick(level, ExtinctionConfig.BLOCK_BUDGET.get());
        biomes.flush(level);

        if (d.phaseTick >= phase.lengthTicks()) advance(d);
        if (time % 20 == 0) syncAll(d);
    }

    private float quake(ExtinctionData d, float p) {
        return switch (d.phase) {
            case WARNING -> p > 0.6F ? 0.1F + (p - 0.6F) * 0.4F : 0;
            case IMPACT -> d.detonated ? Math.max(0.3F, 1F - d.sinceImpact / 500F) : 0.1F + 0.3F * d.phaseTick / Phase.DESCENT_TICKS;
            case FIRESTORM -> 0.25F;
            case VOLCANISM -> 0.35F + 0.3F * (float) Math.max(0, Math.sin(d.phaseTick / 90.0));
            case WINTER -> 0.05F;
            default -> 0;
        };
    }

    private static void weather(ServerLevel level, Phase phase, float p) {
        switch (phase) {
            case IMPACT, FIRESTORM -> level.setWeatherParameters(6000, 0, false, false);
            case VOLCANISM -> level.setWeatherParameters(0, 6000, true, p > 0.2F);
            case WINTER -> level.setWeatherParameters(0, 6000, true, false);
            case RECOVERY -> {
                if (p < 0.5F) level.setWeatherParameters(0, 6000, true, false);
                else level.setWeatherParameters(6000, 0, false, false);
            }
            default -> {}
        }
    }

    private void shiftBiomes(ServerLevel level, ExtinctionData d, float p) {
        if (!ExtinctionConfig.TRANSFORM_BIOMES.get()) return;
        ResourceKey<Biome> target = switch (d.phase) {
            case IMPACT -> d.detonated && d.sinceImpact > 60 ? BiomeShifter.SCORCHED : null;
            case FIRESTORM -> BiomeShifter.SCORCHED;
            case VOLCANISM -> BiomeShifter.ASH;
            case WINTER -> BiomeShifter.FROZEN;
            case RECOVERY -> p > 0.2F ? BiomeShifter.FERN_SPIKE : null;
            default -> null;
        };
        if (target == null) return;
        double craterR = ExtinctionConfig.CRATER_RADIUS.get() * 1.2;
        biomeSweep.tick(level, target.location().toString(), ExtinctionConfig.EFFECT_RADIUS.get() / 16 + 1, 4,
                (lvl, cp) -> biomes.shift(lvl, cp, target, d.impact, craterR));
    }

    // ---------------------------------------------------------------- phases

    private void advance(ExtinctionData d) {
        if (d.phase == Phase.IMPACT && !d.detonated) detonate(d);
        enter(d, d.phase.next());
    }

    private void enter(ExtinctionData d, Phase phase) {
        d.phase = phase;
        d.phaseTick = 0;
        d.setDirty();
        ServerLevel level = level();
        switch (phase) {
            case WARNING -> title("warning");
            case FIRESTORM -> {
                tsunami.reset();
                title("firestorm");
            }
            case VOLCANISM -> {
                if (d.volcanoes.isEmpty()) Volcanoes.create(level, d);
                title("volcanism");
            }
            case WINTER -> title("winter");
            case RECOVERY -> title("recovery");
            case OVER -> {
                tsunami.drain(level, true);
                if (ExtinctionConfig.DESTROY_TERRAIN.get() && !d.fossilsLaid) {
                    for (ExtinctionData.Death death : new ArrayList<>(d.deaths)) FossilLayers.bury(level, death, spawns.rules(), level.random);
                    d.deaths.clear();
                    d.fossilsLaid = true;
                }
                level.setWeatherParameters(12000, 0, false, false);
                title("over");
            }
            default -> {}
        }
        syncAll(d);
    }

    private void detonate(ExtinctionData d) {
        ServerLevel level = level();
        BlockPos c = d.impact;
        level.getChunk(c.getX() >> 4, c.getZ() >> 4);
        int ground = Terrain.groundY(level, c.getX(), c.getZ());
        d.impactGroundY = ground;
        d.impact = new BlockPos(c.getX(), ground, c.getZ());
        d.detonated = true;
        d.sinceImpact = 0;
        d.setDirty();
        shockwave.reset();
        BlockPos at = d.impact;
        for (ServerPlayer p : level.players()) {
            Net.to(p, FxMsg.at(FxMsg.FLASH, at.getX() + 0.5, at.getY(), at.getZ() + 0.5, 1));
            level.sendParticles(p, ParticleTypes.EXPLOSION_EMITTER, true, at.getX() + 0.5, at.getY() + 4, at.getZ() + 0.5, 30, 20, 10, 20, 0);
            level.sendParticles(p, ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true, at.getX() + 0.5, at.getY() + 10, at.getZ() + 0.5, 200, 25, 30, 25, 0.2);
        }
        double vapor = ExtinctionConfig.CRATER_RADIUS.get() * 1.2;
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, new net.minecraft.world.phys.AABB(at).inflate(vapor, 128, vapor))) {
            if (e instanceof ServerPlayer sp && (sp.isCreative() || sp.isSpectator() || !ExtinctionConfig.PLAYER_HAZARDS.get())) continue;
            if (Terrain.distXZ(at, e.getX(), e.getZ()) < vapor) e.hurt(DamageTypes.source(level, DamageTypes.IMPACT), 10000F);
        }
        if (ExtinctionConfig.DESTROY_TERRAIN.get()) Crater.enqueue(queue, d, () -> craterDone(d));
        syncAll(d);
    }

    private void craterDone(ExtinctionData d) {
        d.craterDone = true;
        d.setDirty();
        if (!ExtinctionConfig.TRANSFORM_BIOMES.get()) return;
        int r = (int) (ExtinctionConfig.CRATER_RADIUS.get() * 1.45);
        ChunkPos min = new ChunkPos(d.impact.offset(-r, 0, -r)), max = new ChunkPos(d.impact.offset(r, 0, r));
        double craterR = ExtinctionConfig.CRATER_RADIUS.get() * 1.2;
        for (int cx = min.x; cx <= max.x; cx++)
            for (int cz = min.z; cz <= max.z; cz++) {
                ChunkPos cp = new ChunkPos(cx, cz);
                queue.add(level -> {
                    biomes.shift(level, cp, BiomeShifter.SCORCHED, d.impact, craterR);
                    return 300;
                });
            }
    }

    // ---------------------------------------------------------------- messages

    private void title(String key) {
        FxMsg msg = FxMsg.title("extinction.title." + key, "extinction.subtitle." + key, key.equals("impact") ? 7 : 6);
        for (ServerPlayer p : server.getPlayerList().getPlayers()) {
            if (Net.CHANNEL.isRemotePresent(p.connection.connection)) {
                Net.to(p, msg);
                continue;
            }
            // Players without the mod installed still get the story in chat.
            p.sendSystemMessage(Component.translatable("extinction.title." + key).withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD));
        }
    }

    private void narrate(ExtinctionData d, float p) {
        int line = -1;
        int len = Phase.WARNING.lengthTicks();
        if (d.phaseTick == 20 * 8) line = 0;
        else if (d.phaseTick == (int) (len * 0.35F)) line = 1;
        else if (d.phaseTick == (int) (len * 0.6F)) line = 2;
        else if (d.phaseTick == (int) (len * 0.85F)) line = 3;
        if (line < 0) return;
        Component msg = Component.translatable("extinction.narration.warning." + line).withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC);
        for (ServerPlayer pl : level().players()) pl.sendSystemMessage(msg);
    }

    private StateMsg state(ExtinctionData d) {
        return new StateMsg(d.phase.ordinal(), d.phaseTick, d.phase.lengthTicks(), d.impact,
                d.impactGroundY == Integer.MIN_VALUE ? d.impact.getY() : d.impactGroundY, d.approachYaw,
                d.detonated, d.sinceImpact, ExtinctionConfig.CRATER_RADIUS.get(), ExtinctionConfig.SHOCKWAVE_RADIUS.get(),
                d.volcanoes.stream().map(v -> ExtinctionConfig.DESTROY_TERRAIN.get() ? v.vent() : v.base.above(v.height)).toList());
    }

    private void syncAll(ExtinctionData d) {
        StateMsg msg = state(d);
        for (ServerPlayer p : server.getPlayerList().getPlayers()) Net.to(p, msg);
    }
}
