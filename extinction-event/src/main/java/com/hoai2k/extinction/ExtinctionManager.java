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
import com.hoai2k.extinction.world.Markers;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.event.Act;
import com.hoai2k.extinction.event.Catastrophe;
import com.hoai2k.extinction.event.Catastrophes;
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
    private final Markers markers = new Markers();
    private Scene scene;
    /** The asteroid's shockwave while it is still travelling. */
    private Shockwave impactBlast;
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

    /** The live scene for the overworld (rebuilt if the level or its saved data object changed). */
    public Scene scene() {
        ServerLevel level = level();
        ExtinctionData d = data();
        if (scene == null || scene.level != level || scene.data != d) scene = new Scene(level, d, queue, markers);
        return scene;
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
        scene().drainWaves();
        d.reset();
        clearRuntime();
        level().setWeatherParameters(6000, 0, false, false);
        syncAll(d);
    }

    public void skip() {
        ExtinctionData d = data();
        if (d.catastrophe()) nextAct(d);
        else if (d.phase.running()) advance(d);
    }

    // ---------------------------------------------------------------- the other catastrophes

    /** Starts a catastrophe aimed at center (only x and z are used). Returns false for an unknown id. */
    public boolean startEvent(String id, BlockPos center) {
        Catastrophe c = Catastrophes.get(id);
        if (c == null) return false;
        ExtinctionData d = data();
        scene().drainWaves();
        d.reset();
        clearRuntime();
        ServerLevel level = level();
        level.getChunk(center.getX() >> 4, center.getZ() >> 4);
        d.center = new BlockPos(center.getX(), Terrain.groundY(level, center.getX(), center.getZ()), center.getZ());
        d.event = id;
        d.act = 0;
        d.actTick = 0;
        d.setDirty();
        c.begin(scene());
        c.enter(scene(), 0);
        actTitle(c.acts().get(0));
        syncAll(d);
        ExtinctionMod.LOG.info("Catastrophe {} started at {} {}", id, center.getX(), center.getZ());
        return true;
    }

    /** Starts a catastrophe (or the asteroid, for "asteroid") impactDistance blocks from the first player. */
    public boolean startEventNearPlayers(String id) {
        List<ServerPlayer> players = Terrain.players(level());
        if (players.isEmpty()) return false;
        if (id.equals("asteroid")) return startNearPlayers();
        ServerPlayer p = players.get(0);
        double a = level().random.nextDouble() * Math.PI * 2;
        int dist = ExtinctionConfig.IMPACT_DISTANCE.get();
        return startEvent(id, BlockPos.containing(p.getX() + Math.cos(a) * dist, p.getY(), p.getZ() + Math.sin(a) * dist));
    }

    /** "asteroid" or a random catastrophe id. */
    public String randomEvent() {
        List<String> ids = new ArrayList<>();
        ids.add("asteroid");
        Catastrophes.ids().forEach(ids::add);
        return ids.get(level().random.nextInt(ids.size()));
    }

    private void nextAct(ExtinctionData d) {
        Catastrophe c = Catastrophes.get(d.event);
        if (c == null || d.act + 1 >= c.acts().size()) {
            finishEvent(d, c);
            return;
        }
        d.act++;
        d.actTick = 0;
        d.setDirty();
        c.enter(scene(), d.act);
        actTitle(c.acts().get(d.act));
        syncAll(d);
    }

    private void finishEvent(ExtinctionData d, Catastrophe c) {
        if (c != null) {
            c.end(scene());
            titleRaw("extinction.event." + c.id + ".end", "extinction.event." + c.id + ".end.sub", 7);
            c.reset();
        }
        scene().drainWaves();
        scene().blasts.clear();
        scene().waves.clear();
        markers.clear();
        d.event = "";
        d.act = -1;
        d.actTick = 0;
        d.setDirty();
        level().setWeatherParameters(12000, 0, false, false);
        syncAll(d);
    }

    private void tickCatastrophe(ExtinctionData d, long time) {
        ServerLevel level = level();
        Catastrophe c = Catastrophes.get(d.event);
        if (c == null) {
            finishEvent(d, null);
            return;
        }
        Act act = c.acts().get(Math.min(d.act, c.acts().size() - 1));
        d.actTick++;
        d.setDirty();
        float p = Math.min(1F, d.actTick / (float) act.lengthTicks());
        c.tick(scene(), d.act, d.actTick, p);
        Earthquake.tick(level, queue, act.quake, time);
        if (time % 100 == 0) {
            switch (act.weather) {
                case Act.WEATHER_CLEAR -> level.setWeatherParameters(6000, 0, false, false);
                case Act.WEATHER_RAIN -> level.setWeatherParameters(0, 6000, true, false);
                case Act.WEATHER_THUNDER -> level.setWeatherParameters(0, 6000, true, true);
                default -> {}
            }
        }
        if (d.act == 0 && time % 40 == 0) spawns.stampedeFrom(level, d.center, 1.6);
        if (act.dieOff > 0 && ExtinctionConfig.MASS_EXTINCTION.get() && time % 100 == 0) spawns.dieOffNow(level, act.dieOff);
        if (act.biome != null && ExtinctionConfig.TRANSFORM_BIOMES.get()) {
            biomeSweep.tick(level, d.event + ":" + d.act, ExtinctionConfig.EFFECT_RADIUS.get() / 16 + 1, 4,
                    (lvl, cp) -> biomes.shift(lvl, cp, act.biome, d.center, 0));
        }
        if (d.actTick >= act.lengthTicks()) nextAct(d);
    }

    private void actTitle(Act act) {
        titleRaw(act.titleKey(), act.titleKey() + ".sub", 6);
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
        scene().clear();
        impactBlast = null;
        Catastrophes.all().forEach(Catastrophe::reset);
        biomeSweep.reset();
        fossilSweep.reset();
    }

    public String status() {
        ExtinctionData d = data();
        if (d.catastrophe()) {
            Catastrophe c = Catastrophes.get(d.event);
            Act act = c == null ? null : c.acts().get(Math.min(d.act, c.acts().size() - 1));
            int left = act == null ? 0 : Math.max(0, act.lengthTicks() - d.actTick) / 20;
            return "Event: " + d.event + ", act " + (d.act + 1) + "/" + (c == null ? 0 : c.acts().size()) + " " + (act == null ? "" : act.key)
                    + " (" + left + "s left), centre " + d.center.getX() + " " + d.center.getZ() + ", " + scene().blasts.size() + " blasts, "
                    + scene().waves.size() + " waves, " + queue.size() + " block jobs, volcanoes " + d.volcanoes.size() + ".";
        }
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
        if (!d.catastrophe() && (d.phase.ordinal() < Phase.IMPACT.ordinal() || !d.phase.running())) return;
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
        if (autoDay >= 0 && !d.busy() && !d.autoStarted && level.getDayTime() / 24000L >= autoDay) {
            String which = ExtinctionConfig.AUTO_START_EVENT.get();
            if (which.equals("random")) which = randomEvent();
            if (startEventNearPlayers(Catastrophes.get(which) != null ? which : "asteroid")) {
                d.autoStarted = true;
                d.setDirty();
            }
        }
        if (d.catastrophe()) {
            tickCatastrophe(d, time);
            scene().tickFronts();
            markers.tick();
            int budget = ExtinctionConfig.BLOCK_BUDGET.get();
            queue.tick(level, budget * 2);
            biomes.flush(level);
            if (time % 20 == 0) syncAll(d);
            return;
        }
        if (!d.phase.running()) {
            if (ExtinctionConfig.NATURAL_SPAWNS.get()) spawns.natural(level, d.phase, time);
            if (!scene().waves.isEmpty() || !scene().blasts.isEmpty()) scene().tickFronts();
            return;
        }

        d.phaseTick++;
        d.setDirty();
        Phase phase = d.phase;
        float p = Math.min(1F, d.phaseTick / (float) Math.max(1, phase.lengthTicks()));

        if (phase == Phase.IMPACT && !d.detonated && d.phaseTick >= Phase.DESCENT_TICKS) detonate(d);
        if (d.detonated) {
            d.sinceImpact++;
            if (impactBlast == null && !Shockwave.impactFinished(d.sinceImpact)) impactBlast = Shockwave.impact(d.impact, d.sinceImpact - 1);
            if (impactBlast != null) {
                impactBlast.tick(level);
                if (impactBlast.finished()) impactBlast = null;
            }
            if (d.sinceImpact == 40) title("impact");
            if (d.sinceImpact < 900 && d.sinceImpact % 3 == 0) ejectaRain(level, d);
        }

        Earthquake.tick(level, queue, quake(d, p), time);
        if (time % 100 == 0) weather(level, phase, p);

        switch (phase) {
            case WARNING -> narrate(d, p);
            case FIRESTORM -> Firestorm.tick(level, d.impact, 1F - 0.6F * p, d.phaseTick);
            case VOLCANISM -> {
                if (d.phaseTick == 1) scene().drainWaves();
                Volcanoes.tick(scene(), d.phaseTick, 1.6F);
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

        scene().tickFronts();
        markers.tick();
        spawns.tick(level, phase, p, d.impact, d.detonated, time);
        shiftBiomes(level, d, p);
        // The crater opens in seconds, not minutes.
        int budget = ExtinctionConfig.BLOCK_BUDGET.get();
        queue.tick(level, d.detonated && !d.craterDone ? budget * 5 / 2 : budget);
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
                // A train of three waves, each smaller than the last.
                for (Tsunami w : Tsunami.impactTrain(d.impact)) {
                    scene().waves.add(w);
                    markers.add(Markers.WAVE, net.minecraft.world.phys.Vec3.atCenterOf(d.impact.atY(level.getSeaLevel())), (float) w.inner,
                            (float) w.speed, w.height, w.age(), (int) ((w.max - w.inner) / w.speed) - w.age());
                }
                title("firestorm");
            }
            case VOLCANISM -> {
                if (d.volcanoes.isEmpty()) Volcanoes.create(scene(), ExtinctionConfig.VOLCANO_COUNT.get(), 80, 130, 48, 78);
                title("volcanism");
            }
            case WINTER -> title("winter");
            case RECOVERY -> title("recovery");
            case OVER -> {
                scene().drainWaves();
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
        impactBlast = Shockwave.impact(d.impact, 0);
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
        thermalFlash(level, at);
        if (ExtinctionConfig.DESTROY_TERRAIN.get()) {
            Crater.enqueue(queue, d, () -> craterDone(d));
            radialFractures(level, d);
        }
        ejectaBurst(level, d);
        syncAll(d);
    }

    /** The fireball's light alone sets fire to everything that can see it. */
    private void thermalFlash(ServerLevel level, BlockPos at) {
        double reach = ExtinctionConfig.SHOCKWAVE_RADIUS.get() * 0.7;
        net.minecraft.world.phys.Vec3 ball = net.minecraft.world.phys.Vec3.atCenterOf(at).add(0, 60, 0);
        for (ServerPlayer near : Terrain.players(level)) {
            for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, near.getBoundingBox().inflate(96))) {
                double dist = Terrain.distXZ(at, e.getX(), e.getZ());
                if (dist > reach) continue;
                if (e instanceof ServerPlayer sp && (sp.isCreative() || sp.isSpectator() || !ExtinctionConfig.PLAYER_HAZARDS.get())) continue;
                // Only the nearest 64 blocks are checked for cover (walls, roofs, hills), so no far chunks get loaded.
                net.minecraft.world.phys.Vec3 eye = e.getEyePosition();
                net.minecraft.world.phys.Vec3 toward = eye.add(ball.subtract(eye).normalize().scale(64));
                var hit = level.clip(new net.minecraft.world.level.ClipContext(eye, toward,
                        net.minecraft.world.level.ClipContext.Block.VISUAL, net.minecraft.world.level.ClipContext.Fluid.NONE, e));
                if (hit.getType() != net.minecraft.world.phys.HitResult.Type.MISS) continue;
                float heat = (float) (1 - dist / reach);
                e.setSecondsOnFire(3 + (int) (10 * heat));
                e.hurt(DamageTypes.source(level, DamageTypes.HEAT), 2 + 6 * heat);
            }
        }
    }

    /** Cracks tear outward from the crater rim in every direction. */
    private void radialFractures(ServerLevel level, ExtinctionData d) {
        int R = ExtinctionConfig.CRATER_RADIUS.get();
        int n = 10 + level.random.nextInt(5);
        for (int i = 0; i < n; i++) {
            double a = (i + level.random.nextDouble() * 0.6) / n * Math.PI * 2;
            int len = 30 + level.random.nextInt(50);
            double mid = R * 1.45 + len / 2.0;
            int x = d.impact.getX() + (int) (Math.cos(a) * mid), z = d.impact.getZ() + (int) (Math.sin(a) * mid);
            Earthquake.fissureAt(level, queue, x, z, a, len, 10 + level.random.nextInt(10));
        }
    }

    /** Molten rock thrown out of the crater on ballistic arcs, landing all around it. */
    private void ejectaBurst(ServerLevel level, ExtinctionData d) {
        net.minecraft.util.RandomSource rnd = level.random;
        int R = ExtinctionConfig.CRATER_RADIUS.get();
        for (int i = 0; i < 70; i++) {
            double a = rnd.nextDouble() * Math.PI * 2;
            double dist = R * 1.5 + rnd.nextDouble() * 280;
            double hv = 1.6 + rnd.nextDouble() * 1.6, g = 0.05, t = dist / hv;
            net.minecraft.world.phys.Vec3 vel = new net.minecraft.world.phys.Vec3(Math.cos(a) * hv, 0.5 * g * t, Math.sin(a) * hv);
            net.minecraft.world.phys.Vec3 from = net.minecraft.world.phys.Vec3.atCenterOf(d.impact).add(Math.cos(a) * R * 0.5, 8, Math.sin(a) * R * 0.5);
            com.hoai2k.extinction.entity.MeteorEntity.launch(level, from, vel, 0.8F + rnd.nextFloat() * 2.2F, g,
                    com.hoai2k.extinction.entity.MeteorEntity.randomLook(rnd));
        }
    }

    /** For half a minute after the impact, debris falls out of the sky everywhere near the players. */
    private void ejectaRain(ServerLevel level, ExtinctionData d) {
        double max = ExtinctionConfig.SHOCKWAVE_RADIUS.get();
        for (ServerPlayer p : Terrain.players(level)) {
            double dist = Terrain.distXZ(d.impact, p.getX(), p.getZ());
            if (dist > max || d.sinceImpact * 2.2 < dist - 60) continue;
            if (level.random.nextFloat() < 0.7F) Firestorm.ejecta(level, p, d.impact, level.random);
        }
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
        titleRaw("extinction.title." + key, "extinction.subtitle." + key, key.equals("impact") ? 7 : 6);
    }

    private void titleRaw(String key, String sub, float seconds) {
        FxMsg msg = FxMsg.title(key, sub, seconds);
        for (ServerPlayer p : server.getPlayerList().getPlayers()) {
            if (Net.CHANNEL.isRemotePresent(p.connection.connection)) {
                Net.to(p, msg);
                continue;
            }
            // Players without the mod installed still get the story in chat.
            p.sendSystemMessage(Component.translatable(key).withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD));
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
        Act act = null;
        if (d.catastrophe()) {
            Catastrophe c = Catastrophes.get(d.event);
            if (c != null) act = c.acts().get(Math.min(d.act, c.acts().size() - 1));
        }
        return new StateMsg(d.phase.ordinal(), d.phaseTick, d.phase.lengthTicks(), d.impact,
                d.impactGroundY == Integer.MIN_VALUE ? d.impact.getY() : d.impactGroundY, d.approachYaw,
                d.detonated, d.sinceImpact, ExtinctionConfig.CRATER_RADIUS.get(), ExtinctionConfig.SHOCKWAVE_RADIUS.get(),
                d.volcanoes.stream().map(Volcanoes::vent).toList(),
                act == null ? "" : d.event, act == null ? -1 : d.act, d.actTick, act == null ? 1 : act.lengthTicks(),
                act == null ? 0 : act.tint, act == null ? 1 : act.r, act == null ? 1 : act.g, act == null ? 1 : act.b,
                act == null ? 0.35F : act.fog, act == null ? 0 : act.music, act == null ? 0 : act.ambient, act == null ? 0 : act.quake,
                List.copyOf(markers.all()));
    }

    private void syncAll(ExtinctionData d) {
        StateMsg msg = state(d);
        for (ServerPlayer p : server.getPlayerList().getPlayers()) Net.to(p, msg);
    }
}
