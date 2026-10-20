package com.hoai2k.extinction.world;

import com.hoai2k.extinction.ExtinctionData;
import net.minecraft.server.level.ServerLevel;

import java.util.ArrayList;
import java.util.List;

/** Everything a disaster can set in motion this tick: block jobs, blast fronts, tsunami waves and visual markers. */
public final class Scene {
    public final ServerLevel level;
    public final ExtinctionData data;
    public final BlockQueue queue;
    public final Markers markers;
    public final List<Shockwave> blasts = new ArrayList<>();
    public final List<Tsunami> waves = new ArrayList<>();

    public Scene(ServerLevel level, ExtinctionData data, BlockQueue queue, Markers markers) {
        this.level = level;
        this.data = data;
        this.queue = queue;
        this.markers = markers;
    }

    /** Advances every blast and wave, dropping the finished ones. */
    public void tickFronts() {
        for (Shockwave s : blasts) s.tick(level);
        blasts.removeIf(Shockwave::finished);
        for (Tsunami t : waves) t.tick(level);
        waves.removeIf(Tsunami::finished);
    }

    public void drainWaves() {
        for (Tsunami t : waves) t.drain(level, true);
    }

    public void clear() {
        blasts.clear();
        waves.clear();
        queue.clear();
        markers.clear();
    }
}
