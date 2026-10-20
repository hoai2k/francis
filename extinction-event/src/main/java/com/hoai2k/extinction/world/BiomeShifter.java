package com.hoai2k.extinction.world;

import com.hoai2k.extinction.ExtinctionMod;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Holder;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.biome.Biome;
import net.minecraft.world.level.chunk.ChunkAccess;
import net.minecraft.world.level.chunk.LevelChunk;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Rewrites the biome of whole chunks as the world changes, the same way /fillbiome does. */
public final class BiomeShifter {
    public static final ResourceKey<Biome> CRATER = key("impact_crater");
    public static final ResourceKey<Biome> SCORCHED = key("scorched_lands");
    public static final ResourceKey<Biome> ASH = key("ash_wastes");
    public static final ResourceKey<Biome> FROZEN = key("frozen_ashlands");
    public static final ResourceKey<Biome> FERN_SPIKE = key("fern_spike");
    public static final ResourceKey<Biome> HOTHOUSE = key("hothouse");
    public static final ResourceKey<Biome> ANOXIC = key("anoxic_sea");
    public static final ResourceKey<Biome> GLACIAL = key("glacial");
    public static final ResourceKey<Biome> IRRADIATED = key("irradiated");
    public static final ResourceKey<Biome> STORM = key("storm");

    private final List<ChunkAccess> pending = new ArrayList<>();

    private static ResourceKey<Biome> key(String name) {
        return ResourceKey.create(Registries.BIOME, new ResourceLocation(ExtinctionMod.MODID, name));
    }

    private static Optional<Holder.Reference<Biome>> holder(ServerLevel level, ResourceKey<Biome> key) {
        return level.registryAccess().registryOrThrow(Registries.BIOME).getHolder(key);
    }

    /** Turns the chunk into target, except the crater itself, which keeps the crater biome. */
    public void shift(ServerLevel level, ChunkPos pos, ResourceKey<Biome> target, BlockPos impact, double craterRadius) {
        Optional<Holder.Reference<Biome>> to = holder(level, target), crater = holder(level, CRATER);
        if (to.isEmpty() || crater.isEmpty()) return;
        LevelChunk chunk = level.getChunk(pos.x, pos.z);
        double r2 = craterRadius * craterRadius;
        Holder<Biome> t = to.get(), c = crater.get();
        chunk.fillBiomesFromNoise((qx, qy, qz, sampler) -> {
            double dx = (qx << 2) - impact.getX(), dz = (qz << 2) - impact.getZ();
            return dx * dx + dz * dz < r2 ? c : t;
        }, level.getChunkSource().randomState().sampler());
        chunk.setUnsaved(true);
        pending.add(chunk);
    }

    /** Sends the changed biomes to clients in one batch per tick. */
    public void flush(ServerLevel level) {
        if (pending.isEmpty()) return;
        level.getChunkSource().chunkMap.resendBiomesForChunks(new ArrayList<>(pending));
        pending.clear();
    }
}
