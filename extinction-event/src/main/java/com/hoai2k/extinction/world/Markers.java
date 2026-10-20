package com.hoai2k.extinction.world;

import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * Big set-piece visuals the server asks every client to draw: fireballs, eruption columns,
 * tornado funnels, blast and pyroclastic rings, tsunami crests, the shattering moon. The server
 * keeps the list and sends it with every state update; clients age the markers between updates.
 */
public final class Markers {
    public static final int FIREBALL = 0;
    public static final int PLUME = 1;
    public static final int TORNADO = 2;
    public static final int RING = 3;
    public static final int PYRO = 4;
    public static final int WAVE = 5;
    public static final int MOON = 6;
    public static final int AURORA = 7;
    public static final int SUN = 8;
    public static final int LAVA_FOUNTAIN = 9;

    /**
     * a, b and c are per-type parameters. FIREBALL a=size. PLUME a=height b=width. TORNADO a=radius b=height.
     * RING / PYRO a=inner radius b=speed c=max radius. WAVE a=inner b=speed c=crest height. MOON a=stage.
     * AURORA a=strength. SUN a=size b=flare. LAVA_FOUNTAIN a=height. Age may start negative (a delayed wave).
     * life <= 0 means until removed.
     */
    public static final class Marker {
        public final int type;
        public double x, y, z;
        public float a, b, c;
        public int age;
        public final int life;
        public final int id;

        public Marker(int id, int type, double x, double y, double z, float a, float b, float c, int age, int life) {
            this.id = id;
            this.type = type;
            this.x = x;
            this.y = y;
            this.z = z;
            this.a = a;
            this.b = b;
            this.c = c;
            this.age = age;
            this.life = life;
        }

        public Vec3 pos() {
            return new Vec3(x, y, z);
        }

        public void write(FriendlyByteBuf buf) {
            buf.writeVarInt(id);
            buf.writeVarInt(type);
            buf.writeDouble(x);
            buf.writeDouble(y);
            buf.writeDouble(z);
            buf.writeFloat(a);
            buf.writeFloat(b);
            buf.writeFloat(c);
            buf.writeInt(age);
            buf.writeVarInt(life);
        }

        public static Marker read(FriendlyByteBuf buf) {
            return new Marker(buf.readVarInt(), buf.readVarInt(), buf.readDouble(), buf.readDouble(), buf.readDouble(),
                    buf.readFloat(), buf.readFloat(), buf.readFloat(), buf.readInt(), buf.readVarInt());
        }
    }

    private final List<Marker> list = new ArrayList<>();
    private int nextId = 1;

    public Marker add(int type, Vec3 at, float a, float b, int life) {
        return add(type, at, a, b, 0, 0, life);
    }

    public Marker add(int type, Vec3 at, float a, float b, float c, int age, int life) {
        Marker m = new Marker(nextId++, type, at.x, at.y, at.z, a, b, c, age, life);
        list.add(m);
        if (list.size() > 48) list.remove(0);
        return m;
    }

    public void tick() {
        Iterator<Marker> it = list.iterator();
        while (it.hasNext()) {
            Marker m = it.next();
            m.age++;
            if (m.life > 0 && m.age > m.life) it.remove();
        }
    }

    public void remove(Marker m) {
        list.remove(m);
    }

    public void removeType(int type) {
        list.removeIf(m -> m.type == type);
    }

    public void clear() {
        list.clear();
    }

    public List<Marker> all() {
        return list;
    }
}
