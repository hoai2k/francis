package com.hoai2k.extinction.event;

import com.hoai2k.extinction.net.FxMsg;
import com.hoai2k.extinction.net.Net;
import com.hoai2k.extinction.world.Scene;
import com.hoai2k.extinction.world.Terrain;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;

import java.util.ArrayList;
import java.util.List;

/**
 * A world-ending event other than the asteroid: a scripted run of acts. Subclasses declare their
 * acts in the constructor and do their damage in tick(). Runtime fields must be cleared in reset().
 */
public abstract class Catastrophe {
    public final String id;
    private final List<Act> acts = new ArrayList<>();

    protected Catastrophe(String id) {
        this.id = id;
    }

    protected final Act act(String key, int seconds) {
        Act a = new Act(id, key, seconds);
        acts.add(a);
        return a;
    }

    public final List<Act> acts() {
        return acts;
    }

    /** Called once when the event starts; sc.data.center is where it is aimed. */
    public void begin(Scene sc) {}

    public void enter(Scene sc, int act) {}

    /** t = ticks into the act, p = 0..1 through it. */
    public abstract void tick(Scene sc, int act, int t, float p);

    public void end(Scene sc) {}

    /** Forget runtime state (tornadoes, flood level...) before a new run. */
    public void reset() {}

    public String nameKey() {
        return "extinction.event." + id;
    }

    // ---------------------------------------------------------------- helpers

    /** A random column min..max blocks from a random player, or null when nobody is online. */
    protected static int[] near(Scene sc, int min, int max) {
        List<ServerPlayer> players = Terrain.players(sc.level);
        if (players.isEmpty()) return null;
        RandomSource rnd = sc.level.random;
        ServerPlayer p = players.get(rnd.nextInt(players.size()));
        double a = rnd.nextDouble() * Math.PI * 2, d = min + rnd.nextDouble() * (max - min);
        return new int[]{p.getBlockX() + (int) (Math.cos(a) * d), p.getBlockZ() + (int) (Math.sin(a) * d)};
    }

    protected static BlockPos center(Scene sc) {
        return sc.data.center;
    }

    protected final void title(Scene sc, String key, float seconds) {
        FxMsg msg = FxMsg.title("extinction.event." + id + "." + key, "extinction.event." + id + "." + key + ".sub", seconds);
        for (ServerPlayer p : sc.level.getServer().getPlayerList().getPlayers()) Net.to(p, msg);
    }

    protected static boolean every(int t, int ticks) {
        return t % ticks == 0;
    }
}
