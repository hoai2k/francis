package com.hoai2k.extinction.spawn;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.hoai2k.extinction.ExtinctionMod;
import com.hoai2k.extinction.Phase;
import net.minecraft.core.registries.Registries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.TagParser;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.TagKey;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.biome.Biome;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraftforge.fml.loading.FMLPaths;
import net.minecraftforge.registries.ForgeRegistries;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The custom spawn and fossil rules from config/extinction/spawns.json. A default file, set up for
 * Fossils and Archeology Revival with vanilla fallbacks, is written the first time the game runs.
 * Entries naming a mod that is not installed are skipped.
 */
public final class SpawnRules {
    public enum Env { LAND, WATER, AIR }

    public static final class Entry {
        public ResourceLocation entity;
        public EnumSet<Phase> phases = EnumSet.noneOf(Phase.class);
        public int weight = 10;
        public int minGroup = 1, maxGroup = 1;
        public float chance = 1.0F;
        public Env env = Env.LAND;
        public boolean flee;
        public int maxNearby = 4;
        public CompoundTag nbt;
        public List<String> biomes = new ArrayList<>();

        public EntityType<?> type() {
            return ForgeRegistries.ENTITY_TYPES.containsKey(entity) ? ForgeRegistries.ENTITY_TYPES.getValue(entity) : null;
        }
    }

    public static final class Deposit {
        public final Map<String, String> hosts = new LinkedHashMap<>();
        public String fallback;
        public int weight = 10;
        public int minSize = 3, maxSize = 7;
        public int minDepth = 5, maxDepth = 30;

        /** What this deposit turns the given host block into, or null if it is not a host. */
        public Block blockFor(BlockState host) {
            for (Map.Entry<String, String> e : hosts.entrySet()) {
                if (!matchesBlock(host, e.getKey())) continue;
                Block b = block(e.getValue());
                if (b == null && fallback != null) b = block(fallback);
                return b;
            }
            return null;
        }
    }

    public final List<Entry> spawns = new ArrayList<>();
    public final List<String> extinct = new ArrayList<>();
    public final List<String> survivors = new ArrayList<>();
    public final List<String> defaultFossils = new ArrayList<>();
    public final Map<String, String> fossilByEntity = new LinkedHashMap<>();
    public final List<Deposit> deposits = new ArrayList<>();
    public int intervalTicks = 100;
    public int minDistance = 24, maxDistance = 56;
    public int maxPerPlayer = 14;
    public int naturalIntervalTicks = 600;
    public int naturalMaxPerPlayer = 8;
    public int depositsPerChunk = 2;
    public final List<String> problems = new ArrayList<>();

    public static Path file() {
        return FMLPaths.CONFIGDIR.get().resolve("extinction").resolve("spawns.json");
    }

    /** Loads the rules, writing the default file first if there is none. Never throws. */
    public static SpawnRules load() {
        Path path = file();
        try {
            if (!Files.exists(path)) {
                Files.createDirectories(path.getParent());
                try (InputStream in = SpawnRules.class.getResourceAsStream("/extinction/default_spawns.json")) {
                    if (in != null) Files.copy(in, path);
                }
            }
            String text = Files.readString(path, StandardCharsets.UTF_8);
            SpawnRules r = parse(JsonParser.parseString(text).getAsJsonObject());
            for (String p : r.problems) ExtinctionMod.LOG.warn("spawns.json: {}", p);
            return r;
        } catch (IOException | RuntimeException e) {
            ExtinctionMod.LOG.error("Could not read {}, using built-in defaults", path, e);
            try (InputStream in = SpawnRules.class.getResourceAsStream("/extinction/default_spawns.json")) {
                SpawnRules r = parse(JsonParser.parseString(new String(in.readAllBytes(), StandardCharsets.UTF_8)).getAsJsonObject());
                r.problems.add(0, "Could not read config/extinction/spawns.json: " + e.getMessage());
                return r;
            } catch (Exception inner) {
                SpawnRules r = new SpawnRules();
                r.problems.add("No spawn rules could be loaded: " + inner.getMessage());
                return r;
            }
        }
    }

    static SpawnRules parse(JsonObject root) {
        SpawnRules r = new SpawnRules();
        if (root.has("settings")) {
            JsonObject s = root.getAsJsonObject("settings");
            r.intervalTicks = Math.max(20, (int) (num(s, "spawn_interval_seconds", 5) * 20));
            r.minDistance = (int) num(s, "min_distance", 24);
            r.maxDistance = Math.max(r.minDistance + 1, (int) num(s, "max_distance", 56));
            r.maxPerPlayer = (int) num(s, "max_per_player", 14);
            r.naturalIntervalTicks = Math.max(20, (int) (num(s, "natural_interval_seconds", 30) * 20));
            r.naturalMaxPerPlayer = (int) num(s, "natural_max_per_player", 8);
            r.depositsPerChunk = (int) num(s, "deposits_per_chunk", 2);
        }
        if (root.has("spawns")) {
            int i = 0;
            for (JsonElement el : root.getAsJsonArray("spawns")) {
                i++;
                try {
                    r.spawns.add(entry(el.getAsJsonObject()));
                } catch (RuntimeException e) {
                    r.problems.add("spawn #" + i + " ignored: " + e.getMessage());
                }
            }
        }
        strings(root, "extinct", r.extinct);
        strings(root, "survivors", r.survivors);
        if (root.has("fossils")) {
            JsonObject f = root.getAsJsonObject("fossils");
            strings(f, "default", r.defaultFossils);
            if (f.has("by_entity")) {
                for (Map.Entry<String, JsonElement> e : f.getAsJsonObject("by_entity").entrySet()) {
                    r.fossilByEntity.put(e.getKey(), e.getValue().getAsString());
                }
            }
        }
        if (root.has("deposits")) {
            for (JsonElement el : root.getAsJsonArray("deposits")) {
                JsonObject o = el.getAsJsonObject();
                Deposit d = new Deposit();
                for (Map.Entry<String, JsonElement> e : o.getAsJsonObject("in").entrySet()) d.hosts.put(e.getKey(), e.getValue().getAsString());
                if (o.has("fallback")) d.fallback = o.get("fallback").getAsString();
                d.weight = (int) num(o, "weight", 10);
                int[] size = range(o, "size", 3, 7), depth = range(o, "depth", 5, 30);
                d.minSize = size[0];
                d.maxSize = size[1];
                d.minDepth = depth[0];
                d.maxDepth = depth[1];
                r.deposits.add(d);
            }
        }
        return r;
    }

    private static Entry entry(JsonObject o) {
        Entry e = new Entry();
        e.entity = ResourceLocation.tryParse(o.get("entity").getAsString());
        if (e.entity == null) throw new IllegalArgumentException("bad entity id " + o.get("entity"));
        JsonElement ph = o.get("phases");
        if (ph == null) throw new IllegalArgumentException(e.entity + " has no \"phases\"");
        for (JsonElement p : ph.isJsonArray() ? ph.getAsJsonArray() : single(ph)) {
            String id = p.getAsString();
            if (id.equals("all")) {
                for (Phase x : Phase.values()) if (x.running()) e.phases.add(x);
                continue;
            }
            Phase phase = Phase.byId(id);
            if (phase == null) throw new IllegalArgumentException(e.entity + ": unknown phase \"" + id + "\"");
            e.phases.add(phase);
        }
        e.weight = Math.max(1, (int) num(o, "weight", 10));
        int[] g = range(o, "group", 1, 1);
        e.minGroup = Math.max(1, g[0]);
        e.maxGroup = Math.max(e.minGroup, g[1]);
        e.chance = (float) num(o, "chance", 1);
        e.env = Env.valueOf(o.has("environment") ? o.get("environment").getAsString().toUpperCase(Locale.ROOT) : "LAND");
        e.flee = o.has("flee") ? o.get("flee").getAsBoolean() : true;
        e.maxNearby = (int) num(o, "max_nearby", 4);
        if (o.has("nbt")) {
            try {
                e.nbt = TagParser.parseTag(o.get("nbt").getAsString());
            } catch (Exception ex) {
                throw new IllegalArgumentException(e.entity + ": bad nbt: " + ex.getMessage());
            }
        }
        strings(o, "biomes", e.biomes);
        return e;
    }

    private static JsonArray single(JsonElement el) {
        JsonArray a = new JsonArray();
        a.add(el);
        return a;
    }

    private static double num(JsonObject o, String key, double def) {
        return o.has(key) ? o.get(key).getAsDouble() : def;
    }

    private static int[] range(JsonObject o, String key, int lo, int hi) {
        if (!o.has(key)) return new int[]{lo, hi};
        JsonElement el = o.get(key);
        if (el.isJsonArray()) {
            JsonArray a = el.getAsJsonArray();
            return new int[]{a.get(0).getAsInt(), a.get(a.size() - 1).getAsInt()};
        }
        return new int[]{el.getAsInt(), el.getAsInt()};
    }

    private static void strings(JsonObject o, String key, List<String> out) {
        if (!o.has(key)) return;
        JsonElement el = o.get(key);
        for (JsonElement s : el.isJsonArray() ? el.getAsJsonArray() : single(el)) out.add(s.getAsString());
    }

    static Block block(String id) {
        ResourceLocation rl = ResourceLocation.tryParse(id);
        return rl != null && ForgeRegistries.BLOCKS.containsKey(rl) ? ForgeRegistries.BLOCKS.getValue(rl) : null;
    }

    static boolean matchesBlock(BlockState s, String pattern) {
        if (pattern.startsWith("#")) {
            ResourceLocation rl = ResourceLocation.tryParse(pattern.substring(1));
            return rl != null && s.is(TagKey.create(Registries.BLOCK, rl));
        }
        Block b = block(pattern);
        return b != null && s.is(b);
    }

    private static boolean matchesEntity(EntityType<?> type, String pattern) {
        ResourceLocation id = ForgeRegistries.ENTITY_TYPES.getKey(type);
        if (id == null) return false;
        if (pattern.equals("*")) return true;
        if (pattern.startsWith("#")) {
            ResourceLocation rl = ResourceLocation.tryParse(pattern.substring(1));
            return rl != null && type.is(TagKey.create(Registries.ENTITY_TYPE, rl));
        }
        if (pattern.endsWith(":*")) return id.getNamespace().equals(pattern.substring(0, pattern.length() - 2));
        return id.toString().equals(pattern);
    }

    /** Doomed by the impact winter: matches "extinct" and not "survivors". */
    public boolean isExtinct(EntityType<?> type) {
        for (String s : survivors) if (matchesEntity(type, s)) return false;
        for (String s : extinct) if (matchesEntity(type, s)) return true;
        return false;
    }

    public Block fossilFor(String entityId) {
        String want = fossilByEntity.get(entityId);
        if (want != null && block(want) != null) return block(want);
        for (String id : defaultFossils) {
            Block b = block(id);
            if (b != null) return b;
        }
        return Blocks.BONE_BLOCK;
    }

    public Deposit pickDeposit(RandomSource rnd) {
        int total = 0;
        for (Deposit d : deposits) total += d.weight;
        if (total <= 0) return null;
        int roll = rnd.nextInt(total);
        for (Deposit d : deposits) {
            roll -= d.weight;
            if (roll < 0) return d;
        }
        return null;
    }

    public boolean biomeAllowed(Entry e, net.minecraft.core.Holder<Biome> biome) {
        if (e.biomes.isEmpty()) return true;
        for (String b : e.biomes) {
            if (b.startsWith("#")) {
                ResourceLocation rl = ResourceLocation.tryParse(b.substring(1));
                if (rl != null && biome.is(TagKey.create(Registries.BIOME, rl))) return true;
            } else if (biome.unwrapKey().map(k -> k.location().toString().equals(b)).orElse(false)) {
                return true;
            }
        }
        return false;
    }

    /** Short report for /extinction reload and /extinction status. */
    public String summary() {
        int usable = 0;
        for (Entry e : spawns) if (e.type() != null) usable++;
        return usable + "/" + spawns.size() + " spawn entries usable, " + deposits.size() + " fossil deposits";
    }
}
