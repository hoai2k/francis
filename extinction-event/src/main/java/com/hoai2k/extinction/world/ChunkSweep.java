package com.hoai2k.extinction.world;

import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.ChunkPos;

import java.util.function.BiConsumer;

/** Visits each loaded chunk near a player once per pass, a few chunks per tick, nearest first. */
public final class ChunkSweep {
    private final LongOpenHashSet visited = new LongOpenHashSet();
    private String pass = "";

    public void tick(ServerLevel level, String passId, int radiusChunks, int perTick, BiConsumer<ServerLevel, ChunkPos> visit) {
        if (!passId.equals(pass)) {
            pass = passId;
            visited.clear();
        }
        int left = perTick;
        for (ServerPlayer p : Terrain.players(level)) {
            ChunkPos c = p.chunkPosition();
            for (int ring = 0; ring <= radiusChunks && left > 0; ring++) {
                for (int dx = -ring; dx <= ring && left > 0; dx++) {
                    for (int dz = -ring; dz <= ring && left > 0; dz++) {
                        if (Math.max(Math.abs(dx), Math.abs(dz)) != ring) continue;
                        int cx = c.x + dx, cz = c.z + dz;
                        long key = ChunkPos.asLong(cx, cz);
                        if (visited.contains(key) || !level.hasChunk(cx, cz)) continue;
                        visited.add(key);
                        visit.accept(level, new ChunkPos(cx, cz));
                        left--;
                    }
                }
            }
        }
    }

    public void reset() {
        visited.clear();
        pass = "";
    }
}
