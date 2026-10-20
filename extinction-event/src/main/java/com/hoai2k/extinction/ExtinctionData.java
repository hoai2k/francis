package com.hoai2k.extinction;

import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.NbtUtils;
import net.minecraft.nbt.Tag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.saveddata.SavedData;

import java.util.ArrayList;
import java.util.List;

/** Everything about the event that must survive a save and reload, stored with the overworld. */
public class ExtinctionData extends SavedData {
    private static final String NAME = "extinction_event";

    public Phase phase = Phase.DORMANT;
    /** The running catastrophe other than the asteroid ("" = none), its act and ticks into the act. */
    public String event = "";
    public int act = -1;
    public int actTick;
    public BlockPos center = BlockPos.ZERO;
    public int phaseTick;
    public BlockPos impact = BlockPos.ZERO;
    /** Ground height at the impact site, sampled when the asteroid hits. */
    public int impactGroundY = Integer.MIN_VALUE;
    /** Direction the asteroid comes in from, in degrees. */
    public float approachYaw;
    public boolean detonated;
    /** Ticks since the asteroid hit the ground. */
    public int sinceImpact;
    public boolean craterDone;
    public boolean fossilsLaid;
    public boolean autoStarted;
    public final List<Volcano> volcanoes = new ArrayList<>();
    /** Where extinct creatures died; their fossils form there during recovery. */
    public final List<Death> deaths = new ArrayList<>();

    /** True while any event (the asteroid or another catastrophe) is under way. */
    public boolean busy() {
        return phase.running() || catastrophe();
    }

    public boolean catastrophe() {
        return !event.isEmpty() && act >= 0;
    }

    public static ExtinctionData get(ServerLevel overworld) {
        return overworld.getDataStorage().computeIfAbsent(ExtinctionData::load, ExtinctionData::new, NAME);
    }

    public static class Volcano {
        public BlockPos base;
        public int height;
        public int radius;
        public int built;

        public Volcano(BlockPos base, int height, int radius) {
            this.base = base;
            this.height = height;
            this.radius = radius;
        }

        public BlockPos vent() {
            return base.above(built);
        }

        public boolean finished() {
            return built >= height;
        }
    }

    public record Death(BlockPos pos, String entity) {}

    public static ExtinctionData load(CompoundTag tag) {
        ExtinctionData d = new ExtinctionData();
        Phase p = Phase.byId(tag.getString("phase"));
        d.phase = p == null ? Phase.DORMANT : p;
        d.phaseTick = tag.getInt("phaseTick");
        d.event = tag.getString("event");
        d.act = tag.contains("act") ? tag.getInt("act") : -1;
        d.actTick = tag.getInt("actTick");
        d.center = NbtUtils.readBlockPos(tag.getCompound("center"));
        d.impact = NbtUtils.readBlockPos(tag.getCompound("impact"));
        d.impactGroundY = tag.contains("impactGroundY") ? tag.getInt("impactGroundY") : Integer.MIN_VALUE;
        d.approachYaw = tag.getFloat("approachYaw");
        d.detonated = tag.getBoolean("detonated");
        d.sinceImpact = tag.getInt("sinceImpact");
        d.craterDone = tag.getBoolean("craterDone");
        d.fossilsLaid = tag.getBoolean("fossilsLaid");
        d.autoStarted = tag.getBoolean("autoStarted");
        for (Tag t : tag.getList("volcanoes", Tag.TAG_COMPOUND)) {
            CompoundTag v = (CompoundTag) t;
            Volcano vol = new Volcano(NbtUtils.readBlockPos(v.getCompound("base")), v.getInt("height"), v.getInt("radius"));
            vol.built = v.getInt("built");
            d.volcanoes.add(vol);
        }
        for (Tag t : tag.getList("deaths", Tag.TAG_COMPOUND)) {
            CompoundTag v = (CompoundTag) t;
            d.deaths.add(new Death(NbtUtils.readBlockPos(v.getCompound("pos")), v.getString("entity")));
        }
        return d;
    }

    @Override
    public CompoundTag save(CompoundTag tag) {
        tag.putString("phase", phase.id());
        tag.putInt("phaseTick", phaseTick);
        tag.putString("event", event);
        tag.putInt("act", act);
        tag.putInt("actTick", actTick);
        tag.put("center", NbtUtils.writeBlockPos(center));
        tag.put("impact", NbtUtils.writeBlockPos(impact));
        if (impactGroundY != Integer.MIN_VALUE) tag.putInt("impactGroundY", impactGroundY);
        tag.putFloat("approachYaw", approachYaw);
        tag.putBoolean("detonated", detonated);
        tag.putInt("sinceImpact", sinceImpact);
        tag.putBoolean("craterDone", craterDone);
        tag.putBoolean("fossilsLaid", fossilsLaid);
        tag.putBoolean("autoStarted", autoStarted);
        ListTag vols = new ListTag();
        for (Volcano v : volcanoes) {
            CompoundTag c = new CompoundTag();
            c.put("base", NbtUtils.writeBlockPos(v.base));
            c.putInt("height", v.height);
            c.putInt("radius", v.radius);
            c.putInt("built", v.built);
            vols.add(c);
        }
        tag.put("volcanoes", vols);
        ListTag deathList = new ListTag();
        for (Death dd : deaths) {
            CompoundTag c = new CompoundTag();
            c.put("pos", NbtUtils.writeBlockPos(dd.pos()));
            c.putString("entity", dd.entity());
            deathList.add(c);
        }
        tag.put("deaths", deathList);
        return tag;
    }

    /** Clears the event so it can run again. */
    public void reset() {
        phase = Phase.DORMANT;
        phaseTick = 0;
        event = "";
        act = -1;
        actTick = 0;
        detonated = false;
        sinceImpact = 0;
        craterDone = false;
        fossilsLaid = false;
        impactGroundY = Integer.MIN_VALUE;
        volcanoes.clear();
        deaths.clear();
        setDirty();
    }
}
