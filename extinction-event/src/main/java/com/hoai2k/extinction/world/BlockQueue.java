package com.hoai2k.extinction.world;

import net.minecraft.server.level.ServerLevel;

import java.util.ArrayDeque;

/** Spreads big terrain jobs (crater, volcanoes, fissures) over many ticks so the server keeps up. */
public class BlockQueue {
    /** One slice of work. Returns roughly how many blocks it changed. */
    /** Cost of a task that had to load or generate a chunk: one per tick, so generation never piles up into a freeze. */
    public static final int CHUNK_LOAD = 1_000_000;

    public interface Task {
        int run(ServerLevel level);
    }

    private final ArrayDeque<Task> tasks = new ArrayDeque<>();
    /** Jobs that must not wait behind a big crater (rising volcanoes). */
    private final ArrayDeque<Task> urgent = new ArrayDeque<>();

    public void add(Task task) {
        tasks.add(task);
    }

    public void addUrgent(Task task) {
        urgent.add(task);
    }

    public void tick(ServerLevel level, int budget) {
        int spent = 0;
        while (spent < budget && !urgent.isEmpty()) spent += Math.max(1, urgent.poll().run(level));
        while (spent < budget && !tasks.isEmpty()) spent += Math.max(1, tasks.poll().run(level));
    }

    public boolean isEmpty() {
        return tasks.isEmpty() && urgent.isEmpty();
    }

    public int size() {
        return tasks.size() + urgent.size();
    }

    public void clear() {
        tasks.clear();
        urgent.clear();
    }
}
