package com.hoai2k.extinction.world;

import net.minecraft.server.level.ServerLevel;

import java.util.ArrayDeque;

/** Spreads big terrain jobs (crater, volcanoes, fissures) over many ticks so the server keeps up. */
public class BlockQueue {
    /** One slice of work. Returns roughly how many blocks it changed. */
    public interface Task {
        int run(ServerLevel level);
    }

    private final ArrayDeque<Task> tasks = new ArrayDeque<>();

    public void add(Task task) {
        tasks.add(task);
    }

    public void tick(ServerLevel level, int budget) {
        int spent = 0;
        while (spent < budget && !tasks.isEmpty()) {
            spent += Math.max(1, tasks.poll().run(level));
        }
    }

    public boolean isEmpty() {
        return tasks.isEmpty();
    }

    public int size() {
        return tasks.size();
    }

    public void clear() {
        tasks.clear();
    }
}
